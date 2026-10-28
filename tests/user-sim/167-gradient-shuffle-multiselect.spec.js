// /create/gradient, slice S3: Shuffle settings, selecting several stops, and
// chip picks as the Shuffle pool.
//
// Expected values are hand-checked from the spec (handover/specs/
// gradient-tool-overhaul-spec-2026-10-28.md §4, §5, §16), not read back from the
// code. The seeded gradient puts the stops OUT of rail order on purpose:
//
//   list position   stop 1   stop 2   stop 3   stop 4   stop 5
//   rail position     0%       60%      100%     30%      80%
//
// so "Shift selects the run along the rail" is a different answer from "Shift
// selects the run down the list": Shift from stop 1 to stop 2 takes the stops
// at 0, 30 and 60, which are stops 1, 4 and 2.
//
// Filters are proved by what a run of presses can and cannot make. Type =
// Radial only: twenty Randoms, every one Radial, where the default weights
// give Radial 15% (0.15^20 is nothing). Nothing here relies on a draw landing
// on a particular value, only on a filter letting through what it must not.
//
// No screenshot is taken in this file: in a touch context a full-page or
// element screenshot turns pointer: coarse off for the page.
//
// MUTATIONS (each turns the tests named red):
//   engineFilters returns no types                    -> "Type = Radial only ..." and the 360 More-menu test
//   engineFilters returns no counts                   -> "Stops = 4 or 5 ..."
//   randomise sets the angle even with keepAngle      -> "Keep the angle holds the angle ..."
//   FilterGroup tabIndex always 0                     -> "roving tabindex"
//   FilterGroup arrow keys not handled                -> "roving tabindex"
//   Shift/Ctrl no longer adds in a filter group       -> "Shift-click adds ..." and the touch tap test
//   pressStop Shift selects the list run, not rail    -> "Shift selects the run along the rail"
//   pressStop Ctrl/Cmd replaces instead of toggles    -> "Ctrl-click adds one and takes one out"
//   holdStart delay 450 -> 4500                       -> "a 450ms press and hold ..."
//   pickColour sets only the active stop              -> "a chip colours every selected stop"
//   removable() ignores the 2-stop floor              -> the two "delete" tests
//   removeStops stops announcing the reason           -> "... announced reason"
//   shiftGroup not clamped as a group                 -> "arrows move the selection together"
//   Escape no longer clears                           -> "Escape clears"
//   randomiseFromPalette ignores the picks            -> "picked colours drive Shuffle from palette"
//   Clear picks does not clear                        -> "Clear picks"
//   the Clear picks aside given a changing height     -> "the page does not move"
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const ROUTE = '/create/gradient'

const THIRTEEN = [
  '#2F6BFF', '#E0784E', '#3FAFA0', '#0B0C0E', '#F7F7F4', '#D9B93C', '#8B5CF0',
  '#52A069', '#E894AC', '#1B3FA8', '#7A7A7A', '#B0C4DE', '#CD5C5C',
]
const SEED = {
  type: 'Linear', angle: 160, space: 'oklch', source: 'own',
  stops: [
    { color: '#0A0F2C', position: 0 }, { color: '#27348B', position: 60 }, { color: '#6E6BFF', position: 100 },
    { color: '#C6F36B', position: 30 }, { color: '#E0788C', position: 80 },
  ],
}

const seed = (page, { palette = THIRTEEN, gradient = SEED } = {}) => page.addInitScript((d) => {
  const design = { palette: { base: d.palette[0], harmony: 'auto', extraColors: [], activeIdx: 0, colors: d.palette } }
  if (d.gradient) design.gradient = d.gradient
  localStorage.setItem('vs-current-design', JSON.stringify(design))
}, { palette, gradient })

