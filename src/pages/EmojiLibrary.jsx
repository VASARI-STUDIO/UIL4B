import { useState, useMemo, useCallback, useEffect, useRef, memo } from 'react'
import usePopover from '../hooks/usePopover'
import LibraryToolbar from '../components/library/LibraryToolbar'
import LibraryFilterGroup from '../components/library/LibraryFilterGroup'
import { EMOJI_DATA } from '../data/emojiData'
import { normaliseQuery, searchEmoji } from '../data/emojiSearch'
import { getLoadedEmojiIndex, loadEmojiIndex } from '../data/emojiIndexLoader'
// The stylesheet families this surface needs, split out of the one
// render-blocking global sheet (see src/styles/deferred/). They ride this
// route's own lazy chunk, so they arrive with it and never with the homepage.
import '../styles/deferred/library.css'
import '../styles/deferred/tool-shell.css'

function parseEmojis(str) {
  return str.split(/\s+/).filter(Boolean)
}

// Emoji_Modifier_Base — the code points that accept a Fitzpatrick skin-tone
// modifier (Unicode 15). Anything outside this set (or any ZWJ sequence) is
// shown and copied unchanged, so we never emit a broken base-plus-swatch pair
// (e.g. a car followed by a floating skin square).
const MODIFIER_BASE = new Set()
const MODIFIER_RANGES = [
  [0x261D, 0x261D], [0x26F9, 0x26F9], [0x270A, 0x270D],
  [0x1F385, 0x1F385], [0x1F3C2, 0x1F3C4], [0x1F3C7, 0x1F3C7], [0x1F3CA, 0x1F3CC],
  [0x1F442, 0x1F443], [0x1F446, 0x1F450], [0x1F466, 0x1F478], [0x1F47C, 0x1F47C],
  [0x1F481, 0x1F483], [0x1F485, 0x1F487], [0x1F48F, 0x1F48F], [0x1F491, 0x1F491],
  [0x1F4AA, 0x1F4AA], [0x1F574, 0x1F575], [0x1F57A, 0x1F57A], [0x1F590, 0x1F590],
  [0x1F595, 0x1F596], [0x1F645, 0x1F647], [0x1F64B, 0x1F64F], [0x1F6A3, 0x1F6A3],
  [0x1F6B4, 0x1F6B6], [0x1F6C0, 0x1F6C0], [0x1F6CC, 0x1F6CC], [0x1F90C, 0x1F90C],
  [0x1F90F, 0x1F90F], [0x1F918, 0x1F91F], [0x1F926, 0x1F926], [0x1F930, 0x1F939],
  [0x1F93D, 0x1F93E], [0x1F977, 0x1F977], [0x1F9B5, 0x1F9B6], [0x1F9BB, 0x1F9BB],
  [0x1F9CD, 0x1F9CF], [0x1F9D1, 0x1F9DD], [0x1FAC3, 0x1FAC5], [0x1FAF0, 0x1FAF8],
]
MODIFIER_RANGES.forEach(([a, b]) => { for (let c = a; c <= b; c++) MODIFIER_BASE.add(c) })

function supportsSkinTone(emoji) {
  if (!emoji) return false
  const cps = [...emoji]
  if (cps.some(c => c.codePointAt(0) === 0x200D)) return false   // ZWJ sequence → skip (v1)
  return MODIFIER_BASE.has(cps[0].codePointAt(0))
}

// Insert the tone right after the base code point, dropping an emoji-presentation
// selector (U+FE0F) that must not sit between the base and its modifier.
function toneOf(emoji, tone) {
  if (!tone) return emoji
  const cps = [...emoji]
  const rest = cps.slice(1).filter((c, i) => !(i === 0 && c.codePointAt(0) === 0xFE0F))
  return cps[0] + tone + rest.join('')
}

// EMOJI_DATA is fully static, so parse every group and flag each emoji's
// skin-tone support exactly once at module load. Rendering is then a pure lookup
// — no per-cell code-point spreading on every scroll, keystroke, or copy.
const PARSED_EMOJI_DATA = EMOJI_DATA.map(g => ({
  cat: g.cat,
  items: parseEmojis(g.emojis).map(char => ({ char, tone: supportsSkinTone(char) })),
}))
const TOTAL_COUNT = PARSED_EMOJI_DATA.reduce((sum, g) => sum + g.items.length, 0)

