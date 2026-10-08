// THE HEADER SEARCH LISTS ONLY PAGES THAT EXIST, AND THE PALETTE TOOLBAR FITS AND GRADIENT SAYS
// WHEN THEY CANNOT ACT.
//
//   1. Search rows land on the page their label names (the Learn guides and the
//      curated resources), and a row with no page behind it is not offered —
//      including in the list shown before anything is typed.
//   2. The Palette toolbar stays on one line across screen widths.
//   3. Gradient "From palette" with fewer than two palette colours says so on
//      the page, with a link to the Palette Builder; the note is scrolled into
//      view and takes focus, and dismissing it returns focus to what opened it.
//   4. The workspace is one target and one label everywhere it is offered: the
//      header icon, the account popover and the phone menu sheet.
//   5. A search row for a Learn guide carries no Documentation pill.
//
// MUTATION: point `docs-design` at '/docs-design' in toolIndex.js, or drop
// `offerableCategories` from the empty-query list in CommandPalette.jsx, or
// let the Palette toolbar wrap, or make
// `fromPalette` in GradientGenerator.jsx return without `setPaletteMissing(true)`,
// or point the header bookmark Link, the popover row or the sheet row in
// PillNav.jsx back at '/discover/palettes', or give a Learn guide row in
// toolIndex.js a category again, or drop the scroll/focus effect or the focus
// return from the From palette note: the matching test below goes red.
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

  test('the empty-query list offers no category that is not a page', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, '/create/palette')
    const dialog = await openSearch(page)
    const labels = await dialog.locator('.cp-item-label').allTextContents()
    // POSITIVE CONTROL: the list is really there, categories included.
    expect(labels.length, 'the empty-query list rendered').toBeGreaterThan(10)
    expect(labels, 'a real category is still offered').toContain('Resources')
    expect(labels, 'UI Builder has no page and must not be offered').not.toContain('UI Builder')
    expect(labels, 'Documentation only reaches a hub and must not be offered').not.toContain('Documentation')
    await expect(dialog.getByRole('option', { name: /^UI Builder/ })).toHaveCount(0)
  })

  const ROWS = [
    { label: 'Design Principles', path: '/learn/principles' },
    { label: 'UI Design Themes', path: '/learn/theme-systems' },
    { label: 'Brand Colour Guide', path: '/learn/brand-colour' },
    { label: 'External Resources', path: '/discover/resources' },
    { label: 'Resources', path: '/discover/resources' },
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

// ── From palette ─────────────────────────────────────────────────────────────

const activeLabel = (page) => page.evaluate(() => {
  const el = document.activeElement
  return el ? (el.getAttribute('aria-label') || el.textContent || el.tagName).trim() : ''
})

// Phone: open More, wait for the sheet to come to rest, press From palette.
async function fromPaletteViaMore(page) {
  await page.locator('[data-tool-toolbar]').getByRole('button', { name: 'More', exact: true }).click()
  const sheet = page.getByRole('dialog', { name: 'More' })
  await expect(sheet).toBeVisible()
  const fromPalette = sheet.getByRole('button', { name: /^From palette/ })
  // The sheet slides up; wait until its row has come to rest on screen.
  await expect.poll(async () => {
    const b = await fromPalette.boundingBox()
    return b ? Math.round(b.y + b.height) : 99999
  }).toBeLessThanOrEqual(844)
  await fromPalette.click({ force: true })
  await expect(sheet).toBeHidden()
  return page.locator('.grd .grd-note--palette')
}

const withPaletteOf = (page, colors) => page.addInitScript((list) => {
  localStorage.setItem('vs-current-design', JSON.stringify({
    palette: { base: list[0] || '#0051FF', harmony: 'auto', extraColors: [], activeIdx: 0, colors: list },
  }))
}, colors)

test.describe('Gradient · From palette without a usable palette says so', () => {
  test.beforeEach(async ({ page }) => { watch(page, 'someone pressing From palette before making a palette') })

  test('a fresh visit: the note is visible, takes focus, links to the Palette Builder, and dismisses back to the button', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, '/create/gradient')
    const main = page.locator('.grd')
    const note = main.locator('.grd-note--palette')
    await expect(note, 'the note is not there before anything is pressed').toHaveCount(0)
    // The live region is mounted and empty before anything happens: one that
    // appears already full is often not announced.
    const live = main.locator('.grd-live')
    await expect(live).toHaveAttribute('role', 'status')
    await expect(live).toBeEmpty()

    // aria-disabled is how the button looks unavailable while staying
    // pressable, so Playwright's own "enabled" check is skipped on purpose.
    const button = main.locator('[data-tool-toolbar]').getByRole('button', { name: /^From palette/ })
    await button.click({ force: true })
    await expect(note).toBeVisible()
    await expect(live.locator('.grd-note--palette'), 'the note is inside the live region').toHaveCount(1)
    // A fresh visit already holds the one seed colour, which is not a gradient.
    await expect(note).toContainText('Needs a palette with two or more colours.')
    await expect(note.getByRole('link')).toHaveAttribute('href', '/create/palette')
    await expect(note, 'focus did not move to the note').toBeFocused()

    await note.getByRole('button', { name: 'Dismiss' }).click()
    await expect(note).toHaveCount(0)
    await expect(live).toBeEmpty()
    await expect(button, 'focus was lost when the note went away').toBeFocused()

    await button.click({ force: true })
    await note.getByRole('link').click()
    await expect.poll(() => new URL(page.url()).pathname).toBe('/create/palette')
  })

  test('with no colours at all the note says there is no palette yet', async ({ page }) => {
    await withPaletteOf(page, [])
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, '/create/gradient')
    await page.locator('.grd [data-tool-toolbar]').getByRole('button', { name: /^From palette/ }).click({ force: true })
    const note = page.locator('.grd .grd-note--palette')
    await expect(note).toBeVisible()
    await expect(note).toContainText('No palette yet.')
    await expect(note.getByRole('link', { name: 'Make one in Palette Builder' })).toHaveAttribute('href', '/create/palette')
  })

  test('with one colour the note says what is needed, not that there is no palette', async ({ page }) => {
    await withPaletteOf(page, ['#0051FF'])
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, '/create/gradient')
    await page.locator('.grd [data-tool-toolbar]').getByRole('button', { name: /^From palette/ }).click({ force: true })
    const note = page.locator('.grd .grd-note--palette')
    await expect(note).toBeVisible()
    await expect(note).toContainText('Needs a palette with two or more colours.')
    await expect(note, 'a one-colour palette is not "no palette"').not.toContainText('No palette yet.')
    await expect(note.getByRole('link', { name: 'Add colours in Palette Builder' })).toHaveAttribute('href', '/create/palette')
  })

  for (const width of [320, 390]) {
    test(`from the phone More sheet at ${width}px the note shows, stays inside the screen and dismisses back to More`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 })
      await go(page, '/create/gradient')
      const note = await fromPaletteViaMore(page)
      await expect(note).toBeVisible()
      await expect(note, 'focus did not move to the note').toBeFocused()
      const box = await note.boundingBox()
      expect(box.x, 'the note starts inside the screen').toBeGreaterThanOrEqual(0)
      expect(box.x + box.width, `the note runs past the ${width}px screen`).toBeLessThanOrEqual(width)
      const link = await note.getByRole('link').boundingBox()
      expect(link.x + link.width, 'the link runs past the screen').toBeLessThanOrEqual(width)
      const dismiss = await note.getByRole('button', { name: 'Dismiss' }).boundingBox()
      expect(dismiss.x + dismiss.width, 'the dismiss control runs past the screen').toBeLessThanOrEqual(width)
      expect(await page.evaluate(() => document.documentElement.scrollWidth), 'the page scrolls sideways').toBeLessThanOrEqual(width)

      await note.getByRole('button', { name: 'Dismiss' }).click()
      await expect(note).toHaveCount(0)
      expect(await activeLabel(page), 'focus was lost when the note went away').toBe('More')
    })
  }

  test('on a phone scrolled down the note is scrolled into view, clear of the sticky toolbar', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.setViewportSize({ width: 390, height: 844 })
    await go(page, '/create/gradient')
    await page.evaluate(() => window.scrollTo(0, 700))
    // POSITIVE CONTROL: the page really is scrolled, so the note's own place
    // (above the canvas) is above the fold.
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(300)
    const note = await fromPaletteViaMore(page)
    await expect(note).toBeVisible()
    await expect(note).toBeFocused()
    await expect.poll(async () => {
      const [n, bar] = await Promise.all([note.boundingBox(), page.locator('[data-tool-toolbar]').boundingBox()])
      return n.y >= bar.y + bar.height - 1 && n.y + n.height <= 844
    }, 'the note is off screen or under the toolbar').toBe(true)
  })

  test('with a palette of two colours it builds a gradient and shows no note', async ({ page }) => {
    await withPaletteOf(page, ['#0051FF', '#FF5A1F', '#12B76A'])
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, '/create/gradient')
    await page.locator('.grd [data-tool-toolbar]').getByRole('button', { name: /^From palette/ }).click()
    // POSITIVE CONTROL: the press did something (a gradient was built).
    await expect(page.locator('.toast.show')).toContainText('from your palette')
    await expect(page.locator('.grd .grd-note--palette')).toHaveCount(0)
  })
})
