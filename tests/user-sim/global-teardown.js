// Print the feedback-loop summary after every run, then fail the run outright
// if any request reached accounts.google.com. The stub in base.js is only worth
// having if it is checked, and a green suite is not evidence that it held.
//
// The build-asset check runs FIRST because it invalidates everything else: if
// dist/ was rebuilt under the run, the One Tap ledger and the pass/fail counts
// are both describing a suite that was fetching deleted files.
import { summarize } from './summarize.js'
import { assertNoStaleBuildAssets, assertOneTapNeverLeft } from './base.js'

export default function globalTeardown() {
  summarize()
  assertNoStaleBuildAssets()
  assertOneTapNeverLeft()
}
