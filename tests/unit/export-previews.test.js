// The export theme page previews (src/config/exportPreviewPages.js, src/config/exportPreviews.js, api/_lib/exportPreview.js).
//
// What is pinned, and the change that makes each fail:
//  1. THE MANIFEST IS COMPLETE: every theme in EXPORT_THEMES has every row it has, each with pages numbered 1..n and a label and size.
//     Break: delete a theme or a row from src/config/exportPreviewPages.js.
//  2. EVERY PAGE HAS ITS PUBLIC FILE: a webp under public/export-themes/pages for each page (a Free pair at 1x and 2x, a Pro pair at 1x).
//     Break: delete public/export-themes/pages/01-presentation/slides/1.webp.
//  3. NO CLEAN 2x IN PUBLIC: a Pro pair has no `@2x` file under public/, and its server copy is in api/_lib. A Free pair has none in api/_lib.
//     Break: copy a Pro 2x into public/export-themes/pages/<id>/<row>/<n>@2x.webp.
//  4. THE GATE: only a Pro account is sent the clean webp; a Free token, no token and a bad token get 403 and no bytes. The expected
//     answer is written here, not read back from isThemeExportPro.
//     Break: make assertThemeAccess in api/_lib/themeAccess.js return { ok: true } for every plan.
//  5. THE QUERY IS CHECKED: ids, pages and densities the manifest does not hold are 400 for every plan, `../` included.
//     Break: build the file path from the raw query instead of the manifest's entry.
//  6. HEADERS: every answer is Cache-Control: private, no-store and Vary: Authorization.
//     Break: remove the setHeader calls.
//  7. THE CLIENT SEES NO SERVER PATH: nothing under src/ imports api/_lib, and publicPreviewSrc never names a clean Pro 2x.
//     Break: return the `@2x` path for a Pro pair in publicPreviewSrc.
//  8. EVERY PICTURE IS ITS SIZE: each webp's header says the manifest's w by h at 1x and twice that at 2x (the server copy when it is here).
//     Break: change one page's w in src/config/exportPreviewPages.js.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { EXPORT_THEMES, THEME_ROW_FORMATS, entryHasRow, themeHasRow } from '../../src/data/exportThemes.js'
import { previewPages, publicPreviewSrc, needsGatedPreview, gatedPreviewPath } from '../../src/config/exportPreviews.js'
import { serveExportPreview } from '../../api/_lib/exportPreview.js'

const ROOT = process.cwd()
const PUBLIC = path.join(ROOT, 'public/export-themes/pages')
const SERVER = path.join(ROOT, 'api/_lib/pro/export-previews')
const WEBP = (b) => b.length > 12 && b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP'

