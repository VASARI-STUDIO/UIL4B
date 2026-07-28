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
