// THE PROJECT PAGE'S UPGRADE LINE: ONE LINK TO /plans, NO PRICE, IN ONE PLACE.
//
// For a free account the page ends with a sentence and a "See Pro" link to /plans.
// The link carries no price, so it reads the same while the price service has not
// answered, when it has nothing live and when it has a live price, and it keeps one
// place in every state: beside its sentence on a wide screen, under it on a phone.
// A Pro account sees neither.
//
// ── MUTATION ────────────────────────────────────────────────────────────────
// Pointing the link at a price label in ProjectDetail.jsx (the old
// "Upgrade for A$4.92/mo") fails the text assertion in the priced step.
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'
import { withAvailability } from './price-payload.js'
import { DEFAULT_DESIGN } from '../../src/data/designDefaults.js'

const LIVE_AUD = {
  source: { monthly: 'live', yearly: 'live' },
  monthly: { usd: 4.99, aud: 6.99 },
  yearly: { usd: 48, aud: 59 },
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
  test(`the upgrade link is See Pro to /plans and keeps its place with and without a live price at ${width}`, async ({ page }) => {
    watch(page, 'a free designer reading the foot of a project page')
    await page.setViewportSize({ width, height })
    await signIn(page, { plan: 'free', projects: [savedProject()] })

    const line = page.locator('.pjv-plan span')
    const link = page.locator('.pjv-plan a')
    const place = async () => {
      const [sentence, anchor] = [await line.boundingBox(), await link.boundingBox()]
      return { underSentence: anchor.y >= sentence.y + sentence.height - 1 }
    }

    await page.route('**/api/get-prices*', answer({ ...LIVE_AUD, source: { monthly: 'fallback', yearly: 'fallback' } }))
    await go(page, '/projects/upgrade-link')
    await expect(link).toHaveText('See Pro')
    await expect(link).toHaveAttribute('href', '/plans')
    const noPrice = await place()

    await page.unroute('**/api/get-prices*')
    await page.route('**/api/get-prices*', answer(LIVE_AUD))
    await page.reload()
    await expect(link).toHaveText('See Pro')
    expect(await place()).toEqual(noPrice)
    if (width < 768) expect(noPrice.underSentence, 'the link sits under its sentence on a phone').toBe(true)
    else expect(noPrice.underSentence, 'the link sits beside its sentence on a wide screen').toBe(false)
  })
}
