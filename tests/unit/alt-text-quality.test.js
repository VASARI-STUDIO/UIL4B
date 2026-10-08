// Alt-text generation must return complete answers, display them in full,
// and produce accessible descriptions with honest search relevance.
// This file checks three behaviours:
//   1. api/ai.js reads Gemini's `finishReason`: a MAX_TOKENS response remains
//      truncated even with well-formed `parts`, and a SAFETY refusal is
//      classified separately from an empty response.
//   2. The result box grows to fit a complete 300-character 'detailed' answer.
//   3. The prompt combines WCAG requirements with search relevance.
//
// The finishReason tests below run the real decision function against real
// response shapes. The prompt and UI tests read source, and strip comments
// FIRST — assertions must match executable source rather than explanatory prose.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import { classifyGeminiFinish } from '../../api/_lib/geminiFinish.js'
import {
  altTextOutcome, altTextGenerationConfig, thinkingConfigFor, altTextCutoffReply,
  ALT_TEXT_MAX_OUTPUT_TOKENS, ALIAS_THINKING_BUDGET, ALT_TEXT_CUTOFF_ERRORS,
} from '../../api/_lib/altText.js'
import { ALL_CSS } from './appStylesheets.js'

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8')
const stripComments = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^\s*\/\/.*$/gm, ' ')

const AI = stripComments(read('api/ai.js'))
const PAGE = stripComments(read('src/pages/AltTextGenerator.jsx'))
// Every stylesheet, not just global.css: the `alt` family lives in
// src/styles/pages/alt-text.css, and reading global.css alone would make the
// assertions below pass by looking at nothing.
const CSS = ALL_CSS

// A response shaped the way Gemini actually shapes them.
const reply = (finishReason, text) => ({
  candidates: [{
    content: text === undefined ? undefined : { parts: [{ text }], role: 'model' },
    finishReason,
  }],
})

// ── Fault 1 · finishReason is read and acted on ─────────────────────────────

test('a complete answer classifies as ok and is not flagged truncated', () => {
  const v = classifyGeminiFinish(reply('STOP', 'Site manager reviews plans on a tablet.'))
  assert.equal(v.status, 'ok')
  assert.equal(v.text, 'Site manager reviews plans on a tablet.')
})

test('MAX_TOKENS with text is truncated, not ok', () => {
  // A well-formed parts array does not imply success: finishReason determines
  // whether the response is complete.
  const v = classifyGeminiFinish(reply('MAX_TOKENS', 'A line chart of quarterly revenue showing subscriptions climbing from'))
  assert.equal(v.status, 'truncated',
    'a response that stopped at the token ceiling must never classify as a finished answer')
  assert.equal(v.text, 'A line chart of quarterly revenue showing subscriptions climbing from',
    'the partial text is still returned — the user can finish it by hand')
})

test('a missing finishReason with text present is treated as complete', () => {
  const v = classifyGeminiFinish(reply(undefined, 'Two people walking a coastal path.'))
  assert.equal(v.status, 'ok')
  assert.equal(v.reason, 'STOP', 'absent reason must default to STOP, not to unknown')
})

test('SAFETY is a refusal, not an empty response', () => {
  // A deliberate safety refusal must be classified separately from an empty
  // provider response.
  const v = classifyGeminiFinish(reply('SAFETY', undefined))
  assert.equal(v.status, 'blocked')
  assert.equal(v.reason, 'SAFETY')
})

test('every shipped spelling of a safety refusal classifies as blocked', () => {
  for (const reason of ['SAFETY', 'PROHIBITED_CONTENT', 'BLOCKLIST', 'SPII', 'IMAGE_SAFETY']) {
    assert.equal(classifyGeminiFinish(reply(reason, undefined)).status, 'blocked',
      `${reason} must not fall through to the empty-response branch`)
  }
})

