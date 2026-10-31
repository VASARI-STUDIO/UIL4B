// /create/gradient: the page is the same height whatever the gradient holds, and
// every swatch in the panel is a circle.
//
// Editing a stop, a type, a format, a colour space or a finish may change what
// is inside a slot, never the slot's size. A page that grows and shrinks under
// the pointer moves the very button the person is about to press again, so each
// sequence below records the page's scrollHeight and the heights of .tl-panel
// and .tl-main (plus the parts that could cause a change: the stop window, the
// code well and the canvas slot) after every step, and any step that differs
// from the first is a finding with its name on it.
//
// The expected sizes are hand-checked from the design, not read back from the
// code: a stop window 3 rows tall (40px rows, 56px on touch) with a 2px gap is
// 124px (172px on touch), and the code well is 120px at every format.
//
// MUTATIONS (each turns the tests named red):
//   .grd .grd-stops { height: auto }              -> the add/remove, window and rail tests
//   the Remove button enabled at 2 stops          -> "the Remove button is disabled at two stops"
//   the Add button unmounted at 12                -> "Add a stop stays drawn at twelve"
//   the angle row unmounted for Radial            -> the Linear > Radial > Conic sequence
//   .grd .grd-code { height: auto }               -> the CSS > Tailwind > SVG sequence
//   the palette row's status line given a height that
//     changes when Colours: Palette is pressed        -> the "no palette" sequence
//   the stop row's role label wrapping or growing  -> the "chips change the labels" sequence
//   .grd-chip back to a square at 8px              -> "the palette row chips are round"
//   popClassName dropped from ColorPickerPop      -> the picker popover swatches
//   removeStop ends in setActiveStop(0)           -> the four "removing ..." selection tests
//   the angle lock ignored by Random                  -> "Radial says it has no angle ... the angle lock holds the angle"
//   Add/Remove back to the disabled attribute     -> "at twelve stops Add ..." / "at two stops Remove ..."
//   the Add icon button resized                    -> "Add a stop is an icon button"
//   the palette row's +N link dropped or uncapped   -> "the palette row holds eight colours ..."
//   the "N of 12" count dropped                   -> "the Stops header counts the visible rows ..."
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'

const ROUTE = '/create/gradient'
const MAX_STOPS = 12

// Fine pointer at 1440; touch emulation (coarse pointer, mobile viewport) at 768
// and 390, which is where the 56px rows and the 44px buttons apply.
const SCREENS = [
  { w: 1440, h: 900, touch: false },
  { w: 768, h: 1024, touch: true },
  { w: 390, h: 844, touch: true },
]

const panelOf = (page) => page.getByRole('complementary', { name: 'Gradient controls' })
const stopRows = (page) => page.locator('.grd-stop')
const addButton = (panel) => panel.getByRole('button', { name: 'Add a stop', exact: true })
const removeButtons = (panel) => panel.getByRole('button', { name: /^Remove stop \d+$/ })

/** Two animation frames: layout and any state-driven re-render have landed. */
const settle = (page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))

/**
 * Wait until the stop window has stopped scrolling: its scrollTop unchanged for ten
 * frames running (about 160ms). The page scrolls the active row into view with a
 * smooth scrollTo, and `reducedMotion: 'reduce'` in test.use does not turn that
 * off here (matchMedia reads false in the page), so two frames after a pick, an
 * add or a removal the window can still be mid-animation. Reading then is reading
 * a frame of the animation; reading once it has stopped is the position a designer
 * sees. Gives up after 3s and returns the last value, so a window that never
 * stops fails on the assertion that follows, not here.
 */
