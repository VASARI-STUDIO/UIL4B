import { useEffect } from 'react'
import useRovingRadio from '../../hooks/useRovingRadio'
import ExportProTag from '../ExportProTag'

// What you are making, in two parts.
//
// ExportNav (the default export) is the rail: the four kinds of export (Branding, UI, Image, Code), one radio each. On a phone
// it is a segmented control across the top.
// ExportTabs is the bar of sub-category tabs along the top of the main area: what the chosen kind makes (Guidelines, Brand book,
// Style guide, ...), each with an icon and its name.
//
// Both have one Tab stop (the chosen item). Arrows move and choose, Home and End jump, and the ends wrap (useRovingRadio).
//
// `showTags` is true for a free account whose plan has loaded: a tab that is Pro in every theme (the book, the app-ready bundle)
// carries the lock and "Pro". Nothing else is tagged: a tab that is free in some themes and Pro in others (the guidelines) is
// decided by the template, and a free tab says nothing. A Pro account sees no tag, and nothing appears while the plan is still being read.

// One 24px line icon per sub-category.
const ICONS = {
  slides: <><rect x="3" y="5" width="18" height="12" rx="2" /><path d="M8 21h8M12 17v4" /></>,
  book: <><path d="M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z" /><path d="M5 17a3 3 0 0 1 3-3h10" /></>,
  guide: <><path d="M7 3h8l4 4v14H7z" /><path d="M15 3v4h4M10 12h6M10 16h6" /></>,
  kit: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M8 9v11" /></>,
  apps: <><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></>,
  'guide-image': <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="1.5" /><path d="M21 16l-5-5-8 9" /></>,
  'book-pages': <><rect x="7" y="3" width="12" height="15" rx="1.5" /><path d="M4 7v14h12" /></>,
  tokens: <path d="M9 8l-4 4 4 4M15 8l4 4-4 4" />,
  contrast: <><circle cx="12" cy="12" r="8" /><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" /></>,
}

export default function ExportNav({ types, typeId, onType, disabled }) {
  const roving = useRovingRadio(types.length, (i) => onType(types[i].id))
  return (
    <nav className="xd-nav" aria-label="What to export">
      <div className="xd-types" role="radiogroup" aria-label="Export type">
        {types.map((t, i) => {
          const on = t.id === typeId
          return (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={on}
              aria-disabled={disabled || undefined}
              tabIndex={on ? 0 : -1}
              className={`xd-type${on ? ' is-on' : ''}`}
              ref={(el) => { roving.refs.current[i] = el }}
              onClick={() => { if (!disabled) onType(t.id) }}
              onKeyDown={(e) => { if (!disabled) roving.onKeyDown(e, i) }}
            >
              <span className="xd-type-n">{t.name}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

export function ExportTabs({ typeName, categories, categoryId, onCategory, disabled, showTags, panelId }) {
  const roving = useRovingRadio(categories.length, (i) => onCategory(categories[i].id))
  // The chosen tab stays in view when the bar scrolls sideways.
  const chosenAt = categories.findIndex((c) => c.id === categoryId)
  const tabRefs = roving.refs
  useEffect(() => { tabRefs.current[chosenAt]?.scrollIntoView?.({ inline: 'nearest', block: 'nearest' }) }, [chosenAt, tabRefs])
  return (
    <div className="xd-tabs" role="tablist" aria-label={`${typeName} formats`}>
      {categories.map((c, i) => {
        const on = c.id === categoryId
        return (
          <button
            key={c.id}
            type="button"
            role="tab"
            id={`${panelId}-tab-${c.id}`}
            aria-selected={on}
            aria-controls={panelId}
            aria-disabled={disabled || undefined}
            aria-label={`${c.name}, ${c.shape}${showTags && c.pro ? ', Pro' : ''}`}
            tabIndex={on ? 0 : -1}
            className={`xd-tab${on ? ' is-on' : ''}`}
            ref={(el) => { roving.refs.current[i] = el }}
            onClick={() => { if (!disabled) onCategory(c.id) }}
            onKeyDown={(e) => { if (!disabled) roving.onKeyDown(e, i) }}
          >
            <svg className="xd-tab-i" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {ICONS[c.id]}
            </svg>
            <span className="xd-tab-n">{c.name}</span>
            {showTags && c.pro && <ExportProTag className="xd-pro" />}
          </button>
        )
      })}
    </div>
  )
}
