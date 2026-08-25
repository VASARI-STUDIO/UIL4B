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
