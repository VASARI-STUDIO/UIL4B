// Firestore rules tests for the two 2026-09-06 findings, run against the rules
// WITH both fixes applied to an in-memory copy.
//
//   npm run test:rules
//
// firestore-rules.test.js runs against `firestore.rules` as it stands. This file
// runs against the same file with the two fixes applied to an in-memory copy
// (tests/rules/pending-firestore-rules.mjs). It was written while they were
// still a diff waiting on the founder — `firestore.rules` is founder-gated, so
// the diff shipped in a pull request body for him to apply by hand — and it
// stays because handing someone a rules diff nobody has ever run is not a fix,
// it is a suggestion. Both fixes have since landed in `firestore.rules` itself
// (the feedback rule in #472), so what this suite proves now is that they STAY.
//
// The two findings, from the 2026-09-06 engineering review, both closed:
//   [firestore-feedback-create-open-to-anyone]  P1 — the feedback create rule
//   [firestore-signed-in-writes-unbounded]      P2 — shape/size/id bounds
//
// ─────────────────────────────────────────────────────────────────────────────
// EVERY REFUSAL IS PAIRED WITH A POSITIVE CONTROL ON THE SAME SEEDED DOCUMENT
// ─────────────────────────────────────────────────────────────────────────────
//
// A refused write and a broken emulator are indistinguishable from an
// assertFails alone — and a rules file with a syntax error refuses EVERYTHING,
// which would turn this entire suite green while proving nothing. So no
// assertFails here stands on its own: each one sits next to an assertSucceeds
// that differs by the single field under test, on the same collection, in the
// same test environment.
import test, { after, before, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore'
import { pendingRulesText } from './pending-firestore-rules.mjs'

const ALICE = 'alice-uid'
const BOB = 'bob-uid'
const OWNER_EMAIL = 'dylanjacob1100@gmail.com'

let testEnv
let rules

before(async () => {
  rules = await pendingRulesText()
  // A DIFFERENT projectId from firestore-rules.test.js, so the published rules
  // and the pending ones can be exercised in the same emulator without either
  // suite's documents reaching the other.
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-uil4b-pending',
    firestore: { rules },
  })
})

after(async () => { await testEnv?.cleanup() })
beforeEach(async () => { await testEnv.clearFirestore() })

const aliceDb = () => testEnv.authenticatedContext(ALICE).firestore()
const bobDb = () => testEnv.authenticatedContext(BOB).firestore()
const anonDb = () => testEnv.unauthenticatedContext().firestore()
const adminDb = () =>
  testEnv.authenticatedContext('admin-uid', { admin: true, email: OWNER_EMAIL }).firestore()
const ownerDb = () => testEnv.authenticatedContext('owner-uid', { email: OWNER_EMAIL }).firestore()

async function seed(collection, id, data) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), collection, id), data)
  })
}
async function readAsServer(collection, id) {
  let out
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    out = (await getDoc(doc(ctx.firestore(), collection, id))).data()
  })
  return out
}

// ─────────────────────────────────────────────────────────────────────────────
// 0 · The patch is real, and these tests are running against it
// ─────────────────────────────────────────────────────────────────────────────
//
// Without this, every assertion below could be running against the UNPATCHED
// file and passing for the wrong reason.

