// ICONAMOON, ICONPARK (THREE STYLES), STASH, GLYPHS, LETS ICONS AND MYNA UI: SIX MORE FREE PACKS.
//
// What a visitor can see and reach in /create/icons:
//   - Each of the eight prefixes is in the pack menu under its name, and a free account opens it (390 and 1440).
//   - The footer credits the pack on screen with its name and licence (MIT, CC BY 4.0 or Apache 2.0).
//   - Signed out, each sits behind the free-account wall and nothing is fetched for it.
//   - The weight suffixes are not beside their Regular glyphs: Regular lists one glyph per concept, and
//     Bold, Fill and Duo list the suffixed ones where the pack draws them.
//
// Everything is answered by the Iconify fixture (tests/user-sim/iconify-stub.js); each fixture lists 20 names.
//
// MUTATIONS (each to be seen red, then the source restored byte for byte):
//   - set 'stash' to tier 'paid' in iconPackTiers.js → the free-account test fails;
//   - delete the iconamoon line in iconRegularRules.js → the Regular count and the weight test fail;
//   - delete the glyphs duo rule in IconLibrary.jsx's WEIGHT_RULES → the weight test fails.
import { test, expect } from './base.js'
import { chooseMenuOption, go, signIn, watch } from './helpers.js'
import { ICONIFY_HOSTS, isLiveIconify } from './iconify-stub.js'

const LIVE = 'UIL4B_LIVE_ICONIFY is set: the live catalogue is not the fixture, so nothing here is measurable'
const WIDTHS = [1440, 390]
const PACKS = [
  { prefix: 'iconamoon', label: 'IconaMoon', credit: 'IconaMoon', licence: 'CC BY 4.0', shown: 9, sample: 'home' },
  { prefix: 'icon-park-outline', label: 'IconPark Outline', credit: 'IconPark', licence: 'Apache 2.0', shown: 20, sample: 'home-two' },
  { prefix: 'icon-park-solid', label: 'IconPark Solid', credit: 'IconPark', licence: 'Apache 2.0', shown: 20, sample: 'home-two' },
  { prefix: 'icon-park-twotone', label: 'IconPark Two-tone', credit: 'IconPark', licence: 'Apache 2.0', shown: 20, sample: 'home-two' },
  { prefix: 'stash', label: 'Stash Icons', credit: 'Stash Icons', licence: 'MIT', shown: 11, sample: 'home' },
  { prefix: 'glyphs', label: 'Glyphs', credit: 'Glyphs', licence: 'MIT', shown: 9, sample: 'home' },
  { prefix: 'lets-icons', label: 'Lets Icons', credit: 'Lets Icons', licence: 'CC BY 4.0', shown: 10, sample: 'home' },
  { prefix: 'mynaui', label: 'Myna UI Icons', credit: 'Myna UI Icons', licence: 'MIT', shown: 15, sample: 'home' },
]
// What each weight lists for the packs that draw it (from the fixtures).
const WEIGHTS = [
  { prefix: 'iconamoon', weight: /^Bold/, names: ['heart-bold', 'home-bold', 'search-bold'] },
  { prefix: 'iconamoon', weight: /^Fill/, names: ['bell-fill', 'heart-fill', 'home-fill', 'star-fill'] },
  { prefix: 'iconamoon', weight: /^Duo/, names: ['heart-duotone', 'home-duotone'] },
  { prefix: 'stash', weight: /^Fill/, names: ['bell-solid', 'heart-solid', 'home-solid', 'star-solid', 'user-solid'] },
  { prefix: 'stash', weight: /^Duo/, names: ['heart-duotone', 'home-duotone'] },
  { prefix: 'glyphs', weight: /^Bold/, names: ['heart-bold', 'home-bold', 'search-bold', 'star-bold'] },
  { prefix: 'glyphs', weight: /^Duo/, names: ['bell-duo', 'heart-duo', 'home-duo', 'star-duo'] },
  { prefix: 'lets-icons', weight: /^Fill/, names: ['bell-fill', 'heart-fill', 'home-fill', 'star-fill'] },
  { prefix: 'lets-icons', weight: /^Duo/, names: ['heart-duotone', 'home-duotone'] },
  { prefix: 'mynaui', weight: /^Fill/, names: ['bell-solid', 'heart-solid', 'home-solid', 'star-solid', 'user-solid'] },
]

test.beforeEach(() => { test.skip(isLiveIconify(), LIVE) })

/** Every Iconify URL this page asks for, decoded so a name can be matched in it. */
function iconifyUrls(page) {
  const urls = []
  page.on('request', (r) => {
    try {
      if (ICONIFY_HOSTS.includes(new URL(r.url()).hostname)) urls.push(decodeURIComponent(r.url()))
    } catch { /* not a URL we can read */ }
  })
  return urls
}

/** Every icon name the page has put in the grid, in order. */
const cellNames = (page) => page.locator('.ig .ic:not(.ig-skel) .ic-name').allTextContents()

/** Choose a pack from the menu, through the Filters sheet on a phone. */
async function pickPack(page, pack) {
  const filters = page.getByRole('button', { name: /^Filters(?: \d+)?$/ })
  const sheet = page.getByRole('dialog', { name: 'Filters' })
  const inSheet = await filters.isVisible()
  if (inSheet) {
    await filters.click()
    await expect(sheet).toBeVisible()
  }
  await chooseMenuOption(page, page.getByRole('button', { name: 'Icon pack' }), pack)
  if (inSheet) {
    await sheet.getByRole('button', { name: 'Done', exact: true }).click()
    await expect(sheet).toBeHidden()
  }
}