const TONES = ['', '\u{1F3FB}', '\u{1F3FC}', '\u{1F3FD}', '\u{1F3FE}', '\u{1F3FF}']
const CAT_ICONS = {
  Smileys: '😀', Hands: '👋', People: '🧑', Animals: '🐻', Food: '🍔', Activities: '⚽',
  Travel: '✈️', Objects: '💡', Symbols: '❤️', Flags: '🚩', Nature: '🌿',
}
// Built once at module scope: the options are a pure function of static data,
// and rebuilding them per render would hand LibraryFilterGroup a new array
// identity on every keystroke and re-measure its sliding indicator.
//
// `id: 'all'` rather than `null` — LibraryFilterGroup compares option ids, and
// the component keeps `activeCat` as `null` for "no filter" because that is
// what the rest of this file already means by it. The two are bridged at the
// call site, not by changing either convention.
const CATEGORY_OPTIONS = [
  { id: 'all', label: 'All', count: TOTAL_COUNT.toLocaleString() },
  ...PARSED_EMOJI_DATA.map((g) => ({
    id: g.cat,
    label: g.cat,
    icon: CAT_ICONS[g.cat],
    count: g.items.length,
  })),
]


// ─── Virtualiser geometry ───
// Emoji are native Unicode glyphs (font characters, not images), so "lazy
// loading" here means only MOUNTING the cells near the viewport. Rows are laid
// out mathematically (fixed square cells) and only the on-screen window ±
// overscan is rendered; everything else is two spacer regions of pure height.
const CELL_MIN = 42       // matches the old grid's minmax(42px, 1fr)
// ON A COARSE POINTER THE FLOOR IS 44, the touch target the rest of the app
// holds (tool-shell.css floors every library control at 44 under
// `pointer:coarse`). The cells stretch to fill the row either way, so on a
// fine pointer nothing moves; on a phone or tablet a row simply carries one
// column fewer when 42 would have squeezed one more in. Measured before this:
// 42x42 at 768 on a touch device, under the floor on every cell of the grid.
const cellMin = () => (typeof window !== 'undefined' && window.matchMedia?.('(pointer:coarse)').matches ? 44 : CELL_MIN)
const CELL_GAP = 4
const HEAD_H = 42         // section header row (text + bottom breathing room)
const SECTION_GAP = 24    // extra space above each section after the first
const OVERSCAN_PX = 500   // render this much beyond the viewport each way

// One memoised cell so a copy (which flips `copied` on the parent) re-renders
// only the two affected cells, not the whole visible window. Props are compared
// by value, so `shown` only changes when the skin tone actually changes.
const EmojiCell = memo(function EmojiCell({ emoji, shown, isCopied, onCopy }) {
  return (
    <button
      className={`emoji-cell${isCopied ? ' copied' : ''}`}
      onClick={() => onCopy(emoji)}
      title={`Copy ${shown}`}
    >
      <span className="emoji-char">{shown}</span>
    </button>
  )
})

