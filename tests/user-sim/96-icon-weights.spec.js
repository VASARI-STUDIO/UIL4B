// THE ICON WEIGHTS ARE REAL — Regular / Bold / Fill / Duo.
//
// the weight tabs the design's phone mock
// draws under the icon search are built for real. A weight swaps each glyph for
// the weight the pack's designers drew (Phosphor `-bold`, `-fill`, `-duotone`;
// Heroicons `-solid`; Tabler `-filled`; Iconoir `-solid`). A weight the current
// scope cannot honour is disabled WITH its reason, never faked.
//
// Served from the Iconify fixture (tests/user-sim/fixtures/iconify), whose
// Phosphor collection carries a handful of each weight.
import { test, expect } from './base.js'
import { chooseMenuOption, go, signIn, watch } from './helpers.js'

// A REAL cell, not the loading skeleton: while the catalogue is in flight the
// grid draws `.ic.ig-skel` placeholders that are visible but carry no
// aria-label and no glyph, so waiting for "the first .ic" returns on them and
// the names read next are nothing to do with a weight.
const REAL_CELL = '.ig .ic:not(.ig-skel)'

const cellNames = (page) => page.evaluate((sel) =>
  [...document.querySelectorAll(sel)].map((c) => c.getAttribute('aria-label').replace(/^Customise /, '').replace(/, [^,]+$/, '')), REAL_CELL)

/** Bring a control into view: if the toolbar has folded it into the Filters panel, open the panel (waits for the toolbar to settle). */
async function reveal(page, target) {
  await expect(page.locator('.ig-toolbar')).toBeVisible({ timeout: 20000 })
  await page.evaluate(() => document.fonts.ready)
  // The toolbar re-measures as the grid and fonts land; a panel opened mid-measure is closed again, so wait for a steady stage.
  const stage = () => page.locator('.ig-toolbar').getAttribute('data-stage')
  let seen = await stage()
  await expect.poll(async () => { await page.waitForTimeout(400); const now = await stage(); const steady = now === seen; seen = now; return steady }, { timeout: 15000 }).toBe(true)
  if (await target.isVisible()) return
  const filters = page.getByRole('button', { name: /^Filters\b/ })
  if (await filters.isVisible() && await filters.getAttribute('aria-expanded') !== 'true') await filters.click()
  await expect(target).toBeVisible({ timeout: 20000 })
}

