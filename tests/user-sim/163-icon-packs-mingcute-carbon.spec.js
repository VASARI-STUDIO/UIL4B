// MINGCUTE AND CARBON: TWO FREE PACKS, CARBON'S BRAND MARKS FOR PRO, TWO SETS NEVER OFFERED.
//
// What a visitor can see and reach in /create/icons:
//   - MingCute and Carbon are in the pack menu for an account and load their icons
//     (390 and 1440). Signed out they are behind a free-account wall.
//   - Carbon's logo-* icons are Pro only: a free account never gets a cell, a glyph
//     request or a search hit for one, and is told how many are held back. Pro gets them.
//   - Remix (ri) and the Streamline family are refused for every tier, Pro included. Pro
//     search is unscoped, so it is the path that could reach them; a stored "recent" is another.
//   - A group download's LICENSES.txt carries copyright lines and the licence text.
//
// Everything is answered by the Iconify fixture (tests/user-sim/iconify-stub.js). Its
// carbon.json lists 20 names, 5 of them logo-*; search.json holds the "packprobe" and
// "blockedonly" entries these tests search for, among them hits from ri and streamline*.
//
// MUTATIONS (each seen red, then the source restored byte for byte):
//   - remove 'ri' from BLOCKED_PACKS.exact → the Pro search and Recent-rail tests fail;
//   - drop `tier` from the keepWeight call in browsePack → "Pro sees Carbon's logo-*" fails;
//   - drop the canSeeIcon filter on search results → the free search test fails;
//   - delete Carbon's copyright line → tests/unit/icon-licence-file.test.js fails;
//   - put the name-only licencesText back in IconGroups.jsx → the ZIP test fails.
import JSZip from 'jszip'
import { test, expect } from './base.js'
import { chooseMenuOption, go, signIn, watch } from './helpers.js'
import { ICONIFY_HOSTS, isLiveIconify } from './iconify-stub.js'

const LIVE = 'UIL4B_LIVE_ICONIFY is set: the live catalogue is not the fixture, so nothing here is measurable'
const WIDTHS = [1440, 390]
// carbon.json in the fixture: 20 names, of which these 5 are brand marks.
const CARBON_LOGOS = ['logo-github', 'logo-slack', 'logo-figma', 'logo-linkedin', 'logo-youtube']
const CARBON_TOTAL = 20
const MINGCUTE_TOTAL = 20

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
  // The button's name gains the active-filter count once a pack is chosen: "Filters 1".
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

/** Wait for a pack's own listing: the toolbar count reads "N icons". */
async function packListed(page, title, count) {
  await expect(page.locator('.lbry-count'), `${title} lists ${count} icons`).toHaveText(`${Number(count).toLocaleString('en-US')} icons`, { timeout: 15000 })
}

/**
 * Every glyph in the grid has drawn, and there are `count` of them. A monochrome icon is an
 * `<svg class="ig-sym"><use href="#icsN"/></svg>` and is drawn when the sprite holds a non-empty
 * <symbol> with that id (see 164-icon-grid-sprite.spec.js); an image-backed one is drawn when it
 * has loaded (a broken image is 0 wide). A different count, or one undrawn cell, polls negative.
 */
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

async function search(page, query) {
  await page.locator('.lbry-search input').first().fill(query)
  await expect(page.locator('.lbry-count')).toHaveText(/^[\d,]+ icons?$/, { timeout: 15000 })
}

