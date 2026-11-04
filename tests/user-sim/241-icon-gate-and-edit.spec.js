// THE SIGNED-OUT GATE LEADS WITH THE ICON COUNT, AND TWO BLURRED ROWS SIT OVER IT.
//
// /create/icons signed out: the gate heading reads "Log in to access N icons", N being every icon a
// free account opens (the sum of the free and signed-out packs' committed lists, less the Carbon
// logo-* names that stay on Pro). Above the gate band sit two WHOLE rows of blurred tiles, one cell per
// grid column per row, at 390, 768 and 1440: aria-hidden, nothing in them focusable, no pointer events.
//
// The expected sum is computed here from the committed snapshots (public/iconify/collections),
// separately from src/data/iconPackCounts.generated.js, so either side drifting fails here.
//
// HOW TO SEE EACH FAIL (src/ unless named):
//   TEASE_ROWS goes back to 1 (utils/iconEndBand.js)                          -> "two whole blurred rows"
//   .ig-end-tease loses pointer-events:none, or a cell gets a tabIndex         -> "not focusable, no pointer"
//   ICON_GATE_COPY.end.anon.heading goes back to "Log in to open all N sets."  -> "the gate heading"
//   iconPackCounts.generated.js loses a pack                                   -> "the gate quotes the real total"
import { readFileSync } from 'node:fs'
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'
import { gridColumns } from './icon-grid-rows.js'

const WIDTHS = [390, 768, 1440]
// Packs a free account opens: the five signed-out sets plus the seven behind login.
const FREE_PACKS = ['lucide', 'tabler', 'iconoir', 'heroicons', 'ph', 'mdi', 'material-symbols', 'solar', 'fa6-solid', 'bxs', 'mingcute', 'carbon']

/** What the heading should quote: every name in those snapshots, less Carbon's Pro-only logo-* marks. */
function expectedFreeTotal() {
  let sum = 0
  for (const pack of FREE_PACKS) {
    const d = JSON.parse(readFileSync(new URL(`../../public/iconify/collections/${pack}.json`, import.meta.url), 'utf8'))
    const names = new Set([...(d.uncategorized || []), ...Object.values(d.categories || {}).flat()])
    for (const n of names) if (!(pack === 'carbon' && n.startsWith('logo-'))) sum += 1
  }
  return sum
}

async function openLibrary(page, width, height = 900) {
  await page.setViewportSize({ width, height })
  await go(page, '/create/icons')
  await expect(page.locator('.ig .ic').first()).toBeVisible({ timeout: 20_000 })
  await expect(page.locator('.ig-skel')).toHaveCount(0, { timeout: 20_000 })
}

test.describe('the signed-out gate', () => {
  for (const width of WIDTHS) {
    test(`${width}: the heading quotes the real total and two whole blurred rows sit above the band`, async ({ page }) => {
      watch(page, 'a designer who has not signed up yet, reaching the end of the icon grid')
      await openLibrary(page, width)
      const gate = page.locator('.ig-end[data-gate="anon"]')
      await expect(gate).toBeVisible()

      const heading = (await gate.getByRole('heading', { level: 2 }).textContent()).trim()
      const m = heading.match(/^Log in to access ([\d,]+) icons$/)
      expect(m, `the gate heading: "${heading}"`).not.toBeNull()
      const quoted = Number(m[1].replace(/,/g, ''))
      expect(quoted, 'the gate quotes the real total').toBeGreaterThanOrEqual(expectedFreeTotal())
      await expect(gate.locator('.ig-end-p'), 'the sets count stays as secondary text').toContainText('across 12 sets')

      const cols = await gridColumns(page)
      const tease = page.locator('.ig-end-tease')
      const tops = await tease.locator('> *').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)))
      expect(tops.length, 'two whole blurred rows: two cells per grid column').toBe(cols * 2)
      expect([...new Set(tops)].length, 'the cells sit on exactly two rows').toBe(2)
      const aboveBand = await page.evaluate(() => {
        const t = document.querySelector('.ig-end-tease').getBoundingClientRect()
        const b = document.querySelector('.ig-end-band').getBoundingClientRect()
        return b.top >= t.top && b.top < t.bottom + 1
      })
      expect(aboveBand, 'the band comes after the rows (it rises into their faded foot)').toBe(true)

      await expect(tease, 'hidden from assistive tech').toHaveAttribute('aria-hidden', 'true')
      expect(await tease.evaluate((el) => getComputedStyle(el).pointerEvents), 'no pointer events: nothing to hover or press').toBe('none')
      expect(await tease.locator('a, button, input, select, textarea, [tabindex]').count(), 'not focusable').toBe(0)
      expect(await tease.locator('.ig-end-chip').count(), 'no hover chip').toBe(0)
      await expect(tease.locator('svg').first()).toBeVisible()
    })
  }

  test('the rows do not move once the page has settled (no layout shift)', async ({ page }) => {
    watch(page, 'a designer on a phone watching the icon grid load')
    await openLibrary(page, 390)
    const top = () => page.locator('.ig-end-tease').evaluate((el) => Math.round(el.getBoundingClientRect().top + window.scrollY))
    const first = await top()
    await page.waitForTimeout(600)
    expect(await top(), 'the blurred rows moved after load').toBe(first)
  })
})
