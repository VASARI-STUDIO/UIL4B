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
import { ref, uploadBytes, getBytes, deleteObject, updateMetadata } from 'firebase/storage'
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
// clearStorage leaves objects in place on this emulator, so each test gets its own
// pair of folders instead, and a slot filled by one test never reaches the next.
let alice = ALICE
let bob = BOB
let folderRun = 0
beforeEach(() => { folderRun += 1; alice = `${ALICE}-${folderRun}`; bob = `${BOB}-${folderRun}` })

const verified = (uid = alice) => storageEnv.authenticatedContext(uid, { email_verified: true }).storage()
const unverified = (uid = alice) => storageEnv.authenticatedContext(uid, { email_verified: false }).storage()
const mine = (name, uid = alice) => `community-media/${uid}/${name}`
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
  await assertFails(put(verified(bob), mine('slot-0.webp'), 'image/webp'))
  await assertSucceeds(put(verified(bob), mine('slot-0.webp', bob), 'image/webp'))
})

test('H1: the owner can delete their own object, and nobody else can', async () => {
  await storageEnv.withSecurityRulesDisabled(async (ctx) => {
    await put(ctx.storage(), mine('slot-0.webp'), 'image/webp')
  })
  await assertFails(deleteObject(ref(verified(bob), mine('slot-0.webp'))))
  await assertFails(deleteObject(ref(storageEnv.authenticatedContext('mod', { moderator: true }).storage(), mine('slot-0.webp'))))
  await assertFails(deleteObject(ref(storageEnv.unauthenticatedContext().storage(), mine('slot-0.webp'))))
  await assertSucceeds(deleteObject(ref(verified(), mine('slot-0.webp'))))
})

test('H1: a slot that already holds an object cannot be overwritten, by its owner or anyone else', async () => {
  // The first write creates the slot; the same bytes over it are an update.
  await assertSucceeds(put(verified(), mine('slot-0.webp'), 'image/webp'))
  await assertFails(put(verified(), mine('slot-0.webp'), 'image/webp'))
  await assertFails(put(verified(), mine('slot-0.webp'), 'image/webp', new Uint8Array([1, 2, 3])))
  await assertFails(put(verified(bob), mine('slot-0.webp'), 'image/webp'))
  // The next slot of the same type is still free.
  await assertSucceeds(put(verified(), mine('slot-1.webp'), 'image/webp'))
})

test('H1: the metadata of a stored object cannot be changed either', async () => {
  await storageEnv.withSecurityRulesDisabled(async (ctx) => {
    await put(ctx.storage(), mine('slot-0.webp'), 'image/webp')
  })
  await assertFails(updateMetadata(ref(verified(), mine('slot-0.webp')), { contentType: 'image/webp', cacheControl: 'no-store' }))
  await assertSucceeds(getBytes(ref(verified(), mine('slot-0.webp'))))
})

test('H1: after the owner deletes an object, the same slot can be created again', async () => {
  await assertSucceeds(put(verified(), mine('slot-3.mp4'), 'video/mp4'))
  await assertFails(put(verified(), mine('slot-3.mp4'), 'video/mp4'))
  await assertSucceeds(deleteObject(ref(verified(), mine('slot-3.mp4'))))
  await assertSucceeds(put(verified(), mine('slot-3.mp4'), 'video/mp4'))
})

test('H1: reviewers and the owner can read an object, and another account cannot', async () => {
  await storageEnv.withSecurityRulesDisabled(async (ctx) => {
    await put(ctx.storage(), mine('slot-0.webp'), 'image/webp')
  })
  const target = (store) => ref(store, mine('slot-0.webp'))
  await assertSucceeds(getBytes(target(verified())))
  await assertSucceeds(getBytes(target(storageEnv.authenticatedContext('mod', { moderator: true }).storage())))
  await assertSucceeds(getBytes(target(storageEnv.authenticatedContext('adm', { admin: true }).storage())))
  await assertFails(getBytes(target(verified(bob))))
})

