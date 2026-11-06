// HOMEPAGE SECTIONS BELOW THE FIRST SCREEN: THEY MOUNT AS THE VIEWPORT NEARS THEM.
//
//   1. With no input event, a section mounts when its stand-in is within 600px of the viewport
//      and stays a stand-in when it is farther than that.
//   2. Scrolling down in steps with window.scrollTo (no wheel, no key, no pointer) leaves every
//      section mounted before its top comes into view.
//
// MUTATIONS (each turns a test red):
//   - open every section on mount (`open` always true in DeferredSection.jsx) -> test 1, far sections mounted.
//   - never open a section (drop the observer and the `ready` path) -> tests 1 and 2.
import { test, expect } from './base.js'
import { go, watch, HOME_LAZY_SECTIONS } from './helpers.js'

const NEAR = 600
// A margin either side of the 600px line, so a section that is a pixel off it is not judged.
const SLACK = 150
const STEP = 300

/** Each lazy section's stand-in or section box in viewport coordinates, and whether its heading has mounted. */
const readSections = (page) => page.evaluate((ids) => ids.map((id) => {
  const el = document.getElementById(id)
  const r = el.getBoundingClientRect()
  return { id, top: Math.round(r.top), mounted: !!el.querySelector('h2') }
}), HOME_LAZY_SECTIONS)

test.describe('homepage sections load by proximity', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('with no input, only the sections within 600px of the viewport are mounted', async ({ page }) => {
    watch(page, 'a visitor who has not touched the page')
    await go(page, '/')
    // Give every section that is going to mount time to do so, and nothing else touches the page.
    await expect.poll(async () => (await readSections(page)).some((s) => s.mounted), { message: 'no section near the viewport ever mounted' }).toBe(true)
    await page.waitForTimeout(1000)
    const height = 900
    const sections = await readSections(page)
    const near = sections.filter((s) => s.top < height + NEAR - SLACK)
    const far = sections.filter((s) => s.top > height + NEAR + SLACK)
    expect(near.length, 'POSITIVE CONTROL: at least one section starts near the viewport').toBeGreaterThan(0)
    expect(far.length, 'POSITIVE CONTROL: at least one section starts farther than 600px away').toBeGreaterThan(0)
    for (const s of near) expect(s.mounted, `#${s.id} is ${s.top}px down and did not mount`).toBe(true)
    for (const s of far) expect(s.mounted, `#${s.id} is ${s.top}px down and mounted with no input`).toBe(false)
  })

  test('scrolling by scrollTo in steps mounts each section before its top reaches the viewport', async ({ page }) => {
    watch(page, 'a visitor scrolling the page by script')
    await go(page, '/')
    const height = 900
    let y = 0
    for (let i = 0; i < 80; i++) {
      // Every section that the next step brings to within a step of the viewport is already there.
      const reach = await readSections(page)
      for (const s of reach.filter((r) => r.top < height + STEP)) {
        await expect.poll(async () => (await readSections(page)).find((r) => r.id === s.id).mounted,
          { message: `#${s.id} had not mounted when its top was ${s.top}px down (scroll ${y})`, timeout: 5000 }).toBe(true)
      }
      const max = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight)
      if (y >= max) break
      y = Math.min(y + STEP, max)
      await page.evaluate((to) => window.scrollTo(0, to), y)
    }
    expect((await readSections(page)).every((s) => s.mounted), 'a section never mounted by the page bottom').toBe(true)
  })
})
