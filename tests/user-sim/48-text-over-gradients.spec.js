// Text painted over a GRADIENT, measured instead of skipped.
//
// WHY THIS FILE EXISTS.
// "Text over gradients and images" has been carried on the unrun list of
// [audit-coverage-not-run] since 2026-08-11 as never checked. It was not merely
// unchecked: it was actively excluded by the two specs that look like they
// would cover it. Both 39-accent-contrast.spec.js and
// 43-state-token-contrast.spec.js resolve a text node's ground by walking its
// ancestors, and both carry this line:
//
//     if (cs.backgroundImage && cs.backgroundImage !== 'none') return null
//
// — a node over a gradient returns no ground, is dropped before it is measured,
// and contributes nothing to either spec's totals or failures. So a heading at
// 1.05:1 on a gradient hero would leave both of them green, and their reported
// counts would not move. That is the same shape as the rgba-only parser that
// silently dropped every color-mix() value: not a wrong answer, an answer that
// was never attempted, with nothing to show it had not been.
//
// MEASURED SCOPE, so the size of the hole is on the record: sweeping 24 routes
// signed out found 21 visible text nodes sitting over a background-image, and
// EVERY ONE of them is a linear-gradient - there is no url() image behind text
// anywhere in the app. That is why this can be done by arithmetic on the
// gradient rather than by sampling rendered pixels.
//
// HOW THE WORST CASE IS FOUND, AND WHY IT IS THE HONEST ONE.
// A gradient is not one ground, it is a continuum, so "the contrast" of text on
// it is the WORST contrast anywhere the text actually sits. This:
//
//   1. reconstructs the gradient line for the painting box (CSS angle
//      convention: 0deg points up, clockwise; line length |W sinθ| + |H cosθ|);
//   2. projects the TEXT's own rectangle onto that line, so only the slice of
//      the gradient genuinely behind the text is considered - taking the worst
//      stop of the whole gradient would fail a caption that sits entirely in
//      the pale end of a hero;
//   3. samples that slice densely, composites each sample through the rest of
//      the ancestor stack, and keeps the lowest ratio.
//
// Sampling rather than solving is a deliberate simplification with a known
// bound: sRGB luminance is monotonic between two stops (each channel is linear
// in t and the sRGB transfer curve is monotonic), so the true minimum over a
// segment is at a sample or between two adjacent ones, and 64 samples plus
// every stop boundary puts it within far less than the 0.01 this rounds to.
import zlib from 'node:zlib'
import { test, expect } from './base.js'
import { go } from './helpers.js'

const SAMPLES = 64