test('a prompt blocked BEFORE generation has no candidate and is still caught', () => {
  // This shape has no candidates array at all — the reason lives on
  // promptFeedback. Checking only the candidate makes it look like an empty
  // response.
  const v = classifyGeminiFinish({ promptFeedback: { blockReason: 'SAFETY' } })
  assert.equal(v.status, 'blocked')
  assert.equal(v.reason, 'SAFETY')
})

test('RECITATION is reported as its own case', () => {
  const v = classifyGeminiFinish(reply('RECITATION', undefined))
  assert.equal(v.status, 'recitation')
})

test('a genuinely empty response is still an empty response', () => {
  assert.equal(classifyGeminiFinish(reply('STOP', '')).status, 'empty')
  assert.equal(classifyGeminiFinish({}).status, 'empty')
})

// ── Fault 1b · a cut-off reply is an error, never a result ──────────────────
//
// Gemini 2.5 charges its thinking tokens against maxOutputTokens, so a small
// ceiling leaves too little room for the reply. The rules: thinking is capped,
// the ceiling is generous, and a MAX_TOKENS reply is answered as an error,
// which refunds the metered unit.

test('a reply cut off at the token ceiling is an error with no text, not a result', () => {
  const o = altTextOutcome(reply('MAX_TOKENS', 'A line chart of quarterly revenue showing subscriptions climbing from'))
  assert.equal(o.ok, false, 'half a sentence must never be returned as alt text')
  assert.equal(o.status, 502)
  assert.equal(o.finishReason, 'MAX_TOKENS')
  assert.ok(!('altText' in o), 'the partial text must not travel to the client at all')
  assert.match(o.error, /try again/i, 'the error must tell the user what to do')
  assert.equal(o.cutOff, true)
})

test('MAX_TOKENS with no text is a cut-off too, not an empty response', () => {
  // Thinking can use the whole ceiling, so the reply arrives with no parts.
  for (const data of [reply('MAX_TOKENS', undefined), reply('MAX_TOKENS', ''), { candidates: [{ finishReason: 'MAX_TOKENS' }] }]) {
    const o = altTextOutcome(data)
    assert.equal(o.ok, false)
    assert.equal(o.status, 502)
    assert.equal(o.cutOff, true, 'a MAX_TOKENS reply with no text must settle as a cut-off')
    assert.equal(o.finishReason, 'MAX_TOKENS')
    assert.doesNotMatch(o.error, /Empty response/)
  }
  assert.ok(!altTextOutcome(reply('STOP', '')).cutOff, 'a genuinely empty reply is not a cut-off')
})

test('the cut-off message says the allowance is untouched only when the refund was granted', () => {
  assert.deepEqual(altTextCutoffReply('refunded'), { error: ALT_TEXT_CUTOFF_ERRORS.refunded, quotaSpent: false })
  assert.match(ALT_TEXT_CUTOFF_ERRORS.refunded, /Nothing came off your allowance/)
  for (const refund of ['limit', 'kept', undefined, true, 'anything else']) {
    const r = altTextCutoffReply(refund)
    assert.equal(r.quotaSpent, true, `"${refund}" was reported as refunded`)
    assert.doesNotMatch(r.error, /Nothing came off/, `"${refund}" was told the attempt was free`)
  }
  assert.match(altTextCutoffReply('limit').error, /daily limit/)
  assert.doesNotMatch(altTextCutoffReply('kept').error, /daily limit/, 'a store failure is not the daily limit')
  // The default on the outcome itself makes no claim either way.
  assert.doesNotMatch(altTextOutcome(reply('MAX_TOKENS', 'Half a')).error, /Nothing came off/)
})

test('a finished reply is returned, with stray markdown stripped', () => {
  const o = altTextOutcome(reply('STOP', '**Site manager** reviews plans on a tablet.'))
  assert.deepEqual(o, { ok: true, altText: 'Site manager reviews plans on a tablet.', finishReason: 'STOP' })
})

