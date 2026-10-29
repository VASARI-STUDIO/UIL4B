// ICON LIBRARY: THE PREVIEW GROUND AND THE ONE-ROW TOOLBAR.
//
// 1. The customizer's preview sits on the page's own background in both themes by
//    default, never on a gradient. The ground is its own control (the Background
//    switch): choosing a colour never changes it, and the choice is remembered.
//    Coloured icons (flags, brand and colour packs) always sit on that same page
//    ground, and the grid draws them with no white box behind: the chip around
//    a coloured glyph is a transparent slot in both themes. Ink that matches the
//    page ground (near-black on dark, near-white on light) gets a hairline halo;
//    a baked-in square logo plate gets a 1px outline on its own edge instead.
// 2. The toolbar above the grid stays on one row at every width, each control
//    is whole (a visible control is never narrower than its glyph and padding
//    say), and on a coarse pointer every control is at least 44px both ways.
import { readFileSync } from 'node:fs'
import { test, expect } from './base.js'
import { chooseMenuOption, go, signIn, watch } from './helpers.js'
import { ICONIFY_HOSTS, ICONIFY_STUB_HEADER } from './iconify-stub.js'

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
      await expect(page.locator('.icust-panel').getByRole('button', { name: 'Default', exact: true })).toHaveCount(0)
      // Exactly one colour chip is selected, and with nothing picked it is Text colour.
      const chips = page.getByRole('radiogroup', { name: 'Colour', exact: true })
      await expect(chips.getByRole('radio', { checked: true })).toHaveCount(1)
      await expect(chips.getByRole('radio', { name: 'Text colour', exact: true })).toBeChecked()
      const { bg, image, page: pageBg } = await stageAndPage(page)
      expect(image, 'the stage is painting a gradient').toBe('none')
      expect(bg, 'the stage is not the page background').toBe(pageBg)
      await ctx.close()
    })
  }

  test('a chosen colour never changes the ground; only the Background switch does, and it is remembered', async ({ browser }) => {
    const ctx = await browser.newContext({ colorScheme: 'light', viewport: { width: 1440, height: 900 } })
    const page = await ctx.newPage()
    watch(page, 'someone picking white for an icon')
    await openCustomizer(page)
    const stage = page.locator('.icust-stage')
    await expect(stage).toHaveClass(/icust-stage--page/)
    const before = await stageAndPage(page)
    for (const chip of ['White', 'Black', 'Text colour']) {
      await page.getByRole('radio', { name: chip, exact: true }).click()
      await expect(page.getByRole('radio', { name: chip, exact: true })).toBeChecked()
      await expect(stage, `pressing ${chip} changed the ground`).toHaveClass(/icust-stage--page/)
      expect((await stageAndPage(page)).bg, `pressing ${chip} repainted the ground`).toBe(before.bg)
    }
    // Reset clears the colour but is not a ground control either.
    await page.getByRole('radio', { name: 'White', exact: true }).click()
    await page.getByRole('button', { name: 'Reset to default', exact: true }).click()
    await expect(page.getByRole('radio', { name: 'Text colour', exact: true })).toBeChecked()
    await expect(stage).toHaveClass(/icust-stage--page/)
    expect((await stageAndPage(page)).bg, 'a colour press moved the ground').toBe(before.bg)
    const grounds = page.getByRole('radiogroup', { name: 'Background' })
    await grounds.getByRole('radio', { name: 'Dark', exact: true }).click()
    await expect(stage).toHaveClass(/icust-stage--dark/)
    expect((await stageAndPage(page)).image).toBe('none')
    // Closed and reopened: the ground survives.
    await page.keyboard.press('Escape')
    await page.locator('.ig .ic').first().click()
    await expect(page.locator('.icust-stage')).toHaveClass(/icust-stage--dark/)
    await ctx.close()
  })
})

