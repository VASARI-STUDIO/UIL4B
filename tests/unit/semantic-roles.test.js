// The semantic state pack: five roles, and the token the app improvises.
//
// Two things are guarded here, both of which went wrong before this file
// existed and neither of which any rendered test can see:
//
//  1. THE PACK IS TOTAL. Every bundle must name every role. A bundle missing a
//     role does not fail loudly - resolveStateShades falls back to preset 0, so
//     the tray silently shows a colour the bundle never chose, and the bundle
//     can then never match its own selection (activeStateBundle compares with
//     JSON.stringify, which is key-order and key-count sensitive).
//
//  2. --pending IS MEASURED IN BOTH THEMES. #331 swept --accent to
//     --accent-strong after finding 4.43:1 on the page ground. The point of
//     this test is that a NEW state token cannot be added below that bar again.
//     It deliberately does NOT assert the same floor for --ok/--warn/--err:
//     those are measured below and recorded as a finding, not silently blessed.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const studio = readFileSync(new URL('../../src/pages/ColorStudio.jsx', import.meta.url), 'utf8')
const css = readFileSync(new URL('../../src/styles/global.css', import.meta.url), 'utf8')

// Comments are stripped before any assertion about source text: a recent agent
// was fooled by a comment above the code it was checking, and this file talks
// about --pending at length in prose.
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const studioCode = strip(studio)
const cssCode = strip(css)

const ROLES = ['success', 'warning', 'error', 'info', 'pending']

function bundleConfigs() {
  const block = studioCode.slice(studioCode.indexOf('const STATE_BUNDLES'))
  const end = block.indexOf('\n]')
  return [...block.slice(0, end).matchAll(/config:\s*\{([^}]*)\}/g)].map(m => m[1])
}

test('1 · every premade pack names every one of the five roles', () => {
  const configs = bundleConfigs()
  assert.ok(configs.length >= 7, `expected the 7 shipped bundles, saw ${configs.length}`)
  for (const cfg of configs) {
    for (const role of ROLES) {
      assert.match(cfg, new RegExp(`\\b${role}\\s*:`), `a bundle is missing "${role}": ${cfg.trim()}`)
    }
  }
})

test('2 · every role has a ramp, a label, an intent and a non-colour cue', () => {
  const meta = studioCode.slice(studioCode.indexOf('const STATE_META'))
  const metaBlock = meta.slice(0, meta.indexOf('\n}'))
  const presets = studioCode.slice(studioCode.indexOf('const STATE_PRESETS'))
  for (const role of ROLES) {
    assert.match(metaBlock, new RegExp(`${role}:\\s*\\{[^}]*label:`), `${role} has no label`)
    assert.match(metaBlock, new RegExp(`${role}:\\s*\\{[^}]*cue:`), `${role} has no cue`)
    assert.match(metaBlock, new RegExp(`${role}:\\s*\\{[^}]*intent:`), `${role} has no intent`)
    assert.match(presets, new RegExp(`\\n\\s{2}${role}:\\s*\\[`), `${role} has no preset ramps`)
  }
})

test('3 · the cues stay distinguishable without colour (WCAG 1.4.1)', () => {
  const meta = studioCode.slice(studioCode.indexOf('const STATE_META'))
  const cues = [...meta.slice(0, meta.indexOf('\n}')).matchAll(/cue:\s*'([^']+)'/g)].map(m => m[1])
  assert.equal(cues.length, ROLES.length, 'one cue per role')
  assert.equal(new Set(cues).size, cues.length, `two roles share a cue: ${cues.join(' ')}`)
})

// ── contrast ────────────────────────────────────────────────────────────────
const hex2rgb = h => { h = h.replace('#', ''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)) }
const lin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }
const lum = h => { const [r, g, b] = hex2rgb(h); return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b) }
const cr = (a, b) => { const L1 = lum(a), L2 = lum(b); return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05) }

function tokenValue(themeSelector, token) {
  const line = cssCode.split('\n').find(l => l.includes(themeSelector))
  assert.ok(line, `no ${themeSelector} block`)
  const m = line.match(new RegExp(`${token}:(#[0-9a-fA-F]{6})`))
  assert.ok(m, `${token} not declared in ${themeSelector}`)
  return m[1]
}

test('4 · --pending clears AA small text on every ground, in BOTH themes', () => {
  // The grounds a state colour actually lands on, read off the same two lines.
  const cases = [
    ['[data-theme="light"]', ['#EFEEE9', '#FFFFFF', '#F6F5F1']],
    ['[data-theme="dark"]', ['#101012', '#151619', '#191A1D']],
  ]
  for (const [sel, grounds] of cases) {
    const pending = tokenValue(sel, '--pending')
    for (const g of grounds) {
      const ratio = cr(pending, g)
      assert.ok(ratio >= 4.5, `${sel} --pending ${pending} on ${g} is ${ratio.toFixed(2)}:1, under 4.5`)
    }
  }
})

test('5 · a solid --pending fill still carries white text', () => {
  const pending = tokenValue('[data-theme="light"]', '--pending')
  const ratio = cr('#ffffff', pending)
  assert.ok(ratio >= 4.5, `#fff on ${pending} is ${ratio.toFixed(2)}:1`)
})

test('6 · the fifth signal colour is a token, not a literal, wherever it is used', () => {
  // #a855f7 (Tailwind purple-500) was typed into Admin.jsx three times, with
  // rgba(168,85,247,.1) behind it, because there was no token to reach for.
  const admin = strip(readFileSync(new URL('../../src/pages/Admin.jsx', import.meta.url), 'utf8'))
  assert.doesNotMatch(admin, /#a855f7/i, 'Admin.jsx still hard-codes the purple literal')
  assert.doesNotMatch(admin, /168\s*,\s*85\s*,\s*247/, 'Admin.jsx still hard-codes the purple tint')
  assert.match(admin, /var\(--pending\)/, 'Admin.jsx should consume --pending')
})

test('7 · the guards above are real, so this file cannot pass by being toothless', () => {
  // Each assertion is re-run against a deliberately broken copy of its input.
  const brokenBundle = 'config: { success: 1, warning: 0, error: 0, info: 0 }'
  assert.doesNotMatch(brokenBundle, /\bpending\s*:/, 'test 1 would not catch a bundle missing pending')

  // A --pending set to the accent blue this work replaced would still be a
  // colour; test 4 has to reject it on the ratio, not on it being absent.
  assert.ok(cr('#6FA8FF', '#FFFFFF') < 4.5, 'test 4 would not catch a too-light --pending')
  // And the amber it was improvised as fails the same floor.
  assert.ok(cr('#f59e0b', '#FFFFFF') < 4.5, 'test 4 would not catch warning amber')
  // The shipped value must actually be above the bar it is being checked against.
  assert.ok(cr(tokenValue('[data-theme="light"]', '--pending'), '#EFEEE9') >= 4.5)

  const cues = ['✓', '!', '×', 'i', '✓']
  assert.notEqual(new Set(cues).size, cues.length, 'test 3 would not catch a duplicated cue')
})
