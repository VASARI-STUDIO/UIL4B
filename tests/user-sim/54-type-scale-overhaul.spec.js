// The Type Scale overhaul, in a browser.
//
// #type-scale-ui-overhaul. The founder: "the type scale UI needs a overhaul it
// looks AI generated. design the tool with a user centric design".
//
// Every assertion here is a thing that was true of the page BEFORE the change
// and must stay false, or a wiring that the change introduced and that a green
// build would not notice breaking. The diagnosis behind each one is in the
// comments in src/pages/TypeScale.jsx beside the markup it removed.
//
// WHY THESE ARE WIRING TESTS. Twice in this repo a correct fix shipped beside a
// test that exercised a helper in isolation, so reverting the actual call site
// passed the whole suite. The two tests below that matter most — the ratio and
// the preview text — assert that a CONTROL moves a RENDERED THING, not that a
// pure function returns the right number. `fitTypePreviewSize` and `stepPx`
// have their own unit tests; this file has none of that.

import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

// The visible one. Type Scale keeps a second, hidden ladder in no case, but the
// rail and the ladder both carry `.seg-label` and `.tsc-select`, and a
// disclosure that is closed leaves its controls in the DOM at 0x0 — a
// querySelector that does not filter would measure one of those.
const visible = (page, sel) => page.locator(sel).filter({ visible: true })

