// The defect sweep — the leftovers of the two August 2026 QA audits.
//
// The responsive audit (M1, M6, N1–N8) and the mobile audit (S3, S4, S5, S10,
// and S16 above 768px) — both deleted 2026-09-05; what each number was and what
// holds it now is in docs/qa/defect-register-2026-08.md,
// minus everything PR #263 and PR #271 already landed and minus every
// homepage-scoped finding (the founder is reworking that surface separately).
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY EVERY ASSERTION HERE IS RENDERED GEOMETRY
// ─────────────────────────────────────────────────────────────────────────────
// The faults in these audits are invisible to the DOM. A swatch row collapsed
// to 24px still contains all seven of its buttons, with correct accessible
// names, at their full 32x32 CSS size — they simply sit on top of each other, so
// `elementFromPoint` at the centre of "Lock PRIMARY" returns `.plb-name`. A
// truncated font name still reports the whole string in `textContent`. A chip
// row that has scrolled its last option 1160px out of view still has the option
// in the tree. So nothing below counts nodes or reads text: it measures boxes,
// hit-tests points, and compares a label's own DOM Range against the box that is
// supposed to contain it.
//
// Real device metrics (`isMobile` + `hasTouch`) are used for the phone
// viewports, because a desktop Chromium narrowed to 390px still reports
// `hover: hover` and hides this whole class of defect.
import { test, expect } from './base.js'
import { go, restingScrollY, signIn, watch } from './helpers.js'
import { GALLERY_GRADIENTS } from '../../src/data/gradientGallery.js'

const IOS_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
const IPAD_UA = 'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'

// EVERY CREATE PATH BELOW IS A `/create/*` URL, and that is not cosmetic. PR
// #266 moved the Create tools (/emoji → /create/emoji, /color/palette →
// /create/palette, and 22 more — src/data/legacyRoutes.js has the table) and
// gave every retired URL a 301. Playwright FOLLOWS a redirect, so this file went
// on passing while exercising the redirect rather than the route, and nothing in
// the run said so. A route that has to be redirected to before it can be
// measured is not the route the test claims to cover, and the day one of those
// 301s is dropped the test would start measuring a 404 shell instead.

/**
 * Wait until the page is geometrically settled, rather than for a fixed number
 * of milliseconds.
 *
 * This was `waitForTimeout(400)` on every iteration. Measured per phase, that
 * was ~405ms of a 580–930ms iteration — over half the cost of this whole file —
 * and it was never the right condition anyway. What every assertion here
 * depends on is the WEB FONTS having resolved: all of them measure a box whose
 * width is a function of the face rendering it, which is the entire subject of
 * N1, N3 and M6. A blind sleep neither guarantees that nor stretches when the
 * machine is slow, which is the wrong behaviour in both directions.
 * `document.fonts.ready` is the thing itself, and it measured 22–143ms.
 *
 * Two rounds, not one: a face first REQUESTED by the layout that round one
 * settled would otherwise be measured mid-swap. The paired frames let the
 * layout each swap triggers land before anything is read.
 */
