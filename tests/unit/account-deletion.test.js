// Account deletion is irreversible and it spends someone's money. Every test
// here is a refusal rule.
//
// The audit (2026-08-12 account lifecycle audit § A1-A3) found three
// failures in the old client-side path:
//
//   A1  It never called Stripe, so a Pro user who deleted their account kept
//       being charged — and the billing portal needs an ID token they could
//       never mint again. Support email or chargeback were the only outs.
//   A2  It deleted users/{uid} alone. Firestore does not remove subcollections
//       with their parent, so users/{uid}/sync/data — every synced project —
//       survived a dialog that said "and all associated data".
//   A3  It skipped reauthentication for Google accounts, then called
//       deleteUser(), which throws requires-recent-login. Deletion simply did
//       not work for the primary sign-in method.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  isReauthFresh, customerOwnershipVerdict, mayProceedWithDeletion, liveSubscriptions,
  REAUTH_WINDOW_MS,
} from '../../api/_lib/accountDeletion.js'

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8')
const stripComments = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^\s*\/\/.*$/gm, ' ')

const NOW = Date.UTC(2026, 7, 12, 12, 0, 0)

// ── Freshness of the login ──────────────────────────────────────────────────

test('a login inside the window is fresh, one outside it is not', () => {
  assert.equal(isReauthFresh(NOW - 60_000, NOW), true)
  assert.equal(isReauthFresh(NOW - REAUTH_WINDOW_MS + 1, NOW), true)
  assert.equal(isReauthFresh(NOW - REAUTH_WINDOW_MS - 1, NOW), false)
})

test('the window is shorter than a Firebase ID token lives', () => {
  // The whole point: tokens are valid for an hour, so "has a valid token" is
  // not the same as "is sitting at the keyboard right now".
  assert.ok(REAUTH_WINDOW_MS < 60 * 60 * 1000)
})

test('a missing or malformed auth_time is never fresh', () => {
  for (const bad of [undefined, null, 0, NaN, Infinity, -1, 'now']) {
    assert.equal(isReauthFresh(bad, NOW), false, `${String(bad)} must not count as a fresh login`)
  }
})

test('a token from the future is a clock problem, not a fresh login', () => {
  // Treating a future auth_time as fresh would make the window bypassable by
  // anything that could nudge the claim forward.
  assert.equal(isReauthFresh(NOW + 60_000, NOW), false)
})

// ── Ownership of the Stripe customer ────────────────────────────────────────

const customer = (over) => ({ metadata: { firebaseUid: 'uid-1' }, ...over })

test('a customer whose metadata names this uid is ours', () => {
  assert.equal(customerOwnershipVerdict(customer(), 'uid-1'), 'ok')
  assert.equal(mayProceedWithDeletion('ok'), true)
})

test("a customer naming someone ELSE's uid is refused", () => {
  // This is the attack the check exists for: stripeCustomerId was
  // client-writable until the firestore.rules lock, so a tampered id could
  // cancel a stranger's subscription.
  const verdict = customerOwnershipVerdict(customer({ metadata: { firebaseUid: 'uid-2' } }), 'uid-1')
  assert.equal(verdict, 'uid_mismatch')
  assert.equal(mayProceedWithDeletion(verdict), false)
})

test('a customer with no firebaseUid metadata is refused, not assumed', () => {
  // Each of these is a customer that exists but cannot prove whose it is.
  const noProof = [
    { id: 'cus_1' },                              // no metadata object at all
    { id: 'cus_1', metadata: {} },                // metadata, but empty
    { id: 'cus_1', metadata: { firebaseUid: '' } },   // present and blank
    { id: 'cus_1', metadata: { firebaseUid: null } },
  ]
  for (const c of noProof) {
    const verdict = customerOwnershipVerdict(c, 'uid-1')
    assert.equal(verdict, 'missing_metadata', `${JSON.stringify(c)} must not read as owned`)
    assert.equal(mayProceedWithDeletion(verdict), false,
      'a legacy or hand-made Stripe customer must be a support case, not a guess')
  }
})

test('an already-deleted customer proceeds, because there is nothing left to bill', () => {
  const verdict = customerOwnershipVerdict({ deleted: true }, 'uid-1')
  assert.equal(verdict, 'customer_deleted')
  assert.equal(mayProceedWithDeletion(verdict), true,
    'refusing here would block deletion forever over a customer that cannot be charged')
})

