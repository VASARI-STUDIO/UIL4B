// THE FLOW AUDIT, 2026-09-09 — six journeys a real person takes, rendered.
//
// The founder's standing ask is that every flow "feels intentional" and that
// the value is visible before anything is asked for. 57-signed-in-session and
// the 58-flows files reach each surface; this file walks the SEAMS between
// them — the moment a refusal, a gate, a modal or a confirmation answers the
// person — at 390 and 1280, in both themes where paint matters, and by
// keyboard where a keyboard user would be stranded.
//
// ── WHAT THIS FILE FOUND AND FIXED, so each test has its reason ─────────────
//
//   Flow 2, the cap on /projects: the refusal came back as the SUCCESS toast —
//     green tick, 1.8 seconds, no link — and the form stayed open as if
//     nothing had been decided. It now stays under the field it refused, in
//     ProjectContext's words, with the way forward as a link.
//   Flow 2, the Pro modal with the price service down: "FROM $4 /month" was
//     painted directly above "We couldn't load current prices just now". The
//     element had `hidden`, and .ui-pro-from's display:flex beat it. It is no
//     longer rendered at all in that state.
//   Flow 1/2, the two /projects dialogs: Escape worked, focus did not — a
//     keyboard user closing "New project" or a project's detail sheet landed
//     on <body>. Both now use the shared modal hook.
//   Flow 5, the display-name edit: Enter did nothing; the only way to commit
//     was the mouse. Enter saves, Escape cancels.
//   Flow 5, the delete confirmation: opening it unmounted the button that had
//     focus, so focus fell to <body>, and "Permanently delete" was live with an
//     empty password. Focus now lands on the password field and the button
//     waits for one.
//   Flow 2, the return page's error state: "Try again" → /checkout, which
//     without ?plan renders "Invalid checkout selection". It is "Back to
//     Plans" → /plans now.
//   Flow 2, the Pro modal on a phone: the proof rail (~500px of strips) sat
//     between the head and the price, so the price-service error and both its
//     buttons began 520px below the bottom of a 320×568 screen. Below 780px
//     the body now paints above the rail, with a 24px trim at ≤480.
//
// ── MUTATION, at the call site, each seen red before it was trusted ─────────
//
//   M1  Projects.jsx   setSaveError(e.message)      → toast(e.message)   flow 2 red
//   M2  ProUpgradeModal {!priceUnavailable && (<p>)} → hidden attribute   flow 2 red
//   M3  Projects.jsx   useModalDialog(onClose, …)   → removed             flow 1 red
//   M4  Settings.jsx   onKeyDown={onFieldKey}       → options-only        flow 5 red
//   M5  Settings.jsx   (input || panel)?.focus()    → removed             flow 5 red
//   M6  Settings.jsx   disabled={busy||needsPassword} → disabled={busy}   flow 5 red
//   M7  CheckoutReturn subscriptionActive !== true  → false               flow 2 red
//   M8  CheckoutReturn to="/plans" Back to Plans    → to="/checkout"      flow 2 red
//   M9  global.css     areas "head" "body" "rail"   → "head" "rail" "body" flow 2 red, all 6 phone cases
//   M10 global.css     the ≤480 trim                → removed             flow 2 red, the 320×568 pair only
//
//   Every file restored byte-exact by hash; the whole file green after each.
//
// Everything numeric is imported from the config that enforces it; nothing
// here types a price, a cap or a route.
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'
import { FREE_SAVE_LIMITS } from '../../src/config/plans.js'
import { resolvePlanLadder, cheapestPerMonth } from '../../src/config/planLadder.js'
import { EXPORT_FORMATS } from '../../src/config/exportFormats.js'
import { FIRST_WINS } from '../../src/utils/firstWin.js'

const CAP = FREE_SAVE_LIMITS.projects
const WIDTHS = [[390, 844], [1280, 800]]
const THEMES = ['light', 'dark']

/** A context at one width, in one theme, the way 39-accent-contrast sets it. */
async function open(browser, [w, h], theme = 'light') {
  const context = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: theme })
  await context.addInitScript((t) => { try { localStorage.setItem('vs-t', t) } catch { /* private mode */ } }, theme)
  const page = await context.newPage()
  return { context, page }
}

const focused = (page) => page.evaluate(() => {
  const el = document.activeElement
  return el ? `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}[${el.getAttribute('aria-label') || el.textContent?.trim().slice(0, 30) || ''}]` : 'none'
})

