// The compressed secondary landings, and the two homepage marks.
//
// Two founder requests of 2026-09-05 land here, and both are the kind of change
// that regresses by ACCRETION rather than by breaking: somebody adds one more
// "why it helps" band to /discover, or a stale count creeps back into a hero
// hint, and nothing fails. So these assert the SHAPE and the DERIVATION, not
// the wording.
//
//   1. [secondary-pages-compress-to-links] — "i want to compress our secondary
//      sales pages to mostly act as linking pages showcasing a tools value
//      proposition then a link". Three pages, and the founder chose the deepest
//      of the three depths offered: value prop plus link, nothing else.
//
//   2. [homepage-hero-buffer-reference] — the drawn "give it a try" pointing at
//      the command bar, and the step marker beside the tools heading.
//
// WHAT THESE DELIBERATELY DO NOT ASSERT: any sentence. Copy on these pages is
// still being worked and a test that pins a phrase would fail the next honest
// rewrite. What is pinned is the page having no pitch section left, its counts
// coming from the data, and each mark being attached to the thing it points at.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHAT THE ROUTE SWAP TOOK, AND WHAT IT DID NOT
// ─────────────────────────────────────────────────────────────────────────────
// · /create/color IS NO LONGER A PAGE. ColorLanding.jsx was deleted with
//   Home.jsx, and the path now falls through to <CreateTool /> and bounces to
//   /create/palette like the other four Create category homes. There is no
//   landing left to be compressed, so it is out of every table below rather
//   than re-pointed — a tool shell is not a secondary sales page and asserting
//   "two bands under main" of one would be measuring the wrong thing.
// · The two remaining landings COMPRESSED FURTHER, by the founder's own
//   2026-09-18 decision quoted in SurfaceIndex.jsx: "/discover and /learn lose
//   their sales intro and go straight to the real library/guide index." The
//   eyebrow, the pitch headline, the lede and the single hero CTA all went. So
//   the hero's "exactly one way in" rule is now "no pitch in the head at all",
//   which is the same request taken one notch deeper — see the test.
import { test, expect } from './base.js'
import { go, restingScrollY, watch, wheelToRest } from './helpers.js'
import { DISCOVER_GROUPS, LEARN_GROUPS } from '../../src/data/toolTree.js'
import { LEARN_ARTICLES } from '../../src/data/learnIndex.js'

const COMPRESSED = ['/discover', '/learn']

// Each landing renders a head and its grid, and NOTHING between the two or
// after the grid. Counted as top-level children of <main>, because that is the
// unit a reader scrolls past: one <header> plus one <section> on /discover, and
// one extra on /learn for the guides that exist (which are links, so they
// belong).
const EXPECTED_BANDS = { '/discover': 2, '/learn': 3 }

// Where each page's real destinations live.
const LINKS = {
  '/discover': '.surface-card--link',
  '/learn': '.lidx-card',
}

