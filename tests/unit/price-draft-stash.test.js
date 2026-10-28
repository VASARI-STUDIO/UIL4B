// THE PRICE DRAFT SURVIVES A SIGN-IN (fix round 2, item 5).
//
// The price route wants a recent sign-in. For accounts that cannot re-prove
// themselves in place the admin page signs out, which used to throw away what
// the admin had typed. The draft is now parked in sessionStorage, per admin
// uid, for 30 minutes, and put back once after the sign-in.
import test from 'node:test'
import assert from 'node:assert/strict'
import { stashPriceDraft, takePriceDraft, overlayDraft, DRAFT_TTL_MS } from '../../src/utils/priceDraftStash.js'
import { read, stripComments } from './helpers/source-text.js'

/** A sessionStorage stand-in. */
function memoryStorage() {
  const map = new Map()
  return {
    map,
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)) },
    removeItem: (k) => { map.delete(k) },
  }
}

const DRAFT = { monthly: { usd: '8', eur: 7 }, yearly: { usd: '50' } }

test('a parked draft comes back once for the same admin', () => {
  const s = memoryStorage()
  assert.equal(stashPriceDraft(s, 'boss', DRAFT, 1000), true)
  assert.deepEqual(takePriceDraft(s, 'boss', 2000), DRAFT)
  assert.equal(takePriceDraft(s, 'boss', 2000), null, 'it is restored once, not on every load')
})

test('another admin does not get it', () => {
  const s = memoryStorage()
  stashPriceDraft(s, 'boss', DRAFT, 1000)
  assert.equal(takePriceDraft(s, 'someone-else', 2000), null)
  assert.deepEqual(takePriceDraft(s, 'boss', 2000), DRAFT, 'and it is still there for its owner')
})

test('a draft older than 30 minutes is dropped', () => {
  const s = memoryStorage()
  stashPriceDraft(s, 'boss', DRAFT, 1000)
  assert.equal(takePriceDraft(s, 'boss', 1000 + DRAFT_TTL_MS + 1), null)
  assert.equal(s.map.size, 0, 'an expired entry is removed')

  stashPriceDraft(s, 'boss', DRAFT, 1000)
  assert.deepEqual(takePriceDraft(s, 'boss', 1000 + DRAFT_TTL_MS), DRAFT, 'exactly 30 minutes is still fine')
})

test('malformed storage is ignored, and storage that throws never blocks', () => {
  const s = memoryStorage()
  s.setItem('uil4b-admin-price-draft:boss', '{not json')
  assert.equal(takePriceDraft(s, 'boss', 1), null)
  s.setItem('uil4b-admin-price-draft:boss', JSON.stringify({ savedAt: 1, draft: { monthly: 'free' } }))
  assert.equal(takePriceDraft(s, 'boss', 2), null, 'a draft of the wrong shape is not restored')

  const broken = { getItem() { throw new Error('denied') }, setItem() { throw new Error('quota') }, removeItem() {} }
  assert.equal(stashPriceDraft(broken, 'boss', DRAFT, 1), false)
  assert.equal(takePriceDraft(broken, 'boss', 1), null)
  assert.equal(stashPriceDraft(null, 'boss', DRAFT), false)
  assert.equal(stashPriceDraft(memoryStorage(), '', DRAFT), false, 'no uid, no key')
})

test('overlayDraft adds only the cells the live table has', () => {
  const base = { monthly: { usd: 7, eur: 6 }, yearly: { usd: 48 } }
  const saved = { monthly: { usd: '9', jpy: '1000' }, weekly: { usd: '2' } }
  assert.deepEqual(overlayDraft(base, saved), { monthly: { usd: '9', eur: 6 }, yearly: { usd: 48 } })
  assert.equal(overlayDraft(base, null), base)
})

test('the admin page parks the draft before signing out and takes it back after load', () => {
  const src = stripComments(read('src/pages/Admin.jsx'))
  const stashAt = src.indexOf('stashPriceDraft(window.sessionStorage')
  const logoutAt = src.indexOf('await logout()')
  assert.ok(stashAt > 0 && logoutAt > stashAt, 'the draft must be stashed before logout() runs')
  assert.match(src, /takePriceDraft\(window\.sessionStorage, user\?\.uid\)/)
})

test('a Google-only admin re-proves in a popup and keeps the session; a revoked session signs out', () => {
  const src = stripComments(read('src/pages/Admin.jsx'))
  assert.match(src, /reauthenticateWithPopup\(fbUser/)
  assert.match(src, /signInIssue === 'reauth-required'/, 'the popup path is only for a merely-too-old sign-in')
})

test('session-revoked has its own sign-in card copy and reauth-required keeps its own', () => {
  const src = read('src/pages/Admin.jsx')
  assert.match(src, /Your session ended\. Sign in again\./)
  assert.match(src, /Price changes need a sign-in from the last 5 minutes/)
  assert.match(stripComments(src), /err\.code === 'session-revoked' \|\| err\.code === 'reauth-required'\) setSignInIssue/,
    'a refused load (not only a refused save) must show the card')
})
