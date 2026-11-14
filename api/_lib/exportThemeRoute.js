// The themed exports, served from POST /api/ai?export=document with a body { theme, row, format, design, projectName }.
// api/_lib/exportDocument.js verifies the session and reads the plan, then hands a request that names a theme or a row to
// serveThemeExport. Nothing here trusts the request beyond its allowlisted names and the two inputs projectToBrand takes.
//
//   theme, row or format not in the table                 400 { code: 'unknown_theme' | 'unknown_row' | 'unknown_format' }
//   not Pro and not a free UI kit                         403 { code: 'pro_required', row, theme }
//   over the per-account limit                            429 { code: 'rate_limited' } + Retry-After
//   body over MAX_THEME_BODY_CHARS (Content-Length first)  413 { code: 'design_too_large' }
//   project the engine refuses                            400 { code: 'invalid_project', inputCode, path? }
//   anything else that throws                             500 { code: 'build_failed' }, logged here only
//   zip rows                                              200, application/zip, name from the brand slug and theme id
//   print rows                                            200 { ok: true, theme, row, format, html }
//
// A print row's html is a stand-alone document for the browser's print window: no script, no inline handler, no link to a file
// that is not in it, fonts as data URLs, and a Content-Security-Policy meta that allows nothing else (PRINT_CSP).
//
// Every file name comes from brand.slug (limited to [a-z0-9-] by the engine) and the theme id, never from the project name.

import { EXPORT_THEMES, THEME_ROW_FORMATS, isThemeExportPro, isThemeRowFormat, themeHasRow } from '../../src/data/exportThemes.js'

export const MAX_THEME_BODY_CHARS = 256 * 1024
// First in the head of every print document. Inline styles and data: fonts and images are all a print document holds.
export const PRINT_CSP = "default-src 'none'; img-src data:; font-src data:; style-src 'unsafe-inline'"
// One account's themed exports in a window. A render takes tens of milliseconds, so this bounds abuse and not honest use.
export const THEME_EXPORT_LIMIT = Object.freeze({ bucket: 'export-theme', limit: 30, windowMs: 10 * 60 * 1000 })

// Literal paths, so Vercel's file tracing carries every theme with the function.
const THEMES = Object.freeze({
  '01-presentation': () => import('./exportThemes/themes/01-presentation/index.js'),
  '02-poster': () => import('./exportThemes/themes/02-poster/index.js'),
  '03-broadsheet': () => import('./exportThemes/themes/03-broadsheet/index.js'),
  '04-standards': () => import('./exportThemes/themes/04-standards/index.js'),
  '05-specimen': () => import('./exportThemes/themes/05-specimen/index.js'),
  '06-studio': () => import('./exportThemes/themes/06-studio/index.js'),
  '07-spec': () => import('./exportThemes/themes/07-spec/index.js'),
  '08-monograph': () => import('./exportThemes/themes/08-monograph/index.js'),
  '09-blueprint': () => import('./exportThemes/themes/09-blueprint/index.js'),
  '10-inuse': () => import('./exportThemes/themes/10-inuse/index.js'),
  '24-standards': () => import('./exportThemes/themes/24-standards/index.js'),
  '25-label': () => import('./exportThemes/themes/25-label/index.js'),
  '27-swissfield': () => import('./exportThemes/themes/27-swissfield/index.js'),
  '29-blueprint': () => import('./exportThemes/themes/29-blueprint/index.js'),
  '30-fluted': () => import('./exportThemes/themes/30-fluted/index.js'),
  '32-dieline': () => import('./exportThemes/themes/32-dieline/index.js'),
})

async function loadEngine() {
  const [brandMod, pages, doc, files, book, loaders, validate] = await Promise.all([
    import('./exportThemes/brandFromProject.js'),
    import('./exportThemes/engine/pages.js'),
    import('./exportThemes/engine/doc.js'),
    import('./exportThemes/engine/files.js'),
    import('./exportThemes/engine/book.js'),
    import('./exportThemes/node-loaders.js'),
    import('./exportThemes/engine/validate.js'),
  ])
  return { ...brandMod, ...pages, ...doc, ...files, ...book, loaders: loaders.default, BrandInputError: validate.BrandInputError }
}

