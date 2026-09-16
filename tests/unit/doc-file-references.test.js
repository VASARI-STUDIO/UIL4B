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
//   2. TOMBSTONES ARE ALLOWED, ONE BY ONE. A document may name a file that is
//      gone when naming it is the point — the record of a deletion, the row
//      explaining why a branch cannot be rebased — and the authority map says in
//      as many words not to repair those. Every such pair is listed below with
//      the reason, and a NEW dangling path still fails. The list is the honest
//      cost of the rule.
//
// ── AND IT ASKS GIT, NOT THE DISK. Changed 2026-09-16 ───────────────────────
//
// Some files this repository is responsible for are deliberately NOT in it. The
// internal boards went first (2026-09-16, #477), the founder's own documents
// followed the same day (#478), and then the working notes, the agent tooling
// and the release record — CLAUDE.md, CHANGELOG.md and every Markdown file
// under docs/ — in a third cut; .gitignore carries all three decisions and the
// reasons. They are on the founder's machine and in no clone.
//
// That splits "does this file exist?" in two, and the two answers disagree for
// exactly those files: on his disk they are there, on a public runner they are
// not. A guard that answered differently in the two places would be worthless
// in whichever one you were not standing in — green locally and red in CI, or
// the reverse, and neither result telling you anything about the document.
//
// SO THE VERDICT IS TAKEN FROM THE GIT INDEX AND FROM .gitignore, AND THE
// WORKING TREE IS NEVER CONSULTED. Both of those are tracked content, identical
// in every checkout, so this file returns the same answer everywhere. A path
// resolves if git TRACKS it; it is excused if git IGNORES it (see below); it is
// a tombstone if it is listed above. Anything else is a defect — including, and
// this is new, a file sitting on the author's disk that he never committed,
// which is precisely the reference a reader of the public repository cannot
// follow. Reading the disk would have called that one green.
//
// The document WALK is narrowed the same way and for the same reason: a
// git-ignored Markdown file is not scanned, so the founder's copy of
// `OWNER-ACTIONS.md` does not get link-checked on his machine and skipped in
// CI. Same document set, same paths, same verdict, both places.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const ROOT = process.cwd()

/**
 * Every Markdown document this repository is responsible for — meaning every
 * one a reader of it can open. A git-ignored document is on one machine and in
 * no clone, so it is dropped here rather than scanned in one place and missed
 * in the other; see the header.
 */
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
  const ignored = ignoredByGit(out)
  return out.filter((d) => !ignored.has(d)).sort()
}

/**
 * Every path git TRACKS, plus every directory prefix of one, because a document
 * may legitimately name a directory (`docs/design/`) and `git ls-files` lists
 * only files. This is the index, not the disk: it is what a clone gets.
 */
let TRACKED = null
function trackedByGit() {
  if (TRACKED) return TRACKED
  const files = execFileSync('git', ['ls-files', '-z'],
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
    .split('\0').filter(Boolean).map((p) => p.replace(/\\/g, '/'))
  const set = new Set(files)
  for (const f of files) {
    const parts = f.split('/')
    for (let i = 1; i < parts.length; i++) set.add(parts.slice(0, i).join('/'))
  }
  TRACKED = set
  return set
}

/** Does a path a document names resolve to something a CLONE of this repo has? */
function inRepo(ref) {
  return trackedByGit().has(ref.replace(/\/$/, ''))
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
  //
  // NOT SCANNED SINCE 2026-09-16: the register itself is local-only now, so
  // these two rows and the TopBar.jsx row below are dormant rather than dead.
  // They are KEPT, not dropped, because the day anyone re-tracks the register
  // the dangling links come back with it and this is the reason they are
  // allowed. LOCAL_ONLY_DOCS below is what holds them exempt from the staleness
  // check, one named document at a time — not a rule that forgives any entry
  // whose document happens to be missing.
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

  // The map’s "stranded documentation branch" section is entirely about files
  // that main deleted on purpose. Naming them is the whole content of it.
  'docs/reference/doc-authority-map.md::docs/consolidation':
    'a git BRANCH name, not a path — it only looks like one',
  'docs/reference/doc-authority-map.md::docs/audit/':
    'deleted before 2026-09-06; named as one of the branch’s already-done deletions',
  'docs/reference/doc-authority-map.md::docs/BUILD-PLAN.md':
    'deleted deliberately in #208; the section says not to recreate it',
  'docs/reference/doc-authority-map.md::docs/DECISIONS-NEEDED.md':
    'deleted deliberately in #208, same section',
  'docs/reference/doc-authority-map.md::docs/google-sheets-setup.md':
    'deleted; named as the dead link the stranded branch had fixed',
}))

