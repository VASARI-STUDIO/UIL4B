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

test.describe('the icon weight segment', () => {
  for (const width of [390, 768, 1440]) {
    test(`Flags shows its single style as text and restores the stored weight at ${width}px`, async ({ page }) => {
      watch(page, 'someone browsing Flags then returning to their chosen weight')
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
      if (width !== 390) await showFilters()
      const seg = page.locator('.ig-weight')
      await seg.getByRole('button', { name: /^Bold/ }).click()
      await expect(seg.getByRole('button', { name: /^Bold/ })).toHaveAttribute('aria-pressed', 'true')
      const trackWidth = (await seg.boundingBox()).width
      // The reason's live region is already in place, empty, so it is announced
      // when a group change fills it.
      await expect(seg.getByRole('status')).toHaveText('')

      await showFilters()
      const flags = page.getByRole('button', { name: 'Flags', exact: true })
      if (!await flags.isVisible()) await page.getByRole('button', { name: /^Group\b/ }).click()
      await flags.click()
      await expect(seg.locator('.ig-weight-btn')).toHaveCount(0)
      const status = seg.getByRole('status')
      await expect(status).toHaveText('These icons come in one style')
      await expect(status).toHaveAttribute('title', 'These icons come in one style')
      expect((await seg.boundingBox()).width).toBeCloseTo(trackWidth, 0)
      // Plain text, not a control: no pill ground behind it, normal weight, and
      // it starts where the first segment's label starts.
      await expect(seg).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
      await expect(status).toHaveCSS('font-weight', '400')
      await expect(status).toHaveCSS('text-align', 'left')
      await expect(status).not.toHaveAttribute('tabindex', /.*/)
      await hideFilters()
      await expect(page.locator(REAL_CELL).first()).toBeVisible({ timeout: 20000 })

      if (inPanel) {
        await showFilters()
        const panel = page.locator(width === 390 ? '.lbry-sheet' : '.lbry-filterpop-panel')
        await expect(panel).toBeFocused()
        await expect(page.locator('.ig-weight-btn:focus')).toHaveCount(0)
        await expect(panel).toHaveCSS('outline-style', 'none')
        await expect(status).toBeVisible()
        await hideFilters()
        await filters.focus()
        await filters.press('Enter')
        const firstControl = panel.locator('button:not([disabled]):not([aria-disabled="true"])').first()
        await expect(firstControl).toBeFocused()
      }

      if (!await flags.isVisible()) await page.getByRole('button', { name: /^Group\b/ }).click()
      await expect(flags).toHaveAttribute('aria-pressed', 'true')
      await flags.click()
      await expect(seg.locator('.ig-weight-btn')).toHaveCount(4)
      await expect(seg.getByRole('status')).toHaveText('')
      await expect(seg.getByRole('button', { name: /^Bold/ })).toHaveAttribute('aria-pressed', 'true')
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
    await expect(bold).toHaveAttribute('aria-pressed', 'false')
    await expect(bold).toHaveCSS('text-decoration-line', 'none')
    // The reason is in the name, not only in a tooltip a keyboard never sees.
    await expect(bold).toHaveAccessibleName(/drawn by Phosphor only/)
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
