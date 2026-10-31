// /create/gradient: the palette row (`.grd-paint`) inside Stops.
//
// A chip press paints the highlighted stop (the "target"), then the target moves to
// the next stop by position whose colour is not locked, so two presses make a whole
// gradient. The row's one status line says which stop a press paints, and after a
// press what it did. The Colour source menu picks the current palette, the starter
// colours or a saved project; with fewer than two palette colours the starters stand
// in beside a "Make a palette" link. The row draws at most nine slots at a fine
// pointer (six on touch): a longer list shows one slot fewer and a "+N more" link.
// With exactly one palette colour the row is that colour's chip then eight starters (a
// starter with the same hex is dropped). The palette chips and the shade chips are one
// roving tab stop: Left, Right, Home and End cross both groups. With every colour
// locked the status line reads "Every colour is locked"; any lock change clears a
// stale pick sentence. Each stop row names its colour ("Primary 500", "Custom").
//
// Expected names, copy and orders are hand-checked, not read back from the code.
//
// MUTATIONS (each turns the tests named red):
//   drop `if (!guardEdit()) return` from pickColour   -> "a free account ... Pro modal"
//   render the shades block whatever the ramp         -> "only while the ramp is current"
//   pickColour stops setting the stop's colour        -> the "pressing a chip" tests
//   the row's aria-describedby dropped                -> "a stop row's accessible name ..."
//   MAX_CHIPS 9 -> 10 (or 99)                          -> "the chip cap" tests
//   pickColour: next = activeStop (no advance)         -> "three presses paint ...", "target follows position", "skips a locked stop"
//   useRoving: every item tabIndex 0                   -> "one chip takes Tab", "the shades join the palette chips"
//   chipsRef back on the palette group only             -> "the shades join the palette chips"
//   allColoursLocked returns false                     -> "with every colour locked the chips refuse"
//   aria-describedby='grd-paint-locked' dropped        -> "with every colour locked the chips refuse"
//   paintKey drops the lock flags                       -> "a lock change clears a stale pick sentence"
//   starterRow keeps the starter with the palette's hex -> "a starter with the palette colour's hex is dropped"
//   a project's colours not offered in the Colour source menu -> "From a project"
import { test, expect } from './base.js'
import { chooseMenuOption, go, signIn, watch } from './helpers.js'

const ROUTE = '/create/gradient'

// Thirteen distinct colours, the most the row's palette tests use.
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

/** Seed the project the page reads: a palette, and optionally a ramp, an active index and a gradient. */
const seed = (page, { colors, tints, activeIdx = 0, gradient } = {}) => page.addInitScript((d) => {
  const design = { palette: { base: d.colors[0] || '#0051FF', harmony: 'auto', extraColors: [], activeIdx: d.activeIdx, colors: d.colors } }
  if (d.tints) design.tints = d.tints
  if (d.gradient) design.gradient = d.gradient
  localStorage.setItem('vs-current-design', JSON.stringify(design))
}, { colors, tints, activeIdx, gradient })

const current = (colors, idx = 0, ramp = RAMP) => ({ from: colors[idx], scale: ramp })

const row = (page) => page.locator('.grd-paint')
const chips = (page) => row(page).locator('.grd-chip')
const paletteChips = (page) => row(page).locator('.grd-chips:not(.grd-chips--shades) .grd-chip')
const moreLink = (page) => row(page).locator('.grd-chips-more')
const statusLine = (page) => page.locator('#grd-paint-status')
const lockBtn = (page, n) => page.locator('.grd-stop').nth(n - 1).locator('.grd-lock')
/** The status line's words. A repeat of the same sentence carries an invisible character so a screen reader says it again. */
const words = (text) => new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\u200B?$`)
/** The stop numbers (1-based) that are highlighted: where the next press lands. */
const targetOf = (page) => page.evaluate(() => [...document.querySelectorAll('.grd-stop-select')]
  .map((b, i) => (b.getAttribute('aria-pressed') === 'true' ? i + 1 : 0)).filter(Boolean))
const shadesGroup = (page, role = 'Primary') => page.getByRole('group', { name: `${role} shades` })
const chip = (page, label) => row(page).getByRole('button', { name: new RegExp(`^${label}, #`) })
const stopSelect = (page, n) => page.getByRole('button', { name: new RegExp(`^Select stop ${n}, #`) })
const roleOf = (page, n) => page.locator('.grd-stop').nth(n - 1).locator('.grd-stop-role')
const hexOf = (page, n) => page.locator('.grd-stop').nth(n - 1).locator('.grd-stop-hex')
const names = (loc) => loc.evaluateAll((els) => els.map((el) => el.getAttribute('aria-label')))
const sourceMenu = (page) => page.getByRole('button', { name: 'Colour source' })

