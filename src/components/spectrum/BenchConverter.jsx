import { useEffect, useId, useRef, useState } from 'react'
import ToolFoot from './ToolFoot'
import PhIcon from './PhIcon'
import { prefersReducedMotion } from './reducedMotion'
import { route } from './spectrumFacts'
import { navigatesThisTab } from '../../utils/handoffSlot'
import { setImageHandoff } from '../../utils/imageHandoff'
import {
  CONVERTER_SOURCE,
  FRAME_COUNTS,
  IMG_FORMATS,
  IMG_MODES,
  MODEL_OUTPUTS,
  MODEL_PREVIEW,
  MODEL_SOURCE,
  RATIO_PRESETS,
  formatBytes,
} from './spectrumKit'

// FILE CONVERTER — the design's window, with its Tasmanian sunset photograph.
//
// THE SIZES ARE MEASURED, NOT TABLED. The photo is drawn to a canvas and
// encoded with `canvas.toBlob` at the format and quality on screen, and the
// BEFORE and AFTER bars print what the browser actually produced — the same
// encoder path the File Converter uses. BEFORE is the photo as a lossless PNG
// (the design's "plateau-sunset.png"), or the real size of a file the visitor
// drops in; AFTER is that image re-encoded. The saving above the bars is the
// one percentage the panel prints.
//
// Nothing runs until the window is near the screen, and each re-encode is
// debounced, so a visitor dragging the quality slider costs one encode at the
// end rather than fifteen on the way. Nothing is uploaded: the file never
// leaves the tab.
//
// THE FOUR PANES SHARE ONE GRID CELL. The inactive ones are hidden and inert
// rather than unmounted, so the panel is as tall as its tallest pane and a tab
// switch moves nothing below the tab row.

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

/** True while the element is on screen (not one-shot, unlike useInView). */
function useOnScreen(ref, active) {
  const [on, setOn] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || !active || typeof IntersectionObserver === 'undefined') return undefined
    const io = new IntersectionObserver((entries) => setOn(entries.some((e) => e.isIntersecting)))
    io.observe(el)
    return () => { io.disconnect(); setOn(false) }
  }, [ref, active])
  return on
}

const encode = (canvas, type, q) => new Promise((resolve) => {
  try { canvas.toBlob((b) => resolve(b ? b.size : null), type, q) } catch { resolve(null) }
})

const isImage = (file) => (file?.type || '').startsWith('image/')

/** The saving line: [number, words, tone]. Tone 'win' is the accent. */
function savingOf(pct, lossless) {
  if (pct == null) return ['…', 'smaller', 'wait']
  if (pct < 0) return [`${-pct}%`, 'larger than the original', 'plain']
  if (lossless && pct === 0) return ['No loss', 'PNG keeps every pixel', 'noloss']
  return [`${pct}%`, lossless ? 'smaller, no quality lost' : 'smaller', pct > 0 ? 'win' : 'plain']
}

