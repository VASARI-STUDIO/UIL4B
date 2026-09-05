// THE USER'S LOGO — the one thing a brand guidelines document needs that
// UIL4B has never held.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY THIS EXISTS
// ─────────────────────────────────────────────────────────────────────────────
// The founder's reference material for the premium export (UI Examples/Brand kit
// examples — DSC Labs, OpenPay, Hook) leans hard on logo pages: a mark page, the
// mark checked on light, dark and brand grounds, and a clear-space rule drawn
// with X measurements. UIL4B holds colour, type, scale and icons. It does not
// hold a logo, and there are exactly two honest ways to finish that sentence:
// generate the pages that DO follow from a real logo, or omit them and say so.
//
// The founder chose the first: let people upload one. So this module is the
// contract for that upload. Everything the guidelines document knows about a
// logo comes through here.
//
// ─────────────────────────────────────────────────────────────────────────────
// DECISION 1 — IT IS ALWAYS A BASE64 data: URI, AND IT IS ALWAYS RENDERED IN AN
// <img>. NEVER INLINED AS MARKUP.
// ─────────────────────────────────────────────────────────────────────────────
// An SVG is a document. Inlining an uploaded one into the exported HTML would
// let it carry <script>, an onload= handler, a <foreignObject>, or an external
// reference — and the export is OPENED IN A BROWSER (ExportPanel's printBook()
// puts it on a blob URL in a new window), so that markup would execute. It
// would also destroy the guarantee both existing export documents make at the
// top of their files: self-contained, no script, no network request but the
// user's own webfont.
//
// An <img> is a replaced element. Script inside its source does not run and
// external subresources are not fetched — that is the browser's rule, not ours,
// which is why it is the primary defence. sanitiseSvg() below is defence in
// depth behind it, not instead of it.
//
// Base64 rather than a raw utf8 data: URI for a second, duller reason: base64 is
// pure [A-Za-z0-9+/=], so the value can be dropped into an HTML attribute, a
// JSON field and a localStorage string without a single escaping question.
//
// ─────────────────────────────────────────────────────────────────────────────
// DECISION 2 — THE SIZE CAP IS 32 KB, AND IT IS A REAL CONSTRAINT, NOT TIDINESS
// ─────────────────────────────────────────────────────────────────────────────
// contexts/ProjectContext.jsx pushes the user's ENTIRE project list to ONE
// Firestore document (users/{uid}/sync/projects, as `{ list: [...] }`), and
// saveProject() deep-clones the whole design into each project. Firestore's hard
// document limit is 1 MiB, and that push is wrapped in a catch that swallows
// failures — so a logo that is merely "a bit big" does not error, it silently
// stops the user's projects syncing between devices.
//
// A Pro account has no project cap. 32 KB × 30 projects is under a megabyte;
// 128 KB × 30 is not. So the cap is set where the arithmetic still works at the
// far end of the plan, and it is stated to the user BEFORE they choose a file
// (see components/BrandLogoField.jsx) rather than sprung on them as an error —
// the Deel "Custom branding" reading, below.
//
// Flat logo art compresses far below this: an SVG wordmark is 2-20 KB and a
// 512px flat-colour PNG is typically 8-20 KB. A photograph is not a logo and
// will not fit, which is the correct outcome.
//
// ─────────────────────────────────────────────────────────────────────────────
// MOBBIN, and which screen drove which decision
// ─────────────────────────────────────────────────────────────────────────────
//   • Deel, "Custom branding" — the accepted formats and the maximum file size
//     are printed UNDER the drop zone, before anything is chosen, and an
//     accepted file becomes a named row with its filename and a delete control.
//     That drove ACCEPT_LABEL / MAX_BYTES being exported for the UI to state up
//     front, and describeLogo() returning the filename to show back.
//     https://mobbin.com/screens/a60bceec-975d-4a91-bffd-70cda485c249
//   • Flodesk, "Logo" — "We recommend a .PNG file with transparency to ensure it
//     looks great on all backgrounds", i.e. the guidance is about what the
//     DOCUMENT will do with the file. This document puts the mark on paper, on
//     ink and on every brand colour, so the recommendation here names
//     transparency and SVG for that reason and says which pages depend on it.
//     https://mobbin.com/screens/0476c289-8250-4418-88b3-c07e4bc462e0
//
// DOM-free and React-free on purpose, exactly like utils/brandKitGuide.js and
// utils/userHome.js: the validation is the thing the feature is judged on, so it
// must be testable without a browser. The one part that genuinely needs a canvas
// — downscaling a raster until it fits — lives in the component, and hands its
// result back through readLogo() like anything else.

