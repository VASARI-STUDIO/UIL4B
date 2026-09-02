// The 641–980px band, walked toolbar by toolbar.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY THIS FILE EXISTS AT ALL
// ─────────────────────────────────────────────────────────────────────────────
// The 2026-09-01 audit that produced this work ran an automated geometry sweep
// FIRST and it came back completely clean. Every toolbar reported zero controls
// outside its own box at 834px, on every surface. Nothing was clipped, nothing
// overlapped, nothing overflowed the viewport — and the band was still wrong on
// six surfaces. Only the renders showed it.
//
// What the sweep could not see is that the failure mode in this band is not
// CLIPPING, it is COLLAPSE INTO ROWS. `.lbry-toolbar` stacked at ≤640px and was
// a desktop row above it, so 834px got the desktop branch with none of the
// desktop room: the search field, which has no width ceiling, took the entire
// row; every filter group went to a line of its own; and the action landed hard
// right on a ragged line by itself. Measured on /discover/gradients: 192px of
// sticky chrome at 834px against 68px at 1440px, for the same three controls.
// Every one of them was inside its own box the whole time.
//
// So these assertions are about the SHAPE of the band, not about clipping:
// how many rows the toolbar resolves to, how tall it is against the desktop
// layout of the same controls, and whether each control can actually be hit.
// A height ceiling is a blunt instrument and that is the point — it is the one
// property that goes wrong when a row silently becomes four, and it is the one
// the previous sweep had no assertion for.
import { test, expect } from './base.js'
import { restingScrollY, watch } from './helpers.js'

const IPAD_UA = 'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'

// 834 is the iPad Air portrait width and the middle of the band. 768 is the
// iPad-portrait floor and the width the previous audit's chip table already
// used, so a regression that only bites at one edge cannot hide.
const BAND = [768, 834]

const LOAD_BUDGET_MS = 6000
const budget = (loads) => test.setTimeout(15000 + loads * LOAD_BUDGET_MS)

// [path, toolbar selector, max height in px, max search share of the row]
//
// THE CEILINGS ARE MEASURED, NOT CHOSEN. Each is the toolbar's real height at
// 1440px — the layout these controls were composed for — plus 24px of slack for
// one honest extra line. Every surface below was over its ceiling before this
// work and is under it after, so the number is doing work rather than
// documenting whatever the current build happens to render.
//
//   surface                 1440   834 before   834 after   ceiling
//   /discover/gradients        68          192          68        92
//   /discover/palettes         68          128          68        92
//   /create/emoji             213          225          68       237
//   /create/icons              68          178          68        92
//   /create/font-gallery      135          195         135       159
//   /discover/prompts          80          172         172       196
//
// /create/emoji's 1440 height is 213 because its 12-category tray genuinely
// wraps to three lines on a desktop too; the ceiling is derived the same way
// regardless, and the surface still went 225 → 68.
//
// /discover/prompts is in the table at its CURRENT height, not an improved one.
// `.pl-toolbar` is the one surface here that already had an explicit tablet
// treatment — #298 gave it one — and this work did not change it. It is listed
// so the band has a pin on every toolbar rather than only the ones that moved.
//
// THE FOURTH COLUMN is the search field's largest allowed share of the row, or
// null where the surface has a recorded reason to let it take the row.
//
// `.pl-toolbar` is the null, and it is deliberate: #298 gave that surface its
// tablet treatment by letting `.pl-search-wrap` off its 360px desktop cap
// (`max-width:none`) so that `.pl-chips` — six categories, the primary browse
// control on that page — could have a full row instead of losing a fight for
// half of one. Measured here it takes 78–80% of the row, which is that decision
// working, not the defect this column is looking for. Asserting a share on it
// would be this test overruling a recorded choice on a surface this work did
// not touch.
const TOOLBARS = [
  ['/discover/gradients', '.lbry-toolbar', 92, 0.6],
  ['/discover/palettes', '.lbry-toolbar', 92, 0.6],
  ['/create/emoji', '.lbry-toolbar', 237, 0.6],
  ['/create/icons', '.lbry-toolbar', 92, 0.6],
  ['/create/font-gallery', '.lbry-toolbar', 159, 0.6],
  ['/discover/prompts', '.pl-toolbar', 196, null],
]

