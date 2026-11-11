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
import { go, watch, signIn, homeSectionsLoaded } from './helpers.js'

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
  { route: '/create/alt-text', sels: ['[data-tl-dock] button', '.alt-field', '.alt-length .tl-pill'] },
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
  { route: '/projects', signin: true, sels: ['a[aria-label^="Open project"]', '.db-mini'] },
  // The sales page's Try-the-tools palette (its tool tabs, lock buttons and Randomise) and the sales footer's link rows.
  {
    route: '/',
    label: '/ (Try the tools)',
    open: async (page) => {
      await homeSectionsLoaded(page)
      await page.locator('#try').scrollIntoViewIfNeeded()
    },
    sels: ['#ht-n-0', '#ht-s-0 .ht-lock', '#ht-s-0 :not(.ht-tb) > .ht-btn'],
  },
  { route: '/plans', sels: ['.sp-footer .sp-footer-col a'] },
  // The footer's small print on a tool page: the icon sets' links, the author credit and the about note.
  { route: '/create/icons', sels: ['.sp-footer .sp-footer-notice-list a', '.sp-footer .sp-footer-legal a.sp-footer-attrib', '.sp-footer .app-footer-note'] },
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
      // Only time-based animations finish; a scroll-driven one (the rail edge
      // fade) follows the scroll position and never resolves `finished`, and neither
      // does one held paused (the homepage pauses its looping art off screen).
      await page.evaluate(() => Promise.all(document.getAnimations()
        .filter((a) => a.timeline === document.timeline && a.playState === 'running')
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
// they must not do is steal each other's taps. The icon tiles in the homepage's
// Try-the-tools grid sit 12px apart across and 4px down: a tap 10px either side of a tile's centre
// still lands inside its own painted box, so it must pick that tile and not a
// neighbour's, and a tap 21px above the centre must still be on it.
test('/: a tap beside an icon tile picks that tile, not its neighbour', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
  const page = await ctx.newPage()
  watch(page, 'someone on a phone choosing an icon')
  await go(page, '/')
  expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true)
  await homeSectionsLoaded(page)
  await page.locator('#try').scrollIntoViewIfNeeded()
  await page.locator('#ht-n-1').click()
  await expect(page.locator('#ht-s-1')).toBeVisible()
  const tiles = page.locator('#ht-s-1 .ht-ic-t')
  await expect(tiles.first()).toBeVisible({ timeout: 15000 })
  await tiles.first().scrollIntoViewIfNeeded()
  const result = await page.evaluate(() => {
    const navBottom = document.querySelector('.spnav').getBoundingClientRect().bottom
    const chips = [...document.querySelectorAll('#ht-s-1 .ht-ic-t')]
    return chips.map((el, i) => {
      const r = el.getBoundingClientRect()
      const cx = r.left + r.width / 2
      const cy = r.top + r.height / 2
      const at = (x, y) => chips.indexOf(document.elementFromPoint(x, y)?.closest('.ht-ic-t'))
      return { i, centre: at(cx, cy) === i, onScreen: cy - 21 >= navBottom && cy + 21 <= innerHeight && r.width > 0, left: at(cx - 10, cy), right: at(cx + 10, cy), up: at(cx, cy - 21) }
    }).filter((s) => s.onScreen && s.centre)
  })
  expect(result.length, 'fewer than a row of icon tiles was on screen — this test would pass vacuously').toBeGreaterThan(5)
  for (const s of result) {
    expect(s.left, `a tap 10px left of tile ${s.i}'s centre picks tile ${s.left}`).toBe(s.i)
    expect(s.right, `a tap 10px right of tile ${s.i}'s centre picks tile ${s.right}`).toBe(s.i)
    expect(s.up, `a tap 21px above tile ${s.i}'s centre misses it`).toBe(s.i)
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

// The Try-the-tools palette's Randomise button is drawn 44px tall on a phone. A real
// touch tap 4px in from the bottom edge, and points at both ends and the top edge, must land on it and
// change the colours: the hit box is the whole button, not a smaller inner area.
test('/: Randomise is drawn at least 44px tall and a tap near its bottom edge changes the colours', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
  const page = await ctx.newPage()
  watch(page, 'someone on a phone tapping Randomise')
  await go(page, '/')
  expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true)
  await homeSectionsLoaded(page)
  await page.locator('#try').scrollIntoViewIfNeeded()
  const button = page.locator('#ht-s-0 :not(.ht-tb) > .ht-btn').first()
  await expect(button).toBeVisible({ timeout: 15000 })
  // Centre it, clear of the fixed bar and the window's edge, so every point can be hit-tested.
  await button.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }))
  const box = await button.boundingBox()
  expect(box.height, 'Randomise is drawn under 44px tall').toBeGreaterThanOrEqual(43.5)
  const corner = await button.evaluate((el) => {
    const r = el.getBoundingClientRect()
    const lands = (x, y) => { const hit = document.elementFromPoint(x, y); return !!hit && (hit === el || el.contains(hit)) }
    return [[22, r.height / 2], [r.width - 22, r.height / 2], [r.width / 2, 4], [r.width / 2, r.height - 4]].map(([dx, dy]) => lands(r.left + dx, r.top + dy))
  })
  expect(corner, 'an end or an edge of the Randomise button misses it').toEqual([true, true, true, true])

  const hexes = () => page.locator('#ht-s-0 .ht-pal-hex').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')).join('|'))
  const before = await hexes()
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height - 4)
  await expect.poll(hexes, { message: 'a tap near the bottom edge of Randomise did not change the colours' }).not.toBe(before)
  await ctx.close()
})

// On a phone the links a reader uses to move on are 44px tall, whether or not the
// pointer reports as coarse: the guide's Sources list, the topic chips on the hub
// and the "go" link on each principle.
test('a phone at 390: Learn Sources, hub topic chips and /learn/principles .prn-go are 44px tall', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
  const page = await ctx.newPage()
  watch(page, 'someone on a phone moving on from a guide')
  const heights = (sel) => page.locator(sel).evaluateAll((els) => els
    .filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 })
    .map((e) => Math.round(e.getBoundingClientRect().height)))

  await go(page, '/learn/colour-contrast')
  await page.locator('.lart-sources summary').click()
  const sources = await heights('.lart-sources li a')
  expect(sources.length, 'no Sources link was painted').toBeGreaterThan(0)
  for (const h of sources) expect(h, 'a Sources link is under 44px').toBeGreaterThanOrEqual(44)

  await go(page, '/learn')
  const chips = await heights('.lidx-topics a')
  expect(chips.length, 'no hub topic chip was painted').toBeGreaterThan(0)
  for (const h of chips) expect(h, 'a hub topic chip is under 44px').toBeGreaterThanOrEqual(44)

  await go(page, '/learn/principles')
  const gos = await heights('.prn-go')
  expect(gos.length, 'no .prn-go link was painted').toBeGreaterThan(0)
  for (const h of gos) expect(h, 'a .prn-go link is under 44px').toBeGreaterThanOrEqual(44)
  await ctx.close()
})
