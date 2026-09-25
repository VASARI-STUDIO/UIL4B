// Recent exports and project icons on the project
//: both follow the person, not the browser.
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  exportEntry, addExport, recordExport, readRecentExports, formatOf, toolForPath,
  projectIdFrom, isToolExportPage, formatBytes, formatWhen, RECENT_EXPORTS_CAP, RECENT_EXPORTS_KEY,
} from '../../src/utils/recentExports.js'
import { installDownloadObserver } from '../../src/utils/downloadObserver.js'
import { planIconMigration, iconFor, iconMap } from '../../src/utils/projectIcons.js'
import { ACCOUNT_KEY_NAMES } from '../../src/utils/accountSync.js'

function store(seed = {}) {
  const m = new Map(Object.entries(seed))
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  }
}

test('an export records tool, format, filename, size, time and project', () => {
  const e = exportEntry({ filename: 'cobalt.tokens.json', bytes: 6963, pathname: '/create/palette', search: '?project=p1', now: 1000, rand: () => 0.5 })
  assert.equal(e.tool, 'palette')
  assert.equal(e.toolLabel, 'Palette')
  assert.equal(e.format, 'JSON')
  assert.equal(e.filename, 'cobalt.tokens.json')
  assert.equal(e.bytes, 6963)
  assert.equal(e.at, 1000)
  assert.equal(e.projectId, 'p1')
})

test('the list is newest first and capped at 20', () => {
  let list = []
  for (let i = 0; i < 25; i++) list = addExport(list, { id: `e${i}`, filename: `f${i}.css` })
  assert.equal(list.length, RECENT_EXPORTS_CAP)
  assert.equal(list[0].id, 'e24')
})

test('recording writes the account key the sync carries', () => {
  assert.ok(ACCOUNT_KEY_NAMES.includes(RECENT_EXPORTS_KEY))
  const s = store()
  recordExport(s, { id: 'a', filename: 'x.svg' })
  assert.deepEqual(readRecentExports(s).map((e) => e.id), ['a'])
})

test('helpers read the way the design draws the rows', () => {
  assert.equal(formatOf('hero-2400w.webp'), 'WEBP')
  assert.equal(formatOf('README'), 'FILE')
  assert.equal(formatBytes(4198), '4.1 KB')
  assert.equal(formatBytes(186368), '182 KB')
  assert.equal(formatBytes(null), null)
  assert.equal(formatWhen(0, 2 * 3600e3), '2H AGO')
  assert.equal(formatWhen(0, 30e3), 'JUST NOW')
  assert.equal(formatWhen(0, 30 * 3600e3), 'YESTERDAY')
  assert.equal(formatWhen(0, 3 * 86400e3), '3 DAYS AGO')
  assert.equal(projectIdFrom('/projects/abc', ''), 'abc')
  assert.equal(projectIdFrom('/create/tint', ''), null)
  assert.equal(toolForPath('/create/3d-viewer').label.length > 0, true)
  assert.equal(isToolExportPage('/settings'), false)
  assert.equal(isToolExportPage('/admin/users'), false)
  assert.equal(isToolExportPage('/create/icons'), true)
})

// ── The observer, against a stand-in window ─────────────────────────────────

function fakeWindow(pathname = '/create/palette') {
  const listeners = {}
  class Anchor {
    constructor() { this.attrs = {}; this.clicked = 0 }
    setAttribute(k, v) { this.attrs[k] = String(v) }
    getAttribute(k) { return this.attrs[k] ?? null }
    hasAttribute(k) { return k in this.attrs }
    set download(v) { this.setAttribute('download', v) }
    set href(v) { this.attrs.href = v }
    get href() { return this.attrs.href || '' }
  }
  Anchor.prototype.click = function click() { this.clicked++ }
  const urls = new Map()
  let n = 0
  const win = {
    location: { pathname, search: '' },
    localStorage: store(),
    HTMLAnchorElement: Anchor,
    URL: {
      createObjectURL: (blob) => { const u = `blob:x/${++n}`; urls.set(u, blob); return u },
      revokeObjectURL: (u) => { urls.delete(u) },
    },
    setTimeout: () => 0,
    CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init?.detail } },
    dispatchEvent: (e) => { (listeners[e.type] || []).forEach((f) => f(e)) },
    addEventListener: (t, f) => { (listeners[t] ||= []).push(f) },
    document: { addEventListener() {} },
  }
  return { win, Anchor }
}

test('a programmatic <a download>.click() — every tool\'s pattern — is recorded, with its size', () => {
  const { win, Anchor } = fakeWindow('/create/palette')
  installDownloadObserver(win)
  const a = new Anchor()
  a.href = win.URL.createObjectURL({ size: 4198 })
  a.download = 'colour-system.css'
  a.click()
  win.URL.revokeObjectURL(a.href)
  assert.equal(a.clicked, 1, 'the real click still happens')
  const [entry] = readRecentExports(win.localStorage)
  assert.equal(entry.filename, 'colour-system.css')
  assert.equal(entry.format, 'CSS')
  assert.equal(entry.bytes, 4198)
  assert.equal(entry.tool, 'palette')
})

test('a click without `download`, or on Settings\' own data export, is not a tool export', () => {
  const { win, Anchor } = fakeWindow('/settings')
  installDownloadObserver(win)
  const a = new Anchor()
  a.download = 'uil4b-export-2026-09-24.json'
  a.click()
  const b = new Anchor()
  b.href = '/somewhere'
  b.click()
  assert.deepEqual(readRecentExports(win.localStorage), [])
})

test('installing twice does not record twice', () => {
  const { win, Anchor } = fakeWindow()
  installDownloadObserver(win)
  assert.equal(installDownloadObserver(win), false)
  const a = new Anchor()
  a.download = 'p.png'
  a.click()
  assert.equal(readRecentExports(win.localStorage).length, 1)
})

// ── Project icons live on the project ───────────────────────────────────────

test('a local icon moves onto its project; the project\'s own icon wins; strangers stay', () => {
  const projects = [{ id: 'a' }, { id: 'b', icon: 'star' }]
  const { moves, remaining } = planIconMigration(projects, { a: 'bolt', b: 'moon', z: 'leaf' })
  assert.deepEqual(moves, [{ id: 'a', icon: 'bolt' }])
  assert.deepEqual(remaining, { z: 'leaf' }, 'another account\'s project is not ours to move or drop')
  assert.equal(iconFor({ id: 'b', icon: 'star' }, { b: 'moon' }), 'star')
  assert.deepEqual(iconMap(projects, { a: 'bolt' }), { a: 'bolt', b: 'star' })
})
