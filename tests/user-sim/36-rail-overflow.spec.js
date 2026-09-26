// The shared horizontal-rail affordance, and the two "shipped broken" defects
// that earned it a test file of its own.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY THESE ASSERTIONS ARE ABOUT REACHABILITY, NOT ABOUT CSS
// ─────────────────────────────────────────────────────────────────────────────
// Nine rails in global.css were `overflow-x:auto` with the scrollbar deleted on
// BOTH `scrollbar-width` and `::-webkit-scrollbar`. Every one of them passed
// every test the suite had, because nothing in the DOM changes when content
// slides past a clipped edge: `innerText` still reads "Randomise", the button is
// still focusable, the accessible name is still right, and a screen reader is
// entirely unaffected. Only a sighted user loses the control.
//
// So a test that asserts "the element exists" is worth nothing here. What these
// assert is where the painted box actually sits relative to the box that clips
// it, and — for the shared utility — whether the affordance that says "there is
// more" is switched on when there is, and off when there is not.
//
// The two pins:
//
//   A2  /plans at 390px. `.plans-compare-table{min-width:520px}` inside a 358px
//       box put the ENTIRE Pro column 162px past the right edge. A shopper read
//       what Free gives them and never saw a single Pro value, on the page whose
//       whole job is to sell Pro. The fix is not a better hint — the table fits
//       now — so the assertion is that no gesture is needed at all.
//
//   A4  /create/palette at 834px. The action ribbon opened on Image / Explore /
//       Preview and put "Randomise" 560px past the right edge: 7 of 11 controls
//       off-screen, including the tool's primary action and the one that owns
//       the Space-bar shortcut. `.plb-random{order:-1}` existed for ≤768px and
//       was never extended to the 769–960 band.
import { test, expect } from './base.js'
import { go, expectRendered, watch } from './helpers.js'

const PHONE = { width: 390, height: 844 }
const TABLET = { width: 834, height: 1112 }
const DESKTOP = { width: 1440, height: 900 }


test.describe('the Pro column is reachable on a phone (A2)', () => {
  test.use({ viewport: PHONE })

  test('every Pro value is inside the viewport at 390px, with no gesture', async ({ page }) => {
    watch(page, 'someone deciding whether to pay, on their phone')
    await go(page, '/plans')
    await expectRendered(page)
    // The design's comparison stacks each row below 760px, the
    // way the design does, so the table itself is the box that must not scroll.
    await expect(page.locator('.pr-compare')).toBeVisible()

    const report = await page.evaluate(() => {
      const wrap = document.querySelector('.pr-compare')
      const vw = document.documentElement.clientWidth
      const cells = [...document.querySelectorAll('.pr-compare td.is-pro')]
      return {
        // The table needs no horizontal scroll at all any more.
        needsScroll: wrap.scrollWidth > wrap.clientWidth + 1,
        proCells: cells.length,
        // A cell whose right edge is past the viewport, or past the box that
        // clips it, is a value the reader cannot see.
        offscreen: cells
          .map((c) => ({ text: c.textContent.trim(), right: Math.round(c.getBoundingClientRect().right) }))
          .filter((c) => c.right > Math.min(vw, Math.round(wrap.getBoundingClientRect().right)) + 1),
        // …and one clipped to nothing is just as unreadable.
        collapsed: cells.filter((c) => c.getBoundingClientRect().width < 40).length,
      }
    })

    expect(report.proCells, 'the comparison table should still have Pro cells to check').toBeGreaterThan(5)
    expect(report.needsScroll, 'the plans table should not need a horizontal gesture at 390px').toBe(false)
    expect(report.offscreen, 'Pro values sitting past the right edge').toEqual([])
    expect(report.collapsed, 'Pro cells crushed too narrow to read').toBe(0)
  })
})

test.describe('the primary action is reachable on a tablet (A4)', () => {
  test.use({ viewport: TABLET })

  // The drawn toolbar is one row that never scrolls: what does
  // not fit goes to the Tools overflow, lowest priority first. Randomise is
  // the page's own action, so at 834px it is on the row, whole, at rest.
  test('Randomise is fully visible on the toolbar row at 834px', async ({ page }) => {
    watch(page, 'a designer opening Palette Builder on an iPad')
    await go(page, '/create/palette')
    await expectRendered(page)
    const bar = page.locator('.plb [data-tool-toolbar]')
    await expect(bar).not.toHaveClass(/is-measuring/)
    const random = bar.locator('.plb-random')
    await expect(random).toBeVisible()

    const report = await random.evaluate((btn) => {
      const row = btn.closest('[data-tool-toolbar]')
      const g = row.getBoundingClientRect()
      const b = btn.getBoundingClientRect()
      return {
        barScrolls: row.scrollWidth > row.clientWidth + 1,
        insideAtRest: b.left >= g.left - 1 && b.right <= g.right + 1 && b.right <= document.documentElement.clientWidth,
        btn: { left: Math.round(b.left), right: Math.round(b.right) },
        bar: { left: Math.round(g.left), right: Math.round(g.right) },
      }
    })
    expect(report.barScrolls, 'the toolbar is a row, never a scroller').toBe(false)
    expect(
      report.insideAtRest,
      `Randomise must be visible without swiping: button ${JSON.stringify(report.btn)} vs toolbar ${JSON.stringify(report.bar)}`,
    ).toBe(true)
  })
})

