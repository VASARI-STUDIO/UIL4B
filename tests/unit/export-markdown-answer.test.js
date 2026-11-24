// A style guide in Markdown comes back from the export route as text/markdown with a Content-Disposition name. The client saves it
// under that name; before this it fell through to the JSON print branch and showed "That file didn't build".
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { requestThemeExport, fileNameFrom } from '../../src/utils/exportThemeRequest.js'

const md = '# Lumen style guide\n\n## Colour\n'
const ok = (headers, text = md) => ({
  ok: true, status: 200, headers: { get: (k) => headers[k] ?? null },
  json: async () => { throw new Error('not json') }, blob: async () => new Blob([text], { type: headers['Content-Type'] || '' }),
})
const auth = { auth: { currentUser: { getIdToken: async () => 'tok' } } }
const ask = (res) => requestThemeExport({ theme: '27-swissfield', row: 'guide', format: 'md', design: {}, projectName: 'Lumen' }, { loadAuth: async () => auth, fetchImpl: async () => res })

test('a text/markdown answer is saved under the server\'s file name', async () => {
  const got = await ask(ok({ 'Content-Type': 'text/markdown; charset=utf-8', 'Content-Disposition': 'attachment; filename="lumen-style-guide-27-swissfield.md"' }))
  assert.equal(got.status, 'ok')
  assert.equal(got.name, 'lumen-style-guide-27-swissfield.md')
  assert.ok(got.file instanceof Blob)
  assert.equal(await got.file.text(), md)
  assert.match(got.file.type, /^text\/markdown/)
  assert.equal(got.zip, undefined)
})

test('a markdown answer with no usable name, or an empty body, is a build failure', async () => {
  const type = { 'Content-Type': 'text/markdown; charset=utf-8' }
  for (const cd of [null, 'attachment; filename="../x.md"', 'attachment; filename="x.zip"', 'attachment; filename="Lumen Guide.md"']) {
    assert.equal((await ask(ok({ ...type, 'Content-Disposition': cd }))).code, 'build-failed', String(cd))
  }
  assert.equal((await ask(ok({ ...type, 'Content-Disposition': 'attachment; filename="lumen-style-guide-27-swissfield.md"' }, ''))).code, 'build-failed')
})

test('the name check takes only a plain name with the expected extension', () => {
  assert.equal(fileNameFrom('attachment; filename="a-b.md"', 'md'), 'a-b.md')
  assert.equal(fileNameFrom('attachment; filename="a-b.md"', 'zip'), '')
  assert.equal(fileNameFrom('attachment; filename="a-b.zip"', 'zip'), 'a-b.zip')
  assert.equal(fileNameFrom('attachment; filename="-a.md"', 'md'), '')
  assert.equal(fileNameFrom('', 'md'), '')
})
