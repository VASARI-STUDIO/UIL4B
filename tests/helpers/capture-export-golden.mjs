// Writes tests/fixtures/export-templates-golden.json: a fingerprint of every
// default-template document for every sample project. Run it only when a change
// to a default template's output is intended, and review the diff of the
// fixture with the change.
//   node tests/helpers/capture-export-golden.mjs
import fs from 'node:fs'
import { renderAll } from './export-golden.js'
import { fingerprint } from './export-samples.js'

const docs = renderAll()
const golden = {}
for (const key of Object.keys(docs).sort()) golden[key] = fingerprint(docs[key])
fs.mkdirSync('tests/fixtures', { recursive: true })
fs.writeFileSync('tests/fixtures/export-templates-golden.json', `${JSON.stringify(golden, null, 1)}\n`)
console.log(`${Object.keys(golden).length} documents fingerprinted`)
