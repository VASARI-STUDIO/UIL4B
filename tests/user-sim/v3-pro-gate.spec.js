// The Pro popup a tool page opens when a Free or signed-out person tries a Pro
// action: one offer dialog at desktop widths, a bottom sheet under 768px.
//
// Behaviour, not pictures: which words are shown, where the pill goes, where
// focus lands and returns, what the sheet's geometry guarantees. Prices and
// day counts are read off the ladder module the popup reads, never typed.
//
// The wall is raised from the palette's colour-system menu (Analogous is a
// Pro system), the one gate every width reaches without extra setup.
import { test, expect } from './base.js'
import { chooseMenuOption, go, signIn, watch } from './helpers.js'
import { withAvailability } from './price-payload.js'
import { openPaletteTools } from './palette-helpers.js'
import { resolvePlanLadder, formatMoney } from '../../src/config/planLadder.js'

test.use({ locale: 'en-US' })

const PRICES = { monthly: { usd: 7 }, yearly: { usd: 48 } }
const LIVE = withAvailability({ source: { monthly: 'live', yearly: 'live' }, ...PRICES })
const LADDER = resolvePlanLadder({ prices: PRICES, currency: 'usd' })
const YEARLY = LADDER.find((p) => p.id === 'yearly')
const MONTHLY = LADDER.find((p) => p.id === 'monthly')

const GATE = 'palette-harmony-system'
const TITLE = /Unlock every colour system/i

const stubPrices = (page, body = LIVE, status = 200) =>
  page.route('**/api/get-prices*', (r) => r.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) }))

async function context(browser, [w, h], opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: 'dark', ...opts })
  const page = await ctx.newPage()
  return { ctx, page }
}

// Raise the colour-system wall at whatever width the page is.
async function raiseWall(page) {
  const width = page.viewportSize().width
  if (width < 768) {
    const tools = await openPaletteTools(page)
    await chooseMenuOption(page, tools.getByRole('button', { name: 'Colour system' }), 'analogous')
  } else {
    const system = page.getByRole('button', { name: 'Colour system' }).first()
    if (!(await system.isVisible())) await page.getByRole('button', { name: /^Extra tools/ }).click()
    await chooseMenuOption(page, system, { label: 'Analogous, Pro' })
  }
  const dialog = page.getByRole('dialog', { name: TITLE })
  await expect(dialog).toBeVisible()
  return dialog
}

async function open(browser, size, { plan = 'free', prices = LIVE, status = 200 } = {}) {
  const { ctx, page } = await context(browser, size)
  watch(page, 'a person hitting the colour-system wall')
  await stubPrices(page, prices, status)
  if (plan) await signIn(page, { plan })
  await go(page, '/create/palette')
  const dialog = await raiseWall(page)
  return { ctx, page, dialog }
}

const pillOf = (dialog) => dialog.locator('.pg-go')
const insideDialog = (page) => page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))
const DESK = [1440, 900]

