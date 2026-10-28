// THE HEADER SEARCH LISTS ONLY PAGES THAT EXIST, AND THE PALETTE TOOLBAR FITS AND GRADIENT SAYS
// WHEN THEY CANNOT ACT.
//
//   1. Search rows land on the page their label names (the Learn guides and the
//      brand guides), and a row with no page behind it is not offered —
//      including in the list shown before anything is typed.
//   2. The Palette toolbar stays on one line across screen widths.
//   3. Gradient "Shuffle from palette" with fewer than two palette colours says
//      so: the Available colours section holds the note and a link to the
//      Palette Builder (on the Colours label row), the starter pairs and starter
//      colours stand in, a press scrolls the note into view and gives it focus,
//      and a toast and the button's own description say the same thing. From two
//      colours up the sparse layout goes and "Choose colours for Shuffle" appears.
//   4. The workspace is one target and one label everywhere it is offered: the
//      header icon, the account popover and the phone menu sheet.
//   5. A search row for a Learn guide carries no Documentation pill.
//
// MUTATION: point `docs-design` at '/docs-design' in toolIndex.js, or drop
// `offerableCategories` from the empty-query list in CommandPalette.jsx, or
// let the Palette toolbar wrap, or make
// `fromPalette` in GradientGenerator.jsx return without `setPaletteMissing`
// or without its toast, or point the header bookmark Link, the popover row or
// the sheet row in PillNav.jsx back at '/discover/palettes', or give a Learn
// guide row in toolIndex.js a category again, or drop the scroll/focus effect
// from the Available colours note, or take the aria-describedby off the
// Shuffle from palette button, or (G1) set `sparse` to `chips.length < 1`, hide
// the "Choose colours for Shuffle" button, name the no-colour link "Open Palette
// Builder", or empty STARTER_PAIRS in the sparse section: the matching test goes red.
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

// ── Shuffle from palette ─────────────────────────────────────────────────────

const NEEDS = 'Needs a palette with two or more colours'
const ONE_COLOUR_NOTE = 'Add a second colour in Palette Builder to shuffle from it.'
const NO_PALETTE_NOTE = 'No palette yet. Start from a pair or a starter colour, or make a palette.'
const shuffleButton = (page) => page.locator('.grd [data-tool-toolbar]').getByRole('button', { name: /^Shuffle from palette/ })
const availNote = (page) => page.locator('.grd .grd-avail-note')
// The way to the Palette Builder sits on the Colours label row of the sparse section,
// beside the note rather than after it. With no colour at all it reads "Make a palette".
const builderLink = (page, name = 'Open Palette Builder') => page.locator('.grd .grd-avail-subrow').getByRole('link', { name })

// Phone: open More, wait for the sheet to come to rest, press Shuffle from palette.
async function fromPaletteViaMore(page) {
  await page.locator('[data-tool-toolbar]').getByRole('button', { name: 'More', exact: true }).click()
  const sheet = page.getByRole('dialog', { name: 'More' })
  await expect(sheet).toBeVisible()
  const fromPalette = sheet.getByRole('button', { name: /^Shuffle from palette/ })
  // The sheet slides up; wait until its row has come to rest on screen. On
  // screen is not at rest: the row's bottom edge passes 844 while it is still
  // about 80px below its resting place, which is a whole row, so a press
  // aimed at it lands on the row beneath once the slide finishes. The click
  // is forced (the row is aria-disabled, which a normal click refuses), and a
  // forced click does not wait for the target to stop. So wait for every
  // animation that ends to have ended.
  await expect.poll(async () => {
    const b = await fromPalette.boundingBox()
    return b ? Math.round(b.y + b.height) : 99999
  }).toBeLessThanOrEqual(844)
  await expect.poll(
    () => page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running' && a.effect.getComputedTiming().iterations !== Infinity).length),
    { message: 'the More sheet is still sliding up' },
  ).toBe(0)
  await fromPalette.click({ force: true })
  await expect(sheet).toBeHidden()
  return availNote(page)
}

const withPaletteOf = (page, colors) => page.addInitScript((list) => {
  localStorage.setItem('vs-current-design', JSON.stringify({
    palette: { base: list[0] || '#0051FF', harmony: 'auto', extraColors: [], activeIdx: 0, colors: list },
  }))
}, colors)

