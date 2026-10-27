// INLINE SVG SPRITE FOR THE ICON GRID.
//
// WHY: a grid cell used to be an <img src="data:image/svg+xml,…">, which makes
// the browser build one SVG document per icon (parse, load event, decode,
// raster). Six pages of 120 cells meant ~700 documents and tens of thousands of
// small tasks on a phone. Here every loaded icon is one <symbol> in a single
// hidden <svg> on the page, and a cell is `<svg><use href="#id"/></svg>`: no
// document, no load event, nothing to decode.
//
// SAFETY: a body goes into the page's own DOM, so it is reduced to the
// allow-list first (sanitiseSvgInline) even though built-in packs are trusted.
// An icon the sanitiser would change (a <style>, a <filter>, an animation) or
// refuse is NOT put in the sprite; the caller keeps drawing it as an image, so
// the sprite never alters how an icon looks.
//
// The sprite only grows by appending: `register` inserts the symbols of one
// batch with a single insertAdjacentHTML, and nothing is re-rendered.
import { sanitiseSvgInline } from './svgSanitise.js'

const SPRITE_ID = 'ig-sprite'
// Symbols kept in the page. Past this, the least recently used ones that no cell
// is drawing are dropped, so a long session does not grow the DOM without end.
export const SPRITE_MAX = 4000
const SPRITE_TRIM_TO = 3000

// 'pack:name' → symbol id, or false for an icon that cannot be inlined.
// Insertion order is use order: a hit is re-inserted at the end.
const SYMBOLS = new Map()
let nextId = 1
let root = null

const ROOT_RE = /^<svg((?: [A-Za-z:-]+="[^"]*")*)>([\s\S]+)<\/svg>$/
const VIEWBOX_RE = / viewBox="([^"]*)"/

/**
 * `<symbol>` markup for one standalone icon SVG, or null when it should stay an
 * image. `id` is also the sanitiser's idPrefix, so ids inside the icon
 * (gradients, clip paths) become `<id>.<name>` and cannot meet another icon's.
 */
export function symbolMarkup(svgText, id) {
  const clean = sanitiseSvgInline(svgText, { idPrefix: id })
  if (!clean || !clean.ok) return null
  const m = ROOT_RE.exec(clean.svg)
  if (!m) return null
  const box = VIEWBOX_RE.exec(m[1])
  if (!box) return null
  return `<symbol id="${id}" viewBox="${box[1]}">${m[2]}</symbol>`
}

function spriteRoot() {
  if (root && root.isConnected) return root
  if (typeof document === 'undefined') return null
  root = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  root.setAttribute('id', SPRITE_ID)
  root.setAttribute('class', 'ig-sprite')
  root.setAttribute('width', '0')
  root.setAttribute('height', '0')
  root.setAttribute('aria-hidden', 'true')
  root.setAttribute('focusable', 'false')
  document.body.appendChild(root)
  return root
}

// Drop the oldest entries no <use> points at (a refused icon has no symbol, so it
// simply goes). One pass over the page's <use> elements, only when the cap is crossed.
function trim() {
  if (SYMBOLS.size <= SPRITE_MAX || !root) return
  const live = new Set()
  for (const u of document.querySelectorAll('use[href^="#ics"]')) live.add(u.getAttribute('href').slice(1))
  for (const [key, id] of SYMBOLS) {
    if (SYMBOLS.size <= SPRITE_TRIM_TO) break
    if (id && live.has(id)) continue
    if (id) document.getElementById(id)?.remove()
    SYMBOLS.delete(key)
  }
}

/**
 * Add the symbols for a batch of icons in one DOM write. `items` is
 * `[{ key, text }]`, `text` being the standalone SVG. Icons already known are
 * skipped, so calling this twice for the same batch costs nothing.
 */
export function registerSymbols(items) {
  const host = spriteRoot()
  if (!host) return
  let html = ''
  for (const { key, text } of items) {
    if (SYMBOLS.has(key) || !text) continue
    const id = `ics${nextId++}`
    const markup = symbolMarkup(text, id)
    SYMBOLS.set(key, markup ? id : false)
    if (markup) html += markup
  }
  if (!html) return
  trim()
  host.insertAdjacentHTML('beforeend', html)
}

/**
 * The `#id` a cell should `<use>` for this icon, or '' when it is not in the
 * sprite (not registered yet, or it must stay an image).
 */
export function symbolRef(key) {
  const id = SYMBOLS.get(key)
  if (!id) return ''
  SYMBOLS.delete(key)
  SYMBOLS.set(key, id)
  return `#${id}`
}

/** True once the icon has been looked at, whether or not it made it into the sprite. */
export const symbolKnown = (key) => SYMBOLS.has(key)
