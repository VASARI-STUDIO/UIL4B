// THE ICON LIBRARY TILE SHOWS ITS NAME ONLY WHERE A POINTER CAN HOVER, AND ONLY WHEN ASKED.
//
// On /create/icons (the All packs view signed out, which labels every tile with its pack):
//   - where a pointer can hover (1440, fine pointer) a tile at rest is a bare glyph: its name and
//     its pack label are in the page but have `opacity: 0`; hovering a tile draws that tile's name
//     and pack and no other's; the picked tile keeps them;
//   - where nothing can hover (390, touch) the name is always drawn and the pack label is not
//     drawn at all (`display: none`; the cell's accessible name still carries the pack).
//
// The labels are hidden with opacity, not display, so they stay in the render tree: Playwright's
// toBeVisible() passes for a hidden name. These tests read computed opacity for that reason.
//
// HOW TO SEE EACH FAIL (src/styles/deferred/library.css):
//   the `@media (hover:hover){ .lib-surface .ig .ic :is(.ic-name,.ic-pack){opacity:0} }` rule is deleted
//       -> "at rest a tile's name is transparent" (and the pack test): the old CSS drew every name at rest
//   `:hover` leaves the `:is(:hover,:focus-visible,.is-picked)` list -> "hovering a tile draws its own name only"
//   `.is-picked` leaves that list                                    -> "the picked tile keeps its name"
//   the `@media (hover:none){ ... .ic-pack{display:none} }` rule is deleted -> "on touch the pack label is not drawn"
//   the hover-capable opacity rule is moved outside its @media        -> "on touch the name is always drawn"
// Proved against the old CSS on 30 Oct 2026 (library.css and global.css at origin/main, rebuilt):
// the three 1440 tests fail (names drawn at rest). The two touch tests pass on the old CSS too:
// they pin behaviour the change keeps (name drawn, pack label not drawn on touch), so they guard
// against a regression of the new hover-capable rule leaking onto touch, not against the old CSS.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const PERSONA = 'a designer who has not signed up yet, browsing icon sets'

/** Wait for the real cells to replace the skeleton and for the first glyph to draw. */
async function loadedCells(page) {
  await expect(page.locator('.ig .ic').first()).toBeVisible({ timeout: 20_000 })
  await expect(page.locator('.ig-skel')).toHaveCount(0, { timeout: 20_000 })
  await expect(page.locator('.ig .ic :is(img, svg.ig-sym)').first()).toBeVisible({ timeout: 20_000 })
}

const opacityOf = (loc) => loc.evaluate((el) => getComputedStyle(el).opacity)

test.describe('where a pointer can hover (1440)', () => {
  test.beforeEach(async ({ page }) => {
    watch(page, PERSONA)
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, '/create/icons')
    await loadedCells(page)
    expect(await page.evaluate(() => matchMedia('(hover: hover)').matches), 'positive control: this context can hover').toBe(true)
    await page.mouse.move(2, 2)
  })

  test("at rest a tile's name is transparent, though it is still in the page", async ({ page }) => {
    const tile = page.locator('.ig .ic').nth(5)
    const name = tile.locator('.ic-name')
    expect((await name.textContent()).trim(), 'the name is in the markup').not.toBe('')
    await expect.poll(() => opacityOf(name)).toBe('0')
    // None of the tiles on screen draws its name.
    const drawn = await page.locator('.ig .ic .ic-name').evaluateAll((els) => els.filter((el) => getComputedStyle(el).opacity !== '0').length)
    expect(drawn, 'names drawn at rest').toBe(0)
  })

  test('hovering a tile draws its own name and pack label, and no other tile does', async ({ page }) => {
    const tiles = page.locator('.ig .ic')
    const hovered = tiles.nth(3)
    const other = tiles.nth(5)
    await hovered.hover()
    await expect.poll(() => opacityOf(hovered.locator('.ic-name')), { message: 'the hovered name fades in' }).toBe('1')
    await expect.poll(() => opacityOf(hovered.locator('.ic-pack')), { message: 'the hovered pack label fades in' }).toBe('1')
    expect(await opacityOf(other.locator('.ic-name')), 'a tile the pointer is not on').toBe('0')
    expect(await opacityOf(other.locator('.ic-pack')), 'a tile the pointer is not on').toBe('0')
    await page.mouse.move(2, 2)
    await expect.poll(() => opacityOf(hovered.locator('.ic-name')), { message: 'leaving puts the name away' }).toBe('0')
  })

  test('the picked tile keeps its name when the pointer has moved off it', async ({ page }) => {
    const tiles = page.locator('.ig .ic')
    await tiles.nth(3).click()
    await expect(page.locator('.ig .ic.is-picked')).toHaveCount(1)
    await page.mouse.move(2, 2)
    await expect.poll(() => opacityOf(page.locator('.ig .ic.is-picked .ic-name')), { message: 'the picked name stays drawn' }).toBe('1')
    expect(await opacityOf(page.locator('.ig .ic:not(.is-picked) .ic-name').first()), 'an unpicked, unhovered tile').toBe('0')
  })
})

test.describe('where nothing can hover (390, touch)', () => {
  /** A phone-shaped context: the touch media queries only answer in an isMobile context. */
  async function phone(browser) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
    const page = await ctx.newPage()
    watch(page, PERSONA)
    await go(page, '/create/icons')
    await loadedCells(page)
    expect(await page.evaluate(() => matchMedia('(hover: none)').matches), 'positive control: this context cannot hover').toBe(true)
    return { ctx, page }
  }

  test('on touch the name is always drawn', async ({ browser }) => {
    const { ctx, page } = await phone(browser)
    try {
      const names = page.locator('.ig .ic .ic-name')
      expect(await names.count()).toBeGreaterThan(0)
      const hidden = await names.evaluateAll((els) => els.filter((el) => getComputedStyle(el).opacity !== '1').length)
      expect(hidden, 'names not at full opacity with no hover').toBe(0)
      await expect(names.first()).toBeVisible()
    } finally { await ctx.close() }
  })

  test('on touch the pack label is not drawn', async ({ browser }) => {
    const { ctx, page } = await phone(browser)
    try {
      const packs = page.locator('.ig .ic .ic-pack')
      expect(await packs.count(), 'the label is in the markup').toBeGreaterThan(0)
      const displays = await packs.evaluateAll((els) => els.map((el) => getComputedStyle(el).display))
      expect(new Set(displays)).toEqual(new Set(['none']))
    } finally { await ctx.close() }
  })
})
