// The live page previews of the Export dialog, served from POST /api/ai?export=live-preview with a body
// { theme, page, brand: { name, design } }. One page of one theme drawn with the person's brand, as a document for a sandboxed frame.
//
// The order is the one api/_lib/exportDocument.js uses, and it is the whole gate: the Firebase token, then the plan from the
// account's own user document, then assertThemeAccess (the table in src/data/exportThemes.js). Nothing in the request says what
// the plan is. Any lookup that fails refuses; none of them lets a page through.
//
//   no or bad token                                   401 { code: 'auth_required' }
//   token check failed for a reason that is not the
//     caller's (credential, revocation lookup)         500 / 503 { code: 'auth_unavailable' }
//   a page, theme or brand outside the table           400 { code: 'unknown_theme' | 'unknown_page' | 'unknown_row' | ... }
//   plan lookup failed                                 500, no page
//   Free on a Pro template                             403 { error: 'pro_required', code: 'pro_required' }, no page
//   Free on a free template                            200 { ok, html } with the Free watermark drawn into the page
//   Pro                                                200 { ok, html }
//   over the per-account limit                         429 { code: 'rate_limited' } + Retry-After
//
// A preview is one page (or the book's first screen), never a download: no zip, no file name. Every response carries
// Cache-Control: private, no-store, the 4xx and 5xx ones too, so nothing a Pro account was shown is kept for a Free one.

import { assertThemeAccess } from './themeAccess.js'
import { isTokenRefusal, planOf } from './exportDocument.js'
import { MAX_THEME_BODY_CHARS, renderThemePage } from './exportThemeRoute.js'

// One account's previews in a window. Pages already drawn are kept by the browser, so honest use stays well under this.
export const PREVIEW_LIMIT = Object.freeze({ bucket: 'export-preview', limit: 120, windowMs: 10 * 60 * 1000 })

// The page ids the dialog sends (src/config/exportPreviewData.js), each as: the row the document belongs to, the file format that
// row is asked for in the access table, the engine's kind, and the engine's own page id. Tier is never kept here: assertThemeAccess
// decides it from the row and theme.
const PAGES = Object.freeze({
  kitScreen: Object.freeze({ row: 'ui-kit', format: 'zip', kind: 'uikit', engine: 'screen-light' }),
  kitButtons: Object.freeze({ row: 'ui-kit', format: 'zip', kind: 'uikit', engine: 'buttons' }),
  guideCover: Object.freeze({ row: 'slides', format: 'pdf', kind: 'guidelines', engine: 'cover' }),
  guidePalette: Object.freeze({ row: 'slides', format: 'pdf', kind: 'guidelines', engine: 'palette' }),
  book: Object.freeze({ row: 'book', format: 'pdf', kind: 'book', engine: null }),
})

// The Free mark: a tiled diagonal line over the whole frame, drawn by the page's own CSS. The tile is a data: image, which the
// print CSP allows, and the layer takes no pointer events.
const MARK_TILE = encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='280' height='190'>"
  + "<text x='140' y='100' text-anchor='middle' transform='rotate(-24 140 95)' font-family='Arial,sans-serif' font-size='20' font-weight='700' "
  + "letter-spacing='2' fill='#000' fill-opacity='.2' stroke='#fff' stroke-opacity='.35' stroke-width='.6'>UIL4B FREE PREVIEW</text></svg>",
)
const MARK_STYLE = '<style data-uil4b-mark>html::after{content:"";position:fixed;inset:0;z-index:2147483647;pointer-events:none;'
  + `background:url("data:image/svg+xml,${MARK_TILE}") 0 0/280px 190px repeat}</style>`

/** The page with the Free mark in its head. A document without a head is a fault, never an unmarked page. */
export function watermarked(html) {
  const at = typeof html === 'string' ? html.indexOf('</head>') : -1
  if (at < 0) throw new Error('preview document has no head')
  return `${html.slice(0, at)}${MARK_STYLE}${html.slice(at)}`
}

/**
 * @param req   needs headers.authorization and body { theme, page, brand: { name, design } }
 * @param res   a Vercel/Express-style response
 * @param deps  { verifyIdToken(token, checkRevoked) -> decoded, readUser(uid) -> user doc data, credentialProblem?(),
 *                consume(opts) -> limiter verdict, engine? -> the engine (tests) }
 */
export async function serveExportLivePreview(req, res, { verifyIdToken, readUser, credentialProblem, consume, engine }) {
  res.setHeader('Cache-Control', 'private, no-store')
  res.setHeader('Vary', 'Authorization')

  const header = req.headers?.authorization
  if (typeof header !== 'string' || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required', code: 'auth_required' })
  }

  let decoded
  try {
    decoded = await verifyIdToken(header.slice(7), true)
  } catch (err) {
    if (isTokenRefusal(err)) return res.status(401).json({ error: 'Invalid or expired session', code: 'auth_required' })
    let credential
    try { credential = credentialProblem?.() } catch { credential = 'unreadable' }
    return res.status(credential ? 500 : 503).json({ error: 'Could not check your session', code: 'auth_unavailable' })
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {}
  // A page id outside the table reads nothing but the request, so it costs no account read.
  const page = typeof body.page === 'string' && Object.hasOwn(PAGES, body.page) ? PAGES[body.page] : null
  if (!page) return res.status(400).json({ error: 'Unknown preview page', code: 'unknown_page' })

  let plan
  try {
    plan = await planOf(decoded, readUser)
  } catch {
    return res.status(500).json({ error: 'Could not check your plan' })
  }

  const verdict = assertThemeAccess(plan, { theme: body.theme, row: page.row, format: page.format })
  if (!verdict.ok) {
    const error = verdict.code === 'pro_required' ? 'pro_required' : 'Unknown preview'
    return res.status(verdict.status).json({ error, code: verdict.code })
  }
  const free = plan.id !== 'pro'

  const brand = body.brand && typeof body.brand === 'object' ? body.brand : {}
  let size
  try { size = JSON.stringify(brand).length } catch { size = Infinity }
  if (size > MAX_THEME_BODY_CHARS) return res.status(413).json({ error: 'That design is too large to preview', code: 'design_too_large' })

  try {
    if (typeof consume !== 'function') throw new Error('no rate limiter')
    const turn = await consume({ ...PREVIEW_LIMIT, key: decoded.uid, failOpen: false })
    if (!turn.allowed || turn.degraded) {
      res.setHeader('Retry-After', String(turn.retryAfter || 1))
      return res.status(429).json({ error: 'Too many previews. Try again shortly.', code: 'rate_limited' })
    }
  } catch (e) {
    console.error('export preview: limiter failed', { name: e?.name })
    return res.status(500).json({ error: 'The preview could not be created', code: 'build_failed' })
  }

  try {
    const out = await renderThemePage({
      theme: body.theme, kind: page.kind, page: page.engine, design: brand.design, projectName: brand.name,
    }, engine)
    if (typeof out.html !== 'string' || !out.html) throw new Error('empty document')
    return res.status(200).json({ ok: true, html: free ? watermarked(out.html) : out.html })
  } catch (e) {
    if (e && e.name === 'BrandInputError' && e.code === 'brand_input') {
      return res.status(400).json({ error: 'That project could not be previewed', code: 'invalid_project' })
    }
    // Logged by error name only: the message and stack can quote the project's own text.
    console.error('export preview: build failed', { theme: body.theme, page: body.page, name: e?.name })
    return res.status(500).json({ error: 'The preview could not be created', code: 'build_failed' })
  }
}
