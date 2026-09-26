// Premade icon groups: the Groups tab of the icon library at
// /create/icons/groups. A free group opens signed out, recolours and changes
// stroke weight; exporting it asks for an account; a Pro group is a blurred
// placeholder whose glyphs are never requested; the toolbar holds one row from
// 320 to 1440.
//
// Glyphs come from the Iconify fixture (tests/user-sim/iconify-stub.js), which
// answers the batched /{pack}.json?icons=… endpoint for every fixture pack.
import JSZip from 'jszip'
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'
import { ICONIFY_HOSTS } from './iconify-stub.js'
import { PREMADE_ICON_GROUPS, parseIconRef } from '../../src/data/iconGroups.js'

const ROUTE = '/create/icons/groups'
const FREE = PREMADE_ICON_GROUPS.filter((g) => g.access === 'free')
const PRO = PREMADE_ICON_GROUPS.filter((g) => g.access === 'pro')
const WAYFINDING = PREMADE_ICON_GROUPS.find((g) => g.id === 'wayfinding')
const COMMERCE = PREMADE_ICON_GROUPS.find((g) => g.id === 'commerce')

// Every icon a Pro group holds that no free group also holds: requesting any
// of these for a signed-out visitor would be a locked group reaching the network.
const FREE_REFS = new Set(FREE.flatMap((g) => g.icons))
const PRO_ONLY = new Set(PRO.flatMap((g) => g.icons).filter((r) => !FREE_REFS.has(r)))

