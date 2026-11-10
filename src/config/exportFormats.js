// The ONE description of what the export panel can produce, and which of those
// a free account can have.
//
// WHY THIS MOVED OUT OF ExportPanel.jsx (2026-09-05). The array below used to
// be a private const inside that component, which meant /plans had no way to
// read it and described the export offer from memory instead. It described it
// wrongly, in the direction that costs money: the pricing page and the checkout
// page both sold "full design JSON" as a Pro benefit, while `json` here has
// never carried `live: true` — it renders a "Soon" badge over a disabled
// button, and ExportPanel's runExport() has no branch that could build one.
// Somebody could pay $48 for a file the product cannot make.
//
// So the pricing page now DERIVES its export claims from this array rather than
// restating them. A format cannot be advertised as available unless the same
// flag that renders its button says it is. tests/unit/plans-truth.test.js
// fails if /plans names a format this file does not mark live.
//
// This is the same contract src/config/plans.js has with api/_lib/plans.js, and
// it lives outside the component for the same mechanical reason: a constant
// exported alongside a component trips react-refresh/only-export-components and
// breaks fast refresh. Plain data belongs in a plain module.
//
// TWO FLAGS, AND THEY MEAN DIFFERENT THINGS:
//   live — the format is BUILT. Without it the panel offers no row for it and
//          names it only in the one "on the way" line, for everyone, on every
//          plan. Nobody can buy it.
//   pro  — the format is BUILT but GATED. It drives BOTH the badge and the
//          entitlement check in runExport(), so a format can never be badged
//          and ungated, or gated and unbadged.
//
// A format with `pro` and no `live` would be a paid promise of a file that does
// not exist. assertFormatsCoherent() below refuses that combination.
//
// A THIRD FLAG, ADDED WITH THE BRAND GUIDELINES:
//   logo — this document has pages that exist only when the user has uploaded a
//          logo. It is what tells ExportPanel to offer the upload field beside
//          the format, so the request appears next to the thing that needs it
//          rather than in a settings page nobody visits. It carries no
//          entitlement meaning: a Pro user with no logo still gets the document,
//          minus the logo section, and its closing page names what is missing.

