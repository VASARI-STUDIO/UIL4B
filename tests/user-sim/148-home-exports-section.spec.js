// THE HOMEPAGE'S "STUDIO QUALITY EXPORTS" SECTION, AS A VISITOR MEETS IT.
//
// Three stacking cards. Card 1 is a live panel; cards 2 and 3 each put a plate
// (a real render of the product's own export, from public/home-exports/) in the
// stage with a row of buttons under it: card 2 a tab strip (UI kit, Book, Brand
// deck), card 3 a radio group of example projects shown as a shelf of their three real
// book covers (the chosen one in front).
//
//   1. ONE FRAME. All three .sp-stack-card boxes are the same width and height at
//      390 (a touch phone), 768 and 1440, in light and dark. Read as layout sizes
//      (offsetWidth/offsetHeight), because at 1440 a covered card is scaled by a
//      transform and getBoundingClientRect would report the shrunk box.
//   2. THE TABS. Arrows (wrapping), Home and End move the selection and focus;
//      aria-selected and the tabpanel's name and picture change together; the
//      plate is never blank part-way through a swap; and nothing below the card
//      moves (the next section's document position, the card and plate sizes).
//   3. THE PICTURE IS SHARP ENOUGH. The file the browser chose for the shown plate
//      is a /home-exports/ file whose width, read from its own name, is at least
//      the width it is painted at times the device pixel ratio. The painted width
//      is worked out from object-fit: contain and the file's aspect ratio, not
//      from the box, because a contained picture does not fill its box.
//   4. REDUCED MOTION. The fade and the slide are off: the plate's computed
//      transition and animation durations are 0 and no transition or animation
//      runs on a swap. The same flow with motion allowed does animate, so the
//      detector is known to see motion. Both inputs are covered, the OS setting
//      and the Settings choice, which wins in both directions. The check is for
//      exactly 0: the section's own rule for the plate pictures. Without it the
//      site-wide reduced-motion backstop in global.css still cuts every duration to
//      0.01ms (computed "1e-05s"), which the eye cannot tell from instant but which
//      still runs, and which this file is there to catch the loss of.
//   5. ONLY WHAT IS SHOWN IS FETCHED. Until the visitor hovers or focuses another
//      tab (or project), only the selected one's picture is requested.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const CARD = '.sp-stack-card'
// Card 3's pictures are the shelf's covers; the one in front carries is-on, as a plate's shown picture does.
const ART_IMG = '.sp-plate-art img, .sp-shelf img'
const SHOWN = '.sp-plate-art img.is-on, .sp-shelf img.is-on'

// Card 2 has the tabs UI kit, Book and Brand deck, card 3 the projects Northbeam, Halcyon
// and Ferrule. Their ORDER is the design's to change, so nothing here counts on it: a
// button is known by its label, and the picture it should show by this table.
// Each button is known by what its accessible name starts with, because the same
// choice is offered as pills under the plate (below 1200px) and as rows in the copy
// column (from 1200px), and only the one on show is in the page's accessibility tree.
// The deck's wide picture is guide-overview (the palette slide over a strip of slides); its phone plate is still guide-palette-p.
const TAB_FILE = { 'Design system book': 'book-colour', 'Brand deck': 'guide-overview', 'UI kit': 'kit-colour' }
const PROJECT_FILE = { Northbeam: 'cover-northbeam', Halcyon: 'cover-halcyon', Ferrule: 'cover-ferrule' }
const fileOf = (table, name) => Object.entries(table).find(([k]) => name.startsWith(k))?.[1]

async function open(browser, { width, height = 900, touch = false, theme = 'dark', dpr = 1, reducedMotion = 'no-preference', appearance } = {}) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    colorScheme: theme,
    reducedMotion,
    deviceScaleFactor: dpr,
    ...(touch ? { hasTouch: true, isMobile: true } : {}),
  })
  await ctx.addInitScript(([t, a]) => {
    try {
      localStorage.setItem('vs-t', t)
      if (a) localStorage.setItem('vs-appearance', JSON.stringify(a))
    } catch { /* private mode */ }
  }, [theme, appearance])
  const page = await ctx.newPage()
  watch(page, 'a visitor on the homepage')
  return { ctx, page }
}

const card = (page, i) => page.locator(CARD).nth(i)
const tablist = (page) => card(page, 1).getByRole('tablist', { name: 'Export type' })
const tabs = (page) => tablist(page).getByRole('tab')
const radios = (page) => card(page, 2).getByRole('radiogroup', { name: 'Example projects' }).getByRole('radio')

const nameOf = async (locator) => (await locator.getAttribute('aria-label')) || ''
/** The picture id that the tab / project at this position in the row should show. */
async function tabId(page, i) {
  const name = await nameOf(tabs(page).nth(i))
  expect(fileOf(TAB_FILE, name), `tab ${i + 1} ("${name}") is a known tab`).toBeTruthy()
  const id = fileOf(TAB_FILE, name)
  // Up to 760px the <picture> serves the portrait plate, and the deck's portrait is still guide-palette-p (the overview strip is landscape only).
  return id === 'guide-overview' && page.viewportSize().width <= 760 ? 'guide-palette' : id
}
async function projectId(page, i) {
  const name = await nameOf(radios(page).nth(i))
  expect(fileOf(PROJECT_FILE, name), `project ${i + 1} ("${name}") is a known project`).toBeTruthy()
  return fileOf(PROJECT_FILE, name)
}

/** Bring card i on screen (the pictures are lazy: they load only once in view). */
async function show(page, i) {
  await card(page, i).scrollIntoViewIfNeeded()
}

/** Come back when card i is showing a picture whose file name contains `id`. */
async function waitShown(page, i, id) {
  await expect.poll(
    () => card(page, i).locator(SHOWN).evaluateAll((els) => els.map((el) => el.currentSrc)),
    { message: `card ${i + 1} never showed ${id}`, timeout: 10000 },
  ).toEqual([expect.stringContaining(`/home-exports/${id}`)])
}

/** Two frames, so a transition or animation the last change started has begun. */
const twoFrames = (page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))

const docTop = (page, sel) => page.locator(sel).evaluate((el) => el.getBoundingClientRect().top + window.scrollY)

// ── 1. one frame ───────────────────────────────────────────────────────────────

const FRAMES = [
  { width: 390, height: 844, touch: true, tall: 710 },
  { width: 768, height: 1024, touch: false, tall: 780 },
  { width: 1440, height: 900, touch: false, tall: 592 },
]

for (const { width, height, touch, tall } of FRAMES) {
  for (const theme of ['light', 'dark']) {
    test.describe(`the three cards at ${width}px, ${theme}`, () => {
      test('are exactly the same size', async ({ browser }) => {
        const { ctx, page } = await open(browser, { width, height, touch, theme })
        await go(page, '/')
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
        await expect(page.locator(CARD)).toHaveCount(3)
        await show(page, 2)
        const sizes = await page.locator(CARD).evaluateAll((els) => els.map((el) => [el.offsetWidth, el.offsetHeight]))
        expect(sizes[1], 'card 2 is the size of card 1').toEqual(sizes[0])
        expect(sizes[2], 'card 3 is the size of card 1').toEqual(sizes[0])
        // The designed height at this width (the width is the column's, so it is not pinned here).
        // At 768 the height follows the card's own width, so a pixel of rounding is allowed.
        expect(Math.abs(sizes[0][1] - tall), `the frame is ${tall}px tall (it is ${sizes[0][1]})`).toBeLessThanOrEqual(1)
        expect(sizes[0][0], 'the frame has a width').toBeGreaterThan(300)
        await ctx.close()
      })
    })
  }
}

// ── 2. the tabs ────────────────────────────────────────────────────────────────

/** Which tab is selected, which is in the tab order, who has focus, and what the panel says. */
const tabState = (page) => tablist(page).evaluate((list) => {
  const tabsOn = [...list.querySelectorAll('[role="tab"]')]
  const panel = list.closest('.sp-stack-card').querySelector('[role="tabpanel"]')
  const namer = panel?.getAttribute('aria-labelledby')
  return {
    selected: tabsOn.map((t, i) => (t.getAttribute('aria-selected') === 'true' ? i : -1)).filter((i) => i > -1),
    tabbable: tabsOn.map((t, i) => (t.tabIndex === 0 ? i : -1)).filter((i) => i > -1),
    focused: tabsOn.findIndex((t) => t === document.activeElement),
    controls: tabsOn.map((t) => t.getAttribute('aria-controls')),
    panelId: panel?.id,
    // The panel is named by the tab at the same position: the pill and the row with the same
    // index share a suffix, and the named one is the selected one.
    namedIndex: namer ? Number(/-(\d+)$/.exec(namer)?.[1]) : -1,
    namerSelected: document.getElementById(namer)?.getAttribute('aria-selected'),
    count: tabsOn.length,
  }
})

