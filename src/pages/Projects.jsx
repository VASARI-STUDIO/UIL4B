import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useProject } from '../contexts/ProjectContext'
import { useAuth } from '../contexts/AuthContext'
import { useSubscription } from '../contexts/SubscriptionContext'
import { useLoginPrompt } from '../contexts/LoginPromptContext'
import { readSessionHint } from '../utils/sessionHint'
import { NEW_PROJECT_STATE, guideEntry, startGuide } from '../utils/brandKitGuide'
import { getUsageCount } from '../utils/usageTracker'
import { getSyncState, subscribeSync } from '../utils/syncStatus'
import { mostRecentProject, partsPresent } from '../utils/userHome'
import LocalClock from '../components/LocalClock'
import Glyph from '../components/userhome/Glyph'
import Greeting from '../components/userhome/Greeting'
import TodayPanel from '../components/userhome/TodayPanel'
import ContinueCard from '../components/userhome/ContinueCard'
import StarterCard from '../components/userhome/StarterCard'
import FirstPaletteCard from '../components/userhome/FirstPaletteCard'
import ProjectRows from '../components/userhome/ProjectRows'
import StartSomething from '../components/userhome/StartSomething'
import DiscoverPicks from '../components/userhome/DiscoverPicks'
import ProPanel from '../components/userhome/ProPanel'
import RecentExports from '../components/userhome/RecentExports'
import { useServerAiUsage } from '../hooks/useServerAiUsage'
import useProjectIcons from '../hooks/useProjectIcons'
import useMediaQuery from '../hooks/useMediaQuery'
import { prefersReducedMotion } from '../components/spectrum/reducedMotion'
import { aiUsageToday, byRecent, projectSlots } from '../components/userhome/workspace'
// The stylesheet families this surface needs, split out of the one
// render-blocking global sheet (see src/styles/deferred/). They ride this
// route's own lazy chunk, so they arrive with it and never with the homepage.
import '../styles/deferred/account.css'
import '../styles/deferred/tool-shell.css'
import '../styles/pages/projects.css'
// The /tools rows and drawn plates this page reuses (.spt-row, .spt-art). The Spectrum tokens and
// the ink pill (.spectrum, .sp-pill) come from spectrum.css, which is already in the entry graph.
import '../styles/pages/spectrum-tools.css'

// ── YOUR WORKSPACE ──────────────────────────────────────────────────────────
//
// /projects is the "Your workspace" screen (UIL4B App.dc.html, `projects`).
// No masthead, no Save Current / New Project pair, no search-and-sort bar,
// ruled rows, tip band or rotating starters: none of that is on the design's
// screen, so none of it is here.
//
// What is here, work first: a greeting and the title with New project; the lead
// (the newest project's card with its next step, then the others as rows); Today
// beside it (the date and time, the plan's allowances, recent exports); "Start
// something"; "New in Discover"; the Pro panel. Every value in it is read off the
// account, the plan config or the libraries (see components/userhome/workspace.js
// for each one and what it replaced).
//
// ONE filled button per state: Continue when there is a project, Make your first
// palette when there is none, New project when signed out. New project is
// outlined whenever something else leads.
//
// Managing one project — rename, duplicate, archive, delete, overwrite, and its
// icon — lives on that project's own page, /projects/:id (ProjectDetail.jsx).

// THE "COMMUNITY" TAB IS GONE, AND IT WAS THE SAME FABRICATION THIS REPOSITORY
// ALREADY DELETED ONCE.
//
// It rendered four hard-coded design systems — "Sunset Brand by Maya R.",
// "Fintech Blue by Devon K.", "Forest Co. by Sam T.", "Mono Minimal by
// Alex P." — under the sentence "Explore design systems shared by the
// community." Not one of those four people exists, not one of those systems was
// shared by anybody, and nothing on the card said so.
//
// "Maya R." is the SAME invented designer the 2026-08-11 site audit deleted from
// the real Community surface. Read the header of src/data/communityDesigns.js:
// twelve invented designs by invented people, "Aurora Analytics by Maya R., 342
// saves", rendered by the same card as real submissions with nothing marking
// them apart. That audit's conclusion — a save count is a claim about what other
// people did, and shipping fabricated ones to real users is not fixable later —
// is held by tests/unit/community-seed.test.js, which asserts no seeded item is
// credited to a person.
//
// That test reads COMMUNITY_DESIGNS. It never read this file, so the same four
// invented designers went on shipping here for another month, on the page where
// a person's OWN work lives, one tab away from it. The guard now covers both
// (see tests/unit/community-seed.test.js, "no surface invents a designer").
//
// Nothing replaces it. /community is a real route with real curated links
// credited to the platform they open; this page is for the projects you made.

