// /create/gradient: Available colours (v2), the first section of the panel.
//
// A chip press paints the ringed stop (the "target"), then the target moves to the
// next stop by position whose colour is not locked, so two presses make a whole
// gradient. The section shows what it is painting: a mini ramp with one dot button
// per stop, a head ("Painting stop 1 of 3") and a visible status line. With no
// palette, or one colour, it offers six starter pairs, the ten starter colours and
// a way to a saved project's colours. Each stop row names its colour ("Primary
// 500", "Custom"), and the toolbar button is "Shuffle from palette" everywhere a
// person can meet it.
//
// Expected names, copy and orders are hand-checked from the spec (handover/specs/
// gradient-generation-v2-2026-10-28.md §2 and §10, T-A1 to T-A8), not read back
// from the code.
//
// MUTATIONS (each turns the tests named red):
//   drop `if (!guardEdit()) return` from pickColour   -> "a free account ... Pro modal"
//   render the shades block whatever the ramp         -> "only while the ramp is current"
//   pickColour stops setting the stop's colour        -> the "pressing a chip" tests
//   the row's aria-describedby dropped                -> "a stop row's accessible name ..."
//   one "From palette" left in a title or a label     -> "no visible or accessible From palette"
//   MAX_CHIPS 13 -> 14 (or 99)                         -> "the chip cap" tests
//   pickColour drops its `setPickNote('')`             -> "pressing the same chip again announces again"
import { test, expect } from './base.js'
import { chooseMenuOption, go, signIn, watch } from './helpers.js'

const ROUTE = '/create/gradient'

// Thirteen distinct colours, the most the section shows.
const THIRTEEN = [
  '#2F6BFF', '#E0784E', '#3FAFA0', '#0B0C0E', '#F7F7F4', '#D9B93C', '#8B5CF0',
  '#52A069', '#E894AC', '#1B3FA8', '#7A7A7A', '#B0C4DE', '#CD5C5C',
]
const ROLE_NAMES = ['Primary', 'Secondary', 'Accent', 'Neutral', 'Surface', 'Highlight',
  'Colour 7', 'Colour 8', 'Colour 9', 'Colour 10', 'Colour 11', 'Colour 12', 'Colour 13']
// A ramp for THIRTEEN[0]: eleven steps, 50 to 950, the colour itself at 500.
const RAMP = [
  '#EEF3FF', '#D9E5FF', '#B8CEFF', '#8FB0FF', '#5F8BFF', '#2F6BFF',
  '#2556D1', '#1B41A3', '#142F78', '#0D1E4F', '#071230',
]
const STEPS = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950']
// The seed gradient's stops (Indigo Night), none of them in any palette here.
const SEED_STOPS = ['#0A0F2C', '#27348B', '#6E6BFF']

const NEEDS = 'Needs a palette with two or more colours'
const NO_PALETTE_NOTE = 'No palette yet. Start from a pair or a starter colour, or make a palette.'
const ONE_COLOUR_NOTE = 'Add a second colour in Palette Builder to shuffle from it.'
// The six starter pairs, name and both ends (spec §2.4).
const PAIRS = [
  ['Harbour night', '#0B1B3A', '#3D7BFF'], ['Ember', '#3A1238', '#F08A4B'], ['Sea glass', '#CFEFE6', '#6FB7C9'],
  ['Citrus', '#FFB23F', '#F0436A'], ['Fog', '#E9ECF2', '#7A8496'], ['Plum', '#2A0F3D', '#9C5BD9'],
]

/** Seed the project the page reads: a palette, and optionally a ramp, an active index and a gradient. */
const seed = (page, { colors, tints, activeIdx = 0, gradient } = {}) => page.addInitScript((d) => {
  const design = { palette: { base: d.colors[0] || '#0051FF', harmony: 'auto', extraColors: [], activeIdx: d.activeIdx, colors: d.colors } }
  if (d.tints) design.tints = d.tints
  if (d.gradient) design.gradient = d.gradient
  localStorage.setItem('vs-current-design', JSON.stringify(design))
}, { colors, tints, activeIdx, gradient })

const current = (colors, idx = 0, ramp = RAMP) => ({ from: colors[idx], scale: ramp })

const section = (page) => page.getByRole('group', { name: 'Available colours' })
// Chips only: the ramp's stop dots and the starter pairs are buttons too, and are not counted here.
const chips = (page) => section(page).locator('.grd-chip')
const pairs = (page) => section(page).locator('.grd-pair')
const dots = (page) => section(page).locator('.grd-ramp-dot')
const dot = (page, n) => section(page).locator(`.grd-ramp-dot[data-stop="${n - 1}"]`)
const statusLine = (page) => page.locator('#grd-avail-status')
const head = (page) => page.locator('.grd-avail-tip')
const lockBtn = (page, n) => page.locator('.grd-stop').nth(n - 1).locator('.grd-lock')
/** The status line's words. A repeat of the same sentence carries an invisible character so a screen reader says it again. */
const words = (text) => new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\u200B?$`)
/** The stop numbers (1-based) whose ramp dot is pressed: where the next press lands. */
const targetOf = (page) => page.evaluate(() => [...document.querySelectorAll('.grd-ramp-dot')]
  .filter((d) => d.getAttribute('aria-pressed') === 'true').map((d) => Number(d.dataset.stop) + 1))
const shadesGroup = (page, role = 'Primary') => page.getByRole('group', { name: `${role} shades` })
const chip = (page, label) => section(page).getByRole('button', { name: new RegExp(`^${label}, #`) })
const stopSelect = (page, n) => page.getByRole('button', { name: new RegExp(`^Select stop ${n}, #`) })
const roleOf = (page, n) => page.locator('.grd-stop').nth(n - 1).locator('.grd-stop-role')
const hexOf = (page, n) => page.locator('.grd-stop').nth(n - 1).locator('.grd-stop-hex')
const names = (loc) => loc.evaluateAll((els) => els.map((el) => el.getAttribute('aria-label')))

async function open(page) {
  await go(page, ROUTE)
  await expect(page.getByRole('heading', { level: 1, name: 'Gradient' })).toBeVisible()
  await expect(page.getByRole('complementary', { name: 'Gradient controls' })).toBeVisible()
}

