// THE COLOUR PICKER COPIES, SPEAKS OKLCH, AND HAS ONE TAB STOP PER SWATCH GRID.
//
// D19. The value block is two rows: the field on its own, and under it a tools row
// holding the notation menu and eyedropper on the left and Copy on the right. The
// tools row shrinks and never wraps. OKLCH is the fourth notation, the chosen
// notation is remembered under `vs-colour-notation`, the project's own colours come
// before Recent, and each swatch grid is one Tab stop with arrow keys inside it.
//
// Hosted on /create/tint (a portalled picker that is a bottom sheet on a phone).
// Every test gets a fresh context, so the remembered notation never leaks between
// them. The OKLCH maths and the notation memory are asserted without a browser in
// tests/unit/color-formats.test.js and tests/unit/colour-notation.test.js.
//
// MUTATIONS (each one turns a test below red):
//   Copy writes the hex instead of the shown value               -> "Copy copies what is shown"
//   the "Copied" label is not in the status region                -> "Copy copies what is shown"
//   Copy and Copied stop sharing one grid cell                    -> "Copy does not shift"
//   OKLCH leaves COLOR_FORMATS                                    -> "the notation menu"
//   parseColor stops reading oklch(                               -> "typing OKLCH"
//   the hint text goes back to "Use a hex like"                   -> "a refused value"
//   writeNotation stops writing, or readNotation stops reading    -> "the notation is remembered"
//   a grid gives every swatch tabIndex 0                          -> "one Tab stop per grid"
//   arrow keys select as well as move                             -> "arrow keys move"
//   rovingTab is dropped from usePopover                          -> "Tab order"
//   the project groups render after Recent                        -> "project colours come first"
//   the tools row wraps, or Copy is under 44px on a phone         -> "the tools row"
import { test, expect } from './base.js'
import { go, watch, chooseMenuOption } from './helpers.js'

const ROUTE = '/create/tint'
const LABEL = 'Pick base colour 1'
const HINT = 'Couldn’t read that. Try #1A2B3C, rgb(), hsl() or oklch().'
const OKLCH_SHAPE = /^oklch\(\d{1,3}(\.\d)?% \d(\.\d{1,3})? \d{1,3}(\.\d)?\)$/

const PALETTE = ['#e4572e', '#17bebb', '#ffc914']
const design = () => ({
  palette: { base: PALETTE[0], harmony: 'auto', extraColors: [], activeIdx: 0, colors: PALETTE },
  states: { success: 0, warning: 0, error: 0, info: 0 },
})
const seedDesign = (page) => page.addInitScript((d) => {
  try { localStorage.setItem('vs-current-design', JSON.stringify(d)) } catch { /* storage refused */ }
}, design())

const triggerOf = (page) => page.getByRole('button', { name: LABEL, exact: true })
const panelOf = (page) => page.getByRole('dialog', { name: LABEL, exact: true })

async function open(page) {
  await go(page, ROUTE)
  await triggerOf(page).click()
  const panel = panelOf(page)
  await expect(panel).toBeVisible()
  // The panel animates in; measurements wait for it to settle.
  await panel.evaluate((el) => Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished.catch(() => {}))))
  return panel
}

const channels = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))

