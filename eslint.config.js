import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // dist: build output. public: static assets served verbatim by Vite (e.g.
  // icons-data.js is loaded as a plain browser <script> from index.html, so its
  // top-level vars are runtime globals, not dead code — and it is never bundled).
  globalIgnores(['dist', 'public']),
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
    // Node-runtime code (Vercel serverless functions + build/maintenance scripts).
    // These use process, Buffer, etc. — not browser globals.
    files: ['api/**/*.js', 'scripts/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
])
