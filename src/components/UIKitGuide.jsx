import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useProject } from '../contexts/ProjectContext'
import { useSubscription } from '../contexts/SubscriptionContext'
import { useLoginPrompt } from '../contexts/LoginPromptContext'
import { useExport } from '../contexts/ExportContext'
import { getRecentIcons } from '../utils/recentIcons'
import { IDENTITY_NAME_MAX } from '../utils/kitIdentity'
import SaveRefusal from './SaveRefusal'
import { hasOpenOverlays, suspendGuideForOverlays } from '../utils/openOverlays'
import {
  BRAND_KIT_STEPS,
  GUIDE_START_EVENT,
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
  savePatch,
} from '../utils/brandKitGuide'

// The Brand kit walkthrough, rendered by each of the four tools it walks.
//
// The reading behind it (what was broken, where the state lives, why progress
// is derived rather than counted) is in src/utils/brandKitGuide.js, next to the
// step model itself. This file is the surface. Two pieces:
//
//   1. THE BAR. A flat strip docked to the bottom of every step, showing all
//      four steps at once with a tick on the ones that are built AND THE
//      ARTEFACT EACH ONE PRODUCED: the real swatches, the real family names, the
//      real base and ratio. That is the difference between a guided flow and
//      four bookmarks: standing on Icons you can see the palette you drew on
//      Colours. Every value comes off the saved design, so the bar cannot show a
//      system the tools did not build. The bar is fixed to the foot of the
//      viewport at every width (tool-shell.css), so it has the same height, width
//      and position on all four tools and on every step.
//
//   2. THE PANEL. One surface that holds both the orientation copy and the
//      closing step where the project is named: a bottom sheet joined to the bar
//      on a phone, a popover hung from the button that opened it from 768px.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY THE PANEL IS NOT A MODAL
// ─────────────────────────────────────────────────────────────────────────────
// A focus trap IS blocking: it is the mechanism by which a modal makes the rest
// of the page unreachable, and `aria-modal` declares exactly that to assistive
// technology. The walkthrough must not block the step behind it, so the panel:
//
//   • does NOT declare aria-modal and does NOT trap focus; Tab walks out of it
//     into the tool behind, which is the point;
//   • does NOT lock scroll and paints NO scrim, so the tool stays fully usable
//     and fully visible while it is up;
//   • DOES take focus when it opens, DOES close on Escape, and DOES return
//     focus to whatever opened it.
//
// That is the correct contract for a NON-modal dialog. Declaring the modal
// attribute without trapping would fail tests/unit/modal-contract.test.js, and
// trapping would block the step. (That guard scans RAW source for the attribute,
// so this note names it in words rather than spelling out the declaration.)
//
// Escape is bound to the PANEL, not the window: while the panel is open the tool
// behind is live, and PaletteBuilder binds its own Escape to close colour
// popovers. A window-level handler here would eat that. Escape closes the panel
// whenever focus is inside it, which it is the moment it opens.
//
// ─────────────────────────────────────────────────────────────────────────────
// IT OPENS ONCE, THEN ONLY ON REQUEST
// ─────────────────────────────────────────────────────────────────────────────
// The orientation panel opens itself once, on the first step of a fresh flow.
// After that it is opt-in: `GUIDE_SEEN_KEY` records that it has been shown, and
// the bar keeps a permanent "What's this?" trigger so it is reachable again.
let bkitOffTimer = 0

const CLOSE_ICON = (size, stroke) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

const ARROW_ICON = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
)

const TICK_ICON = (
  <svg className="bkit-tick" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
)

