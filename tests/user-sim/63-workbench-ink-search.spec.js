// The homepage workbench's ink, measured as RENDERED pixels, at both themes —
// and not only for "does it clear AA" [contrast-search-one-directional-callers].
//
// WHY A SECOND RENDERED SPEC WHEN 8c ALREADY SWEEPS THIS PANEL. 8c in
// 10-home-chaos-to-calm.spec.js asserts the AA FLOOR over a fixed selector list,
// and that floor is exactly what the defect being fixed here does NOT break.
// readableInk's one-directional walk returned its input, the candidate list fell
// through to the raw #000000 pole, and the pole cleared — so 8c passed on every
// one of the 570 generated colours where the shipped ink was up to 7 lightness
// units farther from the house ink than it needed to be. A test that only asks
// "is it legible" cannot see a search that has stopped searching.
//
// SO THIS FILE ASSERTS THE SEARCH, from the rendered page. For every element the
// component inks through readableInk, it reads the COMPOSITED ground and the
// COMPOSITED ink out of Chromium and then checks the property the fix is about:
// no grey nearer to the house pole also clears 4.5:1. With the call site
// reverted the ink is #000000 while #121212 passes, and that fails here.
//
// THE THEME HAS TO BE SET BEFORE THE APP BOOTS. The card's colours are INLINE
// STYLES React computes from derivePreviewRoles(hexes, { mode }), and `mode`
// comes from useTheme() — React state, which a setAttribute on documentElement
// does not touch. 8c records the same trap and the same fix: seed localStorage
// 'vs-t' and reload, then poll for the APP having set data-theme.
//
// color-mix() COMPUTES TO color(srgb …), NEVER rgba(). A parser that matches
// only rgba() returns null, the tint drops out of the ground stack, and the
// element appears to sit on the nearest OPAQUE ancestor — always a kinder
// ground than the real one. Both forms are parsed below. If you add a colour
// form, add it to parse() IN THE SAME COMMIT: an unparsed ground does not fail
// loudly, it stops being measured.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const PERSONA = 'visitor watching the homepage workbench generate palettes'
const NL = String.fromCharCode(10)

const HELPERS = `
  const chan = (c) => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) }
  const lum = (c) => 0.2126 * chan(c[0]) + 0.7152 * chan(c[1]) + 0.0722 * chan(c[2])
  const ratio = (a, b) => {
    const l1 = lum(a), l2 = lum(b)
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
  }
  const parse = (s) => {
    s = s || ''
    const cm = s.match(/color\\(srgb\\s+([^)]+)\\)/)
    if (cm) {
      const p = cm[1].split(/[\\s/]+/).filter(Boolean).map(Number)
      return { rgb: [p[0] * 255, p[1] * 255, p[2] * 255], a: p.length > 3 ? p[3] : 1 }
    }
    const m = s.match(/rgba?\\(([^)]+)\\)/)
    if (!m) return null
    const p = m[1].split(/[,\\s/]+/).filter(Boolean).map(Number)
    return { rgb: [p[0], p[1], p[2]], a: p.length > 3 ? p[3] : 1 }
  }
  const over = (fg, bg) => fg.rgb.map((c, i) => c * fg.a + bg[i] * (1 - fg.a))
  const groundOf = (el) => {
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
  // ELEMENT opacity is alpha too, and it is NOT the same thing as an alpha in
  // color(). .plb-name and .plb-role dim themselves with the opacity property,
  // which composites the TEXT over its ground while leaving the ground alone -
  // so it costs real contrast and a sweep that reads only cs.color's alpha scores
  // them as fully opaque and reports a number the screen never showed. Only the
  // opacity BETWEEN the element and the ancestor that paints the ground counts:
  // an opacity above that ancestor dims text and ground together and cancels.
  const groupAlpha = (el) => {
    let a = 1
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      const cs = getComputedStyle(n)
      const o = parseFloat(cs.opacity)
      if (!Number.isNaN(o)) a *= o
      const c = parse(cs.backgroundColor)
      if (c && c.a >= 1) break
    }
    return a
  }
  const hex = (c) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')
  // The grey ramp as hslToHex(0, 0, l) renders it, so the oracle below walks
  // the SAME 101 candidates the implementation can reach. Integer lightness is
  // the real resolution of the answer.
  const grey = (l) => { const v = Math.round(255 * (l / 100)); return [v, v, v] }
  const greyL = (c) => Math.round(((Math.max(c[0], c[1], c[2]) + Math.min(c[0], c[1], c[2])) / 2) / 255 * 100)
  const isGrey = (c) => Math.abs(c[0] - c[1]) <= 1 && Math.abs(c[1] - c[2]) <= 1
`

