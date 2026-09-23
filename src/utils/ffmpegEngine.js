// ── The ffmpeg.wasm engine, and why it is NOT served from uil4b.com ──────────
//
// Moved here from src/pages/FileConverter.jsx on 2026-09-23 when a second mode
// (the animation builder) started needing it. The reasoning below moved with
// it, unchanged; tests/unit/ffmpeg-core-off-origin.test.js now points here.
//
// THE BILL THAT PAID FOR THIS. The core is 32,129,114 bytes of WebAssembly. It
// used to be imported as `@ffmpeg/core?url`, which made Vite emit it into
// `dist/assets/ffmpeg-core-<hash>.wasm` — one file that was 91% of the entire
// deployable byte-mass (dist/assets was 35 MB; everything else in it is ~3 MB).
// Vercel's Hobby plan allows 10 GB/month of FAST ORIGIN TRANSFER — bytes served
// from the origin rather than from an edge cache — and the project hit it. The
// mechanism is the content hash: every deploy renames the file, so the warm
// copy in every edge region is discarded and the next visitor in each region
// pulls the whole thing from origin again.
//
// How much that costs per miss depends on whether the edge compresses wasm,
// which is NOT something this repo can verify from here — production is not
// reachable from the sandbox. The measurable bracket: 32,129,114 bytes
// uncompressed, and 9,260,281 bytes when a host does compress it (measured
// against jsDelivr in Chromium, which served exactly those two numbers). So
// somewhere between about 300 and 1,100 region-first-hits spends the whole
// month, from one file. The bracket does not change the decision: after this,
// the number is zero.
//
// SO THE ENGINE IS FETCHED FROM jsDelivr, PINNED TO AN EXACT VERSION. These are
// the same bytes the npm package ships, and that is measured rather than
// assumed — both files were downloaded on 2026-09-06 and hashed against
// node_modules/@ffmpeg/core/dist/esm, which is why the suite can fulfil these
// URLs from the local copy and still be testing the real thing:
//   ffmpeg-core.js   sha256 c972f5abeafcd5f3949e54edfbdc74a9badb27025809feb1945d468ffbcfb7f1
//   ffmpeg-core.wasm sha256 2390efa7fb66e7e42dbae15427571a5ffc96b829480904c30f471f0a78967f61
// jsDelivr serves them with `access-control-allow-origin: *` and `immutable`
// caching, so the loader below can read them cross-origin and the browser
// keeps them for a year. Re-hashed against jsDelivr on 2026-09-23: unchanged.
//
// AND THE HASHES ARE ENFORCED, NOT JUST RECORDED (FFMPEG_CORE_SHA256). The core
// runs in a worker on OUR origin, which can read the auth token in IndexedDB
// and make credentialed /api calls. Both files are fetched as bytes and checked
// with utils/integrity.js before either becomes a blob: URL; a mismatch throws
// an IntegrityError and nothing is executed. tests/unit/cdn-engine-integrity
// feeds the loader one changed byte and requires exactly that.
//
// WHY A PINNED VERSION AND NOT A RANGE. `@ffmpeg/core@0.12.6` names one
// immutable artifact. A floating tag (`@latest`, `@0.12`) would let a
// third party change the engine underneath a shipped build with no review, and
// jsDelivr could not mark it immutable. tests/unit/ffmpeg-core-off-origin.test.js
// fails if this version and the installed @ffmpeg/core ever disagree.
//
// WHY NO SECOND CDN AS A FALLBACK. A mirror would be a code path that only
// executes during someone else's outage — the kind that rots unnoticed and is
// a second pinned version to keep in step. The honest failure is already built:
// getFfmpeg throws, the caller's engine state goes to 'error', and the UI says
// the engine failed and that the Image tab still works. Image conversion — the
// tab the converter opens on — is pure canvas and needs none of this.
//
// SINGLE-THREADED CORE, deliberately: `@ffmpeg/core` not `@ffmpeg/core-mt`. The
// mt build needs SharedArrayBuffer and therefore COOP/COEP cross-origin
// isolation headers. Measured in Chromium against the built site on
// 2026-09-06: `crossOriginIsolated` is false and `SharedArrayBuffer` is
// undefined, because vercel.json sets neither header. The mt core would not
// run here; this one does, and needs no header work at all. It runs in a Web
// Worker (the FFmpeg class spawns one), so a long encode does not freeze the
// page — it just takes one core's worth of time, which is why every caller
// reports progress in frames or seconds rather than a spinner.
//
// LOADED ONLY ON CONVERT, NEVER ON PAGE OPEN. These are plain strings; the
// FFmpeg class and util are dynamic imports inside getFfmpeg, which only runs
// when someone presses a Convert or Build button. A visitor who opens the
// converter — or the homepage workbench, which mounts the same image panel —
// downloads none of it.
import { parseFrame, parseTime } from './mediaEncode.js'
import { fetchVerified } from './integrity.js'

