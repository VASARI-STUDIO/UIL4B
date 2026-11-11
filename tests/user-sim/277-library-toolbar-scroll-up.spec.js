// SPEC 277: ON A PHONE, SCROLLING BACK UP BRINGS THE LIBRARY TOOLBAR BACK.
//
// A phone does not stick the library toolbar. Once it has scrolled away,
// scrolling up brings it back after a short pause, fixed under the nav; the page
// under it does not move; scrolling down sends it away; back at its own place it
// is in the page again. Wider screens keep the sticky bar and never peek.
//
// MUTATIONS (each should turn the named test red):
//   - drop `useToolbarPeek` from LibraryToolbar.jsx: "scrolling up brings it
//     back" fails on every library;
//   - render no spacer: "the page under it does not move" fails;
//   - remove the `.lbry-toolbar[data-peek]` rule in global.css: "it sits under
//     the nav" fails (the bar stays in the page, off screen);
//   - delete the `dy > 0` branch in useToolbarPeek.js: "scrolling down sends it
//     away" fails.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const LIBRARIES = [
  { name: 'Emoji Library', route: '/create/emoji' },
  { name: 'Palette Library', route: '/discover/palettes' },
  { name: 'Gradient Library', route: '/discover/gradients' },
  { name: 'Icon Library', route: '/create/icons' },
]

// Scrolls in small steps, a frame apart, the way a finger does: one jump fires
// one scroll event and says nothing about direction over time.
//
// One frame per step is all the hook samples (it reads scrollY once a frame), and
// it keeps the cost down: this runs inside one page.evaluate that no expect
// timeout can interrupt, so every extra frame is spent against the 30 s test
// budget. On a loaded CI runner a frame on the Emoji Library takes long enough
// that the old 2 frames x 8-10 steps per scroll ran the budget out mid-loop
// (the "page.evaluate: Test timeout of 30000ms exceeded" at scrollBy). Few steps,
// each past the hook's thresholds, still read as a direction.
const scrollBy = (page, dy, steps = 4) => page.evaluate(async ({ dy, steps }) => {
  for (let i = 0; i < steps; i += 1) {
    window.scrollBy(0, dy / steps)
    await new Promise((r) => requestAnimationFrame(r))
  }
}, { dy, steps })

const bar = (page) => page.locator('.lbry-toolbar').first()
const barState = (page) => bar(page).evaluate((el) => {
  const r = el.getBoundingClientRect()
  return { peek: el.dataset.peek || '', position: getComputedStyle(el).position, top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), width: Math.round(r.width) }
})
// The bar slides in from under the nav; its place is read once that has ended.
const settled = (page) => bar(page).evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished.catch(() => {}))))
const navBottom = (page) => page.evaluate(() => Math.round(document.querySelector('.pnav').getBoundingClientRect().bottom))

async function scrollAway(page) {
  await expect(bar(page)).toBeVisible()
  const home = await barState(page)
  // Far enough for the bar to be well off screen, short of the page's end.
  const room = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight)
  await scrollBy(page, Math.min(1400, room - 200), 2)
  await expect.poll(async () => (await barState(page)).bottom, { message: 'the bar scrolled away' }).toBeLessThan(0)
  return home
}

test.describe('Library toolbar on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

  for (const lib of LIBRARIES) {
    test(`${lib.name}: scrolling up brings it back under the nav, and the page under it does not move`, async ({ page }) => {
      watch(page, `a phone user scrolling back up the ${lib.name}`)
      await go(page, lib.route)
      const home = await scrollAway(page)
      const before = await page.evaluate(() => ({ y: scrollY, h: document.documentElement.scrollHeight }))
      await scrollBy(page, -160)
      await expect.poll(async () => (await barState(page)).peek, { message: 'scrolling up brings it back' }).toBe('in')
      await settled(page)
      const shown = await barState(page)
      const nav = await navBottom(page)
      expect(shown.position).toBe('fixed')
      expect(Math.abs(shown.top - (nav + 8)), 'it sits under the nav').toBeLessThanOrEqual(2)
      expect(shown.left, 'same left edge as in the page').toBe(home.left)
      expect(shown.width, 'same width as in the page').toBe(home.width)
      const after = await page.evaluate(() => ({ y: scrollY, h: document.documentElement.scrollHeight }))
      expect(after.h, 'the page under it does not move (the spacer holds its place)').toBe(before.h)
      await page.screenshot({ path: `.claude/scratch/misc7/peek-${lib.route.split('/').pop()}-390.png` })

      await scrollBy(page, 120)
      await expect.poll(async () => (await barState(page)).peek, { message: 'scrolling down sends it away' }).toBe('')
      expect((await barState(page)).bottom, 'gone, back to its place off screen').toBeLessThan(0)
    })
  }

  test('back at its own place it is in the page again, not fixed', async ({ page }) => {
    watch(page, 'a phone user scrolling all the way back to the top of the Palette Library')
    await go(page, '/discover/palettes')
    const home = await scrollAway(page)
    await scrollBy(page, -160)
    await expect.poll(async () => (await barState(page)).peek).toBe('in')
    await scrollBy(page, -5000, 8)
    await expect.poll(async () => (await barState(page)).peek).toBe('')
    const at = await barState(page)
    expect(at.position).toBe('relative')
    expect(Math.abs(at.top - home.top), 'back where it started').toBeLessThanOrEqual(1)
    await expect(page.locator('.lbry-toolbar-spacer')).toHaveCount(0)
  })

  test('a short flick up does not bring it back', async ({ page }) => {
    watch(page, 'a phone user nudging the Palette Library up a little')
    await go(page, '/discover/palettes')
    await scrollAway(page)
    await scrollBy(page, -20, 2)
    await page.waitForTimeout(400)
    expect((await barState(page)).peek).toBe('')
  })

  test('opening Filters from the returned bar keeps it there until the sheet closes', async ({ page }) => {
    watch(page, 'a phone user opening Filters from the returned toolbar')
    await go(page, '/discover/palettes')
    await scrollAway(page)
    await scrollBy(page, -160)
    await expect.poll(async () => (await barState(page)).peek).toBe('in')
    await bar(page).getByRole('button', { name: /Filters/ }).click()
    const sheet = page.getByRole('dialog', { name: 'Filters' })
    await expect(sheet).toBeVisible()
    await sheet.getByRole('button', { name: 'Done' }).click()
    await expect(sheet).toBeHidden()
    expect((await barState(page)).peek, 'still shown after the sheet closed').toBe('in')
  })
})

test.describe('Library toolbar on a desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('the bar sticks and never peeks', async ({ page }) => {
    watch(page, 'a desktop user scrolling the Palette Library')
    await go(page, '/discover/palettes')
    await expect(bar(page)).toBeVisible()
    await scrollBy(page, 900)
    await scrollBy(page, -300)
    await page.waitForTimeout(400)
    const at = await barState(page)
    expect(at.peek).toBe('')
    expect(at.position).toBe('sticky')
  })
})
