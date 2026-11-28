// WIDENING A FAMILY'S WEIGHTS MUST NOT UNLOAD IT.
//
// loadFont() upgrades a family's stylesheet by adding a wider <link>. Removing
// the old link first drops the faces already painted, so text in that family
// falls back until the new sheet arrives. The old link has to stay until the new
// one settles, on load or on error.
//
// The document is faked: a head that records appended and removed links, and
// links whose onload / onerror the test fires by hand.
import test from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'

// googleFonts.js imports without file extensions and reads import.meta.env; the hook supplies both.
register('./helpers/stub-loader.mjs', import.meta.url, { data: { queueApi: false, env: {} } })

const REAL_DOCUMENT = globalThis.document

function fakeDocument() {
  const head = {
    links: [],
    appendChild(link) { this.links.push(link) },
    removeChild(link) { this.links = this.links.filter(l => l !== link) },
  }
  return {
    head,
    createElement() {
      const link = { dataset: {}, remove() { head.removeChild(link) } }
      return link
    },
  }
}

test.after(() => {
  if (REAL_DOCUMENT === undefined) delete globalThis.document
  else globalThis.document = REAL_DOCUMENT
})

async function setup() {
  globalThis.document = fakeDocument()
  const { loadFont } = await import('../../src/utils/googleFonts.js')
  return { loadFont, head: globalThis.document.head }
}

const tick = () => new Promise(resolve => setImmediate(resolve))

test('the old link stays until the wider link has loaded', async () => {
  const { loadFont, head } = await setup()
  const first = loadFont('Swap Load Sans', [400])
  const [old] = head.links
  old.onload()
  await first

  const wider = loadFont('Swap Load Sans', [400, 700])
  assert.equal(head.links.length, 2, 'both links are in the document while the new one loads')
  assert.ok(head.links.includes(old), 'the old link is still there')

  head.links[1].onload()
  await wider
  await tick()
  assert.deepEqual(head.links, [head.links[0]])
  assert.notEqual(head.links[0], old, 'only the wider link is left')
})

test('an error on the wider link still removes the old one', async () => {
  const { loadFont, head } = await setup()
  const first = loadFont('Swap Error Sans', [400])
  const [old] = head.links
  old.onload()
  await first

  const wider = loadFont('Swap Error Sans', [400, 700])
  assert.ok(head.links.includes(old))

  head.links[1].onerror()
  assert.equal(await wider, 'error')
  await tick()
  assert.equal(head.links.length, 1)
  assert.ok(!head.links.includes(old))
})