async function settle(page) {
  await page.evaluate(async () => {
    for (let round = 0; round < 2; round++) {
      await document.fonts.ready
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    }
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// TIMEOUT BUDGETS
// ─────────────────────────────────────────────────────────────────────────────
// Playwright's 30s default (playwright.config.js) is a budget for a test that
// opens ONE page. Nothing in this file opens one page as a rule: the cheapest
// test here opens one, the dearest opens twelve, and every open is a fresh
// `browser.newContext()` with real device metrics, a navigation, a lazy route
// chunk and a render. Measured on this machine a warm iteration costs 0.58–0.93s
// and a cold route chunk 2.0s; on a contended CI runner the same iteration cost
// roughly four times that. Three tests here hit exactly 30.000s on CI while
// passing in 10s locally. That is not an assertion failing — it is a
// single-load budget being applied to a twelve-load test.
//
// So the budget is DERIVED from how many pages the test actually opens, off the
// very arrays that drive its own loops. Adding a width or a surface raises the
// budget in the same edit, which is the property a hand-tuned number does not
// have, and it is what stops this being "the timeout somebody nudges up every
// time CI trips".
//
// Headroom, not permission to be slow. The per-iteration cost is held down by
// `settle()` above; a test that blows even this budget is hung, not busy.
const LOAD_BUDGET_MS = 6000
const budget = (loads) => test.setTimeout(15000 + loads * LOAD_BUDGET_MS)

/**
 * Open `path` at an exact viewport under real touch device metrics.
 * `waitFor` is a selector that must be attached before the measurement runs —
 * a fixed sleep is not allowed to be the thing that decides whether the element
 * exists, which is a trap this suite has already been caught by once.
 */
async function open(browser, width, height, path, waitFor, { touch = true, as = null } = {}) {
  const tablet = width >= 700
  const ctx = await browser.newContext({
    viewport: { width, height },
    ...(touch ? { deviceScaleFactor: tablet ? 2 : 3, isMobile: true, hasTouch: true, userAgent: tablet ? IPAD_UA : IOS_UA } : {}),
  })
  const page = await ctx.newPage()
  watch(page, `defect sweep ${width}x${height} ${path}`)
  // `as` exists for the three galleries that meter by account. It must run
  // BEFORE the navigation — signIn() installs init scripts, so a page that has
  // already loaded is signed in for nobody. Every caller that does not pass it
  // is unchanged and browses signed out, which is what most of this file is
  // about.
  if (as) await signIn(page, as)
  // One Tap used to be routed here, per page. It is stubbed for the whole suite
  // in base.js now — on the context, so it covers this hand-built one too — and
  // this copy is gone rather than racing it: a page route takes precedence over
  // a context route, so leaving it would have made the per-spec stub the silent
  // winner. Same reasoning, one place; see base.js.
  await go(page, path)
  await page.waitForLoadState('load').catch(() => {})
  if (waitFor) await page.locator(waitFor).first().waitFor({ state: 'attached', timeout: 15000 })
  await settle(page)
  // Landed on the route it asked for, not on a redirect's destination. This is
  // the guard for the staleness above: without it a retired path in the table
  // keeps passing, silently, on whatever the 301 sends it to.
  expect(new URL(page.url()).pathname.replace(/\/$/, '') || '/', `${path} did not answer for itself — it redirected to ${new URL(page.url()).pathname}`).toBe(path)
  return { ctx, page }
}

// ─────────────────────────────────────────────────────────────────────────────
// /info accordion regions have an accessible name
// ─────────────────────────────────────────────────────────────────────────────
// Found while landing S9 in PR #271 and deliberately left for its own commit.
// Each panel's `aria-labelledby` named the panel's OWN id, so the region was
// labelled by itself and computed no accessible name — a screen-reader user
// opening one heard "region" and nothing that said which of the twelve it was.
//
// The assertion goes through the ROLE and NAME, resolved by the browser's own
// ARIA computation on the rendered page, rather than by reading the attribute
// back. Reading the attribute would have passed on the broken build: it was
// present, well-formed, and pointed at an element that genuinely existed.

test('/info · every accordion panel is a region with its section name', async ({ browser }) => {
  budget(1)
  const { ctx, page } = await open(browser, 1280, 900, '/info', '.ic-acc-head', { touch: false })

  const headings = await page.locator('.ic-acc-title').allInnerTexts()
  expect(headings.length, 'expected the /info accordion sections').toBeGreaterThan(5)

  // A region labelled by its own id resolves to no name, so this count is 0 on
  // the broken build and equals the number of panels once it is fixed.
  const named = []
  const unnamed = []
  for (const title of headings) {
    const region = page.getByRole('region', { name: title, exact: true })
    if (await region.count() > 0) named.push(title)
    else unnamed.push(title)
  }

  // And the name must not be the panel's own body text leaking in as a fallback.
  const selfLabelled = await page.evaluate(() =>
    [...document.querySelectorAll('.ic-acc-body')]
      .filter((el) => el.getAttribute('aria-labelledby') === el.id)
      .map((el) => el.id))

  await ctx.close()
  // Name first: it is the property that matters, and it is the one a future
  // wrong-but-not-self-referential id would break.
  expect(unnamed, `accordion panels with no accessible region name: ${unnamed.join(', ')}`).toEqual([])
  expect(selfLabelled, `panels labelled by their own id: ${selfLabelled.join(', ')}`).toEqual([])
  expect(named.length).toBe(headings.length)
})

// ─────────────────────────────────────────────────────────────────────────────
// S16 above 768px · the half of it PR #271 scoped out
// ─────────────────────────────────────────────────────────────────────────────
// 24-mobile-overhaul.spec.js pins the phone half of S16 (≤768px). This is the
// rest: 3 to 5 of the 9 specimens were still cut from 769px upward, showing
// 31–59% of the string, on the reasoning that those viewports are wider. Being
// wider was not enough.
//
// Measured on BOTH axes for the same reason the phone test does: the old fault
// clipped horizontally, a line clamp would clip vertically, and a width-only
// check calls the second one clean. The assertion is the fraction of the string
// that renders.
//
// 1024x768 is in the list and is the worst case — worse than 769 — because the
// two-column grid arrives at 981px and takes 340px back. That grid belongs to
// PR #263; this test asserts the specimen is whole whatever width the grid ends
// up giving it, so it should hold across that merge rather than fight it.

const TSC_WIDE = [[769, 900], [800, 600], [834, 1194], [844, 390], [900, 900], [980, 900], [1024, 768], [1180, 820], [1280, 900], [1440, 900]]

test('S16 · no Type Scale specimen is cut above 768px either', async ({ browser }) => {
  budget(TSC_WIDE.length)
  const damage = []
  for (const [w, h] of TSC_WIDE) {
    const { ctx, page } = await open(browser, w, h, '/create/type-scale', '.tsc-row-text', { touch: w < 1000 })
    const r = await page.evaluate(() => {
      const rows = [...document.querySelectorAll('.tsc-row-text')]
      const hidden = []
      for (const el of rows) {
        const vScale = el.scrollHeight > el.clientHeight + 1 ? el.scrollHeight / el.clientHeight : 1
        const needs = el.scrollWidth * vScale
        const gets = el.clientWidth
        if (needs > gets + 1) {
          hidden.push(`${getComputedStyle(el).fontSize}: ${Math.round((gets / needs) * 100)}% shown (${gets} of ${Math.round(needs)}px)`)
        }
      }
      return { rows: rows.length, hidden }
    })
    await ctx.close()
    expect(r.rows, `${w}x${h}: expected the 9 specimen rows`).toBe(9)
    if (r.hidden.length) damage.push(`${w}x${h}: ${r.hidden.length} of 9 specimens cut — ${r.hidden.slice(0, 2).join(', ')}`)
  }
  expect(damage, damage.join('\n')).toEqual([])
})

// ─────────────────────────────────────────────────────────────────────────────
// S3 / S4 · chip rows that were scrollers with no affordance
// ─────────────────────────────────────────────────────────────────────────────
// Fifth, sixth and — via the shared Library tray PR #254 introduced — seventh
// instances of one shape in this stylesheet: a row of options turned into
// `overflow-x:auto` with the scrollbar suppressed, which under touch emulation
// paints nothing at all to say it scrolls. S1, S2 and S8 were the same and were
// fixed by wrapping in PR #271.
//
// Counting chips in the DOM proves nothing — they were all present the whole
// time. What is asserted is how many sit inside their own container's box.
//
// The route list is wider than the audit's, on purpose: S4 only records the
// Emoji Library, but the defect is a property of a SHARED filter row, and every
// surface that mounts one has it. /create/icons (4 of 7 off at 320px) and
// /discover/prompts (3 of 6) were never written down.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY THIS TEST CARRIES A SELECTOR PER SURFACE
// ─────────────────────────────────────────────────────────────────────────────
// It used to hard-code `.pl-chips` / `.pl-chip` for all four routes, because all
// four genuinely shared that markup when it was written. PR #254 then rebuilt
// /discover/gradients on the shared Library components while this branch waited
// to merge, and that surface now renders `.lbry-filters` / `.lbry-filter` and no
// `.pl-chips` at all. The old selector stopped matching anything.
//
// Two idioms are live, so the table names each surface's own container and item
// classes rather than assuming one shape for all of them. That is the part that
// went stale, so it is the part the table has to record.
//
// THE ROW AND ITEM COUNTS ARE BOTH ASSERTED, and that is deliberate:
//
//   - `rows` is the guard against the failure that produced this repair. A
//     selector that matches NOTHING measures nothing, reports no damage, and
//     passes. Asserting how many containers the selector found turns that into a
//     red test with a message that says which surface changed shape.
//   - `items` is the total across all of them, because a surface can mount more
//     than one filter group — /discover/gradients mounts two (mood, then type),
//     and the old single-row `expected` could not describe that. A total plus
//     "no row is empty" pins both the sum and the split, where a per-row
//     expectation would have to be re-derived every time an option is added.
//
// The item selector also has to exclude the tray's own furniture:
// `.lbry-filter-ind` is a decorative sliding indicator and `.lbry-filter-dot` is
// a colour swatch inside a button. Neither is a chip. Neither carries the
// `lbry-filter` class token, so `.lbry-filter` already excludes them — and the
// `items` total is what would catch it if a future rename folded one back in.

// [path, container selector, item selector, rows, items across all rows]
const CHIP_WIDTHS = [320, 390, 768, 1180]

// The shared Library tray no longer renders inline across the whole of that
// list. Between 641 and 980px it collapses to a trigger plus a menu — the band
// that previously had no layout of its own and wrapped the toolbar to three and
// four rows (see `.lbry-search` in global.css and LibraryFilterGroup.jsx).
//
// 768 is inside that band, so the tray widths drop it and the collapsed form is
// measured at 768 and 834 by the test below instead. The MEASUREMENT is the
// same one either way — every option inside its own container's box, and that
// container not quietly a horizontal scroller — asked of whichever form is
// actually on screen. Dropping 768 from one list without asking the question
// somewhere else would have been a coverage hole disguised as a green run.
const TRAY_WIDTHS = [320, 390, 1180]
const COLLAPSED_WIDTHS = [768, 834]

// The original `.pl-chips` idiom — one wrapping row of outlined pills — no
// longer has a browse consumer. /create/emoji and /create/icons left it for the
// shared Library tray, and #323 took the Prompt Library, the last one, with
// them. The measurement did not go away: every surface that used to be here is
// in FILTER_TRAYS below, asked the same question through the shared selectors.
//
// `.pl-chip` itself is still live OUTSIDE this suite's scope (BoxShadow presets,
// Projects folders, the AI prompt and alt-text pickers, ColorStudio's
// named-library switch). None of them is a browse filter row, which is what
// this block measures, so none of them belongs in it.

// The shared Library segmented tray (PR #254), which replaced the chip row on
// the browse surfaces. /discover/gradients mounts TWO trays — 8 mood options and
// 4 type options — so it is the surface the single-row shape could not describe.
// /discover/palettes and /create/font-gallery are here for the reason the list above is
// wider than the audit: the tray is shared CSS, and a fix measured on one
// consumer has already been shown to leave another broken.
//
// [path, box, item, expandedRows, expandedChips, onlyWidths, collapsedTriggers]
//
// The last field exists because a surface's EXPANDED tray count and its
// COLLAPSED trigger count stopped being the same number on 2026-09-07. It
// defaults to `expandedRows`, so every row that was correct before still is.
const FILTER_TRAYS = [
  // ONE expanded tray since 2026-09-16 — Type, 4 chips. Mood (8 options) is a
  // labelled menu at every width, as on palettes below and for the same
  // measured reason: beside the type tray it wrapped the sticky toolbar to
  // two rows (122px) at 1024. Two triggers in the collapsed band, as before.
  ['/discover/gradients', '.lbry-filters', '.lbry-filter', 1, 4, null, 2],
  // TWO GROUPS since 2026-09-07, with two different shapes on purpose.
  // Collection (All palettes / Curated / Brand) is the page's primary split and
  // stays a visible segmented row — that is the one expanded tray with 3 chips
  // measured here. Mood is a nine-value facet and is a labelled menu at EVERY
  // width, so it contributes a trigger and no chip row: nine chips took the
  // sticky toolbar to 314px at 320px wide and wrapped it to two rows at 1280.
  // The two together are the two triggers the collapsed test below counts.
  ['/discover/palettes', '.lbry-filters', '.lbry-filter', 1, 3, null, 2],
  ['/create/font-gallery', '.lbry-filters', '.lbry-filter', 2, 8],
  // The two Create libraries the founder asked to match the galleries. Emoji
  // carries the widest tray in the app — 12 categories — which is what makes it
  // the surface any tray regression shows up on first.
  // EMOJI IS MEASURED NARROW ONLY, and that is a statement about the fix rather
  // than an exemption. Its tray wants 1478px — twelve categories each carrying a
  // glyph, a label and a count — so it needs 1928px of toolbar row before it
  // fits beside a capped search field and the skin-tone control. No desktop
  // anyone has offers that, and until 2026-09-04 the tray simply wrapped and
  // took the toolbar to 213px against 68px on the icon tab: a 145px jump on a
  // tab switch, on one page, which is what the founder reported. It now
  // collapses to its trigger wherever it does not fit, so at 1180px there is no
  // expanded tray to measure and the surface is asserted in the collapsed test
  // below instead.
  //
  // AND SINCE 2026-09-13 THERE IS NO EXPANDED TRAY AT ANY WIDTH, which is why
  // this row now names zero rows, zero chips and no widths at all. "Below 641
  // it is a full-width column stack and the chips are all there" is what this
  // row used to check at 320 and 390, and that turned out to be the defect
  // rather than the baseline: twelve chips wrapped to SEVEN rows at 320 and six
  // at 390, took the toolbar to 414px — 49% of an 844px phone — and put ZERO
  // emoji on the first screen at 320, 360, 390 and 430. An emoji library
  // showing no emoji.
  //
  // So this surface took the same decision `/discover/palettes` took for mood
  // nine rows above, for the same reason and with a larger facet: twelve values
  // is a labelled menu at EVERY width. It contributes a trigger and no chip
  // row, so the expanded measurement has nothing to measure and the collapsed
  // test below owns the surface — `collapsedTriggers` is stated explicitly
  // because it can no longer default to the (now zero) group count.
  //
  // Coverage did not shrink: 87-tools-breakpoints asserts this trigger, its
  // `aria-haspopup`/`aria-expanded` contract and the absence of the tray at all
  // ten breakpoints in both themes, and hit-tests every option in the open menu.
  ['/create/emoji', '.lbry-filters', '.lbry-filter', 0, 0, [], 1],
  ['/create/icons', '.lbry-filters', '.lbry-filter', 1, 7],
  // #323 moved the Prompt Library onto the shared toolbar. It mounts TWO trays
  // — sort (2 options) and category (All + 5) — which is why the totals column
  // exists rather than a per-row count.
  ['/discover/prompts', '.lbry-filters', '.lbry-filter', 2, 8],
]

/**
 * Measure every filter row `box` finds on `path`, at each of the S4 widths.
 *
 * Nothing here counts what is in the DOM: every chip was in the DOM through the
 * whole defect. It measures which of them sit inside their own container's box,
 * and whether that container has quietly become a scroller again.
 */
async function chipRowDamage(browser, surfaces, widths = CHIP_WIDTHS) {
  const damage = []
  for (const [path, box, item, rows, items, only] of surfaces) {
    // A surface may name the widths at which it HAS an expanded tray. Anything
    // it does not name is covered by the collapsed test, never by nothing.
    for (const w of (only ? widths.filter((x) => only.includes(x)) : widths)) {
      const { ctx, page } = await open(browser, w, 900, path, box, { touch: w < 800 })
      const r = await page.evaluate(([boxSel, itemSel]) => {
        const found = [...document.querySelectorAll(boxSel)]
        let total = 0, outside = 0
        const scrollers = []
        const empty = []
        for (const row of found) {
          const rb = row.getBoundingClientRect()
          const kids = [...row.querySelectorAll(itemSel)]
          const name = row.getAttribute('aria-label') || row.className
          if (!kids.length) empty.push(name)
          total += kids.length
          for (const k of kids) {
            const b = k.getBoundingClientRect()
            if (b.right > rb.right + 0.5 || b.left < rb.left - 0.5) outside++
          }
          if (row.scrollWidth > row.clientWidth + 1) {
            scrollers.push(`${name} (${row.scrollWidth}px of content in a ${row.clientWidth}px row)`)
          }
        }
        return { rows: found.length, total, outside, scrollers, empty }
      }, [box, item])
      await ctx.close()
      // Structure first. A selector that has gone stale reports zero of
      // everything below, so it has to fail HERE rather than pass quietly.
      expect(r.rows, `${path} @${w}px: expected ${rows} “${box}” row(s), found ${r.rows} — the markup for this surface has changed shape`).toBe(rows)
      expect(r.total, `${path} @${w}px: expected ${items} “${item}” chips across ${rows} row(s), found ${r.total}`).toBe(items)
      expect(r.empty, `${path} @${w}px: filter row(s) with no chips in them at all — ${r.empty.join(', ')}`).toEqual([])
      if (r.outside) damage.push(`${path} @${w}px: ${r.outside} of ${r.total} chips outside the row`)
      if (r.scrollers.length) damage.push(`${path} @${w}px: the chip row is a horizontal scroller again — ${r.scrollers.join('; ')}`)
    }
  }
  return damage
}

test('S4 · every shared Library filter is inside its own tray, on every surface that shares it', async ({ browser }) => {
  budget(FILTER_TRAYS.reduce((n, [, , , , , only]) => (
    n + (only ? TRAY_WIDTHS.filter((w) => only.includes(w)).length : TRAY_WIDTHS.length)
  ), 0))
  const damage = await chipRowDamage(browser, FILTER_TRAYS, TRAY_WIDTHS)
  expect(damage, damage.join('\n')).toEqual([])
})

// THE TAB SWITCH THE FOUNDER REPORTED, measured as one number.
//
// /create/icons and /create/emoji mount the same component and toggle `hidden`,
// so a difference in toolbar height is one page moving under the cursor. It was
// 68px against 213px at 1440 on 2026-09-04. The tray collapsing when it does not
// fit is what removes the difference, so this asserts the OUTCOME (the two
// toolbars agree) rather than the mechanism, and separately that the collapse
// did not simply throw the options away.
test('S4 · the Icon and Emoji toolbars are the same height on a desktop, and the emoji categories survive the collapse', async ({ browser }) => {
  budget(2)
  const heights = {}
  for (const path of ['/create/icons', '/create/emoji']) {
    // A FINE POINTER, deliberately, unlike the rest of this block. The founder
    // reported this "on a standard desktop", and under coarse-pointer metrics
    // the two tabs legitimately differ by 4px: @media(pointer:coarse) floors
    // .lbry-filter at the WCAG 44px target, which makes the icon tray 50px tall
    // against the 46px collapsed trigger on the emoji side. That is the touch
    // floor doing its job, not the defect, and asserting it away would mean
    // either loosening this threshold until it stopped measuring anything or
    // shrinking a touch target to make a test pass.
    const { ctx, page } = await open(browser, 1440, 900, path, '.lbry-toolbar', { touch: false })
    // POLL UNTIL IT SETTLES. The tray re-measures itself on document.fonts.ready
    // — the option widths move when the UI font swaps in — so a single read can
    // catch the toolbar mid-reflow and report a height no user ever sees. Read
    // 72px that way once while the settled value was 68px.
    heights[path] = await page.evaluate(async () => {
      const read = () => {
        const t = [...document.querySelectorAll('.lbry-toolbar')].find((x) => x.offsetParent !== null)
        return t ? Math.round(t.getBoundingClientRect().height) : null
      }
      await document.fonts.ready.catch(() => {})
      let last = read()
      for (let i = 0; i < 40; i++) {
        await new Promise((r) => setTimeout(r, 100))
        const next = read()
        if (next === last) return next
        last = next
      }
      return last
    })
    if (path === '/create/emoji') {
      // The collapse is only an improvement if the options are still reachable.
      const trigger = page.locator('.lbry-filtertrig').first()
      await trigger.click()
      const menu = page.locator('.lbry-filtermenu')
      await menu.waitFor({ state: 'visible' })
      const options = await menu.locator('.lbry-filter').count()
      expect(options, 'the collapsed emoji menu must still carry all 12 categories').toBe(12)
    }
    await ctx.close()
  }
  expect(
    Math.abs(heights['/create/icons'] - heights['/create/emoji']),
    `the two tabs of one page render toolbars of ${heights['/create/icons']}px and ${heights['/create/emoji']}px, so switching tabs moves the page`,
  ).toBeLessThanOrEqual(2)
})

// The same question, asked of the collapsed form, at the two widths inside the
// band. Three things have to hold for the collapse to be an improvement rather
// than a place to hide the options:
//
//   1. Every group is still represented — one trigger each, no group silently
//      dropped. This is the `rows` guard from the tray test: a selector that
//      matches nothing measures nothing and passes.
//   2. The trigger SAYS what the group is filtering by. A collapsed group with
//      no visible selection has hidden state rather than saved space, which is
//      the known failure mode of this pattern.
//   3. Opening it puts every option inside the menu's own box, and the menu is
//      not a horizontal scroller. That is the S4 measurement verbatim — the
//      collapse is only worth doing if it does not reintroduce the defect one
//      level down.
test('S4 · in the 641–980 band each Library filter collapses to a trigger that names its selection, and every option is inside the menu', async ({ browser }) => {
  budget(FILTER_TRAYS.length * COLLAPSED_WIDTHS.length)
  const damage = []
  for (const [path, , , groups, , , collapsedTriggers] of FILTER_TRAYS) {
    // A surface whose groups do not all have an expanded form states its
    // trigger count explicitly; everywhere else the two numbers agree.
    const expectedTriggers = collapsedTriggers ?? groups
    for (const w of COLLAPSED_WIDTHS) {
      // Wait on the TOOLBAR, not on the trigger. Waiting on the thing under
      // test turns "the collapse did not happen" into a 15s timeout with no
      // message; waiting on its container lets the count assertion below say
      // what was expected and what was found.
      const { ctx, page } = await open(browser, w, 900, path, '.lbry-toolbar', { touch: true })

      const triggers = page.locator('.lbry-filtertrig')
      const found = await triggers.count()
      if (found !== expectedTriggers) {
        damage.push(`${path} @${w}px: expected ${expectedTriggers} collapsed filter trigger(s), found ${found}`)
        await ctx.close()
        continue
      }

      for (let i = 0; i < found; i++) {
        const trigger = triggers.nth(i)
        // Read the two parts SEPARATELY. `textContent` runs the group name and
        // the selection together with no separator ("MoodAll"), so any check on
        // the concatenated string is really a check on the CSS that spaces
        // them. What has to be true is that both parts exist and say different
        // things — a trigger showing only its group name is the hidden-state
        // failure this pattern is judged on.
        const parts = await trigger.evaluate((el) => ({
          key: el.querySelector('.lbry-filtertrig-k')?.textContent?.trim() || '',
          value: el.querySelector('.lbry-filtertrig-v')?.textContent?.trim() || '',
        }))
        if (!parts.key) damage.push(`${path} @${w}px: trigger ${i} does not name its group`)
        if (!parts.value) damage.push(`${path} @${w}px: trigger ${i} names the group ("${parts.key}") but not its selection`)
        if (parts.key && parts.key === parts.value) {
          damage.push(`${path} @${w}px: trigger ${i} repeats "${parts.key}" instead of reporting a selection`)
        }
        await trigger.click()
        const menu = page.locator('.lbry-filtermenu')
        await menu.waitFor({ state: 'visible' })
        const r = await page.evaluate(() => {
          const m = document.querySelector('.lbry-filtermenu')
          const mb = m.getBoundingClientRect()
          const opts = [...m.querySelectorAll('.lbry-filter')]
          return {
            options: opts.length,
            outside: opts.filter((o) => {
              const b = o.getBoundingClientRect()
              return b.right > mb.right + 0.5 || b.left < mb.left - 0.5
            }).length,
            hScroll: m.scrollWidth > m.clientWidth + 1,
            inViewport: mb.left >= -0.5 && mb.right <= window.innerWidth + 0.5,
          }
        })
        if (!r.options) damage.push(`${path} @${w}px: trigger ${i} opened a menu with no options in it`)
        if (r.outside) damage.push(`${path} @${w}px: ${r.outside} of ${r.options} options outside the menu box`)
        if (r.hScroll) damage.push(`${path} @${w}px: the collapsed menu is a horizontal scroller`)
        if (!r.inViewport) damage.push(`${path} @${w}px: the collapsed menu hangs off the viewport edge`)
        await page.keyboard.press('Escape')
        await menu.waitFor({ state: 'detached' })
      }
      await ctx.close()
    }
  }
  expect(damage, damage.join('\n')).toEqual([])
})

const STC_WIDTHS = [320, 360, 390, 430, 480, 560, 768]

test('S3 · every Semantic Colours role preset is inside its own row', async ({ browser }) => {
  budget(STC_WIDTHS.length)
  const damage = []
  for (const w of STC_WIDTHS) {
    const { ctx, page } = await open(browser, w, 900, '/create/semantic-color', '.stc-role-presets', { touch: w < 800 })
    const r = await page.evaluate(() => {
      const rows = [...document.querySelectorAll('.stc-role-presets')]
      let outside = 0, total = 0, scrollers = 0
      for (const row of rows) {
        const rb = row.getBoundingClientRect()
        if (row.scrollWidth > row.clientWidth + 1) scrollers++
        for (const chip of row.querySelectorAll('.pt-t')) {
          total++
          const b = chip.getBoundingClientRect()
          if (b.right > rb.right + 0.5 || b.left < rb.left - 0.5) outside++
        }
      }
      return { rows: rows.length, outside, total, scrollers, ramps: document.querySelectorAll('.stc-ramp').length }
    })
    await ctx.close()
    // One preset row per role, whatever the role count is. Typed as 4 when
    // there were four roles; the point of the check is that no role LOSES its
    // row, which is a comparison against the ramps on the same page.
    expect(r.rows, `${w}px: expected one preset row per role`).toBe(r.ramps)
    expect(r.rows, `${w}px: no role rows rendered at all`).toBeGreaterThan(0)
    if (r.outside) damage.push(`${w}px: ${r.outside} of ${r.total} preset chips outside their row`)
    if (r.scrollers) damage.push(`${w}px: ${r.scrollers} preset row(s) are horizontal scrollers again`)
  }
  expect(damage, damage.join('\n')).toEqual([])
})

// ─────────────────────────────────────────────────────────────────────────────
// S5 · the feedback FAB on a short viewport
// ─────────────────────────────────────────────────────────────────────────────
// READ THIS BEFORE STRENGTHENING THIS TEST. The obvious assertion — "the FAB
// occludes nothing at the initial scroll position" — is one this fix does not
// deliver and CANNOT deliver, and asserting it would just be a red test.
//
// Sweeping /discover/prompts at 844px wide from 900px tall down to 360, the
// count of occluded controls goes 0,0,0,0,0,0,1,1,0,0,0,0,0,0,3,3,3,0: present
// at 530–500, gone at 480–430, back at 420–390, gone again at 360. It tracks
// where the page happens to lay controls out at that particular height, not the
// height itself. A `position:fixed` element over scrolling content covers
// whatever is beneath it; there is no threshold that makes that untrue.
//
// So the two properties worth pinning are the ones that are actually true and
// actually matter: the compact form fires on the axis that was missing, and
// nothing is ever PERMANENTLY covered.

const FAB_SHORT = [[844, 390], [932, 430], [844, 420], [844, 500]]
const FAB_ROOMY = [[1366, 600], [1280, 720], [1440, 900]]

async function fabState(page) {
  return page.evaluate(() => {
    const fab = document.querySelector('.global-feedback-btn')
    if (!fab) return null
    const r = fab.getBoundingClientRect()
    const label = fab.querySelector('span')
    return {
      w: Math.round(r.width), h: Math.round(r.height),
      compact: label ? getComputedStyle(label).display === 'none' : false,
    }
  })
}

test('S5 · the feedback FAB compacts on a short viewport and keeps its label on a roomy one', async ({ browser }) => {
  budget(FAB_SHORT.length + FAB_ROOMY.length)
  const damage = []
  for (const [w, h] of FAB_SHORT) {
    const { ctx, page } = await open(browser, w, h, '/discover/prompts', '.lbry-toolbar')
    const f = await fabState(page)
    await ctx.close()
    expect(f, `${w}x${h}: no feedback FAB`).not.toBeNull()
    if (!f.compact) damage.push(`${w}x${h}: FAB still carries its label at ${f.w}x${f.h} on a short viewport`)
    // Shrinking it must not push it under the 2.5.8 floor.
    if (f.w < 24 || f.h < 24) damage.push(`${w}x${h}: compact FAB is ${f.w}x${f.h}, under the 24px floor`)
  }
  for (const [w, h] of FAB_ROOMY) {
    const { ctx, page } = await open(browser, w, h, '/discover/prompts', '.lbry-toolbar', { touch: false })
    const f = await fabState(page)
    await ctx.close()
    if (f.compact) damage.push(`${w}x${h}: FAB dropped its label on a viewport with room for it`)
  }
  expect(damage, damage.join('\n')).toEqual([])
})

const FAB_COVER = [
  // Waits on the toolbar, not a chip: in the 641–980 band the trays collapse
  // to triggers, so no `.lbry-filter` is rendered at some of these shapes.
  ['/discover/prompts', '.lbry-toolbar', [...FAB_SHORT, [390, 844]]],
  ['/sitemap', '.smap-link-a', [[320, 568], [360, 560], [390, 640], [390, 844], [844, 390]]],
]

test('S5 / S10 · the FAB never permanently covers a control', async ({ browser }) => {
  budget(FAB_COVER.reduce((n, [, , shapes]) => n + shapes.length, 0))
  const damage = []
  for (const [path, waitFor, shapes] of FAB_COVER) {
    for (const [w, h] of shapes) {
      const { ctx, page } = await open(browser, w, h, path, waitFor)
      await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight))
      // Every rectangle below is read from a live layout, so the page has to
      // have stopped moving first. 500ms was a guess at how long that takes.
      await restingScrollY(page, `${path} at ${w}x${h}, scrolled to the bottom`)
      const covered = await page.evaluate(() => {
        const fab = document.querySelector('.global-feedback-btn')
        const out = []
        for (const el of document.querySelectorAll('a[href], button, input, select, textarea')) {
          if (el === fab || fab.contains(el)) continue
          const s = getComputedStyle(el)
          if (s.display === 'none' || s.visibility === 'hidden') continue
          const r = el.getBoundingClientRect()
          if (r.width === 0 || r.height === 0) continue
          // Every sampled point blocked = no way to press it here.
          let blocked = 0
          for (const f of [0.2, 0.5, 0.8]) {
            const top = document.elementFromPoint(r.left + r.width * f, r.top + r.height / 2)
            if (top && (top === fab || fab.contains(top))) blocked++
          }
          if (blocked === 3) out.push((el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 24))
        }
        return [...new Set(out)]
      })
      await ctx.close()
      if (covered.length) damage.push(`${path} ${w}x${h}: ${covered.length} control(s) still fully covered at the scroll end — ${covered.join(', ')}`)
    }
  }
  expect(damage, damage.join('\n')).toEqual([])
})

// ─────────────────────────────────────────────────────────────────────────────
// N8 · WCAG 2.5.8 Target Size (Minimum) on the Palette Builder
// ─────────────────────────────────────────────────────────────────────────────
// 2.5.8 is not "every target is 24x24". A smaller target still conforms under
// the SPACING exception: if a 24px-diameter circle centred on each undersized
// target touches no other target's circle, it passes. That distinction is the
// whole finding here — the audit listed eight controls as failures, and when the
// exception is applied only one of them actually fails.
//
// So the test implements the criterion, not the headline. It would otherwise
// fail on controls that conform, and this project does not need a test that
// cries wolf about the footer links on every route.
//
// The tonal ramp failed both halves: 14px wide with a 4px gap puts adjacent
// centres 18px apart, under the 24 the exception requires. It was also five
// identical buttons — same aria-label, same handler — so it is now one.

async function targetSizeFailures(page) {
  return page.evaluate(() => {
    const sel = 'a[href], button, input, select, textarea, [role="button"], [tabindex]:not([tabindex="-1"])'
    const shown = [...document.querySelectorAll(sel)].filter((el) => {
      const s = getComputedStyle(el)
      if (s.display === 'none' || s.visibility === 'hidden' || el.disabled) return false
      if (el.type === 'hidden' || el.type === 'file') return false
      const r = el.getBoundingClientRect()
      return r.width > 0 && r.height > 0
    })
    const boxes = shown.map((el) => ({ el, r: el.getBoundingClientRect() }))
    const fails = []
    for (const { el, r } of boxes) {
      if (r.width >= 24 && r.height >= 24) continue
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2
      for (const o of boxes) {
        if (o.el === el) continue
        const ox = o.r.left + o.r.width / 2, oy = o.r.top + o.r.height / 2
        if (Math.hypot(cx - ox, cy - oy) < 24) {
          const c = typeof el.className === 'string' ? el.className.split(' ')[0] : el.tagName.toLowerCase()
          fails.push(`${el.tagName.toLowerCase()}.${c} "${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 20)}" ${Math.round(r.width)}x${Math.round(r.height)}`)
          break
        }
      }
    }
    return { total: boxes.length, fails: [...new Set(fails)] }
  })
}

const PLB_TARGET_VIEWPORTS = [[390, 844], [769, 900], [834, 1194], [1024, 768], [1280, 900]]

test('N8 · no Palette Builder target is both under 24px and crowded', async ({ browser }) => {
  budget(PLB_TARGET_VIEWPORTS.length)
  const damage = []
  for (const [w, h] of PLB_TARGET_VIEWPORTS) {
    const { ctx, page } = await open(browser, w, h, '/create/palette', '.plb-col')
    const r = await targetSizeFailures(page)
    await ctx.close()
    expect(r.total, `${w}x${h}: expected interactive controls to have rendered`).toBeGreaterThan(20)
    if (r.fails.length) damage.push(`${w}x${h}: ${r.fails.length} target(s) fail 2.5.8 — ${r.fails.slice(0, 3).join(', ')}`)
  }
  expect(damage, damage.join('\n')).toEqual([])
})

test('N8 · the tonal ramp is one target per swatch and still opens the tints', async ({ browser }) => {
  budget(1)
  const { ctx, page } = await open(browser, 1280, 900, '/create/palette', '.plb-ramp')
  const before = await page.evaluate(() => ({
    ramps: document.querySelectorAll('.plb-ramp').length,
    // The bars must be decorative, not five copies of the same control.
    barButtons: document.querySelectorAll('button.plb-ramp-bar').length,
    box: (() => { const r = document.querySelector('.plb-ramp').getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)] })(),
    tintsOpen: document.querySelectorAll('.plb-tintpop').length,
  }))
  expect(before.ramps, 'expected one ramp per swatch column').toBe(5)
  expect(before.barButtons, 'the ramp bars must not be buttons — they were five identical ones').toBe(0)
  expect(before.box[0], `ramp target width ${before.box[0]}px`).toBeGreaterThanOrEqual(24)
  expect(before.box[1], `ramp target height ${before.box[1]}px`).toBeGreaterThanOrEqual(24)
  expect(before.tintsOpen).toBe(0)

  // The function has to survive the restructure, not just the geometry.
  // toHaveCount retries, where the `waitForTimeout(400)` this replaces was a
  // deadline: a popup that opened at 450ms was reported as a popup that never
  // opened. Still exactly one — a second copy is as much a defect as none.
  await page.locator('.plb-ramp').first().click()
  await expect(page.locator('.plb-tintpop'), 'clicking the ramp must still open the tints popup')
    .toHaveCount(1)
  await ctx.close()
})