const HELPERS = `
  const srgb = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4) }
  const lum = ([r, g, b]) => 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b)
  const ratio = (a, b) => {
    const hi = Math.max(lum(a), lum(b)), lo = Math.min(lum(a), lum(b))
    return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100
  }
  const hex = rgb => '#' + rgb.map(v => Math.round(v).toString(16).padStart(2, '0')).join('')

  // Both computed colour forms. color-mix() computes to color(srgb ...) in
  // Chromium, and an rgba-only parser silently drops it - the exact defect
  // 39-accent-contrast shipped with. Gradient stops carry the same forms.
  const parse = s => {
    s = (s || '').trim()
    if (s === 'transparent') return { rgb: [0, 0, 0], a: 0, legacy: true }
    const cm = s.match(/color\\(srgb\\s+([^)]+)\\)/)
    if (cm) {
      const p = cm[1].split(/[\\s\\/]+/).filter(Boolean).map(Number)
      // legacy:false is load-bearing, not bookkeeping - see MIX_SPACE below.
      return { rgb: [p[0] * 255, p[1] * 255, p[2] * 255], a: p.length > 3 ? p[3] : 1, legacy: false }
    }
    const m = s.match(/rgba?\\(([^)]+)\\)/)
    if (!m) return null
    const p = m[1].split(/[,\\s\\/]+/).filter(Boolean).map(Number)
    return { rgb: [p[0], p[1], p[2]], a: p.length > 3 ? p[3] : 1, legacy: true }
  }

  /* ── WHICH SPACE A GRADIENT IS INTERPOLATED IN ────────────────────────────
   *
   * CSS Color 4 §12: a gradient between LEGACY colours (rgb/rgba/hex/named)
   * interpolates in sRGB; if ANY stop is written in modern syntax the default
   * interpolation space is oklab instead. That is not a detail here - it is
   * the difference between a right answer and a wrong one:
   *
   *   .seo-social-img is linear-gradient(135deg, var(--accent),
   *   color-mix(in srgb, var(--accent) 40%, #8B5CF6)), and the color-mix()
   *   stop computes to color(srgb ...). Measured against the rendered pixel at
   *   three points on that box, sRGB interpolation is out by 13, 12 and 1 on
   *   the red channel, and oklab matches all three within 1.
   *
   * The first version of this file assumed sRGB everywhere and got a ground of
   * #2d6afd where the browser paints #406afc. The pixel check at the bottom is
   * the only reason that was ever noticed - nothing else in the spec could see
   * it, because a wrong ground still produces a plausible ratio.
   */
  const LIN = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4) }
  const GAM = c => 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055)
  const toOklab = ([R, G, B]) => {
    const r = LIN(R), g = LIN(G), b = LIN(B)
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
    return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
      1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
      0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s]
  }
  const fromOklab = ([L, A, B]) => {
    const l = Math.pow(L + 0.3963377774 * A + 0.2158037573 * B, 3)
    const m = Math.pow(L - 0.1055613458 * A - 0.0638541728 * B, 3)
    const s = Math.pow(L - 0.0894841775 * A - 1.2914855480 * B, 3)
    return [GAM(+4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
      GAM(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
      GAM(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s)]
      .map(v => Math.max(0, Math.min(255, v)))
  }

  /**
   * One step between two stops, PREMULTIPLIED (CSS Color 4 §12.3) and in the
   * gradient's own interpolation space. Straight-alpha interpolation towards
   * "transparent" fades a colour through black and invents a grey that is
   * never painted: /discover/palettes' section head fades #efeee9 to
   * rgba(0,0,0,0), and a straight-alpha model put its midpoint at #b9b8b4 and
   * reported two AA failures the browser does not paint.
   */
  const mixStop = (a, b, k, space) => {
    const alpha = a.a + (b.a - a.a) * k
    if (space === 'oklab') {
      const oa = toOklab(a.rgb).map(v => v * a.a)
      const ob = toOklab(b.rgb).map(v => v * b.a)
      const mixed = oa.map((v, i) => v + (ob[i] - v) * k)
      return { rgb: alpha > 0 ? fromOklab(mixed.map(v => v / alpha)) : [0, 0, 0], a: alpha }
    }
    const pre = a.rgb.map((v, i) => v * a.a + (b.rgb[i] * b.a - v * a.a) * k)
    return { rgb: alpha > 0 ? pre.map(v => v / alpha) : [0, 0, 0], a: alpha }
  }
  const over = (fg, bg) => fg.rgb.map((c, i) => c * fg.a + bg[i] * (1 - fg.a))

  /** Split on commas that are not inside parentheses. */
  const splitTop = s => {
    const out = []; let depth = 0, cur = ''
    for (const ch of s) {
      if (ch === '(') depth++
      else if (ch === ')') depth--
      if (ch === ',' && depth === 0) { out.push(cur); cur = '' } else cur += ch
    }
    if (cur.trim()) out.push(cur)
    return out.map(x => x.trim())
  }

  const KEYWORD_ANGLE = {
    'to top': 0, 'to right': 90, 'to bottom': 180, 'to left': 270,
    'to top right': 45, 'to right top': 45, 'to bottom right': 135, 'to right bottom': 135,
    'to bottom left': 225, 'to left bottom': 225, 'to top left': 315, 'to left top': 315,
  }

  /**
   * Parse ONE linear-gradient() layer. Returns null for anything else
   * (radial, conic, repeating, url) so the caller can refuse to guess.
   */
  const parseLinear = (img, w, h) => {
    const m = img.match(/^linear-gradient\\((.*)\\)$/s)
    if (!m) return null
    const parts = splitTop(m[1])
    let angle = 180
    if (parts.length && !/^(rgb|rgba|color|#|transparent)/i.test(parts[0])) {
      const head = parts.shift().trim().toLowerCase()
      const deg = head.match(/^(-?[\\d.]+)deg$/)
      if (deg) angle = parseFloat(deg[1])
      else if (KEYWORD_ANGLE[head] != null) angle = KEYWORD_ANGLE[head]
      else return null           // turn/rad/grad, interpolation hints - refuse
    }
    const stops = []
    for (const p of parts) {
      // "<colour> <pos>?" - the colour may itself contain spaces and commas.
      const pos = p.match(/\\s(-?[\\d.]+)%\\s*$/)
      const colourText = pos ? p.slice(0, p.length - pos[0].length) : p
      const c = parse(colourText)
      if (!c) return null
      stops.push({ c, pos: pos ? parseFloat(pos[1]) / 100 : null })
    }
    if (stops.length < 2) return null
    // CSS default positions: first 0, last 1, unspecified spread evenly.
    if (stops[0].pos == null) stops[0].pos = 0
    if (stops[stops.length - 1].pos == null) stops[stops.length - 1].pos = 1
    for (let i = 1; i < stops.length - 1; i++) {
      if (stops[i].pos != null) continue
      let j = i; while (stops[j].pos == null) j++
      const span = (stops[j].pos - stops[i - 1].pos) / (j - i + 1)
      for (let k = i; k < j; k++) stops[k].pos = stops[i - 1].pos + span * (k - i + 1)
    }
    for (let i = 1; i < stops.length; i++) stops[i].pos = Math.max(stops[i].pos, stops[i - 1].pos)

    // CSS gradient line: 0deg points UP and angles run clockwise.
    const rad = angle * Math.PI / 180
    const dx = Math.sin(rad), dy = -Math.cos(rad)
    const len = Math.abs(w * Math.sin(rad)) + Math.abs(h * Math.cos(rad))
    const space = stops.every(s => s.c.legacy) ? 'srgb' : 'oklab'
    return { stops, dx, dy, len: len || 1, space }
  }

  const colourAt = (g, t) => {
    const s = g.stops
    if (t <= s[0].pos) return s[0].c
    if (t >= s[s.length - 1].pos) return s[s.length - 1].c
    for (let i = 1; i < s.length; i++) {
      if (t > s[i].pos) continue
      const a = s[i - 1], b = s[i]
      const span = b.pos - a.pos
      const k = span <= 0 ? 0 : (t - a.pos) / span
      return mixStop(a.c, b.c, k, g.space)
    }
    return s[s.length - 1].c
  }

  /** Where the text rect sits along the gradient line, as [t0, t1] in 0..1. */
  const tRange = (g, box, rect) => {
    const cx = box.left + box.width / 2, cy = box.top + box.height / 2
    let lo = Infinity, hi = -Infinity
    for (const [x, y] of [[rect.left, rect.top], [rect.right, rect.top],
      [rect.left, rect.bottom], [rect.right, rect.bottom]]) {
      const t = ((x - cx) * g.dx + (y - cy) * g.dy) / g.len + 0.5
      lo = Math.min(lo, t); hi = Math.max(hi, t)
    }
    return [Math.max(0, Math.min(1, lo)), Math.max(0, Math.min(1, hi))]
  }

  /**
   * The ancestor stack as LAYERS, outermost last. A solid layer offers one
   * candidate colour; a gradient layer offers the samples of itself that are
   * actually behind this text.
   *
   * Returns null (refuse to guess) for a url() image, or any gradient shape
   * this cannot reconstruct - and the caller counts those separately rather
   * than dropping them silently, which is the whole complaint against the
   * specs this one supplements.
   */
  const layersOf = (el, rect, samples) => {
    const layers = []
    let gradients = 0
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      const cs = getComputedStyle(n)
      // A gradient clipped to the text is INK, not ground. It is also why
      // -webkit-text-fill-color:transparent headings need their own check;
      // they are out of scope here and counted as refusals.
      const clip = cs.webkitBackgroundClip || cs.backgroundClip
      const img = cs.backgroundImage
      if (img && img !== 'none') {
        if (clip === 'text') return { refused: 'background-clip:text' }
        const box = n.getBoundingClientRect()
        const first = splitTop(img)[0]
        const g = parseLinear(first, box.width, box.height)
        if (!g) return { refused: first.split('(')[0] || 'unparsed' }
        gradients++
        const [t0, t1] = tRange(g, box, rect)
        const cands = []
        for (let i = 0; i <= samples; i++) cands.push(colourAt(g, t0 + (t1 - t0) * i / samples))
        for (const s of g.stops) if (s.pos >= t0 && s.pos <= t1) cands.push(s.c)
        layers.push(cands)
      }
      const c = parse(cs.backgroundColor)
      if (c && c.a > 0) layers.push([c])
    }
    const root = parse(getComputedStyle(document.documentElement).backgroundColor)
    layers.push([root && root.a >= 1 ? root : { rgb: [255, 255, 255], a: 1 }])
    return { layers, gradients }
  }

  /**
   * The composited ground at ONE viewport point, with no worst-case search.
   * This is what the pixel check below compares against a real screenshot: the
   * model is only worth anything if the colour it computes for a point is the
   * colour Chromium paints there.
   */
  const groundAtPoint = (el, x, y) => {
    const stack = []
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      const cs = getComputedStyle(n)
      const img = cs.backgroundImage
      if (img && img !== 'none') {
        const box = n.getBoundingClientRect()
        const g = parseLinear(splitTop(img)[0], box.width, box.height)
        if (!g) return null
        const cx = box.left + box.width / 2, cy = box.top + box.height / 2
        const t = ((x - cx) * g.dx + (y - cy) * g.dy) / g.len + 0.5
        stack.push(colourAt(g, Math.max(0, Math.min(1, t))))
      }
      const c = parse(cs.backgroundColor)
      if (c && c.a > 0) stack.push(c)
    }
    const root = parse(getComputedStyle(document.documentElement).backgroundColor)
    let base = root && root.a >= 1 ? root.rgb : [255, 255, 255]
    for (let i = stack.length - 1; i >= 0; i--) base = over(stack[i], base)
    return base
  }
`

