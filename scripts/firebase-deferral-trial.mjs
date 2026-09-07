// Build the Firebase deferral AS DESIGNED — including the two founder-gated
// files — without a byte changing in either of them.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY THIS EXISTS
// ─────────────────────────────────────────────────────────────────────────────
// `firebase-critical-path` is blocked on a design, and the design needs
// `src/contexts/AuthContext.jsx` and `src/contexts/SubscriptionContext.jsx` to
// stop importing the Firebase SDK statically. Both are founder-gated
// (docs/reference/human-validation-zones.md), so the change ships as an
// UNAPPLIED patch — `docs/design/firebase-deferral-gated.patch` — for the
// founder to approve and apply.
//
// An unapplied patch cannot be measured, and a design nobody can price is an
// argument rather than evidence. That is what this closes. It applies the
// patch to TEMPORARY COPIES beside the originals, aliases those copies in for
// one build, and deletes them again. The gated files are read and never
// written; `git status` is clean before and after.
//
// The patch is the single source of truth: the copies are produced BY applying
// it, so a trial build can never measure something the patch does not say. If
// the patch has gone stale against the tree, `git apply` fails here and the
// script stops rather than measuring a fiction.
//
// ─────────────────────────────────────────────────────────────────────────────
// USAGE
// ─────────────────────────────────────────────────────────────────────────────
//   node scripts/firebase-deferral-trial.mjs         # build the trial into dist/
//   npx vite preview --host 127.0.0.1 --port 4599 --strictPort &
//   node scripts/home-field-metrics.mjs http://127.0.0.1:4599 10 trial.json
//   # then kill the preview server
//
// Compare against the same two commands on a plain `npm run build`.
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PATCH = path.join(ROOT, 'docs/design/firebase-deferral-gated.patch')

// The gated files, and the throwaway name each is copied to. `.trial.jsx` is
// gitignored so a crashed run cannot leave a second auth implementation sitting
// in the tree pretending to be reviewed code.
const GATED = ['src/contexts/AuthContext.jsx', 'src/contexts/SubscriptionContext.jsx']
const trialName = (rel) => rel.replace(/\.jsx$/, '.trial.jsx')

const created = []
const cleanup = () => {
  for (const f of created) { try { fs.unlinkSync(f) } catch { /* already gone */ } }
}

function run(cmd, args, extraEnv = {}) {
  execFileSync(cmd, args, { cwd: ROOT, stdio: 'inherit', env: { ...process.env, ...extraEnv }, shell: process.platform === 'win32' })
}

try {
  if (!fs.existsSync(PATCH)) throw new Error(`missing ${path.relative(ROOT, PATCH)}`)

  // 1. The patch must still describe the tree it is against. A stale patch is
  //    the one failure mode that would otherwise produce a confident wrong
  //    number, so it is checked before anything is written.
  execFileSync('git', ['apply', '--check', PATCH], { cwd: ROOT, stdio: 'pipe' })

  // 2. Copy each gated file to its trial name, then apply the patch REDIRECTED
  //    at the copies. Only the file headers are rewritten — every hunk, every
  //    context line and every offset is the committed patch, unmodified.
  let redirected = fs.readFileSync(PATCH, 'utf8')
  for (const rel of GATED) {
    const src = path.join(ROOT, rel)
    const dst = path.join(ROOT, trialName(rel))
    fs.copyFileSync(src, dst)
    created.push(dst)
    redirected = redirected.split(rel).join(trialName(rel))
  }
  const tmpPatch = path.join(ROOT, '.firebase-deferral-trial.patch')
  fs.writeFileSync(tmpPatch, redirected)
  created.push(tmpPatch)
  execFileSync('git', ['apply', '--whitespace=nowarn', tmpPatch], { cwd: ROOT, stdio: 'pipe' })

  // 3. A Vite config that wraps the real one and adds the two trial aliases on
  //    top of whatever VITE_DEFER_FIREBASE already put there. Written next to
  //    vite.config.js so its relative import and `import.meta.dirname` resolve
  //    exactly as the real config's do.
  const trialConfig = path.join(ROOT, 'vite.config.trial.mjs')
  fs.writeFileSync(trialConfig, `import base from './vite.config.js'
import { resolve } from 'node:path'
const alias = (name, file) => ({
  find: new RegExp(\`^(?:\\\\.\\\\.?/)+(?:contexts/)?\${name}$\`),
  replacement: resolve(import.meta.dirname, file),
})
export default (env) => {
  const config = typeof base === 'function' ? base(env) : base
  config.resolve = config.resolve || {}
  config.resolve.alias = [
    alias('AuthContext', 'src/contexts/AuthContext.trial.jsx'),
    alias('SubscriptionContext', 'src/contexts/SubscriptionContext.trial.jsx'),
    ...(config.resolve.alias || []),
  ]
  return config
}
`)
  created.push(trialConfig)

  console.log('firebase-deferral-trial: building with the gated patch applied to temporary copies')
  run('npx', ['vite', 'build', '-c', 'vite.config.trial.mjs'], { VITE_DEFER_FIREBASE: '1' })
  run('node', ['scripts/prerender.mjs'])
  console.log('\nfirebase-deferral-trial: dist/ now holds the deferred build. The gated files were never written.')
} finally {
  cleanup()
}
