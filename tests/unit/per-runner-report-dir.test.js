// Two acceptance suites started at the same time must not write into each
// other's report directory.
//
// Several agents run `npm run test:users` concurrently, each with its own
// PLAYWRIGHT_PORT. Until 2026-09-08 every one of them wrote to
// tests/user-sim/report/: the second run's global setup deleted the first
// run's findings.jsonl mid-run, its teardown read a stale-asset ledger both
// suites had appended to, and Playwright's artifacts/ was shared. The
// [suite-flake-class-unreproduced] item names this as the prevention it never
// had. playwright.config.js and tests/user-sim/helpers.js now key every report
// path on the port through tests/user-sim/report-dir.js.
//
// BEHAVIOURAL, NOT A REGEX. The config is IMPORTED under different values of
// PLAYWRIGHT_PORT (a query string on the URL defeats the module cache, so each
// import evaluates the file afresh) and the resolved outputDir and reporter
// paths are compared. A regex over playwright.config.js would prove the file
// mentions the variable; this proves two ports resolve to two directories and
// that no variable at all resolves to exactly where the report has always been
// — which is what keeps CI's artifact upload and `test:users:report` working.
import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const CONFIG = pathToFileURL(path.join(process.cwd(), 'playwright.config.js')).href
const HELPERS = pathToFileURL(path.join(process.cwd(), 'tests', 'user-sim', 'helpers.js')).href

let evaluation = 0

/** Import a module fresh with PLAYWRIGHT_PORT set to `port` (or unset). */
async function withPort(port, href) {
  const before = process.env.PLAYWRIGHT_PORT
  if (port === undefined) delete process.env.PLAYWRIGHT_PORT
  else process.env.PLAYWRIGHT_PORT = String(port)
  try {
    return await import(`${href}?evaluation=${evaluation++}`)
  } finally {
    if (before === undefined) delete process.env.PLAYWRIGHT_PORT
    else process.env.PLAYWRIGHT_PORT = before
  }
}

const configFor = async (port) => (await withPort(port, CONFIG)).default
const jsonReportOf = (cfg) => {
  const json = cfg.reporter.find(([name]) => name === 'json')
  assert.ok(json, 'the config no longer registers the JSON reporter the summariser reads')
  return json[1].outputFile
}
const norm = (p) => p.replace(/\\/g, '/')
const portFlag = (port) => new RegExp(`--port ${port}(?!\\d)`)

test('with no PLAYWRIGHT_PORT the report lands exactly where it always has', async () => {
  // CI uploads tests/user-sim/report and `npm run test:users:report` reads it;
  // both run without the variable and neither may move.
  const cfg = await configFor(undefined)
  assert.equal(norm(cfg.outputDir), 'tests/user-sim/report/artifacts')
  assert.equal(norm(jsonReportOf(cfg)), 'tests/user-sim/report/results.json')
  assert.match(cfg.webServer.command, portFlag(4174), 'the default preview port moved')
  assert.equal(cfg.use.baseURL, 'http://127.0.0.1:4174')
})

test('two ports resolve to two report directories, and neither is the default', async () => {
  const a = await configFor(4770)
  const b = await configFor(4771)
  assert.notEqual(norm(a.outputDir), norm(b.outputDir),
    'two concurrent runners on different ports share one artifacts directory')
  assert.notEqual(norm(jsonReportOf(a)), norm(jsonReportOf(b)),
    'two concurrent runners on different ports overwrite one results.json')
  for (const [port, cfg] of [[4770, a], [4771, b]]) {
    assert.match(norm(cfg.outputDir), new RegExp(`^tests/user-sim/report/${port}/`),
      `port ${port}'s artifacts are not under a per-port directory inside the report root`)
    assert.match(norm(jsonReportOf(cfg)), new RegExp(`^tests/user-sim/report/${port}/`))
    assert.notEqual(norm(cfg.outputDir), 'tests/user-sim/report/artifacts',
      `port ${port} still writes into the shared default directory`)
    assert.match(cfg.webServer.command, portFlag(port),
      'the report is keyed on a port the preview server is not actually using')
  }
})

test('across the whole range agents pick from, every port gets its own directory', async () => {
  const seen = new Map()
  for (const port of [4174, 4613, 4735, 4770, 4771, 4772, 4773]) {
    const dir = norm((await configFor(port)).outputDir)
    assert.ok(!seen.has(dir), `port ${port} resolves to ${dir}, already taken by port ${seen.get(dir)}`)
    seen.set(dir, port)
  }
  assert.equal(seen.size, 7)
})

test('the findings and audit ledgers follow the same directory as the artifacts', async () => {
  // helpers.js owns REPORT_DIR; base.js, global-setup.js and summarize.js all
  // build on it. If it resolved differently from the config, a run's
  // findings.jsonl would land in one directory and its screenshots in another
  // — and a second runner's global setup would still delete the first's.
  for (const port of [undefined, 4770, 4771]) {
    const cfg = await configFor(port)
    const helpers = await withPort(port, HELPERS)
    const expected = path.resolve(process.cwd(), path.dirname(cfg.outputDir))
    assert.equal(path.resolve(helpers.REPORT_DIR), expected,
      `port ${port ?? '(unset)'}: helpers.js REPORT_DIR and the config's outputDir disagree`)
    assert.equal(path.dirname(helpers.FINDINGS_FILE), helpers.REPORT_DIR)
  }
})

test('a value that is not a port is refused rather than becoming a directory name', async () => {
  for (const bad of ['abc', '-1', '70000', '41.5']) {
    await assert.rejects(configFor(bad), /PLAYWRIGHT_PORT must be a TCP port/,
      `PLAYWRIGHT_PORT=${bad} produced a config instead of an error`)
  }
})
