// Two founder requests, 2026-09-07, asserted on the RENDERED page.
//
//   1. "for our pallete library lets include filters of neutral, and others"
//      — Neutral, Warm, Cool, Pastel, Vivid, Dark, Light, Monochrome.
//   2. "at the very bottom of all gallery pages, include a CTA, 'cant find
//      what you are looking for' Create and Submit your own or something."
//
// ── WHY THIS FILE EXISTS WHEN tests/unit/palette-mood.test.js ALREADY PASSES ─
//
// Because a green classifier is not a working filter. The unit suite proves
// `classifyPalette` answers correctly; it cannot see whether the tray is wired
// to it, whether the chip the user presses is the chip the state reads, or
// whether the grid re-renders at all. That gap is not hypothetical here — this
// repo has run 1363/1363 unit tests green over three failing browser tests
// after one call site was reverted.
//
// So every mood below is asserted by CLICKING THE REAL CHIP and COUNTING THE
// REAL CARDS, and the expected number comes from importing the same classifier
// the page imports and running it over the same library — never from a literal.
// A typed count is a second copy of the data; #396's whole failure was a number
// that had quietly stopped describing the view.
import { test, expect } from './base.js'
import { go, restingScrollY, watch, signIn } from './helpers.js'
import { LIBRARY_PALETTES } from '../../src/data/paletteLibrary.js'
import { classifyPalette, MOOD_IDS, MOOD_LABELS } from '../../src/utils/paletteMood.js'
import { splitLockedLibrary } from '../../src/utils/lockedPreview.js'

const PALETTES = '/discover/palettes'
const COLLECTION_TRAY = '[aria-label^="Filter palettes by collection"]'
// The mood group is a MENU at every width (nine options), so its chips only
// exist while the trigger is open. `openMoods` is how every mood press below
// reaches them, and it is deliberately the same route a user takes rather than
// a shortcut into component state.
// Named by its own key span, not by position: in the 641–980 band the
// collection group collapses too, and a bare `.lbry-filtertrig` would then be
// two elements and fail strict mode at a width that has nothing to do with what
// is under test.
const MOOD_TRIGGER = '.pgl-toolbar .lbry-filtertrig:has(.lbry-filtertrig-k:text-is("Mood"))'
const MOOD_TRAY = '[aria-label^="Filter palettes by mood"]'
const CARD = '.pgal-card'

async function pickMood(page, label) {
  const trigger = page.locator(MOOD_TRIGGER)
  await expect(trigger, 'no Mood control on the toolbar').toBeVisible()
  if (await trigger.getAttribute('aria-expanded') !== 'true') await trigger.click()
  const chip = page.locator(MOOD_TRAY).getByRole('button', { name: label, exact: true })
  await expect(chip, `no chip for ${label} inside the Mood menu`).toBeVisible()
  await chip.click()
  return chip
}

// What a PRO viewer's page is built from — the page's own gate, not a
// re-implementation of it. Every expected number below is derived from this.
//
// SIGNED IN AS PRO SINCE 2026-09-18, and the reason is the point of the file:
// these are FILTER assertions ("Warm narrows the grid to eleven"), and below
// the top rung the tier cap leaves three or ten palettes on the page, so most
// moods would select nothing and every number here would be measuring the cap
// instead of the classifier. The cap has its own coverage in 44 and in the unit
// suite. `unlocked: true` is how the page itself answers for a subscriber.
const BROWSABLE = splitLockedLibrary(LIBRARY_PALETTES, {
  unlocked: true,
  isOpen: (p) => p.pro !== true,
  preview: (p) => ({ id: p.id, label: p.name, slots: p.colors.length }),
}).open.map((p) => ({ ...p, mood: classifyPalette(p.colors) }))

const expectedFor = (mood, kind = null) => BROWSABLE.filter(
  (p) => (mood === 'any' || p.mood[mood]) && (kind === null || p.kind === kind),
).length

// ── Request 1: the eight moods ──────────────────────────────────────────────

