import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
import { readFileSync } from 'node:fs'

// The app version, baked in at build time so a bug report can say WHICH build
// it came from. Without it "cannot reproduce" is ambiguous between "fixed
// since" and "never happened" — the two most expensive words in a triage queue.
//
// Defined onto `import.meta.env` rather than a bare `__APP_VERSION__` global on
// purpose: that identifier would need an eslint `no-undef` exemption, and
// `import.meta.env` is already valid everywhere without one.
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(pkg.version),
  },
  build: {
    outDir: 'dist',
    rollupOptions: mode === 'test' ? {
      input: {
        index: resolve(import.meta.dirname, 'index.html'),
        'ui-system-pro-fixture': resolve(import.meta.dirname, 'tests/user-sim/fixtures/ui-system-pro.html'),
      },
    } : undefined,
  },
}))
