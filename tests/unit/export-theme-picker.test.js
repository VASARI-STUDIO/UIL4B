import { test } from 'node:test'
import assert from 'node:assert/strict'
import { UI_KIT_PAGES, GUIDELINES_PAGES, GUIDELINES_ONLY_PAGES, PICKER_THEMES, defaultThemeId, themedFile, themedFileIsPro, themedZipName, pickerThemesFor, themeFitsFile, freeGuidelinesThemeNames, freeThemeNames } from '../../src/config/exportThemePicker.js'
import { requestThemeExport, isPrintSafe, zipNameFrom, ERROR_LINES } from '../../src/utils/exportThemeRequest.js'
import { UIKIT_PAGES, GUIDE_PAGES } from '../../api/_lib/exportThemes/engine/pages.js'
import { PRINT_CSP } from '../../api/_lib/exportThemeRoute.js'
import { EXPORT_THEMES } from '../../src/data/exportThemes.js'

test('the page counts the picker states are the engine\'s page lists', () => {
  assert.equal(UI_KIT_PAGES, UIKIT_PAGES.length)
  assert.equal(GUIDELINES_PAGES, GUIDE_PAGES.length)
})

test('the picker lists every export theme in the table order, and the UI kit is free in Standards only', () => {
  assert.deepEqual(PICKER_THEMES.map((t) => t.id), EXPORT_THEMES.map((t) => t.id))
  assert.ok(PICKER_THEMES.some((t) => t.id === '24-standards') && PICKER_THEMES.some((t) => t.id === '32-dieline'))
  assert.deepEqual(PICKER_THEMES.filter((t) => t.free).map((t) => t.id), ['04-standards'])
  assert.equal(defaultThemeId(false), '04-standards')
  assert.equal(defaultThemeId(true), '01-presentation')
})

test('a file lists only the themes that have its row; Label and Swiss Field are guidelines only', () => {
  const ids = (file) => pickerThemesFor(file).map((t) => t.id)
  const full = PICKER_THEMES.filter((t) => !t.rows).length
  assert.ok(full >= 12)
  for (const file of ['kit', 'book', 'book-html']) {
    assert.equal(ids(file).length, full, file)
    assert.ok(!ids(file).includes('25-label') && !ids(file).includes('27-swissfield'), file)
  }
  for (const file of ['guidelines', 'guidelines-html']) {
    assert.equal(ids(file).length, PICKER_THEMES.length, file)
    assert.ok(ids(file).includes('25-label') && ids(file).includes('27-swissfield'), file)
  }
  assert.equal(themeFitsFile('25-label', 'kit'), false)
  assert.equal(themeFitsFile('25-label', 'guidelines'), true)
  assert.equal(themeFitsFile('nope', 'guidelines'), false)
})

test('the guidelines of Label and Swiss Field are free, and a free account starts each file on a theme it is free in', () => {
  for (const file of ['guidelines', 'guidelines-html']) {
    assert.equal(themedFileIsPro(file, '25-label'), false, file)
    assert.equal(themedFileIsPro(file, '27-swissfield'), false, file)
    assert.equal(defaultThemeId(false, file), '25-label', file)
  }
  assert.equal(defaultThemeId(false, 'kit'), '04-standards')
  assert.equal(defaultThemeId(false, 'book'), '01-presentation')
  assert.equal(freeGuidelinesThemeNames(), 'Label and Swiss Field')
  assert.equal(freeThemeNames('kit'), 'Standards')
  assert.equal(freeThemeNames('book'), '')
  const label = PICKER_THEMES.find((t) => t.id === '25-label')
  assert.equal(label.guidePages, GUIDELINES_ONLY_PAGES)
  assert.equal(PICKER_THEMES.find((t) => t.id === '04-standards').guidePages, GUIDELINES_PAGES)
})

test('a themed file is Pro by the route\'s own rule, and the book as PNG pages takes no theme', () => {
  assert.equal(themedFileIsPro('kit', '04-standards'), false)
  assert.equal(themedFileIsPro('kit', '01-presentation'), true)
  assert.equal(themedFileIsPro('kit', '07-spec'), true)
  assert.equal(themedFileIsPro('book', '04-standards'), true)
  assert.equal(themedFileIsPro('guidelines-html', '07-spec'), true)
  assert.equal(themedFile('book-png'), null)
})