/**
 * How many elements matching `selector` are clipped by their own box, and the
 * worst example. `scrollWidth` against `clientWidth` is geometry — the DOM text
 * of a truncated label is complete and identical to an untruncated one, so
 * nothing here can be asserted by reading it.
 */
function truncationCensus(page, selector) {
  return page.evaluate((sel) => {
    const cut = []
    let total = 0
    for (const el of document.querySelectorAll(sel)) {
      const s = getComputedStyle(el)
      if (s.display === 'none' || s.visibility === 'hidden') continue
      total++
      if (el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1) {
        cut.push({
          text: (el.value || el.textContent || '').trim().slice(0, 26),
          needs: el.scrollWidth, has: el.clientWidth,
        })
      }
    }
    cut.sort((a, b) => (b.needs - b.has) - (a.needs - a.has))
    return { total, cut }
  }, selector)
}

// ─────────────────────────────────────────────────────────────────────────────
// N4 · the tool-map tooltip — REMOVED WITH THE MAP
// ─────────────────────────────────────────────────────────────────────────────
// This asserted that no the map tooltip was clipped by `.home`'s
// `overflow-x:clip` across six narrow widths on /discover and /learn. The
// world map was deleted from both landings when they were compressed to a
// value proposition and their links (see the header comment in
// SurfaceLanding.jsx), and src/components/WorldMap.jsx went with it — so
// there is no tooltip left to clip. The rule it protected went too: the
// `@media(max-width:480px)` tip-wrap came out of global.css in the same
// commit as the section.

