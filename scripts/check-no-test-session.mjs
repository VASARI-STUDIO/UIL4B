// Fails a production build that contains the signed-in test session's doubles.
//
//   node scripts/check-no-test-session.mjs [--out <dir>]     (default: dist)
//
// The doubles (tests/user-sim/fixtures/) answer Firebase from memory for a
// session declared on `window`, and are meant to exist only in a `--mode test`
// build. This is the last step of `npm run build`, so a build that leaked them
// stops there instead of reaching a deploy.
//
// FINGERPRINTS is shared with tests/unit/test-session-not-in-production.test.js,
// which proves each one is found in a test build before it is trusted here.
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

/* Fingerprints of the doubles that SURVIVE MINIFICATION, which is the only kind
 * worth scanning for. A comment is not evidence: the minifier deletes it, so a
 * scan for one reports clean whatever the bundle contains.
 *
 * Each of these is a string literal the runtime needs:
 *   · the window property signIn() writes and test-session.js reads
 *   · the Symbol.for() keys the two doubles dispatch on
 *   · the marker embedded in the doubles' own error messages */
export const FINGERPRINTS = [
  '__UIL4B_TEST_SESSION__',
  'uil4b.testSession',
  'UIL4B_SIGNED_IN_FIXTURE_ONLY',
]

/** Every file under a directory, recursively. */
export function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(p, out)
    else out.push(p)
  }
  return out
}

/**
 * Which fingerprints appear anywhere in a build output, and in which files.
 *
 * Reads every emitted file as binary-safe latin1 rather than filtering by
 * extension: a leak into a source map, a manifest, an inlined asset or an HTML
 * shell is still a leak, and choosing which files to look at is how a scan
 * comes to miss the one that mattered.
 */
export function scan(dir) {
  const hits = []
  for (const file of walk(dir)) {
    const text = fs.readFileSync(file, 'latin1')
    for (const marker of FINGERPRINTS) {
      if (text.includes(marker)) hits.push({ marker, file: path.relative(dir, file) })
    }
  }
  return hits
}

/** The folder named by `--out <dir>` or `--out=<dir>`, else `dist`. */
export function outDirFrom(argv) {
  const i = argv.findIndex((a) => a === '--out' || a.startsWith('--out='))
  if (i === -1) return 'dist'
  const value = argv[i] === '--out' ? argv[i + 1] : argv[i].slice('--out='.length)
  if (!value || value.startsWith('--')) throw new Error('--out needs a folder')
  return value
}

/**
 * Scans `dir` and returns { ok, message }. A folder that is missing or holds no
 * files fails too: an empty scan would report clean for any build.
 */
export function check(dir) {
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    return { ok: false, message: `check-no-test-session: ${dir} is not a folder, so there is nothing to check.` }
  }
  if (walk(dir).length === 0) {
    return { ok: false, message: `check-no-test-session: ${dir} holds no files, so there is nothing to check.` }
  }
  const hits = scan(dir)
  if (hits.length) {
    return {
      ok: false,
      message: 'check-no-test-session: the signed-in test session is in this build.\n  '
        + hits.map((h) => `${h.marker} in ${h.file}`).join('\n  ')
        + '\nIt is meant to be reachable only from a --mode test build. Check that '
        + 'uil4b-test-session-double in vite.config.js is built only for that mode, and that '
        + 'nothing under src/ imports tests/user-sim/fixtures/.',
    }
  }
  return { ok: true, message: `check-no-test-session: ${dir} is clean.` }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let dir
  try { dir = outDirFrom(process.argv.slice(2)) } catch (err) {
    console.error(`check-no-test-session: ${err.message}`)
    process.exit(2)
  }
  const result = check(dir)
  if (result.ok) console.log(result.message)
  else console.error(result.message)
  process.exit(result.ok ? 0 : 1)
}
