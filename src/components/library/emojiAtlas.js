// Glyph bitmaps for the Emoji Library grid.
//
// WHY: a colour emoji glyph is not cached by the browser between paints. Every
// time a cell's text is painted (a search result swaps in, a row scrolls into
// view, a tile is re-rastered) each glyph is drawn again from its font, about
// 2.5 ms apiece on a software raster, so 450 cells cost about a second per
// commit. Drawing each glyph ONCE into a bitmap and painting that bitmap makes
// every later paint an image blit.
//
// HOW: a worker draws the glyphs, with the same system font the cell would use,
// into a sheet (OffscreenCanvas, at the screen's pixel ratio), encodes it as a
// PNG and hands it back; a cell then shows its glyph as a CSS background cut
// from that sheet. Nothing about the main thread changes while a sheet is being
// drawn. Until a glyph has a bitmap, or if the browser cannot make one, the
// cell shows the real text exactly as before, so this only ever adds a faster
// path. The text stays in the cell (hidden while the bitmap shows) so the label,
// the title and the hover all keep working from the real character.
//
// WHICH GLYPHS GET A BITMAP: only ones the worker can draw as the page would.
// The worker draws every glyph in magenta; a colour glyph ignores the fill
// colour but a text glyph (a flag the font has no picture for, drawn as its
// two letters; a monochrome symbol) takes it, so a glyph that comes out magenta
// follows the theme's text colour on the page and a bitmap cannot. Those stay
// real text. So does anything wider than one emoji slot (a skin-tone sequence
// the font draws as two glyphs) and anything that touches its slot's edge. A
// sheet is also checked before it is shown: if the browser blanks canvas
// readback, the font is rejected or the sheet will not decode, the whole path
// is dropped and every cell keeps its text.
//
// MEMORY: a decoded sheet costs width x height x 4 bytes, so at a phone's pixel
// ratio the whole catalogue would be tens of megabytes. Sheets live inside a
// byte budget: sheets for a skin tone no longer selected go at once, and past
// the budget the least recently used sheet with nothing on screen goes next.

export const SLOT = 36           // css px each glyph is drawn into (24px font plus its overhang)
export const SHEET_COLS = 12
const URGENT_CHUNK = 24          // glyphs on screen: small sheets, so the first lands quickly
const BACKGROUND_CHUNK = 96
const IDLE_TEARDOWN_MS = 30000   // the worker and sheets go this long after the grid unmounts

const MB = 1024 * 1024
// Decoded bytes the sheets may hold, by how much the device can spare. Sheets
// holding what is on screen are never dropped, so a very large window can pass it.
function memoryBudget() {
  const nav = typeof navigator !== 'undefined' ? navigator : {}
  const mem = nav.deviceMemory === undefined ? 8 : nav.deviceMemory
  const cores = nav.hardwareConcurrency || 4
  if (mem <= 2 || cores <= 2 || nav.connection?.saveData) return 12 * MB
  if (mem <= 4) return 24 * MB
  return 36 * MB
}

