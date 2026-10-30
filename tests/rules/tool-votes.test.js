// Emulator tests for the toolVotes rules in docs/design/tool-votes-rules.patch.
//
//   npm run test:rules
//
// firestore.rules is founder-gated, so these run against the registry's PLANNED
// text (scripts/gated-patches.mjs fileTextThrough), the same way
// gated-upload-queue.test.js does. A patch already applied is skipped and the
// text comes back the same, so every assertion holds on both sides of
// `npm run apply:gated`.
//
// A vote is one write to the counter and one to the caller's voter document,
// sent together. A batch makes the same rule decisions as the client's
// transaction, so it is used here to keep the writes explicit.
//
// Every refusal sits beside an accepted write of the same shape, so a rules
// file that refuses everything cannot turn this suite green.
import test, { after, before, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc, deleteDoc, writeBatch, serverTimestamp } from 'firebase/firestore'
import { fileTextThrough } from '../../scripts/gated-patches.mjs'

const ALICE = 'alice-uid'
const BOB = 'bob-uid'
const TOOL = '3d-converter'

let env

before(async () => {
  const rules = await fileTextThrough('tool-votes')
  assert.match(rules, /match \/toolVotes\/\{toolId\}/, 'the rules under test are not the patched ones')
  env = await initializeTestEnvironment({ projectId: 'demo-uil4b-tool-votes', firestore: { rules } })
})
after(async () => { await env?.cleanup() })
beforeEach(async () => { await env.clearFirestore() })

const dbFor = (uid, claims = {}) => env.authenticatedContext(uid, claims).firestore()
const anonDb = () => env.unauthenticatedContext().firestore()
const adminDb = () => dbFor('admin-uid', { admin: true })

const counterRef = (db, tool = TOOL) => doc(db, 'toolVotes', tool)
const voterRef = (db, uid, tool = TOOL) => doc(db, 'toolVotes', tool, 'voters', uid)

/** A counter, and a voter document for each uid given, written past the rules. */
async function seed({ count, open = true, voters = [], tool = TOOL }) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore()
    await setDoc(counterRef(db, tool), { count, open })
    for (const uid of voters) await setDoc(voterRef(db, uid, tool), { at: new Date() })
  })
}
const readCounter = async (tool = TOOL) => {
  let data
  await env.withSecurityRulesDisabled(async (ctx) => { data = (await getDoc(counterRef(ctx.firestore(), tool))).data() })
  return data
}
const voterExists = async (uid, tool = TOOL) => {
  let exists
  await env.withSecurityRulesDisabled(async (ctx) => { exists = (await getDoc(voterRef(ctx.firestore(), uid, tool))).exists() })
  return exists
}

/** The two writes of a vote: the counter at `count`, and the caller's voter document. */
function castVote(db, voterUid, count, { tool = TOOL, counter = { count, open: true } } = {}) {
  const batch = writeBatch(db)
  batch.set(counterRef(db, tool), counter)
  batch.set(voterRef(db, voterUid, tool), { at: serverTimestamp() })
  return batch.commit()
}
/** The two writes of a take-back: the counter at `count`, and the voter document gone. */
function takeBack(db, voterUid, count, { tool = TOOL } = {}) {
  const batch = writeBatch(db)
  batch.set(counterRef(db, tool), { count, open: true })
  batch.delete(voterRef(db, voterUid, tool))
  return batch.commit()
}

/* ── The passes ──────────────────────────────────────────────────────────── */

test('a first vote creates the counter at 1 together with the voter document', async () => {
  await assertSucceeds(castVote(dbFor(ALICE), ALICE, 1))
  assert.deepEqual(await readCounter(), { count: 1, open: true })
  assert.equal(await voterExists(ALICE), true)
})

test("a second account's vote moves the count to 2", async () => {
  await seed({ count: 1, voters: [ALICE] })
  await assertSucceeds(castVote(dbFor(BOB), BOB, 2))
  assert.equal((await readCounter()).count, 2)
  assert.equal(await voterExists(BOB), true)
})

test('a take-back lowers the count by one and removes the voter document', async () => {
  await seed({ count: 2, voters: [ALICE, BOB] })
  await assertSucceeds(takeBack(dbFor(ALICE), ALICE, 1))
  assert.equal((await readCounter()).count, 1)
  assert.equal(await voterExists(ALICE), false)
  assert.equal(await voterExists(BOB), true)
})

test('after a take-back the same account can vote again', async () => {
  await seed({ count: 1, voters: [ALICE] })
  await assertSucceeds(takeBack(dbFor(ALICE), ALICE, 0))
  await assertSucceeds(castVote(dbFor(ALICE), ALICE, 1))
  assert.equal((await readCounter()).count, 1)
})

test('an admin can close voting, and the count stays as it was', async () => {
  await seed({ count: 4, voters: [ALICE] })
  await assertSucceeds(setDoc(counterRef(adminDb()), { count: 4, open: false }))
  assert.deepEqual(await readCounter(), { count: 4, open: false })
})

