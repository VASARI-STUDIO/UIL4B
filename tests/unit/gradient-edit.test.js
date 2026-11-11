// The gradient editor's pure edit rules (utils/gradientEdit.js): the hex text
// the stop field accepts, the colour a new stop starts with, and when a preset
// tile still counts as the gradient on screen.
//
// MUTATIONS (each turns the tests named red):
//   normaliseHex no longer trims                      -> "surrounding spaces are ignored"
//   normaliseHex requires the #                       -> "a hex without a # is accepted"
//   normaliseHex does not expand 3 digits             -> "a 3-digit hex expands"
//   newStopColour always mixes in sRGB                -> "in OKLCH the new stop is the OKLCH blend"
//   newStopColour ignores the stops' sort order       -> "stops given out of order"
//   presetMatches skips the angle check               -> "a different angle"
//   presetMatches skips the space check               -> "a different interpolation space"
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { normaliseHex, newStopColour, presetMatches } from '../../src/utils/gradientEdit.js'
import { mixHex, hexToRgb } from '../../src/utils/colors.js'
import { hexToOklchRaw, oklchToHex, sampleStopsOklch } from '../../src/components/tool/oklch.js'

const src = fs.readFileSync(path.join(process.cwd(), 'src/pages/GradientGenerator.jsx'), 'utf8').replace(/\r\n/g, '\n')
const block = src.slice(src.indexOf('const PRESETS = ['), src.indexOf('\n]\n', src.indexOf('const PRESETS = [')) + 2)
const PRESETS = new Function(`return ${block.replace('const PRESETS = ', '')}`)()
const preset = (name) => PRESETS.find((p) => p.n === name)

// ── hex text ────────────────────────────────────────────────────────────────

test('a hex without a # is accepted and comes back as capitals with a #', () => {
  assert.equal(normaliseHex('2f6bff'), '#2F6BFF')
  assert.equal(normaliseHex('#2f6bff'), '#2F6BFF')
  assert.equal(normaliseHex('#2F6BFF'), '#2F6BFF')
})

test('surrounding spaces are ignored', () => {
  assert.equal(normaliseHex('  #2f6bff '), '#2F6BFF')
  assert.equal(normaliseHex('\t2f6bff\n'), '#2F6BFF')
})

test('a 3-digit hex expands to 6', () => {
  assert.equal(normaliseHex('#26F'), '#2266FF')
  assert.equal(normaliseHex('  26f '), '#2266FF')
  assert.equal(normaliseHex('#fff'), '#FFFFFF')
})

test('anything else is null, so the stop keeps its last colour', () => {
  for (const bad of ['', ' ', '#', '#12', '#1234', '#12345', '#1234567', '#NOTHEX', '#2f6bf g', '2f 6b ff', '##2f6bff', null, undefined, 123456.5]) {
    assert.equal(normaliseHex(bad), null, JSON.stringify(bad))
  }
})

// ── a new stop's colour ─────────────────────────────────────────────────────

const CITRUS = [{ color: '#FFD84D', position: 0 }, { color: '#F0436A', position: 100 }]

test('in OKLCH the new stop is the OKLCH blend, not the sRGB one', () => {
  const [L1, C1, H1] = hexToOklchRaw('#FFD84D')
  const [L2, C2, H2] = hexToOklchRaw('#F0436A')
  assert.ok(Math.abs(H1 - H2) < 180, 'these two hues take the direct arc, so no wrap is needed in the expectation')
  const expected = oklchToHex((L1 + L2) / 2, (C1 + C2) / 2, (H1 + H2) / 2)
  const got = newStopColour(CITRUS, 50, 'oklch')
  assert.equal(got, expected)
  assert.notEqual(got, mixHex('#FFD84D', '#F0436A', 0.5).toUpperCase(), 'the sRGB mid is a different colour')
})

test('in sRGB the new stop is the sRGB blend', () => {
  assert.equal(newStopColour(CITRUS, 50, 'srgb'), mixHex('#FFD84D', '#F0436A', 0.5).toUpperCase())
})

