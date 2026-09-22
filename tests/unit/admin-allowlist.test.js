// THE ADMIN ALLOWLIST IS CONFIGURATION NOW, AND IT MUST FAIL CLOSED.
//
// ── What changed ────────────────────────────────────────────────────────────
//
// `export const ADMIN_EMAILS = ['<the founder's personal gmail>']` was written
// out twice in tracked source — api/_lib/admin.js and api/_lib/plans.js — plus
// a third time as a string comparison in firestore.rules. This repository is
// public, so that published the one account whose compromise yields site-wide
// admin AND the full user list, with the target named. The list is now the
// ADMIN_EMAILS environment variable, parsed in exactly one place
// (api/_lib/adminEmails.js).
//
// ── Why this file exists ────────────────────────────────────────────────────
//
// Moving a security decision into configuration creates a failure mode the
// literal never had: the variable can be MISSING. There are only two things
// that can mean, and one of them hands the site to whoever asks first.
// Everything below is about which one it means. The empty case is asserted
// first, and through the real requireAdmin() rather than through the parser,
// because "the list is empty" and "nobody is granted admin" are not the same
// statement and it is the second one that matters.
//
// The verified-email requirement is asserted here too. It is untouched by this
// slice and load-bearing: without it, anyone who signs up claiming a listed
// address — an address they cannot receive mail at — passes the allowlist.
//
// ── How requireAdmin is run ─────────────────────────────────────────────────
//
// In a vm context with `adminAuth` injected, which is the harness
// tests/unit/moderation-role.test.js already uses on api/verify-admin.js and
// for the same reason: only Firebase's own token verification is replaced. The
// allowlist comparison, the email_verified requirement and the 404-not-403
// decision are the shipped lines, and `isAdminEmail` is passed in as the REAL
// imported function, reading the real environment variable. A predicate
// re-typed into a test agrees with itself and measures nothing.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { adminEmails, isAdminEmail } from '../../api/_lib/adminEmails.js'
import { isFounderEmail, roleFromDecodedToken } from '../../api/_lib/moderators.js'
import { planForUser } from '../../api/_lib/plans.js'

const MODULE = 'api/_lib/admin.js'
const source = fs.readFileSync(path.join(process.cwd(), MODULE), 'utf8')

const CONFIGURED = 'owner@uil4b-test.example'
const STRANGER = 'mallory@not-the-founder.example'

/** Every import stripped, every export unwrapped — the moderation-role rule. */
function flatten(text) {
  let out = text
  const IMPORT = /^import\s[\s\S]*?\sfrom\s+'[^']+'\r?\n/m
  let imports = 0
  while (IMPORT.test(out)) { out = out.replace(IMPORT, ''); imports += 1 }
  assert.ok(imports >= 1, `${MODULE} has no imports; the harness expected its _lib block`)
  while (/^export (const|function|async function) /m.test(out)) {
    out = out.replace(/^export (const|function|async function) /m, '$1 ')
  }
  assert.ok(!/^\s*(import|export)\s/m.test(out), `${MODULE} still has an import or export the harness did not strip`)
  return out
}

const sandbox = {
  console: { error() {}, warn() {}, log() {} },
  // The real one. This is the whole point: it reads process.env.ADMIN_EMAILS in
  // the host realm, so withAllowlist() below is steering the shipped function.
  isAdminEmail,
  adminAuth: () => ({ verifyIdToken: async () => { throw new Error('no token set') } }),
}
const api = vm.runInNewContext(
  `(function(){\n${flatten(source)}\n;return { requireAdmin };\n})()`,
  sandbox,
  { filename: MODULE },
)

/** requireAdmin() against a Firebase that resolves this decoded token, or, for
 *  `null`, one that rejects the token the way an expired session does. */
async function requireAdminWith(decoded) {
  sandbox.adminAuth = () => ({
    verifyIdToken: async () => {
      if (decoded === null) throw new Error('invalid or expired')
      return decoded
    },
  })
  return api.requireAdmin({ headers: { authorization: 'Bearer pretend-id-token' } })
}

/** Run `fn` with ADMIN_EMAILS set to `value`, or unset when it is null. */
async function withAllowlist(value, fn) {
  const before = process.env.ADMIN_EMAILS
  if (value === null) delete process.env.ADMIN_EMAILS
  else process.env.ADMIN_EMAILS = value
  try {
    return await fn()
  } finally {
    if (before === undefined) delete process.env.ADMIN_EMAILS
    else process.env.ADMIN_EMAILS = before
  }
}

