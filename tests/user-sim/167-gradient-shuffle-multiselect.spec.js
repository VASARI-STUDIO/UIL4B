// /create/gradient: what Random is told to make (Type and Stops under More options, the
// Colours row and its Pick… checklist), selecting several stops, and chip presses on a
// selection.
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
// The Random section sits in the panel at every width. Hue, Tone and Colours are
// radio groups (one Tab stop on the chosen radio, arrows move and choose). Type and
// Stops are toggle groups inside More options (#grd-gen-more). Colours: Palette and
// Colours: Pick… make Random draw from the palette or from the ticked colours.
//
// No screenshot is taken in this file, except one on purpose: in a touch context
// a full-page or element screenshot turns pointer: coarse off for the page, and
// "selection-mode taps still add and remove ..." uses that to read a fine pointer.
//
// MUTATIONS (each turns the tests named red):
//   engineFilters returns no types                    -> "Type = Radial only ..." and the 390 / 360 tap test
//   engineFilters returns no counts                   -> "Stops = 4 or 5 ..."
//   randomise sets the angle even with the angle lock -> "the angle lock in Shape holds the angle ..."
//   FilterGroup tabIndex always 0                     -> "roving tabindex"
//   FilterGroup arrow keys not handled                -> "roving tabindex"
//   RadioRow tabIndex always 0                        -> the Hue and Tone "one Tab stop" tests
//   RadioRow arrow keys not handled                   -> the Hue and Tone "arrows move and choose" tests
//   Shift/Ctrl no longer adds in a filter group       -> "Shift-click adds ..." and the touch tap test
//   pressStop Shift selects the list run, not rail    -> "Shift selects the run along the rail"
//   pressStop Ctrl/Cmd replaces instead of toggles    -> "Ctrl-click adds one and takes one out"
//   holdStart delay 450 -> 4500                       -> "a 450ms press and hold ..."
//   pickColour sets only the active stop              -> "a chip colours every selected stop"
//   removable() ignores the 2-stop floor              -> the two "delete" tests
//   removeStops stops announcing the reason           -> "... announced reason"
//   shiftGroup not clamped as a group                 -> "arrows move the selection together"
//   Escape no longer clears                           -> "Escape clears"
//   toggleStopLock acts on one stop                   -> "the lock on a selected row"
//   Ctrl+A selects two stops only                     -> "Ctrl+A selects every stop"
//   rollStops does not close a conic seam round a locked stop -> the three "a locked stop and a conic roll" tests
//   (those tests read the PAINTED ramp (the canvas CSS, sorted by position), not the list order: the seed puts
//   stop 5 last in the list but fourth on the ramp, so a seam closed on list index 0 and n-1 fails them.)
//   the controls panel has no Escape handler          -> "Escape in the hex input", "Escape on a palette chip",
//                                                         "Escape inside the open colour picker ..."
//   the hex input swallows Escape (stopPropagation)   -> "Escape in the hex input ..."
//   removeStops leaves the Shift-click anchor where it was -> the two "delete ..., then Shift-click" tests
//   pressStop / dragStop need coarse && selMode, not selMode -> "selection-mode taps still add and remove ..."
// The panel's own "something is open in front" Escape guard alone is an equivalent mutant: usePopover and
// StopTintMenu stop Escape at the document's capture phase, so the panel never sees it. The tests hold the
// behaviour (picker first, then the selection), not that guard.
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
const chips = (page) => page.locator('.grd-paint .grd-chips:not(.grd-chips--shades) .grd-chip')
const selCount = (page) => page.locator('.grd-sel-count')
const randomBtn = (page) => page.locator('[data-tool-toolbar]').getByRole('button', { name: /^Random$/ })

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

// ── the Random section ───────────────────────────────────────────────────────

const genOf = (page) => panelOf(page).locator('.grd-gen')

const moreButton = (page) => page.locator('[data-tl-more] button').first()
const menuOpen = (page) => page.locator('.tl-menu-row').first().isVisible().catch(() => false)

/** Presses Random: the toolbar button when it is drawn, otherwise its row in the More menu (360px). */
async function pressRandom(page) {
  const direct = randomBtn(page).first()
  if ((await direct.count()) && (await direct.isVisible())) { await direct.click(); return }
  if (!(await menuOpen(page))) await moreButton(page).click()
  await page.locator('.tl-menu-row').filter({ hasText: /^Random$/ }).first().click()
}

/** Sets the Colours row to Palette, so Random draws from the palette. */
async function randomFromPalette(page) {
  const palette = radio(page, 'Colours', 'Palette')
  if ((await palette.getAttribute('aria-checked')) !== 'true') await palette.click()
  await expect(palette).toHaveAttribute('aria-checked', 'true')
}

/** The radio group named `name` (Hue, Tone, Colours) in the Random section. */
const radios = (page, name) => genOf(page).getByRole('radiogroup', { name, exact: true })
const radio = (page, groupName, name) => radios(page, groupName).getByRole('radio', { name, exact: true })

/**
 * Opens More options (once) and returns where Type and Stops are: the region
 * #grd-gen-more under the Random section. Opening it twice leaves it open.
 */
