import { useEffect } from 'react'
import { parseTags } from '../../utils/promptStore'

// Full prompt detail modal — works for both community and personal prompts.
export default function PromptModal({ prompt, onClose, onCopy, onSave, onRemove, isCommunity, isSaved }) {
  const pTags = parseTags(prompt.tags)

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="pl-modal-backdrop" onClick={onClose} role="presentation">
      <div className="pl-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="pl-modal-title">
        <button className="pl-modal-close" onClick={onClose} aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="pl-modal-header">
          <h2 id="pl-modal-title">{prompt.title || prompt.text.slice(0, 60)}</h2>
          {pTags.length > 0 && (
            <div className="pl-card-tags" style={{ marginTop: 8 }}>
              {pTags.map(tag => <span key={tag} className="pl-tag">{tag}</span>)}
            </div>
          )}
          {isCommunity && prompt.author && (
            <div className="pl-modal-author">
              <span>{prompt.author}</span>
              {prompt.authorProfile && (
                <a
                  href={prompt.authorProfile}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 11, color: 'var(--accent)', textDecoration: 'none', marginLeft: 4 }}
                  onClick={e => e.stopPropagation()}
                >
                  View profile
                </a>
              )}
              {prompt.saves > 0 && <span className="pl-card-saves">{prompt.saves} saves</span>}
            </div>
          )}
        </div>

        <div className="pl-modal-body">
          <div className="pl-modal-prompt" onClick={(e) => { e.stopPropagation(); onCopy(e, prompt.text) }}>
            <pre>{prompt.text}</pre>
            <div className="pl-card-copy-hint" style={{ opacity: 1 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
              Copy
            </div>
          </div>
        </div>

        <div className="pl-modal-footer">
          {isCommunity ? (
            <button className={`btn ${isSaved ? '' : 'btn-accent'}`} onClick={(e) => { e.stopPropagation(); onSave(prompt) }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
              </svg>
              {isSaved ? 'Saved' : 'Save to my library'}
            </button>
          ) : (
            <button className="btn pl-modal-delete" onClick={(e) => { e.stopPropagation(); onRemove(e, prompt.id) }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
              Delete
            </button>
          )}
          <button className="btn btn-accent" onClick={(e) => { e.stopPropagation(); onCopy(e, prompt.text) }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
            </svg>
            Copy prompt
          </button>
        </div>
      </div>
    </div>
  )
}