const WORKER_SOURCE = `
let validated = false
self.onmessage = async (e) => {
  const { gen, id, chars, scale, font, fontSize, advance, baseline, slot, slotH, cols } = e.data
  try {
    const rows = Math.ceil(chars.length / cols)
    const W = Math.round(cols * slot * scale)
    const H = Math.round(rows * slotH * scale)
    const canvas = new OffscreenCanvas(W, H)
    const ctx = canvas.getContext('2d', { willReadFrequently: false })
    ctx.scale(scale, scale)
    ctx.font = font
    // A rejected font string leaves the default 10px sans-serif in place.
    if (!(Math.abs(parseFloat(ctx.font) - fontSize) < 0.01)) throw new Error('font rejected: ' + ctx.font)
    ctx.fillStyle = '#ff00ff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    const one = ctx.measureText('\\u{1F600}').width
    if (!(one > 0) || (advance && Math.abs(one - advance) > advance * 0.1)) throw new Error('font mismatch: ' + one + ' vs ' + advance)
    // Wider than one slot: the font draws it as more than one glyph (a skin tone
    // beside its base) or a ligature the canvas shapes differently. Not drawn.
    const limit = Math.min(slot, one * 1.15)
    const text = []
    const drawn = []
    for (let i = 0; i < chars.length; i++) {
      const w = ctx.measureText(chars[i]).width
      if (!(w > 0) || w > limit) { text.push(i); continue }
      ctx.fillText(chars[i], (i % cols) * slot + slot / 2, Math.floor(i / cols) * slotH + baseline)
      drawn.push(i)
    }
    // Read the sheet back and judge each glyph by its pixels.
    const px = ctx.getImageData(0, 0, W, H).data
    const sw = Math.round(slot * scale)
    const minInk = 12 * scale * scale
    let totalInk = 0, withInk = 0, noisy = 0
    const keep = []
    for (const i of drawn) {
      const r = Math.floor(i / cols)
      const x0 = (i % cols) * sw
      const y0 = Math.round(r * slotH * scale)
      const y1 = Math.min(H, Math.round((r + 1) * slotH * scale))
      let ink = 0, tint = 0, edge = 0, corner = 0
      for (let y = y0; y < y1; y++) {
        let p = (y * W + x0) * 4
        for (let x = 0; x < sw; x++, p += 4) {
          const a = px[p + 3]
          if (a > 8 && y - y0 < 3 && x < 3) corner++
          if (a < 64) continue
          ink++
          if (px[p] >= 200 && px[p + 2] >= 200 && px[p + 1] <= 60) tint++
          if (x === 0 || x === sw - 1) edge++
        }
      }
      totalInk += ink
      if (corner) noisy++
      if (ink < minInk) { text.push(i); continue }
      withInk++
      if (tint > ink * 0.08 || edge > 2) { text.push(i); continue }
      keep.push(i)
    }
    // A readback that is blank, or full of noise where no glyph reaches, is not
    // a drawing of these glyphs. Fail the sheet; the page falls back to text.
    if (drawn.length >= 4 && withInk < drawn.length * 0.5) throw new Error('blank sheet')
    if (drawn.length >= 4 && noisy > drawn.length * 0.3) throw new Error('noisy sheet')
    if (!keep.length) { self.postMessage({ gen, id, rows, text }); return }
    const blob = await canvas.convertToBlob({ type: 'image/png' })
    if (!validated) {
      // The first sheet is decoded again, from the PNG that would be shown.
      const bmp = await createImageBitmap(blob)
      if (bmp.width !== W || bmp.height !== H) throw new Error('sheet size')
      const back = new OffscreenCanvas(W, H)
      const bctx = back.getContext('2d', { willReadFrequently: false })
      bctx.drawImage(bmp, 0, 0)
      if (bmp.close) bmp.close()
      const d = bctx.getImageData(0, 0, W, H).data
      let n = 0
      for (let p = 3; p < d.length; p += 4) if (d[p] >= 64) n++
      if (n < totalInk * 0.7) throw new Error('sheet unreadable')
      validated = true
    }
    self.postMessage({ gen, id, blob, rows, w: W, h: H, text })
  } catch (err) {
    self.postMessage({ gen, id, error: String(err) })
  }
}`

export const atlas = {
  gen: 0,             // bumped whenever the drawing setup changes; older replies are dropped
  config: null,       // { key, scale, font, fontSize, advance, baseline, slotH } once measured from a real cell
  measureFailed: false, // a measure found a cell with no size (hidden, not laid out): config stays null
  dpr: 0,             // the pixel ratio that config was measured at
  sprites: new Map(), // glyph string -> { style, sheet }
  textOnly: new Set(),// glyphs the worker judged cannot be a bitmap: they stay text
  sheets: [],         // { url, bytes, chars, last }, revoked when dropped
  bytes: 0,           // decoded bytes the sheets hold
  queue: [],          // chunks waiting for the worker, front first
  current: null,      // the chunk the worker is drawing
  worker: null,
  failed: false,
  version: 0,
  listeners: new Set(),
  idle: 0,
  fullFor: null,      // the wanted list the background pass ran out of room for
  mounted: new Set(), // glyphs in the cells mounted now: a reply for none of them changes nothing on screen
}

// The grid says which glyphs its mounted cells show, in the same commit that
// mounts them, so no reply can land between a cell mounting and this being set.
export function atlasMounted(chars) {
  atlas.mounted = chars
}

export const atlasSupported = () => (
  typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined' && typeof URL !== 'undefined'
  && typeof URL.createObjectURL === 'function' && typeof Blob !== 'undefined'
  && typeof OffscreenCanvas.prototype.convertToBlob === 'function'
)

