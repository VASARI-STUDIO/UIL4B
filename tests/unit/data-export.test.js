// "Export my data" must mean all of it.
//
// The audit (docs/account-lifecycle-audit-2026-08-12.md § A4) found the export
// iterating a HAND-MAINTAINED list of 15 keys while the app writes about forty.
// Measured on a real browser: 16 keys present, 9 absent from the list and so
// silently missing from a file the user was told was their data. `vs-accounts`
// — email, display name and photo URL for up to five accounts — was neither
// disclosed, exported, nor cleared.
//
// The rule these tests defend: enumerate by PREFIX, never by list. A list is a
// promise someone will remember to update it, and that promise had already been
// broken nine times.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  isOwnedKey, collectStorage, describeKey, buildExport, keysToClear,
  KEY_PURPOSES, CLEAR_EXCEPTIONS,
} from '../../src/utils/dataExport.js'

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8')

// A comment may legitimately quote the wrong claim it explains removing; only
// shipped text can BE the wrong claim. Same reasoning as plan-limits.test.js.
const stripComments = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^\s*\/\/.*$/gm, ' ')

// Minimal Storage stand-in — the real one is a browser API, and these rules
// have no business needing a browser to be checked.
function fakeStorage(entries) {
  const keys = Object.keys(entries)
  return {
    get length() { return keys.length },
    key: (i) => keys[i] ?? null,
    getItem: (k) => (k in entries ? entries[k] : null),
  }
}

// ── Ownership ───────────────────────────────────────────────────────────────

