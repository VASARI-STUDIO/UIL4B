import { parseTags } from '../../utils/promptStore'
import UserName from '../UserName'

// A single prompt tile in the gallery. Presentational — all behaviour is wired
// through props by the parent library.
//
// This component has no locked state, and that is the design. A locked prompt
// never reaches it: PromptLibrary splits the library through
// utils/lockedPreview before rendering, so a locked row is replaced by a
// preview and drawn by LockedPromptCard instead.
//
// The branch that used to live here is worth remembering rather than
// rediscovering. It dimmed the card, removed it from the tab order and printed
// "Pro only" under it — while rendering `p.title || p.text.slice(0, 60)` into
// the title AND the aria-label. For a prompt the title IS the product, so the
// card announced the thing it was charging for. Any future lock state on this
// surface belongs in LockedTease, which is structurally incapable of holding a
// payload, not here.
export default function PromptCard({ p, onOpen, isCommunity, isSaved }) {
  const pTags = parseTags(p.tags)

  const open = () => onOpen(p)

  return (
    <div
      className="pl-card no-img"
      onClick={open}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open() } }}
      role="button"
      tabIndex={0}
      aria-label={`Open prompt: ${p.title || p.text.slice(0, 60)}`}
    >
      <div className="pl-card-text-hero">
        <div className="pl-card-title">{p.title || p.text.slice(0, 60)}</div>
        {pTags.length > 0 && (
          <div className="pl-card-tags">
            {pTags.slice(0, 3).map(tag => <span key={tag} className="pl-tag">{tag}</span>)}
            {pTags.length > 3 && <span className="pl-tag">+{pTags.length - 3}</span>}
          </div>
        )}
        {isCommunity && (
          <div className="pl-card-author">
            <UserName name={p.author} ownerId={p.ownerId} bold={!!p.ownerId} />
            {p.saves > 0 && <span className="pl-card-saves">{p.saves} saves</span>}
            {isSaved && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--accent)" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 'auto' }}>
                <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
              </svg>
            )}
          </div>
        )}
        {!isCommunity && <div className="pl-card-date-inline">{p.date}</div>}
      </div>
    </div>
  )
}
