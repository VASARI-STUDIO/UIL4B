// Emulator tests for the two abuse-audit patches H1 and H2 that ship as
// founder-gated rules patches:
//   docs/design/upload-limits-rules.patch   (storage.rules)
//   docs/design/queue-limits-rules.patch    (firestore.rules)
//
//   npm run test:rules
//
// Both files are gated, so these run against the registry's PLANNED text
// (scripts/gated-patches.mjs fileTextThrough), the same way gated-rules-fixes.test.js
// does. A patch already applied is skipped and the text comes back the same, so
// every assertion holds on both sides of `npm run apply:gated`.
//
// Every refusal sits beside an accepted write of the same shape, so a rules file
// that refuses everything cannot turn this suite green.
import test, { after, before, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing'
import { ref, uploadBytes, getBytes, deleteObject } from 'firebase/storage'
import { fileTextThrough } from '../../scripts/gated-patches.mjs'

const MIB = 1024 * 1024
const ALICE = 'alice-uid'
const BOB = 'bob-uid'

// ── H1 · storage.rules ──────────────────────────────────────────────────────
let storageEnv

before(async () => {
  const rules = await fileTextThrough('upload-limits', 'storage.rules')
  assert.match(rules, /function slotAndType\(/, 'the storage rules under test are not the patched ones')
  storageEnv = await initializeTestEnvironment({ projectId: 'demo-uil4b-upload-limits', storage: { rules } })
})
after(async () => { await storageEnv?.cleanup() })
beforeEach(async () => { await storageEnv.clearStorage() })

const verified = (uid = ALICE) => storageEnv.authenticatedContext(uid, { email_verified: true }).storage()
const unverified = (uid = ALICE) => storageEnv.authenticatedContext(uid, { email_verified: false }).storage()
const mine = (name, uid = ALICE) => `community-media/${uid}/${name}`
const BYTES = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x00, 0x01, 0x02, 0x03])
const put = (store, path, contentType, bytes = BYTES) =>
  uploadBytes(ref(store, path), bytes, contentType ? { contentType } : undefined)

test('H1: a verified account can upload to each of the six slot types', async () => {
  const cases = [
    ['slot-0.webp', 'image/webp'], ['slot-1.png', 'image/png'], ['slot-2.jpg', 'image/jpeg'],
    ['slot-3.gif', 'image/gif'], ['slot-4.mp4', 'video/mp4'], ['slot-9.webm', 'video/webm'],
  ]
  for (const [name, type] of cases) await assertSucceeds(put(verified(), mine(name), type))
})

test('H1: an unverified account is refused, and the same upload from a verified one is accepted', async () => {
  await assertFails(put(unverified(), mine('slot-0.webp'), 'image/webp'))
  await assertSucceeds(put(verified(), mine('slot-0.webp'), 'image/webp'))
})

test('H1: 10 MiB is accepted and 10 MiB plus one byte is refused, as the same slot and type', async () => {
  await assertSucceeds(put(verified(), mine('slot-0.mp4'), 'video/mp4', new Uint8Array(10 * MIB)))
  await assertFails(put(verified(), mine('slot-1.mp4'), 'video/mp4', new Uint8Array(10 * MIB + 1)))
  await assertFails(put(verified(), mine('slot-2.mp4'), 'video/mp4', new Uint8Array(11 * MIB)))
})

test('H1: an unknown slot name, a deep path or a wrong type is refused', async () => {
  await assertFails(put(verified(), mine('slot-10.webp'), 'image/webp'))
  await assertFails(put(verified(), mine('1730000000000.webp'), 'image/webp'))
  await assertFails(put(verified(), mine('slot-0.svg'), 'image/svg+xml'))
  await assertFails(put(verified(), mine('slot-0.mov'), 'video/quicktime'))
  await assertFails(put(verified(), mine('a/slot-0.webp'), 'image/webp'))
  await assertFails(put(verified(), mine('slot-0.webp'), 'text/html'))
  // The extension and the type must agree.
  await assertFails(put(verified(), mine('slot-0.png'), 'image/webp'))
  await assertFails(put(verified(), mine('slot-0.webp'), undefined))
  await assertSucceeds(put(verified(), mine('slot-0.webp'), 'image/webp'))
})

test('H1: an account cannot write into another account\'s folder', async () => {
  await assertFails(put(verified(BOB), mine('slot-0.webp'), 'image/webp'))
  await assertSucceeds(put(verified(BOB), mine('slot-0.webp', BOB), 'image/webp'))
})

