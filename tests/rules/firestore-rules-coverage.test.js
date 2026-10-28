// Coverage gaps in firestore.rules — run against the Firestore emulator.
//
//   npm run test:rules
//
// board card a36c027015. The other files in this folder prove the headline
// guarantees; this one fills in the path-and-operation pairs they never tried
// (list queries, delete, create-on-an-absent-document, field caps, the
// reviewer's real update shape, collection-group queries) and gives every
// server-only collection (`rate-limits`, `admin-audit`, `stripeEvents`, ...) a
// behavioural test. The case groups are numbered T1 to T14 after the audit
// table in the card; the icon-kind cases (T10) run against a copy of the rules
// with docs/design/community-icon-rules.patch applied.
//
// It runs against firestore.rules as it stands, read and never written (the
// file is founder-gated). Where the audit found current behaviour to be a bug,
// the case is left out and a comment names the finding, so no test here
// pins a bug as correct.
//
// Every refusal sits beside a success on the same path, so a rules file that
// refuses everything (a syntax error does) cannot pass.
import test, { after, before, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from '@firebase/rules-unit-testing'
import {
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'

const execFileAsync = promisify(execFile)

const ROOT = fileURLToPath(new URL('../../', import.meta.url))
const RULES_PATH = path.join(ROOT, 'firestore.rules')
const ICON_PATCH_PATH = path.join(ROOT, 'docs/design/community-icon-rules.patch')

const ALICE = 'alice-uid'
const BOB = 'bob-uid'
const MOD = 'mod-uid'
const ADMIN = 'admin-uid'

let testEnv
let iconEnv
let iconRules

/**
 * firestore.rules with docs/design/community-icon-rules.patch applied, as a
 * string. The patch is applied to a scratch copy and the gated original is only
 * read. If the icon rule is already in the file the file is returned as it is,
 * so applying the patch to main does not turn this suite red.
 */
async function iconRulesText() {
  const original = await readFile(RULES_PATH, 'utf8')
  if (/kind in \[[^\]]*'icon'/.test(original)) return original

  // Inside the repo because `git apply --directory` will not leave it. The
  // prefix is already in .gitignore.
  const scratch = await mkdtemp(path.join(ROOT, '.tmp-rules-patch-'))
  try {
    await mkdir(scratch, { recursive: true })
    // LF on both sides: a CRLF checkout makes git apply reject a clean patch.
    const lf = (text) => text.replace(/\r\n/g, '\n')
    await writeFile(path.join(scratch, 'firestore.rules'), lf(original), 'utf8')
    const patchCopy = path.join(scratch, 'community-icon-rules.patch.lf')
    await writeFile(patchCopy, lf(await readFile(ICON_PATCH_PATH, 'utf8')), 'utf8')
    try {
      await execFileAsync('git', [
        'apply', '--unsafe-paths', `--directory=${path.basename(scratch)}`, patchCopy,
      ], { cwd: ROOT })
    } catch (error) {
      throw new Error(
        'docs/design/community-icon-rules.patch no longer applies to firestore.rules, '
        + `so the icon cases cannot be run. Regenerate the patch. ${error.message}`,
      )
    }
    return await readFile(path.join(scratch, 'firestore.rules'), 'utf8')
  } finally {
    await rm(scratch, { recursive: true, force: true })
  }
}

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-uil4b-coverage',
    firestore: { rules: await readFile(RULES_PATH, 'utf8') },
  })
  // Its own project id: the emulator loads rules per project, so the patched
  // copy must not share one with the live file.
  iconRules = await iconRulesText()
  iconEnv = await initializeTestEnvironment({
    projectId: 'demo-uil4b-coverage-icon',
    firestore: { rules: iconRules },
  })
})

after(async () => {
  await testEnv?.cleanup()
  await iconEnv?.cleanup()
})

beforeEach(async () => {
  await testEnv.clearFirestore()
  await iconEnv.clearFirestore()
})