// THE GROUND SWITCH DOES NOT SHIFT THE CONTROLS, AND EACH GROUND IS A VISIBLE STEP.
//
// A contrast note that arrives (Black on the dark page) must not push the Colour
// chips, and the fixed ground that matches the theme must be clearly distinct
// from the page ground, so pressing it changes what the stage looks like.
const luminance = (rgb) => {
  const [r, g, b] = rgb.match(/\d+(\.\d+)?/g).slice(0, 3).map((v) => {
    const c = Number(v) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

test.describe('the ground switch', () => {
  for (const scheme of ['light', 'dark']) {
    for (const width of [390, 1440]) {
      test(`a contrast note does not move the colour chips, and the matching fixed ground is a visible step, ${scheme} ${width}`, async ({ browser }) => {
        const touch = width <= 768
        const ctx = await browser.newContext({ colorScheme: scheme, viewport: { width, height: 900 }, hasTouch: touch, isMobile: touch })
        const page = await ctx.newPage()
        watch(page, `someone changing the ground at ${width}px in ${scheme} mode`)
        await openCustomizer(page)
        const chip = (name) => page.getByRole('radio', { name, exact: true })
        const note = page.locator('.icust-ground-note')
        const top = async (name) => (await chip(name).boundingBox()).y
        const noteHeight = async () => (await note.boundingBox()).height

        // The note's line is held with or without a note.
        await chip('Text colour').click()
        await expect(note.locator('p')).toHaveCount(0)
        const quietChips = await top('Black')
        const quietHeight = await noteHeight()
        // The icon colour that is hard to see on this theme's page raises the note.
        await chip(scheme === 'dark' ? 'Black' : 'White').click()
        await expect(note.locator('p')).toBeVisible()
        expect(await top('Black'), 'the contrast note moved the colour chips').toBe(quietChips)
        expect(await noteHeight(), 'the note box changed height').toBe(quietHeight)
        // Back to Text colour: still nothing moves.
        await chip('Text colour').click()
        await expect(note.locator('p')).toHaveCount(0)
        expect(await top('Black')).toBe(quietChips)

        // The help line is the same height for every choice.
        const help = page.locator('.icust-colour-help')
        const textHelp = (await help.boundingBox()).height
        await chip('Black').click()
        expect((await help.boundingBox()).height, 'the help line changed height with the choice').toBe(textHelp)

        // The ground matching the theme is a clear step from the page, and Page is a split.
        const grounds = page.getByRole('radiogroup', { name: 'Background' })
        const pageBg = await page.evaluate(() => getComputedStyle(document.querySelector('.icust-stage')).backgroundColor)
        await grounds.getByRole('radio', { name: scheme === 'dark' ? 'Dark' : 'Light', exact: true }).click()
        const fixedBg = await page.evaluate(() => getComputedStyle(document.querySelector('.icust-stage')).backgroundColor)
        expect(ratio(pageBg, fixedBg), `${pageBg} against ${fixedBg}`).toBeGreaterThanOrEqual(1.2)
        const half = await page.evaluate(() => {
          const sw = document.querySelector('.icust-ground-sw--page')
          const own = getComputedStyle(sw)
          const halfStyle = getComputedStyle(sw, '::before')
          return { own: own.backgroundColor, other: halfStyle.backgroundColor, image: `${own.backgroundImage} ${halfStyle.backgroundImage}` }
        })
        expect(half.own, 'the Page swatch is one flat colour').not.toBe(half.other)
        expect(half.image, 'the Page swatch paints a gradient').not.toMatch(/gradient/)
        await ctx.close()
      })
    }
  }
})

// COLOURED ICONS: NO WHITE BOX.
//
// A coloured-pack glyph sits in a transparent slot, and the customizer shows it
// on the page ground. Circle Flags is a paid pack, so the viewer is Pro; the
// fixture serves its names, and the slot is drawn whether or not the artwork has
// arrived. While it is pending the slot paints nothing (spec 113 owns that), so
// the paint checks below look at slots whose glyph has loaded: that is the
// resting state a reader sees.

// On a phone the pack control lives in the toolbar's Filters sheet; wider, it is
// on the row. Either way, close the sheet with Done, as a reader does, so the grid
// is what is on screen.
const choosePack = async (page, pack) => {
  const filters = page.getByRole('button', { name: 'Filters', exact: true })
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

const openFlagGrid = async (browser, scheme, width) => {
  const touch = width <= 768
  const ctx = await browser.newContext({
    colorScheme: scheme, viewport: { width, height: 900 }, hasTouch: touch, isMobile: touch,
  })
  const page = await ctx.newPage()
  watch(page, `someone browsing flags at ${width}px in ${scheme} mode`)
  await signIn(page, { plan: 'pro' })
  // The fixture's own glyph is a currentColor stroke an <img> paints black; flags
  // are coloured, so serve coloured bodies (otherwise they sample as near-black ink).
  await serveInk(page)
  await go(page, '/create/icons')
  await expect(page.locator('.ig .ic').first()).toBeVisible({ timeout: 20000 })
  await choosePack(page, 'circle-flags')
  await expect(page.locator(LOADED_CHIP).first()).toBeVisible({ timeout: 20000 })
  return { ctx, page }
}

// A chip whose glyph has arrived: it has left the pending, empty slot (--wait).
const LOADED_CHIP = '.ig .ic .ig-chip:not(.ig-chip--wait):has(img)'

const chipPaint = (page) => page.evaluate((sel) => [...document.querySelectorAll(sel)].map((c) => {
  const s = getComputedStyle(c)
  const r = c.getBoundingClientRect()
  return { bg: s.backgroundColor, image: s.backgroundImage, shadow: s.boxShadow, w: Math.round(r.width), h: Math.round(r.height) }
}), LOADED_CHIP)

test.describe('coloured icons sit on the page, not in a white box', () => {
  for (const scheme of ['light', 'dark']) {
    test(`Logo.dev keeps a transparent slot and unclipped raster corners, ${scheme}`, async ({ browser }) => {
      const ctx = await browser.newContext({ colorScheme: scheme, viewport: { width: 1440, height: 900 } })
      const page = await ctx.newPage()
      watch(page, `someone browsing real brand logos in ${scheme} mode`)
      await signIn(page, { plan: 'pro' })
      await page.route('https://img.logo.dev/**', route => route.fulfill({
        contentType: 'image/svg+xml',
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><path fill="#0078d4" d="M4 4h20v20H4z"/></svg>',
      }))
      await go(page, '/create/icons')
      await choosePack(page, 'logodev')
      const logo = page.locator('.ig .ic img.ig-logo').first()
      await expect(logo).toBeVisible({ timeout: 20000 })
      await expect.poll(() => logo.evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true)
      await expect(logo.locator('..')).not.toHaveClass(/ig-chip--tile/)
      await expect(logo).toHaveAttribute('crossorigin', 'anonymous')
      expect(new URL(await logo.getAttribute('src')).searchParams.get('theme')).toBe(scheme)
      await expect(logo).not.toHaveClass(/ig-logo--square/)
      const paint = await logo.evaluate(img => {
        const slot = getComputedStyle(img.parentElement)
        const art = getComputedStyle(img)
        return { bg: slot.backgroundColor, image: slot.backgroundImage, shadow: slot.boxShadow, radius: art.borderRadius, filter: art.filter }
      })
      expect(paint).toEqual({ bg: 'rgba(0, 0, 0, 0)', image: 'none', shadow: 'none', radius: '0px', filter: 'none' })
      await ctx.close()
    })
  }

  for (const { scheme, square, fill, halo } of [
    { scheme: 'dark', square: false, fill: '#080808', halo: 'light' },
    { scheme: 'light', square: false, fill: '#ffffff', halo: 'dark' },
    { scheme: 'dark', square: true, fill: '#080808', halo: null },
    { scheme: 'light', square: true, fill: '#ffffff', halo: null },
  ]) {
    test(`Logo.dev samples ${square ? 'opaque squares' : 'transparent marks'} on ${scheme} ground`, async ({ browser }) => {
      const ctx = await browser.newContext({ colorScheme: scheme, viewport: { width: 1440, height: 900 } })
      try {
        const page = await ctx.newPage()
        await signIn(page, { plan: 'pro' })
        await page.route('https://img.logo.dev/**', route => route.fulfill({
          contentType: 'image/svg+xml',
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><path fill="${fill}" d="${square ? 'M0 0h28v28H0z' : 'M4 4h20v20H4z'}"/></svg>`,
        }))
        await go(page, '/create/icons')
        await choosePack(page, 'logodev')
        const chip = page.locator('.ig .ic .ig-chip:has(img.ig-logo)').first()
        const logo = chip.locator('img')
        if (square) await expect(logo).toHaveClass(/ig-logo--square/)
        else await expect(chip).toHaveClass(new RegExp(`ig-chip--halo-${halo}`))
        await expect(chip).not.toHaveClass(/ig-chip--tile/)
        await expect(logo).toHaveCSS('border-radius', square ? '6px' : '0px')
        if (square) {
          // A baked plate gets one even hairline on its own edge, not the preview ring.
          await expect(chip).not.toHaveClass(/halo/)
          await expect(logo).toHaveCSS('filter', 'none')
          await expect(logo).toHaveCSS('outline-style', 'solid')
          await expect(logo).toHaveCSS('outline-width', '1px')
          await expect(logo).toHaveCSS('outline-offset', '-1px')
          await expect(logo).toHaveCSS('outline-color', scheme === 'dark' ? /oklch\(1 0 0 \/ 0\.1\)|rgba\(255, 255, 255, 0\.1\)/ : /oklch\(0 0 0 \/ 0\.1\)|rgba\(0, 0, 0, 0\.1\)/)
        } else {
          await expect(logo).toHaveCSS('filter', new RegExp(`#ig-edge-${halo}`))
          await expect(logo).toHaveCSS('outline-style', 'none')
        }
        await expect(chip).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
        await expect(chip).toHaveCSS('background-image', 'none')
        await expect(chip).toHaveCSS('box-shadow', 'none')
        await expect(chip).toHaveCSS('filter', 'none')
        expect(new URL(await logo.getAttribute('src')).searchParams.get('theme')).toBe(scheme)
      } finally { await ctx.close() }
    })
  }

  // Dark theme: a theme variant that is a light plate falls back to the default
  // variant when that one is a darker plate. Transparent marks keep following the theme.
  test('Logo.dev swaps a light dark-theme plate for a darker default plate', async ({ browser }) => {
    const ctx = await browser.newContext({ colorScheme: 'dark', viewport: { width: 1440, height: 900 } })
    try {
      const page = await ctx.newPage()
      await signIn(page, { plan: 'pro' })
      await page.route('https://img.logo.dev/**', route => {
        const themed = new URL(route.request().url()).searchParams.has('theme')
        route.fulfill({
          contentType: 'image/svg+xml',
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><path fill="${themed ? '#ffffff' : '#080808'}" d="M0 0h28v28H0z"/></svg>`,
        })
      })
      await go(page, '/create/icons')
      await choosePack(page, 'logodev')
      const logo = page.locator('.ig .ic .ig-chip img.ig-logo').first()
      await expect(logo).toHaveClass(/ig-logo--square/)
      await expect.poll(async () => new URL(await logo.getAttribute('src')).searchParams.has('theme'), 'still showing the light plate').toBe(false)
    } finally { await ctx.close() }
  })

  // A response the browser refuses for CORS must still show the art, plain.
  // A fulfilled response is never CORS-checked in Chromium, so the first load of
  // each URL (the crossorigin one) is aborted and the plain retry is fulfilled.
  test('Logo.dev art still shows when the response is not CORS-readable', async ({ browser }) => {
    const ctx = await browser.newContext({ colorScheme: 'light', viewport: { width: 1440, height: 900 } })
    try {
      const page = await ctx.newPage()
      await signIn(page, { plan: 'pro' })
      const seen = new Set()
      await page.route('https://img.logo.dev/**', route => {
        const url = route.request().url()
        if (!seen.has(url)) { seen.add(url); return route.abort('failed') }
        return route.fulfill({
          contentType: 'image/svg+xml',
          body: '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><path fill="#0078d4" d="M0 0h28v28H0z"/></svg>',
        })
      })
      await go(page, '/create/icons')
      await choosePack(page, 'logodev')
      const logo = page.locator('.ig .ic img.ig-logo').first()
      await expect(logo).not.toHaveAttribute('crossorigin', /.*/)
      await expect.poll(() => logo.evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true)
      await expect(logo).not.toHaveClass(/ig-logo--square/)
      await expect(logo).toHaveCSS('filter', 'none')
    } finally { await ctx.close() }
  })

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
      await expect(page.locator('.icust-stage')).toHaveClass(/icust-stage--page/)
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
    // The Colour row has nothing to tint: plain text, no Default pill or track.
    const original = page.getByText('Original colours', { exact: true })
    await expect(original).toBeVisible()
    await expect(original).toHaveClass(/icust-value/)
    await expect(original).toHaveCSS('font-style', 'normal')
    await expect(original).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
    const colourRow = page.locator('.icust-row').filter({ has: original })
    await expect(colourRow.locator('.icust-seg')).toHaveCount(0)
    await expect(colourRow.getByText('Default', { exact: true })).toHaveCount(0)
    // The markup is fetched on open; copying before it lands would copy nothing.
    await expect(page.locator('.icust-code code')).toContainText('<svg', { timeout: 20000 })
    const copy = page.getByRole('button', { name: /^Copy SVG$/ })
    await copy.click()
    await expect(page.getByRole('button', { name: /Copied!/ })).toBeVisible()
    const out = await page.evaluate(() => navigator.clipboard.readText())
    const root = out.match(/<svg[^>]*>/)?.[0] || ''
    expect(root, 'no svg root in the copied markup').not.toBe('')
    expect(out, 'a background rect was added').not.toMatch(/<rect[^>]*(width|height)="100%"/)
    expect(out, 'preview edge definitions or references leaked into the export').not.toMatch(/ig-edge-/)
    expect(root, 'a colour was forced onto the root').not.toMatch(/\s(color|fill)=/)
    await ctx.close()
  })

  // COPY, SAVE AND DOWNLOAD NEED THE REAL MARKUP. A coloured-pack stage paints from
  // an <img> before the icon's own markup is in hand, so the actions that send the
  // markup somewhere wait for it: disabled and busy, then live once it lands, and
  // the clipboard is never written with an empty string. Both the grid batch and the
  // single-icon request are held, so the customiser has no markup to start from.
  // MUTATION: drop `disabled={!baseSvgText}` from Copy SVG, Save or Download (or
  // from the code box) and the matching assertion below fails.
  test('copy, save and download wait for the icon markup, then work', async ({ browser }) => {
    const ctx = await browser.newContext({ colorScheme: 'dark', viewport: { width: 1440, height: 900 } })
    await ctx.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {})
    const page = await ctx.newPage()
    watch(page, 'someone copying a flag the instant the panel opens')
    await signIn(page, { plan: 'pro' })
    // Every clipboard write the page makes, in order.
    await page.addInitScript(() => {
      window.__clipboardWrites = []
      const orig = navigator.clipboard.writeText.bind(navigator.clipboard)
      navigator.clipboard.writeText = (text) => { window.__clipboardWrites.push(text); return orig(text) }
    })
    await go(page, '/create/icons')
    await expect(page.locator('.ig .ic').first()).toBeVisible({ timeout: 20000 })

    let releaseBatch
    let releaseSvg
    const heldBatch = new Promise((resolve) => { releaseBatch = resolve })
    const heldSvg = new Promise((resolve) => { releaseSvg = resolve })
    let heldSvgRequests = 0
    await page.route(
      (u) => ICONIFY_HOSTS.includes(u.hostname) && u.pathname === '/circle-flags.json' && u.search.includes('icons='),
      async (route) => { await heldBatch; await route.fallback() },
    )
    await page.route(
      (u) => ICONIFY_HOSTS.includes(u.hostname) && /^\/circle-flags\/[^/]+\.svg$/.test(u.pathname),
      async (route) => { heldSvgRequests += 1; await heldSvg; await route.fallback() },
    )
    try {
      await choosePack(page, 'circle-flags')
      await expect(page.locator('.ig .ic .ig-chip.ig-chip--wait').first()).toBeVisible({ timeout: 20000 })
      await page.locator('.ig .ic').first().click()
      await expect(page.locator('.icust-stage')).toBeVisible({ timeout: 20000 })
      await expect.poll(() => heldSvgRequests, { timeout: 20000 }).toBeGreaterThan(0)

      const actions = {
        'Copy SVG': page.getByRole('button', { name: 'Copy SVG', exact: true }),
        Save: page.getByRole('button', { name: 'Save to project', exact: true }),
        Download: page.getByRole('button', { name: 'Download SVG', exact: true }),
        'the code box': page.locator('.icust-code-box'),
      }
      for (const [label, button] of Object.entries(actions)) {
        await expect(button, `${label} is live with no markup`).toBeDisabled()
        await expect(button, `${label} does not say it is busy`).toHaveAttribute('aria-busy', 'true')
      }
      // A click that lands anyway (force skips the actionability wait) does nothing.
      await actions['Copy SVG'].click({ force: true, timeout: 2000 }).catch(() => {})
      await actions['the code box'].click({ force: true, timeout: 2000 }).catch(() => {})
      await expect(page.getByRole('button', { name: /Copied!/ }), 'it claimed to copy nothing').toHaveCount(0)
      expect(await page.evaluate(() => window.__clipboardWrites), 'the clipboard was written with no markup').toEqual([])

      releaseSvg()
      for (const [label, button] of Object.entries(actions)) {
        await expect(button, `${label} never came alive`).toBeEnabled({ timeout: 20000 })
        await expect(button).not.toHaveAttribute('aria-busy', 'true')
      }
      await actions['Copy SVG'].click()
      await expect(page.getByRole('button', { name: /Copied!/ }).first()).toBeVisible()
      const writes = await page.evaluate(() => window.__clipboardWrites)
      // The app copies through two paths (the panel and its host page), so more
      // than one write is expected; what matters is that none is empty or not an svg.
      expect(writes.length, 'nothing reached the clipboard').toBeGreaterThan(0)
      for (const w of writes) expect(w, 'the copied markup is empty or not an svg').toMatch(/^<svg[\s\S]+<\/svg>$/)
    } finally {
      releaseBatch()
      releaseSvg()
      await ctx.close()
    }
  })

  test('a mono icon keeps its own tile: no slot, inverted ink in dark', async ({ browser }) => {
    const ctx = await browser.newContext({ colorScheme: 'dark', viewport: { width: 1440, height: 900 } })
    const page = await ctx.newPage()
    watch(page, 'someone browsing the default mono icons')
    await go(page, '/create/icons')
    // A mono icon is an inline <svg><use></svg> cell of the page's sprite (an <img> only when it falls back).
    await expect(page.locator('.ig .ic :is(img, svg.ig-sym)').first()).toBeVisible({ timeout: 20000 })
    const m = await page.evaluate(() => {
      const glyph = document.querySelector('.ig .ic :is(img, svg.ig-sym)')
      return { chip: !!glyph.closest('.ig-chip'), inv: glyph.classList.contains('ig-inv') }
    })
    expect(m.chip, 'a mono icon is wrapped in a coloured-icon slot').toBe(false)
    expect(m.inv, 'a mono icon lost its dark-mode ink').toBe(true)
    await ctx.close()
  })
})

// The batched glyph endpoint answers one body per name. These bodies are coloured
// (the fixture's own is a currentColor stroke, which an <img> paints black), so the
// ink tone under test is the one the test chose: github-icon and vercel-icon are
// near-black, apple is white, everything else is orange or red. Two flags carry
// the opposite extremes on purpose: Japan's body is near-white and Germany's is
// near-black, so a halo rule that ignored the pack would give them a halo (dark
// on the light theme, light on the dark one) and the flag test below would fail.
const coloured = '<path fill="#fc6d26" d="M3 3h18v18H3z"/><path fill="#e24329" d="M8 8h8v8H8z"/>'
const INK = {
  'github-icon': '<path fill="#181717" d="M3 3h18v18H3z"/>',
  'vercel-icon': '<path fill="#000" d="M12 3l10 18H2z"/>',
  apple: '<path fill="#fff" d="M3 3h18v18H3z"/>',
  // Colour raises the average; neutral lettering still needs an edge.
  svelte: '<path fill="#ff3e00" d="M1 3h7v18H1z"/><path fill="#353535" d="M10 6h13v12H10z"/>',
  firebase: '<path fill="#ffca28" d="M1 3h7v18H1z"/><path fill="#5a5a5a" d="M10 6h13v12H10z"/>',
}
const FLAG_INK = {
  jp: '<path fill="#fefefe" d="M3 3h18v18H3z"/>',
  de: '<path fill="#050505" d="M3 3h18v18H3z"/>',
}
const serveInk = async (page) => {
  await page.route(u => ICONIFY_HOSTS.includes(u.hostname) && /^\/(logos|circle-flags)\/[^/]+\.svg$/.test(u.pathname), route => {
    const [, prefix, filename] = new URL(route.request().url()).pathname.split('/')
    const name = filename.replace(/\.svg$/, '')
    const body = (prefix === 'logos' ? INK[name] : FLAG_INK[name]) || coloured
    return route.fulfill({
      contentType: 'image/svg+xml',
      headers: { [ICONIFY_STUB_HEADER]: '1', 'access-control-allow-origin': '*' },
      body: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${body}</svg>`,
    })
  })
  await page.route(/\/[^/]+\.json\?.*icons=/, (route) => {
    const url = new URL(route.request().url())
    const prefix = url.pathname.replace(/^\//, '').replace(/\.json$/, '')
    const icons = {}
    for (const n of (url.searchParams.get('icons') || '').split(',').filter(Boolean)) {
      const body = (prefix === 'logos' && INK[n]) || (prefix === 'circle-flags' && FLAG_INK[n]) || coloured
      icons[n] = { body }
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      // Stamped so the suite's Iconify audit counts this as the fixture, not a leak.
      headers: { 'access-control-allow-origin': '*', [ICONIFY_STUB_HEADER]: '1' },
      body: JSON.stringify({ prefix, width: 24, height: 24, icons, aliases: {} }),
    })
  })
}

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
  test('dark theme: single-colour near-black marks show in the theme ink, not a ring; white and coloured ones are untouched', async ({ browser }) => {
    const { ctx, page } = await openLogos(browser, 'dark')
    // One near-black colour is drawn in the page ink like a mono icon: solid, no ring.
    for (const name of ['github-icon', 'vercel-icon']) {
      await expect(chipOf(page, name)).not.toHaveClass(/halo/)
      await expect(chipOf(page, name).locator('img')).toHaveClass(/ig-inv/)
    }
    await expect(chipOf(page, 'apple')).not.toHaveClass(/halo/)
    await expect(chipOf(page, 'gitlab')).not.toHaveClass(/halo/)
    // The halo is a filter on the glyph; the slot itself is still not a box.
    const m = await page.evaluate(() => {
      const c = document.querySelector('.ig .ic[aria-label="Customise github-icon"] .ig-chip')
      return { filter: getComputedStyle(c.querySelector('img')).filter, bg: getComputedStyle(c).backgroundImage }
    })
    expect(m.filter, 'the near-black mark is not drawn in the page ink').toBe('invert(1)')
    expect(m.bg, 'the mark got a box').toBe('none')
    // A one-colour mark uses the theme ink once opened in the customizer.
    await page.locator('.ig .ic[aria-label="Customise github-icon"]').click()
    await expect(page.getByRole('radio', { name: 'Black', exact: true })).toBeVisible()
    await expect(page.locator('.icust-stage')).not.toHaveClass(/icust-stage--halo-light/)
    await ctx.close()
  })

  test('dark lettering in mixed-colour wordmarks gets an edge in grid and stage', async ({ browser }) => {
    const { ctx, page } = await openLogos(browser, 'dark')
    for (const name of ['svelte', 'firebase']) {
      await expect(chipOf(page, name)).toHaveClass(/ig-chip--halo-light/)
    }
    await expect(chipOf(page, 'gitlab'), 'saturated-only artwork gained an edge').not.toHaveClass(/halo/)
    await page.locator('.ig .ic[aria-label="Customise firebase"]').click()
    await expect(page.locator('.icust-stage')).toHaveClass(/icust-stage--halo-light/)
    await ctx.close()
  })

  test('a one-colour logo opened before its markup arrives switches to plain ink', async ({ browser }) => {
    const ctx = await browser.newContext({ colorScheme: 'dark', viewport: { width: 1440, height: 900 } })
    const page = await ctx.newPage()
    watch(page, 'someone opening a logo before its markup has loaded')
    await signIn(page, { plan: 'pro' })
    await serveInk(page)
    let release
    const held = new Promise((resolve) => { release = resolve })
    // Registered after serveInk, so it sees the request first and hands it on. Two
    // things carry the markup: the grid's batch (logos.json) and the customiser's own
    // fetch of the .svg. Both are held; the stage's <img> of the same .svg is a
    // different resource type and loads straight away, so the picture is on screen
    // while the markup is still unknown. (The customiser's fetch gives up after 3s, so
    // everything before release() has to stay quick.)
    await page.route(/\/logos\.json\?.*icons=/, async (route) => { await held; await route.fallback() })
    await page.route(
      (u) => ICONIFY_HOSTS.includes(u.hostname) && /^\/logos\/[^/]+\.svg$/.test(u.pathname),
      async (route) => {
        if (route.request().resourceType() === 'fetch') await held
        await route.fallback()
      },
    )
    try {
      await go(page, '/create/icons')
      await expect(page.locator('.ig .ic').first()).toBeVisible({ timeout: 20000 })
      await choosePack(page, 'logos')
      await page.locator('.ig .ic[aria-label="Customise github-icon"]').click()
      const stage = page.locator('.icust-stage')
      await expect(stage).toBeVisible({ timeout: 20000 })
      // The remote image has loaded and been looked at before the markup is released.
      await expect.poll(() => stage.locator('.icust-stage-img').evaluate((i) => i.complete && i.naturalWidth > 0), { timeout: 20000 }).toBe(true)
      await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))))
      // Whether the logo has colours is unknown yet, so the Colour row shows nothing
      // (no Default, no "Original colours") rather than flashing and switching. Its
      // label stays, so the form has no blank spot.
      const colourRow = page.locator('.icust-row').filter({ has: page.locator('label', { hasText: /^Colour$/ }) })
      await expect(colourRow.locator('label')).toBeVisible()
      await expect(colourRow.locator('.icust-value')).toBeHidden()
      await expect(page.getByText('Original colours', { exact: true })).toHaveCount(0)
      release()
      await expect(page.getByRole('radio', { name: 'Black', exact: true })).toBeVisible()
      await expect(stage).not.toHaveClass(/icust-stage--halo-light/)
    } finally { release(); await ctx.close() }
  })

  test('light theme: white marks get the dark halo, near-black ones do not', async ({ browser }) => {
    const { ctx, page } = await openLogos(browser, 'light')
    await expect(chipOf(page, 'apple')).toHaveClass(/ig-chip--halo-dark/)
    await expect(chipOf(page, 'github-icon')).not.toHaveClass(/halo/)
    await expect(chipOf(page, 'gitlab')).not.toHaveClass(/halo/)
    await ctx.close()
  })

  // MUTATION: make `haloFor` ignore its pack argument and this fails: Japan's
  // near-white body takes the dark halo on the light theme, Germany's near-black
  // body the light halo on the dark one.
  test('flags are never given a halo in either theme', async ({ browser }) => {
    for (const scheme of ['dark', 'light']) {
      const { ctx, page } = await openFlagGrid(browser, scheme, 1440)
      for (const name of ['jp', 'de', 'gb']) {
        await expect(page.locator(`.ig .ic[aria-label="Customise ${name}"] .ig-chip img`), `${name} never drew`).toBeVisible({ timeout: 20000 })
        await expect(chipOf(page, name), `the ${name} flag got a halo in ${scheme}`).not.toHaveClass(/halo/)
      }
      expect(await page.locator('.ig .ic .ig-chip[class*="halo"]').count(), `a flag got a halo in ${scheme}`).toBe(0)
      // The customiser stage carries none either, for the flag whose body is the
      // extreme of the current theme.
      await page.locator(`.ig .ic[aria-label="Customise ${scheme === 'dark' ? 'de' : 'jp'}"]`).click()
      await expect(page.locator('.icust-stage')).toBeVisible({ timeout: 20000 })
      await expect.poll(() => page.locator('.icust-stage-img').evaluate((i) => i.complete && i.naturalWidth > 0), { timeout: 20000 }).toBe(true)
      await expect(page.locator('.icust-stage')).not.toHaveClass(/halo/)
      await ctx.close()
    }
  })
})

// Saved artwork sits on the page ground. Near-black and near-white ink take
// the same theme-aware halo as the browse grid; flags never take a halo.
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
    // A white mono icon, a near-black and a white brand logo, and a near-white flag.
    record({ name: 'Custom (white 1)', pack: 'lucide', cdn: true, color: '#ffffff', colored: true, svg: svg('#fff') }),
    record({ name: 'Custom (github 1)', base: 'github-icon', pack: 'logos', cdn: true, color: '', colored: true, svg: svg('#181717') }),
    record({ name: 'Custom (apple 1)', base: 'apple', pack: 'logos', cdn: true, color: '', colored: true, svg: svg('#ffffff') }),
    record({ name: 'Custom (jp 1)', base: 'jp', pack: 'circle-flags', cdn: true, color: '', colored: true, svg: svg('#fefefe') }),
    record({ name: 'Custom (de 1)', base: 'de', pack: 'circle-flags', cdn: true, color: '', colored: true, svg: svg('#050505') }),
  ]

  for (const scheme of ['light', 'dark']) {
    test(`saved icons stay visible and flags take no halo, ${scheme}`, async ({ browser }) => {
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
        return { background: s.backgroundColor, image: s.backgroundImage, shadow: s.boxShadow }
      })
      const white = page.locator('.ig .ic', { hasText: 'Custom (white 1)' }).locator('.ig-chip')
      for (const chip of [mono, white, flag]) {
        expect(await paint(chip), 'saved artwork kept a box').toEqual({
          background: 'rgba(0, 0, 0, 0)', image: 'none', shadow: 'none',
        })
        await expect(chip).not.toHaveClass(/ig-chip--tile/)
      }
      await expect(mono).toHaveClass(scheme === 'dark' ? /ig-chip--halo-light/ : /^ig-chip$/)
      await expect(white).toHaveClass(scheme === 'light' ? /ig-chip--halo-dark/ : /^ig-chip$/)

      // Saved brand logos take the grid's halo for their ink tone, never a box.
      const github = page.locator('.ig .ic', { hasText: 'Custom (github 1)' }).locator('.ig-chip')
      const apple = page.locator('.ig .ic', { hasText: 'Custom (apple 1)' }).locator('.ig-chip')
      await expect(github).toBeVisible()
      if (scheme === 'dark') {
        await expect(github, 'near-black saved logo is invisible on the dark page').toHaveClass(/ig-chip--halo-light/)
        await expect(apple).not.toHaveClass(/halo/)
      } else {
        await expect(apple, 'white saved logo is invisible on the light page').toHaveClass(/ig-chip--halo-dark/)
        await expect(github).not.toHaveClass(/halo/)
      }
      for (const c of [github, apple]) expect((await paint(c)).image, 'a saved logo got a box').toBe('none')
      // A near-white and a near-black saved flag: once their ink has been measured
      // (the image has decoded and two frames have passed) neither has a halo.
      for (const flagName of ['Custom (jp 1)', 'Custom (de 1)']) {
        const flagChip = page.locator('.ig .ic', { hasText: flagName }).locator('.ig-chip')
        await expect.poll(() => flagChip.locator('img').evaluate((i) => i.complete && i.naturalWidth > 0)).toBe(true)
        await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))))
        await expect(flagChip, `${flagName} got a halo`).not.toHaveClass(/halo/)
      }

      // A saved one-colour logo opens in the customiser as plain ink: colour
      // controls, no "Original colours" default, and no halo on the stage.
      const pick = scheme === 'dark' ? 'Custom (github 1)' : 'Custom (apple 1)'
      await page.locator('.ig .ic', { hasText: pick }).click()
      await expect(page.getByRole('radio', { name: 'Black', exact: true })).toBeVisible({ timeout: 20000 })
      await expect(page.getByText('Original colours', { exact: true })).toHaveCount(0)
      await expect(page.locator('.icust-stage')).not.toHaveClass(/icust-stage--halo/)
      await page.keyboard.press('Escape')
      await choosePack(page, 'logodev')
      const logo = page.locator('.ig .ic .ig-chip').first()
      await expect(logo).not.toHaveClass(/ig-chip--tile/)
      expect((await paint(logo)).image, 'a logo.dev slot paints a tile').toBe('none')
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
        await expect(page.locator('.ig-toolbar').getByRole('button', { name: /^Outlined/ })).toHaveCount(0)
        await expect(page.locator('.ig-toolbar').getByRole('button', { name: /^Solid/ })).toHaveCount(0)
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

