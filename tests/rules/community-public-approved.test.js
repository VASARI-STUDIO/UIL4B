// Public copies of approved designs — run against the Firestore emulator.
//
//   npm run test:rules
//
// /community shows every visitor the designs a reviewer approved. They read a
// separate collection, `community-public`, with one document per design at the
// id of the submission it was copied from. A copy holds a name, the credit the
// submitter typed, a category, an http(s) link, two colours, a timestamp and
// the kind, and nothing that names the member: no uid, email, account name or
// reviewer. `community-submissions` itself stays closed to signed-out visitors,
// exactly as it was. The cases below are the promises of that split:
//
//   1. Anyone, signed out included, can get a public copy and list them, and a
//      list must carry a limit of 25 or less.
//   2. Nobody but a reviewer can write one, and what a reviewer writes is
//      pinned to the fields above, with their types.
//   3. A reviewer can remove any copy; the author of the submission it was
//      copied from can remove theirs, and nobody else can.
//   4. `community-submissions` reads are unchanged: approved items for any
//      signed-in user, everything else for the author and reviewers.
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
  collection, deleteDoc, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp, setDoc,
  Timestamp, updateDoc, where, writeBatch,
} from 'firebase/firestore'

const RULES_PATH = fileURLToPath(new URL('../../firestore.rules', import.meta.url))
const ALICE = 'alice-uid'
const BOB = 'bob-uid'
const MOD = 'mod-uid'
const ADMIN = 'admin-uid'
const QUEUE = 'community-submissions'
const PUBLIC = 'community-public'

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
const pubItem = (db, id) => doc(db, PUBLIC, id)

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

// A public copy, as buildPublicDesign plus the server's timestamp writes it.
const copy = (over = {}) => ({
  name: 'Harbour Dashboard',
  credit: 'Typed Credit',
  category: 'Dashboard',
  url: 'https://example.com/harbour',
  c1: '#3B82F6',
  c2: '#8B5CF6',
  approvedAt: serverTimestamp(),
  kind: 'design',
  ...over,
})

const PUBLIC_KEYS = ['approvedAt', 'c1', 'c2', 'category', 'credit', 'kind', 'name', 'url']

async function seed(id, data) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), QUEUE, id), data)
  })
}

async function seedPublic(id, over = {}) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), PUBLIC, id), copy({ approvedAt: Timestamp.fromDate(new Date('2026-10-02T00:00:00Z')), ...over }))
  })
}

// The query listApprovedDesigns runs.
const publicList = (db, max = 25) => getDocs(query(
  collection(db, PUBLIC),
  orderBy('approvedAt', 'desc'),
  limit(max),
))

// assertFails, naming what was expected to fail so a loop of cases says which.
async function refused(what, promise) {
  try { await assertFails(promise) } catch (err) {
    err.message = `${what} was accepted: ${err.message}`
    throw err
  }
}

// ── 1 · anyone can read a public copy ───────────────────────────────────────

test('a public copy is readable by a signed-out visitor, a stranger and a reviewer', async () => {
  await seedPublic('live')
  for (const [who, db] of [['signed out', anonDb()], ['a stranger', bobDb()], ['a reviewer', modDb()]]) {
    const snap = await assertSucceeds(getDoc(pubItem(db, 'live')))
    assert.equal(snap.data().name, 'Harbour Dashboard', `${who} did not get the copy`)
  }
})

test('the public list answers a signed-out visitor and a stranger, newest approval first', async () => {
  await seedPublic('old', { approvedAt: Timestamp.fromDate(new Date('2026-10-01T00:00:00Z')) })
  await seedPublic('new', { approvedAt: Timestamp.fromDate(new Date('2026-10-03T00:00:00Z')) })
  await seedPublic('mid', { approvedAt: Timestamp.fromDate(new Date('2026-10-02T00:00:00Z')) })
  for (const [who, db] of [['signed out', anonDb()], ['a stranger', bobDb()]]) {
    const snap = await assertSucceeds(publicList(db))
    assert.deepEqual(snap.docs.map((d) => d.id), ['new', 'mid', 'old'], `${who} got the wrong list`)
  }
})

test('a public list is refused above 25, and when it has no limit at all', async () => {
  await seedPublic('live')
  for (const db of [anonDb(), bobDb()]) {
    await assertSucceeds(publicList(db, 25))
    await assertSucceeds(publicList(db, 1))
    await assertFails(publicList(db, 26))
    await assertFails(publicList(db, 1000))
    // No limit: the rule has nothing to compare, so the list is refused.
    await assertFails(getDocs(query(collection(db, PUBLIC), orderBy('approvedAt', 'desc'))))
    await assertFails(getDocs(collection(db, PUBLIC)))
  }
})

