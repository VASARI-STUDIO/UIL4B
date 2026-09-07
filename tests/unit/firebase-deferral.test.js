// THE FIREBASE DEFERRAL, GUARDED WHERE IT CAN SILENTLY STOP WORKING.
//
// The deferral is a claim about the import graph, and every way it can fail is
// a way that leaves the build green:
//
//   · an import written `../utils/firebaseAccess.js` instead of
//     `../utils/firebaseAccess` — the build alias never matches it, that
//     consumer keeps the eager module, and the SDK stays in the first wave;
//   · a new static `firebase/...` import added to a module on the boot path,
//     which puts the whole 116268-byte chunk back;
//   · the two brokers drifting apart, so a flagged build calls something the
//     lazy half does not export — a runtime failure no unflagged test can see;
//   · the founder-gated patch going stale against the tree it was written for,
//     which would make the whole design unappliable exactly when it is approved.
//
// The build itself catches the FIRST of those at `VITE_DEFER_FIREBASE=1` (see
// `assertFirebaseIsDeferred` in vite.config.js, which walks the emitted chunk
// graph). These run on every `npm run test:unit`, unflagged, so the design is
// held together on the default path too.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { DEFERRAL_SEAMS, seamSpecifier } from '../../vite.config.js'

const ROOT = process.cwd()
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8')

function sourceFiles(dir = 'src') {
  const out = []
  for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`
    if (entry.isDirectory()) out.push(...sourceFiles(rel))
    else if (/\.jsx?$/.test(entry.name)) out.push(rel)
  }
  return out
}

// Every `import ... from '<specifier>'` and `import('<specifier>')` in a file.
function importSpecifiers(source) {
  const specs = []
  for (const m of source.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g)) specs.push(m[1])
  for (const m of source.matchAll(/\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g)) specs.push(m[1])
  return specs
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. The seams, and the specifier form the build alias can actually see
// ─────────────────────────────────────────────────────────────────────────────

test('both halves of every deferral seam exist', () => {
  // Positive control for everything below: a seam whose lazy twin is missing
  // would make the flagged build fail to resolve, and a seam whose eager half
  // is missing would break the default build. Neither is checkable by looking
  // at import specifiers alone.
  assert.ok(DEFERRAL_SEAMS.length >= 2, 'expected at least the firebaseAccess and oneTapMount seams')
  for (const [name, lazyPath] of DEFERRAL_SEAMS) {
    assert.ok(fs.existsSync(path.join(ROOT, lazyPath)), `${name}: missing deferred half ${lazyPath}`)
    const eagerPath = lazyPath.replace('.lazy.', '.')
    assert.ok(fs.existsSync(path.join(ROOT, eagerPath)), `${name}: missing eager half ${eagerPath}`)
  }
})

test('every import of a deferral seam is written in the form the build alias matches', () => {
  const files = sourceFiles()
  const checked = []
  for (const [name] of DEFERRAL_SEAMS) {
    const base = name.split('/')[1]
    const pattern = seamSpecifier(name)
    for (const file of files) {
      // The lazy half imports its own siblings; it is already the deferred
      // module, so an alias never needs to reach it.
      if (file.endsWith('.lazy.js') || file.endsWith('.lazy.jsx')) continue
      for (const spec of importSpecifiers(read(file))) {
        if (!spec.includes(base)) continue
        // The eager half is allowed to name the real firebase module; that is
        // the whole point of it.
        if (spec.endsWith('/firebase') || spec.endsWith('/firebase.js') || spec.endsWith('./GoogleOneTap')) continue
        checked.push(`${file} -> ${spec}`)
        assert.match(
          spec,
          pattern,
          `${file} imports '${spec}', which the VITE_DEFER_FIREBASE alias for ${name} will NOT match. `
          + 'Write it without a file extension (e.g. \'../utils/firebaseAccess\') or the deferral silently '
          + 'skips this consumer and the SDK stays in the first request wave.',
        )
      }
    }
  }
  // Positive control: an assertion over an empty list passes vacuously, which
  // is how a rule like this stops guarding anything after a refactor.
  assert.ok(checked.length >= 5, `expected the seams to have real consumers, found ${checked.length}: ${checked.join(', ')}`)
})

// ─────────────────────────────────────────────────────────────────────────────
// 2. What still reaches Firebase statically
// ─────────────────────────────────────────────────────────────────────────────

// The complete inventory of modules that import the Firebase SDK — or the
// module that constructs it — with a STATIC import. Every one of these is a
// reason the chunk can end up in the first wave, so the list is written down
// rather than derived: adding to it must be a deliberate, reviewed act.
//
// The four gated files (docs/reference/human-validation-zones.md) are the ones
// this design cannot touch. AuthContext and SubscriptionContext are the two the
// unapplied patch closes; utils/firebase.js is the module being deferred, so it
// is meant to import the SDK; GoogleOneTap is reached only through the
// oneTapMount seam, so its own import is held back with it.
const EXPECTED_STATIC_FIREBASE_IMPORTERS = [
  // Founder-gated. The first two are closed by docs/design/firebase-deferral-gated.patch.
  'src/contexts/AuthContext.jsx',
  'src/contexts/SubscriptionContext.jsx',
  'src/components/GoogleOneTap.jsx',
  'src/utils/firebase.js',
  // The eager broker. Being the one static importer is its entire job.
  'src/utils/firebaseAccess.js',
  // Lazy routes. Reachable only through an `import()` in App.jsx / CreateTool,
  // so they are already off the boot path and cost the first wave nothing.
  'src/pages/Admin.jsx',
  'src/pages/Settings.jsx',
  'src/pages/AiPromptGenerator.jsx',
  'src/pages/AltTextGenerator.jsx',
  'src/pages/LandingPromptGenerator.jsx',
  'src/components/prompt/SubmitPromptPanel.jsx',
  'src/utils/communityQueueApi.js',
  'src/utils/feedbackQueueApi.js',
  'src/utils/mediaUpload.js',
]

test('nothing new imports the Firebase SDK statically', () => {
  const actual = sourceFiles().filter((file) => {
    if (file.endsWith('.lazy.js') || file.endsWith('.lazy.jsx')) return false
    const source = read(file)
    return importSpecifiers(source).some((spec, i) => {
      const isFirebase = spec.startsWith('firebase/') || /(^|\/)utils\/firebase$|(^|\/)\.\.?\/firebase$|\/firebase\.js$/.test(spec)
      if (!isFirebase) return false
      // `import('...')` is the whole point — only static edges count.
      return !new RegExp(`import\\s*\\(\\s*['"]${spec.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`).test(source) || i < 0
    })
  })
  const unexpected = actual.filter((f) => !EXPECTED_STATIC_FIREBASE_IMPORTERS.includes(f))
  const vanished = EXPECTED_STATIC_FIREBASE_IMPORTERS.filter((f) => !actual.includes(f))
  assert.deepEqual(
    unexpected, [],
    'these modules import the Firebase SDK statically and are not on the reviewed list. If one of them '
    + 'is reachable from src/main.jsx without an import(), it puts the whole SDK chunk back into the '
    + 'first request wave. Route it through src/utils/firebaseAccess instead, or add it to the list '
    + 'with a reason.',
  )
  // The other direction, so the list cannot rot into a lie about the codebase.
  assert.deepEqual(vanished, [], 'these are listed as static Firebase importers but no longer are — remove them from the list')
})

