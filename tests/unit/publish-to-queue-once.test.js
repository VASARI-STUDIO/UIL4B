// publishToQueueOnce, run for real with the two Firestore calls it makes
// (setDoc, getDoc) replaced by stand-ins. It writes at a fixed document id; the
// rules refuse a second write to an existing id with permission-denied, and the
// refusal means "already there" only when the document read back was written by
// the same author.
import test from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'

register('./helpers/stub-loader.mjs', import.meta.url, { data: { queueApi: false } })
const { publishToQueueOnce } = await import('../../src/utils/communityQueueApi.js')

const denied = () => Object.assign(new Error('Missing or insufficient permissions.'), { code: 'permission-denied' })
const snap = (data) => ({ exists: () => data != null, data: () => data })
const RECORD = { kind: 'gradient', name: 'Old ocean', authorUid: 'u1', status: 'pending' }

// One fake Firestore per test; every call is written down.
function fakeStore({ setDoc, getDoc }) {
  const calls = { setDoc: [], getDoc: [] }
  globalThis.__FS__ = {
    setDoc: async (ref, rec) => { calls.setDoc.push({ ref, rec }); return setDoc(ref, rec) },
    getDoc: async (ref) => { calls.getDoc.push({ ref }); return getDoc(ref) },
  }
  return calls
}

test('a first write creates the document at the chosen id', async () => {
  const calls = fakeStore({ setDoc: async () => {}, getDoc: async () => { throw new Error('no read expected') } })
  const out = await publishToQueueOnce(RECORD, { id: 'u1_a' })
  assert.deepEqual(out, { id: 'u1_a', created: true })
  assert.equal(calls.setDoc[0].ref.id, 'u1_a')
  assert.deepEqual(calls.setDoc[0].rec, RECORD)
  assert.equal(calls.getDoc.length, 0)
})

test('a refused repeat over a document this author wrote is "already there", not an error', async () => {
  const calls = fakeStore({ setDoc: async () => { throw denied() }, getDoc: async () => snap({ ...RECORD }) })
  const out = await publishToQueueOnce(RECORD, { id: 'u1_a' })
  assert.deepEqual(out, { id: 'u1_a', created: false })
  assert.equal(calls.getDoc[0].ref.id, 'u1_a', 'it read back the same id it tried to write')
})

test('a refusal over a document someone else created at that id still throws', async () => {
  fakeStore({ setDoc: async () => { throw denied() }, getDoc: async () => snap({ ...RECORD, authorUid: 'someone-else' }) })
  await assert.rejects(publishToQueueOnce(RECORD, { id: 'u1_a' }), (e) => e.code === 'permission-denied')
})

test('a refusal where the document is missing still throws', async () => {
  fakeStore({ setDoc: async () => { throw denied() }, getDoc: async () => snap(null) })
  await assert.rejects(publishToQueueOnce(RECORD, { id: 'u1_a' }), (e) => e.code === 'permission-denied')
})

test('a refusal where the read back is refused too still throws the original error', async () => {
  fakeStore({ setDoc: async () => { throw denied() }, getDoc: async () => { throw denied() } })
  await assert.rejects(publishToQueueOnce(RECORD, { id: 'u1_a' }), (e) => e.code === 'permission-denied' && /insufficient/.test(e.message))
})

test('a record with no author uid never matches a stored document with none', async () => {
  fakeStore({ setDoc: async () => { throw denied() }, getDoc: async () => snap({ kind: 'gradient' }) })
  const { authorUid, ...noUid } = RECORD
  assert.equal(authorUid, 'u1')
  await assert.rejects(publishToQueueOnce(noUid, { id: 'u1_a' }), (e) => e.code === 'permission-denied')
})

test('a failure that is not a refusal is thrown without looking for the document', async () => {
  const calls = fakeStore({
    setDoc: async () => { throw Object.assign(new Error('offline'), { code: 'unavailable' }) },
    getDoc: async () => snap({ ...RECORD }),
  })
  await assert.rejects(publishToQueueOnce(RECORD, { id: 'u1_a' }), (e) => e.code === 'unavailable')
  assert.equal(calls.getDoc.length, 0)
})
