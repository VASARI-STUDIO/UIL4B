// /create/gradient: three editor corrections, at 1440 and 390.
//
//   1. The stop's hex field takes `2f6bff` (no #), pasted text with spaces round it and a
//      3-digit hex, and shows #RRGGBB in capitals. Text that is not a hex keeps the stop's
//      last colour and says why in plain words.
//   2. A stop added to an OKLCH gradient takes the colour the OKLCH ramp has at that point,
//      so the gradient looks the same after the add. The expected colour is the browser's own
//      `color-mix(in oklch, ...)`, not a value read back from the page's code.
//   3. A preset tile stops reading as pressed once the gradient differs from the preset: the
//      angle, the interpolation space, the type or the stops.
//
// Indigo Night is the first-visit gradient (Linear, 160deg, Perceived, stops #0A0F2C 0,
// #27348B 55, #6E6BFF 100).
//
// MUTATIONS (each turns the tests named red):
//   normaliseHex requires the #                         -> "a hex without a # ..."
//   normaliseHex does not trim                          -> "pasted text with spaces ..."
//   normaliseHex does not expand 3 digits               -> "a 3-digit hex ..."
//   blur reverts instead of committing a valid draft    -> "a 3-digit hex ..."
//   the error copy goes back to "Use a 6-digit hex"     -> "text that is not a hex ..."
//   Escape no longer reverts the field                  -> "text that is not a hex ..."
//   newStopColour mixes in sRGB whatever the space      -> "a stop added in Perceived ..."
//   presetOn ignores the angle                          -> "the preset tile drops ..."
//   presetOn ignores the interpolation space            -> "the preset tile drops ..."
//   presetOn ignores the type                           -> "the preset tile drops ..."
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const ROUTE = '/create/gradient'
const CITRUS = {
  type: 'Linear', angle: 90, space: 'oklch', source: 'own',
  stops: [{ color: '#FFD84D', position: 0 }, { color: '#F0436A', position: 100 }],
}

const seed = (page, gradient) => page.addInitScript((g) => {
  localStorage.setItem('vs-current-design', JSON.stringify({ gradient: g }))
}, gradient)

async function open(page) {
  await go(page, ROUTE)
  await expect(page.getByRole('heading', { level: 1, name: 'Gradient' })).toBeVisible()
  await expect(page.getByRole('complementary', { name: 'Gradient controls' })).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
}

const hexField = (page, n = 1) => page.getByRole('textbox', { name: `Stop ${n} hex` })
const stopSelect = (page, n) => page.getByRole('button', { name: new RegExp(`^Select stop ${n}, #`) })
const indigo = (page) => page.locator('.grd-preset', { hasText: 'Indigo Night' })
const perceived = (page) => page.getByRole('button', { name: 'Perceived (OKLCH)', exact: true })
const standard = (page) => page.getByRole('button', { name: 'Standard (sRGB)', exact: true })
const angleInput = (page) => page.getByRole('spinbutton', { name: 'Gradient angle in degrees' })

/** The hex of stop `n` as the stop list names it. */
const stopHex = async (page, n) => /#[0-9A-Fa-f]{6}/.exec(await stopSelect(page, n).getAttribute('aria-label'))[0].toUpperCase()

/** [r, g, b] the browser gives `color-mix(in <space>, a, b)`: the hexes' halfway point by the browser's own maths. */
const browserMid = (page, space, a, b) => page.evaluate(([sp, c1, c2]) => {
  const probe = document.createElement('span')
  probe.style.color = `color-mix(in ${sp}, ${c1}, ${c2})`
  document.body.appendChild(probe)
  const mixed = getComputedStyle(probe).color
  probe.remove()
  const cv = document.createElement('canvas')
  cv.width = 1
  cv.height = 1
  const cx = cv.getContext('2d')
  cx.fillStyle = mixed
  cx.fillRect(0, 0, 1, 1)
  return [...cx.getImageData(0, 0, 1, 1).data.slice(0, 3)]
}, [space, a, b])

const rgbOf = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
const within = (got, want, tol) => Math.max(...got.map((v, i) => Math.abs(v - want[i]))) <= tol

