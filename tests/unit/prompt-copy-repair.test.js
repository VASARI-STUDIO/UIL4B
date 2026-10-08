// A saved community prompt id can end up without its copy in the library: the
// two keys merge separately, newest list wins. A read never writes the copy
// back (it cannot tell "never had one" from "still arriving"); a separate
// repair, run after a sync has settled, adds the missing ones.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  readPromptLibrary, repairMissingCopies, savedIdsWithoutCopy, getPrompts, getSaveLedger, getSavedIds, removeStoredPrompt,
} from '../../src/utils/promptStore.js'
import { repairPromptLibraryAfterSync, repairAfterSettle, detectLocalChanges, emptyMeta } from '../../src/utils/accountSync.js'

const CP3 = { id: 'c-3', title: 'Dark mode analytics dashboard', text: 'Build a dashboard.', tags: 'dashboard, dark', img: '' }
const CP4 = { id: 'c-4', title: 'Other', text: 'Other prompt.', tags: 'x' }
const CP5 = { id: 'c-5', title: 'Third', text: 'Third prompt.', tags: 'y' }
const CATALOG = [CP3, CP4, CP5]
const MINE = { id: 1, title: 'My own', text: 'Mine.', tags: '', date: '1/1/2026' }
const copyOf = (cp, extra = {}) => ({ id: 5000, sourceId: cp.id, savedAt: 5000, title: cp.title, text: cp.text, tags: cp.tags, img: '', date: '1/1/2026', ...extra })
const saved = (id, at = 1000) => ({ id, saved: true, at })

// Counts writes, so "no write" is a measurement and not an assumption.
function memoryStorage(init = {}) {
  const m = new Map(Object.entries(init))
  const store = {
    writes: 0,
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { store.writes += 1; m.set(k, String(v)) },
    removeItem: (k) => { m.delete(k) },
  }
  return store
}
const lib = (prompts, ledger) => memoryStorage({
  'vs-prompts': JSON.stringify(prompts),
  'vs-saved-prompt-ids': JSON.stringify(ledger),
})

test('a read shows a saved id with no copy as a fallback from the community prompt, and writes nothing', () => {
  const storage = lib([MINE], [saved('c-3')])
  const before = storage.getItem('vs-prompts')
  const out = readPromptLibrary(storage, { catalog: CATALOG })
  assert.equal(storage.writes, 0, 'a read must not write')
  assert.equal(storage.getItem('vs-prompts'), before)
  assert.equal(out.prompts.length, 2)
  assert.deepEqual(out.prompts[0], MINE)
  const fallback = out.prompts[1]
  assert.equal(fallback.derived, true)
  assert.equal(fallback.sourceId, 'c-3')
  assert.equal(fallback.title, CP3.title)
  assert.equal(fallback.text, CP3.text)
  assert.deepEqual(out.missing, ['c-3'])
  assert.deepEqual(getPrompts(storage), [MINE], 'the stored library is still without the copy')
})

test('a saved id the catalog does not hold, or no catalog at all, is skipped without a write', () => {
  const storage = lib([MINE], [saved('c-99')])
  assert.deepEqual(readPromptLibrary(storage, { catalog: CATALOG }).prompts, [MINE])
  const bare = readPromptLibrary(storage)
  assert.deepEqual(bare.prompts, [MINE])
  assert.deepEqual(bare.missing, ['c-99'])
  assert.equal(storage.writes, 0)
})

test('a saved id that already has its copy is not reported or duplicated', () => {
  const storage = lib([copyOf(CP3)], [saved('c-3')])
  const out = readPromptLibrary(storage, { catalog: CATALOG })
  assert.equal(out.prompts.length, 1)
  assert.deepEqual(out.missing, [])
})

test('repair adds a copy for each saved id that has none, and only those', () => {
  const have = copyOf(CP4)
  const storage = lib([MINE, have], [saved('c-3'), saved('c-4'), saved('c-5'), { id: 'c-6', saved: false, at: 900 }])
  const catalog = [...CATALOG, { id: 'c-6', title: 'Unsaved', text: 'Unsaved prompt.', tags: '' }]
  const added = repairMissingCopies({ storage, catalog, now: 9000 })
  assert.deepEqual(added.map((c) => c.sourceId).sort(), ['c-3', 'c-5'])
  const after = getPrompts(storage)
  assert.equal(after.length, 4)
  assert.deepEqual(after.find((p) => p.id === 1), MINE)
  assert.deepEqual(after.find((p) => p.id === 5000), have)
  assert.equal(after.some((p) => p.sourceId === 'c-6'), false, 'an unsaved id gets no copy')
  const c3 = after.find((p) => p.sourceId === 'c-3')
  assert.equal(c3.title, CP3.title)
  assert.equal(c3.text, CP3.text)
  assert.equal(c3.savedAt, 9000)
  assert.equal(new Set(after.map((p) => p.id)).size, after.length, 'every copy has its own id')
})