test.describe('the icon weight segment', () => {
  for (const width of [390, 768, 1440]) {
    test(`Coloured swaps the weight bar for its type bar and All restores the stored weight at ${width}px`, async ({ page }) => {
      watch(page, 'someone browsing Coloured icons then returning to their chosen weight')
      await page.setViewportSize({ width, height: 900 })
      await signIn(page, { plan: 'pro' })
      await go(page, '/create/icons')
      await expect(page.locator(REAL_CELL).first()).toBeVisible({ timeout: 20000 })

      const filters = page.getByRole('button', { name: /^Filters\b/ })
      const sheet = page.getByRole('dialog', { name: 'Filters' })
      const inPanel = await filters.isVisible()
      const showFilters = async () => {
        if (inPanel && await filters.getAttribute('aria-expanded') !== 'true') await filters.click()
      }
      const hideFilters = async () => {
        if (await sheet.isVisible()) await sheet.getByRole('button', { name: 'Done', exact: true }).click()
        else if (inPanel && await filters.getAttribute('aria-expanded') === 'true') await filters.click()
      }
      // The style bar and the category control sit in the Filters panel when the row folds.
      const weights = page.getByRole('group', { name: 'Icon weight' })
      await reveal(page, weights)
      await weights.getByRole('button', { name: /^Bold/ }).click()
      await expect(weights.getByRole('button', { name: /^Bold/ })).toHaveAttribute('aria-pressed', 'true')
      const trackWidth = (await weights.boundingBox()).width
      // The reason's live region is already in place, empty, so it is announced when a hint fills it.
      await expect(weights.getByRole('status')).toHaveText('')

      // MUTATION: render the Icon weight options in every category -> no 'Coloured icon type' group.
      const category = page.getByRole('group', { name: 'Icon category' }).first()
      await reveal(page, category)
      await category.getByRole('button', { name: /^Coloured/ }).click()
      const types = page.getByRole('group', { name: 'Coloured icon type' })
      await expect(types).toBeVisible()
      await expect(page.getByRole('group', { name: 'Icon weight' })).toHaveCount(0)
      await expect(types.locator('.ig-weight-btn')).toHaveText(['Brands', 'Flags', 'Flat'])
      // None pressed until one is chosen, and the track is the width of the weight bar's, so nothing beside it moves.
      await expect(types.locator('.ig-weight-btn[aria-pressed="true"]')).toHaveCount(0)
      expect((await types.boundingBox()).width).toBeCloseTo(trackWidth, 0)
      await expect(types.getByRole('status')).toHaveText('')
      // A control, not plain text: the track keeps its pill ground.
      await expect(types).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
      await types.getByRole('button', { name: 'Flags', exact: true }).click()
      await expect(types.getByRole('button', { name: 'Flags', exact: true })).toHaveAttribute('aria-pressed', 'true')
      await hideFilters()
      await expect(page.locator(REAL_CELL).first()).toBeVisible({ timeout: 20000 })

      if (inPanel) {
        // The panel takes focus when it opens, and no segment shows a focus ring it did not earn.
        await showFilters()
        const panel = sheet.or(page.locator('.lbry-filterpop-panel')).first()
        await expect(panel).toBeFocused()
        await expect(page.locator('.ig-weight-btn:focus')).toHaveCount(0)
        await expect(panel).toHaveCSS('outline-style', 'none')
        await hideFilters()
      }

      // MUTATION: reset weightRef when the category changes -> Bold is not pressed again here.
      await reveal(page, category)
      await category.getByRole('button', { name: /^All/ }).click()
      await expect(weights.locator('.ig-weight-btn')).toHaveCount(4)
      await expect(weights.getByRole('status')).toHaveText('')
      await expect(weights.getByRole('button', { name: /^Bold/ })).toHaveAttribute('aria-pressed', 'true')
      await hideFilters()
      await expect.poll(async () => (await cellNames(page)).length, { timeout: 15000 }).toBeGreaterThan(0)
      await expect.poll(async () => (await cellNames(page)).filter((n) => !/-bold$/.test(n)), { timeout: 15000 }).toEqual([])
    })
  }


  test('Bold, Fill and Duo each show only the glyphs a pack drew at that weight', async ({ page }) => {
    watch(page, 'someone switching the icon library to Bold')
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, '/create/icons')
    await expect(page.locator(REAL_CELL).first()).toBeVisible({ timeout: 20000 })
    const seg = page.getByRole('group', { name: 'Icon weight' })
    await reveal(page, seg)
    await expect(seg.getByRole('button', { name: 'Regular', exact: true })).toHaveAttribute('aria-pressed', 'true')

    const regular = await cellNames(page)
    // Positive control: Regular really is the outlined weight, with no suffixes.
    expect(regular.length).toBeGreaterThan(5)
    expect(regular.filter((n) => /-(bold|fill|duotone)$/.test(n))).toEqual([])

    for (const [label, suffix] of [['Bold', /-bold$/], ['Fill', /-(fill|solid|filled)$/], ['Duo', /-duotone$/]]) {
      await seg.getByRole('button', { name: new RegExp(`^${label}`) }).click()
      await expect(seg.getByRole('button', { name: new RegExp(`^${label}`) })).toHaveAttribute('aria-pressed', 'true')
      await expect.poll(async () => (await cellNames(page)).length, { timeout: 15000 }).toBeGreaterThan(0)
      const names = await cellNames(page)
      expect(names.filter((n) => !suffix.test(n)), `${label} showed glyphs of another weight`).toEqual([])
    }
  })

  test('a pack that does not draw a weight says so, and cannot be switched to it', async ({ page }) => {
    watch(page, 'someone browsing Lucide and reaching for Bold')
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, '/create/icons')
    await expect(page.locator(REAL_CELL).first()).toBeVisible({ timeout: 20000 })
    const packMenu = page.getByRole('button', { name: 'Icon pack' })
    await reveal(page, packMenu)
    await chooseMenuOption(page, packMenu, 'lucide')
    const seg = page.getByRole('group', { name: 'Icon weight' })
    await reveal(page, seg)
    const bold = seg.getByRole('button', { name: /^Bold/ })
    await expect(bold).toHaveAttribute('aria-disabled', 'true')
    await expect(bold).toHaveAttribute('aria-pressed', 'false')
    await expect(bold).toHaveCSS('text-decoration-line', 'none')
    // The reason is in the name, not only in a tooltip a keyboard never sees.
    // It names the packs that do draw Bold, Phosphor first.
    await expect(bold).toHaveAccessibleName(/drawn by Phosphor(?:, [^,]+)* only$/)
    // Until Lucide's own listing lands the grid still shows the "All packs" cells, so a read
    // taken now is the old view and differs from the Lucide list that replaces it.
    // Signed out the count is not drawn; the single-pack view is the one with no pack name on its cells.
    await expect(page.locator('.ig .ic .ic-pack')).toHaveCount(0, { timeout: 15000 })
    const before = await cellNames(page)
    await bold.click({ force: true })
    await expect(seg.getByRole('button', { name: 'Regular', exact: true })).toHaveAttribute('aria-pressed', 'true')
    expect(await cellNames(page)).toEqual(before)
  })

  test('on a phone the segment sits on screen under the search, as the mock draws it', async ({ page }) => {
    watch(page, 'someone opening the icon library on a phone')
    await page.setViewportSize({ width: 390, height: 844 })
    await go(page, '/create/icons')
    const seg = page.locator('.lbry-toolbar-quick .ig-weight')
    await expect(seg).toBeVisible({ timeout: 20000 })
    const box = await seg.boundingBox()
    expect(box.y + box.height, 'the weight segment is below the fold').toBeLessThan(844)
    // Four columns, and the first icons on the first screen.
    await expect(page.locator(REAL_CELL).first()).toBeVisible({ timeout: 20000 })
    const cols = await page.evaluate(() => getComputedStyle(document.querySelector('.ig')).gridTemplateColumns.split(' ').length)
    expect(cols).toBe(4)
    const firstTop = await page.locator(REAL_CELL).first().evaluate((e) => e.getBoundingClientRect().top)
    expect(firstTop, 'the first icon sits below the fold on a phone').toBeLessThan(844)
  })

  // Copy SVG stays on the first screen of the customizer on a phone: the
  // actions ride the bottom of the panel's scroller now.
  test('on a phone the customizer keeps Copy SVG on the first screen of the panel', async ({ page }) => {
    watch(page, 'someone customising an icon on a phone')
    await page.setViewportSize({ width: 390, height: 844 })
    await go(page, '/create/icons')
    await page.locator(REAL_CELL).first().click({ timeout: 20000 })
    const copy = page.locator('.ied').getByRole('button', { name: /^Copy SVG$/ })
    await expect(copy).toBeVisible()
    // The sheet slides up as it opens: read the box once the finite animations have finished.
    await page.evaluate(() => Promise.all(document.getAnimations().filter((a) => Number.isFinite(a.effect?.getComputedTiming().endTime)).map((a) => a.finished.catch(() => {}))))
    const hit = await copy.evaluate((el) => {
      const r = el.getBoundingClientRect()
      const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
      return { bottom: r.bottom, vh: window.innerHeight, reachable: el === top || el.contains(top) }
    })
    expect(hit.bottom, 'Copy SVG is below the bottom of the screen').toBeLessThanOrEqual(hit.vh)
    expect(hit.reachable, 'Copy SVG is covered').toBe(true)
  })
})
