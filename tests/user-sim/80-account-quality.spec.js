// The account and money surfaces, rated out of 10 on 2026-09-11 and raised
// where they scored under 8. Each test here is the rendered evidence for one
// fix, and each one was seen to FAIL against the code as it stood.
//
// The four fixes, and what was rendered before them:
//
//   /checkout   With /api/get-prices unreachable — which is the state `vite
//               preview` is permanently in, and the state production is in
//               whenever Stripe or the function is down — the order summary
//               painted an EMPTY amount above "per year", and the note read
//               "USD · null/mo". The word `null`, in accent colour, on the
//               screen where money changes hands. src/pages/Plans.jsx, the step
//               immediately before it, already answered the same outage with
//               "Unavailable" and a reachability line, so this is that page's
//               wording rather than a new sentence.
//
//   /checkout/return  Every state of it — confirming, paid, payment-received,
//               and could-not-confirm — rendered an <h2> as the page's ONLY
//               heading. So did /checkout's invalid-selection card. Eight of
//               the ten account surfaces render exactly one <h1>; these two
//               rendered none, which fails the vault's own non-negotiable
//               gate: "does a screen reader navigate it logically from heading
//               1 to content?" (principle-accessible-design).
//
//   /projects   Printed "3 folders · Upgrade for 10" beside FOUR folder chips.
//               FOLDERS is a fixed array and the repo has no folder-creation
//               control at all, so neither number was true and the upgrade sold
//               something Pro does not receive either.
//
//   /admin      The "This device only" badge hard-coded color #854d0e while its
//               own background is color-mix(var(--warn) 16%, transparent),
//               which DOES flip with the theme. Pixel-measured off the painted
//               screenshot: 5.55:1 in light, 1.77:1 in dark, on 10px bold text.
//               global.css already carries --warn-strong for exactly this, and
//               states the rule: state-coloured text below 24px uses the
//               -strong companion.
import { test, expect } from './base.js'
import { signIn, go, watch } from './helpers.js'

test.describe('checkout states a price it cannot confirm', () => {
  // `vite preview` serves dist/ statically and runs no Vercel functions, so
  // /api/get-prices 404s here for every test in this file. That is not a
  // limitation to work around — it IS the price-service-down state, arrived at
  // honestly, which is why these assertions can be made at all.
  for (const plan of ['monthly', 'yearly']) {
    test(`${plan} names the outage instead of printing a blank or a null`, async ({ page }) => {
      watch(page, 'buyer whose price service is down')
      await signIn(page, {})
      await go(page, `/checkout?plan=${plan}`)

      const amount = page.locator('.checkout-plan-amount')
      const note = page.locator('.checkout-plan-note')
      await expect(amount).toHaveText('Unavailable')
      await expect(note).toHaveText('Live pricing is unreachable · no price can be shown right now')

      // The exact string the defect produced, asserted as absent by name so a
      // regression is unmistakable rather than merely "not Unavailable".
      const summary = await page.locator('.checkout-summary-card').innerText()
      expect(summary, 'the summary must not interpolate a null into a price')
        .not.toContain('null')
      expect((await amount.innerText()).trim().length,
        'an empty amount slot reads as free').toBeGreaterThan(0)
    })
  }

  test('the one-off plan keeps its canonical amount and says where it came from', async ({ page }) => {
    watch(page, 'buyer whose price service is down')
    await signIn(page, {})
    await go(page, '/checkout?plan=lifetime')
    // CANONICAL_LIFETIME in usePrices.js gives this interval a fallback the
    // recurring ones have no equivalent for, so the amount is real and the note
    // has to say it is not the live one.
    await expect(page.locator('.checkout-plan-amount')).not.toHaveText('Unavailable')
    await expect(page.locator('.checkout-plan-note'))
      .toHaveText('Live pricing is unreachable · showing the canonical USD amount')
  })

  test('a priced-out summary offers a way back to a live price', async ({ page }) => {
    watch(page, 'buyer whose price service is down')
    await signIn(page, {})
    await go(page, '/checkout?plan=yearly')
    // usePrices caches the failure for the life of the module, so without a
    // retry the summary stays on "Unavailable" until a full page reload.
    const retry = page.locator('.checkout-price-retry')
    await expect(retry).toBeVisible()
    await expect(retry).toHaveText('Retry live pricing')
  })
})