test('repair never changes an existing copy, edited or not, and never adds a second for it', () => {
  const edited = copyOf(CP3, { text: 'My own rewrite.', editedAt: 3000 })
  const legacy = { id: 7, title: CP4.title, text: CP4.text, tags: CP4.tags } // saved before sourceId existed
  const storage = lib([edited, legacy, MINE], [saved('c-3'), saved('c-4'), saved('c-5')])
  repairMissingCopies({ storage, catalog: CATALOG, now: 9000 })
  const after = getPrompts(storage)
  assert.deepEqual(after.find((p) => p.id === 5000), edited, 'the edited copy is untouched')
  assert.deepEqual(after.find((p) => p.id === 7), legacy, 'a legacy copy is recognised, not duplicated')
  assert.deepEqual(after.find((p) => p.id === 1), MINE)
  assert.equal(after.filter((p) => p.sourceId === 'c-3').length, 1)
  assert.equal(after.filter((p) => p.title === CP4.title).length, 1)
  assert.equal(after.length, 4, 'only c-5 was added')
})

test('a copy edited while the repair waits for the catalog survives', async () => {
  const storage = lib([copyOf(CP3)], [saved('c-3'), saved('c-5')])
  const loadCatalog = async () => {
    // The person edits their copy, and another save lands, before the catalog arrives.
    storage.setItem('vs-prompts', JSON.stringify([copyOf(CP3, { text: 'Edited meanwhile.', editedAt: 8000 }), MINE]))
    return CATALOG
  }
  assert.equal(await repairPromptLibraryAfterSync(storage, { loadCatalog, now: 9000 }), 1)
  const after = getPrompts(storage)
  assert.equal(after.find((p) => p.sourceId === 'c-3').text, 'Edited meanwhile.')
  assert.ok(after.some((p) => p.id === 1), 'the entry that arrived meanwhile is kept')
  assert.ok(after.some((p) => p.sourceId === 'c-5'))
})

test('running the repair twice changes nothing the second time', async () => {
  const storage = lib([MINE], [saved('c-3'), saved('c-4')])
  assert.equal(repairMissingCopies({ storage, catalog: CATALOG, now: 9000 }).length, 2)
  const once = storage.getItem('vs-prompts')
  const writes = storage.writes
  assert.deepEqual(repairMissingCopies({ storage, catalog: CATALOG, now: 9500 }), [])
  assert.equal(storage.getItem('vs-prompts'), once)
  assert.equal(storage.writes, writes, 'the second run does not write')
  assert.equal(await repairPromptLibraryAfterSync(storage, { loadCatalog: async () => CATALOG, now: 9900 }), 0)
  assert.equal(storage.getItem('vs-prompts'), once)
})

test('the after-sync step does not load the catalog when nothing is missing', async () => {
  const storage = lib([copyOf(CP3)], [saved('c-3')])
  let loaded = 0
  const added = await repairPromptLibraryAfterSync(storage, { loadCatalog: async () => { loaded += 1; return CATALOG } })
  assert.equal(added, 0)
  assert.equal(loaded, 0)
  assert.equal(storage.writes, 0)
})

test('an id the catalog does not hold is left in the saved set, and no copy is invented', async () => {
  const storage = lib([MINE], [saved('c-99')])
  assert.equal(await repairPromptLibraryAfterSync(storage, { loadCatalog: async () => CATALOG }), 0)
  assert.deepEqual(getPrompts(storage), [MINE])
  assert.deepEqual(getSaveLedger(storage), [saved('c-99')], 'the saved id is not dropped')
  assert.equal(storage.writes, 0)
})

test('a stored library that will not parse is not replaced', () => {
  const storage = memoryStorage({ 'vs-prompts': '{not json', 'vs-saved-prompt-ids': JSON.stringify([saved('c-3')]) })
  assert.deepEqual(repairMissingCopies({ storage, catalog: CATALOG }), [])
  assert.equal(storage.getItem('vs-prompts'), '{not json')
  assert.equal(storage.writes, 0)
})

test('a missing library key is treated as an empty library and gets the copies', () => {
  const storage = memoryStorage({ 'vs-saved-prompt-ids': JSON.stringify([saved('c-3')]) })
  assert.equal(repairMissingCopies({ storage, catalog: CATALOG, now: 9000 }).length, 1)
  assert.equal(getPrompts(storage)[0].sourceId, 'c-3')
})

test('the repair is an ordinary local edit: the next look stamps the library for syncing up', async () => {
  const storage = lib([MINE], [saved('c-3')])
  const meta = emptyMeta()
  detectLocalChanges(storage, meta, 1000) // first look at what is stored
  assert.deepEqual(detectLocalChanges(storage, meta, 2000), [])
  await repairPromptLibraryAfterSync(storage, { loadCatalog: async () => CATALOG, now: 3000 })
  const changed = detectLocalChanges(storage, meta, 4000)
  assert.deepEqual(changed, ['vs-prompts'])
  assert.equal(meta.stamps['vs-prompts'], 4000)
})

