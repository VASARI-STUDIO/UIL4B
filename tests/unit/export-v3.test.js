import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  EXPORT_FORMATS, assertFormatsCoherent, assertGroupsCoherent, groupFormats, isGroupPro,
  proOnlyFormats, documentFormats,
} from '../../src/config/exportFormats.js'
import { EXPORT_TEMPLATES, assertTemplatesCoherent } from '../../src/config/exportTemplates.js'
import {
  DEFAULT_PRESET, EXPORT_TYPES, LAST_PICK_KEY, exportLocation, galleryPick, needsNetwork,
  presetFromGalleryPick, readLastPick, resolvePreset, resolveUpgradeTarget, storeLastPick,
} from '../../src/config/dialogExport.js'
import { GALLERY_CHECKOUT, GALLERY_DESIGNS, GALLERY_FORMATS, normalisePick } from '../../src/utils/kitGalleryPick.js'

const memory = () => {
  const m = new Map()
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }
}
const allCategories = EXPORT_TYPES.flatMap((t) => t.categories)

// ── The dialog's lists ──────────────────────────────────────────────────────

test('every live format is in exactly one category, and no category lists a format that is not live', () => {
  const live = EXPORT_FORMATS.filter((f) => f.live).map((f) => f.id)
  assert.deepEqual([...live].sort(), ['book', 'book-html', 'book-png', 'css', 'guidelines', 'guidelines-html', 'html', 'jpeg', 'json', 'kit', 'md', 'png'])
  for (const id of live) {
    const homes = allCategories.filter((c) => c.files.includes(id))
    assert.equal(homes.length, 1, `${id} is in ${homes.length} categories`)
  }
  for (const c of allCategories) {
    for (const id of c.files) assert.ok(live.includes(id), `${c.id} lists ${id}, which is not a live format`)
  }
})

test('the rail is Brand book (Book, Slides, Style guide), UI kit and Code, and only Brand book has sub-rows', () => {
  assert.deepEqual(EXPORT_TYPES.map((t) => t.id), ['brand', 'kit', 'code'])
  assert.deepEqual(EXPORT_TYPES[0].categories.map((c) => c.id), ['book', 'slides', 'guide'])
  assert.equal(EXPORT_TYPES[1].categories.length, 1)
  assert.equal(EXPORT_TYPES[2].categories.length, 1)
  const ids = allCategories.map((c) => c.id)
  assert.equal(new Set(ids).size, ids.length, 'a category id repeats')
})

test('a category is Pro when every one of its files is, and the first file is the default', () => {
  for (const c of allCategories) {
    const formats = c.files.map((id) => EXPORT_FORMATS.find((f) => f.id === id))
    assert.equal(c.pro, formats.every((f) => f.pro), `${c.id} tier differs from src/config/exportFormats.js`)
    assert.equal(formats.some((f) => f.pro) && !c.pro, false, `${c.id} mixes Pro and free files`)
  }
  assert.equal(DEFAULT_PRESET.file, EXPORT_TYPES[0].categories[0].files[0])
})

test('a category with a layout step reads a real template list, and files in a row share its category', () => {
  for (const c of allCategories) {
    if (c.layouts) assert.ok(Object.hasOwn(EXPORT_TEMPLATES, c.layouts), `${c.id} layouts ${c.layouts} is not an export template list`)
  }
  assert.deepEqual(allCategories.filter((c) => c.layouts).map((c) => c.layouts), ['book', 'guidelines', 'kit'])
  // The three Pro files of the book and the two of the slides are one row each in exportFormats.js.
  assert.deepEqual(groupFormats('book').map((f) => f.id), EXPORT_TYPES[0].categories[0].files)
  assert.deepEqual(groupFormats('guidelines').map((f) => f.id), EXPORT_TYPES[0].categories[1].files)
})

