import { parseTags } from '../../utils/promptStore'
import UserName from '../UserName'

// A single prompt tile in the gallery. Presentational — all behaviour is wired
// through props by the parent library.
export default function PromptCard({ p, onOpen, isCommunity, isSaved, isLocked }) {
  const pTags = parseTags(p.tags)

  const open = () => { if (!isLocked) onOpen(p) }

  return (
    <div
      className={`pl-card no-img${isLocked ? ' pl-card-locked' : ''}`}
      onClick={open}
      onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !isLocked) { e.preventDefault(); open() } }}
      role="button"
      tabIndex={isLocked ? -1 : 0}
      aria-disabled={isLocked || undefined}
      aria-label={`Open prompt: ${p.title || p.text.slice(0, 60)}`}
      style={isLocked ? { cursor: 'default', opacity: 0.7 } : undefined}
    >
      <div className="pl-card-text-hero">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div className="pl-card-title" style={{ flex: 1 }}>{p.title || p.text.slice(0, 60)}</div>
          {isLocked && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--t2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
          )}
        </div>
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
        {isLocked && (
          <div style={{ fontSize: 10, color: 'var(--accent)', marginTop: 4, fontWeight: 600 }}>
            Pro only
          </div>
        )}
      </div>
    </div>
  )
}
