import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getCategory, localiseCategories, localiseTools, queryCommandIndex, searchHints } from '../data/tools'
import { useI18n } from '../contexts/I18nContext'
import { useAppearance } from '../contexts/AppearanceContext'

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

// ── The typed placeholder ───────────────────────────────────────────────────
//
// The founder asked on 2026-09-03 for the nav search's typing animation to play
// here instead, on load rather than on hover, and for the "Search every tool"
// line above the bar and the "Try …" chips below it to go.
//
// Those chips were the only thing on the page telling a visitor what is
// searchable. That job does not disappear with them — it moves here, which is
// the only reason this animation is not decoration. So the terms are DERIVED
// FROM THE REGISTRY rather than written out:
//
//   • Real tools, so a visitor who types what they just watched gets hits.
//     PillNav keeps a hand-written SEARCH_HINTS array and that array is already
//     one rename away from advertising a tool that no longer exists.
//   • `/create/` only — the things you can go and make. Docs and resources are
//     findable in the bar but they are not what the hero is selling.
//   • Short labels only. "Aspect & Resolution Calculator" is 30 characters and
//     overflows the input at 390px mid-word, which reads as a bug.
//
// A term that finds nothing when typed would be a lie, so
// tests/user-sim/10-home-chaos-to-calm.spec.js types every one of them into the
// real bar and requires a result. The selection rule itself lives in
// data/tools beside the other registry helpers — see `searchHints`.

// Milliseconds per character typed and deleted, and the caret blink while a
// completed word is held. From PillNav, which the founder has already signed
// off on the feel of — this is the same animation, moved.
const TYPE_MS = 55
const ERASE_MS = 28
const BLINK_MS = 420
const HOLD_BLINKS = 3

// Nothing types until the hero has finished arriving. `.hcmd` runs its own
// entrance from .52s for .62s (global.css), so 1200ms starts the typing just
// after the bar lands rather than through it — a sequence instead of a
// collision — and keeps every one of these timers off the first-paint path.
const START_MS = 1200

// U+258F, the caret. It is a CHARACTER because the placeholder is a real
// `placeholder` attribute rather than an overlaid span: the browser then hides
// it the instant the visitor types, with no state of ours to get out of sync,
// and it can never be mistaken for the input's own value. PillNav renders an
// <i> instead because its "field" is a button with no placeholder to animate.
const CARET = '▏'

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

export default function HomeCommandBar({ labelledBy } = {}) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { reducedMotion } = useAppearance()
  const inputRef = useRef(null)
  const listRef = useRef(null)
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  // null means "not typing" — the static placeholder below is showing. Any
  // string, including an empty one, means the animation owns the placeholder.
  const [typed, setTyped] = useState(null)
  const listId = useId()

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

  const hints = useMemo(() => searchHints(tools), [tools])

  // WHAT A REDUCED-MOTION VISITOR SEES, decided rather than defaulted.
  //
  // Not the animation slowed down, and not an empty box. A character-by-
  // character reveal is animation however it is driven, and the global
  // `transition-duration:0.01ms` rule cannot reach a setState loop — so the
  // timer must not start at all. What they get instead is the same information
  // the animation exists to deliver, from the same registry-derived list, said
  // once and held still. That is the only version of this feature that anyone
  // reads at a glance anyway.
  const restingPlaceholder = useMemo(
    () => (hints.length ? `Search tools — ${hints.slice(0, 3).join(', ')}…` : 'Search every tool'),
    [hints],
  )

  // Three reasons the animation is not running, and all three are deliberate.
  //
  // `reducedMotion` — from AppearanceContext, so the in-app toggle wins over the
  // OS query in BOTH directions, the same resolution the hero entrance uses.
  // `focused` — a placeholder that keeps moving underneath a live caret is noise
  // at exactly the moment the visitor has decided to type. It also means the
  // animation never fights the visitor for the main thread mid-keystroke.
  // `query` — the placeholder is not painted at all once there is a value, so
  // the timers would be burning for nothing.
  const animating = !reducedMotion && !focused && !query

  // Every setState below happens inside a timer callback, never synchronously in
  // the effect body, and the reset happens in the cleanup. That is what keeps
  // this off the `react-hooks/set-state-in-effect` warning count, which the
  // build gate holds at a fixed number.
  //
  // The whole cycle runs inside ONE effect pass with a local index, rather than
  // advancing a `term` state and re-running. Re-running would fire this
  // cleanup between every word, and the cleanup's `setTyped(null)` would flash
  // the long resting placeholder for a frame each time a word finished.
  useEffect(() => {
    if (!animating || !hints.length) return undefined
    let cancelled = false
    let timer
    let index = 0

    const word = () => hints[index % hints.length]

    const type = (i, erasing) => {
      if (cancelled) return
      setTyped(word().slice(0, i) + CARET)
      if (!erasing && i < word().length) timer = setTimeout(() => type(i + 1, false), TYPE_MS)
      else if (!erasing) timer = setTimeout(() => blink(1), BLINK_MS)
      else if (i > 0) timer = setTimeout(() => type(i - 1, true), ERASE_MS)
      else { index += 1; timer = setTimeout(() => type(0, false), TYPE_MS) }
    }

    // The caret blinks on the completed word instead of the word simply sitting
    // there, which is the difference between "this is being typed" and "this is
    // a label that changes". Odd ticks drop the caret, even ticks restore it.
    const blink = (n) => {
      if (cancelled) return
      setTyped(n % 2 ? word() : word() + CARET)
      if (n < HOLD_BLINKS * 2) timer = setTimeout(() => blink(n + 1), BLINK_MS)
      else timer = setTimeout(() => type(word().length - 1, true), ERASE_MS)
    }

    timer = setTimeout(() => type(0, false), START_MS)
    return () => { cancelled = true; clearTimeout(timer); setTyped(null) }
  }, [animating, hints])

  const placeholder = animating && typed !== null ? typed : restingPlaceholder

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
          {...(labelledBy ? { 'aria-labelledby': labelledBy } : { 'aria-label': 'Search every UIL4B tool' })}
          aria-describedby={`${listId}-count`}
          placeholder={placeholder}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
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
    </div>
  )
}
