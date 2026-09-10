// A DOCUMENT THAT NAMES A FILE THAT IS NOT THERE.
//
// `doc-authority-map.md` calls this failure mode 2 — "a reference to a file
// that is not reached" — and records what it costs: #306 sent a whole pass to
// edit `IconLibrary.jsx`, which no route mounts, and #305 sent another to
// `FontBrowseDialog`, which is not the Font Gallery's popup. Neither was found
// by a test. Both were found because a human noticed the result did not match
// the claim.
//
// Nothing fails when a path in prose goes stale, so it stays stale. This is the
// feedback loop. It reads every Markdown document we own, pulls out every
// repo-rooted path in backticks, and fails if the file is not on disk.
//
// TWO DELIBERATE NARROWINGS, both so a red here always means a real defect:
//
//   1. REPO-ROOTED PATHS ONLY — `src/…`, `tests/…`, `docs/…`. A bare
//      `tokens.css` or `Node.js` in backticks is a generic noun, an aspiration
//      or another project's file, and guessing which is which is how a guard
//      turns into noise that gets deleted.
//   2. TOMBSTONES ARE ALLOWED, ONE BY ONE. `CHANGELOG.md` names seven deleted
//      files *correctly*, because it is the record of their deletion — the
//      authority map says in as many words not to repair those. So a document
//      may name a file that is gone when naming it is the point; every such
//      pair is listed below with the reason, and a NEW dangling path still
//      fails. The list is the honest cost of the rule.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()

/** Every Markdown document this repository is responsible for. */
function ourDocs() {
  const out = []
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name)
      if (e.isDirectory()) walk(p)
      else if (e.name.endsWith('.md')) out.push(path.relative(ROOT, p).replace(/\\/g, '/'))
    }
  }
  walk(path.join(ROOT, 'docs'))
  for (const f of ['README.md', 'CLAUDE.md']) {
    if (fs.existsSync(path.join(ROOT, f))) out.push(f)
  }
  return out.sort()
}

// A path in backticks that starts at a top-level directory we own. Trailing
// punctuation and a trailing slash are trimmed by the caller.
const TOP = '(?:src|api|tests|scripts|public|docs)'
const PATH_RE = new RegExp('`(' + TOP + '\\/[A-Za-z0-9_./@-]+)`', 'g')

/** Every (doc, path) pair named in backticks, deduplicated, with a line number. */
function referencedPaths() {
  const rows = []
  const seen = new Set()
  for (const doc of ourDocs()) {
    const lines = fs.readFileSync(path.join(ROOT, doc), 'utf8').split(/\r?\n/)
    lines.forEach((line, i) => {
      let m
      PATH_RE.lastIndex = 0
      while ((m = PATH_RE.exec(line))) {
        const ref = m[1].replace(/[.,;:]+$/, '')
        const key = `${doc}::${ref}`
        if (seen.has(key)) continue
        seen.add(key)
        rows.push({ doc, line: i + 1, ref })
      }
    })
  }
  return rows
}

// ── Tombstones: a document names this path BECAUSE it is gone ────────────────
//
// Keyed `<doc>::<path>`, valued with the reason. Adding a row here is a claim
// that the sentence around it tells the reader the file is gone; if it does
// not, fix the sentence instead.
const TOMBSTONES = new Map(Object.entries({
  // The register exists to say what the two deleted audits held and what holds
  // it now. Repairing these links would delete its whole subject.
  'docs/qa/defect-register-2026-08.md::docs/qa/mobile-audit-2026-08.md':
    'deleted 2026-09-05; this file is the record of that deletion',
  'docs/qa/defect-register-2026-08.md::docs/qa/responsive-audit-2026-08.md':
    'deleted 2026-09-05; this file is the record of that deletion',

  // The map's per-file register records what was deleted and why. Same shape.
  'docs/reference/doc-authority-map.md::src/components/TopBar.jsx':
    'named as deleted, in the row explaining why #264 cannot be rebased',
  'docs/reference/doc-authority-map.md::src/data/homeGallery.js':
    'named as never-landing, in the row that tells you to read the spec as a spec',
  'docs/reference/doc-authority-map.md::docs/archive/':
    'a directory the map proposes and does not create — the founder’s call',

  // Both say, in the same sentence, that the file no longer exists.
  'docs/reference/design-language-v2.md::src/pages/Landing.jsx':
    'the sentence around it reads “Landing.jsx no longer exists”',
  'docs/PROPOSALS.md::src/components/TopBar.jsx':
    'the sentence around it reads “which no longer exists on main”',

  // A superseded August spec, marked as such in its own header. Its dependency
  // on #264's data layer is part of what makes it a record rather than a spec.
  'docs/design/anti-slop-and-hero-2026-08.md::src/data/homeGallery.js':
    '#264 never landed; the header marks this document a superseded record',

  // Written by a test run, gitignored, absent on a clean checkout.
  'docs/reference/build-and-verify.md::tests/user-sim/report/':
    'created by `npm run test:users`; not committed',
}))

test('every repo path a document names in backticks exists', () => {
  const missing = []
  for (const r of referencedPaths()) {
    const key = `${r.doc}::${r.ref}`
    if (TOMBSTONES.has(key)) continue
    const abs = path.join(ROOT, r.ref)
    if (!fs.existsSync(abs)) missing.push(`${r.doc}:${r.line} names \`${r.ref}\``)
  }
  assert.deepEqual(missing, [],
    'a document names a path that is not on disk. Either the path moved and the '
    + 'document must be corrected, or the file was deleted deliberately and the '
    + 'sentence must SAY so — in which case add it to TOMBSTONES with the reason:\n  '
    + missing.join('\n  '))
})

// Without this, deleting the regex or pointing the walk at an empty directory
// would leave the test above green and meaningless.
test('the scan actually reaches the documents — positive control', () => {
  const docs = ourDocs()
  assert.ok(docs.includes('docs/OWNER-ACTIONS.md'), 'the walk missed docs/OWNER-ACTIONS.md')
  assert.ok(docs.includes('README.md'), 'the walk missed README.md')
  assert.ok(docs.length >= 20, `only ${docs.length} documents scanned; the tree holds more`)

  const rows = referencedPaths()
  assert.ok(rows.length >= 200,
    `only ${rows.length} path references found; the extractor has stopped seeing them`)
  // A path that certainly exists, named by a document that certainly names it.
  assert.ok(rows.some((r) => r.ref === 'src/data/pipeline.js'),
    'no document was seen naming `src/data/pipeline.js`, which several do')
})

// A tombstone that has been repaired is a rule nobody can read the reason for.
test('every tombstone is still needed and still named', () => {
  const rows = referencedPaths()
  const stale = []
  for (const [key, reason] of TOMBSTONES) {
    const [doc, ref] = key.split('::')
    if (!rows.some((r) => r.doc === doc && r.ref === ref)) {
      stale.push(`${key} — ${doc} no longer names it; drop the entry (${reason})`)
    } else if (fs.existsSync(path.join(ROOT, ref))) {
      stale.push(`${key} — ${ref} exists again; drop the entry (${reason})`)
    }
  }
  assert.deepEqual(stale, [], `TOMBSTONES has entries that are no longer true:\n  ${stale.join('\n  ')}`)
})
