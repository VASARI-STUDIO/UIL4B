// The defect sweep — the leftovers of the two August 2026 QA audits.
//
// docs/qa/responsive-audit-2026-08.md (M1, M6, N1–N8) and
// docs/qa/mobile-audit-2026-08.md (S3, S4, S5, S10, and S16 above 768px),
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
import { test, expect } from '@playwright/test'
import { watch } from './helpers.js'

const IOS_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
const IPAD_UA = 'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'

/**
 * Open `path` at an exact viewport under real touch device metrics.
 * `waitFor` is a selector that must be attached before the measurement runs —
 * a fixed sleep is not allowed to be the thing that decides whether the element
 * exists, which is a trap this suite has already been caught by once.
 */
async function open(browser, width, height, path, waitFor, { touch = true } = {}) {
  const tablet = width >= 700
  const ctx = await browser.newContext({
    viewport: { width, height },
    ...(touch ? { deviceScaleFactor: tablet ? 2 : 3, isMobile: true, hasTouch: true, userAgent: tablet ? IPAD_UA : IOS_UA } : {}),
  })
  const page = await ctx.newPage()
  watch(page, `defect sweep ${width}x${height} ${path}`)
  // Google One Tap is live signed out and would sit over the controls being
  // hit-tested. Served empty rather than aborted: an abort raises a console
  // error the feedback loop then reports on every viewport.
  await page.route('**accounts.google.com/gsi/**', (r) => r.fulfill({
    status: 200, contentType: 'application/javascript', body: '',
  }).catch(() => {}))
  await page.goto(path, { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('load').catch(() => {})
  if (waitFor) await page.locator(waitFor).first().waitFor({ state: 'attached', timeout: 15000 })
  await page.waitForTimeout(400)
  return { ctx, page }
}

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

test('N8 · no Palette Builder target is both under 24px and crowded', async ({ browser }) => {
  const damage = []
  for (const [w, h] of [[390, 844], [769, 900], [834, 1194], [1024, 768], [1280, 900]]) {
    const { ctx, page } = await open(browser, w, h, '/color/palette', '.plb-col')
    const r = await targetSizeFailures(page)
    await ctx.close()
    expect(r.total, `${w}x${h}: expected interactive controls to have rendered`).toBeGreaterThan(20)
    if (r.fails.length) damage.push(`${w}x${h}: ${r.fails.length} target(s) fail 2.5.8 — ${r.fails.slice(0, 3).join(', ')}`)
  }
  expect(damage, damage.join('\n')).toEqual([])
})

test('N8 · the tonal ramp is one target per swatch and still opens the tints', async ({ browser }) => {
  const { ctx, page } = await open(browser, 1280, 900, '/color/palette', '.plb-ramp')
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
  await page.locator('.plb-ramp').first().click()
  await page.waitForTimeout(400)
  const after = await page.evaluate(() => document.querySelectorAll('.plb-tintpop').length)
  await ctx.close()
  expect(after, 'clicking the ramp must still open the tints popup').toBe(1)
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
// N1 · Font Gallery family names
// ─────────────────────────────────────────────────────────────────────────────
// The family name IS the content of a font gallery, and 320px is a hard floor
// this project has committed to. 380 and 430 are in the list because they were
// already clean and the fix must not disturb them.

test('N1 · no font family name is truncated down to the 320px floor', async ({ browser }) => {
  const damage = []
  for (const w of [320, 360, 380, 430]) {
    const { ctx, page } = await open(browser, w, 900, '/fontgallery', '.fg-card-name')
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

const GRG_WIDTHS = [320, 440, 450, 480, 530, 560, 640, 700, 1180]

test('M6 · no gradient name or meta line is truncated at any width', async ({ browser }) => {
  const damage = []
  for (const w of GRG_WIDTHS) {
    const { ctx, page } = await open(browser, w, 900, '/discover/gradients', '.grg-card')
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
        names: cut('.grg-name'), metas: cut('.grg-meta'), tiny, collided,
      }
    })
    await ctx.close()
    expect(r.cards, `${w}px: expected the 100-card library`).toBe(100)
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
  const damage = []
  for (const [w, h] of PLB_DESKTOP) {
    // Deliberately NOT a touch context: this is a desktop/laptop defect, and the
    // tools are opacity:0 until hover on a pointer device — which changes
    // nothing about their box, and is exactly why it goes unnoticed.
    const { ctx, page } = await open(browser, w, h, '/color/palette', '.plb-col', { touch: false })
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
  const damage = []
  for (const [w, h] of PLB_VIEWPORTS) {
    const { ctx, page } = await open(browser, w, h, '/color/palette', '.plb-col')
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
    expect(r.controls, `${w}x${h}: expected the per-swatch controls to be rendered`).toBeGreaterThan(20)
    if (r.misses.length) {
      damage.push(`${w}x${h}: ${r.misses.length} of ${r.controls} swatch controls are covered (row is ${r.rowH}px tall) — ${r.misses.slice(0, 3).join('; ')}`)
    }
  }
  expect(damage, damage.join('\n')).toEqual([])
})
