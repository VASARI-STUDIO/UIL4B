// SPEC 275: FOUR SMALL FIXES TO THE CREATE TOOLS AND LIBRARIES.
//
//   1. Gradient tool: at 360px and under a free account still sees a visible
//      "Pro" on the Selected stop's Tints button, the hex field shows its whole
//      value, and a finger still gets a 44px target.
//   2. Palette and Gradient libraries, signed in on a free plan: the three locked
//      cards never leave a lone card beside an empty cell at 768 (nor at any
//      other width), and a near-white swatch has a hairline along the foot of its
//      stripes.
//   3. Emoji Library on a phone: the twelve categories sit in the Filters sheet,
//      so no chip row scrolls sideways; the search placeholder is not cut off.
//   4. Learn hub: the unwritten topics are plain rows (title, summary, "Soon"),
//      with no border, link or arrow, and the intro line reads "These topics
//      aren't written yet."
//
// Card 5 (the Video tab's predicted output size) is covered by the unit tests in
// tests/unit/media-encode.test.js.
//
// MUTATIONS (each should turn the named test red):
//   - gradient.css: hide `.grd-pro-tag` in the `max-width: 360px` block: "Tints
//     keeps a visible Pro" fails;
//   - palette-gallery.css: delete the `.pgal-grid--locked` flex rules: "the locked
//     cards share their rows" fails at 768;
//   - gradient-gallery.css: delete the `.grg-grid--locked` flex rules: the same
//     test fails on the Gradient Library;
//   - palette-gallery.css: delete the `.pgal-stripes` border-bottom: "the stripes
//     end in a hairline" fails;
//   - EmojiLibrary.jsx: put `quick={0}` back on the toolbar: "the categories sit in
//     the Filters sheet" fails;
//   - EmojiLibrary.jsx: lengthen the search placeholder: "the search placeholder
//     fits its field" fails at 320.
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'

const SHOTS = '.claude/scratch/misc5'

// ─────────────────────────────────────────────────────────────────────────────
// 1 · Gradient tool: the Pro cue on Tints
// ─────────────────────────────────────────────────────────────────────────────

