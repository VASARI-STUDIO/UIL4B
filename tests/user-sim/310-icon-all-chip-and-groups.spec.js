// ICON LIBRARY: THE "ALL ICONS" CHIP, AND THE PREMADE GROUPS ADDED WITH IT.
//
//   1. The group chip row starts with "All icons", pressed at rest. Pressing a group then All icons
//      clears the group, keeps the search text and shows the mixed packs again.
//   2. The row has four chips (All icons, Coloured, Brand logos, Flags) in whichever form the toolbar
//      gives them, and the toolbar row never wraps at 390, 768 or 1440.
//   3. The premade groups added (Tech brands, Payments & crypto and the rest) are listed on the Groups tab:
//      locked cards signed out, open with every glyph painted on Pro.
//
// Artwork is served from the Iconify fixture (tests/user-sim/iconify-stub.js).
//
// MUTATIONS (each turns a test red):
//   - drop ALL_ICONS_OPTION from groupOptions in IconLibrary.jsx -> tests 1 and 2.
//   - pass `value={group}` (null) instead of `group || ALL_ICONS_ID` -> the "pressed at rest" check in test 1.
//   - make handleGroupToggle('all') keep the group -> the "clears the group" check in test 1.
//   - clear the query in handleGroupToggle -> the "keeps the search text" check in test 1.
//   - delete the 'tech-brands' group from src/data/iconGroups.js -> test 3.
import { test, expect } from './base.js'
import { chooseMenuOption, go, signIn, watch } from './helpers.js'
import { withProIcons } from '../../src/data/iconGroups.js'
import { resolveLibrary } from '../../api/_lib/library/load.js'

// The groups with the Pro lists the library serves (the same resolver the API mock uses).
const GROUPS = withProIcons((await resolveLibrary()).PRO_ICON_GROUPS)

const ADDED = ['Dashboard & analytics', 'App navigation', 'Code & terminal', 'Portfolio & creative', 'Events & tickets', 'Tech brands', 'Payments & crypto', 'Languages & frameworks']
const CHIPS = ['All icons', 'Coloured', 'Brand logos', 'Flags']
const REAL_CELL = '.ig .ic:not(.ig-skel)'

/** Open the group chips wherever the toolbar keeps them (tray, Group menu, or the Filters panel/sheet). */
async function openTray(page) {
  await expect(page.locator('.ig-toolbar')).toBeVisible({ timeout: 20000 })
  await page.evaluate(() => document.fonts.ready)
  const tray = page.getByRole('group', { name: 'Filter by icon group' }).first()
  if (await tray.isVisible()) return tray
  const filters = page.getByRole('button', { name: /^Filters\b/ })
  if (await filters.isVisible() && await filters.getAttribute('aria-expanded') !== 'true') await filters.click()
  if (!await tray.isVisible()) {
    const trigger = page.locator('.lbry-filtertrig', { hasText: 'Group' }).first()
    if (await trigger.isVisible()) await trigger.click()
  }
  await expect(tray).toBeVisible({ timeout: 20000 })
  return tray
}

/** Press a chip by name, opening whatever holds it first. */
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

test('All icons is pressed at rest; a group then All icons clears the group and keeps the search', async ({ page }) => {
  watch(page, 'a designer narrowing the icon library to brand logos and coming back')
  await page.setViewportSize({ width: 1440, height: 900 })
  await signIn(page, { plan: 'pro' })
  await go(page, '/create/icons')
  await expect(page.locator(REAL_CELL).first()).toBeVisible({ timeout: 20000 })

  const rest = await chipState(page)
  expect(rest.map((c) => c.name.replace(/ · .*$/, '')), 'PRESENCE: the four chips, All icons first').toEqual(CHIPS)
  expect(rest.map((c) => c.pressed), 'All icons is the only pressed chip at rest').toEqual(['true', 'false', 'false', 'false'])

  const search = page.getByRole('searchbox', { name: /search icons/i }).or(page.getByPlaceholder(/search icons/i)).first()
  // A brand name, so the Brand logos group has matches to show.
  await search.fill('github')
  await press(page, 'Brand logos')
  await expect.poll(async () => (await chipState(page)).map((c) => c.pressed), { timeout: 20000, message: 'Brand logos pressed, All icons released' }).toEqual(['false', 'false', 'true', 'false'])

  await press(page, 'All icons')
  await expect.poll(async () => (await chipState(page)).map((c) => c.pressed), { timeout: 20000, message: 'All icons pressed again' }).toEqual(['true', 'false', 'false', 'false'])
  await expect(search, 'the search text survives').toHaveValue('github')
  await expect(page.locator(REAL_CELL).first()).toBeVisible({ timeout: 20000 })

  // Pressing it again at rest changes nothing.
  await press(page, 'All icons')
  expect((await chipState(page)).map((c) => c.pressed)).toEqual(['true', 'false', 'false', 'false'])
})

// MUTATION: drop `allIcons ? '' :` from scopePack in handleGroupToggle -> the pack stays on Tabler.
test('All icons also clears a chosen pack, so the grid is every pack again', async ({ page }) => {
  watch(page, 'a designer who narrowed to one pack and wants everything back')
  await page.setViewportSize({ width: 1440, height: 900 })
  await signIn(page, { plan: 'pro' })
  await go(page, '/create/icons')
  await expect(page.locator(REAL_CELL).first()).toBeVisible({ timeout: 20000 })
  const packMenu = page.getByRole('button', { name: 'Icon pack' })
  await chooseMenuOption(page, packMenu, 'tabler')
  await expect(packMenu).not.toHaveText(/All packs/)
  await press(page, 'All icons')
  await expect(packMenu, 'the pack menu is back on All packs').toHaveText(/All packs/)
  await expect(page.locator(REAL_CELL).first()).toBeVisible({ timeout: 20000 })
})

for (const width of [390, 768, 1440]) {
  test(`${width}: four group chips, and the toolbar row does not wrap`, async ({ browser }) => {
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
      expect(chips.length, 'chip count').toBe(4)
      expect(chips[0]).toMatchObject({ name: 'All icons', pressed: 'true' })
      // One chip height for the row, 44px on a touch screen like every other chip.
      expect(new Set(chips.map((c) => c.h)).size, 'All icons is the same height as its siblings').toBe(1)
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
