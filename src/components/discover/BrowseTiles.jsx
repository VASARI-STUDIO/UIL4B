import { FILTER_CATEGORIES } from '../../data/discoverCategories'
import CategoryGlyph from './CategoryGlyph'

// "Browse by type" — colour-coded tiles with live counts. Clicking a tile is a
// FILTER shortcut (not a route): it sets the grid filter and scrolls to the
// grid. Counts come from the parent so they reflect the real seed.
export default function BrowseTiles({ counts, activeFilter, onPick }) {
  return (
    <section className="dsc-browse" aria-label="Browse by type">
      <div className="section-h">
        <h2>Browse by type</h2>
      </div>
      <div className="dsc-tiles">
        {FILTER_CATEGORIES.map(cat => {
          const count = counts[cat.key] || 0
          const active = activeFilter === cat.key
          return (
            <button
              key={cat.key}
              className={`dsc-tile${active ? ' is-active' : ''}`}
              data-cat={cat.key}
              onClick={() => onPick(cat.key)}
              aria-pressed={active}
            >
              <span className="dsc-tile-icon" data-cat={cat.key}>
                <CategoryGlyph category={cat.key} size={20} />
              </span>
              <span className="dsc-tile-label">{cat.label}</span>
              <span className="dsc-tile-count">{count}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