test.describe('Available colours · the states', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('with no colours: the note, the way to the Palette Builder, and ten named starter colours', async ({ page }) => {
    watch(page, 'someone opening the gradient tool before making a palette')
    await seed(page, { colors: [] })
    await open(page)
    await expect(page.locator('.grd-avail-note')).toHaveText(NO_PALETTE_NOTE)
    await expect(page.locator('.grd-avail').getByRole('link', { name: 'Make a palette' })).toHaveAttribute('href', '/create/palette')
    // Pairs: six, each named for itself and both ends.
    const pairRow = section(page).getByRole('group', { name: 'Pairs' }).getByRole('button')
    await expect(pairRow).toHaveCount(6)
    expect(await names(pairRow)).toEqual(PAIRS.map(([n, l, r]) => `${n}, ${l} to ${r}`))
    // Colours: the ten starters.
    const starters = section(page).getByRole('group', { name: 'Colours' }).getByRole('button')
    await expect(starters).toHaveCount(10)
    expect((await names(starters))[0]).toBe('Starter blue, #2F6BFF')
    expect((await names(starters))[9]).toBe('Starter paper, #F7F7F4')
    await expect(chips(page), 'only the starters are drawn as chips, no palette chips').toHaveCount(10)
    await expect(section(page).getByRole('group', { name: 'Starter colours' }), 'the old group name is gone').toHaveCount(0)
    await expect(head(page)).toHaveText('Painting stop 1 of 3')
    await expect(statusLine(page), 'idle, the line says what a press will do').toHaveText('Press a colour to paint stop 1.')
    await expect(page.locator('.grd-shades'), 'no ramp, no shades line').toHaveCount(0)
    await expect(page.getByRole('button', { name: /^Shuffle from palette/ })).toHaveAttribute('aria-disabled', 'true')
  })

  test('with one colour: its chip, the note that a second is needed, and the way to the Palette Builder', async ({ page }) => {
    watch(page, 'someone with a one-colour palette')
    await seed(page, { colors: ['#0051FF'] })
    await open(page)
    await expect(chips(page), 'its one chip, and no starter colours standing in for a palette').toHaveCount(1)
    expect(await names(chips(page))).toEqual(['Primary 500, #0051FF'])
    await expect(page.locator('.grd-avail-note')).toHaveText(ONE_COLOUR_NOTE)
    await expect(page.locator('.grd-avail').getByRole('link', { name: 'Open Palette Builder' })).toHaveAttribute('href', '/create/palette')
    // The pairs are still useful with one colour.
    await expect(pairs(page)).toHaveCount(6)
    await expect(page.getByRole('button', { name: /^Shuffle from palette/ })).toHaveAccessibleDescription(NEEDS)
  })

  test('with two colours: two chips, no helper text, and Shuffle from palette is live', async ({ page }) => {
    watch(page, 'someone with a two-colour palette')
    await seed(page, { colors: ['#0051FF', '#FF5A1F'] })
    await open(page)
    expect(await names(chips(page))).toEqual(['Primary 500, #0051FF', 'Secondary 500, #FF5A1F'])
    await expect(page.locator('.grd-avail-note')).toHaveCount(0)
    await expect(page.locator('.grd-avail').getByRole('link', { name: /Palette Builder|Make a palette/ })).toHaveCount(0)
    await expect(pairs(page), 'a palette is enough: no starter pairs').toHaveCount(0)
    await expect(page.getByRole('button', { name: /^Shuffle from palette/ })).not.toHaveAttribute('aria-disabled', /.*/)
  })

  test('with thirteen colours: thirteen chips in palette order, each named for its role', async ({ page }) => {
    watch(page, 'someone with a full palette')
    await seed(page, { colors: THIRTEEN })
    await open(page)
    expect(await names(chips(page))).toEqual(THIRTEEN.map((hex, i) => `${ROLE_NAMES[i]} 500, ${hex}`))
    await expect(page.locator('.grd-avail-note')).toHaveCount(0)
  })

  test('a colour repeated in the palette gets one chip, named for where it first sits', async ({ page }) => {
    watch(page, 'someone whose palette repeats a colour')
    await seed(page, { colors: ['#2F6BFF', '#2f6bff', '#E0784E'] })
    await open(page)
    // Two chips for three entries. The role is the place in the palette, so the
    // third entry is the Accent, not the second chip's "Secondary".
    expect(await names(chips(page))).toEqual(['Primary 500, #2F6BFF', 'Accent 500, #E0784E'])
  })
})

test.describe('Available colours · the shades line shows only while the ramp is current', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('a current ramp: eleven chips named for the role and step, 50 to 950', async ({ page }) => {
    watch(page, 'someone whose project holds a ramp')
    await seed(page, { colors: THIRTEEN, tints: current(THIRTEEN) })
    await open(page)
    const shades = shadesGroup(page).getByRole('button')
    await expect(shades).toHaveCount(11)
    expect(await names(shades)).toEqual(RAMP.map((hex, k) => `Primary ${STEPS[k]}, ${hex}`))
  })

  test('a ramp made from the third colour, with the third colour active, says "Accent shades"', async ({ page }) => {
    watch(page, 'someone whose active colour is the third')
    const ramp = ['#EAF7F5', '#D2EFEB', '#A9E0D9', '#7FCFC5', '#5BBFB2', '#3FAFA0', '#33897E', '#276A61', '#1B4A44', '#102C29', '#081715']
    await seed(page, { colors: THIRTEEN, activeIdx: 2, tints: current(THIRTEEN, 2, ramp) })
    await open(page)
    const shades = shadesGroup(page, 'Accent').getByRole('button')
    await expect(shades).toHaveCount(11)
    expect((await names(shades))[3]).toBe('Accent 300, #7FCFC5')
    await expect(shadesGroup(page, 'Primary')).toHaveCount(0)
  })

  const NOT_CURRENT = {
    'a ramp made from some other colour than the active one': { tints: { from: THIRTEEN[1], scale: RAMP } },
    'a ramp that does not record the colour it was made from': { tints: { scale: RAMP } },
    'an empty ramp': { tints: { from: THIRTEEN[0], scale: [] } },
    'no ramp at all': {},
  }
  for (const [name, extra] of Object.entries(NOT_CURRENT)) {
    test(`${name}: no shades line, and the palette chips still show`, async ({ page }) => {
      watch(page, 'someone whose ramp is not current')
      await seed(page, { colors: THIRTEEN, ...extra })
      await open(page)
      // POSITIVE CONTROL: the section is drawn, so "no shades" is not "no section".
      await expect(chips(page)).toHaveCount(13)
      await expect(page.locator('.grd-shades')).toHaveCount(0)
      await expect(page.getByRole('group', { name: /shades$/ })).toHaveCount(0)
      // A shade of some other colour is not named: a stop on one reads Custom.
      await expect(roleOf(page, 1)).toHaveText('Custom')
    })
  }
})

