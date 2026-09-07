// The WIRING of src/utils/workbenchInk.js, not the search it calls
// [contrast-search-one-directional-callers].
//
// WHY THIS FILE EXISTS SEPARATELY FROM tests/unit/contrast-fixes.test.js. That
// file proves nearestPassingLightness is correct over 46,656 pairs and says so
// in its own header: it deliberately does NOT prove that anything calls it. This
// repo has now paid three times for exactly that gap — #395, #393 and #405 each
// replaced the one-directional walk at ONE call site and left the helper and the
// other call sites standing, and the unit suite stayed green every time. So this
// file drives the four workbenchInk functions and asserts properties that hold
// only when the search underneath them scans BOTH directions.
//
// WHAT THE OLD SEARCH DID. fixForeground and fixBackground bisected the moving
// colour's HSL lightness in ONE direction, chosen from the OTHER colour's
// luminance — `bgLum < 0.5` meant walk the ink lighter. 0.5 is not the
// crossover: black and white are equally readable at relative luminance 0.179,
// so on every ground between 0.179 and 0.5 the walk went away from the answer,
// found nothing, and returned its INPUT. A `>= 4.5` gate at the call site then
// re-checked the ANSWER and passed, which is not the same claim as the SEARCH
// being sound — and that is the whole reason this survived behind four gates.
//
// HOW MUCH OF THIS IS MUTATION-CATCHABLE, MEASURED RATHER THAN ASSUMED. Each
// call site was reverted to the old one-way walk ON ITS OWN and this file was
// re-run. Six sites, and only two of them can be caught here:
//
//   readableInk's walk     CAUGHT — 570 of 16,200 generated colours ship an ink
//                          up to 7 lightness units farther from the house pole
//   mutedInk step 2        CAUGHT — 16,112 inks lose their hue for no reason
//   labelGround's move     NOT CAUGHT — the branch is provably unreachable
//   cardGrounds bg move    NOT CAUGHT — 1 changed output in 48,681, 0 AA breaks
//   cardGrounds surface    NOT CAUGHT — 0 changed outputs
//   mutedInk step 3        NOT CAUGHT — inert: over 783,872 cases that reach it,
//                          the direction changes whether the ink clears in 0
//
// THE FOUR "NOT CAUGHT" ROWS ARE THE POINT OF THIS HEADER, not an apology for
// it. Each has a test below that guards the PRECONDITION making it unreachable
// or harmless, because that precondition is the thing that can actually break;
// and each says in its own body that a mutation there will not turn it red. A
// test that silently covers nothing is worse than an absent one, and this file
// would rather name its blind spots than let a future reader assume it has
// none. Two of those sites — readableInk's second walk candidate and the pair
// of cardGrounds moves — were masking EACH OTHER rather than being masked by a
// pole fallback, which is why reverting any single one of them used to be
// invisible; the dead one has since been deleted.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import * as colors from '../../src/utils/colors.js'
import { contrastRatio } from '../../src/utils/colors.js'
import {
  L_RAMP, hslToHex, readableInk, labelGround, cardGrounds, mutedInk,
} from '../../src/utils/workbenchInk.js'

const AA = 4.5
const NL = String.fromCharCode(10)

// The generator's own space: makeSwatch emits saturation in [60, 76).
const SATS = [60, 62, 64, 66, 68, 70, 72, 74, 76]
const GEN = []
for (let h = 0; h < 360; h++) for (const s of SATS) for (const l of L_RAMP) GEN.push(hslToHex(h, s, l))

// An INDEPENDENT oracle. It shares no code with nearestPassingLightness: it
// walks the 101 integer greys with contrastRatio alone and reports the nearest
// one to `from` that clears. If the implementation and this ever agree by
// accident, they agree for different reasons.
const grey = (l) => hslToHex(0, 0, l)
function nearestPassingGrey(fromL, ground, target) {
  for (let step = 0; step <= 100; step++) {
    for (const dir of step === 0 ? [0] : [-1, 1]) {
      const l = fromL + dir * step
      if (l < 0 || l > 100) continue
      if (contrastRatio(grey(l), ground) >= target) return { hex: grey(l), l, step }
    }
  }
  return null
}
const lightnessOf = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  return ((Math.max(r, g, b) + Math.min(r, g, b)) / 2) * 100
}
const isAchromatic = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  return r === g && g === b
}