// ─────────────────────────────────────────────────────────────────────────────
// FLOW 1 — first visit → first result → the ask → keep it
// ─────────────────────────────────────────────────────────────────────────────
test.describe('flow 1 — the sign-in gate, at the moment of saving', () => {
  for (const size of WIDTHS) for (const theme of THEMES) {
    test(`${size[0]}px ${theme}: the gate names the action, focuses the fast path, and Escape hands focus back`, async ({ browser }) => {
      const { context, page } = await open(browser, size, theme)
      watch(page, `a stranger saving their first palette (${size[0]}px, ${theme})`)
      await go(page, '/create/palette')

      // The VALUE is on screen before the ask: a real palette, not a pitch.
      expect(await page.locator('.plb-col').count(), 'the palette must be visible before the gate').toBeGreaterThanOrEqual(3)

      // Keyboard-only: the control is reached and pressed without a pointer.
      // THE GATE MOVED, 2026-09-15, and this test moved with it rather than
      // being relaxed. "Save / export" used to ask before the menu would open —
      // but that menu also holds Copy link, Copy CSS variables and Copy hex
      // values, so copying was gated on this one surface while the board's own
      // Copy worked signed out. Copying is free forever; the account is asked
      // for at the things that keep or produce something. So the opener now
      // opens, and Save inside it is what asks.
      const opener = page.locator('button[aria-label="Save / export"]')
      await opener.focus()
      await page.keyboard.press('Enter')

      // Still keyboard-only: Tab to Save inside the menu and press it.
      const save = page.locator('.plb-savemenu').getByRole('button', { name: 'Save', exact: true })
      await expect(save, 'the save menu did not open').toBeVisible()
      await save.focus()
      await page.keyboard.press('Enter')

      // "Create your free account", not "Log in to continue": everyone who
      // reaches this has no account, which is why it fired.
      const dialog = page.getByRole('dialog', { name: /Create your free account/i })
      await expect(dialog).toBeVisible()
      // Says WHAT was interrupted and WHAT HAPPENS NEXT, in that order.
      await expect(dialog).toContainText(/about to save this palette/i)
      await expect(dialog).toContainText(/hands you straight back to it/i)
      // The fast path has focus the moment it opens.
      expect(await focused(page), 'focus must land on the one-click path').toMatch(/Continue with Google/)

      await page.keyboard.press('Escape')
      await expect(dialog).toHaveCount(0)
      // The restore lands a frame after the close (#436 follow-up 8), so poll.
      //
      // "Save", not "Save / export": the gate moved onto the save action on
      // 2026-09-15, so Save is now what opened the dialog and Save is what must
      // get focus back. The PRINCIPLE this line tests is unchanged and is still
      // the point — focus returns to whatever raised the interruption — only the
      // control that raises it has moved.
      await expect.poll(() => focused(page), 'closing must return focus to what opened it').toMatch(/Save/)
      // …and nothing was taken away.
      expect(await page.locator('.plb-col').count()).toBeGreaterThanOrEqual(3)
      await context.close()
    })
  }
})

