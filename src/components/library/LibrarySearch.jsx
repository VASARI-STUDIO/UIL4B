// The search field every Library browse surface uses.
//
// Before this existed, the Palette Library and the Gradient Library each had
// their own: `.pgl-search` (46px tall, --inp, radius-xl) and `.pl-search-wrap`
// (borrowed wholesale from the Prompt Library — 8px padding, --bg-2, capped at
// 360px). Same job, two different heights, two different surfaces, on two pages
// the founder asked to feel like one product.
//
// The clear button is deliberately part of the field rather than a page-level
// "clear filters" link: a search with no way back out is the single most common
// way a browse surface strands someone on an empty grid.

export default function LibrarySearch({
  value,
  onChange,
  placeholder = 'Search…',
  label,
  className = '',
}) {
  return (
    <div className={`lbry-search${className ? ` ${className}` : ''}`}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
      </svg>
      <input
        type="search"
        value={value}
        placeholder={placeholder}
        aria-label={label}
        spellCheck="false"
        onChange={(event) => onChange(event.target.value)}
      />
      {value && (
        <button
          type="button"
          className="lbry-search-clear"
          onClick={() => onChange('')}
          aria-label="Clear search"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  )
}
