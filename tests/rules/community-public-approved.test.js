// Public read of approved designs — run against the Firestore emulator.
//
//   npm run test:rules
//
// /community shows every visitor the designs a reviewer approved, so
// `community-submissions` is readable by anyone, signed out included, for an
// APPROVED DESIGN and nothing else. Firestore rules are not filters, so the
// shape of the query is part of the rule: a list that is not held to
// `status == 'approved'` and `kind == 'design'` is refused outright, whatever
// it would have returned. The cases below are the three promises of the change:
//
//   1. Anyone can read an approved design, as a single document and as the list
//      query the page runs.
//   2. Nobody but its author and reviewers can read a pending, rejected or
//      withdrawn design, and nobody signed out can read any other kind.
//   3. Nobody but a reviewer can write a design into the approved state, and an
//      author can still take an approved design down.
//
// Every refusal sits beside a success on the same collection, so a rules file
// that refuses everything cannot pass.
import test, { after, before, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from '@firebase/rules-unit-testing'
import {
  collection, deleteDoc, doc, getDoc, getDocs, limit, orderBy, query, setDoc, updateDoc, where,
} from 'firebase/firestore'

const RULES_PATH = fileURLToPath(new URL('../../firestore.rules', import.meta.url))
const ALICE = 'alice-uid'
const BOB = 'bob-uid'
const MOD = 'mod-uid'
const ADMIN = 'admin-uid'
const QUEUE = 'community-submissions'

let testEnv

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-uil4b-community-public',
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

const item = (db, id) => doc(db, QUEUE, id)

const design = (status, over = {}) => ({
  kind: 'design',
  name: `A ${status} design`,
  authorUid: ALICE,
  authorName: 'Alice',
  status,
  payload: { author: 'Alice', category: 'Landing', url: 'https://example.com/a', c1: '#3B82F6', c2: '#8B5CF6' },
  createdAt: '2026-10-01T00:00:00.000Z',
  ...(status === 'approved' ? { reviewedAt: '2026-10-02T00:00:00.000Z', reviewedBy: MOD } : {}),
  ...over,
})

const palette = (status, over = {}) => ({
  kind: 'palette',
  name: `A ${status} palette`,
  authorUid: ALICE,
  authorName: 'Alice',
  status,
  payload: { colors: ['#0F172A', '#38BDF8'] },
  createdAt: '2026-10-01T00:00:00.000Z',
  ...(status === 'approved' ? { reviewedAt: '2026-10-02T00:00:00.000Z', reviewedBy: MOD } : {}),
  ...over,
})

async function seed(id, data) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), QUEUE, id), data)
  })
}

// The query listApprovedDesigns runs.
const publicList = (db) => getDocs(query(
  collection(db, QUEUE),
  where('status', '==', 'approved'),
  where('kind', '==', 'design'),
  orderBy('reviewedAt', 'desc'),
  limit(25),
))

// ── 1 · anyone can read an approved design ──────────────────────────────────

test('an approved design is readable by a signed-out visitor, a stranger and its author', async () => {
  await seed('live', design('approved'))
  for (const [who, db] of [['signed out', anonDb()], ['a stranger', bobDb()], ['the author', aliceDb()]]) {
    const snap = await assertSucceeds(getDoc(item(db, 'live')))
    assert.equal(snap.data().status, 'approved', `${who} read the wrong document`)
    assert.equal(snap.data().name, 'A approved design', `${who} did not get the public view`)
  }
})

test('the public list returns approved designs only, to a signed-out visitor and to a stranger', async () => {
  await seed('a1', design('approved', { reviewedAt: '2026-10-03T00:00:00.000Z' }))
  await seed('a2', design('approved', { authorUid: BOB, reviewedAt: '2026-10-02T00:00:00.000Z' }))
  await seed('p', design('pending'))
  await seed('r', design('rejected'))
  await seed('w', design('withdrawn'))
  await seed('pal', palette('approved'))
  for (const [who, db] of [['signed out', anonDb()], ['a stranger', bobDb()]]) {
    const snap = await assertSucceeds(publicList(db))
    // Newest approval first, and none of the other states or kinds.
    assert.deepEqual(snap.docs.map((d) => d.id), ['a1', 'a2'], `${who} got the wrong list`)
  }
})

test('a signed-in user still reads any approved kind, as before', async () => {
  await seed('pal', palette('approved'))
  await assertSucceeds(getDoc(item(bobDb(), 'pal')))
  const snap = await assertSucceeds(getDocs(query(collection(bobDb(), QUEUE), where('status', '==', 'approved'))))
  assert.deepEqual(snap.docs.map((d) => d.id), ['pal'])
})

