// Save on a community prompt is a toggle: save adds the id and a library
// copy; pressing it again removes both; Undo puts both back. The saved set is
// account-bound, so the last two tests check that an unsave cannot be brought
// back by an older copy of the set — neither by the sync merge nor by a page
// writing an in-memory set it read before the change arrived.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  toggleCommunitySave, undoUnsave, isCopyEdited, libraryCopyIndex,
  toggleStoredCommunitySave, undoStoredUnsave, getSavedIds, getPrompts,
  getSaveLedger, normalizeSaveLedger, markSave, pruneUnsavedCopies, readPromptLibrary,
} from '../../src/utils/promptStore.js'
import { reconcile, detectLocalChanges, emptyMeta, mergeStamped, isStampedList } from '../../src/utils/accountSync.js'

const CP = { id: 'c-3', title: 'Dark mode analytics dashboard', text: 'Build a dashboard.', tags: 'dashboard, dark' }
const OTHER = { id: 'c-4', title: 'Other', text: 'Other prompt.', tags: 'x' }
const MINE = { id: 1, title: 'My own', text: 'Mine.', tags: '', date: '1/1/2026' }

function memoryStorage(init = {}) {
  const m = new Map(Object.entries(init))
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)) },
    removeItem: (k) => { m.delete(k) },
    key: (i) => [...m.keys()][i] ?? null,
    get length() { return m.size },
  }
}

test('save adds the id and a copy that remembers where it came from', () => {
  const r = toggleCommunitySave({ prompts: [MINE], savedIds: new Set() }, CP, 1000)
  assert.equal(r.saved, true)
  assert.ok(r.savedIds.has('c-3'))
  assert.equal(r.prompts.length, 2)
  assert.equal(r.prompts[0].sourceId, 'c-3')
  assert.equal(r.prompts[0].text, CP.text)
  assert.equal(r.undo, null)
})

test('save → unsave → undo round-trips the library exactly', () => {
  const start = { prompts: [MINE], savedIds: new Set() }
  const saved = toggleCommunitySave(start, CP, 1000)
  const unsaved = toggleCommunitySave(saved, CP, 2000)
  assert.equal(unsaved.saved, false)
  assert.equal(unsaved.savedIds.has('c-3'), false, 'unsave must drop the saved id')
  assert.deepEqual(unsaved.prompts, [MINE], 'unsave must remove the copy it created, and nothing else')
  assert.equal(unsaved.edited, false)

  const back = undoUnsave(unsaved, unsaved.undo)
  assert.ok(back.savedIds.has('c-3'))
  assert.deepEqual(back.prompts, saved.prompts, 'undo restores the copy at its old position')
  // Undo twice does not duplicate.
  const twice = undoUnsave(back, unsaved.undo)
  assert.equal(twice.prompts.length, saved.prompts.length)
})

test('an edited copy is reported, so the toast can say so', () => {
  const saved = toggleCommunitySave({ prompts: [], savedIds: new Set() }, CP, 1000)
  const edited = { ...saved, prompts: [{ ...saved.prompts[0], text: 'My rewrite.' }] }
  const unsaved = toggleCommunitySave(edited, CP, 2000)
  assert.equal(unsaved.edited, true)
  assert.equal(unsaved.prompts.length, 0)
  assert.equal(unsaved.undo.copy.text, 'My rewrite.', 'undo keeps the edited text, not the original')
  assert.equal(isCopyEdited(saved.prompts[0], CP), false)
})

test('a copy saved before copies carried sourceId is still found when unedited', () => {
  const legacy = { id: 5, title: CP.title, text: CP.text, tags: CP.tags, date: 'x' }
  assert.equal(libraryCopyIndex([MINE, legacy], CP), 1)
  const changed = { ...legacy, text: 'changed' }
  assert.equal(libraryCopyIndex([MINE, changed], CP), -1, 'an edited legacy copy is not guessed at')
})

test('the stored toggle reads storage fresh and never writes back a stale set', () => {
  const storage = memoryStorage()
  toggleStoredCommunitySave(CP, { storage, now: 1000 })
  toggleStoredCommunitySave(OTHER, { storage, now: 1001 })
  // Another device unsaves c-3; the account's value is applied here.
  storage.setItem('vs-saved-prompt-ids', JSON.stringify(['c-4']))
  storage.setItem('vs-prompts', JSON.stringify(getPrompts(storage).filter((p) => p.sourceId !== 'c-3')))
  // This page, still holding its old in-memory set, unsaves c-4.
  const r = toggleStoredCommunitySave(OTHER, { storage, now: 3000 })
  assert.equal(r.saved, false)
  assert.deepEqual([...getSavedIds(storage)], [], 'c-3 must not come back')
  assert.equal(getPrompts(storage).length, 0)
  undoStoredUnsave(r.undo, { storage })
  assert.deepEqual([...getSavedIds(storage)], ['c-4'])
})