test.describe('Available colours · pressing a chip', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('sets the selected stop, renames its row, ticks the chip and says so', async ({ page }) => {
    watch(page, 'a designer picking a palette colour for a stop')
    await seed(page, { colors: THIRTEEN, tints: current(THIRTEEN) })
    await open(page)
    await expect(hexOf(page, 1)).toHaveText(SEED_STOPS[0])
    await expect(roleOf(page, 1)).toHaveText('Custom')
    const secondary = chip(page, 'Secondary 500')
    await expect(secondary).toHaveAttribute('aria-pressed', 'false')

    await secondary.click()
    await expect(hexOf(page, 1), 'the selected stop took the colour').toHaveText('#E0784E')
    await expect(roleOf(page, 1)).toHaveText('Secondary 500')
    await expect(secondary).toHaveAttribute('aria-pressed', 'true')
    await expect(secondary.locator('svg'), 'the chosen chip carries a tick, not colour alone').toHaveCount(1)
    await expect(section(page).locator('.grd-chip[aria-pressed="true"]'), 'one palette chip is in the gradient').toHaveCount(1)
    await expect(statusLine(page)).toHaveText(words('Stop 1 set to Secondary 500. Next: stop 2.'))
    await expect(head(page), 'and the target moved on').toHaveText('Painting stop 2 of 3')
    expect(await targetOf(page)).toEqual([2])
    // The other stops are untouched.
    await expect(hexOf(page, 2)).toHaveText(SEED_STOPS[1])
    await expect(hexOf(page, 3)).toHaveText(SEED_STOPS[2])
    await expect(roleOf(page, 2)).toHaveText('Custom')
  })

  test('goes to whichever stop is selected, and a shade names its step', async ({ page }) => {
    watch(page, 'a designer picking a shade for the second stop')
    await seed(page, { colors: THIRTEEN, tints: current(THIRTEEN) })
    await open(page)
    await stopSelect(page, 2).click()
    await shadesGroup(page).getByRole('button', { name: /^Primary 300, #/ }).click()
    await expect(hexOf(page, 2)).toHaveText('#8FB0FF')
    await expect(roleOf(page, 2)).toHaveText('Primary 300')
    await expect(hexOf(page, 1), 'stop 1 was not the selected one').toHaveText(SEED_STOPS[0])
    await expect(statusLine(page)).toHaveText(words('Stop 2 set to Primary 300. Next: stop 3.'))
    // Select stop 1 again. The tick means "in this gradient", not "on the target
    // stop": Primary 300 stays ticked, and the ringed dot is the one that moved.
    await stopSelect(page, 1).click()
    const shade = shadesGroup(page).getByRole('button', { name: /^Primary 300, #/ })
    await expect(shade).toHaveAttribute('aria-pressed', 'true')
    await expect(shade).toHaveAccessibleName('Primary 300, #8FB0FF, in this gradient')
    await expect(section(page).locator('.grd-chip[aria-pressed="true"]')).toHaveCount(1)
    expect(await targetOf(page)).toEqual([1])
  })

  test('a keyboard press sets the stop and focus stays on the chip', async ({ page }) => {
    watch(page, 'a keyboard user picking a palette colour')
    await seed(page, { colors: THIRTEEN })
    await open(page)
    const accent = chip(page, 'Accent 500')
    await accent.focus()
    await page.keyboard.press('Enter')
    await expect(hexOf(page, 1)).toHaveText('#3FAFA0')
    await expect(roleOf(page, 1)).toHaveText('Accent 500')
    await expect(accent, 'focus stays on the chip that was pressed').toBeFocused()
  })

  test('the new colour reaches the code well', async ({ page }) => {
    watch(page, 'a developer copying a gradient built from the palette')
    await seed(page, { colors: THIRTEEN })
    await open(page)
    await chip(page, 'Highlight 500').click()
    await expect(page.locator('.grd-code-text')).toContainText('#D9B93C')
  })

  test('a free account on a gallery gradient meets the Pro modal, and the stop is left alone', async ({ page }) => {
    watch(page, 'a free designer pressing a chip on a gallery gradient')
    await seed(page, {
      colors: THIRTEEN,
      gradient: {
        source: 'gallery', type: 'linear', angle: 160, space: 'oklch',
        stops: SEED_STOPS.map((color, i) => ({ color, position: [0, 50, 100][i] })),
      },
    })
    await open(page)
    // POSITIVE CONTROL: the page is the locked one.
    await expect(hexOf(page, 1)).toHaveText(SEED_STOPS[0])
    await expect(page.getByText('Gallery gradient — free to preview & copy')).toBeVisible()
    await chip(page, 'Secondary 500').click()
    await expect(page.getByText('Editing gallery gradients is Pro')).toBeVisible()
    await expect(hexOf(page, 1), 'the free account did not get the edit').toHaveText(SEED_STOPS[0])
    await expect(statusLine(page), 'nothing was announced for an edit that did not happen').not.toContainText('set to')
    await expect(statusLine(page)).toHaveText('Press a colour to paint stop 1.')
    expect(await targetOf(page), 'and the target did not move on').toEqual([1])
  })
})

test.describe('Stop rows · role and shade', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('a stop row\'s accessible name stays "Select stop N, #HEX"; the role is its description', async ({ page }) => {
    watch(page, 'a screen reader user walking the stop rows')
    await seed(page, { colors: THIRTEEN })
    await open(page)
    await chip(page, 'Secondary 500').click()
    const row1 = stopSelect(page, 1)
    await expect(row1).toHaveAccessibleName('Select stop 1, #E0784E')
    await expect(row1).toHaveAccessibleDescription('Secondary 500')
    const row2 = stopSelect(page, 2)
    await expect(row2).toHaveAccessibleName('Select stop 2, #27348B')
    await expect(row2).toHaveAccessibleDescription('Custom')
  })

  test('a near miss of a palette colour reads Custom, not the colour it is close to', async ({ page }) => {
    watch(page, 'a designer typing a hex one step off a palette colour')
    await seed(page, { colors: THIRTEEN })
    await open(page)
    await chip(page, 'Primary 500').click()
    await expect(roleOf(page, 1)).toHaveText('Primary 500')
    // The press moved the target on to stop 2, and the hex field edits the target stop.
    await dot(page, 1).click()
    const hex = page.locator('.grd-hex').first()
    await hex.fill('#2F6BFE')
    await hex.press('Enter')
    await expect(hexOf(page, 1)).toHaveText('#2F6BFE')
    await expect(roleOf(page, 1)).toHaveText('Custom')
  })
})

// The rename: "From palette" is "Shuffle from palette" in every place a person can
// read or hear it. A lookbehind keeps the new name from counting as the old one.
const OLD_NAME = '(?<!Shuffle )from palette'
async function oldNameIn(page) {
  return page.evaluate((src) => {
    const re = new RegExp(src, 'i')
    const found = []
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const tag = n.parentElement?.tagName
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') continue
      if (re.test(n.textContent)) found.push(`text: ${n.textContent.trim().slice(0, 80)}`)
    }
    for (const el of document.body.querySelectorAll('*')) {
      for (const attr of ['aria-label', 'title', 'placeholder', 'alt']) {
        const v = el.getAttribute(attr)
        if (v && re.test(v)) found.push(`${attr}: ${v.slice(0, 80)}`)
      }
    }
    return found
  }, OLD_NAME)
}

test.describe('the rename · no "From palette" without "Shuffle"', () => {
  test('on a desktop toolbar, with a palette and without one', async ({ page }) => {
    watch(page, 'someone reading the toolbar')
    await page.setViewportSize({ width: 1440, height: 900 })
    await seed(page, { colors: [] })
    await open(page)
    // POSITIVE CONTROL: the new name is there to be found, and the probe can see the old one.
    await expect(page.getByRole('button', { name: 'Shuffle from palette' })).toBeVisible()
    expect(await oldNameIn(page), 'the old name').toEqual([])
    await page.evaluate(() => {
      const probe = document.createElement('span')
      probe.className = 'probe-old-name'
      probe.title = 'Build from palette'
      probe.textContent = 'From palette'
      document.body.append(probe)
    })
    expect((await oldNameIn(page)).length, 'the probe sees both the text and the title').toBe(2)
  })

  test('with a usable palette the button, its title and its sheet row all say Shuffle', async ({ page }) => {
    watch(page, 'someone shuffling from a palette')
    await page.setViewportSize({ width: 1440, height: 900 })
    await seed(page, { colors: THIRTEEN })
    await open(page)
    const button = page.getByRole('button', { name: 'Shuffle from palette' })
    await expect(button).toHaveAttribute('title', 'Build a random gradient from your current palette')
    expect(await oldNameIn(page)).toEqual([])
  })

  for (const width of [320, 390]) {
    test(`in the phone More sheet at ${width}px`, async ({ page }) => {
      watch(page, 'someone on a phone opening More')
      await page.setViewportSize({ width, height: 844 })
      await seed(page, { colors: [] })
      await open(page)
      await page.locator('[data-tool-toolbar]').getByRole('button', { name: 'More', exact: true }).click()
      const sheet = page.getByRole('dialog', { name: 'More' })
      await expect(sheet).toBeVisible()
      // POSITIVE CONTROL: the row is in the sheet under its new name.
      await expect(sheet.getByRole('button', { name: /^Shuffle from palette/ })).toHaveCount(1)
      expect(await oldNameIn(page), 'the old name').toEqual([])
    })
  }

  test('the Pro modal on a gallery gradient says "Shuffle from palette"', async ({ page }) => {
    watch(page, 'a free designer meeting the gallery gate')
    await page.setViewportSize({ width: 1440, height: 900 })
    await seed(page, {
      colors: THIRTEEN,
      gradient: {
        source: 'gallery', type: 'linear', angle: 160, space: 'oklch',
        stops: SEED_STOPS.map((color, i) => ({ color, position: [0, 50, 100][i] })),
      },
    })
    await open(page)
    await chip(page, 'Secondary 500').click()
    const modal = page.getByText('Editing gallery gradients is Pro')
    await expect(modal).toBeVisible()
    await expect(page.getByText(/Press Reset, Random or Shuffle from palette/)).toBeVisible()
    expect(await oldNameIn(page), 'the old name').toEqual([])
  })
})

// Touch: 44px targets and 56px rows (hasTouch + isMobile gives pointer: coarse in the
// test runner, but NOT after a fullPage screenshot, which resets the emulation: measure
// first, and screenshot only the viewport).
for (const [w, h] of [[768, 1024], [390, 844], [360, 780]]) {
  test.describe(`touch at ${w}px`, () => {
    test.use({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' })

    test('chips are 44px (shades 36px), the Palette Builder link and stop rows are 44px+, nothing runs past the screen', async ({ page }) => {
      watch(page, 'a designer on a touch screen')
      await seed(page, { colors: THIRTEEN, tints: current(THIRTEEN) })
      await open(page)
      expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches), 'the page is on the coarse-pointer rules').toBe(true)
      const m = await page.evaluate(() => {
        const sizes = (sel) => [...new Set([...document.querySelectorAll(sel)].map((e) => { const r = e.getBoundingClientRect(); return `${Math.round(r.width)}x${Math.round(r.height)}` }))]
        const avail = document.querySelector('.grd-avail').getBoundingClientRect()
        const out = [...document.querySelectorAll('.grd-avail .grd-chip')].filter((c) => { const r = c.getBoundingClientRect(); return r.left < avail.left - 0.5 || r.right > avail.right + 0.5 }).length
        return {
          palette: sizes('.grd-chips:not(.grd-chips--shades) .grd-chip'), shades: sizes('.grd-chips--shades .grd-chip'),
          select: sizes('.grd-stop-select'), row: sizes('.grd-stop'), out,
          sideways: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          roleCut: [...document.querySelectorAll('.grd-stop-role')].filter((e) => e.scrollWidth > e.clientWidth).length,
        }
      })
      expect(m.palette, 'palette chips').toEqual(['44x44'])
      expect(m.shades, 'shade chips').toEqual(['36x36'])
      expect(m.row, 'stop rows').toEqual([expect.stringMatching(/x56$/)])
      expect(m.select.every((s) => Number(s.split('x')[1]) >= 44), `stop select buttons ${m.select}`).toBe(true)
      expect(m.out, 'chips outside the section').toBe(0)
      expect(m.sideways, 'sideways scroll').toBeLessThanOrEqual(0)
      expect(m.roleCut, 'role labels cut short').toBe(0)
    })

    test('the starter colours and the Palette Builder link are 44px', async ({ page }) => {
      watch(page, 'a designer on a touch screen with no palette')
      await seed(page, { colors: [] })
      await open(page)
      const m = await page.evaluate(() => {
        const sz = (e) => { const r = e.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)] }
        return { chips: [...document.querySelectorAll('.grd-avail .grd-chip')].map(sz), link: sz(document.querySelector('.grd-avail-link')) }
      })
      expect(m.chips.length).toBe(10)
      expect(m.chips.every(([cw, ch]) => cw === 44 && ch === 44), JSON.stringify(m.chips)).toBe(true)
      expect(m.link[1], 'the link is at least 44px tall').toBeGreaterThanOrEqual(44)
    })
  })
}

