// THE HEADER SEARCH LISTS ONLY PAGES THAT EXIST, AND THE PALETTE TOOLBAR FITS AND GRADIENT SAYS
// WHEN THEY CANNOT ACT.
//
//   1. Search rows land on the page their label names (the Learn guides and the
//      brand guides), and a row with no page behind it is not offered —
//      including in the list shown before anything is typed.
//   2. The Palette toolbar stays on one line across screen widths.
//   3. Gradient Colours: Palette with fewer than two palette colours says so: the
//      Palette choice stays focusable but inert (aria-disabled), its description
//      and the toast a press raises give the reason, the palette row falls back to
//      the starter colours with a "Make a palette" link, and Random still works.
//      From two colours up Palette is chosen, Random draws only from the palette,
//      and the Pick... choice is offered.
//   4. The workspace is one target and one label everywhere it is offered: the
//      header icon, the account popover and the phone menu sheet.
//   5. A search row for a Learn guide carries no Documentation pill.
//
// MUTATION: point `docs-design` at '/docs-design' in toolIndex.js, or drop
// `offerableCategories` from the empty-query list in CommandPalette.jsx, or
// let the Palette toolbar wrap, or point the header bookmark Link, the popover row or
// the sheet row in PillNav.jsx back at '/discover/palettes', or give a Learn
// guide row in toolIndex.js a category again, or (Gradient) drop `unavailable: palettePoor`
// from the Palette source option, drop its `reason`, or set `sparse` to `chips.length < 1`,
// or name the no-colour link something else: the matching test goes red.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

async function openSearch(page) {
  await page.locator('.pnav-search-field:visible').first().click()
  const dialog = page.getByRole('dialog', { name: /search/i })
  await expect(dialog).toBeVisible()
  return dialog
}

// A row by its visible label, scoped to the open dialog (inactive views stay
// mounted, so nothing outside the dialog is searched).
const rowByLabel = (dialog, label) => dialog.locator('.cp-item').filter({
  has: dialog.page().locator('.cp-item-label', { hasText: new RegExp(`^${label}$`) }),
})