test('H1: the owner can delete their own object, and nobody else can', async () => {
  await storageEnv.withSecurityRulesDisabled(async (ctx) => {
    await put(ctx.storage(), mine('slot-0.webp'), 'image/webp')
  })
  await assertFails(deleteObject(ref(verified(BOB), mine('slot-0.webp'))))
  await assertFails(deleteObject(ref(storageEnv.authenticatedContext('mod', { moderator: true }).storage(), mine('slot-0.webp'))))
  await assertFails(deleteObject(ref(storageEnv.unauthenticatedContext().storage(), mine('slot-0.webp'))))
  await assertSucceeds(deleteObject(ref(verified(), mine('slot-0.webp'))))
})

test('H1: reviewers and the owner can read an object, and another account cannot', async () => {
  await storageEnv.withSecurityRulesDisabled(async (ctx) => {
    await put(ctx.storage(), mine('slot-0.webp'), 'image/webp')
  })
  const target = (store) => ref(store, mine('slot-0.webp'))
  await assertSucceeds(getBytes(target(verified())))
  await assertSucceeds(getBytes(target(storageEnv.authenticatedContext('mod', { moderator: true }).storage())))
  await assertSucceeds(getBytes(target(storageEnv.authenticatedContext('adm', { admin: true }).storage())))
  await assertFails(getBytes(target(verified(BOB))))
})

// ── H2 · firestore.rules, community queue ───────────────────────────────────
import { doc, writeBatch, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore'

let fsEnv
before(async () => {
  const rules = await fileTextThrough('queue-limits')
  fsEnv = await initializeTestEnvironment({ projectId: 'demo-uil4b-queue-limits', firestore: { rules } })
})
after(async () => { await fsEnv?.cleanup() })
beforeEach(async () => { await fsEnv.clearFirestore() })

const dbFor = (claims = { email_verified: true }) => fsEnv.authenticatedContext(ALICE, claims).firestore()
const submission = (extra = {}) => ({
  kind: 'palette', name: 'Harbour', authorUid: ALICE, authorName: 'Alice', status: 'pending',
  payload: { colors: ['#0F172A'], category: 'Branding' }, createdAt: '2026-10-29T00:00:00.000Z', ...extra,
})
// The batch the client sends: the post and its counter, both stamped by the server.
async function post(db, id, { counter = {}, record = {}, kind = 'submission' } = {}) {
  const batch = writeBatch(db)
  batch.set(doc(db, kind === 'prompt' ? 'community-prompts' : 'community-submissions', id), {
    ...submission(), submittedAt: serverTimestamp(), ...record,
  })
  batch.set(doc(db, 'users', ALICE, 'limits', 'community'), {
    windowStart: serverTimestamp(), lastAt: serverTimestamp(), lastKind: kind, lastId: id,
    prompts: kind === 'prompt' ? 1 : 0, submissions: kind === 'prompt' ? 0 : 1, ...counter,
  })
  return batch.commit()
}
const seedCounter = (data) => fsEnv.withSecurityRulesDisabled(async (ctx) => {
  await setDoc(doc(ctx.firestore(), 'users', ALICE, 'limits', 'community'), data)
})

test('H2: the real client batch is accepted from a verified account and refused from an unverified one', async () => {
  await assertFails(post(dbFor({ email_verified: false }), 's0'))
  await assertSucceeds(post(dbFor(), 's1'))
})

test('H2: a client-set submittedAt is refused', async () => {
  await assertFails(post(dbFor(), 's2', { record: { submittedAt: Timestamp.fromDate(new Date('2999-12-31')) } }))
  await assertSucceeds(post(dbFor(), 's3'))
})

test('H2: a second post within 30 seconds is refused, and one after 30 seconds is accepted', async () => {
  const at = (ms) => Timestamp.fromMillis(Date.now() - ms)
  await seedCounter({ windowStart: at(60_000), lastAt: at(5_000), lastKind: 'submission', lastId: 'x', prompts: 0, submissions: 1 })
  const keep = { windowStart: at(60_000), submissions: 2 }
  await assertFails(post(dbFor(), 's4', { counter: keep }))
  await seedCounter({ windowStart: at(60_000), lastAt: at(31_000), lastKind: 'submission', lastId: 'x', prompts: 0, submissions: 1 })
  await assertSucceeds(post(dbFor(), 's5', { counter: keep }))
})

test('H2: the 11th submission in a window is refused', async () => {
  const at = (ms) => Timestamp.fromMillis(Date.now() - ms)
  await seedCounter({ windowStart: at(3_600_000), lastAt: at(60_000), lastKind: 'submission', lastId: 'x', prompts: 0, submissions: 10 })
  await assertFails(post(dbFor(), 's6', { counter: { windowStart: at(3_600_000), submissions: 11 } }))
})
