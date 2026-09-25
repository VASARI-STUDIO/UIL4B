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
//   live — the format is BUILT. Without it the panel shows "Soon" and disables
//          the button, for everyone, on every plan. Nobody can buy it.
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
  // The two Pro deliverables, listed first because they are the best things the
  // panel makes — and listed as a PAIR because that is the offer. They are not
  // the same document at two paper sizes: the book is an A4 portrait
  // SPECIFICATION an engineer implements from, and the guidelines are a 16:9
  // landscape PRESENTATION a brand is argued from. See the long note at the top
  // of utils/brandGuidelines.js for why the founder's reference material
  // (UI Examples/Brand kit examples) could not be served by extending the book.
  Object.freeze({ id: 'book', name: 'Design system book (PDF)', desc: 'A 12-page A4 manual — cover, contents, numbered sections, full-bleed colour specimens, the contrast matrix, type specimens and every token. Opens ready to save as PDF.', live: true, pro: true }),
  Object.freeze({ id: 'guidelines', name: 'Brand guidelines (presentation)', desc: 'A 16:9 landscape deck — cover, numbered sections, named swatches, alphabet grids, and your own logo on every brand ground with its clear-space rule. Opens ready to save as PDF.', live: true, pro: true, logo: true }),
  Object.freeze({ id: 'html', name: 'Style guide (HTML)', desc: 'A paginated A4 booklet — cover, palette with contrast evidence, and the type ladder. Prints to PDF from the browser.', live: true }),
  Object.freeze({ id: 'md', name: 'Style guide (Markdown)', desc: 'The same guide, importable straight into Notion or Google Docs.', live: true }),
  Object.freeze({ id: 'png', name: 'Style guide (PNG)', desc: 'A single A4 sheet at 2× — palette, contrast grades and the type ladder. For pasting into a deck or a handoff ticket.', live: true }),
  Object.freeze({ id: 'jpeg', name: 'Style guide (JPEG)', desc: 'The same sheet, smaller file — for anywhere that will not take a PNG.', live: true }),
  Object.freeze({ id: 'css', name: 'CSS tokens', desc: 'Custom properties for the palette and its tints, semantic colours and type — drop into any stylesheet.', live: true }),
  Object.freeze({ id: 'json', name: 'JSON tokens', desc: 'The same tokens in the W3C Design Tokens (DTCG) format, for token pipelines and tools that read it.', live: true }),
  Object.freeze({ id: 'tailwind', name: 'Tailwind theme', desc: 'A tailwind.config theme extension mapped to your system.' }),
  Object.freeze({ id: 'assets', name: 'Asset bundle', desc: 'Icons and swatches exported together as SVG + PNG.' }),
])

// Built, and available without paying.
export const freeFormats = () => EXPORT_FORMATS.filter((f) => f.live && !f.pro)

// Built, and gated. Everything a Pro subscription actually adds to the export
// offer — if this is ever empty, Pro sells nothing on export and the pricing
// page must stop saying it does.
export const proOnlyFormats = () => EXPORT_FORMATS.filter((f) => f.live && f.pro)

// Built, on either plan.
export const liveFormats = () => EXPORT_FORMATS.filter((f) => f.live)

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
  return true
}
