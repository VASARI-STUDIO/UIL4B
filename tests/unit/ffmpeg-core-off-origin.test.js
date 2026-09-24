// THE 32 MB THAT MUST NEVER COME BACK.
//
// `dist/assets` was 35 MB, and 32,129,114 bytes of it was one file:
// `ffmpeg-core-<hash>.wasm`, emitted because src/pages/FileConverter.jsx
// imported `@ffmpeg/core` through Vite's url suffix. That is 91% of the whole
// deployable byte-mass in a single asset, it is re-hashed on every deploy so
// every edge region misses on it again, and it is what exhausted Vercel's
// 10 GB/month Fast Origin Transfer allowance on the Hobby plan.
//
// The engine now loads from jsDelivr at convert time. This file is the guard
// that it stays there, in two layers that fail for different reasons:
//
//   1. SOURCE, and it can never be skipped. No file under src/ may import the
//      core, and the pinned CDN version must match the installed package.
//      These need no build, so they run in every `npm run test:unit`.
//   2. BUILD OUTPUT, which only means anything after a build and therefore
//      skips when there is none — the same bargain tests/unit/not-found.test.js
//      already strikes. `npm run build` precedes `npm run test:unit` in the
//      gate, so in the gate it runs.
//
// The wiring itself — that the browser really asks jsDelivr for the core and
// really converts a file with what comes back — is not testable from here and
// is not attempted here. It is tests/user-sim/57-converter-engine-cdn.spec.js.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8')
// The engine loader moved out of src/pages/FileConverter.jsx on 2026-09-23,
// when the animation builder became its second caller. Same code, same pin.
const SOURCE = 'src/utils/ffmpegEngine.js'

/** Every .js/.jsx file under src/, as { file, text }. */
function sourceFiles() {
  const out = []
  const walk = (dir) => {
    for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
      const rel = `${dir}/${entry.name}`
      if (entry.isDirectory()) walk(rel)
      else if (/\.jsx?$/.test(entry.name)) out.push({ file: rel, text: read(rel) })
    }
  }
  walk('src')
  return out
}

