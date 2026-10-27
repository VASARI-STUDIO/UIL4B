// The template list is data the panel, the server and the generators all read, so
// its invariants are checked against the real list, and each check can fail:
// give a format two defaults, repeat an id, or write a description over 42
// characters.
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  EXPORT_TEMPLATES, DESC_MAX, assertTemplatesCoherent, defaultTemplate, isTemplate, liveTemplates, readExportTemplates,
} from '../../src/config/exportTemplates.js'
import { EXPORT_FORMATS } from '../../src/config/exportFormats.js'

test('the real list is coherent: one default per format, unique ids, keys are live formats', () => {
  assert.equal(assertTemplatesCoherent(EXPORT_TEMPLATES, EXPORT_FORMATS), true)
  assert.deepEqual(Object.keys(EXPORT_TEMPLATES).sort(), ['book', 'guidelines', 'kit'])
})

test('the live templates are the three defaults and the book Monograph and Atlas', () => {
  assert.deepEqual(['kit', 'book', 'guidelines'].map((f) => liveTemplates(f).map((x) => x.id)), [['studio'], ['specification', 'monograph', 'atlas'], ['presentation']])
  assert.deepEqual(['kit', 'book', 'guidelines'].map(defaultTemplate), ['studio', 'specification', 'presentation'])
})

test('the coherence check refuses what it should', () => {
  const t = (id, d = false) => ({ id, name: id, desc: 'x', default: d, live: true })
  assert.throws(() => assertTemplatesCoherent({ kit: [t('abc'), t('def')] }), /exactly one default/)
  assert.throws(() => assertTemplatesCoherent({ kit: [t('abc', true), t('def', true)] }), /exactly one default/)
  assert.throws(() => assertTemplatesCoherent({ kit: [t('abc', true), t('abc')] }), /duplicate/)
  assert.throws(() => assertTemplatesCoherent({ kit: [t('ab', true)] }), /3 to 16/)
  assert.throws(() => assertTemplatesCoherent({ kit: [t('Abc', true)] }), /3 to 16/)
  assert.throws(() => assertTemplatesCoherent({ kit: [{ ...t('abc', true), live: false }] }), /not live/)
  assert.throws(() => assertTemplatesCoherent({ tailwind: [t('abc', true)] }, EXPORT_FORMATS), /not a live export format/)
  assert.throws(() => assertTemplatesCoherent({ nope: [t('abc', true)] }, EXPORT_FORMATS), /not a live export format/)
})

test('isTemplate accepts only a live id of that format, and only strings', () => {
  for (const live of ['specification', 'monograph', 'atlas']) assert.equal(isTemplate('book', live), true, live)
  for (const bad of ['poster', 'manual', 'studio', '', null, undefined, 7, {}, [], ['specification'], '__proto__', 'constructor']) {
    assert.equal(isTemplate('book', bad), false, String(bad))
  }
  for (const format of ['nope', '__proto__', 'constructor', undefined, 7]) assert.equal(isTemplate(format, 'specification'), false)
})

test('every description is 42 characters or fewer, with no em dash', () => {
  for (const list of Object.values(EXPORT_TEMPLATES)) {
    for (const x of list) {
      assert.ok(x.desc.length <= DESC_MAX, `${x.id}: ${x.desc.length} characters`)
      assert.ok(!x.desc.includes('—'), `${x.id} has an em dash`)
    }
  }
})

test('readExportTemplates fills defaults and drops any id that is not live', () => {
  const defaults = { kit: 'studio', book: 'specification', guidelines: 'presentation' }
  assert.deepEqual(readExportTemplates(undefined), defaults)
  assert.deepEqual(readExportTemplates({}), defaults)
  assert.deepEqual(readExportTemplates({ exportTemplates: 'atlas' }), defaults)
  assert.deepEqual(readExportTemplates({ exportTemplates: { kit: 'manual', book: 7, guidelines: 'poster', extra: 'x' } }), defaults)
  const saved = { exportTemplates: { kit: 'studio', book: 'specification', guidelines: 'presentation' } }
  assert.deepEqual(readExportTemplates(JSON.parse(JSON.stringify(saved))), defaults, 'a saved project round-trips its choices')
})
