// Read rules for the two community collections — run against the Firestore
// emulator.
//
//   npm run test:rules
//
// `community-prompts` and `community-submissions` used to be readable by every
// signed-in user whatever the item's status, so anyone with an account could
// read pending, rejected and withdrawn submissions (names, text, links,
// uploaded-media URLs) before a reviewer had looked at them.
//
// The rule now reads: reviewers read everything; the author reads their own;
// any other signed-in user reads APPROVED items only; signed-out clients read
// nothing. Firestore rules are not filters, so each case is tested twice: as a
// single-document get, and as the list query the client really runs (a list
// query not constrained to the rule is refused outright, whatever it would
// have returned).
//
// Every refusal sits beside a success on the same document or collection, so a
// rules file that refuses everything cannot pass this suite.
import test, { after, before, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from '@firebase/rules-unit-testing'
import { collection, doc, getDoc, getDocs, orderBy, query, setDoc, where } from 'firebase/firestore'

const RULES_PATH = fileURLToPath(new URL('../../firestore.rules', import.meta.url))
const ALICE = 'alice-uid'
const BOB = 'bob-uid'
const MOD = 'mod-uid'
const ADMIN = 'admin-uid'

let testEnv

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-uil4b-community-read',
    firestore: { rules: await readFile(RULES_PATH, 'utf8') },
  })
})

after(async () => { await testEnv?.cleanup() })
beforeEach(async () => { await testEnv.clearFirestore() })

const aliceDb = () => testEnv.authenticatedContext(ALICE).firestore()
const bobDb = () => testEnv.authenticatedContext(BOB).firestore()
const modDb = () => testEnv.authenticatedContext(MOD, { moderator: true }).firestore()
const adminDb = () => testEnv.authenticatedContext(ADMIN, { admin: true }).firestore()
const anonDb = () => testEnv.unauthenticatedContext().firestore()

const PROMPTS = 'community-prompts'
const QUEUE = 'community-submissions'

const prompt = (status, authorUid = ALICE) => ({
  title: `A ${status} prompt`,
  text: 'Design a dense admin table.',
  tags: 'ui, dashboard',
  authorName: 'Alice',
  authorUid,
  profileLink: null,
  status,
  createdAt: '2026-09-01T00:00:00.000Z',
})

const submission = (status, authorUid = ALICE) => ({
  kind: 'palette',
  name: `A ${status} palette`,
  authorUid,
  authorName: 'Alice',
  status,
  payload: { colors: ['#0F172A', '#38BDF8'] },
  createdAt: '2026-09-01T00:00:00.000Z',
})

async function seed(coll, id, data) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), coll, id), data)
  })
}

const COLLECTIONS = [
  ['community-prompts', PROMPTS, prompt],
  ['community-submissions', QUEUE, submission],
]

