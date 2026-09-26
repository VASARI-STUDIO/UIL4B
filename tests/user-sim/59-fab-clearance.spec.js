// The floating Feedback button must not sit on top of the footer.
//
// `.global-feedback-btn` is `position:fixed` in the bottom-right corner. On a
// SHORT page the footer's own bottom edge IS the viewport's bottom edge, so the
// FAB lands on the last row of the footer — and a short page has nowhere to
// scroll to get out from under it.
//
// MEASURED on the 404 before the fix (2026-09-06 sweep, then confirmed
// point-by-point):
//
//   1440x900   .app-footer-attrib 1292.2..1393.9, FAB 1303..1420
//              9 of 9 sample points across the link returned the FAB
//              from elementFromPoint. scrollHeight === innerHeight: no scroll room.
//   981x900    the full 101.7px of the link overlapped. Also unscrollable.
//   1920x1080  the last tenth of the link was covered.
//
// So the attribution link on the 404 could not be reached by any means at all
// at 981 and 1440. The fix is clearance reserved INSIDE `.app-footer`, which is
// what makes it impossible rather than unlikely: the padding travels with the
// footer, so the last row can never come within the FAB's height of the
// document end, and the document end is the lowest the viewport can reach.
//
// The 404 is the right page to assert on because it is the SHORTEST page in the
// product, and shortness is the whole mechanism.
//
// `test` comes from ./base.js, not @playwright/test — that is where Google One
// Tap is stubbed on the browser fixture, and tests/unit/one-tap-stub.test.js
// fails the build for any spec that reaches past it.
import { test, expect } from './base.js'
import { go, watch, expectRendered } from './helpers.js'

const PERSONA = 'someone who followed a dead link and is looking for a way out'

// The widths the collision was measured at, plus 1080 tall where it also bit.
const CASES = [[981, 900], [1440, 900], [1920, 1080]]

// The site footer is on reading and legal pages only, and a 404 is neither, so
// the shortest footer page is /credits. The fault guarded is the same: the
// floating button sitting on the footer's last row of controls.
const FOOTER_ROUTE = '/credits'

test.describe('the feedback button never covers the footer', () => {
  for (const [width, height] of CASES) {
    test(`the shortest footer page stays pressable at ${width}x${height}`, async ({ page }) => {
      watch(page, PERSONA)
      await page.setViewportSize({ width, height })
      await go(page, FOOTER_ROUTE)
      await expectRendered(page)
      await page.evaluate(() => document.querySelector('.app-footer')?.scrollIntoView({ block: 'end', behavior: 'instant' }))
      await page.waitForFunction(() => {
        const de = document.scrollingElement || document.documentElement
        const k = `${de.scrollHeight}|${Math.round(window.scrollY)}`
        window.__f = window.__f || []
        window.__f.push(k)
        if (window.__f.length > 5) window.__f.shift()
        return window.__f.length === 5 && new Set(window.__f).size === 1
      }, null, { timeout: 10000, polling: 'raf' }).catch(() => {})
      await page.evaluate(() => { window.__f = null })

      const result = await page.evaluate(() => {
        const fab = document.querySelector('.global-feedback-btn')
        const controls = [...document.querySelectorAll('.app-footer-legal a, .app-footer-legal button')]
        const blocked = []
        for (const el of controls) {
          const r = el.getBoundingClientRect()
          if (r.width < 2 || r.height < 2) continue
          // Sample ACROSS the control, not just at its centre: the 1920 case
          // covered only the last tenth, which a centre-point check would have
          // called clean while a thumb aiming at the arrow glyph hit the FAB.
          const covered = []
          for (let i = 1; i <= 9; i++) {
            const x = r.left + (r.width * i) / 10
            const y = r.top + r.height / 2
            const top = document.elementFromPoint(x, y)
            if (top && top !== el && !el.contains(top) && fab && fab.contains(top)) covered.push(i)
          }
          if (covered.length) {
            blocked.push(`${el.tagName.toLowerCase()}.${(el.className || '').toString().split(/\s+/)[0]} "${(el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 30)}" — ${covered.length}/9 sample points return the feedback button`)
          }
        }
        const de = document.scrollingElement || document.documentElement
        return {
          fabPresent: !!fab,
          fabVisible: !!fab && getComputedStyle(fab).display !== 'none' && fab.getBoundingClientRect().width > 2,
          controlsExamined: controls.length,
          scrollRoom: de.scrollHeight - window.innerHeight,
          blocked,
        }
      })

      // ── Positive controls. "Nothing is covered" is trivially true when there
      //    is no FAB to cover anything, or no footer controls to be covered.
      expect(result.fabPresent, 'the feedback button is not on the page at all — this test would pass vacuously').toBe(true)
      expect(result.fabVisible, 'the feedback button is present but not rendered — this test would pass vacuously').toBe(true)
      expect(result.controlsExamined, 'the footer legal row exposed no controls — this test would pass vacuously')
        .toBeGreaterThan(1)

      expect(
        result.blocked,
        `the feedback button covers ${result.blocked.length} footer control(s) at ${width}x${height}, on a page with ${result.scrollRoom}px of scroll room:\n  ${result.blocked.join('\n  ')}`,
      ).toEqual([])
    })
  }

  test('the footer reserves real clearance below its last row', async ({ page }) => {
    // The tests above are absences and would also pass on a footer whose last
    // row had simply moved somewhere else. This states the mechanism: there is
    // at least the FAB's own height between the legal row and the end of the
    // document, so no viewport position can put one over the other.
    watch(page, PERSONA)
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, FOOTER_ROUTE)
    await expectRendered(page)

    const gap = await page.evaluate(() => {
      const footer = document.querySelector('.app-footer')
      const legal = document.querySelector('.app-footer-legal')
      const fab = document.querySelector('.global-feedback-btn')
      if (!footer || !legal || !fab) return null
      const f = footer.getBoundingClientRect()
      const l = legal.getBoundingClientRect()
      const fabBox = fab.getBoundingClientRect()
      return {
        belowLegal: Number((f.bottom - l.bottom).toFixed(1)),
        fabHeight: Number(fabBox.height.toFixed(1)),
        fabInset: Number((window.innerHeight - fabBox.bottom).toFixed(1)),
      }
    })

    expect(gap, 'the footer, its legal row or the feedback button is missing').not.toBeNull()
    // The FAB reaches `fabInset + fabHeight` up from the bottom of the viewport.
    const fabReach = gap.fabInset + gap.fabHeight
    expect(
      gap.belowLegal,
      `the footer leaves ${gap.belowLegal}px below its legal row, but the feedback button reaches ${fabReach}px up from the bottom of the viewport — on a short page it lands on that row`,
    ).toBeGreaterThanOrEqual(fabReach)
  })
})
