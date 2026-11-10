import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  BACKDROP_BASE, backdropFor, backdropKind, backdropUrls, nameSum,
} from '../../src/utils/galleryBackdrop.js'

const publicFile = (url) => fileURLToPath(new URL(`../../public${url}`, import.meta.url))

test('a Google category maps to a kind, and anything unknown reads as sans', () => {
  assert.equal(backdropKind('sans-serif'), 'sans')
  assert.equal(backdropKind('serif'), 'serif')
  assert.equal(backdropKind('display'), 'display')
  assert.equal(backdropKind('handwriting'), 'script')
  assert.equal(backdropKind('monospace'), 'mono')
  assert.equal(backdropKind('something-new'), 'sans')
  assert.equal(backdropKind(undefined), 'sans')
})

test('the strip is picked by the sum of the name\'s character codes', () => {
  assert.equal(nameSum('Inter'), 73 + 110 + 116 + 101 + 114)
  // Inter: 514 mod 4 is 2, so the third dark sans strip; mod 2 is 0, the first light one.
  assert.equal(backdropFor('Inter', 'sans-serif', 'dark'), `${BACKDROP_BASE}dark-script-4.webp`)
  assert.equal(backdropFor('Inter', 'sans-serif', 'light'), `${BACKDROP_BASE}light-sans-1.webp`)
})

test('the same family always gets the same strip, and a light ground uses the light set', () => {
  assert.equal(backdropFor('Lora', 'serif', 'dark'), backdropFor('Lora', 'serif', 'dark'))
  assert.match(backdropFor('Lora', 'serif', 'light'), /\/light-/)
  assert.match(backdropFor('Lora', 'serif', 'dark'), /\/dark-/)
  assert.match(backdropFor('Lora', 'serif', 'anything-else'), /\/dark-/)
})

test('the sets hold 20 dark and 10 light strips, and every one is hosted under 200KB', () => {
  const dark = backdropUrls('dark')
  const light = backdropUrls('light')
  assert.equal(dark.length, 20)
  assert.equal(light.length, 10)
  assert.equal(new Set(dark).size, 20)
  for (const url of [...dark, ...light]) {
    const file = publicFile(url)
    assert.ok(existsSync(file), `${url} is missing from public/`)
    assert.ok(statSync(file).size < 200 * 1000, `${url} is over 200KB`)
  }
})

test('one kind\'s list is four strips on dark and two on light', () => {
  assert.equal(backdropUrls('dark', 'serif').length, 4)
  assert.equal(backdropUrls('light', 'serif').length, 2)
})

// ── The files each strip ships ───────────────────────────────────────────────
// Four files per strip: AVIF and WebP at the full size, and at the small size
// the phone layout switches to. The full size is the widest the source images
// go (they were generated 1536 px wide), so it is also a floor: a re-encode at a
// smaller size, or a missing file, must fail here instead of going soft quietly.

const FULL = { width: 1536, height: 460 }
const SMALL = { width: 768, height: 230 }

// The pixel size of a WebP, from its first chunk (lossy, lossless or extended).
function webpSize(buf) {
  assert.equal(buf.toString('latin1', 0, 4), 'RIFF')
  assert.equal(buf.toString('latin1', 8, 12), 'WEBP')
  const kind = buf.toString('latin1', 12, 16)
  if (kind === 'VP8X') return { width: 1 + buf.readUIntLE(24, 3), height: 1 + buf.readUIntLE(27, 3) }
  if (kind === 'VP8L') {
    const bits = buf.readUInt32LE(21)
    return { width: 1 + (bits & 0x3fff), height: 1 + ((bits >> 14) & 0x3fff) }
  }
  assert.equal(kind, 'VP8 ')
  return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff }
}

// The pixel size of an AVIF, from its `ispe` (image spatial extents) box.
function avifSize(buf) {
  const at = buf.indexOf('ispe', 0, 'latin1')
  assert.ok(at > 0, 'no ispe box, so this is not an AVIF')
  return { width: buf.readUInt32BE(at + 8), height: buf.readUInt32BE(at + 12) }
}

const filesOf = (url) => {
  const stem = url.replace(/\.webp$/, '')
  return [
    { file: `${stem}.webp`, size: webpSize, want: FULL },
    { file: `${stem}.avif`, size: avifSize, want: FULL },
    { file: `${stem}-m.webp`, size: webpSize, want: SMALL },
    { file: `${stem}-m.avif`, size: avifSize, want: SMALL },
  ]
}

test('every strip ships its AVIF and WebP at the full and the small size, none under that size', () => {
  const urls = [...backdropUrls('dark'), ...backdropUrls('light')]
  assert.equal(urls.length, 30)
  for (const url of urls) {
    for (const { file, size, want } of filesOf(url)) {
      const path = publicFile(file)
      assert.ok(existsSync(path), `${file} is missing from public/`)
      const got = size(readFileSync(path))
      assert.ok(got.width >= want.width && got.height >= want.height,
        `${file} is ${got.width} x ${got.height}, under the ${want.width} x ${want.height} it must keep`)
    }
  }
})

test('the small files are the phone\'s and stay well under the full ones', () => {
  for (const url of [...backdropUrls('dark'), ...backdropUrls('light')]) {
    const [full, , small] = filesOf(url)
    assert.ok(statSync(publicFile(small.file)).size < statSync(publicFile(full.file)).size, `${small.file} is not smaller than ${full.file}`)
  }
})

test('all four files of every strip, AVIF and the phone sizes too, stay under 200KB', () => {
  // The first cap test reads only the WebP url a strip is picked by; the AVIF
  // and the small files are what most browsers actually fetch.
  for (const url of [...backdropUrls('dark'), ...backdropUrls('light')]) {
    for (const { file } of filesOf(url)) {
      const bytes = statSync(publicFile(file)).size
      assert.ok(bytes < 200 * 1000, `${file} is ${bytes} bytes, over 200KB`)
    }
  }
})

test('the strips keep the higher-quality encode: the 120 files together are far above the old soft ones', () => {
  // The 30 strips were re-encoded at about 45 dB PSNR. The soft encodes they
  // replaced came to 1.95 MB in all; the re-encode is 8.2 MB. A floor of 6 MB
  // fails if a later pass squeezes them back down, which no size cap or
  // dimension check would notice.
  let total = 0
  for (const url of [...backdropUrls('dark'), ...backdropUrls('light')]) {
    for (const { file } of filesOf(url)) total += statSync(publicFile(file)).size
  }
  assert.ok(total > 6 * 1000 * 1000, `the strips total ${total} bytes, under the 6 MB the higher-quality encode needs`)
})
