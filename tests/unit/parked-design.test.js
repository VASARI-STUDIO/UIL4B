// Unsaved work is put aside before the working design is replaced.
//
// The rules live in src/utils/parkedDesign.js so they run without a browser:
// whether a working design is at risk, the parking slot and the shelf of older
// kits behind it, and the round trip that brings a parked design back exactly.
// The screens that call them (a new project, opening a project, a shared palette link) are held by
// tests/user-sim/289-brand-kit-no-silent-loss.spec.js.
import test from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_DESIGN } from '../../src/data/designDefaults.js'
import { projectSnapshot } from '../../src/utils/designPatch.js'
import {
  PARKED_KEY, PARKED_SHELF_KEY, SHELF_LIMIT, designsMatch, dropParked, isAtRisk, parkIfAtRisk, putBack,
  readParked, readShelf, takeParked,
} from '../../src/utils/parkedDesign.js'

function store(seed = {}) {
  const m = new Map(Object.entries(seed))
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    has: (k) => m.has(k),
  }
}

const clone = (v) => JSON.parse(JSON.stringify(v))
const withColours = (colours, extra = {}) => ({
  ...clone(DEFAULT_DESIGN),
  palette: { ...DEFAULT_DESIGN.palette, base: colours[0], colors: colours },
  ...extra,
})
const project = (id, design) => ({ id, name: `Project ${id}`, design: clone(design) })

const WORK = withColours(['#E4572E', '#17BEBB', '#FFC914'])
const OTHER = withColours(['#2E294E', '#541388'])

// ── Is it at risk? ─────────────────────────────────────────────────────────

test('an untouched default design is not at risk', () => {
  assert.equal(isAtRisk(DEFAULT_DESIGN, []), false)
  assert.equal(isAtRisk({}, []), false, 'an empty object reads as the defaults')
  assert.equal(isAtRisk(null, []), false)
})

test('a changed design with no project to hold it is at risk, signed in or not', () => {
  assert.equal(isAtRisk(WORK, []), true)
  assert.equal(isAtRisk(WORK, [project('a', OTHER)]), true)
  assert.equal(isAtRisk(WORK, undefined), true)
})

test('a design that matches the project it came from is not at risk', () => {
  const list = [project('a', WORK)]
  assert.equal(isAtRisk({ ...WORK, source: { projectId: 'a' } }, list), false)
})

test('a design edited since it was opened from a project is at risk', () => {
  const list = [project('a', OTHER)]
  assert.equal(isAtRisk({ ...WORK, source: { projectId: 'a' } }, list), true)
})

test('a design whose source project is gone is at risk unless another project holds it', () => {
  const gone = { ...WORK, source: { projectId: 'deleted' } }
  assert.equal(isAtRisk(gone, [project('a', OTHER)]), true)
  assert.equal(isAtRisk(gone, [project('b', WORK)]), false)
})

test('a design with no source that equals a saved project is safe', () => {
  assert.equal(isAtRisk(WORK, [project('a', OTHER), project('b', WORK)]), false)
})

test('key order, missing defaults and source do not make two designs differ', () => {
  const reordered = { typeScale: WORK.typeScale, fonts: WORK.fonts, palette: WORK.palette }
  assert.equal(designsMatch(WORK, reordered), true)
  assert.equal(designsMatch(WORK, { ...WORK, source: { projectId: 'x' } }), true)
  assert.equal(designsMatch(WORK, OTHER), false)
})

test('a project snapshot never carries source', () => {
  const snap = projectSnapshot({ ...WORK, source: { projectId: 'a' } }, { identityName: 'Kit' })
  assert.equal('source' in snap, false)
  assert.equal(snap.identity.name, 'Kit')
})

// ── The slot ───────────────────────────────────────────────────────────────

test('at-risk work is parked with the time, and the working design is not touched', () => {
  const s = store()
  const before = JSON.stringify(WORK)
  const { slot, fresh } = parkIfAtRisk({ design: WORK, projects: [], storage: s, now: 1000 })
  assert.equal(fresh, true)
  assert.equal(slot.parkedAt, 1000)
  assert.deepEqual(readParked(s), slot)
  assert.equal(JSON.stringify(WORK), before)
})

test('nothing is parked for a default design or for work a project already holds', () => {
  const s = store()
  assert.deepEqual(parkIfAtRisk({ design: DEFAULT_DESIGN, projects: [], storage: s }), { slot: null, fresh: false })
  assert.deepEqual(parkIfAtRisk({ design: WORK, projects: [project('a', WORK)], storage: s }), { slot: null, fresh: false })
  assert.equal(s.has(PARKED_KEY), false)
})

