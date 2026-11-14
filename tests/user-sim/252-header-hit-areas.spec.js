// EVERY HEADER CONTROL IS A 44 x 44 TARGET ON A PHONE-WIDTH WINDOW AND ON A COARSE POINTER.
//
// A route sweep measured the shared header's controls as boxes: the logo link
// 111 x 26, and the search, export, menu and avatar circles 36 x 36. The circles
// and the logo are the design, so they stay that size. The answer is an invisible
// ::after centred on each control that reaches 44 x 44 (a wide control only grows
// taller), so what has to be proved is reach, not box size:
//
//   · REACH. A grid of points across a 44 x 44 box centred on each control, the
//     corners included, must hit that control (document.elementFromPoint). A box
//     that merely looks bigger, a ring clipped by an ancestor, or a neighbour's
//     ring lying on top all fail here.
//   · NO OVERLAP. Two controls never share a point. elementFromPoint gives each
//     point one owner, so the sharing is read from the real ::after geometry
//     (size and transform), not from the probe: the hit rectangles of every pair
//     of controls must not intersect.
//   · DRAWN SIZE. The circles are still 36px (34px for the avatar from 768px, 38px
//     for the home header's icon buttons), the logo is still about 26px tall. A fix
//     that grew the box to 44px would pass REACH and fail here.
//   · A MOUSE ON A WIDE WINDOW gets nothing extra. The areas belong to a finger and
//     to the phone layout; at 1440 a point 21px from the centre of a short control
//     is not the control.
//
// Contexts: 390 touch, 768 touch, 390 with a mouse (below 768 any pointer gets the
// areas) and 1440 with a mouse. Routes: the app header on a tool page and on
// /projects (signed in), the public header on / and, signed out, on /learn.
//
// The headers on these routes are two components: PillNav (`.pnav-*`: every route
// except the home page) and SpectrumNav (`.spnav-*`: the sales pages). One collector
// reads both.
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'

const PHONE_TOUCH = { name: '390 touch', width: 390, height: 844, touch: true, needs44: true }
const TABLET_TOUCH = { name: '768 touch', width: 768, height: 1024, touch: true, needs44: true }
const PHONE_MOUSE = { name: '390 mouse', width: 390, height: 844, touch: false, needs44: true }
const DESKTOP = { name: '1440 mouse', width: 1440, height: 900, touch: false, needs44: false }
const CONTEXTS = [PHONE_TOUCH, TABLET_TOUCH, PHONE_MOUSE, DESKTOP]

// Controls the header must show, by the class that names them, at each width.
const APP_PHONE = ['pnav-logo', 'pnav-search-field', 'pnav-export', 'pnav-avatar-btn', 'pnav-mobile']
const APP_WIDE = ['pnav-logo', 'pnav-search-field', 'pnav-trigger', 'pnav-export', 'pnav-theme', 'pnav-avatar-btn']
const OUT_PHONE = ['pnav-logo', 'pnav-search-field', 'pnav-export', 'pnav-mobile']
const OUT_WIDE = ['pnav-logo', 'pnav-search-field', 'pnav-trigger', 'pnav-login', 'pnav-upgrade', 'pnav-more']
const HOME_PHONE = ['spnav-mark', 'spnav-icon', 'spnav-burger']
const HOME_WIDE = ['spnav-mark', 'spnav-quiet-link', 'spnav-search']

const ROUTES = [
  { label: 'a tool page', path: '/create/palette', signedIn: true, slug: 'tool', phone: APP_PHONE, wide: APP_WIDE },
  { label: '/projects', path: '/projects', signedIn: true, slug: 'projects', phone: APP_PHONE, wide: APP_WIDE },
  { label: 'the home page', path: '/', signedIn: false, slug: 'home', phone: HOME_PHONE, wide: HOME_WIDE },
  { label: '/learn', path: '/learn', signedIn: false, slug: 'learn', phone: OUT_PHONE, wide: OUT_WIDE },
]

