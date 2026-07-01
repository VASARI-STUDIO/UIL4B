// Community design card — the ch-card/ch-thumb/ch-heart markup lifted out of
// Community.jsx (Slice 2) so both the Community Hub and the "From the community"
// band on Discover render one shared card. Uses existing ch-* classes only — no
// new CSS. The thumbnail is a generated gradient (no external fetch); the credit
// link is a real nofollow new-tab anchor.

function HeartIcon({ filled }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}

export default function CommunityCard({ item, saved, count, onToggle }) {
  return (
    <article className="ch-card">
      <a
        className="ch-thumb"
        href={item.url}
        target="_blank"
        rel="noopener noreferrer nofollow"
        style={{ '--c1': item.c1, '--c2': item.c2 }}
        aria-label={`${item.name} — open in new tab`}
      >
        <span className="ch-thumb-mono">{item.name.split(' ').map(w => w[0]).join('').slice(0, 2)}</span>
      </a>
      <button
        className={`ch-heart${saved ? ' is-saved' : ''}`}
        onClick={() => onToggle(item.id)}
        aria-pressed={saved}
        aria-label={saved ? `Unsave ${item.name}` : `Save ${item.name}`}
        title={saved ? 'Saved' : 'Save'}
      >
        <HeartIcon filled={saved} />
        <span className="ch-heart-count">{count}</span>
      </button>
      <div className="ch-card-body">
        <div className="ch-card-name">{item.name}</div>
        <div className="ch-card-meta">
          <span>{item.author}</span>
          <span className="ch-card-tag">{item.category}</span>
        </div>
      </div>
    </article>
  )
}