const WALK = `(() => {
  ${HELPERS}
  const out = []
  const refusals = []
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  const seen = new Set()
  for (let node; (node = w.nextNode());) {
    const text = (node.nodeValue || '').trim()
    if (!text) continue
    const el = node.parentElement
    if (!el || seen.has(el)) continue
    const cs = getComputedStyle(el)
    if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) continue
    const rect = el.getBoundingClientRect()
    if (rect.width < 1 || rect.height < 1) continue
    // Only nodes that actually have a background-image somewhere above them -
    // the population the other two specs drop.
    let hasImage = false
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      const bi = getComputedStyle(n).backgroundImage
      if (bi && bi !== 'none') { hasImage = true; break }
    }
    if (!hasImage) continue
    seen.add(el)
    const fg = parse(cs.color)
    if (!fg || fg.a === 0) continue

    const res = layersOf(el, rect, ${SAMPLES})
    const cls = String(el.className || '').split(' ')[0] || el.tagName.toLowerCase()
    if (res.refused) { refusals.push({ cls, text: text.slice(0, 28), why: res.refused }); continue }

    // Every combination of layer candidates. Capped, and the cap is asserted
    // on rather than silently applied: two stacked gradients behind one piece
    // of text would need a bigger budget and a look at whether this is still
    // the right model.
    if (res.gradients > 2) { refusals.push({ cls, text: text.slice(0, 28), why: res.gradients + ' stacked gradients' }); continue }

    const size = parseFloat(cs.fontSize), weight = parseInt(cs.fontWeight) || 400
    const floor = (size >= 24 || (size >= 18.66 && weight >= 700)) ? 3 : 4.5
    let worst = null
    const idx = res.layers.map(() => 0)
    const total = res.layers.reduce((a, l) => a * l.length, 1)
    for (let combo = 0; combo < total; combo++) {
      let rest = combo
      for (let i = 0; i < idx.length; i++) { idx[i] = rest % res.layers[i].length; rest = Math.floor(rest / res.layers[i].length) }
      let ground = res.layers[idx.length - 1][idx[idx.length - 1]].rgb
      for (let i = idx.length - 2; i >= 0; i--) ground = over(res.layers[i][idx[i]], ground)
      const ink = fg.a < 1 ? over(fg, ground) : fg.rgb
      const v = ratio(ink, ground)
      if (!worst || v < worst.value) worst = { value: v, ground, ink }
    }
    out.push({
      cls, text: text.slice(0, 28), size, weight, floor,
      ratio: worst.value, fg: hex(worst.ink), bg: hex(worst.ground), gradients: res.gradients,
    })
  }
  return { out, refusals }
})()`