/** Every icon ref this page asked the Iconify batch endpoint for. */
function watchGlyphRequests(page) {
  const refs = []
  page.on('request', (req) => {
    const u = new URL(req.url())
    if (u.hostname !== ICONIFY_HOSTS[0] || !u.searchParams.has('icons')) return
    const pack = u.pathname.replace(/^\//, '').replace(/\.json$/, '')
    for (const n of (u.searchParams.get('icons') || '').split(',').filter(Boolean)) refs.push(`${pack}:${n}`)
  })
  return refs
}

/** Count and capture files handed over by an anchor with `download`. */
async function watchDownloads(page) {
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
}

const cellCount = (page) => page.locator('.igp-grid .ic').count()
const paintedSrcs = (page) => page.locator('.igp-grid .ic img').evaluateAll((imgs) => imgs.map((i) => decodeURIComponent(i.getAttribute('src'))))

test.describe('icon groups', () => {
  test('the Groups tab sits beside Icons and Emoji and owns its route', async ({ page }) => {
    watch(page, 'someone looking for a ready-made set of icons')
    await page.setViewportSize({ width: 390, height: 844 })
    await go(page, '/create/icons')
    const tabs = page.getByRole('tablist', { name: 'Choose asset library' })
    const groupsTab = tabs.getByRole('tab', { name: /Groups/ })
    await expect(groupsTab).toBeVisible()
    await groupsTab.click()
    await expect.poll(() => new URL(page.url()).pathname).toBe(ROUTE)
    await expect(page.getByRole('heading', { level: 1, name: 'Icon Groups' })).toBeVisible()
    await expect(groupsTab).toHaveAttribute('aria-selected', 'true')

    // Every group is listed; the free ones open, the Pro ones are locked cards.
    const cards = page.locator('.igp-cards > li')
    await expect(cards).toHaveCount(PREMADE_ICON_GROUPS.length)
    await expect(page.locator('.igp-cards a.igp-card')).toHaveCount(FREE.length)
    await expect(page.locator('.igp-cards .lockt-card--group')).toHaveCount(PRO.length)

    // A direct visit lands on the same tab, from the prerendered shell.
    await go(page, ROUTE)
    await expect(page.getByRole('heading', { level: 1, name: 'Icon Groups' })).toBeVisible()
    await expect(page.getByRole('tab', { name: /Groups/ })).toHaveAttribute('aria-selected', 'true')
  })

  test('a free group opens signed out, recolours and changes weight as one set', async ({ page }) => {
    watch(page, 'someone taking the wayfinding set for a signage project')
    await page.setViewportSize({ width: 390, height: 844 })
    await go(page, ROUTE)
    await page.getByRole('link', { name: new RegExp(`^${WAYFINDING.label}, `) }).click()
    await expect.poll(() => new URL(page.url()).searchParams.get('group')).toBe('wayfinding')
    await expect(page.getByRole('heading', { level: 2, name: WAYFINDING.label })).toBeVisible()
    expect(await cellCount(page)).toBe(WAYFINDING.icons.length)
    // Every cell paints (the batch answered), at the group's default weight.
    await expect(page.locator('.igp-grid .ic img')).toHaveCount(WAYFINDING.icons.length, { timeout: 15000 })
    expect((await paintedSrcs(page)).every((s) => !/stroke-width="(?!2")/.test(s))).toBe(true)

    // Weight: every glyph moves together.
    await page.getByRole('group', { name: 'Stroke weight' }).getByRole('button', { name: '1.5px stroke' }).click()
    await expect.poll(async () => (await paintedSrcs(page)).every((s) => s.includes('stroke-width="1.5"'))).toBe(true)

    // Colour: pick a preset in the shared colour picker; every glyph takes it.
    await page.getByRole('button', { name: 'Group colour' }).click()
    const swatch = page.locator('.cpk-pop .cpk-swatch').first()
    const hex = (await swatch.getAttribute('aria-label')).toLowerCase()
    await swatch.click()
    await expect.poll(async () => (await paintedSrcs(page)).every((s) => s.includes(hex) && !s.includes('currentColor'))).toBe(true)
  })

  test('the colour starts at the project palette when the project has one', async ({ page }) => {
    watch(page, 'someone with a project palette opening a group')
    await page.addInitScript(() => {
      try {
        localStorage.setItem('vs-current-design', JSON.stringify({ palette: { base: '#c2410c', harmony: 'auto', extraColors: [], activeIdx: 0, colors: ['#c2410c', '#0f766e'] } }))
      } catch { /* storage refused */ }
    })
    await page.setViewportSize({ width: 1024, height: 800 })
    await go(page, `${ROUTE}?group=media`)
    await expect(page.locator('.igp-grid .ic img').first()).toBeVisible({ timeout: 15000 })
    expect((await paintedSrcs(page)).every((s) => s.includes('#c2410c'))).toBe(true)
    await page.getByRole('button', { name: 'Group colour' }).click()
    await expect(page.locator('.cpk-pop').getByText('Project colours')).toBeVisible()
    await expect(page.locator('.cpk-pop .cpk-swatch')).toHaveCount(2)
  })

  test('exporting a group signed out asks for an account and hands over nothing', async ({ page }) => {
    watch(page, 'someone exporting the wayfinding set without an account')
    await page.setViewportSize({ width: 390, height: 844 })
    await go(page, `${ROUTE}?group=wayfinding`)
    await expect(page.locator('.igp-grid .ic img')).toHaveCount(WAYFINDING.icons.length, { timeout: 15000 })
    await watchDownloads(page)
    await page.getByRole('button', { name: 'Export group' }).click()
    await expect(page.locator('#ui-login-title')).toHaveText(/create your free account/i, { timeout: 10000 })
    expect(await page.evaluate(() => window.__dl.length)).toBe(0)
  })

  test('signed in, the export is a ZIP of one SVG per icon, a sprite and the licences', async ({ page }) => {
    watch(page, 'a signed-in designer exporting the media controls')
    await signIn(page, { plan: 'free' })
    await page.setViewportSize({ width: 1280, height: 900 })
    const media = PREMADE_ICON_GROUPS.find((g) => g.id === 'media')
    await go(page, `${ROUTE}?group=media`)
    await expect(page.locator('.igp-grid .ic img')).toHaveCount(media.icons.length, { timeout: 15000 })
    await watchDownloads(page)
    await page.getByRole('button', { name: 'Export group' }).click()
    await expect.poll(() => page.evaluate(() => window.__dl[0]?.bytes?.length || 0), { timeout: 15000 }).toBeGreaterThan(0)
    const { name, bytes } = await page.evaluate(() => window.__dl[0])
    expect(name).toBe('media-icons.zip')
    const zip = await JSZip.loadAsync(Uint8Array.from(bytes))
    const files = Object.keys(zip.files).filter((f) => !zip.files[f].dir)
    expect(files.filter((f) => f.startsWith('media-icons/svg/') && f.endsWith('.svg'))).toHaveLength(media.icons.length)
    expect(files).toContain('media-icons/media-sprite.svg')
    expect(files).toContain('media-icons/LICENSES.txt')
    const sprite = await zip.file('media-icons/media-sprite.svg').async('string')
    expect((sprite.match(/<symbol /g) || []).length).toBe(media.icons.length)
    const licences = await zip.file('media-icons/LICENSES.txt').async('string')
    for (const pack of new Set(media.icons.map((r) => parseIconRef(r).pack))) {
      expect(licences.toLowerCase()).toContain(pack === 'tabler' ? 'tabler icons' : pack)
    }
  })

  test('a Pro group is a blurred card whose Upgrade link goes to /plans, and its icons are never requested', async ({ page }) => {
    watch(page, 'a signed-out visitor meeting a Pro group')
    const asked = watchGlyphRequests(page)
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, ROUTE)
    await expect(page.locator('.igp-card img').first()).toBeVisible({ timeout: 15000 })
    // Positive control: the free groups' previews were fetched.
    expect(asked.length).toBeGreaterThan(0)

    const locked = page.locator('.lockt-card--group').filter({ hasText: COMMERCE.label })
    await expect(locked).toBeVisible()
    expect(await locked.locator('.lockt-glyphs').evaluate((e) => getComputedStyle(e).filter)).toMatch(/blur/)
    // Nothing of the group's own glyphs is on the card.
    await expect(locked.locator('img')).toHaveCount(0)
    const upgrade = locked.getByRole('link', { name: `Upgrade to Pro to open ${COMMERCE.label}` })
    await locked.hover()
    await expect(upgrade).toBeVisible()
    expect(Number(await upgrade.evaluate((e) => getComputedStyle(e).opacity))).toBe(1)
    await expect(upgrade).toHaveAttribute('href', '/plans')

    // A deep link to the locked group shows the wall and fetches nothing.
    await go(page, `${ROUTE}?group=commerce`)
    await expect(page.getByText(`${COMMERCE.label} is Pro`)).toBeVisible()
    await expect(page.getByRole('link', { name: 'See what Pro includes' })).toHaveAttribute('href', '/plans')
    await expect(page.locator('.igp-grid')).toHaveCount(0)
    await page.waitForTimeout(500)
    expect(asked.filter((r) => PRO_ONLY.has(r)), 'a Pro group\'s icons were requested for a signed-out visitor').toEqual([])
  })

  test('on Pro every group opens', async ({ page }) => {
    watch(page, 'a Pro designer opening the commerce set')
    await signIn(page, { plan: 'pro' })
    await page.setViewportSize({ width: 1280, height: 900 })
    await go(page, ROUTE)
    await expect(page.locator('.igp-cards a.igp-card')).toHaveCount(PREMADE_ICON_GROUPS.length, { timeout: 15000 })
    await go(page, `${ROUTE}?group=commerce`)
    await expect(page.locator('.igp-grid .ic img')).toHaveCount(COMMERCE.icons.length, { timeout: 15000 })
  })

  test('the group toolbar and the library tabs hold one row from 320 to 1440, with no sideways scroll', async ({ page }) => {
    watch(page, 'someone resizing the group view')
    await go(page, `${ROUTE}?group=wayfinding`)
    for (const width of [320, 360, 390, 768, 1024, 1280, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      await expect(page.locator('.igp-toolbar')).toBeVisible()
      const m = await page.evaluate(() => {
        const rows = (el) => new Set([...el.children].filter((c) => c.getBoundingClientRect().width > 0)
          .map((c) => Math.round(c.getBoundingClientRect().top + c.getBoundingClientRect().height / 2))).size
        const bar = document.querySelector('.igp-toolbar')
        const tabs = document.querySelector('.lib-switch')
        return {
          barRows: rows(bar),
          barOverflow: bar.scrollWidth - bar.clientWidth,
          tabRows: rows(tabs),
          pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        }
      })
      expect(m.barRows, `toolbar wrapped at ${width}`).toBe(1)
      expect(m.barOverflow, `toolbar overflows at ${width}`).toBeLessThanOrEqual(0)
      expect(m.tabRows, `library tabs wrapped at ${width}`).toBe(1)
      expect(m.pageOverflow, `page scrolls sideways at ${width}`).toBeLessThanOrEqual(0)
    }
  })
})
