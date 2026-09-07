// THE NUMBER ON THE PAGE MUST BE THE NUMBER THE SERVER ENFORCES.
//
// This page has shipped a false AI claim twice — "1,000 AI actions a day"
// against a per-project provider tier, and "full design JSON" as a Pro benefit
// for a file that cannot be produced (see tests/unit/plans-truth.test.js). Both
// times a capability was DESCRIBED in copy instead of DERIVED from the thing
// that implements it, and prose does not go stale loudly.
//
// The Brand Starter is the most dangerous place left for that, because its
// whole proposition IS a number: "one free generation". If /plans says one and
// the server grants three, the product is giving away money; if /plans says one
// and the server grants none, the free tier is a lie the user discovers at the
// moment they try to use it.
//
// So this file pins four separate hops, and each one has broken somewhere in
// this repository before:
//
//   1. the client mirror against the server module          (plan-limits.test.js class)
//   2. /plans against the client mirror                     (plans-truth.test.js class)
//   3. the model's font catalogue against the app's own     (new — see below)
//   4. THE WIRING: that api/ai.js actually meters this way, that the increment
//      happens after the generation and not before, and that the page mounts
//      at all                                               (the class this repo has
//                                                            paid for four times)
//
// Hop 4 is the one that matters most and is the one a config test usually
// skips. Four separate times a correct fix shipped beside a test that exercised
// a helper in isolation; the sharpest case left the unit suite at 1363/1363
// while three browser tests failed, because one CALL SITE had been reverted.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import {
  FREE_TOTAL_GENERATIONS as SERVER_FREE,
  PRO_MONTHLY_GENERATIONS as SERVER_PRO,
  BRAND_STARTER_TOOL_ID as SERVER_TOOL_ID,
  MAX_PROMPT_CHARS as SERVER_MAX,
  MIN_PROMPT_CHARS as SERVER_MIN,
  PALETTE_MIN_ROLES as SERVER_PALETTE_MIN,
  PALETTE_MAX_ROLES as SERVER_PALETTE_MAX,
  BASE_MIN,
  BASE_MAX,
  RATIO_MIN,
  RATIO_MAX,
  FONT_SHORTLIST,
  LIFETIME_BUCKET_SUFFIX,
  generationBucket,
  exhaustedError,
  fontChoiceList,
  parseStarterJson,
  sanitizeBrandStarter,
  normaliseHex,
} from '../../api/_lib/aiGeneration.js'

import {
  FREE_TOTAL_GENERATIONS as CLIENT_FREE,
  PRO_MONTHLY_GENERATIONS as CLIENT_PRO,
  BRAND_STARTER_TOOL_ID as CLIENT_TOOL_ID,
  MAX_PROMPT_CHARS as CLIENT_MAX,
  MIN_PROMPT_CHARS as CLIENT_MIN,
  PALETTE_MIN_ROLES as CLIENT_PALETTE_MIN,
  PALETTE_MAX_ROLES as CLIENT_PALETTE_MAX,
  BRAND_STARTER_ARTEFACTS,
  GENERATION_ALLOWANCES,
  allowanceSentence,
  exhaustedMessage,
  generationAllowance,
  generationsRemaining,
} from '../../src/config/aiGeneration.js'

import { FALLBACK_FONTS } from '../../src/data/fallbackFonts.js'
import { liveToolRoutes, createTools } from '../../src/data/toolTree.js'

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8')
const stripJs = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ')

const AI_SRC = read('api/ai.js')
const AI_CODE = stripJs(AI_SRC)
const PAGE = read('src/pages/BrandStarter.jsx')
const PAGE_CODE = stripJs(PAGE)
const PLANS = read('src/pages/Plans.jsx')
const CREATE_TOOL = read('src/pages/CreateTool.jsx')

// ── 1. the mirror ────────────────────────────────────────────────────────────

test('the client mirror and the server module agree on every number', () => {
  // Imported on both sides rather than parsed: src/config/aiGeneration.js is
  // deliberately plain data with no React in it, and api/_lib/aiGeneration.js is
  // plain data with no Firebase in it, which is exactly what makes this a real
  // comparison instead of two regexes agreeing with each other.
  assert.equal(CLIENT_FREE, SERVER_FREE, 'the free allowance differs between the page and the server')
  assert.equal(CLIENT_PRO, SERVER_PRO, 'the Pro allowance differs between the page and the server')
  assert.equal(CLIENT_TOOL_ID, SERVER_TOOL_ID, 'the two sides meter different tool ids')
  assert.equal(CLIENT_MAX, SERVER_MAX, 'the prompt cap the field shows is not the one the server applies')
  assert.equal(CLIENT_MIN, SERVER_MIN, 'the minimum brief length differs')
  assert.equal(CLIENT_PALETTE_MIN, SERVER_PALETTE_MIN)
  assert.equal(CLIENT_PALETTE_MAX, SERVER_PALETTE_MAX)
})

