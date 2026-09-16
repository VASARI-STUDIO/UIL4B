// Firestore security-rules tests — run against the local Firestore emulator.
//
//   npm run test:rules
//
// These exist for one reason: `users/{uid}.lifetimeEntitlement`,
// `.subscription` and `.stripeCustomerId` decide whether the server hands out
// Pro (api/_lib/plans.js → planForUser). Before this rules change any signed-in
// user could write those onto their own doc and grant themselves Pro. The tests
// below pin BOTH halves of the fix: the locked fields stay server-only, and
// ordinary profile writes (AuthContext.saveProfileToFirestore) keep working.
import test, { after, before, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc, deleteDoc, deleteField } from 'firebase/firestore'
import { fileTextThrough } from '../../scripts/gated-patches.mjs'

const RULES_PATH = fileURLToPath(new URL('../../firestore.rules', import.meta.url))
const ALICE = 'alice-uid'
const BOB = 'bob-uid'

let testEnv
// ── The SECOND environment, and why this file needs one ─────────────────────
//
// Everything above section (d) runs against `firestore.rules` AS PUBLISHED, and
// keeping that is the point: it is the only emulator coverage the file the
// founder is actually serving has.
//
// The moderator role is not in that file. It is founder-gated — the auto-mode
// classifier refuses to stage firestore.rules whether or not permission has
// been granted — so it lives as a committed, unapplied patch that
// `npm run apply:gated` puts in. A test written against the published rules
// could therefore only pass AFTER the founder runs the command, and would be
// red every day until then.
//
// So section (d) gets its own environment, loaded from the PATCHED text the way
// tests/rules/per-project-sync.test.js does. The patch is the single source of
// truth: a test here cannot pass against a rule the patch does not contain, and
// because an already-applied patch is skipped and returns the same text, every
// assertion below holds identically on both sides of the command.
//
// Its OWN projectId, because initializeTestEnvironment loads rules into the
// emulator PER PROJECT ID — two rule sets under one id race, which is exactly
// how the per-project suite lost to this file's live rules on 2026-09-09.
let reviewerEnv

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: process.env.GCLOUD_PROJECT || 'demo-uil4b',
    firestore: { rules: await readFile(RULES_PATH, 'utf8') },
  })

  const patched = await fileTextThrough('moderator-role')
  assert.match(patched, /function isReviewer\(\)/,
    'the patch must actually contain the predicate section (d) is about')
  reviewerEnv = await initializeTestEnvironment({
    projectId: 'demo-uil4b-moderator',
    firestore: { rules: patched },
  })
})

after(async () => {
  await testEnv?.cleanup()
  await reviewerEnv?.cleanup()
})

beforeEach(async () => {
  await testEnv.clearFirestore()
  await reviewerEnv.clearFirestore()
})

const aliceDb = () => testEnv.authenticatedContext(ALICE).firestore()
const bobDb = () => testEnv.authenticatedContext(BOB).firestore()
const userDoc = (db, uid = ALICE) => doc(db, 'users', uid)

// Seeds a doc the way the server does (Admin SDK — bypasses rules).
async function seedAsServer(uid, data) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'users', uid), data, { merge: true })
  })
}

const PROFILE = {
  displayName: 'Alice',
  email: 'alice@example.com',
  photoURL: '',
  location: 'Melbourne, Australia',
  website: 'https://example.com',
  bio: 'Designer',
  company: 'Acme',
  flair: 'founder',
}

const PAID = { active: true, sku: 'uil4b_pro_lifetime', revokedAt: null }

// (a) The owner can still do everything AuthContext actually does.

test('owner can create their profile document', async () => {
  await assertSucceeds(setDoc(userDoc(aliceDb()), PROFILE))
})

test('owner can merge-update ordinary profile fields', async () => {
  await seedAsServer(ALICE, PROFILE)
  await assertSucceeds(
    setDoc(userDoc(aliceDb()), { displayName: 'Alice B', bio: 'New bio' }, { merge: true }),
  )
})

