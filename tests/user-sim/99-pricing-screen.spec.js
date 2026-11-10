// /plans — the plans page (src/pages/Pricing.jsx). What a person choosing how to
// pay for Pro depends on:
//
//   1. THE BILLING SWITCH. A radio group, Monthly and Yearly (quarterly is not
//      sold), with the live saving as text in the Yearly option. Every figure is
//      computed here from the stubbed /api/get-prices answer, never typed, so a
//      page that starts typing a price goes red.
//   2. THE PRO CTA FLOW. Signed in, straight to /checkout for the chosen cadence;
//      signed out, the login popup opens over /plans and then goes on to that
//      checkout. /checkout opened directly still asks for the sign-in itself.
//   3. NOTHING MOVES. Switching cadence must not shift the Pro button, at a phone
//      and a desktop width.
//   4. THE COMPARISON, THE QUESTIONS AND THE CLOSING CALL: one table whose head
//      sticks under the nav and carries the Pro price once the pair has scrolled
//      away, seven closed questions, and a closing band whose Pro button goes to
//      checkout on the selected cadence.
//   5. A PAGE CURRENCY WITH ONE CADENCE MISSING, and the price service being down.
//
// The suite's preview has no serverless functions, so /api/get-prices is stubbed
// with production's own answer shape. The outage path is asserted too, because a
// pricing page that cannot name a price must not start a checkout.
import { test, expect } from './base.js'
import { go, watch, expectRendered, signIn } from './helpers.js'
import { withAvailability } from './price-payload.js'
import { TOOL_COUNT, numberWord } from '../../src/components/spectrum/spectrumFacts.js'

// Production's /api/get-prices answer, trimmed to the currency under test.
const LIVE = {
  source: { monthly: 'live', yearly: 'live' },
  monthly: { usd: 7 },
  yearly: { usd: 48 },
}
// The yearly saving against monthly, from the live amounts — the rule
// planLadder.js applies (per-month rate vs monthly, whole percent).
const SAVING = Math.round((1 - (LIVE.yearly.usd / 12) / LIVE.monthly.usd) * 100)
const money = (n) => `US$${Number.isInteger(n) ? n : n.toFixed(2)}`

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
const choose = (page, name) => option(page, name).click()
const pro = (page) => page.locator('.hpl-pro')
const free = (page) => page.locator('.hpl-free')
const proCta = (page) => pro(page).locator('.pa-cta').locator('a, button').first()
const note = (page) => pro(page).locator('.pa-slot')

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
    await expect(switchGroup(page).getByRole('radio').nth(0)).toHaveText('Monthly')
    await expect(switchGroup(page).getByRole('radio').nth(1)).toHaveText(`Yearly · Save ${SAVING}%`)
    await expect(page.getByText(/Save \d+%/), 'the saving is shown once on the page').toHaveCount(1)

    await expect(pro(page).locator('.pa-amt')).toHaveText(money(LIVE.yearly.usd / 12))
    await expect(pro(page).locator('.pa-per')).toHaveText('a month, billed yearly')
    await expect(note(page)).toContainText(`Free for 7 days, then ${money(LIVE.yearly.usd)} a year.`)
    await expect(proCta(page)).toHaveText('Start 7-day free trial')
    await expect(page.locator('s, del'), 'a strike-through price').toHaveCount(0)
  })

  test('switching to Monthly re-prices the Pro card, by arrow key and by click', async ({ page }) => {
    watch(page, PERSONA)
    await stubPrices(page)
    await go(page, '/plans')
    await expectRendered(page)

    await option(page, 'Yearly').focus()
    await page.keyboard.press('ArrowLeft')
    await expect(option(page, 'Monthly')).toBeChecked()
    await expect(option(page, 'Monthly')).toBeFocused()
    await expect(option(page, 'Yearly'), 'the switch is one tab stop').toHaveAttribute('tabindex', '-1')
    await expect(pro(page).locator('.pa-amt')).toHaveText(money(LIVE.monthly.usd))
    await expect(note(page)).toContainText('Billed monthly. No free trial on Monthly; billing starts today.')
    await expect(note(page)).toContainText(`Yearly works out at ${money(LIVE.yearly.usd / 12)} a month.`)
    await expect(proCta(page)).toHaveText('Upgrade to Pro')

    await choose(page, 'Yearly')
    await expect(option(page, 'Yearly')).toBeChecked()
    await expect(pro(page).locator('.pa-amt')).toHaveText(money(LIVE.yearly.usd / 12))
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

  test('the headline is one sentence on both cadences and the lead quotes the AI ceilings', async ({ page }) => {
    watch(page, PERSONA)
    await stubPrices(page)
    await go(page, '/plans')
    await expectRendered(page)
    const h1 = page.getByRole('heading', { level: 1 })
    await expect(h1).toHaveText('Improve your design systems for less than 1 coffee per month.')
    await choose(page, 'Monthly')
    await expect(h1, 'the headline changed with the cadence').toHaveText('Improve your design systems for less than 1 coffee per month.')
    await expect(page.locator('.pa-lead')).toContainText(/lifts AI from \d+ to \d+ generations a day/)
  })
})

