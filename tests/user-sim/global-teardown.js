// Print the feedback-loop summary after every run.
import { summarize } from './summarize.js'

export default function globalTeardown() {
  summarize()
}
