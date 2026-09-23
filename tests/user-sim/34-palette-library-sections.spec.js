// The Palette Library browses in categories.
//
// Founder request (2026-08-08): "trending/popular first, then brand palettes,
// then community". Two of those three do not exist and neither is faked —
// trending has no usage signal in the product (`upgrade-activation-events`) and
// community publishing is not built (`community-backend`). What ships is the
// ordering and the sectioning over the two categories that hold real palettes,
// and this file asserts that the missing two are ABSENT rather than stubbed:
// an empty "Community" heading would be a promise the product cannot keep, and
// a "Trending" heading over an unranked list would be an invention dressed as a
// measurement.
//
// ── WHY THIS FILE SIGNS IN (2026-09-18) ─────────────────────────────────────
//
// The galleries gained the founder's three rungs — 3 palettes signed out, 10
// with a free account, all 101 with Pro. Sectioning is a BROWSE behaviour, and
// below the top rung there is not enough library left to browse: three curated
// palettes fill one section and the Brand systems group has nothing open in it
// at all, so every assertion here would be measuring the cap instead of the
// thing it was written for. The gate itself is covered by 44 and by the unit
// suite; this file signs in as Pro so the surface under test is the whole
// library, exactly as it was when these assertions were written.
import { test, expect } from './base.js'
import { go, restingScrollY, watch, signIn } from './helpers.js'

const ROUTE = '/discover/palettes'
const HEAD = '.pgl-section-head'
// Two trays since 2026-09-07: WHERE a palette came from and WHAT it feels like
// are separate questions now, so a mood no longer clears the collection. The
// assertions below are unchanged in substance — the Dark step just presses the
// chip where Dark now lives, and resets the collection first so it is testing
// Dark rather than Curated-and-Dark.
const TRAY = '[aria-label^="Filter palettes by collection"]'
const MOOD_TRAY = '[aria-label^="Filter palettes by mood"]'

const headings = (page) => page.locator(`${HEAD} h3`).allTextContents()

