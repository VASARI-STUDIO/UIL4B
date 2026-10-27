// THE ICON GRID SPRITE — src/utils/iconSprite.js (the DOM-free half).
//
// The grid draws pack icons as <svg><use href="#id"/></svg> from one hidden
// sprite. What must hold: an icon that goes in comes out looking the same, ids
// inside it cannot collide with another icon's, and anything the sanitiser would
// change stays OUT of the sprite (the grid then keeps drawing it as an image).
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createSprite, symbolMarkup } from '../../src/utils/iconSprite.js'

const wrap = (body, box = '0 0 24 24') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box}" width="24" height="24">${body}</svg>`

test('a clean stroke icon becomes a symbol with its body untouched', () => {
  const body = '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2"><path d="M5 12h14"/></g>'
  assert.equal(symbolMarkup(wrap(body), 'ics1'), `<symbol id="ics1" viewBox="0 0 24 24">${body}</symbol>`)
})

test('a non-square box keeps its own viewBox', () => {
  const body = '<path d="M0 0h32v24H0z"/>'
  assert.equal(symbolMarkup(wrap(body, '0 0 32 24'), 'ics2'), `<symbol id="ics2" viewBox="0 0 32 24">${body}</symbol>`)
})

test('ids and the references to them take the symbol id as a prefix', () => {
  const body = '<defs><linearGradient id="a"><stop offset="0" stop-color="#000"/></linearGradient></defs><path fill="url(#a)" d="M0 0h24v24H0z"/>'
  const out = symbolMarkup(wrap(body), 'ics3')
  assert.match(out, /id="ics3\.a"/)
  assert.match(out, /fill="url\(#ics3\.a\)"/)
  assert.doesNotMatch(out, /id="a"/)
})

test('two icons that both name a gradient "a" do not share an id', () => {
  const body = '<defs><clipPath id="a"><path d="M0 0h24v24H0z"/></clipPath></defs><path clip-path="url(#a)" d="M1 1h4v4H1z"/>'
  const one = symbolMarkup(wrap(body), 'ics4')
  const two = symbolMarkup(wrap(body), 'ics5')
  assert.notEqual(one.match(/id="ics\d\.a"/)[0], two.match(/id="ics\d\.a"/)[0])
})

test('an icon the sanitiser would change stays out of the sprite', () => {
  for (const body of [
    '<style>path{fill:red}</style><path d="M0 0h24v24H0z"/>',
    '<script>alert(1)</script><path d="M0 0h24v24H0z"/>',
    '<path d="M0 0h24v24H0z" onload="alert(1)"/>',
    '<path d="M0 0h24v24H0z"><animate attributeName="opacity" values="0;1" dur="1s"/></path>',
    '<filter id="f"><feGaussianBlur stdDeviation="1"/></filter><path filter="url(#f)" d="M0 0h24v24H0z"/>',
    '<image href="https://example.test/x.png"/>',
  ]) {
    assert.equal(symbolMarkup(wrap(body), 'ics6'), null, body)
  }
})

test('malformed, empty and oversized markup is refused', () => {
  assert.equal(symbolMarkup('', 'ics7'), null)
  assert.equal(symbolMarkup('not svg', 'ics7'), null)
  assert.equal(symbolMarkup(wrap(''), 'ics7'), null)
  assert.equal(symbolMarkup(wrap(`<path d="${'M0 0h1'.repeat(10000)}"/>`), 'ics7'), null)
})

test('a bad id is a caller bug, not a quiet null', () => {
  assert.throws(() => symbolMarkup(wrap('<path d="M0 0h24v24H0z"/>'), '1bad'), RangeError)
})

// ── The bookkeeping: createSprite over a fake host ───────────────────────────
//
// The fake host keeps the ids it holds in a Set, read back from the markup it is
// handed, so "the sprite holds exactly the symbols the map names" can be checked
// from the outside. `live` stands for the ids some cell's <use> points at.

const ICON = wrap('<path d="M0 0h24v24H0z"/>')
const item = (key) => ({ key, text: ICON })
const items = (prefix, n) => Array.from({ length: n }, (_, i) => item(`${prefix}${i}`))

function fakeHost({ maxId = 0 } = {}) {
  const h = {
    isAlive: true,
    held: new Set(),
    live: new Set(),
    removed: [],
    appends: 0,
    clears: 0,
    alive: () => h.isAlive,
    append(html) {
      h.appends += 1
      for (const m of html.matchAll(/<symbol id="(ics\d+)"/g)) h.held.add(m[1])
    },
    remove(id) { h.held.delete(id); h.removed.push(id) },
    liveIds: () => h.live,
    maxId: () => Math.max(maxId, ...[...h.held].map((id) => Number(id.slice(3)))),
    clear() { h.clears += 1; h.held.clear() },
  }
  return h
}

/** A sprite whose hosts are made here, newest last, so a test can kill one and get the next. */
function spriteOver({ max = 10, trimTo = 6, firstMaxId = 0 } = {}) {
  const hosts = []
  const sprite = createSprite({
    max,
    trimTo,
    acquire: () => { const h = fakeHost({ maxId: hosts.length ? 0 : firstMaxId }); hosts.push(h); return h },
  })
  return { sprite, hosts, host: () => hosts[hosts.length - 1] }
}

