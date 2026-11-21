// The live page previews behind POST /api/ai?export=preview { theme, page, brand: { name, design } }.
//
// What is pinned here, and the change that makes each fail:
//  1. NO SESSION, NO PAGE: no token or a refused token is a 401 and renders nothing.
//     Break: drop the Bearer check in api/_lib/exportPreview.js.
//  2. FREE ON A PRO TEMPLATE: 403 { error: 'pro_required' } and not a byte of the page; the engine is never asked.
//     Break: skip the assertThemeAccess verdict (or return `plan.id` truthy) in serveExportPreview.
//  3. FAIL CLOSED: a plan lookup that throws is a 500 with no page, for a Pro-only template and a free one alike.
//     Break: catch the planOf error and carry on with a default plan.
//  4. FREE ON A FREE TEMPLATE: a page carrying the Free mark. Pro gets the same page without it.
//     Break: return out.html unmarked for a Free account.
//  5. NOTHING THE REQUEST CARRIES SAYS PRO: a plan, tier or header sent by the caller changes nothing.
//     Break: read body.plan in serveExportPreview.
//  6. EVERY RESPONSE IS no-store, the refusals and the faults included.
//     Break: set Cache-Control after the first return, or leave it out.
//  7. THE DIALOG'S PAGES ARE ALL SERVED: every page src/config/exportPreviewData.js lists for every theme draws for a Pro account,
//     so the page ids the client sends and the table the server keeps cannot drift apart.
//     Break: rename a key in PAGES.
import test from 'node:test'
import assert from 'node:assert/strict'
import { serveExportPreview, PREVIEW_LIMIT } from '../../api/_lib/exportPreview.js'
import { EXPORT_THEMES, isThemeExportPro } from '../../src/data/exportThemes.js'
import { previewPages } from '../../src/config/exportPreviewData.js'

const DESIGN = {
  palette: { base: '#2F6F5E', harmony: 'auto', colors: ['#2F6F5E', '#F2C14E', '#8FB8A8', '#F4F1EA', '#1D2B27'] },
  fonts: { heading: { family: 'Barlow Condensed', weight: 700, category: 'sans-serif' }, body: { family: 'Roboto', weight: 400, category: 'sans-serif' } },
}
const USERS = { 'pro-1': { subscription: { status: 'active', currentPeriodEnd: Date.now() + 10 * 86_400_000 } }, 'free-1': {} }

function fakeRes() {
  const res = {
    headers: {},
    setHeader(k, v) { res.headers[k] = v },
    status(code) { res.code = code; return res },
    json(body) { res.body = body; return res },
    send(buf) { res.buffer = buf; return res },
  }
  return res
}

const deps = (extra = {}) => ({
  verifyIdToken: async (token) => ({ uid: token === 'tok-pro' ? 'pro-1' : 'free-1' }),
  readUser: async (uid) => USERS[uid],
  consume: async () => ({ allowed: true, remaining: 10, retryAfter: 0 }),
  ...extra,
})

const ask = async (token, body, extra) => {
  const res = fakeRes()
  const headers = token === null ? {} : { authorization: `Bearer ${token}` }
  await serveExportPreview({ headers, body }, res, deps(extra))
  return res
}
const body = (over = {}) => ({ theme: '01-presentation', page: 'guideCover', brand: { name: 'Tide & Co.', design: DESIGN }, ...over })

// An engine that fails the test if anything is drawn: a refusal must come before any rendering.
const noEngine = { projectToBrand() { throw new Error('rendered') } }

const PRO_THEME = '01-presentation'
const FREE_THEME = EXPORT_THEMES.find((t) => t.free).id
const MARK = 'data-uil4b-mark'
const noBytes = (res) => !('html' in (res.body || {})) && res.buffer === undefined && !JSON.stringify(res.body ?? '').includes('<')

test('1. no token, or a refused one, is a 401 and draws nothing', async () => {
  const none = await ask(null, body(), { engine: noEngine })
  assert.equal(none.code, 401)
  assert.equal(none.body.code, 'auth_required')
  assert.ok(noBytes(none))

  const refused = await ask('tok-x', body(), {
    engine: noEngine,
    verifyIdToken: async () => { throw Object.assign(new Error('expired'), { code: 'auth/id-token-expired' }) },
  })
  assert.equal(refused.code, 401)
  assert.ok(noBytes(refused))
})

test('1b. a token check that fails for a reason that is not the caller\'s is a server fault, never a 401', async () => {
  const res = await ask('tok-x', body(), { engine: noEngine, verifyIdToken: async () => { throw new Error('socket hang up') } })
  assert.equal(res.code, 503)
  assert.equal(res.body.code, 'auth_unavailable')
})

test('2. Free on a Pro template is 403 pro_required with no page, and nothing is drawn', async () => {
  assert.equal(isThemeExportPro('slides', PRO_THEME), true)
  for (const page of ['guideCover', 'guidePalette', 'book', 'kitScreen', 'kitButtons']) {
    const res = await ask('tok-free', body({ page }), { engine: noEngine })
    assert.equal(res.code, 403, page)
    assert.equal(res.body.error, 'pro_required')
    assert.ok(noBytes(res), `${page} carried bytes`)
  }
})

test('3. a plan lookup that throws refuses, for a Pro template and a free one', async () => {
  const readUser = async () => { throw new Error('firestore down') }
  for (const theme of [PRO_THEME, FREE_THEME]) {
    const res = await ask('tok-pro', body({ theme }), { engine: noEngine, readUser })
    assert.equal(res.code, 500, theme)
    assert.ok(noBytes(res))
  }
})