// Every route that paints text over a gradient signed out, plus the surfaces
// the sweep found nothing on - keeping those in the list is what makes a
// gradient newly introduced on them show up here rather than go unmeasured.
const ROUTES = ['/', '/community', '/discover', '/discover/palettes', '/discover/gradients',
  '/create/gradient', '/create/color', '/seo', '/plans', '/learn']

const VIEWPORTS = [{ width: 390, height: 844 }, { width: 1280, height: 900 }]

// The sweep measured 21 nodes over gradients at 1280 in light. This is a guard
// against the SAMPLE collapsing, not a target: if a change takes it under this,
// the right response is to find out what stopped being measured, not to lower
// the number. It is deliberately well under 21 so ordinary content edits do not
// trip it.
const MIN_MEASURED = 8

/* ── The two surfaces that fail today ────────────────────────────────────────
 *
 * These are PRE-EXISTING and were invisible until this file measured them:
 * both 39-accent-contrast and 43-state-token-contrast drop every node over a
 * background-image before scoring it, so neither has ever had an opinion here.
 *
 *   /community .ch-thumb-mono   FIXED 2026-09-05 by PER-ITEM INK, and this
 *       paragraph is kept because the measurement is the useful part. It was
 *       rgba(255,255,255,.92) at 30px/700 on linear-gradient(135deg, var(--c1),
 *       var(--c2)), where c1/c2 are curated per-item data - so NINE OF TWELVE
 *       monograms sat below the 3.0 large-text floor, worst 1.47:1 modelled
 *       over the whole gradient (s9, #059669 -> #6EE7B7) and 1.77:1 at the
 *       worst point actually behind a glyph.
 *       Four options were priced on [gradient-text-below-aa]; the founder
 *       picked per-item ink. CommunityCard.jsx now chooses the pole from each
 *       card's OWN gradient via inkOnGradient() and sets --mono-ink/--mono-glow,
 *       and the rule's colour went opaque. NOT ONE CURATED COLOUR CHANGED.
 *       Worst across all twelve: 3.69:1 (s11, #7C3AED -> #C4B5FD), against 3.0.
 *       The accepted cost is visible: ten of the twelve flipped white -> black,
 *       so the grid no longer has one ink.
 *       The ground here is DATA, so the guarantee is proved exhaustively in
 *       tests/unit/community-monogram-ink.test.js rather than only by the
 *       twelve rows this file happens to walk.
 *
 *   /seo .seo-social-img span   FIXED 2026-09-04, and this paragraph is kept
 *       because the route to the fix is the useful part. It measured 2.99:1
 *       against a floor of 4.5 - "1200 x 630" at 11px in rgba(255,255,255,.7)
 *       on linear-gradient(135deg, var(--accent), color-mix(...)). The note on
 *       [gradient-text-below-aa] was RIGHT that no alpha bump reaches it: pure
 *       white on --accent measures 4.46 here, still short. Every candidate,
 *       all on rendered pixels with the ink hidden: opaque ink alone 4.46,
 *       --accent-strong ground with the 70% ink 3.97, a 28% black scrim 4.48.
 *       AND THE OBVIOUS FIX WAS WRONG IN DARK. --accent-strong plus opaque
 *       white measures 6.36 light and 3.41 DARK, because --accent-strong is the
 *       darker member of the pair in light and the lighter one in dark. It now
 *       carries two literals from the LIGHT accent pair and does not follow the
 *       theme at all, which is what a mock of a 1200x630 share card should do -
 *       scripts/og-cards.mjs scopes its reads the same way for the same reason.
 *       5.45:1 in both themes, on the same ground #365EE2.
 *       (Reported as 3.03:1 on #2d6afd until the oklab fix below; the defect
 *       is the same one, the ground was being computed in the wrong space.)
 *
 * WHY THEY ARE LISTED RATHER THAN SKIPPED. An exact-match assertion fails in
 * BOTH directions: a new surface below its floor fails because it is not on the
 * list, and a fixed one fails because it still is. A `>=` on a count, or a
 * regex skip, would have done neither.
 */
