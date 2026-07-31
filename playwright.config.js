// User-simulation acceptance suite — see tests/user-sim/README.md.
// Runs persona-driven, goal-oriented flows against the PRODUCTION build
// (vite preview), so what passes here is what ships.
import fs from 'node:fs'
import { defineConfig } from '@playwright/test'

// Managed sandboxes pin a Chromium at /opt/pw-browsers/chromium that may not
// match this @playwright/test version's expected revision; prefer it when it
// exists, otherwise fall back to Playwright's own resolution.
const PINNED_CHROMIUM = '/opt/pw-browsers/chromium'
const executablePath = fs.existsSync(PINNED_CHROMIUM) ? PINNED_CHROMIUM : undefined
const previewPort = Number(process.env.PLAYWRIGHT_PORT || 4174)
const previewUrl = `http://127.0.0.1:${previewPort}`

export default defineConfig({
  testDir: 'tests/user-sim',
  outputDir: 'tests/user-sim/report/artifacts',
  globalSetup: './tests/user-sim/global-setup.js',
  globalTeardown: './tests/user-sim/global-teardown.js',
  fullyParallel: true,
  workers: 4,
  timeout: 30000,
  reporter: [
    ['list'],
    ['json', { outputFile: 'tests/user-sim/report/results.json' }],
  ],
  use: {
    baseURL: previewUrl,
    viewport: { width: 1440, height: 900 },
    launchOptions: {
      executablePath,
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    },
  },
  webServer: {
    command: `npx vite preview --host 127.0.0.1 --port ${previewPort} --strictPort`,
    url: previewUrl,
    reuseExistingServer: false,
    timeout: 60000,
  },
})