test.describe('palette mood filters', () => {
  test.beforeEach(async ({ page }) => {
    watch(page, 'a Pro subscriber looking for a palette with a particular feel')
    await signIn(page, { plan: 'pro' })
    await go(page, PALETTES)
    await expect(page.locator(CARD).first()).toBeVisible()
  })

  // POSITIVE CONTROL. Everything below is "the filter narrowed the grid to N",
  // which is satisfiable by a page that renders nothing at all if N is allowed
  // to be zero. This says the unfiltered page really does show the whole
  // library this viewer is entitled to, so a narrowing is a narrowing — and it
  // is also where a tier cap leaking into a Pro session would be caught.
  test('the unfiltered gallery shows the whole library this viewer has', async ({ page }) => {
    await expect(page.locator(CARD)).toHaveCount(expectedFor('any'))
    expect(expectedFor('any'), 'the library has collapsed').toBeGreaterThan(50)
  })

  test('every mood chip is present, and every one of them selects palettes', async ({ page }) => {
    const total = expectedFor('any')

    for (const mood of MOOD_IDS) {
      await pickMood(page, MOOD_LABELS[mood])

      const expected = expectedFor(mood)
      // A control that matches nothing is broken — the founder's own bar.
      expect(expected, `${mood} matches nothing in the free library`).toBeGreaterThan(0)
      // And a control that matches EVERYTHING is not a filter.
      expect(expected, `${mood} matches the entire free library`).toBeLessThan(total)

      // The wiring: the count on the rendered page, against the classifier.
      await expect(page.locator(CARD), `${MOOD_LABELS[mood]} rendered the wrong number of cards`)
        .toHaveCount(expected)
      // The collapsed trigger STATES the selection rather than hiding it — the
      // whole risk of putting a filter behind a control is that its state stops
      // being visible, and that is what this line is guarding.
      await expect(page.locator(MOOD_TRIGGER)).toContainText(MOOD_LABELS[mood])
    }
  })

  // The reason the tray was split in two. On the old single tray, choosing a
  // mood silently cleared the collection you had chosen, so "warm brand
  // palettes" was a question the control could not express and a choice the
  // user had already made was dropped without being told.
  test('a collection and a mood combine instead of replacing each other', async ({ page }) => {
    await page.locator(COLLECTION_TRAY).getByRole('button', { name: 'Brand', exact: true }).click()
    await expect(page.locator(CARD)).toHaveCount(expectedFor('any', 'brand'))

    await pickMood(page, 'Vivid')

    // The collection is STILL on — this is the assertion the old tray failed.
    await expect(page.locator(COLLECTION_TRAY).getByRole('button', { name: 'Brand', exact: true }))
      .toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator(CARD)).toHaveCount(expectedFor('vivid', 'brand'))
    await expect(page.locator(`${CARD}[data-kind="curated"]`)).toHaveCount(0)

    // Positive control on the intersection itself: Brand+Vivid must be a real
    // narrowing of Brand, or this test would pass on a filter that does nothing.
    expect(expectedFor('vivid', 'brand')).toBeLessThan(expectedFor('any', 'brand'))
    expect(expectedFor('vivid', 'brand')).toBeGreaterThan(0)
  })

  // Both halves of the disjointness promise, on the rendered page rather than
  // in the abstract: no card can appear under both of a disjoint pair.
  test('no palette appears under both Pastel and Vivid, or both Dark and Light', async ({ page }) => {
    const namesUnder = async (label) => {
      await pickMood(page, label)
      await expect(page.locator(CARD)).toHaveCount(expectedFor(label.toLowerCase()))
      return page.locator(`${CARD} .pgal-name, ${CARD} h3`).allInnerTexts()
    }
    for (const [a, b] of [['Pastel', 'Vivid'], ['Dark', 'Light']]) {
      const first = new Set(await namesUnder(a))
      const second = await namesUnder(b)
      expect(first.size, `${a} rendered no named cards — nothing to compare`).toBeGreaterThan(0)
      expect(second.length, `${b} rendered no named cards`).toBeGreaterThan(0)
      expect(second.filter((n) => first.has(n)), `${a} and ${b} share cards`).toEqual([])
    }
  })

  test('the results head never names a collection the view is not', async ({ page }) => {
    const eyebrow = page.locator('.drh-head span')
    // A mood on its own reaches into BOTH collections, so it must not be
    // labelled as either — this is #396's finding, re-asserted through the new
    // tray where a mood can no longer touch the collection state at all.
    await pickMood(page, 'Warm')
    await expect(eyebrow).not.toHaveText(/curated collection|brand systems/i)

    // But a collection PLUS a mood is still that collection, and saying so is
    // true rather than false.
    await page.locator(COLLECTION_TRAY).getByRole('button', { name: 'Brand', exact: true }).click()
    await expect(eyebrow).toHaveText('Brand systems')
  })
})

// ── Request 1, the narrow end: the tray still fits a phone ───────────────────
//
// MEASURED, NOT RESIZED. A fresh context per width: a resize from 1440 produced
// a false P1 in this suite this week, because the app lays out once and then
// reflows, and what reflow settles on is not always what a cold load produces.