const idOf = (sprite, key) => sprite.ref(key).slice(1)

test('every icon of the batch just registered is in the sprite, however full it was', () => {
  const { sprite, host } = spriteOver()
  for (let round = 0; round < 12; round += 1) {
    const batch = items(`r${round}-`, 4)
    sprite.register(batch)
    for (const { key } of batch) {
      assert.match(sprite.ref(key), /^#ics\d+$/, `${key} is missing after round ${round}`)
      assert.ok(host().held.has(idOf(sprite, key)), `${key}'s symbol is not in the host`)
    }
  }
})

test('a symbol leaves the host exactly when its icon leaves the map', () => {
  const { sprite, host } = spriteOver()
  const keys = []
  for (let round = 0; round < 12; round += 1) {
    const batch = items(`r${round}-`, 4)
    keys.push(...batch.map((i) => i.key))
    sprite.register(batch)
    const mapped = keys.filter((k) => sprite.ref(k))
    // Same count, and every mapped icon's symbol is held: no leftover symbol, no missing one.
    assert.equal(host().held.size, mapped.length, `round ${round}: host and map disagree`)
    for (const k of mapped) assert.ok(host().held.has(idOf(sprite, k)))
    assert.equal(sprite.size, mapped.length)
  }
  assert.ok(host().removed.length > 0, 'positive control: this run evicted something')
  assert.ok(sprite.size <= 10, 'the cap holds')
  // The oldest went first; the newest batch is still there.
  assert.equal(sprite.ref('r0-0'), '')
  assert.ok(sprite.ref('r11-3'))
})

test('symbols a cell still points at survive a trim, the unreferenced ones around them do not', () => {
  const { sprite, host } = spriteOver()
  sprite.register(items('a', 8))
  const kept = ['a0', 'a3']
  for (const k of kept) host().live.add(idOf(sprite, k))
  const keptIds = kept.map((k) => idOf(sprite, k))
  sprite.register(items('b', 5))
  for (const k of kept) assert.ok(sprite.ref(k), `${k} was dropped while a cell drew it`)
  for (const id of keptIds) assert.ok(host().held.has(id) && !host().removed.includes(id))
  assert.equal(sprite.ref('a1'), '', 'an unreferenced old icon should have gone')
  assert.ok(host().removed.length > 0)
})

test('a batch larger than the cap is kept whole, and is what the next batch makes room from', () => {
  const { sprite, host } = spriteOver()
  const big = items('big', 15)
  sprite.register(big)
  assert.equal(host().removed.length, 0, 'nothing of the incoming batch may be evicted')
  for (const { key } of big) assert.ok(sprite.ref(key), `${key} was evicted`)
  sprite.register(items('next', 2))
  assert.ok(sprite.ref('next0') && sprite.ref('next1'))
  assert.ok(sprite.size <= 10, 'a later register trims back under the cap')
})

test('registering icons already in the sprite leaves their symbols alone', () => {
  const { sprite, host } = spriteOver()
  sprite.register(items('k', 8))
  const before = Array.from({ length: 8 }, (_, i) => sprite.ref(`k${i}`))
  // Re-sent along with new ones, over the cap: the known ones are in the batch, so none goes.
  sprite.register([...items('k', 8), ...items('n', 4)])
  assert.deepEqual(Array.from({ length: 8 }, (_, i) => sprite.ref(`k${i}`)), before, 'a known icon got a new id')
  assert.deepEqual(host().removed, [])
})

test('an icon the sanitiser refuses is known but has no symbol, and leaves without a removal', () => {
  const { sprite, host } = spriteOver()
  sprite.register([{ key: 'bad', text: wrap('<style>path{fill:red}</style><path d="M0 0h24v24H0z"/>') }, item('good')])
  assert.equal(sprite.known('bad'), true)
  assert.equal(sprite.ref('bad'), '')
  assert.ok(sprite.ref('good'))
  sprite.register(items('x', 9))
  assert.equal(sprite.known('bad'), false, 'the refused entry should age out like any other')
  assert.ok(host().removed.every((id) => /^ics\d+$/.test(id)), 'only real symbols are removed from the host')
})

test('asking for an id, or whether an icon is known, writes nothing', () => {
  const { sprite, host } = spriteOver()
  sprite.register(items('a', 2))
  const appends = host().appends
  const held = [...host().held]
  for (let i = 0; i < 5; i += 1) { sprite.ref('a0'); sprite.ref('nope'); sprite.known('nope'); sprite.touch('nope') }
  assert.equal(sprite.ref('nope'), '')
  assert.equal(sprite.known('nope'), false)
  assert.equal(sprite.size, 2)
  assert.equal(host().appends, appends)
  assert.deepEqual([...host().held], held)
})

test('touching an icon moves it to the back of the line for eviction', () => {
  const { sprite } = spriteOver()
  sprite.register(items('a', 8))
  sprite.touch('a0')
  sprite.register(items('b', 5))
  assert.ok(sprite.ref('a0'), 'a0 was used last of the old ones, so it outlives them')
  assert.equal(sprite.ref('a1'), '')
})

test('when the host is gone the ref is empty, and the next register builds a new host with fresh ids', () => {
  const { sprite, hosts } = spriteOver()
  sprite.register(items('a', 3))
  const oldIds = ['a0', 'a1', 'a2'].map((k) => idOf(sprite, k))
  const [first] = hosts
  first.isAlive = false
  assert.equal(sprite.ref('a0'), '', 'a cell must not point into a host that left the page')

  sprite.register(items('b', 2))
  assert.equal(hosts.length, 2, 'a second host was made')
  const second = hosts[1]
  assert.equal(sprite.ref('a0'), '', 'the dead host took the old map with it')
  assert.deepEqual([...first.held].sort(), [...oldIds].sort(), 'the dead host is not written to or trimmed')
  assert.deepEqual([...second.held].sort(), ['b0', 'b1'].map((k) => idOf(sprite, k)).sort())
  const newIds = ['b0', 'b1'].map((k) => Number(idOf(sprite, k).slice(3)))
  assert.ok(Math.min(...newIds) > Math.max(...oldIds.map((id) => Number(id.slice(3)))), 'ids are never reused')
})

test('a new host that already holds symbols is counted past and emptied', () => {
  const hosts = []
  // The page already carries a sprite with ics40 in it (an older copy of the module wrote it).
  const sprite = createSprite({
    max: 10,
    trimTo: 6,
    acquire: () => { const h = fakeHost({ maxId: 40 }); h.held.add('ics40'); hosts.push(h); return h },
  })
  sprite.register(items('a', 2))
  assert.equal(hosts[0].clears, 1)
  assert.ok(!hosts[0].held.has('ics40'), 'a symbol this instance knows nothing about was left in the host')
  const ids = ['a0', 'a1'].map((k) => Number(idOf(sprite, k).slice(3)))
  assert.ok(Math.min(...ids) > 40, `ids ${ids} collide with the adopted host's ics40`)
})

test('with no document there is nothing to write to and nothing to point at', () => {
  const sprite = createSprite({ acquire: () => null })
  sprite.register(items('a', 2))
  assert.equal(sprite.ref('a0'), '')
  assert.equal(sprite.known('a0'), false)
  assert.equal(sprite.size, 0)
})

test('registerSliced pauses once between runs: ceil(n / size) - 1 times', async () => {
  for (const [n, size, pauses] of [[12, 5, 2], [10, 5, 1], [5, 5, 0], [1, 25, 0], [51, 25, 2], [0, 5, 0]]) {
    const { sprite, host } = spriteOver({ max: 1000, trimTo: 900 })
    let paused = 0
    await sprite.registerSliced(items('s', n), { size, pause: async () => { paused += 1 } })
    assert.equal(paused, pauses, `${n} items in runs of ${size}`)
    assert.equal(host().held.size, n, 'every item landed')
    assert.ok(host().appends <= Math.ceil(n / size), 'one append per run')
  }
})

test('the icons of a sliced batch survive another batch\'s trim while it is paused', async () => {
  const { sprite, host } = spriteOver({ max: 10, trimTo: 4 })
  const sliced = items('s', 12)
  let paused = 0
  await sprite.registerSliced(sliced, {
    size: 5,
    pause: async () => {
      paused += 1
      // Mid-slice: the first run is in, the rest are not. This batch needs room, and the
      // sliced icons are old, unreferenced and not in its keys, so only the in-flight mark saves them.
      if (paused === 1) sprite.register(items('other', 6))
    },
  })
  assert.equal(paused, 2)
  for (const { key } of sliced) assert.ok(sprite.ref(key), `${key} was evicted while its batch was paused`)
  for (const { key } of sliced) assert.ok(host().held.has(idOf(sprite, key)))
  for (const k of ['other0', 'other5']) assert.ok(sprite.ref(k), `${k}, the batch that interrupted, is missing`)
})

test('after a sliced batch ends its icons are ordinary: a later trim may take them', async () => {
  const { sprite } = spriteOver({ max: 10, trimTo: 4 })
  await sprite.registerSliced(items('s', 6), { size: 3, pause: async () => {} })
  sprite.register(items('later', 8))
  assert.equal(sprite.ref('s0'), '', 'the in-flight mark was never released')
  assert.ok(sprite.ref('later7'))
})

test('a host replaced between runs gets the rest of the batch', async () => {
  const { sprite, hosts } = spriteOver({ max: 100, trimTo: 90 })
  await sprite.registerSliced(items('s', 6), { size: 3, pause: async () => { hosts[0].isAlive = false } })
  assert.equal(hosts.length, 2)
  assert.equal(hosts[1].held.size, 3, 'the second run went into the new host')
  assert.ok(sprite.ref('s5') && !sprite.ref('s0'), 'only the run written to the live host is pointed at')
})
