// A collection the tier cap has emptied says it is gated, once, and does not
// claim "no match".
//
// THE FAULT THIS GUARDS. The Palette Library hands a free viewer ten curated
// palettes and a signed-out visitor GALLERY_TIER_LIMITS.anonymous; every brand
// system sits past both caps. Tapping the Brand chip therefore left nothing to
// list, and the page answered "No palettes match that combination." That is
// false: the palettes exist and the viewer is not allowed them. The page now
// counts over the whole library (countGallery and gateFor in
// src/utils/galleryCounts.js) and shows LibraryGate
// (src/components/library/LibraryGate.jsx) instead of an empty state, with the
// way forward for the viewer's tier:
//
//   signed in, free   "Brand systems are part of Pro", "Upgrade to Pro" -> /plans
//   signed out        the same heading, "See what Pro includes" -> /plans, plus a
//                     "Log in" button. A free account does not open Brand, so no
//                     "Create a free account" button is offered (Brand alone)
//   Pro               brand tiles, no gate
//
// Ways this regresses quietly, and what pins each:
//   - the "no match" state comes back                 -> the text check and the
//     absence of the empty-state status node
//   - the bottom close CTA stands up beside the gate  -> the `.pgl-cta` count,
//     taken with Brand alone AND with Brand + Warm
//   - the signed-out gate promises an account opens Brand -> the exact copy and
//     the absence of a sign-up button (Brand alone)
//   - the tap is announced twice (the count line and the gate)
//     -> the live-region count over the whole page: the result head's count line
//     is the one announcer and the gate holds none
//   - a locked tile in the fade becomes a way in      -> the fade's focusable count
//
// MUTATIONS this file goes red on:
//   - count only `browsable` for the empty-state test in PaletteGallery.jsx (so
//     "No palettes match that combination." shows under Brand): the "no match"
//     and gate assertions go red;
//   - hand a locked tile in LibraryGate.jsx a button, or pass `live` to the
//     gate in GalleryEndGate.jsx: the fade and announcement assertions go red;
//   - drop `data-kind` from the tile in PaletteGalleryGrid.jsx: the Pro brand
//     count goes red.
//
// Everything is read off the rendered page by pressing the real chips, as a
// viewer does. The only numbers derived rather than typed are the withheld
// counts and the library size, from the same library file and tier table the
// page splits.
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'
import { LIBRARY_PALETTES } from '../../api/_lib/library/paletteLibrary.js'
import { GALLERY_TIER_LIMITS } from '../../src/utils/lockedPreview.js'
import { paletteStubsCarryMoods } from './gallery-filter-helpers.js'

const ROUTE = '/discover/palettes'
const COLLECTION_TRAY = '[aria-label^="Filter palettes by collection"]'
const MOOD_TRAY = '[aria-label^="Filter palettes by mood"]'
// Named by their own key span: below the desktop band the collection group
// collapses into a trigger as well, so a bare `.lbry-filtertrig` is ambiguous.
const COLLECTION_TRIGGER = '.pgl-toolbar .lbry-filtertrig:has(.lbry-filtertrig-k:text-is("Collection"))'
const MOOD_TRIGGER = '.pgl-toolbar .lbry-filtertrig:has(.lbry-filtertrig-k:text-is("Mood"))'

// What a viewer who cannot open the matches is told, from the library itself.
const BRAND_TOTAL = LIBRARY_PALETTES.filter((p) => p.kind === 'brand').length
const CURATED_TOTAL = LIBRARY_PALETTES.filter((p) => p.kind === 'curated').length
const HEADING = 'Brand systems are part of Pro'
const BODY = `Pro opens all ${BRAND_TOTAL} brand systems.`

// What a Pro viewer lists under Brand: every brand system in the library.
const PRO_BRAND_ROWS = BRAND_TOTAL

// Open tiles: not a locked stand-in and not inside the faded rows behind the gate.
const openTiles = (page) => page.locator('.vpt:not(.vpt--locked):not([data-gate-fade] *)')

// Press a chip whether its group is a visible row of buttons, a menu behind a
// trigger, or (on a phone) inside the Filters sheet - the way a viewer reaches it.
async function pick(page, trigger, tray, label) {
  const chip = page.locator(tray).getByRole('button', { name: label, exact: true })
  const sheetOpener = page.locator('.pgl-toolbar .lbry-filtersbtn')
  const opener = page.locator(trigger)
  if (!(await chip.first().isVisible()) && !(await opener.isVisible())) {
    await expect(sheetOpener, `no way to reach ${label}`).toBeVisible()
    await sheetOpener.click()
  }
  if (!(await chip.first().isVisible())) {
    await expect(opener, `no ${label} control on the toolbar`).toBeVisible()
    await opener.click()
  }
  await expect(chip.first(), `no chip for ${label}`).toBeVisible()
  await chip.first().click()
  // A phone's sheet stays over the results until it is dismissed.
  const done = page.locator('.lbry-sheet-done')
  if (await done.isVisible()) await done.click()
}

