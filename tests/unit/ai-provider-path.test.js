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
  // Asserted per task rather than by counting matches: a count would have to be
  // bumped by hand every time a task is added, which is the drift this repo just
  // finished removing from its gate doc.
  const src = ai()
  const configuredFor = (name) => {
    const at = src.indexOf(`'${name}': {`)
    assert.ok(at > -1, `api/ai.js no longer registers the '${name}' task`)
    const block = src.slice(at, src.indexOf('\n  },', at))
    const hit = block.match(/configured:\s*\(\)\s*=>\s*(.+),/)
    assert.ok(hit, `'${name}' declares no configured() guard`)
    return hit[1].trim()
  }
  assert.equal(configuredFor('generate-prompt'), 'Boolean(OPENROUTER_KEY || GEMINI_KEY)',
    'generate-prompt no longer accepts either provider — an OpenRouter outage would take the tool down')
  for (const vision of ['alt-text', 'scan-photo']) {
    assert.equal(configuredFor(vision), 'Boolean(GEMINI_KEY)',
      `'${vision}' is a Gemini vision task and must require GEMINI_KEY`)
  }
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

// ── the failover stops being invisible ───────────────────────────────────────
//
// Everything above pins that the DISTINCTION exists — that a response says which
// provider served it. None of it pins that anyone ever finds out. Until now the
// answer to "would an operator who is not looking at devtools discover, within a
// day, that every generation is coming from the fallback?" was no, and had been
// no since August.
//
// Three surfaces now say so, and each is guarded here: the badge on the result
// in both prompt tools, the durable per-day counters, and the verdict on the
// admin diagnostic. This file rather than api-abuse-hardening.test.js because
// this is the provider-path class, not the abuse class — the hardening file
// exists for surfaces reachable without credentials, and none of this is.

const {
  buildProviderHealthPatch,
  summariseProviderHealth,
} = await import('../../api/ai.js')
const { describeProvider, providerBadgeStyle } = await import('../../src/utils/aiProvider.js')

// Comments stripped, for the reason the top of this file already gives: these
// files EXPLAIN the failover at length, and an assertion that matched the
// explanation would stay green while guarding nothing. Caught in the act —
// swapping the admin fetch to a different endpoint left this suite green,
// because the comment above the fetch still named the old URL.
const srcFile = (f) => stripJs(fs.readFileSync(path.join(process.cwd(), 'src', f), 'utf8'))

// ── the badge ────────────────────────────────────────────────────────────────

test('the two providers are visually distinguishable, or the badge proves nothing', () => {
  const primary = describeProvider('openrouter')
  const fallback = describeProvider('gemini')
  assert.equal(primary.fallback, false, 'the primary provider is labelled as a fallback')
  assert.equal(fallback.fallback, true, 'the Gemini fallback is not marked as one — it would read as the healthy state')
  assert.notEqual(primary.label, fallback.label,
    'both providers render the same text, so the badge cannot tell a healthy OpenRouter from a dead one')
  assert.match(fallback.label, /fallback/i,
    'the fallback badge does not say it is a fallback — "Gemini" alone means nothing to anyone who does not know the architecture')
  assert.notEqual(
    providerBadgeStyle(primary).color, providerBadgeStyle(fallback).color,
    'the healthy and failed states are the same colour — the badge would have to be read to be noticed')
})

test('an unrecognised provider fails loud, and a missing one renders nothing', () => {
  // If the server ever reports a third provider, treating the unknown name as
  // healthy would reinstate exactly the silence this item removed.
  const odd = describeProvider('some-new-gateway')
  assert.equal(odd.fallback, true, 'an unrecognised provider is presented as the healthy primary')
  assert.match(odd.label, /some-new-gateway/, 'the unrecognised provider name is hidden from the operator')
  for (const empty of [null, undefined, '', 0, {}]) {
    assert.equal(describeProvider(empty), null,
      'an absent provider produces a badge anyway, which would invent a status that was never reported')
  }
})

test('THE ONE THAT MATTERS: both prompt tools keep `provider` and render it', () => {
  // Both pages used to destructure data.prompt and data.platform and drop
  // data.provider on the floor. That single omission is what made a dead
  // OpenRouter invisible everywhere except a devtools Network tab.
  for (const page of ['pages/AiPromptGenerator.jsx', 'pages/LandingPromptGenerator.jsx']) {
    const src = srcFile(page)
    assert.match(src, /provider:\s*data\.provider/,
      `${page} drops data.provider off the response again — the failover is invisible on this page`)
    assert.match(src, /describeProvider\(r\.provider\)/,
      `${page} stores the provider but never renders it, which is the same silence one step later`)
    assert.match(src, /data-testid="ai-provider-badge"/,
      `${page} renders the provider without a stable hook to find it by`)
  }
})