test.describe('Type Scale · the overhaul', () => {
  test('the generated furniture is gone from the masthead', async ({ page }) => {
    watch(page, 'the founder re-reading the page he marked AI')
    await go(page, '/create/type-scale')

    // 1. THE TAXONOMY EYEBROW. Marked "AI" by the founder on the Font Gallery
    //    and deleted from every tool masthead #382 reached. It did not reach
    //    this page, so "Create / Typography" was still here.
    await expect(page.locator('.tsc-page .sec-h-eyebrow')).toHaveCount(0)
    await expect(page.getByText('Create / Typography', { exact: true })).toHaveCount(0)

    // 2. THE FIGURE STRIP. Five cells of equal weight — the same motif as the
    //    three-up strip #382 deleted from the Gallery, and every one of its
    //    figures was restated within 150px of it.
    await expect(page.locator('.tsc-status')).toHaveCount(0)

    // 3. THE NUMBERED BADGES. 01 / 02 / 03, which at 1344px+ read RIGHT TO
    //    LEFT because the grid put the rail on the right of the ladder.
    await expect(page.locator('.tsc-section-num')).toHaveCount(0)

    // 4. THE DISPLAY h1. On a page about type, the largest type on it was the
    //    one string the visitor cannot change. The ladder is the loudest thing
    //    here now, so the title must be smaller than the top step it sits over.
    const h1 = await page.locator('.tsc-masthead h1').evaluate(
      el => parseFloat(getComputedStyle(el).fontSize),
    )
    const topStep = await page.locator('.tsc-row-text').first().evaluate(
      el => parseFloat(getComputedStyle(el).fontSize),
    )
    expect(h1, 'the masthead h1 is no longer display-sized').toBeLessThan(40)
    expect(h1, 'the specimen outranks the page title on a page about type').toBeLessThan(topStep)

    // 5. THE APHORISM over the cross-links.
    await expect(page.getByText('A scale is half the system', { exact: false })).toHaveCount(0)
    await expect(page.locator('.tsc-more-kicker')).toHaveCount(0)
  })

  test('the scale bar is the two numbers, and they drive the ladder', async ({ page }) => {
    watch(page, 'designer choosing a base and a ratio')
    await go(page, '/create/type-scale')

    // The bar sits ABOVE the grid, so the controls that make the scale are
    // adjacent to the ladder they drive at every width — which is what the
    // 1344px column reorder used to buy for the rail, and no longer has to.
    const barTop = await page.locator('.tsc-scale-bar').evaluate(el => el.getBoundingClientRect().top)
    const ladderTop = await page.locator('.tsc-ladder').evaluate(el => el.getBoundingClientRect().top)
    expect(barTop, 'the scale bar leads the ladder').toBeLessThan(ladderTop)

    // WIRING. The ratio is a control in the bar; the range beside it and the
    // top row of the ladder are both computed from it. 16 x 1.25^6 = 61.04 and
    // 16 x 1.5^6 = 182.25, at the default nearest-0.5px rounding.
    const range = page.locator('.tsc-scale-range')
    const largest = page.locator('.tsc-row').first().locator('.tsc-row-num')
    await expect(range).toHaveText('10px – 61px')
    await expect(largest).toContainText('61px')

    await page.getByLabel('Scale ratio').selectOption('1.5')
    await expect(range).toHaveText('10.5px – 182.5px')
    await expect(largest).toContainText('182.5px')

    // And the base, from its own control in the same bar.
    await page.locator('#tsc-base + .snapv-value').click()
    await page.getByRole('spinbutton', { name: /Base font size/ }).fill('20')
    await page.getByRole('spinbutton', { name: /Base font size/ }).press('Enter')
    await expect(page.locator('#tsc-base + .snapv-value')).toHaveText('20px')
    await expect(largest).toContainText('227.5px')
  })

  test('the ladder comes before the rail, at every width', async ({ page }) => {
    watch(page, 'designer on a laptop and on a phone')

    // The rail used to lead in the DOM. Below 1344px this page is a single
    // column, so that put ~330px of families and a closed disclosure between
    // the scale bar and the thing it describes on most screens.
    for (const [w, h] of [[1440, 900], [1200, 900], [768, 1024], [390, 844]]) {
      await page.setViewportSize({ width: w, height: h })
      await go(page, '/create/type-scale')
      const order = await page.evaluate(() => {
        const out = document.querySelector('.tsc-output').getBoundingClientRect()
        const cfg = document.querySelector('.tsc-config').getBoundingClientRect()
        return { outTop: Math.round(out.top), cfgTop: Math.round(cfg.top), outLeft: Math.round(out.left), cfgLeft: Math.round(cfg.left) }
      })
      if (order.outTop === order.cfgTop) {
        // Two columns: the ladder takes the wide left column.
        expect(order.outLeft, `${w}px: the ladder is the left column`).toBeLessThan(order.cfgLeft)
      } else {
        expect(order.outTop, `${w}px: the ladder is above the rail`).toBeLessThan(order.cfgTop)
      }
    }
  })

  test('preview text replaces the specimen in the ladder and in the page preview', async ({ page }) => {
    watch(page, 'designer checking the scale against their own words')
    await go(page, '/create/type-scale')

    // The homepage Typography panel and Font Pair have both had this control
    // all along. The tool whose only job is judging sizes did not.
    const rows = page.locator('.tsc-row-text')
    await expect(rows.first()).toHaveText('The quick brown fox jumps over the lazy dog')
    await expect(page.locator('.tsc-article-h1')).toHaveText('A page set on this scale')

    await page.getByLabel('Preview text').fill('Checkout · 3 items')

    // WIRING, and the point of the control: EVERY step takes the words, so the
    // question "is this size usable for this string" can be asked at all nine.
    const count = await rows.count()
    for (let i = 0; i < count; i++) {
      await expect(rows.nth(i)).toHaveText('Checkout · 3 items')
    }
    // One string, both previews.
    await expect(page.locator('.tsc-article-h1')).toHaveText('Checkout · 3 items')

    // Emptying it falls back to the pangram rather than to nothing.
    await page.getByLabel('Preview text').fill('')
    await expect(rows.first()).toHaveText('The quick brown fox jumps over the lazy dog')
  })

  test('fine tuning is closed on arrival and every control is still reachable', async ({ page }) => {
    watch(page, 'designer who needs letter spacing')
    await go(page, '/create/type-scale')

    const toggle = page.getByRole('button', { name: 'Fine tuning' })
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')

    // Closed means closed: nothing inside is reachable, and in particular the
    // fluid/fixed pair must not answer to the preview width switch's class.
    await expect(visible(page, '.tsc-mode-btn')).toHaveCount(0)
    await expect(visible(page, '.tsc-width-btn')).toHaveCount(3)
    await expect(page.locator('#tsc-round')).toBeHidden()

    await toggle.click()
    await expect(page.getByRole('button', { name: 'Hide fine tuning' })).toHaveAttribute('aria-expanded', 'true')

    // NOTHING WAS REMOVED FROM THE TOOL. Every control that was in the flat
    // 13-item rail is still here, still labelled, still driving the maths.
    for (const id of ['tsc-up', 'tsc-down', 'tsc-mbase', 'tsc-mratio', 'tsc-leading', 'tsc-htrack', 'tsc-btrack', 'tsc-round']) {
      await expect(page.locator(`#${id}`), `${id} survives the disclosure`).toBeVisible()
    }
    await expect(visible(page, '.tsc-mode-btn')).toHaveCount(2)

    // And it still drives the maths from in there.
    await page.getByLabel('Rounding').selectOption('none')
    await expect(page.locator('.tsc-row').first().locator('.tsc-row-num')).toContainText('61.04px')
  })
})
