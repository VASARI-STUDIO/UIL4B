// Which gallery icons count as editable: the rule the customiser starts from before an icon's artwork
// has loaded (IconLibrary.jsx `isStroke`).
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { COLORED_PACKS, STROKE_PACKS, cdnPackIsStroke, isGalleryEditable } from '../../src/utils/iconEditable.js'

const STROKE_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 4h16"/></svg>'
const FILLED_SVG = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h16v16H4z"/></svg>'

test('a missing icon is not editable', () => {
  assert.equal(isGalleryEditable(null), false)
  assert.equal(isGalleryEditable(undefined), false)
})

test('a Logo.dev brand logo is never editable', () => {
  assert.equal(isGalleryEditable({ logo: true, name: 'github', pack: 'logodev' }), false)
  assert.equal(isGalleryEditable({ logo: true, cdn: true, pack: 'lucide', name: 'x' }), false)
})

test('a saved icon is editable only when it was saved as a stroke icon', () => {
  assert.equal(isGalleryEditable({ custom: true, isStroke: true, name: 'Custom (a 1)' }), true)
  assert.equal(isGalleryEditable({ custom: true, isStroke: false, name: 'Custom (a 2)' }), false)
  assert.equal(isGalleryEditable({ custom: true, name: 'Custom (a 3)' }), false)
})

test('a pasted SVG is editable when its markup draws with a stroke', () => {
  assert.equal(isGalleryEditable({ svg: STROKE_SVG, name: 'custom-icon' }), true)
  assert.equal(isGalleryEditable({ svg: FILLED_SVG, name: 'custom-icon' }), false)
})

test('a coloured pack is never editable, even one named as a stroke pack', () => {
  assert.equal(isGalleryEditable({ cdn: true, pack: 'logos', name: 'github-icon' }), false)
  assert.equal(isGalleryEditable({ cdn: true, pack: 'flag', name: 'de' }), false)
  assert.equal(isGalleryEditable({ cdn: true, pack: 'twemoji', name: 'grinning-face' }), false)
  for (const pack of COLORED_PACKS) assert.equal(STROKE_PACKS.has(pack), false, `${pack} is in both lists`)
})

test('a stroke pack is editable, except the variants its Regular weight leaves out', () => {
  assert.equal(isGalleryEditable({ cdn: true, pack: 'lucide', name: 'arrow-right' }), true)
  assert.equal(isGalleryEditable({ cdn: true, pack: 'tabler', name: 'home' }), true)
  assert.equal(isGalleryEditable({ cdn: true, pack: 'tabler', name: 'home-filled' }), false)
  assert.equal(isGalleryEditable({ cdn: true, pack: 'heroicons', name: 'home' }), true)
  assert.equal(isGalleryEditable({ cdn: true, pack: 'heroicons', name: 'home-solid' }), false)
  assert.equal(isGalleryEditable({ cdn: true, pack: 'iconoir', name: 'home-solid' }), false)
})

test('a pack outside the stroke list is not editable from its name alone', () => {
  assert.equal(isGalleryEditable({ cdn: true, pack: 'ph', name: 'house' }), false)
  assert.equal(isGalleryEditable({ cdn: true, pack: 'mdi', name: 'home' }), false)
  assert.equal(isGalleryEditable({ cdn: true, pack: 'material-symbols', name: 'home' }), false)
})

test('a built-in icon is editable unless it is a solid one', () => {
  assert.equal(isGalleryEditable({ name: 'arrow', d: 'M0 0' }), true)
  assert.equal(isGalleryEditable({ name: 'arrow', d: 'M0 0', filled: false }), true)
  assert.equal(isGalleryEditable({ name: 'star', d: 'M0 0', filled: true }), false)
})

test('cdnPackIsStroke is the customiser fallback: coloured no, stroke pack and Regular weight yes', () => {
  assert.equal(cdnPackIsStroke('logos', 'x'), false)
  assert.equal(cdnPackIsStroke('lucide', 'x'), true)
  assert.equal(cdnPackIsStroke('tabler', 'x-filled'), false)
})

test('the page takes its pack lists and fallback from the helper, not its own copy', () => {
  const page = readFileSync(new URL('../../src/pages/IconLibrary.jsx', import.meta.url), 'utf8')
  assert.doesNotMatch(page, /const (?:COLORED|STROKE)_PACKS = new Set/)
  assert.match(page, /from '\.\.\/utils\/iconEditable'/)
  assert.match(page, /cdnPackIsStroke\(activeIcon\.pack, activeIcon\.name\)/)
})
