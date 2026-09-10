// The shared review queue — the thing that did not exist.
//
// Gradient submissions (vs-gradient-submissions) and design submissions
// (vs-community-submissions) were written to localStorage and NOWHERE ELSE.
// Two reported consequences:
//
//   1. "I submitted other gradients that I do not see under my pending
//      submissions" — they were only ever in one browser's storage, so a
//      second device showed nothing.
//   2. No admin could review any of it. There was no queue to look at, so
//      every submission sat "pending" forever by construction.
//
// And the moderation that DID exist was broken: firestore.rules gates admin
// writes on `request.auth.token.admin == true`, and nothing in the codebase
// ever called setCustomUserClaims — so approving or deleting a community
// prompt was rejected by Firestore every single time.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  buildQueueRecord, mergeSubmissions, QUEUE_KINDS, QUEUE_STATUSES, CLIENT_WRITABLE_STATUS,
} from '../../src/utils/communityQueue.js'

// Line endings are normalised: git checks this repo out with CRLF on Windows,
// and a pattern that happens to span a newline must not pass on one machine
// and fail on another.
const read = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8').replace(/\r\n/g, '\n')
const user = { uid: 'u1', displayName: 'Dylan', email: 'd@example.com' }

// ── Nothing can publish itself ──────────────────────────────────────────────

test('a client record is always pending — approval is a reviewer word', () => {
  const r = buildQueueRecord({ kind: 'gradient', payload: { stops: [] }, user, name: 'Sunset' })
  assert.equal(r.status, 'pending')
  assert.equal(CLIENT_WRITABLE_STATUS, 'pending')
  assert.ok(QUEUE_STATUSES.includes('approved'))
})

test('the rules refuse a client document that claims anything but pending', () => {
  const rules = read('firestore.rules')
  const block = /match \/community-submissions\/\{submissionId\}[\s\S]*?\n {4}\}/.exec(rules)?.[0] || ''
  assert.ok(block, 'the collection must have a rules block')
  assert.match(block, /request\.resource\.data\.status == 'pending'/)
  assert.match(block, /request\.resource\.data\.authorUid == request\.auth\.uid/,
    'a client may only create its own submission')
})

test('only a reviewer may approve, and the owner may only withdraw', () => {
  const rules = read('firestore.rules')
  const block = /match \/community-submissions\/\{submissionId\}[\s\S]*?\n {4}\}/.exec(rules)?.[0] || ''
  // `isAdmin()` before the moderator role lands, `isReviewer()` after — the two
  // states `npm run apply:gated` moves between. What must never change is that
  // the update gate is a PREDICATE about who is reviewing, rather than
  // something a client can satisfy about itself: the alternation below would
  // not accept `isOwner()`, `isSignedIn()`, or a bare `true`.
  assert.match(block, /allow update: if is(?:Admin|Reviewer)\(\)/,
    'the approve gate is no longer a reviewer check')
  assert.match(block, /status == 'withdrawn'/,
    "the owner's only post-creation write may not promote their own submission")
})

// ── The record ──────────────────────────────────────────────────────────────

test('a submission carries no email — the queue is readable by every signed-in user', () => {
  const r = buildQueueRecord({ kind: 'gradient', payload: { stops: [] }, user, name: 'X' })
  assert.equal(r.authorName, 'Dylan')
  assert.equal(r.authorEmail, undefined)
  assert.ok(!JSON.stringify(r).includes('d@example.com'),
    'a submission does not need to disclose an address to be reviewed')
})

test('junk never becomes a queue entry a reviewer can act on', () => {
  assert.equal(buildQueueRecord({ kind: 'nope', payload: {}, user }), null)
  assert.equal(buildQueueRecord({ kind: 'gradient', payload: null, user }), null)
  assert.equal(buildQueueRecord({ kind: 'gradient', payload: {}, user: null }), null)
  assert.equal(buildQueueRecord({ kind: 'gradient', payload: {}, user: {} }), null)
})

test('every supported kind is accepted, so a third type needs no fourth code path', () => {
  for (const kind of QUEUE_KINDS) {
    assert.ok(buildQueueRecord({ kind, payload: { x: 1 }, user }), `${kind} should be queueable`)
  }
})

test('an unnamed submission still reads as something in the queue', () => {
  assert.equal(buildQueueRecord({ kind: 'gradient', payload: { x: 1 }, user }).name, 'Untitled gradient')
  assert.equal(buildQueueRecord({ kind: 'gradient', payload: { x: 1 }, user, name: '   ' }).name, 'Untitled gradient')
})

// ── Merging the two sources ─────────────────────────────────────────────────

test('the account copy and this browser both show, with the server winning', () => {
  const merged = mergeSubmissions(
    [{ id: 'a', localId: 'g1', name: 'From server', createdAt: '2026-08-02' }],
    [{ id: 'g1', name: 'Local copy', createdAt: '2026-08-02' }, { id: 'g2', name: 'Not yet sent', createdAt: '2026-08-03' }],
  )
  assert.equal(merged.length, 2, 'the duplicate is collapsed onto the server copy')
  assert.equal(merged.find(m => m.id === 'a')?.name, 'From server')
  assert.equal(merged.find(m => m.id === 'g2')?.synced, false)
})

test('a local-only submission is kept and marked, never dropped', () => {
  // It is a real submission that has not reached the queue yet (offline, or a
  // failed publish). Hiding it would look exactly like the bug being fixed.
  const merged = mergeSubmissions([], [{ id: 'g9', name: 'Offline', createdAt: '2026-08-01' }])
  assert.equal(merged.length, 1)
  assert.equal(merged[0].synced, false)
})

