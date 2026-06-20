import { useState } from 'react'
import { NavLink } from 'react-router-dom'

// Small, fully-functional mini-tools embedded at the top of a category
// dashboard so visitors get instant value before opening the full tool.
// Returns null for categories that don't have one.

function gcd(a, b) { return b ? gcd(b, a % b) : a }

const RATIO_PRESETS = [
  { label: '16:9', w: 1920, h: 1080 },
  { label: '4:3', w: 1600, h: 1200 },
  { label: '1:1', w: 1080, h: 1080 },
  { label: '21:9', w: 2560, h: 1080 },
  { label: '3:2', w: 1500, h: 1000 },
]

function RatioMini() {
  const [w, setW] = useState(1920)
  const [h, setH] = useState(1080)
  const valid = w > 0 && h > 0
  const g = valid ? gcd(Math.round(w), Math.round(h)) : 1
  const ratio = valid ? `${Math.round(w) / g}:${Math.round(h) / g}` : '—'

  return (
    <div className="cmt">
      <div className="cmt-head">
        <span className="cmt-title">Aspect ratio</span>
        <NavLink to="/ratio" className="cmt-link">Full calculator →</NavLink>
      </div>
      <div className="cmt-ratio">
        <input type="number" min="1" value={w} onChange={e => setW(Math.max(0, +e.target.value))} aria-label="Width" />
        <span className="cmt-ratio-op">×</span>
        <input type="number" min="1" value={h} onChange={e => setH(Math.max(0, +e.target.value))} aria-label="Height" />
        <span className="cmt-ratio-op">=</span>
        <span className="cmt-ratio-out">{ratio}</span>
      </div>
      <div className="cmt-chips">
        {RATIO_PRESETS.map(p => (
          <button key={p.label} type="button" className={`cmt-chip${w === p.w && h === p.h ? ' is-active' : ''}`} onClick={() => { setW(p.w); setH(p.h) }}>{p.label}</button>
        ))}
      </div>
    </div>
  )
}

const QUICK_EMOJI = ['😀', '🎨', '🚀', '❤️', '✅', '⭐', '🔥', '💡', '📱', '🎯', '✨', '👍', '📊', '🌙', '⚡', '💎']

function IconEmojiMini({ onCopy, toast }) {
  const [copied, setCopied] = useState(null)

  const copy = (em) => {
    if (onCopy) onCopy(em)
    else if (navigator.clipboard) navigator.clipboard.writeText(em).then(() => toast?.('Copied'))
    setCopied(em)
    setTimeout(() => setCopied(c => (c === em ? null : c)), 900)
  }

  return (
    <div className="cmt">
      <div className="cmt-head">
        <span className="cmt-title">Quick emoji</span>
        <NavLink to="/emoji" className="cmt-link">Full library →</NavLink>
      </div>
      <div className="cmt-emoji-grid">
        {QUICK_EMOJI.map(em => (
          <button key={em} type="button" className={`cmt-emoji${copied === em ? ' is-copied' : ''}`} onClick={() => copy(em)} title={`Copy ${em}`} aria-label={`Copy ${em}`}>
            {copied === em ? '✓' : em}
          </button>
        ))}
      </div>
    </div>
  )
}

function ShadowMini({ onCopy, toast }) {
  const [y, setY] = useState(12)
  const [blur, setBlur] = useState(28)
  const [spread, setSpread] = useState(-6)
  const [alpha, setAlpha] = useState(45)

  const shadow = `0 ${y}px ${blur}px ${spread}px rgba(0,0,0,${(alpha / 100).toFixed(2)})`
  const css = `box-shadow: ${shadow};`

  const copy = () => {
    if (onCopy) onCopy(css)
    else if (navigator.clipboard) navigator.clipboard.writeText(css).then(() => toast?.('Copied CSS'))
  }

  const sliders = [
    { label: 'Y', value: y, set: setY, min: 0, max: 48 },
    { label: 'Blur', value: blur, set: setBlur, min: 0, max: 80 },
    { label: 'Spread', value: spread, set: setSpread, min: -24, max: 24 },
    { label: 'Alpha', value: alpha, set: setAlpha, min: 0, max: 100 },
  ]

  return (
    <div className="cmt">
      <div className="cmt-head">
        <span className="cmt-title">Box shadow</span>
        <NavLink to="/box-shadow" className="cmt-link">Full tool →</NavLink>
      </div>
      <div className="cmt-shadow">
        <div className="cmt-shadow-stage">
          <div className="cmt-shadow-box" style={{ boxShadow: shadow }} />
        </div>
        <div className="cmt-shadow-controls">
          {sliders.map(s => (
            <label key={s.label} className="cmt-slider">
              <span>{s.label}</span>
              <input type="range" min={s.min} max={s.max} value={s.value} onChange={e => s.set(+e.target.value)} />
            </label>
          ))}
          <button type="button" className="cmt-action cmt-action-full" onClick={copy}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
            Copy CSS
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CategoryMiniTool({ categoryId, onCopy, toast }) {
  if (categoryId === 'imagery') return <RatioMini />
  if (categoryId === 'icons-emoji') return <IconEmojiMini onCopy={onCopy} toast={toast} />
  if (categoryId === 'ui-builder') return <ShadowMini onCopy={onCopy} toast={toast} />
  return null
}