const adobeCatalogue = async (page) => {
  await page.route(u => ICONIFY_HOSTS.includes(u.hostname) && (u.pathname === '/logos.json' || u.pathname === '/logos/adobe.svg'), route => {
    const url = new URL(route.request().url())
    return route.fulfill({
      contentType: url.pathname.endsWith('.svg') ? 'image/svg+xml' : 'application/json',
      headers: { [ICONIFY_STUB_HEADER]: '1', 'access-control-allow-origin': '*' },
      body: url.pathname.endsWith('.svg')
        ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${coloured}</svg>`
        : JSON.stringify({ prefix: 'logos', width: 24, height: 24, icons: { adobe: { body: coloured } } }),
    })
  })
  await page.route(u => ICONIFY_HOSTS.includes(u.hostname) && u.pathname === '/collection' && u.searchParams.get('prefix') === 'logos', route => route.fulfill({
    contentType: 'application/json', headers: { [ICONIFY_STUB_HEADER]: '1' },
    body: JSON.stringify({ prefix: 'logos', title: 'SVG Logos', total: 1, uncategorized: ['adobe'] }),
  }))
}

const openAdobeGrid = async (page) => {
  await signIn(page, { plan: 'pro' })
  await adobeCatalogue(page)
  await go(page, '/create/icons')
  // On a phone the pack menu sits inside the toolbar's Filters sheet.
  const pack = page.getByRole('button', { name: 'Icon pack' })
  const filters = page.getByRole('button', { name: 'Filters', exact: true })
  await expect(pack.or(filters).first()).toBeVisible({ timeout: 20000 })
  if (await filters.isVisible()) {
    await filters.click()
    const sheet = page.getByRole('dialog', { name: 'Filters' })
    await chooseMenuOption(page, sheet.getByRole('button', { name: 'Icon pack' }), 'logos')
    await sheet.getByRole('button', { name: 'Done', exact: true }).click()
    await expect(sheet).toHaveCount(0)
  } else {
    await chooseMenuOption(page, pack, 'logos')
  }
  await expect(page.locator('.ig .ic').first()).toHaveAttribute('aria-label', 'Customise adobe')
}

for (const [name, body, multicolour] of [
  ['github-icon', '<path fill="#161614" d="M3 3h18v18H3z"/>', false],
  ['apple', '<path d="M3 3h18v18H3z"/>', false],
  ['gitlab', coloured, true],
]) {
  test(`colour controls follow the artwork for logos:${name}`, async ({ page }) => {
    await signIn(page, { plan: 'pro' })
    await page.addInitScript(() => {
      window.__copiedSvg = ''
      navigator.clipboard.writeText = text => { window.__copiedSvg = text; return Promise.resolve() }
    })
    await page.route(u => ICONIFY_HOSTS.includes(u.hostname) && (u.pathname === '/logos.json' || u.pathname.startsWith('/logos/')), route => {
      const url = new URL(route.request().url())
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${body}</svg>`
      const icons = Object.fromEntries((url.searchParams.get('icons') || '').split(',').map(n => [n, { body }]))
      return route.fulfill({
        contentType: url.pathname.endsWith('.svg') ? 'image/svg+xml' : 'application/json',
        headers: { [ICONIFY_STUB_HEADER]: '1', 'access-control-allow-origin': '*' },
        body: url.pathname.endsWith('.svg') ? svg : JSON.stringify({ prefix: 'logos', width: 24, height: 24, icons }),
      })
    })
    await page.route(u => ICONIFY_HOSTS.includes(u.hostname) && u.pathname === '/collection' && u.searchParams.get('prefix') === 'logos', route => route.fulfill({
      contentType: 'application/json', headers: { [ICONIFY_STUB_HEADER]: '1' },
      body: JSON.stringify({ prefix: 'logos', title: 'SVG Logos', total: 1, uncategorized: [name] }),
    }))
    await go(page, '/create/icons')
    await choosePack(page, 'logos')
    await page.getByRole('button', { name: `Customise ${name}`, exact: true }).click()
    await expect(page.locator('.icust-code-box')).toBeEnabled()
    const colour = page.locator('.icust-row').filter({ has: page.locator('label', { hasText: /^Colour$/ }) })
    await expect(colour.getByText('Default', { exact: true })).toHaveCount(0)
    await expect(colour.getByText('Original colours', { exact: true })).toHaveCount(multicolour ? 1 : 0)
    await expect(colour.getByRole('radio', { name: 'Black', exact: true })).toHaveCount(multicolour ? 0 : 1)
    await expect(colour.getByRole('radio', { name: 'White', exact: true })).toHaveCount(multicolour ? 0 : 1)
    await expect(colour.locator('.cpk-trigger')).toHaveCount(multicolour ? 0 : 1)
    if (multicolour) return
    await colour.getByRole('radio', { name: 'Black', exact: true }).click()
    await expect(page.locator('.icust-code-box')).toContainText('color="#000000"')
    await expect.poll(async () => decodeURIComponent(await page.locator('.icust-stage-img').getAttribute('src'))).toContain('color="#000000"')
    await page.getByRole('button', { name: 'Copy SVG', exact: true }).click()
    const copied = await page.evaluate(() => window.__copiedSvg)
    expect(copied).toContain('color="#000000"')
    expect(copied).not.toContain('#161614')
    const downloaded = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Download SVG', exact: true }).click()
    const stream = await (await downloaded).createReadStream()
    const chunks = []
    for await (const chunk of stream) chunks.push(chunk)
    const output = Buffer.concat(chunks).toString('utf8')
    expect(output).toContain('color="#000000"')
    expect(output).toContain('fill="#000000"')
    expect(output).not.toContain('#161614')
  })
}

