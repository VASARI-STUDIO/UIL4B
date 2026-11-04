// EVERY EXPORTED FILE IS NAMED `{project}-{artefact}.{ext}`, FROM ONE HELPER.
//
// Five naming schemes grew up side by side (`uil4b-palette.png`, `lumen-tokens.css`,
// `design-system-ui-kit.html`...). utils/exportFileName.js is now the only place a
// name is made, and these tests pin its rules and that no call site went round it.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileName, formatFileName, hasFormatFile, projectSlug, UNTITLED, PROJECT_SLUG_MAX } from '../../src/utils/exportFileName.js'
import { codeFileName, CODE_FILES } from '../../src/utils/codeFiles.js'
import { EXPORT_FORMATS } from '../../src/config/exportFormats.js'

const read = (rel) => fs.readFileSync(path.join(process.cwd(), rel), 'utf8')

test('a name is the project, the artefact and the extension', () => {
  assert.equal(fileName('Lumen', 'ui-kit', 'html'), 'lumen-ui-kit.html')
  assert.equal(fileName('Lumen Studio', 'style-guide', 'png'), 'lumen-studio-style-guide.png')
  assert.equal(fileName('Lumen', 'palette', 'png'), 'lumen-palette.png')
  assert.equal(fileName('Lumen', 'gradient', 'svg'), 'lumen-gradient.svg')
})

test('the token files keep the dot, and nothing is named -tokens.css', () => {
  assert.equal(fileName('Lumen', 'tokens', 'css'), 'lumen.tokens.css')
  assert.equal(fileName('Lumen', 'tokens', 'json'), 'lumen.tokens.json')
  for (const name of ['Lumen', '', null, 'A B']) assert.doesNotMatch(fileName(name, 'tokens', 'css'), /-tokens\.css$/)
})

test('no project is `untitled`, never the product', () => {
  for (const empty of ['', '   ', null, undefined, '---', '日本語']) {
    assert.equal(projectSlug(empty), UNTITLED, JSON.stringify(empty))
    assert.equal(fileName(empty, 'ui-kit', 'html'), 'untitled-ui-kit.html')
  }
  assert.equal(UNTITLED, 'untitled')
  assert.doesNotMatch(fileName('', 'palette', 'png'), /uil4b/)
})

test('a project name is made safe for a file system', () => {
  assert.equal(projectSlug('  Harbour & Co.  '), 'harbour-co')
  assert.equal(projectSlug('../../etc/passwd'), 'etc-passwd')
  assert.equal(projectSlug('A/B\\C:D*E?F"G<H>I|J'), 'a-b-c-d-e-f-g-h-i-j')
  const long = projectSlug('x'.repeat(200))
  assert.equal(long.length, PROJECT_SLUG_MAX)
  assert.doesNotMatch(projectSlug(`${'a'.repeat(PROJECT_SLUG_MAX - 1)} b`), /-$/, 'a cut never leaves a trailing hyphen')
})

test('a malformed artefact or extension throws rather than writing a stray name', () => {
  for (const bad of ['', 'UI Kit', 'ui_kit', '-kit', 'kit-', '../x', null]) assert.throws(() => fileName('Lumen', bad, 'html'), /artefact/, String(bad))
  for (const bad of ['', '.html', 'h.tml', 'HTML', null]) assert.throws(() => fileName('Lumen', 'ui-kit', bad), /extension/, String(bad))
})

