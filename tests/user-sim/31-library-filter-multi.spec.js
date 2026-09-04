// Multi-select in the Library filter tray, measured in a browser.
//
// Founder request (2026-08-08): "shift-click multi-select (selecting all three
// types resets to All types) … Keyboard equivalents are required for the
// shift-click behaviour."
//
// The collapse rules themselves are asserted without a DOM in
// tests/unit/library-filters.test.js. Three things only a browser can settle
// are here:
//
//   1. a real Shift+Click reaches the additive path at all;
//   2. a real Shift+ENTER does too — the keyboard equivalent is the SAME
//      gesture, relying on a keyboard-activated button carrying the live
//      modifier state on the click it dispatches. That is easy to assume and
//      easy to be wrong about, so it is measured rather than reasoned about;
//   3. the grid actually widens — the filter is wired to the data, not just to
//      the pills.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const ROUTE = '/discover/gradients'
const TRAY = '[aria-label^="Filter by gradient type"]'
const pill = (page, name) => page.locator(TRAY).getByRole('button', { name, exact: true })

/** Which type pills currently read as pressed. */
async function pressed(page) {
  return page.locator(`${TRAY} button[aria-pressed="true"]`).evaluateAll(
    els => els.map(e => e.textContent.trim()),
  )
}

const cardCount = (page) => page.locator('.lbry-grid .lbry-card').count()

test.describe('library filter multi-select', () => {
  test.beforeEach(async ({ page }) => {
    watch(page, 'designer narrowing the gradient library')
    await go(page, ROUTE)
    await expect(page.locator(TRAY)).toBeVisible()
  })

  test('a plain click still replaces the selection', async ({ page }) => {
    await pill(page, 'Linear').click()
    expect(await pressed(page)).toEqual(['Linear'])
    await pill(page, 'Radial').click()
    expect(await pressed(page)).toEqual(['Radial'])
  })

  test('shift-click adds a second type, and the grid grows to match', async ({ page }) => {
    await pill(page, 'Linear').click()
    const linearOnly = await cardCount(page)
    expect(linearOnly).toBeGreaterThan(0)

    await pill(page, 'Radial').click({ modifiers: ['Shift'] })
    expect(await pressed(page)).toEqual(['Linear', 'Radial'])
    // Wired to the data, not just to the pills.
    expect(await cardCount(page)).toBeGreaterThan(linearOnly)
  })

  test('selecting all three types resets to All types', async ({ page }) => {
    const all = await cardCount(page)
    await pill(page, 'Linear').click()
    await pill(page, 'Radial').click({ modifiers: ['Shift'] })
    await pill(page, 'Conic').click({ modifiers: ['Shift'] })

    expect(await pressed(page)).toEqual(['All types'])
    expect(await cardCount(page)).toBe(all)
  })

  // The requirement the founder called out by name.
  test('Shift+Enter from the keyboard is the same gesture as shift-click', async ({ page }) => {
    await pill(page, 'Linear').click()
    await pill(page, 'Radial').focus()
    await page.keyboard.press('Shift+Enter')
    expect(await pressed(page)).toEqual(['Linear', 'Radial'])

    // …and without the modifier the same key still replaces, so the modifier is
    // doing the work rather than the tray having silently become multi-select
    // for every activation.
    await pill(page, 'Conic').focus()
    await page.keyboard.press('Enter')
    expect(await pressed(page)).toEqual(['Conic'])
  })

  test('the sliding indicator steps aside once it cannot point at the selection', async ({ page }) => {
    // Polled, not read once: the indicator's opacity is a transition, so a
    // single read lands mid-fade and reports whatever fraction it got to.
    const opacity = () => page.locator(`${TRAY} .lbry-filter-ind`).evaluate(el => Number(getComputedStyle(el).opacity))
    await pill(page, 'Linear').click()
    await expect.poll(opacity).toBeGreaterThan(0.9)

    await pill(page, 'Radial').click({ modifiers: ['Shift'] })
    // One box cannot point at two options; leaving it on the first would report
    // a narrower filter than is applied.
    await expect.poll(opacity).toBeLessThan(0.1)
  })

  test('both selected pills still read as selected once the indicator is gone', async ({ page }) => {
    await pill(page, 'Linear').click()
    await pill(page, 'Radial').click({ modifiers: ['Shift'] })
    // Not a colour assertion — a contrast-with-the-tray one. The indicator is
    // what used to draw this fill, so its absence must not leave the two lit
    // pills looking exactly like the unlit one beside them.
    const [onBg, offBg] = await Promise.all([
      pill(page, 'Radial').evaluate(el => getComputedStyle(el).backgroundColor),
      pill(page, 'Conic').evaluate(el => getComputedStyle(el).backgroundColor),
    ])
    expect(onBg).not.toBe(offBg)
  })

  test('the tray tells assistive technology it is multi-select, and how', async ({ page }) => {
    // The hint is in the group's accessible name; the visible copy of it is
    // aria-hidden so a screen reader hears the words once, not twice.
    await expect(page.locator(TRAY)).toHaveAttribute('aria-label', /Shift-click/)
    await expect(page.locator(`${TRAY} .lbry-filter-hint`)).toHaveAttribute('aria-hidden', 'true')
  })

  // The other trays on this page and elsewhere did not opt in, and must be
  // unaffected — the multi-select is a prop, not a change of default.
  test('the mood tray beside it is still single-select', async ({ page }) => {
    const mood = page.locator('[aria-label^="Filter by mood"]')
    await mood.getByRole('button', { name: 'Warm', exact: true }).click()
    await mood.getByRole('button', { name: 'Cool', exact: true }).click({ modifiers: ['Shift'] })
    const on = await mood.locator('button[aria-pressed="true"]').evaluateAll(els => els.map(e => e.textContent.trim()))
    expect(on).toEqual(['Cool'])
  })
})
