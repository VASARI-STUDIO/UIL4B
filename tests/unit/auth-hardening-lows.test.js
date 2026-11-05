// Small hardening fixes. Source-text checks, because the code under test sits
// inside a request handler and a React page.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { isLocalPath } from '../../src/utils/localPath.js'

const read = (p) => fs.readFileSync(p, 'utf8')

test('account deletion removes feedback by a VERIFIED address only', () => {
  const src = read('api/delete-account.js')
  assert.match(src, /email = decoded\.email_verified === true \? \(decoded\.email \|\| null\) : null/)
})

test('the onboarding resume target is re-checked on read', () => {
  const src = read('src/pages/Onboarding.jsx')
  assert.ok(src.includes("import { isLocalPath } from '../utils/localPath'"))
  assert.match(src, /return isLocalPath\(t\) \? t : null/)
  for (const bad of ['//evil.test', '/\\evil.test', 'https://evil.test', '/\t/evil.test', null]) {
    assert.equal(isLocalPath(bad), false, String(bad))
  }
  assert.equal(isLocalPath('/create/palette'), true)
})
