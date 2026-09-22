// ONE LANE OF THE ACCEPTANCE SUITE, WITH ITS OWN BUILD AND ITS OWN PORT.
//
// Several agents run the suite at once in this single checkout, and the default
// playwright.config.js serves the single `dist/`. A production `vite build`
// landing there mid-run strips the `--mode test` Firebase double, so `signIn()`
// becomes a silent no-op and tier assertions fail while looking completely
// real. That has cost this repo real time more than once.
//
// So each lane serves its OWN copy of dist, made once by the director before
// the fleet starts, and listens on its OWN port. Nothing a lane does can move
// the ground under another lane.
//
//   LANE=specA PLAYWRIGHT_PORT=4181 npx playwright test -c pw-lane.config.js <specs>
//
// The lane name picks the directory (`dist-<LANE>`) and keys the report dir, so
// two lanes cannot overwrite each other's findings.jsonl or artifacts either.
//
// REBUILDING IS THE DIRECTOR'S JOB, NOT A LANE'S. A lane that runs
// `npm run build` breaks every other lane. If a lane needs its source change
// reflected, it rebuilds into its OWN directory:
//   npx vite build --mode test --outDir dist-<LANE> && node scripts/prerender.mjs --out dist-<LANE>
// and if prerender cannot target that directory, it asks the director instead.
import fs from 'node:fs'
import { defineConfig } from '@playwright/test'

const LANE = process.env.LANE || 'lane'
const PORT = Number(process.env.PLAYWRIGHT_PORT || 4181)
const OUT_DIR = `dist-${LANE}`
const previewUrl = `http://127.0.0.1:${PORT}`
const reportDir = `tests/user-sim/report/${LANE}`

if (!fs.existsSync(OUT_DIR)) {
  throw new Error(
    `${OUT_DIR} does not exist. The director builds it once for the whole fleet; `
    + 'do not run `npm run build` — that overwrites dist/ and breaks every other lane.',
  )
}

const PINNED_CHROMIUM = '/opt/pw-browsers/chromium'
const executablePath = fs.existsSync(PINNED_CHROMIUM) ? PINNED_CHROMIUM : undefined

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
    command: `npx vite preview --outDir ${OUT_DIR} --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: previewUrl,
    reuseExistingServer: false,
    timeout: 60000,
  },
})