// ─────────────────────────────────────────────────────────────────────────────
// N3 · the Palette Builder swatch name
// ─────────────────────────────────────────────────────────────────────────────
// The audit records this at 480px only. It is 431–499, and the reason it looked
// like one width is that the names are generated per page load, so which of the
// five clip changes between runs. That also means this test cannot assert a
// specific name — it asserts that no name, whichever five turn up, is rendered
// narrower than the string it holds.
//
// 430 and 500+ are in the list because they were already clean: 430 because the
// reflow block below it wraps the tool row, 500+ because there is room. The fix
// must not disturb either.

const PLB_NAME_WIDTHS = [430, 440, 450, 460, 480, 500, 560, 640, 768]

test('N3 · no Palette Builder swatch name is crushed by the tool row', async ({ browser }) => {
  budget(PLB_NAME_WIDTHS.length)
  const damage = []
  for (const w of PLB_NAME_WIDTHS) {
    const { ctx, page } = await open(browser, w, 900, '/create/palette', '.plb-name')
    const r = await truncationCensus(page, '.plb-name')
    await ctx.close()
    expect(r.total, `${w}px: expected the five swatch names`).toBe(5)
    if (r.cut.length) {
      damage.push(`${w}px: ${r.cut.length} of 5 swatch names truncated — "${r.cut[0].text}" needs ${r.cut[0].needs}px, has ${r.cut[0].has}px`)
    }
  }
  expect(damage, damage.join('\n')).toEqual([])
})