// ── the durable counters ─────────────────────────────────────────────────────

const INC = Symbol('FieldValue.increment(1)')
const NOW = '2026-09-03T10:00:00.000Z'

test('a failover is COUNTED, not just logged into a log nobody reads', () => {
  const patch = buildProviderHealthPatch(
    { openrouterFailed: Object.assign(new Error('OpenRouter 401'), { status: 401 }), geminiFailed: null, served: 'gemini' },
    INC, NOW,
  )
  assert.equal(patch.openrouterFail, INC, 'the OpenRouter failure is not counted')
  assert.equal(patch.geminiOk, INC, 'the fallback generation is not counted, so the two cannot be compared')
  assert.equal(patch.openrouterOk, undefined, 'a failed OpenRouter call was counted as a success')
  assert.equal(patch.lastFailoverStatus, '401', 'the HTTP status is lost — 401 vs 429 is wrong-key vs out-of-credit')
  assert.equal(patch.lastFailoverServedBy, 'gemini')
  assert.ok(patch.lastFailoverAt, 'a failover with no timestamp cannot be aged')
})

test('a healthy generation is counted too, or a rate can never be computed', () => {
  const patch = buildProviderHealthPatch({ openrouterFailed: null, geminiFailed: null, served: 'openrouter' }, INC, NOW)
  assert.equal(patch.openrouterOk, INC)
  assert.equal(patch.openrouterFail, undefined)
  assert.equal(patch.noProvider, undefined)
  assert.equal(patch.lastFailoverAt, undefined, 'a successful call stamped a failover time')
})

test('a TOTAL outage is counted as its own thing', () => {
  // Both providers down is the case worth waking someone for, and it is also the
  // path that returns early — so it is the one most easily left uncounted.
  const patch = buildProviderHealthPatch(
    { openrouterFailed: new Error('OpenRouter 500'), geminiFailed: new Error('Gemini 503'), served: '' },
    INC, NOW,
  )
  assert.equal(patch.noProvider, INC, 'a request that no provider served was not recorded as an outage')
  assert.equal(patch.openrouterFail, INC)
  assert.equal(patch.geminiFail, INC)
  assert.equal(patch.lastFailoverServedBy, 'nothing')
})

test('the counter never persists the provider response body', () => {
  // err.detail is the raw upstream body. Gateways have echoed the offending key
  // back inside one, and a health counter is not worth writing a credential into
  // Firestore for.
  const err = Object.assign(new Error('OpenRouter 401'), { status: 401, detail: '{"error":"invalid key sk-or-v1-SECRET"}' })
  const patch = buildProviderHealthPatch({ openrouterFailed: err, geminiFailed: null, served: 'gemini' }, INC, NOW)
  const written = JSON.stringify(patch)
  assert.doesNotMatch(written, /sk-or-v1-SECRET/, 'the raw provider response body is being written to Firestore')
  assert.ok(!('lastFailoverDetail' in patch), 'err.detail is persisted verbatim')
})

test('the counters live where no client can reach them, and that needed no rules change', () => {
  // firestore.rules default-denies anything it does not match, which is the same
  // property daily-usage relies on. If a future rules edit ever names this
  // collection, the counters stop being admin-only and this fails.
  const rules = fs.readFileSync(path.join(process.cwd(), 'firestore.rules'), 'utf8')
  assert.doesNotMatch(rules, /provider-health/,
    'firestore.rules now matches provider-health — the counters are reachable from a client')
  assert.match(ai(), /const PROVIDER_HEALTH = 'provider-health'/,
    'the health collection was renamed without updating the rules reasoning above')
})

test('the outcome is recorded BEFORE the error returns, so an outage is not lost', () => {
  const body = generatePromptBody()
  const record = body.indexOf('recordProviderOutcome(')
  const bail = body.indexOf('if (!prompt) {')
  assert.ok(record > -1, 'nothing records what the providers did — the failover is back to being log-only')
  assert.ok(bail > -1, 'the total-failure branch is gone')
  assert.ok(record < bail,
    'the outcome is recorded after the total-failure return, so a full outage — the case most worth alerting on — is never counted')
})

// ── the verdict an operator reads ────────────────────────────────────────────

const day = (date, data) => ({ date, data })

test('a week of clean traffic reads as ok', () => {
  const v = summariseProviderHealth([day('2026-09-03', { openrouterOk: 12 }), day('2026-09-02', { openrouterOk: 8 })])
  assert.equal(v.status, 'ok')
  assert.equal(v.totals.openrouterOk, 20)
  assert.match(v.summary, /20/)
})