test.describe('the comparison table, the questions and the closing call', () => {
  test('one table of Free and Pro whose rows differ, plus a single "Same on both plans" row', async ({ page }) => {
    watch(page, PERSONA)
    await stubPrices(page)
    await go(page, '/plans')
    await expectRendered(page)
    const table = page.getByRole('table', { name: 'Free and Pro compared' })
    await expect(table).toBeVisible()
    await expect(table.getByRole('rowheader', { name: 'AI generations' })).toBeVisible()
    await expect(table.getByRole('rowheader', { name: 'Same on both plans' })).toHaveCount(1)
    await expect(table).not.toContainText(/quarterly|every 3 months|every three months/i)
    const rows = await table.locator('tbody:not(.pl-same) tr:has(td)').evaluateAll((trs) => trs.map((tr) => {
      const cells = [...tr.querySelectorAll('td')].map((td) => td.textContent.trim())
      return { label: tr.querySelector('th')?.textContent, same: cells.length === 2 && cells[0] === cells[1] }
    }))
    expect(rows.length, 'the table rendered almost no rows').toBeGreaterThan(8)
    expect(rows.filter((r) => r.same).map((r) => r.label), 'rows that show no difference').toEqual([])
  })

  test('every number in the table is set heavier than the words around it', async ({ page }) => {
    watch(page, PERSONA)
    await stubPrices(page)
    await go(page, '/plans')
    const weights = await page.locator('td:has(.pl-n)').first().evaluate((td) => ({
      cell: Number(getComputedStyle(td).fontWeight), number: Number(getComputedStyle(td.querySelector('.pl-n')).fontWeight),
    }))
    expect(weights.number).toBeGreaterThan(weights.cell)
  })

  test('the Free button opens the toolkit without a sign-in', async ({ page }) => {
    watch(page, PERSONA)
    await stubPrices(page)
    await go(page, '/plans')
    await expect(free(page).getByRole('link', { name: 'Open the toolkit' })).toHaveAttribute('href', '/projects')
  })

  test('seven questions, all closed at rest, each opening and closing on its own', async ({ page }) => {
    watch(page, PERSONA)
    await stubPrices(page)
    await go(page, '/plans')
    const faq = page.locator('section[aria-labelledby="pl-faq-h"]')
    const questions = faq.getByRole('button')
    await expect(questions).toHaveText([
      'When am I charged?', 'How do I cancel?', 'Can I get a refund?', 'Do prices include tax?',
      'What happens to my work if Pro ends?', 'Do my files get uploaded?', 'What counts as one generation?',
    ])
    for (const q of await questions.all()) await expect(q).toHaveAttribute('aria-expanded', 'false')
    const first = questions.nth(0)
    const second = questions.nth(1)
    await first.click()
    await second.click()
    await expect(first).toHaveAttribute('aria-expanded', 'true')
    await expect(faq.getByRole('region', { name: 'When am I charged?' })).toBeVisible()
    await first.click()
    await expect(first).toHaveAttribute('aria-expanded', 'false')
    await expect(faq.getByRole('region', { name: 'When am I charged?' })).toBeHidden()
    await expect(second, 'closing one closed another').toHaveAttribute('aria-expanded', 'true')
    await expect(faq.getByRole('link', { name: 'ask support' })).toHaveAttribute('href', '/feedback')
  })

  test('the closing call names the tool count, opens the toolkit, and Choose Pro follows the cadence', async ({ page }) => {
    watch(page, PERSONA)
    await stubPrices(page)
    await go(page, '/plans')
    const close = page.locator('.hm-close')
    await expect(close.getByRole('heading')).toHaveText(`Start with all ${numberWord(TOOL_COUNT)} tools.`)
    await expect(close.getByRole('link', { name: 'Open the toolkit' })).toHaveAttribute('href', '/projects')
    await expect(close.getByRole('link', { name: 'Choose Pro' })).toHaveAttribute('href', '/checkout?plan=yearly')
    await choose(page, 'Monthly')
    await expect(close.getByRole('link', { name: 'Choose Pro' })).toHaveAttribute('href', '/checkout?plan=monthly')
  })
})

