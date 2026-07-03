import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

// Live, working micro-tools for the homepage Create section. Each CREATE system
// (colour, type, component, imagery, ai, icons) gets a genuinely interactive
// "mini version of the UI" so a visitor understands what UIL4B *does* in the
// first few seconds — the fastest cure for "confused shoppers have empty carts."
// Nothing here is faked: the palette really generates, the scale really scales,
// the prompt really assembles. The frame teases; the "Open …" link converts.
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
function IconSearch() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" />
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

/* ── 2 · Type — live modular scale ─────────────────────────────────────── */

const RATIOS = [
  { n: 'Minor 3rd', r: 1.2 },
  { n: 'Major 3rd', r: 1.25 },
  { n: 'Perfect 4th', r: 1.333 },
  { n: 'Golden', r: 1.618 },
]
const TYPE_ROWS = [
  { key: 'display', label: 'Display', step: 2, sample: 'Build faster' },
  { key: 'heading', label: 'Heading', step: 1, sample: 'Design the system' },
  { key: 'body', label: 'Body', step: 0, sample: 'Foundations that scale with you.' },
]

function TypeTool() {
  const [ri, setRi] = useState(2)
  const r = RATIOS[ri].r
  return (
    <div className="tt">
      <div className="tt-stage">
        {TYPE_ROWS.map((row) => {
          const px = Math.round(16 * r ** row.step)
          return (
            <div className="tt-line" key={row.key}>
              <span className="tt-meta">{row.label} · {px}px</span>
              <span
                className="tt-sample"
                style={{ fontSize: `clamp(15px, ${px / 16 * 0.9}rem, ${px}px)`, fontWeight: row.step ? 700 : 500 }}
              >
                {row.sample}
              </span>
            </div>
          )
        })}
      </div>
      <div className="prev-controls prev-controls-seg">
        {RATIOS.map((ratio, i) => (
          <button
            key={ratio.n}
            type="button"
            className="prev-seg-btn"
            data-active={i === ri}
            onClick={() => setRi(i)}
          >
            {ratio.n}
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
          <span className="prev-hint">Radius {radius}px</span>
          <input
            type="range"
            min="0"
            max="24"
            value={radius}
            aria-label="Corner radius"
            onChange={(e) => setRadius(Number(e.target.value))}
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

/* ── 4 · Imagery — gradient generator ──────────────────────────────────── */

function makeGrad() {
  const h1 = Math.floor(Math.random() * 360)
  const h2 = (h1 + 40 + Math.random() * 90) % 360
  const angle = [90, 120, 135, 165, 205][Math.floor(Math.random() * 5)]
  return { c1: hslToHex(h1, 72, 58), c2: hslToHex(h2, 74, 46), angle }
}

function ImageryTool() {
  const [g, setG] = useState(makeGrad)
  const [copied, flash] = useCopyFlash()
  const css = `linear-gradient(${g.angle}deg, ${g.c1}, ${g.c2})`
  return (
    <div className="im">
      <div className="im-canvas" style={{ backgroundImage: css }}>
        <button
          type="button"
          className="im-copy"
          aria-label="Copy CSS"
          onClick={() => flash('grad', `background: ${css};`)}
        >
          {copied === 'grad' ? 'Copied' : <><IconCopy /> CSS</>}
        </button>
      </div>
      <div className="prev-controls">
        <button type="button" className="prev-btn prev-btn-go" onClick={() => setG(makeGrad())}>
          <IconShuffle /> Generate
        </button>
        <code className="im-code">{`${g.angle}deg · ${g.c1} → ${g.c2}`}</code>
      </div>
    </div>
  )
}

/* ── 5 · AI — prompt builder ───────────────────────────────────────────── */

const AI_STYLES = ['Minimal', 'Bold', 'Playful', 'Corporate', 'Dark', 'Pastel']

function AiTool() {
  const [subject, setSubject] = useState('a fintech dashboard')
  const [picked, setPicked] = useState(() => new Set(['Minimal']))
  const [copied, flash] = useCopyFlash()
  const toggle = (s) =>
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(s)) next.delete(s)
      else next.add(s)
      return next
    })
  const styleList = AI_STYLES.filter((s) => picked.has(s)).map((s) => s.toLowerCase())
  const styleStr = styleList.length ? `${styleList.join(', ')} ` : ''
  const prompt = `Design ${styleStr}UI foundations for ${subject || '…'} — a colour palette, type scale and core components.`
  return (
    <div className="ap">
      <div className="ap-chips">
        {AI_STYLES.map((s) => (
          <button
            key={s}
            type="button"
            className="ap-chip"
            data-active={picked.has(s)}
            aria-pressed={picked.has(s)}
            onClick={() => toggle(s)}
          >
            {s}
          </button>
        ))}
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

/* ── 6 · Icons — searchable set ────────────────────────────────────────── */

const ICON_SET = [
  { n: 'search', kw: 'find magnify', p: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></> },
  { n: 'home', kw: 'house', p: <><path d="M4 11l8-6 8 6" /><path d="M6 10v9h12v-9" /></> },
  { n: 'heart', kw: 'like love', p: <path d="M12 20s-7-4.6-9.2-9A5 5 0 0 1 12 6a5 5 0 0 1 9.2 5c-2.2 4.4-9.2 9-9.2 9z" /> },
  { n: 'star', kw: 'favourite rate', p: <path d="M12 4l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4L4.2 9.7l5.4-.8z" /> },
  { n: 'user', kw: 'person account', p: <><circle cx="12" cy="9" r="3.5" /><path d="M5 20c0-3.6 3.1-5.5 7-5.5s7 1.9 7 5.5" /></> },
  { n: 'bell', kw: 'notify alert', p: <><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6z" /><path d="M10 20a2 2 0 0 0 4 0" /></> },
  { n: 'mail', kw: 'email message', p: <><rect x="3" y="6" width="18" height="12" rx="2" /><path d="m3 8 9 6 9-6" /></> },
  { n: 'calendar', kw: 'date schedule', p: <><rect x="4" y="6" width="16" height="14" rx="2" /><path d="M4 10h16M8 4v4M16 4v4" /></> },
  { n: 'image', kw: 'photo picture', p: <><rect x="4" y="5" width="16" height="14" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="m5 17 4.5-4 4 3.5 3-2.5L20 17" /></> },
  { n: 'lock', kw: 'secure private', p: <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></> },
  { n: 'cloud', kw: 'weather upload', p: <path d="M7 18a4 4 0 0 1 0-8 5 5 0 0 1 9.6-1.4A3.5 3.5 0 0 1 18 18z" /> },
  { n: 'bolt', kw: 'flash power fast', p: <path d="M13 3 5 14h5l-1 7 8-11h-5z" /> },
  { n: 'check', kw: 'done success', p: <><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16 9" /></> },
  { n: 'play', kw: 'video media', p: <path d="M8 5.5v13l11-6.5z" /> },
  { n: 'settings', kw: 'gear config', p: <><circle cx="12" cy="12" r="3" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" /></> },
  { n: 'globe', kw: 'world web language', p: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" /></> },
]

function IconsTool() {
  const [q, setQ] = useState('')
  const [copied, flash] = useCopyFlash()
  const term = q.trim().toLowerCase()
  const shown = term
    ? ICON_SET.filter((ic) => ic.n.includes(term) || ic.kw.includes(term))
    : ICON_SET
  return (
    <div className="ig-wrap">
      <label className="ig-search">
        <IconSearch />
        <input
          type="search"
          value={q}
          placeholder="Search 200k+ icons…"
          aria-label="Search icons"
          onChange={(e) => setQ(e.target.value)}
        />
      </label>
      {shown.length === 0 ? (
        <p className="ig-empty">No icons match “{q}”. Try “user”, “mail” or “star”.</p>
      ) : (
        <div className="ig-grid">
          {shown.map((ic) => (
            <button
              key={ic.n}
              type="button"
              className="ig-cell"
              data-copied={copied === ic.n}
              aria-label={`Copy ${ic.n} icon`}
              title={ic.n}
              onClick={() => flash(ic.n, ic.n)}
            >
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {ic.p}
              </svg>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── frame + router ────────────────────────────────────────────────────── */

const TOOLS = {
  colour: { tag: 'generator', render: () => <ColourTool /> },
  type: { tag: 'scale', render: () => <TypeTool /> },
  component: { tag: 'tokens', render: () => <ComponentTool /> },
  imagery: { tag: 'gradients', render: () => <ImageryTool /> },
  ai: { tag: 'prompts', render: () => <AiTool /> },
  icons: { tag: 'library', render: () => <IconsTool /> },
}

// The framed "mini app" wrapping whichever tool matches the active Create group.
// Keying the inner region on the group id remounts the tool on switch, giving a
// clean crossfade (and a fresh palette / gradient each visit).
export default function CreatePreview({ group }) {
  const tool = TOOLS[group.id] || TOOLS.colour
  return (
    <div className="prev" data-hue={group.hue}>
      <div className="prev-bar">
        <span className="prev-traffic" aria-hidden="true"><i /><i /><i /></span>
        <span className="prev-title">
          {group.label} <span className="prev-title-sep">·</span> {tool.tag}
        </span>
        <Link className="prev-open" to={group.home}>
          Open <span aria-hidden="true">&rarr;</span>
        </Link>
      </div>
      <div className="prev-screen">
        <div className="prev-anim" key={group.id}>
          {tool.render()}
        </div>
      </div>
    </div>
  )
}
