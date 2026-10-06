import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
import { readFileSync } from 'node:fs'
import { applyPricingHtml } from './scripts/site-pricing.mjs'
// The Learn guides' prose as a virtual module, derived from src/data/learn/*.jsx
// on every build — see scripts/learn-search-text.mjs for why it is not rendered.
import { learnSearchTextPlugin } from './scripts/learn-search-text.mjs'

// The app version, baked in at build time so a bug report can say WHICH build
// it came from. Without it "cannot reproduce" is ambiguous between "fixed
// since" and "never happened" — the two most expensive words in a triage queue.
//
// Defined onto `import.meta.env` rather than a bare `__APP_VERSION__` global on
// purpose: that identifier would need an eslint `no-undef` exemption, and
// `import.meta.env` is already valid everywhere without one.
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

// The root index.html, resolved once. The pricing hook below is scoped to this
// exact file: `vite build --mode test` adds further HTML inputs
// (tests/user-sim/fixtures/*.html), and those fixtures carry no pricing
// markers and must not be required to.
const INDEX_HTML = resolve(import.meta.dirname, 'index.html')

// Money in index.html, generated from src/config/planLadder.js.
//
// index.html holds placeholder comments where its JSON-LD Offers and its
// <noscript> pricing sentence go; scripts/site-pricing.mjs fills them from the
// ladder. See that file for the defect this closes — the static block quoted a
// pre-ladder price to every crawler and every visitor without JavaScript,
// because a number typed into HTML has nothing tying it to config.
//
// A HOOK RATHER THAN A POST-BUILD STEP, deliberately. scripts/prerender.mjs is
// the obvious seam and it is the wrong one: it runs only under `npm run build`
// and never rewrites dist/index.html, which is the one page the pricing
// sentence survives on. `npx vite build` and `npm run dev` would both have
// served the raw placeholder. This hook runs on every path into the page.
//
// It THROWS on a missing marker rather than passing the HTML through. A hook
// that silently no-ops would ship a page with no price while the build stayed
// green — the same shape of invisible failure as the wrong price it replaces.
const pricingHtml = () => ({
  name: 'uil4b-pricing-html',
  transformIndexHtml: {
    order: 'pre',
    handler(html, ctx) {
      if (ctx.filename && resolve(ctx.filename) !== INDEX_HTML) return html
      return applyPricingHtml(html, { file: 'index.html' })
    },
  },
})

/* ── A SIGNED-IN SESSION FOR THE ACCEPTANCE SUITE, AND ONLY FOR IT ─────────
 *
 * The acceptance suite had no way to be signed in, so every signed-in surface
 * in the product was unaudited — see the long argument in
 * tests/user-sim/fixtures/test-session.js.
 *
 * This is the whole mechanism: under `--mode test`, the two Firebase entry
 * points `src/utils/firebase.js` imports are resolved to doubles under tests/.
 * Everything downstream — AuthContext (which is founder-gated and untouched),
 * RequireAuth, useSubscription, the project cap, the export gate — then sees a
 * real session because it sees a real Firebase telling it there is one.
 *
 * WHY A PLUGIN AND NOT `resolve.alias`. An alias entry is matched against the
 * raw import SPECIFIER, so the doubles' own `import … from 'firebase/auth'`
 * would match it too and each file would resolve to itself. A resolveId hook
 * can ask WHO is importing, which is the question that has to be answered:
 * everyone gets the double, the doubles get the real package.
 *
 * WHY IT CANNOT SHIP. `testSessionDouble` is only CONSTRUCTED when the mode is
 * 'test'. A production build does not contain a disabled copy of it and does
 * not contain a flag that would enable it — the plugin is simply not in the
 * pipeline, so `firebase/auth` and `firebase/firestore` resolve to the real
 * packages and nothing under tests/ is reachable from any entry.
 * tests/unit/test-session-not-in-production.test.js runs a real production
 * build and greps every emitted file to prove it, and was verified by planting
 * a leak and watching it go red.
 */
const DOUBLED = {
  'firebase/auth': resolve(import.meta.dirname, 'tests/user-sim/fixtures/firebase-auth.js'),
  'firebase/firestore': resolve(import.meta.dirname, 'tests/user-sim/fixtures/firebase-firestore.js'),
}
const DOUBLE_FILES = new Set(Object.values(DOUBLED).map((p) => p.replace(/\\/g, '/')))