async function open(page) {
  await go(page, ROUTE)
  await expect(page.getByRole('heading', { level: 1, name: 'Gradient' })).toBeVisible()
  await expect(page.getByRole('complementary', { name: 'Gradient controls' })).toBeVisible()
}

/** `n` distinct colours: the thirteen above, then more from a fixed recipe. */
function palette(n) {
  const out = [...THIRTEEN]
  for (let i = 0; out.length < n; i++) {
    const hex = '#' + [(37 * i + 20) % 256, (91 * i + 50) % 256, (53 * i + 120) % 256]
      .map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase()
    if (!out.includes(hex)) out.push(hex)
  }
  return out.slice(0, n)
}

const STARTER_NAMES = ['Starter blue', 'Starter navy', 'Starter violet', 'Starter pink', 'Starter orange', 'Starter gold', 'Starter teal', 'Starter green']

test.describe('Palette row · the states', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('with no colours: eight named starters, "+2 more", the way to make a palette, and Colours: Palette inert', async ({ page }) => {
    watch(page, 'someone opening the gradient tool before making a palette')
    await seed(page, { colors: [] })
    await open(page)
    await expect(row(page).getByRole('link', { name: 'Make a palette' })).toHaveAttribute('href', '/create/palette')
    await expect(sourceMenu(page)).toContainText('Starter colours')
    const starters = row(page).getByRole('group', { name: 'Palette colours' }).locator('.grd-chip')
    await expect(starters).toHaveCount(8)
    const labels = await names(starters)
    expect(labels[0]).toBe('Starter blue, #2F6BFF')
    expect(labels.map((l) => l.split(',')[0])).toEqual(STARTER_NAMES)
    await expect(moreLink(page)).toContainText('+2')
    await expect(moreLink(page)).toHaveAttribute('href', '/create/palette')
    await expect(statusLine(page), 'idle, the line says which stop a press paints').toHaveText('Paints stop 1')
    await expect(page.locator('.grd-shades'), 'no ramp, no shades line').toHaveCount(0)
    const paletteChoice = page.getByRole('radiogroup', { name: 'Colours' }).getByRole('radio', { name: 'Palette', exact: true })
    await expect(paletteChoice).toHaveAttribute('aria-disabled', 'true')
    await expect(paletteChoice).toHaveAccessibleDescription(NEEDS)
  })

  test('with one colour: its chip leads, then eight starters, beside the way to make a palette', async ({ page }) => {
    watch(page, 'someone with a one-colour palette')
    await seed(page, { colors: ['#0051FF'] })
    await open(page)
    // The palette's one colour, then the first eight starters: nine chips, so no "+N more".
    await expect(paletteChips(page)).toHaveCount(9)
    const labels = await names(paletteChips(page))
    expect(labels[0]).toBe('Primary 500, #0051FF')
    expect(labels.slice(1).map((l) => l.split(',')[0])).toEqual(STARTER_NAMES)
    await expect(moreLink(page)).toHaveCount(0)
    await expect(row(page).getByRole('link', { name: 'Make a palette' })).toHaveAttribute('href', '/create/palette')
    const paletteChoice = page.getByRole('radiogroup', { name: 'Colours' }).getByRole('radio', { name: 'Palette', exact: true })
    await expect(paletteChoice).toHaveAccessibleDescription(NEEDS)
  })

  test('with one colour: a starter with the palette colour\'s hex is dropped, and the next starter fills the row', async ({ page }) => {
    watch(page, 'someone whose one colour is also a starter')
    await seed(page, { colors: ['#2f6bff'] })
    await open(page)
    // Starter blue is #2F6BFF (the hex matches whatever the case), so that colour shows once, as the
    // palette's "Primary 500", and Starter ink comes in as the eighth starter.
    await expect(paletteChips(page)).toHaveCount(9)
    expect(await names(paletteChips(page))).toEqual([
      'Primary 500, #2F6BFF', 'Starter navy, #1B3FA8', 'Starter violet, #8B5CF0', 'Starter pink, #E894AC',
      'Starter orange, #E0784E', 'Starter gold, #D9B93C', 'Starter teal, #3FAFA0', 'Starter green, #52A069', 'Starter ink, #0B0C0E',
    ])
  })

  test('with two colours: two chips, no helper link, and Colours: Palette is live', async ({ page }) => {
    watch(page, 'someone with a two-colour palette')
    await seed(page, { colors: ['#0051FF', '#FF5A1F'] })
    await open(page)
    expect(await names(chips(page))).toEqual(['Primary 500, #0051FF', 'Secondary 500, #FF5A1F'])
    await expect(row(page).getByRole('link')).toHaveCount(0)
    await expect(sourceMenu(page)).toContainText('Current palette')
    await expect(page.getByRole('radiogroup', { name: 'Colours' }).getByRole('radio', { name: 'Palette', exact: true })).not.toHaveAttribute('aria-disabled', /.*/)
  })

  test('with thirteen colours: eight chips in palette order, each named for its role, and "+5 more"', async ({ page }) => {
    watch(page, 'someone with a full palette')
    await seed(page, { colors: THIRTEEN })
    await open(page)
    expect(await names(paletteChips(page))).toEqual(THIRTEEN.slice(0, 8).map((hex, i) => `${ROLE_NAMES[i]} 500, ${hex}`))
    await expect(moreLink(page)).toContainText('+5')
    await expect(moreLink(page)).toContainText('colours in Palette Builder')
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

test.describe('Palette row · the shades line shows only while the ramp is current', () => {
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
      // POSITIVE CONTROL: the row is drawn, so "no shades" is not "no row".
      await expect(paletteChips(page)).toHaveCount(8)
      await expect(page.locator('.grd-shades')).toHaveCount(0)
      await expect(page.getByRole('group', { name: /shades$/ })).toHaveCount(0)
      // A shade of some other colour is not named: a stop on one reads Custom.
      await expect(roleOf(page, 1)).toHaveText('Custom')
    })
  }
})

