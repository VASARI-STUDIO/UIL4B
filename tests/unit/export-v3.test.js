import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  EXPORT_FORMATS, assertFormatsCoherent, assertGroupsCoherent, groupFormats, isGroupPro,
  proOnlyFormats, documentFormats, unbuiltFormats,
} from '../../src/config/exportFormats.js'
import { formatFileName, hasFormatFile } from '../../src/utils/exportFileName.js'
import { EXPORT_TEMPLATES, assertTemplatesCoherent } from '../../src/config/exportTemplates.js'
import {
  DEFAULT_PRESET, EXPORT_TYPES, LAST_PICK_KEY, exportLocation, galleryPick, needsNetwork,
  FREE_START, freeWayOut, pickIsFree, presetFromGalleryPick, readLastPick, readLastTheme, resolvePreset, resolveUpgradeTarget, startFor, storeLastPick,
} from '../../src/config/dialogExport.js'
import { GALLERY_CHECKOUT, GALLERY_DESIGNS, GALLERY_FORMATS, normalisePick } from '../../src/utils/kitGalleryPick.js'
import { codeFileName, CODE_FILES, isCodeFile, buildCodeFile } from '../../src/utils/codeFiles.js'

const memory = () => {
  const m = new Map()
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }
}
const allCategories = EXPORT_TYPES.flatMap((t) => t.categories)

// ── The dialog's lists ──────────────────────────────────────────────────────

test('every live format is in exactly one category, and no category lists a format that is not live', () => {
  const live = EXPORT_FORMATS.filter((f) => f.live).map((f) => f.id)
  assert.deepEqual([...live].sort(), ['app-bundle', 'book', 'book-html', 'book-png', 'contrast', 'contrast-json', 'css', 'guidelines', 'guidelines-html', 'html', 'jpeg', 'json', 'kit', 'md', 'png', 'tailwind'])
  for (const id of live) {
    const homes = allCategories.filter((c) => c.files.includes(id))
    assert.equal(homes.length, 1, `${id} is in ${homes.length} categories`)
  }
  for (const c of allCategories) {
    for (const id of c.files) assert.ok(live.includes(id), `${c.id} lists ${id}, which is not a live format`)
  }
})

test('the rail is Branding, UI, Image and Code, each with its sub-category tabs', () => {
  assert.deepEqual(EXPORT_TYPES.map((t) => t.id), ['branding', 'ui', 'image', 'code'])
  assert.deepEqual(EXPORT_TYPES.map((t) => t.name), ['Branding', 'UI', 'Image', 'Code'])
  assert.deepEqual(EXPORT_TYPES.map((t) => t.categories.map((c) => c.id)), [
    ['slides', 'book', 'guide'],
    ['kit', 'apps'],
    ['guide-image', 'book-pages'],
    ['tokens', 'contrast'],
  ])
  const ids = allCategories.map((c) => c.id)
  assert.equal(new Set(ids).size, ids.length, 'a category id repeats')
})

test('a category is Pro when every one of its files is, and the first file is the default', () => {
  for (const c of allCategories) {
    const formats = c.files.map((id) => EXPORT_FORMATS.find((f) => f.id === id))
    // Slides is the one exception: its files are Pro in most themes and free in two, so the Theme step decides and the row carries no tag.
    if (c.id === 'slides') {
      assert.equal(c.pro, false, 'the slides row is decided by its theme, so it is not marked Pro')
      continue
    }
    assert.equal(c.pro, formats.every((f) => f.pro), `${c.id} tier differs from src/config/exportFormats.js`)
    assert.equal(formats.some((f) => f.pro) && !c.pro, false, `${c.id} mixes Pro and free files`)
  }
  assert.equal(DEFAULT_PRESET.file, EXPORT_TYPES[0].categories[0].files[0])
})

