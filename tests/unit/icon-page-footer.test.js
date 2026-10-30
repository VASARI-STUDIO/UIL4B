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

// The reveal rule, run for real. revealPage is lifted out of the page's source and
// executed against stand-ins for its refs, setVisible and requestAnimationFrame, so
// the test sees what it does (how far `visible` moves), not how it is spelled.
function loadRevealPage(src) {
  const start = src.indexOf('const revealPage = useCallback(')
  const end = src.indexOf('}, [])', start)
  assert.ok(start > -1 && end > start, 'revealPage is no longer a useCallback with no dependencies')
  const body = `return (${src.slice(start, end + 1).replace('const revealPage = useCallback(', '')})`
  const num = (name) => Number(src.match(new RegExp(`const ${name} = (\\d+)`))[1])
  const PAGE_SIZE = num('PAGE_SIZE')
  const REVEAL_CHUNK = num('REVEAL_CHUNK')
  const AUTO_REVEAL_LIMIT = PAGE_SIZE * Number(src.match(/const AUTO_REVEAL_LIMIT = PAGE_SIZE \* (\d+)/)[1])
  const make = (visibleAt, total) => {
    const state = { visible: visibleAt, frames: [] }
    const raf = (fn) => { state.frames.push(fn); return state.frames.length }
    const setVisible = (n) => { state.visible = n }
    const revealPage = new Function(
      'revealRef', 'visibleRef', 'totalRef', 'AUTO_REVEAL_LIMIT', 'PAGE_SIZE', 'REVEAL_CHUNK', 'setVisible', 'requestAnimationFrame',
      body,
    )({ current: 0 }, { current: visibleAt }, { current: total }, AUTO_REVEAL_LIMIT, PAGE_SIZE, REVEAL_CHUNK, setVisible, raf)
    // Run every queued animation frame, as the browser would.
    const settle = () => { while (state.frames.length) state.frames.shift()() }
    return { state, revealPage, settle }
  }
  return { make, PAGE_SIZE, AUTO_REVEAL_LIMIT }
}

test('the grid stops loading by itself after the automatic pages, then offers a button', () => {
  const src = stripComments(read('src/pages/IconLibrary.jsx'))

  // 1. At the limit the sentinel is replaced by the button, which forces a reveal.
  assert.match(src, /hasMore && \(visible < AUTO_REVEAL_LIMIT\s*\? <div ref=\{sentinelRef\} className="ig-sentinel" \/>\s*: \(/,
    'past the limit the sentinel is no longer swapped for something else')
  const more = src.slice(src.indexOf('className="ig-more"'))
  assert.match(more.slice(0, more.indexOf('</div>')), /<button[^>]*onClick=\{\(\) => revealPage\(true\)\}/,
    'the button no longer forces a reveal')
  // The observer path calls revealPage with no argument, so it can never force one.
  assert.match(src, /if \(e\.isIntersecting\) revealPage\(\)\s*\n/, 'the observer must call revealPage() with no force flag')

  const { make, PAGE_SIZE, AUTO_REVEAL_LIMIT } = loadRevealPage(src)
  const total = AUTO_REVEAL_LIMIT * 3

  // 2. The observer path (no argument) reveals below the limit...
  const below = make(AUTO_REVEAL_LIMIT - PAGE_SIZE, total)
  below.revealPage()
  below.settle()
  assert.equal(below.state.visible, AUTO_REVEAL_LIMIT, 'the last automatic page did not load')

  // ...and bails at it, which is what a stale observer callback hits after the last chunk.
  const atLimit = make(AUTO_REVEAL_LIMIT, total)
  atLimit.revealPage()
  atLimit.settle()
  assert.equal(atLimit.state.visible, AUTO_REVEAL_LIMIT, 'the observer path went past AUTO_REVEAL_LIMIT')
  // A click event object is not a force: only a literal true is.
  atLimit.revealPage({ type: 'click' })
  atLimit.settle()
  assert.equal(atLimit.state.visible, AUTO_REVEAL_LIMIT, 'a non-true argument forced a reveal')

  // 3. The button (revealPage(true)) reveals exactly one more page from the limit.
  const forced = make(AUTO_REVEAL_LIMIT, total)
  forced.revealPage(true)
  forced.settle()
  assert.equal(forced.state.visible, AUTO_REVEAL_LIMIT + PAGE_SIZE, 'the button did not reveal one page')

  // The forced page stops at the end of the list when fewer than a page remain.
  const tail = make(AUTO_REVEAL_LIMIT, AUTO_REVEAL_LIMIT + 7)
  tail.revealPage(true)
  tail.settle()
  assert.equal(tail.state.visible, AUTO_REVEAL_LIMIT + 7)
})
