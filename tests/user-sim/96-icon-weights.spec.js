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
import { go, watch } from './helpers.js'

const cellNames = (page) => page.evaluate(() =>
  [...document.querySelectorAll('.ig .ic')].map((c) => c.getAttribute('aria-label').replace(/^Customise /, '')))

test.describe('the icon weight segment', () => {
  test('Bold, Fill and Duo each show only the glyphs a pack drew at that weight', async ({ page }) => {
    watch(page, 'someone switching the icon library to Bold')
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, '/create/icons')
    await expect(page.locator('.ig .ic').first()).toBeVisible({ timeout: 20000 })
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
    await expect(page.locator('.ig .ic').first()).toBeVisible({ timeout: 20000 })
    await page.locator('select[aria-label="Icon pack"]').selectOption('lucide')
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
    await expect(page.locator('.ig .ic').first()).toBeVisible({ timeout: 20000 })
    const cols = await page.evaluate(() => getComputedStyle(document.querySelector('.ig')).gridTemplateColumns.split(' ').length)
    expect(cols).toBe(4)
    const firstTop = await page.locator('.ig .ic').first().evaluate((e) => e.getBoundingClientRect().top)
    expect(firstTop, 'the first icon sits below the fold on a phone').toBeLessThan(844)
  })

  // Copy SVG stays on the first screen of the customizer on a phone: the
  // actions ride the bottom of the panel's scroller now.
  test('on a phone the customizer keeps Copy SVG on the first screen of the panel', async ({ page }) => {
    watch(page, 'someone customising an icon on a phone')
    await page.setViewportSize({ width: 390, height: 844 })
    await go(page, '/create/icons')
    await page.locator('.ig .ic').first().click({ timeout: 20000 })
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
