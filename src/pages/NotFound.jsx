import { useEffect, useMemo, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import EdgeScreen, { EdgeBlock, EdgeOutline, EdgePath, EdgePill } from '../components/edge/EdgeScreen'
import { projectRows, sectionSuggestions } from '../components/edge/edgeData'
import { useAuth } from '../contexts/AuthContext'
import { useProject } from '../contexts/ProjectContext'
import { ENTRY_PATH } from '../utils/entryPath'

// A real 404, replacing `<Route path="*" element={<Navigate to="/" replace />} />`.
//
// The redirect was a soft 404: every typo and dead backlink returned a 200 with
// the homepage on it, indexable, and the visitor was moved to `/` as if the link
// had worked. A static SPA cannot send a 404 status, so this does the two things
// it can: the served shell carries noindex (see scripts/prerender.mjs), and the
// person is told what happened and where to go instead.
//
// Where to go is read from the tool tree, the Learn index and the account's own
// projects (components/edge/edgeData.js), so it cannot name a page that does not
// exist.

// Whether the person got here by moving around the app rather than by loading
// this address. A fresh load renders the path the tab first loaded;
// useNavigationType() cannot say this, because the routes below App.jsx's
// <Routes location> always report POP.
function arrivedInApp(pathname) {
  return typeof window !== 'undefined' && pathname !== ENTRY_PATH
}

// The page that linked here, when the browser can say so: a same-site path only
// (never a query string, and never another site), and only on a fresh load.
// After in-app navigation document.referrer still names the page the visit
// started from, which would blame the wrong link.
function linkingPath(pathname) {
  if (typeof document === 'undefined' || !document.referrer || arrivedInApp(pathname)) return ''
  try {
    const from = new URL(document.referrer)
    return from.origin === window.location.origin && from.pathname !== pathname ? from.pathname : ''
  } catch {
    return ''
  }
}

export default function NotFound() {
  const { pathname } = useLocation()
  const headingRef = useRef(null)
  const { user, loading: authLoading } = useAuth()
  const { projects, canSaveProjects, projectsLoading } = useProject()
  const signedIn = !!user

  // A known route can render this page too (an admin-only route seen by
  // everyone else), and the app's route title would then name that route. The
  // tab says what the visitor is looking at; the string matches App.jsx.
  useEffect(() => {
    document.title = 'UI L4B | Page not found'
  }, [pathname])

  // The pills and the list depend on who is looking. Until that is known the
  // page shows the words only, so nothing swaps under the pointer.
  const ready = !authLoading && !(canSaveProjects && projectsLoading)

  const mine = useMemo(() => (signedIn && canSaveProjects ? projectRows(projects) : []), [signedIn, canSaveProjects, projects])
  const section = useMemo(() => sectionSuggestions(pathname), [pathname])

  // The report form opens as a bug report with the broken path filled in.
  const report = new URLSearchParams({ type: 'bug', page: pathname })
  const from = linkingPath(pathname)
  if (from) report.set('referrer', from)
  const reportLink = { to: `/feedback?${report}`, label: 'Report a broken link' }
  const helpLink = { to: '/learn/help', label: 'Help centre' }

  const showProjects = signedIn && mine.length > 0 && !section.section
  const trail = !ready ? [] : signedIn ? [{ to: '/', label: 'Back to the homepage' }, reportLink, helpLink] : [reportLink, helpLink]

  const actions = !ready ? null : signedIn ? (
    <>
      <EdgePill to="/projects" go>Open your workspace</EdgePill>
      <EdgeOutline to="/sitemap">See every page</EdgeOutline>
    </>
  ) : (
    <>
      <EdgePill to="/" go>Back to the homepage</EdgePill>
      <EdgeOutline to="/sitemap">See every page</EdgeOutline>
    </>
  )

  let below = null
  if (ready) {
    below = showProjects ? (
      <EdgeBlock heading="Your recent projects" rows={mine} label="Your recent projects" />
    ) : (
      <EdgeBlock
        heading={section.heading}
        line={section.line || (signedIn ? 'Projects you save from a tool appear in your workspace.' : '')}
        rows={section.rows}
        label="Suggested pages"
      />
    )
  }

  return (
    <EdgeScreen
      art="play"
      lead="That page"
      title="doesn’t exist"
      headingRef={headingRef}
      // A fresh load keeps the browser's own focus handling; arriving by a link
      // or a redirect leaves focus on a control that is no longer on screen.
      focusHeading={arrivedInApp(pathname)}
      body={<>Nothing lives at <EdgePath path={pathname}>.</EdgePath> It may have moved, or the link may have been mistyped.</>}
      actions={actions}
      trail={trail}
      below={below}
    />
  )
}