// ─────────────────────────────────────────────────────────────────────────────
// N2 · the gradient stop's hex input
// ─────────────────────────────────────────────────────────────────────────────
// It clipped its own value in two bands, rendering "#7C3AED" as "#7C3AE" — a
// plausible but wrong colour, which is worse than an obviously truncated one.
//
// The cause was specificity, not width: `.ggn-stop-hex` is (0,1,0) and loses to
// the global `input[type="text"]` rule at (0,1,1), so the field never got its
// mono font or its zero padding. The test therefore also asserts the FONT, not
// just the fit — a future width tweak could make the value fit while leaving the
// field in the wrong family, and this defect would come back the next time a
// value got one character longer.

// 481 and 600 joined when the stop list went to one column (2026-09-23): between
// 481 and 640 the global mobile form floor sets the field in 16px, and a
// one-line row with 44px touch controls left "#7C3AED" 51px of a 69px need.
const GGN_WIDTHS = [320, 340, 350, 390, 481, 600, 769, 780, 800, 900]

test('N2 · the gradient stop hex input shows its whole value', async ({ browser }) => {
  budget(GGN_WIDTHS.length)
  const damage = []
  for (const w of GGN_WIDTHS) {
    const { ctx, page } = await open(browser, w, 900, '/create/gradient', '.ggn-stop-hex', { touch: w < 800 })
    const r = await page.evaluate(() => {
      const inputs = [...document.querySelectorAll('.ggn-stop-hex')]
      return {
        total: inputs.length,
        cut: inputs.filter((el) => el.scrollWidth > el.clientWidth + 1)
          .map((el) => `"${el.value}" needs ${el.scrollWidth}px, has ${el.clientWidth}px`),
        family: inputs.length ? getComputedStyle(inputs[0]).fontFamily : '',
      }
    })
    await ctx.close()
    expect(r.total, `${w}px: expected the gradient stops`).toBeGreaterThan(1)
    if (r.cut.length) damage.push(`${w}px: ${r.cut.length} of ${r.total} hex inputs clip their value — ${r.cut[0]}`)
    if (!/mono/i.test(r.family)) damage.push(`${w}px: hex input is not rendering in the mono face (${r.family})`)
  }
  expect(damage, damage.join('\n')).toEqual([])
})

