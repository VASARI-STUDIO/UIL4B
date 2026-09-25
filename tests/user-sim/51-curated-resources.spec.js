// /discover/resources — the Curated Resources library, measured in a rendered
// browser rather than reasoned about.
//
// WHY THE RENDER HALF EXISTS AT ALL. tests/unit/discover-handoff.test.js is the
// wide half: it drives the real GATED_ROUTES derivation over all 13 curated
// records, which no browser needs to do. This half exists because THE BUILD AND
// THE UNIT SUITE BOTH WENT GREEN ON A PAGE THAT RENDERED NOTHING once already in
// this repo (#colorstudio-dead-sections), and because the properties below are
// only true of the painted page:
//
//   • a hand-off that resolves to <ComingSoon/> is a live <a> with a correct
//     href — only following it shows the dead end;
//   • "looks deliberate when sparse" is a layout claim, and this surface starts
//     nearly empty by design and grows one hand-picked entry at a time;
//   • an external link's rel is a source fact, but whether the arrow and the
//     sr-only phrase actually reach the accessibility tree is not.
//
// SPARSE IS THE DEFAULT CASE HERE, NOT AN EDGE CASE. Four categories hold
// three or four resources each. A gallery that only looks right full is a real
// defect for a section whose whole premise is that it is curated, so the filter
// path below is asserted at its SMALLEST — three rows — and not just at 13.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const ROUTE = '/discover/resources'

// Read the page's own structure out of the DOM. Everything is filtered to the
// VISIBLE element (offsetParent !== null): this app keeps inactive views
// mounted, so a bare querySelector can return a 0x0 hidden sibling and every
// measurement taken from it is a confident number about nothing.
// An IIFE, not a bare arrow. page.evaluate() given a STRING evaluates it as
// an EXPRESSION, so `() => {...}` yields a function object, which is not
// serializable and arrives as undefined — every assertion then reads a
// property of nothing, which is how all five of these first failed.
const SURVEY = `(() => {
  const vis = el => el && el.offsetParent !== null
  const all = sel => [...document.querySelectorAll(sel)].filter(vis)
  return {
    h1: document.querySelector('h1')?.textContent?.trim() || null,
    bands: all('.cur-band').map(b => ({
      cat: b.dataset.cat,
      rows: b.querySelectorAll('.cur-row').length,
      hasLead: !!b.querySelector('.cur-lead'),
    })),
    leads: all('.cur-lead').length,
    rows: all('.cur-row').length,
    // SCOPED TO .cur-wrap DELIBERATELY. Unscoped, this also collects the
    // AppFooter's "Built in Brisbane by Dylan Coleman" link, which carries
    // noopener noreferrer and NO nofollow ON PURPOSE — nofollow is for the
    // curated and member-submitted third-party links, and that one is ours.
    // Asserting the curated convention over the whole document would either
    // fail on it or force the wrong rel onto it.
    externals: all('.cur-wrap a[href^="http"]').map(a => ({
      rel: a.getAttribute('rel'),
      target: a.getAttribute('target'),
      text: a.textContent.trim(),
    })),
    handoffs: all('.cur-go, .cur-lead-foot a').map(a => a.getAttribute('href')),
    palettes: all('.cur-pal').length,
    overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
  }
})()`

test('the curated library renders its real contents, not an empty shell', async ({ page }) => {
  watch(page, 'curated-resources')
  await go(page, ROUTE)

  const s = await page.evaluate(SURVEY)

  expect(s.h1).toBe('Curated Resources')
  // Four category bands, each with a lead item, 13 resources in total. These
  // are the counts the DATA holds; a band that silently rendered zero rows
  // would still leave the page looking plausible from the hero alone.
  expect(s.bands.length).toBe(4)
  expect(s.leads).toBe(4)
  expect(s.rows + s.leads).toBe(13)
  for (const b of s.bands) {
    expect(b.hasLead, `band ${b.cat} lost its lead item`).toBe(true)
  }
  // the gradient, palette and font
  // sites left this page, because a UIL4B library already does that job, and
  // no category may stay behind as an empty band or a chip that filters to
  // nothing. The three palette sites were the only records carrying sample
  // swatches, so no swatch strip may be drawn either: a strip under a resource
  // with no colours would be decoration pretending to be content.
  expect(s.bands.map(b => b.cat)).toEqual(['inspiration', 'dev-tools', 'free-assets', 'components'])
  expect(s.palettes).toBe(0)
  const chips = await page.locator('.cur-toolbar .lbry-filter').allTextContents()
  expect(chips.length, 'no category chip is rendered — the check below would be vacuous').toBeGreaterThan(1)
  for (const gone of ['Gradients', 'Palettes', 'Fonts']) {
    expect(chips.map(c => c.trim()), `the ${gone} chip filters to nothing`).not.toContain(gone)
  }
})