test.describe('nothing moves when the cadence changes', () => {
  for (const width of [1440, 390]) {
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
      await expect(proCta(page)).toHaveText('Upgrade to Pro')
      expect(await top(), 'the Pro button moved when the cadence changed').toBe(yearly)
      await choose(page, 'Yearly')
      await expect(proCta(page)).toHaveText('Start 7-day free trial')
      expect(await top(), 'the Pro button did not return').toBe(yearly)
    })
  }
})

test.describe('the comparison head carries the Pro price once the pair has scrolled away', () => {
  for (const width of [1440, 1200]) {
    test(`at ${width} the head sticks under the nav and offers the Pro button for the chosen cadence`, async ({ page }) => {
      watch(page, PERSONA)
      await page.setViewportSize({ width, height: 900 })
      await stubPrices(page)
      await go(page, '/plans')
      await expectRendered(page)
      const head = page.locator('table thead')
      const headPill = head.getByRole('link', { name: /free trial|Upgrade to Pro/ })
      await expect(head.locator('.pl-headlabel')).toHaveText('Pro')
      await expect(headPill, 'the head button is offered before the pair has scrolled away').toHaveCount(0)

      await page.evaluate(() => {
        const t = document.querySelector('table')
        window.scrollTo(0, t.getBoundingClientRect().top + window.scrollY + 400)
      })
      await expect(head.locator('.pl-headlabel')).toHaveText(`Pro · ${money(LIVE.yearly.usd / 12)} a month, billed yearly`)
      await expect(headPill).toHaveAttribute('href', '/checkout?plan=yearly')
      const stuckTop = await head.locator('th').first().evaluate((th) => ({ top: th.getBoundingClientRect().top, css: parseFloat(getComputedStyle(th).top) }))
      expect(Math.abs(stuckTop.top - stuckTop.css), 'the head did not stick under the nav').toBeLessThan(2)

      await page.evaluate(() => window.scrollTo(0, 0))
      await expect(head.locator('.pl-headlabel')).toHaveText('Pro')
      await expect(headPill).toHaveCount(0)
    })
  }
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

  // The closing Choose Pro and the comparison head's button (shown once the pair has scrolled away)
  // are the same destination as the Pro button, so they carry the chosen cadence and open the login popup too.
  test('signed out, the closing Choose Pro and the comparison head button also carry the chosen cadence', async ({ page }) => {
    watch(page, 'a visitor at the end of the page before they have an account')
    await page.setViewportSize({ width: 1440, height: 900 })
    await stubPrices(page)
    await go(page, '/plans')
    await expectRendered(page)

    await expect(page.locator('.hm-close').getByRole('link', { name: 'Choose Pro' })).toHaveAttribute('href', '/checkout?plan=yearly')
    await expect(page.locator('thead a.pl-pill')).toHaveAttribute('href', '/checkout?plan=yearly')
    await choose(page, 'Monthly')
    await expect(page.locator('.hm-close').getByRole('link', { name: 'Choose Pro' })).toHaveAttribute('href', '/checkout?plan=monthly')
    await expect(page.locator('thead a.pl-pill')).toHaveAttribute('href', '/checkout?plan=monthly')

    // Each of them starts the login flow on this page too. Closing the popup
    // leaves the visitor on /plans with nothing started.
    const popup = page.locator('#ui-login-title')
    await page.evaluate(() => window.scrollTo(0, document.querySelector('table').getBoundingClientRect().top + window.scrollY + 400))
    // the head button is offered once the table head has scrolled under the nav
    await page.locator('thead').getByRole('link', { name: /free trial|Upgrade to Pro/ }).click()
    await expect(popup, 'the docked bar button did not open the login popup').toBeVisible()
    await page.keyboard.press('Escape')
    await expect(popup).toHaveCount(0)
    await expect(page).toHaveURL(/\/plans$/)

    await page.locator('.hm-close').getByRole('link', { name: 'Choose Pro' }).click()
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

  test('the Yearly detail names no monthly price when Monthly has none in AUD, and never a USD one', async ({ page }) => {
    watch(page, 'an Australian visitor when Monthly has no AUD price')
    await stubPrices(page, {
      source: { monthly: 'live', yearly: 'live' },
      monthly: { usd: 7 },
      yearly: { usd: 48, aud: 75 },
    })
    await go(page, '/plans')
    await expectRendered(page)

    await expect(pro(page).locator('.pa-amt')).toHaveText('A$6.25')
    await expect(note(page)).toContainText('Free for 7 days, then A$75 a year.')
    await expect(note(page), 'a USD monthly price was set beside an AUD yearly one').not.toContainText(/billed monthly|US\$|A\$7(?!\d)/)
    await expect(page.getByText(/Save d+%/), 'a saving was stated across two currencies').toHaveCount(0)
  })

  test('the Yearly detail names the Monthly price only when both cadences have an AUD price', async ({ page }) => {
    watch(page, 'an Australian visitor when both cadences have an AUD price')
    await stubPrices(page, {
      source: { monthly: 'live', yearly: 'live' },
      monthly: { usd: 7, aud: 11 },
      yearly: { usd: 48, aud: 75 },
    })
    await go(page, '/plans')
    await expectRendered(page)

    await expect(note(page)).toContainText('Free for 7 days, then A$75 a year.')
    await expect(note(page)).toContainText('Monthly is A$11 a month, with no free trial.')
    await expect(note(page), 'the Yearly detail printed a USD figure beside AUD ones').not.toContainText('US$')
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

    await expect(note(page)).toContainText('Free for 7 days, then A$75 a year.')
    await expect(note(page), 'an AUD figure with no live AUD price behind it was named').not.toContainText(/billed monthly|A\$11/)
    await go(page, '/plans?billing=monthly')
    await expectRendered(page)
    await expect(pro(page).locator('.pa-amt')).toHaveText('Unavailable')
    await expect(pro(page).getByRole('link', { name: /Upgrade to Pro|free trial/ })).toHaveCount(0)
  })

  test('the Yearly detail does not name a monthly price the service serves from its fallback table', async ({ page }) => {
    watch(page, 'an Australian visitor when Monthly is only a fallback default')
    await stubPrices(page, {
      source: { monthly: 'fallback', yearly: 'live' },
      monthly: { usd: 7, aud: 11 },
      yearly: { usd: 48, aud: 75 },
    })
    await go(page, '/plans')
    await expectRendered(page)

    await expect(note(page)).toContainText('Free for 7 days, then A$75 a year.')
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

    await expect(pro(page).locator('.pa-amt')).toHaveText('A$11')
    await expect(note(page)).toContainText('Billed monthly. No free trial on Monthly; billing starts today.')
    await expect(pro(page), 'no cross-sell for a cadence that cannot be bought here').not.toContainText('works out at')
  })
})

test.describe('when the price service cannot answer', () => {
  test('the page says so, starts no checkout, and recovers on retry', async ({ page }) => {
    watch(page, 'a visitor on a bad connection')
    await stubPrices(page, { error: 'down' }, 503)
    await go(page, '/plans')
    await expectRendered(page)

    await expect(pro(page).locator('.pa-amt')).toHaveText('Unavailable')
    await expect(pro(page).locator('.pa-amt')).toHaveClass(/pa-amt--word/)
    await expect(pro(page).locator('.pa-per'), 'a cadence is printed beside no price').toHaveCount(0)
    await expect(pro(page).getByRole('link', { name: /Upgrade to Pro|free trial/ }), 'a checkout is offered with no price').toHaveCount(0)
    await expect(pro(page).getByRole('button', { name: 'Pricing unavailable right now' })).toHaveCount(0)
    await expect(pro(page).locator('#pricing-noprice')).toContainText('so no checkout can start')
    await expect(page.getByText(/Save d+%/), 'a saving is claimed with no prices to compute it').toHaveCount(0)
    await expect(page.locator('main a[href*="/checkout"]').filter({ visible: true }), 'a checkout link is visible with no price').toHaveCount(0)

    // Recovery: the service answers on retry, and the offer returns.
    await page.unroute('**/api/get-prices')
    await stubPrices(page)
    await pro(page).getByRole('button', { name: 'Retry live pricing' }).click()
    await expect(pro(page).locator('.pa-amt')).toHaveText(money(LIVE.yearly.usd / 12))
    await expect(proCta(page)).toBeVisible()
  })

  test('with only the Yearly price missing, the note names Yearly rather than Stripe and Monthly still checks out', async ({ page }) => {
    watch(page, 'a visitor when one price is unavailable')
    await stubPrices(page, { source: { monthly: 'live' }, monthly: { usd: LIVE.monthly.usd } })
    await go(page, '/plans')
    await expectRendered(page)

    await expect(pro(page).locator('.pa-amt')).toHaveText('Unavailable')
    const unavailable = pro(page).locator('#pricing-noprice')
    await expect(unavailable).toContainText('No USD price for Yearly')
    await expect(unavailable).toContainText('Monthly can be bought in USD')
    await expect(unavailable, 'the price service answered, so it is not an outage').not.toContainText(/didn.t load/)
    await expect(pro(page).getByRole('button', { name: 'Retry live pricing' }), 'Retry cannot fix a missing price').toHaveCount(0)
    await expect(pro(page).getByRole('button', { name: 'Switch to Monthly' })).toBeVisible()

    await choose(page, 'Monthly')
    await expect(pro(page).locator('.pa-amt')).toHaveText(money(LIVE.monthly.usd))
    await expect(proCta(page)).toHaveText('Upgrade to Pro')
    await expect(pro(page).locator('#pricing-noprice')).toHaveCount(0)
  })
})
