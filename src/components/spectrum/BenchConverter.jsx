import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import PhIcon from './PhIcon'
import { route } from './spectrumFacts'
import {
  CONVERTER_SOURCE,
  FRAME_COUNTS,
  IMG_FORMATS,
  IMG_MODES,
  RATIO_PRESETS,
  formatBytes,
} from './spectrumKit'

// 04 · FILE CONVERTER — the design's window, with its Tasmanian sunset photograph.
//
// THE SIZES ARE MEASURED, NOT TABLED. The design carried a hard-coded table of
// KB per quality step ("measured in-browser" once, then frozen). Here the photo
// is drawn to a canvas and encoded with `canvas.toBlob` at the format and
// quality on screen, and the BEFORE and AFTER bars print what the browser
// actually produced — the same encoder path the File Converter uses. BEFORE is
// the photo as a lossless PNG (the design's "plateau-sunset.png"), or the real
// size of a file the visitor drops in; AFTER is that image re-encoded.
//
// Nothing runs until the window is near the screen, and each re-encode is
// debounced, so a visitor dragging the quality slider costs one encode at the
// end rather than fifteen on the way. Nothing is uploaded: the file never
// leaves the tab.

function useInView(ref, margin = '600px') {
  const [seen, setSeen] = useState(() => typeof IntersectionObserver === 'undefined')
  useEffect(() => {
    const el = ref.current
    if (!el || seen) return undefined
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { setSeen(true); io.disconnect() }
    }, { rootMargin: margin })
    io.observe(el)
    return () => io.disconnect()
  }, [ref, margin, seen])
  return seen
}

const encode = (canvas, type, q) => new Promise((resolve) => {
  try { canvas.toBlob((b) => resolve(b ? b.size : null), type, q) } catch { resolve(null) }
})

