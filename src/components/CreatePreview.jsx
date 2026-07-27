import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import SnapSlider from './SnapSlider'
import { CREATE_GROUPS } from '../data/toolTree'

const PREVIEW_META = {
  colour: { previewLabel: 'Colour', previewHome: '/color' },
  icons: { previewLabel: 'Icons', previewHome: '/icons' },
  imagery: { previewLabel: 'Imagery', previewHome: '/file-converter' },
}

export const LIVE_PREVIEW_GROUPS = CREATE_GROUPS
  .filter((group) => Object.hasOwn(PREVIEW_META, group.id))
  .map((group) => ({ ...group, ...PREVIEW_META[group.id] }))

// Live, working micro-tools for the homepage Create section, wrapped in a fake
// browser so a visitor understands what UIL4B *does* in the first few seconds —
// the fastest cure for "confused shoppers have empty carts." Each browser tab is
// a different CREATE system (colour, icons, type, components, imagery, ai) and
// opens a genuinely interactive "mini version of the UI". Nothing here is faked:
// the palette really generates, the image really compresses, the icons really
// deep-link into the editor. The frame teases; the "Open …" link converts.
//
// All state changes fire from user events (click / input / change), never
// synchronously inside an effect, so we stay clear of the `set-state-in-effect`
// advisory. The only effect is an unmount cleanup for the copy timer.

/* ── colour maths ──────────────────────────────────────────────────────── */

