import { useEffect, useState } from 'react'

// The Suspense fallback for every lazy page: a spinner, and nothing else for
// the first few seconds.
//
// A chunk that never arrives (a stalled connection, a request that hangs
// without failing) would otherwise leave the spinner up forever, with no
// failure for the error boundary to catch. After SLOW_MS it says so, and
// offers a reload. The line is a status, so it is announced without moving
// focus. Under reduced motion the spinner is already static, so the line is
// the cue that the page is still working.
//
// `.page-loading` and `.fg-loader` stay: tests/user-sim/helpers.js waits for
// `.page-loading` to leave the document before it reads a page.
export const SLOW_LOAD_MS = 8000

export default function RouteLoading() {
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    const id = setTimeout(() => setSlow(true), SLOW_LOAD_MS)
    return () => clearTimeout(id)
  }, [])

  return (
    <div className="page-loading">
      <div className="fg-loader" />
      {/* Always in the document, so a screen reader is already listening when
          the text arrives. */}
      <div className="page-loading-slow" role="status">
        {slow && (
          <>
            <p>Still loading. Your connection may be slow.</p>
            <button type="button" className="btn" onClick={() => window.location.reload()}>Try again</button>
          </>
        )}
      </div>
    </div>
  )
}
