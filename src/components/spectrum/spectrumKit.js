// THE BENCH AND EXPORTS DATA, PORTED FROM "UIL4B - Spectrum.dc.html".
//
// Plain data and the design's own colour maths, in a plain module so the two
// components that share them (SpectrumBench and SpectrumExports) read ONE copy,
// and so `node --test` can import it. Every table here is the design's, line
// for line; where the design states something the product cannot back, the
// value is changed and the reason is written beside it.

import { INPUT_FORMATS, OUTPUT_FORMATS } from '../../utils/meshFormats.js'
import { PH_REGULAR } from './phosphorRegular.js'

/* ── colour maths (the design's own functions) ─────────────────────────────── */

export function oklchToHex(L, C, hDeg) {
  const h = (hDeg * Math.PI) / 180
  const a = Math.cos(h) * C
  const bb = Math.sin(h) * C
  const l_ = L + 0.3963377774 * a + 0.2158037573 * bb
  const m_ = L - 0.1055613458 * a - 0.0638541728 * bb
  const s_ = L - 0.0894841775 * a - 1.291485548 * bb
  const l = l_ * l_ * l_
  const m = m_ * m_ * m_
  const s = s_ * s_ * s_
  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
  const b2 = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
  const enc = (u) => {
    const v = u <= 0.0031308 ? 12.92 * u : 1.055 * Math.pow(Math.max(u, 0), 1 / 2.4) - 0.055
    const c = Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16)
    return c.length === 1 ? `0${c}` : c
  }
  return `#${enc(r)}${enc(g)}${enc(b2)}`.toUpperCase()
}