test('the founder’s stated requirement holds: Free is one per account, ever', () => {
  // The literal ask, 2026-09-06: "free users will get 1 free usage". A change
  // that turns this into a daily or monthly refill is a pricing decision and
  // should fail here rather than ship quietly.
  assert.equal(SERVER_FREE, 1, 'the free allowance is no longer one generation')
  assert.equal(GENERATION_ALLOWANCES.free.period, 'lifetime',
    'the free allowance now resets — "1 free usage" was not a per-period figure')
  assert.equal(generationBucket('free', 'm2026-09').suffix, LIFETIME_BUCKET_SUFFIX,
    'a free account is being metered against a bucket that resets')
})

test('Pro is a real increase, on a window that resets, and is not unbounded', () => {
  assert.ok(SERVER_PRO > SERVER_FREE, 'Pro does not buy more Brand Starter generations than Free')
  assert.equal(GENERATION_ALLOWANCES.pro.period, 'month')
  assert.equal(generationBucket('pro', 'm2026-09').suffix, 'm2026-09',
    'Pro is not metered against the shared monthly bucket, so its ceiling never resets with the month')
  // Guards the cheap way to make everything else pass: a huge number. The
  // shared provider ceiling in api/_lib/plans.js is ~200 successful generations
  // a DAY site-wide, and Pro's whole AI monthly allowance is 300.
  assert.ok(SERVER_PRO <= 60,
    `a Pro allowance of ${SERVER_PRO} is a material share of the shared provider pool — `
    + 'raise it deliberately, with the arithmetic in api/_lib/plans.js re-checked')
})

test('a bucket id can never collide with a day or a month bucket', () => {
  // All three live in `daily-usage`. Days are `uid_2026-09-06`, months are
  // `uid_m2026-09`. A lifetime suffix that could be produced by a date would
  // silently share a counter with them.
  assert.match(LIFETIME_BUCKET_SUFFIX, /^[a-z]+$/,
    'the lifetime bucket suffix contains something a date format could produce')
  assert.ok(!/^\d/.test(LIFETIME_BUCKET_SUFFIX) && !/^m\d/.test(LIFETIME_BUCKET_SUFFIX))
})

test('an unrecognised plan is metered as Free, never as Pro', () => {
  for (const odd of [undefined, null, '', 'lifetime', 'enterprise', 'PRO']) {
    assert.equal(generationBucket(odd, 'm2026-09').limit, SERVER_FREE,
      `plan "${odd}" resolves to something other than the free allowance`)
    assert.equal(generationAllowance(odd).total, CLIENT_FREE)
  }
})

// ── 2. what a person is told ─────────────────────────────────────────────────

test('the two plans are told DIFFERENT things about when their allowance returns', () => {
  // Telling a free user their allowance "resets on the 1st" is a lie they act
  // on by coming back in a month to the same wall — the same failure api/ai.js's
  // own limit copy was rewritten to avoid.
  const free = exhaustedError('free')
  const pro = exhaustedError('pro')
  assert.notEqual(free, pro, 'both plans get the same refusal, so one of them is wrong')
  assert.doesNotMatch(free, /resets/i, 'the free refusal promises a reset that never comes')
  assert.match(pro, /resets on the 1st/i, 'the Pro refusal does not say when the allowance returns')
  assert.match(free, /Pro/, 'the free refusal offers no way forward at all')

  // And the client says the same two things, in its own words but with the same
  // meaning — this is the sentence the tool actually renders.
  assert.doesNotMatch(exhaustedMessage('free', 1), /resets/i)
  assert.match(exhaustedMessage('pro', SERVER_PRO), /resets on the 1st/i)
})

test('the allowance sentence says one WHAT, and for how long', () => {
  const free = allowanceSentence('free')
  const pro = allowanceSentence('pro')
  assert.match(free, /once per account/, 'the free sentence does not say the allowance never returns')
  assert.match(pro, /a month/, 'the Pro sentence does not name its window')
  assert.match(free, new RegExp(`\\b${CLIENT_FREE}\\b`))
  assert.match(pro, new RegExp(`\\b${CLIENT_PRO}\\b`))
  // A bare number beside a feature name is the shape the "1,000 AI actions"
  // claim had. The unit has to be in the sentence.
  assert.match(free, /generation/)
})

test('remaining is floored, and a message only appears when it is actually empty', () => {
  assert.equal(generationsRemaining('free', 0), 1)
  assert.equal(generationsRemaining('free', 1), 0)
  assert.equal(generationsRemaining('free', 99), 0, 'a negative remainder leaked out')
  assert.equal(generationsRemaining('pro', 5), SERVER_PRO - 5)
  assert.equal(exhaustedMessage('free', 0), null, 'a user with an unused allowance is being shown the wall')
  assert.ok(exhaustedMessage('free', 1))
})