test('the modules on the boot path reach Firebase only through the broker', () => {
  // The four the deferral actually converted. Named individually because this
  // is the assertion that would have caught the change being reverted.
  const converted = [
    'src/utils/analytics.js',
    'src/hooks/useFirestoreSync.js',
    'src/contexts/ProjectContext.jsx',
    'src/App.jsx',
  ]
  for (const file of converted) {
    const source = read(file)
    const specs = importSpecifiers(source)
    assert.ok(
      specs.some((s) => s.includes('firebaseAccess') || s.includes('oneTapMount')),
      `${file} no longer goes through a deferral seam — it is on the boot path, so this puts Firebase back in the first wave`,
    )
    assert.ok(
      !specs.some((s) => s.startsWith('firebase/')),
      `${file} imports the Firebase SDK directly again`,
    )
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// 3. The two brokers must stay interchangeable
// ─────────────────────────────────────────────────────────────────────────────

test('the eager and deferred brokers export exactly the same names', async () => {
  // Read the export names out of the source rather than importing the modules:
  // importing the eager half would pull in the real Firebase SDK and call
  // initializeApp() inside a unit test.
  const names = (file) => {
    const source = read(file)
    const found = new Set()
    for (const m of source.matchAll(/^export\s+(?:async\s+)?function\s+([A-Za-z0-9_$]+)/gm)) found.add(m[1])
    for (const m of source.matchAll(/^export\s+const\s+([A-Za-z0-9_$]+)/gm)) found.add(m[1])
    return [...found].sort()
  }
  const eager = names('src/utils/firebaseAccess.js')
  const lazy = names('src/utils/firebaseAccess.lazy.js')
  assert.ok(eager.length >= 10, `expected a real API surface, found ${eager.length}: ${eager.join(', ')}`)
  assert.deepEqual(
    lazy, eager,
    'the deferred broker no longer exports the same names as the eager one. A consumer calling the '
    + 'missing one works in every unflagged build and every test, and fails only in the flagged build '
    + 'nothing here exercises.',
  )
})

test('the deferred broker never imports Firebase statically, and the eager one always does', () => {
  // Read the STATIC import statements only — an `import ... from '...'` at the
  // top of the file. Asking instead whether the specifier ALSO appears inside
  // an `import()` somewhere is a different question and does not answer this
  // one: this file dynamic-imports every Firebase entrypoint by design, so a
  // static import of one added beside them looks perfectly matched. That is the
  // exact mutation that survived the first draft of this test.
  const staticImports = [...read('src/utils/firebaseAccess.lazy.js')
    .matchAll(/^\s*import\s+(?:[^;'"]*\s+from\s+)?['"]([^'"]+)['"]/gm)].map((m) => m[1])
  const firebaseStatic = staticImports.filter((s) => s.startsWith('firebase/') || /(^|\/)firebase(\.js)?$/.test(s))
  assert.deepEqual(
    firebaseStatic, [],
    'firebaseAccess.lazy.js reaches the Firebase SDK with a STATIC import, which defeats the entire '
    + 'deferral: rolldown emits the chunk into the entry graph the moment any static edge exists.',
  )
  // Positive control on the reader itself. An import list that parsed nothing
  // would make the assertion above pass for a file it never actually read.
  assert.ok(staticImports.includes('./sessionHint'), `expected to parse the deferred broker's own imports, found ${staticImports.join(', ') || 'none'}`)
  // Positive control on the other half. If the eager broker stopped importing
  // the SDK, the default build would break — and the parity test above would
  // still pass, because both halves would look equally lazy.
  assert.match(read('src/utils/firebaseAccess.js'), /^import \{[^}]*\} from '\.\/firebase'/m,
    'the eager broker must import ./firebase statically — that is what makes an unflagged build identical to today')
})

// ─────────────────────────────────────────────────────────────────────────────
// 4. The unapplied founder-gated patch
// ─────────────────────────────────────────────────────────────────────────────

const PATCH = 'docs/design/firebase-deferral-gated.patch'

test('the founder-gated patch still applies to the tree it describes', () => {
  // The design is blocked on approval, and an approved patch that no longer
  // applies is a design that has to be redone at the worst possible moment.
  // When this fails, AuthContext.jsx or SubscriptionContext.jsx has moved and
  // the patch needs regenerating — not deleting.
  assert.ok(fs.existsSync(path.join(ROOT, PATCH)), `${PATCH} is missing — the design has no diff to approve`)
  execFileSync('git', ['apply', '--check', PATCH], { cwd: ROOT, stdio: 'pipe' })
})

test('the patch closes both remaining static edges and touches nothing else', () => {
  const patch = read(PATCH)
  const targets = [...patch.matchAll(/^\+\+\+ b\/(.+)$/gm)].map((m) => m[1].trim())
  assert.deepEqual(
    targets.sort(),
    ['src/contexts/AuthContext.jsx', 'src/contexts/SubscriptionContext.jsx'],
    'the gated patch must touch exactly the two founder-gated contexts that still import Firebase statically',
  )
  // It has to actually remove the static imports, not merely edit the files.
  assert.match(patch, /^-import \{ doc, onSnapshot \} from 'firebase\/firestore'/m)
  assert.match(patch, /^-} from 'firebase\/auth'/m)
  assert.match(patch, /^\+import \{ whenAuthSdk, loadAuthSdk, loadFirestore, authNow \} from '\.\.\/utils\/firebaseAccess'/m)
})

test('the founder-gated files are unmodified on this branch', () => {
  // The whole premise of the design is that these were not touched. A patch in
  // docs/ plus a quiet edit to the file it describes would be worse than either.
  const gated = ['src/contexts/AuthContext.jsx', 'src/contexts/SubscriptionContext.jsx', 'src/utils/firebase.js', 'src/components/GoogleOneTap.jsx']
  const changed = execFileSync('git', ['diff', '--name-only', 'origin/main...HEAD', '--', ...gated], { cwd: ROOT, encoding: 'utf8' }).trim()
  assert.equal(changed, '', `founder-gated files changed on this branch: ${changed}`)
})
