// Account-bound data needs NO rules change, and this
// file is the proof rather than the claim.
//
//   npm run test:rules
//
// src/hooks/useFirestoreSync.js now writes two documents under the owner's
// sync subcollection — `users/{uid}/sync/data` (settings, prompts, likes,
// recent exports, the working design) and the new `users/{uid}/sync/library`
// (custom icons) — each carrying a `_stamps` map. Both fall under the existing
// `match /sync/{docId}` rule. These pin that: the owner can write and read the
// exact shapes the client sends, and nobody else can touch them.
import test, { after, before, beforeEach } from 'node:test'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc } from 'firebase/firestore'

const RULES_PATH = fileURLToPath(new URL('../../firestore.rules', import.meta.url))
const ALICE = 'alice-uid'
const BOB = 'bob-uid'

let testEnv

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: process.env.GCLOUD_PROJECT || 'demo-uil4b',
    firestore: { rules: await readFile(RULES_PATH, 'utf8') },
  })
})
after(async () => { await testEnv?.cleanup() })
beforeEach(async () => { await testEnv.clearFirestore() })

const db = (uid) => testEnv.authenticatedContext(uid).firestore()

// The shapes utils/accountSync.js#buildDoc produces.
const DATA_DOC = {
  _schema: 2,
  _updatedAt: 1727150000000,
  _stamps: { 'vs-t': 1727150000000, 'vs-recent-exports': 1727149000000 },
  'vs-t': 'dark',
  'vs-prompts': [{ id: 4242, title: 'Hero copy prompt' }],
  'vs-recent-exports': [{ id: 'e1', tool: 'palette', format: 'CSS', filename: 'tokens.css', bytes: 4198, at: 1727149000000, projectId: null }],
  'vs-lang': null,
}
const LIBRARY_DOC = {
  _schema: 2,
  _updatedAt: 1727150000000,
  _stamps: { 'vs-custom-icons': 1727150000000 },
  'vs-custom-icons': [{ key: 'vs-custom-icons:1:abcde', name: 'Custom (star 1)', svg: '<svg viewBox="0 0 24 24"></svg>' }],
}

for (const [id, body] of [['data', DATA_DOC], ['library', LIBRARY_DOC]]) {
  test(`the owner can write and read sync/${id} as the client builds it`, async () => {
    const ref = doc(db(ALICE), 'users', ALICE, 'sync', id)
    await assertSucceeds(setDoc(ref, body, { merge: true }))
    await assertSucceeds(getDoc(ref))
  })

  test(`another signed-in account can neither read nor write sync/${id}`, async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', ALICE, 'sync', id), body)
    })
    await assertFails(getDoc(doc(db(BOB), 'users', ALICE, 'sync', id)))
    await assertFails(setDoc(doc(db(BOB), 'users', ALICE, 'sync', id), { 'vs-t': 'light' }, { merge: true }))
  })

  test(`a signed-out client can neither read nor write sync/${id}`, async () => {
    const anon = testEnv.unauthenticatedContext().firestore()
    await assertFails(getDoc(doc(anon, 'users', ALICE, 'sync', id)))
    await assertFails(setDoc(doc(anon, 'users', ALICE, 'sync', id), body))
  })
}
