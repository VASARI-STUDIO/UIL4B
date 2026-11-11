// A project's saved colours: the add and duplicate rule, and the order the
// project picker offers.
//
// MUTATIONS (each turns the tests named red):
//   addSavedColour compares the raw strings, not normalised hexes -> "#abc and #AABBCC are one colour"
//   addSavedColour always appends                                 -> "a colour already there is not added twice"
//   addSavedColour stores the hex as typed                        -> "the hex is stored as #RRGGBB"
//   savedColoursOf keeps entries that are not colours             -> "entries that are not colours are dropped"
//   projectChoices sorts oldest first                             -> "newest first"
//   projectChoices does not pin the current project               -> "the project the design came from comes first"
//   projectChoices keeps archived projects                        -> "archived projects are left out"
import test from 'node:test'
import assert from 'node:assert/strict'
import { addSavedColour, hasSavedColour, projectChoices, savedColoursOf } from '../../src/utils/savedColours.js'

const AT = '2026-11-01T09:00:00.000Z'

test('a colour is added with its hex, time and name', () => {
  const out = addSavedColour([], '#0051ff', { name: 'Electric blue', at: AT })
  assert.equal(out.added, true)
  assert.deepEqual(out.list, [{ hex: '#0051FF', at: AT, name: 'Electric blue' }])
})

test('the hex is stored as #RRGGBB', () => {
  assert.equal(addSavedColour([], '0051ff').hex, '#0051FF')
  assert.equal(addSavedColour([], '#abc').hex, '#AABBCC')
})

test('a name that is empty or missing is left off', () => {
  assert.deepEqual(addSavedColour([], '#0051FF', { name: '  ', at: AT }).list, [{ hex: '#0051FF', at: AT }])
  assert.deepEqual(addSavedColour([], '#0051FF', { at: AT }).list, [{ hex: '#0051FF', at: AT }])
})

test('a colour already there is not added twice', () => {
  const first = addSavedColour([], '#0051FF', { at: AT })
  const again = addSavedColour(first.list, '#0051FF', { at: '2026-11-02T09:00:00.000Z' })
  assert.equal(again.added, false)
  assert.equal(again.list, first.list, 'the same array comes back, so nothing is rewritten')
  assert.equal(again.list.length, 1)
})

test('#abc and #AABBCC are one colour', () => {
  const first = addSavedColour([], '#aabbcc', { at: AT })
  assert.equal(addSavedColour(first.list, '#ABC').added, false)
  assert.equal(addSavedColour(first.list, '#abcdef').added, true)
})

test('the list it was given is not changed', () => {
  const list = [{ hex: '#0051FF', at: AT }]
  const out = addSavedColour(list, '#FF0000', { at: AT })
  assert.equal(list.length, 1)
  assert.equal(out.list.length, 2)
  assert.notEqual(out.list, list)
})

test('something that is not a colour is refused', () => {
  for (const bad of ['', 'red', '#12', '#GGGGGG', null, undefined, 42]) {
    const out = addSavedColour([{ hex: '#0051FF', at: AT }], bad)
    assert.equal(out.added, false, String(bad))
    assert.equal(out.hex, null, String(bad))
    assert.equal(out.list.length, 1, String(bad))
  }
})

test('a project with no list starts one', () => {
  assert.equal(addSavedColour(undefined, '#0051FF', { at: AT }).list.length, 1)
  assert.equal(addSavedColour('not a list', '#0051FF', { at: AT }).list.length, 1)
})

test('entries that are not colours are dropped', () => {
  const project = { savedColors: [{ hex: '#0051FF', at: AT }, { hex: 'nope' }, null, { at: AT }] }
  assert.deepEqual(savedColoursOf(project), [{ hex: '#0051FF', at: AT }])
  assert.deepEqual(savedColoursOf({}), [])
  assert.deepEqual(savedColoursOf(null), [])
})

test('hasSavedColour compares colours, not strings', () => {
  const project = { savedColors: [{ hex: '#AABBCC', at: AT }] }
  assert.equal(hasSavedColour(project, '#abc'), true)
  assert.equal(hasSavedColour(project, '#000000'), false)
  assert.equal(hasSavedColour(project, 'nope'), false)
  assert.equal(hasSavedColour({}, '#AABBCC'), false)
})

const project = (id, updatedAt, extra) => ({ id, name: id, updatedAt, createdAt: '2026-01-01T00:00:00.000Z', ...extra })

test('projects are offered newest first', () => {
  const out = projectChoices([
    project('old', '2026-02-01T00:00:00.000Z'),
    project('new', '2026-09-01T00:00:00.000Z'),
    project('mid', '2026-05-01T00:00:00.000Z'),
  ])
  assert.deepEqual(out.map((p) => p.id), ['new', 'mid', 'old'])
})

test('the project the design came from comes first', () => {
  const out = projectChoices([
    project('old', '2026-02-01T00:00:00.000Z'),
    project('new', '2026-09-01T00:00:00.000Z'),
  ], 'old')
  assert.deepEqual(out.map((p) => p.id), ['old', 'new'])
})

test('a current project that no longer exists changes nothing', () => {
  const out = projectChoices([project('a', '2026-02-01T00:00:00.000Z'), project('b', '2026-03-01T00:00:00.000Z')], 'gone')
  assert.deepEqual(out.map((p) => p.id), ['b', 'a'])
})

test('archived projects are left out, unless the design came from one', () => {
  const list = [project('a', '2026-02-01T00:00:00.000Z', { archived: true }), project('b', '2026-03-01T00:00:00.000Z')]
  assert.deepEqual(projectChoices(list).map((p) => p.id), ['b'])
  assert.deepEqual(projectChoices(list, 'a').map((p) => p.id), ['a', 'b'])
})

test('the projects given are not reordered in place', () => {
  const list = [project('old', '2026-02-01T00:00:00.000Z'), project('new', '2026-09-01T00:00:00.000Z')]
  projectChoices(list)
  assert.deepEqual(list.map((p) => p.id), ['old', 'new'])
})

test('no projects is an empty list', () => {
  assert.deepEqual(projectChoices(undefined), [])
  assert.deepEqual(projectChoices([]), [])
})
