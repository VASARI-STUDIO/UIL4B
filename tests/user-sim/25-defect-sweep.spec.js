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
