// THE HOMEPAGE'S MOTION, MEASURED IN A BROWSER.
//
// The homepage has one entrance: the loop panel (`.hh-fig`) rises 12px and fades in
// over 300ms after 80ms (a 200ms fade under reduced motion). The headline, the
// section headings, the figures and the sticky things do not move on arrival. Each
// of those can be done wrongly in a way the page still LOOKS fine in a screenshot:
//
//   - an entrance can move the headline, which makes the settled hydrated headline
//     a later and larger LCP candidate and puts LCP back on hydration;
//   - a content switch can move the layout under a thumb (CLS);
//   - the reduced-motion choice can be answered by one input and not the other;
//   - a scroll handler can come back on a section;
//   - a heading can start rising again, or a figure can start counting up.
//
// So the oracles are the BROWSER'S OWN: `document.getAnimations()` scanned every
// frame (an animation that has finished is no longer listed, so "did it run?"
// cannot be asked afterwards), a buffered `layout-shift` observer, a buffered
// `largest-contentful-paint` observer, and a wrapper on addEventListener that
// knows which scroll listeners are still attached.
//
// Hand-checked numbers (from the homepage build handoff, section 5):
//   panel entrance: hh-panel-in, 300ms, 80ms delay, from opacity 0 and translateY(12px);
//                   hh-panel-fade, 200ms, 80ms delay, from opacity 0, under reduced motion
//   headings, figures: no animation
//
// WHAT THIS DOES NOT PROVE: a throttled frame trace of the first second (a manual
// trace), and Firefox/Safari.
import { test, expect } from './base.js'
import { go, goHoldingApp, homeSectionsLoaded, watch } from './helpers.js'
import { PROOF_ROWS } from '../../src/components/home/proofStats.js'

const PERSONA = 'a first-time visitor on the front door'
const ENTRANCE = /^hh-panel-(in|fade)$/
const BOOKMARK_MOTION = /^bm/

const PROBE = `
(() => {
  const m = window.__hm = { anims: [], objs: [], lcp: [], shifts: [], adds: [], removes: [] }
  const seen = new WeakSet()
  const rect = (r) => ({ x: r.x, y: r.y, w: r.width, h: r.height })
  const scan = () => {
    try {
      for (const a of document.getAnimations()) {
        if (seen.has(a) || !a.animationName) continue
        seen.add(a)
        const el = a.effect && a.effect.target
        const t = a.effect.getTiming()
        m.objs.push(a)
        m.anims.push({
          name: a.animationName, at: Math.round(performance.now()), dur: t.duration, delay: t.delay,
          cls: el ? String(el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className) : '',
          tag: el ? el.tagName : '',
          inCopy: !!(el && el.closest && el.closest('.hh-copy')),
          inHeading: !!(el && el.closest && el.closest('h1, h2, h3')),
          scrollDriven: !!(a.timeline && !(a.timeline instanceof DocumentTimeline)),
        })
      }
    } catch (e) { /* getAnimations unsupported */ }
    requestAnimationFrame(scan)
  }
  requestAnimationFrame(scan)
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) m.lcp.push({
    t: Math.round(e.startTime), size: e.size, el: e.element ? e.element.tagName + '.' + String(e.element.className || '').split(' ')[0] : '(none)' }) })
    .observe({ type: 'largest-contentful-paint', buffered: true }) } catch (e) { /* unsupported */ }
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) m.shifts.push({
    t: Math.round(e.startTime), v: e.value, input: e.hadRecentInput,
    sources: (e.sources || []).map((s) => ({ prev: rect(s.previousRect), cur: rect(s.currentRect),
      inNav: !!(s.node && (s.node.closest ? s.node : s.node.parentElement) && (s.node.closest ? s.node : s.node.parentElement).closest('.spnav')),
      inTry: !!(s.node && (s.node.closest ? s.node : s.node.parentElement) && (s.node.closest ? s.node : s.node.parentElement).closest('#try')),
      inLoop: !!(s.node && (s.node.closest ? s.node : s.node.parentElement) && (s.node.closest ? s.node : s.node.parentElement).closest('.hh-slot')) })) }) })
    .observe({ type: 'layout-shift', buffered: true }) } catch (e) { /* unsupported */ }
  const add = EventTarget.prototype.addEventListener
  const rem = EventTarget.prototype.removeEventListener
  const onPage = (t) => t === window || t === document
  EventTarget.prototype.addEventListener = function (type, fn, o) { if (type === 'scroll' && onPage(this)) m.adds.push(fn); return add.call(this, type, fn, o) }
  EventTarget.prototype.removeEventListener = function (type, fn, o) { if (type === 'scroll' && onPage(this)) m.removes.push(fn); return rem.call(this, type, fn, o) }
})()
`

