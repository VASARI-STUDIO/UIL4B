// The rules for when the brand kit chooser shows, and what it defaults to.
// One row per state of the popup rules; each fails if its rule is changed.
import test from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_DESIGN } from '../../src/data/designDefaults.js'
import {
  CHOOSER_GAP_MS, chooserDecision, classifyArrival, continueCopy, otherProjects,
  startNewMeta, whenText, workingStatus,
} from '../../src/utils/brandKitChooser.js'

const NOW = Date.UTC(2026, 10, 5, 3, 0, 0)
const H = 60 * 60 * 1000
const work = { ...DEFAULT_DESIGN, palette: { ...DEFAULT_DESIGN.palette, colors: ['#E4572E', '#17BEBB', '#FFC914', '#2E294E', '#76B041'] } }
const project = (id, design = work, extra = {}) => ({ id, name: id, design, updatedAt: '2026-11-01T00:00:00.000Z', ...extra })

test('workingStatus: empty, unsaved, saved and changed', () => {
  assert.equal(workingStatus(DEFAULT_DESIGN, []), 'empty')
  assert.equal(workingStatus({}, []), 'empty', 'a partial design reads as empty, not as built')
  assert.equal(workingStatus(work, []), 'unsaved')
  const a = project('a')
  assert.equal(workingStatus({ ...work, source: { projectId: 'a' } }, [a]), 'saved')
  assert.equal(workingStatus({ ...work, source: { projectId: 'a' }, palette: { ...work.palette, colors: ['#111111', '#222222'] } }, [a]), 'changed')
  assert.equal(workingStatus({ ...work, source: { projectId: 'gone' } }, []), 'unsaved', 'a deleted source holds nothing')
})

const base = { status: 'unsaved', arrival: 'brand-kit', flagActive: true, editedAt: NOW - 7 * H, now: NOW, session: null, pendingSave: false }
const cases = [
  ['S1 nothing built', { status: 'empty' }, false, 'continue'],
  ['S2 same session', { session: 'on', editedAt: NOW - 1 * H }, false, 'continue'],
  ['S2 same session, even after a gap', { session: 'on' }, false, 'continue'],
  ['S3 new tab under 6 h', { editedAt: NOW - 3 * H }, false, 'continue'],
  ['S4a over 6 h, at risk', {}, true, 'continue'],
  ['S4a changed project', { status: 'changed' }, true, 'continue'],
  ['S4b over 6 h, saved', { status: 'saved', editedAt: NOW - 26 * H }, true, 'new'],
  ['no stamp reads as long ago', { editedAt: null }, true, 'continue'],
  ['exactly 6 h', { editedAt: NOW - CHOOSER_GAP_MS }, true, 'continue'],
  ['S5a save waiting on sign-in', { pendingSave: true }, false, 'continue'],
  ['S5b signed in this tab, recent edit', { session: 'auth', editedAt: NOW - 1 * H }, true, 'continue'],
  ['S8b just finished, Build a brand kit', { status: 'saved', session: 'done', editedAt: NOW - 1 * H }, true, 'new'],
  ['finished, then a typed address', { status: 'saved', session: 'done', arrival: 'direct' }, false, 'new'],
  ['direct with the flag active', { arrival: 'direct' }, true, 'continue'],
  ['direct with the flag off', { arrival: 'direct', flagActive: false }, false, 'continue'],
  ['S7a link', { arrival: 'link' }, false, 'continue'],
  ['S7b new project', { arrival: 'new-project' }, false, 'continue'],
  ['S8a back', { arrival: 'back' }, false, 'continue'],
  ['not step one', { onFirstStep: false }, false, 'continue'],
]
for (const [name, patch, show, defaultChoice] of cases) {
  test(`chooserDecision: ${name}`, () => {
    const d = chooserDecision({ ...base, ...patch })
    assert.equal(d.show, show)
    assert.equal(d.defaultChoice, defaultChoice)
  })
}

test('classifyArrival reads the router once', () => {
  assert.equal(classifyArrival({ linked: true, state: { newProject: true } }), 'link')
  assert.equal(classifyArrival({ state: { newProject: true } }), 'new-project')
  assert.equal(classifyArrival({ state: { openBrandKitCard: true } }), 'brand-kit')
  assert.equal(classifyArrival({ state: { brandKitArrival: true } }), 'brand-kit')
  assert.equal(classifyArrival({ navType: 'POP', key: 'abc123' }), 'back')
  assert.equal(classifyArrival({ navType: 'POP', key: 'default' }), 'direct', 'a typed address is not Back')
  assert.equal(classifyArrival({ navType: 'PUSH', key: 'k' }), 'direct')
})

test('whenText: relative to yesterday, then a day and month', () => {
  assert.equal(whenText(NOW - 7 * H, NOW), '7 hours ago')
  assert.equal(whenText(NOW - 20 * 60 * 1000, NOW), '20 minutes ago')
  assert.match(whenText(NOW - 5 * 24 * H, NOW), /^\d{1,2} [A-Z][a-z]{2}$/)
  assert.equal(whenText(null, NOW), 'a while ago')
})

test('otherProjects: newest first, no archived, not the current one, three at most', () => {
  const list = [
    project('a', work, { updatedAt: '2026-11-01T00:00:00.000Z' }),
    project('b', work, { updatedAt: '2026-11-02T00:00:00.000Z' }),
    project('c', work, { updatedAt: '2026-11-03T00:00:00.000Z' }),
    project('d', work, { updatedAt: '2026-11-04T00:00:00.000Z' }),
    project('e', work, { updatedAt: '2026-11-05T00:00:00.000Z', archived: true }),
  ]
  assert.deepEqual(otherProjects(list, 'a').map((p) => p.id), ['d', 'c', 'b'])
})

test('copy: whole strings for each row', () => {
  const when = '7 hours ago'
  assert.deepEqual(continueCopy({ status: 'unsaved', done: 2, when, signedIn: false }),
    { label: 'Continue this brand kit', meta: '2 of 4 parts built · edited 7 hours ago · kept in this browser until you save it' })
  assert.match(continueCopy({ status: 'unsaved', done: 2, when, signedIn: true }).meta, /not saved as a project yet$/)
  assert.equal(continueCopy({ status: 'saved', name: 'Acme', done: 4, when }).label, 'Continue Acme')
  assert.match(continueCopy({ status: 'changed', name: 'Acme', done: 4, when }).meta, /^Changed since you last saved/)
  assert.equal(startNewMeta({ status: 'saved', name: 'A' }), 'A stays in your projects.')
  assert.equal(startNewMeta({ status: 'unsaved' }), 'This one moves to Your workspace as an unsaved brand kit.')
  assert.match(startNewMeta({ status: 'unsaved', slotWhen: '4 Nov' }), /replaces the unsaved brand kit from 4 Nov/)
})
