// NOTHING ON THE ADMIN DASHBOARD IS A READING OF THE FOUNDER'S OWN BROWSER.
//
// ═══════════════════════════════════════════════════════════════════════════
// THE INSTRUCTION AND WHAT IT WAS ABOUT
// ═══════════════════════════════════════════════════════════════════════════
// 2026-09-16, verbatim: "this admin dashboard get remove alot of shit it does
// not need such as data from my specific browser window".
//
// The dashboard's largest figures — "Page Views", "Sessions", "Bounce Rate",
// "Avg Duration", across a Today / 7 days / 30 days / All time selector — were
// `localStorage.getItem('vs-analytics')` on the machine the dashboard happened
// to be open on. They were badged "This device only · not site-wide" and the
// badge did not fix it: a four-figure "Page views" reads as traffic, and a grey
// caption under it reads as a footnote.
//
// Two more tabs were the same thing without the badge:
//
//   Pages   Most Visited Pages, Bounce Rate by Entry Page, Top Exit Pages,
//           Top Entry Pages — every one from getAnalyticsSummary(), which is
//           the same localStorage blob.
//   Design  Most Copied Fonts, Most Picked Colours, Tool Usage — from
//           getDesignAnalytics(), a second localStorage blob. Its two icon
//           cards preferred the cross-user aggregate and fell back to that
//           blob, so the SAME card was site-wide or one-browser depending on
//           whether the server had answered.
//
// ═══════════════════════════════════════════════════════════════════════════
// WHAT THIS FILE GUARDS, AND WHY IT IS AN IMPORT CHECK
// ═══════════════════════════════════════════════════════════════════════════
// A test that looked for the badge, or for the words "this device", would go
// green the moment someone deleted the badge and kept the numbers — which is
// the wrong half. The property that matters is upstream of any rendering: the
// page must not be able to READ this browser's analytics at all.
//
// src/utils/analytics.js has exactly one cross-user reader,
// getAggregateAnalytics(), which sums the `analytics-daily` documents every
// signed-in session writes. Every other reader it exports is localStorage. So
// the guard is the import list, and it is checked against the module's real
// exports rather than a list typed here — a new localStorage reader added to
// analytics.js is covered the day it is written.
//
// getAnalyticsSummary() is the one allowed exception and it is narrow: the
// Users tab uses `summary.users`, the profile cache, as the fallback it
// renders when the server user list cannot be read, under a line that says
// "This browser only · profile cache". A labelled fallback is not a headline.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8')
const ADMIN = read('src/pages/Admin.jsx')
const ANALYTICS = read('src/utils/analytics.js')

/** Strip comments, so a note ABOUT a reader is not read as a call to one. */
const stripComments = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '')
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')

const CODE = stripComments(ADMIN)

// The names Admin.jsx imports from utils/analytics, read out of the import
// statement rather than assumed.
const importedFromAnalytics = () => {
  const m = CODE.match(/import\s*\{([^}]*)\}\s*from\s*'\.\.\/utils\/analytics'/)
  assert.ok(m, 'Admin.jsx no longer imports from utils/analytics by that path — this test is reading nothing')
  return m[1].split(',').map(s => s.trim()).filter(Boolean)
}

// Every reader utils/analytics exports, split by what it reads.
const SITE_WIDE = new Set(['getAggregateAnalytics'])
// ── THE TWO LOCAL READERS THAT MAY STAY, AND WHY EACH ONE MAY ─────────────
// An entry here is a decision with a reason attached, not an exemption. Both
// of these render under a line that states where the rows came from, which is
// the property the badged-but-uncorrected traffic band did NOT have: it said
// the scope in a caption and then printed the figure as a headline.
//
//   getAnalyticsSummary  the Users tab's fallback when the server list cannot
//                        be read, under "This browser only · profile cache".
//                        Only `summary.users` is used; the test below pins
//                        that down field by field.
//   getFeedback          the Submissions queue merges this browser's copy with
//                        the Firestore one and prints the split — "N from the
//                        server · M from this browser" — as its own line, with
//                        a separate branch for a read that was REFUSED. The
//                        local rows here are real reports somebody filed, not
//                        a sample of one browser's behaviour.
const ALLOWED_LOCAL = new Set(['getAnalyticsSummary', 'getFeedback'])

const exportedReaders = () => [...ANALYTICS.matchAll(/export\s+(?:async\s+)?function\s+(get\w+)/g)].map(m => m[1])

test('CONTROL: utils/analytics still has exactly one cross-user reader', () => {
  const readers = exportedReaders()
  assert.ok(readers.length >= 4,
    `only ${readers.length} readers found in utils/analytics — the matcher is wrong and every assertion below is free`)
  for (const name of SITE_WIDE) {
    assert.ok(readers.includes(name), `${name} is gone from utils/analytics, so "site-wide" now means nothing here`)
  }
  // The blobs are still there and still local — if they had been deleted
  // outright, this whole file would be guarding an absence that cannot recur.
  assert.match(ANALYTICS, /localStorage\.getItem/,
    'utils/analytics no longer touches localStorage at all, so this guard has no subject')
})