for (const [label, coll, make] of COLLECTIONS) {
  // ── single-document reads ────────────────────────────────────────────────

  for (const status of ['pending', 'rejected', 'withdrawn']) {
    test(`${label}: a ${status} item is closed to other signed-in users and to signed-out clients`, async () => {
      await seed(coll, 'item', make(status))
      // Controls first: the document is there and the legitimate readers see it.
      const seen = await assertSucceeds(getDoc(doc(aliceDb(), coll, 'item')))
      assert.equal(seen.data().status, status, 'the control read returned the wrong document')
      await assertSucceeds(getDoc(doc(modDb(), coll, 'item')))
      await assertSucceeds(getDoc(doc(adminDb(), coll, 'item')))

      await assertFails(getDoc(doc(bobDb(), coll, 'item')))
      await assertFails(getDoc(doc(anonDb(), coll, 'item')))
    })
  }

  test(`${label}: an approved item is still readable by any signed-in user, and not by a signed-out client`, async () => {
    await seed(coll, 'live', make('approved'))
    await assertSucceeds(getDoc(doc(bobDb(), coll, 'live')))
    await assertSucceeds(getDoc(doc(aliceDb(), coll, 'live')))
    await assertSucceeds(getDoc(doc(modDb(), coll, 'live')))
    // Unchanged by this fix: approved items were never open to signed-out clients.
    await assertFails(getDoc(doc(anonDb(), coll, 'live')))
  })

  test(`${label}: owning an item is what opens it, not just being signed in`, async () => {
    // Bob's pending item is Bob's to read and Alice's to be refused, which
    // rules out a rule that only compares against a fixed uid.
    await seed(coll, 'bobs', make('pending', BOB))
    await assertSucceeds(getDoc(doc(bobDb(), coll, 'bobs')))
    await assertFails(getDoc(doc(aliceDb(), coll, 'bobs')))
  })

  // ── list queries, the way the client runs them ───────────────────────────

  test(`${label}: a list of everything is refused to a plain user, and allowed to a reviewer`, async () => {
    await seed(coll, 'p', make('pending'))
    await seed(coll, 'a', make('approved'))
    await assertFails(getDocs(collection(bobDb(), coll)))
    await assertFails(getDocs(collection(aliceDb(), coll)))
    await assertFails(getDocs(collection(anonDb(), coll)))
    // Admin.jsx lists every prompt, the review queue lists by status.
    const all = await assertSucceeds(getDocs(query(collection(modDb(), coll), orderBy('createdAt', 'desc'))))
    assert.deepEqual(all.docs.map((d) => d.id).sort(), ['a', 'p'])
    const queue = await assertSucceeds(getDocs(query(collection(adminDb(), coll), where('status', '==', 'pending'))))
    assert.deepEqual(queue.docs.map((d) => d.id), ['p'])
  })

  test(`${label}: a list constrained to approved works for a signed-in user and returns only approved items`, async () => {
    await seed(coll, 'p', make('pending'))
    await seed(coll, 'r', make('rejected'))
    await seed(coll, 'a', make('approved'))
    const snap = await assertSucceeds(getDocs(query(collection(bobDb(), coll), where('status', '==', 'approved'))))
    assert.deepEqual(snap.docs.map((d) => d.id), ['a'])
    await assertFails(getDocs(query(collection(bobDb(), coll), where('status', '==', 'pending'))))
    await assertFails(getDocs(query(collection(anonDb(), coll), where('status', '==', 'approved'))))
  })

  test(`${label}: "my items" (authorUid == me) lists the author's own pending items and nobody else's`, async () => {
    // The shape of utils/communityQueueApi.js listMySubmissions.
    await seed(coll, 'mine-pending', make('pending'))
    await seed(coll, 'mine-rejected', make('rejected'))
    await seed(coll, 'bobs-pending', make('pending', BOB))
    const mine = await assertSucceeds(getDocs(query(collection(aliceDb(), coll), where('authorUid', '==', ALICE))))
    assert.deepEqual(mine.docs.map((d) => d.id).sort(), ['mine-pending', 'mine-rejected'])
    // Asking for somebody else's items is refused, not quietly emptied.
    await assertFails(getDocs(query(collection(bobDb(), coll), where('authorUid', '==', ALICE))))
    await assertFails(getDocs(query(collection(anonDb(), coll), where('authorUid', '==', ALICE))))
  })
}

// ── What the read change must not have touched ──────────────────────────────

test('community-submissions: the author can still withdraw their own pending item', async () => {
  await seed(QUEUE, 'mine', submission('pending'))
  await assertSucceeds(setDoc(doc(aliceDb(), QUEUE, 'mine'), { status: 'withdrawn' }, { merge: true }))
  await assertFails(setDoc(doc(bobDb(), QUEUE, 'mine'), { status: 'withdrawn' }, { merge: true }))
})

test('community-prompts: a plain user still cannot approve a prompt, even their own', async () => {
  await seed(PROMPTS, 'mine', prompt('pending'))
  await assertFails(setDoc(doc(aliceDb(), PROMPTS, 'mine'), prompt('approved')))
  await assertSucceeds(setDoc(doc(modDb(), PROMPTS, 'mine'), prompt('approved')))
})