const aliceDb = () => testEnv.authenticatedContext(ALICE).firestore()
const bobDb = () => testEnv.authenticatedContext(BOB).firestore()
const modDb = () => testEnv.authenticatedContext(MOD, { moderator: true }).firestore()
const adminDb = () => testEnv.authenticatedContext(ADMIN, { admin: true }).firestore()
const anonDb = () => testEnv.unauthenticatedContext().firestore()

const PROMPTS = 'community-prompts'
const QUEUE = 'community-submissions'
const DAILY = 'analytics-daily'

async function seed(...args) {
  const data = args.pop()
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), ...args), data)
  })
}

async function readAsServer(...segments) {
  let snap
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    snap = await getDoc(doc(ctx.firestore(), ...segments))
  })
  return snap
}

/** assertFails, with the operation named so a failure says which one succeeded. */
async function refused(label, promise) {
  try {
    await assertFails(promise)
  } catch (error) {
    throw new Error(`${label} should have been refused: ${error.message}`)
  }
}

const without = (record, key) => {
  const copy = { ...record }
  delete copy[key]
  return copy
}

// ── T1-T3 · users/{userId} ──────────────────────────────────────────────────

const PROFILE = { displayName: 'Alice', email: 'alice@example.com', bio: 'Designer' }

test('[T1] users: the owner reads their own document; nobody can list the collection', async () => {
  await seed('users', ALICE, PROFILE)
  await seed('users', BOB, { displayName: 'Bob' })
  const own = await assertSucceeds(getDoc(doc(aliceDb(), 'users', ALICE)))
  assert.equal(own.data().displayName, 'Alice')

  // `allow read: if isOwner()` compares the document id, which an unconstrained
  // list cannot prove, so a list is refused for every kind of caller.
  await refused('signed-in list', getDocs(collection(aliceDb(), 'users')))
  await refused('signed-out list', getDocs(collection(anonDb(), 'users')))
  await refused('admin list', getDocs(collection(adminDb(), 'users')))
  await refused('moderator list', getDocs(collection(modDb(), 'users')))
})

test('[T2] users: an owner can create their own document; a stranger or an admin claim cannot touch it', async () => {
  await assertSucceeds(setDoc(doc(aliceDb(), 'users', ALICE), PROFILE))
  assert.equal((await readAsServer('users', ALICE)).data().bio, 'Designer')

  // Absent documents, so these are creates and not updates (the other files
  // seed first). `create` is `isOwner() && createsNoLockedField()`.
  await refused('Bob creating another user\'s document', setDoc(doc(bobDb(), 'users', 'carol-uid'), PROFILE))
  await refused('admin creating a user document', setDoc(doc(adminDb(), 'users', 'carol-uid'), PROFILE))
  await refused('signed-out create', setDoc(doc(anonDb(), 'users', 'carol-uid'), PROFILE))
  assert.equal((await readAsServer('users', 'carol-uid')).exists(), false)

  // The admin claim opens no user document: `isReviewer()` is not in the
  // users rules.
  await refused('admin get', getDoc(doc(adminDb(), 'users', ALICE)))
  await refused('admin update', updateDoc(doc(adminDb(), 'users', ALICE), { bio: 'edited' }))
  await refused('admin overwrite', setDoc(doc(adminDb(), 'users', ALICE), PROFILE))
  assert.equal((await readAsServer('users', ALICE)).data().bio, 'Designer')
})

test('[T3] users: a dotted-path update cannot reach a billing field, an ordinary one can', async () => {
  await seed('users', ALICE, {
    ...PROFILE,
    subscription: { status: 'free' },
    lifetimeEntitlement: { active: false },
  })
  await assertSucceeds(updateDoc(doc(aliceDb(), 'users', ALICE), { bio: 'New bio' }))

  // `request.resource.data` is the merged document, so a changed nested value
  // puts the top-level key in `diff.affectedKeys()`.
  await refused(
    'subscription.status',
    updateDoc(doc(aliceDb(), 'users', ALICE), { 'subscription.status': 'active' }),
  )
  await refused(
    'lifetimeEntitlement.active',
    updateDoc(doc(aliceDb(), 'users', ALICE), { 'lifetimeEntitlement.active': true }),
  )
  await refused(
    'a new nested billing key',
    updateDoc(doc(aliceDb(), 'users', ALICE), { 'stripeCustomerId.id': 'cus_forged' }),
  )

  const stored = (await readAsServer('users', ALICE)).data()
  assert.equal(stored.bio, 'New bio')
  assert.deepEqual(stored.subscription, { status: 'free' })
  assert.deepEqual(stored.lifetimeEntitlement, { active: false })
  assert.equal('stripeCustomerId' in stored, false)
})
// Not tested: field types and sizes on users/{uid} (a non-string `location`
// crashes the Admin list). That is audit finding M3 and needs a rule change.

