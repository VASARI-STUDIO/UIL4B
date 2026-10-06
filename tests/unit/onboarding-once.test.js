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
  SIGNED_IN_HOME, owesOnboarding, knownProfile, openOnboardingRecord, resumeOnboardingTarget,
  planProfileRead, resumeDecisionOwed,
} from '../../src/utils/onboardingState.js'

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8')
const stripComments = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^\s*\/\/.*$/gm, ' ')

const store = (value) => ({ getItem: (k) => (k === ONBOARDED_KEY ? value : null) })
const done = { onboarding: { completedAt: 1_760_000_000_000 } }
const owed = { onboarding: { openedAt: 1_760_000_000_000 } }

// ── The account is the truth ────────────────────────────────────────────────

test('a completed account skips onboarding even on a browser that has never seen it', () => {
  // The exact reported symptom: same person, new browser, onboarding again.
  assert.equal(onboardingDestination(done, store(null)), SIGNED_IN_HOME)
})

test('an account that opened onboarding and did not finish still gets it on a fresh browser', () => {
  assert.equal(onboardingDestination(owed, store(null)), '/onboarding')
  assert.equal(owesOnboarding(owed), true)
})

test('an account with no onboarding record is never sent back to it', () => {
  // Accounts from before the record existed carry no `onboarding` at all.
  // They have been using the product; the survey is not owed.
  assert.equal(onboardingDestination({ displayName: 'A' }, store(null)), SIGNED_IN_HOME)
  assert.equal(onboardingDestination({ displayName: 'A', onboarding: null }, store(null)), SIGNED_IN_HOME)
  assert.equal(owesOnboarding({ displayName: 'A' }), false)
  assert.equal(owesOnboarding(done), false)
})

test('a new account opens the record that marks onboarding as owed', () => {
  const record = openOnboardingRecord(1_760_000_000_000)
  assert.deepEqual(record, { openedAt: 1_760_000_000_000 })
  assert.equal(owesOnboarding({ onboarding: record }), true)
})

test('a local flag rescues an account whose completion write has not landed', () => {
  // This browser watched them finish; the profile write is in flight or was
  // rejected. Re-running it would be the same bug pointing the other way.
  assert.equal(onboardingDestination(owed, store('1')), SIGNED_IN_HOME)
})

// ── Until the account answers ──────────────────────────────────────────────

test('a cache or default profile cannot deny completion before the account is read', () => {
  // Before the profile document is read, the profile is a default (no record)
  // or this browser's cache (possibly older than completion elsewhere).
  assert.equal(knownProfile({ displayName: 'A' }, false), null)
  assert.equal(knownProfile(owed, false), null)
  assert.equal(onboardingDestination(knownProfile(owed, false), store(null)), SIGNED_IN_HOME)
})

test('a cached completion is trusted before the account is read', () => {
  assert.equal(knownProfile(done, false), done)
})

test('once the account is read, its record decides', () => {
  assert.equal(knownProfile(owed, true), owed)
  assert.equal(onboardingDestination(knownProfile(owed, true), store(null)), '/onboarding')
  assert.equal(knownProfile(null, true), null)
})

// ── Resuming ───────────────────────────────────────────────────────────────

test('an unfinished account resumes onboarding from the signed-in home', () => {
  assert.equal(resumeOnboardingTarget({ pathname: SIGNED_IN_HOME, profile: owed, loaded: true, storage: store(null) }), '/onboarding')
})

test('resume waits for the account and never fires for a finished or record-less account', () => {
  assert.equal(resumeOnboardingTarget({ pathname: SIGNED_IN_HOME, profile: owed, loaded: false, storage: store(null) }), null)
  assert.equal(resumeOnboardingTarget({ pathname: SIGNED_IN_HOME, profile: done, loaded: true, storage: store(null) }), null)
  assert.equal(resumeOnboardingTarget({ pathname: SIGNED_IN_HOME, profile: { displayName: 'A' }, loaded: true, storage: store(null) }), null)
  assert.equal(resumeOnboardingTarget({ pathname: SIGNED_IN_HOME, profile: owed, loaded: true, storage: store('1') }), null)
})

test('the resume decision is made once per account, and again after a switch', () => {
  assert.equal(resumeDecisionOwed(null, 'uid-a', false), false, 'not before the account has loaded')
  assert.equal(resumeDecisionOwed(null, null, true), false, 'not while signed out')
  assert.equal(resumeDecisionOwed(null, 'uid-a', true), true)
  assert.equal(resumeDecisionOwed('uid-a', 'uid-a', true), false, 'once for the same account')
  assert.equal(resumeDecisionOwed('uid-a', 'uid-b', true), true, 'a switched-to account is decided for')
})

test('the router keys the resume decision to the signed-in account', () => {
  const src = stripComments(read('src/App.jsx'))
  assert.ok(/resumeDecisionOwed\(resumeDecidedForRef\.current, uid, profileLoaded\)/.test(src),
    'the resume effect must ask whether a decision is owed for this account')
  assert.ok(/resumeDecidedForRef\.current = uid\b/.test(src),
    'the decision must be recorded against the account it was made for')
})

test('the sales page and deep links are never re-routed', () => {
  for (const pathname of ['/home', '/create/palette', '/plans', '/settings']) {
    assert.equal(resumeOnboardingTarget({ pathname, profile: owed, loaded: true, storage: store(null) }), null, pathname)
  }
})