test('savedIdsWithoutCopy matches by sourceId, and with a catalog by identical title and text', () => {
  const legacy = { id: 7, title: CP4.title, text: CP4.text }
  assert.deepEqual(savedIdsWithoutCopy([legacy], ['c-4']).map((g) => g.id), ['c-4'], 'without a catalog a legacy copy cannot be matched')
  assert.deepEqual(savedIdsWithoutCopy([legacy], ['c-4'], CATALOG), [])
  assert.deepEqual(savedIdsWithoutCopy([copyOf(CP3)], ['c-3', 'c-5'], CATALOG).map((g) => g.id), ['c-5'])
})

// ── Round 2: a deleted copy stays deleted; a late repair writes nothing ──────

test('deleting a copy with a sourceId clears its Save, so the repair does not bring it back', async () => {
  const storage = lib([MINE, copyOf(CP3)], [saved('c-3')])
  const out = removeStoredPrompt(5000, { storage, catalog: CATALOG, now: 7000 })
  assert.equal(out.removed.sourceId, 'c-3')
  assert.deepEqual(getPrompts(storage), [MINE])
  assert.equal(getSavedIds(storage).has('c-3'), false)
  assert.deepEqual(getSaveLedger(storage), [{ id: 'c-3', saved: false, at: 7000 }], 'an unsave entry, so it syncs')
  const writes = storage.writes
  assert.equal(await repairPromptLibraryAfterSync(storage, { loadCatalog: async () => CATALOG }), 0)
  assert.equal(storage.writes, writes)
  assert.deepEqual(getPrompts(storage), [MINE])
})

test('deleting a legacy copy (no sourceId) clears the Save found by title and text', async () => {
  const legacy = { id: 7, title: CP4.title, text: CP4.text, tags: CP4.tags }
  const storage = lib([legacy, MINE], [saved('c-4'), saved('c-3')])
  removeStoredPrompt(7, { storage, catalog: CATALOG, now: 7000 })
  assert.deepEqual([...getSavedIds(storage)], ['c-3'], 'only the matching Save is cleared')
  assert.equal(await repairPromptLibraryAfterSync(storage, { loadCatalog: async () => CATALOG, now: 8000 }), 1)
  const after = getPrompts(storage)
  assert.equal(after.some((p) => p.title === CP4.title), false, 'the deleted legacy copy stays gone')
  assert.ok(after.some((p) => p.sourceId === 'c-3'))
})

test('deleting your own prompt, or an id that is not there, changes no Save', () => {
  const storage = lib([MINE, copyOf(CP3)], [saved('c-3')])
  removeStoredPrompt(1, { storage, catalog: CATALOG })
  assert.deepEqual([...getSavedIds(storage)], ['c-3'])
  removeStoredPrompt(404, { storage, catalog: CATALOG })
  assert.deepEqual([...getSavedIds(storage)], ['c-3'])
  assert.equal(getPrompts(storage).length, 1)
})

test('the settle step does nothing when the data document was not part of the read', () => {
  const storage = lib([MINE], [saved('c-3')])
  assert.equal(repairAfterSettle({ library: {} }, storage, { loadCatalog: async () => CATALOG }), null)
  assert.equal(repairAfterSettle({}, storage, { loadCatalog: async () => CATALOG }), null)
  assert.equal(storage.writes, 0)
})

test('the settle step repairs and announces when the data document was read', async () => {
  const storage = lib([MINE], [saved('c-3')])
  const announced = []
  await repairAfterSettle({ data: {} }, storage, { loadCatalog: async () => CATALOG, now: 9000, announce: (k) => announced.push(k) })
  assert.equal(getPrompts(storage).filter((p) => p.sourceId === 'c-3').length, 1)
  assert.deepEqual(announced, [['vs-prompts']])
})

test('a sign-out or user switch while the catalog loads: no write and no announcement', async () => {
  const storage = lib([MINE], [saved('c-3')])
  const announced = []
  let current = true
  await repairAfterSettle({ data: {} }, storage, {
    loadCatalog: async () => { current = false; return CATALOG },
    isCurrent: () => current,
    announce: (k) => announced.push(k),
  })
  assert.equal(storage.writes, 0, 'nothing is written into the cache that is current now')
  assert.deepEqual(getPrompts(storage), [MINE])
  assert.deepEqual(announced, [])
})

test('a failing catalog load in the settle step is swallowed', async () => {
  const storage = lib([MINE], [saved('c-3')])
  await repairAfterSettle({ data: {} }, storage, { loadCatalog: async () => { throw new Error('offline') } })
  assert.equal(storage.writes, 0)
})
