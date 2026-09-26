// Outline-only buttons draw a rotating colour-band outline on hover (where a
// pointer can hover) and on keyboard focus. Filled buttons never do. Reduced
// motion keeps the ring still; a tap on a touch screen never leaves it on.
//
// Read off the ring itself: the ::before's opacity and animation name, in the
// real app, on the Palette Builder's toolbar (a quiet ToolButton beside the
// accent Save) and on Settings (a default .btn).
import { test, expect } from './base.js'
import { go, watch, expectRendered, signIn } from './helpers.js'

const ring = (loc) => loc.evaluate((el) => {
  const cs = getComputedStyle(el, '::before')
  const box = el.getBoundingClientRect()
  return { opacity: Number(cs.opacity), animation: cs.animationName, content: cs.content, w: box.width, h: box.height, x: box.x, y: box.y }
})

async function openPalette(page) {
  await go(page, '/create/palette')
  await expectRendered(page, '/create/palette')
  const bar = page.locator('.plb [data-tool-toolbar]')
  await expect(bar).not.toHaveClass(/is-measuring/)
  return bar
}

test.describe('the chromatic outline', () => {
  test('an outline button rings on hover without moving; a filled one does not', async ({ page }) => {
    watch(page, 'a designer pointing at the toolbar')
    const bar = await openPalette(page)
    const quiet = bar.locator('.tl-btn--quiet:visible').first()
    const accent = page.locator('.plb .tl-btn--accent:visible').first()
    await expect(quiet).toBeVisible()
    await expect(accent).toBeVisible()

    const rest = await ring(quiet)
    expect(rest.opacity, 'the ring shows at rest').toBe(0)
    await quiet.hover()
    await expect.poll(async () => (await ring(quiet)).opacity).toBe(1)
    const on = await ring(quiet)
    expect(on.animation).toBe('chroma-spin')
    expect([on.w, on.h, on.x, on.y], 'hovering moved or resized the button').toEqual([rest.w, rest.h, rest.x, rest.y])

    await accent.hover()
    await page.waitForTimeout(300)
    const filled = await ring(accent)
    expect(filled.content === 'none' || filled.opacity === 0, 'a filled button drew the ring').toBe(true)
  })

  test('keyboard focus shows the ring', async ({ page }) => {
    watch(page, 'a keyboard user tabbing through Settings')
    await signIn(page, { plan: 'free' })
    await go(page, '/settings')
    await expectRendered(page, '/settings')
    const btn = page.locator('.stg .btn:not(.btn-accent):visible').first()
    await expect(btn).toBeVisible()
    await btn.focus()
    await page.keyboard.press('Shift+Tab')
    await page.keyboard.press('Tab')
    await expect.poll(async () => (await ring(btn)).opacity).toBe(1)
  })

  test('reduced motion keeps the ring still', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } })
    const page = await context.newPage()
    watch(page, 'a designer who asked for less motion')
    const bar = await openPalette(page)
    const quiet = bar.locator('.tl-btn--quiet:visible').first()
    await quiet.hover()
    await expect.poll(async () => (await ring(quiet)).opacity).toBe(1)
    expect((await ring(quiet)).animation).toBe('none')
    await context.close()
  })

  test('a tap on a touch screen leaves no ring behind', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
    const page = await context.newPage()
    watch(page, 'a phone user tapping a toolbar button')
    const bar = await openPalette(page)
    const btn = bar.locator('.tl-btn--quiet:visible:not([disabled]), .tl-btn--square:visible:not([disabled])').first()
    await expect(btn).toBeVisible()
    // A tap leaves the touch point over the button; on a touch screen that
    // must not count as hover.
    await btn.tap()
    await page.waitForTimeout(300)
    expect((await ring(btn)).opacity, 'the hover ring showed on a touch screen').toBe(0)
    await context.close()
  })
})