for (const scheme of ['dark', 'light']) {
  for (const width of [390, 1440, 1920]) {
    test(`coloured grid and adobe preview use the page ground at ${width} ${scheme}`, async ({ browser }) => {
      const ctx = await browser.newContext({ colorScheme: scheme, viewport: { width, height: 900 } })
      try {
        const page = await ctx.newPage()
        await openAdobeGrid(page)
        const glyph = page.locator('.ig .ig-chip').first()
        await expect(glyph.locator('img')).toBeVisible()
        const plate = await glyph.evaluate(e => {
          const s = getComputedStyle(e)
          return { bg: s.backgroundColor, image: s.backgroundImage, shadow: s.boxShadow }
        })
        expect(plate).toEqual({ bg: 'rgba(0, 0, 0, 0)', image: 'none', shadow: 'none' })
        await page.locator('.ig .ic').first().click()
        await expect(page.locator('.icust-stage-img')).toBeVisible()
        const stage = await stageAndPage(page)
        expect(stage.bg).toBe(stage.page)
        expect(stage.image).toBe('none')
        await expect(page.locator('.icust-stage')).toHaveClass(/icust-stage--page/)
        await expect(page.locator('.icust-stage')).not.toHaveClass(/icust-stage--light/)
        const colourRow = page.locator('.icust-row').filter({ has: page.locator('label', { hasText: /^Colour$/ }) })
        await expect(colourRow.getByRole('button')).toHaveCount(0)
        await expect(colourRow.locator('.icust-seg')).toHaveCount(0)
        await expect(colourRow.locator('.icust-value')).toHaveText('Original colours')
        expect(await page.locator('.icust-stage-img').getAttribute('src')).toMatch(/^data:/)
      } finally { await ctx.close() }
    })
  }
}

