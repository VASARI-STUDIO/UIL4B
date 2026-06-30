import { Link } from 'react-router-dom'
import { FILTER_CATEGORIES } from '../../data/discoverCategories'

// Empty states for the grid — NEVER a dead end (the founder's explicit ask).
// `variant`:
//   'no-results'  → search/filter matched nothing: Clear filters + 3-chip recovery row
//   'no-saved'    → "Most saved" with nothing saved: Browse all
//   'empty-cat'   → a real category with 0 seed items: be-the-first + Submit CTA
//
// On the focused /discover/gradients route the grid is hard-scoped to one
// category, so the category-recovery chips would be dead ends — `focused` swaps
// them for a single "Browse all resources" link to the full /discover surface.
//
// Derived from the real category list so it can never drift out of sync with
// discoverCategories.js (first three live filter categories).
const RECOVERY = FILTER_CATEGORIES.slice(0, 3).map(c => c.key)

export default function DiscoverEmpty({ variant, categoryLabel, focused, hasQuery, onClear, onBrowseAll, onPickCategory, onSubmit }) {
  if (variant === 'no-saved') {
    return (
      <div className="pl-empty dsc-empty" role="status">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
        <p>Nothing saved yet — tap the bookmark on any resource to keep it here.</p>
        <button className="btn btn-accent" onClick={onBrowseAll}>Browse all</button>
      </div>
    )
  }

  if (variant === 'empty-cat') {
    return (
      <div className="pl-empty dsc-empty" role="status">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
        </svg>
        <p>No {categoryLabel} resources yet — be the first to submit one.</p>
        <button className="btn btn-accent" onClick={onSubmit}>Submit a resource</button>
      </div>
    )
  }

  // 'no-results' — on the focused route the in-page category chips are dead ends
  // (the grid stays scoped to one category), so show a single clear action plus a
  // link out to the full surface instead.
  if (focused) {
    return (
      <div className="pl-empty dsc-empty" role="status">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <p>No resources match your search.</p>
        <div className="dsc-empty-actions">
          {hasQuery && <button className="btn btn-accent" onClick={onClear}>Clear search</button>}
          <Link className={`btn${hasQuery ? '' : ' btn-accent'}`} to="/discover">Browse all resources</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="pl-empty dsc-empty" role="status">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <p>No resources match your search.</p>
      <button className="btn btn-accent" onClick={onClear}>Clear filters</button>
      <div className="dsc-empty-recovery">
        <span className="dsc-empty-try">Try:</span>
        {RECOVERY.map(key => {
          const label = FILTER_CATEGORIES.find(c => c.key === key)?.label || key
          return (
            <button key={key} className="pl-chip" data-cat={key} onClick={() => onPickCategory(key)}>
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
