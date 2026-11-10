// api/_lib/exportThemes is server-only: about 5 MB of themes, fonts and brand data that reads its fonts from disk.
// Two things keep it out of the browser bundle, and each test below can be made to fail:
//
//  1. NOTHING THE APP REACHES IMPORTS IT. Walking the imports from src/main.jsx, statically and lazily, never lands in the folder.
//  2. THE BUILD REFUSES IT. vite.config.js registers a plugin that fails the build when a file under src/ resolves into the folder,
//     including through an alias, which the text walk above cannot see.
//
// To see each fail: add `import '../../api/_lib/exportThemes/engine/pages.js'` to any file under src/ (1), or take
// exportThemesStayOnServer() out of the plugins array in vite.config.js (2).
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const THEMES_DIR = path.resolve('api/_lib/exportThemes')
const inThemes = (file) => file === THEMES_DIR || file.startsWith(THEMES_DIR + path.sep)

// Every file an entry can reach, following static AND dynamic relative imports.
function reachableFrom(entry) {
  const seen = new Set()
  const stack = [path.resolve(entry)]
  const resolve = (from, spec) => {
    const base = path.resolve(path.dirname(from), spec)
    for (const c of [base, `${base}.js`, `${base}.jsx`, `${base}.mjs`, path.join(base, 'index.js'), path.join(base, 'index.jsx')]) {
      if (fs.existsSync(c) && fs.statSync(c).isFile()) return c
    }
    return null
  }
  while (stack.length) {
    const file = stack.pop()
    if (seen.has(file)) continue
    seen.add(file)
    if (!/\.m?jsx?$/.test(file)) continue
    const src = fs.readFileSync(file, 'utf8')
    for (const m of src.matchAll(/(?:from\s*|import\s*\(\s*|import\s+)['"](\.{1,2}\/[^'"]+)['"]/g)) {
      const hit = resolve(file, m[1])
      if (hit) stack.push(hit)
    }
  }
  return seen
}

test('no file under api/_lib/exportThemes is reachable from the app entry', () => {
  assert.ok(fs.existsSync(THEMES_DIR), 'api/_lib/exportThemes moved; update this test')
  const reach = reachableFrom('src/main.jsx')
  assert.ok(reach.size > 200, `the import walk found only ${reach.size} files, so it has gone blind`)
  assert.ok(reach.has(path.resolve('src/components/export/ExportDialog.jsx')), 'the walk no longer reaches the export dialog')
  const leaked = [...reach].filter(inThemes)
  assert.deepEqual(leaked, [], `the browser bundle reaches the server-only themes through ${leaked.slice(0, 3).join(', ')}`)
})

test('CONTROL: the walk follows imports inside the themes folder', () => {
  const reach = reachableFrom('api/_lib/exportThemes/engine/pages.js')
  assert.ok(reach.has(path.resolve('api/_lib/exportThemes/brands/index.js')), 'static imports are not being followed')
  assert.ok(reach.has(path.resolve('api/_lib/exportThemes/engine/placeholders.js')), 'the engine is no longer reached from pages.js')
  assert.ok([...reach].some(inThemes), 'the inThemes filter matches nothing')
})

test('CONTROL: a lazily imported module is found', () => {
  const reach = reachableFrom('src/main.jsx')
  assert.ok(reach.has(path.resolve('src/utils/styleGuideRaster.js')), 'dynamic imports are not being followed')
})

test('vite.config.js registers the plugin that fails the build on a leak', () => {
  const cfg = fs.readFileSync('vite.config.js', 'utf8')
  assert.match(cfg, /const exportThemesStayOnServer = \(\) => \(\{/, 'the exportThemesStayOnServer plugin is gone')
  assert.match(cfg, /plugins:\s*\[[^\]]*\bexportThemesStayOnServer\(\)/, 'the plugin is defined but not in the plugins array')
  // it must act on importers under src/, resolve what they import, and fail when that lands in the folder
  assert.match(cfg, /api\/_lib\/exportThemes/, 'the plugin no longer names the server-only folder')
  assert.match(cfg, /startsWith\(SRC_DIR\)/, 'the plugin no longer limits itself to importers under src/')
  assert.match(cfg, /this\.error\(/, 'the plugin no longer fails the build')
})
