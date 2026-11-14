// Shared steps for the Settings journeys (specs 385 desktop and 386 phone).
// JOURNEY_MUTATE=1 swaps one expectation per journey for a wrong one: every journey must then fail.
import { expect } from './base.js'
import { go, signIn } from './helpers.js'
import { withAvailability } from './price-payload.js'

export const MUTATE = process.env.JOURNEY_MUTATE === '1'
/** The real expectation, or a deliberately wrong one when mutating. */
export const want = (real, wrong) => (MUTATE ? wrong : real)

export const PRICES = withAvailability({ monthly: { usd: 7 }, quarterly: { usd: 18 }, yearly: { usd: 48 } })
export const stubPrices = (page) => page.route('**/api/get-prices*', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(PRICES) }))
export const stubPortalFails = (page) => page.route('**/api/create-portal*', (r) => r.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'portal down' }) }))
/** Any delete request is counted and refused: no journey reaches the real endpoint. */
export async function stubDelete(page) {
  const seen = { n: 0 }
  await page.route('**/api/delete-account*', (r) => { seen.n++; return r.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'stub' }) }) })
  return seen
}

export const PROJECT = { id: 'seed-1', name: 'Kerbside', design: { palette: { colors: ['#FF5A1F'], activeIdx: 0 } }, createdAt: '2026-09-01T09:00:00.000Z', updatedAt: '2026-09-02T09:00:00.000Z' }
export const PERIOD_END = Date.UTC(2027, 2, 4, 12)
export const PRO_SUB = { status: 'active', interval: 'monthly', currentPeriodEnd: PERIOD_END, cancelAtPeriodEnd: false }

/** Press with a finger on a touch page, a click otherwise. */
export const press = (loc, touch) => (touch ? loc.tap() : loc.click())

export async function openSettings(page, opts = {}) {
  await stubPrices(page)
  await signIn(page, { plan: 'free', ...opts })
  await go(page, '/settings')
}

/** Open a section: a tab on a desktop, a row of the list on a phone. */
export async function openSection(page, id, touch = false) {
  const tab = page.locator(`#settab-${id}`)
  if (!(await tab.isVisible())) await page.getByRole('button', { name: 'All settings' }).click()
  await press(tab, touch)
  await expect(page.locator(`#set-${id}`)).toBeVisible()
}

export const rowOf = (section, label) => section.locator('.settings-row', { has: section.page().getByText(label, { exact: true }) }).first()

/** No sideways scroll, and every visible control at least 44px each way. */
export async function sweep(page) {
  return page.evaluate(() => {
    const wide = document.documentElement.scrollWidth - window.innerWidth
    const small = [...document.querySelectorAll('.stg button, .stg a[href], .stg input:not([type=hidden]), .stg [role=tab], .stg [role=switch]')]
      // The switch's 44px reach is a pseudo-element (spec 174 measures it); a link inside a sentence is exempt (WCAG 2.5.8).
      .filter((el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && !el.closest('[hidden]') && !el.matches('.toggle-switch') && !(el.matches('a') && el.closest('p, li, .settings-row-meta')) })
      .map((el) => { const r = el.getBoundingClientRect(); return { el: (el.className || el.tagName).toString().slice(0, 40) + ' ' + (el.textContent || '').trim().slice(0, 20), w: Math.round(r.width), h: Math.round(r.height) } })
      .filter((x) => x.h < 44 || x.w < 44)
    return { wide, small }
  })
}