test.describe('flow 1 — keeping it: the first project, by keyboard', () => {
  for (const size of WIDTHS) {
    test(`${size[0]}px: New project opens by keyboard, Enter creates it, Escape returns focus`, async ({ browser }) => {
      const { context, page } = await open(browser, size)
      watch(page, `a new account making its first project (${size[0]}px)`)
      await signIn(page, { plan: 'free', projects: 0 })
      await go(page, '/projects')

      // WHAT A NEW ACCOUNT ACTUALLY SEES — AND IT IS NOT WHAT IT WAS.
      //
      // This assertion used to read the other way round: ProjectContext seeded
      // a "Default Project" into any account that had none, so the empty state
      // was unreachable signed in and the seed had already spent one of the
      // three free slots. It was recorded here as a fact and put to the founder
      // in #436's PR, because the decision was his. He answered on 2026-09-10:
      // drop the seed. So a new account starts genuinely empty, the empty state
      // is the first thing it sees, and no card exists that nobody made.
      // tests/user-sim/73-founder-calls-0910.spec.js holds the whole of it.
      await expect(page.locator('.uh-grid .proj-card', { hasText: 'Default Project' })).toHaveCount(0)
      await expect(page.getByRole('button', { name: 'Create your first project' })).toHaveCount(1)

      const opener = page.getByRole('button', { name: 'New Project' })
      await opener.focus()
      await page.keyboard.press('Enter')
      const dialog = page.getByRole('dialog', { name: 'New project' })
      await expect(dialog).toBeVisible()
      expect(await focused(page), 'the name field takes focus').toMatch(/^input#proj-new-name/)

      // Way back first: Escape closes and returns focus to the opener.
      await page.keyboard.press('Escape')
      await expect(dialog).toHaveCount(0)
      await expect.poll(() => focused(page), 'Escape must hand focus back to the opener').toMatch(/New Project/)

      // Then the way through.
      await page.keyboard.press('Enter')
      await expect(dialog).toBeVisible()
      await page.keyboard.type('Brand v1')
      await page.keyboard.press('Enter')
      await expect(dialog).toHaveCount(0)
      await expect(page.locator('.toast.show')).toContainText('Created "Brand v1"')
      await expect(page.locator('.uh-grid .proj-card', { hasText: 'Brand v1' })).toHaveCount(1)
      await context.close()
    })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// FLOW 2 — the free cap → Pro → checkout return
// ─────────────────────────────────────────────────────────────────────────────
test.describe('flow 2 — the cap refuses in place, not in a vanishing toast', () => {
  async function saveCurrent(page, name) {
    await page.getByRole('button', { name: 'Save Current' }).click()
    await page.getByPlaceholder(/Brand v1/i).fill(name)
    await page.getByRole('button', { name: 'Save', exact: true }).click()
  }

  for (const size of WIDTHS) {
    test(`${size[0]}px: the ${CAP + 1}th save is refused under the field, in the product's words, with a way forward`, async ({ browser }) => {
      const { context, page } = await open(browser, size)
      watch(page, `a free account at the cap (${size[0]}px)`)
      const account = await signIn(page, { plan: 'free', projects: CAP })
      await go(page, '/projects')
      await saveCurrent(page, 'One Too Many')

      const refusal = page.getByTestId('project-save-refusal')
      await expect(refusal).toBeVisible()
      await expect(refusal).toContainText(`Free plan saves up to ${CAP} projects`)
      await expect(refusal.getByRole('link', { name: 'See what Pro adds' })).toHaveAttribute('href', '/plans')
      // Not a success. The tick must not be drawn over a refusal.
      await expect(page.locator('.toast-success.show')).toHaveCount(0)
      // And it STAYS. The toast this replaced was gone in 1.8 seconds.
      await page.waitForTimeout(2500)
      await expect(refusal, 'the refusal must outlive a toast').toBeVisible()
      // The form is still there to act on, name intact.
      await expect(page.getByPlaceholder(/Brand v1/i)).toHaveValue('One Too Many')

      const stored = await page.evaluate(
        (email) => JSON.parse(localStorage.getItem('vs-projects') || '{}')[email]?.length ?? -1,
        account.email,
      )
      expect(stored, 'nothing may be written once the cap is reached').toBe(CAP)

      // Cancel clears it, so a stale refusal cannot greet the next attempt.
      await page.getByRole('button', { name: 'Cancel', exact: true }).click()
      await expect(refusal).toHaveCount(0)
      await context.close()
    })
  }

  test('one under the cap saves and says so — the control', async ({ browser }) => {
    const { context, page } = await open(browser, WIDTHS[1])
    watch(page, 'a free account with a slot to spare')
    await signIn(page, { plan: 'free', projects: CAP - 1 })
    await go(page, '/projects')
    await saveCurrent(page, 'Room To Spare')
    await expect(page.getByTestId('project-save-refusal')).toHaveCount(0)
    await expect(page.locator('.toast-success.show')).toContainText('Saved "Room To Spare"')
    await context.close()
  })

  test('the New project dialog is refused the same way, and stays open to act on', async ({ browser }) => {
    const { context, page } = await open(browser, WIDTHS[1])
    watch(page, 'a free account at the cap using New Project')
    await signIn(page, { plan: 'free', projects: CAP })
    await go(page, '/projects')
    await page.getByRole('button', { name: 'New Project' }).click()
    const dialog = page.getByRole('dialog', { name: 'New project' })
    await page.locator('#proj-new-name').fill('Fourth')
    await page.getByRole('button', { name: 'Create project' }).click()

    const refusal = page.getByTestId('project-create-refusal')
    await expect(refusal).toBeVisible()
    await expect(refusal).toContainText(`Free plan saves up to ${CAP} projects`)
    await expect(dialog, 'the dialog must not close over its own refusal').toBeVisible()
    await expect(page.locator('.toast-success.show')).toHaveCount(0)
    await context.close()
  })
})

test.describe('flow 2 — the Pro modal tells the truth about money', () => {
  // The book's wall, which every width and both plans can reach from the
  // nav at 1280. (At 390 the nav's Export button is display:none and the
  // panel has no other entry — recorded in the PR, not asserted here.)
  async function raiseWall(page) {
    await page.getByRole('button', { name: 'Export', exact: true }).first().click()
    await page.getByRole('radio', { name: /Design system book/i }).click()
    await page.getByRole('button', { name: /Unlock with Pro/i }).click()
    const modal = page.getByRole('dialog', { name: /Export the design system book/i })
    await expect(modal).toBeVisible()
    return modal
  }

  for (const theme of THEMES) {
    test(`${theme}: with the price service down, no amount is shown beside the error`, async ({ browser }) => {
      const { context, page } = await open(browser, WIDTHS[1], theme)
      watch(page, `a free account hitting a wall while prices are down (${theme})`)
      await page.route('**/api/get-prices*', (r) => r.fulfill({ status: 503, contentType: 'application/json', body: '{}' }))
      await signIn(page, { plan: 'free' })
      await go(page, '/create/palette')
      const modal = await raiseWall(page)

      await expect(modal.locator('.ui-pro-plans-err')).toContainText(/couldn.t load current prices/i)
      // No "from $X/month" — rendered, hidden, or otherwise. The element was
      // deleted outright on 2026-09-15 (it repeated the cheapest plan row a few
      // centimetres below it), so this now guards against its REINTRODUCTION:
      // a headline rate outside the `priceUnavailable` branch is exactly how a
      // fallback price painted on top of this error block twice before.
      await expect(modal.locator('.ui-pro-from')).toHaveCount(0)
      expect(await modal.locator('.ui-pro-body').innerText(), 'no currency amount may appear beside the error')
        .not.toMatch(/[$€£]\s?\d/)
      // No CTA that makes an offer we cannot price; the way out is still there.
      await expect(modal.getByRole('button', { name: 'Upgrade to Pro' })).toHaveCount(0)
      await expect(modal.getByRole('button', { name: 'Try again' })).toBeVisible()
      await context.close()
    })
  }

  // THE PHONE. The wall a free account meets most often on a phone is the
  // palette's colour-system menu (the nav's Export button is hidden there), so
  // this is measured from that gate. Before the fix the single column read
  // head → proof rail → body, and the rail is ~500px of strips at phone
  // widths: the price-service error and both its buttons sat 290–520px below
  // the bottom of a 320–430px screen, in a sheet that scrolled but gave no
  // sign it needed to. The body now paints above the rail below 780px.
  for (const [w, h] of [[320, 568], [390, 844], [430, 932]]) for (const theme of THEMES) {
    test(`${w}×${h} ${theme}: from the palette's colour-system gate, the price error and its buttons are on the first screen`, async ({ browser }) => {
      const { context, page } = await open(browser, [w, h], theme)
      watch(page, `a free account on a phone hitting the colour-system wall while prices are down (${w}px, ${theme})`)
      await page.route('**/api/get-prices*', (r) => r.fulfill({ status: 503, contentType: 'application/json', body: '{}' }))
      await signIn(page, { plan: 'free' })
      await go(page, '/create/palette')
      await page.locator('button', { hasText: /SYSTEM/i }).first().click()
      // Keyboard activation on purpose: at 390 the palette's sticky adjust
      // footer intercepts pointer events over this menu (a PaletteBuilder
      // finding, in the PR). Enter on the focused item is the real keyboard path.
      const locked = page.locator('.plb-harmmenu button', { hasText: /Analogous/i }).first()
      await locked.focus()
      await page.keyboard.press('Enter')
      const modal = page.getByRole('dialog', { name: /Unlock every colour system/i })
      await expect(modal).toBeVisible()
      const err = modal.locator('.ui-pro-plans-err')
      await expect(err).toBeVisible()
      // The sheet is its own scroll box, so "on the first screen" means inside
      // the sheet's visible box at scrollTop 0 — not merely inside the
      // viewport, which the sheet's fade edge and bottom border sit inside.
      const sheet = await modal.evaluate((el) => { const r = el.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, scrollTop: el.scrollTop } })
      expect(sheet.scrollTop, 'measured before anyone scrolled').toBe(0)
      const box = await err.evaluate((el) => { const r = el.getBoundingClientRect(); return { top: r.top, bottom: r.bottom } })
      expect(box.top, 'the error block must start inside the sheet').toBeGreaterThanOrEqual(sheet.top)
      expect(box.bottom, `the error block must end inside the sheet on a ${h}px screen, without scrolling`).toBeLessThanOrEqual(sheet.bottom)
      // Both ways out are on that first screen too, whole.
      for (const name of ['Try again', 'See all plans']) {
        const b = modal.getByRole('button', { name })
        await expect(b).toBeVisible()
        const bb = await b.boundingBox()
        expect(bb.y + bb.height, `${name} must be whole without scrolling`).toBeLessThanOrEqual(sheet.bottom)
      }
      await context.close()
    })
  }

  test('with prices up, every amount is the ladder\'s, and declining returns focus', async ({ browser }) => {
    const { context, page } = await open(browser, WIDTHS[1])
    watch(page, 'a free account reading the Pro offer')
    const prices = { monthly: { usd: 7 }, yearly: { usd: 48 } }
    await page.route('**/api/get-prices*', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(prices) }))
    await signIn(page, { plan: 'free' })
    await go(page, '/create/palette')
    const modal = await raiseWall(page)

    const ladder = resolvePlanLadder({ prices, currency: 'usd' })
    const headline = cheapestPerMonth(ladder)
    const yearly = ladder.find((p) => p.id === 'yearly')
    const monthly = ladder.find((p) => p.id === 'monthly')

    // Each purchasable row: per-month, total and cadence from the same module.
    for (const plan of [monthly, yearly]) {
      const tile = modal.locator('.ui-pro-plan', { hasText: plan.label })
      await expect(tile).toContainText(plan.perMonthLabel)
      await expect(tile).toContainText(`${plan.totalLabel} ${plan.cadence}`)
    }

    // THE TRIAL IS ON EVERY CADENCE THAT CARRIES ONE — counted off the ladder,
    // not assumed to be one.
    //
    // This asserted toHaveCount(1) and passed for the wrong reason: the ladder
    // lists monthly, quarterly, yearly, and PLAN_LADDER.find(trialDays > 0)
    // returns QUARTERLY, whose 7 days happen to equal yearly's. Only yearly
    // rendered, because quarterly has no checkoutPlan yet — so a test about
    // "the tier that carries the trial" was reading quarterly's number off
    // yearly's chip. The day the founder adds the Stripe price and quarterly
    // becomes purchasable, the count becomes 2 and this goes red for a change
    // that is entirely correct.
    const trialPlans = ladder.filter((pl) => pl.purchasable && pl.trialDays > 0)
    await expect(modal.locator('.ui-pro-plan-trial')).toHaveCount(trialPlans.length)
    for (const plan of trialPlans) {
      const row = modal.locator('.ui-pro-plan', { hasText: plan.label })
      await expect(row.locator('.ui-pro-plan-trial')).toContainText(`${plan.trialDays}-day free trial`)
    }
    // ...and a cadence that bills today says nothing about a trial.
    for (const plan of ladder.filter((pl) => pl.purchasable && !pl.trialDays)) {
      const row = modal.locator('.ui-pro-plan', { hasText: plan.label })
      await expect(row.locator('.ui-pro-plan-trial')).toHaveCount(0)
    }

    // The steps say the day money moves, with the real total, for whichever
    // plan is selected — which is the cheapest per month, i.e. the headline.
    const chosen = ladder.find((pl) => pl.id === headline.id)
    if (chosen.trialDays > 0) {
      await expect(modal.locator('.ui-pro-steps')).toContainText(`Day ${chosen.trialDays}`)
    }
    await expect(modal.locator('.ui-pro-steps')).toContainText(chosen.totalLabel)

    // THE CTA NAMES THE TRIAL. The founder asked for it to be more obvious than
    // a line of small print, and the button is the last thing read before the
    // decision. A cadence with no trial must NOT say it.
    const cta = modal.locator('.ui-pro-cta .btn').first()
    await expect(cta).toHaveText(
      chosen.trialDays > 0 ? `Start your ${chosen.trialDays}-day free trial` : 'Upgrade to Pro',
    )

    // Declining is a real button and it hands focus back to the wall's opener.
    await modal.getByRole('button', { name: 'Maybe later' }).click()
    await expect(modal).toHaveCount(0)
    await expect.poll(() => focused(page), 'Maybe later must return focus to the Unlock button').toMatch(/Unlock with Pro/)
    await context.close()
  })
})

test.describe('flow 2 — the checkout return page', () => {
  const stub = (page, body) => page.route('**/api/checkout-status*', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) }))

  for (const size of WIDTHS) {
    test(`${size[0]}px: an active subscription is confirmed, with the next step and the reference`, async ({ browser }) => {
      const { context, page } = await open(browser, size)
      watch(page, `a new subscriber back from Stripe (${size[0]}px)`)
      await signIn(page, { plan: 'pro' })
      await stub(page, { status: 'complete', mode: 'subscription', subscriptionActive: true, customerEmail: 'pro.user@uil4b.test' })
      await go(page, '/checkout/return?session_id=cs_test_flow_audit')

      const card = page.locator('.checkout-return-card')
      await expect(card.getByRole('heading')).toContainText(/on UIL4B Pro/i)
      await expect(card).toContainText('pro.user@uil4b.test')
      await expect(card).toContainText('cs_test_flow_audit')
      await expect(card.getByRole('link', { name: 'Start building' })).toHaveAttribute('href', '/projects')
      await expect(card.getByRole('link', { name: 'Manage subscription' })).toHaveAttribute('href', '/settings')
      await context.close()
    })
  }

  test('a payment whose access has not attached yet is NOT told it is on Pro', async ({ browser }) => {
    const { context, page } = await open(browser, WIDTHS[1])
    watch(page, 'a subscriber whose webhook is late')
    await signIn(page, { plan: 'free' })
    await stub(page, { status: 'complete', mode: 'subscription', subscriptionActive: false, customerEmail: 'free.user@uil4b.test' })
    await go(page, '/checkout/return?session_id=cs_test_pending')

    const card = page.locator('.checkout-return-card')
    await expect(card.getByRole('heading')).toContainText('Payment received')
    await expect(card).toContainText(/still being attached/i)
    await expect(card, 'must not claim an active subscription it cannot see').not.toContainText(/subscription is active/i)
    await context.close()
  })

  test('arriving without a session is an error state with a way back, not a spinner', async ({ browser }) => {
    const { context, page } = await open(browser, WIDTHS[0])
    watch(page, 'someone who landed on /checkout/return by hand')
    await signIn(page, { plan: 'free' })
    await go(page, '/checkout/return')
    const card = page.locator('.checkout-return-card')
    await expect(card.getByRole('heading')).toContainText(/couldn.t confirm/i)
    await expect(card.locator('.checkout-spinner')).toHaveCount(0)
    // The way forward goes where a plan is chosen. It used to be "Try again"
    // → /checkout, and /checkout without ?plan says "Invalid checkout
    // selection — choose Monthly or Yearly from Plans": a retry that landed
    // on a page calling the retry invalid.
    await expect(card.getByRole('link', { name: 'Back to Plans' })).toHaveAttribute('href', '/plans')
    await expect(card.getByRole('link', { name: 'Try again' })).toHaveCount(0)
    await expect(card.getByRole('link', { name: 'Back to settings' })).toHaveAttribute('href', '/settings')
    await context.close()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// FLOW 3 — Brand Starter → the real tools (extends #429's fixture test)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('flow 3 — a generated starter touches nothing until asked, on the real route', () => {
  // 57-brand-starter proves this on a mounted fixture; this is the same
  // promise on /create/auto-builder itself, read from the working design the
  // tools actually edit (vs-current-design) rather than from a fixture slot.
  const STARTER = {
    name: 'Quiet Schedule',
    rationale: 'Calm and practical.',
    palette: [
      { role: 'Background', hex: '#FFFFFF' }, { role: 'Surface', hex: '#F4F5F7' }, { role: 'Text', hex: '#14161A' },
      { role: 'Primary', hex: '#1F5F9E' }, { role: 'Accent', hex: '#C2643B' },
    ],
    fonts: { heading: { family: 'Manrope', weight: 700, category: 'sans-serif' }, body: { family: 'Lora', weight: 400, category: 'serif' } },
    typeScale: { base: 17, ratio: 1.25 },
  }

  for (const size of WIDTHS) {
    test(`${size[0]}px: the working design is untouched by generating, and Font Pair opens on the pairing only when asked`, async ({ browser }) => {
      const { context, page } = await open(browser, size)
      watch(page, `a free account taking a starter into Font Pair (${size[0]}px)`)
      await page.route('**/api/ai', (r) => r.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ starter: STARTER, provider: 'openrouter', plan: 'free', beta: true, generation: { used: 1, limit: 1, remaining: 0, period: 'lifetime' } }),
      }))
      await signIn(page, { plan: 'free', projects: 0 })
      await go(page, '/create/auto-builder')

      const readFonts = () => page.evaluate(() => {
        try {
          const d = JSON.parse(localStorage.getItem('vs-current-design') || 'null')
          return d ? `${d.fonts?.heading?.family}/${d.fonts?.body?.family}` : 'unset'
        } catch { return 'unreadable' }
      })
      const before = await readFonts()
      expect(before, 'the control: the working design must not already be the starter').not.toContain('Manrope')

      await page.locator('#bs-brief').fill('A booking app for independent dog groomers. Calm and practical, readable all day.')
      await page.getByTestId('brand-starter-generate').click()
      const result = page.getByTestId('brand-starter-result')
      await expect(result).toBeVisible()
      await expect(result).toContainText(/Nothing here has been saved or applied/i)
      expect(await readFonts(), 'generating must not write to the working design').toBe(before)

      await page.getByTestId('brand-starter-open-fonts').click()
      await expect(page).toHaveURL(/\/create\/font-pair$/)
      // THE ARRIVAL: the tool shows the pairing the visitor asked to open.
      await expect(page.locator('.sec').first()).toContainText('Manrope')
      await expect(page.locator('.sec').first()).toContainText('Lora')
      await context.close()
    })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// FLOW 4 — export: every live free format hands over a correctly named file