const panelOf = (page) => page.getByRole('complementary', { name: 'Gradient controls' })
const settle = (page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
const stopSelect = (page, n) => page.getByRole('button', { name: new RegExp(`^Select stop ${n}, #`) })
const stopRows = (page) => page.locator('.grd-stop')
const handle = (page, n) => page.getByRole('button', { name: new RegExp(`^Gradient stop ${n} at `) })
const chips = (page) => page.locator('.grd-avail .grd-chips:not(.grd-chips--shades) .grd-chip')
const selCount = (page) => page.locator('.grd-sel-count')
const shuffleBtn = (page) => page.locator('[data-tool-toolbar]').getByRole('button', { name: /^Shuffle from palette$/ })

async function open(page) {
  await go(page, ROUTE)
  await expect(page.getByRole('heading', { level: 1, name: 'Gradient' })).toBeVisible()
  await expect(panelOf(page)).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
  await settle(page)
}

/** The stop numbers (1-based) whose Select button is pressed. */
const pressed = (page) => page.evaluate(() => [...document.querySelectorAll('.grd-stop-select')]
  .map((b, i) => (b.getAttribute('aria-pressed') === 'true' ? i + 1 : 0)).filter(Boolean))
/** Each stop's hex, in list order. */
const hexes = (page) => page.evaluate(() => [...document.querySelectorAll('.grd-stop-select')]
  .map((b) => /#[0-9A-Fa-f]{6}/.exec(b.getAttribute('aria-label'))[0].toUpperCase()))
/** Everything the page's live regions say right now. */
const said = (page) => page.evaluate(() => [...document.querySelectorAll('[role="status"]')].map((e) => e.textContent.trim()).filter(Boolean).join(' | '))
const typeOf = (page) => page.evaluate(() => document.querySelector('[aria-label="Gradient type"] .tl-pill.is-on')?.textContent?.trim() || null)

// ── the toolbar, wherever the page puts Shuffle settings and Random ──────────

const moreButton = (page) => page.locator('[data-tl-more] button').first()
const menuOpen = (page) => page.locator('.tl-menu-row').first().isVisible().catch(() => false)

/** A toolbar action by name: the direct button when drawn, otherwise its More-menu row. */
async function toolbarAction(page, name) {
  const direct = page.locator('[data-tool-toolbar]').getByRole('button', { name }).first()
  if ((await direct.count()) && (await direct.isVisible())) { await direct.click(); return }
  if (!(await menuOpen(page))) await moreButton(page).click()
  await page.locator('.tl-menu-row').filter({ hasText: name }).first().click()
}

/**
 * Opens Shuffle settings and returns where its controls are: the popover (a
 * button in the toolbar) or the inline copy in the More menu when the toolbar
 * has no room for the button.
 */
async function openSettings(page) {
  const trigger = page.locator('[data-tool-toolbar]').getByRole('button', { name: 'Shuffle settings', exact: true })
  if ((await trigger.count()) && (await trigger.first().isVisible())) {
    await trigger.first().click()
    const dialog = page.getByRole('dialog', { name: 'Shuffle settings' })
    await expect(dialog).toBeVisible()
    // The popover moves focus in on the next frame; a key sent before that lands on the wrong control.
    await expect.poll(() => dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true)
    return dialog
  }
  if (!(await menuOpen(page))) await moreButton(page).click()
  const inline = page.locator('.grd-shuf-inline')
  await expect(inline).toBeVisible()
  return inline
}
const group = (scope, name) => scope.getByRole('group', { name, exact: true })
const option = (scope, groupName, name) => group(scope, groupName).getByRole('button', { name: String(name), exact: true })
const on = (btn) => expect(btn).toHaveAttribute('aria-pressed', 'true')
const off = (btn) => expect(btn).toHaveAttribute('aria-pressed', 'false')

async function longPress(page, locator, ms = 520) {
  await locator.scrollIntoViewIfNeeded()
  const b = await locator.boundingBox()
  const cdp = await page.context().newCDPSession(page)
  const at = [{ x: b.x + b.width / 2, y: b.y + b.height / 2 }]
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: at })
  await page.waitForTimeout(ms) // the hold itself is what is under test
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await cdp.detach()
}

// ── 1 · the settings constrain what Random and Shuffle make ─────────────────

test.describe('Shuffle settings at 1440px', () => {
  test.use({ viewport: { width: 1440, height: 900 } })
  test.beforeEach(async ({ page }) => { watch(page, 'a designer narrowing what Random makes') })

  test('Type = Radial only: twenty Randoms are all Radial', async ({ page }) => {
    await seed(page, { gradient: null })
    await open(page)
    const scope = await openSettings(page)
    await option(scope, 'Type', 'Radial').click()
    await on(option(scope, 'Type', 'Radial'))
    await off(option(scope, 'Type', 'Any'))
    for (let i = 0; i < 20; i++) {
      await toolbarAction(page, /^Random$/)
      expect(await typeOf(page), `Random ${i + 1}`).toBe('Radial')
    }
  })

  test('Type = Linear and Conic (Shift-click): never Radial', async ({ page }) => {
    await seed(page, { gradient: null })
    await open(page)
    const scope = await openSettings(page)
    await option(scope, 'Type', 'Linear').click()
    await option(scope, 'Type', 'Conic').click({ modifiers: ['Shift'] })
    await on(option(scope, 'Type', 'Linear'))
    await on(option(scope, 'Type', 'Conic'))
    // The control: Radial is 15% by default, so 40 presses without one only
    // happen when the filter is working.
    for (let i = 0; i < 40; i++) {
      await toolbarAction(page, /^Random$/)
      expect(await typeOf(page), `Random ${i + 1}`).not.toBe('Radial')
    }
  })

  test('Stops = 4 or 5 (Shift-click): every Random has four or five stops', async ({ page }) => {
    await seed(page, { gradient: null })
    await open(page)
    const scope = await openSettings(page)
    await option(scope, 'Stops', 4).click()
    await option(scope, 'Stops', 5).click({ modifiers: ['Shift'] })
    for (let i = 0; i < 20; i++) {
      await toolbarAction(page, /^Random$/)
      const n = await stopRows(page).count()
      expect([4, 5], `Random ${i + 1} made ${n} stops`).toContain(n)
    }
  })

  test('Stops = 3 narrows Shuffle from palette too, and Type = Conic with it', async ({ page }) => {
    await seed(page, { gradient: null })
    await open(page)
    const scope = await openSettings(page)
    await option(scope, 'Stops', 3).click()
    await option(scope, 'Type', 'Conic').click()
    for (let i = 0; i < 12; i++) {
      await toolbarAction(page, /^Shuffle from palette$/)
      expect(await stopRows(page).count(), `Shuffle ${i + 1}`).toBe(3)
      expect(await typeOf(page)).toBe('Conic')
    }
  })

  test('Keep the angle holds the angle through Random and Shuffle; off, Random moves it', async ({ page }) => {
    await seed(page, { gradient: null })
    await open(page)
    const field = page.getByRole('spinbutton', { name: 'Gradient angle in degrees' })
    await field.fill('77')
    await field.press('Enter')
    await expect(field).toHaveValue('77')
    const scope = await openSettings(page)
    // Linear only, so the angle field is always drawn and always read.
    await option(scope, 'Type', 'Linear').click()
    const keep = scope.getByRole('button', { name: 'Keep the angle' })
    await off(keep)
    await keep.click()
    await on(keep)
    for (let i = 0; i < 8; i++) {
      await toolbarAction(page, /^Random$/)
      await expect(field, `Random ${i + 1}`).toHaveValue('77')
      await toolbarAction(page, /^Shuffle from palette$/)
      await expect(field, `Shuffle ${i + 1}`).toHaveValue('77')
    }
    // Pressing Random or Shuffle closed the popover (a press outside it); open it again.
    const again = await openSettings(page)
    const keepAgain = again.getByRole('button', { name: 'Keep the angle' })
    await on(keepAgain)
    await keepAgain.click()
    await off(keepAgain)
    let moved = false
    for (let i = 0; i < 20 && !moved; i++) {
      await toolbarAction(page, /^Random$/)
      moved = (await field.inputValue()) !== '77'
    }
    expect(moved, 'with Keep the angle off, twenty Randoms never moved the angle').toBe(true)
  })

  test('the old type, angle and stop-count locks are gone from the panel', async ({ page }) => {
    await open(page)
    await expect(page.locator('.grd-row--angle .grd-lock')).toHaveCount(0)
    await expect(panelOf(page).getByRole('button', { name: /lock the (type|angle|stop count)/i })).toHaveCount(0)
    await expect(page.locator('.grd-lock')).toHaveCount(await stopRows(page).count()) // only the per-stop locks remain
  })
})

// ── 2 · keys and Shift-click inside a filter group ──────────────────────────

test.describe('Shuffle settings groups', () => {
  test.use({ viewport: { width: 1440, height: 900 } })
  test.beforeEach(async ({ page }) => { watch(page, 'a keyboard user in Shuffle settings') })

  test('roving tabindex: one Tab stop per group, arrows and Home/End move it, Tab leaves the group', async ({ page }) => {
    await open(page)
    const scope = await openSettings(page)
    const type = group(scope, 'Type')
    const stops = (g) => g.evaluate((el) => [...el.querySelectorAll('button')].map((b) => b.tabIndex))
    expect(await stops(type), 'only the pressed option (Any) is a Tab stop').toEqual([0, -1, -1, -1])
    expect(await stops(group(scope, 'Stops'))).toEqual([0, -1, -1, -1, -1])

    await option(scope, 'Type', 'Any').focus()
    await page.keyboard.press('ArrowRight')
    await expect(option(scope, 'Type', 'Linear')).toBeFocused()
    expect(await stops(type), 'the Tab stop followed focus').toEqual([-1, 0, -1, -1])
    await off(option(scope, 'Type', 'Linear')) // arrows move focus; they do not press
    await page.keyboard.press('End')
    await expect(option(scope, 'Type', 'Conic')).toBeFocused()
    await page.keyboard.press('ArrowRight')
    await expect(option(scope, 'Type', 'Any'), 'the arrows wrap').toBeFocused()
    await page.keyboard.press('ArrowLeft')
    await expect(option(scope, 'Type', 'Conic')).toBeFocused()
    await page.keyboard.press('Home')
    await expect(option(scope, 'Type', 'Any')).toBeFocused()
    await page.keyboard.press('ArrowDown')
    await expect(option(scope, 'Type', 'Linear')).toBeFocused()

    // One Tab leaves the group for the next one, landing on its pressed option.
    await page.keyboard.press('Tab')
    await expect(option(scope, 'Stops', 'Any')).toBeFocused()
    // And Shift+Tab comes back to where the arrows left the Type group.
    await page.keyboard.press('Shift+Tab')
    await expect(option(scope, 'Type', 'Linear')).toBeFocused()
  })

  test('Shift-click adds and removes; the last one out falls back to Any', async ({ page }) => {
    await open(page)
    const scope = await openSettings(page)
    const o = (n) => option(scope, 'Type', n)
    await on(o('Any'))
    await o('Radial').click()
    await on(o('Radial')); await off(o('Any'))
    await o('Conic').click({ modifiers: ['Shift'] })
    await on(o('Radial')); await on(o('Conic'))
    await o('Radial').click({ modifiers: ['Shift'] })
    await off(o('Radial')); await on(o('Conic'))
    await o('Conic').click({ modifiers: ['Control'] })
    await on(o('Any')); await off(o('Conic'))
    // Any is exclusive: picking it clears the rest, and adding one clears it.
    await o('Linear').click({ modifiers: ['Shift'] })
    await on(o('Linear')); await off(o('Any'))
    await o('Any').click({ modifiers: ['Shift'] })
    await on(o('Any')); await off(o('Linear'))
  })

  test('Shift+Enter on the keyboard adds, and a plain Enter picks only that one', async ({ page }) => {
    await open(page)
    const scope = await openSettings(page)
    await option(scope, 'Stops', 3).focus()
    await page.keyboard.press('Enter')
    await on(option(scope, 'Stops', 3)); await off(option(scope, 'Stops', 'Any'))
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('Shift+Enter')
    await on(option(scope, 'Stops', 3)); await on(option(scope, 'Stops', 4))
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('Enter')
    await off(option(scope, 'Stops', 3)); await off(option(scope, 'Stops', 4)); await on(option(scope, 'Stops', 5))
  })
})

// ── 3 · reachable at 360 and 390, through the More menu ─────────────────────

for (const w of [390, 360]) {
  test.describe(`Shuffle settings at ${w}px (touch)`, () => {
    test.use({ viewport: { width: w, height: 800 }, hasTouch: true, isMobile: true })
    test.beforeEach(async ({ page }) => { watch(page, 'a phone user narrowing what Random makes') })

    test('the toolbar has no room for the button, so the settings sit in the More menu', async ({ page }) => {
      await open(page)
      await expect(page.locator('[data-tool-toolbar]').getByRole('button', { name: 'Shuffle settings', exact: true })).toHaveCount(0)
      const scope = await openSettings(page)
      await expect(scope.locator('.grd-shuf-title')).toHaveText('Random makes')
      for (const g of ['Type', 'Stops']) await expect(group(scope, g)).toBeVisible()
      await expect(scope.getByRole('button', { name: 'Keep the angle' })).toBeVisible()
      await expect(scope.getByText('Tap to add or remove.')).toBeVisible()
    })

    test('a tap adds or removes (no Shift on a phone), and Type = Radial then governs Random from the menu', async ({ page }) => {
      await seed(page, { gradient: null })
      await open(page)
      const scope = await openSettings(page)
      const o = (n) => option(scope, 'Type', n)
      await o('Radial').tap()
      await on(o('Radial')); await off(o('Any'))
      await o('Conic').tap()
      await on(o('Radial')); await on(o('Conic'))
      await o('Radial').tap()
      await off(o('Radial')); await on(o('Conic'))
      await o('Conic').tap()
      await on(o('Any')) // the last one out falls back to Any
      await o('Radial').tap()
      for (let i = 0; i < 12; i++) {
        await toolbarAction(page, /^Random$/)
        expect(await typeOf(page), `Random ${i + 1}`).toBe('Radial')
      }
    })
  })
}

// ── 4 · selecting several stops ──────────────────────────────────────────────

test.describe('selecting several stops at 1440px', () => {
  test.use({ viewport: { width: 1440, height: 900 } })
  test.beforeEach(async ({ page }) => {
    watch(page, 'a designer working on several stops at once')
    await seed(page)
    await open(page)
  })

  test('one press selects one stop, and a lone stop shows no "selected" header', async ({ page }) => {
    await expect(stopRows(page)).toHaveCount(5)
    await stopSelect(page, 3).click()
    expect(await pressed(page)).toEqual([3])
    await expect(selCount(page)).toHaveCount(0)
  })

  test('Shift selects the run along the rail, not down the list', async ({ page }) => {
    await stopSelect(page, 1).click()
    await stopSelect(page, 2).click({ modifiers: ['Shift'] })
    expect(await pressed(page), 'rail 0%, 30%, 60% are stops 1, 4, 2').toEqual([1, 2, 4])
    await expect(selCount(page)).toHaveText('3 selected')
    await expect(page.locator('.grd-sel-clear')).toHaveText('Clear')
    await expect.poll(() => said(page)).toContain('3 stops selected')
    // The same three are lit on the rail, and the other two are not.
    for (const n of [1, 2, 4]) await expect(handle(page, n)).toHaveAttribute('aria-pressed', 'true')
    for (const n of [3, 5]) await expect(handle(page, n)).toHaveAttribute('aria-pressed', 'false')
  })

  test('Shift from the rail handles ranges the same way', async ({ page }) => {
    await handle(page, 3).click()
    await handle(page, 4).click({ modifiers: ['Shift'] })
    // From 100% back to 30%: stops 3, 5 (80%), 2 (60%), 4 (30%).
    expect(await pressed(page)).toEqual([2, 3, 4, 5])
  })

  test('Ctrl-click adds one and takes one out; down to a single stop it is no longer a selection', async ({ page }) => {
    await stopSelect(page, 1).click()
    await stopSelect(page, 3).click({ modifiers: ['Control'] })
    await stopSelect(page, 5).click({ modifiers: ['Control'] })
    expect(await pressed(page)).toEqual([1, 3, 5])
    await expect(selCount(page)).toHaveText('3 selected')
    await stopSelect(page, 3).click({ modifiers: ['Control'] })
    expect(await pressed(page)).toEqual([1, 5])
    await expect(selCount(page)).toHaveText('2 selected')
    await stopSelect(page, 5).click({ modifiers: ['Control'] })
    expect(await pressed(page)).toEqual([1])
    await expect(selCount(page)).toHaveCount(0)
    // The last stop cannot be toggled off: there is always one.
    await stopSelect(page, 1).click({ modifiers: ['Control'] })
    expect(await pressed(page)).toEqual([1])
  })

  test('Ctrl+A selects every stop, and Escape clears the selection', async ({ page }) => {
    await stopSelect(page, 2).click()
    await page.keyboard.press('Control+A')
    expect(await pressed(page)).toEqual([1, 2, 3, 4, 5])
    await expect(selCount(page)).toHaveText('5 selected')
    await expect.poll(() => said(page)).toContain('All 5 stops selected')
    await page.keyboard.press('Escape')
    await expect(selCount(page)).toHaveCount(0)
    expect((await pressed(page)).length, 'back to the one active stop').toBe(1)
    await expect.poll(() => said(page)).toContain('Selection cleared')
  })

  test('Clear in the head row clears it too', async ({ page }) => {
    await stopSelect(page, 1).click()
    await stopSelect(page, 2).click({ modifiers: ['Shift'] })
    await expect(selCount(page)).toHaveText('3 selected')
    await page.locator('.grd-sel-clear').click()
    await expect(selCount(page)).toHaveCount(0)
    expect((await pressed(page)).length).toBe(1)
  })

  test('Shift with the down arrow extends the run from the row the keyboard is on', async ({ page }) => {
    await stopSelect(page, 1).click()
    await page.keyboard.press('Shift+ArrowDown')
    // Down the list is not the rail: the run from stop 1 (0%) to stop 2 (60%) is stops 1, 4, 2.
    expect(await pressed(page)).toEqual([1, 2, 4])
  })

  test('a chip colours every selected stop, and no other', async ({ page }) => {
    const before = await hexes(page)
    await stopSelect(page, 1).click()
    await stopSelect(page, 2).click({ modifiers: ['Shift'] }) // stops 1, 2, 4
    await chips(page).nth(1).click() // THIRTEEN[1]
    const after = await hexes(page)
    for (const n of [1, 2, 4]) expect(after[n - 1], `stop ${n}`).toBe(THIRTEEN[1])
    for (const n of [3, 5]) expect(after[n - 1], `stop ${n} left alone`).toBe(before[n - 1])
    await expect.poll(() => said(page)).toContain('3 stops set to')
  })

  test('the lock on a selected row locks every selected stop', async ({ page }) => {
    await stopSelect(page, 1).click()
    await stopSelect(page, 3).click({ modifiers: ['Control'] })
    const locks = page.locator('.grd-stop-lock')
    await expect(locks.nth(0)).toHaveAttribute('aria-label', 'Lock or unlock the 2 selected stops')
    await locks.nth(0).click()
    const state = () => locks.evaluateAll((els) => els.map((e) => e.getAttribute('aria-pressed')))
    expect(await state()).toEqual(['true', 'false', 'true', 'false', 'false'])
    await locks.nth(2).click()
    expect(await state(), 'pressing it again unlocks both').toEqual(['false', 'false', 'false', 'false', 'false'])
  })

  test('delete: three of five go together, and nothing is announced about a floor', async ({ page }) => {
    await stopSelect(page, 1).click()
    await stopSelect(page, 3).click({ modifiers: ['Control'] })
    await stopSelect(page, 5).click({ modifiers: ['Control'] })
    await page.getByRole('button', { name: 'Remove the 3 selected stops' }).first().click()
    await expect(stopRows(page)).toHaveCount(2)
    // Stops 2 and 4 survive, in list order.
    expect(await hexes(page)).toEqual(['#27348B', '#C6F36B'])
    await expect.poll(() => said(page)).toContain('3 stops removed')
    expect(await said(page)).not.toContain('at least two')
    await expect(selCount(page)).toHaveCount(0)
  })

  test('delete: selecting all five keeps two, with the reason announced', async ({ page }) => {
    await stopSelect(page, 2).click()
    await page.keyboard.press('Control+A')
    await expect(selCount(page)).toHaveText('5 selected')
    await page.getByRole('button', { name: 'Remove the 5 selected stops' }).first().click()
    await expect(stopRows(page), 'the floor is two stops').toHaveCount(2)
    // The first three in list order go; stops 4 and 5 stay.
    expect(await hexes(page)).toEqual(['#C6F36B', '#E0788C'])
    await expect.poll(() => said(page)).toContain('A gradient needs at least two stops.')
    await expect(page.getByRole('button', { name: /^Remove stop \d$/ }).first()).toHaveAttribute('aria-disabled', 'true')
  })

  test('the Delete key removes the selection by the same rule', async ({ page }) => {
    await stopSelect(page, 1).click()
    await stopSelect(page, 2).click({ modifiers: ['Shift'] }) // stops 1, 2, 4
    await page.keyboard.press('Delete')
    await expect(stopRows(page)).toHaveCount(2)
    expect(await hexes(page)).toEqual(['#6E6BFF', '#E0788C'])
  })

  test('arrows move the selection together, and it stops as a group at 0 and 100', async ({ page }) => {
    await stopSelect(page, 4).click() // 30%
    await stopSelect(page, 2).click({ modifiers: ['Control'] }) // 60%
    await handle(page, 2).focus()
    const at = async (n) => Number(/at (\d+)%/.exec(await handle(page, n).getAttribute('aria-label'))[1])
    await page.keyboard.press('Shift+ArrowRight') // +10
    expect([await at(4), await at(2)]).toEqual([40, 70])
    await page.keyboard.press('ArrowLeft') // -1
    expect([await at(4), await at(2)]).toEqual([39, 69])
    await page.keyboard.press('End') // as far right as the group goes: 100 - 69 = +31
    expect([await at(4), await at(2)], 'the right-hand stop stops at 100 and the gap is kept').toEqual([70, 100])
    await page.keyboard.press('Home') // -70: the left-hand stop reaches 0
    expect([await at(4), await at(2)], 'the left-hand stop stops at 0 and the gap is kept').toEqual([0, 30])
    expect([await at(1), await at(3), await at(5)], 'the unselected stops did not move').toEqual([0, 100, 80])
  })

  test('Escape on the rail clears the selection too', async ({ page }) => {
    await stopSelect(page, 1).click()
    await stopSelect(page, 2).click({ modifiers: ['Shift'] })
    await expect(selCount(page)).toHaveText('3 selected')
    await handle(page, 1).focus()
    await page.keyboard.press('Escape')
    await expect(selCount(page)).toHaveCount(0)
  })
})

// ── 5 · touch: press and hold ────────────────────────────────────────────────

test.describe('selecting several stops by touch at 390px', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
  test.beforeEach(async ({ page }) => {
    watch(page, 'a phone user selecting stops')
    await seed(page)
    await open(page)
  })

  test('a 450ms press and hold starts selecting; every tap after it adds or removes; Done ends it', async ({ page }) => {
    await longPress(page, stopSelect(page, 2))
    await expect(selCount(page)).toHaveText('1 selected')
    await expect(page.locator('.grd-sel-clear')).toHaveText('Done')
    await expect.poll(() => said(page)).toContain('Selecting stops. Tap a stop to add or remove it.')
    await stopSelect(page, 4).tap()
    await expect(selCount(page)).toHaveText('2 selected')
    await stopSelect(page, 5).tap()
    expect(await pressed(page)).toEqual([2, 4, 5])
    await stopSelect(page, 4).tap()
    expect(await pressed(page)).toEqual([2, 5])
    await page.locator('.grd-sel-clear').tap()
    await expect(selCount(page)).toHaveCount(0)
    // Out of selection mode a tap is a plain select again.
    await stopSelect(page, 3).tap()
    expect(await pressed(page)).toEqual([3])
  })

  test('a short press is only a select', async ({ page }) => {
    await longPress(page, stopSelect(page, 2), 120)
    await expect(selCount(page)).toHaveCount(0)
    await page.waitForTimeout(600) // longer than the hold, to be sure no late timer starts it
    await expect(selCount(page)).toHaveCount(0)
  })

  test('a chip colours the whole touch selection', async ({ page }) => {
    await longPress(page, stopSelect(page, 1))
    await stopSelect(page, 3).tap()
    await chips(page).nth(2).tap()
    const h = await hexes(page)
    expect([h[0], h[2]]).toEqual([THIRTEEN[2], THIRTEEN[2]])
    expect(h[1], 'stop 2 was not selected').not.toBe(THIRTEEN[2])
  })
})