test.describe('desktop, 1440', () => {
  test('a Free account sees the offer: gate named, lock line, two panes', async ({ browser }) => {
    const { ctx, dialog } = await open(browser, DESK)
    await expect(dialog).toHaveAttribute('data-gate', GATE)
    await expect(dialog).toHaveAttribute('aria-modal', 'true')
    await expect(dialog.locator('[data-pane="system"]')).toBeVisible()
    await expect(dialog.locator('.pg-pane .pg-lock')).toContainText('Analogous is a Pro colour system')
    const box = await dialog.boundingBox()
    expect(Math.round(box.width), 'the two-pane dialog is 880px').toBe(880)
    const pane = await dialog.locator('.pg-pane').boundingBox()
    const main = await dialog.locator('.pg-main').boundingBox()
    expect(pane.x, 'the pane sits left of the offer').toBeLessThan(main.x)
    await expect(dialog.locator('.pg-pane .pg-cap')).toContainText('Also Pro:')
    await ctx.close()
  })

  test('prices, trial and dated stops come from the ladder', async ({ browser }) => {
    const { ctx, dialog } = await open(browser, DESK)
    const perMonth = formatMoney(YEARLY.perMonth, YEARLY.currency, { qualify: true })
    await expect(dialog.locator('[data-layer="yearly"] .pg-amt')).toHaveText(perMonth)
    await expect(dialog.locator('[data-seg="yearly"]')).toContainText(/Save \d+%/)
    await expect(pillOf(dialog)).toHaveText(`Start your ${YEARLY.trialDays}-day free trial`)
    const stops = dialog.locator('[data-layer="yearly"] .pg-stops')
    await expect(stops).toContainText(formatMoney(YEARLY.total, YEARLY.currency, { qualify: true }))
    await expect(stops).toContainText('Nothing more to pay for 12 months')
    expect(await dialog.innerText(), 'the yearly line must never say free').not.toMatch(/12 months[^.]*free/i)
    await ctx.close()
  })

  test('the pill opens /plans with the cadence and the gate, and shows the busy state', async ({ browser }) => {
    const { ctx, page, dialog } = await open(browser, DESK)
    const pill = pillOf(dialog)
    await pill.click()
    await expect(pill).toHaveText('Opening plans…')
    await expect(pill).toHaveAttribute('aria-busy', 'true')
    await expect(pill).toHaveAttribute('aria-disabled', 'true')
    expect(await pill.evaluate((el) => el.disabled), 'a busy pill is never disabled').toBe(false)
    await expect(pill, 'a busy pill keeps focus').toBeFocused()
    await page.waitForURL(/\/plans\?plan=yearly&gate=palette-harmony-system/)
    await ctx.close()
  })

  test('Monthly bills today and goes to /plans with the monthly cadence', async ({ browser }) => {
    const { ctx, page, dialog } = await open(browser, DESK)
    const monthly = dialog.locator('[data-seg="monthly"]')
    await monthly.click()
    await expect(monthly).toHaveAttribute('aria-checked', 'true')
    await expect(dialog.locator('[data-seg="yearly"]')).toHaveAttribute('aria-checked', 'false')
    await expect(dialog.locator('[data-layer="monthly"] .pg-amt')).toHaveText(formatMoney(MONTHLY.perMonth, MONTHLY.currency, { qualify: true }))
    await expect(dialog.locator('[data-layer="monthly"] .pg-stops')).toContainText('Monthly has no trial')
    await expect(pillOf(dialog)).toHaveText(MONTHLY.trialDays > 0 ? `Start your ${MONTHLY.trialDays}-day free trial` : 'Upgrade to Pro')
    await pillOf(dialog).click()
    await page.waitForURL(/\/plans\?plan=monthly&gate=palette-harmony-system/)
    await ctx.close()
  })

  test('the billing switch moves by arrow key and has one tab stop', async ({ browser }) => {
    const { ctx, page, dialog } = await open(browser, DESK)
    const yearly = dialog.locator('[data-seg="yearly"]')
    await yearly.focus()
    await page.keyboard.press('ArrowLeft')
    await expect(dialog.locator('[data-seg="monthly"]')).toHaveAttribute('aria-checked', 'true')
    await expect(dialog.locator('[data-seg="monthly"]')).toBeFocused()
    await expect(yearly).toHaveAttribute('tabindex', '-1')
    await page.keyboard.press('ArrowRight')
    await expect(yearly).toHaveAttribute('aria-checked', 'true')
    await ctx.close()
  })

  test('What Pro adds opens and shuts, and lists the Pro points', async ({ browser }) => {
    const { ctx, dialog } = await open(browser, DESK)
    const fold = dialog.getByRole('button', { name: 'What Pro adds' })
    await expect(fold).toHaveAttribute('aria-expanded', 'false')
    await fold.click()
    await expect(fold).toHaveAttribute('aria-expanded', 'true')
    expect(await dialog.locator('.pg-pts li').count(), 'the fold lists points').toBeGreaterThan(0)
    await fold.click()
    await expect(fold).toHaveAttribute('aria-expanded', 'false')
    await ctx.close()
  })
})