test.describe('the secondary landings stay compressed', () => {
  for (const route of COMPRESSED) {
    test(`${route} is a hero and its links, with nothing bolted between them`, async ({ page }) => {
      watch(page, 'visitor landing on a secondary sales page')
      await go(page, route)

      const bands = await page.locator('main#main > *').count()
      expect(bands, `${route} has grown a section: expected ${EXPECTED_BANDS[route]} bands under <main>`)
        .toBe(EXPECTED_BANDS[route])

      // The three things that were deleted, and the classes that would tell us
      // any of them came back. The pillar row and the world map were pitch and
      // decoration; the closing SystemCTA was the hero's own call to action a
      // second time, one scroll later.
      for (const gone of ['.sl-pillars', '.sl-pillar', '.wmap', '.wmap-blip', '.system-cta']) {
        await expect(page.locator(gone), `${route} brought back ${gone}`).toHaveCount(0)
      }

      // NO PITCH IN THE HEAD. This used to read "exactly one `.ui-pill`",
      // because the fault it caught was a SECOND hero button pointing OUT of
      // the surface the visitor had just arrived at. The founder took it a
      // notch deeper on 2026-09-18 — the head is now the surface's own name and
      // one derived count line, with no call to action at all, on the grounds
      // that a visitor who clicked Discover has already decided to browse.
      //
      // So the rule is the absence, PAIRED WITH THE PRESENCE that makes it mean
      // something: a head that rendered nothing would satisfy "no links" for
      // free, and that is the failure mode this whole file is written against.
      const head = page.locator('.home-hero')
      await expect(head.locator('.home-hero-h1'), `${route} lost the name of the surface`).toHaveCount(1)
      await expect(head.locator('.home-hero-hint'), `${route} lost its derived count line`).toHaveCount(1)
      await expect(
        head.locator('a, button'),
        `${route} has grown a call to action back into its head — the founder removed the sales `
        + 'intro from both index pages on 2026-09-18, and a pitch above the index is the toll on a '
        + 'decision the visitor already made in the nav',
      ).toHaveCount(0)

      // And the grid is real links, not a list of names. On /learn that is the
      // guide cards rather than the surface grid: every LEARN_GROUPS row is
      // still `soon: true`, so the roadmap grid is correctly link-free and the
      // pages you can actually open are the three published articles.
      await expect(page.locator(LINKS[route]).first()).toBeVisible()
    })
  }

  test('every hero count is read off the data rather than typed into the copy', async ({ page }) => {
    watch(page, 'visitor checking whether the numbers are true')

    // /discover said "Four curated libraries are ready now" for months after it
    // stopped being four — the Prompt Library shipped, then /discover/resources
    // did, and the sentence could not know. It counts now.
    await go(page, '/discover')
    const live = DISCOVER_GROUPS.filter((g) => !g.soon).length
    const soon = DISCOVER_GROUPS.length - live
    const discoverHint = await page.locator('.home-hero-hint').innerText()
    expect(discoverHint, 'the Discover hint no longer matches the group data')
      .toMatch(new RegExp(`\\b${live}\\b[\\s\\S]*\\b${soon}\\b`))

    // The live cards and the Soon cards are the two halves of that same count,
    // so the hint cannot disagree with the grid beneath it.
    await expect(page.locator('.surface-card--link')).toHaveCount(live)
    await expect(page.locator('.surface-card:not(.surface-card--link)')).toHaveCount(soon)

    await go(page, '/learn')
    const learnHint = await page.locator('.home-hero-hint').innerText()
    expect(learnHint, 'the Learn hint no longer matches the article registry')
      .toContain(String(LEARN_ARTICLES.length))
    await expect(page.locator('.lidx-card')).toHaveCount(LEARN_ARTICLES.length)
    await expect(page.locator('.surface-card:not(.surface-card--link)'))
      .toHaveCount(LEARN_GROUPS.filter((g) => g.soon).length)

    // /create/color's third assertion is gone with the page. It read one
    // `.surface-card--link` per LIVE colour tool, so the landing could not
    // advertise a tool the tree had taken back into the workshop. That honesty
    // rule now has no page to break: the path is a category home that bounces
    // to /create/palette, and the only inventory it could have misstated is the
    // Create mega-menu's, which 43-mega-menu-contents counts against the same
    // CREATE_GROUPS rows on /discover.
  })

  // ── DELETED: 'each colour tool card names its own next action' ────────────
  //
  // WHAT IT GUARDED. /create/color's grid gave every tile its own verb —
  // "Build a palette", "Check contrast" — instead of six identical "Open"s, on
  // the Shopify Explore Tools reasoning quoted in the old body: a page whose
  // remaining job is LINKING has nowhere else left to say what happens next, so
  // repeated link text is a defect rather than consistency.
  //
  // WHY IT IS GONE. ColorLanding.jsx was deleted with Home.jsx and
  // /create/color is now a redirect, so there is no grid of colour tool cards
  // anywhere in the app. Re-pointing it at /discover was considered and
  // rejected: that grid's foot is one shared "Browse →" by design — six library
  // indexes genuinely take the same action, and the tile's own name carries the
  // difference — so moving the rule there would fail a page behaving as its
  // author intended, which is the opposite of what this test was for.
  //
  // WHERE THE SURVIVING PART LIVES. The claim that the colour tools are each
  // reachable and each named is now made where the tools are: the bench panel
  // on `/` (`.sp-panel-tools`, one named link per tool, counted in
  // 04-premium-home) and the Create mega-menu (43-mega-menu-contents).
})

