// Which rows each export theme has, held against a hard-coded snapshot of the table as it stood before `extraRows` existed.
//
//  1. NO THEME LOSES OR GAINS A ROW: every theme's row set equals the snapshot below (27 Swiss Field is slides + guide; 24 Standards Plate has every row and opts in to guide).
//     Break: add 'guide' to a theme's extraRows without updating the snapshot, or drop a theme from the table.
//  2. extraRows OPTS IN WITHOUT RESTATING ROWS: an entry with no rows list and extraRows ['guide'] has guide and every other row; a rows list wins.
//     Break: make entryHasRow in src/data/exportThemes.js ignore extraRows, or let extraRows add to a rows list.
import test from 'node:test'
import assert from 'node:assert/strict'
import { EXPORT_THEMES, THEME_ROW_FORMATS, entryHasRow, themeHasRow } from '../../src/data/exportThemes.js'

const ALL = ['ui-kit', 'book', 'slides']
const SNAPSHOT = {
  '01-presentation': ALL, '02-poster': ALL, '03-broadsheet': ALL, '04-standards': ALL, '05-specimen': ALL,
  '06-studio': ALL, '07-spec': ALL, '08-monograph': ALL, '09-blueprint': ALL, '10-inuse': ALL,
  '21-presentation': ALL, '22-ticket': ALL, '23-broadsheet': ALL, '24-standards': [...ALL, 'guide'], '26-notebook': ALL,
  '28-riso': ALL, '29-blueprint': ALL, '30-fluted': ALL, '31-contact': ALL, '32-dieline': ALL,
  '25-label': ['slides'],
  '27-swissfield': ['slides', 'guide'],
}

test('no theme loses or gains a row against the snapshot of today', () => {
  assert.deepEqual(EXPORT_THEMES.map((t) => t.id).sort(), Object.keys(SNAPSHOT).sort(), 'the table and the snapshot name the same themes')
  for (const { id } of EXPORT_THEMES) {
    const has = Object.keys(THEME_ROW_FORMATS).filter((row) => themeHasRow(id, row)).sort()
    assert.deepEqual(has, [...SNAPSHOT[id]].sort(), id)
  }
})

test('extraRows opts a theme in without restating its rows, and a rows list is final', () => {
  assert.equal(entryHasRow({ id: 'x' }, 'guide'), false)
  assert.deepEqual(Object.keys(THEME_ROW_FORMATS).filter((r) => entryHasRow({ id: 'x', extraRows: ['guide'] }, r)).sort(), ['book', 'guide', 'slides', 'ui-kit'])
  assert.equal(entryHasRow({ id: 'x', extraRows: ['guide'] }, 'ui-kit'), true)
  assert.equal(entryHasRow({ id: 'x', rows: ['slides'], extraRows: ['guide'] }, 'guide'), false)
  assert.equal(entryHasRow({ id: 'x', rows: ['slides'] }, 'book'), false)
})
