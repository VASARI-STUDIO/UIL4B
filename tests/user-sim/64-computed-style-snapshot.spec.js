// A COMPUTED-STYLE SNAPSHOT over a fixed set of elements, at 390 and 1440.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY IT EXISTS
// ─────────────────────────────────────────────────────────────────────────────
// Two stylesheet changes landed together: exact-duplicate rule blocks merged out
// of `src/styles/global.css`, and thirteen per-page selector families lifted out
// of it into page stylesheets that load with their own lazy route chunk. Both
// claim the same thing — THAT NOTHING PAINTED CHANGED — and neither claim is
// checkable by reading CSS. A merged duplicate is only safe if the survivor
// still wins the cascade; a lifted family is only safe if its stylesheet still
// arrives, on that route, before the page is looked at.
//
// The suites this repo already has cover geometry (23-responsive-mid-band,
// 55-header-sweep, 58-target-size-24) and contrast (50-palette-preview-ink,
// 43-state-token-contrast, the audits). None of them would notice a border
// radius, a font weight, a grid template or a shadow moving. This one would.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHAT IT COMPARES, AND WHAT IT DELIBERATELY DOES NOT
// ─────────────────────────────────────────────────────────────────────────────
// 33 computed properties on the first PAINTED element for each of the 40 most
// common class names on each route — 2,000 elements over 25 routes at two
// widths, about 65,000 values. The class list is not computed at run time: it is
// frozen into the baseline file, so the set of elements under test is fixed and
// a route that stops rendering an element FAILS on the missing key rather than
// quietly measuring fewer things.
//
// Two exclusions, both measured rather than assumed:
//
//   · Properties the element sets INLINE. The palette surfaces paint a fresh
//     random palette on every load, so `.plb-col`'s background is a different
//     colour each time and is not the stylesheet's doing.
//   · Colour properties on any element under an inline CUSTOM PROPERTY. A
//     swatch carries `--col` inline and the stylesheet reads it, so `el.style`
//     does not name `background-color` but the value still changes per load.
//
// Without those two, two runs of an UNCHANGED build differed on 8 values out of
// 66,000. With them, two runs differ on 0 of 65,373. That zero is what makes a
// single differing value here worth reading as a regression.
//
// Geometry (`width`, `height`) is out on purpose: it moves with font loading,
// and it is already covered by the sweeps named above.
//
//   · Values the ENGINE resolved rather than an author wrote. `margin-left`,
//     `margin-right` and `grid-template-columns` keep their structure and lose
//     their pixels — see the block above `normalise()` for the measured reason
//     and for what that does and does not still catch. This is the same
//     exclusion `width`/`height` already had; it simply had not been followed
//     as far as it goes.
//
// THE THIRD EXCLUSION WAS FOUND BY RUNNING THIS ON A SECOND MACHINE, WHICH IS
// THE ONLY WAY IT COULD HAVE BEEN. The baseline is generated on the machine
// that checks it, so anything platform-dependent is frozen INTO the fixture and
// agrees with itself forever. The first CI run moved fifteen values on fourteen
// routes; all fifteen were scrollbar width, text measurement or a live-fetched
// font face, and none was a stylesheet. If this file is ever regenerated on a
// new platform, expect the same class of noise and read it before believing it.
//
// ─────────────────────────────────────────────────────────────────────────────
// MUTATION EVIDENCE
// ─────────────────────────────────────────────────────────────────────────────
// A green no-op control was taken first: 26 passed on an untouched build, and
// two independent runs of that build agreed on all 65,373 values.
//
// Then the thing it guards was broken. `--radius-s` was nudged 10px → 11px and
// the spec went red on 12 of the 25 routes; restored byte-exact, green again.
//
// THE FIRST ATTEMPT AT THAT MUTATION WAS A NO-OP, AND IT IS THE REASON THIS
// SPEC IS WORTH ITS RUNTIME. `--radius-s` was nudged in the `:root` block at
// the top of global.css, the build was green, and every route still passed —
// not because the spec is blind but because `[data-rounding="default"]`
// redefines the whole radius scale further down the file at a higher
// specificity, and the app sets that attribute on the root element. The
// `:root` value is dead. Reading the stylesheet says the token changed;
// only a browser says the page did not. That is the entire case for asserting
// on computed values rather than on file contents.
//
// The lift was verified the same way, and both halves of it:
//   · `import '../styles/pages/tint.css'` deleted from TintTool.jsx —
//     /create/tint alone fails, on 63 values at 390. So the page stylesheet is
//     load-bearing and this spec sees it go missing. That is the FOUC risk the
//     backlog item was filed on, made into an assertion.
//   · `.lart{font-size:17px}` → `18px` INSIDE the lifted learn-article.css —
//     /learn/brand-colour alone fails, on 17 values at 1440. So a rule that
//     moved out of global.css still reaches the page it was moved for.
// Both restored byte-exact; 26 passed again after each.
//
// ─────────────────────────────────────────────────────────────────────────────
// REGENERATING
// ─────────────────────────────────────────────────────────────────────────────
//   UPDATE_STYLE_BASELINE=1 npx playwright test 64-computed-style-snapshot --workers=1
// `--workers=1` is not optional: the routes are one test each, so on several
// workers each process would hold a fifth of the routes and write a fixture
// missing the rest. The afterAll below refuses to write a partial file rather
// than shrinking the fixture silently — which is the same failure this spec's
// own positive control exists to catch.
// Only ever after a change that is MEANT to repaint, and read the diff before
// committing it. The generator is this file, so the baseline can never drift
// from the code that checks it.
import fs from 'node:fs'
import path from 'node:path'
import { test, expect } from './base.js'
import { go } from './helpers.js'

