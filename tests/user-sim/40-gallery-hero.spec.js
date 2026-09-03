// DiscoverGalleryHero — the shared masthead on all six browse surfaces.
//
// TWO THINGS, AND THE FIRST ONE IS A NON-DEFECT ON PURPOSE.
//
// 1. .dgh-hero reports scrollWidth - clientWidth of 36px at 390 and 61px at
//    641, identically on every surface that uses it. It has been reported as an
//    overflow more than once, and it is not one: `.dgh-hero::before` carries
//    `inset:auto -10% -65% 42%`, which puts the decorative glow 10% past the
//    right edge deliberately, where `overflow:hidden` on the same element clips
//    it. The figure scales with the viewport (36 / 45 / 61 / 79 / 124) because
//    it is a percentage, not because content is spilling.
//
//    So this asserts the SHAPE of that number rather than its absence:
//    suppress ::before and the overflow must be exactly 0. That keeps the
//    known-good decoration from being re-reported every time someone runs a
//    geometry sweep, AND still fails the moment something real starts
//    overflowing — because a real overflow would survive ::before being gone.
//
// 2. The defect the same measurement exposed. The <=720px block hides
//    .dgh-mark, the 92px serif numeral the 390px desktop floor was sized
//    around, and then RAISED min-height to 430px anyway. The layout with less
//    in it got a taller box, and the difference was dead black above the copy:
//    125px at 390, 163px at 480, 180px at 641 — 42% of the whole hero at the
//    band this app breaks at most. It also pushed the glow out of frame, so the
//    masthead's one decorative gesture was invisible on a phone.
import { test, expect } from './base.js'

// Every surface that renders the shared masthead. Two are Create routes, which
// is exactly why the component is shared and why a fix here has to be checked
// on more than the Discover pair.
const SURFACES = [
  '/discover/palettes',
  '/discover/gradients',
  '/discover/prompts',
  '/create/icons',
  '/create/emoji',
]

const MEASURE = `(() => {
  const hero = document.querySelector('.dgh-hero')
  if (!hero) return null
  const copy = document.querySelector('.dgh-copy')
  const cs = getComputedStyle(hero)
  const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom)
  const heroH = hero.getBoundingClientRect().height
  const copyH = copy ? copy.getBoundingClientRect().height : 0
  const asideH = (() => {
    const a = document.querySelector('.dgh-aside')
    return a ? a.getBoundingClientRect().height : 0
  })()
  return {
    overflowX: hero.scrollWidth - hero.clientWidth,
    heroH: Math.round(heroH),
    contentH: Math.round(copyH + asideH),
    padY: Math.round(padY),
    dead: Math.round(heroH - copyH - asideH - padY),
    docOverflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }
})()`

test.describe('the shared Discover gallery masthead', () => {
  // The non-defect, pinned. If this ever fails, something OTHER than the glow
  // is overflowing and it is worth looking at.
  for (const width of [390, 641, 1280]) {
    test(`at ${width}px the only thing past .dgh-hero's edge is the decorative glow`, async ({ browser }) => {
      const ctx = await browser.newContext({
        viewport: { width, height: 900 }, isMobile: width <= 834, hasTouch: width <= 834,
      })
      const page = await ctx.newPage()
      await page.goto('/discover/palettes')
      await expect(page.locator('.dgh-hero')).toBeVisible()
      await page.waitForTimeout(150)

      const shipped = await page.evaluate(MEASURE)
      // The page itself must never scroll sideways, glow or no glow.
      expect(shipped.docOverflowX, `${width}px: the document scrolls horizontally`).toBeLessThanOrEqual(0)

      // Now take the glow away. Whatever is left is real.
      await page.addStyleTag({ content: '.dgh-hero::before{content:none!important}' })
      await page.waitForTimeout(100)
      const withoutGlow = await page.evaluate(MEASURE)
      expect(withoutGlow.overflowX,
        `${width}px: .dgh-hero still overflows by ${withoutGlow.overflowX}px with the glow `
        + 'suppressed, so this is NOT the known decoration — something real is spilling')
        .toBe(0)
      await ctx.close()
    })
  }

  // The real defect. Checked on every surface, because the component is shared
  // and the two Create routes use the --controls variant with its own floor.
  for (const width of [390, 641]) {
    test(`at ${width}px the stacked masthead is not mostly empty`, async ({ browser }) => {
      const ctx = await browser.newContext({
        viewport: { width, height: 900 }, isMobile: true, hasTouch: true,
      })
      const page = await ctx.newPage()
      const bad = []
      for (const route of SURFACES) {
        await page.goto(route)
        await expect(page.locator('.dgh-hero')).toBeVisible()
        await page.waitForTimeout(150)
        const m = await page.evaluate(MEASURE)
        // Dead space is what the min-height adds beyond content and padding.
        // Before the fix this was 125px at 390 and 180px at 641; the floor of
        // 300px leaves at most ~50px, which is composition rather than a hole.
        if (m.dead > 72) bad.push(`  ${route} @${width}: ${m.dead}px of empty `
          + `masthead (hero ${m.heroH}, content ${m.contentH}, padding ${m.padY})`)
      }
      await ctx.close()
      expect(bad.join('\n'), `dead space in the stacked masthead at ${width}px`).toBe('')
    })
  }

  // The floor still has to do its job: a masthead that collapses onto its copy
  // stops reading as a masthead. This is the other side of the same number.
  test('the stacked masthead keeps enough height to read as a masthead', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 641, height: 900 }, isMobile: true, hasTouch: true })
    const page = await ctx.newPage()
    await page.goto('/discover/palettes')
    await expect(page.locator('.dgh-hero')).toBeVisible()
    await page.waitForTimeout(150)
    const m = await page.evaluate(MEASURE)
    expect(m.heroH, 'the masthead has collapsed onto its copy').toBeGreaterThanOrEqual(280)
    await ctx.close()
  })
})
