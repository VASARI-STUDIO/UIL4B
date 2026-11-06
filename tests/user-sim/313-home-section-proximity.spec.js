// HOMEPAGE SECTIONS BELOW THE FIRST SCREEN: THEY MOUNT AS THE VIEWPORT NEARS THEM.
//
// The page has two ways to open a section. Each stand-in opens its own section through an
// IntersectionObserver with a 600px margin; and the first scroll, wheel, touchstart, pointerdown
// or keydown opens every section at once (useBelowFoldReady). The second hides the first: any
// scroll, even window.scrollTo, fires a scroll event, so a test that scrolls cannot tell whether
// the observer works.
//
//   1. With no input event, a section mounts when its stand-in is within 600px of the viewport
//      and stays a stand-in when it is farther than that.
//   2. With the page's scroll, wheel and touchstart listeners swallowed, scrolling down by
//      window.scrollTo in steps mounts each section as its stand-in comes within 600px and not
//      before. Only the observer is left to open anything, so this is the proximity rule under
//      real scrolling.
//   3. Control for 2: with those listeners left alone, one 1px scrollTo mounts every section,
//      including the ones thousands of pixels away. That is what the swallow in 2 removes.
//
// MUTATIONS (each turns a test red):
//   - open every section on mount (`open` always true in DeferredSection.jsx) -> tests 1 and 2, far sections mounted.
//   - never open a section (drop the observer and the `ready` path) -> tests 1, 2 and 3.
//   - a narrower margin than 600px -> test 2, a section inside 450px that has not mounted.
//   - a wider margin than 600px -> test 2, a section beyond 750px that has mounted.
//   - the swallow in 2 removed -> test 2, far sections mounted after the first step.
import { test, expect } from './base.js'
import { go, watch, HOME_LAZY_SECTIONS } from './helpers.js'

const NEAR = 600
// A margin either side of the 600px line, so a section that is a pixel off it is not judged.
const SLACK = 150
const STEP = 300
const HEIGHT = 900

/** Each lazy section's stand-in or section box in viewport coordinates, and whether its heading has mounted. */
const readSections = (page) => page.evaluate((ids) => ids.map((id) => {
  const el = document.getElementById(id)
  const r = el.getBoundingClientRect()
  return { id, top: Math.round(r.top), mounted: !!el.querySelector('h2') }
}), HOME_LAZY_SECTIONS)

/** Two frames, then a quarter of a second: an observer's report and the render it causes have both landed. */
const settle = (page) => page.evaluate(() => new Promise((resolve) => {
  requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 250)))
}))

/**
 * Stop the homepage hearing scroll, wheel or touchstart, before any of its code runs. The listener
 * that turns every section on at once registers itself on window with { once, passive } for those
 * three events; those registrations are dropped and counted. Anything else passes through.
 */
const swallowScrollOpeners = (page) => page.addInitScript(() => {
  const swallowed = []
  Object.defineProperty(window, '__swallowedOpeners', { value: swallowed })
  const real = window.addEventListener
  window.addEventListener = function addEventListener(type, listener, options) {
    const opener = ['scroll', 'wheel', 'touchstart'].includes(type)
      && options && typeof options === 'object' && options.once === true && options.passive === true
    if (opener) { swallowed.push(type); return undefined }
    return real.call(this, type, listener, options)
  }
})

test.describe('homepage sections load by proximity', () => {
  test.use({ viewport: { width: 1440, height: HEIGHT } })

  test('with no input, only the sections within 600px of the viewport are mounted', async ({ page }) => {
    watch(page, 'a visitor who has not touched the page')
    await go(page, '/')
    // Give every section that is going to mount time to do so, and nothing else touches the page.
    await expect.poll(async () => (await readSections(page)).some((s) => s.mounted), { message: 'no section near the viewport ever mounted' }).toBe(true)
    await page.waitForTimeout(1000)
    const sections = await readSections(page)
    const near = sections.filter((s) => s.top < HEIGHT + NEAR - SLACK)
    const far = sections.filter((s) => s.top > HEIGHT + NEAR + SLACK)
    expect(near.length, 'POSITIVE CONTROL: at least one section starts near the viewport').toBeGreaterThan(0)
    expect(far.length, 'POSITIVE CONTROL: at least one section starts farther than 600px away').toBeGreaterThan(0)
    for (const s of near) expect(s.mounted, `#${s.id} is ${s.top}px down and did not mount`).toBe(true)
    for (const s of far) expect(s.mounted, `#${s.id} is ${s.top}px down and mounted with no input`).toBe(false)
  })

  test('scrolling down by scrollTo with the scroll openers swallowed mounts each section only as it comes within 600px', async ({ page }) => {
    watch(page, 'a visitor scrolling the page by script')
    await swallowScrollOpeners(page)
    await go(page, '/')
    expect(await page.evaluate(() => [...window.__swallowedOpeners]), 'POSITIVE CONTROL: the page registered its scroll opener and the swallow dropped it').toContain('scroll')

    let y = 0
    let sawFarUnmounted = false
    for (let i = 0; i < 80; i++) {
      const sections = await readSections(page)
      // Everything inside the near band has mounted by now, polled because the chunk is still downloading.
      for (const s of sections.filter((r) => r.top < HEIGHT + NEAR - SLACK)) {
        await expect.poll(async () => (await readSections(page)).find((r) => r.id === s.id).mounted,
          { message: `#${s.id} was ${s.top}px down (scroll ${y}) and had not mounted`, timeout: 5000 }).toBe(true)
      }
      // Everything beyond it has not. Observers report a frame after the scroll and a section mounts a
      // commit after that, so let both pass before reading, and read again since mounting the near
      // ones moves the ones below them.
      await settle(page)
      const after = await readSections(page)
      for (const s of after.filter((r) => r.top > HEIGHT + NEAR + SLACK)) {
        sawFarUnmounted = true
        expect(s.mounted, `#${s.id} is ${s.top}px down (scroll ${y}) and mounted before it came within ${NEAR}px`).toBe(false)
      }
      const max = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight)
      if (y >= max) break
      y = Math.min(y + STEP, max)
      await page.evaluate((to) => window.scrollTo(0, to), y)
    }
    expect(sawFarUnmounted, 'POSITIVE CONTROL: some section was farther than 600px away while the page was being scrolled').toBe(true)
    expect((await readSections(page)).every((s) => s.mounted), 'a section never mounted by the page bottom').toBe(true)
  })

  test('with the scroll openers live, one 1px scroll mounts every section at once', async ({ page }) => {
    watch(page, 'a visitor who scrolls a pixel')
    await go(page, '/')
    const before = await readSections(page)
    expect(before.some((s) => !s.mounted), 'POSITIVE CONTROL: a section is still a stand-in before the scroll').toBe(true)
    await page.evaluate(() => window.scrollTo(0, 1))
    for (const id of HOME_LAZY_SECTIONS) {
      await expect(page.locator(`#${id} h2`), `#${id} did not mount on the first scroll`).toBeAttached({ timeout: 20000 })
    }
  })
})
