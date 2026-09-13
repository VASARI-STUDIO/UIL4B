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
// 2. The defect the same measurement exposed, and the rule that finally
//    removed it. The <=720px block used to hide .dgh-mark, the 92px serif
//    numeral the 390px desktop floor was sized around, and then RAISE
//    min-height anyway: the layout with less in it got a taller box, and the
//    difference was dead black above the copy.
//
//    Successive passes tuned that floor - 430, then 300, then 280 - and every
//    one of them was tuning the wrong number. A floor plus `align-items:end`
//    CANNOT be right at two content lengths at once: whatever the floor adds
//    beyond the content is painted above the headline, so the masthead with
//    LESS in it always gets the bigger hole. Even at 280 the shipped build
//    measured 70px at 768 and 59px at 834 on /discover/palettes with its
//    sentence still there, and 189px past the padding once that sentence came
//    out - 217px from the top border to the h1 in a 280px box at 320.
//
//    FOUNDER DECISION, 2026-09-13: no floor. .dgh-hero is its content plus its
//    padding at every width, `align-items` is `start`, and .dgh-aside takes
//    `align-self:end` so a control column still sits on the slab's baseline.
//    The tests below assert the new rule rather than the old floor.
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

// MEASURED AS A UNION BOX, NOT AS A SUM OF HEIGHTS (2026-09-13). The old
// version added .dgh-copy's height to .dgh-aside's and called the remainder
// dead. That is wrong in both of the masthead's layouts and it was hiding one
// defect while inventing another:
//   - stacked (<=720px), the two are grid rows with `gap:clamp(32px,7vw,110px)`
//     between them, so the SUM understates the content by a whole gap and
//     /create/icons reported ~30px of "dead space" that is the declared gap;
//   - side by side (>720px), they are two columns, so the sum DOUBLE-COUNTS and
//     came out negative - which is how /create/emoji sat on 94px of black above
//     its h1 at 768 while this probe reported dead: -64.
// The distance from the topmost child's top edge to the bottommost child's
// bottom edge is correct in both, and it is what a reader sees as the filled
// part of the slab. `dead` is what is left over past the declared padding.
const MEASURE = `(() => {
  const vis = (sel) => [...document.querySelectorAll(sel)].filter((e) => e.offsetParent !== null)[0]
  const hero = vis('.dgh-hero')
  if (!hero) return null
  const cs = getComputedStyle(hero)
  const padTop = parseFloat(cs.paddingTop)
  const padBottom = parseFloat(cs.paddingBottom)
  const hb = hero.getBoundingClientRect()
  const kids = [...hero.children].filter((e) => e.offsetParent !== null).map((e) => e.getBoundingClientRect())
  const top = kids.length ? Math.min(...kids.map((b) => b.top)) : hb.top + padTop
  const bottom = kids.length ? Math.max(...kids.map((b) => b.bottom)) : hb.bottom - padBottom
  const h1 = vis('.dgh-hero h1')
  return {
    overflowX: hero.scrollWidth - hero.clientWidth,
    heroH: Math.round(hb.height),
    contentH: Math.round(bottom - top),
    padY: Math.round(padTop + padBottom),
    dead: Math.round(hb.height - (bottom - top) - padTop - padBottom),
    // The founder's own framing: painted black between the top border and the
    // headline, past the padding that is supposed to be there.
    emptyAboveH1: h1 ? Math.round(h1.getBoundingClientRect().top - hb.top - padTop) : null,
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
  // and the two Create routes use the --controls variant, which had the same
  // hole from the other direction - a taller ASIDE pushing a bottom-aligned
  // copy column down (94px above the h1 on /create/emoji at 768).
  //
  // 641 is kept because it is the band the old floor was tuned against; 768 is
  // added because it is the first width where the two-column variant applies,
  // and it is where the worst figure of the whole sweep sat.
  for (const width of [390, 641, 768]) {
    test(`at ${width}px the stacked masthead is not mostly empty`, async ({ browser }) => {
      const ctx = await browser.newContext({
        viewport: { width, height: 900 }, isMobile: true, hasTouch: true,
      })
      const page = await ctx.newPage()
      const bad = []
      let probed = 0
      for (const route of SURFACES) {
        await go(page, route)
        await expect(page.locator('.dgh-hero')).toBeVisible()
        await page.waitForTimeout(150)
        const m = await page.evaluate(MEASURE)
        if (m && m.contentH > 0) probed += 1
        // WAS 72px, WHICH WAS THE FLOOR'S ALLOWANCE, NOT A JUDGEMENT. With the
        // min-height gone there is nothing left to hold the box open, so the
        // only slack is sub-pixel rounding on the padding clamp. 4px.
        if (m.dead > 4) bad.push(`  ${route} @${width}: ${m.dead}px of empty `
          + `masthead (hero ${m.heroH}, content ${m.contentH}, padding ${m.padY})`)
        // Stated the way the founder states it, because `dead` alone cannot see
        // the --controls case: a row whose aside is the taller column has no
        // spare height at all and still paints black above the headline.
        if (m.emptyAboveH1 > 4) bad.push(`  ${route} @${width}: ${m.emptyAboveH1}px of `
          + 'black between the top padding and the top of the h1')
      }
      await ctx.close()
      // Positive control. A probe that finds no masthead returns null and
      // pushes nothing, so an empty `bad` would otherwise mean "read nothing"
      // just as convincingly as it means "found nothing wrong".
      expect(probed, 'the probe measured no masthead on any surface').toBe(SURFACES.length)
      expect(bad.join('\n'), `dead space in the stacked masthead at ${width}px`).toBe('')
    })
  }

  // THIS TEST USED TO ASSERT A 280px FLOOR AT 641 AND IT IS NOW THE OPPOSITE
  // ASSERTION, deliberately. The old one guarded against "the masthead
  // collapses onto its copy"; after the founder's 2026-09-13 decision that is
  // exactly what it is meant to do, and /discover/palettes - which now carries
  // a one-line h1 and nothing else - measures 133px at 641 where it used to be
  // held at 280. Keeping the old number would have failed the shipped design.
  //
  // What replaces it is the claim that actually matters and that a floor was
  // only ever a proxy for: the slab must still be big enough to read as a
  // masthead RELATIVE TO ITS OWN CONTENT. The h1 plus a full pad top and bottom
  // is that, and it cannot be satisfied by holding a hole open.
  test('the stacked masthead is its content plus its padding, with no floor', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 641, height: 900 }, isMobile: true, hasTouch: true })
    const page = await ctx.newPage()
    await go(page, '/discover/palettes')
    await expect(page.locator('.dgh-hero')).toBeVisible()
    await page.waitForTimeout(150)
    const m = await page.evaluate(MEASURE)
    const declared = await page.evaluate(() => getComputedStyle(
      [...document.querySelectorAll('.dgh-hero')].filter((e) => e.offsetParent !== null)[0]).minHeight)
    // No floor of any kind, at any width. This is the declaration that caused
    // every version of the hole, so it is asserted by name.
    expect(declared, '.dgh-hero has a min-height again').toMatch(/^(0px|auto)$/)
    // The box is exactly what is in it. Sub-pixel rounding only.
    expect(Math.abs(m.heroH - m.contentH - m.padY),
      `hero ${m.heroH} != content ${m.contentH} + padding ${m.padY}`).toBeLessThanOrEqual(4)
    // And the padding is still doing the slab's work rather than being trimmed
    // away to chase the same number from the other side.
    expect(m.padY, 'the masthead has lost the padding that makes it a slab').toBeGreaterThanOrEqual(56)
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
