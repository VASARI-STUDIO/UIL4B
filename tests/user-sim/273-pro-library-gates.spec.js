// The Palette Library's gates make one offer each, reach a thumb, and the sticky
// section heading does not let the cards show through it.
//
// THE FAULTS THIS GUARDS (all on /discover/palettes):
//   1. Signed out, the Brand gate used to say "A free account opens N more
//      curated palettes; Pro opens all N" over a button that only goes to Pro.
//      A free account does not open Brand, so the sentence promised something
//      the button did not do. It is now one offer: Pro, one sentence, one link
//      to /plans, and no mention of a free account.
//   2. The gate button must be 44px tall on every touch screen, a tablet
//      included. What holds it on this page is `.lib-surface .btn` under
//      `pointer: coarse` (deferred/library.css), plus `.btn` under 640px for a
//      phone. The `.lockt-cta-btn` rule added in global.css is shadowed by
//      both on every surface that renders the button today, so these tests
//      pin the outcome (44px) and not that one line.
//   3. The sticky `.pgl-section-head` faded to transparent at its lower edge,
//      so the first row of cards showed through the bottom of the heading
//      while it was stuck. Its background is now solid.
//
// What the curated arm of the gate can and cannot show: the signed-out Curated
// chip never reaches the "need an account" body. A collection is only gated
// when the viewer has NO open row of that kind, and the three rows a signed-out
// visitor gets are curated, so Curated lists them. That arm is unreachable on
// screen today; the last test here pins the reason (it fails the day it
// becomes reachable, which is when its copy needs a spec of its own).
//
// Everything is read off the rendered page as a viewer meets it. Screenshots
// are viewport-only: a fullPage capture in an isMobile context resizes the
// viewport and has re-flowed this page.
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'
import { LIBRARY_PALETTES } from '../../api/_lib/library/paletteLibrary.js'
import { GALLERY_TIER_LIMITS } from '../../src/utils/lockedPreview.js'

const ROUTE = '/discover/palettes'
const COLLECTION_TRAY = '[aria-label^="Filter palettes by collection"]'
const COLLECTION_TRIGGER = '.pgl-toolbar .lbry-filtertrig:has(.lbry-filtertrig-k:text-is("Collection"))'

const HEADING = 'Brand palettes are part of Pro'
const ANON_BODY = `Pro opens all ${LIBRARY_PALETTES.length} palettes, brand systems included.`
const MIN_TOUCH = 44

const gatedBlock = (page) => page.locator('[role="status"]').filter({ hasText: HEADING })

// Press a collection chip whether its group is a row of buttons, a menu behind
// a trigger, or (on a phone) inside the Filters sheet - the way a viewer reaches it.
async function pickCollection(page, label) {
  const chip = page.locator(COLLECTION_TRAY).getByRole('button', { name: label, exact: true })
  const sheetOpener = page.locator('.pgl-toolbar .lbry-filtersbtn')
  const opener = page.locator(COLLECTION_TRIGGER)
  if (!(await chip.first().isVisible()) && !(await opener.isVisible())) {
    await expect(sheetOpener, `no way to reach ${label}`).toBeVisible()
    await sheetOpener.click()
  }
  if (!(await chip.first().isVisible())) {
    await expect(opener, `no ${label} control on the toolbar`).toBeVisible()
    await opener.click()
  }
  await expect(chip.first(), `no chip for ${label}`).toBeVisible()
  await chip.first().click()
  const done = page.locator('.lbry-sheet-done')
  if (await done.isVisible()) await done.click()
}

async function openBrandSignedOut(page) {
  await go(page, ROUTE)
  await expect(page.locator('.pgal-card')).toHaveCount(GALLERY_TIER_LIMITS.anonymous)
  await pickCollection(page, 'Brand')
  const block = gatedBlock(page)
  await expect(block, 'the Brand gate never appeared').toBeVisible()
  return block
}

for (const width of [390, 1440]) {
  test.describe(`signed out Brand gate · ${width}px`, () => {
    test.use({ viewport: { width, height: width === 390 ? 844 : 900 } })

    test('makes one offer, Pro, and never mentions a free account', async ({ page }) => {
      watch(page, 'a signed-out visitor reading the Brand gate')
      const block = await openBrandSignedOut(page)
      await expect(block.locator('.lockt-cta-head')).toHaveText(HEADING)
      await expect(block.locator('.lockt-cta-body')).toHaveText(ANON_BODY)
      expect(await block.innerText(), 'the gate talks about a free account that does not open Brand')
        .not.toMatch(/free account/i)
      await expect(block.locator('a, button'), 'the gate offers more than one way forward').toHaveCount(1)
      await expect(block.getByRole('button', { name: /free account/i })).toHaveCount(0)
      await page.screenshot() // viewport only, never fullPage
    })

    test('its button goes to /plans', async ({ page }) => {
      watch(page, 'a signed-out visitor following the Brand gate')
      const block = await openBrandSignedOut(page)
      const link = block.getByRole('link', { name: 'See what Pro includes' })
      await expect(link).toHaveAttribute('href', '/plans')
      await link.click()
      await expect(page).toHaveURL(/\/plans$/)
    })
  })
}

