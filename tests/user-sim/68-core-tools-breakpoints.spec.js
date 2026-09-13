// The 2026-09-09 breakpoint pass over the six CORE tools — the ones a visitor
// spends their time in: /create/palette, /create/type-scale, /create/font-pair,
// /create/contrast, /create/tint and /create/gradient.
//
// Rendered at 320, 390, 430, 768, 1024, 1097, 1120, 1136, 1280, 1440 and 1920,
// light and dark, reduced motion on and off, signed out, signed in with saved
// projects, at the free cap, as Pro, with a long project name, and with every
// panel, tab and popover each tool has open — by a Playwright sweep that
// measured boxes, words and paint rather than reading stylesheets (the same
// reason 23-responsive-mid-band, 25-defect-sweep and 65-new-surfaces give).
// 1,446 measurements; no horizontal overflow and no missing focus ring
// anywhere. Every test below pins a fault that sweep DID find, at the width,
// theme and state it was found in, and each was watched fail with its fix
// reverted (the mutation is named on the test).
//
// `test` comes from ./base.js, not @playwright/test — that is where Google One
// Tap is stubbed on the browser fixture.
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'

const IOS_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'

/** A context at an exact width: real touch metrics under 700, a desktop above. */
async function at(browser, width, theme = 'light') {
  const ctx = await browser.newContext(width < 700
    ? { viewport: { width, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: IOS_UA }
    : { viewport: { width, height: 900 } })
  await ctx.addInitScript((t) => { try { localStorage.setItem('vs-t', t) } catch { /* private mode */ } }, theme)
  const page = await ctx.newPage()
  return { ctx, page }
}

async function settle(page) {
  await page.evaluate(async () => {
    for (let round = 0; round < 3; round++) {
      await document.fonts.ready
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    }
  })
}

/**
 * A popover's box, measured only once its entrance has finished. `.pop` and
 * `.plb-menu` rise in with `scale(.985)`, so a rect read two frames after the
 * click is 1.5% short — a 24px slider reads 23.6 — and a reduced-motion
 * viewer's box is right from the first frame. Settling on the animation
 * layer itself is the only read that is true in both cases.
 */
async function settled(page, selector) {
  await page.waitForFunction((s) => {
    const el = document.querySelector(s)
    return !!el && el.getAnimations({ subtree: true }).every((a) => a.playState === 'finished' || a.playState === 'idle')
  }, selector, { polling: 'raf', timeout: 5000 })
  await settle(page)
}

/**
 * Hover, then read only once the hover state has PAINTED. Both hover faults
 * here are transitions (`background var(--t)`, `opacity var(--t)`), and a
 * read taken straight after the mouse move sees the resting style: the first
 * version of the Copy-link test waited for "opacity is 1", was satisfied
 * before the transition had started, and stayed green with the fault in
 * place. So: let a frame pass, then require no running transition on the
 * element and four identical paint samples in a row.
 */
async function hoverSettled(page, locator, selector) {
  await locator.hover()
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
  await page.waitForFunction((s) => {
    const el = document.querySelector(s)
    if (!el.matches(':hover')) return false
    if (el.getAnimations().some((a) => a.playState === 'running')) { window.__hs = []; return false }
    const cs = getComputedStyle(el)
    const v = `${cs.backgroundColor}|${cs.opacity}|${cs.color}`
    window.__hs = window.__hs || []
    window.__hs.push(v); if (window.__hs.length > 4) window.__hs.shift()
    return window.__hs.length === 4 && new Set(window.__hs).size === 1
  }, selector, { polling: 'raf', timeout: 5000 })
  await page.evaluate(() => { window.__hs = null })
}

const LONG_NAME = 'Quarterly rebrand exploration for the northern hemisphere retail launch, revision fourteen'
function projectRecord(id, name) {
  return {
    id, name,
    design: { palette: { colors: ['#101010', '#F0F0F0', '#3355AA'] } },
    createdAt: '2026-08-01T09:00:00.000Z', updatedAt: '2026-09-01T09:00:00.000Z',
  }
}

/**
 * WCAG contrast of an element's text against the colour actually painted
 * behind it — ancestors walked until one has an opaque background, alpha and
 * the element's own opacity chain blended in. Runs in the page.
 */
function contrastOf(selector) {
  const el = document.querySelector(selector)
  if (!el) return null
  const parse = (s) => {
    if (!s) return null
    if (s.startsWith('color(srgb')) { const m = s.match(/[\d.]+/g); const v = m.map(Number); return [v[0] * 255, v[1] * 255, v[2] * 255, v[3] ?? 1] }
    const m = s.match(/[\d.]+/g); return m ? m.map(Number) : null
  }
  const lum = ([r, g, b]) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b) }
  const blend = (fg, bg) => { const a = fg[3] ?? 1; return [0, 1, 2].map((i) => fg[i] * a + bg[i] * (1 - a)) }
  let bg = null, acc = null, cur = el
  while (cur && cur !== document.documentElement) {
    const c = parse(getComputedStyle(cur).backgroundColor)
    if (c && (c[3] ?? 1) > 0) {
      if ((c[3] ?? 1) >= 1) { bg = acc ? blend(acc, c) : c; break }
      acc = acc ? blend(acc, [...c, 1]) : c
    }
    cur = cur.parentElement
  }
  if (!bg) bg = acc ? blend(acc, [255, 255, 255]) : [255, 255, 255]
  let op = 1
  for (let n = el; n && n !== document.body; n = n.parentElement) op *= parseFloat(getComputedStyle(n).opacity)
  const fg = parse(getComputedStyle(el).color)
  const ink = blend([fg[0], fg[1], fg[2], (fg[3] ?? 1) * op], bg)
  const l1 = lum(ink), l2 = lum(bg)
  return { ratio: +((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)).toFixed(2), ink: ink.map(Math.round), bg: bg.map(Math.round), text: el.textContent.trim().slice(0, 30) }
}