test('what a visitor reads has exactly the public fields and no identity', async () => {
  // Written through the reviewer path, then read back signed out.
  await assertSucceeds(setDoc(pubItem(modDb(), 'd'), copy()))
  const snap = await assertSucceeds(getDoc(pubItem(anonDb(), 'd')))
  assert.deepEqual(Object.keys(snap.data()).sort(), PUBLIC_KEYS)
  for (const key of ['authorUid', 'uid', 'email', 'authorName', 'reviewedBy', 'reviewedAt', 'status', 'payload']) {
    assert.equal(key in snap.data(), false, `${key} must not be on a public copy`)
  }
})

// ── 2 · who can write a public copy, and what ───────────────────────────────

test('nobody but a reviewer can create or change a public copy', async () => {
  await assertFails(setDoc(pubItem(anonDb(), 'anon'), copy()))
  await assertFails(setDoc(pubItem(aliceDb(), 'self'), copy()))
  await assertFails(setDoc(pubItem(bobDb(), 'other'), copy()))
  await assertSucceeds(setDoc(pubItem(modDb(), 'by-mod'), copy()))
  await assertSucceeds(setDoc(pubItem(adminDb(), 'by-admin'), copy()))

  await seedPublic('live')
  await assertFails(updateDoc(pubItem(anonDb(), 'live'), { name: 'Anon edit' }))
  await assertFails(updateDoc(pubItem(aliceDb(), 'live'), { name: 'Author edit' }))
  await assertFails(updateDoc(pubItem(bobDb(), 'live'), { name: 'Stranger edit' }))
  await assertSucceeds(updateDoc(pubItem(modDb(), 'live'), { name: 'Reviewer edit' }))
})

for (const extra of ['authorUid', 'uid', 'email', 'authorName', 'reviewedBy', 'status', 'payload']) {
  test(`a public copy with an extra "${extra}" key is refused, even from a reviewer`, async () => {
    await assertFails(setDoc(pubItem(modDb(), 'x'), copy({ [extra]: 'x' })))
    await assertSucceeds(setDoc(pubItem(modDb(), 'ok'), copy()))
  })
}

for (const key of ['name', 'credit', 'category', 'c1', 'c2', 'approvedAt', 'kind']) {
  test(`a public copy without "${key}" is refused`, async () => {
    const without = copy()
    delete without[key]
    await assertFails(setDoc(pubItem(modDb(), 'x'), without))
  })
}

test('a public copy may leave out its link, and only its link', async () => {
  const noUrl = copy()
  delete noUrl.url
  await assertSucceeds(setDoc(pubItem(modDb(), 'no-url'), noUrl))
})

test('a public copy is held to its types, sizes and a design kind', async () => {
  const badCopies = {
    'a name that is not a string': { name: 42 },
    'an empty name': { name: '' },
    'a name of 81 characters': { name: 'n'.repeat(81) },
    'an empty credit': { credit: '' },
    'a credit of 61 characters': { credit: 'c'.repeat(61) },
    'a credit that is not a string': { credit: ['a'] },
    'a category of 41 characters': { category: 'c'.repeat(41) },
    'a link that is not http(s)': { url: 'javascript:alert(1)' },
    'a data: link': { url: 'data:text/html,hi' },
    'a link that is not a string': { url: 7 },
    'a link over 2048 characters': { url: `https://example.com/${'a'.repeat(2040)}` },
    'a colour that is not hex': { c1: 'red' },
    'a colour that is a url()': { c2: 'url(x)' },
    'a timestamp that is a string': { approvedAt: '2026-10-02T00:00:00.000Z' },
    'a kind other than design': { kind: 'palette' },
  }
  for (const [what, over] of Object.entries(badCopies)) {
    await refused(what, setDoc(pubItem(modDb(), 'x'), copy(over)))
  }
  // The boundaries themselves are fine.
  await assertSucceeds(setDoc(pubItem(modDb(), 'edge'), copy({
    name: 'n'.repeat(80), credit: 'c'.repeat(60), category: 'c'.repeat(40),
  })))
  await assertSucceeds(setDoc(pubItem(modDb(), 'blank-category'), copy({ category: '' })))
})

// ── 3 · who can remove a public copy ────────────────────────────────────────

test('the author of the matching submission can delete their copy, and no one else can', async () => {
  await seed('mine', design('approved'))
  await seedPublic('mine')
  await seed('theirs', design('approved', { authorUid: BOB }))
  await seedPublic('theirs')

  // Another member, a visitor, and the author reaching for someone else's id.
  await assertFails(deleteDoc(pubItem(bobDb(), 'mine')))
  await assertFails(deleteDoc(pubItem(anonDb(), 'mine')))
  await assertFails(deleteDoc(pubItem(aliceDb(), 'theirs')))
  // Still there after every refusal.
  await assertSucceeds(getDoc(pubItem(anonDb(), 'mine')))
  await assertSucceeds(getDoc(pubItem(anonDb(), 'theirs')))

  await assertSucceeds(deleteDoc(pubItem(aliceDb(), 'mine')))
  const left = await assertSucceeds(publicList(anonDb()))
  assert.deepEqual(left.docs.map((d) => d.id), ['theirs'])
})

