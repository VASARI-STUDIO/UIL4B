// /tools: the tool previews page, on the V3 tokens (mk-* classes, v3-marketing.css).
//
// Covers the shell, the nav link, the derived counts, the six cards, the live
// demos and the seed colour the hero and the Palette card share.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'
import { createTools } from '../../src/data/toolTree.js'
import { TOOL_COUNT, numberWord } from '../../src/components/spectrum/spectrumFacts.js'

const LISTED = createTools().filter((t) => !t.soon)
// Card titles are the tool tree's own labels, the names the nav uses, in DOM order
// (CARD_IDS in SpectrumTools.jsx). The grid draws Type Scale beside Contrast.
const ORDER = ['Palette', 'Contrast Checker', 'Type Scale', 'Font Gallery', 'Icon Library', 'File Converter']

test.describe('/tools shell', () => {
  test('renders the Spectrum nav, the closing call and the footer; /tools/ is the same page', async ({ page }) => {
    watch(page, 'a visitor opening the tools page')
    for (const url of ['/tools', '/tools/']) {
      await go(page, url)
      // Mutation: drop the /tools branch in App.jsx → the 404 page's h1 fails this.
      await expect(page.locator('h1')).toHaveAccessibleName(`${numberWord(TOOL_COUNT, { capital: true })} tools, one tab.`)
      await expect(page.locator('.spnav')).toHaveCount(1)
      await expect(page.locator('.sp-footer')).toHaveCount(1)
      await expect(page.locator('section.hm-close')).toHaveCount(1)
      await expect(page.locator('.sp-ramp--close')).toHaveCount(0)
    }
  })

  test('the Tools link goes to /tools and is current only there', async ({ page }) => {
    watch(page, 'a visitor following the Tools link')
    await go(page, '/')
    // On the sales page the link jumps to its Try the tools section and names no screen.
    await expect(page.locator('.spnav-quiet-link', { hasText: 'Tools' })).toHaveAttribute('href', '#try')
    // Mutation: activeQuiet returns 'tools' on '/' → this fails.
    await expect(page.locator('.spnav-quiet-link[aria-current="page"]')).toHaveCount(0)
    await go(page, '/plans')
    const tools = page.locator('.spnav-quiet-link', { hasText: 'Tools' })
    await expect(tools).toHaveAttribute('href', '/tools')
    await expect(page.locator('.spnav-quiet-link[aria-current="page"]')).toHaveText('Plans')
    await tools.click()
    await expect(page).toHaveURL(/\/tools$/)
    await expect(page.locator('.spnav-quiet-link[aria-current="page"]')).toHaveText('Tools')
  })

  test('the homepage bookmarks heading is there; the footer lists All tools first', async ({ page }) => {
    await go(page, '/')
    await expect(page.locator('#bookmarks h2#bm-h')).toHaveText('Say goodbye to bookmark folders.')
    await expect(page.locator('.sp-footer-col').first().locator('a').first()).toHaveText('All tools')
  })
})

test.describe('/tools content', () => {
  test('the cards and rows equal the listed tools, and the six cards come in order', async ({ page }) => {
    await go(page, '/tools')
    // Mutation: type a number or drop a tool from CARD_IDS/GROUPS → the count disagrees.
    const cards = page.locator('.mk-card h3')
    await expect(cards).toHaveText(ORDER)
    // Beta tools sit in a line of their own under the rows, not in the heading's count.
    const rows = await page.locator('.mk-row').count()
    const beta = await page.locator('.mk-more.spt-beta a').count()
    expect(await cards.count() + rows + beta).toBe(LISTED.length)
    expect(beta).toBe(LISTED.filter((t) => t.beta).length)
  })

  test('the Contrast card shows a ratio, and a failing pair never uses the pass colour', async ({ page }) => {
    await go(page, '/tools')
    const result = page.locator('.mk-card[data-tool="contrast"] .mk-result')
    const ratio = result.locator('b')
    const pass = await ratio.evaluate((el) => getComputedStyle(el).color)
    const swatch = page.locator('.mk-card[data-tool="contrast"] .mk-swatch').first()
    // Cycle until the verdict fails (step 1 against steps 2 and 3 are close). Retry click-and-check as one unit.
    await expect(async () => {
      if ((await result.getAttribute('data-pass')) === 'yes') await swatch.click()
      await expect(result).toHaveAttribute('data-pass', 'no', { timeout: 400 })
    }).toPass({ timeout: 8000 })
    // Mutation: paint a failing pair with --ok-strong → the two colours match.
    await expect.poll(() => ratio.evaluate((el) => getComputedStyle(el).color)).not.toBe(pass)
  })

  test('the live demos respond: palette seed, ratio switch', async ({ page }) => {
    await go(page, '/tools')
    const card = page.locator('.mk-card[data-tool="palette"]')
    const ramp = card.locator('.mk-ramp li').first()
    const before = await ramp.evaluate((el) => getComputedStyle(el).backgroundColor)
    await card.getByRole('button', { name: 'Cobalt seed' }).click()
    await expect.poll(() => ramp.evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe(before)
    await page.getByRole('button', { name: 'Ratio 1.333' }).click()
    await expect(page.getByRole('button', { name: 'Ratio 1.333' })).toHaveAttribute('aria-pressed', 'true')
  })

  test('a seed picked in the hero repaints the hero ramp and the Palette card together', async ({ page }) => {
    await go(page, '/tools')
    const hero = page.locator('.mk-pal')
    const card = page.locator('.mk-card[data-tool="palette"]')
    const paint = (loc) => loc.evaluate((el) => getComputedStyle(el).backgroundColor)
    const before = await paint(hero.locator('.mk-ramp li').first())
    await hero.getByRole('button', { name: 'Fuchsia seed' }).click()
    await expect(hero.getByRole('button', { name: 'Fuchsia seed' })).toHaveAttribute('aria-pressed', 'true')
    await expect(card.getByRole('button', { name: 'Fuchsia seed' })).toHaveAttribute('aria-pressed', 'true')
    await expect.poll(() => paint(hero.locator('.mk-ramp li').first())).not.toBe(before)
    // The hero ramp is five of the card's nine steps, so every hero hex is also in the card.
    const heroHexes = await hero.locator('.mk-ramp li span').allInnerTexts()
    const cardHexes = await card.locator('.mk-ramp li span').allInnerTexts()
    expect(heroHexes).toHaveLength(5)
    for (const hex of heroHexes) expect(cardHexes).toContain(hex)
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