/** Wait for a pack's own listing: the announced count reads "N icons". */
async function packListed(page, title, count) {
  await expect(page.locator('#ig-result-count'), `${title} lists ${count} icons`).toHaveText(`${Number(count).toLocaleString('en-US')} icons`, { timeout: 15000 })
}

/** Every glyph in the grid has drawn, and there are `count` of them (a sprite symbol with content, or a loaded image). */
async function allGlyphsDrawn(page, count) {
  await expect.poll(() => page.locator('.ig .ic:not(.ig-skel) :is(img, svg.ig-sym)').evaluateAll((arts) => {
    const symbols = new Map([...document.querySelectorAll('#ig-sprite symbol')].map((s) => [s.id, s]))
    const drawn = (el) => {
      if (el.tagName.toLowerCase() === 'img') return el.complete && el.naturalWidth > 0
      const href = el.querySelector('use')?.getAttribute('href') || ''
      return href.startsWith('#') && !!symbols.get(href.slice(1))?.firstElementChild
    }
    return arts.length > 0 && arts.every(drawn) ? arts.length : -arts.length
  }), { timeout: 15000 }).toBe(count)
}

async function openLibrary(page, width, who, signedIn) {
  watch(page, who)
  await page.setViewportSize({ width, height: width < 600 ? 844 : 900 })
  if (signedIn) await signIn(page, { plan: signedIn })
  await go(page, '/create/icons')
  await expect(page.locator('.ic').first()).toBeVisible({ timeout: 20000 })
}

for (const width of WIDTHS) {
  test.describe(`at ${width}px`, () => {
    test('a free account finds each batch 3 pack in the menu, opens it, and sees it credited', async ({ page }) => {
      const urls = iconifyUrls(page)
      await openLibrary(page, width, 'designer on the free plan opening the batch 3 packs', 'free')

      const filters = page.getByRole('button', { name: /^Filters(?: \d+)?$/ })
      if (await filters.isVisible()) await filters.click()
      await page.getByRole('button', { name: 'Icon pack' }).click()
      const list = page.locator('.menu-select-list[role="listbox"]')
      for (const p of PACKS) {
        const option = list.locator(`[role="option"][data-value="${p.prefix}"]`)
        await expect(option).toContainText(p.label)
        await expect(option, `${p.label} is free tier, so no Pro mark`).not.toContainText(/pro/i)
      }
      await page.keyboard.press('Escape')
      if (await filters.isVisible()) {
        const sheet = page.getByRole('dialog', { name: 'Filters' })
        if (await sheet.isVisible()) await sheet.getByRole('button', { name: 'Done', exact: true }).click()
      }

      for (const p of PACKS) {
        await pickPack(page, p.prefix)
        // Packs share counts, so wait for this pack's own name before trusting the count.
        await expect.poll(() => cellNames(page), { message: `${p.label} lists ${p.sample}`, timeout: 15000 }).toContain(p.sample)
        await packListed(page, p.label, p.shown)
        await allGlyphsDrawn(page, p.shown)
        expect(urls.some((u) => u.includes(`/${p.prefix}.json?icons=`)), `${p.label} glyphs came from the batch endpoint`).toBe(true)
        await expect(page.locator('.ig-gate')).toHaveCount(0)
        const credit = page.locator('.sp-footer-notice-list')
        await expect(credit).toContainText(`${p.credit} (${p.licence})`)
        await expect(credit.getByRole('link', { name: p.credit, exact: true })).toHaveAttribute('href', /^https:\/\//)
      }
    })

    test('signed out, each batch 3 pack asks for a free account and fetches nothing', async ({ page }) => {
      await openLibrary(page, width, 'visitor who has not signed in', null)
      await page.waitForTimeout(1000)
      const after = iconifyUrls(page)
      for (const p of PACKS) {
        await pickPack(page, p.prefix)
        await expect(page.locator('.ig-gate')).toContainText(`${p.label} needs a free account`)
      }
      expect(after, `choosing a gated pack made ${after.length} request(s)`).toEqual([])
    })
  })
}

test('each weight lists only the suffixed glyphs the pack draws for it, and Regular lists none of them', async ({ page }) => {
  await openLibrary(page, 1440, 'designer on the free plan browsing the weights', 'free')
  const group = page.getByRole('group', { name: 'Icon weight' })
  let current = ''
  for (const w of WEIGHTS) {
    if (w.prefix !== current) {
      current = w.prefix
      await pickPack(page, w.prefix)
      await expect.poll(() => cellNames(page), { timeout: 15000 }).toContain('home')
      expect((await cellNames(page)).filter((n) => /-(?:thin|light|bold|fill|duotone|duo|solid|outline)$/.test(n)), `${w.prefix}: no weight suffix in Regular`).toEqual([])
    }
    await group.getByRole('button', { name: w.weight }).click()
    await expect.poll(async () => (await cellNames(page)).sort(), { message: `${w.prefix} ${w.weight}`, timeout: 15000 }).toEqual(w.names)
    await group.getByRole('button', { name: /^Regular/ }).click()
    await expect.poll(() => cellNames(page), { timeout: 15000 }).toContain('home')
  }
})
