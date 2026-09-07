// THE SIGNED-IN TEST SESSION MUST NOT EXIST IN A PRODUCTION BUILD.
//
// `signIn()` (tests/user-sim/helpers.js) gives the acceptance suite a real
// session by resolving `firebase/auth` and `firebase/firestore` to doubles
// under tests/user-sim/fixtures/. That is the only way half this product could
// be audited at all — and it is also, by construction, code that hands out a
// signed-in Pro account to anyone who sets a `window` property. It must be
// impossible to ship, and "impossible" has to be measured rather than asserted
// in a comment.
//
// ── WHAT IS MEASURED, AND WHY BOTH HALVES ─────────────────────────────────
//
// STRUCTURAL. vite.config.js is loaded and asked to produce its config for
// each mode. `uil4b-test-session-double` must be absent from production's
// plugin list and present in test's. That is the gate itself, checked directly
// rather than through its consequences, so a refactor that keeps the markers
// out of the bundle by accident but leaves the plugin enabled still fails.
//
// EMPIRICAL. A REAL production build is run and every emitted file is scanned
// for the doubles' fingerprints. This is the half that catches a leak the gate
// does not explain — a stray import from src/, a fixture that became an entry,
// somebody re-exporting a shim from a shared module.
//
// ── THE POSITIVE CONTROL IS A SECOND BUILD ────────────────────────────────
//
// "No marker found" is exactly what a broken scanner, a wrong marker string
// and an empty output directory all look like. So the same scanner is run over
// a build of the same tree in the same way, differing only in `--mode test`,
// and every marker must be FOUND there. A scanner that cannot see the thing it
// is looking for fails this file before it can report a clean production build.
//
// ── WHY NOT dist/, AND WHY NOT ANYWHERE IN THE REPO ───────────────────────
//
// Not dist/, because `vite build` empties it and `vite preview` serves it
// live: building into dist/ from a unit test would delete the bundle a
// concurrent `npm run test:users` is being served from, which is the flake
// class recorded at length in tests/user-sim/base.js.
//
// Not anywhere else in the checkout either, and that was learned here. The
// first version wrote to tmp/ — gitignored, so it looked safe — and `npm run
// lint` went from 0 errors to 538, every one of them inside minified build
// output, because eslint.config.js's globalIgnores lists `dist` and not `tmp`.
// A unit test that leaves a lint bomb behind if it is ever interrupted is a
// unit test somebody deletes. Both builds go to the OS temp directory, outside
// the repository, and are removed afterwards. The bundle is the same bundle
// built the same way; only the folder differs.
//
// MUTATION-VERIFIED: adding the plugin unconditionally (dropping the
// `mode === 'test'` guard) fails both the structural and the empirical test,
// and importing a shim from src/utils/firebase.js fails the empirical one.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { execFileSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'

const ROOT = process.cwd()
const PLUGIN_NAME = 'uil4b-test-session-double'

/* Fingerprints of the doubles that SURVIVE MINIFICATION, which is the only
 * kind worth scanning for. A comment is not evidence: the minifier deletes it,
 * so a scan for one reports clean whatever the bundle contains.
 *
 * Each of these is a string literal the runtime needs:
 *   · the window property signIn() writes and test-session.js reads
 *   · the Symbol.for() keys the two doubles dispatch on
 *   · the marker embedded in the doubles' own error messages
 * The list is asserted to be findable in the test build below, so a marker
 * that stops surviving is caught rather than silently weakening the scan. */
const FINGERPRINTS = [
  '__UIL4B_TEST_SESSION__',
  'uil4b.testSession',
  'UIL4B_SIGNED_IN_FIXTURE_ONLY',
]