/* ── the helpers must stay retired ──────────────────────────────────────── */

test('fixForeground and fixBackground are gone from utils/colors', () => {
  // A dead helper that keeps the wrong rule alive is how this bug came back
  // three times. This is the guard that makes "retired" mean retired.
  assert.equal(colors.fixForeground, undefined,
    'fixForeground is exported again — it walks ONE direction chosen from the'
    + NL + 'other colour\'s luminance, and 0.5 is not the crossover. Use'
    + NL + 'nearestPassingLightness, which scans both and keeps the smaller move.')
  assert.equal(colors.fixBackground, undefined, 'fixBackground is exported again')
})

test('no source file calls the retired helpers', () => {
  // The export check above cannot see a locally redefined copy, which is the
  // shape a well-meaning "I just need a quick contrast fix" commit takes.
  const roots = ['src', 'api', 'scripts']
  const hits = []
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) { walk(full); continue }
      if (!/\.(js|jsx|ts|tsx)$/.test(entry.name)) continue
      // src/data/pipeline.js is the BACKLOG, and its rows quote the defect by
      // name on purpose — including this item's own row. Skipping it is not a
      // hole: it declares no functions and imports nothing.
      if (full === path.join('src', 'data', 'pipeline.js')) continue
      const src = fs.readFileSync(full, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '')
      for (const name of ['fixForeground', 'fixBackground']) {
        if (src.includes(name)) hits.push(`${full}: ${name}`)
      }
    }
  }
  for (const r of roots) walk(r)
  assert.deepEqual(hits, [], `the one-directional search is back in:${NL}  ${hits.join(NL + '  ')}`)
})

/* ── readableInk: the smallest passing move, not the nearest pole ───────── */

test('readableInk takes the SMALLEST passing move off the house ink', () => {
  // CATCHES: reverting the nearestPassingLightness call in readableInk.
  // With the one-way walk the candidate returns its input, the list falls
  // through to the raw #000000, and the ink ships up to 7 lightness units
  // farther from the house ink than it needs to be. #D1571F shipped #000000
  // where #121212 passes.
  let examined = 0
  let walkReached = 0
  const farther = []
  for (const bg of GEN) {
    examined++
    const house = contrastRatio('#141414', bg) >= contrastRatio('#FFFFFF', bg) ? '#141414' : '#FFFFFF'
    // The walk only matters when NEITHER raw pole clears on its own.
    if (contrastRatio(house, bg) >= AA) continue
    if (contrastRatio(house === '#141414' ? '#FFFFFF' : '#141414', bg) >= AA) continue
    walkReached++
    const ink = readableInk(bg)
    assert.ok(contrastRatio(ink, bg) >= AA, `${ink} on ${bg} is under AA`)
    const want = nearestPassingGrey(Math.round(lightnessOf(house)), bg, AA)
    assert.notEqual(want, null, `the oracle found no passing grey for ${bg}`)
    // BOTH SIDES IN INTEGER LIGHTNESS STEPS. hslToHex takes an integer L, so
    // that is the real resolution of the answer; comparing a float derived from
    // the rendered RGB against a step count flags a colour against itself.
    const moved = Math.abs(Math.round(lightnessOf(ink)) - Math.round(lightnessOf(house)))
    if (moved > want.step) {
      farther.push(`${bg}: shipped ${ink} (${moved}L off ${house}) — ${want.hex} passes at ${want.step}L`)
    }
  }
  // POSITIVE CONTROL. An empty sweep and a perfect one look identical unless
  // the work is counted, and this branch is a minority of the space.
  assert.equal(examined, 16200, `the sweep examined ${examined} colours, not the generator's 16,200`)
  assert.equal(walkReached, 570,
    `the walk candidate was reached ${walkReached} times, not the known 570 — if this`
    + NL + 'dropped to 0 the assertion below is vacuous and proves nothing.')
  assert.deepEqual(farther.slice(0, 8), [],
    `${farther.length} of ${walkReached} generated colours ship an ink farther from the`
    + NL + 'house pole than the smallest passing move. That is the one-directional'
    + NL + 'walk returning its input and the raw pole catching it. First eight:'
    + NL + '  ' + farther.slice(0, 8).join(NL + '  '))
})

