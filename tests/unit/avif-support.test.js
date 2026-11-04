// AVIF is offered as an OUTPUT only where the browser can really encode it.
//
// canvas.toBlob(cb, 'image/avif') does not fail where AVIF is missing: it hands
// back a PNG (or null). The probe therefore has to compare the blob's type, and
// every output picker has to hide AVIF until that comparison says yes.
import { test, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import {
  avifEncodeKnown, blobMatches, canEncodeAvif, resetAvifSupportForTests, usableFormat, withAvifIf,
} from '../../src/utils/avifSupport.js'

const FORMATS = [
  { id: 'image/png' }, { id: 'image/webp' }, { id: 'image/avif' }, { id: 'ico' },
]

// A canvas whose toBlob answers with whatever `answer` returns.
function fakeDocument(answer, { context = true } = {}) {
  return {
    createElement: () => ({
      width: 0,
      height: 0,
      getContext: () => (context ? {} : null),
      toBlob: (cb, type) => cb(answer(type)),
    }),
  }
}

let realDocument
beforeEach(() => {
  realDocument = globalThis.document
  resetAvifSupportForTests()
})
afterEach(() => {
  if (realDocument === undefined) delete globalThis.document
  else globalThis.document = realDocument
})

test('true only when the blob comes back as image/avif', async () => {
  globalThis.document = fakeDocument((type) => ({ type, size: 40 }))
  assert.equal(avifEncodeKnown(), null, 'unknown before the probe has run')
  assert.equal(await canEncodeAvif(), true)
  assert.equal(avifEncodeKnown(), true)
})

test('a PNG handed back for an AVIF request is NOT support (the Safari case)', async () => {
  globalThis.document = fakeDocument(() => ({ type: 'image/png', size: 40 }))
  assert.equal(await canEncodeAvif(), false)
  assert.equal(avifEncodeKnown(), false)
})

test('a null blob is not support', async () => {
  globalThis.document = fakeDocument(() => null)
  assert.equal(await canEncodeAvif(), false)
})

test('no document, no 2D context, or a throwing canvas all answer false without throwing', async () => {
  delete globalThis.document
  assert.equal(await canEncodeAvif(), false)

  resetAvifSupportForTests()
  globalThis.document = fakeDocument(() => ({ type: 'image/avif' }), { context: false })
  assert.equal(await canEncodeAvif(), false)

  resetAvifSupportForTests()
  globalThis.document = { createElement: () => { throw new Error('boom') } }
  assert.equal(await canEncodeAvif(), false)
})

test('the answer is memoised: the canvas is only asked once', async () => {
  let asked = 0
  globalThis.document = fakeDocument((type) => { asked++; return { type } })
  const [a, b] = await Promise.all([canEncodeAvif(), canEncodeAvif()])
  await canEncodeAvif()
  assert.deepEqual([a, b], [true, true])
  assert.equal(asked, 1)
})

test('AVIF is hidden until confirmed, and only AVIF is hidden', () => {
  for (const unconfirmed of [null, false, undefined]) {
    assert.deepEqual(withAvifIf(FORMATS, unconfirmed).map((f) => f.id), ['image/png', 'image/webp', 'ico'])
  }
  assert.deepEqual(withAvifIf(FORMATS, true).map((f) => f.id), FORMATS.map((f) => f.id))
})

test('an inherited AVIF choice falls back unless the browser can encode it', () => {
  assert.equal(usableFormat('image/avif', false, 'image/webp'), 'image/webp')
  assert.equal(usableFormat('image/avif', null, 'image/webp'), 'image/webp')
  assert.equal(usableFormat('image/avif', true, 'image/webp'), 'image/avif')
  assert.equal(usableFormat('image/png', false, 'image/webp'), 'image/png')
})

test('the encode guard rejects a blob of the wrong type', () => {
  assert.equal(blobMatches({ type: 'image/avif' }, 'image/avif'), true)
  assert.equal(blobMatches({ type: 'image/png' }, 'image/avif'), false)
  assert.equal(blobMatches(null, 'image/png'), false)
})
