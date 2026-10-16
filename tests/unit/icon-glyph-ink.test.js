import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { stripJs } from '../helpers/strip-comments.js'
import { inkShape } from '../../src/utils/glyphShape.js'

// Execute the production sampler against controlled canvas pixels. Browser
// coverage exercises decoding, the resulting classes and preview filters.
const source = stripJs(readFileSync(new URL('../../src/pages/IconLibrary.jsx', import.meta.url), 'utf8'))
const start = source.indexOf('const INK_DARK_MAX =')
const end = source.indexOf('\n}', source.indexOf('function sampleGlyph(')) + 2
assert.ok(start >= 0 && end > start, 'production sampler was not found')

function sample(pixels, fail = false) {
  const data = new Uint8ClampedArray(pixels.flat())
  const document = {
    createElement: () => ({
      getContext: () => ({
        drawImage() { if (fail) throw new Error('tainted canvas') },
        getImageData: () => ({ data }),
      }),
    }),
  }
  return vm.runInNewContext(`${source.slice(start, end)}; sampleGlyph({ naturalWidth: 64, naturalHeight: 64 })`, { document, inkShape })
}

test('mixed orange/yellow marks retain visibility for substantial dark lettering', () => {
  for (const grey of [35, 53, 90]) {
    assert.equal(sample([
      [255, 202, 40, 255], [255, 62, 0, 255],
      [grey, grey, grey, 255], [grey, grey, grey, 255],
    ]).ink, 'dark')
  }
})

test('saturated-only art and tiny dark details do not trigger an edge', () => {
  assert.equal(sample([[180, 0, 0, 255], [0, 0, 160, 255]]).ink, 'mid')
  assert.equal(sample([
    ...Array.from({ length: 9 }, () => [255, 100, 30, 255]), [20, 20, 20, 255],
  ]).ink, 'mid')
})

test('near-black, near-white and transparent art keep their tone and safe fallback', () => {
  assert.equal(sample([[22, 22, 20, 255]]).ink, 'dark')
  assert.equal(sample([[254, 254, 254, 255]]).ink, 'light')
  assert.equal(sample([[0, 0, 0, 0]]).ink, 'mid')
  assert.equal(sample([[0, 0, 0, 255]], true).ink, 'mid')
})

test('flag packs and Twemoji never receive an edge in either theme', () => {
  const groupsStart = source.indexOf('const ICON_GROUPS =')
  const groupsEnd = source.indexOf('\nconst GROUP_ORDER', groupsStart)
  const haloStart = source.indexOf('const FLAG_PACKS =')
  const haloEnd = source.indexOf('\n}', source.indexOf('const haloFor =', haloStart)) + 2
  assert.ok(groupsStart >= 0 && groupsEnd > groupsStart && haloStart >= 0 && haloEnd > haloStart)
  const halo = vm.runInNewContext(`${source.slice(groupsStart, groupsEnd)}; ${source.slice(haloStart, haloEnd)}; haloFor`)
  for (const pack of ['circle-flags', 'flag', 'flagpack', 'cif', 'twemoji']) {
    assert.equal(halo('dark', 'dark', pack), '', pack)
    assert.equal(halo('light', 'light', pack), '', pack)
  }
  assert.equal(halo('dark', 'dark', 'logos'), 'halo-light')
  assert.equal(halo('light', 'light', 'logos'), 'halo-dark')
})