const dataUrl = (E) => (f) => `data:font/woff2;base64,${Buffer.from(E.loaders.fontFile(f.stem, 'woff2')).toString('base64')}`

// Puts the CSP meta at the top of the head. The document is the engine's own, so its first `<head>` is the real one and sits near
// the start; anything else is a fault.
function withCsp(html) {
  const at = typeof html === 'string' ? html.indexOf('<head>') : -1
  if (at < 0 || at > 200) throw new Error('print document has no head')
  const end = at + '<head>'.length
  return `${html.slice(0, end)}<meta http-equiv="Content-Security-Policy" content="${PRINT_CSP}">${html.slice(end)}`
}

// One document of every page, for printing (fonts embedded) or for a zip (fonts beside it).
function pagesDoc(E, T, ctx, kind, standalone) {
  // A stand-alone page has no font folder beside it: a theme that declares a face of its own in CSS takes it from ctx.mode.fontUrl.
  if (standalone) ctx.mode = { ...ctx.mode, fontBase: '', fontUrl: dataUrl(E) }
  const list = kind === 'uikit' ? E.UIKIT_PAGES : E.GUIDE_PAGES
  // A theme draws only the pages it has written (a guidelines-only theme has twelve); the engine's list keeps their order.
  // A page whose layout cannot hold this brand's words (a theme checks every fit and throws) is left out rather than failing the
  // whole file; only a document with no page at all is a failed build.
  const pages = []
  for (const p of list) {
    if (typeof T[kind]?.[p.id] !== 'function') continue
    try { pages.push(T[kind][p.id](ctx)) } catch (err) { console.warn(`[export] ${kind} page ${p.id} left out (${err?.name || 'Error'})`) }
  }
  if (!pages.length) throw new Error(`no ${kind} page could be drawn`)
  const title = `${ctx.brand.name} ${kind === 'uikit' ? 'UI kit' : 'brand guidelines'}`
  return E.pageDoc(ctx, T, { title, pages, size: ctx.size, stack: true, ...(standalone ? { fontUrl: dataUrl(E) } : {}) })
}

// A file map as a zip with one top folder.
const zipOf = (E, files, top) => E.zipFiles(files, top)

// The brand book for printing: the engine's print edition of the book, built from the same kit listing as the site.
function bookPrint(E, T, brand, slug) {
  const ctx = E.makeCtx(T, 'slot', 'guidelines', E.loaders, brand)
  return E.bookPrintDoc(ctx, T, { kit: E.kitFiles(ctx, T), kitName: `${slug}-brand-kit`, fontUrl: dataUrl(E) })
}

async function bookSite(E, T, brand, slug) {
  const ctx = E.makeCtx(T, 'slot', 'guidelines', E.loaders, brand)
  const kitName = `${slug}-brand-kit`
  const kit = E.kitFiles(ctx, T)
  const kitZip = await E.zipFiles(kit, kitName)
  return { ctx, files: E.bookFiles(ctx, T, { kit, kitName, zip: kitZip, outside: false }) }
}

/** Builds one export. Returns { zip: Buffer, name } or { html } (a print document, with its CSP meta). */
export async function renderThemeExport({ theme, row, format, design, projectName }, engine) {
  const E = engine || await loadEngine()
  // Only these two values leave the request. The date defaults, and no brand object from the client reaches the engine.
  const brand = E.projectToBrand({ design, projectName })
  const slug = brand.slug
  const T = await THEMES[theme]()
  if (row === 'ui-kit') {
    const ctx = E.makeCtx(T, 'slot', 'uikit', E.loaders, brand)
    const files = { ...E.codePackageFiles(ctx, T), ...E.fontFiles(ctx, T), 'ui-kit.html': pagesDoc(E, T, ctx, 'uikit', false) }
    return { name: `${slug}-ui-kit-${theme}.zip`, zip: await zipOf(E, files, `${slug}-ui-kit-${theme}`) }
  }
  if (row === 'slides') {
    const ctx = E.makeCtx(T, 'slot', 'guidelines', E.loaders, brand)
    if (format === 'pdf') return { html: withCsp(pagesDoc(E, T, ctx, 'guidelines', true)) }
    const files = { ...E.fontFiles(ctx, T), 'brand-guidelines.html': pagesDoc(E, T, ctx, 'guidelines', false) }
    return { name: `${slug}-brand-guidelines-${theme}.zip`, zip: await zipOf(E, files, `${slug}-brand-guidelines-${theme}`) }
  }
  if (format === 'pdf') return { html: withCsp(bookPrint(E, T, brand, slug)) }
  const { files } = await bookSite(E, T, brand, slug)
  return { name: `${slug}-brand-book-${theme}.zip`, zip: await zipOf(E, files, `${slug}-brand-book-${theme}`) }
}

