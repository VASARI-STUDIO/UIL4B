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
import { go } from './helpers.js'

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
      await go(page, '/discover/palettes')
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
        await go(page, route)
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
    await go(page, '/discover/palettes')
    await expect(page.locator('.dgh-hero')).toBeVisible()
    await page.waitForTimeout(150)
    const m = await page.evaluate(MEASURE)
    expect(m.heroH, 'the masthead has collapsed onto its copy').toBeGreaterThanOrEqual(280)
    await ctx.close()
  })
})
// ── The two --premium mastheads ────────────────────────────────────────────
//
// The Font Gallery and Font Pair heroes are a SEPARATE implementation from
// .dgh-hero, and they are the pair the founder actually marked up
// (#surface-headers-read-as-ai). He wrote "AI" against two elements of the Font
// Gallery header - the taxonomy eyebrow and the three-up figure strip - and
// "Bad UI" against the onward-action button, with an arrow at it.
//
// These tests pin the CORRECTION rather than the old shape, so the furniture
// cannot grow back and the action cannot drift into the corner again:
//
//   - no taxonomy eyebrow anywhere in either masthead;
//   - no figure strip;
//   - the onward action is a real button INSIDE the copy column, not a text
//     link floating in a topline row diagonally opposite it. That was the "Bad
//     UI": measured at 1440 it was a 98x23px link in the corner of a 1343x472px
//     slab, 146px above the h1 and sharing an optical line with a label you
//     cannot press.
const PREMIUM = [
  { route: '/create/font-gallery', hero: '.fg-hero', cta: '.fg-hero-cta', copy: '.fg-hero-copy', to: '/create/font-pair' },
  { route: '/create/font-pair', hero: '.fpr-hero', cta: '.fpr-hero-cta', copy: '.fpr-hero-copy', to: '/create/font-gallery' },
]

test.describe('the typography mastheads carry no generated furniture', () => {
  for (const surface of PREMIUM) {
    test(`${surface.route} states its name and its next action, and nothing else`, async ({ page }) => {
      await go(page, surface.route)
      const hero = page.locator(surface.hero)
      await expect(hero).toBeVisible()

      // The two elements marked "AI".
      await expect(hero.locator('.sec-h-eyebrow')).toHaveCount(0)
      await expect(hero.locator('.fg-hero-stats')).toHaveCount(0)
      // The row that held the eyebrow and the corner link together.
      await expect(hero.locator('.fg-hero-topline, .fpr-hero-topline')).toHaveCount(0)

      // The action survives - it was never the button's existence that was
      // wrong, only where it sat and how little it looked like an action.
      const cta = hero.locator(surface.cta)
      await expect(cta).toBeVisible()
      await expect(cta).toHaveAttribute('href', surface.to)

      const geometry = await page.evaluate(({ heroSel, ctaSel, copySel }) => {
        const vis = (sel) => [...document.querySelectorAll(sel)].filter((e) => e.offsetParent !== null)[0]
        const hero = vis(heroSel)
        const cta = vis(ctaSel)
        const copy = vis(copySel)
        const box = (e) => { const b = e.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height, bottom: b.bottom } }
        return {
          heroBox: box(hero), ctaBox: box(cta),
          insideCopy: copy.contains(cta),
          h1Bottom: box(vis(`${heroSel} h1`)).bottom,
        }
      }, { heroSel: surface.hero, ctaSel: surface.cta, copySel: surface.copy })

      // IN the copy column, not floating in the masthead's own corner.
      expect(geometry.insideCopy, 'the action has drifted out of the copy column').toBe(true)

      // A real button, not an 11px underlined link. The old one was 23px tall.
      expect(geometry.ctaBox.h, 'the action is too small to read as a button').toBeGreaterThanOrEqual(36)

      // Not parked in the top-right corner: it must sit BELOW the headline, in
      // the lower half of the masthead, rather than above it in the topline.
      expect(geometry.ctaBox.y, 'the action has floated back above the headline')
        .toBeGreaterThan(geometry.h1Bottom - geometry.heroBox.h / 2)
    })
  }

  // The slabs were sized around furniture that no longer exists. #331 is the
  // precedent: a box that keeps its old floor after losing its tallest child
  // turns the saving into dead black.
  test('neither masthead keeps a hole where the figure strip used to be', async ({ page }) => {
    const bad = []
    for (const surface of PREMIUM) {
      await go(page, surface.route)
      await expect(page.locator(surface.hero)).toBeVisible()
      const dead = await page.evaluate(({ heroSel, copySel }) => {
        const vis = (sel) => [...document.querySelectorAll(sel)].filter((e) => e.offsetParent !== null)[0]
        const hero = vis(heroSel)
        const copy = vis(copySel)
        const cs = getComputedStyle(hero)
        const padBottom = parseFloat(cs.paddingBottom)
        return Math.round(hero.getBoundingClientRect().bottom - copy.getBoundingClientRect().bottom - padBottom)
      }, { heroSel: surface.hero, copySel: surface.copy })
      // Anything past a few pixels means the min-height is holding open a gap
      // the content no longer fills.
      if (dead > 24) bad.push(`  ${surface.route}: ${dead}px of empty masthead below the copy`)
    }
    expect(bad.join('\n'), 'dead space left by the removed figure strip').toBe('')
  })

  // The one figure that survived, and the form it survived in: scoping the
  // search rather than decorating the masthead (Readymag's "Search 1638 fonts").
  test('the family count moved into the search field instead of a stat strip', async ({ page }) => {
    await go(page, '/create/font-gallery')
    await expect(page.locator('.fg-hero')).toBeVisible()
    const placeholder = await page.evaluate(() => {
      const input = [...document.querySelectorAll('.fg-controls input')].filter((e) => e.offsetParent !== null)[0]
      return input ? input.placeholder : null
    })
    expect(placeholder, 'the search field lost its placeholder').toBeTruthy()
    // A real, non-zero count of what the search will run over.
    expect(placeholder, `placeholder was "${placeholder}"`).toMatch(/Search [\d,]+ families/)
    expect(placeholder).not.toMatch(/Search 0 families/)
  })
})
