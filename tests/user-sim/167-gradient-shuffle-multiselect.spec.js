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
// No screenshot is taken in this file, except one on purpose: in a touch context
// a full-page or element screenshot turns pointer: coarse off for the page, and
// "selection-mode taps still add and remove ..." uses that to read a fine pointer.
//
// MUTATIONS (each turns the tests named red):
//   engineFilters returns no types                    -> "Type = Radial only ..." and the 360 More-menu test
//   engineFilters returns no counts                   -> "Stops = 4 or 5 ..."
//   randomise sets the angle even with the angle lock -> "the angle lock in Geometry holds the angle ..."
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
//   the Available colours head-row min-height removed -> "the page does not move" (1440 and 390)
//   .grd-sel-clear made 60px tall (head row grows)    -> "the page does not move" (1440 and 390)
//   the shuffle-settings More-menu item dropped       -> the 390 and 360 "More menu" and tap tests
//   toggleStopLock acts on one stop                   -> "the lock on a selected row"
//   Ctrl+A selects two stops only                     -> "Ctrl+A selects every stop"
// (Four lines about the Shuffle pool on the chips - Clear picks, the picks driving Shuffle, the chip
// long-press - were removed in G1: the pool moved to Shuffle settings, and those tests went with it.)
// G1: openPoolSettings' focus call `row.focus()` -> `row.blur()` turns all six "Choose colours for Shuffle"
// tests red (1440, 768 and 390, opening and already open). Throwaway src edit on its own build, undone.
// All 22 were run on a throwaway build (a copy of src under .claude/scratch/grads3/mut, patched,
// built, served on 4960); every one turned the named tests red and the lane's src was not touched.
//
// Added with the logic-review fixes (same throwaway-build method):
//   rollStops does not close a conic seam round a locked stop     -> the two "a locked stop and a conic roll" tests
//   the controls panel has no Escape handler                      -> "Escape in the hex input", "Escape on a palette chip",
//                                                                    "Escape inside the open colour picker ..."
//   the hex input swallows Escape (stopPropagation)               -> "Escape in the hex input ..."
//   removeStops leaves the Shift-click anchor where it was        -> the two "delete ..., then Shift-click" tests
//   pressStop / dragStop need coarse && selMode, not selMode      -> "selection-mode taps still add and remove ..."
//   the panel's Escape guards AND the popover's stopPropagation   -> "Escape with the picker button focused ...",
//     both gone                                                      "Escape on the row swatch picker ..."
// The panel's own guard (the "something is open in front" check) alone is an equivalent mutant: usePopover and
// StopTintMenu stop Escape at the document's capture phase, so the panel never sees it. The tests hold the
// behaviour (picker first, then the selection), not that guard.
// Unit mutations for pickPaletteLook and the Radial fallback (tests/unit/gradient-random.test.js) are in the commit message:
// all 7 turn at least one test red.
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
  const design = { palette: { base: d.palette[0] || '#0051FF', harmony: 'auto', extraColors: [], activeIdx: 0, colors: d.palette } }
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
  const trigger = page.locator('[data-tool-toolbar]').getByRole('button', { name: /^Shuffle settings(, narrowed)?$/ })
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

  test('the angle lock in Geometry holds the angle through Random and Shuffle; off, Random moves it', async ({ page }) => {
    await seed(page, { gradient: null })
    await open(page)
    const field = page.getByRole('spinbutton', { name: 'Gradient angle in degrees' })
    await field.fill('77')
    await field.press('Enter')
    await expect(field).toHaveValue('77')
    // Linear only, so the angle field is always drawn and always read.
    const scope = await openSettings(page)
    await option(scope, 'Type', 'Linear').click()
    await page.keyboard.press('Escape')
    const keep = page.getByRole('button', { name: 'Keep the angle when you press Random' })
    await off(keep)
    await keep.click()
    const kept = page.getByRole('button', { name: /^The angle is kept/ })
    await on(kept)
    for (let i = 0; i < 8; i++) {
      await toolbarAction(page, /^Random$/)
      await expect(field, `Random ${i + 1}`).toHaveValue('77')
      await toolbarAction(page, /^Shuffle from palette$/)
      await expect(field, `Shuffle ${i + 1}`).toHaveValue('77')
    }
    await kept.click()
    await off(page.getByRole('button', { name: 'Keep the angle when you press Random' }))
    let moved = false
    for (let i = 0; i < 20 && !moved; i++) {
      await toolbarAction(page, /^Random$/)
      moved = (await field.inputValue()) !== '77'
    }
    expect(moved, 'with the angle lock off, twenty Randoms never moved the angle').toBe(true)
  })
  test('the locks sit beside the controls they keep: a colour lock per stop row, plus one each for position, type, angle and interpolation', async ({ page }) => {
    await open(page)
    await expect(page.locator('.grd-row--angle .grd-lock')).toHaveCount(1)
    await expect(page.locator('.grd-lock')).toHaveCount((await stopRows(page).count()) + 5) // + Selected stop's colour and position, Type, Angle, Interpolation
  })
})