// Every element the component inks through readableInk, and nothing else. Each
// is opaque, so the composited ink is the declared ink and the "nearest grey"
// question is well posed.
//
// .plb-name AND .plb-role ARE STILL ABSENT, FOR A DIFFERENT REASON NOW.
// Until 2026-09-15 they were excluded because they dimmed themselves - .95 and
// .6 - so their composited ink was not the value readableInk returned and the
// nearest-grey oracle would have been asking a different question. Both
// opacities are gone, so that reason has expired.
//
// They stay out because adding them would measure nothing new. All three sit
// in the same .plb-col on the same fill and ink through the same call, so the
// ground and the answer are identical to the .plb-hex already swept beside
// them; including them would triple the sample count and widen coverage by
// zero grounds. They ARE gated below - for the AA floor, and for the alpha
// whose loss is what this paragraph is about.
const READABLE_INK_SEL = '.hw-board .plb-hex, .hw-ui-mark, .hw-ui-avatar'

const SEARCH_SWEEP = `(() => {
  ${HELPERS}
  const out = []
  for (const el of document.querySelectorAll(${JSON.stringify(READABLE_INK_SEL)})) {
    const cs = getComputedStyle(el)
    const g = groundOf(el)
    if (!g) { out.push({ cls: String(el.className), gradient: true }); continue }
    const fg = parse(cs.color)
    if (!fg) continue
    if (groupAlpha(el) < 1) continue
    const ink = fg.a < 1 ? over(fg, g) : fg.rgb
    // readableInk's own preference order: the house ink is whichever of
    // #141414 / #FFFFFF measures better on this ground.
    const HOUSE_DARK = [20, 20, 20], WHITE = [255, 255, 255]
    const house = ratio(HOUSE_DARK, g) >= ratio(WHITE, g) ? HOUSE_DARK : WHITE
    const houseClears = ratio(house, g) >= 4.5
    // The nearest grey to the house pole that clears — scanned linearly with
    // ratio() alone, sharing no code with nearestPassingLightness.
    let want = null
    const h0 = greyL(house)
    for (let step = 0; step <= 100 && !want; step++) {
      for (const dir of step === 0 ? [0] : [-1, 1]) {
        const l = h0 + dir * step
        if (l < 0 || l > 100) continue
        if (ratio(grey(l), g) >= 4.5) { want = { l, step, hex: hex(grey(l)) }; break }
      }
    }
    out.push({
      cls: String(el.className).split(' ')[0] || el.tagName,
      text: (el.textContent || '').trim().slice(0, 12),
      ink: hex(ink), ground: hex(g), ratio: Math.round(ratio(ink, g) * 1000) / 1000,
      inkIsGrey: isGrey(ink), inkL: greyL(ink), houseL: h0, houseClears,
      want,
    })
  }
  return out
})()`