/** Does any word in `selector`'s text start on one line and end on another? */
function splitWords(selector) {
  const el = document.querySelector(selector)
  if (!el) return null
  const out = []
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  let node
  while ((node = walker.nextNode())) {
    const re = /\S+/g
    let m
    while ((m = re.exec(node.nodeValue))) {
      if (m[0].length < 4) continue
      const range = document.createRange()
      range.setStart(node, m.index); range.setEnd(node, m.index + m[0].length)
      const rects = [...range.getClientRects()].filter((r) => r.width > 0)
      if (rects.length > 1 && Math.abs(rects[0].top - rects[rects.length - 1].top) > 2) out.push(m[0])
    }
  }
  return out
}

// ─────────────────────────────────────────────────────────────────────────────
// Popovers that left the viewport
// ─────────────────────────────────────────────────────────────────────────────

test.describe('a colour picker opened near the left edge stays on screen', () => {
  // usePopover's third alignment, 'clamp', CENTRED the panel on its trigger,
  // which is not a clamp: the 268px seed picker centred on a chip 79px from
  // the left of a 320px phone rendered from x=-24 — "PICK SEED COLOUR" read
  // "ICK SEED COLOUR" and the first preset column was gone. The gradient
  // tool's stop picker had the same fault at the same width.
  //
  // MUTATION: restore `left:50%;transform:translateX(-50%)` on
  // `.pop[data-pop-align="clamp"]` in global.css — both routes report the
  // panel 24px past the left edge.
  // WHICH ROUTE STILL REPRODUCES THE CLAMP. The guarantee both routes carry is
  // the last two assertions: the panel is on screen at 320. Only the gradient
  // stop still forces the 'clamp' branch to get there.
  //
  // /create/palette's seed trigger used to sit 79px from the left, behind the
  // 15px `h1.plb-title` in the toolbar. That h1 moved into a heading area above
  // the toolbar (2026-09-13), so the trigger is now the first thing in the row
  // and starts at the 12px gutter. Measured at 320x844 after: trigger 12..52,
  // panel 12..256 of 320, "PICK SEED COLOUR" complete. usePopover picks 'start'
  // because start now fits — which is the better outcome, not a regression, and
  // asserting 'clamp' there would be asserting that the trigger stays crowded.
  for (const [route, trigger, what, align] of [
    ['/create/palette', '.plb-seedpick .cpk-trigger', 'the seed colour', 'start'],
    ['/create/gradient', '.ggn-stop-swatch .cpk-trigger', 'a gradient stop', 'clamp'],
  ]) {
    test(`${route} · the picker for ${what} at 320`, async ({ browser }) => {
      const { ctx, page } = await at(browser, 320)
      watch(page, `someone picking ${what} on a small phone`)
      await go(page, route)
      await page.locator(trigger).first().click()
      const pop = page.locator('.cpk-pop')
      await expect(pop).toBeVisible()
      await settled(page, '.cpk-pop')
      const m = await pop.evaluate((el) => {
        const r = el.getBoundingClientRect()
        return { left: Math.round(r.left), right: Math.round(r.right), align: el.getAttribute('data-pop-align'), width: Math.round(r.width) }
      })
      await ctx.close()
      expect(m.align, `${route} aligns its picker`).toBe(align)
      expect(m.left, `the picker starts ${-m.left}px off the left of the screen`).toBeGreaterThanOrEqual(0)
      expect(m.right, 'and does not leave by the other side').toBeLessThanOrEqual(320)
    })
  }
})