test('parking the same design twice writes once and says so once', () => {
  const s = store()
  const first = parkIfAtRisk({ design: WORK, projects: [], storage: s, now: 1 })
  const second = parkIfAtRisk({ design: WORK, projects: [], storage: s, now: 2 })
  assert.equal(first.fresh, true)
  assert.equal(second.fresh, false)
  assert.equal(readParked(s).parkedAt, 1)
})

test('a newer parked design takes the slot, and the older one waits behind it', () => {
  const s = store()
  parkIfAtRisk({ design: WORK, projects: [], storage: s, now: 1 })
  parkIfAtRisk({ design: OTHER, projects: [], storage: s, now: 2 })
  const held = readParked(s)
  assert.equal(held.parkedAt, 2)
  assert.deepEqual(held.design, clone(OTHER))
  assert.deepEqual(readShelf(s).map((x) => x.parkedAt), [1], 'the older kit is kept, not replaced')
})

test('emptying the slot brings the kit waiting behind it forward', () => {
  const s = store()
  const { slot: older } = parkIfAtRisk({ design: WORK, projects: [], storage: s, now: 1 })
  const { slot: newer } = parkIfAtRisk({ design: OTHER, projects: [], storage: s, now: 2 })
  assert.deepEqual(takeParked(newer, s), clone(OTHER))
  assert.deepEqual(readParked(s), older)
  assert.equal(s.has(PARKED_SHELF_KEY), false)
  assert.deepEqual(dropParked(s), null, 'and with nothing behind it the slot is empty')
  assert.equal(s.has(PARKED_KEY), false)
})

test('a design parked again moves to the front, kept once', () => {
  const s = store()
  parkIfAtRisk({ design: WORK, projects: [], storage: s, now: 1 })
  parkIfAtRisk({ design: OTHER, projects: [], storage: s, now: 2 })
  parkIfAtRisk({ design: WORK, projects: [], storage: s, now: 3 })
  assert.equal(readParked(s).parkedAt, 3)
  assert.deepEqual(readShelf(s).map((x) => x.design), [clone(OTHER)])
})

test('the shelf keeps the newest few and lets the oldest go', () => {
  const s = store()
  for (let i = 0; i < SHELF_LIMIT + 3; i++) {
    parkIfAtRisk({ design: withColours([`#0000${String(i).padStart(2, '0')}`, '#ffffff']), projects: [], storage: s, now: i + 1 })
  }
  const shelf = readShelf(s)
  assert.equal(shelf.length, SHELF_LIMIT)
  assert.deepEqual(shelf.map((x) => x.parkedAt), [SHELF_LIMIT + 2, SHELF_LIMIT + 1, SHELF_LIMIT, SHELF_LIMIT - 1].slice(0, SHELF_LIMIT))
})

test('Undo of a discard puts the kit back into an empty slot', () => {
  const s = store()
  const { slot } = parkIfAtRisk({ design: WORK, projects: [], storage: s, now: 1 })
  dropParked(s)
  assert.deepEqual(putBack(slot, s), slot)
  assert.deepEqual(readParked(s), slot)
})

test('Undo of a discard never overwrites a kit parked since: both are kept, newest shown', () => {
  const s = store()
  const { slot: discarded } = parkIfAtRisk({ design: WORK, projects: [], storage: s, now: 1 })
  dropParked(s)
  const { slot: since } = parkIfAtRisk({ design: OTHER, projects: [], storage: s, now: 2 })
  assert.deepEqual(putBack(discarded, s), since, 'the newer kit stays in the slot')
  assert.deepEqual(readParked(s), since)
  assert.deepEqual(readShelf(s), [discarded], 'and the discarded one waits behind it')
})

test('Undo twice puts the kit back once', () => {
  const s = store()
  const { slot } = parkIfAtRisk({ design: WORK, projects: [], storage: s, now: 1 })
  dropParked(s)
  putBack(slot, s)
  putBack(slot, s)
  assert.deepEqual(readParked(s), slot)
  assert.equal(s.has(PARKED_SHELF_KEY), false)
})

// A store that refuses writes past a size, the way a full localStorage does.
function fullAfter(limit, seed = {}) {
  const s = store(seed)
  const size = () => ['vs-previous-design', 'vs-previous-designs'].reduce((n, k) => n + (s.getItem(k) || '').length, 0)
  const set = s.setItem
  s.setItem = (k, v) => {
    const was = s.getItem(k)
    set(k, v)
    if (size() > limit) { if (was == null) s.removeItem(k); else set(k, was); throw new Error('quota') }
  }
  return s
}