test.describe('closing, focus and the keyboard', () => {
  test('Escape closes the popup and focus is not left inside it', async ({ browser }) => {
    const { ctx, page, dialog } = await open(browser, DESK)
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    expect(await insideDialog(page), 'focus is still inside the closed popup').toBe(false)
    await ctx.close()
  })

  test('a click on the scrim closes it; a click inside does not', async ({ browser }) => {
    const { ctx, page, dialog } = await open(browser, DESK)
    await dialog.locator('.pg-title').click()
    await expect(dialog).toBeVisible()
    await page.mouse.click(8, 8)
    await expect(dialog).toHaveCount(0)
    await ctx.close()
  })

  test('Maybe later closes it', async ({ browser }) => {
    const { ctx, dialog } = await open(browser, DESK)
    await dialog.getByRole('button', { name: 'Maybe later' }).click()
    await expect(dialog).toHaveCount(0)
    await ctx.close()
  })

  test('Tab and Shift+Tab stay inside the popup', async ({ browser }) => {
    const { ctx, page, dialog } = await open(browser, DESK)
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab')
      expect(await insideDialog(page), `Tab ${i + 1} left the popup`).toBe(true)
    }
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Shift+Tab')
      expect(await insideDialog(page), `Shift+Tab ${i + 1} left the popup`).toBe(true)
    }
    await expect(dialog).toBeVisible()
    await ctx.close()
  })

  test('Escape is ignored while the pill is busy', async ({ browser }) => {
    const { ctx, page, dialog } = await open(browser, DESK)
    // /plans is a client route, so hold the code it loads to keep the pill busy.
    await page.route(/\/assets\/(HomePlans|home-plans)-/i, async (route) => { await new Promise((r) => setTimeout(r, 1500)); await route.continue() })
    await pillOf(dialog).click()
    await expect(pillOf(dialog)).toHaveAttribute('aria-busy', 'true')
    await page.keyboard.press('Escape')
    // The key is a discrete event, so a close it started would already show as the fade-out class.
    await expect(page.locator('.pg-layer'), 'Escape started closing a busy popup').not.toHaveClass(/is-closing/)
    await expect(pillOf(dialog)).toHaveAttribute('aria-busy', 'true')
    await ctx.close()
  })
})

test.describe('who is asking, and what the money lines say', () => {
  test('signed out: says what they were about to do, omits the Settings line', async ({ browser }) => {
    const { ctx, dialog } = await open(browser, DESK, { plan: null })
    await expect(dialog.locator('.pg-sub')).toContainText('You were about to build with the Analogous colour system')
    await expect(dialog.locator('.pg-sub')).toContainText('you’ll come back to this page')
    await expect(dialog.locator('.pg-note').filter({ visible: true })).not.toContainText('Cancel any time from Settings')
    await expect(dialog.locator('.pg-link').filter({ visible: true })).toHaveAttribute('href', '/plans')
    await ctx.close()
  })

  test('signed in: the note names Settings and See all plans goes to plain /plans', async ({ browser }) => {
    const { ctx, page, dialog } = await open(browser, DESK)
    await expect(dialog.locator('.pg-note').filter({ visible: true })).toContainText('Cancel any time from Settings.')
    await dialog.getByRole('link', { name: 'See all plans' }).click()
    await page.waitForURL((u) => u.pathname === '/plans' && !u.search.includes('gate='))
    await ctx.close()
  })

  test('prices down: a status line, Try again, no amounts, a way to /plans', async ({ browser }) => {
    const { ctx, dialog } = await open(browser, DESK, { prices: {}, status: 503 })
    await expect(dialog.locator('.pg-out')).toContainText('We couldn’t load current prices just now.')
    await expect(dialog.locator('.pg-out')).toHaveAttribute('role', 'status')
    await expect(pillOf(dialog)).toHaveText('Try again')
    expect(await dialog.locator('.pg-blk').innerText(), 'no amount beside the error').not.toMatch(/[$€£]\s?\d/)
    expect(await dialog.innerText(), 'a raw network error must not reach the screen').not.toMatch(/failed to fetch/i)
    await expect(dialog.getByRole('link', { name: 'See all plans' })).toBeVisible()
    await ctx.close()
  })

  test('prices down then back: Try again fetches again and the offer returns', async ({ browser }) => {
    const { ctx, page, dialog } = await open(browser, DESK, { prices: {}, status: 503 })
    await expect(pillOf(dialog)).toHaveText('Try again')
    await page.unroute('**/api/get-prices*')
    await stubPrices(page)
    await pillOf(dialog).click()
    await expect(pillOf(dialog)).toHaveText(`Start your ${YEARLY.trialDays}-day free trial`)
    await expect(dialog.locator('.pg-out')).toHaveText('')
    await ctx.close()
  })

  test('reduced motion: the popup enters on opacity alone', async ({ browser }) => {
    const { ctx, page } = await context(browser, DESK, { reducedMotion: 'reduce' })
    await stubPrices(page)
    await signIn(page, { plan: 'free' })
    await go(page, '/create/palette')
    const dialog = await raiseWall(page)
    const name = await dialog.evaluate((el) => getComputedStyle(el).animationName)
    expect(name, 'reduced motion uses the fade, not the slide').toBe('pg-fade')
    await ctx.close()
  })
})