export default function BenchConverter({ onResult }) {
  const uid = useId()
  const root = useRef(null)
  const stageRef = useRef(null)
  const tabRefs = useRef([])
  const near = useInView(root)
  const [mode, setMode] = useState('compress')
  const [modelOpened, setModelOpened] = useState(false)
  const [fmt, setFmt] = useState(0)
  const [outFmt, setOutFmt] = useState(0)
  const [quality, setQuality] = useState(75)
  const [ratioPreset, setRatioPreset] = useState(0)
  const [frameCount, setFrameCount] = useState(12)
  const [dragging, setDragging] = useState(null)
  const [pick, setPick] = useState(null)
  const [clip, setClip] = useState(null)
  const [failed, setFailed] = useState(false)
  const [loopReady, setLoopReady] = useState(false)
  // { w, h, before } for the image being measured, and the latest AFTER size.
  const [src, setSrc] = useState(null)
  const [out, setOut] = useState(null)
  const canvasRef = useRef(null)
  const modelOn = useOnScreen(stageRef, mode === 'model')

  // Release a picked file's object URL when it is replaced or the page goes.
  useEffect(() => () => { if (pick?.url) URL.revokeObjectURL(pick.url) }, [pick])

  // Decode the image being compressed and measure its BEFORE size.
  useEffect(() => {
    if (!near || typeof document === 'undefined') return undefined
    const url = pick ? pick.url : CONVERTER_SOURCE
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
      if (cancelled) return
      // A zero-size image, or one past the browser's canvas limit, cannot be
      // measured; it reports as unsupported rather than waiting for a figure.
      if (!img.naturalWidth || !img.naturalHeight || !before) { setSrc(null); setFailed(true); return }
      setSrc({ w: img.naturalWidth, h: img.naturalHeight, before })
    }).catch(() => { if (!cancelled) { setSrc(null); if (pick) setFailed(true) } })
    return () => { cancelled = true }
  }, [near, pick])

  // Re-encode at the format and quality on screen.
  useEffect(() => {
    if (!src || !canvasRef.current) return undefined
    let cancelled = false
    const timer = setTimeout(async () => {
      const [, type] = IMG_FORMATS[fmt]
      const size = await encode(canvasRef.current, type, type === 'image/png' ? undefined : quality / 100)
      // The size is stored with the format it was encoded as, so a reading
      // from the previous format is never shown under the new one's name.
      if (cancelled) return
      if (size == null) { setFailed(true); return }
      setOut({ size, format: IMG_FORMATS[fmt][0] })
    }, 150)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [src, fmt, quality])

  // The turntable plays only while its tab is open, the stage is on screen and
  // motion is allowed; otherwise the poster stands in, so nothing keeps decoding.
  const playing = mode === 'model' && modelOn && !prefersReducedMotion()
  useEffect(() => {
    if (!playing || loopReady) return undefined
    let cancelled = false
    const img = new Image()
    img.src = MODEL_PREVIEW.loop
    img.decode().then(() => { if (!cancelled) setLoopReady(true) }).catch(() => {})
    return () => { cancelled = true }
  }, [playing, loopReady])

  const takeImage = (file) => {
    if (!file) return
    // A rejected file leaves the current image and its measurements untouched.
    if (!isImage(file)) { setFailed(true); return }
    setOut(null)
    setSrc(null)
    setFailed(false)
    setPick({ name: file.name, size: file.size, url: URL.createObjectURL(file), file })
  }
  const takeClip = (file) => { if (file) setClip({ name: file.name, size: file.size }) }

  const select = (id) => {
    setMode(id)
    if (id === 'model') setModelOpened(true)
  }
  const onTabKey = (e, i) => {
    const n = IMG_MODES.length
    const keys = { ArrowRight: (i + 1) % n, ArrowLeft: (i - 1 + n) % n, Home: 0, End: n - 1 }
    if (!(e.key in keys)) return
    e.preventDefault()
    select(IMG_MODES[keys[e.key]][0])
    tabRefs.current[keys[e.key]]?.focus()
  }

  const dropProps = (kind, take) => ({
    onDragOver: (e) => { e.preventDefault(); if (dragging !== kind) setDragging(kind) },
    onDragLeave: () => setDragging(null),
    onDrop: (e) => { e.preventDefault(); setDragging(null); take(e.dataTransfer?.files?.[0]) },
  })
  const fileButton = (kind, chosen) => (dragging === kind ? 'Drop to replace' : chosen ? 'Replace' : 'Choose a file')

  const lossless = IMG_FORMATS[fmt][0] === 'PNG'
  const formatLabel = IMG_FORMATS[fmt][0]
  const before = src?.before ?? null
  // The AFTER size counts only once it was encoded as the format on screen; in
  // the gap after a format switch the old reading is stale, so it reads as pending.
  const outSize = out && out.format === formatLabel ? out.size : null
  const pct = before && outSize != null ? Math.round(100 - (outSize / before) * 100) : null
  const [numText, wordText, tone] = savingOf(pct, lossless)
  // The rail's summary reads the latest measurement. `measuring` is true only
  // once the converter is near the screen and a figure is still on its way; a
  // file that failed to decode reports `failed` rather than waiting.
  const measuring = near && !failed && pct == null
  useEffect(() => {
    onResult?.({ pct, format: formatLabel, failed, measuring })
  }, [onResult, pct, formatLabel, failed, measuring])
  const [, rw, rh] = RATIO_PRESETS[ratioPreset]
  const stem = pick ? pick.name.replace(/\.[^.]+$/, '') : 'plateau-sunset'
  const imageName = pick ? pick.name : 'plateau-sunset.png'
  const clipName = clip ? clip.name : 'plateau-sunset.mp4'
  const stripLen = Math.min(8, frameCount)
  const strip = Array.from({ length: stripLen }, (_, i) => {
    const k = i / Math.max(1, stripLen - 1)
    return { pos: `${Math.round(k * 100)}% 50%` }
  })
  const target = MODEL_OUTPUTS[outFmt]
  const fileToolHref = route('file-converter')
  // "Continue in the converter" carries the dropped image through the File
  // Converter's own in-memory hand-off, with the format and quality on screen as
  // its starting settings. The slot is staged only when this tab will navigate
  // (a modified click opens a new tab that would never consume it). A dropped
  // clip has no hand-off, so it keeps the plain "Open File Converter".
  const carryImage = (e) => {
    if (!pick?.file || !navigatesThisTab(e)) return
    const [label, type] = IMG_FORMATS[fmt]
    setImageHandoff([pick.file], {
      resolution: 'original',
      format: type,
      compression: label === 'PNG' ? 'lossless' : quality >= 90 ? 'high' : 'balanced',
    })
  }
  // Both bars share one scale, so a file that grew draws longer than the one it
  // came from; a result that is not smaller is drawn in a neutral fill.
  const top = Math.max(before || 0, outSize || 0) || 1
  const notSmaller = pct != null && pct <= 0
  // "name, size". The size sits in a box as wide as a full-width figure (the
  // hidden pad), so the name never moves. The figure itself is remounted per
  // value (the key): a new node has no previous position, so the browser has no
  // text start to count as having moved when "…" becomes "1.40 MB".
  const barValue = (name, bytes) => (
    <span>
      <span className="sp-bar-name">{name},</span>
      <span className="sp-bar-size">
        <span className="sp-bar-pad" aria-hidden="true">0000 KB</span>
        <span className="sp-bar-num" key={bytes ?? 'wait'}>{formatBytes(bytes)}</span>
      </span>
    </span>
  )
  const paneProps = (id) => ({
    role: 'tabpanel',
    id: `${uid}-pane-${id}`,
    'aria-labelledby': `${uid}-tab-${id}`,
    inert: mode !== id,
  })
  const paneClass = (id, cls) => `sp-cv-pane ${cls}${mode === id ? ' is-on' : ''}`

  return (
    <>
    <div className="sp-panel-body sp-panel-body--pad sp-cv" ref={root}>
      <div className="sp-modes" role="tablist" aria-label="Mode">
        {IMG_MODES.map(([id, label, , short], i) => (
          <button
            key={id}
            ref={(el) => { tabRefs.current[i] = el }}
            type="button"
            role="tab"
            id={`${uid}-tab-${id}`}
            aria-controls={`${uid}-pane-${id}`}
            aria-selected={mode === id}
            aria-label={label}
            tabIndex={mode === id ? 0 : -1}
            className="sp-utab"
            onClick={() => select(id)}
            onKeyDown={(e) => onTabKey(e, i)}
          >
            <span className={short ? 'sp-mode-long' : undefined}>{label}</span>
            {short ? <span className="sp-mode-short" aria-hidden="true">{short}</span> : null}
          </button>
        ))}
      </div>

      <div className="sp-cv-panes">
        <div className={paneClass('compress', 'sp-conv')} {...paneProps('compress')}>
          <label className={dragging === 'image' ? 'sp-conv-art sp-art is-drag' : 'sp-conv-art sp-art'} {...dropProps('image', takeImage)}>
            {pick
              ? <span role="img" aria-label="The file you chose, ready to compress" style={{ backgroundImage: `url(${pick.url})` }} />
              : <img src={CONVERTER_SOURCE} alt="The photograph being compressed" width="1600" height="900" loading="lazy" decoding="async" />}
            <span className="sp-art-over" aria-hidden="true">
              <span className="sp-art-name">{imageName}</span>
              <span className="sp-art-btn"><PhIcon name="upload-simple" />{fileButton('image', pick)}</span>
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => { takeImage(e.target.files?.[0]); e.target.value = '' }}
              aria-label={pick ? `Replace ${pick.name}` : 'Choose an image to compress'}
            />
          </label>
          <p className="sp-saving" aria-live="polite">
            {failed
              ? <span className="sp-saving-word">That file is not supported. Try a JPG, PNG or WebP.</span>
              : <>
                <b className={tone === 'win' ? 'sp-saving-num' : `sp-saving-num is-${tone}`}>
                  <span className="sp-saving-pad" aria-hidden="true">00%</span>
                  <span className="sp-saving-fig">{numText}</span>
                </b>
                <span className="sp-saving-word">{wordText}</span>
              </>}
          </p>
          <div className="sp-bars">
            <div className="sp-bar">
              <div className="sp-bar-row"><small>Before</small>{barValue(imageName, before)}</div>
              <span className="sp-bar-track"><span className="sp-bar-fill" style={{ width: before ? `${Math.round((before / top) * 100)}%` : '100%' }} /></span>
            </div>
            <div className="sp-bar">
              <div className="sp-bar-row">
                <small>After</small>
                {barValue(`${stem}.${formatLabel.toLowerCase()}`, outSize)}
              </div>
              <span className="sp-bar-track">
                <span
                  className={notSmaller ? 'sp-bar-fill sp-bar-fill--out is-plain' : 'sp-bar-fill sp-bar-fill--out'}
                  style={{ width: before && outSize != null ? `${Math.max(4, Math.round((outSize / top) * 100))}%` : '4%' }}
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
            <span className="sp-quality-row">
              <span>{lossless ? 'Lossless, quality not used' : 'Quality'}</span>
              {lossless ? null : <output>{quality}%</output>}
            </span>
            <input
              type="range"
              min="30"
              max="100"
              step="5"
              value={quality}
              onChange={(e) => setQuality(parseInt(e.target.value, 10))}
              aria-label="Compression quality"
              aria-valuetext={`${quality}% quality`}
              disabled={lossless}
            />
          </label>
        </div>

        <div className={paneClass('model', 'sp-model')} {...paneProps('model')}>
          <div className="sp-model-stage" ref={stageRef}>
            {modelOpened
              ? <img
                src={playing && loopReady ? MODEL_PREVIEW.loop : MODEL_PREVIEW.poster}
                alt={`A machined bracket turning, converted from ${MODEL_SOURCE.label} to ${target.label}.`}
                width={MODEL_PREVIEW.width}
                height={MODEL_PREVIEW.height}
                decoding="async"
              />
              : null}
          </div>
          <div className="sp-model-conv">
            <span className="sp-model-chip">{MODEL_SOURCE.label}</span>
            <span className="sp-model-wire" aria-hidden="true"><PhIcon name="arrow-right" /></span>
            <span className="sp-model-chip is-out">{target.label}</span>
            <span className="sp-model-unit">{target.metres ? `${MODEL_SOURCE.unit} → m` : `${MODEL_SOURCE.unit} → your unit`}</span>
          </div>
          <div className="sp-fmtrow" role="group" aria-label="Output format">
            {MODEL_OUTPUTS.map(({ id, label }, i) => (
              <button key={id} type="button" className="sp-utab" aria-pressed={outFmt === i} onClick={() => setOutFmt(i)}>{label}</button>
            ))}
          </div>
          <p className="sp-model-say">
            {target.metres
              ? 'Millimetres in, metres out, so it opens in Blender at the right size.'
              : 'Millimetres in, written in the unit you pick.'}
          </p>
        </div>

        <div className={paneClass('frames', 'sp-frames')} {...paneProps('frames')}>
          <label className={dragging === 'video' ? 'sp-strip sp-art is-drag' : 'sp-strip sp-art'} {...dropProps('video', takeClip)}>
            {strip.map((f) => (
              <span key={f.pos}>
                <img src={CONVERTER_SOURCE} alt="" width="1600" height="900" loading="lazy" decoding="async" style={{ objectPosition: f.pos }} />
              </span>
            ))}
            <span className="sp-art-over" aria-hidden="true">
              <span className="sp-art-name">{clipName}</span>
              <span className="sp-art-btn"><PhIcon name="upload-simple" />{fileButton('video', clip)}</span>
            </span>
            <input
              type="file"
              accept="video/*"
              onChange={(e) => { takeClip(e.target.files?.[0]); e.target.value = '' }}
              aria-label={clip ? `Replace ${clip.name}` : 'Choose a video'}
            />
          </label>
          <div className="sp-frames-row">
            <div role="group" aria-label="Frame count">
              {FRAME_COUNTS.map((n) => (
                <button key={n} type="button" className="sp-utab" aria-pressed={frameCount === n} onClick={() => setFrameCount(n)}>{n} frames</button>
              ))}
            </div>
            <small>{`${stripLen} crops of one sample photo`}</small>
          </div>
        </div>

        <div className={paneClass('ratio', 'sp-ratio')} {...paneProps('ratio')}>
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
      </div>

    </div>
      {mode === 'model'
        ? <ToolFoot to={route('3d-converter')} secondary={{ to: fileToolHref, label: 'File Converter' }}>Open 3D Model Converter</ToolFoot>
        : (
          <ToolFoot to={fileToolHref} onClick={carryImage} secondary={{ to: route('ratio'), label: 'Aspect & Resolution' }}>
            {pick ? 'Continue in the converter' : 'Open File Converter'}
          </ToolFoot>
        )}
    </>
  )
}
