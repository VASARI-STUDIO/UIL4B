import MenuSelect from '../components/tool/MenuSelect'
import { useState, useCallback, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import JSZip from 'jszip'
import { ToolLayout, ToolButton } from '../components/tool/ToolLayout'
import SnapSlider from '../components/SnapSlider'
import ColorPickerPop from '../components/ColorPickerPop'
import DropZone from '../components/converter/DropZone'
import AnimationBuilder from '../components/converter/AnimationBuilder'
import JobStatus from '../components/converter/JobStatus'
import {
  loadImage, revealResult, scrollDocTo, stickyTopOffset, useGatedDownload,
} from '../components/converter/shared'
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
import Segmented from '../components/converter/Segmented'
import CropBox from '../components/converter/CropBox'
import ResultPreview from '../components/converter/ResultPreview'
import {
  ANIMATION_FORMATS, CORNER_DEFAULT, CORNER_MAX, CORNER_MIN, CROP_SHAPES, CUTOUTS, DIRECTIONS, DITHERS, FIT_MODES,
  FPS_MAX, FPS_MIN, FRAME_EXPORTS, GIF_COLOURS_MAX, GIF_COLOURS_MIN,
  MAX_ANIMATION_SIDE, MAX_FRAMES as ENGINE_MAX_FRAMES, PLAY_OPTIONS, PROBE_MAX_BYTES, QUALITY_LEVELS, SPEEDS, TRANSPARENT, TURNS,
  animatedImageSeconds, clampBox, clampFps, commitNumber, cropPlan, findVideoFormat, formatBytes, formatTime,
  outputFrames, outputSize, resolveFill, reverseFits, spriteFits, spriteLayout, splitPngStream, videoToAnimationArgs,
} from '../utils/mediaEncode'
import { engineLoaded, getFfmpeg, resetFfmpeg, runJob } from '../utils/ffmpegEngine'
import {
  avifEncodeKnown, blobMatches, canEncodeAvif, usableFormat, withAvifIf,
} from '../utils/avifSupport'
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
  { id: 'animation', label: 'Animation' },
  { id: 'video', label: 'Video' },
  { id: 'frames', label: 'Extract frames' },
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
// excluded here on purpose, whatever the browser can do, to keep batch frame
// extraction on the formats every browser encodes; ICO only makes sense for
// still images. The still-image picker offers AVIF only where it is confirmed
// (see utils/avifSupport.js).
const FRAME_FORMATS = OUTPUT_FORMATS.filter(f => f.id !== 'image/avif' && !f.ico)

const ACCEPT_IMAGE = 'image/png,image/jpeg,image/webp,image/gif,image/svg+xml,image/bmp,image/avif,image/x-icon,image/vnd.microsoft.icon,.png,.jpg,.jpeg,.webp,.gif,.svg,.bmp,.avif,.ico'
const ACCEPT_VIDEO = 'video/*,.mp4,.webm,.mov,.avi,.gif,.webp'

// Whether this browser can encode AVIF: null until the one-off probe answers,
// then true/false. A returning visit reads the remembered answer on first
// render, so the picker never changes shape after the first visit.
function useAvifEncode() {
  const [ok, setOk] = useState(avifEncodeKnown)
  useEffect(() => {
    if (ok !== null) return undefined
    let live = true
    canEncodeAvif().then(v => { if (live) setOk(v) })
    return () => { live = false }
  }, [ok])
  return ok
}

const LARGE_FILE_BYTES = 50 * 1024 * 1024 // 50 MB warning threshold
const MAX_FRAMES = 500 // frames per Extract run: a long clip at a high FPS can't freeze the tab
// How many frames a run over [from, to) makes at `fps` (before the cap): one per
// 1/fps step from `from`, so a 10.5 s clip at 1 fps is 11. The run, its toast and
// the estimate line all read this one number.
const frameCountFor = (from, to, fps) => Math.max(1, Math.ceil((to - from) * Math.max(0.1, Math.min(30, fps)) - 1e-9))

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

// The ffmpeg.wasm engine — pinned, fetched from jsDelivr on first use, never
// from our origin, single-threaded on purpose — lives in utils/ffmpegEngine.js
// with the full reasoning. The animation builder is its second caller.

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

// Air left between the sticky chrome (app header plus tool toolbar) and a
// node scrolled up under it.
const STICKY_GAP = 16

// Land the visitor on their own images after a homepage hand-off: focus the
// queue region (so assistive tech is told the viewport moved and where to) and
// scroll it clear of the sticky bar. Called only once, only for a hand-off that
// produced at least one real item.
function revealQueue(node) {
  // Never yank focus out of a control the visitor already started using — this
  // fires a frame after mount, so in practice nothing is focused yet.
  const active = document.activeElement
  if (!active || active === document.body || active === document.documentElement) {
    // preventScroll: the browser's own focus scroll ignores the sticky bar, so
    // we do the positioning ourselves below.
    node.focus({ preventScroll: true })
  }
  scrollDocTo(Math.max(0, node.getBoundingClientRect().top + window.scrollY - stickyTopOffset() - STICKY_GAP))
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

  const navigate = useNavigate()

  return (
    <ToolLayout
      className="fc"
      title="File Converter"
      titleId="fc-title"
      items={[
        // 3D files are converted by their own tool; this action links to it.
        {
          id: '3d',
          align: 'end',
          priority: 1,
          render: () => (
            <ToolButton as={Link} to="/create/3d-converter" aria-label="Open the 3D Model Converter">
              3D Model Converter
            </ToolButton>
          ),
          menu: { label: 'Open the 3D Model Converter', onSelect: () => navigate('/create/3d-converter') },
        },
      ]}
    >
      <div className="fc-modes">
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
        <p className="fc-about">
          Convert images between PNG, JPEG, WebP and favicon ICO (and to AVIF
          where your browser can make it), build
          animations from frames, edit videos and GIFs (crop, turn, speed,
          reverse) and save them as GIF, WebP, APNG, MP4 or WebM, or pull frames
          out of a video. It all runs in your browser and your files are never
          uploaded. Image conversion works offline. The video tools download a
          converter engine, about 9 MB, from a public code CDN the first time
          you use one, then keep it cached.
        </p>
      </div>

      <div className="fc-panel" role="tabpanel" id={`fc-panel-${mode}`} aria-labelledby={`fc-tab-${mode}`}>
        {mode === 'image' && <ImageConvert toast={toast} initialFiles={handoff?.files} initialDraft={handoff?.draft} />}
        {mode === 'animation' && <AnimationBuilder toast={toast} />}
        {mode === 'video' && <VideoConvert toast={toast} />}
        {mode === 'frames' && <VideoFrames toast={toast} />}
      </div>

      {/* A .blend file is written only by Blender itself. */}
      <p className="fc-3d-note">
        Converting to Blender&apos;s .blend needs Blender running on a server, so it is not offered here.
      </p>
    </ToolLayout>
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
  // AVIF is offered only where the browser really encodes it. A handed-over
  // AVIF draft is held as asked and resolved below: it applies once the check
  // says yes, and quietly becomes WebP if it says no.
  const avifOk = useAvifEncode()
  const [chosenFormat, setFormat] = useState(() => seeded?.format ?? 'image/webp')
  const format = usableFormat(chosenFormat, avifOk, 'image/webp')
  const outputFormats = withAvifIf(OUTPUT_FORMATS, avifOk)
  const [quality, setQuality] = useState(() => seeded?.quality ?? QUALITY_DEFAULT)
  const [maxDim, setMaxDim] = useState(() => seeded?.maxDim ?? 0) // 0 = keep original size
  const [renderScale, setRenderScale] = useState(1) // @1x / @2x export
  const [jpegBg, setJpegBg] = useState('#ffffff') // fill behind transparency (JPEG has no alpha)
  const [busy, setBusy] = useState(false)
  const [zipping, setZipping] = useState(false)
  // The region holding the uploaded items + their output settings — the thing a
  // hand-off visitor actually came to look at.
  const queueRef = useRef(null)
  const gridRef = useRef(null)

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
    // canvas.toBlob yields null — or quietly a PNG — when the browser can't
    // encode the requested format (notably AVIF in some browsers), and a
    // callback that never fires would wedge the whole batch in its busy state.
    // Guard all three so each item records a clear error and the batch keeps
    // going, and nothing is saved under a name that isn't its real format.
    const label = OUTPUT_FORMATS.find(f => f.id === format)?.label || format
    const blob = await new Promise((resolve, reject) => {
      const to = setTimeout(() => reject(new Error(`${label} export timed out`)), ENCODE_TIMEOUT_MS)
      canvas.toBlob(b => {
        clearTimeout(to)
        if (blobMatches(b, format)) resolve(b)
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
    // The converted files are the cards above the settings; on a one-column
    // bench the press happened below them.
    requestAnimationFrame(() => revealResult(gridRef.current))
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
  // An AVIF draft is described only once the browser has said whether it can
  // deliver it, so the note never claims AVIF and then changes its mind.
  const draftWaitsOnAvif = initialDraft?.format === 'image/avif' && avifOk === null
  const draftFormat = initialDraft && DRAFT_FORMATS.find(f => f.id === usableFormat(initialDraft.format, avifOk, 'image/webp'))
  const draftNotice = initialDraft && !draftWaitsOnAvif && {
    applied: [
      draftFormat?.label || initialDraft.format,
      DRAFT_RESOLUTIONS.find(r => r.id === initialDraft.resolution)?.detail || 'source size',
      draftFormat?.lossless ? 'lossless' : `quality ${seeded.quality}%`,
    ].join(' · '),
    limit: describeCompressionLimit(draftFormat?.id ?? initialDraft.format, initialDraft.compression),
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
            <ul className="fc-grid" aria-label="Queued images" ref={gridRef}>
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

          <div className="fc-side">
          <aside className="fc-inspector" aria-label="Output settings">
            <div className="fc-insp-sec">
              <label className="fc-eyebrow" htmlFor="fc-img-format">Output format</label>
              <MenuSelect label="Output format" id="fc-img-format" className="fc-field" value={format} onChange={nextValue => setFormat(nextValue)} disabled={busy}>
                {outputFormats.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
              </MenuSelect>
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
                    <MenuSelect label="Output size limit" id="fc-img-size" className="fc-field" value={maxDim} onChange={nextValue => setMaxDim(+nextValue)} disabled={busy} aria-label="Output size limit">
                      {SIZE_PRESETS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </MenuSelect>
                  </div>
                  <div>
                    <label className="fc-eyebrow" htmlFor="fc-img-scale">Export scale</label>
                    <MenuSelect label="Export render scale" id="fc-img-scale" className="fc-field" value={renderScale} onChange={nextValue => setRenderScale(+nextValue)} disabled={busy} aria-label="Export render scale">
                      {EXPORT_SCALES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </MenuSelect>
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

          </aside>

          {/* The run's action bar: under the settings in the side card, and
              pinned to the bottom of the screen on a one-column bench. */}
          <div className="fc-actionbar fc-actions">
            <div className="fc-actionbar-row">
              <button type="button" className="fc-btn fc-btn--primary fc-btn--wide" onClick={convertAll} disabled={busy}>
                {busy ? 'Converting…' : `Convert ${items.length} image${items.length > 1 ? 's' : ''}`}
              </button>
              {readyCount > 0 && (
                <button type="button" className="fc-btn" onClick={downloadAll} disabled={zipping}>
                  {zipping ? 'Creating ZIP…' : readyCount > 1 ? `Download all (${readyCount}) as ZIP` : 'Download'}
                </button>
              )}
              <button type="button" className="fc-btn" onClick={clearAll} disabled={busy}>Clear</button>
            </div>
            {busy && items.length > 1 && (
              <div className="fc-progress" role="progressbar" aria-label="Images converted" aria-valuemin={0} aria-valuemax={convertProgress.total} aria-valuenow={convertProgress.done}>
                <div className="fc-progress-bar" style={{ '--fc-pct': `${pct}%` }} />
              </div>
            )}
            {readyCount > 1 && (
              <p className="fc-batch">
                {readyCount} files: {formatBytes(totalOrig)} → {formatBytes(totalOut)}
                <Delta orig={totalOrig} out={totalOut} />
              </p>
            )}
          </div>
          </div>
        </section>
      )}
    </>
  )
}

/**
 * A video's source panel: the player, then the facts about the file. With
 * `editor` (the Video tab) the media sits in a stage that has the media's own
 * ratio, so the crop overlay's percentages land on the picture and not on
 * letterbox bars. Without it (Extract frames) it is the plain player.
 */
function VideoSource({ srcUrl, videoRef, imgRef, onLoadedMetadata, onError, facts, onReplace, busy, editor, toggle, after }) {
  const size = editor?.size
  const crop = editor?.crop
  return (
    <div className="fc-source">
      {toggle}
      {editor ? (
        <div className="fc-vstage" hidden={editor.hidden} style={size ? { '--src-w': size.w, '--src-h': size.h } : undefined}>
          {editor.isImage ? (
            <img
              ref={imgRef}
              src={srcUrl}
              alt="Animation preview"
              onLoad={e => editor.onImageLoad(e.currentTarget.naturalWidth, e.currentTarget.naturalHeight)}
              onError={onError}
            />
          ) : (
            <video ref={videoRef} src={srcUrl} controls muted playsInline aria-label="Video preview" onLoadedMetadata={onLoadedMetadata} onError={onError} />
          )}
          {editor.box && size ? (
            <CropBox box={editor.box} size={size} onChange={editor.onBox} disabled={editor.disabled} />
          ) : crop && size && (
            <div
              className="fc-crop-keep"
              aria-hidden="true"
              style={{
                left: `${(crop.x / size.w) * 100}%`,
                top: `${(crop.y / size.h) * 100}%`,
                width: `${(crop.w / size.w) * 100}%`,
                height: `${(crop.h / size.h) * 100}%`,
              }}
            />
          )}
        </div>
      ) : (
        <video ref={videoRef} src={srcUrl} controls muted className="fc-video" aria-label="Video preview" onLoadedMetadata={onLoadedMetadata} />
      )}
      {after}
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

/**
 * A number field that lets the visitor clear it and retype. The draft lives
 * here while the field is being edited; blur or Enter hands it to `onCommit`
 * (which decides what an empty or out-of-range draft means), and Escape drops
 * the draft and shows the last committed value again.
 */
function DraftNumber({ shown, onCommit, inputMode = 'numeric', ...rest }) {
  const [draft, setDraft] = useState(null)
  const done = () => {
    if (draft === null) return
    const raw = draft
    setDraft(null)
    onCommit(raw)
  }
  return (
    <input
      {...rest}
      type="text"
      inputMode={inputMode}
      autoComplete="off"
      value={draft ?? String(shown)}
      onChange={e => setDraft(e.target.value)}
      onBlur={done}
      onKeyDown={e => {
        if (e.key === 'Enter') { e.preventDefault(); done() }
        else if (e.key === 'Escape') setDraft(null)
      }}
    />
  )
}

/** One shape's glyph: a 16 x 16 outline in the shape's own proportions. */
function ShapeGlyph({ w, h, dashed }) {
  return (
    <svg className="fc-seg-glyph" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <rect
        x={(16 - w) / 2} y={(16 - h) / 2} width={w} height={h} rx="2"
        fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray={dashed ? '2 2' : undefined}
      />
    </svg>
  )
}

const SHAPE_GLYPH_SIZE = { '1:1': [12, 12], '4:5': [11, 14], '16:9': [16, 9], '9:16': [9, 16], custom: [12, 9] }
// The cut-outs, drawn as the outline they leave.
const CUT_GLYPH = {
  none: <rect x="2" y="3" width="12" height="10" rx="0" />,
  circle: <circle cx="8" cy="8" r="5.5" />,
  oval: <ellipse cx="8" cy="8" rx="6.5" ry="4.5" />,
  rounded: <rect x="2" y="3" width="12" height="10" rx="4" />,
}
const cutGlyph = (id) => (
  <svg className="fc-seg-glyph" viewBox="0 0 16 16" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.5">
    {CUT_GLYPH[id]}
  </svg>
)
const FILL_MODES = [{ id: 'clear', label: 'Transparent' }, { id: 'colour', label: 'Colour' }]
const VIEW_MODES = [{ id: 'before', label: 'Before' }, { id: 'after', label: 'After' }]
const FRAME_NOUN = { frames: 'frames ZIP', sprite: 'sprite sheet' }
const FRAMES_NOTE = 'Every frame the edits make, as numbered PNG files in one ZIP.'
const SPRITE_UNKNOWN_NOTE = 'A sprite sheet needs to know how long the clip is, and this file doesn’t say, so it’s off.'
const SPRITE_BIG_NOTE = 'That is too many frames for one sheet. Shorten the clip, lower the frame rate or make it narrower.'
const ANCHOR_LABELS = {
  x: [{ id: 'start', label: 'Left' }, { id: 'centre', label: 'Centre' }, { id: 'end', label: 'Right' }],
  y: [{ id: 'start', label: 'Top' }, { id: 'centre', label: 'Centre' }, { id: 'end', label: 'Bottom' }],
}
const FLIP_ID = { h: 'fc-vid-flip-h', v: 'fc-vid-flip-v' }
const REVERSE_OFF_NOTE = 'Reverse keeps every frame in memory, so it’s off for a clip this long. Shorten the clip, lower the frame rate or make it narrower.'
const REVERSE_UNKNOWN_NOTE = 'Reverse needs to know how long the clip is, and this file doesn’t say, so it’s off.'
const NO_PREVIEW_NOTE = 'Can’t preview this file, so crop is unavailable. Convert still works.'
const UNREADABLE_VIDEO_NOTE = 'This file could not be read as a video. Try saving it again as MP4 or WebM.'
// A file the browser can’t play (an AVI, say) may never report its size. After
// this long the panel stops saying "Reading the file…"; a late answer still wins.
const READ_TIMEOUT_MS = 5000

// ── Mode 3: Video → an animated file ─────────────────────────────────────────
// This was "Video → GIF". The engine it already loaded writes four more
// formats for the cost of a different argument list (utils/mediaEncode.js), so
// the same panel now offers GIF, animated WebP, APNG, MP4 and WebM. GIF stays
// the default and its command is unchanged for the default settings, which
// tests/unit/media-encode.test.js pins. Sound is dropped in every format:
// these are loops for a page, and saying so is better than a silent track
// that sometimes survives.
//
// It is also a small editor: crop to a shape, turn and flip, change speed, play
// forward, backward or as a boomerang, and (for GIF) choose colours and
// dither. Every one of those is an argument in mediaEncode.js, not a
// separate pass, so the clip is encoded once.
function VideoConvert({ toast }) {
  const gatedDownload = useGatedDownload()
  const [file, setFile] = useState(null)
  const [srcUrl, setSrcUrl] = useState(null)
  const [isImage, setIsImage] = useState(false) // a GIF or animated WebP, shown as an <img>
  const [srcSize, setSrcSize] = useState(null) // { w, h } once the file has said
  const [srcFailed, setSrcFailed] = useState(false) // the browser errored, or said nothing for READ_TIMEOUT_MS
  const [imageLen, setImageLen] = useState(null) // seconds read from a GIF/WebP's own header; null = still reading, 0 = can't tell
  const [format, setFormat] = useState('gif')
  const [fps, setFps] = useState(10)
  const [width, setWidth] = useState(480)
  const [quality, setQuality] = useState('medium')
  const [plays, setPlays] = useState(0)
  const [duration, setDuration] = useState(0)
  const [trimStart, setTrimStart] = useState(0)
  const [trimEnd, setTrimEnd] = useState(null) // null = to the end
  const [shape, setShape] = useState('original')
  const [anchor, setAnchor] = useState('centre')
  const [box, setBox] = useState(null) // the custom crop box, in source pixels
  const [fit, setFit] = useState('crop') // 'crop' cuts to the shape, 'fit' adds bars
  const [cut, setCut] = useState('none')
  const [radius, setRadius] = useState(CORNER_DEFAULT)
  const [fill, setFill] = useState(TRANSPARENT) // the colour outside bars and cut-outs
  const [fillColour, setFillColour] = useState('#000000')
  const [view, setView] = useState('before')
  const imgRef = useRef(null)
  const [turn, setTurn] = useState(0)
  const [flipH, setFlipH] = useState(false)
  const [flipV, setFlipV] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [direction, setDirection] = useState('forward')
  const [colours, setColours] = useState(GIF_COLOURS_MAX)
  const [dither, setDither] = useState('pattern')
  const [job, setJob] = useState(null)
  const [engineFailed, setEngineFailed] = useState(false)
  const [result, setResult] = useState(null) // { url, blob, bytes, format, sig }
  const videoRef = useRef(null)
  // One token per run. Cancel (and unmount) bumps it, and so does every new run,
  // so a run can only ever act while it is the latest one. A shared boolean,
  // which the next run reset to false, let a cancelled run wake up and encode.
  const runRef = useRef(0)
  const fmt = findVideoFormat(format)
  const working = !!job
  const resultRef = useRef(null)
  const revealNext = useRef(false)
  useEffect(() => {
    if (!result || !revealNext.current) return undefined
    revealNext.current = false
    const raf = requestAnimationFrame(() => revealResult(resultRef.current))
    return () => cancelAnimationFrame(raf)
  }, [result])

  // Unmount-only cleanup via a ref — with [srcUrl, result] deps the cleanup
  // re-ran on every state change and revoked URLs still in use. An encode still
  // running in the worker is stopped rather than left to finish for nobody.
  const liveRef = useRef({})
  useEffect(() => { liveRef.current = { srcUrl, resultUrl: result?.url, job } })
  useEffect(() => () => {
    const u = liveRef.current
    if (u.srcUrl) URL.revokeObjectURL(u.srcUrl)
    if (u.resultUrl) URL.revokeObjectURL(u.resultUrl)
    if (u.job) { runRef.current++; resetFfmpeg() }
  }, [])

  // The preview plays at the chosen speed. A media element goes back to its
  // default rate whenever it loads a source, so both rates are set together
  // here and again when its metadata arrives.
  const applyRate = useCallback(() => {
    const v = videoRef.current
    if (v) { v.defaultPlaybackRate = speed; v.playbackRate = speed }
  }, [speed])
  useEffect(() => { applyRate() }, [applyRate, srcUrl])

  // A file the browser can't play never fires loadedmetadata, and some browsers
  // fire no error either, so a timer ends the wait.
  useEffect(() => {
    if (!srcUrl || srcSize) return undefined
    const t = setTimeout(() => setSrcFailed(true), READ_TIMEOUT_MS)
    return () => clearTimeout(t)
  }, [srcUrl, srcSize])

  // An <img> hides its length, so a GIF or animated WebP is read for it (header
  // bytes only). Reverse needs the length to stay inside the memory budget.
  useEffect(() => {
    if (!file || !isImage) return undefined
    let live = true
    ;(file.size > PROBE_MAX_BYTES ? Promise.resolve(0) : file.arrayBuffer().then(animatedImageSeconds))
      .catch(() => 0)
      .then(s => { if (live) setImageLen(s) })
    return () => { live = false }
  }, [file, isImage])

  const onFiles = useCallback((files) => {
    const f = Array.from(files)[0]
    if (!f) return
    const animImage = /^image\/(gif|webp)$/.test(f.type) || /\.(gif|webp)$/i.test(f.name)
    const okType = f.type.startsWith('video/') || /\.(mp4|webm|mov|avi|gif|webp)$/i.test(f.name)
    if (!okType) { toast('Please choose a video, animated GIF or animated WebP', 'error'); return }
    if (f.size > LARGE_FILE_BYTES) toast('Heads up: file is over 50 MB — conversion may be slow or run out of memory', 'info')
    if (srcUrl) URL.revokeObjectURL(srcUrl)
    if (result?.url) URL.revokeObjectURL(result.url)
    setFile(f)
    setSrcUrl(URL.createObjectURL(f))
    setIsImage(animImage)
    setSrcSize(null)
    setSrcFailed(false)
    setImageLen(null)
    setResult(null)
    setDuration(0)
    setTrimStart(0)
    setTrimEnd(null)
    setShape('original')
    setAnchor('centre')
    setBox(null)
    setFit('crop')
    setView('before')
  }, [srcUrl, result, toast])

  // Picking Custom starts a box a tenth in from every edge, so there is
  // something to drag; the typed fields and the drag edit the same box.
  const pickShape = (id) => {
    setShape(id)
    if (id === 'custom' && !box && srcSize) {
      setBox(clampBox({ x: srcSize.w * 0.1, y: srcSize.h * 0.1, w: srcSize.w * 0.8, h: srcSize.h * 0.8 }, srcSize.w, srcSize.h))
    }
  }

  // ── What the settings come to ──────────────────────────────────────────────
  const start = Math.max(0, Math.min(trimStart || 0, duration || Infinity))
  const end = trimEnd == null ? duration : Math.min(trimEnd, duration || trimEnd)
  const clipLen = duration && end > start ? end - start : 0
  const trimmed = clipLen > 0 && (start > 0 || end < duration)
  const trimInvalid = duration > 0 && end <= start

  const plan = srcSize
    ? cropPlan(srcSize.w, srcSize.h, { shape, anchor, box, fit })
    : { crop: null, pad: null, frame: null }
  const crop = plan.crop
  const pad = plan.pad
  const outSize = srcSize ? outputSize(srcSize.w, srcSize.h, { crop: plan.frame, turn, width }) : null
  // Transparent only where the format can hold it; MP4 gets the colour.
  const outside = resolveFill(fmt, fill === TRANSPARENT && fmt.alpha ? TRANSPARENT : fillColour)
  const outsideShown = !!pad || cut !== 'none'
  const unreadable = srcFailed && !srcSize
  // The length Reverse is measured against: the clip for a video, the header's
  // sum of frame delays for a GIF or WebP. 0 means it is not known.
  const secs = clipLen > 0 ? clipLen : isImage ? imageLen || 0 : 0
  const forwardFrames = secs > 0 ? outputFrames(secs, speed, fps, 'forward') : 0
  // Reverse is on only when the clip is measured and fits. An unknown length is
  // treated as over budget (a long GIF would run the tab out of memory), and
  // while the file is still being read it stays off without a note.
  const lengthPending = !unreadable && (!srcSize || (isImage && imageLen === null))
  const reverseWhy = trimInvalid ? null
    : lengthPending ? 'pending'
      : secs <= 0 || !outSize ? 'unknown'
        : reverseFits(forwardFrames, outSize.w, outSize.h) ? null : 'long'
  const reverseOk = reverseWhy === null
  const dir = reverseOk ? direction : 'forward'
  // A direction that no longer fits falls back to Forward (adjusted during
  // render, the supported way to derive state from a change in other state).
  if (!reverseOk && direction !== 'forward') setDirection('forward')
  const frames = secs > 0 ? outputFrames(secs, speed, fps, dir) : 0
  const outSeconds = frames / clampFps(fps)
  const isGif = fmt.id === 'gif'
  const isFramesOut = fmt.id === 'frames'
  const isSprite = fmt.id === 'sprite'
  const isFrameExport = isFramesOut || isSprite
  // The sheet's grid, from how many frames the edits make (the engine writes at
  // most ENGINE_MAX_FRAMES). Not known while the clip's length is not.
  const sheet = isSprite && frames > 0 && outSize ? spriteLayout(Math.min(frames, ENGINE_MAX_FRAMES), outSize.w, outSize.h) : null
  const sheetWhy = !isSprite || trimInvalid ? null : !sheet ? (lengthPending ? null : 'unknown') : spriteFits(sheet) ? null : 'big'

  // Everything a result depends on. A result made from a different signature is
  // labelled out of date rather than presented as the current one.
  const sig = JSON.stringify([
    format, fps, width, isGif || isFrameExport ? 0 : quality, plays, trimStart, trimEnd, shape, anchor, turn, flipH, flipV, speed, dir,
    isGif ? colours : 0, isGif ? dither : 0, shape === 'custom' ? box : 0, shape === 'original' ? 0 : fit, cut, cut === 'rounded' ? radius : 0, outsideShown ? outside : 0,
  ])

  const convert = useCallback(async () => {
    if (!file || working) return
    if (trimInvalid) {
      toast('Trim end must be after trim start', 'error')
      return
    }
    if (!engineLoaded() && !navigator.onLine) {
      toast('You appear to be offline — the converter engine needs a connection to load', 'error')
      return
    }
    const run = ++runRef.current
    const stale = () => runRef.current !== run
    setEngineFailed(false)
    setResult(prev => { if (prev?.url) URL.revokeObjectURL(prev.url); return null })
    const target = fmt
    let ffmpeg
    try {
      // The 9 MB sentence is the promise; the bytes are the evidence.
      // Measured 2026-09-09: the engine download showed a spinner and that one
      // sentence for its whole duration, at every width — on a phone connection
      // that is a minute of nothing moving. JobStatus shows the count against
      // the stated total whenever the CDN's total can be trusted.
      if (!engineLoaded()) setJob({ stage: 'engine', received: 0, bytesTotal: 0 })
      ffmpeg = await getFfmpeg(({ received, total }) => {
        if (!stale()) setJob({ stage: 'engine', received, bytesTotal: total })
      })
    } catch (err) {
      if (stale()) return
      setJob(null)
      setEngineFailed(true)
      // A core that fails its pinned SHA-256 was never run; say that, not "offline".
      toast(err?.name === 'IntegrityError'
        ? 'The converter engine that arrived did not match its pinned fingerprint, so it was not run. Try again later, or use the Image tab.'
        : 'Could not load the converter engine. Check your connection or try the Image tab.', 'error')
      return
    }
    if (stale()) return

    // ffmpeg's time= counts OUTPUT time, so after a speed change the bar's
    // total is the length of what comes out, not of what goes in.
    const total = frames / clampFps(fps)
    const inName = 'input' + (file.name.match(/\.[^.]+$/)?.[0] || '.mp4')
    setJob({ stage: 'encode', done: 0, total, unit: 'time' })
    try {
      const bytes = await runJob(ffmpeg, {
        inputs: [{ name: inName, data: file }],
        args: videoToAnimationArgs({
          format: target.id, input: inName, fps, width, plays, quality,
          start, length: trimmed ? clipLen : 0,
          crop, pad, turn, flipH, flipV, speed, direction: dir, colours, dither,
          fill: outside.transparent ? TRANSPARENT : outside.colour, cut, radius, sheet, maxFrames: ENGINE_MAX_FRAMES,
        }),
        output: `output.${target.engineExt || target.ext}`,
        onTime: (t) => { if (!stale()) setJob({ stage: 'encode', done: t, total, unit: 'time' }) },
      })
      if (stale()) return
      let blob
      let count = 0
      if (target.id === 'frames') {
        // The engine wrote the frames as one PNG stream; each goes in the ZIP
        // as its own numbered file. PNGs are already compressed, so they are stored.
        const pngs = splitPngStream(bytes)
        if (!pngs.length) throw new Error('the encoder produced no frames')
        const zip = new JSZip()
        const stem = (file.name || 'video').replace(/.[^.]+$/, '')
        pngs.forEach((png, i) => zip.file(`${stem}-${String(i + 1).padStart(4, '0')}.png`, png))
        blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' })
        count = pngs.length
        if (stale()) return
      } else {
        blob = new Blob([bytes], { type: target.mime })
      }
      revealNext.current = true
      setResult({ url: URL.createObjectURL(blob), blob, bytes: blob.size, format: target.id, sig, count, sheet: target.id === 'sprite' ? sheet : null, size: outSize })
      setJob(null)
      toast(`${target.label} ready`)
    } catch (err) {
      if (stale()) return
      setJob(null)
      toast(dir !== 'forward'
        ? 'Conversion failed. Reverse keeps every frame in memory; try a shorter clip or a narrower width.'
        : /encoder stopped with code/.test(err?.message || '')
          ? UNREADABLE_VIDEO_NOTE
          : 'Conversion failed: ' + (err?.message || 'unknown error'), 'error')
    }
  }, [file, working, fmt, width, fps, plays, quality, trimInvalid, trimmed, clipLen, start, crop, pad, turn, flipH, flipV, speed, dir, colours, dither, outside, cut, radius, sheet, outSize, frames, sig, toast])

  const cancel = () => {
    runRef.current++
    resetFfmpeg()
    setJob(null)
    toast('Conversion cancelled', 'info')
  }

  // The result's blob: URL goes too: it pins the whole encoded file until
  // revoked, and a replaced source leaves nothing that could show it again.
  const clearFile = () => {
    setFile(null)
    if (srcUrl) URL.revokeObjectURL(srcUrl)
    setSrcUrl(null)
    setResult(prev => { if (prev?.url) URL.revokeObjectURL(prev.url); return null })
  }
  const resultFmt = result ? findVideoFormat(result.format) : null
  const base = (file?.name || 'video').replace(/\.[^.]+$/, '')

  // ── The controls' options ──────────────────────────────────────────────────
  const srcRatio = srcSize ? srcSize.w / srcSize.h : 1
  const shapeOptions = CROP_SHAPES.map(s => {
    let glyph
    if (s.id === 'original') {
      glyph = srcRatio >= 1 ? <ShapeGlyph w={16} h={16 / srcRatio} dashed /> : <ShapeGlyph w={16 * srcRatio} h={16} dashed />
    } else {
      const [gw, gh] = SHAPE_GLYPH_SIZE[s.id]
      glyph = <ShapeGlyph w={gw} h={gh} />
    }
    return { id: s.id, label: s.label, glyph }
  })
  const anchorOptions = ANCHOR_LABELS[(crop || pad)?.axis || 'x']
  const cutOptions = CUTOUTS.map(c => ({ id: c.id, label: c.label, glyph: cutGlyph(c.id) }))
  const setBoxField = (key, raw) => {
    if (!srcSize || !box) return
    const room = { x: srcSize.w - box.w, y: srcSize.h - box.h, w: srcSize.w - box.x, h: srcSize.h - box.y }[key]
    const next = commitNumber(raw, { min: key === 'x' || key === 'y' ? 0 : 2, max: Math.max(0, room), fallback: box[key] })
    setBox(clampBox({ ...box, [key]: next }, srcSize.w, srcSize.h))
  }
  const defaultBox = srcSize
    ? clampBox({ x: srcSize.w * 0.1, y: srcSize.h * 0.1, w: srcSize.w * 0.8, h: srcSize.h * 0.8 }, srcSize.w, srcSize.h)
    : null
  const switchView = (v) => {
    setView(v)
    if (v === 'after') videoRef.current?.pause()
  }
  const previewReady = view === 'after' && !!srcSize && !!outSize && !unreadable
  const speedOptions = SPEEDS.map(s => ({ id: s.id, label: s.label, name: s.name }))
  const flipBtn = (axis, on, set) => (
    <button
      type="button"
      id={FLIP_ID[axis]}
      className="fc-btn fc-toggle"
      aria-pressed={on}
      disabled={working}
      onClick={() => set(!on)}
    >
      {axis === 'h' ? 'Flip horizontal' : 'Flip vertical'}
    </button>
  )

  const consequence = !srcSize
    ? (unreadable ? NO_PREVIEW_NOTE : 'Reading the file…')
    : isSprite && sheet
      ? `${sheet.cols} × ${sheet.rows} sheet · ${sheet.w} × ${sheet.h} px`
      : isFramesOut && frames > 0
        ? `${Math.min(frames, ENGINE_MAX_FRAMES)} PNG${frames === 1 ? '' : 's'} · ${outSize.w} × ${outSize.h} px each`
        : `${outSize.w} × ${outSize.h} px` + (frames > 0 ? ` · ${outSeconds.toFixed(1)} s · ${frames} frame${frames === 1 ? '' : 's'}` : '')
  const actionLabel = isFrameExport ? `Make ${FRAME_NOUN[fmt.id]}` : `Convert to ${fmt.label}`
  const resultName = result?.format === 'frames' ? `${base}-frames.zip` : result?.format === 'sprite' ? `${base}-sprite.png` : `${base}.${resultFmt?.ext}`
  const resultNoun = FRAME_NOUN[result?.format] || resultFmt?.label

  return (
    <>
      {!srcUrl ? (
        <DropZone
          accept={ACCEPT_VIDEO}
          onFiles={onFiles}
          hint="Drop a video or GIF to edit and convert"
          sub="MP4, WebM, MOV, AVI, GIF or animated WebP. Crop, turn, change the speed or reverse it, then save as GIF, WebP, APNG, MP4 or WebM."
        />
      ) : (
        <div className="fc-bench">
          <div className="fc-bench-main">
            <VideoSource
              srcUrl={srcUrl}
              videoRef={videoRef}
              imgRef={imgRef}
              toggle={srcSize && !unreadable ? (
                <Segmented id="fc-vid-view" label="Preview" options={VIEW_MODES} value={view} onChange={switchView} className="fc-seg--view" />
              ) : null}
              after={previewReady ? (
                <ResultPreview
                  mediaRef={isImage ? imgRef : videoRef} isImage={isImage} srcSize={srcSize} plan={plan}
                  turn={turn} flipH={flipH} flipV={flipV} cut={cut} radius={radius} outside={outside}
                  outSize={outSize} dir={dir} speed={speed} fps={fps} start={start} len={secs} facts={consequence}
                />
              ) : null}
              // A recorded WebM often reports Infinity until it is played
              // through; treat that as unknown rather than as a length.
              onError={() => setSrcFailed(true)}
              onLoadedMetadata={e => {
                const v = e.target
                setDuration(Number.isFinite(v.duration) ? v.duration : 0)
                if (v.videoWidth > 0 && v.videoHeight > 0) setSrcSize({ w: v.videoWidth, h: v.videoHeight })
                applyRate()
              }}
              editor={{
                isImage,
                size: srcSize,
                crop,
                box: shape === 'custom' ? box : null,
                onBox: setBox,
                disabled: working,
                hidden: previewReady,
                onImageLoad: (w, h) => { if (w > 0 && h > 0) setSrcSize({ w, h }) },
              }}
              facts={[
                ['File', file?.name],
                ['Size', formatBytes(file?.size)],
                ...(isImage && srcSize ? [['Dimensions', `${srcSize.w} × ${srcSize.h}`]] : []),
                ...(duration > 0 ? [['Duration', formatTime(duration)]] : []),
              ]}
              onReplace={clearFile}
              busy={working}
            />
            {result && (
              <section className="fc-result" aria-label="Result" ref={resultRef}>
                <h2 className="fc-eyebrow">Result</h2>
                {resultFmt.kind === 'video' ? (
                  <video className="fc-result-media" src={result.url} controls loop muted playsInline aria-label={`${resultFmt.label} result`} />
                ) : resultFmt.kind === 'frames' ? null : (
                  <img className="fc-result-media" src={result.url} alt={`${resultFmt.label} result`} />
                )}
                <p className="fc-meta">
                  {resultFmt.label} · {file?.size ? <>{formatBytes(file.size)} → {formatBytes(result.bytes)}</> : formatBytes(result.bytes)}
                  {file?.size ? <Delta orig={file.size} out={result.bytes} /> : null}
                </p>
                {result.format === 'frames' && result.size && (
                  <p className="fc-note">{result.count} numbered PNG file{result.count === 1 ? '' : 's'}, {result.size.w} × {result.size.h} px each.</p>
                )}
                {result.format === 'sprite' && result.sheet && result.size && (
                  <p className="fc-note">{result.sheet.cols} across, {result.sheet.rows} down. Each frame is {result.size.w} × {result.size.h} px.</p>
                )}
                {result.sig !== sig && (
                  <p className="fc-note fc-note--warn">Settings changed since this was made. Convert again to update it.</p>
                )}
                <button type="button" className="fc-btn fc-btn--primary" onClick={() => gatedDownload(result.blob, resultName, `download the ${resultNoun}`)}>
                  Download {resultNoun}
                </button>
              </section>
            )}
          </div>

          <div className="fc-side">
          <aside className="fc-inspector" aria-label="Conversion settings">
            <div className="fc-insp-sec">
              <label className="fc-eyebrow" htmlFor="fc-vid-format">Output format</label>
              <MenuSelect label="Output format" id="fc-vid-format" className="fc-field" value={format} onChange={nextValue => setFormat(nextValue)} disabled={working}>
                <optgroup label="Animation">
                  {ANIMATION_FORMATS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                </optgroup>
                <optgroup label="Frames">
                  {FRAME_EXPORTS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                </optgroup>
              </MenuSelect>
              {isFramesOut && <p className="fc-note">{FRAMES_NOTE}{frames > ENGINE_MAX_FRAMES ? ` The first ${ENGINE_MAX_FRAMES} of ${frames} are saved.` : ''}</p>}
              {isSprite && (
                <p className="fc-note">
                  {sheetWhy === 'unknown' ? SPRITE_UNKNOWN_NOTE
                    : sheetWhy === 'big' ? SPRITE_BIG_NOTE
                      : sheet ? `One PNG: ${sheet.cols} across, ${sheet.rows} down, each frame ${outSize.w} × ${outSize.h} px.`
                        : 'Every frame the edits make, tiled in one PNG.'}
                </p>
              )}
              {!isFrameExport && <p className="fc-note">Sound is removed</p>}
            </div>
            {duration > 0 && (
              <div className="fc-insp-sec">
                <span className="fc-eyebrow">Trim (seconds)</span>
                <div className="fc-range">
                  <DraftNumber
                    className="fc-field fc-field--num" inputMode="decimal" disabled={working}
                    aria-label="Trim start (seconds)"
                    shown={trimStart}
                    onCommit={raw => setTrimStart(commitNumber(raw, { min: 0, max: duration, fallback: trimStart, decimals: 1 }))}
                  />
                  <span className="fc-range-arrow" aria-hidden="true">→</span>
                  <DraftNumber
                    className="fc-field fc-field--num" inputMode="decimal" disabled={working}
                    aria-label="Trim end (seconds)"
                    shown={trimEnd == null ? +duration.toFixed(1) : trimEnd}
                    onCommit={raw => setTrimEnd(String(raw).trim() === '' ? null : commitNumber(raw, { min: 0, max: duration, fallback: null, decimals: 1 }))}
                  />
                </div>
                {trimInvalid ? (
                  <p className="fc-note fc-note--warn">The end is before the start. Change one of them.</p>
                ) : (
                  <p className="fc-note">
                    clip: {formatTime(Math.max(0, end - start))} of {formatTime(duration)}
                  </p>
                )}
              </div>
            )}
            <div className="fc-insp-sec">
              <Segmented
                id="fc-vid-shape" label="Shape" options={shapeOptions} value={shape} onChange={pickShape}
                disabled={working || !srcSize} className="fc-seg--shape"
              />
              {!srcSize && <p className="fc-note">{unreadable ? NO_PREVIEW_NOTE : 'Reading the file…'}</p>}
              {shape === 'custom' && box && srcSize && (
                <>
                  <div className="fc-box-grid">
                    {[['x', 'Left'], ['y', 'Top'], ['w', 'Width'], ['h', 'Height']].map(([key, label]) => (
                      <div key={key}>
                        <label className="fc-eyebrow" htmlFor={`fc-vid-box-${key}`}>{label} (px)</label>
                        <DraftNumber
                          id={`fc-vid-box-${key}`} className="fc-field fc-field--num" disabled={working}
                          shown={box[key]} onCommit={raw => setBoxField(key, raw)}
                        />
                      </div>
                    ))}
                  </div>
                  <p className="fc-note">Drag the box on the preview, or type its numbers. They are pixels of the original, {srcSize.w} × {srcSize.h}.</p>
                  <button type="button" className="fc-btn fc-btn--quiet" onClick={() => setBox(defaultBox)} disabled={working}>Reset box</button>
                  {!crop && <p className="fc-note">The box covers the whole picture, so nothing is cut.</p>}
                </>
              )}
              {shape !== 'original' && shape !== 'custom' && (
                <>
                  <Segmented id="fc-vid-fit" label="Crop or fit" options={FIT_MODES} value={fit} onChange={setFit} disabled={working} />
                  <p className="fc-note">{fit === 'fit' ? 'Fit keeps the whole picture and adds bars to reach the shape. Check them in After.' : 'Crop cuts off what does not fit the shape.'}</p>
                  <Segmented
                    id="fc-vid-anchor" label="Position" options={anchorOptions} value={anchor} onChange={setAnchor}
                    disabled={working || !(crop || pad)}
                  />
                  {!(crop || pad) && <p className="fc-note">{fit === 'fit' ? 'Already this shape, so no bars are added' : 'Nothing to cut at this shape'}</p>}
                </>
              )}
            </div>
            <div className="fc-insp-sec">
              <Segmented id="fc-vid-cut" label="Cut-out" options={cutOptions} value={cut} onChange={setCut} disabled={working} className="fc-seg--shape" />
              {cut === 'rounded' && (
                <div className="fc-pair">
                  <div>
                    <label className="fc-eyebrow" htmlFor="fc-vid-radius">Corner radius (%)</label>
                    <DraftNumber
                      id="fc-vid-radius" className="fc-field fc-field--num" disabled={working}
                      shown={radius} onCommit={raw => setRadius(commitNumber(raw, { min: CORNER_MIN, max: CORNER_MAX, fallback: radius }))}
                    />
                  </div>
                </div>
              )}
              {cut !== 'none' && <p className="fc-note">Everything outside the {cut === 'rounded' ? 'rounded corners' : cut} is cleared or filled.</p>}
              {outsideShown && (
                <>
                  <Segmented
                    id="fc-vid-outside" label="Outside" options={FILL_MODES} value={outside.transparent ? 'clear' : 'colour'}
                    onChange={id => setFill(id === 'clear' ? TRANSPARENT : 'colour')} disabled={working}
                    isOptionDisabled={o => o.id === 'clear' && !fmt.alpha}
                  />
                  {!outside.transparent && (
                    <div className="fc-row">
                      <ColorPickerPop
                        value={fillColour} onChange={setFillColour} disabled={working}
                        ariaLabel="Outside colour" triggerClassName="fc-bg-pick"
                      />
                      <p className="fc-note">{pad ? 'Colour of the bars' : 'Colour outside the cut-out'}</p>
                    </div>
                  )}
                  {!fmt.alpha && <p className="fc-note">{fmt.label} has no transparency, so the outside is filled with a colour.</p>}
                  {fmt.id === 'gif' && outside.transparent && <p className="fc-note">GIF transparency is on or off, so the edge of a cut-out is not smooth.</p>}
                </>
              )}
            </div>
            <div className="fc-insp-sec">
              <Segmented id="fc-vid-turn" label="Turn" options={TURNS} value={turn} onChange={setTurn} disabled={working} />
              <div className="fc-flip-pair">
                {flipBtn('h', flipH, setFlipH)}
                {flipBtn('v', flipV, setFlipV)}
              </div>
              {(turn !== 0 || flipH || flipV) && <p className="fc-note">Turn and flip show in the result, not the preview.</p>}
            </div>
            <div className="fc-insp-sec">
              <Segmented id="fc-vid-speed" label="Speed" options={speedOptions} value={speed} onChange={setSpeed} disabled={working} className="fc-seg--speed" />
              <p className="fc-note">{isImage ? 'Speed shows in the result.' : 'The preview plays at this speed.'}</p>
              <Segmented
                id="fc-vid-direction" label="Direction" options={DIRECTIONS} value={dir} onChange={setDirection} disabled={working}
                isOptionDisabled={o => o.id !== 'forward' && !reverseOk}
              />
              {reverseWhy === 'long' ? (
                <p className="fc-note">{REVERSE_OFF_NOTE}</p>
              ) : reverseWhy === 'unknown' ? (
                <p className="fc-note">{REVERSE_UNKNOWN_NOTE}</p>
              ) : dir !== 'forward' ? (
                <p className="fc-note">Shows in the result, not the preview.</p>
              ) : null}
              <div className="fc-pair">
                <div>
                  <label className="fc-eyebrow" htmlFor="fc-vid-fps">Frame rate (fps)</label>
                  <DraftNumber
                    id="fc-vid-fps" className="fc-field fc-field--num" disabled={working}
                    shown={fps}
                    onCommit={raw => setFps(commitNumber(raw, { min: FPS_MIN, max: FPS_MAX, fallback: fps }))}
                  />
                </div>
                <div>
                  <label className="fc-eyebrow" htmlFor="fc-vid-loop">Loop</label>
                  <MenuSelect label="Loop" id="fc-vid-loop" className="fc-field" value={fmt.loops ? plays : 0} onChange={nextValue => setPlays(+nextValue)} disabled={working || !fmt.loops}>
                    {PLAY_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                  </MenuSelect>
                </div>
              </div>
              {!fmt.loops && !isFrameExport && <p className="fc-note">Video files store no loop count — the player decides</p>}
            </div>
            <div className="fc-insp-sec">
              <div className="fc-pair">
                <div>
                  <label className="fc-eyebrow" htmlFor="fc-vid-width">Width (px)</label>
                  <DraftNumber
                    id="fc-vid-width" className="fc-field fc-field--num" disabled={working}
                    shown={width}
                    onCommit={raw => setWidth(commitNumber(raw, { min: 16, max: MAX_ANIMATION_SIDE, fallback: width }))}
                  />
                </div>
              </div>
              <p className="fc-note">Up to {MAX_ANIMATION_SIDE} px on the longer side. Height follows the crop and turn.</p>
              {isGif ? (
                <>
                  <div className="fc-pair">
                    <div>
                      <label className="fc-eyebrow" htmlFor="fc-vid-colours">Colours</label>
                      <DraftNumber
                        id="fc-vid-colours" className="fc-field fc-field--num" disabled={working}
                        shown={colours}
                        onCommit={raw => setColours(commitNumber(raw, { min: GIF_COLOURS_MIN, max: GIF_COLOURS_MAX, fallback: colours }))}
                      />
                    </div>
                  </div>
                  <p className="fc-note">Up to 256. Fewer colours make a smaller file.</p>
                  <Segmented id="fc-vid-dither" label="Dither" options={DITHERS} value={dither} onChange={setDither} disabled={working} />
                  <p className="fc-note">Pattern is Bayer, Diffusion is Floyd-Steinberg.</p>
                </>
              ) : isFrameExport ? (
                <p className="fc-note">PNG frames are lossless, so colours and quality do not apply.</p>
              ) : (
                <>
                  <div className="fc-pair">
                    <div>
                      <label className="fc-eyebrow" htmlFor="fc-vid-quality">Quality</label>
                      <MenuSelect label="Quality" id="fc-vid-quality" className="fc-field" value={quality} onChange={nextValue => setQuality(nextValue)} disabled={working || fmt.id === 'apng'}>
                        {QUALITY_LEVELS.map(q => <option key={q.id} value={q.id}>{q.label}</option>)}
                      </MenuSelect>
                    </div>
                  </div>
                  {fmt.id === 'apng' && <p className="fc-note">APNG is lossless — quality doesn&apos;t apply</p>}
                </>
              )}
            </div>
          </aside>
          <div className="fc-actionbar fc-actions">
            <p className="fc-note fc-consequence" aria-live="polite">{consequence}</p>
            <button type="button" className="fc-btn fc-btn--primary fc-btn--wide" onClick={convert} disabled={working || trimInvalid || (isSprite && (!sheet || !!sheetWhy))}>
              {working ? (job.stage === 'engine' ? 'Loading engine…' : 'Converting…') : actionLabel}
            </button>
            <JobStatus job={job} engineFailed={engineFailed} onCancel={working ? cancel : null} />
          </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── Mode 4: Video → Frames (HTML5 video + canvas seek) ───────────────────────

// Waits for a media event, but lets the run's AbortSignal cut the wait short so
// a pending seek or load can't keep a cancelled or unmounted run alive.
// `attach(ok, fail)` wires the event handlers; the timeout is optional.
function waitFor(signal, attach, timeoutMs = 0, timeoutMessage = 'Timed out') {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new DOMException('Aborted', 'AbortError')); return }
    let timer = 0
    const settle = { onAbort: null }
    const finish = (fn, value) => {
      clearTimeout(timer)
      signal.removeEventListener('abort', settle.onAbort)
      fn(value)
    }
    settle.onAbort = () => finish(reject, new DOMException('Aborted', 'AbortError'))
    signal.addEventListener('abort', settle.onAbort, { once: true })
    if (timeoutMs) timer = setTimeout(() => finish(reject, new Error(timeoutMessage)), timeoutMs)
    attach(() => finish(resolve), err => finish(reject, err))
  })
}

// Stops the decoder and drops the file reference so the element can be collected.
function releaseVideo(video) {
  video.onloadeddata = null
  video.onseeked = null
  video.onerror = null
  video.pause()
  video.removeAttribute('src')
  video.load()
}

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
  const framesRef = useRef(null)
  const revealNext = useRef(false)
  useEffect(() => {
    if (!frames.length || !revealNext.current) return undefined
    revealNext.current = false
    const raf = requestAnimationFrame(() => revealResult(framesRef.current))
    return () => cancelAnimationFrame(raf)
  }, [frames])

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

  // One abort mechanism for the running extraction: the AbortController of the
  // current run, or null when idle. The reason says why it was aborted:
  // 'cancel' (button) or 'disposed' (unmount / another video picked; see disposedRef).
  const abortRef = useRef(null)
  // Runs whose page or file is gone. An AbortController keeps only its FIRST
  // abort reason, so Cancel followed by leaving would read as a plain cancel;
  // this records leave/newfile on its own and abandoned() reads it, not the reason.
  const disposedRef = useRef(new WeakSet())
  const disposeRun = useCallback(() => {
    if (!abortRef.current) return false
    disposedRef.current.add(abortRef.current)
    abortRef.current.abort('disposed')
    return true
  }, [])
  const refocusExtract = useRef(false)
  const extractBtnRef = useRef(null)
  useEffect(() => disposeRun, [disposeRun])
  // The Cancel button unmounts when the run ends, so hand focus back to Extract.
  useEffect(() => {
    if (extracting || !refocusExtract.current) return
    refocusExtract.current = false
    extractBtnRef.current?.focus()
  }, [extracting])

  const cancelExtract = () => {
    if (!abortRef.current) return
    refocusExtract.current = true
    abortRef.current.abort('cancel')
  }

  const onFiles = useCallback((files) => {
    const f = Array.from(files)[0]
    if (!f) return
    if (!f.type.startsWith('video/') && !/\.(mp4|webm|mov|avi)$/i.test(f.name)) {
      toast('Please choose a video file (MP4, WebM, MOV, AVI)', 'error')
      return
    }
    if (f.size > LARGE_FILE_BYTES) toast('Heads up: file is over 50 MB — extraction may be slow', 'info')
    // A run in flight belongs to the old file: stop it before its source URL goes.
    if (disposeRun()) {
      abortRef.current = null
      setExtracting(false)
    }
    if (srcUrl) URL.revokeObjectURL(srcUrl)
    frames.forEach(fr => URL.revokeObjectURL(fr.url))
    setFile(f)
    setSrcUrl(URL.createObjectURL(f))
    setMeta(null)
    setFrames([])
    setProgress(0)
    setRangeStart(0)
    setRangeEnd(null)
  }, [srcUrl, frames, toast, disposeRun])

  const onLoadedMeta = useCallback(() => {
    const v = videoRef.current
    if (v) setMeta({ duration: v.duration, width: v.videoWidth, height: v.videoHeight })
  }, [])

  const extract = useCallback(async () => {
    // abortRef is the real "already running" guard: `extracting` is stale for a
    // second click in the same tick.
    if (!srcUrl || !meta || extracting || abortRef.current) return
    const ac = new AbortController()
    const { signal } = ac
    abortRef.current = ac
    setExtracting(true)
    setProgress(0)
    // A second extraction replaces the first: revoke its thumbnails' blob: URLs
    // rather than leaving every earlier frame pinned for the life of the page.
    setFrames(prev => { prev.forEach(fr => URL.revokeObjectURL(fr.url)); return [] })

    const video = document.createElement('video')
    const out = []
    // Leaving the page or swapping the file means nobody can see this run any
    // more: no state, no toast, and the frames it made have no owner to revoke them.
    const abandoned = () => disposedRef.current.has(ac)
    const abandon = () => out.forEach(fr => URL.revokeObjectURL(fr.url))
    try {
      video.muted = true
      video.preload = 'auto'
      video.src = srcUrl
      try {
        await waitFor(signal, (ok, fail) => {
          video.onloadeddata = ok
          video.onerror = () => fail(new Error('Could not load video'))
        })
      } catch (err) {
        if (abandoned()) return
        if (signal.aborted) {
          setExtracting(false)
          toast('Extraction cancelled', 'info')
          return
        }
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
      const wanted = frameCountFor(from, to, fps) // the same count the estimate line shows
      const cap = Math.min(MAX_FRAMES, wanted)
      let t = from, idx = 0
      let unsupported = false
      let stopped = null

      try {
        while (t < to && idx < cap && !signal.aborted) {
          const at = t
          await waitFor(signal, ok => { video.onseeked = ok; video.currentTime = at }, 8000, 'Seek timed out')
          // JPEG has no alpha — fill white so transparent areas don't go black.
          if (fmt.id === 'image/jpeg') { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, outW, outH) }
          else ctx.clearRect(0, 0, outW, outH)
          ctx.drawImage(video, 0, 0, outW, outH)
          const blob = await new Promise(res => canvas.toBlob(res, fmt.id, q))
          // toBlob can't be interrupted; drop its result if the run ended meanwhile.
          if (signal.aborted) break
          // null blob, or one of another type (a PNG under a .webp name) => this
          // browser can't encode the chosen format. Bail out of the batch with a
          // clear error rather than silently producing 0 frames or wrong files.
          if (!blobMatches(blob, fmt.id)) { unsupported = true; throw new Error(`${fmt.label} export not supported by this browser`) }
          out.push({
            blob, url: URL.createObjectURL(blob),
            name: `frame-${String(idx + 1).padStart(4, '0')}.${fmt.ext}`,
            time: t, size: blob.size,
          })
          idx++
          t += step
          setProgress(Math.round((idx / cap) * 100))
        }
      } catch (err) {
        stopped = err.message
      }

      if (abandoned()) { abandon(); return }

      revealNext.current = out.length > 0
      setFrames(out)
      setExtracting(false)
      setProgress(100)
      // ONE toast, chosen after the loop. The catch used to toast "Extracted N
      // frames (stopped: …)" and then this line toasted "Extracted N frames" in
      // the same tick — the second replaced the first before it painted, so a
      // run that stopped early reported itself as a clean success.
      if (signal.aborted) toast(out.length ? `Extraction cancelled — kept ${out.length} ${out.length === 1 ? 'frame' : 'frames'}` : 'Extraction cancelled', 'info')
      else if (!out.length) toast(unsupported ? stopped : `Extraction failed: ${stopped || 'no frames in that range'}`, 'error')
      else if (stopped) toast(`Extracted ${out.length} frames (stopped: ${stopped})`, 'info')
      else if (wanted > MAX_FRAMES && idx >= MAX_FRAMES) toast(`Extracted ${out.length} frames, the most one run makes`, 'info')
      else toast(`Extracted ${out.length} frames`)
    } finally {
      releaseVideo(video)
      if (abortRef.current === ac) abortRef.current = null
    }
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
  const est = meta ? frameCountFor(estFrom, estTo, fps) : 0
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
                ['Est. frames', est > MAX_FRAMES ? `${MAX_FRAMES} of ~${est.toLocaleString()}` : est.toLocaleString()],
              ] : [['File', file?.name], ['Size', formatBytes(file?.size)]]}
            />
          </div>

          {meta && (
            <div className="fc-side">
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
                    <MenuSelect label="Scale" id="fc-fr-scale" className="fc-field" value={scale} onChange={nextValue => setScale(+nextValue)} disabled={extracting}>
                      <option value={1}>100% (Original)</option>
                      <option value={0.75}>75%</option>
                      <option value={0.5}>50%</option>
                      <option value={0.25}>25%</option>
                    </MenuSelect>
                  </div>
                </div>
              </div>
              <div className="fc-insp-sec">
                <label className="fc-eyebrow" htmlFor="fc-fr-format">Output format</label>
                <MenuSelect label="Output format" id="fc-fr-format" className="fc-field" value={format} onChange={nextValue => setFormat(nextValue)} disabled={extracting}>
                  {FRAME_FORMATS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                </MenuSelect>
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
                {est > MAX_FRAMES && (
                  <p className="fc-note fc-note--warn">
                    Stops at {MAX_FRAMES} frames, at {formatTime(estFrom + MAX_FRAMES / fps)}. Lower the FPS or shorten the range to get the rest.
                  </p>
                )}
              </div>
            </aside>
            <div className="fc-actionbar fc-actions">
              <button type="button" ref={extractBtnRef} className="fc-btn fc-btn--primary fc-btn--wide" onClick={extract} disabled={extracting}>
                {extracting ? `Extracting… ${progress}%` : 'Extract Frames'}
              </button>
              {extracting && (
                <div className="fc-job">
                  <div className="fc-progress" role="progressbar" aria-label="Frames extracted" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
                    <div className="fc-progress-bar" style={{ '--fc-pct': `${progress}%` }} />
                  </div>
                  <button type="button" className="fc-btn fc-btn--quiet" onClick={cancelExtract}>Cancel</button>
                </div>
              )}
            </div>
            </div>
          )}
        </div>
      )}

      {frames.length > 0 && (
        <section className="fc-frames" aria-label="Extracted frames" ref={framesRef}>
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
