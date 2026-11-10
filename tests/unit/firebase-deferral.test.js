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
//   · the two brokers drifting apart, so the deferred build calls something the
//     lazy half does not export — a runtime failure the eager build cannot show;
//   · a page that needs the SDK to show its content forgetting to open the gate,
//     so a signed-in visitor on it is shown as signed out;
//
// The build itself catches the FIRST of those on every default build (see
// `assertFirebaseIsDeferred` in vite.config.js, which walks the emitted chunk
// graph). These run on every `npm run test:unit`, so the design is
// held together without a build too.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
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
// AuthContext and SubscriptionContext are NOT here: they reach the SDK only through
// the broker. utils/firebase.js is the module being deferred, so it is meant to
// import the SDK; GoogleOneTap is reached only through the oneTapMount seam, so
// its own import is held back with it.
const EXPECTED_STATIC_FIREBASE_IMPORTERS = [
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
  // The Brand Starter (#411) is the same shape as AltTextGenerator: a lazy tool
  // page (CreateTool.jsx: lazy(() => import('./BrandStarter'))) that reads the
  // current user's ID token to call /api/ai. Reachable only through import(), so
  // it cannot pull the SDK into the first request wave. Reviewed 2026-09-07.
  'src/pages/BrandStarter.jsx',
  // `src/pages/LandingPromptGenerator.jsx` was here until the 2026-09-06
  // dead-source sweep deleted it — unrouted, unimported, and absent from every
  // sourcemap in a production build. The `vanished` half of the assertion below
  // is what caught it: a name left in this list after its file is gone makes the
  // test red, which is the property that keeps the list honest.
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
  // The ones the deferral converted. Named individually because this
  // is the assertion that would have caught the change being reverted.
  const converted = [
    'src/utils/analytics.js',
    'src/hooks/useFirestoreSync.js',
    'src/contexts/ProjectContext.jsx',
    'src/App.jsx',
    'src/contexts/AuthContext.jsx',
    'src/contexts/SubscriptionContext.jsx',
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
// 4. The deferral is the DEFAULT build, and `VITE_DEFER_FIREBASE=0` is the way out
// ─────────────────────────────────────────────────────────────────────────────

// Resolved in a child process because the flag is read once, when vite.config.js
// is first evaluated; the test process's own environment must not decide it.
function aliasCountFor(flag) {
  const env = { ...process.env }
  delete env.VITE_DEFER_FIREBASE
  if (flag !== undefined) env.VITE_DEFER_FIREBASE = flag
  const configUrl = pathToFileURL(path.join(ROOT, 'vite.config.js')).href
  const script = `const m = await import(${JSON.stringify(configUrl)}); `
    + `const c = m.default({ mode: 'production', command: 'build' }); `
    + 'process.stdout.write(String(c.resolve.alias.length))'
  return Number(execFileSync(process.execPath, ['--input-type=module', '-e', script], { cwd: ROOT, env, encoding: 'utf8' }))
}

test('a build with no flag, and one with VITE_DEFER_FIREBASE=1, alias every deferral seam to its lazy half', () => {
  assert.equal(aliasCountFor(undefined), DEFERRAL_SEAMS.length, 'the default build is no longer the deferred one')
  assert.equal(aliasCountFor('1'), DEFERRAL_SEAMS.length)
})

test('VITE_DEFER_FIREBASE=0 builds the eager variant: no seam is aliased', () => {
  assert.equal(aliasCountFor('0'), 0, 'the opt-out no longer restores the eager modules')
})

// ─────────────────────────────────────────────────────────────────────────────
// 5. When the deferred broker lets a visitor settle without Firebase
// ─────────────────────────────────────────────────────────────────────────────

let freshCount = 0
// A new copy of the module per call: the gate is module state, and one test
// opening it must not leak into the next. The source is loaded as a data: URL
// with its one extensionless sibling import made absolute, because Node cannot
// resolve the bundler-style './sessionHint' and the broker must not be edited
// to suit the test. Its Firebase imports are dynamic, so none of them run here.
const sessionHintUrl = pathToFileURL(path.join(ROOT, 'src/utils/sessionHint.js')).href
function freshBroker() {
  const source = read('src/utils/firebaseAccess.lazy.js').replace("from './sessionHint'", `from '${sessionHintUrl}'`)
  assert.ok(source.includes(sessionHintUrl), 'the broker no longer imports ./sessionHint, so this loader is out of date')
  const copy = `${source}\n// copy ${++freshCount}`
  return import(`data:text/javascript;base64,${Buffer.from(copy).toString('base64')}`)
}

async function inBrowser({ hint = false, search = '' }, body) {
  const hadWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
  const hadStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  Object.defineProperty(globalThis, 'window', { value: { location: { search } }, configurable: true, writable: true })
  Object.defineProperty(globalThis, 'localStorage', {
    value: { getItem: (k) => (hint && k === 'vs-session' ? '1' : null) }, configurable: true, writable: true,
  })
  try {
    return await body(await freshBroker())
  } finally {
    if (hadWindow) Object.defineProperty(globalThis, 'window', hadWindow)
    else delete globalThis.window
    if (hadStorage) Object.defineProperty(globalThis, 'localStorage', hadStorage)
    else delete globalThis.localStorage
  }
}

test('a browser with no session hint and nothing asking for Firebase may settle as signed out', async () => {
  await inBrowser({}, (b) => assert.equal(b.canSkipAuthWait(), true))
})

test('a browser with a session hint may not skip the wait: its session has to be restored', async () => {
  await inBrowser({ hint: true }, (b) => assert.equal(b.canSkipAuthWait(), false))
})

test('?firebase=eager may not skip the wait', async () => {
  await inBrowser({ search: '?firebase=eager' }, (b) => assert.equal(b.canSkipAuthWait(), false))
})

test('opening the gate ends the skip: whoever opened it is waiting on the answer', async () => {
  await inBrowser({}, (b) => {
    assert.equal(b.canSkipAuthWait(), true)
    b.openFirebaseGate()
    assert.equal(b.canSkipAuthWait(), false)
  })
})

test('the auth bootstrap alone neither opens the gate nor schedules it for a browser with no hint', async () => {
  await inBrowser({}, async (b) => {
    const scheduled = []
    const realSetTimeout = globalThis.setTimeout
    globalThis.window.addEventListener = (type) => scheduled.push(`listener:${type}`)
    globalThis.window.requestIdleCallback = () => scheduled.push('idle')
    globalThis.setTimeout = (fn, ms, ...rest) => { scheduled.push(`timer:${ms}`); return realSetTimeout(fn, 0, ...rest) }
    try {
      // Pending forever by design: nothing has asked. Not awaited, so it cannot
      // import the SDK in this process even if it were wrong.
      b.whenAuthSdk()
    } finally {
      globalThis.setTimeout = realSetTimeout
    }
    assert.equal(b.canSkipAuthWait(), true, 'whenAuthSdk() opened the gate on its own, so every visitor downloads Firebase')
    assert.deepEqual(scheduled, [], 'whenAuthSdk() armed the LCP / idle / first-touch schedule, which fetches Firebase for a visitor who never asked')
  })
})

test('the eager broker never has a wait to skip', () => {
  assert.match(read('src/utils/firebaseAccess.js'), /^export function canSkipAuthWait\(\) \{ return false \}$/m)
})

// ─────────────────────────────────────────────────────────────────────────────
// 6. Everything that needs the answer still opens the gate
// ─────────────────────────────────────────────────────────────────────────────

// Reads source, so it proves the call is WRITTEN, not that it runs. The running
// half is tests/user-sim/57-firebase-deferral.spec.js and 57-firebase-cold-visit.
// A page missing here shows a signed-in visitor as signed out with no error.
const OPENS_THE_GATE_ON_MOUNT = {
  'src/pages/Settings.jsx': 1,
  'src/pages/AiPromptGenerator.jsx': 1,
  'src/pages/AltTextGenerator.jsx': 1,
  'src/pages/BrandStarter.jsx': 1,
  'src/pages/Checkout.jsx': 1,
  'src/pages/LoginPage.jsx': 1,
  'src/components/auth/AuthForm.jsx': 1,
  // RequireAuth and RequireAdmin.
  'src/App.jsx': 2,
}

for (const [file, expected] of Object.entries(OPENS_THE_GATE_ON_MOUNT)) {
  test(`${file} opens the Firebase gate when it mounts`, () => {
    const source = read(file)
    assert.match(source, /import \{[^}]*\bopenFirebaseGate\b[^}]*\} from '(?:\.\.?\/)+(?:utils\/)?firebaseAccess'/)
    const calls = source.match(/useEffect\(\(\) => \{ openFirebaseGate\(\) \}, \[\]\)/g) || []
    assert.equal(calls.length, expected, `${file}: expected ${expected} mount-time openFirebaseGate() call(s), found ${calls.length}`)
  })
}

test('AuthContext settles without Firebase only through the broker\'s own answer', () => {
  const source = read('src/contexts/AuthContext.jsx')
  assert.match(source, /canSkipAuthWait\(\)\) setLoading\(false\)/)
  // The listener must still attach when the gate opens, or a session the hint
  // missed is never restored.
  assert.match(source, /whenAuthSdk\(\)\.then\(\(A\) => \{[\s\S]*?onAuthStateChanged\(A\.auth, onAuthUser\)/)
})