test('no headline on the dashboard is read out of this browser', () => {
  const imported = importedFromAnalytics()
  const offenders = imported.filter(name => (
    name.startsWith('get') && !SITE_WIDE.has(name) && !ALLOWED_LOCAL.has(name)
  ))
  assert.deepEqual(offenders, [],
    'src/pages/Admin.jsx imports a reader that returns THIS BROWSER\'S localStorage: '
    + `${offenders.join(', ')}. The founder asked for "data from my specific browser window" to come `
    + 'off this dashboard on 2026-09-16. If a new reader genuinely belongs here, it has to be a '
    + 'cross-user one — or be rendered as a labelled fallback the way getAnalyticsSummary is, and '
    + 'added to ALLOWED_LOCAL with the reason.')
  // And it is not reached around the import either.
  for (const banned of ['getPageViews', 'getSessions', 'getDesignAnalytics']) {
    assert.ok(!CODE.includes(`${banned}(`),
      `${banned}() is called in Admin.jsx, so the numbers are this browser's again`)
  }
})

test('the one local reader that is allowed is only ever the Users fallback', () => {
  // getAnalyticsSummary() may stay, but only for `summary.users`. If the page
  // starts rendering its view counts, its bounce rates or its top pages again,
  // the exception has stopped being an exception.
  assert.ok(CODE.includes('setData(getAnalyticsSummary())'),
    'getAnalyticsSummary is imported but no longer the one call this exception was granted for')
  for (const field of ['data.topPages', 'data.bounceByPage', 'data.topExitPages', 'data.topEntryPages',
    'data.totalViews', 'data.totalSessions', 'data.viewsToday', 'data.viewsWeek']) {
    assert.ok(!CODE.includes(field),
      `Admin.jsx renders ${field}, which is a figure from this browser's localStorage`)
  }
  assert.ok(CODE.includes('data.users'),
    'the exception was granted for the Users tab fallback and that is no longer what it is used for — '
    + 'drop the import instead')
})

test('the four tabs the founder had removed are gone, and stay gone', () => {
  const m = CODE.match(/const TABS = \[([\s\S]*?)\n\]/)
  assert.ok(m, 'the TABS array is gone or reshaped — this test is reading nothing')
  const ids = [...m[1].matchAll(/id:\s*'([^']+)'/g)].map(x => x[1])
  assert.ok(ids.length >= 5, `only ${ids.length} tabs parsed — the matcher is wrong`)
  for (const dead of ['pipeline', 'board', 'design', 'pages']) {
    assert.ok(!ids.includes(dead),
      `the "${dead}" tab is back. Pipeline and Board render nothing in any deployment — their data has `
      + 'been local-only since 2026-09-16 — and Design and Pages were both readings of one browser. '
      + 'The founder asked for the pipeline to go and for the browser-local data to go with it.')
  }
  // The positive half: the tabs that stayed are the ones that had a source
  // capable of answering them, and Overview is still first because the route
  // opens on it.
  assert.deepEqual(ids, ['overview', 'users', 'submissions', 'community', 'prompts', 'stripe'],
    'the tab set changed. Adding one is fine; this assertion exists so that it is a decision rather '
    + 'than a drift, and so the order Overview-first survives (tests/user-sim/57 opens on it).')
  // And each id must actually have a branch, or the tab is a dead button.
  for (const id of ids) {
    assert.ok(CODE.includes(`tab === '${id}'`), `the "${id}" tab is in the bar and renders nothing`)
  }
})

test('the Plan column reads the shared module rather than a two-way expression of its own', () => {
  // The original defect was one line of inline arithmetic:
  //   plan: status === 'active' || status === 'trialing' ? 'pro' : 'free'
  // A perfect utils/adminUsers.js that Admin.jsx does not call would leave that
  // line exactly where it was.
  assert.match(CODE, /from '\.\.\/utils\/adminUsers'/, 'Admin.jsx no longer reads the plan-state module')
  assert.match(CODE, /planState: planStateOf\(u\.subscription\)/,
    'the row no longer derives its plan state from planStateOf()')
  assert.ok(!/'active'\s*\|\|\s*\w+\s*===\s*'trialing'/.test(CODE),
    'the two-way pro/free expression is back in Admin.jsx, so past_due collapses into "Free" again')
  assert.ok(!CODE.includes('adm-plan-free') && !CODE.includes('adm-plan-pro'),
    'the pro/free badge pair is back, which is the rendering half of the same collapse')
})

test('the analytics reset says what it reaches before it is run', () => {
  // resetPageAnalytics() deletes the `views` field and every `view__<path>`
  // field from up to 400 documents in `analytics-daily` — the shared record,
  // for every administrator, with no backup. It was confirmed by the words
  // "Wipe page views? Yes / No", which describes a local button.
  assert.ok(CODE.includes('confirmPageReset'), 'the reset no longer asks at all')
  const start = CODE.indexOf('Reset page analytics for everyone?')
  assert.ok(start > -1,
    'the reset confirmation no longer says that it reaches every administrator rather than this browser')
  const panel = CODE.slice(start, start + 1200)
  assert.match(panel, /analytics-daily/, 'the confirmation does not name what it writes to')
  assert.match(panel, /no undo/i, 'the confirmation does not say the deletion is irreversible')
  assert.match(panel, /Top Tools|tool, icon/i,
    'the confirmation does not say what SURVIVES, which is half of what the reader needs to decide')
})