test('the rules under test are the PATCHED ones, not the published file', () => {
  assert.match(rules, /allow create: if false;/, 'the feedback create rule was not closed')
  assert.doesNotMatch(rules, /allow create: if true;/, 'the open feedback create rule is still there')
  assert.match(rules, /function promptShapeOk\(\)/)
  assert.match(rules, /function submissionShapeOk\(\)/)
  assert.match(rules, /day\.matches\(/)
})

// ─────────────────────────────────────────────────────────────────────────────
// 1 · feedback — [firestore-feedback-create-open-to-anyone]  (P1)
// ─────────────────────────────────────────────────────────────────────────────

const REPORT = {
  message: 'The export button does nothing on iPad',
  email: 'reporter@example.com',
  status: 'new',
  createdAt: '2026-09-07T00:00:00.000Z',
}

test('POSITIVE CONTROL: the admin queue still reads, updates and deletes feedback', async () => {
  // This is the control the three refusals below lean on. If the collection
  // were unreachable — a syntax error, a dead emulator, a wrong projectId —
  // this fails, and the refusals stop meaning anything.
  await seed('feedback', 'r1', REPORT)
  const db = adminDb()
  await assertSucceeds(getDoc(doc(db, 'feedback', 'r1')))
  await assertSucceeds(setDoc(doc(db, 'feedback', 'r1'), { status: 'done' }, { merge: true }))
  await assertSucceeds(deleteDoc(doc(db, 'feedback', 'r1')))
})

test('a SIGNED-OUT stranger can no longer create a feedback document', async () => {
  // This is the finding: `allow create: if true` let anyone put unlimited
  // documents of any shape into the collection the admin queue renders,
  // skipping /api/support and its rate limiter entirely.
  await assertFails(setDoc(doc(anonDb(), 'feedback', 'injected'), REPORT))
})

test('a SIGNED-IN user cannot create a feedback document either', async () => {
  await assertFails(setDoc(doc(aliceDb(), 'feedback', 'injected'), REPORT))
})

test('not even an admin creates one from a client — the route uses the Admin SDK', async () => {
  // Closing create must not be mistaken for "admins only". NOTHING in src/ has
  // ever written here; the server bypasses rules. If a future client needs to
  // create feedback, this test is where that decision has to be made
  // explicitly rather than inherited from `if true`.
  await assertFails(setDoc(doc(adminDb(), 'feedback', 'by-admin'), REPORT))
})

test('the SERVER can still file a report, and it lands in the queue', async () => {
  // The paired positive: /api/support writes with the Admin SDK, which bypasses
  // rules, so closing create costs the product nothing.
  await seed('feedback', 'from-support-route', REPORT)
  assert.equal((await readAsServer('feedback', 'from-support-route')).message, REPORT.message)
  await assertSucceeds(getDoc(doc(adminDb(), 'feedback', 'from-support-route')))
})

test('a stranger still cannot READ the queue — closing create widened nothing', async () => {
  await seed('feedback', 'r1', REPORT)
  await assertFails(getDoc(doc(aliceDb(), 'feedback', 'r1')))
  await assertFails(getDoc(doc(anonDb(), 'feedback', 'r1')))
})

// ─────────────────────────────────────────────────────────────────────────────
// 2 · community-prompts — [firestore-signed-in-writes-unbounded]  (P2)
// ─────────────────────────────────────────────────────────────────────────────

// The exact record buildCommunityPromptRecord (utils/promptSubmission.js)
// produces. Every refusal below is this document with ONE thing changed.
function promptRecord(overrides = {}) {
  return {
    title: 'Isometric city block',
    text: 'An isometric city block at golden hour, soft shadows, muted palette',
    tags: 'isometric, city, illustration',
    authorName: 'Alice',
    authorUid: ALICE,
    profileLink: 'https://example.com/alice',
    status: 'pending',
    createdAt: '2026-09-07T00:00:00.000Z',
    ...overrides,
  }
}
const promptDoc = (db, id) => doc(db, 'community-prompts', id)

test('POSITIVE CONTROL: the real submission the form writes is still accepted', async () => {
  await assertSucceeds(setDoc(promptDoc(aliceDb(), 'p1'), promptRecord()))
})

test('POSITIVE CONTROL: the optional fields the form adds are still accepted', async () => {
  // ownerId (the founder's own handle), and the media pair — both conditional,
  // which is why the allowlist is hasOnly and not an exact key set.
  await assertSucceeds(setDoc(promptDoc(aliceDb(), 'p2'), promptRecord({
    ownerId: 'uil4b', mediaType: 'image', mediaUrl: 'https://storage.example/x.webp',
  })))
  await assertSucceeds(setDoc(promptDoc(aliceDb(), 'p3'), promptRecord({ profileLink: null })))
})

test('a document carrying an INVENTED field is refused, and the same one without it is not', async () => {
  await assertFails(setDoc(promptDoc(aliceDb(), 'bad'), promptRecord({ payload: 'x'.repeat(400000) })))
  await assertSucceeds(setDoc(promptDoc(aliceDb(), 'good'), promptRecord()))
})

test('a 1 MiB text field is refused, and a long-but-real one is accepted', async () => {
  // The abuse the row describes: unlimited documents of any shape up to
  // Firestore's 1 MiB ceiling. The paired control is deliberately close to the
  // bound so this measures the CAP, not the concept of a cap.
  await assertFails(setDoc(promptDoc(aliceDb(), 'huge'), promptRecord({ text: 'x'.repeat(20001) })))
  await assertSucceeds(setDoc(promptDoc(aliceDb(), 'big'), promptRecord({ text: 'x'.repeat(20000) })))
})

test('a non-string title is refused where a string one is accepted', async () => {
  await assertFails(setDoc(promptDoc(aliceDb(), 'wrong'), promptRecord({ title: { a: 1 } })))
  await assertSucceeds(setDoc(promptDoc(aliceDb(), 'right'), promptRecord({ title: 'A title' })))
})

test('a document missing a required field is refused', async () => {
  // AN HONEST GAP, recorded rather than papered over. This assertion is TRUE —
  // a partial document is refused — but it does not isolate the `hasAll` clause
  // it looks like it covers. The mutation sweep proved it: deleting hasAll
  // entirely leaves this test green, because every key hasAll names is already
  // required by a type check (`createdAt is string`) or an equality check
  // (`authorUid == request.auth.uid`, `status == 'pending'`) above it, and a
  // missing field fails those too.
  //
  // hasAll is kept anyway, as the thing that keeps those keys REQUIRED if a
  // type check is ever relaxed — but no test today can distinguish its presence
  // from its absence, and inventing one that passed for the wrong reason would
  // be worse than saying so.
  const { createdAt, ...withoutCreatedAt } = promptRecord()
  assert.ok(createdAt, 'the fixture must have carried the field this test removes')
  await assertFails(setDoc(promptDoc(aliceDb(), 'partial'), withoutCreatedAt))
  await assertSucceeds(setDoc(promptDoc(aliceDb(), 'whole'), promptRecord()))
})

test('the base64 media fallback still fits, and one byte over does not', async () => {
  // SubmitPromptPanel inlines the image when Storage is unavailable and guards
  // it with `< 900_000` itself. The rule is that same guard, where a client
  // cannot skip it — so the LEGITIMATE fallback must still pass.
  await assertSucceeds(setDoc(promptDoc(aliceDb(), 'inline-ok'), promptRecord({
    mediaType: 'image', mediaUrl: 'd'.repeat(899999),
  })))
  await assertFails(setDoc(promptDoc(aliceDb(), 'inline-too-big'), promptRecord({
    mediaType: 'image', mediaUrl: 'd'.repeat(900001),
  })))
})

test('the pre-existing guards are untouched: no forging an author, no self-approving', async () => {
  await assertFails(setDoc(promptDoc(bobDb(), 'forged'), promptRecord()))
  await assertFails(setDoc(promptDoc(aliceDb(), 'promoted'), promptRecord({ status: 'approved' })))
  await assertSucceeds(setDoc(promptDoc(aliceDb(), 'honest'), promptRecord()))
})

test('a signed-out client still cannot create a prompt', async () => {
  await assertFails(setDoc(promptDoc(anonDb(), 'anon'), promptRecord()))
})

// ─────────────────────────────────────────────────────────────────────────────
// 3 · community-submissions — [firestore-signed-in-writes-unbounded]  (P2)
// ─────────────────────────────────────────────────────────────────────────────

// buildQueueRecord (utils/communityQueue.js) plus the three real payloads from
// Community.jsx, GradientGenerator.jsx and PaletteBuilder.jsx.
const PAYLOADS = {
  gradient: { type: 'linear', angle: 90, stops: [{ color: '#0F172A', pos: 0 }, { color: '#38BDF8', pos: 100 }] },
  design: { author: 'Alice', category: 'Branding', url: 'https://example.com/a', c1: '#0F172A', c2: '#38BDF8' },
  palette: { colors: ['#0F172A', '#38BDF8', '#F8FAFC'], category: 'Branding', url: 'https://example.com/p', author: 'alice' },
}
function submission(kind = 'palette', overrides = {}) {
  return {
    kind,
    name: 'Harbour Dusk',
    authorUid: ALICE,
    authorName: 'Alice',
    status: 'pending',
    payload: PAYLOADS[kind],
    createdAt: '2026-09-07T00:00:00.000Z',
    ...overrides,
  }
}
const queueDoc = (db, id) => doc(db, 'community-submissions', id)

for (const kind of ['gradient', 'design', 'palette']) {
  test(`POSITIVE CONTROL: the real ${kind} submission is still accepted`, async () => {
    await assertSucceeds(setDoc(queueDoc(aliceDb(), `s-${kind}`), submission(kind)))
  })
}

test('an invented top-level field is refused, and the same document without it is not', async () => {
  await assertFails(setDoc(queueDoc(aliceDb(), 'extra'), submission('palette', { blob: 'x'.repeat(500000) })))
  await assertSucceeds(setDoc(queueDoc(aliceDb(), 'clean'), submission('palette')))
})

test('an invented PAYLOAD field is refused, and the real payload is not', async () => {
  // payload is the only free-form field, so it is where an unbounded write
  // would go if the top-level allowlist were the only bound.
  await assertFails(setDoc(queueDoc(aliceDb(), 'fat'), submission('palette', {
    payload: { ...PAYLOADS.palette, blob: 'x'.repeat(500000) },
  })))
  await assertSucceeds(setDoc(queueDoc(aliceDb(), 'lean'), submission('palette')))
})

test('a giant string inside the payload is refused, and a real URL is accepted', async () => {
  await assertFails(setDoc(queueDoc(aliceDb(), 'longurl'), submission('palette', {
    payload: { ...PAYLOADS.palette, url: 'https://example.com/' + 'x'.repeat(3000) },
  })))
  await assertSucceeds(setDoc(queueDoc(aliceDb(), 'realurl'), submission('palette')))
})

test('a 10,000-entry colour list is refused, and a real palette is accepted', async () => {
  await assertFails(setDoc(queueDoc(aliceDb(), 'manycolours'), submission('palette', {
    payload: { ...PAYLOADS.palette, colors: Array.from({ length: 200 }, () => '#000000') },
  })))
  await assertSucceeds(setDoc(queueDoc(aliceDb(), 'fewcolours'), submission('palette')))
})

test('a kind nobody built is refused, and the three real kinds are not', async () => {
  await assertFails(setDoc(queueDoc(aliceDb(), 'invented'), submission('palette', { kind: 'invoice' })))
  await assertSucceeds(setDoc(queueDoc(aliceDb(), 'known'), submission('gradient')))
})

test('the pre-existing guards are untouched: no forging an author, no self-approving', async () => {
  await assertFails(setDoc(queueDoc(bobDb(), 'forged'), submission('palette')))
  await assertFails(setDoc(queueDoc(aliceDb(), 'promoted'), submission('palette', { status: 'approved' })))
  await assertSucceeds(setDoc(queueDoc(aliceDb(), 'honest'), submission('palette')))
})

test('an author can still withdraw and delete their own submission', async () => {
  // The update path is NOT bounded by this change, and this proves it still
  // behaves — a shape check accidentally applied to update would break the one
  // write a non-admin legitimately makes after creating.
  await seed('community-submissions', 'mine', submission('palette'))
  await assertSucceeds(setDoc(queueDoc(aliceDb(), 'mine'), submission('palette', { status: 'withdrawn' })))
  await assertSucceeds(deleteDoc(queueDoc(aliceDb(), 'mine')))
})

test('an admin can still approve — the review queue still works', async () => {
  await seed('community-submissions', 'mine', submission('palette'))
  await assertSucceeds(setDoc(queueDoc(adminDb(), 'mine'), submission('palette', { status: 'approved' })))
})

// ─────────────────────────────────────────────────────────────────────────────
// 4 · analytics-daily — [firestore-signed-in-writes-unbounded]  (P2)
// ─────────────────────────────────────────────────────────────────────────────

const DAY = '2026-09-07'
const counters = (extra = {}) => ({ day: DAY, views: 3, view__home: 2, tool__palette: 1, ...extra })
const dayDoc = (db, id) => doc(db, 'analytics-daily', id)

test('POSITIVE CONTROL: a real signed-in client still increments the day it is on', async () => {
  await assertSucceeds(setDoc(dayDoc(aliceDb(), DAY), counters(), { merge: true }))
  await assertSucceeds(setDoc(dayDoc(aliceDb(), DAY), { day: DAY, views: 4 }, { merge: true }))
})

test('a document id that is not a day is refused, and the same payload on a real day is not', async () => {
  // `{day}` matched ANY id, so a signed-in client could create
  // analytics-daily/<anything> — invisible to the reset sweep that orders by
  // `day`, in the collection the dashboard lists.
  await assertFails(setDoc(dayDoc(aliceDb(), 'junk-doc'), counters({ day: 'junk-doc' })))
  await assertFails(setDoc(dayDoc(aliceDb(), '2026-9-7'), counters({ day: '2026-9-7' })))
  await assertSucceeds(setDoc(dayDoc(aliceDb(), DAY), counters()))
})

test('a `day` field that disagrees with the document id is refused', async () => {
  await assertFails(setDoc(dayDoc(aliceDb(), DAY), counters({ day: '2020-01-01' })))
  await assertSucceeds(setDoc(dayDoc(aliceDb(), DAY), counters({ day: DAY })))
})

test('a document grown past the field cap is refused, and one under it is accepted', async () => {
  const many = (n) => {
    const out = { day: DAY }
    for (let i = 0; i < n; i += 1) out[`view__p${i}`] = 1
    return out
  }
  await assertFails(setDoc(dayDoc(aliceDb(), DAY), many(600)))
  await assertSucceeds(setDoc(dayDoc(aliceDb(), DAY), many(400)))
})

test('the founder\'s reset sweep still works against a seeded day', async () => {
  // resetPageAnalytics does a MERGE write that deletes `views` and every
  // `view__*` field. A bound applied carelessly to update would break it.
  await seed('analytics-daily', DAY, counters())
  await assertSucceeds(setDoc(dayDoc(ownerDb(), DAY), { day: DAY, views: 0, view__home: 0 }, { merge: true }))
})

test('reading the counters is still owner-only — nothing here widened the read', async () => {
  await seed('analytics-daily', DAY, counters())
  await assertSucceeds(getDoc(dayDoc(ownerDb(), DAY)))
  await assertFails(getDoc(dayDoc(aliceDb(), DAY)))
  await assertFails(getDoc(dayDoc(anonDb(), DAY)))
})

test('a signed-out client still cannot write a counter', async () => {
  await assertFails(setDoc(dayDoc(anonDb(), DAY), counters()))
})

// ─────────────────────────────────────────────────────────────────────────────
// 5 · WHAT THIS PATCH DELIBERATELY DOES NOT WIDEN
// ─────────────────────────────────────────────────────────────────────────────
//
// The gated file this diff asks the founder to edit is the same one that decides
// whether a client can grant itself Pro. Re-asserted here, against the PATCHED
// text, so "it does not touch users/{uid}" is a checked statement rather than a
// sentence in a pull request.

const PROFILE = { displayName: 'Alice', email: 'alice@example.com', bio: 'Designer' }

test('users/{uid} is untouched: the owner writes their profile, and never an entitlement', async () => {
  await assertSucceeds(setDoc(doc(aliceDb(), 'users', ALICE), PROFILE))
  await assertFails(setDoc(doc(aliceDb(), 'users', ALICE), {
    lifetimeEntitlement: { active: true, sku: 'uil4b_pro_lifetime' },
  }, { merge: true }))
  await assertFails(setDoc(doc(aliceDb(), 'users', ALICE), { subscription: { status: 'active' } }, { merge: true }))
  await assertFails(setDoc(doc(aliceDb(), 'users', ALICE), { stripeCustomerId: 'cus_x' }, { merge: true }))
})

test('cross-user access is still closed under the patched rules', async () => {
  await seed('users', ALICE, PROFILE)
  await assertFails(getDoc(doc(bobDb(), 'users', ALICE)))
  await assertFails(setDoc(doc(bobDb(), 'users', ALICE), { bio: 'hacked' }, { merge: true }))
})

test('a collection nobody wrote a rule for is still denied by default', async () => {
  // daily-usage and provider-health rely on exactly this — api/ai.js meters the
  // AI quota there precisely because no rule mentions it.
  await assertFails(setDoc(doc(aliceDb(), 'daily-usage', 'alice-uid_life'), { 'brand-starter': 0 }))
  await assertFails(getDoc(doc(aliceDb(), 'daily-usage', 'alice-uid_life')))
})
