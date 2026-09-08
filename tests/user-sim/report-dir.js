// Where one run of the acceptance suite writes its evidence.
//
// One resolver, imported by BOTH playwright.config.js (outputDir, the JSON
// report) and helpers.js (findings.jsonl and the two audit ledgers base.js
// keeps), so the five files a run produces always land in the same place and
// that place is decided once.
//
// KEYED ON PLAYWRIGHT_PORT. Several agents run `npm run test:users` at the
// same time, each on its own preview port, and until 2026-09-08 every one of
// them wrote to tests/user-sim/report/ — so a second run's global setup
// deleted the first run's findings.jsonl mid-run, its teardown read a ledger
// two suites had appended to, and its artifacts/ overwrote screenshots the
// other run was about to attach to a failure. The port is the one thing two
// concurrent runners are already guaranteed not to share (vite preview is
// started --strictPort), so it is the key.
//
// WITHOUT the variable the path is exactly what it always was, so CI's
// artifact upload (`.github/workflows/ci.yml` collects tests/user-sim/report)
// and `npm run test:users:report` keep working unchanged. Set the variable
// for the report step too when you set it for the run — summarize.js reads
// from the same resolver.
//
// This does NOT give each runner its own dist/. Two runners in ONE checkout
// still collide on the build (base.js fails the run on it — see
// watchBuildAssets); the documented answer to that is one checkout per
// runner, and the documented re-run procedure builds WITHOUT the variable and
// tests WITH it, which a port-keyed dist/ would break.
//
// Guarded by tests/unit/per-runner-report-dir.test.js, which imports the real
// config under different values of the variable rather than reading this file.

export const DEFAULT_PREVIEW_PORT = 4174
export const REPORT_ROOT = 'tests/user-sim/report'

/**
 * The report directory for this run, relative to the repository root and
 * using forward slashes (Playwright resolves it against the config's own
 * directory; helpers.js joins it onto process.cwd()).
 *
 * Refuses a value that is not a port rather than producing
 * `tests/user-sim/report/NaN`: the preview server would refuse the same value
 * a moment later anyway, and a directory named NaN is the kind of thing that
 * gets committed.
 */
export function resolveReportDir(env = process.env) {
  const raw = env.PLAYWRIGHT_PORT
  if (raw === undefined || raw === '') return REPORT_ROOT
  const port = Number(raw)
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`PLAYWRIGHT_PORT must be a TCP port, got ${JSON.stringify(raw)}`)
  }
  return `${REPORT_ROOT}/${port}`
}

/** The preview port for this run — the same parse playwright.config.js uses. */
export function resolvePreviewPort(env = process.env) {
  const raw = env.PLAYWRIGHT_PORT
  if (raw === undefined || raw === '') return DEFAULT_PREVIEW_PORT
  resolveReportDir(env) // one validation, shared
  return Number(raw)
}