/** The tab, the panel's name and the picture all agree on tab i. */
async function expectTab(page, i, where) {
  const s = await tabState(page)
  expect(s.selected, `${where}: the selected tab`).toEqual([i])
  expect(s.tabbable, `${where}: only the selected tab is in the tab order`).toEqual([i])
  expect(s.focused, `${where}: focus is on the selected tab`).toBe(i)
  expect(s.namedIndex, `${where}: the panel is named by the selected tab`).toBe(i)
  expect(s.namerSelected, `${where}: the tab that names the panel is selected`).toBe('true')
  expect(s.controls, `${where}: every tab controls the panel`).toEqual(Array(s.count).fill(s.panelId))
  await waitShown(page, 1, (await tabId(page, i)))
}

for (const [width, height, touch] of [[1440, 900, false], [390, 844, true]]) {
  test.describe(`card 2's tabs at ${width}px`, () => {
    test('are a labelled tablist of three tabs over one tabpanel', async ({ browser }) => {
      const { ctx, page } = await open(browser, { width, height, touch })
      await go(page, '/')
      await show(page, 1)
      await expect(tablist(page)).toBeVisible()
      const shown = await tabs(page).evaluateAll((els) => els.map((el) => ({
        // The visible label: the row's title, or the pill's own text.
        label: (el.querySelector('.sp-rows-lab, .sp-lab-full, span') || el).textContent.trim(),
        name: el.getAttribute('aria-label') || '',
      })))
      expect(shown.length, 'three tabs').toBe(3)
      expect(shown.map((t) => fileOf(TAB_FILE, t.name)).sort(), 'the tabs are Book, Brand deck and UI kit').toEqual(['book-colour', 'guide-overview', 'kit-colour'])
      await expect(card(page, 1).getByRole('tabpanel')).toHaveCount(1)
      shown.forEach((t, i) => expect(t.name.toLowerCase(), `tab ${i + 1}'s accessible name holds its visible label`).toContain(t.label.toLowerCase()))
      const s = await tabState(page)
      expect(s.selected, 'the first tab starts selected').toEqual([0])
      await waitShown(page, 1, (await tabId(page, 0)))
      await ctx.close()
    })

    test('arrows wrap round, Home and End jump, and the picture follows the selection', async ({ browser }) => {
      const { ctx, page } = await open(browser, { width, height, touch })
      await go(page, '/')
      await show(page, 1)
      await tabs(page).nth(0).focus()
      await expectTab(page, 0, 'at rest')

      await page.keyboard.press('ArrowRight')
      await expectTab(page, 1, 'ArrowRight from UI kit')
      await page.keyboard.press('ArrowRight')
      await expectTab(page, 2, 'ArrowRight from Book')
      await page.keyboard.press('ArrowRight')
      await expectTab(page, 0, 'ArrowRight from the last tab wraps to the first')
      await page.keyboard.press('ArrowLeft')
      await expectTab(page, 2, 'ArrowLeft from the first tab wraps to the last')
      await page.keyboard.press('ArrowLeft')
      await expectTab(page, 1, 'ArrowLeft from Brand deck')
      await page.keyboard.press('Home')
      await expectTab(page, 0, 'Home')
      await page.keyboard.press('End')
      await expectTab(page, 2, 'End')
      await page.keyboard.press('ArrowDown')
      await expectTab(page, 0, 'ArrowDown is Right')
      await page.keyboard.press('ArrowUp')
      await expectTab(page, 2, 'ArrowUp is Left')
      await ctx.close()
    })

    test('a click selects, and Tab from the selected tab goes to the panel, not a sibling tab', async ({ browser }) => {
      const { ctx, page } = await open(browser, { width, height, touch })
      await go(page, '/')
      await show(page, 1)
      await tabs(page).nth(1).click()
      await waitShown(page, 1, (await tabId(page, 1)))
      const s = await tabState(page)
      expect(s.selected, 'clicking Book selects it').toEqual([1])
      expect(s.tabbable, 'Book is the only tab in the tab order').toEqual([1])
      await tabs(page).nth(1).focus()
      await page.keyboard.press('Tab')
      const where = await page.evaluate(() => document.activeElement?.getAttribute('role') || document.activeElement?.className)
      expect(where, 'Tab leaves the tablist').not.toBe('tab')
      await ctx.close()
    })

    test('switching tabs moves nothing below the card', async ({ browser }) => {
      const { ctx, page } = await open(browser, { width, height, touch })
      await go(page, '/')
      await show(page, 1)
      await waitShown(page, 1, (await tabId(page, 0)))
      const before = {
        next: await docTop(page, '#discover'),
        card: await card(page, 1).evaluate((el) => [el.offsetWidth, el.offsetHeight]),
        plate: await card(page, 1).locator('.sp-plate').evaluate((el) => [el.offsetWidth, el.offsetHeight]),
        height: await page.evaluate(() => document.scrollingElement.scrollHeight),
      }
      // Each step: the tab it should land on, and how to get there.
      for (const [i, how] of [[1, 'click'], [2, 'click'], [0, 'click'], [2, 'End'], [0, 'Home'], [1, 'ArrowRight']]) {
        if (how === 'click') await tabs(page).nth(i).click()
        else {
          await tabs(page).nth((await tabState(page)).selected[0]).focus()
          await page.keyboard.press(how)
        }
        await waitShown(page, 1, (await tabId(page, i)))
        await twoFrames(page)
        expect(await docTop(page, '#discover'), `the next section moved after switching to tab ${i + 1} by ${how}`).toBeCloseTo(before.next, 0)
        expect(await card(page, 1).evaluate((el) => [el.offsetWidth, el.offsetHeight]), 'the card resized').toEqual(before.card)
        expect(await card(page, 1).locator('.sp-plate').evaluate((el) => [el.offsetWidth, el.offsetHeight]), 'the plate resized').toEqual(before.plate)
      }
      expect(await page.evaluate(() => document.scrollingElement.scrollHeight), 'the page changed height').toBe(before.height)
      await ctx.close()
    })
  })
}

test.describe("card 3's radio group", () => {
  test('arrows, Home and End move the checked project and its cover together', async ({ browser }) => {
    const { ctx, page } = await open(browser, { width: 1440, height: 900 })
    await go(page, '/')
    await show(page, 2)
    await expect(radios(page)).toHaveCount(3)
    const state = () => radios(page).evaluateAll((els) => ({
      checked: els.map((el, i) => (el.getAttribute('aria-checked') === 'true' ? i : -1)).filter((i) => i > -1),
      focused: els.findIndex((el) => el === document.activeElement),
    }))
    const expectProject = async (i, where) => {
      const s = await state()
      expect(s.checked, `${where}: the checked project`).toEqual([i])
      expect(s.focused, `${where}: focus is on the checked project`).toBe(i)
      await waitShown(page, 2, (await projectId(page, i)))
    }
    await radios(page).nth(0).focus()
    await expectProject(0, 'at rest')
    await page.keyboard.press('ArrowRight')
    await expectProject(1, 'ArrowRight')
    await page.keyboard.press('End')
    await expectProject(2, 'End')
    await page.keyboard.press('ArrowRight')
    await expectProject(0, 'ArrowRight from the last wraps')
    await page.keyboard.press('ArrowLeft')
    await expectProject(2, 'ArrowLeft from the first wraps')
    await page.keyboard.press('Home')
    await expectProject(0, 'Home')
    await ctx.close()
  })

  test('switching project moves nothing below the card', async ({ browser }) => {
    const { ctx, page } = await open(browser, { width: 390, height: 844, touch: true })
    await go(page, '/')
    await show(page, 2)
    await waitShown(page, 2, (await projectId(page, 0)))
    const next = await docTop(page, '#discover')
    const box = await card(page, 2).evaluate((el) => [el.offsetWidth, el.offsetHeight])
    for (const i of [1, 2, 0]) {
      await radios(page).nth(i).click()
      await waitShown(page, 2, (await projectId(page, i)))
      await twoFrames(page)
      expect(await docTop(page, '#discover'), `the next section moved after choosing project ${i + 1}`).toBeCloseTo(next, 0)
      expect(await card(page, 2).evaluate((el) => [el.offsetWidth, el.offsetHeight])).toEqual(box)
    }
    await ctx.close()
  })
})

