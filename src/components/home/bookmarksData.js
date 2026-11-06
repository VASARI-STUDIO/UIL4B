import { LIVE_TOOLS, route } from '../spectrum/spectrumFacts'
import { BOOKMARK_FOLDERS } from './bookmarkFolders'

// DATA AND GEOMETRY FOR THE BOOKMARKS SECTION (`#bookmarks`). No React here, so
// the rules the tour and the lines depend on can be tested on their own.

// The thirteen tools, in window order: [tool id, glyph key, group]. The name and
// the link come from the tool tree, so a renamed or removed tool shows up here.
const TOOL_ROWS = [
  ['palette', 'palette', 0], ['semantic', 'semantic', 0], ['tint', 'tint', 0],
  ['gradient', 'gradient', 0], ['contrast', 'contrast', 0],
  ['font-gallery', 'gallery', 1], ['font-pair', 'pair', 1], ['type-scale', 'scale', 1],
  ['icons', 'icons', 2], ['emoji', 'emoji', 2],
  ['file-converter', 'convert', 3], ['ratio', 'ratio', 3], ['alt-text', 'alt', 3],
]

export const TOOLS = TOOL_ROWS.map(([id, key, group]) => {
  const live = LIVE_TOOLS.find((t) => t.id === id)
  if (!live) throw new Error(`bookmarks: "${id}" is not a live tool`)
  return { id, key, group, name: live.label, href: route(id) }
})

export const GROUPS = ['Colour', 'Type', 'Icons', 'Images']
export const DOT = ['#E07A5F', '#E9B949', '#98B98C', '#7088C6']
export const FAV = ['#9FB7C9', '#C9B79F', '#B7C99F', '#C99FB0', '#9FC9C0', '#C9C29F', '#B09FC9', '#C9A89F', '#9FC9A6', '#C99FC2', '#A69FC9', '#C9BD9F']

// Each folder's bookmarks as [title, tool index]. Names and counts come from
// bookmarkFolders.js (the proof bar quotes the same total); a test holds the
// two lists to the same length.
const ITEMS = [
  [['Palette generator', 0], ['Trending palettes', 0], ['UI colour roles', 1], ['Light and dark theme colours', 1], ['Tints and shades', 2], ['Colour scale maker', 2], ['Gradient generator', 3], ['CSS gradients', 3], ['Contrast checker', 4], ['Accessible colour pairs', 4]],
  [['Free font library', 5], ['Font previews', 5], ['Font pairings', 6], ['Heading and body pairs', 6], ['Type scale calculator', 7], ['Modular scale', 7]],
  [['Free SVG icons', 8], ['Icon search', 8], ['Emoji copy and paste', 9], ['Emoji search', 9]],
  [['PNG to WebP converter', 10], ['Image compressor', 10], ['Aspect ratio calculator', 11], ['Image resizer', 11], ['Alt text generator', 12], ['Image description writer', 12]],
]
export const FOLDERS = BOOKMARK_FOLDERS.map((f, i) => ({ name: f.name, count: f.count, items: ITEMS[i] }))

// ── timing (ms) ─────────────────────────────────────────────────────────────
export const STEP_MS = 3200 // run bar fill per folder: the tour's clock
export const DRAW_MS = 520 // a line drawing in
export const STAGGER = 20 // between lines drawing
export const FLOW0 = 640 // first travelling dash starts this far in
export const FLOW_STAGGER = 70 // between dashes, line by line
export const FLOW_TRAVEL = 1400
export const FLOW_REST = 2000
export const CYCLE_MS = STEP_MS * FOLDERS.length // 12 800
export const INTENT_MS = 80 // pointer intent before a folder opens
export const RESUME_MS = 1000 // after the pointer or focus leaves

// ── desktop geometry (px, inside the 640px stage) ───────────────────────────
export const STAGE_H = 640
export const MENU_TOP = 56
export const ROW0 = MENU_TOP + 68
export const ROW = 36
export const SUB_ROW = 32
export const SPAN = 198 // the lines run from the sub-menu (562) to the window (760)
// Stage y of each sidebar row's centre: title bar 44, sidebar from 52, group
// labels 22, rows 32, groups 8 apart.
export const TOOL_Y = [90, 122, 154, 186, 218, 280, 312, 344, 406, 438, 500, 532, 564]