// The AA floor over EVERY text node the panel paints, not a fixed list. 8c
// measures eleven named selectors; this walks the subtree so a node added
// tomorrow is measured tomorrow. The two opacity-bearing board labels are
// reported separately rather than dropped — a node this spec cannot judge is a
// node it has not measured, and that has to be visible.
const FLOOR_SWEEP = `(() => {
  ${HELPERS}
  const out = []
  for (const root of document.querySelectorAll('.hw-ui, .hw-board')) {
    for (const el of root.querySelectorAll('*')) {
      if (el.children.length) continue
      if (!(el.textContent || '').trim()) continue
      const cs = getComputedStyle(el)
      if (cs.visibility === 'hidden' || cs.display === 'none') continue
      const fg = parse(cs.color)
      if (!fg) continue
      const g = groundOf(el)
      if (!g) { out.push({ cls: String(el.className), gradient: true }); continue }
      const ga = groupAlpha(el)
      const alpha = fg.a * ga
      const ink = alpha < 1 ? over({ rgb: fg.rgb, a: alpha }, g) : fg.rgb
      const size = parseFloat(cs.fontSize)
      const weight = Number(cs.fontWeight)
      out.push({
        cls: String(el.className).split(' ')[0] || el.tagName,
        text: (el.textContent || '').trim().slice(0, 12),
        ink: hex(ink), ground: hex(g),
        ratio: Math.round(ratio(ink, g) * 1000) / 1000,
        floor: (size >= 24 || (size >= 18.66 && weight >= 700)) ? 3 : 4.5,
        translucent: alpha < 1,
        alpha: Math.round(alpha * 1000) / 1000,
      })
    }
  }
  return out
})()`

