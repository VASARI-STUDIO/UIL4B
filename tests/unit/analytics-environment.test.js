// Shared analytics must count real users and nothing else.
//
// docs/PROPOSALS.md P-001 (APPROVED). Every environment points at the SAME
// Firebase project, and the client writes per-day counters into
// `analytics-daily/{YYYY-MM-DD}`. So the admin dashboard's totals mixed real
// users with localhost development, every preview deploy opened to review a PR,
// and the acceptance suite — which walks ~30 routes on every CI run.
//
// A number that moves when CI runs is not a measurement. The proposal's whole
// argument is that instrumentation converts opinion into evidence; aggregates
// counting our own robots do the opposite, because the failure mode is a
// confident, plausible, wrong number that nobody thinks to question.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { stripComments } from './helpers/source-text.js'
import {
  isProductionHost, canWriteSharedAnalytics, environmentLabel, PRODUCTION_HOSTS,
} from '../../src/utils/environment.js'

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8')
const at = (hostname) => ({ hostname })

// ── The allowlist ───────────────────────────────────────────────────────────

test('the real site counts', () => {
  for (const host of PRODUCTION_HOSTS) {
    assert.equal(isProductionHost(host), true, `${host} is production`)
    assert.equal(canWriteSharedAnalytics(at(host)), true)
  }
})

test('development, previews and CI do not', () => {
  for (const host of [
    'localhost', '127.0.0.1', '::1',
    'uil4b-git-main-dylan.vercel.app', 'uil4b-abc123.vercel.app',
    'staging.uil4b.com', '192.168.1.10',
  ]) {
    assert.equal(canWriteSharedAnalytics(at(host)), false, `${host} must not write shared counters`)
  }
})

test('an unrecognised environment is never treated as production', () => {
  // The fail-safe direction the proposal specifies. Getting this backwards
  // silently re-poisons the data, and nobody notices because the result still
  // looks like a number.
  for (const host of ['', null, undefined, 'example.com', 'some-new-preview-scheme.dev']) {
    assert.equal(canWriteSharedAnalytics(at(host)), false, `${String(host)} must fail closed`)
  }
  assert.equal(canWriteSharedAnalytics(null), false)
})

test('a lookalike host cannot pass as production', () => {
  // Why the check is an exact match rather than endsWith('uil4b.com'):
  // a suffix test accepts both of these.
  assert.equal(isProductionHost('uil4b.com.evil.example'), false)
  assert.equal(isProductionHost('notuil4b.com'), false)
  assert.equal(isProductionHost('preview-uil4b.vercel.app'), false)
})

test('case and stray whitespace do not change the answer', () => {
  assert.equal(isProductionHost('WWW.UIL4B.COM'), true)
  assert.equal(isProductionHost('  www.uil4b.com  '), true)
})

test('every environment reports a label, and only one says production', () => {
  assert.equal(environmentLabel(at('www.uil4b.com')), 'production')
  assert.equal(environmentLabel(at('localhost')), 'local')
  assert.equal(environmentLabel(at('x.vercel.app')), 'preview')
  assert.equal(environmentLabel(at('mystery.dev')), 'unknown')
  assert.equal(environmentLabel(at('')), 'unknown')
})

// ── Where the guard sits ────────────────────────────────────────────────────

test('the guard is at the single choke point, not at each call site', () => {
  // One place to be right. Guarding per counter would mean the next counter
  // added silently opts out.
  const src = read('src/utils/analytics.js')
  const flush = /function flushAggregate\(\)[\s\S]*?\n\}/.exec(src)?.[0] || ''
  assert.ok(flush, 'flushAggregate must exist')
  assert.match(flush, /canWriteSharedAnalytics\(\)/,
    'every shared write passes through flushAggregate, so the guard belongs there')
  // And it must run BEFORE the write, not after.
  assert.ok(flush.indexOf('canWriteSharedAnalytics') < flush.indexOf('setDoc'),
    'the guard must precede the Firestore write')
})