test.describe('Palette row · pressing a chip', () => {
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
    await expect(row(page).locator('.grd-chip[aria-pressed="true"]'), 'one palette chip is in the gradient').toHaveCount(1)
    await expect(statusLine(page)).toHaveText(words('Stop 1 set to Secondary 500. Next: stop 2.'))
    expect(await targetOf(page), 'and the target moved on').toEqual([2])
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
    // The tick means "in this gradient", not "on the target stop".
    await stopSelect(page, 1).click()
    const shade = shadesGroup(page).getByRole('button', { name: /^Primary 300, #/ })
    await expect(shade).toHaveAttribute('aria-pressed', 'true')
    await expect(shade).toHaveAccessibleName('Primary 300, #8FB0FF, in this gradient')
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
    await expect(statusLine(page)).toHaveText('Paints stop 1')
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
    await stopSelect(page, 1).click()
    const hex = page.locator('.grd-hex').first()
    await hex.fill('#2F6BFE')
    await hex.press('Enter')
    await expect(hexOf(page, 1)).toHaveText('#2F6BFE')
    await expect(roleOf(page, 1)).toHaveText('Custom')
  })
})

// Touch: 44px targets and 56px rows (hasTouch + isMobile gives pointer: coarse in the
// test runner, but NOT after a fullPage screenshot, which resets the emulation: measure
// first, and screenshot only the viewport).
for (const [w, h] of [[768, 1024], [390, 844], [360, 780]]) {
  test.describe(`touch at ${w}px`, () => {
    test.use({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' })

    test('chips and shades are 44px, stop rows 56px, nothing runs past the screen', async ({ page }) => {
      watch(page, 'a designer on a touch screen')
      await seed(page, { colors: THIRTEEN, tints: current(THIRTEEN) })
      await open(page)
      expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches), 'the page is on the coarse-pointer rules').toBe(true)
      const m = await page.evaluate(() => {
        const sizes = (sel) => [...new Set([...document.querySelectorAll(sel)].map((e) => { const r = e.getBoundingClientRect(); return `${Math.round(r.width)}x${Math.round(r.height)}` }))]
        const paint = document.querySelector('.grd-paint').getBoundingClientRect()
        const out = [...document.querySelectorAll('.grd-paint .grd-chip')].filter((c) => { const r = c.getBoundingClientRect(); return r.left < paint.left - 0.5 || r.right > paint.right + 0.5 }).length
        return {
          palette: sizes('.grd-chips:not(.grd-chips--shades) .grd-chip'), shades: sizes('.grd-chips--shades .grd-chip'),
          count: document.querySelectorAll('.grd-chips:not(.grd-chips--shades) .grd-chip').length,
          select: sizes('.grd-stop-select'), row: sizes('.grd-stop'), out,
          sideways: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          roleCut: [...document.querySelectorAll('.grd-stop-role')].filter((e) => e.scrollWidth > e.clientWidth).length,
        }
      })
      expect(m.palette, 'palette chips').toEqual(['44x44'])
      expect(m.count, 'five chips and a +N link fill the six touch slots').toBe(5)
      expect(m.shades, 'shade chips (eleven of them, all 44px)').toEqual(['44x44'])
      expect(m.row, 'stop rows').toEqual([expect.stringMatching(/x56$/)])
      expect(m.select.every((s) => Number(s.split('x')[1]) >= 44), `stop select buttons ${m.select}`).toBe(true)
      expect(m.out, 'chips outside the row').toBe(0)
      expect(m.sideways, 'sideways scroll').toBeLessThanOrEqual(0)
      expect(m.roleCut, 'role labels cut short').toBe(0)
    })

    test('the starter colours are 44px and the Make a palette link keeps a 44px hit area', async ({ page }) => {
      watch(page, 'a designer on a touch screen with no palette')
      await seed(page, { colors: [] })
      await open(page)
      expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches), 'the page is on the coarse-pointer rules').toBe(true)
      const m = await page.evaluate(() => {
        const sz = (e) => { const r = e.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)] }
        return { chips: [...document.querySelectorAll('.grd-paint .grd-chip')].map(sz), link: sz(document.querySelector('.grd-paint-link')) }
      })
      expect(m.chips.length).toBe(5)
      expect(m.chips.every(([cw, ch]) => cw === 44 && ch === 44), JSON.stringify(m.chips)).toBe(true)
      expect(m.link[1], 'the link is at least 44px tall').toBeGreaterThanOrEqual(44)
    })
  })
}

