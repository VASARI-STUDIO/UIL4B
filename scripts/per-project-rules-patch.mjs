// APPLY THE FOUNDER-GATED RULES PATCH TO A COPY, AND NEVER TO THE ORIGINAL.
//
// ═══════════════════════════════════════════════════════════════════════════
// WHY THIS EXISTS
// ═══════════════════════════════════════════════════════════════════════════
// `firestore.rules` is founder-gated (docs/reference/human-validation-zones.md).
// The per-project sync shape needs one rule added to it, and that rule cannot be
// staged from an agent branch — the auto-mode classifier refuses the file
// whether or not a permission has been granted. #390 hit the same wall.
//
// So the rule lives as a committed, UNAPPLIED diff
// (docs/design/per-project-sync-rules.patch), and everything that has to reason
// about it reasons about a temporary copy produced here:
//
//   · tests/unit/per-project-sync-rule.test.js  — is the patch still appliable,
//     is it still unapplied, and is the client still gated behind it? Runs on
//     every `npm run test:unit`, no emulator required.
//   · tests/rules/per-project-sync.test.js      — does the rule actually grant
//     and refuse what it claims? Runs against the real Firestore emulator.
//
// ═══════════════════════════════════════════════════════════════════════════
// THE ONE RULE THIS FILE FOLLOWS
// ═══════════════════════════════════════════════════════════════════════════
// THE GATED FILE IS READ AND NEVER WRITTEN. Not even briefly, not even with a
// restore afterwards — the first draft of this did apply-read-reverse against
// the working tree, and a process killed between the second and third step
// would have left a founder-gated file modified on an agent's branch. Instead
// the file is COPIED into a scratch directory whose name appears in the diff's
// target path via `git apply --directory`, so every byte git writes lands
// inside that directory.
//
// `git apply` rather than a hand-rolled splice, for the reason the
// firebase-deferral trial gives: a patch verified by a bespoke applier is a
// patch verified against something other than what the founder will run.
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdtemp, readFile, writeFile, rm, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { RULE_MATCHER } from './gated-patches.mjs'

const execFileAsync = promisify(execFile)

export const ROOT = fileURLToPath(new URL('../', import.meta.url))
export const RULES_PATH = path.join(ROOT, 'firestore.rules')
export const PATCH_PATH = path.join(ROOT, 'docs/design/per-project-sync-rules.patch')

/**
 * The rule the patch is for. Both test files assert against this one string.
 *
 * It now LIVES in scripts/gated-patches.mjs, which is the single registry the
 * applier and its guard test both read, and is re-exported here so every
 * existing caller keeps working. One definition, because two would drift and
 * the day they drifted is the day the founder applied the wrong thing.
 */
export { RULE_MATCHER }

/**
 * firestore.rules with the patch applied, as a string.
 *
 * ALREADY APPLIED IS NOT A FAILURE. Once the founder has run
 * `npm run apply:gated`, the rule is in the file and `git apply` refuses — so a
 * helper that only knew how to apply would turn the successful day into a red
 * suite. When the rule is already there the file is returned as it stands, with
 * `alreadyApplied: true`, and every caller's assertion about the RESULT still
 * holds because the result is the same either way.
 *
 * @param {object} [opts]
 * @param {boolean} [opts.keepDir] leave the scratch directory for debugging
 * @returns {Promise<{ patched: string, original: string, alreadyApplied: boolean }>}
 * @throws if the patch no longer applies AND is not already in — which is the
 *         whole point of running it on every unit test: a design that has gone
 *         stale against the tree it was written for becomes unappliable exactly
 *         when it is approved.
 */
export async function applyRulesPatchToCopy(opts = {}) {
  const original = await readFile(RULES_PATH, 'utf8')

  if (RULE_MATCHER.test(original)) {
    return { patched: original, original, alreadyApplied: true }
  }

  // Inside the repo, because `git apply --directory` resolves relative to the
  // repository root and refuses to escape it. Uniquely named, because every
  // agent on this machine shares one scratch space and a fixed name collides
  // mid-use.
  const scratch = await mkdtemp(path.join(ROOT, '.tmp-rules-patch-'))
  const relative = path.basename(scratch)
  try {
    await mkdir(scratch, { recursive: true })
    await writeFile(path.join(scratch, 'firestore.rules'), original, 'utf8')
    try {
      await execFileAsync('git', [
        'apply', '--unsafe-paths', `--directory=${relative}`, PATCH_PATH,
      ], { cwd: ROOT })
    } catch (error) {
      throw new Error(
        'docs/design/per-project-sync-rules.patch no longer applies to firestore.rules. ' +
        'The rule the per-project sync design needs has gone stale against the file it ' +
        'was written for, which would make the design unappliable exactly when it is ' +
        `approved. Regenerate the patch. Underlying error: ${error.message}`,
      )
    }
    const patched = await readFile(path.join(scratch, 'firestore.rules'), 'utf8')

    // The guarantee this module is built to make, asserted rather than intended.
    const after = await readFile(RULES_PATH, 'utf8')
    if (after !== original) {
      throw new Error('the gated firestore.rules was modified; it must only ever be read')
    }
    return { patched, original, alreadyApplied: false }
  } finally {
    if (!opts.keepDir) await rm(scratch, { recursive: true, force: true })
  }
}