for (const weight of ['Regular', 'Bold', 'Fill', 'Duo']) {
  test(`Original colour is offered only for Duo, when browsing ${weight}`, async ({ page }) => {
    await signIn(page, { plan: 'pro' })
    await go(page, '/create/icons')
    const seg = page.getByRole('group', { name: 'Icon weight' })
    await seg.getByRole('button', { name: new RegExp(`^${weight}`) }).click()
    await expect(page.locator('.ig .ic').first()).toBeVisible()
    if (weight !== 'Regular') {
      await expect(page.locator('.ig .ic').first()).toHaveAttribute('aria-label', weight === 'Duo' ? /-duotone(, [^,]+)?$/ : weight === 'Bold' ? /-bold(, [^,]+)?$/ : /-(fill|solid|filled)(, [^,]+)?$/)
    }
    await page.locator('.ig .ic').first().click()
    const colour = page.locator('.icust-row').filter({ has: page.locator('label', { hasText: /^Colour$/ }) })
    await expect(colour.getByRole('radio', { name: 'Original', exact: true })).toHaveCount(weight === 'Duo' ? 1 : 0)
    // Text colour is the default; on a duotone icon it is called Original.
    await expect(colour.getByRole('radio', { checked: true })).toHaveCount(1)
    await expect(colour.getByRole('radio', { name: weight === 'Duo' ? 'Original' : 'Text colour', exact: true })).toBeChecked()
  })
}

