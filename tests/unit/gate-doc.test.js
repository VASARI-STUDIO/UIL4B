// docs/reference/build-and-verify.md is the single source of truth for what the
// gate requires, and for four years' worth of agents it is the FIRST thing read
// when a run looks wrong. That gives it an unusual property: a false statement
// in it does not merely fail to help, it actively manufactures a NO-GO.
//
// WHAT THIS GUARDS. The gate table used to hardcode exact test totals, and it
// drifted four separate times — 269/25, a projection of 520/240, 571/291 while
// the tree held 659/355, and 24 Firestore-rules tests while the file declared
// thirty-seven. Every one of those was found by accident, because NOTHING FAILS
// when a hand-maintained number goes stale. The counts are gone and the gate is
// stated as a property instead; these tests are the feedback loop that a
// convention never was.
//
// They assert the SHAPE of the gate, in both directions:
//   - nobody reintroduces a test total (the drift comes back), and
//   - nobody quietly drops a pass condition (the gate gets weaker).
//
// Everything below the doc's "## History" divider is a dated record of a past
// commit — "moved unit 457 → 484" — which cannot go stale and is deliberately
// out of scope here.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8')

const DOC = 'docs/reference/build-and-verify.md'
const SUITE_README = 'tests/user-sim/README.md'

// The live part of the doc: everything a reader is meant to check a run against.
function liveGateDoc() {
  const doc = read(DOC)
  const end = doc.indexOf('\n## History')
  assert.ok(end > -1,
    `${DOC} must keep its "## History" divider — it is the only thing separating the live gate from dated records that are allowed to hold numbers`)
  return doc.slice(0, end)
}

// The gate table itself, as { gate, command, condition } rows.
function gateRows() {
  const lines = liveGateDoc().split('\n')
  const head = lines.findIndex((l) => l.startsWith('| Gate | Command |'))
  assert.ok(head > -1, `${DOC} must state the gate as a table headed "| Gate | Command | ..."`)
  const rows = []
  for (const line of lines.slice(head + 2)) {
    if (!line.startsWith('|')) break
    const cells = line.split('|').slice(1, -1).map((c) => c.trim())
    rows.push({ gate: cells[0], command: cells[1], condition: cells.slice(2).join(' | ') })
  }
  return rows
}

const rowFor = (command) => {
  const hit = gateRows().find((r) => r.command.includes(command))
  assert.ok(hit, `the gate table has no row running \`${command}\``)
  return hit
}

test('every gate command is in the table — none has been dropped', () => {
  const commands = ['npx eslint .', 'npm run build', 'npm run test:unit',
    'npm run test:rules', 'npm run test:users']
  const table = gateRows().map((r) => r.command).join('\n')
  for (const command of commands) {
    assert.ok(table.includes(command),
      `\`${command}\` is a gate and must have a row in ${DOC}:\n${table}`)
  }
})

test('THE ONE THAT MATTERS: no row declares an expected test total', () => {
  // This is the drift, restated as a rule. "682 tests", "355 tests across 37
  // spec files", "342 pass, 13 skipped", "24 tests" — every one of those was in
  // this table at some point, and every one of them went stale without failing
  // anything. A count of tests grows with every PR that adds a test, so it can
  // never be a pass condition; 0 failures can.
  // A NON-ZERO count. "0 failures, 0 skipped" is the property and must survive;
  // "682 tests" is the drift.
  const banned = /\b[1-9]\d*\s*(tests?|specs?|spec files|passing|pass\b|skipped|unit|browser)/i
  for (const row of gateRows()) {
    const hit = row.condition.match(banned)
    assert.equal(hit, null,
      `the "${row.gate}" row states a count ("${hit && hit[0]}") rather than a property.\n` +
      'A hand-maintained test total has drifted four times in this file. State what the run must SATISFY — ' +
      '0 failures, 0 skipped — not how many tests it happens to contain.')
  }
})

test('the unit row still demands zero failures AND zero skips', () => {
  // Zero skips is not pedantry: a skip in the unit suite means dist/ is missing,
  // i.e. a bare `npx vite build` ran instead of `npm run build`, i.e. the
  // prerender never ran. Removing "0 skipped" would hide that entirely.
  const { condition } = rowFor('npm run test:unit')
  assert.match(condition, /0 failures/,
    'the unit gate must require 0 failures')
  assert.match(condition, /0 skipped/,
    'the unit gate must require 0 SKIPPED — a skipped unit test means dist/ is missing and the prerender never ran')
})

test('the rules and acceptance rows still demand zero failures', () => {
  for (const command of ['npm run test:rules', 'npm run test:users']) {
    assert.match(rowFor(command).condition, /0 failures/,
      `\`${command}\` must state 0 failures as its pass condition`)
  }
})

