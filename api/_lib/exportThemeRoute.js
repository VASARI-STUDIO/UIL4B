// The themed exports, served from POST /api/ai?export=document with a body { theme, row, format, design, projectName, page? }.
// `page` is optional: a key of EXPORT_PAGES (src/data/exportThemes.js) the theme lists, which sets the size of every page drawn.
// api/_lib/exportDocument.js verifies the session and reads the plan, then hands a request that names a theme or a row to
// serveThemeExport. Nothing here trusts the request beyond its allowlisted names and the two inputs projectToBrand takes.
//
//   theme, row or format not in the table                 400 { code: 'unknown_theme' | 'unknown_row' | 'unknown_format' }
//   page that is not a size, or one the theme does not list  400 { code: 'unknown_page' }
//   not Pro and not a free UI kit                         403 { code: 'pro_required', row, theme }
//   over the per-account limit                            429 { code: 'rate_limited' } + Retry-After
//   body over MAX_THEME_BODY_CHARS (Content-Length first)  413 { code: 'design_too_large' }
//   project the engine refuses                            400 { code: 'invalid_project', inputCode, path? }
//   a text pair that cannot reach its contrast, or a font file the deploy lacks   422 { code: 'contrast' | 'font_missing' }, logged here only
//   anything else that throws                             500 { code: 'build_failed' }, logged here only
//   zip rows                                              200, application/zip, name from the brand slug and theme id (and the page key, when one was asked for)
//   print rows                                            200 { ok: true, theme, row, format, html }
//
// A print row's html is a stand-alone document for the browser's print window: no script, no inline handler, no link to a file
// that is not in it, fonts as data URLs, and a Content-Security-Policy meta that allows nothing else (PRINT_CSP).
//
// Every file name comes from brand.slug (limited to [a-z0-9-] by the engine) and the theme id, never from the project name.

import { EXPORT_THEMES, THEME_ROW_FORMATS, isThemeRowFormat, themeHasRow, themeHasPage } from '../../src/data/exportThemes.js'
import { assertThemeAccess } from './themeAccess.js'

export const MAX_THEME_BODY_CHARS = 256 * 1024
// First in the head of every print document. Inline styles and data: fonts and images are all a print document holds. base-uri and
// form-action are not covered by default-src, so they are named: no <base> can redirect a relative URL, and nothing can submit.
export const PRINT_CSP = "default-src 'none'; img-src data:; font-src data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"
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
  '21-presentation': () => import('./exportThemes/themes/21-presentation/index.js'),
  '22-ticket': () => import('./exportThemes/themes/22-ticket/index.js'),
  '23-broadsheet': () => import('./exportThemes/themes/23-broadsheet/index.js'),
  '24-standards': () => import('./exportThemes/themes/24-standards/index.js'),
  '25-label': () => import('./exportThemes/themes/25-label/index.js'),
  '26-notebook': () => import('./exportThemes/themes/26-notebook/index.js'),
  '27-swissfield': () => import('./exportThemes/themes/27-swissfield/index.js'),
  '28-riso': () => import('./exportThemes/themes/28-riso/index.js'),
  '29-blueprint': () => import('./exportThemes/themes/29-blueprint/index.js'),
  '30-fluted': () => import('./exportThemes/themes/30-fluted/index.js'),
  '31-contact': () => import('./exportThemes/themes/31-contact/index.js'),
  '32-dieline': () => import('./exportThemes/themes/32-dieline/index.js'),
  '33-flyleaf': () => import('./exportThemes/themes/33-flyleaf/index.js'),
  '34-set-square': () => import('./exportThemes/themes/34-set-square/index.js'),
  '35-dispatch': () => import('./exportThemes/themes/35-dispatch/index.js'),
  '36-doorlist': () => import('./exportThemes/themes/36-doorlist/index.js'),
})

export async function loadEngine() {
  const [brandMod, pages, doc, files, book, loaders, validate, styleguide, guideLayout] = await Promise.all([
    import('./exportThemes/brandFromProject.js'),
    import('./exportThemes/engine/pages.js'),
    import('./exportThemes/engine/doc.js'),
    import('./exportThemes/engine/files.js'),
    import('./exportThemes/engine/book.js'),
    import('./exportThemes/node-loaders.js'),
    import('./exportThemes/engine/validate.js'),
    import('./exportThemes/engine/styleguide.js'),
    import('./exportThemes/engine/guide-layout.js'),
  ])
  return { ...brandMod, ...pages, ...doc, ...files, ...book, loaders: loaders.default, BrandInputError: validate.BrandInputError, styleGuideMarkdown: styleguide.styleGuideMarkdown, screenGuide: guideLayout.screenGuide }
}

