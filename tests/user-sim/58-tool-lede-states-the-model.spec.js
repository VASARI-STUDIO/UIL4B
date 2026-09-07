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
// WHY THIS ASSERTS AN EXACT STRING RATHER THAN A REGEX. A "does it mention the
// model" check is satisfied by almost any sentence, and a `not.toContain` on
// the old wording is satisfied the moment a single word changes. Both would go
// on passing through a rewrite that quietly restored the workflow narration.
// The exact sentence is the thing being defended, so the exact sentence is what
// is pinned; changing it deliberately means changing this line deliberately.
//
// MUTATION: restore either old paragraph and that tool's test goes red on the
// text comparison.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const LEDES = [
  {
    route: '/create/tint',
    selector: '.tt-hero-copy p',
    heading: 'Tint Scale Generator',
    text: 'One base colour and one curve. Every step below is that colour at a measured tone.',
  },
  {
    route: '/create/gradient',
    selector: '.ggn-sub',
    heading: 'Gradient Generator',
    text: 'Colour stops and where each one sits. Everything below is those two facts, as CSS, Tailwind or SVG.',
  },
]

for (const lede of LEDES) {
  test(`${lede.route} opens on the model, in one sentence`, async ({ page }) => {
    watch(page, 'someone landing on a tool page cold, from search')
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, lede.route)

    // POSITIVE CONTROL. The lede lives next to the h1, and a page that failed
    // to render would satisfy a `not.toContain` check trivially — so prove the
    // tool actually mounted before believing anything about its copy.
    await expect(page.locator('h1')).toHaveText(lede.heading)

    const p = page.locator(lede.selector).first()
    await expect(p).toBeVisible()
    // `toHaveText` on a single element compares the whole string, so this
    // cannot be satisfied by a second paragraph or a longer one containing it.
    await expect(p).toHaveText(lede.text)

    // One sentence of narration is the budget. Two full stops would mean the
    // three-clause shape had crept back under different words.
    const sentences = lede.text.split('.').filter((s) => s.trim()).length
    expect(sentences, 'the lede is at most two short statements').toBeLessThanOrEqual(2)
  })
}

test('neither tool sells itself with "production-ready"', async ({ page }) => {
  // The vague-claim vocabulary the anti-slop bar names. Both old ledes used it;
  // it is the one word they shared, so it is worth a guard of its own.
  //
  // The check is scoped to the page BODY TEXT rather than the DOM, so a code
  // sample or an export that legitimately contains the words would still be
  // caught — there are none on these two pages today, and if one arrives this
  // should be re-read rather than loosened silently.
  for (const { route, heading } of LEDES) {
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, route)
    await expect(page.locator('h1')).toHaveText(heading)

    const body = await page.evaluate(() => document.body.innerText)
    // POSITIVE CONTROL: the page really did render its prose, so the absence
    // below is an absence from a real page and not from an empty one.
    expect(body.length, `${route} should have rendered real text`).toBeGreaterThan(400)
    expect(body).toContain(heading)

    expect(
      body.toLowerCase(),
      `${route} is back to claiming "production-ready" instead of showing the output`,
    ).not.toContain('production-ready')
  }
})