const windowSettled = (page) => page.locator('.grd-stops').evaluate((el) => new Promise((resolve) => {
  const t0 = performance.now()
  let last = el.scrollTop
  let still = 0
  const tick = () => {
    still = el.scrollTop === last ? still + 1 : 0
    last = el.scrollTop
    if (still >= 10 || performance.now() - t0 > 3000) resolve(last)
    else requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}))

/** The sizes that must not move, in CSS pixels. */
const SHAPE_KEYS = ['page', 'panel', 'main', 'stage', 'window', 'code', 'gen', 'paint', 'role']
async function shapeOf(page) {
  return page.evaluate(() => {
    const h = (sel) => {
      const el = document.querySelector(sel)
      return el ? Math.round(el.getBoundingClientRect().height * 100) / 100 : null
    }
    return {
      page: document.documentElement.scrollHeight,
      panel: h('.tl-panel'),
      main: h('.tl-main'),
      stage: h('.grd-stage'),
      window: h('.grd-stops'),
      code: h('.grd-code'),
      // The Random section and the palette row inside Stops, and the first stop
      // row's role label ("Custom", "Primary 500"): a status line that wraps or a
      // note that appears would change one of them.
      gen: h('.grd-gen'),
      paint: h('.grd-paint'),
      role: h('.grd-stop-role'),
    }
  })
}

/** Records the shape after each step and reports every step that differs from the first. */
function ledger(page) {
  const rows = []
  return {
    async mark(step) {
      await settle(page)
      rows.push({ step, ...(await shapeOf(page)) })
    },
    get count() { return rows.length },
    first: () => rows[0],
    drift() {
      const [first, ...rest] = rows
      const out = []
      for (const r of rest) {
        for (const k of SHAPE_KEYS) {
          if (r[k] !== first[k]) out.push(`${r.step}: ${k} is ${r[k]}px, was ${first[k]}px at "${first.step}"`)
        }
      }
      return out
    },
  }
}

/** A toolbar action: the direct button when it is drawn, otherwise the More menu. */
async function toolbarAction(page, name, { force = false } = {}) {
  const direct = page.locator('[data-tool-toolbar]').getByRole('button', { name }).first()
  if ((await direct.count()) && (await direct.isVisible())) {
    await direct.click({ force })
    return
  }
  await page.locator('[data-tl-more] button').first().click()
  const row = page.locator('.tl-menu-row').filter({ hasText: name }).first()
  if (force) await row.evaluate((el) => el.click())
  else await row.click()
}


/** A choice in the Random section's Colours row. With no palette, Palette is aria-disabled but still answers a press with a toast. */
const coloursChoice = (page, name) => panelOf(page).getByRole('radiogroup', { name: 'Colours' }).getByRole('radio', { name, exact: true })

/** A palette of thirteen colours with a ramp made from the first, as a project would hold. */
const THIRTEEN = [
  '#2F6BFF', '#E0784E', '#3FAFA0', '#0B0C0E', '#F7F7F4', '#D9B93C', '#8B5CF0',
  '#52A069', '#E894AC', '#1B3FA8', '#7A7A7A', '#B0C4DE', '#CD5C5C',
]
const RAMP = [
  '#EEF3FF', '#D9E5FF', '#B8CEFF', '#8FB0FF', '#5F8BFF', '#2F6BFF',
  '#2556D1', '#1B41A3', '#142F78', '#0D1E4F', '#071230',
]
const withFullPalette = (page) => page.addInitScript(([colors, scale]) => {
  localStorage.setItem('vs-current-design', JSON.stringify({
    palette: { base: colors[0], harmony: 'auto', extraColors: [], activeIdx: 0, colors },
    tints: { from: colors[0], scale },
  }))
}, [THIRTEEN, RAMP])
/** A twelve-stop gradient whose stop n holds palette colour n, saved as the project's gradient. */
const withTwelveStops = (page) => page.addInitScript(([colors, scale]) => {
  const stops = colors.slice(0, 12).map((color, i) => ({ color, position: Math.round((i / 11) * 100) }))
  localStorage.setItem('vs-current-design', JSON.stringify({
    palette: { base: colors[0], harmony: 'auto', extraColors: [], activeIdx: 0, colors },
    tints: { from: colors[0], scale },
    gradient: { type: 'Linear', angle: 90, stops },
  }))
}, [THIRTEEN, RAMP])
// The palette row draws eight colours and a "+N more" link (five on touch, where the cap is six slots).
const chipCapFor = (touch) => (touch ? 5 : 8)
const chipNamed = (page, name) => page.locator('.grd-paint').getByRole('button', { name: new RegExp(`^${name}, #`) }).first()
const roleOf = (page, n) => stopRows(page).nth(n - 1).locator('.grd-stop-role')

async function open(page) {
  await go(page, ROUTE)
  await expect(page.getByRole('heading', { level: 1, name: 'Gradient' })).toBeVisible()
  await expect(panelOf(page)).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
  await settle(page)
}

/** Remove stops from the top of the list until `n` are left. */
async function reduceTo(page, n) {
  const panel = panelOf(page)
  while ((await stopRows(page).count()) > n) {
    await removeButtons(panel).first().click()
  }
  await expect(stopRows(page)).toHaveCount(n)
}

for (const screen of SCREENS) {
  test.describe(`the page keeps its height at ${screen.w}px${screen.touch ? ' (touch)' : ''}`, () => {
    test.use({
      viewport: { width: screen.w, height: screen.h },
      hasTouch: screen.touch,
      isMobile: screen.touch,
      // Instant scrolling, so a measurement is never taken mid-animation.
      reducedMotion: 'reduce',
    })

    test('adding from two stops to twelve, and removing back to two, changes nothing', async ({ page }) => {
      watch(page, 'a designer building a long ramp')
      await open(page)
      const panel = panelOf(page)
      await reduceTo(page, 2)
      const l = ledger(page)
      await l.mark('2 stops')
      for (let n = 3; n <= MAX_STOPS; n++) {
        await addButton(panel).click()
        await expect(stopRows(page)).toHaveCount(n)
        await l.mark(`${n} stops`)
      }
      for (let n = MAX_STOPS - 1; n >= 2; n--) {
        await removeButtons(panel).last().click()
        await expect(stopRows(page)).toHaveCount(n)
        await l.mark(`back to ${n} stops`)
      }
      expect(l.count).toBe(21)
      expect(l.drift(), l.drift().join('\n')).toEqual([])
    })

    test('Linear, Radial and Conic take the same space, and Radial says it has no angle', async ({ page }) => {
      watch(page, 'a designer switching gradient type')
      await open(page)
      const panel = panelOf(page)
      const l = ledger(page)
      await l.mark('Linear at rest')
      const angleRow = page.locator('.grd-row--angle')
      for (const type of ['Radial', 'Conic', 'Linear', 'Radial', 'Linear']) {
        await panel.getByRole('button', { name: type, exact: true }).click()
        await l.mark(`type ${type}`)
        await expect(angleRow, `the angle row is drawn for ${type}`).toBeVisible()
        if (type === 'Radial') {
          await expect(angleRow).toContainText('Radial gradients have no angle')
          await expect(page.getByRole('slider', { name: 'Gradient angle' })).toHaveCount(0)
        } else {
          await expect(page.getByRole('slider', { name: 'Gradient angle' })).toBeVisible()
        }
      }
      expect(l.drift(), l.drift().join('\n')).toEqual([])
    })

    test('CSS, Tailwind and SVG take the same space, even with twelve stops', async ({ page }) => {
      watch(page, 'a developer comparing export formats')
      await open(page)
      const panel = panelOf(page)
      const l = ledger(page)
      await l.mark('CSS at rest')
      const formats = ['Tailwind', 'SVG', 'CSS']
      for (const f of formats) {
        await page.getByRole('tab', { name: f, exact: true }).click()
        await l.mark(`${f} at the starting stops`)
      }
      while ((await stopRows(page).count()) < MAX_STOPS) await addButton(panel).click()
      for (const f of formats) {
        await page.getByRole('tab', { name: f, exact: true }).click()
        await l.mark(`${f} at 12 stops`)
        expect(l.drift(), l.drift().join('\n')).toEqual([])
      }
      // The long SVG is read by scrolling the well, not by growing it.
      await page.getByRole('tab', { name: 'SVG', exact: true }).click()
      const well = await page.locator('.grd-code-text').evaluate((el) => ({
        scroll: el.scrollHeight, client: el.clientHeight, overflowY: getComputedStyle(el).overflowY,
      }))
      expect(well.scroll, 'twelve stops of SVG are longer than the well').toBeGreaterThan(well.client)
      expect(['auto', 'scroll']).toContain(well.overflowY)
      expect(l.drift(), l.drift().join('\n')).toEqual([])
    })

    test('Perceived and Standard interpolation take the same space', async ({ page }) => {
      watch(page, 'a designer comparing colour spaces')
      await open(page)
      const panel = panelOf(page)
      const l = ledger(page)
      await l.mark('start')
      for (const s of ['Standard', 'Perceived', 'Standard', 'Perceived']) {
        await panel.getByRole('button', { name: new RegExp(`^${s}`) }).click()
        await l.mark(`space ${s}`)
      }
      expect(l.drift(), l.drift().join('\n')).toEqual([])
    })

    test('Random ten times, with whatever type and stops it lands on, changes nothing', async ({ page }) => {
      watch(page, 'a designer pressing Random')
      await open(page)
      const l = ledger(page)
      await l.mark('start')
      const types = new Set()
      for (let i = 1; i <= 10; i++) {
        await toolbarAction(page, /^Random/)
        types.add(await page.locator('.grd-canvas').getAttribute('aria-label'))
        await l.mark(`Random #${i}`)
      }
      expect(l.count).toBe(11)
      expect(l.drift(), l.drift().join('\n')).toEqual([])
    })

    test('Colours: Palette with no palette answers with a toast and changes nothing', async ({ page }) => {
      watch(page, 'a designer with no palette yet')
      await open(page)
      const l = ledger(page)
      // A fresh visit holds the one seed colour, so the palette row already offers
      // the starter colours and the way to make a palette: a press has nothing to add.
      await expect(page.locator('.grd-paint-link')).toHaveText('Make a palette')
      await l.mark('before the press')
      expect((await l.first()).gen, 'the Random section is drawn').toBeGreaterThan(0)
      expect((await l.first()).paint, 'the palette row is drawn').toBeGreaterThan(0)
      expect((await l.first()).role, 'the first stop row has a role label').toBeGreaterThan(0)

      const palette = coloursChoice(page, 'Palette')
      await palette.click({ force: true })
      await expect(page.locator('.toast.show')).toContainText('Needs a palette with two or more colours')
      await expect(palette, 'a press on an inert choice does not select it').toHaveAttribute('aria-checked', 'false')
      await l.mark('pressed')

      await palette.click({ force: true })
      await l.mark('pressed again')
      // The canvas slot is only the canvas now: nothing lies over it.
      await expect(page.locator('.grd-stage > :not(.grd-canvas)')).toHaveCount(0)
      expect(l.drift(), l.drift().join('\n')).toEqual([])
    })

    test('pressing palette row chips changes the stop labels and nothing\'s size', async ({ page }) => {
      watch(page, 'a designer filling stops from a full palette')
      await withFullPalette(page)
      await open(page)
      const l = ledger(page)
      await l.mark('start')
      // The seed gradient's stops are not palette colours.
      await expect(roleOf(page, 1)).toHaveText('Custom')
      await expect(chipNamed(page, 'Primary 500')).toBeVisible()
      for (const [stop, chip, label] of [
        [1, 'Primary 500', 'Primary 500'],
        [2, 'Secondary 500', 'Secondary 500'],
        [3, 'Primary 300', 'Primary 300'],
        [1, 'Neutral 500', 'Neutral 500'],
        [2, 'Accent 500', 'Accent 500'],
        [3, 'Primary 950', 'Primary 950'],
      ]) {
        await page.getByRole('button', { name: new RegExp(`^Select stop ${stop}, #`) }).click()
        await chipNamed(page, chip).click()
        await expect(roleOf(page, stop), `stop ${stop} after ${chip}`).toHaveText(label)
        await l.mark(`stop ${stop} set to ${chip}`)
      }
      expect(l.count).toBe(7)
      expect(l.drift(), l.drift().join('\n')).toEqual([])
    })

    // T-A8 (spec gradient-generation-v2 §10): the row's height is decided by its
    // state and never moves in a session. Each sequence is one state, and every step
    // is a press that changes content only: the target, a colour, a lock, a status sentence.
    const lock = (page, n) => stopRows(page).nth(n - 1).locator('.grd-lock')

    test('palette state: chips, target moves, locks and every status sentence change nothing', async ({ page }) => {
      watch(page, 'a designer painting from a full palette')
      await withFullPalette(page)
      await open(page)
      const l = ledger(page)
      await l.mark('start')
      // Paint round the gradient twice: each press moves the target and rewrites the status line.
      for (const [i, name] of ['Primary 500', 'Secondary 500', 'Accent 500', 'Neutral 500', 'Primary 300', 'Surface 500'].entries()) {
        await chipNamed(page, name).click()
        await l.mark(`press ${i + 1}: ${name}`)
      }
      // Press a colour a stop already has: the "already" sentence.
      await stopRows(page).nth(0).locator('.grd-stop-select').click()
      await chipNamed(page, 'Surface 500').click()
      await chipNamed(page, 'Surface 500').click()
      await l.mark('already sentence')
      // A multi-selection: its own sentence.
      await stopRows(page).nth(0).locator('.grd-stop-select').click()
      await stopRows(page).nth(2).locator('.grd-stop-select').click({ modifiers: ['Control'] })
      await l.mark('two stops selected')
      await chipNamed(page, 'Neutral 500').click()
      await l.mark('two stops painted')
      await stopRows(page).nth(0).locator('.grd-stop-select').click()
      // Locks: one, then every stop (the longest sentence, "Every colour is locked"), then back.
      await lock(page, 2).click()
      await l.mark('one lock')
      await chipNamed(page, 'Primary 500').click()
      await l.mark('press with a locked stop')
      await lock(page, 1).click()
      await lock(page, 3).click()
      await l.mark('every colour locked')
      // A press on a locked gradient is refused and says so (the label's longest sentence).
      await chipNamed(page, 'Primary 500').evaluate((el) => el.click())
      await expect(page.locator('.grd-paint-label')).toContainText('Every colour is locked.')
      await l.mark('refused press')
      for (const n of [1, 2, 3]) await lock(page, n).click()
      await l.mark('unlocked')
      // Random, which rewrites the stops and so the status line's idle text.
      for (let i = 1; i <= 5; i++) {
        await toolbarAction(page, /^Random/)
        await l.mark(`Random #${i}`)
      }
      expect(l.count).toBe(20)
      expect(l.drift(), l.drift().join('\n')).toEqual([])
    })

    test('no palette: starter colours, target moves, locks and every sentence change nothing', async ({ page }) => {
      watch(page, 'someone with no palette starting from the starter colours')
      // A fresh visit holds one seed colour; an empty palette is the no-palette state.
      await page.addInitScript(() => localStorage.setItem('vs-current-design', JSON.stringify({
        palette: { base: '#0051FF', harmony: 'auto', extraColors: [], activeIdx: 0, colors: [] },
      })))
      await open(page)
      await expect(page.locator('.grd-paint-link')).toHaveText('Make a palette')
      await expect(page.getByRole('button', { name: 'Colour source' })).toContainText('Starter colours')
      const l = ledger(page)
      await l.mark('start')
      for (const name of ['Starter blue', 'Starter navy', 'Starter violet', 'Starter pink', 'Starter orange']) {
        await chipNamed(page, name).click()
        await l.mark(`starter ${name}`)
      }
      await lock(page, 2).click()
      await chipNamed(page, 'Starter pink').click()
      await l.mark('starter with the middle locked')
      await lock(page, 1).click()
      await lock(page, 3).click()
      await l.mark('every colour locked')
      await chipNamed(page, 'Starter blue').evaluate((el) => el.click())
      await expect(page.locator('.grd-paint-label')).toContainText('Every colour is locked.')
      await l.mark('refused starter')
      for (const n of [1, 2, 3]) await lock(page, n).click()
      await l.mark('unlocked')
      for (let i = 1; i <= 5; i++) {
        await toolbarAction(page, /^Random/)
        await l.mark(`Random #${i}`)
      }
      expect(l.count).toBe(15)
      expect(l.drift(), l.drift().join('\n')).toEqual([])
    })

    // With one palette colour the row holds the starter colours and the way to make
    // a palette; the single colour is not a chip. Pressing through it moves nothing.
    test('one colour: the same presses change nothing either', async ({ page }) => {
      watch(page, 'someone with a one-colour palette starting from the starter colours')
      await page.addInitScript(() => localStorage.setItem('vs-current-design', JSON.stringify({
        palette: { base: '#0051FF', harmony: 'auto', extraColors: [], activeIdx: 0, colors: ['#0051FF'] },
      })))
      await open(page)
      await expect(page.locator('.grd-paint-link')).toHaveText('Make a palette')
      const l = ledger(page)
      await l.mark('start')
      // Locked from the start the line has no press to recall, so it says what the state is.
      for (const n of [1, 2, 3]) await lock(page, n).click()
      await expect(page.locator('.grd-paint-label')).toHaveText('Every colour is locked')
      await l.mark('every colour locked')
      await chipNamed(page, 'Starter violet').evaluate((el) => el.click())
      await expect(page.locator('.grd-paint-label')).toContainText('Every colour is locked.')
      await l.mark('refused starter')
      for (const n of [1, 2, 3]) await lock(page, n).click()
      await chipNamed(page, 'Starter violet').click()
      await l.mark('a starter')
      await chipNamed(page, 'Starter pink').click()
      await l.mark('another starter')
      expect(l.drift(), l.drift().join('\n')).toEqual([])
    })

    test('the longest role names fit their cell on every row, at twelve stops', async ({ page }) => {
      watch(page, 'a designer reading role labels')
      // The palette row shows eight colours at most, so the gradient is saved with
      // stop n already holding palette colour n: Primary, Secondary, Accent, Neutral,
      // Surface, Highlight, then Colour 7 to Colour 12.
      await withTwelveStops(page)
      await open(page)
      await expect(stopRows(page)).toHaveCount(MAX_STOPS)
      const names = ['Primary 500', 'Secondary 500', 'Accent 500', 'Neutral 500', 'Surface 500', 'Highlight 500',
        'Colour 7 500', 'Colour 8 500', 'Colour 9 500', 'Colour 10 500', 'Colour 11 500', 'Colour 12 500']
      for (let n = 1; n <= MAX_STOPS; n++) await expect(roleOf(page, n)).toHaveText(names[n - 1])
      const cut = await page.locator('.grd-stop-role').evaluateAll((els) => els
        .map((el) => ({ text: el.textContent, cut: el.scrollWidth - el.clientWidth }))
        .filter((e) => e.cut > 0))
      expect(cut, 'role labels cut short by an ellipsis').toEqual([])
      const sideways = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(sideways, 'no sideways scroll').toBeLessThanOrEqual(0)
    })
  })
}

// At 390, 768 and 1440 both interpolation hints may wrap to the same number of
// lines, so those widths cannot tell a shared cell from a swapped paragraph. The
// Perceived hint is the shorter (61 characters against 69), so somewhere between
// a phone and a tablet there is a band of widths where it fits one line and the
// Standard hint needs two: that is where a hint that is swapped in and out moves
// the page. Which widths those are depends on the font the machine draws (the
// Windows and Linux faces measure differently, so a fixed 400 held on one and
// not the other), so the test FINDS the band by measuring the hints at each
// width, and fails with the measurements if there is none.
test.describe('the interpolation hint at a width where the two hints differ in length', () => {
  test.use({ viewport: { width: 400, height: 900 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' })

  test('the two hints wrap to different heights here, and switching still changes nothing', async ({ page }) => {
    watch(page, 'a designer on a mid-size phone comparing colour spaces')
    await open(page)
    const panel = panelOf(page)
    const measure = () => page.evaluate(() => [...document.querySelectorAll('.grd-interp-hint')].map((p) => {
      const r = document.createRange()
      r.selectNodeContents(p)
      return Math.round(r.getBoundingClientRect().height)
    }))
    // Scan 320..700 in 2px steps for the widest run of widths where the hints
    // differ, and sit in the middle of it so a pixel of font drift cannot end it.
    const seen = []
    let run = []
    let best = []
    for (let w = 320; w <= 700; w += 2) {
      await page.setViewportSize({ width: w, height: 900 })
      const h = await measure()
      expect(h.length, 'both hints are in the panel').toBe(2)
      seen.push(`${w}:${h.join('/')}`)
      if (h[0] !== h[1]) run.push(w)
      else { if (run.length > best.length) best = run; run = [] }
    }
    if (run.length > best.length) best = run
    expect(best.length, `no width from 320 to 700 gives the two hints different heights, so this test proves nothing. Heights (hint 1/hint 2) by width: ${seen.join(' ')}`).toBeGreaterThan(0)
    await page.setViewportSize({ width: best[Math.floor(best.length / 2)], height: 900 })
    await settle(page)
    const lines = await measure()
    expect(lines[0], 'the hints differ in length at this width, or this test proves nothing').not.toBe(lines[1])

    const l = ledger(page)
    await l.mark('start')
    for (const s of ['Standard', 'Perceived', 'Standard', 'Perceived']) {
      await panel.getByRole('button', { name: new RegExp(`^${s}`) }).click()
      await l.mark(`space ${s}`)
    }
    expect(l.drift(), l.drift().join('\n')).toEqual([])
    // Only the hint for the chosen space is read out.
    await expect(page.locator('#grd-interp-hint')).toHaveCount(1)
    await expect(page.locator('.grd-interp-hint.is-idle')).toHaveAttribute('aria-hidden', 'true')
  })
})

test.describe('the stop list is a fixed window', () => {
  for (const screen of [SCREENS[0], SCREENS[2]]) {
    test.describe(`at ${screen.w}px${screen.touch ? ' (touch)' : ''}`, () => {
      test.use({
        viewport: { width: screen.w, height: screen.h },
        hasTouch: screen.touch,
        isMobile: screen.touch,
        reducedMotion: 'reduce',
      })

      test('the window is three rows tall (hand-checked sizes) and the code well is 120px', async ({ page }) => {
        watch(page, 'a designer reading the panel')
        await open(page)
        const rowH = screen.touch ? 56 : 40
        const windowH = rowH * 3 + 2 * 2 // three rows and two 2px gaps: 124 fine, 172 touch
        const panel = panelOf(page)
        await reduceTo(page, 2)
        for (const n of [2, 5, MAX_STOPS]) {
          while ((await stopRows(page).count()) < n) await addButton(panel).click()
          await expect(stopRows(page)).toHaveCount(n)
          const g = await page.evaluate(() => {
            const w = document.querySelector('.grd-stops')
            return {
              inner: w.clientHeight,
              row: document.querySelector('.grd-stop').getBoundingClientRect().height,
              code: document.querySelector('.grd-code').getBoundingClientRect().height,
              overflowY: getComputedStyle(w).overflowY,
            }
          })
          expect(g.inner, `window at ${n} stops`).toBe(windowH)
          expect(g.row, `row at ${n} stops`).toBe(rowH)
          expect(g.code, `code well at ${n} stops`).toBe(120)
          expect(g.overflowY).toBe('auto')
        }
      })

      // Add is an icon button in the Stops header: 26px square (44px on touch).
      test('Add a stop is a 26px icon button, 44px on touch, at two stops and at twelve', async ({ page }) => {
        watch(page, 'a designer reading the panel')
        await open(page)
        const side = screen.touch ? 44 : 26
        const panel = panelOf(page)
        await reduceTo(page, 2)
        const sizeOf = () => addButton(panel).evaluate((el) => {
          const r = el.getBoundingClientRect()
          return { w: r.width, h: r.height, text: el.textContent.trim() }
        })
        expect(await sizeOf(), 'at 2 stops').toEqual({ w: side, h: side, text: '' })
        while ((await stopRows(page).count()) < MAX_STOPS) await addButton(panel).click()
        expect(await sizeOf(), 'at 12 stops').toEqual({ w: side, h: side, text: '' })
      })

      test('with more than three stops the window scrolls inside itself and draws a line where rows continue', async ({ page }) => {
        watch(page, 'a designer with a long list')
        await open(page)
        const panel = panelOf(page)
        while ((await stopRows(page).count()) < MAX_STOPS) await addButton(panel).click()
        const overflow = await page.locator('.grd-stops').evaluate((el) => ({ scroll: el.scrollHeight, client: el.clientHeight }))
        expect(overflow.scroll, 'twelve rows do not fit three').toBeGreaterThan(overflow.client)
        // Newest stop is active, so its row is in view at the foot.
        await expect.poll(() => page.locator('.grd-stops').evaluate((el) => el.scrollTop)).toBeGreaterThan(0)
        // The hairline cue: a line above (rows past the top), none below.
        await expect(page.locator('.grd-stops')).toHaveClass(/is-above/)
        await expect(page.locator('.grd-stops')).not.toHaveClass(/is-below/)
        const edges = await page.locator('.grd-stops').evaluate((el) => {
          const cs = getComputedStyle(el)
          return { top: cs.borderTopColor, bottom: cs.borderBottomColor, topW: cs.borderTopWidth }
        })
        expect(edges.topW).toBe('1px')
        expect(edges.top, 'the top edge shows a line').not.toBe('rgba(0, 0, 0, 0)')
        expect(edges.bottom, 'the bottom edge is clear').toBe('rgba(0, 0, 0, 0)')
      })

      test('a stop picked on the rail is scrolled into the window, and the page stays where it was', async ({ page }) => {
        watch(page, 'a designer picking stops on the rail')
        // A short window puts the stop list below the fold, where scrolling the
        // row into view the wrong way would also drag the page.
        await page.setViewportSize({ width: screen.w, height: 560 })
        await open(page)
        const panel = panelOf(page)
        while ((await stopRows(page).count()) < MAX_STOPS) await addButton(panel).click()

        const handle = (n) => page.getByRole('button', { name: new RegExp(`^Gradient stop ${n} at `) })
        // Select by focus without letting the browser scroll for us.
        const pick = (n) => handle(n).evaluate((el) => el.focus({ preventScroll: true }))
        const windowState = () => page.locator('.grd-stops').evaluate((win) => {
          const rows = [...win.children]
          const w = win.getBoundingClientRect()
          const rowBox = (i) => rows[i].getBoundingClientRect()
          return {
            scrollTop: win.scrollTop,
            first: { top: rowBox(0).top - w.top, bottom: rowBox(0).bottom - w.bottom },
            last: { top: rowBox(rows.length - 1).top - w.top, bottom: rowBox(rows.length - 1).bottom - w.bottom },
            pageY: window.scrollY,
            winTop: w.top,
            innerH: window.innerHeight,
          }
        })

        // The scroll may be animated, so the page's highest scroll position is
        // sampled every frame from here on rather than read once at the end.
        await page.evaluate(() => {
          window.scrollTo(0, 0)
          window.__maxPageY = 0
          const tick = () => { window.__maxPageY = Math.max(window.__maxPageY, window.scrollY); requestAnimationFrame(tick) }
          tick()
        })
        const maxPageY = () => page.evaluate(() => window.__maxPageY)

        // Stop 1 first: the window goes back to the top.
        await pick(1)
        await expect.poll(async () => (await windowState()).scrollTop).toBe(0)
        const atTop = await windowState()
        if (screen.touch) {
          expect(atTop.winTop, 'the stop list starts below the fold in this test').toBeGreaterThan(atTop.innerH)
        }
        expect(atTop.last.bottom, 'the last row is past the window at the top').toBeGreaterThan(1)

        // Stop 12 next: its row moves into the window; the page does not move.
        await pick(MAX_STOPS)
        await expect.poll(async () => (await windowState()).last.bottom, { message: 'row 12 comes to the window foot' }).toBeLessThanOrEqual(1)
        const atFoot = await windowState()
        expect(atFoot.scrollTop).toBeGreaterThan(0)
        expect(atFoot.last.top, 'row 12 starts inside the window').toBeGreaterThanOrEqual(-1)
        expect(await maxPageY(), 'the page did not scroll').toBe(0)

        // And back up to stop 1 again.
        await pick(1)
        await expect.poll(async () => (await windowState()).first.top, { message: 'row 1 comes to the window top' }).toBeGreaterThanOrEqual(-1)
        await expect.poll(async () => (await windowState()).scrollTop).toBe(0)
        expect(await maxPageY(), 'the page did not scroll').toBe(0)
      })
    })
  }
})

test.describe('the buttons that change the stop count stay drawn', () => {
  test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })

  test('the Remove button is drawn on every row and disabled at two stops, live at three', async ({ page }) => {
    watch(page, 'a designer taking stops away')
    await open(page)
    const panel = panelOf(page)
    await reduceTo(page, 3)
    await expect(removeButtons(panel)).toHaveCount(3)
    for (const b of await removeButtons(panel).all()) await expect(b).toBeEnabled()

    await removeButtons(panel).first().click()
    await expect(stopRows(page)).toHaveCount(2)
    // Still one per row, so the row's columns do not change.
    await expect(removeButtons(panel)).toHaveCount(2)
    for (const b of await removeButtons(panel).all()) await expect(b).toBeDisabled()

    // Pressing a disabled one removes nothing.
    await removeButtons(panel).first().click({ force: true })
    await expect(stopRows(page)).toHaveCount(2)

    // Each row is the same width with two stops as with three.
    const widthAt2 = await stopRows(page).first().evaluate((el) => el.getBoundingClientRect().width)
    await addButton(panel).click()
    const widthAt3 = await stopRows(page).first().evaluate((el) => el.getBoundingClientRect().width)
    expect(widthAt2).toBe(widthAt3)
  })

  test('Add a stop stays drawn at twelve, aria-disabled, and says why', async ({ page }) => {
    watch(page, 'a designer at the stop limit')
    await open(page)
    const panel = panelOf(page)
    while ((await stopRows(page).count()) < MAX_STOPS - 1) await addButton(panel).click()
    const add = addButton(panel)
    await expect(add).toBeEnabled()
    await expect(add).toHaveAttribute('title', 'Add a stop')
    await add.click()
    await expect(stopRows(page)).toHaveCount(MAX_STOPS)

    // The same button, same name, now inert with the reason as its title.
    await expect(addButton(panel)).toHaveCount(1)
    await expect(add).toHaveAttribute('aria-disabled', 'true')
    await expect(add).toHaveAttribute('title', '12 stops is the most')
    await add.click({ force: true })
    await expect(stopRows(page)).toHaveCount(MAX_STOPS)

    // Taking one away brings the working button back.
    await removeButtons(panel).last().click()
    await expect(add).toBeEnabled()
    await expect(add).toHaveAttribute('title', 'Add a stop')
  })
})

// The stop-count limits and what removing a stop does to the selection. At twelve
// stops the Add button, and at two the Remove buttons, are aria-disabled rather than
// disabled: still focusable, so the reason can be reached, and a press does nothing.
// Playwright treats aria-disabled as not-enabled, so presses use force.
//
// Hand-checked sizes: rows are 40px (56px on touch) with a 2px gap, so the window
// scrolls in steps of 42px (58px on touch).
test.describe('the stop-count limits and the selection when a stop is removed', () => {
  for (const screen of [SCREENS[0], SCREENS[2]]) {
    test.describe(`at ${screen.w}px${screen.touch ? ' (touch)' : ''}`, () => {
      test.use({
        viewport: { width: screen.w, height: screen.h },
        hasTouch: screen.touch,
        isMobile: screen.touch,
        reducedMotion: 'reduce',
      })

      const pitch = (screen.touch ? 56 : 40) + 2
      const countOf = (panel) => panel.locator('.grd-stops-count')
      const grow = async (page, n) => {
        const panel = panelOf(page)
        while ((await stopRows(page).count()) < n) await addButton(panel).click()
        await expect(stopRows(page)).toHaveCount(n)
      }
      /** Which "Select stop n" buttons are pressed (1-based), and every row's hex. */
      const selection = (page) => page.evaluate(() => {
        const btns = [...document.querySelectorAll('.grd-stop-select')]
        return {
          pressed: btns.map((b, i) => (b.getAttribute('aria-pressed') === 'true' ? i + 1 : 0)).filter(Boolean),
          hexes: btns.map((b) => b.querySelector('.grd-stop-hex').textContent),
        }
      })
      const select = (page, n) => page.getByRole('button', { name: new RegExp(`^Select stop ${n}, #`) }).click()
      // Playwright scrolls a button into view before it clicks, and an instant scroll that lands in the
      // same frame as the page's own smooth scroll to the active row cancels that smooth scroll, leaving
      // the window a few pixels short (measured: stuck at 284 for good, 290 being the row fully in view).
      // A person never gets that pre-click jump, so reveal the button and let the window settle first,
      // and the click is the only thing that moves it.
      const remove = async (page, n) => {
        const x = panelOf(page).getByRole('button', { name: `Remove stop ${n}`, exact: true })
        await windowSettled(page)
        await x.scrollIntoViewIfNeeded()
        await windowSettled(page)
        await x.click()
      }
      const windowScroll = (page) => page.locator('.grd-stops').evaluate((el) => el.scrollTop)

      test('the Stops header counts the visible rows once there are more than three, and follows the scroll', async ({ page }) => {
        watch(page, 'a designer with a long list')
        await open(page)
        const panel = panelOf(page)
        await reduceTo(page, 3)
        await expect(countOf(panel), 'three stops all fit, so there is nothing to count').toHaveCount(0)

        await grow(page, MAX_STOPS)
        // The newest stop is active, so the window has scrolled to the foot.
        await expect(countOf(panel)).toHaveText('10–12 of 12')
        await page.locator('.grd-stops').evaluate((el) => { el.scrollTop = 0 })
        await expect(countOf(panel)).toHaveText('1–3 of 12')
        await page.locator('.grd-stops').evaluate((el, step) => { el.scrollTop = step * 3 }, pitch)
        await expect(countOf(panel)).toHaveText('4–6 of 12')
        await page.locator('.grd-stops').evaluate((el) => { el.scrollTop = el.scrollHeight })
        await expect(countOf(panel)).toHaveText('10–12 of 12')
      })

      test('at twelve stops Add is aria-disabled, focusable, says why, and a press adds nothing', async ({ page }) => {
        watch(page, 'a designer at the stop limit')
        await open(page)
        const panel = panelOf(page)
        await grow(page, MAX_STOPS - 1)
        const full = addButton(panel)
        await expect(full, 'below the limit it is a live button').not.toHaveAttribute('aria-disabled', /.*/)
        await full.click()
        await expect(stopRows(page)).toHaveCount(MAX_STOPS)

        await expect(full).toHaveAttribute('aria-disabled', 'true')
        await expect(full, 'the reason is its title').toHaveAttribute('title', '12 stops is the most')
        await expect(full, 'aria-disabled, not the disabled attribute').not.toHaveAttribute('disabled', /.*/)
        await full.focus()
        await expect(full, 'still reachable by keyboard').toBeFocused()

        await full.click({ force: true })
        await expect(stopRows(page)).toHaveCount(MAX_STOPS)
        await full.focus()
        await page.keyboard.press('Enter')
        await page.keyboard.press('Space')
        await expect(stopRows(page)).toHaveCount(MAX_STOPS)
        await expect(removeButtons(panel)).toHaveCount(MAX_STOPS)
        await expect(full, 'the button is unchanged by the presses').toHaveAttribute('aria-disabled', 'true')
      })

      test('at two stops Remove is aria-disabled, points at its reason, and a click or a key removes nothing', async ({ page }) => {
        watch(page, 'a designer at the stop minimum')
        await open(page)
        const panel = panelOf(page)
        await reduceTo(page, 3)
        for (const b of await removeButtons(panel).all()) {
          await expect(b, 'at three stops Remove is live').not.toHaveAttribute('aria-disabled', /.*/)
          await expect(b).not.toHaveAttribute('aria-describedby', /.*/)
        }
        await remove(page, 1)
        await expect(stopRows(page)).toHaveCount(2)
        await expect(page.locator('#grd-stop-min-hint')).toHaveText('A gradient needs at least two stops')

        const before = (await selection(page)).hexes
        for (const b of await removeButtons(panel).all()) {
          await expect(b).toHaveAttribute('aria-disabled', 'true')
          await expect(b).toHaveAttribute('aria-describedby', 'grd-stop-min-hint')
          await expect(b).not.toHaveAttribute('disabled', /.*/)
        }
        const first = removeButtons(panel).first()
        await first.click({ force: true })
        await expect(stopRows(page)).toHaveCount(2)
        await first.focus()
        await expect(first, 'still reachable by keyboard').toBeFocused()
        await page.keyboard.press('Enter')
        await page.keyboard.press('Space')
        await expect(stopRows(page)).toHaveCount(2)
        await removeButtons(panel).last().click({ force: true })
        await expect(stopRows(page)).toHaveCount(2)
        expect((await selection(page)).hexes, 'the same two stops are left').toEqual(before)

        // Back to three and the hint and the aria-disabled go away.
        await addButton(panel).click()
        await expect(page.locator('#grd-stop-min-hint')).toHaveCount(0)
        await expect(removeButtons(panel).first()).not.toHaveAttribute('aria-disabled', /.*/)
      })

      test('removing the active middle row leaves the row that slid into its place selected', async ({ page }) => {
        watch(page, 'a designer deleting the selected stop')
        await open(page)
        await grow(page, 5)
        await select(page, 2)
        const was = await selection(page)
        expect(was.pressed).toEqual([2])
        await remove(page, 2)
        await expect(stopRows(page)).toHaveCount(4)
        await expect.poll(async () => (await selection(page)).pressed, { message: 'row 2 is still the selected one' }).toEqual([2])
        // It is the old row 3 that now sits in row 2.
        expect((await selection(page)).hexes).toEqual(was.hexes.filter((_, i) => i !== 1))
      })

      test('removing a row above the active one keeps the same stop selected, now one row up', async ({ page }) => {
        watch(page, 'a designer deleting a stop above the selected one')
        await open(page)
        await grow(page, 5)
        await select(page, 3)
        const was = await selection(page)
        expect(was.pressed).toEqual([3])
        await remove(page, 1)
        await expect(stopRows(page)).toHaveCount(4)
        await expect.poll(async () => (await selection(page)).pressed).toEqual([2])
        expect((await selection(page)).hexes[1], 'row 2 is the stop that was row 3').toBe(was.hexes[2])
      })

      test('removing a row below the active one leaves the selection where it was', async ({ page }) => {
        watch(page, 'a designer deleting a stop below the selected one')
        await open(page)
        await grow(page, 5)
        await select(page, 1)
        await remove(page, 4)
        await expect(stopRows(page)).toHaveCount(4)
        await expect.poll(async () => (await selection(page)).pressed).toEqual([1])
      })

      test('removing the active last row selects the new last row, and the window does not jump to the top', async ({ page }) => {
        watch(page, 'a designer deleting the newest stop on a long list')
        await open(page)
        await grow(page, MAX_STOPS)
        // The newest stop is active and the window sits at the foot.
        const atFoot = () => page.locator('.grd-stops').evaluate((el) => el.scrollTop + el.clientHeight >= el.scrollHeight - 1)
        await expect.poll(atFoot, { message: 'the window has scrolled to the last row' }).toBe(true)
        const was = await selection(page)
        expect(was.pressed).toEqual([MAX_STOPS])
        expect(await windowScroll(page)).toBeGreaterThanOrEqual(pitch * 8)

        await remove(page, MAX_STOPS)
        await expect(stopRows(page)).toHaveCount(MAX_STOPS - 1)
        await expect.poll(async () => (await selection(page)).pressed).toEqual([MAX_STOPS - 1])
        expect((await selection(page)).hexes[MAX_STOPS - 2]).toBe(was.hexes[MAX_STOPS - 2])
        await windowSettled(page)
        // Still down the list, with the selected row inside the window.
        expect(await windowScroll(page), 'the window did not return to the top').toBeGreaterThanOrEqual(pitch * 7)
        const inView = await page.locator('.grd-stops').evaluate((win) => {
          const w = win.getBoundingClientRect()
          const r = win.children[win.children.length - 1].getBoundingClientRect()
          return r.top >= w.top - 1 && r.bottom <= w.bottom + 1
        })
        expect(inView, 'the selected last row is inside the window').toBe(true)
      })

      test('removing the active row deep in a long list keeps the window and the selection in place', async ({ page }) => {
        watch(page, 'a designer deleting a selected stop in the middle of a long list')
        await open(page)
        await grow(page, MAX_STOPS)
        await select(page, 8)
        const was = await selection(page)
        expect(was.pressed).toEqual([8])
        await remove(page, 8)
        await expect(stopRows(page)).toHaveCount(MAX_STOPS - 1)
        await expect.poll(async () => (await selection(page)).pressed).toEqual([8])
        expect((await selection(page)).hexes[7], 'old row 9 slid into row 8').toBe(was.hexes[8])
        await windowSettled(page)
        expect(await windowScroll(page), 'the window did not return to the top').toBeGreaterThanOrEqual(pitch * 5)
      })

      // The angle lock sits at the top right of the angle row and holds the angle
      // through Random. A Radial gradient says it has no angle in the same row, and
      // the lock stays drawn there (the row never changes).
      test('Radial says it has no angle and the angle row keeps its lock; the angle lock holds the angle through Random', async ({ page }) => {
        watch(page, 'a designer on a radial gradient')
        await open(page)
        const panel = panelOf(page)

        await expect(page.locator('.grd-row--angle .grd-lock'), 'the angle lock is drawn').toHaveCount(1)
        await panel.getByRole('button', { name: 'Radial', exact: true }).click()
        await expect(page.locator('#grd-angle-none')).toContainText('Radial gradients have no angle')
        await expect(page.locator('.grd-row--angle .grd-lock'), 'the lock stays on Radial').toHaveCount(1)
        await panel.getByRole('button', { name: 'Linear', exact: true }).click()

        // Put the angle at 77, a value the roll is very unlikely to land on, then hold it.
        const field = page.getByRole('spinbutton', { name: 'Gradient angle in degrees' })
        await field.fill('77')
        await field.press('Enter')
        await expect(field).toHaveValue('77')
        const keep = page.locator('.grd-row--angle .grd-lock')
        await expect(keep).toHaveAttribute('aria-pressed', 'false')
        await keep.click()
        await expect(keep).toHaveAttribute('aria-pressed', 'true')
        for (let i = 0; i < 12; i++) {
          await toolbarAction(page, /^Random$/)
          // Radial has no angle field; only a type that draws one is read.
          if (await field.count()) await expect(field, `Random ${i + 1} kept the angle`).toHaveValue('77')
        }
        // Whatever the twelve rolls landed on, the angle underneath is still 77.
        await panel.getByRole('button', { name: 'Linear', exact: true }).click()
        await expect(field).toHaveValue('77')

        // The control: with the angle lock off, Random does move the angle.
        await keep.click()
        await expect(keep).toHaveAttribute('aria-pressed', 'false')
        let moved = false
        for (let i = 0; i < 30 && !moved; i++) {
          await toolbarAction(page, /^Random$/)
          await panel.getByRole('button', { name: 'Linear', exact: true }).click()
          moved = (await field.inputValue()) !== '77'
        }
        expect(moved, 'with the angle lock off, thirty Randoms never moved the angle').toBe(true)
      })
    })
  }
})

// THE FRAME (spec gradient-overhaul 7.3): at desktop sizes the editor fits one viewport
// with the page at scrollY 0. The stage is never portrait, adding a stop moves nothing,
// and --tl-bar-h is the toolbar's real height (the frame is built from it).
//
// MUTATIONS: `.grd .tl-grid { height: auto }` -> every bottom test; `max-height: 62cqi`
// dropped from the stage -> the 901/1000/1100 ratio test; `--tl-bar-h` changed -> the token test.
test.describe('the editor fits one frame at desktop sizes', () => {
  test.use({ reducedMotion: 'reduce' })
  const FRAMES = [[1280, 720], [1440, 900], [1920, 1080]]
  const bottomOf = (page, sel) => page.locator(sel).first().evaluate((el) => el.getBoundingClientRect().bottom)

  for (const [w, h] of FRAMES) {
    test(`at ${w}x${h} the rail, Copy, Random, the stop list and the type pills end inside the viewport`, async ({ page }) => {
      watch(page, 'a designer on a laptop')
      await page.setViewportSize({ width: w, height: h })
      await open(page)
      expect(await page.evaluate(() => window.scrollY)).toBe(0)
      for (const sel of ['.grd-rail', '.grd-copy', '.grd-gen', '.grd-stops', '.grd-paint', '[aria-label="Gradient type"]']) {
        const bottom = await bottomOf(page, sel)
        expect(bottom, `${sel} ends at ${Math.round(bottom)}px in a ${h}px viewport`).toBeLessThanOrEqual(h)
      }
      // Only the presets and the library lie below the frame.
      const gridBottom = await bottomOf(page, '.tl-grid')
      expect(gridBottom, 'the grid ends inside the viewport').toBeLessThanOrEqual(h)
    })

    test(`at ${w}x${h} adding a stop moves the rail by 0px`, async ({ page }) => {
      watch(page, 'a designer adding a stop')
      await page.setViewportSize({ width: w, height: h })
      await open(page)
      await reduceTo(page, 2)
      const top = () => page.locator('.grd-rail').evaluate((el) => el.getBoundingClientRect().top)
      const before = await top()
      for (let n = 3; n <= MAX_STOPS; n++) {
        await addButton(panelOf(page)).click()
        await expect(stopRows(page)).toHaveCount(n)
        expect(await top(), `the rail moved at ${n} stops`).toBe(before)
      }
    })
  }

  for (const w of [901, 1000, 1100]) {
    test(`at ${w}px wide the stage is never portrait`, async ({ page }) => {
      watch(page, 'a designer on a narrow desktop window')
      await page.setViewportSize({ width: w, height: 1100 })
      await open(page)
      const box = await page.locator('.grd-stage').evaluate((el) => { const r = el.getBoundingClientRect(); return { w: r.width, h: r.height } })
      expect(box.h, `${Math.round(box.w)}x${Math.round(box.h)}`).toBeLessThanOrEqual(box.w * 0.62 + 1)
    })
  }

  test('--tl-bar-h is the toolbar height', async ({ page }) => {
    watch(page, 'the frame arithmetic')
    await page.setViewportSize({ width: 1440, height: 900 })
    await open(page)
    const m = await page.evaluate(() => ({
      token: parseFloat(getComputedStyle(document.querySelector('.tl')).getPropertyValue('--tl-bar-h')),
      bar: document.querySelector('.tl-toolbar').getBoundingClientRect().height,
    }))
    expect(m.bar).toBe(m.token)
  })
})

// A pixel radius at or past half the side, or a percentage of 50 or more, draws a circle.
async function roundReport(page, selector) {
  return page.evaluate((sel) => {
    const els = [...document.querySelectorAll(sel)]
    const bad = []
    for (const el of els) {
      const cs = getComputedStyle(el)
      const r = el.getBoundingClientRect()
      const side = Math.min(r.width, r.height)
      const raw = cs.borderTopLeftRadius
      const radius = parseFloat(raw)
      const round = raw.endsWith('%') ? radius >= 50 : radius >= side / 2 - 0.5
      const square = Math.abs(r.width - r.height) <= 1
      if (!round || !square) bad.push(`${sel}: ${Math.round(r.width)}x${Math.round(r.height)} radius ${raw}`)
    }
    return { count: els.length, bad }
  }, selector)
}

test.describe('every swatch in the gradient panel is a circle', () => {
  for (const screen of [SCREENS[0], SCREENS[2]]) {
    test.describe(`at ${screen.w}px${screen.touch ? ' (touch)' : ''}`, () => {
      test.use({
        viewport: { width: screen.w, height: screen.h },
        hasTouch: screen.touch,
        isMobile: screen.touch,
        reducedMotion: 'reduce',
      })

      test('the stop row swatches are round', async ({ page }) => {
        watch(page, 'a designer looking at the stop swatches')
        await open(page)
        for (const sel of ['.grd-stop-swatch']) {
          const r = await roundReport(page, sel)
          expect(r.count, `${sel} is drawn`).toBeGreaterThan(0)
          expect(r.bad, r.bad.join('\n')).toEqual([])
        }
        // Still round at twelve stops, with the list scrolled.
        const panel = panelOf(page)
        while ((await stopRows(page).count()) < MAX_STOPS) await addButton(panel).click()
        const r = await roundReport(page, '.grd-stop-swatch')
        expect(r.count).toBe(MAX_STOPS)
        expect(r.bad, r.bad.join('\n')).toEqual([])
      })

      test('the palette row chips and the shades are round', async ({ page }) => {
        watch(page, 'a designer looking at the palette row chips')
        await withFullPalette(page)
        await open(page)
        const palette = await roundReport(page, '.grd-chips:not(.grd-chips--shades) .grd-chip')
        expect(palette.count, 'the palette row draws eight chips (five on touch) and a +N link').toBe(chipCapFor(screen.touch))
        expect(palette.bad, palette.bad.join('\n')).toEqual([])
        const shades = await roundReport(page, '.grd-chips--shades .grd-chip')
        expect(shades.count, 'eleven shade chips are drawn').toBe(11)
        expect(shades.bad, shades.bad.join('\n')).toEqual([])
      })

      test('the starter colours that stand in for a missing palette are round', async ({ page }) => {
        watch(page, 'a designer with no palette looking at the starter colours')
        await page.addInitScript(() => {
          localStorage.setItem('vs-current-design', JSON.stringify({
            palette: { base: '#0051FF', harmony: 'auto', extraColors: [], activeIdx: 0, colors: [] },
          }))
        })
        await open(page)
        const starters = await roundReport(page, '.grd-chips .grd-chip')
        expect(starters.count, 'the row draws eight starter chips (five on touch) and a +N link').toBe(chipCapFor(screen.touch))
        expect(starters.bad, starters.bad.join('\n')).toEqual([])
      })

      test('the picker a stop row opens has round colour samples', async ({ page }) => {
        watch(page, 'a designer opening a stop colour picker')
        await open(page)
        await page.getByRole('button', { name: 'Pick stop 2 colour' }).click()
        const pop = page.getByRole('dialog', { name: 'Pick stop 2 colour' })
        await expect(pop).toBeVisible()
        await expect(pop).toHaveClass(/grd-cpk-pop/)
        for (const sel of ['.cpk-pop.grd-cpk-pop .cpk-swatch', '.cpk-pop.grd-cpk-pop .cpk-chip']) {
          const r = await roundReport(page, sel)
          expect(r.count, `${sel} is drawn in the open picker`).toBeGreaterThan(0)
          expect(r.bad, r.bad.join('\n')).toEqual([])
        }
      })
    })
  }

  test.describe('beyond the stop rows', () => {
    test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })

    test('the tint menu chips are round', async ({ page }) => {
      watch(page, 'a Pro designer opening the tints')
      await signIn(page, { plan: 'pro' })
      await open(page)
      await page.getByRole('button', { name: /^Select stop 2, #[0-9A-F]{6}$/ }).click({ button: 'right' })
      const menu = page.getByRole('menu', { name: /^Tints of stop 2, #[0-9A-F]{6}$/ })
      await expect(menu).toBeVisible()
      const r = await roundReport(page, '.grd-tintmenu-chip')
      expect(r.count, 'eleven tint chips').toBe(11)
      expect(r.bad, r.bad.join('\n')).toEqual([])
    })

    test('the probe can tell a square from a circle', async ({ page }) => {
      watch(page, 'the round-swatch probe')
      await open(page)
      await page.evaluate(() => {
        for (const [id, css] of [['sq', 'border-radius:6px'], ['ci', 'border-radius:50%'], ['pill', 'border-radius:999px']]) {
          const d = document.createElement('div')
          d.id = `probe-${id}`
          d.className = 'probe-swatch'
          d.style.cssText = `width:20px;height:20px;${css}`
          document.body.append(d)
        }
      })
      const odd = await roundReport(page, '#probe-sq')
      expect(odd.bad.length, 'a 6px radius on a 20px square is not a circle').toBe(1)
      expect((await roundReport(page, '#probe-ci')).bad).toEqual([])
      expect((await roundReport(page, '#probe-pill')).bad).toEqual([])
    })
  })
})