for (const width of WIDTHS) {
  test.describe(`at ${width}px`, () => {
    test('a free account finds MingCute and Carbon in the pack menu and both load their icons', async ({ page }) => {
      const urls = iconifyUrls(page)
      await openLibrary(page, width, 'designer on the free plan opening the new packs', 'free')

      const filters = page.getByRole('button', { name: /^Filters(?: \d+)?$/ })
      if (await filters.isVisible()) await filters.click()
      await page.getByRole('button', { name: 'Icon pack' }).click()
      const list = page.locator('.menu-select-list[role="listbox"]')
      await expect(list.locator('[role="option"][data-value="mingcute"]')).toContainText('MingCute')
      await expect(list.locator('[role="option"][data-value="carbon"]')).toContainText('Carbon')
      await page.keyboard.press('Escape')
      if (await filters.isVisible()) {
        const sheet = page.getByRole('dialog', { name: 'Filters' })
        if (await sheet.isVisible()) await sheet.getByRole('button', { name: 'Done', exact: true }).click()
      }

      await pickPack(page, 'mingcute')
      await packListed(page, 'MingCute Icon', MINGCUTE_TOTAL)
      expect(await page.locator('.ig .ic:not(.ig-skel)').count()).toBe(MINGCUTE_TOTAL)
      await allGlyphsDrawn(page, MINGCUTE_TOTAL)
      expect(await cellNames(page)).toContain('home-1-line')
      expect(urls.some((u) => u.includes('/mingcute.json?icons=')), 'MingCute glyphs came from the batch endpoint').toBe(true)

      await pickPack(page, 'carbon')
      await packListed(page, 'Carbon', CARBON_TOTAL - CARBON_LOGOS.length)
      await allGlyphsDrawn(page, CARBON_TOTAL - CARBON_LOGOS.length)
      expect(await cellNames(page)).toContain('home')
      expect(urls.some((u) => u.includes('/carbon.json?icons=')), 'Carbon glyphs came from the batch endpoint').toBe(true)
    })

    test('signed out, MingCute and Carbon ask for a free account and fetch nothing', async ({ page }) => {
      await openLibrary(page, width, 'visitor who has not signed in', null)
      await page.waitForTimeout(1000)
      const after = iconifyUrls(page)
      for (const [pack, label] of [['mingcute', 'MingCute'], ['carbon', 'Carbon']]) {
        await pickPack(page, pack)
        await expect(page.locator('.ig-gate')).toContainText(`${label} needs a free account`)
      }
      expect(after, `choosing a gated pack made ${after.length} request(s)`).toEqual([])
    })

    test('a free account never gets a Carbon logo-* cell or glyph request, and is told they are on Pro', async ({ page }) => {
      const urls = iconifyUrls(page)
      await openLibrary(page, width, 'designer on the free plan browsing Carbon', 'free')
      await pickPack(page, 'carbon')
      await packListed(page, 'Carbon', CARBON_TOTAL - CARBON_LOGOS.length)
      await allGlyphsDrawn(page, CARBON_TOTAL - CARBON_LOGOS.length)

      const names = await cellNames(page)
      expect(names.length, 'a real list, not an empty one').toBe(CARBON_TOTAL - CARBON_LOGOS.length)
      expect(names.filter((n) => n.startsWith('logo-')), 'brand marks are Pro').toEqual([])
      expect(urls.filter((u) => /logo-/.test(u) && !u.includes('/collection?')), 'no glyph request names a logo-*').toEqual([])

      const notice = page.locator('.ig-notice[role="status"]')
      await expect(notice).toHaveText(new RegExp(`^${CARBON_LOGOS.length} Carbon brand logos are on Pro\\.`))
      await expect(notice.getByRole('button', { name: 'See what Pro includes' })).toBeVisible()
    })

    test('the Pro-only notice is for Carbon on a free account alone', async ({ page }) => {
      await openLibrary(page, width, 'designer on the free plan browsing MingCute', 'free')
      await pickPack(page, 'mingcute')
      await packListed(page, 'MingCute Icon', MINGCUTE_TOTAL)
      await expect(page.locator('.ig-notice'), 'MingCute holds nothing back').toHaveCount(0)
      await pickPack(page, 'carbon')
      await expect(page.locator('.ig-notice')).toHaveCount(1)
      await pickPack(page, 'mingcute')
      await packListed(page, 'MingCute Icon', MINGCUTE_TOTAL)
      await expect(page.locator('.ig-notice'), 'the notice goes when the pack does').toHaveCount(0)
    })

    test('Pro sees Carbon’s logo-* icons and no notice', async ({ page }) => {
      const urls = iconifyUrls(page)
      await openLibrary(page, width, 'designer on Pro browsing Carbon', 'pro')
      await pickPack(page, 'carbon')
      await packListed(page, 'Carbon', CARBON_TOTAL)
      await allGlyphsDrawn(page, CARBON_TOTAL)
      const names = await cellNames(page)
      for (const logo of CARBON_LOGOS) expect(names, `${logo} is on Pro`).toContain(logo)
      expect(urls.some((u) => u.includes('/carbon.json?icons=') && u.includes('logo-github')), 'Pro asked for the brand glyphs').toBe(true)
      await expect(page.locator('.ig-notice')).toHaveCount(0)
    })
  })
}

