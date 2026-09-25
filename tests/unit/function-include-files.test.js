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
// THE OTHER HALF OF THAT SPIKE IS NOT A BUG AND WAS NOT FIXED HERE:
// src/data/pipeline.js is the backlog of record and it grows every time a PR
// appends its note — 659 KB at HEAD~60, 812 at HEAD~30, 939 at HEAD~10, 956 at
// HEAD. About 5 KB a commit. It was genuinely needed by `GET /api/ai?backlog=1`,
// which is admin-gated (it leaked publicly once — see `78-admin-tabs-local-data`), so
// it could not become a static asset. Shrinking it was a product decision about
// the backlog, not something a guard can assert.
//
// ═══════════════════════════════════════════════════════════════════════════
// AND ON 2026-09-16 THE PRODUCT DECISION WAS TAKEN: THE BOARDS LEFT THE REPO
// ═══════════════════════════════════════════════════════════════════════════
//
// The repository went PUBLIC to use free GitHub Actions minutes, which made the
// backlog world-readable. The founder kept the repository public and took the
// notes out of it instead: src/data/pipeline.js and src/data/moduleBoard.js are
// gitignored, on his machine only. .gitignore carries the decision and its cost.
//
// `includeFiles` then named two paths that do not exist in a clone, so it was
// removed, and the `functions` block was empty after it and went too.
//
// THAT CHANGES WHAT THIS FILE CAN ASSERT, NOT WHY IT EXISTS. The old assertion
// was "includeFiles names exactly what api/ imports". Pinned to the literal
// glob, it would now be a line saying the founder must undo his own decision.
// The property underneath it survives intact and is what is checked below:
//
//   EVERY src/ FILE api/ IMPORTS IS EITHER BUNDLED BY includeFiles OR
//   DELIBERATELY ABSENT FROM THE REPOSITORY — AND NEVER BOTH, AND NEVER
//   NEITHER.
//
// "Deliberately absent" is read from `git check-ignore` at test time rather
// than listed here, so this cannot go stale in either direction: re-tracking
// pipeline.js fails this file until `includeFiles` is put back, and adding a
// third board to .gitignore is recognised the moment it is ignored. A file that
// is neither bundled nor ignored is a function importing something the deploy
// will not carry, which is the original drift under a new name.
//
// What it still CANNOT say is whether the bundle is small. That was never
// assertable and is now moot: nothing extra is bundled at all.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

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

const includeFilesGlob = () => vercel.functions?.['api/ai.js']?.includeFiles || ''

/**
 * `src/data/{pipeline,moduleBoard}.js` -> ['data/pipeline.js', 'data/moduleBoard.js'].
 * One brace group, which is the only form this repository has ever used. A glob
 * this cannot read fails loudly below rather than expanding to nothing, because
 * expanding to nothing would read as "bundles no files" and pass.
 */
function bundledFiles() {
  const glob = includeFilesGlob()
  if (!glob) return []
  const under = /^src\/(.+)$/.exec(glob)
  assert.ok(under, `includeFiles is "${glob}", which does not start at src/ — this file cannot read it`)
  const rest = under[1]
  const brace = /^([^{}]*)\{([^{}]+)\}([^{}]*)$/.exec(rest)
  if (!brace) {
    assert.doesNotMatch(rest, /[{}*?[\]]/,
      `includeFiles is "${glob}", a glob shape this file has never seen. Teach bundledFiles() to `
      + 'expand it — do not delete the check, because an unexpandable glob reads as "bundles nothing".')
    return [rest]
  }
  return brace[2].split(',').map((part) => `${brace[1]}${part.trim()}${brace[3]}`)
}

/**
 * The subset of `paths` git is ignoring, or null if git cannot answer here.
 * `git check-ignore` exits 1 when it matches none of them, which execFileSync
 * reports as a throw — that is a real answer and not a fault.
 */
function gitIgnored(paths) {
  if (!paths.length) return new Set()
  try {
    const out = execFileSync('git', ['check-ignore', '--stdin'],
      { cwd: root, input: paths.join('\n'), encoding: 'utf8' })
    return new Set(out.split(/\r?\n/).filter(Boolean).map((p) => p.replace(/\\/g, '/')))
  } catch (e) {
    if (e.status === 1) return new Set()
    if (e.stdout) return new Set(String(e.stdout).split(/\r?\n/).filter(Boolean).map((p) => p.replace(/\\/g, '/')))
    // No git binary, or not a work tree. Reported as "cannot answer" so the
    // tests below skip out loud instead of deciding every path is tracked.
    return null
  }
}

