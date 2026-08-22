import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getCategory, localiseCategories, localiseTools, queryCommandIndex } from '../data/tools'
import { CREATE_GROUPS } from '../data/toolTree'
import { useI18n } from '../contexts/I18nContext'

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

// Counted from the tool tree at module load, so the claim can never drift from
// the product. This is the ONE honest number the deleted hero stat line carried,
// and it is here rather than there because here it is doing a job: it tells the
// reader how large the index in front of them is. Dropbox's `506 Articles —
// Page 1 of 57` is the same move.
const LIVE_TOOL_COUNT = CREATE_GROUPS
  .flatMap((g) => g.tools)
  .filter((tl) => !tl.soon).length

// Quick-fills are real queries against the real index — each one is asserted to
// return results by tests/user-sim. They are prompts, not promises.
//
// `convert` was replaced by `palette`. TWO faults, one of them measured:
//
//  1. `convert` returned NOTHING. The only entry carrying that keyword is File
//     Converter, which is `alpha: true`, and this bar filters alpha tools out —
//     so the chip had been offering a query with an empty state behind it.
//     Verified in a browser against this index, not reasoned about: `convert`
//     → "No tools match convert". The hero spec proposed renaming it to
//     `file converter`; that was checked the same way and returns nothing
//     either, for the same reason, so the rename would have kept the fault.
//     `palette` returns three. The spec's own rule decides it — "a chip that
//     returns nothing is worse than no chip".
//  2. It was the only verb among four nouns, which is the kind of small
//     unevenness that reads as generated. All five are nouns now.
//
// None of the five is printed in the placeholder any more, which was the other
// half of the same tell: the old placeholder named contrast, gradient and type
// scale, so three of the five chips were redundant with the field above them.
const CHIPS = ['contrast', 'gradient', 'icons', 'type scale', 'palette']

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
  const [query, setQuery] = useState('')
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
          aria-label="Search every UIL4B tool"
          aria-describedby={`${listId}-count`}
          placeholder={`Search ${LIVE_TOOL_COUNT} live tools`}
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