test('the HTML variants pass the coherence asserts and answer to the same wall as their document', () => {
  assert.equal(assertFormatsCoherent(EXPORT_FORMATS), true)
  assert.equal(assertGroupsCoherent(EXPORT_FORMATS), true)
  assert.equal(assertTemplatesCoherent(EXPORT_TEMPLATES, EXPORT_FORMATS), true)
  const html = EXPORT_FORMATS.find((f) => f.id === 'book-html')
  assert.deepEqual([html.variantOf, html.option, html.action, html.pro, html.live], ['book', 'HTML', 'Export HTML', true, true])
  const slidesHtml = EXPORT_FORMATS.find((f) => f.id === 'guidelines-html')
  assert.deepEqual([slidesHtml.variantOf, slidesHtml.option, slidesHtml.pro, slidesHtml.live, slidesHtml.logo], ['guidelines', 'HTML', true, true, true])
  assert.equal(EXPORT_FORMATS.find((f) => f.id === 'guidelines').option, 'PDF')
  assert.equal(isGroupPro('book'), true)
  assert.equal(isGroupPro('guidelines'), true)
})

test('the new files are not new documents: the plan lines still count one book and one deck', () => {
  assert.deepEqual(proOnlyFormats().map((f) => f.id), ['book', 'guidelines'])
  assert.ok(!documentFormats().some((f) => f.id === 'book-html' || f.id === 'guidelines-html'))
})

// ── Presets and the last pick ───────────────────────────────────────────────

test('the default preset is Brand book, Book, PDF and resolves to itself', () => {
  assert.deepEqual(DEFAULT_PRESET, { type: 'brand', category: 'book', file: 'book' })
  assert.deepEqual(resolvePreset(DEFAULT_PRESET), { type: 'brand', category: 'book', file: 'book' })
  assert.deepEqual(resolvePreset(), { type: 'brand', category: 'book', file: 'book' })
  assert.deepEqual(resolvePreset(null), { type: 'brand', category: 'book', file: 'book' })
  assert.deepEqual(resolvePreset('css'), { type: 'brand', category: 'book', file: 'book' })
})

test('a preset falls back safely, part by part', () => {
  // The Tint tool's row names the type and the file only.
  assert.deepEqual(resolvePreset({ type: 'code', file: 'css' }), { type: 'code', category: 'code', file: 'css' })
  assert.deepEqual(resolvePreset({ type: 'code' }), { type: 'code', category: 'code', file: 'css' })
  // A type alone opens on its first category and its first file.
  assert.deepEqual(resolvePreset({ type: 'brand' }), { type: 'brand', category: 'book', file: 'book' })
  // A missing category is the one that holds the file.
  assert.deepEqual(resolvePreset({ type: 'brand', file: 'guidelines-html' }), { type: 'brand', category: 'slides', file: 'guidelines-html' })
  assert.deepEqual(resolvePreset({ file: 'json' }), { type: 'code', category: 'code', file: 'json' })
  // A file the category lacks is its first file.
  assert.deepEqual(resolvePreset({ type: 'brand', category: 'slides', file: 'png' }), { type: 'brand', category: 'slides', file: 'guidelines' })
  assert.deepEqual(resolvePreset({ type: 'brand', category: 'guide', file: 'jpeg' }), { type: 'brand', category: 'guide', file: 'jpeg' })
  // Unknown ids fall to the default.
  assert.deepEqual(resolvePreset({ type: 'nope', category: 'nope', file: 'nope' }), { type: 'brand', category: 'book', file: 'book' })
  assert.deepEqual(resolvePreset({ type: 'kit', category: 'slides', file: 'css' }), { type: 'kit', category: 'kit', file: 'kit' })
})

test('every file resolves to its own category', () => {
  for (const c of allCategories) {
    for (const file of c.files) {
      const home = exportLocation(file)
      assert.equal(home.category.id, c.id)
      assert.deepEqual(resolvePreset({ file }), { type: home.type.id, category: c.id, file })
    }
  }
  assert.equal(exportLocation('tailwind'), null)
})

