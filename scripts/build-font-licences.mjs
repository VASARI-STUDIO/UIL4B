// Builds src/data/fontLicences.json: a map from a Google Fonts family to the
// SPDX id of the licence it is published under.
//
// WHY THIS EXISTS
// Google's catalogue metadata (fonts.google.com/metadata/fonts) says only
// whether a family is open source, never which licence. The google/fonts
// repository answers that by layout: every family lives in a top-level folder
// named for its licence (ofl/, apache/, ufl/), in a folder named for the family
// in lowercase with no spaces or punctuation (ofl/opensans). This reads those
// folder listings through the GitHub git trees endpoint, which needs no
// credentials and returns a folder's entries without downloading any files.
//
// KEYS are the folder names, which are already normalised (see licenceKey in
// src/utils/fontDossier.js, the lookup side of the same rule).
//
// A family that appears in none of the three folders is simply absent, and the
// pop-up then sends the reader to Google Fonts rather than guessing a licence.
//
// RUN: node scripts/build-font-licences.mjs     (rerun on a catalogue refresh)
// GitHub allows 60 unauthenticated requests an hour; one run makes four.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT_FILE = path.join(ROOT, 'src', 'data', 'fontLicences.json')
const API = 'https://api.github.com/repos/google/fonts/git/trees/'
const BRANCH = 'main'
const TIMEOUT_MS = 30_000

// Top-level folder in google/fonts -> SPDX id.
const FOLDERS = {
  ofl: 'OFL-1.1',
  apache: 'Apache-2.0',
  ufl: 'UFL-1.0',
}

// A catalogue this size dropping below the floor means the layout changed or
// a listing came back short, so the file is left as it was instead of shrunk.
const MIN_FAMILIES = 1500

async function getTree(ref) {
  const res = await fetch(`${API}${ref}`, {
    headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'build-font-licences' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (res.status === 403 || res.status === 429) {
    const left = res.headers.get('x-ratelimit-remaining')
    const reset = Number(res.headers.get('x-ratelimit-reset'))
    const when = Number.isFinite(reset) && reset > 0
      ? new Date(reset * 1000).toISOString()
      : 'later'
    throw new Error(
      `GitHub refused the request (HTTP ${res.status}; ${left ?? 'unknown'} requests left). `
      + `Unauthenticated calls are limited to 60 an hour. Try again after ${when}.`,
    )
  }
  if (!res.ok) throw new Error(`GitHub answered HTTP ${res.status} for tree "${ref}"`)
  const json = await res.json()
  if (json.truncated) throw new Error(`GitHub truncated the listing for tree "${ref}"`)
  return json.tree || []
}

async function main() {
  const top = await getTree(BRANCH)
  const licences = {}
  const counts = {}

  for (const [folder, spdx] of Object.entries(FOLDERS)) {
    const entry = top.find(e => e.type === 'tree' && e.path === folder)
    if (!entry) throw new Error(`google/fonts has no top-level "${folder}/" folder any more`)
    // Only folders already in the normalised form are families; a name with
    // an underscore or hyphen is a housekeeping folder (for example one marked
    // for deletion) and could never match a catalogue name anyway.
    const families = (await getTree(entry.sha)).filter(e => e.type === 'tree' && /^[a-z0-9]+$/.test(e.path))
    counts[spdx] = families.length
    for (const f of families) licences[f.path] = spdx
  }

  const total = Object.keys(licences).length
  if (total < MIN_FAMILIES) {
    throw new Error(`Only ${total} families found (expected at least ${MIN_FAMILIES}); nothing written`)
  }

  // Sorted so a rerun diffs as only the families that changed.
  const sorted = Object.fromEntries(Object.entries(licences).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true })
  fs.writeFileSync(OUT_FILE, JSON.stringify(sorted) + '\n')

  const bytes = fs.statSync(OUT_FILE).size
  console.log(`Wrote ${path.relative(ROOT, OUT_FILE)}: ${total} families, ${bytes} bytes`)
  for (const [spdx, n] of Object.entries(counts)) console.log(`  ${spdx}: ${n}`)
}

main().catch(err => {
  console.error(`[build-font-licences] ${err.message}`)
  process.exit(1)
})
