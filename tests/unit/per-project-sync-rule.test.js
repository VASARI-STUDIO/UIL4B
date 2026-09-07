// THE FOUNDER-GATED RULE, GUARDED WHERE IT CAN SILENTLY STOP BEING TRUE.
//
// The per-project sync shape (`project-sync-single-document`, 2026-09-06
// engineering review) needs one rule added to firestore.rules, and that file is
// founder-gated — it cannot be staged from an agent branch. So the rule ships as
// a committed, UNAPPLIED diff and the client half ships gated OFF behind
// PER_PROJECT_SYNC_ENABLED.
//
// That arrangement has four ways of going quietly wrong, and all four leave the
// build green:
//
//   1. THE PATCH GOES STALE. firestore.rules changes underneath it, the patch
//      stops applying, and the design becomes unappliable at the exact moment
//      it is approved. This is the failure #390 and the firebase-deferral patch
//      both had to guard, for the same reason.
//   2. THE PATCH LOSES ITS RULE. Someone regenerates it against the wrong tree
//      and it applies cleanly while granting nothing.
//   3. THE GATE OPENS EARLY. PER_PROJECT_SYNC_ENABLED flips to true while the
//      rule is still unapplied, so every client write to
//      users/{uid}/projects/{id} is refused in production. That is not a
//      degraded sync — it is a total one, and it would arrive as the very
//      "silent failure" this whole change exists to abolish.
//   4. THE PATCH IS QUIETLY APPLIED ANYWAY. If firestore.rules already carries
//      the rule, the gate should have opened with it; a repository in which
//      both are true and the gate is shut is a repository shipping a fix it has
//      already paid for.
//
// These run on every `npm run test:unit`, with no emulator. Whether the rule
// GRANTS AND REFUSES what it claims is a different question, answered against
// the real emulator in tests/rules/per-project-sync.test.js.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {
  applyRulesPatchToCopy, RULE_MATCHER, RULES_PATH, PATCH_PATH,
} from '../../scripts/per-project-rules-patch.mjs'
import { PER_PROJECT_SYNC_ENABLED } from '../../src/utils/projectSync.js'

const readRules = () => fs.readFileSync(RULES_PATH, 'utf8')

test('the gated rules patch still applies to firestore.rules', async () => {
  // Guard 1. If this fails, the design is unappliable — regenerate the patch
  // against the current file rather than editing the error away.
  const { patched, original } = await applyRulesPatchToCopy()
  assert.notEqual(patched, original, 'applying the patch must actually change something')
})

test('applying it never writes the founder-gated file', async () => {
  const before = readRules()
  await applyRulesPatchToCopy()
  assert.equal(readRules(), before,
    'firestore.rules must be byte-identical after the patch has been applied to a copy')
})

test('the patch grants the owner-only rule the client is waiting on', async () => {
  // Guard 2. A patch that applies cleanly and grants nothing is worse than no
  // patch: it would be approved, merged, and change nothing at all.
  const { patched } = await applyRulesPatchToCopy()
  assert.match(patched, RULE_MATCHER)

  // It must sit INSIDE the users/{userId} block, or `isOwner()` is not in scope
  // and the rule fails to compile. The emulator test proves it compiles; this
  // says where it has to be for that to be possible.
  const usersBlock = patched.slice(
    patched.indexOf('match /users/{userId}'),
    patched.indexOf('// Feedback'),
  )
  assert.match(usersBlock, RULE_MATCHER,
    'the rule must be nested inside match /users/{userId}, where isOwner() exists')
})

test('the patch adds a rule and takes nothing away', async () => {
  // The blast radius, asserted rather than described. Every line the current
  // file has must survive; the diff may only add.
  const { patched, original } = await applyRulesPatchToCopy()
  for (const line of original.split(/\r?\n/)) {
    if (!line.trim()) continue
    assert.ok(patched.includes(line),
      `the patch must not remove or alter an existing rule line: ${line.trim()}`)
  }
})

test('the rule is NOT yet in firestore.rules, and the client is gated because of it', async () => {
  // Guards 3 and 4, as one statement, because they are two halves of the same
  // invariant: the client flag and the deployed rule must agree.
  const ruleIsLive = RULE_MATCHER.test(readRules())

  if (!ruleIsLive) {
    assert.equal(PER_PROJECT_SYNC_ENABLED, false,
      'users/{uid}/projects/{id} has no rule yet, so a client that wrote there would be ' +
      'refused on every push. PER_PROJECT_SYNC_ENABLED must stay false until the rule lands.')
  } else {
    // The happy day this test is written to survive: the founder applied the
    // patch. Then the gate is meant to open, and leaving it shut ships a fix
    // that has already been approved and paid for.
    assert.equal(PER_PROJECT_SYNC_ENABLED, true,
      'the rule is now in firestore.rules — turn PER_PROJECT_SYNC_ENABLED on, ' +
      'and delete the patch and this branch of the test with it.')
  }
})

test('the patch is committed where the PR body says it is', () => {
  assert.ok(fs.existsSync(PATCH_PATH),
    'docs/design/per-project-sync-rules.patch is named in the PR under FOUNDER APPROVAL NEEDED')
  const patch = fs.readFileSync(PATCH_PATH, 'utf8')
  assert.match(patch, /^diff --git a\/firestore\.rules b\/firestore\.rules/m,
    'and must be a real unified diff against that one file')
  assert.equal(patch.split('diff --git').length - 1, 1,
    'and must touch exactly one file — a gated patch that reaches further is a different review')
})
