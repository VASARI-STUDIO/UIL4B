// UNDER A COARSE POINTER, EVERY CONTROL QA FOUND SHORT REACHES 44px.
//
// QA on #487 measured these at 390 on a touch context: /community's heart (28),
// filter chips (38) and sort buttons (33); /settings' section tabs (40); the
// sign-in gate's "Use email instead" (38, alt-text and auto-builder); the
// slider value on /create/tint (24); the dialog close (32); and a project's
// name on /projects (24). The house floor on a coarse pointer is 44.
//
// Measured as a HIT AREA, not a box: a point 21px above and below the centre
// (and left and right, where the box is narrower than 44) must land on the
// control. That accepts either honest way to reach 44 — a taller box, or an
// invisible ring around a control whose painted size is part of the design —
// and rejects a box that only looks bigger.
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'

async function hitArea(page, selector) {
  return page.evaluate((sel) => {
    const el = [...document.querySelectorAll(sel)].find((e) => {
      const r = e.getBoundingClientRect()
      return r.width > 0 && r.height > 0 && r.top >= 0 && r.bottom <= innerHeight
    })
    if (!el) return { missing: true }
    const r = el.getBoundingClientRect()
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    const lands = (x, y) => { const hit = document.elementFromPoint(x, y); return !!hit && (hit === el || el.contains(hit)) }
    const probes = { up: [cx, cy - 21], down: [cx, cy + 21] }
    if (r.width < 44) Object.assign(probes, { left: [cx - 21, cy], right: [cx + 21, cy] })
    const misses = Object.entries(probes).filter(([, [x, y]]) => !lands(x, y)).map(([k]) => k)
    return { w: Math.round(r.width), h: Math.round(r.height), misses }
  }, selector)
}

const CASES = [
  { route: '/community', sels: ['.ch-filter', '.ch-sort-btn', '.ch-heart'] },
  { route: '/settings', signin: true, sels: ['.settings-nav-item'] },
  { route: '/create/alt-text', sels: ['.auth-gate-actions .btn-s'] },
  { route: '/create/auto-builder', sels: ['.auth-gate-actions .btn-s'] },
  { route: '/create/tint', sels: ['.snapv-value'] },
  { route: '/login', sels: ['.ui-login-x'] },
  { route: '/projects', signin: true, sels: ['.uh-card-name'] },
]

for (const c of CASES) {
  test(`${c.route}: ${c.sels.join(', ')} reach 44px under a coarse pointer`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
    const page = await ctx.newPage()
    watch(page, 'someone on a phone reaching for a small control')
    if (c.signin) await signIn(page, { plan: 'free', projects: 2 })
    await go(page, c.route)
    // POSITIVE CONTROL: the context really is a coarse pointer.
    expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true)
    for (const sel of c.sels) {
      const loc = page.locator(sel).first()
      await expect(loc, `${sel} is not on ${c.route}`).toBeAttached({ timeout: 15000 })
      await loc.scrollIntoViewIfNeeded()
      // Settle on the animation layer: a dialog measured mid-entrance is scaled.
      await page.evaluate(() => Promise.all(document.getAnimations()
        .filter((a) => a.effect?.getComputedTiming().endTime !== Infinity)
        .map((a) => a.finished.catch(() => {}))))
      const m = await hitArea(page, sel)
      expect(m.missing, `${sel} has no painted instance on screen`).toBeFalsy()
      expect(m.misses, `${sel} (${m.w}x${m.h}) — taps this far from its centre miss it`).toEqual([])
    }
    await ctx.close()
  })
}
