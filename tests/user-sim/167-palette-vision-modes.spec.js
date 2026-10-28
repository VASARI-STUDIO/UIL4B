// The Palette Generator's colour-vision check: the menu rows, the eye icons,
// choosing a mode, and the strip above the board that says a mode is on.
//
// The Vision select sits in Extra tools at most widths (it is the first thing to
// leave the row), so every test opens it through `openVision`, which goes via
// Extra tools only when it is not on the row.
//
// Each test names the code to break to see it fail (MUTATION lines).
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'
import { decodePng, hexRgb, pixel } from '../helpers/png.js'
import { simCvd } from '../../src/utils/colors.js'
import { VISION_HUES, VISION_MODES } from '../../src/utils/visionModes.js'

const IOS_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
const WIDTHS = [1440, 768, 390]
const TRIGGER = 'button[aria-label^="Colour vision check"]'
const rgb = (hex) => `rgb(${hexRgb(hex).join(', ')})`

/** A context at an exact width: touch metrics on a phone, a mouse above it. */
async function at(browser, width, { theme = 'light' } = {}) {
  const ctx = await browser.newContext(width < 700
    ? { viewport: { width, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: IOS_UA }
    : { viewport: { width, height: 900 } })
  await ctx.addInitScript((t) => { try { localStorage.setItem('vs-t', t) } catch { /* private mode */ } }, theme)
  const page = await ctx.newPage()
  watch(page, `palette visitor at ${width}px`)
  await go(page, '/create/palette')
  await expect(page.locator('.plb-col')).toHaveCount(5)
  return { ctx, page }
}

/** Open the Vision list, through Extra tools when the select is not on the row. */
async function openVision(page) {
  const onRow = page.locator(`[data-tool-toolbar] ${TRIGGER}`)
  if (!(await onRow.count())) await page.getByRole('button', { name: 'Extra tools', exact: true }).click()
  await page.locator(`${TRIGGER}:visible`).first().click()
  const list = page.getByRole('listbox', { name: 'Colour vision check' })
  await expect(list).toBeVisible()
  return list
}

/** Pick a mode with the mouse. */
async function chooseMode(page, id) {
  const list = await openVision(page)
  await list.locator(`[role="option"][data-value="${id}"]`).click()
  await expect(list).toBeHidden()
}

for (const width of WIDTHS) {
  test.describe(`Vision check at ${width}px`, () => {
    // MUTATION: add `max-width: 240px` to `.menu-select-list--rich` in global.css.
    test(`the list has five rows and every hint is whole (${width})`, async ({ browser }) => {
      const { ctx, page } = await at(browser, width)
      const list = await openVision(page)
      const rows = list.getByRole('option')
      await expect(rows).toHaveCount(5)
      await expect(rows.first()).toHaveAccessibleName('Normal vision')
      for (const [i, mode] of VISION_MODES.entries()) {
        const row = rows.nth(i)
        await expect(row).toHaveAccessibleName(mode.name)
        const hintId = await row.getAttribute('aria-describedby')
        await expect(page.locator(`[id="${hintId}"]`)).toHaveText(mode.hint)
        const fits = await page.locator(`[id="${hintId}"]`).evaluate((el) => el.scrollWidth <= el.clientWidth)
        expect(fits, `${mode.id} hint is not cut off`).toBe(true)
      }
      await ctx.close()
    })

    // MUTATION: swap the deuteranopia and protanopia values in VISION_HUES.
    test(`each row's dot is the hue its mode loses (${width})`, async ({ browser }) => {
      const { ctx, page } = await at(browser, width)
      const list = await openVision(page)
      for (const id of Object.keys(VISION_HUES)) {
        const fill = await list.locator(`[data-value="${id}"] .vis-dot`).evaluate((el) => getComputedStyle(el).fill)
        expect(fill, `${id} dot`).toBe(rgb(VISION_HUES[id]))
      }
      const normal = list.locator('[data-value="normal"]')
      const [dotFill, rowColour] = await normal.evaluate((row) => [getComputedStyle(row.querySelector('.vis-dot')).fill, getComputedStyle(row).color])
      expect(dotFill, 'normal takes the row colour').toBe(rowColour)
      await expect(list.locator('[data-value="achromatopsia"] .vis-ring')).toHaveCount(1)
      await expect(list.locator('[data-value="achromatopsia"] .vis-dot')).toHaveCount(0)
      await ctx.close()
    })

    // MUTATION: remove `changeVision` from the select's onChange in PaletteBuilder.jsx.
    test(`choosing Green-blind with the keyboard splits the board and shows the strip (${width})`, async ({ browser }) => {
      const { ctx, page } = await at(browser, width)
      const onRow = page.locator(`[data-tool-toolbar] ${TRIGGER}`)
      if (!(await onRow.count())) await page.getByRole('button', { name: 'Extra tools', exact: true }).click()
      await page.locator(`${TRIGGER}:visible`).first().focus()
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('Enter')
      const strip = page.locator('.plb-vision[role="status"]')
      await expect(strip).toContainText('Green-blind (deuteranopia)')
      // Focus is back on the Vision trigger, or on Extra tools when the select lives there.
      const focused = await page.evaluate(() => document.activeElement?.getAttribute('aria-label') || '')
      expect(focused.startsWith('Colour vision check') || focused === 'Extra tools', `focus is on "${focused}"`).toBe(true)
      for (const col of await page.locator('.plb-col').all()) await expect(col).toHaveClass(/plb-col--split/)
      // The lower half of the first column is the simulated colour.
      const first = page.locator('.plb-col').first()
      const colour = (await first.getAttribute('aria-label')).match(/#[0-9A-F]{6}$/)[0]
      const box = await first.boundingBox()
      const shot = await page.screenshot({ clip: { x: box.x + 3, y: box.y + box.height * 0.75, width: 1, height: 1 } })
      const got = pixel(decodePng(shot).rows[0], 0)
      const want = hexRgb(simCvd(colour, 'deuteranopia'))
      for (let i = 0; i < 3; i++) expect(Math.abs(got[i] - want[i]), `channel ${i}: ${got} vs ${want}`).toBeLessThanOrEqual(3)
      await ctx.close()
    })

    // MUTATION: make Escape call `choose(active)` in MenuSelect.jsx.
    test(`Escape leaves the mode alone (${width})`, async ({ browser }) => {
      const { ctx, page } = await at(browser, width)
      const list = await openVision(page)
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('Escape')
      await expect(list).toBeHidden()
      await expect(page.locator('.plb-vision')).toHaveCount(0)
      await expect(page.locator('.plb-col--split')).toHaveCount(0)
      await ctx.close()
    })

    // MUTATION: drop the `target?.focus(...)` line from `turnOffVision` in PaletteBuilder.jsx.
    test(`Turn off removes the strip, returns to normal and keeps focus (${width})`, async ({ browser }) => {
      const { ctx, page } = await at(browser, width)
      await chooseMode(page, 'protanopia')
      await expect(page.locator('.plb-vision')).toBeVisible()
      await page.getByRole('button', { name: 'Turn off the colour vision check' }).click()
      await expect(page.locator('.plb-vision')).toHaveCount(0)
      await expect(page.locator('.plb-col--split')).toHaveCount(0)
      const focused = await page.evaluate(() => document.activeElement?.getAttribute('aria-label') || '')
      expect(focused.startsWith('Colour vision check') || focused === 'Extra tools', `focus is on "${focused}"`).toBe(true)
      await expect(page.locator('p.sr-only[aria-live="polite"]')).toHaveText('Colour vision check off.')
      await ctx.close()
    })

    // MUTATION: remove `white-space: nowrap` from `.plb-vision-text` in palette-builder.css.
    test(`the strip is one height for every mode (${width})`, async ({ browser }) => {
      const { ctx, page } = await at(browser, width)
      const heights = {}
      for (const mode of VISION_MODES.filter((m) => m.id !== 'normal')) {
        await chooseMode(page, mode.id)
        heights[mode.id] = await page.locator('.plb-vision').evaluate((el) => el.getBoundingClientRect().height)
      }
      expect(new Set(Object.values(heights)).size, `heights ${JSON.stringify(heights)}`).toBe(1)
      await ctx.close()
    })

    // MUTATION: apply `menu-select-option--rich` to every row in MenuSelect.jsx.
    test(`other selects are unchanged (${width})`, async ({ browser }) => {
      const { ctx, page } = await at(browser, width)
      const onRow = page.locator('[data-tool-toolbar] button[aria-label^="Colour system"]')
      if (!(await onRow.count())) await page.getByRole('button', { name: 'Extra tools', exact: true }).click()
      await page.locator('button[aria-label^="Colour system"]:visible').first().click()
      const list = page.getByRole('listbox', { name: 'Colour system' })
      await expect(list).toBeVisible()
      await expect(list).not.toHaveClass(/menu-select-list--rich/)
      await expect(list.locator('.menu-select-option--rich, .menu-select-icon, .menu-select-foot')).toHaveCount(0)
      const display = await list.locator('[role="option"]').first().evaluate((el) => getComputedStyle(el).display)
      expect(display, 'rows are still flex rows').toBe('flex')
      await ctx.close()
    })
  })
}

// MUTATION: remove `white-space: nowrap` from `.plb-vision-text` in palette-builder.css.
test('nothing is wider than the screen at 320px with a mode on', async ({ browser }) => {
  const { ctx, page } = await at(browser, 320)
  await chooseMode(page, 'achromatopsia')
  const wide = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth
    return [...document.querySelectorAll('.plb-vision, .plb-vision *')].filter((el) => el.getBoundingClientRect().right > vw + 0.5).map((el) => el.className)
  })
  expect(wide, 'strip parts past the right edge').toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  await ctx.close()
})

// MUTATION: remove the `@media (pointer: coarse)` rules for `.plb-vision-off` and the rich rows.
test('on a touch screen the rows and Turn off are 44px or more', async ({ browser }) => {
  const { ctx, page } = await at(browser, 390)
  const list = await openVision(page)
  for (const row of await list.getByRole('option').all()) {
    expect((await row.boundingBox()).height).toBeGreaterThanOrEqual(44)
  }
  await list.locator('[data-value="tritanopia"]').click()
  const off = await page.getByRole('button', { name: 'Turn off the colour vision check' }).boundingBox()
  expect(off.width).toBeGreaterThanOrEqual(44)
  expect(off.height).toBeGreaterThanOrEqual(44)
  await ctx.close()
})

// MUTATION: make `.vis-dot` fill the dot with `currentColor` in VisionIcon.
test('the dot hue is the same in the dark theme', async ({ browser }) => {
  const { ctx, page } = await at(browser, 1440, { theme: 'dark' })
  const list = await openVision(page)
  const fill = await list.locator('[data-value="deuteranopia"] .vis-dot').evaluate((el) => getComputedStyle(el).fill)
  expect(fill).toBe(rgb(VISION_HUES.deuteranopia))
  await ctx.close()
})