// ── T4 · users/{userId}/sync/{docId} ────────────────────────────────────────

test('[T4] sync: the owner lists and deletes; another user and a signed-out client cannot', async () => {
  await seed('users', ALICE, 'sync', 'data', { v: 1 })
  await seed('users', ALICE, 'sync', 'library', { v: 2 })
  const syncOf = (db) => collection(db, 'users', ALICE, 'sync')

  const own = await assertSucceeds(getDocs(syncOf(aliceDb())))
  assert.deepEqual(own.docs.map((d) => d.id).sort(), ['data', 'library'])

  await refused('Bob list', getDocs(syncOf(bobDb())))
  await refused('anon list', getDocs(syncOf(anonDb())))
  await refused('Bob delete', deleteDoc(doc(bobDb(), 'users', ALICE, 'sync', 'data')))
  await refused('anon delete', deleteDoc(doc(anonDb(), 'users', ALICE, 'sync', 'data')))
  // An absent document, so this is a create rather than an update.
  await refused('Bob create', setDoc(doc(bobDb(), 'users', ALICE, 'sync', 'new'), { v: 3 }))
  assert.equal((await readAsServer('users', ALICE, 'sync', 'new')).exists(), false)

  await assertSucceeds(deleteDoc(doc(aliceDb(), 'users', ALICE, 'sync', 'data')))
  assert.equal((await readAsServer('users', ALICE, 'sync', 'data')).exists(), false)
  assert.equal((await readAsServer('users', ALICE, 'sync', 'library')).exists(), true)
})

// ── T5 · users/{userId}/projects/{projectId} ────────────────────────────────

test('[T5] projects: the owner lists; a signed-out client can neither list nor delete', async () => {
  await seed('users', ALICE, 'projects', 'p1', { project: { name: 'One' }, updatedAt: 1 })
  const projectsOf = (db) => collection(db, 'users', ALICE, 'projects')

  const own = await assertSucceeds(getDocs(projectsOf(aliceDb())))
  assert.deepEqual(own.docs.map((d) => d.id), ['p1'])

  await refused('anon list', getDocs(projectsOf(anonDb())))
  await refused('anon delete', deleteDoc(doc(anonDb(), 'users', ALICE, 'projects', 'p1')))
  await refused('Bob delete', deleteDoc(doc(bobDb(), 'users', ALICE, 'projects', 'p1')))
  assert.equal((await readAsServer('users', ALICE, 'projects', 'p1')).exists(), true)
})

// ── T6 · feedback ───────────────────────────────────────────────────────────

test('[T6] feedback: a reviewer lists the collection; a plain user cannot, and a reviewer cannot create', async () => {
  await seed('feedback', 'f1', { message: 'Love it', createdAt: '2026-09-01T00:00:00.000Z' })

  // The Admin shape (feedbackQueueApi.js): a bare getDocs on the collection.
  const queue = await assertSucceeds(getDocs(collection(modDb(), 'feedback')))
  assert.deepEqual(queue.docs.map((d) => d.id), ['f1'])
  await assertSucceeds(getDocs(collection(adminDb(), 'feedback')))

  await refused('plain user list', getDocs(collection(aliceDb(), 'feedback')))
  await refused('signed-out list', getDocs(collection(anonDb(), 'feedback')))
  // `allow create: if false`; reports are written server-side by /api/support.
  await refused('moderator create', setDoc(doc(modDb(), 'feedback', 'f2'), { message: 'x' }))
  assert.equal((await readAsServer('feedback', 'f2')).exists(), false)
})