const FFMPEG_CORE_VERSION = '0.12.6'
const FFMPEG_CORE_BASE = `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${FFMPEG_CORE_VERSION}/dist/esm`
const ffmpegCoreURL = `${FFMPEG_CORE_BASE}/ffmpeg-core.js`
const ffmpegWasmURL = `${FFMPEG_CORE_BASE}/ffmpeg-core.wasm`
// SHA-256 of the two files at FFMPEG_CORE_VERSION, from jsDelivr and from the
// installed package (identical). Enforced by loadCore() below.
export const FFMPEG_CORE_SHA256 = Object.freeze({
  js: 'c972f5abeafcd5f3949e54edfbdc74a9badb27025809feb1945d468ffbcfb7f1',
  wasm: '2390efa7fb66e7e42dbae15427571a5ffc96b829480904c30f471f0a78967f61',
})

let ffmpegInstance = null
let ffmpegLoadPromise = null
// Bumped by resetFfmpeg(). A load that started under an older generation and
// finishes after a reset is terminated on arrival rather than installed —
// otherwise Cancel-during-download left that engine's worker alive, and a
// second Build could end up with two instances.
let generation = 0

/** True once the engine is loaded and usable without a download. */
export const engineLoaded = () => !!ffmpegInstance

// Fetch and VERIFY both core files, then load the engine from blob: URLs made
// only from the verified bytes. @ffmpeg/util's toBlobURL was not used for the
// wasm even before the hash check: it throws when the byte count disagrees
// with Content-Length and then re-reads a consumed body — exactly what happens
// when a CDN gzips the wasm. fetchVerified asserts nothing about the total.
//
// The blob: URLs are revoked as soon as load() settles. The worker has read
// both by then, and an unrevoked URL pins its Blob — 32 MB for the wasm — for
// the life of the page, once per engine reset.
async function fetchCore(onBytes) {
  const [coreBytes, wasmBytes] = await Promise.all([
    fetchVerified(ffmpegCoreURL, FFMPEG_CORE_SHA256.js, { label: 'The converter engine script' }),
    // The wasm is the download (32 MB raw, ~9 MB compressed); the .js core is
    // a few KB and not worth a second progress line.
    fetchVerified(ffmpegWasmURL, FFMPEG_CORE_SHA256.wasm, {
      label: 'The converter engine',
      onBytes: (b) => onBytes?.({ received: b.received, total: b.total >= b.received ? b.total : 0 }),
    }),
  ])
  return { coreBytes, wasmBytes }
}

async function loadCore(ffmpeg, { coreBytes, wasmBytes }) {
  const coreURL = URL.createObjectURL(new Blob([coreBytes], { type: 'text/javascript' }))
  const wasmURL = URL.createObjectURL(new Blob([wasmBytes], { type: 'application/wasm' }))
  try {
    await ffmpeg.load({ coreURL, wasmURL })
  } finally {
    URL.revokeObjectURL(coreURL)
    URL.revokeObjectURL(wasmURL)
  }
}

