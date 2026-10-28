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
import { HARMONY_OFFSETS, simCvd } from '../../src/utils/colors.js'
import { VISION_HUES, VISION_MODES } from '../../src/utils/visionModes.js'

const IOS_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
const WIDTHS = [1440, 768, 390]
const TRIGGER = 'button[aria-label^="Colour vision check"]'
const rgb = (hex) => `rgb(${hexRgb(hex).join(', ')})`

/** A context at an exact width: touch metrics on a phone, a mouse above it. */
async function at(browser, width, { theme = 'light', path = '/create/palette' } = {}) {
  const ctx = await browser.newContext(width < 700
    ? { viewport: { width, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: IOS_UA }
    : { viewport: { width, height: 900 } })
  await ctx.addInitScript((t) => { try { localStorage.setItem('vs-t', t) } catch { /* private mode */ } }, theme)
  const page = await ctx.newPage()
  watch(page, `palette visitor at ${width}px`)
  await go(page, path)
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
    test(`the list has a row for every mode and every hint is whole (${width})`, async ({ browser }) => {
      const { ctx, page } = await at(browser, width)
      const list = await openVision(page)
      const rows = list.getByRole('option')
      await expect(rows).toHaveCount(VISION_MODES.length)
      expect(VISION_MODES.map((m) => m.id).slice(0, 2), 'the mild mode follows Normal').toEqual(['normal', 'deuteranomaly'])
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
      for (const id of Object.keys(VISION_HUES).filter((m) => m !== 'deuteranomaly')) {
        const fill = await list.locator(`[data-value="${id}"] .vis-dot`).evaluate((el) => getComputedStyle(el).fill)
        expect(fill, `${id} dot`).toBe(rgb(VISION_HUES[id]))
      }
      // The mild mode's dot is part-filled: its hue is the fill of one part and the stroke of another.
      const mild = await list.locator('[data-value="deuteranomaly"] .vis-dot').evaluateAll((els) => els.map((el) => { const s = getComputedStyle(el); return { fill: s.fill, stroke: s.stroke } }))
      expect(mild.length, 'the mild dot is drawn').toBeGreaterThan(0)
      expect(mild.some((p) => p.fill === rgb(VISION_HUES.deuteranomaly) || p.stroke === rgb(VISION_HUES.deuteranomaly)), `mild dot parts ${JSON.stringify(mild)}`).toBe(true)
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
      // Green-blind sits after Normal and the mild mode, so it takes one ArrowDown per row passed.
      for (const mode of VISION_MODES.slice(1, VISION_MODES.findIndex((m) => m.id === 'deuteranopia') + 1)) {
        await page.keyboard.press('ArrowDown')
        await expect(list.locator(`[data-value="${mode.id}"]`)).toHaveClass(/is-active/)
      }
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
      await expect(list.locator(`[data-value="${VISION_MODES[1].id}"]`)).toHaveClass(/is-active/)
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
      // Undo steps back to a board the page has written to its history, and that log is written 900 ms after the
      // board last changed (a Randomise inside that window replaces it, so Undo stays disabled). Wait for the
      // opening board to be logged, then change the board, so Undo has a step that predates the mode.
      const logged = () => page.evaluate(() => { try { return JSON.parse(localStorage.getItem('vs-palette-history') || '[]').length } catch { return 0 } })
      await expect.poll(logged, { message: 'the opening board is in the palette history' }).toBeGreaterThan(0)
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
      // Undo brought back the board from before the mode, so Redo has the one it left.
      // Redo is on the row at 768 and up; on a phone it has moved into Extra tools.
      if (await page.locator('[data-tool-toolbar] button.plb-redo').count()) {
        await expect(page.locator('button.plb-redo:not(:disabled)')).toHaveCount(1)
        await page.evaluate(() => document.querySelector('button.plb-redo:not(:disabled)').click())
      } else {
        await page.getByRole('button', { name: 'Extra tools', exact: true }).click()
        const panel = page.getByRole('dialog', { name: 'Extra tools' })
        const redo = panel.getByRole('button', { name: 'Redo', exact: true })
        await expect(redo).toBeEnabled()
        await redo.click()
      }
      await expect(strip).toBeVisible()
      await expect(page.locator('p.sr-only[aria-live="polite"]')).toContainText('Colour vision check on: red-blind (protanopia).')
      await ctx.close()
    })

    // MUTATION: in PaletteBuilder.jsx drop `icon:` from `systemOptions` (no wheels, and the list stops being rich),
    // or make HarmonyWheel ignore `system` (every wheel then draws the same dots).
    test(`each Colour system row has its own wheel icon (${width})`, async ({ browser }) => {
      const { ctx, page } = await at(browser, width)
      await (await visionTrigger(page, 'button[aria-label^="Colour system"]')).click()
      const list = page.getByRole('listbox', { name: 'Colour system' })
      await expect(list).toBeVisible()
      await expect(list).toHaveClass(/menu-select-list--rich/)
      const ids = Object.keys(HARMONY_OFFSETS)
      await expect(list.getByRole('option')).toHaveCount(ids.length)
      const drawn = new Set()
      for (const id of ids) {
        const icon = list.locator(`[role="option"][data-value="${id}"] .menu-select-icon`)
        await expect(icon.locator('svg.harm-wheel'), `${id} has a wheel`).toHaveCount(1)
        const box = await icon.boundingBox()
        // The list eases in with a small scale, so the box is read to the nearest pixel.
        expect(box.width, `${id} wheel width`).toBeCloseTo(20, 0)
        expect(box.height, `${id} wheel height`).toBeCloseTo(20, 0)
        const dots = await icon.locator('.harm-dot').evaluateAll((els) => els.map((el) => `${el.getAttribute('cx')},${el.getAttribute('cy')}`))
        // One dot per full-strength hue; monochromatic steps one hue inward, so it only has to draw some.
        if (id === 'monochromatic') expect(dots.length, 'monochromatic dots').toBeGreaterThan(0)
        else expect(dots.length, `${id} dots`).toBe(HARMONY_OFFSETS[id].length)
        drawn.add(dots.join(' '))
      }
      expect(drawn.size, 'no two systems draw the same wheel').toBe(ids.length)
      await ctx.close()
    })

    // MUTATION: in PaletteBuilder.jsx set `note: ''` for Auto, or in MenuSelect.jsx drop `option.note` from `spoken`.
    test(`Auto is recommended in the list and plain Auto on the trigger (${width})`, async ({ browser }) => {
      const { ctx, page } = await at(browser, width)
      const trigger = await visionTrigger(page, 'button[aria-label^="Colour system"]')
      // The trigger says only the name, and carries the 16px wheel.
      await expect(trigger).toHaveAttribute('aria-label', 'Colour system: Auto')
      await expect(trigger.locator('.tl-select-v')).toHaveText('Auto')
      await expect(trigger).not.toContainText(/recommended/i)
      const wheel = trigger.locator('svg.harm-wheel')
      await expect(wheel).toHaveCount(1)
      expect((await wheel.boundingBox()).width, 'trigger wheel width').toBe(16)
      await trigger.click()
      const list = page.getByRole('listbox', { name: 'Colour system' })
      await expect(list).toBeVisible()
      const auto = list.locator('[role="option"][data-value="auto"]')
      await expect(auto).toHaveAccessibleName('Auto, recommended')
      await expect(auto.locator('.menu-select-text')).toContainText(/\(recommended\)/i)
      await expect(auto.locator('.menu-select-text')).toContainText('Auto')
      // Only Auto is flagged, and the trigger and the list still agree on the chosen row.
      await expect(list.getByText(/\(recommended\)/i)).toHaveCount(1)
      await expect(auto).toHaveAttribute('aria-selected', 'true')
      await ctx.close()
    })

    // MUTATION: in PaletteBuilder.jsx change the Pro mark to '' for locked systems, or in global.css delete the
    // `:has(.menu-select-mark)` rule (the check then drops to a second line of the grid).
    test(`locked systems carry a Pro mark and lay out in four columns (${width})`, async ({ browser }) => {
      const { ctx, page } = await at(browser, width)
      await (await visionTrigger(page, 'button[aria-label^="Colour system"]')).click()
      const list = page.getByRole('listbox', { name: 'Colour system' })
      await expect(list).toBeVisible()
      const free = ['auto', 'monochromatic']
      const listBox = await list.boundingBox()
      for (const id of Object.keys(HARMONY_OFFSETS)) {
        const row = list.locator(`[role="option"][data-value="${id}"]`)
        const mark = row.locator('.menu-select-mark')
        if (free.includes(id)) {
          await expect(mark, `${id} is free, so no mark`).toHaveCount(0)
        } else {
          await expect(mark, `${id} is locked for a free visitor`).toHaveText('Pro')
          await expect(row).toHaveAccessibleName(/, Pro$/)
        }
        const m = await row.evaluate((el) => {
          const box = (sel) => { const r = el.querySelector(sel).getBoundingClientRect(); return { cy: r.top + r.height / 2, right: r.right, left: r.left } }
          const row = el.getBoundingClientRect()
          return { tracks: getComputedStyle(el).gridTemplateColumns.split(' ').length, rowCy: row.top + row.height / 2, rowRight: row.right,
            check: box('.menu-select-check'), mark: el.querySelector('.menu-select-mark') ? box('.menu-select-mark') : null,
            desc: { ws: getComputedStyle(el.querySelector('.menu-select-desc')).whiteSpace, fits: el.querySelector('.menu-select-desc').scrollWidth <= el.querySelector('.menu-select-desc').clientWidth } }
        })
        expect(m.tracks, `${id} grid tracks`).toBe(free.includes(id) ? 3 : 4)
        // The check stays on the row's one line, to the right of the mark.
        expect(Math.abs(m.check.cy - m.rowCy), `${id} check is centred on the row`).toBeLessThanOrEqual(1.5)
        expect(m.check.right, `${id} check inside the row`).toBeLessThanOrEqual(m.rowRight)
        if (m.mark) {
          expect(Math.abs(m.mark.cy - m.rowCy), `${id} mark is centred on the row`).toBeLessThanOrEqual(1.5)
          expect(m.mark.right, `${id} mark sits left of the check`).toBeLessThanOrEqual(m.check.left)
          expect(m.desc.ws, `${id} hint wraps`).toBe('normal')
        }
        expect(m.desc.fits, `${id} hint is whole`).toBe(true)
        expect(m.rowRight, `${id} row is inside the list`).toBeLessThanOrEqual(listBox.x + listBox.width + 0.5)
      }
      await ctx.close()
    })
  })
}

