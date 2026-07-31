import { useId, useMemo, useState } from 'react'

// Pick one family out of the catalogue. Shared by the Type Scale and Font Pair
// tools so choosing a typeface works identically in both.
//
// Deliberately a native <select> fed by a search box rather than a bespoke
// combobox: the catalogue can be 1,700 families long, and a native listbox
// already gives type-ahead, arrow keys, Home/End, mobile pickers and screen
// reader support that a hand-rolled popup would have to re-earn. The search box
// narrows the option list; when it narrows to nothing the select is replaced by
// a real empty state with a way out, never an empty dropdown.
//
// `LIST_CAP` keeps the DOM sane on the full catalogue — the search box is the
// route to anything past it, and the count line says so honestly.
const LIST_CAP = 300

export default function FontPicker({
  label,
  fonts,
  value,
  onChange,
  hint,
  disabled = false,
}) {
  const uid = useId()
  const [query, setQuery] = useState('')

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return fonts
    return fonts.filter(f => f.family.toLowerCase().includes(q))
  }, [fonts, query])

  // The current value must always be selectable, even when the search has
  // filtered it out — otherwise the <select> would silently show the wrong
  // family while state still held the right one.
  const options = useMemo(() => {
    const capped = matches.slice(0, LIST_CAP)
    if (value && !capped.some(f => f.family === value.family)) {
      const current = fonts.find(f => f.family === value.family)
      if (current) return [current, ...capped.filter(f => f.family !== current.family)]
    }
    return capped
  }, [matches, value, fonts])

  const empty = query.trim() && matches.length === 0

  return (
    <div className="typ-picker">
      <label className="seg-label" htmlFor={`${uid}-select`}>{label}</label>
      <input
        id={`${uid}-search`}
        className="typ-picker-search"
        type="search"
        value={query}
        placeholder="Search families…"
        spellCheck="false"
        autoComplete="off"
        disabled={disabled}
        aria-label={`Search families for ${label.toLowerCase()}`}
        onChange={e => setQuery(e.target.value)}
      />

      {empty ? (
        <div className="typ-picker-empty" role="status">
          <strong>No family matches &ldquo;{query.trim()}&rdquo;.</strong>
          <span>Try a shorter search — or clear it to see the whole catalogue again.</span>
          <button type="button" className="typ-picker-clear" onClick={() => setQuery('')}>
            Clear search
          </button>
        </div>
      ) : (
        <>
          <select
            id={`${uid}-select`}
            className="typ-picker-select"
            value={value?.family || ''}
            disabled={disabled || !options.length}
            onChange={e => {
              const next = fonts.find(f => f.family === e.target.value)
              if (next) onChange(next)
            }}
          >
            {!value && <option value="">Choose a family…</option>}
            {options.map(f => (
              <option key={f.family} value={f.family}>
                {f.family} — {f.category}
              </option>
            ))}
          </select>
          <p className="typ-picker-count">
            {matches.length > LIST_CAP
              ? `Showing the first ${LIST_CAP} of ${matches.length.toLocaleString()} — search to narrow it down.`
              : `${matches.length.toLocaleString()} famil${matches.length === 1 ? 'y' : 'ies'} available.`}
          </p>
        </>
      )}

      {hint && <p className="typ-hint">{hint}</p>}
    </div>
  )
}