/** The largest stored logo, in bytes of data: URI. See DECISION 2. */
export const MAX_LOGO_BYTES = 32 * 1024

/** What the file picker takes, and what the UI prints under it. */
export const ACCEPT_TYPES = Object.freeze(['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp'])
export const ACCEPT_ATTR = '.svg,.png,.jpg,.jpeg,.webp'
export const ACCEPT_LABEL = 'SVG, PNG, JPG or WebP'
/** Human form of MAX_LOGO_BYTES, so the UI cannot state a different number. */
export const MAX_LOGO_LABEL = `${Math.round(MAX_LOGO_BYTES / 1024)} KB`

/**
 * The longest edge a raster logo is stored at, and the ladder the uploader steps
 * down when the first attempt will not fit under the cap.
 *
 * 512 first because the document places a mark at roughly 90mm wide on a 297mm
 * page — 512px across 90mm is about 145 dpi, which prints acceptably and is
 * indistinguishable on screen. Below 128 a wordmark stops being readable, so the
 * ladder ends rather than continuing into something not worth storing.
 */
export const RASTER_STEPS = Object.freeze([512, 384, 288, 224, 160, 128])

/** Pages of the guidelines document that exist ONLY when a logo is present.
 *  Named here so the export, the closing "not covered" page and the upload
 *  control cannot describe a different set. */
export const LOGO_DEPENDENT_PAGES = Object.freeze(['the mark', 'the mark on light, dark and brand grounds', 'the clear-space rule'])

