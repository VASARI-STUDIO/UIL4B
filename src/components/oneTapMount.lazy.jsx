// DEFERRED One Tap mount. Same default export, held back until the Firebase
// gate opens — see src/utils/firebaseAccess.lazy.js.
//
// WHY IT WAITS ON THE GATE RATHER THAN JUST BEING LAZY. GoogleOneTap reads
// GOOGLE_CLIENT_ID from utils/firebase, so merely IMPORTING it pulls the whole
// Firebase chunk down. A bare `lazy()` would fetch it the moment App renders,
// which is the first paint — the exact thing the deferral exists to avoid. So
// the gate is awaited BEFORE the dynamic import is even started.
//
// `fallback={null}` is right rather than lazy: One Tap renders a floating
// Google prompt over the page, and "not there yet" is what it already looks
// like for the seconds before Google Identity Services loads.
import { lazy, Suspense } from 'react'
import { whenFirebaseGate } from '../utils/firebaseAccess'

const GoogleOneTap = lazy(() => whenFirebaseGate().then(() => import('./GoogleOneTap')))

export default function OneTapMount(props) {
  return (
    <Suspense fallback={null}>
      <GoogleOneTap {...props} />
    </Suspense>
  )
}
