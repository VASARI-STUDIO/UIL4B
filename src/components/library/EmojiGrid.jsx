import { useState, useMemo, useCallback, useEffect, useLayoutEffect, useRef, useSyncExternalStore, memo } from 'react'

// The Emoji Library's windowed grid, kept in its own component so the scroll
// state (which row range is mounted, which cell just copied) re-renders THIS
// subtree and nothing above it. The page owns the search, the filters and the
// toolbar; a scroll tick must never reach them.
//
// Emoji are native Unicode glyphs (font characters, not images), so "lazy
// loading" here means only MOUNTING the cells near the viewport. Rows are laid
// out mathematically (fixed square cells) and only the on-screen window ±
// overscan is rendered; everything else is a spacer of pure height.

const CELL_MIN = 42       // matches the old grid's minmax(42px, 1fr)
// ON A COARSE POINTER THE FLOOR IS 44, the touch target the rest of the app
// holds (tool-shell.css floors every library control at 44 under
// `pointer:coarse`). The cells stretch to fill the row either way, so on a
// fine pointer nothing moves; on a phone or tablet a row simply carries one
// column fewer when 42 would have squeezed one more in.
const cellMin = () => (typeof window !== 'undefined' && window.matchMedia?.('(pointer:coarse)').matches ? 44 : CELL_MIN)
const CELL_GAP = 4
const HEAD_H = 42         // section header row (text + bottom breathing room)
const SECTION_GAP = 24    // extra space above each section after the first
const OVERSCAN_PX = 500   // render this much beyond the viewport each way

// Insert the tone right after the base code point, dropping an emoji-presentation
// selector (U+FE0F) that must not sit between the base and its modifier.
function toneOf(emoji, tone) {
  if (!tone) return emoji
  const cps = [...emoji]
  const rest = cps.slice(1).filter((c, i) => !(i === 0 && c.codePointAt(0) === 0xFE0F))
  return cps[0] + tone + rest.join('')
}

// ─── Glyph bitmaps ───────────────────────────────────────────────────────────
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
const SLOT = 36           // css px each glyph is drawn into (24px font plus its overhang)
const SHEET_COLS = 12
const URGENT_CHUNK = 48   // glyphs on screen: small sheets, so they arrive quickly
const BACKGROUND_CHUNK = 96

const WORKER_SOURCE = `
self.onmessage = async (e) => {
  const { gen, id, chars, scale, font, baseline, slot, slotH, cols } = e.data
  try {
    const rows = Math.ceil(chars.length / cols)
    const canvas = new OffscreenCanvas(Math.round(cols * slot * scale), Math.round(rows * slotH * scale))
    const ctx = canvas.getContext('2d')
    ctx.scale(scale, scale)
    ctx.font = font
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    for (let i = 0; i < chars.length; i++) {
      ctx.fillText(chars[i], (i % cols) * slot + slot / 2, Math.floor(i / cols) * slotH + baseline)
    }
    const blob = await canvas.convertToBlob({ type: 'image/png' })
    self.postMessage({ gen, id, blob, rows })
  } catch (err) {
    self.postMessage({ gen, id, error: String(err) })
  }
}`

const atlas = {
  gen: 0,             // bumped whenever the drawing setup changes; older replies are dropped
  config: null,       // { key, scale, font, baseline } once measured from a real cell
  dpr: 0,             // the pixel ratio that config was measured at
  sprites: new Map(), // glyph string -> { style }
  sheets: [],         // object URLs, revoked on reset
  queue: [],          // chunks waiting for the worker, front first
  current: null,      // the chunk the worker is drawing
  worker: null,
  failed: false,
  version: 0,
  listeners: new Set(),
}

const atlasSupported = () => (
  typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined' && typeof URL !== 'undefined'
  && typeof URL.createObjectURL === 'function' && typeof Blob !== 'undefined'
  && typeof OffscreenCanvas.prototype.convertToBlob === 'function'
)

function atlasEmit() {
  atlas.version++
  atlas.listeners.forEach(fn => fn())
}
const atlasSubscribe = (fn) => { atlas.listeners.add(fn); return () => atlas.listeners.delete(fn) }
const atlasVersion = () => atlas.version

