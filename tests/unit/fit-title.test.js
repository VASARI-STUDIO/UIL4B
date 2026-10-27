// fitTitle picks a cover-title size from a template's steps. To see these fail,
// change the 0.52 default advance in src/utils/exportTemplates/shared.js to 0.2:
// the long names then "fit" at the largest step and the clamp case goes quiet.
import test from 'node:test'
import assert from 'node:assert/strict'
import { fitTitle, safeHex, chromeFace } from '../../src/utils/exportTemplates/shared.js'

const NAMES = [
  'Ink',
  'Harbour & Co',
  'Northside Community Legal Centre',
  'Lorem '.repeat(20).trim().slice(0, 119) + 'x',
  'A'.repeat(40),
]
// Each book template's steps (pt), measure (pt) and line limit.
const TEMPLATES = {
  specification: { steps: [52, 40, 30], maxLines: 3, measure: 425 },
  monograph: { steps: [40, 32, 26], maxLines: 3, measure: 312 },
  atlas: { steps: [44, 34, 26], maxLines: 3, measure: 145 },
}

test('the five test names never take more than maxLines, in every template', () => {
  assert.equal(NAMES[3].length, 120)
  for (const [id, opts] of Object.entries(TEMPLATES)) {
    for (const name of NAMES) {
      const fit = fitTitle(name, opts)
      assert.ok(fit.lines <= opts.maxLines, `${id}: "${name}" took ${fit.lines} lines`)
      assert.ok(opts.steps.includes(fit.size), `${id}: ${fit.size} is not one of its steps`)
    }
  }
})

test('a short name takes the largest step, a very long one the smallest and is clamped', () => {
  const { steps, maxLines, measure } = TEMPLATES.specification
  assert.deepEqual(fitTitle('Ink', { steps, maxLines, measure }), { size: 52, lines: 1, clamp: false, broken: false })
  const long = fitTitle(NAMES[3], { steps, maxLines, measure: 200 })
  assert.equal(long.size, 30)
  assert.equal(long.clamp, true)
})

test('a single word longer than the measure is flagged as broken', () => {
  const fit = fitTitle(NAMES[4], { steps: [52, 40, 30], maxLines: 3, measure: 200 })
  assert.equal(fit.broken, true)
  assert.equal(fitTitle('Ink', { steps: [52], maxLines: 3, measure: 425 }).broken, false)
})

test('an empty name is zero lines at the first step', () => {
  assert.deepEqual(fitTitle('', { steps: [40, 30], maxLines: 2, measure: 300 }), { size: 40, lines: 0, clamp: false, broken: false })
})

test('safeHex passes six-digit hex and refuses everything else', () => {
  assert.equal(safeHex('#1F4B8E', 'x'), '#1F4B8E')
  for (const bad of ['red', '#12345', '#12345g', 'url(x)', '#1F4B8E;color:red', null, undefined, {}]) {
    assert.equal(safeHex(bad, 'fallback'), 'fallback', String(bad))
  }
})

test('chromeFace embeds plain base64 only, and nothing for anything else', () => {
  const chrome = { family: 'Literata', weights: '200 900' }
  assert.match(chromeFace(chrome, 'AAAA'), /^@font-face\{font-family:'Literata';src:url\(data:font\/woff2;base64,AAAA\)/)
  for (const bad of ['', 'AA AA', 'AAAA")}body{x:y', 'A'.repeat(160001), null, 42]) {
    assert.equal(chromeFace(chrome, bad), '')
  }
  assert.equal(chromeFace(null, 'AAAA'), '')
})