// ── H2 · firestore.rules, community queue ───────────────────────────────────
import { doc, writeBatch, serverTimestamp, setDoc, getDoc, Timestamp } from 'firebase/firestore'
import { planCounter } from '../../src/utils/communityLimits.js'

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
// The shape buildCommunityPromptRecord writes.
const prompt = (extra = {}) => ({
  title: 'Harbour at dusk', text: 'A quiet harbour at dusk, soft light.', tags: 'harbour, dusk',
  authorName: 'Alice', authorUid: ALICE, profileLink: null, status: 'pending',
  createdAt: '2026-10-29T00:00:00.000Z', ...extra,
})
// The batch the client sends: the post and its counter, both stamped by the server.
async function post(db, id, { counter = {}, record = {}, kind = 'submission' } = {}) {
  const batch = writeBatch(db)
  batch.set(doc(db, kind === 'prompt' ? 'community-prompts' : 'community-submissions', id), {
    ...(kind === 'prompt' ? prompt() : submission()), submittedAt: serverTimestamp(), ...record,
  })
  batch.set(doc(db, 'users', ALICE, 'limits', 'community'), {
    windowStart: serverTimestamp(), lastAt: serverTimestamp(), lastKind: kind, lastId: id,
    prompts: kind === 'prompt' ? 1 : 0, submissions: kind === 'prompt' ? 0 : 1, ...counter,
  })
  return batch.commit()
}
// withSecurityRulesDisabled resolves to nothing, so the read is kept from inside it.
const readCounter = async () => {
  let data
  await fsEnv.withSecurityRulesDisabled(async (ctx) => {
    data = (await getDoc(doc(ctx.firestore(), 'users', ALICE, 'limits', 'community'))).data()
  })
  return data
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
  // One window timestamp, shared by the stored counter and the update: a different
  // value would be read as a new window and refused for that reason instead.
  const window = at(60_000)
  await seedCounter({ windowStart: window, lastAt: at(5_000), lastKind: 'submission', lastId: 'x', prompts: 0, submissions: 1 })
  const keep = { windowStart: window, submissions: 2 }
  await assertFails(post(dbFor(), 's4', { counter: keep }))
  await seedCounter({ windowStart: window, lastAt: at(31_000), lastKind: 'submission', lastId: 'x', prompts: 0, submissions: 1 })
  await assertSucceeds(post(dbFor(), 's5', { counter: keep }))
})

test('H2: the 11th submission in a window is refused, and the 10th is accepted', async () => {
  const at = (ms) => Timestamp.fromMillis(Date.now() - ms)
  const window = at(3_600_000)
  await seedCounter({ windowStart: window, lastAt: at(60_000), lastKind: 'submission', lastId: 'x', prompts: 0, submissions: 9 })
  await assertSucceeds(post(dbFor(), 's6', { counter: { windowStart: window, submissions: 10 } }))
  await seedCounter({ windowStart: window, lastAt: at(60_000), lastKind: 'submission', lastId: 'x', prompts: 0, submissions: 10 })
  await assertFails(post(dbFor(), 's7', { counter: { windowStart: window, submissions: 11 } }))
})

test('H2: a prompt is held to the same rules as a submission', async () => {
  await assertFails(post(dbFor({ email_verified: false }), 'p0', { kind: 'prompt' }))
  await assertFails(post(dbFor(), 'p1', { kind: 'prompt', record: { submittedAt: Timestamp.fromDate(new Date('2999-12-31')) } }))
  // A prompt written with a counter that names a submission is not counted as a prompt.
  await assertFails(post(dbFor(), 'p2', { kind: 'prompt', counter: { lastKind: 'submission', prompts: 0, submissions: 1 } }))
  await assertSucceeds(post(dbFor(), 'p3', { kind: 'prompt' }))
})

