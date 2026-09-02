// A bug report has to say where the user was.
//
// docs/PROPOSALS.md P-002 (APPROVED): "When a tool misbehaves, a user's only
// options are to leave or to email. Most leave. We then learn nothing, and
// silent churn leaves no review — so the absence of complaints reads, wrongly,
// as satisfaction."
//
// A feedback modal already existed and was reachable everywhere. What it did
// not do was record WHERE. Every report arrived as free text with no route, no
// tool and no state, so acting on one began with "which page were you on?" —
// and most people never reply to that. The proposal names this as the
// mitigation for low-quality volume too: capture the context so the user need
// not describe it.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  buildReportContext, formatReportContext, withReportContext,
  contextRows, omitContext, CONTEXT_FIELDS,
} from '../../src/utils/reportContext.js'

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8')

// ── What it captures ────────────────────────────────────────────────────────

test('a report records the route, tool, viewport, plan and sign-in state', () => {
  const c = buildReportContext({
    pathname: '/create/palette',
    tool: 'Palette Generator',
    viewport: { width: 1440, height: 900 },
    plan: 'free',
    signedIn: true,
  })
  assert.equal(c.route, '/create/palette')
  assert.equal(c.tool, 'Palette Generator')
  assert.equal(c.viewport, '1440x900')
  assert.equal(c.plan, 'free')
  assert.equal(c.signedIn, 'yes')
})

test('missing facts are omitted rather than guessed', () => {
  const c = buildReportContext({ pathname: '/create/icons' })
  assert.deepEqual(Object.keys(c), ['route'])
  assert.equal(c.tool, undefined)
})

test('a report with no route at all still says something', () => {
  assert.equal(buildReportContext({}).route, '/')
  assert.equal(buildReportContext().route, '/')
})

// ── What it deliberately does NOT capture ───────────────────────────────────

test('the query string is dropped, because the colour tools encode work into it', () => {
  // /create/palette?c=0051FF,4C8DFF,... carries the user's actual palette.
  // Keeping the query would smuggle their work into a support inbox through
  // the URL, which is exactly what the no-content rule exists to prevent.
  const c = buildReportContext({ pathname: '/create/palette?c=0051FF,4C8DFF,A9C7FF' })
  assert.equal(c.route, '/create/palette')
  assert.ok(!JSON.stringify(c).includes('0051FF'))
})

test('the hash is dropped too', () => {
  assert.equal(buildReportContext({ pathname: '/help#billing' }).route, '/help')
})

test('nothing in the module reaches for the user\'s content', () => {
  // A bug report is not consent to send someone's work, and a support inbox is
  // a much weaker place to hold it than the user's own browser.
  const src = read('src/utils/reportContext.js')
  for (const forbidden of ['localStorage', 'sessionStorage', 'document.cookie']) {
    assert.ok(!new RegExp(`\b${forbidden}\b`).test(src.replace(/\/\/.*$/gm, '')),
      `reportContext must not read ${forbidden}`)
  }
})

test('every captured value is length-capped', () => {
  const c = buildReportContext({ pathname: '/x', tool: 'T'.repeat(500), plan: 'p'.repeat(500) })
  assert.ok(c.tool.length <= 60)
  assert.ok(c.plan.length <= 60)
})

// ── How it is attached ──────────────────────────────────────────────────────

test('the context is clearly separated from the user\'s own words', () => {
  const out = withReportContext('The sliders jump.', { route: '/create/palette' })
  assert.match(out, /^The sliders jump\./)
  assert.match(out, /--- captured automatically ---/)
  assert.match(out, /route: \/create\/palette/)
})

test('a long message is truncated so the context always survives', () => {
  // A report that loses its route because someone wrote a long description is
  // the exact failure this exists to prevent.
  const out = withReportContext('x'.repeat(9000), { route: '/create/type-scale' }, 5000)
  assert.ok(out.length <= 5000, `${out.length} exceeds the server's limit`)
  assert.match(out, /route: \/create\/type-scale/, 'the context must survive truncation')
})

test('an empty context adds nothing', () => {
  assert.equal(withReportContext('hello', {}), 'hello')
  assert.equal(formatReportContext(null), '')
})

// ── The wiring ──────────────────────────────────────────────────────────────

test('the modal sends a source the server actually accepts', () => {
  // It sent 'feedback-modal', which is not in api/support.js's VALID_SOURCES,
  // so the server silently replaced it with 'feedback-form' — every report from
  // the modal has been mislabelled as coming from the /feedback page.
  const api = read('api/support.js')
  const valid = /const VALID_SOURCES = \[([^\]]*)\]/.exec(api)?.[1] || ''
  const modal = read('src/components/FeedbackModal.jsx')
  const source = /source: '([^']+)'/.exec(modal)?.[1]
  assert.ok(source, 'the modal must set a source')
  assert.ok(valid.includes(`'${source}'`),
    `the modal sends source '${source}', which api/support.js will discard (accepts: ${valid.trim()})`)
})