// ── 3. the font catalogue ────────────────────────────────────────────────────

test('THE ONE THAT MATTERS FOR THE OUTPUT: every font the model may pick really exists', () => {
  // A language model asked for "a heading font" answers with a plausible name,
  // and plausible is not real — it will offer Neue Haas Grotesk or Söhne, which
  // are not on Google Fonts. The hand-off would then carry a family Font Pair
  // cannot fetch, and the user would land on a tool rendering its fallback face
  // while the result screen told them they had chosen something else.
  //
  // src/data/fallbackFonts.js is the app's own bundled catalogue — the list the
  // typography tools use when the WebFonts API is unreachable — so a family
  // present there is one this product can definitely render.
  const catalogue = new Map(FALLBACK_FONTS.map((f) => [f.family, f]))
  const problems = []
  for (const f of FONT_SHORTLIST) {
    const known = catalogue.get(f.family)
    if (!known) { problems.push(`${f.family} is not in the bundled catalogue at all`); continue }
    if (known.category !== f.category) {
      problems.push(`${f.family} is ${known.category}, not ${f.category} — the CSS generic fallback would be wrong`)
    }
    for (const [role, weight] of [['heading', f.headingWeight], ['body', f.bodyWeight]]) {
      if (!known.variants.includes(weight)) {
        problems.push(`${f.family} does not ship ${weight} (${role}); requesting it makes the css2 stylesheet fail outright`)
      }
    }
  }
  assert.deepEqual(problems, [], 'the model is being offered fonts this product cannot load:\n  ' + problems.join('\n  '))
})

test('the catalogue is a real choice and reaches the model verbatim', () => {
  // Guards the cheap pass: a one-entry list satisfies every check above while
  // making the tool answer the same way every time.
  assert.ok(FONT_SHORTLIST.length >= 20, `only ${FONT_SHORTLIST.length} families offered`)
  const cats = new Set(FONT_SHORTLIST.map((f) => f.category))
  assert.ok(cats.has('serif') && cats.has('sans-serif'),
    'the shortlist cannot express an editorial direction and an interface one')
  const names = FONT_SHORTLIST.map((f) => f.family)
  assert.equal(new Set(names).size, names.length, 'a family appears twice')

  // …and the list the PROMPT prints is the list that is ENFORCED. If these ever
  // diverge, the model is told it may pick something that will be refused.
  const printed = fontChoiceList()
  for (const f of FONT_SHORTLIST) {
    assert.ok(printed.includes(`${f.family} (${f.category})`), `${f.family} is enforced but never offered`)
  }
  assert.equal(printed.split('\n').length, FONT_SHORTLIST.length)
})

// ── 4. the boundary ──────────────────────────────────────────────────────────

const goodAnswer = () => ({
  name: 'Quiet Schedule',
  rationale: 'A calm working palette that stays readable across a full day of scheduling.',
  palette: [
    { role: 'Background', hex: '#FFFFFF' },
    { role: 'Surface', hex: '#F4F5F7' },
    { role: 'Text', hex: '#14161A' },
    { role: 'Primary', hex: '#1F5F9E' },
    { role: 'Accent', hex: '#C2643B' },
  ],
  fonts: { heading: 'Inter', body: 'Inter' },
  typeScale: { base: 16, ratio: 1.25 },
})

test('a well-formed answer survives, rebuilt field by field', () => {
  // The POSITIVE CONTROL for every refusal below. "The bad answer was refused"
  // is trivially true if nothing is ever accepted.
  const v = sanitizeBrandStarter(goodAnswer())
  assert.equal(v.ok, true, v.reason)
  assert.equal(v.starter.palette.length, 5)
  assert.equal(v.starter.fonts.heading.family, 'Inter')
  assert.equal(v.starter.fonts.heading.category, 'sans-serif')
  assert.ok(v.starter.fonts.heading.weight > v.starter.fonts.body.weight,
    'the two roles came back at the same weight, so one family in both slots is indistinguishable')
  assert.deepEqual(v.starter.typeScale, { base: 16, ratio: 1.25 })
})

test('a key the model invented never reaches the client', () => {
  // The sanitizeCommunitySubmission rule: rebuild rather than merge, so an
  // unknown field is dropped instead of carried.
  const raw = goodAnswer()
  raw.injectedHtml = '<img src=x onerror=alert(1)>'
  raw.palette[0].onClick = 'stealEverything()'
  const v = sanitizeBrandStarter(raw)
  assert.equal(v.ok, true)
  assert.ok(!('injectedHtml' in v.starter), 'an unknown top-level key was merged through')
  assert.deepEqual(Object.keys(v.starter.palette[0]).sort(), ['hex', 'role'],
    'a swatch carried a key the model invented')
  assert.deepEqual(Object.keys(v.starter).sort(), ['fonts', 'name', 'palette', 'rationale', 'typeScale'])
})