// ── The chip cap ──
// A list longer than the row's slots shows one chip fewer and a "+N more" link to the
// Palette Builder in the last slot, so the row is never taller than a full one.
// The heights are measured against a thirteen-colour page in the same browser.
async function cap(page, colors) {
  await seed(page, { colors })
  await open(page)
  await expect(paletteChips(page).first()).toBeVisible()
  const more = moreLink(page)
  return {
    names: await names(paletteChips(page)),
    moreCount: await more.count(),
    moreName: (await more.count()) ? await more.first().textContent() : null,
    moreHref: (await more.count()) ? await more.first().getAttribute('href') : null,
    row: await page.evaluate(() => document.querySelector('.grd-paint').getBoundingClientRect().height),
    page: await page.evaluate(() => document.documentElement.scrollHeight),
    paletteRadio: await page.getByRole('radiogroup', { name: 'Colours' }).getByRole('radio', { name: 'Palette', exact: true }).getAttribute('aria-disabled'),
  }
}

for (const [label, use, slots] of [
  ['1440px', { viewport: { width: 1440, height: 900 } }, 9],
  ['390px touch', { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' }, 6],
]) {
  test.describe(`Palette row · the chip cap at ${label}`, () => {
    test.use(use)

    test(`${slots} colours fill ${slots} slots with no link (the control for the rest)`, async ({ page }) => {
      watch(page, `someone with exactly ${slots} colours`)
      const r = await cap(page, palette(slots))
      expect(r.names).toEqual(palette(slots).map((hex, i) => `${ROLE_NAMES[i]} 500, ${hex}`))
      expect(r.moreCount, 'they fit, so no link').toBe(0)
    })

    for (const total of [13, 14, 40]) {
      test(`${total} colours: ${slots - 1} chips and "+${total - (slots - 1)} more" to the Palette Builder, in the room a full row takes`, async ({ page, context }) => {
        watch(page, `someone with ${total} palette colours`)
        const colours = palette(total)
        expect(new Set(colours).size, 'the fixture colours are distinct').toBe(total)
        const base = await context.newPage()
        const full = await cap(base, palette(slots))

        const r = await cap(page, colours)
        expect(r.names, 'the first colours, in palette order, each named for its role').toEqual(
          colours.slice(0, slots - 1).map((hex, i) => `${ROLE_NAMES[i] || `Colour ${i + 1}`} 500, ${hex}`),
        )
        expect(r.moreCount, 'one link in the last place').toBe(1)
        expect(r.moreName, 'the link says how many are left').toMatch(new RegExp(`^\\+${total - (slots - 1)}`))
        expect(r.moreName, 'and, for a screen reader, where it goes').toContain('colours in Palette Builder')
        expect(r.moreHref).toBe('/create/palette')
        expect(r.names.join()).not.toContain(colours[slots - 1])
        expect(r.row, 'the row is as tall as a full one').toBe(full.row)
        expect(r.page, 'the page is as tall as it is with a full row').toBe(full.page)
        expect(r.paletteRadio, 'the whole palette still feeds Colours: Palette').toBeNull()
      })
    }
  })
}

test.describe('Palette row · announcing a pick', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('pressing the same chip again after the colour changed elsewhere announces again', async ({ page }) => {
    watch(page, 'a screen reader user picking the same palette colour twice')
    await seed(page, { colors: THIRTEEN })
    await open(page)
    const status = statusLine(page)
    const SENTENCE = 'Stop 1 set to Secondary 500. Next: stop 2.'
    // Every change to the live region's text, in order. A screen reader speaks a region when its text changes.
    await page.evaluate(() => {
      const el = document.getElementById('grd-paint-status')
      window.__said = []
      new MutationObserver(() => window.__said.push(el.textContent))
        .observe(el, { childList: true, characterData: true, subtree: true })
    })
    const log = () => page.evaluate(() => window.__said)

    const secondary = chip(page, 'Secondary 500')
    await secondary.click()
    await expect(status).toHaveText(words(SENTENCE))
    expect((await log()).map((t) => t.replace('​', '')), 'first press: said once').toEqual([SENTENCE])
    await expect(page.locator('[role="status"]').filter({ hasText: 'set to Secondary 500' }), 'no other live region repeats it').toHaveCount(1)
    await expect(page.locator('.grd-paint [role="status"]'), 'the row has its one visible status line').toHaveCount(1)

    // The colour is changed another way: the line no longer describes the stops,
    // so it goes back to saying what a press will do.
    await stopSelect(page, 1).click()
    const hex = page.locator('.grd-hex').first()
    await hex.fill('#112233')
    await hex.press('Enter')
    await expect(hexOf(page, 1)).toHaveText('#112233')
    await expect(roleOf(page, 1)).toHaveText('Custom')
    await expect(status).toHaveText('Paints stop 1')

    await secondary.click()
    await expect(hexOf(page, 1)).toHaveText('#E0784E')
    await expect(status).toHaveText(words(SENTENCE))
    const entries = await log()
    const spoken = entries.filter((t) => t.startsWith('Stop 1 set to'))
    expect(spoken.length, 'the same words were spoken twice').toBe(2)
    expect(entries.slice(entries.indexOf(spoken[0]) + 1, entries.lastIndexOf(spoken[1])).some((t) => /^Paints stop/.test(t)), 'with the idle line between').toBe(true)
  })
})

const FOUR_OUT_OF_ORDER = {
  // List order is not rail order: left to right is stops 1, 3, 2.
  source: 'own', type: 'Linear', angle: 160, space: 'oklch',
  stops: [{ color: '#0A0F2C', position: 0 }, { color: '#27348B', position: 100 }, { color: '#6E6BFF', position: 50 }],
}

test.describe('Palette row · paint in order', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('three presses paint stops 1, 2, 3 and the target comes back to stop 1', async ({ page }) => {
    watch(page, 'a designer building a gradient by pressing three palette colours')
    await seed(page, { colors: THIRTEEN })
    await open(page)
    await expect(statusLine(page)).toHaveText('Paints stop 1')
    expect(await targetOf(page)).toEqual([1])

    await chip(page, 'Primary 500').click()
    await expect(hexOf(page, 1)).toHaveText('#2F6BFF')
    await expect(statusLine(page)).toHaveText(words('Stop 1 set to Primary 500. Next: stop 2.'))
    await chip(page, 'Secondary 500').click()
    await expect(hexOf(page, 2)).toHaveText('#E0784E')
    await expect(statusLine(page)).toHaveText(words('Stop 2 set to Secondary 500. Next: stop 3.'))
    await chip(page, 'Accent 500').click()
    await expect(hexOf(page, 3)).toHaveText('#3FAFA0')
    await expect(statusLine(page)).toHaveText(words('Stop 3 set to Accent 500. Next: stop 1.'))
    expect(await targetOf(page), 'back at the start').toEqual([1])
    for (const label of ['Primary 500', 'Secondary 500', 'Accent 500']) {
      await expect(chip(page, label)).toHaveAttribute('aria-pressed', 'true')
    }
    await expect(row(page).locator('.grd-chip[aria-pressed="true"]'), 'and no others').toHaveCount(3)
  })

  test('the tick means in this gradient: a chip stays on when the target is somewhere else', async ({ page }) => {
    watch(page, 'a designer who pressed one colour and moved on')
    await seed(page, { colors: THIRTEEN })
    await open(page)
    const primary = chip(page, 'Primary 500')
    await expect(primary).toHaveAttribute('aria-pressed', 'false')
    await primary.click()
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
    await stopSelect(page, 1).click()
    await chip(page, 'Primary 500').click()
    await expect(statusLine(page)).toHaveText(words('Stop 1 is already Primary 500.'))
    await expect(hexOf(page, 1)).toHaveText('#2F6BFF')
    await expect(hexOf(page, 2), 'stop 2 was not painted').toHaveText(SEED_STOPS[1])
    expect(await targetOf(page), 'the press never stalls').toEqual([2])
  })

  test('the target skips a locked stop, both ways round', async ({ page }) => {
    watch(page, 'a designer who locked the middle stop')
    await seed(page, { colors: THIRTEEN })
    await open(page)
    await lockBtn(page, 2).click()
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
    await expect(statusLine(page)).toHaveText('Every colour is locked')
    const secondary = chip(page, 'Secondary 500')
    await expect(secondary).toHaveAttribute('aria-disabled', 'true')
    // The reason is the chip's description before any press: a screen reader on a chip is told why it is inert.
    await expect(secondary).toHaveAttribute('aria-describedby', 'grd-paint-locked')
    await expect(page.locator('#grd-paint-locked'), 'the description is outside the live region').toHaveText('Every colour is locked.')
    expect(await page.evaluate(() => document.getElementById('grd-paint-locked').closest('[aria-live], [role="status"]')), 'and is not announced on its own').toBeNull()
    await expect(secondary).toHaveAccessibleDescription('Every colour is locked.')
    // aria-disabled is not `disabled`: the chip still takes a press, and refuses it.
    await secondary.click({ force: true })
    for (const n of [1, 2, 3]) await expect(hexOf(page, n)).toHaveText(SEED_STOPS[n - 1])
    await expect(statusLine(page)).toHaveText(words('Every colour is locked.'))
    // Unlock one and the chips work again, the description goes with the reason, and
    // the refusal sentence goes too: the line says where a press lands, not "locked".
    await lockBtn(page, 2).click()
    await expect(secondary).not.toHaveAttribute('aria-disabled', /.*/)
    await expect(secondary).not.toHaveAttribute('aria-describedby', /.*/)
    await expect(page.locator('#grd-paint-locked')).toHaveCount(0)
    await expect(statusLine(page)).toHaveText(/^Paints stop \d+$/)
  })

  test('a lock change clears a stale pick sentence', async ({ page }) => {
    watch(page, 'a designer who locks a stop after painting one')
    await seed(page, { colors: THIRTEEN })
    await open(page)
    await chip(page, 'Primary 500').click()
    await expect(statusLine(page)).toHaveText(words('Stop 1 set to Primary 500. Next: stop 2.'))
    // Locking stop 3 changes no colour and no target, only the locks.
    await lockBtn(page, 3).click()
    await expect(statusLine(page), 'the sentence about the old locks is gone').toHaveText('Paints stop 2')
    expect(await targetOf(page), 'and the target did not move').toEqual([2])
    // The same on the way back: a press, then unlocking the stop.
    await chip(page, 'Secondary 500').click()
    await expect(statusLine(page)).toHaveText(words('Stop 2 set to Secondary 500. Next: stop 1.'))
    await lockBtn(page, 3).click()
    await expect(statusLine(page)).toHaveText('Paints stop 1')
  })

  test('a press with several stops selected paints them all and the selection stays', async ({ page }) => {
    watch(page, 'a designer painting two selected stops')
    await seed(page, { colors: THIRTEEN })
    await open(page)
    await stopSelect(page, 1).click()
    await stopSelect(page, 3).click({ modifiers: ['Control'] })
    await expect(statusLine(page)).toHaveText('Paints 2 selected stops')
    await chip(page, 'Highlight 500').click()
    await expect(hexOf(page, 1)).toHaveText('#D9B93C')
    await expect(hexOf(page, 3)).toHaveText('#D9B93C')
    await expect(statusLine(page)).toHaveText(words('2 selected stops set to Highlight 500.'))
    expect(await targetOf(page), 'a selection stays a selection').toEqual([1, 3])
  })
})