test('every key the app actually writes is recognised as ours', () => {
  // Scraped from the source rather than typed here, so a key added tomorrow is
  // covered by this assertion without anyone updating the test.
  const src = ['src', 'src/utils', 'src/pages', 'src/contexts', 'src/hooks', 'src/components']
  const found = new Set()
  const walk = (dir) => {
    for (const entry of fs.readdirSync(path.join(process.cwd(), dir), { withFileTypes: true })) {
      const rel = `${dir}/${entry.name}`
      if (entry.isDirectory()) { walk(rel); continue }
      if (!/\.jsx?$/.test(entry.name)) continue
      const text = fs.readFileSync(path.join(process.cwd(), rel), 'utf8')
      for (const m of text.matchAll(/['"`](vs-[a-z0-9-]+)['"`]/gi)) found.add(m[1])
    }
  }
  walk('src')
  assert.ok(found.size > 20, `expected to find many vs- keys, found ${found.size}`)
  for (const key of found) {
    assert.equal(isOwnedKey(key), true, `${key} would not be exported`)
  }
  void src
})

test('the one legacy key without the prefix is still ours', () => {
  // ab-palette-transfer predates the naming convention. Named explicitly so it
  // cannot be lost, and so the exception is visible rather than folklore.
  assert.equal(isOwnedKey('ab-palette-transfer'), true)
})

test('other sites\' keys are never touched', () => {
  for (const foreign of ['token', 'firebase:authUser:xyz', 'theme', '', null, undefined, 42]) {
    assert.equal(isOwnedKey(foreign), false, `${String(foreign)} must not be treated as ours`)
  }
})

// ── Collection ──────────────────────────────────────────────────────────────

test('collection takes every owned key, including ones nobody listed', () => {
  const store = fakeStorage({
    'vs-lang': '"en"',
    'vs-accounts': '[{"email":"a@b.c"}]',
    'vs-a-key-invented-after-this-test-was-written': '"surprise"',
    'ab-palette-transfer': '"#fff"',
    'some-other-app': 'nope',
  })
  const out = collectStorage(store)
  assert.deepEqual(Object.keys(out).sort(), [
    'ab-palette-transfer',
    'vs-a-key-invented-after-this-test-was-written',
    'vs-accounts',
    'vs-lang',
  ])
  assert.equal(out['some-other-app'], undefined)
})

test('vs-accounts is exported — it holds emails and was omitted entirely', () => {
  const out = collectStorage(fakeStorage({ 'vs-accounts': '[{"email":"a@b.c","displayName":"A"}]' }))
  assert.deepEqual(out['vs-accounts'], [{ email: 'a@b.c', displayName: 'A' }])
})

test('JSON is parsed for readability, non-JSON is kept verbatim', () => {
  const out = collectStorage(fakeStorage({ 'vs-a': '{"x":1}', 'vs-b': 'plain text' }))
  assert.deepEqual(out['vs-a'], { x: 1 })
  assert.equal(out['vs-b'], 'plain text')
})

test('a storage that throws yields an empty object, never a crash', () => {
  const hostile = {
    get length() { throw new Error('blocked') },
    key: () => { throw new Error('blocked') },
    getItem: () => { throw new Error('blocked') },
  }
  assert.deepEqual(collectStorage(hostile), {})
  assert.deepEqual(collectStorage(null), {})
})

// ── Disclosure ──────────────────────────────────────────────────────────────

test('an undescribed key is disclosed honestly, not dropped', () => {
  // The old failure mode was silence. A documentation gap must not become a
  // data gap in the file someone is relying on.
  const d = describeKey('vs-something-new')
  assert.equal(d.key, 'vs-something-new')
  assert.equal(d.pii, 'unknown')
  assert.match(d.purpose, /Not yet described/)
})

test('dated and per-item keys inherit their stem\'s description', () => {
  // Otherwise every new day and every new invoice creates an "undescribed" row.
  assert.equal(describeKey('vs-usage-alt-text-2026-08-12').purpose, KEY_PURPOSES['vs-usage'].purpose)
  assert.equal(describeKey('vs-billing-dismissed:payment:123').purpose, KEY_PURPOSES['vs-billing-dismissed'].purpose)
})

test('the keys holding personal data are marked as such', () => {
  for (const key of ['vs-accounts', 'vs-profile-cache']) {
    assert.equal(describeKey(key).pii, 'yes', `${key} holds identifying data and must say so`)
  }
})

// ── The finished file ───────────────────────────────────────────────────────

test('the export carries browser data, server data and the account identity', () => {
  const out = buildExport({
    local: { 'vs-lang': 'en' },
    session: { 'vs-chunk-reload': '1' },
    firestore: { profile: { displayName: 'A' }, sync: { projects: [] } },
    account: { uid: 'u1', email: 'a@b.c' },
  })
  assert.equal(out.browser.local['vs-lang'], 'en')
  assert.equal(out.browser.session['vs-chunk-reload'], '1')
  assert.deepEqual(out.server.sync, { projects: [] })
  assert.equal(out.account.email, 'a@b.c')
  assert.equal(out.about.includesServerData, true)
})

test('a signed-out export says so rather than looking identical to a failed one', () => {
  const out = buildExport({ local: { 'vs-lang': 'en' } })
  assert.equal(out.about.includesServerData, false)
  assert.equal(out.server, null)
  assert.equal(out.account, null)
})

test('the disclosure table is generated from the keys actually present', () => {
  const out = buildExport({ local: { 'vs-accounts': [], 'vs-mystery': 1 }, session: {} })
  const keys = out.disclosure.map((d) => d.key)
  assert.deepEqual(keys, ['vs-accounts', 'vs-mystery'])
  assert.equal(out.about.browserKeys, 2)
})

// ── Clearing ────────────────────────────────────────────────────────────────

test('clearing removes everything owned except what would sign you out', () => {
  const store = fakeStorage({
    'vs-lang': '"en"', 'vs-projects': '[]', 'vs-brand-new': '1',
    'vs-accounts': '[]', 'vs-admin-unlocked': 'true', 'vs-onboarded': 'true',
    'other-app': 'x',
  })
  const clearing = keysToClear(store)
  assert.deepEqual(clearing.sort(), ['vs-brand-new', 'vs-lang', 'vs-projects'])
  for (const kept of CLEAR_EXCEPTIONS) {
    assert.ok(!clearing.includes(kept), `${kept} must survive a preferences clear`)
  }
  assert.ok(!clearing.includes('other-app'))
})

// ── The wiring ──────────────────────────────────────────────────────────────

test('Settings exports by enumeration and reads the server too', () => {
  const src = read('src/pages/Settings.jsx')
  assert.ok(src.includes('collectStorage(window.localStorage)'), 'localStorage must be enumerated')
  assert.ok(src.includes('collectStorage(window.sessionStorage)'), 'sessionStorage must be enumerated')
  assert.ok(/sync', 'data'/.test(src), "users/{uid}/sync/data must be included — it holds the user's projects")
  assert.ok(src.includes('keysToClear'), 'clearing must enumerate too')
})

test('no page ships a second hand-written copy of the storage list', () => {
  // Three copies existed (Settings, Privacy, and the exporter's own). They had
  // drifted apart, and the Privacy one had drifted into being wrong.
  for (const file of ['src/pages/Settings.jsx', 'src/pages/Privacy.jsx']) {
    const src = read(file)
    assert.ok(!/\{ key: 'vs-lang', purpose:/.test(src),
      `${file} still hard-codes a storage disclosure list instead of deriving it`)
  }
  assert.ok(read('src/pages/Privacy.jsx').includes('KEY_PURPOSES'),
    'the privacy policy must derive its table from the shared source')
})

test('the privacy policy no longer claims to store passwords it does not have', () => {
  // It disclosed `vs-users` — "Account credentials (email + hashed password)" —
  // and `vs-session`. Neither key exists anywhere in the app; it moved to
  // Firebase Auth and stores no password, hashed or otherwise.
  const src = stripComments(read('src/pages/Privacy.jsx'))
  assert.ok(!/hashed password/.test(src), 'the policy must not claim to hold passwords')
  assert.ok(!/vs-users|vs-session\b/.test(src), 'the policy must not disclose keys that do not exist')
  assert.equal(KEY_PURPOSES['vs-users'], undefined, 'vs-users is not a real key')
  assert.equal(KEY_PURPOSES['vs-session'], undefined, 'vs-session is not a real key')
})

test('the "everything lives in your browser" claim is gone', () => {
  // False for a signed-in account: the profile and the synced design live in
  // Firestore, which is the whole point of syncing.
  const src = read('src/pages/Settings.jsx')
  assert.ok(!/Everything UIL4B stores lives in your browser/.test(src),
    'Settings still tells signed-in users their data never leaves the device')
})

// ── Corrupt storage must not white-screen the app ───────────────────────────

test('analytics survives a stored value of the wrong shape', async () => {
  // Found while verifying the export: seeding `vs-analytics` with a valid-JSON
  // OBJECT where an array was expected crashed the whole app with
  // "t.push is not a function" on every page view. `JSON.parse(...) || fallback`
  // only catches null, so the wrong shape sailed through and failed on the next
  // write — a white screen with no way for the user to know why, reachable by a
  // stale schema or by hand-restoring their own data export.
  const src = read('src/utils/analytics.js')
  assert.ok(/Array\.isArray\(fallback\) !== Array\.isArray\(parsed\)/.test(src),
    'load() must reject a parsed value whose shape does not match its fallback')
  assert.ok(!/JSON\.parse\(localStorage\.getItem\(key\)\) \|\| fallback/.test(src),
    'the unguarded `|| fallback` form must not come back')
})
