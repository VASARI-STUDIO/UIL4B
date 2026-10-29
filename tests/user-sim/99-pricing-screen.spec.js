// /plans — the plan ledger (src/pages/Pricing.jsx). What a person choosing how to
// pay for Pro depends on:
//
//   1. THE BILLING SWITCH. A native radio group, Monthly and Yearly (quarterly is
//      not sold), with the live saving as text in the Yearly option. Every figure
//      is computed here from the stubbed /api/get-prices answer, never typed, so a
//      page that starts typing a price goes red.
//   2. THE PRO CTA FLOW. Signed in, straight to /checkout for the chosen cadence;
//      signed out, the login popup opens over /plans and then goes on to that
//      checkout. /checkout opened directly still asks for the sign-in itself.
//   3. NOTHING MOVES. Switching cadence must not shift the Pro button, at a phone
//      and a desktop width.
//   4. THE DOCKED PLAN BAR below 1360px, and the offer-first layout below 1024px:
//      billing, then Pro (price, billed line, trial line, button on the first
//      screen), then Free, a three-column table, an accordion, and a closing band
//      whose Pro button goes to checkout on the selected cadence.
//   5. THE PLAN BAR ON THE LEDGER WIDTHS: docked at the bottom from 1024 to 1359
//      (dropping as the closing colour band comes into view) and pinned under the
//      nav from 1360, and still tracking the Pro button after a resize swaps the
//      layout.
//
// The suite's preview has no serverless functions, so /api/get-prices is stubbed
// with production's own answer shape. The outage path is asserted too, because a
// pricing page that cannot name a price must not start a checkout.
import { test, expect } from './base.js'
import { go, watch, expectRendered, signIn } from './helpers.js'
import { withAvailability } from './price-payload.js'

// Production's /api/get-prices answer, trimmed to the currency under test.
const LIVE = {
  source: { monthly: 'live', yearly: 'live' },
  monthly: { usd: 7 },
  yearly: { usd: 48 },
}
// The yearly saving against monthly, from the live amounts — the rule
// planLadder.js applies (per-month rate vs monthly, whole percent).
const SAVING = Math.round((1 - (LIVE.yearly.usd / 12) / LIVE.monthly.usd) * 100)
const money = (n) => `$${Number.isInteger(n) ? n : n.toFixed(2)}`

const PERSONA = 'someone choosing how to pay for Pro'

test.use({ locale: 'en-US' })

async function stubPrices(page, body = LIVE, status = 200) {
  await page.route('**/api/get-prices', (route) => route.fulfill({
    status, contentType: 'application/json', body: JSON.stringify(status === 200 ? withAvailability(body) : body),
  }))
}

// The checkout's payment form is Stripe's embed. A build with a publishable key
// uses window.Stripe when one exists, so this stand-in is what it finds, and
// /api/create-checkout is answered here: nothing reaches Stripe. The mounted
// node carries the session it was made from, one per cadence.
async function answerSessions(page) {
  const intervals = []
  await page.route('**/api/create-checkout', async (route) => {
    const { interval } = JSON.parse(route.request().postData() || '{}')
    intervals.push(interval)
    await route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify({ clientSecret: `cs_test_stub_${interval}` }),
    })
  })
  return intervals
}

async function stubStripe(page) {
  await page.addInitScript(() => {
    const unused = () => { throw new Error('not part of this stand-in') }
    window.Stripe = () => ({
      elements: unused,
      createToken: unused,
      createPaymentMethod: unused,
      confirmCardPayment: unused,
      createEmbeddedCheckoutPage: async (options) => {
        const secret = await options.fetchClientSecret()
        let node = null
        return {
          mount(el) { node = el; el.setAttribute('data-stub-session', secret); el.textContent = 'Stripe Checkout' },
          unmount() { node?.removeAttribute('data-stub-session'); if (node) node.textContent = '' },
          destroy() { this.unmount() },
        }
      },
    })
  })
}

// Logs in through the login popup already open over the page. `lateSignIn`
// starts the page signed out and lets this form complete the sign-in in place.
async function logInThroughPopup(page) {
  await expect(page.locator('#ui-login-title')).toBeVisible()
  await page.locator('#ui-login-email').fill('someone@uil4b.test')
  await page.locator('#ui-login-password').fill('a-long-password')
  await page.locator('form.auth-form button[type="submit"]').click()
}

const switchGroup = (page) => page.getByRole('radiogroup', { name: 'Billing' })
const option = (page, name) => switchGroup(page).getByRole('radio', { name: new RegExp(`^${name}`) })
// The radios are visually hidden; the label is what a pointer hits.
const choose = (page, name) => switchGroup(page).locator('label', { hasText: new RegExp(`^${name}`) }).click()
const pro = (page) => page.locator('.pr-head--pro')
const free = (page) => page.locator('.pr-head--free')
const proCta = (page) => pro(page).locator('.pr-cta--pro')
const note = (page) => pro(page).locator('.pr-note:not(.is-ghost)')
const under = (page) => pro(page).locator('.pr-under:not(.is-ghost)')

