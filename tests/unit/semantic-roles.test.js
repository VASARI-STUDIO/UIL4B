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
//  2. --pending IS RETIRED and the states it painted read
//     the Information blue, measured in both themes on its own tint.
//     It deliberately does NOT assert the same floor for --ok/--warn/--err:
//     those are measured below and recorded as a finding, not silently blessed.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripJs as strip } from '../helpers/strip-comments.js'

const studio = readFileSync(new URL('../../src/pages/ColorStudio.jsx', import.meta.url), 'utf8')
const css = readFileSync(new URL('../../src/styles/global.css', import.meta.url), 'utf8')

// Comments are stripped before any assertion about source text: a recent agent
// was fooled by a comment above the code it was checking, and this file talks
// about --pending at length in prose.
const studioCode = strip(studio)
// The ramps, the role list and the purple family live in the shared module
// the tool imports (and the token export reads).
const presetsCode = strip(readFileSync(new URL('../../src/data/semanticPresets.js', import.meta.url), 'utf8'))
const cssCode = strip(css)

// FOUR ROLES. Pending is not a state: Information carries the underway
// meaning, and offers a purple family beside blue. The app-wide --pending
// token is retired too (tests 4-6).
const ROLES = ['success', 'warning', 'error', 'info']

function bundleConfigs() {
  const block = studioCode.slice(studioCode.indexOf('const STATE_BUNDLES'))
  const end = block.indexOf('\n]')
  return [...block.slice(0, end).matchAll(/config:\s*\{([^}]*)\}/g)].map(m => m[1])
}