for (const fail of [false, true]) {
  test(`an uncached coloured preview shows a loading indicator${fail ? ' and an error' : ' until its image loads'}`, async ({ page }) => {
    let release
    const pending = new Promise(resolve => { release = resolve })
    try {
      await openAdobeGrid(page)
      // Registered after the catalogue fixture, so it sees the requests first (the last route added runs first).
      await page.route(u => ICONIFY_HOSTS.includes(u.hostname) && (u.pathname === '/logos.json' || /\/logos\/.*\.svg$/.test(u.pathname)), async route => {
        await pending
        if (fail) await route.fulfill({ status: 404, contentType: 'text/plain', headers: { [ICONIFY_STUB_HEADER]: 'refused' }, body: 'Missing' })
        else await route.fallback()
      })
      await page.locator('.ig .ic').first().click()
      const stage = page.locator('.icust-stage')
      await expect(stage.getByRole('status')).toHaveText('Loading\u2026')
      // The waiting slot holds the stage's 112px inspection box but paints no square of its own.
      const wait = stage.locator('.icust-stage-wait')
      await expect(wait).toHaveCount(1)
      const waitPaint = await wait.evaluate(e => {
        const s = getComputedStyle(e)
        const r = e.getBoundingClientRect()
        return { bg: s.backgroundColor, image: s.backgroundImage, shadow: s.boxShadow, animation: s.animationName, width: r.width, height: r.height }
      })
      expect({ ...waitPaint, width: 0, height: 0 }).toEqual({ bg: 'rgba(0, 0, 0, 0)', image: 'none', shadow: 'none', animation: 'none', width: 0, height: 0 })
      expect(waitPaint.width).toBeCloseTo(112, 1)
      expect(waitPaint.height).toBeCloseTo(112, 1)
      await expect(stage.getByRole('status').locator('.sr-only')).toHaveCSS('clip', 'rect(0px, 0px, 0px, 0px)')
      const reserved = await stage.boundingBox()
      release()
      if (fail) await expect(stage.getByRole('status')).toHaveText('Couldn\u2019t load this icon.')
      else {
        // The final art only: the waiting slot may itself be an <img> until then.
        await expect(stage.locator('img.icust-stage-img:not(.icust-stage-wait)')).toBeVisible()
        await expect(stage.locator('.icust-stage-wait')).toHaveCount(0)
        await expect(stage.getByRole('status')).toHaveCount(0)
      }
      expect(Math.abs((await stage.boundingBox()).height - reserved.height)).toBeLessThan(0.5)
    } finally { release() }
  })
}