const IMPORTED = [...importedFromApi()].sort()
const IGNORED = gitIgnored(IMPORTED.map((rel) => `src/${rel}`))
const NO_GIT = IGNORED === null
  && 'git cannot answer `check-ignore` in this directory, so which imports are deliberately '
  + 'local-only cannot be established here. This assertion needs a real work tree.'

test('the api functions still import exactly the two internal boards', () => {
  // Unchanged from the day this file was written, and still the anchor: if a
  // function starts importing something else out of src/, it has to be
  // classified below as bundled or as deliberately absent.
  assert.deepEqual(IMPORTED, ['data/moduleBoard.js', 'data/pipeline.js'],
    'api/ imports changed — every src/ file a function imports must be either named by '
    + 'vercel.json includeFiles or gitignored on purpose, and a new one is neither')
})

test('every src/ file api/ imports is either bundled by includeFiles or deliberately local-only', { skip: NO_GIT }, () => {
  const bundled = bundledFiles().sort()
  const localOnly = IMPORTED.filter((rel) => IGNORED.has(`src/${rel}`)).sort()

  const classified = [...new Set([...bundled, ...localOnly])].sort()
  assert.deepEqual(classified, IMPORTED,
    'an api/ import is neither bundled into the function nor deliberately kept out of the '
    + 'repository, so the deploy will not carry it and nothing says that was intended.\n'
    + `  imported:   ${IMPORTED.join(', ') || '(none)'}\n`
    + `  bundled:    ${bundled.join(', ') || '(none — vercel.json has no includeFiles)'}\n`
    + `  local-only: ${localOnly.join(', ') || '(none)'}\n`
    + 'Either add it to includeFiles, or gitignore it with the reason beside it.')

  const both = bundled.filter((rel) => localOnly.includes(rel))
  assert.deepEqual(both, [],
    `includeFiles names ${both.join(', ')}, which git is ignoring. The deploy would be told to bundle `
    + 'a file that is in no clone — either the file came back into the repository and .gitignore is '
    + 'stale, or includeFiles is naming something that left it.')
})

test('includeFiles does not bundle the whole data directory', () => {
  // The specific regression this file was written to stop. A bare `*` glob is
  // the easy thing to write and silently ships every future data file too.
  // Still checked with includeFiles absent, because absent is not permanent —
  // the day something under src/ is imported by a function again, this is the
  // line that stops it coming back as a wildcard.
  assert.doesNotMatch(includeFilesGlob(), /src\/data\/\*/,
    'includeFiles is back to a wildcard over src/data — that shipped 280 KB of unimported files')
})

test('CONTROL: the local-only detection really reads git, and does not call everything ignored', { skip: NO_GIT }, () => {
  // Both assertions above are satisfied if `IGNORED` contains the two boards.
  // A check-ignore that answered "yes" to everything would satisfy them too, and
  // would then excuse any future import from ever being bundled. Prove it says
  // no to something, and yes to exactly what .gitignore claims.
  const control = gitIgnored(['api/ai.js', 'vercel.json', 'src/pages/Admin.jsx'])
  assert.deepEqual([...control], [],
    'git check-ignore reports tracked, committed files as ignored — it is not being read correctly, '
    + 'and "this import is deliberately absent" would be true of every import there will ever be.')

  const boards = ['src/data/pipeline.js', 'src/data/moduleBoard.js']
  assert.deepEqual([...gitIgnored(boards)].sort(), [...boards].sort(),
    'the two internal boards are not gitignored. If they were put back into the repository on '
    + 'purpose, restore vercel.json\'s functions["api/ai.js"].includeFiles to name them — the '
    + 'function imports them and the deploy will not otherwise carry them.')

  // The archive is not imported by anything, so it is not in IMPORTED and no
  // assertion above touches it. Named here because it left the repository in
  // the same decision and for the same reason, and a half-applied decision is
  // the thing nobody notices.
  assert.deepEqual([...gitIgnored(['docs/backlog/archive-done-2026-09-16.js'])],
    ['docs/backlog/archive-done-2026-09-16.js'],
    'the archived backlog rows are tracked again — they are 172 rows of the same candid prose '
    + 'the live board was taken out of the public repository to protect.')
})