test('owner can write the onboarding answers block', async () => {
  await seedAsServer(ALICE, PROFILE)
  await assertSucceeds(
    setDoc(userDoc(aliceDb()), { onboarding: { role: 'designer', completedAt: 1 } }, { merge: true }),
  )
})

test('owner can read their own profile', async () => {
  await seedAsServer(ALICE, PROFILE)
  await assertSucceeds(getDoc(userDoc(aliceDb())))
})

// ── THE CHARGEBACK WASH ──────────────────────────────────────────────────────
//
// This test used to be its own opposite: "owner can ... delete their account
// document", asserting the delete SUCCEEDED, on the strength of a rules comment
// that said dropping your own profile "can only ever lose you access, never
// grant it". For a subscription that is false. `subscription.accessRevoked` —
// written by the webhook on a refund or chargeback, the only thing keeping that
// customer on Free — lives on this document and nowhere else. It is sticky only
// because every later write is a { merge: true } onto it. Delete the document
// and the next subscription write (a renewal webhook, or one GET of
// /api/checkout-status) rebuilds it without the flag.
//
// Both halves are asserted on the SAME seeded document, so a refused delete and
// a broken emulator cannot be confused: the revocation is still there afterwards
// AND an ordinary profile edit on it still goes through.
test('owner CANNOT delete their own user document, so a revocation cannot be washed', async () => {
  const REVOKED = { id: 'sub_1', status: 'active', accessRevoked: true, accessRevokedReason: 'dispute_created' }
  await seedAsServer(ALICE, { ...PROFILE, subscription: REVOKED })

  await assertFails(deleteDoc(userDoc(aliceDb())))

  // The flag survived the attempt.
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const snap = await getDoc(doc(ctx.firestore(), 'users', ALICE))
    assert.equal(snap.exists(), true, 'the document was deleted despite the refusal')
    assert.equal(snap.data().subscription.accessRevoked, true)
  })

  // Positive control on the same document: the owner is still the owner.
  await assertSucceeds(getDoc(userDoc(aliceDb())))
  await assertSucceeds(setDoc(userDoc(aliceDb()), { bio: 'still mine' }, { merge: true }))
})

test('a delete is refused whether or not the document carries billing state', async () => {
  // The rule is unconditional — it is not "deny when revoked", which a client
  // could not be trusted to evaluate anyway. A plain profile is just as
  // undeletable, so there is no shape of document that reopens the path.
  await seedAsServer(ALICE, PROFILE)
  await assertFails(deleteDoc(userDoc(aliceDb())))
})

test('the owner can still delete inside their sync subcollection', async () => {
  // What the closed rule does NOT touch: the subcollection grants `write`,
  // which includes delete, and the client's sync path relies on it.
  const ref = doc(aliceDb(), 'users', ALICE, 'sync', 'data')
  await assertSucceeds(setDoc(ref, { projects: [] }))
  await assertSucceeds(deleteDoc(ref))
})

test('owner can still read and write their sync subcollection', async () => {
  const ref = doc(aliceDb(), 'users', ALICE, 'sync', 'data')
  await assertSucceeds(setDoc(ref, { projects: [] }, { merge: true }))
  await assertSucceeds(getDoc(ref))
})

test('a server-written entitlement survives an ordinary profile update', async () => {
  await seedAsServer(ALICE, { ...PROFILE, lifetimeEntitlement: PAID })
  await assertSucceeds(setDoc(userDoc(aliceDb()), { bio: 'Edited' }, { merge: true }))
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const snap = await getDoc(doc(ctx.firestore(), 'users', ALICE))
    assert.equal(snap.data().lifetimeEntitlement.active, true)
    assert.equal(snap.data().bio, 'Edited')
  })
})

// (b) The privilege-escalation path is closed — on create AND on update.

