import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useProject } from '../contexts/ProjectContext'
import { getRecentIcons } from '../utils/recentIcons'
import {
  BRAND_KIT_STEPS,
  NEW_PROJECT_STATE,
  endGuide,
  guideProgress,
  introSeen,
  isGuideActive,
  markIntroSeen,
  nextStep,
} from '../utils/brandKitGuide'

// The Brand kit walkthrough, rendered by each of the four tools it walks.
//
// The reading behind it — what was broken, where the state lives, why progress
// is derived rather than counted, and which Mobbin screen drove which decision —
// is in src/utils/brandKitGuide.js, next to the step model itself. This file is
// the surface. Two pieces:
//
//   1. THE RAIL. A sticky bar along the bottom of every step, showing all four
//      steps at once with a tick on the ones that are built AND THE ARTEFACT
//      EACH ONE PRODUCED — the real swatches, the real family names, the real
//      base and ratio. That is the difference between a guided flow and four
//      bookmarks: standing on Icons you can see the palette you drew on
//      Colours. Every value comes off the saved design, so the rail cannot show
//      a system the tools did not build.
//
//   2. THE ORIENTATION CARD. Docked above the rail, over a working tool.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY THE CARD IS NOT A MODAL, AND WHY THAT IS A DELIBERATE DEVIATION
// ─────────────────────────────────────────────────────────────────────────────
// The backlog item asks for the founder-note pattern — “focus-trapped, Escape
// closes, focus returns, AND IT MUST NOT BLOCK THE STEP BEHIND IT”. The last
// clause contradicts the first: a focus trap IS blocking. It is the mechanism
// by which a modal makes the rest of the page unreachable, and `aria-modal`
// declares exactly that to assistive technology.
//
// So the non-blocking half wins, because it is the half the founder asked for
// twice (“go straight into step 1”, then a popup over it). This card therefore:
//
//   • does NOT declare aria-modal and does NOT trap focus — Tab walks out of it
//     into the palette board behind, which is the point;
//   • does NOT lock scroll and paints NO scrim, so the tool stays fully usable
//     and fully visible while it is up;
//   • DOES take focus when it opens, DOES close on Escape, and DOES return
//     focus to whatever opened it.
//
// That is the correct contract for a NON-modal dialog, and it is honest: the old
// version declared the aria-modal attribute over a scrim while trapping
// nothing, which tests/unit/modal-contract.test.js was written to catch.
// Declaring it here and not trapping would fail that guard; trapping would
// block the step. Not declaring it is the only answer that is both.
//
// (That guard scans RAW source for the attribute, so this note names it in
// words rather than spelling out the declaration -- prose that reads like code
// is precisely what it exists to flag.)
//
// Escape is bound to the CARD, not the window, and that follows from the same
// decision: while the card is open the tool behind is live, and PaletteBuilder
// binds its own Escape to close colour popovers. A window-level handler here
// would eat that. Escape closes the card whenever focus is inside it, which it
// is the moment it opens.
//
// ─────────────────────────────────────────────────────────────────────────────
// IT OPENS ONCE, THEN ONLY ON REQUEST
// ─────────────────────────────────────────────────────────────────────────────
// The founder asked for the popup to be PROVIDED on arrival — “go straight into
// step 1 then provide a popup with a quick set of information” — so unlike the
// founder note it does open itself, once, on the first step of a fresh flow.
// After that it is opt-in furniture: `GUIDE_SEEN_KEY` records that it has been
// shown, and the rail keeps a permanent “What’s this?” trigger so it is
// reachable again afterwards. That last part is the lesson the founder-note
// item recorded about one-time popups, and it is the cheap half to get right.
export default function UIKitGuide({ step }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { design } = useProject()
  // A new blank project opens the card again, seen before or not.
  const newProject = location.state?.newProject === NEW_PROJECT_STATE.newProject
  const [active, setActive] = useState(() => isGuideActive())
  // READ in the initialiser, WRITTEN on dismiss. React may render a component,
  // throw the result away and render it again (concurrent rendering, Suspense
  // retries, StrictMode's development double-invoke), so the "seen" flag must
  // not be burned by anything a discarded render can reach — the same split
  // utils/handoffSlot.js draws between peek and consume, for the same reason.
  const [showIntro, setShowIntro] = useState(
    () => step === BRAND_KIT_STEPS[0].id && isGuideActive() && (newProject || !introSeen()),
  )
  const cardRef = useRef(null)
  const introTriggerRef = useRef(null)
  const titleId = useId()
  const cardId = useId()

  // Icons are the one step with no field in the saved design to compare, so the
  // signal is the recent-icons list the Icon Library already writes and the
  // dashboard rail already reads. Read once per render rather than kept in
  // state: it changes on another route, and this component remounts there.
  const iconsTouched = getRecentIcons().length > 0
  const { steps, done, total, complete } = guideProgress(design, { iconsTouched })

  const current = steps.find((s) => s.id === step) || null
  const next = nextStep(step)

  // Focus the card when it opens; hand focus back when it closes. `openedBy`
  // survives the close because the trigger is always mounted — the rail does not
  // unmount while the card is up, which is the same reason FounderNote keeps its
  // footer button mounted.
  const openedByRef = useRef(null)
  useEffect(() => {
    if (!showIntro) return undefined
    openedByRef.current = document.activeElement
    cardRef.current?.focus()
    // Copied into the effect's own scope rather than read off the ref inside the
    // cleanup: by the time cleanup runs the ref may point at a different node,
    // and this is the fallback that has to still BE the trigger.
    const trigger = introTriggerRef.current
    return () => {
      const back = openedByRef.current
      // Three ways `back` is not somewhere to return to, and the rendered spec
      // found the third:
      //   · nothing had focus;
      //   · the opener was DETACHED — very often true, because the control that
      //     started the flow is a mega-menu button that unmounts on the route
      //     change. .focus() on a detached node is a silent no-op;
      //   · the opener was <body>, which is what `activeElement` reports when
      //     nothing is focused — and body IS connected, so an isConnected check
      //     alone waves it through and "restores" focus to nowhere. That is the
      //     normal case here, because this card opens ITSELF on arrival rather
      //     than being opened by a press.
      // The rail's own trigger is the answer in all three: it is always mounted
      // while the card is up, and it is what re-opens the card.
      const usable = back && back !== document.body && back.isConnected
      const target = usable ? back : trigger
      if (target && target.isConnected) target.focus()
    }
  }, [showIntro])

  const closeIntro = useCallback(() => {
    setShowIntro(false)
    markIntroSeen()
  }, [])

  const exit = useCallback(() => {
    endGuide()
    setActive(false)
    // /projects, not /dashboard: /dashboard is a legacy redirect to it (see
    // data/legacyRoutes.js), and /projects is the User Home that already renders
    // this system's four-part progress — so "review" lands on the review.
    navigate('/projects')
  }, [navigate])

  if (!active || !current) return null

  return (
    <>
      {showIntro && (
        // No overlay element at all. The previous version wrapped this in a
        // fixed, blurred, full-viewport scrim; the card is docked directly now,
        // so there is nothing between the visitor and the tool.
        <div
          id={cardId}
          className="bkit-card"
          role="dialog"
          aria-labelledby={titleId}
          tabIndex={-1}
          ref={cardRef}
          onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); closeIntro() } }}
        >
          <div className="bkit-card-head">
            <span className="bkit-card-eyebrow">Brand kit</span>
            <button type="button" className="bkit-card-close" onClick={closeIntro} aria-label="Close">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <h2 id={titleId} className="bkit-card-title">Four steps to a full system.</h2>
          <p className="bkit-card-body">
            You are on step one and the tool below is live — nothing is waiting on this
            panel. Each step saves into the same system as you work, so the last step
            knows what you chose in the first, and you can leave and pick it up later.
          </p>
          <ol className="bkit-card-steps">
            {steps.map((s) => (
              <li key={s.id} className={s.id === step ? 'is-current' : ''}>
                <span className="bkit-card-num" aria-hidden="true">{s.number}</span>
                <span><strong>{s.label}</strong> — {s.blurb}</span>
              </li>
            ))}
          </ol>
          <button type="button" className="btn btn-accent bkit-card-go" onClick={closeIntro}>
            Start with {current.label.toLowerCase()}
          </button>
        </div>
      )}

      <div className="bkit-rail" role="region" aria-label="Brand kit walkthrough">
        <div className="bkit-rail-head">
          <span className="bkit-rail-eyebrow">Brand kit</span>
          {/* The count is the same reading the project card shows, so the two
              surfaces can never report different progress for one system. */}
          <span className="bkit-rail-count">{done} of {total} built</span>
        </div>

        {/* Real links, not buttons: the rail is a map of the flow, so
            middle-click and open-in-new-tab should work on it. Nothing is
            STAGED by these clicks — the state that carries between steps is the
            saved design both ends already read — so there is no draft that a
            modified click could strand in a tab that never navigates, and no
            slot needing navigatesThisTab() or a ttl. See utils/brandKitGuide.js. */}
        <ol className="bkit-steps">
          {steps.map((s) => (
            <li key={s.id}>
              <Link
                to={s.path}
                className={`bkit-step${s.id === step ? ' is-current' : ''}${s.done ? ' is-done' : ''}`}
                aria-current={s.id === step ? 'step' : undefined}
              >
                <span className="bkit-step-mark" aria-hidden="true">
                  {s.done ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  ) : s.number}
                </span>
                <span className="bkit-step-body">
                  <span className="bkit-step-label">{s.label}</span>
                  <StepArtefact step={s} />
                </span>
              </Link>
            </li>
          ))}
        </ol>

        <div className="bkit-rail-actions">
          <button
            type="button"
            className="bkit-rail-help"
            onClick={() => setShowIntro((v) => !v)}
            aria-expanded={showIntro}
            aria-controls={showIntro ? cardId : undefined}
            ref={introTriggerRef}
          >
            What&rsquo;s this?
          </button>
          {next ? (
            <button type="button" className="btn btn-accent bkit-rail-next" onClick={() => navigate(next.path)}>
              Next: {next.label}
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
            </button>
          ) : (
            <button type="button" className="btn btn-accent bkit-rail-next" onClick={exit}>
              {complete ? 'Finish & review' : 'Review what you have'}
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            </button>
          )}
          <button type="button" className="bkit-rail-close" onClick={exit} aria-label="Leave the walkthrough" title="Leave the walkthrough — your work is saved">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
      </div>
    </>
  )
}

/**
 * What this step produced, under its label.
 *
 * Swatches for colour because a list of six hex codes at this size is a wall and
 * the colours themselves are the artefact; text for the other two because a
 * family name and a ratio ARE readable at this size. Nothing at all for a step
 * with no work in it — "Not set" on three of four chips is noise, and the number
 * instead of a tick already says it.
 */
function StepArtefact({ step }) {
  if (!step.done) return null
  if (step.id === 'color') {
    const colors = step.artefact.colors || []
    if (!colors.length) return null
    return (
      <span className="bkit-step-swatches" aria-hidden="true">
        {colors.map((c, i) => (
          <span className="bkit-step-swatch" key={`${c}-${i}`} style={{ background: c }} />
        ))}
      </span>
    )
  }
  const text = step.artefact.text
  if (!text) return null
  return <span className="bkit-step-value">{text}</span>
}