const testSessionDouble = () => ({
  name: 'uil4b-test-session-double',
  enforce: 'pre',
  resolveId(source, importer) {
    const target = DOUBLED[source]
    if (!target) return null
    // The doubles themselves must reach the REAL package, or each would
    // resolve to itself. This is the reason for the hook.
    if (importer && DOUBLE_FILES.has(importer.replace(/\\/g, '/'))) return null
    return target
  },
})

// ── THE FIREBASE DEFERRAL FLAG ───────────────────────────────────────
//
//   VITE_DEFER_FIREBASE=1 npm run build      # deferred
//   npm run build                            # today, unchanged (default)
//
// WHY A BUILD FLAG AND NOT A QUERY PARAM. The thing being changed is which
// chunk `firebase-*.js` belongs to, and that is decided by rolldown at build
// time from the shape of the import graph: a chunk reached by a static import
// is emitted into the entry graph and listed in `modulepreload`; one reached
// only by `import()` is not. No runtime switch can move those 116268 bytes out
// of the first request wave — the browser has already asked for them before any
// of our code runs. So the flag swaps the IMPLEMENTATION MODULE, and the two
// implementations differ in exactly one way: static imports versus dynamic.
//
// `src/utils/firebaseAccess.js` (eager) is the default and resolves normally
// everywhere — Node, ESLint, the unit tests — with no alias in play at all.
// The alias below is the entire opt-in, and it exists only when the env var is
// set, so an unflagged build is the build that ships today.
//
// The alias matches the CANONICAL specifier `.../firebaseAccess`, written with
// no file extension. `tests/unit/firebase-deferral.test.js` fails the build if
// any import of it is written another way, because an import the alias
// silently missed would keep Firebase in the first wave while the flag claimed
// otherwise — a flag that reports success and changes nothing.
//
// TWO SEAMS, one rule. Each entry is a module that exists twice — `X` (eager,
// the default, resolved normally by everything) and `X.lazy` (deferred). The
// alias swaps the second in for the first, and nothing else in the tree knows.
//
//   utils/firebaseAccess     the SDK itself: static imports vs `import()`
//   components/oneTapMount   One Tap, whose module pulls GOOGLE_CLIENT_ID out
//                            of utils/firebase and so drags the chunk with it
//
// `scripts/prerender.mjs` and the tests read the built output, not this list,
// so adding a third seam needs only a line here and the `.lazy` twin.
const DEFER_FIREBASE = process.env.VITE_DEFER_FIREBASE === '1'

// EXPORTED so tests/unit/firebase-deferral.test.js can check every import
// against the REAL regex rather than a second copy of it. A test that rebuilt
// this rule would pass while the build silently missed a specifier — the exact
// shape of failure this whole guard exists to prevent.
export const DEFERRAL_SEAMS = [
  ['utils/firebaseAccess', 'src/utils/firebaseAccess.lazy.js'],
  ['components/oneTapMount', 'src/components/oneTapMount.lazy.jsx'],
]

// Matches the canonical relative specifier with no file extension, at any
// depth: `./oneTapMount`, `../utils/firebaseAccess`, `../../utils/firebaseAccess`.
export const seamSpecifier = (name) => {
  const [dir, base] = name.split('/')
  return new RegExp(`^(?:\\.\\.?/)+(?:${dir}/)?${base}$`)
}

const firebaseAccessAlias = DEFER_FIREBASE
  ? DEFERRAL_SEAMS.map(([name, lazyPath]) => ({
    find: seamSpecifier(name),
    replacement: resolve(import.meta.dirname, lazyPath),
  }))
  : []


