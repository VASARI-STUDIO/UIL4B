// The moderator role: who may review, and whether the two halves of that
// decision can drift apart.
//
// The founder's moderation decision (recorded on [community-backend]) is that
// NOTHING PUBLISHES UNTIL IT IS APPROVED, chosen on liability grounds because
// he is a solo developer. A moderator role is how that queue stops being a
// single-person bottleneck — which makes the role a privilege-escalation
// surface, and makes "the browser and the server agree about what a role is"
// the property worth pinning.
//
// This file tests four things, in ascending order of what they have caught:
//
//   1. The predicate, on both sides of the api/ ↔ src/ boundary.
//   2. That the two copies of it AGREE, by running both over one table.
//   3. THE CALL SITES. A predicate that is right and unwired is worth nothing,
//      and this repository has shipped that exact shape twice. Reverting the
//      wiring in Admin.jsx has to fail this file.
//   4. THE ROUTE THAT MINTS THE CLAIM, executed rather than pattern-matched.
//      api/verify-admin.js is founder-gated, so the version under test is the
//      one `npm run apply:gated` would write, planned in memory from the
//      committed patch and run in a vm against an in-memory Firebase — the same
//      harness tests/unit/ai-provider-path.test.js uses for api/ai.js. A regex
//      can prove a 403 is written down somewhere in the file; it cannot prove
//      that a moderator asking to appoint a moderator gets one.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'

// api/verify-admin.js is founder-gated, so the version this file tests is the
// one the applier would write, planned in memory from the committed patch. The
// gated original is read and never written.
import { fileTextThrough } from '../../scripts/gated-patches.mjs'

import {
  roleFromClaims, canReview, canAssignModerators, canSeeReporterEmail, accessNotice,
  feedbackDecision, isFeedbackStatus, nextFeedbackStatus, pendingCounts,
  FEEDBACK_STATUSES, FEEDBACK_STATUS_LABELS, ROLES, MODERATOR_CLAIM, FOUNDER_CLAIM,
} from '../../src/utils/moderation.js'

import {
  roleFromClaims as serverRoleFromClaims,
  roleFromDecodedToken, rosterEntry, isFounderEmail,
  MODERATOR_CLAIM as SERVER_MODERATOR_CLAIM,
  FOUNDER_CLAIM as SERVER_FOUNDER_CLAIM,
} from '../../api/_lib/moderators.js'

// Line endings are normalised: git checks this repo out with CRLF on Windows,
// and a pattern that happens to span a newline must not pass on one machine
// and fail on another.
const read = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8').replace(/\r\n/g, '\n')

// ── The predicate ───────────────────────────────────────────────────────────

test('a role needs a verified email, whatever the claim says', () => {
  // Without this, anyone who signs up claiming a privileged address — an
  // address they cannot receive mail at — passes the check. api/_lib/admin.js
  // already refuses on the same grounds.
  assert.equal(roleFromClaims({ admin: true }), 'user')
  assert.equal(roleFromClaims({ admin: true, email_verified: false }), 'user')
  assert.equal(roleFromClaims({ moderator: true, emailVerified: false }), 'user')
  assert.equal(roleFromClaims({ admin: true, email_verified: true }), 'founder')
})

test('both spellings of the verified flag are accepted, neither is assumed', () => {
  // Firebase spells it email_verified in a decoded token and emailVerified on
  // the client's ID-token result.
  assert.equal(roleFromClaims({ moderator: true, email_verified: true }), 'moderator')
  assert.equal(roleFromClaims({ moderator: true, emailVerified: true }), 'moderator')
})

test('the highest claim wins, so a founder on the roster is still a founder', () => {
  assert.equal(roleFromClaims({ admin: true, moderator: true, email_verified: true }), 'founder')
  assert.deepEqual(ROLES, ['user', 'moderator', 'founder'])
})

test('anything unrecognised is the least privileged answer', () => {
  for (const junk of [null, undefined, 'admin', 42, [], { admin: 'true', email_verified: true }]) {
    assert.equal(roleFromClaims(junk), 'user', `${JSON.stringify(junk)} must not be a role`)
  }
})

// ── Who may do what ─────────────────────────────────────────────────────────

test('only the founder may appoint moderators', () => {
  // The single most important line in utils/moderation.js. A moderator who can
  // appoint moderators is not a role, it is a self-replicating grant: one
  // careless account becomes every account, and the founder's liability
  // decision stops being his to make.
  assert.equal(canAssignModerators('founder'), true)
  assert.equal(canAssignModerators('moderator'), false)
  assert.equal(canAssignModerators('user'), false)
})

test('a moderator may review but may not read the reporter\'s address', () => {
  assert.equal(canReview('moderator'), true)
  assert.equal(canReview('founder'), true)
  assert.equal(canReview('user'), false)
  // Feedback arrives through /api/support from a public, unauthenticated form:
  // the address was handed to the site owner, not to a volunteer, and is not
  // verified to belong to the sender.
  assert.equal(canSeeReporterEmail('founder'), true)
  assert.equal(canSeeReporterEmail('moderator'), false)
})

test('a person who cannot review is told what the situation is, not "denied"', () => {
  assert.match(accessNotice('user', { signedIn: false }), /Sign in/)
  assert.match(accessNotice('user'), /not a moderator/)
  assert.equal(accessNotice('moderator'), '')
  assert.equal(accessNotice('founder'), '')
})

// ── The two copies of the predicate agree ───────────────────────────────────

// Why there are two copies at all: NO file under api/ imports from src/ today,
// so a serverless function that did would rely on Vercel's dependency tracing
// following a relative path out of the function root — behaviour this repo has
// never exercised and that cannot be verified from a local build, only from a
// deploy. A wrong guess throws at import time and takes the whole admin
// handshake down. The duplication is bought back with this test, which is
// strictly stronger than a shared import: a shared import can still be wrapped
// into disagreement at either call site.
const CLAIM_TABLE = [
  [{}, 'user'],
  [{ email_verified: true }, 'user'],
  [{ admin: true }, 'user'],
  [{ moderator: true }, 'user'],
  [{ admin: true, email_verified: true }, 'founder'],
  [{ moderator: true, email_verified: true }, 'moderator'],
  [{ moderator: true, emailVerified: true }, 'moderator'],
  [{ admin: true, moderator: true, email_verified: true }, 'founder'],
  [{ admin: false, moderator: true, email_verified: true }, 'moderator'],
  [{ admin: 'yes', email_verified: true }, 'user'],
]

