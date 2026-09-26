// EVERY UPGRADE WALL MUST REPORT UNDER ITS OWN NAME.
//
// There is exactly ONE canonical upgrade gate: trackUpgradeGate, fired once
// inside ProModalContext.openProModal. That part already worked — all sixteen
// call sites were covered, and a gate added later is measured by existing.
//
// What did NOT work is the NAME. `gate` was optional, and openProModal fell
// back to the modal's title, which is display copy rather than an identifier:
//
//   · three separate walls in PaletteBuilder — the Add block, insert-between,
//     and the context menu — all render the title "Go beyond 5 colours", so the
//     dashboard showed one wall where the product has three;
//   · IconLibrary's line-styles wall reported as "Upgrade to Pro to use this
//     feature", which names nothing at all;
//   · every title is user-visible prose, so a copy edit silently renamed a
//     counter and split its history in two.
//
// A funnel that cannot say WHICH wall converted is the inward-pointing version
// of the false claim /plans has just had removed: the number is there, it looks
// like measurement, and it is not true.
//
// THIS FILE IS THE ENFORCEMENT. It parses the balanced argument of every
// openProModal call in src/ and fails if one does not name a gate. That is
// deliberately a check on the CALL SITE and not on a helper: reverting any one
// of the fourteen edits that named these walls must fail the build, and a
// helper-level assertion would not notice.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const SRC = path.join(ROOT, 'src')

// The working tree is CRLF. Every matcher below is written with a bare \n, so
// normalise once at the door rather than making each pattern carry \r?.
const read = p => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n')

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(p, out)
    else if (/\.(jsx?|tsx?)$/.test(entry.name)) out.push(p)
  }
  return out
}

// Extract the balanced (...) argument text that follows each `openProModal(`.
// A regex cannot do this: several of these arguments are multi-line objects
// containing nested objects, arrays and template literals.
function callArguments(src, fnName) {
  const args = []
  const needle = `${fnName}(`
  let from = 0
  for (;;) {
    const at = src.indexOf(needle, from)
    if (at === -1) break
    let i = at + needle.length
    let depth = 1
    while (i < src.length && depth > 0) {
      const ch = src[i]
      if (ch === '(' || ch === '{' || ch === '[') depth += 1
      else if (ch === ')' || ch === '}' || ch === ']') depth -= 1
      i += 1
    }
    args.push({ index: at, text: src.slice(at + needle.length, i - 1) })
    from = at + needle.length
  }
  return args
}

const lineOf = (src, index) => src.slice(0, index).split('\n').length

// The files that RAISE a gate. ProModalContext defines openProModal, so its own
// occurrences are the definition, not call sites.
const CALLERS = walk(SRC)
  .filter(p => read(p).includes('openProModal('))
  .filter(p => !p.endsWith(path.join('contexts', 'ProModalContext.jsx')))
  .sort()

test('the gate event still fires from the one canonical place', () => {
  // The whole design rests on this: sixteen call sites, one event. If this
  // moves out to the call sites the naming check below stops being enough.
  const ctx = read(path.join(SRC, 'contexts', 'ProModalContext.jsx'))
  assert.match(ctx, /trackUpgradeGate\(next\.gate/, 'trackUpgradeGate must fire inside openProModal, keyed on next.gate')
  const strays = walk(SRC)
    .filter(p => !p.endsWith(path.join('contexts', 'ProModalContext.jsx')))
    .filter(p => !p.endsWith(path.join('utils', 'analytics.js')))
    .filter(p => read(p).includes('trackUpgradeGate('))
  assert.deepEqual(strays, [], 'a second definition of "upgraded" — trackUpgradeGate called outside ProModalContext')
})

test('there is at least one gate call site to check', () => {
  // Positive control. Every assertion below is a loop over call sites; if the
  // walk broke or openProModal were renamed, all of them would pass vacuously.
  assert.ok(CALLERS.length >= 5, `expected several files to raise gates, found ${CALLERS.length}`)
  const total = CALLERS.reduce((n, p) => n + callArguments(read(p), 'openProModal').length, 0)
  // Locked library items and plan CTAs link to /plans rather than raising the
  // modal, so the floor is the in-tool gates that remain.
  assert.ok(total >= 12, `expected at least 12 openProModal call sites, found ${total}`)
})

test('every openProModal call site names its gate', () => {
  const unnamed = []
  for (const file of CALLERS) {
    const src = read(file)
    for (const call of callArguments(src, 'openProModal')) {
      // Accept an explicit `gate:` / `gate,` / `gate }` (the shorthand a
      // component forwarding a `gate` prop uses), or a spread of a table whose
      // every entry names one — checked separately below.
      const named = /\bgate\s*[:,}]/.test(call.text) || /\.\.\.[A-Za-z_$][\w$]*_GATES?\b/.test(call.text)
      if (!named) {
        unnamed.push(`${path.relative(ROOT, file)}:${lineOf(src, call.index)}`)
      }
    }
  }
  assert.deepEqual(
    unnamed,
    [],
    'these upgrade walls would report under their modal title instead of their own name',
  )
})