test('a font off the catalogue is REFUSED, never substituted', () => {
  // Substituting silently is the same lie one step later: the user would be
  // shown a family they did not get.
  for (const invented of ['Söhne', 'Neue Haas Grotesk', 'Helvetica Neue', '', null, 42]) {
    const raw = goodAnswer()
    raw.fonts.heading = invented
    const v = sanitizeBrandStarter(raw)
    assert.equal(v.ok, false, `"${invented}" was accepted as a heading family`)
    assert.match(v.reason, /catalogue/)
  }
  const bodyBad = goodAnswer()
  bodyBad.fonts.body = 'Comic Sans MS'
  assert.equal(sanitizeBrandStarter(bodyBad).ok, false, 'an invented BODY family was accepted')
})

test('a family is matched case- and space-insensitively, because that is punctuation', () => {
  const raw = goodAnswer()
  raw.fonts.heading = '  playfair display '
  raw.fonts.body = 'LORA'
  const v = sanitizeBrandStarter(raw)
  assert.equal(v.ok, true, v.reason)
  assert.equal(v.starter.fonts.heading.family, 'Playfair Display', 'the canonical spelling is not restored')
  assert.equal(v.starter.fonts.body.family, 'Lora')
})

test('a palette that is too short, or too short once cleaned, is refused', () => {
  const short = goodAnswer()
  short.palette = short.palette.slice(0, 3)
  assert.equal(sanitizeBrandStarter(short).ok, false)

  // The realistic version: the right NUMBER of entries, but several unusable.
  // Counting entries rather than usable colours would have passed this.
  const dirty = goodAnswer()
  dirty.palette = [
    { role: 'Background', hex: '#FFFFFF' },
    { role: 'Text', hex: 'not-a-colour' },
    { role: 'Primary', hex: '#12' },
    { role: 'Accent', hex: null },
    { role: 'Border', hex: '#FFFFFF' },  // duplicate
  ]
  const v = sanitizeBrandStarter(dirty)
  assert.equal(v.ok, false, 'a palette with one usable colour was accepted')
  assert.match(v.reason, /usable colours/)
})

test('a swatch with no usable role keeps its COLOUR and loses only the word', () => {
  const raw = goodAnswer()
  raw.palette[3].role = '<script>alert(1)</script>'
  raw.palette[4].role = ''
  const v = sanitizeBrandStarter(raw)
  assert.equal(v.ok, true, v.reason)
  assert.equal(v.starter.palette.length, 5, 'a colour was thrown away over its label')
  for (const c of v.starter.palette) {
    assert.match(c.role, /^[A-Za-z][A-Za-z0-9 -]*$/, `role "${c.role}" survived unsanitised`)
  }
})

test('the palette is capped and deduplicated', () => {
  const raw = goodAnswer()
  raw.palette = Array.from({ length: 20 }, (_, i) => ({
    role: `Role ${i}`,
    hex: `#${String(i).padStart(2, '0')}00${String(i).padStart(2, '0')}`,
  }))
  const v = sanitizeBrandStarter(raw)
  assert.equal(v.ok, true, v.reason)
  assert.equal(v.starter.palette.length, SERVER_PALETTE_MAX, 'the palette cap is not applied')
})

test('a type scale outside the tools’ own range is refused, not clamped', () => {
  // Clamping would hand the destination a silently different answer from the
  // one the result screen showed.
  for (const base of [0, 4, 13, 21, 400, 'sixteen', NaN, null]) {
    const raw = goodAnswer()
    raw.typeScale.base = base
    assert.equal(sanitizeBrandStarter(raw).ok, false, `base ${base} was accepted`)
  }
  for (const ratio of [0, 1, 1.05, 1.8, 12, 'golden', null]) {
    const raw = goodAnswer()
    raw.typeScale.ratio = ratio
    assert.equal(sanitizeBrandStarter(raw).ok, false, `ratio ${ratio} was accepted`)
  }
  // …and the accepted range is inside what utils/typeHandoff.js will carry, or
  // the hand-off would drop the whole scale on the way to the tool.
  assert.ok(BASE_MIN >= 8 && BASE_MAX <= 40, 'the base range is outside typeHandoff BASE_MIN/BASE_MAX')
  assert.ok(RATIO_MIN >= 1.01 && RATIO_MAX <= 3, 'the ratio range is outside typeHandoff RATIO_MIN/RATIO_MAX')
})

test('a non-object, an array or a null is refused rather than thrown on', () => {
  for (const junk of [null, undefined, 'a palette', 42, [], [goodAnswer()], true]) {
    const v = sanitizeBrandStarter(junk)
    assert.equal(v.ok, false, `${JSON.stringify(junk)} was accepted`)
    assert.ok(v.reason, 'a refusal with no reason gives the log nothing to act on')
  }
})

