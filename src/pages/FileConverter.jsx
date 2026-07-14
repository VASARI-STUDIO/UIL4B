import { useState, useCallback, useRef, useEffect } from 'react'
import JSZip from 'jszip'
import SnapSlider from '../components/SnapSlider'
import { takePendingImages } from '../utils/imageHandoff'

// ── Constants ────────────────────────────────────────────────────────────────
const MODES = [
  { id: 'image', label: 'Image' },
  { id: 'gif', label: 'Video → GIF' },
  { id: 'frames', label: 'Video → Frames' },
  { id: '3d', label: '3D → Blender' },
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

// Render scales for image export (@1x keeps source size, @2x doubles it).
const EXPORT_SCALES = [
  { id: 1, label: '@1x' },
  { id: 2, label: '@2x' },
]

// Longest canvas side we will attempt — beyond this most browsers fail or
// silently produce an empty bitmap.
const MAX_CANVAS_DIM = 16384

// canvas.toBlob never settling (seen with some format/browser combos) would
// leave the converter stuck in its busy state, disabling every control. Fail
// the item instead so the batch — and the UI — always finishes.
const ENCODE_TIMEOUT_MS = 30000

// ffmpeg.wasm CDN URLs (single-threaded core; works without cross-origin isolation)
const FFMPEG_PKG = 'https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/esm/index.js'
const FFMPEG_UTIL = 'https://unpkg.com/@ffmpeg/util@0.12.1/dist/esm/index.js'
const FFMPEG_CORE_BASE = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm'

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatBytes(b) {
  if (b == null) return '—'
  if (b < 1024) return b + ' B'
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB'
  return (b / 1048576).toFixed(1) + ' MB'
}

// Describes the size change between the original and converted file.
// dir: 'down' (smaller, good), 'up' (larger), 'same'.
function sizeDelta(orig, out) {
  if (!orig || out == null) return null
  const pct = Math.round((1 - out / orig) * 100)
  if (pct > 0) return { pct, dir: 'down', label: `${pct}% smaller`, color: 'var(--ok)' }
  if (pct < 0) return { pct, dir: 'up', label: `${Math.abs(pct)}% larger`, color: 'var(--err)' }
  return { pct: 0, dir: 'same', label: 'same size', color: 'var(--t2)' }
}

function formatTime(s) {
  if (!isFinite(s)) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not decode image'))
    img.src = src
  })
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

function triggerDownload(blobOrUrl, filename) {
  const url = typeof blobOrUrl === 'string' ? blobOrUrl : URL.createObjectURL(blobOrUrl)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  if (typeof blobOrUrl !== 'string') URL.revokeObjectURL(url)
}

// ── Component ────────────────────────────────────────────────────────────────
export default function FileConverter({ toast }) {
  // Pick up any files handed off from the dashboard's quick-upload tile. We grab
  // them once here (takePendingImages clears the buffer) so we can both default
  // the active tab to Image and seed the image converter with the files.
  const [pendingImages] = useState(() => takePendingImages())
  // Image is the default tab; pending hand-off images therefore land on it.
  const [mode, setMode] = useState('image')

  return (
    <div className="sec fc">
      <div className="sec-h">
        <div className="sec-h-eyebrow">File Converter</div>
        <h1>
          File Converter
          <span className="fc-alpha">Alpha</span>
        </h1>
        <p>
          Convert images between PNG, JPEG, WebP, AVIF and favicon ICO, turn short
          videos into GIFs, or extract video frames — all in your browser. Image
          conversion is fully offline; video tools load a converter engine on demand.
        </p>
      </div>

      {/* Mode tabs */}
      <div className="fc-tabs">
        {MODES.map(m => (
          <button
            key={m.id}
            className={`fc-tab${mode === m.id ? ' on' : ''}`}
            onClick={() => setMode(m.id)}
            aria-pressed={mode === m.id}
            aria-label={`${m.label}${m.id === '3d' ? ' (coming soon)' : ''} converter`}
          >
            {m.label}
            {m.id === '3d' && <span className="fc-soon">soon</span>}
          </button>
        ))}
      </div>

      {mode === 'image' && <ImageConvert toast={toast} initialFiles={pendingImages} />}
      {mode === 'gif' && <VideoToGif toast={toast} />}
      {mode === 'frames' && <VideoFrames toast={toast} />}
      {mode === '3d' && <ThreeDComingSoon />}
    </div>
  )
}