test('4. Free on a free template gets the page with the Free mark; Pro gets it without', async () => {
  const free = await ask('tok-free', body({ theme: FREE_THEME }))
  assert.equal(free.code, 200)
  assert.equal(free.body.ok, true)
  assert.match(free.body.html, /^<!doctype html>|^<!DOCTYPE html>/i)
  assert.ok(free.body.html.includes(MARK), 'the Free page has no mark')
  assert.ok(free.body.html.includes('Content-Security-Policy'), 'the page lost its CSP')

  // The free UI kit is free too (Standards), and carries the mark.
  const kit = await ask('tok-free', body({ theme: '04-standards', page: 'kitScreen' }))
  assert.equal(kit.code, 200)
  assert.ok(kit.body.html.includes(MARK))

  const pro = await ask('tok-pro', body({ theme: FREE_THEME }))
  assert.equal(pro.code, 200)
  assert.ok(!pro.body.html.includes(MARK), 'a Pro page carries the Free mark')
})

test('4b. Pro gets a Pro template; a script, form or external address is never in the page', async () => {
  const res = await ask('tok-pro', body())
  assert.equal(res.code, 200)
  assert.ok(!res.body.html.includes(MARK))
  assert.ok(!/<script[\s>/]|<form[\s>/]|\bon[a-z]+\s*=/i.test(res.body.html))
  assert.ok(!/(?:src|href)\s*=\s*["']https?:/i.test(res.body.html))
})

test('5. nothing the request carries says Pro', async () => {
  const forged = body({ plan: 'pro', tier: 'pro', pro: true, brand: { name: 'x', design: DESIGN, plan: { id: 'pro' } } })
  const res = fakeRes()
  await serveExportPreview(
    { headers: { authorization: 'Bearer tok-free', 'x-plan': 'pro', 'x-user-plan': 'pro' }, body: forged },
    res,
    deps({ engine: noEngine }),
  )
  assert.equal(res.code, 403)
  assert.ok(noBytes(res))
})

test('6. every response is no-store', async () => {
  const bad = { verifyIdToken: async () => { throw Object.assign(new Error('x'), { code: 'auth/id-token-revoked' }) } }
  const cases = [
    ask(null, body()),
    ask('tok-x', body(), bad),
    ask('tok-free', body({ page: 'nope' })),
    ask('tok-free', body({ theme: 'nope' })),
    ask('tok-free', body()),
    ask('tok-pro', body(), { readUser: async () => { throw new Error('down') } }),
    ask('tok-pro', body(), { consume: async () => ({ allowed: false, retryAfter: 5 }) }),
    ask('tok-free', body({ theme: FREE_THEME })),
    ask('tok-pro', body()),
  ]
  const seen = new Set()
  for (const res of await Promise.all(cases)) {
    seen.add(res.code)
    assert.equal(res.headers['Cache-Control'], 'private, no-store', `status ${res.code}`)
    assert.equal(res.headers.Vary, 'Authorization')
  }
  for (const code of [200, 400, 401, 403, 429, 500]) assert.ok(seen.has(code), `no case answered ${code}`)
})

test('7. a page, theme or body outside the table is a 400 and costs no account read', async () => {
  let reads = 0
  const readUser = async () => { reads += 1; return {} }
  const odd = await ask('tok-free', body({ page: '__proto__' }), { readUser, engine: noEngine })
  assert.equal(odd.code, 400)
  assert.equal(reads, 0)
  const theme = await ask('tok-pro', body({ theme: '../../etc/passwd' }), { engine: noEngine })
  assert.equal(theme.code, 400)
  const missing = await ask('tok-pro', undefined, { engine: noEngine })
  assert.equal(missing.code, 400)
})

test('8. over the per-account limit is a 429, and a limiter that cannot count refuses', async () => {
  const limited = await ask('tok-pro', body(), { consume: async () => ({ allowed: false, retryAfter: 7 }) })
  assert.equal(limited.code, 429)
  assert.equal(limited.headers['Retry-After'], '7')
  const degraded = await ask('tok-pro', body(), { consume: async () => ({ allowed: true, degraded: true }) })
  assert.equal(degraded.code, 429)
  const broken = await ask('tok-pro', body(), { consume: async () => { throw new Error('down') } })
  assert.equal(broken.code, 500)
  const keyed = []
  await ask('tok-pro', body(), { consume: async (o) => { keyed.push(o); return { allowed: true } } })
  assert.equal(keyed[0].key, 'pro-1')
  assert.equal(keyed[0].bucket, PREVIEW_LIMIT.bucket)
  assert.equal(keyed[0].failOpen, false)
})

test('9. a Free account is refused a Pro page in every theme, and marked on every free one', async () => {
  for (const t of EXPORT_THEMES) {
    for (const p of previewPages(t.id)) {
      const res = await ask('tok-free', body({ theme: t.id, page: p.id }), p.pro ? { engine: noEngine } : undefined)
      if (p.pro) assert.equal(res.code, 403, `${t.id} ${p.id}`)
      else {
        assert.equal(res.code, 200, `${t.id} ${p.id}`)
        assert.ok(res.body.html.includes(MARK), `${t.id} ${p.id}`)
      }
    }
  }
})

test('10. every page the dialog lists for every theme draws for a Pro account', async () => {
  let drawn = 0
  for (const t of EXPORT_THEMES) {
    for (const p of previewPages(t.id)) {
      const res = await ask('tok-pro', body({ theme: t.id, page: p.id }))
      assert.equal(res.code, 200, `${t.id} ${p.id}: ${JSON.stringify(res.body).slice(0, 120)}`)
      assert.ok(res.body.html.length > 500)
      assert.ok(!res.body.html.includes(MARK))
      drawn += 1
    }
  }
  assert.ok(drawn >= EXPORT_THEMES.length * 3, `only ${drawn} pages drawn`)
})