test('context rides in an existing field, so no API change was needed', () => {
  // api/support.js destructures a fixed set of fields and drops anything else,
  // and /api is a Human Validation Zone. Folding the context into `message`
  // makes the proposal's "no new backend if the existing support path can carry
  // it" literally true — no route change, no rules change, nothing to review.
  const modal = read('src/components/FeedbackModal.jsx')
  assert.match(modal, /message: withReportContext\(/)
  const api = read('api/support.js')
  assert.match(api, /const \{ type, subject, message, email, source \} = req\.body/,
    'the server contract must be unchanged')
})

// ── The right-click capture (backlog `right-click-feedback`) ────────────────
//
// Founder request 2026-09-02: open feedback with the details PREFILLED, so a
// report is easy to find and replicate. The note is explicit that "PRIVACY IS
// PART OF THE TASK, not an afterthought: show the user exactly what is
// attached before they send, and let them remove any of it". These tests hold
// both halves — what may be captured, and that removal is real rather than
// cosmetic.

test('a right-click report adds the element, theme, motion and build', () => {
  const c = buildReportContext({
    pathname: '/create/icons',
    element: 'button.plb-add',
    theme: 'dark',
    reducedMotion: true,
    appVersion: '2.8.1',
    viewport: { width: 390, height: 844 },
    pixelRatio: 3,
  })
  assert.equal(c.element, 'button.plb-add')
  assert.equal(c.theme, 'dark')
  assert.equal(c.motion, 'reduced')
  assert.equal(c.build, '2.8.1')
  assert.equal(c.viewport, '390x844 @3x')
})

test('reduced motion being OFF is still recorded', () => {
  // "motion: full" is what rules the setting out as a cause. A field that only
  // appears sometimes is one a triager learns to distrust.
  assert.equal(buildReportContext({ pathname: '/', reducedMotion: false }).motion, 'full')
})

test('a 1x display adds no scale noise', () => {
  assert.equal(
    buildReportContext({ pathname: '/', viewport: { width: 1440, height: 900 }, pixelRatio: 1 }).viewport,
    '1440x900',
  )
})

test('every field the builder can emit is one the user is shown', () => {
  // The anti-drift test, and the one that actually enforces the privacy
  // promise. CONTEXT_FIELDS is what the disclosure panel renders; if a future
  // change starts capturing something that is not in that list, it would be
  // sent without ever appearing in front of the user. That must fail here.
  const everything = buildReportContext({
    pathname: '/create/palette', tool: 'Palette', element: 'button.x',
    viewport: { width: 1, height: 1 }, pixelRatio: 2, theme: 'light',
    reducedMotion: false, plan: 'pro', signedIn: true, appVersion: '9.9.9',
  })
  const declared = new Set(CONTEXT_FIELDS.map(f => f.key))
  for (const key of Object.keys(everything)) {
    assert.ok(declared.has(key), `'${key}' is captured but never shown to the user`)
  }
})

test('every shown field has plain-language wording, not a variable name', () => {
  // Someone deciding whether to send this should not have to be a developer to
  // know what they are agreeing to.
  for (const f of CONTEXT_FIELDS) {
    assert.ok(f.label && f.label.length > 3, `${f.key} needs a human label`)
    assert.notEqual(f.label, f.key)
  }
})

test('the rows shown are the canonical order, skipping what was not captured', () => {
  const rows = contextRows(buildReportContext({ pathname: '/help', theme: 'dark' }))
  assert.deepEqual(rows.map(r => r.key), ['route', 'theme'])
  assert.equal(rows[0].label, 'Page you were on')
  assert.equal(rows[0].value, '/help')
})

test('unticking a row genuinely drops it from what is sent', () => {
  // Not "hidden from the panel". A control that only appears to remove
  // something is worse than no control at all.
  const full = buildReportContext({ pathname: '/create/palette', element: 'button.plb-add', theme: 'dark' })
  const kept = omitContext(full, ['element', 'theme'])
  assert.deepEqual(Object.keys(kept), ['route'])
  const out = withReportContext('It jumps.', kept)
  assert.ok(!out.includes('plb-add'), 'a removed value must not reach the message')
  assert.ok(!out.includes('dark'))
  assert.match(out, /route: \/create\/palette/)
})

test('removing everything leaves the user\'s own words untouched', () => {
  const out = withReportContext('Just this.', omitContext({ route: '/x' }, ['route']))
  assert.equal(out, 'Just this.')
})

test('the attached block reads in the same order however it was built', () => {
  // Two reports of the same bug should be eyeballable side by side.
  const block = formatReportContext({ build: '1.0.0', route: '/a', element: 'button.x' })
  assert.ok(block.indexOf('route:') < block.indexOf('element:'), 'route leads')
  assert.ok(block.indexOf('element:') < block.indexOf('build:'), 'build trails')
})

// ── The wiring ──────────────────────────────────────────────────────────────

test('the modal filters the capture through omitContext before sending', () => {
  // The whole privacy contract rests on this one call site: it is the only
  // point where anything leaves the browser.
  const modal = read('src/components/FeedbackModal.jsx')
  assert.match(modal, /withReportContext\(message\.trim\(\), omitContext\(capture, removed\)\)/,
    'the send path must apply the removals')
})

test('the modal renders a row for every captured fact', () => {
  // Shown, not merely available. `contextRows` is the same source the sender
  // uses, so the panel cannot list one set of facts while another is sent.
  const modal = read('src/components/FeedbackModal.jsx')
  assert.match(modal, /contextRows\(capture\)/)
  assert.match(modal, /rows\.map\(/)
})

test('there is still exactly one feedback pipeline', () => {
  // The backlog note: "two ways to report that store differently is how a
  // feedback queue stops being trusted". The right-click menu must not build
  // its own payload — it hands a seed to the one modal and stops there.
  const menu = read('src/components/FeedbackContextMenu.jsx')
  assert.ok(!/fetch\(/.test(menu), 'the menu must not talk to the API itself')
  assert.ok(!/saveFeedback/.test(menu), 'the menu must not write to the store itself')
  const button = read('src/components/FeedbackButton.jsx')
  assert.equal((button.match(/<FeedbackModal/g) || []).length, 1,
    'both entry points must share one modal instance')
})
