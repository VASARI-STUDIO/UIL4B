// Runs the REAL user-sim specs against an ALREADY-RUNNING preview server, so a
// rebuild loop can be aimed at dist/ underneath them without also killing the
// server's startup. Same worker count as the real suite.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from '@playwright/test'

const PINNED = '/opt/pw-browsers/chromium'
const executablePath = fs.existsSync(PINNED) ? PINNED : undefined
const port = Number(process.env.PLAYWRIGHT_PORT || 4512)
const url = `http://127.0.0.1:${port}`
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')

export default defineConfig({
  testDir: path.join(ROOT, 'tests', 'user-sim'),
  outputDir: path.join(ROOT, 'tests', 'flakeprobe-a0e1', 'artifacts'),
  globalSetup: path.join(ROOT, 'tests', 'user-sim', 'global-setup.js'),
  globalTeardown: path.join(ROOT, 'tests', 'user-sim', 'global-teardown.js'),
  fullyParallel: true,
  workers: Number(process.env.PROBE_WORKERS || 4),
  timeout: 30000,
  reporter: [['list']],
  use: {
    baseURL: url,
    viewport: { width: 1440, height: 900 },
    launchOptions: { executablePath, args: ['--no-sandbox', '--disable-dev-shm-usage'] },
  },
  webServer: {
    command: `npx vite preview --host 127.0.0.1 --port ${port} --strictPort`,
    cwd: ROOT,
    url,
    reuseExistingServer: true,
    timeout: 60000,
  },
})