//   A6  /create/gradient at 1440px. The preset strip is sixteen named gradients
//       in one `grid-auto-flow:column` row: 2422px of tiles inside a 1142px box,
//       so SEVEN showed and 1280px of library sat behind the 34px fade with no
//       scrollbar - on a page that had ~300px of empty ground under the card.
//       Wrapping is the fix rather than a fourth affordance, so, as with A2, the
//       assertion is that no gesture is needed at all.
test.describe('the whole preset library is on screen on a desktop (A6)', () => {
  test.use({ viewport: DESKTOP })

  test('all sixteen gradient presets are visible at 1440px, with no gesture', async ({ page }) => {
    watch(page, 'a designer picking a gradient on a laptop')
    await go(page, '/create/gradient')
    await expectRendered(page)
    await expect(page.locator('.grd-preset-grid')).toBeVisible()

    const report = await page.evaluate(() => {
      const rail = document.querySelector('.grd-preset-grid')
      const box = rail.getBoundingClientRect()
      const cs = getComputedStyle(rail)
      const tiles = [...rail.children]
      return {
        total: tiles.length,
        needsScroll: rail.scrollWidth > rail.clientWidth + 1,
        // A fade is a claim that there is more. There is not, so it must be off.
        masked: (cs.maskImage || 'none') !== 'none',
        rows: new Set(tiles.map((t) => Math.round(t.getBoundingClientRect().top))).size,
        offscreen: tiles
          .map((t) => ({ name: t.textContent.trim(), right: Math.round(t.getBoundingClientRect().right) }))
          .filter((t) => t.right > Math.round(box.right) + 1),
      }
    })

    expect(report.total, 'the curated set should still be sixteen presets').toBeGreaterThanOrEqual(16)
    expect(report.needsScroll, 'the preset library should not need a horizontal gesture at 1440px').toBe(false)
    expect(report.masked, 'a set that fits must not claim there is more behind a fade').toBe(false)
    expect(report.offscreen, 'presets sitting past the right edge').toEqual([])
    expect(report.rows, 'sixteen presets should wrap into rows, not run off in one').toBeGreaterThan(1)
  })
})

test.describe('the shared rail affordance', () => {
  // One rail per shape: a preset gallery and a control ribbon.
  //
  // ── DELETED: 'home workbench tabs' (`/`, `.hw-tabs`, PHONE) ───────────────
  // What it guarded: the shared rail affordance in its TAB-STRIP shape — a
  // horizontal scroller that must keep a real scrollbar, carry the edge fade
  // while there is more to the right, and drop the fade at the end.
  //
  // Why it is gone: the home workbench is gone. `/` and `/home` render
  // src/pages/Spectrum.jsx since the route swap and src/pages/Home.jsx is
  // deleted, taking HomeWorkbench and its `.hw-tabs` strip with it — measured
  // on the built front door, `.hw-tabs` has count 0. There is no tab strip on
  // any surface to re-point it at; Spectrum's `.sp-tabs--chips` is a
  // role="group" of chips that switches a grid, not a scroller.
  //
  // Where the guarantee still lives: the affordance itself is ONE shared
  // implementation, and the two rails below exercise it end to end — the same
  // `--rail-l`/`--rail-r` custom properties, the same mask, the same
  // scrollbar-width rule — at a phone width and a tablet width. What is lost is
  // only the third SHAPE, not the contract. If a tab strip comes back on any
  // route, it belongs in this list.
  // ── DELETED: 'palette action ribbon' and 'gradient preset rail' ─────────
  // Both rails went with the rebuild to the design's drawn screens: the
  // palette toolbar is one row with an overflow and the gradient
  // presets a wrapping grid (D:79-81). No colour tool ships a scrolling rail
  // now, so the positive case of the shared affordance (fade while there is
  // more, withdrawn at the end) has no subject here; the counter-case below
  // still holds its other half.

  // ── DELETED: 'a rail that fits claims nothing — the palette ribbon' ─────
  // Its subject, `.plb-toolbar-group.rail-overflow`, went with the palette's
  // move onto the shared one-row tool toolbar, and no rail renders at 1440 on
  // any tool route now. 100-tool-toolbar-one-row holds the toolbar instead.
  test('no colour tool ships a scrolling rail', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    watch(page, 'a designer on a laptop, looking at the palette actions')
    await go(page, '/create/palette')
    await expectRendered(page)
    await expect(page.locator('.rail-overflow')).toHaveCount(0)
  })
})

