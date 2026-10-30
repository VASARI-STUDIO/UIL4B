// The icon pages end like the sales pages: a close, the spectrum strip, then the
// site footer, with the icon sets' licences as the footer's notice row.
//
// Rendered behaviour (one contentinfo, the copy by viewer, the stacked buttons
// at 390) is held by tests/user-sim. This file holds what can be checked
// without a browser: which routes wear the footer, the close's words, the
// licence rows, and that the pieces are wired together.
import test from 'node:test'
import assert from 'node:assert/strict'
import { read, stripComments } from './helpers/source-text.js'
import { toolWearsSpectrumFooter } from '../../src/components/nav/footerRoutes.js'
import { ICON_CLOSE_COPY, iconCloseSecondary } from '../../src/data/iconPageClose.js'
import { creditRows } from '../../src/data/iconPackCredits.js'

test('the Icon and Emoji libraries wear the sales footer, and no other tool does', () => {
  for (const path of ['/create/icons', '/create/icons/', '/CREATE/EMOJI', '/create/icons/groups', '/create/icons/groups/arrows']) {
    assert.equal(toolWearsSpectrumFooter(path), true, path)
  }
  for (const path of ['/create/palette', '/create/font-gallery', '/create/iconsx', '/tools', '/', '', undefined]) {
    assert.equal(toolWearsSpectrumFooter(path), false, String(path))
  }
})

test('the close has one headline for everyone, never says Log in and has no em dash', () => {
  const close = ICON_CLOSE_COPY
  assert.equal(close.heading, 'Now pick the colours and type.')
  const strings = [close.heading, close.body, close.primary, ...Object.values(close.secondary)]
  for (const text of strings) {
    assert.ok(!/log in/i.test(text), `"${text}" says Log in; the one Log in is the band above the grid`)
    assert.ok(!text.includes('—'), `"${text}" has an em dash`)
  }
})

test('the second button follows the viewer, and holds its width until the viewer is known', () => {
  assert.deepEqual(iconCloseSecondary({ tier: 'anon', known: true }), { label: 'See the plans', to: '/plans' })
  assert.deepEqual(iconCloseSecondary({ tier: 'free', known: true }), { label: 'See what Pro includes', to: '/plans' })
  assert.deepEqual(iconCloseSecondary({ tier: 'paid', known: true }), { label: 'Open your workspace', to: '/projects' })
  // Not known yet: a hidden stand-in with the widest label, whatever the tier says.
  for (const tier of ['anon', 'free', 'paid']) {
    assert.deepEqual(iconCloseSecondary({ tier, known: false }), { placeholder: 'See what Pro includes' })
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

test('the icon library ends with the close and the strip, once, after its panels', () => {
  const src = stripComments(read('src/pages/IconEmojiLibrary.jsx'))
  assert.equal(src.match(/<SpectrumClose\b/g)?.length, 1)
  assert.equal(src.match(/<SpectrumRamp className="sp-ramp--close" \/>/g)?.length, 1)
  assert.ok(src.indexOf('<SpectrumClose') > src.indexOf('role="tabpanel"'), 'the close is not after the panels')
  assert.match(src, /id="ig-close-h"/)
  // The headline is still on arrival: no reveal attribute on the close.
  assert.ok(!/data-sp-reveal/.test(read('src/components/spectrum/SpectrumClose.jsx')))
})

test('the grid stops loading by itself after three pages and offers a button', () => {
  const src = stripComments(read('src/pages/IconLibrary.jsx'))
  assert.match(src, /const AUTO_REVEAL_LIMIT = PAGE_SIZE \* 4/)
  assert.match(src, /visible < AUTO_REVEAL_LIMIT\s*\? <div ref=\{sentinelRef\} className="ig-sentinel" \/>/,
    'the sentinel is no longer swapped for the button past the limit')
  assert.match(src, /onClick=\{revealPage\}/)
})
