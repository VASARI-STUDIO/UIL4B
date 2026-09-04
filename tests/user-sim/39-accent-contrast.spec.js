// The brand blue, measured as rendered text, in both themes.
//
// WHY THIS SPEC EXISTS
// --accent is #0F6FFF in light. Measured on the three grounds it is actually
// painted on, it is 3.82:1 on the page (#EFEEE9), 4.43:1 on the card (#FFFFFF)
// and 4.06:1 on --bg-2. All three miss the 4.5:1 AA requires at the sizes V2
// uses it at — 9-14px mono eyebrows, step numbers, kickers, tags, active tab
// labels, inline links — and white ON --accent misses it the same way round on
// the filled buttons.
//
// The remedy is --accent-strong #0B5ED7 (5.03 / 5.84 / 5.35), which is the
// whole reason both tokens exist. #306 made the swap for one class, #323 for
// five surfaces; #330 swept the rest, and this is what says it stayed swept.
//
// THIS ASSERTS A COMPUTED RATIO, NOT A DECLARATION. Grepping global.css for
// `--accent-strong` would pass on a sheet where the rule never applies — which
// is exactly how the sibling defect in 38-input-specificity.spec.js survived
// for months. So the walk below reads getComputedStyle off real text nodes,
// composites translucent ancestors to find the true ground, and computes the
// WCAG ratio the same way the app's own contrast checker does.
//
// THE MEASURING INSTRUMENT WAS BLIND UNTIL 2026-09-04, and every number this
// spec reported before then is suspect. Its parser matched only rgba(), but
// color-mix() computes to `color(srgb r g b / a)` in Chromium. So EVERY
// color-mix() tinted ground returned null, was silently dropped from the
// ground stack, and the element appeared to sit on the nearest opaque
// ancestor — which is always a lighter, kinder ground than the tint that is
// really there. Ink-on-its-own-tint is the single commonest accent pattern in
// this app (pills, badges, notices, soft buttons), so the blind spot covered
// most of what the spec was pointed at. #331 reported "0 failures after the
// sweep"; that zero was produced by this parser, not by the page. Fixing the
// regex surfaced three real failures that had been there the whole time.
// If you ever add a colour form (lab(), oklch(), color(display-p3 ...)), add it
// to parse() IN THE SAME COMMIT — an unparsed ground does not fail loudly here,
// it just quietly stops being measured.
//
// It deliberately does NOT restrict itself to what the sweep touched. Any text
// that lands under its floor on an accent-family pairing fails this, wherever
// the colour came from. Four of the findings it pinned were exactly that:
// --hue-* had no dark set at all and shipped at 2.61:1 on --bg-3; the dark set
// added for it was DEAD until it moved below the Foundry :root; .ic-stat-sm
// inherited a 24px colour at 16px; and `var(--hue,var(--accent))` fell back to
// the unreadable token whenever no category was in scope.
import { test, expect } from './base.js'