const BASELINE_FILE = path.join(process.cwd(), 'tests', 'user-sim', 'fixtures', 'computed-style-baseline.json')
const UPDATING = process.env.UPDATE_STYLE_BASELINE === '1'

const baseline = JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8'))
const { props: PROPS, widths: WIDTHS, routes: ROUTES } = baseline

// Each element is stored as an ARRAY of values in `props` order rather than as
// an object, because the object form repeated all 33 property names 2,000 times
// and made the fixture bigger than global.css itself. `null` means the property
// was excluded for that element (set inline, or colour under an inline custom
// property) and is not compared.
const asObject = (arr) => {
  const o = {}
  PROPS.forEach((p, i) => { if (arr[i] !== null) o[p] = arr[i] })
  return o
}
const asArray = (obj) => PROPS.map((p) => (p in obj ? obj[p] : null))

// ── positive control on the FIXTURE itself ──────────────────────────────────
// A snapshot over zero elements passes every assertion in this file. These
// floors are what stop that being a green run. They are floors, not equalities,
// so adding a route or an element never fails them.
const routeNames = Object.keys(ROUTES)
const elementCount = routeNames.reduce(
  (n, r) => n + WIDTHS.reduce((m, w) => m + Object.keys(ROUTES[r][w] || {}).length, 0), 0,
)
test('the baseline under test is not empty', async () => {
  expect(PROPS.length).toBeGreaterThanOrEqual(30)
  expect(WIDTHS).toEqual([390, 1440])
  /* 24 AND 1800, DOWN FROM 25 AND 1900 — and the reason is a route LEAVING
   * rather than the fixture shrinking, which is the thing these floors exist
   * to catch.
   *
   * `/create/color` was in the baseline and is not a page: the colour landing
   * was deleted and the route redirects to `/create/palette`, which is measured
   * in its own right two rows below. Snapshotting a redirect measured the
   * destination a second time under the wrong name, and `go()`'s readiness wait
   * does not resolve for it at all — regenerating that entry fails outright.
   *
   * THE FRONT DOOR WENT THE OTHER WAY AND THAT IS THE WARNING WORTH KEEPING.
   * `/` held 76 elements as Home.jsx and dropped to TWO after the redesign,
   * because this file freezes its class list on purpose and
   * UPDATE_STYLE_BASELINE can therefore only ever SHRINK it — re-measuring
   * Home's classes against Spectrum left the single survivor, `.sr-only`. The
   * fixture still looked healthy, and the page every visitor lands on had no
   * computed-style coverage at all. Its selector list was re-derived from the
   * rendered page and is 40 again at both widths.
   *
   * So: if this floor ever needs lowering again, find out WHICH route lost
   * elements first. A shrinking route is the defect; a removed route is a
   * decision. */
  expect(routeNames.length).toBeGreaterThanOrEqual(24)
  expect(elementCount).toBeGreaterThanOrEqual(1800)
  // Every route carries a full set at both widths.
  for (const r of routeNames) {
    for (const w of WIDTHS) {
      expect(Object.keys(ROUTES[r][String(w)] || {}).length, `${r} @${w}`).toBeGreaterThanOrEqual(20)
    }
  }
})

/**
 * Measure the fixed element set once. Returns { selector: { prop: value } },
 * with a key MISSING when the selector matched no painted element — which the
 * comparison then reports as a disappearance rather than skipping.
 */
