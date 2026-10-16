// /support is a support link set outside the repo (failed-payment emails and
// similar). It never had a page, so it 404ed. It now lands on the
// /feedback contact page, answered at the edge and again in the client router.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { LEGACY_REDIRECTS, CLIENT_REDIRECT_ROUTES } from '../../src/data/legacyRoutes.js'
import { sitemapRoutes } from '../../scripts/route-matrix.mjs'

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8')

test('vercel.json sends /support to /feedback with a permanent redirect', () => {
  const rules = JSON.parse(read('vercel.json')).redirects.filter((r) => r.source === '/support')
  // Vercel keeps the query string on a redirect and matches the trailing-slash
  // form, so one exact-source rule covers /support, /support/ and /support?x=1.
  assert.deepEqual(rules, [{ source: '/support', destination: '/feedback', permanent: true }])
})

test('the client router also redirects /support to /feedback', () => {
  assert.ok(LEGACY_REDIRECTS.some(([from, to]) => from === '/support' && to === '/feedback'))
  assert.deepEqual(CLIENT_REDIRECT_ROUTES.filter(([from]) => from === '/support'), [['/support', '/feedback']])
  // The mapped table is what App.jsx turns into <Navigate> routes.
  const app = read('src/App.jsx')
  assert.match(app, /CLIENT_REDIRECT_ROUTES\.map\(/)
  assert.ok(app.includes('<Route path="/feedback"'), '/feedback must stay a real route')
  assert.ok(!app.includes('<Route path="/support"'), '/support is an alias, not a page of its own')
})

test('/support is not advertised in the sitemap, /feedback stays the contact page', async () => {
  const advertised = new Set(await sitemapRoutes())
  assert.ok(!advertised.has('/support'))
  assert.ok(advertised.has('/feedback'))
})
