// Community-media uploads go to fixed slot names (utils/mediaSlots.js), the
// shape docs/design/upload-limits-rules.patch makes storage.rules accept. These
// tests pin the client half: what name and content type an upload gets, and that
// the client's table agrees with the rule text it has to satisfy.
import test from 'node:test'
import assert from 'node:assert/strict'
import { MEDIA_SLOTS, MAX_MEDIA_BYTES, resolveMediaKind, pickMediaSlot } from '../../src/utils/mediaSlots.js'
import { fileTextThrough } from '../../scripts/gated-patches.mjs'
import { read, stripComments } from './helpers/source-text.js'

test('the six accepted types map to their extension and canonical content type', () => {
  assert.deepEqual(resolveMediaKind('image/webp'), { ext: 'webp', contentType: 'image/webp' })
  assert.deepEqual(resolveMediaKind('image/png'), { ext: 'png', contentType: 'image/png' })
  assert.deepEqual(resolveMediaKind('image/jpeg'), { ext: 'jpg', contentType: 'image/jpeg' })
  assert.deepEqual(resolveMediaKind('image/gif'), { ext: 'gif', contentType: 'image/gif' })
  assert.deepEqual(resolveMediaKind('video/mp4'), { ext: 'mp4', contentType: 'video/mp4' })
  assert.deepEqual(resolveMediaKind('video/webm'), { ext: 'webm', contentType: 'video/webm' })
})

test('SVG, QuickTime and non-media types are refused so the caller takes its fallback', () => {
  assert.equal(resolveMediaKind('image/svg+xml', 'svg'), null)
  assert.equal(resolveMediaKind('video/quicktime', 'mov'), null)
  assert.equal(resolveMediaKind('text/html', 'webp'), null, 'the type wins over a friendly extension')
  assert.equal(resolveMediaKind('', 'svg'), null)
  assert.equal(resolveMediaKind('', ''), null)
  assert.equal(resolveMediaKind(undefined, undefined), null)
})

test('the blob type wins over the extension hint, and a type parameter is ignored', () => {
  assert.deepEqual(resolveMediaKind('image/png', 'webp'), { ext: 'png', contentType: 'image/png' })
  assert.deepEqual(resolveMediaKind('Image/WEBP; charset=x', ''), { ext: 'webp', contentType: 'image/webp' })
})

test('with no type the extension hint decides, and jpeg is spelled jpg', () => {
  assert.deepEqual(resolveMediaKind('', 'jpeg'), { ext: 'jpg', contentType: 'image/jpeg' })
  assert.deepEqual(resolveMediaKind('', '.MP4'), { ext: 'mp4', contentType: 'video/mp4' })
  assert.equal(resolveMediaKind('', 'bin'), null)
})

test('the first free slot of the type is used, and other types do not count', () => {
  assert.equal(pickMediaSlot([], 'webp'), 'slot-0.webp')
  assert.equal(pickMediaSlot(['slot-0.webp', 'slot-1.webp'], 'webp'), 'slot-2.webp')
  assert.equal(pickMediaSlot(['slot-0.png', 'slot-0.mp4'], 'webp'), 'slot-0.webp')
  // A gap is filled before a higher number is used.
  assert.equal(pickMediaSlot(['slot-0.webp', 'slot-2.webp'], 'webp'), 'slot-1.webp')
  // Legacy timestamp names take no slot.
  assert.equal(pickMediaSlot(['1730000000000.webp'], 'webp'), 'slot-0.webp')
})

test('with all ten slots taken a random slot is reused, never an eleventh name', () => {
  const full = Array.from({ length: MEDIA_SLOTS }, (_, n) => `slot-${n}.webp`)
  assert.equal(MEDIA_SLOTS, 10)
  assert.equal(pickMediaSlot(full, 'webp', () => 0), 'slot-0.webp')
  assert.equal(pickMediaSlot(full, 'webp', () => 0.55), 'slot-5.webp')
  assert.equal(pickMediaSlot(full, 'webp', () => 0.999999), 'slot-9.webp')
})

test('uploadCommunityMedia names objects with the slot helper, not a timestamp', () => {
  const src = stripComments(read('src/utils/mediaUpload.js'))
  assert.match(src, /pickMediaSlot\(taken, kind\.ext\)/)
  assert.match(src, /resolveMediaKind\(blobOrFile\.type/)
  assert.match(src, /\{ contentType: kind\.contentType \}/, 'the content type must be the canonical one for the slot extension')
  assert.ok(!/Date\.now\(\)/.test(src), 'a timestamp name would be refused by storage.rules and add an object per upload')
  assert.match(src, /size > MAX_MEDIA_BYTES/)
  assert.equal(MAX_MEDIA_BYTES, 10 * 1024 * 1024)
})

test('the client table and the storage rule name the same six extension and type pairs', async () => {
  const rules = await fileTextThrough('upload-limits', 'storage.rules')
  const pairs = [...rules.matchAll(/matches\('slot-\[0-9\]\\\\\.(\w+)'\) && mime == '([\w/]+)'/g)]
    .map((m) => [m[1], m[2]])
  assert.deepEqual(pairs, [
    ['webp', 'image/webp'], ['png', 'image/png'], ['jpg', 'image/jpeg'],
    ['gif', 'image/gif'], ['mp4', 'video/mp4'], ['webm', 'video/webm'],
  ])
  for (const [ext, type] of pairs) {
    assert.deepEqual(resolveMediaKind(type), { ext, contentType: type }, `${type} does not resolve to .${ext}`)
  }
  assert.match(rules, /request\.resource\.size <= 10 \* 1024 \* 1024/)
  assert.match(rules, /request\.auth\.token\.email_verified == true/)
})
