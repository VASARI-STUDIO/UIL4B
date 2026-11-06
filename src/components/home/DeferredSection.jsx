import { Suspense } from 'react'

// THE HOMEPAGE'S BELOW-THE-FOLD SECTIONS LOAD AFTER THE FIRST SCREEN.
//
// Spectrum.jsx loads each of them with lazyRoute, so their code and their
// stylesheets sit in chunks of their own, not in the entry chunk and the
// render-blocking sheet every route pays for (tests/unit/home-asset-budget.test.js
// holds both sizes). useBelowFoldReady says when those chunks start. Until then
// a section is an empty box of about its final height, so the ones already
// mounted do not move when it arrives.

// The stand-in for a section whose chunk has not arrived. `holdId` is set when
// the section renders its own id (so an in-page link has something to land on
// until it does); the sections the page wraps itself already carry theirs.
function Hold({ holdId, minHeight }) {
  return <div id={holdId} aria-hidden="true" style={{ minHeight }} />
}

/** `children` is a lazy section. It mounts when `ready`, with the stand-in
 *  before that and while its chunk (stylesheet included) downloads. */
export default function DeferredSection({ ready, holdId, minHeight, children }) {
  const hold = <Hold holdId={holdId} minHeight={minHeight} />
  if (!ready) return hold
  return <Suspense fallback={hold}>{children}</Suspense>
}