// True while a glyph's bitmap is still on its way: the atlas is in play, has not
// failed, and has not ruled this glyph out. A pending cell paints a quiet
// placeholder, not the live colour text, because laying out that text is what
// made a search or a fast scroll freeze (about 7 ms a cell at 4x CPU). Text stays
// the answer for a glyph in `textOnly` (the worker found it cannot be a bitmap,
// such as a flag the font has no picture for), once the atlas has failed, and
// wherever the atlas is not supported at all. Before the first measure the
// placeholder shows (the page must not paint a screenful of text cells while it
// waits); a measure that was tried and found no size sends no job, so until a
// later one succeeds the cells keep their text.
let supported
export function atlasPending(ch) {
  if (atlas.failed || atlas.textOnly.has(ch)) return false
  if (!atlas.config && atlas.measureFailed) return false
  if (supported === undefined) supported = atlasSupported()
  return supported
}

function atlasEmit() {
  atlas.version++
  atlas.listeners.forEach(fn => fn())
}
export const atlasSubscribe = (fn) => {
  atlas.listeners.add(fn)
  clearTimeout(atlas.idle)
  return () => {
    atlas.listeners.delete(fn)
    if (!atlas.listeners.size) atlas.idle = setTimeout(atlasTeardown, IDLE_TEARDOWN_MS)
  }
}
export const atlasVersion = () => atlas.version

function atlasFail() {
  atlas.failed = true
  atlasReset()
  if (atlas.worker) { atlas.worker.terminate(); atlas.worker = null }
}

function atlasReset() {
  atlas.gen++
  atlas.sheets.forEach(s => URL.revokeObjectURL(s.url))
  atlas.sheets = []
  atlas.bytes = 0
  atlas.sprites = new Map()
  atlas.textOnly = new Set()
  atlas.queue = []
  atlas.current = null
  atlas.fullFor = null
  atlasEmit()
}

// The grid has been gone a while: free the worker and every sheet. The next
// mount measures and draws afresh.
function atlasTeardown() {
  if (atlas.listeners.size) return
  atlasReset()
  atlas.config = null
  atlas.measureFailed = false
  if (atlas.worker) { atlas.worker.terminate(); atlas.worker = null }
}

function atlasInstall(job, reply) {
  const { blob, rows, w, h, text } = reply
  for (const i of text || []) atlas.textOnly.add(job.chars[i])
  if (!blob) return
  const skip = new Set(text || [])
  const url = URL.createObjectURL(blob)
  const sheet = { url, bytes: w * h * 4, chars: [], last: Date.now() }
  atlas.sheets.push(sheet)
  atlas.bytes += sheet.bytes
  const backgroundImage = `url("${url}")`
  const { slotH } = atlas.config
  const backgroundSize = `${SHEET_COLS * SLOT}px ${rows * slotH}px`
  job.chars.forEach((ch, i) => {
    if (skip.has(i)) return
    sheet.chars.push(ch)
    atlas.sprites.set(ch, {
      sheet,
      style: {
        backgroundImage,
        backgroundSize,
        backgroundPosition: `${-(i % SHEET_COLS) * SLOT}px ${-Math.floor(i / SHEET_COLS) * slotH}px`,
        height: `${slotH}px`,
      },
    })
  })
}

function atlasWorker() {
  if (atlas.worker) return atlas.worker
  const url = URL.createObjectURL(new Blob([WORKER_SOURCE], { type: 'text/javascript' }))
  const worker = new Worker(url)
  URL.revokeObjectURL(url)
  worker.onmessage = (e) => {
    const reply = e.data
    const job = atlas.current
    if (reply.gen !== atlas.gen || !job) { if (reply.gen === atlas.gen) atlas.current = null; atlasPump(); return }
    atlas.current = null
    if (reply.error) { atlasFail(); return }
    atlasInstall(job, reply)
    // Tell the grid only when a mounted cell can change: a background sheet for
    // glyphs nobody is looking at would re-render the whole grid for nothing. A
    // cell mounted later reads the sprite straight from the atlas.
    if (job.chars.some(ch => atlas.mounted.has(ch))) atlasEmit()
    atlasPump()
  }
  worker.onerror = () => atlasFail()
  atlas.worker = worker
  return worker
}

function atlasPump() {
  if (atlas.current || atlas.failed || !atlas.config || !atlas.queue.length) return
  const job = atlas.queue.shift()
  atlas.current = job
  const { scale, font, fontSize, advance, baseline, slotH } = atlas.config
  try {
    atlasWorker().postMessage({ gen: atlas.gen, id: job.id, chars: job.chars, scale, font, fontSize, advance, baseline, slot: SLOT, slotH, cols: SHEET_COLS })
  } catch {
    atlasFail()
  }
}