// HSL → hex without a canvas, so palettes are deterministic and dependency-free.
function hslToHex(h, s, l) {
  s /= 100
  l /= 100
  const k = (n) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  const toHex = (x) => Math.round(255 * x).toString(16).padStart(2, '0')
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`.toUpperCase()
}

// Pick a readable ink colour for a swatch label from its perceived luminance.
function readable(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.58 ? '#141414' : '#ffffff'
}

// Copy that degrades gracefully where the Clipboard API is unavailable.
function copyText(text) {
  try { navigator.clipboard?.writeText(text) } catch { /* no-op */ }
}

// Shared "copied!" flash: sets a key for ~1.1s. The effect only registers an
// unmount cleanup (no synchronous setState), so it stays lint-clean.
function useCopyFlash() {
  const [copied, setCopied] = useState(null)
  const timer = useRef(null)
  const flash = (key, text) => {
    copyText(text)
    setCopied(key)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(null), 1100)
  }
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])
  return [copied, flash]
}

// Human-readable byte size.
function kb(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

/* ── tiny inline glyphs (no asset deps, match the nav stroke language) ──── */

function IconShuffle() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 5h4l9 14h3M20 5h-3l-2.5 4M4 19h4l2.5-4" />
      <path d="m18 3 2 2-2 2M18 17l2 2-2 2" />
    </svg>
  )
}
function IconLock({ open }) {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      {open
        ? <path d="M8 11V8a4 4 0 0 1 7.5-2" />
        : <path d="M8 11V8a4 4 0 0 1 8 0v3" />}
    </svg>
  )
}
function IconCopy() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h8" />
    </svg>
  )
}
function IconImage() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.5" cy="9.5" r="1.6" /><path d="m4 17 5-4.5 4 3.5 3-2.5 4 3.5" />
    </svg>
  )
}
function IconDown() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 4v11m0 0 4-4m-4 4-4-4M5 20h14" />
    </svg>
  )
}
function IconArrow() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h13m0 0-5-5m5 5-5 5" />
    </svg>
  )
}

/* ── 1 · Colour — live palette generator ───────────────────────────────── */

const L_RAMP = [34, 47, 60, 73, 86] // lightness ramp → reads as a designed set
function makeSwatch(baseH, i) {
  const h = (baseH + i * 14 + (Math.random() * 8 - 4) + 360) % 360
  const s = 60 + Math.random() * 16
  return { hex: hslToHex(h, s, L_RAMP[i]), locked: false }
}
function makePalette() {
  const baseH = Math.floor(Math.random() * 360)
  return L_RAMP.map((_, i) => makeSwatch(baseH, i))
}

function ColourTool() {
  const [sw, setSw] = useState(makePalette)
  const [copied, flash] = useCopyFlash()
  const generate = () => {
    const baseH = Math.floor(Math.random() * 360)
    setSw((prev) => prev.map((s, i) => (s.locked ? s : makeSwatch(baseH, i))))
  }
  const toggleLock = (i) =>
    setSw((prev) => prev.map((s, j) => (j === i ? { ...s, locked: !s.locked } : s)))
  return (
    <div className="ct">
      <div className="ct-row">
        {sw.map((s, i) => (
          <div className="ct-sw" key={i} style={{ background: s.hex }}>
            <button
              type="button"
              className="ct-lock"
              style={{ color: readable(s.hex) }}
              aria-pressed={s.locked}
              aria-label={s.locked ? 'Unlock colour' : 'Lock colour'}
              onClick={() => toggleLock(i)}
            >
              <IconLock open={!s.locked} />
            </button>
            <button
              type="button"
              className="ct-copy"
              style={{ color: readable(s.hex) }}
              aria-label={`Copy ${s.hex}`}
              onClick={() => flash(s.hex, s.hex)}
            >
              <span className="ct-hex">{copied === s.hex ? 'Copied' : s.hex}</span>
            </button>
          </div>
        ))}
      </div>
      <div className="prev-controls">
        <button type="button" className="prev-btn prev-btn-go" onClick={generate}>
          <IconShuffle /> Generate
        </button>
        <span className="prev-hint">Click to copy · lock to keep</span>
      </div>
    </div>
  )
}

/* ── 2 · Type — system-font gallery (click a face to copy its stack) ────── */

const FONTS = [
  { name: 'Helvetica Neue', cat: 'Sans', stack: '"Helvetica Neue",Helvetica,Arial,sans-serif' },
  { name: 'Georgia', cat: 'Serif', stack: 'Georgia,"Times New Roman",serif' },
  { name: 'Palatino', cat: 'Serif', stack: '"Palatino Linotype",Palatino,"Book Antiqua",serif' },
  { name: 'Verdana', cat: 'Sans', stack: 'Verdana,Geneva,sans-serif' },
  { name: 'Trebuchet', cat: 'Sans', stack: '"Trebuchet MS",Tahoma,sans-serif' },
  { name: 'Courier', cat: 'Mono', stack: '"Courier New",Courier,monospace' },
]

function TypeTool() {
  const [copied, flash] = useCopyFlash()
  return (
    <div className="tt">
      <div className="tt-gallery">
        {FONTS.map((f) => (
          <button
            key={f.name}
            type="button"
            className="tt-line-btn"
            data-copied={copied === f.name}
            aria-label={`Copy ${f.name} font-family`}
            onClick={() => flash(f.name, `font-family: ${f.stack};`)}
          >
            <span className="tt-name" style={{ fontFamily: f.stack }}>{f.name}</span>
            <span className="tt-tag">{copied === f.name ? 'Copied' : f.cat}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

/* ── 3 · Component — live token playground ─────────────────────────────── */

const CM_HUES = ['colour', 'component', 'imagery', 'ai']

function ComponentTool() {
  const [radius, setRadius] = useState(12)
  const [hi, setHi] = useState(1)
  return (
    <div className="cm" data-hue={CM_HUES[hi]}>
      <div className="cm-stage">
        <div className="cm-card" style={{ borderRadius: Math.min(radius + 6, 26) }}>
          <span className="cm-card-dot" aria-hidden="true" />
          <span className="cm-card-line cm-card-line-lg" />
          <span className="cm-card-line" />
          <div className="cm-field" style={{ borderRadius: Math.max(radius - 2, 4) }}>
            <span className="cm-field-ph" />
          </div>
          <button type="button" className="cm-btn" style={{ borderRadius: radius }}>
            Get started
          </button>
        </div>
      </div>
      <div className="prev-controls cm-controls">
        <label className="cm-slider">
          <span className="prev-hint">Radius</span>
          <SnapSlider
            min={0}
            max={24}
            value={radius}
            defaultValue={12}
            snaps={[0, 6, 12, 18, 24]}
            unit="px"
            ariaLabel="Corner radius"
            onChange={setRadius}
          />
        </label>
        <div className="cm-swatches" role="group" aria-label="Accent colour">
          {CM_HUES.map((hue, i) => (
            <button
              key={hue}
              type="button"
              className="cm-swatch"
              data-hue={hue}
              data-active={i === hi}
              aria-label={`Accent ${hue}`}
              aria-pressed={i === hi}
              onClick={() => setHi(i)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── 4 · Imagery — live image compressor (real bytes, real savings) ─────── */

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    if (!canvas || typeof canvas.toBlob !== 'function') {
      reject(new Error('Image encoding is not supported in this browser.'))
      return
    }
    try {
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error('This browser could not encode the image.')),
        type,
        quality,
      )
    } catch {
      reject(new Error('Image encoding is not supported in this browser.'))
    }
  })
}

const ENCODE_FORMATS = {
  'image/webp': { ext: 'webp', format: 'WebP' },
  'image/jpeg': { ext: 'jpg', format: 'JPEG' },
  'image/png': { ext: 'png', format: 'PNG' },
}

async function encodeCanvas(canvas, quality) {
  let blob = await canvasToBlob(canvas, 'image/webp', quality)
  if (blob.type !== 'image/webp') {
    blob = await canvasToBlob(canvas, 'image/jpeg', quality)
  }
  const metadata = ENCODE_FORMATS[blob.type]
  if (!metadata || !blob.size) throw new Error('This browser returned an unsupported image format.')
  return { blob, bytes: blob.size, ...metadata }
}

// A detailed sample image so PNG stays heavy and the WebP saving is dramatic.
// Canvas drawing is cheap; all byte encoding is deferred to the async pipeline.
function makeSampleCanvas() {
  const w = 520, h = 340
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  const ctx = c.getContext('2d')
  if (!ctx) {
    return {
      canvas: null,
      name: 'sample-hero.png',
      outputName: 'sample-hero',
      originalW: w,
      originalH: h,
      outputW: w,
      outputH: h,
      originalBytes: 0,
    }
  }
  const g = ctx.createLinearGradient(0, 0, w, h)
  g.addColorStop(0, '#0051FF'); g.addColorStop(0.5, '#8B5CF6'); g.addColorStop(1, '#FF3B30')
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h)
  const orbs = [['#FFD60A', 0.5], ['#34C759', 0.45], ['#FF6B6B', 0.4], ['#4CC9F0', 0.5]]
  for (let i = 0; i < 26; i++) {
    const [col, al] = orbs[i % orbs.length]
    ctx.globalAlpha = al * (0.4 + Math.random() * 0.6)
    ctx.fillStyle = col
    ctx.beginPath()
    ctx.arc(Math.random() * w, Math.random() * h, 14 + Math.random() * 60, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 0.06
  for (let i = 0; i < 2600; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? '#ffffff' : '#000000'
    ctx.fillRect(Math.random() * w, Math.random() * h, 1.4, 1.4)
  }
  ctx.globalAlpha = 1
  return {
    canvas: c,
    name: 'sample-hero.png',
    outputName: 'sample-hero',
    originalW: w,
    originalH: h,
    outputW: w,
    outputH: h,
    originalBytes: 0,
  }
}

const IMG_Q = [30, 50, 70, 85, 95]
const MAX_IMAGE_BYTES = 25 * 1024 * 1024
const MAX_CANVAS_EDGE = 1600
const MAX_CANVAS_PIXELS = 4_000_000
const ENCODE_DEBOUNCE_MS = 180

function ImageryTool() {
  const [source, setSource] = useState(makeSampleCanvas)
  const [quality, setQuality] = useState(70)
  const [err, setErr] = useState('')
  const [readBusy, setReadBusy] = useState(false)
  const [encodeBusy, setEncodeBusy] = useState(true)
  const [comp, setComp] = useState({
    url: '',
    ext: '',
    format: 'Pending',
    bytes: 0,
    originalBytes: 0,
    quality: 70,
    error: '',
  })
  const fileRef = useRef(null)
  const encodeTimerRef = useRef(null)
  const encodeTokenRef = useRef(0)
  const outputUrlRef = useRef('')
  const originalSizeCacheRef = useRef(new WeakMap())
  const busy = readBusy || encodeBusy

  useEffect(() => {
    const token = ++encodeTokenRef.current
    clearTimeout(encodeTimerRef.current)
    encodeTimerRef.current = setTimeout(async () => {
      try {
        let originalBytes = source.originalBytes
        if (!originalBytes && source.canvas) {
          originalBytes = originalSizeCacheRef.current.get(source.canvas) || 0
          if (!originalBytes) {
            const originalBlob = await canvasToBlob(source.canvas, 'image/png')
            originalBytes = originalBlob.size
            originalSizeCacheRef.current.set(source.canvas, originalBytes)
          }
        }
        const encoded = await encodeCanvas(source.canvas, quality / 100)
        if (encodeTokenRef.current !== token) return
        const nextUrl = URL.createObjectURL(encoded.blob)
        if (encodeTokenRef.current !== token) {
          URL.revokeObjectURL(nextUrl)
          return
        }
        if (outputUrlRef.current) URL.revokeObjectURL(outputUrlRef.current)
        outputUrlRef.current = nextUrl
        setComp({
          url: nextUrl,
          ext: encoded.ext,
          format: encoded.format,
          bytes: encoded.bytes,
          originalBytes,
          quality,
          error: '',
        })
      } catch (error) {
        if (encodeTokenRef.current !== token) return
        if (outputUrlRef.current) URL.revokeObjectURL(outputUrlRef.current)
        outputUrlRef.current = ''
        setComp({
          url: '',
          ext: '',
          format: 'Unavailable',
          bytes: 0,
          originalBytes: source.originalBytes,
          quality,
          error: error.message || 'This image could not be encoded.',
        })
      } finally {
        if (encodeTokenRef.current === token) setEncodeBusy(false)
      }
    }, ENCODE_DEBOUNCE_MS)

    return () => {
      clearTimeout(encodeTimerRef.current)
      if (encodeTokenRef.current === token) encodeTokenRef.current += 1
    }
  }, [source, quality])

  useEffect(() => () => {
    encodeTokenRef.current += 1
    clearTimeout(encodeTimerRef.current)
    if (outputUrlRef.current) URL.revokeObjectURL(outputUrlRef.current)
    outputUrlRef.current = ''
  }, [])

  const originalBytes = source.originalBytes || comp.originalBytes
  const deltaPercent = originalBytes
    ? Math.round(Math.abs(1 - comp.bytes / originalBytes) * 100)
    : 0
  const result = !comp.bytes || !originalBytes
    ? { tone: 'neutral', headline: 'Comparison unavailable', detail: comp.error || 'Choose another image to try again.' }
    : comp.bytes < originalBytes
      ? { tone: 'smaller', headline: `${deltaPercent}% smaller`, detail: `${kb(originalBytes - comp.bytes)} saved from the original upload.` }
      : comp.bytes > originalBytes
        ? { tone: 'larger', headline: `${deltaPercent}% larger`, detail: `${kb(comp.bytes - originalBytes)} larger than the original. Keep the source or lower quality.` }
        : { tone: 'neutral', headline: 'Same file size', detail: 'This image does not benefit from this encoding.' }
  const chartMax = Math.max(originalBytes, comp.bytes, 1)
  const changeQuality = (nextQuality) => {
    if (nextQuality === quality) return
    setEncodeBusy(true)
    setQuality(nextQuality)
  }

  const loadFile = (file) => {
    setErr('')
    if (!file) return
    if (!file.type.startsWith('image/')) { setErr('Choose a PNG, JPEG, WebP or another readable image file.'); return }
    if (file.size > MAX_IMAGE_BYTES) { setErr('That image is over 25 MB. Use the full File Converter for very large files.'); return }
    if (typeof FileReader === 'undefined' || typeof Image === 'undefined') {
      setErr('Image reading is not supported in this browser.')
      return
    }
    setReadBusy(true)
    const reader = new FileReader()
    reader.onload = () => {
      const im = new Image()
      im.onload = () => {
        try {
          const originalW = im.naturalWidth
          const originalH = im.naturalHeight
          if (!originalW || !originalH) throw new Error('That image has no readable dimensions.')
          const pixelScale = Math.sqrt(MAX_CANVAS_PIXELS / (originalW * originalH))
          const scale = Math.min(1, MAX_CANVAS_EDGE / originalW, MAX_CANVAS_EDGE / originalH, pixelScale)
          const outputW = Math.max(1, Math.round(originalW * scale))
          const outputH = Math.max(1, Math.round(originalH * scale))
          const canvas = document.createElement('canvas')
          canvas.width = outputW
          canvas.height = outputH
          const context = canvas.getContext('2d')
          if (!context) throw new Error('Canvas compression is not supported in this browser.')
          context.drawImage(im, 0, 0, outputW, outputH)
          setSource({
            canvas,
            name: file.name || 'image',
            outputName: (file.name || 'image').replace(/\.[^.]+$/, '') || 'image',
            originalW,
            originalH,
            outputW,
            outputH,
            originalBytes: file.size,
          })
          setEncodeBusy(true)
          setReadBusy(false)
        } catch (error) {
          setErr(error.message || 'That image could not be compressed.')
          setReadBusy(false)
        }
      }
      im.onerror = () => { setErr('That image could not be decoded. Try a different file.'); setReadBusy(false) }
      im.src = reader.result
    }
    reader.onerror = () => { setErr('That file could not be read.'); setReadBusy(false) }
    try {
      reader.readAsDataURL(file)
    } catch {
      setErr('That file could not be read.')
      setReadBusy(false)
    }
  }

  return (
    <div className="imc" aria-busy={busy}>
      <div className="imc-outcome">
        <div className="imc-stage">
          {comp.url
            ? <img className="imc-shot" src={comp.url} alt={`Compressed preview of ${source.name}`} />
            : <div className="imc-stage-empty">Preview unavailable</div>}
        </div>
        <div className="imc-result" data-tone={result.tone} aria-live="polite">
          <span className="imc-result-label">Compression result</span>
          <strong>{readBusy ? 'Reading image…' : encodeBusy ? 'Encoding image…' : result.headline}</strong>
          <span>{busy ? 'Preparing an honest byte comparison.' : result.detail}</span>
        </div>
      </div>

      <div className="imc-file">
        <div>
          <span className="imc-file-name">{source.name}</span>
          <span className="imc-file-meta">{source.originalW} × {source.originalH}px</span>
        </div>
        <span className="imc-output-meta">
          {encodeBusy ? `Encoding ${quality}% quality` : `${comp.format} · ${comp.quality}% quality`} · {source.outputW} × {source.outputH}px
        </span>
      </div>

      <div className="imc-bars" role="group" aria-label="Actual file size before and after compression">
        <div className="imc-bar-row">
          <span className="imc-bar-key">Original upload</span>
          <span className="imc-bar-track"><span className="imc-bar-fill is-orig" style={{ width: `${Math.max(4, originalBytes / chartMax * 100)}%` }} /></span>
          <span className="imc-bar-val">{kb(originalBytes)}</span>
        </div>
        <div className="imc-bar-row">
          <span className="imc-bar-key">{comp.format} output</span>
          <span className="imc-bar-track">
            <span className="imc-bar-fill is-comp" style={{ width: `${Math.max(4, comp.bytes / chartMax * 100)}%` }} />
          </span>
          <span className="imc-bar-val">{kb(comp.bytes)}</span>
        </div>
      </div>

      <div className="imc-controls">
        <label className="cm-slider imc-quality">
          <span className="prev-hint">Output quality</span>
          <SnapSlider
            min={30}
            max={95}
            value={quality}
            defaultValue={70}
            snaps={IMG_Q}
            unit="%"
            ariaLabel="Compression quality"
            onChange={changeQuality}
          />
        </label>
        <div className="prev-controls">
          <input
            ref={fileRef}
            className="imc-file-input"
            type="file"
            tabIndex={-1}
            accept="image/*"
            onChange={(event) => {
              loadFile(event.target.files?.[0])
              event.target.value = ''
            }}
          />
          <button type="button" className="prev-btn" disabled={busy} onClick={() => fileRef.current?.click()}>
            <IconImage /> Try image
          </button>
          {encodeBusy
            ? (
              <button type="button" className="prev-btn prev-btn-go" disabled>
                <IconDown /> Encoding…
              </button>
            )
            : comp.url && (
              <a className="prev-btn prev-btn-go" href={comp.url} download={`${source.outputName}.${comp.ext}`}>
                <IconDown /> Download {comp.format}
              </a>
            )}
        </div>
      </div>
      {(err || comp.error) && <p className="imc-err" role="alert">{err || comp.error}</p>}
    </div>
  )
}

/* ── 5 · AI — style-driven visual moodboard + prompt ───────────────────── */

const AI_STYLES = [
  { id: 'Minimal', pal: ['#FAFAF9', '#E7E5E4', '#78716C', '#1C1917'], stack: '"Helvetica Neue",Helvetica,Arial,sans-serif', mood: 'calm · spacious · restrained' },
  { id: 'Bold', pal: ['#FDE047', '#FB923C', '#DC2626', '#111827'], stack: '"Trebuchet MS",Tahoma,sans-serif', mood: 'loud · high-contrast · confident' },
  { id: 'Playful', pal: ['#FBCFE8', '#C4B5FD', '#34D399', '#4338CA'], stack: 'Verdana,Geneva,sans-serif', mood: 'friendly · rounded · energetic' },
  { id: 'Corporate', pal: ['#EFF6FF', '#93C5FD', '#2563EB', '#0F172A'], stack: 'Georgia,"Times New Roman",serif', mood: 'trusted · steady · precise' },
  { id: 'Dark', pal: ['#0B0F19', '#1E293B', '#38BDF8', '#E2E8F0'], stack: '"Helvetica Neue",Helvetica,Arial,sans-serif', mood: 'focused · sleek · premium' },
  { id: 'Pastel', pal: ['#FEF3C7', '#FBCFE8', '#BFDBFE', '#A7F3D0'], stack: '"Palatino Linotype",Palatino,serif', mood: 'soft · airy · gentle' },
]

function AiTool() {
  const [styleId, setStyleId] = useState('Minimal')
  const [subject, setSubject] = useState('a fintech dashboard')
  const [copied, flash] = useCopyFlash()
  const style = AI_STYLES.find((s) => s.id === styleId) || AI_STYLES[0]
  const prompt = `Design a ${style.id.toLowerCase()} UI system for ${subject || '…'} — palette ${style.pal.join(', ')}; ${style.mood}.`
  return (
    <div className="ap">
      <div className="ap-chips" role="group" aria-label="Visual style">
        {AI_STYLES.map((s) => (
          <button
            key={s.id}
            type="button"
            className="ap-chip"
            data-active={styleId === s.id}
            aria-pressed={styleId === s.id}
            onClick={() => setStyleId(s.id)}
          >
            {s.id}
          </button>
        ))}
      </div>
      <div className="ap-board">
        <div className="ap-swatches" aria-hidden="true">
          {style.pal.map((hex, i) => (
            <span className="ap-swatch" key={i} style={{ background: hex }} />
          ))}
        </div>
        <div className="ap-specimen" style={{ fontFamily: style.stack }} aria-hidden="true">
          <span className="ap-specimen-lg">Aa</span>
          <span className="ap-specimen-sm">The quick brown fox</span>
        </div>
        <p className="ap-mood">{style.mood}</p>
      </div>
      <label className="ap-field">
        <span className="ap-field-label">Describe it</span>
        <input
          type="text"
          value={subject}
          maxLength={60}
          placeholder="a fintech dashboard"
          onChange={(e) => setSubject(e.target.value)}
        />
      </label>
      <div className="ap-out">
        <p className="ap-prompt">{prompt}</p>
        <button type="button" className="prev-btn ap-copy" onClick={() => flash('prompt', prompt)}>
          {copied === 'prompt' ? 'Copied' : <><IconCopy /> Copy prompt</>}
        </button>
      </div>
    </div>
  )
}

/* ── 6 · Icons — curated Lucide set (click opens it in the icon editor) ─── */

const svgOf = (inner) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`

// Real Lucide icon names, so each cell deep-links straight to that icon in the
// Icon Library editor (/icons?icon=<name>). The inline paths just approximate
// each glyph for the teaser — the live page renders the real Lucide asset.
const ICON_SET = [
  { n: 'search', p: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/>' },
  { n: 'house', p: '<path d="M4 11l8-6 8 6"/><path d="M6 10v9h12v-9"/>' },
  { n: 'heart', p: '<path d="M12 20s-7-4.6-9.2-9A5 5 0 0 1 12 6a5 5 0 0 1 9.2 5c-2.2 4.4-9.2 9-9.2 9z"/>' },
  { n: 'star', p: '<path d="M12 4l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4L4.2 9.7l5.4-.8z"/>' },
  { n: 'user', p: '<circle cx="12" cy="9" r="3.5"/><path d="M5 20c0-3.6 3.1-5.5 7-5.5s7 1.9 7 5.5"/>' },
  { n: 'bell', p: '<path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6z"/><path d="M10 20a2 2 0 0 0 4 0"/>' },
  { n: 'mail', p: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="m3 8 9 6 9-6"/>' },
  { n: 'calendar', p: '<rect x="4" y="6" width="16" height="14" rx="2"/><path d="M4 10h16M8 4v4M16 4v4"/>' },
  { n: 'image', p: '<rect x="4" y="5" width="16" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="m5 17 4.5-4 4 3.5 3-2.5L20 17"/>' },
  { n: 'lock', p: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>' },
  { n: 'cloud', p: '<path d="M7 18a4 4 0 0 1 0-8 5 5 0 0 1 9.6-1.4A3.5 3.5 0 0 1 18 18z"/>' },
  { n: 'zap', p: '<path d="M13 3 5 14h5l-1 7 8-11h-5z"/>' },
  { n: 'circle-check', p: '<circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/>' },
  { n: 'play', p: '<path d="M8 5.5v13l11-6.5z"/>' },
  { n: 'settings', p: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/>' },
  { n: 'globe', p: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18"/>' },
]

function IconsTool() {
  return (
    <div className="ig-wrap">
      <div className="ig-grid">
        {ICON_SET.map((ic) => (
          <Link
            key={ic.n}
            className="ig-cell"
            to={`/icons?icon=${ic.n}`}
            title={ic.n}
            aria-label={`Open ${ic.n} in the icon editor`}
          >
            <span className="ig-glyph" aria-hidden="true" dangerouslySetInnerHTML={{ __html: svgOf(ic.p) }} />
          </Link>
        ))}
      </div>
      <p className="prev-hint ig-hint">Lucide icons · click one to open it in the editor</p>
    </div>
  )
}

/* ── browser frame + tab router ────────────────────────────────────────── */

const TOOLS = {
  colour: () => <ColourTool />,
  type: () => <TypeTool />,
  component: () => <ComponentTool />,
  imagery: () => <ImageryTool />,
  ai: () => <AiTool />,
  icons: () => <IconsTool />,
}

// A fake browser holding one open tab per CREATE system. Switching tabs remounts
// the mini-app (keyed on the group id), giving a clean crossfade and a fresh
// palette / compression each visit. The address bar's "Open →" converts.
export default function CreatePreview({ activeId, onActiveChange }) {
  const tabRefs = useRef([])
  const group = LIVE_PREVIEW_GROUPS.find((item) => item.id === activeId) || LIVE_PREVIEW_GROUPS[0]
  const selectedId = group.id
  const render = TOOLS[group.id] || TOOLS.colour
  const setActive = (id) => onActiveChange?.(id)
  const onTabKeyDown = (event, index) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const last = LIVE_PREVIEW_GROUPS.length - 1
    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? last
        : event.key === 'ArrowLeft'
          ? (index - 1 + LIVE_PREVIEW_GROUPS.length) % LIVE_PREVIEW_GROUPS.length
          : (index + 1) % LIVE_PREVIEW_GROUPS.length
    setActive(LIVE_PREVIEW_GROUPS[nextIndex].id)
    requestAnimationFrame(() => tabRefs.current[nextIndex]?.focus())
  }

  return (
    <div className="prev" data-hue={group.hue}>
      <div className="prev-chrome">
        <span className="prev-traffic" aria-hidden="true"><i /><i /><i /></span>
        <div className="prev-tabs" role="tablist" aria-label="Live UIL4B workspace previews">
          {LIVE_PREVIEW_GROUPS.map((g, index) => (
            <button
              key={g.id}
              ref={(node) => { tabRefs.current[index] = node }}
              type="button"
              role="tab"
              id={`home-preview-tab-${g.id}`}
              aria-controls="home-preview-panel"
              aria-selected={g.id === selectedId}
              data-active={g.id === selectedId}
              data-hue={g.hue}
              data-preview-id={g.id}
              className="prev-tab"
              tabIndex={g.id === selectedId ? 0 : -1}
              onClick={() => setActive(g.id)}
              onKeyDown={(event) => onTabKeyDown(event, index)}
            >
              <span className="fx-dot" aria-hidden="true" />
              <span className="prev-tab-label">{g.previewLabel}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="prev-addr">
        <span className="prev-url">
          <IconLock open={false} />
          <span className="prev-url-text">uil4b.com{group.previewHome}</span>
        </span>
        <Link className="prev-open" to={group.previewHome}>
          Open {group.previewLabel} <IconArrow />
        </Link>
      </div>
      <div
        className="prev-screen"
        id="home-preview-panel"
        role="tabpanel"
        aria-labelledby={`home-preview-tab-${group.id}`}
      >
        <div className="prev-anim" key={group.id}>
          {render()}
        </div>
      </div>
    </div>
  )
}