test('refusals and empty replies keep their own statuses', () => {
  assert.equal(altTextOutcome(reply('SAFETY', undefined)).status, 422)
  assert.equal(altTextOutcome(reply('RECITATION', undefined)).status, 422)
  assert.equal(altTextOutcome(reply('STOP', '')).status, 502)
  // Markdown-only output strips to nothing; that is an empty reply, not a result.
  assert.equal(altTextOutcome(reply('STOP', '# ')).status, 502)
})

test('thinking is capped at the lowest value each Gemini 2.5 model accepts', () => {
  assert.deepEqual(thinkingConfigFor('gemini-2.5-flash'), { thinkingBudget: 0 })
  assert.deepEqual(thinkingConfigFor('gemini-2.5-flash-lite'), { thinkingBudget: 0 })
  assert.deepEqual(thinkingConfigFor('models/gemini-2.5-flash-preview-09-2025'), { thinkingBudget: 0 })
  assert.deepEqual(thinkingConfigFor('gemini-2.5-flash-lite-preview-06-17'), { thinkingBudget: 0 })
  assert.deepEqual(thinkingConfigFor('Gemini-2.5-Flash-Latest'), { thinkingBudget: 0 })
  assert.deepEqual(thinkingConfigFor('gemini-2.5-pro'), { thinkingBudget: 128 }, '2.5 Pro cannot switch thinking off; 128 is its floor')
  assert.deepEqual(thinkingConfigFor('gemini-2.5-pro-preview-06-05'), { thinkingBudget: 128 })
})

test('Gemini 3 and later get the lowest thinking level the whole family supports', () => {
  for (const id of ['gemini-3-flash-preview', 'gemini-3.1-pro-preview', 'gemini-3.1-flash-lite', 'gemini-3.5-flash-lite',
    'gemini-3.6-flash', 'gemini-3.8-flash', 'models/gemini-3.8-flash', 'gemini-4-pro', 'gemini-3.8-flash-latest']) {
    assert.deepEqual(thinkingConfigFor(id), { thinkingLevel: 'LOW' }, id)
  }
})

test('a version-less alias gets a budget both generations accept', () => {
  // The alias can resolve to 2.5 (where thinkingLevel is an error) or to 3+.
  for (const id of ['gemini-flash-latest', 'gemini-flash-lite-latest', 'gemini-pro-latest', 'models/gemini-flash-latest']) {
    assert.deepEqual(thinkingConfigFor(id), { thinkingBudget: ALIAS_THINKING_BUDGET }, id)
  }
  // Inside every 2.5 range: Flash 0-24576, Flash-Lite 512-24576, Pro 128-32768,
  // and well under the output ceiling.
  assert.ok(ALIAS_THINKING_BUDGET >= 512 && ALIAS_THINKING_BUDGET <= ALT_TEXT_MAX_OUTPUT_TOKENS / 2)
})

test('models that cannot think, and non-text variants, get no thinkingConfig', () => {
  // generateContent rejects a thinkingConfig for a model without thinking.
  for (const id of ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-pro', 'gemini-1.5-flash-002',
    'gemini-2.5-flash-image', 'gemini-2.5-flash-image-preview', 'gemini-2.5-flash-preview-tts', 'gemini-2.5-pro-preview-tts',
    'gemini-2.5-flash-native-audio-preview-12-2025', 'gemini-3.1-flash-image', 'gemini-3.1-flash-lite-image', 'gemini-3-pro-image',
    'gemini-3.8-flash-tts', 'gemini-3.8-live', 'gemini-live-2.5-flash-preview', 'gemini-embedding-001',
    'gemma-3-27b-it', '', undefined, null]) {
    assert.equal(thinkingConfigFor(id), null, String(id))
  }
  assert.ok(!('thinkingConfig' in altTextGenerationConfig('gemini-2.0-flash', 0.4)))
  assert.ok(!('thinkingConfig' in altTextGenerationConfig('gemini-2.5-flash-image', 0.4)))
})