// What each control draws (the V3 header: 36px controls, 44px on the phone header). A pair is [width, height];
// null leaves that side open (a wide control's width is its label's). `phone` applies
// below 768px, `wide` from 768px.
const DRAWN = {
  'pnav-search-field': { phone: [44, 44], wide: [null, 36] },
  'pnav-export': { phone: [44, 44], wide: (w) => (w < 900 ? [36, 36] : [null, 36]) },
  'pnav-mobile': { phone: [44, 44] },
  'pnav-avatar-btn': { phone: [44, 44], wide: [36, 36] },
  'pnav-theme': { wide: [36, 36] },
  'pnav-trigger': { wide: [null, 36] },
  'pnav-upgrade': { wide: [null, 36] },
  'pnav-logo': { phone: [114.7, 36], wide: [null, 36] },
  'spnav-icon': { phone: [44, 44] },
  'spnav-quiet-link': { wide: [null, 44] },
  // The pill is a 44px target on a touch screen and 40px for a mouse.
  'spnav-search': { wide: (w, touch) => [null, touch ? 44 : 40] },
  'spnav-mark': { phone: [null, 44], wide: [null, 44] },
}
const DRAWN_TOLERANCE = 0.6

async function open(browser, size, persona) {
  const ctx = await browser.newContext({
    viewport: { width: size.width, height: size.height },
    hasTouch: size.touch,
    isMobile: size.touch,
  })
  const page = await ctx.newPage()
  watch(page, `${persona} at ${size.name}`)
  return { ctx, page }
}

// Reads every visible header control in one pass, in the page. For each: its
// class, its drawn box, its ::after rectangle (null when there is none), and
// what lands on a grid of points across the 44 x 44 box centred on it.
function collectControls() {
  const OFFSETS = [-21, -10.5, 0, 10.5, 21]
  const els = [...document.querySelectorAll('.pnav-inner a[href], .pnav-inner button, .spnav-bar a, .spnav-bar button')]
    .filter((el) => !el.closest('.pnav-pop'))
    .filter((el) => {
      const r = el.getBoundingClientRect()
      const cs = getComputedStyle(el)
      return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0.01
    })
  const owns = (el, hit) => !!hit && (hit === el || el.contains(hit))
  return els.map((el) => {
    const r = el.getBoundingClientRect()
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    // The ::after rectangle, from its computed size and the translation its transform
    // resolves to. It is positioned from the centre of the control's padding box.
    const after = getComputedStyle(el, '::after')
    let ring = null
    if (after.content !== 'none' && after.content !== 'normal' && after.display !== 'none' && after.position === 'absolute') {
      const m = new DOMMatrixReadOnly(after.transform === 'none' ? undefined : after.transform)
      const w = parseFloat(after.width)
      const h = parseFloat(after.height)
      const left = r.left + el.clientLeft + el.clientWidth / 2 + m.e
      const top = r.top + el.clientTop + el.clientHeight / 2 + m.f
      ring = { left, top, right: left + w, bottom: top + h, pointerEvents: after.pointerEvents }
    }
    const misses = []
    // A control already drawn 44px tall (the home bar's links, logo and round icon
    // buttons) is probed along the plus through its centre: a round button's
    // corners are not part of the control, and a text link is narrower than 44px.
    const drawn44 = r.height >= 43.5 && !ring
    const halfW = Math.min(21, r.width / 2 - 1)
    const probes = drawn44
      ? [[0, 0], [0, -21], [0, 21], [-halfW, 0], [halfW, 0]]
      : OFFSETS.flatMap((dy) => OFFSETS.map((dx) => [dx, dy]))
    for (const [dx, dy] of probes) {
      {
        const hit = document.elementFromPoint(cx + dx, cy + dy)
        if (!owns(el, hit)) {
          misses.push({ dx, dy, hit: hit ? `${hit.tagName.toLowerCase()}.${String(hit.className).split(' ')[0]}` : 'nothing' })
        }
      }
    }
    // Outside the drawn box, on the axes where the control is shorter than the grid.
    const outside = []
    if (r.height < 40) for (const dy of [-21, 21]) outside.push(owns(el, document.elementFromPoint(cx, cy + dy)))
    if (r.width < 40) for (const dx of [-21, 21]) outside.push(owns(el, document.elementFromPoint(cx + dx, cy)))
    const classes = String(el.className).split(/\s+/).filter(Boolean)
    return {
      classes,
      name: classes[0] || el.tagName.toLowerCase(),
      label: el.getAttribute('aria-label') || el.textContent.trim().slice(0, 20),
      box: { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height },
      ring,
      misses,
      reachesOutside: outside.some(Boolean),
    }
  })
}