export const EXPORT_FORMATS = Object.freeze([
  // The UI kit: the default export for every plan. Free carries the UIL4B
  // mark; Pro gets the same kit without it, plus the named identity section.
  // `kit` marks it for the plan lines, which list it apart from the style
  // guide formats. Built by utils/uiKitExport.js from src/templates/kit/studio.html (the default kit template).
  Object.freeze({ id: 'kit', name: 'UI kit', desc: 'One HTML file with your palette and tints, semantic colours, type, foundations and component states. Opens offline, prints to A4, and carries its CSS, JSON and font files.', live: true, kit: true, group: 'kit', action: 'Export UI kit' }),
  // The two Pro deliverables, listed first because they are the best things the
  // panel makes — and listed as a PAIR because that is the offer. They are not
  // the same document at two paper sizes: the book is an A4 portrait
  // SPECIFICATION an engineer implements from, and the guidelines are a 16:9
  // landscape PRESENTATION a brand is argued from. See the long note at the top
  // of utils/brandGuidelines.js for why the brand-guidelines reference material
  // could not be served by extending the book.
  Object.freeze({ id: 'book', name: 'Design system book (PDF)', desc: 'An A4 book of your system: cover, contents, colour specimens, the contrast matrix, type specimens and every token. Opens ready to save as PDF.', live: true, pro: true, group: 'book', option: 'PDF', action: 'Export book (PDF)' }),
  // The same book as page images. Not a third Pro document: `variantOf` marks it as another file of the book,
  // so the plan lines count and name the book once. Drawn in the browser (utils/bookRaster.js), one layout.
  Object.freeze({ id: 'book-png', name: 'Design system book (PNG, 2K)', desc: 'The same book as 2K page images, 1448 x 2048 px each, in one zip: cover, contents, colour specimens, the contrast matrix, type specimens and every token. For screens, decks and review.', live: true, pro: true, variantOf: 'book', group: 'book', option: 'PNG (2K)', action: 'Export book (PNG)' }),
  // The same book as one HTML file: the server's document, saved rather than printed (the gallery's path).
  Object.freeze({ id: 'book-html', name: 'Design system book (offline HTML)', desc: 'The same book as one HTML file. Opens offline in any browser.', live: true, pro: true, variantOf: 'book', group: 'book', option: 'HTML', action: 'Export HTML' }),
  Object.freeze({ id: 'guidelines', name: 'Brand guidelines (presentation)', desc: 'A 16:9 landscape deck: cover, numbered sections, named swatches, alphabet grids, and your own logo on every brand ground with its clear-space rule. Opens ready to save as PDF.', live: true, pro: true, logo: true, group: 'guidelines', option: 'PDF', action: 'Export guidelines' }),
  Object.freeze({ id: 'guidelines-html', name: 'Brand guidelines (offline HTML)', desc: 'The same deck as one HTML file. Opens offline in any browser.', live: true, pro: true, logo: true, variantOf: 'guidelines', group: 'guidelines', option: 'HTML', action: 'Export HTML' }),
  Object.freeze({ id: 'html', name: 'Style guide (HTML)', desc: 'A paginated A4 booklet: cover, palette with contrast evidence, and the type ladder. Prints to PDF from the browser.', live: true, group: 'guide', option: 'HTML', action: 'Export style guide (HTML)' }),
  Object.freeze({ id: 'md', name: 'Style guide (Markdown)', desc: 'The same guide, importable straight into Notion or Google Docs.', live: true, group: 'guide', option: 'Markdown', action: 'Export style guide (Markdown)' }),
  Object.freeze({ id: 'png', name: 'Style guide (PNG)', desc: 'A single A4 sheet at 2×: palette, contrast grades and the type ladder. For pasting into a deck or a handoff ticket.', live: true, group: 'guide', option: 'PNG', action: 'Export style guide (PNG)' }),
  Object.freeze({ id: 'jpeg', name: 'Style guide (JPEG)', desc: 'The same sheet, smaller file, for anywhere that will not take a PNG.', live: true, group: 'guide', option: 'JPEG', action: 'Export style guide (JPEG)' }),
  Object.freeze({ id: 'css', name: 'CSS tokens', desc: 'Custom properties for the palette and its tints, semantic colours and type. Drop into any stylesheet.', live: true, group: 'tokens', option: 'CSS', action: 'Export CSS tokens' }),
  Object.freeze({ id: 'json', name: 'JSON tokens', desc: 'The same tokens in the W3C Design Tokens (DTCG) format, for token pipelines and tools that read it.', live: true, group: 'tokens', option: 'JSON', action: 'Export JSON tokens' }),
  Object.freeze({ id: 'tailwind', name: 'Tailwind theme', desc: 'A Tailwind v4 @theme file: your colours, interface roles, fonts and type sizes as utilities.', live: true, group: 'tokens', option: 'Tailwind', action: 'Export Tailwind theme' }),
  Object.freeze({ id: 'contrast', credit: false, name: 'Contrast pairs CSV', desc: 'Every colour on every other colour, and on white and black, with its ratio and WCAG result. Opens in any spreadsheet.', live: true, group: 'tokens', option: 'Contrast CSV', action: 'Export contrast pairs' }),
  Object.freeze({ id: 'contrast-json', credit: false, name: 'Contrast pairs JSON', desc: 'The same contrast pairs as JSON, with the ratio as a number and each WCAG result as a true or false.', live: true, group: 'tokens', option: 'Contrast JSON', action: 'Export contrast pairs' }),
  // The app-ready zip: files for Figma, Adobe, Affinity, Procreate and code, one folder per app. Built in the browser
  // (utils/appBundle.js), so no server document stands behind this Pro gate.
  Object.freeze({ id: 'app-bundle', name: 'App-ready bundle', desc: 'Figma variables, Adobe and Affinity swatches, Procreate palette and code tokens, in folders by app, with a README', live: true, pro: true, group: 'apps', option: 'ZIP', action: 'Export app-ready bundle' }),
  Object.freeze({ id: 'assets', name: 'Asset bundle', desc: 'Icons and swatches exported together as SVG + PNG.', coming: 'an asset bundle' }),
])

