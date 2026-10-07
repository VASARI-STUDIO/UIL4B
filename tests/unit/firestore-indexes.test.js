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

const ROOT = process.cwd()
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8')

const indexes = JSON.parse(read('firestore.indexes.json')).indexes
const firebaseJson = JSON.parse(read('firebase.json'))

const QUEUE_API = 'src/utils/communityQueueApi.js'
const queueApi = stripJs(read(QUEUE_API))
const collectionName = /QUEUE_COLLECTION\s*=\s*'([^']+)'/.exec(stripJs(read('src/utils/communityQueue.js')))[1]

/** Body of `export async function <name>(` up to its closing brace at column 0. */
function functionBody(src, name) {
  const start = src.indexOf(`export async function ${name}(`)
  assert.notEqual(start, -1, `${name} not found in ${QUEUE_API}`)
  const end = src.indexOf('\n}', start)
  return src.slice(start, end + 2)
}

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
  const sort = /orderBy\(\s*'([^']+)'\s*,\s*'(asc|desc)'/.exec(body)
  assert.ok(sort, 'query has no orderBy')
  const shapes = []
  for (let mask = 0; mask < (1 << optional.length); mask++) {
    const eq = [...required, ...optional.filter((_, i) => mask & (1 << i))]
    shapes.push({ eq, sortField: sort[1], dir: sort[2] === 'desc' ? 'DESCENDING' : 'ASCENDING' })
  }
  return shapes
}

function hasIndex({ eq, sortField, dir }) {
  return indexes.some((ix) => {
    if (ix.collectionGroup !== collectionName || ix.queryScope !== 'COLLECTION') return false
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
  assert.deepEqual(shapes, [{ eq: ['status'], sortField: 'createdAt', dir: 'DESCENDING' }])
  for (const s of shapes) assert.ok(hasIndex(s), `missing index: ${JSON.stringify(s)} on ${collectionName}`)
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
  const COVERED = new Set([QUEUE_API])
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
  assert.deepEqual(orderedWhere, [...COVERED], 'the covered file no longer holds a where + orderBy query')
})