const VIEWS = {
  1440: { width: 1440, height: 900 },
  768: { width: 768, height: 1024, isMobile: true, hasTouch: true },
  390: { width: 390, height: 844, isMobile: true, hasTouch: true },
  320: { width: 320, height: 640, isMobile: true, hasTouch: true },
}

/** A fresh context with the probe installed before any page script. */
async function open(browser, view, { media = 'no-preference', settings } = {}) {
  const { width, height, ...flags } = VIEWS[view]
  const ctx = await browser.newContext({ viewport: { width, height }, reducedMotion: media, ...flags })
  const page = await ctx.newPage()
  await page.addInitScript({ content: PROBE })
  if (settings !== undefined) {
    await page.addInitScript((reducedMotion) => {
      localStorage.setItem('vs-appearance', JSON.stringify({ rounding: 'default', density: 'cozy', reducedMotion }))
    }, settings)
  }
  watch(page, PERSONA)
  return { ctx, page }
}

const hm = (page, fn, arg) => page.evaluate(fn, arg)
const ran = (page, name) => page.evaluate((n) => window.__hm.anims.filter((a) => a.name === n), name)

/** The panel's entrance has finished (it is the one finite animation this page adds on load). */
const settled = (page) => page.waitForFunction(() => {
  const mine = window.__hm.objs.filter((a) => /^hh-panel-(in|fade)$/.test(a.animationName))
  return mine.length > 0 && mine.every((a) => a.playState === 'finished')
}, null, { timeout: 8000 })

async function scrollThrough(page, step = 600, pause = 70) {
  const h = await page.evaluate(() => document.documentElement.scrollHeight)
  for (let y = 0; y < h; y += step) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y)
    await page.waitForTimeout(pause)
  }
  await page.evaluate((yy) => window.scrollTo(0, yy), h)
  await page.waitForTimeout(400)
}

const FOLDER_NAMES = ['Fonts', 'Icons and emoji', 'Image tools', 'Colours']
/** The bookmarks section's folder buttons that are drawn (the desktop stage or the phone layout, never both). */
const folderButton = (page, name) => page.locator('#bookmarks [role="group"][aria-label="Folders inside Graphic design"] button')
  .filter({ hasText: name }).and(page.locator(':visible')).first()
/** Press the four folders (a real change each time; Colours is the start). A press stops the tour. */
async function switchTools(page) {
  for (const name of FOLDER_NAMES) {
    await folderButton(page, name).click()
    await page.waitForTimeout(350)
  }
}
/** The tour's clock, if it is running: the open folder's run-bar fill, animating. */
const tourRunning = (page) => page.evaluate(() => {
  const fill = [...document.querySelectorAll('#bookmarks .bm-fill')].find((el) => el.getClientRects().length)
  return !!fill && getComputedStyle(fill).animationPlayState === 'running'
})
const pauseButton = (page) => page.locator('#bookmarks .bm-pause, #bookmarks .bmp-pb').and(page.locator(':visible')).first()
const tourStage = (page) => page.locator('#bookmarks .bm-stage, #bookmarks [data-r7ap-stage]').and(page.locator(':visible')).first()

const finalFigure = (row) => String(row.n)

// ── T1: the cold-load hero ──────────────────────────────────────────────────