// THE SIX THINGS THE PANEL OFFERS, in the order it lists them. Each is one
// deliverable; where it comes in more than one file type, its formats above
// share its `group` and the panel shows them as a switch (`option` is the
// switch label, `action` the primary button's words). The ids never change, so
// every format stays reachable and /plans keeps reading the same array.
//
// Free rows come first and the Pro documents follow, so the panel can set the
// paid ones apart with space rather than a tinted box. `pro` is not stored
// here: a row is Pro when its formats are, so there is one flag to keep true.
export const EXPORT_GROUPS = Object.freeze([
  Object.freeze({ id: 'kit', name: 'UI kit', desc: 'One HTML file with your palette, type and components. Opens offline.' }),
  Object.freeze({ id: 'guide', name: 'Style guide', desc: 'A printable A4 guide to your palette and type.' }),
  Object.freeze({ id: 'tokens', name: 'Design tokens', desc: 'Your palette, tints and type as code.' }),
  Object.freeze({ id: 'book', name: 'Design system book', desc: 'An A4 book of your system, as a PDF or as 2K page images.', preview: 'book' }),
  Object.freeze({ id: 'guidelines', name: 'Brand guidelines', desc: 'Your logo, colour and type as 16:9 slides.', preview: 'guidelines' }),
  Object.freeze({ id: 'apps', name: 'App-ready bundle', desc: 'Your colours and tokens as files for Figma, Adobe, Affinity, Procreate and code, in one zip.' }),
])

// The built formats of one row, in the order the switch shows them.
export const groupFormats = (groupId) => EXPORT_FORMATS.filter((f) => f.live && f.group === groupId)

// A row is Pro when every file in it is.
export const isGroupPro = (groupId) => {
  const formats = groupFormats(groupId)
  return formats.length > 0 && formats.every((f) => f.pro)
}

// The one quiet line for formats that are not built: "An asset bundle is on the way."
// Empty when nothing is unbuilt, so the line disappears instead of lying.
export const comingLine = () => {
  const names = unbuiltFormats().map((f) => f.coming).filter(Boolean)
  if (!names.length) return ''
  const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0]
  return `${list.charAt(0).toUpperCase()}${list.slice(1)} ${names.length > 1 ? 'are' : 'is'} on the way.`
}

// Built, and available without paying.
export const freeFormats = () => EXPORT_FORMATS.filter((f) => f.live && !f.pro)

// Free formats that carry the small "Made with UIL4B" line. The contrast pairs
// files have no place for one (`credit: false`).
export const creditedFormats = () => freeFormats().filter((f) => f.credit !== false)

// The free formats other than the UI kit: the style guide files and the tokens.
export const styleGuideFormats = () => freeFormats().filter((f) => !f.kit)

// Built, and gated. Everything a Pro subscription actually adds to the export
// offer — if this is ever empty, Pro sells nothing on export and the pricing
// page must stop saying it does.
export const proOnlyFormats = () => documentFormats().filter((f) => f.live && f.pro)

// A format that is another file of a document already in the list (the book as PNG
// beside the book as PDF) carries `variantOf`. The plan lines and the pricing page
// count and name documents, so the Pro and live lists below leave variants out;
// the panel reads EXPORT_FORMATS directly and offers every file.
export const documentFormats = () => EXPORT_FORMATS.filter((f) => !f.variantOf)

// Built, on either plan.
export const liveFormats = () => documentFormats().filter((f) => f.live)

// NOT built, for anybody. These are the ones a pricing page is tempted to sell
// and must not.
export const unbuiltFormats = () => EXPORT_FORMATS.filter((f) => !f.live)

