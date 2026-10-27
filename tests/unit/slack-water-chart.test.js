// Slack Water's chart: no wharf label sits on land, covers the route or another
// label, or is cut in half by the crop, in any of the three layouts, at the
// narrowest and widest field each one meets. The geometry is in
// tests/helpers/slack-water-geometry.js; the numbers are in SlackWater.data.js.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { problems } from '../helpers/slack-water-geometry.js'
import { FERRY, LAND, ROUTE, WHARVES, WINDOWS } from '../../src/components/palette/examples/SlackWater.data.js'

const widths = ({ fields: [a, b] }) => [a, (a + b) / 2, b]

function all(wharves) {
  const out = []
  for (const [name, win] of Object.entries(WINDOWS)) {
    for (const field of widths(win)) out.push(...problems({ wharves, land: LAND, route: ROUTE, ferry: FERRY, name, win, field }))
  }
  return out
}

test('every wharf label is clear of land, route, ferry, caption and each other, in all three layouts', () => {
  assert.deepEqual([...new Set(all(WHARVES))], [])
})

test('the checker can see a fault: a label moved onto the headland is reported as on land', () => {
  const moved = WHARVES.map((w) => (w.name === 'Watsons Bay' ? { ...w, side: 'below', gap: 0 } : w))
  assert.ok(all(moved).some((l) => /Watsons Bay.*sits on land/.test(l)))
})

test('the checker can see a fault: a window that cuts a label is reported', () => {
  const cut = { ...WINDOWS.narrow, x0: WINDOWS.narrow.x0 + 40 }
  const found = problems({
    wharves: WHARVES, land: LAND, route: ROUTE, ferry: FERRY, name: 'narrow', win: cut, field: 358,
  })
  assert.ok(found.some((l) => /cut by the edge|still in it/.test(l)), found.join('\n'))
})

test('the CSS carries the same three windows as the data, in wide, mid, narrow order', () => {
  const css = fs.readFileSync(path.join(process.cwd(), 'src/components/palette/examples/SlackWater.css'), 'utf8')
  const found = [...css.matchAll(/--sw-wu:(-?\d+);--sw-x0:(-?\d+);--sw-yc:(-?\d+)/g)].map((m) => m.slice(1).map(Number))
  const want = ['wide', 'mid', 'narrow'].map((k) => [WINDOWS[k].w, WINDOWS[k].x0, WINDOWS[k].yc])
  assert.deepEqual(found, want)
})

test('there are six wharves, each named once, and the ferry is on the chart', () => {
  assert.equal(WHARVES.length, 6)
  assert.equal(new Set(WHARVES.map((w) => w.name)).size, 6)
  assert.ok(FERRY.x > 0 && FERRY.x < 480 && FERRY.y > 0 && FERRY.y < 360)
})
