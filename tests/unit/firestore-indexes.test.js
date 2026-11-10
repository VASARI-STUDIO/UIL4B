// Every Firestore query that combines where() with orderBy() on another field
// needs a composite index declared in firestore.indexes.json. This test derives
// the required indexes from the query code and checks the file declares them.
//
// Firestore answers `where(a == x)` + `orderBy(b)` (a different field) only
// from a composite index; without one the read rejects with
// `failed-precondition`. Single-field indexes are automatic; composite ones
// exist only once firestore.indexes.json declares them and `firebase deploy
// --only firestore:indexes` has run.
//
// The required shapes come from the query code itself (comments stripped
// first), not a hand-kept list, so editing a query without touching the index
// file fails the test. A repo-wide scan also fails on any new where + orderBy
// query in src/ or api/ until it is covered here.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { stripJs } from '../helpers/strip-comments.js'
import { queueOrderField } from '../../src/utils/communityLimits.js'

const ROOT = process.cwd()
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8')

const indexes = JSON.parse(read('firestore.indexes.json')).indexes
const firebaseJson = JSON.parse(read('firebase.json'))

const QUEUE_API = 'src/utils/communityQueueApi.js'
const ADMIN_PAGE = 'src/pages/Admin.jsx'
const ANALYTICS = 'src/utils/analytics.js'
const AGG_COLLECTION_RE = /AGGREGATE_COLLECTION\s*=\s*'analytics-daily'/
const queueApi = stripJs(read(QUEUE_API))
const collectionName = /QUEUE_COLLECTION\s*=\s*'([^']+)'/.exec(stripJs(read('src/utils/communityQueue.js')))[1]

/** Body of `export async function <name>(` up to its closing brace at column 0. */
function functionBody(src, name) {
  const start = src.indexOf(`export async function ${name}(`)
  assert.notEqual(start, -1, `${name} not found in ${QUEUE_API}`)
  const end = src.indexOf('\n}', start)
  return src.slice(start, end + 2)
}

// A query sorts on a literal field or on queueOrderField(), which is createdAt
// until the community limits ship and submittedAt after. The index file has to
// serve both, so that call expands to both fields.
const ORDER_BY = /orderBy\(\s*(?:'([^']+)'|(queueOrderField)\(\))\s*,\s*'(asc|desc)'/
const orderFields = (m) => (m[1] ? [m[1]] : [queueOrderField(false), queueOrderField(true)])

/**
 * Index field lists a function's query needs. A `where` guarded by an `if (...)`
 * on the same line is optional, so each combination of optional filters is a
 * separate query shape. Equality fields come first (any order), then the sort.
 */