// The invariant the whole arrangement rests on. Exported so a unit test can run
// it against the real array rather than re-describing it.
export function assertFormatsCoherent(formats = EXPORT_FORMATS) {
  const paidButUnbuilt = formats.filter((f) => f.pro && !f.live)
  if (paidButUnbuilt.length) {
    throw new Error(
      `export formats mark ${paidButUnbuilt.map((f) => f.id).join(', ')} as Pro without being live — that is a paid promise of a file the product cannot make`,
    )
  }
  const ids = formats.map((f) => f.id)
  if (new Set(ids).size !== ids.length) throw new Error('duplicate export format id')
  const stray = formats.filter((f) => f.variantOf && !formats.some((x) => x.id === f.variantOf && x.live && x.group === f.group))
  if (stray.length) throw new Error(`export formats ${stray.map((f) => f.id).join(', ')} name a variantOf that is not a live format in their row`)
  return true
}

// The panel lists rows, not formats, so a built format with no row is a file
// nobody can reach, and a row with no built format is an empty radio. Kept
// apart from assertFormatsCoherent so that function still accepts any array.
export function assertGroupsCoherent(formats = EXPORT_FORMATS, groups = EXPORT_GROUPS) {
  const known = new Set(groups.map((g) => g.id))
  const orphans = formats.filter((f) => f.live && !known.has(f.group))
  if (orphans.length) {
    throw new Error(`export formats ${orphans.map((f) => f.id).join(', ')} are built but belong to no panel row`)
  }
  const empty = groups.filter((g) => !formats.some((f) => f.live && f.group === g.id))
  if (empty.length) throw new Error(`panel rows ${empty.map((g) => g.id).join(', ')} have no built format`)
  const unnamed = formats.filter((f) => f.live && formats.filter((x) => x.live && x.group === f.group).length > 1 && !f.option)
  if (unnamed.length) throw new Error(`export formats ${unnamed.map((f) => f.id).join(', ')} share a row but have no switch label`)
  return true
}

// ── Export themes ────────────────────────────────────────────────────────────
//
// Ten designed looks for the brand documents. They are their own data, NOT
// entries in EXPORT_FORMATS: a format listed there as `pro` must be `live`
// (assertFormatsCoherent). The export panel's Theme row picks one of them.

// ships with the export themes
// The one switch for every line that talks about the themes (the plan lists,
// the homepage's export and showcase sections). While it is false, those lines
// read as the export panel works without themes.
export const EXPORT_THEMES_LIVE = true

// ships with the export themes
// The page shapes a theme can print at.
export const EXPORT_THEME_SHAPES = Object.freeze(['16:9', 'A4 landscape', 'A4'])

// ships with the export themes
// The four things every theme makes. `proOnly` marks an export that needs Pro in
// every theme; an export without it is free in the free themes only.
// `guidelinesPages` is the page count of the guidelines document. `inside` names
// the export that carries this one: the brand kit has no row of its own in the
// export panel and is zipped inside the HTML brand book.
export const EXPORT_THEME_EXPORTS = Object.freeze([
  Object.freeze({ id: 'brand-kit', name: 'Brand kit', short: 'kit', proOnly: true, inside: 'brand-book' }),
  Object.freeze({ id: 'brand-guidelines', name: 'Brand guidelines', short: 'guidelines', proOnly: true, guidelinesPages: 33 }),
  Object.freeze({ id: 'brand-book', name: 'HTML brand book', short: 'brand book', proOnly: true }),
  Object.freeze({ id: 'ui-kit', name: 'UI kit', short: 'UI kit', proOnly: false }),
])