/**
 * Start sampling, every frame, the highest opacity of any picture in card i.
 * Reads the painted opacity, not the is-on class: a picture can hold the class
 * while an animation has it at 0.
 */
const startOpacityWatch = (page, i) => card(page, i).evaluate((c, sel) => {
  window.__minPeak = 1
  window.__frames = 0
  const tick = () => {
    const peak = Math.max(0, ...[...c.querySelectorAll(sel)].map((im) => parseFloat(getComputedStyle(im).opacity)))
    window.__minPeak = Math.min(window.__minPeak, peak)
    window.__frames += 1
    window.__peakRaf = requestAnimationFrame(tick)
  }
  tick()
}, ART_IMG)
const stopOpacityWatch = (page) => page.evaluate(() => {
  cancelAnimationFrame(window.__peakRaf)
  return { minPeak: window.__minPeak, frames: window.__frames }
})

test.describe('a swap never blanks the plate', () => {
  // A crossfade has the leaving picture at 1 falling to 0 over 150ms while the arriving
  // one rises from 0 over 240ms, so the brighter of the two is never below about 0.5.
  // Card 3's shelf never fades a cover out: the front is at 1 and the others at .72.
  // Below 0.2 the plate is, to the eye, empty.
  const FLOOR = 0.2

  test("card 2: the first and the following tab changes keep a picture on the plate in every frame", async ({ browser }) => {
    const { ctx, page } = await open(browser, { width: 1440, height: 900, reducedMotion: 'no-preference' })
    await go(page, '/')
    await show(page, 1)
    await waitShown(page, 1, (await tabId(page, 0)))
    await startOpacityWatch(page, 1)
    await tabs(page).nth(1).click()
    await waitShown(page, 1, (await tabId(page, 1)))
    await tabs(page).nth(2).click()
    await waitShown(page, 1, (await tabId(page, 2)))
    await twoFrames(page)
    const seen = await stopOpacityWatch(page)
    expect(seen.frames, 'the watcher ran').toBeGreaterThan(5)
    expect(seen.minPeak, 'the most visible picture, in the emptiest frame of the swaps').toBeGreaterThanOrEqual(FLOOR)
    await ctx.close()
  })

  test("card 3: the first and the following project changes keep a picture on the plate in every frame", async ({ browser }) => {
    const { ctx, page } = await open(browser, { width: 1440, height: 900, reducedMotion: 'no-preference' })
    await go(page, '/')
    await show(page, 2)
    await waitShown(page, 2, (await projectId(page, 0)))
    await startOpacityWatch(page, 2)
    await radios(page).nth(1).click()
    await waitShown(page, 2, (await projectId(page, 1)))
    await radios(page).nth(2).click()
    await waitShown(page, 2, (await projectId(page, 2)))
    await twoFrames(page)
    const seen = await stopOpacityWatch(page)
    expect(seen.frames, 'the watcher ran').toBeGreaterThan(5)
    expect(seen.minPeak, 'the most visible picture, in the emptiest frame of the swaps').toBeGreaterThanOrEqual(FLOOR)
    await ctx.close()
  })
})

test.describe("card 3's shelf stacking while a pick moves", () => {
  // z-index does not tween, so the shelf holds it for 120ms (half of the 240ms move) and flips it on
  // both covers in the same frame: the leaving front cover stays on top for the first half, and the
  // two never tie. These read the computed z-index and opacity of the three covers on every frame.

  /**
   * Make the picks in the page (the page draws the new state on the next frame, which is "frame 1" of that pick)
   * and read the three covers on every animation frame until `until` ms after the first pick.
   * picks: [{ index, at }] with `at` the ms since the start (the first is 0).
   * Returns every frame's time, z-index, opacity and data-pos for the three covers, and `pickFrames`: the
   * index in `frames` of the frame each pick was made in (it is read before the page draws the pick).
   */
  const sampleShelf = (page, picks, until) => page.evaluate(({ picks, until }) => new Promise((resolve) => {
    const cardEl = document.querySelectorAll('.sp-stack-card')[2]
    const radioEls = [...cardEl.querySelectorAll('[role="radio"]')]
    const imgs = [...cardEl.querySelectorAll('.sp-shelf img')]
    const frames = []
    const pickFrames = []
    const picked = []
    let next = 0
    const t0 = performance.now()
    const tick = (now) => {
      while (next < picks.length && now - t0 >= picks[next].at) {
        radioEls[picks[next].index].click()
        pickFrames.push(frames.length)
        picked.push(Math.round(now - t0))
        next++
      }
      const cs = imgs.map((el) => getComputedStyle(el))
      frames.push({ t: Math.round(now - t0), z: cs.map((c) => c.zIndex), o: cs.map((c) => Number(c.opacity)), pos: imgs.map((el) => el.dataset.pos) })
      if (now - t0 < until) requestAnimationFrame(tick)
      else resolve({ pickFrames, frames, picked })
    }
    requestAnimationFrame(tick)
  }), { picks, until })

  /** The cover (its DOM index) in front in frame `i`. */
  const frontIn = (frames, i) => frames[i].pos.indexOf('front')

  async function openShelf(browser) {
    const { ctx, page } = await open(browser, { width: 1440, height: 900, reducedMotion: 'no-preference' })
    await go(page, '/')
    await show(page, 2)
    await waitShown(page, 2, (await projectId(page, 0)))
    await expect(card(page, 2).locator('.sp-shelf img')).toHaveCount(3)
    await twoFrames(page)
    return { ctx, page }
  }

  test('the leaving front cover stays above the arriving one until the midpoint, then they swap and never tie', async ({ browser }) => {
    const { ctx, page } = await openShelf(browser)
    const { pickFrames, frames: all } = await sampleShelf(page, [{ index: 1, at: 0 }], 320)
    expect(pickFrames, 'the pick was made on the first frame read').toEqual([0])
    const oldFront = frontIn(all, 0)
    const arriving = frontIn(all, 1)
    const frames = all.slice(1) // frame 1 is the first frame that draws the pick
    expect(arriving, 'the pick brought another cover to the front').not.toBe(oldFront)
    expect(frames.length, 'frames read').toBeGreaterThanOrEqual(12)
    const z = (f, i) => Number(f.z[i])
    // Frame 1: the arriving cover has not jumped over the leaving one.
    expect(z(frames[0], oldFront), 'old front z-index on frame 1').toBeGreaterThan(z(frames[0], arriving))
    // No frame has them level (a tie would leave the paint order to the DOM order).
    const ties = frames.filter((f) => z(f, oldFront) === z(f, arriving)).map((f) => `${f.t}ms z=${f.z}`)
    expect(ties, 'frames where the two covers share a z-index').toEqual([])
    // The flip is held for the first half of the move and has happened by the end.
    const flipAt = frames.findIndex((f) => z(f, arriving) > z(f, oldFront))
    expect(flipAt, 'the arriving cover reaches the top').toBeGreaterThan(0)
    expect(frames[flipAt].t, 'ms before the flip (the midpoint is 120)').toBeGreaterThanOrEqual(100)
    const last = frames[frames.length - 1]
    expect(z(last, arriving), 'arriving cover z-index at the end').toBe(3)
    expect(z(last, oldFront), 'old front cover z-index at the end').toBe(1)
    // After the flip it stays flipped: no flicker back.
    expect(frames.slice(flipAt).every((f) => z(f, arriving) > z(f, oldFront)), 'the order holds once flipped').toBe(true)
    await ctx.close()
  })

  test('the leaving front cover holds full opacity until about the z flip (120ms), then fades to the back-cover opacity', async ({ browser }) => {
    const { ctx, page } = await openShelf(browser)
    const { frames: all } = await sampleShelf(page, [{ index: 1, at: 0 }], 420)
    const oldFront = frontIn(all, 0)
    const frames = all.slice(1) // frame 1 is the first frame that draws the pick
    expect(frontIn(all, 1), 'the pick moved the front').not.toBe(oldFront)
    expect(all[0].o[oldFront], 'the leaving cover starts at 1 (it is the front)').toBe(1)
    // The opacity fade starts after a 120ms delay; the last frame before 110ms must still read 1.
    const early = frames.filter((f) => f.t < 110)
    // (A busy machine draws few frames, so what is asked is that the hold was seen well into the window, not a frame count.)
    expect(early.length, 'frames read before 110ms (not a test of nothing)').toBeGreaterThanOrEqual(2)
    expect(Math.max(...early.map((f) => f.t)), 'the latest frame read inside the hold').toBeGreaterThanOrEqual(50)
    expect(early.filter((f) => f.o[oldFront] !== 1).map((f) => `${f.t}ms o=${f.o[oldFront]}`),'frames before 110ms where the leaving cover had already faded').toEqual([])
    // Then it does fade: it is below 1 by 200ms and at the back cover's .72 by the end.
    expect(frames.some((f) => f.t >= 130 && f.t <= 260 && f.o[oldFront] < 1), 'the leaving cover fades after the hold').toBe(true)
    expect(frames[frames.length - 1].o[oldFront], 'the leaving cover ends as a back cover').toBeCloseTo(0.72, 2)
    await ctx.close()
  })

  test('a second pick 60ms into the first keeps every cover visible and ends with the new front on top (3) and the others at 1', async ({ browser }) => {
    const { ctx, page } = await openShelf(browser)
    const { pickFrames, frames: all, picked } = await sampleShelf(page, [{ index: 1, at: 0 }, { index: 2, at: 60 }], 520)
    const oldFront = frontIn(all, 0)
    const a = frontIn(all, pickFrames[0] + 1)
    const b = frontIn(all, pickFrames[1] + 1)
    const frames = all.slice(1)
    expect(new Set([oldFront, a, b]).size, 'three different covers came to the front in turn').toBe(3)
    expect(picked[1], 'the second pick landed before the midpoint of the first').toBeLessThan(120)
    expect(Math.min(...frames.flatMap((f) => f.o)), 'the faintest cover in any frame').toBeGreaterThan(0)
    // The first pick's cover never reaches the top: its pick was replaced before its flip.
    const z = (f, i) => Number(f.z[i])
    expect(frames.some((f) => z(f, a) > z(f, oldFront) && z(f, a) > z(f, b)), 'the replaced pick never took the top').toBe(false)
    const last = frames[frames.length - 1]
    expect(last.z.map(Number), 'final z-index of each cover').toEqual([0, 1, 2].map((i) => (i === b ? 3 : 1)))
    expect(last.pos[b], 'the second pick is in front').toBe('front')
    await ctx.close()
  })
})