for (const [field, value] of [
  ['lifetimeEntitlement', PAID],
  ['subscription', { status: 'active', id: 'sub_fake' }],
  ['stripeCustomerId', 'cus_attacker'],
]) {
  test(`owner CANNOT smuggle ${field} in on document creation`, async () => {
    await assertFails(setDoc(userDoc(aliceDb()), { ...PROFILE, [field]: value }))
  })

  test(`owner CANNOT add ${field} on update`, async () => {
    await seedAsServer(ALICE, PROFILE)
    await assertFails(setDoc(userDoc(aliceDb()), { [field]: value }, { merge: true }))
  })

  test(`owner CANNOT overwrite a server-written ${field}`, async () => {
    await seedAsServer(ALICE, { ...PROFILE, [field]: value })
    await assertFails(
      setDoc(userDoc(aliceDb()), { [field]: 'tampered' }, { merge: true }),
    )
  })

  test(`owner CANNOT delete a server-written ${field}`, async () => {
    await seedAsServer(ALICE, { ...PROFILE, [field]: value })
    await assertFails(setDoc(userDoc(aliceDb()), { [field]: deleteField() }, { merge: true }))
  })

  test(`owner CANNOT wipe ${field} with a non-merge overwrite`, async () => {
    await seedAsServer(ALICE, { ...PROFILE, [field]: value })
    await assertFails(setDoc(userDoc(aliceDb()), PROFILE))
  })
}

test('a revoked (refunded) entitlement cannot be re-activated by the client', async () => {
  await seedAsServer(ALICE, {
    ...PROFILE,
    lifetimeEntitlement: { ...PAID, active: false, revokedAt: 1, revokedReason: 'full_refund' },
  })
  await assertFails(
    setDoc(userDoc(aliceDb()), { lifetimeEntitlement: PAID }, { merge: true }),
  )
})

// (c) Cross-user access stays closed.

test('a signed-in user cannot read, write or delete another user document', async () => {
  await seedAsServer(ALICE, { ...PROFILE, lifetimeEntitlement: PAID })
  await assertFails(getDoc(userDoc(bobDb(), ALICE)))
  await assertFails(setDoc(userDoc(bobDb(), ALICE), { bio: 'hacked' }, { merge: true }))
  await assertFails(deleteDoc(userDoc(bobDb(), ALICE)))
  await assertFails(getDoc(doc(bobDb(), 'users', ALICE, 'sync', 'data')))
})

test('an unauthenticated client cannot read or write any user document', async () => {
  await seedAsServer(ALICE, PROFILE)
  const anon = testEnv.unauthenticatedContext().firestore()
  await assertFails(getDoc(userDoc(anon)))
  await assertFails(setDoc(userDoc(anon), PROFILE))
})

// (d) The community review queue.
//
// Gradients already published here; palettes and designs were written to
// localStorage and nowhere else, so a palette submitted on a phone was
// invisible on a laptop AND no reviewer ever saw it. Routing them through this
// collection only helps if the rules actually accept those kinds — and only if
// they still refuse a client that tries to approve its own work. Both halves
// are pinned below, because "the rules do not mention `kind`" is an argument,
// not a test.

const QUEUE = 'community-submissions'
const submissionDoc = (db, id) => doc(db, QUEUE, id)

function submission(overrides = {}) {
  return {
    kind: 'palette',
    name: 'Harbour Dusk',
    authorUid: ALICE,
    authorName: 'Alice',
    status: 'pending',
    payload: { colors: ['#0F172A', '#38BDF8'] },
    createdAt: '2026-09-01T00:00:00.000Z',
    ...overrides,
  }
}

async function seedSubmission(id, data) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), QUEUE, id), data)
  })
}

for (const kind of ['gradient', 'design', 'palette']) {
  test(`an author can queue a ${kind} submission for review`, async () => {
    await assertSucceeds(
      setDoc(submissionDoc(aliceDb(), `s-${kind}`), submission({ kind })),
    )
  })

  test(`a ${kind} submission cannot be created already approved`, async () => {
    // 'approved' is a reviewer's word. If a client could write it, anything
    // could put itself straight into the public library.
    await assertFails(
      setDoc(submissionDoc(aliceDb(), `bad-${kind}`), submission({ kind, status: 'approved' })),
    )
  })
}

test('a submission cannot be created under someone else\'s name', async () => {
  await assertFails(
    setDoc(submissionDoc(bobDb(), 'forged'), submission({ authorUid: ALICE })),
  )
})

