// Firebase STORAGE security-rules tests — run against the local emulator.
//
//   npm run test:rules
//
// [storage-rules-no-content-type], from the 2026-09-06 engineering review.
//
// WHY THIS COLLECTION OF OBJECTS IS DIFFERENT FROM EVERY OTHER STORE HERE.
// Objects under `community-media/**` used to be readable by anyone, signed out
// included, so every one was a page any stranger could open, on
// firebasestorage.googleapis.com, under this project's name, and the folder
// could be listed. The write rule checked auth, the owner's uid and a 25 MB cap
// — and nothing at all about WHAT was being stored. "Media attached to a
// prompt" was a description of what the uploader happened to send, not a rule.
// A signed-in account could store text/html there and have a browser render it.
//
// READ IS NOW OWNER-AND-REVIEWER ONLY (see the last section). Approved prompts
// still render in <img>/<video> through the tokenised URL getDownloadURL
// returned, which does not go through these rules.
//
// storage.rules is NOT on the founder-gated list in
// docs/reference/human-validation-zones.md (firestore.rules and
// api/verify-admin.js are), so unlike the Firestore half of this change, this
// fix is applied in the tree and these tests run against the real file.
//
// EVERY REFUSAL BELOW IS PAIRED WITH THE SAME BYTES SUCCEEDING under a
// legitimate content type. Without that pairing a rules file with a syntax
// error — which refuses everything — would make this suite green.
import test, { after, before, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from '@firebase/rules-unit-testing'
import { ref, uploadBytes, getBytes, listAll } from 'firebase/storage'

const RULES_PATH = fileURLToPath(new URL('../../storage.rules', import.meta.url))
const ALICE = 'alice-uid'
const BOB = 'bob-uid'

let testEnv

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-uil4b-storage',
    storage: { rules: await readFile(RULES_PATH, 'utf8') },
  })
})

after(async () => { await testEnv?.cleanup() })
beforeEach(async () => { await testEnv.clearStorage() })

const aliceStore = () => testEnv.authenticatedContext(ALICE).storage()
const bobStore = () => testEnv.authenticatedContext(BOB).storage()
const anonStore = () => testEnv.unauthenticatedContext().storage()

// The same handful of bytes every time. Only the declared content type changes,
// so nothing but the content type can explain a different outcome.
const BYTES = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x00, 0x01, 0x02, 0x03])
const put = (store, path, contentType) =>
  uploadBytes(ref(store, path), BYTES, contentType ? { contentType } : undefined)

const mine = (name) => `community-media/${ALICE}/${name}`

// ─────────────────────────────────────────────────────────────────────────────
// The uploads the product actually makes
// ─────────────────────────────────────────────────────────────────────────────
//
// utils/mediaUpload.js sends exactly what utils/imageProcessing.js produced
// (WebP, or the original when conversion failed) or the user's original video
// File. All of these must still work, or the fix has broken the feature it was
// meant to protect.

for (const type of ['image/webp', 'image/png', 'image/jpeg', 'image/gif', 'video/mp4', 'video/quicktime']) {
  test(`POSITIVE CONTROL: the owner can still upload ${type}`, async () => {
    await assertSucceeds(put(aliceStore(), mine(`ok-${type.replace('/', '-')}`), type))
  })
}

test('POSITIVE CONTROL: an uploaded object is readable by its owner', async () => {
  // Proves an upload really landed rather than being silently dropped.
  await assertSucceeds(put(aliceStore(), mine('published.webp'), 'image/webp'))
  await assertSucceeds(getBytes(ref(aliceStore(), mine('published.webp'))))
})

// ─────────────────────────────────────────────────────────────────────────────
// THE ONE THAT MATTERS — the same bytes, refused by type
// ─────────────────────────────────────────────────────────────────────────────

test('THE ONE THAT MATTERS: text/html is refused where the identical bytes as image/webp are accepted', async () => {
  // Identical payload, identical path, identical owner, identical size. If the
  // first line fails and the second passes, the ONLY thing that can explain it
  // is the content type — which is the assertion this whole file exists to make.
  await assertFails(put(aliceStore(), mine('page.html'), 'text/html'))
  await assertSucceeds(put(aliceStore(), mine('page.html'), 'image/webp'))
})

for (const type of [
  'text/html',
  'application/xhtml+xml',
  'text/javascript',
  'application/pdf',
  'application/octet-stream',
  'application/zip',
  'text/plain',
]) {
  test(`a signed-in account can no longer host ${type} under the project's name`, async () => {
    await assertFails(put(aliceStore(), mine(`hosted-${type.replace(/[/+]/g, '-')}`), type))
  })
}

test('an upload declaring NO content type is refused, and the same one declaring an image is not', async () => {
  // Without this, "no type at all" would be the way around the check.
  await assertFails(put(aliceStore(), mine('untyped'), undefined))
  await assertSucceeds(put(aliceStore(), mine('untyped'), 'image/webp'))
})

