// A swatch row is as tall for a two-line colour name as for a one-line one,
// so the page does not change height from one load to the next.
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

test.describe('swatch rows keep one height whatever the colour is called', () => {
  // The names are two words and the starting palette is random on every load, so
  // on a phone a two-word name that does not fit one line made that row 19px taller.
  // MUTATION: delete the `.plb .plb-name { min-height ... }` rule inside the 767px block of palette-builder.css.
  for (const width of [390, 1440]) {
    test(`row height does not depend on the name at ${width}`, async ({ browser }) => {
      const { ctx, page } = await at(browser, width)
      const measure = () => page.evaluate(() => [...document.querySelectorAll('.plb-col')].map((c) => {
        const r = c.getBoundingClientRect()
        const hex = c.querySelector('.plb-hex').getBoundingClientRect()
        return { h: Math.round(r.height * 10) / 10, hexTop: Math.round((hex.top - r.top) * 10) / 10, hexBottom: Math.round((r.bottom - hex.bottom) * 10) / 10 }
      }))
      const set = (text) => page.evaluate((t) => { for (const n of document.querySelectorAll('.plb-name')) n.textContent = t }, text)

      await set('Ox')
      const short = await measure()
      await set('Modernist Undergrowth')
      const long = await measure()
      await set('Sun-Baked Terracotta')
      const long2 = await measure()
      expect(short.every((s) => s.h > 100), 'the rows are painted').toBe(true)
      expect(long.map((c) => c.h), 'a name that wraps does not change the row height').toEqual(short.map((c) => c.h))
      expect(long2.map((c) => c.h)).toEqual(short.map((c) => c.h))
      // The hex sits at the same place in the row either way (bottom-anchored on a wide screen).
      const anchor = width < 700 ? 'hexTop' : 'hexBottom'
      expect(long.map((c) => c[anchor]), 'the hex does not move when the name wraps').toEqual(short.map((c) => c[anchor]))
      await ctx.close()
    })

    test(`the real board is the same height on every load at ${width}`, async ({ browser }) => {
      const heights = []
      for (let n = 0; n < 5; n++) {
        const { ctx, page } = await at(browser, width)
        heights.push(await page.evaluate(() => [...document.querySelectorAll('.plb-col')].map((c) => Math.round(c.getBoundingClientRect().height * 10) / 10)))
        await ctx.close()
      }
      for (const h of heights) expect(h, 'every row on every load has the same height').toEqual(heights[0].map(() => heights[0][0]))
    })
  }
})