// The clean 2x pictures are not in this repository: scripts/fetch-pro-data.mjs writes them from the private data repository at build
// time. Where they are absent (CI, a clone without the token) the handler is given a stand-in reader that answers only a path under
// pro/export-previews that the handler built itself, so the gate is still tested end to end; its bytes are a tagged WEBP.
const HAVE_CLEAN = fs.existsSync(SERVER)
const standIn = (rel) => {
  const tag = Buffer.from(`stub:${rel}`)
  const head = Buffer.alloc(12)
  head.write('RIFF', 0, 'latin1'); head.writeUInt32LE(4 + tag.length, 4); head.write('WEBP', 8, 'latin1')
  return Buffer.concat([head, tag])
}
const relOf = (url) => (String(url).match(/\/pro\/export-previews\/([^?#]+\.webp)$/) || [])[1]
const readClean = async (url) => {
  if (HAVE_CLEAN) return fs.promises.readFile(url)
  const rel = relOf(url)
  if (!rel) { const e = new Error('ENOENT'); e.code = 'ENOENT'; throw e }
  return standIn(rel)
}
const cleanBytes = (theme, row, n) => (HAVE_CLEAN ? fs.readFileSync(path.join(SERVER, theme, row, `${n}.webp`)) : standIn(`${theme}/${row}/${n}.webp`))

// The free tier, written out: Label and Swiss Field in every row they have, Standards' UI kit. Nothing else is.
const isFree = (theme, row) => ['25-label', '27-swissfield'].includes(theme) || (theme === '04-standards' && row === 'ui-kit')
const pairs = []
// The style guide has no preview pictures yet, so its row is left out of this walk until they are made.
// Flyleaf has no preview pictures yet either: it is left out of this walk until they are made.
for (const { id: theme } of EXPORT_THEMES) for (const row of Object.keys(THEME_ROW_FORMATS)) if (row !== 'guide' && theme !== '33-flyleaf' && themeHasRow(theme, row)) pairs.push({ theme, row, free: isFree(theme, row) })
const PRO_PAIR = { theme: '01-presentation', row: 'slides' }

test('the manifest covers every theme and row, with numbered pages, labels and sizes', () => {
  assert.ok(pairs.length >= 60, `the walk must be wide (${pairs.length})`)
  for (const { theme, row } of pairs) {
    const pages = previewPages(theme, row)
    assert.ok(pages.length >= 1, `${theme} ${row}: no pages`)
    pages.forEach((p, i) => {
      assert.equal(p.n, i + 1, `${theme} ${row}: pages are numbered 1..n in order`)
      assert.match(p.id, /^[a-z0-9-]+$/, `${theme} ${row} ${p.n}: id`)
      assert.ok(typeof p.label === 'string' && p.label.length > 0, `${theme} ${row} ${p.n}: label`)
      assert.ok(Number.isInteger(p.w) && Number.isInteger(p.h) && p.w > 0 && p.h > 0, `${theme} ${row} ${p.n}: size`)
      assert.deepEqual(Object.keys(p).sort(), ['h', 'id', 'label', 'n', 'w'], `${theme} ${row} ${p.n}: labels and sizes only`)
    })
  }
  for (const { id } of EXPORT_THEMES.filter((t) => !Object.keys(THEME_ROW_FORMATS).every((r) => entryHasRow(t, r)))) {
    for (const row of Object.keys(THEME_ROW_FORMATS)) {
      if (!themeHasRow(id, row)) assert.deepEqual(previewPages(id, row), [], `${id} has no ${row}`)
    }
  }
  assert.deepEqual(previewPages('nope', 'slides'), [])
  assert.deepEqual(previewPages('01-presentation', '__proto__'), [])
})

test('every page has its public file, and a Free pair has its 2x beside it', () => {
  for (const { theme, row, free } of pairs) {
    for (const p of previewPages(theme, row)) {
      const one = path.join(PUBLIC, theme, row, `${p.n}.webp`)
      assert.ok(fs.existsSync(one), `${theme} ${row} ${p.n}: no public file`)
      assert.ok(WEBP(fs.readFileSync(one)), `${one} is not a webp`)
      assert.ok(fs.statSync(one).size <= 120 * 1024, `${one} is over 120 KB`)
      assert.equal(publicPreviewSrc(theme, row, p.n, 1), `/export-themes/pages/${theme}/${row}/${p.n}.webp`)
      if (free) {
        const two = path.join(PUBLIC, theme, row, `${p.n}@2x.webp`)
        assert.ok(fs.existsSync(two), `${theme} ${row} ${p.n}: no public 2x for a Free pair`)
        assert.equal(publicPreviewSrc(theme, row, p.n, 2), `/export-themes/pages/${theme}/${row}/${p.n}@2x.webp`)
      }
    }
  }
})

// The width and height a webp says it is, from its first chunk header: VP8X (extended), VP8L (lossless) or VP8 (lossy).
const webpSize = (file) => {
  const b = Buffer.alloc(30)
  const fd = fs.openSync(file, 'r')
  try { fs.readSync(fd, b, 0, 30, 0) } finally { fs.closeSync(fd) }
  const chunk = b.toString('latin1', 12, 16)
  if (chunk === 'VP8X') return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)]
  if (chunk === 'VP8L') { const v = b.readUInt32LE(21); return [(v & 0x3fff) + 1, ((v >>> 14) & 0x3fff) + 1] }
  if (chunk === 'VP8 ') return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff]
  return null
}

test('every picture is drawn at the size the manifest gives: 1x at w by h, 2x at twice that', () => {
  let seen = 0
  for (const { theme, row, free } of pairs) {
    for (const p of previewPages(theme, row)) {
      const files = [[path.join(PUBLIC, theme, row, `${p.n}.webp`), 1]]
      if (free) files.push([path.join(PUBLIC, theme, row, `${p.n}@2x.webp`), 2])
      else if (HAVE_CLEAN) files.push([path.join(SERVER, theme, row, `${p.n}.webp`), 2])
      for (const [file, k] of files) {
        assert.deepEqual(webpSize(file), [p.w * k, p.h * k], `${path.relative(ROOT, file)} is not ${p.w * k} by ${p.h * k}`)
        seen++
      }
    }
  }
  assert.ok(seen >= 500, `the walk must read every picture (${seen})`)
})

test('a Pro pair has no clean 2x under public, and its server copy is there; a Free pair has none on the server', () => {
  for (const { theme, row, free } of pairs) {
    const pub = path.join(PUBLIC, theme, row)
    const names = fs.readdirSync(pub)
    const pages = previewPages(theme, row)
    if (free) {
      assert.equal(fs.existsSync(path.join(SERVER, theme, row)), false, `${theme} ${row}: a Free pair has no server copy`)
      assert.equal(names.length, pages.length * 2, `${theme} ${row}: exactly a 1x and a 2x per page`)
      continue
    }
    assert.deepEqual(names.filter((n) => !/^\d+\.webp$/.test(n)), [], `${theme} ${row}: only the watermarked 1x is public`)
    assert.equal(names.length, pages.length, `${theme} ${row}: one public file per page`)
    for (const p of HAVE_CLEAN ? pages : []) {
      const clean = path.join(SERVER, theme, row, `${p.n}.webp`)
      assert.ok(WEBP(fs.readFileSync(clean)), `${theme} ${row} ${p.n}: no clean 2x on the server`)
      // A different picture from the public one, and bigger: the public 1x is the watermarked 840-wide copy, not the clean one.
      assert.notDeepEqual(fs.readFileSync(clean), fs.readFileSync(path.join(pub, `${p.n}.webp`)))
    }
  }
})

test('the client reads no server path, and never names a clean Pro picture', () => {
  const bad = []
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name)
      if (e.isDirectory()) walk(p)
      else if (/\.(js|jsx)$/.test(e.name) && /(?:from|import)\s*\(?\s*['"][^'"]*api\/_lib[^'"]*['"]/.test(fs.readFileSync(p, 'utf8'))) bad.push(p)
    }
  }
  walk(path.join(ROOT, 'src'))
  assert.deepEqual(bad, [], 'src/ imports from api/_lib')
  for (const { theme, row, free } of pairs) {
    for (const p of previewPages(theme, row)) {
      assert.equal(needsGatedPreview(theme, row), !free, `${theme} ${row}`)
      assert.equal(publicPreviewSrc(theme, row, p.n, 2) !== '', free, `${theme} ${row}: a 2x path is for a Free pair only`)
      assert.equal(gatedPreviewPath(theme, row, p.n) !== '', !free, `${theme} ${row}: the endpoint path is for a Pro pair only`)
    }
  }
  assert.equal(publicPreviewSrc('01-presentation', 'slides', 999, 1), '')
  assert.equal(gatedPreviewPath('01-presentation', 'slides', 1), '/api/ai?export=preview&theme=01-presentation&row=slides&n=1&dpr=2')
  // The public folder is the only thing copied to dist, and the server folder is not in it.
  assert.equal(fs.existsSync(path.join(ROOT, 'public/api')), false)
})

// ---- the endpoint ----------------------------------------------------------------------------------------------------------------

const ACCOUNTS = {
  free: {},
  pro: { subscription: { status: 'active', interval: 'monthly', currentPeriodEnd: Date.now() + 10 * 86_400_000 } },
}
const deps = {
  verifyIdToken: async (token) => {
    if (token === 'tok-free' || token === 'tok-pro') return { uid: token.slice(4), email_verified: true }
    const e = new Error('bad token'); e.code = 'auth/argument-error'; throw e
  },
  readUser: async (uid) => ACCOUNTS[uid],
  read: readClean,
}

/** Call the handler like Vercel does; returns { status, headers, json, bytes }. */
async function ask(query, token) {
  const out = { status: 200, headers: {}, json: null, bytes: null }
  const res = {
    setHeader: (k, v) => { out.headers[k] = v },
    status: (c) => { out.status = c; return res },
    json: (b) => { out.json = b; return res },
    send: (b) => { out.bytes = b; return res },
  }
  await serveExportPreview({ headers: token ? { authorization: `Bearer ${token}` } : {}, query }, res, deps)
  return out
}
const q = (theme, row, n = '1', extra = {}) => ({ export: 'preview', theme, row, n, dpr: '2', ...extra })
const noStore = (r, what) => {
  assert.equal(r.headers['Cache-Control'], 'private, no-store', `${what}: Cache-Control`)
  assert.match(r.headers.Vary, /Authorization/, `${what}: Vary`)
}

test('a Pro token gets the clean webp for a Pro pair, byte for byte', async () => {
  const r = await ask(q(PRO_PAIR.theme, PRO_PAIR.row), 'tok-pro')
  assert.equal(r.status, 200)
  assert.equal(r.headers['Content-Type'], 'image/webp')
  assert.ok(WEBP(r.bytes))
  assert.deepEqual(r.bytes, cleanBytes(PRO_PAIR.theme, PRO_PAIR.row, 1))
  noStore(r, 'the Pro answer')
  const noDpr = await ask({ ...q(PRO_PAIR.theme, PRO_PAIR.row), dpr: undefined }, 'tok-pro')
  assert.equal(noDpr.status, 200, 'dpr may be left out')
})

test('a Free token, a bad token and no token get 403 and no bytes for every Pro pair', async () => {
  let walked = 0
  for (const { theme, row, free } of pairs) {
    if (free) continue
    for (const token of ['tok-free', 'bad', null]) {
      const r = await ask(q(theme, row), token)
      assert.equal(r.status, 403, `${theme} ${row} ${token}`)
      assert.deepEqual(r.json, { error: 'pro_required' }, `${theme} ${row} ${token}`)
      assert.equal(r.bytes, null, `${theme} ${row} ${token}: no bytes`)
      noStore(r, `${theme} ${row} ${token}`)
    }
    walked += 1
  }
  assert.ok(walked >= 40, `the walk must be wide (${walked})`)
})

test('every page of every Pro pair is served to Pro, and a Free pair has no server copy to send', async () => {
  for (const { theme, row, free } of pairs) {
    for (const p of previewPages(theme, row)) {
      const r = await ask(q(theme, row, String(p.n)), 'tok-pro')
      if (free) {
        assert.equal(r.status, 404, `${theme} ${row} ${p.n}`)
        assert.deepEqual(r.json, { error: 'public_preview' })
        assert.equal(r.bytes, null)
      } else {
        assert.equal(r.status, 200, `${theme} ${row} ${p.n}`)
        assert.ok(WEBP(r.bytes), `${theme} ${row} ${p.n}`)
      }
    }
  }
})

test('an edited query is judged on the real pair, not the one it was made for', async () => {
  // Standards: the UI kit is the free pair, its other rows are Pro.
  assert.equal((await ask(q('04-standards', 'ui-kit'), 'tok-free')).status, 404, 'the free pair has a public picture, nothing to send')
  assert.equal((await ask(q('04-standards', 'slides'), 'tok-free')).status, 403)
  assert.equal((await ask(q('04-standards', 'book'), 'tok-free')).status, 403)
  assert.equal((await ask(q('04-standards', 'slides'), 'tok-pro')).status, 200)
  // Label is free in the one row it has; a row it lacks is 400, not a Pro file.
  assert.equal((await ask(q('25-label', 'slides'), 'tok-free')).status, 404)
  assert.equal((await ask(q('25-label', 'ui-kit'), 'tok-free')).status, 400)
  assert.equal((await ask(q('25-label', 'book'), 'tok-pro')).status, 400)
})

test('a made-up id, a page that is not there, a density that is not offered and a path out of the folder are 400', async () => {
  const bad = [
    q('nope', 'slides'), q(PRO_PAIR.theme, 'nope'), q(PRO_PAIR.theme, 'slides', '0'), q(PRO_PAIR.theme, 'slides', '99'),
    q(PRO_PAIR.theme, 'slides', '-1'), q(PRO_PAIR.theme, 'slides', '01'), q(PRO_PAIR.theme, 'slides', '1.webp'), q(PRO_PAIR.theme, 'slides', '../1'),
    q('../../../package', 'slides'), q('../previews/01-presentation', 'slides'), q(PRO_PAIR.theme, '../slides'), q(PRO_PAIR.theme, 'slides/..'),
    q('..\\..\\package', 'slides'), q('%2e%2e/%2e%2e/package', 'slides'), q(`${PRO_PAIR.theme}\0`, 'slides'),
    q('__proto__', 'slides'), q('constructor', 'slides'), q(PRO_PAIR.theme, '__proto__'), q(PRO_PAIR.theme, 'toString'),
    q(PRO_PAIR.theme, 'slides', '1', { dpr: '3' }), q(PRO_PAIR.theme, 'slides', '1', { dpr: '1' }), q(PRO_PAIR.theme, 'slides', '1', { dpr: '' }),
    q(PRO_PAIR.theme, 'slides', ['1', '2']), q([PRO_PAIR.theme, '04-standards'], 'slides'), q({ a: 1 }, 'slides'),
    { export: 'preview' }, {},
  ]
  for (const query of bad) {
    for (const token of ['tok-pro', 'tok-free', null]) {
      const r = await ask(query, token)
      assert.equal(r.status, 400, `${JSON.stringify(query)} as ${token}`)
      assert.equal(r.bytes, null)
      noStore(r, JSON.stringify(query))
    }
  }
})

test('a broken session service is a server fault, not a verdict on the caller', async () => {
  const out = { status: 200, headers: {}, json: null }
  const res = { setHeader: (k, v) => { out.headers[k] = v }, status: (c) => { out.status = c; return res }, json: (b) => { out.json = b; return res }, send: () => res }
  const failing = async () => { const e = new Error('Error while making request: ETIMEDOUT'); e.code = 'auth/argument-error'; throw e }
  await serveExportPreview({ headers: { authorization: 'Bearer x' }, query: q(PRO_PAIR.theme, 'slides') }, res, { ...deps, verifyIdToken: failing })
  assert.equal(out.status, 503)
  assert.deepEqual(out.json, { error: 'auth_unavailable' })
  const noUser = { ...deps, readUser: async () => { throw new Error('firestore down') } }
  const res2 = { setHeader: () => {}, status: (c) => { out.status = c; return res2 }, json: (b) => { out.json = b; return res2 }, send: () => res2 }
  await serveExportPreview({ headers: { authorization: 'Bearer tok-pro' }, query: q(PRO_PAIR.theme, 'slides') }, res2, noUser)
  assert.equal(out.status, 500)
  assert.equal(out.json.error, 'auth_unavailable')
})

test('the function ships the server folder and the manifest without new includeFiles entries', () => {
  // Vercel's file tracer follows a `new URL(`./literal/${x}...`, import.meta.url)` to every file under the literal folder, so the clean
  // pictures ride along as long as the endpoint builds their path that way. The pages module is reached through
  // src/config/exportPreviews.js, which the `config/export*s` glob names (function-include-files.test.js checks the glob).
  const endpoint = fs.readFileSync(path.join(ROOT, 'api/_lib/exportPreview.js'), 'utf8')
  assert.match(endpoint, /new URL\(`\.\/pro\/export-previews\/\$\{theme\}\/\$\{row\}\/\$\{n\}\.webp`, import\.meta\.url\)/)
  assert.match(endpoint, /from '\.\.\/\.\.\/src\/config\/exportPreviews\.js'/)
  const vercel = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'))
  assert.match(vercel.functions['api/ai.js'].includeFiles, /config\/export\*s/, 'the config/export*s glob carries the pages module')
  const ai = fs.readFileSync(path.join(ROOT, 'api/ai.js'), 'utf8')
  assert.match(ai, /export === 'preview'[\s\S]{0,200}import\('\.\/_lib\/exportPreview\.js'\)/)
})

test('no clean preview is committed: git tracks no picture under api/, and the server folder is ignored', async () => {
  const { execFileSync } = await import('node:child_process')
  const tracked = execFileSync('git', ['ls-files', '--', 'api'], { cwd: ROOT, encoding: 'utf8' })
    .split('\n').filter((f) => /\.(webp|png|jpe?g|avif|gif)$/i.test(f))
  assert.deepEqual(tracked, [], 'a picture is committed under api/')
  const ignored = execFileSync('git', ['check-ignore', '--no-index', 'api/_lib/pro/export-previews/01-presentation/slides/1.webp'], { cwd: ROOT, encoding: 'utf8' })
  assert.match(ignored, /export-previews/)
})
