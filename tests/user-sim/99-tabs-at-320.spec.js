// AT 320px A TAB ROW IS ONE ROW.
//
// QA on #487, 320px: the File Converter's tabs wrapped, putting "Extract
// frames" on a second line under the first line's underline, and the Aspect
// Ratio presets left "Social" alone on a second row. A tab row that wraps
// reads as two groups. Now: the converter's underline tabs scroll sideways
// and the aspect-ratio segmented control shares one row between its four
// options. And the "Open a 3D model…" line under the converter tabs had a
// loose gap where its link wrapped, because the link was an inline-flex box
// taller than the line.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

async function at320(browser, { touch = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 320, height: 800 }, hasTouch: touch, isMobile: touch })
  return { ctx, page: await ctx.newPage() }
}

const rowOf = (loc) => loc.evaluateAll((els) => els.map((el) => {
  const r = el.getBoundingClientRect()
  return { text: el.textContent.trim(), top: Math.round(r.top), h: Math.round(r.height) }
}))

for (const touch of [false, true]) {
  test(`the converter's tabs stay on one line at 320 (${touch ? 'touch' : 'mouse'})`, async ({ browser }) => {
    const { ctx, page } = await at320(browser, { touch })
    watch(page, 'someone converting a file on a small phone')
    await go(page, '/create/file-converter')
    const tabs = await rowOf(page.locator('.fc-tab'))
    // POSITIVE CONTROL: all four modes are there, the long one included.
    expect(tabs.map((t) => t.text)).toContain('Extract frames')
    expect(new Set(tabs.map((t) => t.top)).size, `tabs on more than one row: ${JSON.stringify(tabs)}`).toBe(1)
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), 'the tab row pushed the page sideways').toBe(0)
    // The last tab is reachable: the row scrolls to it.
    const last = page.locator('.fc-tab').last()
    await last.scrollIntoViewIfNeeded()
    await expect(last).toBeInViewport()

    // The "Open a 3D model" line: every line of it is one line-height apart.
    const gaps = await page.locator('.fc-3d').evaluate((p) => {
      const range = document.createRange()
      range.selectNodeContents(p)
      const tops = [...new Set([...range.getClientRects()].map((r) => Math.round(r.top)))].sort((a, b) => a - b)
      const lh = parseFloat(getComputedStyle(p).lineHeight)
      return { lh, steps: tops.slice(1).map((t, i) => t - tops[i]) }
    })
    expect(gaps.steps.length, 'the 3D line did not wrap at 320, so its line gap was not measured').toBeGreaterThan(0)
    for (const s of gaps.steps) expect(s, `a line of the 3D note is ${s}px below the last (line-height ${gaps.lh})`).toBeLessThanOrEqual(Math.ceil(gaps.lh) + 1)
    await ctx.close()
  })
}

test('the aspect ratio presets share one row at 320', async ({ browser }) => {
  const { ctx, page } = await at320(browser)
  watch(page, 'someone sizing an image on a small phone')
  await go(page, '/create/aspect-ratio')
  const tabs = await rowOf(page.locator('.rc-tab'))
  expect(tabs.map((t) => t.text)).toEqual(['Ratios', 'Devices', 'Screens', 'Social'])
  expect(new Set(tabs.map((t) => t.top)).size, `presets on more than one row: ${JSON.stringify(tabs)}`).toBe(1)
  // Each label on one line, not squeezed into two.
  for (const t of tabs) expect(t.h, `${t.text} wrapped inside its button`).toBeLessThanOrEqual(44)
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0)
  await ctx.close()
})