// A project's icon lives ON the project (`project.icon`) and syncs with it. The cards read it from
// there and the picker is on the project's page. useProjectIcons is still called here, for its
// migration alone: it moves any icon an older version kept in this browser onto its project the
// first time both are known, so a card's badge is right before that project's page is opened.


// When the connection last dropped, for the "as of 07:41" on the allowances.
let wentOfflineAt = 0
const subscribeOnline = (fn) => {
  const mark = () => { if (!readOnline()) wentOfflineAt = Date.now(); fn() }
  window.addEventListener('online', mark)
  window.addEventListener('offline', mark)
  return () => { window.removeEventListener('online', mark); window.removeEventListener('offline', mark) }
}
const readOnline = () => (typeof navigator === 'undefined' ? true : navigator.onLine !== false)

export default function Projects() {
  const navigate = useNavigate()
  // On a phone (the spec's 390 order) Recent exports follows Discover instead of sitting in the rail
  // under Today. One list, mounted in one place, so Tab and a screen reader meet it where it is drawn.
  const phone = useMediaQuery('(max-width: 640px)')
  const { user, loading: authLoading } = useAuth()
  const { plan, isPro, loading: planLoading } = useSubscription()
  const { openLogin } = useLoginPrompt()
  const { design, projects, projectsLoading, canSaveProjects, projectLimit, atProjectLimit, resetDesign } = useProject()
  useProjectIcons()
  const online = useSyncExternalStore(subscribeOnline, readOnline, () => true)
  const sync = useSyncExternalStore(subscribeSync, getSyncState, getSyncState)

  // ── THREE STATES, NOT TWO ────────────────────────────────────────
  //
  // This page is the front door for signed-in visitors, so "we do not know yet"
  // is its own state. Treating it as signed-out (which is what `canSaveProjects`
  // alone says while Firebase resolves) would show a returning user the sign-in
  // panel for the ~1s the auth round trip takes, and then swap it for their
  // projects. `resolving` reads the same synchronous hint the router used, so
  // the two agree by construction.
  const [hintedSession] = useState(readSessionHint)
  const resolving = authLoading && hintedSession
  const signedOut = !canSaveProjects && !resolving

  const [capRefusal, setCapRefusal] = useState('')
  // New project is in the title row, and on a phone also under the work (see NewProject below).
  // The refusal opens under the one that was pressed, so only that one draws it.
  const [capAt, setCapAt] = useState('head')

  // The cap refusal is a popover under New project: it closes on Escape and on a press elsewhere.
  useEffect(() => {
    if (!capRefusal) return undefined
    const onKey = (e) => { if (e.key === 'Escape') setCapRefusal('') }
    const onDown = (e) => { if (!e.target.closest?.('.uh-new-wrap')) setCapRefusal('') }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onDown) }
  }, [capRefusal])

  // The notice is in the flow on a phone and can open under the fixed tab bar. A ref callback runs once as
  // it mounts (this one is stable, so a re-render never re-scrolls); `nearest` moves the page only as far as
  // it takes, and projects.css gives it a scroll-margin that clears the tab bar. Smooth only when the
  // user's own motion setting, then the OS, allows it.
  const showCap = useCallback((el) => {
    el?.scrollIntoView?.({ block: 'nearest', inline: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
  }, [])

  // A new blank project: the cap refusal first, then the default design and the
  // walkthrough's first step, with its orientation card open.
  const startNew = () => {
    if (canSaveProjects && atProjectLimit) {
      setCapAt([...document.querySelectorAll('.uh-new-wrap')].find((w) => w.offsetParent !== null)?.dataset.where || 'head')
      setCapRefusal(`The Free plan saves up to ${projectLimit} projects. Pro saves as many as you like.`)
      return
    }
    setCapRefusal('')
    resetDesign()
    startGuide()
    navigate(guideEntry(null).path, { state: NEW_PROJECT_STATE })
  }

  const recent = [...projects].sort(byRecent)
  const lead = mostRecentProject(projects)
  // The rest, newest first, with archived ones last.
  const others = recent.filter((p) => p !== lead)
  const rows = [...others.filter((p) => !p.archived), ...others.filter((p) => p.archived)]
  // The account's own count from the server, once it answers; until then (and if
  // it never does) this browser's count, which the strip labels as such.
  const serverAi = useServerAiUsage(canSaveProjects ? user?.uid : null, plan?.id)
  const ai = aiUsageToday(getUsageCount, plan, serverAi)
  const slots = projectSlots(projects.length, projectLimit)

  // When the last answer came from, so the allowances can say "as of 07:41" while offline.
  const asOf = online || !wentOfflineAt ? '' : new Date(wentOfflineAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

  const hasProjects = projects.length > 0
  const loadingList = !signedOut && !resolving && projectsLoading && !hasProjects
  const syncError = sync.errors.find((e) => e.channel === 'projects')
  const loadFailed = !signedOut && !resolving && !hasProjects && !projectsLoading && (!online || !!syncError)
  const workingChanged = Object.values(partsPresent(design)).some(Boolean)

  const todayMeters = !signedOut && !resolving && !planLoading && !loadFailed && !loadingList
    ? { planLabel: plan?.label || 'Free', isPro, ai, slots, asOf }
    : null

  let body
  if (resolving || loadingList) {
    /* WE DO NOT KNOW YET. The session hint says there is an account, so the list is unknown, not empty:
       "No projects yet" here would tell a returning user their work was gone for the second auth takes. */
    body = (
      <div className="uh-continue uh-resolving" role="status">
        <div className="uh-plate-skel" aria-hidden="true" />
        <div className="uh-continue-body">
          <span className="uh-bar" style={{ width: '40%' }} aria-hidden="true" />
          <span className="uh-bar" style={{ width: '60%' }} aria-hidden="true" />
          <p>Opening your projects…</p>
        </div>
      </div>
    )
  } else if (signedOut) {
    body = workingChanged
      ? <ContinueCard design={design} onSignIn={() => openLogin()} />
      : <StartSomething inLead />
  } else if (loadFailed) {
    body = (
      <div className="uh-continue uh-fail" role="alert">
        <div className="uh-continue-body">
          <p className="uh-fail-text">
            {!online ? "You're offline. " : ''}Your projects didn't load. They're saved to your account, so nothing is lost.
          </p>
          <button type="button" className="uh-ghost" onClick={() => (syncError?.retry ? syncError.retry() : window.location.reload())}>Try again</button>
        </div>
      </div>
    )
  } else if (!hasProjects) {
    /* No project yet: one action, straight into the Palette Builder. New project (title row) still
       starts the full walkthrough, so this card is the only filled button on the screen. */
    body = <FirstPaletteCard design={design} />
  } else {
    body = (
      <>
        {!online && <p className="uh-offline-note">You're offline. Showing the copy saved in this browser.</p>}
        {lead
          ? <ContinueCard project={lead} />
          /* Every project is archived, so there is nothing to continue: the starter leads, with its one
             filled button, and the archived projects follow as rows. */
          : <StarterCard design={design} onStart={() => startNew()} archived limit={atProjectLimit ? projectLimit : null} />}
        <ProjectRows projects={lead ? rows : recent} total={projects.length} label={lead ? 'Other projects' : 'Archived projects'} />
      </>
    )
  }

  // New project: top right of the title row. On a phone, with work on the page, it moves under that
  // work, so the first screen holds one filled button (Continue). Both are in the DOM; CSS shows one,
  // and the hidden one is out of the tab order and the accessibility tree.
  const newProject = (where) => (
    <div className={`uh-new-wrap uh-new-wrap--${where}${where === 'head' && !signedOut ? ' is-after-work' : ''}`} data-where={where}>
      <button type="button" className={`uh-new${signedOut ? ' is-filled' : ''}`} onClick={startNew}>
        <Glyph name="plus" size={14} />
        <span>New project</span>
      </button>
      {capRefusal && capAt === where && (
        <div className="uh-cap" ref={showCap} role="alert" data-testid="project-create-refusal">
          <span>{capRefusal}</span>{' '}
          <Link to="/plans" className="uh-quota-link">See plans</Link>
        </div>
      )}
    </div>
  )

  const showExports = !signedOut && !resolving
  const rail = (
    <aside className="uh-rail" aria-label={showExports && !phone ? 'Today and recent exports' : 'Today'}>
      <TodayPanel meters={todayMeters} signedOut={signedOut} onSignIn={() => openLogin()} />
      {showExports && !phone && <RecentExports />}
    </aside>
  )
  const main = (
    <div className="uh-dash-main">
      {body}
      {!signedOut && newProject('foot')}
    </div>
  )

  return (
    <div className="uh spectrum spt uh-spt">
      <div className="uh-main">
        <div className="uh-dash">
          <div className="uh-dash-head">
            <Greeting resolving={resolving} signedOut={signedOut} />
            <div className="uh-title">
              <h1 className="uh-h1">Your workspace</h1>
              {/* The phone's date and time: one line under the title (the big clock is hidden in Today there). */}
              <div className="uh-clock-slot"><LocalClock className="uh-clock-line" inline /></div>
              {newProject('head')}
            </div>
          </div>
          {signedOut ? <>{rail}{main}</> : <>{main}{rail}</>}
        </div>

        {/* Signed out with the default design, Start something is the lead itself. */}
        {!(signedOut && !workingChanged) && <StartSomething />}

        <DiscoverPicks />

        {showExports && phone && <RecentExports />}

        {/* Nothing to sell a Pro account — and nothing drawn until the plan is
            known, so a Pro account never sees it flash in and out. */}
        {!isPro && (signedOut || !planLoading) && online && <ProPanel />}
      </div>
    </div>
  )
}
