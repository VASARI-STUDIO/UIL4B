// TINT: FILLS THE SCREEN, CURVE ICONS, RAMP | PREVIEW.
//
// 1. At 1440x900 and 1280x720 the page does not scroll: the swatch stage takes
//    the height that is left, in both views.
// 2. Each curve pill carries a small drawn icon (a different line for each
//    curve) and the three pills stay on one row.
// 3. The View toggle swaps the swatches for a sample page drawn in the scale, at
//    9, 11 and 13 steps, and the page holds no control a person could use.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const open = async (browser, width, height) => {
  const ctx = await browser.newContext({ viewport: { width, height } })
  const page = await ctx.newPage()
  watch(page, `someone checking the Tint page at ${width}x${height}`)
  await go(page, '/create/tint')
  await expect(page.locator('.tt-cell')).toHaveCount(11, { timeout: 20000 })
  return { ctx, page }
}

const overflow = (page) => page.evaluate(() => {
  const se = document.scrollingElement
  return { doc: se.scrollHeight - window.innerHeight, sideways: se.scrollWidth - window.innerWidth }
})

test.describe('the Tint page fills the screen', () => {
  for (const [w, h] of [[1440, 900], [1280, 720]]) {
    test(`${w}x${h}: no document scroll in Ramp or Preview`, async ({ browser }) => {
      const { ctx, page } = await open(browser, w, h)
      let m = await overflow(page)
      expect(m.doc, `Ramp scrolls the document by ${m.doc}px`).toBeLessThanOrEqual(0)
      expect(m.sideways).toBeLessThanOrEqual(0)

      await page.getByRole('button', { name: 'Preview', exact: true }).first().click()
      await expect(page.locator('.tt-pv')).toBeVisible()
      m = await overflow(page)
      expect(m.doc, `Preview scrolls the document by ${m.doc}px`).toBeLessThanOrEqual(0)

      // The stage is a real size, not squeezed to nothing to make the page fit.
      const stage = await page.locator('.tt-stage').boundingBox()
      expect(stage.height, 'the stage is too short to read').toBeGreaterThanOrEqual(300)
      await ctx.close()
    })
  }

  test('1440x900: the curve pills have icons and share one row', async ({ browser }) => {
    const { ctx, page } = await open(browser, 1440, 900)
    const pills = page.locator('.tt-curve .tl-pill')
    await expect(pills).toHaveCount(3)
    await expect(page.locator('.tt-curve .tt-curve-ic')).toHaveCount(3)
    const d = await page.locator('.tt-curve .tt-curve-ic path').evaluateAll((ps) => ps.map((p) => p.getAttribute('d')))
    expect(new Set(d).size, 'two curves share one icon line').toBe(3)
    for (const dd of d) expect(dd).toMatch(/^M/)
    const tops = await pills.evaluateAll((els) => els.map((e) => e.offsetTop))
    expect(new Set(tops).size, 'the curve pills wrap onto two rows').toBe(1)
    await ctx.close()
  })
})

test.describe('the Tint preview', () => {
  for (const [count, head, dark] of [[9, '800', '800'], [11, '900', '950'], [13, '900', '950']]) {
    test(`${count} steps: the sample page uses the right steps`, async ({ browser }) => {
      const { ctx, page } = await open(browser, 1440, 900)
      await page.getByRole('button', { name: `${count} steps` }).click()
      await expect(page.locator('.tt-cell')).toHaveCount(count)
      await page.getByRole('button', { name: 'Preview', exact: true }).first().click()
      const pv = page.locator('.tt-pv')
      await expect(pv).toBeVisible()

      // The legend names the steps; headings and footer take the end of the scale.
      const legend = await page.locator('#tt-pv-legend').textContent()
      expect(legend).toContain(`Headings: step ${head}`)
      expect(legend).toContain(`Footer: step ${dark}`)
      expect(legend).toContain('Page background: step 50')
      if (count === 13) expect(legend).toContain('Steps 25 and 975 are not used')

      // Inert: nothing in the page can take focus or be clicked. The sample page
      // scrolls, and a scroller is a tab stop in Chrome, so it opts out with -1.
      const live = await pv.locator('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])').count()
      expect(live, 'the preview holds a control').toBe(0)
      await expect(pv.locator('.tt-pv-page')).toHaveAttribute('tabindex', '-1')

      // The page reads from the ramp: each surface is the swatch of its step.
      // The swatches are gone in Preview, so read their hexes from Ramp first.
      await page.getByRole('button', { name: 'Ramp', exact: true }).first().click()
      const swatch = await page.locator('.tt-cell').evaluateAll((cells) => Object.fromEntries(cells.map((c) => {
        const [label, hex] = (c.getAttribute('title') || '').split(' · ')
        return [label.trim(), hex.trim().toLowerCase()]
      })))
      await page.getByRole('button', { name: 'Preview', exact: true }).first().click()
      await expect(pv).toBeVisible()
      const painted = await page.evaluate(() => {
        const hex = (sel) => {
          const m = getComputedStyle(document.querySelector(sel)).backgroundColor.match(/\d+/g)
          return '#' + m.slice(0, 3).map((n) => Number(n).toString(16).padStart(2, '0')).join('')
        }
        return { page: hex('.tt-pv-page'), card: hex('.tt-pv-card'), button: hex('.tt-pv-btn'), dark: hex('.tt-pv-foot') }
      })
      expect(painted).toEqual({ page: swatch['50'], card: swatch['100'], button: swatch['600'], dark: swatch[dark] })

      // Back to Ramp: the swatches return.
      await page.getByRole('button', { name: 'Ramp', exact: true }).first().click()
      await expect(page.locator('.tt-cell')).toHaveCount(count)
      await ctx.close()
    })
  }
})
