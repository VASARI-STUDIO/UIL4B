// ICON LIBRARY: THE CATEGORY CONTROL'S "ALL" OPTION, AND THE PREMADE GROUPS ADDED WITH IT.
//
//   1. The category control starts on "All", pressed at rest. Pressing Coloured then All clears the category,
//      keeps the search text and shows the mixed packs again.
//   2. The control has four options (All, Coloured, Animated, Editable) in whichever form the toolbar gives
//      them, and the toolbar row never wraps at 390, 768 or 1440. A pack the new category cannot hold goes
//      back to "All packs"; a pack it can hold stays.
//   3. The premade groups added (Tech brands, Payments & crypto and the rest) are listed on the Groups tab:
//      locked cards signed out, open with every glyph painted on Pro.
//
// Artwork is served from the Iconify fixture (tests/user-sim/iconify-stub.js). The full category behaviour
// (style bar, scopes, locks, URL) is in 437-icon-category-control.spec.js; this file keeps the All option and
// the Groups tab.
//
// MUTATIONS (each turns a test red):
//   - drop the All entry from categoryOptions in IconLibrary.jsx -> tests 1 and 2.
//   - pass `value={category}` as '' instead of 'all' -> the "pressed at rest" check in test 1.
//   - make handleCategory('all') keep the old group -> the "clears the category" check in test 1.
//   - clear the query in handleCategory -> the "keeps the search text" check in test 1.
//   - make handleCategory keep a pack the new category cannot hold -> test 2.
//   - delete the 'tech-brands' group from src/data/iconGroups.js -> test 3.
import { test, expect } from './base.js'
import { chooseMenuOption, go, signIn, watch } from './helpers.js'
import { withProIcons } from '../../src/data/iconGroups.js'
import { resolveLibrary } from '../../api/_lib/library/load.js'

// The groups with the Pro lists the library serves (the same resolver the API mock uses).
const GROUPS = withProIcons((await resolveLibrary()).PRO_ICON_GROUPS)

const ADDED = ['Dashboard & analytics', 'App navigation', 'Code & terminal', 'Portfolio & creative', 'Events & tickets', 'Tech brands', 'Payments & crypto', 'Languages & frameworks']
const OPTIONS = ['All', 'Coloured', 'Animated', 'Editable']
const REAL_CELL = '.ig .ic:not(.ig-skel)'

/** Open the category options wherever the toolbar keeps them (tray, Category menu, or the Filters panel/sheet). */
async function openTray(page) {
  await expect(page.locator('.ig-toolbar')).toBeVisible({ timeout: 20000 })
  await page.evaluate(() => document.fonts.ready)
  const tray = page.getByRole('group', { name: 'Icon category' }).first()
  if (await tray.isVisible()) return tray
  const filters = page.getByRole('button', { name: /^Filters\b/ })
  if (await filters.isVisible() && await filters.getAttribute('aria-expanded') !== 'true') await filters.click()
  if (!await tray.isVisible()) {
    const trigger = page.locator('.lbry-filtertrig', { hasText: 'Category' }).first()
    if (await trigger.isVisible()) await trigger.click()
  }
  await expect(tray).toBeVisible({ timeout: 20000 })
  return tray
}

/** Press an option by name, opening whatever holds it first. */
async function press(page, name) {
  const tray = await openTray(page)
  await tray.getByRole('button', { name: new RegExp(`^${name}`) }).click()
}

const chipState = async (page) => {
  const tray = await openTray(page)
  return tray.locator('.lbry-filter').evaluateAll((els) => els.map((b) => ({
    name: b.textContent.replace(/\s+/g, ' ').trim(),
    pressed: b.getAttribute('aria-pressed'),
    h: Math.round(b.getBoundingClientRect().height),
  })))
}

/** The Icon pack menu, wherever the toolbar keeps it: on the row when it fits, otherwise in the Filters panel. */
async function packMenu(page) {
  const onRow = page.locator('.ig-toolbar').getByRole('button', { name: 'Icon pack' })
  if (await onRow.isVisible()) return onRow
  const filters = page.getByRole('button', { name: /^Filters\b/ })
  if (await filters.isVisible() && await filters.getAttribute('aria-expanded') !== 'true') await filters.click()
  const inPanel = page.getByRole('dialog', { name: 'Filters' }).or(page.getByRole('group', { name: 'Filters', exact: true })).getByRole('button', { name: 'Icon pack' })
  await expect(inPanel).toBeVisible({ timeout: 20000 })
  return inPanel
}

test('All is pressed at rest; Coloured then All clears the category and keeps the search', async ({ page }) => {
  watch(page, 'a designer narrowing the icon library to coloured icons and coming back')
  await page.setViewportSize({ width: 1440, height: 900 })
  await signIn(page, { plan: 'pro' })
  await go(page, '/create/icons')
  await expect(page.locator(REAL_CELL).first()).toBeVisible({ timeout: 20000 })

  const rest = await chipState(page)
  expect(rest.map((c) => c.name.replace(/ · .*$/, '')), 'PRESENCE: the four options, All first').toEqual(OPTIONS)
  expect(rest.map((c) => c.pressed), 'All is the only pressed option at rest').toEqual(['true', 'false', 'false', 'false'])

  const search = page.getByRole('searchbox', { name: /search icons/i }).or(page.getByPlaceholder(/search icons/i)).first()
  // A brand name, so the Coloured category has matches to show.
  await search.fill('github')
  await press(page, 'Coloured')
  await expect.poll(async () => (await chipState(page)).map((c) => c.pressed), { timeout: 20000, message: 'Coloured pressed, All released' }).toEqual(['false', 'true', 'false', 'false'])

  await press(page, 'All')
  await expect.poll(async () => (await chipState(page)).map((c) => c.pressed), { timeout: 20000, message: 'All pressed again' }).toEqual(['true', 'false', 'false', 'false'])
  await expect(search, 'the search text survives').toHaveValue('github')
  await expect(page.locator(REAL_CELL).first()).toBeVisible({ timeout: 20000 })

  // Pressing it again at rest changes nothing.
  await press(page, 'All')
  expect((await chipState(page)).map((c) => c.pressed)).toEqual(['true', 'false', 'false', 'false'])
})

