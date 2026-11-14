// Fetches the Pro library data into api/_lib/pro/ so the build bundles it into
// the API function. The files are NEVER committed.
//
// WHY A BUILD STEP AND NOT A FILE IN THE REPO
// This repository is public. The Pro libraries (palette and brand colours,
// gradient stops, prompt text and their previews) are what a Pro plan pays
// for, so they live in a private repository, VASARI-STUDIO/UIL4B-pro-data, and
// arrive here at build time. api/_lib/pro/ is gitignored and eslint-ignored.
//
// WHAT IT FETCHES
// Exactly the commit named in pro-data.lock (one 40-hex SHA). Bumping the data
// is a one-line change to that file, which vercel.json's ignoreCommand watches,
// so a bump deploys. The tarball comes from the GitHub REST API with the token
// in an Authorization header, never in a URL, and the token is never printed.
// Every file is checked against the sha256 in the tarball's manifest.json, and
// manifest.json must carry the UIL4B-PRO-DATA marker.
//
// WHERE IT RUNS: `npm run build` (the `prebuild` hook, so Vercel and CI get it)
// and `npm run test:users`.
//
// WITHOUT A TOKEN
// Local and CI builds have no token; the script says so and exits 0, and the
// API serves the in-tree data (until it moves out) or, outside production, the
// generated fixtures (api/_lib/library/fixtures.js). On Vercel, once
// REQUIRED_ON_VERCEL is true, a missing token or a failed fetch fails the build,
// so production can never ship without the libraries.
//
// Environment:
//   PRO_DATA_TOKEN  fine-grained, read-only token for the private repository
//   PRO_DATA_DIR    copy from a local checkout instead of fetching (tests, dev)
//   PRO_DATA_REPO   owner/name override (default VASARI-STUDIO/UIL4B-pro-data)
// Flags:
//   --force         fetch again even if api/_lib/pro/ already matches the lock
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = path.join(ROOT, 'api', '_lib', 'pro')
const LOCK_FILE = path.join(ROOT, 'pro-data.lock')
const STAMP = path.join(OUT_DIR, '.lock')
const REPO = process.env.PRO_DATA_REPO || 'VASARI-STUDIO/UIL4B-pro-data'
const MARKER = 'UIL4B-PRO-DATA'
const ATTEMPTS = 3
const TIMEOUT_MS = 60_000
// Flipped to true by the switch-over change, once PRO_DATA_TOKEN is set in
// Vercel and the in-tree copies are gone.
const REQUIRED_ON_VERCEL = false

const log = (msg) => console.log(`[pro-data] ${msg}`)

export function readLock(file = LOCK_FILE) {
  const sha = fs.readFileSync(file, 'utf8').split(/\r?\n/).map((l) => l.trim()).find((l) => l && !l.startsWith('#'))
  if (!/^[0-9a-f]{40}$/.test(sha || '')) throw new Error('pro-data.lock must hold one 40-character commit SHA')
  return sha
}

const cString = (buf) => {
  const end = buf.indexOf(0)
  return buf.toString('utf8', 0, end === -1 ? buf.length : end)
}

/** Minimal ustar reader: regular files only, pax and GNU long names honoured. */
export function untar(buf) {
  const files = new Map()
  let offset = 0
  let longName = null
  let paxPath = null
  while (offset + 512 <= buf.length) {
    const header = buf.subarray(offset, offset + 512)
    if (header.every((b) => b === 0)) break
    const field = (start, len) => cString(header.subarray(start, start + len))
    const size = parseInt(field(124, 12).trim() || '0', 8)
    const type = header[156] === 0 ? '0' : String.fromCharCode(header[156])
    const prefix = field(345, 155)
    let name = prefix ? `${prefix}/${field(0, 100)}` : field(0, 100)
    const body = buf.subarray(offset + 512, offset + 512 + size)
    offset += 512 + Math.ceil(size / 512) * 512
    if (type === 'x') {
      const m = body.toString('utf8').match(/\d+ path=([^\n]*)\n/)
      paxPath = m ? m[1] : null
      continue
    }
    if (type === 'g') continue
    if (type === 'L') { longName = cString(body); continue }
    if (paxPath) { name = paxPath; paxPath = null }
    if (longName) { name = longName; longName = null }
    if (type !== '0') continue
    // GitHub tarballs wrap everything in one <owner>-<repo>-<sha>/ directory.
    const rel = name.split('/').slice(1).join('/')
    if (rel) files.set(rel, Buffer.from(body))
  }
  return files
}