// EMPTY, and that is the assertion. Both surfaces this file was written to
// expose are fixed and measured; an empty exact-match list means a new one
// fails the moment it appears, and a regression on either of these fails too.
const KNOWN_BELOW_FLOOR = []

const report = (route, theme, vp, bad) => bad.map((b) =>
  `  ${route} [${theme}@${vp}] .${b.cls}\n`
  + `      ${b.ratio}:1 (needs ${b.floor}) ${b.fg} on ${b.bg} at ${b.size}px/${b.weight}`
  + ` — worst point of the gradient behind ${JSON.stringify(b.text)}`).join('\n')

test.describe('text over a gradient is measured, not skipped', () => {
  for (const theme of ['light', 'dark']) {
    test(`${theme} theme: every gradient-backed text node is scored at the gradient's worst point`, async ({ browser }) => {
      test.setTimeout(180000)
      const detail = []
      const refused = []
      const below = new Set()
      let measured = 0
      for (const vp of VIEWPORTS) {
        const ctx = await browser.newContext({ viewport: vp, colorScheme: theme })
        // Seeding vs-t BEFORE navigation is what actually puts React in this
        // theme; stamping data-theme afterwards does not re-render it. Same
        // reasoning as 43-state-token-contrast, and the same trap.
        await ctx.addInitScript((t) => {
          try { localStorage.setItem('vs-t', t) } catch { /* private mode */ }
        }, theme)
        const page = await ctx.newPage()
        for (const route of ROUTES) {
          // `go()` waits for the route, not just for the document: every measurement
          // below is a page.evaluate, and the Suspense fallback contains no
          // gradients at all - measuring too early is a clean sweep of nothing.
          await go(page, route)
          const res = await page.evaluate(WALK)
          measured += res.out.length
          for (const r of res.refusals) refused.push(`  ${route} [${theme}@${vp.width}] .${r.cls} — ${r.why}`)
          const bad = res.out.filter((n) => n.ratio < n.floor)
          for (const b of bad) below.add(`${route} .${b.cls}`)
          if (bad.length) detail.push(report(route, theme, vp.width, bad))
        }
        await ctx.close()
      }

      // ANTI-VACUITY, and it comes first so a collapsed sample can never read
      // as a pass. This is the guard 39 and 43 cannot have: their ground
      // resolver returns null for exactly these nodes, so their own counts stay
      // right while this whole population goes unmeasured.
      expect(measured, 'no text over a gradient was found to measure in ' + theme
        + ' — the sweep found 21 such nodes across both viewports when this was'
        + ` written, so a count of ${measured} means the walk stopped reaching them,`
        + ' not that the app changed')
        .toBeGreaterThanOrEqual(MIN_MEASURED)

      // A refusal is a node this spec could not MODEL - a url() image, a radial
      // or conic gradient, a gradient clipped to the text. Failed rather than
      // skipped, because "silently measured nothing" is the defect this file
      // was written against.
      expect(refused, 'these nodes sit over a background this spec cannot reconstruct,'
        + ' so their contrast is UNKNOWN rather than passing. Extend the parser, or give'
        + ' them their own check:\n' + refused.join('\n'))
        .toEqual([])

      expect([...below].sort(), 'the set of gradient-backed text below its AA floor has'
        + ' changed. A surface here that is NOT in KNOWN_BELOW_FLOOR is a new defect; one'
        + ' in KNOWN_BELOW_FLOOR that is no longer here has been fixed, and the list must'
        + ` shrink to match. Measured this run:\n${detail.join('\n')}`)
        .toEqual(KNOWN_BELOW_FLOOR)
    })
  }
})

