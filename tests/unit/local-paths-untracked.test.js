// Local working files sit at the repository root beside the source: handover notes,
// memory, QA probes, logs and screenshots. .gitignore keeps them out, but a forced add
// or a rule removed by mistake would publish them. This reads the index itself.
import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'

export const LOCAL_ONLY = [
  /^handover\//,
  /^memory\//,
  /^_qa_/,
  /^qa-/,
  /^qa[^/]*\.mjs$/,
  /^\.claude-[^/]*\.log$/,
  /^[^/]+\.png$/,
  /^x$/,
]

export const localOnly = (paths) => paths.filter((p) => LOCAL_ONLY.some((re) => re.test(p)))

test('the patterns catch local working files and leave source alone', () => {
  assert.deepEqual(localOnly([
    'handover/notes.md', 'memory/a.md', '_qa_run.js', 'qa-shot.mjs', 'qa1.mjs',
    '.claude-build.log', 'probe.png', 'x',
    'src/x', 'public/previews/coffee-pouch.webp', 'public/og.png', 'tests/user-sim/qa-helpers.js', 'src/memory/index.js',
  ]), ['handover/notes.md', 'memory/a.md', '_qa_run.js', 'qa-shot.mjs', 'qa1.mjs', '.claude-build.log', 'probe.png', 'x'])
})

test('no local working file is tracked', () => {
  const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).split('\0').filter(Boolean)
  assert.ok(tracked.length > 100, 'git ls-files returned too little to be this repository')
  assert.deepEqual(localOnly(tracked), [], 'these local working files are tracked; remove them from the index and keep them on disk')
})

test('.gitignore keeps every local working path out', () => {
  const probe = ['handover/a.md', 'memory/a.md', '_qa_a.js', 'qa-a.js', 'qa1.mjs', '.claude-a.log', 'a.png', 'x']
  const ignored = execFileSync('git', ['check-ignore', '--no-index', ...probe], { encoding: 'utf8' }).split(/\r?\n/).filter(Boolean)
  assert.deepEqual(ignored.sort(), [...probe].sort())
})
