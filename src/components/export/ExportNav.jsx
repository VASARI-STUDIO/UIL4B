import { Fragment } from 'react'
import useRovingRadio from '../../hooks/useRovingRadio'
import ExportProTag from '../ExportProTag'

// The Export dialog's left rail: what you are making. Types (Brand book, UI kit,
// Code) and, under a type that makes more than one kind of document, its
// categories. A type with one category shows no sub-rows.
//
// Two radiogroups, each with one Tab stop (the chosen row); arrows move and
// choose, Home and End jump, the ends wrap (useRovingRadio). In the rail the
// category group sits under its type; in the phone layout (`strip`) the same two
// groups lay out as a segmented control and a row of chips.
//
// `showTags` is true for a free account whose plan has loaded: Pro rows carry the
// lock and "Pro", the free one says "Free". A Pro account sees neither, and
// nothing appears while the plan is still being read.
export default function ExportNav({ types, typeId, categoryId, onType, onCategory, strip, disabled, showTags, coming }) {
  const type = types.find((t) => t.id === typeId) || types[0]
  const cats = type.categories
  const typeRoving = useRovingRadio(types.length, (i) => onType(types[i].id))
  const catRoving = useRovingRadio(cats.length, (i) => onCategory(cats[i].id))

  // A building export belongs to the shown pick, so the rows hold still.
  const keyed = (roving) => (e, i) => { if (!disabled) roving.onKeyDown(e, i) }

  const catGroup = (className) => (
    <div className={className} role="radiogroup" aria-label={`${type.name} categories`}>
      {cats.map((c, i) => {
        const on = c.id === categoryId
        return (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={on}
            aria-disabled={disabled || undefined}
            aria-label={`${c.name}, ${c.shape}${showTags ? (c.pro ? ', Pro' : ', free') : ''}`}
            tabIndex={on ? 0 : -1}
            className={`xd-cat${on ? ' is-on' : ''}`}
            ref={(el) => { catRoving.refs.current[i] = el }}
            onClick={() => { if (!disabled) onCategory(c.id) }}
            onKeyDown={(e) => keyed(catRoving)(e, i)}
          >
            <span className="xd-cat-n">{c.name}</span>
            {showTags && (c.pro ? <ExportProTag className="xd-pro" /> : <span className="xd-free">Free</span>)}
          </button>
        )
      })}
    </div>
  )

  return (
    <nav className="xd-nav" aria-label="What to export">
      <div className="xd-types" role="radiogroup" aria-label="Export type">
        {types.map((t, i) => {
          const on = t.id === type.id
          return (
            <Fragment key={t.id}>
              <button
                type="button"
                role="radio"
                aria-checked={on}
                aria-disabled={disabled || undefined}
                tabIndex={on ? 0 : -1}
                className={`xd-type${on ? ' is-on' : ''}`}
                ref={(el) => { typeRoving.refs.current[i] = el }}
                onClick={() => { if (!disabled) onType(t.id) }}
                onKeyDown={(e) => keyed(typeRoving)(e, i)}
              >
                <span className="xd-type-n">{t.name}</span>
                {t.line && <span className="xd-type-l">{t.line}</span>}
              </button>
              {!strip && on && cats.length > 1 && catGroup('xd-cats')}
            </Fragment>
          )
        })}
      </div>
      {strip && cats.length > 1 && catGroup('xd-chips')}
      {!strip && coming && <p className="xd-coming">{coming}</p>}
    </nav>
  )
}
