// The name an export carries comes from one place (src/utils/exportProjectName.js), and the project's name is on the project record.
//   1. THE OPEN PROJECT'S ID: the dialog on a project page is handed one.            Break: ignore `projectId`.
//   2. A TOOL PAGE: no id is handed over, but the design knows its project
//      (design.source.projectId), and so does the working design when the tool
//      supplies a design of its own.                                                  Break: drop the `source` reads.
//   3. NO PROJECT: the design's own name, else ''; never a stand-in.                  Break: return 'Design System' for ''.
import test from 'node:test'
import assert from 'node:assert/strict'
import { exportProjectName } from '../../src/utils/exportProjectName.js'

const projects = [{ id: 'k1', name: 'Kerbside' }, { id: 'h2', name: 'Harbour' }]

test('the id the dialog was handed wins', () => {
  assert.equal(exportProjectName({ projects, projectId: 'h2', design: { source: { projectId: 'k1' } } }), 'Harbour')
})

test("from a tool page the design's own source finds the project", () => {
  assert.equal(exportProjectName({ projects, design: { source: { projectId: 'k1' } } }), 'Kerbside')
})

test("a tool's own design with no source falls to the working design's", () => {
  assert.equal(exportProjectName({ projects, design: { palette: {} }, working: { source: { projectId: 'k1' } } }), 'Kerbside')
})

test('numeric and string ids meet', () => {
  assert.equal(exportProjectName({ projects: [{ id: 7, name: 'Seven' }], projectId: '7' }), 'Seven')
})

test("no project: the design's own name, else an empty string and never a stand-in", () => {
  assert.equal(exportProjectName({ projects, design: { name: 'Draft' } }), 'Draft')
  assert.equal(exportProjectName({ projects, design: {} }), '')
  assert.equal(exportProjectName({}), '')
  assert.equal(exportProjectName({ projects: null, projectId: 'k1' }), '')
})

test('a project that is gone is not a name', () => {
  assert.equal(exportProjectName({ projects, design: { source: { projectId: 'gone' } } }), '')
})