// ── 6 · chip picks are the shuffle pool ─────────────────────────────────────

test.describe('picking colours for Shuffle at 1440px', () => {
  test.use({ viewport: { width: 1440, height: 900 } })
  test.beforeEach(async ({ page }) => {
    watch(page, 'a designer shuffling from a few chosen colours')
    await seed(page, { gradient: null })
    await open(page)
  })

  test('picked colours drive Shuffle from palette, and "Shuffle from N picked colours" says so', async ({ page }) => {
    const [a, b] = [THIRTEEN[3], THIRTEEN[7]]
    const button = shuffleBtn(page)
    await expect(button).toHaveAttribute('title', 'Build a random gradient from your current palette')

    await chips(page).nth(3).click({ modifiers: ['Shift'] })
    await expect(chips(page).nth(3)).toHaveAttribute('aria-label', new RegExp(`${a}, picked for shuffle$`))
    await expect.poll(() => said(page)).toContain('1 colour picked')
    // One pick is a mark, not yet a pool.
    await expect(button).toHaveAttribute('title', 'Build a random gradient from your current palette')

    await chips(page).nth(7).click({ modifiers: ['Control'] })
    await expect.poll(() => said(page)).toContain('Shuffle from 2 picked colours')
    await expect(button).toHaveAttribute('title', 'Shuffle from 2 picked colours')
    // The dashed ring: the picked chips only.
    const ring = (i) => chips(page).nth(i).evaluate((e) => getComputedStyle(e, '::after').borderTopStyle)
    expect(await ring(3)).toBe('dashed')
    expect(await ring(7)).toBe('dashed')
    expect(await ring(1), 'an unpicked chip has no ring').not.toBe('dashed')
    // A pick is not a press: no stop took the colour.
    expect(await hexes(page)).not.toContain(a)

    for (let i = 0; i < 12; i++) {
      await button.click()
      for (const h of await hexes(page)) expect([a, b], `Shuffle ${i + 1}`).toContain(h)
    }
    await expect(page.locator('.toast.show')).toContainText('Random gradient from 2 picked colours')
  })

  test('Clear picks empties the pool, and Shuffle goes back to the whole palette', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Clear picks' })).toHaveCount(0)
    await chips(page).nth(3).click({ modifiers: ['Shift'] })
    await chips(page).nth(7).click({ modifiers: ['Shift'] })
    await expect(page.getByRole('button', { name: 'Clear picks' })).toBeVisible()
    await page.getByRole('button', { name: 'Clear picks' }).click()
    await expect(page.getByRole('button', { name: 'Clear picks' })).toHaveCount(0)
    await expect(chips(page).nth(3)).not.toHaveAttribute('aria-label', /picked for shuffle/)
    await expect(shuffleBtn(page)).toHaveAttribute('title', 'Build a random gradient from your current palette')
    await expect.poll(() => said(page)).toContain('Picks cleared')
    // The control: 25 shuffles from the whole palette use more than the two.
    const seen = new Set()
    for (let i = 0; i < 25; i++) {
      await shuffleBtn(page).click()
      for (const h of await hexes(page)) seen.add(h)
    }
    expect([...seen].some((h) => h !== THIRTEEN[3] && h !== THIRTEEN[7])).toBe(true)
  })

  test('a Shift-click on a picked chip unpicks it, and a plain click still sets the stop', async ({ page }) => {
    await chips(page).nth(2).click({ modifiers: ['Shift'] })
    await chips(page).nth(2).click({ modifiers: ['Shift'] })
    await expect(chips(page).nth(2)).not.toHaveAttribute('aria-label', /picked for shuffle/)
    await expect(page.getByRole('button', { name: 'Clear picks' })).toHaveCount(0)
    await chips(page).nth(2).click()
    expect((await hexes(page))[0]).toBe(THIRTEEN[2])
  })
})

