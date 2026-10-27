// THE LICENSES.txt IN A GROUP DOWNLOAD CARRIES WHAT MIT, ISC AND APACHE ASK FOR.
//
// MIT and ISC: the copyright notice and the licence text with every copy.
// Apache-2.0 section 4(a): a copy of the licence. The file used to hold only a
// name, an author and a link. Every pack is checked here, not only the packs a
// group uses today, so a pack added later cannot ship a download without them.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ICON_PACK_CREDITS, licenceOf } from '../../src/data/iconPackCredits.js'
import { APACHE_2_0, licenceFileText, licenceText } from '../../src/data/iconLicenceTexts.js'

const NEEDS_TEXT = { MIT: 'Permission is hereby granted', ISC: 'Permission to use, copy, modify', 'Apache-2.0': 'Apache License' }

test('every MIT, ISC and Apache pack has a copyright line', () => {
  for (const [prefix, row] of Object.entries(ICON_PACK_CREDITS)) {
    if (!NEEDS_TEXT[row.spdx]) continue
    assert.ok(typeof row.copyright === 'string' && row.copyright.trim().length > 3, `${prefix} (${row.spdx}) has no copyright line`)
  }
})

test('the file for each such pack holds its copyright line and the licence text', () => {
  for (const [prefix, row] of Object.entries(ICON_PACK_CREDITS)) {
    const needle = NEEDS_TEXT[row.spdx]
    if (!needle) continue
    const file = licenceFileText([prefix])
    assert.ok(file.includes(row.copyright), `${prefix}: copyright line missing from the file`)
    assert.ok(file.includes(needle), `${prefix}: ${row.spdx} text missing from the file`)
    assert.ok(file.includes(licenceOf(row.spdx).url), `${prefix}: licence link missing`)
  }
})

test('the two new packs name their notices exactly', () => {
  const carbon = licenceFileText(['carbon'])
  assert.ok(carbon.includes('Copyright 2015 IBM Corp.'))
  assert.ok(carbon.includes('Apache License') && carbon.includes('Version 2.0, January 2004'))
  assert.ok(carbon.includes('END OF TERMS AND CONDITIONS'))
  assert.ok(!carbon.includes('[yyyy]'), 'the appendix template must not be shipped as if it were a notice')
  const ming = licenceFileText(['mingcute'])
  assert.ok(ming.includes('MingCute Design') && ming.includes('Apache License'))
})

test('Lucide also carries the MIT text for its Feather-derived icons; CC0 and CC BY point at their licence', () => {
  const lucide = licenceFileText(['lucide'])
  assert.ok(lucide.includes('Copyright (c) 2013-present Cole Bemis') && lucide.includes('Permission is hereby granted'))
  assert.equal(licenceText('CC0-1.0', null), null)
  assert.match(licenceFileText(['simple-icons']), /creativecommons\.org\/publicdomain\/zero/)
  assert.match(licenceFileText(['solar']), /480 Design[\s\S]*creativecommons\.org\/licenses\/by\/4\.0/)
  assert.ok(APACHE_2_0.length > 9000)
})
