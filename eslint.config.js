import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // dist: build output. public: static assets served verbatim by Vite (e.g.
  // icons-data.js is loaded as a plain browser <script> from index.html, so its
  // top-level vars are runtime globals, not dead code — and it is never bundled).
  // `.agents/` holds third-party skills installed by `npx skills add`. It is
  // gitignored, but ESLint 9's flat config does not read .gitignore, so their
  // vendored browser bundles were linted and reported 63 errors in the main
  // checkout while `src/` was clean. They are not our code and never reach CI.
  globalIgnores(['dist', 'public', '.claude/worktrees/**', '.agents/**']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      // Intentional offline-safe / quota-safe silent catches across the codebase.
      'no-empty': ['error', { allowEmptyCatch: true }],
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // These flag legitimate sync-on-change effects (e.g. setting active section from
      // location.state) and manual memoization patterns, not bugs. Keep them visible as
      // warnings rather than failing the build.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
    },
  },
  {
    // Node-runtime code (Vercel serverless functions, build/maintenance scripts,
    // Playwright config + user-simulation acceptance tests).
    // These use process, Buffer, etc. — not browser globals.
    //
    // vite.config.js joined the list when it started reading an env var:
    // VITE_DEFER_FIREBASE decides whether the Firebase deferral seams are
    // aliased in, and a build-time decision can only be read from `process.env`.
    // It was always Node code; it simply had no Node globals in it until then.
    files: ['api/**/*.js', 'scripts/**/*.js', 'tests/**/*.js', 'playwright.config.js', 'vite.config.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
])
