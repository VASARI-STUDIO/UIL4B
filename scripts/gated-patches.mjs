// THE FOUR FOUNDER-GATED CHANGES, IN ONE REGISTRY.
//
// ═══════════════════════════════════════════════════════════════════════════
// WHY THIS EXISTS
// ═══════════════════════════════════════════════════════════════════════════
// Four reviewed, tested changes cannot be committed from an agent branch.
// `firestore.rules`, `api/verify-admin.js` and `src/contexts/AuthContext.jsx`
// are refused by the Claude Code auto-mode classifier — a guardrail inside the
// tool, separate from and stricter than docs/reference/human-validation-zones.md,
// which refuses AFTER the founder has said yes. So each change ships as a diff
// that is committed, tested and unapplied, and somebody has to type it in.
//
// Four hand-applied diffs across two files is four chances to paste one into
// the wrong place. This module is the single description of all four — what
// each one is, how to tell whether it is already in, how to put it in, and what
// it grants in a sentence a non-engineer can act on. Two things read it:
//
//   · scripts/apply-gated-patches.mjs  (`npm run apply:gated`) — the one
//     command the founder runs.
//   · tests/unit/gated-patch-applier.test.js — which fails if any of the four
//     goes stale against its target, or if the applier stops covering one.
//
// ═══════════════════════════════════════════════════════════════════════════
// THE TWO RULES THIS FILE FOLLOWS
// ═══════════════════════════════════════════════════════════════════════════
//
// 1. NOTHING IS RE-DERIVED. Every hunk here comes from the artefact the review
//    produced — a committed `.patch`, or the anchored replacements in
//    tests/rules/pending-firestore-rules.mjs that the emulator suite already
//    runs. If a patch is regenerated, this module changes with it and cannot
//    quietly grant something the review never saw.
//
// 2. THE TARGET FILES ARE NEVER WRITTEN UNTIL EVERY PATCH HAS APPLIED. Each
//    patch lands in a scratch directory inside the repository, in order, and
//    the results are copied over the originals only once all four have
//    succeeded. A run that fails halfway leaves the tree exactly as it found
//    it — which matters most for `firestore.rules`, where a half-applied file
//    does not compile and locks every client out of its own data.
//
// ═══════════════════════════════════════════════════════════════════════════
// THE ORDER IS LOAD-BEARING, AND IT IS NOT THE READING ORDER
// ═══════════════════════════════════════════════════════════════════════════
// Three of the four edit `firestore.rules`, and two of them are unified diffs
// carrying three lines of context. Applying them in the wrong order breaks that
// context and `git apply` refuses:
//
//   · per-project sync inserts inside `match /users/{userId}`, and its trailing
//     context is the `// Feedback — anyone can create, only admin can ...`
//     comment. The moderator role REWRITES that comment. So per-project first.
//   · the moderator role deletes `function isAdmin()` from
//     `match /community-submissions`, and its trailing context is the
//     `// A client may only ever create its OWN submission` comment. The
//     feedback bounds insert forty lines between the two. So the moderator role
//     before the feedback bounds — which is also the order #418 verified
//     against #390's working copy on the emulator.
//
// The founder never sees this ordering problem, which is the point of the
// command existing.
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdtemp, readFile, writeFile, rm, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PENDING_PATCHES, PENDING_MARKERS } from '../tests/rules/pending-firestore-rules.mjs'

const execFileAsync = promisify(execFile)

export const ROOT = fileURLToPath(new URL('../', import.meta.url))
export const RULES_PATH = path.join(ROOT, 'firestore.rules')

const abs = (rel) => path.join(ROOT, rel)

/** LF everywhere, so a CRLF checkout cannot make a match fail. */
export const lf = (text) => text.replace(/\r\n/g, '\n')

/** Whatever the file already used, restored after the patching is done. */
const dominantEol = (text) => (/\r\n/.test(text) ? '\r\n' : '\n')
const withEol = (text, eol) => (eol === '\r\n' ? lf(text).replace(/\n/g, '\r\n') : lf(text))

/* ── The rule the per-project sync design is waiting on ──────────────────── */

/**
 * The one rule docs/design/per-project-sync-rules.patch adds. Exported here
 * rather than beside the patch script so the registry has no import cycle;
 * scripts/per-project-rules-patch.mjs re-exports it for its existing callers.
 */
export const RULE_MATCHER =
  /match \/projects\/\{projectId\}\s*\{\s*allow read, write: if isOwner\(\);\s*\}/

/* ── Applying a committed unified diff, to a copy ────────────────────────── */

