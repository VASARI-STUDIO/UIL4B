// ICON LIBRARY: A BRAND LOGO KEEPS ITS OWN COLOUR.
//
// A logo drawn in ONE colour that is not near-black (a brand's red or blue) used to be
// read as a mono icon in the customiser, so the stage, Copy SVG, Save and Download drew
// it in the page's ink. It is now drawn in its own colour until a colour is chosen, and
// the Colour row offers that colour as "Original" beside Black, White and Custom.
// One-colour near-black art (GitHub) still follows the theme ink, and multi-colour art
// still reads "Original colours".
//
// MUTATIONS (each one turns a test below red):
//   colourRowState returns 'choose' for a non-black single paint -> "opens in its own colour"
//   `isColoredPack` ignores `color` for a brand row                -> "Black recolours it"
//   Original sets a hex instead of ''                              -> "Original restores the art's own paint"
//   the row's near-black limit is dropped                          -> "near-black art still follows the ink"
//   a saved icon's own paint is ignored when it reopens            -> "a saved, never-recoloured brand logo"
//   the header line follows the chosen colour, not the art          -> "recolouring changes nothing else"
//   the Similar tiles' URL carries the colour choice                -> "recolouring changes nothing else"
//   Copy SVG writes the clipboard here and again in onCopy          -> "recolouring changes nothing else"
//   Copy SVG leaves the write to onCopy (no textarea fallback)      -> "with no Clipboard API"
import { test, expect } from './base.js'
import { chooseMenuOption, go, signIn, watch } from './helpers.js'
import { ICONIFY_HOSTS, ICONIFY_STUB_HEADER } from './iconify-stub.js'

const BRAND = '#635bff'
const BRAND_RGB = 'rgb(99, 91, 255)'
// Three diamonds in one colour: a mark that is one paint but not near-black.
const DIAMONDS = `<path fill="${BRAND}" d="M12 2l4 6-4 6-4-6z"/><path fill="${BRAND}" d="M7 10l4 6-4 6-4-6z"/><path fill="${BRAND}" d="M17 10l4 6-4 6-4-6z"/>`
const BODIES = {
  stripe: DIAMONDS,
  // A sibling by name, so the customiser has a Similar tile to show for stripe.
  'stripe-icon': DIAMONDS,
  'github-icon': '<path fill="#181717" d="M3 3h18v18H3z"/>',
  gitlab: '<path fill="#fc6d26" d="M3 3h18v18H3z"/><path fill="#e24329" d="M8 8h8v8H8z"/>',
}
// The ink an un-tinted icon is drawn in on the dark page.
const DARK_INK = '#EFEEEA'

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

