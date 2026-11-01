import { useId, useRef, useState } from 'react'

// The gallery's control block: search, and in the list state the three
// questions that narrow it (Category, Sort, Access).
//
// Presentational. The page owns the state and hands in:
//   search   { value, onChange, label }   always shown
//   filters  null (overview, My Prompts) or
//            { categories: [{ slug, label, count }], allCount, activeSlug,
//              onCategory(slug | null), sort, onSort(id), access, onAccess(id),
//              activeCount, resultCount }
//
// Category is a row of chips that each carry the number they return under the
// current Access choice. Sort and Access are segmented controls at the chip's
// 44px height. All three are native radio groups, so arrow keys, focus and the
// accessible names come from the platform.
//
// At 640px and below the three groups sit behind a "Filters (n)" button and
// open inline, pushing the content down: no overlay, nothing sticky, and the
// toolbar never wraps to a second line. The groups stay in the DOM when
// closed (hidden by CSS only below 641px), so resizing across the breakpoint
// loses nothing.

const SORT_OPTIONS = [
  { id: 'popular', label: 'Popular' },
  { id: 'new', label: 'Newest' },
]

const ACCESS_OPTIONS = [
  { id: 'all', label: 'Any' },
  { id: 'free', label: 'Free' },
  { id: 'pro', label: 'Pro' },
]

function Radio({ name, value, checked, onChange, children }) {
  return (
    <label className="pl-opt">
      <input type="radio" name={name} value={value} checked={checked} onChange={() => onChange(value)} />
      <span>{children}</span>
    </label>
  )
}

function Count({ n }) {
  return <span className="pl-opt-n">{n}<span className="sr-only"> prompts</span></span>
}

export default function PromptFilters({ search, filters }) {
  const uid = useId().replace(/:/g, '')
  const [open, setOpen] = useState(false)
  const buttonRef = useRef(null)
  const bodyId = `pl-filters-${uid}`
  const f = filters

  return (
    <div className="pl-toolbar" id="pl-toolbar">
      <div className="pl-tb-search">
        <div className="pl-search">
          <svg className="pl-search-ico" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="search"
            value={search.value}
            placeholder="Search prompts"
            aria-label={search.label}
            autoComplete="off"
            spellCheck="false"
            enterKeyHint="search"
            onChange={(e) => search.onChange(e.target.value)}
          />
          {search.value && (
            <button type="button" className="pl-search-clear" aria-label="Clear search" onClick={() => search.onChange('')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        {f && (
          <button
            type="button"
            ref={buttonRef}
            className="btn pl-filters-btn"
            aria-expanded={open}
            aria-controls={bodyId}
            onClick={() => setOpen((o) => !o)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" /><circle cx="16" cy="6" r="2" /><circle cx="10" cy="12" r="2" /><circle cx="18" cy="18" r="2" />
            </svg>
            Filters
            {f.activeCount > 0 && <span className="pl-filters-n">{f.activeCount}<span className="sr-only"> active</span></span>}
          </button>
        )}
      </div>

      {f && (
        <div className={`pl-tb-body${open ? ' is-open' : ''}`} id={bodyId}>
          <div className="pl-tb-cat" role="radiogroup" aria-labelledby={`${bodyId}-cat`}>
            <span className="pl-glabel" id={`${bodyId}-cat`}>Category</span>
            <Radio name={`${bodyId}-cat`} value="all" checked={f.activeSlug === null} onChange={() => f.onCategory(null)}>
              All <Count n={f.allCount} />
            </Radio>
            {f.categories.map((c) => (
              <Radio key={c.slug} name={`${bodyId}-cat`} value={c.slug} checked={f.activeSlug === c.slug} onChange={() => f.onCategory(c.slug)}>
                {c.label} <Count n={c.count} />
              </Radio>
            ))}
          </div>
          <div className="pl-tb-sortacc">
            <div className="pl-group" role="radiogroup" aria-labelledby={`${bodyId}-sort`}>
              <span className="pl-glabel" id={`${bodyId}-sort`}>Sort</span>
              <div className="pl-seg">
                {SORT_OPTIONS.map((o) => (
                  <Radio key={o.id} name={`${bodyId}-sort`} value={o.id} checked={f.sort === o.id} onChange={f.onSort}>{o.label}</Radio>
                ))}
              </div>
            </div>
            <div className="pl-group" role="radiogroup" aria-labelledby={`${bodyId}-access`}>
              <span className="pl-glabel" id={`${bodyId}-access`}>Access</span>
              <div className="pl-seg">
                {ACCESS_OPTIONS.map((o) => (
                  <Radio key={o.id} name={`${bodyId}-access`} value={o.id} checked={f.access === o.id} onChange={f.onAccess}>{o.label}</Radio>
                ))}
              </div>
            </div>
          </div>
          <button
            type="button"
            className="btn pl-filters-done"
            onClick={() => { setOpen(false); buttonRef.current?.focus() }}
          >
            {`Show ${f.resultCount} ${f.resultCount === 1 ? 'prompt' : 'prompts'}`}
          </button>
        </div>
      )}
    </div>
  )
}