// ── The chip cap ──
// Past thirteen colours the row shows twelve chips and a "+N more" link to the Palette
// Builder in the thirteenth place, so the section is never taller than a full thirteen.
// The heights are measured against a thirteen-colour page in the same browser, not a
// number written down here.
/** `n` distinct colours: the thirteen above, then more from a fixed recipe. */
function palette(n) {
  const out = [...THIRTEEN]
  for (let i = 0; out.length < n; i++) {
    const hex = '#' + [(37 * i + 20) % 256, (91 * i + 50) % 256, (53 * i + 120) % 256]
      .map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase()
    if (!out.includes(hex)) out.push(hex)
  }
  return out
}

/** Open the page with `colors` seeded and read what the section shows and how tall things are. */
async function cap(page, colors, phone = false) {
  await seed(page, { colors })
  await open(page)
  const group = section(page).getByRole('group', { name: 'Palette colours' })
  await expect(group.getByRole('button').first()).toBeVisible()
  const more = group.getByRole('link')
  const hasMore = (await more.count()) > 0
  const r = {
    names: await names(group.getByRole('button')),
    moreCount: await more.count(),
    moreName: hasMore ? await more.first().textContent() : null,
    moreHref: hasMore ? await more.first().getAttribute('href') : null,
    section: await page.evaluate(() => document.querySelector('.grd-avail').getBoundingClientRect().height),
    page: await page.evaluate(() => document.documentElement.scrollHeight),
  }
  // Last, since opening the phone's More sheet changes the page. On a phone the
  // button is a row in that sheet.
  let host = page
  if (phone) {
    await page.locator('[data-tool-toolbar]').getByRole('button', { name: 'More', exact: true }).click()
    host = page.getByRole('dialog', { name: 'More' })
    await expect(host).toBeVisible()
  }
  const shuffle = host.getByRole('button', { name: /^Shuffle from palette/ })
  await expect(shuffle).toHaveCount(1)
  r.shuffleDisabled = await shuffle.getAttribute('aria-disabled')
  return r
}

