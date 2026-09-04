// The state colours, measured as RENDERED text, in both themes.
//
// WHY THIS SPEC EXISTS, AND WHY IT DOES NOT TRUST THE SOURCE.
// --ok / --warn / --err are each declared twice for the light theme, and the
// second declaration wins. The backlog item that led to this sweep was written
// against the FIRST one, so it reported --ok at 2.84:1 when the page was
// painting 4.32:1. Grepping a token name out of global.css tells you what some
// declaration says, not what any pixel is.
//
// The unit half (tests/unit/state-token-contrast.test.js) does the arithmetic on
// the resolved values. This half reads getComputedStyle off real text nodes,
// composites translucent ancestors to find the true ground, and computes the
// WCAG ratio — so a token that is correct in the sheet but never reaches the
// element still fails here.
//
// ONE MECHANICAL POINT THAT MATTERS MORE THAN IT LOOKS.
// color-mix() computes to `color(srgb r g b / a)` in Chromium, NOT to rgba().
// A parser that only matches rgba() returns null for it, the tint is silently
// dropped from the ground stack, and every badge then appears to sit on the
// bare card — which is a LIGHTER ground than the tint and therefore a kinder
// number. Nearly every state badge in this app paints text on a tint of its own
// colour, so that one regex decides whether this spec measures the real thing.
// With the tint restored, .smap-stage measured 4.39:1 where the rgba-only
// parser had reported 5.02:1 and passed it.
import { test, expect } from './base.js'
import { go } from './helpers.js'

const HELPERS = `
  const srgb = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4) }
  const lum = ([r, g, b]) => 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b)
  const ratio = (a, b) => {
    const hi = Math.max(lum(a), lum(b)), lo = Math.min(lum(a), lum(b))
    return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100
  }
  // Handles BOTH computed forms. See the header note.
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

  // Resolve the state tokens THIS PAGE actually paints, then match ink by value.
  // Matching by value rather than by class list is what lets an aliased or
  // inherited colour be caught — the failure #331 hit with --ggn-accent.
  const STATE = ['ok', 'warn', 'err', 'pending', 'ok-strong', 'warn-strong', 'err-strong']
  const tokens = {}
  {
    const rs = getComputedStyle(document.documentElement)
    for (const t of STATE) {
      const v = rs.getPropertyValue('--' + t).trim()
      if (!v) continue
      const probe = document.createElement('span')
      probe.style.color = v
      document.body.appendChild(probe)
      const p = parse(getComputedStyle(probe).color)
      probe.remove()
      if (p) tokens[t] = p.rgb
    }
  }
  const near = (a, b) => a && b && Math.abs(a[0]-b[0]) < 2 && Math.abs(a[1]-b[1]) < 2 && Math.abs(a[2]-b[2]) < 2
  const nameOf = c => { for (const [k, v] of Object.entries(tokens)) if (near(c, v)) return k; return null }

  const walk = () => {
    const out = []
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    for (let node; (node = w.nextNode());) {
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
      const ink = fg.a < 1 ? over(fg, ground) : fg.rgb
      const size = parseFloat(cs.fontSize), weight = parseInt(cs.fontWeight) || 400
      const floor = (size >= 24 || (size >= 18.66 && weight >= 700)) ? 3 : 4.5
      out.push({
        cls: String(el.className || '').slice(0, 60) || el.tagName.toLowerCase(),
        text: text.slice(0, 28), ink, ground, size, weight, floor,
        value: ratio(ink, ground), inkTok: nameOf(ink), groundTok: nameOf(ground.map(Math.round)),
      })
    }
    return out
  }
`

// State-token INK, and the mirror: any ink sitting ON a state-token fill.
const WALK = `(() => {
  ${HELPERS}
  const bad = [], seen = new Set()
  let measured = 0
  for (const n of walk()) {
    const isInk = n.inkTok !== null
    const isFill = n.groundTok !== null
    if (!isInk && !isFill) continue
    measured++
    if (n.value >= n.floor) continue
    const key = (isInk ? 'ink' : 'fill') + '|' + n.cls + '|' + hex(n.ink) + '|' + Math.round(n.size)
    if (seen.has(key)) continue
    seen.add(key)
    bad.push({ kind: isInk ? 'ink' : 'fill', cls: n.cls, text: n.text,
      fg: hex(n.ink), bg: hex(n.ground), size: n.size, weight: n.weight,
      floor: n.floor, ratio: n.value, token: n.inkTok || n.groundTok })
  }
  return { bad, measured }
})()`

// Routes that actually paint state colours signed out: the sitemap stage pills,
// the privacy PII table, the contrast checker's own verdict and check marks,
// and the semantic-colour ramps (the fill mirror).
const ROUTES = ['/sitemap', '/privacy', '/create/contrast', '/create/semantic-color',
  '/create/alt-text', '/discover', '/plans', '/']