// Rows are 44px or more on a touch screen. The premise is checked first: a fullPage or element screenshot in this
// kind of context turns pointer:coarse off, so nothing here takes one.
// MUTATION: in global.css set `min-height:36px` on `.menu-select-option.menu-select-option--rich` and remove any coarse-pointer row rule.
test('Colour system rows are 44px or more on a coarse pointer', async ({ browser }) => {
  const { ctx, page } = await at(browser, 390)
  expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches), 'the context is a coarse pointer').toBe(true)
  await (await visionTrigger(page, 'button[aria-label^="Colour system"]')).click()
  const list = page.getByRole('listbox', { name: 'Colour system' })
  await expect(list).toBeVisible()
  const rows = await list.getByRole('option').all()
  expect(rows.length).toBe(Object.keys(HARMONY_OFFSETS).length)
  for (const row of rows) expect((await row.boundingBox()).height, await row.getAttribute('data-value')).toBeGreaterThanOrEqual(44)
  await ctx.close()
})

// A list with no icons keeps its flex rows, even where a row carries a mark: the four-column grid is for the rich
// rows only. The Icon pack menu is the other MenuSelect with marks (Pro on locked packs).
// MUTATION: in global.css drop `.menu-select-option--rich` from the `:has(.menu-select-mark)` rule so it matches every row with a mark.
test('a plain list with marks keeps flex rows (Icon pack)', async ({ page }) => {
  watch(page, 'free visitor opening the Icon pack menu')
  await page.setViewportSize({ width: 1440, height: 900 })
  await go(page, '/create/icons')
  await page.getByRole('button', { name: 'Icon pack' }).click()
  const list = page.locator('.menu-select-list[role="listbox"]')
  await expect(list).toBeVisible()
  await expect(list).not.toHaveClass(/menu-select-list--rich/)
  // PRESENCE first: a free visitor sees marks, so the rows below are the ones the grid rule could catch.
  const marked = list.locator('[role="option"]').filter({ has: page.locator('.menu-select-mark') })
  expect(await marked.count(), 'rows with a mark').toBeGreaterThan(0)
  for (const row of await marked.all()) {
    const style = await row.evaluate((el) => { const s = getComputedStyle(el); return { display: s.display, tracks: s.gridTemplateColumns } })
    expect(style.display, 'a marked row in a plain list is still a flex row').toBe('flex')
  }
})

