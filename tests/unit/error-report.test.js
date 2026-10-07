// Crash reports: what leaves the browser, and how often.
// The module is src/utils/errorReport.js; its header says why each rule exists.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {
  describeError, topFrames, cleanRoute, isNoise, createErrorReporter,
  SESSION_LIMIT, MIN_INTERVAL_MS,
} from '../../src/utils/errorReport.js'
import { validateSupportBody } from '../../api/support.js'
import { stripJs } from '../helpers/strip-comments.js'

function memoryStorage() {
  const m = new Map()
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }
}

const STACK = [
  'TypeError: Cannot read properties of undefined (reading \'join\')',
  '    at Prompts (https://uil4b.com/assets/Admin-Ab12Cd.js?v=3:1:2345)',
  '    at renderWithHooks (https://uil4b.com/assets/index-Xy.js:9:100)',
].join('\n')

test('the route loses its query string and hash', () => {
  assert.equal(cleanRoute('/checkout/return?session_id=cs_live_secret#x'), '/checkout/return')
  assert.equal(cleanRoute(''), '/')
})

test('the stack is reduced to file names, with no origin and no query string', () => {
  const frames = topFrames(STACK)
  assert.equal(frames.length, 2)
  assert.equal(frames[0], 'at Prompts (Admin-Ab12Cd.js:1:2345)')
  assert.ok(!frames.join('\n').includes('uil4b.com'))
})

test('a report carries no email address, even one quoted in the error', () => {
  const err = new Error('No account for jane.doe@example.com')
  err.stack = `Error: x\n    at f (https://uil4b.com/assets/a.js:1:1)`
  const { subject, message } = describeError(err, { pathname: '/settings?email=jane.doe@example.com' })
  assert.ok(!`${subject}\n${message}`.includes('jane.doe'), `${subject}\n${message}`)
  assert.match(message, /\[email\]/)
  assert.match(message, /Route: \/settings$/m)
})

test('a report passes the /api/support contract as a bug from the inline source', () => {
  let sent = null
  const report = createErrorReporter({ send: (b) => { sent = b }, storage: memoryStorage(), now: () => 1e12 })
  const err = new TypeError("Cannot read properties of undefined (reading 'join')")
  err.stack = STACK
  assert.equal(report(err, { pathname: '/admin', kind: 'render' }), true)
  assert.deepEqual(Object.keys(sent).sort(), ['email', 'message', 'source', 'subject', 'type'])
  assert.equal(sent.email, '')
  const { entry, error } = validateSupportBody(sent)
  assert.equal(error, undefined)
  assert.equal(entry.type, 'bug')
  assert.equal(entry.source, 'inline')
  assert.match(entry.subject, /^Crash on \/admin: /)
})

test('never the same error twice, never more than the session limit, never faster than the interval', () => {
  let clock = 1e12
  const sent = []
  const report = createErrorReporter({ send: (b) => sent.push(b), storage: memoryStorage(), now: () => clock })
  assert.equal(report(new Error('one'), { pathname: '/a' }), true)
  assert.equal(report(new Error('one'), { pathname: '/a' }), false, 'a duplicate was sent')
  clock += MIN_INTERVAL_MS - 1
  assert.equal(report(new Error('two'), { pathname: '/a' }), false, 'sent inside the interval')
  clock += 2
  assert.equal(report(new Error('two'), { pathname: '/a' }), true)
  clock += MIN_INTERVAL_MS * 10
  assert.equal(report(new Error('three'), { pathname: '/a' }), false, 'sent past the session limit')
  assert.equal(sent.length, SESSION_LIMIT)
  // Leaves room under /api/support's 3-a-minute limit for the person's own report.
  assert.ok(SESSION_LIMIT < 3)
})

test('browser noise is not reported', () => {
  const sent = []
  const report = createErrorReporter({ send: (b) => sent.push(b), storage: memoryStorage() })
  assert.equal(isNoise('Script error.'), true)
  assert.equal(report('ResizeObserver loop completed with undelivered notifications.', {}), false)
  assert.equal(sent.length, 0)
})

