// `admin-audit` AND `rate-limits` ARE SERVER-ONLY COLLECTIONS (security audit M7
// and H1, fix round 2).
//
// `admin-audit` holds the record of every Stripe price change and `rate-limits`
// holds the request counters. Both are written with the Admin SDK, which ignores
// rules, and neither may be reachable by a client: an audit trail a client can
// edit is no trail, and a counter a client can reset is no limit.
//
// Firestore denies anything no rule allows, so the protection is an ABSENCE: no
// `match` for either collection, and no wildcard `match` that would cover them.
// tests/rules/ proves behaviour against the emulator, which needs Java and the
// Firebase CLI; this test reads firestore.rules as text so the same guarantee is
// checked on every `npm run test:unit`.
import test from 'node:test'
import assert from 'node:assert/strict'
import { read, stripComments } from './helpers/source-text.js'

const SERVER_ONLY = ['admin-audit', 'rate-limits']

/** Every path in a `match <path> {` line, in file order. */
function matchPaths(rules) {
  return [...rules.matchAll(/\bmatch\s+(\/[^\s{]*(?:\{[^}]*\}[^\s{]*)*)\s*\{/g)].map((m) => m[1])
}

const rules = stripComments(read('firestore.rules'))

test('the rules parser finds the matches it is supposed to', () => {
  // Without this, an empty list would make every assertion below pass.
  const paths = matchPaths(rules)
  assert.ok(paths.includes('/databases/{database}/documents'), 'the root match was not found')
  assert.ok(paths.includes('/users/{userId}'), 'the users match was not found')
  assert.ok(paths.length >= 5, `only ${paths.length} matches found`)
})

test('neither server-only collection is named anywhere in firestore.rules', () => {
  for (const name of SERVER_ONLY) {
    assert.ok(!rules.includes(name), `firestore.rules mentions ${name}: a client could be given access`)
  }
})

test('no wildcard match could cover a server-only collection', () => {
  // Under the root match every other path names its collection. One that starts
  // with a variable (`/{collection}/{doc}`, `/{document=**}`) matches them all.
  const [root, ...rest] = matchPaths(rules)
  assert.equal(root, '/databases/{database}/documents')
  const wildcards = rest.filter((p) => /^\/\{/.test(p))
  assert.deepEqual(wildcards, [], `a catch-all match covers every collection, including ${SERVER_ONLY.join(' and ')}`)
  assert.ok(!rules.includes('=**'), 'a recursive wildcard (=**) is in the rules')
})
