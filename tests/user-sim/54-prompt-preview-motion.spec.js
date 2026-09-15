// The prompt card preview's motion contract, in BOTH directions.
//
// A prompt card shows the prompt itself in a fixed-height window, and the text
// scrolls inside that window on hover and on keyboard focus. Three things have
// to hold, and none of them is provable from the stylesheet text:
//
// ── WHERE THIS RUNS, AND WHY IT MOVED ──────────────────────────────────────
// It used to run on the COMMUNITY tab. On 2026-09-15 every community prompt
// gained a built output, and those cards now show a poster of the output
// instead of the scrolling text — so there was no scrolling text left on that
// tab to test, and this file went red for a change that was entirely correct.
//
// The behaviour did not go away: it is what every prompt WITHOUT a built output
// shows, which is every prompt a person saves or writes themselves. So the
// tests run on MY PROMPTS now, against three seeded personal prompts, which is
// the surface the scrolling preview actually serves today.
//
// Deliberately not done: keeping this on the community tab by teaching it to
// find the one card that still had text. That would have made the file assert
// an accident of the data rather than a behaviour, and it would go green on a
// day the last text card disappeared.
//
//   1. IT PLAYS ON INTENT, NOT ON ITS OWN. Only the hovered or focused card
//      moves; the other eleven sit still. That is the WCAG 2.2 SC 2.2.2
//      decision written up in utils/promptPreview — automatic motion past five
//      seconds alongside other content needs a pause control, and this layout
//      has nowhere to put one, so the motion is user-initiated instead.
//
//   2. REDUCED MOTION IS HONOURED IN BOTH DIRECTIONS. The contract stated in
//      AppearanceContext is that an explicit in-app choice BEATS the OS query
//      either way. The global clamp at the top of global.css cannot settle this
//      on its own: it reaches animation-duration and animation-delay, and this
//      preview moves with `transform`. So all four combinations of (OS says
//      reduce / OS says nothing) x (Settings say reduce / Settings say motion /
//      Settings never touched) are driven here, and the resting position is
//      read as a real matrix rather than as a computed shorthand.
//
//      The failure this guards is not hypothetical in this repo: reduced motion
//      has been found broken in BOTH directions before, and the second
//      direction — a visitor who asked for less motion while their OS said
//      nothing — is the one the clamp cannot reach at all.
//
//   3. A REAL WHEEL OVER THE PREVIEW SCROLLS THE PAGE. Lenis intercepts the
//      wheel globally and its `allowNestedScroll` hands a gesture to whatever
//      element under the pointer can still scroll. The window is deliberately
//      NOT a scroll container — `overflow:hidden` with a transform inside — so
//      there is nothing for Lenis to hand it to. This asserts that rather than
//      assuming it, because "the popup does not scroll, the page behind it
//      does" is a founder-reported defect on this codebase and the inverse
//      would be just as wrong.
//
// EVERY REDUCED-MOTION ASSERTION IS PAIRED WITH A MOTION-ON CONTROL in the same
// shape. "It did not move" is trivially true of a page that never rendered, and
// that is exactly how this file would start lying.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const ROUTE = '/discover/prompts'
const CARD = '.pl-card'
const TEXT = '.pl-card-preview-text'

/**
 * A context whose stored appearance preference is set before the boot script
 * runs — which is what the Settings toggle actually persists — and whose OS
 * motion preference is emulated independently. The two are separate axes on
 * purpose: the whole contract is about what happens when they disagree.
 *
 * `stored` of `undefined` writes nothing, which is the third state
 * AppearanceContext documents: the visitor has never chosen, so the OS answers.
 */
// Long enough that the window cannot hold them, because the animation's travel
// is min(0px, window - text height) — a prompt that already fits moves by
// exactly nothing, and a test measuring that would pass whatever the CSS said.
// Six, because the tests reach card index 3 and "only the hovered one moved"
// needs others to sit still beside it.
const SEEDED = [1, 2, 3, 4, 5, 6].map((n) => ({
  id: `local-${n}`,
  title: `Saved prompt ${n}`,
  text: Array.from({ length: 14 }, (_, i) =>
    `Line ${i + 1} of saved prompt ${n}: a specific instruction long enough to overflow the preview window and give the scroll something to travel through.`).join('\n'),
  tags: 'saved, local',
  date: '2026-09-15',
}))