/** Every file under a directory, recursively. */
function walk(dir, out = []) {
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
function scan(dir) {
  const hits = []
  for (const file of walk(dir)) {
    const text = fs.readFileSync(file, 'latin1')
    for (const marker of FINGERPRINTS) {
      if (text.includes(marker)) hits.push({ marker, file: path.relative(dir, file) })
    }
  }
  return hits
}

/* Vite's own entry, run on this node rather than through `npx`. Two reasons,
 * and the second is the one that matters: a shelled-out `npx` needs
 * `shell: true` on Windows (which node warns about, and which would put an
 * unescaped path on a command line), and it resolves a binary that may not be
 * the vite this checkout installed. `node_modules/vite/bin/vite.js` is
 * unambiguous. */
const VITE_BIN = path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js')

function build(outDir, mode) {
  const args = [VITE_BIN, 'build', '--outDir', outDir, '--emptyOutDir']
  if (mode) args.push('--mode', mode)
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' })
}

// One build pair for the whole file. Two builds is the price of the positive
// control and they take about a second each. Process-unique names so two
// agents running the unit suite at once cannot land in each other's output.
const stamp = `${process.pid}-${Date.now()}`
const prodDir = path.join(os.tmpdir(), `uil4b-session-proof-prod-${stamp}`)
const testDir = path.join(os.tmpdir(), `uil4b-session-proof-test-${stamp}`)

let built = false
function ensureBuilt() {
  if (built) return
  build(prodDir, null)
  build(testDir, 'test')
  built = true
}

test.after(() => {
  for (const d of [prodDir, testDir]) {
    try { fs.rmSync(d, { recursive: true, force: true }) } catch { /* best effort */ }
  }
})

test('the double is wired in for --mode test and for nothing else', async () => {
  const mod = await import(pathToFileURL(path.join(ROOT, 'vite.config.js')).href)
  const factory = mod.default

  const names = (config) => (config.plugins || [])
    .flat(Infinity)
    .filter(Boolean)
    .map((p) => p.name)

  const production = names(factory({ mode: 'production', command: 'build' }))
  const testing = names(factory({ mode: 'test', command: 'build' }))

  assert.ok(
    testing.includes(PLUGIN_NAME),
    `the acceptance suite needs ${PLUGIN_NAME} under --mode test; the plugin list was `
    + `[${testing.join(', ')}]. Without it signIn() does nothing and every signed-in `
    + 'test in 57-signed-in-session.spec.js measures a signed-out page.',
  )
  assert.ok(
    !production.includes(PLUGIN_NAME),
    `${PLUGIN_NAME} IS IN THE PRODUCTION PLUGIN LIST. It resolves firebase/auth and `
    + 'firebase/firestore to doubles that hand out a signed-in Pro session to anyone who '
    + 'sets a window property. It must be constructed only when mode === "test" — see '
    + 'the note above it in vite.config.js.',
  )

  // Development is not a shipping build, but it is a running app with the
  // founder's real Firebase project behind it, and nothing about a dev server
  // should carry this either.
  const dev = names(factory({ mode: 'development', command: 'serve' }))
  assert.ok(!dev.includes(PLUGIN_NAME), `${PLUGIN_NAME} must not be active in development`)
})

test('the scanner can see the doubles — the positive control', () => {
  ensureBuilt()
  const hits = scan(testDir)
  const found = new Set(hits.map((h) => h.marker))

  for (const marker of FINGERPRINTS) {
    assert.ok(
      found.has(marker),
      `"${marker}" was NOT found in a --mode test build. Either the double is no longer `
      + 'reaching the bundle, or this marker no longer survives minification — and a '
      + 'marker that cannot be found proves nothing about the production build below. '
      + 'Fix the marker (it must be a string literal the runtime needs, not a comment) '
      + 'rather than deleting it from the list.',
    )
  }
})

test('a production build contains no trace of the signed-in test session', () => {
  ensureBuilt()

  // Non-vacuity: a build that emitted nothing would also contain no markers.
  const files = walk(prodDir)
  const scripts = files.filter((f) => f.endsWith('.js'))
  assert.ok(scripts.length > 10, `the production build emitted only ${scripts.length} scripts — `
    + 'this scan is not measuring a real bundle')
  assert.ok(
    files.some((f) => path.basename(f) === 'index.html'),
    'the production build emitted no index.html — this scan is not measuring a real bundle',
  )

  const hits = scan(prodDir)
  assert.deepEqual(
    hits, [],
    'THE SIGNED-IN TEST SESSION LEAKED INTO THE PRODUCTION BUNDLE:\n  '
    + hits.map((h) => `${h.marker} in ${h.file}`).join('\n  ')
    + '\n\nThat code accepts a session declared on `window` and answers Firebase from '
    + 'memory, so anything it reaches is signed in as whoever asks — Pro included. It '
    + 'must be reachable only from a --mode test build. Check that '
    + `${PLUGIN_NAME} in vite.config.js is still constructed only for that mode, and that `
    + 'nothing under src/ imports tests/user-sim/fixtures/.',
  )
})

/* Comments are not code, and several files under src/ legitimately NAME the
 * fixtures directory in prose — SaveTypeSystem.jsx says which fixture mounts
 * it, ProjectCard.jsx explains why it is not page-private. A scan that flagged
 * those would be a scan somebody turns off. Blanked rather than deleted so the
 * line numbers in a failure message still point at the real line. */
function withoutComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, lead) => lead + ' '.repeat(m.length - lead.length))
}

