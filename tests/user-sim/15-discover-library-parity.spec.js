// Discover Library parity — the Palette Library and Gradient Library are two
// views of one product, so they must present the SAME masthead and results row
// (rendered by the shared DiscoverGalleryHero / DiscoverResultHead components)
// and use the same "… Library" vocabulary. These tests exist so a future edit
// to one page cannot silently drift the other.
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'
import { LIBRARY_PALETTES, BRAND_LIBRARY_PALETTES, CURATED_LIBRARY_PALETTES } from '../../src/data/paletteLibrary.js'
import { BRAND_PALETTES } from '../../src/data/brandPalettes.js'

// A withheld palette is not rendered at all — not blurred, not greyed, absent —
// because its colours never reach the page (src/utils/lockedPreview.js).
//
// WHICH palettes those are now depends on the viewer's rung as well as on the
// flag: the tier cap (3 / 10 / everything) counts down the library in its own
// order and the brand systems sit after the 64 curated ones, so below Pro every
// brand is withheld whatever its flag says. The flag still decides what the
// Palette Builder will LOAD, which is why both sets are still named here.
const FREE_BRANDS = BRAND_PALETTES.filter((brand) => brand.free === true)
const PAID_BRANDS = BRAND_PALETTES.filter((brand) => brand.free !== true)
const TEASED = 3 // LOCKED_TEASE — placeholders shown before the wall

// `eyebrow` is the results-row label each library shows WHILE BROWSING, and the
// two are deliberately different now. Parity here is of STRUCTURE — same
// masthead, same results row, same live count — not of wording, and wording is
// the one thing that cannot be shared, because the two pages do not contain the
// same thing. The Gradient Library is curated end to end, so "Curated
// collection" names it exactly. The Palette Library browses in sections
// (Curated collection, then Brand systems), so the same label named the first
// of two groups as if it were the page, and printed a taxonomy eyebrow directly
// above an <h3> that repeated it verbatim — the motif this very file asserts
// gone from the hero six lines below. See src/pages/PaletteGallery.jsx.
const LIBRARIES = [
  { route: '/discover/palettes', title: 'Palette Library', noun: 'palette', eyebrow: 'Everything you can browse' },
  { route: '/discover/gradients', title: 'Gradient Library', noun: 'gradient', eyebrow: 'Curated collection' },
]