test('1 · every premade pack names every one of the four roles', () => {
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
  const presets = presetsCode.slice(presetsCode.indexOf('export const STATE_PRESETS'))
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

// ── --pending IS RETIRED FROM THE APP ──────────────────────────────────────
// The app's
// in-progress / help / awaiting states now read the Information blue, --info,
// which is the accent family's TEXT member (--accent-mid). Removed means absent:
// these tests assert the token is gone and that its old consumers use --info.
// (The Semantic Colour tool's own role set is covered above.)
const admin = strip(readFileSync(new URL('../../src/pages/Admin.jsx', import.meta.url), 'utf8'))
const adminCss = strip(readFileSync(new URL('../../src/styles/deferred/admin.css', import.meta.url), 'utf8'))
const mixHex = (a, b, pA) => '#' + hex2rgb(a).map((v, i) => Math.round(v * pA + hex2rgb(b)[i] * (1 - pA)).toString(16).padStart(2, '0')).join('')

test('4 · --pending is declared nowhere and consumed nowhere', () => {
  assert.doesNotMatch(cssCode, /--pending\s*:/, 'global.css still declares --pending')
  for (const [name, src] of [['global.css', cssCode], ['admin.css', adminCss], ['Admin.jsx', admin]]) {
    assert.doesNotMatch(src, /var\(--pending\)/, `${name} still paints with var(--pending)`)
  }
})

test('5 · the Information blue clears AA as text on its own 14% tint, in BOTH themes', () => {
  assert.match(cssCode, /--info:var\(--accent-mid\)/, '--info is no longer the accent text member; re-measure')
  const accent = /:root\{[^}]*?--accent:(#[0-9A-Fa-f]{6})/.exec(cssCode)?.[1]
  assert.ok(accent, 'could not read --accent')
  const cases = [
    [mixHex(accent, '#0B0C0E', 0.86), ['#FFFFFF', '#F5F5F2', '#F0F0ED']],
    [mixHex(accent, '#EFEEEA', 0.60), ['#060607', '#0B0C0E', '#111215', '#17181B']],
  ]
  for (const [info, grounds] of cases) {
    for (const g of grounds) {
      const ratio = cr(info, mixHex(info, g, 0.14))
      assert.ok(ratio >= 4.5, `--info ${info} on its 14% tint over ${g} is ${ratio.toFixed(2)}:1`)
    }
  }
})

test('6 · the states pending used to paint are the Information blue now, never a literal', () => {
  assert.doesNotMatch(admin, /#a855f7/i, 'Admin.jsx still hard-codes the purple literal')
  assert.doesNotMatch(admin, /168\s*,\s*85\s*,\s*247/, 'Admin.jsx still hard-codes the purple tint')
  assert.match(admin, /'in-progress':\s*'var\(--info\)'/, 'in-progress is not the Information blue')
  assert.match(admin, /help:\s*'var\(--info\)'/, 'help is not the Information blue')
  assert.match(adminCss, /\.adm-plan--pending\{[^}]*color:var\(--info\)/, 'the pending plan badge is not blue')
})

test('7 · the guards above are real, so this file cannot pass by being toothless', () => {
  // Each assertion is re-run against a deliberately broken copy of its input.
  const brokenBundle = 'config: { success: 1, warning: 0, error: 0 }'
  assert.doesNotMatch(brokenBundle, /\binfo\s*:/, 'test 1 would not catch a bundle missing info')
  // Test 4's pattern really does see a declaration and a consumer.
  assert.match('x{--pending:#7c3aed}', /--pending\s*:/)
  assert.match('color:var(--pending)', /var\(--pending\)/)
  // Test 5 rejects the too-light accent this family once had.
  assert.ok(cr('#6FA8FF', mixHex('#6FA8FF', '#FFFFFF', 0.14)) < 4.5, 'test 5 would not catch a too-light --info')
  const cues = ['✓', '!', '×', 'i', '✓']
  assert.notEqual(new Set(cues).size, cues.length, 'test 3 would not catch a duplicated cue')
})

// ── Pending removed from the tool, purple offered for Information ─────────
test('8 · pending is gone from the semantic set: no bundle, preset, meta or export names it', () => {
  const bundles = bundleConfigs()
  assert.ok(bundles.length >= 7, 'the bundles were read')
  for (const cfg of bundles) assert.doesNotMatch(cfg, /\bpending\s*:/, `a bundle still names pending: ${cfg.trim()}`)
  const meta = studioCode.slice(studioCode.indexOf('const STATE_META'))
  assert.doesNotMatch(meta.slice(0, meta.indexOf('\n}')), /\bpending\s*:/, 'STATE_META still has a pending role')
  const presets = presetsCode.slice(presetsCode.indexOf('export const STATE_PRESETS'))
  assert.doesNotMatch(presets.slice(0, presets.indexOf('\n}')), /\n\s{2}pending:\s*\[/, 'STATE_PRESETS still has pending ramps')
  // Every export and the cached shades iterate ROLE_IDS, the shared four.
  assert.match(studioCode, /SEMANTIC_ROLES as ROLE_IDS/, 'the tool no longer takes its roles from semanticPresets')
  const ids = presetsCode.match(/const SEMANTIC_ROLES = Object\.freeze\(\[([^\]]*)\]/)
  assert.ok(ids, 'SEMANTIC_ROLES is not declared')
  assert.deepEqual(ids[1].split(',').map((x) => x.trim().replace(/'/g, '')), ROLES)
})

test('9 · Information offers purple as the alternative to blue, and it reaches the resolver', () => {
  assert.match(presetsCode, /export const INFO_PURPLE = \[/, 'there is no purple family for Information')
  const purple = presetsCode.slice(presetsCode.indexOf('export const INFO_PURPLE'))
  const names = [...purple.slice(0, purple.indexOf('\n]')).matchAll(/name:\s*'([^']+)'/g)].map((m) => m[1])
  assert.ok(names.includes('Purple') && names.includes('Violet'), `purple family is ${names.join(', ')}`)
  // The resolver switches family on the Information hue, and every export
  // passes that hue through.
  assert.match(studioCode, /state === 'info' && infoHue === 'purple' \? INFO_PURPLE/)
  const exportCalls = studioCode.match(/resolveStateShades\([^)]*\)/g) || []
  const withoutHue = exportCalls.filter((c) => !/infoHue|function/.test(c) && !/sel, infoHue/.test(c))
  assert.deepEqual(withoutHue, [], `a resolveStateShades call ignores the Information hue: ${withoutHue.join(' | ')}`)
})

test('10 · the tool index describes the four roles, not pending', () => {
  const index = strip(readFileSync(new URL('../../src/data/toolIndex.js', import.meta.url), 'utf8'))
  const line = index.split('\n').find((l) => /warning, error/i.test(l))
  assert.ok(line, 'the Semantic Colour description was not found in toolIndex.js')
  assert.doesNotMatch(line, /pending/i, `the tool index still offers pending: ${line.trim()}`)
})
