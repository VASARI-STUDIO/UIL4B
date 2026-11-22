// THE ICON AND EMOJI LIBRARIES CAN BE SORTED, AND THE CHOICE IS ONE CHOICE FOR BOTH.
//
// A "Sort" menu in the filter row (in the Filters panel where the row has no room, and on a
// phone): Recommended (the library's own order, "Best match" while a search is typed), Name A-Z,
// Name Z-A and Pack. What a person relies on, and what this file pins:
//   - Name A-Z orders the WHOLE result, not the page that happens to be loaded: the cells that
//     arrive on "show more" carry on exactly where the last page stopped, with the pack scope still
//     applied;
//   - Name Z-A is the exact reverse, and going back to Recommended restores today's order;
//   - the word "Sort" is on the control, and the default reads "Best match" once a search is typed;
//   - the choice carries over to the other library, which is then sorted too.
//
// HOW TO SEE EACH FAIL (src/ unless named):
//   IconLibrary `icons` memo returns the fetched list unsorted       -> "Name A-Z orders the whole result"
//   sortLibraryList sorts a page-sized slice instead of the whole    -> "Name A-Z orders the whole result"
//   sortLibraryList 'recommended' branch sorts too                   -> "...restores the order it started in"
//   LibrarySort drops `triggerLabel` (no word "Sort" on the control)  -> "the default reads Best match"
//   sortOptions stops renaming the default while searching           -> "the default reads Best match"
//   librarySort.js keeps the choice per library instead of in one    -> "the choice carries over"
//   EmojiLibrary `results` ignores `sort`                            -> "the choice carries over"
//   src restored byte for byte                                       -> all of them pass again.
import fs from 'node:fs'
import path from 'node:path'
import { test, expect } from './base.js'
import { chooseMenuOption, go, signIn, watch } from './helpers.js'
import { ICONIFY_HOSTS, ICONIFY_STUB_HEADER, SNAPSHOT_PATH_RE, isLiveIconify } from './iconify-stub.js'

const PERSONA = 'a designer who wants the icons and emoji in alphabetical order'
const LIVE = 'the live API decides which icons exist; this spec controls the answers'

const STROKE = '<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>'
const TOTAL = 800
// 337 and 800 share no factor, so this visits every number once, and the pack's own order is NOT
// alphabetical: the first icon is sort-123, then sort-460, then sort-797.
const NAME = (i) => `sort-${String((i * 337 + 123) % TOTAL).padStart(3, '0')}`
const SORTED = Array.from({ length: TOTAL }, (_, i) => `sort-${String(i).padStart(3, '0')}`)

/** Serve `TOTAL` names for the pack `lucide`, in a scrambled order, and the glyphs for whichever are asked. */
async function serveScrambledPack(page) {
  const prefix = 'lucide'
  const names = Array.from({ length: TOTAL }, (_, i) => NAME(i))
  const headers = { 'access-control-allow-origin': '*', [ICONIFY_STUB_HEADER]: '1' }
  const list = (route) => route.fulfill({ status: 200, contentType: 'application/json', headers, body: JSON.stringify({ prefix, total: TOTAL, title: prefix, uncategorized: names }) })
  // The page reads a pack's list from its own site first, then Iconify: both have to answer.
  await page.route((u) => ICONIFY_HOSTS.includes(u.hostname) && u.pathname === '/collection' && u.searchParams.get('prefix') === prefix, list)
  await page.route((u) => u.pathname.match(SNAPSHOT_PATH_RE)?.[1] === prefix, list)
  await page.route((u) => ICONIFY_HOSTS.includes(u.hostname) && u.pathname === `/${prefix}.json` && u.search.includes('icons='),
    (route) => {
      const asked = (new URL(route.request().url()).searchParams.get('icons') || '').split(',').filter(Boolean)
      const icons = Object.fromEntries(asked.map((n) => [n, { body: STROKE }]))
      return route.fulfill({ status: 200, contentType: 'application/json', headers, body: JSON.stringify({ prefix, width: 24, height: 24, icons, aliases: {} }) })
    })
}