test.describe('the billing switch', () => {
  test('offers Monthly and Yearly only, Yearly selected, with the live saving in the Yearly option', async ({ page }) => {
    watch(page, PERSONA)
    await stubPrices(page)
    await go(page, '/plans')
    await expectRendered(page)

    await expect(switchGroup(page).getByRole('radio')).toHaveCount(2)
    await expect(page.getByRole('radio', { name: /quarterly/i }), 'quarterly is not sold').toHaveCount(0)
    await expect(option(page, 'Monthly')).not.toBeChecked()
    await expect(option(page, 'Yearly')).toBeChecked()
    await expect(page.locator('.pr-billing-opt').nth(0)).toHaveText('Monthly')
    await expect(page.locator('.pr-billing-opt').nth(1)).toHaveText(`Yearly · Save ${SAVING}%`)
    await expect(page.locator('.pr-billing-save'), 'the saving is shown once on the page').toHaveCount(1)

    await expect(pro(page).locator('.pr-amt')).toHaveText(money(LIVE.yearly.usd / 12))
    await expect(pro(page).locator('.pr-per')).toHaveText('/ month')
    // The real yearly price is written out; no strike-through, no badge.
    await expect(note(page)).toContainText(money(LIVE.yearly.usd))
    // The Yearly terms name only their own price (live-price-gate.test.js pins the
    // source of that); the monthly figure belongs to the other tab.
    await expect(note(page)).not.toContainText(money(LIVE.monthly.usd))
    await expect(under(page)).toHaveText(`Free for 7 days, then ${money(LIVE.yearly.usd)} a year.`)
    await expect(page.locator('.pr-plan-was, .pr-plan-badge, s, del')).toHaveCount(0)
  })

  test('switching to Monthly re-prices the Pro column, by click and by arrow key', async ({ page }) => {
    watch(page, PERSONA)
    await stubPrices(page)
    await go(page, '/plans')
    await expectRendered(page)

    // Keyboard first: a native radio group moves the choice with the arrows.
    await option(page, 'Yearly').focus()
    await page.keyboard.press('ArrowLeft')
    await expect(option(page, 'Monthly')).toBeChecked()
    await expect(option(page, 'Monthly')).toBeFocused()
    await expect(pro(page).locator('.pr-amt')).toHaveText(money(LIVE.monthly.usd))
    await expect(note(page)).toContainText('Billed monthly. No free trial on Monthly; billing starts today.')
    await expect(under(page)).toHaveText(`Yearly works out at ${money(LIVE.yearly.usd / 12)} a month.`)
    await expect(proCta(page)).toHaveText('Upgrade to Pro')

    // And back by click.
    await choose(page, 'Yearly')
    await expect(option(page, 'Yearly')).toBeChecked()
    await expect(pro(page).locator('.pr-amt')).toHaveText(money(LIVE.yearly.usd / 12))
    await expect(proCta(page)).toHaveText('Start 7-day free trial')
  })

  test('?billing= seeds an offered cadence; quarterly and anything else falls back to Yearly', async ({ page }) => {
    watch(page, PERSONA)
    await stubPrices(page)
    await go(page, '/plans?billing=monthly')
    await expectRendered(page)
    await expect(option(page, 'Monthly')).toBeChecked()
    for (const asked of ['quarterly', 'lifetime']) {
      await go(page, `/plans?billing=${asked}`)
      await expectRendered(page)
      await expect(option(page, 'Yearly'), `?billing=${asked} must fall back`).toBeChecked()
    }
  })

  test('?plan= from the upgrade dialog arrives with that cadence selected', async ({ page }) => {
    watch(page, PERSONA)
    await stubPrices(page)
    await go(page, '/plans?plan=monthly')
    await expectRendered(page)
    await expect(option(page, 'Monthly'), '?plan=monthly no longer seeds the switch').toBeChecked()
  })

  test('the headline is one sentence on both cadences and the sub-line quotes the AI ceilings', async ({ page }) => {
    watch(page, PERSONA)
    await stubPrices(page)
    await go(page, '/plans')
    await expectRendered(page)
    const h1 = page.getByRole('heading', { level: 1 })
    const yearly = await h1.textContent()
    await choose(page, 'Monthly')
    await expect(h1, 'the headline changed with the cadence').toHaveText(yearly)
    await expect(page.locator('.pr-sub')).toContainText(/lifts AI from \d+ to \d+ generations a day/)
  })
})

test.describe('the ledger', () => {
  test('is one table of Free and Pro whose rows differ, plus a single "Same on both plans" row', async ({ page }) => {
    watch(page, PERSONA)
    await stubPrices(page)
    await go(page, '/plans')
    await expectRendered(page)
    const table = page.getByRole('table', { name: 'Free and Pro compared' })
    await expect(table).toBeVisible()
    await expect(table.getByRole('rowheader', { name: 'AI generations' })).toBeVisible()
    await expect(table.getByRole('rowheader', { name: 'Same on both plans' })).toHaveCount(1)
    await expect(table).not.toContainText(/quarterly|every 3 months|every three months/i)
    // No row repeats one value on both plans: that is what the single row is for.
    const rows = await table.locator('tr.pr-row:not(.pr-row--same)').evaluateAll((trs) => trs.map((tr) => {
      const cells = [...tr.querySelectorAll('td')].map((td) => td.textContent.replace(/^(Free|Pro)/, '').trim())
      return { label: tr.querySelector('th')?.textContent, same: cells.length === 2 && cells[0] === cells[1] }
    }))
    expect(rows.length).toBeGreaterThan(3)
    expect(rows.filter((r) => r.same).map((r) => r.label), 'rows that show no difference').toEqual([])
  })

  test('the Free button opens the toolkit without a sign-in', async ({ page }) => {
    watch(page, PERSONA)
    await stubPrices(page)
    await go(page, '/plans')
    await expectRendered(page)
    await expect(free(page).getByRole('link', { name: 'Open the toolkit' })).toHaveAttribute('href', '/projects')
  })
})