test('H2: the 11th prompt in a window is refused, and the 10th is accepted', async () => {
  const at = (ms) => Timestamp.fromMillis(Date.now() - ms)
  const window = at(3_600_000)
  await seedCounter({ windowStart: window, lastAt: at(60_000), lastKind: 'prompt', lastId: 'x', prompts: 9, submissions: 0 })
  await assertSucceeds(post(dbFor(), 'p4', { kind: 'prompt', counter: { windowStart: window, prompts: 10 } }))
  await seedCounter({ windowStart: window, lastAt: at(60_000), lastKind: 'prompt', lastId: 'x', prompts: 10, submissions: 0 })
  await assertFails(post(dbFor(), 'p5', { kind: 'prompt', counter: { windowStart: window, prompts: 11 } }))
})

test('H2: the counter restarts after 24 hours, and not before', async () => {
  const at = (ms) => Timestamp.fromMillis(Date.now() - ms)
  const HOUR = 3_600_000
  // Past the window: a full counter can start again at one, but cannot carry on counting.
  const old = at(25 * HOUR)
  await seedCounter({ windowStart: old, lastAt: old, lastKind: 'submission', lastId: 'x', prompts: 0, submissions: 10 })
  await assertFails(post(dbFor(), 'r0', { counter: { windowStart: old, submissions: 11 } }))
  await assertFails(post(dbFor(), 'r1', { counter: { windowStart: old, submissions: 10 } }))
  await assertSucceeds(post(dbFor(), 'r2'))
  // Inside the window: the same restart is refused, so the cap cannot be reset early.
  const recent = at(23 * HOUR)
  await seedCounter({ windowStart: recent, lastAt: at(60_000), lastKind: 'submission', lastId: 'x', prompts: 0, submissions: 10 })
  await assertFails(post(dbFor(), 'r3'))
})

test('H2: two posts in one batch with one counter write is refused', async () => {
  const db = dbFor()
  const batch = writeBatch(db)
  batch.set(doc(db, 'community-submissions', 'b0'), { ...submission(), submittedAt: serverTimestamp() })
  batch.set(doc(db, 'community-submissions', 'b1'), { ...submission(), submittedAt: serverTimestamp() })
  batch.set(doc(db, 'users', ALICE, 'limits', 'community'), {
    windowStart: serverTimestamp(), lastAt: serverTimestamp(), lastKind: 'submission', lastId: 'b0',
    prompts: 0, submissions: 2,
  })
  await assertFails(batch.commit())
  // The counter names one post, so the same batch with only that post is accepted.
  await assertSucceeds(post(db, 'b2'))
})

test('H2: a post with no counter write is refused', async () => {
  const db = dbFor()
  await assertFails(setDoc(doc(db, 'community-submissions', 'n0'), { ...submission(), submittedAt: serverTimestamp() }))
  await assertFails(setDoc(doc(db, 'community-prompts', 'n1'), { ...prompt(), submittedAt: serverTimestamp() }))
  await assertSucceeds(post(db, 'n2'))
})

test('H2: the batch postWithLimits builds is accepted, for a first post, a later one and a restart', async () => {
  // The counter comes from planCounter, as communityQueueApi.postWithLimits builds it.
  const at = (ms) => Timestamp.fromMillis(Date.now() - ms)
  const HOUR = 3_600_000
  let n = 0
  const send = async (kind, prev) => {
    const id = `real${++n}`
    const db = dbFor()
    const { data } = planCounter(prev, { kind, id, nowMs: Date.now(), stamp: serverTimestamp() })
    const batch = writeBatch(db)
    batch.set(doc(db, kind === 'prompt' ? 'community-prompts' : 'community-submissions', id), {
      ...(kind === 'prompt' ? prompt() : submission()), submittedAt: serverTimestamp(),
    })
    batch.set(doc(db, 'users', ALICE, 'limits', 'community'), data)
    return batch.commit()
  }
  await assertSucceeds(send('submission', null))
  const first = await readCounter()
  assert.equal(first.submissions, 1)

  const later = { windowStart: at(HOUR), lastAt: at(60_000), lastKind: 'submission', lastId: 'x', prompts: 2, submissions: 3 }
  await seedCounter(later)
  await assertSucceeds(send('prompt', later))
  const kept = await readCounter()
  assert.equal(kept.prompts, 3)
  assert.equal(kept.submissions, 3)

  const expired = { windowStart: at(25 * HOUR), lastAt: at(25 * HOUR), lastKind: 'prompt', lastId: 'x', prompts: 10, submissions: 4 }
  await seedCounter(expired)
  await assertSucceeds(send('submission', expired))
})

