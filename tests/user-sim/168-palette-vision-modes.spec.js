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

/**
 * The Vision trigger, ready to use. When it is not on the row it lives in the
 * Extra tools panel, and that panel moves focus to its first control one frame
 * after it opens (usePopover, `autoFocus`). A `focus()` or a key press sent
 * before that frame is taken from the trigger, so wait until focus is inside the
 * panel before touching anything in it.
 */
async function visionTrigger(page, trigger = TRIGGER) {
  const onRow = page.locator(`[data-tool-toolbar] ${trigger}`)
  if (!(await onRow.count())) {
    await page.getByRole('button', { name: 'Extra tools', exact: true }).click()
    const panel = page.getByRole('dialog', { name: 'Extra tools' })
    await expect(panel).toBeVisible()
    await expect.poll(() => panel.evaluate((el) => el.contains(document.activeElement)), { message: 'Extra tools has taken focus' }).toBe(true)
  }
  return page.locator(`${trigger}:visible`).first()
}

/** Open the Vision list, through Extra tools when the select is not on the row. */
async function openVision(page) {
  await (await visionTrigger(page)).click()
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
    // MUTATION: in global.css change `.pop.menu-select-list.menu-select-list--rich` to `min-width:0;width:240px`
    // (the list is `width: max-content`, so only a fixed width narrows it; `max-width` loses to the rule's `min-width`).
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
      const trigger = await visionTrigger(page)
      await trigger.focus()
      await expect(trigger).toBeFocused()
      // The first ArrowDown opens the list on the current row (Normal) and moves
      // focus into it; wait for that before the second one moves down a row.
      await page.keyboard.press('ArrowDown')
      const list = page.getByRole('listbox', { name: 'Colour vision check' })
      await expect(list).toBeFocused()
      await page.keyboard.press('ArrowDown')
      await expect(list.locator('[data-value="deuteranopia"]')).toHaveClass(/is-active/)
      await page.keyboard.press('Enter')
      const strip = page.locator('.plb-vision')
      // Read what is on screen (innerText skips display:none), not textContent: at
      // 390 the long name is in the markup but hidden, and §1.7 shows the short one.
      if (width >= 768) {
        await expect(strip).toContainText('Green-blind (deuteranopia).', { useInnerText: true })
        await expect(strip).toContainText('Top half: your colour. Bottom half: how it looks.', { useInnerText: true })
      } else {
        await expect(strip).toContainText('Green-blind. Bottom half: how it looks.', { useInnerText: true })
        await expect(strip).not.toContainText('deuteranopia', { useInnerText: true })
        await expect(strip.locator('.plb-vision-short').first()).toBeVisible()
        await expect(strip.locator('.plb-vision-long').first()).toBeHidden()
      }
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

    // MUTATION: in the `dismiss` handler in MenuSelect.jsx, make Escape call `onChange` with the row
    // that `aria-activedescendant` points at. (Adding Escape to the 'select' case of listboxKeys.js only
    // makes Escape close the whole Extra tools panel, which this test also catches, by the trigger check.)
    test(`Escape leaves the mode alone (${width})`, async ({ browser }) => {
      const { ctx, page } = await at(browser, width)
      const list = await openVision(page)
      // Move to another row first, so Escape has a different row to wrongly choose.
      await expect(list).toBeFocused()
      await page.keyboard.press('ArrowDown')
      await expect(list.locator('[data-value="deuteranopia"]')).toHaveClass(/is-active/)
      await page.keyboard.press('Escape')
      await expect(list).toBeHidden()
      await expect(page.locator('.plb-vision')).toHaveCount(0)
      await expect(page.locator('.plb-col--split')).toHaveCount(0)
      await expect(page.locator(`${TRIGGER}:visible`).first()).toHaveAttribute('aria-label', 'Colour vision check: Normal vision')
      await ctx.close()
    })

    // MUTATION: make `focusVisionFallback` in PaletteBuilder.jsx do nothing (this test and the Undo one below both fail).
    // The strip is not a live region: the page's sr-only message is the one announcement.
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

    // MUTATION: drop the `requestAnimationFrame(...)` block from the cleanup in `VisionStrip` in PaletteBuilder.jsx
    // (focus then falls to the page body when Undo takes the strip away), or drop the `useEffect` after `changeVision`
    // (Redo then brings the mode back without saying so).
    test(`Undo that removes the strip keeps focus on the toolbar, and Redo says the mode is back (${width})`, async ({ browser }) => {
      const { ctx, page } = await at(browser, width)
      // A board change first, so Undo has a step that was taken before the mode was chosen.
      await page.getByRole('button', { name: /^Randomise/ }).first().click()
      await expect(page.locator('button.plb-undo:not(:disabled)')).toBeVisible()
      await chooseMode(page, 'protanopia')
      const strip = page.locator('.plb-vision')
      await expect(strip).toBeVisible()
      await expect(strip).not.toHaveAttribute('role', /./)
      await strip.getByRole('button', { name: 'Turn off the colour vision check' }).focus()
      // A script click, so focus stays on Turn off until the strip goes.
      await page.evaluate(() => document.querySelector('button.plb-undo:not(:disabled)').click())
      await expect(strip).toHaveCount(0)
      await expect.poll(() => page.evaluate(() => document.activeElement?.getAttribute('aria-label') || ''), { message: 'focus is back on the toolbar' })
        .toMatch(/^(Colour vision check|Extra tools)/)
      if (await page.locator('button.plb-redo:not(:disabled)').count()) {
        await page.evaluate(() => document.querySelector('button.plb-redo:not(:disabled)').click())
        await expect(strip).toBeVisible()
        await expect(page.locator('p.sr-only[aria-live="polite"]')).toContainText('Colour vision check on: red-blind (protanopia).')
      }
      await ctx.close()
    })

    // MUTATION: apply `menu-select-option--rich` to every row in MenuSelect.jsx.
    test(`other selects are unchanged (${width})`, async ({ browser }) => {
      const { ctx, page } = await at(browser, width)
      await (await visionTrigger(page, 'button[aria-label^="Colour system"]')).click()
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

// 320 is in the list on purpose: it is the one width where the longest strip text
// (Green-blind) is close enough to the Turn off button to wrap if it is allowed to.
// MUTATION: remove `white-space: nowrap` from `.plb-vision-text` in palette-builder.css.
for (const width of [320, ...WIDTHS]) {
  test(`the strip is one height for every mode (${width})`, async ({ browser }) => {
    const { ctx, page } = await at(browser, width)
    const heights = {}
    for (const mode of VISION_MODES.filter((m) => m.id !== 'normal')) {
      await chooseMode(page, mode.id)
      // The name is one line (a 13px line is about 21px; a wrapped one is about 43px). On a phone the
      // 44px button hides a wrap from the strip's own height, so the line count is checked as well.
      const { strip, name } = await page.locator('.plb-vision').evaluate((el) => ({
        strip: el.getBoundingClientRect().height,
        name: el.querySelector('.plb-vision-name').getBoundingClientRect().height,
      }))
      expect(name, `${mode.id} name wraps`).toBeLessThan(30)
      heights[mode.id] = strip
    }
    expect(new Set(Object.values(heights)).size, `heights ${JSON.stringify(heights)}`).toBe(1)
    await ctx.close()
  })
}

// MUTATION: remove `.plb .plb-vision-long { display: none; }` from the 767px block in palette-builder.css
// (the long wording then shows on a phone and runs off the right edge).
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

// MUTATION: remove the `.plb .plb-vision .plb-vision-off { min-width: 44px; height: 44px; ... }` rule inside the
// `@media (pointer: coarse)` block in palette-builder.css. (The rows are 52px before the coarse rule, so
// removing the rows' 56px rule does not fail the row check; the row check is a floor, not a guard on that rule.)
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

// MUTATION: in global.css add `[data-theme="dark"] .vis-dot { fill: currentColor }`.
test('the dot hue is the same in the dark theme', async ({ browser }) => {
  const { ctx, page } = await at(browser, 1440, { theme: 'dark' })
  const list = await openVision(page)
  const fill = await list.locator('[data-value="deuteranopia"] .vis-dot').evaluate((el) => getComputedStyle(el).fill)
  expect(fill).toBe(rgb(VISION_HUES.deuteranopia))
  await ctx.close()
})
