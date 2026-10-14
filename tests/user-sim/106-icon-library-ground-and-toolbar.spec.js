// ICON LIBRARY: THE PREVIEW GROUND AND THE ONE-ROW TOOLBAR.
//
// 1. With the default icon colour the customizer's preview sits on the page's
//    own background in both themes, not on a fixed dark or white gradient. A
//    chosen colour keeps a contrast ground.
//    Coloured icons (flags, brand and colour packs) always sit on that same page
//    ground, and the grid draws them with no white box behind: the chip around
//    a coloured glyph is a transparent slot in both themes. Ink that matches the
//    page ground (near-black on dark, near-white on light) gets a hairline halo.
// 2. The toolbar above the grid stays on one row at every width, each control
//    is whole (a visible control is never narrower than its glyph and padding
//    say), and on a coarse pointer every control is at least 44px both ways.
import { test, expect } from './base.js'
import { chooseMenuOption, go, signIn, watch } from './helpers.js'

const WIDTHS = [320, 360, 390, 640, 641, 768, 961, 999, 1440]

const openCustomizer = async (page) => {
  await go(page, '/create/icons')
  await page.locator('.ig .ic').first().click()
  await expect(page.locator('.icust-stage')).toBeVisible({ timeout: 20000 })
}

const stageAndPage = (page) => page.evaluate(() => {
  const s = getComputedStyle(document.querySelector('.icust-stage'))
  return {
    bg: s.backgroundColor,
    image: s.backgroundImage,
    page: getComputedStyle(document.body).backgroundColor,
  }
})

test.describe('the customizer preview ground', () => {
  for (const scheme of ['light', 'dark']) {
    test(`default colour previews on the ${scheme} page background`, async ({ browser }) => {
      const ctx = await browser.newContext({ colorScheme: scheme, viewport: { width: 1440, height: 900 } })
      const page = await ctx.newPage()
      watch(page, `someone opening an icon in ${scheme} mode`)
      await openCustomizer(page)
      await expect(page.getByRole('button', { name: 'Default', exact: true })).toHaveClass(/active/)
      const { bg, image, page: pageBg } = await stageAndPage(page)
      expect(image, 'the stage is painting a gradient').toBe('none')
      expect(bg, 'the stage is not the page background').toBe(pageBg)
      await ctx.close()
    })
  }

  test('a chosen colour keeps a contrast ground, and Default brings the page ground back', async ({ browser }) => {
    const ctx = await browser.newContext({ colorScheme: 'light', viewport: { width: 1440, height: 900 } })
    const page = await ctx.newPage()
    watch(page, 'someone picking white for an icon')
    await openCustomizer(page)
    await page.getByRole('button', { name: 'White', exact: true }).click()
    const picked = await stageAndPage(page)
    expect(picked.image, 'white on the page ground would be invisible').not.toBe('none')
    await page.getByRole('button', { name: 'Default', exact: true }).click()
    const back = await stageAndPage(page)
    expect(back.bg).toBe(back.page)
    await ctx.close()
  })
})

// COLOURED ICONS: NO WHITE BOX.
//
// The grid used to wrap every coloured-pack glyph in a white chip, and the
// customizer kept its contrast gradient for them. Circle Flags is a paid pack,
// so the viewer is Pro; the fixture serves its names, and the chip is drawn
// whether or not the artwork has arrived, which is why the grid check does not
// wait for an image.

// On a phone the pack control lives in the toolbar's Filters sheet; wider, it is
// on the row. Either way, leave the sheet closed so the grid is what is on screen.
const choosePack = async (page, pack) => {
  const filters = page.getByRole('button', { name: 'Filters', exact: true })
  const sheet = page.getByRole('dialog', { name: 'Filters' })
  const inSheet = await filters.isVisible()
  if (inSheet) {
    await filters.click()
    await expect(sheet).toBeVisible()
  }
  await chooseMenuOption(page, page.getByRole('button', { name: 'Icon pack' }), pack)
  if (inSheet && await sheet.isVisible()) {
    await page.keyboard.press('Escape')
    await expect(sheet).toBeHidden()
  }
}