test.describe('Discover libraries share one header', () => {
  for (const library of LIBRARIES) {
    test(`${library.title} renders the shared Discover masthead`, async ({ page }) => {
      watch(page, `designer browsing the ${library.title}`)
      await go(page, library.route)

      const hero = page.locator('.dgh-hero')
      await expect(hero).toBeVisible()
      await expect(hero.getByRole('heading', { level: 1, name: library.title })).toBeVisible()
      // THE DESCRIPTION IS ASSERTED GONE, NOT PRESENT (founder decision,
      // 2026-09-13), and that is a reversal of what this line said. It used to
      // read "Title + description are what make the two pages read as one
      // surface" and assert the paragraph was not empty. The paragraph is
      // exactly what stopped being shared: BOTH libraries ran one template
      // sentence, "...with a point of view ... make it yours.", and the parity
      // it produced was the parity of a filled-in blank. The founder deleted
      // both. What makes the two pages one surface is the shared component and
      // its rendered surface, which the two tests below this one measure
      // directly; a slot that is empty on both is still parity, and this
      // asserts the template cannot come back rather than asserting the slot.
      await expect(hero.locator('p')).toHaveCount(0)
      // REGRESSION GUARD (#surface-headers-read-as-ai). The founder marked both
      // of these "AI" on the Font Gallery masthead: a taxonomy eyebrow above an
      // h1 that already says it, and a display numeral counting the catalogue.
      // They are asserted GONE rather than merely un-asserted, so a future hero
      // edit cannot quietly reinstate them.
      await expect(hero.locator('.dgh-eyebrow')).toHaveCount(0)
      await expect(hero.locator('.dgh-mark')).toHaveCount(0)

      // Shared results row, with the live count announced politely.
      const resultHead = page.locator('.drh-head')
      await expect(resultHead).toBeVisible()
      await expect(resultHead.locator('span')).toHaveText(library.eyebrow)
      await expect(resultHead.locator('p')).toHaveAttribute('aria-live', 'polite')
      await expect(resultHead.locator('p')).toContainText(new RegExp(`\\d+ ${library.noun}`))

      // Title case, no trailing full stop — the agreed library vocabulary.
      const h1 = await page.getByRole('heading', { level: 1 }).first().innerText()
      expect(h1.endsWith('.')).toBe(false)
    })
  }

  test('the two libraries agree on their masthead structure', async ({ page }) => {
    watch(page, 'reviewer comparing the two Discover libraries')
    const shapes = []
    for (const library of LIBRARIES) {
      await go(page, library.route)
      await expect(page.locator('.dgh-hero')).toBeVisible()
      shapes.push(await page.evaluate(() => {
        const hero = document.querySelector('.dgh-hero')
        const styles = getComputedStyle(hero)
        return {
          eyebrow: !!hero.querySelector('.dgh-eyebrow'),
          h1: !!hero.querySelector('h1'),
          description: !!hero.querySelector('p'),
          mark: !!hero.querySelector('.dgh-mark'),
          radius: styles.borderTopLeftRadius,
          background: styles.backgroundColor,
          resultHead: !!document.querySelector('.drh-head h2'),
        }
      }))
    }
    expect(shapes[0]).toEqual(shapes[1])
  })

  // ── Every library browse surface, not just the Discover two ──────────────
  // The Icon/Emoji surface was the case this file could not see. #292 moved its
  // TOOLBAR onto the shared Library components but left the hero on a bespoke
  // `.lib-head` — flush, light, 56px — so for months the two galleries agreed
  // with each other and the third page disagreed with both, and nothing failed.
  // This is the assertion that would have caught it.
  //
  // It compares the masthead's RENDERED SURFACE across pages — ground, radius,
  // padding, the type ramp of the headline and description — rather than
  // asserting a class name, which any hand-rolled copy could satisfy.
  const BROWSE_SURFACES = [
    { route: '/discover/palettes', title: 'Palette Library' },
    { route: '/discover/gradients', title: 'Gradient Library' },
    { route: '/create/icons', title: 'Icon Library' },
    { route: '/create/emoji', title: 'Emoji Library' },
  ]

  test('every library browse surface wears the one masthead', async ({ page }) => {
    watch(page, 'reviewer checking the libraries still read as one product')
    const shapes = []
    for (const surface of BROWSE_SURFACES) {
      await go(page, surface.route)
      const hero = page.locator('.dgh-hero')
      await expect(hero).toBeVisible()

      // The page's own identity, through the shared slots.
      await expect(hero.getByRole('heading', { level: 1, name: surface.title })).toBeVisible()
      // The description slot is OPTIONAL now. The two Discover libraries no
      // longer fill it (see the note on the per-library test above); the two
      // Create surfaces still do, from their own locale strings. So this
      // asserts what is actually required of the slot - if a surface fills it,
      // it must not be filled with the empty string - rather than requiring
      // every surface to have something to say.
      const description = hero.locator('p')
      if (await description.count()) await expect(description.first()).not.toBeEmpty()
      // Same regression guard as above, across all four browse surfaces.
      await expect(hero.locator('.dgh-eyebrow')).toHaveCount(0)
      await expect(hero.locator('.dgh-mark')).toHaveCount(0)

      // Title case, no trailing full stop — the agreed library vocabulary. This
      // is what "Icons for every interface." used to fail.
      expect(surface.title.endsWith('.')).toBe(false)
      const h1 = await hero.getByRole('heading', { level: 1 }).innerText()
      expect(h1.endsWith('.')).toBe(false)

      // THE DESCRIPTION RAMP MOVED OUT OF THIS OBJECT (2026-09-13) and is
      // compared separately below. It used to be read as
      // `getComputedStyle(el.querySelector('p'))` unconditionally, which throws
      // outright on a masthead with no description - and two of these four have
      // none since the founder deleted the shared template sentence. Folding a
      // null into the shape object instead would have been worse than throwing:
      // `{ pSize: null }` and `{ pSize: '19px' }` are unequal, so the parity
      // assertion would have started failing for a difference in CONTENT while
      // claiming the masthead's rendered surface had drifted.
      shapes.push(await page.evaluate(() => {
        const el = document.querySelector('.dgh-hero')
        const s = getComputedStyle(el)
        const h = getComputedStyle(el.querySelector('h1'))
        const p = el.querySelector('p')
        const ps = p ? getComputedStyle(p) : null
        return {
          shape: {
            background: s.backgroundColor,
            radius: s.borderTopLeftRadius,
            padding: s.paddingTop,
            colour: s.color,
            h1Family: h.fontFamily,
            h1Size: h.fontSize,
            h1Weight: h.fontWeight,
            h1LineHeight: h.lineHeight,
          },
          description: ps ? { pSize: ps.fontSize, pColour: ps.color } : null,
        }
      }))
    }
    // One masthead means one set of numbers, on all four.
    for (let i = 1; i < shapes.length; i += 1) {
      expect(shapes[i].shape, `${BROWSE_SURFACES[i].route} has drifted from ${BROWSE_SURFACES[0].route}`)
        .toEqual(shapes[0].shape)
    }
    // And wherever a description IS rendered, it is rendered the one way. This
    // is the same claim the ramp was making inside the object above, made
    // against the surfaces that actually have one.
    const described = shapes.filter((x) => x.description)
    expect(described.length, 'no browse surface rendered a description, so the ramp was never compared')
      .toBeGreaterThanOrEqual(2)
    for (const d of described) {
      expect(d.description, 'the description ramp has drifted between browse surfaces')
        .toEqual(described[0].description)
    }
  })

  // The right-hand column used to carry a decorative count on the galleries and
  // the library tablist on the Icon/Emoji surface. The count is gone at every
  // width now (#surface-headers-read-as-ai); the tablist may never go — it is
  // the only route to the other library, and a control that only exists above
  // 720px is a control half the users lack. That asymmetry was the whole point
  // of the old mark/aside split, and it is what this test still protects.
  test('the masthead carries no count on a phone but keeps its controls', async ({ page }) => {
    watch(page, 'designer opening the libraries on a phone')
    await page.setViewportSize({ width: 390, height: 844 })

    await go(page, '/discover/palettes')
    await expect(page.locator('.dgh-hero')).toBeVisible()
    await expect(page.locator('.dgh-mark')).toHaveCount(0)

    await go(page, '/create/icons')
    const aside = page.locator('.dgh-aside')
    await expect(aside).toBeVisible()
    // Both libraries reachable, and the active one legible without hovering.
    await expect(aside.getByRole('tab', { name: /Icons/ })).toBeVisible()
    const emojiTab = aside.getByRole('tab', { name: /Emoji/ })
    await expect(emojiTab).toBeVisible()
    await expect(aside.getByRole('tab', { name: /Icons/ })).toHaveAttribute('aria-selected', 'true')
    await expect(emojiTab).toHaveAttribute('aria-selected', 'false')

    // The persistent marker is a real painted difference, not a hover rule.
    const contrast = await page.evaluate(() => {
      const tabs = [...document.querySelectorAll('.lib-switch-btn')]
      return tabs.map((t) => getComputedStyle(t).backgroundColor)
    })
    expect(contrast[0]).not.toBe(contrast[1])

    await emojiTab.click()
    await expect(page.getByRole('heading', { level: 1, name: 'Emoji Library' })).toBeVisible()
  })

  // The masthead test above proves the two pages LOOK alike. These prove they
  // are the same implementation — which is the only version of that claim a
  // future edit cannot quietly break. Before the shared Library language the
  // two toolbars were separate CSS: one sticky and one not, one glass and one
  // flat, with three filter idioms between them.
  test('both libraries render the one shared toolbar, filter and empty implementation', async ({ page }) => {
    const shapes = []
    for (const library of LIBRARIES) {
      await go(page, library.route)
      await expect(page.locator('.lbry-toolbar')).toBeVisible()
      shapes.push(await page.evaluate(() => {
        const bar = getComputedStyle(document.querySelector('.lbry-toolbar'))
        const tray = getComputedStyle(document.querySelector('.lbry-filters'))
        return {
          // Sticky is the one that actually mattered: on ~100 cards the
          // Gradient Library's filters scrolled away exactly when you wanted them.
          position: bar.position,
          radius: bar.borderTopLeftRadius,
          padding: bar.paddingTop,
          trayRadius: tray.borderTopLeftRadius,
          trayBackground: tray.backgroundColor,
          searchHeight: getComputedStyle(document.querySelector('.lbry-search')).minHeight,
        }
      }))
    }
    expect(shapes[0].position).toBe('sticky')
    expect(shapes[0]).toEqual(shapes[1])
  })

  test('the filter indicator measures itself onto the active option', async ({ page }) => {
    watch(page, 'designer switching filters in the Gradient Library')
    await go(page, '/discover/gradients')

    const tray = page.locator('.lbry-filters').first()
    await expect(tray.locator('.lbry-filter-ind')).toHaveCount(1)

    // An index-derived offset passes a test that only checks "it moved". This
    // checks it lands on the real box, which is the part that breaks when the
    // options reflow or the label widths change.
    // Polled, not sampled once: the indicator TRANSITIONS onto its target, so a
    // single read lands mid-flight and measures the easing curve rather than
    // the resting position. Poll until it settles, and compare there.
    const settled = async () => page.evaluate(() => {
      const t = document.querySelector('.lbry-filters')
      const ind = t.querySelector('.lbry-filter-ind')
      const active = t.querySelector('[data-active="true"]')
      const style = getComputedStyle(ind)
      const m = new DOMMatrixReadOnly(style.transform)
      return [
        Math.round(m.m41) - active.offsetLeft,
        Math.round(parseFloat(style.width)) - active.offsetWidth,
        style.opacity,
      ].join('/')
    })

    // The TYPE tray. Mood became a menu at every width on 2026-09-16 (eight
    // options beside this tray wrapped the toolbar to two rows at 1024), so
    // the one expanded tray on this page is the type group, and a plain click
    // on it still replaces the selection — the indicator has one box to land
    // on.
    for (const label of ['Radial', 'Conic', 'All types']) {
      await tray.getByRole('button', { name: label, exact: true }).click()
      // "0/0/1" = zero offset error, zero width error, fully visible.
      await expect.poll(settled, { timeout: 2000 }).toBe('0/0/1')
    }
  })

  test('every library empty state offers the way back unconditionally', async ({ page }) => {
    // The Gradient Library used to render its reset only when it could prove a
    // filter was set, hiding it in the one case where undoing by hand is hardest.
    for (const library of LIBRARIES) {
      await go(page, library.route)
      await page.locator('.lbry-search input').fill('zzzzz-no-such-thing')
      const empty = page.locator('.lbry-empty')
      await expect(empty).toBeVisible()
      await expect(empty).toHaveAttribute('role', 'status')
      await expect(empty.getByRole('button', { name: 'Clear filters' })).toBeVisible()
    }
  })

  test('the Gradient Library keeps its no-results recovery path', async ({ page }) => {
    watch(page, 'designer filtering the Gradient Library down to nothing')
    await go(page, '/discover/gradients')
    await expect(page.locator('.grg-card').first()).toBeVisible()

    await page.getByLabel('Search gradients').fill('zzzzz-no-such-gradient')
    await expect(page.locator('.grg-card')).toHaveCount(0)
    const empty = page.locator('.grg-empty')
    await expect(empty).toBeVisible()
    await expect(empty).toContainText('No gradients match')

    await empty.getByRole('button', { name: 'Clear filters' }).click()
    await expect(page.locator('.grg-card').first()).toBeVisible()
    await expect(page.locator('.drh-head p')).toContainText(/\d+ gradients/)
  })
})

