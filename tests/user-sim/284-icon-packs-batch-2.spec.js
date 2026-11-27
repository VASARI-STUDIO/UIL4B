// FLUENT UI, PIXELARTICONS, RADIX ICONS AND BOOTSTRAP ICONS: FOUR MORE FREE PACKS.
//
// What a visitor can see and reach in /create/icons:
//   - Each pack is in the pack menu under its name, and a free account opens it (390 and 1440).
//   - The footer credits it with its name and MIT licence.
//   - Signed out, each sits behind the free-account wall and nothing is fetched for it.
//   - Fluent lists only its 24px Regular glyphs, and Fill shows only its 24px Filled ones: its fixture
//     holds 8 of each plus 4 of other sizes. Bootstrap's -fill glyphs move to Fill the same way.
//   - A search finds the new packs' icons (and drops Fluent's 16px hit).
//   - LICENSES.txt for a download carries each pack's MIT text. No group uses these packs yet
//     (they are not in GROUP_STYLE_PACKS), so a group download must not carry their notices.
//
// Everything is answered by the Iconify fixture (tests/user-sim/iconify-stub.js).
//
// MUTATIONS (each to be seen red, then the source restored byte for byte):
//   - set 'fluent' to tier 'paid' in iconPackTiers.js → the free-account test fails;
//   - delete the fluent line in iconRegularRules.js → the Fluent list and search tests fail;
//   - delete a pack's `copyright` in iconPackCredits.js → tests/unit/icon-licence-file.test.js fails.
import JSZip from 'jszip'
import { test, expect } from './base.js'
import { chooseMenuOption, go, signIn, watch } from './helpers.js'
import { ICONIFY_HOSTS, isLiveIconify } from './iconify-stub.js'
import { licenceFileText } from '../../src/data/iconLicenceTexts.js'

const LIVE = 'UIL4B_LIVE_ICONIFY is set: the live catalogue is not the fixture, so nothing here is measurable'
const WIDTHS = [1440, 390]
// Each fixture (tests/user-sim/fixtures/iconify/collection/<pack>.json) lists 20 names; Fluent shows 16 of them.
const PACKS = [
  { prefix: 'fluent', label: 'Fluent UI', credit: 'Fluent UI System Icons', shown: 8, sample: 'home-24-regular' },
  { prefix: 'pixelarticons', label: 'Pixelarticons', credit: 'Pixelarticons', shown: 20, sample: 'home' },
  { prefix: 'radix-icons', label: 'Radix Icons', credit: 'Radix Icons', shown: 20, sample: 'magnifying-glass' },
  { prefix: 'bi', label: 'Bootstrap Icons', credit: 'Bootstrap Icons', shown: 17, sample: 'house' },
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
    test('a free account finds each new pack in the menu, opens it, and sees it credited', async ({ page }) => {
      const urls = iconifyUrls(page)
      await openLibrary(page, width, 'designer on the free plan opening the batch 2 packs', 'free')

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
        // Two packs can list the same count, so wait for this pack's own name
        // before trusting the count: the previous grid may still be on screen.
        await expect.poll(() => cellNames(page), { message: `${p.label} lists ${p.sample}`, timeout: 15000 }).toContain(p.sample)
        await packListed(page, p.label, p.shown)
        await allGlyphsDrawn(page, p.shown)
        expect(urls.some((u) => u.includes(`/${p.prefix}.json?icons=`)), `${p.label} glyphs came from the batch endpoint`).toBe(true)
        await expect(page.locator('.ig-gate')).toHaveCount(0)
        // The footer credits the pack on screen with its name, linked, and its MIT licence.
        const credit = page.locator('.sp-footer-notice-list')
        await expect(credit).toContainText(`${p.credit} (MIT)`)
        await expect(credit.getByRole('link', { name: p.credit, exact: true })).toHaveAttribute('href', /^https:\/\//)
      }
    })

    test('signed out, each new pack asks for a free account and fetches nothing', async ({ page }) => {
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

test('Fluent lists only its 24px Regular glyphs, and Fill shows only its 24px Filled ones', async ({ page }) => {
  await openLibrary(page, 1440, 'designer on the free plan browsing Fluent', 'free')
  await pickPack(page, 'fluent')
  await packListed(page, 'Fluent UI', 8)
  const names = await cellNames(page)
  expect(names.length).toBe(8)
  expect(names.filter((n) => !/-24-regular$/.test(n)), 'no filled twin, no other size, no light variant').toEqual([])
  await page.getByRole('group', { name: 'Icon weight' }).getByRole('button', { name: /^Fill/ }).click()
  await expect.poll(() => cellNames(page), { timeout: 15000 }).toContain('home-24-filled')
  const filled = await cellNames(page)
  expect(filled.length).toBe(8)
  expect(filled.filter((n) => !/-24-filled$/.test(n)), 'Fill is the 24px Filled set only').toEqual([])
})

test('Bootstrap Icons keeps its -fill glyphs under Fill, not beside their outlines', async ({ page }) => {
  await openLibrary(page, 1440, 'designer on the free plan browsing Bootstrap Icons', 'free')
  await pickPack(page, 'bi')
  await expect.poll(() => cellNames(page), { timeout: 15000 }).toContain('house')
  await packListed(page, 'Bootstrap Icons', 17)
  expect((await cellNames(page)).filter((n) => /-fill$/.test(n)), 'no -fill twin in Regular').toEqual([])
  await page.getByRole('group', { name: 'Icon weight' }).getByRole('button', { name: /^Fill/ }).click()
  await expect.poll(async () => (await cellNames(page)).sort(), { timeout: 15000 }).toEqual(['bell-fill', 'heart-fill', 'star-fill'])
})

test('a free account’s search finds the new packs’ icons and drops Fluent’s 16px one', async ({ page }) => {
  await openLibrary(page, 1440, 'designer on the free plan searching', 'free')
  await page.locator('.lbry-search input').first().fill('packbatchprobe')
  await expect(page.locator('#ig-result-count')).toHaveText('4 icons', { timeout: 15000 })
  expect((await cellNames(page)).sort()).toEqual(['packbatchprobe', 'packbatchprobe', 'packbatchprobe', 'packbatchprobe-24-regular'])
})

test.describe('the licence file', () => {
  test('LICENSES.txt for the four packs carries each MIT notice and text', () => {
    // Pure module, the one the download imports. No group uses these packs yet, so no UI path exports them.
    const file = licenceFileText(PACKS.map((p) => p.prefix))
    for (const notice of ['Copyright (c) 2020 Microsoft Corporation', 'Copyright (c) 2019 Gerrit Halfmann', 'Copyright (c) 2022 WorkOS', 'Copyright (c) 2019-2024 The Bootstrap Authors']) {
      expect(file).toContain(notice)
    }
    expect(file.match(/Permission is hereby granted, free of charge/g)).toHaveLength(4)
  })

  test('a group download carries only its own packs’ notices, not the four new ones', async ({ page }) => {
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
    expect(text).toContain('Permission is hereby granted, free of charge')
    for (const other of ['Microsoft Corporation', 'Gerrit Halfmann', 'WorkOS', 'The Bootstrap Authors']) expect(text).not.toContain(other)
  })
})