// ── H2 · the rules' expression budget ───────────────────────────────────────
// Firestore stops evaluating a request that uses too many expressions and
// refuses it. The post's shape checks run once per list element, and the counter
// checks run on the counter write in the same batch, so the largest payloads the
// client can send are sent here through the batch postWithLimits builds
// (planCounter for the counter), once as a first post, where the counter is
// created, and once as a later post, where it is updated.
let budgetN = 0
async function sendCounted(kind, record, prev) {
  const id = `budget${++budgetN}`
  const db = dbFor()
  const { data } = planCounter(prev, { kind, id, nowMs: Date.now(), stamp: serverTimestamp() })
  const batch = writeBatch(db)
  batch.set(doc(db, kind === 'prompt' ? 'community-prompts' : 'community-submissions', id), {
    ...(kind === 'prompt' ? prompt() : submission()), ...record, submittedAt: serverTimestamp(),
  })
  batch.set(doc(db, 'users', ALICE, 'limits', 'community'), data)
  return batch.commit()
}

function budgetCase(label, kind, record) {
  test(`H2 budget: ${label}, as a first post (the counter is created)`, async () => {
    await assertSucceeds(sendCounted(kind, record, null))
    const counter = await readCounter()
    assert.equal(counter[kind === 'prompt' ? 'prompts' : 'submissions'], 1, 'the counter was not written with the post')
  })

  test(`H2 budget: ${label}, as a later post (the counter is updated)`, async () => {
    const at = (ms) => Timestamp.fromMillis(Date.now() - ms)
    const prev = { windowStart: at(3_600_000), lastAt: at(60_000), lastKind: 'prompt', lastId: 'x', prompts: 2, submissions: 3 }
    await seedCounter(prev)
    await assertSucceeds(sendCounted(kind, record, prev))
    const counter = await readCounter()
    assert.equal(counter[kind === 'prompt' ? 'prompts' : 'submissions'], kind === 'prompt' ? 3 : 4, 'the counter was not stepped with the post')
  })
}

const MAX_STOPS = 12
budgetCase('a 12-stop gradient', 'submission', {
  kind: 'gradient',
  payload: {
    type: 'linear',
    angle: 135,
    stops: Array.from({ length: MAX_STOPS }, (_, i) => ({ color: `#${(16 + i * 12).toString(16)}80c0`, position: i / (MAX_STOPS - 1) })),
  },
})

budgetCase('a 32-colour palette', 'submission', {
  kind: 'palette',
  payload: {
    colors: Array.from({ length: 32 }, (_, i) => `#${(16 + i * 7).toString(16)}c0a0`),
    category: 'Branding',
    author: 'Alice',
  },
})

const SVG_HEAD = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="'
const SVG_TAIL = '"/></svg>'
budgetCase('an icon of 8192 characters', 'submission', {
  kind: 'icon',
  payload: {
    svg: SVG_HEAD + 'M1 1'.padEnd(8192 - SVG_HEAD.length - SVG_TAIL.length, ' ') + SVG_TAIL,
    author: 'Alice',
  },
})

budgetCase('a prompt with every optional key', 'prompt', {
  title: 'T'.repeat(300),
  text: 'A quiet harbour at dusk. '.repeat(800).slice(0, 20000),
  tags: 'h'.repeat(300),
  authorName: 'A'.repeat(120),
  profileLink: `https://example.com/${'p'.repeat(2000)}`,
  ownerId: 'o'.repeat(64),
  mediaType: 'image',
  mediaUrl: `https://firebasestorage.googleapis.com/v0/b/demo/o/community-media%2F${ALICE}%2Fslot-0.webp?alt=media&token=${'t'.repeat(36)}`,
})