// ─────────────────────────────────────────────────────────────────────────────
// N1 · Font Gallery family names
// ─────────────────────────────────────────────────────────────────────────────
// The family name IS the content of a font gallery, and 320px is a hard floor
// this project has committed to. 380 and 430 are in the list because they were
// already clean and the fix must not disturb them.

const FG_WIDTHS = [320, 360, 380, 430]

test('N1 · no font family name is truncated down to the 320px floor', async ({ browser }) => {
  budget(FG_WIDTHS.length)
  const damage = []
  for (const w of FG_WIDTHS) {
    const { ctx, page } = await open(browser, w, 900, '/create/font-gallery', '.fg-card-name')
    const r = await truncationCensus(page, '.fg-card-name')
    await ctx.close()
    expect(r.total, `${w}px: expected the font cards to have rendered`).toBeGreaterThan(20)
    if (r.cut.length) {
      damage.push(`${w}px: ${r.cut.length} of ${r.total} family names truncated — "${r.cut[0].text}" needs ${r.cut[0].needs}px, has ${r.cut[0].has}px`)
    }
  }
  expect(damage, damage.join('\n')).toEqual([])
})

// ─────────────────────────────────────────────────────────────────────────────
// M6 · Gradient Library card footers
// ─────────────────────────────────────────────────────────────────────────────
// The name is the only way to identify a gradient and the meta line is the only
// way to tell a 2-stop from a 3-stop without opening it, so a truncated footer
// makes a 100-card library unbrowsable. 440px was clean and 450px was not,
// because that is where the grid takes a second column.
//
// The widths below straddle both edges of the band on purpose. 440 and 1180 were
// already clean and must stay clean — the fix that the audit proposed (raise the
// grid minimum) would also have passed a test that only looked inside 450–579,
// while quietly making the grid 262% taller, and this suite has been caught by a
// fix that helped the page and hurt the cards before.
//
// THE NAME AND META SELECTORS WERE STALE, in the same way and by the same PR as
// S4's above. PR #254 moved this card's anatomy onto the shared `LibraryCard`,
// so the footer lines are `.lbry-card-name` / `.lbry-card-meta` and `.grg-name`
// / `.grg-meta` no longer exist. Unlike S4 that did not fail: the census loops
// over `querySelectorAll`, which returned nothing, so it found no truncation and
// reported none, at all nine widths, for as long as it took to notice. Both are
// scoped through `.grg-card` — the shared class is on four surfaces now, and
// this test is about this one — and the per-card counts below are asserted so a
// third rename cannot make it vacuous again instead of red.

