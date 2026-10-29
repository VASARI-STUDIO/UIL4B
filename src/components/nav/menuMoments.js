// Hover moments for the mega menu rows.
//
// Each tool row can play one short moment on a fine pointer or keyboard focus:
// the name or the glyph previews what the tool does. The motion itself is CSS
// (global.css, "HOVER MOMENTS"); this file holds the two bits CSS cannot do:
// the rules for WHEN a moment starts, and the font warm-up for the moments that
// swap the name's typeface.

// The menu is hover-only: a touch or coarse pointer gets nothing. The same
// query gates the CSS.
export const HOVER_FINE = '(hover: hover) and (pointer: fine)'

// Hover intent: the row answers at once, the moment starts this much later, so
// a pointer sweeping down a column sets nothing off. Keyboard focus is deliberate
// and starts at once.
export const INTENT_MS = 80

// Row id -> moment id (the value of data-moment). All 18 tools of Create and Discover.
// A row not listed here has no moment and renders as it always has.
export const MOMENT_OF = {
  palette: 'palette',
  gradient: 'gradient',
  contrast: 'contrast',
  tint: 'tint',
  semantic: 'semantic',
  'font-gallery': 'font-gallery',
  'font-pair': 'font-pair',
  'type-scale': 'type-scale',
  icons: 'icons',
  'icon-library': 'icons',
  emoji: 'emoji',
  'file-converter': 'file-converter',
  ratio: 'ratio',
  '3d-converter': 'model-3d',
  'alt-text': 'alt-text',
  'palette-library': 'palette-library',
  'gradient-gallery': 'gradient-library',
  inspiration: 'inspiration',
  'community-prompts': 'prompt-library',
}

export function finePointer() {
  return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(HOVER_FINE).matches
}

// The site setting wins over the OS one, the same order the global CSS uses.
export function reducedMotion() {
  if (typeof document === 'undefined') return false
  const set = document.documentElement.dataset.reducedMotion
  if (set === 'true') return true
  if (set === 'false') return false
  return !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// ── Faces ──
// Geist Mono is on every page already, so it counts as ready without a fetch (it
// is the one face Font Pair and Font Gallery still have when Save-Data is on).
// The `onPage` flag marks it.
// Literata and Big Shoulders Display are self-hosted (public/fonts, declared in
// global.css) and are fetched ONCE, the first time the Create or Discover menu
// opens on a hover-capable device. Caveat is left out: with it
// the warm set is 171KB against the 150KB budget; without it, 121KB.
export const FACES = [
  { key: 'mono', family: '"Geist Mono", monospace', weight: 500, probe: '500 14.5px "Geist Mono"', onPage: true },
  { key: 'literata', family: 'Literata, serif', weight: 500, probe: '500 14.5px Literata' },
  { key: 'shoulders', family: '"Big Shoulders Display", sans-serif', weight: 700, probe: '700 14.5px "Big Shoulders Display"' },
]
export const faceByKey = (key) => FACES.find((f) => f.key === key) || null

const loaded = new Set()
let warming = null

// A face counts as ready only when its load resolved with a file (a face already on
// the page, Geist Mono, needs no load of ours) AND the browser agrees it can paint
// it now. Nothing is used before that, so a face never pops
// in mid-hover and hovering never starts a download.
export function readyFaces() {
  if (typeof document === 'undefined' || !document.fonts?.check) return []
  return FACES.filter((f) => {
    if (!f.onPage && !loaded.has(f.key)) return false
    try { return document.fonts.check(f.probe) } catch { return false }
  })
}

// "mono literata shoulders": the data-faces value on the menu root.
export const facesAttr = () => readyFaces().map((f) => f.key).join(' ')

// Starts the one-time load. Safe to call on every menu open: it returns the same
// promise after the first call, and does nothing on touch or with Save-Data on.
export function warmFaces() {
  if (warming) return warming
  if (typeof document === 'undefined' || !document.fonts?.load) return Promise.resolve()
  if (!finePointer() || navigator.connection?.saveData) return Promise.resolve()
  warming = Promise.all(FACES.map((f) =>
    document.fonts.load(f.probe).then((r) => { if (r.length) loaded.add(f.key) }).catch(() => {}),
  ))
  return warming
}

// ── Font Gallery ──
// Three swaps, 170ms apart, landing on a random ready face and never on the same
// one twice running. Returns the faces in order; with reduced motion, or only one
// face ready, it is just the landing face (Literata when it is ready).
let lastLanding = null
export function galleryRun() {
  const ready = readyFaces()
  if (!ready.length) return []
  if (reducedMotion()) return [ready.find((f) => f.key === 'literata') || ready[0]]
  const pool = ready.slice().sort(() => Math.random() - 0.5)
  const land = pool.find((f) => f.key !== lastLanding) || pool[0]
  lastLanding = land.key
  return pool.filter((f) => f !== land).slice(0, 2).concat(land)
}
export const GALLERY_STEP_MS = 170