test('anyone can read a counter, signed in or not', async () => {
  await seed({ count: 3 })
  await assertSucceeds(getDoc(counterRef(anonDb())))
  await assertSucceeds(getDoc(counterRef(dbFor(BOB))))
})

/* ── Signed out ──────────────────────────────────────────────────────────── */

test('a signed-out write is refused, and the same vote signed in is accepted', async () => {
  await assertFails(castVote(anonDb(), ALICE, 1))
  await assertFails(setDoc(counterRef(anonDb()), { count: 1, open: true }))
  await seed({ count: 1, voters: [BOB] })
  await assertFails(castVote(anonDb(), ALICE, 2))
  await assertFails(deleteDoc(voterRef(anonDb(), BOB)))
  await assertSucceeds(castVote(dbFor(ALICE), ALICE, 2))
})

/* ── The count only moves with the caller's own voter document ───────────── */

test('a count change with no voter document is refused, and with one is accepted', async () => {
  await seed({ count: 3 })
  await assertFails(setDoc(counterRef(dbFor(ALICE)), { count: 4, open: true }))
  await assertSucceeds(castVote(dbFor(ALICE), ALICE, 4))
})

test('a vote that adds 2 is refused, and one that adds 1 is accepted', async () => {
  await seed({ count: 3 })
  await assertFails(castVote(dbFor(ALICE), ALICE, 5))
  await assertSucceeds(castVote(dbFor(ALICE), ALICE, 4))
})

test('a first vote cannot create a counter above 1, closed, or with an extra field', async () => {
  await assertFails(castVote(dbFor(ALICE), ALICE, 5))
  await assertFails(castVote(dbFor(ALICE), ALICE, 1, { counter: { count: 1, open: false } }))
  await assertFails(castVote(dbFor(ALICE), ALICE, 1, { counter: { count: 1, open: true, bonus: 1 } }))
  await assertFails(castVote(dbFor(ALICE), ALICE, 0, { counter: { count: 0, open: true } }))
  await assertSucceeds(castVote(dbFor(ALICE), ALICE, 1))
})

test('a counter id that is not a plain tool id is refused', async () => {
  await assertFails(castVote(dbFor(ALICE), ALICE, 1, { tool: 'Not A Tool' }))
  await assertFails(castVote(dbFor(ALICE), ALICE, 1, { tool: 'a'.repeat(49) }))
  await assertSucceeds(castVote(dbFor(ALICE), ALICE, 1, { tool: 'a'.repeat(48) }))
})

test('a take-back without a voter document is refused, and with one is accepted', async () => {
  await seed({ count: 3, voters: [BOB] })
  // Alice never voted: lowering the count, with or without deleting a document, is refused.
  await assertFails(setDoc(counterRef(dbFor(ALICE)), { count: 2, open: true }))
  await assertFails(takeBack(dbFor(ALICE), ALICE, 2))
  await assertSucceeds(takeBack(dbFor(BOB), BOB, 2))
})

test('a take-back cannot take the count below zero', async () => {
  await seed({ count: 0, voters: [ALICE] })
  await assertFails(takeBack(dbFor(ALICE), ALICE, -1))
  await seed({ count: 1, voters: [ALICE] })
  await assertSucceeds(takeBack(dbFor(ALICE), ALICE, 0))
})

test('a take-back that lowers the count by 2 is refused', async () => {
  await seed({ count: 3, voters: [ALICE] })
  await assertFails(takeBack(dbFor(ALICE), ALICE, 1))
  await assertSucceeds(takeBack(dbFor(ALICE), ALICE, 2))
})

test('a vote paired with a take-back write is refused', async () => {
  // Raising the count while removing the voter document would swap one vote for another.
  await seed({ count: 3, voters: [ALICE] })
  const batch = writeBatch(dbFor(ALICE))
  batch.set(counterRef(dbFor(ALICE)), { count: 4, open: true })
  batch.delete(voterRef(dbFor(ALICE), ALICE))
  await assertFails(batch.commit())
})

/* ── One vote per account ────────────────────────────────────────────────── */

test('a second vote by one account is refused, and a different account can still vote', async () => {
  await seed({ count: 1, voters: [ALICE] })
  await assertFails(castVote(dbFor(ALICE), ALICE, 2))
  // The voter document alone cannot be rewritten either.
  await assertFails(setDoc(voterRef(dbFor(ALICE), ALICE), { at: serverTimestamp() }))
  assert.equal((await readCounter()).count, 1)
  await assertSucceeds(castVote(dbFor(BOB), BOB, 2))
})

test('a voter document with another field, or a time the client chose, is refused', async () => {
  await seed({ count: 3 })
  const withDoc = (data) => {
    const batch = writeBatch(dbFor(ALICE))
    batch.set(counterRef(dbFor(ALICE)), { count: 4, open: true })
    batch.set(voterRef(dbFor(ALICE), ALICE), data)
    return batch.commit()
  }
  await assertFails(withDoc({ at: serverTimestamp(), extra: true }))
  await assertFails(withDoc({ at: new Date('2020-01-01') }))
  await assertSucceeds(withDoc({ at: serverTimestamp() }))
})

