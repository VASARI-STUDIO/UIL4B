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
 * Expands brace groups, nested or not:
 * `a/{b,c/{d,e}}.js` -> ['a/b.js', 'a/c/d.js', 'a/c/e.js'].
 */
function expandBraces(text) {
  const open = text.indexOf('{')
  if (open === -1) return [text]
  let depth = 0
  let close = -1
  const parts = []
  let start = open + 1
  for (let i = open; i < text.length; i++) {
    if (text[i] === '{') depth++
    else if (text[i] === '}') {
      depth--
      if (depth === 0) { close = i; break }
    } else if (text[i] === ',' && depth === 1) {
      parts.push(text.slice(start, i))
      start = i + 1
    }
  }
  assert.ok(close !== -1, `unbalanced braces in "${text}"`)
  parts.push(text.slice(start, close))
  const head = text.slice(0, open)
  const tail = text.slice(close + 1)
  return parts.flatMap((part) => expandBraces(`${head}${part.trim()}${tail}`))
}

/**
 * Expands `*` inside a path (one segment, never across a `/`, as in Vercel's glob)
 * against the files that really exist under src/:
 * 'utils/exportTemplates/*\/*.js' -> every .js one directory down.
 * A pattern with no `*` comes back as it is, even if the file does not exist, so the
 * import walk still reports it by name. A `*` that matches nothing expands to
 * nothing, which the reached/bundled comparison then reports as missing.
 */
function expandStars(rel, area = 'src') {
  if (!rel.includes('*')) return [rel]
  const segments = rel.split('/')
  let paths = ['']
  segments.forEach((segment, i) => {
    const last = i === segments.length - 1
    const next = []
    for (const base of paths) {
      if (!segment.includes('*')) {
        next.push(base ? `${base}/${segment}` : segment)
        continue
      }
      const pattern = new RegExp(`^${segment.replace(/[.+^$()|\\]/g, '\\$&').replace(/\*/g, '[^/]*')}$`)
      const dir = path.join(root, area, base)
      if (!fs.existsSync(dir)) continue
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (!pattern.test(entry.name) || (last ? !entry.isFile() : !entry.isDirectory())) continue
        next.push(base ? `${base}/${entry.name}` : entry.name)
      }
    }
    paths = next
  })
  return paths
}

/**
 * `src/data/{pipeline,moduleBoard}.js` -> ['data/pipeline.js', 'data/moduleBoard.js'].
 * Brace groups may nest. A glob this cannot read fails loudly below rather than
 * expanding to nothing, because expanding to nothing would read as "bundles no
 * files" and pass. A `*` is expanded against the real src/ tree by expandStars().
 */
function bundledFiles() {
  return bundledByArea('src')
}

/** The chrome font files includeFiles carries, as paths under public/ ('fonts/literata-latin.woff2'). */
function bundledFonts() {
  return bundledByArea('public')
}

/**
 * The glob may be one pattern under src/, or top-level alternatives (`{src/{...}.js,public/fonts/...}`).
 * Expanded in full, then each alternative is read against the tree it starts in.
 */
