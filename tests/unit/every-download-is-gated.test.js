// A NEW DOWNLOAD MUST NOT BE ABLE TO APPEAR WITHOUT A GATE.
//
// Founder decision, 2026-09-15: producing a FILE needs a free account; copying
// a value never does. Seven call sites were gated in one pass — the nav export
// panel, the icon SVG, the converter's four downloads, the palette PNG and the
// colour-system pair.
//
// Seven is a snapshot. The interesting question is the EIGHTH: the next
// download somebody adds, months from now, in a component that looks nothing
// like these. It will be four lines — a Blob, an anchor, `a.download = name`,
// `a.click()` — it will work perfectly, and nothing will notice that the
// product just started giving files away again.
//
// That is the same argument tests/unit/home-asset-budget.test.js makes for the
// entry chunk and tests/unit/admin-chunk-carries-no-backlog.test.js makes for
// the internal boards: a guard that names its subject can only ever find its
// subject. So this one names the SHAPE — an `a.download = …` assignment — and
// requires the file it lives in to be able to gate it.
//
// WHAT IT CANNOT PROVE, stated so nobody trusts it further than it goes: that
// the gate is actually AWAITED on the path that reaches the anchor. A file
// could import useExportGate and still download something ungated from a second
// function. This asserts the gate is REACHABLE in that module, which is the
// difference between "somebody thought about it" and "nobody did" — and the
// rendered half is tests/user-sim/90-export-needs-an-account.spec.js, which
// presses the real controls and watches for the dialog.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { stripJs } from '../helpers/strip-comments.js'

const ROOT = process.cwd()
const DIRS = ['src/pages', 'src/components']

// Files that produce a file and are gated some OTHER way. Each carries the
// reason, because an entry here is a decision rather than an exemption — and a
// reason that stops being true is findable.
const GATED_ELSEWHERE = new Map([
  ['src/pages/AltTextGenerator.jsx',
    'the whole tool is wrapped in <AuthGate featureLabel="generate alt text">, so a '
    + 'signed-out visitor never reaches the CSV'],
  ['src/pages/Admin.jsx',
    'behind admin verification (api/verify-admin.js); these CSVs are not a product feature'],
  ['src/pages/Settings.jsx',
    "the visitor's own data export. That is a privacy commitment, not a feature, and it "
    + 'is already behind auth — gating it would be the opposite of the point'],
])

/** Every .jsx under DIRS, as repo-relative paths. */
function sourceFiles() {
  const out = []
  for (const dir of DIRS) {
    const full = path.join(ROOT, dir)
    if (!fs.existsSync(full)) continue
    for (const f of fs.readdirSync(full).filter((n) => n.endsWith('.jsx'))) {
      out.push(`${dir}/${f}`.replace(/\\/g, '/'))
    }
  }
  return out
}

test('every file that downloads can gate the download', () => {
  const files = sourceFiles()
  // POSITIVE CONTROL: a scan that found no files passes every assertion below
  // for free, and that is exactly what a moved directory looks like.
  assert.ok(files.length > 30,
    `only ${files.length} components were scanned — src/pages and src/components are not `
    + 'where this test thinks they are')

  const downloaders = []
  for (const rel of files) {
    const code = stripJs(fs.readFileSync(path.join(ROOT, rel), 'utf8'))
    // The shape every one of these call sites uses: an anchor told to download.
    if (/\.download\s*=/.test(code) || /\sdownload\s*(=|\/?>)/.test(code)) {
      downloaders.push({ rel, code })
    }
  }

  // POSITIVE CONTROL FOR THE DETECTOR. If the pattern stops matching, every
  // assertion below passes on an empty list and the guard is dead.
  assert.ok(downloaders.length >= 5,
    `the scan found only ${downloaders.length} components that download a file, and there `
    + 'are at least five. The detection pattern has stopped matching — check it against '
    + 'src/components/ExportPanel.jsx, which definitely downloads.')

  const ungated = []
  for (const { rel, code } of downloaders) {
    if (GATED_ELSEWHERE.has(rel)) continue
    if (code.includes('useExportGate')) continue
    ungated.push(rel)
  }

  assert.deepEqual(ungated, [],
    'a component produces a file and cannot gate it. Producing a FILE needs a free '
    + 'account (founder decision 2026-09-15); copying a value never does. Import '
    + "useExportGate and `if (!(await gate('download the thing'))) return` before the "
    + 'anchor — or, if it is gated some other way, add it to GATED_ELSEWHERE above with '
    + 'the reason.')
})

test('the exemptions still describe something true', () => {
  // An allowlist nobody rechecks becomes a list of things that used to be fine.
  for (const [rel, reason] of GATED_ELSEWHERE) {
    const full = path.join(ROOT, rel)
    assert.ok(fs.existsSync(full),
      `${rel} is exempt from the download gate and no longer exists. Remove the entry.`)
    const code = stripJs(fs.readFileSync(full, 'utf8'))

    if (rel.includes('AltTextGenerator')) {
      assert.ok(code.includes('AuthGate'),
        `${rel} is exempt because "${reason}" — and it no longer renders an AuthGate, so `
        + 'its CSV is now reachable signed out.')
    }
    if (rel.includes('Settings')) {
      // The exemption is about the visitor's OWN data. If this file started
      // exporting something else, the reason would no longer cover it.
      assert.ok(/uil4b-export-/.test(code),
        `${rel} is exempt because it exports the visitor's own data, and that export is `
        + 'no longer here. Recheck what it downloads now.')
    }
  }
})
