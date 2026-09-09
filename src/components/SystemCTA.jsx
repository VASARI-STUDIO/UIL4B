import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLoginPrompt } from '../contexts/LoginPromptContext'

export default function SystemCTA({
  eyebrow = 'Start free',
  title,
  description,
  primaryLabel = 'Start building free',
  primaryTo = '/login',
  secondaryLabel,
  secondaryTo,
  // The payment half of this hint is gone — founder, 2026-09-07: the
  // "no credit card required" line "all over the place is a huge AI Slop
  // feature". Every consumer of this component sits at the bottom of a long
  // sales page, so the default carried that claim onto every one of them at
  // once. What is left says where the work happens, which is not a
  // reassurance about payment and is not repeated anywhere else.
  hint = 'Build in your browser',
}) {
  const { user } = useAuth()
  const { openLogin } = useLoginPrompt()
  // This block sits at the very bottom of a long sales page. Routing a
  // signed-out visitor to /login unmounted that page, and dismissing the popup
  // dropped them on /home — scroll position and their place in the argument
  // gone. Open it in place instead. Any non-auth destination stays a real link
  // (middle-click, open-in-new-tab), and a signed-in visitor keeps today's
  // behaviour exactly, since openLogin() would be a no-op for them.
  // …and it opens the SIGN-UP form, because this block's primary label is
  // always some form of "start free" — opening on "Welcome Back" told a
  // first-time visitor they already had an account.
  const promptsLogin = primaryTo === '/login' && !user

  return (
    <section className="system-cta" aria-labelledby="system-cta-title">
      <div className="system-cta-beams" aria-hidden="true">
        <i /><i /><i /><i /><i /><i /><i />
      </div>
      <div className="system-cta-grid" aria-hidden="true" />
      <div className="system-cta-inner" data-reveal>
        {/* Optional since the 2026-09-09 anti-slop audit: a caller passing
            `eyebrow={null}` gets no label above the heading. An eyebrow that
            only restates the button under it ("Start on Free" over "Start
            building free") is the retired eyebrow motif (#382, #391, #398). */}
        {eyebrow && <span className="home-eyebrow">{eyebrow}</span>}
        <h2 className="system-cta-title" id="system-cta-title">{title}</h2>
        {description && <p className="system-cta-lede">{description}</p>}
        <div className="system-cta-actions">
          {promptsLogin ? (
            <button type="button" className="ui-pill ui-pill-ink ui-pill-lg" aria-haspopup="dialog" onClick={() => openLogin({ signup: true })}>
              {primaryLabel}
              <span className="ui-pill-arrow" aria-hidden="true">&rarr;</span>
            </button>
          ) : (
            <Link className="ui-pill ui-pill-ink ui-pill-lg" to={primaryTo}>
              {primaryLabel}
              <span className="ui-pill-arrow" aria-hidden="true">&rarr;</span>
            </Link>
          )}
          {secondaryLabel && secondaryTo && (
            <Link className="ui-pill ui-pill-out ui-pill-lg" to={secondaryTo}>
              {secondaryLabel}
            </Link>
          )}
        </div>
        {hint && <p className="system-cta-hint">{hint}</p>}
      </div>
    </section>
  )
}
