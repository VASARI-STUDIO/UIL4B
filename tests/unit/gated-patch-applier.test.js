// THE ONE COMMAND, GUARDED WHERE IT CAN SILENTLY STOP WORKING.
//
// `npm run apply:gated` is the founder's whole path to four approved changes he
// cannot otherwise get: three of them edit files the Claude Code auto-mode
// classifier refuses to stage, so no agent can commit them and no agent will
// notice when they rot. The command is written once and run once, months later,
// by somebody who cannot read the diff — which is the worst possible moment to
// discover any of the following, and every one of them leaves the build green:
//
//   1. A PATCH GOES STALE. The file it was written against moves, `git apply`
//      stops matching, and the design becomes unappliable at the exact moment
//      it is approved. This is the failure #390, #418, #427 and the
//      per-project sync design all had to guard, for the same reason.
//   2. A PATCH APPLIES AND GRANTS NOTHING. Someone regenerates it against the
//      wrong tree; it lands cleanly and changes no rule. Worse than stale,
//      because it reports success.
//   3. THE APPLIER STOPS COVERING ONE. A patch is quietly dropped from the
//      registry, and four changes silently become three. The founder is told
//      everything is done.
//   4. THE SCRIPT ENTRY GOES. `apply:gated` disappears from package.json and
//      the command in docs/OWNER-ACTIONS.md is a command that does not exist.
//
// This file is the sibling of tests/unit/per-project-sync-rule.test.js, which
// does exactly this for the fourth patch alone, and it reuses that file's
// helpers rather than re-deriving them — scripts/gated-patches.mjs is now where
// RULE_MATCHER lives, and per-project-rules-patch.mjs re-exports it.
//
// NO EMULATOR AND NO BUILD. Whether the rules GRANT and REFUSE what they claim
// is a different question, answered in tests/rules/; whether the deferred build
// actually moves the chunk is answered by vite.config.js's own graph walk under
// VITE_DEFER_FIREBASE=1. These run on every `npm run test:unit`.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  GATED_PATCHES, TARGET_FILES, ROOT, planGatedPatches, patchStates, undoCommand, lf,
} from '../../scripts/gated-patches.mjs'
import { RULE_MATCHER } from '../../scripts/per-project-rules-patch.mjs'

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8')

/** The four, by id, in the order the applier applies them. */
const EXPECTED_IDS = [
  'per-project-sync',
  'moderator-role',
  'feedback-bounds',
  'firebase-deferral',
]

/* ═══════════════════════════════════════════════════════════════════════════
   1 · The applier still covers all four
   ═══════════════════════════════════════════════════════════════════════════ */

test('the applier covers exactly the four gated changes, in the order that composes', () => {
  // Guard 3. Written out rather than derived from the registry it is checking —
  // a list read off the thing under test agrees with it by construction and
  // measures nothing.
  assert.deepEqual(GATED_PATCHES.map((p) => p.id), EXPECTED_IDS)
})

test('every patch says what it touches, where it came from, and what it grants', () => {
  // The summary the founder reads is assembled from these three fields. A patch
  // with an empty `grants` prints a blank line where the sentence he acts on
  // should be, and nothing else in the suite would notice.
  for (const patch of GATED_PATCHES) {
    assert.ok(patch.title?.length > 3, `${patch.id}: no title`)
    assert.ok(patch.grants?.length > 30, `${patch.id}: no plain-words sentence for the summary`)
    assert.ok(patch.source?.length > 3, `${patch.id}: does not name where its diff came from`)
    assert.ok(patch.files?.length >= 1, `${patch.id}: touches no files`)
    for (const file of patch.files) {
      assert.ok(fs.existsSync(path.join(ROOT, file)), `${patch.id}: ${file} does not exist`)
    }
    assert.ok(patch.parts?.length >= 1, `${patch.id}: has nothing to apply`)
  }
})

test('the applier reaches every file the four are meant to change', () => {
  // The three files the classifier blocks are the entire reason this command
  // exists. If one falls out of the registry, the command still reports four
  // successes and the founder still cannot make the change.
  assert.ok(TARGET_FILES.includes('firestore.rules'))
  assert.ok(TARGET_FILES.includes('src/contexts/AuthContext.jsx'))
  assert.ok(TARGET_FILES.includes('src/contexts/SubscriptionContext.jsx'))
  assert.ok(TARGET_FILES.includes('src/utils/projectSync.js'))
  assert.equal(TARGET_FILES.length, 4, 'the applier has grown a target nobody reviewed')
})

