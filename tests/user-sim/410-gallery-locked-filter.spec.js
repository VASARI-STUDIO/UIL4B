// V3 Libraries, palettes and gradients: a filter whose matches are all behind
// the tier. The page used to count only the rows the viewer can open, so a
// Radial filter read "0 gradients", showed "Nothing open to you matches those
// filters." and no gate, while the library holds radial gradients. The gate and
// a count that says so must appear whenever anything in the library matches.
//
// Until the Pro stubs carry `type` (gradients) and `moods` (palettes) a locked
// row cannot be matched against a Type or Mood filter, so those facets are
// "unknown" and the page uses the unfiltered library copy; the assertions that
// need a true total wait on the stub fields (see gradientStubsCarryType).
//
// MUTATIONS this file goes red on:
//   - count only `browsable` for the empty state in GradientGallery.jsx: the
//     "no empty state" and gate assertions go red;
//   - render the fade without `data-gate-fade`, or with buttons or links in a
//     tile: the fade assertions go red;
//   - put a real Pro colour into a stand-in: the colour assertion goes red.
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'
import { GALLERY_TIER_LIMITS } from '../../src/utils/lockedPreview.js'
import { STANDIN_COLOURS } from '../../src/utils/gateStandins.js'
import { LIBRARY_PALETTES } from '../../api/_lib/library/paletteLibrary.js'
import { classifyPalette, MOOD_IDS } from '../../src/utils/paletteMood.js'
import {
  gradientStubsCarryType, paletteStubsCarryMoods, loginDialog,
  pickGradientType, pickPaletteMood, hexesIn,
} from './gallery-filter-helpers.js'

