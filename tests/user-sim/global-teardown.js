// Print the feedback-loop summary after every run, then fail the run outright
// if any request reached accounts.google.com. The stub in base.js is only worth
// having if it is checked, and a green suite is not evidence that it held.
import { summarize } from './summarize.js'
import { assertOneTapNeverLeft } from './base.js'

export default function globalTeardown() {
  summarize()
  assertOneTapNeverLeft()
}