test.describe('every account surface starts at heading 1', () => {
  const SURFACES = [
    ['/checkout/return', {}, 'We couldn’t confirm your checkout'],
    ['/checkout', {}, 'Invalid checkout selection'],
  ]
  for (const [url, opts, heading] of SURFACES) {
    test(`${url} carries the page's own h1`, async ({ page }) => {
      watch(page, 'keyboard and screen-reader user')
      await signIn(page, opts)
      await go(page, url)
      const h1 = page.locator('main h1')
      await expect(h1).toHaveCount(1)
      await expect(h1).toHaveText(heading)
      // The heading that IS on screen must be the h1 — an h2 sitting above it
      // would restore the outline defect while keeping the count at one.
      const first = await page.evaluate(() => {
        const hs = [...document.querySelectorAll('main h1,main h2,main h3,main h4,main h5,main h6')]
          .filter((h) => h.getBoundingClientRect().height > 0)
        return hs[0]?.tagName || null
      })
      expect(first, 'the first visible heading on the page').toBe('H1')
    })
  }

  test('a confirmed payment is announced from an h1, not an h2', async ({ page }) => {
    watch(page, 'buyer who just paid')
    await signIn(page, {})
    await page.route('**/api/checkout-status**', (r) => r.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'complete', mode: 'subscription',
        customerEmail: 'free.user@uil4b.test', subscriptionActive: true,
      }),
    }))
    await go(page, '/checkout/return?session_id=cs_test_paid')
    const h1 = page.locator('main h1')
    await expect(h1).toHaveCount(1)
    await expect(h1).toContainText('You’re on UIL4B Pro')
    // The paint must not have moved: this heading is styled by
    // `.checkout-return-card h1`, which carries the same declarations the h2
    // rule did.
    const px = await h1.evaluate((el) => getComputedStyle(el).fontSize)
    expect(px, 'the confirmation heading keeps its 22px size').toBe('22px')
  })

  test('a payment whose entitlement has not landed says so, from an h1', async ({ page }) => {
    watch(page, 'buyer whose webhook has not landed')
    await signIn(page, {})
    await page.route('**/api/checkout-status**', (r) => r.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'complete', mode: 'subscription',
        customerEmail: 'free.user@uil4b.test', subscriptionActive: false,
      }),
    }))
    await go(page, '/checkout/return?session_id=cs_test_pending')
    await expect(page.locator('main h1')).toHaveText('Payment received')
    // The honesty half, which is the reason this state exists at all.
    await expect(page.locator('.checkout-return-card p').first())
      .toContainText('Pro access is still being attached to this account')
  })
})

