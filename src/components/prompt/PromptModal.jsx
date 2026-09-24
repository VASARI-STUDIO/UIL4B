import { useState } from 'react'
import { parseTags } from '../../utils/promptStore'
import UserName from '../UserName'
import { resolvePromptProfileLink } from '../../utils/promptSubmission'
import { hasPromptPreview, promptPageSrc } from '../../data/promptPreviewAssets'
import useModalDialog from '../../hooks/useModalDialog'

// Full prompt detail modal — works for both community and personal prompts.
//
// ── THE OUTPUT, RUNNING ─────────────────────────────────────────────────────
//
// The founder, 2026-09-15: "even better is showing it but on click it shows the
// actual output in live preview. similar to other component libraries."
//
// So where an output exists this modal has two views of one prompt: the text
// you copy, and the page it produces, actually running — animations, hover
// states, scroll behaviour and all. A screenshot cannot show any of that, and
// for eight of these twenty prompts (the 3D heroes, the loading states, the
// scroll transitions) the motion IS the deliverable.
//
// THE PROMPT IS THE DEFAULT VIEW, not the preview. Someone who opened a card in
// a prompt library came for the prompt; the output is the evidence that it is
// worth copying. Making the demo the landing view would bury the product behind
// its own advertisement.
//
// ── THE SANDBOX IS LOAD-BEARING ─────────────────────────────────────────────
//
// These pages are generated output. They are ours today, but the shape of this
// feature invites community-submitted ones tomorrow, and an iframe of arbitrary
// HTML on our own origin can read our cookies, our localStorage and our
// Firebase session. `sandbox` with no `allow-same-origin` puts the frame in an
// opaque origin: same-origin reads throw, storage is inaccessible, and it
// cannot reach anything of ours.
//
// `allow-scripts` IS granted, because without it c-16's canvas, c-17's carousel
// and c-10's flow are dead rectangles and the feature has no point. Scripts
// plus no-same-origin is the safe combination; it is scripts plus same-origin
// that is the documented escape.
//
// Not granted, deliberately: allow-popups, allow-top-navigation,
// allow-forms, allow-modals, allow-downloads. A preview may not navigate the
// page it sits in, open a window, or take a submission.
export default function PromptModal({ prompt, onClose, onCopy, onSave, onRemove, isCommunity, isSaved }) {
  const pTags = parseTags(prompt.tags)
  const profileLink = resolvePromptProfileLink(prompt)
  const canPreview = isCommunity && hasPromptPreview(prompt.id)
  const [view, setView] = useState('prompt')
  const showingPreview = canPreview && view === 'preview'

  // Was Escape only — no focus trap, no scroll lock, no focus restoration,
  // while declaring aria-modal="true".
  const dialogRef = useModalDialog(onClose)

  return (
    <div className="pl-modal-backdrop" onClick={onClose} role="presentation">
      <div className="pl-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="pl-modal-title" tabIndex={-1} ref={dialogRef}>
        <button type="button" className="pl-modal-close" onClick={onClose} aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="pl-modal-header">
          <h2 id="pl-modal-title">{prompt.title || prompt.text.slice(0, 60)}</h2>
          {pTags.length > 0 && (
            <div className="pl-card-tags pl-modal-tags">
              {pTags.map(tag => <span key={tag} className="pl-tag">{tag}</span>)}
            </div>
          )}
          {isCommunity && prompt.author && (
            <div className="pl-modal-author">
              <UserName name={prompt.author} ownerId={prompt.ownerId} bold={!!prompt.ownerId} />
              {profileLink && (
                <a
                  href={profileLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pl-modal-profile"
                  onClick={e => e.stopPropagation()}
                >
                  View profile
                </a>
              )}
              {prompt.saves > 0 && <span className="pl-card-saves">{prompt.saves} saves</span>}
            </div>
          )}
        </div>

        {canPreview && (
          // Two real tabs over one panel. A tablist rather than a pair of
          // buttons, because that is what this is: one region whose content
          // swaps, and a screen reader should be told which view is current.
          <div className="pl-modal-views" role="tablist" aria-label="View this prompt or its output">
            <button
              type="button"
              role="tab"
              id="pl-view-prompt"
              aria-selected={!showingPreview}
              aria-controls="pl-view-panel"
              tabIndex={showingPreview ? -1 : 0}
              className={'pl-modal-view' + (showingPreview ? '' : ' is-on')}
              onClick={(e) => { e.stopPropagation(); setView('prompt') }}
            >
              The prompt
            </button>
            <button
              type="button"
              role="tab"
              id="pl-view-preview"
              aria-selected={showingPreview}
              aria-controls="pl-view-panel"
              tabIndex={showingPreview ? 0 : -1}
              className={'pl-modal-view' + (showingPreview ? ' is-on' : '')}
              onClick={(e) => { e.stopPropagation(); setView('preview') }}
            >
              See it running
            </button>
          </div>
        )}

        <div
          className="pl-modal-body"
          id={canPreview ? 'pl-view-panel' : undefined}
          role={canPreview ? 'tabpanel' : undefined}
          aria-labelledby={canPreview ? (showingPreview ? 'pl-view-preview' : 'pl-view-prompt') : undefined}
        >
          {showingPreview ? (
            <div className="pl-modal-live">
              {/* The iframe is only MOUNTED while this view is open, so opening
                  a prompt costs nothing until the output is asked for — and
                  leaving the view stops whatever it was running rather than
                  leaving a canvas animating behind a hidden panel. */}
              <iframe
                className="pl-modal-frame"
                src={promptPageSrc(prompt.id)}
                title={`Live output: ${prompt.title || 'this prompt'}`}
                sandbox="allow-scripts"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
              <p className="pl-modal-live-note">
                Generated from this prompt. Interactive — hover, scroll and click inside it.
              </p>
            </div>
          ) : (
            <div className="pl-modal-prompt" onClick={(e) => { e.stopPropagation(); onCopy(e, prompt.text) }}>
              <pre>{prompt.text}</pre>
              <div className="pl-card-copy-hint is-shown">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
                Copy
              </div>
            </div>
          )}
        </div>

        <div className="pl-modal-footer">
          {isCommunity ? (
            <button type="button" className={`lib-btn${isSaved ? ' is-saved' : ''}`} onClick={(e) => { e.stopPropagation(); onSave(prompt) }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
              </svg>
              {isSaved ? 'Saved' : 'Save to my library'}
            </button>
          ) : (
            <button type="button" className="lib-btn pl-modal-delete" onClick={(e) => { e.stopPropagation(); onRemove(e, prompt.id) }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
              Delete
            </button>
          )}
          <button type="button" className="lib-btn lib-btn--primary" onClick={(e) => { e.stopPropagation(); onCopy(e, prompt.text) }}>
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