test('the last pick is kept for the session, resolved, and an unreadable store reads as none', () => {
  const storage = memory()
  assert.equal(readLastPick({ storage }), null)
  assert.equal(storeLastPick({ type: 'code', category: 'code', file: 'json' }, { storage }), true)
  assert.equal(storage.getItem(LAST_PICK_KEY).includes('json'), true)
  assert.deepEqual(readLastPick({ storage }), { type: 'code', category: 'code', file: 'json' })
  // A stored pick is made safe on the way in and on the way out.
  storeLastPick({ type: 'brand', category: 'slides', file: 'book' }, { storage })
  assert.deepEqual(readLastPick({ storage }), { type: 'brand', category: 'slides', file: 'guidelines' })
  storage.setItem(LAST_PICK_KEY, JSON.stringify({ type: 'brand', category: 'guide', file: 'removed-format' }))
  assert.deepEqual(readLastPick({ storage }), { type: 'brand', category: 'guide', file: 'html' })
  storage.setItem(LAST_PICK_KEY, '{not json')
  assert.equal(readLastPick({ storage }), null)
  storage.setItem(LAST_PICK_KEY, 'null')
  assert.equal(readLastPick({ storage }), null)
  const blocked = { getItem() { throw new Error('denied') }, setItem() { throw new Error('denied') } }
  assert.equal(storeLastPick(DEFAULT_PRESET, { storage: blocked }), false)
  assert.equal(readLastPick({ storage: blocked }), null)
  assert.equal(LAST_PICK_KEY, 'uil4b.exportV3.last')
})

// ── The way to Pro ──────────────────────────────────────────────────────────

test('a Pro pick from a signed-in account with a saved project goes to the trial checkout, with the pick', () => {
  const t = resolveUpgradeTarget({ formatId: 'book-png', projectId: 'p1', signedIn: true })
  assert.equal(t.to, GALLERY_CHECKOUT)
  assert.equal(t.to, '/checkout?plan=yearly&from=kit-gallery')
  assert.equal(t.checkout, true)
  assert.deepEqual(t.pick, { design: 'book', format: 'png' })
})

test('anyone else goes to /plans: signed out, or no saved project', () => {
  for (const args of [
    { formatId: 'book', projectId: 'p1', signedIn: false },
    { formatId: 'book', projectId: undefined, signedIn: true },
    { formatId: 'guidelines-html', projectId: '', signedIn: true },
    { formatId: 'guidelines', projectId: null, signedIn: false },
  ]) {
    const t = resolveUpgradeTarget(args)
    assert.deepEqual(t, { to: '/plans', checkout: false, pick: null }, JSON.stringify(args))
  }
})

test('a free file has no upgrade pick, so it can never be sent to checkout', () => {
  for (const id of ['kit', 'html', 'md', 'png', 'jpeg', 'css', 'json']) {
    assert.equal(galleryPick(id), null, id)
    assert.equal(resolveUpgradeTarget({ formatId: id, projectId: 'p1', signedIn: true }).to, '/plans')
  }
})

test('every Pro file is a pick the gallery stores and reads back, and the way back reopens it', () => {
  const pro = EXPORT_FORMATS.filter((f) => f.live && f.pro).map((f) => f.id)
  assert.deepEqual([...pro].sort(), ['book', 'book-html', 'book-png', 'guidelines', 'guidelines-html'])
  const seen = new Set()
  for (const id of pro) {
    const pick = galleryPick(id)
    assert.ok(pick, `${id} has no gallery pick`)
    // Survives normalisePick (so it survives the trip to checkout) and has its own label.
    assert.deepEqual(normalisePick(pick), pick, `${id} is not a pick the gallery keeps`)
    assert.ok(GALLERY_FORMATS[pick.format], `${id} has no gallery format ${pick.format}`)
    assert.ok(GALLERY_DESIGNS.find((d) => d.id === pick.design).formats.includes(pick.format))
    // Two files never share a pick, or the way back would reopen the wrong one.
    const key = `${pick.design}/${pick.format}`
    assert.ok(!seen.has(key), `${id} shares the pick ${key}`)
    seen.add(key)
    assert.deepEqual(presetFromGalleryPick(pick), resolvePreset({ file: id }))
  }
  assert.deepEqual(presetFromGalleryPick({ design: 'kit', format: 'html' }), { type: 'kit', category: 'kit', file: 'kit' })
  assert.deepEqual(presetFromGalleryPick({ design: 'nope' }), { type: 'brand', category: 'book', file: 'book' })
})

