// The maker credit and the "Sample" label on a Community tile are never clipped.
//
// A tile's `.cm-tile-meta` reads "<maker> · <kind> · Sample". It wraps, and "· Sample"
// is kept whole, so a narrow tile drops a line rather than the END of the text, and the
// end is the word "Sample". Every
// piece on /community is a sample, and that word is the page being honest about it;
// the maker link at the front is whose work it is. A phone-width grid that quietly
// cuts either one has half undone the two things the line is there to say.
//
// (This was `.ch-card-source`, the platform credit on a curated card: "Dribbble"
// clipped to "Dribbbl…" to save two pixels. Those cards are gone; the meta line is
// the same place for the same promise.)
//
// MUTATION: render the maker name after the kind in pieceUi.jsx (or give `.cm-maker-link` a
// long `padding-right`): the maker test fails and names the tiles.
//
// `test` comes from ./base.js, not @playwright/test — that is where Google One
// Tap is stubbed on the browser fixture, and tests/unit/one-tap-stub.test.js
// fails the build for any spec that reaches past it.
import { test, expect } from './base.js'
import { go, watch, expectRendered } from './helpers.js'

const PERSONA = 'someone browsing community work on a phone'

// 360 is the width the old card was measured failing at; the others bracket it, because a
// single width would not notice the grid changing column count.
const WIDTHS = [320, 360, 390, 414]

/** Per width: how many tiles there are, and how many have the given part drawn past the right edge of the meta line. */
async function measure(page, width, part) {
  await page.setViewportSize({ width, height: 900 })
  await go(page, '/community')
  await expectRendered(page)
  await page.waitForFunction(() => document.querySelectorAll('.cm-tile-meta').length > 0, null, { timeout: 15000 })
  return page.evaluate((sel) => {
    const metas = [...document.querySelectorAll('.cm-grid .cm-tile-meta')]
    const cut = metas.filter((m) => {
      const el = m.querySelector(sel)
      return !el || el.getBoundingClientRect().right > m.getBoundingClientRect().right + 1
    })
    return { examined: metas.length, cut: cut.map((m) => m.textContent) }
  }, part)
}

test.describe('community tiles credit their maker and say "Sample"', () => {
  test('no tile cuts its maker credit at any narrow width', async ({ page }) => {
    watch(page, PERSONA)
    for (const width of WIDTHS) {
      const r = await measure(page, width, '.cm-maker-link')
      // Positive control: an empty list makes the check vacuous, and a tile with no maker link
      // counts as cut, so a tile that lost its credit altogether fails too.
      expect(r.examined, `/community at ${width}px rendered no tiles: the assertion below would pass vacuously`).toBeGreaterThan(0)
      expect(r.cut, `/community at ${width}px cuts the maker credit on ${r.cut.length} tile(s): ${r.cut.join(' | ')}`).toEqual([])
    }
  })

  test('no tile cuts its "Sample" label at any narrow width', async ({ page }) => {
    watch(page, PERSONA)
    for (const width of WIDTHS) {
      const r = await measure(page, width, '.cm-sample')
      expect(r.examined, `/community at ${width}px rendered no tiles`).toBeGreaterThan(0)
      expect(r.cut, `/community at ${width}px cuts the Sample label on ${r.cut.length} tile(s)`).toEqual([])
    }
  })
})