test('/create/palette · the first column’s tints panel stays inside the board at 1024 and 1097', async ({ browser }) => {
  // `.plb-tintpop` was centred on its column (left:50%; translateX(-50%)),
  // and a column is narrower than the 206px panel below ~1180px, so on the
  // FIRST column it sat at x=-10 at 1024 and x=-2 at 1097: the T95 and T90
  // labels started off screen.
  //
  // MUTATION: put `left:50%;transform:translateX(-50%)` back on
  // `.plb-tintpop,.plb-picker` — 1024 reports -10 and 1097 reports -2.
  test.setTimeout(60_000)
  const failures = []
  for (const width of [1024, 1097]) {
    const { ctx, page } = await at(browser, width)
    watch(page, `a designer opening the tints of their primary colour at ${width}px`)
    await go(page, '/create/palette')
    await page.locator('.plb-ramp').first().click()
    const pop = page.locator('.plb-tintpop')
    await expect(pop).toBeVisible()
    await settled(page, '.plb-tintpop')
    const left = await pop.evaluate((el) => Math.round(el.getBoundingClientRect().left))
    await ctx.close()
    if (left < 4) failures.push(`${width}px: the panel's left edge is at x=${left}`)
  }
  expect(failures, `the tints panel leaves the board:\n  ${failures.join('\n  ')}`).toEqual([])
})

test.describe('/create/palette · Save / export, signed in on a desktop', () => {
  // The last control on the toolbar row, hard against the right edge, and its
  // menu carried `.plb-menu--left` (left:0) like every other dropdown on the
  // row — so at 1440 the 264px menu ran 109px past the viewport for every
  // signed-in desktop user: "Copy link to this pale", "Submit to the comm".
  // With a saved project called LONG_NAME the box grew to 552px instead of
  // truncating, because an absolutely positioned box is shrink-to-fit and the
  // items are nowrap; 397px of it was off screen.
  //
  // MUTATION: delete the `.plb-savewrap .plb-menu{left:auto;right:0}` rule
  // in the ≥961 block — both tests fail on `right`; restore
  // `.plb-savemenu{min-width:264px}` — the long-name test fails on `width`.
  for (const [label, projects] of [
    ['two ordinary projects', 2],
    ['a project with a long name', [projectRecord('p-long', LONG_NAME), projectRecord('p2', 'Short')]],
  ]) {
    test(`the menu stays on screen with ${label}`, async ({ browser }) => {
      const { ctx, page } = await at(browser, 1440)
      watch(page, `a designer saving a palette at 1440px with ${label}`)
      await signIn(page, { plan: 'free', projects })
      await go(page, '/create/palette')
      await page.locator('button[aria-label="Save / export"]').click()
      const menu = page.locator('.plb-savemenu')
      await expect(menu).toBeVisible()
      await expect(menu.getByRole('button', { name: /Submit to the community/ })).toBeVisible()
      await settled(page, '.plb-savemenu')
      const m = await menu.evaluate((el) => {
        const r = el.getBoundingClientRect()
        const items = [...el.querySelectorAll('.plb-menu-item')].map((i) => ({ text: i.textContent.trim().slice(0, 24), right: Math.round(i.getBoundingClientRect().right) }))
        return { right: Math.round(r.right), width: Math.round(r.width), items }
      })
      await ctx.close()
      expect(m.right, `the menu runs ${m.right - 1440}px past the viewport`).toBeLessThanOrEqual(1440)
      expect(m.width, 'a long project name must be truncated, not given a wider menu').toBeLessThanOrEqual(300)
      for (const i of m.items) expect(i.right, `"${i.text}" is cut by the viewport`).toBeLessThanOrEqual(1440)
    })
  }
})