/**
 * `git apply` rather than a hand-rolled splice, for the reason
 * scripts/firebase-deferral-trial.mjs gives: a patch verified by a bespoke
 * applier is a patch verified against something other than what the founder
 * will run. `--directory` makes every byte git writes land inside the scratch
 * directory, so the gated originals are read and never written.
 *
 * LINE ENDINGS ARE REMOVED FROM THE QUESTION FIRST. `git apply` compares
 * context lines byte for byte, so a CRLF patch against an LF file fails with
 * "patch does not apply" — which reads exactly like a patch that has gone
 * stale, and is not. This repository checks out CRLF on Windows and LF
 * everywhere else, and the two mix the moment anything reads a committed blob
 * (`git show HEAD:...` is always LF) and compares it with the working tree.
 * So the scratch copy is LF, the patch is copied to LF beside it, and
 * planGatedPatches puts the file's own line endings back at the end.
 */
async function gitApplyInto(patchAbs, ws, { check = false } = {}) {
  const flat = path.join(ws.dir, `${path.basename(patchAbs)}.lf`)
  await writeFile(flat, lf(await readFile(patchAbs, 'utf8')), 'utf8')
  const args = ['apply', '--unsafe-paths', `--directory=${ws.scratchRel}`]
  if (check) args.push('--check')
  args.push(flat)
  await execFileAsync('git', args, { cwd: ROOT })
}

/* ── The four ───────────────────────────────────────────────────────────── */

const PER_PROJECT_PATCH = 'docs/design/per-project-sync-rules.patch'
const MODERATOR_PATCH = 'docs/design/moderator-role-rules.patch'
const FIREBASE_PATCH = 'docs/design/firebase-deferral-gated.patch'

/** The flag the client half of per-project sync is held behind. */
const FLAG_OFF = 'export const PER_PROJECT_SYNC_ENABLED = false'
const FLAG_ON = 'export const PER_PROJECT_SYNC_ENABLED = true'

/**
 * The feedback bounds are NOT a `.patch` file: they were written as anchored
 * find/replace pairs so tests/rules/firestore-rules-pending.test.js could run
 * the emulator against the result before the founder ever saw it. Reusing that
 * exact module is the whole reason to import from tests/ — a second copy of
 * these anchors would be a second thing to keep in step, and the copy the
 * emulator ran is the one that matters.
 */
function applyPendingAnchors(text) {
  let out = lf(text)
  for (const patch of PENDING_PATCHES) {
    const occurrences = out.split(patch.find).length - 1
    if (occurrences !== 1) {
      throw new Error(
        `the "${patch.id}" anchor matched ${occurrences} times in firestore.rules, expected exactly 1`,
      )
    }
    // A FUNCTION replacer, not the string: String.replace reads `$&`, "$`" and
    // `$'` in the replacement as substitution patterns, and the analytics day
    // regex ends in `$'`.
    out = out.replace(patch.find, () => patch.replace)
  }
  return out
}

/**
 * The registry. `parts` exist because two of the four are a pair that must land
 * together or not at all — a rule with no client behind it, or a client with no
 * rule, is the exact silent failure these changes abolish. Splitting them means
 * a half-applied change can be COMPLETED rather than refused.
 */