test('an unloaded profile never re-runs onboarding', () => {
  // null means "not known yet", which must stay distinct from false. Guessing
  // "not onboarded" during a slow Firestore read would re-run the survey for
  // exactly the established users this bug kept catching — and a brand-new
  // sign-up does not depend on this path at all (App.jsx routes them from the
  // auth event via pendingOnboarding).
  assert.equal(onboardingDestination(null, store(null)), SIGNED_IN_HOME)
  assert.equal(onboardingDestination(undefined, store(null)), SIGNED_IN_HOME)
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
  assert.equal(onboardingDestination(done, hostile), SIGNED_IN_HOME)
})

test('the signed-in home is the User Home, not the sales page', () => {
  // Founder direction, 2026-09-05, approved explicitly: a signed-in visitor
  // who navigates to the site lands on the dashboard, not on the page selling
  // it to them. Onboarding’s exit shares that destination, so it is pinned
  // here rather than left as a literal in five assertions above.
  assert.equal(SIGNED_IN_HOME, '/projects')
  assert.notEqual(SIGNED_IN_HOME, '/home')
})

// ── The wiring ──────────────────────────────────────────────────────────────

test('the router asks the account, not localStorage', () => {
  const src = stripComments(read('src/App.jsx'))
  assert.ok(src.includes('onboardingDestination(knownProfile(userProfile, profileLoaded))'),
    'the / redirect must decide from the profile, and only once the account has answered')
  assert.ok(/resumeOnboardingTarget\(\{[^}]*loaded: profileLoaded/.test(src),
    'the signed-in home must resume onboarding from the loaded account')
  assert.ok(!/localStorage\.getItem\('vs-onboarded'\)/.test(src),
    'App.jsx must not decide onboarding from localStorage alone')
})

test('the profile the app decides from carries the account record', () => {
  // The decision functions read profile.onboarding. If the exposed profile
  // drops it, every decision falls back to this browser's flag.
  const src = stripComments(read('src/contexts/AuthContext.jsx'))
  const exposed = /const userProfile = profile \? \{[\s\S]*?\} : null/.exec(src)?.[0] || ''
  assert.ok(exposed, 'the exposed profile must still be built in one place')
  assert.ok(/onboarding: profile\.onboarding/.test(exposed),
    'the exposed profile must carry the account onboarding record')
  assert.ok(/value=\{\{[\s\S]*?\bprofileLoaded\b[\s\S]*?\}\}/.test(src),
    'the context must say whether the account has answered')
  assert.ok(/setProfileLoaded\(true\)/.test(src), 'a completed read must mark the profile loaded')
})

test('both ways a first profile document is written open the onboarding record', () => {
  const src = stripComments(read('src/contexts/AuthContext.jsx'))
  const signup = /const signup = useCallback\([\s\S]*?\n {2}\}, \[\]\)/.exec(src)?.[0] || ''
  assert.ok(signup, 'signup must still exist')
  assert.ok(/onboarding: openOnboardingRecord\(/.test(signup), 'email sign-up must open the record')
  assert.ok(/const created = plan\.profile/.test(src), 'a first profile document must come from the read plan')
  const plan = planProfileRead({ status: 'missing' }, { displayName: 'A' }, 5)
  assert.deepEqual(plan.profile.onboarding, { openedAt: 5 })
})

// ── Reading the account ─────────────────────────────────────────────────────

const cached = { displayName: 'Cached', bio: '' }

test('a profile document that exists is merged and marks the account loaded', () => {
  const plan = planProfileRead({ status: 'found', data: { displayName: 'Real', onboarding: done.onboarding } }, cached, 5)
  assert.equal(plan.action, 'merge')
  assert.equal(plan.loaded, true)
  assert.equal(plan.profile.displayName, 'Real')
  assert.deepEqual(plan.profile.onboarding, done.onboarding)
})

test('only a read that found no document creates the first one', () => {
  const plan = planProfileRead({ status: 'missing' }, cached, 5)
  assert.equal(plan.action, 'create')
  assert.equal(plan.loaded, true)
  assert.equal(owesOnboarding(plan.profile), true)
  // A profile that already carries a record keeps it rather than reopening it.
  assert.equal(planProfileRead({ status: 'missing' }, done, 5).profile, done)
})

test('a failed read writes nothing, opens no record and leaves the account unknown', () => {
  // Offline, a chunk that did not load, a refused read: the account did not
  // answer. Treating that as "no document" would open onboarding for an
  // established account and write a default profile over its real one.
  for (const read of [{ status: 'failed', code: 'unavailable' }, { status: 'failed' }, null, undefined, { status: 'found' }]) {
    const plan = planProfileRead(read, cached, 5)
    assert.equal(plan.action, 'wait', JSON.stringify(read))
    assert.equal(plan.loaded, false)
    assert.equal(plan.profile, cached)
    assert.equal(plan.profile.onboarding, undefined)
  }
})

test('the profile loader reports a failed read as failed, not as missing', () => {
  const src = stripComments(read('src/contexts/AuthContext.jsx'))
  const loader = /async function loadProfileFromFirestore\([\s\S]*?\n\}/.exec(src)?.[0] || ''
  assert.ok(loader, 'the loader must still exist')
  assert.ok(/catch \(error\) \{\s*return \{ status: 'failed'/.test(loader), 'a thrown read must come back as failed')
  assert.ok(!/return null/.test(loader), 'the loader must not answer null for either case')
  assert.ok(/planProfileRead\(read,/.test(src), 'the provider must decide from the read plan')
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