test('a type merely CONTAINING "image/" is refused — the match must be anchored', async () => {
  // `matches()` in Storage rules is a full match, but that is a property worth
  // pinning: an unanchored check would accept 'text/html;x=image/png'.
  await assertFails(put(aliceStore(), mine('sneaky'), 'text/html+image/png'))
  await assertSucceeds(put(aliceStore(), mine('sneaky'), 'image/png'))
})

// ─────────────────────────────────────────────────────────────────────────────
// The gap this deliberately does NOT close, pinned so it cannot be forgotten
// ─────────────────────────────────────────────────────────────────────────────

test('KNOWN GAP: image/svg+xml is still accepted, and this test is the record of that', async () => {
  // An SVG can carry script that runs when the file is navigated to directly.
  // It is NOT excluded here because SVG is a supported upload —
  // imageProcessing.js passes it through unconverted rather than rasterising it
  // — so refusing it would break a working path and silently divert those
  // submissions to the legacy base64-in-Firestore fallback and its 900 KB cap.
  //
  // This assertion exists so the gap is a recorded decision rather than an
  // oversight: if someone later narrows the rule, this test fails and forces
  // the conversation instead of the feature breaking quietly.
  await assertSucceeds(put(aliceStore(), mine('logo.svg'), 'image/svg+xml'))
})

// ─────────────────────────────────────────────────────────────────────────────
// Everything the fix must NOT have widened
// ─────────────────────────────────────────────────────────────────────────────

test('a signed-in user still cannot write into someone else\'s folder', async () => {
  await assertFails(put(bobStore(), mine('intruder.webp'), 'image/webp'))
  await assertSucceeds(put(bobStore(), `community-media/${BOB}/own.webp`, 'image/webp'))
})

test('a signed-out client still cannot upload at all', async () => {
  await assertFails(put(anonStore(), mine('anon.webp'), 'image/webp'))
})

test('paths outside community-media are still denied by default', async () => {
  await assertFails(put(aliceStore(), 'anything-else/x.webp', 'image/webp'))
  await assertFails(put(aliceStore(), `users/${ALICE}/x.webp`, 'image/webp'))
  await assertSucceeds(put(aliceStore(), mine('inside.webp'), 'image/webp'))
})

// ─────────────────────────────────────────────────────────────────────────────
// Read and list: owner and reviewers only
// ─────────────────────────────────────────────────────────────────────────────
//
// Storage rules cannot see whether the prompt a file belongs to is approved, so
// the object itself is closed to everyone but its owner and reviewers (the same
// `admin` / `moderator` claims firestore.rules calls isReviewer()). Each refusal
// below sits beside a read that succeeds on the same object.

const modStore = () => testEnv.authenticatedContext('mod-uid', { moderator: true }).storage()
const adminStore = () => testEnv.authenticatedContext('admin-uid', { admin: true }).storage()

async function seedMedia(name) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await uploadBytes(ref(ctx.storage(), mine(name)), BYTES, { contentType: 'image/webp' })
  })
}

test('an uploaded object is readable by its owner and by reviewers, and not by anyone else', async () => {
  await seedMedia('pending.webp')
  await assertSucceeds(getBytes(ref(aliceStore(), mine('pending.webp'))))
  await assertSucceeds(getBytes(ref(modStore(), mine('pending.webp'))))
  await assertSucceeds(getBytes(ref(adminStore(), mine('pending.webp'))))

  await assertFails(getBytes(ref(bobStore(), mine('pending.webp'))))
  await assertFails(getBytes(ref(anonStore(), mine('pending.webp'))))
})

test('a folder cannot be listed by the public, and can by its owner and reviewers', async () => {
  // Its own subfolder, so files other tests leave in Alice's folder can't
  // change what this listing returns.
  await seedMedia('list-check/a.webp')
  await seedMedia('list-check/b.webp')
  const folder = `community-media/${ALICE}/list-check`
  const own = await assertSucceeds(listAll(ref(aliceStore(), folder)))
  assert.deepEqual(own.items.map((i) => i.name).sort(), ['a.webp', 'b.webp'])
  await assertSucceeds(listAll(ref(modStore(), folder)))

  await assertFails(listAll(ref(bobStore(), folder)))
  await assertFails(listAll(ref(anonStore(), folder)))
  // The parent folder would list every account's uploads. No rule matches it,
  // so it is denied by default.
  await assertFails(listAll(ref(anonStore(), 'community-media')))
  await assertFails(listAll(ref(bobStore(), 'community-media')))
})

test('being a reviewer opens reads only, not writes into someone else\'s folder', async () => {
  await assertSucceeds(put(aliceStore(), mine('own.webp'), 'image/webp'))
  await assertFails(put(modStore(), mine('moderator-upload.webp'), 'image/webp'))
  await assertFails(put(adminStore(), mine('admin-upload.webp'), 'image/webp'))
})