/* ═══════════════════════════════════════════════════════════════════════════
   2 · No patch has gone stale
   ═══════════════════════════════════════════════════════════════════════════ */

test('all four still apply to the files they were written for', async () => {
  // Guard 1, and the reason this file runs on every unit test rather than on
  // the day somebody remembers. `patchStates` plans the whole run against the
  // real tree without writing a byte of it.
  //
  // 'applied' is a passing answer: the founder has run the command. 'stale' is
  // the failure, and 'unknown' means an earlier patch went stale and this one
  // could not be judged — which is a failure of the run, not of this patch, and
  // is reported as such rather than hidden.
  const states = await patchStates()
  const bad = [...states].filter(([, s]) => s !== 'applied' && s !== 'pending' && s !== 'partial')
  assert.deepEqual(
    bad, [],
    'these gated patches no longer apply to the tree they were written for. An approved patch that '
    + 'cannot be applied is a design that has to be redone at the worst possible moment. Regenerate '
    + 'the diff from its pull request — do not weaken what it grants to make it fit.',
  )
  assert.equal(states.size, 4)
})

test('each patch actually grants its rule — applying cleanly is not enough', async () => {
  // Guard 2. `planGatedPatches` re-runs each patch's own detector against the
  // RESULT and throws if the patch applied and granted nothing, so this asserts
  // the plan completed rather than re-deriving the check. The four detectors
  // are then spelled out below against the planned text, because a detector
  // that had drifted to something trivially true would satisfy the planner.
  const plan = await planGatedPatches()
  assert.equal(plan.failed, false, plan.steps.find((s) => s.error)?.error?.message)
  const rules = lf(plan.after.get('firestore.rules'))
  const sync = lf(plan.after.get('src/utils/projectSync.js'))
  const auth = lf(plan.after.get('src/contexts/AuthContext.jsx'))
  const subs = lf(plan.after.get('src/contexts/SubscriptionContext.jsx'))

  // 1 · per-project sync — the rule AND the flag, which are one change.
  assert.match(rules, RULE_MATCHER, 'per-project sync: the rule is missing from the result')
  assert.ok(sync.includes('export const PER_PROJECT_SYNC_ENABLED = true'),
    'per-project sync: the rule lands and the client stays switched off, which ships nothing')

  // 2 · moderator role — the claim is honoured on all three review collections,
  //     and NOT on the two the review deliberately left alone.
  assert.match(rules, /function isReviewer\(\)/)
  assert.match(rules, /request\.auth\.token\.moderator == true/)
  assert.match(rules, /allow read, update, delete: if isReviewer\(\);/, 'feedback')
  assert.match(rules, /allow update, delete: if isReviewer\(\);/, 'community-prompts')
  assert.match(rules, /allow delete: if isReviewer\(\) \|\| isOwner\(\);/, 'community-submissions')

  // 3 · feedback create closed, signed-in writes bounded.
  assert.match(rules, /match \/feedback\/\{feedbackId\}[\s\S]*?allow create: if false;/)
  assert.match(rules, /function promptShapeOk\(\)/)
  assert.match(rules, /function submissionShapeOk\(\)/)
  assert.ok(rules.includes("day.matches('^[0-9]{4}-[0-9]{2}-[0-9]{2}$')"))

  // 4 · the deferral closes BOTH static edges. One is worse than none: the SDK
  //     stays in the first wave and splits across two preloaded chunks.
  assert.ok(auth.includes("from '../utils/firebaseAccess'"))
  assert.ok(!/^import \{[\s\S]*?\} from 'firebase\/auth'/m.test(auth),
    'AuthContext still imports firebase/auth statically after the patch')
  assert.ok(subs.includes("import { loadFirestore, loadAuthSdk } from '../utils/firebaseAccess'"))
  assert.ok(!/^import \{ doc, onSnapshot \} from 'firebase\/firestore'/m.test(subs),
    'SubscriptionContext still imports firebase/firestore statically after the patch')
})

