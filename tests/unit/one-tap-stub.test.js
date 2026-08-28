// Structural guard for the suite-wide Google One Tap stub.
//
// The real invariant is "no request reaches accounts.google.com during a run",
// and that is asserted by observation in two places: the guard spec
// `tests/user-sim/26-one-tap-stub.spec.js`, and `assertOneTapNeverLeft()` in the
// global teardown, which fails the whole run if a single response from that host
// arrived without the stub's header.
//
// This file guards the thing observation CANNOT catch: a NEW spec that opts out
// of the mechanism, whose requests would then escape without anything noticing
// until someone read a CI log. Source inspection is the only practical way to
// see that before the fact, so it is deliberately narrow and deliberately
// comment-blind — assertions in this repo have matched the explanatory comments
// that quote the string under test more than once.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const SIM_DIR = path.join(ROOT, 'tests', 'user-sim')

const stripComments = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '')

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8')
const readStripped = (rel) => stripComments(read(rel))

const SPECS = fs.readdirSync(SIM_DIR)
  .filter((f) => f.endsWith('.spec.js'))
  .sort()

test('there are specs to guard, so this file cannot pass by finding nothing', () => {
  assert.ok(SPECS.length >= 20,
    `expected the acceptance suite to still be here; found ${SPECS.length} spec file(s) in ${SIM_DIR}`)
})

test('every acceptance spec takes `test` from base.js, which is where One Tap is stubbed', () => {
  const offenders = []
  for (const file of SPECS) {
    const src = readStripped(path.join('tests', 'user-sim', file))
    if (!/^\s*import\s*\{[^}]*\btest\b[^}]*\}\s*from\s*['"]\.\/base\.js['"]/m.test(src)) {
      offenders.push(`${file}: does not import { test } from './base.js'`)
    }
  }
  assert.deepEqual(offenders, [],
    'One Tap is stubbed by the `browser` fixture in tests/user-sim/base.js. A spec that imports `test`\n'
    + 'from anywhere else runs with an unstubbed browser and calls accounts.google.com on every page load:\n  '
    + offenders.join('\n  '))
})