export default function BenchConverter() {
  const root = useRef(null)
  const near = useInView(root)
  const [mode, setMode] = useState(0)
  const [fmt, setFmt] = useState(0)
  const [quality, setQuality] = useState(75)
  const [ratioPreset, setRatioPreset] = useState(0)
  const [frameCount, setFrameCount] = useState(12)
  const [dragging, setDragging] = useState(false)
  const [pick, setPick] = useState(null)
  // { w, h, before } for the image being measured, and the latest AFTER size.
  const [src, setSrc] = useState(null)
  const [out, setOut] = useState(null)
  const canvasRef = useRef(null)

  // Release a picked file's object URL when it is replaced or the page goes.
  useEffect(() => () => { if (pick?.url) URL.revokeObjectURL(pick.url) }, [pick])

  // Decode the image being converted and measure its BEFORE size.
  useEffect(() => {
    if (!near || typeof document === 'undefined') return undefined
    const url = pick ? pick.url : CONVERTER_SOURCE
    if (!url) { canvasRef.current = null; return undefined }
    let cancelled = false
    const img = new Image()
    img.decoding = 'async'
    img.src = url
    img.decode().then(async () => {
      if (cancelled) return
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      canvas.getContext('2d').drawImage(img, 0, 0)
      canvasRef.current = canvas
      const before = pick ? pick.size : await encode(canvas, 'image/png')
      if (!cancelled) setSrc({ w: img.naturalWidth, h: img.naturalHeight, before })
    }).catch(() => { if (!cancelled) setSrc(null) })
    return () => { cancelled = true }
  }, [near, pick])

  // Re-encode at the format and quality on screen.
  useEffect(() => {
    if (!src || !canvasRef.current) return undefined
    let cancelled = false
    const timer = setTimeout(async () => {
      const [, type] = IMG_FORMATS[fmt]
      const size = await encode(canvasRef.current, type, type === 'image/png' ? undefined : quality / 100)
      if (!cancelled) setOut(size)
    }, 150)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [src, fmt, quality])

  const take = (file) => {
    if (!file) return
    const isImage = (file.type || '').startsWith('image/')
    setOut(null)
    setSrc(null)
    setPick({ name: file.name, size: file.size, url: isImage ? URL.createObjectURL(file) : '' })
  }

  const lossless = IMG_FORMATS[fmt][0] === 'PNG'
  const before = src?.before ?? null
  const pct = before && out != null ? Math.round(100 - (out / before) * 100) : null
  const saving = pct == null ? '…' : pct >= 0 ? `${pct}% smaller` : `${-pct}% larger`
  const [, rw, rh] = RATIO_PRESETS[ratioPreset]
  const stem = pick ? pick.name.replace(/\.[^.]+$/, '') : 'plateau-sunset'
  const srcName = pick ? pick.name : mode === 2 ? 'plateau-sunset.mp4' : 'plateau-sunset.png'
  const srcMeta = pick
    ? `${formatBytes(pick.size)}, ready to convert`
    : mode === 2 ? '1920 × 1080, 0:08, 12.4 MB' : src ? `${src.w} × ${src.h}, ${formatBytes(src.before)}` : 'Measuring…'
  const artUrl = pick?.url || CONVERTER_SOURCE
  const stripLen = Math.min(8, frameCount)
  const strip = Array.from({ length: stripLen }, (_, i) => {
    const k = i / Math.max(1, stripLen - 1)
    return { pos: `${Math.round(k * 100)}% 50%`, time: `0:0${Math.min(8, Math.round(k * 8))}` }
  })

  return (
    <div className="sp-panel-body sp-panel-body--pad" ref={root}>
      <div className="sp-modes" role="group" aria-label="Mode">
        {IMG_MODES.map(([label, icon], i) => (
          <button key={label} type="button" className="sp-utab" aria-pressed={mode === i} onClick={() => setMode(i)}>
            {icon ? <PhIcon name={icon} /> : <span aria-hidden="true" />}{label}
          </button>
        ))}
      </div>

      <label
        className={dragging ? 'sp-drop is-drag' : 'sp-drop'}
        onDragOver={(e) => { e.preventDefault(); if (!dragging) setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); take(e.dataTransfer?.files?.[0]) }}
      >
        {pick?.url
          ? <span className="sp-drop-thumb" aria-hidden="true" style={{ backgroundImage: `url(${pick.url})` }} />
          : <img className="sp-drop-thumb" src={CONVERTER_SOURCE} alt="" width="240" height="135" loading="lazy" decoding="async" />}
        <span className="sp-drop-say">
          <b>{srcName}</b>
          <small>{srcMeta}</small>
        </span>
        <span className="sp-drop-btn"><PhIcon name="upload-simple" />{pick ? 'Replace' : 'Choose a file'}</span>
        <input type="file" accept="image/*,video/*" onChange={(e) => take(e.target.files?.[0])} aria-label="Choose a file to convert" />
      </label>

      {(mode === 0 || mode === 1) && (
        <div className="sp-conv">
          <div className="sp-conv-art">
            {pick?.url
              ? <span role="img" aria-label="The file you chose, ready to convert" style={{ backgroundImage: `url(${pick.url})` }} />
              : <img src={artUrl} alt="The photograph being converted" width="1600" height="900" loading="lazy" decoding="async" />}
            <span className="sp-conv-dims">{src ? `${src.w} × ${src.h}` : '…'}</span>
          </div>
          <div className="sp-bars">
            <div className="sp-bar">
              <div className="sp-bar-row"><small>BEFORE</small><span>{srcName}, {formatBytes(before)}</span></div>
              <span className="sp-bar-track"><span className="sp-bar-fill" style={{ width: '100%' }} /></span>
            </div>
            <div className="sp-bar">
              <div className="sp-bar-row">
                <small>AFTER {quality}%</small>
                <span>{`${stem}.${IMG_FORMATS[fmt][0].toLowerCase()}`}, {formatBytes(out)}</span>
              </div>
              <span className="sp-bar-track">
                <span
                  className="sp-bar-fill sp-bar-fill--out"
                  style={{ width: before && out != null ? `${Math.min(100, Math.max(4, Math.round((out / before) * 100)))}%` : '4%' }}
                />
              </span>
            </div>
          </div>
          <div className="sp-fmtrow" role="group" aria-label="Output format">
            {IMG_FORMATS.map(([label], i) => (
              <button key={label} type="button" className="sp-utab" aria-pressed={fmt === i} onClick={() => setFmt(i)}>{label}</button>
            ))}
          </div>
          <label className="sp-quality">
            <span>
              <span>{lossless ? 'Lossless, quality ignored' : 'Quality'}</span>
              <b>{lossless ? (pct === 0 ? 'no loss, no saving' : `no loss, ${saving}`) : `${quality}%, ${saving}`}</b>
            </span>
            <input type="range" min="30" max="100" step="5" value={quality} onChange={(e) => setQuality(parseInt(e.target.value, 10))} aria-label="Compression quality" />
          </label>
        </div>
      )}

      {mode === 3 && (
        <div className="sp-ratio">
          <div className="sp-ratio-stage">
            <img src={CONVERTER_SOURCE} alt="The photograph cropped to the chosen aspect ratio" width="1600" height="900" loading="lazy" decoding="async" style={{ aspectRatio: `${rw} / ${rh}` }} />
            <span className="sp-ratio-size">{rw} × {rh}</span>
          </div>
          <div className="sp-fmtrow" role="group" aria-label="Aspect ratio">
            {RATIO_PRESETS.map(([label], i) => (
              <button key={label} type="button" className="sp-utab" aria-pressed={ratioPreset === i} onClick={() => setRatioPreset(i)}>{label}</button>
            ))}
          </div>
          <span className="sp-ratio-half">{Math.round(rw / 2)} × {Math.round(rh / 2)} at 0.5×</span>
        </div>
      )}

      {mode === 2 && (
        <div className="sp-frames">
          <div className="sp-strip">
            {strip.map((f) => (
              <span key={f.pos}>
                <img src={CONVERTER_SOURCE} alt="" width="1600" height="900" loading="lazy" decoding="async" style={{ objectPosition: f.pos }} />
                <small>{f.time}</small>
              </span>
            ))}
          </div>
          <div className="sp-frames-row">
            <div role="group" aria-label="Frame count">
              {FRAME_COUNTS.map((n) => (
                <button key={n} type="button" className="sp-utab" aria-pressed={frameCount === n} onClick={() => setFrameCount(n)}>{n} FRAMES</button>
              ))}
            </div>
            <small>{frameCount > 8 ? `Eight of ${frameCount} frames, evenly sampled` : `${frameCount} frames`}</small>
          </div>
        </div>
      )}

      <div className="sp-conv-foot">
        <Link className="sp-pill" to={route('file-converter')}>
          <span>{pick ? 'Continue in the converter' : 'Open File Converter'}</span>
          <span className="sp-pill-icon" aria-hidden="true"><PhIcon name="arrow-up-right" /></span>
        </Link>
        <Link className="sp-ghost" to={route('ratio')}>Aspect &amp; Resolution</Link>
      </div>
    </div>
  )
}