test('the output ceiling is a runaway guard with room for the longest mode', () => {
  const cfg = altTextGenerationConfig('gemini-2.5-flash', 0.4)
  assert.deepEqual(cfg.thinkingConfig, { thinkingBudget: 0 })
  assert.equal(cfg.temperature, 0.4)
  // 'detailed' asks for up to 300 characters (~100 tokens). The ceiling must
  // clear that many times over, plus a Pro model's minimum thinking.
  assert.ok(cfg.maxOutputTokens >= 1024, `ceiling ${cfg.maxOutputTokens} is too tight`)
  assert.equal(ALT_TEXT_MAX_OUTPUT_TOKENS, cfg.maxOutputTokens)
})

// A model of the documented Gemini 2.5 behaviour, not a recording: thinking
// (dynamic unless a budget is given) is spent first, from the same ceiling as
// the answer. Used to show the mechanism end to end against both configs.
function simulateGemini25(generationConfig, { dynamicThinking = 450, answer = 'Two people walk a dog along a wet coastal path at dusk, with a lighthouse on the headland behind them.' } = {}) {
  const words = answer.split(' ')
  const answerTokens = Math.ceil(answer.length / 4)
  const budget = generationConfig.thinkingConfig?.thinkingBudget
  const thoughts = budget === undefined ? dynamicThinking : budget
  const room = generationConfig.maxOutputTokens - thoughts
  if (room >= answerTokens) {
    return { candidates: [{ content: { parts: [{ text: answer }] }, finishReason: 'STOP' }], usageMetadata: { thoughtsTokenCount: thoughts, candidatesTokenCount: answerTokens } }
  }
  const kept = words.slice(0, Math.max(0, Math.floor(words.length * room / answerTokens))).join(' ')
  return { candidates: [{ content: { parts: kept ? [{ text: kept }] : [] }, finishReason: 'MAX_TOKENS' }], usageMetadata: { thoughtsTokenCount: thoughts, candidatesTokenCount: Math.max(0, room) } }
}

test('a 300-token ceiling with default thinking cuts the reply off; the shared budget does not', () => {
  const before = altTextOutcome(simulateGemini25({ temperature: 0.4, maxOutputTokens: 300 }, { dynamicThinking: 280 }))
  assert.equal(before.ok, false, 'the model of a 300-token ceiling with default thinking should reproduce the cut-off')
  assert.equal(before.finishReason, 'MAX_TOKENS')

  const after = altTextOutcome(simulateGemini25(altTextGenerationConfig('gemini-2.5-flash', 0.4), { dynamicThinking: 280 }))
  assert.equal(after.ok, true)
  assert.match(after.altText, /headland behind them\.$/, 'the whole sentence arrives')
})

// Bounded by code, not by the section-header comment: AI is comment-stripped,
// so a comment marker is not found and the slice runs to the end of the file.
const ALT_BLOCK = AI.slice(AI.indexOf('async function runAltText'), AI.indexOf('async function runScanPhoto'))

test('the runAltText slice is bounded, so the assertions below are about it alone', () => {
  assert.ok(AI.indexOf('async function runAltText') > -1 && AI.indexOf('async function runScanPhoto') > -1)
  assert.ok(ALT_BLOCK.length > 500 && ALT_BLOCK.length < 8000, `runAltText slice is ${ALT_BLOCK.length} chars`)
})