const filtersButton = (page) => page.getByRole('button', { name: /^Filters\b/ })
const filtersSheet = (page) => page.getByRole('dialog', { name: 'Filters' })
const filtersPanel = (page) => filtersSheet(page).or(page.getByRole('group', { name: 'Filters', exact: true }))
const sortButton = (page) => page.getByRole('button', { name: /^Sort\b/ })

/**
 * Open the Filters panel when the Sort menu is in it (a phone, a narrow desktop); do nothing when it
 * is on the row. Returns what closes it again.
 */
async function reachSort(page) {
  const inPanel = !(await sortButton(page).isVisible()) && await filtersButton(page).isVisible()
  if (inPanel) {
    await filtersButton(page).click()
    await expect(filtersPanel(page)).toBeVisible()
  }
  await expect(sortButton(page), 'the library has no Sort menu').toBeVisible()
  return async () => {
    if (await filtersSheet(page).isVisible()) {
      await filtersSheet(page).getByRole('button', { name: 'Done', exact: true }).click()
      await expect(filtersSheet(page)).toBeHidden()
    } else if (inPanel) {
      await filtersButton(page).click()
      await expect(filtersPanel(page)).toBeHidden()
    }
  }
}

async function chooseSort(page, label) {
  const close = await reachSort(page)
  await chooseMenuOption(page, sortButton(page), { label })
  await close()
}

/** The Sort menu's accessible name ("Sort: Name A-Z"), read wherever the menu lives. */
async function sortName(page) {
  const close = await reachSort(page)
  const name = await sortButton(page).getAttribute('aria-label')
  await close()
  return name
}

/** The name of every icon cell mounted, in grid order. */
const iconNames = (page) => page.locator('.ig .ic').evaluateAll((cells) => cells.map((c) => (c.getAttribute('aria-label') || '').replace(/^Customise /, '')))

/** Scroll the grid on until `count` cells are mounted, pressing "Show more icons" where the scroll stops. */
async function revealCells(page, count) {
  await expect.poll(async () => {
    await page.evaluate(() => {
      const end = document.querySelector('.ig-sentinel, .ig-more')
      if (end) end.scrollIntoView({ block: 'end' })
      document.querySelector('.ig-more button')?.click()
    })
    return page.locator('.ig .ic').count()
  }, { timeout: 30_000, message: `the grid never revealed ${count} cells` }).toBeGreaterThanOrEqual(count)
}

async function choosePack(page, pack) {
  const inPanel = !(await page.locator('.ig-toolbar').getByRole('button', { name: 'Icon pack' }).isVisible()) && await filtersButton(page).isVisible()
  if (inPanel) {
    await filtersButton(page).click()
    await expect(filtersPanel(page)).toBeVisible()
  }
  await chooseMenuOption(page, (inPanel ? filtersPanel(page) : page.locator('.ig-toolbar')).getByRole('button', { name: 'Icon pack' }), pack)
  if (await filtersSheet(page).isVisible()) {
    await filtersSheet(page).getByRole('button', { name: 'Done', exact: true }).click()
    await expect(filtersSheet(page)).toBeHidden()
  } else if (inPanel) {
    await filtersButton(page).click()
    await expect(filtersPanel(page)).toBeHidden()
  }
}