test('the browser and the server resolve every claim shape identically', () => {
  for (const [claims, expected] of CLAIM_TABLE) {
    const client = roleFromClaims(claims)
    const server = serverRoleFromClaims(claims)
    assert.equal(client, expected, `client got ${client} for ${JSON.stringify(claims)}`)
    assert.equal(server, client, `server got ${server}, client got ${client} for ${JSON.stringify(claims)}`)
  }
})

test('the agreement table actually distinguishes the three roles', () => {
  // POSITIVE CONTROL. Two functions that both returned 'user' unconditionally
  // would pass the test above, and it would be measuring nothing. Every role
  // has to be reachable from this table for the agreement to mean anything.
  const produced = new Set(CLAIM_TABLE.map(([claims]) => roleFromClaims(claims)))
  assert.deepEqual([...produced].sort(), ['founder', 'moderator', 'user'])
})

test('the claim NAMES match across the boundary too, not just the logic', () => {
  // Identical logic reading differently-spelled claims would agree on every
  // shape in the table above and still disagree in production.
  assert.equal(MODERATOR_CLAIM, SERVER_MODERATOR_CLAIM)
  assert.equal(FOUNDER_CLAIM, SERVER_FOUNDER_CLAIM)
  assert.equal(FOUNDER_CLAIM, 'admin', 'firestore.rules gates on request.auth.token.admin')
})

test('the founder allowlist outranks a missing claim, but not a missing verification', () => {
  // The allowlist is the stronger fact server-side: it does not depend on a
  // claim having been minted yet. It still requires a Firebase-verified email.
  assert.equal(isFounderEmail('dylanjacob1100@gmail.com'), true)
  assert.equal(isFounderEmail(' DylanJacob1100@Gmail.com '), true)
  assert.equal(isFounderEmail('someone@example.com'), false)
  assert.equal(roleFromDecodedToken({ email: 'dylanjacob1100@gmail.com', email_verified: true }), 'founder')
  assert.equal(roleFromDecodedToken({ email: 'dylanjacob1100@gmail.com', email_verified: false }), 'user')
  assert.equal(roleFromDecodedToken(null), 'user')
})

test('the roster is keyed by uid, because an email can change hands', () => {
  // An email can be changed by its owner and re-registered by somebody else
  // after an account is deleted; a uid is stable for the life of the account
  // and is what the claim is minted against.
  const e = rosterEntry({ uid: 'u1', email: ' A@B.COM ', displayName: ' Alex ', grantedByUid: 'f1' })
  assert.equal(e.uid, 'u1')
  assert.equal(e.email, 'a@b.com')
  assert.equal(e.displayName, 'Alex')
  assert.equal(e.grantedByUid, 'f1')
  assert.equal(rosterEntry({ email: 'a@b.com' }), null, 'no uid is not a roster entry')
  // A uid that is not a string would key the roster document by something
  // Firestore stringifies on the way in and nothing looks up on the way out.
  for (const bad of [123, true, {}, ['u1']]) {
    assert.equal(rosterEntry({ uid: bad }), null, `${JSON.stringify(bad)} is not a uid`)
  }
})

// ── Triage decisions ────────────────────────────────────────────────────────

test('a decision writes three fields and never echoes the submitter', () => {
  // These documents arrive from /api/support, which takes subject, message and
  // email from a public form with no session at all. A decision that spread the
  // item back in would let that form overwrite the stored record on every click.
  const d = feedbackDecision('done', 'u9', new Date('2026-09-05T10:00:00Z'))
  assert.deepEqual(Object.keys(d).sort(), ['reviewedBy', 'status', 'updatedAt'])
  assert.equal(d.status, 'done')
  assert.equal(d.reviewedBy, 'u9')
  assert.equal(d.updatedAt, '2026-09-05T10:00:00.000Z')
})

test('a decision refuses a status a reviewer cannot set', () => {
  assert.throws(() => feedbackDecision('approved', 'u9'), /Not a feedback status/)
  assert.throws(() => feedbackDecision(undefined, 'u9'), /Not a feedback status/)
  assert.equal(isFeedbackStatus('in-progress'), true)
  assert.equal(isFeedbackStatus('deleted'), false)
})

test('an unattributed decision records null rather than undefined', () => {
  assert.equal(feedbackDecision('new', null).reviewedBy, null)
  assert.equal(feedbackDecision('new', undefined).reviewedBy, null)
})

test('the triage cycle survives a document written before the vocabulary', () => {
  assert.equal(nextFeedbackStatus('new'), 'in-progress')
  assert.equal(nextFeedbackStatus('in-progress'), 'done')
  assert.equal(nextFeedbackStatus('done'), 'new')
  assert.equal(nextFeedbackStatus('nonsense'), 'new')
  assert.equal(nextFeedbackStatus(undefined), 'new')
})

test('an unread queue counts null, never zero', () => {
  // The most expensive confusion available on a review surface, and the same
  // fault the admin dashboard's aggregate block was already fixed for.
  assert.deepEqual(pendingCounts({ submissions: null, feedback: null }), { submissions: null, feedback: null })
  assert.deepEqual(pendingCounts({ submissions: [], feedback: [] }), { submissions: 0, feedback: 0 })
  assert.deepEqual(
    pendingCounts({
      submissions: [{ status: 'pending' }, { status: 'approved' }],
      feedback: [{ status: 'new' }, { status: 'done' }],
    }),
    { submissions: 1, feedback: 1 },
  )
})

// ── THE CALL SITES ──────────────────────────────────────────────────────────
//
// Everything above passes if these modules are never imported by anything.
// This repository has twice shipped a correct fix beside a test that exercised
// the helper in isolation, so reverting the actual call site passed the whole
// suite. These assertions name the wiring.

