// The homepage export section can only advertise formats the product builds.
//
// `tests/unit/plans-truth.test.js` already holds this contract for /plans, and
// it exists because the pricing and checkout pages both sold "full design JSON"
// as a Pro benefit while `json` in exportFormats.js has never carried
// `live: true` — a "Soon" badge over a disabled button, and no branch in
// runExport() that could build one. Somebody could have paid for a file the
// product cannot make.
//
// The homepage now names export formats too, on the founder's 2026-09-07
// instruction to feature the design-kit exports as a section. It is the FIRST
// pricing-adjacent claim any visitor meets, so it gets the same contract: the
// section derives from the one truth table, and this test fails the build if it
// ever types a format name instead.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  EXPORT_FORMATS, assertFormatsCoherent, liveFormats, proOnlyFormats, unbuiltFormats,
} from '../../src/config/exportFormats.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const src = readFileSync(path.join(root, 'src', 'components', 'HomeExportKit.jsx'), 'utf8')

test('the export table is internally coherent', () => {
  assert.equal(assertFormatsCoherent(EXPORT_FORMATS), true)
})

test('the homepage section derives its formats and does not type them', () => {
  assert.match(src, /liveFormats\(\)/, 'the section no longer reads the live formats from exportFormats.js')
  assert.match(src, /proOnlyFormats\(\)/, 'the section no longer reads the Pro formats from exportFormats.js')

  // The names must not be present as literals. Deriving AND typing is how the
  // two fall out of step, which is the defect this contract was written for.
  for (const f of EXPORT_FORMATS) {
    assert.ok(
      !src.includes(f.name),
      `HomeExportKit.jsx types the format name "${f.name}" as a literal instead of rendering it `
      + 'from exportFormats.js.',
    )
  }
})

test('no unbuilt format can reach the homepage', () => {
  const unbuilt = unbuiltFormats()
  // Positive control FIRST: if this list is ever empty the loop below asserts
  // nothing at all, and the test would pass on a page advertising everything.
  assert.ok(
    unbuilt.length > 0,
    'there are no unbuilt formats left, so this test no longer proves anything — either the '
    + 'four Soon formats shipped (delete this test and say so) or exportFormats.js is broken',
  )
  for (const f of unbuilt) {
    assert.ok(
      !src.includes(f.name) && !src.includes(`'${f.id}'`),
      `the homepage export section names "${f.name}" (${f.id}), which is NOT live. This is the `
      + '"full design JSON" defect on the front page.',
    )
  }
  // And the derivation itself must exclude them, not merely happen to.
  const liveIds = new Set(liveFormats().map((f) => f.id))
  for (const f of unbuilt) {
    assert.ok(!liveIds.has(f.id), `${f.id} is in both the live and unbuilt sets`)
  }
})

test('the Pro formats are badged, and the badge is derived from the same flag as the gate', () => {
  const pro = proOnlyFormats()
  assert.ok(pro.length > 0, 'no Pro export formats — the section would badge nothing and this test would prove nothing')
  // The component builds its badge set from proOnlyFormats(), so the badge and
  // ExportPanel's entitlement check cannot disagree: a format can never be
  // badged and ungated, or gated and unbadged.
  assert.match(src, /proIds\.has\(f\.id\)/, 'the Pro badge no longer keys off the exportFormats.js flag')
  for (const f of pro) {
    assert.equal(f.live, true, `${f.id} is Pro without being live — a paid promise of a file that does not exist`)
  }
})

test('the section renders the real deck, not a fixture of it', () => {
  // The founder asked for the product's own output, "no stock mockup imagery,
  // no tote bag, no invented cover". The guard is that the section imports the
  // modules that BUILD the real documents rather than describing their pages.
  assert.match(src, /from '\.\.\/utils\/brandGuidelines'/, 'the spread no longer reads the real guidelines module')
  assert.match(src, /guidelineSections\(/, 'the spread no longer uses the real section planner')
  assert.match(src, /typeLadder\(/, 'the spread no longer uses the real type ladder')
  // And that it takes the live system rather than holding a palette of its own.
  assert.match(src, /system\.palette/, 'the spread no longer reads the workbench palette')
})