/* ── Is any of the arithmetic above true? ────────────────────────────────────
 *
 * Everything in this file is a MODEL of what Chromium paints: a gradient line
 * reconstructed from an angle, stops interpolated in premultiplied alpha,
 * layers composited by hand. A model that is wrong fails silently and in the
 * kind direction - the first draft of this file interpolated towards
 * `transparent` in straight alpha, invented a #b9b8b4 midpoint under
 * /discover/palettes' section head, and reported two AA failures the browser
 * does not paint. Nothing else in the spec could have caught that.
 *
 * So the model is checked against pixels. The ink is hidden, a 1x1 screenshot
 * is taken at the point the model was asked about, and the two are compared.
 * That is what makes the numbers above evidence rather than assertion.
 */

/** Minimal 8-bit PNG reader: enough for the 1x1 clips taken below. */
function decodePng(buf) {
  let p = 8, w = 0, h = 0, depth = 0, colorType = 0
  const idat = []
  while (p + 8 <= buf.length) {
    const len = buf.readUInt32BE(p)
    const type = buf.toString('ascii', p + 4, p + 8)
    const data = buf.subarray(p + 8, p + 8 + len)
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); depth = data[8]; colorType = data[9] }
    else if (type === 'IDAT') idat.push(data)
    else if (type === 'IEND') break
    p += 12 + len
  }
  const ch = { 0: 1, 2: 3, 4: 2, 6: 4 }[colorType]
  if (!ch || depth !== 8) throw new Error(`unsupported PNG: depth ${depth}, colour type ${colorType}`)
  const raw = zlib.inflateSync(Buffer.concat(idat))
  const stride = w * ch
  const rows = []
  let prev = Buffer.alloc(stride)
  for (let y = 0; y < h; y++) {
    const ft = raw[y * (stride + 1)]
    const line = raw.subarray(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride)
    const cur = Buffer.alloc(stride)
    for (let i = 0; i < stride; i++) {
      const a = i >= ch ? cur[i - ch] : 0
      const b = prev[i]
      const c = i >= ch ? prev[i - ch] : 0
      let v = line[i]
      if (ft === 1) v += a
      else if (ft === 2) v += b
      else if (ft === 3) v += (a + b) >> 1
      else if (ft === 4) {
        const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c)
        v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c)
      }
      cur[i] = v & 255
    }
    rows.push(cur); prev = cur
  }
  return { w, h, ch, rows }
}

