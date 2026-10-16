import { useState, useMemo, useCallback, useEffect, useLayoutEffect, useRef, memo } from 'react'

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
// The window is kept at least this far beyond the viewport each way. A cell
// costs a layout and a paint whether or not anyone sees it, so the margin is
// small.
const OVERSCAN_PX = 150
// When the margin runs out the window is refilled to this distance rather than
// extended by one row, so the grid commits a few rows every few frames instead
// of one row every frame. Many small commits keep invalidating the painted
// tiles next to the viewport; fewer, larger ones do not. Measured: refilling to
// 600 or more brought the repaint cost back.
const REFILL_PX = 400
// A commit that needs more than this many NEW cells is split: the rows in the
// viewport mount at once, the overscan follows a few frames later.
const FRAME_CELLS = 200

// Insert the tone right after the base code point, dropping an emoji-presentation
// selector (U+FE0F) that must not sit between the base and its modifier.
function toneOf(emoji, tone) {
  if (!tone) return emoji
  const cps = [...emoji]
  const rest = cps.slice(1).filter((c, i) => !(i === 0 && c.codePointAt(0) === 0xFE0F))
  return cps[0] + tone + rest.join('')
}

// One memoised cell so a copy (which flips `copied` on the grid) re-renders
// only the two affected cells, not the whole visible window. Props are compared
// by value, so `shown` only changes when the skin tone actually changes.
const EmojiCell = memo(function EmojiCell({ emoji, tone, shown, isCopied, onCopy }) {
  return (
    <button
      className={`emoji-cell${isCopied ? ' copied' : ''}`}
      onClick={() => onCopy(emoji, tone)}
      title={`Copy ${shown}`}
    >
      <span className="emoji-char">{shown}</span>
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
const NO_ROWS = []

// ─── Idle glyph warm-up ───
// The first time a glyph is laid out the browser has to find a font for it and
// shape it, about 0.6 ms each. A category switch or a long search result mounts
// hundreds of glyphs nobody has laid out yet, and that cost lands inside one
// commit. Laying the same glyphs out early, a few at a time in idle time and in
// a box nobody sees, moves the cost out of the commit. Glyphs already done this
// session are remembered, so each is shaped once.
const WARM_BATCH = 8
const warmedGlyphs = new Set()

// requestIdleCallback where it exists, a short timer otherwise. Both hand the
// callback a `timeRemaining()` so the loop stops when the slice is spent.
function scheduleIdle(callback) {
  if (typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(callback, { timeout: 2000 })
    return () => window.cancelIdleCallback(id)
  }
  const id = setTimeout(() => {
    const end = performance.now() + 8
    callback({ timeRemaining: () => Math.max(0, end - performance.now()) })
  }, 60)
  return () => clearTimeout(id)
}

// What the glyphs mounted next will be, in the order they are likely to be
// wanted: the groups on screen first (a scroll reaches them next), then the
// rest of the catalogue (a category switch or a search can reach any of it).
function useGlyphWarmup(hostRef, groups, catalogue, active) {
  useEffect(() => {
    const host = hostRef.current
    if (!active || !host) return undefined
    let queue = null
    let at = 0
    let cancel = null

    const pump = (deadline) => {
      if (!queue) {
        queue = []
        const seen = new Set()
        for (const list of [groups, catalogue]) {
          for (const group of list) {
            for (const item of group.items) {
              if (warmedGlyphs.has(item.char) || seen.has(item.char)) continue
              seen.add(item.char)
              queue.push(item.char)
            }
          }
        }
      }
      while (at < queue.length) {
        const batch = queue.slice(at, at + WARM_BATCH)
        at += batch.length
        // Space-separated so each glyph is its own word, the unit the browser
        // caches shaping by, exactly as a cell holds it.
        host.textContent = batch.join(' ')
        // Reading a size is what forces the layout that shapes the batch.
        void host.offsetWidth
        for (const char of batch) warmedGlyphs.add(char)
        if (deadline.timeRemaining() <= 6) break
      }
      host.textContent = ''
      cancel = at < queue.length ? scheduleIdle(pump) : null
    }

    cancel = scheduleIdle(pump)
    return () => {
      if (cancel) cancel()
      host.textContent = ''
    }
  }, [hostRef, groups, catalogue, active])
}

export default function EmojiGrid({ groups, catalogue, skinTone, onCopy }) {
  const [copied, setCopied] = useState(null)
  const [gridW, setGridW] = useState(0)
  // Which rows are mounted, tagged with the layout they were measured against.
  // A layout change (new search, new category, new width) renders no rows until
  // the layout effect below has measured the new one, in the same commit and
  // before paint, so a stale range is never mounted against rows it does not
  // describe.
  const [win, setWin] = useState(NO_WINDOW)
  const winRef = useRef(win)
  const virtRef = useRef(null)
  const warmRef = useRef(null)

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
    const el = virtRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width
      setGridW(prev => (Math.abs(prev - w) > 0.5 ? w : prev))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Window the rows against the page scroll position (rAF-throttled).
  //
  // Scrolling by a row or two mounts the new rows in one commit. A jump (a new
  // layout, a long drag) would mount a whole screen plus overscan in one go, so
  // that case commits the rows inside the viewport first and lets the overscan
  // grow outward a few rows per frame until it reaches the target.
  useLayoutEffect(() => {
    const el = virtRef.current
    if (!el || !layout.rows.length) return undefined
    const rows = layout.rows
    const perFrame = Math.max(3, Math.ceil(FRAME_CELLS / Math.max(1, cols)))
    let scrollRaf = 0
    let growRaf = 0

    const commit = (start, end) => {
      const cur = winRef.current
      // Same range, same layout: keep the identity so the tick re-renders nothing.
      if (cur.layout === layout && cur.start === start && cur.end === end) return
      const next = { layout, start, end }
      winRef.current = next
      setWin(next)
    }

    const grow = (target) => {
      growRaf = 0
      const cur = winRef.current
      if (cur.layout !== layout) return
      const step = Math.ceil(perFrame / 2)
      const start = Math.max(target.start, cur.start - step)
      const end = Math.min(target.end, cur.end + step)
      commit(start, end)
      if (start > target.start || end < target.end) growRaf = requestAnimationFrame(() => grow(target))
    }

    const update = () => {
      scrollRaf = 0
      if (growRaf) { cancelAnimationFrame(growRaf); growRaf = 0 }
      const top = -el.getBoundingClientRect().top
      const vh = window.innerHeight
      const cur = winRef.current
      const need = windowOf(rows, top - OVERSCAN_PX, top + vh + OVERSCAN_PX)
      if (cur.layout === layout && cur.start <= need.start && cur.end >= need.end) return
      const target = windowOf(rows, top - REFILL_PX, top + vh + REFILL_PX)
      let mounted = 0
      if (cur.layout === layout) {
        mounted = Math.max(0, Math.min(cur.end, target.end) - Math.max(cur.start, target.start))
      }
      if (target.end - target.start - mounted <= perFrame) {
        commit(target.start, target.end)
        return
      }
      const core = windowOf(rows, top, top + vh)
      const start = Math.min(Math.max(core.start, target.start), target.end)
      const end = Math.max(start, Math.min(core.end, target.end))
      commit(start, end)
      growRaf = requestAnimationFrame(() => grow(target))
    }

    const onScroll = () => { if (!scrollRaf) scrollRaf = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      if (scrollRaf) cancelAnimationFrame(scrollRaf)
      if (growRaf) cancelAnimationFrame(growRaf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [layout, cols])

  useGlyphWarmup(warmRef, groups, catalogue, cols > 0)

  const handleCopy = useCallback((emoji, tone) => {
    const text = tone ? toneOf(emoji, skinTone) : emoji
    navigator.clipboard.writeText(text)
    onCopy(text)
    setCopied(emoji)
    setTimeout(() => setCopied(null), 1200)
  }, [onCopy, skinTone])

  const visible = win.layout === layout ? layout.rows.slice(win.start, win.end) : NO_ROWS

  return (
    <>
      {/* Windowed list: a relative container at full scroll height; only rows
          inside the viewport (± overscan) are mounted, absolutely positioned. */}
      <div
        className="emoji-virt"
        ref={virtRef}
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
              {row.items.map((item, i) => (
                <EmojiCell
                  key={i}
                  emoji={item.char}
                  tone={item.tone}
                  shown={item.tone && skinTone ? toneOf(item.char, skinTone) : item.char}
                  isCopied={copied === item.char}
                  onCopy={handleCopy}
                />
              ))}
            </div>
          )
        )}
      </div>
      {/* Where the idle warm-up lays glyphs out. Never seen, never read. */}
      <div className="emoji-warm" ref={warmRef} aria-hidden="true" />
    </>
  )
}