test('nothing under src/ reaches into the acceptance suite', () => {
  // The bundle scan above would catch this too, but only after a two-second
  // build and only as a mangled string in a minified chunk. This names the file
  // and the line, which is the difference between a failure someone can fix and
  // one they have to investigate.
  const REACHES_IN = [
    // An import, a re-export, or a dynamic import of anything under fixtures/.
    /\bfrom\s*['"][^'"]*tests\/user-sim\/[^'"]*['"]/,
    /\b(?:import|require)\s*\(\s*['"][^'"]*tests\/user-sim\/[^'"]*['"]/,
    // Or reading the declaration itself, which would make src/ aware of the
    // fixture without importing it.
    /__UIL4B_TEST_SESSION__/,
  ]
  const offenders = []
  const walkSrc = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name)
      if (entry.isDirectory()) { walkSrc(p); continue }
      if (!/\.(jsx?|tsx?)$/.test(entry.name)) continue
      const text = withoutComments(fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n'))
      text.split('\n').forEach((line, i) => {
        if (REACHES_IN.some((re) => re.test(line))) {
          offenders.push(`${path.relative(ROOT, p)}:${i + 1}  ${line.trim()}`)
        }
      })
    }
  }
  walkSrc(path.join(ROOT, 'src'))
  assert.deepEqual(
    offenders, [],
    'A file under src/ reaches into the acceptance suite\'s fixtures:\n  '
    + `${offenders.join('\n  ')}\n\n`
    + 'Application code must never import a test double. The doubles are installed by '
    + `${PLUGIN_NAME} in vite.config.js, which exists only under --mode test; an import `
    + 'from src/ would put them in the production bundle regardless.',
  )
})

test('the comment stripper does not blind the scan above — the control', () => {
  // If withoutComments() over-matched, the test above would pass for a file
  // that really did import a double. Both directions, on the exact shapes that
  // exist in src/ today.
  const stripped = withoutComments([
    "// import x from '../../tests/user-sim/fixtures/firebase-auth.js'",
    "/* tests/user-sim/fixtures/type-save.html mounts the view */",
    "import { real } from '../../tests/user-sim/fixtures/firebase-auth.js'",
    "const url = 'https://example.com/tests/user-sim/x'",
  ].join('\n')).split('\n')

  assert.ok(!/tests\/user-sim/.test(stripped[0]), 'a line comment must be blanked')
  assert.ok(!/tests\/user-sim/.test(stripped[1]), 'a block comment must be blanked')
  assert.match(stripped[2], /tests\/user-sim/, 'a REAL import must survive stripping')
  assert.match(stripped[3], /example\.com/, 'a URL in a string must not be eaten as a comment')
})