test.describe('search', () => {
  test('a free account’s search finds Carbon and MingCute icons but not Carbon’s logo-*', async ({ page }) => {
    const urls = iconifyUrls(page)
    await openLibrary(page, 1440, 'designer on the free plan searching', 'free')
    await search(page, 'packprobe')
    // The fixture answers this query with carbon:logo-packprobe too; the page must drop it.
    await expect(page.locator('.lbry-count')).toHaveText('2 icons')
    expect((await cellNames(page)).sort()).toEqual(['packprobe', 'packprobe-line'])
    expect(urls.filter((u) => u.includes('logo-packprobe') && !u.includes('/search?')), 'no glyph request names it').toEqual([])
  })

  test('Pro search finds the logo-* but nothing from Remix or Streamline', async ({ page }) => {
    const urls = iconifyUrls(page)
    const answers = []
    page.on('response', async (res) => {
      if (new URL(res.url()).pathname === '/search') answers.push(await res.json().catch(() => null))
    })
    await openLibrary(page, 1440, 'designer on Pro searching every set', 'pro')
    await search(page, 'packprobe')

    await expect(page.locator('.lbry-count')).toHaveText('3 icons')

    // The API really did offer the blocked sets, so the absence below is the page's doing.
    // The response body is read asynchronously, so wait for it rather than reading once.
    const offered = () => answers.flatMap((a) => a?.icons || [])
    await expect.poll(offered, { message: 'the fixture offers a Remix hit' }).toContain('ri:packprobe-ri')
    expect(offered(), 'the fixture offers Streamline hits').toEqual(expect.arrayContaining(['streamline-flex:packprobe-flex', 'streamline:packprobe-sl']))

    expect((await cellNames(page)).sort()).toEqual(['logo-packprobe', 'packprobe', 'packprobe-line'])
    expect(urls.filter((u) => /\/(ri|streamline[a-z-]*)(\.json|\/)/.test(new URL(u).pathname)), 'no glyph request for a blocked set').toEqual([])
  })

  test('Pro search that only Remix and Streamline answer shows none of their icons', async ({ page }) => {
    const urls = iconifyUrls(page)
    let offered = []
    page.on('response', async (res) => {
      if (new URL(res.url()).pathname === '/search') offered = offered.concat((await res.json().catch(() => null))?.icons || [])
    })
    await openLibrary(page, 1440, 'designer on Pro searching for a blocked set', 'pro')
    await page.locator('.lbry-search input').first().fill('blockedonly')
    await expect.poll(() => offered, { timeout: 15000 }).toEqual(expect.arrayContaining(['ri:blockedonly-line', 'streamline-plump:blockedonly']))
    await page.waitForTimeout(1500)
    expect((await cellNames(page)).filter((n) => n.includes('blockedonly')), 'no blocked icon is in the grid').toEqual([])
    expect(urls.filter((u) => /\/(ri|streamline[a-z-]*)(\.json|\/)/.test(new URL(u).pathname))).toEqual([])
  })
})

