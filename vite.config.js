import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
import { readFileSync } from 'node:fs'
import { applyPricingHtml } from './scripts/site-pricing.mjs'

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

export default defineConfig(({ mode }) => ({
  plugins: [react(), pricingHtml(), ...(mode === 'test' ? [testSessionDouble()] : [])],
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
      },
    } : undefined,
  },
}))
