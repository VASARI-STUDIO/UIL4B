// isLocalPath decides whether a `from` in router state or the resume stash is
// somewhere on this origin. Anything a browser would read as another origin,
// or that is not a path at all, must be refused.
import test from 'node:test'
import assert from 'node:assert/strict'
import { isLocalPath } from '../../src/utils/localPath.js'

test('paths on this origin are accepted', () => {
  for (const p of ['/', '/home', '/checkout?plan=pro', '/create/palette?c=14224A', '/%2f/x']) {
    assert.equal(isLocalPath(p), true, p)
  }
})

test('anything a browser reads as another origin, or that is not a path, is refused', () => {
  const backslash = '/' + String.fromCharCode(92) + 'evil.com'
  for (const p of ['//evil.com', backslash, '/\t/evil.com', '/\n/evil.com', '/\r/evil.com', 'javascript:alert(1)', 'https://evil.com', 'home', '', undefined, null, 42, {}]) {
    assert.equal(isLocalPath(p), false, JSON.stringify(p))
  }
})