// The same read, repeated until two reads in a row agree, so a header still settling
// (fonts, the home pill's entrance) is not measured mid-move.
async function settledControls(page) {
  let last = ''
  let controls = []
  await expect.poll(async () => {
    controls = await page.evaluate(collectControls)
    const now = JSON.stringify(controls.map((c) => [c.name, c.box]))
    const same = now === last && controls.length > 0
    last = now
    return same
  }, { message: 'the header never settled', timeout: 8000, intervals: [150] }).toBe(true)
  return controls
}

// A control's hit rectangle: its drawn box and its ::after, together.
const hitRect = (c) => ({
  left: Math.min(c.box.left, c.ring ? c.ring.left : Infinity),
  top: Math.min(c.box.top, c.ring ? c.ring.top : Infinity),
  right: Math.max(c.box.right, c.ring ? c.ring.right : -Infinity),
  bottom: Math.max(c.box.bottom, c.ring ? c.ring.bottom : -Infinity),
})
// A shared strip under a quarter of a pixel is layout rounding between neighbouring labels, not a
// point a pointer can land on; a real shared area is a pixel or more (the avatar-shift control below).
const OVERLAP_PX = 0.25
const overlaps = (controls) => {
  const out = []
  controls.forEach((a, i) => controls.slice(i + 1).forEach((b) => {
    const ra = hitRect(a)
    const rb = hitRect(b)
    const ox = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left)
    const oy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top)
    if (ox > OVERLAP_PX && oy > OVERLAP_PX) out.push(`${a.name} (${a.label}) and ${b.name} (${b.label}) share ${ox.toFixed(2)} x ${oy.toFixed(2)}px`)
  }))
  return out
}

const round = (n) => Math.round(n * 10) / 10

// Every control with a recorded drawn size, checked against it.
const drawnSizeFailures = (controls, width, touch) => {
  const out = []
  for (const c of controls) {
    for (const [cls, spec] of Object.entries(DRAWN)) {
      if (!c.classes.includes(cls)) continue
      let want = width < 768 ? spec.phone : spec.wide
      if (typeof want === 'function') want = want(width, touch)
      if (!want) continue
      const [w, h] = want
      if (w != null && Math.abs(c.box.width - w) > DRAWN_TOLERANCE) out.push(`${cls} is ${round(c.box.width)} wide, drawn ${w}`)
      if (h != null && Math.abs(c.box.height - h) > DRAWN_TOLERANCE) out.push(`${cls} is ${round(c.box.height)} tall, drawn ${h}`)
    }
  }
  return out
}

for (const route of ROUTES) {
  test.describe(`the header on ${route.label}`, () => {
    for (const size of CONTEXTS) {
      test(`${size.name}: ${size.needs44 ? 'every control reaches 44 x 44, none overlap' : 'a mouse gets the drawn size and no extra area'}`, async ({ browser }) => {
        const { ctx, page } = await open(browser, size, 'a visitor reading the header')
        if (route.signedIn) await signIn(page, { plan: 'free', projects: 1 })
        await go(page, route.path)
        const controls = await settledControls(page)
        await page.screenshot({ path: `.claude/scratch/hdrhit1/${route.slug}-${size.width}-${size.touch ? 'touch' : 'mouse'}.png` })

        // POSITIVE CONTROL: the header showed the controls this width is meant to show,
        // so "every control" is not an empty list.
        const phoneLayout = size.width < 768
        const present = new Set(controls.flatMap((c) => c.classes))
        const wanted = phoneLayout ? route.phone : route.wide
        expect(wanted.filter((cls) => !present.has(cls)), `controls missing from the header: found ${[...present].join(', ')}`).toEqual([])

        // DRAWN SIZE: nothing grew to reach 44.
        const drawnFailures = drawnSizeFailures(controls, size.width, size.touch)
        // MUTATION: in global.css change `.pnav-mobile{...width:36px;height:36px...}` to 44px, or give the
        // logo `min-height:44px`; the box grows, the reach below still passes, and this fails.
        expect(drawnFailures, 'a control was resized to reach 44px').toEqual([])

        if (size.needs44) {
          // REACH: all 25 points across the 44 x 44 box land on the control.
          const reachFailures = controls.filter((c) => c.misses.length).map((c) => `${c.name} (${c.label}) misses ${c.misses.length}: ${c.misses.slice(0, 4).map((m) => `${m.dx},${m.dy} -> ${m.hit}`).join('; ')}`)
          // MUTATION: in global.css change `@media(pointer:coarse),(max-width:767px)` back to `@media(pointer:coarse)`:
          // the 390 mouse cases fail here. (The menu button's own ::after is the one inside @media(max-width:767px).)
          // In spectrum-chrome.css do the same to `.spnav-icon::after`: the home page fails.
          expect(reachFailures, 'part of a 44 x 44 box around a control does not land on it').toEqual([])
          // The ring is also what makes the area: a control shorter than 44 has one.
          const noRing = controls.filter((c) => c.box.height < 43.5 && !c.ring).map((c) => c.name)
          expect(noRing, 'short controls with no ::after hit area').toEqual([])
        } else {
          // A mouse on a wide window: nothing past the drawn box belongs to the control.
          const extra = controls.filter((c) => c.reachesOutside).map((c) => `${c.name} (${c.label})`)
          // MUTATION: change the media query on the ::after rule in global.css to `@media all`, so every pointer at
          // every width gets the area: the 1440 cases fail here.
          expect(extra, 'a mouse on a wide window got a larger hit area').toEqual([])
        }

        // NO OVERLAP: no two hit rectangles intersect.
        // MUTATION: give .pnav-avatar-btn::after a width of 64px: it runs into the theme button's area,
        // and the 768 touch app cases fail here and in reach.
        expect(overlaps(controls), 'two hit areas share a point').toEqual([])
        await ctx.close()
      })
    }
  })
}