test('at 390px the tray fits and every chip is still a touch target', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await context.newPage()
  try {
    watch(page, 'someone filtering palettes on a phone')
    await go(page, PALETTES)
    await expect(page.locator(CARD).first()).toBeVisible()

    // The Mood menu OPEN, because a menu that overflows the viewport is the same
    // defect as a tray that does, and it is the state the eight new options are
    // actually read in.
    await page.locator(MOOD_TRIGGER).click()
    await expect(page.locator(MOOD_TRAY)).toBeVisible()

    const box = await page.evaluate(() => ({
      // A horizontal scrollbar on the BODY is the failure. The tray wrapping
      // onto more lines is the design below 641px (#298) and is not.
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      chips: [...document.querySelectorAll('.lbry-toolbar .lbry-filter, .lbry-toolbar .lbry-filtertrig, .lbry-filtermenu .lbry-filter')].map((el) => {
        const r = el.getBoundingClientRect()
        return { label: el.textContent.trim(), w: Math.round(r.width), h: Math.round(r.height), right: Math.round(r.right) }
      }),
    }))

    // Positive control: there really are chips to measure. #412/#413 fixed
    // target sizes across the app and an empty list would pass silently.
    expect(box.chips.length, 'no filter chips found at 390px').toBeGreaterThanOrEqual(4)
    expect(box.overflow, 'the page scrolls sideways at 390px').toBeLessThanOrEqual(1)

    const small = box.chips.filter((c) => c.w < 24 || c.h < 24)
    expect(small, 'chips below the 24x24 floor #412/#413 set').toEqual([])
    // 391 rather than 390: a sub-pixel box that lands on 390.4 is not a control
    // running off the screen.
    const clipped = box.chips.filter((c) => c.right > 391)
    expect(clipped, 'chips running off the right edge').toEqual([])
  } finally {
    await context.close()
  }
})

// ── Request 2: the closing CTA ──────────────────────────────────────────────
//
// Every gallery, in the founder's words, below the last card, one action.
//
// /create/font-gallery is DELIBERATELY ABSENT and this is the place to say so.
// It browses the live Google Fonts catalogue (useFontCatalog → the Google Fonts
// API), so "can't find it" means the family does not exist on Google Fonts and
// there is nothing UI L4B can add. There is no font submission surface either:
// SUBMIT_SURFACES in utils/submitIntent.js is exactly community / gradient /
// palette / prompt. A "create and submit your own" on that page would be a
// promise the product cannot keep, which is the one thing this repo does not
// ship. It already closes with its own "Continue your typography system" nav,
// which answers the same question with something real.
const GALLERIES = [
  { route: PALETTES, card: '.pgal-card', action: 'Create and submit your own', href: '/create/palette' },
  { route: '/discover/gradients', card: '.grg-card', action: 'Create and submit your own', href: '/create/gradient' },
  { route: '/discover/prompts', card: '.pl-card', action: 'Create and submit your own', href: null },
  { route: '/discover/resources', card: '.cur-row, .cur-lead', action: 'Suggest a resource', href: '/feedback' },
  { route: '/community', card: '.ch-card', action: 'Create and submit your own', href: null },
]

test.describe('the closing CTA on every gallery', () => {
  for (const gallery of GALLERIES) {
    test(`${gallery.route} closes with the founder's question and one action`, async ({ page }) => {
      watch(page, `someone who reached the bottom of ${gallery.route}`)
      // Pro, so the three gated galleries render a full grid: the geometry
      // assertion below is "the CTA sits under the LAST CARD", and its own
      // positive control demands more than three cards — which is exactly the
      // number a signed-out visitor now sees on those three surfaces. The
      // ungated ones (resources, community) are unaffected either way.
      await signIn(page, { plan: 'pro' })
      await go(page, gallery.route)

      // POSITIVE CONTROL, and it is the whole reason this test is not trivial.
      // "The CTA sits below the last card" is true of a page that rendered no
      // cards at all, so the cards are counted first and the count is the thing
      // the geometry assertion is measured against.
      const cards = page.locator(gallery.card)
      await expect(cards.first()).toBeVisible()
      const cardCount = await cards.count()
      expect(cardCount, `${gallery.route} rendered no cards, so "below the last card" means nothing`).toBeGreaterThan(3)

      const cta = page.locator('.gcta')
      await expect(cta).toHaveCount(1)
      // The founder's words, with a typographic apostrophe. Asserted as text
      // rather than as a class so a silent re-wording fails here.
      await expect(cta.locator('.gcta-q')).toHaveText(/^Can[’']t find what you[’']re looking for\?$/)

      // ONE action. Not a card, not a row of them.
      const actions = cta.locator('a, button')
      await expect(actions).toHaveCount(1)
      await expect(actions).toHaveText(gallery.action)

      if (gallery.href) {
        await expect(actions).toHaveAttribute('href', gallery.href)
      } else {
        // An on-page submit entry. It must be a real, enabled control by the
        // time auth has resolved — a permanently disabled pill is a dead CTA.
        await expect(actions).toBeEnabled()
      }

      // BELOW the last card, at this width. Measured off the geometry, because
      // "later in the DOM" is not the founder's request.
      const geom = await page.evaluate((sel) => {
        const cardsFound = [...document.querySelectorAll(sel)]
        const lowest = Math.max(...cardsFound.map((c) => c.getBoundingClientRect().bottom + window.scrollY))
        const block = document.querySelector('.gcta').getBoundingClientRect()
        return { lowestCard: lowest, ctaTop: block.top + window.scrollY, ctaHeight: block.height }
      }, gallery.card)
      expect(geom.ctaHeight, 'the CTA rendered with no height').toBeGreaterThan(60)
      expect(
        geom.ctaTop,
        `the CTA starts ${Math.round(geom.lowestCard - geom.ctaTop)}px ABOVE the last card`,
      ).toBeGreaterThan(geom.lowestCard)
    })
  }
})

