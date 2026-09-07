// The platform credit on a curated Community card is never clipped.
//
// `.ch-card-meta` is a `space-between` row holding the credit and the category
// tag. `.ch-card-source` carries `overflow:hidden`, which gives it a min-content
// contribution of zero — so in that row it was the only item that could give,
// and it gave first. MEASURED at 360px on the narrow two-column card:
// "Dribbble" needed 42px and was allotted 40, clipping to "Dribbbl…" to save two
// pixels, on the one element in the card that says whose work it is.
//
// src/data/communityDesigns.js records why the credit matters here specifically:
// twelve invented designers used to render through the same <UserName> as real
// members, and crediting the PLATFORM a curated link opens is the correction. A
// truncated platform name is that correction half-undone.
//
// `test` comes from ./base.js, not @playwright/test — that is where Google One
// Tap is stubbed on the browser fixture, and tests/unit/one-tap-stub.test.js
// fails the build for any spec that reaches past it.
import { test, expect } from './base.js'
import { go, watch, expectRendered } from './helpers.js'

const PERSONA = 'someone browsing community work on a phone'

// 360 is the width it was measured failing at; the others bracket it, because a
// single width would not notice the card grid changing column count.
const WIDTHS = [320, 360, 390, 414]

test.describe('community cards credit their source in full', () => {
  test('no platform credit is truncated at any narrow width', async ({ page }) => {
    watch(page, PERSONA)
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 })
      await go(page, '/community')
      await expectRendered(page)
      await page.waitForFunction(() => document.querySelectorAll('.ch-card-source').length > 0, null, { timeout: 15000 })

      const result = await page.evaluate(() => {
        const sources = [...document.querySelectorAll('.ch-card-source')]
        return {
          examined: sources.length,
          clipped: sources
            .filter((el) => el.scrollWidth > el.clientWidth + 1)
            .map((el) => `"${el.textContent}" needs ${el.scrollWidth}px, has ${el.clientWidth}px`),
        }
      })

      // Positive control: an empty list makes the clipping check vacuous, and
      // this page renders its cards from data that can legitimately be empty.
      expect(result.examined, `/community at ${width}px rendered no curated cards — the assertion below would pass vacuously`)
        .toBeGreaterThan(0)

      expect(
        result.clipped,
        `/community at ${width}px truncates ${result.clipped.length} platform credit(s):\n  ${result.clipped.join('\n  ')}`,
      ).toEqual([])
    }
  })
})