test('nothing the four grant is taken away from the file they land in', async () => {
  // The blast radius, asserted rather than described. The rules patches may
  // replace lines — the moderator role rewrites three of them — so this checks
  // the two properties that would be a real widening if they went: the billing
  // lock on users/{uid}, and the fact that reading the analytics counters is
  // still gated to one email rather than to any reviewer.
  const plan = await planGatedPatches()
  const rules = lf(plan.after.get('firestore.rules'))
  assert.match(rules, /function lockedUserFields\(\)[\s\S]*?'lifetimeEntitlement', 'subscription', 'stripeCustomerId'/,
    'the billing fields are no longer locked on users/{uid}')
  assert.match(rules, /allow read: if request\.auth != null && request\.auth\.token\.email == 'dylanjacob1100@gmail\.com';/,
    'analytics-daily read was widened — reviewing submissions is not a reason to hand over usage analytics')
  assert.doesNotMatch(rules, /provider-health/,
    'the server-only counter now has a rules block, which makes it reachable from a client')
})

/* ═══════════════════════════════════════════════════════════════════════════
   3 · The command the founder types
   ═══════════════════════════════════════════════════════════════════════════ */

test('package.json still carries the apply:gated script', () => {
  // Guard 4. docs/OWNER-ACTIONS.md tells the founder to type exactly this.
  const pkg = JSON.parse(read('package.json'))
  assert.equal(pkg.scripts['apply:gated'], 'node scripts/apply-gated-patches.mjs',
    'the one command docs/OWNER-ACTIONS.md §1.3 tells the founder to run is gone from package.json')
  assert.ok(fs.existsSync(path.join(ROOT, 'scripts/apply-gated-patches.mjs')))
})

test('the owner document names the command and still shows the diffs', () => {
  // The document is the artefact: a founder who cannot find the command cannot
  // run it, and a document that only names the command has taken away the
  // diffs he was told to review.
  const doc = read('docs/OWNER-ACTIONS.md')
  assert.match(doc, /npm run apply:gated/,
    'docs/OWNER-ACTIONS.md no longer names the one command that applies these')
  assert.match(doc, /firestore\.rules/)
  assert.match(doc, /isReviewer\(\)/,
    'the moderator diff is no longer shown in the document — the reader who wants to see it cannot')
  assert.match(doc, /api\/verify-admin\.js/,
    'the document must still say which half of the moderator role the command does NOT apply')
})

test('the undo is one command, and it names every file the applier writes', () => {
  // It is printed on every failure path, and it is the only thing standing
  // between a failed check and a founder who cannot get back to where he was.
  const undo = undoCommand()
  assert.match(undo, /^git checkout -- /)
  for (const file of TARGET_FILES) assert.ok(undo.includes(file), `the undo does not restore ${file}`)
})

/* ═══════════════════════════════════════════════════════════════════════════
   4 · The applier never writes the gated files by planning
   ═══════════════════════════════════════════════════════════════════════════ */

test('planning the run leaves every gated file byte-identical', async () => {
  // The guarantee the whole design rests on, asserted rather than intended: a
  // dry run, this test, and the guard suite all plan the full run, and none of
  // them may touch the originals. The first draft of the per-project applier
  // did apply-read-reverse against the working tree, and a process killed
  // between the second and third step would have left a founder-gated file
  // modified on an agent's branch.
  const before = TARGET_FILES.map((f) => read(f))
  await planGatedPatches()
  const after = TARGET_FILES.map((f) => read(f))
  assert.deepEqual(after, before,
    'planning the gated patches modified a file it is only ever allowed to read')
})

test('the plan is deterministic — two runs produce the same bytes', async () => {
  // Idempotence at the level the founder experiences it: running the command
  // twice must leave the tree exactly where the first run left it. Proved here
  // on the plan rather than the tree, so it runs on every unit test without
  // writing anything.
  const a = await planGatedPatches()
  const b = await planGatedPatches({ seed: (f) => a.after.get(f) })
  assert.equal(b.failed, false)
  assert.deepEqual(
    b.steps.map((s) => s.status), ['skipped', 'skipped', 'skipped', 'skipped'],
    'a second run must find all four already applied and do nothing',
  )
  for (const file of TARGET_FILES) {
    assert.equal(lf(b.after.get(file)), lf(a.after.get(file)),
      `${file} is not byte-identical after a second run — the command is not idempotent`)
  }
})
