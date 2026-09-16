// A DEPLOY THAT IS SKIPPED BY MISTAKE IS A SITE THAT SILENTLY STOPS UPDATING.
//
// vercel.json carries an `ignoreCommand`: Vercel runs it per push and SKIPS the
// build when it exits 0. Ours exits 0 when a commit changed nothing the
// deployed site is made of.
//
// WHY IT EXISTS. Measured 2026-09-15: 63 commits were pushed in one day, each
// triggering a production deploy that stores its own copy of dist/ (5.3 MB) and
// of twelve serverless functions — ten of which bundle firebase-admin and its
// transitive @google-cloud/firestore (5.8 MB) and google-gax (8.7 MB), and one
// of which deliberately carries src/data/pipeline.js (992 KB) so the
// engineering backlog stays behind admin auth instead of being served as a
// public static asset. Deployment storage and function storage spiked against
// the plan's limits. Of those 63 commits, 12 touched only
// tests/, docs/, CHANGELOG.md or CLAUDE.md and changed nothing a visitor could
// load.
//
// THE FAILURE THIS GUARDS IS THE DANGEROUS DIRECTION. Skipping a deploy that
// SHOULD have run is invisible: the push succeeds, the commit is on main, and
// the site quietly serves the previous build. Somebody adds a new top-level
// directory the build reads — or renames one — and every deploy after it is
// skipped until a human notices the site is stale. Deploying when it was not
// needed costs a little storage; NOT deploying when it was needed costs the
// release.
//
// So the assertion is not "the command looks right". It is that every tracked
// top-level entry in the repository is CLASSIFIED — either it is in the
// ignoreCommand's path list, or it is named here as something the deployed site
// is not made of. A new directory is unclassified by construction and fails
// until somebody decides which it is.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const ROOT = process.cwd()
const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'))

/**
 * Top-level entries the deployed site is NOT made of. Each is here because a
 * change to it cannot alter what a visitor loads — not because it is
 * unimportant.
 */
const NOT_DEPLOYED = new Map([
  ['tests', 'the suite never ships; .vercelignore also keeps it out of the build context'],
  ['docs', 'engineering documentation, written for us'],
  ['brand', 'design source files'],
  ['.claude', 'agent configuration'],
  ['.github', 'CI workflows — they run on GitHub, not in the deploy'],
  ['CHANGELOG.md', 'a record'],
  ['CLAUDE.md', 'instructions for agents'],
  ['PRODUCT.md', 'product notes'],
  ['README.md', 'repository readme'],
  ['DESIGN.md', 'generated mirror of global.css; read by agents, not by the build'],
  ['LICENSE', 'licence text'],
  ['.gitignore', 'git only'],
  // Caught by this very test on the commit that introduced it, which is the
  // behaviour it exists for: a new top-level entry is unclassified by
  // construction. It shapes the build CONTEXT, not the built site — changing it
  // cannot alter what a visitor loads, so a commit touching only this file need
  // not deploy.
  ['.vercelignore', 'excludes files from the build context; changes nothing that is served'],
  ['.env.example', 'a template; real values are set in the Vercel dashboard'],
  ['.mcp.json', 'local tooling'],
  ['.firebaserc', 'Firebase CLI project alias — used when publishing rules, not when building'],
  ['firebase.json', 'Firebase CLI config — as above'],
  ['firestore.rules', 'published to Firebase by the CLI, never by a Vercel build'],
  ['storage.rules', 'as above'],
  ['playwright.config.js', 'test runner config'],
  ['eslint.config.js', 'linter config'],
  ['favicon.svg', 'NOT the served icon — public/ holds what ships'],
])

/** The paths the ignoreCommand watches, parsed out of the command itself. */
function watchedPaths() {
  const cmd = config.ignoreCommand || ''
  const marker = '-- '
  const i = cmd.indexOf(marker)
  if (i < 0) return []
  return cmd.slice(i + marker.length).trim().split(/\s+/).filter(Boolean)
}

test('the ignoreCommand exists and is the shape Vercel expects', () => {
  assert.ok(config.ignoreCommand,
    'vercel.json has no ignoreCommand, so every push — including a docs-only one — '
    + 'builds and stores a full deployment. See the header of this file for the '
    + 'measurement that motivated it.')
  // Exit 0 SKIPS the build. `git diff --quiet` exits 0 when nothing differs,
  // which is exactly the case we want skipped, so the polarity is correct by
  // construction rather than by a flag we could invert.
  assert.match(config.ignoreCommand, /^git diff --quiet HEAD\^ HEAD -- /,
    'the ignoreCommand is no longer a `git diff --quiet HEAD^ HEAD --` test. If it has '
    + 'been replaced, check the exit-code polarity: Vercel SKIPS the build on exit 0.')
  assert.ok(watchedPaths().length >= 5,
    'the ignoreCommand watches almost nothing, so nearly every push would be skipped')
})

test('every tracked top-level entry is either deployed or classified as not', () => {
  const tracked = execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' })
    .split('\n')
    .filter(Boolean)
    .map((f) => f.split('/')[0])
  const top = [...new Set(tracked)]

  // POSITIVE CONTROL: an empty listing classifies nothing and would pass.
  assert.ok(top.length > 15,
    `only ${top.length} top-level entries were found — git ls-files is not seeing the repo`)

  const watched = new Set(watchedPaths())
  const unclassified = top.filter((e) => !watched.has(e) && !NOT_DEPLOYED.has(e))

  assert.deepEqual(unclassified, [],
    'a tracked top-level entry is neither watched by the deploy ignoreCommand nor listed '
    + 'as not-deployed. Decide which it is. If the deployed site is made of it, add it to '
    + "the ignoreCommand's path list in vercel.json — otherwise a commit that changes ONLY "
    + 'that path will be skipped and the site will quietly serve the previous build.')
})

test('nothing is on both lists, because that would be a lie either way', () => {
  const both = watchedPaths().filter((p) => NOT_DEPLOYED.has(p))
  assert.deepEqual(both, [],
    'a path is both watched as deployable and listed as not-deployed. One of the two is '
    + 'wrong and the reasons in NOT_DEPLOYED are no longer trustworthy.')
})

test('the watched paths all still exist', () => {
  // A watched path that was renamed silently stops protecting anything: the
  // command keeps exiting 0 for changes under the new name.
  for (const p of watchedPaths()) {
    assert.ok(fs.existsSync(path.join(ROOT, p)),
      `the deploy ignoreCommand watches "${p}", which does not exist. If it was renamed, `
      + 'every commit touching the new name is now skipped.')
  }
})
