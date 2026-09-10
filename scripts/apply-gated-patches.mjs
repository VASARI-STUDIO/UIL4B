// APPLY THE FOUR FOUNDER-GATED CHANGES, THEN PROVE THEM.
//
//   npm run apply:gated              # says what it will do, then asks
//   npm run apply:gated -- --yes     # says what it will do, then does it
//   npm run apply:gated -- --dry-run # prints the four hunks, touches nothing
//
// ═══════════════════════════════════════════════════════════════════════════
// WHAT THIS IS FOR
// ═══════════════════════════════════════════════════════════════════════════
// Four changes are written, reviewed and tested, and none of them is in the
// tree. Every one touches a file the Claude Code auto-mode classifier refuses
// to stage, so an agent can produce the diff and cannot apply it. Until today
// the founder's instructions were "open pull request #390, find the heading
// FOUNDER APPROVAL NEEDED, paste the diff into firestore.rules", four times,
// into two files, in an order nobody had written down.
//
// This is that, as one command, with the ordering handled, each patch applied
// only if it is not already in, nothing written until all four have succeeded,
// and the three suites run afterwards so the founder finds out here rather than
// in production.
//
// IT COMMITS NOTHING AND PUSHES NOTHING. It leaves a working tree ready to
// commit, and prints the one command that undoes everything it did.
//
// ═══════════════════════════════════════════════════════════════════════════
// WHAT IT DELIBERATELY DOES NOT DO
// ═══════════════════════════════════════════════════════════════════════════
// `api/verify-admin.js` — the half of the moderator role that MINTS the claim
// from the roster — is NOT applied here. Its diff in #390 is written as prose
// plus a partial hunk ("the two `includeUsers` returns take the same three
// extra fields"), which is an instruction to a reader rather than something a
// machine can apply, and re-deriving it would mean shipping a version of a
// security route no review has seen. The command says so on every run.
import { execFileSync, spawnSync } from 'node:child_process'
import { writeFile, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { createInterface } from 'node:readline/promises'
import path from 'node:path'
import {
  GATED_PATCHES, TARGET_FILES, ROOT, planGatedPatches, diffOf, undoCommand, lf, repoPath,
} from './gated-patches.mjs'

const argv = process.argv.slice(2)
const has = (flag) => argv.includes(flag)
const DRY_RUN = has('--dry-run') || has('-n')
const YES = has('--yes') || has('-y')

/* ── Printing ───────────────────────────────────────────────────────────── */

const out = (line = '') => process.stdout.write(`${line}\n`)
const rule = () => out('─'.repeat(74))
const heading = (text) => { out(); rule(); out(text); rule() }

/* ── 1 · Say what it will do ────────────────────────────────────────────── */

function describe() {
  heading('npm run apply:gated — four approved changes, applied in one go')
  out()
  out('These four are written, reviewed and tested, and none of them is in your')
  out('tree yet, because the tool that wrote them is not allowed to save these')
  out('files. This command saves them for you.')
  out()
  for (const [i, patch] of GATED_PATCHES.entries()) {
    out(`  ${i + 1}. ${patch.title}`)
    out(`     ${patch.grants}.`)
    out(`     files: ${patch.files.join(', ')}`)
    out(`     from:  ${patch.source}`)
    if (patch.notCovered) out(`     NOTE:  ${patch.notCovered}`)
    out()
  }
  out('Afterwards it runs, in this order and stopping at the first failure:')
  out('   1. npm run test:rules   (the Firestore emulator — needs Java 21)')
  out('   2. npm run test:unit')
  out('   3. VITE_DEFER_FIREBASE=1 npm run build')
  out()
  out('It does NOT commit and does NOT push. To undo everything it does:')
  out(`   ${undoCommand()}`)
  out()
}

/* ── 2 · Refuse to run on a dirty tree ──────────────────────────────────── */

const git = (args, opts = {}) =>
  execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', ...opts })

/**
 * A target file that differs from HEAD is either a previous run of this command
 * — which is fine, and is what makes running it twice safe — or somebody's
 * uncommitted work, which this must never overwrite.
 *
 * The two are told apart rather than guessed at. This command applies the four
 * IN A FIXED ORDER and writes nothing until all of them succeed, so any tree it
 * produced is the committed one plus a PREFIX of that order. Each prefix is
 * replayed from the committed files and compared byte for byte; if one matches,
 * this command wrote it. If none does, somebody else did, and the run stops.
 *
 * Line endings are normalised for the comparison only — a checkout that swapped
 * CRLF for LF is not an edit, and refusing on it would make the command unusable
 * on the machine it was written for.
 */
async function dirtyCheck() {
  const changed = git(['status', '--porcelain', '--', ...TARGET_FILES]).trim()
  if (!changed) return { ok: true, ours: false }

  let head
  try {
    head = new Map(TARGET_FILES.map((f) => [f, git(['show', `HEAD:${f}`], { maxBuffer: 32 * 1024 * 1024 })]))
  } catch {
    return { ok: false, reason: 'the committed version of these files could not be read', changed }
  }

  const current = new Map()
  for (const f of TARGET_FILES) current.set(f, lf(await readFile(repoPath(f), 'utf8')))

  for (let n = 0; n <= GATED_PATCHES.length; n += 1) {
    const replay = await planGatedPatches({ seed: (f) => head.get(f), upTo: n })
    if (replay.failed) break
    const source = n === 0 ? head : replay.after
    const matches = TARGET_FILES.every((f) => lf(source.get(f)) === current.get(f))
    if (matches) return { ok: true, ours: n > 0, alreadyIn: n }
  }

  const unexplained = TARGET_FILES.filter((f) => current.get(f) !== lf(head.get(f)))
  return {
    ok: false,
    reason: 'these files carry uncommitted edits that this command did not make',
    changed,
    unexplained,
  }
}

function refuseDirty(verdict) {
  heading('STOPPED — the files this would change have unsaved edits')
  out()
  out(`Reason: ${verdict.reason}.`)
  out()
  out('Nothing has been changed. Below is exactly what would have been')
  out('overwritten. Save or undo it, then run this command again.')
  out()
  for (const file of verdict.unexplained || TARGET_FILES) {
    if (!existsSync(repoPath(file))) continue
    let diff = ''
    try { diff = git(['diff', '--', file], { maxBuffer: 32 * 1024 * 1024 }) } catch { /* untracked */ }
    if (!diff.trim()) continue
    out(diff.trimEnd())
    out()
  }
  out('To throw those edits away and start clean:')
  out(`   ${undoCommand(verdict.unexplained || TARGET_FILES)}`)
  out()
}

/* ── 3 · Java, before the emulator fails obscurely ──────────────────────── */

const PORTABLE_JDK = path.join(
  'C:', 'Users', 'dylan', 'AppData', 'Local', 'Temp', 'claude',
  'd--00-Main-Workspace-01-projects-01-active-04-uil4b-com',
  'e47983ef-6d41-48d3-9e04-bda7d53d1272', 'scratchpad', 'jdk21', 'jdk-21.0.12.1+1',
)

/** The major version of whatever `java` is on PATH, or null if there is none. */
function javaMajor(javaHome) {
  const bin = javaHome ? path.join(javaHome, 'bin', 'java') : 'java'
  const res = spawnSync(bin, ['-version'], { encoding: 'utf8' })
  if (res.error) return null
  const text = `${res.stderr || ''}${res.stdout || ''}`
  // "21.0.12.1"; and 8 reports itself as "1.8.0_503".
  const m = /version "(\d+)(?:\.(\d+))?/.exec(text)
  if (!m) return null
  const major = Number(m[1])
  return major === 1 ? Number(m[2] || 0) : major
}

/**
 * The emulator needs a JDK 21, and this machine's `java` is 8. Left alone that
 * surfaces as a Java stack trace about an unsupported class file version, which
 * says nothing about what to do. So it is checked here, by name.
 */
function resolveJavaHome() {
  const onPath = javaMajor(null)
  if (onPath !== null && onPath >= 21) return { ok: true, home: null, version: onPath }
  const portable = existsSync(PORTABLE_JDK) ? javaMajor(PORTABLE_JDK) : null
  if (portable !== null && portable >= 21) {
    return { ok: true, home: PORTABLE_JDK, version: portable, borrowed: true, found: onPath }
  }
  return { ok: false, found: onPath, portable: PORTABLE_JDK }
}

/* ── 4 · Running a verification step ────────────────────────────────────── */

function runStep(label, command, args, { env = {}, mustPrint = null } = {}) {
  out()
  rule()
  out(`VERIFYING · ${label}`)
  rule()
  // ONE STRING, not a command plus an args array. `npm` on Windows is a `.cmd`
  // shim, which Node refuses to spawn without a shell — and passing an args
  // ARRAY alongside `shell: true` prints Node's DEP0190 warning about
  // concatenation in the middle of the output the founder is meant to be
  // reading. Every argument below is a literal written here, so there is
  // nothing to escape.
  const res = spawnSync([command, ...args].join(' '), {
    cwd: ROOT,
    env: { ...process.env, ...env },
    encoding: 'utf8',
    shell: true,
    maxBuffer: 64 * 1024 * 1024,
  })
  const text = `${res.stdout || ''}${res.stderr || ''}`
  process.stdout.write(text)
  if (res.status !== 0) return { ok: false, label, text, why: `it exited with code ${res.status}` }
  if (mustPrint && !text.includes(mustPrint)) {
    return { ok: false, label, text, why: `it succeeded but never printed "${mustPrint}"` }
  }
  return { ok: true, label, text }
}

/* ── 5 · The summary ────────────────────────────────────────────────────── */

const WORD = {
  applied: 'APPLIED',
  completed: 'APPLIED (the other half was already in)',
  skipped: 'SKIPPED — already in, nothing to do',
  failed: 'FAILED',
  'not-reached': 'NOT REACHED — an earlier patch failed',
}

function summarise(steps, verifications, { dryRun = false } = {}) {
  heading(dryRun ? 'DRY RUN — nothing was changed' : 'WHAT HAPPENED')
  out()
  for (const [i, step] of steps.entries()) {
    const word = dryRun && step.status !== 'skipped' ? 'WOULD APPLY' : WORD[step.status] || step.status
    out(`  ${i + 1}. ${step.patch.title.padEnd(46)} ${word}`)
    if (step.error) out(`     ${step.error.message}`)
  }
  out()
  if (verifications.length) {
    out('  Checks:')
    for (const v of verifications) {
      out(`    ${v.ok ? 'PASS' : 'FAIL'}  ${v.label}${v.ok ? '' : ` — ${v.why}`}`)
    }
    out()
  }
  const landed = steps.filter((s) => s.status === 'applied' || s.status === 'completed')
  const already = steps.filter((s) => s.status === 'skipped')
  const broke = steps.filter((s) => s.status === 'failed')
  if (dryRun) {
    out('  Nothing was written. Run it for real with:')
    out('     npm run apply:gated -- --yes')
    out()
    return
  }
  if (broke.length || verifications.some((v) => !v.ok)) return

  out('  WHAT IS NOW TRUE THAT WAS NOT BEFORE')
  const truths = []
  const done = new Set([...landed, ...already].map((s) => s.id))
  if (done.has('firebase-deferral')) {
    truths.push('the homepage paints sooner — 360 ms to first paint and 624 ms to the '
      + 'main heading, with 21.8% fewer bytes in the first request')
  }
  if (done.has('feedback-bounds')) {
    truths.push('a stranger can no longer write anything into your feedback queue, and '
      + 'no signed-in account can write a document bigger or stranger than the app sends')
  }
  if (done.has('moderator-role')) {
    truths.push('the rules now let a moderator clear the review queues — the one '
      + 'remaining step to actually appoint one is api/verify-admin.js, which this '
      + 'command does not apply (docs/OWNER-ACTIONS.md §1.3)')
  }
  if (done.has('per-project-sync')) {
    truths.push('project sync is live one-document-per-project, so it no longer stops '
      + 'working forever once you save about thirty projects with logos')
  }
  for (const t of truths) out(`    · ${t.replace(/\n/g, ' ')}.`)
  out()
  out('  Nothing has been committed. Look at the changes with:')
  out(`     git diff -- ${TARGET_FILES.join(' ')}`)
  out('  Keep them:')
  out(`     git add ${TARGET_FILES.join(' ')} && git commit -m "Apply the four gated changes"`)
  out('  Or throw them away:')
  out(`     ${undoCommand()}`)
  out()
  out('  One more step nobody but you can do: publish the rules from the Firebase')
  out('  console, or `firebase deploy --only firestore:rules`. Until then the new')
  out('  rules are in your repository and not in front of your users.')
  out()
}

/* ── main ───────────────────────────────────────────────────────────────── */

async function main() {
  describe()

  const verdict = await dirtyCheck()
  if (!verdict.ok) { refuseDirty(verdict); process.exitCode = 1; return }
  if (verdict.ours) {
    out('(Some of this is already in your tree from an earlier run. Those are')
    out(' skipped below rather than applied twice.)')
    out()
  }

  const plan = await planGatedPatches()

  if (DRY_RUN) {
    for (const file of TARGET_FILES) {
      const before = plan.before.get(file)
      const after = plan.after ? plan.after.get(file) : null
      if (after === null || before === after) continue
      heading(`WOULD CHANGE · ${file}`)
      out()
      out((await diffOf(file, before, after)).trimEnd())
      out()
    }
    if (plan.failed) {
      for (const step of plan.steps) {
        if (step.status === 'failed') {
          heading(`WOULD FAIL · ${step.patch.title}`)
          out()
          out(step.error.message)
          out()
        }
      }
    }
    summarise(plan.steps, [], { dryRun: true })
    return
  }

  if (plan.failed) {
    const bad = plan.steps.find((s) => s.status === 'failed')
    heading('STOPPED — one of the four no longer fits the file it was written for')
    out()
    out(`"${bad.patch.title}" could not be applied to ${bad.patch.files.join(', ')}.`)
    out(`Nothing has been changed. ${bad.error.message}`)
    out()
    out('This means the file moved after the change was reviewed. It needs an')
    out('engineer to regenerate the diff — do not hand-edit around it.')
    out()
    summarise(plan.steps, [])
    process.exitCode = 1
    return
  }

  const willChange = TARGET_FILES.filter((f) => plan.before.get(f) !== plan.after.get(f))
  if (!willChange.length) {
    out('All four are already in your tree. Nothing to apply.')
    out('The checks below still run, so you know the tree is sound.')
    out()
  } else if (!YES) {
    if (!process.stdin.isTTY) {
      heading('STOPPED — nothing was changed')
      out()
      out('This command needs you to say yes. Either run it where you can answer,')
      out('or run:')
      out('   npm run apply:gated -- --yes')
      out()
      process.exitCode = 1
      return
    }
    const rl = createInterface({ input: process.stdin, output: process.stdout })
    const answer = (await rl.question(`Apply these to ${willChange.join(', ')}? [y/N] `)).trim().toLowerCase()
    rl.close()
    if (answer !== 'y' && answer !== 'yes') {
      out()
      out('Nothing was changed.')
      out()
      process.exitCode = 1
      return
    }
  }

  for (const file of willChange) {
    await writeFile(repoPath(file), plan.after.get(file), 'utf8')
    out(`  wrote ${file}`)
  }

  /* ── verification ───────────────────────────────────────────────────── */

  const verifications = []
  const stopHere = (v) => {
    const culprit = plan.steps.find((s) => s.status === 'applied' || s.status === 'completed')
    heading('STOPPED — a check failed after applying')
    out()
    out(`${v.label} did not pass: ${v.why}.`)
    out()
    out('The changes ARE in your files. Nothing has been committed, so undoing')
    out('them is one command:')
    out(`   ${undoCommand()}`)
    out()
    if (culprit) {
      out(`The most likely cause is "${culprit.patch.title}", which touches`)
      out(`${culprit.patch.files.join(', ')} — that is where a check like this usually breaks.`)
      out('Send an engineer the output above; it names the failing test.')
      out()
    }
    summarise(plan.steps, verifications)
    process.exitCode = 1
  }

  const java = resolveJavaHome()
  if (!java.ok) {
    const v = {
      ok: false,
      label: 'npm run test:rules (Firestore emulator)',
      why: java.found === null
        ? 'Java is not installed, and the Firestore emulator needs Java 21'
        : `Java ${java.found} is installed and the Firestore emulator needs 21 or newer`,
    }
    verifications.push(v)
    heading('STOPPED — the rules cannot be tested on this machine')
    out()
    out(`${v.why}.`)
    out()
    out('There is a Java 21 sitting on this machine already. Point at it and run')
    out('the command again:')
    out(`   JAVA_HOME="${java.portable}" npm run apply:gated -- --yes`)
    out()
    out('The changes ARE in your files. To undo them:')
    out(`   ${undoCommand()}`)
    out()
    summarise(plan.steps, verifications)
    process.exitCode = 1
    return
  }
  const rulesEnv = java.home ? { JAVA_HOME: java.home, PATH: `${path.join(java.home, 'bin')}${path.delimiter}${process.env.PATH}` } : {}
  if (java.borrowed) {
    out(`  using the Java 21 at ${java.home} (the one on your PATH is ${java.found})`)
  }

  let v = runStep('npm run test:rules (Firestore emulator)', 'npm', ['run', 'test:rules'], { env: rulesEnv })
  verifications.push(v)
  if (!v.ok) { stopHere(v); return }

  v = runStep('npm run test:unit', 'npm', ['run', 'test:unit'])
  verifications.push(v)
  if (!v.ok) { stopHere(v); return }

  v = runStep(
    'VITE_DEFER_FIREBASE=1 npm run build',
    'npm', ['run', 'build'],
    { env: { VITE_DEFER_FIREBASE: '1' }, mustPrint: 'prerender: wrote 39 route shells' },
  )
  verifications.push(v)
  if (!v.ok) { stopHere(v); return }

  summarise(plan.steps, verifications)
}

main().catch((error) => {
  out()
  out(`Something went wrong before anything could be applied: ${error.message}`)
  out(`Your files are untouched. If in doubt: ${undoCommand()}`)
  process.exitCode = 1
})