/**
 * Come back when nothing on the shelf is moving. A pick starts a 240ms move (and a 120ms hold on the
 * stacking order), so a cover's box read straight after a click is somewhere short of where it ends
 * up, and a click aimed from that box lands on the front cover or the card instead. Waits on the
 * running animations themselves, not a timer, after two frames so that a pick the page has just
 * been given has started its moves.
 */
const shelfSettled = (page) => page.evaluate(async () => {
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
  const moving = () => document.getAnimations().filter((a) => a.effect?.target?.closest?.('.sp-shelf') && a.playState !== 'finished')
  for (let list = moving(), n = 0; list.length && n < 20; list = moving(), n += 1) await Promise.allSettled(list.map((a) => a.finished))
})

/**
 * Aim at the middle of the part of the `side` back cover that shows: past the front cover's edge and
 * inside the plate and the window (on a phone the plate crops a back cover). Returns the cover's file
 * and a function that clicks there.
 */
async function aimAtBackCover(page, side) {
  await shelfSettled(page)
  const cover = card(page, 2).locator(`.sp-shelf img[data-pos="${side}"]`)
  const src = await cover.evaluate((el) => el.currentSrc)
  const x = await cover.evaluate((el, s) => {
    const c = el.getBoundingClientRect()
    const front = el.parentElement.querySelector('[data-pos="front"]').getBoundingClientRect()
    const plate = el.closest('.sp-plate').getBoundingClientRect()
    const lo = s === 'right' ? Math.max(front.right, c.left, plate.left) : Math.max(c.left, plate.left, 0)
    const hi = s === 'right' ? Math.min(c.right, plate.right, innerWidth) : Math.min(front.left, c.right, plate.right)
    return (lo + hi) / 2
  }, side)
  const box = await cover.boundingBox()
  return { src, click: () => cover.click({ position: { x: x - box.x, y: box.height / 2 } }) }
}

test.describe("card 3's back covers", () => {
  for (const [width, height, touch] of [[1440, 900, false], [390, 844, true]]) {
    test(`at ${width}px a click on a back cover checks its project and brings its cover to the front`, async ({ browser }) => {
      const { ctx, page } = await open(browser, { width, height, touch })
      await go(page, '/')
      await show(page, 2)
      await expect(radios(page)).toHaveCount(3)
      const ids = [await projectId(page, 0), await projectId(page, 1), await projectId(page, 2)]
      await waitShown(page, 2, ids[0])
      const checked = () => radios(page).evaluateAll((els) => els.map((el, i) => (el.getAttribute('aria-checked') === 'true' ? i : -1)).filter((i) => i > -1))
      expect(await checked(), 'the first project starts checked').toEqual([0])
      // Right, left, right again: each click is on whichever cover is in that back position now.
      for (const side of ['right', 'left', 'right']) {
        const { src, click } = await aimAtBackCover(page, side)
        const want = ids.findIndex((id) => src.includes(`/home-exports/${id}`))
        expect(want, `the ${side} cover is one of the three projects (${src})`).toBeGreaterThan(-1)
        const before = await checked()
        expect(before, `before the click, the ${side} cover's project is not the checked one`).not.toEqual([want])
        await click()
        await expect.poll(checked, { message: `clicking the ${side} cover did not check its project`, timeout: 5000 }).toEqual([want])
        await waitShown(page, 2, ids[want])
      }
      await ctx.close()
    })
  }

  // The click also moves focus to that project's radio in whichever switch is on screen: the rows
  // from 1200px, the pills below it. (The other switch is display: none, so it cannot take focus.)
  for (const [width, height, touch, where] of [[390, 844, true, 'pills'], [768, 1024, false, 'pills'], [1199, 900, false, 'pills'], [1200, 900, false, 'rows'], [1440, 900, false, 'rows']]) {
    test(`at ${width}px a click on a back cover puts focus on that project's radio in the ${where}`, async ({ browser }) => {
      const { ctx, page } = await open(browser, { width, height, touch })
      await go(page, '/')
      await show(page, 2)
      await expect(radios(page)).toHaveCount(3)
      const ids = [await projectId(page, 0), await projectId(page, 1), await projectId(page, 2)]
      await waitShown(page, 2, ids[0])
      for (const side of ['right', 'left']) {
        const { src, click } = await aimAtBackCover(page, side)
        const want = ids.findIndex((id) => src.includes(`/home-exports/${id}`))
        expect(want, `the ${side} cover is one of the three projects (${src})`).toBeGreaterThan(-1)
        await click()
        await waitShown(page, 2, ids[want])
        // The radio in the accessibility tree at this width has focus (not the picture that was clicked).
        await expect(radios(page).nth(want), `after a click on the ${side} cover, focus is on its project's radio`).toBeFocused()
        const focus = await page.evaluate(() => ({ tag: document.activeElement.tagName, row: !!document.activeElement.closest('.sp-rows'), pill: !!document.activeElement.closest('.sp-pick') }))
        expect(focus, `focus is on a button in the ${where}`).toEqual({ tag: 'BUTTON', row: where === 'rows', pill: where === 'pills' })
      }
      await ctx.close()
    })
  }
})

// ── 2b. what the shelf's covers leave showing at the edges ─────────────────────

// The covers are pictures, and each has its title, details and year drawn into it, so "is there text
// in the side strip" is a question about pixels. On a phone each back cover shows only a strip about
// 40 to 50px wide beside the front cover, and the design puts the part of the cover that is plain
// colour there (a back cover is plain from 57% to 86% of its width), so no half a word shows. The
// check looks at a picture of the plate as it is painted, over the strip and nothing else: every pixel
// of it must be within a few levels of the strip's own colour. (The foot of the cover, where its colour bar is, is left out.)

