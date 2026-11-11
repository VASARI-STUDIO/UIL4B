// A palette share page at /p/<code> exists for the unfurl and the redirect,
// not for search. Every 1-12 colour hex list is a valid URL, so the set is
// unbounded and each page is thin. It is kept out of the index by noindex in
// the document and in a header, and robots.txt must NOT disallow /p/, or a
// crawler would never fetch the page and never read the noindex.

import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

async function render(query = { c: '4338E0,7C6CF0' }) {
  const { default: handler } = await import('../../api/share.js')
  let body = ''
  const res = {
    headers: {},
    statusCode: 0,
    setHeader(k, v) { this.headers[k.toLowerCase()] = v },
    status(n) { this.statusCode = n; return this },
    send(v) { body = String(v); return this },
    json(v) { body = JSON.stringify(v); return this },
    end() { return this },
  }
  handler({ method: 'GET', query, headers: {} }, res)
  return { body, res }
}

test('the share page asks not to be indexed, in the document and in a header', async () => {
  const { body, res } = await render()
  assert.equal(res.statusCode, 200)
  assert.ok(body.includes('og:image'), 'the document is not the share card')
  assert.match(body, /<meta name="robots" content="noindex, follow">/)
  assert.equal(res.headers['x-robots-tag'], 'noindex')
})

test('the share page is marked as Australian English', async () => {
  const { body } = await render()
  assert.match(body, /<html lang="en-AU">/)
})

test('the share card spells the brand with a space', async () => {
  const { body } = await render()
  assert.ok(!body.includes('UIL4B'), 'the unspaced brand name reached the share card')
  assert.match(body, /<title>2-colour palette — UI L4B<\/title>/)
  assert.match(body, /<meta property="og:site_name" content="UI L4B">/)
})

test('robots.txt leaves /p/ crawlable so the noindex can be read', () => {
  const robots = fs.readFileSync(path.join(process.cwd(), 'public/robots.txt'), 'utf8')
  assert.ok(!/^\s*Disallow:\s*\/p\b/m.test(robots), 'robots.txt disallows /p/, which hides the noindex')
})