// ── T7 · community-prompts ──────────────────────────────────────────────────

const promptRecord = (over = {}) => ({
  title: 'A dense admin table',
  text: 'Design a dense admin table.',
  tags: 'ui, dashboard',
  authorName: 'Alice',
  authorUid: ALICE,
  profileLink: null,
  status: 'pending',
  createdAt: '2026-09-01T00:00:00.000Z',
  ...over,
})

test('[T7] community-prompts: an author cannot edit or delete their own pending prompt; a reviewer can', async () => {
  await seed(PROMPTS, 'mine', promptRecord())
  const mine = (db) => doc(db, PROMPTS, 'mine')

  // `allow update, delete: if isReviewer()`; authoring grants nothing.
  await refused('author update', updateDoc(mine(aliceDb()), { title: 'Edited' }))
  await refused('author delete', deleteDoc(mine(aliceDb())))
  assert.equal((await readAsServer(PROMPTS, 'mine')).data().title, 'A dense admin table')

  await assertSucceeds(updateDoc(mine(modDb()), { status: 'rejected' }))
  await assertSucceeds(deleteDoc(mine(adminDb())))
  assert.equal((await readAsServer(PROMPTS, 'mine')).exists(), false)
})

test('[T7] community-prompts: only a pending prompt can be created', async () => {
  await assertSucceeds(setDoc(doc(aliceDb(), PROMPTS, 'pending-ok'), promptRecord()))
  // `status == 'pending'` is pinned at create; approved is PEND:244.
  await refused('rejected at create', setDoc(doc(aliceDb(), PROMPTS, 'r'), promptRecord({ status: 'rejected' })))
  await refused('withdrawn at create', setDoc(doc(aliceDb(), PROMPTS, 'w'), promptRecord({ status: 'withdrawn' })))
})

// [field, cap] where the rule says `size() <= cap`.
const PROMPT_CAPS = [
  ['title', 300],
  ['text', 20000],
  ['tags', 300],
  ['authorName', 120],
  ['createdAt', 40],
  ['profileLink', 2048],
  ['ownerId', 64],
  ['mediaType', 16],
]

for (const [field, cap] of PROMPT_CAPS) {
  test(`[T7] community-prompts: ${field} is accepted at ${cap} characters and refused at ${cap + 1}`, async () => {
    await assertSucceeds(setDoc(doc(aliceDb(), PROMPTS, 'at-cap'), promptRecord({ [field]: 'a'.repeat(cap) })))
    await refused(
      `${field} at ${cap + 1}`,
      setDoc(doc(aliceDb(), PROMPTS, 'over-cap'), promptRecord({ [field]: 'a'.repeat(cap + 1) })),
    )
  })
}

test('[T7] community-prompts: mediaUrl is accepted at 899999 characters and refused at 900000', async () => {
  // The rule is `size() < 900000`, a strict bound unlike the other caps.
  await assertSucceeds(setDoc(doc(aliceDb(), PROMPTS, 'at-cap'), promptRecord({ mediaUrl: 'a'.repeat(899999) })))
  await refused(
    'mediaUrl at 900000',
    setDoc(doc(aliceDb(), PROMPTS, 'over-cap'), promptRecord({ mediaUrl: 'a'.repeat(900000) })),
  )
})

for (const field of ['profileLink', 'ownerId', 'mediaType', 'mediaUrl']) {
  test(`[T7] community-prompts: ${field} must be a string, not a number`, async () => {
    await assertSucceeds(setDoc(doc(aliceDb(), PROMPTS, 'string-ok'), promptRecord({ [field]: 'x' })))
    await refused(
      `numeric ${field}`,
      setDoc(doc(aliceDb(), PROMPTS, 'number'), promptRecord({ [field]: 5 })),
    )
  })
}

