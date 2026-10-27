import { useState, useMemo, useCallback, useEffect, useLayoutEffect, useRef, useSyncExternalStore, memo } from 'react'
import { atlas, atlasPending, atlasSubscribe, atlasVersion, atlasConfigure, atlasMounted, atlasWant, atlasWarm, atlasTrim, nearestFirst } from './emojiAtlas'

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

// Placeholder → bitmap cell. `sprite` is null until the glyph has been drawn;
// `pending` says a bitmap is still coming, so the cell shows a quiet placeholder
// instead of laying out live colour text. With neither (a glyph that stays text,
// a failed or unsupported atlas) the cell shows the real text. The label is the
// glyph in every case: the text is hidden in two of the three, and a hidden
// element gives the button no name of its own.
const EmojiCell = memo(function EmojiCell({ emoji, tone, shown, sprite, pending, isCopied, onCopy }) {
  return (
    <button
      className={`emoji-cell${isCopied ? ' copied' : ''}${sprite ? ' has-bitmap' : ''}${pending ? ' pending' : ''}`}
      onClick={() => onCopy(emoji, tone)}
      title={`Copy ${shown}`}
      aria-label={sprite || pending ? shown : undefined}
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
  const atlasVer = useSyncExternalStore(atlasSubscribe, atlasVersion)
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
  // background, as far as the memory budget allows, so a search or a category
  // switch finds its bitmaps ready. Sheets nobody needs (an old skin tone, or
  // past the budget) are dropped.
  // Glyphs with no skin tone come first and the toned ones after, so the
  // background sheets hold one kind each: a tone change then leaves whole sheets
  // unused (dropped at once) rather than every sheet half stale.
  const wanted = useMemo(() => {
    const plain = []
    const toned = []
    for (const group of catalogue) for (const item of group.items) (item.tone ? toned : plain).push(shownOf(item))
    return plain.concat(toned)
  }, [catalogue, shownOf])

  // The glyphs in the mounted rows, and for each the row it sits in.
  const visibleCells = useMemo(() => {
    const chars = []
    const rowOf = []
    for (const row of visible) {
      if (row.type === 'cells') for (const item of row.items) { chars.push(shownOf(item)); rowOf.push(row) }
    }
    return { chars, rowOf }
  }, [visible, shownOf])
  const visibleChars = visibleCells.chars

  const visibleSet = useMemo(() => new Set(visibleChars), [visibleChars])

  // The atlas re-renders this grid for a worker reply only when the reply holds
  // a glyph mounted here; layout effect, so it is set in the commit that mounts.
  useLayoutEffect(() => {
    atlasMounted(visibleSet)
    return () => atlasMounted(new Set())
  }, [visibleSet])

  // Drawn nearest the viewport first: the mounted band reaches 500px past the
  // screen each way, and the glyphs on screen must not queue behind the ones above.
  useEffect(() => {
    if (!atlas.config || !virtEl) return
    atlasWant(nearestFirst(visibleCells, -virtEl.getBoundingClientRect().top, window.innerHeight))
  }, [visibleCells, virtEl, atlasGen])

  useEffect(() => {
    if (!atlas.config) return
    atlasTrim(visibleSet, wanted)
    atlasWarm(wanted)
  }, [visibleSet, wanted, atlasGen, atlasVer])

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
              const sprite = atlas.sprites.get(shown) || null
              return (
                <EmojiCell
                  key={i}
                  emoji={item.char}
                  tone={item.tone}
                  shown={shown}
                  sprite={sprite}
                  pending={!sprite && atlasPending(shown)}
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