test.describe('palette library sections', () => {
  test.beforeEach(async ({ page }) => {
    watch(page, 'a Pro subscriber browsing for a palette')
    await signIn(page, { plan: 'pro' })
    await go(page, ROUTE)
    await expect(page.locator('.pgal-card').first()).toBeVisible()
  })

  test('browsing shows the categories in order', async ({ page }) => {
    expect(await headings(page)).toEqual(['Curated collection', 'Brand systems'])
  })

  test('nothing is promised that does not exist', async ({ page }) => {
    const all = (await headings(page)).join(' | ')
    expect(all, 'a Trending heading over an unranked list').not.toMatch(/trending|popular/i)
    expect(all, 'a Community heading with no community backend').not.toMatch(/community/i)
  })

  test('every palette on the page is inside a section, and the counts add up', async ({ page }) => {
    const counts = await page.locator('.pgl-section-count').allTextContents()
    const total = counts.reduce((sum, n) => sum + Number(n), 0)
    expect(counts.length).toBe(2)
    expect(total).toBe(await page.locator('.pgal-card').count())
  })

  // The reason to section a long list rather than filter it: the answer to
  // "what am I looking at" has to survive scrolling past a hundred cards.
  test('a section heading stays on screen while its own grid scrolls past', async ({ page }) => {
    const first = page.locator(HEAD).first()
    const nav = await page.locator('nav.pnav').boundingBox()
    const before = await first.boundingBox()

    // Far enough that an unpinned heading would be well off the top: it starts
    // below the hero, so a small scroll only spends the travel it has BEFORE it
    // reaches the pin. Measuring the delta over a short scroll therefore proves
    // nothing — the first version of this test asserted exactly that and failed
    // on a heading that was sticking correctly.
    // Both halves of this matter. Polling until scrollY passes 1500 says the
    // page has gone far enough; it does NOT say it has stopped going, and this
    // page is driven by Lenis. Measuring a pinned heading against a 12px window
    // while the scroller is still easing is the same mistake 17-founder-batch-3
    // made — see restingScrollY() in helpers.js.
    await page.evaluate(() => window.scrollTo(0, 2200))
    expect(await restingScrollY(page, 'the library scrolled past the first section'))
      .toBeGreaterThan(1500)

    const after = await first.boundingBox()
    expect(after, 'the first heading scrolled out of the viewport entirely').toBeTruthy()
    expect(after.y, 'the heading travelled with the page instead of pinning').toBeLessThan(before.y)
    // Pinned just under the nav, not merely somewhere on screen.
    expect(Math.abs(after.y - (nav.y + nav.height + 8))).toBeLessThan(12)
  })

  test('a heading never hides under the fixed nav', async ({ page }) => {
    await page.evaluate(() => window.scrollBy(0, 900))
    expect(await restingScrollY(page, 'the library scrolled under the nav')).toBeGreaterThan(400)
    const [nav, head] = await Promise.all([
      page.locator('nav.pnav').boundingBox(),
      page.locator(HEAD).first().boundingBox(),
    ])
    expect(head.y).toBeGreaterThanOrEqual(nav.y + nav.height - 1)
  })

  // A filter is already an answer to "which subset". Splitting that answer back
  // into headed groups — one of them usually empty — buries it.
  test('filtering collapses back to one flat grid', async ({ page }) => {
    await page.locator(TRAY).getByRole('button', { name: 'Brand', exact: true }).click()
    await expect(page.locator(HEAD)).toHaveCount(0)
    await expect(page.locator('.pgal-card').first()).toBeVisible()

    await page.locator(TRAY).getByRole('button', { name: 'All palettes', exact: true }).click()
    await expect(page.locator(HEAD)).toHaveCount(2)
  })

  test('searching collapses back to one flat grid too', async ({ page }) => {
    await page.getByRole('searchbox', { name: /Search palettes/i }).fill('blue')
    await expect(page.locator(HEAD)).toHaveCount(0)
  })

  // ── The results row above the sections ────────────────────────────────────
  //
  // Sectioning the grid changed what the row above it is describing, and the
  // row was not updated with it. These three exercise the CALL SITE in
  // PaletteGallery.jsx — the eyebrow the page passes to DiscoverResultHead —
  // rather than the component, which will render whatever string it is handed
  // and cannot tell a true label from a false one.
  test('the results row does not restate the heading directly beneath it', async ({ page }) => {
    const eyebrow = page.locator('.drh-head span')
    const firstHeading = page.locator(`${HEAD} h3`).first()

    // Positive controls. Without both of these the inequality below is
    // satisfied by two elements that never rendered.
    await expect(eyebrow).toHaveText(/\S/)
    await expect(firstHeading).toHaveText('Curated collection')

    const [above, below] = await Promise.all([eyebrow.innerText(), firstHeading.innerText()])
    expect(
      above.trim().toLowerCase(),
      'a taxonomy eyebrow sitting directly on top of a heading that repeats it — the motif the founder marked "AI"',
    ).not.toBe(below.trim().toLowerCase())
  })

  test('the results row describes the page, not one of its two groups', async ({ page }) => {
    // Browse mode shows curated AND brand, so naming either one here would
    // describe the first of two groups as if it were the whole library.
    await expect(page.locator(HEAD)).toHaveCount(2) // positive control: both groups really are on the page
    await expect(page.locator('.drh-head span')).not.toHaveText(/curated collection|brand systems/i)
  })

  test('the results row names a category only when the view IS that category', async ({ page }) => {
    const eyebrow = page.locator('.drh-head span')
    await expect(eyebrow).toHaveText('Everything you can browse')

    await page.locator(TRAY).getByRole('button', { name: 'Brand', exact: true }).click()
    await expect(page.locator('.pgal-card[data-kind="brand"]').first()).toBeVisible()
    await expect(page.locator('.pgal-card[data-kind="curated"]')).toHaveCount(0)
    await expect(eyebrow).toHaveText('Brand systems')

    await page.locator(TRAY).getByRole('button', { name: 'Curated', exact: true }).click()
    await expect(page.locator('.pgal-card[data-kind="curated"]').first()).toBeVisible()
    await expect(page.locator('.pgal-card[data-kind="brand"]')).toHaveCount(0)
    await expect(eyebrow).toHaveText('Curated collection')

    // A mood filter selects on the colours themselves, so it reaches into both
    // groups — measured: Dark matches 3 brand and 24 curated. Labelling that
    // "Curated collection", as the page did, was simply false, and the flat
    // grid meant there was no heading under it to disagree.
    await page.locator(TRAY).getByRole('button', { name: 'All palettes', exact: true }).click()
    // Mood is a menu (nine options), so the chip has to be opened to first.
    await page.locator('.pgl-toolbar .lbry-filtertrig:has(.lbry-filtertrig-k:text-is("Mood"))').click()
    await page.locator(MOOD_TRAY).getByRole('button', { name: 'Dark', exact: true }).click()
    await expect(page.locator('.pgal-card[data-kind="brand"]').first()).toBeVisible()
    await expect(page.locator('.pgal-card[data-kind="curated"]').first()).toBeVisible()
    await expect(eyebrow).not.toHaveText(/curated collection|brand systems/i)
  })

  // THE HERO DESCRIPTION THIS COMPARED AGAINST IS GONE (founder decision,
  // 2026-09-13). It was "Colour systems with a point of view - ours, plus the
  // published brand palettes behind the interfaces you already know...", the
  // same template the Gradient Library ran, and this test existed because the
  // first section blurb had opened on those same words 200px below it.
  //
  // The half of the test that still has something to compare is kept and it is
  // the half that was always the real claim: the two blurbs must tell the two
  // GROUPS apart. What is added is the guard the deletion makes possible - the
  // template sentence must not reappear in either place. So this can no longer
  // pass by the hero and the blurb agreeing, and it cannot pass by the blurbs
  // quietly inheriting the sentence the masthead lost.
  test('the section blurbs tell the two groups apart, and neither repeats the retired hero line', async ({ page }) => {
    const blurbs = await page.locator('.pgl-section-blurb').allInnerTexts()
    const heroCopy = (await page.locator('.dgh-copy').first().innerText()).trim()

    // Positive controls: there really are two blurbs, and the masthead really
    // did render (an empty read would satisfy every assertion below it).
    expect(blurbs).toHaveLength(2)
    expect(heroCopy.length, 'read no masthead copy at all').toBeGreaterThan(8)

    // The masthead is the h1 and nothing else now.
    expect(heroCopy, 'the template masthead sentence is back').not.toMatch(/point of view|make it yours/i)
    for (const blurb of blurbs) {
      expect(blurb, 'a section blurb has inherited the retired masthead sentence')
        .not.toMatch(/point of view|make it yours/i)
    }

    const opener = (s) => s.toLowerCase().replace(/[^a-z ]+/g, ' ').split(/\s+/).filter(Boolean).slice(0, 5).join(' ')
    expect(opener(blurbs[0]), 'the two blurbs say the same thing').not.toBe(opener(blurbs[1]))
  })

  test('each section grid names itself to assistive technology', async ({ page }) => {
    const labelled = await page.locator('.pgl-section .lbry-grid').evaluateAll(
      (grids) => grids.map((g) => {
        const id = g.getAttribute('aria-labelledby')
        return id ? document.getElementById(id)?.textContent?.trim() : null
      }),
    )
    // Two section grids, each named. The teased placeholders used to be a third
    // grid INSIDE the Brand systems section; since the tier cap they sit after
    // the sections, because the withheld tail now starts in whichever group the
    // cap fell in and a section with nothing open is not rendered at all. This
    // viewer is Pro, so there is no tail here — the test below covers the rung
    // that has one.
    expect(labelled).toEqual([
      'Curated collection',
      'Brand systems',
    ])
  })

  test('the teased grid names itself too, and stands outside the sections', async ({ page }) => {
    // A screen reader meeting three more cards after the open ones needs to
    // know why they differ; an unnamed second grid is exactly the unexplained
    // repetition this file exists to prevent.
    await signIn(page, { plan: 'free' })
    await go(page, ROUTE)
    await expect(page.locator('.pgal-card')).toHaveCount(10)
    const locked = page.locator('.lbry-grid[aria-labelledby="pgl-locked-more"]')
    await expect(locked).toHaveCount(1)
    await expect(page.locator('#pgl-locked-more')).toHaveText('Palettes included with Pro')
    expect(await page.locator('.pgl-section .lbry-grid[aria-labelledby="pgl-locked-more"]').count(),
      'the teased grid is nested inside a section again — it disappears when that section has nothing open').toBe(0)
  })
})

// Below 640px the section head drops to two auto columns, and the free width
// was shared between them: the palette count pill (22px wide at 1440) stretched
// to 110px at 390 — a long empty capsule beside a two-digit number.
test('the section count stays the width of its number on a phone', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await ctx.newPage()
  watch(page, 'someone browsing palettes on a phone')
  await go(page, '/discover/palettes')
  const count = page.locator('.pgl-section-count').first()
  await expect(count).toBeVisible()
  // POSITIVE CONTROL: this is the narrow layout, where the head has two columns.
  expect(await page.locator('.pgl-section-head').first().evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(2)
  const w = (await count.boundingBox()).width
  expect(w, `the count pill is ${w}px wide`).toBeLessThan(48)
  await ctx.close()
})