const ok = (body, headers = {}) => ({ ok: true, status: 200, headers: { get: (k) => headers[k] ?? null }, json: async () => body, blob: async () => new Blob(['zip']) })
const refuse = (status, body, headers = {}) => ({ ok: false, status, headers: { get: (k) => headers[k] ?? null }, json: async () => body })
const auth = { auth: { currentUser: { getIdToken: async () => 'tok' } } }
const ask = (res) => requestThemeExport({ theme: '04-standards', row: 'ui-kit', format: 'zip', design: {}, projectName: 'P' }, { loadAuth: async () => auth, fetchImpl: async () => res })

test('each refusal is fixed copy, never the server\'s words', async () => {
  const cases = [
    [refuse(403, { code: 'pro_required', error: 'LEAK' }), 'pro-required'],
    [refuse(413, {}), 'too-large'],
    [refuse(429, { code: 'rate_limited', error: 'LEAK' }, { 'Retry-After': '30' }), 'rate-limited'],
    [refuse(400, { code: 'invalid_project', error: 'LEAK' }), 'invalid-project'],
    [refuse(400, { code: 'unknown_theme', error: 'LEAK' }), 'unknown'],
    [refuse(500, { code: 'build_failed', error: 'LEAK' }), 'build-failed'],
  ]
  for (const [res, code] of cases) {
    const out = await ask(res)
    assert.equal(out.code, code)
    assert.ok(!out.line.includes('LEAK'))
  }
  assert.match((await ask(refuse(429, { code: 'rate_limited' }, { 'Retry-After': '30' }))).line, /30 seconds/)
  assert.match((await ask(refuse(429, { code: 'rate_limited' }, { 'Retry-After': '1' }))).line, /in 1 second\./)
  for (const odd of ['1e1', '0x10', '-5', '2.5', ' 7', 'Wed, 21 Oct 2026 07:28:00 GMT']) {
    assert.equal((await ask(refuse(429, { code: 'rate_limited' }, { 'Retry-After': odd }))).line, ERROR_LINES['rate-limited'], `Retry-After ${odd}`)
  }
  assert.equal((await requestThemeExport({ theme: 'x', row: 'ui-kit', format: 'zip' }, { loadAuth: async () => ({}) })).line, ERROR_LINES['signed-out'])
})

test('a zip answer carries the server\'s file name, and a refused name is a failure', async () => {
  const good = await ask(ok(null, { 'Content-Type': 'application/zip', 'Content-Disposition': 'attachment; filename="lumen-ui-kit-04-standards.zip"' }))
  assert.equal(good.name, 'lumen-ui-kit-04-standards.zip')
  assert.equal(zipNameFrom('attachment; filename="../x.zip"'), '')
  assert.equal((await ask(ok(null, { 'Content-Type': 'application/zip', 'Content-Disposition': 'attachment; filename="../x.zip"' }))).code, 'build-failed')
})

test('a print document is written into a window only when it holds no script and opens with the CSP', () => {
  const doc = `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="${PRINT_CSP}"><title>t</title></head><body>x</body></html>`
  assert.equal(isPrintSafe(doc), true)
  assert.equal(isPrintSafe(doc.replace('</body>', '<script>1</script></body>')), false)
  assert.equal(isPrintSafe(doc.replace('<body>', '<body onload="x()">')), false)
  assert.equal(isPrintSafe(doc.replace(/<meta[^>]*>/, '')), false)
})

test('a themed zip is named for the project and the theme, and the PDF rows and the PNG pages have no themed name', () => {
  assert.equal(themedZipName('Lumen Studio', 'kit', '04-standards'), 'lumen-studio-ui-kit-04-standards.zip')
  assert.equal(themedZipName('Lumen', 'book-html', '01-presentation'), 'lumen-brand-book-01-presentation.zip')
  assert.equal(themedZipName('', 'guidelines-html', '07-spec'), 'untitled-brand-guidelines-07-spec.zip')
  for (const id of ['book', 'guidelines', 'book-png', 'css']) assert.equal(themedZipName('Lumen', id, '04-standards'), '', id)
})