test.describe('a stored recent from a blocked set or a Pro-only icon', () => {
  const recent = (pack, name, ts) => ({ key: `${pack}:${name}`, action: 'copy', ts, cdn: true, pack, name })
  const seed = async (page) => page.addInitScript((rows) => {
    try { localStorage.setItem('vs-recent-icons', JSON.stringify(rows)) } catch { /* storage refused */ }
  }, [
    recent('ri', 'home-line', Date.now()),
    recent('streamline-flex', 'home', Date.now() - 1000),
    recent('carbon', 'logo-github', Date.now() - 2000),
    recent('lucide', 'zap', Date.now() - 3000),
  ])
  const railNames = async (page) => (await page.locator('.ig-rail-item').evaluateAll(
    (els) => els.map((e) => e.getAttribute('aria-label')),
  )).map((l) => l.replace(/^(Copied|Edited) /, '').replace(/ — open to customise$/, ''))

  test('Pro’s Recent rail keeps Lucide and Carbon’s logo, and drops Remix and Streamline without asking for them', async ({ page }) => {
    const urls = iconifyUrls(page)
    await seed(page)
    await openLibrary(page, 1440, 'designer on Pro with an old recent list', 'pro')
    await expect(page.locator('.ig-rail')).toBeVisible()
    await expect.poll(() => railNames(page)).toEqual(['logo-github', 'zap'])
    await page.waitForTimeout(1500)
    expect(urls.some((u) => u.includes('/lucide.json?icons=') && u.includes('zap')), 'the allowed recent was fetched').toBe(true)
    expect(urls.filter((u) => /\/(ri|streamline[a-z-]*)(\.json|\/)/.test(new URL(u).pathname)), 'a blocked set was asked for').toEqual([])
  })

  test('a free account’s Recent rail drops the Carbon logo and the blocked sets', async ({ page }) => {
    const urls = iconifyUrls(page)
    await seed(page)
    await openLibrary(page, 390, 'designer on the free plan with an old recent list', 'free')
    await expect(page.locator('.ig-rail')).toBeVisible()
    await expect.poll(() => railNames(page)).toEqual(['zap'])
    await page.waitForTimeout(1500)
    expect(urls.some((u) => u.includes('/lucide.json?icons=') && u.includes('zap')), 'the allowed recent was fetched').toBe(true)
    expect(urls.filter((u) => /\/(ri|streamline[a-z-]*)(\.json|\/)/.test(new URL(u).pathname))).toEqual([])
  })

  // The rail hides the logo, and the glyph loader, which reads the unfiltered
  // `recents`, must not ask for it either.
  test('a free account never fetches the glyph of a Carbon logo kept in its Recent list', async ({ page }) => {
    const urls = iconifyUrls(page)
    await seed(page)
    await openLibrary(page, 1440, 'designer on the free plan with an old recent list', 'free')
    await expect.poll(() => railNames(page)).toEqual(['zap'])
    await page.waitForTimeout(1500)
    expect(urls.filter((u) => u.includes('logo-github')), 'a Pro-only glyph reached a free browser').toEqual([])
  })
})

test.describe('group download', () => {
  test('LICENSES.txt carries each pack’s copyright line and the MIT text, not only a name and a link', async ({ page }) => {
    watch(page, 'a signed-in designer exporting the media controls')
    await signIn(page, { plan: 'free' })
    await page.setViewportSize({ width: 1280, height: 900 })
    await go(page, '/create/icons/groups?group=media')
    await expect(page.locator('.igp-grid .ic img').first()).toBeVisible({ timeout: 15000 })
    await page.evaluate(() => {
      window.__dl = []
      const real = HTMLAnchorElement.prototype.click
      HTMLAnchorElement.prototype.click = function patched() {
        if (this.hasAttribute('download')) {
          const entry = { name: this.getAttribute('download'), bytes: null }
          window.__dl.push(entry)
          fetch(this.href).then((r) => r.arrayBuffer()).then((b) => { entry.bytes = Array.from(new Uint8Array(b)) })
        }
        return real.apply(this, arguments)
      }
    })
    await page.getByRole('button', { name: 'Export group' }).click()
    await expect.poll(() => page.evaluate(() => window.__dl[0]?.bytes?.length || 0), { timeout: 15000 }).toBeGreaterThan(0)
    const { bytes } = await page.evaluate(() => window.__dl[0])
    const zip = await JSZip.loadAsync(Uint8Array.from(bytes))
    const text = await zip.file('media-icons/LICENSES.txt').async('string')
    // Hand-checked against the packs this group uses (Lucide and Tabler), from their upstream licences.
    expect(text).toContain('Copyright (c) 2026 Lucide Icons and Contributors')
    expect(text).toContain('Copyright (c) 2013-present Cole Bemis')
    expect(text).toContain('Copyright (c) 2020-2026 Paweł Kuna')
    expect(text).toContain('Permission is hereby granted, free of charge')
    // Only the packs in the group, so Carbon's notice is not stuffed into every download.
    expect(text).not.toContain('IBM Corp.')
  })
})