async function openBrand(page, { mood } = {}) {
  await pick(page, COLLECTION_TRIGGER, COLLECTION_TRAY, 'Brand')
  if (mood) await pick(page, MOOD_TRIGGER, MOOD_TRAY, mood)
}

const page$ = (page) => page.locator('.pgl-page')
const gate = (page) => page.locator('[data-gate]')
// Every control the gate offers. One primary pill and at most one text link.
const gateControls = (page) => gate(page).locator('.geg-cta a, .geg-cta button')
const countLine = (page) => page.locator('.drh-head p')
// Every live region on the page: the result head's count line is the one that
// announces a chip tap, and the gate must not announce it a second time.
const liveRegions = (page) => page$(page).locator('[role="status"], [aria-live]:not([aria-live="off"])')

// The count line is the one announcer before the tap and after it, and the gate
// holds no live region of its own.
async function expectSingleAnnouncement(page) {
  await expect(liveRegions(page), 'the count line is the one live region before the tap').toHaveCount(1)
  await expect(countLine(page)).toHaveAttribute('aria-live', 'polite')
  await openBrand(page)
  await expect(gate(page)).toBeVisible()
  await expect(countLine(page), 'the one announcer now reads the gated count').toHaveText(
    new RegExp(`^${BRAND_TOTAL} brand systems · 0 shown$`),
  )
  await expect(liveRegions(page), 'still one live region after the tap').toHaveCount(1)
  await expect(gate(page).locator('[role="status"], [aria-live]'), 'the gate does not announce it again').toHaveCount(0)
}

async function expectNoMatchStateGone(page) {
  await expect(page$(page)).not.toContainText('No palettes match')
  await expect(page.locator('.lbry-empty'), 'no empty state').toHaveCount(0)
  await expect(openTiles(page), 'a brand tile is open to this viewer').toHaveCount(0)
  await expect(page.locator('.pgl-cta'), 'the bottom close CTA repeats the offer').toHaveCount(0)
  // The faded rows behind the gate: locked tiles that offer nothing to focus or follow.
  const fade = page.locator('[data-gate-fade]')
  await expect(fade).toHaveCount(1)
  expect(await fade.locator('.vpt').count(), 'the fade holds locked tiles').toBeGreaterThan(0)
  expect(await fade.locator('button, a').count(), 'a locked tile offers nothing to focus or follow').toBe(0)
}

// Brand + Warm: until the Pro stubs carry `moods` a locked row cannot be matched
// against a mood, so the gate speaks for the whole library (variant "unknown");
// once they do, it names the filtered count. Either way: one gate, one primary.
async function expectBrandMoodGate(page, who) {
  const block = gate(page)
  await expect(block).toBeVisible()
  await expect(block.getByRole('heading')).toBeVisible()
  if (paletteStubsCarryMoods) {
    await expect(block.getByRole('heading')).toHaveText(/^Warm brand systems? (is|are) part of Pro$/)
  } else {
    // A free account opens no brand system, so signed out or free the only way
    // on is Pro: never "Create a free account" under Brand.
    await expect(block.getByRole('heading')).toHaveText('Pro opens every palette')
    await expect(block.locator('.geg-p')).toHaveText(`Pro opens all ${LIBRARY_PALETTES.length} palettes, including every brand system.`)
    await expect(block.getByRole('button', { name: 'Create a free account' }), 'a free account does not open Brand').toHaveCount(0)
    const name = who === 'free' ? 'Upgrade to Pro' : 'See what Pro includes'
    await expect(block.getByRole('link', { name })).toHaveAttribute('href', '/plans')
  }
  await expect(page.locator('.geg-pill'), 'the gate is exactly one primary offer').toHaveCount(1)
  await expect(
    countLine(page).filter({ hasText: /^0 / }),
    'the count line never reads "0 ..." while the gate shows',
  ).toHaveCount(0)
  await expectNoMatchStateGone(page)
}