test.describe('nothing moves when the cadence changes', () => {
  for (const width of [390, 1440]) {
    test(`the Pro button sits at the same y on Monthly and Yearly at ${width}px`, async ({ page }) => {
      watch(page, PERSONA)
      await page.setViewportSize({ width, height: width === 390 ? 844 : 900 })
      await stubPrices(page)
      await go(page, '/plans')
      await expectRendered(page)
      await expect(proCta(page)).toBeVisible()
      const top = async () => Math.round((await proCta(page).boundingBox()).y + await page.evaluate(() => window.scrollY))
      const yearly = await top()
      await choose(page, 'Monthly')
      await expect(option(page, 'Monthly')).toBeChecked()
      await expect(proCta(page)).toHaveText('Upgrade to Pro')
      expect(await top(), 'the Pro button moved when the cadence changed').toBe(yearly)
      await choose(page, 'Yearly')
      await expect(proCta(page)).toHaveText('Start 7-day free trial')
      expect(await top(), 'the Pro button did not return').toBe(yearly)
    })
  }
})

test.describe('phones and the docked plan bar', () => {
  test('at 390 the order is billing, then Pro, then Free', async ({ page }) => {
    watch(page, PERSONA)
    await page.setViewportSize({ width: 390, height: 844 })
    await stubPrices(page)
    await go(page, '/plans')
    await expectRendered(page)
    const y = async (loc) => (await loc.boundingBox()).y
    const billing = await y(switchGroup(page))
    const proY = await y(proCta(page))
    const freeY = await y(free(page).getByRole('link', { name: 'Open the toolkit' }))
    expect(billing, 'billing comes before Pro').toBeLessThan(proY)
    expect(proY, 'Pro comes before Free').toBeLessThan(freeY)
    expect(await page.evaluate(() => document.documentElement.scrollWidth), 'the page scrolls sideways').toBeLessThanOrEqual(390)
  })

  test('below 1360px the bar docks to the bottom once the Pro button scrolls away, and repeats its label', async ({ page }) => {
    watch(page, PERSONA)
    await page.setViewportSize({ width: 390, height: 844 })
    await stubPrices(page)
    await go(page, '/plans')
    await expectRendered(page)
    const bar = page.locator('.pr-bar')
    await expect(bar).not.toHaveClass(/is-on/)
    await page.evaluate(() => window.scrollTo(0, 700))
    await expect(bar).toHaveClass(/is-on/)
    await expect(bar).toHaveAttribute('aria-hidden', 'true')
    await expect(bar.locator('.pr-bar-btn')).toHaveText('Start 7-day free trial')
    const box = await bar.boundingBox()
    expect(box.y + box.height, 'the docked bar is not at the bottom of the screen').toBeGreaterThan(844 - 4)
    await page.evaluate(() => window.scrollTo(0, 0))
    await expect(bar).not.toHaveClass(/is-on/)
  })

  for (const [width, height] of [[390, 844], [320, 640]]) {
    test(`at ${width} the first screen holds the Pro price, billed line, trial line and button, and nothing scrolls sideways`, async ({ page }) => {
      watch(page, PERSONA)
      await page.setViewportSize({ width, height })
      await stubPrices(page)
      await go(page, '/plans')
      await expectRendered(page)
      await expect(pro(page).locator('.pr-amt')).toHaveText(money(LIVE.yearly.usd / 12))
      await expect(note(page)).toContainText(`${money(LIVE.yearly.usd)} billed yearly`)
      await expect(note(page)).toContainText('7-day free trial')
      const button = await proCta(page).boundingBox()
      expect(button.y + button.height, 'the Pro button is below the first screen').toBeLessThanOrEqual(height)
      expect(await page.evaluate(() => document.documentElement.scrollWidth), 'the page scrolls sideways').toBeLessThanOrEqual(width)
    })
  }

  test('below 1024 the offer-first layout shows: the Pro card lists what Pro adds, the table has three columns and no quarterly price', async ({ page }) => {
    watch(page, PERSONA)
    await page.setViewportSize({ width: 390, height: 844 })
    await stubPrices(page)
    await go(page, '/plans')
    await expectRendered(page)
    await expect(pro(page).getByRole('heading', { name: 'Everything in Free, plus' })).toBeVisible()
    const table = page.getByRole('table', { name: 'Free and Pro compared' })
    await expect(table.getByRole('columnheader')).toHaveText(['What you get', 'Free', 'Pro'])
    await expect(page.locator('main')).not.toContainText(/quarterly|every 3 months|every three months/i)
    // The first question is open, the rest closed.
    await expect(page.locator('.pr-qa').first()).toHaveAttribute('open', '')
    await expect(page.locator('.pr-qa[open]')).toHaveCount(1)
  })

  test('the saving is a true line on both cadences, derived from the live prices', async ({ page }) => {
    watch(page, PERSONA)
    await page.setViewportSize({ width: 390, height: 844 })
    await stubPrices(page)
    await go(page, '/plans')
    await expectRendered(page)
    await expect(page.locator('.pr-save')).toHaveText(`Save ${SAVING}% with Yearly`)
    await choose(page, 'Monthly')
    await expect(page.locator('.pr-save')).toHaveText(`Save ${SAVING}% with Yearly`)
  })

  test('the docked bar hides at the closing band, whose Choose Pro goes to checkout on the selected cadence', async ({ page }) => {
    watch(page, 'a free account choosing Pro at the end of the page')
    await signIn(page, { plan: 'free' })
    await page.setViewportSize({ width: 390, height: 844 })
    await stubPrices(page)
    await go(page, '/plans')
    await expectRendered(page)
    await choose(page, 'Monthly')
    const bar = page.locator('.pr-bar')
    await page.evaluate(() => window.scrollTo(0, 900))
    await expect(bar).toHaveClass(/is-on/)
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await expect(bar).not.toHaveClass(/is-on/)
    const close = page.locator('.pr-close .pr-cta--pro')
    await expect(close).toHaveText('Choose Pro')
    await expect(close).toHaveAttribute('href', '/checkout?plan=monthly')
    await close.click()
    await expect(page).toHaveURL(/\/checkout\?plan=monthly$/)
  })
})