export default function UIKitGuide({ step }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { design, updateDesign, saveProject, canSaveProjects } = useProject()
  const { exportActions } = useExport() || {}
  const { planKnown } = useSubscription()
  const { requireLogin } = useLoginPrompt()
  // A new blank project opens the panel again, seen before or not.
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
  // not be burned by anything a discarded render can reach: the same split
  // utils/handoffSlot.js draws between peek and consume, for the same reason.
  const [showIntro, setShowIntro] = useState(
    () => isGuideActive() && (location.state?.openBrandKitCard || (firstStep && (newProject || !introSeen()))),
  )
  const [showName, setShowName] = useState(false)
  // Only one panel exists at a time: the orientation copy, or the naming step.
  const panelOpen = showIntro || showName
  // Each explicit start opens the panel, including starts on the current page.
  // Track the arrival so dismissing it stays effective until the next press.
  const [cardArrival, setCardArrival] = useState(location.key)
  if (cardArrival !== location.key) {
    setCardArrival(location.key)
    if (location.state?.openBrandKitCard) {
      setShowName(false)
      setShowIntro(true)
    }
  }
  // Consume the request so reloading or revisiting this entry cannot reopen it.
  useEffect(() => {
    if (!location.state?.openBrandKitCard) return
    navigate(location.pathname + location.search + location.hash, { replace: true, state: null })
  }, [location, navigate])
  // A fresh start pressed on the page the flow begins on: the path it navigates
  // to is the one already on screen, so nothing remounts and the flag read
  // above is stale. startGuide announces the start; the first step's copy of
  // this guide takes it up as an arrival. Any other step's copy is about to be
  // navigated away from, so it ignores it.
  useEffect(() => {
    if (!firstStep) return undefined
    const onStart = () => {
      setActive(true)
      setAccepted(newProject ? [] : acceptedSteps())
      setShowIntro(newProject || !introSeen())
    }
    window.addEventListener(GUIDE_START_EVENT, onStart)
    return () => window.removeEventListener(GUIDE_START_EVENT, onStart)
  }, [firstStep, newProject])
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
  const { steps, total } = guideProgress(design, { iconsTouched, accepted })

  const current = steps.find((s) => s.id === step) || null
  const next = nextStep(step)

  // Focus the panel when it opens; hand focus back when it closes. `openedBy`
  // survives the close because the trigger is always mounted: the bar does not
  // unmount while the panel is up.
  const openedByRef = useRef(null)
  // Set by "What's this?": closing the name panel on the way can move focus to
  // the Name button first, so the help button names itself as the opener.
  const introOpenerRef = useRef(null)
  useEffect(() => {
    if (!showIntro) return undefined
    openedByRef.current = introOpenerRef.current || document.activeElement
    introOpenerRef.current = null
    if (!hasOpenOverlays(document.body)) cardRef.current?.focus()
    // Copied into the effect's own scope rather than read off the ref inside the
    // cleanup: by the time cleanup runs the ref may point at a different node,
    // and this is the fallback that has to still BE the trigger.
    const trigger = introTriggerRef.current
    return () => {
      const back = openedByRef.current
      // Three ways `back` is not somewhere to return to:
      //   · nothing had focus;
      //   · the opener was DETACHED, very often true, because the control that
      //     started the flow is a mega-menu button that unmounts on the route
      //     change. .focus() on a detached node is a silent no-op;
      //   · the opener was <body>, which is what `activeElement` reports when
      //     nothing is focused. body IS connected, so an isConnected check alone
      //     waves it through and "restores" focus to nowhere. That is the normal
      //     case here, because the panel opens ITSELF on arrival rather than
      //     being opened by a press.
      // The bar's own trigger is the answer in all three: it is always mounted
      // while the panel is up, and it is what re-opens the panel.
      const usable = back && back !== document.body && back.isConnected
      const target = usable ? back : trigger
      if (target && target.isConnected) target.focus()
    }
  }, [showIntro])

  const closeIntro = useCallback(() => {
    setShowIntro(false)
    markIntroSeen()
  }, [])

  // The X ends the walkthrough in place: no navigation. The panel closes with it.
  const leftInPlaceRef = useRef(false)
  const exit = useCallback(() => {
    leftInPlaceRef.current = true
    endGuide()
    setActive(false)
    setShowIntro(false)
    setShowName(false)
  }, [])

  // The X unmounts with the bar, so focus would fall to <body>. It goes to the
  // page's own main landmark (App's skip-link target, tabIndex -1). An effect on
  // `active`, so it runs after the panel-close cleanups above, not before them.
  useEffect(() => {
    if (active || !leftInPlaceRef.current) return
    leftInPlaceRef.current = false
    document.getElementById('main')?.focus({ preventScroll: true })
  }, [active])

  // Next counts the step as built, defaults and all, then moves on. On the last
  // tool it opens the closing step instead of leaving.
  const goNext = useCallback(() => {
    setAccepted(acceptStep(step))
    // The palette board shows an untouched random draw without saving it (it is
    // not work until someone chooses it). Pressing Next on Colours is that
    // choice, so the board the person is looking at is what the project keeps.
    const live = exportActions?.path === '/create/palette' ? exportActions.design?.palette : null
    if (step === 'color' && Array.isArray(live?.colors) && live.colors.length > 1) updateDesign({ palette: live })
    if (next) {
      navigate(next.path)
      return
    }
    setShowIntro(false)
    setShowName((v) => !v)
  }, [exportActions, navigate, next, step, updateDesign])

  // ── The closing step: one name for the project and the kit ──────────────
  const [draft, setDraft] = useState(() => (typeof design?.identity?.name === 'string' ? design.identity.name : ''))
  const [nameError, setNameError] = useState('')
  const [refusal, setRefusal] = useState('')
  // Signing in needs a connection. Offline, the name is kept and Save stays
  // pressable, so it can be tried again once the connection is back.
  const [offline, setOffline] = useState(false)
  // Save is disabled from the press until the save lands, is refused, or the
  // sign-in it asked for is dismissed. The ref blocks a second press that
  // arrives before the disabled state renders.
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)
  const setBusy = useCallback((busy) => { savingRef.current = busy; setSaving(busy) }, [])
  const pendingNameRef = useRef(null)

  const save = useCallback((name) => {
    try {
      // `patch`: the parts moved past with Next, and the tints made from the colours.
      const id = saveProject(name, { identityName: name, patch: savePatch(design) })
      endGuide()
      setActive(false)
      navigate(`/projects/${id}/export`)
    } catch (err) {
      // The free-plan cap. The design, the name and the flow all stay put.
      setRefusal(err?.message || 'That project could not be saved.')
      setBusy(false)
    }
  }, [design, navigate, saveProject, setBusy])

  const nameInputRef = useRef(null)
  const nameTitleRef = useRef(null)
  const submitName = useCallback(async (e) => {
    e.preventDefault()
    if (savingRef.current) return
    const name = draft.trim()
    if (!name) {
      setNameError('Give your project a name to save it.')
      // Back to the field so the person can type at once. On a touch screen it
      // goes to the title instead, so an error does not raise the keyboard.
      const coarse = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches
      ;(coarse ? nameTitleRef.current : nameInputRef.current)?.focus()
      return
    }
    setNameError('')
    setRefusal('')
    // Written to the working design first, so the name rides through a sign-in
    // (or an offline stretch) with everything else that was built.
    updateDesign({ identity: { name } })
    if (!canSaveProjects && typeof navigator !== 'undefined' && navigator.onLine === false) {
      setOffline(true)
      return
    }
    setOffline(false)
    setBusy(true)
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

  // Same focus contract as the orientation panel, and focus goes back to the
  // control that opened it on close. On a touch screen focus goes to the title
  // rather than the field: focusing the field would raise the on-screen keyboard
  // before the person has read it.
  useEffect(() => {
    if (!showName) return undefined
    const coarse = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches
    const first = coarse ? nameTitleRef.current : nameInputRef.current
    if (!hasOpenOverlays(document.body)) first?.focus()
    const trigger = nameTriggerRef.current
    return () => { if (trigger && trigger.isConnected) trigger.focus() }
  }, [showName])

  // Where the panel sits is mostly CSS: a sheet on the bar's top edge on a phone,
  // a popover just above it from 768px. Two things are measured while it is open:
  //
  //   · the trailing edge of the button that opened it, which the popover hangs
  //     from (the "What's this?" button, or on the last step the "Name your
  //     project" button). The first measure runs before paint so the popover
  //     never appears in one place and then jumps to another.
  //   · the visible area, because an on-screen keyboard shrinks the visual
  //     viewport and not the layout viewport a fixed panel is placed in. While
  //     the name field has focus and a keyboard is up, the panel docks 12px above
  //     the keyboard and the bar steps out of the way. Where the keyboard
  //     shrinks the layout viewport instead, nothing shows up there, so a focused
  //     field on a touch screen is taken to mean the keyboard is up. The dock is
  //     recomputed on the next frame rather than in the focus handler, so a tap
  //     that moves focus from the field to Save still lands on Save.
  const railRef = useRef(null)
  const nameRowRef = useRef(null)
  const [dock, setDock] = useState(null)
  const shown = active && !!current
  // `bkit-on` is set before first paint and lasts while the walkthrough is
  // showing. On a phone it hides the tab bar and zeroes --tabbar-h (so the page
  // and scroll padding that read it collapse), and at every width it lifts
  // toasts and the feedback button above the bar.
  useLayoutEffect(() => {
    if (!shown) return undefined
    const root = document.documentElement
    window.clearTimeout(bkitOffTimer)
    root.classList.add('bkit-on')
    // A tool's own bottom toolbar keeps the screen's bottom edge and the bar sits
    // directly on it. Only a toolbar that is pinned to the viewport counts: one
    // that scrolls with the page has nothing to stack on.
    const toolbar = step === 'color' ? railRef.current?.closest('.plb')?.querySelector('.plb-adjust') : null
    const docked = window.matchMedia('(min-width:768px)')
    const measure = () => {
      if (toolbar && getComputedStyle(toolbar).position === 'fixed') root.style.setProperty('--bkit-toolbar-h', `${toolbar.getBoundingClientRect().height}px`)
      else root.style.removeProperty('--bkit-toolbar-h')
    }
    measure()
    const observer = toolbar && typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    observer?.observe(toolbar)
    docked.addEventListener('change', measure)
    return () => {
      observer?.disconnect()
      docked.removeEventListener('change', measure)
      root.style.removeProperty('--bkit-toolbar-h')
      // Each tool mounts its own copy, so moving between steps unmounts one and
      // mounts the next with a gap between (a lazy route). While the flow is still
      // on, the class is held through that gap so the tab bar does not flash back.
      window.clearTimeout(bkitOffTimer)
      if (isGuideActive()) bkitOffTimer = window.setTimeout(() => root.classList.remove('bkit-on'), 1500)
      else root.classList.remove('bkit-on')
    }
  }, [shown, step])
  useLayoutEffect(() => {
    const rail = railRef.current
    if (!panelOpen || !rail) return undefined
    const vv = window.visualViewport
    const coarse = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches
    let frame = 0
    const measure = () => {
      frame = 0
      const keyboard = vv ? Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)) : 0
      const focused = document.activeElement
      const inForm = !!focused && !!nameRowRef.current?.contains(focused)
      const lifted = inForm && (keyboard > 0 || (coarse && focused === nameInputRef.current))
      const anchor = showName ? nameTriggerRef.current : introTriggerRef.current
      const end = anchor ? Math.round(document.documentElement.clientWidth - anchor.getBoundingClientRect().right) : null
      const next = {
        vvh: Math.round(vv ? vv.height : window.innerHeight),
        top: Math.round(vv ? vv.offsetTop : 0),
        bottom: keyboard + 12,
        lifted,
        end,
      }
      setDock((prev) => (prev && prev.vvh === next.vvh && prev.top === next.top && prev.bottom === next.bottom && prev.lifted === next.lifted && prev.end === next.end ? prev : next))
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(measure) }
    measure()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule)
    observer?.observe(rail)
    // The actions sit at the bar's trailing end, so a change in their width
    // (a web font arriving) moves the button the popover hangs from.
    const actions = rail.querySelector('.bkit-rail-actions')
    if (actions) observer?.observe(actions)
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
  }, [panelOpen, showName, active, step])
  const lifted = panelOpen && !!dock?.lifted
  const dockStyle = dock
    ? {
        '--bkit-vvh': `${dock.vvh}px`,
        ...(dock.end != null ? { '--bkit-dock-end': `${dock.end}px` } : null),
        ...(lifted ? { '--bkit-dock-bottom': `${dock.bottom}px`, '--bkit-vv-top': `${dock.top}px` } : null),
      }
    : undefined

  // A lifted panel can be shorter than its content; keep the field and Save in
  // view inside it.
  useEffect(() => {
    const card = cardRef.current
    const row = nameRowRef.current
    if (!lifted || !showName || !card || !row) return
    const c = card.getBoundingClientRect()
    const r = row.getBoundingClientRect()
    if (r.bottom > c.bottom) card.scrollTop += r.bottom - c.bottom + 4
    else if (r.top < c.top) card.scrollTop -= c.top - r.top + 4
  }, [lifted, showName, dock])

  // The current step's link is scrolled into the strip, so on a narrow screen
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

  // Keep the panel mounted so opening a tool menu cannot consume the intro or
  // discard a name draft. Observe portals too, including the phone sheets.
  useLayoutEffect(() => {
    if (!active || !panelOpen) return undefined
    return suspendGuideForOverlays(document, [cardRef.current].filter(Boolean))
  }, [active, panelOpen, showName])

  if (!active || !current) return null

  const nameMessage = (
    <>
      {nameError ? (
        <p className="bkit-name-error" id={`${nameCardId}-err`} role="alert">{nameError}</p>
      ) : offline ? (
        <p className="bkit-name-note" id={`${nameCardId}-note`} role="status">
          You&rsquo;re offline. Your work stays here. Save once you&rsquo;re back online.
        </p>
      ) : (
        <p className="bkit-name-note" id={`${nameCardId}-note`}>
          {canSaveProjects
            ? 'Saves to your projects with your colours, fonts, type scale and tints.'
            : 'Saving needs a free account. What you built stays here while you sign in.'}
        </p>
      )}
      {refusal && <SaveRefusal message={refusal} testId="brand-kit-save-refusal" />}
    </>
  )

  // Where the person is, not how much is built: the ticks on the steps carry
  // what is done.
  const position = steps.indexOf(current) + 1
  const count = `Step ${position} of ${total}`
  // "Start with" belongs to the first step. Reopened on a later one, the same
  // button leads back to where the person already is.
  const stepNumber = ['one', 'two', 'three', 'four', 'five', 'six'][position - 1] || String(position)
  const goLabel = `${firstStep ? 'Start with' : 'Back to'} ${current.label.toLowerCase()}`

  return (
    <>
      {showIntro && (
        // No overlay element at all: the panel is docked directly, so there is
        // nothing between the visitor and the tool.
        <BkitPanel
          key="intro"
          id={cardId}
          panelRef={cardRef}
          style={dockStyle}
          titleId={titleId}
          title="Four steps to a full system."
          tabIndex={-1}
          onClose={closeIntro}
          onEscape={closeIntro}
        >
          <p className="bkit-card-body">
            You&rsquo;re on step {stepNumber}, and the tool is ready to use. Each step saves into
            the same system as you work, so the last step knows what you chose in the
            first. You can leave and pick it up later.
          </p>
          <ol className="bkit-card-steps">
            {steps.map((s) => (
              <li key={s.id} className={`${s.id === step ? 'is-current' : ''}${s.done ? ' is-done' : ''}`}>
                <span className="bkit-card-num" aria-hidden="true">
                  <span className="bkit-step-num">{s.number}</span>
                  {TICK_ICON}
                </span>
                <span className="bkit-card-text">
                  <strong>{s.label}</strong>
                  <span className="bkit-card-blurb">{s.blurb}</span>
                  {s.done && <span className="bkit-card-artefact"><StepArtefact step={s} /></span>}
                </span>
              </li>
            ))}
          </ol>
          <button type="button" className="btn btn-accent bkit-card-go" onClick={closeIntro}>
            {goLabel}
          </button>
        </BkitPanel>
      )}

      {showName && (
        // The closing step shares the panel: the icon library stays usable
        // behind it, and the same Escape, focus and overlay rules apply.
        <BkitPanel
          key="name"
          id={nameCardId}
          panelRef={cardRef}
          style={dockStyle}
          titleId={`${nameCardId}-title`}
          titleRef={nameTitleRef}
          title="Name your project"
          lifted={lifted}
          modifier="bkit-card--name"
          onClose={() => setShowName(false)}
          onEscape={() => setShowName(false)}
        >
          <p className="bkit-card-body">
            The name goes on the project and on the kit you export.
          </p>
          <form className="bkit-name-form" onSubmit={submitName} noValidate aria-busy={saving ? 'true' : undefined}>
            <label className="bkit-name-label" htmlFor={`${nameCardId}-name`}>Project name</label>
            <div className="bkit-name-row" ref={nameRowRef}>
              <input
                id={`${nameCardId}-name`}
                ref={nameInputRef}
                className="bkit-name-input"
                type="text"
                inputMode="text"
                autoCapitalize="words"
                enterKeyHint="done"
                value={draft}
                onChange={(e) => { setDraft(e.target.value); if (nameError) setNameError(''); if (offline) setOffline(false) }}
                maxLength={IDENTITY_NAME_MAX}
                autoComplete="off"
                spellCheck="false"
                aria-invalid={nameError ? 'true' : undefined}
                aria-describedby={nameError ? `${nameCardId}-err` : `${nameCardId}-note`}
              />
              <button type="submit" className="btn btn-accent bkit-name-save" disabled={saving}>{saving ? 'Saving…' : 'Save project'}</button>
            </div>
            <div className="bkit-name-msg">{nameMessage}</div>
          </form>
        </BkitPanel>
      )}

      <div className={`bkit-rail${lifted ? ' bkit-rail--kbd' : ''}`} ref={railRef} role="region" aria-label="Brand kit walkthrough">
        <div className="bkit-rail-head">
          <span className="bkit-rail-eyebrow">Brand kit</span>
          {/* Drawn at every width; the title shows only from 1056px. */}
          <span className="bkit-rail-count" aria-live="polite">{count}</span>
        </div>

        {/* Real links, not buttons: the bar is a map of the flow, so
            middle-click and open-in-new-tab should work on it. Nothing is
            STAGED by these clicks (the state that carries between steps is the
            saved design both ends already read), so there is no draft that a
            modified click could strand in a tab that never navigates. See
            utils/brandKitGuide.js. */}
        <ol className="bkit-steps" ref={stepsRef}>
          {steps.map((s) => (
            <li key={s.id}>
              <Link
                to={s.path}
                className={`bkit-step${s.id === step ? ' is-current' : ''}${s.done ? ' is-done' : ''}`}
                aria-current={s.id === step ? 'step' : undefined}
              >
                <span className="bkit-step-mark" aria-hidden="true">
                  <span className="bkit-step-num">{s.number}</span>
                  {TICK_ICON}
                </span>
                <span className="bkit-step-body">
                  <span className="bkit-step-label" data-label={s.label}>{s.label}</span>
                  <StepArtefact step={s} decorative />
                </span>
                <span className="sr-only">{s.done ? ', done' : ', not started'}</span>
              </Link>
            </li>
          ))}
        </ol>

        {/* Close first, so the walkthrough's exit sits away from its primary
            action; Next is last, at the trailing end. */}
        <div className="bkit-rail-actions">
          <button type="button" className="bkit-rail-close" onClick={exit} aria-label="Leave the walkthrough" title="Leave the walkthrough. It is not saved as a project until you name it.">
            {CLOSE_ICON(14, 2.4)}
          </button>
          {/* Text from 1080px; below that the text is visually hidden and the
              icon shows, so the control and its name both stay. */}
          <button
            type="button"
            className="bkit-rail-help"
            onClick={(e) => { introOpenerRef.current = e.currentTarget; setShowName(false); setShowIntro((v) => !v) }}
            aria-expanded={showIntro}
            aria-controls={showIntro ? cardId : undefined}
            ref={introTriggerRef}
          >
            <svg className="bkit-rail-help-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9.5" /><path d="M9.6 9.3a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.2-2.4 3.8" /><line x1="12" y1="17.2" x2="12" y2="17.3" />
            </svg>
            <span className="bkit-rail-help-text">What&rsquo;s this?</span>
          </button>
          {/* One filled button per view: while the panel is open its own button
              takes the fill and this one draws as an outline. */}
          {next ? (
            <button type="button" className={`btn bkit-rail-next${panelOpen ? ' is-outline' : ' btn-accent'}`} onClick={goNext}>
              <span className="bkit-rail-next-text">Next: {next.label}</span>
              {ARROW_ICON}
            </button>
          ) : (
            <button
              type="button"
              className={`btn bkit-rail-next${panelOpen ? ' is-outline' : ' btn-accent'}`}
              onClick={goNext}
              aria-expanded={showName}
              aria-controls={showName ? nameCardId : undefined}
              ref={nameTriggerRef}
            >
              <span className="bkit-rail-next-text">Name your project</span>
              {ARROW_ICON}
            </button>
          )}
        </div>
      </div>
      {/* The bar is fixed to the foot of the viewport; this keeps its height in
          the page so the end of the tool scrolls clear of it. */}
      <div className="bkit-rail-space" aria-hidden="true" />
    </>
  )
}

