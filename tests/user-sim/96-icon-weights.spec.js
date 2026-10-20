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
  [...document.querySelectorAll(sel)].map((c) => c.getAttribute('aria-label').replace(/^Customise /, '')), REAL_CELL)

test.describe('the icon weight segment', () => {
  for (const width of [1440, 390]) {
    test(`Flags keeps its group and grid when a disabled weight is clicked at ${width}px`, async ({ page }) => {
      watch(page, 'someone browsing Flags and reaching for Bold')
      await page.setViewportSize({ width, height: 900 })
      await signIn(page, { plan: 'pro' })
      await go(page, '/create/icons')
      await expect(page.locator(REAL_CELL).first()).toBeVisible({ timeout: 20000 })

      const filters = page.getByRole('button', { name: /^Filters\b/ })
      const sheet = page.getByRole('dialog', { name: 'Filters' })
      const inPanel = await filters.isVisible()
      if (inPanel) await filters.click()
      const flags = page.getByRole('button', { name: 'Flags', exact: true })
      if (!await flags.isVisible()) await page.getByRole('button', { name: /^Group\b/ }).click()
      await flags.click()
      if (await sheet.isVisible()) await sheet.getByRole('button', { name: 'Done', exact: true }).click()
      else if (inPanel) await filters.click()

      await expect(page.locator(REAL_CELL).first()).toBeVisible({ timeout: 20000 })
      const seg = width === 390
        ? page.locator('.lbry-toolbar-quick .ig-weight')
        : page.getByRole('group', { name: 'Icon weight' })
      await expect(seg).toBeVisible()
      for (const label of ['Regular', 'Bold', 'Fill', 'Duo']) {
        const chip = seg.getByRole('button', { name: new RegExp(`^${label}`) })
        await expect(chip).toHaveAttribute('aria-disabled', 'true')
        await expect(chip).toHaveAccessibleName(new RegExp(`${label}.*Flags come in one style`))
        await expect(chip).toHaveAttribute('title', 'Flags come in one style')
      }
      const before = await cellNames(page)
      expect(before.length).toBeGreaterThan(0)
      await seg.getByRole('button', { name: /^Bold/ }).click({ force: true })
      expect(await cellNames(page)).toEqual(before)

      if (inPanel) await filters.click()
      if (!await flags.isVisible()) await page.getByRole('button', { name: /^Group\b/ }).click()
      await expect(flags).toHaveAttribute('aria-pressed', 'true')
    })
  }

  test('Bold, Fill and Duo each show only the glyphs a pack drew at that weight', async ({ page }) => {
    watch(page, 'someone switching the icon library to Bold')
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, '/create/icons')
    await expect(page.locator(REAL_CELL).first()).toBeVisible({ timeout: 20000 })
    const seg = page.getByRole('group', { name: 'Icon weight' })
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
    await chooseMenuOption(page, page.getByRole('button', { name: 'Icon pack' }), 'lucide')
    const seg = page.getByRole('group', { name: 'Icon weight' })
    const bold = seg.getByRole('button', { name: /^Bold/ })
    await expect(bold).toHaveAttribute('aria-disabled', 'true')
    // The reason is in the name, not only in a tooltip a keyboard never sees.
    await expect(bold).toHaveAccessibleName(/drawn by Phosphor only/)
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
    const copy = page.locator('.icust-panel').getByRole('button', { name: /^Copy SVG$/ })
    await expect(copy).toBeVisible()
    const hit = await copy.evaluate((el) => {
      const r = el.getBoundingClientRect()
      const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
      return { bottom: r.bottom, vh: window.innerHeight, reachable: el === top || el.contains(top) }
    })
    expect(hit.bottom, 'Copy SVG is below the bottom of the screen').toBeLessThanOrEqual(hit.vh)
    expect(hit.reachable, 'Copy SVG is covered').toBe(true)
  })
})
