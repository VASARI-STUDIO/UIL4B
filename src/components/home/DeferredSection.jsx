import { Suspense, useEffect, useRef, useState } from 'react'

// THE HOMEPAGE'S BELOW-THE-FOLD SECTIONS LOAD AS THEY APPROACH THE VIEWPORT.
//
// Spectrum.jsx loads each of them with lazyRoute, so their code and their
// stylesheets sit in chunks of their own, not in the entry chunk and the
// render-blocking sheet every route pays for (tests/unit/home-asset-budget.test.js
// holds both sizes). A section's chunks start when its stand-in is within
// NEAR_PX of the viewport, or when `ready` says every section should (a link
// into the page, the first scroll or press: see useBelowFoldReady). Until then
// a section is an empty box of about its final height, so the ones already
// mounted do not move when it arrives.

// How far outside the viewport, above and below, a stand-in opens its section.
const NEAR_PX = 600

// The stand-in for a section whose chunk has not arrived. `holdId` is set when
// the section renders its own id (so an in-page link has something to land on
// until it does); the sections the page wraps itself already carry theirs.
// `data-deferred-hold` marks it for usePageAnchors, which waits until none is
// left before it lands an arriving hash.
function Hold({ holdId, minHeight, holdRef }) {
  return <div ref={holdRef} id={holdId} data-deferred-hold="" aria-hidden="true" style={{ minHeight }} />
}

/** `children` is a lazy section. It mounts when `ready` or once its stand-in is
 *  near the viewport, with the stand-in before that and while its chunk
 *  (stylesheet included) downloads. */
export default function DeferredSection({ ready, holdId, minHeight, children }) {
  const holdRef = useRef(null)
  const [near, setNear] = useState(false)
  // Without IntersectionObserver nothing can say when a section is near, so load it.
  const open = ready || near || typeof IntersectionObserver === 'undefined'

  useEffect(() => {
    const el = holdRef.current
    if (open || !el) return undefined
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) setNear(true)
    }, { rootMargin: `${NEAR_PX}px 0px` })
    observer.observe(el)
    return () => observer.disconnect()
  }, [open])

  const hold = <Hold holdId={holdId} minHeight={minHeight} holdRef={holdRef} />
  if (!open) return hold
  return <Suspense fallback={hold}>{children}</Suspense>
}