for (const [width, height, touch] of [[1440, 900, false], [390, 844, true]]) {
  test.describe(`gradient editor corrections at ${width}px`, () => {
    test.use({ viewport: { width, height }, hasTouch: touch, isMobile: touch })
    test.beforeEach(async ({ page }) => { watch(page, 'a designer typing hex values and adding stops') })

    // ── 1 · the hex field ──────────────────────────────────────────────────

    test('a hex without a # is accepted and shown as #RRGGBB in capitals', async ({ page }) => {
      await open(page)
      const field = hexField(page)
      await field.fill('2f6bff')
      await expect(field).toHaveValue('#2F6BFF')
      await expect(field).toHaveAttribute('aria-invalid', 'false')
      expect(await stopHex(page, 1)).toBe('#2F6BFF')
    })

    test('pasted text with spaces round it is accepted, with or without the #', async ({ page }) => {
      await open(page)
      const field = hexField(page)
      await field.fill('  2f6bff  ')
      await expect(field).toHaveValue('#2F6BFF')
      expect(await stopHex(page, 1)).toBe('#2F6BFF')
      await field.fill('   #e0784e ')
      await field.press('Tab')
      await expect(field).toHaveValue('#E0784E')
      expect(await stopHex(page, 1)).toBe('#E0784E')
    })

    test('a 3-digit hex expands to 6 on Enter and on leaving the field', async ({ page }) => {
      await open(page)
      const field = hexField(page)
      await field.fill('#26f')
      await expect(field, 'three digits wait for Enter or blur, so typing six is never cut short').toHaveAttribute('aria-invalid', 'false')
      await field.press('Enter')
      await expect(field).toHaveValue('#2266FF')
      expect(await stopHex(page, 1)).toBe('#2266FF')

      await field.fill('f80')
      await field.press('Tab')
      await expect(field).toHaveValue('#FF8800')
      expect(await stopHex(page, 1)).toBe('#FF8800')
    })

    test('text that is not a hex keeps the stop\'s colour, says why, and Escape puts the colour back', async ({ page }) => {
      await open(page)
      const field = hexField(page)
      const before = await stopHex(page, 1)
      await field.fill('#12345')
      await expect(field).toHaveAttribute('aria-invalid', 'true')
      await expect(page.getByText('Use a hex like #2F6BFF')).toBeVisible()
      await expect(page.getByText(/oops/i)).toHaveCount(0)
      expect(await stopHex(page, 1), 'the stop has not changed').toBe(before)

      await field.press('Escape')
      await expect(field).toHaveValue(before)
      await expect(field).toHaveAttribute('aria-invalid', 'false')

      await field.fill('#NOTHEX')
      await field.press('Tab')
      await expect(field, 'leaving an invalid field restores the last valid colour').toHaveValue(before)
      expect(await stopHex(page, 1)).toBe(before)
    })

    // ── 2 · a new stop's colour ────────────────────────────────────────────

    test('a stop added in Perceived takes the OKLCH ramp\'s colour, not the sRGB blend', async ({ page }) => {
      await seed(page, CITRUS)
      await open(page)
      await expect(perceived(page)).toHaveAttribute('aria-pressed', 'true')

      const control = await browserMid(page, 'srgb', '#FFD84D', '#F0436A')
      expect(within(control, [248, 142, 92], 1), `the helper reads the browser's sRGB mid (${control})`).toBe(true)

      await page.getByRole('button', { name: 'Add a stop' }).click()
      await expect(stopSelect(page, 3)).toBeVisible()
      const added = rgbOf(await stopHex(page, 3))
      const oklchMid = await browserMid(page, 'oklch', '#FFD84D', '#F0436A')
      expect(within(added, oklchMid, 2), `new stop ${added} is the browser's OKLCH mid ${oklchMid}`).toBe(true)
      expect(within(added, control, 8), 'and it is not the sRGB blend').toBe(false)
    })

    test('a stop added in Standard takes the sRGB blend', async ({ page }) => {
      await seed(page, CITRUS)
      await open(page)
      await standard(page).click()
      await expect(standard(page)).toHaveAttribute('aria-pressed', 'true')
      await page.getByRole('button', { name: 'Add a stop' }).click()
      await expect(stopSelect(page, 3)).toBeVisible()
      const srgbMid = await browserMid(page, 'srgb', '#FFD84D', '#F0436A')
      expect(within(rgbOf(await stopHex(page, 3)), srgbMid, 2)).toBe(true)
    })

    // ── 3 · the preset tile ────────────────────────────────────────────────

    test('the preset tile drops its pressed state when the gradient stops matching it', async ({ page }) => {
      await open(page)
      await expect(indigo(page), 'the first-visit gradient is Indigo Night').toHaveAttribute('aria-pressed', 'true')

      await angleInput(page).fill('161')
      await expect(indigo(page), 'a different angle').toHaveAttribute('aria-pressed', 'false')
      await angleInput(page).fill('160')
      await expect(indigo(page), 'back at 160').toHaveAttribute('aria-pressed', 'true')

      await standard(page).click()
      await expect(indigo(page), 'a different interpolation').toHaveAttribute('aria-pressed', 'false')
      await perceived(page).click()
      await expect(indigo(page), 'back in Perceived').toHaveAttribute('aria-pressed', 'true')

      await page.getByRole('button', { name: 'Add a stop' }).click()
      await expect(indigo(page), 'a different set of stops').toHaveAttribute('aria-pressed', 'false')
    })

    test('the preset tile drops its pressed state on a type change and on a changed stop colour', async ({ page }) => {
      await open(page)
      await expect(indigo(page)).toHaveAttribute('aria-pressed', 'true')

      await page.locator('[aria-label="Gradient type"] .tl-pill', { hasText: 'Radial' }).click()
      await expect(indigo(page), 'a different type').toHaveAttribute('aria-pressed', 'false')
      await page.locator('[aria-label="Gradient type"] .tl-pill', { hasText: 'Linear' }).click()
      await expect(indigo(page), 'Linear again, same angle').toHaveAttribute('aria-pressed', 'true')

      await hexField(page).fill('#0A0F2D')
      await expect(indigo(page), 'a stop one step off').toHaveAttribute('aria-pressed', 'false')
      await hexField(page).fill('#0A0F2C')
      await expect(indigo(page)).toHaveAttribute('aria-pressed', 'true')
    })

    test('applying a preset makes its tile pressed and no other', async ({ page }) => {
      await open(page)
      const rose = page.locator('.grd-preset', { hasText: 'Rose Quartz' })
      await rose.click()
      await expect(rose).toHaveAttribute('aria-pressed', 'true')
      await expect(indigo(page)).toHaveAttribute('aria-pressed', 'false')
      expect(await page.locator('.grd-preset[aria-pressed="true"]').count()).toBe(1)
    })
  })
}

