import { Link } from 'react-router-dom'
import { reportUpgradeGate } from '../../contexts/ProModalContext'
import { hasPromptPreview, promptPosterSrc } from '../../data/promptPreviewAssets'

// A locked prompt on the gallery: the real output, blurred, a lock, a plain
// access label and the prompt's tags. NEVER the title or the text.
//
// The component is handed a `preview` (id, tags) and nothing else, so it has
// no way to draw a locked prompt's words. The title is the idea being sold, so
// the heading line is the tag set, which is already public as the filter
// facet. The poster is the one real thing shown: it is the same still the
// open card shows, blurred past reading, and it carries no text of the brief.
// Open prompts never come through here (PromptCard draws those); the page
// splits the library through utils/lockedPreview first.
//
// `kind` says what opens it:
//   pro      Pro. The card links to /plans and reports the click as
//            LockedTease's upgrade link does.
//   account  a free account (a signed-out visitor, where the free rung opens
//            this prompt). The card runs `onSignup`, the page's own free
//            sign-up, so it is a rung and not a second gate.
// `variant` matches PromptCard (list / lead / rest), so a locked card sits in
// the same slot as an open one.

/** Padlock. Decorative: the label beside it carries the meaning. */
function LockGlyph() {
  return (
    <svg className="pl-lock-glyph" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

/** The pill over a blurred picture: a lock and "Pro" or "Free account". */
export function LockMark({ kind }) {
  return <span className="pl-lockmark"><LockGlyph /><span>{lockLabel(kind)}</span></span>
}

/** "Pro" or "Free account". */
const lockLabel = (kind) => (kind === 'account' ? 'Free account' : 'Pro')

/** The tag line a locked card uses where an open card has its title. */
const lockTagLine = (preview) => {
  const tags = Array.isArray(preview?.tags) ? preview.tags.filter(Boolean).slice(0, 2) : []
  return tags.length ? tags.join(' · ') : 'Community prompt'
}

export default function PromptLockedCard({
  preview,
  kind = 'pro',
  variant = 'list',
  onSignup,
  gate = 'prompt-library-locked-card',
}) {
  const tagLine = lockTagLine(preview)
  const isAccount = kind === 'account'
  const label = isAccount
    ? `Create a free account to open a prompt tagged ${tagLine.replace(' · ', ' and ')}`
    : `Upgrade to Pro to open a prompt tagged ${tagLine.replace(' · ', ' and ')}`

  const inner = (
    <>
      <span className="pl-card-preview pl-card-shot" aria-hidden="true">
        {hasPromptPreview(preview.id) && (
          <img
            className="pl-card-poster"
            src={promptPosterSrc(preview.id)}
            alt=""
            loading="lazy"
            decoding="async"
            width="960"
            height="600"
          />
        )}
        <LockMark kind={kind} />
      </span>
      <span className="pl-card-text-hero">
        <span className="pl-card-title pl-card-title--tags">{tagLine}</span>
        <span className="pl-card-lockmeta">{isAccount ? 'Opens with a free account' : 'Opens with Pro'}</span>
      </span>
    </>
  )

  return (
    <div className={`pl-card-cell pl-card-cell--locked${variant === 'list' ? '' : ` pl-card-cell--${variant}`}`}>
      {isAccount ? (
        <button type="button" className="pl-card no-img pl-locked-card" aria-label={label} onClick={() => onSignup?.()}>
          {inner}
        </button>
      ) : (
        <Link
          className="pl-card no-img pl-locked-card"
          to="/plans"
          aria-label={label}
          onClick={() => { reportUpgradeGate(gate) }}
        >
          {inner}
        </Link>
      )}
    </div>
  )
}
