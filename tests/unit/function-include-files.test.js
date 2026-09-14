// `includeFiles` IS A SECOND LIST OF WHAT api/ IMPORTS, AND IT HAD DRIFTED.
//
// `vercel.json` tells Vercel which extra files to bundle into a serverless
// function. It said `src/data/*.js` — every file in the directory — while the
// functions import exactly two of them. Measured 2026-09-14: 977 KB kept, 280
// KB of files nothing imports shipped inside the function on every deploy.
//
// That is per deployment, and deployments are retained. The founder reported a
// spike in deployment and function storage on the same day.
//
// THE OTHER HALF OF THAT SPIKE IS NOT A BUG AND IS NOT FIXED HERE:
// src/data/pipeline.js is the backlog of record and it grows every time a PR
// appends its note — 659 KB at HEAD~60, 812 at HEAD~30, 939 at HEAD~10, 956 at
// HEAD. About 5 KB a commit. It is genuinely needed by `GET /api/ai?backlog=1`,
// which is admin-gated (it leaked publicly once — see `backlog-not-public`), so
// it cannot become a static asset. Shrinking it is a product decision about the
// backlog, not something a guard can assert.
//
// What this test CAN hold is that the bundle never again carries a file no
// function imports.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const vercel = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'))

/** Every `src/...` specifier any file under api/ imports, statically or not. */
function importedFromApi() {
  const found = new Set()
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) { walk(full); continue }
      if (!entry.name.endsWith('.js')) continue
      const src = fs.readFileSync(full, 'utf8')
      // Skip comment-only mentions: require a real import/from before the path.
      for (const m of src.matchAll(/(?:from|import\()\s*['"](?:\.\.\/)+src\/([^'"]+)['"]/g)) {
        found.add(m[1])
      }
    }
  }
  walk(path.join(root, 'api'))
  return found
}

test('the api functions import exactly the files includeFiles bundles', () => {
  const imported = [...importedFromApi()].sort()
  // Today: data/pipeline.js and data/moduleBoard.js. If a function starts
  // importing something else, this fails and the glob must be widened WITH it.
  assert.deepEqual(imported, ['data/moduleBoard.js', 'data/pipeline.js'],
    'api/ imports changed — update vercel.json includeFiles to match')

  const glob = vercel.functions?.['api/ai.js']?.includeFiles
  assert.equal(glob, 'src/data/{pipeline,moduleBoard}.js',
    'includeFiles no longer names exactly the imported files')
})

test('includeFiles does not bundle the whole data directory', () => {
  // The specific regression this exists to stop. A bare `*` glob is the easy
  // thing to write and silently ships every future data file too.
  const glob = vercel.functions?.['api/ai.js']?.includeFiles || ''
  assert.doesNotMatch(glob, /src\/data\/\*/,
    'includeFiles is back to a wildcard over src/data — that shipped 280 KB of unimported files')
})

test('this guard is not toothless — the dropped files really exist and are large', () => {
  // POSITIVE CONTROL. Both assertions above compare against constants, so they
  // would still pass if src/data had two files in it and nothing was being
  // dropped. Prove there is a real saving being protected.
  const dir = path.join(root, 'src/data')
  const all = fs.readdirSync(dir).filter((f) => f.endsWith('.js'))
  const kept = new Set(['pipeline.js', 'moduleBoard.js'])
  const droppedBytes = all
    .filter((f) => !kept.has(f))
    .reduce((n, f) => n + fs.statSync(path.join(dir, f)).size, 0)

  assert.ok(all.length > 10, `src/data has only ${all.length} files — the saving may have evaporated`)
  assert.ok(droppedBytes > 100_000,
    `only ${Math.round(droppedBytes / 1024)} KB would be dropped; this guard is protecting nothing`)
})
