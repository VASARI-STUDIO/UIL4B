// scripts/check-no-test-session.mjs is the last step of `npm run build`. It must
// exit non-zero for an output folder holding any fingerprint of the signed-in
// test session, and zero for a clean one. tests/unit/test-session-not-in-production
// proves the fingerprints are the right ones; this proves the step acts on them.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { FINGERPRINTS, outDirFrom } from '../../scripts/check-no-test-session.mjs'

const ROOT = process.cwd()
const SCRIPT = path.join(ROOT, 'scripts', 'check-no-test-session.mjs')

const made = []
function outputFolder(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'uil4b-session-scan-'))
  made.push(dir)
  for (const [name, body] of Object.entries(files)) {
    const file = path.join(dir, name)
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, body)
  }
  return dir
}
test.after(() => {
  for (const d of made) fs.rmSync(d, { recursive: true, force: true })
})

const run = (...args) => spawnSync(process.execPath, [SCRIPT, ...args], { cwd: ROOT, encoding: 'utf8' })

test('a clean output folder passes', () => {
  const dir = outputFolder({ 'index.html': '<!doctype html><title>UIL4B</title>', 'assets/app.js': 'console.log("hi")' })
  const r = run('--out', dir)
  assert.equal(r.status, 0, r.stderr)
  assert.match(r.stdout, /clean/)
})

test('every fingerprint fails the build, wherever in the output it sits', () => {
  assert.ok(FINGERPRINTS.length >= 3, 'the fingerprint list was emptied')
  for (const marker of FINGERPRINTS) {
    const dir = outputFolder({
      'index.html': '<!doctype html>',
      'assets/deep/chunk-abc.js': `var a=1;window["${marker}"]=2;`,
    })
    const r = run('--out', dir)
    assert.equal(r.status, 1, `"${marker}" in a chunk did not fail the build`)
    assert.ok(r.stderr.includes(marker), 'the failure must name the fingerprint')
    assert.ok(r.stderr.includes('chunk-abc.js'), 'the failure must name the file')
  }
})

test('a fingerprint in a source map or an html shell fails too', () => {
  for (const file of ['assets/app.js.map', 'about/index.html']) {
    const dir = outputFolder({ 'index.html': '<!doctype html>', [file]: `x ${FINGERPRINTS[0]} y` })
    assert.equal(run('--out', dir).status, 1, file)
  }
})

test('a missing or empty output folder fails rather than reporting clean', () => {
  const empty = outputFolder({})
  assert.equal(run('--out', empty).status, 1, 'an empty folder passed')
  assert.equal(run('--out', path.join(empty, 'nope')).status, 1, 'a missing folder passed')
})

test('--out takes the folder after it or after =, and defaults to dist', () => {
  assert.equal(outDirFrom([]), 'dist')
  assert.equal(outDirFrom(['--out', 'dist-lane']), 'dist-lane')
  assert.equal(outDirFrom(['--out=dist-lane']), 'dist-lane')
  assert.throws(() => outDirFrom(['--out']), /needs a folder/)
  assert.equal(run('--out').status, 2, '--out with no folder must be an error, not a scan of dist')
})

test('npm run build ends with this check', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'))
  const steps = pkg.scripts.build.split('&&').map((s) => s.trim())
  assert.equal(steps[0], 'vite build')
  assert.equal(steps.at(-1), 'node scripts/check-no-test-session.mjs')
  assert.ok(steps.indexOf('node scripts/prerender.mjs') < steps.length - 1, 'the check must run after the prerender writes into dist')
})