for (const [label, use, phone] of [
  ['1440px', { viewport: { width: 1440, height: 900 } }, false],
  ['390px touch', { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' }, true],
]) {
  test.describe(`Available colours · the chip cap at ${label}`, () => {
    test.use(use)

    test('thirteen colours show thirteen chips and no link (the control for the rest)', async ({ page }) => {
      watch(page, 'someone with exactly thirteen colours')
      const r = await cap(page, palette(13), phone)
      expect(r.names).toEqual(THIRTEEN.map((hex, i) => `${ROLE_NAMES[i]} 500, ${hex}`))
      expect(r.moreCount, 'thirteen fit, so no link').toBe(0)
    })

    for (const [total, hidden] of [[14, 2], [40, 28]]) {
      test(`${total} colours: twelve chips and "+${hidden} more" to the Palette Builder, in the room thirteen take`, async ({ page, context }) => {
        watch(page, `someone with ${total} palette colours`)
        const colours = palette(total)
        expect(new Set(colours).size, 'the fixture colours are distinct').toBe(total)

        // The thirteen-colour page is the yardstick, opened in the same browser.
        const base = await context.newPage()
        const thirteen = await cap(base, palette(13), phone)

        const r = await cap(page, colours, phone)
        expect(r.names, 'the first twelve colours, in palette order, each named for its role').toEqual(
          THIRTEEN.slice(0, 12).map((hex, i) => `${ROLE_NAMES[i]} 500, ${hex}`),
        )
        expect(r.moreCount, 'one link in the last place').toBe(1)
        expect(r.moreName, 'the link says how many are left').toMatch(new RegExp(`^\\+${hidden} more`))
        expect(r.moreName, 'and, for a screen reader, where it goes').toContain('colours in Palette Builder')
        expect(r.moreHref).toBe('/create/palette')
        // The thirteenth colour is one of the hidden ones: it is not drawn.
        expect(r.names.join()).not.toContain(colours[12])
        expect(r.section, 'the section is as tall as thirteen colours make it').toBe(thirteen.section)
        expect(r.page, 'the page is as tall as it is with thirteen').toBe(thirteen.page)
        expect(r.shuffleDisabled, 'the whole palette still feeds Shuffle from palette').toBeNull()
      })
    }
  })
}

test.describe('Available colours · announcing a pick', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('pressing the same chip again after the colour changed elsewhere announces again', async ({ page }) => {
    watch(page, 'a screen reader user picking the same palette colour twice')
    await seed(page, { colors: THIRTEEN })
    await open(page)
    const status = statusLine(page)
    const SENTENCE = 'Stop 1 set to Secondary 500. Next: stop 2.'
    // Every change to the live region's text, in order. A screen reader speaks a
    // region when its text changes; the line's idle text is aria-hidden, so it
    // counts as empty to a reader.
    await page.evaluate(() => {
      const el = document.getElementById('grd-avail-status')
      window.__said = []
      new MutationObserver(() => window.__said.push(el.textContent))
        .observe(el, { childList: true, characterData: true, subtree: true })
    })
    const log = () => page.evaluate(() => window.__said)

    const secondary = chip(page, 'Secondary 500')
    await secondary.click()
    await expect(status).toHaveText(words(SENTENCE))
    expect((await log()).map((t) => t.replace('​', '')), 'first press: said once').toEqual([SENTENCE])
    // No other live region on the page says the same press a second time.
    await expect(page.locator('[role="status"]').filter({ hasText: 'set to Secondary 500' })).toHaveCount(1)
    await expect(page.locator('.grd-avail [role="status"]'), 'Available colours has its one visible status line').toHaveCount(1)

    // The colour is changed another way: the line no longer describes the stops,
    // so it goes back to idle (hidden from a screen reader) instead of keeping a stale claim.
    // (The press moved the target on to stop 2, and the hex field edits the target stop.)
    await dot(page, 1).click()
    const hex = page.locator('.grd-hex').first()
    await hex.fill('#112233')
    await hex.press('Enter')
    await expect(hexOf(page, 1)).toHaveText('#112233')
    await expect(roleOf(page, 1)).toHaveText('Custom')
    await expect(status.locator('.grd-avail-idle'), 'the stale sentence is gone').toHaveAttribute('aria-hidden', 'true')
    await expect(status).not.toContainText('set to')

    await secondary.click()
    await expect(hexOf(page, 1)).toHaveText('#E0784E')
    await expect(status).toHaveText(words(SENTENCE))
    // Said, gone, said again: two spoken lines with the idle line between them.
    const entries = await log()
    const spoken = entries.filter((t) => t.startsWith('Stop 1 set to'))
    expect(spoken.length, 'the same words were spoken twice').toBe(2)
    expect(entries.slice(entries.indexOf(spoken[0]) + 1, entries.lastIndexOf(spoken[1])).some((t) => /^Press a colour to paint/.test(t)), 'with the hidden idle line between').toBe(true)
  })
})

// ── v2: paint in order, the ramp, the status line (spec §2, T-A1 to T-A4) ──
const FOUR_OUT_OF_ORDER = {
  // List order is not rail order: left to right is stops 1, 3, 2.
  source: 'own', type: 'Linear', angle: 160, space: 'oklch',
  stops: [{ color: '#0A0F2C', position: 0 }, { color: '#27348B', position: 100 }, { color: '#6E6BFF', position: 50 }],
}

test.describe('Available colours · paint in order', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('three presses paint stops 1, 2, 3 and the target comes back to stop 1', async ({ page }) => {
    watch(page, 'a designer building a gradient by pressing three palette colours')
    await seed(page, { colors: THIRTEEN })
    await open(page)
    await expect(head(page)).toHaveText('Painting stop 1 of 3')
    await expect(statusLine(page)).toHaveText('Press a colour to paint stop 1.')
    expect(await targetOf(page)).toEqual([1])

    await chip(page, 'Primary 500').click()
    await expect(hexOf(page, 1)).toHaveText('#2F6BFF')
    await expect(statusLine(page)).toHaveText(words('Stop 1 set to Primary 500. Next: stop 2.'))
    await expect(head(page)).toHaveText('Painting stop 2 of 3')

    await chip(page, 'Secondary 500').click()
    await expect(hexOf(page, 2)).toHaveText('#E0784E')
    await expect(statusLine(page)).toHaveText(words('Stop 2 set to Secondary 500. Next: stop 3.'))

    await chip(page, 'Accent 500').click()
    await expect(hexOf(page, 3)).toHaveText('#3FAFA0')
    await expect(statusLine(page)).toHaveText(words('Stop 3 set to Accent 500. Next: stop 1.'))
    await expect(head(page), 'back at the start').toHaveText('Painting stop 1 of 3')
    expect(await targetOf(page)).toEqual([1])
    await expect(stopSelect(page, 1), 'the stop list follows the target').toHaveAttribute('aria-pressed', 'true')
    // The tick means "in this gradient": all three are on at once.
    for (const label of ['Primary 500', 'Secondary 500', 'Accent 500']) {
      await expect(chip(page, label)).toHaveAttribute('aria-pressed', 'true')
    }
    await expect(section(page).locator('.grd-chip[aria-pressed="true"]'), 'and no others').toHaveCount(3)
  })

  test('the tick means in this gradient: a chip stays on when the target is somewhere else', async ({ page }) => {
    watch(page, 'a designer who pressed one colour and moved on')
    await seed(page, { colors: THIRTEEN })
    await open(page)
    const primary = chip(page, 'Primary 500')
    await expect(primary).toHaveAttribute('aria-pressed', 'false')
    await primary.click()
    // The target is stop 2 now, and stop 2 is not Primary, yet the chip is ticked.
    expect(await targetOf(page)).toEqual([2])
    await expect(primary).toHaveAttribute('aria-pressed', 'true')
    await expect(primary.locator('svg'), 'a tick, not colour alone').toHaveCount(1)
    await expect(primary).toHaveAccessibleName('Primary 500, #2F6BFF, in this gradient')
  })

  test('the target follows position along the rail, not the order of the list', async ({ page }) => {
    watch(page, 'a designer whose stops were dragged out of list order')
    await seed(page, { colors: THIRTEEN, gradient: FOUR_OUT_OF_ORDER })
    await open(page)
    await chip(page, 'Primary 500').click()
    // Stop 1 sits at 0%; the next one to its right is stop 3 (50%), not stop 2 (100%).
    await expect(statusLine(page)).toHaveText(words('Stop 1 set to Primary 500. Next: stop 3.'))
    expect(await targetOf(page)).toEqual([3])
    await chip(page, 'Secondary 500').click()
    await expect(statusLine(page)).toHaveText(words('Stop 3 set to Secondary 500. Next: stop 2.'))
    await chip(page, 'Accent 500').click()
    await expect(statusLine(page)).toHaveText(words('Stop 2 set to Accent 500. Next: stop 1.'))
    await expect(hexOf(page, 2)).toHaveText('#3FAFA0')
  })

  test('pressing the colour the target already has changes nothing and still moves on', async ({ page }) => {
    watch(page, 'a designer pressing through the palette in order')
    await seed(page, { colors: THIRTEEN })
    await open(page)
    await chip(page, 'Primary 500').click()
    await dot(page, 1).click()
    await chip(page, 'Primary 500').click()
    await expect(statusLine(page)).toHaveText(words('Stop 1 is already Primary 500.'))
    await expect(hexOf(page, 1)).toHaveText('#2F6BFF')
    await expect(hexOf(page, 2), 'stop 2 was not painted').toHaveText(SEED_STOPS[1])
    await expect(head(page), 'the press never stalls').toHaveText('Painting stop 2 of 3')
  })

  test('the target skips a locked stop, both ways round', async ({ page }) => {
    watch(page, 'a designer who locked the middle stop')
    await seed(page, { colors: THIRTEEN })
    await open(page)
    await lockBtn(page, 2).click()
    await dot(page, 1).click()
    await chip(page, 'Primary 500').click()
    await expect(statusLine(page)).toHaveText(words('Stop 1 set to Primary 500. Next: stop 3.'))
    expect(await targetOf(page)).toEqual([3])
    await chip(page, 'Secondary 500').click()
    await expect(statusLine(page)).toHaveText(words('Stop 3 set to Secondary 500. Next: stop 1.'))
    await expect(hexOf(page, 2), 'the locked stop kept its colour').toHaveText(SEED_STOPS[1])
  })

  test('with every colour locked the chips refuse, and say why', async ({ page }) => {
    watch(page, 'a designer who locked every stop')
    await seed(page, { colors: THIRTEEN })
    await open(page)
    for (const n of [1, 2, 3]) await lockBtn(page, n).click()
    await expect(head(page)).toHaveText('Every colour is locked')
    await expect(statusLine(page)).toHaveText('Every colour is locked. Unlock a stop to paint it.')
    const secondary = chip(page, 'Secondary 500')
    await expect(secondary).toHaveAttribute('aria-disabled', 'true')
    // aria-disabled is not `disabled`: the chip still takes a press, and refuses it.
    await secondary.click({ force: true })
    for (const n of [1, 2, 3]) await expect(hexOf(page, n)).toHaveText(SEED_STOPS[n - 1])
    await expect(statusLine(page)).toHaveText('Every colour is locked.')
    await expect(secondary, 'the reason is its description').toHaveAccessibleDescription('Every colour is locked.')
    // Unlock one and the chips work again.
    await lockBtn(page, 2).click()
    await expect(secondary).not.toHaveAttribute('aria-disabled', /.*/)
    await expect(head(page)).toHaveText(/^Painting stop \d of 3$/)
  })

  test('a press on a stop in a multi-selection paints them all and the target stays', async ({ page }) => {
    watch(page, 'a designer painting two selected stops')
    await seed(page, { colors: THIRTEEN })
    await open(page)
    await stopSelect(page, 1).click()
    await stopSelect(page, 3).click({ modifiers: ['Control'] })
    await expect(head(page)).toHaveText('Painting 2 selected stops')
    await chip(page, 'Highlight 500').click()
    await expect(hexOf(page, 1)).toHaveText('#D9B93C')
    await expect(hexOf(page, 3)).toHaveText('#D9B93C')
    await expect(statusLine(page)).toHaveText(words('2 selected stops set to Highlight 500.'))
    await expect(head(page), 'a selection stays a selection').toHaveText('Painting 2 selected stops')
  })
})

