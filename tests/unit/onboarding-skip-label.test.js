// The skip link on /onboarding names where it goes. A sign-up that started in
// a tool (the stashed resume target is a tool route) says "Not now, back to
// <tool>" and goes back there; a checkout target keeps its own words; anything
// else falls back to the projects wording.
//
// Onboarding.jsx is JSX, so it cannot be imported here. The helpers are cut out
// of the real source and run with the real isLocalPath and routeLabel, which
// keeps this test on the shipped code.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { isLocalPath } from '../../src/utils/localPath.js'
import { routeLabel } from '../../src/data/toolTree.js'

const src = fs.readFileSync(path.join(process.cwd(), 'src/pages/Onboarding.jsx'), 'utf8')

function cut(re, name) {
  const m = src.match(re)
  assert.ok(m, `${name} was not found in Onboarding.jsx; update this test with the refactor`)
  return m[0].replace(/^export /, '')
}

const body = [
  cut(/const L6 = .*\r?\n/, 'L6'),
  cut(/const L6_CHECKOUT = .*\r?\n/, 'L6_CHECKOUT'),
  cut(/const isCheckoutTarget = .*\r?\n/, 'isCheckoutTarget'),
  cut(/export const resumeToolName = [\s\S]*?\r?\n\)\r?\n/, 'resumeToolName'),
  cut(/export const skipLabel = [\s\S]*?\r?\n\}\r?\n/, 'skipLabel'),
].join('\n')

const { resumeToolName, skipLabel, L6, L6_CHECKOUT } = new Function('isLocalPath', 'routeLabel',
  `${body}\nreturn { resumeToolName, skipLabel, L6, L6_CHECKOUT }`)(isLocalPath, routeLabel)

test('a tool target names the tool, query and hash ignored', () => {
  assert.equal(resumeToolName('/create/palette'), 'Palette')
  assert.equal(resumeToolName('/create/palette?c=14224A'), 'Palette')
  assert.equal(resumeToolName('/create/type-scale#preview'), 'Type Scale')
  assert.equal(skipLabel('/create/palette?c=14224A'), 'Not now, back to Palette')
  assert.equal(skipLabel('/create/type-scale'), 'Not now, back to Type Scale')
})

test('a checkout target keeps the checkout words and is never a tool', () => {
  for (const t of ['/checkout', '/checkout?plan=pro']) {
    assert.equal(resumeToolName(t), null)
    assert.equal(skipLabel(t), L6_CHECKOUT)
  }
})

test('no target, a non-tool page or a foreign value falls back to the projects words', () => {
  for (const t of [null, undefined, '', '/projects', '/nope', '//evil.example/create/palette', 'https://evil.example/create/palette', 'javascript:alert(1)']) {
    assert.equal(resumeToolName(t), null, String(t))
    assert.equal(skipLabel(t), L6, String(t))
  }
})