// ── The documents that are on one machine and in no clone ───────────────────
//
// Local-only by founder decision, 2026-09-16; .gitignore carries which and why.
// Listed here BY NAME so the exemption below is a named set of documents rather
// than a rule of the shape "anything absent is forgiven", which would quietly
// excuse the next document somebody deletes by accident. The test under it
// asserts that git really does ignore each one, so a name left here after its
// .gitignore line went would fail rather than sit dormant.
//
// The third cut took CLAUDE.md and every Markdown document under docs/, so in a
// clone the scan is README.md alone. That is the honest state of the public
// tree, and the controls below are sized to it rather than to the twenty-three
// documents the walk used to reach.
const LOCAL_ONLY_DOCS = new Set([
  // #478 — the founder's own documents.
  'docs/OWNER-ACTIONS.md',
  'docs/PROPOSALS.md',
  'docs/MARKETING.md',
  'docs/qa/defect-register-2026-08.md',
  // The third cut — the working notes and the engineering references.
  'CLAUDE.md',
  'docs/build-plan/tool-tree.md',
  'docs/design/anti-slop-and-hero-2026-08.md',
  'docs/design/firebase-deferral.md',
  'docs/design/homepage-spec-2026-08.md',
  'docs/design/motion-reference-2026-08-23.md',
  'docs/reference/architecture.md',
  'docs/reference/build-and-verify.md',
  'docs/reference/color-system-m3.md',
  'docs/reference/constants-and-config.md',
  'docs/reference/css-conventions.md',
  'docs/reference/design-language-v2.md',
  'docs/reference/director.md',
  'docs/reference/discover.md',
  'docs/reference/doc-authority-map.md',
  'docs/reference/git-workflow.md',
  'docs/reference/growth-persuasion.md',
  'docs/reference/human-validation-zones.md',
  'docs/reference/murphys-law.md',
  'docs/reference/positioning.md',
  'docs/reference/tech-stack.md',
  'docs/research/homepage-patterns-2026-08.md',
])

// A path git IGNORES is not a claim about the tree, and there are now two kinds
// of them:
//
//   · A RUN-TIME ARTEFACT. `tests/user-sim/report/` is written by the browser
//     suite and is absent on a clean checkout. Whether it happens to be on disk
//     depends on what has been run, so it must not decide a test.
//   · A DELIBERATELY LOCAL FILE. `src/data/pipeline.js` and the four documents
//     in LOCAL_ONLY_DOCS are kept out of the repository on purpose, and the
//     documents that name them SAY so in the same sentence. That is the same
//     bargain as a tombstone: naming it is the point.
//
// Both are read from git rather than listed, exactly as
// tests/unit/function-include-files.test.js reads "deliberately absent" — so a
// path stops being excused the moment its .gitignore line goes, and a fifth
// local-only document is recognised the day it is ignored. The control below
// proves check-ignore still says NO to tracked files, so "ignored" cannot
// quietly become true of everything.
//
// Asked once, in a batch, because `git check-ignore` exits 1 when it matches
// nothing and that is not an error here.
function ignoredByGit(paths) {
  if (!paths.length) return new Set()
  try {
    const out = execFileSync('git', ['check-ignore', '--stdin'],
      { cwd: ROOT, input: paths.join('\n'), encoding: 'utf8' })
    return new Set(out.split(/\r?\n/).filter(Boolean).map((p) => p.replace(/\\/g, '/')))
  } catch (e) {
    // status 1 means "none of them are ignored"; anything else is a real fault.
    if (e.status === 1) return new Set()
    if (e.stdout) {
      return new Set(String(e.stdout).split(/\r?\n/).filter(Boolean).map((p) => p.replace(/\\/g, '/')))
    }
    throw e
  }
}

test('every repo path a document names in backticks is in the repository', () => {
  const absent = []
  for (const r of referencedPaths()) {
    const key = `${r.doc}::${r.ref}`
    if (TOMBSTONES.has(key)) continue
    if (!inRepo(r.ref)) absent.push(r)
  }
  const ignored = ignoredByGit(absent.map((r) => r.ref))
  const missing = absent
    .filter((r) => !ignored.has(r.ref.replace(/\/$/, '')) && !ignored.has(r.ref))
    .map((r) => `${r.doc}:${r.line} names \`${r.ref}\``)
  assert.deepEqual(missing, [],
    'a document names a path that a clone of this repository does not have. Either '
    + 'the path moved and the document must be corrected, or the file is never '
    + 'committed and the sentence must SAY so — in which case give it a .gitignore '
    + 'line, or add it to TOMBSTONES with the reason. NOTE: this reads the git '
    + 'index, not your disk, so a file you have but never committed fails here and '
    + 'is meant to:\n  '
    + missing.join('\n  '))
})