// ── Brand palettes in the Palette Library ────────────────────────────────────
// BRAND_PALETTES existed but only the Palette Builder could see them. They now
// browse alongside the curated set, and must stay TELLABLE APART from it.
test.describe('the Palette Library carries the brand systems', () => {
  // ── WHICH VIEWER SEES A BRAND SYSTEM, SINCE THE TIER CAP (2026-09-18) ──────
  //
  // The founder's rungs are 3 / 10 / everything, counted down the library in
  // its own order, and the brand systems sit after the 64 curated palettes. So
  // below the top rung no brand card renders AT ALL — not even a `free: true`
  // one. The flag still decides what the Palette Builder will LOAD (44 covers
  // that panel, which is unchanged); in the gallery the cap now decides first.
  //
  // These tests are therefore about what a subscriber's library holds, and the
  // last one is about what everyone else's withholds.
  test('every brand palette is present and badged for a subscriber', async ({ page }) => {
    // This test used to assert all 36 brand cards signed out. That assertion was
    // pinning the leak: a Pro brand card printed its five hex codes as visible
    // text and made each swatch a copy-to-clipboard button, so the paid product
    // was on a public page.
    watch(page, 'a subscriber looking for a brand palette in the library')
    await signIn(page, { plan: 'pro' })
    await go(page, '/discover/palettes')

    const cards = page.locator('.pgal-card')
    await expect(cards).toHaveCount(LIBRARY_PALETTES.length)
    await expect(page.locator('.pgal-card[data-kind="brand"]')).toHaveCount(BRAND_LIBRARY_PALETTES.length)
    await expect(page.locator('.pgal-card[data-kind="curated"]')).toHaveCount(CURATED_LIBRARY_PALETTES.length)

    // Every brand, free-flagged or paid, is a real card for this viewer — and
    // nothing is teased, because nothing is withheld.
    for (const brand of PAID_BRANDS) {
      await expect(page.locator('.pgal-card', { hasText: brand.name })).toHaveCount(1)
    }
    await expect(page.locator('.lockt-card')).toHaveCount(0)
    await expect(page.locator('.lockt-cta')).toHaveCount(0)

    // Distinguishable: every brand card carries a visible Brand badge, and no
    // curated card does.
    await expect(page.locator('.pgal-card[data-kind="brand"] .pgal-badge')).toHaveCount(BRAND_LIBRARY_PALETTES.length)
    await expect(page.locator('.pgal-card[data-kind="curated"] .pgal-badge')).toHaveCount(0)

    // The hero count and the section headings both tell the truth about the mix.
    //
    // This used to assert a `.pgl-note` sentence — "36 of these are published
    // brand systems" — printed above one flat grid. The library now BROWSES IN
    // SECTIONS, so the same fact is carried by the Brand systems heading and its
    // own count, next to the cards it is about rather than in a preamble. The
    // note still renders for a filtered or searched view, where there are no
    // sections; see tests/user-sim/34-palette-library-sections.spec.js.
    // The hero used to restate the LIBRARY's size next to this. That numeral is
    // gone (#surface-headers-read-as-ai), and the honesty argument did not
    // depend on it: the section counts below name the free and locked halves,
    // and the upgrade wall names the remainder in the next breath.
    await expect(page.locator('.dgh-mark')).toHaveCount(0)
    const sections = page.locator('.pgl-section-head')
    await expect(sections.filter({ hasText: 'Brand systems' }).locator('.pgl-section-count'))
      .toHaveText(String(BRAND_LIBRARY_PALETTES.length))
    await expect(sections.filter({ hasText: 'Curated collection' }).locator('.pgl-section-count'))
      .toHaveText(String(CURATED_LIBRARY_PALETTES.length))
  })

  test('the Brand filter isolates brand systems and Curated excludes them', async ({ page }) => {
    watch(page, 'a subscriber filtering the library down to brand systems')
    await signIn(page, { plan: 'pro' })
    await go(page, '/discover/palettes')

    await page.getByRole('button', { name: 'Brand', exact: true }).click()
    await expect(page.locator('.pgal-card')).toHaveCount(BRAND_LIBRARY_PALETTES.length)
    await expect(page.locator('.pgal-card[data-kind="curated"]')).toHaveCount(0)
    await expect(page.locator('.drh-head h2')).toHaveText('Identities you already know')
    await expect(page.locator('.drh-head p')).toHaveText(`${BRAND_LIBRARY_PALETTES.length} palettes`)

    await page.getByRole('button', { name: 'Curated', exact: true }).click()
    await expect(page.locator('.pgal-card')).toHaveCount(CURATED_LIBRARY_PALETTES.length)
    await expect(page.locator('.pgal-card[data-kind="brand"]')).toHaveCount(0)

    await page.getByRole('button', { name: 'All palettes' }).click()
    await expect(page.locator('.pgal-card')).toHaveCount(LIBRARY_PALETTES.length)
  })

  test('search reaches a brand by name, and no-results recovers', async ({ page }) => {
    watch(page, 'a subscriber searching the library for a specific brand')
    await signIn(page, { plan: 'pro' })
    await go(page, '/discover/palettes')

    const search = page.getByPlaceholder('Search by name, hex, colour or mood…')
    await search.fill('Netflix')
    await expect(page.locator('.pgal-card')).toHaveCount(1)
    await expect(page.locator('.pgal-name')).toHaveText('Netflix')
    await expect(page.locator('.pgal-badge')).toBeVisible()

    // A hex from a brand palette finds it too. DERIVE the hex rather than
    // repeating it here: this test's subject is "search matches on hex", and a
    // literal pinned a brand colour as a side effect. It broke when Spotify's
    // green was corrected from the retired #1DB954 to #1ED760 — a true fix
    // failing an unrelated test. brandPalettes.js is the one source now.
    const spotify = BRAND_PALETTES.find((brand) => brand.id === 'spotify')
    await search.fill(spotify.colors[0])
    await expect(page.locator('.pgal-name')).toHaveText(spotify.name)

    await search.fill('zzzzz-not-a-palette')
    await expect(page.locator('.pgal-card')).toHaveCount(0)
    const empty = page.locator('.pgl-empty')
    await expect(empty).toBeVisible()
    await empty.getByRole('button', { name: 'Clear filters' }).click()
    await expect(page.locator('.pgal-card')).toHaveCount(LIBRARY_PALETTES.length)
  })

  test('a withheld brand system is withheld, not routed around', async ({ page }) => {
    // The old contract: a Pro brand rendered a full card whose only concession
    // was that its "Open" link pointed at the builder instead of carrying ?c=.
    // The colours were still on the page, still copyable from each stripe, and
    // still printed as text. Routing around a gate is not a gate.
    //
    // Run at the FREE rung, which is where "withheld" now means something: the
    // cap stops at ten curated palettes, so every brand system — paid or
    // free-flagged — is behind it, and the Brand filter legitimately empties
    // the grid rather than showing a shortened brand list.
    watch(page, 'a free account meeting the brand systems in the library')
    await signIn(page, { plan: 'free' })
    await go(page, '/discover/palettes')

    // An open palette still hands off straight to the builder with its colours,
    // so "no deep link" below is a statement about the withheld rows and not
    // about a page that has stopped linking anywhere.
    const open = page.locator('.pgal-card').first()
    await expect(open.getByRole('link', { name: /^Open / })).toHaveAttribute('href', /^\/create\/palette\?c=/)

    await page.getByRole('button', { name: 'Brand', exact: true }).click()
    await expect(page.locator('.pgal-card')).toHaveCount(0)
    await expect(page.locator('.pgal-use--pro')).toHaveCount(0)

    // No withheld brand has a card, a badge, a link or a hex anywhere — not the
    // paid ones, and not the free-flagged ones the cap has not reached.
    for (const brand of [PAID_BRANDS[0], FREE_BRANDS[0]]) {
      await expect(page.locator('.pgal-card', { hasText: brand.name })).toHaveCount(0)
      for (const hex of brand.colors) {
        await expect(page.locator(`a[href*="${hex.replace('#', '')}"]`)).toHaveCount(0)
      }
    }

    // And the search box is not a way round it: neither a withheld brand's name
    // nor its hex may return anything. The haystack indexes every palette's hex
    // values, so filtering the FULL library would let a visitor CONFIRM a
    // locked brand's colours by typing them — a disclosure dressed as a search.
    const search = page.getByPlaceholder('Search by name, hex, colour or mood…')
    const paid = PAID_BRANDS[0]
    await search.fill(paid.name)
    await expect(page.locator('.pgal-card')).toHaveCount(0)
    await search.fill(paid.colors[0])
    await expect(page.locator('.pgal-card')).toHaveCount(0)
    await expect(page.locator('.pgal-name', { hasText: paid.name })).toHaveCount(0)
    await search.fill('')

    // What replaces them: placeholders and one wall into the canonical gate,
    // naming the true remainder.
    await page.getByRole('button', { name: 'All palettes' }).click()
    await expect(page.locator('.lockt-card')).toHaveCount(TEASED)
    // The remainder as a NUMBER: a substring check for "91" is satisfied by
    // "191" and by any other figure that happens to contain it.
    const remaining = LIBRARY_PALETTES.length - 10
    expect((await page.locator('.lockt-cta-head').innerText()).match(/\d+/g).map(Number))
      .toContain(remaining)
  })
})

