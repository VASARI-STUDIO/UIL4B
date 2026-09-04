import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from '@playwright/test'

// The repo root, two levels up from tests/flakeprobe-a0e1/. Playwright runs a
// webServer command with cwd defaulting to the CONFIG's directory, so without
// this `vite preview` looks for tests/flakeprobe-a0e1/dist and dies.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')

const PINNED = '/opt/pw-browsers/chromium'
const executablePath = fs.existsSync(PINNED) ? PINNED : undefined
const port = Number(process.env.PLAYWRIGHT_PORT || 4512)
const url = `http://127.0.0.1:${port}`

export default defineConfig({
  testDir: '.',
  outputDir: './artifacts',
  fullyParallel: true,
  workers: Number(process.env.PROBE_WORKERS || 1),
  timeout: 60000,
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
