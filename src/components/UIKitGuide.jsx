import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useNavigationType } from 'react-router-dom'
import { useProject } from '../contexts/ProjectContext'
import { useSubscription } from '../contexts/SubscriptionContext'
import { useLoginPrompt } from '../contexts/LoginPromptContext'
import { useExport } from '../contexts/ExportContext'
import useMediaQuery from '../hooks/useMediaQuery'
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
  firstIncompleteStep,
  guideProgress,
  introSeen,
  isGuideActive,
  markIntroSeen,
  nextStep,
  savePatch,
  startGuide,
  stepArtefacts,
  touchGuide,
  withDefaults,
} from '../utils/brandKitGuide'
import {
  colourKey,
  atRisk,
  capLine,
  chooserDecision,
  classifyArrival,
  continueCopy,
  otherProjects,
  sourceProject as findSourceProject,
  startNewMeta,
  whenText,
  workingStatus,
} from '../utils/brandKitChooser'
import { SESSION_DONE, SESSION_ON, markSession, readEditedAt, readSession } from '../utils/kitSession'
import { designsMatch } from '../utils/parkedDesign'
import { hasPendingSave } from '../utils/pendingSave'
import { partsPresent } from '../utils/userHome'

// How long a press on the foot of the screen is swallowed after the X ends the
// walkthrough. The bar unmounts under a finger or pointer that is still on the
// same spot, so a second press of the X would land on whatever the page keeps
// there (an Add column button, the tab bar's You tab).
const EXIT_SHIELD_MS = 500

// Each tool's own bottom toolbar, which keeps the screen's bottom edge while the
// bar sits directly on it: [the page root, the toolbar inside it]. Colours' Adjust
// row is pinned from 768px; Font Pair's and Type scale's docks are pinned below
// 1024px (from there they sit above the floating pill instead).
const BOTTOM_TOOLBAR = {
  color: ['.plb', '.plb-adjust'],
  fonts: ['.fpr-page', '.fpr-dock'],
  typescale: ['.tsc-page', '.tsc-dock'],
}

// The Brand kit walkthrough, rendered by each of the four tools it walks.
//
// The reading behind it (what was broken, where the state lives, why progress
// is derived rather than counted) is in src/utils/brandKitGuide.js, next to the
// step model itself. This file is the surface. Two pieces:
//
//   1. THE BAR. A strip docked to the bottom of every step (a floating glass
//      pill from 1024px), showing all four steps at once with a tick on the
//      ones that are built. The help panel lists THE ARTEFACT EACH ONE
//      PRODUCED: the real swatches, the real family names, the real base and
//      ratio. That is the difference between a guided flow and four bookmarks:
//      standing on Icons you can see the palette you drew on Colours. Every
//      value comes off the saved design, so neither can show a system the tools
//      did not build.
//      The bar is fixed over the foot of the viewport at every width
//      (tool-shell.css), so it has the same height, width and position on all
//      four tools and on every step.
//
//   2. THE PANEL. One surface that holds both the orientation copy and the
//      closing step where the project is named: from 768px a popover hung from
//      the button that opened it. On a phone the orientation half is the steps
//      panel (the four steps, the help line and Close), opened upward from the
//      bar's steps trigger, and the naming step is its own sheet.
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