test.describe('header search · rows land on real pages', () => {
  test.beforeEach(async ({ page }) => { watch(page, 'someone using the header search') })

  // Today no category is a page you can be sent to (every Create group home
  // bounces to its first tool and /docs lands on the Learn hub), so the list
  // offers no category row at all. The expected count is a fixed 0, not read
  // from the data, so a category that gains a page has to be added here on
  // purpose. A category row is the one with the "Category" pill.
  const categoryRows = (dialog) => dialog.locator('.cp-item').filter({
    has: dialog.page().locator('.cp-item-cat', { hasText: /^Category$/ }),
  })

  test('the empty-query list offers no category row, because no category is a page', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, '/create/palette')
    const dialog = await openSearch(page)
    const labels = await dialog.locator('.cp-item-label').allTextContents()
    // POSITIVE CONTROL: the list is really there, with real tool rows.
    expect(labels.length, 'the empty-query list rendered').toBeGreaterThan(10)
    expect(labels, 'a real tool is still offered').toContain('Palette')
    await expect(categoryRows(dialog), 'a category row is offered although no category is a page').toHaveCount(0)
    await expect(dialog.locator('.cp-section-label', { hasText: /^Categories$/ }), 'an empty Categories section is rendered').toHaveCount(0)
    expect(labels, 'UI Builder has no page and must not be offered').not.toContain('UI Builder')
    expect(labels, 'Documentation only reaches a hub and must not be offered').not.toContain('Documentation')
    await expect(dialog.getByRole('option', { name: /^UI Builder/ })).toHaveCount(0)
  })

  test('typing a page-less or retired category name offers no category row and no Resources row', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, '/create/palette')
    const dialog = await openSearch(page)
    const input = dialog.locator('.cp-input')
    // POSITIVE CONTROL: a typed query that should match does show a tool row.
    await input.fill('palette')
    await expect(rowByLabel(dialog, 'Palette').first()).toBeVisible()
    for (const query of ['typography', 'imagery', 'icons', 'alt text', 'documentation', 'ui builder', 'resources']) {
      await input.fill(query)
      await expect(input).toHaveValue(query)
      await expect(categoryRows(dialog), `"${query}" offered a category row`).toHaveCount(0)
      await expect(
        dialog.locator('.cp-item-label').filter({ hasText: /^(External )?Resources$/ }),
        `"${query}" offered a Resources row, and that page is gone`,
      ).toHaveCount(0)
    }
  })

  const ROWS = [
    { label: 'Design Principles', path: '/learn/principles' },
    { label: 'UI Design Themes', path: '/learn/theme-systems' },
    { label: 'Brand Colour Guide', path: '/learn/brand-colour' },
  ]
  for (const { label, path } of ROWS) {
    test(`"${label}" opens ${path}`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 })
      await go(page, '/create/palette')
      const dialog = await openSearch(page)
      const row = rowByLabel(dialog, label)
      await expect(row, `"${label}" is in the search list`).toHaveCount(1)
      await row.click()
      await expect.poll(() => new URL(page.url()).pathname, `"${label}" landed somewhere else`).toBe(path)
    })
  }

  test('typed search does not offer the Learn topics that have no guide yet', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, '/create/palette')
    const dialog = await openSearch(page)
    for (const [query, gone] of [
      ['marketing', 'Marketing Fundamentals'],
      ['seo', 'SEO for Small Business'],
      ['claude', 'AI Coding Assistants'],
      ['social', 'Social & Marketing'],
    ]) {
      await dialog.locator('.cp-input').fill(query)
      await expect(dialog.locator('.cp-item-label').filter({ hasText: new RegExp(`^${gone}$`) }), `"${gone}" has no page`).toHaveCount(0)
    }
    // And a typed query for a real guide still finds it.
    await dialog.locator('.cp-input').fill('brand colour')
    await expect(rowByLabel(dialog, 'Brand Colour Guide')).toHaveCount(1)
  })

  test('a Learn guide row has no Documentation pill; a tool row keeps its pill', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, '/create/palette')
    const dialog = await openSearch(page)
    for (const label of ['Design Principles', 'Brand Colour Guide']) {
      const row = rowByLabel(dialog, label)
      await expect(row, `"${label}" is in the search list`).toHaveCount(1)
      await expect(row.locator('.cp-item-cat'), `"${label}" is badged with a category that is not a page`).toHaveCount(0)
    }
    // POSITIVE CONTROL: a row that is a page keeps its pill.
    await expect(rowByLabel(dialog, 'SEO Specialist').locator('.cp-item-cat')).toHaveText('Documentation')
  })
})

// ── Dashboard: header button, phone tab ─────────────────────────────────────

test.describe('header · Dashboard is one target and one label', () => {
  test.beforeEach(async ({ page }) => { watch(page, 'someone pressing the header Dashboard button') })

  test('at 1440 the labelled header button lands on /projects', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, '/discover/palettes')
    expect(new URL(page.url()).pathname, 'the test starts away from /projects').toBe('/discover/palettes')
    const button = page.locator('.pnav-actions').getByRole('link', { name: 'Dashboard' })
    await expect(button).toBeVisible()
    await expect(button.locator('.pnav-act-label')).toBeVisible()
    await button.click()
    await expect.poll(() => new URL(page.url()).pathname, 'the Dashboard button landed somewhere else').toBe('/projects')
  })

  test('at 800 the Dashboard button stays in the header as an icon, with no popover duplicate', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 900 })
    await go(page, '/discover/palettes')
    const button = page.locator('.pnav-actions').getByRole('link', { name: 'Dashboard' })
    await expect(button).toBeVisible()
    await expect(button).toHaveAttribute('title', 'Dashboard')
    await page.getByRole('button', { name: 'Menu', exact: true }).click()
    await expect(page.locator('#pnav-account-pop').getByRole('link', { name: 'Dashboard' })).toHaveCount(0)
  })

  test.describe('on a phone', () => {
    test.use({ viewport: { width: 390, height: 844 }, hasTouch: true })

    test('the Dashboard tab lands on /projects and the sheet has no Dashboard, Export or Back to the site row', async ({ page }) => {
      await go(page, '/discover/palettes')
      await expect(page.locator('.pnav-tab', { hasText: 'Dashboard' })).toHaveAttribute('href', '/projects')
      await page.getByRole('button', { name: 'Open menu' }).click()
      const sheet = page.locator('.pnav-sheet')
      await expect(sheet).toBeVisible()
      await expect(sheet.getByRole('link', { name: 'Dashboard' })).toHaveCount(0)
      await expect(sheet.getByRole('button', { name: 'Export', exact: true })).toHaveCount(0)
      await expect(sheet.getByText('Back to the site')).toHaveCount(0)
    })
  })
})