for (const [route, tab] of [['/create/type-scale', 'Developer handoff'], ['/create/font-pair', null]]) {
  test(`${route} · at the free cap on a 390px phone the save menu is not cut off above the screen`, async ({ browser }) => {
    // `.svt-menu` opens UPWARD (bottom: calc(100% + 8px)) from a button that
    // sits mid-screen. At the cap the wall makes it 419px tall, and at 390 the
    // wall's heading — the first thing the menu says — was 24px above the
    // viewport. Below 561px it is now a bottom sheet, the idiom .plb-menu
    // already uses on the palette below 961px.
    //
    // MUTATION: drop the ≤560 `.svt-menu{position:fixed…}` rule — both routes
    // report the top of the menu above y=0.
    const { ctx, page } = await at(browser, 390)
    watch(page, 'a free designer with three saved projects trying to keep a fourth, on a phone')
    await signIn(page, { plan: 'free', projects: 3 })
    await go(page, route)
    if (tab) await page.getByRole('tab', { name: tab }).click()
    const trigger = page.getByRole('button', { name: 'Save to a project' })
    // The fault depends on where the button sits when it is pressed: the menu
    // opens upward, so a button 100px under the nav has no room above it.
    // Pin that position rather than inherit whatever scrollIntoView chose —
    // with the button mid-screen the old menu happened to fit on Type Scale
    // and the test proved nothing.
    await trigger.evaluate((el) => { el.scrollIntoView({ block: 'start', behavior: 'instant' }); window.scrollBy(0, -100) })
    await trigger.click()
    const menu = page.locator('.svt-menu')
    await expect(menu).toBeVisible()
    await expect(page.getByTestId('type-save-wall'), 'this is the at-cap menu, with the wall').toBeVisible()
    await settled(page, '.svt-menu')
    const m = await menu.evaluate((el) => {
      const r = el.getBoundingClientRect()
      return { top: Math.round(r.top), bottom: Math.round(r.bottom), vh: window.innerHeight, headTop: Math.round(el.querySelector('.svt-wall-head').getBoundingClientRect().top) }
    })
    await ctx.close()
    expect(m.top, `the menu starts ${-m.top}px above the screen`).toBeGreaterThanOrEqual(0)
    expect(m.headTop, 'the wall’s heading is readable').toBeGreaterThanOrEqual(0)
    expect(m.bottom).toBeLessThanOrEqual(m.vh)
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Words broken in half
// ─────────────────────────────────────────────────────────────────────────────

test('/create/font-pair · the specimen heading keeps “Typography” whole at 320 and 360', async ({ browser }) => {
  // `.fpr-h1` was clamp(42px, 6vw, 76px): "Typography" is 235px at 42px and the
  // specimen column is 188px at 320 and 228px at 360, so overflow-wrap broke
  // the longest word of a TYPE SPECIMEN across two lines. The floor now scales
  // with the phone (10vw: 32px at 320, 36px at 360) and hands back to the old
  // curve from 420px.
  //
  // MUTATION: restore `font-size:clamp(42px,6vw,76px)` — both widths report
  // ["Typography"].
  test.setTimeout(60_000)
  const failures = []
  for (const width of [320, 360]) {
    const { ctx, page } = await at(browser, width)
    watch(page, `someone reading a font pairing on a ${width}px phone`)
    await go(page, '/create/font-pair')
    const h = page.locator('.fpr-h1')
    await expect(h).toContainText('Typography')
    await h.scrollIntoViewIfNeeded()
    await settle(page)
    const split = await page.evaluate(splitWords, '.fpr-h1')
    await ctx.close()
    if (split.length) failures.push(`${width}px: ${split.map((w) => `"${w}"`).join(', ')}`)
  }
  expect(failures, `words broken across lines:\n  ${failures.join('\n  ')}`).toEqual([])
})

test('/create/gradient · the CSS output never splits a hex value across two lines', async ({ browser }) => {
  // `.ggn-css code{word-break:break-all}`: in the two-column band (1024–1136)
  // and at 390 the inspector wrapped "#7C3AED" as "#7" / "C3AED" — one colour
  // reading as two. `overflow-wrap:anywhere` wraps at spaces first and only
  // enters a token that cannot fit a line by itself.
  //
  // MUTATION: put `word-break:break-all` back — 1097 and 390 both report
  // split hex tokens.
  test.setTimeout(60_000)
  const failures = []
  for (const width of [390, 1097]) {
    const { ctx, page } = await at(browser, width)
    watch(page, `a developer reading the gradient's CSS at ${width}px`)
    await go(page, '/create/gradient')
    const code = page.locator('.ggn-css code')
    await expect(code).toContainText('linear-gradient')
    await code.scrollIntoViewIfNeeded()
    await settle(page)
    const split = await page.evaluate(splitWords, '.ggn-css code')
    const lines = await code.evaluate((el) => Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight)))
    await ctx.close()
    expect(lines, 'the declaration really does wrap at this width — otherwise nothing is tested').toBeGreaterThan(1)
    const hex = split.filter((w) => /#[0-9A-Fa-f]{3,8}/.test(w))
    if (hex.length) failures.push(`${width}px: ${hex.join(', ')}`)
  }
  expect(failures, `hex values broken across lines:\n  ${failures.join('\n  ')}`).toEqual([])
})

test('/create/gradient · a saved project’s meta line is not truncated at 1280 and 1440', async ({ browser }) => {
  // The import cards were 220px columns: 64px of stripes and 12px gap left the
  // text 118px, and "Saved project · 3 colours" is 123px at 11px, so EVERY
  // saved project's meta ended in "…" at 1280, 1440 and 1920 — a long name is
  // meant to truncate; the line under it is not.
  //
  // MUTATION: restore `minmax(220px,1fr)` on .ggn-imports — both widths
  // report the meta 5px wider than its box.
  test.setTimeout(60_000)
  const failures = []
  for (const width of [1280, 1440]) {
    const { ctx, page } = await at(browser, width)
    watch(page, `a designer starting a gradient from a saved palette at ${width}px`)
    await signIn(page, { plan: 'free', projects: [projectRecord('p-long', LONG_NAME), projectRecord('p2', 'Short')] })
    await go(page, '/create/gradient')
    const card = page.locator('.ggn-import').first()
    await card.scrollIntoViewIfNeeded()
    await expect(card.locator('.ggn-import-meta')).toContainText('colours')
    await settle(page)
    const m = await page.evaluate(() => [...document.querySelectorAll('.ggn-import-meta')].map((el) => ({ text: el.textContent, over: el.scrollWidth - el.clientWidth })))
    await ctx.close()
    expect(m.length, 'both seeded projects are offered').toBe(2)
    for (const x of m) if (x.over > 0) failures.push(`${width}px: "${x.text}" is ${x.over}px wider than its box`)
  }
  expect(failures, `meta lines truncated:\n  ${failures.join('\n  ')}`).toEqual([])
})

// ─────────────────────────────────────────────────────────────────────────────
// Targets under the 24px floor
// ─────────────────────────────────────────────────────────────────────────────

test('the colour picker’s hue slider is a 24px target on /create/contrast and /create/tint', async ({ browser }) => {
  // `.cpk-instrument .cpk-hue` was 22px tall on all four tools that mount the
  // picker. It is the one control in the picker a phone user drags.
  //
  // MUTATION: `height:22px` back on the three .cpk-hue rules — both routes
  // report 22.
  test.setTimeout(60_000)
  const failures = []
  for (const route of ['/create/contrast', '/create/tint']) {
    const { ctx, page } = await at(browser, 390)
    watch(page, 'someone dragging the hue slider with a thumb')
    await go(page, route)
    await page.locator('.cpk-trigger').first().click()
    const hue = page.locator('.cpk-hue')
    await expect(hue).toBeVisible()
    await expect(hue).toHaveAttribute('type', 'range')
    await settled(page, '.cpk-pop')
    const h = await hue.evaluate((el) => +el.getBoundingClientRect().height.toFixed(1))
    await ctx.close()
    if (h < 24) failures.push(`${route}: ${h}px`)
  }
  expect(failures, `hue sliders under 24px:\n  ${failures.join('\n  ')}`).toEqual([])
})

test('/create/palette · “Use →” on a community card in the Explore popup is a 24px target', async ({ browser }) => {
  // The popup's cards are 110px tall, so the five stripes are ~20px each; they
  // all do what "Use →" does, which makes the labelled control the one that
  // has to clear the floor — and it measured 285x20 in the sweep.
  //
  // MUTATION: drop `.plb-galpopup-body .pgal-use{min-height:24px…}` — every
  // card fails at ~20px.
  const { ctx, page } = await at(browser, 1440)
  watch(page, 'a designer borrowing a community palette')
  await go(page, '/create/palette')
  await page.locator('button[aria-label="Explore"]').click()
  const use = page.locator('.plb-galpopup-body .pgal-use')
  await expect(use.first()).toBeVisible()
  await settled(page, '.plb-galpopup')
  const boxes = await use.evaluateAll((els) => els.map((el) => +el.getBoundingClientRect().height.toFixed(1)))
  await ctx.close()
  expect(boxes.length, 'the community tab rendered cards').toBeGreaterThan(3)
  const short = boxes.filter((h) => h < 24)
  expect(short, `${short.length} of ${boxes.length} "Use" controls under 24px: ${short.slice(0, 5).join(', ')}`).toEqual([])
})

test('/create/tint · the endpoints checkbox row is a 24px target', async ({ browser }) => {
  // The <label> wraps the input, so the label is the press target; at 12px
  // text and 1.45 line-height it was 17px tall.
  //
  // MUTATION: drop `min-height:24px` from .tt-check in tint.css.
  const { ctx, page } = await at(browser, 390)
  watch(page, 'someone adding the white and black endpoints on a phone')
  await go(page, '/create/tint')
  const row = page.locator('label.tt-check')
  await row.scrollIntoViewIfNeeded()
  await expect(row).toContainText(/endpoints/)
  const h = await row.evaluate((el) => +el.getBoundingClientRect().height.toFixed(1))
  await ctx.close()
  expect(h, `the checkbox row is ${h}px tall`).toBeGreaterThanOrEqual(24)
})

// ─────────────────────────────────────────────────────────────────────────────
// State colours that failed contrast
// ─────────────────────────────────────────────────────────────────────────────

for (const theme of ['light', 'dark']) {
  test(`/create/palette · the FREE badge and the Remove item read at 4.5:1 in ${theme}`, async ({ browser }) => {
    // The colour-system menu's FREE badge: 9px bold #16A34A on its own green
    // tint measured 2.69:1 in light and 4.07:1 in dark. The swatch context
    // menu's Remove: #D64545 measured 4.38:1 in light and 3.97:1 in dark.
    //
    // MUTATION: `color:#16A34A` back on .plb-free (and delete the dark
    // override) — both themes fail on the badge; `color:#D64545` back on
    // .plb-ctx-item--danger — both fail on Remove.
    const { ctx, page } = await at(browser, 1440, theme)
    watch(page, `a designer reading the palette menus on a ${theme} screen`)
    await go(page, '/create/palette')
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme)

    await page.locator('button[aria-haspopup="menu"]:has(.plb-harm-k)').first().click()
    await expect(page.locator('.plb-free').first()).toBeVisible()
    await settled(page, '.plb-harmmenu')
    const badge = await page.evaluate(contrastOf, '.plb-free')
    await page.keyboard.press('Escape')

    await page.locator('.plb-col').first().click({ button: 'right' })
    await expect(page.locator('.plb-ctx-item--danger')).toBeVisible()
    await settled(page, '.plb-ctx')
    const remove = await page.evaluate(contrastOf, '.plb-ctx-item--danger')
    await ctx.close()

    expect(badge.text).toMatch(/free/i)
    expect(badge.ratio, `FREE badge: rgb(${badge.ink}) on rgb(${badge.bg})`).toBeGreaterThanOrEqual(4.5)
    expect(remove.text).toMatch(/remove/i)
    expect(remove.ratio, `Remove: rgb(${remove.ink}) on rgb(${remove.bg})`).toBeGreaterThanOrEqual(4.5)
  })

  test(`the primary Copy button keeps 4.5:1 while hovered, on all three typography and tint tools, in ${theme}`, async ({ browser }) => {
    // `:hover{background:var(--brand-soft)}` put 11px white on #4D90FF at
    // 3.11:1 — the moment the button is being pressed. Hover now darkens.
    //
    // MUTATION: restore the --brand-soft hover on any of the three rules —
    // that tool fails in light at 3.11.
    test.setTimeout(90_000)
    const failures = []
    for (const [route, sel, tab] of [
      ['/create/type-scale', '.tsc-copy-primary', 'Developer handoff'],
      ['/create/tint', '.tt-copy-primary', 'Developer handoff'],
      ['/create/font-pair', '.fpr-copy-primary', null],
    ]) {
      const { ctx, page } = await at(browser, 1440, theme)
      watch(page, `a developer about to copy the CSS on a ${theme} screen`)
      await go(page, route)
      if (tab) await page.getByRole('tab', { name: tab }).click()
      const btn = page.locator(sel)
      await btn.scrollIntoViewIfNeeded()
      await expect(btn).toBeVisible()
      await hoverSettled(page, btn, sel)
      const m = await page.evaluate(contrastOf, sel)
      await ctx.close()
      if (m.ratio < 4.5) failures.push(`${route}: ${m.ratio}:1 (rgb(${m.ink}) on rgb(${m.bg}))`)
    }
    expect(failures, `hovered Copy buttons under 4.5:1:\n  ${failures.join('\n  ')}`).toEqual([])
  })
}

test('/create/gradient · the inspector’s Copy link does not fade to 3.6:1 on hover', async ({ browser }) => {
  // `.ggn-copy:hover{opacity:.75}` took the 11.5px link from 5.8:1 to 3.64:1
  // (light) and 3.71:1 (dark) exactly when it is being read. Hover is an
  // underline now.
  //
  // MUTATION: restore `opacity:.75` on the hover — fails at 3.64.
  const { ctx, page } = await at(browser, 1440)
  watch(page, 'a developer copying the gradient CSS')
  await go(page, '/create/gradient')
  const copy = page.locator('.ggn-copy').first()
  await copy.scrollIntoViewIfNeeded()
  await hoverSettled(page, copy, '.ggn-copy')
  const m = await page.evaluate(contrastOf, '.ggn-copy')
  await ctx.close()
  expect(m.text).toMatch(/copy/i)
  expect(m.ratio, `hovered Copy: rgb(${m.ink}) on rgb(${m.bg})`).toBeGreaterThanOrEqual(4.5)
})