function requiredShapes(body) {
  const lines = body.split('\n')
  const required = []
  const optional = []
  for (const line of lines) {
    const m = /where\(\s*'([^']+)'\s*,\s*'([^']+)'/.exec(line)
    if (!m) continue
    assert.equal(m[2], '==', `${m[1]}: only equality filters are modelled here`)
    ;(/\bif\s*\(/.test(line) ? optional : required).push(m[1])
  }
  const sort = ORDER_BY.exec(body)
  assert.ok(sort, 'query has no orderBy')
  const dir = sort[3] === 'desc' ? 'DESCENDING' : 'ASCENDING'
  const shapes = []
  for (let mask = 0; mask < (1 << optional.length); mask++) {
    const eq = [...required, ...optional.filter((_, i) => mask & (1 << i))]
    for (const sortField of orderFields(sort)) shapes.push({ eq, sortField, dir })
  }
  return shapes
}

function hasIndex({ eq, sortField, dir }, collection = collectionName) {
  return indexes.some((ix) => {
    if (ix.collectionGroup !== collection || ix.queryScope !== 'COLLECTION') return false
    const f = ix.fields
    if (f.length !== eq.length + 1) return false
    const last = f[f.length - 1]
    if (last.fieldPath !== sortField || last.order !== dir) return false
    const lead = f.slice(0, -1)
    return lead.every((x) => x.order === 'ASCENDING') &&
      [...lead.map((x) => x.fieldPath)].sort().join() === [...eq].sort().join()
  })
}

test('firebase.json points Firestore at firestore.indexes.json', () => {
  assert.equal(firebaseJson.firestore.indexes, 'firestore.indexes.json')
  assert.ok(fs.existsSync(path.join(ROOT, 'firestore.indexes.json')))
})

test('listQueue (admin community queue) has its composite index', () => {
  const shapes = requiredShapes(functionBody(queueApi, 'listQueue'))
  assert.deepEqual(shapes, [
    { eq: ['status'], sortField: 'createdAt', dir: 'DESCENDING' },
    { eq: ['status'], sortField: 'submittedAt', dir: 'DESCENDING' },
  ])
  for (const s of shapes) assert.ok(hasIndex(s), `missing index: ${JSON.stringify(s)} on ${collectionName}`)
})

test('the Admin Prompts tab query (community-prompts, one status, newest first) has its composite index', () => {
  const src = stripJs(read(ADMIN_PAGE))
  assert.ok(/collection\(db,\s*'community-prompts'\)/.test(src), 'the Admin prompts query moved; update this case')
  const loader = src.slice(src.indexOf('const loadPrompts'), src.indexOf('const selectPromptFilter'))
  assert.ok(/where\(\s*'status'\s*,\s*'=='/.test(loader), 'the Admin prompts query lost its status filter')
  const sort = ORDER_BY.exec(loader)
  assert.ok(sort && sort[3] === 'desc', 'the Admin prompts query no longer sorts newest first')
  for (const sortField of orderFields(sort)) {
    assert.ok(hasIndex({ eq: ['status'], sortField, dir: 'DESCENDING' }, 'community-prompts'),
      `community-prompts needs a status ASC + ${sortField} DESC index in firestore.indexes.json`)
  }
})

test('the Admin overview range read (analytics-daily, day >= since, newest day first) needs no composite index', () => {
  const src = stripJs(read(ANALYTICS))
  const start = src.indexOf('export async function getAggregateAnalytics(')
  assert.notEqual(start, -1, 'getAggregateAnalytics moved; update this case')
  const body = src.slice(start, src.indexOf('\n}', start) + 2)
  // The range bound and the sort sit on the SAME field. Firestore serves a range filter plus an
  // orderBy on that one field from the automatic single-field index, so no entry is needed. If the
  // sort moved to another field, or a second inequality appeared, this would need a composite index.
  const wheres = [...body.matchAll(/\bwhere\(\s*'([^']+)'\s*,\s*'([^']+)'/g)]
  assert.deepEqual(wheres.map((m) => [m[1], m[2]]), [['day', '>=']], 'the range read must be one day >= filter')
  const sort = ORDER_BY.exec(body)
  assert.ok(sort && sort[1] === 'day' && sort[3] === 'desc', 'the range read must sort by day, newest first')
  assert.ok(AGG_COLLECTION_RE.test(src), 'the analytics-daily collection name moved; update this case')
  assert.ok(!indexes.some((ix) => ix.collectionGroup === 'analytics-daily'),
    'analytics-daily now has a composite index; this query does not need one, so check the case still holds')
})

test('listMySubmissions has an index with and without the kind filter', () => {
  const shapes = requiredShapes(functionBody(queueApi, 'listMySubmissions'))
  assert.equal(shapes.length, 2)
  for (const s of shapes) assert.ok(hasIndex(s), `missing index: ${JSON.stringify(s)} on ${collectionName}`)
})

test('every declared index is well formed and is not a redundant single-field entry', () => {
  for (const ix of indexes) {
    assert.ok(ix.collectionGroup, 'collectionGroup required')
    assert.equal(ix.queryScope, 'COLLECTION')
    assert.ok(ix.fields.length >= 2, `${ix.collectionGroup}: composite indexes need 2+ fields`)
    for (const f of ix.fields) assert.ok(['ASCENDING', 'DESCENDING'].includes(f.order))
  }
  const keys = indexes.map((ix) => ix.collectionGroup + ':' + ix.fields.map((f) => f.fieldPath + f.order).join(','))
  assert.equal(new Set(keys).size, keys.length, 'duplicate index declared')
})

function sourceFiles(dir) {
  const out = []
  for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = `${dir}/${e.name}`
    if (e.isDirectory()) out.push(...sourceFiles(rel))
    else if (/\.(js|jsx|mjs|ts|tsx)$/.test(e.name)) out.push(rel)
  }
  return out
}

test('no other src/ or api/ query combines where with orderBy, or filters on two inequality fields, unaccounted for', () => {
  const COVERED = new Set([QUEUE_API, ADMIN_PAGE, ANALYTICS])
  const INEQUALITY = new Set(['<', '<=', '>', '>=', '!=', 'not-in'])
  const orderedWhere = []
  const multiInequality = []
  for (const rel of [...sourceFiles('src'), ...sourceFiles('api')]) {
    const code = stripJs(read(rel))
    const wheres = [...code.matchAll(/\bwhere\(\s*'([^']+)'\s*,\s*'([^']+)'/g)]
    if (wheres.length && /\borderBy\(/.test(code)) orderedWhere.push(rel)
    const ineqFields = new Set(wheres.filter((m) => INEQUALITY.has(m[2])).map((m) => m[1]))
    if (ineqFields.size > 1) multiInequality.push(rel)
  }
  assert.deepEqual(orderedWhere.filter((r) => !COVERED.has(r)), [],
    'a where + orderBy query needs an entry in firestore.indexes.json and a case in this test')
  assert.deepEqual(multiInequality, [], 'inequality filters on different fields need a composite index')
  assert.deepEqual([...orderedWhere].sort(), [...COVERED].sort(), 'the covered file no longer holds a where + orderBy query')
})

test('listApprovedDesigns (the public grid) needs no composite index', () => {
  // It reads community-public with a sort on one field and no filter, which the
  // automatic single-field index serves. Adding a filter would need a composite
  // entry, and this case would then have to say so.
  const body = functionBody(queueApi, 'listApprovedDesigns')
  assert.ok(!/\bwhere\(/.test(body), 'the public grid gained a filter; it now needs a composite index')
  const sort = ORDER_BY.exec(body)
  assert.ok(sort && sort[1] === 'approvedAt' && sort[3] === 'desc', 'the public grid must sort by approvedAt, newest first')
  assert.ok(/PUBLIC_COLLECTION\s*=\s*'community-public'/.test(stripJs(read('src/utils/communityQueue.js'))))
  assert.ok(!indexes.some((ix) => ix.collectionGroup === 'community-public'),
    'community-public has a composite index; the public query does not need one')
  assert.ok(!indexes.some((ix) => ix.collectionGroup === collectionName && ix.fields.some((f) => f.fieldPath === 'reviewedAt')),
    'the retired status + kind + reviewedAt index is back')
})
