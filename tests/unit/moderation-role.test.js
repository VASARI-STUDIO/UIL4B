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
// This file tests three things, in ascending order of what they have caught:
//
//   1. The predicate, on both sides of the api/ ↔ src/ boundary.
//   2. That the two copies of it AGREE, by running both over one table.
//   3. THE CALL SITES. A predicate that is right and unwired is worth nothing,
//      and this repository has shipped that exact shape twice. Reverting the
//      wiring in Admin.jsx has to fail this file.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

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
  const offenders = []
  const walk = (dir) => {
    for (const entry of fs.readdirSync(path.join(process.cwd(), dir), { withFileTypes: true })) {
      const rel = `${dir}/${entry.name}`
      if (entry.isDirectory()) walk(rel)
      else if (/\.jsx?$/.test(entry.name) && /['"`]moderators['"`]|setCustomUserClaims/.test(read(rel))) {
        offenders.push(rel)
      }
    }
  }
  walk('src')
  assert.deepEqual(offenders, [],
    `client code must never touch the moderator roster or mint a claim: ${offenders.join(', ')}`)
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

test('the moderator claim is understood everywhere but granted nowhere yet', () => {
  // Honest accounting of what this branch does NOT do. Granting the claim
  // (api/verify-admin.js) and honouring it (firestore.rules) are both
  // founder-gated by docs/reference/human-validation-zones.md, so both are
  // proposed rather than taken. This test records that state so the day it
  // changes, it changes deliberately and the note above is updated with it.
  const gated = read('docs/reference/human-validation-zones.md')
  assert.match(gated, /api\/verify-admin\.js/, 'verify-admin is no longer founder-gated')
  assert.match(gated, /firestore\.rules/, 'firestore.rules is no longer founder-gated')
  assert.match(gated, /src\/contexts\/AuthContext\.jsx/, 'AuthContext is no longer founder-gated')
  // AuthContext was not touched: the role is read through a hook that goes
  // straight to auth.currentUser, exactly so this file did not have to change.
  assert.ok(!/moderat/i.test(read('src/contexts/AuthContext.jsx')),
    'AuthContext.jsx was modified for the role — it is founder-gated')
})