test('readableInk still clears AA on every colour the generator can emit', () => {
  let examined = 0
  let worst = Infinity
  const bad = []
  for (const bg of GEN) {
    examined++
    const r = contrastRatio(readableInk(bg), bg)
    if (r < worst) worst = r
    if (r < AA) bad.push(`${bg} -> ${readableInk(bg)} = ${r.toFixed(2)}:1`)
  }
  assert.equal(examined, 16200)
  assert.deepEqual(bad.slice(0, 8), [], `${bad.length} under AA; first eight:${NL}  ${bad.slice(0, 8).join(NL + '  ')}`)
  assert.ok(worst >= AA, `worst pair is ${worst.toFixed(4)}:1`)
})

/* ── labelGround: unreachable, and the arithmetic that makes it so ──────── */

test('labelGround is the identity, because one absolute pole always clears', () => {
  // NOT MUTATION-CATCHABLE, AND SAID SO OUT LOUD. Reverting the ground move in
  // labelGround changes nothing over 48,681 colours, because the branch never
  // runs. What this test guards is the PRECONDITION that makes it never run —
  // if readableInk ever stops guaranteeing AA, this fails here rather than
  // silently waking a search nobody has looked at in a year.
  //
  //   contrast(black, C) = (L + .05) / .05    rises with L
  //   contrast(white, C) = 1.05 / (L + .05)   falls with L
  //
  // They cross at L = .1789 where both read 4.579:1, so for EVERY colour in
  // sRGB one absolute pole is at least 4.579 > 4.5.
  let examined = 0
  let minMaxPole = Infinity
  const moved = []
  for (const bg of GEN) {
    examined++
    minMaxPole = Math.min(minMaxPole, Math.max(contrastRatio('#000000', bg), contrastRatio('#FFFFFF', bg)))
    if (labelGround(bg) !== bg) moved.push(`${bg} -> ${labelGround(bg)}`)
  }
  assert.equal(examined, 16200)
  assert.ok(minMaxPole > AA,
    `some generated colour admits no absolute pole above AA (worst ${minMaxPole.toFixed(3)}:1) —`
    + NL + 'the premise that makes labelGround an identity has broken.')
  assert.deepEqual(moved.slice(0, 8), [],
    `${moved.length} grounds were repainted. The swatch is a colour CONTROL: every`
    + NL + 'unit it moves is the preview showing a colour the palette did not'
    + NL + `generate. First eight:${NL}  ${moved.slice(0, 8).join(NL + '  ')}`)
})

/* ── cardGrounds: a real mask, recorded as one ──────────────────────────── */