// Under 768px the same dialog is a bottom sheet.
for (const size of [[390, 844], [320, 568]]) {
  const [w, h] = size
  test.describe(`phone sheet, ${w}x${h}`, () => {
    test('sits on the bottom edge, under the 64px ceiling gap, with the foot in view', async ({ browser }) => {
      const { ctx, dialog } = await open(browser, size)
      await dialog.locator('.pg-ft').waitFor()
      await expect.poll(async () => { const b = await dialog.boundingBox(); return Math.round(b.y + b.height) }, { message: 'the sheet rests on the bottom edge' }).toBe(h)
      const box = await dialog.boundingBox()
      expect(box.height, 'the sheet leaves 64px above it').toBeLessThanOrEqual(h - 64 + 1)
      expect(Math.round(box.width), 'the sheet is the full width').toBe(w)
      const foot = await dialog.locator('.pg-ft').boundingBox()
      expect(foot.y + foot.height, 'the foot is inside the screen').toBeLessThanOrEqual(h + 1)
      await ctx.close()
    })

    test('every control is at least 44px tall and nothing scrolls sideways', async ({ browser }) => {
      const { ctx, dialog } = await open(browser, size)
      const targets = [
        dialog.locator('.pg-go'), dialog.locator('.pg-later'), dialog.locator('.pg-x'),
        dialog.locator('[data-seg="yearly"]'), dialog.locator('[data-seg="monthly"]'),
        dialog.locator('.pg-fold-btn'), dialog.locator('.pg-link').filter({ visible: true }),
      ]
      for (const t of targets) {
        const b = await t.boundingBox()
        expect(b.height, `${await t.getAttribute('class') || 'target'} height`).toBeGreaterThanOrEqual(43.5)
      }
      const over = await dialog.evaluate((el) => el.scrollWidth - el.clientWidth)
      expect(over, 'the sheet must not scroll sideways').toBeLessThanOrEqual(0)
      await ctx.close()
    })

    test('the pill still opens /plans with the gate', async ({ browser }) => {
      const { ctx, page, dialog } = await open(browser, size)
      await pillOf(dialog).click()
      await page.waitForURL(/\/plans\?plan=yearly&gate=palette-harmony-system/)
      await ctx.close()
    })

    test('the sheet contains its own scroll (overscroll) and Escape closes it', async ({ browser }) => {
      const { ctx, page, dialog } = await open(browser, size)
      const oc = await dialog.evaluate((el) => {
        const own = [el, ...el.querySelectorAll('*')].filter((n) => { const o = getComputedStyle(n).overflowY; return o === 'auto' || o === 'scroll' })
        return own.length ? own.map((n) => getComputedStyle(n).overscrollBehaviorY) : ['none-scrolling']
      })
      expect(oc.every((v) => v === 'contain' || v === 'none-scrolling'), `overscroll ${oc.join(',')}`).toBe(true)
      await page.keyboard.press('Escape')
      await expect(dialog).toHaveCount(0)
      await ctx.close()
    })
  })
}

test('a page tap above the sheet closes it', async ({ browser }) => {
  const { ctx, page, dialog } = await open(browser, [390, 844])
  await page.mouse.click(195, 20)
  await expect(dialog).toHaveCount(0)
  await ctx.close()
})
