import { DISCOVER_COLLECTIONS, resolveCollection } from '../../data/discoverResources'
import { monogram } from './discoverUtils'

// 3 static editorial collections. Each is a 2×2 mini-preview (the first four
// member faces) + title + count. Clicking opens the collection in the detail
// modal so the user can scan its members without leaving the page.

export default function CollectionsBand({ onOpen }) {
  return (
    <section className="dsc-collections" aria-label="Collections">
      <div className="section-h">
        <h2>Collections</h2>
        <span className="meta">Editor curated</span>
      </div>
      <div className="dsc-coll-grid">
        {DISCOVER_COLLECTIONS.map(coll => {
          const items = resolveCollection(coll)
          const preview = items.slice(0, 4)
          return (
            <button
              key={coll.id}
              className="dsc-coll-card"
              onClick={() => onOpen(coll, items)}
              aria-label={`Open collection ${coll.title} — ${items.length} resources`}
            >
              <div className="dsc-coll-preview" aria-hidden="true">
                {preview.map(r => (
                  <span key={r.id} className="dsc-coll-tile" data-cat={r.category}>
                    {monogram(r.title, r.category)}
                  </span>
                ))}
              </div>
              <div className="dsc-coll-meta">
                <span className="dsc-coll-title">{coll.title}</span>
                <span className="dsc-coll-blurb">{coll.blurb}</span>
                <span className="dsc-coll-count">{items.length} resources</span>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