// Scrolls until the whole Pro head (the Pro column's header row, or the Pro
// card) is just above the top of the screen, which is where the plan bar
// appears, without depending on how tall the page is.
const scrollPastProHead = (page) => pro(page).evaluate((el) => {
  window.scrollTo(0, window.scrollY + el.getBoundingClientRect().bottom - 20)
})
// The bar follows the scroll on an animation frame, so a check that the bar is
// OFF after a scroll waits two frames first; otherwise it samples the old state.
const twoFrames = (page) => page.evaluate(() => new Promise((resolve) => {
  requestAnimationFrame(() => requestAnimationFrame(resolve))
}))
const footerPadBottom = (page) => page.locator('.sp-footer .sp-footer-inner').evaluate((el) => getComputedStyle(el).paddingBottom)
// Changes the cadence from the page itself, so the page does not scroll back up
// to the switch (clicking it would, and that would take the bar away).
const pickCadenceInPlace = (page, id) => page.evaluate((value) => {
  document.querySelector(`input[name="pricing-billing"][value="${value}"]`).click()
}, id)

test.describe('the plan bar on the ledger widths', () => {
  for (const width of [1024, 1180, 1359]) {
    test(`at ${width} the bar docks to the bottom after the Pro button leaves, says how it bills, and drops as the closing colour band comes into view`, async ({ page }) => {
      watch(page, PERSONA)
      await page.setViewportSize({ width, height: 800 })
      await stubPrices(page)
      await go(page, '/plans')
      await expectRendered(page)
      await expect(proCta(page)).toHaveText('Start 7-day free trial')
      const bar = page.locator('.pr-bar')
      await expect(page.locator('.pr-table'), 'the ledger layout is not showing').toBeVisible()
      await expect(bar).not.toHaveClass(/is-on/)

      await scrollPastProHead(page)
      await expect(bar).toHaveClass(/is-on/)
      expect(await bar.evaluate((el) => getComputedStyle(el).position), 'the bar is not docked').toBe('fixed')
      const box = await bar.boundingBox()
      expect(box.y + box.height, 'the docked bar is not at the bottom of the screen').toBeGreaterThan(800 - 4)
      await expect(bar.locator('.pr-bar-pro .pr-bar-name')).toHaveText('Pro · billed yearly')
      await expect(bar.locator('.pr-bar-bill'), 'the cadence is hidden in the docked bar').toBeVisible()
      await expect(bar.locator('.pr-bar-pro .pr-bar-amt')).toHaveText(`${money(LIVE.yearly.usd / 12)} / month`)
      await expect(bar.locator('.pr-bar-btn')).toHaveText('Start 7-day free trial')

      // The label follows the switch while the bar is showing.
      await pickCadenceInPlace(page, 'monthly')
      await expect(bar.locator('.pr-bar-pro .pr-bar-name')).toHaveText('Pro · billed monthly')
      await expect(bar.locator('.pr-bar-pro .pr-bar-amt')).toHaveText(`${money(LIVE.monthly.usd)} / month`)
      await expect(bar.locator('.pr-bar-btn')).toHaveText('Upgrade to Pro')
      await expect(bar).toHaveClass(/is-on/)

      // It stays on until the closing colour band comes into view, then drops, so
      // the band and the footer never paint over it.
      const scrollRampTopTo = (offset) => page.evaluate((o) => {
        const ramp = document.querySelector('.sp-ramp--close')
        window.scrollTo(0, window.scrollY + ramp.getBoundingClientRect().top - window.innerHeight - o)
      }, offset)
      await scrollRampTopTo(40)
      await twoFrames(page)
      await expect(bar, 'the bar dropped before the colour band was in view').toHaveClass(/is-on/)
      const padWhileOn = await footerPadBottom(page)
      await scrollRampTopTo(-40)
      await twoFrames(page)
      await expect(bar, 'the bar is still showing with the colour band in view').not.toHaveClass(/is-on/)
      await expect(bar).toBeHidden()

      // At the very bottom it is still off, and the footer reserves nothing for it.
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await twoFrames(page)
      await expect(bar).not.toHaveClass(/is-on/)
      await expect(bar).toBeHidden()
      expect(await footerPadBottom(page), 'the footer still reserves room for a bar that is off').toBe(padWhileOn)

      // And it comes back on the way up.
      await scrollRampTopTo(40)
      await twoFrames(page)
      await expect(bar).toHaveClass(/is-on/)
      await page.evaluate(() => window.scrollTo(0, 0))
      await expect(bar).not.toHaveClass(/is-on/)
    })
  }

  test('at 1280 on a tall screen the bar docks once the Pro button has scrolled away', async ({ page }) => {
    watch(page, PERSONA)
    await page.setViewportSize({ width: 1280, height: 1080 })
    await stubPrices(page)
    await go(page, '/plans')
    await expectRendered(page)
    await expect(page.locator('.pr-table'), 'the ledger layout is not showing').toBeVisible()
    const bar = page.locator('.pr-bar')
    await expect(bar).not.toHaveClass(/is-on/)

    await scrollPastProHead(page)
    await expect(bar).toHaveClass(/is-on/)
    expect(await bar.evaluate((el) => getComputedStyle(el).position), 'the bar is not docked').toBe('fixed')
  })

  for (const width of [1360, 1440]) {
    test(`at ${width} the bar is pinned under the nav once the Pro head leaves, without the cadence text, and stays on to the end`, async ({ page }) => {
      watch(page, PERSONA)
      await page.setViewportSize({ width, height: 900 })
      await stubPrices(page)
      await go(page, '/plans')
      await expectRendered(page)
      await expect(proCta(page)).toHaveText('Start 7-day free trial')
      const bar = page.locator('.pr-bar')
      await expect(bar).not.toHaveClass(/is-on/)

      await scrollPastProHead(page)
      await expect(bar).toHaveClass(/is-on/)
      expect(await bar.evaluate((el) => getComputedStyle(el).position), 'the bar is not pinned under the nav').toBe('sticky')
      const box = await bar.boundingBox()
      expect(box.y, 'the pinned bar is not at the top of the screen').toBeLessThan(120)
      await expect(bar.locator('.pr-bar-btn')).toHaveText('Start 7-day free trial')
      await expect(bar.locator('.pr-bar-bill'), 'the pinned bar repeats the cadence the Pro column already states').toBeHidden()

      // The pinned bar has no exit at the end of the ledger (the docked bar
      // does); it stays on and simply scrolls away with its table.
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await expect(bar).toHaveClass(/is-on/)
    })
  }

  test('a resize across 1024 with the bar showing leaves one bar that tracks the new Pro button', async ({ page }) => {
    watch(page, PERSONA)
    await page.setViewportSize({ width: 1180, height: 800 })
    await stubPrices(page)
    await go(page, '/plans')
    await expectRendered(page)
    await expect(proCta(page)).toHaveText('Start 7-day free trial')
    const bar = page.locator('.pr-bar')
    await scrollPastProHead(page)
    await expect(bar).toHaveClass(/is-on/)

    // Down into the offer-first layout: a different tree, so the bar and the
    // elements it measures are new. Back at the top the Pro button is on screen,
    // so a bar still bound to the old tree would stay on.
    await page.setViewportSize({ width: 900, height: 800 })
    await expect(page.locator('.pr-pro')).toBeVisible()
    await expect(page.locator('.pr-bar'), 'the resize left more than one bar').toHaveCount(1)
    await page.evaluate(() => window.scrollTo(0, 0))
    await expect(bar).not.toHaveClass(/is-on/)
    await scrollPastProHead(page)
    await expect(bar).toHaveClass(/is-on/)
    await expect(bar.locator('.pr-bar-pro .pr-bar-name')).toHaveText('Pro · billed yearly')

    // And back up into the ledger.
    await page.setViewportSize({ width: 1180, height: 800 })
    await expect(page.locator('.pr-table')).toBeVisible()
    await expect(page.locator('.pr-bar')).toHaveCount(1)
    await page.evaluate(() => window.scrollTo(0, 0))
    await expect(bar).not.toHaveClass(/is-on/)
    await scrollPastProHead(page)
    await expect(bar).toHaveClass(/is-on/)
  })
})

