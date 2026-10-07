import { Component } from 'react'
import { openProblemReport, reportError } from '../utils/errorReport'
import { isChunkLoadError } from '../utils/lazyRoute'
import useOnline from '../hooks/useOnline'

// What a person sees when a page crashes, instead of a blank screen.
//
// App.jsx's app shell has its own boundary, but every Create tool, `/`,
// `/home`, `/onboarding`, `/discover` and `/learn` return before that shell,
// so they need this one to avoid a blank page with no way out.
//
// Two ways out: Reload, and "Report this", which opens the ordinary feedback
// dialog already filled in with the route and the error. The crash is ALSO
// recorded automatically (utils/errorReport.js), because most people who hit
// one will reload and leave rather than write anything.
//
// `resetKey` is the pathname: navigating away clears the error without
// remounting the children, so a crash on one tool does not follow the person
// to the next page.
//
// The class names and the "Something went wrong" sentence are unchanged from
// the boundary this replaces: tests/user-sim/helpers.js tells a crashed route
// from a rendered one by `.error-boundary`.
//
// A PAGE WHOSE CODE NEVER ARRIVED gets its own card. Its file failed to
// download and the one automatic reload (utils/lazyRoute.js) did not fix it,
// so "this page ran into an error" would be untrue: it says the page did not
// load, and offers to try again. Offline it says the connection is the
// problem and holds the retry until the browser is back online, because a
// reload with no connection replaces the page with the browser's own error.
function LoadFailed({ error }) {
  const online = useOnline()
  return (
    <div className="error-boundary error-boundary--load" role="alert">
      <div className="error-boundary-card">
        <h2>This page didn&apos;t load</h2>
        {online ? (
          <>
            <p>Part of this page couldn&apos;t be downloaded. Trying again usually fixes it.</p>
            <button type="button" onClick={() => window.location.reload()}>Try again</button>
            {' '}
            <button
              type="button"
              onClick={() => openProblemReport(error, window.location.pathname)}
            >
              Report this
            </button>
          </>
        ) : (
          <p>You&apos;re offline. Reconnect and you can try again.</p>
        )}
      </div>
    </div>
  )
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
    if (isChunkLoadError(error)) return <LoadFailed error={error} />
    return (
      <div className="error-boundary" role="alert">
        <div className="error-boundary-card">
          <h2>Something went wrong</h2>
          <p>This page ran into an unexpected error. Reloading usually fixes it.</p>
          <button type="button" onClick={() => window.location.reload()}>Reload</button>
          {' '}
          <button
            type="button"
            onClick={() => openProblemReport(error, window.location.pathname)}
          >
            Report this
          </button>
        </div>
      </div>
    )
  }
}
