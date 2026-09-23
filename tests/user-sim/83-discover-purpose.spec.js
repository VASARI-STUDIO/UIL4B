// What the three Discover surfaces are MADE OF, as an assistive technology
// receives it — and whether the index tells the truth about the libraries it
// links to.
//
// ── WHY THIS FILE IS ABOUT "PURPOSE" AND NOT ONLY ABOUT ACCESSIBILITY ───────
//
// QUALITY-RUBRIC dimension 1 asks: on arrival, is it clear what this is and
// what to do, and is the content TRUE? The landmark list is how a non-visual
// reader answers the first half on arrival — `principle-accessible-design`
// lists landmark order beside heading hierarchy for exactly that reason — and
// a count printed on a card is the second half, because a card that
// under-counts the page it links to is content that is false.
//
// Measured 2026-09-13 on the built preview, signed out and signed in, off
// Chrome's accessibility tree rather than off the markup. Three faults:
//
//   1. /discover had FOUR landmarks and not one of them named content:
//
//        navigation("Primary") | main | contentinfo | navigation("Footer")
//
//      The <section> holding the eight library cards — the block
//      SurfaceLanding.jsx's own comment calls "the page" — carried no
//      accessible name, and a <section> without one computes to `generic`.
//      Both galleries BENEATH this surface already named their results
//      region; the index above them was the only page in the set whose
//      subject could not be reached from the landmark list.
//
//   2. On both galleries the results region DISAPPEARED when a filter emptied
//      the grid, because the <section> wrapped only the populated arm of the
//      branch. Filtering to zero deleted the one landmark describing results
//      and left the closing CTA — "Can't find what you're looking for?" — as
//      the only landmark on the page about content.
//
//   3. The /discover Palette Library card counted GALLERY_PALETTES (64) while
//      /discover/palettes renders LIBRARY_PALETTES (101, of which 71 are
//      visible signed out). The card under-counted the library by 37 while
//      its own description sold the brand systems as the reason to open it.
//
// ── WHY THE ASSERTIONS ARE ON THE COMPUTED TREE AND NOT ON THE MARKUP ───────
//
// Nothing in the source said "region". The role came from the ELEMENT: a
// <section> with an accessible name is a landmark and one without is generic.
// A markup-shaped assertion — `expect(section).toHaveAttribute(
// 'aria-labelledby', 'surface-grid-heading')` — would have passed on the
// BROKEN build of fault 2 (the attribute was present and well-formed the
// whole time, just on an element that only existed in one state), and would
// pass again the day someone restores the wrong element carrying the right
// attribute. LibraryGrid proves the same point from the other side: it spread
// `aria-labelledby` onto a bare <div> for months, the attribute read
// perfectly, and Chrome discarded every name because `generic` prohibits one.
// So what is asserted here is the role and name a reader actually receives.
//
// ── THE CONTROLS ───────────────────────────────────────────────────────────
//
// `the probe can tell a region from a group` injects one named <section> and
// one role=group <div> of its own and fails unless the probe reports a
// landmark for the first and a non-landmark for the second. Without it, a
// probe that silently stopped resolving names would make every assertion
// below pass on an empty result. Every other test additionally asserts its
// route ARRIVED (the h1 it expects is on screen) before measuring, because
// `go()` resolving on a loading shell would otherwise be reported as a
// confident fact about a page that was not there.
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'

const LANDMARKS = new Set([
  'region', 'banner', 'complementary', 'contentinfo', 'form', 'main', 'navigation', 'search',
])

/**
 * Chrome's own accessibility tree, walked from the root through `childIds` so
 * the result is in TREE order.
 *
 * Not `nodes.filter(...)` on the flat array: `Accessibility.getFullAXTree`
 * does not return its nodes in document order, so a landmark LIST built by
 * filtering reports a believable but wrong order — on /discover/palettes the
 * flat array puts contentinfo third, above two regions that are inside main.
 */