test('the per-key stamp keeps an unsave from being resurrected by an older account copy', () => {
  const uid = 'u1'
  // This device saved c-3 at t=1000 and the account has it at that stamp.
  const storage = memoryStorage({ 'vs-saved-prompt-ids': JSON.stringify(['c-3']) })
  const meta = { ...emptyMeta(), owner: uid }
  detectLocalChanges(storage, meta, 1000)
  const stale = { 'vs-saved-prompt-ids': ['c-3'], _stamps: { 'vs-saved-prompt-ids': 1000 }, _updatedAt: 1000 }

  // Unsave at t=2000.
  toggleStoredCommunitySave(CP, { storage, now: 2000 })
  assert.deepEqual(detectLocalChanges(storage, meta, 2000).includes('vs-saved-prompt-ids'), true)

  // An older snapshot of the account arrives: it must not be applied.
  const local = { 'vs-saved-prompt-ids': [...getSavedIds(storage)] }
  const r = reconcile({ uid, meta, local, remote: { data: stale }, now: 2001 })
  assert.equal(Object.hasOwn(r.apply, 'vs-saved-prompt-ids'), false, 'the stale saved set was written back')
  assert.equal(r.push, true, 'the unsave must go up to the account')

  // And the other way round: a device still holding c-3 at t=1000 receives
  // the unsave stamped 2000, and drops it.
  const otherMeta = { ...emptyMeta(), owner: uid, stamps: { 'vs-saved-prompt-ids': 1000 } }
  const fresh = { 'vs-saved-prompt-ids': [], _stamps: { 'vs-saved-prompt-ids': 2000 }, _updatedAt: 2000 }
  const r2 = reconcile({ uid, meta: otherMeta, local: { 'vs-saved-prompt-ids': ['c-3'] }, remote: { data: fresh }, now: 2002 })
  assert.deepEqual(r2.apply['vs-saved-prompt-ids'], [])
})

// ── The save ledger: one stamped entry per prompt ───────────────────────────
// An unsave is written as `{ id, saved: false, at }` rather than by dropping
// the id, so the account can merge two devices prompt by prompt. The tests
// below fail if the account falls back to one timestamp for the whole list:
// then the device with the newer stamp wins every prompt, and a prompt the
// other device unsaved comes back.

const idsOf = (ledger) => [...new Set(normalizeSaveLedger(ledger).filter((e) => e.saved).map((e) => e.id))].sort()

test('an unsave keeps a stamped entry, and undo stamps the save again', () => {
  const storage = memoryStorage()
  toggleStoredCommunitySave(CP, { storage, now: 1000 })
  assert.deepEqual(getSaveLedger(storage), [{ id: 'c-3', saved: true, at: 1000 }])
  const r = toggleStoredCommunitySave(CP, { storage, now: 2000 })
  assert.deepEqual(getSaveLedger(storage), [{ id: 'c-3', saved: false, at: 2000 }], 'the unsave dropped the entry instead of stamping it')
  assert.equal(getSavedIds(storage).has('c-3'), false)
  assert.ok(isStampedList(getSaveLedger(storage)), 'the stored ledger is not in the stamped shape the account merges')
  undoStoredUnsave(r.undo, { storage, now: 3000 })
  assert.deepEqual(getSaveLedger(storage), [{ id: 'c-3', saved: true, at: 3000 }])
  assert.equal(getPrompts(storage).length, 1, 'undo did not put the library copy back')
})

test('the older plain list of ids reads as saved entries stamped 0', () => {
  assert.deepEqual(normalizeSaveLedger(['c-2', 'c-1']), [
    { id: 'c-1', saved: true, at: 0 }, { id: 'c-2', saved: true, at: 0 },
  ])
  // A list that holds both shapes (a union of an old and a new copy) keeps the newer entry.
  assert.deepEqual(normalizeSaveLedger(['c-1', { id: 'c-1', saved: false, at: 5 }]), [{ id: 'c-1', saved: false, at: 5 }])
  assert.deepEqual(markSave(['c-1'], 'c-2', true, 9), [{ id: 'c-1', saved: true, at: 0 }, { id: 'c-2', saved: true, at: 9 }])
})