test('a signed-out client cannot queue anything', async () => {
  const anon = testEnv.unauthenticatedContext().firestore()
  await assertFails(setDoc(submissionDoc(anon, 'anon'), submission()))
})

test('a signed-in user can read the queue, which is how their own list loads', async () => {
  // listMySubmissions(uid, kind) is the read behind "my submissions" — without
  // this the account copy never arrives and the merge has nothing to merge.
  await seedSubmission('readable', submission())
  await assertSucceeds(getDoc(submissionDoc(aliceDb(), 'readable')))
})

test('an author cannot promote their own pending submission', async () => {
  await seedSubmission('mine', submission())
  await assertFails(
    setDoc(submissionDoc(aliceDb(), 'mine'), submission({ status: 'approved' })),
  )
})

test('an author can withdraw and delete their own submission', async () => {
  await seedSubmission('mine', submission())
  await assertSucceeds(
    setDoc(submissionDoc(aliceDb(), 'mine'), submission({ status: 'withdrawn' })),
  )
  await assertSucceeds(deleteDoc(submissionDoc(aliceDb(), 'mine')))
})

test('a stranger can neither moderate nor delete a submission', async () => {
  await seedSubmission('mine', submission())
  await assertFails(
    setDoc(submissionDoc(bobDb(), 'mine'), submission({ status: 'approved' })),
  )
  await assertFails(deleteDoc(submissionDoc(bobDb(), 'mine')))
})

test('a reviewer with the admin claim can approve', async () => {
  // The claim api/verify-admin.js grants. Nothing granted it before, so every
  // moderation write used to be rejected.
  const adminDb = testEnv.authenticatedContext('admin-uid', { admin: true }).firestore()
  await seedSubmission('mine', submission())
  await assertSucceeds(
    setDoc(submissionDoc(adminDb, 'mine'), submission({ status: 'approved' })),
  )
})

// ── (e) The moderator role — AGAINST THE PATCHED RULES ──────────────────────
//
// Everything from here down runs on `reviewerEnv`, not `testEnv`. See the note
// beside its declaration: the moderator role is a founder-gated patch, so these
// exercise the rules the founder is being asked to publish rather than the ones
// already published, and they pass identically once he has published them.
//
// The founder's [community-backend] decision is that nothing publishes until it
// is approved, chosen on liability grounds because he is a solo developer. That
// is only affordable if approving is not a one-person job. `isReviewer()` is
// what makes the second person possible, and these tests are the whole
// difference between a role that works and a role that is decoration.
//
// EVERY "cannot" below is paired with a "can" on the SAME seeded document. A
// refused read and a document that was never written look identical from the
// client, so a denial asserted on its own proves nothing — it would pass just
// as happily against a broken fixture, which is the exact class of bug this
// whole item exists to fix.

const MOD = 'mod-uid'
const modDb = () => reviewerEnv.authenticatedContext(MOD, { moderator: true, email_verified: true }).firestore()
const founderDb = () => reviewerEnv.authenticatedContext('founder-uid', { admin: true, email_verified: true }).firestore()
const revAliceDb = () => reviewerEnv.authenticatedContext(ALICE).firestore()
const revBobDb = () => reviewerEnv.authenticatedContext(BOB).firestore()
const revAnonDb = () => reviewerEnv.unauthenticatedContext().firestore()

/** Seed past the rules, the way the Admin SDK does. */
async function seedReviewer(segments, data) {
  await reviewerEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), ...segments), data)
  })
}

const FEEDBACK = 'feedback'
const feedbackDoc = (db, id) => doc(db, FEEDBACK, id)

function report(overrides = {}) {
  return {
    type: 'bug',
    subject: 'The export button does nothing',
    message: 'Clicked export on a palette and no file arrived.',
    email: 'reporter@example.com',
    status: 'new',
    createdAt: '2026-09-01T00:00:00.000Z',
    ...overrides,
  }
}

const PROMPTS = 'community-prompts'
const promptDoc = (db, id) => doc(db, PROMPTS, id)