// Decoded bytes one glyph's cell takes in a sheet.
function glyphBytes() {
  const { scale, slotH } = atlas.config
  return Math.round(SLOT * scale) * Math.round(slotH * scale) * 4
}

let jobId = 0
// The glyphs of a grid's mounted cells ordered by how far their row is from the
// viewport. `rowOf[i]` is the row ({ top, h }) holding `chars[i]`; `top` is the
// scroll position in the grid's own coordinates and `height` the viewport's.
// A stable sort, so glyphs at the same distance (all those in view are at 0)
// keep their reading order.
export function nearestFirst({ chars, rowOf }, top, height) {
  const bottom = top + height
  const gap = (row) => (row.top + row.h < top ? top - (row.top + row.h) : row.top > bottom ? row.top - bottom : 0)
  return chars.map((ch, i) => [ch, gap(rowOf[i])]).sort((a, b) => a[1] - b[1]).map(c => c[0])
}

// Queue the glyphs on screen now, `chars` being nearest the viewport first. Every
// call rebuilds the urgent part of the queue from this list, so after a scroll
// what is now closest goes first even when an older urgent job holds it; a glyph
// that has left the list drops out of the urgent jobs (the background pass takes
// it up again if there is room). They go ahead of everything waiting. Anything
// already drawn, in flight or known to stay text is skipped, and a glyph still
// sitting in a waiting background chunk is pulled forward.
export function atlasWant(chars) {
  if (atlas.failed || !atlas.config) return
  const flying = atlas.current ? new Set(atlas.current.chars) : new Set()
  const seen = new Set()
  const missing = []
  for (const ch of chars) {
    if (atlas.sprites.has(ch) || atlas.textOnly.has(ch) || seen.has(ch) || flying.has(ch)) continue
    seen.add(ch)
    missing.push(ch)
  }
  if (!missing.length && !atlas.queue.some(job => job.urgent)) return
  atlas.queue = atlas.queue
    .filter(job => !job.urgent)
    .map(job => ({ ...job, chars: job.chars.filter(ch => !seen.has(ch)) }))
    .filter(job => job.chars.length)
  const jobs = []
  for (let i = 0; i < missing.length; i += URGENT_CHUNK) jobs.push({ id: ++jobId, urgent: true, chars: missing.slice(i, i + URGENT_CHUNK) })
  atlas.queue = [...jobs, ...atlas.queue]
  atlasPump()
}

// Draw the rest of the catalogue in the background, as far as the memory budget
// has room, so a search or a category switch finds its bitmaps ready. `wanted`
// is the catalogue's glyph strings at the current skin tone, in order.
export function atlasWarm(wanted) {
  if (atlas.failed || !atlas.config) return
  // Once the budget is full for this list, trimming for what is on screen must
  // not make room for the background pass to fill and trim again.
  if (atlas.fullFor === wanted) return
  const keep = new Set(wanted)
  // Waiting background chunks may be for a skin tone no longer selected.
  atlas.queue = atlas.queue
    .map(job => (job.urgent ? job : { ...job, chars: job.chars.filter(ch => keep.has(ch)) }))
    .filter(job => job.chars.length)
  const per = glyphBytes()
  let used = atlas.bytes
  for (const job of atlas.queue) used += job.chars.length * per
  if (atlas.current) used += atlas.current.chars.length * per
  let room = Math.floor((memoryBudget() - used) / per)
  if (room <= 0) { atlas.fullFor = wanted; return }
  const queued = new Set()
  atlas.queue.forEach(job => job.chars.forEach(ch => queued.add(ch)))
  if (atlas.current) atlas.current.chars.forEach(ch => queued.add(ch))
  const rest = []
  for (const ch of wanted) {
    if (atlas.sprites.has(ch) || atlas.textOnly.has(ch) || queued.has(ch)) continue
    if (room <= 0) { atlas.fullFor = wanted; break }
    queued.add(ch)
    rest.push(ch)
    room--
  }
  for (let i = 0; i < rest.length; i += BACKGROUND_CHUNK) atlas.queue.push({ id: ++jobId, urgent: false, chars: rest.slice(i, i + BACKGROUND_CHUNK) })
  atlasPump()
}