test.describe('Available colours · the mini ramp', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('one dot button per stop, named for its stop, colour and place; the target dot is pressed', async ({ page }) => {
    watch(page, 'a screen reader user meeting the ramp')
    await seed(page, { colors: THIRTEEN })
    await open(page)
    const toolbar = section(page).getByRole('toolbar', { name: 'Stop to paint' })
    await expect(toolbar.getByRole('button')).toHaveCount(3)
    expect(await names(dots(page))).toEqual([
      expect.stringMatching(/^Stop 1, #0A0F2C, 0%$/), expect.stringMatching(/^Stop 2, #27348B, \d+%$/), expect.stringMatching(/^Stop 3, #6E6BFF, 100%$/),
    ])
    expect(await targetOf(page)).toEqual([1])
    await expect(dot(page, 2)).toHaveAttribute('aria-pressed', 'false')
  })

  test('a dot press makes its stop the target without leaving the section, and the next chip paints it', async ({ page }) => {
    watch(page, 'a designer aiming at the last stop')
    await seed(page, { colors: THIRTEEN })
    await open(page)
    await dot(page, 3).click()
    expect(await targetOf(page)).toEqual([3])
    await expect(head(page)).toHaveText('Painting stop 3 of 3')
    await expect(statusLine(page)).toHaveText('Press a colour to paint stop 3.')
    await expect(stopSelect(page, 3), 'the stop list follows').toHaveAttribute('aria-pressed', 'true')
    await expect(dot(page, 3), 'focus stays in the ramp').toBeFocused()
    await chip(page, 'Accent 500').click()
    await expect(hexOf(page, 3)).toHaveText('#3FAFA0')
    await expect(hexOf(page, 1)).toHaveText(SEED_STOPS[0])
  })

  test('Enter and Space on a focused dot set the target', async ({ page }) => {
    watch(page, 'a keyboard user choosing a stop')
    await seed(page, { colors: THIRTEEN })
    await open(page)
    await dot(page, 3).focus()
    await page.keyboard.press('Enter')
    expect(await targetOf(page)).toEqual([3])
    await dot(page, 2).focus()
    await page.keyboard.press('Space')
    expect(await targetOf(page)).toEqual([2])
  })

  test('the keyboard path: Tab to the ramp, right arrow to stop 2, Tab to the chips, Enter paints stop 2', async ({ page }) => {
    watch(page, 'a keyboard user painting the second stop')
    await seed(page, { colors: THIRTEEN })
    await open(page)
    // A press on the section's heading puts the next Tab just after it.
    await page.locator('#grd-avail-label').click()
    await page.keyboard.press('Tab')
    await expect(dot(page, 1), 'the ramp has one tab stop: the target dot').toBeFocused()
    await page.keyboard.press('ArrowRight')
    await expect(dot(page, 2)).toBeFocused()
    expect(await targetOf(page), 'the arrow also aims the paint').toEqual([2])
    await page.keyboard.press('Tab')
    await expect(chips(page).first(), 'Tab leaves the ramp for the chips').toBeFocused()
    await page.keyboard.press('Enter')
    await expect(hexOf(page, 2)).toHaveText('#2F6BFF')
    await expect(hexOf(page, 1), 'stop 1 was not painted').toHaveText(SEED_STOPS[0])
    await expect(chips(page).first(), 'focus stays on the chip').toBeFocused()
  })

  test('Home and End go to the first and last stop', async ({ page }) => {
    watch(page, 'a keyboard user jumping along the ramp')
    await seed(page, { colors: THIRTEEN })
    await open(page)
    await dot(page, 1).focus()
    await page.keyboard.press('End')
    await expect(dot(page, 3)).toBeFocused()
    expect(await targetOf(page)).toEqual([3])
    await page.keyboard.press('Home')
    await expect(dot(page, 1)).toBeFocused()
    expect(await targetOf(page)).toEqual([1])
  })
})