for (const view of [1440, 768, 390]) {
  test.describe(`T1 the cold-load hero at ${view}px`, () => {
    test('only the loop panel enters, and it rests at its real values', async ({ browser }) => {
      const { ctx, page } = await open(browser, view)
      await go(page, '/')
      await settled(page)

      const panel = await ran(page, 'hh-panel-in')
      expect(panel.length, 'the loop panel enters once').toBeGreaterThan(0)
      for (const a of panel) {
        expect(a, 'the entrance runs on the loop panel').toMatchObject({ cls: 'hh-fig', dur: 300, delay: 80, inCopy: false, inHeading: false })
      }
      expect(await ran(page, 'hh-panel-fade'), 'the fade is for reduced motion only').toHaveLength(0)

      // The headline, sub-line and buttons have no entrance of any kind.
      const copy = (await hm(page, () => window.__hm.anims)).filter((a) => a.inCopy)
      expect(copy.map((a) => a.name), 'something in the headline block animated on a cold load').toEqual([])

      const rest = await page.evaluate(() => {
        const cs = getComputedStyle(document.querySelector('.hh-fig'))
        const h1 = getComputedStyle(document.querySelector('h1.hh-h1'))
        return { fig: { opacity: cs.opacity, transform: cs.transform }, h1: { opacity: h1.opacity, transform: h1.transform } }
      })
      // A finished run that holds its end keeps the identity matrix rather than the keyword.
      expect(rest.fig.opacity, 'the panel did not come to rest opaque').toBe('1')
      expect(rest.fig.transform, 'the panel did not come to rest un-shifted').toMatch(/^(none|matrix\(1, 0, 0, 1, 0, 0\))$/)
      expect(rest.h1, 'the headline is not plain at rest').toEqual({ opacity: '1', transform: 'none' })
      await ctx.close()
    })

    test('the first frame is the panel 12px low and clear (so the run is not vacuous)', async ({ browser }) => {
      const { ctx, page } = await open(browser, view)
      await go(page, '/')
      await settled(page)
      // Rewind each finished run to its own time 0 and read what a visitor's first frame would be.
      const first = await page.evaluate(() => {
        const out = []
        for (const a of window.__hm.objs) {
          if (a.animationName !== 'hh-panel-in') continue
          a.pause(); a.currentTime = 0
          const cs = getComputedStyle(a.effect.target)
          out.push({ opacity: cs.opacity, transform: cs.transform })
          a.cancel()
        }
        return out
      })
      expect(first.length).toBeGreaterThan(0)
      for (const f of first) expect(f).toEqual({ opacity: '0', transform: 'matrix(1, 0, 0, 1, 0, 12)' })
      await ctx.close()
    })
  })
}

test('T1 arriving in-session, the panel enters and the headline stays plain', async ({ browser }) => {
  const { ctx, page } = await open(browser, 1440)
  await go(page, '/plans')
  await page.locator('a.spnav-mark').first().click()
  await expect(page.locator('h1.hh-h1')).toBeVisible()
  await settled(page)
  const all = await hm(page, () => window.__hm.anims)
  const panel = all.filter((a) => a.name === 'hh-panel-in')
  expect(panel.length, 'the panel enters on an in-session arrival').toBeGreaterThan(0)
  for (const a of panel) expect(a).toMatchObject({ cls: 'hh-fig', dur: 300, delay: 80 })
  expect(all.filter((a) => a.inCopy).map((a) => a.name), 'the headline block animated on an in-session arrival').toEqual([])
  await ctx.close()
})

// ── T2: LCP holds ───────────────────────────────────────────────────────────