test('merging junk yields a list, not a crash', () => {
  assert.deepEqual(mergeSubmissions(null, null), [])
  assert.deepEqual(mergeSubmissions([null], [null]), [])
})

test('newest first, whichever side it came from', () => {
  const merged = mergeSubmissions(
    [{ id: 'a', createdAt: '2026-08-01' }],
    [{ id: 'b', createdAt: '2026-08-05' }],
  )
  assert.deepEqual(merged.map(m => m.id), ['b', 'a'])
})

// ── The claim that made moderation impossible ───────────────────────────────

test('the admin custom claim is actually granted somewhere', () => {
  // firestore.rules has always required `request.auth.token.admin == true` for
  // moderation, and NOTHING ever called setCustomUserClaims — so the condition
  // was permanently false and every approve/delete was rejected.
  const src = read('api/verify-admin.js')
  assert.match(src, /setCustomUserClaims\(/, 'the admin claim must be granted')
  // Only ever from a server-verified email against the allowlist.
  const guard = /if \(isAdmin && decoded\.admin !== true\)/.exec(src)
  assert.ok(guard, 'the grant must be gated on the server-side isAdmin check and be idempotent')
  assert.match(src, /claimUpdated/, 'the client needs to know to refresh its token')
})

test('the submission flow never claims a review it did not queue', () => {
  const src = read('src/pages/GradientGenerator.jsx')
  assert.match(src, /Sign in to submit it for review/, 'a signed-out save says what it is')
  assert.match(src, /could not reach the review queue/, 'a failed publish says so')
  assert.ok(/appendGradientSubmission\(record\)/.test(src),
    'the local copy is kept regardless, so nothing the user made is lost')
})

test('the gallery reads the account, not just this browser', () => {
  const src = read('src/pages/GradientGallery.jsx')
  assert.match(src, /listMySubmissions\(user\.uid, 'gradient'\)/)
  assert.match(src, /mergeSubmissions\(/)
})

// ── The other two kinds ─────────────────────────────────────────────────────
//
// Gradients were fixed; palettes and designs were left writing to localStorage
// and nowhere else, which is the SAME reported bug — a palette submitted on a
// phone was invisible on a laptop, and no reviewer ever saw it. QUEUE_KINDS has
// listed 'palette' and 'design' the whole time; only the call sites were
// missing. These pin the call sites, because a kind the queue accepts and
// nothing ever sends is indistinguishable from one it refuses.

test('a palette submission reaches the account, not just this browser', () => {
  const src = read('src/pages/PaletteBuilder.jsx')
  assert.match(src, /buildQueueRecord\(\{\n\s*kind: 'palette',/,
    'the palette must be shaped for the shared queue')
  assert.match(src, /await publishToQueue\(\{ \.\.\.queued, localId \}\)/,
    'and actually published, carrying the local id so the merge can pair them')
})

test('a design submission reaches the account, not just this browser', () => {
  const src = read('src/pages/Community.jsx')
  assert.match(src, /buildQueueRecord\(\{\n\s*kind: 'design',/)
  assert.match(src, /await publishToQueue\(\{ \.\.\.queued, localId: item\.id \}\)/)
})

test('the local copy is still written FIRST, in both flows', () => {
  // Local-first is the whole reason submitting works offline and the list
  // updates without waiting on a round trip. Publishing before the local write
  // would make a dropped connection lose the submission outright.
  for (const [file, local] of [
    ['src/pages/PaletteBuilder.jsx', 'appendCommunitySubmission('],
    ['src/pages/Community.jsx', 'setSubmissions(prev => [item, ...prev])'],
  ]) {
    const src = read(file)
    const localAt = src.indexOf(local)
    const publishAt = src.indexOf('await publishToQueue(')
    assert.ok(localAt > -1, `${file} must still keep a local copy`)
    assert.ok(publishAt > -1, `${file} must publish to the queue`)
    assert.ok(localAt < publishAt, `${file} must write locally before publishing`)
  }
})

test('neither palette nor design flow claims a review it did not queue', () => {
  for (const file of ['src/pages/PaletteBuilder.jsx', 'src/pages/Community.jsx']) {
    const src = read(file)
    assert.match(src, /Sign in to submit it for review/, `${file}: a signed-out save says what it is`)
    assert.match(src, /could not reach the review queue/, `${file}: a failed publish says so`)
  }
})

test('the community hub reads the account, not just this browser', () => {
  const src = read('src/pages/Community.jsx')
  assert.match(src, /listMySubmissions\(uid, 'design'\)/)
  assert.match(src, /mergeSubmissions\(serverSubmissions, submissions\)/)
})

test('the hub no longer tells submitters their work stays in this browser', () => {
  // The note read "Submissions are saved to this browser for now. Shared
  // community publishing is coming soon." That was true while nothing was
  // published. It became a lie the moment the queue existed.
  const src = read('src/pages/Community.jsx')
  assert.ok(!/Submissions are saved to this browser/.test(src),
    'the note must not still promise browser-only storage')
  assert.match(src, /saved to your account and queued for review/)
})

test('a submission from the wire is sanitised like one from this browser', () => {
  // The cards render `item.url`. A document coming back from Firestore gets the
  // same safeHttpUrl treatment the local store has always applied, so the wire
  // is not a way around it.
  const src = read('src/pages/Community.jsx')
  assert.match(src, /sanitizeCommunitySubmission\(\{/)
})
