// CLAUDE.md NAMES THREE THINGS THAT LIVE OUTSIDE THIS REPOSITORY.
//
// The founder asked on 2026-09-14 whether we were using the LLM wiki, the
// Mobbin MCP and the skills he has. The review on 2026-09-15 found all three
// real and none of them named in CLAUDE.md, so each was used only when an
// agent happened to remember it. They are named there now.
//
// A path in a document is a claim, and this is the one kind of claim in
// CLAUDE.md that nothing else checks: the doc-authority map covers files
// inside the repository, and a broken link to a vault page fails silently by
// simply never being opened. That is the same failure mode as an agent not
// knowing the wiki exists, which is what the section was written to end.
//
// ── WHY HALF OF THIS SKIPS ON CI ────────────────────────────────────────────
// The vault is on the founder's machine, not in the repository, and CI runs on
// ubuntu-latest where `d:/` does not exist. Making the whole file conditional
// would mean a deleted section passes everywhere; making it unconditional
// would fail every CI run. So the TEXT assertions always run — CI is where a
// deleted section gets caught — and only the on-disk checks skip, loudly, when
// the vault is not mounted.
//
// It checks EXISTENCE, not content. What is in those files is the vault's
// business and is audited under its own contract.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const claude = fs.readFileSync(path.join(process.cwd(), 'CLAUDE.md'), 'utf8')

/** Every absolute path CLAUDE.md points at outside this repository. */
const OUTSIDE = [...claude.matchAll(/`([a-zA-Z]:\/[^`]+)`/g)].map((m) => m[1])
const wikiDir = OUTSIDE.find((p) => p.endsWith('/wiki/'))
const skillsDir = OUTSIDE.find((p) => p.endsWith('/.claude/skills/'))
const mounted = Boolean(wikiDir) && fs.existsSync(wikiDir)

test('CLAUDE.md still points at the wiki, the vault skills and the vault contract', () => {
  // Text only, so this runs on CI too — a deleted section is caught there.
  const want = ['/wiki/', '/.claude/skills/', '/CLAUDE.md']
  for (const fragment of want) {
    assert.ok(OUTSIDE.some((p) => p.includes(fragment)),
      'CLAUDE.md no longer references a vault path containing ' + fragment)
  }
  assert.ok(OUTSIDE.length >= 3, 'expected at least three vault paths, found ' + OUTSIDE.length)
  // Named by filename rather than by path: it is the one page the founder's
  // recurring "AI generated" verdict maps onto.
  assert.match(claude, /principle-ai-slop-diagnostic\.md/)
  assert.match(claude, /search_flows/, 'the Mobbin tools are no longer named')
})

test('the subagent roster CLAUDE.md names is the roster on disk', () => {
  const roles = fs.readdirSync(path.join(process.cwd(), '.claude/agents'))
    .filter((f) => f.endsWith('.md') && f !== 'README.md')
  assert.equal(roles.length, 5, 'the roster changed; CLAUDE.md says five roles')
})

test('every vault path CLAUDE.md names is on disk', { skip: !mounted && 'the vault is not mounted here' }, () => {
  // A path that has moved is worse than no path: an agent reads it, finds
  // nothing, and concludes the asset does not exist.
  const missing = OUTSIDE.filter((p) => !fs.existsSync(p))
  assert.deepEqual(missing, [], 'CLAUDE.md points at paths that are not there')
  assert.ok(fs.existsSync(path.join(wikiDir, 'principle-ai-slop-diagnostic.md')),
    'the slop diagnostic has moved or been renamed')
  assert.ok(fs.existsSync(path.join(wikiDir, 'index.md')),
    'the wiki index CLAUDE.md tells you to start at is gone')
})

test('the skill counts in CLAUDE.md are the counts on disk', { skip: !mounted && 'the vault is not mounted here' }, () => {
  // POSITIVE CONTROL for the section, and CLAUDE.md's own rule applied to
  // itself: a hand-maintained number is probably stale, so re-count it.
  const repoSkills = fs.readdirSync(path.join(process.cwd(), '.claude/skills'))
    .filter((f) => !f.startsWith('.') && f !== 'README.md')
  const vaultSkills = fs.readdirSync(skillsDir).filter((f) => !f.startsWith('.'))

  const claimed = claude.match(/(\d+) of them, alongside this repo's own (\d+)/)
  assert.ok(claimed, 'the skill counts sentence has been reworded — re-check the numbers')
  assert.equal(Number(claimed[1]), vaultSkills.length,
    'CLAUDE.md claims ' + claimed[1] + ' vault skills, there are ' + vaultSkills.length)
  assert.equal(Number(claimed[2]), repoSkills.length,
    'CLAUDE.md claims ' + claimed[2] + ' repo skills, there are ' + repoSkills.length)
})