const srgb = (v) => {
  const c = v / 255
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}
function lum(hex) {
  const n = parseInt(hex.slice(1), 16)
  return 0.2126 * srgb((n >> 16) & 255) + 0.7152 * srgb((n >> 8) & 255) + 0.0722 * srgb(n & 255)
}
export function ratio(a, b) {
  const la = lum(a)
  const lb = lum(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}
/** The design's `inkOn`: near-black or near-white, whichever reads, and pure
 *  black/white if neither reaches 4.5. */
export function inkOn(bgHex) {
  const dark = '#0B0C0E'
  const pale = '#F4F7FF'
  const cd = ratio(bgHex, dark)
  const cp = ratio(bgHex, pale)
  if (Math.max(cd, cp) < 4.5) return ratio(bgHex, '#000000') >= ratio(bgHex, '#FFFFFF') ? '#000000' : '#FFFFFF'
  return cd >= cp ? dark : pale
}

/* ── the palette seeds ─────────────────────────────────────────────────────── */

export const BASES = [
  { label: 'Cobalt', h: 258, c: 0.148 },
  { label: 'Cyan', h: 196, c: 0.092 },
  { label: 'Moss', h: 150, c: 0.088 },
  { label: 'Amber', h: 80, c: 0.128 },
  { label: 'Signal', h: 28, c: 0.152 },
  { label: 'Fuchsia', h: 348, c: 0.142 },
].map((b) => ({ ...b, color: oklchToHex(0.62, b.c, b.h) }))

export const STEP_LABELS = ['50', '100', '200', '300', '400', '500', '600', '700', '800']
export const LIGHTS = [0.97, 0.93, 0.86, 0.77, 0.68, 0.58, 0.47, 0.35, 0.23]
export const HARMONIES = [['Mono', [0]], ['Analogous', [-34, 34]], ['Complement', [180]], ['Triad', [120, 240]]]
export const FORMATS = ['HEX', 'OKLCH', 'CSS VAR']

export const slugOf = (base) => base.label.toLowerCase().replace(/[^a-z]/g, '')

/** The nine-step ramp off a seed, as the design builds it. Each step is graded
 *  against the ink that reads on it (`inkOn`), so the verdict says what the
 *  swatch's own "Aa" scores: AAA from 7:1, AA from 4.5:1, otherwise Fails. */
export function rampOf(base) {
  return LIGHTS.map((L, i) => {
    const c = base.c * (1 - Math.abs(i - 4) / 9)
    const hex = oklchToHex(L, c, base.h)
    const ink = inkOn(hex)
    // Graded on the one-decimal figure the row prints, so a label never contradicts its number.
    const cr = Math.round(ratio(hex, ink) * 10) / 10
    return { step: STEP_LABELS[i], L, c, hex, ink, cr, aa: cr >= 7 ? 'AAA' : cr >= 4.5 ? 'AA' : 'Fails' }
  })
}

/** AAA from 7:1, AA from 4.5:1, otherwise Fails. */
export const verdictOf = (cr) => (cr >= 7 ? 'AAA' : cr >= 4.5 ? 'AA' : 'Fails')

/** The ramp steps the Contrast demo opens on (foreground, background); the site map's
 *  Contrast thumb draws the same pair. */
export const CONTRAST_START = [1, 7]

/** The Type Scale demo: the ratios it offers, the one it opens on, and its base size in px.
 *  The site map's Type Scale thumb draws the same scale. */
export const SCALE_RATIOS = [1.2, 1.25, 1.333]
export const SCALE_RATIO_START = 1
export const SCALE_BASE_PX = 16

/** The site's display face, named in its own type on the Font Gallery thumb. It names the
 *  `--display` face in global.css, which has no script-side source. */
export const DISPLAY_FACE = 'Switzer'

/** The five named roles: seed + harmony decide the hues, and each role carries
 *  its contrast partner. */
export function rolesOf(base, harmony, fmt) {
  const slug = slugOf(base)
  const stop = (i) => ({ L: LIGHTS[i], c: base.c * (1 - Math.abs(i - 4) / 9), h: base.h })
  const hOffs = HARMONIES[harmony][1].filter((o) => o !== 0)
  const sib = (off) => ({ L: 0.62, c: base.c, h: (base.h + off + 360) % 360 })
  const surfSpec = stop(8)
  const inkSpec = stop(1)
  const surfHex = oklchToHex(surfSpec.L, surfSpec.c, surfSpec.h)
  const inkHex = oklchToHex(inkSpec.L, inkSpec.c, inkSpec.h)
  return [
    ['Primary', stop(4), 'Buttons, links, active state', '1 / -1'],
    ['Secondary', hOffs.length ? sib(hOffs[0]) : stop(6), 'Second-rank actions and charts'],
    ['Accent', hOffs.length > 1 ? sib(hOffs[1]) : stop(2), 'Badges, highlights, focus rings'],
    ['Surface', surfSpec, 'Page and card grounds'],
    ['Ink', inkSpec, 'Body copy on the surface'],
  ].map(([name, spec, use, span]) => {
    const hex = oklchToHex(spec.L, spec.c, spec.h)
    const value = fmt === 1
      ? `oklch(${spec.L.toFixed(2)} ${spec.c.toFixed(3)} ${Math.round(spec.h)})`
      : fmt === 2 ? `--${slug}-${name.toLowerCase()}` : hex
    const cr = name === 'Surface' ? ratio(hex, inkHex) : name === 'Ink' ? ratio(hex, surfHex) : ratio(hex, inkOn(hex))
    return { name, use, hex, value, ink: inkOn(hex), span: span || 'auto', aa: `${cr >= 4.5 ? 'AA' : 'Fails'} ${cr.toFixed(1)}` }
  })
}

/* ── the icon panel ────────────────────────────────────────────────────────── */

export const ICONS = [
  ['palette', 'Palette'], ['swatches', 'Swatches'], ['eyedropper', 'Eyedropper'],
  ['drop-half', 'Tint'], ['gradient', 'Gradient'], ['circles-three', 'Harmonies'],
  ['text-aa', 'Type scale'], ['text-t', 'Font'], ['ruler', 'Measure'],
  ['grid-four', 'Grid'], ['frame-corners', 'Aspect ratio'], ['crop', 'Crop'],
  ['image', 'Image'], ['film-strip', 'Video frame'], ['file-image', 'Export image'],
  ['sliders', 'Controls'], ['magic-wand', 'Generate'], ['selection', 'Selection'],
  ['code', 'Code'], ['brackets-curly', 'JSON'], ['export', 'Export'],
  ['download-simple', 'Download'], ['copy', 'Copy'], ['check-square', 'Contrast pass'],
]
export const GLYPHS = ICONS.slice(0, 12)
export const ICON_FORMATS = ['SVG', 'JSX', 'Sprite']
export const ICON_WEIGHTS = [['Thin', 'thin'], ['Light', 'light'], ['Regular', 'regular'], ['Bold', 'bold'], ['Fill', 'fill']]
export const ICON_SIZES = [16, 20, 24, 32]

/** What "Copy SVG" puts on the clipboard. SVG is a complete, standalone file;
 *  JSX is the Phosphor React call the design shows; Sprite is a real <symbol>
 *  plus the <use> that draws it. */
export const pascalOf = (slug) => slug.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join('')

export function iconSnippet({ slug, weight, size, fmt, body }) {
  if (fmt === 1) {
    return `<${pascalOf(slug)} size={${size}} weight="${weight}" />`
  }
  if (fmt === 2) {
    const id = `ph-${slug}-${weight}`
    return `<symbol id="${id}" viewBox="0 0 256 256" fill="currentColor">${body}</symbol>\n<svg width="${size}" height="${size}"><use href="#${id}" /></svg>`
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 256 256" fill="currentColor">${body}</svg>`
}

/* ── the font panel ────────────────────────────────────────────────────────── */

// [name, family stack, category, credit, styles, axes]. Self-hosted under
// /fonts (see the @font-face block in spectrum.css).
export const FONTS = [
  ['Schibsted Grotesk', "'Schibsted Grotesk','Geist',sans-serif", 'SANS', '18 styles', 'Variable: weight, italic', 'Literata', "'Literata',serif"],
  ['Literata', "'Literata',serif", 'SERIF', '24 styles', 'Variable: weight, optical size, italic', 'Instrument Sans', "'Instrument Sans','Geist',sans-serif"],
  ['Martian Mono', "'Martian Mono','Geist Mono',monospace", 'MONO', '16 styles', 'Variable: width, weight', 'Hanken Grotesk', "'Hanken Grotesk','Geist',sans-serif"],
  ['Big Shoulders Display', "'Big Shoulders Display','Geist',sans-serif", 'DISPLAY', '18 styles', 'Variable: weight', 'Hanken Grotesk', "'Hanken Grotesk','Geist',sans-serif"],
  ['Hanken Grotesk', "'Hanken Grotesk','Geist',sans-serif", 'SANS', '18 styles', 'Variable: weight, italic', 'Martian Mono', "'Martian Mono','Geist Mono',monospace"],
  ['Instrument Sans', "'Instrument Sans','Geist',sans-serif", 'SANS', '8 styles', 'Variable: width, weight, italic', 'Literata', "'Literata',serif"],
].map(([name, family, cat, styles, axes, pair, pairFamily]) => ({ name, family, cat, styles, axes, pair, pairFamily }))
export const FONT_CATS = ['All', 'Sans', 'Serif', 'Mono', 'Display']
export const FONT_SAMPLE = 'The quick brown fox jumps over the lazy dog. 0123456789 $€ &@?!'

/* ── the converter panel ───────────────────────────────────────────────────── */

// [id, label, icon, short label]. The panel branches on the id, never the
// index. The short label is drawn when the panel is too narrow for four full
// labels; it is always contained in the full one, which stays the tab's name.
// Aspect ratio has no glyph: the design asks for `ph-aspect-ratio`, which
// Phosphor does not have, so the design's tab renders an empty, zero-width slot.
export const IMG_MODES = [
  ['compress', 'Compress', 'archive', null],
  ['model', '3D model', 'cube', null],
  ['frames', 'Video frames', 'film-strip', 'Frames'],
  ['ratio', 'Aspect ratio', null, 'Ratio'],
]
// The 3D tab's output row: the formats the 3D Model Converter really writes,
// read off its own table and kept to these four, in this order.
const MODEL_OUTPUT_IDS = ['glb', 'obj', 'stl', 'usdz']
export const MODEL_OUTPUTS = MODEL_OUTPUT_IDS
  .map((id) => OUTPUT_FORMATS.find((f) => f.id === id))
  .filter(Boolean)
  .map((f) => ({ id: f.id, label: f.label, metres: f.unit === 'm' }))
// The sample model's input format and its unit, from the same table.
export const MODEL_SOURCE = INPUT_FORMATS.find((f) => f.id === 'step')
/** The pre-rendered turntable of the sample part (scripts/model-turntable.mjs). */
export const MODEL_PREVIEW = { loop: '/spectrum/model-turn.webp', poster: '/spectrum/model-poster.webp', width: 1280, height: 720 }
export const IMG_FORMATS = [['WEBP', 'image/webp'], ['JPEG', 'image/jpeg'], ['PNG', 'image/png']]
export const RATIO_PRESETS = [['16:9', 1920, 1080], ['4:5', 1080, 1350], ['1:1', 1080, 1080], ['21:9', 2560, 1097]]
export const FRAME_COUNTS = [8, 12, 24]
/** The design's photograph, re-encoded to WebP for the panel. */
export const CONVERTER_SOURCE = '/spectrum/tasmanian-sunset.webp'

export function formatBytes(n) {
  if (n == null) return '…'
  return n < 1048576 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1048576).toFixed(2)} MB`
}

/* ── the exports stack ─────────────────────────────────────────────────────── */

export const EX_PIECES = ['Palette', 'Type scale', 'Compressed files', 'Icons']
// The design's four sample files and its measured before/after sizes (KB).
export const EX_FILES = [
  ['image', 'hero-plateau.png', 4944, 263],
  ['image', 'card-ridge.png', 1820, 108],
  ['file-image', 'logo-mark.png', 74, 11],
  ['film-strip', 'loop-cover.png', 2410, 171],
]
export const EX_FMTS = [['CSS', '.css'], ['Tailwind', '.js'], ['JSON', '.json']]
export const TYPE_STEPS = [['display', '3.052rem'], ['h1', '2.441rem'], ['h2', '1.953rem'], ['h3', '1.563rem'], ['body', '1rem'], ['small', '0.8rem']]
export const KIT_PAGES = ['Colour', 'Typography', 'Foundations', 'Files']
export const KIT_FILES = [
  ['CSS custom properties', 'Ready-to-use design variables, .css'],
  ['Design tokens', 'Token map and export metadata, .json'],
  ['The complete UI kit', 'Standalone, fonts included, .html'],
  ['Selected font styles', 'Offline font-face rules and licences, .css'],
]
// The design's three example projects. The per-project export count it shows
// ("12 exports") is dropped: a project records no exports in this product.
export const PROJECTS = [
  ['Northbeam, marketing site', 'Opened 2 hours ago', 'Colour, type, icons'],
  ['Halcyon app, dark theme', 'Opened yesterday', 'Colour, type'],
  ['Ferrule, brand refresh', 'Opened last week', 'Colour, icons, imagery'],
]


// The exported UI kit's five colour roles, in the kit's own order, with the text
// the kit prints under each. A copy of SLOT_COPY / SLOT_ORDER in
// utils/uiKitExport.js, kept here because importing that module would pull the
// colour and token code into the home chunk; tests/unit/spectrum-kit-roles.test.js
// fails if the two differ. `at` is the ramp step the picture fills the role with.
export const KIT_ROLES = [
  { id: 'citron', role: 'Signature accent', at: 4 },
  { id: 'pine', role: 'Primary brand', at: 7 },
  { id: 'lilac', role: 'Supporting colour', at: 2 },
  { id: 'chalk', role: 'Canvas', at: 0 },
  { id: 'ink', role: 'Text and detail', at: 8 },
]

/** The sample files' total after compression, in KB (the file bar's size). */
export const EX_FILES_AFTER_KB = EX_FILES.reduce((sum, f) => sum + f[3], 0)

/** What each type-scale row prints: the step's name, and its size in px. */
export const TYPE_LABELS = { display: 'Display', h1: 'Heading 1', h2: 'Heading 2', h3: 'Heading 3', body: 'Body', small: 'Small' }
export const remPx = (value) => Math.round(parseFloat(value) * 16)

const exRowsOf = (piece, ramp) => (
  piece === 0
    ? ramp.map((r) => [`color-${r.step}`, r.hex])
    : TYPE_STEPS.map((t) => [`text-${t[0]}`, t[1]])
)

/** The Phosphor name of the file bar's glyph. Only names phosphorRegular.js
 *  ships: it has no file-svg or file-code, so code files take `code` and SVG
 *  files `file-image`. */
export function exFileIcon(piece, fmt) {
  if (piece === 0) return ['file-css', 'code', 'brackets-curly'][fmt]
  if (piece === 1) return 'text-aa'
  if (piece === 2) return 'file-zip'
  return ['file-image', 'code', 'file-image'][fmt]
}

/** The twelve icons as the three files the Icons piece copies. Every body is the
 *  real Phosphor path from phosphorRegular.js, the same data the Icon library
 *  window copies from. */
function iconFileText(fmt) {
  const parts = GLYPHS.map(([slug]) => ({ slug, weight: 'regular', size: 24, body: PH_REGULAR[slug] }))
  if (fmt === 0) return parts.map((p) => iconSnippet({ ...p, fmt: 0 })).join('\n')
  if (fmt === 1) {
    const names = GLYPHS.map(([slug]) => pascalOf(slug))
    return `import { ${names.join(', ')} } from '@phosphor-icons/react'\n\n${parts.map((p) => iconSnippet({ ...p, fmt: 1 })).join('\n')}`
  }
  const symbols = parts.map((p) => `<symbol id="ph-${p.slug}-regular" viewBox="0 0 256 256" fill="currentColor">${p.body}</symbol>`)
  return `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">\n${symbols.join('\n')}\n</svg>`
}