test('cardGrounds clears both grounds with one pole and moves them minimally', () => {
  // NOT MUTATION-CATCHABLE EITHER, AND FOR A REASON WORTH KEEPING. fixBackground
  // took its direction from the INK, and the ink here is always an achromatic
  // pole — #141414 at luminance .0069, #FFFFFF at 1.0 — both unambiguously on
  // the correct side of 0.5. The threshold that is wrong near the .179 crossover
  // was never consulted near it. Reverting either move changed 1 of 48,681
  // outputs and broke 0. This test guards the CONTRACT instead.
  let examined = 0
  const bad = []
  for (const bg of GEN) {
    examined++
    const [h, s, l] = [0, 1, 2].map((i) => Number(hslPartsOf(bg)[i]))
    const surface = hslToHex(h, s, Math.min(100, l + 6))
    const cg = cardGrounds(bg, surface)
    if (!cg.clears) continue // genuinely impossible pairs are step 3's problem
    const wBg = contrastRatio(cg.pole, cg.bg)
    const wSurface = contrastRatio(cg.pole, cg.surface)
    if (wBg < AA || wSurface < AA) {
      bad.push(`${bg}/${surface}: pole ${cg.pole} gives ${wBg.toFixed(2)}/${wSurface.toFixed(2)}`)
    }
  }
  assert.equal(examined, 16200)
  assert.deepEqual(bad.slice(0, 8), [],
    `${bad.length} cards report clears=true while a ground is under AA:${NL}  ${bad.slice(0, 8).join(NL + '  ')}`)
  // The recorded pair from the doc comment, pinned so the choice cannot drift.
  const rec = cardGrounds('#248721', '#3b9738')
  assert.equal(rec.pole, '#141414', 'the recorded card pair stopped choosing the black pole')
  assert.ok(rec.clears && Math.min(contrastRatio(rec.pole, rec.bg), contrastRatio(rec.pole, rec.surface)) >= AA)
})

// hexToHsl lives in utils/colors; this keeps the test's own maths independent.
function hslPartsOf(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const max = Math.max(r, g, b); const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const d = max - min
  let h = 0
  let s = 0
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1))
    if (max === r) h = 60 * (((g - b) / d) % 6)
    else if (max === g) h = 60 * ((b - r) / d + 2)
    else h = 60 * ((r - g) / d + 4)
  }
  return [Math.round((h + 360) % 360), Math.round(s * 100), Math.round(l * 100)]
}

/* ── mutedInk step 2: the hue is kept when a passing ink of that hue exists ─ */

test('mutedInk keeps the muted hue instead of collapsing to grey', () => {
  // CATCHES: reverting step 2's walk. With the one-way search the walk returns
  // its input, step 3 takes over, and the muted role lands on a near-black or
  // near-white pole — legible, but no longer the muted colour, and the card
  // loses the hierarchy the role exists to carry. Measured over the review's
  // 216-colour grid: 16,112 inks lost their hue for no reason.
  //
  // THE RECORDED CASE. #009900 has relative luminance .228, so `bgLum < 0.5`
  // sent the search toward white, which tops out at 3.78:1 and never clears.
  const ink = mutedInk('#000099', ['#009900'])
  assert.ok(contrastRatio(ink, '#009900') >= AA, `${ink} on #009900 is under AA`)
  assert.ok(!isAchromatic(ink),
    `mutedInk collapsed #000099 on #009900 to the achromatic ${ink}. A passing blue`
    + NL + 'exists — the walk went the wrong way and step 3 cleaned up after it.')
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(ink.slice(i, i + 2), 16))
  assert.ok(b > r && b > g, `the muted role stopped being blue: ${ink}`)

  // And across the grid, where the pole fallback made this invisible.
  const STEP = 51
  const LEVELS = []
  for (let v = 0; v <= 255; v += STEP) LEVELS.push(v)
  const GRID = []
  for (const rr of LEVELS) for (const gg of LEVELS) for (const bb of LEVELS) {
    GRID.push('#' + [rr, gg, bb].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase())
  }
  assert.equal(GRID.length, 216, 'the grid shrank')

  let reached = 0
  let collapsed = 0
  const examples = []
  for (const ground of GRID) {
    for (const seed of GRID) {
      if (contrastRatio(seed, ground) >= AA) continue
      if (isAchromatic(seed)) continue
      // Only cases where SOME ink of the seed's own hue clears — otherwise
      // collapsing to a pole is the correct answer, not a defect.
      const want = nearestPassingOnOwnAxis(seed, ground, AA)
      if (!want) continue
      // The NEAREST passing colour on that axis may itself be achromatic, when
      // the smallest move happens to run the saturation out. Agreeing with the
      // oracle on chroma is the honest claim; demanding chroma unconditionally
      // would fail the cases where losing it IS the smallest passing move.
      const nearest = nearestPassingIncludingGrey(seed, ground, AA)
      if (nearest && isAchromatic(nearest)) continue
      reached++
      const got = mutedInk(seed, [ground])
      if (isAchromatic(got)) {
        collapsed++
        if (examples.length < 8) examples.push(`${seed} on ${ground}: got ${got}, ${want} passes at ${contrastRatio(want, ground).toFixed(2)}:1`)
      }
    }
  }
  // POSITIVE CONTROL: this branch is most of the failing space, not a corner.
  assert.ok(reached > 20000, `only ${reached} cases reached the hue-preserving branch — the sweep did no work`)
  assert.deepEqual(examples, [],
    `${collapsed} of ${reached} muted inks were flattened to grey although an ink of`
    + NL + `their own hue clears AA. First eight:${NL}  ${examples.join(NL + '  ')}`)
})

