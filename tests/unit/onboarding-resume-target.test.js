// takeResumeTarget (src/pages/Onboarding.jsx) reads the destination stashed
// before sign-up and hands it to navigate(). The writer checks it with
// isLocalPath; the read checks it again, so a value that is not a path on this
// origin is dropped as if nothing had been stored.
//
// Onboarding.jsx is JSX, so it cannot be imported here. The function is cut out
// of the real source and run against a fake sessionStorage with the real
// isLocalPath, which keeps this test on the shipped code.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { isLocalPath } from '../../src/utils/localPath.js'

const src = fs.readFileSync(path.join(process.cwd(), 'src/pages/Onboarding.jsx'), 'utf8')

function load(stored, { throws = false } = {}) {
  const match = src.match(/const takeResumeTarget = \(\) => \{[\s\S]*?\r?\n {2}\}\r?\n/)
  assert.ok(match, 'takeResumeTarget was not found in Onboarding.jsx; update this test with the refactor')
  const RESUME_KEY = 'vs-resume-after-onboarding'
  const calls = { removed: [] }
  const sessionStorage = {
    getItem: (k) => { if (throws) throw new Error('storage blocked'); return k === RESUME_KEY ? stored : null },
    removeItem: (k) => { calls.removed.push(k) },
  }
  const take = new Function('sessionStorage', 'RESUME_KEY', 'isLocalPath', `${match[0]}\nreturn takeResumeTarget`)(sessionStorage, RESUME_KEY, isLocalPath)
  return { take, calls, RESUME_KEY }
}

test('a stored path on this origin is returned and the stash is cleared', () => {
  for (const target of ['/checkout?plan=pro', '/create/palette?c=14224A', '/projects']) {
    const { take, calls, RESUME_KEY } = load(target)
    assert.equal(take(), target)
    assert.deepEqual(calls.removed, [RESUME_KEY])
  }
})

test('anything that is not a path on this origin is dropped, and still cleared', () => {
  const backslash = '/' + String.fromCharCode(92) + 'evil.example'
  for (const bad of ['//evil.example', backslash, '/\t/evil.example', '/\n/evil.example', 'https://evil.example', 'javascript:alert(1)', 'projects', '']) {
    const { take, calls, RESUME_KEY } = load(bad)
    assert.equal(take(), null, JSON.stringify(bad))
    assert.deepEqual(calls.removed, [RESUME_KEY], `a refused value was left in storage: ${JSON.stringify(bad)}`)
  }
})

test('nothing stored, or storage that throws, gives null', () => {
  assert.equal(load(null).take(), null)
  assert.equal(load('/projects', { throws: true }).take(), null)
})