// Shared page-side helpers. Both walks need the same two things: the true
// composited ground behind an element, and the WCAG ratio.
const HELPERS = `
  const srgb = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4) }
  const lum = ([r, g, b]) => 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b)
  const ratio = (a, b) => {
    const hi = Math.max(lum(a), lum(b)), lo = Math.min(lum(a), lum(b))
    return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100
  }
  // Handles BOTH computed forms, and that is not a detail — see the
  // THE MEASURING INSTRUMENT WAS BLIND note in this file's header.
  // color-mix() computes to color(srgb r g b / a) in Chromium, never rgba().
  const parse = s => {
    s = s || ''
    const cm = s.match(/color\\(srgb\\s+([^)]+)\\)/)
    if (cm) {
      const p = cm[1].split(/[\\s\\/]+/).filter(Boolean).map(Number)
      return { rgb: [p[0] * 255, p[1] * 255, p[2] * 255], a: p.length > 3 ? p[3] : 1 }
    }
    const m = s.match(/rgba?\\(([^)]+)\\)/)
    if (!m) return null
    const p = m[1].split(/[,\\s\\/]+/).filter(Boolean).map(Number)
    return { rgb: [p[0], p[1], p[2]], a: p.length > 3 ? p[3] : 1 }
  }
  const over = (fg, bg) => fg.rgb.map((c, i) => c * fg.a + bg[i] * (1 - fg.a))
  // Composite every translucent ancestor down to the root. A background-image
  // (a gradient hero, a photo) makes the ground unknowable, so those return
  // null and are skipped rather than guessed at.
  const groundOf = el => {
    const stack = []
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      const cs = getComputedStyle(n)
      if (cs.backgroundImage && cs.backgroundImage !== 'none') return null
      const c = parse(cs.backgroundColor)
      if (c && c.a > 0) stack.push(c)
    }
    const root = parse(getComputedStyle(document.documentElement).backgroundColor)
    let base = root && root.a >= 1 ? root.rgb : [255, 255, 255]
    for (let i = stack.length - 1; i >= 0; i--) base = over(stack[i], base)
    return base
  }
  const hex = rgb => '#' + rgb.map(v => Math.round(v).toString(16).padStart(2, '0')).join('')
  const isBlueInk = c => c[2] > c[0] + 40 && c[2] > 120
  const isAccentFill = c => c[2] > c[0] + 60 && c[2] > 120
  const isLightInk = c => c[0] > 200 && c[1] > 200 && c[2] > 200
  // Every visible text node, with its element, size, weight and true ground.
  const textNodes = () => {
    const out = []
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    for (let node; (node = walker.nextNode());) {
      const text = (node.nodeValue || '').trim()
      if (!text) continue
      const el = node.parentElement
      if (!el) continue
      const cs = getComputedStyle(el)
      if (cs.visibility === 'hidden' || cs.display === 'none' || cs.opacity === '0') continue
      const r = el.getBoundingClientRect()
      if (r.width < 1 || r.height < 1) continue
      const fg = parse(cs.color)
      if (!fg || fg.a === 0) continue
      const ground = groundOf(el)
      if (!ground) continue
      out.push({
        text, ground,
        ink: fg.a < 1 ? over(fg, ground) : fg.rgb,
        size: parseFloat(cs.fontSize),
        weight: parseInt(cs.fontWeight) || 400,
        cls: String(el.className).slice(0, 60) || el.tagName.toLowerCase(),
      })
    }
    return out
  }
`

// Accent-family INK on any ground. Greys, greens, reds and ambers have their
// own tokens and their own tests, so only blue/violet-leaning ink is in scope.
const INK_WALK = `(() => {
  ${HELPERS}
  const bad = [], seen = new Set()
  for (const n of textNodes()) {
    if (!isBlueInk(n.ink)) continue
    const large = n.size >= 24 || (n.size >= 18.66 && n.weight >= 700)
    const floor = large ? 3 : 4.5
    const value = ratio(n.ink, n.ground)
    if (value >= floor) continue
    const key = n.cls + '|' + hex(n.ink) + '|' + Math.round(n.size)
    if (seen.has(key)) continue
    seen.add(key)
    bad.push({ cls: n.cls, text: n.text.slice(0, 30), fg: hex(n.ink), bg: hex(n.ground),
               size: n.size, weight: n.weight, floor, ratio: value })
  }
  return bad
})()`

// The mirror: LIGHT ink on an accent-family GROUND. Found by measurement, not
// by class list — the first draft of this named .btn-accent and passed
// vacuously, because /plans swaps that button for a disabled one whenever
// Stripe is unreachable, which it always is in this suite. The fill also
// usually sits on an ANCESTOR of the text node (a Link wrapping a span), so
// this reads the composited ground rather than the element's own background.
const FILL_WALK = `(() => {
  ${HELPERS}
  const out = [], seen = new Set()
  for (const n of textNodes()) {
    if (!isLightInk(n.ink) || !isAccentFill(n.ground)) continue
    const key = n.cls + '|' + hex(n.ground)
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ cls: n.cls, text: n.text.slice(0, 24), bg: hex(n.ground),
               size: n.size, ratio: ratio(n.ink, n.ground) })
  }
  return out
})()`