// ships with the export themes
// `id` is the theme's folder name; `brand` is the sample brand its pages show;
// `tier` is who may export the UI kit in it ('free' or 'pro').
export const EXPORT_THEMES = Object.freeze([
  Object.freeze({ id: '01-presentation', name: 'Presentation', brand: 'Kerbside', tier: 'pro', shape: '16:9' }),
  Object.freeze({ id: '02-poster', name: 'Ticket', brand: 'Encore', tier: 'pro', shape: '16:9' }),
  Object.freeze({ id: '03-broadsheet', name: 'Broadsheet', brand: 'Saltbush', tier: 'pro', shape: '16:9' }),
  Object.freeze({ id: '04-standards', name: 'Standards', brand: 'Two Shores', tier: 'free', shape: 'A4 landscape' }),
  Object.freeze({ id: '05-specimen', name: 'Catalogue', brand: 'Margin', tier: 'pro', shape: 'A4' }),
  Object.freeze({ id: '06-studio', name: 'Studio', brand: 'Offcut', tier: 'pro', shape: 'A4' }),
  Object.freeze({ id: '07-spec', name: 'Specification', brand: 'Northern Current', tier: 'free', shape: 'A4' }),
  Object.freeze({ id: '08-monograph', name: 'Riso', brand: 'Long Room', tier: 'pro', shape: 'A4' }),
  Object.freeze({ id: '09-blueprint', name: 'Blueprint', brand: 'Plumbline', tier: 'pro', shape: 'A4' }),
  Object.freeze({ id: '10-inuse', name: 'In use', brand: 'Shallow End', tier: 'pro', shape: 'A4' }),
])

// ships with the export themes
export const freeThemes = () => EXPORT_THEMES.filter((t) => t.tier === 'free')

// ships with the export themes
export const proThemes = () => EXPORT_THEMES.filter((t) => t.tier === 'pro')

// ships with the export themes
export const themeById = (id) => EXPORT_THEMES.find((t) => t.id === id) || null

// ships with the export themes
// One export of one theme needs Pro unless it is not `proOnly` and the theme is free.
export const isThemeExportPro = (themeId, exportId) => {
  const theme = themeById(themeId)
  const made = EXPORT_THEME_EXPORTS.find((e) => e.id === exportId)
  if (!theme || !made) throw new Error(`unknown export theme or export: ${themeId} / ${exportId}`)
  return made.proOnly || theme.tier !== 'free'
}

// ships with the export themes
// The four exports of a theme, each with its own gate: [{ id, name, short, pro }].
export const themeExports = (themeId) =>
  EXPORT_THEME_EXPORTS.map((e) => ({ id: e.id, name: e.name, short: e.short, pro: isThemeExportPro(themeId, e.id) }))

// ships with the export themes
// The invariants the lists above rest on. Exported so a unit test can run it
// against the real data, and against a broken copy to see it refuse.
export function assertThemesCoherent(themes = EXPORT_THEMES, exportsList = EXPORT_THEME_EXPORTS) {
  const ids = themes.map((t) => t.id)
  if (new Set(ids).size !== ids.length) throw new Error('duplicate export theme id')
  const names = themes.map((t) => t.name)
  if (new Set(names).size !== names.length) throw new Error('duplicate export theme name')
  const badTier = themes.filter((t) => t.tier !== 'free' && t.tier !== 'pro')
  if (badTier.length) throw new Error(`export themes ${badTier.map((t) => t.id).join(', ')} have no tier`)
  const badShape = themes.filter((t) => !EXPORT_THEME_SHAPES.includes(t.shape))
  if (badShape.length) throw new Error(`export themes ${badShape.map((t) => t.id).join(', ')} have an unknown page shape`)
  const unbranded = themes.filter((t) => !t.name || !t.brand)
  if (unbranded.length) throw new Error(`export themes ${unbranded.map((t) => t.id).join(', ')} lack a name or sample brand`)
  const exportIds = exportsList.map((e) => e.id)
  if (new Set(exportIds).size !== exportIds.length) throw new Error('duplicate export theme export id')
  // A free theme exists to give away an export; with every export proOnly it would be a free label on a closed door.
  if (themes.some((t) => t.tier === 'free') && exportsList.every((e) => e.proOnly)) {
    throw new Error('export themes are marked free but every export needs Pro')
  }
  if (!themes.some((t) => t.tier === 'pro')) throw new Error('no Pro export theme: Pro would add no theme')
  return true
}