test('blocked increments are dropped, not queued', () => {
  // Queuing them would just write them the moment someone opened the real
  // site, which is the same contamination one step later.
  const src = read('src/utils/analytics.js')
  assert.match(src, /if \(!canWriteSharedAnalytics\(\)\) \{ pendingIncrements = \{\}; return \}/)
})

// ── The two events P-001 asks for ───────────────────────────────────────────

test('the upgrade gate is instrumented once, centrally', () => {
  // openProModal has 16 call sites. Instrumenting each would guarantee the
  // next gate is added without one, and the count under-reports forever.
  const modal = read('src/contexts/ProModalContext.jsx')
  assert.match(modal, /trackUpgradeGate\(/, 'the gate event fires in the provider')
  const analytics = read('src/utils/analytics.js')
  assert.match(analytics, /export function trackUpgradeGate/)
  // It must name WHICH gate, or the number says people upgrade but not why.
  assert.match(modal, /next\.gate \|\|/)
})

test('activation is separate from ordinary tool usage', () => {
  const src = read('src/utils/analytics.js')
  assert.match(src, /export function trackActivation/)
  // If activation went through trackToolAction, moving a slider would inflate
  // the one number meant to mean "the product was useful to someone".
  const fn = /export function trackActivation[\s\S]*?\n\}/.exec(src)?.[0] || ''
  assert.ok(!/trackToolAction/.test(fn), 'activation must not route through generic tool usage')
})

test('activation fires only on real, completed work', () => {
  // A blank project is a container, not work; a failed export is not a
  // completed piece of work either.
  const project = read('src/contexts/ProjectContext.jsx')
  assert.match(project, /if \(!opts\.blank\) \{/, 'a blank shell must not count as activation')
  const exportPanel = read('src/components/ExportPanel.jsx')
  const run = /const runExport = async[\s\S]*?\n {2}\}/.exec(exportPanel)?.[0] || ''
  assert.ok(run.indexOf('trackActivation') < run.indexOf('} catch'),
    'activation must fire on the success path, never in the catch')
})

test('analytics can never break the thing it is measuring', () => {
  for (const [file, fn] of [
    ['src/contexts/ProjectContext.jsx', 'trackActivation'],
    ['src/components/ExportPanel.jsx', 'trackActivation'],
    ['src/contexts/ProModalContext.jsx', 'trackUpgradeGate'],
  ]) {
    const src = read(file)
    // Every call site must sit inside a try/catch on the same line, so a
    // failing analytics write can never block a save, an export or a gate.
    const wrapped = src
      .split('\n')
      .some(line => line.includes(`${fn}(`) && line.includes('try {') && line.includes('catch'))
    assert.ok(wrapped, `${file}: ${fn} must be wrapped so a failure cannot block the user's action`)
  }
})

// ── The privacy page names the analytics the app actually mounts ────────────

test('the privacy page discloses Vercel Web Analytics exactly when main.jsx mounts it', () => {
  // src/main.jsx renders <Analytics /> from @vercel/analytics on every route,
  // and /privacy said nothing about it — while /help, for a time, claimed
  // "no third-party analytics trackers". A privacy policy is a claim about
  // what runs; it is held here to the import that decides what runs, in both
  // directions, so removing the package must also remove the sentence.
  const main = stripComments(read('src/main.jsx'))
  const mounted = /from '@vercel\/analytics\/react'/.test(main) && /<Analytics \/>/.test(main)
  const privacy = stripComments(read('src/pages/Privacy.jsx'))
  if (mounted) {
    assert.match(privacy, /Vercel Web Analytics/, 'main.jsx mounts Vercel Analytics and /privacy does not name it')
    // The three facts a reader needs, as Vercel's own privacy page states
    // them: no cookies, nothing tied to an IP address, a request hash that is
    // discarded after 24 hours.
    assert.match(privacy, /sets no cookies/, '/privacy no longer says the analytics set no cookies')
    assert.match(privacy, /IP address/, '/privacy no longer says what happens to the IP address')
    assert.match(privacy, /24 hours/, '/privacy no longer says how long the visitor hash lives')
  } else {
    assert.doesNotMatch(privacy, /Vercel Web Analytics/,
      '/privacy names an analytics service main.jsx no longer mounts')
  }
})
