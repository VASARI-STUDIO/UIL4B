// A collection the tier cap has emptied says it is gated, once, and does not
// claim "no match".
//
// THE FAULT THIS GUARDS. The Palette Library hands a free viewer ten curated
// palettes and a signed-out visitor three; every brand system sits past both
// caps. Tapping the Brand chip therefore left nothing to list, and the page
// answered "No palettes match that combination." That is false: 91 palettes
// exist and the viewer is not allowed them. The page now keys off the rows
// (`gatedKind` in src/pages/PaletteGallery.jsx) and shows one gated block in a
// polite live region instead, with one way forward for the viewer's tier:
//
//   signed in, free   "See what Pro includes" -> /plans
//   signed out        "Create your free account" -> the sign-up gate
//   Pro               brand cards, no block
//
// Two ways this regresses quietly, and what pins each:
//   - the "no match" state comes back                 -> text + live-region checks
//   - the bottom close CTA stands up beside the block -> the CTA count. It only
//     renders once a mood is chosen (an unnarrowed view relies on the tease), so
//     the count is taken with Brand alone AND with Brand + Warm.
//
// Everything is read off the rendered page by pressing the real chips, as a
// viewer does. The only number derived rather than typed is the withheld count,
// from the same library file and tier table the page splits, as spec 44 does.
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'
import { LIBRARY_PALETTES } from '../../api/_lib/library/paletteLibrary.js'
import { GALLERY_TIER_LIMITS } from '../../src/utils/lockedPreview.js'

const ROUTE = '/discover/palettes'
const COLLECTION_TRAY = '[aria-label^="Filter palettes by collection"]'
const MOOD_TRAY = '[aria-label^="Filter palettes by mood"]'
// Named by their own key span: below the desktop band the collection group
// collapses into a trigger as well, so a bare `.lbry-filtertrig` is ambiguous.
const COLLECTION_TRIGGER = '.pgl-toolbar .lbry-filtertrig:has(.lbry-filtertrig-k:text-is("Collection"))'
const MOOD_TRIGGER = '.pgl-toolbar .lbry-filtertrig:has(.lbry-filtertrig-k:text-is("Mood"))'

const HEADING = 'Brand palettes are part of Pro'
const FREE_BODY_COUNT = LIBRARY_PALETTES.length - GALLERY_TIER_LIMITS.free
const FREE_BODY = `Another ${FREE_BODY_COUNT} palettes open with Pro, including every brand system.`
const ANON_BODY = 'Create a free account to see more of the library. Pro opens all of it.'

// What a Pro viewer lists under Brand: every brand system in the library.
const PRO_BRAND_ROWS = LIBRARY_PALETTES.filter((p) => p.kind === 'brand').length

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
// Every way forward this block can offer, wherever it sits on the page.
const offers = (page) => page$(page).locator('a, button').filter({ hasText: /^\s*(See what Pro includes|Create your free account)\s*$/ })
const gatedBlock = (page) => page.locator('[role="status"]').filter({ hasText: HEADING })

