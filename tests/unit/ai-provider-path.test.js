// The prompt tool runs OpenRouter as primary and Gemini as fallback, and the
// fallback is SILENT: a wrong, revoked or rate-limited OpenRouter key produces a
// perfectly good generation from Gemini, so the app looks healthy while the
// primary provider is dead. Nothing in the UI changes. Nothing is counted.
//
// WHAT THIS GUARDS. The only way anyone can tell the two apart is the `provider`
// field on the generation response, and the only record that a failover happened
// at all is one console.error line. Both are easy to lose in a refactor, and
// losing either is invisible — which is the same fault one level up.
//
// docs/OWNER-ACTIONS.md now tells the founder to read `provider` in devtools as
// THE procedure for closing `openrouter-path-verification`. These tests are what
// keep that procedure from quietly becoming impossible.
//
// Written against the code rather than the comments: api/ai.js explains the
// fallback at length, and an assertion that matched the prose would stay green
// while guarding nothing.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const read = (f) => fs.readFileSync(path.join(process.cwd(), 'api', f), 'utf8')
const stripJs = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

const ai = () => stripJs(read('ai.js'))

// The body of runGeneratePrompt, which is where the provider race lives.
function generatePromptBody() {
  const src = ai()
  const start = src.indexOf('async function runGeneratePrompt')
  assert.ok(start > -1, 'api/ai.js no longer defines runGeneratePrompt')
  const next = src.indexOf('\nconst TASKS', start)
  assert.ok(next > start, 'could not find the end of runGeneratePrompt')
  return src.slice(start, next)
}

test('THE ONE THAT MATTERS: a generation says which provider served it', () => {
  // Without this field there is NO way, from outside the deployment, to tell a
  // healthy OpenRouter from a dead one — both return a good prompt. It is the
  // whole of the founder procedure in docs/OWNER-ACTIONS.md.
  const body = generatePromptBody()
  assert.match(body, /provider\s*=\s*'openrouter'/,
    'nothing marks a response as served by OpenRouter')
  assert.match(body, /provider\s*=\s*'gemini'/,
    'nothing marks a response as served by the Gemini fallback')
  assert.match(body, /^\s*provider,\s*$/m,
    'the response no longer returns `provider` — a silent failover becomes undetectable from outside')
})

test('the two providers report DIFFERENT names, or the field proves nothing', () => {
  const names = [...generatePromptBody().matchAll(/provider\s*=\s*'([a-z-]+)'/g)].map((m) => m[1])
  assert.equal(new Set(names).size, names.length,
    `two provider branches report the same name (${names.join(', ')}) — the field could not distinguish them`)
  assert.ok(names.length >= 2, `expected a primary and a fallback, found ${names.length}`)
})

test('OpenRouter is the primary: it is tried first, and Gemini only if nothing came back', () => {
  // If the order ever reverses, "primary provider" becomes a false statement in
  // the docs, the backlog and the module board — and every response would say
  // gemini, which reads as a failure that has not happened.
  const body = generatePromptBody()
  const or = body.indexOf('await callOpenRouter(')
  const gem = body.indexOf('await callGemini(')
  assert.ok(or > -1, 'runGeneratePrompt no longer calls OpenRouter')
  assert.ok(gem > -1, 'runGeneratePrompt no longer calls Gemini')
  assert.ok(or < gem, 'Gemini is attempted before OpenRouter — OpenRouter is documented as the primary')
  assert.match(body, /if\s*\(\s*!prompt\s*&&\s*GEMINI_KEY\s*\)/,
    'the fallback is no longer conditional on the primary having produced nothing — it would run every time or never')
})

test('a failover is not silent on the server, even though it is silent to the user', () => {
  // One console.error is a thin record, but it is the ONLY record: no counter,
  // no persisted signal, no operator surface. Deleting it would leave a dead
  // primary provider with literally no trace anywhere.
  const body = generatePromptBody()
  assert.match(body, /catch\s*\([\s\S]{0,80}console\.error\(\s*'OpenRouter failed/,
    'the OpenRouter failure is swallowed without logging — a dead primary provider would leave no trace at all')
})

test('the prompt tool survives an OpenRouter outage, and the vision tools still require Gemini', () => {
  // This is also why an unauthenticated probe of /api/ai cannot isolate the
  // OpenRouter key: generate-prompt is configured when EITHER key is present,
  // so its 401 says nothing about which one.
  const src = ai()
  assert.match(src, /configured:\s*\(\)\s*=>\s*Boolean\(OPENROUTER_KEY\s*\|\|\s*GEMINI_KEY\)/,
    'generate-prompt no longer accepts either provider — an OpenRouter outage would take the tool down')
  const geminiOnly = [...src.matchAll(/configured:\s*\(\)\s*=>\s*Boolean\(GEMINI_KEY\)/g)]
  assert.equal(geminiOnly.length, 2,
    'alt-text and scan-photo are Gemini vision tasks and must require GEMINI_KEY')
})

test('the diagnostic reports that a key EXISTS, never what it is', () => {
  // It also cannot report that a key WORKS, which is the point of the owner
  // action: "set (73 chars)" is what a revoked key looks like too.
  const src = ai()
  assert.match(src, /openrouterKey:\s*OPENROUTER_KEY\s*\?[^\n]*OPENROUTER_KEY\.length/,
    'the diagnostic no longer reports the OpenRouter key as a length')
  assert.doesNotMatch(src, /openrouterKey:\s*OPENROUTER_KEY\s*,/,
    'the diagnostic returns the OpenRouter key itself')
  assert.doesNotMatch(src, /geminiKey:\s*GEMINI_KEY\s*,/,
    'the diagnostic returns the Gemini key itself')
})

test('the owner action does not tell the founder the diagnostic can close it', () => {
  // The previous wording said "confirm the diagnostic now reports OpenRouter as
  // available". It cannot: it reports presence, which was already confirmed on
  // 2026-08-07. Following that instruction would have recorded a PASS for a
  // check that never ran — the silent failover reproduced in the runbook.
  const doc = fs.readFileSync(path.join(process.cwd(), 'docs/OWNER-ACTIONS.md'), 'utf8')
  assert.doesNotMatch(doc, /diagnostic now reports OpenRouter as available/,
    'OWNER-ACTIONS.md asks for a confirmation the diagnostic is incapable of giving')
  assert.match(doc, /provider: "openrouter"/,
    'OWNER-ACTIONS.md must name the `provider` field and the value that means PASS — it is the only thing that closes this')
  assert.match(doc, /provider: "gemini"/,
    'OWNER-ACTIONS.md must say what a silent failover looks like, or the founder cannot recognise the failure')
})