// ─────────────────────────────────────────────────────────────────────────────
test.describe('flow 4 — each live free format downloads under its own name', () => {
  const FREE_LIVE = EXPORT_FORMATS.filter((f) => f.live && !f.pro)
  const EXT = { html: 'html', md: 'md', png: 'png', jpeg: 'jpg' }

  test('the four style-guide formats each produce a file named for the format', async ({ browser }) => {
    const { context, page } = await open(browser, WIDTHS[1])
    watch(page, 'a free account exporting every format it is entitled to')
    await signIn(page, { plan: 'free', projects: 1 })
    await go(page, '/create/palette')
    expect(FREE_LIVE.map((f) => f.id).sort()).toEqual(Object.keys(EXT).sort())

    for (const fmt of FREE_LIVE) {
      await page.getByRole('button', { name: 'Export', exact: true }).first().click()
      const panel = page.getByRole('dialog', { name: /Export your design system/i })
      await expect(panel).toBeVisible()
      await page.getByRole('radio', { name: new RegExp(fmt.name.replace(/[()]/g, '\\$&'), 'i') }).click()
      const cta = panel.locator('.exp-foot button').last()
      // The label says what will happen, not what it costs.
      await expect(cta).toContainText(/^Export /)
      await expect(cta).not.toContainText(/Pro|Soon/)
      const [download] = await Promise.all([page.waitForEvent('download'), cta.click()])
      expect(download.suggestedFilename(), `${fmt.name} must download as its own format`)
        .toMatch(new RegExp(`-style-guide\\.${EXT[fmt.id]}$`))
      // The panel closes after a successful export; the page is still the tool.
      await expect(panel).toHaveCount(0)
    }
    await context.close()
  })

  test('the second Pro document gates by name too, not only the book', async ({ browser }) => {
    const { context, page } = await open(browser, WIDTHS[1])
    watch(page, 'a free account trying the brand guidelines')
    await signIn(page, { plan: 'free' })
    await go(page, '/create/palette')
    await page.getByRole('button', { name: 'Export', exact: true }).first().click()
    await page.getByRole('radio', { name: /Brand guidelines/i }).click()
    await expect(page.locator('.exp-foot button').last()).toHaveText('Unlock with Pro')
    await page.getByRole('button', { name: /Unlock with Pro/i }).click()
    await expect(page.getByRole('dialog', { name: /Export the brand guidelines/i })).toBeVisible()
    await context.close()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// FLOW 5 — account
// ─────────────────────────────────────────────────────────────────────────────
test.describe('flow 5 — settings: name, theme and the delete confirmation', () => {
  async function accountTab(page) {
    await go(page, '/settings')
    await page.getByRole('tab', { name: 'Account', exact: true }).click()
  }

  for (const size of WIDTHS) {
    test(`${size[0]}px: Enter saves the display name and Escape cancels it`, async ({ browser }) => {
      const { context, page } = await open(browser, size)
      watch(page, `someone renaming themselves (${size[0]}px)`)
      await signIn(page, { plan: 'free', displayName: 'Freya Free' })
      await accountTab(page)
      const row = page.locator('.settings-row', { hasText: 'Display name' })

      await row.getByRole('button', { name: 'Edit' }).click()
      await row.locator('input').fill('Freya Renamed')
      await page.keyboard.press('Enter')
      await expect(row.locator('input'), 'Enter must commit the edit').toHaveCount(0)
      await expect(row).toContainText('Freya Renamed')
      await expect(page.locator('.settings-profile-name')).toHaveText('Freya Renamed')
      await expect(page.locator('.toast.show')).toContainText('Display name updated')

      await row.getByRole('button', { name: 'Edit' }).click()
      await row.locator('input').fill('Not This One')
      await page.keyboard.press('Escape')
      await expect(row.locator('input'), 'Escape must cancel the edit').toHaveCount(0)
      await expect(row).toContainText('Freya Renamed')
      await context.close()
    })

    test(`${size[0]}px: opening the delete confirmation keeps focus, and the button waits for a password`, async ({ browser }) => {
      const { context, page } = await open(browser, size)
      watch(page, `someone opening the delete confirmation (${size[0]}px)`)
      await signIn(page, { plan: 'free', projects: 2 })
      await accountTab(page)
      const trigger = page.getByRole('button', { name: 'Delete account', exact: true })
      await trigger.focus()
      await page.keyboard.press('Enter')

      const list = page.locator('.danger-confirm-list')
      await expect(list).toBeVisible()
      expect(await focused(page), 'focus must move into the confirmation, not fall to <body>').toMatch(/^input#del-confirm-pw/)
      const go_ = page.getByRole('button', { name: /Permanently delete/i })
      await expect(go_, 'no password, no delete').toBeDisabled()
      await page.keyboard.type('hunter22')
      await expect(go_).toBeEnabled()
      // The way back is as plain as the way through.
      await page.getByRole('button', { name: 'Cancel', exact: true }).click()
      await expect(list).toHaveCount(0)
      await context.close()
    })
  }

  test('the theme choice changes the page it is on, both ways', async ({ browser }) => {
    const { context, page } = await open(browser, WIDTHS[0])
    watch(page, 'someone switching theme on a phone')
    await signIn(page, { plan: 'free' })
    await go(page, '/settings')
    await page.getByRole('tab', { name: 'Accessibility', exact: true }).click()
    const html = page.locator('html')
    await page.locator('[data-theme-choice="dark"]').click()
    await expect(html).toHaveAttribute('data-theme', 'dark')
    await expect(page.locator('[data-theme-choice="dark"]')).toHaveAttribute('aria-pressed', 'true')
    await page.locator('[data-theme-choice="light"]').click()
    await expect(html).toHaveAttribute('data-theme', 'light')
    await context.close()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// FLOW 6 — onboarding: by keyboard, and the resume it promises
// ─────────────────────────────────────────────────────────────────────────────
test.describe('flow 6 — onboarding, by keyboard, and the stashed destination', () => {
  test('Tab reaches the first start, Enter opens that tool, and the account is marked done', async ({ browser }) => {
    const { context, page } = await open(browser, WIDTHS[0])
    watch(page, 'a brand-new account on a phone, keyboard only')
    await signIn(page, { plan: 'free', projects: 0, onboarded: false })
    await go(page, '/onboarding')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('What do you want to make first?')
    await page.keyboard.press('Tab')
    expect(await focused(page)).toMatch(new RegExp(FIRST_WINS[0].label))
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(new RegExp(`${FIRST_WINS[0].route}$`))
    expect(await page.evaluate(() => localStorage.getItem('vs-onboarded'))).toBe('1')
    await context.close()
  })

  test('declining resumes the destination the sign-up interrupted', async ({ browser }) => {
    // The branch 58-flows-account-and-community recorded as unverified: a
    // sign-up that began somewhere specific (the Pro modal stashes /checkout)
    // is returned there on "Not now", not to the generic home.
    const { context, page } = await open(browser, WIDTHS[1])
    watch(page, 'a new account that signed up from the Pro modal and declined a starting point')
    await signIn(page, { plan: 'free', projects: 0, onboarded: false })
    await page.addInitScript(() => { try { sessionStorage.setItem('vs-resume-after-onboarding', '/plans') } catch { /* ignore */ } })
    await go(page, '/onboarding')
    await page.getByRole('button', { name: /Not now/ }).click()
    await expect(page).toHaveURL(/\/plans$/)
    expect(await page.evaluate(() => sessionStorage.getItem('vs-resume-after-onboarding')), 'the stash is consumed, not left to fire again').toBeNull()
    await context.close()
  })
})
