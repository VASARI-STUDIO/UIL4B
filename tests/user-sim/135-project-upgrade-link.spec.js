// THE PROJECT PAGE'S UPGRADE LINK: ITS PRICE, ITS BILLED LINE, AND ITS PLACE.
//
// For a free account the page ends with a sentence and a link to /plans. Once a
// live price lands the link reads "Upgrade for A$4.92/mo" (the yearly rate per
// month), so the same cadence's "Billed yearly" must sit beside it, in the dim
// ink of the sentence. And the link keeps one place in every state: while the
// price loads, when the service has no live price ("See Pro"), and when it is
// priced. It never drops from beside the sentence to under it, which would move
// everything below it.
//
// ── MUTATION ────────────────────────────────────────────────────────────────
// Dropping the billed span from ProjectDetail.jsx fails the billed assertions;
// removing the narrow-width `flex: 1 1 100%` on the offer moves the priced link
// under its sentence at 390 and fails the same-place assertion.
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'
import { withAvailability } from './price-payload.js'
import { DEFAULT_DESIGN } from '../../src/data/designDefaults.js'

const LIVE_AUD = {
  source: { monthly: 'live', yearly: 'live' },
  monthly: { usd: 4.99, aud: 6.99 },
  yearly: { usd: 48, aud: 59 },
}
const NO_LIVE = {
  source: { monthly: 'fallback', yearly: 'fallback' },
  monthly: { usd: 4.99, aud: 6.99 },
  yearly: { usd: 48, aud: 59 },
  currencyAvailability: { monthly: { aud: false, usd: false }, yearly: { aud: false, usd: false } },
}

const answer = (body) => (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(withAvailability(body)) })

function savedProject() {
  const design = structuredClone(DEFAULT_DESIGN)
  design.palette.colors = ['#1F4B8E', '#2E7BB8', '#3FA9A0']
  const now = new Date().toISOString()
  return { id: 'upgrade-link', name: 'Harbour', design, createdAt: now, updatedAt: now }
}

test.use({ locale: 'en-AU' })

for (const { width, height } of [{ width: 390, height: 844 }, { width: 768, height: 900 }, { width: 1440, height: 900 }]) {
  test(`the upgrade link shows its billed line and keeps its place through loading, no price and priced at ${width}`, async ({ page }) => {
    watch(page, 'a free designer reading the foot of a project page')
    await page.setViewportSize({ width, height })
    await signIn(page, { plan: 'free', projects: [savedProject()] })

    const line = page.locator('.pjd-upgrade-line')
    const link = page.locator('.pjd-upgrade-link')
    const billed = page.locator('.pjd-upgrade-billed')
    const place = async () => {
      const [sentence, anchor] = [await line.boundingBox(), await link.boundingBox()]
      const row = await page.locator('.pjd-upgrade').boundingBox()
      return { rowHeight: Math.round(row.height), underSentence: anchor.y >= sentence.y + sentence.height - 1, linkY: Math.round(anchor.y - row.y) }
    }

    // 1. The price service has not answered.
    let release
    const held = new Promise((resolve) => { release = resolve })
    await page.route('**/api/get-prices*', async (route) => { await held; await answer(NO_LIVE)(route) })
    await go(page, '/projects/upgrade-link')
    await expect(link).toHaveText('See Pro')
    const loading = await place()
    await expect(billed).toHaveCount(0)

    // 2. It answered with nothing live in this currency.
    // "See Pro" reads the same before and after this answer, so the text cannot
    // say it has landed. Wait for the response itself, then two frames for the
    // page to draw it, so the no-price state is measured and not the loading one.
    const answered = page.waitForResponse('**/api/get-prices*')
    release()
    await answered
    await page.evaluate(() => new Promise((done) => {
      requestAnimationFrame(() => requestAnimationFrame(done))
    }))
    await expect(link).toHaveText('See Pro')
    const none = await place()

    // 3. A live price.
    await page.unroute('**/api/get-prices*')
    await page.route('**/api/get-prices*', answer(LIVE_AUD))
    await page.reload()
    await expect(link).toHaveText('Upgrade for A$4.92/mo')
    await expect(billed).toHaveText('Billed yearly')
    const priced = await place()

    expect(none).toEqual(loading)
    expect(priced).toEqual(loading)

    // Beside the price, in the sentence's own ink.
    const [anchor, tag] = [await link.boundingBox(), await billed.boundingBox()]
    expect(Math.abs((tag.y + tag.height / 2) - (anchor.y + anchor.height / 2)), 'billed shares the link\'s row').toBeLessThan(anchor.height)
    expect(tag.x).toBeGreaterThan(anchor.x + anchor.width)
    const ink = (loc) => loc.evaluate((el) => getComputedStyle(el).color)
    expect(await ink(billed)).toBe(await ink(line))
    if (width < 768) expect(priced.underSentence, 'the offer sits under its sentence on a narrow screen').toBe(true)
  })
}