const dataUrl = (E) => (f) => `data:font/woff2;base64,${Buffer.from(E.loaders.fontFile(f.stem, 'woff2')).toString('base64')}`

// Puts the CSP meta at the top of the head. The document is the engine's own, so its first `<head>` is the real one and sits near
// the start; anything else is a fault. A print document holds no script and no form, so one that does is refused here, before it
// can reach a window (the CSP would stop them running; this keeps them from being written at all).
export function withCsp(html) {
  const at = typeof html === 'string' ? html.indexOf('<head>') : -1
  if (at < 0 || at > 200) throw new Error('print document has no head')
  if (/<script[\s>/]/i.test(html) || /<form[\s>/]/i.test(html)) throw new Error('print document holds a script or a form')
  const end = at + '<head>'.length
  return `${html.slice(0, end)}<meta http-equiv="Content-Security-Policy" content="${PRINT_CSP}">${html.slice(end)}`
}

// A page that throws because its layout cannot hold this brand's words is left out. A font file the deploy lacks is not a fit problem: left out
// quietly it would hollow the document out and end as a bare 500, so it goes on up as font_missing (a 422 with that code, serveThemeExport).
function leaveOut(err, what) {
  if (err && err.code === 'font_missing') throw err
  console.warn(`[export] ${what} left out (${err?.name || 'Error'})`)
}

// One document of every page, for printing (fonts embedded) or for a zip (fonts beside it).
function pagesDoc(E, T, ctx, kind, standalone, only) {
  // A stand-alone page has no font folder beside it: a theme that declares a face of its own in CSS takes it from ctx.mode.fontUrl.
  if (standalone) ctx.mode = { ...ctx.mode, fontBase: '', fontUrl: dataUrl(E) }
  // `only` is one page id: the preview draws a single page and not the whole document. A theme with a page list of its own
  // (T.order(kind, ctx), which reads ctx.skeleton for the Free edition) names its ids, and T.previewId maps an engine id to one of them.
  // The style guide has page ids of its own, so a theme may give it its own map (T.guidePreviewId); the brand map never applies there.
  const own = typeof T.order === 'function' ? T.order(kind, ctx) : null
  const map = kind === 'guide' && T.guidePreviewId ? T.guidePreviewId : T.previewId
  const want = only === undefined ? undefined : (map && map[only]) || only
  const list = (own ? own.map((id) => ({ id })) : kind === 'uikit' ? E.UIKIT_PAGES : E.GUIDE_PAGES).filter((p) => want === undefined || p.id === want)
  // A theme draws only the pages it has written (a guidelines-only theme has twelve); the engine's list keeps their order.
  // A page whose layout cannot hold this brand's words (a theme checks every fit and throws) is left out rather than failing the
  // whole file; only a document with no page at all is a failed build.
  const pages = []
  for (const p of list) {
    if (typeof T[kind]?.[p.id] !== 'function') continue
    try { pages.push(T[kind][p.id](ctx)) } catch (err) { leaveOut(err, `${kind} page ${p.id}`) }
  }
  if (!pages.length) throw new Error(`no ${kind} page could be drawn`)
  const title = `${ctx.brand.name} ${kind === 'uikit' ? 'UI kit' : 'brand guidelines'}`
  return E.pageDoc(ctx, T, { title, pages, size: ctx.size, stack: true, ...(standalone ? { fontUrl: dataUrl(E) } : {}) })
}