test.describe('Palette row · the chips are one tab stop', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  const focused = (page) => page.evaluate(() => document.activeElement?.getAttribute('aria-label') || null)

  test('one chip takes Tab, arrows move between them, and Tab back finds the last one used', async ({ page }) => {
    watch(page, 'a keyboard user crossing a long chip row')
    // The 8 palette chips and the 11 shades are one row of buttons with one at tabindex 0.
    await seed(page, { colors: THIRTEEN, tints: current(THIRTEEN) })
    await open(page)
    await expect(chips(page)).toHaveCount(19)
    await expect(chips(page).and(page.locator('[tabindex="0"]'))).toHaveCount(1)
    await expect(chips(page).and(page.locator('[tabindex="-1"]'))).toHaveCount(18)
    await expect(paletteChips(page).first(), 'with nothing used yet, the first chip is the stop').toHaveAttribute('tabindex', '0')

    await chips(page).first().focus()
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowRight')
    await expect.poll(() => focused(page)).toMatch(/^Accent 500, #/)
    await page.keyboard.press('End')
    await expect.poll(() => focused(page)).toBe('Primary 950, #071230')
    await page.keyboard.press('Home')
    await expect.poll(() => focused(page)).toMatch(/^Primary 500, #/)
    await page.keyboard.press('ArrowRight')
    await expect.poll(() => focused(page)).toMatch(/^Secondary 500, #/)

    // One Tab goes past the palette chips (to the +N link), not on to the next chip or a shade.
    await page.keyboard.press('Tab')
    await expect(moreLink(page)).toBeFocused()
    // And Shift+Tab comes back to the chip that was last used.
    await page.keyboard.press('Shift+Tab')
    await expect.poll(() => focused(page)).toMatch(/^Secondary 500, #/)
  })

  test('the shades join the palette chips in the same single tab stop', async ({ page }) => {
    watch(page, 'a keyboard user crossing palette chips and shades')
    await seed(page, { colors: THIRTEEN, tints: current(THIRTEEN) })
    await open(page)
    // 8 palette chips and 11 shades: nineteen buttons, exactly one of them in the tab order.
    await expect(chips(page)).toHaveCount(19)
    await expect(chips(page).and(page.locator('[tabindex="0"]'))).toHaveCount(1)
    await expect(chips(page).and(page.locator('[tabindex="-1"]'))).toHaveCount(18)

    // The arrows run on from the last palette chip into the first shade, and back.
    await paletteChips(page).last().focus()
    await expect.poll(() => focused(page)).toMatch(/^Colour 8 500, #/)
    await page.keyboard.press('ArrowRight')
    await expect.poll(() => focused(page)).toBe('Primary 50, #EEF3FF')
    await page.keyboard.press('ArrowLeft')
    await expect.poll(() => focused(page)).toMatch(/^Colour 8 500, #/)
    // End is the last shade and Home is the first palette chip, whichever group has focus.
    await page.keyboard.press('End')
    await expect.poll(() => focused(page)).toBe('Primary 950, #071230')
    await page.keyboard.press('Home')
    await expect.poll(() => focused(page)).toBe('Primary 500, #2F6BFF')
    await page.keyboard.press('End')
    await expect.poll(() => focused(page)).toBe('Primary 950, #071230')

    // The tab stop follows focus: only the shade last used is at tabindex 0.
    await expect(chips(page).and(page.locator('[tabindex="0"]'))).toHaveCount(1)
    await expect(shadesGroup(page).getByRole('button', { name: /^Primary 950, / })).toHaveAttribute('tabindex', '0')
    // One Tab from a shade leaves the row, and Shift+Tab comes back to that shade.
    await page.keyboard.press('Tab')
    expect(await page.evaluate(() => !!document.activeElement?.closest('.grd-paint'))).toBe(false)
    await page.keyboard.press('Shift+Tab')
    await expect.poll(() => focused(page)).toBe('Primary 950, #071230')
  })
})

// The status line is one fixed-height row at every width, so a sentence that is long
// or short moves nothing; it is never wider than the row.
const statusBox = (page) => page.evaluate(() => {
  const el = document.getElementById('grd-paint-status')
  const sec = document.querySelector('.grd-paint')
  return {
    h: el.getBoundingClientRect().height, text: el.textContent, row: sec.getBoundingClientRect().height,
    wide: el.getBoundingClientRect().right <= sec.getBoundingClientRect().right + 0.5,
  }
})

test.describe('Palette row · the status line is one row that never grows', () => {
  for (const [w, h] of [[1440, 900], [320, 700]]) {
    test(`at ${w}px: before a press, after one, and with every colour locked, the row is the same height`, async ({ page }) => {
      watch(page, 'a designer reading the status line')
      await page.setViewportSize({ width: w, height: h })
      await seed(page, { colors: THIRTEEN })
      await open(page)
      const idle = await statusBox(page)
      await chip(page, 'Primary 500').click()
      await expect(statusLine(page)).toHaveText(words('Stop 1 set to Primary 500. Next: stop 2.'))
      const said = await statusBox(page)
      expect(said.h, 'the sentence did not change the line\'s height').toBe(idle.h)
      expect(said.row, 'nor the row\'s').toBe(idle.row)
      for (const n of [1, 2, 3]) await lockBtn(page, n).click()
      await chip(page, 'Secondary 500').evaluate((el) => el.click())
      const locked = await statusBox(page)
      expect(locked.text.replace('​', ''), 'POSITIVE CONTROL: the long sentence is the one showing').toBe('Every colour is locked.')
      expect(locked.h).toBe(idle.h)
      expect(locked.row).toBe(idle.row)
      expect([idle.wide, said.wide, locked.wide], 'inside the row').toEqual([true, true, true])
    })
  }
})

test.describe('Palette row · From a project', () => {
  test.use({ viewport: { width: 1440, height: 900 } })
  const PROJECT = {
    id: 'proj-harbour', name: 'Harbour rebrand', createdAt: '2026-09-01T09:00:00.000Z', updatedAt: '2026-09-01T09:00:00.000Z',
    design: { palette: { base: '#0B1B3A', harmony: 'auto', extraColors: [], activeIdx: 0, colors: ['#0B1B3A', '#3D7BFF', '#CFEFE6'] } },
  }
  const optionsOf = async (page) => {
    await sourceMenu(page).click()
    const list = page.locator('.menu-select-list[role="listbox"]')
    await list.waitFor({ state: 'visible' })
    const labels = await list.getByRole('option').allTextContents()
    await page.keyboard.press('Escape')
    return labels.map((t) => t.trim())
  }

  test('signed in with a saved project: choosing it swaps the colours, the link goes, and a press paints from it', async ({ page }) => {
    watch(page, 'a signed-in designer with a saved palette and no current one')
    await signIn(page, { plan: 'free', projects: [PROJECT] })
    await seed(page, { colors: [] })
    await open(page)
    await expect(sourceMenu(page)).toContainText('Starter colours')
    await expect(row(page).getByRole('link', { name: 'Make a palette' })).toBeVisible()
    const heightBefore = await page.evaluate(() => document.querySelector('.grd-paint').getBoundingClientRect().height)
    await chooseMenuOption(page, sourceMenu(page), { label: 'Harbour rebrand' })
    const group = row(page).getByRole('group', { name: 'Palette colours' })
    await expect(group.getByRole('button')).toHaveCount(3)
    expect(await names(group.getByRole('button'))).toEqual([
      'Harbour rebrand colour 1, #0B1B3A', 'Harbour rebrand colour 2, #3D7BFF', 'Harbour rebrand colour 3, #CFEFE6',
    ])
    await expect(sourceMenu(page)).toContainText('Harbour rebrand')
    expect(await page.evaluate(() => document.querySelector('.grd-paint').getBoundingClientRect().height), 'the row did not change height').toBe(heightBefore)
    await group.getByRole('button').nth(1).click()
    await expect(hexOf(page, 1)).toHaveText('#3D7BFF')
    await expect(statusLine(page)).toHaveText(words('Stop 1 set to Harbour rebrand colour 2. Next: stop 2.'))
  })

  test('the Colour source menu offers the palette, the starters and each saved project', async ({ page }) => {
    watch(page, 'a signed-in designer reading the Colour source menu')
    await signIn(page, { plan: 'free', projects: [PROJECT] })
    await seed(page, { colors: THIRTEEN })
    await open(page)
    expect(await optionsOf(page)).toEqual(['Current palette', 'Starter colours', 'Harbour rebrand'])
  })

  for (const [name, setup] of [
    ['signed out', async () => {}],
    ['signed in with no saved palette', async (page) => { await signIn(page, { plan: 'free', projects: 0 }) }],
  ]) {
    test(`${name}: the menu holds the palette and the starters only`, async ({ page }) => {
      watch(page, `${name} with no palette`)
      await setup(page)
      await seed(page, { colors: [] })
      await open(page)
      expect(await optionsOf(page)).toEqual(['Current palette', 'Starter colours'])
    })
  }
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
