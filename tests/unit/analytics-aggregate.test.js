// The shared daily aggregate, written by the real trackers and read back by the
// real reader.
//
// These tests run the real writers in src/utils/analytics.js (see
// tests/helpers/aggregate-harness.js) against an in-memory Firestore, then read
// the result back with the real reader, so what is read is what the writers
// produce.
import test, { beforeEach, afterEach, mock } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { stripComments, read } from './helpers/source-text.js'
import { loadAnalytics, flush, setDay, resetAll, store } from '../helpers/aggregate-harness.js'
import { buildAggregateDocs, expectedTotals, PLAN } from '../helpers/aggregate-fixture.js'

const DAY = 'analytics-daily/2026-09-18'

beforeEach(() => {
  resetAll()
  setDay(2026, 9, 18)
})
afterEach(() => { mock.timers.reset() })

const rowsToObject = (rows) => Object.fromEntries(rows)

// ── T1: writers → store → reader ────────────────────────────────────────────

test('what the real writers store is what the real reader lists', async () => {
  const a = await loadAnalytics()
  a.trackPageView('/create/palette')
  a.trackPageView('/create/palette')
  a.trackPageView('/')
  a.trackFontCopy('Inter')
  a.trackIconCopy('lucide', 'arrow-right')
  a.trackIconCopy('lucide', 'check')
  a.trackUpgradeGate('ai-palette')
  flush()

  const got = await a.getAggregateAnalytics(30)
  assert.equal(got.totalViews, 3)
  assert.deepEqual(rowsToObject(got.byPath), { create_palette: 2, root: 1 })
  assert.deepEqual(rowsToObject(got.byTool), { 'font-copy': 1 })
  assert.deepEqual(rowsToObject(got.byIcon), { 'lucide:arrow-right': 1, 'lucide:check': 1 })
  assert.deepEqual(rowsToObject(got.byPack), { lucide: 2 })
  assert.equal(got.iconCopies, 2)
})

test('every counter field is stored with its double-underscore prefix', async () => {
  const a = await loadAnalytics()
  a.trackPageView('/create/palette')
  a.trackFontCopy('Inter')
  a.trackIconCopy('lucide', 'check')
  a.trackToolOpen('palette')
  a.trackToolAction('palette')
  a.trackUpgradeGate('ai-palette')
  a.trackActivation('palette', 'save')
  flush()
  const fields = Object.keys(store.get(DAY)).filter(f => f !== 'day' && f !== 'views' && f !== 'icon-copies')
  assert.ok(fields.length >= 8, `expected the writers to produce several fields, got ${fields.join(', ')}`)
  for (const f of fields) {
    assert.match(f, /^(view|tool|open|icon|ipack)__/, `${f} lost its prefix`)
  }
  assert.ok(fields.includes('tool__gate__ai-palette'), 'the separator inside a funnel field must survive')
  assert.ok(fields.includes('tool__activation__palette__save'))
})

// ── T2: documents already in production ─────────────────────────────────────

test('single-underscore fields already stored are counted too', async () => {
  const a = await loadAnalytics()
  store.set('analytics-daily/2026-09-10', {
    day: '2026-09-10',
    views: 5,
    'icon-copies': 2,
    'view_create_palette': 3,
    'view_root': 2,
    'tool_font-copy': 4,
    'icon_lucide:check': 2,
    'ipack_lucide': 2,
  })
  const got = await a.getAggregateAnalytics(30)
  assert.deepEqual(rowsToObject(got.byPath), { create_palette: 3, root: 2 })
  assert.deepEqual(rowsToObject(got.byTool), { 'font-copy': 4 })
  assert.deepEqual(rowsToObject(got.byIcon), { 'lucide:check': 2 })
  assert.deepEqual(rowsToObject(got.byPack), { lucide: 2 })
})

test('the double-underscore form is tried first and the two shapes merge', async () => {
  const a = await loadAnalytics()
  store.set('analytics-daily/2026-09-10', { day: '2026-09-10', 'view_create_palette': 3, 'tool_font-copy': 1 })
  store.set('analytics-daily/2026-09-11', { day: '2026-09-11', 'view__create_palette': 2, 'tool__font-copy': 5 })
  const got = await a.getAggregateAnalytics(30)
  // `view__x` also starts with `view_`; read as the legacy shape its key would
  // be `_create_palette` and the two days would not add up.
  assert.deepEqual(rowsToObject(got.byPath), { create_palette: 5 })
  assert.deepEqual(rowsToObject(got.byTool), { 'font-copy': 6 })
})