test.describe('Gradient · Shuffle from palette without a usable palette says so', () => {
  test.beforeEach(async ({ page }) => { watch(page, 'someone pressing Shuffle from palette before making a palette') })

  test('a fresh visit: the note is already in Available colours; a press toasts, moves focus to it, and its link opens the Palette Builder', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, '/create/gradient')
    const main = page.locator('.grd')
    const note = availNote(page)
    // A fresh visit already holds the one seed colour, which is not a gradient.
    // The note is part of the section from the start, not something a press makes.
    await expect(note).toBeVisible()
    await expect(note).toHaveText(ONE_COLOUR_NOTE)
    await expect(note, 'nothing has been pressed, so focus is elsewhere').not.toBeFocused()
    await expect(main.locator('.grd-note--palette, .grd-live'), 'the canvas note and its live region are gone').toHaveCount(0)

    // aria-disabled is how the button looks unavailable while staying
    // pressable, so Playwright's own "enabled" check is skipped on purpose.
    const button = shuffleButton(page)
    await expect(button).toHaveAttribute('aria-disabled', 'true')
    await expect(button, 'the reason is its accessible description').toHaveAccessibleDescription(NEEDS)
    await expect(button).toHaveAccessibleName('Shuffle from palette')
    await button.click({ force: true })
    await expect(page.locator('.toast.show'), 'the press says why').toContainText(NEEDS)
    await expect(note, 'focus did not move to the note').toBeFocused()

    const link = builderLink(page)
    await expect(link).toHaveCount(1)
    await expect(link).toHaveAttribute('href', '/create/palette')
    await link.click()
    await expect.poll(() => new URL(page.url()).pathname).toBe('/create/palette')
  })

  test('with no colours at all the note says there is no palette yet, and the starter colours stand in', async ({ page }) => {
    await withPaletteOf(page, [])
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, '/create/gradient')
    await shuffleButton(page).click({ force: true })
    const note = availNote(page)
    await expect(note).toBeVisible()
    await expect(note).toHaveText(NO_PALETTE_NOTE)
    await expect(note).toBeFocused()
    // With no colour the link offers to make one, not to open a builder that is empty.
    await expect(builderLink(page, 'Make a palette')).toHaveAttribute('href', '/create/palette')
    await expect(builderLink(page, 'Open Palette Builder')).toHaveCount(0)
    // POSITIVE CONTROL: the section is not an empty box, the ten starter colours and the six pairs are in it.
    await expect(page.getByRole('group', { name: 'Colours', exact: true }).getByRole('button')).toHaveCount(10)
    await expect(page.getByRole('group', { name: 'Pairs', exact: true }).getByRole('button')).toHaveCount(6)
  })

  test('with one colour the note says what is needed, not that there is no palette', async ({ page }) => {
    await withPaletteOf(page, ['#0051FF'])
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, '/create/gradient')
    await shuffleButton(page).click({ force: true })
    const note = availNote(page)
    await expect(note).toBeVisible()
    await expect(note).toHaveText(ONE_COLOUR_NOTE)
    await expect(note, 'a one-colour palette is not "no palette"').not.toContainText('No palette yet')
    await expect(note).toBeFocused()
    await expect(builderLink(page)).toHaveAttribute('href', '/create/palette')
    await expect(builderLink(page, 'Make a palette'), 'one colour is a palette to open, not one to make').toHaveCount(0)
    // POSITIVE CONTROL: the one colour is a chip, and the pairs stand beside it.
    await expect(page.getByRole('group', { name: 'Colours', exact: true }).getByRole('button')).toHaveCount(1)
    await expect(page.getByRole('group', { name: 'Pairs', exact: true }).getByRole('button')).toHaveCount(6)
  })

  for (const width of [320, 390]) {
    test(`from the phone More sheet at ${width}px the note takes focus and stays inside the screen`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 })
      await go(page, '/create/gradient')
      const note = await fromPaletteViaMore(page)
      await expect(note).toBeVisible()
      await expect(note, 'focus did not move to the note').toBeFocused()
      await expect(page.locator('.toast.show')).toContainText(NEEDS)
      const box = await note.boundingBox()
      expect(box.x, 'the note starts inside the screen').toBeGreaterThanOrEqual(0)
      expect(box.x + box.width, `the note runs past the ${width}px screen`).toBeLessThanOrEqual(width)
      const link = await builderLink(page).boundingBox()
      expect(link.x, 'the link starts inside the screen').toBeGreaterThanOrEqual(0)
      expect(link.x + link.width, 'the link runs past the screen').toBeLessThanOrEqual(width)
      expect(await page.evaluate(() => document.documentElement.scrollWidth), 'the page scrolls sideways').toBeLessThanOrEqual(width)
    })
  }

  test('on a phone scrolled right down the note is scrolled into view, clear of the sticky toolbar', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.setViewportSize({ width: 390, height: 844 })
    await go(page, '/create/gradient')
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
    // POSITIVE CONTROL: the page really is scrolled, and the note's own place
    // (the panel's first section) is above the fold.
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(300)
    const bar = page.locator('[data-tool-toolbar]')
    const before = await availNote(page).boundingBox()
    const barBox = await bar.boundingBox()
    expect(before.y + before.height, 'the note starts hidden, above or under the toolbar').toBeLessThanOrEqual(barBox.y + barBox.height)
    const note = await fromPaletteViaMore(page)
    await expect(note).toBeVisible()
    await expect(note).toBeFocused()
    await expect.poll(async () => {
      const [n, b] = await Promise.all([note.boundingBox(), bar.boundingBox()])
      return n.y >= b.y + b.height - 1 && n.y + n.height <= 844
    }, 'the note is off screen or under the toolbar').toBe(true)
  })

  test('with a palette of two colours it builds a gradient and the section shows no note', async ({ page }) => {
    await withPaletteOf(page, ['#0051FF', '#FF5A1F', '#12B76A'])
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, '/create/gradient')
    await shuffleButton(page).click()
    // POSITIVE CONTROL: the press did something (a gradient was built).
    await expect(page.locator('.toast.show')).toContainText('from your palette')
    await expect(page.locator('.toast.show')).not.toContainText(NEEDS)
    await expect(availNote(page)).toHaveCount(0)
    await expect(page.locator('.grd .grd-sparse'), 'a palette of two or more leaves the sparse layout').toHaveCount(0)
    await expect(shuffleButton(page)).not.toHaveAttribute('aria-disabled', /.*/)
    // POSITIVE CONTROL: the three chips are there, so "no note" is not "no section".
    await expect(page.getByRole('group', { name: 'Palette colours' }).getByRole('button')).toHaveCount(3)
    // A palette has a Shuffle pool to choose; the starter pairs have gone.
    await expect(page.getByRole('button', { name: 'Choose colours for Shuffle' })).toBeVisible()
    await expect(page.getByRole('group', { name: 'Pairs', exact: true })).toHaveCount(0)
  })
})