async function axTree(page) {
  const client = await page.context().newCDPSession(page)
  const { nodes } = await client.send('Accessibility.getFullAXTree')
  await client.detach()
  const byId = new Map(nodes.map((n) => [n.nodeId, n]))
  const out = []
  const seen = new Set()
  ;(function walk(node) {
    if (!node || seen.has(node.nodeId)) return
    seen.add(node.nodeId)
    if (node.role?.value && !node.ignored) {
      out.push({ role: node.role.value, name: (node.name?.value || '').trim() })
    }
    for (const childId of node.childIds || []) walk(byId.get(childId))
  })(nodes.find((n) => !n.parentId) || nodes[0])
  return out
}

/** The landmark list, as one printable string — what a reader hears on arrival. */
async function landmarks(page) {
  const tree = await axTree(page)
  return tree
    .filter((n) => LANDMARKS.has(n.role))
    .map((n) => `${n.role}${n.name ? `("${n.name}")` : ''}`)
}

/** Assert the route is really on screen before anything is measured off it. */
async function arrived(page, h1) {
  await expect(
    page.getByRole('heading', { level: 1, name: h1, exact: true }),
    `the route never arrived — no <h1> reading "${h1}"`,
  ).toBeVisible()
}

test.describe('the Discover surfaces say what they are made of', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
  })

  // ── THE CONTROL ──────────────────────────────────────────────────────────
  test('the probe can tell a region from a group', async ({ page }) => {
    watch(page, 'the probe checking itself')
    await go(page, '/discover')
    await arrived(page, 'Discover')

    // A <section> WITH a name is a landmark. A role=group with a name is not.
    // Both carry a name, so a probe that has stopped resolving names fails on
    // the first branch, and a probe that has stopped resolving ROLES fails on
    // the second.
    await page.evaluate(() => {
      const main = document.querySelector('main')
      const section = document.createElement('section')
      section.setAttribute('aria-label', 'PROBE LANDMARK 8fe1')
      section.textContent = 'probe'
      main.appendChild(section)
      const group = document.createElement('div')
      group.setAttribute('role', 'group')
      group.setAttribute('aria-label', 'PROBE GROUP 8fe1')
      group.textContent = 'probe'
      main.appendChild(group)
    })

    const tree = await axTree(page)
    const asLandmark = tree.find((n) => n.name === 'PROBE LANDMARK 8fe1')
    const asGroup = tree.find((n) => n.name === 'PROBE GROUP 8fe1')

    expect(asLandmark, 'the probe did not find the injected <section> at all').toBeTruthy()
    expect(asGroup, 'the probe did not find the injected role=group at all').toBeTruthy()
    expect(asLandmark.role, 'a named <section> must compute to the region landmark').toBe('region')
    expect(LANDMARKS.has(asGroup.role), 'a role=group must NOT be a landmark').toBe(false)
  })

  // ── FAULT 1 ──────────────────────────────────────────────────────────────
  test('/discover offers a landmark that names what the page is made of', async ({ page }) => {
    watch(page, 'someone arriving at Discover with a screen reader')
    await go(page, '/discover')
    await arrived(page, 'Discover')

    const list = await landmarks(page)

    // The name is not typed here. It is read off the <h2> the page renders, so
    // this test follows a legitimate rewording of that heading and still fails
    // if the heading stops naming the region.
    const gridHeading = (await page.locator('h2#surface-grid-heading').innerText()).trim()
    expect(gridHeading.length, 'the grid heading is empty').toBeGreaterThan(0)

    expect(
      list,
      `no landmark names the library grid. Landmarks were: ${list.join(' | ')}`,
    ).toContain(`region("${gridHeading}")`)

    // And it must be INSIDE main — a region that is a sibling of main is a
    // different structure that happens to produce the same list.
    const inMain = await page.evaluate(() => {
      const section = document.querySelector('section[aria-labelledby="surface-grid-heading"]')
      return Boolean(section && document.querySelector('main')?.contains(section))
    })
    expect(inMain, 'the named grid region is not inside <main>').toBe(true)
  })

  // ── FAULT 2 ──────────────────────────────────────────────────────────────
  for (const lib of [
    { route: '/discover/palettes', h1: 'Palette Library', search: 'Search palettes', noun: 'palette' },
    { route: '/discover/gradients', h1: 'Gradient Library', search: 'Search gradients', noun: 'gradient' },
  ]) {
    test(`${lib.h1} keeps its results landmark when a filter empties the grid`, async ({ page }) => {
      watch(page, `someone filtering the ${lib.h1} to nothing`)
      await go(page, lib.route)
      await arrived(page, lib.h1)

      const onArrival = await landmarks(page)
      // The control that this test is measuring a POPULATED page to begin
      // with: if the grid were already empty, the comparison below would be
      // trivially true and prove nothing.
      await expect(
        page.locator('.drh-head p'),
        'the results count did not report a populated grid on arrival',
      ).toHaveText(new RegExp(`[1-9]\\d* ${lib.noun}`))

      await page.getByLabel(lib.search, { exact: true }).fill('qqzzxx-no-such-thing')
      await expect(
        page.locator('.drh-head p'),
        'the filter did not actually empty the grid',
      ).toHaveText(new RegExp(`^0 ${lib.noun}s$`))

      const whenEmpty = await landmarks(page)
      expect(
        whenEmpty.join(' | '),
        'the landmark list changed when the grid emptied',
      ).toBe(onArrival.join(' | '))

      // Said directly, so a future change that keeps the LIST stable by
      // deleting the region from both states still fails here.
      const resultsHeading = (await page.locator('.drh-head h2').innerText()).trim()
      expect(whenEmpty).toContain(`region("${resultsHeading}")`)

      // The heading that names the region must live inside it. It used to sit
      // outside, so in the empty state it named nothing at all.
      const headInside = await page.evaluate(() => {
        const head = document.querySelector('.drh-head')
        return Boolean(head?.closest('section[aria-labelledby]'))
      })
      expect(headInside, 'the result head is not inside the region it labels').toBe(true)
    })
  }

  // ── LibraryGrid's discarded names ────────────────────────────────────────
  test('the Palette Library category grids are named, and are not landmarks', async ({ page }) => {
    watch(page, 'a subscriber entering a category grid with a screen reader')
    // Pro, because the assertion needs MORE THAN ONE category on the page and
    // the tier cap (3 / 10 / everything, 2026-09-18) leaves a signed-out
    // visitor three curated palettes and no Brand systems group at all. The
    // naming rule is about grids, not about entitlement; the teased grid's own
    // name is asserted in 34-palette-library-sections.
    await signIn(page, { plan: 'pro' })
    await go(page, '/discover/palettes')
    await arrived(page, 'Palette Library')

    const tree = await axTree(page)
    const before = await landmarks(page)

    // Every category heading the page renders must be findable as the name of
    // the grid under it. Read off the page rather than typed, for the same
    // reason as above.
    const categories = (await page.locator('.pgl-section-head h3').allInnerTexts()).map((t) => t.trim())
    expect(categories.length, 'expected the palette library to browse in categories').toBeGreaterThan(1)

    for (const category of categories) {
      const named = tree.find((n) => n.name === category && n.role === 'group')
      expect(named, `no group carries the name "${category}" — the name was discarded`).toBeTruthy()
      // A region here would be the /create/palette failure: a landmark per
      // category, crowding the list a reader uses to orient.
      expect(before, `"${category}" became a landmark`).not.toContain(`region("${category}")`)
    }
  })

  // ── FAULT 3 ──────────────────────────────────────────────────────────────
  //
  // THIS USED TO BE A CROSS-PAGE COUNT CHECK, AND THE THING IT CHECKED IS GONE.
  //
  // It read the number off the Discover card and the number off the page the
  // card links to and required them to agree, signed in as Pro because that is
  // the state in which both numbers describe the same set. Then the B2 claims
  // pass DELETED all four count badges — "101 palettes", "100 gradients",
  // "200,000+ icons" and the prompt count — because each was the figure a
  // SIGNED-OUT visitor buys into before clicking through to three rows. The
  // deletion was right. This test was not re-pointed with it, and went red
  // reading `got []`.
  //
  // So the cross-page arithmetic has nothing left to compare, and what is worth
  // guarding now is the deletion itself: the cards must still be there, must
  // still link where they say, and must not quietly re-grow a number.
  //
  // "No card claims a count" is an assertion of ABSENCE, and an absence is
  // satisfied by the cards not existing at all — the exact trap that let four
  // guards on this branch go green while testing nothing. The two positive
  // controls below are what stop that: the library cards are found BY HREF
  // first and the run fails if either is missing, and `probed` counts the meta
  // elements actually examined so a silent selector rename cannot pass.
  test('the Discover cards link where they say, and none of them claims a count', async ({ page }) => {
    watch(page, 'a Pro subscriber reading the index after the count badges came off')
    await signIn(page, { plan: 'pro' })
    await go(page, '/discover')
    await arrived(page, 'Discover')

    const cards = await page.evaluate(() =>
      [...document.querySelectorAll('a.surface-card--link')]
        .map((a) => ({
          href: a.getAttribute('href'),
          title: a.querySelector('.surface-card-title')?.innerText.trim() || null,
          meta: a.querySelector('.surface-card-meta')?.innerText.trim() || null,
          hasMetaEl: !!a.querySelector('.surface-card-meta'),
        })))

    // POSITIVE CONTROL ONE: the two library cards are on the page, by href.
    for (const href of ['/discover/palettes', '/discover/gradients']) {
      const card = cards.find((c) => c.href === href)
      expect(card, `the Discover index no longer carries a card linking to ${href}`).toBeTruthy()
      expect(card.title, `the card for ${href} renders no title`).toBeTruthy()
    }

    // POSITIVE CONTROL TWO: the run examined a real number of cards.
    expect(cards.length, 'the Discover index rendered no linked cards at all').toBeGreaterThan(4)

    // The deletion holds. A count would read "101 palettes", "100 gradients",
    // "200,000+ icons" — a leading digit is the shape of all four.
    for (const c of cards) {
      expect(
        c.meta === null || !/^[\d,]/.test(c.meta),
        `the card for ${c.href} is claiming a count again: "${c.meta}"`,
      ).toBe(true)
    }

    // AND THE SPAN ITSELF IS GONE, not merely empty. `{preview && <span/>}`
    // rendered an empty `.surface-card-meta` in four card feet once the strings
    // came off; this is what fails if that comes back.
    const empties = cards.filter((c) => c.hasMetaEl && c.meta === null).map((c) => c.href)
    expect(empties, 'these cards render an EMPTY meta element in the card foot').toEqual([])

    // "Live specimens" is not a count and was deliberately kept, so it is the
    // control that proves the rule above is not simply matching everything.
    const specimens = cards.find((c) => c.href === '/create/font-gallery')
    expect(specimens?.meta, 'the Font Gallery card lost the one meta line that is not a count').toBe('Live specimens')

    // The libraries still announce their own size on their OWN page, where the
    // number describes what the reader is looking at rather than what they are
    // being sold. That half was never the problem and must not be lost with it.
    for (const href of ['/discover/palettes', '/discover/gradients']) {
      await go(page, href)
      const announced = (await page.locator('.drh-head p').innerText()).trim()
      expect(Number.parseInt(announced, 10), `${href} announced no count of its own`).toBeGreaterThan(0)
      await go(page, '/discover')
    }
  })

  // ── Signed in changes nothing about the structure ────────────────────────
  test('the landmark list is the same signed in as signed out', async ({ page, browser }) => {
    watch(page, 'a signed-in designer browsing Discover')

    const out = {}
    for (const route of ['/discover', '/discover/palettes', '/discover/gradients']) {
      await go(page, route)
      out[route] = (await landmarks(page)).join(' | ')
    }

    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const signedIn = await ctx.newPage()
    await signIn(signedIn, { plan: 'free' })
    for (const route of ['/discover', '/discover/palettes', '/discover/gradients']) {
      await go(signedIn, route)
      const list = (await landmarks(signedIn)).join(' | ')
      expect(list, `${route} exposes a different structure signed in`).toBe(out[route])
    }
    await ctx.close()

    // The control: the signed-out lists were not all empty, which is what a
    // broken probe would produce on both sides and call a match.
    for (const route of Object.keys(out)) {
      expect(out[route], `${route} produced no landmarks at all`).toContain('main')
    }
  })
})