test('a reviewer can delete any public copy, with or without a submission behind it', async () => {
  await seedPublic('orphan')
  await seed('has-one', design('approved'))
  await seedPublic('has-one')
  await assertSucceeds(deleteDoc(pubItem(modDb(), 'orphan')))
  await assertSucceeds(deleteDoc(pubItem(adminDb(), 'has-one')))
})

test('with no submission behind it, a member cannot delete the copy: the rule has nothing to read', async () => {
  await seedPublic('orphan')
  await assertFails(deleteDoc(pubItem(aliceDb(), 'orphan')))
  await assertFails(deleteDoc(pubItem(anonDb(), 'orphan')))
})

test('an author withdraws an approved design in one batch: the submission and its copy go together', async () => {
  await seed('w', design('approved'))
  await seedPublic('w')
  const batch = writeBatch(aliceDb())
  batch.delete(item(aliceDb(), 'w'))
  batch.delete(pubItem(aliceDb(), 'w'))
  await assertSucceeds(batch.commit())
  assert.equal((await assertSucceeds(getDoc(pubItem(anonDb(), 'w')))).exists(), false)
  const left = await assertSucceeds(publicList(anonDb()))
  assert.deepEqual(left.docs.map((d) => d.id), [])
})

test('an author withdrawing a design that was never approved can include the delete of a copy that is not there', async () => {
  await seed('p', design('pending'))
  const batch = writeBatch(aliceDb())
  batch.delete(item(aliceDb(), 'p'))
  batch.delete(pubItem(aliceDb(), 'p'))
  await assertSucceeds(batch.commit())
})

test('a stranger cannot take a copy down with a batch that also deletes their own submission', async () => {
  await seed('mine', design('pending', { authorUid: BOB }))
  await seed('alices', design('approved'))
  await seedPublic('alices')
  const batch = writeBatch(bobDb())
  batch.delete(item(bobDb(), 'mine'))
  batch.delete(pubItem(bobDb(), 'alices'))
  await assertFails(batch.commit())
  await assertSucceeds(getDoc(pubItem(anonDb(), 'alices')))
})

// ── The reviewer's batch ────────────────────────────────────────────────────

test('a reviewer approves in one batch: the decision and the public copy land together', async () => {
  for (const [i, db] of [modDb(), adminDb()].entries()) {
    await seed('d', design('pending'))
    const batch = writeBatch(db)
    batch.update(item(db, 'd'), { status: 'approved', reviewedAt: `2026-10-0${i + 4}T00:00:00.000Z`, reviewedBy: i ? ADMIN : MOD })
    batch.set(pubItem(db, 'd'), copy())
    await assertSucceeds(batch.commit())
    const snap = await assertSucceeds(getDoc(pubItem(anonDb(), 'd')))
    assert.equal(snap.data().credit, 'Typed Credit')
  }
})

test('a reviewer who rejects or reopens an approved design takes the copy out in the same batch', async () => {
  await seed('d', design('approved'))
  await seedPublic('d')
  const reject = writeBatch(modDb())
  reject.update(item(modDb(), 'd'), { status: 'rejected', reviewedAt: '2026-10-06T00:00:00.000Z', reviewedBy: MOD })
  reject.delete(pubItem(modDb(), 'd'))
  await assertSucceeds(reject.commit())
  assert.equal((await assertSucceeds(getDoc(pubItem(anonDb(), 'd')))).exists(), false)

  await seedPublic('d')
  const reopen = writeBatch(modDb())
  reopen.update(item(modDb(), 'd'), { status: 'pending', reviewedAt: null, reviewedBy: null })
  reopen.delete(pubItem(modDb(), 'd'))
  await assertSucceeds(reopen.commit())
  assert.equal((await assertSucceeds(getDoc(pubItem(anonDb(), 'd')))).exists(), false)
})

test('an author cannot approve their own design, and a stranger cannot approve anyone\'s', async () => {
  await seed('mine', design('pending'))
  const decision = { status: 'approved', reviewedAt: '2026-10-05T00:00:00.000Z', reviewedBy: ALICE }
  await assertFails(updateDoc(item(aliceDb(), 'mine'), decision))
  await assertFails(updateDoc(item(bobDb(), 'mine'), { ...decision, reviewedBy: BOB }))
  await assertFails(updateDoc(item(anonDb(), 'mine'), decision))
  // Nor can they publish the copy themselves in the same breath.
  const batch = writeBatch(aliceDb())
  batch.update(item(aliceDb(), 'mine'), decision)
  batch.set(pubItem(aliceDb(), 'mine'), copy())
  await assertFails(batch.commit())
  const stored = await testEnv.withSecurityRulesDisabled(async (ctx) => getDoc(doc(ctx.firestore(), QUEUE, 'mine')))
  assert.equal(stored.data().status, 'pending', 'a refused approval changed the document')
  const published = await assertSucceeds(getDoc(pubItem(anonDb(), 'mine')))
  assert.equal(published.exists(), false, 'a refused batch still published a copy')
})

