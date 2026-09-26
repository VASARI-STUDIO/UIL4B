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

test('only production posts; everywhere else logs', () => {
  const src = fs.readFileSync('src/utils/errorReport.js', 'utf8')
  assert.match(src, /send: canWriteSharedAnalytics\(\) \? postToSupport : consoleOnly/)
})

test('main.jsx installs the global capture once', () => {
  const src = fs.readFileSync('src/main.jsx', 'utf8')
  assert.equal((src.match(/installGlobalErrorCapture\(\)/g) || []).length, 1)
})