test.describe('Available colours · the chips are one tab stop', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('one chip takes Tab, arrows move between them, and Tab back finds the last one used', async ({ page }) => {
    watch(page, 'a keyboard user crossing a long chip row')
    await seed(page, { colors: THIRTEEN, tints: current(THIRTEEN) })
    await open(page)
    // 13 palette chips and 11 shades, one tab stop between them.
    await expect(chips(page)).toHaveCount(24)
    await expect(section(page).locator('.grd-chip[tabindex="0"]')).toHaveCount(1)
    await expect(section(page).locator('.grd-chip[tabindex="-1"]')).toHaveCount(23)

    const focused = () => page.evaluate(() => document.activeElement?.getAttribute('aria-label') || null)
    await dot(page, 1).focus()
    await page.keyboard.press('Tab')
    await expect.poll(focused).toMatch(/^Primary 500, #/)
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowRight')
    await expect.poll(focused).toMatch(/^Accent 500, #/)
    await page.keyboard.press('End')
    await expect.poll(focused).toMatch(/^Primary 950, #/)
    await page.keyboard.press('Home')
    await expect.poll(focused).toMatch(/^Primary 500, #/)
    await page.keyboard.press('ArrowRight')
    await expect.poll(focused).toMatch(/^Secondary 500, #/)

    // One Tab leaves the row altogether, not on to the next chip.
    await page.keyboard.press('Tab')
    expect(await page.evaluate(() => !!document.activeElement?.closest('.grd-avail-zone'))).toBe(false)
    // And Shift+Tab comes back to the chip that was last used.
    await page.keyboard.press('Shift+Tab')
    await expect.poll(focused).toMatch(/^Secondary 500, #/)
  })
})

test.describe('Available colours · the status line is where the eye is', () => {
  for (const [w, h] of [[768, 1024], [390, 844]]) {
    test.describe(`at ${w}px, touch`, () => {
      test.use({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' })

      // Measure first and take no screenshot: a full-page or element screenshot in
      // a touch context turns pointer: coarse off for the page.
      test('a chip press changes the ramp dot and the status line in view, with no scroll', async ({ page }) => {
        watch(page, 'a designer on a phone painting stop 1')
        await seed(page, { colors: THIRTEEN })
        await open(page)
        expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches), 'on the coarse-pointer rules').toBe(true)
        const secondary = chip(page, 'Secondary 500')
        await secondary.scrollIntoViewIfNeeded()
        await expect(dot(page, 1)).toBeVisible()
        const read = () => page.evaluate(() => {
          const box = (sel) => document.querySelector(sel).getBoundingClientRect()
          const sec = box('.grd-avail')
          const dotEl = document.querySelector('.grd-ramp-dot[data-stop="0"] .grd-ramp-dot-vis')
          const status = box('#grd-avail-status')
          const inView = (r) => r.top >= 0 && r.bottom <= window.innerHeight
          const inSection = (r) => r.top >= sec.top - 0.5 && r.bottom <= sec.bottom + 0.5
          return {
            y: window.scrollY,
            dotColour: getComputedStyle(dotEl).backgroundColor,
            statusText: document.getElementById('grd-avail-status').textContent,
            dotIn: inView(dotEl.getBoundingClientRect()) && inSection(dotEl.getBoundingClientRect()),
            statusIn: inView(status) && inSection(status) && status.height > 0,
          }
        })
        const before = await read()
        expect(before.dotColour).toBe('rgb(10, 15, 44)')
        await secondary.tap()
        await expect(statusLine(page)).toHaveText(words('Stop 1 set to Secondary 500. Next: stop 2.'))
        // The dot's colour eases for 150ms (not under reduced motion, which this context asks for).
        await expect.poll(async () => (await read()).dotColour, 'the ramp\'s stop 1 took the colour').toBe('rgb(224, 120, 78)')
        const after = await read()
        expect(after.y, 'the page did not scroll').toBe(before.y)
        expect(after.dotIn, 'the dot is inside the section and on screen').toBe(true)
        expect(after.statusIn, 'the status line is inside the section and on screen').toBe(true)
        expect(after.statusText).toMatch(words('Stop 1 set to Secondary 500. Next: stop 2.'))
      })
    })
  }
})

// ── v2: no palette and one colour: starter pairs, From a project (spec §2.4, T-A5) ──
test.describe('Available colours · starter pairs', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('one press on a pair sets the first and last stop, and the target goes back to stop 1', async ({ page }) => {
    watch(page, 'someone with no palette starting from a pair')
    await seed(page, { colors: [] })
    await open(page)
    await dot(page, 3).click()
    expect(await targetOf(page)).toEqual([3])
    await section(page).getByRole('button', { name: 'Harbour night, #0B1B3A to #3D7BFF' }).click()
    await expect(hexOf(page, 1)).toHaveText('#0B1B3A')
    await expect(hexOf(page, 3)).toHaveText('#3D7BFF')
    const middle = (await hexOf(page, 2).textContent()).trim()
    expect(middle, 'the middle stop was re-mixed, not left as it was').not.toBe(SEED_STOPS[1])
    expect(new Set([middle, '#0B1B3A', '#3D7BFF']).size, 'and is a new colour, not either end').toBe(3)
    await expect(statusLine(page)).toHaveText(words('Stops set to Harbour night.'))
    expect(await targetOf(page)).toEqual([1])
    await expect(head(page)).toHaveText('Painting stop 1 of 3')
  })

  for (const [name, left, right] of PAIRS) {
    test(`${name} sets the ends to ${left} and ${right}`, async ({ page }) => {
      watch(page, `someone pressing the ${name} pair`)
      await seed(page, { colors: [] })
      await open(page)
      await section(page).getByRole('button', { name: `${name}, ${left} to ${right}` }).click()
      await expect(hexOf(page, 1)).toHaveText(left)
      await expect(hexOf(page, 3)).toHaveText(right)
    })
  }

  test('with every colour locked a pair is refused too', async ({ page }) => {
    watch(page, 'someone with locked stops pressing a pair')
    await seed(page, { colors: [] })
    await open(page)
    for (const n of [1, 2, 3]) await lockBtn(page, n).click()
    const pair = pairs(page).first()
    await expect(pair).toHaveAttribute('aria-disabled', 'true')
    await pair.click({ force: true })
    for (const n of [1, 2, 3]) await expect(hexOf(page, n)).toHaveText(SEED_STOPS[n - 1])
    await expect(statusLine(page)).toHaveText('Every colour is locked.')
  })

  test('a starter colour paints in order, like a palette chip', async ({ page }) => {
    watch(page, 'someone with no palette pressing starter colours')
    await seed(page, { colors: [] })
    await open(page)
    await section(page).getByRole('button', { name: /^Starter blue, #/ }).click()
    await expect(hexOf(page, 1)).toHaveText('#2F6BFF')
    await expect(statusLine(page)).toHaveText(words('Stop 1 set to Starter blue. Next: stop 2.'))
  })
})

test.describe('Available colours · From a project', () => {
  test.use({ viewport: { width: 1440, height: 900 } })
  const PROJECT = {
    id: 'proj-harbour', name: 'Harbour rebrand', createdAt: '2026-09-01T09:00:00.000Z', updatedAt: '2026-09-01T09:00:00.000Z',
    design: { palette: { base: '#0B1B3A', harmony: 'auto', extraColors: [], activeIdx: 0, colors: ['#0B1B3A', '#3D7BFF', '#CFEFE6'] } },
  }
  const fromSelect = (page) => section(page).getByRole('button', { name: /^From a project/ })

  test('signed in with a saved project: the select lists it and swaps the chip row', async ({ page }) => {
    watch(page, 'a signed-in designer with a saved palette and no current one')
    await signIn(page, { plan: 'free', projects: [PROJECT] })
    await seed(page, { colors: [] })
    await open(page)
    await expect(pairs(page)).toHaveCount(6)
    await expect(fromSelect(page)).toBeVisible()
    await chooseMenuOption(page, fromSelect(page), { label: 'Harbour rebrand' })
    const row = section(page).getByRole('group', { name: 'Colours from Harbour rebrand' })
    await expect(row.getByRole('button')).toHaveCount(3)
    expect(await names(row.getByRole('button'))).toEqual([
      'Harbour rebrand colour 1, #0B1B3A', 'Harbour rebrand colour 2, #3D7BFF', 'Harbour rebrand colour 3, #CFEFE6',
    ])
    await expect(pairs(page), 'the pairs row gave its place to the project colours').toHaveCount(0)
    await expect(section(page).getByRole('group', { name: 'Colours', exact: true })).toHaveCount(0)
    await row.getByRole('button').nth(1).click()
    await expect(hexOf(page, 1)).toHaveText('#3D7BFF')
    await expect(statusLine(page)).toHaveText(words('Stop 1 set to Harbour rebrand colour 2. Next: stop 2.'))
  })

  test('signed out there is no select, and the pairs and starter colours are all there is', async ({ page }) => {
    watch(page, 'a signed-out visitor with no palette')
    await seed(page, { colors: [] })
    await open(page)
    await expect(pairs(page)).toHaveCount(6)
    await expect(section(page).getByRole('button', { name: /From a project/ })).toHaveCount(0)
  })

  test('signed in with no saved palette there is no select either', async ({ page }) => {
    watch(page, 'a new signed-in account')
    await signIn(page, { plan: 'free', projects: 0 })
    await seed(page, { colors: [] })
    await open(page)
    await expect(pairs(page)).toHaveCount(6)
    await expect(section(page).getByRole('button', { name: /From a project/ })).toHaveCount(0)
  })
})

test.describe('Available colours · the old Shuffle tip is gone', () => {
  test.use({ viewport: { width: 1440, height: 900 } })
  test('nothing says "Shift-click to pick" or "Hold to pick for Shuffle"', async ({ page }) => {
    watch(page, 'someone looking for the pool on the chips')
    await seed(page, { colors: THIRTEEN })
    await open(page)
    // POSITIVE CONTROL: the head is drawn and says what the section is doing instead.
    await expect(head(page)).toHaveText('Painting stop 1 of 3')
    await expect(page.getByText(/Shift-click to pick for Shuffle|Hold to pick for Shuffle/)).toHaveCount(0)
    expect(await page.evaluate(() => [...document.querySelectorAll('[title],[aria-label]')]
      .filter((e) => /pick for Shuffle|picked for shuffle/i.test(`${e.getAttribute('title')} ${e.getAttribute('aria-label')}`)).length)).toBe(0)
  })
})

// At 360px on touch, twelve stops must not squeeze the rows below 56px. The grid
// `.grd-stop` keeps `flex: 0 0 var(--grd-row)` for this: without it the 4px padding at
// <=360px lets the rows shrink to their content (52px) in the fixed-height stop window.
test.describe('touch at 360px, twelve stops', () => {
  test.use({ viewport: { width: 360, height: 780 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' })
  test('every stop row stays 56px tall', async ({ page }) => {
    watch(page, 'a designer with twelve stops on a small phone')
    await seed(page, { colors: THIRTEEN })
    await open(page)
    while ((await page.locator('.grd-stop').count()) < 12) await page.getByRole('button', { name: 'Add a stop', exact: true }).click()
    const heights = await page.locator('.grd-stop').evaluateAll((els) => [...new Set(els.map((e) => Math.round(e.getBoundingClientRect().height)))])
    expect(heights, 'stop row heights at twelve stops').toEqual([56])
  })
})
