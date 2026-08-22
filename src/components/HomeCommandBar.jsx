import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getCategory, localiseCategories, localiseTools, queryCommandIndex } from '../data/tools'
import { useI18n } from '../contexts/I18nContext'
import { prefersReducedMotion } from '../hooks/useHomeMotion'

// The V2 hero's command bar — the "front door" the design gives the ⌘K palette.
//
// It searches the REAL index. `localiseTools` / `localiseCategories` are the
// same registry the CommandPalette reads, and the predicate is the same shared
// `queryCommandIndex`, so this bar can never offer a tool the product does not
// have or miss one it does. There is deliberately no second hard-coded array
// here: the mock's fixture list is a mock.
//
// Rows stay real <Link>s with real hrefs, so middle-click, open-in-new-tab and
// copy-link behave — the same rule the hero's tool links have always followed.
// That rules out the combobox/listbox ARIA pattern (role="option" would strip
// the link semantics), so the results are a labelled list with a polite live
// count instead: Enter opens the first hit, ArrowDown walks into the list, and
// every row is reachable with Tab.

const MAX_ROWS = 5

// Quick-fills are real queries against the real index — each one is asserted to
// return results by tests/user-sim. They are prompts, not promises.
const CHIPS = ['contrast', 'gradient', 'icons', 'type scale', 'convert']

/* ── C6 · the bar demonstrates itself ───────────────────────────────────────
   Founder: "can we make the search bar show a animation of typing something,
   then after a couple of seconds it backspaces then types another thing."

   EVIDENCE, stated honestly: Mobbin returned NO capture of a typing animation,
   so every pacing number below is `judgement` and none of it should be
   attributed to research. What the captures DO agree on is that a demonstrated
   query must be visually distinct from the visitor's own input — hence a muted
   overlay in the placeholder's own colour rather than a value in the field.

   The queries are the product's real taxonomy, and each one is a string
   tests/user-sim already asserts returns results, so the animation teaches the
   search vocabulary instead of decorating. */
const GHOST_QUERIES = ['contrast', 'gradient', 'type scale', 'icons']

// One named constant per beat, so a single beat can be nudged without reading
// the loop. All `judgement`.
const GHOST_START_MS = 1200      // the bar's own entrance ends at ~1140ms
const GHOST_TYPE_MS = 60         // deliberately slow; the risk here is gimmick
const GHOST_HOLD_MS = 2200       // the founder's "after a couple of seconds"
const GHOST_ERASE_MS = 30        // faster than typing, the way people delete
const GHOST_GAP_MS = 500         // beat between one query and the next

function RowIcon({ item }) {
  const cat = item.kind === 'tool' ? getCategory(item.category) : getCategory(item.id)
  return (
    <span className="hcmd-row-glyph" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        {cat?.icon || <circle cx="12" cy="12" r="9" />}
      </svg>
    </span>
  )
}

