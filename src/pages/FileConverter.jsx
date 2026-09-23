import { useState, useCallback, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import JSZip from 'jszip'
import SnapSlider from '../components/SnapSlider'
import ColorPickerPop from '../components/ColorPickerPop'
import DropZone from '../components/converter/DropZone'
import { loadImage, prefersReducedMotion, useGatedDownload } from '../components/converter/shared'
import { getLenis } from '../hooks/useSmoothScroll'
import {
  DRAFT_FORMATS,
  DRAFT_RESOLUTIONS,
  consumeImageHandoff,
  describeCompressionLimit,
  draftToConverterSettings,
  readImageHandoff,
} from '../utils/imageHandoff'
import {
  EXPORT_SCALES,
  SIZE_PRESETS,
  exceedsCanvasLimit,
  outputDimensions,
} from '../utils/imageResize'
import { formatBytes, formatTime } from '../utils/mediaEncode'
// The stylesheet families this surface needs, split out of the one
// render-blocking global sheet (see src/styles/deferred/). They ride this
// route's own lazy chunk, so they arrive with it and never with the homepage.
// file-converter.css is the page's own sheet and holds every `fc` rule; it is
// root-scoped under `.fc`, which is what lets it win — import order does not.
import '../styles/deferred/studio.css'
import '../styles/deferred/tool-shell.css'
import '../styles/pages/file-converter.css'

// ── Constants ────────────────────────────────────────────────────────────────
const MODES = [
  { id: 'image', label: 'Image' },
  { id: 'gif', label: 'Video → GIF' },
  { id: 'frames', label: 'Video → Frames' },
]

const OUTPUT_FORMATS = [
  { id: 'image/png', label: 'PNG', ext: 'png', lossy: false },
  { id: 'image/jpeg', label: 'JPEG', ext: 'jpg', lossy: true },
  { id: 'image/webp', label: 'WebP', ext: 'webp', lossy: true },
  { id: 'image/avif', label: 'AVIF', ext: 'avif', lossy: true },
  // ICO is assembled by hand (multi-size favicon of embedded PNGs), not by
  // canvas.toBlob — see encodeIco. Sizing/scale settings don't apply to it.
  { id: 'ico', label: 'ICO (favicon)', ext: 'ico', lossy: false, ico: true },
]

// Formats supported by the canvas frame encoder (Video → Frames). AVIF is
// excluded here because canvas.toBlob('image/avif') support is too inconsistent
// to offer for batch frame extraction; ICO only makes sense for still images.
const FRAME_FORMATS = OUTPUT_FORMATS.filter(f => f.id !== 'image/avif' && !f.ico)

const ACCEPT_IMAGE = 'image/png,image/jpeg,image/webp,image/gif,image/svg+xml,image/bmp,image/avif,image/x-icon,image/vnd.microsoft.icon,.png,.jpg,.jpeg,.webp,.gif,.svg,.bmp,.avif,.ico'
const ACCEPT_VIDEO = 'video/*,.mp4,.webm,.mov,.avi,.gif,.webp'

const LARGE_FILE_BYTES = 50 * 1024 * 1024 // 50 MB warning threshold

const QUALITY_SNAPS = [25, 50, 75, 90]
const QUALITY_DEFAULT = 90

// EXPORT_SCALES, SIZE_PRESETS, MAX_CANVAS_DIM and the sizing arithmetic all
// live in utils/imageResize.js — the encoder and the new output readout have to
// agree, and the order the two size controls apply in is a decision worth
// stating once rather than inlining twice.

// canvas.toBlob never settling (seen with some format/browser combos) would
// leave the converter stuck in its busy state, disabling every control. Fail
// the item instead so the batch — and the UI — always finishes.
const ENCODE_TIMEOUT_MS = 30000

// ── The ffmpeg.wasm engine, and why it is NOT served from uil4b.com ──────────
//
// THE BILL THAT PAID FOR THIS. The core is 32,129,114 bytes of WebAssembly. It
// used to be imported here as `@ffmpeg/core?url`, which made Vite emit it into
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
// month, from one file, with ~80 undeployed merges queued behind it. The
// bracket does not change the decision: after this, the number is zero.
//
// SO THE ENGINE IS FETCHED FROM jsDelivr, PINNED TO AN EXACT VERSION. These are
// the same bytes the npm package ships, and that is measured rather than
// assumed — both files were downloaded on 2026-09-06 and hashed against
// node_modules/@ffmpeg/core/dist/esm, which is why the suite can fulfil these
// URLs from the local copy and still be testing the real thing:
//   ffmpeg-core.js   sha256 c972f5abeafcd5f3949e54edfbdc74a9badb27025809feb1945d468ffbcfb7f1
//   ffmpeg-core.wasm sha256 2390efa7fb66e7e42dbae15427571a5ffc96b829480904c30f471f0a78967f61
// jsDelivr serves them with `access-control-allow-origin: *` and `immutable`
// caching, so `toBlobURL` below can read them cross-origin and the browser
// keeps them for a year.
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
// getFfmpeg throws, `engineState` goes to 'error', and the UI says the engine
// failed and that the Image tab still works. Image conversion — the tab this
// page opens on — is pure canvas and needs none of this.
//
// SINGLE-THREADED CORE, deliberately: `@ffmpeg/core` not `@ffmpeg/core-mt`. The
// mt build needs SharedArrayBuffer and therefore COOP/COEP cross-origin
// isolation headers. Measured in Chromium against the built site on
// 2026-09-06: `crossOriginIsolated` is false and `SharedArrayBuffer` is
// undefined, because vercel.json sets neither header. The mt core would not
// run here; this one does, and needs no header work at all.
//
// LOADED ONLY ON CONVERT, NEVER ON PAGE OPEN. These are plain strings; the
// FFmpeg class and util are dynamic imports inside getFfmpeg, which only runs
// when someone presses Convert. A visitor who opens the converter — or the
// homepage workbench, which mounts the same image panel — downloads none of it.
const FFMPEG_CORE_VERSION = '0.12.6'
const FFMPEG_CORE_BASE = `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${FFMPEG_CORE_VERSION}/dist/esm`
const ffmpegCoreURL = `${FFMPEG_CORE_BASE}/ffmpeg-core.js`
const ffmpegWasmURL = `${FFMPEG_CORE_BASE}/ffmpeg-core.wasm`

// ── Helpers ──────────────────────────────────────────────────────────────────
// Describes the size change between the original and converted file.
// dir: 'down' (smaller, good), 'up' (larger), 'same'.
function sizeDelta(orig, out) {
  if (!orig || out == null) return null
  const pct = Math.round((1 - out / orig) * 100)
  // The ink is picked by `dir` in file-converter.css (.fc-delta--down/up/same)
  // rather than returned here as an inline colour. It is the -strong inks, not
  // the raw state colours: this is 12px TEXT and the batch line sits on the
  // page ground, where --ok measured 4.32:1 in light (2026-09-09, every
  // width). --ok-strong is the text-grade step of the same hue in both themes.
  if (pct > 0) return { pct, dir: 'down', label: `${pct}% smaller` }
  if (pct < 0) return { pct, dir: 'up', label: `${Math.abs(pct)}% larger` }
  return { pct: 0, dir: 'same', label: 'same size' }
}

// Assembles a multi-size Windows ICO (favicon) from the source image: each
// entry is a PNG (valid in ICO since Vista), contain-fit on a transparent
// square so non-square sources aren't distorted.
const ICO_SIZES = [16, 32, 48]

async function encodeIco(img, iw, ih) {
  const pngs = []
  for (const s of ICO_SIZES) {
    const c = document.createElement('canvas')
    c.width = s
    c.height = s
    const ctx = c.getContext('2d')
    ctx.imageSmoothingQuality = 'high'
    const r = Math.min(s / iw, s / ih)
    const w = Math.max(1, Math.round(iw * r))
    const h = Math.max(1, Math.round(ih * r))
    ctx.drawImage(img, Math.round((s - w) / 2), Math.round((s - h) / 2), w, h)
    const blob = await new Promise((resolve, reject) => {
      c.toBlob(b => (b ? resolve(b) : reject(new Error('ICO export failed to encode'))), 'image/png')
    })
    pngs.push({ size: s, buf: new Uint8Array(await blob.arrayBuffer()) })
  }
  const headerSize = 6 + 16 * pngs.length
  const out = new Uint8Array(headerSize + pngs.reduce((sum, p) => sum + p.buf.length, 0))
  const dv = new DataView(out.buffer)
  dv.setUint16(2, 1, true) // type: icon
  dv.setUint16(4, pngs.length, true)
  let offset = headerSize
  pngs.forEach((p, i) => {
    const e = 6 + i * 16
    out[e] = p.size // width (0 would mean 256)
    out[e + 1] = p.size // height
    dv.setUint16(e + 4, 1, true) // colour planes
    dv.setUint16(e + 6, 32, true) // bits per pixel
    dv.setUint32(e + 8, p.buf.length, true)
    dv.setUint32(e + 12, offset, true)
    out.set(p.buf, offset)
    offset += p.buf.length
  })
  return new Blob([out], { type: 'image/x-icon' })
}

// The PillNav is position:fixed, so anything scrolled to its own offsetTop hides
// underneath it. Measure the live bar (its height changes at ≤640px, and a
// chrome-less embed has none at all) and leave one --s-4 of air below it.
const STICKY_GAP = 16

function stickyTopOffset() {
  const bar = document.querySelector('.pnav')
  const h = bar ? bar.getBoundingClientRect().height : 0
  return h > 0 ? h + STICKY_GAP : 0
}

// Land the visitor on their own images after a homepage hand-off: focus the
// queue region (so assistive tech is told the viewport moved and where to) and
// scroll it clear of the sticky bar. Called only once, only for a hand-off that
// produced at least one real item.
function revealQueue(node) {
  const reduced = prefersReducedMotion()
  // Never yank focus out of a control the visitor already started using — this
  // fires a frame after mount, so in practice nothing is focused yet.
  const active = document.activeElement
  if (!active || active === document.body || active === document.documentElement) {
    // preventScroll: the browser's own focus scroll ignores the sticky bar, so
    // we do the positioning ourselves below.
    node.focus({ preventScroll: true })
  }
  const top = Math.max(0, node.getBoundingClientRect().top + window.scrollY - stickyTopOffset())
  // Lenis owns the scroll position whenever smooth scrolling is on; a raw
  // window.scrollTo would desync its virtual position (same rule as App's
  // route-change reset). Reduced motion never instantiates it.
  const lenis = getLenis()
  if (lenis) lenis.scrollTo(top, reduced ? { immediate: true } : undefined)
  else window.scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' })
}

// ── Component ────────────────────────────────────────────────────────────────
export default function FileConverter({ toast }) {
  // Pick up anything handed over in memory — the dashboard's quick-upload tile
  // (files only) or the homepage Image panel (files plus an output draft).
  //
  // Read during render, consume on commit: React can discard a render and run it
  // again, so emptying the slot in the initialiser would lose the payload before
  // the real mount. The commit effect below empties it exactly once, after which
  // a remount, Back/Forward navigation or a second visit sees nothing. A reload
  // or a direct visit legitimately finds nothing and shows the normal empty
  // choose/drop state — no picker is ever opened on mount.
  const [handoff] = useState(readImageHandoff)
  useEffect(() => { consumeImageHandoff() }, [])
  // Image is the default tab; handed-over images therefore land on it.
  const [mode, setMode] = useState('image')
  const tabRefs = useRef({})

  // THE ARIA TABS PATTERN, including the keyboard half. These were four
  // buttons with aria-pressed — a toggle group — for what is a set of
  // mutually exclusive views, each replacing the one below. Arrow keys move
  // between tabs and select them; only the current tab is in the Tab order.
  const onTabKey = (e, i) => {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key]
    let next = null
    if (step) next = (i + step + MODES.length) % MODES.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = MODES.length - 1
    if (next == null) return
    e.preventDefault()
    setMode(MODES[next].id)
    tabRefs.current[MODES[next].id]?.focus()
  }

  return (
    <div className="sec fc">
      {/* NO TAXONOMY EYEBROW. This was the most literal instance in the
          codebase: the eyebrow read "File Converter" at y=102 and the h1
          below it read "File Converter" at y=135. The same three words,
          twice, 33px apart. #surface-headers-read-as-ai. */}
      <header className="fc-hero">
        <h1>
          File Converter
          <span className="fc-alpha">Alpha</span>
        </h1>
        <p>
          Convert images between PNG, JPEG, WebP, AVIF and favicon ICO, turn short
          videos into GIFs, or extract video frames — all in your browser; your
          files are never uploaded. Image conversion is fully offline. The video
          tools download a converter engine — about 9 MB — from a public code
          CDN the first time you use one, then keep it cached.
        </p>
      </header>

      <div className="fc-tabs" role="tablist" aria-label="Converter mode">
        {MODES.map((m, i) => (
          <button
            key={m.id}
            ref={el => { tabRefs.current[m.id] = el }}
            type="button"
            role="tab"
            id={`fc-tab-${m.id}`}
            aria-selected={mode === m.id}
            aria-controls={`fc-panel-${m.id}`}
            tabIndex={mode === m.id ? 0 : -1}
            className="fc-tab"
            onClick={() => setMode(m.id)}
            onKeyDown={e => onTabKey(e, i)}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* WHERE 3D WENT. This was a fourth tab, "3D → Blender", that opened a
          "Coming soon" card and a disabled button. Its one true statement is
          kept: a .blend file needs Blender itself running on a server, which a
          browser tool cannot do. What a person holding a 3D file CAN do here
          is look at it, so the line points there instead of at a dead end. */}
      <p className="fc-3d">
        <Link to="/create/3d-viewer">Open a 3D model in the 3D viewer</Link>
        <span className="fc-3d-note"> · Converting to Blender&apos;s .blend needs Blender running on a server, so it is not offered here.</span>
      </p>

      <div className="fc-panel" role="tabpanel" id={`fc-panel-${mode}`} aria-labelledby={`fc-tab-${mode}`}>
        {mode === 'image' && <ImageConvert toast={toast} initialFiles={handoff?.files} initialDraft={handoff?.draft} />}
        {mode === 'gif' && <VideoToGif toast={toast} />}
        {mode === 'frames' && <VideoFrames toast={toast} />}
      </div>
    </div>
  )
}

/** A size change as text plus its direction, which picks the ink. */
function Delta({ orig, out }) {
  const d = sizeDelta(orig, out)
  return d ? <span className={`fc-delta fc-delta--${d.dir}`}> · {d.label}</span> : null
}

// ── Mode 1: Image format conversion ──────────────────────────────────────────
function ImageConvert({ toast, initialFiles, initialDraft }) {
  const gatedDownload = useGatedDownload()
  // A homepage output draft is applied to the real controls once, on mount, and
  // then belongs to the visitor — nothing here keeps re-asserting it.
  const seeded = initialDraft ? draftToConverterSettings(initialDraft) : null
  const [items, setItems] = useState([]) // { id, name, srcUrl, file, out:{blob,url,bytes,w,h} }
  const [format, setFormat] = useState(() => seeded?.format ?? 'image/webp')
  const [quality, setQuality] = useState(() => seeded?.quality ?? QUALITY_DEFAULT)
  const [maxDim, setMaxDim] = useState(() => seeded?.maxDim ?? 0) // 0 = keep original size
  const [renderScale, setRenderScale] = useState(1) // @1x / @2x export
  const [jpegBg, setJpegBg] = useState('#ffffff') // fill behind transparency (JPEG has no alpha)
  const [busy, setBusy] = useState(false)
  const [zipping, setZipping] = useState(false)
  // The region holding the uploaded items + their output settings — the thing a
  // hand-off visitor actually came to look at.
  const queueRef = useRef(null)

  // Revoke all object URLs on unmount. Read the latest items through a ref —
  // an empty-deps cleanup would close over the first render's empty array,
  // and live deps would revoke URLs that are still in use mid-session.
  const itemsRef = useRef(items)
  useEffect(() => { itemsRef.current = items })
  useEffect(() => () => {
    itemsRef.current.forEach(it => {
      if (it.srcUrl) URL.revokeObjectURL(it.srcUrl)
      if (it.out?.url) URL.revokeObjectURL(it.out.url)
    })
  }, [])

  // Returns how many files were actually queued, so a caller can tell an
  // accepted batch from a wholly rejected one.
  const addFiles = useCallback((files) => {
    const arr = Array.from(files)
    const imgs = arr.filter(f => f.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg|bmp|avif|ico)$/i.test(f.name))
    if (!imgs.length) { toast('Please choose PNG, JPEG, WebP, GIF, SVG, BMP, AVIF or ICO images', 'error'); return 0 }
    const big = imgs.find(f => f.size > LARGE_FILE_BYTES)
    if (big) toast(`Heads up: ${big.name} is over 50 MB — it may be slow`, 'info')
    const next = imgs.map(f => ({
      id: `${f.name}-${f.size}-${Math.random().toString(36).slice(2, 7)}`,
      name: f.name,
      file: f,
      srcUrl: URL.createObjectURL(f),
      out: null,
      error: null,
    }))
    setItems(prev => [...prev, ...next])

    // THE SOURCE SIZE, READ ONCE, AS SOON AS THE FILE LANDS.
    //
    // Nothing here knew how big an incoming image was until the moment it was
    // encoded, so the panel could not say what "Size limit" and "Export Scale"
    // were going to do to it — the user picked two multipliers against an
    // unknown and found out afterwards. Probing costs one decode per file and
    // it is what makes the output readout below possible.
    //
    // Failure is silent on purpose: a file the browser cannot decode will fail
    // again, loudly and with a real message, during conversion. Losing the
    // readout is not a reason to refuse the file.
    for (const item of next) {
      loadImage(item.srcUrl).then((img) => {
        const srcW = img.naturalWidth || img.width || 0
        const srcH = img.naturalHeight || img.height || 0
        if (!srcW || !srcH) return
        setItems(prev => prev.map(it => (it.id === item.id ? { ...it, srcW, srcH } : it)))
      }).catch(() => {})
    }
    return imgs.length
  }, [toast])

  // Seed from the hand-off exactly once on mount, then land the visitor on their
  // own images. They already did the "upload" on the homepage, so the drop zone
  // is the one thing they don't need to look at.
  //
  // This ONLY runs for a hand-off arrival. A direct visit, a reload, a Back/
  // Forward return and every manual drop/browse upload have no initialFiles and
  // never move the viewport. A hand-off whose files all fail validation queues
  // nothing, so we leave the visitor at the top with the toast — never scrolled
  // to an empty queue.
  useEffect(() => {
    if (!initialFiles?.length) return undefined
    if (!addFiles(initialFiles)) return undefined
    // The queue only exists after the seeding commit, and its cards need real
    // height before scrolling to them means anything. Wait for a laid-out node
    // rather than guessing a delay, and give up rather than spin forever.
    let raf = 0
    let frames = 0
    const whenLaidOut = () => {
      const node = queueRef.current
      if ((!node || node.getBoundingClientRect().height < 1) && frames++ < 30) {
        raf = requestAnimationFrame(whenLaidOut)
        return
      }
      if (node) revealQueue(node)
    }
    raf = requestAnimationFrame(whenLaidOut)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const removeItem = useCallback((id) => {
    setItems(prev => prev.filter(it => {
      if (it.id === id) {
        if (it.srcUrl) URL.revokeObjectURL(it.srcUrl)
        if (it.out?.url) URL.revokeObjectURL(it.out.url)
        return false
      }
      return true
    }))
  }, [])

  const clearAll = useCallback(() => {
    items.forEach(it => {
      if (it.srcUrl) URL.revokeObjectURL(it.srcUrl)
      if (it.out?.url) URL.revokeObjectURL(it.out.url)
    })
    setItems([])
  }, [items])

  const convertOne = useCallback(async (item) => {
    const img = await loadImage(item.srcUrl)
    // SVGs without an intrinsic size can report 0×0 — rasterise those at 1024.
    const iw = img.naturalWidth || img.width || 1024
    const ih = img.naturalHeight || img.height || 1024
    if (format === 'ico') {
      const blob = await encodeIco(img, iw, ih)
      return { blob, url: URL.createObjectURL(blob), bytes: blob.size, w: 48, h: 48, note: `favicon • ${ICO_SIZES.join(' + ')} px`, noPreview: true }
    }
    const { w, h } = outputDimensions(iw, ih, { maxDim, renderScale })
    if (exceedsCanvasLimit(w, h)) {
      throw new Error(`Too large to export at @${renderScale}x — pick a smaller size`)
    }
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (format === 'image/jpeg') { ctx.fillStyle = jpegBg; ctx.fillRect(0, 0, w, h) }
    ctx.drawImage(img, 0, 0, w, h)
    const q = format === 'image/png' ? undefined : quality / 100
    // canvas.toBlob yields null when the browser can't encode the requested
    // format (notably AVIF in some browsers) — and a callback that never fires
    // would wedge the whole batch in its busy state. Guard both so each item
    // records a clear error and the batch keeps going.
    const label = OUTPUT_FORMATS.find(f => f.id === format)?.label || format
    const blob = await new Promise((resolve, reject) => {
      const to = setTimeout(() => reject(new Error(`${label} export timed out`)), ENCODE_TIMEOUT_MS)
      canvas.toBlob(b => {
        clearTimeout(to)
        if (b) resolve(b)
        else reject(new Error(`${label} export not supported by this browser`))
      }, format, q)
    })
    return { blob, url: URL.createObjectURL(blob), bytes: blob.size, w, h }
  }, [format, quality, maxDim, renderScale, jpegBg])

  const [convertProgress, setConvertProgress] = useState({ done: 0, total: 0 })

  const convertAll = useCallback(async () => {
    if (!items.length || busy) return
    setBusy(true)
    setConvertProgress({ done: 0, total: items.length })
    let ok = 0
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      try {
        if (item.out?.url) URL.revokeObjectURL(item.out.url)
        const out = await convertOne(item)
        ok++
        setItems(prev => prev.map(it => it.id === item.id ? { ...it, out, error: null } : it))
      } catch (err) {
        setItems(prev => prev.map(it => it.id === item.id ? { ...it, out: null, error: err.message } : it))
      }
      setConvertProgress({ done: i + 1, total: items.length })
    }
    setBusy(false)
    toast(ok ? `Converted ${ok} image${ok > 1 ? 's' : ''}` : 'Conversion failed', ok ? 'success' : 'error')
  }, [items, busy, convertOne, toast])

  const fmt = OUTPUT_FORMATS.find(f => f.id === format)

  // Every item whose real pixel size is known, with the size it will come out
  // at under the CURRENT settings. Derived on render rather than stored: the
  // settings change far more often than the file list does, and a stored copy
  // is a second answer waiting to disagree with the encoder.
  const sized = items
    .filter(it => it.srcW > 0 && it.srcH > 0)
    .map(it => ({ ...it, out: outputDimensions(it.srcW, it.srcH, { maxDim, renderScale }) }))
  const widestOut = sized.length ? Math.max(...sized.map(it => Math.max(it.out.w, it.out.h))) : 0
  const anyCapped = sized.some(it => it.out.capped)

  // What a homepage output draft actually became here. Stated explicitly rather
  // than applied silently — including the part this converter cannot honour, so
  // "Lossless" is never implied where only a quality setting exists.
  const draftFormat = initialDraft && DRAFT_FORMATS.find(f => f.id === initialDraft.format)
  const draftNotice = initialDraft && {
    applied: [
      draftFormat?.label || initialDraft.format,
      DRAFT_RESOLUTIONS.find(r => r.id === initialDraft.resolution)?.detail || 'source size',
      draftFormat?.lossless ? 'lossless' : `quality ${seeded.quality}%`,
    ].join(' · '),
    limit: describeCompressionLimit(initialDraft.format, initialDraft.compression),
  }

  const downloadOne = useCallback((item) => {
    if (!item.out) return
    const base = item.name.replace(/\.[^.]+$/, '')
    gatedDownload(item.out.blob, `${base}.${fmt.ext}`, 'download the converted image')
  }, [fmt, gatedDownload])

  const downloadAll = useCallback(async () => {
    const ready = items.filter(it => it.out)
    if (!ready.length) return
    if (ready.length === 1) { downloadOne(ready[0]); return }
    setZipping(true)
    try {
      const zip = new JSZip()
      const used = new Set()
      ready.forEach(it => {
        let base = it.name.replace(/\.[^.]+$/, '')
        let name = `${base}.${fmt.ext}`
        let n = 1
        while (used.has(name)) name = `${base}-${n++}.${fmt.ext}`
        used.add(name)
        zip.file(name, it.out.blob)
      })
      const content = await zip.generateAsync({ type: 'blob' })
      // Awaited, and the toast is conditional on it: the gate may open a signup
      // dialog and never download anything.
      if (await gatedDownload(content, `converted-${fmt.ext}.zip`, 'download the converted images')) {
        toast(`Downloaded ZIP with ${ready.length} images`)
      }
    } catch {
      toast('Failed to create ZIP file', 'error')
    }
    setZipping(false)
  }, [items, fmt, downloadOne, toast, gatedDownload])

  const readyCount = items.filter(it => it.out).length
  const converted = items.filter(it => it.out)
  const totalOrig = converted.reduce((s, it) => s + it.file.size, 0)
  const totalOut = converted.reduce((s, it) => s + it.out.bytes, 0)
  const pct = convertProgress.total ? Math.round((convertProgress.done / convertProgress.total) * 100) : 0

  const drop = (
    <DropZone
      accept={ACCEPT_IMAGE}
      multiple
      onFiles={addFiles}
      compact={items.length > 0}
      hint={items.length ? 'Add more images' : 'Drop images here or click to browse'}
      sub="PNG, JPEG, WebP, GIF, SVG, BMP, AVIF, ICO — batch supported"
    />
  )

  return (
    <>
      {!items.length && drop}
      {draftNotice && (
        <div className="fc-draft-note" role="status">
          <strong>Output settings from your homepage draft: {draftNotice.applied}.</strong>
          {draftNotice.limit ? ` ${draftNotice.limit}` : ' Change any of them below before converting.'}
        </div>
      )}

      {items.length > 0 && (
        <section
          className="fc-queue fc-bench"
          ref={queueRef}
          tabIndex={-1}
          aria-label={`Your ${items.length} image${items.length > 1 ? 's' : ''} and output settings`}
        >
          {/* THE OBJECT COMES FIRST, THEN THE DECISION, THEN THE ACTION.
              This block used to sit BELOW Output Settings and below the
              Convert button that acts on it. Measured at 390x844 after adding
              one file: dropzone at 381, Output Settings at 576, "Convert 1
              image" at 839, and the uploaded file row at 915 - past the fold,
              and 76px BELOW its own action. Mobbin, platform web: Whop
              (flows/80a82326-1858-49db-99c4-7a0db3ab755a), Magnific
              (flows/f1270478-c7b4-47f4-a263-3fad86a795a9) and Sana AI
              (flows/600fc54e-85d7-4f81-98c1-4d4361343b91) all run object,
              then decision, then action.
              SPECTRUM, 2026-09-23: the same order, laid out as the app file's
              tool grid — the files on the left, a 336px inspector on the right
              — which collapses back to object, decision, action in one column
              under 900px. The empty-state drop zone gives way to a slim "Add
              more" strip once the visitor's own files are on screen. */}
          <div className="fc-bench-main">
            <ul className="fc-grid" aria-label="Queued images">
              {items.map(it => (
                <li key={it.id} className="fc-card">
                  <button type="button" className="fc-remove" onClick={() => removeItem(it.id)} title="Remove" aria-label={`Remove ${it.name}`} disabled={busy}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
                  </button>
                  <div className="fc-thumb">
                    <img src={(it.out && !it.out.noPreview && it.out.url) || it.srcUrl} alt={it.name} />
                  </div>
                  <div className="fc-name" title={it.name}>{it.name}</div>
                  {it.error ? (
                    <div className="fc-meta fc-meta--err">{it.error}</div>
                  ) : it.out ? (
                    <>
                      <div className="fc-meta">{it.out.note || `${it.out.w}×${it.out.h}`}</div>
                      <div className="fc-meta">
                        {formatBytes(it.file.size)} → {formatBytes(it.out.bytes)}
                        <Delta orig={it.file.size} out={it.out.bytes} />
                      </div>
                      <button type="button" className="fc-btn fc-btn--primary fc-dl" onClick={() => downloadOne(it)}>
                        Download {fmt.label}
                      </button>
                    </>
                  ) : (
                    <div className="fc-meta">
                      {it.srcW ? `${it.srcW}×${it.srcH} · ` : ''}{formatBytes(it.file.size)}
                    </div>
                  )}
                </li>
              ))}
            </ul>
            {drop}
          </div>

          <aside className="fc-inspector" aria-label="Output settings">
            <div className="fc-insp-sec">
              <label className="fc-eyebrow" htmlFor="fc-img-format">Output format</label>
              <select id="fc-img-format" className="fc-field" value={format} onChange={e => setFormat(e.target.value)} disabled={busy}>
                {OUTPUT_FORMATS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
              </select>
              {fmt.ico && <p className="fc-note">Multi-size favicon: {ICO_SIZES.join(', ')} px in one file</p>}
              {format === 'image/jpeg' && (
                <div className="fc-row">
                  {/* The shared picker. Note that this control exists PRECISELY
                      because JPEG has no alpha — which is also the panel's own
                      reason for not offering an alpha slider. */}
                  <ColorPickerPop
                    value={jpegBg}
                    onChange={setJpegBg}
                    disabled={busy}
                    ariaLabel="JPEG background colour"
                    triggerClassName="fc-bg-pick"
                  />
                  <p className="fc-note">Background — fills transparency, JPEG has no alpha</p>
                </div>
              )}
            </div>

            <div className="fc-insp-sec">
              <span className="fc-eyebrow" id="fc-img-quality">Quality</span>
              <SnapSlider
                min={1} max={100} value={quality} defaultValue={QUALITY_DEFAULT}
                snaps={QUALITY_SNAPS} unit="%"
                onChange={setQuality}
                disabled={busy || !fmt.lossy}
                ariaLabel="Output quality"
              />
              {!fmt.lossy && <p className="fc-note">{fmt.label} is lossless — quality doesn&apos;t apply</p>}
            </div>

            {!fmt.ico && (
              <div className="fc-insp-sec">
                <div className="fc-pair">
                  <div>
                    <label className="fc-eyebrow" htmlFor="fc-img-size">Size limit</label>
                    <select id="fc-img-size" className="fc-field" value={maxDim} onChange={e => setMaxDim(+e.target.value)} disabled={busy} aria-label="Output size limit">
                      {SIZE_PRESETS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="fc-eyebrow" htmlFor="fc-img-scale">Export scale</label>
                    <select id="fc-img-scale" className="fc-field" value={renderScale} onChange={e => setRenderScale(+e.target.value)} disabled={busy} aria-label="Export render scale">
                      {EXPORT_SCALES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                  </div>
                </div>

                {/* WHAT YOU ARE ABOUT TO GET, stated before you press the button.
                    Size limit and Export Scale are both relative to a source
                    size the tool never showed, and they interact — a scale
                    above the limit is clamped BY it. Reading one line beats
                    reasoning about two multipliers. */}
                {sized.length > 0 && (
                  <div className="fc-outsize" aria-live="polite">
                    <span className="fc-outsize-k">Output</span>
                    {sized.length === 1 ? (
                      <span className="fc-outsize-v">
                        {sized[0].srcW}×{sized[0].srcH}
                        <span className="fc-outsize-arrow" aria-hidden="true"> → </span>
                        <strong>{sized[0].out.w}×{sized[0].out.h}</strong> px
                      </span>
                    ) : (
                      <span className="fc-outsize-v">
                        {sized.length} images, longest side <strong>{widestOut}</strong> px
                      </span>
                    )}
                    {anyCapped && <span className="fc-note">held to the size limit</span>}
                  </div>
                )}
              </div>
            )}

            <div className="fc-insp-sec fc-actions">
              <button type="button" className="fc-btn fc-btn--primary fc-btn--wide" onClick={convertAll} disabled={busy}>
                {busy ? 'Converting…' : `Convert ${items.length} image${items.length > 1 ? 's' : ''}`}
              </button>
              {busy && items.length > 1 && (
                <div className="fc-progress" role="progressbar" aria-label="Images converted" aria-valuemin={0} aria-valuemax={convertProgress.total} aria-valuenow={convertProgress.done}>
                  <div className="fc-progress-bar" style={{ '--fc-pct': `${pct}%` }} />
                </div>
              )}
              <div className="fc-btn-row">
                {readyCount > 0 && (
                  <button type="button" className="fc-btn" onClick={downloadAll} disabled={zipping}>
                    {zipping ? 'Creating ZIP…' : readyCount > 1 ? `Download all (${readyCount}) as ZIP` : 'Download'}
                  </button>
                )}
                <button type="button" className="fc-btn" onClick={clearAll} disabled={busy}>Clear</button>
              </div>
              {readyCount > 1 && (
                <p className="fc-batch">
                  {readyCount} files: {formatBytes(totalOrig)} → {formatBytes(totalOut)}
                  <Delta orig={totalOrig} out={totalOut} />
                </p>
              )}
            </div>
          </aside>
        </section>
      )}
    </>
  )
}

// ── ffmpeg loader — Video → GIF is its ONLY caller ──────────────────────────
// The header used to say "shared by GIF + Frames". It is not: Video → Frames
// seeks a <video> element and paints each frame to a canvas (see `extract`
// below), and never touches ffmpeg. Worth stating, because it is the reason
// only one mode of four pays the engine download at all.
let ffmpegInstance = null
let ffmpegLoadPromise = null

// Fetch one core file and report bytes as they arrive. @ffmpeg/util's own
// toBlobURL(url, type, true, cb) was NOT used for this: it throws when the
// byte count disagrees with Content-Length and then re-reads a body it has
// already consumed — which is exactly what happens when a CDN serves the wasm
// gzipped (Content-Length is the compressed size, the reader yields the
// decompressed bytes). This reader asserts nothing about the total: it hands
// back whatever arrived and lets the caller decide whether the total is
// usable. Falls back to a plain arrayBuffer() when streaming is unavailable.
async function fetchCoreFile(url, mimeType, onBytes) {
  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`${url}: HTTP ${resp.status}`)
  const total = Number(resp.headers.get('content-length')) || 0
  const reader = resp.body?.getReader?.()
  let buf
  if (!reader) {
    buf = await resp.arrayBuffer()
    onBytes?.({ received: buf.byteLength, total: buf.byteLength })
  } else {
    const chunks = []
    let received = 0
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
      received += value.length
      onBytes?.({ received, total })
    }
    const data = new Uint8Array(received)
    let at = 0
    for (const c of chunks) { data.set(c, at); at += c.length }
    buf = data.buffer
  }
  return URL.createObjectURL(new Blob([buf], { type: mimeType }))
}

async function getFfmpeg(onLog, onBytes) {
  if (ffmpegInstance) return ffmpegInstance
  if (ffmpegLoadPromise) return ffmpegLoadPromise
  ffmpegLoadPromise = (async () => {
    const [{ FFmpeg }, { toBlobURL, fetchFile }] = await Promise.all([
      import('@ffmpeg/ffmpeg'),
      import('@ffmpeg/util'),
    ])
    const ffmpeg = new FFmpeg()
    if (onLog) ffmpeg.on('log', ({ message }) => onLog(message))
    // The wasm is the download (32 MB raw, ~9 MB compressed); the .js core is
    // a few KB and not worth a second progress line.
    await ffmpeg.load({
      coreURL: await toBlobURL(ffmpegCoreURL, 'text/javascript'),
      wasmURL: await fetchCoreFile(ffmpegWasmURL, 'application/wasm', onBytes),
    })
    ffmpeg._fetchFile = fetchFile
    ffmpegInstance = ffmpeg
    return ffmpeg
  })()
  try {
    return await ffmpegLoadPromise
  } catch (err) {
    ffmpegLoadPromise = null
    throw err
  }
}

/** Engine download, then work, then failure — the three things a video mode says. */
function EngineStatus({ progress, engineBytes, engineState }) {
  return (
    <>
      {progress && (
        <div className="fc-status" role="status">
          <span className="fc-spinner" aria-hidden="true" />
          {progress}
          {engineBytes && (
            <span className="fc-status-bytes">
              {formatBytes(engineBytes.received)}{engineBytes.total ? ` of ${formatBytes(engineBytes.total)}` : ''}
            </span>
          )}
        </div>
      )}
      {engineBytes?.total > 0 && (
        <div className="fc-progress" role="progressbar" aria-label="Converter engine download" aria-valuemin={0} aria-valuemax={engineBytes.total} aria-valuenow={engineBytes.received}>
          <div className="fc-progress-bar" style={{ '--fc-pct': `${Math.min(100, Math.round((engineBytes.received / engineBytes.total) * 100))}%` }} />
        </div>
      )}
      {engineState === 'error' && (
        <p className="fc-status fc-status-err">
          The converter engine failed to load. Image conversion still works on the Image tab.
        </p>
      )}
    </>
  )
}

/** A video's source panel: the player, then the facts about the file. */
function VideoSource({ srcUrl, videoRef, onLoadedMetadata, facts, onReplace, busy }) {
  return (
    <div className="fc-source">
      <video ref={videoRef} src={srcUrl} controls muted className="fc-video" aria-label="Video preview" onLoadedMetadata={onLoadedMetadata} />
      <div className="fc-source-card">
        <dl className="fc-facts">
          {facts.map(([k, v]) => (
            <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
          ))}
        </dl>
        {onReplace && (
          <button type="button" className="fc-btn" onClick={onReplace} disabled={busy}>
            Choose different file
          </button>
        )}
      </div>
    </div>
  )
}

// ── Mode 2: Video → GIF ──────────────────────────────────────────────────────
function VideoToGif({ toast }) {
  const gatedDownload = useGatedDownload()
  const [file, setFile] = useState(null)
  const [srcUrl, setSrcUrl] = useState(null)
  const [fps, setFps] = useState(10)
  const [width, setWidth] = useState(480)
  const [quality, setQuality] = useState('medium')
  const [duration, setDuration] = useState(0)
  const [trimStart, setTrimStart] = useState(0)
  const [trimEnd, setTrimEnd] = useState(null) // null = to the end
  const [engineState, setEngineState] = useState('idle') // idle|loading|ready|error
  const [working, setWorking] = useState(false)
  const [progress, setProgress] = useState('')
  // Bytes of the engine received so far, and the total when the CDN stated one
  // the count can be measured against. null outside the engine download.
  const [engineBytes, setEngineBytes] = useState(null)
  const [result, setResult] = useState(null) // { url, bytes }

  // Unmount-only URL cleanup via a ref — with [srcUrl, result] deps the
  // cleanup re-ran on every state change and revoked URLs still in use.
  const urlsRef = useRef({})
  useEffect(() => { urlsRef.current = { srcUrl, resultUrl: result?.url } })
  useEffect(() => () => {
    const u = urlsRef.current
    if (u.srcUrl) URL.revokeObjectURL(u.srcUrl)
    if (u.resultUrl) URL.revokeObjectURL(u.resultUrl)
  }, [])

  const onFiles = useCallback((files) => {
    const f = Array.from(files)[0]
    if (!f) return
    const okType = f.type.startsWith('video/') || /\.(mp4|webm|mov|avi|gif|webp)$/i.test(f.name)
    if (!okType) { toast('Please choose a video, animated GIF or animated WebP', 'error'); return }
    if (f.size > LARGE_FILE_BYTES) toast('Heads up: file is over 50 MB — conversion may be slow or run out of memory', 'info')
    if (srcUrl) URL.revokeObjectURL(srcUrl)
    if (result?.url) URL.revokeObjectURL(result.url)
    setFile(f)
    setSrcUrl(URL.createObjectURL(f))
    setResult(null)
    setDuration(0)
    setTrimStart(0)
    setTrimEnd(null)
  }, [srcUrl, result, toast])

  const convert = useCallback(async () => {
    if (!file || working) return
    if (duration > 0 && (trimEnd == null ? duration : trimEnd) <= trimStart) {
      toast('Trim end must be after trim start', 'error')
      return
    }
    if (!navigator.onLine && !ffmpegInstance) {
      toast('You appear to be offline — the converter engine needs a connection to load', 'error')
      return
    }
    setWorking(true)
    setResult(null)
    let ffmpeg
    try {
      if (!ffmpegInstance) { setEngineState('loading'); setProgress('Loading converter engine… (about 9 MB, first run only)') }
      // The 9 MB sentence above is the promise; the bytes are the evidence.
      // Measured 2026-09-09: the engine download showed a spinner and that one
      // sentence for its whole duration, at every width — on a phone connection
      // that is a minute of nothing moving. The count is shown against the
      // stated total only while it is consistent with it (a gzipped transfer
      // reports the compressed size and the reader yields more than that).
      ffmpeg = await getFfmpeg(null, ({ received, total }) => {
        setEngineBytes({ received, total: total >= received ? total : 0 })
      })
      setEngineBytes(null)
      setEngineState('ready')
    } catch {
      setEngineState('error')
      setEngineBytes(null)
      setWorking(false)
      setProgress('')
      toast('Could not load the converter engine. Check your connection or try the Image tab.', 'error')
      return
    }

    try {
      setProgress('Converting to GIF…')
      const inName = 'input' + (file.name.match(/\.[^.]+$/)?.[0] || '.mp4')
      const outName = 'output.gif'
      await ffmpeg.writeFile(inName, await ffmpeg._fetchFile(file))
      const w = Math.max(16, Math.min(2000, width | 0))
      const fpsVal = Math.max(1, Math.min(50, fps | 0))
      const dither = quality === 'high' ? 'sierra2_4a' : quality === 'low' ? 'none' : 'bayer:bayer_scale=2'
      const vf = `fps=${fpsVal},scale=${w}:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse=dither=${dither}`
      // Optional trim: -ss before -i seeks fast; -t caps the clip length.
      const start = Math.max(0, Math.min(trimStart || 0, duration || Infinity))
      const end = trimEnd == null ? duration : Math.min(trimEnd, duration || trimEnd)
      const clipLen = duration && end > start ? end - start : 0
      const args = []
      if (start > 0) args.push('-ss', String(start))
      args.push('-i', inName)
      if (clipLen > 0 && (start > 0 || end < duration)) args.push('-t', String(clipLen))
      args.push('-vf', vf, '-loop', '0', outName)
      await ffmpeg.exec(args)
      const data = await ffmpeg.readFile(outName)
      const blob = new Blob([data.buffer], { type: 'image/gif' })
      try { await ffmpeg.deleteFile(inName); await ffmpeg.deleteFile(outName) } catch { /* ignore cleanup */ }
      setResult({ url: URL.createObjectURL(blob), bytes: blob.size })
      setProgress('')
      toast('GIF ready')
    } catch (err) {
      setProgress('')
      toast('Conversion failed: ' + (err?.message || 'unknown error'), 'error')
    }
    setWorking(false)
  }, [file, working, width, fps, quality, duration, trimStart, trimEnd, toast])

  const clearFile = () => { setFile(null); if (srcUrl) URL.revokeObjectURL(srcUrl); setSrcUrl(null); setResult(null) }

  return (
    <>
      {!srcUrl ? (
        <DropZone
          accept={ACCEPT_VIDEO}
          onFiles={onFiles}
          hint="Drop a video or animation here or click to browse"
          sub="MP4, WebM, MOV, AVI, animated GIF / WebP"
        />
      ) : (
        <div className="fc-bench">
          <div className="fc-bench-main">
            <VideoSource
              srcUrl={srcUrl}
              onLoadedMetadata={e => setDuration(e.target.duration || 0)}
              facts={[
                ['File', file?.name],
                ['Size', formatBytes(file?.size)],
                ...(duration > 0 ? [['Duration', formatTime(duration)]] : []),
              ]}
              onReplace={clearFile}
              busy={working}
            />
            {result && (
              <section className="fc-result" aria-label="Result">
                <h2 className="fc-eyebrow">Result</h2>
                <img className="fc-result-media" src={result.url} alt="GIF result" />
                <p className="fc-meta">
                  GIF · {file?.size ? <>{formatBytes(file.size)} → {formatBytes(result.bytes)}</> : formatBytes(result.bytes)}
                  {file?.size ? <Delta orig={file.size} out={result.bytes} /> : null}
                </p>
                <button type="button" className="fc-btn fc-btn--primary" onClick={() => gatedDownload(result.url, `${(file?.name || 'video').replace(/\.[^.]+$/, '')}.gif`, 'download the GIF')}>
                  Download GIF
                </button>
              </section>
            )}
          </div>

          <aside className="fc-inspector" aria-label="GIF settings">
            <div className="fc-insp-sec">
              <div className="fc-pair">
                <div>
                  <label className="fc-eyebrow" htmlFor="fc-gif-fps">Frame rate (fps)</label>
                  <input id="fc-gif-fps" className="fc-field fc-field--num" type="number" min="1" max="50" value={fps} disabled={working}
                    onChange={e => setFps(Math.max(1, Math.min(50, +e.target.value || 10)))} />
                </div>
                <div>
                  <label className="fc-eyebrow" htmlFor="fc-gif-width">Width (px)</label>
                  <input id="fc-gif-width" className="fc-field fc-field--num" type="number" min="16" max="2000" value={width} disabled={working}
                    onChange={e => setWidth(Math.max(16, Math.min(2000, +e.target.value || 480)))} />
                </div>
              </div>
              <p className="fc-note">Height follows the video&apos;s shape</p>
            </div>
            <div className="fc-insp-sec">
              <label className="fc-eyebrow" htmlFor="fc-gif-quality">Quality</label>
              <select id="fc-gif-quality" className="fc-field" value={quality} onChange={e => setQuality(e.target.value)} disabled={working}>
                <option value="low">Low (smaller file)</option>
                <option value="medium">Medium</option>
                <option value="high">High (best dither)</option>
              </select>
            </div>
            {duration > 0 && (
              <div className="fc-insp-sec">
                <span className="fc-eyebrow">Trim (seconds)</span>
                <div className="fc-range">
                  <input className="fc-field fc-field--num" type="number" min="0" max={duration} step="0.1" value={trimStart} disabled={working}
                    onChange={e => setTrimStart(Math.max(0, Math.min(duration, +e.target.value || 0)))}
                    aria-label="Trim start (seconds)" />
                  <span className="fc-range-arrow" aria-hidden="true">→</span>
                  <input className="fc-field fc-field--num" type="number" min="0" max={duration} step="0.1"
                    value={trimEnd == null ? +duration.toFixed(1) : trimEnd} disabled={working}
                    onChange={e => setTrimEnd(Math.max(0, Math.min(duration, +e.target.value || 0)))}
                    aria-label="Trim end (seconds)" />
                </div>
                <p className="fc-note">
                  clip: {formatTime(Math.max(0, (trimEnd == null ? duration : trimEnd) - trimStart))} of {formatTime(duration)}
                </p>
              </div>
            )}
            <div className="fc-insp-sec fc-actions">
              <button type="button" className="fc-btn fc-btn--primary fc-btn--wide" onClick={convert} disabled={working}>
                {working ? (engineState === 'loading' ? 'Loading engine…' : 'Converting…') : 'Convert to GIF'}
              </button>
              <EngineStatus progress={progress} engineBytes={engineBytes} engineState={engineState} />
            </div>
          </aside>
        </div>
      )}
    </>
  )
}

// ── Mode 3: Video → Frames (HTML5 video + canvas seek) ───────────────────────
function VideoFrames({ toast }) {
  const gatedDownload = useGatedDownload()
  const [file, setFile] = useState(null)
  const [srcUrl, setSrcUrl] = useState(null)
  const [meta, setMeta] = useState(null)
  const [fps, setFps] = useState(2)
  const [scale, setScale] = useState(1)
  const [format, setFormat] = useState('image/png')
  const [quality, setQuality] = useState(QUALITY_DEFAULT)
  const [rangeStart, setRangeStart] = useState(0)
  const [rangeEnd, setRangeEnd] = useState(null) // null = to the end
  const [extracting, setExtracting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [frames, setFrames] = useState([])
  const [zipping, setZipping] = useState(false)
  const videoRef = useRef(null)

  // Unmount-only URL cleanup via a ref — with [srcUrl, frames] deps the
  // cleanup re-ran when extract() reset frames and revoked the source URL
  // mid-extraction ("Could not load video").
  const urlsRef = useRef({ frames: [] })
  useEffect(() => { urlsRef.current = { srcUrl, frames } })
  useEffect(() => () => {
    const u = urlsRef.current
    if (u.srcUrl) URL.revokeObjectURL(u.srcUrl)
    u.frames.forEach(f => URL.revokeObjectURL(f.url))
  }, [])

  const onFiles = useCallback((files) => {
    const f = Array.from(files)[0]
    if (!f) return
    if (!f.type.startsWith('video/') && !/\.(mp4|webm|mov|avi)$/i.test(f.name)) {
      toast('Please choose a video file (MP4, WebM, MOV, AVI)', 'error')
      return
    }
    if (f.size > LARGE_FILE_BYTES) toast('Heads up: file is over 50 MB — extraction may be slow', 'info')
    if (srcUrl) URL.revokeObjectURL(srcUrl)
    frames.forEach(fr => URL.revokeObjectURL(fr.url))
    setFile(f)
    setSrcUrl(URL.createObjectURL(f))
    setMeta(null)
    setFrames([])
    setProgress(0)
    setRangeStart(0)
    setRangeEnd(null)
  }, [srcUrl, frames, toast])

  const onLoadedMeta = useCallback(() => {
    const v = videoRef.current
    if (v) setMeta({ duration: v.duration, width: v.videoWidth, height: v.videoHeight })
  }, [])

  const extract = useCallback(async () => {
    if (!srcUrl || !meta || extracting) return
    setExtracting(true)
    setProgress(0)
    setFrames([])

    const video = document.createElement('video')
    video.muted = true
    video.preload = 'auto'
    video.src = srcUrl
    try {
      await new Promise((resolve, reject) => {
        video.onloadeddata = resolve
        video.onerror = () => reject(new Error('Could not load video'))
      })
    } catch (err) {
      toast(err.message, 'error')
      setExtracting(false)
      return
    }

    const outW = Math.max(1, Math.round(meta.width * scale))
    const outH = Math.max(1, Math.round(meta.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = outW
    canvas.height = outH
    const ctx = canvas.getContext('2d')

    const fmt = FRAME_FORMATS.find(f => f.id === format) || FRAME_FORMATS[0]
    const q = fmt.lossy ? quality / 100 : undefined

    const step = 1 / Math.max(0.1, Math.min(30, fps))
    const from = Math.max(0, Math.min(rangeStart || 0, meta.duration))
    const to = rangeEnd == null ? meta.duration : Math.max(from, Math.min(rangeEnd, meta.duration))
    const total = Math.max(1, Math.floor((to - from) / step))
    const out = []
    let t = from, idx = 0
    let unsupported = false
    let stopped = null

    try {
      while (t < to && idx < total + 1) {
        video.currentTime = t
        await new Promise((resolve, reject) => {
          const to = setTimeout(() => reject(new Error('Seek timed out')), 8000)
          video.onseeked = () => { clearTimeout(to); resolve() }
        })
        // JPEG has no alpha — fill white so transparent areas don't go black.
        if (fmt.id === 'image/jpeg') { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, outW, outH) }
        else ctx.clearRect(0, 0, outW, outH)
        ctx.drawImage(video, 0, 0, outW, outH)
        const blob = await new Promise(res => canvas.toBlob(res, fmt.id, q))
        // null blob => this browser can't encode the chosen format. Bail out of
        // the batch with a clear error rather than silently producing 0 frames.
        if (!blob) { unsupported = true; throw new Error(`${fmt.label} export not supported by this browser`) }
        out.push({
          blob, url: URL.createObjectURL(blob),
          name: `frame-${String(idx + 1).padStart(4, '0')}.${fmt.ext}`,
          time: t, size: blob.size,
        })
        idx++
        t += step
        setProgress(Math.round((idx / total) * 100))
      }
    } catch (err) {
      stopped = err.message
    }

    setFrames(out)
    setExtracting(false)
    setProgress(100)
    // ONE toast, chosen after the loop. The catch used to toast "Extracted N
    // frames (stopped: …)" and then this line toasted "Extracted N frames" in
    // the same tick — the second replaced the first before it painted, so a
    // run that stopped early reported itself as a clean success.
    if (!out.length) toast(unsupported ? stopped : `Extraction failed: ${stopped || 'no frames in that range'}`, 'error')
    else if (stopped) toast(`Extracted ${out.length} frames (stopped: ${stopped})`, 'info')
    else toast(`Extracted ${out.length} frames`)
  }, [srcUrl, meta, fps, scale, format, quality, rangeStart, rangeEnd, extracting, toast])

  const downloadAll = useCallback(async () => {
    if (!frames.length) return
    setZipping(true)
    try {
      const zip = new JSZip()
      frames.forEach(f => zip.file(f.name, f.blob))
      const content = await zip.generateAsync({ type: 'blob' })
      if (await gatedDownload(content, `frames-${(file?.name || 'video').replace(/\.[^.]+$/, '')}.zip`, 'download the extracted frames')) {
        toast(`Downloaded ZIP with ${frames.length} frames`)
      }
    } catch {
      toast('Failed to create ZIP file', 'error')
    }
    setZipping(false)
  }, [frames, file, toast, gatedDownload])

  const estFrom = meta ? Math.max(0, Math.min(rangeStart || 0, meta.duration)) : 0
  const estTo = meta ? (rangeEnd == null ? meta.duration : Math.max(estFrom, Math.min(rangeEnd, meta.duration))) : 0
  const est = meta ? Math.max(1, Math.floor((estTo - estFrom) * Math.max(0.1, Math.min(30, fps)))) : 0
  const fmt = FRAME_FORMATS.find(f => f.id === format) || FRAME_FORMATS[0]

  return (
    <>
      {!srcUrl ? (
        <DropZone accept="video/*,.mp4,.webm,.mov,.avi" onFiles={onFiles}
          hint="Drop a video here or click to browse" sub="MP4, WebM, MOV, AVI — output is a ZIP of image frames" />
      ) : (
        <div className="fc-bench">
          <div className="fc-bench-main">
            <VideoSource
              srcUrl={srcUrl}
              videoRef={videoRef}
              onLoadedMetadata={onLoadedMeta}
              facts={meta ? [
                ['File', file?.name],
                ['Size', formatBytes(file?.size)],
                ['Duration', formatTime(meta.duration)],
                ['Resolution', `${meta.width}×${meta.height}px`],
                ['Est. frames', est.toLocaleString()],
              ] : [['File', file?.name], ['Size', formatBytes(file?.size)]]}
            />
          </div>

          {meta && (
            <aside className="fc-inspector" aria-label="Extraction settings">
              <div className="fc-insp-sec">
                <div className="fc-pair">
                  <div>
                    <label className="fc-eyebrow" htmlFor="fc-fr-fps">Frames per second</label>
                    <input id="fc-fr-fps" className="fc-field fc-field--num" type="number" min="0.1" max="30" step="0.1" value={fps} disabled={extracting}
                      onChange={e => setFps(Math.max(0.1, Math.min(30, +e.target.value || 1)))} />
                  </div>
                  <div>
                    <label className="fc-eyebrow" htmlFor="fc-fr-scale">Scale</label>
                    <select id="fc-fr-scale" className="fc-field" value={scale} onChange={e => setScale(+e.target.value)} disabled={extracting}>
                      <option value={1}>100% (Original)</option>
                      <option value={0.75}>75%</option>
                      <option value={0.5}>50%</option>
                      <option value={0.25}>25%</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="fc-insp-sec">
                <label className="fc-eyebrow" htmlFor="fc-fr-format">Output format</label>
                <select id="fc-fr-format" className="fc-field" value={format} onChange={e => setFormat(e.target.value)} disabled={extracting}>
                  {FRAME_FORMATS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                </select>
                <span className="fc-eyebrow fc-eyebrow--sub">Quality</span>
                <SnapSlider
                  min={1} max={100} value={quality} defaultValue={QUALITY_DEFAULT}
                  snaps={QUALITY_SNAPS} unit="%"
                  onChange={setQuality}
                  disabled={extracting || !fmt.lossy}
                  ariaLabel="Frame quality"
                />
                {!fmt.lossy && <p className="fc-note">{fmt.label} is lossless — quality doesn&apos;t apply</p>}
              </div>
              <div className="fc-insp-sec">
                <span className="fc-eyebrow">Range (seconds)</span>
                <div className="fc-range">
                  <input className="fc-field fc-field--num" type="number" min="0" max={meta.duration} step="0.1" value={rangeStart} disabled={extracting}
                    onChange={e => setRangeStart(Math.max(0, Math.min(meta.duration, +e.target.value || 0)))}
                    aria-label="Range start (seconds)" />
                  <span className="fc-range-arrow" aria-hidden="true">→</span>
                  <input className="fc-field fc-field--num" type="number" min="0" max={meta.duration} step="0.1"
                    value={rangeEnd == null ? +meta.duration.toFixed(1) : rangeEnd} disabled={extracting}
                    onChange={e => setRangeEnd(Math.max(0, Math.min(meta.duration, +e.target.value || 0)))}
                    aria-label="Range end (seconds)" />
                </div>
                <p className="fc-note">
                  {formatTime(Math.max(0, estTo - estFrom))} of {formatTime(meta.duration)} · ~{est.toLocaleString()} frames
                </p>
              </div>
              <div className="fc-insp-sec fc-actions">
                <button type="button" className="fc-btn fc-btn--primary fc-btn--wide" onClick={extract} disabled={extracting}>
                  {extracting ? `Extracting… ${progress}%` : 'Extract Frames'}
                </button>
                {extracting && (
                  <div className="fc-progress" role="progressbar" aria-label="Frames extracted" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
                    <div className="fc-progress-bar" style={{ '--fc-pct': `${progress}%` }} />
                  </div>
                )}
              </div>
            </aside>
          )}
        </div>
      )}

      {frames.length > 0 && (
        <section className="fc-frames" aria-label="Extracted frames">
          <div className="fc-frames-head">
            <h2 className="fc-eyebrow">Extracted frames ({frames.length.toLocaleString()})</h2>
            <button type="button" className="fc-btn fc-btn--primary" onClick={downloadAll} disabled={zipping}>
              {zipping ? 'Creating ZIP…' : 'Download all as ZIP'}
            </button>
          </div>
          <ul className="fc-grid">
            {frames.map(f => (
              <li key={f.name}>
                <button type="button" className="fc-card fc-card--btn" onClick={() => gatedDownload(f.blob, f.name, 'download this frame')} title={`Download ${f.name}`} aria-label={`Download ${f.name}`}>
                  <span className="fc-thumb"><img src={f.url} alt="" /></span>
                  <span className="fc-name">{f.name}</span>
                  <span className="fc-meta">{formatBytes(f.size)} · {formatTime(f.time)}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}