// 320 is in the list on purpose: it is the one width where the longest strip text
// (Green-blind) is close enough to the Turn off button to wrap if it is allowed to.
// 360 to 419 is the band where the name and "Bottom half: how it looks." stack (the longest name, the mild mode's,
// did not fit beside it); 420 is the first width where they share a line again, so it must still fit whole.
// MUTATION: remove `white-space: nowrap` from `.plb-vision-text` in palette-builder.css, or change the 419px
// breakpoint back to 359px (the mild mode's name is then cut short at 360 to 419).
for (const width of [320, 360, 375, 390, 400, 419, 420, 768, 1440]) {
  test(`the strip is one height for every mode, and no name is cut (${width})`, async ({ browser }) => {
    const { ctx, page } = await at(browser, width)
    const heights = {}
    for (const mode of VISION_MODES.filter((m) => m.id !== 'normal')) {
      await chooseMode(page, mode.id)
      // The name is one line (a 13px line is about 21px; a wrapped one is about 43px). On a phone the
      // 44px button hides a wrap from the strip's own height, so the line count is checked as well.
      const got = await page.locator('.plb-vision').evaluate((el) => {
        const name = el.querySelector('.plb-vision-name')
        const rest = el.querySelector('.plb-vision-rest')
        const off = el.querySelector('.plb-vision-off').getBoundingClientRect()
        const box = el.getBoundingClientRect()
        return {
          strip: box.height, nameHeight: name.getBoundingClientRect().height,
          nameText: name.innerText.trim(),
          nameWhole: name.scrollWidth <= name.clientWidth, restWhole: rest.scrollWidth <= rest.clientWidth,
          offInside: off.right <= box.right + 0.5 && off.left >= box.left - 0.5,
          pastEdge: box.right > document.documentElement.clientWidth + 0.5,
        }
      })
      expect(got.nameHeight, `${mode.id} name wraps`).toBeLessThan(30)
      // What a person reads: the long name from 768px, the short one below.
      expect(got.nameText, `${mode.id} name as shown`).toBe(`${width >= 768 ? mode.name : mode.short}.`)
      expect(got.nameWhole, `${mode.id} name "${got.nameText}" is cut off`).toBe(true)
      expect(got.restWhole, `${mode.id} second line is cut off`).toBe(true)
      expect(got.offInside, `${mode.id} Turn off sits inside the strip`).toBe(true)
      expect(got.pastEdge, `${mode.id} strip runs past the screen`).toBe(false)
      heights[mode.id] = got.strip
    }
    expect(Object.keys(heights), 'the mild mode was measured').toContain('deuteranomaly')
    expect(new Set(Object.values(heights)).size, `heights ${JSON.stringify(heights)}`).toBe(1)
    await ctx.close()
  })
}

