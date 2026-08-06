// Regression coverage for the second founder-reported Palette Builder batch.
//
// Same rule as batch 1 (14-founder-batch-regressions.spec.js): each of these
// shipped once because nothing measured the RENDERED result. These tests
// measure the rendered result.
import { test, expect } from '@playwright/test'
import { go, watch } from './helpers.js'

/** Move the pointer well clear of the toolbar so the next hover is a real
 *  enter, and any label opened by the previous hover has collapsed again.
 *  Hovering straight from one expanding button to the next races the layout
 *  shift the expansion itself causes. */
async function leaveToolbar(page) {
  await page.mouse.move(700, 600)
  await page.waitForTimeout(320)   // > --dur-3 (280ms), so the collapse finishes
}

/** Geometry of one icon button and its label, in viewport coordinates. */
function measureIconButton(button) {
  return button.evaluate((el) => {
    const inner = el.querySelector('.plb-lbl-i')
    const b = el.getBoundingClientRect()
    const i = inner.getBoundingClientRect()
    return {
      button: { left: b.left, right: b.right, top: b.top, bottom: b.bottom, width: b.width },
      label: { left: i.left, right: i.right, top: i.top, bottom: i.bottom, width: i.width },
      natural: inner.scrollWidth,
      opacity: Number(getComputedStyle(el.querySelector('.plb-lbl')).opacity),
      position: getComputedStyle(el.querySelector('.plb-lbl')).position,
    }
  })
}

/* ── 1 · The toolbar label slides open INSIDE the button ──────────────────────
 * Founder: "they should slide open to show the text and it should be in the
 * same box, not hovering over the top."
 * Was: the label was position:absolute with only `left` set, so it painted
 * OUTSIDE the button's layout box, over whatever sat beside it. #202 fixed the
 * related sizing fault (width:max-content) but left the overlay in place. */