const safePath = (p) => (typeof p === 'string' && /^[A-Za-z0-9_.[\]-]{1,120}$/.test(p) ? p : undefined)

/**
 * The 400 body for a theme, row or format outside the table, or null. It reads nothing but the request, so a caller can check it
 * before it reads the account's plan.
 */
export function themeRequestProblem({ theme, row, format }) {
  if (typeof theme !== 'string' || !EXPORT_THEMES.some((t) => t.id === theme)) return { error: 'Unknown export theme', code: 'unknown_theme' }
  if (typeof row !== 'string' || !Object.hasOwn(THEME_ROW_FORMATS, row)) return { error: 'Unknown export row', code: 'unknown_row' }
  if (!themeHasRow(theme, row)) return { error: 'Unknown export row', code: 'unknown_row' }
  if (!isThemeRowFormat(row, format)) return { error: 'Unknown export format', code: 'unknown_format' }
  return null
}

// The declared body length, when the request states one. Bytes, so at or above the character count the cap is written in.
function declaredLength(req) {
  const n = Number(req.headers?.['content-length'])
  return Number.isFinite(n) && n >= 0 ? n : 0
}

/**
 * @param ctx { body, decoded, plan, consume?, engine? }  the session and plan are already checked by the caller
 */
export async function serveThemeExport(req, res, { body, decoded, plan, consume, engine }) {
  const { theme, row, format } = body
  const problem = themeRequestProblem(body)
  if (problem) return res.status(400).json(problem)
  if (plan.id !== 'pro' && isThemeExportPro(row, theme)) {
    return res.status(403).json({ error: 'Pro plan required', code: 'pro_required', row, theme })
  }

  // The stated length first: an oversize request costs no limiter write and no stringify.
  if (declaredLength(req) > MAX_THEME_BODY_CHARS) {
    return res.status(413).json({ error: 'That design is too large to export', code: 'design_too_large' })
  }

  try {
    if (typeof consume !== 'function') throw new Error('no rate limiter')
    const verdict = await consume({ ...THEME_EXPORT_LIMIT, key: decoded.uid })
    if (!verdict.allowed) {
      res.setHeader('Retry-After', String(verdict.retryAfter || 1))
      return res.status(429).json({ error: 'Too many exports. Try again shortly.', code: 'rate_limited' })
    }
  } catch (e) {
    console.error('export theme: limiter failed', { name: e?.name })
    return res.status(500).json({ error: 'The document could not be created', code: 'build_failed' })
  }

  let size
  try { size = JSON.stringify(body).length } catch { size = Infinity }
  if (size > MAX_THEME_BODY_CHARS) {
    return res.status(413).json({ error: 'That design is too large to export', code: 'design_too_large' })
  }

  let E
  try {
    E = engine || await loadEngine()
    const out = await renderThemeExport({ theme, row, format, design: body.design, projectName: body.projectName }, E)
    if (out.zip) {
      res.setHeader('Content-Type', 'application/zip')
      res.setHeader('Content-Disposition', `attachment; filename="${out.name}"`)
      return res.status(200).send(out.zip)
    }
    if (typeof out.html !== 'string' || !out.html) throw new Error('empty document')
    return res.status(200).json({ ok: true, theme, row, format, html: out.html })
  } catch (e) {
    if (e && e.name === 'BrandInputError' && e.code === 'brand_input') {
      const path = safePath(e.path)
      return res.status(400).json({ error: 'That project could not be exported', code: 'invalid_project', inputCode: 'brand_input', ...(path ? { path } : {}) })
    }
    // Logged here and nowhere else, by error name only: the message, cause and stack can quote the project's own text.
    console.error('export theme: build failed', { theme, row, format, name: e?.name })
    return res.status(500).json({ error: 'The document could not be created', code: 'build_failed' })
  }
}
