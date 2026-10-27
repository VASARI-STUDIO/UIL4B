// THE HOMEPAGE'S "STUDIO QUALITY EXPORTS" SECTION, AS A VISITOR MEETS IT.
//
// Three stacking cards. Card 1 is a live panel; cards 2 and 3 each put a plate
// (a real render of the product's own export, from public/home-exports/) in the
// stage with a row of buttons under it: card 2 a tab strip (UI kit, Book, Brand
// deck), card 3 a radio group of example projects showing a book cover.
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
const ART_IMG = '.sp-plate-art img'
const SHOWN = '.sp-plate-art img.is-on'

// Card 2 has the tabs UI kit, Book and Brand deck, card 3 the projects Northbeam, Halcyon
// and Ferrule. Their ORDER is the design's to change, so nothing here counts on it: a
// button is known by its label, and the picture it should show by this table.
// Each button is known by what its accessible name starts with, because the same
// choice is offered as pills under the plate (below 1200px) and as rows in the copy
// column (from 1200px), and only the one on show is in the page's accessibility tree.
const TAB_FILE = { 'Design system book': 'book-colour', 'Brand deck': 'guide-palette', 'UI kit': 'kit-colour' }
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
  return fileOf(TAB_FILE, name)
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
  { width: 1440, height: 900, touch: false, tall: 640 },
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
      expect(shown.map((t) => fileOf(TAB_FILE, t.name)).sort(), 'the tabs are Book, Brand deck and UI kit').toEqual(['book-colour', 'guide-palette', 'kit-colour'])
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
const startOpacityWatch = (page, i) => card(page, i).evaluate((c) => {
  window.__minPeak = 1
  window.__frames = 0
  const tick = () => {
    const peak = Math.max(0, ...[...c.querySelectorAll('.sp-plate-art img')].map((im) => parseFloat(getComputedStyle(im).opacity)))
    window.__minPeak = Math.min(window.__minPeak, peak)
    window.__frames += 1
    window.__peakRaf = requestAnimationFrame(tick)
  }
  tick()
})
const stopOpacityWatch = (page) => page.evaluate(() => {
  cancelAnimationFrame(window.__peakRaf)
  return { minPeak: window.__minPeak, frames: window.__frames }
})

test.describe('a swap never blanks the plate', () => {
  // A crossfade has the leaving picture at 1 falling to 0 over 150ms while the arriving
  // one rises from 0 over 240ms, so the brighter of the two is never below about 0.5.
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
  await page.evaluate(() => {
    window.__motion = new Set()
    const tick = () => {
      for (const a of document.getAnimations()) {
        if (!a.effect?.target?.matches?.('.sp-plate-art img')) continue
        window.__motion.add(a instanceof CSSTransition ? 'transition' : a instanceof CSSAnimation ? 'animation' : 'other')
      }
      window.__motionRaf = requestAnimationFrame(tick)
    }
    tick()
  })
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

const allZero = (rows, key) => rows.every((r) => r[key].split(',').every((d) => parseFloat(d) === 0))

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
  /** The pictures the page should have asked for after load: what card 2 and card 3 open on. */
  const openingIds = async (page) => [await tabId(page, 0), await projectId(page, 0)]

  test('only the selected tab and project are requested until another is hovered or focused', async ({ browser }) => {
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

  test('hovering a project asks for that project only', async ({ browser }) => {
    const { ctx, page } = await open(browser, { width: 1440, height: 900 })
    const seen = trackExports(page)
    await loadBothCards(page)
    const opening = await openingIds(page)
    const other = await projectId(page, 1)
    await radios(page).nth(1).hover()
    await expect.poll(seen.ids, { message: `hovering ${other} never requested it` }).toContain(other)
    expect(seen.ids(), 'hovering one project fetched only that project').toEqual([...opening, other].sort())
    await ctx.close()
  })

  test('a phone asks for one picture per card too (the portrait files)', async ({ browser }) => {
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
