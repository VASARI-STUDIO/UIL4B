// THE BENCH RAIL LIGHTS THE WINDOW YOU ARE LOOKING AT — EXACTLY, BOTH WAYS.
//
// "the sticky scroll section — the highlight
// of the left text is buggy." The rail beside the four tool windows must light
// the window nearest the middle of the screen, which is the design's own rule
// (its tick(): the panel whose centre is closest to the viewport's centre).
//
// So the oracle here is GEOMETRY, measured in the page at rest: which
// `[data-panel]` window's centre is nearest the viewport's centre. The rail's
// lit row must be that window's row, and only that row, at every resting
// point — scrolling down through all four windows, back up through all four,
// after a fast fling in each direction, and after each rail row is pressed (an
// anchor jump). A rail that lags a window, sticks after a fling, only updates
// in one direction or lights two rows fails one of these.
//
// Mobile first: the same walk runs at 390, where the rail sits
// above the windows rather than beside them but still lights the one in view.
import { test, expect } from './base.js'
import { go, watch, wheelToRest, restAfterMove } from './helpers.js'

/** Which window is nearest the viewport centre, and which rail rows are lit. */
const railState = (page) => page.evaluate(() => {
  const mid = window.innerHeight / 2
  const panels = [...document.querySelectorAll('.sp-panel[data-panel]')]
  let nearest = -1
  let best = Infinity
  panels.forEach((el, i) => {
    const r = el.getBoundingClientRect()
    const d = Math.abs(r.top + r.height / 2 - mid)
    if (d < best) { best = d; nearest = i }
  })
  const lit = [...document.querySelectorAll('.sp-rail-row')]
    .map((row, i) => (row.classList.contains('is-on') ? i : -1))
    .filter((i) => i > -1)
  return { nearest, lit, panels: panels.length }
})

/** At rest, the lit row is the nearest window's row and no other. */
async function expectRailTracks(page, where) {
  // The rail updates on the next animation frame after the last scroll event,
  // so poll the pair together rather than reading once.
  await expect.poll(async () => {
    const s = await railState(page)
    return JSON.stringify({ lit: s.lit, want: [s.nearest] })
  }, { message: `${where}: the lit rail row is not the window in view`, timeout: 4000 })
    .toMatch(/^\{"lit":\[(\d)\],"want":\[\1\]\}$/)
  return (await railState(page)).nearest
}

async function openBench(page) {
  await go(page, '/')
  await expect(page.locator('.sp-panel[data-panel]'), 'the bench no longer has its four windows').toHaveCount(4)
  await expect(page.locator('.sp-rail-row'), 'the rail no longer has its four rows').toHaveCount(4)
  await page.mouse.move(Math.round(page.viewportSize().width / 2), 300)
  // Wheel down until the first window is the one in view.
  for (let i = 0; i < 30; i += 1) {
    const top = await page.locator('.sp-panel[data-panel="0"]').evaluate((el) => el.getBoundingClientRect().top)
    if (top < page.viewportSize().height * 0.5) break
    await wheelToRest(page, 400, 'scrolling to the bench')
  }
}

/** Wheel in one direction in small steps, checking the rail at every rest. */
async function walk(page, dy, where) {
  const seen = new Set()
  for (let i = 0; i < 60; i += 1) {
    seen.add(await expectRailTracks(page, `${where}, step ${i}`))
    const lastTop = await page.locator(`.sp-panel[data-panel="${dy > 0 ? 3 : 0}"]`)
      .evaluate((el) => el.getBoundingClientRect().top)
    const h = page.viewportSize().height
    if (dy > 0 ? lastTop < h * 0.2 : lastTop > h * 0.8) break
    await wheelToRest(page, dy, where)
  }
  return seen
}

for (const width of [390, 1440]) {
  test.describe(`the bench rail at ${width}px`, () => {
    test.use({ viewport: { width, height: width === 390 ? 844 : 900 } })
    test.beforeEach(async ({ page }) => { watch(page, 'a visitor reading the bench on the sales page') })

    test('it lights the window in view, down through all four and back up through all four', async ({ page }) => {
      // Two full walks of a 3,700px bench, resting at every step: this is slow on purpose.
      test.setTimeout(180000)
      await openBench(page)
      const down = await walk(page, 260, 'scrolling down')
      expect([...down].sort(), 'scrolling down did not pass every window with its row lit').toEqual([0, 1, 2, 3])
      const up = await walk(page, -260, 'scrolling up')
      expect([...up].sort(), 'scrolling up did not pass every window with its row lit').toEqual([0, 1, 2, 3])
    })

    test('it keeps up with a fast fling, in both directions', async ({ page }) => {
      await openBench(page)
      const from = await page.evaluate(() => window.scrollY)
      for (let i = 0; i < 4; i += 1) await page.mouse.wheel(0, 900)
      await restAfterMove(page, from, 'a fling down the bench')
      await expectRailTracks(page, 'after a fling down')
      const back = await page.evaluate(() => window.scrollY)
      for (let i = 0; i < 4; i += 1) await page.mouse.wheel(0, -700)
      await restAfterMove(page, back, 'a fling back up the bench')
      await expectRailTracks(page, 'after a fling up')
    })
  })
}

test.describe('the bench rail rows as anchors', () => {
  test.use({ viewport: { width: 1440, height: 900 } })
  test.beforeEach(async ({ page }) => { watch(page, 'a visitor jumping between tools from the rail') })

  test('pressing a row brings its window into view and lights that row, in any order', async ({ page }) => {
    await openBench(page)
    for (const i of [3, 1, 2, 0, 3]) {
      const from = await page.evaluate(() => window.scrollY)
      await page.locator('.sp-rail-row').nth(i).click()
      await restAfterMove(page, from, `pressing rail row ${i + 1}`)
      const nearest = await expectRailTracks(page, `after pressing rail row ${i + 1}`)
      expect(nearest, `pressing rail row ${i + 1} brought window ${nearest + 1} into view`).toBe(i)
    }
  })
})
