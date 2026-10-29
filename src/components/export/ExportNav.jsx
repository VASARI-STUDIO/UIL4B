import { useEffect } from 'react'
import useRovingRadio from '../../hooks/useRovingRadio'
import ExportProTag from '../ExportProTag'

// The Export dialog's left rail: what you are making. Types (Brand book, UI kit,
// Code) and, under a type that makes more than one kind of document, its
// categories. A type with one category shows no sub-rows.
//
// Two sibling radiogroups, each with one Tab stop (the chosen row); arrows move
// and choose, Home and End jump, the ends wrap (useRovingRadio). In the rail the
// category group is drawn under its type (CSS `order`; the type group has no box
// of its own there); in the phone layout (`strip`) the same two groups lay out as
// a segmented control and a row of chips.
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

  // The chosen chip stays in view when the row scrolls sideways.
  const chosenAt = cats.findIndex((c) => c.id === categoryId)
  const chipRefs = catRoving.refs
  useEffect(() => {
    if (strip) chipRefs.current[chosenAt]?.scrollIntoView?.({ inline: 'nearest', block: 'nearest' })
  }, [strip, chosenAt, chipRefs])

  const typeAt = types.indexOf(type)
  const catGroup = (className, style) => (
    <div className={className} style={style} role="radiogroup" aria-label={`${type.name} categories`}>
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
      <div className="xd-list">
        <div className="xd-types" role="radiogroup" aria-label="Export type">
          {types.map((t, i) => {
            const on = t.id === type.id
            // The chosen type with categories under it leaves the fill and the bar to the category row.
            const nested = !strip && on && cats.length > 1
            return (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={on}
                aria-disabled={disabled || undefined}
                tabIndex={on ? 0 : -1}
                className={`xd-type${on ? ' is-on' : ''}${nested ? ' has-cats' : ''}`}
                style={{ '--xd-o': i * 2 }}
                ref={(el) => { typeRoving.refs.current[i] = el }}
                onClick={() => { if (!disabled) onType(t.id) }}
                onKeyDown={(e) => keyed(typeRoving)(e, i)}
              >
                <span className="xd-type-n">{t.name}</span>
                {t.line && <span className="xd-type-l">{t.line}</span>}
              </button>
            )
          })}
        </div>
        {cats.length > 1 && catGroup(strip ? 'xd-chips' : 'xd-cats', strip ? undefined : { '--xd-o': typeAt * 2 + 1 })}
      </div>
      {!strip && coming && <p className="xd-coming">{coming}</p>}
    </nav>
  )
}
