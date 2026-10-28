// Emulator tests for the four rules-audit fixes (M1-M4) that ship as founder-gated
// patches: docs/design/community-icon-rules.patch, analytics-counters-rules.patch,
// profile-types-rules.patch and submission-payload-rules.patch.
//
//   npm run test:rules
//
// firestore.rules is gated, so these run against the registry's PLANNED text
// (scripts/gated-patches.mjs fileTextThrough), the same way firestore-rules.test.js
// section (d) does for the moderator role. A patch already applied is skipped and
// the text comes back the same, so every assertion holds on both sides of
// `npm run apply:gated`.
//
// Every refusal sits beside an allowed write on the same collection, so a rules
// file that refuses everything cannot turn this suite green.
import test, { after, before, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing'
import { doc, setDoc, deleteField } from 'firebase/firestore'
import { fileTextThrough } from '../../scripts/gated-patches.mjs'

const ALICE = 'alice-uid'
let env

before(async () => {
  const rules = await fileTextThrough('submission-payload')
  assert.match(rules, /function payloadElementsOk\(\)/, 'the rules under test are not the patched ones')
  env = await initializeTestEnvironment({ projectId: 'demo-uil4b-gated-fixes', firestore: { rules } })
})
after(async () => { await env?.cleanup() })
beforeEach(async () => { await env.clearFirestore() })

const aliceDb = () => env.authenticatedContext(ALICE).firestore()
const adminDb = () => env.authenticatedContext('admin-uid', { admin: true }).firestore()
async function seed(path, data) {
  await env.withSecurityRulesDisabled(async (ctx) => { await setDoc(doc(ctx.firestore(), ...path), data) })
}

// ── M1 · icon submissions ───────────────────────────────────────────────────
const queue = (db, id) => doc(db, 'community-submissions', id)
const submission = (kind, payload, extra = {}) => ({
  kind, name: 'Harbour', authorUid: ALICE, authorName: 'Alice', status: 'pending',
  payload, createdAt: '2026-10-29T00:00:00.000Z', ...extra,
})
const icon = (svg, extra = {}) => submission('icon', { svg, author: 'Alice', ...extra })

test('M1: an icon submission is accepted at the 8192-character cap, and refused one over', async () => {
  await assertSucceeds(setDoc(queue(aliceDb(), 'i1'), icon('<svg viewBox="0 0 24 24"/>')))
  await assertSucceeds(setDoc(queue(aliceDb(), 'i2'), icon('x'.repeat(8192))))
  await assertFails(setDoc(queue(aliceDb(), 'i3'), icon('x'.repeat(8193))))
})

test('M1: the icon kind opens nothing else: svg must be a string, and a client still cannot self-approve', async () => {
  await assertFails(setDoc(queue(aliceDb(), 'i4'), icon({ a: 1 })))
  await assertFails(setDoc(queue(aliceDb(), 'i5'), icon('<svg/>', { blob: 'x' })))
  await assertFails(setDoc(queue(aliceDb(), 'i6'), { ...icon('<svg/>'), status: 'approved' }))
  await assertSucceeds(setDoc(queue(aliceDb(), 'i7'), icon('<svg/>')))
})

// ── M2 · analytics counters ─────────────────────────────────────────────────
const DAY = '2026-10-29'
const dayDoc = (db) => doc(db, 'analytics-daily', DAY)
const seedDay = () => seed(['analytics-daily', DAY], { day: DAY, views: 5, 'icon-copies': 2, view__home: 4, tool__palette: 1 })

test('M2: a signed-in client can still add and increase counters on an existing day', async () => {
  await seedDay()
  await assertSucceeds(setDoc(dayDoc(aliceDb()), { day: DAY, views: 6, view__home: 5 }, { merge: true }))
  await assertSucceeds(setDoc(dayDoc(aliceDb()), { day: DAY, view__plans: 1 }, { merge: true }))
})

test('M2 (the bug): a non-admin cannot delete an existing counter, and the admin claim can', async () => {
  await seedDay()
  await assertFails(setDoc(dayDoc(aliceDb()), { day: DAY, view__home: deleteField() }, { merge: true }))
  await assertFails(setDoc(dayDoc(aliceDb()), { day: DAY, views: deleteField() }, { merge: true }))
  // The founder's reset sweep (resetPageAnalytics) is a merge write that deletes fields.
  await assertSucceeds(setDoc(dayDoc(adminDb()), { day: DAY, views: deleteField(), view__home: deleteField() }, { merge: true }))
})

test('M2 (the bug): a non-admin cannot lower the fixed totals, and cannot replace the document without its keys', async () => {
  await seedDay()
  await assertFails(setDoc(dayDoc(aliceDb()), { day: DAY, views: 0 }, { merge: true }))
  await assertFails(setDoc(dayDoc(aliceDb()), { day: DAY, 'icon-copies': 1 }, { merge: true }))
  await assertFails(setDoc(dayDoc(aliceDb()), { day: DAY, views: 99 }))
  await assertSucceeds(setDoc(dayDoc(adminDb()), { day: DAY, views: 0 }, { merge: true }))
})

test('M2: the first write of a day (a create) is unchanged', async () => {
  await assertSucceeds(setDoc(dayDoc(aliceDb()), { day: DAY, views: 1, view__home: 1 }, { merge: true }))
})

// ── M3 · profile field types ────────────────────────────────────────────────
const user = (db) => doc(db, 'users', ALICE)

test('M3: ordinary profile text is accepted, and so are keys the server writes', async () => {
  await assertSucceeds(setDoc(user(aliceDb()), {
    displayName: 'Alice', email: 'a@example.com', location: 'Melbourne', company: 'Acme',
    website: 'https://example.com', bio: 'b'.repeat(5000), flair: 'founder', photoURL: '',
    onboarding: { openedAt: 1, completedAt: 2, firstWin: 'palette' },
    someKeyTheServerWrites: { any: 'shape' },
  }, { merge: true }))
})

test('M3 (the bug): a non-string location or company, or an over-cap bio, is refused', async () => {
  await assertFails(setDoc(user(aliceDb()), { location: { a: 1 } }, { merge: true }))
  await assertFails(setDoc(user(aliceDb()), { company: [] }, { merge: true }))
  await assertFails(setDoc(user(aliceDb()), { bio: 'b'.repeat(5001) }, { merge: true }))
  await assertFails(setDoc(user(aliceDb()), { location: { a: 1 } }))
  await assertSucceeds(setDoc(user(aliceDb()), { location: 'Melbourne' }, { merge: true }))
})

test('M3: the onboarding record must be a map of numbers and short text', async () => {
  await assertFails(setDoc(user(aliceDb()), { onboarding: 'done' }, { merge: true }))
  await assertFails(setDoc(user(aliceDb()), { onboarding: { completedAt: 'yesterday' } }, { merge: true }))
  await assertFails(setDoc(user(aliceDb()), { onboarding: { firstWin: 'x'.repeat(101) } }, { merge: true }))
  await assertSucceeds(setDoc(user(aliceDb()), { onboarding: { firstWin: 'palette', completedAt: 1 } }, { merge: true }))
})

test('M3: an older document already over a cap does not lock the owner out of other writes', async () => {
  await seed(['users', ALICE], { displayName: 'Alice', bio: 'b'.repeat(6000), location: 7 })
  await assertSucceeds(setDoc(user(aliceDb()), { flair: 'founder' }, { merge: true }))
  // ...and the bad fields can still be fixed, but not re-set to another bad value.
  await assertFails(setDoc(user(aliceDb()), { location: { a: 1 } }, { merge: true }))
  await assertSucceeds(setDoc(user(aliceDb()), { location: 'Melbourne', bio: 'short' }, { merge: true }))
})

test('M3: the billing lock is untouched', async () => {
  await assertFails(setDoc(user(aliceDb()), { subscription: { status: 'active' } }, { merge: true }))
})

// ── M4 · submission payload bounds ──────────────────────────────────────────
const stop = (extra = {}) => ({ color: '#0F172A', position: 0, ...extra })
const gradient = (payload) => submission('gradient', { type: 'Linear', angle: 90, stops: [stop(), stop({ color: '#38BDF8', position: 100 })], ...payload })
const palette = (payload) => submission('palette', { colors: ['#0F172A', '#38BDF8'], category: 'Branding', ...payload })

test('M4: the real gradient and palette shapes (as the client sends them) are still accepted', async () => {
  await assertSucceeds(setDoc(queue(aliceDb(), 'g1'), gradient({})))
  await assertSucceeds(setDoc(queue(aliceDb(), 'p1'), palette({})))
  await assertSucceeds(setDoc(queue(aliceDb(), 'g12'), gradient({ stops: Array.from({ length: 12 }, () => stop()) })))
})

test('M4 (the bug): angle must be a number', async () => {
  await assertFails(setDoc(queue(aliceDb(), 'a1'), gradient({ angle: 'x'.repeat(5000) })))
  await assertFails(setDoc(queue(aliceDb(), 'a2'), gradient({ angle: { a: 1 } })))
  await assertSucceeds(setDoc(queue(aliceDb(), 'a3'), gradient({ angle: 45.5 })))
})

test('M4 (the bug): gradient stops are { color, position } with a short colour', async () => {
  await assertFails(setDoc(queue(aliceDb(), 's1'), gradient({ stops: ['x'.repeat(5000)] })))
  await assertFails(setDoc(queue(aliceDb(), 's2'), gradient({ stops: [stop({ blob: 'x'.repeat(5000) })] })))
  await assertFails(setDoc(queue(aliceDb(), 's3'), gradient({ stops: [stop({ color: '#' + '0'.repeat(16) })] })))
  await assertFails(setDoc(queue(aliceDb(), 's4'), gradient({ stops: [stop({ position: '50' })] })))
  await assertSucceeds(setDoc(queue(aliceDb(), 's5'), gradient({ stops: [stop({ color: '#' + '0'.repeat(15) })] })))
})

test('M4 (the bug): palette colours are short strings, including the last index', async () => {
  await assertFails(setDoc(queue(aliceDb(), 'c1'), palette({ colors: [{ a: 1 }] })))
  await assertFails(setDoc(queue(aliceDb(), 'c2'), palette({ colors: ['x'.repeat(5000)] })))
  const last = Array.from({ length: 32 }, () => '#000000')
  await assertSucceeds(setDoc(queue(aliceDb(), 'c3'), palette({ colors: last })))
  await assertFails(setDoc(queue(aliceDb(), 'c4'), palette({ colors: [...last.slice(0, 31), 'x'.repeat(5000)] })))
  await assertFails(setDoc(queue(aliceDb(), 'c5'), palette({ colors: [...last, '#000000'] })))
})