for (const view of [320, 390, 768, 1440]) {
  test(`T2 the largest paint stays the headline at ${view}px`, async ({ browser }) => {
    const { ctx, page } = await open(browser, view)
    // The app's script is held until the shell's first LCP candidate has been
    // RECORDED. An entry's `element` reads null once its node has left the
    // document, and React's createRoot replaces the shell, so on a slow runner the
    // observer callback ran after the swap and the headline's own paint read as
    // "(none)". See goHoldingApp in helpers.js. Every later candidate is still
    // observed live, after hydration.
    await goHoldingApp(page, '/', () => expect.poll(
      () => hm(page, () => window.__hm.lcp.length),
      { message: 'the served shell never produced a largest-contentful-paint entry', timeout: 15000 },
    ).toBeGreaterThan(0))
    await settled(page)
    // Past the loop's first beats, so a late candidate would have been recorded.
    await page.waitForTimeout(2500)
    const lcp = await hm(page, () => window.__hm.lcp)
    expect(lcp.length, 'no largest-contentful-paint entry was recorded').toBeGreaterThan(0)
    expect(lcp.at(-1).el, `the last LCP candidate is ${JSON.stringify(lcp)}, not the headline`).toBe('H1.hh-h1')
    for (const e of lcp) expect(e.el, `a later paint (${e.el}) became a candidate: ${JSON.stringify(lcp)}`).toBe('H1.hh-h1')
    await ctx.close()
  })
}

// ── T3: reduced motion, by either input ─────────────────────────────────────

/** Cold load, the sections in, a full scroll, four folder presses, the figures. */
async function exercise(page) {
  await go(page, '/')
  await homeSectionsLoaded(page)
  await page.waitForTimeout(1000)
  await scrollThrough(page)
  await page.locator('#bookmarks').scrollIntoViewIfNeeded()
  await switchTools(page)
  await page.locator('.hp-l').scrollIntoViewIfNeeded()
}

const REDUCED = {
  'the Settings choice alone': { media: 'no-preference', settings: true },
  'the OS preference alone': { media: 'reduce', settings: undefined },
}
for (const [label, opts] of Object.entries(REDUCED)) {
  for (const view of [1440, 390]) {
    test(`T3 ${label} swaps the entrance for a fade and stops the bookmark motion at ${view}px, and the figures read their final values`, async ({ browser }) => {
      const { ctx, page } = await open(browser, view, opts)
      await exercise(page)
      // The figure is read the moment the band is in view, before any count could have finished.
      const figures = await page.locator('.hp-l strong').allTextContents()
      expect(figures, 'the figures are not their real values straight away').toEqual(PROOF_ROWS.map(finalFigure))
      await page.waitForTimeout(1000)
      expect(await page.locator('.hp-l strong').allTextContents()).toEqual(PROOF_ROWS.map(finalFigure))

      const anims = await hm(page, () => window.__hm.anims)
      expect(anims.filter((a) => a.name === 'hh-panel-in').map((a) => a.cls), `with ${label}, the rising entrance still ran`).toEqual([])
      const fade = anims.filter((a) => a.name === 'hh-panel-fade')
      expect(fade.length, `with ${label}, the 200ms fade did not run`).toBeGreaterThan(0)
      for (const a of fade) expect(a).toMatchObject({ cls: 'hh-fig', dur: 200, delay: 80 })
      expect(anims.filter((a) => BOOKMARK_MOTION.test(a.name)).map((a) => a.name), `with ${label}, the bookmark motion still ran`).toEqual([])
      // And the content is settled in plain CSS, not waiting on a run.
      const rest = await page.evaluate(() => {
        const c = getComputedStyle(document.querySelector('.hh-fig'))
        return `${c.opacity}/${c.transform}`
      })
      expect(rest).toBe('1/none')
      await ctx.close()
    })
  }
}

test('T3 an explicit Settings opt-in to motion wins over the OS preference (the rise runs)', async ({ browser }) => {
  const { ctx, page } = await open(browser, 390, { media: 'reduce', settings: false })
  await go(page, '/')
  await settled(page)
  expect((await ran(page, 'hh-panel-in')).length).toBeGreaterThan(0)
  expect(await ran(page, 'hh-panel-fade')).toHaveLength(0)
  await ctx.close()
})

test('T3 with motion on and a wide window, the same walk does produce the named animations (the detector sees them)', async ({ browser }) => {
  const { ctx, page } = await open(browser, 1440)
  await go(page, '/')
  await homeSectionsLoaded(page)
  await tourStage(page).scrollIntoViewIfNeeded()
  await expect.poll(() => tourRunning(page), { message: 'the tour never started with its stage in view' }).toBe(true)
  const names = new Set((await hm(page, () => window.__hm.anims)).map((a) => a.name))
  for (const want of ['hh-panel-in', 'bmFill']) {
    expect(names.has(want), `${want} never ran: ${[...names]}`).toBe(true)
  }
  await ctx.close()
})

