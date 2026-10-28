// /create/gradient: Available colours, the first section of the panel.
//
// It lists the palette's colours as round chips (one press sets the selected
// stop), the active colour's shades while the project's ramp is current, and
// the ten starter colours with a way to the Palette Builder when there is no
// palette. Each stop row then names its colour ("Primary 500", "Custom"), and the
// toolbar button is "Shuffle from palette" everywhere a person can meet it.
//
// Expected names are hand-checked from the spec (handover/specs/
// gradient-tool-overhaul-spec-2026-10-28.md §3.2, §3.3, §13), not read back from
// the code.
//
// MUTATIONS (each turns the tests named red):
//   drop `if (!guardEdit()) return` from pickColour   -> "a free account ... Pro modal"
//   render the shades block whatever the ramp         -> "only while the ramp is current"
//   pickColour stops setting the stop's colour        -> the "pressing a chip" tests
//   the row's aria-describedby dropped                -> "a stop row's accessible name ..."
//   one "From palette" left in a title or a label     -> "no visible or accessible From palette"
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

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
const NO_PALETTE_NOTE = 'No palette yet. Colours you build in Palette Builder show up here.'
const ONE_COLOUR_NOTE = 'Add a second colour in Palette Builder to shuffle from it.'

/** Seed the project the page reads: a palette, and optionally a ramp, an active index and a gradient. */
const seed = (page, { colors, tints, activeIdx = 0, gradient } = {}) => page.addInitScript((d) => {
  const design = { palette: { base: d.colors[0] || '#0051FF', harmony: 'auto', extraColors: [], activeIdx: d.activeIdx, colors: d.colors } }
  if (d.tints) design.tints = d.tints
  if (d.gradient) design.gradient = d.gradient
  localStorage.setItem('vs-current-design', JSON.stringify(design))
}, { colors, tints, activeIdx, gradient })

const current = (colors, idx = 0, ramp = RAMP) => ({ from: colors[idx], scale: ramp })

const section = (page) => page.getByRole('group', { name: 'Available colours' })
const chips = (page) => section(page).getByRole('button')
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
    await expect(page.locator('.grd-avail').getByRole('link', { name: 'Open Palette Builder' })).toHaveAttribute('href', '/create/palette')
    const starters = page.getByRole('group', { name: 'Starter colours' }).getByRole('button')
    await expect(starters).toHaveCount(10)
    expect((await names(starters))[0]).toBe('Starter blue, #2F6BFF')
    expect((await names(starters))[9]).toBe('Starter paper, #F7F7F4')
    await expect(page.locator('.grd-avail .grd-chip'), 'only the starters are drawn, no palette chips').toHaveCount(10)
    await expect(page.locator('.grd-shades'), 'no ramp, no shades line').toHaveCount(0)
    await expect(page.getByRole('button', { name: /^Shuffle from palette/ })).toHaveAttribute('aria-disabled', 'true')
  })

  test('with one colour: its chip, the note that a second is needed, and the way to the Palette Builder', async ({ page }) => {
    watch(page, 'someone with a one-colour palette')
    await seed(page, { colors: ['#0051FF'] })
    await open(page)
    await expect(chips(page)).toHaveCount(1)
    expect(await names(chips(page))).toEqual(['Primary 500, #0051FF'])
    await expect(page.locator('.grd-avail-note')).toHaveText(ONE_COLOUR_NOTE)
    await expect(page.locator('.grd-avail').getByRole('link', { name: 'Open Palette Builder' })).toHaveAttribute('href', '/create/palette')
    await expect(page.getByRole('group', { name: 'Starter colours' }), 'starters only stand in for no palette').toHaveCount(0)
    await expect(page.getByRole('button', { name: /^Shuffle from palette/ })).toHaveAccessibleDescription(NEEDS)
  })

  test('with two colours: two chips, no helper text, and Shuffle from palette is live', async ({ page }) => {
    watch(page, 'someone with a two-colour palette')
    await seed(page, { colors: ['#0051FF', '#FF5A1F'] })
    await open(page)
    expect(await names(chips(page))).toEqual(['Primary 500, #0051FF', 'Secondary 500, #FF5A1F'])
    await expect(page.locator('.grd-avail-note')).toHaveCount(0)
    await expect(page.locator('.grd-avail').getByRole('link')).toHaveCount(0)
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
    await expect(section(page).locator('[aria-pressed="true"]'), 'one palette chip is chosen').toHaveCount(1)
    await expect(page.locator('.grd-avail').getByRole('status')).toHaveText('Stop 1 set to Secondary 500')
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
    await expect(page.locator('.grd-avail').getByRole('status')).toHaveText('Stop 2 set to Primary 300')
    // Select stop 1 again: the ticked chip leaves, since stop 1 is not a palette colour.
    await stopSelect(page, 1).click()
    await expect(page.locator('.grd-avail [aria-pressed="true"]')).toHaveCount(0)
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
    await expect(page.locator('.grd-avail').getByRole('status'), 'nothing was announced for an edit that did not happen').toHaveText('')
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
