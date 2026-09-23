// A FAILURE IN THE ADMIN PANEL IS NOT ANNOUNCED WITH A SUCCESS TICK.
//
// `toast(msg)` defaults to the success kind: a green tick, role="status" and
// the short clock. 98-admin-verify-toast proves the one path it can reach in a
// browser (a refused /api/verify-admin). The rest of Admin.jsx's failures —
// "Update failed", "Delete failed", "Save failed: …", a refused role change —
// sit behind Firestore and Stripe calls the suite cannot make fail on cue, and
// six of them were still calling `toast()` with no kind when this was written.
//
// So this reads the source: every toast call whose message states a failure
// must pass the error kind. A ternary message with a failure branch must pass a
// kind argument that can resolve to 'error'.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const src = fs.readFileSync(path.join(process.cwd(), 'src', 'pages', 'Admin.jsx'), 'utf8')

const FAILURE = /\bfail|could not|only images|must be under|too large|invalid|refused/i

/** Every `toast(` / `toast?.(` call, split into its top-level arguments. */
function toastCalls(text) {
  const calls = []
  const re = /\btoast(?:\?\.)?\(/g
  let m
  while ((m = re.exec(text))) {
    let i = m.index + m[0].length
    let depth = 1
    let quote = null
    let arg = ''
    const args = []
    for (; i < text.length && depth > 0; i++) {
      const c = text[i]
      if (quote) {
        arg += c
        if (c === '\\') { arg += text[++i]; continue }
        if (c === quote) quote = null
        continue
      }
      if (c === "'" || c === '"' || c === '`') { quote = c; arg += c; continue }
      if (c === '(' || c === '[' || c === '{') depth++
      if (c === ')' || c === ']' || c === '}') depth--
      if (depth === 0) break
      if (c === ',' && depth === 1) { args.push(arg.trim()); arg = ''; continue }
      arg += c
    }
    if (arg.trim()) args.push(arg.trim())
    const line = text.slice(0, m.index).split('\n').length
    calls.push({ line, args })
  }
  return calls
}

const calls = toastCalls(src)

test('the reader finds Admin.jsx toast calls, success and failure (positive control)', () => {
  assert.ok(calls.length >= 25, `only ${calls.length} toast calls found — the reader is not reading Admin.jsx`)
  assert.ok(calls.some((c) => /Prompt updated/.test(c.args[0] || '')), 'a known success toast is not found')
  assert.ok(calls.some((c) => /Update failed/.test(c.args[0] || '')), 'a known failure toast is not found')
})

test('every toast whose message states a failure is raised as an error', () => {
  const wrong = calls
    .filter((c) => FAILURE.test(c.args[0] || ''))
    .filter((c) => !/'error'/.test(c.args[1] || ''))
    .map((c) => `Admin.jsx:${c.line} toast(${(c.args[0] || '').replace(/\s+/g, ' ').slice(0, 70)}${c.args[1] ? ', ' + c.args[1] : ''})`)
  assert.deepEqual(wrong, [], 'failure toasts raised with the success kind')
})