test('the result is an upper-case #RRGGBB in both spaces', () => {
  for (const space of ['oklch', 'srgb']) {
    for (const pct of [0, 13, 50, 77, 100]) assert.match(newStopColour(CITRUS, pct, space), /^#[0-9A-F]{6}$/)
  }
})

test('stops given out of order are read along the ramp, not down the list', () => {
  const shuffled = [{ color: '#F0436A', position: 100 }, { color: '#FFD84D', position: 0 }]
  assert.equal(newStopColour(shuffled, 50, 'oklch'), newStopColour(CITRUS, 50, 'oklch'))
  const three = [{ color: '#6E6BFF', position: 100 }, { color: '#0A0F2C', position: 0 }, { color: '#27348B', position: 55 }]
  // 77.5% sits halfway between the 55% and 100% stops, so it is their blend.
  assert.equal(newStopColour(three, 77.5, 'oklch'), newStopColour([{ color: '#27348B', position: 55 }, { color: '#6E6BFF', position: 100 }], 77.5, 'oklch'))
})

test('at or past an end the new stop takes that end colour', () => {
  const stops = [{ color: '#0A0F2C', position: 10 }, { color: '#6E6BFF', position: 90 }]
  for (const space of ['oklch', 'srgb']) {
    assert.equal(newStopColour(stops, 0, space), '#0A0F2C')
    assert.equal(newStopColour(stops, 10, space), '#0A0F2C')
    assert.equal(newStopColour(stops, 100, space), '#6E6BFF')
  }
})

test('adding an OKLCH stop leaves the OKLCH ramp where it was (to the hex rounding)', () => {
  const before = [{ color: '#FFD84D', position: 0 }, { color: '#FF8A3D', position: 55 }, { color: '#F0436A', position: 100 }]
  for (const pct of [10, 27, 40, 70, 85]) {
    const after = [...before, { color: newStopColour(before, pct, 'oklch'), position: pct }]
    const a = sampleStopsOklch(before, 5)
    const b = sampleStopsOklch(after, 5)
    const at = (list, p) => list.find((s) => s.position === p)?.color
    for (const p of [5, 15, 25, 35, 45, 50, 60, 65, 75, 80, 90, 95]) {
      const ca = at(a, p), cb = at(b, p)
      if (!ca || !cb) continue
      const worst = Math.max(...hexToRgb(ca).map((v, i) => Math.abs(v - hexToRgb(cb)[i])))
      assert.ok(worst <= 3, `new stop at ${pct}%: ramp at ${p}% moved by ${worst} (${ca} -> ${cb})`)
    }
  }
})

// ── preset tile state ───────────────────────────────────────────────────────

const lookOf = (p, over = {}) => ({ type: p.type, angle: p.angle, space: p.space, stops: p.stops.map((s) => ({ ...s })), ...over })

test('a preset matches the gradient it just made, however the stops are ordered', () => {
  const p = preset('Indigo Night')
  assert.equal(presetMatches(p, lookOf(p)), true)
  assert.equal(presetMatches(p, lookOf(p, { stops: [...p.stops].reverse() })), true)
})

test('a different angle drops the preset, and putting it back restores it', () => {
  const p = preset('Indigo Night')
  assert.equal(p.angle, 160)
  assert.equal(presetMatches(p, lookOf(p, { angle: 161 })), false)
  assert.equal(presetMatches(p, lookOf(p, { angle: 160 })), true)
  assert.equal(presetMatches(p, lookOf(p, { angle: 160.4 })), true, 'the angle compares at whole degrees')
})

test('a different interpolation space drops the preset', () => {
  const p = preset('Indigo Night')
  assert.equal(presetMatches(p, lookOf(p, { space: 'srgb' })), false)
})

test('a different type, stop count, colour or position drops the preset', () => {
  const p = preset('Indigo Night')
  assert.equal(presetMatches(p, lookOf(p, { type: 'Conic' })), false)
  assert.equal(presetMatches(p, lookOf(p, { stops: p.stops.slice(0, 2) })), false)
  assert.equal(presetMatches(p, lookOf(p, { stops: [...p.stops, { color: '#FFFFFF', position: 70 }] })), false)
  assert.equal(presetMatches(p, lookOf(p, { stops: p.stops.map((s, i) => (i === 1 ? { ...s, color: '#27348C' } : s)) })), false)
  assert.equal(presetMatches(p, lookOf(p, { stops: p.stops.map((s, i) => (i === 1 ? { ...s, position: 56 } : s)) })), false)
})

test('a radial preset ignores the angle, which a radial gradient does not have', () => {
  const p = preset('Lilac Halo')
  assert.equal(p.type, 'Radial')
  assert.equal(presetMatches(p, lookOf(p, { angle: 33 })), true)
  assert.equal(presetMatches(p, lookOf(p, { space: 'srgb' })), false)
})

test('a preset with no space of its own (a palette preset) matches in either space', () => {
  const mine = { n: 'My palette', type: 'Linear', angle: 135, mine: true, stops: [{ color: '#112233', position: 0 }, { color: '#445566', position: 100 }] }
  assert.equal(presetMatches(mine, lookOf(mine, { space: 'oklch' })), true)
  assert.equal(presetMatches(mine, lookOf(mine, { space: 'srgb' })), true)
  assert.equal(presetMatches(mine, lookOf(mine, { angle: 90 })), false)
})

test('the page uses these rules for the hex field, a new stop and the preset tile', () => {
  assert.match(src, /import \{ normaliseHex, newStopColour, presetMatches \} from '\.\.\/utils\/gradientEdit'/)
  assert.match(src, /newStopColour\(prev, pct, railSpace\)/)
  assert.match(src, /presetMatches\(p, \{ type, angle, space, stops \}\)/)
  assert.match(src, /Use a hex like #2F6BFF/)
})