/**
 * The pixel a full-viewport screenshot painted at viewport CSS coordinate
 * (x, y). Deliberately NOT `page.screenshot({ clip })`: clip is measured from
 * the top-left of the PAGE, not of the viewport, so on any scrolled route it
 * samples a point scrollY pixels away from the one the model was asked about.
 * That is how the first version of this check "found" a 12/255 disagreement on
 * /seo - the model was right and the sample was taken somewhere else. Both
 * candidate points reproduced a real gradient colour, which is exactly why the
 * discrepancy looked like a colour-space bug rather than a coordinate one.
 */
const at = (png, x, y) => {
  const i = y * png.w * png.ch + x * png.ch
  return [png.rows[y][x * png.ch], png.rows[y][x * png.ch + 1], png.rows[y][x * png.ch + 2], i]
}

test('the gradient model matches the pixels Chromium actually paints', async ({ page }) => {
  test.setTimeout(120000)
  await page.setViewportSize({ width: 1280, height: 900 })

  // Both live gradient surfaces, plus the one whose premultiplied fade broke
  // the first draft of the model - that one is here precisely because it is
  // where the arithmetic was wrong.
  const CASES = [
    { route: '/community', sel: '.ch-thumb-mono' },
    { route: '/seo', sel: '.seo-social-img span' },
    { route: '/discover/palettes', sel: '.pgl-section-blurb' },
  ]

  let checked = 0
  const wrong = []
  for (const { route, sel } of CASES) {
    await go(page, route)
    const count = await page.locator(sel).count()
    expect(count, `${sel} on ${route} must still exist, or this check proves nothing`).toBeGreaterThan(0)

    // Hide every ink at once, take ONE viewport screenshot, then read each
    // point out of it. The text-shadow has to go with the colour, or the
    // sample is of a blurred glyph rather than of the gradient.
    const points = await page.evaluate(({ selector, helpers, limit }) => {
      const out = []
      const els = [...document.querySelectorAll(selector)].slice(0, limit)
      for (const el of els) { el.dataset.uilInk = el.style.cssText; el.style.color = 'transparent'; el.style.textShadow = 'none' }
      // HELPERS is a run of `const` declarations, not an expression, so it has
      // to be a function BODY with the call appended - not something to evaluate.
      const groundAtPoint = new Function('el', 'x', 'y', helpers + '; return groundAtPoint(el, x, y)')
      for (const el of els) {
        const r = el.getBoundingClientRect()
        if (r.width < 2 || r.height < 2) continue
        if (r.top < 0 || r.bottom > window.innerHeight || r.left < 0 || r.right > window.innerWidth) continue
        const x = Math.round(r.left + r.width / 2), y = Math.round(r.top + r.height / 2)
        out.push({ x, y, ground: groundAtPoint(el, x, y) })
      }
      return out
    }, { selector: sel, helpers: HELPERS, limit: 4 })

    const png = decodePng(await page.screenshot())
    await page.evaluate((selector) => {
      for (const el of document.querySelectorAll(selector)) {
        el.style.cssText = el.dataset.uilInk || ''
        delete el.dataset.uilInk
      }
    }, sel)

    expect(png.w, 'the screenshot must be one device pixel per CSS pixel for this to line up').toBe(1280)
    for (const p of points) {
      expect(p.ground, `${route} ${sel} at (${p.x},${p.y}): the model produced no ground at all`).not.toBeNull()
      const painted = at(png, p.x, p.y).slice(0, 3)
      checked++
      // 3/255 covers Chromium's dithering of a gradient across a pixel and the
      // rounding on the way through the PNG. A model with the wrong
      // interpolation space, angle or layer order misses by far more - the
      // straight-alpha draft was out by 54 on the green channel.
      if (Math.max(...painted.map((v, k) => Math.abs(v - p.ground[k]))) > 3) {
        wrong.push(`  ${route} ${sel} at (${p.x},${p.y}):`
          + ` model rgb(${p.ground.map((v) => Math.round(v)).join(',')})`
          + ` vs painted rgb(${painted.join(',')})`)
      }
    }
  }

  expect(checked, 'no gradient surface was sampled, so this proves nothing').toBeGreaterThanOrEqual(6)
  expect(wrong, 'the gradient model disagrees with the rendered pixels, so every ratio'
    + ' this file reports is arithmetic about a colour the browser never paints:\n'
    + wrong.join('\n')).toEqual([])
})