/* 1024 AND 1280 WERE ADDED AFTER THE SWEEP MISSED A LIVE DEFECT.
 *
 * The founder's rule here is that no gradient name or meta line is truncated at
 * ANY width. This list stopped at 1180, and when the library restyle bumped the
 * card name from 14px to 16px it cut **13 of 100 names at 1280** and one at
 * 1024 — neither width swept, so the sweep stayed green while the rule was
 * being broken on the commonest desktop size there is.
 *
 * The narrow widths below are where a card is tightest, which is the intuition
 * that built this list. It is the wrong intuition: the name's room is decided by
 * the CARD's width, not the viewport's, and a four-column band at 1280 gives a
 * narrower card than a two-column band at 700. A column-count change is exactly
 * where that flips, so the sweep has to cross one. */
const GRG_WIDTHS = [320, 440, 450, 480, 530, 560, 640, 700, 1024, 1180, 1280]

// SIGNED IN AS PRO, AND THE COUNT COMES FROM THE MODULE.
//
// This asked for "the 100-card library" signed out and got three. That is the
// tier cap doing exactly its job — GALLERY_TIER_LIMITS gives an anonymous
// visitor 3 gallery rows, a free account 10 and Pro the lot — and a truncation
// census over three cards is not a census. The whole point of walking nine
// widths is to see every name and every meta line in the collection, so the
// viewer who can see the collection is the right one to walk it as. The cap
// itself is 44-locked-library-tease's and the unit suite's to guard.
//
// The expected count is `GALLERY_GRADIENTS.length` rather than the 100 that was
// typed here: the census is over the library, so it should ask the library how
// big it is.
test('M6 · no gradient name or meta line is truncated at any width', async ({ browser }) => {
  budget(GRG_WIDTHS.length)
  const damage = []
  for (const w of GRG_WIDTHS) {
    const { ctx, page } = await open(browser, w, 900, '/discover/gradients', '.grg-card', { as: { plan: 'pro' } })
    const r = await page.evaluate(() => {
      const cut = (sel) => {
        const out = []
        for (const el of document.querySelectorAll(sel)) {
          if (el.scrollWidth > el.clientWidth + 1) {
            out.push(`"${el.textContent.trim()}" needs ${el.scrollWidth}px, has ${el.clientWidth}px`)
          }
        }
        return out
      }
      // The footer must not fix itself by shrinking its own actions below the
      // 2.5.8 floor, or by stacking them on top of each other.
      let tiny = 0, collided = 0
      for (const card of document.querySelectorAll('.grg-card')) {
        const acts = [...card.querySelectorAll('.grg-copy, .grg-open')]
        for (const a of acts) {
          const b = a.getBoundingClientRect()
          if (b.width < 24 || b.height < 24) tiny++
        }
        for (let i = 0; i < acts.length; i++) {
          for (let j = i + 1; j < acts.length; j++) {
            const a = acts[i].getBoundingClientRect(), b = acts[j].getBoundingClientRect()
            if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 &&
                Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1) collided++
          }
        }
      }
      return {
        cards: document.querySelectorAll('.grg-card').length,
        nameCount: document.querySelectorAll('.grg-card .lbry-card-name').length,
        metaCount: document.querySelectorAll('.grg-card .lbry-card-meta').length,
        names: cut('.grg-card .lbry-card-name'), metas: cut('.grg-card .lbry-card-meta'), tiny, collided,
      }
    })
    await ctx.close()
    expect(
      r.cards,
      `${w}px: expected the whole ${GALLERY_GRADIENTS.length}-card library and found ${r.cards}`
      + ' — a Pro account sees all of it, so a short count here is the sign-in not taking rather than the cap',
    ).toBe(GALLERY_GRADIENTS.length)
    // One name and one meta line per card, or the census below measured nothing
    // and its silence means nothing.
    expect(r.nameCount, `${w}px: expected a name on each of the ${r.cards} cards, found ${r.nameCount} — the card footer has changed shape`).toBe(r.cards)
    expect(r.metaCount, `${w}px: expected a meta line on each of the ${r.cards} cards, found ${r.metaCount} — the card footer has changed shape`).toBe(r.cards)
    if (r.names.length) damage.push(`${w}px: ${r.names.length} of ${r.cards} gradient names truncated — ${r.names[0]}`)
    if (r.metas.length) damage.push(`${w}px: ${r.metas.length} of ${r.cards} meta lines truncated — ${r.metas[0]}`)
    if (r.tiny) damage.push(`${w}px: ${r.tiny} footer action(s) under 24px`)
    if (r.collided) damage.push(`${w}px: ${r.collided} footer action pair(s) overlapping`)
  }
  expect(damage, damage.join('\n')).toEqual([])
})

// ─────────────────────────────────────────────────────────────────────────────
// Founder report 2026-08-24 · Palette Builder on a short DESKTOP viewport
// ─────────────────────────────────────────────────────────────────────────────
// "there are still clipping issues on the pallete builder on smaller desktop
// screens and other shapes like 4:3".
//
// Both audits swept WIDTH at a fixed 900px height and only went short at PHONE
// widths, so this combination — desktop width, short viewport — was never
// tested. It is not exotic: a 1024x768 or 1366x768 screen with browser chrome
// leaves roughly a 608px viewport, and that is inside the broken band.
//
// The fault is vertical, and it is the same SHAPE as the two blockers this
// surface has already produced — a number that stopped being true just outside
// where it was written. `.plb-board` asserted `min-height:420px`; a column
// needs 428 (tool stack 18..278, in-flow stack 124, padding-bottom 26). Because
// an explicit min-height REPLACES a flex item's content-derived minimum, the
// board stayed pinned at 420 and the two ends of the column grew into each
// other. So the assertion is not "the board is at least N px" — that would just
// re-assert a magic number, and it is the assertion that failed us. It is "the
// tool stack does not reach the content stack", which stays true whatever the
// tool stack later becomes.
//
// Tall shapes are included on purpose: the fix moves the tool stack into flow,
// and a fix that quietly changed the desktop layout would pass a
// short-viewport-only test.

const PLB_DESKTOP = [
  [1024, 768], [1024, 608], [1152, 864], [1152, 704],
  [1280, 960], [1280, 800], [1280, 720],
  [1366, 768], [1366, 608], [1440, 900], [1600, 1200],
]