test('every outbound link is a real external link with the full rel convention', async ({ page }) => {
  watch(page, 'curated-resources')
  await go(page, ROUTE)

  const { externals } = await page.evaluate(SURVEY)
  expect(externals.length).toBe(13)
  for (const a of externals) {
    expect(a.rel, `rel on “${a.text}”`).toBe('noopener noreferrer nofollow')
    expect(a.target, `target on “${a.text}”`).toBe('_blank')
    // The arrow is aria-hidden, so the phrase has to carry the meaning.
    expect(a.text, `“${a.text}” never says it opens a new tab`).toContain('opens in a new tab')
  }
})

test('no hand-off lands on a Coming Soon placeholder', async ({ page }) => {
  watch(page, 'curated-resources')
  await go(page, ROUTE)

  const { handoffs } = await page.evaluate(SURVEY)
  // EXACTLY 4 of the 13 resources hand off today. The other nine point only at
  // Component Designer or Box Shadow, both still `soon`, so they must render NO
  // button rather than one that dead-ends.
  //
  // THE EXACT NUMBER IS THE ASSERTION, not `> 0`. A mutation that dropped the
  // gate and offered `relatedTools[0]` unconditionally SURVIVED the first
  // version of this test: the count check was toBeGreaterThan(0), which 13
  // satisfies just as well as 4, and the navigation check below was blind for
  // a separate reason (see the dead-end detector). 4 vs 13 is the difference
  // the gate makes, so it is what gets pinned.
  expect(handoffs.length).toBe(4)

  // Follow every distinct destination and prove a real tool is on the other
  // side. A href is not a destination until something has been there.
  const seen = new Set(handoffs.map(h => h.split('?')[0]))
  expect(seen.size).toBeGreaterThan(0)
  for (const route of seen) {
    await go(page, route)
    const dead = await page.evaluate(() => ({
      // STRUCTURAL, not a phrase match. The first version looked for "coming
      // soon" and found it nowhere: CreateTool's SoonState is headed
      // "<Tool> is still in the workshop.", and the standalone page it mirrors
      // uses the same .coming-wrap container. Matching the container is what
      // survives a copy edit; the wording is kept as a second signal.
      placeholder: !!document.querySelector('.coming-wrap'),
      workshop: /still in the workshop/i.test(document.body.innerText),
      notFound: /page not found/i.test(document.body.innerText),
    }))
    expect(dead, `${route} is offered as a hand-off but renders a placeholder`)
      .toEqual({ placeholder: false, workshop: false, notFound: false })
  }
})

test('the library still reads as an edited list at its sparsest', async ({ page }) => {
  watch(page, 'curated-resources')
  await go(page, ROUTE)

  // Filter to ONE category — three resources, the smallest state this surface
  // ever shows. The bands collapse to a flat result list on purpose: a result
  // set is for scanning, so it drops the lead treatment.
  await page.evaluate(() => {
    const input = document.querySelector('.cur-toolbar input')
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    setter.call(input, 'component')
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await expect(page.locator('.cur-row')).toHaveCount(3)

  const sparse = await page.evaluate(SURVEY)
  expect(sparse.bands.length).toBe(0)
  expect(sparse.leads).toBe(0)
  expect(sparse.overflowX).toBe(false)
  // Every row still carries its own content at n=3 — no collapsed heights, no
  // rows that render as a bare rule.
  const heights = await page.evaluate(() =>
    [...document.querySelectorAll('.cur-row')]
      .filter(e => e.offsetParent !== null)
      .map(e => Math.round(e.getBoundingClientRect().height)))
  for (const h of heights) expect(h).toBeGreaterThan(40)

  // And the empty state is never a dead end.
  await page.evaluate(() => {
    const input = document.querySelector('.cur-toolbar input')
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    setter.call(input, 'zzzznothingmatches')
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await expect(page.locator('.cur-empty')).toBeVisible()
  await expect(page.locator('.cur-empty button')).toBeVisible()
})

test('the page holds up at 390 and at 1440', async ({ page }) => {
  watch(page, 'curated-resources')

  for (const [w, h] of [[390, 844], [1440, 900]]) {
    await page.setViewportSize({ width: w, height: h })
    await go(page, ROUTE)
    const s = await page.evaluate(SURVEY)
    expect(s.overflowX, `horizontal overflow at ${w}px`).toBe(false)
    expect(s.bands.length, `bands lost at ${w}px`).toBe(4)

    // Nothing may spill past the viewport edge. Filtered to visible elements,
    // because a hidden sibling's rect is meaningless.
    // The phone's category strip (`.lbry-toolbar-quick`) is the one container
    // that is DESIGNED to scroll sideways (toolbars never wrap), so the chips it holds past its edge are scrolled, not spilled. The
    // strip itself is still measured.
    const spills = await page.evaluate(() => [...document.querySelectorAll('.cur-wrap *')]
      .filter(e => e.offsetParent !== null)
      .filter(e => !e.parentElement?.closest('.lbry-toolbar-quick'))
      .filter(e => e.getBoundingClientRect().right > window.innerWidth + 1)
      .map(e => e.className))
    expect(spills, `elements overflow at ${w}px`).toEqual([])
  }
})