// The same axis, but WITHOUT the achromatic filter: the nearest passing colour
// of any chroma. Used to decide whether losing the hue was the smallest move.
function nearestPassingIncludingGrey(seed, ground, target) {
  const [h, s, l0] = hslPartsOf(seed)
  for (let step = 1; step <= 100; step++) {
    for (const dir of [-1, 1]) {
      const l = l0 + dir * step
      if (l < 0 || l > 100) continue
      const c = hslToHex(h, s, l)
      if (contrastRatio(c, ground) >= target) return c
    }
  }
  return null
}

// The seed's own lightness axis, scanned linearly with contrastRatio only.
//
// ACHROMATIC CANDIDATES ARE SKIPPED, and that is not a detail. Every hue's
// lightness axis ends at #000000 and #ffffff, so an oracle that accepted them
// would report "an ink of this hue passes" whenever ANY ink passes, and the
// test above would then demand a chromatic answer in cases where collapsing to
// a pole is the correct one. The question this answers is narrower: is there a
// colour that still LOOKS like the muted role and clears?
function nearestPassingOnOwnAxis(seed, ground, target) {
  const [h, s, l0] = hslPartsOf(seed)
  for (let step = 1; step <= 100; step++) {
    for (const dir of [-1, 1]) {
      const l = l0 + dir * step
      if (l < 0 || l > 100) continue
      const c = hslToHex(h, s, l)
      if (isAchromatic(c)) continue
      if (contrastRatio(c, ground) >= target) return c
    }
  }
  return null
}

/* ── mutedInk step 3: never worse than the pole it started from ─────────── */

