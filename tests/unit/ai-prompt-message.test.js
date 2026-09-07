// The user message /api/ai's generate-prompt task sends to the providers.
//
// It is built from three caller-controlled strings, and until the 2026-09-06
// engineering review only the first was type-checked: `style: 123` passed
// `if (style)` and threw a TypeError on `.slice`, out of the handler, as a 500.
// Reachable only after auth — but a signed-in user crashing a function on
// demand is still a defect, and the fix is a pure function this file exercises
// against the real module rather than a description of it.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

// api/ai.js reads the provider keys into module constants at import time.
// Nothing here calls a provider, but the keys are cleared so this file cannot
// depend on the environment it happens to run in.
for (const k of ['GEMINI_API_KEY', 'GOOGLE_GENERATIVE_AI_API_KEY', 'GOOGLE_API_KEY', 'OPENROUTER_API_KEY']) {
  delete process.env[k]
}
const { buildPromptUserMessage, PROMPT_DESCRIPTION_MAX, PROMPT_STYLE_MAX, PROMPT_PLATFORM_MAX } = await import('../../api/ai.js')

test('a non-string style or platform is ignored, not thrown on', () => {
  for (const bad of [123, {}, [], true, () => 'x']) {
    let out
    assert.doesNotThrow(() => { out = buildPromptUserMessage({ description: 'A poster', style: bad, platform: bad }) },
      `${typeof bad} style/platform must not throw`)
    assert.equal(out, 'Design brief: A poster', `${typeof bad} style/platform must be dropped, not stringified`)
  }
})

test('a missing or non-string description is null, which the route turns into its 400', () => {
  for (const bad of [undefined, null, '', 0, 42, ['x'], {}]) {
    assert.equal(buildPromptUserMessage({ description: bad }), null, `${JSON.stringify(bad)} is not a description`)
  }
  assert.equal(buildPromptUserMessage(), null)
})

test('the message carries the three fields in the order the system prompt expects', () => {
  assert.equal(
    buildPromptUserMessage({ description: 'A poster', style: 'Bauhaus', platform: 'Midjourney' }),
    'Design brief: A poster\nStyle: Bauhaus\nTarget platform: Midjourney',
  )
  assert.equal(buildPromptUserMessage({ description: 'A poster', platform: 'DALL-E' }),
    'Design brief: A poster\nTarget platform: DALL-E')
})

test('each field is capped at the same length it always was', () => {
  assert.equal(PROMPT_DESCRIPTION_MAX, 2000)
  assert.equal(PROMPT_STYLE_MAX, 200)
  assert.equal(PROMPT_PLATFORM_MAX, 100)
  const out = buildPromptUserMessage({ description: 'd'.repeat(3000), style: 's'.repeat(300), platform: 'p'.repeat(200) })
  assert.equal(out.length, 'Design brief: '.length + 2000 + '\nStyle: '.length + 200 + '\nTarget platform: '.length + 100)
})

test('the route builds its message through the pure function', () => {
  // The helper being right is worth nothing if runGeneratePrompt went back to
  // slicing the raw fields inline.
  const src = fs.readFileSync(path.join(process.cwd(), 'api/ai.js'), 'utf8')
  const start = src.indexOf('async function runGeneratePrompt')
  const end = src.indexOf('\nconst TASKS', start)
  assert.ok(start > -1 && end > start, 'runGeneratePrompt moved; this test is looking at nothing')
  const body = src.slice(start, end)
  assert.match(body, /const userMessage = buildPromptUserMessage\(\{ description, style, platform \}\)/,
    'runGeneratePrompt no longer shapes its message through buildPromptUserMessage')
  assert.doesNotMatch(body, /style\.slice\(|platform\.slice\(/,
    'the raw .slice() on an unchecked optional field is back')
})