/**
 * The loaded engine, loading it on first use. `onBytes({ received, total })`
 * reports the wasm download; `total` is 0 when the host's Content-Length
 * cannot be trusted as the decompressed size. Rejects with an IntegrityError,
 * having executed nothing, if either core file is not the pinned one.
 */
export async function getFfmpeg(onBytes) {
  if (ffmpegInstance) return ffmpegInstance
  if (ffmpegLoadPromise) return ffmpegLoadPromise
  const gen = generation
  const load = (async () => {
    // Verified BEFORE the FFmpeg class is even constructed: a refused core
    // leaves no worker, no blob: URL, nothing that could run it.
    const core = await fetchCore(onBytes)
    const [{ FFmpeg }, { fetchFile }] = await Promise.all([
      import('@ffmpeg/ffmpeg'),
      import('@ffmpeg/util'),
    ])
    const ffmpeg = new FFmpeg()
    await loadCore(ffmpeg, core)
    if (gen !== generation) {
      try { ffmpeg.terminate() } catch { /* already gone */ }
      const e = new Error('the converter engine was reset while it loaded')
      e.name = 'AbortError'
      throw e
    }
    ffmpeg._fetchFile = fetchFile
    ffmpegInstance = ffmpeg
    return ffmpeg
  })()
  ffmpegLoadPromise = load
  try {
    return await load
  } catch (err) {
    // Only clear the slot if it is still this load's: after a reset a newer
    // load may already be in it.
    if (ffmpegLoadPromise === load) ffmpegLoadPromise = null
    throw err
  }
}

/**
 * Throw the engine away: kills its worker, so an encode in progress stops
 * immediately. The next getFfmpeg() builds a fresh one — from the browser's
 * cache, since the core URLs are immutable. Used for Cancel, and after any
 * failed job: a wasm trap such as "memory access out of bounds" leaves the
 * heap corrupt, and reusing that instance fails in ways that look unrelated.
 */
export function resetFfmpeg() {
  generation++
  const ff = ffmpegInstance
  ffmpegInstance = null
  ffmpegLoadPromise = null
  try { ff?.terminate() } catch { /* already gone */ }
}

/**
 * Run one encode: write the inputs, exec, read the output, clean up.
 *
 * `onLog(line)` sees every log line; `onFrame(n)` and `onTime(seconds)` are the
 * parsed progress, straight from ffmpeg's own status lines — the frame it has
 * actually encoded, not an estimate. Returns the output bytes.
 */
export async function runJob(ffmpeg, { inputs, args, output, onFrame, onTime }) {
  const listen = ({ message }) => {
    const f = parseFrame(message)
    if (f != null) onFrame?.(f)
    const t = parseTime(message)
    if (t != null) onTime?.(t)
  }
  ffmpeg.on('log', listen)
  const written = []
  try {
    for (const { name, data } of inputs) {
      await ffmpeg.writeFile(name, data instanceof Uint8Array ? data : await ffmpeg._fetchFile(data))
      written.push(name)
    }
    const code = await ffmpeg.exec(['-hide_banner', '-y', ...args])
    if (code !== 0) throw new Error(`the encoder stopped with code ${code}`)
    const bytes = await ffmpeg.readFile(output)
    if (!bytes?.length) throw new Error('the encoder produced an empty file')
    return bytes
  } catch (err) {
    // See resetFfmpeg: an instance that threw is not trusted again.
    resetFfmpeg()
    throw err
  } finally {
    try { ffmpeg.off('log', listen) } catch { /* terminated */ }
    if (ffmpegInstance === ffmpeg) {
      for (const name of [...written, output]) {
        try { await ffmpeg.deleteFile(name) } catch { /* not there */ }
      }
    }
  }
}
