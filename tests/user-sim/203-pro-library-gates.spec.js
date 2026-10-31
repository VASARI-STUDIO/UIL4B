// What the three Pro libraries (palettes, gradients, community prompts) say
// while their rows are withheld or on the way, measured in a browser.
//
// Three promises, each the thing a person would complain about if it broke:
//
//   1. A signed-out visitor is told exactly where they stand. The wall (and,
//      once they narrow the view, the closing line) says "Signed out, you see 3
//      of the N <noun>. A free account opens 10; Pro opens all N." and the
//      results head on palettes and gradients reads "N palettes · 3 shown", so
//      the page never claims a size it is not showing.
//
//   2. A signed-in Pro account never meets the free wall, or a "no match"
//      empty state, in the moment before its library arrives. Whether the plan
//      is still on the way, the session is still being checked, or the library
//      request is slow, the page holds a neutral loading block that reserves
//      the height the rows will take, then swaps in the whole set.
//
//   3. A refusal (403) for an account the page believed was Pro says so in
//      words and offers Retry, and Retry asks the server again every time.
//
// All network is stubbed: the session is the Firebase double from helpers.js
// and /api/ai?library= is answered by the real serve.js code behind it, with
// the test holding or refusing the request in front of it. No real account.
//
// MUTATIONS this file goes red on:
//   - drop `(authLoading === true && readSessionHint()) ||` from `resolving` in
//     src/hooks/useProLibrary.js: the "session still being checked" test goes red;
//   - drop `setAttempt((n) => n + 1)` from retry in the same file: the Retry
//     tests go red;
//   - let the pages draw the free wall while pending (`proPending` false in
//     PaletteGallery): the "plan still on the way" and "slow library" tests go red.
//
// CAPTURES: with PROGATE_CAPTURE_DIR set, each state is also saved as a PNG, in
// light and dark. Unset, nothing is written and only light is run.
import fs from 'node:fs'
import path from 'node:path'
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'
import { LIBRARY_PALETTES } from '../../api/_lib/library/paletteLibrary.js'
import { GALLERY_GRADIENTS } from '../../api/_lib/library/gradientGallery.js'
import { COMMUNITY_PROMPTS } from '../../api/_lib/library/communityPrompts.js'
import { LIBRARY_TOTALS } from '../../src/data/libraryTotals.js'

const CAPTURE_DIR = process.env.PROGATE_CAPTURE_DIR || ''
const THEMES = CAPTURE_DIR ? ['light', 'dark'] : ['light']

const VIEWPORTS = [
  { name: '390', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, phone: true },
  { name: '1440', use: { viewport: { width: 1440, height: 900 } }, phone: false },
]

// The tiers, as the sentence prints them. Typed
// here rather than imported, so a change to the cap has to change a test.
const ANON_SEES = 3
const FREE_OPENS = 10

// The first row open to a signed-out visitor, by the name the search matches.
const FIRST_OPEN = {
  palettes: LIBRARY_PALETTES.find((p) => p.pro !== true).name,
  gradients: GALLERY_GRADIENTS[0].name,
  prompts: COMMUNITY_PROMPTS.find((p) => p.free === true).title,
}

const LIBS = [
  {
    key: 'palettes', route: '/discover/palettes', card: '.pgal-card', noun: 'palettes', singular: 'palette',
    total: LIBRARY_PALETTES.length, totalFromData: LIBRARY_TOTALS.palettes,
    status: 'palette library', head: true,
    search: (page) => page.getByLabel('Search palettes'),
  },
  {
    key: 'gradients', route: '/discover/gradients', card: '.grg-card', noun: 'gradients', singular: 'gradient',
    total: GALLERY_GRADIENTS.length, totalFromData: LIBRARY_TOTALS.gradients,
    status: 'gradient library', head: true,
    search: (page) => page.getByLabel('Search gradients'),
  },
  {
    key: 'prompts', route: '/discover/prompts', card: '.pl-card', noun: 'community prompts', singular: 'community prompt',
    total: COMMUNITY_PROMPTS.length, totalFromData: LIBRARY_TOTALS.prompts,
    status: 'community prompt library', head: false,
    search: (page) => page.getByLabel('Search community prompts'),
  },
]

const API = /\/api\/ai\?library=/

/** The wall's sentence for a signed-out visitor, worked out by hand from the tiers. */
const sentenceFor = (lib) =>
  `Signed out, you see ${ANON_SEES} of the ${lib.total} ${lib.noun}. A free account opens ${FREE_OPENS}; Pro opens all ${lib.total}.`