// Wide enough to cover the token families, not every route: the tools (accent
// as step numbers and eyebrows), the galleries (tags and category hues), the
// marketing pages (filled buttons and inline links), and /sitemap, the only
// surface that paints all six category hues at once.
const ROUTES = [
  '/', '/plans', '/sitemap', '/info',
  '/create/gradient', '/create/type-scale', '/create/aspect-ratio',
  '/create/semantic-color', '/discover', '/discover/gradients', '/community',
]

const READY = 'main, .landing, #root > *'

const report = (route, tag, bad) => bad
  .map((b) => `  ${route} [${tag}] .${b.cls}\n      ${b.ratio}:1 (needs ${b.floor}) `
    + `${b.fg} on ${b.bg} at ${b.size}px/${b.weight} — ${JSON.stringify(b.text)}`)
  .join('\n')

test.describe('accent-family text clears its AA floor', () => {
  for (const theme of ['light', 'dark']) {
    test(`${theme} theme: no accent text under its floor on any sampled route`, async ({ browser }) => {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: theme })
      const page = await ctx.newPage()
      // vs-t alone is the theme now. This used to also set vs-t-lightreset=1 to
      // get past the one-time force-reset to light that ran on every fresh
      // profile; that migration is retired, and setting a dead key here would
      // imply it still means something.
      await page.addInitScript((t) => {
        try { localStorage.setItem('vs-t', t) } catch { /* private mode */ }
      }, theme)
      const failures = []
      for (const route of ROUTES) {
        await page.goto(route)
        await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme)
        await expect(page.locator(READY).first()).toBeVisible()
        await page.waitForTimeout(150)
        const bad = await page.evaluate(INK_WALK)
        if (bad.length) failures.push(report(route, theme, bad))
      }
      await ctx.close()
      expect(failures.join('\n'), `accent text under AA in ${theme}`).toBe('')
    })
  }

  // 390px is where the type scale bottoms out, so a size that clears the
  // large-text floor on desktop can drop under it on a phone and change which
  // floor applies. Checked separately rather than folded into the loop above.
  test('the floors still hold at 390px, where type is smallest', async ({ browser }) => {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, colorScheme: 'light',
    })
    const page = await ctx.newPage()
    const failures = []
    for (const route of ['/', '/plans', '/create/gradient', '/sitemap']) {
      await page.goto(route)
      await expect(page.locator(READY).first()).toBeVisible()
      await page.waitForTimeout(150)
      const bad = await page.evaluate(INK_WALK)
      if (bad.length) failures.push(report(route, '390', bad))
    }
    await ctx.close()
    expect(failures.join('\n'), 'accent text under AA at 390px').toBe('')
  })

  test('every filled accent control carries its label at 4.5:1 or better', async ({ page }) => {
    const seen = []
    const failures = []
    for (const route of ['/', '/plans', '/create/gradient', '/discover']) {
      await page.goto(route)
      await expect(page.locator(READY).first()).toBeVisible()
      await page.waitForTimeout(150)
      for (const f of await page.evaluate(FILL_WALK)) {
        seen.push(f)
        if (f.ratio < 4.5) {
          failures.push(`  ${route} .${f.cls} — ${f.ratio}:1 on ${f.bg} — ${JSON.stringify(f.text)}`)
        }
      }
    }
    // Guard against the vacuous pass this test already fell into once.
    expect(seen.length, 'no filled accent control was found to measure').toBeGreaterThan(0)
    expect(failures.join('\n'), 'light text on an accent fill under AA').toBe('')
  })
})
