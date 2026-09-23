// EVERY HAND-COPIED DARK GROUND AGREES WITH global.css.
//
// Seven contrast suites measure their tokens against a written-down list of
// the dark surface hexes, because the other theme cannot be read out of a
// mounted page. When the dark ramp moved darker on 2026-09-23 every one of them
// stayed GREEN on the old values — they were measuring grounds the app no
// longer paints, which is a vacuous pass wearing a real test's name. This file
// is the tripwire for the next move: change a dark --bg-* in global.css and
// each copy that did not follow it goes red here, by name.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8')
const css = read('src/styles/global.css')

function darkToken(name) {
  const at = css.indexOf('[data-theme="dark"]{--bg-0:')
  assert.ok(at !== -1, 'global.css no longer opens its dark block with --bg-0 — this reader is blind')
  const block = css.slice(at, css.indexOf('}', at))
  const m = new RegExp(`${name}:(#[0-9A-Fa-f]{6})`).exec(block)
  assert.ok(m, `${name} is not a plain hex in the dark block`)
  return m[1].toUpperCase()
}

const LEVELS = ['--bg-0', '--bg-1', '--bg-2', '--bg-3']
const MIRRORS = {
  'tests/unit/category-hue-contrast.test.js': LEVELS,
  'tests/unit/prefers-contrast.test.js': LEVELS,
  'tests/unit/state-token-contrast.test.js': LEVELS,
  'tests/user-sim/45-prefers-contrast.spec.js': LEVELS,
  'tests/unit/flair-tone-contrast.test.js': ['--bg-0', '--bg-2', '--bg-3'],
  'tests/unit/semantic-roles.test.js': ['--bg-0', '--bg-1', '--bg-2'],
  'index.html': ['--bg-0'],
}

test('the dark ramp is readable (positive control)', () => {
  const values = LEVELS.map(darkToken)
  assert.equal(new Set(values).size, 4, `the four dark levels are not four values: ${values}`)
})

for (const [file, names] of Object.entries(MIRRORS)) {
  test(`${file} measures against the dark grounds global.css actually paints`, () => {
    const src = read(file).toUpperCase()
    for (const name of names) {
      const hex = darkToken(name)
      assert.ok(src.includes(hex),
        `${file} does not carry the dark ${name} (${hex}) — it is measuring a ground the app no longer paints`)
    }
  })
}
