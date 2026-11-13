// V3 Libraries, palettes and gradients: the gate under the last open row, for
// the three people who can reach it. A signed-out visitor is asked to log in, a
// free account is shown what Pro adds, and a Pro member meets no gate at all.
// Every route to more goes to /plans, and on a phone the primary action is a
// full-width 52px pill.
//
// MUTATIONS this file goes red on:
//   - point the gate's secondary link or its Pro action at another route in
//     PaletteGallery.jsx / GradientGallery.jsx: the /plans assertions go red;
//   - drop the `.geg-pill` full-width rule in library-v3.css: the phone width
//     assertion goes red;
//   - render the gate for a Pro member (drop the Pro check on `lockedBlock`): the
//     Pro "no gate" test goes red.
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'

const LIBS = [
  { key: 'palettes', route: '/discover/palettes', noun: 'palettes', card: '.pgal-card:not(.geg-fade *)' },
  { key: 'gradients', route: '/discover/gradients', noun: 'gradients', card: '.grg-card:not(.geg-fade *)' },
]
// What a free account opens, typed here so a change to the cap has to change a test.
const FREE_OPENS = 10

const VIEWPORTS = [
  { name: '1440', use: { viewport: { width: 1440, height: 900 } }, phone: false },
  { name: '390', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, phone: true },
]

for (const vp of VIEWPORTS) {
  test.describe(`end gates at ${vp.name}`, () => {
    test.use(vp.use)

    for (const lib of LIBS) {
      test(`${lib.key}: signed out is asked to log in, with the plans one link away`, async ({ page }) => {
        watch(page, `a signed-out visitor at the end of the ${lib.key} library`)
        await go(page, lib.route)
        const gate = page.locator('.geg')
        await expect(gate).toHaveCount(1)
        await expect(gate.getByRole('heading')).toHaveText(`Log in to access ${FREE_OPENS} ${lib.noun}`)
        const pill = gate.getByRole('button', { name: 'Log in' })
        await expect(pill).toBeVisible()
        await expect(gate.getByRole('link', { name: 'See the plans' })).toHaveAttribute('href', '/plans')
        if (vp.phone) {
          await pill.scrollIntoViewIfNeeded()
          const box = await pill.boundingBox()
          expect(Math.round(box.height), 'the pill is 52px tall').toBe(52)
          expect(box.width, 'the pill spans the width').toBeGreaterThan(390 - 48)
        }
      })

      test(`${lib.key}: a free account is shown what Pro adds, and the action goes to /plans`, async ({ page }) => {
        watch(page, `a free member at the end of the ${lib.key} library`)
        await signIn(page, { plan: 'free' })
        await go(page, lib.route)
        const gate = page.locator('.geg')
        await expect(gate).toHaveCount(1)
        await expect(gate.getByRole('heading')).toHaveText(new RegExp(`^Pro opens [\\d,]+ more ${lib.noun}$`))
        const action = gate.getByRole('link', { name: 'See what Pro includes' })
        await expect(action).toHaveAttribute('href', '/plans')
        await expect(gate.getByRole('button', { name: 'Log in' })).toHaveCount(0)
        await action.scrollIntoViewIfNeeded()
        await action.click()
        await expect(page).toHaveURL(/\/plans/)
      })

      test(`${lib.key}: a Pro member meets no gate once the whole set is in`, async ({ page }) => {
        watch(page, `a Pro member at the end of the ${lib.key} library`)
        await signIn(page, { plan: 'pro' })
        await go(page, lib.route)
        await expect.poll(() => page.locator(lib.card).count(), { timeout: 10000 }).toBeGreaterThan(FREE_OPENS)
        await expect(page.locator('.geg')).toHaveCount(0)
        // The closing "Create and submit your own" line stays for a Pro member (it is on the
        // board, and 57 asserts it); what must be gone is any offer of more access: no
        // upsell link to /plans and no sign-up button inside it.
        await expect(page.locator('.gcta a[href="/plans"], .gcta button')).toHaveCount(0)
        await expect(page.locator('.gcta')).not.toContainText(/Pro includes|free account|See the plans/i)
        await expect(page.getByRole('link', { name: /See what Pro includes|See the plans/ })).toHaveCount(0)
      })
    }
  })
}
