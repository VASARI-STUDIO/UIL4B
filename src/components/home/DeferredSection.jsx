import { Suspense, useEffect, useRef, useState } from 'react'
import ChunkBoundary from './ChunkBoundary'
import './deferredSection.css'

// THE HOMEPAGE'S BELOW-THE-FOLD SECTIONS LOAD AS THEY APPROACH THE VIEWPORT.
//
// Spectrum.jsx loads each of them with lazyRoute, so their code and their
// stylesheets sit in chunks of their own, not in the entry chunk and the
// render-blocking sheet every route pays for (tests/unit/home-asset-budget.test.js
// holds both sizes). A section's chunks start when its stand-in is within
// NEAR_PX of the viewport, or when `ready` says every section should (a link
// into the page, or the first scroll, touch or key press: see
// useBelowFoldReady). Until then a section is an empty box a little under its
// final height at the current width (deferredSection.css), so the ones already
// mounted barely move when it arrives. The chunks are fetched ahead of this, once the page is idle
// (belowFoldSections.js), so a section mounts without waiting on a download.

// How far outside the viewport, above and below, a stand-in opens its section.
const NEAR_PX = 600

// The stand-in for a section whose chunk has not arrived. `holdId` is set when
// the section renders its own id (so an in-page link has something to land on
// until it does); the sections the page wraps itself already carry theirs.
// `data-deferred-hold` marks it for usePageAnchors and landOnHash, which wait
// until none is left before they land an arriving hash. A stand-in whose chunk
// failed to download is `failed`: it keeps its size and id but is no longer
// waited for, since nothing is coming to replace it.
function Hold({ holdId, size, holdRef, failed = false }) {
  const marker = failed ? { 'data-deferred-failed': '' } : { 'data-deferred-hold': '' }
  return <div ref={holdRef} id={holdId} className={`dsh-${size}`} aria-hidden="true" {...marker} />
}

/** `children` is a lazy section; `size` names its stand-in height in
 *  deferredSection.css (bookmarks, try, exports, examples or plans). It mounts when `ready` or once its stand-in is
 *  near the viewport, with the stand-in before that and while its chunk
 *  (stylesheet included) downloads. */
export default function DeferredSection({ ready, holdId, size, children }) {
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

  const hold = <Hold holdId={holdId} size={size} holdRef={holdRef} />
  if (!open) return hold
  return (
    <ChunkBoundary fallback={<Hold holdId={holdId} size={size} failed />}>
      <Suspense fallback={hold}>{children}</Suspense>
    </ChunkBoundary>
  )
}
