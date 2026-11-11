// Card 1's content, Card 3's projects and the docking maths for the homepage exports
// section. Plain functions, so a unit test can run them without a browser.

import { formatBytes } from '../spectrum/spectrumKit.js'

/* ── docking ──────────────────────────────────────────────────────────────── */

// The cards stack only in a window at least this wide and tall (the media query in
// home-exports.css says the same); anywhere smaller they scroll as a plain column.
export const STACK_MIN_WIDTH = 1024
export const STACK_MIN_HEIGHT = 560

export const stacks = (width, height) => width >= STACK_MIN_WIDTH && height >= STACK_MIN_HEIGHT

/**
 * Where a card docks, in px from the top of the screen: the `top` the stylesheet
 * computed for it, so the trackers and the CSS agree. Null when the cards are a column.
 */
export function dockTop({ width, height, top }) {
  if (!stacks(width, height)) return null
  const n = parseFloat(top)
  return Number.isFinite(n) ? n : null
}

/* ── card 1 ───────────────────────────────────────────────────────────────── */

export const RATIO = 1.333
export const PIECES = Object.freeze([
  { id: 'palette', name: 'Palette', short: 'Palette', tag: 'CSS, Tailwind, JSON', shortTag: 'CSS, Tailwind, JSON' },
  { id: 'type', name: 'Type scale', short: 'Type scale', tag: 'CSS, Tailwind, JSON', shortTag: 'CSS, Tailwind, JSON' },
  { id: 'images', name: 'Compressed images', short: 'Images', tag: 'JPEG or PNG in, WebP out', shortTag: 'WebP out' },
  { id: 'icons', name: 'Icons', short: 'Icons', tag: 'SVG', shortTag: 'SVG' },
])
export const TOKEN_FORMATS = Object.freeze([['CSS', 'css'], ['Tailwind', 'js'], ['JSON', 'json']])

const LEADS = ['Booked', 'Booked', 'Booked by', 'Booked by ten.']
const BODY_LINE = 'Booked by ten. There by twelve.'
const STEPS = [['display', 5], ['h1', 4], ['h2', 3], ['h3', 2], ['body', 0], ['small', -1]]

/** The six type-scale rows. The first four show a lead word so the big sizes stay inside the card. */
export function typeSteps() {
  return STEPS.map(([name, e], i) => {
    const scale = RATIO ** e
    const display = i < 4
    const line = display ? LEADS[i] : BODY_LINE
    return {
      name,
      line,
      display,
      rem: `${scale.toFixed(3)}rem`,
      px: Math.round(16 * scale),
      // How many ems wide the line runs, for fitting it to the room it has.
      chars: Number((line.length * 0.82).toFixed(2)),
      accent: i === 0,
    }
  })
}

export function tokenText(pairs, format) {
  if (format === 0) return `:root {\n${pairs.map(([k, v]) => `  --kerbside-${k}: ${v};`).join('\n')}\n}\n`
  if (format === 1) return `module.exports = {\n  theme: { extend: { kerbside: {\n${pairs.map(([k, v]) => `    '${k}': '${v}',`).join('\n')}\n  } } },\n};\n`
  return `${JSON.stringify({ kerbside: Object.fromEntries(pairs.map(([k, v]) => [k, { $value: v }])) }, null, 2)}\n`
}

export const byteLength = (text) => new TextEncoder().encode(text).length
export const smallSize = (bytes) => `${(bytes / 1024).toFixed(1)} KB`

// The five photos: three whole, two crops cut from them. `pos` is the object-position.
export const PHOTOS = Object.freeze([
  { id: 'evening', alt: 'A courier in a yellow jacket with a bike, in low evening light', pos: '57% 12%' },
  { id: 'riders', alt: 'Two riders waiting at a city intersection, one in an orange jacket', pos: '80% 50%' },
  { id: 'busstop', alt: 'A bus shelter poster panel on a tree-lined street', pos: '50% 50%' },
  { id: 'riders-jacket', alt: 'The orange jacket and helmet, cropped from the riders photo', pos: '50% 50%' },
  { id: 'busstop-poster', alt: 'The poster panel, cropped from the bus shelter photo', pos: '50% 50%' },
])
// `sizes` per photo, from the width each is drawn at once object-fit: cover has scaled it
// to fill its cell (the cell's height decides it for most): from 1024, from 768, below.
export const PHOTO_SIZES = Object.freeze({
  evening: '(min-width: 1024px) 961px, (min-width: 768px) 721px, calc(100vw - 34px)',
  riders: '(min-width: 1024px) 522px, (min-width: 768px) 391px, calc((100vw - 37px) / 2)',
  busstop: '(min-width: 1024px) 477px, (min-width: 768px) 357px, calc((100vw - 37px) / 2)',
  'riders-jacket': '(min-width: 1024px) 264px, (min-width: 768px) 25vw, calc((100vw - 37px) / 2)',
  'busstop-poster': '(min-width: 1024px) 264px, (min-width: 768px) 25vw, calc((100vw - 37px) / 2)',
})

/** The photo cells with their measured sizes: `sizes` is homeExportsSizes.json. Nothing here is typed in. */
export function photoCells(sizes) {
  return PHOTOS.map((photo, i) => {
    const m = sizes.photos.find((p) => p.id === photo.id)
    if (!m) throw new Error(`No measured size for ${photo.id}`)
    return { ...photo, file: m.file, name: m.file, was: formatBytes(m.was), now: formatBytes(m.now), nowBytes: m.now, index: i }
  })
}

