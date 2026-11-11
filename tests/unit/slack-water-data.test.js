// Slack Water's data: the crossing's clock and place names, the email check the
// Subscribe sheet reports from, the States menu entry, and the colours the scene
// works out per palette. Plain data, no DOM.
import test from 'node:test'
import assert from 'node:assert/strict'
import { contrastRatio } from '../../src/utils/colors.js'
import { derivePaletteRoles } from '../../src/utils/palettePreviewRoles.js'
import { statesOf } from '../../src/data/previewStates.js'
import { CROSSING, MAP, PANELS, clockAt, emailProblem, slackVars, whereAt } from '../../src/components/palette/examples/SlackWater.data.js'

test('the crossing runs from 7:12 to 7:42 and the ferry rests where the picture shows it', () => {
  assert.equal(clockAt(0), '7:12 am')
  assert.equal(clockAt(1), '7:42 am')
  assert.equal(clockAt(2), '7:42 am', 'past the end is held at the end')
  assert.ok(CROSSING.rest > 0 && CROSSING.rest < 1)
})

test('the readout names a wharf at each end and the nearest place between', () => {
  assert.match(whereAt(0), /Circular Quay/)
  assert.match(whereAt(1), /Manly/)
  assert.equal(whereAt(0.22), 'Off Fort Denison')
  assert.equal(whereAt(0.55), 'Off Bradleys Head')
})

test('the map has two wharves, each place sits inside the drawing, and the route starts and ends at a wharf', () => {
  const wharves = MAP.places.filter((p) => p.wharf)
  assert.deepEqual(wharves.map((p) => p.name), ['Circular Quay', 'Manly'])
  for (const p of MAP.places) assert.ok(p.x > 0 && p.x < MAP.box.w && p.y > 0 && p.y < MAP.box.h, p.name)
  assert.ok(MAP.route.startsWith(`M${wharves[0].x} ${wharves[0].y}`))
  assert.ok(MAP.route.endsWith(`${wharves[1].x} ${wharves[1].y}`))
})

test('the email error stays true as the address is typed', () => {
  for (const bad of ['', 'ana', 'ana@', 'ana.whitlock@', 'ana@domain', 'a b@c.com']) assert.equal(emailProblem(bad), true, bad)
  for (const ok of ['ana@domain.com.au', ' ana.w@mail.org ']) assert.equal(emailProblem(ok), false, ok)
})

test('the State menu has the article first, then the sheet and its error', () => {
  assert.deepEqual(statesOf('editorial').map((s) => s.id), ['article', 'subscribe', 'error'])
})

test('every panel has a current row, and the Subscribe label reads on the primary in light and dark', () => {
  for (const [name, p] of Object.entries(PANELS)) assert.equal(p.rows.filter((r) => r.on).length, name === 'Issues' || name === 'Ferries' || name === 'Tides' ? 1 : 0, name)
  for (const mode of ['light', 'dark']) {
    for (const pal of [['#1f6f78', '#e0a458', '#c8553d', '#dcebe8', '#0f3b40'], ['#ffffff', '#f4f4f4', '#eeeeee', '#fafafa', '#e8e8e8'], ['#101010', '#202020', '#303030', '#181818', '#0a0a0a']]) {
      const r = derivePaletteRoles(pal, { mode })
      const v = slackVars(r)
      assert.ok(contrastRatio(v['--sw-ink'], r.primary) >= 4.5, `${mode} ${pal[0]}: Subscribe label ${v['--sw-ink']} on ${r.primary}`)
      assert.ok(contrastRatio(v['--sw-sub-ink'], r.subtle) >= 4.5, `${mode} ${pal[0]}: current row ink on the subtle`)
    }
  }
})
