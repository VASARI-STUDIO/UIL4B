import { Component, useEffect, useId, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { openProblemReport, reportError } from '../utils/errorReport'
import { isChunkLoadError } from '../utils/lazyRoute'
import useOnline from '../hooks/useOnline'

// What a person sees when a page crashes, instead of a blank screen.
//
// App.jsx's app shell has its own boundary, but every Create tool, `/`,
// `/home`, `/onboarding`, `/discover` and `/learn` return before that shell,
// so they need this one to avoid a blank page with no way out.
//
// Three ways out, on both cards: Try again (a reload), Go to the home page,
// and "Report this problem", which opens the ordinary feedback dialog already
// filled in with the route and the error. The home link is there so a crash
// that happens again after a reload still leads somewhere. The crash is ALSO
// recorded automatically (utils/errorReport.js), because most people who hit
// one will reload and leave rather than write anything.
//
// The card's heading is an h1 and takes focus when the card mounts: the
// control the person last used is gone, so without this a keyboard or screen
// reader user is left on `body` with no sign anything changed. `outer` is set
// by the boundary that wraps the whole app: routes that return before the
// shell have no <main>, so the card brings its own, which is also where the
// skip link lands.
//
// `resetKey` is the pathname: navigating away clears the error without
// remounting the children, so a crash on one tool does not follow the person
// to the next page.
//
// The `.error-boundary` / `.error-boundary-card` class names are unchanged
// from the boundary this replaces: tests/user-sim/helpers.js tells a crashed
// route from a rendered one by `.error-boundary`.
//
// A PAGE WHOSE CODE NEVER ARRIVED gets its own copy (`load`). Its file failed
// to download and the one automatic reload (utils/lazyRoute.js) did not fix
// it, so "this page stopped working" would be untrue: it says the page did
// not load, and offers to try again. Offline it says the connection is the
// problem and holds Try again until the browser is back online, because a
// reload with no connection replaces the page with the browser's own error.
// Go to the home page stays available offline: the home page is in the entry
// bundle, so the client-side link works without a connection.
function ErrorCard({ error, outer, load }) {
  const online = useOnline()
  const { pathname } = useLocation()
  const titleRef = useRef(null)
  const leadId = useId()
  // Remember that the connection dropped, so that when it returns the card can
  // say so. It never reloads by itself: the person may be reading.
  const [wasOffline, setWasOffline] = useState(false)

  useEffect(() => {
    titleRef.current?.focus()
  }, [])
  if (!online && !wasOffline) setWasOffline(true)

  const offline = load && !online
  const backOnline = load && online && wasOffline

  let title = 'This page stopped working'
  let lead = (
    <>
      Part of this page failed while it was running. Trying again usually fixes it.
      If it keeps happening, tell us and we&rsquo;ll look into it.
    </>
  )
  if (load) {
    title = 'This page didn’t load'
    lead = offline
      ? <>You&rsquo;re offline, so this page couldn&rsquo;t be downloaded. You can try again once you reconnect.</>
      : <>Part of this page couldn&rsquo;t be downloaded. Trying again usually fixes it.</>
  }

  const card = (
    <div className={`error-boundary${load ? ' error-boundary--load' : ''}`} role="alert">
      <div className="error-boundary-card">
        <h1 className="error-boundary-title" tabIndex={-1} ref={titleRef}>{title}</h1>
        <p id={leadId} className="error-boundary-lead">{lead}</p>
        {/* Always in the document, so a screen reader is already listening
            when the text arrives. */}
        <p className="error-boundary-status" role="status">
          {backOnline ? 'You’re back online.' : ''}
        </p>
        <div className="error-boundary-actions">
          <button
            type="button"
            className="btn btn-accent"
            disabled={offline}
            aria-describedby={offline ? leadId : undefined}
            onClick={() => window.location.reload()}
          >
            Try again
          </button>
          {/* On the home page itself a client-side link would change nothing
              and the crash would stay, so there it loads the document afresh. */}
          <Link className="btn" to="/" reloadDocument={pathname === '/'}>Go to the home page</Link>
        </div>
        <button
          type="button"
          className="error-boundary-report"
          onClick={() => openProblemReport(error, window.location.pathname)}
        >
          Report this problem
        </button>
      </div>
    </div>
  )
  return outer ? <main id="main" tabIndex={-1}>{card}</main> : card
}

export default class RouteErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info)
    // A download that failed because the browser is offline is not the site's
    // fault, and the report could not be sent anyway.
    if (isChunkLoadError(error) && navigator.onLine === false) return
    reportError(error, 'render')
  }

  componentDidUpdate(prev) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) {
      this.setState({ error: null })
    }
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    return <ErrorCard error={error} outer={this.props.outer} load={isChunkLoadError(error)} />
  }
}