const openFlagGrid = async (browser, scheme, width) => {
  const touch = width <= 768
  const ctx = await browser.newContext({
    colorScheme: scheme, viewport: { width, height: 900 }, hasTouch: touch, isMobile: touch,
  })
  const page = await ctx.newPage()
  watch(page, `someone browsing flags at ${width}px in ${scheme} mode`)
  await signIn(page, { plan: 'pro' })
  await go(page, '/create/icons')
  await expect(page.locator('.ig .ic').first()).toBeVisible({ timeout: 20000 })
  await choosePack(page, 'circle-flags')
  await expect(page.locator('.ig .ic .ig-chip').first()).toBeVisible({ timeout: 20000 })
  return { ctx, page }
}

const chipPaint = (page) => page.evaluate(() => [...document.querySelectorAll('.ig .ic .ig-chip')].map((c) => {
  const s = getComputedStyle(c)
  const r = c.getBoundingClientRect()
  return { bg: s.backgroundColor, image: s.backgroundImage, shadow: s.boxShadow, w: Math.round(r.width), h: Math.round(r.height) }
}))

test.describe('coloured icons sit on the page, not in a white box', () => {
  for (const [scheme, width] of [['light', 1440], ['dark', 1440], ['light', 390], ['dark', 390]]) {
    test(`flag grid chip is transparent and the stage is the page ground, ${scheme} ${width}`, async ({ browser }) => {
      const { ctx, page } = await openFlagGrid(browser, scheme, width)

      const chips = await chipPaint(page)
      expect(chips.length, 'no coloured-pack slots in the grid').toBeGreaterThan(0)
      for (const c of chips) {
        expect(c.bg, 'a coloured glyph still has a fill behind it').toBe('rgba(0, 0, 0, 0)')
        expect(c.image, 'a coloured glyph still has a gradient behind it').toBe('none')
        expect(c.shadow, 'a coloured glyph still has an outline box').toBe('none')
      }
      // The slot keeps its footprint, so nothing in the grid moves.
      expect(chips[0].h, 'the slot lost its height').toBe(36)

      await page.locator('.ig .ic').first().click()
      await expect(page.locator('.icust-stage')).toBeVisible({ timeout: 20000 })
      await expect(page.locator('.icust-stage')).toHaveClass(/icust-stage--theme/)
      const { bg, image, page: pageBg } = await stageAndPage(page)
      expect(image, 'the flag stage is painting a gradient').toBe('none')
      expect(bg, 'the flag stage is not the page background').toBe(pageBg)
      await ctx.close()
    })
  }

  test('copying a coloured icon adds no background and forces no colour', async ({ browser }) => {
    const { ctx, page } = await openFlagGrid(browser, 'dark', 1440)
    await ctx.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {})
    await page.locator('.ig .ic').first().click()
    await expect(page.locator('.icust-stage')).toBeVisible({ timeout: 20000 })
    // The Colour row is replaced by a note: there is nothing to tint.
    await expect(page.getByText(/original colours preserved/i)).toBeVisible()
    // The markup is fetched on open; copying before it lands would copy nothing.
    await expect(page.locator('.icust-code code')).toContainText('<svg', { timeout: 20000 })
    const copy = page.getByRole('button', { name: /^Copy SVG$/ })
    await copy.click()
    await expect(page.getByRole('button', { name: /Copied!/ })).toBeVisible()
    const out = await page.evaluate(() => navigator.clipboard.readText())
    const root = out.match(/<svg[^>]*>/)?.[0] || ''
    expect(root, 'no svg root in the copied markup').not.toBe('')
    expect(out, 'a background rect was added').not.toMatch(/<rect[^>]*(width|height)="100%"/)
    expect(root, 'a colour was forced onto the root').not.toMatch(/\s(color|fill)=/)
    await ctx.close()
  })

  test('a mono icon keeps its own tile: no slot, inverted ink in dark', async ({ browser }) => {
    const ctx = await browser.newContext({ colorScheme: 'dark', viewport: { width: 1440, height: 900 } })
    const page = await ctx.newPage()
    watch(page, 'someone browsing the default mono icons')
    await go(page, '/create/icons')
    await expect(page.locator('.ig .ic img').first()).toBeVisible({ timeout: 20000 })
    const m = await page.evaluate(() => {
      const img = document.querySelector('.ig .ic img')
      return { chip: !!img.closest('.ig-chip'), inv: img.classList.contains('ig-inv') }
    })
    expect(m.chip, 'a mono icon is wrapped in a coloured-icon slot').toBe(false)
    expect(m.inv, 'a mono icon lost its dark-mode ink').toBe(true)
    await ctx.close()
  })
})