// ── Request 2, the hazard: the feedback FAB is fixed to the corner ───────────
//
// #413 found a FAB covering a footer control on a page with 0px of scroll room.
// The FAB is `position:fixed` at the bottom-right, so it can land on top of the
// CTA at any width where the two boxes intersect once the page is scrolled to
// the end. Twenty widths, a fresh context each — no resizing.

const WIDTHS = [320, 360, 390, 414, 480, 540, 600, 640, 680, 768, 834, 900, 980, 1024, 1180, 1280, 1366, 1440, 1600, 1920]

test('the closing CTA clears the feedback button at twenty widths', async ({ browser }) => {
  const damage = []
  for (const width of WIDTHS) {
    const context = await browser.newContext({ viewport: { width, height: 800 } })
    const page = await context.newPage()
    try {
      watch(page, `CTA clearance at ${width}px`)
      await go(page, PALETTES)
      await expect(page.locator('.pgal-card').first()).toBeVisible()

      // The WORST alignment, not merely the end of the page. The feedback
      // button is fixed to the bottom-right corner of the VIEWPORT, so the
      // dangerous scroll position is the one that puts the CTA as low in the
      // viewport as it can go — which is not the same as the bottom of the
      // document, because a tall footer can carry the CTA back off the top.
      // Scrolling to the document end and measuring there is how this check
      // would pass on a page where the CTA is not even on screen.
      await page.evaluate(() => {
        document.querySelector('.gcta')?.scrollIntoView({ block: 'end' })
      })
      await restingScrollY(page, `${width}px, CTA scrolled as low as it goes`)

      const hit = await page.evaluate(() => {
        const fab = document.querySelector('.global-feedback-btn')
        const action = document.querySelector('.gcta .btn')
        const heading = document.querySelector('.gcta-q')
        if (!fab || !action || !heading) return { missing: { fab: !fab, action: !action, heading: !heading } }
        const f = fab.getBoundingClientRect()
        const overlaps = (r) => !(r.right <= f.left || r.left >= f.right || r.bottom <= f.top || r.top >= f.bottom)
        // What is actually AT that point, which is the only thing that settles
        // whether the FAB is covering the CTA or merely sharing a bounding box
        // with a transparent part of it.
        const a = action.getBoundingClientRect()
        // elementFromPoint takes VIEWPORT coordinates and returns null outside
        // them, so the probe is only meaningful while the pill's centre is on
        // screen. Clamping the point into the viewport instead — which is what
        // the first version of this did — asks what is painted somewhere else
        // entirely and reports the footer as an obstruction.
        const cx = a.left + a.width / 2
        const cy = a.top + a.height / 2
        const onScreen = cx >= 0 && cx < window.innerWidth && cy >= 0 && cy < window.innerHeight
        const topmost = onScreen ? document.elementFromPoint(cx, cy) : null
        return {
          missing: null,
          onScreen,
          onAction: overlaps(a),
          onHeading: overlaps(heading.getBoundingClientRect()),
          actionCovered: onScreen && !!topmost && topmost !== action && !action.contains(topmost),
          actionVisible: a.height > 0 && a.width > 0,
        }
      })

      if (hit.missing) { damage.push(`${width}px: nothing to measure — ${JSON.stringify(hit.missing)}`); continue }
      if (!hit.actionVisible) damage.push(`${width}px: the CTA action has no box`)
      // Positive control on the probe itself: if the pill never reached the
      // viewport there was nothing to obstruct, and a silent pass here would be
      // the same fault as measuring a page with no cards on it.
      if (!hit.onScreen) damage.push(`${width}px: the CTA action never came on screen, so nothing was measured`)
      if (hit.onAction) damage.push(`${width}px: the feedback button overlaps the CTA action`)
      if (hit.onHeading) damage.push(`${width}px: the feedback button overlaps the CTA heading`)
      if (hit.actionCovered) damage.push(`${width}px: something is painted over the middle of the CTA action`)
    } finally {
      await context.close()
    }
  }
  expect(damage, 'the closing CTA is obstructed').toEqual([])
})