test('Undo into a full store never loses the kit parked since', () => {
  const since = { design: clone(OTHER), parkedAt: 2 }
  const discarded = { design: clone(WORK), parkedAt: 3 }
  const s = fullAfter(JSON.stringify(since).length + 10, { [PARKED_KEY]: JSON.stringify(since) })
  putBack(discarded, s)
  assert.deepEqual(readParked(s), since, 'the kit in the slot is still there when there is no room to shelve it')
})

test('a discard that cannot bring the next kit forward leaves the slot as it was', () => {
  const older = { design: clone(WORK), parkedAt: 1 }
  const newer = { design: clone(OTHER), parkedAt: 2 }
  const s = store({ [PARKED_KEY]: JSON.stringify(newer), [PARKED_SHELF_KEY]: JSON.stringify([older]) })
  const set = s.setItem
  s.setItem = (k, v) => { if (k === PARKED_KEY) throw new Error('quota'); set(k, v) }
  assert.throws(() => dropParked(s))
  assert.deepEqual(readParked(s), newer, 'not emptied')
  assert.deepEqual(readShelf(s), [older])
  assert.equal(takeParked(newer, s), null, 'and Undo from a toast gives nothing back rather than losing it')
  assert.deepEqual(readParked(s), newer)
})

test('a shelf copy of the kit being dropped is not brought back', () => {
  const kit = { design: clone(WORK), parkedAt: 2 }
  const s = store({ [PARKED_KEY]: JSON.stringify(kit), [PARKED_SHELF_KEY]: JSON.stringify([{ ...kit, parkedAt: 1 }]) })
  assert.equal(dropParked(s), null)
  assert.equal(s.has(PARKED_KEY), false)
  assert.equal(s.has(PARKED_SHELF_KEY), false)
})

test('parking a kit already on a full shelf does not push an unrelated one off', () => {
  const s = store()
  const designs = Array.from({ length: SHELF_LIMIT + 1 }, (_, i) => withColours([`#1100${String(i).padStart(2, '0')}`, '#ffffff']))
  designs.forEach((d, i) => parkIfAtRisk({ design: d, projects: [], storage: s, now: i + 1 }))
  // The slot holds the last; the shelf is full. Park the oldest shelved one again.
  assert.equal(readShelf(s).length, SHELF_LIMIT)
  parkIfAtRisk({ design: designs[0], projects: [], storage: s, now: 100 })
  const kept = [readParked(s), ...readShelf(s)].map((x) => x.design.palette.colors[0])
  assert.deepEqual(kept.sort(), designs.map((d) => d.palette.colors[0]).sort(), 'every kit is still somewhere')
})

test('a damaged shelf reads as empty', () => {
  assert.deepEqual(readShelf(store({ [PARKED_SHELF_KEY]: '{not json' })), [])
  assert.deepEqual(readShelf(store({ [PARKED_SHELF_KEY]: JSON.stringify([{ parkedAt: 1 }, 'x']) })), [])
})

test('park then take back returns the design byte for byte and empties the slot', () => {
  const s = store()
  const { slot } = parkIfAtRisk({ design: { ...WORK, source: { projectId: 'gone' } }, projects: [], storage: s })
  const back = takeParked(slot, s)
  assert.equal(JSON.stringify(back), JSON.stringify({ ...WORK, source: { projectId: 'gone' } }))
  assert.equal(s.has(PARKED_KEY), false)
})

test('an old toast gives nothing back once a newer design is parked, and both stay', () => {
  const s = store()
  const { slot: older } = parkIfAtRisk({ design: WORK, projects: [], storage: s, now: 1 })
  parkIfAtRisk({ design: OTHER, projects: [], storage: s, now: 2 })
  assert.equal(takeParked(older, s), null)
  assert.equal(readParked(s).parkedAt, 2)
  assert.deepEqual(readShelf(s), [older])
})

test('a slot cleared since (sign-out, a switch) gives nothing back', () => {
  const s = store()
  const { slot } = parkIfAtRisk({ design: WORK, projects: [], storage: s, now: 1 })
  s.removeItem(PARKED_KEY)
  assert.equal(takeParked(slot, s), null, 'the toast must not restore work into a browser that changed hands')
})

test('a full or blocked store parks nothing and does not throw', () => {
  const full = { getItem: () => null, setItem: () => { throw new Error('quota') }, removeItem: () => {} }
  assert.deepEqual(parkIfAtRisk({ design: WORK, projects: [], storage: full }), { slot: null, fresh: false })
})

test('a damaged slot reads as empty', () => {
  assert.equal(readParked(store({ [PARKED_KEY]: '{not json' })), null)
  assert.equal(readParked(store({ [PARKED_KEY]: JSON.stringify({ parkedAt: 1 }) })), null)
})