test.describe('adding a stop leaves the canvas as it was, at 1440px', () => {
  test.use({ viewport: { width: 1440, height: 900 } })
  test.beforeEach(async ({ page }) => { watch(page, 'a designer adding a stop to a Perceived gradient') })

  test('no pixel of the canvas moves by more than 8 levels in a channel', async ({ page }) => {
    await seed(page, CITRUS)
    await open(page)
    const canvas = page.locator('.grd-canvas')
    const before = await canvas.screenshot({ animations: 'disabled' })
    await page.getByRole('button', { name: 'Add a stop' }).click()
    await expect(stopSelect(page, 3)).toBeVisible()
    const after = await canvas.screenshot({ animations: 'disabled' })
    const largest = await page.evaluate(async ([a, b]) => {
      const read = async (b64) => {
        const bmp = await createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob())
        const cv = new OffscreenCanvas(bmp.width, bmp.height)
        const cx = cv.getContext('2d')
        cx.drawImage(bmp, 0, 0)
        return cx.getImageData(0, 0, bmp.width, bmp.height).data
      }
      const [p, q] = [await read(a), await read(b)]
      if (p.length !== q.length) return 1
      let worst = 0
      for (let i = 0; i < p.length; i += 4) {
        worst = Math.max(worst, Math.abs(p[i] - q[i]), Math.abs(p[i + 1] - q[i + 1]), Math.abs(p[i + 2] - q[i + 2]))
      }
      return worst
    }, [before.toString('base64'), after.toString('base64')])
    // The Citrus midpoint lies outside sRGB, so its hex stop is the clamped colour and the
    // ramp beside it moves by up to 7 levels. A blend in sRGB moves it by about 54.
    expect(largest, 'the largest move in any channel of any pixel').toBeLessThanOrEqual(8)
  })
})
