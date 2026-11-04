// Small fixes found by a hands-on test of the tool and library pages, one describe each.
//
//   1. The Suggest variations "See Pro plans" button closes its panel and goes
//      to /plans, like every other upgrade call to action. It does not stack a
//      second dialog over the first.
//   2. A Soon tool's URL still redirects, but the arrival says so in a toast.
//   3. The palette library has one builder link per card and a skip link past
//      the grid.
//   4. /discover/prompts shows the not-found page to anyone but an admin.
//   7. The palette Pro walls preview the seed on screen, not the saved history.
//
// MUTATIONS (each should fail the named test):
//   * drop `notFound` from the /discover/prompts route in App.jsx
//       -> "signed out: the not-found page, at the same address"
//   * restore the `pgal-act` Builder link in PaletteGalleryGrid.jsx
//       -> "a card has one link to the builder ..."
//   * delete the skip link or the `pgl-after-grid` marker in PaletteGallery.jsx
//       -> "the skip link moves focus past the palettes"
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

// ── 3. Palette gallery: one builder link per card, and a way past the grid ───

test.describe('palette gallery: tab stops', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  const frames = (page, n = 3) => page.evaluate(
    (count) => new Promise((resolve) => {
      let left = count
      const tick = () => { left -= 1; if (left <= 0) resolve(); else requestAnimationFrame(tick) }
      requestAnimationFrame(tick)
    }),
    n,
  )

  test('a card has one link to the builder and fewer tab stops than the swatches plus seven', async ({ page }) => {
    watch(page, 'a keyboard user walking the palette library')
    await go(page, '/discover/palettes')
    const card = page.locator('.pgal-card:has(.pgal-act)').first()
    await expect(card).toBeVisible({ timeout: 20000 })

    const builder = card.locator('a[href^="/create/palette"]')
    await expect(builder, 'one link to the builder per card').toHaveCount(1)
    await expect(builder).toBeVisible()

    // Tab from the first swatch to the card's last stop, counting each one.
    const stripes = await card.locator('.pgal-stripe').count()
    await card.locator('.pgal-stripe').first().focus()
    let stops = 1
    for (let i = 0; i < 30; i += 1) {
      await page.keyboard.press('Tab')
      await frames(page)
      const inside = await card.evaluate((el) => el.contains(document.activeElement))
      if (!inside) break
      stops += 1
    }
    // Before: swatches + like + five actions + the foot link = swatches + 7.
    expect(stops, 'the tab stops in one card').toBeLessThan(stripes + 7)
    expect(stops).toBe(stripes + 1 + 4 + 1)
  })

  test('the skip link moves focus past the palettes', async ({ page }) => {
    watch(page, 'a keyboard user skipping the palette grid')
    await go(page, '/discover/palettes')
    await expect(page.locator('.pgal-card').first()).toBeVisible({ timeout: 20000 })

    const skip = page.getByRole('link', { name: 'Skip past the palettes' })
    await expect(skip).toHaveCount(1)
    const first = await skip.evaluate((a) => !!(a.compareDocumentPosition(document.querySelector('.pgal-card')) & Node.DOCUMENT_POSITION_FOLLOWING))
    expect(first, 'it comes before the first card').toBe(true)

    await skip.focus()
    await expect(skip, 'it shows on focus').toBeInViewport()
    await page.keyboard.press('Enter')
    await frames(page)

    const where = await page.evaluate(() => {
      const active = document.activeElement
      const cards = [...document.querySelectorAll('.pgal-card')]
      const last = cards[cards.length - 1]
      return {
        insideACard: !!active?.closest('.pgal-card'),
        afterLastCard: !!(last.compareDocumentPosition(active) & Node.DOCUMENT_POSITION_FOLLOWING),
      }
    })
    expect(where.insideACard).toBe(false)
    expect(where.afterLastCard, 'focus is past the last card').toBe(true)

    // The next Tab goes on from there, not back into the grid.
    await page.keyboard.press('Tab')
    await frames(page)
    expect(await page.evaluate(() => !!document.activeElement?.closest('.pgal-card'))).toBe(false)
  })
})

// ── 4. /discover/prompts shows the not-found page to non-admins ──────────────

test.describe('/discover/prompts: parked behind the admin check', () => {
  const NOT_FOUND = /That page doesn.t exist/
  const pathOf = (page) => new URL(page.url()).pathname

  for (const who of ['signed out', 'free', 'pro']) {
    test(`${who}: the not-found page, at the same address`, async ({ page }) => {
      watch(page, 'a visitor following a link to a parked page')
      if (who !== 'signed out') await signIn(page, { plan: who })
      await go(page, '/discover/prompts')
      await expect(page.getByRole('heading', { level: 1, name: NOT_FOUND })).toBeVisible()
      await expect(page).toHaveTitle('UI L4B | Page not found')
      expect(pathOf(page), 'the address was not changed').toBe('/discover/prompts')
    })
  }

  test('an admin still gets the library', async ({ page }) => {
    watch(page, 'the owner opening the parked library')
    await signIn(page, { admin: true })
    await go(page, '/discover/prompts')
    await expect(page.getByRole('heading', { level: 1, name: NOT_FOUND })).toHaveCount(0)
    expect(pathOf(page)).toBe('/discover/prompts')
  })
})