test('Palette Builder swatch tools never reach the swatch content on a short desktop viewport', async ({ browser }) => {
  budget(PLB_DESKTOP.length)
  const damage = []
  for (const [w, h] of PLB_DESKTOP) {
    // Deliberately NOT a touch context: this is a desktop/laptop defect, and the
    // tools are opacity:0 until hover on a pointer device — which changes
    // nothing about their box, and is exactly why it goes unnoticed.
    const { ctx, page } = await open(browser, w, h, '/create/palette', '.plb-col', { touch: false })
    const r = await page.evaluate(() => {
      const cols = [...document.querySelectorAll('.plb-col')]
      const board = document.querySelector('.plb-board')
      const hits = []
      for (const col of cols) {
        const tools = col.querySelector('.plb-col-tools')
        if (!tools) continue
        const tb = tools.getBoundingClientRect()
        for (const sel of ['.plb-ramp', '.plb-name', '.plb-hex', '.plb-role', '.plb-badge']) {
          const el = col.querySelector(sel)
          if (!el) continue
          const s = getComputedStyle(el)
          if (s.display === 'none') continue
          const r2 = el.getBoundingClientRect()
          if (r2.height === 0) continue
          const over = Math.min(tb.bottom, r2.bottom) - Math.max(tb.top, r2.top)
          const across = Math.min(tb.right, r2.right) - Math.max(tb.left, r2.left)
          if (over > 1 && across > 1) hits.push(`${sel} by ${Math.round(over)}px`)
        }
      }
      return {
        cols: cols.length,
        boardH: Math.round(board.getBoundingClientRect().height),
        hits,
      }
    })
    await ctx.close()
    expect(r.cols, `${w}x${h}: expected the five palette columns`).toBe(5)
    if (r.hits.length) {
      damage.push(`${w}x${h}: the tool stack overlaps swatch content ${r.hits.length}x in a ${r.boardH}px board — ${[...new Set(r.hits)].join(', ')}`)
    }
  }
  expect(damage, damage.join('\n')).toEqual([])
})

// ─────────────────────────────────────────────────────────────────────────────
// M1 · Palette Builder swatch controls on a real phone
// ─────────────────────────────────────────────────────────────────────────────
// This is a HEIGHT defect, not a width one, which is why the responsive audit's
// width sweep at 900px tall reported the page clean. Every phone in portrait is
// shorter than that (iPhone 14 Pro ≈ 390x664 usable, Pixel ≈ 393x730), so the
// viewport list below is the one that matters and 390x844 alone would pass on
// the broken build.
//
// The assertion is hit-testing, not overlap. Overlap alone under-reports: at
// 390x844 the two wrapped lines already overlapped by 9px on the broken build
// while no two INTERACTIVE boxes crossed, so an overlap-only check called it
// clean. What a user experiences is "I pressed lock and something else
// happened", and that is `elementFromPoint`.

const PLB_VIEWPORTS = [[320, 568], [360, 560], [390, 640], [390, 760], [390, 844], [430, 932]]

test('M1 · every Palette Builder swatch control is tappable on a short phone', async ({ browser }) => {
  budget(PLB_VIEWPORTS.length)
  const damage = []
  for (const [w, h] of PLB_VIEWPORTS) {
    const { ctx, page } = await open(browser, w, h, '/create/palette', '.plb-col')
    const r = await page.evaluate(() => {
      const label = (el) => {
        if (!el) return 'null'
        const c = typeof el.className === 'string' ? el.className : (el.className?.baseVal || '')
        return c.split(' ')[0] || el.tagName.toLowerCase()
      }
      const cols = [...document.querySelectorAll('.plb-col')]
      const controls = [...document.querySelectorAll('.plb-col button')]
        .filter((el) => { const b = el.getBoundingClientRect(); return b.width > 0 && b.height > 0 })
      const misses = []
      for (const el of controls) {
        const b = el.getBoundingClientRect()
        // Only points actually on screen can be pressed; skip the rest rather
        // than counting them as either pass or fail.
        const y = b.top + b.height / 2
        if (y < 0 || y > innerHeight) continue
        for (const f of [0.2, 0.5, 0.8]) {
          const hit = document.elementFromPoint(b.left + b.width * f, y)
          if (!hit || (hit !== el && !el.contains(hit))) {
            misses.push(`"${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 24)}" at ${Math.round(f * 100)}% hits ${label(hit)}`)
            break
          }
        }
      }
      return {
        cols: cols.length,
        rowH: cols.length ? Math.round(cols[0].getBoundingClientRect().height) : 0,
        controls: controls.length,
        misses,
      }
    })
    await ctx.close()
    expect(r.cols, `${w}x${h}: expected the five palette columns`).toBe(5)
    // The floor moved with the row. Each column paints its hex plus Lock, Copy
    // and More — four buttons — so five columns give 20. It was eight per column
    // before the <=768 collapse, which is where `> 20` came from. This is a
    // positive control, not the assertion: it exists so that `r.misses` being
    // empty cannot mean "nothing rendered to miss".
    expect(r.controls, `${w}x${h}: expected the per-swatch controls to be rendered`).toBeGreaterThanOrEqual(20)
    if (r.misses.length) {
      damage.push(`${w}x${h}: ${r.misses.length} of ${r.controls} swatch controls are covered (row is ${r.rowH}px tall) — ${r.misses.slice(0, 3).join('; ')}`)
    }
  }
  expect(damage, damage.join('\n')).toEqual([])
})

// THE PACK LABEL UNDER EVERY ICON CELL.
// The 2026-09-01 audit found /create/icons repeating a tiny pack label under
// every cell; #298 dropped it below 980px and left it above, where it still
// drew "LUCIDE" under all 120 cells of the default single-pack grid. A word
// identical across the whole grid discriminates nothing, and it was costing a
// line to the one thing that does discriminate - the icon's own name.
// Both halves are asserted, because only the pair is the actual rule. Dropping
// the label everywhere would pass the first assertion and is NOT the fix:
// where a set genuinely mixes packs, the word is the only thing telling two
// identical-looking brand marks apart.
test('the icon grid labels the pack only when the results actually mix packs', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await ctx.newPage()
  watch(page, 'a designer browsing icons on a laptop')
  // PRO, BECAUSE THIS TEST IS ABOUT THE LABEL RULE AND NOT ABOUT THE PAYWALL.
  // The rule is "name the pack only when the result set holds more than one",
  // and it needs a genuinely SINGLE-pack default grid to be falsifiable. Since
  // the pack tiers landed (src/data/iconPackTiers.js) that is a Pro viewer: one
  // browses 250 names from each of 25 packs, so the first page of 120 cells is
  // all Lucide. A signed-out viewer gets the 60-icon sample — twelve from each
  // of five outlined packs — which genuinely mixes packs and therefore SHOULD
  // label every cell, so it satisfies the rule by the other branch and measures
  // nothing here. The second half needs Pro too: Brand logos is a Pro pack, and
  // signed out the chip answers with a wall rather than a mixed grid.
  await signIn(page, { plan: 'pro' })
  await go(page, '/create/icons')
  await page.locator('.ic').first().waitFor({ timeout: 20000 })

  const read = () => page.evaluate(() => {
    const visible = [...document.querySelectorAll('.ic .ic-pack')]
      .filter((n) => getComputedStyle(n).display !== 'none')
    const packs = [...document.querySelectorAll('.ic')].length
    return {
      cells: packs,
      labels: visible.length,
      words: [...new Set(visible.map((n) => n.textContent.trim().toLowerCase()))],
      fontSize: visible[0] ? Math.round(parseFloat(getComputedStyle(visible[0]).fontSize)) : null,
    }
  })

  const single = await read()
  expect(single.cells, 'the default grid should be populated').toBeGreaterThan(20)
  expect(single.words, 'a single-pack grid must not repeat one pack name under every cell')
    .toEqual([])

  // Brand logos genuinely mixes packs - logo.dev marks alongside glyph packs.
  const chip = page.getByRole('button', { name: /Brand logos/i }).first()
  await chip.click()
  await expect.poll(async () => (await read()).words.length, {
    message: 'a mixed-pack result set must still name each cell’s pack',
    timeout: 20000,
  }).toBeGreaterThan(1)

  const mixed = await read()
  expect(mixed.labels, 'every cell in a mixed set carries its pack').toBe(mixed.cells)
  // 9px was below the smallest size in the type scale; --fs-micro is 11px.
  expect(mixed.fontSize, 'the pack label must not sit under the type scale floor')
    .toBeGreaterThanOrEqual(11)
  await ctx.close()
})
