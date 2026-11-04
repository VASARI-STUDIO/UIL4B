// The icon pages end at the site footer, with the icon sets' licences as its notice row and
// at most one call to action (the Icon panel's end block) before it: no sales close, no spectrum strip.
//
// Rendered behaviour (one contentinfo, the single CTA at 390/768/1440) is held by tests/user-sim.
// This file holds what can be checked without a browser.
import test from 'node:test'
import assert from 'node:assert/strict'
import { read, stripComments } from './helpers/source-text.js'
import { toolWearsSpectrumFooter } from '../../src/components/nav/footerRoutes.js'
import { creditRows } from '../../src/data/iconPackCredits.js'

test('the Icon and Emoji libraries wear the sales footer, and no other tool does', () => {
  for (const path of ['/create/icons', '/create/icons/', '/CREATE/EMOJI', '/create/icons/groups', '/create/icons/groups/arrows']) {
    assert.equal(toolWearsSpectrumFooter(path), true, path)
  }
  for (const path of ['/create/palette', '/create/font-gallery', '/create/iconsx', '/tools', '/', '', undefined]) {
    assert.equal(toolWearsSpectrumFooter(path), false, String(path))
  }
})

test('credit rows name each set with its licence and link to its set page', () => {
  const rows = creditRows(['lucide', 'tabler'])
  assert.deepEqual(rows.map((r) => `${r.name} (${r.licenceName})`), ['Lucide (ISC)', 'Tabler Icons (MIT)'])
  assert.ok(rows.every((r) => /^https:\/\//.test(r.url)))
  // A set outside the curated table is credited by its prefix and the Iconify page.
  assert.deepEqual(creditRows(['no-such-set']), [{
    prefix: 'no-such-set', name: 'no-such-set', url: 'https://icon-sets.iconify.design/no-such-set/', licenceName: 'licence on Iconify',
  }])
  // The registry's live answer lays over the table.
  assert.equal(creditRows(['lucide'], () => ({ spdx: 'MIT' }))[0].licenceName, 'MIT')
  assert.deepEqual(creditRows([]), [])
  assert.deepEqual(creditRows(undefined), [])
})

test('the notice row draws nothing with no sets, and has no em dash', () => {
  const src = stripComments(read('src/components/library/IconCredits.jsx'))
  assert.match(src, /rows\.length === 0\) return null/)
  assert.ok(!src.includes('—'), 'IconCredits has an em dash')
})

test('the footer takes a notice slot between the columns and the baseline', () => {
  const src = stripComments(read('src/components/spectrum/SpectrumFooter.jsx'))
  const grid = src.indexOf('sp-footer-grid')
  const notice = src.indexOf('{notice}')
  const legal = src.indexOf('className="sp-footer-legal"')
  assert.ok(grid > -1 && notice > grid && legal > notice, 'the notice slot is not between the grid and the baseline')
})


test('the icon library ends at the footer: no close, no spectrum strip, no sales imports', () => {
  const src = stripComments(read('src/pages/IconEmojiLibrary.jsx'))
  assert.ok(!/SpectrumClose|SpectrumRamp|ig-close|iconPageClose/.test(src), 'a sales close or strip is back on the icon pages')
})

test('the toolbar pins My icons and puts Add icon on the My icons view, not the toolbar', () => {
  const src = stripComments(read('src/pages/IconLibrary.jsx'))
  const toolbar = src.slice(src.indexOf('<LibraryToolbar'), src.indexOf('</LibraryToolbar>'))
  assert.match(toolbar, /pinned=\{/)
  assert.ok(!toolbar.includes('ig-addbtn') && !toolbar.includes('count={'), 'Add icon or the visible count is back on the toolbar')
  assert.ok(!/value: 'custom'|id: 'custom'/.test(src), 'My icons is back in the pack menu or the group tray')
  assert.match(src, /ig-mysec-head[\s\S]*addIconButton/)
})
