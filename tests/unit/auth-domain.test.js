// The sign-in helper host: the site itself on production, firebaseapp.com
// everywhere else, and vercel.json proxying /__/auth to the project so the
// first case works.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { FIREBASE_AUTH_DOMAIN, authDomainFor } from '../../src/utils/authDomain.js'

const vercel = JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8'))

test('production hosts sign in through their own domain', () => {
  assert.equal(authDomainFor('uil4b.com', FIREBASE_AUTH_DOMAIN), 'uil4b.com')
  assert.equal(authDomainFor('www.uil4b.com', undefined), 'www.uil4b.com')
})

test('previews, localhost and test builds keep the firebaseapp host', () => {
  assert.equal(authDomainFor('uil4b-git-main-vasari.vercel.app', undefined), FIREBASE_AUTH_DOMAIN)
  assert.equal(authDomainFor('localhost', undefined), FIREBASE_AUTH_DOMAIN)
  assert.equal(authDomainFor('127.0.0.1', ''), FIREBASE_AUTH_DOMAIN)
  assert.equal(authDomainFor('', undefined), FIREBASE_AUTH_DOMAIN)
  assert.equal(authDomainFor('localhost', 'other.example'), 'other.example')
})

test('vercel.json proxies /__/auth and /__/firebase to the project, right after the share shortlink', () => {
  const [share, auth, init] = vercel.rewrites
  assert.equal(share.source, '/p/:code')
  assert.deepEqual(auth, { source: '/__/auth/:path*', destination: `https://${FIREBASE_AUTH_DOMAIN}/__/auth/:path*` })
  assert.deepEqual(init, { source: '/__/firebase/:path*', destination: `https://${FIREBASE_AUTH_DOMAIN}/__/firebase/:path*` })
})

test('the sign-in iframe may be framed by the site: /__/ is SAMEORIGIN, never DENY', () => {
  const frameRules = vercel.headers.filter((h) => h.headers.some((k) => k.key === 'X-Frame-Options'))
  const valueFor = (path) => frameRules
    .filter((h) => new RegExp(`^${h.source}$`).test(path))
    .map((h) => h.headers.find((k) => k.key === 'X-Frame-Options').value)
  assert.deepEqual(valueFor('/__/auth/iframe'), ['SAMEORIGIN'])
  assert.deepEqual(valueFor('/__/auth/handler'), ['SAMEORIGIN'])
  assert.deepEqual(valueFor('/plans'), ['DENY'])
  assert.deepEqual(valueFor('/previews/card/a.webp'), ['SAMEORIGIN'])
})