// Each key is also checked by a type test (`title is string`, `authorUid ==
// uid`), so removing `hasAll` alone would not turn these red: they pin that a
// record without the key is refused, whichever clause does it.
for (const key of ['title', 'text', 'tags', 'authorName', 'authorUid', 'status', 'profileLink', 'createdAt']) {
  test(`[T7] community-prompts: a record without ${key} is refused`, async () => {
    await assertSucceeds(setDoc(doc(aliceDb(), PROMPTS, 'complete'), promptRecord()))
    await refused(
      `missing ${key}`,
      setDoc(doc(aliceDb(), PROMPTS, 'incomplete'), without(promptRecord(), key)),
    )
  })
}

// ── T8-T9 · community-submissions, create shape ─────────────────────────────

const submissionRecord = (over = {}) => ({
  kind: 'palette',
  name: 'Night palette',
  authorUid: ALICE,
  authorName: 'Alice',
  status: 'pending',
  payload: { colors: ['#0F172A', '#38BDF8'] },
  createdAt: '2026-09-01T00:00:00.000Z',
  ...over,
})

const SUBMISSION_CAPS = [['name', 80], ['authorName', 60], ['createdAt', 40]]

for (const [field, cap] of SUBMISSION_CAPS) {
  test(`[T8] community-submissions: ${field} is accepted at ${cap} characters and refused at ${cap + 1}`, async () => {
    await assertSucceeds(setDoc(doc(aliceDb(), QUEUE, 'at-cap'), submissionRecord({ [field]: 'a'.repeat(cap) })))
    await refused(
      `${field} at ${cap + 1}`,
      setDoc(doc(aliceDb(), QUEUE, 'over-cap'), submissionRecord({ [field]: 'a'.repeat(cap + 1) })),
    )
  })
}

// As with the prompts, the type or equality tests overlap `hasAll`, so these
// pin the refusal rather than isolating the `hasAll` clause.
for (const key of ['kind', 'name', 'authorUid', 'authorName', 'status', 'payload', 'createdAt']) {
  test(`[T8] community-submissions: a record without ${key} is refused`, async () => {
    await assertSucceeds(setDoc(doc(aliceDb(), QUEUE, 'complete'), submissionRecord()))
    await refused(
      `missing ${key}`,
      setDoc(doc(aliceDb(), QUEUE, 'incomplete'), without(submissionRecord(), key)),
    )
  })
}

test('[T8] community-submissions: a key outside the seven the client writes is refused at create', async () => {
  await assertSucceeds(setDoc(doc(aliceDb(), QUEUE, 'plain'), submissionRecord()))
  // `reviewedBy` is a reviewer field; `hasOnly` keeps it out of a create.
  await refused(
    'reviewedBy at create',
    setDoc(doc(aliceDb(), QUEUE, 'with-reviewer'), submissionRecord({ reviewedBy: MOD })),
  )
})

// [payload key, cap] where the rule says `is string && size() <= cap`.
const PAYLOAD_STRING_CAPS = [
  ['url', 2048],
  ['author', 80],
  ['category', 80],
  ['type', 32],
  ['c1', 64],
  ['c2', 64],
]

for (const [key, cap] of PAYLOAD_STRING_CAPS) {
  test(`[T9] community-submissions: payload.${key} is accepted at ${cap} characters, refused at ${cap + 1} and when it is not a string`, async () => {
    const withPayload = (value) => submissionRecord({ payload: { [key]: value } })
    await assertSucceeds(setDoc(doc(aliceDb(), QUEUE, 'at-cap'), withPayload('a'.repeat(cap))))
    await refused(`${key} at ${cap + 1}`, setDoc(doc(aliceDb(), QUEUE, 'over-cap'), withPayload('a'.repeat(cap + 1))))
    await refused(`numeric ${key}`, setDoc(doc(aliceDb(), QUEUE, 'number'), withPayload(5)))
  })
}

for (const key of ['stops', 'colors']) {
  test(`[T9] community-submissions: payload.${key} is accepted at 32 entries, refused at 33 and when it is not a list`, async () => {
    const withPayload = (value) => submissionRecord({ payload: { [key]: value } })
    const entries = (n) => Array.from({ length: n }, (_, i) => `#${String(i).padStart(6, '0')}`)
    await assertSucceeds(setDoc(doc(aliceDb(), QUEUE, 'at-cap'), withPayload(entries(32))))
    await refused(`${key} at 33`, setDoc(doc(aliceDb(), QUEUE, 'over-cap'), withPayload(entries(33))))
    await refused(`${key} as a string`, setDoc(doc(aliceDb(), QUEUE, 'string'), withPayload('#000000')))
  })
}
// Not tested: `payload.angle` and the elements of `stops`/`colors` carry no type
// or size check (audit finding M4), so there is nothing to assert yet.