function prompt(overrides = {}) {
  return {
    authorUid: ALICE,
    title: 'A brief for a dashboard',
    text: 'Design a dense admin table.',
    tags: 'ui, dashboard',
    authorName: 'Alice',
    profileLink: null,
    status: 'pending',
    createdAt: '2026-09-01T00:00:00.000Z',
    ...overrides,
  }
}

const revSubmissionDoc = (db, id) => doc(db, QUEUE, id)

// ── feedback ────────────────────────────────────────────────────────────────

test('a moderator can read a feedback report, and a plain user cannot', async () => {
  await seedReviewer([FEEDBACK, 'r1'], report())
  // POSITIVE CONTROL FIRST. If this fails, the document is not there and the
  // denial below would be meaningless.
  const seen = await assertSucceeds(getDoc(feedbackDoc(modDb(), 'r1')))
  assert.equal(seen.exists(), true, 'the control read returned no document')
  assert.equal(seen.data().subject, 'The export button does nothing')

  await assertFails(getDoc(feedbackDoc(revAliceDb(), 'r1')))
  await assertFails(getDoc(feedbackDoc(revAnonDb(), 'r1')))
})

test('a moderator can triage a report, and a plain user cannot', async () => {
  await seedReviewer([FEEDBACK, 'r2'], report())
  await assertSucceeds(
    setDoc(feedbackDoc(modDb(), 'r2'), { status: 'done', reviewedBy: MOD }, { merge: true }),
  )
  // The write landed — proving the "succeeds" above was a real write and not a
  // no-op the emulator waved through.
  await reviewerEnv.withSecurityRulesDisabled(async (ctx) => {
    const snap = await getDoc(doc(ctx.firestore(), FEEDBACK, 'r2'))
    assert.equal(snap.data().status, 'done')
    assert.equal(snap.data().reviewedBy, MOD)
  })

  await assertFails(
    setDoc(feedbackDoc(revAliceDb(), 'r2'), { status: 'new' }, { merge: true }),
  )
})

test('a moderator can delete a report, and a plain user cannot', async () => {
  await seedReviewer([FEEDBACK, 'r3'], report())
  await assertFails(deleteDoc(feedbackDoc(revAliceDb(), 'r3')))
  // Control: the document survived the refused delete and is still deletable by
  // somebody who is allowed to. Without this, a delete that failed for any
  // other reason would read as "the rule worked".
  await assertSucceeds(deleteDoc(feedbackDoc(modDb(), 'r3')))
})

// ── community prompts ───────────────────────────────────────────────────────

test('a moderator can approve and delete a community prompt, a plain user cannot', async () => {
  await seedReviewer([PROMPTS, 'p1'], prompt())
  await assertFails(setDoc(promptDoc(revBobDb(), 'p1'), prompt({ status: 'approved' })))
  await assertSucceeds(setDoc(promptDoc(modDb(), 'p1'), prompt({ status: 'approved' })))

  await seedReviewer([PROMPTS, 'p2'], prompt())
  await assertFails(deleteDoc(promptDoc(revBobDb(), 'p2')))
  await assertSucceeds(deleteDoc(promptDoc(modDb(), 'p2')))
})

// ── community submissions ───────────────────────────────────────────────────

test('a moderator can approve a submission, and a stranger still cannot', async () => {
  await seedReviewer([QUEUE, 'm1'], submission())
  await assertFails(setDoc(revSubmissionDoc(revBobDb(), 'm1'), submission({ status: 'approved' })))
  await assertSucceeds(setDoc(revSubmissionDoc(modDb(), 'm1'), submission({ status: 'approved' })))
  await reviewerEnv.withSecurityRulesDisabled(async (ctx) => {
    const snap = await getDoc(doc(ctx.firestore(), QUEUE, 'm1'))
    assert.equal(snap.data().status, 'approved', 'the approval did not actually land')
  })
})

test('a moderator can delete a submission, and a stranger still cannot', async () => {
  await seedReviewer([QUEUE, 'm2'], submission())
  await assertFails(deleteDoc(revSubmissionDoc(revBobDb(), 'm2')))
  await assertSucceeds(deleteDoc(revSubmissionDoc(modDb(), 'm2')))
})