/** The zip pill: the sum of the five measured "now" sizes. */
export function zipTotal(sizes) {
  return formatBytes(sizes.photos.reduce((n, p) => n + p.now, 0))
}

export const ICONS = Object.freeze([
  'M11 4a7 7 0 1 0 0 14a7 7 0 1 0 0-14M20 20l-4-4', 'M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z',
  'M12 3l2.6 5.6 6 .7-4.4 4.1 1.2 6L12 16.4 6.6 19.4l1.2-6L3.4 9.3l6-.7z', 'M4 11l8-7 8 7v9h-5v-6H9v6H4z',
  'M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4', 'M12 3v12M7 10l5 5 5-5M5 21h14', 'M4 5h16v14H4zM4 15l5-5 4 4 3-3 4 4',
  'M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 12l8-4.5M12 12v9M12 12L4 7.5', 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4', 'M3 6h18v12H3zM3 7l9 6 9-6',
  'M5 17a3 3 0 1 0 0.01 0M19 17a3 3 0 1 0 0.01 0M5 17l4-8h6l4 8M9 9l3 8h4M14 6h3', 'M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8',
  'M3 4h2l2.5 11h11L21 7H6.5M9 20h.01M18 20h.01', 'M5 8h14l-1 13H6zM9 8V6a3 3 0 0 1 6 0v2', 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4',
  'M4 5h16v11H9l-5 4z', 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2', 'M21 3L10 14M21 3l-7 18-4-7-7-4z',
  'M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11zM12 8a2 2 0 1 0 0 4a2 2 0 1 0 0-4', 'M3 12V4h8l10 10-8 8zM7.5 7.5h.01', 'M3 6h18v12H3zM3 10h18M7 15h3',
  'M8 7h8a5 5 0 0 1 0 10H8A5 5 0 0 1 8 7zM8 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6', 'M7 4l13 8-13 8z', 'M12 3v9M6.3 6.3a8 8 0 1 0 11.4 0',
])

/** One icon as the SVG file the zip would hold. */
export const iconSvg = (d, stroke = '#FF5A1F') =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`

/** The icons file's size: the SVG text of every icon in the grid, summed. */
export const iconsBytes = () => ICONS.reduce((n, d) => n + byteLength(iconSvg(d)), 0)

/* ── card 3 ───────────────────────────────────────────────────────────────── */

export const PROJECTS = Object.freeze([
  {
    name: 'Kerbside, rider tracking', parts: 'Colour, type, icons', when: 'Opened 2 hours ago',
    photo: 'evening', alt: '', pos: 'center 50%', posPhone: 'center 50%',
    sizes: '(max-width: 767px) 330px, 451px',
    word: { text: 'KERBSIDE', family: "'Archivo', sans-serif", weight: 800, stretch: '125%', track: '0.01em', px: 26, pxPhone: 22, k: 6.9 },
    pal: ['#FF5A1F', '#1A1A1A', '#E6E4DE', '#FFFFFF', '#3A3936'],
  },
  {
    name: 'Two Shores, ferry timetable', parts: 'Colour, type', when: 'Opened yesterday',
    photo: 'two-shores-guide-signage', alt: '', pos: '70% 40%', posPhone: '77% 40%',
    sizes: '(max-width: 767px) 312px, 425px',
    word: { text: 'TWO SHORES', family: "'Barlow Condensed', sans-serif", weight: 700, stretch: '100%', track: '0', px: 30, pxPhone: 26, k: 5.2 },
    pal: ['#FFC72C', '#0F1A1C', '#9C4A1F', '#F4F4F1', '#55605F'],
  },
  {
    name: 'Shallow End, swim lessons', parts: 'Colour, type, icons', when: 'Opened last week',
    photo: 'shallow-end-guide-signage', alt: '', pos: 'center 35%', posPhone: 'center 35%',
    sizes: '(max-width: 767px) 220px, 236px',
    word: { text: 'Shallow End', family: "'Bricolage Grotesque', sans-serif", weight: 700, stretch: '100%', track: '-0.02em', px: 30, pxPhone: 26, k: 3.6 },
    pal: ['#0E5C4A', '#FFB38A', '#1B2B27', '#FBF7F0', '#FFFFFF'],
  },
])

/** The footnote; the "real export" clause is true only once the export themes ship. */
// ships with the export themes
export function footnote(live) {
  const base = 'Kerbside, Two Shores and Shallow End are sample brands, made up for this page.'
  return live ? `${base} Every page shown is a real export of their palettes and fonts.` : base
}

/** Card 2's caption under the art. */
// ships with the export themes
export function artCaption(live) {
  return live
    ? 'Kerbside, a sample brand, in the Presentation theme. Set in Archivo and IBM Plex Sans.'
    : 'Kerbside, a sample brand. Set in Archivo and IBM Plex Sans.'
}

// The faces the cards draw, loaded when the section is near.
export const FACES_URL = 'https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@125,800&family=IBM+Plex+Sans:wght@400&family=Barlow+Condensed:wght@700&family=Bricolage+Grotesque:opsz,wdth,wght@36,100,700&display=swap'