test('a missing customer is refused', () => {
  assert.equal(mayProceedWithDeletion(customerOwnershipVerdict(null, 'uid-1')), false)
})

// ── Which subscriptions must be cancelled ───────────────────────────────────

test('every status that can still bill is cancelled', () => {
  // trialing bills at the end of the trial; past_due and unpaid resume the
  // moment a card works. Cancelling only `active` would leave all three
  // charging an account that no longer exists.
  const subs = ['active', 'trialing', 'past_due', 'unpaid', 'paused', 'incomplete']
    .map((status, i) => ({ id: `sub_${i}`, status }))
  assert.deepEqual(liveSubscriptions(subs).map((s) => s.status), subs.map((s) => s.status))
})

test('statuses that can never bill again are left alone', () => {
  const subs = [
    { id: 'a', status: 'canceled' },
    { id: 'b', status: 'incomplete_expired' },
    { id: 'c', status: 'active' },
  ]
  assert.deepEqual(liveSubscriptions(subs).map((s) => s.id), ['c'])
})

test('a customer with several subscriptions has all of them cancelled', () => {
  const subs = [
    { id: 'a', status: 'active' },
    { id: 'b', status: 'trialing' },
    { id: 'c', status: 'canceled' },
  ]
  assert.equal(liveSubscriptions(subs).length, 2)
})

test('a junk subscriptions list is empty, not a crash', () => {
  for (const junk of [null, undefined, 'nope', 42, [null, undefined]]) {
    assert.deepEqual(liveSubscriptions(junk), [])
  }
})

// ── A1: billing is cancelled, and a failure aborts the deletion ─────────────

test('billing is cancelled BEFORE any data is deleted, and a failure aborts', () => {
  // Order is the entire safety property. Deleting an account we are still
  // billing is the worst outcome available here; leaving it intact so the user
  // can retry is recoverable.
  const src = stripComments(read('api/delete-account.js'))
  const billingAt = src.indexOf('cancelBilling')
  const recursiveAt = src.indexOf('recursiveDelete')
  const authDeleteAt = src.indexOf('deleteUser(uid)')
  assert.ok(billingAt > -1 && recursiveAt > -1 && authDeleteAt > -1,
    'all three stages must be present')
  assert.ok(billingAt < recursiveAt, 'billing must be cancelled before data is deleted')
  assert.ok(recursiveAt < authDeleteAt,
    'the auth user must be deleted LAST, or a later failure orphans data with no token left to retry')
})

// ── A2: the data actually goes ─────────────────────────────────────────────

test('deletion reaches every store that holds personal data', () => {
  const src = read('api/delete-account.js')
  // recursiveDelete is what takes users/{uid}/sync/data — the subcollection the
  // old client-side deleteDoc could not touch, and the one holding every synced
  // project, prompt and design.
  assert.ok(src.includes('recursiveDelete'), 'the sync subcollection must be deleted with the profile')
  assert.ok(src.includes("collection('community-prompts')"), 'community prompts carry authorUid')
  assert.ok(src.includes("collection('community-submissions')"),
    'community submissions carry authorUid and authorName (utils/communityQueue.js) and were missed until 2026-09-06')
  assert.ok(src.includes("collection('feedback')"), 'feedback carries the email they typed')
  assert.ok(src.includes('community-media/'), 'uploaded media is personal data too')
  assert.ok(src.includes("collection('daily-usage')"), 'AI usage counters are keyed by uid')
})

test('every collection whose rules key on authorUid is reached by the cascade', () => {
  // DERIVED, not listed. `community-submissions` was added to firestore.rules
  // with an authorUid ownership rule and never added to the delete — a
  // hand-maintained list in the test above would have been just as blind. So
  // the set of collections that store a uid is read off the rules file: any
  // `match /<collection>/{...}` block whose body mentions authorUid is a
  // collection this endpoint has to sweep, today and for the next one.
  const rules = read('firestore.rules')
  const src = read('api/delete-account.js')
  const owned = []
  // A block ends at a `}` indented exactly four spaces — nested function and
  // subcollection bodies close deeper, so the lazy match cannot stop early.
  const blocks = rules.matchAll(/match \/([a-z-]+)\/\{[^}]+\}\s*\{([\s\S]*?)\n {4}\}/g)
  for (const [, name, body] of blocks) {
    if (/authorUid/.test(body)) owned.push(name)
  }
  assert.ok(owned.includes('community-prompts') && owned.includes('community-submissions'),
    `the rules parser found ${JSON.stringify(owned)} — it has stopped seeing the collections it is meant to`)
  const missed = owned.filter((name) => !src.includes(`collection('${name}')`))
  assert.deepEqual(missed, [],
    `firestore.rules keys these collections on authorUid and api/delete-account.js never deletes from them: ${missed.join(', ')}`)
})

