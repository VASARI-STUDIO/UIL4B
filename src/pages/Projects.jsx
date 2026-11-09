import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useProject } from '../contexts/ProjectContext'
import { useAuth } from '../contexts/AuthContext'
import { useSubscription } from '../contexts/SubscriptionContext'
import { readSessionHint } from '../utils/sessionHint'
import { NEW_PROJECT_STATE, guideEntry, startGuide } from '../utils/brandKitGuide'
import { getUsageCount } from '../utils/usageTracker'
import { getSyncState, subscribeSync } from '../utils/syncStatus'
import { mostRecentProject } from '../utils/userHome'
import { useServerAiUsage } from '../hooks/useServerAiUsage'
import useProjectIcons from '../hooks/useProjectIcons'
import { prefersReducedMotion } from '../components/spectrum/reducedMotion'
import { aiUsageToday, byRecent, projectSlots } from '../components/userhome/workspace'
import KitSheet, { FailedSheet, GoArrow, LoadingSheet } from '../components/dashboard/KitSheet'
import { StatusRow, TodayLine } from '../components/dashboard/StatusRow'
import { OtherProjects, OtherProjectsSkeleton } from '../components/dashboard/OtherProjects'
import Shelf from '../components/dashboard/Shelf'
import PlanLine from '../components/dashboard/PlanLine'
import { exampleKit, kitFromProject } from '../components/dashboard/kit'
import '../styles/pages/dashboard.css'

// ── YOUR WORKSPACE ──────────────────────────────────────────────────────────
//
// /projects: a status line (greeting or the offline note), the title with New project, one line for today
// (date, allowances), then the kit sheet. The sheet draws the newest project's four parts, each linking to
// the tool that made it, with the next step in the sheet's head. Components are in components/dashboard/.
//
// The sheet has one home for each state:
//   lead         the newest project that is not archived
//   example      Kerbside, a sample brand, for a visitor who is signed out and for an account with no project
//   loading      the account's list has not answered yet (the session hint says there is an account)
//   failed       the list did not load; the offline note shows in the status line as well
//
// Managing one project (rename, duplicate, archive, delete, overwrite, its icon) lives on that project's
// own page, /projects/:id (ProjectDetail.jsx).

// A project's icon lives ON the project (`project.icon`). useProjectIcons is still called here, for its
// migration alone: it moves an icon an older version kept in this browser onto its project.

const subscribeOnline = (fn) => {
  window.addEventListener('online', fn)
  window.addEventListener('offline', fn)
  return () => { window.removeEventListener('online', fn); window.removeEventListener('offline', fn) }
}
const readOnline = () => (typeof navigator === 'undefined' ? true : navigator.onLine !== false)

