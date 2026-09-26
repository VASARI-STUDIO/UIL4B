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

// MEASURED AS A UNION BOX, NOT AS A SUM OF HEIGHTS. The old
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
    // away to chase the same number from the other side. The floor is the
    // SMALLER masthead: 20px top and bottom at its narrowest.
    expect(m.padY, 'the masthead has lost the padding that makes it a slab').toBeGreaterThanOrEqual(40)
    await ctx.close()
  })
})
// ── The typography tools' headers ───────────────────────────────────────────
//
// The Font Gallery and Font Pair once opened on their own mastheads, where two
// elements were marked as generated furniture — the taxonomy eyebrow and the
// three-up figure strip — and the onward action sat as a small link in the
// masthead's corner. These tests pin the correction on the tool toolbar that
// replaced the mastheads, so none of it can grow back: the tool states its
// name, its onward action is a real control, and neither the taxonomy eyebrow
// nor a figure strip has come back.
const TOOLBAR_HEADED = [
  { route: '/create/font-gallery', title: 'Font Gallery', action: 'Build a font pair', to: '/create/font-pair' },
  { route: '/create/font-pair', title: 'Font Pair', action: 'Browse the Font Gallery', to: '/create/font-gallery' },
]

test.describe('the typography tools open on their toolbar, with no furniture', () => {
  for (const surface of TOOLBAR_HEADED) {
    test(`${surface.route} states its name and its next action on the toolbar`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 })
      await go(page, surface.route)
      const bar = page.locator('[data-tool-toolbar]')
      await expect(bar).toBeVisible()

      const h1 = bar.getByRole('heading', { level: 1, name: surface.title })
      await expect(h1).toBeVisible()
      // The tool's name is a 15px label, not a display headline.
      const fs = await h1.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))
      expect(fs, 'the tool name has grown back into a display headline').toBeLessThanOrEqual(16)

      const action = bar.getByRole('link', { name: surface.action })
      await expect(action).toBeVisible()
      await expect(action).toHaveAttribute('href', surface.to)
      const box = await action.boundingBox()
      expect(box.height, 'the action is too small to read as a button').toBeGreaterThanOrEqual(36)

      // The two elements marked "AI" are not anywhere on the page.
      await expect(page.locator('main .sec-h-eyebrow')).toHaveCount(0)
      await expect(page.locator('main .fg-hero-stats')).toHaveCount(0)
    })
  }
})

test.describe('the Font Gallery search field', () => {
  // The one figure that survived, and the form it survived in: scoping the
  // search rather than decorating the masthead (Readymag's "Search 1638 fonts").
  test('the family count moved into the search field instead of a stat strip', async ({ page }) => {
    await go(page, '/create/font-gallery')
    await expect(page.locator('[data-tool-toolbar]')).toBeVisible()
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
