// Account-bound data: what follows the person rather than the browser.
//
// Settings and user-specific state follow the account, not the browser.
// These tests hold the pure rules in src/utils/accountSync.js:
// which keys follow the account, how a change is noticed, and what happens on
// the first sign-in, a returning sign-in and a sign-in as somebody else.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  ACCOUNT_KEYS, ACCOUNT_KEY_NAMES, STORAGE_INVENTORY, ACCOUNT_MIRROR_KEYS,
  emptyMeta, readLocal, detectLocalChanges, pendingKeys, reconcile, buildDoc,
  applyToStorage, releaseCache, remoteStamp, unionList, fingerprint, sameValue,
} from '../../src/utils/accountSync.js'
import { KEY_PURPOSES } from '../../src/utils/dataExport.js'
import { DEFAULT_DESIGN } from '../../src/data/designDefaults.js'

function store(seed = {}) {
  const m = new Map(Object.entries(seed))
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    has: (k) => m.has(k),
    dump: () => Object.fromEntries(m),
  }
}

// ── The inventory is complete ──────────────────────────────────────────────

const SRC = path.join(process.cwd(), 'src')
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) return walk(p)
    return /\.(jsx?|mjs)$/.test(e.name) ? [p] : []
  })
}
const stripComments = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^\s*\/\/.*$/gm, ' ')
  .replace(/\s\/\/.*$/gm, ' ')

// Custom event names share the prefix but are not storage.
const EVENTS = new Set(['vs-local-change', 'vs-sync-applied', 'vs-sync-refused', 'vs-appearance-changed', 'vs-sync-reset'])

