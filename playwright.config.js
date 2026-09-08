// User-simulation acceptance suite — see tests/user-sim/README.md.
// Runs persona-driven, goal-oriented flows against the PRODUCTION build
// (vite preview), so what passes here is what ships.
import fs from 'node:fs'
import { defineConfig } from '@playwright/test'
import { resolvePreviewPort, resolveReportDir } from './tests/user-sim/report-dir.js'

// Managed sandboxes pin a Chromium at /opt/pw-browsers/chromium that may not
// match this @playwright/test version's expected revision; prefer it when it
// exists, otherwise fall back to Playwright's own resolution.
const PINNED_CHROMIUM = '/opt/pw-browsers/chromium'
const executablePath = fs.existsSync(PINNED_CHROMIUM) ? PINNED_CHROMIUM : undefined
const previewPort = resolvePreviewPort()
// Per-runner evidence directory, keyed on the same variable as the port so
// concurrent suites cannot write into each other's report. Unset, it is
// tests/user-sim/report exactly as before — see tests/user-sim/report-dir.js.
const reportDir = resolveReportDir()
const previewUrl = `http://127.0.0.1:${previewPort}`

export default defineConfig({
  testDir: 'tests/user-sim',
  outputDir: `${reportDir}/artifacts`,
  globalSetup: './tests/user-sim/global-setup.js',
  globalTeardown: './tests/user-sim/global-teardown.js',
  fullyParallel: true,
  workers: 4,
  timeout: 30000,
  reporter: [
    ['list'],
    ['json', { outputFile: `${reportDir}/results.json` }],
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