// Headings are plain text: no entrance, reveal or word rise on any h1, h2 or h3.
for (const view of [1440, 390]) {
  test(`T3 no animation runs on any h1, h2 or h3 through a full scroll at ${view}px`, async ({ browser }) => {
    const { ctx, page } = await open(browser, view)
    await go(page, '/')
    await homeSectionsLoaded(page)
    await scrollThrough(page)
    expect(await page.locator('h1, h2, h3').count(), 'the headings are not on the page, so there is nothing to check').toBeGreaterThan(8)
    expect(
      (await hm(page, () => window.__hm.anims)).filter((a) => a.inHeading).map((a) => `${a.name} on ${a.tag}.${a.cls}`),
      'a heading animated',
    ).toEqual([])
    await ctx.close()
  })
}

// The bookmarks tour: it runs while its stage is on screen, Pause holds it, and a folder click stops it for good.
for (const view of [1440, 390]) {
  test(`T3 the bookmarks tour runs in view, Pause holds it and Play resumes it (${view}px)`, async ({ browser }) => {
    const { ctx, page } = await open(browser, view)
    await go(page, '/')
    await homeSectionsLoaded(page)
    await tourStage(page).scrollIntoViewIfNeeded()
    await expect.poll(() => tourRunning(page), { message: 'the tour never started with its stage in view' }).toBe(true)
    const pause = pauseButton(page)
    await expect(pause).toHaveAttribute('aria-label', 'Pause the folder tour')
    await pause.click()
    await expect(pause, 'the control did not turn into Play').toHaveAttribute('aria-label', 'Play the folder tour')
    const openFolder = () => page.locator('#bookmarks [role="group"][aria-label="Folders inside Graphic design"] button[aria-pressed="true"]').and(page.locator(':visible')).first().innerText()
    const held = await openFolder()
    await page.waitForTimeout(3800) // longer than one folder's 3200ms
    expect(await tourRunning(page), 'the tour kept running after Pause').toBe(false)
    expect(await openFolder(), 'a folder opened while the tour was paused').toBe(held)
    // The mouse stays on the button, which sits on the stage: Play starts the tour with no move away.
    await pause.click()
    await expect.poll(() => tourRunning(page), { message: 'Play did not start the tour again' }).toBe(true)
    await ctx.close()
  })

  // A mouse over the stage is not a hold: only Pause, keyboard focus, a finger and the autoplay owner stop the tour.
  test(`T3 a mouse over the bookmarks stage does not pause the tour (${view}px)`, async ({ browser }) => {
    const { ctx, page } = await open(browser, view)
    await go(page, '/')
    await homeSectionsLoaded(page)
    await tourStage(page).scrollIntoViewIfNeeded()
    await expect.poll(() => tourRunning(page), { message: 'the tour never started with its stage in view' }).toBe(true)
    const box = await tourStage(page).boundingBox()
    // The middle of the stage, which at 1440 lands on the window (a surface that used to hold the tour).
    await page.mouse.move(box.x + box.width * 0.75, box.y + box.height * 0.5)
    await page.mouse.move(box.x + box.width * 0.76, box.y + box.height * 0.5)
    const paused = () => page.evaluate(() => document.querySelector('#bookmarks').classList.contains('bm-paused'))
    const openFolder = () => page.locator('#bookmarks [role="group"][aria-label="Folders inside Graphic design"] button[aria-pressed="true"]').and(page.locator(':visible')).first().innerText()
    const before = await openFolder()
    await page.waitForTimeout(1400) // longer than the 1000ms a hold used to take to lift
    expect(await paused(), 'the section was marked paused with a mouse over it').toBe(false)
    expect(await tourRunning(page), 'the fill stopped with a mouse over the stage').toBe(true)
    await page.waitForTimeout(3600) // longer than one folder's 3200ms, still hovering
    expect(await openFolder(), 'the tour did not move on while a mouse was over the stage').not.toBe(before)
    await ctx.close()
  })

  test(`T3 a folder click stops the bookmarks tour for good (${view}px)`, async ({ browser }) => {
    const { ctx, page } = await open(browser, view)
    await go(page, '/')
    await homeSectionsLoaded(page)
    await tourStage(page).scrollIntoViewIfNeeded()
    await expect.poll(() => tourRunning(page)).toBe(true)
    await folderButton(page, 'Image tools').click()
    await expect(folderButton(page, 'Image tools')).toHaveAttribute('aria-pressed', 'true')
    await page.waitForTimeout(3800)
    expect(await tourRunning(page), 'the tour ran on after a folder was picked').toBe(false)
    await expect(folderButton(page, 'Image tools'), 'the tour moved off the picked folder').toHaveAttribute('aria-pressed', 'true')
    await expect(pauseButton(page)).toHaveAttribute('aria-label', 'Play the folder tour')
    await ctx.close()
  })
}

