import { useEffect, useRef, useState } from 'react'
import { parseTags } from '../../utils/promptStore'
import UserName from '../UserName'
import { resolvePromptProfileLink } from '../../utils/promptSubmission'
import { hasPromptPreview, promptPageSrc, promptPosterSrc } from '../../data/promptPreviewAssets'
import { framePreviewHtml, isPreviewEscape } from '../../utils/previewFrame'
import useModalDialog from '../../hooks/useModalDialog'
import { useCloseOnBack } from '../../hooks/useCloseOnBack'
import PromptSaveButton from './PromptSaveButton'

// Full prompt detail modal — works for both community and personal prompts.
//
// Where a prompt has a built demo, the modal has two views of it over one
// panel: the page running, and the prompt text to copy. It OPENS ON THE
// RUNNING PAGE; the text is the other tab. A prompt without a demo opens on
// its text and shows no tabs.
//
// ── THE SANDBOX ─────────────────────────────────────────────────────────────
// `sandbox="allow-scripts"` without `allow-same-origin` puts the frame in an
// opaque origin: it cannot read this origin's cookies, storage or Firebase
// session. Scripts are allowed because the demos are motion, canvas and
// scroll pieces. Not granted: popups, top navigation, forms, modals,
// downloads. The page arrives as srcdoc with a small bridge (utils/
// previewFrame) so Escape inside the frame still closes the dialog.
//
// The frame is mounted only while the running view is open. Switching to the
// text or closing the modal unmounts it, which destroys its document and with
// it any animation loop or WebGL context.
function LiveFrame({ id, title, onEscape }) {
  const frameRef = useRef(null)
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState({ status: 'loading', html: '' })

  useEffect(() => {
    let alive = true
    const ctrl = typeof AbortController === 'undefined' ? null : new AbortController()
    const url = new URL(promptPageSrc(id), window.location.href)
    const base = new URL('./', url).href
    fetch(url.href, { signal: ctrl?.signal })
      .then((res) => (res.ok ? res.text() : Promise.reject(new Error(String(res.status)))))
      .then((html) => { if (alive) setState({ status: 'ready', html: framePreviewHtml(html, base) }) })
      .catch(() => { if (alive) setState({ status: 'error', html: '' }) })
    return () => { alive = false; ctrl?.abort() }
  }, [id, attempt])

  useEffect(() => {
    const onMessage = (e) => { if (isPreviewEscape(e, frameRef.current?.contentWindow)) onEscape() }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [onEscape])

  return (
    <div className="pl-modal-live">
      <div className="pl-modal-stage" data-state={state.status}>
        {/* The poster holds the frame's place while the page loads, so the
            view opens on the output rather than on an empty box. */}
        <img className="pl-modal-stage-poster" src={promptPosterSrc(id)} alt="" aria-hidden="true" width="960" height="600" />
        {state.status === 'ready' && (
          <iframe
            ref={frameRef}
            className="pl-modal-frame"
            srcDoc={state.html}
            title={`Live output: ${title || 'this prompt'}`}
            sandbox="allow-scripts"
            referrerPolicy="no-referrer"
          />
        )}
        {state.status === 'loading' && <p className="pl-modal-stage-note" role="status">Loading the demo…</p>}
        {state.status === 'error' && (
          <div className="pl-modal-stage-error" role="alert">
            <p>The demo didn’t load. Check your connection and try again.</p>
            <button type="button" className="lib-btn" onClick={(e) => { e.stopPropagation(); setState({ status: 'loading', html: '' }); setAttempt((n) => n + 1) }}>Retry</button>
          </div>
        )}
      </div>
      <p className="pl-modal-live-note">
        Generated from this prompt. Interactive — hover, scroll and click inside it.
      </p>
    </div>
  )
}

export default function PromptModal({ prompt, onClose, onCopy, onToggleSave, onRemove, isCommunity, isSaved }) {
  const pTags = parseTags(prompt.tags)
  const profileLink = resolvePromptProfileLink(prompt)
  const canPreview = isCommunity && hasPromptPreview(prompt.id)
  const [view, setView] = useState(canPreview ? 'preview' : 'prompt')
  const showingPreview = canPreview && view === 'preview'
  const name = prompt.title || prompt.text.slice(0, 60)

  // Focus trap, Escape, scroll lock and focus return; the back gesture closes
  // it too, and a close by any other route removes the history entry it added.
  const dialogRef = useModalDialog(onClose)
  useCloseOnBack(true, onClose)

  const selectView = (next) => setView(next)
  const onTabKey = (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Home' && e.key !== 'End') return
    e.preventDefault()
    const next = (e.key === 'Home') ? 'preview' : (e.key === 'End') ? 'prompt' : (view === 'preview' ? 'prompt' : 'preview')
    selectView(next)
    dialogRef.current?.querySelector(next === 'preview' ? '#pl-view-preview' : '#pl-view-prompt')?.focus()
  }

  return (
    <div className="pl-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className={`pl-modal${canPreview ? ' has-live' : ''}${showingPreview ? ' is-live' : ''}`}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pl-modal-title"
        tabIndex={-1}
        ref={dialogRef}
      >
        <button type="button" className="pl-modal-close" onClick={onClose} aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="pl-modal-header">
          <h2 id="pl-modal-title">{name}</h2>
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
          <div className="pl-modal-views" role="tablist" aria-label="View this prompt running or as text">
            <button
              type="button"
              role="tab"
              id="pl-view-preview"
              aria-selected={showingPreview}
              aria-controls="pl-view-panel"
              tabIndex={showingPreview ? 0 : -1}
              className={'pl-modal-view' + (showingPreview ? ' is-on' : '')}
              onClick={(e) => { e.stopPropagation(); selectView('preview') }}
              onKeyDown={onTabKey}
            >
              See it running
            </button>
            <button
              type="button"
              role="tab"
              id="pl-view-prompt"
              aria-selected={!showingPreview}
              aria-controls="pl-view-panel"
              tabIndex={showingPreview ? -1 : 0}
              className={'pl-modal-view' + (showingPreview ? '' : ' is-on')}
              onClick={(e) => { e.stopPropagation(); selectView('prompt') }}
              onKeyDown={onTabKey}
            >
              The prompt
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
            <LiveFrame key={prompt.id} id={prompt.id} title={prompt.title} onEscape={onClose} />
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
            <PromptSaveButton className="lib-btn" saved={isSaved} onToggle={() => onToggleSave(prompt)} />
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