test('[T9] community-submissions: payload must be a map holding only the allowed keys', async () => {
  await assertSucceeds(setDoc(doc(aliceDb(), QUEUE, 'ok'), submissionRecord()))
  await refused('payload as a string', setDoc(doc(aliceDb(), QUEUE, 's'), submissionRecord({ payload: 'x' })))
  await refused('payload as a list', setDoc(doc(aliceDb(), QUEUE, 'l'), submissionRecord({ payload: ['x'] })))
  await refused(
    'payload with an unknown key',
    setDoc(doc(aliceDb(), QUEUE, 'k'), submissionRecord({ payload: { colors: [], extra: 'x' } })),
  )
})

// ── T10 · kind 'icon', against the patched copy ─────────────────────────────

const iconDb = (uid = ALICE) => iconEnv.authenticatedContext(uid).firestore()
const iconRecord = (over = {}) => submissionRecord({
  kind: 'icon',
  name: 'Arrow',
  payload: { svg: '<svg viewBox="0 0 24 24"/>', author: 'Alice' },
  ...over,
})
// The unpatched file refuses icon submissions (audit finding M1, card
// 9ff0708abd); that refusal is the bug, so it is not asserted here.

test('[T10] icon: the rules under test hold the icon kind and the 8192-character svg cap', () => {
  // Without this the cases below could be running against the unpatched file.
  assert.match(iconRules, /kind in \[[^\]]*'icon'/, 'the icon kind is not in the rules under test')
  assert.match(iconRules, /svg\.size\(\) <= 8192/, 'the svg cap is not in the rules under test')
})

test('[T10] icon: an icon submission is accepted once the patch is applied', async () => {
  await assertSucceeds(setDoc(doc(iconDb(), QUEUE, 'icon-1'), iconRecord()))
  let stored
  await iconEnv.withSecurityRulesDisabled(async (ctx) => {
    stored = (await getDoc(doc(ctx.firestore(), QUEUE, 'icon-1'))).data()
  })
  assert.equal(stored.kind, 'icon')
  assert.equal(stored.payload.svg, '<svg viewBox="0 0 24 24"/>')
})

test('[T10] icon: svg is accepted at 8192 characters and refused at 8193 or as a non-string', async () => {
  const withSvg = (svg) => iconRecord({ payload: { svg } })
  await assertSucceeds(setDoc(doc(iconDb(), QUEUE, 'at-cap'), withSvg('a'.repeat(8192))))
  await refused('svg at 8193', setDoc(doc(iconDb(), QUEUE, 'over-cap'), withSvg('a'.repeat(8193))))
  await refused('svg as a map', setDoc(doc(iconDb(), QUEUE, 'map'), withSvg({ a: 1 })))
  await refused('svg as a number', setDoc(doc(iconDb(), QUEUE, 'number'), withSvg(5)))
})

test('[T10] icon: an icon still has to be pending and the caller\'s own', async () => {
  await assertSucceeds(setDoc(doc(iconDb(), QUEUE, 'ok'), iconRecord()))
  await refused('approved at create', setDoc(doc(iconDb(), QUEUE, 'a'), iconRecord({ status: 'approved' })))
  await refused('forged author', setDoc(doc(iconDb(), QUEUE, 'f'), iconRecord({ authorUid: BOB })))
  await refused('unknown payload key', setDoc(doc(iconDb(), QUEUE, 'k'), iconRecord({ payload: { svg: '<svg/>', html: 'x' } })))
})

// ── T11 · community-submissions, status transitions ─────────────────────────