test('a saved duotone icon reopens with the Original colour chip', async ({ page }) => {
  await signIn(page, { plan: 'pro' })
  await go(page, '/create/icons')
  await page.getByRole('group', { name: 'Icon weight' }).getByRole('button', { name: /^Duo/ }).click()
  const cell = page.locator('.ig .ic').first()
  await expect(cell).toHaveAttribute('aria-label', /-duotone$/)
  await cell.click()
  const save = page.getByRole('button', { name: 'Save to project', exact: true })
  await expect(save).toBeEnabled()
  await save.click()
  const picker = page.getByRole('dialog', { name: 'Save to a project' })
  await picker.getByRole('button', { name: /New project/ }).click()
  await picker.getByRole('textbox', { name: 'New project name' }).fill('Icon styles')
  await picker.getByRole('button', { name: 'Create & save', exact: true }).click()
  await expect(picker).toHaveCount(0)
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('vs-custom-icons') || '[]')
    .some(icon => /-duotone$/.test(icon.base)))).toBe(true)
  await page.keyboard.press('Escape')
  await choosePack(page, 'custom')
  const saved = page.locator('.ig-mysec').filter({ has: page.getByRole('heading', { name: 'Saved', exact: true }) }).locator('.ic').first()
  await expect(saved).toContainText(/Custom \(.*-duotone 1\)/)
  await saved.click()
  const colour = page.locator('.icust-row').filter({ has: page.locator('label', { hasText: /^Colour$/ }) })
  await expect(colour.getByRole('radio', { name: 'Original', exact: true })).toBeChecked()
})

test('the pack menu has one Interface group and borrows no style word from the Weight and Coloured chips', async ({ page }) => {
  await signIn(page, { plan: 'pro' })
  await go(page, '/create/icons')
  await expect(page.locator('.ig .ic').first()).toBeVisible()
  await page.getByRole('button', { name: 'Icon pack' }).click()
  const list = page.locator('.menu-select-list[role="listbox"]')
  await expect(list).toBeVisible()
  const headings = list.locator('.pop-head')
  // PRESENCE first, so an empty menu cannot pass the absences below.
  await expect(headings.filter({ hasText: /^Interface$/ })).toHaveCount(1)
  await expect(headings.filter({ hasText: /^Brand logos$/ })).toHaveCount(1)
  await expect(headings.filter({ hasText: /^Interface/ }), 'the Interface group is not split in two').toHaveCount(1)
  await expect(headings.filter({ hasText: /^Brand logos/ })).toHaveCount(1)
  for (const word of [/line/i, /filled?/i, /solid/i, /outlined/i, /colou?red/i]) {
    await expect(headings.filter({ hasText: word }), `a group heading says ${word}`).toHaveCount(0)
  }
  // Stroke and fill-only packs now sit together under the one heading.
  const interfaceGroup = list.getByRole('group', { name: 'Interface', exact: true })
  for (const pack of ['Lucide', 'Material Design', 'BoxIcons']) {
    await expect(interfaceGroup.getByRole('option', { name: pack }), `${pack} is under Interface`).toHaveCount(1)
  }
  await expect(list.getByRole('group', { name: 'Brand logos', exact: true }).getByRole('option', { name: 'Simple Icons' })).toHaveCount(1)
})


