// THE PER-PROJECT SYNC RULE, AND THE CLIENT FLAG THAT DEPENDS ON IT.
//
// The client writes users/{uid}/projects/{id} only while
// PER_PROJECT_SYNC_ENABLED is true, and those writes succeed only if
// firestore.rules grants the collection. docs/design/per-project-sync-rules.patch
// is that rule as a unified diff against firestore.rules, applied by
// `npm run apply:gated`. These tests keep the three in agreement:
//
//   1. The patch applies to firestore.rules, or is already applied.
//   2. The patch grants the owner-only rule, inside match /users/{userId}.
//   3. The patch only adds lines.
//   4. The flag is on exactly when the rule is in firestore.rules. A flag on
//      without the rule would have every project push refused; a rule without
//      the flag would leave the client on the single-document shape.
//
// These run on every `npm run test:unit`, with no emulator. Whether the rule
// grants and refuses what it claims is tested against the emulator in
// tests/rules/per-project-sync.test.js.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {
  applyRulesPatchToCopy, RULE_MATCHER, RULES_PATH, PATCH_PATH,
} from '../../scripts/per-project-rules-patch.mjs'
import { PER_PROJECT_SYNC_ENABLED } from '../../src/utils/projectSync.js'

const readRules = () => fs.readFileSync(RULES_PATH, 'utf8')

test('the rules patch applies to firestore.rules, or is already applied', async () => {
  // An applied patch has nothing left to change, so it must return the file
  // untouched; an unapplied one must change it. What it may never be is
  // "applies cleanly and grants nothing" — that is the next test.
  const { patched, original, alreadyApplied } = await applyRulesPatchToCopy()
  if (alreadyApplied) {
    assert.equal(patched, original, 'an applied patch must return the file untouched')
  } else {
    assert.notEqual(patched, original, 'applying the patch must actually change something')
  }
})

test('applying it to a copy never writes firestore.rules', async () => {
  const before = readRules()
  await applyRulesPatchToCopy()
  assert.equal(readRules(), before,
    'firestore.rules must be byte-identical after the patch has been applied to a copy')
})

test('the patch grants the owner-only rule the client depends on', async () => {
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
  // Every line the current file has must survive; the diff may only add.
  const { patched, original } = await applyRulesPatchToCopy()
  for (const line of original.split(/\r?\n/)) {
    if (!line.trim()) continue
    assert.ok(patched.includes(line),
      `the patch must not remove or alter an existing rule line: ${line.trim()}`)
  }
})

test('the client flag is on exactly when firestore.rules carries the rule', async () => {
  const ruleIsLive = RULE_MATCHER.test(readRules())
  assert.equal(PER_PROJECT_SYNC_ENABLED, ruleIsLive,
    ruleIsLive
      ? 'firestore.rules grants users/{uid}/projects/{id}, so PER_PROJECT_SYNC_ENABLED must be true'
      : 'firestore.rules has no rule for users/{uid}/projects/{id}, so a client writing there ' +
        'would be refused on every push: PER_PROJECT_SYNC_ENABLED must be false')
})

test('the patch is a unified diff of firestore.rules alone', () => {
  assert.ok(fs.existsSync(PATCH_PATH), 'docs/design/per-project-sync-rules.patch must exist')
  const patch = fs.readFileSync(PATCH_PATH, 'utf8')
  assert.match(patch, /^diff --git a\/firestore\.rules b\/firestore\.rules/m,
    'and must be a real unified diff against that one file')
  assert.equal(patch.split('diff --git').length - 1, 1,
    'and must touch exactly one file')
})