// ── The empty case, first ───────────────────────────────────────────────────

test('an unset ADMIN_EMAILS grants admin to NOBODY', async () => {
  await withAllowlist(null, async () => {
    assert.deepEqual(adminEmails(), [], 'an unset variable parsed to something')

    // The property that matters, asked of the real gate. If this ever comes
    // back `ok: true`, a deployment that forgot one environment variable has
    // handed site-wide admin and the full user list to whoever asked first.
    for (const address of [CONFIGURED, STRANGER, 'anyone@anywhere.example']) {
      const verdict = await requireAdminWith({ uid: 'u1', email: address, email_verified: true })
      assert.equal(verdict.ok, false,
        `requireAdmin granted admin to ${address} with no allowlist configured — an unset variable must mean `
        + 'nobody, never everybody')
      assert.equal(verdict.status, 404, 'the refusal stopped being the non-confirming 404')
    }

    // And the same answer from every other surface that asks the question.
    assert.equal(isAdminEmail(CONFIGURED), false)
    assert.equal(isFounderEmail(CONFIGURED), false)
    assert.equal(roleFromDecodedToken({ email: CONFIGURED, email_verified: true }), 'user')
    assert.equal(planForUser({ email: CONFIGURED }).id, 'free',
      'an unconfigured allowlist handed out a Pro entitlement')
  })
})

test('an EMPTY ADMIN_EMAILS grants admin to nobody either', async () => {
  // Distinct from unset: a variable that exists and holds '' or ' , , ' is what
  // a half-finished deployment or a cleared field in the Vercel UI produces,
  // and `''.split(',')` is `['']` — an array with something in it — so this is
  // the shape a careless parse gets wrong.
  for (const value of ['', '   ', ',', ' , , ']) {
    await withAllowlist(value, async () => {
      assert.deepEqual(adminEmails(), [], `ADMIN_EMAILS=${JSON.stringify(value)} parsed to a non-empty list`)
      const verdict = await requireAdminWith({ uid: 'u1', email: CONFIGURED, email_verified: true })
      assert.equal(verdict.ok, false, `ADMIN_EMAILS=${JSON.stringify(value)} granted admin`)
    })
  }
})

// ── The configured case ─────────────────────────────────────────────────────

test('a configured address is recognised, and nobody else is', async () => {
  // The positive control. Without it, everything above would also pass against
  // a gate that refuses everybody unconditionally — including a parser that
  // returned [] whatever it was given.
  await withAllowlist(CONFIGURED, async () => {
    const granted = await requireAdminWith({ uid: 'u1', email: CONFIGURED, email_verified: true })
    assert.equal(granted.ok, true, 'the configured administrator is not recognised')
    assert.equal(granted.email, CONFIGURED)
    assert.equal(granted.uid, 'u1')

    const refused = await requireAdminWith({ uid: 'u2', email: STRANGER, email_verified: true })
    assert.equal(refused.ok, false)
    assert.equal(refused.status, 404)

    assert.equal(planForUser({ email: CONFIGURED }).id, 'pro', 'the admin Pro entitlement is gone')
    assert.equal(planForUser({ email: STRANGER }).id, 'free')
    assert.equal(isFounderEmail(CONFIGURED), true)
    assert.equal(roleFromDecodedToken({ email: CONFIGURED, email_verified: true }), 'founder')
  })
})

test('the parse is a list, trimmed and lowercased, because a Vercel field is typed by a human', async () => {
  await withAllowlist(' First@Example.COM , second@example.com ,, ', () => {
    assert.deepEqual(adminEmails(), ['first@example.com', 'second@example.com'])
    assert.equal(isAdminEmail('FIRST@example.com'), true, 'the comparison is case-sensitive somewhere')
    assert.equal(isAdminEmail('  second@example.com  '), true, 'a padded address is not trimmed')
    assert.equal(isAdminEmail('third@example.com'), false)
  })
})