test('THE ONE THAT MATTERS: a dead primary reads as failing, in words that say what happened', () => {
  const v = summariseProviderHealth([
    day('2026-09-03', { openrouterFail: 9, geminiOk: 9, lastFailoverAt: '2026-09-03T09:00:00.000Z', lastFailoverStatus: '401' }),
    day('2026-09-02', { openrouterFail: 4, geminiOk: 4, lastFailoverAt: '2026-09-02T09:00:00.000Z', lastFailoverStatus: '401' }),
  ])
  assert.equal(v.status, 'failing',
    'every generation came from the fallback and the panel does not call that a failure')
  assert.match(v.summary, /EVERY generation came from the Gemini fallback/,
    'the verdict does not say the thing an operator has to understand: the app looked fine the whole time')
  assert.equal(v.lastFailover.at, '2026-09-03T09:00:00.000Z', 'the most recent failover is not the one reported')
  assert.equal(v.lastFailover.status, '401')
})

test('SILENCE IS NOT HEALTH: no traffic must never read as a pass', () => {
  // This is the exact trap the previous owner action fell into — "set (73
  // chars)" was read as "available" and a check that never ran was recorded as
  // a pass. An empty week must say so in as many words.
  const v = summariseProviderHealth([day('2026-09-03', {}), day('2026-09-02', null)])
  assert.equal(v.status, 'no-data', 'an untested week is being reported as healthy')
  assert.notEqual(v.status, 'ok')
  assert.match(v.summary, /not a pass/i,
    'the empty verdict does not warn that it proves nothing, so it will be read as a pass')
})

test('an intermittent primary is degraded, not ok and not failing', () => {
  const v = summariseProviderHealth([day('2026-09-03', { openrouterOk: 7, openrouterFail: 3, geminiOk: 3 })])
  assert.equal(v.status, 'degraded')
  assert.match(v.summary, /3 of 10/)
})

test('the panel says out loud when nothing will come and find the operator', () => {
  // Counters only work if someone looks. Whether anyone is TOLD depends on an
  // env pair the founder has to provision, so the absence is stated rather than
  // left as an empty field that reads like "fine".
  const off = summariseProviderHealth([day('2026-09-03', { openrouterOk: 1 })], { alerting: false })
  assert.match(off.alerting, /^OFF/, 'an unprovisioned alert path is not flagged as off')
  assert.match(off.alerting, /RESEND_API_KEY/, 'the panel does not name what has to be set')
  assert.match(off.alerting, /SUPPORT_NOTIFY_EMAIL/)
  const on = summariseProviderHealth([day('2026-09-03', { openrouterOk: 1 })], { alerting: true })
  assert.match(on.alerting, /^on/)
})

// ── the admin surface ────────────────────────────────────────────────────────

test('the health verdict rides on the admin diagnostic, behind the gate it already has', () => {
  // /api holds twelve route files and the Vercel limit on this plan is twelve,
  // so a health endpoint of its own is not available even in principle. The diag
  // GET is already gated on a verified administrator, which is the precedent.
  const src = ai()
  assert.match(src, /providerHealth:\s*await readProviderHealth\(\)/,
    'the diagnostic no longer returns the provider health block')
  const gate = src.indexOf('requireAdmin(req)')
  const health = src.indexOf('providerHealth:')
  assert.ok(gate > -1 && gate < health,
    'the health block is returned before the admin gate runs — it would be readable by anyone')
  const routes = fs.readdirSync(path.join(process.cwd(), 'api')).filter(f => f.endsWith('.js'))
  assert.ok(routes.length <= 12,
    `/api holds ${routes.length} route files and Vercel allows 12 on this plan — a route was added, not reused`)
})

test('the Admin overview renders the verdict, and never on a page a non-admin can load', () => {
  const admin = srcFile('pages/Admin.jsx')
  assert.match(admin, /\/api\/ai\?diag=1/, 'the admin page no longer reads the diagnostic')
  assert.match(admin, /AI provider health/, 'there is no provider-health card on the admin page')
  assert.match(admin, /isAdminUser \|\| tab !== 'overview'/,
    'the diagnostic is fetched without checking the viewer is the admin, or on every tab')
  assert.match(admin, /aiHealth\.summary/, 'the card shows a status light with no sentence explaining it')
})

test('the alert is opt-in, deduplicated, and cannot fire twice in a day', () => {
  const src = ai()
  assert.match(src, /RESEND_API_KEY/, 'the alert path is gone')
  assert.match(src, /SUPPORT_NOTIFY_EMAIL/)
  assert.match(src, /if \(!resendKey \|\| !notifyEmail\) return/,
    'an unprovisioned alert path throws or sends nowhere instead of staying silent')
  assert.match(src, /alert-\$\{date\}`\)\.create\(/,
    'the once-a-day marker no longer uses create(), so a provider outage would send one email per request')
})