/** The strip of a back cover that shows, in the plate's own coordinates (CSS px), inset 2px from the front cover and the plate's edge. */
const stripOf = (page, side) => card(page, 2).evaluate((c, s) => {
  const plate = c.querySelector('.sp-plate').getBoundingClientRect()
  const cover = c.querySelector(`.sp-shelf img[data-pos="${s}"]`).getBoundingClientRect()
  const front = c.querySelector('.sp-shelf img[data-pos="front"]').getBoundingClientRect()
  const lo = s === 'right' ? Math.max(front.right, cover.left, plate.left) : Math.max(cover.left, plate.left, 0)
  const hi = s === 'right' ? Math.min(cover.right, plate.right, innerWidth) : Math.min(front.left, cover.right, plate.right)
  // Down to where the colour bar starts (the bar is the cover's last 4%); in from the top by 3px (the hairline).
  const top = Math.max(cover.top + 3, plate.top)
  const bottom = Math.min(cover.bottom - cover.height * 0.06, plate.bottom)
  return { x: lo + 2 - plate.left, y: top - plate.top, w: hi - lo - 4, h: bottom - top, coverW: cover.width, coverLeft: cover.left - plate.left }
}, side)

/** How many pixels of `png` (the plate, at `dpr`) inside `rect` are not the median colour of that rectangle, by more than `tol` levels in any channel. */
const inkIn = (page, png, rect, dpr, tol) => page.evaluate(async ({ b64, rect, dpr, tol }) => {
  const bin = atob(b64)
  const bytes = Uint8Array.from(bin, (ch) => ch.charCodeAt(0))
  const bmp = await createImageBitmap(new Blob([bytes], { type: 'image/png' }))
  const g = new OffscreenCanvas(bmp.width, bmp.height).getContext('2d', { willReadFrequently: true })
  g.drawImage(bmp, 0, 0)
  const x = Math.ceil(rect.x * dpr), y = Math.ceil(rect.y * dpr)
  const w = Math.floor(rect.w * dpr), h = Math.floor(rect.h * dpr)
  const d = g.getImageData(x, y, w, h).data
  const median = [0, 1, 2].map((ch) => {
    const v = []
    for (let i = ch; i < d.length; i += 4) v.push(d[i])
    return v.sort((a, b) => a - b)[v.length >> 1]
  })
  let ink = 0, worst = 0
  for (let i = 0; i < d.length; i += 4) {
    const diff = Math.max(Math.abs(d[i] - median[0]), Math.abs(d[i + 1] - median[1]), Math.abs(d[i + 2] - median[2]))
    worst = Math.max(worst, diff)
    if (diff > tol) ink += 1
  }
  return { ink, worst, pixels: w * h, median }
}, { b64: png.toString('base64'), rect, dpr, tol })

test.describe('the side strips of the shelf on a phone', () => {
  for (const width of [320, 390, 430]) {
    for (const theme of ['light', 'dark']) {
      test(`show only the cover's plain colour, no text, at ${width}px, ${theme}`, async ({ browser }) => {
        const dpr = 2
        const { ctx, page } = await open(browser, { width, height: 844, touch: true, theme, dpr })
        await go(page, '/')
        await show(page, 2)
        await expect(card(page, 2).locator('.sp-shelf img')).toHaveCount(3)
        await waitShown(page, 2, (await projectId(page, 0)))
        // Each back cover in turn is in the left and in the right: the three covers have different
        // words in different places, so the strip is read once with each of them there.
        for (const pick of [0, 1, 2]) {
          await radios(page).nth(pick).click()
          await waitShown(page, 2, (await projectId(page, pick)))
          await shelfSettled(page)
          for (const side of ['left', 'right']) {
            const strip = await stripOf(page, side)
            const where = `${side} strip with project ${pick + 1} in front at ${width}px, ${theme}`
            // A strip that is not there would pass for plain colour, so it has to have a width worth the name.
            expect(strip.w, `${where}: the strip has width (${strip.w.toFixed(1)}px)`).toBeGreaterThan(25)
            expect(strip.h, `${where}: the strip has height`).toBeGreaterThan(100)
            const png = await card(page, 2).locator('.sp-plate').screenshot()
            const r = await inkIn(page, png, strip, dpr, 12)
            expect(r.pixels, `${where}: pixels were read`).toBeGreaterThan(1000)
            expect(r.ink, `${where}: ${r.ink} of ${r.pixels} pixels differ from the plain colour ${r.median} (largest difference ${r.worst} levels): text shows in the strip`).toBe(0)
          }
        }
        await ctx.close()
      })
    }
  }
})

// ── 2c. the "Example projects" tag ─────────────────────────────────────────────

test.describe('the "Example projects" tag', () => {
  for (const [width, height, touch] of [[390, 844, true], [1200, 900, false], [1440, 900, false]]) {
    test(`is in the plate's corner and clear of the covers at ${width}px`, async ({ browser }) => {
      const { ctx, page } = await open(browser, { width, height, touch })
      await go(page, '/')
      await show(page, 2)
      await waitShown(page, 2, (await projectId(page, 0)))
      await shelfSettled(page)
      const tag = card(page, 2).locator('.sp-shelf-tag')
      await expect(tag, 'the tag is on screen').toBeVisible()
      await expect(tag).toHaveText('Example projects')
      const m = await card(page, 2).evaluate((c) => {
        const rectOf = (el) => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom } }
        const tagBox = rectOf(c.querySelector('.sp-shelf-tag'))
        const plate = rectOf(c.querySelector('.sp-plate'))
        return { tag: tagBox, plate, covers: [...c.querySelectorAll('.sp-shelf img')].map((im) => ({ pos: im.dataset.pos, ...rectOf(im) })) }
      })
      // In the plate.
      expect(m.tag.left, 'the tag starts inside the plate').toBeGreaterThanOrEqual(m.plate.left)
      expect(m.tag.top, 'the tag starts inside the plate').toBeGreaterThanOrEqual(m.plate.top)
      expect(m.tag.right, 'the tag ends inside the plate').toBeLessThanOrEqual(m.plate.right)
      // Clear of every cover: the boxes do not share any area.
      for (const c of m.covers) {
        const w = Math.min(m.tag.right, c.right) - Math.max(m.tag.left, c.left)
        const h = Math.min(m.tag.bottom, c.bottom) - Math.max(m.tag.top, c.top)
        expect(w > 0 && h > 0, `the tag (${JSON.stringify(m.tag)}) overlaps the ${c.pos} cover (${JSON.stringify(c)})`).toBe(false)
      }
      await ctx.close()
    })
  }

  for (const width of [768, 1199]) {
    test(`is not shown at ${width}px, where the pills carry the label`, async ({ browser }) => {
      const { ctx, page } = await open(browser, { width, height: 900 })
      await go(page, '/')
      await show(page, 2)
      await expect(card(page, 2).locator('.sp-shelf-tag')).toBeHidden()
      await expect(card(page, 2).locator('.sp-pick').getByText('Example projects'), 'the pills row names the group').toBeVisible()
      await ctx.close()
    })
  }
})

// ── 2d. the row hints can be read ──────────────────────────────────────────────

