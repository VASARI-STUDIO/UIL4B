// /tools: the tool previews page. Built like /mobile.
//
// Covers the shell, the nav link, the derived counts, the six cards and the
// live demos. Not yet covered (the screenshots are not built): the capture
// files, their light and dark swap, and the CLS and bundle checks.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'
import { createTools } from '../../src/data/toolTree.js'
import { TOOL_COUNT, numberWord } from '../../src/components/spectrum/spectrumFacts.js'

const LISTED = createTools().filter((t) => !t.soon)
const ORDER = ['Palette Builder', 'Contrast Checker', 'Font Gallery', 'Type Scale', 'Icon Library', 'File Converter']

test.describe('/tools shell', () => {
  test('renders the Spectrum nav, footer and closing ramp; /tools/ is the same page', async ({ page }) => {
    watch(page, 'a visitor opening the tools page')
    for (const url of ['/tools', '/tools/']) {
      await go(page, url)
      // Mutation: drop the /tools branch in App.jsx → the 404 page's h1 fails this.
      await expect(page.locator('h1')).toHaveAccessibleName(`${numberWord(TOOL_COUNT, { capital: true })} tools, one tab.`)
      await expect(page.locator('.spnav')).toHaveCount(1)
      await expect(page.locator('.sp-footer')).toHaveCount(1)
      await expect(page.locator('.sp-ramp--close')).toHaveCount(1)
    }
  })

  test('the Tools link goes to /tools and is current only there', async ({ page }) => {
    watch(page, 'a visitor following the Tools link')
    await go(page, '/')
    const tools = page.locator('.spnav-quiet-link', { hasText: 'Tools' })
    await expect(tools).toHaveAttribute('href', '/tools')
    // Mutation: activeQuiet returns 'tools' on '/' → this fails.
    await expect(page.locator('.spnav-quiet-link[aria-current="page"]')).toHaveCount(0)
    await tools.click()
    await expect(page).toHaveURL(/\/tools$/)
    await expect(page.locator('.spnav-quiet-link[aria-current="page"]')).toHaveText('Tools')
  })

  test('the homepage lede links to /tools; the footer lists All tools first', async ({ page }) => {
    await go(page, '/')
    await expect(page.locator('.sp-bench-lede').getByRole('link', { name: 'See all of them.' })).toHaveAttribute('href', '/tools')
    await expect(page.locator('.sp-footer-col').first().locator('a').first()).toHaveText('All tools')
  })
})

test.describe('/tools content', () => {
  test('the cards and rows equal the listed tools, and the six cards come in order', async ({ page }) => {
    await go(page, '/tools')
    // Mutation: type a number or drop a tool from CARD_IDS/GROUPS → the count disagrees.
    const cards = page.locator('.spt-card h3')
    await expect(cards).toHaveText(ORDER)
    const rows = await page.locator('.spt-row').count()
    expect(await cards.count() + rows).toBe(LISTED.length)
  })

  test('the Contrast card shows a ratio, and a failing pair never uses the pass colour', async ({ page }) => {
    await go(page, '/tools')
    const result = page.locator('.spt-card[data-tool="contrast"] .spt-result')
    const pass = await result.evaluate((el) => getComputedStyle(el).color)
    const swatch = page.locator('.spt-card[data-tool="contrast"] .spt-swatch').first()
    // Cycle until the verdict fails (step 1 against steps 2 and 3 are close).
    let colour = pass
    for (let i = 0; i < 9 && (await result.getAttribute('data-pass')) === 'yes'; i += 1) {
      await swatch.click()
    }
    if ((await result.getAttribute('data-pass')) === 'no') colour = await result.evaluate((el) => getComputedStyle(el).color)
    // Mutation: paint a failing pair with --ok-strong → the two colours match.
    expect(colour).not.toBe(pass)
  })

  test('the live demos respond: palette seed, ratio switch', async ({ page }) => {
    await go(page, '/tools')
    const ramp = page.locator('.spt-card[data-tool="palette"] .spt-ramp li').first()
    const before = await ramp.evaluate((el) => getComputedStyle(el).backgroundColor)
    await page.getByRole('button', { name: 'Signal seed' }).click()
    await expect.poll(() => ramp.evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe(before)
    await page.getByRole('button', { name: 'Ratio 1.333' }).click()
    await expect(page.getByRole('button', { name: 'Ratio 1.333' })).toHaveAttribute('aria-pressed', 'true')
  })

  test('no sideways scroll at 320, 390, 768 and 1440; no em dash', async ({ browser }) => {
    for (const width of [320, 390, 768, 1440]) {
      const ctx = await browser.newContext({ viewport: { width, height: 900 } })
      const page = await ctx.newPage()
      await go(page, '/tools')
      // Mutation: give a demo a fixed 400px width → scrollWidth exceeds the viewport at 320.
      expect(await page.evaluate(() => document.documentElement.scrollWidth), `${width}px scrolls sideways`).toBeLessThanOrEqual(width)
      expect(await page.locator('main').innerText()).not.toContain('—')
      await ctx.close()
    }
  })
})