test('nothing but a listed address answers true', async () => {
  await withAllowlist(CONFIGURED, () => {
    const no = ['', null, undefined, 0, {}, [], [CONFIGURED], `x${CONFIGURED}`, `${CONFIGURED}.uk`, CONFIGURED.replace('@', '@@')]
    for (const value of no) {
      assert.equal(isAdminEmail(value), false, `isAdminEmail said yes to ${JSON.stringify(value)}`)
    }
    // Whitespace around a real address is the one near-miss that IS accepted,
    // deliberately — the same trim the parser gives the configured side.
    assert.equal(isAdminEmail(` ${CONFIGURED} `), true)
  })
})

// ── The requirement that did NOT change ─────────────────────────────────────

test('a verified email is still required, allowlist or no allowlist', async () => {
  await withAllowlist(CONFIGURED, async () => {
    const unverified = await requireAdminWith({ uid: 'u1', email: CONFIGURED, email_verified: false })
    assert.equal(unverified.ok, false,
      'an UNVERIFIED account holding the listed address passed — anyone who signs up claiming that address, '
      + 'an address they cannot receive mail at, is now an administrator')
    assert.equal(unverified.status, 404)

    // The same requirement, one level down, where the role is decided.
    assert.equal(roleFromDecodedToken({ email: CONFIGURED, email_verified: false }), 'user')

    // And the token has to verify at all.
    const invalid = await requireAdminWith(null)
    assert.equal(invalid.ok, false)
    assert.equal(invalid.status, 401)
  })
})

test('no Authorization header is 401, before the allowlist is consulted at all', async () => {
  await withAllowlist(null, async () => {
    const verdict = await api.requireAdmin({ headers: {} })
    assert.equal(verdict.ok, false)
    assert.equal(verdict.status, 401)
    assert.match(verdict.error, /Authentication required/)
  })
})

// ── And the literal must not come back ──────────────────────────────────────

test('no file under /api holds an email address any more', () => {
  // The defect was a literal in tracked, public source. A future "just put it
  // back for now" is exactly how it returns, so this reads the BYTES of every
  // server file rather than trusting that the env var is still being used.
  //
  // Address-SHAPED, not a search for one address: a grep for the founder's
  // gmail would go green the day somebody pastes a different one in. The same
  // net tests/unit/owner-email-not-public.test.js casts over dist/.
  const ADDRESS = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,24}/g
  // Reserved by RFC 2606 / RFC 6761 — cannot route mail, exists to be an
  // example. The `.example` addresses in these very comments are the reason.
  const UNROUTABLE = /(?:^|\.)(?:example\.(?:com|net|org)|example|invalid|test|localhost)$/i
  // Published on purpose. EXACT addresses, not a uil4b.com wildcard — the rule
  // tests/unit/owner-email-not-public.test.js already sets, because a PERSONAL
  // mailbox on the site's own domain is exactly as harvestable as one on
  // gmail.com. These are role addresses that have to be reachable to do their
  // job: admin@uil4b.com is the Reply-To on every outbound support mail
  // (api/_lib/mail.js explains why it is that one), and onboarding@resend.dev
  // is Resend's own sandbox sender.
  const PUBLISHED = new Set([
    'admin@uil4b.com',
    'support@uil4b.com',
    'legal@uil4b.com',
    'privacy@uil4b.com',
    'onboarding@resend.dev',
  ])

  const offenders = []
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name)
      if (entry.isDirectory()) { walk(p); continue }
      if (!entry.name.endsWith('.js')) continue
      const text = fs.readFileSync(p, 'utf8')
      for (const [hit] of text.matchAll(ADDRESS)) {
        const lower = hit.toLowerCase()
        if (PUBLISHED.has(lower)) continue
        if (UNROUTABLE.test(lower.slice(lower.lastIndexOf('@') + 1))) continue
        offenders.push(`${path.relative(process.cwd(), p).split(path.sep).join('/')}: ${hit}`)
      }
    }
  }
  walk(path.join(process.cwd(), 'api'))

  assert.deepEqual(offenders, [],
    'a personal email address is written into server source in a PUBLIC repository — the allowlist belongs in '
    + 'the ADMIN_EMAILS environment variable:\n  ' + offenders.join('\n  '))

  // The net catches things: a positive control, because "no offenders" is also
  // what a broken regex and an empty directory look like.
  assert.ok(ADDRESS.test('someone@gmail.com'), 'the address pattern matches nothing — this sweep is vacuous')
  assert.equal(UNROUTABLE.test('gmail.com'), false, 'gmail.com is being treated as an unroutable placeholder')
})