// A palette with a clear red and a clear green, so the simulations have something to move.
const RED_GREEN_BOARD = '/create/palette?c=E01010,10B020,3060D0,E0C030,707070'

/** The colour the bottom half of column `i` is painted, read from the screen (not worked out from the matrices). */
async function paintedBottom(page, i) {
  const col = page.locator('.plb-col').nth(i)
  const colour = (await col.getAttribute('aria-label')).match(/#[0-9A-F]{6}$/)[0]
  const box = await col.boundingBox()
  // Viewport-only clip (never fullPage or an element shot: those turn pointer:coarse off in a touch context).
  const shot = await page.screenshot({ clip: { x: box.x + 3, y: box.y + box.height * 0.75, width: 1, height: 1 } })
  return { colour, painted: pixel(decodePng(shot).rows[0], 0) }
}
const away = (a, b) => Math.hypot(...a.map((v, k) => v - b[k]))

// MUTATION: in colors.js swap the deuteranomaly row of MACHADO_2009 for the deuteranopia numbers (the mild mode then moves
// a colour exactly as far as green-blind does), or delete the row (the bottom half then stays as the top).
for (const width of [1440, 390]) {
  test(`the mild mode moves a red and a green less than green-blind does (${width})`, async ({ browser }) => {
    const { ctx, page } = await at(browser, width, { path: RED_GREEN_BOARD })
    const measured = {}
    for (const id of ['deuteranomaly', 'deuteranopia']) {
      await chooseMode(page, id)
      await expect(page.locator('.plb-col--split')).toHaveCount(5)
      measured[id] = [await paintedBottom(page, 0), await paintedBottom(page, 1)]
    }
    for (const [i, name] of [[0, 'red'], [1, 'green']]) {
      const { colour, painted: mild } = measured.deuteranomaly[i]
      const { painted: full } = measured.deuteranopia[i]
      const base = hexRgb(colour)
      expect(away(base, mild), `${name} ${colour}: mild ${mild} is not the original`).toBeGreaterThan(20)
      expect(away(base, mild), `${name} ${colour}: mild ${mild} moves it less than green-blind ${full}`).toBeLessThan(away(base, full) - 8)
      // And what is painted is the simulation the colour maths gives, within a few levels.
      const want = hexRgb(simCvd(colour, 'deuteranomaly'))
      for (let k = 0; k < 3; k++) expect(Math.abs(mild[k] - want[k]), `${name} channel ${k}: ${mild} vs ${want}`).toBeLessThanOrEqual(3)
    }
    await ctx.close()
  })
}

// The seed chip's swatch is a circle. At 1440 and 390 the chip sits in Extra tools (or on the row when it fits), so the
// panel is opened only when the swatch is not already showing.
// MUTATION: in palette-builder.css put `border-radius: 8px` back on `.plb-seedchip-sw`.
for (const width of [1440, 390]) {
  test(`the seed chip swatch is a circle (${width})`, async ({ browser }) => {
    const { ctx, page } = await at(browser, width)
    if (!(await page.locator('.plb-seedchip-sw:visible').count())) {
      await page.getByRole('button', { name: 'Extra tools', exact: true }).click()
      await expect(page.getByRole('dialog', { name: 'Extra tools' })).toBeVisible()
    }
    const swatch = page.locator('.plb-seedchip-sw:visible').first()
    await expect(swatch).toBeVisible()
    const got = await swatch.evaluate((el) => {
      const s = getComputedStyle(el), r = el.getBoundingClientRect()
      return { w: r.width, h: r.height, radii: [s.borderTopLeftRadius, s.borderTopRightRadius, s.borderBottomRightRadius, s.borderBottomLeftRadius] }
    })
    expect(got.w, 'swatch is square').toBe(got.h)
    expect(got.w, 'swatch is 24px').toBe(24)
    for (const radius of got.radii) {
      const px = radius.endsWith('%') ? (parseFloat(radius) / 100) * got.w : parseFloat(radius)
      expect(px, `corner radius ${radius} makes a circle`).toBeGreaterThanOrEqual(got.w / 2)
    }
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