// The themed style guide: one A4 page per id in the theme's own order, then style-guide.md (built last, because the pages set the
// wording it reads). A page whose layout cannot hold this brand's words is left out; no page at all is a failed build.
function styleGuide(E, T, ctx, standalone) {
  if (typeof T.guide !== 'object' || !T.guide) throw new Error('theme has no style guide')
  if (standalone) ctx.mode = { ...ctx.mode, fontBase: '', fontUrl: dataUrl(E) }
  const pages = []
  for (const id of E.guideOrder(T, ctx.edition, ctx)) {
    if (typeof T.guide[id] !== 'function') continue
    // a page that throws may have written its markdown hooks already: put them back so the md never describes a page left out
    const hooks = ctx.mdHooks
    try { pages.push({ id, html: T.guide[id](ctx) }) } catch (err) {
      ctx.mdHooks = hooks
      leaveOut(err, `guide page ${id}`)
    }
  }
  if (!pages.length) throw new Error('no guide page could be drawn')
  // the markdown describes only the pages that were drawn
  ctx.pagesDrawn = pages.map((p) => p.id)
  const doc = (title, list, stack) => E.pageDoc(ctx, T, { title, pages: list, size: ctx.size, stack, ...(standalone ? { fontUrl: dataUrl(E) } : {}) })
  // the site documents also carry the phone edition (the print document does not): the whole guide in index.html, a page's own section in its html
  const site = (title, list, ids) => E.pageDoc(ctx, T, { title, pages: list, size: ctx.size, stack: !ids, screen: E.screenGuide(ctx, ids), ...(standalone ? { fontUrl: dataUrl(E) } : {}) })
  return { pages, doc, site, ctx, md: E.styleGuideMarkdown(ctx) }
}

// The theme's own multi-page site (index.html, a page each, assets/), for a theme that has one. Literal paths, so Vercel traces them.
// A site that cannot be laid out for this brand gives null, and the caller serves the stacked document instead.
async function premiumSite(kind, ctx, T) {
  try {
    const files = kind === 'kit' ? (await import('./exportThemes/engine/kit-site-build.js')).kitSiteFiles(ctx, T)
      : (await import('./exportThemes/engine/guide-site-build.js')).guideSiteFiles(ctx, T)
    return dropSiblingLinks(files)
  } catch (err) { console.warn(`[export] ${kind} site not built (${err?.name || 'Error'}); serving the single document`); return null }
}