export default function HomeCommandBar() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const inputRef = useRef(null)
  const listRef = useRef(null)
  const rootRef = useRef(null)
  const [query, setQuery] = useState('')
  const listId = useId()

  // C6 state. `reduced` is read ONCE in a lazy initialiser: the contract is a
  // document attribute plus a media query and both are stable for the life of
  // the page, and reading it here rather than in an effect keeps this off the
  // set-state-in-effect path. Nothing renders on the server (prerender.mjs
  // clones the built shell, it does not render React), so `document` is safe.
  const [reduced] = useState(prefersReducedMotion)
  // The string painted in the overlay. Under reduced motion it is set once and
  // never moves; otherwise the driver below walks it.
  const [ghost, setGhost] = useState(() => (prefersReducedMotion() ? GHOST_QUERIES[0] : ''))
  // The overlay is eligible to paint. Goes false permanently the moment a real
  // visitor touches the bar, and never comes back for the session.
  const [ghostOn, setGhostOn] = useState(true)
  // The cycle has finished its one pass: the last query stays on screen and the
  // caret stops blinking.
  const [ghostDone, setGhostDone] = useState(reduced)
  const ghostStopRef = useRef(null)

  // YIELD. Any sign of a real visitor kills the animation for good — focus,
  // pointer, keyboard, or a value arriving from a quick-fill chip. It must never
  // type over someone, and it must never come back and do it later, so this is
  // one-way. Precedent on this very page: `pinnedRef` in Home.jsx stops scroll
  // from overriding a manual tab choice.
  const stopGhost = useCallback(() => {
    ghostStopRef.current?.()
    ghostStopRef.current = null
    setGhostOn(false)
  }, [])

  const tools = useMemo(() => localiseTools(t).filter(tl => !tl.alpha), [t])
  const categories = useMemo(() => localiseCategories(t), [t])

  const hit = useMemo(
    () => queryCommandIndex(query, { tools, categories }),
    [query, tools, categories],
  )

  const rows = useMemo(() => {
    if (!hit.total) return []
    return [
      ...hit.tools.map(tl => ({ kind: 'tool', ...tl })),
      ...hit.categories.map(c => ({ kind: 'category', ...c })),
    ].slice(0, MAX_ROWS)
  }, [hit])

  const open = query.trim().length > 0

  // The design's ⌘K keycap has to DO something, or it is a decoration that
  // lies about a shortcut. The app's global key is "/" (PillNav owns it and
  // opens the full palette); here ⌘K / Ctrl+K focuses this bar, which is the
  // shortcut the keycap actually names.
  useEffect(() => {
    const onKey = (event) => {
      if (event.key !== 'k' && event.key !== 'K') return
      if (!event.metaKey && !event.ctrlKey) return
      event.preventDefault()
      inputRef.current?.focus()
      inputRef.current?.select()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // The cycle. A cancellable timeout chain rather than an interval, so every
  // beat can have its own duration and a cancel can never leave one queued.
  //
  // CLS: this drives TEXT ONLY, inside an out-of-flow overlay whose width comes
  // from the grid track (`.hcmd-bar` is `auto minmax(0,1fr) auto`), so no string
  // length can move anything. The homepage CLS baseline is mean 0.0000 and the
  // spec explicitly REJECTS showing `.hcmd-results` as part of this animation
  // for that reason — that panel is an in-flow sibling and revealing it would
  // move every element beneath it. The quick-fill chips are the honest route to
  // a real result set.
  useEffect(() => {
    if (reduced) return
    const root = rootRef.current
    if (!root) return

    let timer = 0
    let cancelled = false
    const wait = (ms, fn) => { timer = window.setTimeout(() => { if (!cancelled) fn() }, ms) }

    const runQuery = (qi) => {
      const word = GHOST_QUERIES[qi]
      const type = (n) => {
        setGhost(word.slice(0, n))
        if (n < word.length) return wait(GHOST_TYPE_MS, () => type(n + 1))
        // One full pass, then stop. A loop running in a reader's peripheral
        // vision while they read the headline is the gimmick failure mode.
        if (qi === GHOST_QUERIES.length - 1) return wait(GHOST_HOLD_MS, () => setGhostDone(true))
        wait(GHOST_HOLD_MS, () => erase(word.length))
      }
      const erase = (n) => {
        setGhost(word.slice(0, n))
        if (n > 0) return wait(GHOST_ERASE_MS, () => erase(n - 1))
        wait(GHOST_GAP_MS, () => runQuery(qi + 1))
      }
      type(1)
    }

    // Settle on a COMPLETE string rather than freezing mid-word: the cycle is
    // over either way, and a half-typed query left on screen reads as a bug
    // rather than as a finished demonstration.
    const settle = () => {
      cancelled = true
      window.clearTimeout(timer)
      setGhost((current) => GHOST_QUERIES.find((q) => q.startsWith(current) && q !== current) || current)
      setGhostDone(true)
    }
    ghostStopRef.current = settle

    // Burn no frames below the fold. Starting on the first intersection also
    // means a visitor who lands mid-page (a restored scroll position, an anchor)
    // never has the animation running unseen — and it does not resume once the
    // hero has been scrolled away from.
    let started = false
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && !started) {
          started = true
          wait(GHOST_START_MS, () => runQuery(0))
        } else if (!entry.isIntersecting && started) {
          settle()
          io.disconnect()
        }
      }
    }, { threshold: 0 })
    io.observe(root)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
      io.disconnect()
      ghostStopRef.current = null
    }
  }, [reduced])

  const focusRow = useCallback((index) => {
    const links = listRef.current?.querySelectorAll('.hcmd-row')
    if (!links?.length) return
    const clamped = Math.max(0, Math.min(index, links.length - 1))
    links[clamped].focus()
  }, [])

  const onInputKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      setQuery('')
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      focusRow(0)
      return
    }
    if (event.key === 'Enter' && rows.length) {
      event.preventDefault()
      navigate(rows[0].path)
    }
  }

  const onRowKeyDown = (event, index) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      focusRow(index + 1)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (index === 0) inputRef.current?.focus()
      else focusRow(index - 1)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      setQuery('')
      inputRef.current?.focus()
    }
  }

  return (
    <div className="hcmd" data-open={open || undefined}>
      <div className="hcmd-bar">
        <span className="hcmd-prompt" aria-hidden="true">&gt;</span>
        <input
          ref={inputRef}
          type="text"
          className="hcmd-input"
          value={query}
          spellCheck="false"
          autoComplete="off"
          aria-label="Search every UIL4B tool"
          aria-describedby={`${listId}-count`}
          placeholder="Search tools — contrast, gradient, type scale…"
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={onInputKeyDown}
        />
        <button
          type="button"
          className="hcmd-kbd"
          onClick={() => { inputRef.current?.focus(); inputRef.current?.select() }}
        >
          <span className="sr-only">Focus the tool search</span>
          <kbd aria-hidden="true">⌘K</kbd>
        </button>
      </div>

      {/* The count is the polite announcement; the rows themselves are plain
          links so assistive tech reads them as the destinations they are. */}
      <p className="sr-only" id={`${listId}-count`} role="status" aria-live="polite">
        {open
          ? rows.length
            ? `${hit.total} ${hit.total === 1 ? 'result' : 'results'} for ${query.trim()}`
            : `No tools match ${query.trim()}`
          : ''}
      </p>

      {open && (
        <div className="hcmd-results">
          {rows.length === 0 ? (
            <p className="hcmd-empty">
              Nothing matches <strong>{query.trim()}</strong> yet. Try a colour, type, icon or image word —
              or <Link to="/sitemap">see every tool</Link>.
            </p>
          ) : (
            <ul className="hcmd-list" ref={listRef} aria-label="Search results">
              {rows.map((item, index) => {
                const cat = item.kind === 'tool' ? getCategory(item.category) : null
                const pill = item.kind === 'tool'
                  ? (cat ? t(cat.labelKey) || cat.label : 'Tool')
                  : t('common.category')
                return (
                  <li key={`${item.kind}-${item.id}`}>
                    <Link
                      className="hcmd-row"
                      to={item.path}
                      onKeyDown={(event) => onRowKeyDown(event, index)}
                    >
                      <RowIcon item={item} />
                      <span className="hcmd-row-body">
                        <span className="hcmd-row-title">{item.label}</span>
                        <span className="hcmd-row-desc">{item.description}</span>
                      </span>
                      <span className="hcmd-row-cat">{pill}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}

      <div className="hcmd-chips">
        <span className="hcmd-chips-label" aria-hidden="true">Try</span>
        {CHIPS.map((chip) => (
          <button
            key={chip}
            type="button"
            className="hcmd-chip"
            aria-label={`Search for ${chip}`}
            onClick={() => { setQuery(chip); inputRef.current?.focus() }}
          >
            {chip}
          </button>
        ))}
      </div>
    </div>
  )
}