export const GATED_PATCHES = [
  {
    id: 'per-project-sync',
    title: 'Per-project sync',
    source: 'docs/design/per-project-sync-rules.patch + src/utils/projectSync.js',
    grants:
      'every saved project gets its own document instead of all of them sharing one, '
      + 'so sync stops dying silently at about thirty projects with logos',
    files: ['firestore.rules', 'src/utils/projectSync.js'],
    parts: [
      {
        name: 'the rule',
        file: 'firestore.rules',
        detect: (text) => RULE_MATCHER.test(text),
        apply: async (ctx) => { await gitApplyInto(abs(PER_PROJECT_PATCH), ctx) },
        check: async (ctx) => { await gitApplyInto(abs(PER_PROJECT_PATCH), ctx, { check: true }) },
      },
      {
        name: 'the client flag',
        file: 'src/utils/projectSync.js',
        detect: (text) => lf(text).includes(FLAG_ON),
        apply: async (ctx) => {
          const rel = 'src/utils/projectSync.js'
          const text = await ctx.read(rel)
          if (!lf(text).includes(FLAG_OFF)) {
            throw new Error(`${FLAG_OFF} is no longer in src/utils/projectSync.js`)
          }
          await ctx.write(rel, lf(text).replace(FLAG_OFF, FLAG_ON))
        },
      },
    ],
  },
  {
    id: 'moderator-role',
    title: 'Moderator role',
    source: 'docs/design/moderator-role-rules.patch (PR #390)',
    grants:
      'the rules now honour a `moderator` claim on feedback, community prompts and '
      + 'community submissions, so clearing the queue stops being founder-only',
    files: ['firestore.rules'],
    notCovered:
      'api/verify-admin.js — the half that MINTS the moderator claim — is not applied by '
      + 'this command. See docs/OWNER-ACTIONS.md §1.3.',
    parts: [
      {
        name: 'isReviewer() on the three review collections',
        file: 'firestore.rules',
        detect: (text) => /function isReviewer\(\)/.test(text)
          && /allow read, update, delete: if isReviewer\(\);/.test(text),
        apply: async (ctx) => { await gitApplyInto(abs(MODERATOR_PATCH), ctx) },
        check: async (ctx) => { await gitApplyInto(abs(MODERATOR_PATCH), ctx, { check: true }) },
      },
    ],
  },
  {
    id: 'feedback-bounds',
    title: 'Feedback create closed, signed-in writes bounded',
    source: 'tests/rules/pending-firestore-rules.mjs (PR #418)',
    grants:
      'a stranger can no longer put anything into the feedback queue, and every '
      + 'signed-in write is held to the shape and size the app actually sends',
    files: ['firestore.rules'],
    parts: [
      {
        name: 'the four bounded rules',
        file: 'firestore.rules',
        // The same markers the emulator suite uses to decide whether the file
        // already carries this diff. One definition, so the applier and the
        // tests can never disagree about what "already applied" means.
        detect: (text) => PENDING_PATCHES.every((p) => PENDING_MARKERS[p.id](lf(text))),
        apply: async (ctx) => {
          const rel = 'firestore.rules'
          await ctx.write(rel, applyPendingAnchors(await ctx.read(rel)))
        },
      },
    ],
  },
  {
    id: 'firebase-deferral',
    title: 'Firebase deferral',
    source: 'docs/design/firebase-deferral-gated.patch (PR #427)',
    grants:
      'the 116 KB Firebase SDK stops being fetched before the homepage can paint — '
      + 'measured at FCP −360 ms, LCP −624 ms, first-wave bytes −21.8%',
    files: ['src/contexts/AuthContext.jsx', 'src/contexts/SubscriptionContext.jsx'],
    parts: [
      {
        name: 'both contexts routed through the access broker',
        file: 'src/contexts/AuthContext.jsx',
        detect: (text) => lf(text).includes(
          "import { whenAuthSdk, loadAuthSdk, loadFirestore, authNow } from '../utils/firebaseAccess'",
        ),
        apply: async (ctx) => { await gitApplyInto(abs(FIREBASE_PATCH), ctx) },
        check: async (ctx) => { await gitApplyInto(abs(FIREBASE_PATCH), ctx, { check: true }) },
      },
    ],
  },
]

/** Every file any of the four touches, de-duplicated, in a stable order. */
export const TARGET_FILES = [...new Set(GATED_PATCHES.flatMap((p) => p.files))].sort()

/* ── The workspace ──────────────────────────────────────────────────────── */

/**
 * A scratch copy of every target file, inside the repository because
 * `git apply --directory` resolves relative to the repository root and refuses
 * to escape it. Uniquely named, because every agent on this machine shares one
 * scratch space and a fixed name collides mid-use.
 */
export async function openWorkspace(seed) {
  const dir = await mkdtemp(path.join(ROOT, '.tmp-gated-patch-'))
  const rel = path.basename(dir)
  const cache = new Map()
  for (const file of TARGET_FILES) {
    // LF inside the workspace, unconditionally — see gitApplyInto.
    const text = lf(seed ? seed(file) : await readFile(abs(file), 'utf8'))
    const dest = path.join(dir, file)
    await mkdir(path.dirname(dest), { recursive: true })
    await writeFile(dest, text, 'utf8')
    cache.set(file, text)
  }
  return {
    dir,
    scratchRel: rel,
    async read(file) {
      if (cache.has(file)) return cache.get(file)
      return readFile(path.join(dir, file), 'utf8')
    },
    async write(file, text) {
      cache.set(file, text)
      await writeFile(path.join(dir, file), text, 'utf8')
    },
    /** git apply writes behind our back, so the cache has to be dropped. */
    async refresh(file) {
      const text = await readFile(path.join(dir, file), 'utf8')
      cache.set(file, text)
      return text
    },
    async close() { await rm(dir, { recursive: true, force: true }) },
  }
}

/**
 * What each of the four would do to the current tree, without doing any of it.
 *
 * @param {object} [opts]
 * @param {(file: string) => string} [opts.seed] file contents to start from,
 *   instead of what is on disk. Used by the tests to plan against HEAD.
 * @param {number} [opts.upTo] apply only the first N of the four. The dirty-tree
 *   check uses it to ask "is this tree HEAD plus a prefix of what I do?".
 * @returns {Promise<{ steps: object[], after: Map<string,string>, before: Map<string,string> }>}
 */
