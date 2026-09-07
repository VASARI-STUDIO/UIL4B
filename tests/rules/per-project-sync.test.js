// THE RULE PER-PROJECT SYNC NEEDS, PROVED BEFORE IT IS APPROVED.
//
//   npm run test:rules
//
// ═══════════════════════════════════════════════════════════════════════════
// WHY THIS RUNS AGAINST A PATCHED COPY
// ═══════════════════════════════════════════════════════════════════════════
// firestore.rules is founder-gated (docs/reference/human-validation-zones.md)
// and cannot be staged from an agent branch — the auto-mode classifier refuses
// it whether or not a permission is granted. #390 hit the same wall and answered
// it the same way: the exact diff goes in the PR body under FOUNDER APPROVAL
// NEEDED, and the tests that prove it run against a TEMPORARY COPY produced by
// applying the committed patch. The original is read and never written.
//
// So the patch is the single source of truth: a test here cannot pass against a
// rule the patch does not contain, and tests/unit/per-project-sync-rule.test.js
// fails the moment the patch goes stale against firestore.rules.
//
// ═══════════════════════════════════════════════════════════════════════════
// WHAT IS BEING ASKED FOR, AND WHAT IS NOT
// ═══════════════════════════════════════════════════════════════════════════
// `match /users/{userId}/projects/{projectId} { allow read, write: if isOwner() }`
//
// That is the SAME trust boundary the `sync/{docId}` subcollection already has,
// applied to a second subcollection under the same user document. It grants the
// owner nothing they could not already do and grants a stranger nothing at all.
// The billing fields the existing rules lock (lifetimeEntitlement, subscription,
// stripeCustomerId) live on `users/{userId}` itself and are not reachable from a
// subcollection write — which the last test in this file asserts rather than
// assumes, because "it cannot reach the locked fields" is exactly the kind of
// claim that is obviously true right up until the day it is not.
import test, { after, before, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs } from 'firebase/firestore'
import { applyRulesPatchToCopy, RULE_MATCHER } from '../../scripts/per-project-rules-patch.mjs'

const ALICE = 'alice-uid'
const BOB = 'bob-uid'

let testEnv

before(async () => {
  // The patch is the single source of truth: these tests cannot pass against a
  // rule it does not contain, and the applier never writes the gated original.
  const { patched } = await applyRulesPatchToCopy()
  assert.match(patched, RULE_MATCHER,
    'the patch must actually contain the rule these tests are about')
  testEnv = await initializeTestEnvironment({
    projectId: process.env.GCLOUD_PROJECT || 'demo-uil4b',
    firestore: { rules: patched },
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
const anonDb = () => testEnv.unauthenticatedContext().firestore()

const projectDoc = (db, uid, id) => doc(db, 'users', uid, 'projects', id)
const projectsOf = (db, uid) => collection(db, 'users', uid, 'projects')

const RECORD = {
  project: { id: 'p1', name: 'Autumn Rebrand', design: {}, updatedAt: '2026-09-01T00:00:00.000Z' },
  updatedAt: '2026-09-01T00:00:00.000Z',
  deletedAt: null,
  _updatedAt: 1_757_000_000_000,
}

/* ── The owner can do everything the client actually does ─────────────────── */

test('the owner can write, read, list and delete their own project documents', async () => {
  const db = aliceDb()
  await assertSucceeds(setDoc(projectDoc(db, ALICE, 'p1'), RECORD))
  await assertSucceeds(getDoc(projectDoc(db, ALICE, 'p1')))
  // The LIST is separate from the GET and is what readRemoteProjects() does. A
  // rule granting `get` but not `list` would leave every pull empty while every
  // single-document read looked fine.
  await assertSucceeds(getDocs(projectsOf(db, ALICE)))
  await assertSucceeds(deleteDoc(projectDoc(db, ALICE, 'p1')))
})

test('the owner can write a tombstone, which is how a delete propagates', async () => {
  await assertSucceeds(setDoc(projectDoc(aliceDb(), ALICE, 'p1'), {
    project: null, updatedAt: null, deletedAt: '2026-09-06T00:00:00.000Z', _updatedAt: 1,
  }))
})

test('the owner can write a project carrying a 32 KB logo — the case that broke v1', async () => {
  const heavy = {
    ...RECORD,
    project: { ...RECORD.project, design: { brandLogo: `data:image/png;base64,${'A'.repeat(32 * 1024)}` } },
  }
  await assertSucceeds(setDoc(projectDoc(aliceDb(), ALICE, 'p1'), heavy))
})

/* ── Nobody else can ──────────────────────────────────────────────────────── */

test('another signed-in user cannot read, list or write these documents', async () => {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'users', ALICE, 'projects', 'p1'), RECORD)
  })
  const db = bobDb()
  await assertFails(getDoc(projectDoc(db, ALICE, 'p1')))
  await assertFails(getDocs(projectsOf(db, ALICE)))
  await assertFails(setDoc(projectDoc(db, ALICE, 'p2'), RECORD))
  await assertFails(deleteDoc(projectDoc(db, ALICE, 'p1')))
})

test('a signed-out visitor cannot touch them at all', async () => {
  const db = anonDb()
  await assertFails(getDoc(projectDoc(db, ALICE, 'p1')))
  await assertFails(setDoc(projectDoc(db, ALICE, 'p1'), RECORD))
})

/* ── The new subcollection opens no path to the locked fields ─────────────── */

test('a project write cannot reach the billing fields on the parent document', async () => {
  // The escalation the existing rules exist to stop. A subcollection document
  // is a different document, so this ought to be impossible by construction —
  // which is precisely why it is asserted instead of assumed.
  await assertSucceeds(setDoc(projectDoc(aliceDb(), ALICE, 'p1'), {
    ...RECORD,
    lifetimeEntitlement: { active: true, sku: 'uil4b_pro_lifetime' },
  }))
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const parent = await getDoc(doc(ctx.firestore(), 'users', ALICE))
    assert.equal(parent.exists(), false,
      'writing a project must not have created or altered the account document')
  })
  // And the direct route is still closed, unchanged by this patch.
  await assertFails(setDoc(doc(aliceDb(), 'users', ALICE), {
    displayName: 'Alice', lifetimeEntitlement: { active: true },
  }))
})

test('the existing sync document keeps working exactly as before', async () => {
  // The v1 path is what ships until this rule lands, so a patch that broke it
  // would be worse than no patch at all.
  const ref = doc(aliceDb(), 'users', ALICE, 'sync', 'projects')
  await assertSucceeds(setDoc(ref, { list: [], deleted: {}, v: 1 }, { merge: true }))
  await assertSucceeds(getDoc(ref))
  await assertFails(getDoc(doc(bobDb(), 'users', ALICE, 'sync', 'projects')))
})