// ── 2 · what stays closed ───────────────────────────────────────────────────

for (const status of ['pending', 'rejected', 'withdrawn']) {
  test(`a ${status} design is closed to a stranger and to a signed-out visitor, open to its author and reviewers`, async () => {
    await seed('item', design(status))
    const seen = await assertSucceeds(getDoc(item(aliceDb(), 'item')))
    assert.equal(seen.data().status, status, 'the control read returned the wrong document')
    await assertSucceeds(getDoc(item(modDb(), 'item')))
    await assertSucceeds(getDoc(item(adminDb(), 'item')))

    await assertFails(getDoc(item(bobDb(), 'item')))
    await assertFails(getDoc(item(anonDb(), 'item')))
  })

  test(`a list for ${status} designs is refused to a stranger and to a signed-out visitor`, async () => {
    await seed('item', design(status))
    for (const db of [bobDb(), anonDb()]) {
      await assertFails(getDocs(query(
        collection(db, QUEUE),
        where('status', '==', status),
        where('kind', '==', 'design'),
      )))
    }
    // The control: the same list is fine for a reviewer.
    const snap = await assertSucceeds(getDocs(query(
      collection(modDb(), QUEUE),
      where('status', '==', status),
      where('kind', '==', 'design'),
    )))
    assert.deepEqual(snap.docs.map((d) => d.id), ['item'])
  })
}

test('a signed-out visitor cannot read an approved item of any other kind', async () => {
  await seed('pal', palette('approved'))
  await seed('grad', palette('approved', { kind: 'gradient', payload: { type: 'linear', stops: [] } }))
  await seed('ico', design('approved', { kind: 'icon', payload: { svg: '<svg xmlns="http://www.w3.org/2000/svg"/>', author: 'Alice' } }))
  for (const id of ['pal', 'grad', 'ico']) {
    await assertFails(getDoc(item(anonDb(), id)))
    // Same documents, signed in: the control that they exist and read.
    await assertSucceeds(getDoc(item(bobDb(), id)))
  }
})

test('a signed-out list must be held to approved designs, or it is refused outright', async () => {
  await seed('live', design('approved'))
  await seed('p', design('pending'))
  const q = (...parts) => getDocs(query(collection(anonDb(), QUEUE), ...parts))
  await assertSucceeds(q(where('status', '==', 'approved'), where('kind', '==', 'design')))
  await assertFails(q())
  await assertFails(q(where('status', '==', 'approved')))
  await assertFails(q(where('kind', '==', 'design')))
  await assertFails(q(where('kind', '==', 'palette'), where('status', '==', 'approved')))
  await assertFails(q(where('authorUid', '==', ALICE)))
})

test('owning a design is what opens it before approval, not just being signed in', async () => {
  await seed('bobs', design('pending', { authorUid: BOB }))
  await assertSucceeds(getDoc(item(bobDb(), 'bobs')))
  await assertFails(getDoc(item(aliceDb(), 'bobs')))
  // The author's own list, the shape of listMySubmissions.
  const mine = await assertSucceeds(getDocs(query(collection(bobDb(), QUEUE), where('authorUid', '==', BOB))))
  assert.deepEqual(mine.docs.map((d) => d.id), ['bobs'])
  await assertFails(getDocs(query(collection(aliceDb(), QUEUE), where('authorUid', '==', BOB))))
})

// ── 3 · who can write an approved design ────────────────────────────────────

test('nobody can create a design already approved: an author, a stranger or a signed-out visitor', async () => {
  // The document is exactly the one a client may queue, apart from its status,
  // so the status is the only thing that can be refusing it.
  const asApproved = { ...design('pending'), status: 'approved' }
  await assertFails(setDoc(item(aliceDb(), 'self'), asApproved))
  await assertFails(setDoc(item(bobDb(), 'forged'), { ...asApproved, authorUid: BOB }))
  await assertFails(setDoc(item(anonDb(), 'anon'), asApproved))
  // The control: the same author can queue the same design as pending.
  await assertSucceeds(setDoc(item(aliceDb(), 'ok'), design('pending')))
})

