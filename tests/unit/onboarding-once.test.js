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

test('declining a starting point records completion on the account, not just in this browser', () => {
  // The half that made it permanent for anyone who skipped. The three unread
  // survey questions are gone, so the old top-right skip() went with them —
  // declining is now skipFirstWin(). The guarantee is identical and is what is
  // pinned here: the DECLINE path must reach the profile, not only localStorage.
  const src = stripComments(read('src/pages/Onboarding.jsx'))
  const decline = /const skipFirstWin = \(\) => \{[\s\S]*?\n {2}\}/.exec(src)?.[0] || ''
  assert.ok(decline, 'the decline path must still exist')
  assert.ok(/persist\(\)/.test(decline),
    'declining must record completion on the profile')
  // And it must not smuggle a non-answer onto the profile as a first-win choice.
  assert.ok(!/persist\(\{/.test(decline),
    'declining must not persist a first-win choice nobody made')
})

test('both completion paths go through one function', () => {
  // Two call sites that each had to remember to write the profile is how the
  // skip path lost it in the first place.
  const src = stripComments(read('src/pages/Onboarding.jsx'))
  assert.ok(/const markOnboardingComplete = /.test(src))
  // persist() used to be pinned by its exact signature, `() =>
  // markOnboardingComplete(answers)`. There are no survey answers now, and it
  // carries the first-win choice instead. The invariant that actually mattered
  // is what is asserted: persist() DELEGATES rather than writing the profile
  // itself, so there stays exactly one writer.
  assert.ok(/const persist = \([^)]*\) => markOnboardingComplete\(/.test(src),
    'finishing must reuse the same writer')
  assert.equal((src.match(/updateProfile\?\.\(/g) || []).length, 1,
    'exactly one place may write onboarding completion to the profile')
})

test('the unread survey is gone, not merely hidden', () => {
  // onboarding-survey-unused: source, use and role were persisted and read by
  // nothing a user could feel — `source` was read by nothing at all. Leaving
  // the questions in place behind a flag would keep the cost and keep the
  // dishonesty, so they are removed. This fails if any come back unread.
  const src = stripComments(read('src/pages/Onboarding.jsx'))
  assert.ok(!/How did you hear about us/.test(src), 'the attribution question must be gone')
  assert.ok(!/What best describes you/.test(src), 'the role question must be gone')
  assert.ok(!/const QUESTIONS/.test(src), 'the survey table must be gone')
})

test('the one answer still collected has a reader', () => {
  // The defect being fixed was a persisted field nothing consumed. Writing
  // onboarding.firstWin with no reader would recreate it exactly.
  const onboarding = stripComments(read('src/pages/Onboarding.jsx'))
  assert.ok(/persist\(\{ firstWin: win\.id \}\)/.test(onboarding),
    'the chosen start must be persisted')
  const admin = stripComments(read('src/pages/Admin.jsx'))
  assert.ok(/onboarding\?\.firstWin/.test(admin),
    'onboarding.firstWin must be read somewhere, or it must not be written')
})