test('the feedback panel reads through the module that reports a refusal', () => {
  const src = read('src/pages/Admin.jsx')
  assert.match(src, /const fsFeedback = await listFeedback\(\)/,
    'Admin.jsx no longer reads feedback through utils/feedbackQueueApi')
  assert.ok(!/getDocs\(collection\(db, 'feedback'\)\)/.test(src),
    'the raw getDocs read is back, and it is the one that could not report a refusal')
  // The catch must SET something. An empty catch is the original bug: the
  // rules gate this read on the admin claim, so permission-denied rendered as
  // the localStorage list alone and a refused read looked exactly like an
  // empty collection.
  assert.match(src, /catch \(err\) \{[\s\S]{0,400}setFeedbackError\(/,
    'the feedback read swallows its error again')
  assert.match(src, /setServerFeedbackCount\(null\)/,
    'a refused read must record null, not 0 — "unread" and "empty" are different claims')
  // null is BOTH the initial value and the refused value, so the provenance
  // line must have a branch for it. Without one, the first paint renders an
  // empty count and NaN: `{null} from the server · {len - null} from this browser`.
  assert.match(src, /serverFeedbackCount === null \? \(/,
    'the provenance line has no branch for "not read yet" and will paint NaN')
})

test('a refused triage write is reverted and reported, not toasted as success', () => {
  const src = read('src/pages/Admin.jsx')
  assert.match(src, /await setFeedbackStatus\(id, status, reviewerUid\)/, 'the status write is unwired')
  assert.match(src, /await setFeedbackNotes\(id, notes, reviewerUid\)/, 'the notes write is unwired')
  assert.match(src, /await deleteFeedbackDoc\(id\)/, 'the delete is unwired')
  // The old shape updated local state, sent the write inside
  // `catch { /* offline */ }`, and fired the success toast unconditionally.
  // Scoped to the three handlers: the verify-admin effect further down the file
  // has its own catch for an unrelated reason, and a whole-file search would
  // pass or fail on that instead of on the thing under test.
  const start = src.indexOf('const handleStatusChange')
  const end = src.indexOf('const exportCSV')
  assert.ok(start > -1 && end > start, 'the triage handlers moved; this test is looking at nothing')
  const handlers = src.slice(start, end)
  assert.ok(!/catch \{ \/\* offline \*\/ \}/.test(handlers),
    'a triage write is swallowing its error again — a lying success is worse than a visible failure')
  // BOTH update handlers must revert, not just whichever one is read first —
  // an assertion that matches one occurrence passes while the other is broken.
  assert.equal((handlers.match(/setFeedback\(prev => prev\.map\(f => \(f\.id === id \? before : f\)\)\)/g) || []).length, 2,
    'a refused status or notes write no longer puts the row back the way the server has it')
  assert.match(handlers, /setFeedback\(before\)/,
    'a refused delete no longer puts the row back')
  const failureToasts = src.match(/toast\('Could not [^']+'\)/g) || []
  assert.equal(failureToasts.length, 3,
    `each of the three writes needs its own failure path; found ${failureToasts.length}`)
  assert.equal((src.match(/setWriteError\(String\(/g) || []).length, 3,
    'each of the three writes must report what the server said')
})

test('the dashboard decides from the token, not only from the bundled email list', () => {
  const src = read('src/pages/Admin.jsx')
  assert.match(src, /const \{ role, loading: roleLoading \} = useModerationRole\(\)/,
    'Admin.jsx no longer reads the server-verified role')
  assert.match(src, /const effectiveUnlocked = unlocked \|\| isAdminUser \|\| canReview\(role\)/,
    'the signed-claim path into the dashboard is gone')
  assert.match(src, /canSeeEmail=\{canSeeReporterEmail\(role\)\}/,
    'the reporter address is no longer gated on the role at the call site')
  assert.match(src, /\{item\.email && \(canSeeEmail/,
    'SubmissionCard ignores the permission it is handed')
  assert.match(src, /address withheld from moderators/,
    'a withheld address renders as nothing at all, which reads as a report with no sender')
})

test('the claim the server mints is finally read by the browser', () => {
  // /api/verify-admin has minted the `admin` claim and returned
  // `claimUpdated: true` since #241, and NOTHING in src/ ever read that field.
  // Minting server-side does not change the token the browser holds:
  // getIdToken() returns the cached one for up to an hour, so a first sign-in
  // read Firestore with a token that did not carry the claim and nothing ever
  // refreshed it.
  const hook = read('src/hooks/useModerationRole.js')
  assert.match(hook, /data\?\.claimUpdated === true/, 'claimUpdated is unread again')
  assert.match(hook, /getIdTokenResult\(force\)/, 'the token refresh is gone')
  assert.match(hook, /const fresh = await read\(true\)/,
    'nothing forces the refresh, so the freshly minted claim stays out of the token')
  // The route still returns the field. If this ever fails, the hook is reading
  // something the server stopped sending.
  assert.match(read('api/verify-admin.js'), /claimUpdated/,
    'verify-admin no longer reports whether it minted a claim')
})

test('no surface in the browser can grant itself a role', () => {
  // The roster is Admin-SDK-only and has no firestore.rules block, which is the
  // security property rather than an omission: Firestore denies by default, so
  // no browser can read the roster, enumerate who holds power here, or write
  // itself into it.
  // Naming either thing anywhere under src/ is an offence, because the only
  // reason client code would mention them is to reach them.
  const NAMES = /['"`]moderators['"`]|setCustomUserClaims/
  // One exception, and it is a documented file rather than a hole:
  // src/data/pipeline.js is the engineering log. Its notes are prose inside
  // string literals and are never behaviour, so a note that NAMES an API must
  // not trip the guard — otherwise the guard quietly pressures every future
  // agent into writing a vaguer note. It is held to a call-shaped test instead,
  // which is what an actual escalation would look like.
  const CALL_SHAPED = /setCustomUserClaims\s*\(|(?:collection|doc)\(\s*db\s*,\s*['"`]moderators['"`]/
  const LOG = 'src/data/pipeline.js'

  const offenders = []
  const walk = (dir) => {
    for (const entry of fs.readdirSync(path.join(process.cwd(), dir), { withFileTypes: true })) {
      const rel = `${dir}/${entry.name}`
      if (entry.isDirectory()) walk(rel)
      else if (/\.jsx?$/.test(entry.name) && (rel === LOG ? CALL_SHAPED : NAMES).test(read(rel))) {
        offenders.push(rel)
      }
    }
  }
  walk('src')
  assert.deepEqual(offenders, [],
    `client code must never touch the moderator roster or mint a claim: ${offenders.join(', ')}`)

  // The exception is not a hiding place: prove the call-shaped pattern still
  // catches every escalation it is meant to, so the log file cannot become the
  // one place in src/ where a real call would pass.
  for (const escalation of [
    "await setCustomUserClaims(uid, { moderator: true })",
    "setCustomUserClaims (uid, {})",
    "await setDoc(doc(db, 'moderators', uid), {})",
    'await getDocs(collection(db, "moderators"))',
  ]) {
    assert.ok(CALL_SHAPED.test(escalation), `the log exception would let this through: ${escalation}`)
  }
  // ...and that prose naming the API is what it lets past, deliberately.
  assert.ok(!CALL_SHAPED.test('a fix for setCustomUserClaims REPLACING the claims object'),
    'the log exception is not actually letting prose through, so it does nothing')
})

test('the server module costs nothing against the 12-function budget', () => {
  // Both tests/unit/account-deletion.test.js and tests/unit/ai-provider-path.test.js
  // read api/ and fail the build on a 13th route. Neither sees this file: they
  // list the top level only and filter on .js, and this lives inside api/_lib/,
  // which is a directory and is not deployed as a function.
  assert.ok(fs.existsSync(path.join(process.cwd(), 'api/_lib/moderators.js')))
  const routes = fs.readdirSync(path.join(process.cwd(), 'api')).filter((f) => f.endsWith('.js'))
  assert.ok(routes.length <= 12, `api/ holds ${routes.length} routes: ${routes.join(', ')}`)
  assert.ok(!routes.includes('moderators.js'), 'the roster became a deployed route')
})

test('the triage vocabulary has exactly one definition', () => {
  const src = read('src/pages/Admin.jsx')
  assert.match(src, /const STATUSES = FEEDBACK_STATUSES/, 'Admin.jsx defines its own status list again')
  assert.match(src, /const STATUS_LABELS = FEEDBACK_STATUS_LABELS/, 'Admin.jsx defines its own labels again')
  // The strings a reviewer reads did not change when they moved.
  assert.equal(FEEDBACK_STATUS_LABELS['in-progress'], 'In Progress')
  assert.deepEqual([...FEEDBACK_STATUSES], ['new', 'in-progress', 'done'])
})

test('the two founder-gated files stay founder-gated, and AuthContext stays untouched', () => {
  // Approving a change does not un-gate the file. api/verify-admin.js and
  // firestore.rules are both applied by `npm run apply:gated` now, and the next
  // agent to reach for either one still needs the founder's say-so, so the doc
  // must still list all three.
  const gated = read('docs/reference/human-validation-zones.md')
  assert.match(gated, /api\/verify-admin\.js/, 'verify-admin is no longer founder-gated')
  assert.match(gated, /firestore\.rules/, 'firestore.rules is no longer founder-gated')
  assert.match(gated, /src\/contexts\/AuthContext\.jsx/, 'AuthContext is no longer founder-gated')
  // AuthContext was NOT part of the role at all: it is read through a hook that
  // goes straight to auth.currentUser, exactly so this file did not have to
  // change and no branch would ever have to try to stage it.
  assert.ok(!/moderat/i.test(read('src/contexts/AuthContext.jsx')),
    'AuthContext.jsx was modified for the role — it is founder-gated')
})

// ═══════════════════════════════════════════════════════════════════════════
// THE ROUTE THAT MINTS THE CLAIM
// ═══════════════════════════════════════════════════════════════════════════
//
// api/verify-admin.js is founder-gated AND refused by the auto-mode classifier,
// so the roster half of it lives as a committed, unapplied diff that
// `npm run apply:gated` puts in (docs/design/moderator-verify-admin.patch).
//
// EVERY TEST BELOW RUNS THE PATCHED SOURCE, not a description of it. The text
// comes from the same registry the applier reads — so a test here cannot pass
// against behaviour the patch does not contain — and because an already-applied
// patch is skipped and returns the same text, all of this holds identically on
// both sides of the command.
//
// It is EXECUTED rather than pattern-matched, through the vm harness
// tests/unit/ai-provider-path.test.js already uses for api/ai.js. Regexes over
// a security route prove that a line is present; they cannot prove that a
// non-founder is refused, and "the 403 is written down somewhere in the file"
// is not the property worth having. api/_lib/moderators.js is executed in the
// SAME context, so the claim merging and the roster ordering under test are the
// real ones and not a second implementation written to agree.

const ROUTE = 'api/verify-admin.js'
const ROSTER_MODULE = 'api/_lib/moderators.js'

const routeSource = await fileTextThrough('moderator-role', ROUTE)
const rosterSource = fs.readFileSync(path.join(process.cwd(), ROSTER_MODULE), 'utf8')

const FOUNDER_EMAIL = 'dylanjacob1100@gmail.com'
const FOUNDER_UID = 'founder-uid'

/** Every import stripped, every export unwrapped — the ai.js harness's rule. */
function flatten(source, label) {
  let out = source
  const IMPORT = /^import\s[\s\S]*?\sfrom\s+'[^']+'\r?\n/m
  let imports = 0
  while (IMPORT.test(out)) { out = out.replace(IMPORT, ''); imports += 1 }
  assert.ok(imports >= 1, `${label} has no imports; the harness expected its _lib block`)
  assert.ok(!/^\s*import\s/m.test(out), `${label} still has an import the harness did not strip`)
  out = out.replace(/^export default async function handler/m, 'async function handler')
  while (/^export (const|function|async function) /m.test(out)) {
    out = out.replace(/^export (const|function|async function) /m, '$1 ')
  }
  assert.ok(!/^\s*export\s/m.test(out), `${label} still has an export the harness did not strip`)
  return out
}

/**
 * Run the patched route against an in-memory Firebase.
 *
 * @param {object} opts
 * @param {object[]} opts.roster    documents in the `moderators` collection
 * @param {object} opts.accounts    uid → { email, emailVerified, displayName, customClaims }
 * @param {boolean} opts.rosterFails make every roster read throw
 */
function loadRoute({ roster = [], accounts = {}, rosterFails = false } = {}) {
  const body = `(function(){\n${flatten(rosterSource, ROSTER_MODULE)}\n${flatten(routeSource, ROUTE)}\n;return { handler };\n})()`

  // ── the ledgers ──
  const rosterDocs = new Map(roster.map((d) => [d.uid, { ...d }]))
  const users = new Map(Object.entries(accounts).map(([uid, u]) => [uid, {
    uid, email: u.email || null, displayName: u.displayName || null,
    emailVerified: u.emailVerified !== false,
    customClaims: { ...(u.customClaims || {}) },
  }]))
  const claimWrites = []
  const errors = []

  const collection = (name) => {
    if (name !== 'moderators') throw new Error(`the harness only models the roster, not ${name}`)
    return {
      async get() {
        if (rosterFails) throw new Error('Firestore is unavailable')
        return { docs: [...rosterDocs.entries()].map(([id, data]) => ({ id, data: () => data })) }
      },
      doc: (id) => ({
        async get() {
          if (rosterFails) throw new Error('Firestore is unavailable')
          return { exists: rosterDocs.has(id) }
        },
        async set(data) {
          if (rosterFails) throw new Error('Firestore is unavailable')
          rosterDocs.set(id, data)
        },
        async delete() {
          if (rosterFails) throw new Error('Firestore is unavailable')
          rosterDocs.delete(id)
        },
      }),
    }
  }

  const sandbox = {
    console: { error: (...a) => errors.push(a.map(String).join(' ')), log() {}, warn() {} },
    ADMIN_EMAILS: [FOUNDER_EMAIL],
    credentialProblem: () => null,
    adminDb: () => ({ collection }),
    adminAuth: () => ({
      verifyIdToken: async () => { throw new Error('the harness calls the handler with a decoded token') },
      async getUser(uid) {
        const u = users.get(uid)
        if (!u) throw new Error(`there is no user record for ${uid}`)
        return { ...u, customClaims: { ...u.customClaims } }
      },
      async setCustomUserClaims(uid, claims) {
        claimWrites.push({ uid, claims: { ...claims } })
        const u = users.get(uid)
        if (!u) throw new Error(`there is no user record for ${uid}`)
        u.customClaims = { ...claims }
      },
      listUsers: async () => { throw new Error('not modelled here') },
    }),
  }

  const api = vm.runInNewContext(body, sandbox, { filename: ROUTE })

  const response = () => ({
    statusCode: 200, headers: {}, body: undefined,
    status(code) { this.statusCode = code; return this },
    json(payload) { this.body = payload; return this },
    setHeader(k, v) { this.headers[k] = v },
    end() { return this },
  })

  /**
   * One handshake. `decoded` is what verifyIdToken resolved to — the harness
   * hands it straight in, because what this file is about is what the route
   * DECIDES from a verified token, not Firebase's verification of it.
   */
  const handshake = async (decoded, reqBody = {}) => {
    // The route reads the decoded token out of the verifier, so the verifier is
    // what the harness swaps per call.
    sandbox.adminAuth = ((real) => () => ({ ...real(), verifyIdToken: async () => decoded }))(sandbox.adminAuth)
    const res = response()
    await api.handler(
      { method: 'POST', headers: { authorization: 'Bearer token' }, body: reqBody },
      res,
    )
    return res
  }

  return {
    handshake,
    claimsOf: (uid) => ({ ...(users.get(uid)?.customClaims || {}) }),
    roster: () => [...rosterDocs.values()],
    claimWrites,
    errors,
  }
}

/** A verified token for somebody who is nobody in particular. */
const tokenFor = (uid, claims = {}) => ({
  uid, email: `${uid}@example.com`, email_verified: true, ...claims,
})
const founderToken = (claims = {}) => ({
  uid: FOUNDER_UID, email: FOUNDER_EMAIL, email_verified: true, ...claims,
})

/* ── Nobody but the founder may hand the role out ─────────────────────────── */

test('a NON-FOUNDER cannot appoint a moderator', async () => {
  // The 403 is the whole role. Without it, "moderator" is a name for
  // "anybody signed in".
  const app = loadRoute({ accounts: { 'stranger-uid': {}, 'target-uid': {} } })
  const res = await app.handshake(tokenFor('stranger-uid'), {
    moderatorAction: 'grant', targetUid: 'target-uid',
  })
  assert.equal(res.statusCode, 403)
  assert.match(res.body.error, /Only the founder may assign moderators/)
  // ...and the refusal is a refusal, not a message printed after the fact.
  assert.deepEqual(app.roster(), [], 'the roster was written by somebody who was refused')
  assert.deepEqual(app.claimsOf('target-uid'), {}, 'a claim was minted by somebody who was refused')
})

test('a MODERATOR cannot appoint a moderator — the role does not self-replicate', async () => {
  // The single most important line in src/utils/moderation.js, at the server
  // boundary. One careless or compromised moderator account must not become
  // every moderator account.
  const app = loadRoute({
    roster: [{ uid: 'mod-uid', email: 'mod-uid@example.com' }],
    accounts: { 'mod-uid': { customClaims: { moderator: true } }, 'target-uid': {} },
  })
  const res = await app.handshake(tokenFor('mod-uid', { moderator: true }), {
    moderatorAction: 'grant', targetUid: 'target-uid',
  })
  assert.equal(res.statusCode, 403)
  assert.equal(res.body.role, 'moderator', 'the refusal should still tell them what they are')
  assert.deepEqual(app.roster().map((d) => d.uid), ['mod-uid'], 'a moderator appointed a moderator')
  assert.deepEqual(app.claimsOf('target-uid'), {})
})

test('the ADMIN CLAIM does not open the door — only the verified email allowlist does', async () => {
  // The gate is `isAdmin`, which is a Firebase-verified email checked against a
  // server-side allowlist, NOT `decoded.admin`. Administering the claim system
  // must not depend on the claim system: an account that somehow carried
  // `admin: true` without being on the allowlist would otherwise be able to
  // appoint its way to permanence.
  const app = loadRoute({ accounts: { 'forged-uid': { customClaims: { admin: true } }, 'target-uid': {} } })
  const res = await app.handshake(tokenFor('forged-uid', { admin: true }), {
    moderatorAction: 'grant', targetUid: 'target-uid',
  })
  assert.equal(res.statusCode, 403)
  assert.deepEqual(app.roster(), [])
})

test('an UNVERIFIED founder email is not the founder', async () => {
  const app = loadRoute({ accounts: { [FOUNDER_UID]: { email: FOUNDER_EMAIL }, 'target-uid': {} } })
  const res = await app.handshake(
    { uid: FOUNDER_UID, email: FOUNDER_EMAIL, email_verified: false },
    { moderatorAction: 'grant', targetUid: 'target-uid' },
  )
  assert.equal(res.statusCode, 403)
  assert.deepEqual(app.roster(), [])
})

test('the founder CAN appoint one — the positive control the refusals need', async () => {
  // Every "cannot" above would pass just as happily against a route that
  // refused everybody, which would be a moderator role that does not exist.
  const app = loadRoute({
    accounts: {
      [FOUNDER_UID]: { email: FOUNDER_EMAIL, customClaims: { admin: true } },
      'target-uid': { email: 'Helper@Example.com', displayName: 'Helper' },
    },
  })
  const res = await app.handshake(founderToken({ admin: true }), {
    moderatorAction: 'grant', targetUid: 'target-uid',
  })
  assert.equal(res.statusCode, 200)
  assert.equal(res.body.granted.uid, 'target-uid')
  assert.deepEqual(app.roster().map((d) => d.uid), ['target-uid'])
  assert.equal(app.claimsOf('target-uid').moderator, true, 'the roster gained a name and no claim')
})

test('the granter comes from the verified token, so the audit trail cannot be forged', async () => {
  const app = loadRoute({
    accounts: {
      [FOUNDER_UID]: { email: FOUNDER_EMAIL },
      'target-uid': { email: 'helper@example.com' },
    },
  })
  await app.handshake(founderToken(), {
    moderatorAction: 'grant', targetUid: 'target-uid', grantedByUid: 'somebody-else',
  })
  assert.equal(app.roster()[0].grantedByUid, FOUNDER_UID,
    'the granter was taken from the request body')
})

test('the roster records who the uid ACTUALLY is, not what the body claimed', async () => {
  const app = loadRoute({
    accounts: {
      [FOUNDER_UID]: { email: FOUNDER_EMAIL },
      'target-uid': { email: 'Real.Person@Example.com', displayName: 'Real Person' },
    },
  })
  await app.handshake(founderToken(), {
    moderatorAction: 'grant', targetUid: 'target-uid',
    email: 'someone.else@example.com', displayName: 'Someone Else',
  })
  const entry = app.roster()[0]
  assert.equal(entry.email, 'real.person@example.com')
  assert.equal(entry.displayName, 'Real Person')
})

test('an account that has not verified its email is refused the role', async () => {
  // firestore.rules reads the RAW `moderator` claim and has no notion of a
  // verified email — tests/rules/firestore-rules.test.js proves that directly.
  // roleFromClaims, on both sides of the api/ ↔ src/ boundary, refuses any role
  // above `user` without one. Minting the claim onto an unverified account
  // would therefore hand Firestore write access to somebody every JavaScript
  // surface calls a plain user. The mint site is the only place that can
  // reconcile the two, so it refuses.
  const app = loadRoute({
    accounts: {
      [FOUNDER_UID]: { email: FOUNDER_EMAIL },
      'target-uid': { email: 'helper@example.com', emailVerified: false },
    },
  })
  const res = await app.handshake(founderToken(), {
    moderatorAction: 'grant', targetUid: 'target-uid',
  })
  assert.equal(res.statusCode, 400)
  assert.match(res.body.error, /verified email/)
  assert.deepEqual(app.roster(), [], 'an unverified account was put on the roster')
  assert.deepEqual(app.claimsOf('target-uid'), {}, 'an unverified account was given the claim')
})

test('only the founder may even read the list of who holds power here', async () => {
  const app = loadRoute({
    roster: [{ uid: 'mod-uid', email: 'mod-uid@example.com' }],
    accounts: { 'mod-uid': { customClaims: { moderator: true } } },
  })
  const res = await app.handshake(tokenFor('mod-uid', { moderator: true }), { moderatorAction: 'list' })
  assert.equal(res.statusCode, 403)
  assert.equal(res.body.moderators, undefined, 'the roster leaked to somebody who was refused')
})

test('an action nobody wrote is refused rather than ignored', async () => {
  const app = loadRoute({ accounts: { [FOUNDER_UID]: { email: FOUNDER_EMAIL } } })
  const res = await app.handshake(founderToken(), { moderatorAction: 'promote' })
  assert.equal(res.statusCode, 400)
  assert.match(res.body.error, /Unknown moderatorAction/)
})

/* ── Revocation ───────────────────────────────────────────────────────────── */

test('a REVOKED moderator loses the claim on the next handshake', async () => {
  // Revocation drops the claim at the moment it happens; this is what catches
  // the account that was not signed in then, and the account whose claim
  // outlived the roster for any other reason. Without it the roster is a list
  // and the claim is the truth, which is the wrong way round.
  const app = loadRoute({
    roster: [], // taken off
    accounts: { 'ex-mod': { customClaims: { moderator: true } } },
  })
  const res = await app.handshake(tokenFor('ex-mod', { moderator: true }))
  assert.equal(res.statusCode, 200)
  assert.equal(res.body.moderator, false, 'the handshake still says they are a moderator')
  assert.equal(res.body.role, 'user', 'the role was read from the stale token, not the roster')
  assert.equal(res.body.claimUpdated, true, 'the browser is not told to refresh its token')
  assert.deepEqual(app.claimsOf('ex-mod'), {}, 'the claim is still on the account')
})

test('a moderator whose claim went missing gets it back by signing in', async () => {
  const app = loadRoute({
    roster: [{ uid: 'mod-uid', email: 'mod-uid@example.com' }],
    accounts: { 'mod-uid': { customClaims: {} } },
  })
  const res = await app.handshake(tokenFor('mod-uid'))
  assert.equal(res.body.moderator, true)
  assert.equal(res.body.role, 'moderator')
  assert.equal(app.claimsOf('mod-uid').moderator, true)
})

test('the reconciliation is idempotent — an unchanged claim is not rewritten', async () => {
  // setCustomUserClaims costs a write and forces a token refresh on every call.
  const app = loadRoute({
    roster: [{ uid: 'mod-uid' }],
    accounts: { 'mod-uid': { customClaims: { moderator: true } } },
  })
  const res = await app.handshake(tokenFor('mod-uid', { moderator: true }))
  assert.equal(res.body.moderator, true)
  assert.equal(res.body.claimUpdated, false)
  assert.deepEqual(app.claimWrites, [], 'the claim was rewritten when nothing had changed')
})

test('revoking says out loud that it is not instant', async () => {
  // An ID token already minted stays valid for up to an hour. A response that
  // said "revoked" and meant "revoked in up to an hour" is the same class of
  // lie as the success toast this item already removed from the triage writes.
  const app = loadRoute({
    roster: [{ uid: 'mod-uid' }],
    accounts: { [FOUNDER_UID]: { email: FOUNDER_EMAIL }, 'mod-uid': { customClaims: { moderator: true } } },
  })
  const res = await app.handshake(founderToken(), { moderatorAction: 'revoke', targetUid: 'mod-uid' })
  assert.equal(res.statusCode, 200)
  assert.match(res.body.note, /up to an hour/)
  assert.deepEqual(app.roster(), [], 'the roster still lists them')
  assert.deepEqual(app.claimsOf('mod-uid'), {}, 'the claim survived the revocation')
})

/* ── The two claims must not delete each other ────────────────────────────── */

test('minting the ADMIN claim does not clobber an existing moderator claim', async () => {
  // setCustomUserClaims REPLACES the whole claims object. A blind
  // `{ admin: true }` — which is what this route did until this patch — would
  // delete the founder's own `moderator` claim the moment he held one.
  const app = loadRoute({
    roster: [{ uid: FOUNDER_UID }],
    accounts: { [FOUNDER_UID]: { email: FOUNDER_EMAIL, customClaims: { moderator: true } } },
  })
  const res = await app.handshake(founderToken({ moderator: true }))
  assert.equal(res.statusCode, 200)
  const claims = app.claimsOf(FOUNDER_UID)
  assert.equal(claims.admin, true, 'the admin claim was not minted')
  assert.equal(claims.moderator, true, 'minting admin deleted the moderator claim')
})

test('minting the MODERATOR claim does not clobber an existing admin claim', async () => {
  // The same hazard in the other direction, in api/_lib/moderators.js.
  const app = loadRoute({
    accounts: {
      [FOUNDER_UID]: { email: FOUNDER_EMAIL, customClaims: { admin: true } },
      'second-founder': { email: 'second@example.com', customClaims: { admin: true } },
    },
  })
  await app.handshake(founderToken({ admin: true }), {
    moderatorAction: 'grant', targetUid: 'second-founder',
  })
  const claims = app.claimsOf('second-founder')
  assert.equal(claims.moderator, true, 'the moderator claim was not minted')
  assert.equal(claims.admin, true, 'minting moderator deleted the admin claim')
})

test('a dropped moderator claim is removed rather than stored as false', async () => {
  // A present-but-false claim and an absent one mean the same thing to
  // roleFromClaims, and custom claims share a 1000-byte token budget.
  const app = loadRoute({ roster: [], accounts: { 'ex-mod': { customClaims: { moderator: true, admin: true } } } })
  await app.handshake(tokenFor('ex-mod', { moderator: true, admin: true }))
  const claims = app.claimsOf('ex-mod')
  assert.ok(!('moderator' in claims), 'the dropped claim is stored as false instead of removed')
  assert.equal(claims.admin, true, 'dropping the moderator claim took the admin claim with it')
})

/* ── A roster that cannot be read ─────────────────────────────────────────── */

test('a roster read that fails does not take the handshake down', async () => {
  // Verification has already succeeded by this point. A Firestore blip must not
  // turn a valid sign-in into a 500 — the same reasoning the admin claim grant
  // above already carries, and the same reasoning behind `usersError`.
  const app = loadRoute({
    rosterFails: true,
    accounts: { [FOUNDER_UID]: { email: FOUNDER_EMAIL, customClaims: { admin: true } } },
  })
  const res = await app.handshake(founderToken({ admin: true }))
  assert.equal(res.statusCode, 200, 'a roster failure took the whole admin handshake down')
  assert.equal(res.body.isAdmin, true)
  // ...and it says so, rather than reporting a verdict it never reached.
  assert.ok(res.body.rosterError, 'the failure was swallowed — an unreached verdict reads as a negative one')
  assert.ok(app.errors.some((e) => /reconcile the moderator claim/.test(e)))
})

test('a roster read that fails GRANTS NOTHING', async () => {
  const app = loadRoute({ rosterFails: true, accounts: { 'nobody-uid': { customClaims: {} } } })
  const res = await app.handshake(tokenFor('nobody-uid'))
  assert.equal(res.statusCode, 200)
  assert.equal(res.body.moderator, false, 'an unreadable roster answered yes')
  assert.equal(res.body.role, 'user')
  assert.deepEqual(app.claimWrites, [], 'a claim was minted from a roster nobody could read')
  assert.deepEqual(app.claimsOf('nobody-uid'), {})
})

test('a roster read that fails does not knock a live moderator out either', async () => {
  // The fallback is what Firebase already SIGNED into this token, which the
  // rules would honour with or without this route: no new authority, and no
  // volunteer losing their queues to a transient error.
  const app = loadRoute({ rosterFails: true, accounts: { 'mod-uid': { customClaims: { moderator: true } } } })
  const res = await app.handshake(tokenFor('mod-uid', { moderator: true }))
  assert.equal(res.body.moderator, true)
  assert.equal(res.body.role, 'moderator')
  assert.deepEqual(app.claimWrites, [])
})

test('a roster write that fails is reported, not reported as a success', async () => {
  const app = loadRoute({
    rosterFails: true,
    accounts: { [FOUNDER_UID]: { email: FOUNDER_EMAIL }, 'target-uid': { email: 'x@example.com' } },
  })
  const res = await app.handshake(founderToken(), { moderatorAction: 'grant', targetUid: 'target-uid' })
  assert.equal(res.statusCode, 500)
  assert.ok(res.body.error)
  assert.equal(res.body.granted, undefined)
})

/* ── The handshake everybody else gets ────────────────────────────────────── */

test('an ordinary sign-in still gets an ordinary answer, carrying its role', async () => {
  // The control for the whole section: none of the above may have turned the
  // handshake into something only a founder can complete.
  const app = loadRoute({ accounts: { 'nobody-uid': { customClaims: {} } } })
  const res = await app.handshake(tokenFor('nobody-uid'))
  assert.equal(res.statusCode, 200)
  assert.equal(res.body.isAdmin, false)
  assert.equal(res.body.uid, 'nobody-uid')
  assert.equal(res.body.role, 'user')
  assert.equal(res.body.moderator, false)
  assert.equal(res.body.rosterError, null)
})

test('the role is folded into a route that already exists, not a 13th', () => {
  const routes = fs.readdirSync(path.join(process.cwd(), 'api')).filter((f) => f.endsWith('.js'))
  assert.equal(routes.length, 12, `api/ holds ${routes.length} routes: ${routes.join(', ')}`)
  assert.ok(!routes.some((f) => /moderator/i.test(f)), 'the roster took a route of its own')
})

// ═══════════════════════════════════════════════════════════════════════════
// THE ASSIGNMENT SURFACE
// ═══════════════════════════════════════════════════════════════════════════
//
// A role the founder cannot hand out is still inert, so these pin the UI that
// hands it out. src/pages/Admin.jsx is NOT gated, so unlike the two files above
// it lands in the tree directly — which is exactly why it has to be honest
// about the route it depends on not being applied yet.

test('the founder can actually assign the role from the Users tab', () => {
  const src = read('src/pages/Admin.jsx')
  assert.match(src, /<UsersPanel localUsers=\{data\.users\} toast=\{toast\} role=\{role\} \/>/,
    'UsersPanel is no longer told what role the viewer holds, so it cannot offer the action')
  assert.match(src, /moderatorAction: 'list'/, 'the roster is never read')
  assert.match(src, /moderatorAction: grant \? 'grant' : 'revoke', targetUid: u\.uid/,
    'the grant/revoke call is gone — the role cannot be handed out')
  assert.match(src, /\{canAssignModerators\(role\) && <th>Moderator<\/th>\}/,
    'the Moderator column is no longer gated on the role')
  // The controls are offered to a founder only. A moderator reaching this tab
  // must not even see the affordance, and must not request the roster.
  assert.match(src, /if \(!canAssignModerators\(role\)\) return/,
    'a non-founder now requests the list of everyone who holds power here')
})

test('an unread roster renders as unknown, never as "nobody is a moderator"', () => {
  // The same distinction the feedback panel was fixed for, in the place where
  // getting it wrong makes the founder appoint somebody already appointed.
  const src = read('src/pages/Admin.jsx')
  assert.match(src, /const \[roster, setRoster\] = useState\(null\)/, 'the roster no longer starts unread')
  assert.match(src, /rosterError \? 'unknown' : 'checking…'/,
    'an unread roster renders as a decided answer')
  assert.ok(!/setRoster\(new Set\(\)\)/.test(src),
    'a failed read substitutes an empty roster, which reads as "nobody holds the role"')
})

test('the surface states what the role withholds, not only what it grants', () => {
  const src = read('src/pages/Admin.jsx')
  assert.match(src, /They cannot see a reporter/, 'the limits of the role are no longer stated where it is granted')
  assert.match(src, /appoint another moderator/, 'the self-replication limit is unstated')
  assert.match(src, /up to an hour/, 'the revocation delay is hidden from the person doing the revoking')
})

test('revoking asks first, and the founder is never offered the role', () => {
  const src = read('src/pages/Admin.jsx')
  assert.match(src, /setConfirmRevoke\(u\.uid\)/, 'removing a moderator no longer asks for confirmation')
  assert.match(src, /isFounderRow\(u\)/, 'the founder is offered a role that is less than he already has')
  assert.match(src, /const isFounderRow = \(u\) => isAdminEmail\(u\?\.email\)/,
    'the founder row is decided by something other than the shared allowlist helper')
})

test('a refused grant is reported rather than assumed', () => {
  const src = read('src/pages/Admin.jsx')
  assert.match(src, /if \(!res\.ok\) throw new Error\(data\.error \|\| `Server returned \$\{res\.status\}`\)/,
    'a refused grant is treated as success')
  assert.match(src, /await loadRoster\(\)/,
    'the roster is patched locally instead of re-read, so the screen can disagree with the server')
  assert.match(src, /Could not grant the role — the server refused/, 'a failed grant no longer says so')
})

// ── The honest degradation ──────────────────────────────────────────────────
//
// THIS IS THE HALF THAT IS EASY TO GET WRONG. src/pages/Admin.jsx ships today;
// api/verify-admin.js does not ship until the founder runs `npm run apply:gated`
// and redeploys. In between, the UNPATCHED route ignores `moderatorAction`
// entirely and falls through to its ordinary 200 — so a "Make moderator" button
// wired straight to `res.ok` would report a grant that never happened, on the
// one screen in this product where a false success is a security statement.

test('the surface knows whether the route can grant the role at all', () => {
  // The probe is a POSITIVE signal from the patched route — `role` is a string
  // on every one of its exits and is absent from every exit of the unpatched
  // one — rather than the absence of an error, which a 200 does not give.
  const src = read('src/pages/Admin.jsx')
  assert.equal((src.match(/typeof data\.role !== 'string'/g) || []).length, 2,
    'the patched route is not told from the unpatched one on BOTH calls — the roster '
    + 'read and the write — so a grant that silently did nothing reads as a grant that worked')
  assert.match(src, /const \[roleEnabled, setRoleEnabled\] = useState\(null\)/,
    'whether the route is applied is not held as its own three-state fact')
  // The probe must be a POSITIVE signal from the patched route. `res.ok` is
  // true for the unpatched one too — that is the entire trap.
  assert.ok(!/if \(!res\.ok\) \{\s*setRoleEnabled\(false\)/.test(src),
    'the surface decides the route is unapplied from an error, and the unpatched route does not error')
})

test('with the route unapplied the founder is told, and offered no button that lies', () => {
  const src = read('src/pages/Admin.jsx')
  assert.match(src, /The moderator role is not switched on yet/,
    'the not-yet-applied state says nothing, so a missing column reads as a bug')
  assert.match(src, /npm run apply:gated/,
    'the founder is told the role is off and not told the one command that turns it on')
  assert.match(src, /roleEnabled === false\s*\?\s*<span[^>]*>not switched on<\/span>/,
    'a row still offers "Make moderator" against a route that would ignore it')
})
