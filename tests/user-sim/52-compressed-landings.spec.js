// The compressed secondary landings.
//
// One request lands here, and it is the kind of change
// that regresses by ACCRETION rather than by breaking: somebody adds one more
// "why it helps" band to /discover, or a stale count creeps back into a hero
// hint, and nothing fails. So these assert the SHAPE and the DERIVATION, not
// the wording.
//
//   [secondary-pages-compress-to-links] — the secondary sales pages act mostly
//      as linking pages showcasing a tool's value proposition, then a link. Three
//      pages, at the deepest of the three depths offered: value prop plus link,
//      nothing else.
//
// WHAT THESE DELIBERATELY DO NOT ASSERT: any sentence. Copy on these pages is
// still being worked and a test that pins a phrase would fail the next honest
// rewrite. What is pinned is the page having no pitch section left, its counts
// coming from the data.
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
// · The two remaining landings COMPRESSED FURTHER, as recorded in
//   SurfaceIndex.jsx: /discover and /learn lose their sales intro and go straight
//   to the real library/guide index. The
//   eyebrow, the pitch headline, the lede and the single hero CTA all went. So
//   the hero's "exactly one way in" rule is now "no pitch in the head at all",
//   which is the same request taken one notch deeper — see the test.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'
import { DISCOVER_GROUPS, DISCOVER_LIBRARIES } from '../../src/data/toolTree.js'
import { LEARN_ARTICLES } from '../../src/data/learnIndex.js'

const COMPRESSED = ['/discover', '/learn']

// Each landing renders a head and its grid, and NOTHING between the two or
// after the grid. Counted as top-level children of <main>, because that is the
// unit a reader scrolls past: one <header> plus one <section> on /discover, and
// one extra on /learn for the guides that exist (which are links, so they
// belong).
// Signed out. The roadmap of unwritten topics is an admin-only band, so /learn
// is a head and the guides.
// /discover is three since the index gained its "Ready to open today" picks
// (SurfaceIndex TodayDiscover, commit e2f720d7f): head, today's picks, the doors.
// Each band is named below so a fourth, unnamed one still fails.
const EXPECTED_BANDS = { '/discover': 3, '/learn': 2 }
const DISCOVER_BAND_LABELS = ['srf-today-h', 'surface-grid-heading']

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
      if (route === '/discover') {
        const labels = await page.locator('main#main > section').evaluateAll((els) => els.map((el) => el.getAttribute('aria-labelledby')))
        expect(labels, '/discover bands: the picks, then the doors, nothing else').toEqual(DISCOVER_BAND_LABELS)
      }

      // The three things that were deleted, and the classes that would tell us
      // any of them came back. The pillar row and the world map were pitch and
      // decoration; the closing SystemCTA was the hero's own call to action a
      // second time, one scroll later.
      for (const gone of ['.sl-pillars', '.sl-pillar', '.wmap', '.wmap-blip', '.system-cta']) {
        await expect(page.locator(gone), `${route} brought back ${gone}`).toHaveCount(0)
      }

      // NO PITCH IN THE HEAD. This used to read "exactly one `.ui-pill`",
      // because the fault it caught was a SECOND hero button pointing OUT of
      // the surface the visitor had just arrived at. It later went a
      // notch deeper — the head is now the surface's own name and
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

    // The hero counts the libraries; the cards are every live row, Community included.
    await go(page, '/discover')
    const live = DISCOVER_LIBRARIES.length
    const discoverHint = await page.locator('.home-hero-hint').innerText()
    expect(discoverHint, 'the Discover hint no longer matches the group data')
      .toMatch(new RegExp(`\\b${live}\\b`))
    // Signed out, unfinished libraries are neither counted nor drawn.
    expect(discoverHint).not.toMatch(/still being built/i)

    // The doors are the live libraries; Community is the "Also in Discover" line
    // under them, not a door. Each door is a `.surface-card` that holds the one
    // `.surface-card--link`, so a door without its link would be a dead card.
    await expect(page.locator('.surface-card--link')).toHaveCount(DISCOVER_LIBRARIES.length)
    await expect(page.locator('.surface-card:not(:has(.surface-card--link))')).toHaveCount(0)

    await go(page, '/learn')
    const learnHint = await page.locator('.home-hero-hint').innerText()
    expect(learnHint, 'the Learn hint no longer matches the article registry')
      .toContain(String(LEARN_ARTICLES.length))
    // The guides only: Help and Design Principles sit after them in the "Using
    // UIL4B" group and are not articles (207-learn-hub.spec.js).
    await expect(page.locator('.lidx-sections section:not(#learn-topic-using-uil4b) .lidx-card'))
      .toHaveCount(LEARN_ARTICLES.length)
    // The unwritten-topics roadmap is an admin-only sight.
    await expect(page.locator('.surface-card:not(.surface-card--link)')).toHaveCount(0)

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
