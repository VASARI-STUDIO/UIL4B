// THE HOMEPAGE'S MOTION, MEASURED IN A BROWSER.
//
// The homepage got a hero arrival (the sub-line, search and buttons rise in and the
// band is set bar by bar), shorter section headings, an observer-driven bench,
// a sliding tab pill, a library fade and a single-observer count-up. Each of them
// can be done wrongly in a way the page still LOOKS fine in a screenshot:
//
//   - the arrival can move the headline, which makes the settled hydrated
//     headline a later and larger LCP candidate and puts LCP back on hydration;
//   - a content switch can move the layout under a thumb (CLS);
//   - the reduced-motion choice can be answered by one input and not the other;
//   - a scroll handler can come back on the bench or the proof band;
//   - a figure can end on the wrong number, or its box can change width as it counts.
//
// So the oracles are the BROWSER'S OWN: `document.getAnimations()` scanned every
// frame (an animation that has finished is no longer listed, so "did it run?"
// cannot be asked afterwards), a buffered `layout-shift` observer, a buffered
// `largest-contentful-paint` observer, and a wrapper on addEventListener that
// knows which scroll listeners are still attached.
//
// Hand-checked numbers (spec: handover/specs/home-motion-spec-2026-10-27.md):
//   bar:  600ms at 1001px and up, 420ms at 1000px and below; the bar at place i
//         starts i*14ms (i*10ms) after the arrival begins; 21 bars in the band and
//         21 in its reflection = 42
//   controls: sub-line, search, buttons = 3, each 240ms (200ms), +0/+60/+120ms (+0/+40/+80ms)
//   section headings: 600ms, delay capped at 8*40ms, not at all at 1000px and below
//   count-up: 700ms (600ms at 1000px and below), the four figures start together
//
// WHAT THIS DOES NOT PROVE: the 4x-throttled frame trace of the spec's T8 (a manual
// trace, recorded in the PR), and Firefox/Safari (no view timelines there).
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'
import { PROOF_STATS } from '../../src/components/spectrum/spectrumFacts.js'

const PERSONA = 'a first-time visitor on the front door'
const NEW_MOTION = /^(sp-arrive|sp-bar-set|sp-depth|sp-enter|sp-fade-[ab]|sp-word-up)$/

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
          cls: el ? String(el.className) : '', tag: el ? el.tagName : '',
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
    sources: (e.sources || []).map((s) => ({ prev: rect(s.previousRect), cur: rect(s.currentRect) })) }) })
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