for (const [width, touch] of [[320, true], [360, true], [320, false], [360, false]]) {
  test.describe(`Gradient Tints at ${width}px${touch ? ' on a finger' : ' with a mouse'}`, () => {
    test.use({ viewport: { width, height: 844 }, hasTouch: touch, isMobile: touch })

    test('Tints keeps a visible Pro, a whole hex and a 44px target', async ({ page }) => {
      watch(page, `a free designer at ${width}px`)
      await signIn(page, { plan: 'free' })
      await go(page, '/create/gradient')
      const button = page.getByRole('button', { name: 'Tints of stop 1 (Pro)', exact: true })
      await expect(button).toBeVisible()
      // innerText leaves out what is display:none, so this is what a person can read.
      await expect.poll(() => button.evaluate((el) => el.innerText.trim())).toBe('Pro')
      const hex = page.getByRole('textbox', { name: 'Stop 1 hex' })
      const clipped = await hex.evaluate((el) => el.scrollWidth - el.clientWidth)
      expect(clipped, 'the stop hex is cut off by the Tints button').toBeLessThanOrEqual(1)
      if (touch) expect((await button.boundingBox()).height, 'touch target height').toBeGreaterThanOrEqual(44)
      await button.scrollIntoViewIfNeeded()
      await page.screenshot({ path: `${SHOTS}/gradient-tints-${width}-${touch ? 'touch' : 'mouse'}.png` })
    })
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// 2 · Pro libraries: the locked cards share their rows
// ─────────────────────────────────────────────────────────────────────────────

// Every row of the locked grid ends where the grid ends: a row whose last card
// stops short leaves an empty cell beside it.
const lockedRows = (page, gridSelector) => page.evaluate((sel) => {
  const grid = document.querySelector(sel)
  if (!grid) return null
  const box = grid.getBoundingClientRect()
  const cards = [...grid.querySelectorAll(':scope > .lockt-card')].map((c) => c.getBoundingClientRect())
  const rows = new Map()
  for (const r of cards) rows.set(Math.round(r.top), [...(rows.get(Math.round(r.top)) || []), r])
  return {
    count: cards.length,
    gridRight: box.right,
    rows: [...rows.values()].map((row) => ({ cards: row.length, right: Math.max(...row.map((r) => r.right)) })),
  }
}, gridSelector)

const LOCKED_LIBRARIES = [
  { name: 'Palette Library', route: '/discover/palettes', grid: '.pgal-grid--locked' },
  { name: 'Gradient Library', route: '/discover/gradients', grid: '.grg-grid--locked' },
]

for (const width of [390, 600, 768, 1024, 1440]) {
  test.describe(`Locked cards at ${width}px`, () => {
    test.use({ viewport: { width, height: 900 }, hasTouch: width < 800, isMobile: width < 800 })

    for (const lib of LOCKED_LIBRARIES) {
      test(`${lib.name}: the locked cards share their rows, no empty cell`, async ({ page }) => {
        watch(page, `a free designer meeting the locked ${lib.name} cards at ${width}px`)
        await signIn(page, { plan: 'free' })
        await go(page, lib.route)
        const grid = page.locator(lib.grid)
        await grid.scrollIntoViewIfNeeded()
        await expect(grid.locator(':scope > .lockt-card').first()).toBeVisible()
        const r = await lockedRows(page, lib.grid)
        expect(r.count, 'locked cards on the page').toBeGreaterThan(1)
        for (const row of r.rows) {
          expect(Math.abs(row.right - r.gridRight), `a row of ${row.cards} locked card(s) stops ${Math.round(r.gridRight - row.right)}px short of the grid edge`).toBeLessThanOrEqual(1)
        }
        await page.screenshot({ path: `${SHOTS}/${lib.route.split('/').pop()}-locked-${width}.png` })
      })
    }
  })
}

test.describe('Palette stripes at 390px', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

  test('the stripes end in a hairline, so a white last swatch is not a hole', async ({ page }) => {
    watch(page, 'someone browsing the palette library on a phone')
    await go(page, '/discover/palettes')
    const stripes = page.locator('.pgal-card .pgal-stripes').first()
    await expect(stripes).toBeVisible()
    const edge = await stripes.evaluate((el) => {
      const cs = getComputedStyle(el)
      return { width: parseFloat(cs.borderBottomWidth), style: cs.borderBottomStyle, colour: cs.borderBottomColor }
    })
    expect(edge.width, 'hairline width').toBeGreaterThanOrEqual(1)
    expect(edge.style, 'hairline style').toBe('solid')
    expect(edge.colour, 'hairline is drawn, not transparent').not.toMatch(/rgba\(0, 0, 0, 0\)|transparent/)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 3 · Emoji Library toolbar: no sideways chip row, a placeholder that fits
// ─────────────────────────────────────────────────────────────────────────────

for (const theme of ['light', 'dark']) {
  for (const width of [320, 390]) {
    test.describe(`Emoji toolbar at ${width}px, ${theme}`, () => {
      test.use({ viewport: { width, height: 844 }, hasTouch: true, isMobile: true, colorScheme: theme })

      test('the categories sit in the Filters sheet, not a sideways chip row', async ({ page }) => {
        watch(page, 'someone choosing an emoji category on a phone')
        await go(page, '/create/emoji')
        const filters = page.locator('.lbry-toolbar .lbry-filtersbtn')
        await expect(filters).toBeVisible({ timeout: 15_000 })
        const bar = await page.evaluate(() => {
          const scrolls = [...document.querySelectorAll('.lbry-toolbar *')]
            .filter((el) => el.scrollWidth > el.clientWidth + 1 && ['auto', 'scroll'].includes(getComputedStyle(el).overflowX))
            .map((el) => el.className)
          return {
            quick: document.querySelectorAll('.lbry-toolbar-quick').length,
            chipsOnRow: document.querySelectorAll('.lbry-toolbar .lbry-filter').length,
            scrolls,
            pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          }
        })
        expect(bar.quick, 'a sideways chip row is back').toBe(0)
        expect(bar.chipsOnRow, 'category chips sit on the toolbar row').toBe(0)
        expect(bar.scrolls, 'something in the toolbar scrolls sideways').toEqual([])
        expect(bar.pageOverflow, 'the page scrolls sideways').toBeLessThanOrEqual(1)
        await filters.click()
        const sheet = page.locator('.lbry-sheet')
        await expect(sheet.locator('.lbry-filter')).toHaveCount(12)
        // Choosing one closes nothing by itself; Done does, and the button then counts the pick.
        await sheet.locator('.lbry-filter', { hasText: 'Smileys' }).click()
        await sheet.getByRole('button', { name: 'Done' }).click()
        await expect(sheet).toBeHidden()
        await expect(filters.locator('.lbry-filtersbtn-count')).toHaveText('1')
        await page.screenshot({ path: `${SHOTS}/emoji-toolbar-${width}-${theme}.png` })
      })

      test('the search placeholder fits its field', async ({ page }) => {
        watch(page, 'someone reading the emoji search field on a phone')
        await go(page, '/create/emoji')
        const input = page.locator('.lbry-toolbar .lbry-search input')
        await expect(input).toBeVisible({ timeout: 15_000 })
        const fit = await input.evaluate((el) => {
          const cs = getComputedStyle(el)
          const ctx = document.createElement('canvas').getContext('2d')
          ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
          const room = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
          return { text: el.placeholder, need: ctx.measureText(el.placeholder).width, room }
        })
        expect(fit.need, `"${fit.text}" needs ${Math.round(fit.need)}px of the ${Math.round(fit.room)}px in the field`).toBeLessThanOrEqual(fit.room)
      })
    })
  }
}

test.describe('Emoji toolbar at 768px', () => {
  test.use({ viewport: { width: 768, height: 900 } })

  test('the category facet is one trigger and nothing scrolls sideways', async ({ page }) => {
    watch(page, 'someone choosing an emoji category on a tablet')
    await go(page, '/create/emoji')
    await expect(page.locator('.lbry-filtertrig')).toHaveCount(1, { timeout: 15_000 })
    expect(await page.locator('.lbry-toolbar-quick').count(), 'a sideways chip row is back').toBe(0)
    expect(await page.locator('.lbry-toolbar .lbry-filter').count(), 'category chips sit on the toolbar row').toBe(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1)
  })
})