test('the free-text fields are capped and flattened', () => {
  const raw = goodAnswer()
  raw.name = 'x'.repeat(500)
  raw.rationale = 'line one\n\n\nline two   with    gaps'
  const v = sanitizeBrandStarter(raw)
  assert.ok(v.starter.name.length <= 48, 'the name is not capped')
  assert.ok(!/\n/.test(v.starter.rationale), 'newlines survived into a single-line field')
  assert.ok(v.starter.rationale.length <= 240)

  const nameless = goodAnswer()
  delete nameless.name
  assert.ok(sanitizeBrandStarter(nameless).starter.name, 'a missing name produced an empty heading')
})

test('JSON is recovered from the wrappers models actually add', () => {
  const obj = { a: 1 }
  const body = JSON.stringify(obj)
  assert.deepEqual(parseStarterJson(body), obj)
  assert.deepEqual(parseStarterJson('```json\n' + body + '\n```'), obj)
  assert.deepEqual(parseStarterJson('```\n' + body + '\n```'), obj)
  assert.deepEqual(parseStarterJson('Here you go:\n' + body + '\nHope that helps!'), obj)
  // …and genuinely unusable input is null rather than a throw, because the
  // caller has to turn it into a refusal that costs the user nothing.
  for (const junk of ['', null, undefined, 'no object here', '{ not json ']) {
    assert.equal(parseStarterJson(junk), null, `parsed "${junk}"`)
  }
})

test('hex normalisation accepts what a model writes and refuses what it invents', () => {
  assert.equal(normaliseHex('#aabbcc'), '#AABBCC')
  assert.equal(normaliseHex('AABBCC'), '#AABBCC')
  assert.equal(normaliseHex('  #AaBbCc '), '#AABBCC')
  for (const bad of ['#abc', 'rgb(1,2,3)', 'red', '#12345', '#1234567', '', null, 42, {}]) {
    assert.equal(normaliseHex(bad), null, `accepted ${JSON.stringify(bad)}`)
  }
})

// ── 5. THE WIRING ────────────────────────────────────────────────────────────

test('THE ONE THAT MATTERS: api/ai.js registers the task and meters it on ONE bucket', () => {
  const at = AI_CODE.indexOf("'brand-starter': {")
  assert.ok(at > -1, 'api/ai.js no longer registers the brand-starter task — the endpoint would 400 on it')
  const block = AI_CODE.slice(at, AI_CODE.indexOf('\n  },', at))
  assert.match(block, /quota:\s*'generation'/,
    'the task lost its quota switch, so it would fall through to the shared daily/monthly caps '
    + 'and a free user would get five a day instead of one for ever')
  assert.match(block, /run:\s*runBrandStarter/, 'the task no longer runs the brand-starter handler')
  assert.match(block, /configured:\s*\(\)\s*=>\s*Boolean\(OPENROUTER_KEY \|\| GEMINI_KEY\)/,
    'the task no longer accepts either provider — an OpenRouter outage would take it down')
  assert.match(block, new RegExp(`toolId:\\s*BRAND_STARTER_TOOL_ID`),
    'the task meters against a hand-typed tool id instead of the shared constant')
})

test('THE ONE THAT MATTERS: a failed generation cannot consume the allowance', () => {
  // The whole of "a free user's single use must never be consumed by a failed
  // request". Asserted as an ORDERING in the handler, because that is the only
  // thing that makes it true: every failure path in runBrandStarter answers on
  // `res` itself and returns nothing, and the handler bails before the write.
  const branch = AI_CODE.slice(AI_CODE.indexOf("if (task.quota === 'generation')"))
  const bail = branch.indexOf('res.writableEnded || res.headersSent')
  const write = branch.indexOf('FieldValueIncrement(1)')
  const run = branch.indexOf('await task.run(')
  assert.ok(run > -1, 'the generation branch no longer runs the task')
  assert.ok(bail > -1, 'the guard that detects a runner which answered for itself is gone')
  assert.ok(write > -1, 'nothing increments the bucket, so the allowance is not enforced at all')
  assert.ok(run < bail && bail < write,
    'the usage increment no longer sits AFTER the early return — a provider failure, a malformed '
    + 'model answer or a 429 would now spend the user’s one free generation')
})

test('the refusal is checked BEFORE the provider is called, not after', () => {
  const branch = AI_CODE.slice(AI_CODE.indexOf("if (task.quota === 'generation')"))
  const check = branch.indexOf('used >= bucket.limit')
  const run = branch.indexOf('await task.run(')
  assert.ok(check > -1, 'nothing compares the count against the limit')
  assert.ok(check < run, 'the limit is checked after the generation has already been paid for')
  assert.match(branch, /exhaustedError\(plan\.id\)/,
    'the refusal no longer uses the shared message, so it can drift from what /plans promises')
  assert.match(branch, /status\(429\)/)
})