async function open(browser, width, path, waitFor) {
  const ctx = await browser.newContext({
    viewport: { width, height: 900 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent: IPAD_UA,
  })
  const page = await ctx.newPage()
  watch(page, `toolbar band ${width}px ${path}`)
  await page.goto(path, { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('load').catch(() => {})
  await page.locator(waitFor).first().waitFor({ state: 'visible', timeout: 15000 })
  // Web fonts decide every control's width, and every measurement here is a
  // width. Two rounds so a face first requested by the layout the first round
  // settled is not measured mid-swap.
  await page.evaluate(async () => {
    for (let round = 0; round < 2; round++) {
      await document.fonts.ready
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    }
  })
  // Bring the toolbar to the top of the viewport before anything is measured.
  //
  // This is not tidiness. `document.elementFromPoint` returns null for a point
  // outside the visual viewport, so a control that has simply not been scrolled
  // to reads exactly like a control painted under a sibling — the Font Gallery's
  // preview-text field and size slider sit ~880px down behind a tall hero and
  // reported "hit nothing" for that reason alone. Scrolling first makes the
  // hit-test measure occlusion, which is the thing it is there to catch. It is
  // also the state the sticky toolbar is actually used in.
  await page.evaluate((s) => document.querySelector(s)?.scrollIntoView({ block: 'start' }), waitFor)
  // The app runs Lenis smooth scrolling, so the position keeps moving after the
  // call returns; measuring on a stopwatch is what #297 removed from this suite.
  await restingScrollY(page, `${path} toolbar scroll`)
  return { ctx, page }
}

test('the 641–980 band gives every toolbar a designed layout instead of the desktop row', async ({ browser }) => {
  budget(TOOLBARS.length * BAND.length)
  const damage = []

  for (const [path, sel, ceiling, searchShareMax] of TOOLBARS) {
    for (const w of BAND) {
      const { ctx, page } = await open(browser, w, path, sel)
      const r = await page.evaluate((toolbarSel) => {
        const bar = document.querySelector(toolbarSel)
        const bb = bar.getBoundingClientRect()
        const controls = [...bar.querySelectorAll('button,a[href],input,select,textarea')]
          .filter((el) => el.offsetParent !== null && el.getBoundingClientRect().width > 0)

        const rows = new Set(controls.map((el) => Math.round(el.getBoundingClientRect().top)))
        const outside = []
        const unhittable = []
        for (const el of controls) {
          const b = el.getBoundingClientRect()
          const name = (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0, 30)
          if (b.right > bb.right + 0.5 || b.left < bb.left - 0.5) outside.push(name)
          // Hit-test the control's own centre. A control that is inside the
          // toolbar's box and still returns something else here is painted
          // under a sibling — the failure a box comparison cannot see.
          const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2)
          if (!hit || !(el === hit || el.contains(hit) || hit.contains(el))) {
            unhittable.push(`${name} (hit ${hit ? hit.className || hit.tagName : 'nothing'})`)
          }
        }
        // The search field's share of the row. `.lbry-search` is `flex:1 1
        // 240px` with no ceiling of its own, so on a row it does not have to
        // compete for it takes the whole thing — measured 774px of 794 at
        // 834px, which is what pushed every filter group onto a line of its
        // own. A field is a control on the row, not the row.
        const search = bar.querySelector('.lbry-search, .pl-search-wrap')
        const searchShare = search
          ? search.getBoundingClientRect().width / (bar.clientWidth || 1)
          : null

        return {
          height: Math.round(bb.height),
          rows: rows.size,
          controls: controls.length,
          outside,
          unhittable,
          searchShare,
          searchW: search ? Math.round(search.getBoundingClientRect().width) : null,
          barW: Math.round(bar.clientWidth),
          barScrolls: bar.scrollWidth > bar.clientWidth + 1,
          pageScrolls: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        }
      }, sel)
      await ctx.close()

      if (!r.controls) {
        damage.push(`${path} @${w}px: no controls found in ${sel} — the toolbar has changed shape`)
        continue
      }
      if (r.height > ceiling) {
        damage.push(`${path} @${w}px: the toolbar is ${r.height}px tall over a ${ceiling}px ceiling, in ${r.rows} rows — the band has fallen back into the desktop layout`)
      }
      if (r.outside.length) {
        damage.push(`${path} @${w}px: ${r.outside.length} control(s) outside the toolbar box — ${r.outside.join(', ')}`)
      }
      if (r.unhittable.length) {
        damage.push(`${path} @${w}px: ${r.unhittable.length} control(s) not hit-testable at their own centre — ${r.unhittable.join('; ')}`)
      }
      // 0.6 is a ceiling, not a target, and it sits in a real gap rather than
      // next to the current value. Capped, the field is a flat 360px — 45% of
      // the row at 834px and 49% at 768px. With the cap removed and everything
      // else unchanged, the same field measures 62–70% across these surfaces.
      // Nothing lands near 0.6 in either state, so this fails on a layout
      // change and not on a font metric moving a few pixels.
      if (searchShareMax != null && r.searchShare != null && r.searchShare > searchShareMax) {
        damage.push(`${path} @${w}px: the search field is ${r.searchW}px of a ${r.barW}px row (${Math.round(r.searchShare * 100)}%) — it has taken the row instead of sharing it`)
      }
      if (r.barScrolls) damage.push(`${path} @${w}px: the toolbar is a horizontal scroller`)
      if (r.pageScrolls) damage.push(`${path} @${w}px: the page scrolls horizontally`)
    }
  }

  expect(damage, damage.join('\n')).toEqual([])
})