// The batched glyph endpoint answers one body per name. These bodies are coloured
// (the fixture's own is a currentColor stroke, which an <img> paints black), so the
// ink tone under test is the one the test chose: github-icon and vercel-icon are
// near-black, apple is white, everything else is orange or red.
const coloured = '<path fill="#fc6d26" d="M3 3h18v18H3z"/><path fill="#e24329" d="M8 8h8v8H8z"/>'
const INK = {
  'github-icon': '<path fill="#181717" d="M3 3h18v18H3z"/>',
  'vercel-icon': '<path fill="#000" d="M12 3l10 18H2z"/>',
  apple: '<path fill="#fff" d="M3 3h18v18H3z"/>',
}
const serveInk = (page) => page.route(/\/[^/]+\.json\?.*icons=/, (route) => {
  const url = new URL(route.request().url())
  const prefix = url.pathname.replace(/^\//, '').replace(/\.json$/, '')
  const icons = {}
  for (const n of (url.searchParams.get('icons') || '').split(',').filter(Boolean)) {
    icons[n] = { body: prefix === 'logos' && INK[n] ? INK[n] : coloured }
  }
  return route.fulfill({
    status: 200,
    contentType: 'application/json',
    headers: { 'access-control-allow-origin': '*' },
    body: JSON.stringify({ prefix, width: 24, height: 24, icons, aliases: {} }),
  })
})

const openLogos = async (browser, scheme) => {
  const ctx = await browser.newContext({ colorScheme: scheme, viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  watch(page, `someone browsing brand logos in ${scheme} mode`)
  await signIn(page, { plan: 'pro' })
  await serveInk(page)
  await go(page, '/create/icons')
  await expect(page.locator('.ig .ic').first()).toBeVisible({ timeout: 20000 })
  await choosePack(page, 'logos')
  await expect(page.locator('.ig .ic[aria-label="Customise github-icon"] .ig-chip img')).toBeVisible({ timeout: 20000 })
  return { ctx, page }
}
const chipOf = (page, name) => page.locator(`.ig .ic[aria-label="Customise ${name}"] .ig-chip`)

test.describe('ink that matches the page ground gets a halo, never a box', () => {
  test('dark theme: near-black marks get the light halo, white and coloured ones do not', async ({ browser }) => {
    const { ctx, page } = await openLogos(browser, 'dark')
    await expect(chipOf(page, 'github-icon')).toHaveClass(/ig-chip--halo-light/)
    await expect(chipOf(page, 'vercel-icon')).toHaveClass(/ig-chip--halo-light/)
    await expect(chipOf(page, 'apple')).not.toHaveClass(/halo/)
    await expect(chipOf(page, 'gitlab')).not.toHaveClass(/halo/)
    // The halo is a filter on the glyph; the slot itself is still not a box.
    const m = await page.evaluate(() => {
      const c = document.querySelector('.ig .ic[aria-label="Customise github-icon"] .ig-chip')
      return { filter: getComputedStyle(c.querySelector('img')).filter, bg: getComputedStyle(c).backgroundImage }
    })
    expect(m.filter, 'the near-black mark has no halo').toContain('drop-shadow')
    expect(m.bg, 'the halo mark got a box').toBe('none')
    // The customiser stage carries the same halo for the same mark.
    await page.locator('.ig .ic[aria-label="Customise github-icon"]').click()
    await expect(page.locator('.icust-stage')).toHaveClass(/icust-stage--halo-light/, { timeout: 20000 })
    await ctx.close()
  })

  test('light theme: white marks get the dark halo, near-black ones do not', async ({ browser }) => {
    const { ctx, page } = await openLogos(browser, 'light')
    await expect(chipOf(page, 'apple')).toHaveClass(/ig-chip--halo-dark/)
    await expect(chipOf(page, 'github-icon')).not.toHaveClass(/halo/)
    await expect(chipOf(page, 'gitlab')).not.toHaveClass(/halo/)
    await ctx.close()
  })

  test('flags are never given a halo in either theme', async ({ browser }) => {
    for (const scheme of ['dark', 'light']) {
      const { ctx, page } = await openFlagGrid(browser, scheme, 1440)
      await expect(page.locator('.ig .ic .ig-chip img').first()).toBeVisible({ timeout: 20000 })
      expect(await page.locator('.ig .ic .ig-chip[class*="halo"]').count(), `a flag got a halo in ${scheme}`).toBe(0)
      await ctx.close()
    }
  })
})

// SAVED ICONS. A saved true multicolour pack glyph sits on the page like its grid
// cell; a saved mono icon that was given a colour keeps its light tile, so a black
// or white one stays visible.
test.describe('saved icons', () => {
  const record = (over) => ({
    key: `vs-custom-icons:1:${over.name}`, ts: 1, base: 'bolt', iteration: 1, projectId: null,
    size: 24, stroke: 2, absStroke: true, cap: 'round', join: 'round', isStroke: true, strokeUnit: 'px',
    ...over,
  })
  const svg = (fill) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="${fill}" d="M13 2 3 14h9l-1 8 10-12h-9z"/></svg>`
  const seeded = [
    record({ name: 'Custom (mono 1)', pack: 'lucide', cdn: true, color: '#000000', colored: true, svg: svg('#000') }),
    record({ name: 'Custom (flag 1)', pack: 'circle-flags', cdn: true, color: '', colored: true, svg: svg('#d52b1e') }),
  ]

  for (const scheme of ['light', 'dark']) {
    test(`a saved coloured mono icon keeps its tile; a saved pack glyph has none, ${scheme}`, async ({ browser }) => {
      const ctx = await browser.newContext({ colorScheme: scheme, viewport: { width: 1440, height: 900 } })
      const page = await ctx.newPage()
      watch(page, `someone with saved icons in ${scheme} mode`)
      await signIn(page, { plan: 'pro' })
      await go(page, '/create/icons')
      await page.evaluate((list) => localStorage.setItem('vs-custom-icons', JSON.stringify(list)), seeded)
      await go(page, '/create/icons')
      await expect(page.locator('.ig .ic').first()).toBeVisible({ timeout: 20000 })
      await choosePack(page, 'custom')
      const mono = page.locator('.ig .ic', { hasText: 'Custom (mono 1)' }).locator('.ig-chip')
      const flag = page.locator('.ig .ic', { hasText: 'Custom (flag 1)' }).locator('.ig-chip')
      await expect(mono).toBeVisible({ timeout: 20000 })
      const paint = (loc) => loc.evaluate((c) => {
        const s = getComputedStyle(c)
        return { image: s.backgroundImage, shadow: s.boxShadow }
      })
      const monoPaint = await paint(mono)
      expect(monoPaint.image, 'a saved black icon lost its light tile').not.toBe('none')
      await expect(mono).toHaveClass(/ig-chip--tile/)
      const flagPaint = await paint(flag)
      expect(flagPaint.image, 'a saved multicolour glyph kept a box').toBe('none')
      expect(flagPaint.shadow).toBe('none')
      await ctx.close()
    })
  }
})

const measureToolbar = (page) => page.evaluate(() => {
  const tb = document.querySelector('.ig-toolbar')
  const row = tb.querySelector('.lbry-toolbar-row')
  const rr = row.getBoundingClientRect()
  const controls = [...tb.querySelectorAll('button, input, select, a[href]')]
    .filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 })
    .map((e) => {
      const r = e.getBoundingClientRect()
      return { name: e.getAttribute('aria-label') || e.textContent.trim() || e.className, w: r.width, h: r.height, left: r.left, right: r.right, top: r.top, bottom: r.bottom }
    })
  const add = tb.querySelector('.ig-addbtn')
  const slot = tb.querySelector('.lbry-toolbar-action')
  return {
    coarse: matchMedia('(pointer:coarse)').matches,
    rowH: rr.height, rowRight: rr.right, rowLeft: rr.left,
    pageOverflow: document.documentElement.scrollWidth - innerWidth,
    controls,
    addW: add ? add.getBoundingClientRect().width : null,
    slotW: slot ? slot.getBoundingClientRect().width : null,
    addLabelVisible: add ? (() => { const l = add.querySelector('.ig-addbtn-label'); const r = l.getBoundingClientRect(); return r.width > 8 && r.height > 8 })() : null,
  }
})

test.describe('the icon toolbar', () => {
  for (const [scheme, widths] of [['light', WIDTHS], ['dark', [390, 1440]]]) {
    for (const w of widths) {
      test(`one row, whole controls, 44px targets on touch at ${w} ${scheme}`, async ({ browser }) => {
        const touch = w <= 768
        const ctx = await browser.newContext({
          colorScheme: scheme, viewport: { width: w, height: 900 }, hasTouch: touch, isMobile: touch,
        })
        const page = await ctx.newPage()
        watch(page, `someone browsing icons at ${w}px`)
        await go(page, '/create/icons')
        await expect(page.locator('.ig .ic').first()).toBeVisible({ timeout: 20000 })
        await expect(page.locator('.ig-addbtn')).toBeVisible()
        const m = await measureToolbar(page)

        // One row: no control starts below another's bottom edge on the row.
        const rowControls = m.controls.filter((c) => !/Regular|Bold|Fill|Duo/.test(c.name))
        const tops = rowControls.map((c) => c.top)
        expect(Math.max(...tops) - Math.min(...tops), 'a control sits on a second row').toBeLessThan(12)
        // Nothing runs past the row or the screen.
        for (const c of m.controls) {
          expect(c.right, `${c.name} runs past the toolbar`).toBeLessThanOrEqual(m.rowRight + 1)
          expect(c.left, `${c.name} starts before the toolbar`).toBeGreaterThanOrEqual(m.rowLeft - 1)
        }
        expect(m.pageOverflow, 'the page scrolls sideways').toBeLessThanOrEqual(0)
        // The Add icon control is a whole control, not a sliver.
        expect(m.addW, 'Add icon is squeezed').toBeGreaterThanOrEqual(44)
        expect(m.slotW, 'the action slot is squeezed').toBeGreaterThanOrEqual(44)
        if (w > 640) expect(m.addLabelVisible, 'the Add icon word is clipped').toBe(true)
        if (touch) {
          expect(m.coarse).toBe(true)
          for (const c of m.controls) {
            expect(c.h, `${c.name} is under 44px tall`).toBeGreaterThanOrEqual(43.5)
            expect(c.w, `${c.name} is under 44px wide`).toBeGreaterThanOrEqual(43.5)
          }
        }
        await ctx.close()
      })
    }
  }
})