test.describe('the Pro CTA starts the real upgrade', () => {
  test('signed in, it goes straight to checkout for the chosen cadence', async ({ page }) => {
    watch(page, 'a free account upgrading')
    await signIn(page, { plan: 'free' })
    await stubPrices(page)
    await go(page, '/plans')
    await expectRendered(page)

    await expect(proCta(page)).toHaveAttribute('href', '/checkout?plan=yearly')
    await choose(page, 'Monthly')
    await expect(proCta(page)).toHaveAttribute('href', '/checkout?plan=monthly')
    await proCta(page).click()
    await expect(page).toHaveURL(/\/checkout\?plan=monthly$/)
  })

  test('/checkout?plan=quarterly shows the invalid-selection card and starts nothing', async ({ page }) => {
    watch(page, 'a free account following an old quarterly link')
    await signIn(page, { plan: 'free' })
    await stubPrices(page)
    await go(page, '/checkout?plan=quarterly')
    await expect(page.getByRole('heading', { name: 'Invalid checkout selection' })).toBeVisible()
    await expect(page.getByText(/Choose Monthly or Yearly from Plans/)).toBeVisible()
    await expect(page.getByRole('link', { name: 'Back to Plans' })).toHaveAttribute('href', '/plans')
    await expect(page.locator('.checkout-plan-cadence'), 'a quarterly plan summary rendered').toHaveCount(0)
  })

  test('signed out, the Pro button opens the login popup over the plans page and keeps the chosen cadence in its link', async ({ page }) => {
    watch(page, 'a visitor upgrading before they have an account')
    await stubPrices(page)
    await go(page, '/plans')
    await expectRendered(page)

    await expect(proCta(page)).toHaveAttribute('href', '/checkout?plan=yearly')
    await choose(page, 'Monthly')
    await expect(proCta(page)).toHaveAttribute('href', '/checkout?plan=monthly')

    // The login flow starts at once, on this page: no second click at checkout.
    await proCta(page).click()
    await expect(page.locator('#ui-login-title')).toBeVisible()
    await expect(page).toHaveURL(/\/plans$/)
    expect(
      await page.evaluate(() => sessionStorage.getItem('vs-resume-after-onboarding')),
      'a new account would not come back to the checkout it chose',
    ).toBe('/checkout?plan=monthly')
  })

  test('signed out, opening /checkout directly names the plan and asks for an account', async ({ page }) => {
    watch(page, 'a visitor who opened a checkout link before they have an account')
    await stubPrices(page)
    await go(page, '/checkout?plan=yearly')
    // Not the bare sign-in box: the visitor lands on the plan, its price and its trial.
    await expect(page.locator('.checkout-plan-cadence')).toHaveText('Yearly plan')
    await expect(page.locator('.checkout-plan-amount')).not.toHaveText('—')
    await expect(page.locator('.checkout-trial')).toContainText('7-day free trial')
    // The panel's prompt: the summary's own copy of it is hidden in two columns.
    await expect(page.locator('.checkout-form').getByText('Log in or create an account to pay')).toBeVisible()
  })

  // The closing band and the docked bar only exist in the narrow layout (the
  // 1440px ledger has neither), so their links are read at a phone width.
  test('signed out, the closing Choose Pro and the docked bar button also carry the chosen cadence', async ({ page }) => {
    watch(page, 'a visitor at the end of the page before they have an account')
    await page.setViewportSize({ width: 390, height: 844 })
    await stubPrices(page)
    await go(page, '/plans')
    await expectRendered(page)

    await expect(page.locator('.pr-close .pr-cta--pro')).toHaveAttribute('href', '/checkout?plan=yearly')
    await expect(page.locator('.pr-bar-btn')).toHaveAttribute('href', '/checkout?plan=yearly')
    await choose(page, 'Monthly')
    await expect(page.locator('.pr-close .pr-cta--pro')).toHaveAttribute('href', '/checkout?plan=monthly')
    await expect(page.locator('.pr-bar-btn')).toHaveAttribute('href', '/checkout?plan=monthly')

    // Each of them starts the login flow on this page too. Closing the popup
    // leaves the visitor on /plans with nothing started.
    const popup = page.locator('#ui-login-title')
    await page.evaluate(() => window.scrollTo(0, 900))
    await expect(page.locator('.pr-bar')).toHaveClass(/is-on/)
    await page.locator('.pr-bar-btn').click()
    await expect(popup, 'the docked bar button did not open the login popup').toBeVisible()
    await page.keyboard.press('Escape')
    await expect(popup).toHaveCount(0)
    await expect(page).toHaveURL(/\/plans$/)

    await page.locator('.pr-close .pr-cta--pro').click()
    await expect(popup, 'the closing Choose Pro did not open the login popup').toBeVisible()
    await expect(page).toHaveURL(/\/plans$/)
  })

  // The continuation of the test above: the visitor clicks the prompt, logs in
  // through the popup, and the page must still be the checkout for the cadence
  // they chose, now with the payment form mounting for it.
  for (const cadence of ['yearly', 'monthly']) {
    const word = cadence === 'yearly' ? 'Yearly' : 'Monthly'
    test(`signed out, logging in from the plans page keeps the ${cadence} plan and mounts the ${cadence} payment form`, async ({ page }) => {
      watch(page, 'a visitor who chose a cadence, then logged in to pay')
      const sessions = await answerSessions(page)
      await stubStripe(page)
      await stubPrices(page)
      await signIn(page, { plan: 'free', lateSignIn: true })
      await go(page, '/plans')
      await expectRendered(page)
      await choose(page, word)
      await proCta(page).click()
      expect(sessions, 'a payment session was asked for before anyone had logged in').toEqual([])

      await logInThroughPopup(page)
      await expect(page).toHaveURL(new RegExp(`/checkout\\?plan=${cadence}$`))
      // The hand-off a brand-new account depends on: sign-up routes through
      // onboarding, which returns to whatever this holds (69-flow-audit covers
      // the return itself). The fixture cannot mint a new account, so the
      // stash is what can be read here.
      expect(
        await page.evaluate(() => sessionStorage.getItem('vs-resume-after-onboarding')),
        'the checkout with its cadence was not remembered for a new sign-up',
      ).toBe(`/checkout?plan=${cadence}`)

      // The checkout for this cadence, with the popup gone.
      await expect(page.locator('#ui-login-title')).toHaveCount(0)
      await expect(page.getByText('Log in or create an account to pay')).toHaveCount(0)
      await expect(page).toHaveURL(new RegExp(`/checkout\\?plan=${cadence}$`))
      await expect(page.locator('.checkout-plan-cadence')).toHaveText(`${word} plan`)
      await expect(page.locator('.checkout-period-opt.is-on .checkout-period-label')).toHaveText(word)

      // The payment form is built for that cadence, and only that one. A build
      // without a Stripe publishable key stops at "Payments aren't configured"
      // (105-checkout-change-plan skips there); everything above still ran, and
      // the run says so rather than passing silently.
      const mounted = page.locator('.checkout-form [data-stub-session]')
      const notConfigured = page.locator('.checkout-form', { hasText: /Payments aren.t configured/ })
      await expect(mounted.or(notConfigured)).toBeVisible()
      if (await notConfigured.isVisible()) {
        test.info().annotations.push({ type: 'payment form not asserted', description: 'this build carries no Stripe publishable key' })
        expect(sessions, 'a session was asked for in a build with no payment form').toEqual([])
        return
      }
      await expect(mounted).toHaveAttribute('data-stub-session', `cs_test_stub_${cadence}`)
      expect(sessions, 'the session was not for the cadence the visitor chose').toEqual([cadence])
    })
  }

  test('a Pro account is sent to its account, not to a second checkout', async ({ page }) => {
    watch(page, 'a Pro subscriber reading the plans')
    await signIn(page, { plan: 'pro' })
    await stubPrices(page)
    await go(page, '/plans')
    await expectRendered(page)
    await expect(pro(page).getByRole('link', { name: 'View account details' })).toHaveAttribute('href', '/settings')
    await expect(pro(page).getByRole('link', { name: /Upgrade to Pro|free trial/ })).toHaveCount(0)
  })

  test('the Pro button is the one accent fill, readable at AA at rest and hovered, in both themes', async ({ browser }) => {
    for (const theme of ['light', 'dark']) {
      const ctx = await browser.newContext({ colorScheme: theme, locale: 'en-US' })
      await ctx.addInitScript((t) => { try { localStorage.setItem('vs-t', t) } catch { /* private mode */ } }, theme)
      const page = await ctx.newPage()
      await stubPrices(page)
      await go(page, '/plans')
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
      const button = proCta(page)
      await expect(button).toBeVisible()
      // Every colour is normalised through a canvas to `rgb(r, g, b)`: Chrome
      // serialises a color-mix() result as `color(srgb …)` or `oklab(…)`.
      const read = () => button.evaluate((el) => {
        const s = getComputedStyle(el)
        const c2d = document.createElement('canvas').getContext('2d')
        const norm = (c) => {
          c2d.clearRect(0, 0, 1, 1)
          c2d.fillStyle = '#000'; c2d.fillStyle = c
          c2d.fillRect(0, 0, 1, 1)
          const [r, g, b] = c2d.getImageData(0, 0, 1, 1).data
          return `rgb(${r}, ${g}, ${b})`
        }
        return { bg: norm(s.backgroundColor), fg: norm(s.color) }
      })
      const lum = (rgb) => {
        const c = rgb.match(/\d+/g).slice(0, 3).map((v) => {
          const x = Number(v) / 255
          return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4
        })
        return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
      }
      const ratio = (a, b) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05) }
      // Polled: the button eases from its loading state into the fill.
      await expect.poll(async () => { const r = await read(); return ratio(r.fg, r.bg) >= 4.5 }, { message: `${theme}: Pro CTA contrast at rest` }).toBe(true)
      const rest = await read()
      expect(rest.bg, `${theme}: the Pro CTA is not filled`).not.toBe('rgb(0, 0, 0)')
      await button.hover()
      await page.waitForTimeout(300) // the background transition, settled
      const hovered = await read()
      expect(ratio(hovered.fg, hovered.bg), `${theme}: Pro CTA contrast while hovered (${hovered.bg})`).toBeGreaterThanOrEqual(4.5)
      await ctx.close()
    }
  })
})