// MUTATION: make handleCategory keep `pack` whatever the category can hold -> the pack stays on Tabler in Coloured.
test('a pack the new category cannot hold goes back to All packs; one it can hold stays', async ({ page }) => {
  watch(page, 'a designer who narrowed to one pack and then changed category')
  await page.setViewportSize({ width: 1440, height: 900 })
  await signIn(page, { plan: 'pro' })
  await go(page, '/create/icons')
  await expect(page.locator(REAL_CELL).first()).toBeVisible({ timeout: 20000 })
  await chooseMenuOption(page, await packMenu(page), 'tabler')
  await expect(await packMenu(page)).not.toHaveText(/All packs/)

  // Tabler is a line pack, so Editable holds it.
  await press(page, 'Editable')
  await expect(await packMenu(page), 'Editable holds Tabler, so the pack stays').not.toHaveText(/All packs/)
  // Coloured has no Tabler: the scope falls back to every coloured pack.
  await press(page, 'Coloured')
  await expect(await packMenu(page), 'Coloured cannot hold Tabler, so the pack menu is back on All packs').toHaveText(/All packs/)
  await expect(page.locator(REAL_CELL).first()).toBeVisible({ timeout: 20000 })
})

for (const width of [390, 768, 1440]) {
  test(`${width}: four category options, and the toolbar row does not wrap`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width, height: 900 }, ...(width === 390 ? { hasTouch: true, isMobile: true } : {}) })
    try {
      const page = await ctx.newPage()
      watch(page, 'someone checking the icon toolbar at a set width')
      await signIn(page, { plan: 'pro' })
      await go(page, '/create/icons')
      await expect(page.locator(REAL_CELL).first()).toBeVisible({ timeout: 20000 })
      await page.waitForTimeout(400)

      const rows = await page.evaluate(() => {
        const row = document.querySelector('.ig-toolbar .lbry-toolbar-row')
        const centres = new Set([...row.children].filter((c) => c.getBoundingClientRect().width > 0)
          .map((c) => Math.round(c.getBoundingClientRect().top + c.getBoundingClientRect().height / 2)))
        return { lines: centres.size, overflow: row.scrollWidth - row.clientWidth, page: document.documentElement.scrollWidth - document.documentElement.clientWidth }
      })
      expect(rows.lines, `the toolbar row wrapped at ${width}`).toBe(1)
      expect(rows.overflow, `the toolbar row scrolls sideways at ${width}`).toBeLessThanOrEqual(0)
      expect(rows.page, `the page scrolls sideways at ${width}`).toBeLessThanOrEqual(0)

      const chips = await chipState(page)
      expect(chips.length, 'option count').toBe(4)
      expect(chips[0]).toMatchObject({ name: 'All', pressed: 'true' })
      // One option height for the row, 44px on a touch screen like every other chip.
      expect(new Set(chips.map((c) => c.h)).size, 'All is the same height as its siblings').toBe(1)
      if (width === 390) expect(chips[0].h, 'coarse target').toBeGreaterThanOrEqual(44)
    } finally { await ctx.close() }
  })
}

test('the added premade groups are listed on the Groups tab, locked signed out and open on Pro', async ({ page }) => {
  watch(page, 'someone looking for a ready-made brand set')
  await page.setViewportSize({ width: 1280, height: 900 })
  await go(page, '/create/icons/groups')
  const cards = page.locator('.igp-cards > li:not(.geg-fade *)')
  await expect(cards).toHaveCount(GROUPS.length, { timeout: 15000 })
  for (const label of ADDED) {
    await expect(page.locator('.lockt-card--group').filter({ hasText: label }), `${label} is a locked card signed out`).toHaveCount(1)
  }
})

test('a Pro viewer opens Tech brands and every glyph paints', async ({ page }) => {
  watch(page, 'a Pro designer opening the tech brands set')
  await signIn(page, { plan: 'pro' })
  await page.setViewportSize({ width: 1280, height: 900 })
  const tech = GROUPS.find((g) => g.id === 'tech-brands')
  await go(page, '/create/icons/groups')
  await expect(page.locator('.igp-cards a.igp-card:not(.geg-fade *)')).toHaveCount(GROUPS.length, { timeout: 15000 })
  await expect(page.locator('.igp-cards a.igp-card:not(.geg-fade *)').filter({ hasText: 'Payments & crypto' })).toHaveCount(1)
  await go(page, `/create/icons/groups?group=${tech.id}`)
  await expect(page.getByRole('heading', { level: 2, name: 'Tech brands' })).toBeVisible()
  await expect(page.locator('.igp-grid .ic img')).toHaveCount(tech.icons.length, { timeout: 15000 })
})
