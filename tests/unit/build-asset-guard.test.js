// Structural guard for the acceptance suite's BUILD-ASSET watch.
//
// THE DEFECT THIS EXISTS AGAINST.
// Files under /assets/ are content-hashed build outputs. When one fails to
// arrive, the app does not report a broken build — one arbitrary locator in one
// arbitrary spec finds nothing, and the failure READS AS IF THE ELEMENT HAD
// BEEN DELETED. It lands on a different spec each time, passes in isolation and
// passes on a re-run, which is the whole signature of
// `suite-flake-class-unreproduced`.
//
// There are two ways an asset fails to arrive and the guard began covering only
// one of them:
//
//   4xx      — dist/ was REBUILT under the run. `vite build` empties dist/ and
//              `vite preview` serves it live, so a concurrent build deletes the
//              chunks the running workers are mid-fetch on.
//   net::    — the machine or the connection could not DELIVER the file.
//              Measured 2026-09-06: `net::ERR_NO_BUFFER_SPACE` against
//              /assets/index-*.js and /assets/en-*.js, under several agents
//              running suites at once. A request that fails this way produces
//              NO HTTP RESPONSE, so the `response` listener never saw it.
//
// This file guards the things observation cannot catch: the watch quietly
// losing half its coverage, the classifier widening into a net that cries wolf,
// and the deliberate hole acquiring a second caller. All three would produce a
// green suite, which is the failure mode the whole exercise is against.
//
// Deliberately comment-blind, for the reason tests/unit/lazy-route-readiness.test.js
// records: assertions in this repo have matched the explanatory comments that
// quote the string under test more than once.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { assetNeverArrived } from '../user-sim/base.js'

const ROOT = process.cwd()
const SIM_DIR = path.join(ROOT, 'tests', 'user-sim')

const stripComments = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '')

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8')
const readStripped = (rel) => stripComments(read(rel))

const SPECS = fs.readdirSync(SIM_DIR).filter((f) => f.endsWith('.spec.js')).sort()

test('there are specs to guard, so this file cannot pass by finding nothing', () => {
  assert.ok(SPECS.length >= 20,
    `expected the acceptance suite to still be here; found ${SPECS.length} spec file(s)`)
})

/* ── The classifier ─────────────────────────────────────────────────────────
 *
 * Both directions are asserted, and the second is the one that matters. A guard
 * that fires on the suite's own deliberate aborts is a guard people start
 * ignoring — which is the reasoning `classifyOneTapFailure` already carries,
 * after the One Tap guard failed at random on green branches and cost two
 * investigations.
 */

test('a build asset that could not be DELIVERED is caught', () => {
  const undelivered = [
    // The one measured on 2026-09-06, on /assets/index-*.js and /assets/en-*.js.
    'net::ERR_NO_BUFFER_SPACE',
    'net::ERR_INSUFFICIENT_RESOURCES',
    // Recorded on this machine on 2026-09-06, on a font rather than an asset.
    'net::ERR_ADDRESS_IN_USE',
    'net::ERR_OUT_OF_MEMORY',
    'net::ERR_CONNECTION_RESET',
    'net::ERR_CONNECTION_REFUSED',
    'net::ERR_CONNECTION_CLOSED',
    'net::ERR_CONNECTION_FAILED',
    'net::ERR_TIMED_OUT',
    'net::ERR_EMPTY_RESPONSE',
    'net::ERR_CONTENT_LENGTH_MISMATCH',
    'net::ERR_INCOMPLETE_CHUNKED_ENCODING',
    'net::ERR_SOCKET_NOT_CONNECTED',
    'net::ERR_ADDRESS_UNREACHABLE',
    'net::ERR_NETWORK_CHANGED',
  ]
  for (const why of undelivered) {
    assert.equal(assetNeverArrived(why), true,
      `${why} means the file did not arrive, and the guard must say so`)
  }
})

test('the suite\'s OWN deliberate failures are not caught, or the guard cries wolf', () => {
  const deliberate = [
    // `route.abort()` with no argument. 10-home-chaos-to-calm uses it for the
    // "visitor whose motion chunk never arrives" persona, ON /assets/.
    'net::ERR_FAILED',
    // A request cancelled by a navigation or a closing context.
    'net::ERR_ABORTED',
    // `route.abort('blockedbyclient')`, 11-typography-tools.
    'net::ERR_BLOCKED_BY_CLIENT',
    // `context.setOffline(true)`, used by five specs on purpose.
    'net::ERR_INTERNET_DISCONNECTED',
  ]
  for (const why of deliberate) {
    assert.equal(assetNeverArrived(why), false,
      `${why} is something this suite does ON PURPOSE. Counting it would fail green runs,\n`
      + 'which is how a guard stops being read. If a new failure mode really belongs in the\n'
      + 'watch, add its exact code to ASSET_NEVER_ARRIVED in tests/user-sim/base.js and say\n'
      + 'what it means — do not widen the pattern.')
  }
  assert.equal(assetNeverArrived(''), false, 'an empty failure reason is not evidence of anything')
  assert.equal(assetNeverArrived(undefined), false, 'nor is a missing one')
})