function bundledByArea(area) {
  const glob = includeFilesGlob()
  if (!glob) return []
  const all = expandBraces(glob)
  for (const a of all) {
    assert.match(a, /^(src|public)\//, `includeFiles is "${glob}", which has an alternative outside src/ and public/ — this file cannot read it`)
  }
  const files = all.filter((a) => a.startsWith(`${area}/`)).map((a) => a.slice(area.length + 1)).flatMap((rel) => expandStars(rel, area))
  for (const f of files) {
    assert.doesNotMatch(f, /[{}*?[\]]/,
      `includeFiles is "${glob}", a glob shape this file has never seen. Teach bundledFiles() to `
      + 'expand it — do not delete the check, because an unexpandable glob reads as "bundles nothing".')
  }
  return files
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

/**
 * Every src/ file the functions reach, directly or through other src/ files,
 * as paths under src/ ('utils/bookModel.js'). `includeFiles` has to carry ALL of
 * them: the direct imports are only the first layer, and a generator's own imports
 * are loaded at run time, so a missing one is a function that deploys green and
 * answers every request with a 500.
 *
 * Roots that are gitignored (the two internal boards) are not walked: they are not
 * in the deploy, so nothing they import is either, and walking them would make this
 * answer differ between a clone and the founder's machine.
 */
function reachableFromApi(roots, ignored) {
  const seen = new Set()
  const stack = roots.filter((rel) => !ignored.has(`src/${rel}`))
  while (stack.length) {
    const rel = stack.pop()
    if (seen.has(rel)) continue
    seen.add(rel)
    const file = path.join(root, 'src', rel)
    assert.ok(fs.existsSync(file), `src/${rel} is imported but does not exist; the import walk cannot go on`)
    if (!/\.(m?js|jsx)$/.test(rel)) continue
    const text = fs.readFileSync(file, 'utf8')
    // Static imports, re-exports and dynamic imports, relative specifiers only.
    // Packages come from node_modules, which the function carries on its own.
    for (const m of text.matchAll(/(?:from\s*|import\s*\(\s*|import\s+)['"](\.{1,2}\/[^'"]+)['"]/g)) {
      const next = path.posix.normalize(path.posix.join(path.posix.dirname(rel), m[1]))
      assert.ok(!next.startsWith('..'), `src/${rel} imports ${m[1]}, which leaves src/; includeFiles cannot name it`)
      stack.push(next)
    }
  }
  return seen
}

/** What `includeFiles` is missing, and what it carries that nothing reaches. */
function bundleGaps(needed, bundled) {
  const have = new Set(bundled)
  const want = new Set(needed)
  return {
    missing: [...want].filter((rel) => !have.has(rel)).sort(),
    extra: [...have].filter((rel) => !want.has(rel)).sort(),
  }
}

const reached = () => reachableFromApi(IMPORTED, IGNORED)

test('the api functions import exactly the two internal boards and the Pro export documents', () => {
  // Still the anchor: if a function starts importing something else out of src/,
  // it has to be classified below as bundled or as deliberately absent. The export files
  // are the format list, the two Pro document generators and the font coercion that
  // api/_lib/exportDocument.js builds on the server (they are not in the browser
  // bundle at all), and vercel.json bundles them.
  assert.deepEqual(IMPORTED, [
    'config/exportFormats.js',
    'config/exportTemplates.js',
    'data/moduleBoard.js',
    'data/pipeline.js',
    'utils/brandGuidelines.js',
    'utils/designSystemBook.js',
    'utils/styleGuideExport.js',
  ],
  'api/ imports changed — every src/ file a function imports must be either named by '
    + 'vercel.json includeFiles or gitignored on purpose, and a new one is neither')
})

test('every src/ file api/ imports is either bundled by includeFiles or deliberately local-only', { skip: NO_GIT }, () => {
  const bundled = bundledFiles().sort()
  const localOnly = IMPORTED.filter((rel) => IGNORED.has(`src/${rel}`)).sort()

  // The whole import graph, not just api/'s own imports: a generator imports
  // other src/ files when it loads, and those have to be in the function too.
  const reachedFiles = [...reached()].sort()
  const gaps = bundleGaps(reachedFiles, bundled)
  assert.deepEqual(gaps.missing, [],
    'a src/ file the functions load (directly, or through another src/ file) is not in '
    + 'includeFiles, so the deploy will not carry it and the function fails when it loads that module.\n'
    + `  imported by api/:      ${IMPORTED.join(', ') || '(none)'}\n`
    + `  reached from those:    ${reachedFiles.join(', ') || '(none)'}\n`
    + `  bundled:               ${bundled.join(', ') || '(none — vercel.json has no includeFiles)'}\n`
    + `  local-only:            ${localOnly.join(', ') || '(none)'}\n`
    + 'Add the missing files to includeFiles, or gitignore the import with the reason beside it.')
  assert.deepEqual(gaps.extra, [],
    'includeFiles names src/ files that nothing the functions load reaches. They ship inside the '
    + 'function on every deploy for nothing; remove them from the glob.')

  const both = bundled.filter((rel) => localOnly.includes(rel))
  assert.deepEqual(both, [],
    `includeFiles names ${both.join(', ')}, which git is ignoring. The deploy would be told to bundle `
    + 'a file that is in no clone — either the file came back into the repository and .gitignore is '
    + 'stale, or includeFiles is naming something that left it.')
})

test('CONTROL: the import walk follows imports to the leaves, and dropping any one file from the glob is caught', { skip: NO_GIT }, () => {
  // Without this, the test above would pass if the walk went blind and saw only
  // the direct imports (which is exactly the gap this was written for).
  const reachedFiles = [...reached()].sort()
  for (const rel of ['utils/bookModel.js', 'utils/paletteRoles.js', 'utils/colors.js', 'utils/paletteAdjust.js',
    'utils/routeMeta.js', 'data/toolTree.js', 'data/routeMetaMap.js', 'data/learnIndex.js', 'utils/meshFormats.js']) {
    assert.ok(reachedFiles.includes(rel), `the import walk no longer reaches src/${rel}`)
  }
  assert.ok(reachedFiles.length > IMPORTED.filter((rel) => !IGNORED.has(`src/${rel}`)).length,
    'the walk found nothing beyond the direct imports, so it has gone blind')

  // Drop each bundled file from the glob in turn: every one must be reported.
  const bundled = bundledFiles()
  assert.deepEqual(bundleGaps(reachedFiles, bundled), { missing: [], extra: [] },
    'the glob and the walk disagree before anything is dropped, so the drops below prove nothing')
  for (const rel of bundled) {
    const without = bundled.filter((b) => b !== rel)
    assert.deepEqual(bundleGaps(reachedFiles, without).missing, [rel],
      `dropping ${rel} from includeFiles was not caught`)
  }
  assert.deepEqual(bundleGaps(reachedFiles, [...bundled, 'data/unused.js']).extra, ['data/unused.js'],
    'a file nothing reaches was not reported as extra')
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

// Vercel refuses the whole deploy when a function's includeFiles runs past 256
// characters, so the bundling list has to stay inside that.
test('includeFiles fits the 256-character limit Vercel enforces', () => {
  const glob = includeFilesGlob()
  assert.ok(glob.length <= 256, `includeFiles is ${glob.length} characters; Vercel rejects the deploy over 256`)
})

test('CONTROL: nested brace groups expand to every path', () => {
  assert.deepEqual(expandBraces('a/{b,c/{d,e}}.js'), ['a/b.js', 'a/c/d.js', 'a/c/e.js'])
  assert.deepEqual(expandBraces('x.js'), ['x.js'])
})

test('CONTROL: a `*` expands to the real files one directory level at a time', () => {
  const templates = ['book/atlas.js', 'book/index.js', 'book/monograph.js', 'book/specification.js', 'guidelines/index.js', 'guidelines/presentation.js']
    .map((rel) => `utils/exportTemplates/${rel}`)
  assert.deepEqual(expandStars('utils/exportTemplates/*/*.js').sort(), templates,
    '`*/*.js` should reach the files one directory down and not the ones beside it')
  assert.ok(!expandStars('utils/exportTemplates/*.js').includes('utils/exportTemplates/book/index.js'),
    'a `*` must not cross a `/`')
  assert.deepEqual(expandStars('utils/colors.js'), ['utils/colors.js'])
  assert.deepEqual(expandStars('utils/noSuchFolder/*.js'), [],
    'a `*` that matches nothing must expand to nothing, so the gap is reported')
})

// The export templates are loaded by name at run time, so a layout file left out
// of includeFiles is a function that answers every Pro export with a 500.
test('includeFiles covers every file under src/utils/exportTemplates/', () => {
  const dir = path.join(root, 'src', 'utils', 'exportTemplates')
  const onDisk = []
  const walk = (d) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      if (entry.isDirectory()) walk(path.join(d, entry.name))
      else onDisk.push(path.relative(path.join(root, 'src'), path.join(d, entry.name)).replace(/\\/g, '/'))
    }
  }
  walk(dir)
  assert.ok(onDisk.length >= 5, 'the template folder looks empty, so this check proves nothing')
  const bundled = new Set(bundledFiles())
  assert.deepEqual(onDisk.filter((rel) => !bundled.has(rel)).sort(), [],
    'a file under src/utils/exportTemplates/ is not matched by includeFiles, so the deploy will not carry it')
})

// The documents embed their chrome faces from public/fonts at run time, so a font
// left out of includeFiles is a book that quietly loses its face (the reader falls
// back to the system face), and a font nothing uses is shipped for nothing.
test('includeFiles carries exactly the chrome fonts the book templates embed', () => {
  const used = new Set()
  for (const sub of ['book', 'guidelines']) {
    const dir = path.join(root, 'src', 'utils', 'exportTemplates', sub)
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.js'))) {
      for (const m of fs.readFileSync(path.join(dir, file), 'utf8').matchAll(/file:\s*'([a-z0-9-]+\.woff2)'/g)) used.add(`fonts/${m[1]}`)
    }
  }
  assert.ok(used.size >= 3, 'the book templates name fewer than three chrome fonts, so this check proves nothing')
  const bundled = bundledFonts()
  for (const rel of bundled) assert.ok(fs.existsSync(path.join(root, 'public', rel)), `includeFiles names public/${rel}, which does not exist`)
  assert.deepEqual([...used].sort(), bundled.sort(), 'includeFiles and the templates disagree about which chrome fonts the function carries')
})
