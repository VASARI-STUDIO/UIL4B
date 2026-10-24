// Six days of `analytics-daily` documents, produced by calling the real
// trackers (trackPageView, trackToolOpen, trackToolAction, trackFontCopy,
// trackIconCopy, trackUpgradeGate, trackActivation, trackFirstWinChoice) and
// flushing them into the in-memory Firestore, so a fixture can never describe
// a field shape the writers do not produce.
//
// Run as a script it prints `{ docs, expected }` as JSON for the browser suite;
// the `expected` totals come from the PLAN below, not from the documents, so a
// rendered figure is compared with what was done rather than with what was
// stored.
import { fileURLToPath } from 'node:url'
import { loadAnalytics, flush, setDay, resetAll, store } from './aggregate-harness.js'

const DAYS = 6
const LAST_DAY = [2026, 9, 18]

// What happens on day i (0 = the newest). Every figure stays at least 1.
const at = (base, i) => Math.max(1, base - i)

export const PLAN = {
  pages: { '/': 9, '/create/palette': 7, '/discover/gradients': 5, '/plans': 3 },
  opens: { palette: 12, contrast: 8, gradient: 5, 'font-gallery': 4 },
  used: { palette: 6, contrast: 3, gradient: 2 },
  fontCopies: 3,
  icons: [['lucide', 'arrow-right', 4], ['lucide', 'check', 2], ['phosphor', 'heart', 3]],
  gates: [['ai-palette', 2]],
  activations: [['palette', 'save', 3], ['gradient', 'export', 1]],
  firstWins: [['palette', 3], ['skipped', 1]],
}

/** The totals the Overview should show for the six days, from the plan alone. */
export function expectedTotals() {
  const total = (base) => Array.from({ length: DAYS }, (_, i) => at(base, i)).reduce((x, y) => x + y, 0)
  const totals = (obj) => Object.fromEntries(Object.entries(obj).map(([k, base]) => [k, total(base)]))
  const pages = totals(PLAN.pages)
  return {
    totalViews: Object.values(pages).reduce((x, y) => x + y, 0),
    opens: totals(PLAN.opens),
    used: totals(PLAN.used),
    fontCopies: PLAN.fontCopies * DAYS,
    activations: PLAN.activations.reduce((n, [, , base]) => n + total(base), 0),
    gates: PLAN.gates.reduce((n, [, base]) => n + total(base), 0),
    firstWins: PLAN.firstWins.reduce((n, [, base]) => n + total(base), 0),
    days: DAYS,
  }
}

export async function buildAggregateDocs() {
  const a = await loadAnalytics()
  resetAll()
  for (let i = DAYS - 1; i >= 0; i--) {
    const [y, m, d] = LAST_DAY
    setDay(y, m, d - i)
    // Local blobs are per browser; each day starts clean so the page-view log
    // never reaches its cap.
    globalThis.localStorage.removeItem('vs-analytics')
    for (const [route, base] of Object.entries(PLAN.pages)) {
      for (let n = 0; n < at(base, i); n++) a.trackPageView(route)
    }
    for (const [tool, base] of Object.entries(PLAN.opens)) {
      for (let n = 0; n < at(base, i); n++) a.trackToolOpen(tool)
    }
    for (const [tool, base] of Object.entries(PLAN.used)) {
      for (let n = 0; n < at(base, i); n++) a.trackToolAction(tool)
    }
    for (let n = 0; n < PLAN.fontCopies; n++) a.trackFontCopy('Inter')
    for (const [pack, name, base] of PLAN.icons) {
      for (let n = 0; n < at(base, i); n++) a.trackIconCopy(pack, name)
    }
    for (const [gate, base] of PLAN.gates) {
      for (let n = 0; n < at(base, i); n++) a.trackUpgradeGate(gate)
    }
    for (const [win, base] of PLAN.firstWins) {
      for (let n = 0; n < at(base, i); n++) a.trackFirstWinChoice(win)
    }
    for (const [tool, kind, base] of PLAN.activations) {
      for (let n = 0; n < at(base, i); n++) {
        a.startTimeToValue()
        a.trackActivation(tool, kind)
      }
    }
    flush()
  }
  await Promise.resolve()
  const docs = {}
  for (const [p, data] of store.entries()) docs[p] = data
  return docs
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  buildAggregateDocs().then((docs) => {
    process.stdout.write(JSON.stringify({ docs, expected: expectedTotals() }))
    process.exit(0)
  })
}