// ANTI-VACUITY for the test above. Its exemptions only earn their place if the
// suite really does produce those failures; if the aborts and the offline
// switches were all deleted, the list would be guarding nothing and the test
// would still be green.
test('the suite really does abort requests and go offline, so those exemptions are real', () => {
  const aborters = SPECS.filter((f) => /\broute\.abort\s*\(|\br\.abort\s*\(/.test(readStripped(path.join('tests', 'user-sim', f))))
  assert.ok(aborters.length >= 3,
    `only ${aborters.length} spec(s) abort a request. The ERR_FAILED / ERR_BLOCKED_BY_CLIENT\n`
    + 'exemptions above exist because this suite aborts on purpose - if it has stopped, they\n'
    + 'are dead weight and should go.')
  const offliners = SPECS.filter((f) => /setOffline\s*\(\s*true/.test(readStripped(path.join('tests', 'user-sim', f))))
  assert.ok(offliners.length >= 3,
    `only ${offliners.length} spec(s) go offline. Same reasoning as the aborts above, for the\n`
    + 'ERR_INTERNET_DISCONNECTED exemption.')
})

/* ── The watch itself ────────────────────────────────────────────────────── */

// Asserted on strings unique to watchBuildAssets rather than on a body
// extracted by regex. `stripComments` here eats the newlines in front of a
// comment line (`^\s*` with the `m` flag crosses them), so it joins lines and a
// `([\s\S]*?)\n\}` body match cannot be trusted to end where the function does.
// That is not a hypothetical: it silently over-matched into the next function
// while this file was being written.
test('watchBuildAssets watches BOTH ways an asset fails to arrive', () => {
  const src = readStripped(path.join('tests', 'user-sim', 'base.js'))
  assert.match(src, /res\.status\(\)\s*<\s*400/,
    'watchBuildAssets stopped watching RESPONSE STATUS, so a 4xx under /assets/ - which is\n'
    + 'dist/ rebuilt under the run - is invisible again.')
  assert.match(src, /context\.on\(\s*'requestfailed'[\s\S]{0,400}?assetNeverArrived\s*\(/,
    'watchBuildAssets stopped classifying FAILED requests. A request that fails with\n'
    + 'net::ERR_NO_BUFFER_SPACE produces no HTTP response at all, so the response listener\n'
    + 'cannot see it - and that is the exact shape measured on 2026-09-06, where the app\n'
    + 'chunk never loaded and five specs reported missing elements instead.')
})

// Anti-vacuity for the test above: it asserts what the watch DOES, and would
// still pass if nothing installed the watch on a context.
test('the watch is installed on browser.newContext, so it covers every context', () => {
  const src = readStripped(path.join('tests', 'user-sim', 'base.js'))
  assert.match(src, /browser\.newContext\s*=\s*async[\s\S]{0,200}?watchBuildAssets\s*\(/,
    'watchBuildAssets is no longer wrapped around browser.newContext. The default page and\n'
    + 'context fixtures are built by _contextFactory, which calls browser.newContext() - and\n'
    + '73 of this suite\'s tests take { browser } and build their own. Wrapping that one\n'
    + 'method is what covers all of them.')
})

test('the guard fails the individual TEST as well as the run', () => {
  const src = readStripped(path.join('tests', 'user-sim', 'base.js'))
  assert.match(src, /auto:\s*true/,
    'The per-test build-asset guard is no longer an automatic fixture. Without it the run\n'
    + 'still fails in the global teardown, but nothing says WHICH test was the casualty -\n'
    + 'and the reported symptom is a locator finding nothing, which is the misreading this\n'
    + 'whole item is about.')
  assert.match(src, /assertAssetsArrivedThisTest/,
    'the per-test assertion is gone from base.js')
})

test('the global teardown still fails the run on a build asset that never arrived', () => {
  const src = readStripped(path.join('tests', 'user-sim', 'global-teardown.js'))
  assert.match(src, /assertNoStaleBuildAssets\s*\(/,
    'The global teardown stopped calling assertNoStaleBuildAssets(). A run in which dist/\n'
    + 'was rebuilt, or in which the machine could not deliver the app, is void in BOTH\n'
    + 'directions - the passes as much as the failures.')
})

/* ── The deliberate hole ─────────────────────────────────────────────────── */

// Matched on the IDENTIFIER, not on `name(`. A first draft required a call
// paren and a spec that merely imported the hatch - or aliased it and called
// the alias - walked straight past. Caught by mutation, which is the only
// reason it is written this way.
test('expectBuildAssetFailures is named by exactly the one spec that breaks an asset on purpose', () => {
  const callers = SPECS.filter((f) => /\bexpectBuildAssetFailures\b/.test(readStripped(path.join('tests', 'user-sim', f))))
  assert.deepEqual(callers, ['47-lazy-route-readiness.spec.js'],
    'expectBuildAssetFailures() suppresses the build-asset guard for one browser context, and\n'
    + 'only the spec that PROVES the guard works may do that - it aborts the entry bundle, so\n'
    + 'without the suppression the run\'s own proof would fail the run. Any other spec that so\n'
    + 'much as imports it is switching the guard off:\n  ' + callers.join('\n  '))
})