test('the founder keeps every permission the moderator just gained', async () => {
  // isReviewer() replaced isAdmin(). If the admin arm of that OR were dropped,
  // every test above would still pass and the founder would be locked out of
  // his own queue.
  await seedReviewer([FEEDBACK, 'f1'], report())
  await assertSucceeds(getDoc(feedbackDoc(founderDb(), 'f1')))
  await assertSucceeds(setDoc(feedbackDoc(founderDb(), 'f1'), { status: 'done' }, { merge: true }))
  await seedReviewer([QUEUE, 'f2'], submission())
  await assertSucceeds(setDoc(revSubmissionDoc(founderDb(), 'f2'), submission({ status: 'approved' })))
  await assertSucceeds(deleteDoc(revSubmissionDoc(founderDb(), 'f2')))
})

// ── The role cannot spread, and does not leak sideways ──────────────────────

test('NOBODY can reach the moderator roster from a browser — not even a moderator', async () => {
  // The roster has no rules block at all, and that is the security property
  // rather than an omission: Firestore denies by default, so the list of people
  // worth phishing is unreadable, and no client can write itself onto it.
  // Only the Admin SDK touches it, and the Admin SDK bypasses rules entirely.
  await seedReviewer(['moderators', MOD], { uid: MOD, grantedByUid: 'founder-uid' })
  // Control: the document really is there — so these are refusals, not misses.
  await reviewerEnv.withSecurityRulesDisabled(async (ctx) => {
    const snap = await getDoc(doc(ctx.firestore(), 'moderators', MOD))
    assert.equal(snap.exists(), true, 'the roster fixture was never written')
  })

  for (const [who, db] of [['a moderator', modDb()], ['the founder', founderDb()], ['a plain user', revAliceDb()]]) {
    await assertFails(getDoc(doc(db, 'moderators', MOD)), `${who} could read the roster`)
    await assertFails(setDoc(doc(db, 'moderators', 'self-appointed'), { uid: 'x' }), `${who} could write the roster`)
  }
})

test('a moderator CANNOT appoint another moderator by writing a claim-shaped doc', async () => {
  // The self-replication guard, at the data layer. canAssignModerators() is
  // founder-only in src/utils/moderation.js and api/verify-admin.js refuses the
  // action with a 403 — this pins the third and last way it could be attempted.
  await assertFails(setDoc(doc(modDb(), 'moderators', BOB), { uid: BOB, moderator: true }))
})

test('being a moderator does not widen anything outside the review queues', async () => {
  // isReviewer() was added for three collections. A moderator is still an
  // ordinary user everywhere else, and this is what catches a future edit that
  // reaches for the convenient helper in the wrong match block.
  await seedReviewer(['users', ALICE], PROFILE)
  await assertFails(getDoc(doc(modDb(), 'users', ALICE)))
  await assertFails(setDoc(doc(modDb(), 'users', ALICE), { bio: 'edited' }, { merge: true }))
  // Control: the owner can still read it, so the refusals above are about the
  // rule and not about a document that is missing.
  await assertSucceeds(getDoc(doc(revAliceDb(), 'users', ALICE)))

  await seedReviewer(['analytics-daily', '2026-09-06'], { day: '2026-09-06', views: 3 })
  await assertFails(getDoc(doc(modDb(), 'analytics-daily', '2026-09-06')))
})

test('a moderator still cannot grant themselves Pro', async () => {
  // The reason tests/rules exists at all. The moderator claim must not become a
  // side door into the entitlement fields the server reads to hand out Pro.
  const ref = doc(modDb(), 'users', MOD)
  await assertFails(setDoc(ref, { ...PROFILE, lifetimeEntitlement: PAID }))
  await assertFails(setDoc(ref, { ...PROFILE, subscription: { status: 'active' } }))
  // Control: an ordinary profile write by the same account still works, so the
  // failures above are the locked fields and not a blanket denial.
  await assertSucceeds(setDoc(ref, PROFILE))
})