test('the count comes back on every answer, so the meter is never a guess', () => {
  const branch = AI_CODE.slice(AI_CODE.indexOf("if (task.quota === 'generation')"))
  assert.match(branch, /generation:\s*\{[^}]*remaining:\s*0/,
    'the 429 does not carry the counts, so the UI cannot show the wall accurately')
  assert.match(AI_CODE, /generation:\s*\{\s*used:\s*used \+ 1/,
    'a successful generation does not return the new count')
  // …and the page absorbs it. A field returned and never read is the exact
  // defect ai-provider-path.test.js records about `provider`.
  assert.match(PAGE_CODE, /data\?\.generation/,
    'BrandStarter.jsx ignores the count the server returns and falls back to guessing')
})

test('the counter lives where no client can reach it, and that needed no rules change', () => {
  // firestore.rules default-denies anything it does not match, which is the
  // property daily-usage and provider-health already rely on. Rules changes are
  // founder-gated and published separately, so a change here that needed one
  // could not have shipped.
  const rules = read('firestore.rules')
  assert.doesNotMatch(rules, /daily-usage/,
    'firestore.rules now names daily-usage — the generation counter became client-reachable')
  const branch = AI_CODE.slice(AI_CODE.indexOf("if (task.quota === 'generation')"))
  assert.match(branch, /daily-usage\/\$\{uid\}_\$\{bucket\.suffix\}/,
    'the bucket moved out of daily-usage, which is the collection the rules reasoning above depends on')
})

test('the prompt is capped and floored on the SERVER, not only in the field', () => {
  const runner = AI_CODE.slice(AI_CODE.indexOf('async function runBrandStarter'))
  assert.match(runner, /MIN_PROMPT_CHARS/, 'a two-character brief would reach the provider')
  assert.match(runner, /slice\(0, MAX_PROMPT_CHARS\)/,
    'the brief is not truncated server-side — a caller could post a megabyte of input tokens')
  assert.match(runner, /status\(400\)/,
    'a too-short brief is not refused before the provider call, so it costs money and a unit')
  assert.match(runner, /maxTokens:\s*900/, 'the output ceiling is gone; a runaway answer is unbounded')
})

test('a malformed model answer is refused, and the user is told it cost nothing', () => {
  const runner = AI_CODE.slice(AI_CODE.indexOf('async function runBrandStarter'))
  assert.match(runner, /sanitizeBrandStarter\(/, 'the model answer reaches the client unvalidated')
  assert.match(runner, /parseStarterJson\(/)
  // Three refusal paths, and every one of them has to say the allowance is
  // intact — that is the only thing the user is actually worried about.
  const untouched = runner.match(/allowance is untouched/g) || []
  assert.ok(untouched.length >= 3,
    `only ${untouched.length} refusal paths tell the user their allowance survived; expected the provider `
    + 'failure, the unparseable answer and the rejected answer to all say so')
  assert.match(runner, /quotaSpent: false/)
})

test('the failover is shared with the prompt tool, so it is counted and alerted on', () => {
  // A private provider path would be a second thing that can fail silently, and
  // the whole provider-health apparatus exists because the first one did.
  const runner = AI_CODE.slice(
    AI_CODE.indexOf('async function runBrandStarter'),
    AI_CODE.indexOf('async function runGeneratePrompt'),
  )
  assert.ok(runner.length > 500, 'runBrandStarter is no longer defined before runGeneratePrompt')
  const or = runner.indexOf('await callOpenRouter(')
  const gem = runner.indexOf('await callGemini(')
  const record = runner.indexOf('recordProviderOutcome(')
  assert.ok(or > -1 && gem > -1, 'the brand starter no longer uses the shared provider race')
  assert.ok(or < gem, 'Gemini is attempted before OpenRouter — OpenRouter is the documented primary')
  assert.ok(record > or, 'the provider outcome is not recorded, so a silent failover here is invisible')
  assert.ok(record < runner.indexOf('if (!text)'),
    'the outcome is recorded after the total-failure return, so a full outage is never counted')
  // The response names the provider, the same way both prompt tools do.
  assert.match(runner, /provider:\s*servedBy/, 'the response drops the provider, so a failover is undetectable')
  assert.match(PAGE_CODE, /describeProvider\(result\?\.provider\)/,
    'the page stores the provider but never renders it — the same silence one step later')
})

test('the page is MOUNTED, on the route the tool tree advertises', () => {
  // The lesson this repository paid for with /create/color: a flag said a tool
  // was live while the route rendered a landing page. A config test that never
  // checks the mount is how that shipped.
  const tool = createTools().find((t) => t.id === 'auto-builder')
  assert.ok(tool, 'the brand starter is no longer in the tool tree')
  assert.equal(tool.soon, false, 'the tool is Soon again — the route renders the workshop state')
  assert.equal(tool.beta, true, 'the beta flag is gone, so the badge silently stops rendering')
  assert.equal(tool.group, 'ai', 'the tool left AI Studio; a brand generator is not a UI component tool')
  assert.ok(liveToolRoutes().includes(tool.route), 'the route is not in the live set')
  assert.match(CREATE_TOOL, new RegExp(`'${tool.route}':\\s*BrandStarter`),
    `CreateTool.jsx does not mount BrandStarter at ${tool.route} — the route would render the workshop state`)
  assert.match(CREATE_TOOL, /const BrandStarter = lazy\(\(\) => import\('\.\/BrandStarter'\)\)/)
})

test('the retired alpha is gone, not left behind as a second implementation', () => {
  assert.ok(!fs.existsSync(path.join(process.cwd(), 'src/pages/AutoBuilder.jsx')),
    'the dormant client-side alpha is still on disk — eslint here cannot see an unused React '
    + 'component, so a second, fake implementation of this feature would sit there indefinitely')
})

test('every artefact opens in a tool that actually renders', () => {
  // The same assertion tests/unit/brand-kit-guide.test.js makes about the
  // walkthrough's steps, and for the same reason: it is what would have caught
  // /create/color becoming a landing page underneath a flow that pointed at it.
  const live = new Set(liveToolRoutes())
  assert.equal(BRAND_STARTER_ARTEFACTS.length, 3, 'the "and more" is no longer exactly one extra artefact')
  for (const a of BRAND_STARTER_ARTEFACTS) {
    assert.ok(live.has(a.route), `${a.id} hands off to ${a.route}, which is not a live tool`)
  }
  assert.deepEqual(BRAND_STARTER_ARTEFACTS.map((a) => a.id), ['palette', 'fonts', 'typeScale'])
})

test('THE ONE THAT MATTERS FOR THE HAND-OFF: the page uses the existing slots, not a new encoding', () => {
  // A hand-built tool URL is the defect [homepage-community-points-outward]
  // records, and a hand-rolled draft would bypass the validation every
  // destination relies on.
  assert.match(PAGE_CODE, /paletteBuilderUrl\(result\.palette\.map\(\(c\) => c\.hex\)\)/,
    'the palette hand-off no longer goes through paletteBuilderUrl — a second encoding of a tool URL')
  assert.match(PAGE_CODE, /setPairDraft\(\{ heading: result\.fonts\.heading, body: result\.fonts\.body \}\)/,
    'the font hand-off no longer stages a pair draft, so Font Pair opens empty')
  assert.match(PAGE_CODE, /setScaleDraft\(\{/, 'the type scale hand-off is gone')
  assert.match(PAGE_CODE, /scale: \{ base: result\.typeScale\.base, ratio: result\.typeScale\.ratio \}/,
    'the scale draft no longer carries the generated base and ratio')
  // Both stagers are guarded, or a Ctrl/Cmd-click stages a draft in a tab that
  // never navigates and ambushes the next visit — utils/handoffSlot.js's own
  // recorded bug.
  const stagers = PAGE_CODE.match(/navigatesThisTab\(event\)/g) || []
  assert.equal(stagers.length, 2,
    `${stagers.length} of the 2 slot stagers guard against a modified click that never navigates`)
})

test('nothing is written into the user’s working design', () => {
  // The result is a suggestion. Writing straight into ProjectContext's `design`
  // would silently replace work in progress, which is the founder's own
  // "it has added many colours and it's a different swatch" in another form.
  for (const forbidden of ['setPalette', 'setFonts', 'setTypeScale', 'useProject']) {
    assert.ok(!PAGE_CODE.includes(forbidden),
      `BrandStarter.jsx calls ${forbidden} — a generator that overwrites the open project without asking`)
  }
  assert.match(PAGE_CODE, /Nothing here has been saved or applied/,
    'the page no longer says that nothing was applied, which is the question a generator has to answer')
})

test('the page requires a session and passes a REAL token', () => {
  // Metering follows the account, not the browser. A page that let an
  // anonymous caller through, or that fabricated a token, would meter nothing.
  assert.match(PAGE_CODE, /<AuthGate featureLabel="generate a brand starter">/,
    'the tool is no longer behind the auth gate')
  assert.match(PAGE_CODE, /getToken=\{\(\) => firebaseAuth\.currentUser\?\.getIdToken\(\)\}/,
    'the page no longer supplies a real Firebase ID token — the acceptance fixture’s stub would be '
    + 'the only implementation, which is the isolated-helper trap this suite exists to avoid')
  assert.match(PAGE_CODE, /Authorization: `Bearer \$\{token\}`/, 'the request is no longer authenticated')
  assert.match(PAGE_CODE, /task: 'brand-starter'/, 'the request no longer names the task')
})

// ── 6. what /plans promises ──────────────────────────────────────────────────

test('/plans derives the allowance instead of typing it', () => {
  assert.match(PLANS, /import \{[^}]*allowanceSentence[^}]*\} from '\.\.\/config\/aiGeneration'/,
    'Plans.jsx no longer imports the allowance, so its figure is prose again')
  const code = stripJs(PLANS)
  assert.match(code, /allowanceSentence\('free'\)/, 'the free row does not derive its figure')
  assert.match(code, /allowanceSentence\('pro'\)/, 'the Pro row does not derive its figure')
  assert.match(code, /Brand Starter/, 'the plans table does not mention the feature at all')
  // The beta status is disclosed where the money is, not only on the tool.
  assert.match(code, /beta-badge/, '/plans sells the Brand Starter without disclosing that it is beta')
})

test('/plans does not hard-code either number', () => {
  const code = stripJs(PLANS)
  // Scoped to the two rows rather than the whole file, because the page
  // legitimately prints other digits.
  for (const row of code.split('\n').filter((l) => l.includes('Brand Starter'))) {
    assert.ok(!new RegExp(`\\b${SERVER_PRO}\\b`).test(row),
      `a Brand Starter row types the literal ${SERVER_PRO}: ${row.trim()}`)
    assert.ok(!/once per account|a month/.test(row),
      `a Brand Starter row types the period instead of deriving it: ${row.trim()}`)
  }
})

test('the tool prints the same sentence /plans prints', () => {
  // One function, two surfaces. This is the hop that has broken twice: the page
  // and the product describing the same capability in two places.
  assert.match(PAGE_CODE, /allowanceSentence\(planId\)/,
    'the tool words its own allowance, so it can disagree with the pricing page')
  assert.match(PAGE_CODE, /exhaustedMessage\(planId, used\)/,
    'the tool words its own refusal instead of using the shared one')
})

test('the beta label is a word, not a decoration', () => {
  // The founder has called this product "AI generated" five times and a feature
  // literally about AI is where that risk peaks. A badge that decorates itself
  // is doing marketing.
  const css = read('src/styles/global.css')
  const badge = /\.beta-badge\{([^}]*)\}/.exec(css)
  assert.ok(badge, 'the beta badge has no style rule')
  for (const banned of ['gradient', 'blur', 'shadow', 'animation', 'filter']) {
    assert.ok(!badge[1].includes(banned), `.beta-badge uses ${banned} — the word is the whole treatment`)
  }
  for (const sparkle of ['✨', '⭐', 'sparkle', 'magic', 'AI magic']) {
    assert.ok(!PAGE.includes(sparkle), `BrandStarter.jsx ships "${sparkle}"`)
  }
  assert.match(PAGE_CODE, />Beta<\/span>/, 'the beta badge no longer renders on the tool')
})

test('the tool claims capacity, never a better model', () => {
  // Both plans resolve to the same provider and the same model, so "Pro gets
  // better results" would be an unbacked claim — the rule plan-limits.test.js
  // already enforces on /plans and the alt-text tool.
  const text = PAGE_CODE.toLowerCase()
  for (const claim of ['better model', 'higher-quality model', 'smarter', 'more powerful', 'best-in-class']) {
    assert.ok(!text.includes(claim), `BrandStarter.jsx claims Pro buys "${claim}"`)
  }
  // …and none of the marketing vocabulary the anti-slop bar names.
  for (const slop of ['effortless', 'supercharge', 'reimagine', 'seamless', 'cutting-edge', 'unleash']) {
    assert.ok(!text.includes(slop), `BrandStarter.jsx ships the word "${slop}"`)
  }
})

test('every state a person can land in is written down', () => {
  // Loading, empty, error, quota-exhausted and offline ARE the feature. A
  // rendered spec proves they appear; this proves they were not deleted from
  // the source in a refactor that kept the happy path green.
  const required = [
    ['brand-starter-working', 'the loading state'],
    ['brand-starter-error', 'the error state'],
    ['brand-starter-wall', 'the quota-exhausted state'],
    ['brand-starter-offline', 'the offline state'],
    ['brand-starter-allowance', 'the allowance meter'],
    ['brand-starter-result', 'the result'],
  ]
  for (const [hook, what] of required) {
    assert.ok(PAGE.includes(`data-testid="${hook}"`), `${what} has no stable hook, or is gone`)
  }
  assert.match(PAGE_CODE, /useOnline\(\)/, 'the page no longer knows whether the browser is offline')
  assert.match(PAGE_CODE, /role="alert"/, 'the error is not announced to assistive technology')
})