/** Every finite animation this slice added has finished (the depth is scroll-driven and never does; other sheets loop). */
const settled = (page) => page.waitForFunction(() => {
  const mine = window.__hm.objs.filter((a) => /^(sp-arrive|sp-bar-set|sp-enter|sp-fade-[ab]|sp-word-up)$/.test(a.animationName))
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

const TOOL_TABS = ['Palette', 'Icons', 'Fonts', 'Converter']
/** Press the four tools on the phone switcher (a real switch each time, Palette is the start). */
async function switchTools(page) {
  for (const name of ['Icons', 'Fonts', 'Converter', 'Palette']) {
    await page.getByLabel('Tools').getByRole('tab', { name, exact: true }).click()
    await page.waitForTimeout(350)
  }
}
/** Press the other two library chips, then the first again. */
async function pressChips(page) {
  for (const i of [1, 2, 0]) {
    await page.locator('.sp-chip').nth(i).click()
    await page.waitForTimeout(350)
  }
}

const finalFigure = (s) => (s.value >= 1000 ? s.value.toLocaleString('en-GB') : String(s.value))

// ── T1: the cold-load hero ──────────────────────────────────────────────────

for (const view of [1440, 390]) {
  test.describe(`T1 the cold-load hero at ${view}px`, () => {
    const phone = view <= 1000
    const barMs = phone ? 420 : 600
    const stepMs = phone ? 10 : 14

    test('the controls and the band arrive, then rest at their real values', async ({ browser }) => {
      const { ctx, page } = await open(browser, view)
      await go(page, '/')
      await expect(page.locator('.sp-hero.is-arriving'), 'the hero never took the arrival class').toHaveCount(1)
      await settled(page)

      const bars = await ran(page, 'sp-bar-set')
      const arrive = await ran(page, 'sp-arrive')
      expect(bars.length, 'the band is set by 21 bars and their 21 reflections').toBe(42)
      expect(arrive.length, 'the sub-line, the search and the buttons each arrive once').toBe(3)
      expect(await ran(page, 'sp-word-up'), 'the painted headline must not animate on a cold load').toHaveLength(0)
      expect(new Set(bars.map((a) => a.dur))).toEqual(new Set([barMs]))
      expect(Math.max(...bars.map((a) => a.delay)), 'the last bar starts 20 places in').toBe(20 * stepMs)
      expect(Math.min(...bars.map((a) => a.delay)), 'the first bar starts at once').toBe(0)
      expect(arrive.map((a) => a.delay).sort((a, b) => a - b), 'sub-line, search, buttons stagger').toEqual(phone ? [0, 40, 80] : [0, 60, 120])
      expect(new Set(arrive.map((a) => a.dur))).toEqual(new Set([phone ? 200 : 240]))
      // Only the hero's band is set: the closing band just sits there.
      expect(await page.locator('.sp-ramp--arrive').count()).toBe(1)

      // At rest: no leftover transform or opacity on anything that arrived.
      const rest = await page.evaluate(() => ({
        bars: [...document.querySelectorAll('.sp-ramp--hero .sp-ramp-bar')].map((b) => getComputedStyle(b).transform),
        controls: ['.sp-hero-sub', '.sp-hero-bar .tim-anchor', '.sp-hero-cta'].map((s) => {
          const cs = getComputedStyle(document.querySelector(s))
          return { s, opacity: cs.opacity, transform: cs.transform }
        }),
      }))
      expect(rest.bars.length).toBe(42)
      expect(new Set(rest.bars), 'a bar rests with a transform of its own').toEqual(new Set(['none']))
      for (const c of rest.controls) expect(c, `${c.s} did not come to rest settled`).toMatchObject({ opacity: '1', transform: 'none' })
      await ctx.close()
    })

    test('the first frame is a 12% line and hidden controls (so the run is not vacuous)', async ({ browser }) => {
      const { ctx, page } = await open(browser, view)
      await go(page, '/')
      await settled(page)
      // Rewind each finished run to its own time 0 and read what a visitor's first frame would be.
      const first = await page.evaluate(() => {
        const out = { bars: [], controls: [] }
        for (const a of window.__hm.objs) {
          if (a.animationName !== 'sp-bar-set' && a.animationName !== 'sp-arrive') continue
          const el = a.effect.target
          a.pause(); a.currentTime = 0
          const cs = getComputedStyle(el)
          if (a.animationName === 'sp-bar-set') out.bars.push(cs.transform)
          if (a.animationName === 'sp-arrive') out.controls.push({ opacity: cs.opacity, transform: cs.transform })
          a.cancel()
        }
        return out
      })
      expect(new Set(first.bars), 'a bar starts as a 12% line along its baseline').toEqual(new Set([
        'matrix(1, 0, 0, 0.12, 0, 0)',
      ]))
      expect(first.controls).toHaveLength(3)
      for (const c of first.controls) expect(c).toEqual({ opacity: '0', transform: 'matrix(1, 0, 0, 1, 0, 8)' })
      await ctx.close()
    })
  })
}

test('T1 arriving in-session, the headline leads and the controls and band start 300ms in', async ({ browser }) => {
  const { ctx, page } = await open(browser, 1440)
  await go(page, '/plans')
  await page.locator('a.spnav-mark').first().click()
  await expect(page.locator('.sp-hero-h1')).toBeVisible()
  await expect(page.locator('.sp-hero.is-in.is-arriving'), 'an in-session arrival lights the headline and the controls').toHaveCount(1)
  await settled(page)
  const words = await ran(page, 'sp-word-up')
  expect(words.length, 'the headline rises word by word when it really is an arrival').toBeGreaterThan(0)
  const arrive = await ran(page, 'sp-arrive')
  expect(arrive.map((a) => a.delay).sort((a, b) => a - b), '300ms lead on the controls').toEqual([300, 360, 420])
  const bars = await ran(page, 'sp-bar-set')
  expect(Math.min(...bars.map((a) => a.delay))).toBe(300)
  await ctx.close()
})

// ── T2: LCP holds with the arrival on ───────────────────────────────────────

for (const view of [320, 390, 768, 1440]) {
  test(`T2 the largest paint stays the headline at ${view}px`, async ({ browser }) => {
    const { ctx, page } = await open(browser, view)
    await go(page, '/')
    await settled(page)
    // Past SpectrumSearch's first typing beat, so a late candidate would have been recorded.
    await page.waitForTimeout(2500)
    const lcp = await hm(page, () => window.__hm.lcp)
    expect(lcp.length, 'no largest-contentful-paint entry was recorded').toBeGreaterThan(0)
    expect(lcp.at(-1).el, `the last LCP candidate is ${JSON.stringify(lcp)}, not the headline`).toBe('H1.sp-hero-h1')
    for (const e of lcp) expect(e.el, `a later paint (${e.el}) became a candidate: ${JSON.stringify(lcp)}`).toBe('H1.sp-hero-h1')
    await ctx.close()
  })
}

// ── T3: reduced motion, by either input ─────────────────────────────────────

/** Cold load, a full scroll, four tool switches (where the switcher is), three chip presses, the figures. */
async function exercise(page, view) {
  await go(page, '/')
  await page.waitForTimeout(1500)
  await scrollThrough(page)
  if (view <= 1000) {
    await page.locator('#bench').scrollIntoViewIfNeeded()
    await switchTools(page)
  }
  await page.locator('.sp-chips').scrollIntoViewIfNeeded()
  await pressChips(page)
  await page.locator('.sp-proof-row').scrollIntoViewIfNeeded()
}

const REDUCED = {
  'the Settings choice alone': { media: 'no-preference', settings: true },
  'the OS preference alone': { media: 'reduce', settings: undefined },
}
for (const [label, opts] of Object.entries(REDUCED)) {
  for (const view of [1440, 390]) {
    test(`T3 ${label} stops every named animation at ${view}px, and the figures read their final values`, async ({ browser }) => {
      const { ctx, page } = await open(browser, view, opts)
      await exercise(page, view)
      // The figure is read the moment the band is in view, before any count could have finished.
      const figures = await page.locator('.sp-proof-n').allTextContents()
      expect(figures, 'the figures are not their real values straight away').toEqual(PROOF_STATS.map(finalFigure))
      await page.waitForTimeout(1000)
      expect(await page.locator('.sp-proof-n').allTextContents()).toEqual(PROOF_STATS.map(finalFigure))
      const named = (await hm(page, () => window.__hm.anims)).filter((a) => NEW_MOTION.test(a.name))
      expect(named.map((a) => a.name), `with ${label}, these still ran`).toEqual([])
      // And the content is settled in plain CSS, not waiting on a run.
      const rest = await page.evaluate(() => [...document.querySelectorAll('.sp-hero-sub, .sp-hero-bar .tim-anchor, .sp-hero-cta')]
        .map((e) => getComputedStyle(e)).map((c) => `${c.opacity}/${c.transform}`))
      expect(new Set(rest)).toEqual(new Set(['1/none']))
      await ctx.close()
    })
  }
}

test('T3 an explicit Settings opt-in to motion wins over the OS preference (the arrival runs)', async ({ browser }) => {
  const { ctx, page } = await open(browser, 390, { media: 'reduce', settings: false })
  await go(page, '/')
  await settled(page)
  expect(await ran(page, 'sp-arrive')).toHaveLength(3)
  expect(await ran(page, 'sp-bar-set')).toHaveLength(42)
  await ctx.close()
})

test('T3 with motion on and a wide window, the same walk does produce the named animations (the detector sees them)', async ({ browser }) => {
  const { ctx, page } = await open(browser, 1440)
  await exercise(page, 1440)
  const names = new Set((await hm(page, () => window.__hm.anims)).map((a) => a.name))
  for (const want of ['sp-arrive', 'sp-bar-set', 'sp-depth', 'sp-word-up', 'sp-fade-a']) {
    expect(names.has(want) || (want === 'sp-fade-a' && names.has('sp-fade-b')), `${want} never ran: ${[...names]}`).toBe(true)
  }
  await ctx.close()
})

test('T3 with motion on at 390, the tool switch enters and the tab pill slides', async ({ browser }) => {
  const { ctx, page } = await open(browser, 390)
  await go(page, '/')
  await page.locator('#bench').scrollIntoViewIfNeeded()
  const before = await page.evaluate(() => window.__hm.anims.filter((a) => a.name === 'sp-enter').length)
  expect(before, 'the first paint must not run the tool-switch enter').toBe(0)
  const pill = page.locator('.sp-rail-ind')
  const x0 = (await pill.boundingBox()).x
  await page.getByLabel('Tools').getByRole('tab', { name: 'Icons', exact: true }).click()
  await page.waitForTimeout(400)
  expect((await ran(page, 'sp-enter')).length, 'choosing a tool enters its window').toBe(1)
  const x1 = (await pill.boundingBox()).x
  expect(x1 - x0, 'the pill sits one segment (82.5px + 4px gap) further along after one step').toBeCloseTo(86.5, 0)
  await ctx.close()
})

// ── T4: no layout shift ─────────────────────────────────────────────────────

/**
 * The shifts, split into the nav row's known 44x44 icon hit-area boxes (their own measured
 * source, below) and everything else. `content` is the number this slice is answerable for.
 */
async function shifts(page) {
  return page.evaluate(() => {
    const nav = (r) => Math.abs(r.w - 44) < 1 && Math.abs(r.h - 44) < 1 && r.y > 10 && r.y < 32
    let total = 0
    let navOnly = 0
    const other = []
    for (const s of window.__hm.shifts) {
      total += s.v
      if (s.sources.length && s.sources.every((x) => nav(x.prev) && nav(x.cur))) navOnly += s.v
      else other.push({ t: s.t, v: +s.v.toFixed(4), sources: s.sources })
    }
    return { total, navOnly, other }
  })
}

for (const view of [1440, 768, 390]) {
  test(`T4 the page does not shift: cold load, a full scroll, tool switches and chip presses at ${view}px`, async ({ browser }, info) => {
    const { ctx, page } = await open(browser, view)
    await go(page, '/')
    await page.waitForTimeout(1800)
    await scrollThrough(page)
    if (view <= 1000) {
      await page.locator('#bench').scrollIntoViewIfNeeded()
      await switchTools(page)
    }
    await page.locator('.sp-chips').scrollIntoViewIfNeeded()
    await pressChips(page)
    await page.waitForTimeout(600)
    const s = await shifts(page)
    if (s.navOnly) info.annotations.push({ type: 'cls-nav', description: `${s.navOnly.toFixed(4)} from the nav's 44x44 icon hit areas (pre-existing, not this slice)` })
    expect(s.other, 'a layout shift from the page itself').toEqual([])
    if (view === 1440) expect(s.total, 'CLS at 1440 is 0 in total').toBe(0)
    else expect(s.navOnly, 'the nav hit-area shift grew').toBeLessThan(0.006)
    await ctx.close()
  })
}

// ── T5: content changes do not move what is below ───────────────────────────

for (const view of [390, 768]) {
  test(`T5 a tool switch leaves the Exports heading where it was at ${view}px`, async ({ browser }) => {
    const { ctx, page } = await open(browser, view)
    await go(page, '/')
    const top = () => page.evaluate(() => document.querySelector('#sp-spec-h').getBoundingClientRect().top + window.scrollY)
    const start = await top()
    for (const name of ['Icons', 'Fonts', 'Converter', 'Palette']) {
      await page.getByLabel('Tools').getByRole('tab', { name, exact: true }).click()
      await page.waitForTimeout(350)
      expect(await top(), `the Exports heading moved after switching to ${name}`).toBe(start)
    }
    await ctx.close()
  })
}

for (const view of [1440, 768, 390]) {
  test(`T5 a chip press leaves the page's length and the grid's height where they were at ${view}px`, async ({ browser }) => {
    const { ctx, page } = await open(browser, view)
    await go(page, '/')
    await page.locator('.sp-chips').scrollIntoViewIfNeeded()
    const read = () => page.evaluate(() => ({
      doc: document.documentElement.scrollHeight,
      grid: Math.round(document.querySelector('.sp-disc-grid').getBoundingClientRect().height),
      proof: Math.round(document.querySelector('#index').getBoundingClientRect().top + window.scrollY),
    }))
    const start = await read()
    for (const i of [1, 2, 0]) {
      await page.locator('.sp-chip').nth(i).click()
      await page.waitForTimeout(350)
      expect(await read(), `chip ${i} changed the height of the library grid, so everything under it moved`).toEqual(start)
    }
    await ctx.close()
  })
}

for (const view of [1440, 390]) {
  test(`T5 each figure keeps its box while it counts at ${view}px`, async ({ browser }) => {
    const { ctx, page } = await open(browser, view)
    await go(page, '/')
    await page.waitForTimeout(1500)
    await page.evaluate(() => {
      window.__fig = []
      const els = [...document.querySelectorAll('.sp-proof-n')]
      const tick = () => {
        window.__fig.push({ t: performance.now(), f: els.map((e) => { const r = e.getBoundingClientRect(); return { text: e.textContent, x: r.x + window.scrollX, w: r.width } }) })
        requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    })
    await page.locator('.sp-proof-row').scrollIntoViewIfNeeded()
    await page.waitForTimeout(1500)
    const samples = await page.evaluate(() => window.__fig)
    const changed = samples.filter((s, i) => i > 0 && s.f.some((f, k) => f.text !== samples[i - 1].f[k].text))
    expect(changed.length, 'the count never ran, so there is nothing to compare').toBeGreaterThan(5)
    PROOF_STATS.forEach((stat, k) => {
      const lefts = samples.map((s) => s.f[k].x)
      // The page may scroll while the sampler runs; compare the box to ITS OWN final box in page coordinates.
      expect(new Set(lefts.map((x) => x.toFixed(1))).size, `figure ${k} (${finalFigure(stat)}) moved sideways while counting: ${[...new Set(lefts.map((x) => x.toFixed(1)))]}`).toBe(1)
      expect(new Set(samples.map((s) => s.f[k].w.toFixed(1))).size, `figure ${k} changed width while counting`).toBe(1)
      expect(samples.at(-1).f[k].text).toBe(finalFigure(stat))
    })
    await ctx.close()
  })
}

// ── T6: phone feel, and the desktop timings ─────────────────────────────────

for (const view of [390, 768]) {
  test(`T6 at ${view}px section headings do not rise, the band is set in 420ms, and the figures count together in under 700ms`, async ({ browser }) => {
    const { ctx, page } = await open(browser, view)
    await go(page, '/')
    await page.evaluate(() => {
      window.__chg = []
      const els = [...document.querySelectorAll('.sp-proof-n')]
      const last = els.map((e) => e.textContent)
      const tick = () => {
        els.forEach((e, k) => { if (e.textContent !== last[k]) { last[k] = e.textContent; window.__chg.push({ k, t: performance.now() }) } })
        requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    })
    await scrollThrough(page)
    await page.locator('.sp-proof-row').scrollIntoViewIfNeeded()
    await page.waitForTimeout(1200)
    expect(await ran(page, 'sp-word-up'), 'a heading rose on a phone-width screen').toHaveLength(0)
    const barMs = await page.evaluate(() => getComputedStyle(document.querySelector('.sp-ramp--hero .sp-ramp-bar')).animationDuration)
    expect(barMs).toBe('0.42s')
    const chg = await page.evaluate(() => window.__chg)
    const firsts = [0, 1, 2, 3].map((k) => Math.min(...chg.filter((c) => c.k === k).map((c) => c.t)))
    expect(Math.max(...firsts) - Math.min(...firsts), 'the four figures did not start in the same frame').toBeLessThanOrEqual(16.7)
    const span = Math.max(...chg.map((c) => c.t)) - Math.min(...chg.map((c) => c.t))
    expect(span, 'the count ran for 700ms or more on a phone').toBeLessThan(700)
    expect(span, 'the count did not run').toBeGreaterThan(250)
    await ctx.close()
  })
}

test('T6 at 1440 the band bar is 600ms, headings rise in 600ms with a capped stagger, and the count is under 750ms', async ({ browser }) => {
  const { ctx, page } = await open(browser, 1440)
  await go(page, '/')
  await page.evaluate(() => {
    window.__chg = []
    const els = [...document.querySelectorAll('.sp-proof-n')]
    const last = els.map((e) => e.textContent)
    const tick = () => {
      els.forEach((e, k) => { if (e.textContent !== last[k]) { last[k] = e.textContent; window.__chg.push({ k, t: performance.now() }) } })
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })
  await scrollThrough(page)
  await page.locator('.sp-proof-row').scrollIntoViewIfNeeded()
  await page.waitForTimeout(1200)
  expect(await page.evaluate(() => getComputedStyle(document.querySelector('.sp-ramp--hero .sp-ramp-bar')).animationDuration)).toBe('0.6s')
  const words = await ran(page, 'sp-word-up')
  expect(words.length, 'section headings rise at desktop width').toBeGreaterThan(10)
  expect(new Set(words.map((a) => a.dur)), 'a section heading rises in 600ms').toEqual(new Set([600]))
  expect(Math.max(...words.map((a) => a.delay)), 'the longest heading ends in 840ms: delay capped at 8 x 40ms').toBeLessThanOrEqual(320)
  const chg = await page.evaluate(() => window.__chg)
  const firsts = [0, 1, 2, 3].map((k) => Math.min(...chg.filter((c) => c.k === k).map((c) => c.t)))
  expect(Math.max(...firsts) - Math.min(...firsts), 'the four figures did not start in the same frame').toBeLessThanOrEqual(16.7)
  const span = Math.max(...chg.map((c) => c.t)) - Math.min(...chg.map((c) => c.t))
  expect(span).toBeLessThan(750)
  expect(span).toBeGreaterThan(300)
  await ctx.close()
})

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

// What stays attached after a full scroll, counted: the nav's hide, Lenis, the Exports stack's
// per-frame write (PR #679, flagged in the spec as a follow-up), one band spin while a band is on
// screen, and at 1440 the footer curtain. The bench and the proof band add none. The spec's own
// budget of 2 and 3 left out Lenis and the Exports stack; this is its figure with those named.
for (const [view, budget] of [[390, 4], [768, 4], [1440, 5]]) {
  test(`T7 after a full scroll at ${view}px at most ${budget} scroll listeners are attached`, async ({ browser }) => {
    const { ctx, page } = await open(browser, view)
    await go(page, '/')
    await page.waitForTimeout(800)
    await scrollThrough(page)
    expect(await liveScroll(page), 'a scroll listener the budget does not name is attached').toBeLessThanOrEqual(budget)
    await ctx.close()
  })
}

test('T7 a band\'s hue listener is attached only while a band is near the screen', async ({ browser }) => {
  const { ctx, page } = await open(browser, 1440)
  await go(page, '/')
  await page.waitForTimeout(800)
  const atTop = await liveScroll(page)
  await page.locator('.sp-disc-grid').evaluate((el) => el.scrollIntoView({ block: 'center' }))
  await page.waitForTimeout(600)
  const mid = await liveScroll(page)
  expect(mid, 'a band far off screen still holds a scroll listener').toBe(atTop - 1)
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
  await page.waitForTimeout(600)
  expect(await liveScroll(page), 'the closing band did not attach on arrival').toBe(mid + 1)
  await ctx.close()
})

// ── the bench at 1001px and up ──────────────────────────────────────────────

test('the windows\' depth is a view timeline, and the lit rail follows the window at the middle of the screen', async ({ browser }) => {
  const { ctx, page } = await open(browser, 1440)
  await go(page, '/')
  const depth = (await ran(page, 'sp-depth'))
  expect(depth.length, 'one depth run per window').toBe(4)
  expect(depth.every((a) => a.scrollDriven), 'the depth is not scroll-linked').toBe(true)
  for (let i = 0; i < 4; i += 1) {
    // Put window i in the middle of the screen, then read the depth and the lit row.
    await page.locator(`.sp-panel[data-panel="${i}"]`).evaluate((el) => {
      const r = el.getBoundingClientRect()
      window.scrollTo(0, window.scrollY + r.top + r.height / 2 - window.innerHeight / 2)
    })
    await expect.poll(() => page.evaluate(() => [...document.querySelectorAll('.sp-rail-row')].map((r, k) => (r.classList.contains('is-on') ? k : -1)).filter((k) => k > -1)),
      { message: `window ${i} is centred but the rail does not light it` }).toEqual([i])
    const o = await page.evaluate(() => [...document.querySelectorAll('.sp-panel[data-panel]')].map((p) => +getComputedStyle(p).opacity))
    expect(o[i], `the centred window ${i} is not at full ink`).toBeGreaterThan(0.97)
    const others = o.filter((_, k) => k !== i)
    expect(Math.min(...others), 'a window away from the middle is not dimmer than the centred one').toBeLessThan(o[i] - 0.02)
  }
  await ctx.close()
})