export default function EmojiLibrary({ onCopy }) {
  const [search, setSearch] = useState('')
  const [activeCat, setActiveCat] = useState(null)
  const [copied, setCopied] = useState(null)
  const [skinTone, setSkinTone] = useState('')
  const [toneOpen, setToneOpen] = useState(false)
  const [gridW, setGridW] = useState(0)
  const [range, setRange] = useState({ start: 0, end: 0 })
  // The search index is a separate chunk. Seeded from the loader's cache so a
  // second search in the same session is ready on the first render, with no
  // loading flash for an index that is already in memory.
  const [index, setIndex] = useState(getLoadedEmojiIndex)
  const [indexState, setIndexState] = useState(() => (getLoadedEmojiIndex() ? 'ready' : 'idle'))
  const virtRef = useRef(null)
  // The skin-tone popover is a non-modal disclosure like every other popover
  // in the app, so it takes the shared contract (Escape, outside press,
  // focus in, tab out) — and, the reason it moved here: EDGE FLIPPING. Its
  // trigger is the last control in the toolbar, hard against the right
  // margin on any desktop, and the panel was `left:0` on the trigger. At
  // 1280 the six tones needed 250px from x=1179, so the fourth was cut in
  // half and the last two were outside the viewport (measured 2026-09-09,
  // both themes; the same at 1440 and 1920). placePopover hangs the panel
  // off whichever edge of the trigger has room.
  const closeTone = useCallback(() => setToneOpen(false), [])
  const { triggerRef: toneTriggerRef, popRef: tonePopRef } = usePopover(toneOpen, closeTone, { arrowNav: true })

  const query = normaliseQuery(search)

  // Fetch the index. Called on focus, so it is normally resolved before the
  // first keystroke, and again on each keystroke as a backstop for anyone who
  // reaches the field without a focus event — paste, autofill, or a browser
  // restoring the value on back-navigation. Repeat calls are free: the loader
  // caches the promise.
  const requestIndex = useCallback(() => {
    if (getLoadedEmojiIndex()) return
    setIndexState('loading')
    loadEmojiIndex().then(
      (loaded) => { setIndex(loaded); setIndexState('ready') },
      // "You are offline" and "that request failed" get different messages and
      // different recovery. Both beat a search box that silently does nothing.
      () => setIndexState(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'error'),
    )
  }, [])

  // A search produces ONE flat ranked list, not categories. Re-grouping ranked
  // results by category would bury the best match again — the exact fault this
  // replaces, where "thumbs up" returned all 61 Hands in catalogue order.
  const results = useMemo(() => {
    const base = activeCat ? PARSED_EMOJI_DATA.filter(g => g.cat === activeCat) : PARSED_EMOJI_DATA
    if (!query) return { groups: base, count: base.reduce((sum, g) => sum + g.items.length, 0) }
    if (!index) return { groups: [], count: 0 }
    const items = searchEmoji(base, index, query)
    return { groups: items.length ? [{ cat: 'Results', items }] : [], count: items.length }
  }, [query, activeCat, index])

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
    for (const g of results.groups) {
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
  }, [results, cols, cellW])

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
  useEffect(() => {
    const el = virtRef.current
    if (!el || !layout.rows.length) return
    let raf = 0
    const update = () => {
      raf = 0
      const rect = el.getBoundingClientRect()
      const minY = -rect.top - OVERSCAN_PX
      const maxY = -rect.top + window.innerHeight + OVERSCAN_PX
      const rows = layout.rows
      let start = 0
      while (start < rows.length && rows[start].top + rows[start].h < minY) start++
      let end = start
      while (end < rows.length && rows[end].top < maxY) end++
      // Functional update keeps the identity stable when the window hasn't moved,
      // so scroll ticks that land in the same row range never re-render.
      setRange(cur => (cur.start === start && cur.end === end ? cur : { start, end }))
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
  }, [layout])

  // Offline is recoverable without the user doing anything: when the network
  // returns, fetch the index they already asked for. The Try again button stays
  // for the failed-request case, which coming back online will not fix.
  useEffect(() => {
    if (indexState !== 'offline') return
    const retry = () => requestIndex()
    window.addEventListener('online', retry)
    return () => window.removeEventListener('online', retry)
  }, [indexState, requestIndex])

  const handleCopy = useCallback((emoji) => {
    const text = supportsSkinTone(emoji) ? toneOf(emoji, skinTone) : emoji
    navigator.clipboard.writeText(text)
    onCopy(text)
    setCopied(emoji)
    setTimeout(() => setCopied(null), 1200)
  }, [onCopy, skinTone])

  return (
    <div className="sec">
      {/* NO STANDALONE MASTHEAD. Both libraries used to carry one behind
          `{!embedded && ...}` — an eyebrow, an h1 and the subtitle — for a
          route that has not existed since the two were merged: the ONLY import
          of this module is IconEmojiLibrary.jsx, which mounts it inside the
          shared `DiscoverGalleryHero` and passed `embedded` unconditionally.
          Verify with
            grep -rn "from './IconLibrary'" src
            grep -rn "from './EmojiLibrary'" src
          Unreachable, and not inert: the block kept a second copy of the h1 and
          subtitle that the wrapper owns, which is a drift bug waiting for the
          next copy change, and the eyebrow was `sec-h-eyebrow` — the exact
          element the founder marked "AI" and #382 deleted from every tool
          masthead it reached. A retired motif that cannot be rendered still
          reads as live code to the next person to open the file. */}

      {/* THE SHARED BROWSE LANGUAGE. This was the fourth implementation of a
          Library toolbar — `.pl-toolbar` with `.pl-search-wrap` (borrowed from
          the Prompt Library) and outlined `.pl-chip` pills — while the Palette
          and Gradient libraries had already converged on
          src/components/library/. Founder request: make this and the Icon
          Library match the galleries.

          Two things the shared components did not do, and now do, rather than
          being dropped to force a match: the search field takes an `onFocus`
          (this surface preloads its index chunk there, so it is ready before
          the first keystroke) and a filter option takes an `icon` and a
          `count`. Both are aria-hidden decoration over an unchanged
          accessible name. */}
      <LibraryToolbar
        className="emoji-toolbar"
        quick={0}
        activeFilters={activeCat ? 1 : 0}
        search={{
          value: search,
          onChange: (next) => { setSearch(next); requestIndex() },
          onFocus: requestIndex,
          placeholder: 'Search emoji by name or keyword…',
          label: 'Search emoji',
        }}
        action={(
          <>
          {/* Skin tone lives in a compact popover instead of six inline buttons —
              one control in the toolbar, the choices on demand. */}
          <div className="emoji-tone-wrap">
            <button
              ref={toneTriggerRef}
              type="button"
              className={`emoji-tone-btn${toneOpen ? ' open' : ''}`}
              onClick={() => setToneOpen(o => !o)}
              aria-haspopup="true"
              aria-expanded={toneOpen}
              title="Skin tone"
              aria-label="Choose skin tone"
            >
              <span className="emoji-tone-current">{skinTone ? `👋${skinTone}` : '👋'}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
            </button>
            {toneOpen && (
              <div ref={tonePopRef} className="emoji-tone-pop" role="menu" aria-label="Skin tone" tabIndex={-1}>
                {TONES.map((tone, i) => (
                  <button
                    key={i}
                    type="button"
                    role="menuitemradio"
                    aria-checked={skinTone === tone}
                    className={`emoji-skin-btn${skinTone === tone ? ' active' : ''}`}
                    onClick={() => { setSkinTone(tone); setToneOpen(false) }}
                    title={i === 0 ? 'Default' : `Skin tone ${i}`}
                    aria-label={i === 0 ? 'Default skin tone' : `Skin tone ${i}`}
                  >
                    {i === 0 ? '👋' : `👋${tone}`}
                  </button>
                ))}
              </div>
            )}
          </div>
          </>
        )}
      >
        {/* A MENU, at every width — the same call the Palette Library's mood
            facet already makes, and for the same measured reason. Twelve
            categories, each carrying a glyph, a label and a count, is the
            largest tray in the app: its intrinsic width is 1478px, so the
            `overflows` path below 981px collapses it on every desktop already.
            But that path is switched off under 641px by design (#298), and
            THAT is where it was costing the most.

            MEASURED at 844px tall, light, before this prop: the tray alone was
            290px in SEVEN rows at 320 and 249px in six rows at 390, taking the
            toolbar to 414px — 49% of a small phone's viewport — and pushing the
            first emoji cell to y=969 at 320 and y=912 at 390. ZERO emoji were
            on the first screen at 320, 360, 390 or 430. An emoji library that
            shows no emoji until you scroll past six rows of chips has stopped
            doing its job on the device most likely to want it.

            The precedent is exact: `alwaysCollapsed` exists because nine moods
            took the Palette Library's toolbar to 314px at 320 and 273px at 390,
            and the rule it settled was that a facet with nine or more values is
            a labelled control that opens a list rather than a row of chips that
            is a row of chips at some widths. Twelve is past that line.

            This also REMOVES a shape change rather than adding one: at 768 and
            above the group was already collapsed by the measured path, so the
            phone now matches every other width instead of disagreeing with it.
            The menu renders the SAME option buttons, so the glyph and the count
            on each category survive, and the trigger states the current choice
            ("Category · Smileys"), so nothing is hidden. */}
        <LibraryFilterGroup
          label="Filter by category"
          triggerLabel="Category"
          value={activeCat ?? 'all'}
          onChange={(id) => setActiveCat(id === 'all' ? null : id)}
          options={CATEGORY_OPTIONS}
          alwaysCollapsed
        />
      </LibraryToolbar>

      {/* THE 1,655-CELL GRID WAS IN NO LANDMARK.

          Measured 2026-09-15 on the built preview, signed out, walking
          Chrome's accessibility tree from the root through childIds
          (Accessibility.getFullAXTree; the flat array is not in document
          order). /create/emoji reported four landmarks —
          navigation("Primary") | main | contentinfo | navigation("Footer") —
          and none of them named content, on a surface that renders 391 cells
          into the viewport out of 1,655 and offers 122 tab stops at 390px.
          The tabpanel this component mounts inside is named ("Emoji"), but a
          tabpanel is not a landmark, so it does not appear in the list a
          reader navigates by region with.

          Same shape as the fix on /create/font-gallery in this commit, and
          for the same reason it wraps the STATUS LINE AND EVERY ARM — grid,
          loading, offline, empty. A region around the grid alone disappears
          the moment a search matches nothing, which is the fault that was
          fixed on /discover/palettes: the landmark describing the results
          would vanish at exactly the moment a reader is trying to find out
          why there are none. Searching "zzzzqqq" now moves the list from
          region("Showing all 1655 emojis") to region("0 emojis for zzzzqqq")
          rather than from one region to none.

          NAMED FROM THE STATUS LINE THAT WAS ALREADY THERE, which is derived
          from the filtered set — no sentence was written for it. The h1 above
          belongs to the shared Icon/Emoji wrapper and carries no id to point
          at, and this component has no heading of its own except the category
          bands inside the list. */}
      <section className="emoji-results" aria-labelledby="emoji-search-status">
        {/* Windowed list: a relative container at full scroll height; only rows
            inside the viewport (± overscan) are mounted, absolutely positioned. */}
        <div
          className="emoji-virt"
          ref={virtRef}
          style={{ height: layout.height, '--emoji-cell': `${cellW}px` }}
        >
          {/* THE CATEGORY HEADINGS ARE h2, AND THEY WERE h3.
              They are the only section headings under this page's h1, so every
              rendered cell of this surface stepped h1 to h3 with no h2 between
              it — measured 2026-09-11 at 320/390/430/768/1024/1097/1120/1136/
              1280/1440/1920 in both themes and with reduced motion on and off:
              30 of 30 cells reported the jump. A screen reader's heading list is
              the fastest way through a 1,655-cell grid of unlabelled buttons,
              and a skipped level tells that reader a level exists which they
              have somehow missed. WCAG 1.3.1.

              Paint is unchanged: `.emoji-vhead h3` in global.css set the size,
              weight and tracking explicitly and moves to h2 with the tag, and
              the universal reset at the top of that file already zeroes the UA
              margin either tag would otherwise carry. */}
          {layout.rows.slice(range.start, range.end).map(row =>
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
                    shown={item.tone && skinTone ? toneOf(item.char, skinTone) : item.char}
                    isCopied={copied === item.char}
                    onCopy={handleCopy}
                  />
                ))}
              </div>
            )
          )}
        </div>

        {/* Always rendered so the input's aria-describedby always resolves, and
            so a screen reader hears the result count — which the grid, being a
            wall of unlabelled buttons, does not otherwise convey. */}
        <p id="emoji-search-status" className="sr-only" role="status" aria-live="polite">
          {!query
            ? `Showing all ${results.count} emojis`
            : index
              ? `${results.count} ${results.count === 1 ? 'emoji' : 'emojis'} for ${query}`
              // Without these two the region announced "Loading emoji names"
              // underneath a visible failure alert, which contradicts it.
              : indexState === 'offline'
                ? 'Search unavailable while offline'
                : indexState === 'error'
                  ? 'Emoji names could not be loaded'
                  : 'Loading emoji names'}
        </p>

        {/* Loading — the index chunk is in flight. */}
        {query && !index && indexState === 'loading' && (
          <div className="lib-loading" role="status" aria-live="polite">
            <div className="fg-loader" />
            <strong>Looking up emoji names</strong>
            <span>Searching {TOTAL_COUNT} emojis by name and keyword.</span>
          </div>
        )}

        {/* Offline / error — browsing by category still works without the index,
            so say that rather than implying the whole surface is broken. */}
        {query && !index && (indexState === 'offline' || indexState === 'error') && (
          <div className="pl-empty" role="alert">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p>
              {indexState === 'offline'
                ? 'You are offline, so emoji names could not be loaded.'
                : 'Emoji names could not be loaded, so search is unavailable.'}
              {' '}Browsing by category still works.
            </p>
            <button type="button" className="emoji-retry-btn" onClick={requestIndex}>Try again</button>
          </div>
        )}

        {/* Empty — the index is loaded and genuinely matched nothing. */}
        {query && index && results.count === 0 && (
          <div className="pl-empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <p>
              No emoji found for &ldquo;{search.trim()}&rdquo;
              {activeCat ? ` in ${activeCat}` : ''}
            </p>
            {activeCat && (
              <button type="button" className="emoji-retry-btn" onClick={() => setActiveCat(null)}>
                Search all categories
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
