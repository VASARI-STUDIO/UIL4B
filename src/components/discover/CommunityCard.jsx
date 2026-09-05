// Community design card — the ch-card/ch-thumb/ch-heart markup lifted out of
// Community.jsx (Slice 2) so both the Community Hub and the "From the community"
// band on Discover render one shared card. Uses existing ch-* classes only — no
// new CSS. The thumbnail is a generated gradient (no external fetch); the credit
// link is a real nofollow new-tab anchor.
import { safeHttpUrl } from '../../utils/urlSafety'
import { contrastRatio, inkOnGradient } from '../../utils/colors'

// The monogram is 30px/700, which is LARGE TEXT under WCAG 1.4.3, so its floor
// is 3:1 rather than 4.5:1.
const MONO_FLOOR = 3
const HEX = /^#[0-9a-fA-F]{6}$/

/**
 * PER-ITEM INK, chosen from the card's own gradient.
 *
 * The thumbnail's ground is DATA — c1/c2 are curated per item, and a queued
 * submission's payload can carry its own pair — so no single ink can be right
 * for every card. A fixed rgba(255,255,255,.92) put NINE of the twelve curated
 * monograms below the 3:1 floor, worst 1.47:1 on s9 (#059669 -> #6EE7B7).
 * Nothing here changes a curated colour; only the ink moves.
 *
 * The visible cost, and it is the accepted one: ten of the twelve monograms
 * flip from white to black, so the grid no longer has a single ink. That is
 * what choosing the ink for the ground looks like.
 *
 * The glow is paired with the ink rather than fixed. A dark text-shadow under
 * dark ink is muddy and does no separating work; it flips to a light one.
 */
function monoInk(c1, c2) {
  if (!HEX.test(c1 || '') || !HEX.test(c2 || '')) return null
  const ink = inkOnGradient(c1, c2, MONO_FLOOR)
  const dark = contrastRatio(ink, '#FFFFFF') >= contrastRatio(ink, '#000000')
  return { ink, glow: dark ? 'rgba(255,255,255,.38)' : 'rgba(0,0,0,.25)' }
}

function HeartIcon({ filled }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}

export default function CommunityCard({ item, saved, count, onToggle, offline = false }) {
  const href = safeHttpUrl(item.url)
  const mono = monoInk(item.c1, item.c2)
  const thumbProps = {
    className: 'ch-thumb',
    style: {
      '--c1': item.c1,
      '--c2': item.c2,
      // Omitted, not guessed, when the stops are not a usable pair: the CSS
      // fallback is the accent ground the rule already draws, with white on it.
      ...(mono ? { '--mono-ink': mono.ink, '--mono-glow': mono.glow } : null),
    },
  }
  const thumbContent = (
    <span className="ch-thumb-mono">{item.name.split(' ').map(w => w[0]).join('').slice(0, 2)}</span>
  )
  return (
    <article className="ch-card">
      {!offline && href ? (
        <a
          {...thumbProps}
          href={href}
          target="_blank"
          rel="noopener noreferrer nofollow"
          aria-label={`${item.name} — open in new tab`}
        >
          {thumbContent}
        </a>
      ) : (
        <div {...thumbProps} aria-label={`${item.name} preview — external link unavailable`}>
          {thumbContent}
        </div>
      )}
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
          {/* A curated link is credited to the PLATFORM it opens; a member
              submission is credited to the member. These used to render
              identically, with twelve invented designers indistinguishable from
              real ones — see the note in data/communityDesigns.js. */}
          {item.curated
            ? <span className="ch-card-source">{item.source}</span>
            : <UserName name={item.author} ownerId={item.ownerId} bold={!!item.ownerId} />}
          <span className="ch-card-tag">{item.category}</span>
        </div>
      </div>
    </article>
  )
}
import UserName from '../UserName'
