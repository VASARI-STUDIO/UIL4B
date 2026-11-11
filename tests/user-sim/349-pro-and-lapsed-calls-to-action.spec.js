// A PRO ACCOUNT IS NEVER ASKED TO UPGRADE; A LAPSED ONE IS.
//
// The calls to action live in PillNav (the "Upgrade" pill), PlanLine and PlanStrip
// ("See plans"), StarterCard, Projects (the cap note), Settings (the plan card) and
// QuotaMeter ("See all plans"). Each one hides itself behind its own `isPro` check, so
// a new surface that forgets the check shows an upgrade pitch to a paying account and
// nothing else in the suite would notice. This reads what is VISIBLE, not the source:
//
//   Pro      every route in site-routes.js (and the two project routes) is opened and
//            every visible link and button is read; none says Upgrade, Go Pro or
//            See (all) plans. "Back to Plans" is a way back, not a pitch, and is not
//            matched.
//   lapsed   a subscription Stripe has cancelled is Free again. The same words must
//            show on /projects, in the nav and on /settings, and the nav pill must
//            lead to /plans.
//
// A scan that finds nothing proves nothing, so the Pro walk first checks the Pro page
// rendered as Pro ("Manage plan" on /projects) and the lapsed side is the control for
// the scan itself: the same function finds the words there.
//
// ── MUTATION ────────────────────────────────────────────────────────────────
// PillNav.jsx: `showUpgrade = ... && !isPro` -> drop `!isPro` (the Pro walk names the
// nav pill on every route). PlanLine.jsx: show "See plans" for Pro as well. Settings:
// show the Upgrade button whatever the plan. For the lapsed side, treat status
// 'canceled' as Pro in SubscriptionContext planForSubscription.
import { test, expect } from './base.js'
import { go, goRaw, ready, signIn, watch } from './helpers.js'
import { ROUTES, PROJECT_ROUTES } from './site-routes.js'
import { withAvailability } from './price-payload.js'

const PRICES = withAvailability({ monthly: { usd: 7 }, quarterly: { usd: 18 }, yearly: { usd: 48 } })
const stubPrices = (page) => page.route('**/api/get-prices*', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(PRICES) }))

const CTA = /\b(upgrade|go pro|see (all )?plans)\b/i
const pathOf = (page) => new URL(page.url()).pathname

// The words of every visible link, button and role=button on the page now.
// `within` narrows the scan to one part of the page (a selector), or null for all of it.
async function visibleCtas(page, within = null) {
  return page.evaluate(({ source, flags, scope }) => {
    const re = new RegExp(source, flags)
    const root = scope ? document.querySelector(scope) : document
    if (!root) return []
    const seen = []
    for (const el of root.querySelectorAll('a, button, [role="button"]')) {
      if (!el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue
      const box = el.getBoundingClientRect()
      if (box.width === 0 || box.height === 0) continue
      const words = (el.innerText || el.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim()
      if (re.test(words)) seen.push({ words, cls: String(el.className || '').slice(0, 60), href: el.getAttribute('href') })
    }
    return seen
  }, { source: CTA.source, flags: CTA.flags, scope: within })
}

const LAPSED = () => ({
  status: 'canceled',
  interval: 'monthly',
  cancelAtPeriodEnd: false,
  currentPeriodEnd: Date.now() - 40 * 86_400_000,
  updatedAt: Date.now() - 40 * 86_400_000,
})

test.describe('a Pro account is never asked to upgrade', () => {
  test('no route shows Upgrade, Go Pro or See plans to Pro', async ({ page }) => {
    test.setTimeout(420_000)
    watch(page, 'a Pro subscriber walking every route')
    await signIn(page, { plan: 'pro', projects: 1 })

    // The control: this really is a Pro page, so an empty scan below means Pro, not a page that never loaded.
    await go(page, '/projects')
    await expect(page.getByRole('link', { name: 'Manage plan' }).first()).toBeVisible()

    const asked = []
    for (const route of [...ROUTES, ...PROJECT_ROUTES]) {
      await goRaw(page, route)
      await ready(page, route)
      for (const cta of await visibleCtas(page)) asked.push(`${route} (landed ${pathOf(page)}): "${cta.words}" [${cta.cls}]`)
    }
    expect(asked, 'calls to action a Pro account can see').toEqual([])
  })

  test('the Plan and billing tab of settings, which the walk does not open, shows Manage not Upgrade', async ({ page }) => {
    watch(page, 'a Pro subscriber on the plan tab')
    await stubPrices(page)
    await signIn(page, { plan: 'pro' })
    await go(page, '/settings')
    await page.getByRole('tab', { name: 'Plan and billing' }).click()
    await expect(page.locator('#set-support').getByText('You’re on UI L4B Pro')).toBeVisible()
    expect(await visibleCtas(page), 'calls to action beside the plan card').toEqual([])
  })
})

test.describe('a lapsed account is asked to upgrade where Free is', () => {
  test('/projects: the nav Upgrade pill and the plan line See plans', async ({ page }) => {
    watch(page, 'a lapsed subscriber on the projects page')
    await signIn(page, { plan: 'free', subscription: LAPSED(), projects: 1 })
    await go(page, '/projects')

    const pill = page.locator('.pnav-upgrade')
    await expect(pill, 'the nav pill').toBeVisible()
    await expect(pill).toHaveText('Upgrade')
    await expect(pill).toHaveAttribute('href', '/plans')
    const planLine = page.locator('.db-plan')
    await expect(planLine.getByText('You’re on Free.')).toBeVisible()
    await expect(planLine.getByRole('link', { name: 'See plans' })).toHaveAttribute('href', '/plans')
    await expect(page.getByRole('link', { name: 'Manage plan' }), 'no Pro wording for a lapsed account').toHaveCount(0)
  })

  test('the nav Upgrade pill opens /plans, and is gone once the buyer is there', async ({ page }) => {
    watch(page, 'a lapsed subscriber going back to the plans')
    await signIn(page, { plan: 'free', subscription: LAPSED(), projects: 1 })
    await go(page, '/projects')
    await page.locator('.pnav-upgrade').click()
    await expect.poll(() => pathOf(page)).toBe('/plans')
    await expect(page.locator('.pnav-upgrade'), 'the pill is not shown on the page it points at').toHaveCount(0)
  })

  test('/settings: the nav pill and the plan card both pitch Pro', async ({ page }) => {
    watch(page, 'a lapsed subscriber on settings')
    await stubPrices(page)
    await signIn(page, { plan: 'free', subscription: LAPSED() })
    await go(page, '/settings')
    await expect(page.locator('.pnav-upgrade')).toBeVisible()
    await page.getByRole('tab', { name: 'Plan and billing' }).click()
    const upgrade = page.locator('#set-support').getByRole('link', { name: 'Upgrade to Pro' })
    await expect(upgrade, 'the plan card offers Pro again').toBeVisible()
    await expect(upgrade).toHaveAttribute('href', /^\/plans\?billing=/)
    await expect(page.locator('#set-support').getByText('You’re on UI L4B Pro'), 'no Pro wording for a lapsed account').toHaveCount(0)
  })

  test('the scan sees the words on a lapsed account (control for the Pro walk)', async ({ page }) => {
    watch(page, 'a lapsed subscriber, for the scan control')
    await signIn(page, { plan: 'free', subscription: LAPSED(), projects: 1 })
    await go(page, '/projects')
    await expect.poll(async () => (await visibleCtas(page)).map((c) => c.words).sort()).toEqual(expect.arrayContaining(['Upgrade', 'See plans']))
  })
})
