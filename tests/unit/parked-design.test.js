// Unsaved work is put aside before the working design is replaced.
//
// The rules live in src/utils/parkedDesign.js so they run without a browser:
// whether a working design is at risk, the single parking slot, and the round
// trip that brings a parked design back exactly. The screens that call them
// (a new project, opening a project, a shared palette link) are held by
// tests/user-sim/289-brand-kit-no-silent-loss.spec.js.
import test from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_DESIGN } from '../../src/data/designDefaults.js'
import { projectSnapshot } from '../../src/utils/designPatch.js'
import {
  PARKED_KEY, designsMatch, isAtRisk, parkIfAtRisk, readParked, takeParked,
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

test('there is one slot: a newer parked design replaces the older one', () => {
  const s = store()
  parkIfAtRisk({ design: WORK, projects: [], storage: s, now: 1 })
  parkIfAtRisk({ design: OTHER, projects: [], storage: s, now: 2 })
  const held = readParked(s)
  assert.equal(held.parkedAt, 2)
  assert.deepEqual(held.design, clone(OTHER))
})

test('park then take back returns the design byte for byte and empties the slot', () => {
  const s = store()
  const { slot } = parkIfAtRisk({ design: { ...WORK, source: { projectId: 'gone' } }, projects: [], storage: s })
  const back = takeParked(slot, s)
  assert.equal(JSON.stringify(back), JSON.stringify({ ...WORK, source: { projectId: 'gone' } }))
  assert.equal(s.has(PARKED_KEY), false)
})

test('taking back an old toast\'s design leaves a newer parked design in the slot', () => {
  const s = store()
  const { slot: older } = parkIfAtRisk({ design: WORK, projects: [], storage: s, now: 1 })
  parkIfAtRisk({ design: OTHER, projects: [], storage: s, now: 2 })
  assert.deepEqual(takeParked(older, s), clone(WORK))
  assert.equal(readParked(s).parkedAt, 2)
})

test('a full or blocked store parks nothing and does not throw', () => {
  const full = { getItem: () => null, setItem: () => { throw new Error('quota') }, removeItem: () => {} }
  assert.deepEqual(parkIfAtRisk({ design: WORK, projects: [], storage: full }), { slot: null, fresh: false })
})

test('a damaged slot reads as empty', () => {
  assert.equal(readParked(store({ [PARKED_KEY]: '{not json' })), null)
  assert.equal(readParked(store({ [PARKED_KEY]: JSON.stringify({ parkedAt: 1 }) })), null)
})
