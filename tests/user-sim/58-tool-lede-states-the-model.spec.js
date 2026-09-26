// The Create tools' opening sentence states the MODEL, not the workflow.
//
// The founder has named "copy that argues for the product instead of showing
// it" as an AI motif five times, and #386 fixed it on the Type Scale by
// keeping the one fact a first-time visitor needs and cannot infer:
// "One base size and one ratio. Every step below is that multiplication."
//
// Two tools still carried the shape #386 removed, down to a shared phrase:
//
//   /create/tint      "Build a tonal system that designers can evaluate and
//                      developers can ship. Start with one colour or import a
//                      palette, tune the curve, then inspect real interface
//                      roles or copy production-ready CSS."
//   /create/gradient  "Compose on a direct canvas, refine every stop in the
//                      inspector, then hand off production-ready CSS, Tailwind
//                      or SVG."
//
// Import / tune / copy and compose / refine / hand off are controls the visitor
// can already see on the screen.
//
// The tools now open on their toolbar, with no lede at all. What is guarded is
// that each old lede stays gone and that no sentence selling the tool appears
// anywhere on its page.
//
// MUTATION: restore a tool's old lede and its test goes red on the `gone`
// sentence; put "production-ready" on any of these pages and the sweep fails.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

// The persona claim is its own motif and gets its own guard: "like a creative
// director" told the reader nothing the specimens do not show better. It is
// listed separately from `production-ready` because it is a different failure —
// flattery rather than a vague capability claim — and because a future rewrite
// is far more likely to reach for one than the other.
const BANNED_PHRASES = ['production-ready', 'like a creative director']

// ── The tools rebuilt to the design's drawn screen carry NO lede ────────────
// A tool page has no big page title and no paragraph
// under it — the tool's name is a 15px label in the sticky tool toolbar, and
// the work starts directly below. The lede these pages had is deleted, not
// moved, so what is guarded now is that it stays gone and that no sentence
// selling the tool grows back in its place.
const NO_LEDE = [
  { route: '/create/gradient', heading: 'Gradient', gone: 'Colour stops and where each one sits.' },
  { route: '/create/tint', heading: 'Tint', gone: 'One base colour and one curve.' },
  { route: '/create/font-pair', heading: 'Font Pair', gone: 'Two families — one for headings, one for body. Every preview below is those two, together.' },
]

test('no tool sells itself instead of showing itself', async ({ page }) => {
  // The vague-claim vocabulary the anti-slop bar names. Both old ledes used it;
  // it is the one word they shared, so it is worth a guard of its own.
  //
  // The check is scoped to the page BODY TEXT rather than the DOM, so a code
  // sample or an export that legitimately contains the words would still be
  // caught — there are none on these two pages today, and if one arrives this
  // should be re-read rather than loosened silently.
  for (const { route, heading } of NO_LEDE) {
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, route)
    await expect(page.locator('h1')).toHaveText(heading)

    const body = await page.evaluate(() => document.body.innerText)
    // POSITIVE CONTROL: the page really did render its prose, so the absence
    // below is an absence from a real page and not from an empty one.
    expect(body.length, `${route} should have rendered real text`).toBeGreaterThan(400)
    expect(body).toContain(heading)

    for (const phrase of BANNED_PHRASES) {
      expect(
        body.toLowerCase(),
        `${route} is selling itself with "${phrase}" instead of showing the output`,
      ).not.toContain(phrase)
    }
  }
})

for (const t of NO_LEDE) {
  test(`${t.route} opens on its toolbar, with no lede and no sales line`, async ({ page }) => {
    watch(page, 'someone landing on a tool page cold, from search')
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, t.route)
    // POSITIVE CONTROL: the tool mounted, and its h1 is the toolbar label.
    const h1 = page.locator('h1')
    await expect(h1).toHaveText(t.heading)
    await expect(page.locator('[data-tool-toolbar] h1')).toHaveCount(1)
    // No paragraph shares the toolbar with the label.
    await expect(page.locator('[data-tool-toolbar] p')).toHaveCount(0)
    const body = await page.evaluate(() => document.body.innerText)
    expect(body.length, `${t.route} should have rendered real text`).toBeGreaterThan(200)
    expect(body, 'the old lede is gone').not.toContain(t.gone)
    for (const phrase of BANNED_PHRASES) expect(body.toLowerCase()).not.toContain(phrase)
  })
}
