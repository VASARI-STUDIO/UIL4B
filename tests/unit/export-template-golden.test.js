// The default template's documents must not change when the layouts move into
// template modules: every sample project's book, guidelines and kit (Free and
// Pro) is compared with the fingerprint captured from the code before the move.
// To see it fail, change one character of a CSS value in
// src/utils/exportTemplates/book/specification.js; the first differing line is reported.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { renderAll } from '../helpers/export-golden.js'
import { fingerprint, firstDifference } from '../helpers/export-samples.js'

const golden = JSON.parse(fs.readFileSync('tests/fixtures/export-templates-golden.json', 'utf8'))
const check = (docs) => {
  for (const [key, stored] of Object.entries(golden)) {
    const text = docs[key]
    assert.equal(typeof text, 'string', `${key} was not rendered`)
    assert.equal(fingerprint(text).sha256, stored.sha256, `${key} changed; first differing line ${firstDifference(text, stored)}`)
  }
}

test('no template chosen: every default document is byte-identical to the captured one', () => {
  assert.equal(Object.keys(golden).length, 16)
  check(renderAll())
})

test('naming the default template is the same as naming none', () => {
  check(renderAll({ options: { book: { template: 'specification' }, guidelines: { template: 'presentation' } } }))
})

test('an unknown template id falls back to the default layout, never to the request', () => {
  check(renderAll({ options: { book: { template: '__proto__' }, guidelines: { template: 'constructor' } } }))
})