test('THE OTHER ONE THAT MATTERS: the build row demands the prerender line', () => {
  // `npm run build` is vite build PLUS scripts/prerender.mjs. A bare
  // `npx vite build` writes dist/ and prints nothing, so the printed line is the
  // ONLY evidence the prerender ran at all — without it, a prerender that
  // crashed or silently stopped emitting shells ships green.
  const { condition } = rowFor('npm run build')
  assert.match(condition, /prerender/i,
    'the build gate must name the prerender line — it is the only signal that scripts/prerender.mjs ran')
  assert.match(condition, /route shells \+ a noindex 404 shell/,
    'the build gate must quote the prerender line verbatim enough to be recognised in a build log')
})

test('the prerender line the doc quotes is the line the script actually prints', () => {
  // The doc quoting a line the build no longer emits would be worse than not
  // quoting one: an agent would go looking for it, not find it, and conclude the
  // build was broken. This pins the two together.
  const script = read('scripts/prerender.mjs')
  assert.match(script, /prerender: wrote /,
    'scripts/prerender.mjs must still announce itself — the gate doc tells readers to look for that line')
  assert.match(script, /route shells \+ a noindex 404 shell/,
    'scripts/prerender.mjs no longer prints the line the gate doc quotes')
  assert.match(rowFor('npm run build').condition, /prerender: wrote /,
    'the gate doc must quote the prerender line as the script prints it')
})

test('the build gate does not pin a route-shell COUNT', () => {
  // The line is load-bearing; the number in it is not. Which routes get a shell
  // is decided by the sitemap, and tests/unit/prerender-routes.test.js fails if
  // the sitemap, routeMetaMap.js and vercel.json stop agreeing. That is the
  // feedback loop. "27 route shells" in a doc never was one, and would go stale
  // the first time a route is added.
  const { condition } = rowFor('npm run build')
  assert.equal(/\d+ route shells/.test(condition), false,
    `the build row pins a route-shell count: "${condition}".\n` +
    'Quote the line with N unpinned — prerender-routes.test.js owns the route set.')
})

test('the lint ceiling is stated once and the prose agrees with the table', () => {
  // The warning ceiling IS allowed to be a number: work may not raise it, and a
  // run that comes in under it is good news rather than a false alarm. But it is
  // written twice — in the table and in the paragraph that lists the rules — and
  // a half-update would leave the doc arguing with itself.
  const table = rowFor('npx eslint .').condition
  assert.match(table, /0 errors/, 'the lint gate must require 0 errors')
  const inTable = table.match(/\*\*(\d+)\*\*/)
  assert.ok(inTable, `the lint row must state the warning ceiling in bold, got: "${table}"`)
  const inProse = liveGateDoc().match(/The (\d+) lint warnings are pre-existing/)
  assert.ok(inProse, `${DOC} must keep the paragraph explaining the lint warnings`)
  assert.equal(inProse[1], inTable[1],
    `the lint ceiling is ${inTable[1]} in the gate table but ${inProse[1]} in the prose below it — update both`)
})

test('the acceptance suite README does not re-enumerate the spec files', () => {
  // It used to list fourteen of them in a table. By the time anyone looked there
  // were thirty-seven, so the "complete" list was missing twenty-three suites and
  // told newcomers to take a filename prefix that had been used for months. A
  // hand-maintained inventory of a directory is the same fault as a hand-
  // maintained test count.
  const readme = read(SUITE_README)
  const tableRows = readme.split('\n').filter((l) => /^\|.*\.spec\.js/.test(l))
  assert.deepEqual(tableRows, [],
    `${SUITE_README} lists spec files in a table again:\n${tableRows.join('\n')}\n` +
    '`ls tests/user-sim/*.spec.js` is the list, and it cannot go stale.')
})

test('every spec file the live docs name actually exists', () => {
  // The gate now leans on one file BY NAME — the skips are the whole of
  // 12-ui-system-builder.spec.js — so a rename would turn the pass condition
  // into a claim about a file that is not there.
  const present = new Set(fs.readdirSync(path.join(process.cwd(), 'tests/user-sim'))
    .filter((f) => f.endsWith('.spec.js')))
  for (const [source, body] of [[DOC, liveGateDoc()], [SUITE_README, read(SUITE_README)]]) {
    // `NN-name.spec.js` in the "adding a persona" instructions is a template,
    // not a claim about a file, so only real numbered filenames are checked.
    for (const named of body.match(/\b\d\d-[\w-]+\.spec\.js/g) ?? []) {
      assert.ok(present.has(named),
        `${source} names \`${named}\`, which is not in tests/user-sim/`)
    }
  }
})
