// The animated download in the icon customiser: offered on animated sets to a
// Pro viewer and nobody else, named and typed as an SVG file, and gated as every
// other download is. The sets themselves are covered by animated-icons-client.test.js.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { stripJs as strip } from '../helpers/strip-comments.js'
import { ANIMATED_PACKS, ICON_PACK_TIERS } from '../../src/data/iconPackTiers.js'
import {
  ANIMATED_DOWNLOAD, animatedDownloadBlob, animatedDownloadFileName, downloadFileName, offersAnimatedDownload,
} from '../../src/utils/iconDownload.js'

const PAGE = strip(fs.readFileSync('src/pages/IconLibrary.jsx', 'utf8')).replace(/\r\n/g, '\n')

test('every animated set offers the animated download to Pro', () => {
  assert.ok(ANIMATED_PACKS.length > 0)
  for (const pack of ANIMATED_PACKS) assert.equal(offersAnimatedDownload(pack, true), true, pack)
})

test('a set that is not animated offers no animated download, Pro or not', () => {
  const still = Object.keys(ICON_PACK_TIERS).filter((p) => !ANIMATED_PACKS.includes(p))
  assert.ok(still.length > 0)
  for (const pack of still) {
    assert.equal(offersAnimatedDownload(pack, true), false, pack)
    assert.equal(offersAnimatedDownload(pack, false), false, pack)
  }
  assert.equal(offersAnimatedDownload(undefined, true), false)
  assert.equal(offersAnimatedDownload('custom', true), false)
})

test('a viewer who is not Pro is never offered it, whatever the set', () => {
  for (const pack of ANIMATED_PACKS) {
    assert.equal(offersAnimatedDownload(pack, false), false, pack)
    assert.equal(offersAnimatedDownload(pack, undefined), false, pack)
    assert.equal(offersAnimatedDownload(pack, 'true'), false, pack)
  }
})

test('the file is an SVG named <icon>-animated.svg, clean of odd characters', () => {
  assert.equal(animatedDownloadFileName('wifi-loop'), 'wifi-loop-animated.svg')
  assert.equal(animatedDownloadFileName('a b/c'), 'a-b-c-animated.svg')
  assert.equal(animatedDownloadFileName(''), 'icon-animated.svg')
  assert.equal(animatedDownloadFileName(undefined), 'icon-animated.svg')
  assert.notEqual(animatedDownloadFileName('x'), downloadFileName('x', { kind: 'svg' }))
})

test('the animated file is typed image/svg+xml and carries the markup unchanged', async () => {
  assert.equal(ANIMATED_DOWNLOAD.mime, 'image/svg+xml')
  const markup = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle r="2"><animate attributeName="r" dur="1s" values="2;4;2" repeatCount="indefinite"/></circle></svg>'
  const blob = animatedDownloadBlob(markup)
  assert.equal(blob.type, 'image/svg+xml')
  assert.equal(await blob.text(), markup)
})

test('no markup, no file', () => {
  for (const v of [undefined, null, '', '   ', 42]) assert.equal(animatedDownloadBlob(v), null)
})

test('the page asks the glyph store for the served markup, and asks for the export gate first', () => {
  const start = PAGE.indexOf('const handleAnimatedDownload')
  assert.ok(start > 0)
  const body = PAGE.slice(start, PAGE.indexOf('\n  }\n', start))
  assert.match(body, /showAnimatedDownload/)
  assert.ok(body.indexOf('requireExportAccount') > 0 && body.indexOf('requireExportAccount') < body.indexOf('saveBlobAs'))
  assert.match(body, /fetchSvgText\(activeIcon\.pack, activeIcon\.name\)/)
  assert.doesNotMatch(body, /baseSvgText|serializedOutput/)
})