for (const width of [1440, 390]) {
  test(`Flags keeps packs contiguous and names sorted at ${width}px`, async ({ page }) => {
    watch(page, `someone browsing the Flags group at ${width}px`)
    await page.setViewportSize({ width, height: width === 1440 ? 500 : 900 })
    const packs = ['circle-flags', 'flag', 'flagpack', 'cif']
    // The grid labels a cell with the set's real name, not its Iconify prefix.
    const packLabels = { 'circle-flags': 'Circle Flags', flag: 'Flag Icons', flagpack: 'Flagpack', cif: 'Currency Flags' }
    const collections = new Map(packs.map(pack => [pack,
      JSON.parse(readFileSync(new URL(`./fixtures/iconify/collection/${pack}.json`, import.meta.url), 'utf8')),
    ]))
    // Keep the first loaded page inside one pack so later packs cannot mask missing labels.
    if (width === 1440) {
      const circleFlags = collections.get('circle-flags')
      circleFlags.uncategorized = Array.from({ length: 180 }, (_, i) => `flag-${String(i).padStart(3, '0')}`)
      circleFlags.total = circleFlags.uncategorized.length
      await page.route(url => ICONIFY_HOSTS.includes(url.hostname)
        && url.pathname === '/collection' && url.searchParams.get('prefix') === 'circle-flags',
      route => route.fulfill({
        contentType: 'application/json',
        headers: { 'Access-Control-Allow-Origin': '*', [ICONIFY_STUB_HEADER]: '1' },
        body: JSON.stringify(circleFlags),
      }))
    }
    await signIn(page, { plan: 'pro' })
    await go(page, '/create/icons')
    const filters = page.getByRole('button', { name: /^Filters\b/ })
    const sheet = page.getByRole('dialog', { name: 'Filters' })
    const flags = page.getByRole('button', { name: 'Flags', exact: true })
    const groupMenu = page.getByRole('button', { name: /^Group\b/ })
    // The toolbar mounts after the first paint and steps through its layout stages, so wait
    // until it shows some way in to the groups before reading which one it chose. A bare
    // isVisible() answers for the instant it is asked: on a slow runner that was before the
    // toolbar existed, and the test then waited 30 s for a Group menu this layout never draws.
    await expect(filters.or(groupMenu).or(flags).first()).toBeVisible()
    const inPanel = await filters.isVisible()
    if (inPanel) await filters.click()
    if (!await flags.isVisible()) await groupMenu.click()
    await flags.click()
    if (await sheet.isVisible()) await sheet.getByRole('button', { name: 'Done', exact: true }).click()
    else if (inPanel) await filters.click()

    const expected = packs.flatMap(pack => {
      const data = collections.get(pack)
      return data.uncategorized.slice().sort().map(name => ({ pack, name }))
    })
    const cells = page.locator('.ig .ic:not(.ig-skel)')
    if (width === 1440) {
      await expect(cells).toHaveCount(120)
      const firstCell = cells.first()
      // The pack name shows on hover only: hidden at rest, there under the pointer.
      await expect(firstCell.locator('.ic-pack')).toBeHidden()
      await firstCell.hover()
      await expect(firstCell.locator('.ic-pack')).toBeVisible()
      await expect(cells.locator('.ic-pack')).toHaveText(Array(120).fill('Circle Flags'))
      const firstHeight = await firstCell.evaluate(cell => cell.getBoundingClientRect().height)
      // Focus retains the original cell while rows above the viewport are windowed.
      await firstCell.focus()
      await page.locator('.ig-sentinel').scrollIntoViewIfNeeded()
      await expect(cells).toHaveCount(expected.length)
      await cells.nth(180).scrollIntoViewIfNeeded()
      await cells.nth(180).hover()
      await expect(cells.nth(180).locator('.ic-pack')).toBeVisible()
      expect(await firstCell.evaluate(cell => cell.getBoundingClientRect().height)).toBe(firstHeight)
      await page.evaluate(() => window.scrollTo(0, 0))
    }
    await expect(cells).toHaveCount(expected.length)
    await expect(cells.locator('.ic-name')).toHaveText(expected.map(icon => icon.name))
    await expect.poll(() => cells.locator('.ic-pack').allTextContents()).toEqual(expected.map(icon => packLabels[icon.pack]))
    if (width === 1440) {
      await choosePack(page, 'circle-flags')
      await expect(cells).toHaveCount(120)
      await expect(cells.locator('.ic-pack')).toHaveCount(0)
    }
  })
}

// TEXT COLOUR IS CURRENTCOLOR. With the default chip selected the copied file holds
// currentColor and writes no colour of its own; picking Black writes it.
test('Text colour copies currentColor with no colour on the root; Black writes one', async ({ browser }) => {
  const ctx = await browser.newContext({ colorScheme: 'dark', viewport: { width: 1440, height: 900 } })
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {})
  const page = await ctx.newPage()
  watch(page, 'someone copying an icon in the default colour')
  await openCustomizer(page)
  await expect(page.locator('.icust-code code')).toContainText('<svg', { timeout: 20000 })
  const copy = async () => {
    await page.getByRole('button', { name: 'Copy SVG', exact: true }).click()
    await expect(page.getByRole('button', { name: /Copied!/ })).toBeVisible()
    return page.evaluate(() => navigator.clipboard.readText())
  }
  const plain = await copy()
  expect(plain.match(/<svg[^>]*>/)?.[0] || '', 'a colour was written onto the root').not.toMatch(/\s(color|fill|stroke)="#/)
  expect(plain, 'currentColor is gone from the file').toContain('currentColor')
  await page.getByRole('radio', { name: 'Black', exact: true }).click()
  await expect(page.getByRole('radio', { name: 'Black', exact: true })).toBeChecked()
  await expect(page.getByRole('button', { name: 'Copy SVG', exact: true })).toBeVisible({ timeout: 5000 })
  await expect.poll(copy, { timeout: 10000 }).toContain('color="#000000"')
  await ctx.close()
})

test.describe('the contrast note button', () => {
  test('pressing it hands focus to the ground it chose, not to the page', async ({ browser }) => {
    const ctx = await browser.newContext({ colorScheme: 'dark', viewport: { width: 1440, height: 900 } })
    const page = await ctx.newPage()
    watch(page, 'a keyboard user taking the note up on its offer')
    await openCustomizer(page)
    await page.getByRole('radio', { name: 'Black', exact: true }).click()
    const fix = page.getByRole('button', { name: 'Show on Light', exact: true })
    await fix.focus()
    await page.keyboard.press('Enter')
    const light = page.getByRole('radiogroup', { name: 'Background' }).getByRole('radio', { name: 'Light', exact: true })
    await expect(light).toBeChecked()
    await expect(light, 'focus fell to the page when the note went away').toBeFocused()
    await ctx.close()
  })
})
