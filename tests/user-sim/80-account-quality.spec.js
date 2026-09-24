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
    // It is styled as the confirmation panel's heading — `.checkout-page
    // .checkout-return-card h1`, the Spectrum pass's clamp(24px,3vw,30px) —
    // and NOT by whatever an unscoped h1 rule would give a bare <h1> (the
    // .sec-h display size is 32-52px). This pinned '22px' until the Spectrum
    // pass restyled the panel on purpose; the property it was guarding is that
    // the h2 -> h1 swap did not hand the heading a page-title size.
    const px = parseFloat(await h1.evaluate((el) => getComputedStyle(el).fontSize))
    expect(px, 'the confirmation heading is not set at a page-title size').toBeGreaterThanOrEqual(24)
    expect(px, 'the confirmation heading is not set at a page-title size').toBeLessThanOrEqual(30)
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
  // ONE TEST PER PLAN. `signIn` seeds localStorage ONCE PER TAB (the
  // `__uil4b_test_seeded` guard in helpers.js exists so the app's own writes
  // survive a navigation), so a loop that signs in twice inside one test
  // measures the FIRST account twice. Written as a loop this passed on `free`
  // and then reported 0 project cards for `pro`.
  for (const plan of ['free', 'pro']) {
    test(`no folder mechanism survives, on ${plan}`, async ({ page }) => {
      watch(page, `a ${plan} user looking for the folders that used to be here`)
      await signIn(page, { plan, projects: 2 })
      await go(page, '/projects')
      await expect(page.locator('.uh-grid .proj-card')).toHaveCount(2)

      await expect(page.locator('.proj-folders'), 'the chip row is gone').toHaveCount(0)
      await expect(page.locator('.proj-folder-chip'), 'no chip survives').toHaveCount(0)
      await expect(page.locator('.uh-card-folder'), 'no per-card filer').toHaveCount(0)
      // The word itself, anywhere a reader could see it on this surface.
      await expect(page.locator('.sec.uh'), 'the surface still says "folder"')
        .not.toContainText(/folder/i)
    })
  }

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

test.describe('the admin overview states nothing it read from this browser', () => {
  // ── THE BADGE THIS DESCRIBE USED TO MEASURE IS GONE, AND SO IS ITS SUBJECT ─
  // Until 2026-09-16 this measured the contrast of a "This device only" badge
  // over four headline figures — Page Views, Sessions, Bounce Rate, Avg
  // Duration — that were this browser's localStorage. The badge was correct
  // and the figures were the defect: the largest numbers on the founder's
  // dashboard described his own browsing, and a caption does not change what
  // a four-figure "Page views" reads as. His instruction was to take "data
  // from my specific browser window" off the dashboard, so the band went,
  // with the Pages and Design tabs that read the same two blobs.
  //
  // What replaces the contrast check is the stronger claim it was standing
  // in front of: nothing on the overview is a reading of this browser. The
  // test seeds the localStorage blob with figures no site has, renders the
  // dashboard, and requires none of them on screen — while the server
  // aggregate, which the page IS allowed to show, is proven present.
  test('seeded local page views never reach the overview, and the server aggregate does', async ({ page }) => {
    watch(page, 'founder reading the admin dashboard')

    // A figure that cannot occur by accident: 7,777 page views of one path,
    // written the way utils/analytics.js writes them.
    const SENTINEL_PATH = '/never-a-real-route-7777'
    await page.addInitScript(({ p }) => {
      const now = Date.now()
      const views = Array.from({ length: 7777 }, (_, i) => ({ path: p, timestamp: now - i * 1000, referrer: null }))
      try { localStorage.setItem('vs-analytics', JSON.stringify(views)) } catch { /* the app survives a blocked store */ }
    }, { p: SENTINEL_PATH })

    await signIn(page, { admin: true, claims: { admin: true } })
    await go(page, '/admin')
    await expect(page.getByText(/ADMIN MODE/i).first()).toBeVisible()

    // CONTROL: the overview rendered its server-side band. Without this an
    // empty page passes every absence below.
    const audience = page.locator('.adm-cat').filter({ hasText: /Audience/ }).first()
    await expect(audience).toBeVisible()
    await expect(audience.getByText(/server totals/i)).toBeVisible()

    const text = (await page.locator('.adm').innerText()).replace(/\s+/g, ' ')
    expect(text, 'the seeded localStorage path is on the dashboard, so the page is reading this browser again')
      .not.toContain('never-a-real-route')
    expect(text, 'the seeded localStorage count (7,777 views, formatted 7.8k) is on the dashboard')
      .not.toMatch(/7\.8k|7777|7,777/)
    for (const gone of [/This device only/i, /Bounce Rate/i, /Avg Duration/i, /\bSessions\b/]) {
      expect(text, `${gone} is back on the overview — that figure was this browser's own`).not.toMatch(gone)
    }

    // And the two tabs that read the same blobs are not in the bar.
    const names = (await page.getByRole('tab').allInnerTexts()).join(' | ')
    expect(names, 'the Pages tab is back — every table on it read this browser').not.toMatch(/\bPages\b/)
    expect(names, "the Design tab is back — its fonts and colours were this browser's picks").not.toMatch(/\bDesign\b/)
  })
})
