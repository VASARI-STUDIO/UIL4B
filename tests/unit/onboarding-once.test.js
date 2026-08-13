// Onboarding is shown once per PERSON, not once per browser.
//
// The decision used to be `localStorage.getItem('vs-onboarded') === '1'` and
// nothing else. localStorage is per-origin, per-browser and per-profile, so an
// established account was sent back through the three-question survey on a
// second device, a second browser, an incognito window, any "clear site data",
// and — because Safari and Firefox evict storage for sites you have not opened
// recently — simply after a few weeks away.
//
// Worse: `skip()` wrote ONLY localStorage and never touched the profile, so
// anyone who skipped had nothing recorded on their account at all. For them it
// reappeared on every browser, forever.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  onboardingDestination, profileOnboardingState, localOnboardingFlag, ONBOARDED_KEY,
} from '../../src/utils/onboardingState.js'

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8')
const stripComments = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^\s*\/\/.*$/gm, ' ')

const store = (value) => ({ getItem: (k) => (k === ONBOARDED_KEY ? value : null) })
const done = { onboarding: { completedAt: 1_760_000_000_000 } }

// ── The account is the truth ────────────────────────────────────────────────

test('a completed account skips onboarding even on a browser that has never seen it', () => {
  // The exact reported symptom: same person, new browser, onboarding again.
  assert.equal(onboardingDestination(done, store(null)), '/home')
})

test('an account with no completion still gets onboarding on a fresh browser', () => {
  assert.equal(onboardingDestination({ displayName: 'A' }, store(null)), '/onboarding')
})

test('a local flag rescues an account whose completion write has not landed', () => {
  // This browser watched them finish; the profile write is in flight or was
  // rejected. Re-running it would be the same bug pointing the other way.
  assert.equal(onboardingDestination({ displayName: 'A' }, store('1')), '/home')
})

test('an unloaded profile never re-runs onboarding', () => {
  // null means "not known yet", which must stay distinct from false. Guessing
  // "not onboarded" during a slow Firestore read would re-run the survey for
  // exactly the established users this bug kept catching — and a brand-new
  // sign-up does not depend on this path at all (App.jsx routes them from the
  // auth event via pendingOnboarding).
  assert.equal(onboardingDestination(null, store(null)), '/home')
  assert.equal(onboardingDestination(undefined, store(null)), '/home')
  assert.equal(profileOnboardingState(null), null)
})

test('a malformed completedAt is not treated as completion', () => {
  for (const bad of [null, undefined, 'yesterday', NaN, {}]) {
    assert.equal(profileOnboardingState({ onboarding: { completedAt: bad } }), false,
      `completedAt=${String(bad)} must not count`)
  }
})

test('storage that throws does not crash the router', () => {
  const hostile = { getItem() { throw new Error('blocked') } }
  assert.equal(localOnboardingFlag(hostile), false)
  assert.equal(onboardingDestination(done, hostile), '/home')
})

// ── The wiring ──────────────────────────────────────────────────────────────

test('the router asks the account, not localStorage', () => {
  const src = stripComments(read('src/App.jsx'))
  assert.ok(src.includes('onboardingDestination(userProfile)'),
    'the / redirect must decide from the profile')
  assert.ok(!/localStorage\.getItem\('vs-onboarded'\)/.test(src),
    'App.jsx must not decide onboarding from localStorage alone')
})

test('skipping records completion on the account, not just in this browser', () => {
  // The half that made it permanent for anyone who skipped.
  const src = stripComments(read('src/pages/Onboarding.jsx'))
  const skip = /const skip = \(\) => \{[\s\S]*?\n {2}\}/.exec(src)?.[0] || ''
  assert.ok(skip, 'skip() must still exist')
  assert.ok(/markOnboardingComplete\(\)/.test(skip),
    'skip() must record completion on the profile')
})

test('both completion paths go through one function', () => {
  // Two call sites that each had to remember to write the profile is how the
  // skip path lost it in the first place.
  const src = stripComments(read('src/pages/Onboarding.jsx'))
  assert.ok(/const markOnboardingComplete = /.test(src))
  assert.ok(/const persist = \(\) => markOnboardingComplete\(answers\)/.test(src),
    'finishing with answers must reuse the same writer')
})

test('skipping does not invent survey answers', () => {
  // They declined to answer. Writing blanks would put empty values in the admin
  // table and misrepresent them as responses.
  const src = stripComments(read('src/pages/Onboarding.jsx'))
  assert.ok(!/markOnboardingComplete\(answers\)[\s\S]{0,200}navigate\(takeResumeTarget/.test(src),
    'skip() must not persist the (unanswered) survey')
})