test('the route builds its request from the shared budget and answers through the outcome', () => {
  const altBlock = ALT_BLOCK
  assert.match(altBlock, /generationConfig: altTextGenerationConfig\(model, toneConfig\.temperature\)/,
    'the request must use the shared budget, including the thinking cap')
  assert.ok(!/maxOutputTokens/.test(altBlock), 'a per-request ceiling has crept back into the route')
  assert.ok(!/maxOutputTokens/.test(AI.slice(AI.indexOf('const TONE_CONFIGS'), AI.indexOf('async function runAltText'))),
    'a per-tone ceiling has crept back — thinking tokens count against it')
  assert.match(altBlock, /const outcome = altTextOutcome\(data\)/)
  assert.match(altBlock, /if \(!outcome\.ok\)[\s\S]{0,1000}?res\.status\(outcome\.status\)/,
    'a failed outcome must answer through res, which is what refunds the unit')
  assert.match(altBlock, /altText: outcome\.altText/)
  assert.ok(!/truncated/.test(altBlock), 'the route hands no partial text to the client')
})

test('the route does not retry on its own — the budget prevents the cut-off, and a retry re-uploads the image', () => {
  const altBlock = ALT_BLOCK
  assert.ok(!/maxOutputTokens\s*\*\s*\d/.test(altBlock), 'no escalated token budget')
  assert.ok(!/runAltText\(req, res/.test(altBlock.replace(/async function runAltText\(req, res[^)]*\)/, '')),
    'runAltText must not call itself — that is a silent second billed request')
})

