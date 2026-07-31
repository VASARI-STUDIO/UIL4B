import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

export default defineConfig(({ mode }) => ({
  plugins: [react()],
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