// ── Shared drop zone ─────────────────────────────────────────────────────────
function DropZone({ accept, multiple, onFiles, hint, sub }) {
  const inputRef = useRef(null)
  const [hover, setHover] = useState(false)
  return (
    <div
      className={`img-drop-zone fc-drop${hover ? ' fc-drop-on' : ''}`}
      role="button"
      tabIndex={0}
      aria-label={hint}
      onClick={() => inputRef.current?.click()}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click() } }}
      onDragOver={e => { e.preventDefault(); setHover(true) }}
      onDragLeave={() => setHover(false)}
      onDrop={e => {
        e.preventDefault()
        setHover(false)
        if (e.dataTransfer.files?.length) onFiles(e.dataTransfer.files)
      }}
    >
      <span className="fc-drop-ico" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M17 8l-5-5-5 5" /><path d="M12 3v12" />
        </svg>
      </span>
      <p className="fc-drop-hint">{hint}</p>
      <p className="fc-drop-sub">{sub}</p>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        style={{ display: 'none' }}
        onChange={e => { if (e.target.files?.length) onFiles(e.target.files); e.target.value = '' }}
      />
    </div>
  )
}

// ── Mode 1: Image format conversion ──────────────────────────────────────────
function ImageConvert({ toast, initialFiles }) {
  const [items, setItems] = useState([]) // { id, name, srcUrl, file, out:{blob,url,bytes,w,h} }
  const [format, setFormat] = useState('image/webp')
  const [quality, setQuality] = useState(QUALITY_DEFAULT)
  const [maxDim, setMaxDim] = useState(0) // 0 = keep original size
  const [renderScale, setRenderScale] = useState(1) // @1x / @2x export
  const [jpegBg, setJpegBg] = useState('#ffffff') // fill behind transparency (JPEG has no alpha)
  const [busy, setBusy] = useState(false)
  const [zipping, setZipping] = useState(false)

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

  const addFiles = useCallback((files) => {
    const arr = Array.from(files)
    const imgs = arr.filter(f => f.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg|bmp|avif|ico)$/i.test(f.name))
    if (!imgs.length) { toast('Please choose PNG, JPEG, WebP, GIF, SVG, BMP, AVIF or ICO images'); return }
    const big = imgs.find(f => f.size > LARGE_FILE_BYTES)
    if (big) toast(`Heads up: ${big.name} is over 50 MB — it may be slow`)
    const next = imgs.map(f => ({
      id: `${f.name}-${f.size}-${Math.random().toString(36).slice(2, 7)}`,
      name: f.name,
      file: f,
      srcUrl: URL.createObjectURL(f),
      out: null,
      error: null,
    }))
    setItems(prev => [...prev, ...next])
  }, [toast])

  // Seed from the dashboard quick-upload hand-off exactly once on mount.
  useEffect(() => {
    if (initialFiles?.length) addFiles(initialFiles)
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
    const longest = Math.max(iw, ih)
    const scale = (maxDim > 0 && longest > maxDim ? maxDim / longest : 1) * renderScale
    const w = Math.max(1, Math.round(iw * scale))
    const h = Math.max(1, Math.round(ih * scale))
    if (Math.max(w, h) > MAX_CANVAS_DIM) {
      throw new Error(`Too large to export at @${renderScale}x — reduce Max Dimension`)
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
    toast(ok ? `Converted ${ok} image${ok > 1 ? 's' : ''}` : 'Conversion failed')
  }, [items, busy, convertOne, toast])

  const fmt = OUTPUT_FORMATS.find(f => f.id === format)

  const downloadOne = useCallback((item) => {
    if (!item.out) return
    const base = item.name.replace(/\.[^.]+$/, '')
    triggerDownload(item.out.blob, `${base}.${fmt.ext}`)
  }, [fmt])

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
      triggerDownload(content, `converted-${fmt.ext}.zip`)
      toast(`Downloaded ZIP with ${ready.length} images`)
    } catch {
      toast('Failed to create ZIP file')
    }
    setZipping(false)
  }, [items, fmt, downloadOne, toast])

  const readyCount = items.filter(it => it.out).length
  const converted = items.filter(it => it.out)
  const totalOrig = converted.reduce((s, it) => s + it.file.size, 0)
  const totalOut = converted.reduce((s, it) => s + it.out.bytes, 0)
  const batchDelta = readyCount > 1 ? sizeDelta(totalOrig, totalOut) : null

  return (
    <>
      <div className="sub">
        <DropZone
          accept={ACCEPT_IMAGE}
          multiple
          onFiles={addFiles}
          hint="Drop images here or click to browse"
          sub="PNG, JPEG, WebP, GIF, SVG, BMP, AVIF, ICO — batch supported"
        />
      </div>

      {items.length > 0 && (
        <div className="sub">
          <div className="sl">Output Settings</div>
          <div className="fc-settings">
            <div>
              <div className="seg-label">Output Format</div>
              <select value={format} onChange={e => setFormat(e.target.value)} disabled={busy} style={{ maxWidth: 150 }}>
                {OUTPUT_FORMATS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
              </select>
              {fmt.ico && <div className="fc-note">Multi-size favicon: {ICO_SIZES.join(', ')} px in one file</div>}
            </div>
            {format === 'image/jpeg' && (
              <div>
                <div className="seg-label">Background</div>
                <input
                  type="color"
                  value={jpegBg}
                  onChange={e => setJpegBg(e.target.value)}
                  disabled={busy}
                  className="fc-bg-pick"
                  aria-label="JPEG background colour"
                />
                <div className="fc-note">fills transparency — JPEG has no alpha</div>
              </div>
            )}
            <div className="fc-field-grow">
              <div className="seg-label">Quality</div>
              <div className="row">
                <SnapSlider
                  min={1} max={100} value={quality} defaultValue={QUALITY_DEFAULT}
                  snaps={QUALITY_SNAPS} unit="%"
                  onChange={setQuality}
                  disabled={busy || !fmt.lossy}
                  ariaLabel="Output quality"
                />
              </div>
              {!fmt.lossy && <div className="fc-note">{fmt.label} is lossless — quality doesn&apos;t apply</div>}
            </div>
            {!fmt.ico && (
              <div>
                <div className="seg-label">Max Dimension</div>
                <select value={maxDim} onChange={e => setMaxDim(+e.target.value)} disabled={busy} style={{ maxWidth: 150 }}>
                  <option value={0}>Keep original</option>
                  <option value={3840}>3840 px</option>
                  <option value={1920}>1920 px</option>
                  <option value={1200}>1200 px</option>
                  <option value={800}>800 px</option>
                </select>
              </div>
            )}
            {!fmt.ico && (
              <div>
                <div className="seg-label">Export Scale</div>
                <select value={renderScale} onChange={e => setRenderScale(+e.target.value)} disabled={busy} style={{ maxWidth: 100 }} aria-label="Export render scale">
                  {EXPORT_SCALES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>
            )}
          </div>

          <div className="fc-actions">
            <button className="btn btn-accent" onClick={convertAll} disabled={busy}>
              {busy ? 'Converting…' : `Convert ${items.length} image${items.length > 1 ? 's' : ''}`}
            </button>
            {readyCount > 0 && (
              <button className="btn" onClick={downloadAll} disabled={zipping}>
                {zipping ? 'Creating ZIP…' : readyCount > 1 ? `Download all (${readyCount}) as ZIP` : 'Download'}
              </button>
            )}
            <button className="btn" onClick={clearAll} disabled={busy}>Clear</button>
          </div>
          {busy && items.length > 1 && (
            <div className="fc-progress" style={{ marginTop: 10 }}>
              <div className="fc-progress-bar" style={{ width: `${Math.round((convertProgress.done / convertProgress.total) * 100)}%` }} />
            </div>
          )}
          {batchDelta && (
            <div style={{ fontSize: 12, color: 'var(--t1)', marginTop: 10 }}>
              {readyCount} files: {formatBytes(totalOrig)} → {formatBytes(totalOut)}
              <span style={{ color: batchDelta.color, fontWeight: 600 }}> • {batchDelta.label}</span>
            </div>
          )}
        </div>
      )}

      {items.length > 0 && (
        <div className="sub">
          <div className="img-grid">
            {items.map(it => (
              <div key={it.id} className="card fc-card">
                <button className="fc-remove" onClick={() => removeItem(it.id)} title="Remove" aria-label={`Remove ${it.name}`} disabled={busy}>×</button>
                <div className="fc-thumb">
                  <img src={(it.out && !it.out.noPreview && it.out.url) || it.srcUrl} alt={it.name} />
                </div>
                <div className="fc-name" title={it.name}>{it.name}</div>
                {it.error ? (
                  <div style={{ fontSize: 10, color: 'var(--err)' }}>{it.error}</div>
                ) : it.out ? (
                  <>
                    <div style={{ fontSize: 10, color: 'var(--t2)' }}>
                      {it.out.note || `${it.out.w}×${it.out.h}`}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--t2)' }}>
                      {formatBytes(it.file.size)} → {formatBytes(it.out.bytes)}
                      {(() => {
                        const d = sizeDelta(it.file.size, it.out.bytes)
                        return d ? <span style={{ color: d.color, fontWeight: 600 }}> • {d.label}</span> : null
                      })()}
                    </div>
                    <button className="btn btn-accent fc-dl" onClick={() => downloadOne(it)}>
                      Download {fmt.label}
                    </button>
                  </>
                ) : (
                  <div style={{ fontSize: 10, color: 'var(--t2)' }}>
                    {formatBytes(it.file.size)} • not converted
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

// ── ffmpeg loader (shared by GIF + Frames) ───────────────────────────────────
let ffmpegInstance = null
let ffmpegLoadPromise = null

async function getFfmpeg(onLog) {
  if (ffmpegInstance) return ffmpegInstance
  if (ffmpegLoadPromise) return ffmpegLoadPromise
  ffmpegLoadPromise = (async () => {
    const [{ FFmpeg }, { toBlobURL, fetchFile }] = await Promise.all([
      import(/* @vite-ignore */ FFMPEG_PKG),
      import(/* @vite-ignore */ FFMPEG_UTIL),
    ])
    const ffmpeg = new FFmpeg()
    if (onLog) ffmpeg.on('log', ({ message }) => onLog(message))
    await ffmpeg.load({
      coreURL: await toBlobURL(`${FFMPEG_CORE_BASE}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${FFMPEG_CORE_BASE}/ffmpeg-core.wasm`, 'application/wasm'),
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

// ── Mode 2: Video → GIF ──────────────────────────────────────────────────────
function VideoToGif({ toast }) {
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
    if (!okType) { toast('Please choose a video, animated GIF or animated WebP'); return }
    if (f.size > LARGE_FILE_BYTES) toast(`Heads up: file is over 50 MB — conversion may be slow or run out of memory`)
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
      toast('Trim end must be after trim start')
      return
    }
    if (!navigator.onLine && !ffmpegInstance) {
      toast('You appear to be offline — the converter engine needs a connection to load')
      return
    }
    setWorking(true)
    setResult(null)
    let ffmpeg
    try {
      if (!ffmpegInstance) { setEngineState('loading'); setProgress('Loading converter engine… (~30 MB, first run only)') }
      ffmpeg = await getFfmpeg()
      setEngineState('ready')
    } catch {
      setEngineState('error')
      setWorking(false)
      setProgress('')
      toast('Could not load the converter engine. Check your connection or try the Image tab.')
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
      toast('Conversion failed: ' + (err?.message || 'unknown error'))
    }
    setWorking(false)
  }, [file, working, width, fps, quality, duration, trimStart, trimEnd, toast])

  return (
    <>
      <div className="sub">
        {!srcUrl ? (
          <DropZone
            accept={ACCEPT_VIDEO}
            onFiles={onFiles}
            hint="Drop a video or animation here or click to browse"
            sub="MP4, WebM, MOV, AVI, animated GIF / WebP"
          />
        ) : (
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <div style={{ flex: '1 1 min(360px,100%)', minWidth: 0 }}>
              <video src={srcUrl} controls muted className="fc-video" aria-label="Video preview"
                onLoadedMetadata={e => setDuration(e.target.duration || 0)} />
            </div>
            <div className="card" style={{ flex: '1 1 200px', minWidth: 0, padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: 'var(--t0)' }}>Source</div>
              <div style={{ fontSize: 12, color: 'var(--t1)', lineHeight: 1.9 }}>
                <div><strong>File:</strong> {file?.name}</div>
                <div><strong>Size:</strong> {formatBytes(file?.size)}</div>
                {duration > 0 && <div><strong>Duration:</strong> {formatTime(duration)}</div>}
              </div>
              <button className="btn" style={{ marginTop: 12 }} onClick={() => { setFile(null); if (srcUrl) URL.revokeObjectURL(srcUrl); setSrcUrl(null); setResult(null) }} disabled={working}>
                Choose different file
              </button>
            </div>
          </div>
        )}
      </div>

      {srcUrl && (
        <div className="sub">
          <div className="sl">GIF Settings</div>
          <div className="fc-settings">
            <div>
              <div className="seg-label">Frame Rate (FPS)</div>
              <input type="number" min="1" max="50" value={fps} disabled={working}
                onChange={e => setFps(Math.max(1, Math.min(50, +e.target.value || 10)))} style={{ width: 90, textAlign: 'center' }} />
            </div>
            <div>
              <div className="seg-label">Width (px)</div>
              <input type="number" min="16" max="2000" value={width} disabled={working}
                onChange={e => setWidth(Math.max(16, Math.min(2000, +e.target.value || 480)))} style={{ width: 100, textAlign: 'center' }} />
              <div className="fc-note">height auto</div>
            </div>
            <div>
              <div className="seg-label">Quality</div>
              <select value={quality} onChange={e => setQuality(e.target.value)} disabled={working} style={{ maxWidth: 150 }}>
                <option value="low">Low (smaller file)</option>
                <option value="medium">Medium</option>
                <option value="high">High (best dither)</option>
              </select>
            </div>
            {duration > 0 && (
              <div>
                <div className="seg-label">Trim (seconds)</div>
                <div className="row" style={{ gap: 6 }}>
                  <input type="number" min="0" max={duration} step="0.1" value={trimStart} disabled={working}
                    onChange={e => setTrimStart(Math.max(0, Math.min(duration, +e.target.value || 0)))}
                    style={{ width: 80, textAlign: 'center' }} aria-label="Trim start (seconds)" />
                  <span style={{ color: 'var(--t2)' }}>→</span>
                  <input type="number" min="0" max={duration} step="0.1"
                    value={trimEnd == null ? +duration.toFixed(1) : trimEnd} disabled={working}
                    onChange={e => setTrimEnd(Math.max(0, Math.min(duration, +e.target.value || 0)))}
                    style={{ width: 80, textAlign: 'center' }} aria-label="Trim end (seconds)" />
                </div>
                <div className="fc-note">
                  clip: {formatTime(Math.max(0, (trimEnd == null ? duration : trimEnd) - trimStart))} of {formatTime(duration)}
                </div>
              </div>
            )}
          </div>

          <div className="fc-actions">
            <button className="btn btn-accent" onClick={convert} disabled={working}>
              {working ? (engineState === 'loading' ? 'Loading engine…' : 'Converting…') : 'Convert to GIF'}
            </button>
          </div>

          {progress && (
            <div className="fc-status"><span className="fc-spinner" aria-hidden="true" />{progress}</div>
          )}
          {engineState === 'error' && (
            <div className="fc-status fc-status-err">
              The converter engine failed to load. Image conversion still works on the Image tab.
            </div>
          )}
        </div>
      )}

      {result && (
        <div className="sub">
          <div className="sl">Result</div>
          <div className="card" style={{ padding: 16, marginTop: 10, maxWidth: 520 }}>
            <img src={result.url} alt="GIF result" style={{ maxWidth: '100%', borderRadius: 'var(--radius-s)', display: 'block', background: 'var(--bg-2)' }} />
            <div style={{ fontSize: 12, color: 'var(--t1)', margin: '10px 0' }}>
              GIF • {file?.size ? <>{formatBytes(file.size)} → {formatBytes(result.bytes)}</> : formatBytes(result.bytes)}
              {(() => {
                const d = file?.size ? sizeDelta(file.size, result.bytes) : null
                return d ? <span style={{ color: d.color, fontWeight: 600 }}> • {d.label}</span> : null
              })()}
            </div>
            <DownloadButton url={result.url} name={`${(file?.name || 'video').replace(/\.[^.]+$/, '')}.gif`} />
          </div>
        </div>
      )}
    </>
  )
}

// Small helper button to keep download wiring clean.
function DownloadButton({ url, name }) {
  return (
    <button className="btn btn-accent" onClick={() => triggerDownload(url, name)}>Download GIF</button>
  )
}

// ── Mode 3: Video → Frames (HTML5 video + canvas seek) ───────────────────────
function VideoFrames({ toast }) {
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
      toast('Please choose a video file (MP4, WebM, MOV, AVI)')
      return
    }
    if (f.size > LARGE_FILE_BYTES) toast('Heads up: file is over 50 MB — extraction may be slow')
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
      toast(err.message)
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
      if (unsupported) toast(err.message)
      else toast(out.length ? `Extracted ${out.length} frames (stopped: ${err.message})` : `Extraction failed: ${err.message}`)
    }

    setFrames(out)
    setExtracting(false)
    setProgress(100)
    if (out.length) toast(`Extracted ${out.length} frames`)
  }, [srcUrl, meta, fps, scale, format, quality, rangeStart, rangeEnd, extracting, toast])

  const downloadAll = useCallback(async () => {
    if (!frames.length) return
    setZipping(true)
    try {
      const zip = new JSZip()
      frames.forEach(f => zip.file(f.name, f.blob))
      const content = await zip.generateAsync({ type: 'blob' })
      triggerDownload(content, `frames-${(file?.name || 'video').replace(/\.[^.]+$/, '')}.zip`)
      toast(`Downloaded ZIP with ${frames.length} frames`)
    } catch {
      toast('Failed to create ZIP file')
    }
    setZipping(false)
  }, [frames, file, toast])

  const estFrom = meta ? Math.max(0, Math.min(rangeStart || 0, meta.duration)) : 0
  const estTo = meta ? (rangeEnd == null ? meta.duration : Math.max(estFrom, Math.min(rangeEnd, meta.duration))) : 0
  const est = meta ? Math.max(1, Math.floor((estTo - estFrom) * Math.max(0.1, Math.min(30, fps)))) : 0
  const fmt = FRAME_FORMATS.find(f => f.id === format) || FRAME_FORMATS[0]

  return (
    <>
      <div className="sub">
        {!srcUrl ? (
          <DropZone accept="video/*,.mp4,.webm,.mov,.avi" onFiles={onFiles}
            hint="Drop a video here or click to browse" sub="MP4, WebM, MOV, AVI — output is a ZIP of image frames" />
        ) : (
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <div style={{ flex: '1 1 min(360px,100%)', minWidth: 0 }}>
              <video ref={videoRef} src={srcUrl} controls muted onLoadedMetadata={onLoadedMeta} className="fc-video" aria-label="Video preview" />
            </div>
            {meta && (
              <div className="card" style={{ flex: '1 1 200px', minWidth: 0, padding: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: 'var(--t0)' }}>Video Info</div>
                <div style={{ fontSize: 12, color: 'var(--t1)', lineHeight: 1.9 }}>
                  <div><strong>File:</strong> {file?.name}</div>
                  <div><strong>Size:</strong> {formatBytes(file?.size)}</div>
                  <div><strong>Duration:</strong> {formatTime(meta.duration)}</div>
                  <div><strong>Resolution:</strong> {meta.width}×{meta.height}px</div>
                  <div><strong>Est. frames:</strong> {est.toLocaleString()}</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {srcUrl && meta && (
        <div className="sub">
          <div className="sl">Extraction Settings</div>
          <div className="fc-settings">
            <div>
              <div className="seg-label">Frames per second</div>
              <input type="number" min="0.1" max="30" step="0.1" value={fps} disabled={extracting}
                onChange={e => setFps(Math.max(0.1, Math.min(30, +e.target.value || 1)))} style={{ width: 90, textAlign: 'center' }} />
            </div>
            <div>
              <div className="seg-label">Scale</div>
              <select value={scale} onChange={e => setScale(+e.target.value)} disabled={extracting} style={{ maxWidth: 150 }}>
                <option value={1}>100% (Original)</option>
                <option value={0.75}>75%</option>
                <option value={0.5}>50%</option>
                <option value={0.25}>25%</option>
              </select>
            </div>
            <div>
              <div className="seg-label">Output Format</div>
              <select value={format} onChange={e => setFormat(e.target.value)} disabled={extracting} style={{ maxWidth: 130 }}>
                {FRAME_FORMATS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
              </select>
            </div>
            <div>
              <div className="seg-label">Range (seconds)</div>
              <div className="row" style={{ gap: 6 }}>
                <input type="number" min="0" max={meta.duration} step="0.1" value={rangeStart} disabled={extracting}
                  onChange={e => setRangeStart(Math.max(0, Math.min(meta.duration, +e.target.value || 0)))}
                  style={{ width: 80, textAlign: 'center' }} aria-label="Range start (seconds)" />
                <span style={{ color: 'var(--t2)' }}>→</span>
                <input type="number" min="0" max={meta.duration} step="0.1"
                  value={rangeEnd == null ? +meta.duration.toFixed(1) : rangeEnd} disabled={extracting}
                  onChange={e => setRangeEnd(Math.max(0, Math.min(meta.duration, +e.target.value || 0)))}
                  style={{ width: 80, textAlign: 'center' }} aria-label="Range end (seconds)" />
              </div>
              <div className="fc-note">
                {formatTime(Math.max(0, estTo - estFrom))} of {formatTime(meta.duration)} • ~{est.toLocaleString()} frames
              </div>
            </div>
            <div className="fc-field-grow">
              <div className="seg-label">Quality</div>
              <div className="row">
                <SnapSlider
                  min={1} max={100} value={quality} defaultValue={QUALITY_DEFAULT}
                  snaps={QUALITY_SNAPS} unit="%"
                  onChange={setQuality}
                  disabled={extracting || !fmt.lossy}
                  ariaLabel="Frame quality"
                />
              </div>
              {!fmt.lossy && <div className="fc-note">{fmt.label} is lossless — quality doesn&apos;t apply</div>}
            </div>
          </div>
          <div className="fc-actions">
            <button className="btn btn-accent" onClick={extract} disabled={extracting}>
              {extracting ? `Extracting… ${progress}%` : 'Extract Frames'}
            </button>
          </div>
          {extracting && (
            <div className="fc-progress"><div className="fc-progress-bar" style={{ width: `${progress}%` }} /></div>
          )}
        </div>
      )}

      {frames.length > 0 && (
        <div className="sub">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 10, flexWrap: 'wrap' }}>
            <div className="sl">Extracted Frames ({frames.length.toLocaleString()})</div>
            <button className="btn btn-accent" onClick={downloadAll} disabled={zipping}>
              {zipping ? 'Creating ZIP…' : 'Download all as ZIP'}
            </button>
          </div>
          <div className="img-grid">
            {frames.map(f => (
              <div key={f.name} className="card fc-card" role="button" tabIndex={0} onClick={() => triggerDownload(f.blob, f.name)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); triggerDownload(f.blob, f.name) } }} style={{ cursor: 'pointer' }} title={`Download ${f.name}`} aria-label={`Download ${f.name}`}>
                <div className="fc-thumb"><img src={f.url} alt={f.name} /></div>
                <div className="fc-name">{f.name}</div>
                <div style={{ fontSize: 10, color: 'var(--t2)' }}>{formatBytes(f.size)} • {formatTime(f.time)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

// ── Mode 4: 3D → Blender (coming soon) ───────────────────────────────────────
function ThreeDComingSoon() {
  return (
    <div className="sub">
      <div className="card fc-soon-card">
        <div className="fc-soon-badge">Coming soon</div>
        <h2 style={{ fontFamily: 'var(--serif)', fontSize: 24, fontWeight: 500, marginBottom: 8, color: 'var(--t0)' }}>
          3D model → Blender (.blend)
        </h2>
        <p style={{ fontSize: 14, color: 'var(--t1)', lineHeight: 1.65, maxWidth: 560 }}>
          Converting 3D files (OBJ, FBX, glTF, STL…) into a native Blender <code>.blend</code> file
          isn't possible purely in the browser — it requires Blender's Python engine running
          server-side. We're planning a hosted pipeline for this. For now, use Blender's
          built-in import/export, or import OBJ / glTF directly.
        </p>
        <button className="btn" disabled style={{ marginTop: 16, opacity: 0.55, cursor: 'not-allowed' }}>
          Not available yet
        </button>
      </div>
    </div>
  )
}