// The two detectors are only worth trusting if they can fail. Each case breaks the
// page on purpose and expects its detector to say so.
test.describe('the checks can fail', () => {
  test('390 touch: removing a control\'s hit area is seen as a miss', async ({ browser }) => {
    const { ctx, page } = await open(browser, PHONE_TOUCH, 'a visitor reading the header')
    await signIn(page, { plan: 'free', projects: 1 })
    await go(page, '/projects')
    // The phone header's buttons are drawn 44px, so the 36px logo is the control that relies on its ring.
    await page.addStyleTag({ content: '.pnav-logo::after{display:none !important}' })
    const controls = await settledControls(page)
    const logo = controls.find((c) => c.classes.includes('pnav-logo'))
    expect(logo.misses.length, 'with no ::after the logo should miss the top and bottom of the grid').toBeGreaterThan(0)
    expect(logo.ring, 'the ring should be gone').toBeNull()
    await ctx.close()
  })

  test('768 touch: widening the avatar hit area is seen as a shared strip with the theme button', async ({ browser }) => {
    const { ctx, page } = await open(browser, TABLET_TOUCH, 'a visitor reading the header')
    await signIn(page, { plan: 'free', projects: 1 })
    await go(page, '/projects')
    expect(await settledControls(page).then(overlaps), 'the page as shipped has none').toEqual([])
    await page.addStyleTag({ content: '.pnav-avatar-btn::after{width:64px !important}' })
    const found = await settledControls(page).then(overlaps)
    expect(found.length, 'a 64px avatar area leaves the two sharing a strip').toBeGreaterThan(0)
    // The report names a control by its first class (pnav-iconbtn for the theme button), so the
    // theme button is told apart by its label.
    expect(found[0]).toMatch(/\(Switch to the \w+ theme\)/)
    expect(found[0]).toMatch(/pnav-avatar-btn/)
    await ctx.close()
  })

  test('390 mouse: shrinking the box to 36px is seen as a changed drawn size', async ({ browser }) => {
    const { ctx, page } = await open(browser, PHONE_MOUSE, 'a visitor reading the header')
    await signIn(page, { plan: 'free', projects: 1 })
    await go(page, '/projects')
    expect(await settledControls(page).then((c) => drawnSizeFailures(c, 390)), 'the page as shipped has none').toEqual([])
    await page.addStyleTag({ content: '.pnav-mobile{width:36px !important;height:36px !important}' })
    const found = await settledControls(page).then((c) => drawnSizeFailures(c, 390))
    expect(found.join('; ')).toMatch(/pnav-mobile is 36 wide, drawn 44/)
    await ctx.close()
  })
})