test.describe('the journey can be finished, and undone, on a touch device (A5)', () => {
  // The 2026-09-03 audit measured the palette action ribbon at four touch
  // widths and found Save / export off the right edge at EVERY one of them,
  // with Undo and Reset alongside it. Save is the only route from a finished
  // palette to a file, and Undo is how a mis-tap is taken back.
  //
  // The drawn toolbar keeps them on its one row by priority: Save current is
  // the primary and never leaves the row, undo/redo are the last actions to
  // go, then Randomise. Reset palette is a Tools row, one named tap away with
  // no swipe. What is asserted is exactly that, at the audit's widths.
  const ON_ROW = [
    ['Randomise', '.plb-random'],
    ['Undo', '.plb-undo'],
    ['Redo', '.plb-redo'],
    ['Save current', '.plb-save'],
  ]

  for (const width of [390, 640, 641, 834]) {
    test(`Save, Undo and Randomise need no swipe, and Reset is one named tap, at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: width < 700 ? 844 : 1112 })
      watch(page, `someone finishing a palette on a ${width}px screen`)
      await go(page, '/create/palette')
      await expectRendered(page)
      const bar = page.locator('.plb [data-tool-toolbar]')
      await expect(bar).not.toHaveClass(/is-measuring/)

      const report = await bar.evaluate((el, pairs) => {
        const vw = document.documentElement.clientWidth
        const out = {}
        for (const [name, sel] of pairs) {
          const btn = el.querySelector(sel)
          if (!btn || btn.offsetParent === null) { out[name] = { missing: true }; continue }
          const b = btn.getBoundingClientRect()
          out[name] = { inside: b.left >= -1 && b.right <= vw + 1 && b.width > 0, box: [Math.round(b.left), Math.round(b.right)] }
        }
        return { vw, controls: out, scrolls: el.scrollWidth > el.clientWidth + 1 }
      }, ON_ROW)

      expect(report.scrolls, 'the toolbar is a row, never a scroller').toBe(false)
      for (const [name] of ON_ROW) {
        const c = report.controls[name]
        expect(c.missing, `${name} should be on the toolbar row at ${width}px`).toBeFalsy()
        expect(c.inside, `${name} must be whole on screen at ${width}px: ${JSON.stringify(c.box)} of ${report.vw}`).toBe(true)
      }

      // Reset: the overflow names it, and pressing it resets.
      const before = await page.locator('.plb-col .plb-hex').allTextContents()
      await bar.getByRole('button', { name: 'Tools' }).click()
      await page.getByRole('dialog', { name: 'Tools' }).getByRole('button', { name: 'Reset palette' }).click()
      await expect.poll(async () => (await page.locator('.plb-col .plb-hex').allTextContents()).join()).not.toBe(before.join())
    })
  }

  test('the icon-only controls keep their accessible names on a phone', async ({ page }) => {
    // Below 768px the row's buttons drop their words for their icons, which is
    // what buys the room. That trades a visible word for a visible BUTTON and
    // must not trade away the name a screen reader reads.
    await page.setViewportSize({ width: 390, height: 844 })
    watch(page, 'a screen-reader user on a phone')
    await go(page, '/create/palette')
    await expectRendered(page)
    const bar = page.locator('.plb [data-tool-toolbar]')
    await expect(bar).not.toHaveClass(/is-measuring/)

    for (const name of ['Undo', 'Redo', 'Randomise', 'Tools', 'Save current']) {
      await expect(bar.getByRole('button', { name, exact: true })).toHaveCount(1)
    }
    const labelHidden = await bar.evaluate((el) => ({
      randomise: getComputedStyle(el.querySelector('.plb-random .tl-btn-label')).display,
      tools: getComputedStyle(el.querySelector('.tl-more-btn .tl-btn-label')).display,
    }))
    expect(labelHidden.randomise, 'Randomise should be icon-only at 390px').toBe('none')
    expect(labelHidden.tools, 'Tools should be icon-only at 390px').toBe('none')
  })
})