test('[T11] community-submissions: a reviewer decides with the exact {status, reviewedAt, reviewedBy} update the client sends', async () => {
  await seed(QUEUE, 'pending-1', submissionRecord())
  await seed(QUEUE, 'pending-2', submissionRecord())
  const decision = (status, by) => ({ status, reviewedAt: '2026-09-02T00:00:00.000Z', reviewedBy: by })

  await assertSucceeds(updateDoc(doc(modDb(), QUEUE, 'pending-1'), decision('approved', MOD)))
  await assertSucceeds(updateDoc(doc(adminDb(), QUEUE, 'pending-2'), decision('rejected', ADMIN)))
  const stored = (await readAsServer(QUEUE, 'pending-1')).data()
  assert.equal(stored.status, 'approved')
  assert.equal(stored.reviewedBy, MOD)

  // The same update from a plain user, on their own item, is refused.
  await seed(QUEUE, 'pending-3', submissionRecord())
  await refused('owner deciding', updateDoc(doc(aliceDb(), QUEUE, 'pending-3'), decision('approved', ALICE)))
})

test('[T11] community-submissions: the owner can only move an item to withdrawn, never back or sideways', async () => {
  await seed(QUEUE, 'p', submissionRecord())
  await seed(QUEUE, 'w', submissionRecord({ status: 'withdrawn' }))
  const item = (id) => doc(aliceDb(), QUEUE, id)

  // `request.resource.data.status == 'withdrawn'` is the only status an owner
  // update may write.
  await refused('pending to rejected', updateDoc(item('p'), { status: 'rejected' }))
  await refused('pending to pending', updateDoc(item('p'), { status: 'pending' }))
  await refused('withdrawn back to pending', updateDoc(item('w'), { status: 'pending' }))
  assert.equal((await readAsServer(QUEUE, 'p')).data().status, 'pending')
  assert.equal((await readAsServer(QUEUE, 'w')).data().status, 'withdrawn')

  await assertSucceeds(updateDoc(item('p'), { status: 'withdrawn' }))
  assert.equal((await readAsServer(QUEUE, 'p')).data().status, 'withdrawn')
})

test('[T11] community-submissions: OPEN DECISION, the rule lets an owner withdraw an item a reviewer already approved', async () => {
  // Neither rule nor comment restricts the prior status, so this passes today.
  // The audit (T11) leaves it as a product decision; if approved items should
  // become final, this test is the one to flip.
  await seed(QUEUE, 'live', submissionRecord({ status: 'approved' }))
  await assertSucceeds(updateDoc(doc(aliceDb(), QUEUE, 'live'), { status: 'withdrawn' }))
  await refused('stranger withdrawing', updateDoc(doc(bobDb(), QUEUE, 'live'), { status: 'withdrawn' }))
})

// ── T12 · analytics-daily ───────────────────────────────────────────────────

test('[T12] analytics-daily: an admin lists the dashboard query; a plain user and a signed-out client cannot', async () => {
  await seed(DAILY, '2026-09-01', { day: '2026-09-01', views: 3 })
  await seed(DAILY, '2026-09-02', { day: '2026-09-02', views: 5 })
  // The shape of analytics.js: newest day first, capped.
  const dashboard = (db) => query(collection(db, DAILY), orderBy('day', 'desc'), limit(30))

  const days = await assertSucceeds(getDocs(dashboard(adminDb())))
  assert.deepEqual(days.docs.map((d) => d.id), ['2026-09-02', '2026-09-01'])

  await refused('plain user dashboard', getDocs(dashboard(aliceDb())))
  await refused('moderator dashboard', getDocs(dashboard(modDb())))
  await refused('signed-out dashboard', getDocs(dashboard(anonDb())))
})

test('[T12] analytics-daily: nobody can delete a day, admin included', async () => {
  await seed(DAILY, '2026-09-01', { day: '2026-09-01', views: 3 })
  await assertSucceeds(getDoc(doc(adminDb(), DAILY, '2026-09-01')))

  // There is no `delete` in the rule, so there is nothing to allow it.
  await refused('plain user delete', deleteDoc(doc(aliceDb(), DAILY, '2026-09-01')))
  await refused('admin delete', deleteDoc(doc(adminDb(), DAILY, '2026-09-01')))
  await refused('signed-out delete', deleteDoc(doc(anonDb(), DAILY, '2026-09-01')))
  assert.equal((await readAsServer(DAILY, '2026-09-01')).data().views, 3)
})
// Not tested: a plain user zeroing or `deleteField()`-ing counters on an
// existing day, which the rule allows today (audit finding M2).

