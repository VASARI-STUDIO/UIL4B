import { useRef, useState } from 'react'
import { parseTags } from '../../utils/promptStore'
import { previewDuration } from '../../utils/promptPreview'
import { hasPromptPreview, hasPromptAnim, promptPosterSrc, promptAnimSrc } from '../../data/promptPreviewAssets'
import { useAppearance } from '../../contexts/AppearanceContext'
import useInViewPlayback, { allowsAnimatedPreview } from '../../hooks/useInViewPlayback'
import UserName from '../UserName'
import PromptSaveButton from './PromptSaveButton'

// A single prompt tile in the gallery. Presentational — all behaviour is wired
// through props by the parent library.
//
// The card shows the artefact rather than a name for it: the prompt's built
// output where one exists, otherwise the prompt text itself, with the title
// and metadata beneath. See utils/promptPreview for why the text scroll plays
// on hover and focus rather than continuously.
//
// ── NO LOCKED STATE ─────────────────────────────────────────────────────────
// This card renders `p.text` in full, so a locked prompt must never reach it.
// PromptLibrary splits the library through utils/lockedPreview BEFORE search
// and sort, and a locked row is drawn by LockedPromptCard from a preview
// object that has no `text` at all. A blurred or clipped copy of this card
// would leave the real text in the DOM. Any lock state belongs in LockedTease.
//
// ── STRUCTURE ───────────────────────────────────────────────────────────────
// `.pl-card-cell` is the grid item. It holds the card (one role="button" that
// opens the prompt) and, for community prompts, the Save toggle as a SIBLING
// laid over the card's foot, so no interactive element is nested inside
// another.
export default function PromptCard({ p, onOpen, isCommunity, isSaved, onToggleSave }) {
  const pTags = parseTags(p.tags)
  const text = p.text || ''
  const name = p.title || text.slice(0, 60)
  const cellRef = useRef(null)
  const { reducedMotion } = useAppearance() || {}

  // A prompt with a built output shows a still of it (the poster). The rest
  // show the scrolling prompt text: a user-submitted prompt has no output, and
  // its text is the honest artefact.
  const showsOutput = isCommunity && hasPromptPreview(p.id)

  // ── THE ANIMATED PREVIEW ────────────────────────────────────────────────
  // The poster is always rendered and fixes the frame's size. The animated
  // WebP is mounted ON TOP of it only while the card is in view, and unmounted
  // when it leaves, which releases the decoded frames: a gallery of twenty
  // never decodes twenty animations at once. Reduced motion and data saver
  // never mount it, so they keep the still.
  const canAnimate = showsOutput && hasPromptAnim(p.id) && allowsAnimatedPreview(reducedMotion)
  const inView = useInViewPlayback(cellRef, canAnimate)
  const [animReady, setAnimReady] = useState(false)
  // A file that fails to load is not retried on this card; the poster stays.
  const [animFailed, setAnimFailed] = useState(false)
  const playing = canAnimate && inView && !animFailed
  // Ready belongs to one mount of the animation: leaving view resets it, so
  // coming back fades in only once the file has decoded again.
  if (!playing && animReady) setAnimReady(false)

  const open = () => onOpen(p)

  return (
    <div className={`pl-card-cell${isCommunity && onToggleSave ? ' has-save' : ''}`} ref={cellRef}>
      <div
        className="pl-card no-img"
        onClick={open}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open() } }}
        role="button"
        tabIndex={0}
        aria-label={`Open prompt: ${name}`}
        style={{ '--pl-preview-dur': `${previewDuration(text)}s` }}
      >
        {/* The artefact. aria-hidden because the card already carries an
            explicit accessible name; without it a two-thousand-character
            prompt (or a screenshot's alt text) would be read as the name of a
            button. The same content is one activation away in the modal.
            `data-preview` is the stable hook tests use to ask which prompt's
            artefact is on this card. */}
        {showsOutput ? (
          <div
            className={`pl-card-preview pl-card-shot${playing && animReady ? ' is-playing' : ''}`}
            data-preview
            data-preview-kind="output"
            data-anim={playing ? 'on' : 'off'}
            aria-hidden="true"
          >
            <img
              className="pl-card-poster"
              src={promptPosterSrc(p.id)}
              alt=""
              loading="lazy"
              decoding="async"
              width="960"
              height="600"
            />
            {playing && (
              <img
                className="pl-card-anim"
                src={promptAnimSrc(p.id)}
                alt=""
                decoding="async"
                width="960"
                height="600"
                // Until it has loaded the image is transparent and the poster
                // shows through, so there is no blank frame to hide.
                onLoad={() => setAnimReady(true)}
                onError={() => setAnimFailed(true)}
              />
            )}
          </div>
        ) : (
          <div className="pl-card-preview" data-preview data-preview-kind="text" aria-hidden="true">
            <p className="pl-card-preview-text">{text}</p>
          </div>
        )}

        <div className="pl-card-text-hero">
          <div className="pl-card-title">{name}</div>
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
            </div>
          )}
          {!isCommunity && <div className="pl-card-date-inline">{p.date}</div>}
        </div>
      </div>
      {isCommunity && onToggleSave && (
        <PromptSaveButton
          className="lib-btn pl-card-save"
          saved={isSaved}
          name={name}
          onToggle={() => onToggleSave(p)}
        />
      )}
    </div>
  )
}
