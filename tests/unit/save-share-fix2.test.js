// Fix round 2 for the gradient "Save or share" slice: copied links open editable,
// the migration reads the browser key after the listing, the ownership check on a
// repeated queue write, and the sign-up stash outliving the sign-in.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { gradientToolUrl, decodeGradientParams } from '../../src/data/gradientGallery.js'
import { migrateGradientSubmissions, GRADIENT_SUBMISSIONS_KEY } from '../../src/utils/gradientSubmissions.js'
import { stashPendingSave, takePendingSave, clearPendingSave } from '../../src/utils/pendingSave.js'

const read = (rel) => fs.readFileSync(path.resolve(process.cwd(), rel), 'utf8')
const STOPS = [{ color: '#1F4B8E', position: 0 }, { color: '#3FA9A0', position: 100 }]
const params = (url) => new URL(url, 'https://x.test').searchParams

/* ── copied links versus library hand-offs ───────────────────────────────── */

test('a copied link carries src=link and the decoder reads it as a link', () => {
  const url = gradientToolUrl({ type: 'Linear', angle: 135, stops: STOPS, gi: 'srgb', src: 'link' })
  assert.match(url, /&src=link$/)
  assert.equal(decodeGradientParams(params(url)).link, true)
})

test('a library hand-off has no src, so it is not a link and keeps opening locked', () => {
  const url = gradientToolUrl({ type: 'Linear', angle: 90, stops: STOPS, name: 'Harbour fade' })
  assert.ok(!url.includes('src='), 'the library URL is unchanged')
  assert.equal(decodeGradientParams(params(url)).link, false)
})

test('any other src value is not a link', () => {
  const p = params('/create/gradient?gs=1F4B8E-0_3FA9A0-100&gt=linear&ga=90&src=gallery')
  assert.equal(decodeGradientParams(p).link, false)
})

test('the generator marks only the person’s own gradient as a link, and opens a link editable', () => {
  const src = read('src/pages/GradientGenerator.jsx')
  assert.match(src, /src: fromLibrary \? undefined : 'link'/)
  assert.match(src, /setFromLibrary\(!incoming\.link\)/)
  assert.match(src, /'gi', 'src'\]\.forEach/, 'the marker leaves the address bar with the other hand-off keys')
})

/* ── the migration reads the key after the listing ───────────────────────── */

function memoryStorage(list) {
  const map = new Map([[GRADIENT_SUBMISSIONS_KEY, JSON.stringify(list)]])
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)) },
    removeItem: (k) => { map.delete(k) },
    has: () => map.has(GRADIENT_SUBMISSIONS_KEY),
    replace: (v) => map.set(GRADIENT_SUBMISSIONS_KEY, JSON.stringify(v)),
  }
}
const draft = (over = {}) => ({ id: 'g1', name: 'Harbour Dusk', type: 'Linear', angle: 90, stops: STOPS, ...over })

test('an entry another tab removed while the listing ran is not published', async () => {
  const s = memoryStorage([draft({ id: 'a' }), draft({ id: 'b', name: 'Other' })])
  const published = []
  const out = await migrateGradientSubmissions({
    user: { uid: 'u1', displayName: 'D' },
    storage: s,
    // The second tab withdrew "a" while this one waited for the list.
    list: async () => { s.replace([draft({ id: 'b', name: 'Other' })]); return [] },
    publish: async (record, { id }) => { published.push(id); return { id, created: true } },
  })
  assert.deepEqual(published, ['u1_b'])
  assert.equal(out.published, 1)
})

test('a key the other tab emptied during the listing is cleared and nothing is published', async () => {
  const s = memoryStorage([draft({ id: 'a' })])
  let calls = 0
  const out = await migrateGradientSubmissions({
    user: { uid: 'u1', displayName: 'D' },
    storage: s,
    list: async () => { s.replace([]); return [] },
    publish: async () => { calls += 1; return { created: true } },
  })
  assert.equal(calls, 0)
  assert.equal(out.cleared, true)
  assert.equal(s.has(), false)
})

/* ── the ownership check on a repeated write ─────────────────────────────── */