test.describe('colour picker: copy, OKLCH, roving grids', () => {
  test.beforeEach(async ({ page }) => { watch(page, 'designer copying a colour out of the picker') })

  test('Copy copies what is shown, says so, and goes back', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    const panel = await open(page)
    await chooseMenuOption(page, panel.locator('.cpk-format'), 'oklch')
    const field = panel.locator('.cpk-hex')
    const shown = await field.inputValue()
    expect(shown).toMatch(OKLCH_SHAPE)

    await panel.locator('.cpk-copy').click()
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(shown)
    await expect(panel.getByRole('button', { name: 'Copied', exact: true })).toBeVisible()
    await expect(panel.locator('.cpk-status')).toHaveText(`Copied ${shown}`)

    // Back to idle within two seconds, with the live region emptied.
    await expect(panel.getByRole('button', { name: 'Copy', exact: true })).toBeVisible({ timeout: 2000 })
    await expect(panel.locator('.cpk-status')).toHaveText('')
  })

  test('Copy does not shift the tools row', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    const panel = await open(page)
    const measure = () => panel.evaluate((el) => ({
      copy: el.querySelector('.cpk-copy').getBoundingClientRect().width,
      tools: el.querySelector('.cpk-tools').getBoundingClientRect().height,
    }))
    const before = await measure()
    await panel.locator('.cpk-copy').click()
    await expect(panel.getByRole('button', { name: 'Copied', exact: true })).toBeVisible()
    const during = await measure()
    expect(Math.abs(during.copy - before.copy)).toBeLessThanOrEqual(0.5)
    expect(during.tools).toBe(before.tools)
    await expect(panel.getByRole('button', { name: 'Copy', exact: true })).toBeVisible({ timeout: 2500 })
    const after = await measure()
    expect(Math.abs(after.copy - before.copy)).toBeLessThanOrEqual(0.5)
    expect(after.tools).toBe(before.tools)
  })

  test('the notation menu lists HEX, RGB, HSL and OKLCH, and OKLCH prints in range', async ({ page }) => {
    const panel = await open(page)
    await panel.locator('.cpk-format').click()
    const list = page.getByRole('listbox', { name: 'Colour notation', exact: true })
    await expect(list.getByRole('option')).toHaveText(['HEX', 'RGB', 'HSL', 'OKLCH'])
    await list.getByRole('option', { name: 'OKLCH', exact: true }).click()
    await expect(panel.locator('.cpk-hex')).toHaveValue(OKLCH_SHAPE)
  })

  test('typing OKLCH sets the colour, whatever notation is showing', async ({ page }) => {
    const panel = await open(page)
    const field = panel.locator('.cpk-hex')
    await chooseMenuOption(page, panel.locator('.cpk-format'), 'oklch')
    await field.fill('oklch(62.8% 0.258 29.2)')
    await field.press('Enter')
    await expect(field).toHaveAttribute('aria-invalid', 'false')
    await chooseMenuOption(page, panel.locator('.cpk-format'), 'hex')
    const hex = await field.inputValue()
    expect(hex).toMatch(/^#[0-9a-f]{6}$/)
    const [r, g, b] = channels(hex)
    expect(Math.abs(r - 255)).toBeLessThanOrEqual(1)
    expect(g).toBeLessThanOrEqual(1)
    expect(b).toBeLessThanOrEqual(1)
    await expect(field).toHaveAttribute('aria-invalid', 'false')
  })

  test('a refused value shows the hint and puts the previous value back', async ({ page }) => {
    const panel = await open(page)
    const field = panel.locator('.cpk-hex')
    await chooseMenuOption(page, panel.locator('.cpk-format'), 'oklch')
    const before = await field.inputValue()
    await field.fill('oklch(abc)')
    await field.press('Enter')
    await expect(field).toHaveAttribute('aria-invalid', 'true')
    await expect(panel.locator('.cpk-hint')).toHaveText(HINT)
    await expect(field).toHaveValue(before)
  })

  test('the notation is remembered across reopening and reloading', async ({ page }) => {
    const panel = await open(page)
    await chooseMenuOption(page, panel.locator('.cpk-format'), 'rgb')
    await expect(panel.locator('.cpk-hex')).toHaveValue(/^rgb\(/)
    expect(await page.evaluate(() => localStorage.getItem('vs-colour-notation'))).toBe('rgb')

    const reopen = async () => {
      await page.keyboard.press('Escape')
      await expect(panelOf(page)).toHaveCount(0)
      await triggerOf(page).click()
      await expect(panelOf(page)).toBeVisible()
    }
    await reopen()
    await expect(panelOf(page).locator('.cpk-hex')).toHaveValue(/^rgb\(/)
    await panelOf(page).locator('.cpk-format').click()
    await expect(page.getByRole('option', { name: 'RGB', exact: true })).toHaveAttribute('aria-selected', 'true')
    await page.keyboard.press('Escape')

    await page.reload()
    await triggerOf(page).click()
    await expect(panelOf(page)).toBeVisible()
    await expect(panelOf(page).locator('.cpk-hex')).toHaveValue(/^rgb\(/)
    expect(await page.evaluate(() => localStorage.getItem('vs-colour-notation'))).toBe('rgb')
  })

  test('every swatch grid is one Tab stop, on the selected swatch when there is one', async ({ page }) => {
    await seedDesign(page)
    const panel = await open(page)
    const audit = () => panel.evaluate((el) => [...el.querySelectorAll('[data-roving]')].map((grid) => {
      const stops = [...grid.querySelectorAll('button')].filter((b) => b.getAttribute('tabindex') === '0')
      const selected = grid.querySelector('button[aria-selected="true"], button[aria-pressed="true"]')
      return { stops: stops.length, onSelected: selected ? stops[0] === selected : null }
    }))

    const first = await audit()
    expect(first.length).toBeGreaterThan(0)
    for (const grid of first) expect(grid.stops).toBe(1)

    // Choose a colour that sits in a grid: that grid's one stop moves onto it.
    await panel.getByRole('button', { name: 'Use #17BEBB from your palette', exact: true }).click()
    const second = await audit()
    for (const grid of second) {
      expect(grid.stops).toBe(1)
      if (grid.onSelected !== null) expect(grid.onSelected).toBe(true)
    }
    expect(second.some((grid) => grid.onSelected === true)).toBe(true)
  })

  test('arrow keys move inside a grid without selecting', async ({ page }) => {
    const panel = await open(page)
    const grid = panel.locator('.cpk-swatches').last()
    const buttons = grid.locator('button')
    const count = await buttons.count()
    const cols = await grid.evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').filter(Boolean).length)
    expect(count).toBeGreaterThan(cols)
    const field = panel.locator('.cpk-hex')
    const before = await field.inputValue()
    const focusedIndex = () => grid.evaluate((el) => [...el.querySelectorAll('button')].indexOf(document.activeElement))

    await grid.locator('button[tabindex="0"]').focus()
    expect(await focusedIndex()).toBe(0)
    await page.keyboard.press('ArrowRight')
    expect(await focusedIndex()).toBe(1)
    await expect(field).toHaveValue(before)
    await page.keyboard.press('ArrowDown')
    expect(await focusedIndex()).toBe(1 + cols)
    await expect(field).toHaveValue(before)
    await page.keyboard.press('Home')
    expect(await focusedIndex()).toBe(0)
    await page.keyboard.press('End')
    expect(await focusedIndex()).toBe(count - 1)
    await expect(field).toHaveValue(before)

    // Enter is what selects.
    const colour = await buttons.nth(count - 1).getAttribute('aria-label')
    await page.keyboard.press('Enter')
    await expect(field).toHaveValue(colour.toLowerCase())
  })

  test('Tab order runs pad, hue, field, notation, copy, then each grid, then leaves', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await seedDesign(page)
    await go(page, ROUTE)
    const trigger = triggerOf(page)
    const expectedNext = await trigger.evaluate((el) => {
      const sel = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
      const all = Array.from(document.querySelectorAll(sel)).filter((n) => n.getClientRects().length > 0)
      const next = all[all.indexOf(el) + 1]
      return next.getAttribute('aria-label') || next.textContent.trim()
    })
    await trigger.click()
    const panel = panelOf(page)
    await expect(panel.locator('.cpk-pad')).toBeFocused()

    // Shift+Tab from the pad leaves to the trigger.
    await page.keyboard.press('Shift+Tab')
    await expect(panel).toHaveCount(0)
    await expect(trigger).toBeFocused()
    await trigger.click()
    await expect(panel.locator('.cpk-pad')).toBeFocused()

    const hasDropper = await panel.locator('.cpk-dropper').count() > 0
    const here = () => page.evaluate(() => {
      const el = document.activeElement
      if (el.classList.contains('cpk-pad')) return 'pad'
      if (el.classList.contains('cpk-hue')) return 'hue'
      if (el.classList.contains('cpk-hex')) return 'hex'
      if (el.classList.contains('cpk-format')) return 'format'
      if (el.classList.contains('cpk-dropper')) return 'dropper'
      if (el.classList.contains('cpk-copy')) return 'copy'
      const grid = el.closest('[data-roving]')
      if (grid) return `grid${[...document.querySelectorAll('.cpk-pop [data-roving]')].indexOf(grid)}`
      return `other:${el.tagName}.${el.className}`
    })
    const head = ['hue', 'hex', 'format', ...(hasDropper ? ['dropper'] : []), 'copy']
    const seen = []
    for (let i = 0; i < head.length; i++) {
      await page.keyboard.press('Tab')
      seen.push(await here())
    }
    expect(seen).toEqual(head)

    // Leaving the field commits its colour, which can add the Recent grid, so the
    // grids are counted now rather than when the panel opened.
    const grids = await panel.locator('[data-roving]').count()
    expect(grids).toBeGreaterThan(0)
    const rest = []
    for (let i = 0; i < grids; i++) {
      await page.keyboard.press('Tab')
      rest.push(await here())
    }
    expect(rest).toEqual(Array.from({ length: grids }, (_, i) => `grid${i}`))

    // One more Tab closes the portalled panel and lands after the trigger.
    await page.keyboard.press('Tab')
    await expect(panel).toHaveCount(0)
    const landed = await page.evaluate(() => document.activeElement.getAttribute('aria-label') || document.activeElement.textContent.trim())
    expect(landed).toBe(expectedNext)
  })

  test('the pad takes Home, End and PageDown', async ({ page }) => {
    const panel = await open(page)
    const pad = panel.locator('.cpk-pad')
    const field = panel.locator('.cpk-hex')
    const brightness = async () => Number((await pad.getAttribute('aria-valuetext')).match(/brightness (\d+)%/)[1])
    await pad.focus()
    await page.keyboard.press('Home')
    await expect(pad).toHaveAttribute('aria-valuenow', '0')
    await page.keyboard.press('End')
    await expect(pad).toHaveAttribute('aria-valuenow', '100')

    const hexBefore = await field.inputValue()
    const levelBefore = await brightness()
    expect(levelBefore).toBeGreaterThanOrEqual(10)
    await page.keyboard.press('PageDown')
    await expect(field).not.toHaveValue(hexBefore)
    expect(await brightness()).toBe(levelBefore - 10)
  })

  test('project colours come before Recent', async ({ page }) => {
    await seedDesign(page)
    const panel = await open(page)
    // Recent only exists once a colour has been committed.
    await panel.locator('.cpk-hex').fill('#22c55e')
    await panel.locator('.cpk-hex').press('Enter')
    await expect(panel.locator('.cpk-recents')).toBeVisible()

    const order = await panel.evaluate((el) => {
      const labels = [...el.querySelectorAll('.cpk-section-label')]
      const recents = el.querySelector('.cpk-recents')
      const groups = [...el.querySelectorAll('.cpk-presets')].map((g) => g.closest('.cpk-section'))
      const follows = (a, b) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)
      return {
        first: labels[0].textContent.trim(),
        groups: groups.length,
        recentsAfterAll: groups.every((g) => follows(g, recents)),
      }
    })
    expect(order.first).toBe('Your palette')
    expect(order.groups).toBeGreaterThanOrEqual(1)
    expect(order.recentsAfterAll).toBe(true)
  })
})

