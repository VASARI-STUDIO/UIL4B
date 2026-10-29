// TEMPORARY diagnostic for #739: what does the storage emulator hold after a
// refused upload? Removed before merge.
import test, { after, before } from 'node:test'
import { initializeTestEnvironment } from '@firebase/rules-unit-testing'
import { ref, uploadBytes, getMetadata, listAll } from 'firebase/storage'
import { fileTextThrough } from '../../scripts/gated-patches.mjs'

let env
before(async () => {
  const rules = await fileTextThrough('upload-limits', 'storage.rules')
  env = await initializeTestEnvironment({ projectId: 'demo-uil4b-diag', storage: { rules } })
})
after(async () => { await env?.cleanup() })

const BYTES = new Uint8Array([1, 2, 3, 4])
const ctx = (v) => env.authenticatedContext('diag-uid', { email_verified: v }).storage()
const p = (n) => `community-media/diag-uid/${n}`
const tryPut = async (label, store, path, type) => {
  try { await uploadBytes(ref(store, path), BYTES, type ? { contentType: type } : undefined); console.log(`DIAG ${label}: accepted`) }
  catch (e) { console.log(`DIAG ${label}: ${e.code} ${e.serverResponse ?? ''}`) }
}
const peek = async (label, path) => {
  await env.withSecurityRulesDisabled(async (c) => {
    const s = c.storage()
    try { const m = await getMetadata(ref(s, path)); console.log(`DIAG ${label}: object exists size=${m.size} type=${m.contentType}`) }
    catch (e) { console.log(`DIAG ${label}: ${e.code}`) }
    try { const l = await listAll(ref(s, 'community-media/diag-uid')); console.log(`DIAG ${label}: list=${l.items.map((i) => i.name).join(',')}`) }
    catch (e) { console.log(`DIAG ${label}: list ${e.code}`) }
  })
}

test('diag: refused then accepted on one path', async () => {
  await env.clearStorage()
  await tryPut('A1 fresh verified slot-5.webp', ctx(true), p('slot-5.webp'), 'image/webp')
  await tryPut('B1 unverified slot-0.webp', ctx(false), p('slot-0.webp'), 'image/webp')
  await peek('B2 after refusal', p('slot-0.webp'))
  await tryPut('B3 verified slot-0.webp', ctx(true), p('slot-0.webp'), 'image/webp')
  await tryPut('B4 verified slot-1.webp (untouched)', ctx(true), p('slot-1.webp'), 'image/webp')
  await env.clearStorage()
  await peek('B5 after clearStorage', p('slot-0.webp'))
  await tryPut('B6 verified slot-0.webp after clear', ctx(true), p('slot-0.webp'), 'image/webp')
  await tryPut('C1 verified slot-2.webp wrong type', ctx(true), p('slot-2.webp'), 'text/html')
  await tryPut('C2 verified slot-2.webp right type', ctx(true), p('slot-2.webp'), 'image/webp')
  await tryPut('D1 verified fresh slot-3.webp', ctx(true), p('slot-3.webp'), 'image/webp')
  await tryPut('D2 verified fresh slot-4.png', ctx(true), p('slot-4.png'), 'image/png')
})