// Founder request, 2026-09-03: "i sohuld also be able to access icon library
// from the discober tab". The library itself did not move — it is still
// /create/icons, and #292/#306 had already dressed it in the shared Discover
// browse language — so what is pinned here is the REACH: a visitor who is on
// Discover, on a phone or a desktop, can get to it without going via Create.
test.describe('the Icon Library is reachable from Discover', () => {
  test('the Discover landing offers the Icon Library as a live card', async ({ page }) => {
    watch(page, 'designer on Discover looking for icons')
    await go(page, '/discover')

    const card = page.locator('.surface-card', { hasText: 'Icon Library' }).first()
    await expect(card).toBeVisible()
    // Live, not staged: a "Soon" badge here would be the same dead end the
    // founder was reporting.
    await expect(card.locator('.soon-badge')).toHaveCount(0)
    await expect(card).toHaveAttribute('href', '/create/icons')

    await card.click()
    await expect(page).toHaveURL(/\/create\/icons$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Icon Library' })).toBeVisible()
  })

  test('the Discover menu lists it on a desktop and on a phone', async ({ page }) => {
    watch(page, 'designer opening the Discover tab from the nav')
    await go(page, '/home')

    // Desktop: the Discover pill opens the mega-menu. Clicking, not hovering —
    // the founder's 2026-09-02 direction is no hover-dependent affordances.
    await page.getByRole('button', { name: 'Discover', exact: true }).first().click()
    const desktopRow = page.locator('a[href="/create/icons"]', { hasText: 'Icon Library' }).first()
    await expect(desktopRow).toBeVisible()

    // Phone: the same entry, inside the full-screen sheet.
    await page.setViewportSize({ width: 390, height: 844 })
    await go(page, '/home')
    await page.getByRole('button', { name: 'Menu' }).first().click()
    const sheet = page.locator('.pnav-sheet')
    await expect(sheet).toBeVisible()
    await sheet.getByRole('button', { name: /Discover/ }).first().click()
    const sheetRow = sheet.locator('a[href="/create/icons"]').first()
    await expect(sheetRow).toBeVisible()
    // A tap target, not a hover target.
    const box = await sheetRow.boundingBox()
    expect(box.height).toBeGreaterThanOrEqual(44)
  })
})