// A conic gradient closes its seam: the last colour is the first again, even when
// a locked stop keeps the stop count and one end is not the roll's to colour.
test.describe('a locked stop and a conic roll at 1440px', () => {
  test.use({ viewport: { width: 1440, height: 900 } })
  test.beforeEach(async ({ page }) => {
    watch(page, 'a designer who locked one end and rolls a conic')
    await seed(page)
    await open(page)
    const scope = await openSettings(page)
    await option(scope, 'Type', 'Conic').click()
    await on(option(scope, 'Type', 'Conic'))
  })

  // `lockIdx` is the list position of the locked stop; its colour is in SEED.
  async function rollsKeepSeam(page, lockIdx) {
    const locked = SEED.stops[lockIdx].color
    await page.locator('.grd-stop-lock').nth(lockIdx).click()
    await expect(page.locator('.grd-stop-lock').nth(lockIdx)).toHaveAttribute('aria-pressed', 'true')
    for (const [label, action] of [['Random', /^Random$/], ['Shuffle', /^Shuffle from palette$/]]) {
      for (let i = 0; i < 10; i++) {
        await toolbarAction(page, action)
        expect(await typeOf(page), `${label} ${i + 1}`).toBe('Conic')
        const h = await hexes(page)
        expect(h.length, 'the lock keeps all five stops').toBe(5)
        expect(h[lockIdx], `${label} ${i + 1}: the locked stop keeps its colour`).toBe(locked)
        expect(h[h.length - 1], `${label} ${i + 1}: the seam is open on ${h}`).toBe(h[0])
      }
    }
  }

  test('the first stop locked: Random and Shuffle end on the locked colour', async ({ page }) => {
    await rollsKeepSeam(page, 0)
  })

  test('the last stop locked: Random and Shuffle start on the locked colour', async ({ page }) => {
    await rollsKeepSeam(page, 4)
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
      await expect(page.locator('[data-tool-toolbar]').getByRole('button', { name: /^Shuffle settings(, narrowed)?$/ })).toHaveCount(0)
      const scope = await openSettings(page)
      await expect(scope.locator('.grd-shuf-title')).toHaveText('What Random and Shuffle make')
      for (const g of ['Type', 'Stops']) await expect(group(scope, g)).toBeVisible()
      await expect(scope.getByRole('button', { name: 'Keep the angle' })).toHaveCount(0)
      await expect(scope.getByText('Tap to add or remove.')).toBeVisible()
    })

    test('the angle lock in Geometry is a 44px touch target', async ({ page }) => {
      await open(page)
      const box = await page.getByRole('button', { name: 'Keep the angle when you press Random' }).boundingBox()
      expect(box.height, 'the angle lock is 44px tall').toBeGreaterThanOrEqual(44)
      expect(box.width, 'the angle lock is 44px wide').toBeGreaterThanOrEqual(44)
    })

    test('the Type and Stops options are 44px tall targets in the More menu', async ({ page }) => {
      await open(page)
      const scope = await openSettings(page)
      for (const b of await scope.locator('.tl-pill').all()) {
        // rounded: the sheet's transform leaves sub-pixel heights such as 43.99997
        expect(Math.round((await b.boundingBox()).height), await b.textContent()).toBeGreaterThanOrEqual(44)
      }
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
    // The sentence is Available colours' own status line now; the Stops region does not repeat it.
    await expect(page.locator('#grd-avail-status')).toHaveText(/^3 selected stops set to Secondary 500\.\u200B?$/)
    await expect(page.locator('[role="status"]').filter({ hasText: 'set to Secondary 500' })).toHaveCount(1)
    // A selection stays a selection: no advance.
    await expect(selCount(page)).toHaveText('3 selected')
  })

  test('the lock on a selected row locks every selected stop', async ({ page }) => {
    await stopSelect(page, 1).click()
    await stopSelect(page, 3).click({ modifiers: ['Control'] })
    const locks = page.locator('.grd-stop-lock')
    await expect(locks.nth(0)).toHaveAttribute('aria-label', "Keep the 2 selected stops' colours when you press Random")
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

  /** Stops 1, 2 and 4 selected, the way the other tests do it. */
  async function selectThree(page) {
    await stopSelect(page, 1).click()
    await stopSelect(page, 2).click({ modifiers: ['Shift'] })
    await expect(selCount(page)).toHaveText('3 selected')
    expect(await pressed(page)).toEqual([1, 2, 4])
  }

  test('Escape in the hex input clears the selection, and the hex is left as it was', async ({ page }) => {
    await selectThree(page)
    const before = await hexes(page)
    const hex = page.getByRole('textbox', { name: 'Hex for the 3 selected stops' })
    await hex.focus()
    await hex.fill('#12')
    await page.keyboard.press('Escape')
    await expect(selCount(page)).toHaveCount(0)
    expect((await pressed(page)).length, 'back to the one active stop').toBe(1)
    expect(await hexes(page), 'a half-typed hex is thrown away, not applied').toEqual(before)
    await expect.poll(() => said(page)).toContain('Selection cleared')
  })

  test('Escape on a palette chip clears the selection', async ({ page }) => {
    await selectThree(page)
    await chips(page).nth(4).focus()
    await expect(chips(page).nth(4)).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(selCount(page)).toHaveCount(0)
    expect((await pressed(page)).length).toBe(1)
  })

  test('Escape inside the open colour picker closes the picker first and keeps the selection', async ({ page }) => {
    await selectThree(page)
    const trigger = page.getByRole('button', { name: 'Colour of the 3 selected stops' })
    const picker = page.getByRole('dialog', { name: 'Colour of the 3 selected stops' })
    await trigger.click()
    await expect(picker).toBeVisible()
    // The picker takes focus onto its pad; the key is pressed from inside it.
    await expect.poll(() => picker.evaluate((el) => el.contains(document.activeElement))).toBe(true)
    await page.keyboard.press('Escape')
    await expect(picker).toBeHidden()
    await expect(selCount(page), 'the first Escape only closed the picker').toHaveText('3 selected')
    expect(await pressed(page)).toEqual([1, 2, 4])
    // With nothing in front of it, the next Escape is the selection's.
    await expect(trigger).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(selCount(page)).toHaveCount(0)
  })

  test('Escape with the picker button focused and the picker open keeps the selection too', async ({ page }) => {
    await selectThree(page)
    const trigger = page.getByRole('button', { name: 'Colour of the 3 selected stops' })
    await trigger.click()
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')
    await trigger.focus()
    await page.keyboard.press('Escape')
    await expect(selCount(page)).toHaveText('3 selected')
  })

  test('Escape on the row swatch picker (a portal) does not clear a selection either', async ({ page }) => {
    await selectThree(page)
    const swatch = page.getByRole('button', { name: 'Pick stop 1 colour' })
    const picker = page.getByRole('dialog', { name: 'Pick stop 1 colour' })
    await swatch.click()
    await expect(picker).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(picker).toBeHidden()
    await expect(selCount(page)).toHaveText('3 selected')
    expect(await pressed(page)).toEqual([1, 2, 4])
  })

  // Shift-click ranges from the anchor. A delete moves the stops under it, so
  // the anchor follows the stop that is active afterwards.
  test('delete a stop, then Shift-click ranges from the stop that is active now', async ({ page }) => {
    await stopSelect(page, 2).click() // 60%, the active stop and the anchor
    await page.getByRole('button', { name: 'Remove stop 1' }).click()
    await expect(stopRows(page)).toHaveCount(4)
    // Now: 1 #27348B 60%, 2 #6E6BFF 100%, 3 #C6F36B 30%, 4 #E0788C 80%.
    expect(await hexes(page)).toEqual(['#27348B', '#6E6BFF', '#C6F36B', '#E0788C'])
    expect(await pressed(page), 'the active stop moved up with the delete').toEqual([1])
    await stopSelect(page, 4).click({ modifiers: ['Shift'] })
    // From 60% to 80% along the rail is stops 1 and 4. From the old index (stop 2, at 100%) it would be 2 and 4.
    expect(await pressed(page)).toEqual([1, 4])
    await expect(selCount(page)).toHaveText('2 selected')
  })

  test('delete the active stop, then Shift-click ranges from the stop that took its place', async ({ page }) => {
    await stopSelect(page, 5).click() // 80%, last in the list
    await page.getByRole('button', { name: 'Remove stop 5' }).click()
    await expect(stopRows(page)).toHaveCount(4)
    expect(await pressed(page), 'the last row is active again').toEqual([4])
    // Now: 1 #0A0F2C 0%, 2 #27348B 60%, 3 #6E6BFF 100%, 4 #C6F36B 30%.
    await stopSelect(page, 2).click({ modifiers: ['Shift'] })
    expect(await pressed(page), '30% to 60% along the rail').toEqual([2, 4])
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

  test('selection-mode taps still add and remove when the pointer query reads fine', async ({ page }) => {
    const coarse = () => page.evaluate(() => matchMedia('(pointer: coarse)').matches)
    await longPress(page, stopSelect(page, 2))
    await expect(selCount(page)).toHaveText('1 selected')
    expect(await coarse(), 'a touch context starts coarse').toBe(true)
    // The harness turns pointer: coarse off for the page when it takes a full-page
    // screenshot. A laptop with a touch screen, or a pen, reads the same: the mode
    // a long press started is what the taps follow, not the media query.
    await page.screenshot({ fullPage: true })
    expect(await coarse(), 'the screenshot made the pointer fine').toBe(false)
    await expect(selCount(page), 'and the mode is still on').toHaveText('1 selected')
    await expect(page.locator('.grd-sel-clear')).toHaveText('Done')
    await stopSelect(page, 4).tap()
    await expect(selCount(page)).toHaveText('2 selected')
    await stopSelect(page, 5).tap()
    expect(await pressed(page)).toEqual([2, 4, 5])
    await stopSelect(page, 4).tap()
    expect(await pressed(page)).toEqual([2, 5])
    await page.locator('.grd-sel-clear').tap()
    await expect(selCount(page)).toHaveCount(0)
    await stopSelect(page, 3).tap()
    expect(await pressed(page), 'out of the mode a tap selects one again').toEqual([3])
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

// ── 6 · the Shuffle pool lives in Shuffle settings → Colours ────────────────
// It used to be a Shift-click or press-and-hold on a chip. The chips now only
// paint (spec gradient-generation-v2 §2.2, T-A6); the pool is a Colours row in
// Shuffle settings: "All palette colours" or "Pick colours…", a checklist, and
// two or more ticks make the pool. It is kept in sessionStorage, in
// filters.pool, as upper-case hexes in the order they were ticked.

const A = THIRTEEN[3] // Neutral 500
const B = THIRTEEN[7] // Colour 8 500
const C = THIRTEEN[10] // Colour 11 500
const FILTER_KEY = 'vs-gradient-shuffle-filters'
const poolRow = (scope) => group(scope, 'Colours')
const allPill = (scope) => poolRow(scope).getByRole('button', { name: 'All palette colours' })
const pickPill = (scope) => poolRow(scope).getByRole('button', { name: /^(Pick colours…|\d+ colours)$/ })
const checklist = (scope) => scope.getByRole('group', { name: 'Colours to shuffle from' })
const tick = (scope, name) => scope.getByRole('checkbox', { name })
const storedPool = (page) => page.evaluate((k) => JSON.parse(sessionStorage.getItem(k) || 'null')?.pool, FILTER_KEY)
const settingsButton = (page) => page.locator('[data-tool-toolbar]').getByRole('button', { name: /^Shuffle settings/ })

test.describe('the chips no longer carry the Shuffle pool', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('no tip, no ring, no "picked for shuffle", and Shift-click on a chip only paints', async ({ page }) => {
    watch(page, 'someone who remembers picking Shuffle colours on the chips')
    await seed(page, { gradient: null })
    await open(page)
    await expect(page.getByText(/Shift-click to pick for Shuffle|Hold to pick for Shuffle/)).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Clear picks' })).toHaveCount(0)
    await chips(page).nth(3).click({ modifiers: ['Shift'] })
    await expect(chips(page).nth(3)).not.toHaveAttribute('aria-label', /picked for shuffle/)
    expect((await hexes(page))[0], 'a Shift-click is just a press').toBe(A)
    expect(await storedPool(page), 'and picks nothing for Shuffle').toEqual([])
    await expect(shuffleBtn(page)).toHaveAttribute('title', 'Build a random gradient from your current palette')
  })
})

test.describe('Shuffle settings → Colours at 1440px', () => {
  test.use({ viewport: { width: 1440, height: 900 } })
  test.beforeEach(async ({ page }) => {
    watch(page, 'a designer shuffling from a few chosen colours')
    await seed(page, { gradient: null })
    await open(page)
  })

  test('the row offers "All palette colours" (on) and "Pick colours…", and no checklist until asked', async ({ page }) => {
    const scope = await openSettings(page)
    await on(allPill(scope))
    await off(pickPill(scope))
    await expect(pickPill(scope)).toHaveText('Pick colours…')
    await expect(checklist(scope)).toHaveCount(0)
    await pickPill(scope).click()
    await expect(checklist(scope)).toBeVisible()
    await expect(checklist(scope).getByRole('checkbox')).toHaveCount(13)
    expect(await checklist(scope).getByRole('checkbox').evaluateAll((els) => els.filter((e) => e.checked).length), 'nothing is ticked yet').toBe(0)
    await expect(checklist(scope)).toContainText('Tick two or more colours.')
  })

  test('ticking three colours makes Shuffle from palette use only those, and says so', async ({ page }) => {
    const button = shuffleBtn(page)
    await expect(button).toHaveAttribute('title', 'Build a random gradient from your current palette')
    const scope = await openSettings(page)
    await pickPill(scope).click()
    await tick(scope, 'Neutral 500').check()
    await expect(checklist(scope)).toContainText('Tick two or more colours.')
    await expect(button, 'one tick is a mark, not yet a pool').toHaveAttribute('title', 'Build a random gradient from your current palette')
    await tick(scope, 'Colour 8 500').check()
    await tick(scope, 'Colour 11 500').check()
    await expect(checklist(scope)).toContainText('Shuffle from 3 colours.')
    await expect(pickPill(scope)).toHaveText('3 colours')
    await expect(button).toHaveAttribute('title', 'Shuffle from 3 picked colours')
    expect(await storedPool(page)).toEqual([A, B, C])
    // A tick is not a press: no stop took a colour.
    expect(await hexes(page)).not.toContain(A)
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: 'Shuffle settings' })).toBeHidden()

    const seen = new Set()
    for (let i = 0; i < 15; i++) {
      await button.click()
      for (const h of await hexes(page)) { seen.add(h); expect([A, B, C], `Shuffle ${i + 1}`).toContain(h) }
    }
    expect(seen.size, 'it really draws from the three, not one of them').toBeGreaterThan(1)
    await expect(page.locator('.toast.show')).toContainText('Random gradient from 3 picked colours')
  })

  test('Shuffle settings reads "narrowed" from two ticks, and not before', async ({ page }) => {
    await expect(settingsButton(page)).toHaveAccessibleName('Shuffle settings')
    const scope = await openSettings(page)
    await pickPill(scope).click()
    await tick(scope, 'Neutral 500').check()
    await expect(settingsButton(page), 'one tick').toHaveAccessibleName('Shuffle settings')
    await expect(settingsButton(page)).not.toHaveClass(/is-narrowed/)
    await tick(scope, 'Colour 8 500').check()
    await expect(settingsButton(page), 'two ticks').toHaveAccessibleName('Shuffle settings, narrowed')
    await expect(settingsButton(page)).toHaveClass(/is-narrowed/)
    await tick(scope, 'Colour 8 500').uncheck()
    await expect(settingsButton(page), 'back to one').toHaveAccessibleName('Shuffle settings')
  })

  test('"All palette colours" clears the pool, and Shuffle goes back to the whole palette', async ({ page }) => {
    const scope = await openSettings(page)
    await pickPill(scope).click()
    await tick(scope, 'Neutral 500').check()
    await tick(scope, 'Colour 8 500').check()
    await expect(settingsButton(page)).toHaveAccessibleName('Shuffle settings, narrowed')
    await allPill(scope).click()
    await on(allPill(scope))
    await expect(checklist(scope)).toHaveCount(0)
    await expect(settingsButton(page)).toHaveAccessibleName('Shuffle settings')
    expect(await storedPool(page)).toEqual([])
    await page.keyboard.press('Escape')
    await expect(shuffleBtn(page)).toHaveAttribute('title', 'Build a random gradient from your current palette')
    // The control: 25 shuffles from the whole palette use more than the two.
    const seen = new Set()
    for (let i = 0; i < 25; i++) {
      await shuffleBtn(page).click()
      for (const h of await hexes(page)) seen.add(h)
    }
    expect([...seen].some((h) => h !== A && h !== B)).toBe(true)
    // And the checklist starts empty again.
    const again = await openSettings(page)
    await pickPill(again).click()
    expect(await checklist(again).getByRole('checkbox').evaluateAll((els) => els.filter((e) => e.checked).length)).toBe(0)
  })

  test('unticking down to one colour stops the narrowing, and Shuffle uses the whole palette again', async ({ page }) => {
    const scope = await openSettings(page)
    await pickPill(scope).click()
    await tick(scope, 'Neutral 500').check()
    await tick(scope, 'Colour 8 500').check()
    await tick(scope, 'Colour 8 500').uncheck()
    await expect(checklist(scope)).toContainText('Tick two or more colours.')
    await expect(shuffleBtn(page)).toHaveAttribute('title', 'Build a random gradient from your current palette')
    expect(await storedPool(page)).toEqual([A])
  })

  test('the pool survives a reload', async ({ page }) => {
    const scope = await openSettings(page)
    await pickPill(scope).click()
    await tick(scope, 'Neutral 500').check()
    await tick(scope, 'Colour 8 500').check()
    await page.reload()
    await expect(panelOf(page)).toBeVisible()
    await expect(settingsButton(page)).toHaveAccessibleName('Shuffle settings, narrowed')
    await expect(shuffleBtn(page)).toHaveAttribute('title', 'Shuffle from 2 picked colours')
    const after = await openSettings(page)
    await expect(pickPill(after)).toHaveText('2 colours')
    await off(allPill(after))
    await pickPill(after).click()
    await expect(tick(after, 'Neutral 500')).toBeChecked()
    await expect(tick(after, 'Colour 8 500')).toBeChecked()
    await expect(tick(after, 'Primary 500')).not.toBeChecked()
    expect(await storedPool(page)).toEqual([A, B])
  })
})

// ── "Choose colours for Shuffle": the way from the colours to the pool ───────
// The link under Available colours opens Shuffle settings (the toolbar button's
// popover, or the More menu where the toolbar has no room) and puts focus on the
// first pill of the Colours row. It does not toggle an already-open menu shut.
const poolLink = (page) => page.getByRole('button', { name: 'Choose colours for Shuffle' })
const focusedIsFirstPoolPill = (page) => page.evaluate(() => {
  const a = document.activeElement
  return !!a && a.hasAttribute('data-pool-first') && a.textContent === 'All palette colours'
})
/** Where the settings are showing: the popover dialog, or the More menu's inline copy. */
const settingsShown = async (page) => {
  const dialog = page.getByRole('dialog', { name: 'Shuffle settings' })
  if (await dialog.isVisible().catch(() => false)) return 'popover'
  if (await page.locator('.grd-shuf-inline').isVisible().catch(() => false)) return 'more'
  return null
}

for (const [label, use, expected] of [
  ['1440px', { viewport: { width: 1440, height: 900 } }, 'popover'],
  ['768px touch', { viewport: { width: 768, height: 1024 }, hasTouch: true, isMobile: true }, null],
  ['390px touch', { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }, 'more'],
]) {
  test.describe(`Choose colours for Shuffle at ${label}`, () => {
    test.use(use)
    test.beforeEach(async ({ page }) => {
      watch(page, 'someone choosing the colours Shuffle draws from')
      await seed(page, { gradient: null })
      await open(page)
    })

    test('opens Shuffle settings and puts focus on the first Colours pill', async ({ page }) => {
      expect(await settingsShown(page), 'POSITIVE CONTROL: nothing is open yet').toBeNull()
      await poolLink(page).scrollIntoViewIfNeeded()
      await poolLink(page).click()
      await expect.poll(() => settingsShown(page), 'the settings opened').not.toBeNull()
      if (expected) expect(await settingsShown(page)).toBe(expected)
      await expect.poll(() => focusedIsFirstPoolPill(page), 'and focus is on All palette colours').toBe(true)
      // Not on the link it came from, and the pool row it names is the one in view.
      await expect(poolLink(page)).not.toBeFocused()
    })

    test('with the settings already open it keeps them open and still moves focus', async ({ page }) => {
      const scope = await openSettings(page)
      const shown = await settingsShown(page)
      expect(shown, 'POSITIVE CONTROL: the settings are open before the link is used').not.toBeNull()
      await expect(poolRow(scope)).toBeVisible()
      // A click made by assistive tech, with the menu in front of the link: no pointer needed.
      await poolLink(page).evaluate((el) => el.click())
      await expect.poll(() => focusedIsFirstPoolPill(page)).toBe(true)
      expect(await settingsShown(page), 'it did not toggle the open settings shut').toBe(shown)
      await expect(poolRow(scope)).toBeVisible()
    })
  })
}

test.describe('Shuffle settings → Colours · picks the palette no longer holds', () => {
  test.use({ viewport: { width: 1440, height: 900 } })
  const GONE = '#123456' // a valid colour that is not in the palette

  test('ticking a colour keeps a stored pick the palette lacks, and unticking removes only that colour', async ({ page }) => {
    watch(page, 'someone whose saved pool names a colour that has left the palette')
    await page.addInitScript(([k, gone, a]) => {
      if (!sessionStorage.getItem(k)) sessionStorage.setItem(k, JSON.stringify({ types: ['Any'], counts: ['Any'], keepAngle: false, pool: [a, gone] }))
    }, [FILTER_KEY, GONE, A])
    await seed(page, { gradient: null })
    await open(page)
    const scope = await openSettings(page)
    // POSITIVE CONTROL: the stored pool still has both before anything is touched.
    expect(await storedPool(page)).toEqual([A, GONE])
    await expect(pickPill(scope), 'one live pick is not yet a pool').toHaveText('Pick colours…')
    await pickPill(scope).click()
    await tick(scope, 'Colour 8 500').check()
    expect(await storedPool(page), 'the stale pick is still stored beside the new one').toEqual([A, GONE, B])
    await expect(pickPill(scope)).toHaveText('2 colours')
    await tick(scope, 'Colour 8 500').uncheck()
    expect(await storedPool(page), 'unticking takes out only the colour unticked').toEqual([A, GONE])
  })
})

test.describe('a filters entry saved before the pool existed', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('loads with an empty pool and keeps what it did hold', async ({ page }) => {
    watch(page, 'someone whose session was saved by the previous version')
    await page.addInitScript((k) => {
      if (!sessionStorage.getItem(k)) sessionStorage.setItem(k, JSON.stringify({ types: ['Radial'], counts: ['Any'], keepAngle: true }))
    }, FILTER_KEY)
    await seed(page, { gradient: null })
    await open(page)
    const scope = await openSettings(page)
    await on(allPill(scope))
    await expect(pickPill(scope)).toHaveText('Pick colours…')
    await expect(page.getByRole('button', { name: /^The angle is kept/ }), 'keepAngle: true became the angle lock').toHaveAttribute('aria-pressed', 'true')
    await on(option(scope, 'Type', 'Radial'))
    await expect(settingsButton(page)).toHaveAccessibleName('Shuffle settings, narrowed') // by its type, not by a pool
    await expect(shuffleBtn(page)).toHaveAttribute('title', 'Build a random gradient from your current palette')
  })

  test('a pool holding junk or colours the palette does not have is ignored, not trusted', async ({ page }) => {
    watch(page, 'someone whose saved pool names a colour that is gone')
    await page.addInitScript((k) => {
      if (!sessionStorage.getItem(k)) sessionStorage.setItem(k, JSON.stringify({ types: ['Any'], counts: ['Any'], keepAngle: false, pool: ['#123456', 'red', 42, '#2f6bff'] }))
    }, FILTER_KEY)
    await seed(page, { gradient: null })
    await open(page)
    // One valid hex (#2F6BFF is lower case here, so it is dropped as unusable) and one
    // the palette lacks: nothing narrows.
    await expect(settingsButton(page)).toHaveAccessibleName('Shuffle settings')
    await expect(shuffleBtn(page)).toHaveAttribute('title', 'Build a random gradient from your current palette')
  })
})

test.describe('Shuffle settings → Colours without a palette', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('the ten starter colours stand in, and two ticks make Shuffle from palette live', async ({ page }) => {
    watch(page, 'someone with no palette shuffling from starter colours')
    await seed(page, { palette: [], gradient: null })
    await open(page)
    await expect(shuffleBtn(page)).toHaveAttribute('aria-disabled', 'true')
    const scope = await openSettings(page)
    await pickPill(scope).click()
    await expect(checklist(scope).getByRole('checkbox')).toHaveCount(10)
    await tick(scope, 'Starter blue').check()
    await tick(scope, 'Starter paper').check()
    await expect(shuffleBtn(page)).not.toHaveAttribute('aria-disabled', /.*/)
    await expect(shuffleBtn(page)).toHaveAttribute('title', 'Shuffle from 2 picked colours')
  })

  test('with one palette colour the row has nothing to choose, so it is not drawn', async ({ page }) => {
    watch(page, 'someone with a one-colour palette')
    await seed(page, { palette: [THIRTEEN[0]], gradient: null })
    await open(page)
    const scope = await openSettings(page)
    await expect(scope.getByText('Keep the angle')).toHaveCount(0) // the angle lock moved to Geometry
    await expect(poolRow(scope)).toHaveCount(0)
  })
})

test.describe('Shuffle settings → Colours by touch at 390px', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

  test('ticks in the More menu make the pool; rows are 44px; the chips only paint', async ({ page }) => {
    watch(page, 'a phone user picking shuffle colours')
    await seed(page, { gradient: null })
    await open(page)
    const scope = await openSettings(page)
    await pickPill(scope).tap()
    await tick(scope, 'Neutral 500').check()
    await tick(scope, 'Colour 8 500').check()
    await expect(checklist(scope)).toContainText('Shuffle from 2 colours.')
    const rows = await checklist(scope).locator('.grd-pool-opt').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().height)))
    expect(Math.min(...rows), 'tick rows are at least 44px').toBeGreaterThanOrEqual(44)
    expect(await storedPool(page)).toEqual([A, B])
    await page.keyboard.press('Escape')
    // A long press on a chip is nothing now; a tap still sets the stop.
    await longPress(page, chips(page).nth(5))
    await expect(chips(page).nth(5)).not.toHaveAttribute('aria-label', /picked for shuffle/)
    await chips(page).nth(5).tap()
    expect((await hexes(page))[0], 'a tap sets the colour').toBe(THIRTEEN[5])
    expect(await storedPool(page), 'and the pool is as the checklist left it').toEqual([A, B])
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
    await page.getByRole('button', { name: 'Keep the angle when you press Random' }).evaluate((el) => el.click()); await l.mark('angle lock on')
    await page.keyboard.press('Escape'); await l.mark('settings closed')

    await stopSelect(page, 1).click()
    await stopSelect(page, 2).click({ modifiers: ['Shift'] }); await l.mark('3 stops selected (head row shows N selected)')
    await chips(page).nth(1).click(); await l.mark('bulk colour')
    await page.locator('.grd-stop-lock').first().click(); await l.mark('bulk lock')
    await page.keyboard.press('Control+A'); await l.mark('all selected')
    await page.keyboard.press('Escape'); await l.mark('selection cleared')

    const pool = await openSettings(page)
    await pickPill(pool).click(); await l.mark('Pick colours… (the checklist opens)')
    await tick(pool, 'Neutral 500').check(); await l.mark('one tick')
    await tick(pool, 'Colour 8 500').check(); await l.mark('two ticks (Shuffle settings reads narrowed)')
    await page.keyboard.press('Escape'); await l.mark('settings closed')
    await shuffleBtn(page).click(); await l.mark('Shuffle from 2 picks')
    const again = await openSettings(page)
    await allPill(again).click(); await l.mark('All palette colours')
    await page.keyboard.press('Escape'); await l.mark('settings closed again')

    await stopSelect(page, 1).click(); await page.keyboard.press('Control+A')
    await page.getByRole('button', { name: /^Remove the \d selected stops$/ }).first().click(); await l.mark('bulk delete down to the floor')
    expect(l.count).toBe(19)
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

    const pool = await openSettings(page)
    await pickPill(pool).tap(); await l.mark('Pick colours… (the checklist opens in the More menu)')
    await tick(pool, 'Neutral 500').check(); await l.mark('one tick')
    await tick(pool, 'Colour 8 500').check(); await l.mark('two ticks')
    await allPill(pool).tap(); await l.mark('All palette colours')
    await page.keyboard.press('Escape'); await l.mark('menu closed')
    expect(l.count).toBe(14)
    expect(l.drift(), l.drift().join('\n')).toEqual([])
  })
})