// ── 4 · community-submissions is as it was ──────────────────────────────────

test('an approved design in community-submissions is closed to a signed-out visitor, open to anyone signed in', async () => {
  await seed('live', design('approved'))
  await assertFails(getDoc(item(anonDb(), 'live')))
  await assertSucceeds(getDoc(item(bobDb(), 'live')))
  await assertSucceeds(getDoc(item(aliceDb(), 'live')))
  await assertSucceeds(getDoc(item(modDb(), 'live')))
})

test('a signed-out list of approved designs in community-submissions is refused, in every shape', async () => {
  await seed('live', design('approved'))
  const q = (...parts) => getDocs(query(collection(anonDb(), QUEUE), ...parts))
  await assertFails(q(where('status', '==', 'approved'), where('kind', '==', 'design')))
  await assertFails(q(where('status', '==', 'approved'), where('kind', '==', 'design'), orderBy('reviewedAt', 'desc'), limit(25)))
  await assertFails(q(where('status', '==', 'approved')))
  await assertFails(q(where('kind', '==', 'design')))
  await assertFails(q())
  // The control: the same list for a signed-in user.
  const snap = await assertSucceeds(getDocs(query(
    collection(bobDb(), QUEUE),
    where('status', '==', 'approved'),
    where('kind', '==', 'design'),
  )))
  assert.deepEqual(snap.docs.map((d) => d.id), ['live'])
})

test('a signed-in user still reads any approved kind', async () => {
  await seed('pal', palette('approved'))
  await assertSucceeds(getDoc(item(bobDb(), 'pal')))
  const snap = await assertSucceeds(getDocs(query(collection(bobDb(), QUEUE), where('status', '==', 'approved'))))
  assert.deepEqual(snap.docs.map((d) => d.id), ['pal'])
  await assertFails(getDoc(item(anonDb(), 'pal')))
})

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
}

test('owning a design is what opens it before approval, not just being signed in', async () => {
  await seed('bobs', design('pending', { authorUid: BOB }))
  await assertSucceeds(getDoc(item(bobDb(), 'bobs')))
  await assertFails(getDoc(item(aliceDb(), 'bobs')))
  // The author's own list, the shape of listMySubmissions.
  const mine = await assertSucceeds(getDocs(query(collection(bobDb(), QUEUE), where('authorUid', '==', BOB))))
  assert.deepEqual(mine.docs.map((d) => d.id), ['bobs'])
  await assertFails(getDocs(query(collection(aliceDb(), QUEUE), where('authorUid', '==', BOB))))
})

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

test('an author can withdraw or delete an approved design, and a stranger cannot', async () => {
  await seed('w', design('approved'))
  await seed('x', design('approved'))
  await assertFails(updateDoc(item(bobDb(), 'w'), { status: 'withdrawn' }))
  await assertFails(deleteDoc(item(bobDb(), 'x')))
  await assertFails(deleteDoc(item(anonDb(), 'x')))
  await assertSucceeds(updateDoc(item(aliceDb(), 'w'), { status: 'withdrawn' }))
  await assertSucceeds(deleteDoc(item(aliceDb(), 'x')))
})

test('an author cannot edit an approved design in place, only withdraw it', async () => {
  await seed('d', design('approved'))
  await assertFails(updateDoc(item(aliceDb(), 'd'), { name: 'Renamed after approval' }))
  await assertFails(updateDoc(item(aliceDb(), 'd'), { status: 'withdrawn', name: 'Renamed too' }))
  await assertFails(updateDoc(item(aliceDb(), 'd'), { 'payload.url': 'https://example.com/swapped' }))
})

test('a queued design cannot carry an email or any key outside the ones the client writes', async () => {
  await assertFails(setDoc(item(aliceDb(), 'e1'), { ...design('pending'), email: 'alice@example.com' }))
  await assertFails(setDoc(item(aliceDb(), 'e2'), { ...design('pending'), authorEmail: 'alice@example.com' }))
  await assertFails(setDoc(item(aliceDb(), 'e3'), { ...design('pending'), reviewedBy: ALICE }))
  await assertFails(setDoc(item(aliceDb(), 'e4'), design('pending', { payload: { ...design('pending').payload, email: 'a@b.co' } })))
  await assertSucceeds(setDoc(item(aliceDb(), 'ok'), design('pending')))
})
