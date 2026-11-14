// SPEC 275: THREE SMALL FIXES TO THE CREATE TOOLS AND LIBRARIES.
//
//   1. Gradient tool: at 360px and under a free account still sees a visible
//      "Pro" on the Selected stop's Tints button, the hex field shows its whole
//      value, and a finger still gets a 44px target.
//   2. Palette and Gradient libraries, signed in on a free plan: the faded cards
//      behind the end gate never leave a lone card beside an empty cell at 768 (nor at any
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
//   - GalleryEndGate.jsx: have GateFadeRows read `cols` as a fixed 3 instead of the
//     live grid's column count: "the faded cards share their rows" fails at the
//     widths whose grid is not three columns, on both libraries;
//   - library-v3.css: set the `.vpt` padding to 0: "the bands sit in a drawn
//     frame" fails;
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

// Every row of the faded cards under the end gate ends where the live grid ends:
// a row whose last card stops short leaves an empty cell beside it. The faded
// cards are the gallery's own card (neutral stand-ins here, a free account), in
// two `.geg-row` grids. The fade clips the second row part-way, so the rows are
// read from the DOM rather than from what shows.
const lockedRows = (page, card) => page.evaluate((sel) => {
  const fade = document.querySelector('.geg-fade')
  if (!fade) return null
  const live = [...document.querySelectorAll(sel)].filter((c) => !c.closest('.geg-fade')).map((c) => c.getBoundingClientRect())
  const rows = [...fade.querySelectorAll('.geg-row')].map((row) => {
    const cards = [...row.querySelectorAll(sel)].map((c) => c.getBoundingClientRect())
    return { cards: cards.length, right: Math.max(...cards.map((r) => r.right)) }
  })
  return {
    count: rows.reduce((n, row) => n + row.cards, 0),
    gridRight: Math.max(...live.map((r) => r.right)),
    rows,
  }
}, card)

const LOCKED_LIBRARIES = [
  // Both libraries browse in the vertical panel tile (VerticalPanelTile.jsx) since #1043.
  { name: 'Palette Library', route: '/discover/palettes', card: '.vpt' },
  { name: 'Gradient Library', route: '/discover/gradients', card: '.vpt' },
]

for (const width of [390, 600, 768, 1024, 1440]) {
  test.describe(`Faded gallery cards at ${width}px`, () => {
    test.use({ viewport: { width, height: 900 }, hasTouch: width < 800, isMobile: width < 800 })

    for (const lib of LOCKED_LIBRARIES) {
      test(`${lib.name}: the faded cards share their rows, no empty cell`, async ({ page }) => {
        watch(page, `a free designer meeting the ${lib.name} end gate at ${width}px`)
        await signIn(page, { plan: 'free' })
        await go(page, lib.route)
        const fade = page.locator('.geg-fade')
        await fade.scrollIntoViewIfNeeded()
        await expect(fade.locator(lib.card).first()).toBeVisible()
        const r = await lockedRows(page, lib.card)
        expect(r.count, 'faded cards').toBeGreaterThan(1)
        expect(r.rows.length, 'the faded cards draw two rows').toBe(2)
        for (const row of r.rows) {
          expect(Math.abs(row.right - r.gridRight), `a row of ${row.cards} faded card(s) stops ${Math.round(r.gridRight - row.right)}px short of the live grid edge`).toBeLessThanOrEqual(1)
        }
        await page.screenshot({ path: `${SHOTS}/${lib.route.split('/').pop()}-end-gate-${width}.png` })
      })
    }
  })
}

test.describe('Palette stripes at 390px', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

  // V3 (#1043): the bands sit inside the tile's raised frame with 8px of padding,
  // so a white last band ends against the frame, not the page. The frame is the edge.
  test('the bands sit in a drawn frame, so a white last swatch is not a hole', async ({ page }) => {
    watch(page, 'someone browsing the palette library on a phone')
    await go(page, '/discover/palettes')
    const media = page.locator('.vpt .vpt-media').first()
    await expect(media).toBeVisible()
    const edge = await media.evaluate((el) => {
      const frame = el.closest('.vpt')
      const cs = getComputedStyle(frame)
      const f = frame.getBoundingClientRect()
      const m = el.getBoundingClientRect()
      return { pad: Math.round(m.left - f.left), below: Math.round(f.bottom - m.bottom), bg: cs.backgroundColor }
    })
    expect(edge.pad, 'the bands are inset in the frame').toBeGreaterThanOrEqual(8)
    expect(edge.below, 'the frame continues under the bands').toBeGreaterThanOrEqual(8)
    expect(edge.bg, 'the frame is drawn, not transparent').not.toMatch(/rgba\(0, 0, 0, 0\)|transparent/)
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
      // V3: the unwritten topics are the list items of .lidx-soon-list (surface.css), not .lidx-card--soon cards.
      const rows = page.locator('.lidx-soon')
      await expect(rows.first()).toBeVisible()
      expect(await rows.count(), 'unwritten topics').toBeGreaterThan(0)
      await expect(page.locator('#surface-grid-heading ~ .srf-lede')).toHaveText("These topics aren't written yet.")
      const facts = await rows.evaluateAll((els) => els.map((el) => {
        const cs = getComputedStyle(el)
        const r = el.getBoundingClientRect()
        return {
          tag: el.tagName,
          // A hairline between rows is the list's own; a box (left, right or foot edge) would make it a card again.
          border: parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth) + parseFloat(cs.borderBottomWidth),
          linked: !!el.closest('a') || !!el.querySelector('a'),
          arrow: !!el.querySelector('.lidx-go'),
          time: el.querySelector('.srf-meta')?.textContent,
          title: !!el.querySelector('.lidx-soon-t')?.textContent,
          dek: !!el.querySelector('.lidx-soon-d')?.textContent,
          top: Math.round(r.top),
          left: Math.round(r.left),
        }
      }))
      for (const f of facts) {
        expect(f.tag, 'a link or button stands in for a plain row').toBe('LI')
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