// Palette toolbar

async function oneRow(page) {
  return page.locator('[data-tool-toolbar]').evaluate((bar) => {
    const kids = [...bar.children].filter((k) => k.getBoundingClientRect().width > 0)
    const centres = kids.map((k) => Math.round(k.getBoundingClientRect().top + k.getBoundingClientRect().height / 2))
    return {
      kids: kids.length,
      spread: Math.max(...centres) - Math.min(...centres),
      right: Math.round(bar.getBoundingClientRect().right),
      vw: window.innerWidth,
      height: Math.round(bar.getBoundingClientRect().height),
    }
  })
}

test.describe('Palette Builder toolbar fits on one line', () => {
  test.beforeEach(async ({ page }) => { watch(page, 'someone using the Palette toolbar') })

  for (const width of [390, 768, 1440]) {
    test(`the toolbar stays on one line at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await go(page, '/create/palette')
      const bar = page.locator('[data-tool-toolbar]')
      await expect(bar).toBeVisible()
      await expect(bar).not.toHaveClass(/is-measuring/)

      // POSITIVE CONTROL: the row is the real one, with its siblings on it.
      await expect(bar.getByRole('button', { name: 'Randomise' })).toBeAttached()

      const row = await oneRow(page)
      expect(row.kids, 'the toolbar rendered its controls').toBeGreaterThanOrEqual(3)
      expect(row.spread, `${width}px: toolbar children sit on more than one line`).toBeLessThanOrEqual(2)
      expect(row.right, `${width}px: the toolbar runs past the screen`).toBeLessThanOrEqual(row.vw)
      expect(row.height, `${width}px: the toolbar is ${row.height}px tall — a second row`).toBeLessThan(72)

      // Extra tools remains reachable and lists the palette actions.
      const tools = bar.getByRole('button', { name: 'Extra tools', exact: true })
      await expect(tools).toBeVisible()
      await tools.click()
      const panel = page.getByRole('dialog', { name: 'Extra tools' })
      await expect(panel).toBeVisible()
      await expect(panel.getByRole('button', { name: 'Reset palette', exact: true }), 'the menu is the real one').toBeVisible()
    })
  }
})

// ── Random from the palette (Colours: Palette) ───────────────────────────────

const NEEDS = 'Needs a palette with two or more colours'
const randomPanel = (page) => page.getByRole('complementary', { name: 'Gradient controls' })
const coloursRow = (page) => randomPanel(page).getByRole('radiogroup', { name: 'Colours' })
const paletteChoice = (page) => coloursRow(page).getByRole('radio', { name: 'Palette', exact: true })
const anyChoice = (page) => coloursRow(page).getByRole('radio', { name: 'Any', exact: true })
const makePaletteLink = (page) => page.locator('.grd .grd-paint').getByRole('link', { name: 'Make a palette' })
const stopHexes = (page) => page.getByRole('button', { name: /^Select stop \d+, #/ })
  .evaluateAll((els) => els.map((e) => /#[0-9A-F]{6}/i.exec(e.getAttribute('aria-label'))[0].toUpperCase()))

const withPaletteOf = (page, colors) => page.addInitScript((list) => {
  localStorage.setItem('vs-current-design', JSON.stringify({
    palette: { base: list[0] || '#0051FF', harmony: 'auto', extraColors: [], activeIdx: 0, colors: list },
  }))
}, colors)

test.describe('Gradient · Colours: Palette without a usable palette says so', () => {
  test.beforeEach(async ({ page }) => { watch(page, 'someone choosing Colours: Palette before making a palette') })

  // A fresh visit holds one seed colour, which is not a gradient; no colour at all is the other edge.
  for (const [what, colors] of [['a fresh visit (the one seed colour)', null], ['no colours at all', []], ['one colour', ['#0051FF']]]) {
    test(`${what}: Palette is offered but inert, says why, and Random still works`, async ({ page }) => {
      if (colors) await withPaletteOf(page, colors)
      await page.setViewportSize({ width: 1440, height: 900 })
      await go(page, '/create/gradient')
      const palette = paletteChoice(page)
      await expect(palette).toBeVisible()
      // aria-disabled keeps the choice focusable and pressable, so the reason is read and the press can explain itself.
      await expect(palette).toHaveAttribute('aria-disabled', 'true')
      await expect(palette, 'the reason is its accessible description').toHaveAccessibleDescription(NEEDS)
      await expect(palette).toHaveAttribute('aria-checked', 'false')
      await expect(anyChoice(page)).toHaveAttribute('aria-checked', 'true')
      await palette.click({ force: true })
      await expect(page.locator('.toast.show'), 'the press says why').toContainText(NEEDS)
      await expect(palette, 'a press on an inert choice does not select it').toHaveAttribute('aria-checked', 'false')
      await expect(anyChoice(page)).toHaveAttribute('aria-checked', 'true')

      // The palette row falls back to the starter colours and offers the way to make a palette.
      await expect(page.getByRole('button', { name: 'Colour source' })).toContainText('Starter colours')
      const link = makePaletteLink(page)
      await expect(link).toHaveAttribute('href', '/create/palette')
      // POSITIVE CONTROL: the row is not an empty box. The starter colours fill it, nine slots at most.
      const slots = await page.getByRole('group', { name: 'Palette colours' }).locator('> *').count()
      expect(slots).toBeGreaterThanOrEqual(2)
      expect(slots, 'the row holds nine slots at most').toBeLessThanOrEqual(9)

      // Random is not blocked: it still builds a gradient from fresh colours.
      const code = page.locator('.grd-code-text code')
      const before = await code.textContent()
      await page.locator('[data-tool-toolbar]').getByRole('button', { name: 'Random', exact: true }).click()
      await expect.poll(() => code.textContent()).not.toBe(before)

      await link.click()
      await expect.poll(() => new URL(page.url()).pathname).toBe('/create/palette')
    })
  }

  for (const width of [320, 390]) {
    test(`at ${width}px the Colours row and the reason fit the screen, no More sheet needed`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 })
      await go(page, '/create/gradient')
      const row = coloursRow(page)
      await expect(row).toBeVisible()
      for (const choice of await row.getByRole('radio').all()) {
        const box = await choice.boundingBox()
        expect(box.x, 'a Colours choice starts inside the screen').toBeGreaterThanOrEqual(0)
        expect(box.x + box.width, `a Colours choice runs past the ${width}px screen`).toBeLessThanOrEqual(width)
      }
      await paletteChoice(page).click({ force: true })
      await expect(page.locator('.toast.show')).toContainText(NEEDS)
      expect(await page.evaluate(() => document.documentElement.scrollWidth), 'the page scrolls sideways').toBeLessThanOrEqual(width)
    })
  }

  test('with a palette of three colours Palette is chosen, Random builds from those colours, and the starters go', async ({ page }) => {
    const PALETTE = ['#0051FF', '#FF5A1F', '#12B76A']
    await withPaletteOf(page, PALETTE)
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, '/create/gradient')
    const palette = paletteChoice(page)
    await expect(palette).not.toHaveAttribute('aria-disabled', /.*/)
    await palette.click()
    await expect(palette).toHaveAttribute('aria-checked', 'true')
    // The toolbar's Random wears the narrowed dot: Colours is no longer Any.
    const random = page.locator('.grd [data-tool-toolbar]').getByRole('button', { name: 'Random', exact: true })
    await expect(random).toHaveClass(/is-narrowed/)
    await random.click()
    // POSITIVE CONTROL: the press did something, and said where it drew from.
    await expect(page.locator('.toast.show')).toContainText('from your palette')
    await expect(page.locator('.toast.show')).not.toContainText(NEEDS)
    // Every stop is one of the three palette colours (a fresh roll would almost never land on them).
    for (const hex of await stopHexes(page)) expect(PALETTE, `stop ${hex} is a palette colour`).toContain(hex)
    // POSITIVE CONTROL: the three chips are there, so "no note" is not "no row".
    await expect(page.getByRole('group', { name: 'Palette colours' }).getByRole('button')).toHaveCount(3)
    await expect(makePaletteLink(page)).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Colour source' })).toContainText('Current palette')
    // A palette has colours to pick from.
    await expect(coloursRow(page).getByRole('radio', { name: 'Pick…', exact: true })).toBeVisible()
  })
})