async function openSettings(page) {
  const toggle = genOf(page).getByRole('button', { name: /^(More|Fewer) options$/ })
  if ((await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click()
  const extra = genOf(page).locator('#grd-gen-more')
  await expect(extra).toBeVisible()
  return extra
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

// ── 1 · More options constrain what Random makes ────────────────────────────

// The canvas names the type it draws ("Radial gradient preview").
const typeNow = (page) => page.evaluate(() => document.querySelector('.grd-canvas').getAttribute('aria-label').replace(' gradient preview', ''))

test.describe('Random filters at 1440px', () => {
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
      await pressRandom(page)
      expect(await typeNow(page), `Random ${i + 1}`).toBe('Radial')
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
      await pressRandom(page)
      expect(await typeNow(page), `Random ${i + 1}`).not.toBe('Radial')
    }
  })

  test('Stops = 4 or 5 (Shift-click): every Random has four or five stops', async ({ page }) => {
    await seed(page, { gradient: null })
    await open(page)
    const scope = await openSettings(page)
    await option(scope, 'Stops', 4).click()
    await option(scope, 'Stops', 5).click({ modifiers: ['Shift'] })
    for (let i = 0; i < 20; i++) {
      await pressRandom(page)
      const n = await stopRows(page).count()
      expect([4, 5], `Random ${i + 1} made ${n} stops`).toContain(n)
    }
  })

  test('Stops = 3 and Type = Conic hold when Colours is Palette too', async ({ page }) => {
    await seed(page, { gradient: null })
    await open(page)
    const scope = await openSettings(page)
    await option(scope, 'Stops', 3).click()
    await option(scope, 'Type', 'Conic').click()
    await randomFromPalette(page)
    for (let i = 0; i < 12; i++) {
      await pressRandom(page)
      expect(await stopRows(page).count(), `Random ${i + 1}`).toBe(3)
      expect(await typeNow(page)).toBe('Conic')
      for (const h of await hexes(page)) expect(THIRTEEN, `Random ${i + 1}: a palette colour`).toContain(h)
    }
  })

  test('the angle lock in Shape holds the angle through Random and Random from the palette; off, Random moves it', async ({ page }) => {
    await seed(page, { gradient: null })
    await open(page)
    const field = page.getByRole('spinbutton', { name: 'Gradient angle in degrees' })
    await field.fill('77')
    await field.press('Enter')
    await expect(field).toHaveValue('77')
    // Linear only, so the angle field is always drawn and always read.
    const scope = await openSettings(page)
    await option(scope, 'Type', 'Linear').click()
    // The label carries the value: "Keep the angle (77°) when you press Random".
    const keep = page.getByRole('button', { name: 'Keep the angle (77°) when you press Random' })
    await off(keep)
    await keep.click()
    const kept = page.getByRole('button', { name: /^The angle \(77°\) is kept/ })
    await on(kept)
    for (const fromPalette of [false, true]) {
      if (fromPalette) await randomFromPalette(page)
      for (let i = 0; i < 8; i++) {
        await pressRandom(page)
        await expect(field, `Random ${i + 1}${fromPalette ? ' from the palette' : ''}`).toHaveValue('77')
      }
    }
    await kept.click()
    await off(page.getByRole('button', { name: 'Keep the angle (77°) when you press Random' }))
    let moved = false
    for (let i = 0; i < 20 && !moved; i++) {
      await pressRandom(page)
      moved = (await field.inputValue()) !== '77'
    }
    expect(moved, 'with the angle lock off, twenty Randoms never moved the angle').toBe(true)
  })

  test('the locks sit beside the controls they keep: a colour lock per stop row, plus one each for the selected stop position, type, angle and interpolation', async ({ page }) => {
    await open(page)
    await expect(page.locator('.grd-row--angle .grd-lock')).toHaveCount(1)
    // + the selected stop's position, Type, Angle, Interpolation (Random draws it, so it can be kept).
    await expect(page.locator('.grd-lock')).toHaveCount((await stopRows(page).count()) + 4)
    await expect(page.getByRole('button', { name: /the interpolation/i }), 'one interpolation lock').toHaveCount(1)
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

  /**
   * The ramp as painted: the colours of the canvas's own CSS, in the order the browser
   * draws them. The stop array is NOT the ramp (the seed puts its stops out of order, and
   * Flip or a drag moves a position without moving the stop), so "first" and "last" are
   * read here, from the lowest and highest position, never from the list order.
   */
  const painted = (page) => page.evaluate(() => {
    const css = document.querySelector('.grd-canvas').style.background
    const hex = (c) => (c[0] === '#' ? c.toUpperCase()
      : `#${c.match(/\d+/g).slice(0, 3).map((n) => Number(n).toString(16).padStart(2, '0')).join('').toUpperCase()}`)
    return [...css.matchAll(/(#[0-9a-fA-F]{6}|rgb\([^)]*\))\s+(\d+(?:\.\d+)?)%/g)].map((m) => ({ hex: hex(m[1]), at: Number(m[2]) }))
  })

  // `lockIdx` is the list position of the locked stop (its colour is in SEED) and `rank` its
  // place on the ramp by position: SEED's positions 0, 60, 100, 30, 80 put the stops in the
  // order 1, 4, 2, 5, 3, so stop 1 is rank 0 (the first colour), stop 3 rank 4 (the last).
  async function rollsKeepSeam(page, lockIdx, rank) {
    const locked = SEED.stops[lockIdx].color
    await page.locator('.grd-stop-lock').nth(lockIdx).click()
    await expect(page.locator('.grd-stop-lock').nth(lockIdx)).toHaveAttribute('aria-pressed', 'true')
    for (const [label, fromPalette] of [['Random', false], ['Random from the palette', true]]) {
      if (fromPalette) await randomFromPalette(page)
      for (let i = 0; i < 10; i++) {
        await pressRandom(page)
        expect(await typeNow(page), `${label} ${i + 1}`).toBe('Conic')
        const h = await hexes(page)
        expect(h.length, 'the lock keeps all five stops').toBe(5)
        expect(h[lockIdx], `${label} ${i + 1}: the locked stop keeps its colour`).toBe(locked)
        const ramp = await painted(page)
        const colours = ramp.map((r) => r.hex)
        expect(ramp.length, `${label} ${i + 1}: the painted gradient has all five stops`).toBe(5)
        expect(ramp.map((r) => r.at), `${label} ${i + 1}: the painted stops run in position order`).toEqual([...ramp.map((r) => r.at)].sort((a, b) => a - b))
        expect(colours[rank], `${label} ${i + 1}: the locked colour keeps its place on the ramp (${colours})`).toBe(locked)
        expect(colours[colours.length - 1], `${label} ${i + 1}: the seam is open on ${colours}`).toBe(colours[0])
      }
    }
  }

  test('the first stop locked (lowest position): Random ends on the locked colour', async ({ page }) => {
    await rollsKeepSeam(page, 0, 0)
  })

  test('the last stop locked (highest position): Random starts on the locked colour', async ({ page }) => {
    await rollsKeepSeam(page, 2, 4)
  })

  // Stop 5 is last in the list but fourth on the ramp (80%), so it is not an end: the free ends
  // close the seam on each other and the locked colour stays where it is.
  test('a locked stop in the middle of the ramp: the free ends still meet, and the locked colour stays inside', async ({ page }) => {
    await rollsKeepSeam(page, 4, 3)
  })
})

// ── 2 · keys and Shift-click inside a filter group ──────────────────────────

test.describe('Type and Stops groups in More options', () => {
  test.use({ viewport: { width: 1440, height: 900 } })
  test.beforeEach(async ({ page }) => { watch(page, 'a keyboard user in More options') })

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

// Hue and Tone are radio groups: the chosen radio is the group's one Tab stop, and the
// arrows move focus and choose in one step (a radio group's own contract).
test.describe('Hue and Tone radio groups at 1440px', () => {
  test.use({ viewport: { width: 1440, height: 900 } })
  test.beforeEach(async ({ page }) => { watch(page, 'a keyboard user choosing Hue and Tone') })

  const GROUPS = [
    ['Hue', ['Any', 'Warm', 'Cool', 'Mono'], 'Tone'],
    ['Tone', ['Any', 'Light', 'Pastel', 'Vivid', 'Dark'], 'Colours'],
  ]
  /** [tabIndex, aria-checked] for each radio in the group. */
  const state = (page, name) => radios(page, name).evaluate((el) => [...el.querySelectorAll('[role="radio"]')]
    .map((r) => [r.tabIndex, r.getAttribute('aria-checked')]))
  const chosen = (page, name) => radios(page, name).evaluate((el) => [...el.querySelectorAll('[role="radio"]')]
    .filter((r) => r.getAttribute('aria-checked') === 'true').map((r) => r.textContent.trim()))

  for (const [name, labels, next] of GROUPS) {
    test(`${name}: the chosen radio is the one Tab stop, and arrows, Home and End move and choose`, async ({ page }) => {
      await seed(page, { gradient: null })
      await open(page)
      await expect(radios(page, name).getByRole('radio')).toHaveText(labels)
      const at = (n) => labels.map((_, i) => [i === n ? 0 : -1, i === n ? 'true' : 'false'])
      expect(await state(page, name), 'Any is chosen and the only Tab stop').toEqual(at(0))

      await radio(page, name, 'Any').focus()
      await page.keyboard.press('ArrowRight')
      await expect(radio(page, name, labels[1])).toBeFocused()
      expect(await state(page, name), 'the arrow chose the next radio and the Tab stop followed').toEqual(at(1))
      await page.keyboard.press('End')
      await expect(radio(page, name, labels[labels.length - 1])).toBeFocused()
      expect(await state(page, name)).toEqual(at(labels.length - 1))
      await page.keyboard.press('ArrowRight')
      await expect(radio(page, name, 'Any'), 'the arrows wrap').toBeFocused()
      expect(await chosen(page, name)).toEqual(['Any'])
      await page.keyboard.press('ArrowLeft')
      await expect(radio(page, name, labels[labels.length - 1])).toBeFocused()
      await page.keyboard.press('Home')
      await expect(radio(page, name, 'Any')).toBeFocused()
      await page.keyboard.press('ArrowDown')
      await expect(radio(page, name, labels[1])).toBeFocused()
      await page.keyboard.press('ArrowUp')
      await expect(radio(page, name, 'Any')).toBeFocused()
      expect(await chosen(page, name), 'always exactly one chosen').toEqual(['Any'])
    })

    test(`${name}: Tab enters on the chosen radio and leaves for the next group`, async ({ page }) => {
      await seed(page, { gradient: null })
      await open(page)
      await radio(page, name, labels[2]).click()
      await expect(radio(page, name, labels[2])).toHaveAttribute('aria-checked', 'true')
      // The Tab stop before Hue is the More options button in the section head; before Tone it is Hue's chosen radio (Any).
      const before = name === 'Hue' ? genOf(page).getByRole('button', { name: /^(More|Fewer) options$/ }) : radio(page, 'Hue', 'Any')
      await before.focus()
      await page.keyboard.press('Tab')
      await expect(radio(page, name, labels[2]), 'Tab lands on the chosen radio, not the first').toBeFocused()
      await page.keyboard.press('Tab')
      await expect(radio(page, next, 'Any'), `Tab leaves ${name} for ${next}`).toBeFocused()
      await page.keyboard.press('Shift+Tab')
      await expect(radio(page, name, labels[2]), 'and Shift+Tab comes back to the chosen radio').toBeFocused()
    })

    test(`${name}: Space and Enter choose the focused radio`, async ({ page }) => {
      await seed(page, { gradient: null })
      await open(page)
      await radio(page, name, labels[1]).focus()
      await expect(radio(page, name, labels[1]), 'focus alone chooses nothing').toHaveAttribute('aria-checked', 'false')
      await page.keyboard.press('Space')
      await expect(radio(page, name, labels[1])).toHaveAttribute('aria-checked', 'true')
      await radio(page, name, labels[2]).focus()
      await page.keyboard.press('Enter')
      await expect(radio(page, name, labels[2])).toHaveAttribute('aria-checked', 'true')
      expect(await chosen(page, name)).toEqual([labels[2]])
    })
  }
})

// ── 3 · reachable at 360 and 390, in the panel ──────────────────────────────

for (const w of [390, 360]) {
  test.describe(`Random filters at ${w}px (touch)`, () => {
    test.use({ viewport: { width: w, height: 800 }, hasTouch: true, isMobile: true })
    test.beforeEach(async ({ page }) => { watch(page, 'a phone user narrowing what Random makes') })

    test('the Random section is in the panel, and More options holds Type and Stops with the tap hint', async ({ page }) => {
      await open(page)
      await expect(genOf(page)).toBeVisible()
      for (const g of ['Hue', 'Tone', 'Colours']) await expect(radios(page, g)).toBeVisible()
      await expect(genOf(page).locator('#grd-gen-more'), 'closed until asked').toHaveCount(0)
      const scope = await openSettings(page)
      for (const g of ['Type', 'Stops']) await expect(group(scope, g)).toBeVisible()
      await expect(scope.getByRole('button', { name: 'Keep the angle' })).toHaveCount(0)
      await expect(scope.getByText('Tap to add or remove.')).toBeVisible()
    })

    test('the angle lock in Shape is a 44px touch target', async ({ page }) => {
      await open(page)
      const box = await page.getByRole('button', { name: /^Keep the angle \(\d+°\) when you press Random$/ }).boundingBox()
      expect(box.height, 'the angle lock is 44px tall').toBeGreaterThanOrEqual(44)
      expect(box.width, 'the angle lock is 44px wide').toBeGreaterThanOrEqual(44)
    })

    test('the Hue, Tone, Colours, Type and Stops options are 44px tall targets', async ({ page }) => {
      await open(page)
      await openSettings(page)
      const pills = await genOf(page).locator('.tl-pill').all()
      expect(pills.length, 'Hue 4 + Tone 5 + Colours 3 + Use 5 + Type 4 + Stops 5').toBe(26)
      for (const b of pills) {
        // rounded: a transform leaves sub-pixel heights such as 43.99997
        expect(Math.round((await b.boundingBox()).height), await b.textContent()).toBeGreaterThanOrEqual(44)
      }
    })

    test('a tap adds or removes (no Shift on a phone), and Type = Radial then governs Random', async ({ page }) => {
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
        await pressRandom(page)
        expect(await typeNow(page), `Random ${i + 1}`).toBe('Radial')
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
    // The sentence is the palette row's own status line; the Stops region does not repeat it.
    await expect(page.locator('#grd-paint-status')).toHaveText(/^3 selected stops set to Secondary 500\.\u200B?$/)
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
    const trigger = page.getByRole('button', { name: 'Pick stop 1 colour' })
    const picker = page.getByRole('dialog', { name: 'Pick stop 1 colour' })
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
    const trigger = page.getByRole('button', { name: 'Pick stop 1 colour' })
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

// ── 6 · Colours: Palette and Pick… ──────────────────────────────────────────
// The Colours row of the Random section says where Random's colours come from: Any
// (fresh colours), Palette (the whole palette) or Pick… (the ticked colours). Pick…
// opens a checklist inside the section; two or more ticks make the pool, and the row
// then reads "N picked". The ticks are kept in sessionStorage, in filters.pool, as
// upper-case hexes in the order they were ticked.

const A = THIRTEEN[3] // Neutral 500
const B = THIRTEEN[7] // Colour 8 500
const C = THIRTEEN[10] // Colour 11 500
const FILTER_KEY = 'vs-gradient-shuffle-filters'
const NEEDS = 'Needs a palette with two or more colours'
const anyRadio = (page) => radio(page, 'Colours', 'Any')
const paletteRadio = (page) => radio(page, 'Colours', 'Palette')
const pickRadio = (page) => radios(page, 'Colours').getByRole('radio', { name: /^(Pick…|\d+ picked)$/ })
const checklist = (page) => genOf(page).getByRole('group', { name: 'Colours to shuffle from' })
const tick = (page, name) => checklist(page).getByRole('checkbox', { name })
const ticked = (page) => checklist(page).getByRole('checkbox').evaluateAll((els) => els.filter((e) => e.checked).length)
const storedPool = (page) => page.evaluate((k) => JSON.parse(sessionStorage.getItem(k) || 'null')?.pool ?? [], FILTER_KEY)
const checked = (loc) => expect(loc).toHaveAttribute('aria-checked', 'true')
const unchecked = (loc) => expect(loc).toHaveAttribute('aria-checked', 'false')
const isNarrowed = (page) => randomBtn(page).evaluate((el) => el.classList.contains('is-narrowed'))

test.describe('chips and the Colours row at 1440px', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('a Shift-click on a chip only paints: no pick, no pool, and Random is still plain Random', async ({ page }) => {
    watch(page, 'someone who remembers picking Shuffle colours on the chips')
    await seed(page, { gradient: null })
    await open(page)
    await expect(page.getByText(/Shift-click to pick for Shuffle|Hold to pick for Shuffle/)).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Clear picks' })).toHaveCount(0)
    await chips(page).nth(3).click({ modifiers: ['Shift'] })
    await expect(chips(page).nth(3)).not.toHaveAttribute('aria-label', /picked for shuffle/)
    expect((await hexes(page))[0], 'a Shift-click is just a press').toBe(A)
    expect(await storedPool(page), 'and picks nothing for Random').toEqual([])
    await expect(randomBtn(page)).toHaveAttribute('title', 'Random gradient')
  })
})

test.describe('Colours: Pick… at 1440px', () => {
  test.use({ viewport: { width: 1440, height: 900 } })
  test.beforeEach(async ({ page }) => {
    watch(page, 'a designer rolling from a few chosen colours')
    await seed(page, { gradient: null })
    await open(page)
  })

  test('the row offers Any (chosen), Palette and Pick…, and no checklist until Pick… is pressed', async ({ page }) => {
    await expect(radios(page, 'Colours').getByRole('radio')).toHaveText(['Any', 'Palette', 'Pick…'])
    await checked(anyRadio(page))
    await unchecked(paletteRadio(page))
    await unchecked(pickRadio(page))
    await expect(checklist(page)).toHaveCount(0)
    await pickRadio(page).click()
    await checked(pickRadio(page))
    await expect(checklist(page)).toBeVisible()
    await expect(checklist(page).getByRole('checkbox')).toHaveCount(13)
    expect(await ticked(page), 'nothing is ticked yet').toBe(0)
    await expect(checklist(page)).toContainText('Tick two or more colours.')
  })

  test('ticking three colours makes Random use only those, and says so', async ({ page }) => {
    await pickRadio(page).click()
    await tick(page, 'Neutral 500').check()
    await expect(checklist(page)).toContainText('Tick two or more colours.')
    await expect(pickRadio(page), 'one tick is a mark, not yet a pool').toHaveText('Pick…')
    await tick(page, 'Colour 8 500').check()
    await tick(page, 'Colour 11 500').check()
    await expect(checklist(page)).toContainText('Random uses 3 colours.')
    await expect(pickRadio(page)).toHaveText('3 picked')
    expect(await storedPool(page)).toEqual([A, B, C])
    // A tick is not a press: no stop took a colour.
    expect(await hexes(page)).not.toContain(A)

    const seen = new Set()
    for (let i = 0; i < 15; i++) {
      await pressRandom(page)
      for (const h of await hexes(page)) { seen.add(h); expect([A, B, C], `Random ${i + 1}`).toContain(h) }
    }
    expect(seen.size, 'it really draws from the three, not one of them').toBeGreaterThan(1)
    await expect(page.locator('.toast.show')).toContainText('Random gradient from 3 picked colours')
  })

  test('Random reads narrowed once a colour source is chosen, and not while Colours is Any', async ({ page }) => {
    expect(await isNarrowed(page), 'Any').toBe(false)
    await paletteRadio(page).click()
    expect(await isNarrowed(page), 'Palette').toBe(true)
    await anyRadio(page).click()
    expect(await isNarrowed(page), 'back to Any').toBe(false)
    await pickRadio(page).click()
    await tick(page, 'Neutral 500').check()
    await tick(page, 'Colour 8 500').check()
    expect(await isNarrowed(page), 'two ticks').toBe(true)
  })

  test('Pick… with one ticked colour shows no narrowed dot, and with two it does', async ({ page }) => {
    // The dot is the Random icon's ::after: drawn (content "") only on `.is-narrowed`.
    const dot = () => randomBtn(page).evaluate((el) => getComputedStyle(el, '::after').content)
    expect(await dot(), 'POSITIVE CONTROL: nothing narrows yet, so no dot').not.toBe('""')
    await pickRadio(page).click()
    await tick(page, 'Neutral 500').check()
    await expect(pickRadio(page), 'one tick is a mark, not a pool').toHaveText('Pick…')
    expect(await isNarrowed(page), 'one tick').toBe(false)
    expect(await dot(), 'one tick: no dot').not.toBe('""')
    await tick(page, 'Colour 8 500').check()
    await expect(pickRadio(page)).toHaveText('2 picked')
    expect(await isNarrowed(page), 'two ticks').toBe(true)
    expect(await dot(), 'two ticks: the dot is drawn').toBe('""')
    await tick(page, 'Colour 8 500').uncheck()
    await expect(pickRadio(page)).toHaveText('Pick…')
    expect(await isNarrowed(page), 'back to one tick').toBe(false)
    expect(await dot(), 'back to one tick: the dot goes').not.toBe('""')
  })

  test('Colours: Palette draws every colour from the palette', async ({ page }) => {
    await paletteRadio(page).click()
    await checked(paletteRadio(page))
    await expect(checklist(page)).toHaveCount(0)
    const seen = new Set()
    for (let i = 0; i < 15; i++) {
      await pressRandom(page)
      for (const h of await hexes(page)) { seen.add(h); expect(THIRTEEN, `Random ${i + 1}`).toContain(h) }
    }
    expect(seen.size, 'it uses more than a couple of the thirteen').toBeGreaterThan(3)
    await expect(page.locator('.toast.show')).toContainText('Random gradient from your palette')
  })

  test('Colours: Any rolls fresh colours again, and closes the checklist', async ({ page }) => {
    await pickRadio(page).click()
    await tick(page, 'Neutral 500').check()
    await tick(page, 'Colour 8 500').check()
    await anyRadio(page).click()
    await checked(anyRadio(page))
    await expect(checklist(page)).toHaveCount(0)
    // The control: fresh colours are not the palette's, so across ten presses some hex is outside it.
    const outside = []
    for (let i = 0; i < 10; i++) {
      await pressRandom(page)
      outside.push(...(await hexes(page)).filter((h) => !THIRTEEN.includes(h)))
    }
    expect(outside.length, 'Random with Colours: Any makes colours outside the palette').toBeGreaterThan(0)
  })

  test('unticking down to one colour stops the narrowing: Random rolls fresh colours again', async ({ page }) => {
    await pickRadio(page).click()
    await tick(page, 'Neutral 500').check()
    await tick(page, 'Colour 8 500').check()
    await tick(page, 'Colour 8 500').uncheck()
    await expect(checklist(page)).toContainText('Tick two or more colours.')
    await expect(pickRadio(page)).toHaveText('Pick…')
    expect(await storedPool(page)).toEqual([A])
    const outside = []
    for (let i = 0; i < 10; i++) {
      await pressRandom(page)
      outside.push(...(await hexes(page)).filter((h) => !THIRTEEN.includes(h)))
    }
    expect(outside.length, 'one tick is not a pool').toBeGreaterThan(0)
  })

  test('pressing the "N picked" radio again closes the checklist, and pressing it once more opens it with the ticks kept', async ({ page }) => {
    await pickRadio(page).click()
    await tick(page, 'Neutral 500').check()
    await tick(page, 'Colour 8 500').check()
    await pickRadio(page).click()
    await expect(checklist(page)).toHaveCount(0)
    await pickRadio(page).click()
    await expect(checklist(page)).toBeVisible()
    await expect(tick(page, 'Neutral 500')).toBeChecked()
    await expect(tick(page, 'Colour 8 500')).toBeChecked()
  })

  test('the pool survives a reload', async ({ page }) => {
    await pickRadio(page).click()
    await tick(page, 'Neutral 500').check()
    await tick(page, 'Colour 8 500').check()
    await page.reload()
    await expect(panelOf(page)).toBeVisible()
    await expect(pickRadio(page)).toHaveText('2 picked')
    await checked(pickRadio(page))
    expect(await isNarrowed(page)).toBe(true)
    await pickRadio(page).click()
    await expect(tick(page, 'Neutral 500')).toBeChecked()
    await expect(tick(page, 'Colour 8 500')).toBeChecked()
    await expect(tick(page, 'Primary 500')).not.toBeChecked()
    expect(await storedPool(page)).toEqual([A, B])
  })
})

for (const [label, use] of [
  ['1440px', { viewport: { width: 1440, height: 900 } }],
  ['768px touch', { viewport: { width: 768, height: 1024 }, hasTouch: true, isMobile: true }],
  ['390px touch', { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }],
]) {
  test.describe(`Pick… opens the checklist at ${label}`, () => {
    test.use(use)
    test('the checklist sits inside the Random section, in view, with every palette colour on offer', async ({ page }) => {
      watch(page, 'someone choosing the colours Random draws from')
      await seed(page, { gradient: null })
      await open(page)
      await expect(checklist(page)).toHaveCount(0)
      await pickRadio(page).click()
      await expect(checklist(page)).toBeVisible()
      await expect(genOf(page).locator('.grd-pool'), 'the checklist is part of the Random section').toBeVisible()
      await expect(checklist(page).getByRole('checkbox')).toHaveCount(13)
    })
  })
}

test.describe('Colours: Pick… · picks the palette no longer holds', () => {
  test.use({ viewport: { width: 1440, height: 900 } })
  const GONE = '#123456' // a valid colour that is not in the palette

  test('ticking a colour keeps a stored pick the palette lacks, and unticking removes only that colour', async ({ page }) => {
    watch(page, 'someone whose saved pool names a colour that has left the palette')
    await page.addInitScript(([k, gone, a]) => {
      if (!sessionStorage.getItem(k)) sessionStorage.setItem(k, JSON.stringify({ types: ['Any'], counts: ['Any'], source: 'picked', pool: [a, gone] }))
    }, [FILTER_KEY, GONE, A])
    await seed(page, { gradient: null })
    await open(page)
    // POSITIVE CONTROL: the stored pool still has both before anything is touched.
    expect(await storedPool(page)).toEqual([A, GONE])
    await expect(pickRadio(page), 'one live pick is not yet a pool').toHaveText('Pick…')
    await pickRadio(page).click()
    await expect(checklist(page)).toBeVisible()
    await tick(page, 'Colour 8 500').check()
    expect(await storedPool(page), 'the stale pick is still stored beside the new one').toEqual([A, GONE, B])
    await expect(pickRadio(page)).toHaveText('2 picked')
    await tick(page, 'Colour 8 500').uncheck()
    expect(await storedPool(page), 'unticking takes out only the colour unticked').toEqual([A, GONE])
  })
})

test.describe('a filters entry saved by an earlier version', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('loads with Colours: Any and an empty pool, and keeps what it did hold', async ({ page }) => {
    watch(page, 'someone whose session was saved by the previous version')
    await page.addInitScript((k) => {
      if (!sessionStorage.getItem(k)) sessionStorage.setItem(k, JSON.stringify({ types: ['Radial'], counts: ['Any'], keepAngle: true }))
    }, FILTER_KEY)
    await seed(page, { gradient: null })
    await open(page)
    await checked(anyRadio(page))
    await expect(pickRadio(page)).toHaveText('Pick…')
    await expect(page.getByRole('button', { name: /^The angle \(\d+°\) is kept/ }), 'keepAngle: true became the angle lock').toHaveAttribute('aria-pressed', 'true')
    const scope = await openSettings(page)
    await on(option(scope, 'Type', 'Radial'))
    expect(await isNarrowed(page), 'narrowed by its type, not by a pool').toBe(true)
    expect(await storedPool(page)).toEqual([])
  })

  test('a pool holding junk or colours the palette does not have is ignored, not trusted', async ({ page }) => {
    watch(page, 'someone whose saved pool names a colour that is gone')
    await page.addInitScript((k) => {
      if (!sessionStorage.getItem(k)) sessionStorage.setItem(k, JSON.stringify({ types: ['Any'], counts: ['Any'], pool: ['#123456', 'red', 42, '#2f6bff'] }))
    }, FILTER_KEY)
    await seed(page, { gradient: null })
    await open(page)
    // '#2f6bff' is lower case, so it is dropped as unusable; '#123456' is valid but not in the palette.
    // Nothing narrows, and nothing is ticked when the checklist opens.
    expect(await isNarrowed(page)).toBe(false)
    await expect(randomBtn(page)).toHaveAttribute('title', 'Random gradient')
    await pickRadio(page).click()
    await expect(checklist(page)).toBeVisible()
    expect(await ticked(page), 'no junk is shown as a tick').toBe(0)
    expect(await storedPool(page), 'only the usable hex is kept').toEqual(['#123456'])
  })
})

test.describe('Colours without a full palette', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('with no palette the ten starter colours stand in, Palette is unavailable, and two ticks make Random use them', async ({ page }) => {
    watch(page, 'someone with no palette rolling from starter colours')
    await seed(page, { palette: [], gradient: null })
    await open(page)
    await expect(paletteRadio(page)).toHaveAttribute('aria-disabled', 'true')
    await expect(paletteRadio(page)).toHaveAccessibleDescription(NEEDS)
    await pickRadio(page).click()
    await expect(checklist(page).getByRole('checkbox')).toHaveCount(10)
    await tick(page, 'Starter blue').check()
    await tick(page, 'Starter paper').check()
    await expect(checklist(page)).toContainText('Random uses 2 colours.')
    await expect(pickRadio(page)).toHaveText('2 picked')
    const STARTERS = ['#2F6BFF', '#F7F7F4']
    for (let i = 0; i < 8; i++) {
      await pressRandom(page)
      for (const h of await hexes(page)) expect(STARTERS, `Random ${i + 1}`).toContain(h)
    }
  })

  test('with one palette colour, Palette is unavailable and says why', async ({ page }) => {
    watch(page, 'someone with a one-colour palette')
    await seed(page, { palette: [THIRTEEN[0]], gradient: null })
    await open(page)
    await expect(paletteRadio(page)).toHaveAttribute('aria-disabled', 'true')
    await expect(paletteRadio(page)).toHaveAccessibleDescription(NEEDS)
    // Playwright will not click an aria-disabled control, so the press is made in the page.
    await paletteRadio(page).evaluate((el) => el.click())
    await expect(page.locator('.toast.show')).toContainText(NEEDS)
    await unchecked(paletteRadio(page))
    await checked(anyRadio(page))
    expect(await isNarrowed(page)).toBe(false)
  })
})

test.describe('Colours: Pick… by touch at 390px', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

  test('ticks make the pool; rows are 44px; the chips only paint', async ({ page }) => {
    watch(page, 'a phone user picking colours for Random')
    await seed(page, { gradient: null })
    await open(page)
    await pickRadio(page).tap()
    await tick(page, 'Neutral 500').check()
    await tick(page, 'Colour 8 500').check()
    await expect(checklist(page)).toContainText('Random uses 2 colours.')
    const rows = await checklist(page).locator('.grd-pool-opt').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().height)))
    expect(Math.min(...rows), 'tick rows are at least 44px').toBeGreaterThanOrEqual(44)
    expect(await storedPool(page)).toEqual([A, B])
    // A long press on a chip marks nothing for Random; a tap sets the stop.
    // Touch draws five of the thirteen as chips, with a "+8 more" link after them.
    await expect(chips(page)).toHaveCount(5)
    await longPress(page, chips(page).nth(4))
    await expect(chips(page).nth(4)).not.toHaveAttribute('aria-label', /picked for shuffle/)
    await chips(page).nth(4).tap()
    expect((await hexes(page))[0], 'a tap sets the colour').toBe(THIRTEEN[4])
    expect(await storedPool(page), 'and the pool is as the checklist left it').toEqual([A, B])
  })
})

// ── 7 · none of it moves the page ───────────────────────────────────────────
// More options and the Pick… checklist are opened before the first mark: opening
// them is the person asking the section to grow, and everything after that must
// leave every height where it was.

const SHAPE = ['page', 'panel', 'main', 'gen', 'paint', 'window']
async function shapeOf(page) {
  return page.evaluate(() => {
    const h = (sel) => { const e = document.querySelector(sel); return e ? Math.round(e.getBoundingClientRect().height * 100) / 100 : null }
    return { page: document.documentElement.scrollHeight, panel: h('.tl-panel'), main: h('.tl-main'), gen: h('.grd-gen'), paint: h('.grd-paint'), window: h('.grd-stops') }
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

  test('filters, selecting, bulk edits, picks and Random change every height by 0px', async ({ page }) => {
    watch(page, 'a designer using every new control')
    await seed(page)
    await open(page)
    const scope = await openSettings(page)
    await pickRadio(page).click()
    await expect(checklist(page)).toBeVisible()
    const l = ledger(page)
    await l.mark('at rest, More options and the checklist open')

    await option(scope, 'Type', 'Radial').click(); await l.mark('Type = Radial')
    await option(scope, 'Stops', 4).click({ modifiers: ['Shift'] }); await l.mark('Stops = 4')
    await radio(page, 'Hue', 'Warm').click(); await l.mark('Hue = Warm')
    await radio(page, 'Tone', 'Vivid').click(); await l.mark('Tone = Vivid')
    await radio(page, 'Hue', 'Any').click(); await radio(page, 'Tone', 'Any').click(); await l.mark('Hue and Tone back to Any')
    await page.getByRole('button', { name: /^Keep the angle \(\d+°\) when you press Random$/ }).evaluate((el) => el.click()); await l.mark('angle lock on')

    await stopSelect(page, 1).click()
    await stopSelect(page, 2).click({ modifiers: ['Shift'] }); await l.mark('3 stops selected (head row shows N selected)')
    await chips(page).nth(1).click(); await l.mark('bulk colour')
    // A stop lock adds a line to the Stops filter ("Locked stops keep the count at 5.") while it is on, so the
    // section is measured again once the lock is off: the lock and the unlock together leave every height as it was.
    await page.locator('.grd-stop-lock').first().click()
    await expect(page.locator('.grd-stop-lock').first()).toHaveAttribute('aria-pressed', 'true')
    await page.locator('.grd-stop-lock').first().click(); await l.mark('bulk lock, then unlock')
    await page.keyboard.press('Control+A'); await l.mark('all selected')
    await page.keyboard.press('Escape'); await l.mark('selection cleared')

    await tick(page, 'Neutral 500').check(); await l.mark('one tick')
    await tick(page, 'Colour 8 500').check(); await l.mark('two ticks (the row reads 2 picked)')
    await pressRandom(page); await l.mark('Random from 2 picks')
    await stopSelect(page, 1).click(); await page.keyboard.press('Control+A')
    await page.getByRole('button', { name: /^Remove the \d selected stops$/ }).first().click(); await l.mark('bulk delete down to the floor')
    expect(l.count).toBe(16)
    expect(l.drift(), l.drift().join('\n')).toEqual([])
  })
})

test.describe('the page does not move at 390px (touch)', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' })

  test('filters, a long-press selection, chip picks and ticks change every height by 0px', async ({ page }) => {
    watch(page, 'a phone user using every new control')
    await seed(page)
    await open(page)
    const scope = await openSettings(page)
    await pickRadio(page).tap()
    await expect(checklist(page)).toBeVisible()
    const l = ledger(page)
    await l.mark('at rest, More options and the checklist open')

    await option(scope, 'Type', 'Radial').tap(); await l.mark('Type = Radial')
    await option(scope, 'Stops', 4).tap(); await l.mark('Stops = 4')
    await radio(page, 'Hue', 'Warm').tap(); await l.mark('Hue = Warm')
    await radio(page, 'Tone', 'Vivid').tap(); await l.mark('Tone = Vivid')

    await longPress(page, stopSelect(page, 2)); await l.mark('selection mode (Done in the head row)')
    await stopSelect(page, 4).tap(); await l.mark('two selected')
    await chips(page).nth(1).tap(); await l.mark('bulk colour')
    await page.locator('.grd-sel-clear').tap(); await l.mark('Done')

    await tick(page, 'Neutral 500').check(); await l.mark('one tick')
    await tick(page, 'Colour 8 500').check(); await l.mark('two ticks')
    expect(l.count).toBe(11)
    expect(l.drift(), l.drift().join('\n')).toEqual([])
  })
})