// ── T13 · collections no rule names: server-only ────────────────────────────

// Written with the Admin SDK, which ignores rules. A rule that named any of
// these, or a wildcard that matched them, would hand a client the request
// counters (`rate-limits`), the price-change audit trail (`admin-audit`) or the
// Stripe webhook de-duplication record (`stripeEvents`).
const SERVER_ONLY = [
  'rate-limits',
  'admin-audit',
  'stripeEvents',
  'daily-usage',
  'provider-health',
  'moderators',
]

const ACTORS = [
  ['a signed-in user', aliceDb],
  ['a moderator', modDb],
  ['an admin', adminDb],
  ['a signed-out client', anonDb],
]

test('[T13] control: the rules are loaded, because the same actors are allowed on a path that has a rule', async () => {
  await assertSucceeds(setDoc(doc(aliceDb(), 'users', ALICE), PROFILE))
  await assertSucceeds(getDocs(collection(adminDb(), 'feedback')))
  await assertSucceeds(getDoc(doc(adminDb(), DAILY, '2026-09-01')))
})

for (const name of SERVER_ONLY) {
  for (const [actor, dbFor] of ACTORS) {
    test(`[T13] ${name}: ${actor} can neither read nor write it`, async () => {
      const seeded = { count: 1, note: 'written by the server' }
      await seed(name, 'seeded', seeded)
      assert.deepEqual((await readAsServer(name, 'seeded')).data(), seeded, 'the seed did not land')
      const db = dbFor()

      await refused('get', getDoc(doc(db, name, 'seeded')))
      await refused('list', getDocs(collection(db, name)))
      await refused('create', setDoc(doc(db, name, 'created'), { count: 99 }))
      await refused('overwrite', setDoc(doc(db, name, 'seeded'), { count: 99 }))
      await refused('update', updateDoc(doc(db, name, 'seeded'), { count: 99 }))
      await refused('delete', deleteDoc(doc(db, name, 'seeded')))

      assert.deepEqual((await readAsServer(name, 'seeded')).data(), seeded, 'a refused write changed the document')
      assert.equal((await readAsServer(name, 'created')).exists(), false)
    })
  }
}

// ── T14 · collection-group queries ──────────────────────────────────────────

test('[T14] collection-group: a normal query works, the same collection as a group does not', async () => {
  await seed('users', ALICE, 'projects', 'p1', { project: { name: 'One' }, updatedAt: 1 })
  await seed('users', ALICE, 'sync', 'data', { v: 1 })
  await seed(QUEUE, 'mine', submissionRecord())

  await assertSucceeds(getDocs(collection(aliceDb(), 'users', ALICE, 'projects')))
  await assertSucceeds(getDocs(collection(aliceDb(), 'users', ALICE, 'sync')))
  await assertSucceeds(getDocs(query(collection(aliceDb(), QUEUE), where('authorUid', '==', ALICE))))

  // Rules version 2 only lets a collection-group query through a
  // `{path=**}/name/{doc}` match, and firestore.rules has none.
  await refused('projects group', getDocs(collectionGroup(aliceDb(), 'projects')))
  await refused('sync group', getDocs(collectionGroup(aliceDb(), 'sync')))
  await refused(
    'community-submissions group',
    getDocs(query(collectionGroup(aliceDb(), QUEUE), where('authorUid', '==', ALICE))),
  )
  await refused('another user\'s projects group', getDocs(collectionGroup(bobDb(), 'projects')))
  await refused('admin projects group', getDocs(collectionGroup(adminDb(), 'projects')))
  await refused('reviewer queue as a group', getDocs(query(collectionGroup(modDb(), QUEUE), where('status', '==', 'pending'))))
})