// Without this, deleting the regex or pointing the walk at an empty directory
// would leave the test above green and meaningless.
test('the scan actually reaches the documents — positive control', () => {
  const docs = ourDocs()
  assert.ok(docs.includes('README.md'), 'the walk missed README.md')
  // Since the third cut of 2026-09-16 a clone holds one scannable document,
  // README.md, and the ignore-filter test below holds the scanned set EQUAL to
  // the tracked set. So this is a floor against an empty walk, not a count.
  assert.ok(docs.length >= 1, `only ${docs.length} documents scanned; the tree holds more`)

  const rows = referencedPaths()
  // README.md alone names some twenty repo-rooted paths in backticks. Ten is
  // the floor: an extractor that has stopped seeing prose returns none.
  assert.ok(rows.length >= 10,
    `only ${rows.length} path references found; the extractor has stopped seeing them`)
  // A path README.md certainly names. It is itself local-only since
  // 2026-09-16, which is the point: this asserts the EXTRACTOR still reads
  // prose, and prose is present in every checkout whether the file is or not.
  assert.ok(rows.some((r) => r.ref === 'src/data/pipeline.js'),
    'no document was seen naming `src/data/pipeline.js`, which README.md does')
})

// The ignore filter is the one thing standing between this file and scanning
// nothing, so it is checked in both directions. Added 2026-09-16 with the four.
test('the ignore filter drops the local-only documents and nothing else', () => {
  const docs = ourDocs()

  // Direction 1 — it drops what it is for. Each of the four is really ignored
  // by git (so a name left in LOCAL_ONLY_DOCS after its .gitignore line went
  // fails here) and really absent from the scan.
  const notIgnored = [...LOCAL_ONLY_DOCS].filter((d) => !ignoredByGit([d]).has(d))
  assert.deepEqual(notIgnored, [],
    'LOCAL_ONLY_DOCS names a document git does not ignore. Either .gitignore lost '
    + 'its line — in which case the document is public again and the references to '
    + `it are wrong — or this list is stale:\n  ${notIgnored.join('\n  ')}`)
  const leaked = [...LOCAL_ONLY_DOCS].filter((d) => docs.includes(d))
  assert.deepEqual(leaked, [],
    `a local-only document is still being scanned, so this run and a clone's `
    + `disagree:\n  ${leaked.join('\n  ')}`)

  // Direction 2 — it drops nothing else. Without this, ignoring `docs/` or
  // `*.md` would empty the walk and leave every assertion above green.
  const tracked = trackedByGit()
  const dropped = docs.filter((d) => !tracked.has(d))
  assert.deepEqual(dropped, [],
    `the walk is scanning documents no clone has:\n  ${dropped.join('\n  ')}`)
  const trackedDocs = [...tracked].filter((f) =>
    f.endsWith('.md') && (f.startsWith('docs/') || f === 'README.md' || f === 'CLAUDE.md'))
  assert.deepEqual(docs.length, trackedDocs.length,
    `${trackedDocs.length} Markdown documents are tracked under docs/ but only `
    + `${docs.length} were scanned — the filter is eating documents that are in the repository`)
})

// A tombstone that has been repaired is a rule nobody can read the reason for.
test('every tombstone is still needed and still named', () => {
  const rows = referencedPaths()
  const stale = []
  for (const [key, reason] of TOMBSTONES) {
    const [doc, ref] = key.split('::')
    // An entry whose DOCUMENT is local-only is dormant, not stale: the scan
    // cannot see the sentence, so it cannot judge it. Kept so that re-tracking
    // the document brings its reason back with it. Named documents only — the
    // test above proves this set is exactly the four git ignores.
    if (LOCAL_ONLY_DOCS.has(doc)) continue
    if (!rows.some((r) => r.doc === doc && r.ref === ref)) {
      stale.push(`${key} — ${doc} no longer names it; drop the entry (${reason})`)
    } else if (inRepo(ref)) {
      stale.push(`${key} — ${ref} is in the repository again; drop the entry (${reason})`)
    }
  }
  assert.deepEqual(stale, [], `TOMBSTONES has entries that are no longer true:\n  ${stale.join('\n  ')}`)
})

// Without this, the whole "ask git, not the disk" design could be satisfied by
// a check-ignore that answers yes to everything, and every dangling path in
// every document would be excused at once. Added 2026-09-16.
test('git check-ignore still says NO to tracked files — negative control', () => {
  // Three tracked files, one of them Markdown under tests/. CLAUDE.md used to be
  // a control and is local-only since the third cut of 2026-09-16.
  const controls = ['README.md', 'tests/user-sim/README.md', 'tests/unit/doc-file-references.test.js']
  const wrongly = [...ignoredByGit(controls)]
  assert.deepEqual(wrongly, [],
    'check-ignore reports a TRACKED file as ignored, so "deliberately absent" has '
    + `become true of everything and the guard above excuses any path:\n  ${wrongly.join('\n  ')}`)
  for (const c of controls) {
    assert.ok(inRepo(c), `the index lookup cannot find ${c}, which is committed`)
  }
})