test('no acceptance spec imports from @playwright/test directly', () => {
  // One door, so there is nothing to remember. `expect` is re-exported by
  // base.js precisely so a spec never needs a second import to reach for.
  const offenders = SPECS
    .filter((file) => /from\s*['"]@playwright\/test['"]/.test(readStripped(path.join('tests', 'user-sim', file))))
    .map((file) => `${file}`)
  assert.deepEqual(offenders, [],
    'These specs import from @playwright/test instead of ./base.js:\n  ' + offenders.join('\n  '))
})

// The guard spec names the host on purpose: it injects the exact script tag the
// app injects and then proves the stub served it. Nothing else may.
const HOST_EXEMPT = '26-one-tap-stub.spec.js'

test('no spec rolls its own accounts.google.com route, so two mechanisms cannot race', () => {
  const offenders = []
  for (const file of SPECS) {
    if (file === HOST_EXEMPT) continue
    const src = readStripped(path.join('tests', 'user-sim', file))
    if (/accounts\.google\.com/.test(src)) offenders.push(file)
  }
  assert.deepEqual(offenders, [],
    'accounts.google.com is handled once, in tests/user-sim/base.js. A per-spec route registered on\n'
    + '`page` silently takes precedence over the context route, so the winner stops being obvious:\n  '
    + offenders.join('\n  '))
})

test('the one exemption is real, so the rule above cannot pass by being toothless', () => {
  assert.ok(SPECS.includes(HOST_EXEMPT), `${HOST_EXEMPT} is missing — the One Tap guard spec is gone`)
  assert.match(readStripped(path.join('tests', 'user-sim', HOST_EXEMPT)), /accounts\.google\.com/,
    `${HOST_EXEMPT} no longer names the host, so it is exempted from a rule it does not need`)
})

test('the stub is installed on browser.newContext, which is what covers contexts built in a test body', () => {
  const base = readStripped('tests/user-sim/base.js')
  assert.match(base, /browser\.newContext\s*=/,
    'base.js must wrap browser.newContext. Decorating only the `page` fixture would miss every context '
    + 'a spec builds with browser.newContext() inside the test body.')
  assert.match(base, /browser:\s*\[/,
    'base.js must override the `browser` fixture — that is the only fixture both the default page and a '
    + 'hand-built context come through.')
})

test('the stub fulfils with an empty script and never aborts', () => {
  const base = readStripped('tests/user-sim/base.js')
  assert.match(base, /route\.fulfill\(/,
    'base.js must fulfil the request.')
  assert.doesNotMatch(base, /\.abort\(/,
    'Aborting raises a console error that the feedback loop then reports as a finding on every viewport. '
    + 'Serve an empty script instead.')
  assert.match(base, /contentType:\s*'application\/javascript'/, 'the stub must serve JavaScript')
  assert.match(base, /body:\s*''/, 'the stub body must be empty')
})

test('the run fails if anything reaches accounts.google.com, not just prints', () => {
  const teardown = readStripped('tests/user-sim/global-teardown.js')
  assert.match(teardown, /assertOneTapNeverLeft\(\)/,
    'global-teardown.js must call assertOneTapNeverLeft(); a stub nothing checks is not evidence.')
  const base = readStripped('tests/user-sim/base.js')
  assert.match(base, /throw new Error\(/,
    'assertOneTapNeverLeft must throw on an escaped request — a warning would be read as a pass.')
})

test('at least one spec still builds its own context, so the hard case is really exercised', () => {
  // If this ever goes to zero, the `browser`-fixture wrap is still correct but
  // nothing in the suite proves it any more, and a future refactor down to a
  // page-fixture stub would look safe when it is not.
  const inBody = SPECS.filter((file) => /browser\.newContext\(|browser\.newPage\(/
    .test(readStripped(path.join('tests', 'user-sim', file))))
  assert.ok(inBody.length > 0,
    'no spec builds its own browser context any more — re-check what tests/user-sim/26-one-tap-stub.spec.js '
    + 'is still proving before trusting it')
})

// ─────────────────────────────────────────────────────────────────────────────
// THE FAILURE CLASSIFIER
// ─────────────────────────────────────────────────────────────────────────────
// The suite-wide guard failed whole runs at random, on branches that had not
// touched anything near it, with a different spec implicated each time. The
// cause was not the stub — it was the guard's bookkeeping: a failed request was
// called an escape when the `context.route` handler had never taken charge of
// it, and "the handler ran" is a race against context teardown. A request
// raised and then cancelled by a closing context never reached Google and never
// reached the handler either, so it was reported as having escaped.
//
// The classification now comes from the failure itself. These cases are the
// contract, and the second block matters most: making a guard quieter is only
// legitimate if it is still loud about the thing it guards.
import { classifyOneTapFailure } from '../user-sim/base.js'

test('a request cancelled inside the browser is not an escape', () => {
  for (const why of [
    'net::ERR_ABORTED',                       // the page navigated, or the context closed
    'net::ERR_BLOCKED_BY_CLIENT',
    'net::ERR_FAILED',
    'Request is already handled!',
    '',
    undefined,
  ]) {
    assert.equal(classifyOneTapFailure(why), 'cancelled-in-browser', String(why))
  }
})

test('a request that actually left the browser IS an escape', () => {
  // Every one of these means Chromium got as far as the network stack. If the
  // classifier ever stops reporting these, the guard is decorative.
  for (const why of [
    'net::ERR_NAME_NOT_RESOLVED',
    'net::ERR_CONNECTION_REFUSED',
    'net::ERR_CONNECTION_RESET',
    'net::ERR_INTERNET_DISCONNECTED',
    'net::ERR_TUNNEL_CONNECTION_FAILED',
    'net::ERR_PROXY_CONNECTION_FAILED',
    'net::ERR_CERT_AUTHORITY_INVALID',
    'net::ERR_SSL_PROTOCOL_ERROR',
    'net::ERR_TIMED_OUT',
  ]) {
    assert.equal(classifyOneTapFailure(why), 'reached-network', why)
  }
})