test.describe('Workbench ink search direction', () => {
  test('every workbench ink is the SMALLEST passing move, at both themes', async ({ page }) => {
    watch(page, PERSONA)
    await page.addInitScript(() => {
      localStorage.setItem('vs-appearance', JSON.stringify({
        rounding: 'default', density: 'cozy', reducedMotion: true,
      }))
    })
    // A DETERMINISTIC PALETTE, and this spec is worthless without one.
    //
    // makeSwatch() is pure Math.random() with no seed hook, and the case this
    // file exists to measure - a fill where NEITHER #141414 nor #FFFFFF clears
    // 4.5:1, so readableInk must actually search - is 570 of the 16,200 colours
    // the generator can emit, about 3.5%. Over eight rendered rounds that is an
    // expected two nodes, and often zero: the search assertion below would be
    // vacuous on most runs and would flake on the rest. Seeding Math.random
    // makes the population fixed, so `walkReached` is a constant this file can
    // assert on rather than a coin toss.
    //
    // A CONSTANT rather than a seeded PRNG, and that is the robust choice here.
    // A PRNG only lands the palette I want if the app consumes randoms in
    // exactly the order I assumed - generate() takes 1 for the base hue and 2
    // per swatch - and ANY other Math.random() caller on the page shifts the
    // sequence and silently changes what is measured. A constant cannot
    // desynchronise. 0.02 gives base hue 7, jitter -3.84, saturation 60.32, and
    // therefore the palette
    //   #8B2822  #C05930  #D79B5B  #E4CF91  #F1F0C6
    // whose second step #C05930 is IN THE DEAD BAND: #141414 measures 4.42:1
    // on it and #FFFFFF 4.28:1, so neither house pole clears and readableInk
    // must search. It answers #050505; the one-directional walk answered
    // #000000. 2,082 of 9,999 constants reach this state, so the choice is not
    // delicate - but it is fixed, so walkReached is a constant and not a coin
    // toss.
    //
    // THE BREADTH LIVES ELSEWHERE, deliberately. 8c in
    // 10-home-chaos-to-calm.spec.js rerolls real random palettes and sweeps the
    // AA floor; the unit file drives all 16,200 colours the generator can emit.
    // This spec is the narrow one: it proves the COMPONENT still routes through
    // a two-directional search, on one fill chosen because it is the case that
    // can tell the two searches apart.
    await page.addInitScript(() => { Math.random = () => 0.02 })
    await go(page, '/')

    // A SETTLED CARD, by the component's own invariant. Clicking Generate
    // schedules a React update; reading getComputedStyle in the next task can
    // catch the DOM between two palettes and compare a label from one render
    // against a ground from another. The board paints its column from --plb-c
    // and prints that same hex in .plb-hex, so "settled" is exact equality
    // rather than a tolerance — a torn read is a column whose custom property
    // and printed value disagree, full stop.
    const settled = async () => expect.poll(async () => page.evaluate(() => {
      const cols = [...document.querySelectorAll('.hw-board .plb-col')]
      if (cols.length !== 5) return false
      return cols.every((col) => {
        const t = (col.querySelector('.plb-hex')?.textContent || '').trim()
        if (!/^#[0-9A-F]{6}$/i.test(t)) return false
        return col.style.getPropertyValue('--plb-c').trim().toUpperCase() === t.toUpperCase()
      })
    }), { message: 'every column and its printed hex are from the same render' }).toBe(true)

    const notNearest = []
    const belowFloor = []
    const gradients = []
    const seenGrounds = new Set()
    // The alpha each board label was actually painted at, which is the fact
    // the deleted exemption below used to be about.
    const labelAlpha = new Map()
    let searchSamples = 0
    let floorSamples = 0
    let walkReached = 0

    for (const theme of ['light', 'dark']) {
      if (theme === 'dark') {
        await page.addInitScript(() => {
          try { localStorage.setItem('vs-t', 'dark') } catch { /* private mode */ }
        })
        await go(page, '/')
      }
      // The APP put itself in this theme. A setAttribute from here would flip
      // the CSS tokens and leave every inline style computed in light mode —
      // the vacuous pass 8c records having shipped once.
      await expect.poll(
        () => page.evaluate(() => document.documentElement.getAttribute('data-theme')),
        { message: `the APP put itself in ${theme}` },
      ).toBe(theme)

      // FOUR ROUNDS PER THEME, matching 8c's budget for the same reason: this
      // panel rerolls at random, and a 24-round loop in one test budget is the
      // flake that already impersonated a live defect on this file's
      // neighbour. The exhaustive proof is the unit sweep over all 16,200
      // colours; what only a browser can show is that the COMPONENT still
      // routes through those functions, on the ground it composites.
      // TWO ROUNDS, not four: Math.random is a constant above, so Generate
      // reproduces the same palette and further rounds re-measure the same
      // colours. The second round is kept because it exercises the settle path
      // after a real click, which is where a torn read would show up.
      for (let round = 0; round < 2; round++) {
        await settled()

        const search = await page.evaluate(SEARCH_SWEEP)
        for (const s of search) {
          if (s.gradient) { gradients.push(`[${theme}] .${s.cls}`); continue }
          searchSamples++
          seenGrounds.add(s.ground)
          // Only the case the defect lives in: the house pole does NOT clear on
          // its own, so readableInk has to search. When it does clear there is
          // no move to be smallest.
          if (s.houseClears) continue
          walkReached++
          if (!s.want) continue // no grey clears at all; the poles carry it
          if (!s.inkIsGrey) continue // a chromatic ink is not on the grey axis
          const moved = Math.abs(s.inkL - s.houseL)
          if (moved > s.want.step) {
            notNearest.push(`[${theme}] .${s.cls} "${s.text}" ink ${s.ink} is ${moved}L off the`
              + ` house pole on ${s.ground}, but ${s.want.hex} passes at ${s.want.step}L`
              + ` (measured ${s.ratio}:1)`)
          }
        }

        const floor = await page.evaluate(FLOOR_SWEEP)
        for (const s of floor) {
          if (s.gradient) { gradients.push(`[${theme}] .${s.cls}`); continue }
          floorSamples++
          if (s.cls === 'plb-name' || s.cls === 'plb-role') {
            labelAlpha.set(`[${theme}] .${s.cls}`, s.alpha)
          }
          if (s.ratio >= s.floor) continue
          // NO TRANSLUCENCY EXEMPTION ANY MORE, and its removal is the point.
          // This branch used to divert opacity-bearing labels into a separate
          // allowlist so they could sit under the floor without failing the
          // build. The two rules it existed for - .plb-name at .95 and
          // .plb-role at .6 - no longer carry opacity, so every node the sweep
          // reaches is now held to the same floor by the same assertion.
          belowFloor.push(`[${theme}] .${s.cls} "${s.text}" ${s.ink} on ${s.ground}`
            + ` = ${s.ratio}:1 (floor ${s.floor})`
            + (s.translucent ? ` - painted at alpha ${s.alpha}` : ''))
        }

        await page.getByRole('button', { name: 'Generate' }).click()
      }
    }

    // ── POSITIVE CONTROLS. Every number below is a count of work actually
    // done. An all-clear result and a sweep that examined nothing are the same
    // output unless the work is counted, and this repo has shipped the second
    // one before: worstOf() returned violations without saying how many labels
    // it had looked at, so a panel that rendered nothing was a clean run.
    // Seven inked nodes per sweep - five .plb-hex columns, .hw-ui-mark and
    // .hw-ui-avatar - times two rounds times two themes is 28. The bar sits
    // below that rather than at it so an ordinary content edit does not trip
    // it, but a sweep that has stopped FINDING the ink still does.
    expect(searchSamples, 'the readableInk sweep found no inked nodes at all —'
      + ` ${READABLE_INK_SEL} has stopped matching`).toBeGreaterThan(20)
    expect(floorSamples, 'the floor sweep found no text in .hw-ui / .hw-board')
      .toBeGreaterThan(40)
    expect(gradients, 'a workbench ink landed on a background-image, which this walk'
      + ` cannot measure:${NL}${gradients.join(NL)}`).toEqual([])
    // Both themes produced different grounds, so the loop ran for real rather
    // than measuring light twice.
    expect(seenGrounds.size, 'both themes produced the same set of grounds — the theme'
      + ' seed did not reach the inline styles').toBeGreaterThan(1)

    // POSITIVE CONTROL FOR THE SEARCH ASSERTION, and the reason Math.random is
    // seeded above. `walkReached` counts nodes where the house pole did NOT
    // clear on its own, so readableInk had to search rather than return a pole
    // unchanged. Those are the only nodes the assertion below can judge; if
    // this is zero the assertion is measuring nothing and passing.
    expect(walkReached, 'no rendered node reached the readableInk search - the seeded'
      + ' palette has stopped producing a fill where neither #141414 nor #FFFFFF'
      + ' clears 4.5:1, so the assertion below proves nothing').toBeGreaterThan(0)

    // ── THE SEARCH ASSERTION. This is what a floor-only sweep cannot see.
    expect(notNearest, `${notNearest.length} rendered inks are farther from the house pole`
      + ` than the smallest passing move, over ${walkReached} nodes where the pole did not`
      + ` clear on its own and a search was required:${NL}${notNearest.join(NL)}${NL}`
      + 'That is the one-directional walk returning its input and the raw pole catching'
      + ' it — legible, and not what readableInk promises.').toEqual([])

    // ── AND THE FLOOR STILL HOLDS.
    expect(belowFloor, `${belowFloor.length} opaque workbench text nodes are below their`
      + ` contrast floor over ${floorSamples} rendered samples:${NL}${belowFloor.join(NL)}`)
      .toEqual([])

    // THE OPACITY ITSELF IS THE GUARD NOW, not a tolerance for what it broke.
    //
    // readableInk's guarantee is EXACT rather than comfortable: swept over a
    // 2-step grid of all 2,097,152 grounds, its ink clears 4.5:1 on every one
    // and the worst case is 4.500:1 on #F03004. There is no headroom in that
    // for an opacity to spend, so any value below 1 on a label inking through
    // it drops straight under the floor - .95 on 10.41% of grounds, .6 on
    // 89.51%. That is why the two rules were emptied rather than lowered, and
    // why the floor assertion above no longer needs an exemption list.
    //
    // Asserting the ALPHA rather than the ratio is deliberate. Whether a given
    // palette happens to expose the failure depends on the colours the
    // generator rolled, so a contrast assertion here would pass on most runs
    // even with the opacity restored; the alpha is true on every run. This is
    // the regression that actually shipped twice, and it fails the moment a
    // dimming property comes back to either rule.
    expect([...labelAlpha.entries()].filter(([, alpha]) => alpha < 1).sort(),
      "a Palette Builder board label is painted at less than full alpha. Its ink"
      + " comes from readableInk, whose worst case is exactly 4.500:1, so dimming"
      + " it cannot leave it passing - see the note on .plb-role in global.css.")
      .toEqual([])

    // POSITIVE CONTROL. The assertion above is an emptiness check over a map
    // this run populated, so an empty map satisfies it - which is what a
    // renamed class or a board that failed to render would produce.
    expect([...labelAlpha.keys()].sort(),
      "the board labels were never measured, so the alpha assertion above is"
      + " guarding an empty map rather than the rendered labels")
      .toEqual(['[dark] .plb-name', '[dark] .plb-role', '[light] .plb-name', '[light] .plb-role'])
  })
})
