// /support is a support link set outside the repo (failed-payment emails and
// similar). It never had a page, so it 404ed. It now lands on the
// /feedback contact page, answered at the edge and again in the client router.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { LEGACY_REDIRECTS, CLIENT_REDIRECT_ROUTES, mergeRedirectQuery } from '../../src/data/legacyRoutes.js'
import { sitemapRoutes } from '../../scripts/route-matrix.mjs'

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8')

test('vercel.json sends /support to /feedback?from=support with a permanent redirect', () => {
  const rules = JSON.parse(read('vercel.json')).redirects.filter((r) => r.source === '/support')
  // One exact-source rule covers /support, /support/ and /support?x=1; the
  // destination's own from=support is how the form knows the visitor came for help.
  assert.deepEqual(rules, [{ source: '/support', destination: '/feedback?from=support', permanent: true }])
})

test('the client router also redirects /support to /feedback', () => {
  assert.ok(LEGACY_REDIRECTS.some(([from, to]) => from === '/support' && to === '/feedback?from=support'))
  assert.deepEqual(CLIENT_REDIRECT_ROUTES.filter(([from]) => from === '/support'), [['/support', '/feedback?from=support']])
  // The mapped table is what App.jsx turns into <Navigate> routes.
  const app = read('src/App.jsx')
  assert.match(app, /CLIENT_REDIRECT_ROUTES\.map\(/)
  assert.ok(app.includes('<Route path="/feedback"'), '/feedback must stay a real route')
  assert.ok(!app.includes('<Route path="/support"'), '/support is an alias, not a page of its own')
  // The <Navigate> must carry the visitor's own query along, not drop it.
  assert.match(app, /mergeRedirectQuery\(to, location\.search\)/)
})

test('the client redirect keeps the incoming query beside from=support', () => {
  const search = (url) => new URLSearchParams(url.split('?')[1])
  const landed = mergeRedirectQuery('/feedback?from=support', '?reason=payment_failed&ref=x')
  assert.equal(landed.split('?')[0], '/feedback')
  assert.equal(search(landed).get('from'), 'support')
  assert.equal(search(landed).get('reason'), 'payment_failed')
  assert.equal(search(landed).get('ref'), 'x')
  // A bare /support still gets from=support; the destination's own value wins
  // over an incoming one; a fragment and a query-less destination survive.
  assert.equal(mergeRedirectQuery('/feedback?from=support', ''), '/feedback?from=support')
  assert.equal(mergeRedirectQuery('/feedback?from=support', '?from=other'), '/feedback?from=support')
  assert.equal(mergeRedirectQuery('/learn/help#faq', '?a=1'), '/learn/help?a=1#faq')
  assert.equal(mergeRedirectQuery('/discover', ''), '/discover')
})

test('the feedback form opens on Help Request for support arrivals, and on Feature Request otherwise', () => {
  const form = read('src/pages/Feedback.jsx')
  assert.match(form, /params\.get\('from'\) === 'support' \|\| reason \? 'help' : 'feature'/)
  // The payment copy: subject, subline, placeholder, a required email.
  assert.match(form, /PAYMENT_SUBJECT = 'Payment failed'/)
  assert.match(form, /paymentFailed \? PAYMENT_SUBTITLE/)
  assert.match(form, /paymentFailed \? PAYMENT_PLACEHOLDER/)
  assert.match(form, /required=\{paymentFailed\}/)
  assert.match(form, /paymentFailed && !accountEmail && !contact\.trim\(\)/)
})

test('/support is not advertised in the sitemap, /feedback stays the contact page', async () => {
  const advertised = new Set(await sitemapRoutes())
  assert.ok(!advertised.has('/support'))
  assert.ok(advertised.has('/feedback'))
})