test('every format the dialog offers has a name, and the names are the specified ones', () => {
  for (const f of EXPORT_FORMATS.filter((x) => x.live)) assert.ok(hasFormatFile(f.id), `${f.id} has no file name`)
  const names = Object.fromEntries(['book', 'book-png', 'book-html', 'guidelines', 'guidelines-html', 'html', 'png', 'jpeg', 'md', 'kit', 'css', 'json', 'tailwind', 'contrast', 'contrast-json', 'app-bundle']
    .map((id) => [id, formatFileName('Lumen', id)]))
  assert.deepEqual(names, {
    book: 'lumen-book.pdf',
    'book-png': 'lumen-book-pages.zip',
    'book-html': 'lumen-book.html',
    guidelines: 'lumen-brand-guidelines.pdf',
    'guidelines-html': 'lumen-brand-guidelines.html',
    html: 'lumen-style-guide.html',
    png: 'lumen-style-guide.png',
    jpeg: 'lumen-style-guide.jpg',
    md: 'lumen-style-guide.md',
    kit: 'lumen-ui-kit.html',
    css: 'lumen.tokens.css',
    json: 'lumen.tokens.json',
    tailwind: 'lumen-tailwind.css',
    contrast: 'lumen-contrast-pairs.csv',
    'contrast-json': 'lumen-contrast-pairs.json',
    'app-bundle': 'lumen-app-ready.zip',
  })
  assert.equal(formatFileName('Lumen', 'nope'), '')
  assert.equal(formatFileName('Lumen', 'book', { saved: true }), 'lumen-book.html', 'a print format that is saved is its HTML')
  assert.equal(formatFileName('Lumen', 'guidelines', { saved: true }), 'lumen-brand-guidelines.html')
  assert.equal(formatFileName('Lumen', 'png', { saved: true }), 'lumen-style-guide.png')
})

test('the Code files name themselves through the helper, so the dialog and the download agree', () => {
  for (const id of Object.keys(CODE_FILES)) {
    assert.equal(codeFileName(id, 'Lumen'), formatFileName('Lumen', id), id)
    assert.equal(codeFileName(id, ''), formatFileName('', id), `${id} unnamed`)
  }
})

// ── no call site went round the helper ──────────────────────────────────────

const walk = (dir) => fs.readdirSync(path.join(process.cwd(), dir), { withFileTypes: true }).flatMap((e) => {
  const rel = `${dir}/${e.name}`
  if (e.isDirectory()) return walk(rel)
  return /\.(js|jsx|html)$/.test(e.name) && !e.name.endsWith('.generated.js') ? [rel] : []
})

test('src/ holds no download named for the product and no -tokens.css suffix', () => {
  const offenders = []
  for (const file of walk('src')) {
    const text = read(file)
    // The admin spreadsheets are the product's own records, not a user's export.
    if (file.endsWith('pages/Admin.jsx') || file.endsWith('pages/Settings.jsx')) continue
    for (const m of text.matchAll(/a\.download\s*=\s*[`'"]uil4b-/g)) offenders.push(`${file}: ${m[0]}`)
    for (const m of text.matchAll(/['"`]-tokens\.(css|json)['"`]/g)) offenders.push(`${file}: ${m[0]}`)
  }
  assert.deepEqual(offenders, [])
})

test('the tools save through fileName', () => {
  for (const [file, artefact] of [
    ['src/pages/PaletteBuilder.jsx', "'palette', 'png'"],
    ['src/pages/GradientGenerator.jsx', "'gradient', 'svg'"],
    ['src/pages/ColorStudio.jsx', "'colour-system', 'html'"],
    ['src/pages/ColorStudio.jsx', "'colour-system', 'css'"],
    ['src/pages/TintTool.jsx', "stem, 'css'"],
  ]) assert.ok(read(file).includes(`fileName(design?.name, ${artefact})`), `${file} does not name ${artefact} through fileName`)
})

test('the export runner names every file through the helper', () => {
  const runner = read('src/hooks/useExportRunner.js')
  assert.doesNotMatch(runner, /\bslug\b/, 'the runner still builds a slug of its own')
  assert.doesNotMatch(runner, /\$\{slug\}/)
  assert.match(runner, /formatFileName\(fileProject, 'book-png'\)/)
  assert.match(runner, /formatFileName\(fileProject, format, \{ saved: true \}\)/)
  assert.match(runner, /codeFileName\(format, fileProject\)/)
  assert.match(runner, /fileProject,\s*\n\s*template: chosenTemplates\.kit/, 'the kit is not told the name its files are made from')
})

test('the three kit templates save under the names the renderer gives them', () => {
  for (const t of ['studio', 'manual', 'showcase']) {
    const html = read(`src/templates/kit/${t}.html`)
    assert.doesNotMatch(html, /brand\.slug/, `${t} still builds a name from the slug`)
    for (const key of ['css', 'json', 'fonts', 'html']) assert.ok(html.includes(`data.brand.files.${key}`), `${t} does not save ${key} under data.brand.files.${key}`)
  }
})