// The themes link the guide and the kit to each other as sibling folders named ui-kit-html and guidelines-html (the engine's
// layout). Each export is its own zip holding one format, so the sibling is never in it: a link to it would be dead on arrival.
// Every anchor into a sibling folder is written as a span with the same classes and text, so the name stays and the dead href goes.
const SIBLING_LINK = /<a\b([^>]*?)\shref="\.\.\/(?:ui-kit-html|guidelines-html)\/[^"]*"([^>]*)>([\s\S]*?)<\/a>/g
export function dropSiblingLinks(files) {
  const out = {}
  for (const [path, body] of Object.entries(files)) {
    out[path] = typeof body === 'string' && /\.html$/.test(path) ? body.replace(SIBLING_LINK, '<span$1$2>$3</span>') : body
  }
  return out
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

// A published site has no editor to fill a box in: a project that has not named the brand is shown under a plain name, the same in the
// titles, the stylesheet comments, the README and the logo. (The print documents keep the unwritten name as a box to fill.)
export const UNNAMED_BRAND = 'Your brand'
export const SITE_NAME = 'Your name'
export function siteBrand(brand) {
  if (brand.name !== UNNAMED_BRAND) return brand
  return { ...brand, name: SITE_NAME, logo: { ...brand.logo, showcase: { ...brand.logo.showcase, wordmark: SITE_NAME } } }
}

/** Builds one export. Returns { zip: Buffer, name } or { html } (a print document, with its CSP meta). */
export async function renderThemeExport({ theme, row, format, design, projectName, page, skeleton = false }, engine) {
  const opts = { skeleton: skeleton === true, ...(page === undefined ? {} : { page }) }
  const tag = page === undefined ? '' : `-${page}`
  const E = engine || await loadEngine()
  // Only these two values leave the request. The date defaults, and no brand object from the client reaches the engine.
  const brand = E.projectToBrand({ design, projectName })
  const slug = brand.slug
  const T = await THEMES[theme]()
  const dirs = { guide: `${slug}-brand-guidelines-${theme}${tag}`, kit: `${slug}-ui-kit-${theme}${tag}` }
  if (row === 'ui-kit') {
    const ctx = E.makeCtx(T, 'slot', 'uikit', E.loaders, T.kitSite ? siteBrand(brand) : brand, opts)
    const site = T.kitSite ? await premiumSite('kit', ctx, T) : null
    const files = { ...E.codePackageFiles(ctx, T), ...E.fontFiles(ctx, T), ...(site || { 'ui-kit.html': pagesDoc(E, T, ctx, 'uikit', false) }) }
    return { name: `${dirs.kit}.zip`, zip: await zipOf(E, files, dirs.kit) }
  }
  if (row === 'slides') {
    if (format === 'pdf') return { html: withCsp(pagesDoc(E, T, E.makeCtx(T, 'slot', 'guidelines', E.loaders, brand, opts), 'guidelines', true)) }
    const ctx = E.makeCtx(T, 'slot', 'guidelines', E.loaders, T.guideSite ? siteBrand(brand) : brand, opts)
    const site = T.guideSite ? await premiumSite('guide', ctx, T) : null
    const files = site || { ...E.fontFiles(ctx, T), 'brand-guidelines.html': pagesDoc(E, T, ctx, 'guidelines', false) }
    return { name: `${dirs.guide}.zip`, zip: await zipOf(E, files, dirs.guide) }
  }
  if (row === 'guide') {
    // Free where the guidelines are free (a theme's rows list names it, src/data/exportThemes.js); the access check is unchanged.
    const name = `${slug}-style-guide-${theme}${tag}`
    const g = styleGuide(E, T, E.makeCtx(T, 'slot', 'guide', E.loaders, brand, opts), format === 'pdf')
    const title = `${brand.name} style guide`
    if (format === 'pdf') return { html: withCsp(g.doc(title, g.pages.map((x) => x.html), true)) }
    if (format === 'md') return { md: g.md, name: `${name}.md` }
    const files = { ...E.fontFiles(g.ctx, T), 'index.html': g.site(title, g.pages.map((x) => x.html), null), 'style-guide.md': g.md }
    for (const x of g.pages) files[`${x.id}.html`] = g.site(`${title}: ${x.id}`, [x.html], [x.id])
    return { name: `${name}.zip`, zip: await zipOf(E, files, name) }
  }
  if (format === 'pdf') return { html: withCsp(bookPrint(E, T, brand, slug)) }
  const { files } = await bookSite(E, T, brand, slug)
  return { name: `${slug}-brand-book-${theme}${tag}.zip`, zip: await zipOf(E, files, `${slug}-brand-book-${theme}${tag}`) }
}

/**
 * One page of a theme for the live preview, drawn the way renderThemeExport draws it for a print document (stand-alone, fonts
 * embedded, CSP meta first). `kind` is 'uikit' or 'guidelines' and `page` an engine page id; kind 'book' is the book's first
 * screen and takes no page. `size` is an optional page size key (the export's `page` field; named apart because `page` is an id here).
 * Returns { html }.
 */
export async function renderThemePage({ theme, kind, page, size, design, projectName, skeleton = false }, engine) {
  const E = engine || await loadEngine()
  const brand = E.projectToBrand({ design, projectName })
  const T = await THEMES[theme]()
  if (kind === 'book') return { html: withCsp(bookPrint(E, T, brand, brand.slug)) }
  const ctx = E.makeCtx(T, 'slot', kind, E.loaders, brand, { skeleton: skeleton === true, ...(size === undefined ? {} : { page: size }) })
  return { html: withCsp(pagesDoc(E, T, ctx, kind, true, page)) }
}

const safePath = (p) => (typeof p === 'string' && /^[A-Za-z0-9_.[\]-]{1,120}$/.test(p) ? p : undefined)

/**
 * The 400 body for a theme, row or format outside the table, or null. It reads nothing but the request, so a caller can check it
 * before it reads the account's plan.
 */
export function themeRequestProblem({ theme, row, format, page }) {
  if (typeof theme !== 'string' || !EXPORT_THEMES.some((t) => t.id === theme)) return { error: 'Unknown export theme', code: 'unknown_theme' }
  if (typeof row !== 'string' || !Object.hasOwn(THEME_ROW_FORMATS, row)) return { error: 'Unknown export row', code: 'unknown_row' }
  if (!themeHasRow(theme, row)) return { error: 'Unknown export row', code: 'unknown_row' }
  if (!isThemeRowFormat(row, format)) return { error: 'Unknown export format', code: 'unknown_format' }
  if (page !== undefined && !themeHasPage(theme, page)) return { error: 'Unknown page size', code: 'unknown_page' }
  return null
}

// The declared body length, when the request states one. Bytes, so at or above the character count the cap is written in.
function declaredLength(req) {
  const n = Number(req.headers?.['content-length'])
  return Number.isFinite(n) && n >= 0 ? n : 0
}

// The first stack frame inside api/_lib, as a path relative to it with line and column, e.g. "exportThemes/engine/brand.js:95:11".
// Code positions only, so it is safe to log. The stack opens with "Name: message", and the message can run over several lines, so that
// head is cut off first and only frame lines ("    at ") are read: a message that quotes a path cannot pass itself off as the throw site.
function thrownAt(e) {
  let stack = String(e?.stack ?? '')
  let head
  try { head = `${e?.name ?? 'Error'}: ${e?.message ?? ''}` } catch { return '' }
  if (stack.startsWith(head)) stack = stack.slice(head.length)
  else if (e?.message) return ''
  for (const line of stack.split('\n')) {
    if (!line.startsWith('    at ')) continue
    const m = /api[\\/]_lib[\\/]([\w./\\-]+:\d+:\d+)/.exec(line)
    if (m) return m[1].replace(/\\/g, '/')
  }
  return ''
}

/**
 * @param ctx { body, decoded, plan, consume?, engine? }  the session and plan are already checked by the caller
 */
export async function serveThemeExport(req, res, { body, decoded, plan, consume, engine }) {
  const { theme, row, format } = body
  const problem = themeRequestProblem(body)
  if (problem) return res.status(400).json(problem)
  const access = assertThemeAccess(plan, { theme, row, format })
  if (!access.ok) {
    return res.status(access.status).json(access.code === 'pro_required'
      ? { error: 'Pro plan required', code: 'pro_required', row, theme }
      : { error: 'Export not available', code: access.code })
  }

  // The stated length first: an oversize request costs no limiter write and no stringify.
  if (declaredLength(req) > MAX_THEME_BODY_CHARS) {
    return res.status(413).json({ error: 'That design is too large to export', code: 'design_too_large' })
  }

  try {
    if (typeof consume !== 'function') throw new Error('no rate limiter')
    // failOpen: false, so a counter that cannot be read or written refuses (429) and does not let the export through uncounted.
    // A verdict that says `degraded` is a limiter that did not count, so it is refused here too.
    const verdict = await consume({ ...THEME_EXPORT_LIMIT, key: decoded.uid, failOpen: false })
    if (!verdict.allowed || verdict.degraded) {
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
    // Free (any plan but Pro) gets a theme's skeleton edition. It is decided here from the plan the caller read from the account, never from the request.
    const out = await renderThemeExport({ theme, row, format, design: body.design, projectName: body.projectName, page: body.page, skeleton: plan?.id !== 'pro' }, E)
    if (out.zip) {
      res.setHeader('Content-Type', 'application/zip')
      res.setHeader('Content-Disposition', `attachment; filename="${out.name}"`)
      return res.status(200).send(out.zip)
    }
    if (typeof out.md === 'string' && out.md) {
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8')
      res.setHeader('Content-Disposition', `attachment; filename="${out.name}"`)
      return res.status(200).send(out.md)
    }
    if (typeof out.html !== 'string' || !out.html) throw new Error('empty document')
    return res.status(200).json({ ok: true, theme, row, format, html: out.html })
  } catch (e) {
    if (e && e.name === 'BrandInputError' && e.code === 'brand_input') {
      const path = safePath(e.path)
      return res.status(400).json({ error: 'That project could not be exported', code: 'invalid_project', inputCode: 'brand_input', ...(path ? { path } : {}) })
    }
    // A palette the engine cannot read text on, or a font file the deploy lacks: a code the client can act on, with nothing else in the body.
    // Its message (a hex pair and a ratio, or a font file stem) is logged cut to 200 characters and never sent.
    if (e && (e.code === 'contrast' || e.code === 'font_missing')) {
      console.warn('export theme: build refused', { theme, row, format, code: e.code, message: String(e.message ?? '').slice(0, 200) })
      return res.status(422).json({ code: e.code })
    }
    // Any other throw: the error name and the code line that threw. Not its message, which can quote the brand's own copy. Never the uid,
    // the email, the project name or the design.
    console.error('export theme: build failed', { theme, row, format, name: e?.name, at: thrownAt(e) })
    return res.status(500).json({ error: 'The document could not be created', code: 'build_failed' })
  }
}