// A page in AUD where one cadence has an AUD price and the other has only USD.
// The missing cadence's amount may still be named inside the other cadence's
// note, but only as an explicit US$ figure, and a cross-sell line must never
// point at a cadence that cannot be bought in the page's currency.
test.describe('when one cadence has no price in the page currency', () => {
  test.use({ locale: 'en-AU' })

  test('the Yearly note names no monthly price when Monthly has none in AUD, and never a USD one', async ({ page }) => {
    watch(page, 'an Australian visitor when Monthly has no AUD price')
    await stubPrices(page, {
      source: { monthly: 'live', yearly: 'live' },
      monthly: { usd: 7 },
      yearly: { usd: 48, aud: 75 },
    })
    await go(page, '/plans')
    await expectRendered(page)

    await expect(pro(page).locator('.pr-amt')).toHaveText('A$6.25')
    await expect(note(page)).toContainText('A$75 billed yearly.')
    await expect(note(page), 'a USD monthly price was set beside an AUD yearly one').not.toContainText(/billed monthly|US\$|A\$7(?!\d)/)
    await expect(page.locator('.pr-billing-save'), 'a saving was stated across two currencies').toHaveCount(0)
  })

  test('the Yearly note reads the same when both cadences have an AUD price, and never adds the monthly one', async ({ page }) => {
    watch(page, 'an Australian visitor when both cadences have an AUD price')
    await stubPrices(page, {
      source: { monthly: 'live', yearly: 'live' },
      monthly: { usd: 7, aud: 11 },
      yearly: { usd: 48, aud: 75 },
    })
    await go(page, '/plans')
    await expectRendered(page)

    await expect(note(page)).toContainText('A$75 billed yearly.')
    await expect(note(page), 'the Yearly note offered a monthly billing alongside').not.toContainText(/billed monthly|A\$11/)
  })

  test('a live price with no option for AUD is not offered in AUD, whatever number the table carries', async ({ page }) => {
    watch(page, 'an Australian visitor when the live Monthly price has no AUD option')
    await stubPrices(page, {
      source: { monthly: 'live', yearly: 'live' },
      currencyAvailability: { monthly: { usd: true, aud: false }, yearly: { usd: true, aud: true } },
      monthly: { usd: 7, aud: 11 },
      yearly: { usd: 48, aud: 75 },
    })
    await go(page, '/plans')
    await expectRendered(page)

    await expect(note(page)).toContainText('A$75 billed yearly.')
    await expect(note(page), 'an AUD figure with no live AUD price behind it was named').not.toContainText(/billed monthly|A\$11/)
    await go(page, '/plans?billing=monthly')
    await expectRendered(page)
    await expect(pro(page).locator('.pr-amt')).toHaveText('Unavailable')
    await expect(pro(page).getByRole('link', { name: /Upgrade to Pro|free trial/ })).toHaveCount(0)
  })

  test('the Yearly note does not name a monthly price the service serves from its fallback table', async ({ page }) => {
    watch(page, 'an Australian visitor when Monthly is only a fallback default')
    await stubPrices(page, {
      source: { monthly: 'fallback', yearly: 'live' },
      monthly: { usd: 7, aud: 11 },
      yearly: { usd: 48, aud: 75 },
    })
    await go(page, '/plans')
    await expectRendered(page)

    await expect(note(page)).toContainText('A$75 billed yearly.')
    await expect(note(page), 'a fallback default was named as a price').not.toContainText(/billed monthly|A\$11/)
  })

  test('with Yearly unbuyable in AUD, the Monthly page has no "Yearly works out at" line', async ({ page }) => {
    watch(page, 'an Australian visitor when Yearly has no AUD price')
    await stubPrices(page, {
      source: { monthly: 'live', yearly: 'live' },
      monthly: { usd: 7, aud: 11 },
      yearly: { usd: 48 },
    })
    await go(page, '/plans?billing=monthly')
    await expectRendered(page)

    await expect(pro(page).locator('.pr-amt')).toHaveText('A$11')
    await expect(under(page), 'no cross-sell for a cadence that cannot be bought here').toHaveText('')
    await expect(pro(page)).not.toContainText('works out at')
  })
})

