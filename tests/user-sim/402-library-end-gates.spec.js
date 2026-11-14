// V3 Libraries, palettes and gradients: the gate under the last open row
// (LibraryGate), for the three people who can reach it. A signed-out visitor is
// invited to create a free account (Log in beside it), a free account is shown
// what Pro adds, and a Pro member meets no gate at all. The Pro route goes to
// /plans, and on a phone the primary action is a full-width 52px pill.
//
// Changed with LibraryGate: the signed-out gate's primary action is now "Create
// a free account" (a button) with "Log in" as the second control, and it carries
// no "See the plans" link, because a free account is the next rung for someone
// signed out. The free gate's action is now "Upgrade to Pro", under the heading
// "N more <noun> with Pro".
//
// MUTATIONS this file goes red on:
//   - point the free gate's plans action at another route in
//     components/library/LibraryGate.jsx (the `to: '/plans'` of `control`): the
//     /plans assertion goes red;
//   - drop the `.geg-pill` full-width rule in library-v3.css: the phone width
//     assertion goes red;
//   - render the gate for a Pro member (drop the Pro check in `gateFor`,
//     src/utils/galleryCounts.js): the Pro "no gate" test goes red.
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'
import { LIBRARY_PALETTES } from '../../api/_lib/library/paletteLibrary.js'
import { GALLERY_GRADIENTS } from '../../api/_lib/library/gradientGallery.js'
import { GALLERY_TIER_LIMITS } from '../../src/utils/lockedPreview.js'

const LIBS = [
  { key: 'palettes', route: '/discover/palettes', noun: 'palettes', total: LIBRARY_PALETTES.length, card: '.lib-results .vpt' },
  { key: 'gradients', route: '/discover/gradients', noun: 'gradients', total: GALLERY_GRADIENTS.length, card: '.lib-results .vpt' },
]
// What a free account opens: the cap the app itself reads, never a typed count.
const FREE_OPENS = GALLERY_TIER_LIMITS.free

const VIEWPORTS = [
  { name: '1440', use: { viewport: { width: 1440, height: 900 } }, phone: false },
  { name: '390', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, phone: true },
]

for (const vp of VIEWPORTS) {
  test.describe(`end gates at ${vp.name}`, () => {
    test.use(vp.use)

    for (const lib of LIBS) {
      test(`${lib.key}: signed out is invited to create a free account, with Log in beside it`, async ({ page }) => {
        watch(page, `a signed-out visitor at the end of the ${lib.key} library`)
        await go(page, lib.route)
        const gate = page.locator('.geg')
        await expect(gate).toHaveCount(1)
        await expect(gate.getByRole('heading')).toHaveText(`Log in to access ${FREE_OPENS} ${lib.noun}`)
        const pill = gate.getByRole('button', { name: 'Create a free account', exact: true })
        await expect(pill).toBeVisible()
        await expect(gate.getByRole('button', { name: 'Log in', exact: true })).toBeVisible()
        // No plans link on this variant: the next rung for someone signed out is the free account.
        await expect(gate.getByRole('link')).toHaveCount(0)
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
        await expect(gate.getByRole('heading')).toHaveText(`${lib.total - FREE_OPENS} more ${lib.noun} with Pro`)
        const action = gate.getByRole('link', { name: 'Upgrade to Pro', exact: true })
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
        await expect(page.getByRole('link', { name: /See what Pro includes|See the plans|Upgrade to Pro/ })).toHaveCount(0)
      })
    }
  })
}