test('a category with a layout step reads a real template list, and files in a row share its category', () => {
  for (const c of allCategories) {
    if (c.layouts) assert.ok(Object.hasOwn(EXPORT_TEMPLATES, c.layouts), `${c.id} layouts ${c.layouts} is not an export template list`)
  }
  assert.deepEqual(allCategories.filter((c) => c.layouts).map((c) => c.layouts), ['guidelines', 'book', 'kit', 'book'])
  // The three Pro files of the book (split over the Brand book and Book pages tabs) and the two of the slides are one row each in exportFormats.js.
  const book = [...EXPORT_TYPES[0].categories[1].files, ...EXPORT_TYPES[2].categories[1].files]
  assert.deepEqual(groupFormats('book').map((f) => f.id).sort(), [...book].sort())
  assert.deepEqual(groupFormats('guidelines').map((f) => f.id), EXPORT_TYPES[0].categories[0].files)
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

test('the new files are not new documents: the plan lines still count one book, one deck and one bundle', () => {
  assert.deepEqual(proOnlyFormats().map((f) => f.id), ['book', 'guidelines', 'app-bundle'])
  assert.ok(!documentFormats().some((f) => f.id === 'book-html' || f.id === 'guidelines-html'))
})

test('the app-ready bundle is a live Pro row of its own, with a download name and a place in the dialog', () => {
  const row = EXPORT_FORMATS.find((f) => f.id === 'app-bundle')
  assert.ok(row, 'the app-bundle row is gone')
  assert.deepEqual([row.live, row.pro, row.group, row.variantOf], [true, true, 'apps', undefined])
  assert.ok(proOnlyFormats().some((f) => f.id === 'app-bundle'))
  assert.equal(isGroupPro('apps'), true)
  assert.deepEqual(groupFormats('apps').map((f) => f.id), ['app-bundle'])
  assert.equal(hasFormatFile('app-bundle'), true)
  assert.equal(formatFileName('Lumen', 'app-bundle'), 'lumen-app-ready.zip')
  assert.equal(formatFileName('', 'app-bundle'), 'untitled-app-ready.zip')
  const home = exportLocation('app-bundle')
  assert.deepEqual([home.type.id, home.category.id, home.category.pro, home.category.preview], ['ui', 'apps', true, 'bundle'])
  // The Soon row for the icon and swatch bundle is a different thing and stays unbuilt.
  assert.ok(unbuiltFormats().some((f) => f.id === 'assets'))
})

// ── Presets and the last pick ───────────────────────────────────────────────

test('the default preset is the free guidelines and resolves to itself', () => {
  const guidelines = { type: 'branding', category: 'slides', file: 'guidelines' }
  assert.deepEqual(DEFAULT_PRESET, guidelines)
  assert.deepEqual(resolvePreset(DEFAULT_PRESET), guidelines)
  assert.deepEqual(resolvePreset(), guidelines)
  assert.deepEqual(resolvePreset(null), guidelines)
  assert.deepEqual(resolvePreset('css'), guidelines)
  assert.equal(pickIsFree(DEFAULT_PRESET), true, 'the default export is always a free one')
  assert.deepEqual(startFor(false, DEFAULT_PRESET, undefined).pick, DEFAULT_PRESET)
})

test('a preset falls back safely, part by part', () => {
  // The Tint tool's row names the type and the file only.
  assert.deepEqual(resolvePreset({ type: 'code', file: 'css' }), { type: 'code', category: 'tokens', file: 'css' })
  assert.deepEqual(resolvePreset({ type: 'code' }), { type: 'code', category: 'tokens', file: 'css' })
  // A type alone opens on its first category and its first file.
  assert.deepEqual(resolvePreset({ type: 'branding' }), { type: 'branding', category: 'slides', file: 'guidelines' })
  // A missing category is the one that holds the file.
  assert.deepEqual(resolvePreset({ type: 'branding', file: 'guidelines-html' }), { type: 'branding', category: 'slides', file: 'guidelines-html' })
  assert.deepEqual(resolvePreset({ file: 'json' }), { type: 'code', category: 'tokens', file: 'json' })
  assert.deepEqual(resolvePreset({ file: 'contrast' }), { type: 'code', category: 'contrast', file: 'contrast' })
  // A file the category lacks is its first file.
  assert.deepEqual(resolvePreset({ type: 'branding', category: 'slides', file: 'png' }), { type: 'branding', category: 'slides', file: 'guidelines' })
  assert.deepEqual(resolvePreset({ type: 'image', category: 'guide-image', file: 'jpeg' }), { type: 'image', category: 'guide-image', file: 'jpeg' })
  // Unknown ids fall to the default.
  assert.deepEqual(resolvePreset({ type: 'nope', category: 'nope', file: 'nope' }), { type: 'branding', category: 'slides', file: 'guidelines' })
  assert.deepEqual(resolvePreset({ type: 'ui', category: 'slides', file: 'css' }), { type: 'ui', category: 'kit', file: 'kit' })
})

test('an id from the earlier rail (brand, kit, apps) follows its file to where it lives now', () => {
  assert.deepEqual(resolvePreset({ type: 'brand', category: 'book', file: 'book' }), { type: 'branding', category: 'book', file: 'book' })
  assert.deepEqual(resolvePreset({ type: 'brand', category: 'slides', file: 'guidelines-html' }), { type: 'branding', category: 'slides', file: 'guidelines-html' })
  assert.deepEqual(resolvePreset({ type: 'brand', category: 'guide', file: 'html' }), { type: 'branding', category: 'guide', file: 'html' })
  // The style guide's pictures moved to the Image rail.
  assert.deepEqual(resolvePreset({ type: 'brand', category: 'guide', file: 'png' }), { type: 'image', category: 'guide-image', file: 'png' })
  assert.deepEqual(resolvePreset({ type: 'brand', category: 'book', file: 'book-png' }), { type: 'image', category: 'book-pages', file: 'book-png' })
  assert.deepEqual(resolvePreset({ type: 'kit', category: 'kit', file: 'kit' }), { type: 'ui', category: 'kit', file: 'kit' })
  assert.deepEqual(resolvePreset({ type: 'apps', category: 'apps', file: 'app-bundle' }), { type: 'ui', category: 'apps', file: 'app-bundle' })
  assert.deepEqual(resolvePreset({ type: 'code', category: 'code', file: 'contrast-json' }), { type: 'code', category: 'contrast', file: 'contrast-json' })
  // An earlier type with no file opens on the type that replaced it.
  assert.deepEqual(resolvePreset({ type: 'brand' }), { type: 'branding', category: 'slides', file: 'guidelines' })
  assert.deepEqual(resolvePreset({ type: 'apps' }), { type: 'ui', category: 'kit', file: 'kit' })
  // A stored pick from the earlier rail reads back migrated.
  const storage = memory()
  storage.setItem(LAST_PICK_KEY, JSON.stringify({ type: 'brand', category: 'book', file: 'book-html' }))
  assert.deepEqual(readLastPick({ storage }), { type: 'branding', category: 'book', file: 'book-html' })
})

test('every file resolves to its own category', () => {
  for (const c of allCategories) {
    for (const file of c.files) {
      const home = exportLocation(file)
      assert.equal(home.category.id, c.id)
      assert.deepEqual(resolvePreset({ file }), { type: home.type.id, category: c.id, file })
    }
  }
  assert.equal(exportLocation('assets'), null)
})

test('the last pick is kept for the session, resolved, and an unreadable store reads as none', () => {
  const storage = memory()
  assert.equal(readLastPick({ storage }), null)
  assert.equal(storeLastPick({ type: 'code', category: 'tokens', file: 'json' }, { storage }), true)
  assert.equal(storage.getItem(LAST_PICK_KEY).includes('json'), true)
  assert.deepEqual(readLastPick({ storage }), { type: 'code', category: 'tokens', file: 'json' })
  // A stored pick is made safe on the way in and on the way out.
  storeLastPick({ type: 'branding', category: 'slides', file: 'book' }, { storage })
  assert.deepEqual(readLastPick({ storage }), { type: 'branding', category: 'slides', file: 'guidelines' })
  storage.setItem(LAST_PICK_KEY, JSON.stringify({ type: 'branding', category: 'guide', file: 'removed-format' }))
  assert.deepEqual(readLastPick({ storage }), { type: 'branding', category: 'guide', file: 'html' })
  storage.setItem(LAST_PICK_KEY, '{not json')
  assert.equal(readLastPick({ storage }), null)
  storage.setItem(LAST_PICK_KEY, 'null')
  assert.equal(readLastPick({ storage }), null)
  const blocked = { getItem() { throw new Error('denied') }, setItem() { throw new Error('denied') } }
  assert.equal(storeLastPick(DEFAULT_PRESET, { storage: blocked }), false)
  assert.equal(readLastPick({ storage: blocked }), null)
  assert.equal(LAST_PICK_KEY, 'uil4b.exportV3.last')
})

test('the theme is kept with the pick, read back only for the file it was chosen for, and dropped when it does not fit', () => {
  const storage = memory()
  assert.equal(readLastTheme('kit', { storage }), null)
  storeLastPick({ type: 'branding', category: 'slides', file: 'guidelines' }, { storage, theme: '27-swissfield' })
  assert.equal(readLastTheme('guidelines', { storage }), '27-swissfield')
  // The pick itself still reads as a plain three-key preset.
  assert.deepEqual(readLastPick({ storage }), { type: 'branding', category: 'slides', file: 'guidelines' })
  // Another file does not inherit it; neither does a theme that is not one.
  assert.equal(readLastTheme('kit', { storage }), null)
  storeLastPick({ type: 'branding', category: 'slides', file: 'guidelines' }, { storage, theme: 'not-a-theme' })
  assert.equal(readLastTheme('guidelines', { storage }), null)
  // A pick stored with no theme clears the old one.
  storeLastPick({ type: 'branding', category: 'slides', file: 'guidelines' }, { storage })
  assert.equal(readLastTheme('guidelines', { storage }), null)
  assert.equal(readLastTheme('guidelines', { storage: { getItem() { throw new Error('denied') } } }), null)
})

test('a free account starts on a free pick: the guidelines in Label, never a Pro file or a Pro theme', () => {
  assert.deepEqual({ ...FREE_START }, { type: 'branding', category: 'slides', file: 'guidelines' })
  assert.equal(pickIsFree(FREE_START), true)
  assert.equal(pickIsFree(FREE_START, '25-label'), true)
  assert.equal(pickIsFree(FREE_START, '27-swissfield'), true)
  assert.equal(pickIsFree(FREE_START, '01-presentation'), false)
  assert.equal(pickIsFree({ type: 'branding', category: 'book', file: 'book' }), false)
  assert.equal(pickIsFree({ type: 'ui', category: 'apps', file: 'app-bundle' }), false)
  assert.equal(pickIsFree({ type: 'ui', category: 'kit', file: 'kit' }, '04-standards'), true)
  assert.equal(pickIsFree({ type: 'ui', category: 'kit', file: 'kit' }, '01-presentation'), false)
  assert.equal(pickIsFree({ type: 'code', category: 'tokens', file: 'json' }), true)

  // A Pro account keeps whatever it picked, theme included.
  const book = { type: 'branding', category: 'book', file: 'book' }
  assert.deepEqual(startFor(true, book, undefined), { pick: book, theme: undefined })
  assert.deepEqual(startFor(true, FREE_START, '01-presentation'), { pick: FREE_START, theme: '01-presentation' })
  // Anyone else keeps a free pick and falls back to the free start for a Pro one.
  assert.deepEqual(startFor(false, FREE_START, '27-swissfield'), { pick: FREE_START, theme: '27-swissfield' })
  assert.deepEqual(startFor(false, FREE_START, '01-presentation'), { pick: FREE_START, theme: undefined })
  assert.deepEqual(startFor(false, book, undefined), { pick: FREE_START, theme: undefined })
  assert.deepEqual(startFor(false, undefined, undefined), { pick: FREE_START, theme: undefined })
  assert.notEqual(startFor(false, book, undefined).pick, FREE_START, 'the start is a copy, not the frozen constant')
})

test('a Pro pick has a one-click free way out, and a free pick needs none', () => {
  assert.equal(freeWayOut(FREE_START, undefined), null)
  assert.equal(freeWayOut(FREE_START, '25-label'), null)
  assert.equal(freeWayOut({ type: 'code', category: 'tokens', file: 'css' }, undefined), null)
  // The same file in a theme it is free in.
  const slides = freeWayOut(FREE_START, '01-presentation')
  assert.equal(slides.pick.file, 'guidelines')
  assert.equal(pickIsFree(slides.pick, slides.theme), true)
  const kit = freeWayOut({ type: 'ui', category: 'kit', file: 'kit' }, '01-presentation')
  assert.deepEqual([kit.pick.file, kit.theme], ['kit', '04-standards'])
  // A file that is Pro in every theme falls back to the free start.
  for (const pick of [{ type: 'branding', category: 'book', file: 'book' }, { type: 'ui', category: 'apps', file: 'app-bundle' }, { type: 'image', category: 'book-pages', file: 'book-png' }]) {
    const out = freeWayOut(pick, undefined)
    assert.deepEqual(out.pick, { ...FREE_START }, pick.file)
    assert.equal(pickIsFree(out.pick, out.theme), true, pick.file)
  }
})

test('whatever the file and the theme, the free way out is free and says where it goes', () => {
  const files = EXPORT_TYPES.flatMap((t) => t.categories.flatMap((c) => c.files.map((file) => ({ type: t.id, category: c.id, file }))))
  for (const pick of files) {
    for (const theme of [undefined, '01-presentation', '04-standards', '25-label', '27-swissfield']) {
      const out = freeWayOut(pick, theme)
      if (!out) {
        assert.equal(pickIsFree(pick, theme), true, `${pick.file} in ${theme}`)
        continue
      }
      assert.equal(pickIsFree(pick, theme), false, `${pick.file} in ${theme}`)
      assert.equal(pickIsFree(out.pick, out.theme), true, `${pick.file} in ${theme}: the way out is not free`)
      assert.match(out.label, /^Use the free /, pick.file)
    }
  }
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
  for (const id of ['kit', 'html', 'md', 'png', 'jpeg', 'css', 'json', 'tailwind', 'contrast', 'contrast-json']) {
    assert.equal(galleryPick(id), null, id)
    assert.equal(resolveUpgradeTarget({ formatId: id, projectId: 'p1', signedIn: true }).to, '/plans')
  }
})

test('the app-ready bundle has no gallery pick, so a free account on it goes to /plans, even with a saved project', () => {
  assert.equal(galleryPick('app-bundle'), null)
  assert.deepEqual(resolveUpgradeTarget({ formatId: 'app-bundle', projectId: 'p1', signedIn: true }), { to: '/plans', checkout: false, pick: null })
})

test('every gallery Pro file is a pick the gallery stores and reads back, and the way back reopens it', () => {
  const pro = EXPORT_FORMATS.filter((f) => f.live && f.pro && f.id !== 'app-bundle').map((f) => f.id)
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
  assert.deepEqual(presetFromGalleryPick({ design: 'kit', format: 'html' }), { type: 'ui', category: 'kit', file: 'kit' })
  assert.deepEqual(presetFromGalleryPick({ design: 'nope' }), { type: 'branding', category: 'book', file: 'book' })
})

test('the gallery offers the book as PNG pages', () => {
  assert.deepEqual(GALLERY_DESIGNS.find((d) => d.id === 'book').formats, ['pdf', 'html', 'png'])
  assert.deepEqual(GALLERY_DESIGNS.find((d) => d.id === 'guidelines').formats, ['pdf', 'html'])
  assert.equal(GALLERY_FORMATS.png.label, 'PNG pages')
})

// ── Offline ─────────────────────────────────────────────────────────────────

test('offline: the book, the slides and the kit need the network; the style guide and the code files do not', () => {
  for (const id of ['book', 'book-png', 'book-html', 'guidelines', 'guidelines-html', 'kit']) assert.equal(needsNetwork(id), true, id)
  for (const id of ['html', 'md', 'png', 'jpeg', 'css', 'json', 'tailwind', 'contrast', 'contrast-json', 'app-bundle']) assert.equal(needsNetwork(id), false, id)
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
    at('if (needsPro && !isPro) return goUpgrade'),
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
  assert.match(runner, /\(proDocument && !htmlDocument\) \|\| \(themed && themed\.format === 'pdf'\) \? reservePrintWindow/)
})

test('the runner exports one hook with the contract names, and copy() never runs the account gate', () => {
  assert.match(runner, /export default function useExportRunner\(\)/)
  assert.match(runner, /return \{ run, copy, busy, stage, error, notice, done, reset, upgradeTarget, retryIn \}/)
  const copyBody = runner.slice(runner.indexOf('const copy = async'), runner.indexOf('const reset = '))
  assert.ok(copyBody.length > 100)
  assert.doesNotMatch(copyBody, /requireExportAccount|navigate|reportUpgradeGate/)
  assert.match(copyBody, /navigator\.clipboard\.writeText/)
})

// ── The Code files ──────────────────────────────────────────────────────────

test('the Code rail lists the five Code files, in order, and each is built by codeFiles.js', () => {
  const code = EXPORT_TYPES.find((t) => t.id === 'code').categories.flatMap((c) => [...c.files])
  assert.deepEqual(code, ['css', 'json', 'tailwind', 'contrast', 'contrast-json'])
  assert.deepEqual(Object.keys(CODE_FILES), code)
  for (const id of code) {
    assert.equal(isCodeFile(id), true, id)
    const f = EXPORT_FORMATS.find((x) => x.id === id)
    assert.equal(f.live && !f.pro, true, `${id} is live and free`)
    assert.ok(f.desc.length > 20 && !f.desc.includes('—'), `${id} has an honest one-line description`)
  }
  assert.equal(isCodeFile('book'), false)
})

test('Code files are named {slug}.tokens.css, .tokens.json, -tailwind.css, -contrast-pairs.csv and .json', () => {
  assert.deepEqual(
    ['css', 'json', 'tailwind', 'contrast', 'contrast-json'].map((id) => codeFileName(id, 'lumen')),
    ['lumen.tokens.css', 'lumen.tokens.json', 'lumen-tailwind.css', 'lumen-contrast-pairs.csv', 'lumen-contrast-pairs.json'],
  )
})

test('every Code file builds from a design, and only the files with a place for a credit carry one', async () => {
  const design = { palette: { colors: ['#1F4B8E', '#F4F1EA', '#1B2433'] } }
  for (const id of Object.keys(CODE_FILES)) {
    const free = await buildCodeFile(id, design, { projectName: 'Lumen', watermark: true })
    const pro = await buildCodeFile(id, design, { projectName: 'Lumen', watermark: false })
    assert.ok(free.length > 100, id)
    assert.equal(free.includes('Made with UI L4B'), ['css', 'json', 'tailwind'].includes(id), `${id}: credit on a free build`)
    assert.equal(pro.includes('Made with UI L4B'), false, `${id}: no credit on a Pro build`)
  }
})
