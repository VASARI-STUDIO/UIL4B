// The name an export carries comes from one place (src/utils/projectFileName.js), and the project's name is on the project record.
//   1. THE OPEN PROJECT'S ID: the dialog on a project page is handed one.            Break: ignore `projectId`.
//   2. A TOOL PAGE: no id is handed over, but the design knows its project
//      (design.source.projectId), and so does the working design when the tool
//      supplies a design of its own.                                                  Break: drop the `source` reads.
//   3. NO PROJECT: the design's own name, else ''; never a stand-in.                  Break: return 'Design System' for ''.
//   4. THE PREVIEW AND THE DOWNLOAD PRINT ONE NAME: the style guide and code-file preview (ExportFreePreview), the runner (download and
//      copy) and the dialog all read documentProjectName(exportProjectName(...)); none keeps a `|| 'Design System'` of its own.
//                                                                                     Break: put `design?.name || 'Design System'` back in ExportFreePreview.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { documentProjectName, exportProjectName } from '../../src/utils/projectFileName.js'

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

// The name a document prints is the one the runner writes into the download. The preview is a React component (it imports css, so node
// cannot load it); what is pinned is its source, and the helper both sides call.
const read = (file) => fs.readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8')

test('the stand-in for an unnamed project is spelled out once, in the helper', () => {
  assert.equal(documentProjectName(exportProjectName({ projects, projectId: 'k1' })), 'Kerbside')
  assert.equal(documentProjectName(exportProjectName({ projects, design: {} })), 'Design System')
  assert.equal(documentProjectName(undefined), 'Design System')
  for (const file of ['src/components/export/ExportFreePreview.jsx', 'src/components/export/ExportDialog.jsx', 'src/hooks/useExportRunner.js', 'src/components/export/ExportPreview.jsx']) {
    assert.doesNotMatch(read(file), /\|\|\s*'Design System'/, `${file} keeps its own stand-in`)
  }
})

test("the style guide and code-file preview head the page with the project's name, as the download does", () => {
  const preview = read('src/components/export/ExportFreePreview.jsx')
  assert.match(preview, /const projectName = documentProjectName\(project \|\| exportProjectName\(\{ design \}\)\)/)
  assert.doesNotMatch(preview, /design\?\.name \|\| /, "design.name is not a field the studio writes; the project's name is")
  // The runner's download and its clipboard copy read the name the same way.
  const runner = read('src/hooks/useExportRunner.js')
  assert.match(runner, /const projectName = documentProjectName\(fileProject\)/)
  assert.match(runner, /const projectName = documentProjectName\(exportProjectName\(\{ projects, projectId, design, working \}\)\)/)
})