test.describe('Palette Builder · toolbar labels expand the button', () => {
  test('the button itself grows and the label lands inside its bounding box', async ({ page }) => {
    watch(page, 'designer exploring the toolbar')
    await go(page, '/color/palette')

    const button = page.getByRole('button', { name: 'Preview' })
    await expect(button).toBeVisible()

    const collapsed = await measureIconButton(button)
    // In FLOW, not painted over the top. This single assertion is the fix.
    expect(collapsed.position, 'the label is in the button\'s normal flow').toBe('static')
    expect(collapsed.label.width, 'collapsed to nothing').toBeLessThan(1)
    expect(collapsed.natural, 'the label has real text to reveal').toBeGreaterThan(10)

    await leaveToolbar(page)
    await button.hover()
    await expect.poll(async () => (await measureIconButton(button)).opacity, { timeout: 4000 }).toBe(1)
    const open = await measureIconButton(button)

    // The BOX grew — it did not stay a fixed 36px footprint with a pill hanging
    // off the side of it.
    expect(open.button.width, 'the button expanded').toBeGreaterThan(collapsed.button.width + 20)

    // …and the label is inside that box on every edge. This is what "in the
    // same box, not hovering over the top" means, measured.
    expect(open.label.left).toBeGreaterThanOrEqual(open.button.left - 0.5)
    expect(open.label.right).toBeLessThanOrEqual(open.button.right + 0.5)
    expect(open.label.top).toBeGreaterThanOrEqual(open.button.top - 0.5)
    expect(open.label.bottom).toBeLessThanOrEqual(open.button.bottom + 0.5)

    // The easing runs to the label's REAL width, not an invented ceiling —
    // that is what makes the curve read correctly (css-conventions → Motion).
    expect(Math.abs(open.label.width - collapsed.natural)).toBeLessThanOrEqual(1)
  })

  test('every icon button expands in place, on hover and on keyboard focus', async ({ page }) => {
    watch(page, 'keyboard user in the toolbar')
    await go(page, '/color/palette')
    await expect(page.getByRole('button', { name: 'Preview' })).toBeVisible()

    const buttons = page.locator('.plb-icobtn:visible')
    const count = await buttons.count()
    expect(count).toBeGreaterThan(3)

    for (let i = 0; i < count; i++) {
      const b = buttons.nth(i)
      const name = (await b.getAttribute('aria-label')) || `button ${i}`
      const collapsed = await measureIconButton(b)

      await leaveToolbar(page)
      await b.hover()
      await expect
        .poll(async () => (await measureIconButton(b)).opacity, { timeout: 4000, message: `${name} must reveal its label` })
        .toBe(1)

      const open = await measureIconButton(b)
      expect(open.label.width, `${name}: real text, not a 0px track`).toBeGreaterThan(10)
      expect(open.button.width, `${name}: the button grew`).toBeGreaterThan(collapsed.button.width)
      expect(open.label.left, `${name}: label starts inside the button`).toBeGreaterThanOrEqual(open.button.left - 0.5)
      expect(open.label.right, `${name}: label ends inside the button`).toBeLessThanOrEqual(open.button.right + 0.5)
    }

    // Keyboard focus opens it the same way — the label is the button's only
    // visible name, so a keyboard user must not be left with a bare icon.
    await leaveToolbar(page)
    const first = buttons.first()
    await first.focus()
    await expect.poll(async () => (await measureIconButton(first)).label.width, { timeout: 4000 }).toBeGreaterThan(10)
    const focused = await measureIconButton(first)
    expect(focused.label.right).toBeLessThanOrEqual(focused.button.right + 0.5)
  })

  test('an expanding label never pushes the page into horizontal overflow', async ({ page }) => {
    watch(page, 'designer on a small laptop')
    await go(page, '/color/palette')
    await expect(page.getByRole('button', { name: 'Preview' })).toBeVisible()

    for (const width of [1440, 1100, 981, 961]) {
      await page.setViewportSize({ width, height: 900 })
      await page.waitForTimeout(250)
      await leaveToolbar(page)
      const widest = page.getByRole('button', { name: 'Save / export' })
      await widest.hover()
      await expect.poll(async () => (await measureIconButton(widest)).opacity, { timeout: 4000 }).toBe(1)
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(overflow, `no horizontal overflow at ${width}px`).toBeLessThanOrEqual(0)
    }
  })

  test('below 961px every label is pinned open inside its own button', async ({ page }) => {
    watch(page, 'designer on a tablet and a phone')
    await go(page, '/color/palette')
    await expect(page.getByRole('button', { name: 'Preview' })).toBeVisible()

    // Below 961px the toolbar's action group is a horizontal scroller, so the
    // labels stop being a hover reveal and stay open — hover is unreliable at
    // these widths (touch has none) and a reveal that widens its own button
    // fights the scroll position under the pointer. This was ALSO the
    // toolbar-label-clipping report: the old absolutely-positioned label sat
    // outside the button box, and a scroll container clips on both axes.
    for (const width of [960, 900, 800, 768, 700, 480, 380, 320]) {
      // Load AT the width rather than resizing into it: this is how a phone or
      // tablet actually arrives, and it does not depend on the engine's
      // incremental relayout after a viewport change.
      await page.setViewportSize({ width, height: 900 })
      await go(page, '/color/palette')
      await expect(page.locator('.plb-icobtn').first()).toBeVisible()
      const state = await page.evaluate(() => {
        const rows = [...document.querySelectorAll('.plb-icobtn')].map((el) => {
          const inner = el.querySelector('.plb-lbl-i')
          const b = el.getBoundingClientRect()
          const i = inner.getBoundingClientRect()
          return {
            name: el.getAttribute('aria-label'),
            width: i.width,
            natural: inner.scrollWidth,
            inside: i.left >= b.left - 0.5 && i.right <= b.right + 0.5,
          }
        })
        return {
          rows,
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        }
      })
      expect(state.rows.length).toBeGreaterThan(3)
      for (const row of state.rows) {
        expect(row.width, `${width}px · ${row.name}: label is open at its real width`)
          .toBeGreaterThanOrEqual(row.natural - 1)
        expect(row.inside, `${width}px · ${row.name}: label is inside its button, not clipped beside it`).toBe(true)
      }
      expect(state.overflow, `no horizontal overflow at ${width}px`).toBeLessThanOrEqual(0)
    }
  })
})