// EVERY ROUTE WALKED HERE IS `lazy()`, SO `READY` MATCHES THE FALLBACK.
// `#root > *` is satisfied by `.page-loading` - the Suspense fallback App.jsx
// renders while the route chunk is still arriving - so pairing it with a flat
// wait was a guess about how long someone else's dynamic import takes, and the
// walk measured whatever had painted when the guess ran out.
//
// It held on an idle machine and lost under load. Re-run with Chromium's CPU
// throttle at 16x, /privacy and /sitemap each measured ZERO state-coloured
// nodes (/privacy alone is 37 of the 52 this walk finds in light), the light
// total fell from 52 to 13, and the anti-vacuity guard below fired exactly as
// designed: "no state-coloured text was found to measure in light". The app
// was fine - /privacy was still showing 421 characters of fallback instead of
// its 6537. The same failure reproduces on a clean main with no feature branch
// in it, so what is wrong is the wait, not the page.
//
// Waiting for the fallback to go is the doctrine helpers.js already applies to
// Lenis: wait for the thing itself to be over, never for a number of
// milliseconds you hope covers it. The trailing settle is for paint, not for
// hydration, which is why it can stay short.
//
// DELIBERATELY NOT a wait for state-coloured text to appear. That would make
// the guard below unfalsifiable - it would spin until it found the very thing
// it exists to prove is there, and a genuinely empty sample would time out
// instead of failing with a count.
// go() now owns readiness for every navigation in this file: it holds #root-mounted
// AND no-.page-loading for three animation frames, which is strictly stronger than
// the READY-plus-detach pair this used to do for itself (READY was `main, .landing,
// #root > *`, and all three of those match the fallback). What is left here is the
// trailing PAINT settle, which was always a separate concern from hydration.
const settle = (page) => page.waitForTimeout(150)

const report = (route, theme, vp, bad) => bad.map((b) =>
  `  ${route} [${theme}@${vp}] .${b.cls} (${b.token}, ${b.kind})\n`
  + `      ${b.ratio}:1 (needs ${b.floor}) ${b.fg} on ${b.bg} at ${b.size}px/${b.weight}`
  + ` — ${JSON.stringify(b.text)}`).join('\n')

test.describe('state-colour text clears its AA floor', () => {
  for (const theme of ['light', 'dark']) {
    test(`${theme} theme: no state-coloured text under its floor`, async ({ browser }) => {
      const ctx = await browser.newContext({
        viewport: { width: 1280, height: 900 }, colorScheme: theme,
      })
      // Seeding vs-t before navigation is what actually puts React in this
      // theme. Stamping data-theme afterwards does not re-render it, and a
      // sibling test in this suite once asserted nothing for exactly that
      // reason — so the theme is established here and never by setAttribute.
      await ctx.addInitScript((t) => {
        try { localStorage.setItem('vs-t', t) } catch { /* private mode */ }
      }, theme)
      const page = await ctx.newPage()
      const failures = []
      let measured = 0
      for (const route of ROUTES) {
        await go(page, route)
        await settle(page)
        const res = await page.evaluate(WALK)
        measured += res.measured
        if (res.bad.length) failures.push(report(route, theme, 1280, res.bad))
      }
      await ctx.close()
      // Positive control. "No failures" and "measured nothing" are the same
      // result otherwise, and this walk matches ink by VALUE — one wrong token
      // name would silently reduce it to the second case.
      expect(measured, `no state-coloured text was found to measure in ${theme}`).toBeGreaterThan(20)
      expect(failures.join('\n'), `state text under AA in ${theme}`).toBe('')
    })
  }

  test('the floors still hold at 390px, where the type scale bottoms out', async ({ browser }) => {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, colorScheme: 'light',
    })
    await ctx.addInitScript(() => { try { localStorage.setItem('vs-t', 'light') } catch { /* */ } })
    const page = await ctx.newPage()
    const failures = []
    let measured = 0
    for (const route of ['/sitemap', '/privacy', '/create/contrast', '/create/semantic-color']) {
      await go(page, route)
      await settle(page)
      const res = await page.evaluate(WALK)
      measured += res.measured
      if (res.bad.length) failures.push(report(route, 'light', 390, res.bad))
    }
    await ctx.close()
    expect(measured, 'no state-coloured text was found to measure at 390px').toBeGreaterThan(10)
    expect(failures.join('\n'), 'state text under AA at 390px').toBe('')
  })

  // The tint is the ground for most of these badges, so prove the harness can
  // actually see one. If color-mix ever computes to a form `parse` misses, this
  // fails loudly instead of quietly making every badge look safe.
  test('a tinted state badge reports a tinted ground, not the bare card', async ({ page }) => {
    await go(page, '/sitemap')
    await settle(page)
    const seen = await page.evaluate(`(() => {
      ${HELPERS}
      const el = document.querySelector('.smap-stage')
      if (!el) return null
      const own = getComputedStyle(el).backgroundColor
      return { own, parsed: parse(own), ground: hex(groundOf(el)) }
    })()`)
    expect(seen, '.smap-stage is not on this page any more').not.toBeNull()
    expect(seen.parsed, `computed background ${seen.own} did not parse`).not.toBeNull()
    expect(seen.parsed.a, 'the badge tint should be translucent').toBeLessThan(1)
    expect(seen.ground.toLowerCase(), 'the ground should be the tint, not #ffffff')
      .not.toBe('#ffffff')
  })
})