export async function planGatedPatches(opts = {}) {
  const before = new Map()
  for (const file of TARGET_FILES) {
    before.set(file, opts.seed ? opts.seed(file) : await readFile(abs(file), 'utf8'))
  }
  const limit = opts.upTo ?? GATED_PATCHES.length
  const ws = await openWorkspace((file) => before.get(file))
  const steps = []
  try {
    for (const patch of GATED_PATCHES.slice(0, limit)) {
      const step = { id: patch.id, patch, status: 'pending', done: [], missing: [], error: null }
      for (const part of patch.parts) {
        const text = await ws.read(part.file)
        if (part.detect(text)) step.done.push(part.name)
        else step.missing.push(part)
      }
      if (step.missing.length === 0) {
        step.status = 'skipped'
        steps.push(step)
        continue
      }
      try {
        for (const part of step.missing) {
          await part.apply(ws)
          // EVERY file, not just this part's. `git apply` writes behind the
          // cache and one patch can touch two files: the deferral converts both
          // contexts in a single hunk set, and refreshing only the one the
          // detector looks at left the second one reading as unpatched — half a
          // deferral, reported as a whole one.
          for (const file of TARGET_FILES) await ws.refresh(file)
          const text = await ws.read(part.file)
          if (!part.detect(text)) {
            throw new Error(
              `${patch.title}: "${part.name}" was applied to ${part.file} but the result does not `
              + 'contain the rule it is meant to grant. The patch applied cleanly and granted nothing.',
            )
          }
        }
        step.status = step.done.length ? 'completed' : 'applied'
      } catch (error) {
        step.status = 'failed'
        step.error = error
        steps.push(step)
        // Everything after a failure is unreachable: the remaining rules
        // patches are written against the result of this one.
        for (const rest of GATED_PATCHES.slice(GATED_PATCHES.indexOf(patch) + 1, limit)) {
          steps.push({ id: rest.id, patch: rest, status: 'not-reached', done: [], missing: [], error: null })
        }
        return { steps, before, after: null, failed: true }
      }
      steps.push(step)
    }
    // Whatever line endings the file had, it keeps.
    const after = new Map()
    for (const file of TARGET_FILES) {
      const text = await ws.read(file)
      after.set(file, withEol(text, dominantEol(before.get(file))))
    }
    return { steps, before, after, failed: false }
  } finally {
    // The scratch directory is never the artefact — the planned text is
    // returned in memory — so it goes on every path, success or failure.
    await ws.close()
  }
}

/**
 * A unified diff of one file's before/after, headed with the repository-relative
 * path rather than the scratch one, so the founder reads a path that exists.
 */
export async function diffOf(file, beforeText, afterText) {
  if (beforeText === afterText) return ''
  const dir = await mkdtemp(path.join(ROOT, '.tmp-gated-diff-'))
  try {
    const a = path.join(dir, 'a')
    const b = path.join(dir, 'b')
    await writeFile(a, beforeText, 'utf8')
    await writeFile(b, afterText, 'utf8')
    try {
      await execFileAsync('git', ['diff', '--no-index', '--unified=3', '--', a, b], { cwd: ROOT })
      return ''
    } catch (error) {
      // `git diff --no-index` exits 1 when the files differ, which is the case
      // this function exists for.
      const out = String(error.stdout || '')
      return out
        .replace(/^diff --git .*$/m, `diff --git a/${file} b/${file}`)
        .replace(/^--- .*$/m, `--- a/${file}`)
        .replace(/^\+\+\+ .*$/m, `+++ b/${file}`)
    }
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

/* ── State, for the tests and for the dirty-tree check ───────────────────── */

/**
 * Where each of the four stands against a given set of file contents.
 *
 * 'applied'  — the target already carries what the patch grants
 * 'pending'  — the patch is not in, and applies cleanly
 * 'partial'  — one half is in and the other is not
 * 'stale'    — the patch is not in and NO LONGER APPLIES. This is the state the
 *              guard test exists for: an approved patch that cannot be applied
 *              is a design that has to be redone at the worst possible moment.
 */
export async function patchStates(opts = {}) {
  const { steps } = await planGatedPatches(opts)
  const out = new Map()
  const map = {
    skipped: 'applied',
    applied: 'pending',
    completed: 'partial',
    failed: 'stale',
    // Only reachable when an EARLIER patch went stale: the rules patches are
    // written against each other's output, so nothing after a failure can be
    // judged. Reported honestly rather than as a second failure.
    'not-reached': 'unknown',
  }
  for (const step of steps) out.set(step.id, map[step.status] || 'unknown')
  return out
}

/** The undo the founder is handed the moment anything goes wrong. */
export function undoCommand(files = TARGET_FILES) {
  return `git checkout -- ${files.join(' ')}`
}

export const patchById = (id) => GATED_PATCHES.find((p) => p.id === id)

export { abs as repoPath }
