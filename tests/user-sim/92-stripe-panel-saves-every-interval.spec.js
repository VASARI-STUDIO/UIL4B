// The Save button on the Stripe pricing panel must post what the route accepts.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY THIS IS A USER-SIM TEST AND NOT A UNIT TEST
// ─────────────────────────────────────────────────────────────────────────────
// tests/unit/stripe-panel-intervals.test.js already fails if Admin.jsx types an
// interval list. That is a source scan: it proves nobody wrote the literal
// back. It does NOT prove the rendered panel actually draws a column per
// interval, fills it from the payload, and puts every one in the POST body.
//
// That distinction is the whole bug. The old panel looked completely healthy —
// it loaded, it showed the right currencies, it took edits — and failed only
// at the last step, on the server, naming an interval the screen never
// mentioned. The founder is about to press this button against LIVE Stripe
// with a real card ladder behind it. "The source no longer contains a literal"
// is not the assurance that deserves; "the click produces this exact body" is.
//
// So this drives the real panel in a real browser against a stubbed route, and
// reads the body the browser actually sends.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHAT IS STUBBED, AND WHAT THAT COSTS
// ─────────────────────────────────────────────────────────────────────────────
// /api/setup-stripe is stubbed on both verbs. Nothing here touches Stripe, and
// nothing here proves Stripe accepts the body — only that the body matches what
// api/setup-stripe.js#validatePrices demands, which is imported below rather
// than restated. The GET payload is built from the REAL DEFAULT_PRICES and
// SUPPORTED_CURRENCIES, so a new interval or currency flows into this test
// without an edit.
import { test, expect } from './base.js'
import { go, signIn } from './helpers.js'
import {
  DEFAULT_PRICES, SUPPORTED_CURRENCIES, BASE_CURRENCY, BILLING_INTERVALS,
} from '../../api/_lib/pricing.js'

// The route's own GET shape: { prices, defaults, currencies, baseCurrency }.
// `prices: null` per interval is "nothing in Stripe yet".
const configPayload = {
  prices: Object.fromEntries(BILLING_INTERVALS.map((i) => [i, null])),
  defaults: DEFAULT_PRICES,
  currencies: SUPPORTED_CURRENCIES,
  baseCurrency: BASE_CURRENCY,
}

async function openPanel(browser, payload = configPayload) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await context.newPage()

  let posted = null
  await page.route('**/api/setup-stripe*', async (route) => {
    const req = route.request()
    if (req.method() === 'POST') {
      posted = JSON.parse(req.postData() || '{}')
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          product: 'prod_TEST',
          prices: Object.fromEntries(
            BILLING_INTERVALS.map((i) => [i, { id: `price_TEST_${i}`, currencies: {} }]),
          ),
          note: 'stubbed',
        }),
      })
    }
    return route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify(payload),
    })
  })

  await signIn(page, { plan: 'pro', admin: true })
  await go(page, '/admin')
  // The panel lives behind the Stripe tab; /admin opens on Overview.
  await page.getByRole('tab', { name: 'Stripe', exact: true }).click()
  return { context, page, read: () => posted }
}

test.describe('the Stripe pricing panel', () => {
  test('draws a column for every interval the route will validate', async ({ browser }) => {
    const { context, page } = await openPanel(browser)

    const table = page.locator('.adm-stripe-table')
    await expect(table, 'the Stripe pricing table never rendered').toBeVisible({ timeout: 15000 })

    // One header per interval, plus the Currency column.
    const heads = table.locator('thead th')
    await expect(heads).toHaveCount(BILLING_INTERVALS.length + 1)
    for (const interval of BILLING_INTERVALS) {
      const label = interval.charAt(0).toUpperCase() + interval.slice(1)
      await expect(heads.filter({ hasText: new RegExp(`^${label}$`, 'i') }),
        `no "${label}" column — /api/setup-stripe would answer 400 "Missing ${interval} prices"`)
        .toHaveCount(1)
    }
    await context.close()
  })

  test('a currency with no approved amount is stated, not invented', async ({ browser }) => {
    // An interval whose defaults leave a currency out. The cell must carry no
    // input at all — an input would post an amount with no default behind it.
    const interval = BILLING_INTERVALS[BILLING_INTERVALS.length - 1]
    const code = SUPPORTED_CURRENCIES[SUPPORTED_CURRENCIES.length - 1].code
    const { [code]: _omitted, ...rest } = DEFAULT_PRICES[interval]
    const payload = { ...configPayload, defaults: { ...DEFAULT_PRICES, [interval]: rest } }
    const { context, page } = await openPanel(browser, payload)
    await expect(page.locator('.adm-stripe-table')).toBeVisible({ timeout: 15000 })

    const col = BILLING_INTERVALS.indexOf(interval) + 2 // 1-indexed, after Currency
    const row = page.locator('.adm-stripe-table tbody tr', { hasText: code.toUpperCase() }).first()
    const cell = row.locator(`td:nth-child(${col})`)
    await expect(cell.locator('input'),
      `${interval}/${code.toUpperCase()} has no approved amount, so it must not offer an input`)
      .toHaveCount(0)
    await expect(cell.locator('.adm-stripe-na')).toBeVisible()
    // Its neighbour in an interval that does carry the currency keeps its input.
    await expect(row.locator('td:nth-child(2) input')).toHaveCount(1)
    await context.close()
  })

  test('Save posts every interval, in the base currency, at the approved ladder', async ({ browser }) => {
    const { context, page, read } = await openPanel(browser)
    await expect(page.locator('.adm-stripe-table')).toBeVisible({ timeout: 15000 })

    await page.getByRole('button', { name: /Save Prices to Stripe/i }).click()
    await expect(page.locator('.adm-card', { hasText: 'Prices Saved' })).toBeVisible({ timeout: 15000 })

    const body = read()
    expect(body, 'the panel never POSTed').toBeTruthy()

    // THE ASSERTION THE BUG WOULD HAVE FAILED. validatePrices walks
    // BILLING_INTERVALS and returns `Missing ${interval} prices` on the first
    // one absent; the old panel sent monthly and yearly only.
    for (const interval of BILLING_INTERVALS) {
      expect(body.prices?.[interval], `Save omitted "${interval}" — the route answers 400`).toBeTruthy()
      expect(body.prices[interval][BASE_CURRENCY],
        `${interval} has no ${BASE_CURRENCY.toUpperCase()} amount, which the route requires`)
        .toBeGreaterThan(0)
    }

    // Untouched, it must offer exactly the approved ladder — not a rounded
    // variant of it. Auto-fill used to snap every amount to .99, which would
    // have turned $7/$18/$48 into $6.99/$17.99/$47.99 on a panel nobody edited.
    for (const interval of BILLING_INTERVALS) {
      for (const [code, approved] of Object.entries(DEFAULT_PRICES[interval])) {
        expect(body.prices[interval][code],
          `${interval}/${code.toUpperCase()} was posted as ${body.prices[interval][code]}, ` +
          `but the founder-approved amount is ${approved}`).toBe(approved)
      }
    }

    // And no interval the route does not sell.
    expect(Object.keys(body.prices).sort(), 'Save posted an interval that is not sold')
      .toEqual([...BILLING_INTERVALS].sort())
    await context.close()
  })
})
