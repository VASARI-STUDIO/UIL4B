// At phone width the System and Vision lists opened from the Extra tools
// sheet are a sheet on a sheet: they sit on the screen edge, not on top of
// the (covered) tab bar, so nothing from the sheet behind shows below them.
//
// Each test names the code to break to see it fail (MUTATION lines).
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const IOS_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'

/** A context at an exact width: touch metrics on a phone, a mouse above it. */
async function at(browser, width, { theme = 'light', height } = {}) {
  const ctx = await browser.newContext(width < 700
    ? { viewport: { width, height: height ?? 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: IOS_UA }
    : { viewport: { width, height: height ?? 900 } })
  await ctx.addInitScript((t) => { try { localStorage.setItem('vs-t', t) } catch { /* private mode */ } }, theme)
  const page = await ctx.newPage()
  watch(page, `palette visitor at ${width}px`)
  await go(page, '/create/palette')
  await expect(page.locator('.plb-col')).toHaveCount(5)
  return { ctx, page }
}

test.describe('System and Vision lists opened from the Extra tools sheet (phone)', () => {
  for (const theme of ['light', 'dark']) {
    for (const [label, trigger] of [['System', 'Colour system'], ['Vision', 'Colour vision check']]) {
      // MUTATION: delete the `html.has-tabbar ... [data-in-sheet] { bottom: 0 }` rule in tool-layout.css.
      test(`${label} list sits on the screen edge at 390 (${theme})`, async ({ browser }) => {
        const { ctx, page } = await at(browser, 390, { theme })
        await page.getByRole('button', { name: 'Extra tools', exact: true }).click()
        const sheet = page.getByRole('dialog', { name: 'Extra tools' })
        await expect(sheet).toBeVisible()
        // The History row of the sheet behind: it is what showed in the gap.
        await expect(sheet.getByText('History', { exact: true }).first()).toBeVisible()
        await sheet.getByRole('button', { name: trigger }).click()
        const list = page.getByRole('listbox')
        await expect(list).toBeVisible()
        // the list slides in; wait for it to stop moving
        const bottom = () => list.evaluate((el) => el.getBoundingClientRect().bottom)
        await expect.poll(async () => { const first = await bottom(); await page.waitForTimeout(120); return first === await bottom() }, { message: 'the list has settled' }).toBe(true)

        const r = await list.evaluate((el) => {
          const b = el.getBoundingClientRect()
          const vh = window.innerHeight
          const probe = (y) => { const hit = document.elementFromPoint(b.left + b.width / 2, y); return !!hit && (hit === el || el.contains(hit)) }
          return { bottom: b.bottom, vh, probeBottom: probe(vh - 2) }
        })
        expect(Math.abs(r.bottom - r.vh), 'sheet bottom equals viewport bottom (within 1px)').toBeLessThanOrEqual(1)
        expect(r.probeBottom, 'the list, not the sheet behind, is at the bottom edge').toBe(true)
        await ctx.close()
      })
    }
  }
})
