import test from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_PICK, GALLERY_CHECKOUT, GALLERY_DESIGNS, PICK_KEY, PICK_MAX_AGE_MS,
  chooseDesign, clearPick, exportLabel, isProPick, normalisePick, readPick, storePick,
} from '../../src/utils/kitGalleryPick.js'
import { EXPORT_FORMATS } from '../../src/config/exportFormats.js'

const memory = () => {
  const m = new Map()
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }
}

test('the default pick is the book as a PDF, and it is a Pro pick', () => {
  assert.deepEqual(DEFAULT_PICK, { design: 'book', format: 'pdf' })
  assert.equal(isProPick(DEFAULT_PICK), true)
})

test('tier follows the design, and agrees with the export table', () => {
  for (const d of GALLERY_DESIGNS) {
    const fmt = EXPORT_FORMATS.find((f) => f.id === d.id)
    assert.equal(Boolean(fmt?.pro), d.pro, `${d.id} tier differs from src/config/exportFormats.js`)
  }
  assert.equal(isProPick({ design: 'kit', format: 'html' }), false)
})

test('an unknown design or a file type the design lacks falls back', () => {
  assert.deepEqual(normalisePick({ design: 'nope', format: 'zip' }), { design: 'book', format: 'pdf' })
  assert.deepEqual(normalisePick({ design: 'kit', format: 'pdf' }), { design: 'kit', format: 'html' })
  assert.deepEqual(chooseDesign({ design: 'book', format: 'pdf' }, 'kit'), { design: 'kit', format: 'html' })
  assert.deepEqual(chooseDesign({ design: 'kit', format: 'html' }, 'guidelines'), { design: 'guidelines', format: 'html' })
})

test('the button names the file', () => {
  assert.equal(exportLabel({ design: 'kit', format: 'html' }), 'Export HTML')
})

test('the pick survives a round trip and clears after use', () => {
  const storage = memory()
  assert.equal(storePick('abc123', { design: 'guidelines', format: 'html' }, { storage, now: 1000 }), true)
  assert.deepEqual(readPick({ storage, now: 2000 }), { projectId: 'abc123', design: 'guidelines', format: 'html' })
  clearPick({ storage })
  assert.equal(readPick({ storage, now: 2000 }), null)
})

test('a stale, future-dated, malformed or blocked store reads as no pick', () => {
  const storage = memory()
  storePick('p1', DEFAULT_PICK, { storage, now: 1000 })
  assert.equal(readPick({ storage, now: 1000 + PICK_MAX_AGE_MS + 1 }), null)
  assert.equal(readPick({ storage, now: 500 }), null)
  storage.setItem(PICK_KEY, '{not json')
  assert.equal(readPick({ storage, now: 1000 }), null)
  storage.setItem(PICK_KEY, JSON.stringify({ projectId: '', at: 1000 }))
  assert.equal(readPick({ storage, now: 1000 }), null)
  const blocked = { getItem() { throw new Error('denied') }, setItem() { throw new Error('denied') }, removeItem() { throw new Error('denied') } }
  assert.equal(storePick('p', DEFAULT_PICK, { storage: blocked }), false)
  assert.equal(readPick({ storage: blocked }), null)
  assert.doesNotThrow(() => clearPick({ storage: blocked }))
})

test('the checkout address is the trial plan with the gallery marker', () => {
  assert.equal(GALLERY_CHECKOUT, '/checkout?plan=yearly&from=kit-gallery')
})

// The named exception to "every upgrade goes through /plans": the gallery's own
// trial button. It is the only source file that sends anyone to the gallery's
// checkout address, and the export panel's Pro gate still goes to /plans.
import fs from 'node:fs'
import path from 'node:path'
import { cleanProps } from '../../src/utils/productEvents.js'

const walkSrc = (dir, out = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walkSrc(p, out)
    else if (/\.(jsx?|tsx?)$/.test(e.name)) out.push(p)
  }
  return out
}

test('only the gallery page sends anyone to the gallery checkout address', () => {
  const users = walkSrc(path.join(process.cwd(), 'src'))
    .filter((p) => /GALLERY_CHECKOUT|from=kit-gallery/.test(fs.readFileSync(p, 'utf8')))
    .map((p) => path.basename(p))
    .sort()
  // The page, the helper that defines the address, the panel comment naming the
  // exception, and the return page's retry link, which keeps a gallery buyer's origin.
  assert.deepEqual(users, ['CheckoutReturn.jsx', 'ExportPanel.jsx', 'ProjectExport.jsx', 'kitGalleryPick.js'])
  const panel = fs.readFileSync(path.join(process.cwd(), 'src/components/ExportPanel.jsx'), 'utf8')
  assert.match(panel, /navigate\('\/plans'\)/, 'the export panel gate still goes to /plans')
})

test('the checkout event carries where the buyer came from, and nothing unsafe', () => {
  assert.deepEqual(cleanProps({ plan: 'yearly', from: 'kit-gallery' }), { plan: 'yearly', from: 'kit-gallery' })
  assert.deepEqual(cleanProps({ from: 'someone@x.test' }), {})
})

test('the pick carries the account that made it, when one is given', () => {
  const storage = memory()
  storePick('abc123', DEFAULT_PICK, { storage, now: 1000, uid: 'u-1' })
  assert.equal(readPick({ storage, now: 2000 }).uid, 'u-1')
})
