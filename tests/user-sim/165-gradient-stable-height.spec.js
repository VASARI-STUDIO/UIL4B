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
// 124px (172px on touch), and the code well is 152px at every format.
//
// MUTATIONS (each turns the tests named red):
//   .grd .grd-stops { height: auto }              -> the add/remove, window and rail tests
//   the Remove button enabled at 2 stops          -> "the Remove button is disabled at two stops"
//   the Add button unmounted at 12                -> "Add a stop stays drawn at twelve"
//   the angle row unmounted for Radial            -> the Linear > Radial > Conic sequence
//   .grd .grd-code { height: auto }               -> the CSS > Tailwind > SVG sequence
//   the palette note back in the flow             -> the "no palette" sequence
//   popClassName dropped from ColorPickerPop      -> the picker popover swatches
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
const addButton = (panel) => panel.getByRole('button', { name: /^(Add a stop|12 stops is the most)$/ })
const removeButtons = (panel) => panel.getByRole('button', { name: /^Remove stop \d+$/ })

/** Two animation frames: layout and any state-driven re-render have landed. */
const settle = (page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))

/** The sizes that must not move, in CSS pixels. */
const SHAPE_KEYS = ['page', 'panel', 'main', 'stage', 'window', 'code']
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

/** With no palette, "From palette" is aria-disabled but still answers a press with its note. */
const fromPalette = (page) => toolbarAction(page, /palette/i, { force: true })

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
          await expect(angleRow).toContainText('A radial gradient has no angle')
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

    test('Shuffle from palette with no palette lays its note over the canvas, and dismissing it changes nothing', async ({ page }) => {
      watch(page, 'a designer with no palette yet')
      await open(page)
      const l = ledger(page)
      await l.mark('before the note')
      const note = page.locator('.grd-note--palette')
      await expect(note).toHaveCount(0)

      await fromPalette(page)
      await expect(note).toBeVisible()
      await l.mark('note showing')

      // It is laid over the foot of the canvas, inside the canvas's own slot.
      const geo = await page.evaluate(() => {
        const n = document.querySelector('.grd-note--palette').getBoundingClientRect()
        const c = document.querySelector('.grd-canvas').getBoundingClientRect()
        return { noteTop: n.top, noteBottom: n.bottom, noteLeft: n.left, noteRight: n.right,
          canvasTop: c.top, canvasBottom: c.bottom, canvasLeft: c.left, canvasRight: c.right,
          inStage: !!document.querySelector('.grd-stage .grd-note--palette') }
      })
      expect(geo.inStage, 'the note is a child of the canvas slot').toBe(true)
      expect(geo.noteTop).toBeGreaterThanOrEqual(geo.canvasTop - 1)
      expect(geo.noteBottom).toBeLessThanOrEqual(geo.canvasBottom + 1)
      expect(geo.noteLeft).toBeGreaterThanOrEqual(geo.canvasLeft - 1)
      expect(geo.noteRight).toBeLessThanOrEqual(geo.canvasRight + 1)

      await fromPalette(page)
      await l.mark('pressed again with the note up')
      await page.getByRole('button', { name: 'Dismiss' }).click()
      await expect(note).toHaveCount(0)
      await l.mark('note dismissed')
      await fromPalette(page)
      await expect(note).toBeVisible()
      await l.mark('note back')
      expect(l.drift(), l.drift().join('\n')).toEqual([])
    })
  })
}

// At 390, 768 and 1440 both interpolation hints wrap to the same number of lines,
// so those widths cannot tell a shared cell from a swapped paragraph. At 400 the
// Perceived hint fits one line and the Standard hint needs two (measured), which
// is the width where a hint that is swapped in and out moves the page.
test.describe('the interpolation hint at the width where the two hints differ in length', () => {
  test.use({ viewport: { width: 400, height: 900 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' })

  test('the two hints wrap to different heights here, and switching still changes nothing', async ({ page }) => {
    watch(page, 'a designer on a mid-size phone comparing colour spaces')
    await open(page)
    const panel = panelOf(page)
    const lines = await page.evaluate(() => [...document.querySelectorAll('.grd-interp-hint')].map((p) => {
      const r = document.createRange()
      r.selectNodeContents(p)
      return Math.round(r.getBoundingClientRect().height)
    }))
    expect(lines.length, 'both hints are in the panel').toBe(2)
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

      test('the window is three rows tall (hand-checked sizes) and the code well is 152px', async ({ page }) => {
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
          expect(g.code, `code well at ${n} stops`).toBe(152)
          expect(g.overflowY).toBe('auto')
        }
      })

      // The design gives the button 36px (44 on touch), so the section body is
      // 168px (224 on touch) at every count.
      test('Add a stop is 36px tall, 44px on touch, at two stops and at twelve', async ({ page }) => {
        watch(page, 'a designer reading the panel')
        await open(page)
        const addH = screen.touch ? 44 : 36
        const panel = panelOf(page)
        await reduceTo(page, 2)
        const heightOf = () => page.locator('.grd-add').evaluate((el) => el.getBoundingClientRect().height)
        expect(await heightOf(), 'at 2 stops').toBe(addH)
        while ((await stopRows(page).count()) < MAX_STOPS) await addButton(panel).click()
        expect(await heightOf(), 'at 12 stops').toBe(addH)
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

  test('Add a stop stays drawn at twelve, disabled, and says why', async ({ page }) => {
    watch(page, 'a designer at the stop limit')
    await open(page)
    const panel = panelOf(page)
    while ((await stopRows(page).count()) < MAX_STOPS - 1) await addButton(panel).click()
    const add = panel.getByRole('button', { name: 'Add a stop', exact: true })
    await expect(add).toBeEnabled()
    await add.click()
    await expect(stopRows(page)).toHaveCount(MAX_STOPS)

    await expect(panel.getByRole('button', { name: 'Add a stop', exact: true })).toHaveCount(0)
    const full = panel.getByRole('button', { name: '12 stops is the most', exact: true })
    await expect(full).toBeVisible()
    await expect(full).toBeDisabled()
    await full.click({ force: true })
    await expect(stopRows(page)).toHaveCount(MAX_STOPS)

    // Taking one away brings the working button back.
    await removeButtons(panel).last().click()
    await expect(panel.getByRole('button', { name: 'Add a stop', exact: true })).toBeEnabled()
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

      test('the stop rows and the selected stop swatch are round', async ({ page }) => {
        watch(page, 'a designer looking at the stop swatches')
        await open(page)
        for (const sel of ['.grd-stop-swatch', '.grd-pick-swatch .cpk-trigger', '.grd-pick-swatch .cpk-trigger-chip']) {
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

      test('the picker the Selected stop swatch opens has round colour samples', async ({ page }) => {
        watch(page, 'a designer opening the selected stop picker')
        await open(page)
        await page.locator('.grd-pick-swatch .cpk-trigger').click()
        const pop = page.getByRole('dialog', { name: /^Stop \d+ colour$/ })
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