test.describe('the homepage marks point at something real', () => {
  test('the drawn mark hangs beside the command bar and is hidden from assistive tech', async ({ page }) => {
    watch(page, 'first-time visitor meeting the hero on a wide screen')
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, '/')

    const mark = page.locator('.tim')
    await expect(mark).toBeVisible()
    // The whole argument for the mark is that it POINTS at a control. If it
    // ever floats free of the command bar it is decoration, which is the
    // failure the anti-slop bar names by name.
    await expect(mark, 'the mark is not aria-hidden').toHaveAttribute('aria-hidden', 'true')

    const geometry = await page.evaluate(() => {
      const m = document.querySelector('.tim').getBoundingClientRect()
      const bar = document.querySelector('.hcmd').getBoundingClientRect()
      return {
        gap: Math.round(bar.left - m.right),
        overlapsVertically: m.bottom > bar.top && m.top < bar.bottom,
      }
    })
    expect(geometry.gap, 'the mark has drifted away from the bar it points at')
      .toBeGreaterThanOrEqual(0)
    expect(geometry.gap, 'the mark is no longer beside the bar').toBeLessThan(60)
    expect(geometry.overlapsVertically, 'the mark no longer sits at the bar').toBe(true)

    // It must never be the reason a hero scrolls sideways.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow, 'the hero scrolls horizontally at 1440px').toBe(0)
  })

  // THE MARK NO LONGER GOES. This asserted it was hidden at 1180 and under. The
  // design (UIL4B - Spectrum.dc.html lines 166-170) keeps it at every
  // width: with no margin to hang in, it drops into the flow ABOVE the bar,
  // left-aligned, arrow shrunk and turned to point down into the field. So: visible, above the bar, not over it, no overflow.
  test('with no margin left, the drawn mark sits above the bar instead', async ({ page }) => {
    watch(page, 'visitor on a narrow laptop, then a phone')
    for (const width of [1180, 1024, 390, 320]) {
      await page.setViewportSize({ width, height: 900 })
      await go(page, '/')
      await expect(page.locator('.tim'), `the mark is gone at ${width}px`).toBeVisible()
      const geo = await page.evaluate(() => {
        const m = document.querySelector('.tim').getBoundingClientRect()
        const bar = document.querySelector('.hcmd').getBoundingClientRect()
        return { above: m.bottom <= bar.top + 1, gap: Math.round(bar.top - m.bottom) }
      })
      expect(geo.above, `${width}px: the mark overlaps the bar instead of sitting above it`).toBe(true)
      expect(geo.gap, `${width}px: the mark has drifted away from the bar`).toBeLessThan(60)
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(overflow, `the homepage scrolls sideways at ${width}px`).toBe(0)
    }
  })

  // ── THE STEP MARKER MOVED FROM A DECORATION TO THE NAVIGATION ─────────────
  //
  // Home had TWO markers of scroll position in the tools narrative: the rail of
  // `.hstep` rows, and a strip of `.hsteps-tick` marks beside the heading that
  // duplicated it. This test held them to one answer, and asserted the strip
  // was `aria-hidden` because a decorative second copy of the rail must not be
  // announced twice.
  //
  // Spectrum has ONE. `<SpectrumBench>` draws `.sp-rail-row` buttons inside a
  // real `<nav aria-label="Jump to a tool group">` — not a tablist, because all
  // five panels are rendered and reachable by scrolling past the rail entirely
  // — and marks the row for the panel the reader is on with `is-on` and
  // `aria-current="true"`. So there is no second source to agree with, and the
  // aria-hidden assertion has been dropped rather than moved: the rail is
  // navigation now and hiding it would be the defect.
  //
  // WHAT SURVIVES, AND IT IS THE HALF THAT ACTUALLY CAUGHT THINGS: one row is
  // marked, never two, the marked row corresponds to a real panel, and IT MOVES
  // as the page scrolls. A mark frozen on step one says the section is a list
  // when it is a walkthrough.
  //
  // THE SCROLL IS DRIVEN THROUGH THE HELPERS, NOT `scrollIntoViewIfNeeded()`.
  // Lenis owns the scroll on this route and re-asserts its virtual position
  // every frame, so a native scroll is undone before the next paint —
  // SpectrumBench.jsx records measuring exactly that (scrollY 0 before a rail
  // click, scrollY 0 1.6s after it). `wheelToRest()` sends a real gesture and
  // waits on the scroll layer rather than on a stopwatch.
  test('the bench rail marks the tool group you are on, and the mark moves', async ({ page }) => {
    watch(page, 'visitor scrolling into the tools narrative')
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, '/')

    const state = async () => page.evaluate(() => {
      const rows = [...document.querySelectorAll('.sp-rail-row')]
      return {
        rows: rows.length,
        panels: document.querySelectorAll('.sp-step').length,
        // Both spellings, because they are two halves of one claim: `is-on`
        // is what a sighted reader sees and `aria-current` is what a screen
        // reader is told. A row that carried one without the other would be
        // telling two readers different things about where they are.
        lit: rows.map((el) => el.classList.contains('is-on')).indexOf(true),
        current: rows.map((el) => el.getAttribute('aria-current') === 'true').indexOf(true),
        marked: rows.filter((el) => el.classList.contains('is-on')).length,
      }
    })

    const before = await state()
    // One row per panel, from one source. Five panels and four rows would mean
    // a tool group a reader meeting one panel at a time can never find.
    expect(before.rows, 'the bench rail rendered no rows, so everything below is vacuous')
      .toBeGreaterThan(0)
    expect(before.rows, 'the rail and the panels disagree about how many tool groups there are')
      .toBe(before.panels)

    await restingScrollY(page, 'the front door at the top')
    await expect.poll(async () => (await state()).marked,
      { message: 'exactly one rail row is lit' }).toBe(1)
    const first = await state()
    expect(first.current, 'the lit row and the aria-current row are not the same row').toBe(first.lit)

    // …and it MOVES. Far enough to clear the hero and the ramp above the bench.
    await wheelToRest(page, 3200, 'the front door after scrolling into the bench')
    await expect.poll(async () => (await state()).lit, { timeout: 8000 })
      .not.toBe(first.lit)
    const later = await state()
    expect(later.marked, 'more than one rail row is lit at once').toBe(1)
    expect(later.current, 'the lit row and the aria-current row disagree after scrolling').toBe(later.lit)
  })
})