const DATA_URI = /^data:(image\/(?:svg\+xml|png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/

/**
 * Markup an uploaded SVG must not contain.
 *
 * DEFENCE IN DEPTH, not the defence. The mark is always rendered in an <img>
 * (see DECISION 1), which is what actually stops any of this running. This
 * refuses the file anyway, because a stored artefact that someone later inlines
 * — in a feature not yet written — should never have been storable, and because
 * an SVG carrying a script tag is not a logo and the user should be told so
 * while they still have the original open.
 */
const SVG_HAZARDS = [
  [/<\s*script/i, 'a <script> tag'],
  [/<\s*foreignObject/i, 'a <foreignObject>'],
  [/\son[a-z]+\s*=/i, 'an inline event handler'],
  [/<\s*(?:iframe|embed|object)\b/i, 'an embedded document'],
  // An external reference would make the document phone out when opened, which
  // breaks the self-contained guarantee even when it is not hostile.
  [/(?:xlink:)?href\s*=\s*["']\s*(?!#|data:)[a-z]*:?\/\//i, 'a link to an external file'],
]

/**
 * Is this SVG source safe to store? Returns null when it is, or the reason when
 * it is not — phrased for the person holding the file.
 */
export function sanitiseSvg(source) {
  const src = String(source ?? '')
  if (!/<\s*svg[\s>]/i.test(src)) return 'That file does not look like an SVG.'
  for (const [pattern, what] of SVG_HAZARDS) {
    if (pattern.test(src)) {
      return `That SVG contains ${what}, so it is not stored. Export it again from your design tool as plain artwork.`
    }
  }
  return null
}

/**
 * The intrinsic size of an SVG, from its own attributes.
 *
 * Read HERE rather than in the browser because an SVG with only a viewBox has no
 * naturalWidth in every engine, and the clear-space page needs a real aspect
 * ratio to draw against — a mark boxed at the wrong proportion is worse than no
 * page. viewBox wins over width/height: it is the coordinate system the artwork
 * is actually drawn in, and width/height are frequently a stale export setting.
 *
 * Returns null when neither is present, and the caller then has no clear-space
 * page rather than a guessed one.
 */
export function svgIntrinsicSize(source) {
  const src = String(source ?? '')
  const viewBox = /viewBox\s*=\s*["']\s*([-\d.eE]+)[\s,]+([-\d.eE]+)[\s,]+([-\d.eE]+)[\s,]+([-\d.eE]+)/.exec(src)
  if (viewBox) {
    const w = Number(viewBox[3])
    const h = Number(viewBox[4])
    if (w > 0 && h > 0) return { width: w, height: h }
  }
  const attr = (name) => {
    const m = new RegExp(`<svg[^>]*?\\s${name}\\s*=\\s*["']([\\d.]+)`, 'i').exec(src)
    return m ? Number(m[1]) : 0
  }
  const w = attr('width')
  const h = attr('height')
  return w > 0 && h > 0 ? { width: w, height: h } : null
}

/** The byte length of a data: URI. Base64 is ASCII, so this is its length. */
export const logoBytes = (src) => (typeof src === 'string' ? src.length : 0)

/**
 * Read whatever is in `design.logo` and return either a usable logo or null.
 *
 * EVERY FIELD IS TREATED AS UNTRUSTED, for the same reason readBook() does it:
 * saved designs come from many versions of the product and from a localStorage
 * blob anyone can edit. A malformed logo must produce a document with no logo
 * pages — never a broken <img>, never a page of "undefined", and never an
 * attribute injection, which is why the src has to match DATA_URI exactly rather
 * than merely start with "data:".
 */
export function readLogo(design) {
  const raw = design?.logo
  if (!raw || typeof raw !== 'object') return null

  const src = typeof raw.src === 'string' ? raw.src : ''
  const match = DATA_URI.exec(src)
  if (!match) return null
  if (logoBytes(src) > MAX_LOGO_BYTES) return null

  const width = Number(raw.width)
  const height = Number(raw.height)
  const ok = Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0
  // A square assumption would draw the clear-space box at the wrong proportion,
  // so a logo with no usable size keeps its mark page and loses only the page
  // that needs the geometry. aspect === null is how the export is told.
  const aspect = ok ? width / height : null

  const name = typeof raw.name === 'string' ? raw.name.slice(0, 120) : ''
  return {
    src,
    type: match[1],
    width: ok ? width : null,
    height: ok ? height : null,
    aspect,
    name,
    bytes: logoBytes(src),
  }
}

/** "logo.svg · SVG · 512 × 128 · 14 KB", for the upload control to show back. */
export function describeLogo(logo) {
  if (!logo) return ''
  const kind = logo.type === 'image/svg+xml' ? 'SVG' : logo.type.replace('image/', '').toUpperCase()
  const size = logo.width && logo.height ? `${Math.round(logo.width)} × ${Math.round(logo.height)}` : null
  const kb = `${Math.max(1, Math.round(logo.bytes / 1024))} KB`
  return [logo.name || 'Your logo', kind, size, kb].filter(Boolean).join(' · ')
}

/**
 * The clear-space rule the document draws, in the mark's own units.
 *
 * WHAT IS AND IS NOT BEING CLAIMED HERE, because this is the one page in the
 * document that states a rule rather than reporting a measurement. The brand has
 * not decided its clear space — UIL4B has no way to know that it has. What the
 * DOCUMENT does is set one, using the ordinary convention that X is a fixed
 * proportion of the mark's height, and the page says in as many words that this
 * is the document's default rather than a decision the brand already made.
 *
 * Half the mark's height is the convention chosen: it is generous enough to hold
 * on a crowded page and it is trivially re-measurable by anyone checking the
 * artwork, which a rule derived from some internal letterform would not be.
 *
 * Returns null with no aspect ratio — the page is omitted rather than drawn to a
 * guessed proportion.
 */
export const CLEAR_SPACE_RATIO = 0.5

export function clearSpace(logo, markHeightMm = 26) {
  if (!logo || !logo.aspect) return null
  const height = markHeightMm
  const width = height * logo.aspect
  const x = height * CLEAR_SPACE_RATIO
  return {
    x,
    markWidth: width,
    markHeight: height,
    boxWidth: width + x * 2,
    boxHeight: height + x * 2,
    ratio: CLEAR_SPACE_RATIO,
  }
}
