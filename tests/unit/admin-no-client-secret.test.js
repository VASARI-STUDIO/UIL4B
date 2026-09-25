// The Admin page has no password of its own.
//
// A code compared in the browser ships in the public Admin chunk, so it is no
// secret. What opens the page is an ADMIN_EMAILS address (checked by
// api/verify-admin.js, which mints the `admin` claim the rules trust) or a
// reviewer role from a signed claim. Neither is a string in the bundle.
//
// The retired code is held here only as a SHA-256 digest, so this file does
// not carry it. Every short string literal is hashed and compared.
import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { read, stripComments } from './helpers/source-text.js'

const RETIRED_CODE_SHA256 = '5a84ebfaf45d90e3a140159faf1231558676b1421a27c9b7f8794131480a749a'

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex')

/** True when any quoted literal of a plausible code shape hashes to `digest`. */
function carriesRetiredCode(text, digest = RETIRED_CODE_SHA256) {
  for (const m of text.matchAll(/(['"`])([A-Za-z0-9_-]{6,40})\1/g)) {
    if (sha256(m[2]) === digest) return true
  }
  return false
}

test('the digest scan finds a quoted literal (positive control)', () => {
  const control = sha256('control-code-1')
  assert.equal(carriesRetiredCode("const x = 'control-code-1'", control), true)
  assert.equal(carriesRetiredCode('if (typed === "control-code-1") open()', control), true)
  assert.equal(carriesRetiredCode("const x = 'control-code-2'", control), false)
})

test('the Admin page no longer compares anything the visitor types against a literal', () => {
  const src = stripComments(read('src/pages/Admin.jsx'))
  assert.ok(!carriesRetiredCode(src), 'the old admin code is back in Admin.jsx')
  assert.ok(!/ADMIN_CODE/.test(src), 'an ADMIN_CODE constant is back')
  assert.ok(!/type="password"/.test(src), 'the lock screen asks for a code again')
})

test('what does open it is still there: the email allowlist and the signed reviewer claim', () => {
  const src = stripComments(read('src/pages/Admin.jsx'))
  assert.match(src, /const effectiveUnlocked = isAdminUser \|\| canReview\(role\)/)
})

test('no file under src/ carries the old code', () => {
  const hits = []
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name)
      if (e.isDirectory()) walk(p)
      else if (/\.(jsx?|mjs|json)$/.test(e.name) && carriesRetiredCode(fs.readFileSync(p, 'utf8'))) hits.push(p)
    }
  }
  walk(path.join(process.cwd(), 'src'))
  assert.deepEqual(hits, [])
})

const DIST = path.join(process.cwd(), 'dist', 'assets')
test('no built chunk carries the old code', { skip: !fs.existsSync(DIST) && 'run a build first' }, () => {
  const js = fs.readdirSync(DIST).filter((f) => f.endsWith('.js'))
  assert.ok(js.some((f) => /^Admin-/.test(f)), 'no Admin chunk in dist/assets — this checked nothing')
  const hits = js.filter((f) => carriesRetiredCode(fs.readFileSync(path.join(DIST, f), 'utf8')))
  assert.deepEqual(hits, [])
})
