// Small fixes found by a hands-on test of the tool and library pages, one describe each.
//
//   1. The Suggest variations "See Pro plans" button closes its panel and goes
//      to /plans, like every other upgrade call to action. It does not stack a
//      second dialog over the first.
//   2. A Soon tool's URL still redirects, but the arrival says so in a toast.
//   7. The palette Pro walls preview the seed on screen, not the saved history.
//
// MUTATIONS (each should fail the named test):
//   * make `openProModal` in PaletteBuilder.jsx pass no `seed` again
//       -> "after a randomise, the "Go beyond 8 colours" wall shows the toolbar seed"
//   * put `onOpen={openVariationGate}` back on the Suggest ProBlock in PaletteBuilder.jsx
//       -> "the Suggest Pro button goes to /plans with no dialog left open"
//   * delete the `soonNote` effect in CreateTool.jsx
//       -> "a Soon tool redirects and says so"
import { test, expect } from './base.js'
import { go, goRaw, ready, signIn, watch } from './helpers.js'
import { clickPaletteAction } from './palette-helpers.js'
import { resolveTool, soonRedirect } from '../../src/data/toolTree.js'

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

// ── 2. A Soon redirect says where the visitor was headed ─────────────────────

test.describe('Soon tools: the redirect leaves a note', () => {
  const pathOf = (page) => new URL(page.url()).pathname

  // One route of each kind: a Soon section (goes to the palette) and a Soon
  // tool in a live section (goes to its first live tool, Alt Text).
  const CASES = [
    { from: '/create/box-shadow', note: 'Box Shadow is coming soon. Here’s the Palette tool meanwhile.' },
    { from: '/create/components', note: 'UI Component Builder is coming soon. Here’s the Palette tool meanwhile.' },
    { from: '/create/ai-prompt', note: 'Image Prompt is coming soon. Here’s the Alt Text tool meanwhile.' },
  ]

  test('the notes are the tool names from the tool tree', () => {
    for (const { from, note } of CASES) {
      const to = soonRedirect(from)
      expect(to, `${from} is a Soon route`).toBeTruthy()
      expect(note).toBe(`${resolveTool(from).name} is coming soon. Here’s the ${resolveTool(to).name} tool meanwhile.`)
    }
  })

  for (const { from, note } of CASES) {
    test(`a Soon tool redirects and says so: ${from}`, async ({ page }) => {
      watch(page, 'a visitor following an old link to an unfinished tool')
      await goRaw(page, from)
      await expect.poll(() => pathOf(page)).toBe(soonRedirect(from))
      await ready(page, soonRedirect(from))
      await expect(page.locator('.toast.show')).toContainText(note)
    })
  }

  test('a live tool opens with no note', async ({ page }) => {
    watch(page, 'a visitor opening the palette directly')
    await go(page, '/create/palette')
    await expect(page.locator('.toast.show')).toHaveCount(0)
  })
})

// ── 7. The Pro wall previews the colour on screen ────────────────────────────

test.describe('palette Pro walls: the colour preview follows the board', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  const STALE = '#010203'
  const EIGHT = '/create/palette?c=14224A,249EAF,F2C14E,2563EB,C0392B,6B7280,10B981,F97316'

  test('after a randomise, the "Go beyond 8 colours" wall shows the toolbar seed, not the saved history', async ({ page }) => {
    watch(page, 'a free member hitting the colour cap after a randomise')
    await signIn(page, { plan: 'free' })
    await go(page, EIGHT)
    await clickPaletteAction(page, 'Randomise')

    const chip = page.locator('.plb-seedchip-hex')
    await expect(chip).toBeVisible()
    const onScreen = ((await chip.textContent()) || '').trim()
    expect(onScreen).toMatch(/^#[0-9a-f]{6}$/i)

    // Put an older palette at the head of the saved history, as an undo or redo
    // can leave it, and check it really is there before the wall reads it.
    await page.evaluate((stale) => {
      const raw = JSON.parse(localStorage.getItem('vs-palette-history') || '[]')
      const head = { ...(raw[0] || {}), seed: stale, colors: [stale] }
      localStorage.setItem('vs-palette-history', JSON.stringify([head, ...raw.slice(1)]))
    }, STALE)
    const heldSeed = await page.evaluate(() => JSON.parse(localStorage.getItem('vs-palette-history'))[0].seed)
    expect(heldSeed, 'the history is stale on purpose').toBe(STALE)
    expect(onScreen.toLowerCase()).not.toBe(STALE)

    await page.getByRole('button', { name: 'Add a colour' }).click()
    const wall = page.getByRole('dialog').filter({ hasText: 'Go beyond 8 colours' })
    await expect(wall).toBeVisible()
    await expect(wall.locator('.ui-pro-rail-seed')).toHaveText(onScreen.toUpperCase())
  })
})
