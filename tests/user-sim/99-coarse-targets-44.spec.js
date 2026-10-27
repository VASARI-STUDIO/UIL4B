// UNDER A COARSE POINTER, EVERY CONTROL QA FOUND SHORT REACHES 44px.
//
// QA on #487 measured these at 390 on a touch context: /community's heart (28),
// filter chips (38) and sort buttons (33); /settings' section tabs (40); the
// sign-in gate's "Use email instead" (38, alt-text and auto-builder — those
// tools now open signed out, so their own controls are measured instead); the
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
  { route: '/create/alt-text', sels: ['[data-tool-toolbar] .tl-btn--accent', '.alt-field', '.alt-length .tl-pill'] },
  { route: '/create/auto-builder', sels: ['.bs-btn--primary'] },
  // The output-format choices: the radio itself is the whole tile, so the
  // control a finger lands on is 44px tall, not a 20px box inside a label.
  { route: '/create/3d-converter', sels: ['.v3d-out input'] },
  { route: '/create/tint', sels: ['.tt-iconbtn', '.tt-picker', '.tt-hex-input'] },
  // The /login page: the Google button and the wall's pause button (a phone
  // gets the band, which carries it).
  { route: '/login', sels: ['.auth-google-btn', '.aw-pause'] },
  // The sign-in dialog's close control, opened from the header's Menu.
  {
    route: '/learn/help',
    label: '/learn/help (sign-in dialog)',
    open: async (page) => {
      await page.getByRole('button', { name: 'Open menu' }).click()
      await page.locator('.pnav-sheet').getByRole('button', { name: 'Log in', exact: true }).click()
    },
    sels: ['.ui-login-x'],
  },
  { route: '/projects', signin: true, sels: ['.uh-card-name'] },
  // The sales page's bench header and the sales footer's link rows.
  { route: '/', sels: ['.sp-shuffle'] },
  { route: '/plans', sels: ['.sp-footer .sp-footer-col a'] },
]

for (const c of CASES) {
  test(`${c.label || c.route}: ${c.sels.join(', ')} reach 44px under a coarse pointer`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
    const page = await ctx.newPage()
    watch(page, 'someone on a phone reaching for a small control')
    if (c.signin) await signIn(page, { plan: 'free', projects: 2 })
    await go(page, c.route)
    if (c.open) await c.open(page)
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

// Controls drawn closer together than 44px cannot each own a 44px square; what
// they must not do is steal each other's taps. The seed swatches on / sit 3px
// apart: a tap 10px either side of a swatch's centre still lands inside its own
// painted box, so it must pick that swatch and not a neighbour's hit area.
test('/: a tap beside a seed swatch picks that swatch, not its neighbour', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
  const page = await ctx.newPage()
  watch(page, 'someone on a phone choosing a seed colour')
  await go(page, '/')
  expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true)
  const seeds = page.locator('.sp-seeds .sp-seed')
  await expect(seeds.first()).toBeVisible({ timeout: 15000 })
  await seeds.first().scrollIntoViewIfNeeded()
  const result = await page.evaluate(() => {
    const chips = [...document.querySelectorAll('.sp-seeds .sp-seed')]
    return chips.map((el, i) => {
      const r = el.getBoundingClientRect()
      const cx = r.left + r.width / 2
      const cy = r.top + r.height / 2
      const at = (x, y) => chips.indexOf(document.elementFromPoint(x, y)?.closest('.sp-seed'))
      return { i, left: at(cx - 10, cy), right: at(cx + 10, cy), up: at(cx, cy - 21) }
    })
  })
  expect(result.length, 'no seed swatches rendered — this test would pass vacuously').toBeGreaterThan(1)
  for (const s of result) {
    expect(s.left, `a tap 10px left of seed ${s.i}'s centre picks seed ${s.left}`).toBe(s.i)
    expect(s.right, `a tap 10px right of seed ${s.i}'s centre picks seed ${s.right}`).toBe(s.i)
    expect(s.up, `a tap 21px above seed ${s.i}'s centre misses it`).toBe(s.i)
  }
  await ctx.close()
})

// A hairline between groups in the tools sheet runs straight: the row under it
// squares its top corners instead of bending the line into its radius.
test('/create/palette: the tools sheet dividers run straight', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
  const page = await ctx.newPage()
  watch(page, 'someone on a phone opening the palette tools')
  await go(page, '/create/palette')
  await page.locator('.tl-more-btn').first().tap()
  await expect(page.locator('.tl-sheet-layer .tl-sheet')).toBeVisible()
  const divided = await page.evaluate(() => [...document.querySelectorAll('.tl-sheet-layer .tl-menu-row')]
    .filter((el) => parseFloat(getComputedStyle(el).borderTopWidth) > 0)
    .map((el) => ({ label: el.textContent.trim(), radii: [getComputedStyle(el).borderTopLeftRadius, getComputedStyle(el).borderTopRightRadius] })))
  expect(divided.length, 'no row in the sheet carries a divider — this test would pass vacuously').toBeGreaterThan(0)
  for (const row of divided) {
    expect(row.radii, `"${row.label}" bends its divider into rounded corners`).toEqual(['0px', '0px'])
  }
  await ctx.close()
})

// The bench's Shuffle is a 36px icon button (drawn size, by design) whose 44px
// hit area is an invisible ::after ring. The generic probe above only samples
// the four points on the centre's axes; this one measures the ring as a SQUARE:
// all four corners of a 44px box land on the button, a point well outside it
// does not (so a stray full-width overlay cannot pass), and a real touch tap at
// a corner of the ring shuffles the seed.
test('/: Shuffle is drawn 36px, its ring is 44px, and a tap on the ring corner shuffles', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
  const page = await ctx.newPage()
  watch(page, 'someone on a phone tapping the shuffle button')
  await go(page, '/')
  expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true)
  const shuffle = page.locator('.sp-panel .sp-shuffle').first()
  await expect(shuffle).toBeVisible({ timeout: 15000 })
  await shuffle.scrollIntoViewIfNeeded()

  const m = await shuffle.evaluate((el) => {
    const r = el.getBoundingClientRect()
    const ring = getComputedStyle(el, '::after')
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    const lands = (x, y) => { const hit = document.elementFromPoint(x, y); return !!hit && (hit === el || el.contains(hit)) }
    return {
      drawn: [Math.round(r.width), Math.round(r.height)],
      ring: [parseFloat(ring.width), parseFloat(ring.height)],
      ringPosition: ring.position,
      corners: [[-21, -21], [21, -21], [-21, 21], [21, 21]].map(([dx, dy]) => lands(cx + dx, cy + dy)),
      outside: [[-26, 0], [26, 0], [0, -26], [0, 26]].map(([dx, dy]) => lands(cx + dx, cy + dy)),
      cx, cy,
    }
  })
  expect(m.drawn, 'the Shuffle button is no longer drawn at 36 x 36').toEqual([36, 36])
  expect(m.ringPosition, 'the hit ring is not an absolutely positioned ::after').toBe('absolute')
  expect(m.ring, 'the ::after hit ring is not 44 x 44').toEqual([44, 44])
  expect(m.corners, 'a corner of the 44px square misses the button').toEqual([true, true, true, true])
  expect(m.outside, 'the hit area reaches well past 44px').toEqual([false, false, false, false])

  const name = page.locator('.sp-panel .sp-seed-name b').first()
  const before = await name.innerText()
  await page.touchscreen.tap(m.cx + 20, m.cy + 20)
  await expect(name, 'a tap on the ring corner did not shuffle the seed').not.toHaveText(before)
  await ctx.close()
})
