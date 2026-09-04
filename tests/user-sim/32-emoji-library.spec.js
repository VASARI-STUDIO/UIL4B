// The Emoji Library, on the two symptoms the founder reported (2026-08-08):
// "search returns nothing usable" and "the whole surface is laggy and slow to
// render/load". The queue item asked which was cause and which was consequence.
//
// The answer, settled in #272 and confirmed here by measurement: they were
// INDEPENDENT. The search failure was a data fault — the old filter matched a
// per-CATEGORY keyword table, so a query selected categories rather than emoji
// — and it is fixed by a real per-emoji index. The render cost was already
// bounded by a windowed grid, and the index that makes search work is loaded on
// demand rather than bundled, so fixing the first did not cost the second.
//
// The ranking itself is asserted without a browser in
// tests/unit/emoji-search.test.js. What is here is what only a browser settles:
// that the page wires the index up at all, that the grid stays windowed, and
// that the surface never silently does nothing.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const ROUTE = '/create/emoji'
const SEARCH = 'input[type="search"]'
const CELL = '.emoji-cell'

test.describe('emoji library', () => {
  test.beforeEach(async ({ page }) => {
    watch(page, 'someone looking for one emoji')
    await go(page, ROUTE)
    await expect(page.locator(SEARCH)).toBeVisible()
  })

  // The reported symptom, in the form a user would hit it.
  test('searching finds the emoji, not its whole category', async ({ page }) => {
    const field = page.locator(SEARCH)
    await field.click()          // the index loads on focus
    await field.fill('pizza')

    // The cell's accessible name is its title, "Copy 🍕".
    await expect.poll(() => page.locator(`${CELL}[title*="🍕"]`).count(), { timeout: 15000 })
      .toBeGreaterThan(0)

    // The old behaviour returned all 125 Food emoji for this. A handful is the
    // point of having an index; the exact number is CLDR's business, not ours.
    const shown = await page.locator(CELL).count()
    expect(shown, 'a whole category came back, not a result').toBeLessThan(20)
  })

  test('a query that matches nothing says so, rather than going quiet', async ({ page }) => {
    const field = page.locator(SEARCH)
    await field.click()
    await field.fill('zzzzqqqq')
    await expect(page.getByText(/No emoji found/i)).toBeVisible({ timeout: 15000 })
  })

  // The perf half. Not a timing assertion — those are flaky by construction on
  // a shared runner — but the structural property that makes the surface cheap:
  // the grid renders a window, not 1,600 buttons.
  test('the grid is windowed, so the DOM stays small', async ({ page }) => {
    await expect(page.locator(CELL).first()).toBeVisible()
    const rendered = await page.locator(CELL).count()
    // MEASURED, not guessed: 430 buttons at 1440x900, against a catalogue of
    // 1,636. The bound below is deliberately loose — the window size follows the
    // viewport and the overscan, so pinning it near the measured figure would go
    // red on any layout change while catching nothing. What it does catch is the
    // failure that matters: losing virtualisation entirely renders the whole
    // catalogue, which is four times this ceiling.
    expect(rendered).toBeGreaterThan(0)
    expect(rendered, `${rendered} emoji buttons in the DOM — the grid is no longer windowed`).toBeLessThan(800)
  })

  // The index is ~31 KB gzipped and this surface was reported slow to LOAD, so
  // it is deliberately not in the page's own bundle. A regression here would be
  // invisible except as a slower first paint.
  test('the search index is not fetched until someone reaches for search', async ({ page }) => {
    const indexRequests = []
    page.on('request', (r) => { if (/emojiIndex|emoji-index/i.test(r.url())) indexRequests.push(r.url()) })

    await go(page, ROUTE)
    await expect(page.locator(CELL).first()).toBeVisible()
    expect(indexRequests, 'the index was fetched on load').toHaveLength(0)

    await page.locator(SEARCH).click()
    await expect.poll(() => indexRequests.length, { timeout: 15000 }).toBeGreaterThan(0)
  })
})