/** Serve logos by name: a one-colour brand (and its sibling), a near-black one and a two-colour one. */
const serveLogos = async (page) => {
  await page.route(u => ICONIFY_HOSTS.includes(u.hostname) && (u.pathname === '/logos.json' || u.pathname.startsWith('/logos/')), route => {
    const url = new URL(route.request().url())
    const isSvg = url.pathname.endsWith('.svg')
    const svgOf = (body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${body}</svg>`
    const headers = { [ICONIFY_STUB_HEADER]: '1', 'access-control-allow-origin': '*' }
    if (isSvg) {
      const name = url.pathname.split('/').pop().replace(/\.svg$/, '')
      return route.fulfill({ contentType: 'image/svg+xml', headers, body: svgOf(BODIES[name] || BODIES.gitlab) })
    }
    const icons = Object.fromEntries((url.searchParams.get('icons') || '').split(',').filter(Boolean).map(n => [n, { body: BODIES[n] || BODIES.gitlab }]))
    return route.fulfill({ contentType: 'application/json', headers, body: JSON.stringify({ prefix: 'logos', width: 24, height: 24, icons }) })
  })
  // The pack's name list ships with the app; this one lists only the logos above.
  await page.route(u => u.pathname === '/iconify/collections/logos.json', route => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ prefix: 'logos', title: 'SVG Logos', total: Object.keys(BODIES).length, uncategorized: Object.keys(BODIES) }),
  }))
  await page.route(u => ICONIFY_HOSTS.includes(u.hostname) && u.pathname === '/collection' && u.searchParams.get('prefix') === 'logos', route => route.fulfill({
    contentType: 'application/json', headers: { [ICONIFY_STUB_HEADER]: '1', 'access-control-allow-origin': '*' },
    body: JSON.stringify({ prefix: 'logos', title: 'SVG Logos', total: Object.keys(BODIES).length, uncategorized: Object.keys(BODIES) }),
  }))
}

const openLogo = async (browser, name, { width = 1440, touch = false, noClipboardApi = false } = {}) => {
  const ctx = await browser.newContext({ colorScheme: 'dark', viewport: { width, height: 900 }, hasTouch: touch, isMobile: touch })
  const page = await ctx.newPage()
  watch(page, 'someone customising a brand logo')
  await signIn(page, { plan: 'pro' })
  await page.addInitScript((noApi) => {
    window.__copied = []
    if (noApi) {
      // A browser without the Clipboard API: only the textarea and execCommand('copy') work.
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined })
      document.execCommand = (cmd) => {
        if (cmd !== 'copy') return false
        window.__copied.push(document.activeElement?.value ?? '')
        return true
      }
      return
    }
    navigator.clipboard.writeText = (text) => { window.__copied.push(text); return Promise.resolve() }
  }, noClipboardApi)
  await serveLogos(page)
  await go(page, '/create/icons')
  await expect(page.locator('.ig .ic').first()).toBeVisible({ timeout: 20000 })
  await choosePack(page, 'logos')
  await page.getByRole('button', { name: `Customise ${name}`, exact: true }).click()
  await expect(page.getByRole('button', { name: 'Copy SVG', exact: true })).toBeEnabled({ timeout: 20000 })
  return { ctx, page }
}

const colourRow = (page) => page.locator('#ied-colour-label').locator('xpath=ancestor::div[2]')
const chip = (page, name) => colourRow(page).getByRole('radio', { name, exact: true })

/** The markup the stage image is drawn from, once it is a data: URI of the art. */
const stageMarkup = async (page) => {
  const src = await page.locator('img.ied-stage-img:not(.ied-stage-wait)').getAttribute('src')
  return src && src.startsWith('data:') ? decodeURIComponent(src.replace(/^data:image\/svg\+xml;utf8,/, '')) : ''
}

/** What the browser computes for each path's fill when the markup is drawn on its
    own: inside a shadow root, so the page's stylesheets cannot repaint it. */
const computedFills = (page, markup) => page.evaluate((m) => {
  const host = document.createElement('div')
  host.style.cssText = 'position:fixed;left:-9999px;top:0;color:rgb(1, 2, 3)'
  const root = host.attachShadow({ mode: 'open' })
  root.innerHTML = m
  document.body.append(host)
  const fills = [...root.querySelectorAll('path')].map(p => getComputedStyle(p).fill)
  host.remove()
  return fills
}, markup)

const copyOnce = async (page) => {
  const before = await page.evaluate(() => window.__copied.length)
  await page.getByRole('button', { name: 'Copy SVG', exact: true }).click()
  // One press writes once; the last write is the file.
  await expect.poll(() => page.evaluate(() => window.__copied.length)).toBeGreaterThan(before)
  return page.evaluate(() => window.__copied.at(-1))
}

const downloadSvg = async (page) => {
  const downloaded = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download SVG', exact: true }).click()
  const chunks = []
  for await (const chunk of await (await downloaded).createReadStream()) chunks.push(chunk)
  return Buffer.concat(chunks).toString('utf8')
}

test('a one-colour brand logo opens in its own colour, in the stage, the copy and the download', async ({ browser }) => {
  const { ctx, page } = await openLogo(browser, 'stripe')
  // The row offers the brand's colour as Original, selected, with a swatch of that colour.
  await expect(page.getByText('Original colours', { exact: true })).toHaveCount(0)
  await expect(chip(page, 'Original')).toBeChecked()
  await expect(chip(page, 'Default')).toHaveCount(0)
  await expect(chip(page, 'Black')).toBeVisible()
  await expect(chip(page, 'White')).toBeVisible()
  await expect(colourRow(page).locator('.cpk-trigger')).toHaveCount(1)
  await expect(chip(page, 'Original').locator('.ied-sw')).toHaveCSS('background-color', BRAND_RGB)
  await expect(colourRow(page).locator('.ied-lblrow .ied-val')).toHaveText(BRAND.toUpperCase())

  // The stage's paths compute to the brand colour, not the ink.
  await expect.poll(() => stageMarkup(page)).toContain(BRAND)
  const markup = await stageMarkup(page)
  expect(markup).not.toContain('currentColor')
  expect(markup).not.toContain(DARK_INK)
  expect(await computedFills(page, markup)).toEqual([BRAND_RGB, BRAND_RGB, BRAND_RGB])

  // Copy and download carry the brand hex when no colour has been chosen.
  const copied = await copyOnce(page)
  expect(copied).toContain(`fill="${BRAND}"`)
  expect(copied).not.toContain('currentColor')
  expect(copied).not.toContain(DARK_INK)
  expect(copied).not.toMatch(/\scolor="/)
  const output = await downloadSvg(page)
  expect(output).toContain(`fill="${BRAND}"`)
  expect(output).not.toContain('currentColor')
  expect(output).not.toMatch(/\scolor="/)
  await ctx.close()
})

test('Black recolours a brand logo and Original restores the art\'s own paint', async ({ browser }) => {
  const { ctx, page } = await openLogo(browser, 'stripe')
  await expect.poll(() => stageMarkup(page)).toContain(BRAND)
  const original = await copyOnce(page)

  await chip(page, 'Black').click()
  await expect(chip(page, 'Black')).toBeChecked()
  await expect(chip(page, 'Original')).not.toBeChecked()
  await expect.poll(() => stageMarkup(page)).not.toContain(BRAND)
  const black = await stageMarkup(page)
  expect(black).toContain('color="#000000"')
  expect(await computedFills(page, black)).toEqual(['rgb(0, 0, 0)', 'rgb(0, 0, 0)', 'rgb(0, 0, 0)'])
  const copiedBlack = await copyOnce(page)
  expect(copiedBlack).toContain('color="#000000"')
  expect(copiedBlack).not.toContain(BRAND)
  expect(await downloadSvg(page)).not.toContain(BRAND)
  // The row still offers the brand colour while another is chosen.
  await expect(chip(page, 'Original').locator('.ied-sw')).toHaveCSS('background-color', BRAND_RGB)

  await chip(page, 'Original').click()
  await expect(chip(page, 'Original')).toBeChecked()
  await expect.poll(() => stageMarkup(page)).toContain(BRAND)
  expect(await computedFills(page, await stageMarkup(page))).toEqual([BRAND_RGB, BRAND_RGB, BRAND_RGB])
  expect(await copyOnce(page), 'Original did not put the art back byte for byte').toBe(original)
  await ctx.close()
})

test('recolouring a brand logo changes nothing else: the header line, the Similar tiles, one clipboard write', async ({ browser }) => {
  const { ctx, page } = await openLogo(browser, 'stripe')
  const tiles = []
  page.on('request', (r) => {
    const u = new URL(r.url())
    if (ICONIFY_HOSTS.includes(u.hostname) && u.pathname.startsWith('/logos/') && u.searchParams.get('height') === '24') tiles.push(r.url())
  })
  const sub = page.locator('.ied-hd .ied-note')
  await expect(sub).toHaveText('Logos (colour)')
  const tileImgs = page.locator('.ied-sim img')
  await expect(tileImgs).toHaveCount(1)
  const srcs = await tileImgs.evaluateAll((els) => els.map((e) => e.getAttribute('src')))
  const fetched = tiles.length

  for (const name of ['Black', 'Original', 'White', 'Original']) {
    await chip(page, name).click()
    await expect(chip(page, name)).toBeChecked()
    await expect(sub, `the header line stays put on ${name}`).toHaveText('Logos (colour)')
    expect(await tileImgs.evaluateAll((els) => els.map((e) => e.getAttribute('src'))), `the tiles keep their source on ${name}`).toEqual(srcs)
  }
  expect(tiles.length, 'no Similar tile is fetched again').toBe(fetched)

  const before = await page.evaluate(() => window.__copied.length)
  await page.getByRole('button', { name: 'Copy SVG', exact: true }).click()
  await expect(page.locator('.toast.show')).toContainText('Copied')
  expect(await page.evaluate(() => window.__copied.length) - before, 'one press, one write').toBe(1)
  await ctx.close()
})

test('with no Clipboard API, Copy SVG still copies, through the textarea, once', async ({ browser }) => {
  const { ctx, page } = await openLogo(browser, 'stripe', { noClipboardApi: true })
  await page.getByRole('button', { name: 'Copy SVG', exact: true }).click()
  await expect(page.locator('.toast.show')).toContainText('Copied')
  await expect(page.getByText('Clipboard is not available in this browser')).toHaveCount(0)
  const copied = await page.evaluate(() => window.__copied)
  expect(copied).toHaveLength(1)
  expect(copied[0]).toContain(`fill="${BRAND}"`)
  await ctx.close()
})

test('near-black art still follows the theme ink, with no Original choice', async ({ browser }) => {
  const { ctx, page } = await openLogo(browser, 'github-icon')
  await expect(chip(page, 'Default')).toBeChecked()
  await expect(chip(page, 'Original')).toHaveCount(0)
  await expect(page.getByText('Original colours', { exact: true })).toHaveCount(0)
  await expect.poll(() => stageMarkup(page)).toContain(DARK_INK)
  const markup = await stageMarkup(page)
  expect(markup).not.toContain('#181717')
  // Drawn in the ink, not the art's own near-black.
  expect(await computedFills(page, markup)).not.toContain('rgb(24, 23, 23)')
  await ctx.close()
})

test('multi-colour art still shows its original colours, with nothing to choose', async ({ browser }) => {
  const { ctx, page } = await openLogo(browser, 'gitlab')
  await expect(page.getByText('Original colours', { exact: true })).toBeVisible()
  await expect(colourRow(page).getByRole('radio')).toHaveCount(0)
  await expect.poll(() => stageMarkup(page)).toContain('#fc6d26')
  expect(await stageMarkup(page)).toContain('#e24329')
  await ctx.close()
})

test('a saved, never-recoloured brand logo comes back in its own colour', async ({ browser }) => {
  const ctx = await browser.newContext({ colorScheme: 'dark', viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  watch(page, 'someone reopening a saved brand logo')
  await signIn(page, { plan: 'pro' })
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">${DIAMONDS}</svg>`
  const saved = [{
    key: 'vs-custom-icons:1:stripe', ts: 1, base: 'stripe', iteration: 1, projectId: null, name: 'Custom (stripe 1)',
    pack: 'logos', cdn: true, svg, color: '', colored: true,
    size: 24, stroke: 2, absStroke: true, cap: 'round', join: 'round', isStroke: false, strokeUnit: 'px',
  }]
  await go(page, '/create/icons')
  await page.evaluate((list) => localStorage.setItem('vs-custom-icons', JSON.stringify(list)), saved)
  await go(page, '/create/icons')
  await expect(page.locator('.ig .ic').first()).toBeVisible({ timeout: 20000 })
  await page.locator('.ig-toolbar button.ig-mine').click()
  await page.locator('.ig .ic', { hasText: 'Custom (stripe 1)' }).click()
  await expect(chip(page, 'Original')).toBeChecked({ timeout: 20000 })
  await expect(page.getByText('Original colours', { exact: true })).toHaveCount(0)
  const fills = await page.locator('.ied-stage-host path').evaluateAll(ps => ps.map(p => getComputedStyle(p).fill))
  expect(fills).toEqual([BRAND_RGB, BRAND_RGB, BRAND_RGB])
  await ctx.close()
})

test('on a phone the Original chip is a 44px target and the page does not scroll sideways', async ({ browser }) => {
  const { ctx, page } = await openLogo(browser, 'stripe', { width: 390, touch: true })
  // Measured once the customiser has finished opening: mid-animation the chip is a
  // fraction of a pixel short (43.99997px), which is the scale, not the target.
  // Looping animations (a loader) never finish, so only the finite ones are waited on.
  await page.evaluate(() => Promise.all(document.getAnimations()
    .filter((a) => Number.isFinite(a.effect?.getComputedTiming?.().endTime))
    .map((a) => a.finished.catch(() => {}))))
  const box = await chip(page, 'Original').boundingBox()
  expect(Math.round(box.height * 100) / 100).toBeGreaterThanOrEqual(44)
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 'the page scrolls sideways').toBeLessThanOrEqual(0)
  await ctx.close()
})