/** Checks the marker and every listed file's hash; returns the manifest. */
export function verify(files) {
  const raw = files.get('manifest.json')
  if (!raw) throw new Error('manifest.json is missing from the Pro data')
  const manifest = JSON.parse(raw.toString('utf8'))
  if (manifest.marker !== MARKER) throw new Error('manifest.json does not carry the UIL4B-PRO-DATA marker')
  if (!Array.isArray(manifest.files) || manifest.files.length === 0) throw new Error('manifest.json lists no files')
  for (const { path: rel, sha256 } of manifest.files) {
    if (typeof rel !== 'string' || rel.startsWith('/') || rel.includes('\\') || rel.split('/').includes('..')) {
      throw new Error(`manifest.json lists an unsafe path: ${rel}`)
    }
    const body = files.get(rel)
    if (!body) throw new Error(`${rel} is in manifest.json but not in the Pro data`)
    const got = crypto.createHash('sha256').update(body).digest('hex')
    if (got !== sha256) throw new Error(`${rel} does not match its sha256 in manifest.json`)
  }
  return manifest
}

export function readDir(dir) {
  const files = new Map()
  const walk = (abs, rel) => {
    for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
      if (entry.name === '.git' || entry.name === 'node_modules') continue
      const a = path.join(abs, entry.name)
      const r = rel ? `${rel}/${entry.name}` : entry.name
      if (entry.isDirectory()) walk(a, r)
      else if (entry.isFile()) files.set(r, fs.readFileSync(a))
    }
  }
  walk(dir, '')
  return files
}

async function download(sha, token) {
  const url = `https://api.github.com/repos/${REPO}/tarball/${sha}`
  let lastError
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(TIMEOUT_MS),
        redirect: 'follow',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'uil4b-build',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      })
      if (!res.ok) {
        const err = new Error(`HTTP ${res.status} ${res.statusText}`)
        // A bad token or a missing repository will not fix itself on a retry.
        if (res.status === 401 || res.status === 403 || res.status === 404) err.final = true
        throw err
      }
      return zlib.gunzipSync(Buffer.from(await res.arrayBuffer()))
    } catch (err) {
      lastError = err
      log(`download attempt ${attempt}/${ATTEMPTS} failed: ${err.message}`)
      if (err.final) break
      if (attempt < ATTEMPTS) await new Promise((r) => setTimeout(r, 1500 * attempt))
    }
  }
  throw new Error(`could not fetch ${REPO} at the locked commit: ${lastError?.message}`)
}

function write(files, manifest, sha) {
  fs.rmSync(OUT_DIR, { recursive: true, force: true })
  for (const { path: rel } of manifest.files) {
    const dest = path.join(OUT_DIR, ...rel.split('/'))
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    // Written under a temporary name and renamed, so an interrupted run never
    // leaves a truncated module behind.
    fs.writeFileSync(`${dest}.part`, files.get(rel))
    fs.renameSync(`${dest}.part`, dest)
  }
  fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), files.get('manifest.json'))
  // The stamp goes last: it is what tells the next run the copy is whole.
  fs.writeFileSync(STAMP, `${sha}\n`)
}

export async function fetchProData({ force = false, env = process.env } = {}) {
  const sha = readLock()
  const localDir = env.PRO_DATA_DIR
  if (!force && !localDir) {
    try {
      if (fs.readFileSync(STAMP, 'utf8').trim() === sha) {
        verify(readDir(OUT_DIR))
        log('api/_lib/pro/ already matches pro-data.lock, skipping')
        return 'present'
      }
    } catch { /* absent or stale: fetch */ }
  }

  let files
  if (localDir) {
    log('copying from PRO_DATA_DIR')
    files = readDir(path.resolve(localDir))
  } else {
    const token = env.PRO_DATA_TOKEN
    if (!token) {
      const msg = 'PRO_DATA_TOKEN is not set, so the Pro library data was not fetched'
      if (env.VERCEL === '1' && REQUIRED_ON_VERCEL) throw new Error(msg)
      log(`${msg}. The API will use the in-tree data or, outside production, fixtures.`)
      return 'skipped'
    }
    log(`fetching ${REPO} at ${sha.slice(0, 12)}`)
    files = untar(await download(sha, token))
  }
  const manifest = verify(files)
  write(files, manifest, sha)
  log(`wrote ${manifest.files.length} files to api/_lib/pro/`)
  return 'written'
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  fetchProData({ force: process.argv.includes('--force') }).catch((err) => {
    // A local copy that fails its checks is always an error. On Vercel, once
    // the data is required, so is any failure. Before the switch-over the
    // build still has the in-tree data, so a failed fetch is a warning.
    if (process.env.PRO_DATA_DIR || (process.env.VERCEL === '1' && REQUIRED_ON_VERCEL)) {
      console.error(`\n[pro-data] FAILED: ${err.message}`)
      process.exit(1)
    }
    console.warn(`[pro-data] WARNING: ${err.message}. Continuing without the fetched data.`)
  })
}