test.describe('when the price service cannot answer', () => {
  test('the page says so, starts no checkout, and recovers on retry', async ({ page }) => {
    watch(page, 'a visitor on a bad connection')
    await stubPrices(page, { error: 'down' }, 503)
    await go(page, '/plans')
    await expectRendered(page)

    await expect(pro(page).locator('.pr-amt')).toHaveText('Unavailable')
    await expect(pro(page).locator('.pr-amt')).toHaveClass(/is-word/)
    await expect(pro(page).locator('.pr-per'), 'a cadence is printed beside no price').toHaveCount(0)
    await expect(pro(page).getByRole('link', { name: /Upgrade to Pro|free trial/ }), 'a checkout is offered with no price').toHaveCount(0)
    await expect(pro(page).getByRole('button', { name: 'Pricing unavailable right now' })).toHaveCount(0)
    await expect(pro(page).locator('#pricing-noprice')).toContainText('so no checkout will start')
    await expect(page.locator('.pr-billing-save'), 'a saving is claimed with no prices to compute it').toHaveCount(0)
    await expect(page.locator('.pr-bar'), 'the docked bar offers a checkout with no price').not.toHaveClass(/is-on/)

    // Recovery: the service answers on retry, and the offer returns.
    await page.unroute('**/api/get-prices')
    await stubPrices(page)
    await pro(page).getByRole('button', { name: 'Retry live pricing' }).click()
    await expect(pro(page).locator('.pr-amt')).toHaveText(money(LIVE.yearly.usd / 12))
    await expect(proCta(page)).toBeVisible()
  })

  test('with only the Yearly price missing, the note names Yearly rather than Stripe and Monthly still checks out', async ({ page }) => {
    watch(page, 'a visitor when one price is unavailable')
    await stubPrices(page, { source: { monthly: 'live' }, monthly: { usd: LIVE.monthly.usd } })
    await go(page, '/plans')
    await expectRendered(page)

    await expect(pro(page).locator('.pr-amt')).toHaveText('Unavailable')
    const unavailable = pro(page).locator('#pricing-noprice')
    await expect(unavailable).toContainText('No USD price for Yearly')
    await expect(unavailable).toContainText('Monthly can be bought in USD')
    await expect(unavailable, 'the price service answered, so it is not an outage').not.toContainText(/didn.t load/)
    await expect(pro(page).getByRole('button', { name: 'Retry live pricing' }), 'Retry cannot fix a missing price').toHaveCount(0)
    await expect(pro(page).getByRole('button', { name: 'Switch to Monthly' })).toBeVisible()

    await choose(page, 'Monthly')
    await expect(pro(page).locator('.pr-amt')).toHaveText(money(LIVE.monthly.usd))
    await expect(proCta(page)).toHaveText('Upgrade to Pro')
    await expect(pro(page).locator('#pricing-noprice')).toHaveCount(0)
  })
})