/** WCAG contrast ratio of the text colour of each visible .sp-rows-hint against the ground it sits on (the ancestors' backgrounds laid over one another). */
const hintContrasts = (page) => page.evaluate(() => {
  const toRGBA = (css) => {
    const m = /^rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/.exec(css)
    if (m) return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : +m[4] }
    // A colour space the page was written in (oklch, color-mix...): let the canvas turn it into sRGB.
    const g = new OffscreenCanvas(1, 1).getContext('2d', { willReadFrequently: true })
    g.fillStyle = css
    g.fillRect(0, 0, 1, 1)
    const [r, gg, b, a] = g.getImageData(0, 0, 1, 1).data
    return { r, g: gg, b, a: a / 255 }
  }
  const over = (top, under) => {
    const a = top.a + under.a * (1 - top.a)
    const mix = (k) => (top[k] * top.a + under[k] * under.a * (1 - top.a)) / a
    return { r: mix('r'), g: mix('g'), b: mix('b'), a }
  }
  const lum = ({ r, g, b }) => [r, g, b].map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }).reduce((s, c, i) => s + c * [0.2126, 0.7152, 0.0722][i], 0)
  return [...document.querySelectorAll('.sp-rows-hint')].filter((el) => el.offsetParent !== null).map((el) => {
    const chain = []
    for (let e = el.parentElement; e; e = e.parentElement) chain.unshift(e)
    // A ground that is not a flat colour (a picture, a gradient, a see-through layer) cannot be read from styles.
    const notFlat = [el, ...chain].filter((e) => getComputedStyle(e).backgroundImage !== 'none' || getComputedStyle(e).opacity !== '1').map((e) => e.className)
    let ground = { r: 255, g: 255, b: 255, a: 1 }
    for (const e of chain) ground = over(toRGBA(getComputedStyle(e).backgroundColor), ground)
    const ink = over(toRGBA(getComputedStyle(el).color), ground)
    const [hi, lo] = [lum(ink), lum(ground)].sort((a, b) => b - a)
    return { text: el.textContent, color: getComputedStyle(el).color, ground: [ground.r, ground.g, ground.b].map(Math.round), ratio: (hi + 0.05) / (lo + 0.05), notFlat }
  })
})