test('storage that refuses writes sends nothing rather than sending every time', () => {
  const sent = []
  const storage = { getItem: () => null, setItem: () => { throw new Error('quota') } }
  const report = createErrorReporter({ send: (b) => sent.push(b), storage })
  assert.equal(report(new Error('x'), {}), false)
  assert.equal(sent.length, 0)
})

// A page file that failed to download is not a crash. See src/utils/lazyRoute.js.
const CHUNK = 'Failed to fetch dynamically imported module: https://example.test/assets/Credits-Bv60jtlr.js'

test('a chunk failure is not reported while the chunk-recovery reload is in flight', () => {
  const sent = []
  const storage = memoryStorage()
  const report = createErrorReporter({
    send: (b) => sent.push(b), storage, now: () => 1e12, reloadPending: () => true,
  })
  assert.equal(report(new TypeError(CHUNK), { pathname: '/credits', kind: 'render' }), false)
  assert.equal(report(new Error('Unable to preload CSS for /assets/SurfaceIndex-bdUDG-8n.css'), { pathname: '/learn', kind: 'rejection' }), false)
  assert.equal(sent.length, 0, 'a report was filed for a chunk the reload is already recovering')
  assert.equal(storage.getItem('uil4b-error-reports'), null, 'the session allowance was spent on a reload')
})

test('a real crash is reported even while a chunk-recovery reload is in flight', () => {
  const sent = []
  const report = createErrorReporter({
    send: (b) => sent.push(b), storage: memoryStorage(), now: () => 1e12, reloadPending: () => true,
  })
  assert.equal(report(new TypeError("Cannot read properties of undefined (reading 'join')"), { pathname: '/admin', kind: 'render' }), true,
    'a code crash was held back because a reload was pending')
  assert.equal(sent.length, 1)
  assert.match(sent[0].subject, /^Crash on \/admin: /)
})

test('a chunk failure that survives the reload is reported once, and not as a crash', () => {
  let clock = 1e12
  const sent = []
  const report = createErrorReporter({
    send: (b) => sent.push(b), storage: memoryStorage(), now: () => clock, reloadPending: () => false,
  })
  assert.equal(report(new TypeError(CHUNK), { pathname: '/credits?x=1', kind: 'render' }), true)
  clock += MIN_INTERVAL_MS * 2
  assert.equal(report(new TypeError(CHUNK), { pathname: '/credits', kind: 'render' }), false, 'reported twice')
  assert.equal(sent.length, 1)
  assert.match(sent[0].subject, /^Chunk load failed on \/credits: Failed to fetch dynamically imported module/)
  assert.ok(!/Crash on/.test(sent[0].subject), sent[0].subject)
  // A stylesheet that would not preload is the same kind of failure.
  assert.match(describeError(new Error('Unable to preload CSS for /assets/SurfaceIndex-bdUDG-8n.css'), { pathname: '/learn' }).subject,
    /^Chunk load failed on \/learn: /)
  // ...and a crash in code that DID arrive keeps its name.
  assert.match(describeError(new TypeError("Cannot read properties of undefined (reading 'join')"), { pathname: '/admin' }).subject,
    /^Crash on \/admin: /)
})

test('the browser reporter is told when a chunk-recovery reload is in flight', () => {
  const src = stripJs(fs.readFileSync('src/utils/errorReport.js', 'utf8'))
  assert.match(src, /reloadPending: chunkReloadPending/)
})

test('only production posts; everywhere else logs', () => {
  const src = fs.readFileSync('src/utils/errorReport.js', 'utf8')
  assert.match(src, /send: canWriteSharedAnalytics\(\) \? postToSupport : consoleOnly/)
})

test('main.jsx installs the global capture once', () => {
  const src = fs.readFileSync('src/main.jsx', 'utf8')
  assert.equal((src.match(/installGlobalErrorCapture\(\)/g) || []).length, 1)
})