async function open(browser, { os, stored }) {
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    reducedMotion: os,
  })
  if (stored !== undefined) {
    await ctx.addInitScript((value) => {
      try { localStorage.setItem('vs-appearance', JSON.stringify({ reducedMotion: value })) }
      catch { /* storage blocked — the OS half still applies */ }
    }, stored)
  }
  // The personal library, written before boot the way the app itself stores it
  // (utils/promptStore.js, key 'vs-prompts').
  await ctx.addInitScript((rows) => {
    try { localStorage.setItem('vs-prompts', JSON.stringify(rows)) } catch { /* quota */ }
  }, SEEDED)
  const page = await ctx.newPage()
  return { ctx, page }
}

/**
 * Open the library on MY PROMPTS, where the scrolling text preview lives.
 *
 * Asserts the seeded prompts actually rendered before returning: every
 * assertion in this file is about where text sits, and "it did not move" is
 * trivially true of a tab that rendered nothing.
 */
async function openMine(page) {
  await go(page, ROUTE)
  // ACTIVATED BY KEYBOARD, and that is load-bearing rather than fussy.
  // Chromium decides :focus-visible from the last input modality. Switching
  // tabs with a CLICK tells it the visitor is using a pointer, and a later
  // programmatic .focus() then does NOT match :focus-visible — so the keyboard
  // test below would read "paused" and blame the product for the test's own
  // mouse click. Pressing Enter keeps the modality where these tests assume it.
  const tab = page.getByRole('button', { name: /my prompts/i })
  await tab.focus()
  await page.keyboard.press('Enter')
  await expect(page.locator(CARD).first()).toBeVisible()
  await expect(page.locator(TEXT).first(), 'no scrolling text preview rendered').toBeVisible()
  const n = await page.locator(TEXT).count()
  expect(n, 'the seeded personal prompts did not render').toBe(SEEDED.length)
}

/** The resting Y translation of one preview, in pixels, from the real matrix. */
async function translation(page, index) {
  return page.evaluate((i) => {
    const el = document.querySelectorAll('.pl-card-preview-text')[i]
    const cs = getComputedStyle(el)
    return {
      y: Number(new DOMMatrixReadOnly(cs.transform).m42.toFixed(1)),
      name: cs.animationName,
      play: cs.animationPlayState,
      seconds: parseFloat(cs.animationDuration) || 0,
    }
  }, index)
}

/**
 * Hover a card, wait out the animation's own opening dwell, and report where
 * the text ended up. The wait is DERIVED from the element's declared duration
 * (the keyframes hold at 0% until 7%) rather than being a guessed constant, so
 * it stays correct when the duration is retuned and it does not depend on which
 * prompt happens to be in that grid position.
 */
async function hoverAndSettle(page, index) {
  await page.locator(CARD).nth(index).hover()
  const { seconds } = await translation(page, index)
  // Past the 7% dwell, plus a second of travel to measure.
  await page.waitForTimeout(Math.max(seconds * 0.07 * 1000, 0) + 1100)
  return translation(page, index)
}

