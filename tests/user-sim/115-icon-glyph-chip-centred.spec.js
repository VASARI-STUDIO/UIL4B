// A coloured glyph (circle flags) must sit in the middle of its icon tile.
// The tile's label rule in global.css (`.ic span…`) once matched the glyph chip
// too, which is also a <span>; it turned the chip into a clamped -webkit-box and
// the artwork slid to the top-left instead of the centre of the tile.
import { test, expect } from './base.js'
import { chooseMenuOption, go, signIn, watch } from './helpers.js'
import { isLiveIconify } from './iconify-stub.js'

const PERSONA = 'a designer browsing circle flags in the icon library'

async function choosePack(page, pack) {
  const filters = page.getByRole('button', { name: /^Filters\b/ })
  const sheet = page.getByRole('dialog', { name: 'Filters' })
  // The pack menu sits on the toolbar when it fits; otherwise it is in the Filters panel.
  const inPanel = !(await page.locator('.ig-toolbar').getByRole('button', { name: 'Icon pack' }).isVisible()) && await filters.isVisible()
  const panel = sheet.or(page.getByRole('group', { name: 'Filters', exact: true }))
  if (inPanel) {
    await filters.click()
    await expect(panel).toBeVisible()
  }
  await chooseMenuOption(page, (inPanel ? panel : page.locator('.ig-toolbar')).getByRole('button', { name: 'Icon pack' }), pack)
  if (await sheet.isVisible()) {
    await sheet.getByRole('button', { name: 'Done', exact: true }).click()
    await expect(sheet).toBeHidden()
  } else if (inPanel) {
    await filters.click()
    await expect(panel).toBeHidden()
  }
}

test.describe('coloured glyphs are centred in their icon tile', () => {
  test.skip(isLiveIconify(), 'the live API decides which flags exist; this spec reads the fixture')

  test('a loaded flag sits in the middle of its glyph chip, and the name label still clamps', async ({ page }) => {
    watch(page, PERSONA)
    await signIn(page, { plan: 'pro' })
    await go(page, '/create/icons')
    await expect(page.locator('.ig .ic').first()).toBeVisible({ timeout: 20_000 })
    await choosePack(page, 'circle-flags')

    const chip = page.locator('.ig .ic .ig-chip:not(.ig-chip--wait):has(img)').first()
    await expect(chip).toBeVisible({ timeout: 20_000 })
    await expect(chip.locator('img')).toHaveCSS('opacity', '1')

    const { display, justify, align, dx, dy } = await chip.evaluate((el) => {
      const s = getComputedStyle(el)
      const c = el.getBoundingClientRect()
      const i = el.querySelector('img').getBoundingClientRect()
      return {
        display: s.display,
        justify: s.justifyContent,
        align: s.alignItems,
        dx: Math.abs(i.left + i.width / 2 - (c.left + c.width / 2)),
        dy: Math.abs(i.top + i.height / 2 - (c.top + c.height / 2)),
      }
    })
    expect({ display, justify, align }, 'the chip lost its flex centring').toEqual({ display: 'flex', justify: 'center', align: 'center' })
    expect(dx, `the flag is ${dx}px off-centre across`).toBeLessThan(1)
    expect(dy, `the flag is ${dy}px off-centre down`).toBeLessThan(1)

    // The fix must not loosen the tile's own label: its clamp still applies.
    const label = chip.locator('xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " ic ")][1]').locator('.ic-name')
    await expect(label).toHaveCSS('-webkit-line-clamp', '2')
  })
})
