// Fetches Switzer, the product's UI typeface, into public/fonts/switzer/ so the
// build deploys it from our own origin. The files are NEVER committed.
//
// WHY A BUILD STEP AND NOT A FILE IN THE REPO
// Switzer is licensed under the ITF Free Font License v2.0 (see
// scripts/SWITZER-LICENCE.md). It permits self-hosting on our own site, and it
// forbids putting the font in a public repository, subsetting it, converting it,
// or handing it to anyone else. The repository is public, so the file lives in
// public/fonts/switzer/ (gitignored) and arrives here, from the official source,
// every time the site is built. That also keeps it byte-for-byte the Official
// Version: this script extracts the .woff2 files from Fontshare's own zip and
// touches nothing inside them.
//
// WHERE IT RUNS: `npm run build` (the `prebuild` hook, so Vercel and CI get it),
// `npm run test:users` and `npm run test:unit`. `npm run dev` runs it with
// --soft, so a developer who is offline sees the metric-matched fallback instead
// of a broken dev server.
//
// A FAILED DOWNLOAD FAILS THE BUILD, loudly. Shipping the site in the fallback
// face would be a silent brand regression with no error anywhere.
//
// Flags:  --soft   warn and exit 0 when the download fails (dev only)
//         --force  fetch again even if the files are already there
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import JSZip from 'jszip'

const ZIP_URL = 'https://api.fontshare.com/v2/fonts/download/switzer'
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = path.join(ROOT, 'public', 'fonts', 'switzer')
// Roman and italic, both variable (wght 100-900). Only the roman is preloaded;
// the italic is requested by the browser only when italic text is on screen.
const FILES = ['Switzer-Variable.woff2', 'Switzer-VariableItalic.woff2']
const MIN_BYTES = 10_000
const ATTEMPTS = 3
const TIMEOUT_MS = 60_000

const args = new Set(process.argv.slice(2))
const soft = args.has('--soft')
const force = args.has('--force')

const have = () => FILES.every((f) => {
  try { return fs.statSync(path.join(OUT_DIR, f)).size >= MIN_BYTES } catch { return false }
})

async function download() {
  let lastError
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const res = await fetch(ZIP_URL, { signal: AbortSignal.timeout(TIMEOUT_MS), redirect: 'follow' })
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`)
      return Buffer.from(await res.arrayBuffer())
    } catch (err) {
      lastError = err
      console.warn(`[switzer] download attempt ${attempt}/${ATTEMPTS} failed: ${err.message}`)
      if (attempt < ATTEMPTS) await new Promise((r) => setTimeout(r, 1500 * attempt))
    }
  }
  throw new Error(`could not download ${ZIP_URL}: ${lastError?.message}`)
}

async function main() {
  if (!force && have()) {
    console.log('[switzer] already present in public/fonts/switzer/, skipping download')
    return
  }
  console.log(`[switzer] downloading ${ZIP_URL}`)
  const zip = await JSZip.loadAsync(await download())
  fs.mkdirSync(OUT_DIR, { recursive: true })
  for (const name of FILES) {
    const entry = zip.file(new RegExp(`(^|/)Fonts/WEB/fonts/${name.replace(/\./g, '\\.')}$`))[0]
    if (!entry) throw new Error(`${name} is not in the Fontshare zip; has the archive layout changed?`)
    const bytes = await entry.async('nodebuffer')
    if (bytes.length < MIN_BYTES || bytes.toString('latin1', 0, 4) !== 'wOF2') {
      throw new Error(`${name} from the zip is not a WOFF2 file (${bytes.length} bytes)`)
    }
    // Written under a temporary name and renamed, so an interrupted run can
    // never leave a truncated file that the skip check above would trust.
    const tmp = path.join(OUT_DIR, `${name}.part`)
    fs.writeFileSync(tmp, bytes)
    fs.renameSync(tmp, path.join(OUT_DIR, name))
    console.log(`[switzer] wrote public/fonts/switzer/${name} (${bytes.length} bytes)`)
  }
}

main().catch((err) => {
  if (soft) {
    console.warn(`[switzer] WARNING: ${err.message}. Continuing with the fallback face (--soft).`)
    return
  }
  console.error(`\n[switzer] FAILED: ${err.message}`)
  console.error('[switzer] Switzer is fetched at build time and is never committed. See scripts/SWITZER-LICENCE.md.')
  process.exit(1)
})