// THE FLAG MUST NOT BE ABLE TO REPORT SUCCESS AND CHANGE NOTHING.
//
// A deferral is a claim about the chunk graph, and the graph is the only thing
// that can confirm it. Every earlier attempt at this item failed in the same
// direction: the code looked deferred, the build stayed green, and the bytes
// were still in the first wave. So when the flag is on, the build WALKS THE
// STATIC IMPORT GRAPH from the entry chunks and fails if the Firebase SDK is
// still reachable without a dynamic `import()`.
//
// This is why `VITE_DEFER_FIREBASE=1` refuses to build against an unpatched
// tree today. The two founder-gated contexts still import the SDK statically,
// which not only leaves it in the first wave but SPLITS it across two
// preloaded chunks — measured at 553193 first-wave bytes against 521019
// unflagged, a 32 KB regression. Half a deferral is worse than none, and a
// build that fails says so where a comment would not.
const FIREBASE_MODULE = /(?:^|[/\\])(?:node_modules[/\\]@?firebase|node_modules[/\\]firebase[/\\]|src[/\\]utils[/\\]firebase\.js$)/
const assertFirebaseIsDeferred = () => ({
  name: 'uil4b-assert-firebase-deferred',
  apply: 'build',
  generateBundle(_options, bundle) {
    if (!DEFER_FIREBASE) return
    const chunks = Object.values(bundle).filter((c) => c.type === 'chunk')
    const byName = new Map(chunks.map((c) => [c.fileName, c]))
    const seen = new Set()
    const queue = chunks.filter((c) => c.isEntry).map((c) => c.fileName)
    const offenders = []
    while (queue.length) {
      const name = queue.shift()
      if (seen.has(name)) continue
      seen.add(name)
      const chunk = byName.get(name)
      if (!chunk) continue
      const hit = (chunk.moduleIds || []).find((id) => FIREBASE_MODULE.test(id.replace(/\?.*$/, '')))
      if (hit) offenders.push(`${name}  (e.g. ${hit.split(/[/\\]/).slice(-3).join('/')})`)
      // STATIC imports only. `dynamicImports` is exactly the edge we want.
      for (const next of chunk.imports || []) queue.push(next)
    }
    if (offenders.length) {
      this.error(
        'VITE_DEFER_FIREBASE=1, but the Firebase SDK is still reachable from the entry chunk '
        + 'by STATIC import, so it stays in the first request wave:\n  '
        + offenders.join('\n  ')
        + '\n\nThe remaining static edges are in the two founder-gated contexts. Apply '
        + 'docs/design/firebase-deferral-gated.patch (or run scripts/firebase-deferral-trial.mjs, '
        + 'which applies it to temporary copies) and build again.',
      )
    }
  },
})

// three's DRACOLoader and KTX2Loader default their decoder paths to files
// beside them (`new URL('../libs/…', import.meta.url)`), and Vite emits every
// file named that way into dist/assets as soon as either loader is imported:
// three .wasm and four scripts, about 1.9 MB. The app always sets the paths to
// pinned, verified CDN copies (src/utils/mesh/decoders.js), so the defaults
// are blanked here and nothing is emitted. If a three.js upgrade changes the
// pattern, the build fails rather than quietly shipping the files again.
const THREE_DECODER_LOADER = /[/\\]three[/\\]examples[/\\]jsm[/\\]loaders[/\\](DRACOLoader|KTX2Loader)\.js$/
const DECODER_DEFAULT_URL = /new URL\(\s*'\.\.\/libs\/(?:draco|basis)\/[^']+',\s*import\.meta\.url\s*\)\.toString\(\)/g
const DECODER_DEFAULT_COUNT = { DRACOLoader: 5, KTX2Loader: 2 }
const threeDecodersOffOrigin = () => ({
  name: 'uil4b-three-decoders-off-origin',
  enforce: 'pre',
  transform(code, id) {
    const loader = THREE_DECODER_LOADER.exec(id.replace(/\?.*$/, ''))?.[1]
    if (!loader) return null
    const found = code.match(DECODER_DEFAULT_URL)?.length || 0
    if (found !== DECODER_DEFAULT_COUNT[loader]) {
      this.error(`${loader}.js: expected ${DECODER_DEFAULT_COUNT[loader]} default decoder URLs, found ${found}. `
        + 'Re-check the pattern against the installed three.js before building.')
    }
    return { code: code.replace(DECODER_DEFAULT_URL, "''"), map: null }
  },
})

export default defineConfig(({ mode }) => ({
  plugins: [react(), threeDecodersOffOrigin(), pricingHtml(), learnSearchTextPlugin(), assertFirebaseIsDeferred(), ...(mode === 'test' ? [testSessionDouble()] : [])],
  resolve: { alias: firebaseAccessAlias },
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(pkg.version),
  },
  build: {
    outDir: 'dist',
    rollupOptions: mode === 'test' ? {
      input: {
        index: resolve(import.meta.dirname, 'index.html'),
        'ui-system-pro-fixture': resolve(import.meta.dirname, 'tests/user-sim/fixtures/ui-system-pro.html'),
        'type-save-fixture': resolve(import.meta.dirname, 'tests/user-sim/fixtures/type-save.html'),
        'user-home-fixture': resolve(import.meta.dirname, 'tests/user-sim/fixtures/user-home.html'),
        'brand-starter-fixture': resolve(import.meta.dirname, 'tests/user-sim/fixtures/brand-starter.html'),
      },
    } : undefined,
  },
}))