test.describe('the hint under each project name', () => {
  for (const theme of ['light', 'dark']) {
    test(`is readable against its ground at 1440px, ${theme} (4.5:1)`, async ({ browser }) => {
      const { ctx, page } = await open(browser, { width: 1440, height: 900, theme })
      await go(page, '/')
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
      await show(page, 2)
      const hints = await hintContrasts(page)
      expect(hints.length, 'the hints are on screen (one a row, in cards 2 and 3)').toBeGreaterThanOrEqual(3)
      for (const h of hints) {
        expect(h.notFlat, `"${h.text}": the ground is a flat colour, so a ratio can be worked out`).toEqual([])
        expect(h.ratio, `"${h.text}" is ${h.color} on rgb(${h.ground}): ${h.ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5)
      }
      await ctx.close()
    })
  }
})

// ── 3. the picture is sharp enough for where it is painted ─────────────────────

/**
 * What the browser chose for the shown picture of card i, and how big it is
 * actually painted. object-fit: contain paints the file at the largest size that
 * fits the content box (the box less the img's own padding) at the file's own
 * aspect ratio, so the painted width is min(box width, box height x aspect).
 */
const plateFacts = (page, i) => card(page, i).locator(SHOWN).evaluate(async (img) => {
  const cs = getComputedStyle(img)
  const boxW = img.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
  const boxH = img.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)
  // naturalWidth is not the file's width here: with a w-descriptor srcset the browser reports it
  // divided by the density it chose, so it is the aspect ratio (not the width) that is read from it.
  // The file's own width is read by decoding the file.
  const aspect = img.naturalWidth / img.naturalHeight
  const bitmap = await createImageBitmap(await (await fetch(img.currentSrc)).blob())
  return {
    src: img.currentSrc,
    fit: cs.objectFit,
    natural: bitmap.width,
    boxW,
    boxH,
    paintedW: Math.min(boxW, boxH * aspect),
    dpr: window.devicePixelRatio,
  }
})

const CONDITIONS = [
  { name: '1440px, 1x', width: 1440, height: 900, dpr: 1 },
  { name: '1440px, 2x', width: 1440, height: 900, dpr: 2 },
  { name: '768px touch, 2x', width: 768, height: 1024, dpr: 2, touch: true },
  { name: '390px touch, 3x', width: 390, height: 844, dpr: 3, touch: true },
  { name: '390px touch, 2x', width: 390, height: 844, dpr: 2, touch: true },
]

for (const { name, ...c } of CONDITIONS) {
  test(`every shown plate is a /home-exports/ file sharp enough for its painted size at ${name}`, async ({ browser }) => {
    const { ctx, page } = await open(browser, c)
    await go(page, '/')
    const cases = []
    // Card 2's tabs first: at 1440 card 3 stacks over card 2 once the page has scrolled to it.
    for (let i = 0; i < 3; i += 1) cases.push({ cardIndex: 1, id: await tabId(page, i), pick: tabs(page).nth(i), what: `tab ${i + 1}` })
    for (let i = 0; i < 3; i += 1) cases.push({ cardIndex: 2, id: await projectId(page, i), pick: radios(page).nth(i), what: `project ${i + 1}` })
    for (const { cardIndex, id, pick, what } of cases) {
      await show(page, cardIndex)
      await pick.click()
      await waitShown(page, cardIndex, id)
      const f = await plateFacts(page, cardIndex)
      const where = `${what} (${id}) at ${name}`
      expect(f.fit, `${where}: the picture is contained`).toBe('contain')
      expect(new URL(f.src).pathname, `${where}: the chosen file`).toMatch(/^\/home-exports\/[a-z0-9-]+-\d+\.webp$/)
      const fileWidth = Number(/-(\d+)\.webp$/.exec(new URL(f.src).pathname)[1])
      expect(f.natural, `${where}: the width in the file name is the file's real width`).toBe(fileWidth)
      expect(f.paintedW, `${where}: it is painted at some width`).toBeGreaterThan(50)
      expect(f.dpr).toBe(c.dpr)
      expect(
        fileWidth,
        `${where}: ${fileWidth}px of file for ${f.paintedW.toFixed(1)} CSS px painted (box ${f.boxW.toFixed(1)} x ${f.boxH.toFixed(1)}) at ${f.dpr}x needs ${Math.ceil(f.paintedW * f.dpr)}px`,
      ).toBeGreaterThanOrEqual(Math.floor(f.paintedW * f.dpr))
    }
    await ctx.close()
  })
}

// ── 4. reduced motion ──────────────────────────────────────────────────────────

/** Computed durations of every plate picture on the page, in seconds. */
const durations = (page) => page.locator(ART_IMG).evaluateAll((els) => els.map((el) => {
  const cs = getComputedStyle(el)
  return { transition: cs.transitionDuration, animation: cs.animationDuration, name: cs.animationName }
}))

/** Come back when everything animating on the page has finished (not a timer). */
const animationsSettled = (page) => page.evaluate(() => Promise.allSettled(document.getAnimations().map((a) => a.finished)))

/**
 * Swap card 2 and card 3 twice each (the second swap is the one a fade-out can be seen on), and report the kinds of motion ('transition',
 * 'animation') that were running on a plate picture in any frame. Sampled each
 * frame from document.getAnimations(), so it sees what is really running rather
 * than what a style says might.
 */
async function swapAndWatch(page) {
  await page.evaluate((sel) => {
    window.__motion = new Set()
    const tick = () => {
      for (const a of document.getAnimations()) {
        if (!a.effect?.target?.matches?.(sel)) continue
        window.__motion.add(a instanceof CSSTransition ? 'transition' : a instanceof CSSAnimation ? 'animation' : 'other')
      }
      window.__motionRaf = requestAnimationFrame(tick)
    }
    tick()
  }, ART_IMG)
  await show(page, 1)
  for (const i of [1, 2]) {
    await tabs(page).nth(i).click()
    await waitShown(page, 1, (await tabId(page, i)))
    await animationsSettled(page)
  }
  await show(page, 2)
  for (const i of [1, 2]) {
    await radios(page).nth(i).click()
    await waitShown(page, 2, (await projectId(page, i)))
    await animationsSettled(page)
  }
  await twoFrames(page)
  return page.evaluate(() => {
    cancelAnimationFrame(window.__motionRaf)
    return [...window.__motion].sort()
  })
}

// A duration only matters when something is named to run: the shelf's covers have no animation at all
// (animation-name none), and the site-wide reduced-motion clamp still reads 0.01ms on them. Running motion
// is checked separately, frame by frame, by swapAndWatch.
const allZero = (rows, key) => rows
  .filter((r) => key !== 'animation' || r.name !== 'none')
  .every((r) => r[key].split(',').every((d) => parseFloat(d) === 0))

test.describe('plate swap motion', () => {
  test('is instant when the operating system asks for reduced motion', async ({ browser }) => {
    const { ctx, page } = await open(browser, { width: 1440, height: 900, reducedMotion: 'reduce' })
    await go(page, '/')
    await expect(page.locator('html')).toHaveAttribute('data-reduced-motion', 'true')
    await show(page, 1)
    await waitShown(page, 1, (await tabId(page, 0)))
    const rest = await durations(page)
    expect(rest.length, 'plate pictures are in the page').toBeGreaterThan(0)
    expect(allZero(rest, 'transition'), `transition durations at rest: ${JSON.stringify(rest)}`).toBe(true)
    const started = await swapAndWatch(page)
    const swapped = await durations(page)
    expect(swapped.length, 'the swap mounted more pictures').toBeGreaterThan(rest.length)
    expect(allZero(swapped, 'transition'), `transition durations after a swap: ${JSON.stringify(swapped)}`).toBe(true)
    expect(allZero(swapped, 'animation'), `animation durations after a swap: ${JSON.stringify(swapped)}`).toBe(true)
    expect(started, 'motion seen running on a plate picture').toEqual([])
    await ctx.close()
  })

  test('is instant when the visitor turned motion off in Settings on a machine with no preference', async ({ browser }) => {
    const { ctx, page } = await open(browser, { width: 1440, height: 900, reducedMotion: 'no-preference', appearance: { reducedMotion: true } })
    await go(page, '/')
    await expect(page.locator('html')).toHaveAttribute('data-reduced-motion', 'true')
    const started = await swapAndWatch(page)
    const swapped = await durations(page)
    expect(allZero(swapped, 'transition'), `transition durations: ${JSON.stringify(swapped)}`).toBe(true)
    expect(allZero(swapped, 'animation'), `animation durations: ${JSON.stringify(swapped)}`).toBe(true)
    expect(started).toEqual([])
    await ctx.close()
  })

  test('fades and slides with motion allowed (so the reduced-motion check can see motion)', async ({ browser }) => {
    const { ctx, page } = await open(browser, { width: 1440, height: 900, reducedMotion: 'no-preference' })
    await go(page, '/')
    await expect(page.locator('html')).toHaveAttribute('data-reduced-motion', 'false')
    const started = await swapAndWatch(page)
    const swapped = await durations(page)
    expect(swapped.some((r) => parseFloat(r.transition) === 0.15), `a 150ms fade: ${JSON.stringify(swapped)}`).toBe(true)
    expect(swapped.some((r) => parseFloat(r.transition) === 0.24), `a 240ms rise on the shown picture: ${JSON.stringify(swapped)}`).toBe(true)
    // Transitions only: an interrupted keyframe animation would snap the
    // picture it leaves to transparent instead of fading it from where it is.
    expect(started, 'motion seen running on a plate picture').toEqual(['transition'])
    await ctx.close()
  })

  test('animates when the visitor turned motion back on in Settings against the operating system', async ({ browser }) => {
    const { ctx, page } = await open(browser, { width: 1440, height: 900, reducedMotion: 'reduce', appearance: { reducedMotion: false } })
    await go(page, '/')
    await expect(page.locator('html')).toHaveAttribute('data-reduced-motion', 'false')
    await swapAndWatch(page)
    const swapped = await durations(page)
    expect(swapped.some((r) => parseFloat(r.transition) === 0.15), `a 150ms fade: ${JSON.stringify(swapped)}`).toBe(true)
    await ctx.close()
  })
})

// ── 5. only what is shown is fetched ───────────────────────────────────────────

/** The set of export pictures requested so far, by id ("kit-colour", "cover-halcyon"). */
function trackExports(page) {
  const files = []
  page.on('request', (req) => {
    const p = new URL(req.url()).pathname
    if (p.startsWith('/home-exports/')) files.push(p.slice('/home-exports/'.length))
  })
  const ids = () => [...new Set(files.map((f) => f.replace(/(?:-p|-spread)?-\d+\.webp$/, '')))].sort()
  return { files, ids }
}

async function loadBothCards(page) {
  await go(page, '/')
  await show(page, 1)
  await waitShown(page, 1, (await tabId(page, 0)))
  await show(page, 2)
  await waitShown(page, 2, (await projectId(page, 0)))
  await twoFrames(page)
}

test.describe('plate requests', () => {
  /** The pictures the page should have asked for after load: what card 2 opens on, and all three of card 3's covers (the shelf shows them together). */
  const openingIds = async (page) => [await tabId(page, 0), ...(await Promise.all([0, 1, 2].map((i) => projectId(page, i))))]

  test('only the selected tab is requested until another is hovered or focused (card 3 shows its three covers at once)', async ({ browser }) => {
    const { ctx, page } = await open(browser, { width: 1440, height: 900 })
    const seen = trackExports(page)
    await loadBothCards(page)
    const opening = await openingIds(page)
    expect(seen.ids(), `requested after load: ${seen.files.join(', ')}`).toEqual([...opening].sort())

    // Moving the pointer over another tab asks for that tab and nothing else. Card 3 is
    // stacked over card 2 once the page has scrolled to it, so scroll back to where card 2 is clear.
    await page.evaluate(() => {
      window.scrollTo(0, window.scrollY + document.querySelector('.sp-stack-pad').getBoundingClientRect().bottom - 156)
    })
    const other = await tabId(page, 1)
    await tabs(page).nth(1).hover()
    await expect.poll(seen.ids, { message: `hovering ${other}'s tab never requested it` }).toContain(other)
    expect(seen.ids(), 'hovering one tab fetched only that tab').toEqual([...opening, other].sort())
    await ctx.close()
  })

  test('focusing a tab by keyboard asks for that tab only', async ({ browser }) => {
    const { ctx, page } = await open(browser, { width: 1440, height: 900 })
    const seen = trackExports(page)
    await loadBothCards(page)
    const opening = await openingIds(page)
    await card(page, 1).scrollIntoViewIfNeeded()
    const other = await tabId(page, 2)
    await tabs(page).nth(2).focus()
    await expect.poll(seen.ids, { message: `focusing ${other}'s tab never requested it` }).toContain(other)
    expect(seen.ids(), 'focusing one tab fetched only that tab').toEqual([...opening, other].sort())
    await ctx.close()
  })

  test('picking a project asks for nothing new: the shelf already holds all three covers', async ({ browser }) => {
    const { ctx, page } = await open(browser, { width: 1440, height: 900 })
    const seen = trackExports(page)
    await loadBothCards(page)
    const opening = await openingIds(page)
    await radios(page).nth(1).click()
    await waitShown(page, 2, await projectId(page, 1))
    await twoFrames(page)
    expect(seen.ids(), 'picking a project fetched something new').toEqual([...opening].sort())
    await ctx.close()
  })

  test('a phone asks for the opening tab picture (the portrait files) and the covers', async ({ browser }) => {
    const { ctx, page } = await open(browser, { width: 390, height: 844, touch: true, dpr: 3 })
    const seen = trackExports(page)
    await loadBothCards(page)
    const opening = await openingIds(page)
    expect(seen.ids(), `requested after load: ${seen.files.join(', ')}`).toEqual([...opening].sort())
    const shown = seen.files.filter((f) => f.startsWith(opening[0]))
    expect(shown.length, 'the opening tab was fetched').toBeGreaterThan(0)
    expect(shown.every((f) => f.replace(opening[0], '').match(/^-p-[0-9]+\.webp$/)), `a phone gets the portrait render: ${shown.join(', ')}`).toBe(true)
    await ctx.close()
  })
})

// ── 6. nothing is clipped ──────────────────────────────────────────────────────

test.describe('fit', () => {
  test("at 390px card 1's panel foot is inside the card for every piece", async ({ browser }) => {
    const { ctx, page } = await open(browser, { width: 390, height: 844, touch: true })
    await go(page, '/')
    await show(page, 0)
    const pieces = card(page, 0).getByRole('tablist', { name: 'What to export' }).getByRole('tab')
    await expect(pieces).toHaveCount(4)
    for (let i = 0; i < 4; i += 1) {
      await pieces.nth(i).click()
      await expect(pieces.nth(i)).toHaveAttribute('aria-selected', 'true')
      await twoFrames(page)
      const m = await card(page, 0).evaluate((c) => {
        const box = c.getBoundingClientRect()
        const foot = c.querySelector('.sp-ex-actions').getBoundingClientRect()
        const body = c.querySelector('.sp-ex-body').getBoundingClientRect()
        const bar = c.querySelector('.sp-ex-filebar').getBoundingClientRect()
        return { cardBottom: box.bottom, footTop: foot.top, footBottom: foot.bottom, barTop: bar.top, bodyBottom: body.bottom, footRight: foot.right, cardRight: box.right }
      })
      const where = `piece ${i + 1}`
      expect(m.footBottom, `${where}: the foot's bottom edge is inside the card (card ends at ${m.cardBottom})`).toBeLessThanOrEqual(m.cardBottom + 0.5)
      expect(m.footRight, `${where}: the foot is inside the card's right edge`).toBeLessThanOrEqual(m.cardRight + 0.5)
      expect(m.barTop, `${where}: the file bar starts below the body`).toBeGreaterThanOrEqual(m.bodyBottom - 0.5)
      expect(m.footTop, `${where}: the foot starts below the file bar`).toBeGreaterThanOrEqual(m.barTop)
    }
    await ctx.close()
  })

  for (const width of [1200, 1280, 1440]) {
    test(`at ${width}px each card's copy and rows fit inside the copy column, and the pills give way to the rows`, async ({ browser }) => {
      const { ctx, page } = await open(browser, { width, height: 900 })
      await go(page, '/')
      await show(page, 2)
      for (let i = 0; i < 3; i += 1) {
        const m = await card(page, i).evaluate((c) => {
          const say = c.querySelector('.sp-stack-say')
          const rows = c.querySelector('.sp-rows')
          const pills = c.querySelector('.sp-pick, .sp-ex-pieces')
          const s = say.getBoundingClientRect()
          const r = rows.getBoundingClientRect()
          const kids = [...say.children].map((k) => k.getBoundingClientRect())
          return {
            sayH: say.clientHeight, sayScroll: say.scrollHeight, sayBottom: s.bottom,
            rowsBottom: r.bottom, rowsVisible: r.height > 0, pillsHidden: pills.offsetParent === null,
            lowest: Math.max(...kids.map((k) => k.bottom)), rowsRight: r.right, sayRight: s.right,
          }
        })
        const where = `card ${i + 1} at ${width}px`
        expect(m.rowsVisible, `${where}: the rows are showing`).toBe(true)
        expect(m.pillsHidden, `${where}: the pills are hidden`).toBe(true)
        expect(m.sayScroll, `${where}: the copy column's content (${m.sayScroll}px) is taller than the column (${m.sayH}px)`).toBeLessThanOrEqual(m.sayH + 1)
        expect(m.lowest, `${where}: something in the copy column hangs below it`).toBeLessThanOrEqual(m.sayBottom + 0.5)
        expect(m.rowsBottom, `${where}: the rows end inside the column`).toBeLessThanOrEqual(m.sayBottom + 0.5)
        expect(m.rowsRight, `${where}: the rows end inside the column's right edge`).toBeLessThanOrEqual(m.sayRight + 0.5)
      }
      await ctx.close()
    })
  }

  for (const width of [1200, 1280, 1440]) {
    test(`at ${width}px the outer covers sit at least 24px inside the plate`, async ({ browser }) => {
      const { ctx, page } = await open(browser, { width, height: 900 })
      await go(page, '/')
      await show(page, 2)
      await waitShown(page, 2, (await projectId(page, 0)))
      await expect(card(page, 2).locator('.sp-shelf img')).toHaveCount(3)
      const margins = () => card(page, 2).evaluate((c) => {
        const plate = c.querySelector('.sp-plate').getBoundingClientRect()
        const boxes = [...c.querySelectorAll('.sp-shelf img')].map((im) => im.getBoundingClientRect())
        return { left: Math.min(...boxes.map((b) => b.left)) - plate.left, right: plate.right - Math.max(...boxes.map((b) => b.right)), plateW: plate.width }
      })
      // Polled: the covers may still be settling from their first position.
      await expect.poll(async () => { const m = await margins(); return Math.min(m.left, m.right) }, { message: `the nearest cover edge to the plate's edge at ${width}px`, timeout: 5000 }).toBeGreaterThanOrEqual(23.5)
      // And it is the outer covers that set the margin, not a shelf that collapsed to nothing.
      const m = await margins()
      expect(m.left + m.right, 'the covers use the plate (the shelf has not collapsed)').toBeLessThan(m.plateW * 0.5)
      await ctx.close()
    })
  }

  for (const width of [1200, 1440]) {
    test(`at ${width}px the list starts at most 64px under the copy, and its rows are tall enough`, async ({ browser }) => {
      const { ctx, page } = await open(browser, { width, height: 900 })
      await go(page, '/')
      await show(page, 2)
      for (let i = 0; i < 3; i += 1) {
        const m = await card(page, i).evaluate((c) => {
          const say = c.querySelector('.sp-stack-say')
          const rows = c.querySelector('.sp-rows')
          const above = [...say.children].filter((k) => k !== rows && (rows.compareDocumentPosition(k) & Node.DOCUMENT_POSITION_PRECEDING) && k.getBoundingClientRect().height > 0)
          const gap = rows.getBoundingClientRect().top - Math.max(...above.map((k) => k.getBoundingClientRect().bottom))
          return { gap, above: above.length, rowH: [...rows.querySelectorAll('.sp-rows-btn')].map((b) => b.getBoundingClientRect().height) }
        })
        const where = `card ${i + 1} at ${width}px`
        expect(m.above, `${where}: there is copy above the list to measure from`).toBeGreaterThan(0)
        expect(m.gap, `${where}: the gap above the list`).toBeLessThanOrEqual(64)
        expect(m.gap, `${where}: the list does not overlap the copy`).toBeGreaterThanOrEqual(0)
        const min = i === 0 ? 56 : 72
        expect(m.rowH.length, `${where}: rows`).toBeGreaterThanOrEqual(3)
        expect(Math.min(...m.rowH), `${where}: shortest row (${m.rowH.map((h) => Math.round(h)).join(', ')})`).toBeGreaterThanOrEqual(min - 0.5)
      }
      await ctx.close()
    })
  }

  test('the shelf caption is hidden from 1200px and showing at 1199px', async ({ browser }) => {
    for (const [width, shown] of [[1199, true], [1200, false], [1440, false]]) {
      const { ctx, page } = await open(browser, { width, height: 900 })
      await go(page, '/')
      await show(page, 2)
      const cap = card(page, 2).locator('.sp-plate-cap--project')
      await expect(cap, `the shelf caption at ${width}px`).toHaveCount(1)
      if (shown) await expect(cap, `the shelf caption at ${width}px`).toBeVisible()
      else await expect(cap, `the shelf caption at ${width}px`).toBeHidden()
      await ctx.close()
    }
  })

  test('at 1199px the pills are showing and the rows are not', async ({ browser }) => {
    const { ctx, page } = await open(browser, { width: 1199, height: 900 })
    await go(page, '/')
    await show(page, 2)
    for (let i = 0; i < 3; i += 1) {
      const m = await card(page, i).evaluate((c) => ({
        rowsHidden: c.querySelector('.sp-rows').offsetParent === null,
        pillsShown: c.querySelector('.sp-pick, .sp-ex-pieces').offsetParent !== null,
      }))
      expect(m, `card ${i + 1} at 1199px`).toEqual({ rowsHidden: true, pillsShown: true })
    }
    await ctx.close()
  })
})

test.describe('a picture that fails to load', () => {
  test('shows its fallback when picked, even after hover already tried and failed to load it', async ({ browser }) => {
    const { ctx, page } = await open(browser, { width: 1440, height: 900 })
    await go(page, '/')
    await show(page, 1)
    // The second tab's files never arrive. Only the shown tab has loaded so far.
    const second = await tabId(page, 1)
    await page.route(new RegExp(`/home-exports/${second}-`), (route) => route.abort())
    const target = tabs(page).nth(1)
    // Hover warms the picture; its load fails while another tab is shown.
    await target.hover()
    await expect.poll(() => card(page, 1).evaluate((c, id) => [...c.querySelectorAll('.sp-plate-art img')].some((im) => im.currentSrc.includes(id) && im.complete && im.naturalWidth === 0), second), { message: 'the warmed picture failed' }).toBe(true)
    await target.click()
    await expect(target).toHaveAttribute('aria-selected', 'true')
    await expect(card(page, 1).locator('.sp-plate-fail'), 'the plate says the picture did not load').toBeVisible()
    await ctx.close()
  })
})