async function expectNoMatchStateGone(page) {
  await expect(page$(page)).not.toContainText('No palettes match')
  await expect(page.locator('.pgal-card'), 'a brand card is open to this viewer').toHaveCount(0)
  await expect(page.locator('.lockt-card'), 'placeholders stand beside the single offer').toHaveCount(0)
  await expect(page.locator('.pgl-cta'), 'the bottom close CTA repeats the offer').toHaveCount(0)
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
        await expect(page.locator('.pgal-card')).toHaveCount(GALLERY_TIER_LIMITS.free)
      })

      test('names the gate, the true count and one link to Pro', async ({ page }) => {
        await openBrand(page)
        const block = gatedBlock(page)
        await expect(block).toBeVisible()
        await expect(block.locator('.lockt-cta-head')).toHaveText(HEADING)
        await expect(block.locator('.lockt-cta-body')).toHaveText(FREE_BODY)
        await expect(offers(page)).toHaveCount(1)
        const link = block.getByRole('link', { name: 'See what Pro includes' })
        await expect(link).toHaveCount(1)
        await expect(link).toHaveAttribute('href', '/plans')
        await expectNoMatchStateGone(page)
      })

      test('the link goes to the plans page', async ({ page }) => {
        await openBrand(page)
        await gatedBlock(page).getByRole('link', { name: 'See what Pro includes' }).click()
        await expect(page).toHaveURL(/\/plans$/)
      })

      test('Brand with a mood is still exactly one offer', async ({ page }) => {
        await openBrand(page, { mood: 'Warm' })
        const block = gatedBlock(page)
        await expect(block).toBeVisible()
        await expect(block.locator('.lockt-cta-head')).toHaveText(HEADING)
        await expect(block.locator('.lockt-cta-body')).toHaveText(FREE_BODY)
        await expect(offers(page), 'the gated block and the close CTA both showed').toHaveCount(1)
        await expectNoMatchStateGone(page)
      })

      test('a collection with open rows is not gated (control)', async ({ page }) => {
        // The block must come from the emptied collection, not from the page
        // being in a filtered state: Curated still lists the ten open rows.
        await pick(page, COLLECTION_TRIGGER, COLLECTION_TRAY, 'Curated')
        await expect(page.locator('.pgal-card')).toHaveCount(GALLERY_TIER_LIMITS.free)
        await expect(gatedBlock(page)).toHaveCount(0)
      })
    })

    test.describe('signed out', () => {
      test.beforeEach(async ({ page }) => {
        watch(page, 'a signed-out visitor tapping the Brand chip')
        await go(page, ROUTE)
        await expect(page.locator('.pgal-card')).toHaveCount(GALLERY_TIER_LIMITS.anonymous)
      })

      test('names the gate and offers one free account button', async ({ page }) => {
        await openBrand(page)
        const block = gatedBlock(page)
        await expect(block).toBeVisible()
        await expect(block.locator('.lockt-cta-head')).toHaveText(HEADING)
        await expect(block.locator('.lockt-cta-body')).toHaveText(ANON_BODY)
        await expect(offers(page)).toHaveCount(1)
        await expect(block.getByRole('button', { name: 'Create your free account' })).toHaveCount(1)
        await expectNoMatchStateGone(page)
      })

      test('the button opens the sign-up gate, not a checkout', async ({ page }) => {
        await openBrand(page)
        await gatedBlock(page).getByRole('button', { name: 'Create your free account' }).click()
        await expect(page.locator('[role="dialog"]')).toBeVisible()
        await expect(page).toHaveURL(/\/discover\/palettes/)
      })

      test('Brand with a mood is still exactly one offer', async ({ page }) => {
        await openBrand(page, { mood: 'Warm' })
        const block = gatedBlock(page)
        await expect(block).toBeVisible()
        await expect(block.locator('.lockt-cta-head')).toHaveText(HEADING)
        await expect(block.locator('.lockt-cta-body')).toHaveText(ANON_BODY)
        await expect(offers(page), 'the gated block and the close CTA both showed').toHaveCount(1)
        await expectNoMatchStateGone(page)
      })
    })

    test.describe('Pro', () => {
      test('lists the brand cards and shows no gated block', async ({ page }) => {
        watch(page, 'a Pro subscriber tapping the Brand chip')
        await signIn(page, { plan: 'pro' })
        await go(page, ROUTE)
        await expect(page.locator('.pgal-card').first()).toBeVisible()
        await openBrand(page)
        await expect(page.locator('.pgal-card')).toHaveCount(PRO_BRAND_ROWS)
        expect(PRO_BRAND_ROWS, 'the control is vacuous without brand rows').toBeGreaterThan(0)
        await expect(page.locator('.pgal-card[data-kind="brand"]')).toHaveCount(PRO_BRAND_ROWS)
        await expect(gatedBlock(page)).toHaveCount(0)
        await expect(page.getByText(HEADING)).toHaveCount(0)
        await expect(page$(page)).not.toContainText('No palettes match')
      })
    })
  })
}
