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

const RULES_PATH = fileURLToPath(new URL('../../firestore.rules', import.meta.url))
const ALICE = 'alice-uid'
const BOB = 'bob-uid'

let testEnv

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: process.env.GCLOUD_PROJECT || 'demo-uil4b',
    firestore: { rules: await readFile(RULES_PATH, 'utf8') },
  })
})

after(async () => {
  await testEnv?.cleanup()
})

beforeEach(async () => {
  await testEnv.clearFirestore()
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

test('owner can read their own profile and delete their account document', async () => {
  await seedAsServer(ALICE, PROFILE)
  await assertSucceeds(getDoc(userDoc(aliceDb())))
  await assertSucceeds(deleteDoc(userDoc(aliceDb())))
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