test('"already there" needs the stored document to carry this author’s uid', () => {
  const src = read('src/utils/communityQueueApi.js')
  const body = src.slice(src.indexOf('export async function publishToQueueOnce'), src.indexOf('export async function listMySubmissions'))
  assert.match(body, /snap\.data\(\)\?\.authorUid === uid/)
  assert.match(body, /Boolean\(uid\)/, 'a record with no uid can never match a document with none')
  assert.match(body, /throw err/)
})

/* ── the sign-up stash ───────────────────────────────────────────────────── */

function sessionStub() {
  const map = new Map()
  return { getItem: (k) => (map.has(k) ? map.get(k) : null), setItem: (k, v) => map.set(k, String(v)), removeItem: (k) => map.delete(k) }
}

test('a stash is found by a remount until something clears it, and is consumed once', () => {
  const s = sessionStub()
  stashPendingSave('gradient', 'Harbour', s)
  assert.equal(takePendingSave('gradient', s), 'Harbour')
  assert.equal(takePendingSave('gradient', s), null, 'read once')
  stashPendingSave('gradient', 'Harbour', s)
  clearPendingSave(s)
  assert.equal(takePendingSave('gradient', s), null)
})

test('the sign-in resolving no longer clears the stash; a save, a cancel or a closed menu does', () => {
  for (const file of ['src/pages/GradientGenerator.jsx', 'src/pages/PaletteBuilder.jsx']) {
    const src = read(file)
    const start = src.indexOf('const doSave = async')
    const doSave = src.slice(start, src.indexOf('setPendingSave(name)', start))
    assert.doesNotMatch(doSave, /if \(!mountedRef\.current\) return\r?\n\s*clearPendingSave\(\)/, `${file}: cleared before the remount`)
    assert.match(doSave, /if \(!signedIn\) \{ clearPendingSave\(\)/, `${file}: a cancelled sign-in clears it`)
    assert.match(doSave, /if \(!saveOpenRef\.current\) \{ clearPendingSave\(\)/, `${file}: a closed menu clears it`)
  }
  const gradient = read('src/pages/GradientGenerator.jsx')
  // Inside closeSave itself, not anywhere after it in the file.
  const closeSave = gradient.slice(gradient.indexOf('const closeSave = useCallback'), gradient.indexOf('saveTriggerRef.current?.focus()'))
  assert.match(closeSave, /clearPendingSave\(\)/, 'closing the gradient menu drops the stash')
  // The save that runs once the account is known clears it before it saves (browser: spec 169, "the sign-up stash").
  for (const file of ['src/pages/GradientGenerator.jsx', 'src/pages/PaletteBuilder.jsx']) {
    const src = read(file)
    const effect = src.slice(src.indexOf('if (pendingSave == null || !canSaveProjects) return'))
    assert.match(effect.slice(0, effect.indexOf('saveProject(pendingSave)')), /clearPendingSave\(\)/, `${file}: the waiting save clears the stash as it runs`)
  }
  const palette = read('src/pages/PaletteBuilder.jsx')
  const closers = palette.slice(palette.indexOf('const closeAllMenus = useCallback'), palette.indexOf('The rail-fit measurement'))
  assert.equal((closers.match(/setPendingSave\(null\); clearPendingSave\(\)/g) || []).length, 2, 'both palette closers drop a waiting save')
})

/* ── the Save button waits for the account ───────────────────────────────── */

test('Save is disabled while the account loads, on both tools', () => {
  const menu = read('src/components/tool/SaveShareMenu.jsx')
  assert.match(menu, /disabled=\{busy\}/)
  assert.match(menu, /if \(busy\) return/)
  assert.match(read('src/pages/GradientGenerator.jsx'), /busy=\{authLoading\}/)
  assert.match(read('src/pages/PaletteBuilder.jsx'), /busy=\{authLoading\}/)
})

test('a repeat Save with the refusal showing refocuses the field and remounts the alert', () => {
  const menu = read('src/components/tool/SaveShareMenu.jsx')
  const press = menu.slice(menu.indexOf('const press = () =>'), menu.indexOf('useEffect(() => {\n    if (!dismiss)'))
  assert.match(press, /if \(nameError\)/)
  assert.match(press, /inputRef\.current\?\.focus/)
  assert.match(press, /setPressed/)
  assert.match(menu, /role="alert" key=\{pressed\}/)
})
