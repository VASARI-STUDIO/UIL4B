import { Component, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { reportError } from '../utils/errorReport'
import { isChunkLoadError } from '../utils/lazyRoute'
import useOnline from '../hooks/useOnline'
import EdgeScreen, { EdgeOutline, EdgePill } from './edge/EdgeScreen'

// What a person sees when a page crashes, instead of a blank screen.
//
// App.jsx's app shell has its own boundary, but every Create tool, `/`,
// `/home`, `/onboarding`, `/discover` and `/learn` return before that shell,
// so they need this one to avoid a blank page with no way out.
//
// The card says what failed, that saved projects are fine, and offers a reload,
// a way to report it, and two quiet ways back (the homepage, the help centre).
// The crash is ALSO recorded automatically (utils/errorReport.js), because most
// people who hit one will reload and leave rather than write anything.
//
// The card's heading is an h1 and takes focus when the card mounts: the control
// the person last used is gone, so without this a keyboard or screen reader user
// is left on `body` with no sign anything changed. `outer` is set by the
// boundary that wraps the whole app: routes that return before the shell have no
// <main>, so the card brings its own, which is also where the skip link lands.
//
// `resetKey` is the pathname: navigating away clears the error without
// remounting the children, so a crash on one tool does not follow the person to
// the next page.
//
// The `.error-boundary` / `.error-boundary-card` class names are unchanged from
// the boundary this replaces: tests/user-sim/helpers.js tells a crashed route
// from a rendered one by `.error-boundary`.
//
// A PAGE WHOSE CODE NEVER ARRIVED gets its own copy (`load`). Its file failed to
// download and the one automatic reload (utils/lazyRoute.js) did not fix it, so
// "this page stopped working" would be untrue.
//
// OFFLINE (either kind) the card holds back everything that needs a connection:
// the buttons and links go, the horizon turns grey and the status says it is
// waiting. A reload with no connection replaces the page with the browser's own
// error page. When the connection returns the status says so for a few seconds
// and the pills come back. It never reloads by itself: the person may be reading.
const BACK_ONLINE_MS = 4000

const COPY = {
  crash: {
    title: 'This page stopped working',
    body: 'Reloading usually fixes it.',
    offline: 'You’re offline. Reconnect and you can reload.',
  },
  load: {
    title: 'This page didn’t load',
    body: 'Part of this page couldn’t be downloaded. Trying again usually fixes it.',
    offline: 'You’re offline. Reconnect and you can try again.',
  },
}

function ErrorCard({ outer, load }) {
  const online = useOnline()
  const { pathname } = useLocation()
  // Remember that the connection dropped, so that when it returns the card can
  // say so for a moment.
  const [wasOffline, setWasOffline] = useState(false)
  const [backExpired, setBackExpired] = useState(false)
  if (!online && !wasOffline) setWasOffline(true)
  if (!online && backExpired) setBackExpired(false)

  const offline = !online
  const backOnline = online && wasOffline

  useEffect(() => {
    if (!backOnline) return undefined
    const t = setTimeout(() => setBackExpired(true), BACK_ONLINE_MS)
    return () => clearTimeout(t)
  }, [backOnline])

  const copy = load ? COPY.load : COPY.crash
  const status = offline ? 'Waiting for a connection' : backOnline && !backExpired ?'Back online' : ''

  const card = (
    <div className={`error-boundary${load ? ' error-boundary--load' : ''}${outer ? ' error-boundary--outer' : ''}`}>
      <div className="error-boundary-card">
        <EdgeScreen
          art={offline ? 'drain' : 'calm'}
          title={copy.title}
          body={offline ? copy.offline : copy.body}
          safe="Saved projects are fine. Changes you hadn’t saved may be lost."
          status={status}
          waiting={offline}
          actions={offline ? null : (
            <>
              <EdgePill onClick={() => window.location.reload()}>Reload the page</EdgePill>
              <EdgeOutline to={`/feedback?type=bug&page=${encodeURIComponent(pathname)}`}>Report this</EdgeOutline>
            </>
          )}
          trail={[
            // On the home page itself a client-side link would change nothing and
            // the crash would stay, so there it loads the document afresh.
            // Offline the homepage stays: it is in the entry bundle, so the
            // client-side link needs no download. The reload and the help
            // centre need a connection.
            { to: '/', label: 'Back to the homepage', reload: !offline && pathname === '/' },
            ...(offline ? [] : [{ to: '/learn/help', label: 'Help centre' }]),
          ]}
        />
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
    return <ErrorCard outer={this.props.outer} load={isChunkLoadError(error)} />
  }
}