const VIEWPORTS = [
  { name: '1440', use: { viewport: { width: 1440, height: 900 } } },
  { name: '390', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
]

// A palette mood none of the rows a free account opens carries, but some
// palette in the library does: every match is behind the tier at both rungs.
const openRows = LIBRARY_PALETTES.filter((p) => p.pro !== true)
const lockedOnlyMood = MOOD_IDS.find((m) => (
  !openRows.slice(0, GALLERY_TIER_LIMITS.free).some((p) => classifyPalette(p.colors)[m])
  && LIBRARY_PALETTES.some((p) => classifyPalette(p.colors)[m])
))

const countLine = (page) => page.locator('.drh-head p')

// The count line never reads "0 <noun>" while the gate shows. Until the stubs
// carry the filter field the filtered total is unknown, and the page leaves the
// line out rather than print a number it does not have; either way no zero.
async function expectNoZeroCount(page, noun) {
  await expect(countLine(page).filter({ hasText: new RegExp(`^0 ${noun}`) })).toHaveCount(0)
}

async function expectFadeIsClean(fade) {
  await expect(fade).toHaveAttribute('aria-hidden', 'true')
  expect(await fade.locator('button, a').count(), 'a locked tile offers nothing to focus or follow').toBe(0)
  expect(await fade.innerText(), 'no hex text in the fade').not.toMatch(/#[0-9a-f]{3,8}\b/i)
}

for (const vp of VIEWPORTS) {
  test.describe(`locked filter matches at ${vp.name}`, () => {
    test.use(vp.use)

    test('gradients, signed out, Radial: a count that is not 0, the gate, the fade, and both doors to log in', async ({ page }) => {
      watch(page, 'a signed-out visitor filtering gradients to Radial')
      await go(page, '/discover/gradients')
      await pickGradientType(page, 'Radial')

      await expect(page.getByText('Nothing open to you')).toHaveCount(0)
      await expectNoZeroCount(page, 'gradients')
      const gate = page.locator('[data-gate="anon"]')
      await expect(gate).toBeVisible()
      if (gradientStubsCarryType) {
        await expect(countLine(page)).toHaveText(/^\d+ radial gradients? · \d+ shown$/)
        await expect(gate.getByRole('heading')).toHaveText(/radial gradients?/)
      } else {
        await expect(gate.getByRole('heading')).toHaveText(/gradients/)
      }
      const fade = page.locator('[data-gate-fade]')
      await expect(fade).toHaveCount(1)
      expect(await fade.locator('.vpt').count(), 'the fade holds locked tiles').toBeGreaterThan(0)
      await expectFadeIsClean(fade)

      await gate.getByRole('button', { name: 'Create a free account' }).click()
      await expect(loginDialog(page)).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(loginDialog(page)).toHaveCount(0)

      await fade.locator('.vpt').first().click({ force: true })
      await expect(loginDialog(page), 'a click on the fade opens the same dialog').toBeVisible()
    })

    test('gradients, signed in on Free, Radial: the Pro gate, a /plans link and a fade of neutral colours only', async ({ page }) => {
      watch(page, 'a free member filtering gradients to Radial')
      await signIn(page, { plan: 'free' })
      await go(page, '/discover/gradients')
      await pickGradientType(page, 'Radial')

      await expect(page.getByText('Nothing open to you')).toHaveCount(0)
      const gate = page.locator('[data-gate="free"]')
      await expect(gate).toBeVisible()
      if (gradientStubsCarryType) {
        await expect(gate.getByRole('heading')).toHaveText(/^\d+ more radial gradients? with Pro$/)
      }
      await expect(gate.getByRole('link', { name: 'Upgrade to Pro' })).toHaveAttribute('href', '/plans')

      const fade = page.locator('[data-gate-fade]')
      await expectFadeIsClean(fade)
      const colours = await fade.evaluate((el) => [el, ...el.querySelectorAll('[style*="background"]')]
        .flatMap((n) => { const s = getComputedStyle(n); return [s.backgroundColor, s.backgroundImage] }))
      const found = colours.flatMap(hexesIn)
      const allowed = new Set(STANDIN_COLOURS.map((h) => h.toUpperCase()))
      expect(found.length, 'the fade is painted').toBeGreaterThan(0)
      expect(found.filter((h) => !allowed.has(h)), 'every colour in the fade is a stand-in').toEqual([])
    })

    test('gradients: a query that matches nothing in the library gets the empty state and no gate', async ({ page }) => {
      watch(page, 'a visitor searching gradients for a word nothing contains')
      await go(page, '/discover/gradients')
      await page.getByRole('searchbox').fill('zzzz')
      await expect(page.getByRole('status').getByText('No gradients match “zzzz”.')).toBeVisible()
      await expect(page.locator('[data-gate]')).toHaveCount(0)
      await expect(countLine(page)).toHaveText('0 gradients matching “zzzz”')
    })

    for (const who of ['signed out', 'free']) {
      test(`palettes, ${who}, a mood only locked palettes carry: the gate, no empty state, a fade`, async ({ page }) => {
        expect(lockedOnlyMood, 'the data has a mood whose matches are all behind the tier').toBeTruthy()
        watch(page, `a ${who} visitor filtering palettes to a locked-only mood`)
        if (who === 'free') await signIn(page, { plan: 'free' })
        await go(page, '/discover/palettes')
        await pickPaletteMood(page, lockedOnlyMood)

        await expect(page.getByText('Nothing open to you')).toHaveCount(0)
        await expectNoZeroCount(page, 'palettes')
        const gate = page.locator(who === 'free' ? '[data-gate="free"]' : '[data-gate="anon"]')
        await expect(gate).toBeVisible()
        await expect(gate.getByRole('heading')).toHaveText(/(\w+) palettes?|brand systems?|palettes/)
        if (paletteStubsCarryMoods) {
          await expect(countLine(page)).toHaveText(/^\d+ \w+ palettes? · \d+ shown$/)
        }
        const fade = page.locator('[data-gate-fade]')
        await expect(fade).toHaveCount(1)
        expect(await fade.locator('.vpt').count()).toBeGreaterThan(0)
        await expectFadeIsClean(fade)
      })
    }
  })
}