/* ── One account cannot write or read another's vote ─────────────────────── */

test("a write to another account's voter document is refused, and to one's own is accepted", async () => {
  await seed({ count: 3 })
  // Alice raises the count and creates a document for Bob.
  await assertFails(castVote(dbFor(ALICE), BOB, 4))
  await assertFails(setDoc(voterRef(dbFor(ALICE), BOB), { at: serverTimestamp() }))
  await assertSucceeds(castVote(dbFor(ALICE), ALICE, 4))
})

test("deleting another account's voter document is refused", async () => {
  await seed({ count: 2, voters: [ALICE, BOB] })
  const batch = writeBatch(dbFor(ALICE))
  batch.set(counterRef(dbFor(ALICE)), { count: 1, open: true })
  batch.delete(voterRef(dbFor(ALICE), BOB))
  await assertFails(batch.commit())
  await assertFails(deleteDoc(voterRef(dbFor(ALICE), BOB)))
  assert.equal(await voterExists(BOB), true)
})

test("reading another account's voter document is refused, and reading one's own is accepted", async () => {
  await seed({ count: 2, voters: [ALICE, BOB] })
  await assertFails(getDoc(voterRef(dbFor(ALICE), BOB)))
  await assertFails(getDoc(voterRef(anonDb(), BOB)))
  await assertFails(getDoc(voterRef(adminDb(), BOB)))
  await assertSucceeds(getDoc(voterRef(dbFor(BOB), BOB)))
  await assertSucceeds(getDoc(voterRef(dbFor(ALICE), ALICE)))
})

/* ── Closed means closed ─────────────────────────────────────────────────── */

test('a vote on a closed tool is refused, and on an open one is accepted', async () => {
  await seed({ count: 2, open: false, tool: 'closed-tool' })
  await seed({ count: 2, open: true, tool: 'open-tool' })
  await assertFails(castVote(dbFor(ALICE), ALICE, 3, { tool: 'closed-tool' }))
  await assertSucceeds(castVote(dbFor(ALICE), ALICE, 3, { tool: 'open-tool' }))
})

test('a take-back on a closed tool is refused, and on an open one is accepted', async () => {
  await seed({ count: 2, open: false, voters: [ALICE], tool: 'closed-tool' })
  await seed({ count: 2, open: true, voters: [ALICE], tool: 'open-tool' })
  await assertFails(takeBack(dbFor(ALICE), ALICE, 1, { tool: 'closed-tool' }))
  await assertFails(deleteDoc(voterRef(dbFor(ALICE), ALICE, 'closed-tool')))
  await assertSucceeds(takeBack(dbFor(ALICE), ALICE, 1, { tool: 'open-tool' }))
  assert.equal(await voterExists(ALICE, 'closed-tool'), true)
})

test('a non-admin cannot close or reopen voting', async () => {
  await seed({ count: 2 })
  await assertFails(setDoc(counterRef(dbFor(ALICE)), { count: 2, open: false }))
  await assertFails(setDoc(counterRef(dbFor(ALICE, { moderator: true })), { count: 2, open: false }))
  await assertSucceeds(setDoc(counterRef(adminDb()), { count: 2, open: false }))
  await assertFails(setDoc(counterRef(dbFor(ALICE)), { count: 2, open: true }))
  await assertSucceeds(setDoc(counterRef(adminDb()), { count: 2, open: true }))
})

/* ── The count cannot be forged, by anyone ───────────────────────────────── */

test('an admin changing the count is refused, and an admin closing is accepted', async () => {
  await seed({ count: 4 })
  await assertFails(setDoc(counterRef(adminDb()), { count: 9, open: true }))
  await assertFails(setDoc(counterRef(adminDb()), { count: 0, open: true }))
  // Closing and changing the count in one write is a count change.
  await assertFails(setDoc(counterRef(adminDb()), { count: 9, open: false }))
  await assertSucceeds(setDoc(counterRef(adminDb()), { count: 4, open: false }))
})

test('a counter cannot be deleted, by its voter, another account or an admin', async () => {
  await seed({ count: 1, voters: [ALICE] })
  await assertFails(deleteDoc(counterRef(dbFor(ALICE))))
  await assertFails(deleteDoc(counterRef(dbFor(BOB))))
  await assertFails(deleteDoc(counterRef(adminDb())))
  await assertFails(deleteDoc(counterRef(anonDb())))
  const batch = writeBatch(dbFor(ALICE))
  batch.delete(counterRef(dbFor(ALICE)))
  batch.delete(voterRef(dbFor(ALICE), ALICE))
  await assertFails(batch.commit())
  assert.deepEqual(await readCounter(), { count: 1, open: true })
})

test('a counter keeps no extra field after a vote', async () => {
  await seed({ count: 3 })
  await assertFails(castVote(dbFor(ALICE), ALICE, 4, { counter: { count: 4, open: true, bonus: 1 } }))
  await assertSucceeds(castVote(dbFor(ALICE), ALICE, 4))
})
