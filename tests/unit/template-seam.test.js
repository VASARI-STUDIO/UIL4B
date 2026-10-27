// Templates return strings. They do not read the design, import a generator, or
// carry a raw colour of their own (roles come from the generator). Each check
// scans the template files, so adding a template that breaks a rule fails here.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = 'src/utils/exportTemplates'
const files = []
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).forEach((e) => {
  if (e.isDirectory()) walk(path.join(dir, e.name))
  else if (e.name.endsWith('.js')) files.push(path.join(dir, e.name))
})
walk(root)
const code = (f) => fs.readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

test('the template tree is found', () => assert.ok(files.length >= 5, files.join()))

test('no template imports a generator or the design readers', () => {
  for (const f of files) {
    for (const m of code(f).matchAll(/from\s*['"]([^'"]+)['"]/g)) {
      assert.doesNotMatch(m[1], /designSystemBook|brandGuidelines|uiKitExport|styleGuideExport|bookModel/, `${f} imports ${m[1]}`)
    }
  }
})

test('no template reads `design`', () => {
  for (const f of files) assert.doesNotMatch(code(f), /\bdesign\b/, f)
})

// Presentation carries the colours the deck has always had, and the golden test
// pins them byte for byte. Every other template, Specification included since its
// colours moved to roles, carries no raw hex: its colours are roles the generator
// hands it.
test('new templates carry no raw hex colour', () => {
  const pinned = new Set()
  for (const f of files.filter((x) => !pinned.has(path.basename(x)))) {
    assert.doesNotMatch(code(f), /#[0-9a-fA-F]{3,8}\b/, f)
  }
})