for (const width of [390, 1440]) {
  test.describe(`Brand chip while palettes are withheld · ${width}px`, () => {
    test.use({ viewport: { width, height: width === 390 ? 844 : 900 } })

    test.describe('signed in, free', () => {
      test.beforeEach(async ({ page }) => {
        watch(page, 'a free viewer tapping the Brand chip')
        await signIn(page, { plan: 'free' })
        await go(page, ROUTE)
        // Positive control: the page rendered the free rung before the chip is pressed.
        await expect(openTiles(page)).toHaveCount(GALLERY_TIER_LIMITS.free)
      })

      test('names the gate, the true count and one link to Pro', async ({ page }) => {
        await openBrand(page)
        const block = gate(page)
        await expect(block).toHaveCount(1)
        await expect(block).toBeVisible()
        await expect(block.getByRole('heading')).toHaveText(HEADING)
        await expect(block.locator('.geg-p')).toHaveText(BODY)
        await expect(gateControls(page)).toHaveCount(1)
        const link = block.getByRole('link', { name: 'Upgrade to Pro' })
        await expect(link).toHaveCount(1)
        await expect(link).toHaveAttribute('href', '/plans')
        await expectNoMatchStateGone(page)
      })

      test('the tap is announced once', async ({ page }) => {
        await expectSingleAnnouncement(page)
      })

      test('the link goes to the plans page', async ({ page }) => {
        await openBrand(page)
        await gate(page).getByRole('link', { name: 'Upgrade to Pro' }).click()
        await expect(page).toHaveURL(/\/plans$/)
      })

      test('Brand with a mood is still exactly one offer', async ({ page }) => {
        await openBrand(page, { mood: 'Warm' })
        await expectBrandMoodGate(page, 'free')
      })

      test('a collection with open rows keeps its open tiles and gets the "more with Pro" gate, not the brand one (control)', async ({ page }) => {
        // The gate must come from what the collection withholds, not from the
        // page being in a filtered state: Curated still lists the ten open
        // rows, and the gate over them counts the curated rest, not "part of Pro".
        await pick(page, COLLECTION_TRIGGER, COLLECTION_TRAY, 'Curated')
        await expect(openTiles(page)).toHaveCount(GALLERY_TIER_LIMITS.free)
        const block = gate(page)
        await expect(block).toHaveCount(1)
        await expect(block.getByRole('heading')).toHaveText(`${CURATED_TOTAL - GALLERY_TIER_LIMITS.free} more curated palettes with Pro`)
        await expect(block.getByRole('heading')).not.toHaveText(HEADING)
      })
    })

    test.describe('signed out', () => {
      test.beforeEach(async ({ page }) => {
        watch(page, 'a signed-out visitor tapping the Brand chip')
        await go(page, ROUTE)
        await expect(openTiles(page)).toHaveCount(GALLERY_TIER_LIMITS.anonymous)
      })

      test('names the gate and offers one link to Pro, not an account', async ({ page }) => {
        await openBrand(page)
        const block = gate(page)
        await expect(block).toHaveCount(1)
        await expect(block).toBeVisible()
        await expect(block.getByRole('heading')).toHaveText(HEADING)
        await expect(block.locator('.geg-p')).toHaveText(BODY)
        await expect(page.locator('.geg-pill'), 'one primary offer').toHaveCount(1)
        const link = block.getByRole('link', { name: 'See what Pro includes' })
        await expect(link).toHaveCount(1)
        await expect(link).toHaveAttribute('href', '/plans')
        // The redesign adds a quiet "Log in" beside the primary (a signed-out Pro
        // subscriber needs it); what must stay absent is the promise that a free
        // account opens Brand.
        await expect(block.getByRole('button', { name: 'Create a free account' }), 'a free account does not open Brand').toHaveCount(0)
        await expect(block.getByRole('button', { name: 'Log in' })).toHaveCount(1)
        await expectNoMatchStateGone(page)
      })

      test('the link goes to the plans page', async ({ page }) => {
        await openBrand(page)
        await gate(page).getByRole('link', { name: 'See what Pro includes' }).click()
        await expect(page).toHaveURL(/\/plans$/)
      })

      test('the tap is announced once', async ({ page }) => {
        await expectSingleAnnouncement(page)
      })

      test('Brand with a mood is still exactly one offer', async ({ page }) => {
        await openBrand(page, { mood: 'Warm' })
        await expectBrandMoodGate(page, 'anon')
      })
    })

    test.describe('Pro', () => {
      test('lists the brand tiles and shows no gate', async ({ page }) => {
        watch(page, 'a Pro subscriber tapping the Brand chip')
        await signIn(page, { plan: 'pro' })
        await go(page, ROUTE)
        await expect(openTiles(page).first()).toBeVisible()
        await openBrand(page)
        await expect(openTiles(page)).toHaveCount(PRO_BRAND_ROWS)
        expect(PRO_BRAND_ROWS, 'the control is vacuous without brand rows').toBeGreaterThan(0)
        await expect(page.locator('.vpt[data-kind="brand"]')).toHaveCount(PRO_BRAND_ROWS)
        await expect(gate(page)).toHaveCount(0)
        await expect(page.getByText(HEADING)).toHaveCount(0)
        await expect(page$(page)).not.toContainText('No palettes match')
      })
    })
  })
}
