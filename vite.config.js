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

export default defineConfig(({ mode }) => ({
  plugins: [react(), pricingHtml()],
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
      },
    } : undefined,
  },
}))
