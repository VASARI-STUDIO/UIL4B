import { test } from 'node:test'
import assert from 'node:assert/strict'
import { UI_KIT_PAGES, GUIDELINES_PAGES, GUIDELINES_ONLY_PAGES, PICKER_THEMES, defaultThemeId, themedFile, themedFileIsPro, themedZipName, pickerThemesFor, themeFitsFile, freeGuidelinesThemeNames, freeThemeNames } from '../../src/config/exportThemePicker.js'
import { requestThemeExport, isPrintSafe, printInWindow, PRINT_FRAME_SANDBOX, zipNameFrom, ERROR_LINES } from '../../src/utils/exportThemeRequest.js'
import { UIKIT_PAGES, GUIDE_PAGES } from '../../api/_lib/exportThemes/engine/pages.js'
import { PRINT_CSP } from '../../api/_lib/exportThemeRoute.js'
import { EXPORT_THEMES } from '../../src/data/exportThemes.js'

test('the page counts the picker states are the engine\'s page lists', () => {
  assert.equal(UI_KIT_PAGES, UIKIT_PAGES.length)
  assert.equal(GUIDELINES_PAGES, GUIDE_PAGES.length)
})

test('the picker lists every export theme in the table order, and the UI kit is free in Standards only', () => {
  assert.deepEqual(PICKER_THEMES.map((t) => t.id), EXPORT_THEMES.map((t) => t.id))
  assert.equal(PICKER_THEMES.length, EXPORT_THEMES.length)
  assert.deepEqual(PICKER_THEMES.filter((t) => t.free).map((t) => t.id), ['04-standards'])
  assert.equal(defaultThemeId(false), '04-standards')
  assert.equal(defaultThemeId(true), '01-presentation')
})

test('a file lists only the themes that have its row; Label and Swiss Field are guidelines only', () => {
  const ids = (file) => pickerThemesFor(file).map((t) => t.id)
  const full = PICKER_THEMES.filter((t) => !t.rows).length
  assert.equal(full, EXPORT_THEMES.filter((t) => !t.rows).length)
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
    [refuse(422, { code: 'contrast', error: 'LEAK' }), 'low-contrast'],
    [refuse(422, { code: 'font_missing', error: 'LEAK' }), 'font-missing'],
    [refuse(422, { error: 'LEAK' }), 'build-failed'],
  ]
  for (const [res, code] of cases) {
    const out = await ask(res)
    assert.equal(out.code, code)
    assert.ok(!out.line.includes('LEAK'))
    if (res.status === 422 && code !== 'build-failed') assert.ok(!/try again/i.test(out.line), `${code} does not say try again`)
  }
  // With a valid Retry-After the line carries no time (the button counts it); without one the fixed "in a minute" line stays.
  for (const wait of ['1', '30', '90', '600']) {
    assert.equal((await ask(refuse(429, { code: 'rate_limited' }, { 'Retry-After': wait }))).line, 'Too many exports just now.', `Retry-After ${wait}`)
  }
  assert.equal((await ask(refuse(429, { code: 'rate_limited' }))).line, ERROR_LINES['rate-limited'])
  // The wait itself rides on the result, so the dock can count it down; any other refusal carries none.
  assert.equal((await ask(refuse(429, { code: 'rate_limited' }, { 'Retry-After': '30' }))).retryAfter, 30)
  assert.equal((await ask(refuse(429, { code: 'rate_limited' }, { 'Retry-After': '9999' }))).retryAfter, undefined)
  assert.equal((await ask(refuse(429, { code: 'rate_limited' }))).retryAfter, undefined)
  assert.equal((await ask(refuse(403, { code: 'pro_required' }, { 'Retry-After': '30' }))).retryAfter, undefined)
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

test('isPrintSafe refuses a form element as well as a script, to match the server', () => {
  const doc = `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="${PRINT_CSP}"><title>t</title></head><body>x</body></html>`
  for (const bad of ['<form action="/x"></form>', '<FORM method="post">', '<form\naction="/x">', '<form>', '<script/>', '<script\nsrc="x">']) {
    assert.equal(isPrintSafe(doc.replace('x</body>', `${bad}</body>`)), false, bad)
  }
  assert.equal(isPrintSafe(doc.replace('x</body>', '<p>a formula, a transcript</p></body>')), true)
})

// A window with just enough document for printInWindow: open/write/close, title, createElement, body.appendChild.
function fakeWindow({ fonts = true } = {}) {
  const log = { written: '', title: '', frames: [], printed: 0, focused: 0, order: [] }
  const frame = {
    attrs: {}, listeners: {}, srcdoc: undefined,
    setAttribute(k, v) { this.attrs[k] = v },
    addEventListener(type, fn) { this.listeners[type] = fn },
    contentWindow: {
      document: fonts ? { fonts: { ready: Promise.resolve() } } : {},
      focus() { log.focused++; log.order.push('focus') },
      print() { log.printed++; log.order.push('print') },
    },
  }
  const doc = {
    open() { log.order.push('open') },
    write(h) { log.written += h; log.order.push('write') },
    close() { log.order.push('close') },
    set title(t) { log.title = t },
    createElement(tag) { assert.equal(tag, 'iframe'); return frame },
    body: { appendChild(el) { log.frames.push(el); log.order.push('append') } },
  }
  const win = { closed: false, document: doc, focus() { log.winFocused = true }, print() { log.winPrinted = true } }
  return { win, frame, log }
}
const PRINT_DOC = `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="${PRINT_CSP}"><title>t</title></head><body>x</body></html>`
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

test('printInWindow gives the window a script-free shell holding a sandboxed iframe whose srcdoc is the print document', () => {
  const { win, frame, log } = fakeWindow()
  assert.equal(printInWindow(win, PRINT_DOC, { title: 'harbour-brand-book' }), true)
  assert.ok(!/<script|<form|<iframe/i.test(log.written), 'the shell holds no script, form or frame of its own')
  assert.ok(!log.written.includes('Content-Security-Policy'), 'the print document is not written into the shell')
  assert.match(log.written, /background:#fff/)
  assert.match(log.written, /margin:0/)
  assert.match(log.written, /iframe\{[^}]*border:0[^}]*width:100vw[^}]*height:100vh/)
  assert.equal(log.title, 'harbour-brand-book', 'the title rule is kept on the outer document')
  assert.deepEqual(log.frames, [frame])
  assert.equal(frame.srcdoc, PRINT_DOC)
  const sandbox = frame.attrs.sandbox.split(/\s+/)
  assert.deepEqual(sandbox.sort(), ['allow-modals', 'allow-same-origin'])
  assert.ok(!frame.attrs.sandbox.includes('allow-scripts'), 'a print document never gets allow-scripts')
  assert.equal(PRINT_FRAME_SANDBOX, 'allow-same-origin allow-modals')
  assert.ok(log.order.indexOf('close') < log.order.indexOf('append'), 'the shell is closed before the frame goes in')
})