const measureOnce = (page, selectors) => page.evaluate(({ selectors, props }) => {
  /* THREE PROPERTIES REPORT A LAYOUT RESULT, NOT AN AUTHORED VALUE, AND THE
   * PIXELS IN THEM ARE NOT PORTABLE BETWEEN MACHINES.
   *
   * The header above already drops `width` and `height` for being "the one
   * family of values that moves with font loading". It is not one family. The
   * first run of this suite on the Linux CI runner moved fifteen values across
   * fourteen routes, and every one of them was a used value the engine had
   * computed rather than a declaration anyone wrote:
   *
   *   .lart-head     margin-left  142.406px -> 150px      `margin: 0 auto`, and
   *   .lart-crumb    margin-right 142.422px -> 150px      the difference IS the
   *                                                       scrollbar: Windows
   *                                                       reserves ~15px, the
   *                                                       headless Linux build
   *                                                       reserves none, so the
   *                                                       centring splits 285px
   *                                                       here and 300px there.
   *   .hlp-start-go  margin-left  388.234px -> 423.281px  `margin-left: auto`
   *                                                       in a flex row — the
   *                                                       value is the leftover
   *                                                       space, so it moves by
   *                                                       whatever the siblings'
   *                                                       text measures.
   *   .lart-layout   grid-template-columns  200px 631.172px -> 200px 616px
   *   .fg-command-text  75.6094px 223.391px -> 70.8125px 228.188px
   *                                                       `1fr` and `auto`
   *                                                       tracks resolved.
   *
   * So the numbers are dropped and the STRUCTURE is kept. A track appearing or
   * disappearing, a `1fr` becoming `auto`, a margin becoming or ceasing to be
   * `auto` — all still fail. What no longer fails is a horizontal margin moving
   * from one length to another; `padding-left`, `padding-right` and `gap` carry
   * authored horizontal spacing and are untouched, as are `margin-top` and
   * `margin-bottom`, which do not resolve from `auto` on any element here.
   *
   * Do NOT widen this to the vertical properties or to anything in the colour,
   * type, radius or shadow families. Those were stable across both platforms on
   * the same run — 65,358 of 65,373 values agreed — which is what makes a single
   * differing value in them worth reading as a regression. */
  const LAYOUT_RESOLVED = new Set(['margin-left', 'margin-right', 'grid-template-columns'])
  const normalise = (prop, value) => (
    LAYOUT_RESOLVED.has(prop) ? value.replace(/-?\d*\.?\d+px/g, '<len>') : value
  )
  const out = {}
  for (const s of selectors) {
    // The first PAINTED match, not the first match. Inactive views stay mounted
    // on several of these routes, so a plain querySelector returns a 0x0 hidden
    // node and measures the wrong element's styles.
    let el = null
    for (const cand of document.querySelectorAll(s)) {
      const r = cand.getBoundingClientRect()
      if (r.width > 0 || r.height > 0) { el = cand; break }
    }
    if (!el) continue
    const cs = getComputedStyle(el)
    const inline = new Set()
    for (const p of el.style) {
      inline.add(p)
      if (p === 'background') inline.add('background-color')
      if (p === 'padding') for (const q of ['top', 'right', 'bottom', 'left']) inline.add('padding-' + q)
      if (p === 'margin') for (const q of ['top', 'right', 'bottom', 'left']) inline.add('margin-' + q)
    }
    let tinted = false
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      for (const p of n.style) if (p.startsWith('--')) { tinted = true; break }
      if (tinted) break
    }
    // `font-family` joins the colour list, and for exactly the reason the list
    // exists. `.fg-card-preview` is `font-family: var(--fg-ff)` and FontGallery
    // sets `--fg-ff` inline per card, so the measured value is WHICHEVER FACE
    // the catalogue happened to serve — Geist on this machine, Roboto on the
    // Linux runner. That is the page's content changing, not its stylesheet.
    if (tinted) for (const p of ['color', 'background-color', 'border-top-color', 'box-shadow', 'font-family']) inline.add(p)
    const rec = {}
    for (const p of props) if (!inline.has(p)) rec[p] = normalise(p, cs.getPropertyValue(p))
    out[s] = rec
  }
  return out
}, { selectors, props: PROPS })

/**
 * Settle on THE MEASUREMENT ITSELF: read until three consecutive reads are
 * identical. A stopwatch would be a guess about the animation layer, and two
 * equal reads is a coin flip when a value passes through a repeat; this waits
 * for the thing being asserted on to stop moving.
 */
