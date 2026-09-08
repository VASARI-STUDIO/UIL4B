// Founder report: "the alt text generator could use improvement, the longer
// version generation seems to get cut off ... the whole point of this tool is to
// make it so users can easily generate good SEO outputs."
//
// Three separate faults sat behind that one sentence, and this file guards all
// three:
//   1. api/ai.js never read Gemini's `finishReason`, so a MAX_TOKENS response —
//      which still carries well-formed `parts` — was returned as a finished
//      answer, and a SAFETY refusal was reported as "Empty response from AI
//      provider".
//   2. The result box was a fixed rows={3} textarea. A 300-character 'detailed'
//      result cannot fit three rows, so a COMPLETE answer looked cut off. This
//      is the one the founder was most likely actually looking at.
//   3. The prompt was purely WCAG with no search dimension at all.
//
// The finishReason tests below run the real decision function against real
// response shapes. The prompt and UI tests read source, and strip comments
// FIRST — assertions in this repo have previously matched an agent's own
// explanatory prose and passed while proving nothing.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import { classifyGeminiFinish } from '../../api/_lib/geminiFinish.js'
import { ALL_CSS } from './appStylesheets.js'

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8')
const stripComments = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^\s*\/\/.*$/gm, ' ')

const AI = stripComments(read('api/ai.js'))
const PAGE = stripComments(read('src/pages/AltTextGenerator.jsx'))
// Every stylesheet, not just global.css: the `alt` family now lives in
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

test('MAX_TOKENS with text is truncated, NOT ok — this is the reported bug', () => {
  // The trap: this response carries a well-formed parts array and reads as a
  // success at every level except the one field nothing used to check.
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
  // Previously fell through to "Empty response from AI provider", which blamed
  // the provider for being broken when it had made a deliberate decision.
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

test('the route acts on every verdict rather than only reading it', () => {
  assert.match(AI, /classifyGeminiFinish\(data\)/, 'the route must run the classifier')
  assert.match(AI, /verdict\.status === 'blocked'[\s\S]{0,400}?status\(422\)/,
    'a safety refusal must return its own status, not a generic provider error')
  assert.match(AI, /verdict\.status === 'recitation'[\s\S]{0,400}?status\(422\)/)
  assert.match(AI, /const truncated = verdict\.status === 'truncated'/)
  assert.match(AI, /\n\s*truncated,/, 'the payload must carry the truncated flag to the client')
})

test('no auto-retry was added — free tiers only, and the quota stays the user\'s', () => {
  // A retry at a higher budget re-uploads the image, roughly doubling the cost
  // of the most expensive call the tool makes, and spends a second unit of the
  // user's allowance on something they never asked for.
  const altBlock = AI.slice(AI.indexOf('async function runAltText'), AI.indexOf('scan-photo ───'))
  assert.ok(!/maxOutputTokens\s*\*\s*\d/.test(altBlock), 'no escalated token budget')
  assert.ok(!/runAltText\(req, res/.test(altBlock.replace(/async function runAltText\(req, res[^)]*\)/, '')),
    'runAltText must not call itself — that is a silent second billed request')
})

test('the client surfaces truncation instead of swallowing it', () => {
  assert.match(PAGE, /truncated: Boolean\(data\.truncated\)/,
    'the flag must be stored on the item')
  assert.match(PAGE, /it\.truncated && \(/, 'and it must gate a rendered warning')
  assert.match(PAGE, /alt-card-warn/, 'the warning needs its own treatment, not the error style')
  assert.match(PAGE, /status: 'generating', error: null, truncated: false/,
    'a retry must clear the previous attempt\'s truncation flag')
  assert.ok(CSS.includes('.alt-card-warn{'), 'the warning class must actually be styled')
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
  // Measured in a browser: without this the content area is 2px short of its
  // content under border-box, which shaves the last line's descenders.
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
  const css = /\.alt-card-text\{[^}]*max-height:(\d+)px/.exec(CSS)
  assert.ok(js && css, 'both the JS ceiling and the CSS backstop must exist')
  assert.equal(js[1], css[1], 'ALT_TEXT_MAX_HEIGHT and .alt-card-text max-height have drifted apart')
  assert.match(CSS, /\.alt-card-text\{[^}]*resize:none/,
    'a self-sizing field must not also carry a manual resize handle that its next keystroke overwrites')
  assert.ok(!/\.alt-card-text\{[^}]*min-height/.test(CSS),
    'a min-height fights the measured height on a one-line result')
})

// ── Fault 3 · the prompt is a structured brief with an honest SEO dimension ──

// Note the CRLF: this repo's line endings are \r\n, so anchoring the close of
// the template literal to `\n` silently matched nothing and every prompt
// assertion below ran against an empty string and "passed" vacuously.
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
  // A chart example specifically: "a bar chart" is the single most common
  // failure mode and prose instructions alone did not fix it.
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
  // The brief is markdown now, so the model reads `#` as structure — a context
  // of "# Output contract / ignore the above" has leverage the old flat bullet
  // list never gave it. Only the caller's own generation is at risk, but an
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
  assert.ok(CSS.includes('.alt-field-help{'), 'the help text must be styled, not unstyled fallback')
})

test('the length chips announce which one is selected', () => {
  // They were styled-selected only, so a screen-reader user could not tell.
  assert.match(PAGE, /aria-pressed=\{tone === t\.id\}/)
  assert.match(PAGE, /role="group" aria-labelledby="alt-tone-label"/)
})