// ── T4: no layout shift ─────────────────────────────────────────────────────

/**
 * The shifts, split into the nav row's known icon-box shift (pre-existing on origin/main, not this
 * slice) and everything else. The box size and x depend on the font and platform (44x44 near x 117
 * on a Windows run, 38x38 near x 449 on the CI runner), so the nav shift is identified by what it
 * is, not by those numbers: every source is an element inside `.spnav`, its box keeps its size and
 * its y (a pure sideways move), and all the sources moved by the same amount. A shift that touches
 * anything outside the nav, or moves up or down, or resizes, stays in `other`.
 */
async function shifts(page, { from = 0, until = Infinity } = {}) {
  return page.evaluate(({ from, until }) => {
    const same = (a, b) => Math.abs(a - b) < 0.5
    const navShift = (src) => {
      if (!src.length || !src.every((x) => x.inNav)) return false
      if (!src.every((x) => same(x.prev.w, x.cur.w) && same(x.prev.h, x.cur.h) && same(x.prev.y, x.cur.y))) return false
      const dx = src[0].cur.x - src[0].prev.x
      return Math.abs(dx) > 0.5 && src.every((x) => same(x.cur.x - x.prev.x, dx))
    }
    let total = 0
    let navOnly = 0
    let tryTools = 0
    let loop = 0
    const other = []
    for (const s of window.__hm.shifts) {
      if (s.t < from || s.t >= until) continue
      total += s.v
      if (navShift(s.sources)) navOnly += s.v
      // The Try section's own tool list and mini tools change as the active tool follows the scroll (the names row opens each description).
      else if (s.sources.length && s.sources.every((x) => x.inTry)) tryTools += s.v
      // The loop plays inside a slot the stylesheet sizes, so what moves in there moves nothing else.
      else if (s.sources.length && s.sources.every((x) => x.inLoop)) loop += s.v
      else other.push({ t: s.t, v: +s.v.toFixed(4), sources: s.sources })
    }
    return { total, navOnly, tryTools, loop, other }
  }, { from, until })
}

for (const view of [1440, 768, 390]) {
  test(`T4 nothing shifts on a cold load at ${view}px`, async ({ browser }, info) => {
    const { ctx, page } = await open(browser, view)
    await go(page, '/')
    await page.waitForTimeout(1800)
    const s = await shifts(page)
    if (s.navOnly) info.annotations.push({ type: 'cls-nav', description: `${s.navOnly.toFixed(4)} from the nav's icon boxes moving sideways` })
    expect(s.other, 'a layout shift from the page itself on load').toEqual([])
    await ctx.close()
  })

  test(`T4 a full scroll and folder switches shift nothing outside the Try section at ${view}px`, async ({ browser }) => {
    const { ctx, page } = await open(browser, view)
    await go(page, '/')
    await page.waitForTimeout(1800)
    await homeSectionsLoaded(page)
    // Shifts from here on only: the cold load has its own test.
    const since = await page.evaluate(() => performance.now())
    await scrollThrough(page)
    await page.locator('#bookmarks').scrollIntoViewIfNeeded()
    await switchTools(page)
    await page.waitForTimeout(600)
    const s = await shifts(page, { from: since })
    expect(s.other, 'a layout shift from the page itself').toEqual([])
    await ctx.close()
  })
}

