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
// batch with a single insertAdjacentHTML, and nothing is re-rendered. Reading an
// id (`ref`) never writes anything, so a render can ask as often as it likes.
//
// The bookkeeping is a factory over a small "host" (the thing that holds the
// markup), so the cap and eviction can be driven in Node with a fake host. The
// exports at the bottom are the one instance the page uses, bound to the DOM.
import { sanitiseSvgInline } from './svgSanitise.js'

const SPRITE_ID = 'ig-sprite'
// Symbols kept in the page. Past this, the least recently used ones that no cell
// is drawing are dropped, so a long session does not grow the DOM without end.
export const SPRITE_MAX = 4000
export const SPRITE_TRIM_TO = 3000

const ROOT_RE = /^<svg((?: [A-Za-z:-]+="[^"]*")*)>([\s\S]+)<\/svg>$/
const VIEWBOX_RE = / viewBox="([^"]*)"/
const ID_RE = /^ics(\d+)$/

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

/**
 * The sprite bookkeeping over a host. `acquire()` returns a host or null (no
 * document). A host is `{ alive(), append(html), remove(id), liveIds(), maxId(),
 * clear() }`: `alive` says it is still in the page, `append` adds markup,
 * `remove` deletes one symbol, `liveIds` is the set of ids some cell points at,
 * `maxId` the highest `icsN` already inside it, `clear` empties it.
 */
export function createSprite({ acquire, max = SPRITE_MAX, trimTo = SPRITE_TRIM_TO }) {
  // 'pack:name' → symbol id, or false for an icon that cannot be inlined.
  // Insertion order is use order: `touch` re-inserts a key at the end.
  const symbols = new Map()
  // Never reused, so an id a cell still points at can only ever go dead, not
  // start naming a different icon.
  let nextId = 1
  let host = null

  // The host symbols are in. A host that is gone (the body was replaced) takes
  // its symbols with it, so the map is emptied; a host this instance did not
  // build (an older copy of this module left one behind on hot reload) is
  // adopted after counting its ids past, then emptied: nothing here knows what
  // is in it, so nothing here could ever trim it.
  function current() {
    if (host && host.alive()) return host
    symbols.clear()
    host = acquire()
    if (!host) return null
    nextId = Math.max(nextId, host.maxId() + 1)
    host.clear()
    return host
  }

  // Keys of batches being registered right now. Their symbols may not have a
  // <use> yet, so they must survive another batch's trim.
  const inFlight = new Set()

  // Make room for `incoming` new symbols: drop the oldest ones no <use> points at
  // until the total is back under `trimTo`. The batch being registered is
  // protected (and, not being in the map yet, could not be dropped anyway). A
  // refused icon has no symbol, so it just goes.
  function trim(h, incoming, keys) {
    if (symbols.size + incoming <= max) return
    const live = h.liveIds()
    for (const [key, id] of symbols) {
      if (symbols.size + incoming <= trimTo) break
      if (inFlight.has(key) || keys.has(key) || (id && live.has(id))) continue
      if (id) h.remove(id)
      symbols.delete(key)
    }
  }

  // Sanitise and write one run of items in a single append.
  function add(h, items) {
    let html = ''
    for (const { key, text } of items) {
      if (symbols.has(key) || !text) continue
      const id = `ics${nextId++}`
      const markup = symbolMarkup(text, id)
      symbols.set(key, markup ? id : false)
      if (markup) html += markup
    }
    if (html) h.append(html)
  }

  return {
    /**
     * Add the symbols for a batch of icons in one DOM write. `items` is
     * `[{ key, text }]`, `text` being the standalone SVG. Icons already known are
     * skipped, so calling this twice for the same batch costs nothing.
     */
    register(items) {
      const h = current()
      if (!h) return
      trim(h, items.length, new Set(items.map((i) => i.key)))
      add(h, items)
    },
    /**
     * The same, in runs of `size` icons with `await pause()` between them, so
     * sanitising a big batch is several short tasks rather than one long one.
     * Resolves once every run is in. Making room happens once, up front.
     */
    async registerSliced(items, { size = 25, pause }) {
      const h = current()
      if (!h) return
      const keys = items.map((i) => i.key)
      trim(h, items.length, new Set(keys))
      for (const k of keys) inFlight.add(k)
      try {
        for (let i = 0; i < items.length; i += size) {
          if (i) await pause()
          // The host can be replaced while paused; the rest goes into the new one.
          const now = current()
          if (!now) return
          add(now, items.slice(i, i + size))
        }
      } finally {
        for (const k of keys) inFlight.delete(k)
      }
    },
    /**
     * The `#id` a cell should `<use>` for this icon, or '' when it is not in the
     * sprite (not registered yet, evicted, or it must stay an image). Read-only.
     */
    ref(key) {
      const id = symbols.get(key)
      return id && host && host.alive() ? `#${id}` : ''
    },
    /** Mark an icon as just drawn, so eviction takes older ones first. */
    touch(key) {
      const id = symbols.get(key)
      if (id === undefined) return
      symbols.delete(key)
      symbols.set(key, id)
    },
    /** True once the icon has been looked at, whether or not it made it into the sprite. */
    known: (key) => symbols.has(key),
    /** How many icons are tracked (symbols plus refused ones). */
    get size() { return symbols.size },
  }
}

// ── The page's sprite: a hidden <svg id="ig-sprite"> in <body> ───────────────

function domHost(svg) {
  return {
    alive: () => svg.isConnected,
    append: (html) => svg.insertAdjacentHTML('beforeend', html),
    remove: (id) => svg.querySelector(`#${id}`)?.remove(),
    liveIds() {
      const ids = new Set()
      for (const u of svg.ownerDocument.querySelectorAll('use[href^="#ics"]')) ids.add(u.getAttribute('href').slice(1))
      return ids
    },
    maxId() {
      let max = 0
      for (const s of svg.querySelectorAll('symbol')) {
        const m = ID_RE.exec(s.id)
        if (m) max = Math.max(max, Number(m[1]))
      }
      return max
    },
    clear: () => svg.replaceChildren(),
  }
}

function acquireDom() {
  if (typeof document === 'undefined' || !document.body) return null
  // Reuse a sprite already in the page (a second copy of this module, or one
  // that was re-attached) rather than adding a duplicate id.
  let svg = document.getElementById(SPRITE_ID)
  if (!svg) {
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('id', SPRITE_ID)
    svg.setAttribute('width', '0')
    svg.setAttribute('height', '0')
    svg.setAttribute('aria-hidden', 'true')
    svg.setAttribute('focusable', 'false')
    // Inline, so the sprite takes no space even before any stylesheet has loaded.
    svg.setAttribute('style', 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none')
    document.body.appendChild(svg)
  }
  return domHost(svg)
}

const page = createSprite({ acquire: acquireDom })

export const registerSymbols = (items) => page.register(items)
// Sanitising in runs, yielding to the browser between them (scheduler.yield where
// it exists, else a zero-delay timer).
const yieldTurn = () => (globalThis.scheduler?.yield ? globalThis.scheduler.yield() : new Promise((r) => setTimeout(r, 0)))
export const registerSymbolsSliced = (items, size) => page.registerSliced(items, { size, pause: yieldTurn })
export const symbolRef = (key) => page.ref(key)
export const touchSymbol = (key) => page.touch(key)
export const symbolKnown = (key) => page.known(key)