test('a gate id is a stable identifier, not display copy', () => {
  // Kebab-case, lowercase, no spaces. A title has spaces and capitals; this is
  // what stops someone pasting the heading back in as the id.
  const bad = []
  for (const file of CALLERS) {
    const src = read(file)
    for (const call of callArguments(src, 'openProModal')) {
      const literal = call.text.match(/\bgate\s*:\s*'([^']*)'/)
      if (literal && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(literal[1])) {
        bad.push(`${path.relative(ROOT, file)}:${lineOf(src, call.index)} → ${literal[1]}`)
      }
      // Template ids derive from a closed set of kinds (icon-${kind},
      // ui-system-${kind}); their literal half must still be kebab.
      const tpl = call.text.match(/\bgate\s*:\s*`([a-z0-9-]*)\$\{/)
      if (tpl && !/^[a-z0-9]+(-[a-z0-9]+)*-$/.test(tpl[1])) {
        bad.push(`${path.relative(ROOT, file)}:${lineOf(src, call.index)} → \`${tpl[1]}\${...}\``)
      }
    }
  }
  assert.deepEqual(bad, [], 'gate ids must be kebab-case identifiers')
})

test('every entry of a spread gate table names a gate', () => {
  // ExportPanel raises its two paid-export walls with `...PRO_GATE[format]`.
  // The call-site check above accepts that spread, so the table itself is what
  // has to be complete — otherwise a format added to PRO_GATE without a `gate`
  // slips through both checks.
  const panel = read(path.join(SRC, 'components', 'ExportPanel.jsx'))
  const table = panel.slice(panel.indexOf('const PRO_GATE = {'))
  const body = table.slice(0, table.indexOf('\n}\n') + 1)
  const entries = [...body.matchAll(/^ {2}([a-z][\w]*):\s*\{/gm)].map(m => m[1])
  assert.ok(entries.length >= 2, `expected PRO_GATE entries, found ${entries.length}`)
  const blocks = body.split(/^ {2}[a-z][\w]*:\s*\{/m).slice(1)
  entries.forEach((name, i) => {
    assert.match(blocks[i], /gate:\s*'[a-z0-9-]+'/, `PRO_GATE.${name} must name a gate`)
  })
})

test('the walls that share a title report as separate gates', () => {
  // The specific bug this file exists for. Three PaletteBuilder call sites
  // render "Go beyond ${PRO_MAX} colours"; two render "Check contrast, light
  // and dark". Under the title fallback those five walls were two counters.
  const pb = read(path.join(SRC, 'pages', 'PaletteBuilder.jsx'))
  const capCalls = callArguments(pb, 'openProModal').filter(c => c.text.includes('Go beyond ${PRO_MAX} colours'))
  assert.equal(capCalls.length, 3, 'expected three colour-cap walls')
  capCalls.forEach(c => assert.match(c.text, /gate: 'palette-colour-cap'/))

  // One contrast wall since the drawn board: the AA chip on each
  // colour. It must still name its own gate.
  const contrastCalls = callArguments(pb, 'openProModal').filter(c => c.text.includes("'Check contrast, light and dark'"))
  assert.equal(contrastCalls.length, 1, 'expected one contrast wall')
  contrastCalls.forEach(c => assert.match(c.text, /gate: 'palette-contrast-view'/))
})

test('the icon and UI-system walls derive their id from the kind they were asked for', () => {
  // Both used to raise one shared modal for several different walls. Deriving
  // the id from `kind` rather than writing it into each preset means a kind
  // added later is measured by existing — the same reason the event itself
  // lives in ProModalContext.
  const icons = read(path.join(SRC, 'pages', 'IconLibrary.jsx'))
  assert.match(icons, /openProModal\(\{ gate: `icon-\$\{kind\}`/)
  const ui = read(path.join(SRC, 'components', 'UiSystemBuilder.jsx'))
  assert.match(ui, /openProModal\(\{ gate: `ui-system-\$\{kind\}`/)
  // ...and it must be the kind ASKED for, not the copy that was fallen back to.
  assert.match(ui, /const copy = PRO_COPY\[kind\] \|\| PRO_COPY\.controls/)
})
