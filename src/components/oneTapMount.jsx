// EAGER One Tap mount — the default. A plain re-export, so an unflagged build
// has exactly the import graph it has today: App.jsx statically imports this,
// this statically imports GoogleOneTap, and GoogleOneTap statically imports
// GOOGLE_CLIENT_ID from utils/firebase.
//
// That last edge is the reason this seam exists at all. GoogleOneTap.jsx is
// founder-gated (docs/reference/human-validation-zones.md) and it is not the
// file that needs to change — App.jsx is, and App.jsx is not gated. Swapping
// this module for its `.lazy` twin under VITE_DEFER_FIREBASE holds the import
// back until the Firebase gate opens, without a byte changing in the gated
// component.
import GoogleOneTap from './GoogleOneTap'

export default GoogleOneTap