test.describe('the prompt preview scroll respects intent and reduced motion', () => {
  test('motion on: only the hovered card moves, and it moves downward through the prompt', async ({ browser }) => {
    const { ctx, page } = await open(browser, { os: 'no-preference', stored: undefined })
    watch(page, 'a visitor with motion enabled browsing the prompt library')
    await openMine(page)

    // At rest every preview is parked at the top of its prompt and paused.
    const resting = await page.evaluate(() => [...document.querySelectorAll('.pl-card-preview-text')].map((el) => {
      const cs = getComputedStyle(el)
      return { y: Number(new DOMMatrixReadOnly(cs.transform).m42.toFixed(1)), play: cs.animationPlayState }
    }))
    expect(resting.length, 'no previews rendered — every assertion here would be vacuous')
      .toBeGreaterThan(1)
    expect(resting.filter((r) => r.play !== 'paused'), 'a preview is playing with no pointer on it')
      .toEqual([])
    expect(resting.filter((r) => r.y !== 0), 'a preview is not resting at the top of its prompt')
      .toEqual([])

    const moved = await hoverAndSettle(page, 3)
    expect(moved.name, 'the hovered card is not running the preview animation').toBe('pl-preview-scroll')
    expect(moved.play).toBe('running')
    // Negative = the text has travelled up, i.e. later lines of the prompt are
    // in the window. This is the number the whole feature exists to produce.
    expect(moved.y, 'the hovered preview did not travel').toBeLessThan(-5)

    // And nothing else did.
    const others = await page.evaluate(() => [...document.querySelectorAll('.pl-card-preview-text')]
      .map((el, i) => ({ i, play: getComputedStyle(el).animationPlayState }))
      .filter((r) => r.i !== 3 && r.play !== 'paused'))
    expect(others, 'a card the pointer is not on started playing').toEqual([])
    await ctx.close()
  })

  test('motion on: keyboard focus plays it too, so it is not pointer-only', async ({ browser }) => {
    const { ctx, page } = await open(browser, { os: 'no-preference', stored: undefined })
    watch(page, 'a keyboard user browsing the prompt library')
    await openMine(page)

    await page.locator(CARD).nth(2).focus()
    await expect(page.locator(CARD).nth(2)).toBeFocused()
    const { play, name } = await translation(page, 2)
    expect(name).toBe('pl-preview-scroll')
    expect(play, 'a focused card does not play, so the preview is mouse-only').toBe('running')
    await ctx.close()
  })

  // The four motion contexts. `expectMotion` is the whole assertion: with
  // motion the animation is named and the play state follows the pointer; with
  // reduced motion the animation is GONE and the text is parked at the top of
  // the prompt — not at the bottom, which is where a clamped one-shot would
  // leave it if the explicit rules were ever dropped.
  const CONTEXTS = [
    { name: 'OS says reduce, the visitor has never chosen', os: 'reduce', stored: undefined, expectMotion: false, attr: 'true' },
    { name: 'OS says nothing, the visitor has never chosen', os: 'no-preference', stored: undefined, expectMotion: true, attr: 'false' },
    { name: 'OS says nothing but Settings say reduce', os: 'no-preference', stored: true, expectMotion: false, attr: 'true' },
    { name: 'OS says reduce but Settings say motion', os: 'reduce', stored: false, expectMotion: true, attr: 'false' },
  ]

  for (const c of CONTEXTS) {
    test(`reduced motion, both directions — ${c.name}`, async ({ browser }) => {
      const { ctx, page } = await open(browser, { os: c.os, stored: c.stored })
      watch(page, `a visitor whose motion context is: ${c.name}`)
      await openMine(page)

      const attr = await page.evaluate(() => document.documentElement.getAttribute('data-reduced-motion'))
      expect(attr, 'the resolved motion attribute is not what this context should produce').toBe(c.attr)

      const after = await hoverAndSettle(page, 3)
      if (c.expectMotion) {
        expect(after.name, 'motion was suppressed for a visitor entitled to it').toBe('pl-preview-scroll')
        expect(after.y, 'the preview did not travel although motion is on').toBeLessThan(-5)
      } else {
        expect(after.name, 'the preview still carries an animation under reduced motion').toBe('none')
        expect(after.y, 'the preview moved under reduced motion').toBe(0)
      }
      await ctx.close()
    })
  }

  test('a real wheel over a preview scrolls the page, not the card', async ({ browser }) => {
    const { ctx, page } = await open(browser, { os: 'no-preference', stored: undefined })
    watch(page, 'a visitor scrolling with the pointer resting inside a preview')
    await openMine(page)

    // The window must not be a scroll container in the first place — that is
    // what keeps Lenis out of it rather than any handler fighting Lenis.
    const shape = await page.evaluate(() => {
      const w = document.querySelector('.pl-card-preview')
      return { overflowY: getComputedStyle(w).overflowY, scrollTop: w.scrollTop }
    })
    expect(shape.overflowY, 'the preview became a nested scroll container').toBe('hidden')

    const box = await page.locator(CARD).nth(3).boundingBox()
    const before = await page.evaluate(() => window.scrollY)
    await page.mouse.move(box.x + box.width / 2, box.y + 60)
    await page.mouse.wheel(0, 500)
    // Lenis eases, so the position is read once it has stopped changing rather
    // than after a fixed wait.
    await page.waitForFunction(() => {
      const y = window.scrollY
      if (window.__lastY === y) return true
      window.__lastY = y
      return false
    }, null, { polling: 120, timeout: 8000 })
    const after = await page.evaluate(() => window.scrollY)
    expect(after - before, 'the wheel did not scroll the page while over a preview').toBeGreaterThan(100)
    expect(await page.evaluate(() => document.querySelector('.pl-card-preview').scrollTop),
      'the preview consumed the gesture as a nested scroll').toBe(0)
    await ctx.close()
  })
})