/** Sit in front of the stubbed library endpoint for ONE kind; the others pass through. */
async function standInFront(page, lib, handler) {
  const seen = { calls: 0 }
  await page.route(API, async (route) => {
    if (!route.request().url().includes(`library=${lib.key}`)) return route.fallback()
    seen.calls += 1
    return handler(route, seen)
  })
  return seen
}

async function capture(page, theme, lib, vp, state) {
  if (!CAPTURE_DIR) return
  fs.mkdirSync(CAPTURE_DIR, { recursive: true })
  // A phone gets the viewport only; a desktop gets the whole page, except for
  // the full Pro set, which is hundreds of rows long.
  const fullPage = !vp.phone && state !== 'pro-ready'
  // On a phone the state under test sits below the header, so bring it into the viewport.
  if (vp.phone) {
    const target = page.locator('.lockt-status, .lockt-cta, .gcta').first()
    if (await target.count()) await target.scrollIntoViewIfNeeded()
  }
  await page.screenshot({ path: path.join(CAPTURE_DIR, `${lib.key}-${state}-${vp.name}-${theme}.png`), fullPage })
}

/** The block a viewer sees where a free viewer sees the upsell. */
const statusOf = (page) => page.locator('.lockt-status')
/** The wall: a call to action that is not the status block. */
const wallOf = (page) => page.locator('.lockt-cta:not(.lockt-status)')

test.describe('the fixtures this file leans on', () => {
  test('the sizes the page prints match the data the server holds', () => {
    for (const lib of LIBS) {
      expect(lib.total, `${lib.key}: the client total disagrees with the library`).toBe(lib.totalFromData)
    }
    // Hand-checked sizes, so a change to either library is a change to this file.
    expect(LIBRARY_PALETTES.length).toBe(101)
    expect(GALLERY_GRADIENTS.length).toBe(100)
    expect(FIRST_OPEN.prompts.length, 'a free prompt exists to search for').toBeGreaterThan(0)
  })
})