// The tools row is a toolbar: it shrinks and never wraps, at the narrowest and the
// widest viewport the picker is used in.
const tools = (panel) => panel.evaluate((el) => {
  const row = el.querySelector('.cpk-tools')
  const kids = [...row.children].map((c) => c.getBoundingClientRect())
  return {
    height: row.getBoundingClientRect().height,
    ys: kids.map((r) => r.top),
    sizes: kids.map((r) => ({ w: r.width, h: r.height })),
  }
})

test.describe('the tools row at 390', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
  test.beforeEach(async ({ page }) => { watch(page, 'phone user copying a colour') })

  test('stays on one line, every button is a finger target, the field is 16px', async ({ page }) => {
    const panel = await open(page)
    const row = await tools(panel)
    expect(Math.max(...row.ys) - Math.min(...row.ys)).toBeLessThanOrEqual(1)
    expect(row.height).toBeLessThanOrEqual(45)
    for (const size of row.sizes) {
      expect(size.w).toBeGreaterThanOrEqual(44)
      expect(size.h).toBeGreaterThanOrEqual(44)
    }
    const field = panel.locator('.cpk-hex')
    expect(await field.evaluate((el) => getComputedStyle(el).fontSize)).toBe('16px')
    expect((await field.boundingBox()).width).toBeGreaterThanOrEqual(300)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
})

test.describe('the tools row at 1440', () => {
  test.use({ viewport: { width: 1440, height: 900 } })
  test.beforeEach(async ({ page }) => { watch(page, 'desktop user copying a colour') })

  test('stays on one line and OKLCH fits the field', async ({ page }) => {
    const panel = await open(page)
    const field = panel.locator('.cpk-hex')
    await field.fill('#4f46e5')
    await field.press('Enter')
    await chooseMenuOption(page, panel.locator('.cpk-format'), 'oklch')
    await expect(field).toHaveValue(OKLCH_SHAPE)
    const row = await tools(panel)
    expect(Math.max(...row.ys) - Math.min(...row.ys)).toBeLessThanOrEqual(1)
    expect(row.height).toBeLessThanOrEqual(33)
    expect(await field.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
  })
})