test.describe('picking colours for Shuffle by touch at 390px', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

  test('press and hold picks a chip; a tap still sets the stop', async ({ page }) => {
    watch(page, 'a phone user picking shuffle colours')
    await seed(page, { gradient: null })
    await open(page)
    await longPress(page, chips(page).nth(3))
    await expect(chips(page).nth(3)).toHaveAttribute('aria-label', /picked for shuffle$/)
    await longPress(page, chips(page).nth(7))
    await expect.poll(() => said(page)).toContain('Shuffle from 2 picked colours')
    await chips(page).nth(5).tap()
    expect((await hexes(page))[0], 'a tap sets the colour').toBe(THIRTEEN[5])
    await expect(chips(page).nth(5)).not.toHaveAttribute('aria-label', /picked for shuffle/)
  })
})

// ── 7 · none of it moves the page ───────────────────────────────────────────

const SHAPE = ['page', 'panel', 'main', 'avail', 'window']
async function shapeOf(page) {
  return page.evaluate(() => {
    const h = (sel) => { const e = document.querySelector(sel); return e ? Math.round(e.getBoundingClientRect().height * 100) / 100 : null }
    return { page: document.documentElement.scrollHeight, panel: h('.tl-panel'), main: h('.tl-main'), avail: h('.grd-avail'), window: h('.grd-stops') }
  })
}
function ledger(page) {
  const rows = []
  return {
    async mark(step) { await settle(page); rows.push({ step, ...(await shapeOf(page)) }) },
    get count() { return rows.length },
    drift() {
      const [first, ...rest] = rows
      return rest.flatMap((r) => SHAPE.filter((k) => r[k] !== first[k]).map((k) => `${r.step}: ${k} is ${r[k]}px, was ${first[k]}px at "${first.step}"`))
    },
  }
}