test('sync: a newer list does not bring back a prompt the other device unsaved', () => {
  const uid = 'u1'
  const key = 'vs-saved-prompt-ids'
  // This device saved c-4 at 2500 and still holds c-3 saved from 1000.
  const local = [{ id: 'c-3', saved: true, at: 1000 }, { id: 'c-4', saved: true, at: 2500 }]
  // The account holds the other device's unsave of c-3 at 2000.
  const remote = [{ id: 'c-3', saved: false, at: 2000 }]
  const meta = { ...emptyMeta(), owner: uid, stamps: { [key]: 2500 } }
  const r = reconcile({ uid, meta, local: { [key]: local }, remote: { data: { [key]: remote, _stamps: { [key]: 2000 }, _updatedAt: 2000 } }, now: 2600 })
  assert.deepEqual(idsOf(r.apply[key]), ['c-4'], 'c-3 came back, or c-4 was lost')
  assert.equal(r.push, true, 'the merged list must go up so the other device gets c-4')

  // And the other way round: the account's list is the newer one.
  const meta2 = { ...emptyMeta(), owner: uid, stamps: { [key]: 3000 } }
  const r2 = reconcile({
    uid, meta: meta2,
    local: { [key]: [{ id: 'c-3', saved: false, at: 3000 }] },
    remote: { data: { [key]: [{ id: 'c-3', saved: true, at: 1000 }, { id: 'c-5', saved: true, at: 4000 }], _stamps: { [key]: 4000 }, _updatedAt: 4000 } },
    now: 4100,
  })
  assert.deepEqual(idsOf(r2.apply[key]), ['c-5'], 'the account\'s newer list undid this device\'s unsave')
  assert.equal(r2.push, true)
})

test('first sign-in on a device: the signed-out saves merge into the account prompt by prompt', () => {
  const key = 'vs-saved-prompt-ids'
  const r = reconcile({
    uid: 'u1', meta: emptyMeta(),
    local: { [key]: [{ id: 'c-3', saved: true, at: 1500 }] },
    remote: { data: { [key]: [{ id: 'c-3', saved: false, at: 1200 }, { id: 'c-7', saved: true, at: 900 }], _stamps: { [key]: 1200 }, _updatedAt: 1200 } },
    now: 1600,
  })
  assert.equal(r.mode, 'bind')
  assert.deepEqual(idsOf(r.apply[key]), ['c-3', 'c-7'])
  assert.equal(r.push, true)
})

test('the item merge gives both devices the same answer', () => {
  const a = [{ id: 'c-1', saved: true, at: 5 }, { id: 'c-2', saved: false, at: 7 }]
  const b = [{ id: 'c-1', saved: false, at: 5 }, { id: 'c-2', saved: true, at: 6 }, { id: 'c-9', saved: true, at: 1 }]
  assert.deepEqual(mergeStamped(a, b), mergeStamped(b, a))
  assert.deepEqual(mergeStamped(a, b).map((e) => e.id), ['c-1', 'c-2', 'c-9'])
})

test('a library copy of a prompt unsaved on another device is pruned; a later re-save is kept', () => {
  const ledger = [{ id: 'c-3', saved: false, at: 2000 }]
  const stale = { id: 1000, sourceId: 'c-3', savedAt: 1000, title: CP.title, text: CP.text }
  const later = { id: 3000, sourceId: 'c-3', savedAt: 3000, title: CP.title, text: CP.text }
  assert.deepEqual(pruneUnsavedCopies([MINE, stale], ledger), [MINE])
  assert.deepEqual(pruneUnsavedCopies([MINE, later], ledger), [MINE, later])
  // Unchanged input comes back as the same array, so a reader can skip the write.
  const list = [MINE]
  assert.equal(pruneUnsavedCopies(list, ledger), list)

  const storage = memoryStorage({ 'vs-prompts': JSON.stringify([MINE, stale]), 'vs-saved-prompt-ids': JSON.stringify(ledger) })
  const lib = readPromptLibrary(storage)
  assert.deepEqual(lib.prompts, [MINE])
  assert.deepEqual(getPrompts(storage), [MINE], 'the prune was not written back')
})
