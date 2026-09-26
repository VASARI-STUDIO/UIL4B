// The Stripe return_url allowlist. `return_url` is attacker-influenced (it is
// derived from the request's Origin / Referer), so the allowlist is the only
// thing stopping checkout or the billing portal from returning a user to
// someone else's page.
import test from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_ORIGIN, allowedOrigins, resolveOrigin } from '../../api/_lib/origins.js'
import { SITE_ORIGIN } from '../../src/utils/routeMeta.js'

const req = (headers) => ({ headers })

test('every allowlisted origin resolves to itself', () => {
  for (const origin of allowedOrigins()) {
    assert.equal(resolveOrigin(req({ origin })), origin)
  }
  // Named explicitly so a silent edit to the list cannot pass this test.
  assert.equal(resolveOrigin(req({ origin: 'https://uil4b.com' })), 'https://uil4b.com')
  assert.equal(resolveOrigin(req({ origin: 'https://www.uil4b.com' })), 'https://www.uil4b.com')
  assert.equal(resolveOrigin(req({ origin: 'http://localhost:5173' })), 'http://localhost:5173')
})

test('the referer fallback strips the path before matching', () => {
  assert.equal(resolveOrigin(req({ referer: 'https://uil4b.com/pricing' })), 'https://uil4b.com')
  assert.equal(resolveOrigin(req({ referer: 'https://www.uil4b.com/' })), 'https://www.uil4b.com')
})

test('a lookalike domain never resolves to the origin it imitates', () => {
  // The match must be exact: 'https://uil4b.com.evil.com'.startsWith('https://uil4b.com') is true.
  assert.equal(resolveOrigin(req({ origin: 'https://uil4b.com.evil.com' })), DEFAULT_ORIGIN)
  assert.equal(resolveOrigin(req({ origin: 'https://uil4b.comevil.com' })), DEFAULT_ORIGIN)
  assert.equal(resolveOrigin(req({ referer: 'https://uil4b.com.evil.com/checkout' })), DEFAULT_ORIGIN)
  assert.equal(resolveOrigin(req({})), DEFAULT_ORIGIN)
})

// The fallback is where a user lands when their Origin header is missing or
// unknown. It is the site's canonical origin, and only the custom domains are
// on the allowlist.
test('the fallback origin is the canonical site origin, not a dead host', () => {
  assert.equal(DEFAULT_ORIGIN, SITE_ORIGIN)
  assert.equal(resolveOrigin(req({})), SITE_ORIGIN)
})

test('a host we do not serve is on no allowlist', () => {
  for (const dead of ['https://uil4b.vercel.app']) {
    assert.ok(!allowedOrigins().includes(dead), `${dead} is allowlisted`)
    assert.equal(resolveOrigin(req({ origin: dead })), SITE_ORIGIN)
  }
})