// Drop sheets nobody needs. `shown` is the glyphs mounted in cells now (their
// sheets are never touched); `wanted` the catalogue at the current skin tone.
// Sheets that are mostly stale (a skin tone no longer selected) go at once,
// the wanted glyphs left in them to be redrawn in a fresh sheet; past the
// budget the least recently used go next.
export function atlasTrim(shown, wanted) {
  if (atlas.failed || !atlas.sheets.length) return
  const keep = new Set(wanted)
  const now = Date.now()
  const info = new Map()
  for (const s of atlas.sheets) {
    let live = 0
    let onScreen = false
    for (const ch of s.chars) { if (keep.has(ch)) live++; if (shown.has(ch)) onScreen = true }
    if (onScreen) s.last = now
    info.set(s, { live, onScreen })
  }
  const drop = new Set()
  for (const s of atlas.sheets) { const i = info.get(s); if (!i.onScreen && i.live * 2 < s.chars.length) drop.add(s) }
  let bytes = atlas.bytes
  for (const s of drop) bytes -= s.bytes
  if (bytes > memoryBudget()) {
    const order = atlas.sheets
      .filter(s => !drop.has(s) && !info.get(s).onScreen)
      .sort((a, b) => {
        const sa = info.get(a).live / Math.max(1, a.chars.length) < 0.5 ? 0 : 1
        const sb = info.get(b).live / Math.max(1, b.chars.length) < 0.5 ? 0 : 1
        return sa - sb || a.last - b.last
      })
    for (const s of order) {
      if (bytes <= memoryBudget()) break
      drop.add(s)
      bytes -= s.bytes
    }
  }
  if (!drop.size) return
  for (const s of drop) {
    URL.revokeObjectURL(s.url)
    for (const ch of s.chars) { if (atlas.sprites.get(ch)?.sheet === s) atlas.sprites.delete(ch) }
  }
  atlas.sheets = atlas.sheets.filter(s => !drop.has(s))
  atlas.bytes = bytes
  // No emit: a sheet holding a mounted glyph is never dropped, so no cell changes.
}

// Measure how a real cell lays its glyph out, so the bitmap lands on the same
// pixels: the font the cell resolves to, and where its baseline sits inside the
// glyph's box. A zero-size inline-block rests on the baseline, which reads it
// back without guessing at font metrics. Called once the grid has a width, and
// again when the pixel ratio or a web font changes the answer.
export function atlasConfigure(host) {
  if (atlas.failed || !host || !atlasSupported()) return
  const probe = document.createElement('button')
  probe.className = 'emoji-cell'
  probe.tabIndex = -1
  probe.setAttribute('aria-hidden', 'true')
  probe.style.cssText = 'position:absolute;top:0;left:0;visibility:hidden;pointer-events:none;transition:none'
  probe.innerHTML = '<span class="emoji-char">\u{1F600}<i style="display:inline-block;width:0;height:0"></i></span>'
  host.appendChild(probe)
  const span = probe.firstChild
  const style = getComputedStyle(span)
  const spanRect = span.getBoundingClientRect()
  const markRect = span.firstElementChild.getBoundingClientRect()
  const fontSize = parseFloat(style.fontSize)
  const family = style.fontFamily
  host.removeChild(probe)
  if (!spanRect.height || !fontSize) {
    // Nothing to measure (the grid is hidden or not laid out yet). With no config
    // no job is sent, so cells waiting on a bitmap fall back to their text until a
    // later measure succeeds; tell the grid, which is showing placeholders.
    if (!atlas.config && !atlas.measureFailed) { atlas.measureFailed = true; atlasEmit() }
    return
  }
  atlas.measureFailed = false
  const dpr = window.devicePixelRatio || 1
  const scale = Math.round(SLOT * dpr) / SLOT
  // The bitmap box is the text's own line box plus a whole 2px margin above and
  // below, so a cell centres it with the same fractional offset it centres the
  // text with and the two round onto the pixel grid the same way. A box of any
  // other height lands a row up or down from the text it replaces.
  const slotH = Math.round(spanRect.height) + 4
  const baseline = markRect.bottom - spanRect.top + 2
  const font = `${fontSize}px ${family}`
  const advance = spanRect.width
  const key = `${scale}|${font}|${baseline.toFixed(2)}|${slotH}`
  atlas.dpr = dpr
  if (atlas.config && atlas.config.key === key) return
  atlas.config = { key, scale, font, fontSize, advance, baseline, slotH }
  atlasReset()
}