test('the rules honour the claim without asking whether the email is verified', async () => {
  // NOT A COMPLAINT ABOUT THE RULE — a statement of where the verified-email
  // requirement actually has to live.
  //
  // roleFromClaims() refuses any role above `user` on an unverified account, in
  // BOTH copies (src/utils/moderation.js and api/_lib/moderators.js). A Firestore
  // rule has no such notion and this one does not try: `isReviewer()` reads the
  // raw claim. So a `moderator` claim minted onto an unverified account would
  // produce the worst possible split — every JavaScript surface calls them a
  // plain user while Firestore lets them empty the queue.
  //
  // The only place that can close that is the mint site, which is why
  // api/verify-admin.js refuses to grant the role to an unverified account, and
  // why tests/unit/moderation-role.test.js pins that refusal. This test is the
  // other half of that argument: it proves the rules really do not check.
  const unverified = reviewerEnv.authenticatedContext('unverified-uid', {
    moderator: true, email_verified: false,
  }).firestore()
  await seedReviewer([QUEUE, 'u1'], submission())
  await assertSucceeds(setDoc(revSubmissionDoc(unverified, 'u1'), submission({ status: 'approved' })))
})

// ── provider-health: the server's own counter, unreachable from every client ──
//
// api/ai.js counts every generate-prompt outcome into provider-health/{day}
// through the Admin SDK, and relies on ONE property of this file for that
// collection to be operator-only: the name appears nowhere in it, and the
// rules default-deny anything they do not match. tests/unit/ai-provider-
// path.test.js keeps the one-line absence check; THIS is the behavioural half,
// on the emulator, and it is also what a future rules edit that names the
// collection would have to get past. Each refusal sits beside a success on the
// same client so a broken emulator cannot pass it.

const HEALTH = 'provider-health'
const healthDoc = (db, id = '2026-09-08') => doc(db, HEALTH, id)

async function seedHealth(id, data) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), HEALTH, id), data)
  })
}

test('provider-health: a signed-in user can neither read nor write the counter', async () => {
  await seedHealth('2026-09-08', { openrouterOk: 4, openrouterFail: 1 })
  await assertFails(getDoc(healthDoc(aliceDb())))
  await assertFails(setDoc(healthDoc(aliceDb()), { openrouterOk: 999 }))
  await assertFails(setDoc(healthDoc(aliceDb()), { openrouterFail: 0 }, { merge: true }))
  await assertFails(deleteDoc(healthDoc(aliceDb())))
  // The once-a-day alert marker lives in the same collection.
  await assertFails(setDoc(healthDoc(aliceDb(), 'alert-2026-09-08'), { at: 'now' }))
  // Positive control: the same client, the same environment, a document the
  // rules DO grant — so the refusals above are the rules and not the emulator.
  await assertSucceeds(setDoc(userDoc(aliceDb()), PROFILE))
})

test('provider-health: an anonymous client is refused too', async () => {
  await seedHealth('2026-09-08', { openrouterOk: 4 })
  const anon = testEnv.unauthenticatedContext().firestore()
  await assertFails(getDoc(healthDoc(anon)))
  await assertFails(setDoc(healthDoc(anon), { openrouterOk: 999 }))
})

test('provider-health: even the admin claim does not reach it — only the Admin SDK does', async () => {
  // The claim api/verify-admin.js grants opens community moderation, not this.
  // A client-side admin page reads the verdict through /api/ai?diag=1, which
  // is the Admin SDK on the server; nothing in the browser touches the counter.
  await seedHealth('2026-09-08', { openrouterOk: 4 })
  const admin = testEnv.authenticatedContext('admin-uid', { admin: true }).firestore()
  await assertFails(getDoc(healthDoc(admin)))
  await assertFails(setDoc(healthDoc(admin), { openrouterOk: 0 }))
  // ...while the seed itself is readable with the rules off, which is the
  // server's path and proves the document exists to be refused.
  let seen
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    seen = (await getDoc(doc(ctx.firestore(), HEALTH, '2026-09-08'))).data()
  })
  assert.equal(seen.openrouterOk, 4)
})