test('mutedInk step 3 never returns worse than the best unwalked pole', () => {
  // CATCHES: reverting step 3, AND the regression a like-for-like swap of the
  // search introduced there. Step 3 walks each pole against each ground IN
  // SEQUENCE, so clearing the second ground can break the first. The old
  // one-way search hid that by usually doing nothing; a search that actually
  // moves exposed it. On [#787878, #000000] the sequential walk lands on
  // #757575 — worst 1.04:1 — where the plain unwalked #FFFFFF is worth 4.42:1.
  //
  // The contract this pins: on grounds no ink can satisfy, step 3 still hands
  // back the BEST FAILING value, which is what its own comment has always
  // promised. Every intermediate and every raw pole is a candidate, so the
  // result can never be worse than starting from a pole and not moving.
  const poles = ['#141414', '#FFFFFF', '#000000']
  const worstOver = (ink, grounds) => Math.min(...grounds.map((g) => contrastRatio(ink, g)))

  const recorded = ['#787878', '#000000']
  const got = mutedInk('#000000', recorded)
  const bestPole = Math.max(...poles.map((p) => worstOver(p, recorded)))
  assert.ok(worstOver(got, recorded) >= bestPole - 1e-9,
    `step 3 returned ${got} at ${worstOver(got, recorded).toFixed(2)}:1 on [${recorded}]`
    + NL + `where an unwalked pole is worth ${bestPole.toFixed(2)}:1. The sequential walk`
    + NL + 'cleared the second ground by abandoning the first.')

  // Swept over the band where NEITHER house pole clears — the only place step 3
  // is load-bearing at all.
  const band = []
  for (let h = 0; h < 360; h += 30) {
    for (let s = 0; s <= 100; s += 25) {
      for (let l = 0; l <= 100; l++) {
        const c = hslToHex(h, s, l)
        if (contrastRatio('#141414', c) < AA && contrastRatio('#FFFFFF', c) < AA) band.push(c)
      }
    }
  }
  const BAND = [...new Set(band)]
  assert.ok(BAND.length > 100,
    `the dead band came back with ${BAND.length} colours — if this is empty the sweep below is vacuous`)

  let reached = 0
  const worse = []
  for (const g1 of BAND.filter((_, i) => i % 3 === 0)) {
    for (const g2 of ['#000000', '#FFFFFF', '#7F7F7F', '#009900', '#6666FF', '#3366FF', '#CC3399', '#99CC00']) {
      for (const seed of ['#000000', '#FFFFFF', '#000099', '#996600', '#00CC99', '#CCCC99', '#330000']) {
        const grounds = [g1, g2]
        if (worstOver(seed, grounds) >= AA) continue
        const ink = mutedInk(seed, grounds)
        // A PASSING ink satisfies the contract however much headroom a pole has
        // — step 2 returning a hue-preserving 4.54:1 beats a grey pole at 4.76,
        // and that preference is the whole point of step 2. Step 3's
        // best-failing-value promise only binds when nothing clears at all.
        if (worstOver(ink, grounds) >= AA) continue
        reached++
        const best = Math.max(...poles.map((p) => worstOver(p, grounds)))
        if (worstOver(ink, grounds) < best - 1e-9) {
          worse.push(`${seed} on [${grounds}]: got ${ink} at ${worstOver(ink, grounds).toFixed(2)}, pole is worth ${best.toFixed(2)}`)
        }
      }
    }
  }
  assert.ok(reached > 200, `only ${reached} cases reached step 3's territory — the sweep did no work`)
  assert.deepEqual(worse.slice(0, 8), [],
    `${worse.length} of ${reached} inks are worse than simply not moving a pole:`
    + NL + '  ' + worse.slice(0, 8).join(NL + '  '))
})

test('mutedInk clears AA whenever any ink can', () => {
  // CATCHES: reverting either mutedInk walk, together. Over the review's grid
  // the shipped code returned 1,071 inks under 4.5:1 that a both-directions
  // search clears — worst #000066 on #6666FF, which shipped #141414 at 4.31:1
  // where #000047 gives 4.50:1. #141414 and #FFFFFF cross at only 4.295:1, so
  // there is a band of grounds where NEITHER house pole clears and the walk is
  // the only thing that can save it.
  const STEP = 51
  const LEVELS = []
  for (let v = 0; v <= 255; v += STEP) LEVELS.push(v)
  const GRID = []
  for (const r of LEVELS) for (const g of LEVELS) for (const b of LEVELS) {
    GRID.push('#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase())
  }
  let failing = 0
  const bad = []
  for (const ground of GRID) {
    // An ink exists iff an absolute pole clears — the same oracle
    // contrast-fixes.test.js uses, computed from contrastRatio alone.
    const possible = contrastRatio('#000000', ground) >= AA || contrastRatio('#FFFFFF', ground) >= AA
    if (!possible) continue
    for (const seed of GRID) {
      if (contrastRatio(seed, ground) >= AA) continue
      failing++
      const ink = mutedInk(seed, [ground])
      if (contrastRatio(ink, ground) < AA) {
        bad.push(`${seed} on ${ground} -> ${ink} = ${contrastRatio(ink, ground).toFixed(2)}:1`)
      }
    }
  }
  assert.equal(failing, 38594,
    `the sweep examined ${failing} failing pairs, which is not the known population`)
  assert.deepEqual(bad.slice(0, 8), [],
    `${bad.length} of ${failing} muted inks stay under AA although an ink exists.`
    + NL + `First eight:${NL}  ${bad.slice(0, 8).join(NL + '  ')}`)
})