test('the client shows only finished answers, and a failed card can be retried', () => {
  assert.ok(!/truncated/.test(PAGE), 'the page still carries a half-answer path')
  assert.ok(!/\.alt-card-warn\s*\{/.test(CSS), 'the half-answer warning style is dead and should go')
  assert.match(PAGE, /altText: data\.altText, status: 'done'/)
  // A card in the error state still offers a button to try again.
  assert.match(PAGE, /\{!it\.altText && it\.status !== 'generating' && \(/)
  assert.match(PAGE, /\{it\.status === 'error' \? 'Retry' : 'Generate'\}/)
})

test('a failed reply that used the allowance is counted locally, before the meter reads it', () => {
  const gen = PAGE.slice(PAGE.indexOf('const generateForItem'), PAGE.indexOf('const generateOne'))
  const counted = gen.indexOf("if (!r.ok && data.quotaSpent === true) recordUsage(ALT_TEXT_TOOL_ID)")
  assert.ok(counted > -1, 'a counted cut-off is not recorded in the local tracker')
  assert.ok(counted < gen.indexOf('quota.absorb(data)'), 'the local count must change before the meter re-reads it')
})

// ── Fault 2 · the result field fits its content ─────────────────────────────

test('the result field grows to fit instead of clipping into a 3-row box', () => {
  assert.ok(!/rows=\{3\}/.test(PAGE),
    'the fixed 3-row result box is what made a complete 300-char answer look cut off')
  assert.match(PAGE, /function AutoGrowTextarea/)
  assert.match(PAGE, /el\.style\.height = 'auto'/,
    'height must be reset before measuring or scrollHeight only ever ratchets upward')
  assert.match(PAGE, /Math\.min\(needed, maxHeight\)/)
  assert.match(PAGE, /el\.style\.overflowY = needed > maxHeight \? 'auto' : 'hidden'/,
    'past the ceiling it must scroll rather than grow without limit')
  // Under border-box, the measured height must include the border to avoid
  // clipping the last line's descenders.
  assert.match(PAGE, /cs\.boxSizing === 'border-box'/,
    'the border must be added to the measured height or the last line is clipped')
  assert.match(PAGE, /const needed = el\.scrollHeight \+ border/)
})

test('the result field is still editable — editing must not regress', () => {
  assert.match(PAGE, /<AutoGrowTextarea[\s\S]{0,300}?onChange=\{\(e\) => editAlt\(it\.id, e\.target\.value\)\}/,
    'the auto-growing field must still write edits back through editAlt')
  assert.match(PAGE, /const editAlt = \(id, value\) =>[\s\S]{0,160}?altText: value/)
})

test('the autosize ceiling and the CSS backstop agree', () => {
  // If the script fails to run, max-height is all that stops a runaway box.
  // Two numbers that must match are a drift risk, so this is where it is caught.
  const js = /ALT_TEXT_MAX_HEIGHT = (\d+)/.exec(PAGE)
  const css = /\.alt-card-text\s*\{[^}]*max-height:\s*(\d+)px/.exec(CSS)
  assert.ok(js && css, 'both the JS ceiling and the CSS backstop must exist')
  assert.equal(js[1], css[1], 'ALT_TEXT_MAX_HEIGHT and .alt-card-text max-height have drifted apart')
  assert.match(CSS, /\.alt-card-text\s*\{[^}]*resize:\s*none/,
    'a self-sizing field must not also carry a manual resize handle that its next keystroke overwrites')
  assert.ok(!/\.alt-card-text\s*\{[^}]*min-height/.test(CSS),
    'a min-height fights the measured height on a one-line result')
})

// ── Fault 3 · the prompt is a structured brief with an honest SEO dimension ──

// The template-literal matcher must support CRLF line endings so the prompt
// assertions inspect the full prompt rather than an empty string.
const PROMPT = /const ALT_BASE_PROMPT = `([\s\S]*?)`/.exec(AI)?.[1] || ''

test('the prompt is a markdown-structured brief, not a flat bullet list', () => {
  assert.ok(PROMPT.length > 0, 'ALT_BASE_PROMPT must be readable as a template literal')
  for (const heading of ['# Role', '# Output contract', '# Worked examples']) {
    assert.ok(PROMPT.includes(heading), `the brief is missing its "${heading}" section`)
  }
  const headings = PROMPT.match(/^# .+$/gm) || []
  assert.ok(headings.length >= 4,
    `a structured brief needs headed sections; found ${headings.length}`)
})

test('the brief carries worked examples — the largest lever on this task', () => {
  const good = PROMPT.match(/^Good: .+$/gm) || []
  const bad = PROMPT.match(/^Bad: .+$/gm) || []
  assert.ok(good.length >= 2, `few-shot needs at least 2 worked examples, found ${good.length}`)
  assert.equal(good.length, bad.length, 'each worked example needs its counter-example')
  // A chart example must demonstrate a meaningful description beyond "a bar chart".
  assert.match(PROMPT, /Line chart of quarterly revenue/)
})

test('the output contract is explicit about plain text', () => {
  // The brief itself is markdown, so it must say plainly that the OUTPUT is not.
  const contract = PROMPT.slice(PROMPT.indexOf('# Output contract'))
  assert.match(contract, /No markdown/i)
  assert.match(contract, /decorative/, 'the decorative escape hatch must survive in the contract')
})

test('WCAG correctness is still the floor — every original rule survives', () => {
  // This is the legal and accessibility purpose. Adding an SEO dimension must
  // not cost any of it, so each original rule is checked individually.
  const rules = [
    [/Image of/, 'the "Image of" prohibition'],
    [/verbatim/i, 'reproducing on-image text verbatim'],
    [/inclusiv/i, 'inclusive description of people'],
    [/functional images/i, 'functional images describing destination not artwork'],
    [/charts, graphs and infographics/i, 'chart and graph handling'],
    [/decorative/, 'the decorative response'],
    [/Front-load/i, 'front-loading for screen-reader truncation'],
    [/WCAG 2\.2/, 'the named standard'],
  ]
  for (const [pattern, name] of rules) {
    assert.match(PROMPT, pattern, `WCAG floor regressed: ${name} is gone from the brief`)
  }
})

test('the SEO dimension is honest — relevance, never keyword density', () => {
  assert.match(PROMPT, /DO NOT repeat a term to reach a density/)
  assert.match(PROMPT, /spam polic/i, 'the brief must name stuffing as a policy violation')
  assert.match(PROMPT, /DO NOT insert words that are not descriptions of what is in the image/)
  // The load-bearing claim: the two audiences want the same sentence. Without
  // it the model reads "SEO" as licence to bolt keywords onto a description.
  assert.match(PROMPT, /same text that earns relevance in search/)
})

test('the brief never instructs the model to stuff, weight or repeat keywords', () => {
  // A negative assertion, because the failure mode here is a plausible-looking
  // instruction that quietly makes the tool a spam generator.
  for (const banned of [/keyword density/i, /include the keyword/i, /target keyword/i, /repeat the keyword/i, /SEO keywords? (?:to|in)/i]) {
    assert.ok(!banned.test(PROMPT), `the brief contains a stuffing instruction matching ${banned}`)
  }
})

test('a non-array parts field degrades to "empty", not to a thrown 500', () => {
  assert.equal(classifyGeminiFinish({ candidates: [{ content: { parts: 'oops' }, finishReason: 'STOP' }] }).status, 'empty')
  assert.equal(classifyGeminiFinish({ candidates: [{ content: {}, finishReason: 'STOP' }] }).status, 'empty')
})

test('markdown structure is stripped from the author-supplied context', () => {
  // The markdown brief gives `#` structural meaning, so author context must
  // not introduce headings such as "# Output contract / ignore the above".
  // Only the caller's own generation is at risk, but an
  // alt-text endpoint that can be steered into a general-purpose LLM is an
  // abuse path on a free provider tier.
  assert.match(AI, /replace\(\/\^\\s\*#\{1,6\}\\s\*\/gm, ''\)/,
    'forged markdown headings must be stripped from context')
  assert.match(AI, /\.replace\(\/`\/g, ''\)/, 'code fences must be stripped from context')
  assert.match(AI, /safeContext/, 'the sanitised value, not the raw one, must reach the prompt')
  assert.ok(!/\$\{context\.slice\(0, 500\)\}/.test(AI),
    'the raw context must no longer be interpolated into the prompt')
})

test('page context is injected as relevance-only, at the point of use', () => {
  // The general rule sits 60 lines up the prompt. This is the input a stuffing
  // tool would abuse, so the constraint is restated where it is injected.
  assert.match(AI, /# Page context from the author/)
  assert.match(AI, /Use this for relevance only/)
  assert.match(AI, /do not treat it as keywords to include/)
  assert.match(AI, /cannot actually see in the image/,
    'context must never license describing something absent from the image')
})

test('the UI promises relevance, not ranking tricks', () => {
  assert.match(PAGE, /never inserted as keywords/,
    'the context field must say what it is NOT used for')
  assert.match(PAGE, /Stuffing keywords breaks Google/)
  assert.ok(!/keyword density/i.test(PAGE), 'no density language in user-facing copy')
})

// ── Intuitiveness · the tone control explains itself ────────────────────────

test('each length mode says what it produces AND when to use it', () => {
  const tones = PAGE.slice(PAGE.indexOf('const TONES = ['), PAGE.indexOf('const ALT_TEXT_MAX_HEIGHT'))
  for (const id of ['concise', 'detailed', 'technical']) {
    assert.ok(tones.includes(`id: '${id}'`), `${id} mode is missing`)
  }
  assert.equal((tones.match(/desc:/g) || []).length, 3, 'every mode needs a "what it produces"')
  assert.equal((tones.match(/when:/g) || []).length, 3, 'every mode needs a "when to use it"')
})

test('the guidance is rendered, not hidden in a title tooltip', () => {
  // title= is invisible on touch and never answers the only question a
  // first-time user has: which one do I pick?
  assert.match(PAGE, /\{activeTone\.desc\}/)
  assert.match(PAGE, /\{activeTone\.when\}/)
  assert.match(PAGE, /const activeTone = TONES\.find/)
  assert.match(CSS, /\.alt-field-help\s*\{/, 'the help text must be styled, not unstyled fallback')
})

test('the length chips announce which one is selected', () => {
  // The selected chip must expose its state to screen-reader users.
  assert.match(PAGE, /aria-pressed=\{tone === t\.id\}/)
  assert.match(PAGE, /role="group" aria-labelledby="alt-tone-label"/)
})