// A bundler emits an asset because something imported it. This is the import.
const CORE_IMPORT = /(?:import|from)\s*\(?\s*['"]@ffmpeg\/core(?:\/wasm)?(?:\?[a-z]+)?['"]/

test('no file under src/ imports the ffmpeg core, so the bundler cannot emit it', () => {
  const files = sourceFiles()

  // Positive control, and the reason this is not a scan that passes on an empty
  // list or a wrong directory: the FFmpeg CLASS is still imported — dynamically,
  // inside getFfmpeg — and it is small. If the walk were reading nothing, or
  // reading the wrong tree, or the pattern shape were wrong, this would fail
  // first and say so.
  const importsTheClass = files.filter((f) => /['"]@ffmpeg\/ffmpeg['"]/.test(f.text))
  assert.equal(importsTheClass.length, 1,
    `expected exactly one file to import @ffmpeg/ffmpeg, found ${importsTheClass.length}: `
    + `${importsTheClass.map((f) => f.file).join(', ')}. If the converter moved, point this file at it.`)
  assert.equal(importsTheClass[0].file, SOURCE)

  const offenders = files.filter((f) => CORE_IMPORT.test(f.text))
  assert.deepEqual(offenders.map((f) => f.file), [],
    'these files import @ffmpeg/core, which makes Vite emit the 32 MB wasm into dist/assets '
    + 'and bills every edge-region cache miss to Vercel Fast Origin Transfer. Load it from the '
    + `pinned CDN URL in ${SOURCE} instead.`)
})

test('the CDN version is pinned, and pinned to the version actually installed', () => {
  const src = read(SOURCE)

  const declared = /const FFMPEG_CORE_VERSION = '([^']+)'/.exec(src)?.[1]
  assert.ok(declared, `${SOURCE} no longer declares FFMPEG_CORE_VERSION`)

  const installed = JSON.parse(read('node_modules/@ffmpeg/core/package.json')).version
  assert.equal(declared, installed,
    `${SOURCE} loads @ffmpeg/core@${declared} from the CDN while this checkout has `
    + `${installed} installed. The suite fulfils the CDN URL from the installed copy, so a `
    + 'drift here means the tests prove a version the site does not ship. Update both.')

  // Pinned, not floating. A tag would let a third party replace the engine
  // under a shipped build with no review, and could not be cached immutably.
  assert.match(declared, /^\d+\.\d+\.\d+$/, 'the version must be exact, not a range or a tag')
  const base = /const FFMPEG_CORE_BASE = `([^`]+)`/.exec(src)?.[1]
  assert.equal(base, 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@${FFMPEG_CORE_VERSION}/dist/esm',
    'the core base URL changed shape — check it is still https, still pinned by version, and '
    + 'still points at dist/esm, which is the build Vite used to emit and the one the suite serves')
})

test('the pinned files exist locally at that version, and the wasm really is the elephant', () => {
  const dir = 'node_modules/@ffmpeg/core/dist/esm'
  const js = fs.statSync(path.join(ROOT, dir, 'ffmpeg-core.js'))
  const wasm = fs.statSync(path.join(ROOT, dir, 'ffmpeg-core.wasm'))

  assert.ok(js.size > 50_000, `${dir}/ffmpeg-core.js is ${js.size} bytes — too small to be the core`)

  // Measured at 0.12.6: 32,129,114 bytes. Asserted as a floor rather than an
  // equality so a version bump does not fail on a byte count nobody chose — but
  // asserted at all, because this number is the entire reason the file moved.
  // It is also the positive control for the dist scan below: a guard that says
  // "no huge wasm in dist" is worth nothing unless the wasm is in fact huge.
  assert.ok(wasm.size > 20_000_000,
    `${dir}/ffmpeg-core.wasm is ${wasm.size} bytes. If the core got small enough to bundle, `
    + 'this whole change is worth re-opening rather than leaving as folklore.')
})

// ── The build output ────────────────────────────────────────────────────────
// These read dist/, so they only mean anything after a build; skip rather than
// fail when run standalone. `npm run build` runs before `npm run test:unit`.

const ASSETS = path.join(ROOT, 'dist', 'assets')
const built = fs.existsSync(ASSETS)
const skip = !built && 'run `npm run build` first'

/** Every file under dist/assets, as { name, bytes }, recursively. */
function builtAssets() {
  const out = []
  const walk = (dir, prefix) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(full, `${prefix}${entry.name}/`)
      else out.push({ name: `${prefix}${entry.name}`, bytes: fs.statSync(full).size })
    }
  }
  walk(ASSETS, '')
  return out
}

test('the build-output scan is looking at real assets', { skip }, () => {
  // The three assertions below are all of the form "dist/assets contains no X".
  // Every one of them is trivially true against an empty list, a wrong path or
  // a directory that moved — which is exactly how a budget check stops checking
  // anything while staying green. So prove the scan sees the app first.
  const assets = builtAssets()
  assert.ok(assets.length >= 20, `dist/assets holds only ${assets.length} files — is this a real build?`)
  assert.ok(assets.some((a) => /^index-.*\.js$/.test(a.name)), 'no entry chunk in dist/assets')
  assert.ok(assets.some((a) => /\.css$/.test(a.name)), 'no stylesheet in dist/assets')
  assert.ok(assets.some((a) => /^FileConverter-.*\.js$/.test(a.name)),
    'no FileConverter chunk in dist/assets — the page this test is about is not in the build')
})

test('no ffmpeg core, and no WebAssembly at all, is shipped from our origin', { skip }, () => {
  const assets = builtAssets()

  const ffmpeg = assets.filter((a) => /ffmpeg/i.test(a.name))
  assert.deepEqual(ffmpeg, [],
    'the ffmpeg core is back in dist/assets:\n  '
    + ffmpeg.map((a) => `${a.bytes} ${a.name}`).join('\n  ')
    + '\n\nThis is the 32 MB file that exhausted Vercel Fast Origin Transfer. Something under '
    + `src/ is importing @ffmpeg/core again — see ${SOURCE}.`)

  // Nothing in this app compiles to WebAssembly. The core was the only wasm we
  // ever shipped, so any .wasm in dist is either it coming back under another
  // name or a new dependency nobody has budgeted for.
  const wasm = assets.filter((a) => /\.wasm$/.test(a.name))
  assert.deepEqual(wasm, [],
    'dist/assets contains WebAssembly:\n  ' + wasm.map((a) => `${a.bytes} ${a.name}`).join('\n  '))
})

test('dist/assets stays within a few MB, not tens', { skip }, () => {
  const assets = builtAssets()
  const total = assets.reduce((n, a) => n + a.bytes, 0)

  // Measured on 2026-09-06 by building the same tree twice, with and without
  // the change: 36,045,200 bytes before, 3,810,017 after. The ceiling is set
  // well above today's figure so ordinary growth does not trip it, and well
  // below the old one so the regression this file exists for cannot hide
  // inside it.
  const CEILING = 8_000_000
  const biggest = [...assets].sort((a, b) => b.bytes - a.bytes).slice(0, 5)
  assert.ok(total <= CEILING,
    `dist/assets is ${total} bytes, over the ${CEILING}-byte ceiling. Largest five:\n  `
    + biggest.map((a) => `${a.bytes} ${a.name}`).join('\n  ')
    + '\n\nIf this is legitimate growth, move the ceiling and say what it bought. If one file '
    + 'is most of it, it probably belongs off the origin like the ffmpeg core does.')
})
