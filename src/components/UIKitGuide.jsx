import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useProject } from '../contexts/ProjectContext'
import { useSubscription } from '../contexts/SubscriptionContext'
import { useLoginPrompt } from '../contexts/LoginPromptContext'
import { getRecentIcons } from '../utils/recentIcons'
import { IDENTITY_NAME_MAX } from '../utils/kitIdentity'
import SaveRefusal from './SaveRefusal'
import {
  BRAND_KIT_STEPS,
  NEW_PROJECT_STATE,
  acceptStep,
  acceptedSteps,
  clearAcceptedSteps,
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
  const { design, updateDesign, saveProject, canSaveProjects } = useProject()
  const { planKnown } = useSubscription()
  const { requireLogin } = useLoginPrompt()
  // A new blank project opens the card again, seen before or not.
  const newProject = location.state?.newProject === NEW_PROJECT_STATE.newProject
  const firstStep = step === BRAND_KIT_STEPS[0].id
  const [active, setActive] = useState(() => isGuideActive())
  // The steps Next was pressed on. A new project arrives on step one with none.
  const [accepted, setAccepted] = useState(() => (newProject && firstStep ? [] : acceptedSteps()))
  useEffect(() => {
    if (newProject && firstStep) clearAcceptedSteps()
  }, [newProject, firstStep])
  // READ in the initialiser, WRITTEN on dismiss. React may render a component,
  // throw the result away and render it again (concurrent rendering, Suspense
  // retries, StrictMode's development double-invoke), so the "seen" flag must
  // not be burned by anything a discarded render can reach — the same split
  // utils/handoffSlot.js draws between peek and consume, for the same reason.
  const [showIntro, setShowIntro] = useState(
    () => firstStep && isGuideActive() && (newProject || !introSeen()),
  )
  const [showName, setShowName] = useState(false)
  const cardRef = useRef(null)
  const introTriggerRef = useRef(null)
  const nameTriggerRef = useRef(null)
  const titleId = useId()
  const cardId = useId()
  const nameCardId = useId()

  // Icons are the one step with no field in the saved design to compare, so the
  // signal is the recent-icons list the Icon Library already writes and the
  // dashboard rail already reads. Read once per render rather than kept in
  // state: it changes on another route, and this component remounts there.
  const iconsTouched = getRecentIcons().length > 0
  const { steps, done, total } = guideProgress(design, { iconsTouched, accepted })

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

  // Next counts the step as built, defaults and all, then moves on. On the last
  // tool it opens the closing step instead of leaving.
  const goNext = useCallback(() => {
    setAccepted(acceptStep(step))
    if (next) {
      navigate(next.path)
      return
    }
    setShowIntro(false)
    setShowName((v) => !v)
  }, [navigate, next, step])

  // ── The closing step: one name for the project and the kit ──────────────
  const [draft, setDraft] = useState(() => (typeof design?.identity?.name === 'string' ? design.identity.name : ''))
  const [nameError, setNameError] = useState('')
  const [refusal, setRefusal] = useState('')
  // Save is disabled from the press until the save lands, is refused, or the
  // sign-in it asked for is dismissed. The ref blocks a second press that
  // arrives before the disabled state renders.
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)
  const setBusy = useCallback((busy) => { savingRef.current = busy; setSaving(busy) }, [])
  const pendingNameRef = useRef(null)

  const save = useCallback((name) => {
    try {
      const id = saveProject(name, { identityName: name })
      endGuide()
      setActive(false)
      navigate(`/projects/${id}`)
    } catch (err) {
      // The free-plan cap. The design, the name and the flow all stay put.
      setRefusal(err?.message || 'That project could not be saved.')
      setBusy(false)
    }
  }, [navigate, saveProject, setBusy])

  const submitName = useCallback(async (e) => {
    e.preventDefault()
    if (savingRef.current) return
    const name = draft.trim()
    if (!name) {
      setNameError('Give your kit a name to save it.')
      return
    }
    setNameError('')
    setRefusal('')
    setBusy(true)
    // Written to the working design first, so the name rides through a sign-in
    // with everything else that was built.
    updateDesign({ identity: { name } })
    if (canSaveProjects) {
      save(name)
      return
    }
    pendingNameRef.current = name
    const user = await requireLogin('save your project', { free: true, signup: true })
    if (!user) {
      pendingNameRef.current = null
      setBusy(false)
    }
  }, [canSaveProjects, draft, requireLogin, save, setBusy, updateDesign])

  // After a sign-in from the closing step, the save runs once the account's own
  // plan has arrived (not the free default held until it does), so the cap is
  // checked against the plan the person is actually on.
  useEffect(() => {
    const name = pendingNameRef.current
    if (!name || !canSaveProjects || !planKnown) return
    pendingNameRef.current = null
    save(name)
  }, [canSaveProjects, planKnown, save])

  // Same focus contract as the orientation card, and focus goes back to the
  // control that opened it on close. On a touch screen focus goes to the
  // heading rather than the field: focusing the field would raise the
  // on-screen keyboard before the person has read the card.
  const nameInputRef = useRef(null)
  const nameTitleRef = useRef(null)
  useEffect(() => {
    if (!showName) return undefined
    const coarse = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches
    const first = coarse ? nameTitleRef.current : nameInputRef.current
    first?.focus()
    const trigger = nameTriggerRef.current
    return () => { if (trigger && trigger.isConnected) trigger.focus() }
  }, [showName])

  // On a phone a docked card is fixed 12px above the rail's top edge (see
  // tool-shell.css). That edge moves with the rail's height, which changes with
  // the step, and with the scroll at the end of the page, so it is measured
  // while a card is open.
  //
  // While the name form has focus and an on-screen keyboard is up, the card
  // docks 12px above the keyboard instead. The keyboard shrinks the visual
  // viewport, not the layout viewport a fixed card is placed in, so its height
  // is read off window.visualViewport. Where the keyboard shrinks the layout
  // viewport instead, nothing shows up there, so a focused field on a touch
  // screen is taken to mean the keyboard is up. The dock is recomputed on the
  // next frame rather than in the focus handler, so a tap that moves focus from
  // the field to Save still lands on Save.
  const railRef = useRef(null)
  const nameCardRef = useRef(null)
  const nameRowRef = useRef(null)
  const [dock, setDock] = useState(null)
  const cardOpen = showIntro || showName
  useEffect(() => {
    const rail = railRef.current
    if (!cardOpen || !rail) return undefined
    const vv = window.visualViewport
    const coarse = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches
    let frame = 0
    const measure = () => {
      frame = 0
      const railLift = Math.round(window.innerHeight - rail.getBoundingClientRect().top)
      const keyboard = vv ? Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)) : 0
      const focused = document.activeElement
      const inForm = !!focused && !!nameRowRef.current?.contains(focused)
      const lifted = inForm && (keyboard > 0 || (coarse && focused === nameInputRef.current))
      const next = lifted
        ? { bottom: keyboard + 12, room: Math.round(vv ? vv.height : window.innerHeight), top: Math.round(vv ? vv.offsetTop : 0) }
        : { bottom: railLift + 12 }
      setDock((prev) => (prev && prev.bottom === next.bottom && prev.room === next.room && prev.top === next.top ? prev : next))
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(measure) }
    schedule()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule)
    observer?.observe(rail)
    window.addEventListener('scroll', schedule, { passive: true, capture: true })
    window.addEventListener('resize', schedule)
    document.addEventListener('focusin', schedule)
    document.addEventListener('focusout', schedule)
    vv?.addEventListener('resize', schedule)
    vv?.addEventListener('scroll', schedule)
    return () => {
      cancelAnimationFrame(frame)
      observer?.disconnect()
      window.removeEventListener('scroll', schedule, { capture: true })
      window.removeEventListener('resize', schedule)
      document.removeEventListener('focusin', schedule)
      document.removeEventListener('focusout', schedule)
      vv?.removeEventListener('resize', schedule)
      vv?.removeEventListener('scroll', schedule)
    }
  }, [cardOpen, active, step])
  const lifted = !!dock?.room
  const dockStyle = dock && (lifted || dock.bottom > 12)
    ? {
        '--bkit-dock-bottom': `${dock.bottom}px`,
        ...(lifted ? { '--bkit-vv-h': `${dock.room}px`, '--bkit-vv-top': `${dock.top}px` } : null),
      }
    : undefined

  // A lifted card can be shorter than its content; keep the field and Save in
  // view inside it.
  useEffect(() => {
    const card = nameCardRef.current
    const row = nameRowRef.current
    if (!lifted || !card || !row) return
    const c = card.getBoundingClientRect()
    const r = row.getBoundingClientRect()
    if (r.bottom > c.bottom) card.scrollTop += r.bottom - c.bottom + 4
    else if (r.top < c.top) card.scrollTop -= c.top - r.top + 4
  }, [lifted, dock])

  // While the card is lifted for typing, the phone tab bar steps aside. Where the
  // keyboard shrinks the layout viewport the bar rides up on top of it, above the
  // card, and on a short landscape screen it sits right over Save. Where the
  // keyboard only shrinks the visual viewport the bar is under the keyboard
  // already, so nothing visible changes.
  // `dock` outlives the card, so the card has to be open too.
  const typing = showName && lifted
  useEffect(() => {
    if (!typing) return undefined
    const root = document.documentElement
    root.classList.add('bkit-typing')
    return () => root.classList.remove('bkit-typing')
  }, [typing])

  // The current step's chip is scrolled into the strip, so on a narrow screen
  // the step the person is on is the one they can see. Only the strip scrolls.
  const stepsRef = useRef(null)
  useEffect(() => {
    const strip = stepsRef.current
    const chip = strip?.querySelector('.bkit-step.is-current')
    if (!chip) return
    const s = strip.getBoundingClientRect()
    const c = chip.getBoundingClientRect()
    if (c.right > s.right) strip.scrollLeft += c.right - s.right
    else if (c.left < s.left) strip.scrollLeft -= s.left - c.left
  }, [active, step])

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
          style={dockStyle}
          role="dialog"
          aria-labelledby={titleId}
          tabIndex={-1}
          ref={cardRef}
          onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); closeIntro() } }}
        >
          <div className="bkit-card-head">
            <span className="bkit-card-eyebrow">Brand kit</span>
            <button type="button" className="bkit-card-close" onClick={closeIntro} aria-label="Close">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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

      {showName && (
        // The closing step, docked where the orientation card docks and
        // non-modal for the same reason: the icon library stays usable behind it.
        <div
          id={nameCardId}
          className={`bkit-card bkit-card--name${lifted ? ' is-lifted' : ''}`}
          style={dockStyle}
          ref={nameCardRef}
          role="dialog"
          aria-labelledby={`${nameCardId}-title`}
          onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); setShowName(false) } }}
        >
          <div className="bkit-card-head">
            <span className="bkit-card-eyebrow">Brand kit · Last step</span>
            <button type="button" className="bkit-card-close" onClick={() => setShowName(false)} aria-label="Close">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <h2 id={`${nameCardId}-title`} className="bkit-card-title" tabIndex={-1} ref={nameTitleRef}>Name your kit</h2>
          <p className="bkit-card-body">
            The name goes on the project and on the kit you export. You can change it
            later in Export.
          </p>
          <form className="bkit-name-form" onSubmit={submitName} noValidate>
            <label className="bkit-name-label" htmlFor={`${nameCardId}-name`}>Kit name</label>
            <div className="bkit-name-row" ref={nameRowRef}>
              <input
                id={`${nameCardId}-name`}
                ref={nameInputRef}
                className="bkit-name-input"
                type="text"
                value={draft}
                onChange={(e) => { setDraft(e.target.value); if (nameError) setNameError('') }}
                maxLength={IDENTITY_NAME_MAX}
                autoComplete="off"
                spellCheck="false"
                aria-invalid={nameError ? 'true' : undefined}
                aria-describedby={nameError ? `${nameCardId}-err` : `${nameCardId}-note`}
              />
              <button type="submit" className="btn btn-accent bkit-name-save" disabled={saving}>Save project</button>
            </div>
            {nameError ? (
              <p className="bkit-name-error" id={`${nameCardId}-err`} role="alert">{nameError}</p>
            ) : (
              <p className="bkit-name-note" id={`${nameCardId}-note`}>
                {canSaveProjects
                  ? 'Saved to your projects with the colours, fonts and type scale you chose.'
                  : 'Saving needs a free account. What you built stays here while you sign in.'}
              </p>
            )}
            {refusal && <SaveRefusal message={refusal} testId="brand-kit-save-refusal" />}
          </form>
        </div>
      )}

      <div className="bkit-rail" ref={railRef} role="region" aria-label="Brand kit walkthrough">
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
        <ol className="bkit-steps" ref={stepsRef}>
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
          {/* Text on wide screens; on a phone the text is visually hidden and
              the icon shows, so the control and its name both stay. */}
          <button
            type="button"
            className="bkit-rail-help"
            onClick={() => { setShowName(false); setShowIntro((v) => !v) }}
            aria-expanded={showIntro}
            aria-controls={showIntro ? cardId : undefined}
            ref={introTriggerRef}
          >
            <svg className="bkit-rail-help-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9.5" /><path d="M9.6 9.3a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.2-2.4 3.8" /><line x1="12" y1="17.2" x2="12" y2="17.3" />
            </svg>
            <span className="bkit-rail-help-text">What&rsquo;s this?</span>
          </button>
          {next ? (
            <button type="button" className="btn btn-accent bkit-rail-next" onClick={goNext}>
              Next: {next.label}
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-accent bkit-rail-next"
              onClick={goNext}
              aria-expanded={showName}
              aria-controls={showName ? nameCardId : undefined}
              ref={nameTriggerRef}
            >
              Next: Name your kit
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
            </button>
          )}
          <button type="button" className="bkit-rail-close" onClick={exit} aria-label="Leave the walkthrough" title="Leave the walkthrough. It is not saved as a project until you name it.">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
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
