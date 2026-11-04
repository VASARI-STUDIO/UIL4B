// Six small fixes found by a hands-on test of the tool and library pages, one describe each.
//
//   1. The Suggest variations "See Pro plans" button closes its panel and goes
//      to /plans, like every other upgrade call to action. It does not stack a
//      second dialog over the first.
//
// MUTATIONS (each should fail the named test):
//   * put `onOpen={openVariationGate}` back on the Suggest ProBlock in PaletteBuilder.jsx
//       -> "the Suggest Pro button goes to /plans with no dialog left open"
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'
import { clickPaletteAction } from './palette-helpers.js'

// ── 1. Suggest's upgrade button goes to /plans ───────────────────────────────

test.describe('Suggest variations: the Pro button', () => {
  const BOARD = '/create/palette?c=14224A,249EAF,F2C14E,2563EB,C0392B'

  // 900 wide is a dialog; 1440 is the docked panel. Both must land on /plans.
  for (const [name, width] of [['as a dialog', 900], ['docked', 1440]]) {
    for (const who of ['signed out', 'free']) {
      test(`${who}, ${name}: the Suggest Pro button goes to /plans with no dialog left open`, async ({ page }) => {
        watch(page, 'a visitor pressing the Pro button in Suggest')
        await page.setViewportSize({ width, height: 900 })
        if (who === 'free') await signIn(page, { plan: 'free' })
        await go(page, BOARD)
        await clickPaletteAction(page, 'Suggest variations', 'Suggest')
        const panel = page.getByRole(width >= 1024 ? 'complementary' : 'dialog', { name: 'Suggest', exact: true })
        await expect(panel).toBeVisible()

        const block = panel.locator('.plb-sw-problock')
        await expect(block, 'Free sees the Pro block at the end of the list').toBeVisible()
        await block.getByRole('link', { name: 'See Pro plans' }).click()

        await expect(page).toHaveURL(/\/plans$/)
        await expect(page.getByRole('dialog'), 'no dialog survives the trip to /plans').toHaveCount(0)
        await expect(panel).toHaveCount(0)
      })
    }
  }
})