test.describe('the page does not move at 1440px', () => {
  test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })

  test('settings, selecting, bulk edits and picks change the page height by 0px', async ({ page }) => {
    watch(page, 'a designer using every new control')
    await seed(page)
    await open(page)
    const l = ledger(page)
    await l.mark('at rest')

    const scope = await openSettings(page)
    await l.mark('settings open')
    await option(scope, 'Type', 'Radial').click(); await l.mark('Type = Radial')
    await option(scope, 'Stops', 4).click({ modifiers: ['Shift'] }); await l.mark('Stops = 4')
    await scope.getByRole('button', { name: 'Keep the angle' }).click(); await l.mark('Keep the angle on')
    await page.keyboard.press('Escape'); await l.mark('settings closed')

    await stopSelect(page, 1).click()
    await stopSelect(page, 2).click({ modifiers: ['Shift'] }); await l.mark('3 stops selected (head row shows N selected)')
    await chips(page).nth(1).click(); await l.mark('bulk colour')
    await page.locator('.grd-stop-lock').first().click(); await l.mark('bulk lock')
    await page.keyboard.press('Control+A'); await l.mark('all selected')
    await page.keyboard.press('Escape'); await l.mark('selection cleared')

    await chips(page).nth(3).click({ modifiers: ['Shift'] }); await l.mark('one pick (Clear picks appears)')
    await chips(page).nth(7).click({ modifiers: ['Shift'] }); await l.mark('two picks')
    await shuffleBtn(page).click(); await l.mark('Shuffle from 2 picks')
    await page.getByRole('button', { name: 'Clear picks' }).click(); await l.mark('picks cleared')

    await stopSelect(page, 1).click(); await page.keyboard.press('Control+A')
    await page.getByRole('button', { name: /^Remove the \d selected stops$/ }).first().click(); await l.mark('bulk delete down to the floor')
    expect(l.count).toBe(16)
    expect(l.drift(), l.drift().join('\n')).toEqual([])
  })
})

