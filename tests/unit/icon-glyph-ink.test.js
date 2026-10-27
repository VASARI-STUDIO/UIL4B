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

test('mid-greys already readable on a dark page get no edge', () => {
  // #666 and lighter have about 3.4:1 against the dark page; the dark-neutral
  // ceiling sits between grey 90 (above) and #666 (here).
  for (const grey of [0x66, 0x80, 0x99]) {
    assert.equal(sample([
      [255, 202, 40, 255], [255, 62, 0, 255],
      [grey, grey, grey, 255], [grey, grey, grey, 255],
    ]).ink, 'mid', `grey ${grey}`)
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

test('only four fully opaque corners identify a baked-in square', () => {
  const pixels = Array.from({ length: 64 * 64 }, () => [20, 20, 20, 255])
  assert.equal(sample(pixels).opaqueCorners, true)
  for (const corner of [0, 63, 64 * 63, 64 * 64 - 1]) {
    for (const alpha of [0, 64, 254]) {
      const partial = pixels.slice()
      partial[corner] = [20, 20, 20, alpha]
      assert.equal(sample(partial).opaqueCorners, false)
    }
  }
  assert.equal(sample(pixels, true).opaqueCorners, false)
  assert.equal(sample(Array.from({ length: 64 * 64 }, () => [0, 0, 0, 0])).opaqueCorners, false)
})

test('a baked-in square reports its plate tone from the corners, transparent art none', () => {
  const plate = (rgb) => {
    const pixels = Array.from({ length: 64 * 64 }, () => [...rgb, 255])
    pixels[64 * 32 + 32] = [30, 120, 220, 255] // artwork in the middle never counts
    return sample(pixels).plate
  }
  assert.ok(plate([255, 255, 255]) > 0.99, 'white plate')
  assert.ok(plate([0, 0, 0]) < 0.01, 'black plate')
  assert.equal(sample([[0, 0, 0, 0]]).plate, null)
  assert.equal(sample([[255, 255, 255, 255]], true).plate, null)
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
  assert.equal(halo('dark', 'dark', 'logodev'), 'halo-light')
  assert.equal(halo('light', 'light', 'logodev'), 'halo-dark')
  assert.equal(halo('dark', 'light', 'logodev'), '')
  assert.equal(halo('light', 'dark', 'logodev'), '')
})

test('single-colour near-black pack art is drawn in the theme ink, not ringed', () => {
  // The grid's threshold is the sampler's own near-black ceiling, so a chosen
  // colour and a brand's baked colour agree on what counts as near-black.
  assert.match(source, /const INK_DARK_MAX = 0\.05\b/)
  assert.match(source, /isNearBlackMono\(text, INK_DARK_MAX\)/)
  // Flags never take it, and a mixed wordmark never reaches it (one paint only).
  assert.match(source, /function readsAsThemeInk\(pack, name\) \{\s*if \(FLAG_PACKS\.has\(pack\)\) return false/)
  // The brand glyph then drops its ring and takes the mono icons' tint.
  assert.match(source, /const halo = solidInk \? '' : haloFor\(shape\.ink, theme, pack\)/)
  assert.match(source, /solidInk \? 'ig-inv' : ''/)
})