/**
 * The one floating surface of the walkthrough: a title row, a close control and
 * whatever the caller puts under it. Escape is handled here, bound to the panel.
 * The `bkit-card` class is also what utils/openOverlays.js excludes from the
 * "another overlay is open" check, so the panel never counts as an obstruction
 * to itself.
 */
function BkitPanel({ id, panelRef, style, titleId, titleRef, title, tabIndex, lifted, modifier, onClose, onEscape, children }) {
  return (
    <div
      id={id}
      className={`bkit-card${modifier ? ` ${modifier}` : ''}${lifted ? ' is-lifted' : ''}`}
      style={style}
      role="dialog"
      aria-labelledby={titleId}
      tabIndex={tabIndex}
      ref={panelRef}
      onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); onEscape() } }}
    >
      <span className="bkit-card-grab" aria-hidden="true" />
      <div className="bkit-card-head">
        <div className="bkit-card-headtext">
          <h2 id={titleId} className="bkit-card-title" tabIndex={titleRef ? -1 : undefined} ref={titleRef}>{title}</h2>
        </div>
        <button type="button" className="bkit-card-close" onClick={onClose} aria-label="Close">
          {CLOSE_ICON(16, 2)}
        </button>
      </div>
      {children}
    </div>
  )
}

/**
 * What this step produced, beside its label.
 *
 * Swatches for colour because a list of six hex codes at this size is a wall and
 * the colours themselves are the artefact; text for the other two because a
 * family name and a ratio ARE readable at this size. Nothing at all for a step
 * with no work in it: "Not set" on three of four steps is noise, and the number
 * instead of a tick already says it.
 *
 * On the bar (`decorative`) it is hidden from assistive technology, because the
 * panel's list carries the readable version.
 */
function StepArtefact({ step, decorative = false }) {
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
  return <span className="bkit-step-value" aria-hidden={decorative ? 'true' : undefined}>{text}</span>
}