for (const width of [768, 390]) {
  test.describe(`Brand gate button on a touch screen · ${width}px`, () => {
    test.use({ viewport: { width, height: width === 390 ? 844 : 1024 }, hasTouch: true, isMobile: true })

    test(`is at least ${MIN_TOUCH}px tall`, async ({ page }) => {
      watch(page, 'a touch visitor reaching for the Brand gate button')
      const block = await openBrandSignedOut(page)
      // Positive control: this context really is a coarse pointer, so the rule
      // under test is the one in play and not a desktop fallback.
      expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches), 'not a coarse pointer').toBe(true)
      const button = block.getByRole('link', { name: 'See what Pro includes' })
      await button.scrollIntoViewIfNeeded()
      const box = await button.boundingBox()
      expect(box, 'the gate button has no box').not.toBeNull()
      expect(box.height, `gate button is ${box.height}px tall at ${width}px`).toBeGreaterThanOrEqual(MIN_TOUCH)
      await page.screenshot() // viewport only, never fullPage
    })
  })
}

test.describe('sticky section heading · 390px', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('is opaque while it is stuck over the cards', async ({ page }, testInfo) => {
    watch(page, 'a Pro viewer scrolling the Palette Library on a phone')
    // Pro, because it lists the whole library: several sections, long enough to scroll.
    await signIn(page, { plan: 'pro' })
    await go(page, ROUTE)
    await expect.poll(() => page.locator('.pgal-card').count(), { message: 'the whole library never listed' })
      .toBeGreaterThan(GALLERY_TIER_LIMITS.free)
    const heads = page.locator('.pgl-section-head')
    expect(await heads.count(), 'needs two sections to scroll one head into its stuck position').toBeGreaterThan(1)

    // Scroll to the middle of the second section, then read the heading that is
    // actually pinned there. `stuck` is measured, not assumed: its rect has to
    // sit on the sticky offset, not at its natural place in the flow.
    const read = await page.evaluate(async () => {
      const section = document.querySelectorAll('.pgl-section')[1]
      const head = section.querySelector('.pgl-section-head')
      const top = section.getBoundingClientRect().top + window.scrollY
      window.scrollTo(0, top + Math.min(section.offsetHeight / 2, 400))
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
      const rect = head.getBoundingClientRect()
      const cs = getComputedStyle(head)
      return {
        position: cs.position,
        stickyTop: parseFloat(cs.top),
        rectTop: rect.top,
        naturalTop: section.getBoundingClientRect().top,
        color: cs.backgroundColor,
        image: cs.backgroundImage,
      }
    })

    expect(read.position).toBe('sticky')
    expect(read.naturalTop, 'the section never scrolled past the top, so the head is not stuck').toBeLessThan(read.stickyTop)
    expect(Math.abs(read.rectTop - read.stickyTop), 'the heading is not pinned at its sticky offset').toBeLessThan(1.5)

    const channels = read.color.match(/[\d.]+/g).map(Number)
    const alpha = channels.length === 4 ? channels[3] : 1
    expect(alpha, `the stuck heading's background is ${read.color}, not opaque`).toBe(1)
    expect(read.image, 'the stuck heading fades through a gradient').toBe('none')
    await testInfo.attach('stuck-heading', { body: await page.screenshot(), contentType: 'image/png' })
  })
})

test.describe('curated arm of the gate', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('a signed-out Curated tap lists the open rows, so the curated gate is unreachable', async ({ page }) => {
    watch(page, 'a signed-out visitor tapping the Curated chip')
    await go(page, ROUTE)
    await expect(page.locator('.pgal-card')).toHaveCount(GALLERY_TIER_LIMITS.anonymous)
    await pickCollection(page, 'Curated')
    await expect(page.locator('.pgal-card'), 'Curated lists the rows a visitor has').toHaveCount(GALLERY_TIER_LIMITS.anonymous)
    await expect(page.getByText('Curated palettes need an account')).toHaveCount(0)
    await expect(gatedBlock(page)).toHaveCount(0)
  })
})