test('the usage-counter prefix range has two DIFFERENT bounds', () => {
  // An equal-bounds range is empty: it deletes nothing and truthfully reports
  // 0. The upper bound is , which as a literal character is invisible in
  // an editor — so this asserts the ESCAPE is present in the source, where a
  // reviewer can actually see it.
  const src = read('api/delete-account.js')
  assert.ok(/\\uf8ff/.test(src),
    'the exclusive upper bound must be written as the escape \\uf8ff, not pasted as the raw character')
  assert.ok(!/doc\(`\$\{uid\}_`\)/.test(src),
    'the raw U+F8FF character must not appear in the source — it reads as identical bounds')
})

test('the client no longer deletes anything directly', () => {
  // If AuthContext still called deleteUser/deleteDoc, the old partial deletion
  // would race the new complete one.
  const src = stripComments(read('src/contexts/AuthContext.jsx'))
  assert.ok(src.includes('/api/delete-account'), 'deletion must go through the endpoint')
  assert.ok(!/\bdeleteUser\s*\(/.test(src), 'the client must not delete the auth user itself')
  assert.ok(!/\bdeleteDoc\s*\(/.test(src), 'the client must not delete the user document itself')
})

// ── A3: it works for Google accounts ───────────────────────────────────────

test('Google accounts are reauthenticated with a popup, not asked for a password', () => {
  const src = stripComments(read('src/contexts/AuthContext.jsx'))
  assert.ok(src.includes('reauthenticateWithPopup'),
    'a Google-only account has no password to reauthenticate with')
})

test('an account with BOTH providers can still use its password', () => {
  // isGoogleOnlyAccount must require google.com AND the absence of password —
  // testing only for google.com would push a linked account into the popup
  // flow unnecessarily.
  const src = stripComments(read('src/contexts/AuthContext.jsx'))
  const fn = /const isGoogleOnlyAccount[\s\S]{0,320}/.exec(src)?.[0] || ''
  assert.ok(fn.includes("includes('google.com')") && fn.includes("includes('password')"),
    'google-only must be defined as has-google AND not-has-password')
})

test('the deletion dialog maps auth errors to English', () => {
  // Only auth/wrong-password was ever mapped, so every other failure — starting
  // with the one Google accounts hit every single time — reached the user as
  // "Firebase: Error (auth/requires-recent-login)."
  const src = read('src/pages/Settings.jsx')
  for (const code of ['auth/requires-recent-login', 'auth/popup-closed-by-user', 'reauth-required']) {
    assert.ok(src.includes(code), `${code} must be mapped to a readable message`)
  }
})

test('the dialog no longer claims something the code does not do', () => {
  // Settings said "Permanently delete your account and all associated data",
  // which was false while the sync subcollection survived. Now that the
  // endpoint really does delete it, the copy has to say what else happens —
  // specifically that the subscription ends.
  const src = read('src/pages/Settings.jsx')
  assert.ok(/subscription is cancelled immediately/.test(src),
    'a Pro user must be told their subscription ends, since that is now true')
})

// ── The function budget ────────────────────────────────────────────────────

test('the API stays within the 12-function Vercel limit', () => {
  // delete-account.js takes it to exactly 12. The next endpoint added has to
  // replace one, and this test is where that gets noticed.
  const routes = fs.readdirSync(path.join(process.cwd(), 'api'))
    .filter((f) => f.endsWith('.js') && !f.startsWith('_'))
  assert.ok(routes.length <= 12,
    `api/ has ${routes.length} deployed functions: ${routes.join(', ')} — the Vercel plan allows 12`)
  assert.ok(routes.includes('delete-account.js'))
})
