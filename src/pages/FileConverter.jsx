import { useState, useCallback, useRef, useEffect } from 'react'
import JSZip from 'jszip'

// ── Constants ────────────────────────────────────────────────────────────────
const ALPHA_BADGE_STYLE = {
  fontSize: 9, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase',
  padding: '2px 8px', borderRadius: 'var(--radius-s)',
  background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', marginLeft: 8,
}

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
]

const ACCEPT_IMAGE = 'image/png,image/jpeg,image/webp,image/gif,.png,.jpg,.jpeg,.webp,.gif'
const ACCEPT_VIDEO = 'video/*,.mp4,.webm,.mov,.avi,.gif,.webp'

const LARGE_FILE_BYTES = 50 * 1024 * 1024 // 50 MB warning threshold

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

function formatTime(s) {
  if (!isFinite(s)) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result)
    r.onerror = () => reject(new Error('Could not read file'))
    r.readAsDataURL(file)
  })
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not decode image'))
    img.src = src
  })
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
  const [mode, setMode] = useState('image')

  return (
    <div className="sec fc">
      <div className="sec-h">
        <div className="sec-h-eyebrow">File Converter</div>
        <h1>
          File Converter
          <span style={ALPHA_BADGE_STYLE}>Alpha</span>
        </h1>
        <p>
          Convert images, turn short videos into GIFs, or extract video frames — all in
          your browser. Image conversion is fully offline; video tools load a converter
          engine on demand.
        </p>
      </div>

      {/* Mode tabs */}
      <div className="fc-tabs">
        {MODES.map(m => (
          <button
            key={m.id}
            className={`pt-t fc-tab${mode === m.id ? ' on' : ''}`}
            onClick={() => setMode(m.id)}
          >
            {m.label}
            {m.id === '3d' && <span className="fc-soon">soon</span>}
          </button>
        ))}
      </div>

      {mode === 'image' && <ImageConvert toast={toast} />}
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
      onClick={() => inputRef.current?.click()}
      onDragOver={e => { e.preventDefault(); setHover(true) }}
      onDragLeave={() => setHover(false)}
      onDrop={e => {
        e.preventDefault()
        setHover(false)
        if (e.dataTransfer.files?.length) onFiles(e.dataTransfer.files)
      }}
    >
      <p style={{ fontSize: 14, color: 'var(--t1)', marginBottom: 4 }}>{hint}</p>
      <p style={{ fontSize: 11, color: 'var(--t2)' }}>{sub}</p>
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
function ImageConvert({ toast }) {
  const [items, setItems] = useState([]) // { id, name, srcUrl, file, out:{blob,url,bytes,w,h} }
  const [format, setFormat] = useState('image/webp')
  const [quality, setQuality] = useState(90)
  const [maxDim, setMaxDim] = useState(0) // 0 = keep original size
  const [busy, setBusy] = useState(false)
  const [zipping, setZipping] = useState(false)

  // Revoke all object URLs on unmount.
  useEffect(() => () => {
    items.forEach(it => {
      if (it.srcUrl) URL.revokeObjectURL(it.srcUrl)
      if (it.out?.url) URL.revokeObjectURL(it.out.url)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const addFiles = useCallback((files) => {
    const arr = Array.from(files)
    const imgs = arr.filter(f => f.type.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(f.name))
    if (!imgs.length) { toast('Please choose PNG, JPEG, WebP or GIF images'); return }
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
    const longest = Math.max(img.width, img.height)
    const scale = maxDim > 0 && longest > maxDim ? maxDim / longest : 1
    const w = Math.max(1, Math.round(img.width * scale))
    const h = Math.max(1, Math.round(img.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (format === 'image/jpeg') { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h) }
    ctx.drawImage(img, 0, 0, w, h)
    const q = format === 'image/png' ? undefined : quality / 100
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(b => b ? resolve(b) : reject(new Error('Encoding failed (format may be unsupported)')), format, q)
    })
    return { blob, url: URL.createObjectURL(blob), bytes: blob.size, w, h }
  }, [format, quality, maxDim])

  const convertAll = useCallback(async () => {
    if (!items.length || busy) return
    setBusy(true)
    let ok = 0
    for (const item of items) {
      try {
        if (item.out?.url) URL.revokeObjectURL(item.out.url)
        const out = await convertOne(item)
        ok++
        setItems(prev => prev.map(it => it.id === item.id ? { ...it, out, error: null } : it))
      } catch (err) {
        setItems(prev => prev.map(it => it.id === item.id ? { ...it, out: null, error: err.message } : it))
      }
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

  return (
    <>
      <div className="sub">
        <DropZone
          accept={ACCEPT_IMAGE}
          multiple
          onFiles={addFiles}
          hint="Drop images here or click to browse"
          sub="PNG, JPEG, WebP, static GIF — batch supported"
        />
      </div>

      {items.length > 0 && (
        <div className="sub">
          <div className="sl">Output Settings</div>
          <div className="row" style={{ gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
            <div>
              <div className="seg-label">Output Format</div>
              <select value={format} onChange={e => setFormat(e.target.value)} disabled={busy} style={{ maxWidth: 130 }}>
                {OUTPUT_FORMATS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div className="seg-label">Quality</div>
              <div className="row">
                <input
                  type="range" min="1" max="100" value={quality} style={{ flex: 1 }}
                  onChange={e => setQuality(+e.target.value)}
                  disabled={busy || !fmt.lossy}
                />
                <span style={{ fontSize: 12, color: 'var(--t1)', width: 38, textAlign: 'right' }}>{quality}%</span>
              </div>
              {!fmt.lossy && <div style={{ fontSize: 10, color: 'var(--t2)', marginTop: 2 }}>PNG is always lossless</div>}
            </div>
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
          </div>

          <div className="row" style={{ marginTop: 14, gap: 8, flexWrap: 'wrap' }}>
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
        </div>
      )}

      {items.length > 0 && (
        <div className="sub">
          <div className="img-grid">
            {items.map(it => (
              <div key={it.id} className="card fc-card">
                <button className="fc-remove" onClick={() => removeItem(it.id)} title="Remove" disabled={busy}>×</button>
                <div className="fc-thumb">
                  <img src={it.out?.url || it.srcUrl} alt={it.name} />
                </div>
                <div className="fc-name" title={it.name}>{it.name}</div>
                {it.error ? (
                  <div style={{ fontSize: 10, color: 'var(--err)' }}>{it.error}</div>
                ) : it.out ? (
                  <>
                    <div style={{ fontSize: 10, color: 'var(--t2)' }}>
                      {it.out.w}×{it.out.h} • {formatBytes(it.out.bytes)}
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
  const [engineState, setEngineState] = useState('idle') // idle|loading|ready|error
  const [working, setWorking] = useState(false)
  const [progress, setProgress] = useState('')
  const [result, setResult] = useState(null) // { url, bytes }

  useEffect(() => () => {
    if (srcUrl) URL.revokeObjectURL(srcUrl)
    if (result?.url) URL.revokeObjectURL(result.url)
  }, [srcUrl, result])

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
  }, [srcUrl, result, toast])

  const convert = useCallback(async () => {
    if (!file || working) return
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
      await ffmpeg.exec(['-i', inName, '-vf', vf, '-loop', '0', outName])
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
  }, [file, working, width, fps, quality, toast])

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
              <video src={srcUrl} controls muted className="fc-video" />
            </div>
            <div className="card" style={{ flex: '1 1 200px', minWidth: 0, padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: 'var(--t0)' }}>Source</div>
              <div style={{ fontSize: 12, color: 'var(--t1)', lineHeight: 1.9 }}>
                <div><strong>File:</strong> {file?.name}</div>
                <div><strong>Size:</strong> {formatBytes(file?.size)}</div>
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
          <div className="row" style={{ gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
            <div>
              <div className="seg-label">Frame Rate (FPS)</div>
              <input type="number" min="1" max="50" value={fps} disabled={working}
                onChange={e => setFps(Math.max(1, Math.min(50, +e.target.value || 10)))} style={{ width: 90, textAlign: 'center' }} />
            </div>
            <div>
              <div className="seg-label">Width (px)</div>
              <input type="number" min="16" max="2000" value={width} disabled={working}
                onChange={e => setWidth(Math.max(16, Math.min(2000, +e.target.value || 480)))} style={{ width: 100, textAlign: 'center' }} />
              <div style={{ fontSize: 10, color: 'var(--t2)', marginTop: 2 }}>height auto</div>
            </div>
            <div>
              <div className="seg-label">Quality</div>
              <select value={quality} onChange={e => setQuality(e.target.value)} disabled={working} style={{ maxWidth: 150 }}>
                <option value="low">Low (smaller file)</option>
                <option value="medium">Medium</option>
                <option value="high">High (best dither)</option>
              </select>
            </div>
          </div>

          <div className="row" style={{ marginTop: 14, gap: 8 }}>
            <button className="btn btn-accent" onClick={convert} disabled={working}>
              {working ? (engineState === 'loading' ? 'Loading engine…' : 'Converting…') : 'Convert to GIF'}
            </button>
          </div>

          {progress && (
            <div className="fc-status">{progress}</div>
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
            <div style={{ fontSize: 12, color: 'var(--t1)', margin: '10px 0' }}>GIF • {formatBytes(result.bytes)}</div>
            <button className="btn btn-accent" onClick={() => triggerDownload(result.url.startsWith('blob:') ? fetchBlobThenDownload(result) : result.url, '')}>
              {/* fallback handled below */}
            </button>
            <button className="btn btn-accent" onClick={() => {
              const base = (file?.name || 'video').replace(/\.[^.]+$/, '')
              triggerDownload(result.url, `${base}.gif`)
            }} style={{ display: 'none' }} />
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

// Unused safety stub kept out of render path; never actually called.
function fetchBlobThenDownload() { return '' }

// ── Mode 3: Video → Frames (HTML5 video + canvas seek) ───────────────────────
function VideoFrames({ toast }) {
  const [file, setFile] = useState(null)
  const [srcUrl, setSrcUrl] = useState(null)
  const [meta, setMeta] = useState(null)
  const [fps, setFps] = useState(2)
  const [scale, setScale] = useState(1)
  const [extracting, setExtracting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [frames, setFrames] = useState([])
  const [zipping, setZipping] = useState(false)
  const videoRef = useRef(null)

  useEffect(() => () => {
    if (srcUrl) URL.revokeObjectURL(srcUrl)
    frames.forEach(f => URL.revokeObjectURL(f.url))
  }, [srcUrl, frames])

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

    const step = 1 / Math.max(0.1, Math.min(30, fps))
    const total = Math.max(1, Math.floor(meta.duration / step))
    const out = []
    let t = 0, idx = 0

    try {
      while (t < meta.duration && idx < total + 1) {
        video.currentTime = t
        await new Promise((resolve, reject) => {
          const to = setTimeout(() => reject(new Error('Seek timed out')), 8000)
          video.onseeked = () => { clearTimeout(to); resolve() }
        })
        ctx.clearRect(0, 0, outW, outH)
        ctx.drawImage(video, 0, 0, outW, outH)
        const blob = await new Promise(res => canvas.toBlob(res, 'image/png'))
        if (blob) {
          out.push({
            blob, url: URL.createObjectURL(blob),
            name: `frame-${String(idx + 1).padStart(4, '0')}.png`,
            time: t, size: blob.size,
          })
        }
        idx++
        t += step
        setProgress(Math.round((idx / total) * 100))
      }
    } catch (err) {
      toast(out.length ? `Extracted ${out.length} frames (stopped: ${err.message})` : `Extraction failed: ${err.message}`)
    }

    setFrames(out)
    setExtracting(false)
    setProgress(100)
    if (out.length) toast(`Extracted ${out.length} frames`)
  }, [srcUrl, meta, fps, scale, extracting, toast])

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

  const est = meta ? Math.max(1, Math.floor(meta.duration / (1 / Math.max(0.1, Math.min(30, fps))))) : 0

  return (
    <>
      <div className="sub">
        {!srcUrl ? (
          <DropZone accept="video/*,.mp4,.webm,.mov,.avi" onFiles={onFiles}
            hint="Drop a video here or click to browse" sub="MP4, WebM, MOV, AVI — output is a ZIP of PNGs" />
        ) : (
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <div style={{ flex: '1 1 min(360px,100%)', minWidth: 0 }}>
              <video ref={videoRef} src={srcUrl} controls muted onLoadedMetadata={onLoadedMeta} className="fc-video" />
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
          <div className="row" style={{ gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
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
          </div>
          <div className="row" style={{ marginTop: 14, gap: 8 }}>
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
              <div key={f.name} className="card fc-card" onClick={() => triggerDownload(f.blob, f.name)} style={{ cursor: 'pointer' }} title={`Download ${f.name}`}>
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
