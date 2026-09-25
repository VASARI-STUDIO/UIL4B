import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProject } from '../contexts/ProjectContext'
import { useAuth } from '../contexts/AuthContext'
import { useSubscription } from '../contexts/SubscriptionContext'
import { useLoginPrompt } from '../contexts/LoginPromptContext'
import { readSessionHint } from '../utils/sessionHint'
import { NEW_PROJECT_STATE, guideEntry, startGuide } from '../utils/brandKitGuide'
import { getUsageCount } from '../utils/usageTracker'
import LocalClock from '../components/LocalClock'
import SaveRefusal from '../components/SaveRefusal'
import Glyph from '../components/userhome/Glyph'
import PlanStrip from '../components/userhome/PlanStrip'
import StartSomething from '../components/userhome/StartSomething'
import ProjectTile from '../components/userhome/ProjectTile'
import DiscoverPicks from '../components/userhome/DiscoverPicks'
import ProPanel from '../components/userhome/ProPanel'
import RecentExports from '../components/userhome/RecentExports'
import useProjectIcons from '../hooks/useProjectIcons'
import { aiUsageToday, byRecent, projectSlots } from '../components/userhome/workspace'
// The stylesheet families this surface needs, split out of the one
// render-blocking global sheet (see src/styles/deferred/). They ride this
// route's own lazy chunk, so they arrive with it and never with the homepage.
import '../styles/deferred/account.css'
import '../styles/deferred/tool-shell.css'
import '../styles/pages/projects.css'

// ── YOUR WORKSPACE ──────────────────────────────────────────────────────────
//
// /projects is the "Your workspace" screen (UIL4B App.dc.html, `projects`).
// No masthead, no Save Current / New Project pair, no search-and-sort bar,
// ruled rows, tip band or rotating starters: none of that is on the design's
// screen, so none of it is here.
//
// What is here, in the design's order: the title and ONE accent "New project"; the plan
// strip; "Start something"; "Recent projects"; "New in Discover"; the Pro panel.
// Every value in it is read off the account, the plan config or the libraries
// (see components/userhome/workspace.js for each one and what it replaced).
//
// Managing one project — rename, duplicate, archive, delete, overwrite — moved
// to that project's own page, /projects/:id (ProjectDetail.jsx), which is where
// the design's screen puts a project's controls.

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

// A project's icon lives ON the project (`project.icon`) and syncs with it.
// useProjectIcons moves any icon an older version kept in this browser onto
// its project the first time both are known.

export default function Projects() {
  const navigate = useNavigate()
  const { loading: authLoading } = useAuth()
  const { plan, isPro, loading: planLoading } = useSubscription()
  const { openLogin } = useLoginPrompt()
  const { projects, canSaveProjects, projectLimit, atProjectLimit, resetDesign } = useProject()
  const { pickIcon } = useProjectIcons()

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

  // A new blank project: the cap refusal first, then the default design and the
  // walkthrough's first step, with its orientation card open.
  const startNew = () => {
    if (canSaveProjects && atProjectLimit) {
      setCapRefusal(`Free plan saves up to ${projectLimit} projects — go Pro for unlimited.`)
      return
    }
    setCapRefusal('')
    resetDesign()
    startGuide()
    navigate(guideEntry(null).path, { state: NEW_PROJECT_STATE })
  }

  const recent = [...projects].sort(byRecent)
  const ai = aiUsageToday(getUsageCount, plan)
  const slots = projectSlots(projects.length, projectLimit)

  return (
    <div className="uh">
      <div className="uh-main">
        {/* The viewer's own date and time, from their machine. LocalClock renders nothing until the
            browser has answered, so no prerendered shell carries a date. */}
        <LocalClock className="uh-clock" />
        <div className="uh-title">
          <h1 className="uh-h1">Your workspace</h1>
          <button type="button" className="uh-new" onClick={startNew}>
            <Glyph name="plus" size={14} />
            <span>New project</span>
          </button>
        </div>
        {capRefusal && <SaveRefusal message={capRefusal} testId="project-create-refusal" />}

        {/* The plan strip is for an account. A visitor who has never signed in
            has no plan to be told about (20-billing-banner.spec.js). */}
        {!signedOut && !resolving && !planLoading && (
          <PlanStrip planLabel={plan?.label || 'Free'} ai={ai} slots={slots} />
        )}

        <StartSomething />

        <div className="uh-recent-head">
          <h2 className="uh-sec-h">Recent projects</h2>
        </div>

        {resolving ? (
          /* WE DO NOT KNOW YET. The session hint says there is an account, so
             the list is unknown, not empty — "No projects yet" here would tell a
             returning user their work was gone for the second auth takes. */
          <div className="uh-resolving" role="status">
            <div className="fg-loader" />
            <p>Opening your projects…</p>
          </div>
        ) : signedOut ? (
          /* The design's empty card, carrying the sign-in the page needs. The sentence is
             the one this page has always given a stranger. */
          <div className="uh-empty uh-signin">
            <h3 className="uh-empty-title">Sign in to keep what you build</h3>
            <p className="uh-empty-text">
              Every tool works without an account. Signing in is what makes a palette,
              a pairing and a scale survive the tab — saved together as a project you can
              reopen on any device.
            </p>
            <button type="button" className="uh-empty-cta" onClick={() => openLogin()}>
              <span>Sign in</span>
            </button>
          </div>
        ) : recent.length === 0 ? (
          /* The design's empty state. Its second sentence — "Nothing leaves the browser
             until you export it." — is deleted: a signed-in account's projects
             sync to it (ProjectContext pushes them), so it is not true. */
          <div className="uh-empty">
            <h3 className="uh-empty-title">No projects yet</h3>
            <p className="uh-empty-text">Start with a colour and the rest of the project follows.</p>
            <button type="button" className="uh-empty-cta" onClick={startNew}>
              <Glyph name="plus" size={14} />
              <span>Start a project</span>
            </button>
          </div>
        ) : (
          <div className="uh-grid">
            {recent.map((p) => (
              <ProjectTile key={p.id} project={p} onPickIcon={pickIcon} />
            ))}
          </div>
        )}

        <RecentExports />

        <DiscoverPicks />

        {/* Nothing to sell a Pro account — and nothing drawn until the plan is
            known, so a Pro account never sees it flash in and out. */}
        {!isPro && (signedOut || !planLoading) && <ProPanel />}
      </div>
    </div>
  )
}