// ── T3: one table of prefixes ───────────────────────────────────────────────

test('the writer and the reader read the same prefix table', async () => {
  const a = await loadAnalytics()
  for (const [kind, prefix] of Object.entries(a.AGG_PREFIX)) {
    const field = a.aggField(prefix, 'some thing')
    assert.ok(field.startsWith(prefix), `${kind}: a built field starts with its prefix`)
    assert.equal(a.classifyField(field)?.kind, kind, `${kind}: the reader classifies what the writer builds`)
  }
})

test('no prefix literal is typed anywhere but the shared table', () => {
  const src = stripComments(read('src/utils/analytics.js'))
  const table = src.slice(src.indexOf('export const AGG_PREFIX'), src.indexOf('})', src.indexOf('export const AGG_PREFIX')) + 2)
  assert.ok(table.includes("view: 'view__'"), 'the table was not found, so the check below proves nothing')
  const rest = src.replace(table, '')
  assert.doesNotMatch(rest, /['"`](view|tool|open|icon|ipack)_{1,2}/,
    'a prefix is spelled out beside the shared table, so one side can change without the other')
})

test('the admin browser suite builds its aggregate documents with the real writers', () => {
  const spec = stripComments(read('tests/user-sim/95-admin-spectrum.spec.js'))
  assert.match(spec, /aggregate-fixture/, 'spec 95 no longer reads the writer-built fixture')
  assert.doesNotMatch(spec, /\b(view|tool|open|icon|ipack)__\w/,
    'spec 95 hand-types an aggregate field name again')
})

// ── T4: funnel counters are not tool usage ──────────────────────────────────

test('funnel counters leave the tool lists and become their own list', async () => {
  const a = await loadAnalytics()
  a.trackToolAction('palette')
  a.trackFontCopy('Inter')
  a.trackUpgradeGate('ai-palette')
  a.trackUpgradeGate('ai-palette')
  a.trackFirstWinChoice('palette')
  a.startTimeToValue()
  a.trackActivation('palette', 'save')
  flush()
  const got = await a.getAggregateAnalytics(30)
  assert.deepEqual(rowsToObject(got.byTool), { palette: 1, 'font-copy': 1 }, 'only real actions are tool usage')
  const funnel = rowsToObject(got.funnel)
  assert.equal(funnel['Met an upgrade gate'], 2)
  assert.equal(funnel['Picked a starting point'], 1)
  assert.equal(funnel['Saved or exported a result'], 1)
  // One reading is written as a headline bucket and as a per-tool bucket; the
  // stage counts the reading once.
  assert.equal(funnel['Reached first value'], 1)
})

test('legacy funnel fields are split out the same way', async () => {
  const a = await loadAnalytics()
  store.set('analytics-daily/2026-09-10', {
    day: '2026-09-10',
    'tool_gate_ai-palette': 3,
    'tool_activation_palette_save': 2,
    'tool_firstwin_skipped': 1,
    'tool_ttv_under-1m': 2,
    'tool_ttv_under-1m_palette': 2,
    'tool_font-copy': 4,
  })
  const got = await a.getAggregateAnalytics(30)
  assert.deepEqual(rowsToObject(got.byTool), { 'font-copy': 4 })
  const funnel = rowsToObject(got.funnel)
  assert.deepEqual(funnel, {
    'Picked a starting point': 1,
    'Saved or exported a result': 2,
    'Reached first value': 2,
    'Met an upgrade gate': 3,
  })
})

// ── T5: resetting page analytics ────────────────────────────────────────────

test('the page reset clears both view shapes and keeps everything else', async () => {
  const a = await loadAnalytics()
  a.trackPageView('/plans')
  a.trackToolOpen('palette')
  a.trackFontCopy('Inter')
  a.trackIconCopy('lucide', 'check')
  flush()
  store.set('analytics-daily/2026-09-10', {
    day: '2026-09-10', views: 4, 'view_create_palette': 3, 'tool_font-copy': 4, 'icon_lucide:check': 1, 'ipack_lucide': 1,
  })

  assert.equal(await a.resetPageAnalytics(), true)

  for (const [p, data] of store.entries()) {
    const left = Object.keys(data).filter(f => f === 'views' || /^view_/.test(f))
    assert.deepEqual(left, [], `${p} still carries view fields`)
  }
  assert.equal(store.get(DAY)['open__palette'], 1)
  assert.equal(store.get(DAY)['tool__font-copy'], 1)
  assert.equal(store.get(DAY)['icon__lucide:check'], 1)
  const old = store.get('analytics-daily/2026-09-10')
  assert.equal(old['tool_font-copy'], 4)
  assert.equal(old['icon_lucide:check'], 1)
  assert.equal(old.ipack_lucide, 1)
})

// ── T6: Opened and Used ─────────────────────────────────────────────────────

test('a tool open is recorded as its own counter, apart from actions', async () => {
  const a = await loadAnalytics()
  a.trackToolOpen('palette')
  a.trackToolOpen('palette')
  a.trackToolAction('palette')
  a.trackToolOpen('contrast')
  flush()
  const got = await a.getAggregateAnalytics(30)
  assert.deepEqual(rowsToObject(got.byOpen), { palette: 2, contrast: 1 })
  assert.deepEqual(rowsToObject(got.byTool), { palette: 1 })
  assert.deepEqual(a.toolUsageRows(got), [
    { id: 'palette', opened: 2, used: 1 },
    { id: 'contrast', opened: 1, used: 0 },
  ])
})

test('the writer-built fixture reads back to the totals in the plan', async () => {
  const docs = await buildAggregateDocs()
  const a = await loadAnalytics()
  const got = await a.getAggregateAnalytics(30)
  const want = expectedTotals()
  assert.equal(Object.keys(docs).length, want.days)
  assert.equal(got.totalViews, want.totalViews)
  assert.deepEqual(rowsToObject(got.byOpen), want.opens)
  assert.deepEqual(rowsToObject(got.byTool), { ...want.used, 'font-copy': want.fontCopies })
  assert.equal(rowsToObject(got.funnel)['Met an upgrade gate'], want.gates)
  assert.equal(rowsToObject(got.funnel)['Saved or exported a result'], want.activations)
  assert.equal(rowsToObject(got.funnel)['Picked a starting point'], want.firstWins)
  assert.ok(got.byPath.length === Object.keys(PLAN.pages).length)
  assert.ok(got.byIcon.length > 0 && got.byPack.length > 0)
})

test('every exported tracker has a caller outside analytics.js', () => {
  const src = stripComments(read('src/utils/analytics.js'))
  const trackers = [...src.matchAll(/export function (track\w+)\(/g)].map(m => m[1])
  assert.ok(trackers.length >= 8, `found only ${trackers.length} trackers, so the check below proves little`)
  const files = []
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name)
      if (e.isDirectory()) walk(p)
      else if (/\.(jsx?|mjs)$/.test(e.name)) files.push(p)
    }
  }
  walk(path.join(process.cwd(), 'src'))
  const code = files
    .filter(f => !f.endsWith(path.join('utils', 'analytics.js')))
    .map(f => stripComments(fs.readFileSync(f, 'utf8')))
  const uncalled = trackers.filter(t => !code.some(c => new RegExp(`\\b${t}\\(`).test(c)))
  assert.deepEqual(uncalled, [], `exported trackers nobody calls: ${uncalled.join(', ')}`)
})

test('CreateTool counts one open per live tool and one use per open', () => {
  const src = stripComments(read('src/pages/CreateTool.jsx'))
  assert.match(src, /trackToolOpen\(toolSlug\)/)
  assert.match(src, /trackToolAction\(toolSlug\)/)
  const effect = /useEffect\(\(\) => \{[\s\S]*?\}, \[opened, toolSlug\]\)/.exec(src)?.[0] || ''
  assert.ok(effect.includes('trackToolOpen'), 'the open is counted in an effect keyed on the tool, not on every render')
  assert.match(effect, /if \(!opened\) return/, 'a route that mounts no live tool is not an open')
})

test('the Overview shows Opened and Used per tool', () => {
  const src = stripComments(read('src/pages/Admin.jsx'))
  assert.match(src, /toolUsageRows\(aggregate\)/)
  assert.match(src, /data-col="opened"/)
  assert.match(src, /data-col="used"/)
  assert.doesNotMatch(src, /title="Top Tools"/, 'the old single-number tools list is back')
})
