// ICON CUSTOMISER: ONE SWATCH PER COLOUR FOR MULTICOLOUR ICONS.
//
// A three-colour icon opens on "Original colours" with one swatch per distinct colour (.ied-paints .ied-paint,
// each named "Colour N of M, #hex"). Changing one swatch recolours only that colour in the stage and in the
// copied and downloaded SVG. A single-colour icon has no swatch list.
//
// SHOULD FAIL ON origin/main: the first three tests per width (there is no .ied-paints list there). The
// single-colour test is a negative control: it passes there too, and is paired with a positive control that the
// customiser is open.
//
// Fixture: tests/user-sim/fixtures/iconify/samples/tri-colour-24.svg (#e53935, #1e88e5, #43a047), served by name
// from the "logos" pack the way 296-brand-logo-own-colour does.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { test, expect } from './base.js'
import { chooseMenuOption, go, signIn, watch } from './helpers.js'
import { ICONIFY_HOSTS, ICONIFY_STUB_HEADER } from './iconify-stub.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const TRI_SVG = fs.readFileSync(path.join(here, 'fixtures/iconify/samples/tri-colour-24.svg'), 'utf8').trim()
const TRI_BODY = TRI_SVG.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')
const MONO_BODY = '<path fill="#181717" d="M3 3h18v18H3z"/>'
const BODIES = { 'tri-colour': TRI_BODY, 'mono-ink': MONO_BODY }
const svgOf = (body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${body}</svg>`

const RED = '#e53935'
const BLUE = '#1e88e5'
const GREEN = '#43a047'
const NEW_BLUE = '#ff00ff'

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

const serveLogos = async (page) => {
  const headers = { [ICONIFY_STUB_HEADER]: '1', 'access-control-allow-origin': '*' }
  const list = JSON.stringify({ prefix: 'logos', title: 'SVG Logos', total: Object.keys(BODIES).length, uncategorized: Object.keys(BODIES) })
  await page.route(u => ICONIFY_HOSTS.includes(u.hostname) && (u.pathname === '/logos.json' || u.pathname.startsWith('/logos/')), route => {
    const url = new URL(route.request().url())
    if (url.pathname.endsWith('.svg')) {
      const name = url.pathname.split('/').pop().replace(/\.svg$/, '')
      return route.fulfill({ contentType: 'image/svg+xml', headers, body: svgOf(BODIES[name] || TRI_BODY) })
    }
    const icons = Object.fromEntries((url.searchParams.get('icons') || '').split(',').filter(Boolean).map(n => [n, { body: BODIES[n] || TRI_BODY }]))
    return route.fulfill({ contentType: 'application/json', headers, body: JSON.stringify({ prefix: 'logos', width: 24, height: 24, icons }) })
  })
  await page.route(u => u.pathname === '/iconify/collections/logos.json', route => route.fulfill({ contentType: 'application/json', body: list }))
  await page.route(u => ICONIFY_HOSTS.includes(u.hostname) && u.pathname === '/collection' && u.searchParams.get('prefix') === 'logos', route => route.fulfill({ contentType: 'application/json', headers, body: list }))
}

const openIcon = async (browser, name, width, extra = {}) => {
  const ctx = await browser.newContext({ colorScheme: 'dark', viewport: { width, height: 900 }, ...extra })
  const page = await ctx.newPage()
  watch(page, 'someone recolouring a multicolour icon')
  await signIn(page, { plan: 'pro' })
  await page.addInitScript(() => {
    window.__copied = []
    navigator.clipboard.writeText = (text) => { window.__copied.push(text); return Promise.resolve() }
  })
  await serveLogos(page)
  await go(page, '/create/icons')
  await expect(page.locator('.ig .ic').first()).toBeVisible({ timeout: 20000 })
  await choosePack(page, 'logos')
  await page.getByRole('button', { name: `Customise ${name}`, exact: true }).click()
  await expect(page.getByRole('button', { name: 'Copy SVG', exact: true }), 'POSITIVE CONTROL: the customiser is open').toBeEnabled({ timeout: 20000 })
  return { ctx, page }
}

const swatches = (page) => page.locator('.ied-paints .ied-paint')
const swatchFor = (page, hex) => page.locator(`.ied-paints .ied-paint[data-paint="${hex}"]`)

const stageMarkup = async (page) => {
  const src = await page.locator('img.ied-stage-img:not(.ied-stage-wait)').getAttribute('src')
  return src && src.startsWith('data:') ? decodeURIComponent(src.replace(/^data:image\/svg\+xml;utf8,/, '')).toLowerCase() : ''
}

const copyOnce = async (page) => {
  const before = await page.evaluate(() => window.__copied.length)
  await page.getByRole('button', { name: 'Copy SVG', exact: true }).click()
  await expect.poll(() => page.evaluate(() => window.__copied.length)).toBeGreaterThan(before)
  return (await page.evaluate(() => window.__copied.at(-1))).toLowerCase()
}

const downloadSvg = async (page) => {
  const downloaded = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download SVG', exact: true }).click()
  const chunks = []
  for await (const chunk of await (await downloaded).createReadStream()) chunks.push(chunk)
  return Buffer.concat(chunks).toString('utf8').toLowerCase()
}

const changeSecondSwatch = async (page) => {
  await swatchFor(page, BLUE).click()
  const pop = page.getByRole('dialog', { name: 'Colour 2 of 3' })
  await expect(pop).toBeVisible()
  const field = pop.getByRole('textbox', { name: 'Colour value' })
  await field.fill(NEW_BLUE)
  await field.press('Enter')
  await expect(swatchFor(page, BLUE)).toHaveAttribute('aria-label', `Colour 2 of 3, ${NEW_BLUE}`)
  await page.keyboard.press('Escape')
  await expect(pop).toBeHidden()
}

for (const width of [1440, 390]) {
  test.describe(`multicolour swatches, ${width}`, () => {
    test('a three-colour icon lists one swatch per colour, in order, named by position and colour', async ({ browser }) => {
      const { ctx, page } = await openIcon(browser, 'tri-colour', width)
      await expect(swatches(page)).toHaveCount(3)
      await expect(swatches(page).nth(0)).toHaveAttribute('aria-label', `Colour 1 of 3, ${RED}`)
      await expect(swatches(page).nth(1)).toHaveAttribute('aria-label', `Colour 2 of 3, ${BLUE}`)
      await expect(swatches(page).nth(2)).toHaveAttribute('aria-label', `Colour 3 of 3, ${GREEN}`)
      await expect(page.locator('.ied-paint-reset'), 'nothing edited, nothing to reset').toHaveCount(0)
      await ctx.close()
    })

    test('changing one swatch recolours only that colour in the preview', async ({ browser }) => {
      const { ctx, page } = await openIcon(browser, 'tri-colour', width)
      await changeSecondSwatch(page)
      await expect.poll(() => stageMarkup(page)).toContain(NEW_BLUE)
      const markup = await stageMarkup(page)
      expect(markup).not.toContain(BLUE)
      expect(markup).toContain(RED)
      expect(markup).toContain(GREEN)
      await expect(swatchFor(page, RED)).toHaveAttribute('aria-label', `Colour 1 of 3, ${RED}`)
      await expect(swatchFor(page, GREEN)).toHaveAttribute('aria-label', `Colour 3 of 3, ${GREEN}`)
      await expect(page.locator('.ied-paint-reset')).toHaveCount(1)
      await ctx.close()
    })

    test('the new colour reaches the copied SVG and the downloaded SVG, and Reset colours takes it back', async ({ browser }) => {
      const { ctx, page } = await openIcon(browser, 'tri-colour', width)
      await changeSecondSwatch(page)
      const copied = await copyOnce(page)
      const downloaded = await downloadSvg(page)
      for (const [what, out] of [['copied', copied], ['downloaded', downloaded]]) {
        expect(out, `${what} SVG has the new colour`).toContain(NEW_BLUE)
        expect(out, `${what} SVG lost the old colour`).not.toContain(BLUE)
        expect(out, `${what} SVG keeps red`).toContain(RED)
        expect(out, `${what} SVG keeps green`).toContain(GREEN)
      }
      await page.locator('.ied-paint-reset').click()
      await expect(swatchFor(page, BLUE)).toHaveAttribute('aria-label', `Colour 2 of 3, ${BLUE}`)
      expect(await copyOnce(page)).toContain(BLUE)
      await ctx.close()
    })

    test('a single-colour icon has no swatch list', async ({ browser }) => {
      const { ctx, page } = await openIcon(browser, 'mono-ink', width)
      await expect(swatches(page)).toHaveCount(0)
      await expect(page.locator('.ied-paints')).toHaveCount(0)
      await expect(page.locator('.ied-paint-reset')).toHaveCount(0)
      await ctx.close()
    })
  })
}

// Layout of the swatches and their sheet. SHOULD FAIL before the fix: the forced-colours chip had no border and
// was painted out, Reset colours was display:inline (22px tall on a touch screen), and on a phone the sheet sat a
// tab bar's height above the bottom with Copy SVG showing under it and Close overlapping the colour pad.
test.describe('multicolour swatches, layout', () => {
  test('in forced colours each swatch keeps its colour and has a visible edge', async ({ browser }) => {
    const { ctx, page } = await openIcon(browser, 'tri-colour', 1440, { forcedColors: 'active' })
    await expect(swatches(page)).toHaveCount(3)
    const chip = await swatchFor(page, RED).locator('.ied-sw').evaluate(el => {
      const cs = getComputedStyle(el)
      return { adjust: cs.forcedColorAdjust, border: cs.borderTopWidth, bg: cs.backgroundColor }
    })
    expect(chip.adjust).toBe('none')
    expect(chip.border).toBe('1px')
    expect(chip.bg).toBe('rgb(229, 57, 53)')
    const edge = await swatchFor(page, RED).evaluate(el => getComputedStyle(el).borderTopWidth)
    expect(edge).toBe('1px')
    await ctx.close()
  })

  test('on a touch phone Reset colours is at least 44px tall', async ({ browser }) => {
    const { ctx, page } = await openIcon(browser, 'tri-colour', 390, { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
    await changeSecondSwatch(page)
    const box = await page.locator('.ied-paint-reset').boundingBox()
    expect(box.height).toBeGreaterThanOrEqual(44)
    await ctx.close()
  })

  test('on a phone the colour sheet reaches the bottom edge and Close clears the colour pad', async ({ browser }) => {
    const { ctx, page } = await openIcon(browser, 'tri-colour', 390, { viewport: { width: 390, height: 844 } })
    await swatchFor(page, BLUE).click()
    const pop = page.getByRole('dialog', { name: 'Colour 2 of 3' })
    await expect(pop).toBeVisible()
    await expect.poll(async () => Math.round((await pop.boundingBox()).y)).toBeLessThan(844)
    await page.waitForTimeout(400)
    const sheet = await pop.boundingBox()
    expect(sheet.y + sheet.height).toBeGreaterThanOrEqual(843)
    const close = await pop.getByRole('button', { name: 'Close' }).boundingBox()
    const pad = await pop.locator('.cpk-pad').boundingBox()
    expect(close.y).toBeGreaterThanOrEqual(sheet.y)
    expect(close.y + close.height).toBeLessThanOrEqual(pad.y)
    await ctx.close()
  })
})