test('an author cannot approve their own design, and a stranger cannot approve anyone\'s', async () => {
  await seed('mine', design('pending'))
  const decision = { status: 'approved', reviewedAt: '2026-10-05T00:00:00.000Z', reviewedBy: ALICE }
  await assertFails(updateDoc(item(aliceDb(), 'mine'), decision))
  await assertFails(updateDoc(item(bobDb(), 'mine'), { ...decision, reviewedBy: BOB }))
  await assertFails(updateDoc(item(anonDb(), 'mine'), decision))
  const stored = await testEnv.withSecurityRulesDisabled(async (ctx) => getDoc(doc(ctx.firestore(), QUEUE, 'mine')))
  assert.equal(stored.data().status, 'pending', 'a refused approval changed the document')
})

test('a reviewer can approve, and the visitor then sees the design', async () => {
  await seed('d', design('pending'))
  await assertFails(getDoc(item(anonDb(), 'd')))
  for (const [i, db] of [modDb(), adminDb()].entries()) {
    await seed('d', design('pending'))
    await assertSucceeds(updateDoc(item(db, 'd'), {
      status: 'approved', reviewedAt: `2026-10-0${i + 4}T00:00:00.000Z`, reviewedBy: i ? ADMIN : MOD,
    }))
    const snap = await assertSucceeds(getDoc(item(anonDb(), 'd')))
    assert.equal(snap.data().status, 'approved')
  }
})

test('a reviewer who reverses or rejects an approved design takes it back out of public view', async () => {
  await seed('d', design('approved'))
  await assertSucceeds(getDoc(item(anonDb(), 'd')))
  await assertSucceeds(updateDoc(item(modDb(), 'd'), { status: 'rejected', reviewedAt: '2026-10-06T00:00:00.000Z', reviewedBy: MOD }))
  await assertFails(getDoc(item(anonDb(), 'd')))
  await assertSucceeds(updateDoc(item(modDb(), 'd'), { status: 'approved', reviewedAt: '2026-10-07T00:00:00.000Z', reviewedBy: MOD }))
  await assertSucceeds(getDoc(item(anonDb(), 'd')))
  await assertSucceeds(updateDoc(item(modDb(), 'd'), { status: 'pending', reviewedAt: null, reviewedBy: null }))
  await assertFails(getDoc(item(anonDb(), 'd')))
})

test('an author can withdraw or delete an approved design, and it leaves public view at once', async () => {
  await seed('w', design('approved'))
  await seed('x', design('approved'))
  await assertSucceeds(getDoc(item(anonDb(), 'w')))
  // A stranger cannot do either.
  await assertFails(updateDoc(item(bobDb(), 'w'), { status: 'withdrawn' }))
  await assertFails(deleteDoc(item(bobDb(), 'x')))
  await assertFails(deleteDoc(item(anonDb(), 'x')))

  await assertSucceeds(updateDoc(item(aliceDb(), 'w'), { status: 'withdrawn' }))
  await assertFails(getDoc(item(anonDb(), 'w')))
  await assertSucceeds(deleteDoc(item(aliceDb(), 'x')))
  const left = await assertSucceeds(publicList(anonDb()))
  assert.deepEqual(left.docs.map((d) => d.id), [], 'a withdrawn or deleted design is still in the public list')
})

test('an author cannot edit an approved design in place, only withdraw it', async () => {
  await seed('d', design('approved'))
  await assertFails(updateDoc(item(aliceDb(), 'd'), { name: 'Renamed after approval' }))
  await assertFails(updateDoc(item(aliceDb(), 'd'), { status: 'withdrawn', name: 'Renamed too' }))
  await assertFails(updateDoc(item(aliceDb(), 'd'), { 'payload.url': 'https://example.com/swapped' }))
})

// ── What an approved document can hold ──────────────────────────────────────
//
// A rule cannot hide fields, so the whole document is public once approved.
// What keeps private data out of it is the create rule, which pins the keys.

test('a queued design cannot carry an email or any key outside the ones the client writes', async () => {
  await assertFails(setDoc(item(aliceDb(), 'e1'), { ...design('pending'), email: 'alice@example.com' }))
  await assertFails(setDoc(item(aliceDb(), 'e2'), { ...design('pending'), authorEmail: 'alice@example.com' }))
  await assertFails(setDoc(item(aliceDb(), 'e3'), { ...design('pending'), reviewedBy: ALICE }))
  await assertFails(setDoc(item(aliceDb(), 'e4'), design('pending', { payload: { ...design('pending').payload, email: 'a@b.co' } })))
  await assertSucceeds(setDoc(item(aliceDb(), 'ok'), design('pending')))
})
