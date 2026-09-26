// THE BENCH AND EXPORTS DATA, PORTED FROM "UIL4B - Spectrum.dc.html".
//
// Plain data and the design's own colour maths, in a plain module so the two
// components that share them (SpectrumBench and SpectrumExports) read ONE copy,
// and so `node --test` can import it. Every table here is the design's, line
// for line; where the design states something the product cannot back, the
// value is changed and the reason is written beside it.

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

/** The nine-step ramp off a seed, as the design builds it. */
export function rampOf(base) {
  return LIGHTS.map((L, i) => {
    const c = base.c * (1 - Math.abs(i - 4) / 9)
    const hex = oklchToHex(L, c, base.h)
    return { step: STEP_LABELS[i], L, c, hex, aa: ratio(hex, '#0B0C0E') >= 4.5 ? 'AA' : 'LOW' }
  })
}

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
    return { name, use, hex, value, ink: inkOn(hex), span: span || 'auto', aa: `${cr >= 4.5 ? 'AA' : 'LOW'} ${cr.toFixed(1)}` }
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
export const ICON_FORMATS = ['SVG', 'JSX', 'SPRITE']
export const ICON_WEIGHTS = [['Thin', 'thin'], ['Light', 'light'], ['Regular', 'regular'], ['Bold', 'bold'], ['Fill', 'fill']]
export const ICON_SIZES = [16, 20, 24, 32]

/** What "Copy SVG" puts on the clipboard. SVG is a complete, standalone file;
 *  JSX is the Phosphor React call the design shows; SPRITE is a real <symbol>
 *  plus the <use> that draws it. */
export function iconSnippet({ slug, weight, size, fmt, body }) {
  if (fmt === 1) {
    const pascal = slug.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join('')
    return `<${pascal} size={${size}} weight="${weight}" />`
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
export const FONT_SAMPLE = 'The quick brown fox jumps over the lazy dog. 0123456789 £$€ &@?!'

/* ── the converter panel ───────────────────────────────────────────────────── */

// Aspect ratio has no glyph: the design asks for `ph-aspect-ratio`, which
// Phosphor does not have, so the design's tab renders an empty, zero-width slot.
export const IMG_MODES = [['Convert', 'file-arrow-up'], ['Compress', 'archive'], ['Video frames', 'film-strip'], ['Aspect ratio', null]]
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

const exRowsOf = (piece, ramp) => {
  if (piece === 0) return ramp.map((r) => [`color-${r.step}`, r.hex])
  if (piece === 1) return TYPE_STEPS.map((t) => [`text-${t[0]}`, t[1]])
  if (piece === 2) return EX_FILES.map((f) => [f[1].replace(/\.png$/, ''), `${f[3]}kb`])
  return GLYPHS.map((g) => [`icon-${g[1].toLowerCase().replace(/ /g, '-')}`, g[0]])
}

/** The file card 1 copies: the design's CSS / Tailwind / JSON text for the
 *  chosen piece, and the name and size it would carry. */
export function exFileOf(piece, fmt, base) {
  const rows = exRowsOf(piece, rampOf(base))
  const widest = rows.reduce((w, r) => Math.max(w, r[0].length), 0)
  const text = fmt === 0
    ? `:root {\n${rows.map((r) => `  --${r[0]}:${' '.repeat(widest - r[0].length + 2)}${r[1]};`).join('\n')}\n}`
    : fmt === 1
      ? `module.exports = {\n  theme: {\n${rows.map((r) => `    "${r[0]}": "${r[1]}",`).join('\n')}\n  }\n}`
      : `{\n${rows.map((r) => `  "${r[0]}": { "$value": "${r[1]}" },`).join('\n')}\n}`
  const slug = slugOf(base)
  const name = piece === 2 ? `${slug}-assets.zip` : piece === 3 ? `${slug}-icons.zip` : `${slug}-${['palette', 'type'][piece]}${EX_FMTS[fmt][1]}`
  return { text, name, kb: `${(text.length / 1024).toFixed(1)} KB` }
}