test('printInWindow prints the iframe\'s window, from this page, once it has loaded and its fonts have settled', async () => {
  const { win, frame, log } = fakeWindow()
  printInWindow(win, PRINT_DOC)
  await wait(300)
  assert.equal(log.printed, 0, 'nothing prints before the iframe loads')
  frame.listeners.load()
  await wait(50)
  assert.equal(log.printed, 0, 'and not before the fonts have settled and the short pause has passed')
  await wait(400)
  assert.equal(log.printed, 1)
  assert.equal(log.focused, 1)
  assert.deepEqual(log.order.slice(-2), ['focus', 'print'], 'focus, then print')
  assert.ok(!log.winPrinted && !log.winFocused, 'the shell window itself is never printed')
  frame.listeners.load()
  await wait(500)
  assert.equal(log.printed, 1, 'a second load does not print twice')
})

test('printInWindow prints without fonts.ready after a longer pause, and a closed window does not throw', async () => {
  const { win, frame, log } = fakeWindow({ fonts: false })
  assert.equal(printInWindow(win, PRINT_DOC), true)
  frame.listeners.load()
  await wait(600)
  assert.equal(log.printed, 1)
  const gone = fakeWindow()
  printInWindow(gone.win, PRINT_DOC)
  gone.frame.contentWindow.print = () => { throw new Error('closed') }
  gone.frame.listeners.load()
  await wait(400)
})

test('printInWindow returns false, and writes nothing, for no window, a closed window, or an unsafe document', () => {
  assert.equal(printInWindow(null, PRINT_DOC), false)
  assert.equal(printInWindow(undefined, PRINT_DOC), false)
  const closed = fakeWindow(); closed.win.closed = true
  assert.equal(printInWindow(closed.win, PRINT_DOC), false)
  assert.equal(closed.log.written, '')
  for (const bad of [PRINT_DOC.replace('x</body>', '<script>1</script></body>'), PRINT_DOC.replace('x</body>', '<form></form></body>'), '', '<p>no policy</p>']) {
    const w = fakeWindow()
    assert.equal(printInWindow(w.win, bad), false)
    assert.equal(w.log.written, '')
    assert.deepEqual(w.log.frames, [])
  }
  const broken = { closed: false, get document() { throw new Error('cross-origin') } }
  assert.equal(printInWindow(broken, PRINT_DOC), false)
})