async function settledSnapshot(page, selectors) {
  let prev = JSON.stringify(await measureOnce(page, selectors))
  let stable = 0
  let snap = null
  for (let i = 0; i < 60 && stable < 3; i++) {
    await page.waitForTimeout(120)
    const now = await measureOnce(page, selectors)
    const s = JSON.stringify(now)
    if (s === prev) { stable++; snap = now } else { stable = 0; prev = s }
  }
  if (!snap) throw new Error('computed styles never settled — nothing here can be compared')
  return snap
}

async function openSettled(browser, route, width, selectors) {
  // A fresh context per width. Resizing an open page re-runs the media queries
  // but keeps whatever state the first width left behind, and this suite has
  // paid for that before.
  const context = await browser.newContext({ viewport: { width, height: 900 } })
  try {
    const page = await context.newPage()
    // `go()` rather than page.goto: it carries the readiness wait that tells a
    // rendered route apart from the lazy-chunk fallback, which measures as a
    // full page (421 characters of chrome) and would be snapshotted as one.
    await go(page, route)
    await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {})
    return await settledSnapshot(page, selectors)
  } finally {
    await context.close()
  }
}

const updated = {}

for (const route of routeNames) {
  test(`computed styles are unchanged on ${route}`, async ({ browser }) => {
    test.setTimeout(120_000)
    const perWidth = {}
    for (const width of WIDTHS) {
      const stored = ROUTES[route][String(width)]
      const expected = Object.fromEntries(Object.entries(stored).map(([s, v]) => [s, asObject(v)]))
      const selectors = Object.keys(expected)
      expect(selectors.length, `${route} @${width} has no elements to measure`).toBeGreaterThan(0)

      const actual = await openSettled(browser, route, width, selectors)
      perWidth[width] = actual
      if (UPDATING) { perWidth[width] = Object.fromEntries(Object.entries(actual).map(([s, v]) => [s, asArray(v)])); continue }

      const gone = selectors.filter((s) => !actual[s])
      expect(gone, `${route} @${width}: element(s) the baseline paints are no longer rendered`).toEqual([])

      const moved = []
      for (const s of selectors) {
        for (const p of Object.keys(expected[s])) {
          if (actual[s][p] !== expected[s][p]) moved.push(`${s} { ${p}: ${expected[s][p]} -> ${actual[s][p]} }`)
        }
      }
      expect(moved, `${route} @${width}: ${moved.length} computed value(s) moved`).toEqual([])

      // Positive control for THIS route: the comparison above examined a real
      // number of values. Without it, an empty `expected` would pass silently.
      const compared = selectors.reduce((n, s) => n + Object.keys(expected[s]).length, 0)
      expect(compared, `${route} @${width} compared nothing`).toBeGreaterThan(200)
    }
    if (UPDATING) updated[route] = perWidth
  })
}

test.afterAll(async () => {
  if (!UPDATING) return
  if (Object.keys(updated).length !== routeNames.length) {
    // A partial rewrite would silently shrink the fixture, which is the failure
    // mode this file's own positive control exists to catch.
    console.log(
      `baseline NOT written: this worker measured ${Object.keys(updated).length}/${routeNames.length} routes. `
      + 'Re-run the regeneration with --workers=1.',
    )
    return
  }
  // Hand-rolled so each element is ONE line: a fixture nobody can read a diff
  // of is a fixture that gets regenerated instead of reviewed. JSON.stringify
  // with an indent puts all 33 values on 33 lines and made the file bigger than
  // global.css; this keeps the line-per-element diff and a third of the bytes.
  const lines = ['{', ` "props": ${JSON.stringify(PROPS)},`, ` "widths": ${JSON.stringify(WIDTHS)},`, ' "routes": {']
  routeNames.forEach((route, ri) => {
    lines.push(`  ${JSON.stringify(route)}: {`)
    WIDTHS.forEach((w, wi) => {
      lines.push(`   "${w}": {`)
      const rows = Object.entries(updated[route][w])
      rows.forEach(([sel, vals], i) => {
        lines.push(`    ${JSON.stringify(sel)}: ${JSON.stringify(vals)}${i === rows.length - 1 ? '' : ','}`)
      })
      lines.push(`   }${wi === WIDTHS.length - 1 ? '' : ','}`)
    })
    lines.push(`  }${ri === routeNames.length - 1 ? '' : ','}`)
  })
  lines.push(' }', '}', '')
  fs.writeFileSync(BASELINE_FILE, lines.join('\n'))
  console.log(`baseline rewritten: ${routeNames.length} routes`)
})