// ── T5: content changes do not move what is below ───────────────────────────

for (const view of [1440, 768, 390]) {
  test(`T5 a folder pick leaves the Exports heading where it was at ${view}px`, async ({ browser }) => {
    const { ctx, page } = await open(browser, view)
    await go(page, '/')
    await homeSectionsLoaded(page)
    await page.locator('#bookmarks').scrollIntoViewIfNeeded()
    const top = () => page.evaluate(() => document.querySelector('#exports-h').getBoundingClientRect().top + window.scrollY)
    const start = await top()
    for (const name of FOLDER_NAMES) {
      await folderButton(page, name).click()
      await page.waitForTimeout(350)
      expect(await top(), `the Exports heading moved after opening ${name}`).toBe(start)
    }
    await ctx.close()
  })
}

for (const view of [1440, 390]) {
  test(`T5 each figure is printed as it is, and keeps its text and its box, at ${view}px`, async ({ browser }) => {
    const { ctx, page } = await open(browser, view)
    await go(page, '/')
    await homeSectionsLoaded(page)
    await page.waitForTimeout(1500)
    await page.evaluate(() => {
      window.__fig = []
      const els = [...document.querySelectorAll('.hp-l strong')]
      const tick = () => {
        window.__fig.push({ t: performance.now(), f: els.map((e) => { const r = e.getBoundingClientRect(); return { text: e.textContent, x: r.x + window.scrollX, w: r.width } }) })
        requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    })
    await page.locator('.hp-l').scrollIntoViewIfNeeded()
    await page.waitForTimeout(1500)
    const samples = await page.evaluate(() => window.__fig)
    const changed = samples.filter((s, i) => i > 0 && s.f.some((f, k) => f.text !== samples[i - 1].f[k].text))
    expect(samples.length, 'the sampler never ran, so there is nothing to compare').toBeGreaterThan(5)
    expect(changed.length, 'a figure changed its text, so something counts up again').toBe(0)
    PROOF_ROWS.forEach((stat, k) => {
      const lefts = samples.map((s) => s.f[k].x)
      // The page may scroll while the sampler runs; compare the box to ITS OWN final box in page coordinates.
      expect(new Set(lefts.map((x) => x.toFixed(1))).size, `figure ${k} (${finalFigure(stat)}) moved sideways: ${[...new Set(lefts.map((x) => x.toFixed(1)))]}`).toBe(1)
      expect(new Set(samples.map((s) => s.f[k].w.toFixed(1))).size, `figure ${k} changed width`).toBe(1)
      expect(samples.at(-1).f[k].text).toBe(finalFigure(stat))
    })
    await ctx.close()
  })
}

// ── T7: scroll listeners ────────────────────────────────────────────────────

/** Scroll listeners on window/document that are still attached. */
const liveScroll = (page) => page.evaluate(() => {
  const m = window.__hm
  const removed = [...m.removes]
  let live = 0
  for (const fn of m.adds) {
    const at = removed.indexOf(fn)
    if (at > -1) removed.splice(at, 1)
    else live += 1
  }
  return live
})

// What stays attached after a full scroll, counted in a browser (the budget is that
// count, not a guess): the nav's hide-on-scroll, Lenis, and the Try section's
// active-tool tracker. A section that adds another scroll listener raises it.
const SCROLL_BUDGET = { 390: 3, 768: 3, 1440: 3 }
for (const [view, budget] of Object.entries(SCROLL_BUDGET)) {
  test(`T7 after a full scroll at ${view}px at most ${budget} scroll listeners are attached`, async ({ browser }) => {
    const { ctx, page } = await open(browser, Number(view))
    await go(page, '/')
    await homeSectionsLoaded(page)
    await page.waitForTimeout(800)
    await scrollThrough(page)
    expect(await liveScroll(page), 'a scroll listener the budget does not name is attached').toBeLessThanOrEqual(budget)
    await ctx.close()
  })
}
