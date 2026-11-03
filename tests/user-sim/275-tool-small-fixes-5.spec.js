// SPEC 275: FOUR SMALL FIXES TO THE CREATE TOOLS AND LIBRARIES.
//
//   1. Gradient tool: at 360px and under a free account still sees a visible
//      "Pro" on the Selected stop's Tints button, the hex field shows its whole
//      value, and a finger still gets a 44px target.
//   2. Palette and Gradient libraries, signed in on a free plan: the three locked
//      cards never leave a lone card beside an empty cell at 768 (nor at any
//      other width), and a near-white swatch has a hairline along the foot of its
//      stripes.
//   3. Emoji Library on a phone: the twelve categories sit in the Filters sheet,
//      so no chip row scrolls sideways; the search placeholder is not cut off.
//   4. Learn hub: the unwritten topics are plain rows (title, summary, "Soon"),
//      with no border, link or arrow, and the intro line reads "These topics
//      aren't written yet."
//
// Card 5 (the Video tab's predicted output size) is covered by the unit tests in
// tests/unit/media-encode.test.js.
//
// MUTATIONS (each should turn the named test red):
//   - gradient.css: hide `.grd-pro-tag` in the `max-width: 360px` block: "Tints
//     keeps a visible Pro" fails;
//   - palette-gallery.css: delete the `.pgal-grid--locked` flex rules: "the locked
//     cards share their rows" fails at 768;
//   - gradient-gallery.css: delete the `.grg-grid--locked` flex rules: the same
//     test fails on the Gradient Library;
//   - palette-gallery.css: delete the `.pgal-stripes` border-bottom: "the stripes
//     end in a hairline" fails;
//   - EmojiLibrary.jsx: put `quick={0}` back on the toolbar: "the categories sit in
//     the Filters sheet" fails;
//   - EmojiLibrary.jsx: lengthen the search placeholder: "the search placeholder
//     fits its field" fails at 320.
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'

const SHOTS = '.claude/scratch/misc5'

// ─────────────────────────────────────────────────────────────────────────────
// 1 · Gradient tool: the Pro cue on Tints
// ─────────────────────────────────────────────────────────────────────────────

for (const [width, touch] of [[320, true], [360, true], [320, false], [360, false]]) {
  test.describe(`Gradient Tints at ${width}px${touch ? ' on a finger' : ' with a mouse'}`, () => {
    test.use({ viewport: { width, height: 844 }, hasTouch: touch, isMobile: touch })

    test('Tints keeps a visible Pro, a whole hex and a 44px target', async ({ page }) => {
      watch(page, `a free designer at ${width}px`)
      await signIn(page, { plan: 'free' })
      await go(page, '/create/gradient')
      const button = page.getByRole('button', { name: 'Tints of stop 1 (Pro)', exact: true })
      await expect(button).toBeVisible()
      // innerText leaves out what is display:none, so this is what a person can read.
      await expect.poll(() => button.evaluate((el) => el.innerText.trim())).toBe('Pro')
      const hex = page.getByRole('textbox', { name: 'Stop 1 hex' })
      const clipped = await hex.evaluate((el) => el.scrollWidth - el.clientWidth)
      expect(clipped, 'the stop hex is cut off by the Tints button').toBeLessThanOrEqual(1)
      if (touch) expect((await button.boundingBox()).height, 'touch target height').toBeGreaterThanOrEqual(44)
      await button.scrollIntoViewIfNeeded()
      await page.screenshot({ path: `${SHOTS}/gradient-tints-${width}-${touch ? 'touch' : 'mouse'}.png` })
    })
  })
}
