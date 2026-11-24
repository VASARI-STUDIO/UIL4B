// ICON LIBRARY NOTES (Q219): Editable toggles off, and the edit mark shows on hover only.
//
//   1. Pressing the pressed Editable (or Coloured) category turns it off, back to All.
//   2. A tile whose line style can be edited shows a small pencil on hover and keyboard focus only, never at
//      rest. The mark is a pseudo-element, so there is no `.ic-edit` node (432 still holds) and it is not read out.
//   3. On touch (hover: none) the mark shows on the picked tile only.
//
// Item 1 of the notes (a free row for a signed-out search) is not built: see the commit message.
//
// HOW TO SEE EACH FAIL (src/):
//   handleCategory returns early when next === category              -> "pressing Editable again"
//   IconCell drops data-editable / the CSS ::after rules              -> "hover shows the mark"
//   the ::after opacity rule is dropped (mark always on)              -> "at rest the mark is hidden"
//   the hover:none rule is dropped                                    -> "touch: the picked tile"
//
// Artwork is served from the Iconify fixture (tests/user-sim/iconify-stub.js).
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'

const REAL_CELL = '.ig .ic:not(.ig-skel)'
const markOpacity = (cell) => cell.evaluate((el) => parseFloat(getComputedStyle(el, '::after').opacity))
const markContent = (cell) => cell.evaluate((el) => getComputedStyle(el, '::after').content)

async function open(page, width) {
  await page.setViewportSize({ width, height: 900 })
  await signIn(page, { plan: 'pro' })
  await go(page, '/create/icons')
  await expect(page.locator(REAL_CELL).first()).toBeVisible({ timeout: 20_000 })
  await expect(page.locator('.ig-skel')).toHaveCount(0, { timeout: 20_000 })
}

async function tray(page) {
  await expect(page.locator('.ig-toolbar')).toBeVisible({ timeout: 20_000 })
  const group = page.getByRole('group', { name: 'Icon category' }).first()
  if (await group.isVisible()) return group
  const filters = page.getByRole('button', { name: /^Filters\b/ })
  if (await filters.isVisible() && await filters.getAttribute('aria-expanded') !== 'true') await filters.click()
  if (!await group.isVisible()) await page.locator('.lbry-filtertrig', { hasText: 'Category' }).first().click()
  await expect(group).toBeVisible({ timeout: 20_000 })
  return group
}
const pressed = async (page) => (await tray(page)).locator('.lbry-filter').evaluateAll((els) => els.map((b) => b.getAttribute('aria-pressed')))
const option = async (page, name) => (await tray(page)).getByRole('button', { name: new RegExp(`^${name}`) })

for (const width of [1440, 390]) {
  test.describe(`at ${width}px`, () => {
    test('pressing Editable again turns it off, back to All', async ({ page }) => {
      watch(page, `someone toggling the Editable category at ${width}px`)
      await open(page, width)
      await (await option(page, 'Editable')).click()
      await expect.poll(() => pressed(page), { timeout: 15_000 }).toEqual(['false', 'false', 'false', 'true'])
      await page.screenshot({ path: `.claude/01_scratch/18_icon_notes/editable-on-${width}.png` })
      await (await option(page, 'Editable')).click()
      await expect.poll(() => pressed(page), { timeout: 15_000 }).toEqual(['true', 'false', 'false', 'false'])
      await expect(page.locator(REAL_CELL).first()).toBeVisible({ timeout: 20_000 })
      await page.screenshot({ path: `.claude/01_scratch/18_icon_notes/editable-off-${width}.png` })

      await (await option(page, 'Coloured')).click()
      await expect.poll(() => pressed(page), { timeout: 15_000 }).toEqual(['false', 'true', 'false', 'false'])
      await (await option(page, 'Coloured')).click()
      await expect.poll(() => pressed(page), { timeout: 15_000 }).toEqual(['true', 'false', 'false', 'false'])
      // All stays pressed when it is pressed.
      await (await option(page, 'All')).click()
      expect(await pressed(page)).toEqual(['true', 'false', 'false', 'false'])
    })
  })
}

test.describe('at 1440px with a mouse', () => {
  test('the edit mark shows on hover and focus only, and is not a node or a name', async ({ page }) => {
    watch(page, 'someone browsing Lucide icons with a mouse')
    await open(page, 1440)
    const cell = page.locator('.ig .ic[data-editable]').first()
    await expect(cell, 'an editable tile is marked').toBeVisible({ timeout: 20_000 })
    await expect(page.locator('.ic-edit'), 'no mark node, so nothing for a screen reader').toHaveCount(0)
    expect(await cell.getAttribute('aria-label')).not.toMatch(/editable/i)
    expect(await markContent(cell), 'a mark is drawn').not.toBe('none')

    // At rest it is hidden.
    await page.mouse.move(0, 0)
    await expect.poll(() => markOpacity(cell), { message: 'at rest the mark is hidden' }).toBe(0)
    await page.screenshot({ path: '.claude/01_scratch/18_icon_notes/mark-rest-1440.png' })

    await cell.hover()
    await expect.poll(() => markOpacity(cell), { message: 'hover shows the mark' }).toBe(1)
    await page.screenshot({ path: '.claude/01_scratch/18_icon_notes/mark-hover-1440.png', clip: await cell.boundingBox() })

    await page.mouse.move(0, 0)
    await expect.poll(() => markOpacity(cell)).toBe(0)
    await page.keyboard.press('Tab')
    await cell.focus()
    await page.keyboard.press('Shift+Tab')
    await page.keyboard.press('Tab')
    await expect(cell).toBeFocused()
    await expect.poll(() => markOpacity(cell), { message: 'keyboard focus shows the mark' }).toBe(1)
  })

  test('a tile that is not editable carries no mark', async ({ page }) => {
    watch(page, 'someone browsing a coloured pack')
    await open(page, 1440)
    const plain = page.locator(`${REAL_CELL}:not([data-editable])`).first()
    if (await plain.count() === 0) test.skip(true, 'every tile on screen is editable')
    expect(await markContent(plain)).toBe('none')
  })
})

test.describe('on touch at 390px', () => {
  test.use({ hasTouch: true, isMobile: true })
  test('the mark shows on the picked tile only', async ({ page }) => {
    watch(page, 'someone on a phone picking an icon')
    await open(page, 390)
    expect(await page.evaluate(() => matchMedia('(hover: none)').matches), 'the context is touch').toBe(true)
    const cell = page.locator('.ig .ic[data-editable]').first()
    await expect(cell).toBeVisible({ timeout: 20_000 })
    await expect.poll(() => markOpacity(cell), { message: 'touch: not shown at rest' }).toBe(0)
    await page.screenshot({ path: '.claude/01_scratch/18_icon_notes/mark-touch-rest-390.png' })
    await cell.tap()
    await expect(cell).toHaveClass(/is-picked/)
    await expect.poll(() => markOpacity(cell), { message: 'touch: the picked tile shows the mark' }).toBe(1)
    await page.screenshot({ path: '.claude/01_scratch/18_icon_notes/mark-touch-picked-390.png' })
  })
})
