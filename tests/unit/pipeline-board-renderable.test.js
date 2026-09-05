// The owner's Pipeline board renders from src/data/pipeline.js by FILTERING:
// Admin.jsx does `PIPELINE_PROCESSES.filter(p => p.stage === stage.id)` for each
// column, and `NEXT_TODO.filter(t => todoFilter === 'all' || t.status === ...)`
// with a fixed list of filter buttons.
//
// So a value that is merely PLAUSIBLE — `stage: 'active'`, which reads fine and
// is not one of the five real columns — does not raise anything. The row simply
// belongs to no column and DISAPPEARS FROM THE BOARD, on the one screen whose
// entire job is to tell the founder what is in flight. This was written after
// exactly that happened while re-scoping the Discover items: 'active' was typed,
// the module parsed, the build was green, and the item was gone.
//
// The status side has the same shape one level down: an unknown status still
// renders (TODO_STATUS_LABEL falls back to the raw string) but it can never be
// FILTERED to, because todoFilters is a hand-written array — so the item is
// invisible to anyone using the filters rather than reading the whole list.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import { PIPELINE_STAGES, PIPELINE_PROCESSES, NEXT_TODO } from '../../src/data/pipeline.js'

const ADMIN = fs.readFileSync(path.join(process.cwd(), 'src/pages/Admin.jsx'), 'utf8')

// Read the board's own vocabulary out of Admin.jsx rather than restating it
// here. A copy in this file would be one more list to keep in step, which is
// the defect class the whole test is about.
function arrayLiteral(name) {
  const m = ADMIN.match(new RegExp(`${name}\\s*=\\s*\\[([^\\]]*)\\]`))
  assert.ok(m, `could not find the ${name} array in Admin.jsx`)
  return m[1].split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean)
}

function objectKeys(name) {
  const m = ADMIN.match(new RegExp(`${name}\\s*=\\s*\\{([^}]*)\\}`))
  assert.ok(m, `could not find the ${name} map in Admin.jsx`)
  return [...m[1].matchAll(/(\w[\w-]*)\s*:/g)].map(x => x[1])
}

test('every workstream sits in a stage the board actually renders a column for', () => {
  const columns = new Set(PIPELINE_STAGES.map(s => s.id))
  const orphans = PIPELINE_PROCESSES
    .filter(p => !columns.has(p.stage))
    .map(p => `${p.id} (stage: '${p.stage}')`)
  assert.deepEqual(orphans, [],
    'these workstreams belong to no column and vanish from the Pipeline board:\n  '
    + `${orphans.join('\n  ')}\n  valid stages: ${[...columns].join(', ')}`)
})

test('every queue item carries a status the board can label AND filter to', () => {
  const labels = new Set(objectKeys('TODO_STATUS_LABEL'))
  const filters = new Set(arrayLiteral('todoFilters').filter(f => f !== 'all'))

  const unlabelled = [...new Set(NEXT_TODO.map(t => t.status))].filter(s => !labels.has(s))
  assert.deepEqual(unlabelled, [],
    `these statuses print as a raw string on the board: ${unlabelled.join(', ')}`)

  const unfilterable = [...new Set(NEXT_TODO.map(t => t.status))].filter(s => !filters.has(s))
  assert.deepEqual(unfilterable, [],
    'these statuses exist in the data but have no filter button, so items in them '
    + `are invisible to anyone using the filters: ${unfilterable.join(', ')}`)
})

test('the board colours every status it labels', () => {
  // A status with a label and no colour falls back to var(--t3) and reads as
  // "to do" — the least urgent thing on the board, whatever it actually is.
  const labels = objectKeys('TODO_STATUS_LABEL')
  const colors = new Set(objectKeys('TODO_STATUS_COLOR'))
  const uncoloured = labels.filter(l => !colors.has(l))
  assert.deepEqual(uncoloured, [], `no colour for: ${uncoloured.join(', ')}`)
})

test('deferred is a distinct state from blocked', () => {
  // Recorded because it is a product decision, not a styling one: `blocked`
  // asserts something unknown is in the way, and community-backend is waiting
  // on a founder decision that has already been made. Collapsing the two would
  // misreport the queue.
  const labels = new Set(objectKeys('TODO_STATUS_LABEL'))
  assert.ok(labels.has('deferred') && labels.has('blocked'))
  const colors = ADMIN.match(/TODO_STATUS_COLOR\s*=\s*\{([^}]*)\}/)[1]
  const deferred = colors.match(/deferred:\s*'([^']+)'/)?.[1]
  const blocked = colors.match(/blocked:\s*'([^']+)'/)?.[1]
  assert.ok(deferred && blocked && deferred !== blocked,
    'deferred and blocked must not read identically on the board')
})
