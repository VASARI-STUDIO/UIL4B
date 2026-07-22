import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import SnapSlider from './SnapSlider'
import { CREATE_GROUPS } from '../data/toolTree'

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

// Read the byte size of a base64 data URL without decoding it: every 4 base64
// chars carry 3 bytes, minus any `=` padding. Lets us measure encode output
// synchronously (no async toBlob), so the demo stays lint-clean.
function dataUrlBytes(url) {
  const i = url.indexOf(',') + 1
  if (i <= 0) return 0
  const len = url.length - i
  const pad = url.endsWith('==') ? 2 : url.endsWith('=') ? 1 : 0
  return Math.max(0, Math.round(len * 3 / 4) - pad)
}

// Encode a canvas as WebP; fall back to JPEG where WebP encode is unsupported
// (older Safari) so the savings demo still works everywhere.
function encode(canvas, quality) {
  let url = canvas.toDataURL('image/webp', quality)
  let ext = 'webp'
  if (!url.startsWith('data:image/webp')) { url = canvas.toDataURL('image/jpeg', quality); ext = 'jpg' }
  return { url, ext }
}

// A detailed sample image so PNG stays heavy and the WebP saving is dramatic:
// a vivid gradient, translucent orbs and fine noise. Drawn synchronously in a
// lazy state initializer (runs during render, which is allowed).
function makeSampleCanvas() {
  const w = 520, h = 340
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  const ctx = c.getContext('2d')
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
  return { canvas: c, name: 'sample-hero', w, h, png: c.toDataURL('image/png') }
}

const IMG_Q = [30, 50, 70, 85, 95]

function ImageryTool() {
  const [source, setSource] = useState(makeSampleCanvas)
  const [quality, setQuality] = useState(70)
  const [err, setErr] = useState('')

  const origBytes = useMemo(() => dataUrlBytes(source.png), [source])
  const comp = useMemo(() => {
    const { url, ext } = encode(source.canvas, quality / 100)
    return { url, ext, bytes: dataUrlBytes(url) }
  }, [source, quality])

  const saved = origBytes ? Math.max(0, Math.round((1 - comp.bytes / origBytes) * 100)) : 0

  const loadFile = (file) => {
    setErr('')
    if (!file || !file.type.startsWith('image/')) { setErr('Please choose an image file.'); return }
    const reader = new FileReader()
    reader.onload = () => {
      const im = new Image()
      im.onload = () => {
        const scale = Math.min(1, 640 / im.naturalWidth)
        const cw = Math.max(1, Math.round(im.naturalWidth * scale))
        const ch = Math.max(1, Math.round(im.naturalHeight * scale))
        const c = document.createElement('canvas')
        c.width = cw; c.height = ch
        c.getContext('2d').drawImage(im, 0, 0, cw, ch)
        setSource({ canvas: c, name: file.name.replace(/\.[^.]+$/, '') || 'image', w: cw, h: ch, png: c.toDataURL('image/png') })
      }
      im.onerror = () => setErr('That image could not be loaded.')
      im.src = reader.result
    }
    reader.onerror = () => setErr('That file could not be read.')
    reader.readAsDataURL(file)
  }

  return (
    <div className="imc">
      <div className="imc-stage">
        <img className="imc-shot" src={comp.url} alt="" />
        <div className="imc-save" aria-hidden="true">
          <span className="imc-save-pct">−{saved}%</span>
          <span className="imc-save-cap">smaller</span>
        </div>
      </div>
      <div className="imc-bars" role="group" aria-label="File size before and after">
        <div className="imc-bar-row">
          <span className="imc-bar-key">Original PNG</span>
          <span className="imc-bar-track"><span className="imc-bar-fill is-orig" style={{ width: '100%' }} /></span>
          <span className="imc-bar-val">{kb(origBytes)}</span>
        </div>
        <div className="imc-bar-row">
          <span className="imc-bar-key">Compressed</span>
          <span className="imc-bar-track">
            <span className="imc-bar-fill is-comp" style={{ width: `${origBytes ? Math.max(4, (comp.bytes / origBytes) * 100) : 0}%` }} />
          </span>
          <span className="imc-bar-val">{kb(comp.bytes)}</span>
        </div>
      </div>
      <label className="cm-slider imc-quality">
        <span className="prev-hint">Quality</span>
        <SnapSlider
          min={30}
          max={95}
          value={quality}
          defaultValue={70}
          snaps={IMG_Q}
          unit="%"
          ariaLabel="Compression quality"
          onChange={setQuality}
        />
      </label>
      {err && <p className="imc-err">{err}</p>}
      <div className="prev-controls">
        <a className="prev-btn prev-btn-go" href={comp.url} download={`${source.name}.${comp.ext}`}>
          <IconDown /> Download · {kb(comp.bytes)}
        </a>
        <label className="prev-btn imc-upload">
          <IconImage /> Try your image
          <input type="file" accept="image/*" onChange={(e) => loadFile(e.target.files?.[0])} style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }} />
        </label>
      </div>
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

// Short, tab-sized labels keyed by CREATE group id (the full labels are far too
// long for a browser tab strip).
const TAB_LABEL = {
  colour: 'Colour',
  icons: 'Icons',
  type: 'Type',
  component: 'Components',
  imagery: 'Imagery',
  ai: 'AI Studio',
}

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
export default function CreatePreview() {
  const [activeId, setActiveId] = useState(CREATE_GROUPS[0].id)
  const group = CREATE_GROUPS.find((g) => g.id === activeId) || CREATE_GROUPS[0]
  const render = TOOLS[group.id] || TOOLS.colour

  return (
    <div className="prev" data-hue={group.hue}>
      <div className="prev-chrome">
        <span className="prev-traffic" aria-hidden="true"><i /><i /><i /></span>
        <div className="prev-tabs" role="tablist" aria-label="UIL4B tools">
          {CREATE_GROUPS.map((g) => (
            <button
              key={g.id}
              type="button"
              role="tab"
              aria-selected={g.id === activeId}
              data-active={g.id === activeId}
              data-hue={g.hue}
              className="prev-tab"
              onClick={() => setActiveId(g.id)}
            >
              <span className="fx-dot" aria-hidden="true" />
              <span className="prev-tab-label">{TAB_LABEL[g.id] || g.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="prev-addr">
        <span className="prev-url">
          <IconLock open={false} />
          <span className="prev-url-text">uil4b.com{group.home}</span>
        </span>
        <Link className="prev-open" to={group.home}>
          Open <IconArrow />
        </Link>
      </div>
      <div className="prev-screen" aria-live="polite">
        <div className="prev-anim" key={group.id}>
          {render()}
        </div>
      </div>
    </div>
  )
}