test('every vs- storage key in src/ is classified in STORAGE_INVENTORY', () => {
  const found = new Set()
  for (const file of walk(SRC)) {
    if (file.endsWith(path.join('data', 'pipeline.js'))) continue // untracked local file, not app code
    const code = stripComments(fs.readFileSync(file, 'utf8'))
    for (const m of code.matchAll(/['"`](vs-[a-z0-9-]+)(?=[:'"`$])/g)) found.add(m[1].replace(/-+$/, ''))
  }
  const unclassified = [...found].filter((k) => {
    if (EVENTS.has(k) || STORAGE_INVENTORY[k]) return false
    // A stem (vs-usage-<tool>-<date>, vs-billing-dismissed:<id>) counts once.
    return !Object.keys(STORAGE_INVENTORY).some((known) => k.startsWith(`${known}-`))
  })
  assert.deepEqual(unclassified, [], `classify these in src/utils/accountSync.js: ${unclassified.join(', ')}`)
})

test('every key the privacy export describes is classified too', () => {
  const missing = Object.keys(KEY_PURPOSES).filter((k) => k.startsWith('vs-') && !STORAGE_INVENTORY[k])
  assert.deepEqual(missing, [])
})

test('every account key is inventoried as account, and nothing else is', () => {
  for (const key of ACCOUNT_KEY_NAMES) assert.equal(STORAGE_INVENTORY[key]?.scope, 'account', key)
  const extra = Object.entries(STORAGE_INVENTORY)
    .filter(([k, v]) => v.scope === 'account' && !ACCOUNT_KEY_NAMES.includes(k)).map(([k]) => k)
  assert.deepEqual(extra, [])
})

test('the required keys are covered: settings, theme, prompts, icons, design, exports', () => {
  for (const key of ['vs-t', 'vs-lang', 'vs-appearance', 'vs-prompts', 'vs-custom-icons',
    'vs-current-design', 'vs-recent-exports', 'vs-saved-prompt-ids', 'vs-icon-stroke-px']) {
    assert.ok(ACCOUNT_KEY_NAMES.includes(key), key)
  }
  assert.ok(ACCOUNT_MIRROR_KEYS.includes('vs-onboarded'))
})

// ── A change is noticed by looking ──────────────────────────────────────────

test('a same-tab change is stamped without anyone announcing it', () => {
  // The defect: the old hook only pushed on the cross-tab `storage` event and on
  // an event nothing dispatched. Here nothing is dispatched either.
  const s = store({ 'vs-t': 'light' })
  const meta = emptyMeta()
  detectLocalChanges(s, meta, 1000) // first look: learns what is there
  s.setItem('vs-t', 'dark')
  const changed = detectLocalChanges(s, meta, 2000)
  assert.deepEqual(changed, ['vs-t'])
  assert.equal(meta.stamps['vs-t'], 2000)
  assert.deepEqual(pendingKeys(meta), ['vs-t'])
  assert.deepEqual(detectLocalChanges(s, meta, 3000), [], 'no change, no stamp')
})

test('a key that was never there is not an edit', () => {
  const meta = emptyMeta()
  assert.deepEqual(detectLocalChanges(store(), meta, 1), [])
})

test('writing the account\'s value locally is not mistaken for a local edit', () => {
  const s = store()
  const meta = emptyMeta()
  detectLocalChanges(s, meta, 1)
  applyToStorage(s, meta, { 'vs-t': 'dark', 'vs-prompts': [{ id: 1 }] })
  assert.equal(s.getItem('vs-t'), 'dark', 'strings stay bare, as ThemeContext writes them')
  assert.equal(s.getItem('vs-prompts'), '[{"id":1}]')
  assert.deepEqual(detectLocalChanges(s, meta, 2), [])
})

// ── First sign-in on a device (BIND): local work migrates up ────────────────

test('BIND: an account setting beats the fresh browser, a missing one goes up', () => {
  const meta = emptyMeta()
  const local = { 'vs-t': 'light', 'vs-lang': 'fr' }
  const remote = { data: { 'vs-t': 'dark', _stamps: { 'vs-t': 50 }, _updatedAt: 50 }, library: null }
  const r = reconcile({ uid: 'A', meta, local, remote, now: 100 })
  assert.equal(r.mode, 'bind')
  assert.equal(r.apply['vs-t'], 'dark')
  assert.equal(r.apply['vs-lang'], undefined, 'local language kept')
  assert.equal(r.push, true, 'the language the account lacked goes up')
  assert.equal(r.owner, 'A')
})

test('BIND: work done signed out wins and goes up (the export-gate sign-in)', () => {
  const design = { ...DEFAULT_DESIGN, palette: { ...DEFAULT_DESIGN.palette, colors: ['#123456'] } }
  const r = reconcile({
    uid: 'A', meta: emptyMeta(), now: 100,
    local: { 'vs-current-design': design },
    remote: { data: { 'vs-current-design': DEFAULT_DESIGN, _updatedAt: 10 }, library: null },
  })
  assert.equal(r.apply['vs-current-design'], undefined)
  assert.equal(r.push, true)
})

test('BIND: an untouched default design never overwrites the account (second device)', () => {
  const accountDesign = { ...DEFAULT_DESIGN, palette: { ...DEFAULT_DESIGN.palette, colors: ['#abcdef'] } }
  const r = reconcile({
    uid: 'A', meta: emptyMeta(), now: 100,
    local: { 'vs-current-design': DEFAULT_DESIGN, 'vs-t': 'system' },
    remote: { data: { 'vs-current-design': accountDesign, 'vs-t': 'dark', _updatedAt: 10 }, library: null },
  })
  assert.deepEqual(r.apply['vs-current-design'], accountDesign)
  assert.equal(r.apply['vs-t'], 'dark')
})

test('BIND: collections keep both sides, once each', () => {
  const r = reconcile({
    uid: 'A', meta: emptyMeta(), now: 100,
    local: { 'vs-prompts': [{ id: 2, t: 'local' }, { id: 1, t: 'dup' }], 'vs-palette-likes': ['p3'] },
    remote: { data: { 'vs-prompts': [{ id: 1, t: 'acct' }], 'vs-palette-likes': ['p1', 'p3'], _updatedAt: 5 }, library: null },
  })
  assert.deepEqual(r.apply['vs-prompts'], [{ id: 1, t: 'acct' }, { id: 2, t: 'local' }])
  assert.deepEqual(r.apply['vs-palette-likes'], ['p1', 'p3'])
  assert.equal(r.push, true)
})

test('BIND: recency lists keep local first and respect the cap', () => {
  const localExports = Array.from({ length: 15 }, (_, i) => ({ id: `l${i}` }))
  const remoteExports = Array.from({ length: 15 }, (_, i) => ({ id: `r${i}` }))
  const r = reconcile({
    uid: 'A', meta: emptyMeta(), now: 1,
    local: { 'vs-recent-exports': localExports },
    remote: { data: { 'vs-recent-exports': remoteExports, _updatedAt: 1 }, library: null },
  })
  assert.equal(r.apply['vs-recent-exports'].length, 20)
  assert.equal(r.apply['vs-recent-exports'][0].id, 'l0')
})

// ── Signing in as somebody else (SWITCH) ────────────────────────────────────

test('SWITCH: the previous account\'s cache never goes up into the new one', () => {
  const meta = { ...emptyMeta(), owner: 'A', stamps: { 'vs-prompts': 900 } }
  const r = reconcile({
    uid: 'B', meta, now: 1000,
    local: { 'vs-prompts': [{ id: 'a-secret' }], 'vs-t': 'dark' },
    remote: { data: { 'vs-t': 'light', _stamps: { 'vs-t': 5 }, _updatedAt: 5 }, library: null },
  })
  assert.equal(r.mode, 'switch')
  assert.equal(r.push, false)
  assert.equal(r.apply['vs-prompts'], null, 'A\'s prompts leave the device cache')
  assert.equal(r.apply['vs-t'], 'light')
})

// ── A returning sign-in (SYNC): the newer side of each key ──────────────────

test('SYNC: per key — an older theme here does not undo a newer prompt there', () => {
  const meta = { ...emptyMeta(), owner: 'A', stamps: { 'vs-t': 300, 'vs-prompts': 100 } }
  const r = reconcile({
    uid: 'A', meta, now: 400,
    local: { 'vs-t': 'dark', 'vs-prompts': [] },
    remote: { data: { 'vs-t': 'light', 'vs-prompts': [{ id: 9 }], _stamps: { 'vs-t': 200, 'vs-prompts': 250 }, _updatedAt: 250 }, library: null },
  })
  assert.deepEqual(r.apply['vs-prompts'], [{ id: 9 }])
  assert.equal(r.apply['vs-t'], undefined)
  assert.equal(r.push, true, 'the newer theme goes up')
})

test('SYNC: a delete made elsewhere later removes the key here', () => {
  const meta = { ...emptyMeta(), owner: 'A', stamps: { 'vs-community-handle': 10 } }
  const r = reconcile({
    uid: 'A', meta, now: 50,
    local: { 'vs-community-handle': 'old' },
    remote: { data: { 'vs-community-handle': null, _stamps: { 'vs-community-handle': 20 }, _updatedAt: 20 }, library: null },
  })
  assert.equal(r.apply['vs-community-handle'], null)
})

test('a document from the old hook (only _updatedAt) is one change at that time', () => {
  assert.equal(remoteStamp({ _updatedAt: 70, 'vs-t': 'dark' }, 'vs-t'), 70)
  // An old tab writing after a new client: _updatedAt newer than every stamp.
  assert.equal(remoteStamp({ _updatedAt: 90, _stamps: { 'vs-t': 40, 'vs-lang': 60 } }, 'vs-t'), 90)
  assert.equal(remoteStamp({ _updatedAt: 60, _stamps: { 'vs-t': 40, 'vs-lang': 60 } }, 'vs-t'), 40)
})

test('an unread document decides nothing', () => {
  const r = reconcile({ uid: 'A', meta: { ...emptyMeta(), owner: 'A' }, now: 1, local: { 'vs-custom-icons': [{ key: 'k' }] }, remote: { data: null } })
  assert.equal(r.apply['vs-custom-icons'], undefined)
})

// ── The document written up ─────────────────────────────────────────────────

test('buildDoc writes the whole document, every value with its stamp', () => {
  const docData = buildDoc('data', { 'vs-t': 'dark' }, { 'vs-t': 5, 'vs-lang': 3 })
  assert.equal(docData['vs-t'], 'dark')
  assert.equal(docData['vs-lang'], null)
  assert.equal(docData._stamps['vs-t'], 5)
  assert.equal(docData._updatedAt, 5)
  assert.equal(Object.hasOwn(docData, 'vs-custom-icons'), false, 'icons live in their own document')
  assert.ok(ACCOUNT_KEYS.every((k) => ['data', 'library'].includes(k.doc)))
})

// ── Sign-out releases the cache ─────────────────────────────────────────────

test('sign-out clears the account keys and the onboarding mirror once everything is up', () => {
  const s = store({ 'vs-t': 'dark', 'vs-prompts': '[]', 'vs-onboarded': '1', 'vs-accounts': '[]' })
  const meta = { ...emptyMeta(), owner: 'A', stamps: { 'vs-t': 5 }, pushed: { 'vs-t': 5 } }
  const out = releaseCache(s, meta)
  assert.equal(out.released, true)
  assert.equal(s.has('vs-t'), false)
  assert.equal(s.has('vs-onboarded'), false, 'the next account is not told it has onboarded')
  assert.equal(s.has('vs-accounts'), true, 'the switcher\'s device list stays')
  assert.equal(meta.owner, null)
})

test('sign-out keeps the cache while a change has not reached the account', () => {
  const s = store({ 'vs-t': 'dark' })
  const meta = { ...emptyMeta(), owner: 'A', stamps: { 'vs-t': 9 }, pushed: { 'vs-t': 5 } }
  assert.equal(releaseCache(s, meta).released, false)
  assert.equal(s.getItem('vs-t'), 'dark')
  assert.equal(meta.owner, 'A')
})

// ── Helpers ─────────────────────────────────────────────────────────────────

test('helpers: union identity and fingerprints', () => {
  assert.deepEqual(unionList([{ key: 'a' }, 1], [{ key: 'a', x: 1 }, 1, 2]), [{ key: 'a' }, 1, 2])
  assert.notEqual(fingerprint('ab'), fingerprint('ba'))
  assert.equal(fingerprint(null), '')
  assert.deepEqual(readLocal(store({ 'vs-t': 'dark', 'vs-prompts': '[1]' }), ['vs-t', 'vs-prompts', 'vs-lang']),
    { 'vs-t': 'dark', 'vs-prompts': [1], 'vs-lang': undefined })
})

// ── Key order is not a change ───────────────────────────────────────────────

test('the account echoing a value back with its keys reordered is not a change', () => {
  // Firestore does not promise to return a map's keys in the order they were
  // written. Compared as plain JSON, a device's own write echoed back looked
  // "different" with an equal stamp, and every snapshot pushed again — a loop.
  assert.equal(sameValue({ a: 1, b: { c: 2, d: 3 } }, { b: { d: 3, c: 2 }, a: 1 }), true)
  assert.equal(sameValue([{ a: 1, b: 2 }], [{ b: 2, a: 1 }]), true)
  assert.equal(sameValue([1, 2], [2, 1]), false, 'array order is meaning, not noise')
  const design = { palette: { colors: ['#123456'], seed: '#123456' }, fonts: { heading: 'Inter' } }
  const echoed = { fonts: { heading: 'Inter' }, palette: { seed: '#123456', colors: ['#123456'] } }
  const meta = { ...emptyMeta(), owner: 'A', stamps: { 'vs-current-design': 50 } }
  const r = reconcile({
    uid: 'A', meta, now: 60,
    local: { 'vs-current-design': design },
    remote: { data: { 'vs-current-design': echoed, _stamps: { 'vs-current-design': 50 }, _updatedAt: 50 }, library: null },
  })
  assert.equal(r.push, false, 'its own write, echoed, sent it round again')
  assert.deepEqual(r.apply, {})
})