test.describe('the icon and emoji libraries sort', () => {
  test.describe('the icon library', () => {
    test.skip(isLiveIconify(), LIVE)

    test('Name A-Z orders the whole result across pages, Name Z-A reverses it, Recommended restores the order it started in', async ({ page }) => {
      watch(page, PERSONA)
      await serveScrambledPack(page)
      await signIn(page, { plan: 'pro' })
      await go(page, '/create/icons')
      await choosePack(page, 'lucide')
      await expect(page.locator('.ig .ic').first()).toBeVisible({ timeout: 20_000 })

      // Today's order, for the round trip at the end. It is the pack's own, which is not alphabetical.
      const started = (await iconNames(page)).slice(0, 40)
      expect(started, 'the stub pack must start out of order, or this spec proves nothing').not.toEqual([...started].sort())

      await chooseSort(page, 'Name A–Z')
      // Two pages and a bit, so the order has to hold across the boundary between pages (PAGE_SIZE is
      // 120), and the first page cannot have been sorted on its own: it holds names 000-119 only if
      // the whole of the 800 was sorted before the page was cut.
      await revealCells(page, 260)
      const az = await iconNames(page)
      expect(az.slice(0, 260), 'Name A-Z must run in order across the page boundary').toEqual(SORTED.slice(0, 260))
      expect(az.every((n) => /^sort-\d{3}$/.test(n)), 'the pack scope still holds: only this pack\'s icons are listed').toBe(true)
      expect(await sortName(page)).toBe('Sort: Name A–Z')

      await chooseSort(page, 'Name Z–A')
      await revealCells(page, 260)
      const za = await iconNames(page)
      expect(za.slice(0, 260), 'Name Z-A runs from the other end').toEqual([...SORTED].reverse().slice(0, 260))

      await chooseSort(page, 'Recommended')
      await expect.poll(async () => (await iconNames(page)).slice(0, 40)).toEqual(started)
    })

    test('the default reads Best match once a search is typed', async ({ page }) => {
      watch(page, PERSONA)
      await go(page, '/create/icons')
      await expect(page.locator('.ig .ic').first()).toBeVisible({ timeout: 20_000 })
      expect(await sortName(page)).toBe('Sort: Recommended')

      await page.getByRole('searchbox', { name: 'Search icons' }).fill('arrow')
      await expect.poll(() => sortName(page)).toBe('Sort: Best match')

      // A chosen sort keeps its own name whether or not a search is typed.
      await chooseSort(page, 'Name A–Z')
      expect(await sortName(page)).toBe('Sort: Name A–Z')
    })

    test('where the Sort menu is in the Filters panel, a changed sort counts on the Filters badge', async ({ page }) => {
      watch(page, PERSONA)
      await page.setViewportSize({ width: 390, height: 844 })
      await go(page, '/create/icons')
      await expect(page.locator('.ig .ic').first()).toBeVisible({ timeout: 20_000 })
      const badge = filtersButton(page).locator('.lbry-filtersbtn-count')
      await expect(badge, 'nothing is filtered yet').toHaveCount(0)

      await chooseSort(page, 'Name A–Z')
      await expect(badge, 'the hidden sort is counted, so the person can see something is set').toHaveText('1')

      await chooseSort(page, 'Recommended')
      await expect(badge, 'back to the default, the badge goes').toHaveCount(0)
    })
  })

  test('the choice carries over to the emoji library, whose emoji are then in name order', async ({ page }) => {
    watch(page, PERSONA)
    // Names live only in the index the emoji library loads on demand; read the same file the app serves.
    const raw = fs.readFileSync(path.join(process.cwd(), 'src', 'data', 'emojiIndex.txt'), 'utf8')
    const strip = (s) => s.replace(/️/g, '')
    const nameOfGlyph = Object.fromEntries(raw.split('\n').filter(Boolean).map((line) => {
      const [glyph, rest = ''] = line.split('\t')
      return [strip(glyph), rest.split('|')[0]]
    }))

    await go(page, '/create/icons')
    await expect(page.locator('.ig .ic').first()).toBeVisible({ timeout: 20_000 })
    await chooseSort(page, 'Name A–Z')

    await page.getByRole('tab', { name: /^Emoji/ }).click()
    await expect(page.locator('.emoji-cell').first()).toBeVisible({ timeout: 20_000 })
    expect(await sortName(page), 'the emoji library shows the choice made in the icon library').toBe('Sort: Name A–Z')

    // The index arrives a moment after the sort is seen; the grid re-orders when it does.
    await expect.poll(async () => {
      const glyphs = await page.locator('.emoji-cell .emoji-char').allTextContents()
      const names = glyphs.slice(0, 60).map((g) => nameOfGlyph[strip(g.trim())]).filter(Boolean)
      if (names.length < 40) return `only ${names.length} of the first ${glyphs.slice(0, 60).length} emoji have a name`
      const inOrder = await page.evaluate((list) => {
        const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' })
        return list.every((n, i) => i === 0 || collator.compare(list[i - 1], n) <= 0)
      }, names)
      return inOrder && glyphs[0].trim() !== '😀' ? 'sorted' : `not in name order: ${names.slice(0, 6).join(' | ')}`
    }, { timeout: 20_000, message: 'the emoji grid never came out in name order' }).toBe('sorted')
  })
})