test('the gallery offers the book as PNG pages', () => {
  assert.deepEqual(GALLERY_DESIGNS.find((d) => d.id === 'book').formats, ['pdf', 'html', 'png'])
  assert.deepEqual(GALLERY_DESIGNS.find((d) => d.id === 'guidelines').formats, ['pdf', 'html'])
  assert.equal(GALLERY_FORMATS.png.label, 'PNG pages')
})

// ── Offline ─────────────────────────────────────────────────────────────────

test('offline: the book, the slides and the kit need the network; the style guide and the code files do not', () => {
  for (const id of ['book', 'book-png', 'book-html', 'guidelines', 'guidelines-html', 'kit']) assert.equal(needsNetwork(id), true, id)
  for (const id of ['html', 'md', 'png', 'jpeg', 'css', 'json']) assert.equal(needsNetwork(id), false, id)
})

// ── The runner's source ─────────────────────────────────────────────────────
// The hook needs React and the app's contexts, so it is read, not run: the order of
// the gates and the shape of the two new branches are what a change could silently break.

const runner = fs.readFileSync(path.join(process.cwd(), 'src/hooks/useExportRunner.js'), 'utf8')

test('the runner keeps the gate order: Pro check, offline, account gate, plan wait, then the build', () => {
  const at = (needle) => {
    const i = runner.indexOf(needle)
    assert.ok(i > 0, `${needle} is missing from useExportRunner.js`)
    return i
  }
  const order = [
    at('if (fmt.pro && !isPro) return goUpgrade'),
    at('if (needsNetwork(format) && isOffline())'),
    at('await requireExportAccount(reason)'),
    at('await waitForPlan()'),
    at('setBusy(true)'),
  ]
  assert.deepEqual([...order].sort((a, b) => a - b), order)
})

test('the runner moved the gate tables over unchanged, and asks the server for the document, not the variant', () => {
  assert.match(runner, /gate: 'design-system-book-export'/)
  assert.match(runner, /gate: 'brand-guidelines-export'/)
  assert.match(runner, /export const PLAN_WAIT_MS = 8000/)
  assert.match(runner, /export const BUSY_LABEL = \{ fonts: 'Embedding fonts…', building: 'Building the kit…', document: 'Preparing your document…', pages: 'Drawing the pages…' \}/)
  assert.match(runner, /format === 'book-html' \|\| format === 'guidelines-html'/)
  assert.match(runner, /requestExportDocument\(\{ format: documentKey,/)
  assert.match(runner, /template: chosenTemplates\[documentKey\]/)
  // Only the PDF reserves a print window; the HTML is saved as a file.
  assert.match(runner, /reservePrintWindow\(\) : null/)
  assert.match(runner, /proDocument && !htmlDocument \? reservePrintWindow/)
})

test('the runner exports one hook with the contract names, and copy() never runs the account gate', () => {
  assert.match(runner, /export default function useExportRunner\(\)/)
  assert.match(runner, /return \{ run, copy, busy, stage, error, notice, done, reset, upgradeTarget \}/)
  const copyBody = runner.slice(runner.indexOf('const copy = async'), runner.indexOf('const reset = '))
  assert.ok(copyBody.length > 100)
  assert.doesNotMatch(copyBody, /requireExportAccount|navigate|reportUpgradeGate/)
  assert.match(copyBody, /navigator\.clipboard\.writeText/)
})