test.describe('projects states only quotas the product enforces', () => {
  // #452 DELETED THE FOLDER SENTENCE AND KEPT THE FOLDERS. These two tests
  // pinned that halfway state: no invented allowance, but five chips of a fixed
  // taxonomy still on screen, and a Pro account seeing the same five "which is
  // the point". The founder's call on 2026-09-13 finished it — folders are not
  // an entitlement and the mechanism is gone — so the pin is inverted rather
  // than deleted, which is how 69-flow-audit's seeded-project assertion was
  // handled when that decision landed. What both tests were really protecting,
  // that this page quotes no allowance it does not enforce, is now asserted
  // over the whole surface instead of over one row of it.
  test('no folder mechanism survives, on free or on Pro', async ({ page }) => {
    watch(page, 'free and pro users looking for the folders that used to be here')
    for (const plan of ['free', 'pro']) {
      await signIn(page, { plan, projects: 2 })
      await go(page, '/projects')
      await expect(page.locator('.uh-grid .proj-card')).toHaveCount(2)

      await expect(page.locator('.proj-folders'), `${plan}: the chip row is gone`).toHaveCount(0)
      await expect(page.locator('.proj-folder-chip'), `${plan}: no chip survives`).toHaveCount(0)
      await expect(page.locator('.uh-card-folder'), `${plan}: no per-card filer`).toHaveCount(0)
      // The word itself, anywhere a reader could see it on this surface.
      await expect(page.locator('main'), `${plan}: the surface still says "folder"`)
        .not.toContainText(/folder/i)
    }
  })

  test('the surface quotes no allowance the product does not enforce', async ({ page }) => {
    watch(page, 'free user with saved projects')
    await signIn(page, { projects: 2 })
    await go(page, '/projects')
    const main = page.locator('main')
    // The invented quota #452 removed, and the upgrade it sold.
    await expect(main, 'must not quote a folder allowance').not.toContainText(/\d+\s+folders/)
    await expect(main, 'must not sell an upgrade for one').not.toContainText('Upgrade for 10')
    await expect(page.locator('.proj-folder-note')).toHaveCount(0)
  })

  test('the project cap, which IS enforced, still states itself', async ({ page }) => {
    watch(page, 'free user at the save cap')
    await signIn(page, { projects: 3 })
    await go(page, '/projects')
    // Removing the false quota must not have taken the true one with it.
    const quota = page.locator('[data-testid="project-quota-note"]')
    await expect(quota).toBeVisible()
    await expect(quota).toContainText('You’ve used all 3 projects on the free plan')
    await expect(quota).toContainText('Nothing has been removed')
  })
})

test.describe('admin state colour survives the theme', () => {
  test('the this-device-only badge is readable in dark as well as light', async ({ page }) => {
    watch(page, 'founder reading the admin dashboard')
    await signIn(page, { admin: true })
    await go(page, '/admin')

    const badge = page.locator('span', { hasText: /^This device only$/ }).first()
    await expect(badge).toBeVisible()

    for (const theme of ['light', 'dark']) {
      await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme)
      // Let the 0.2s colour transitions finish. A reading taken mid-transition
      // is a reading of a colour that is never on screen at rest.
      await page.waitForFunction(() => true)
      await page.waitForTimeout(600)

      // Measured off the pixels Chromium painted, not off getComputedStyle:
      // the background is a colour-mix over a card over the page, and only the
      // composite is what a reader's eye receives.
      const shot = await badge.screenshot()
      const ratio = await page.evaluate(async (b64) => {
        const img = new Image()
        img.src = 'data:image/png;base64,' + b64
        await img.decode()
        const c = document.createElement('canvas')
        c.width = img.width; c.height = img.height
        const g = c.getContext('2d', { willReadFrequently: true })
        g.drawImage(img, 0, 0)
        const d = g.getImageData(0, 0, c.width, c.height).data
        const lum = (r, gg, b) => {
          const f = (v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4 }
          return 0.2126 * f(r) + 0.7152 * f(gg) + 0.0722 * f(b)
        }
        // The most common pixel is the fill; the farthest from it in luminance
        // is the ink.
        const counts = new Map()
        const px = []
        for (let i = 0; i < d.length; i += 4) {
          if (d[i + 3] < 250) continue
          const k = `${d[i]},${d[i + 1]},${d[i + 2]}`
          counts.set(k, (counts.get(k) || 0) + 1)
          px.push(lum(d[i], d[i + 1], d[i + 2]))
        }
        const ground = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0]
        const gl = lum(...ground.split(',').map(Number))
        const cr = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
        return Math.max(...px.map((l) => cr(l, gl)))
      }, shot.toString('base64'))

      // 10px, font-weight 700 — not large text by any definition, so 4.5:1.
      expect(ratio, `"This device only" contrast in ${theme}`).toBeGreaterThanOrEqual(4.5)
    }
  })
})
