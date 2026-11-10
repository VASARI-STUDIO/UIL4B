// SPEC 275: THREE SMALL FIXES TO THE CREATE TOOLS AND LIBRARIES.
//
//   1. Gradient tool: at 360px and under a free account still sees a visible
//      "Pro" on the Selected stop's Tints button, the hex field shows its whole
//      value, and a finger still gets a 44px target.
//   2. Palette and Gradient libraries, signed in on a free plan: the three locked
//      cards never leave a lone card beside an empty cell at 768 (nor at any
//      other width), and a near-white swatch has a hairline along the foot of its
//      stripes.
//   3. Learn hub: the unwritten topics are plain rows (title, summary, "Soon"),
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
//   - SurfaceIndex.jsx: render the Learn roadmap as `.surface-card` articles again
//     (or add a Link or `.lidx-go` to the row): "the unwritten topics are plain
//     rows" fails at all three widths; change the lede and it fails on the text.
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
// 2 · Pro libraries: the faded placeholder cells share their rows
// ─────────────────────────────────────────────────────────────────────────────

// Every row of the faded placeholder grid under the end gate ends where the grid
// ends: a row whose last cell stops short leaves an empty cell beside it. Only
// the rows the grid shows count (it is clipped to two).
const lockedRows = (page, gridSelector) => page.evaluate((sel) => {
  const grid = document.querySelector(sel)
  if (!grid) return null
  const box = grid.getBoundingClientRect()
  const cards = [...grid.querySelectorAll(':scope > .geg-ph')].map((c) => c.getBoundingClientRect())
    .filter((r) => r.top < box.bottom - 1)
  const rows = new Map()
  for (const r of cards) rows.set(Math.round(r.top), [...(rows.get(Math.round(r.top)) || []), r])
  return {
    count: cards.length,
    gridRight: box.right,
    rows: [...rows.values()].map((row) => ({ cards: row.length, right: Math.max(...row.map((r) => r.right)) })),
  }
}, gridSelector)

const LOCKED_LIBRARIES = [
  { name: 'Palette Library', route: '/discover/palettes', grid: '.geg-ph-grid' },
  { name: 'Gradient Library', route: '/discover/gradients', grid: '.geg-ph-grid' },
]

for (const width of [390, 600, 768, 1024, 1440]) {
  test.describe(`Faded placeholder rows at ${width}px`, () => {
    test.use({ viewport: { width, height: 900 }, hasTouch: width < 800, isMobile: width < 800 })

    for (const lib of LOCKED_LIBRARIES) {
      test(`${lib.name}: the faded cells share their rows, no empty cell`, async ({ page }) => {
        watch(page, `a free designer meeting the ${lib.name} end gate at ${width}px`)
        await signIn(page, { plan: 'free' })
        await go(page, lib.route)
        const grid = page.locator(lib.grid)
        await grid.scrollIntoViewIfNeeded()
        await expect(grid.locator(':scope > .geg-ph').first()).toBeVisible()
        const r = await lockedRows(page, lib.grid)
        expect(r.count, 'placeholder cells in the faded rows').toBeGreaterThan(1)
        expect(r.rows.length, 'the faded rows draw two rows').toBe(2)
        for (const row of r.rows) {
          expect(Math.abs(row.right - r.gridRight), `a row of ${row.cards} placeholder cell(s) stops ${Math.round(r.gridRight - row.right)}px short of the grid edge`).toBeLessThanOrEqual(1)
        }
        await page.screenshot({ path: `${SHOTS}/${lib.route.split('/').pop()}-end-gate-${width}.png` })
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
// 3 · Learn hub: the unwritten topics are plain rows
// ─────────────────────────────────────────────────────────────────────────────

// The roadmap is an admin-only sight (a visitor sees the guides alone).
for (const width of [390, 768, 1440]) {
  test.describe(`Learn hub Soon topics at ${width}px`, () => {
    test.use({ viewport: { width, height: 900 }, hasTouch: width < 800, isMobile: width < 800 })

    test('the unwritten topics are plain rows, one per line', async ({ page }) => {
      watch(page, `the founder reading the Learn hub at ${width}px`)
      await signIn(page, { admin: true })
      await go(page, '/learn')
      const rows = page.locator('.lidx-card--soon')
      await expect(rows.first()).toBeVisible()
      expect(await rows.count(), 'unwritten topics').toBeGreaterThan(0)
      await expect(page.locator('#surface-grid-heading ~ .srf-lede')).toHaveText("These topics aren't written yet.")
      const facts = await rows.evaluateAll((els) => els.map((el) => {
        const cs = getComputedStyle(el)
        const r = el.getBoundingClientRect()
        return {
          tag: el.tagName,
          border: parseFloat(cs.borderTopWidth) + parseFloat(cs.borderLeftWidth),
          linked: !!el.closest('a') || !!el.querySelector('a'),
          arrow: !!el.querySelector('.lidx-go'),
          time: el.querySelector('.lidx-time')?.textContent,
          title: !!el.querySelector('.lidx-title')?.textContent,
          dek: !!el.querySelector('.lidx-dek')?.textContent,
          top: Math.round(r.top),
          left: Math.round(r.left),
        }
      }))
      for (const f of facts) {
        expect(f.tag, 'a link or button stands in for a plain row').toBe('DIV')
        expect(f.border, 'the row has a border').toBe(0)
        expect(f.linked, 'the row is a link').toBe(false)
        expect(f.arrow, 'the row has an arrow').toBe(false)
        expect(f.time, 'Soon sits in the read-time slot').toBe('Soon')
        expect(f.title && f.dek, 'title and one-line summary').toBe(true)
      }
      expect(new Set(facts.map((f) => f.top)).size, 'two topics share a line, so a row is paired or orphaned').toBe(facts.length)
      expect(new Set(facts.map((f) => f.left)).size, 'rows start at different left edges').toBe(1)
      await rows.first().scrollIntoViewIfNeeded()
      await page.screenshot({ path: `${SHOTS}/learn-soon-${width}.png` })
    })
  })
}