test.describe('the page does not move at 390px (touch)', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' })

  test('the More-menu settings, a long-press selection and chip picks change the page height by 0px', async ({ page }) => {
    watch(page, 'a phone user using every new control')
    await seed(page)
    await open(page)
    const l = ledger(page)
    await l.mark('at rest')

    const scope = await openSettings(page)
    await l.mark('More menu open with the settings')
    await option(scope, 'Type', 'Radial').tap(); await l.mark('Type = Radial')
    await option(scope, 'Stops', 4).tap(); await l.mark('Stops = 4')
    await page.keyboard.press('Escape'); await l.mark('menu closed')

    await longPress(page, stopSelect(page, 2)); await l.mark('selection mode (Done in the head row)')
    await stopSelect(page, 4).tap(); await l.mark('two selected')
    await chips(page).nth(1).tap(); await l.mark('bulk colour')
    await page.locator('.grd-sel-clear').tap(); await l.mark('Done')

    await longPress(page, chips(page).nth(3)); await l.mark('one pick (Clear picks appears)')
    await longPress(page, chips(page).nth(7)); await l.mark('two picks')
    await page.getByRole('button', { name: 'Clear picks' }).tap(); await l.mark('picks cleared')
    expect(l.count).toBe(12)
    expect(l.drift(), l.drift().join('\n')).toEqual([])
  })
})