const ICON_FILE_NAMES = ['icons.svg', 'Icons.jsx', 'icons-sprite.svg']

/** The file the card shows and "Copy file" copies for a piece. Palette and Type
 *  scale are CSS / Tailwind / JSON of real values; Icons is real SVG, JSX or a
 *  sprite. Compressed files has nothing to copy (its text is empty and the card
 *  links to the File Converter instead); its size is the sum of the example
 *  "after" sizes. */
export function exFileOf(piece, fmt, base) {
  if (piece === 2) {
    return { text: '', name: 'compressed-images.zip', kb: formatBytes(EX_FILES_AFTER_KB * 1024) }
  }
  if (piece === 3) {
    const text = iconFileText(fmt)
    return { text, name: ICON_FILE_NAMES[fmt], kb: `${(text.length / 1024).toFixed(1)} KB` }
  }
  const rows = exRowsOf(piece, rampOf(base))
  const widest = rows.reduce((w, r) => Math.max(w, r[0].length), 0)
  const text = fmt === 0
    ? `:root {\n${rows.map((r) => `  --${r[0]}:${' '.repeat(widest - r[0].length + 2)}${r[1]};`).join('\n')}\n}`
    : fmt === 1
      ? `module.exports = {\n  theme: {\n${rows.map((r) => `    "${r[0]}": "${r[1]}",`).join('\n')}\n  }\n}`
      : `{\n${rows.map((r) => `  "${r[0]}": { "$value": "${r[1]}" }`).join(',\n')}\n}`
  const name = `${slugOf(base)}-${['palette', 'type'][piece]}${EX_FMTS[fmt][1]}`
  return { text, name, kb: `${(text.length / 1024).toFixed(1)} KB` }
}
