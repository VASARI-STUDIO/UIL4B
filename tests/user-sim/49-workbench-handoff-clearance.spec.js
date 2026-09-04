// THE HAND-OFF MAY NOT OVERLAY THE ZONE IT LIVES IN.
//
// #341 pinned the "Continue in ..." hand-off to the bottom of the workbench
// with `position:sticky;bottom:0` as the LAST CHILD of `.hw-controls` — the
// only zone in the panel that scrolls. A sticky element inside its own
// scroller covers the bottom N px of that scroller at every scroll position
// except the very end, so whatever control lands there is painted over.
//
// Nothing caught it because the control is still REACHABLE BY SCROLLING, and
// because the obvious probe agrees with the bug: `scrollIntoView` with
// `block:"nearest"` stops as soon as the element is inside the scrollport,
// and the scrollport INCLUDES the strip under the foot. Playwright’s own
// actionability scrolls exactly that way, which is why #262 met this as four
// hard click failures rather than as a cosmetic note.
//
// MEASURED ON main AT 1440x900 BEFORE THE FIX, against #262’s 760px frame:
// Typography’s "Continue with this live scale" occupied 790.2–844.2 with the
// foot’s top at 784, and `document.elementFromPoint` at the link’s own centre
// returned `hw-foot-note`. So it was live on main, not theoretical — the
// backlog note claiming it no longer reproduced was out of date.
//
// WHAT THIS ASSERTS, AND WHY IT IS THE STRUCTURAL FORM.
// Not "the Generate button is clickable at 1440x900" — that is one instance of
// the class, and it passes again the moment a frame bound is raised, which is
// exactly how this got closed once already. The invariant is that THE FOOT AND
// THE SCROLLPORT DO NOT INTERSECT, in every mode. If they do not overlap, no
// scroll position and no future control can put one behind the other, and the
// class is retired rather than moved.
//
// Backlog: workbench-handoff-overlays-controls.
import { test, expect } from './base.js'
import { go, expectRendered, watch } from './helpers.js'

const DESKTOP = { width: 1440, height: 900 }

// The sticky rail is @media(min-width:981px); below that the panel is a normal
// block and there is no scrollport to overlay.
const geometry = (page) => page.evaluate(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
  // Inactive modes stay mounted under display:none, where every rect is zero.
  const visible = (el) => el && el.offsetParent !== null
  const rows = []
  document.querySelector('.hsteps-sticky').scrollIntoView({ block: 'center' })
  await sleep(500)
  const restingY = scrollY
  for (const tab of [...document.querySelectorAll('.hsteps-sticky .hw-tab')].filter(visible)) {
    tab.click()
    await sleep(350)
    // Selecting a tab must not be charged to the scroll narrative, which would
    // swap the mode back out from under the measurement.
    scrollTo(0, restingY)
    await sleep(80)
    const zone = [...document.querySelectorAll('.hsteps-sticky .hw-controls')].filter(visible)[0]
    const foot = [...document.querySelectorAll('.hsteps-sticky .hw-foot')].filter(visible)[0]
    if (!zone || !foot) continue
    const z = zone.getBoundingClientRect()
    const f = foot.getBoundingClientRect()
    rows.push({
      mode: tab.textContent.trim(),
      footInsideScroller: zone.contains(foot),
      overlap: +Math.max(0, Math.min(z.bottom, f.bottom) - Math.max(z.top, f.top)).toFixed(1),
    })
  }
  return rows
})

test.describe('the workbench hand-off never covers its own control zone', () => {
  test.use({ viewport: DESKTOP })

  test('in every mode, the hand-off is outside the scrolling zone, not pinned over it', async ({ page }) => {
    watch(page, 'a visitor working the homepage workbench')
    await go(page, '/')
    await expectRendered(page, 'the homepage')

    const rows = await geometry(page)
    expect(rows.length, 'no workbench mode was measured — the assertion would pass vacuously').toBeGreaterThanOrEqual(4)

    for (const row of rows) {
      expect(row.footInsideScroller,
        `${row.mode}: the hand-off is a child of .hw-controls again — a sticky last child `
        + `covers the bottom of the only zone that scrolls`).toBe(false)
      expect(row.overlap,
        `${row.mode}: the hand-off overlaps the control scrollport by ${row.overlap}px, so any `
        + `control that lands there is unclickable at every scroll position but the last`).toBe(0)
    }
  })
})