export default function Projects() {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const { plan, isPro, loading: planLoading } = useSubscription()
  const { projects, projectsLoading, canSaveProjects, projectLimit, atProjectLimit, resetDesign } = useProject()
  useProjectIcons()
  const online = useSyncExternalStore(subscribeOnline, readOnline, () => true)
  const sync = useSyncExternalStore(subscribeSync, getSyncState, getSyncState)

  // Three states, not two: "we do not know yet" is its own. Treating it as signed out (which is what
  // `canSaveProjects` alone says while Firebase resolves) would show a returning user the example kit for the
  // second the auth round trip takes. `resolving` reads the same synchronous hint the router used.
  const [hintedSession] = useState(readSessionHint)
  const resolving = authLoading && hintedSession
  const signedOut = !canSaveProjects && !resolving

  const [capRefusal, setCapRefusal] = useState('')
  const capBtnRef = useRef(null)
  const capLinkRef = useRef(null)

  // The cap refusal is a popover by New project: it closes on Escape and on a press elsewhere.
  useEffect(() => {
    if (!capRefusal) return undefined
    capLinkRef.current?.focus({ preventScroll: true })
    const onKey = (e) => { if (e.key === 'Escape') { setCapRefusal(''); capBtnRef.current?.focus() } }
    const onDown = (e) => { if (!e.target.closest?.('.db-newwrap')) setCapRefusal('') }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onDown) }
  }, [capRefusal])

  // The refusal can open below the fold on a short window; `nearest` moves the page only as far as it takes.
  const showCap = useCallback((el) => {
    el?.scrollIntoView?.({ block: 'nearest', inline: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
  }, [])

  // A new blank project: the cap refusal first, then the default design and the walkthrough's first step,
  // with its orientation card open.
  const startNew = () => {
    if (canSaveProjects && atProjectLimit) {
      setCapRefusal(`The Free plan saves up to ${projectLimit} projects. Pro saves as many as you like.`)
      return
    }
    setCapRefusal('')
    resetDesign()
    startGuide()
    navigate(guideEntry(null).path, { state: NEW_PROJECT_STATE })
  }

  const sorted = [...projects].sort(byRecent)
  const lead = mostRecentProject(sorted)
  // The rest, newest first, with archived ones last.
  const rest = sorted.filter((p) => p !== lead)
  const others = [...rest.filter((p) => !p.archived), ...rest.filter((p) => p.archived)]
  // The account's own count from the server, once it answers; until then this browser's count.
  const serverAi = useServerAiUsage(canSaveProjects ? user?.uid : null, plan?.id)
  const ai = aiUsageToday(getUsageCount, plan, serverAi)
  const slots = projectSlots(projects.length, projectLimit)

  const hasProjects = projects.length > 0
  const loadingList = !signedOut && !resolving && projectsLoading && !hasProjects
  const syncError = sync.errors.find((e) => e.channel === 'projects')
  const loadFailed = !signedOut && !resolving && !hasProjects && !projectsLoading && (!online || !!syncError)
  const offline = !online && !signedOut
  const atCap = !!slots && !isPro && slots.used >= slots.limit

  const meters = !signedOut && !resolving && !planLoading && !loadFailed && !loadingList
    ? { isPro, ai, slots }
    : null

  let sheet
  if (resolving || loadingList) sheet = <LoadingSheet />
  else if (loadFailed) sheet = <FailedSheet onRetry={() => (syncError?.retry ? syncError.retry() : window.location.reload())} />
  else if (signedOut) sheet = <KitSheet kit={exampleKit('out')} />
  else if (!lead) {
    // No project yet (or every project is archived): the example, with New project as its one next step.
    const kit = exampleKit('empty')
    sheet = <KitSheet kit={{ ...kit, pill: { text: 'New project' } }} onPill={startNew} />
  } else sheet = <KitSheet kit={kitFromProject(lead)} openHref={`/projects/${encodeURIComponent(lead.id)}`} />

  // New project: top right of the title row. Ink when signed out, outlined once there is work, and absent
  // when the sheet's own pill is the same action (no project yet).
  const showNew = !resolving && !loadingList && !loadFailed && (signedOut || lead)
  const newProject = showNew && (
    <div className="db-newwrap">
      {signedOut ? (
        <button type="button" className="db-go" onClick={startNew}>New project<GoArrow /></button>
      ) : (
        <button
          type="button"
          className="db-ghost db-ring"
          ref={capBtnRef}
          onClick={() => (capRefusal ? setCapRefusal('') : startNew())}
          aria-haspopup={atCap ? 'dialog' : undefined}
          aria-expanded={atCap ? !!capRefusal : undefined}
        >
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          New project
        </button>
      )}
      {capRefusal && (
        <div className="db-pop cap" ref={showCap} role="dialog" aria-labelledby="db-cap-t" data-testid="project-create-refusal">
          <p id="db-cap-t">{capRefusal}</p>
          <Link to="/plans" className="db-tl" ref={capLinkRef}>See plans</Link>
        </div>
      )}
    </div>
  )

  return (
    <div className="db">
      <div className="db-wrap">
        <div className="db-in">
          <div className="db-main">
            <StatusRow resolving={resolving} signedOut={signedOut} offline={offline} />
            <div className="db-title">
              <h1>Your workspace</h1>
              {newProject}
            </div>
            <TodayLine meters={meters} offline={offline} atCap={atCap} />
            {sheet}
            {loadingList && <OtherProjectsSkeleton />}
            {!signedOut && !resolving && !loadFailed && !loadingList && (
              <OtherProjects others={others} room={!isPro && slots ? Math.max(0, slots.limit - slots.used) : 0} onNew={startNew} />
            )}
            <Shelf projects={projects} signedOut={signedOut} loading={resolving || loadingList} />
            <PlanLine loading={resolving || loadingList || planLoading} signedOut={signedOut} isPro={isPro} />
            <div className="db-end" />
          </div>
        </div>
      </div>
    </div>
  )
}