// `linked`: the page is showing a shared palette (a ?c= link or the homepage
// hand-off). That view is somebody else's palette, not this person's walkthrough,
// so the bar stays away and the flow's idle clock is left alone.
export default function UIKitGuide({ step, linked = false }) {
  const navigate = useNavigate()
  const navType = useNavigationType()
  const location = useLocation()
  const {
    design, updateDesign, saveProject, overwriteProject, projects, canSaveProjects,
    loadProject, resetDesign, remountTool, parked, projectLimit, atProjectLimit,
  } = useProject()
  const { exportActions } = useExport() || {}
  const { planKnown } = useSubscription()
  const { requireLogin } = useLoginPrompt()
  // Under 768px the bar is a different set of controls, not the tablet row
  // restyled: one trigger that opens the steps panel, and Next. CSS cannot swap
  // markup, so the width is read here.
  const phone = useMediaQuery('(max-width: 767px)')
  // A new blank project opens the panel again, seen before or not.
  const newProject = location.state?.newProject === NEW_PROJECT_STATE.newProject
  const firstStep = step === BRAND_KIT_STEPS[0].id
  const [active, setActive] = useState(() => !linked && isGuideActive())
  // A tool of the flow is on screen: the flow was visited, so it is not left behind.
  useEffect(() => { if (!linked) touchGuide() }, [linked])

  // ── The chooser: carry on with the last brand kit, open another, or start new ──
  // Whether to ask is decided from storage, so it can be asked again for a press on
  // the page the walkthrough starts on (no remount) as well as on arrival.
  const readDecision = (arrival) => chooserDecision({
    status: workingStatus(design, projects),
    arrival,
    onFirstStep: firstStep,
    flagActive: isGuideActive(),
    editedAt: readEditedAt(),
    session: readSession(),
    pendingSave: hasPendingSave(),
  })
  // How this page was reached, read once on mount; the navigation state that says
  // so is cleared below so a reload cannot repeat it.
  const [mountArrival] = useState(() => classifyArrival({ state: location.state, navType, key: location.key, linked }))
  const [mountDecision] = useState(() => readDecision(mountArrival))
  const [showChooser, setShowChooser] = useState(mountDecision.show)
  const [chooserEditedAt, setChooserEditedAt] = useState(readEditedAt)
  const [chooserOpenOther, setChooserOpenOther] = useState(false)
  // An edit to a swatch while the chooser is open answers it as "carry on". Only
  // the colours are compared, in one spelling: the board restates the same
  // palette a moment after it mounts, and that is not an edit.
  const paletteKey = colourKey(design)
  const [chooserPalette, setChooserPalette] = useState(paletteKey)
  // A kit that is not asked about on a press is the answer for this tab: the next
  // arrival carries on without asking. Opening the page by address answers
  // nothing, and a kit just finished stays unanswered until asked.
  useEffect(() => {
    if (mountArrival !== 'direct' && mountDecision.eligible && !mountDecision.show && readSession() !== SESSION_DONE) markSession(SESSION_ON)
  }, [mountArrival, mountDecision])
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
  // One panel per arrival: when the chooser asks, the orientation copy waits.
  const [showIntro, setShowIntro] = useState(
    () => !mountDecision.show && !linked && isGuideActive() && (location.state?.openBrandKitCard || (firstStep && (newProject || !introSeen()))),
  )
  const [showName, setShowName] = useState(false)
  // The edit check sits below the panels' state because it closes them.
  if (showChooser && chooserPalette !== paletteKey) {
    setChooserPalette(paletteKey)
    setShowChooser(false)
    setChooserOpenOther(false)
    setShowIntro(false)
  }
  // The orientation panel opens short, on arrival; "What's this?" opens it with
  // the list of all four steps.
  const [introFull, setIntroFull] = useState(false)
  // Only one panel exists at a time: the chooser, the orientation copy, or the
  // naming step.
  const panelOpen = showIntro || showName || showChooser
  // Each explicit start opens the panel, including starts on the current page.
  // Track the arrival so dismissing it stays effective until the next press.
  const [cardArrival, setCardArrival] = useState(location.key)
  if (cardArrival !== location.key) {
    setCardArrival(location.key)
    if (location.state?.openBrandKitCard) {
      const asks = readDecision('brand-kit').show
      // A shared palette's page view had the bar switched off; pressing the
      // walkthrough's own button turns it on.
      setActive(isGuideActive())
      setShowName(false)
      setIntroFull(false)
      setChooserOpenOther(false)
      setChooserEditedAt(readEditedAt())
      setChooserPalette(paletteKey)
      setShowChooser(asks)
      setShowIntro(!asks)
    }
  }
  // Consume the request so reloading or revisiting this entry cannot reopen it.
  useEffect(() => {
    if (!location.state?.openBrandKitCard && !location.state?.brandKitArrival) return
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
      setIntroFull(false)
      setShowIntro(newProject || !introSeen())
    }
    window.addEventListener(GUIDE_START_EVENT, onStart)
    return () => window.removeEventListener(GUIDE_START_EVENT, onStart)
  }, [firstStep, newProject])
  const cardRef = useRef(null)
  const goRef = useRef(null)
  // The phone's steps panel has no "go" button; its heading takes focus instead.
  const panelHeadRef = useRef(null)
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
  const { steps, total, done: built } = guideProgress(design, { iconsTouched, accepted })

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
    // Focus goes to the card's own button rather than to the card: a ring on a
    // button reads as "you are here", and the same ring round the whole card read
    // as an error. The card still names itself to a screen reader as focus enters.
    if (!hasOpenOverlays(document.body)) (goRef.current || panelHeadRef.current || cardRef.current)?.focus()
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

  // ── The chooser's answers ──────────────────────────────────────────────────
  // Every answer settles the tab's question and closes the panel. Escape, the X
  // and an edit to the board answer "carry on" without moving the person off the
  // step they are on; the Continue row is the one that goes to the first gap.
  const chooserId = useId()
  const defaultRowRef = useRef(null)
  const status = workingStatus(design, projects)
  const settleChooser = useCallback(() => {
    markSession(SESSION_ON)
    setShowChooser(false)
    setChooserOpenOther(false)
    // The start event may have opened the orientation copy under the chooser.
    setShowIntro(false)
  }, [])
  const dismissChooser = useCallback(() => {
    startGuide()
    settleChooser()
  }, [settleChooser])
  const continueKit = () => {
    startGuide()
    const target = firstIncompleteStep(design, { iconsTouched, accepted: acceptedSteps() })
    settleChooser()
    if (target && target.id !== step) navigate(target.path)
  }
  // The working design is put aside by resetDesign when it holds unsaved work.
  const startNewKit = () => {
    resetDesign()
    remountTool()
    endGuide()
    startGuide()
    settleChooser()
  }
  const openKit = (project) => {
    const target = firstIncompleteStep(project.design, { iconsTouched, accepted: [] }) || BRAND_KIT_STEPS[0]
    loadProject(project.id)
    remountTool()
    startGuide()
    clearAcceptedSteps()
    settleChooser()
    if (target.id !== step) navigate(target.path)
  }

  // A question closed by an edit, which settles nothing by itself, is noted here.
  const wasAsking = useRef(showChooser)
  useEffect(() => {
    if (showChooser) { wasAsking.current = true; return }
    if (wasAsking.current) { wasAsking.current = false; markSession(SESSION_ON) }
  }, [showChooser])

  // Focus starts on the default row; on close it goes back to the bar's trigger.
  useEffect(() => {
    if (!showChooser) return undefined
    if (!hasOpenOverlays(document.body)) defaultRowRef.current?.focus()
    const trigger = introTriggerRef.current
    return () => { if (trigger && trigger.isConnected) trigger.focus() }
  }, [showChooser])

  // Up and Down walk the rows; Tab still walks every control in order.
  const onChooserKeys = (e) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    const rows = [...e.currentTarget.querySelectorAll('[data-choose-row]')]
    const at = rows.indexOf(document.activeElement)
    if (at < 0) return
    e.preventDefault()
    rows[Math.min(rows.length - 1, Math.max(0, at + (e.key === 'ArrowDown' ? 1 : -1)))]?.focus()
  }

  // The X ends the walkthrough in place: no navigation. The panel closes with it.
  const leftInPlaceRef = useRef(false)
  // Where the bar stood when the X was pressed, kept as an invisible cover for a
  // moment so a second press of the X lands on nothing.
  const [shield, setShield] = useState(null)
  useEffect(() => {
    if (!shield) return undefined
    const timer = window.setTimeout(() => setShield(null), EXIT_SHIELD_MS)
    return () => window.clearTimeout(timer)
  }, [shield])
  const exit = useCallback(() => {
    // The bar and, on a phone, the open steps panel above it: "Close the
    // walkthrough" is in the panel, so a second press would land on the page there.
    const rail = railRef.current
    const boxes = [rail, rail?.querySelector('.bkit-card--steps')].filter(Boolean).map((el) => el.getBoundingClientRect())
    if (boxes.length) {
      const top = Math.min(...boxes.map((b) => b.top))
      const left = Math.min(...boxes.map((b) => b.left))
      setShield({ top, left, width: Math.max(...boxes.map((b) => b.right)) - left, height: Math.max(...boxes.map((b) => b.bottom)) - top })
    }
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
  // Moving past a step, by Next or by a later step's link on the bar, keeps what
  // is on screen: the step counts as built, and the palette board's untouched
  // random draw (not work until someone chooses it) becomes the saved palette.
  const commitStep = useCallback(() => {
    setAccepted(acceptStep(step))
    const live = exportActions?.path === '/create/palette' ? exportActions.design?.palette : null
    if (step === 'color' && Array.isArray(live?.colors) && live.colors.length > 1) updateDesign({ palette: live })
  }, [exportActions, step, updateDesign])
  const goNext = useCallback(() => {
    if (showChooser) settleChooser()
    commitStep()
    if (next) {
      navigate(next.path)
      return
    }
    setShowIntro(false)
    setShowName((v) => !v)
  }, [commitStep, navigate, next, settleChooser, showChooser])
  // A plain press on a LATER step's link commits this one first, like Next. A
  // step behind writes nothing, and a modified press (new tab) stays a plain link.
  const onStepPress = (e, target) => {
    const plain = e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey
    if (showChooser) settleChooser()
    if (plain && current && target.index > current.index) commitStep()
  }

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
      markSession(SESSION_DONE)
      setActive(false)
      navigate(`/projects/${id}/export`)
    } catch (err) {
      // The free-plan cap. The design, the name and the flow all stay put.
      setRefusal(err?.message || 'That project could not be saved.')
      setBusy(false)
    }
  }, [design, navigate, saveProject, setBusy])

  // A walkthrough that began on a saved project finishes by saving over it: no
  // new project, no slot, no cap. Saving as a new project stays one press away.
  const sourceProject = canSaveProjects && design?.source?.projectId
    ? projects.find((p) => p.id === design.source.projectId) || null
    : null
  const saveOver = useCallback((name) => {
    try {
      overwriteProject(sourceProject.id, { identityName: name, patch: savePatch(design) })
      endGuide()
      markSession(SESSION_DONE)
      setActive(false)
      navigate(`/projects/${sourceProject.id}/export`)
    } catch (err) {
      setRefusal(err?.message || 'That project could not be saved.')
      setBusy(false)
    }
  }, [design, navigate, overwriteProject, setBusy, sourceProject])

  const nameInputRef = useRef(null)
  const nameTitleRef = useRef(null)
  // `asNew` is the secondary button: a new project even when this one was opened from a saved project.
  const submitName = useCallback(async (e, asNew = false) => {
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
      if (sourceProject && !asNew) saveOver(name)
      else save(name)
      return
    }
    pendingNameRef.current = name
    const user = await requireLogin('save your project', { free: true, signup: true })
    if (!user) {
      pendingNameRef.current = null
      setBusy(false)
    }
  }, [canSaveProjects, draft, requireLogin, save, saveOver, setBusy, sourceProject, updateDesign])

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
    // that scrolls with the page has nothing to stack on. It is looked up again on
    // a change, because it can arrive or leave after the bar mounts (Type scale's
    // dock exists on a phone and in the split) and is pinned or not by width.
    const spot = BOTTOM_TOOLBAR[step]
    const page = spot ? railRef.current?.closest(spot[0]) : null
    const find = () => page?.querySelector(spot[1]) || null
    let toolbar = null
    const resizes = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => measure())
    function measure() {
      const found = find()
      if (found !== toolbar) {
        resizes?.disconnect()
        toolbar = found
        if (toolbar) resizes?.observe(toolbar)
      }
      if (toolbar && getComputedStyle(toolbar).position === 'fixed') root.style.setProperty('--bkit-toolbar-h', `${toolbar.getBoundingClientRect().height}px`)
      else root.style.removeProperty('--bkit-toolbar-h')
    }
    measure()
    const widths = [window.matchMedia('(min-width:768px)'), window.matchMedia('(min-width:1024px)')]
    widths.forEach((mq) => mq.addEventListener('change', measure))
    let frame = 0
    const later = () => { if (!frame) frame = requestAnimationFrame(() => { frame = 0; if (find() !== toolbar) measure() }) }
    const arrivals = page && typeof MutationObserver !== 'undefined' ? new MutationObserver(later) : null
    arrivals?.observe(page, { childList: true, subtree: true })
    return () => {
      cancelAnimationFrame(frame)
      arrivals?.disconnect()
      resizes?.disconnect()
      widths.forEach((mq) => mq.removeEventListener('change', measure))
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

  if (!active || !current) {
    return shield ? <div className="bkit-exit-shield" aria-hidden="true" style={shield} /> : null
  }

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
  const goLabel = `${firstStep ? 'Start with' : 'Back to'} ${current.label.toLowerCase()}`
  const outlineNext = panelOpen && !phone

  // The chooser's rows. The default row (Continue, or Start new after a saved
  // kit) comes first and takes focus; Open another project follows Continue.
  let chooser = null
  if (showChooser) {
    const home = findSourceProject(design, projects)
    const when = whenText(chooserEditedAt)
    const swatches = stepArtefacts(design).color.colors
    const cont = continueCopy({ status, name: home?.name || '', done: built, when, signedIn: canSaveProjects })
    const risky = atRisk(status)
    // A different unsaved kit already waiting in Your workspace would be replaced.
    const slotWhen = risky && parked && !designsMatch(parked.design, design) ? whenText(parked.parkedAt) : null
    const fresh = startNewMeta({ status, name: home?.name || '', slotWhen })
    const others = canSaveProjects ? otherProjects(projects, home?.id ?? design?.source?.projectId ?? null) : []
    const startFirst = status === 'saved'
    const rowRef = (which) => ((which === 'new') === startFirst ? defaultRowRef : null)
    const continueItem = (
      <li key="continue" className="bkit-choose-item">
        <button type="button" className="bkit-choose-row" data-choose-row="continue" ref={rowRef('continue')} onClick={continueKit}>
          <span className="bkit-choose-text">
            <span className="bkit-choose-label">{cont.label}</span>
            <span className="bkit-choose-meta">{cont.meta}</span>
          </span>
          {swatches.length > 0 && (
            <span className="bkit-choose-swatches" aria-hidden="true">
              {swatches.map((c, i) => <span className="bkit-choose-swatch" key={`${c}-${i}`} style={{ background: c }} />)}
            </span>
          )}
        </button>
      </li>
    )
    const newItem = (
      <li key="new" className="bkit-choose-item">
        <button type="button" className="bkit-choose-row" data-choose-row="new" ref={rowRef('new')} onClick={startNewKit}>
          <span className="bkit-choose-text">
            <span className="bkit-choose-label">Start a new brand kit</span>
            {fresh && <span className="bkit-choose-meta">{fresh}</span>}
          </span>
        </button>
        {canSaveProjects && atProjectLimit && (
          <p className="bkit-choose-cap">
            {capLine(projectLimit)}{' '}
            <Link to="/plans" className="bkit-choose-link">See Pro</Link>
          </p>
        )}
      </li>
    )
    const otherItem = others.length > 0 ? (
      <li key="other" className="bkit-choose-item">
        <button
          type="button"
          className="bkit-choose-row"
          data-choose-row="other"
          aria-expanded={chooserOpenOther}
          aria-controls={`${chooserId}-other`}
          onClick={() => setChooserOpenOther((v) => !v)}
        >
          <span className="bkit-choose-text">
            <span className="bkit-choose-label">Open another project</span>
            <span className="bkit-choose-meta">{risky ? startNewMeta({ status, slotWhen }) : 'Carry on with one of your saved projects.'}</span>
          </span>
          <svg className="bkit-choose-chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9" /></svg>
        </button>
        {chooserOpenOther && (
          <ul className="bkit-choose-sub" id={`${chooserId}-other`}>
            {others.map((p) => {
              const parts = Object.values(partsPresent(withDefaults(p.design))).filter(Boolean).length
              return (
                <li key={p.id}>
                  <button type="button" className="bkit-choose-row bkit-choose-row--project" data-choose-row="project" onClick={() => openKit(p)}>
                    <span className="bkit-choose-text">
                      <span className="bkit-choose-label">{p.name}</span>
                      <span className="bkit-choose-meta">{parts} of 4 parts · edited {whenText(Date.parse(p.updatedAt || p.createdAt || ''))}</span>
                    </span>
                  </button>
                </li>
              )
            })}
            <li><Link to="/projects" className="bkit-choose-all">See all projects</Link></li>
          </ul>
        )}
      </li>
    ) : null
    chooser = (
      <BkitPanel
        key="choose"
        id={chooserId}
        panelRef={cardRef}
        style={dockStyle}
        titleId={`${chooserId}-title`}
        title={`Your brand kit from ${when}`}
        modifier="bkit-card--choose"
        onClose={dismissChooser}
        onEscape={dismissChooser}
      >
        <ul className="bkit-choose" onKeyDown={onChooserKeys}>
          {startFirst ? [newItem, continueItem, otherItem] : [continueItem, otherItem, newItem]}
        </ul>
      </BkitPanel>
    )
  }

  return (
    <>
      {chooser}
      {showIntro && !showChooser && !phone && (
        // No overlay element at all: the panel is docked directly, so there is
        // nothing between the visitor and the tool. (On a phone the steps panel
        // inside the bar stands in for it.)
        <BkitPanel
          key="intro"
          id={cardId}
          panelRef={cardRef}
          style={dockStyle}
          titleId={titleId}
          title={`${count}: ${current.label}`}
          tabIndex={-1}
          onClose={closeIntro}
          onEscape={closeIntro}
        >
          <p className="bkit-card-body">
            {firstStep
              ? 'Pick your brand colour. Fonts, type scale and icons come next, and each one uses what you chose here.'
              : 'This step uses what you chose in the steps before it.'}
          </p>
          {introFull && (
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
          )}
          <button type="button" className="btn btn-accent bkit-card-go" onClick={closeIntro} ref={goRef}>
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
              <button
                type="submit"
                className="btn btn-accent bkit-name-save"
                disabled={saving}
                aria-label={sourceProject && !saving ? `Save to ${sourceProject.name}` : undefined}
              >
                {saving
                  ? 'Saving…'
                  : sourceProject
                    ? <>Save to <span className="bkit-name-save-to">{sourceProject.name}</span></>
                    : 'Save project'}
              </button>
            </div>
            {sourceProject && (
              <button type="button" className="btn bkit-name-alt" disabled={saving} onClick={(e) => submitName(e, true)}>
                Save as a new project
              </button>
            )}
            <div className="bkit-name-msg">{nameMessage}</div>
          </form>
        </BkitPanel>
      )}

      <div className={`bkit-rail${lifted ? ' bkit-rail--kbd' : ''}${showName ? ' bkit-rail--name' : ''}`} ref={railRef} role="region" aria-label="Brand kit walkthrough">
        {phone && (
          <>
            {/* Under 768px: the steps panel opens upward from the bar, in the
                bar's own region. Same non-modal contract as the popover: no
                scrim, no focus trap, no aria-modal. It stays a .bkit-card so
                utils/openOverlays.js treats it as the guide's own. */}
            {showIntro && !showChooser && (
              <div
                id={cardId}
                className="bkit-card bkit-card--steps"
                role="dialog"
                aria-labelledby={titleId}
                tabIndex={-1}
                ref={cardRef}
                onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); closeIntro() } }}
              >
                <div className="bkit-sheet-head">
                  <h2 id={titleId} className="bkit-sheet-title" tabIndex={-1} ref={panelHeadRef}>Brand kit</h2>
                  <span className="bkit-sheet-count">{built} of {total} parts</span>
                </div>
                <p className="bkit-sheet-help">
                  {firstStep
                    ? 'Pick your brand colour. Fonts, type scale and icons come next, and each one uses what you chose here.'
                    : 'This step uses what you chose in the steps before it.'}
                </p>
                <ol className="bkit-card-steps">
                  {steps.map((s) => (
                    <li key={s.id} className={`${s.id === step ? 'is-current' : ''}${s.done ? ' is-done' : ''}`}>
                      <Link
                        to={s.path}
                        aria-current={s.id === step ? 'step' : undefined}
                        onClick={(e) => { onStepPress(e, s); if (s.id === step) closeIntro() }}
                      >
                        <span className="bkit-card-num" aria-hidden="true">
                          <span className="bkit-step-num">{s.number}</span>
                          {TICK_ICON}
                        </span>
                        <span className="bkit-card-text">
                          <strong>{s.label}</strong>
                          {hasArtefact(s)
                            ? <span className="bkit-card-artefact"><StepArtefact step={s} /></span>
                            : <span className="bkit-card-blurb">{s.blurb}</span>}
                        </span>
                        <span className="sr-only">{s.done ? ', done' : ', not started'}</span>
                      </Link>
                    </li>
                  ))}
                </ol>
                <button type="button" className="bkit-sheet-close" onClick={exit}>
                  <span className="bkit-sheet-close-label">Close the walkthrough</span>
                  <span className="bkit-sheet-close-note">Not saved as a project until you name it.</span>
                </button>
              </div>
            )}
            {/* Decoration: the facts are in the trigger's name and the panel's list. */}
            <div className="bkit-progress" aria-hidden="true">
              {steps.map((s) => (
                <span key={s.id} className={`bkit-progress-seg${s.id === step ? ' is-current' : ''}${s.done ? ' is-done' : ''}`} />
              ))}
            </div>
            <button
              type="button"
              className="bkit-rail-steps"
              onClick={(e) => {
                setShowName(false)
                introOpenerRef.current = e.currentTarget
                setIntroFull(true)
                setShowIntro((v) => !v)
              }}
              aria-label={`${current.label}, step ${position} of ${total}, ${built} built. Steps and help.`}
              aria-expanded={showIntro}
              aria-controls={showIntro ? cardId : undefined}
              ref={introTriggerRef}
            >
              <span className="bkit-rail-steps-name">{current.label}</span>
              <span className="bkit-rail-steps-count">{count}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="6 15 12 9 18 15" /></svg>
            </button>
          </>
        )}

        {!phone && (
          <div className="bkit-rail-head">
            <span className="bkit-rail-eyebrow">Brand kit</span>
            {/* Drawn from 1024px up, where the title shows too; read out on a tablet. */}
            <span className="bkit-rail-count" aria-live="polite">{count}</span>
          </div>
        )}

        {/* Real links, not buttons: the bar is a map of the flow, so
            middle-click and open-in-new-tab should work on it. Nothing is
            STAGED by these clicks (the state that carries between steps is the
            saved design both ends already read), so there is no draft that a
            modified click could strand in a tab that never navigates. See
            utils/brandKitGuide.js. */}
        {!phone && (
          <ol className="bkit-steps" ref={stepsRef}>
            {steps.map((s) => (
              <li key={s.id}>
                <Link
                  to={s.path}
                  className={`bkit-step${s.id === step ? ' is-current' : ''}${s.done ? ' is-done' : ''}`}
                  aria-current={s.id === step ? 'step' : undefined}
                  onClick={(e) => onStepPress(e, s)}
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
        )}

        {/* Close first, so the walkthrough's exit sits away from its primary
            action; Next is last, at the trailing end. On a phone Close and the
            help live in the steps panel, so Next is all that is left. */}
        <div className="bkit-rail-actions">
          {!phone && (
            <button type="button" className="bkit-rail-close" onClick={exit} aria-label="Leave the walkthrough" title="Leave the walkthrough. It is not saved as a project until you name it.">
              {CLOSE_ICON(14, 2.4)}
            </button>
          )}
          {/* Icon and the word "Help" from 768 to 1023px; icon only from 1024px,
              where the text is visually hidden and the control keeps its name. The
              title repeats it for a pointer. */}
          {!phone && (
            <button
              type="button"
              className="bkit-rail-help"
              title="What&rsquo;s this?"
              onClick={(e) => {
                setShowName(false)
                // Open on arrival, it grows to the full list; open with the list, it closes.
                if (showIntro && !introFull) { setIntroFull(true); return }
                introOpenerRef.current = e.currentTarget
                setIntroFull(true)
                setShowIntro((v) => !v)
              }}
              aria-expanded={showIntro}
              aria-controls={showIntro ? cardId : undefined}
              ref={introTriggerRef}
            >
              <svg className="bkit-rail-help-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="9.5" /><path d="M9.6 9.3a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.2-2.4 3.8" /><line x1="12" y1="17.2" x2="12" y2="17.3" />
              </svg>
              {/* Name: "Help: What's this?". The label that shows from 768 to 1023px
                  is its first word, so what is drawn is contained in the name. */}
              <span className="bkit-rail-help-text">
                <span className="bkit-rail-help-label">Help</span>
                <span className="bkit-rail-help-rest">: What&rsquo;s this?</span>
              </span>
            </button>
          )}
          {/* One filled button per view: while the panel is open its own button
              takes the fill and this one draws as an outline. The phone's steps
              panel has no filled button of its own, so Next keeps the fill. */}
          {next ? (
            <button type="button" className={`btn bkit-rail-next${outlineNext ? ' is-outline' : ' btn-accent'}`} onClick={goNext}>
              <span className="bkit-rail-next-text">Next: {next.label}</span>
              {ARROW_ICON}
            </button>
          ) : (
            <button
              type="button"
              className={`btn bkit-rail-next${outlineNext ? ' is-outline' : ' btn-accent'}`}
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
      {/* The bar is fixed over the foot of the viewport; this keeps its height,
          plus the gap around the pill from 1024px, in the page so the end of the
          tool scrolls clear of it. */}
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

// Whether StepArtefact has anything to draw, so the phone's list can fall back
// to the step's blurb on the second line instead of leaving it empty.
function hasArtefact(step) {
  if (!step.done) return false
  if (step.id === 'color') return (step.artefact.colors || []).length > 0
  return !!step.artefact.text
}
