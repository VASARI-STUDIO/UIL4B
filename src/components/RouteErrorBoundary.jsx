import { Component } from 'react'
import { openProblemReport, reportError } from '../utils/errorReport'

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