for (const vp of VIEWPORTS) {
  for (const theme of THEMES) {
    for (const lib of LIBS) {
      test.describe(`${lib.key} · ${vp.name} · ${theme}`, () => {
        test.use(vp.use)
        test.beforeEach(async ({ page }) => { await page.emulateMedia({ colorScheme: theme }) })

        test('signed out: the wall states the tiers and the head states the size', async ({ page }) => {
          watch(page, `a signed-out visitor on the ${lib.key} library`)
          await go(page, lib.route)
          await expect(page.locator(lib.card).first()).toBeVisible()
          await expect(page.locator(lib.card)).toHaveCount(ANON_SEES)

          // The wall, on the unnarrowed view.
          await expect(wallOf(page).locator('.lockt-cta-body')).toHaveText(sentenceFor(lib))
          if (lib.head) {
            await expect(page.locator('.drh-head p')).toHaveText(`${lib.total} ${lib.noun} · ${ANON_SEES} shown`)
          }
          expect(await page.evaluate(() => document.documentElement.getAttribute('data-theme'))).toBe(theme)
          await capture(page, theme, lib, vp, 'signed-out')
        })

        test('signed out, narrowed to a search: the closing line states the same tiers', async ({ page }) => {
          watch(page, `a signed-out visitor narrowing the ${lib.key} library`)
          await go(page, lib.route)
          await expect(page.locator(lib.card).first()).toBeVisible()
          await lib.search(page).fill(FIRST_OPEN[lib.key])
          // The control: the search found the open row, so this is a real result.
          await expect(page.locator(lib.card).first()).toBeVisible()
          // The wall steps aside for a narrowed view; the closing line carries the offer.
          await expect(wallOf(page)).toHaveCount(0)
          await expect(page.locator('.gcta-detail')).toHaveText(sentenceFor(lib))
          await expect(page.locator('.gcta-action')).toHaveText('Create your free account')
          await capture(page, theme, lib, vp, 'signed-out-narrowed')
        })

        test('Pro with a slow library request: a reserved loading block, never the wall, then the whole set', async ({ page }) => {
          watch(page, `a Pro member waiting on the ${lib.key} library`)
          await signIn(page, { plan: 'pro' })
          let release
          const gate = new Promise((resolve) => { release = resolve })
          await standInFront(page, lib, async (route) => { await gate; return route.fallback() })
          await go(page, lib.route)

          const block = statusOf(page)
          await expect(block).toContainText(`Loading the full ${lib.status}…`)
          // Not the free wall, not a locked placeholder, not an empty state.
          await expect(wallOf(page)).toHaveCount(0)
          await expect(page.locator('.lockt-card')).toHaveCount(0)
          await expect(page.getByText(/no (palettes|gradients|prompts) match/i)).toHaveCount(0)
          // Reserved height: min(60vh, 520px), so the page does not jump when the rows land.
          const viewportHeight = page.viewportSize().height
          const reserved = Math.min(viewportHeight * 0.6, 520)
          const box = await block.boundingBox()
          expect(box.height, 'the loading block holds the height of the rows to come').toBeGreaterThanOrEqual(reserved - 1)
          await capture(page, theme, lib, vp, 'pro-loading')

          release()
          await expect(block).toHaveCount(0)
          await expect(wallOf(page)).toHaveCount(0)
          // The whole set: more rows than any non-Pro rung is given, and the head drops "shown".
          await expect.poll(() => page.locator(lib.card).count(), { message: 'the full set landed' }).toBeGreaterThan(FREE_OPENS)
          if (lib.head) await expect(page.locator('.drh-head p')).toHaveText(`${lib.total} ${lib.noun}`)
          await capture(page, theme, lib, vp, 'pro-ready')
        })

        test('Pro whose plan has not arrived: the same neutral block, not the free wall', async ({ page }) => {
          watch(page, `a Pro member before the plan answers on the ${lib.key} library`)
          await signIn(page, { plan: 'pro', slowReads: [{ path: 'users/test-uid-pro', hold: true }] })
          await go(page, lib.route)

          await expect(statusOf(page)).toContainText(`Loading the ${lib.status}…`)
          await expect(wallOf(page)).toHaveCount(0)
          await expect(page.locator('.lockt-card')).toHaveCount(0)
          await expect(page.getByText(/no (palettes|gradients|prompts) match/i)).toHaveCount(0)

          await page.evaluate(() => window.__UIL4B_TEST_HOLD__.release())
          await expect(statusOf(page)).toHaveCount(0)
          await expect.poll(() => page.locator(lib.card).count()).toBeGreaterThan(FREE_OPENS)
        })

        test('a returning session whose auth has not answered: the same neutral block, not the free wall', async ({ page }) => {
          watch(page, `a returning Pro member while the session is checked on the ${lib.key} library`)
          await signIn(page, { plan: 'pro', authDelay: 3000 })
          await go(page, lib.route)

          await expect(statusOf(page)).toContainText(`Loading the ${lib.status}…`)
          await expect(wallOf(page)).toHaveCount(0)
          await expect(page.getByText(/no (palettes|gradients|prompts) match/i)).toHaveCount(0)

          await expect.poll(() => page.locator(lib.card).count(), { timeout: 10000 }).toBeGreaterThan(FREE_OPENS)
          await expect(statusOf(page)).toHaveCount(0)
        })

        test('a 403 for a Pro account: the message and Retry, and every Retry asks the server again', async ({ page }) => {
          watch(page, `a Pro member refused the ${lib.key} library`)
          await signIn(page, { plan: 'pro' })
          let refusing = true
          const seen = await standInFront(page, lib, async (route) => {
            if (refusing) {
              return route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ error: 'forbidden' }) })
            }
            return route.fallback()
          })
          await go(page, lib.route)

          const block = statusOf(page)
          await expect(block).toContainText(`We couldn’t confirm your Pro access for the ${lib.status}. Retry, or reload the page.`)
          const retry = block.getByRole('button', { name: 'Retry' })
          await expect(retry).toBeVisible()
          await expect(wallOf(page)).toHaveCount(0)
          expect(seen.calls, 'one request so far').toBe(1)
          await capture(page, theme, lib, vp, 'refused')

          // Still refused: Retry goes back to the server and the message stays.
          await retry.click()
          await expect.poll(() => seen.calls, { message: 'Retry asked the server again' }).toBe(2)
          await expect(block).toContainText('couldn’t confirm your Pro access')

          // Now allowed: the next Retry lands the whole set.
          refusing = false
          await retry.click()
          await expect.poll(() => seen.calls, { message: 'the second Retry asked again' }).toBe(3)
          await expect(block).toHaveCount(0)
          await expect.poll(() => page.locator(lib.card).count()).toBeGreaterThan(FREE_OPENS)
        })
      })
    }
  }
}