export const groupOf = (j) => TOOLS[j].group
export const subTopOf = (i) =>
  Math.max(MENU_TOP, Math.min(STAGE_H - (14 + FOLDERS[i].items.length * SUB_ROW), ROW0 + i * ROW - 5))

/** Length of the S-curve from (0, a) to (SPAN, b), for the dash that draws it. */
export function curveLen(a, b) {
  let n = 0
  let px = 0
  let py = a
  for (let k = 1; k <= 32; k += 1) {
    const t = k / 32
    const u = 1 - t
    const x = (3 * u * u * t * SPAN) / 2 + (3 * u * t * t * SPAN) / 2 + t * t * t * SPAN
    const y = u * u * u * a + 3 * u * u * t * a + 3 * u * t * t * b + t * t * t * b
    n += Math.hypot(x - px, y - py)
    px = x
    py = y
  }
  return Math.ceil(n) + 2
}

/** The lines of every folder: bookmark row to the tool that replaces it. */
export const SETS = FOLDERS.map((folder, i) => {
  const top = subTopOf(i)
  return folder.items.map(([, j], k) => {
    const a = top + 7 + k * SUB_ROW + SUB_ROW / 2
    const b = TOOL_Y[j]
    const len = curveLen(a, b)
    return {
      d: `M0 ${a} C${SPAN / 2} ${a}, ${SPAN / 2} ${b}, ${SPAN} ${b}`,
      y0: a, y1: b, len, nlen: -len, j, k,
      stroke: DOT[groupOf(j)],
      delay: k * STAGGER,
      arrive: k * STAGGER + 300,
      flow: FLOW0 + k * FLOW_STAGGER,
    }
  })
})

/** Which of a tool's bookmarks are rows in its own folder. */
export const rowsOf = (j) =>
  FOLDERS[groupOf(j)].items.map((b, k) => (b[1] === j ? k : -1)).filter((k) => k >= 0)

/** The tool's bookmarks across all folders, for its hidden description. */
export const bookmarksOf = (j) => FOLDERS.flatMap((f) => f.items).filter((b) => b[1] === j).map((b) => b[0])

// ── the Kerbside sample ─────────────────────────────────────────────────────
export const luminance = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}
/** WCAG 2 contrast ratio of two #RRGGBB colours. */
export function contrastRatio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}
export const ASPHALT = '#1A1A1A'
export const WHITE = '#FFFFFF'
export const PALETTE = [
  { name: 'Signal', hex: '#FF5A1F', role: 'Action' },
  { name: 'Asphalt', hex: ASPHALT, role: 'Text' },
  { name: 'Concrete', hex: '#E6E4DE', role: 'Panel' },
  { name: 'White', hex: WHITE, role: 'Ground' },
].map((c) => ({ ...c, ink: contrastRatio(c.hex, ASPHALT) >= contrastRatio(c.hex, WHITE) ? ASPHALT : WHITE }))
export const CONTRAST_PAIR = { fg: ASPHALT, bg: PALETTE[0].hex }
export const CONTRAST = contrastRatio(CONTRAST_PAIR.fg, CONTRAST_PAIR.bg)
export const CONTRAST_TEXT = CONTRAST.toFixed(1)
export const PASSES_AA = CONTRAST >= 4.5
export const EMOJI = ['\u{1F6B2}', '\u{1F4E6}', '\u{1F4CD}', '\u{1F550}', '✅', '\u{1F69A}']
export const EMOJI_CODE = `U+${EMOJI[EMOJI.length - 1].codePointAt(0).toString(16).toUpperCase()}`
export const ALT_TEXT = 'Two riders waiting at a city intersection, one in an orange jacket'
export const TYPE_BASE = 15
export const TYPE_RATIO = 1.618
export const TYPE_SCALE = [3, 2, 1, 0].map((n) => Math.round(TYPE_BASE * TYPE_RATIO ** n))