function atlasFail() {
  atlas.failed = true
  atlasReset()
  if (atlas.worker) { atlas.worker.terminate(); atlas.worker = null }
}

function atlasReset() {
  atlas.gen++
  atlas.sheets.forEach(url => URL.revokeObjectURL(url))
  atlas.sheets = []
  atlas.sprites = new Map()
  atlas.queue = []
  atlas.current = null
  atlasEmit()
}

function atlasWorker() {
  if (atlas.worker) return atlas.worker
  const url = URL.createObjectURL(new Blob([WORKER_SOURCE], { type: 'text/javascript' }))
  const worker = new Worker(url)
  URL.revokeObjectURL(url)
  worker.onmessage = (e) => {
    const { gen, blob, rows, error } = e.data
    const job = atlas.current
    if (gen !== atlas.gen || !job) { if (gen === atlas.gen) atlas.current = null; atlasPump(); return }
    atlas.current = null
    if (error || !blob) { atlasFail(); return }
    const url = URL.createObjectURL(blob)
    atlas.sheets.push(url)
    const backgroundImage = `url("${url}")`
    const { slotH } = atlas.config
    const backgroundSize = `${SHEET_COLS * SLOT}px ${rows * slotH}px`
    job.chars.forEach((ch, i) => {
      atlas.sprites.set(ch, {
        style: {
          backgroundImage,
          backgroundSize,
          backgroundPosition: `${-(i % SHEET_COLS) * SLOT}px ${-Math.floor(i / SHEET_COLS) * slotH}px`,
          height: `${slotH}px`,
        },
      })
    })
    atlasEmit()
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
  const { scale, font, baseline, slotH } = atlas.config
  try {
    atlasWorker().postMessage({ gen: atlas.gen, id: job.id, chars: job.chars, scale, font, baseline, slot: SLOT, slotH, cols: SHEET_COLS })
  } catch {
    atlasFail()
  }
}

let jobId = 0
// Queue glyphs for drawing. `urgent` puts them ahead of everything waiting (they
// are on screen now); anything already drawn or in flight is skipped, and a
// glyph still sitting in a waiting background chunk is pulled forward.
function atlasWant(chars, urgent) {
  if (atlas.failed || !atlas.config) return
  const flying = atlas.current ? new Set(atlas.current.chars) : null
  const seen = new Set()
  const missing = []
  for (const ch of chars) {
    if (atlas.sprites.has(ch) || seen.has(ch) || (flying && flying.has(ch))) continue
    seen.add(ch)
    missing.push(ch)
  }
  if (!missing.length) return
  if (urgent) {
    atlas.queue = atlas.queue
      .map(job => ({ ...job, chars: job.chars.filter(ch => !seen.has(ch)) }))
      .filter(job => job.chars.length)
    const jobs = []
    for (let i = 0; i < missing.length; i += URGENT_CHUNK) jobs.push({ id: ++jobId, chars: missing.slice(i, i + URGENT_CHUNK) })
    atlas.queue = [...jobs, ...atlas.queue]
  } else {
    const queued = new Set()
    atlas.queue.forEach(job => job.chars.forEach(ch => queued.add(ch)))
    const rest = missing.filter(ch => !queued.has(ch))
    for (let i = 0; i < rest.length; i += BACKGROUND_CHUNK) atlas.queue.push({ id: ++jobId, chars: rest.slice(i, i + BACKGROUND_CHUNK) })
  }
  atlasPump()
}

// Measure how a real cell lays its glyph out, so the bitmap lands on the same
// pixels: the font the cell resolves to, and where its baseline sits inside the
// glyph's box. A zero-size inline-block rests on the baseline, which reads it
// back without guessing at font metrics. Called once the grid has a width, and
// again when the pixel ratio or a web font changes the answer.
function atlasConfigure(host) {
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
  if (!spanRect.height || !fontSize) return
  const dpr = window.devicePixelRatio || 1
  const scale = Math.round(SLOT * dpr) / SLOT
  // The bitmap box is the text's own line box plus a whole 2px margin above and
  // below, so a cell centres it with the same fractional offset it centres the
  // text with and the two round onto the pixel grid the same way. A box of any
  // other height lands a row up or down from the text it replaces.
  const slotH = Math.round(spanRect.height) + 4
  const baseline = markRect.bottom - spanRect.top + 2
  const font = `${fontSize}px ${family}`
  const key = `${scale}|${font}|${baseline.toFixed(2)}|${slotH}`
  atlas.dpr = dpr
  if (atlas.config && atlas.config.key === key) return
  atlas.config = { key, scale, font, baseline, slotH }
  atlasReset()
}

// Text → bitmap cell. `sprite` is null until the glyph has been drawn.
const EmojiCell = memo(function EmojiCell({ emoji, tone, shown, sprite, isCopied, onCopy }) {
  return (
    <button
      className={`emoji-cell${isCopied ? ' copied' : ''}${sprite ? ' has-bitmap' : ''}`}
      onClick={() => onCopy(emoji, tone)}
      title={`Copy ${shown}`}
      aria-label={sprite ? shown : undefined}
    >
      <span className="emoji-char">{shown}</span>
      {sprite && <span className="emoji-bitmap" style={sprite.style} aria-hidden="true" />}
    </button>
  )
})

// The row indices [start, end) whose box meets the band minY..maxY.
function windowOf(rows, minY, maxY) {
  let start = 0
  while (start < rows.length && rows[start].top + rows[start].h < minY) start++
  let end = start
  while (end < rows.length && rows[end].top < maxY) end++
  return { start, end }
}

const NO_WINDOW = { layout: null, start: 0, end: 0 }

export default function EmojiGrid({ groups, catalogue, skinTone, onCopy }) {
  const [copied, setCopied] = useState(null)
  const [gridW, setGridW] = useState(0)
  // Which rows are mounted, tagged with the layout they were measured against.
  const [win, setWin] = useState(NO_WINDOW)
  const winRef = useRef(win)
  // The container is held in state (a callback ref), not a ref object, because the
  // window below is worked out DURING render and needs its position.
  const [virtEl, setVirtEl] = useState(null)
  useSyncExternalStore(atlasSubscribe, atlasVersion)
  const atlasGen = atlas.gen

  // Column count + square cell size from the measured container width — the
  // same result the old CSS grid produced with repeat(auto-fill, minmax(42px,1fr)).
  const { cols, cellW } = useMemo(() => {
    const min = cellMin()
    if (!gridW) return { cols: 0, cellW: min }
    const c = Math.max(1, Math.floor((gridW + CELL_GAP) / (min + CELL_GAP)))
    return { cols: c, cellW: (gridW - (c - 1) * CELL_GAP) / c }
  }, [gridW])

  // Full vertical layout: a flat list of rows (section headers + emoji rows),
  // each with a precomputed top offset, plus the total scroll height.
  const layout = useMemo(() => {
    if (!cols) return { rows: [], height: 0 }
    const rows = []
    let y = 0
    for (const g of groups) {
      if (!g.items.length) continue
      if (y > 0) y += SECTION_GAP
      rows.push({ type: 'head', key: `h:${g.cat}`, cat: g.cat, count: g.items.length, top: y, h: HEAD_H })
      y += HEAD_H
      for (let i = 0; i < g.items.length; i += cols) {
        rows.push({ type: 'cells', key: `${g.cat}:${i}`, items: g.items.slice(i, i + cols), top: y, h: cellW })
        y += cellW + CELL_GAP
      }
      y -= CELL_GAP
    }
    return { rows, height: y }
  }, [groups, cols, cellW])

  // Track the container width (also fires when the keep-alive tab un-hides).
  useEffect(() => {
    const el = virtEl
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width
      setGridW(prev => (Math.abs(prev - w) > 0.5 ? w : prev))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [virtEl])

  // A new layout (a search, a category, a new width) gets its window in the SAME
  // render, from the scroll position as it is right now, rather than rendering
  // nothing and mounting rows in a second commit. React re-runs this render with
  // the stored value before anything reaches the screen.
  let current = win
  if (win.layout !== layout) {
    const el = virtEl
    let band = { start: 0, end: 0 }
    if (el && layout.rows.length) {
      const top = -el.getBoundingClientRect().top
      band = windowOf(layout.rows, top - OVERSCAN_PX, top + window.innerHeight + OVERSCAN_PX)
    }
    current = { layout, ...band }
    setWin(current)
  }
  useLayoutEffect(() => { winRef.current = win }, [win])

  // Window the rows against the page scroll position (rAF-throttled).
  useLayoutEffect(() => {
    const el = virtEl
    if (!el || !layout.rows.length) return undefined
    const rows = layout.rows
    let raf = 0
    const update = () => {
      raf = 0
      const top = -el.getBoundingClientRect().top
      const need = windowOf(rows, top - OVERSCAN_PX, top + window.innerHeight + OVERSCAN_PX)
      const cur = winRef.current
      if (cur.layout === layout && cur.start === need.start && cur.end === need.end) return
      const next = { layout, ...need }
      winRef.current = next
      setWin(next)
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      if (raf) cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [layout, virtEl])

  // Bitmaps: measure a real cell once the grid has a width (and again if a web
  // font lands or the pixel ratio changes, either of which can move the glyph).
  useLayoutEffect(() => {
    const host = virtEl
    if (!host || !cols) return undefined
    atlasConfigure(host)
    const reconfigure = () => atlasConfigure(host)
    // A resize fires constantly on a phone (the address bar); only a change of
    // pixel ratio (browser zoom, moving between screens) needs a new measure.
    const onResize = () => { if ((window.devicePixelRatio || 1) !== atlas.dpr) atlasConfigure(host) }
    window.addEventListener('resize', onResize)
    document.fonts?.addEventListener?.('loadingdone', reconfigure)
    return () => {
      window.removeEventListener('resize', onResize)
      document.fonts?.removeEventListener?.('loadingdone', reconfigure)
    }
  }, [cols, cellW, virtEl])

  const shownOf = useCallback((item) => (item.tone && skinTone ? toneOf(item.char, skinTone) : item.char), [skinTone])

  const visible = useMemo(() => layout.rows.slice(current.start, current.end), [layout, current.start, current.end])

  // What is on screen gets drawn first; the rest of the catalogue follows in the
  // background so a search or a category switch finds its bitmaps ready.
  useEffect(() => {
    if (!atlas.config) return
    const chars = []
    for (const row of visible) {
      if (row.type === 'cells') for (const item of row.items) chars.push(shownOf(item))
    }
    atlasWant(chars, true)
  }, [visible, shownOf, atlasGen])

  useEffect(() => {
    if (!atlas.config) return
    const chars = []
    for (const group of catalogue) for (const item of group.items) chars.push(shownOf(item))
    atlasWant(chars, false)
  }, [catalogue, shownOf, atlasGen])

  const handleCopy = useCallback((emoji, tone) => {
    const text = tone ? toneOf(emoji, skinTone) : emoji
    navigator.clipboard.writeText(text)
    onCopy(text)
    setCopied(emoji)
    setTimeout(() => setCopied(null), 1200)
  }, [onCopy, skinTone])

  return (
    // Windowed list: a relative container at full scroll height; only rows
    // inside the viewport (± overscan) are mounted, absolutely positioned.
    <div
      className="emoji-virt"
      ref={setVirtEl}
      style={{ height: layout.height, '--emoji-cell': `${cellW}px` }}
    >
      {/* THE CATEGORY HEADINGS ARE h2, NOT h3. They are the only section
          headings under this page's h1, so an h3 would step h1 to h3 with no
          h2 between it (WCAG 1.3.1). Paint is unchanged: `.emoji-vhead h2`
          sets the size, weight and tracking explicitly. */}
      {visible.map(row =>
        row.type === 'head' ? (
          <div key={row.key} className="emoji-vhead" style={{ top: row.top, height: row.h }}>
            <h2>{row.cat}</h2>
            <span className="emoji-section-count">{row.count}</span>
          </div>
        ) : (
          <div key={row.key} className="emoji-vrow" style={{ top: row.top }}>
            {row.items.map((item, i) => {
              const shown = shownOf(item)
              return (
                <EmojiCell
                  key={i}
                  emoji={item.char}
                  tone={item.tone}
                  shown={shown}
                  sprite={atlas.sprites.get(shown) || null}
                  isCopied={copied === item.char}
                  onCopy={handleCopy}
                />
              )
            })}
          </div>
        )
      )}
    </div>
  )
}
