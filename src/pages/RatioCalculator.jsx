import { useState, useMemo } from 'react'

// Presets grouped by intent. "Ratios" carry only a shape (w:h); "Devices" and
// "Screens" carry real pixel dimensions, so picking one fills the calculator
// with an actual size you can build against — not just a proportion.
const PRESET_GROUPS = [
  {
    label: 'Ratios',
    items: [
      { name: '16:9', w: 16, h: 9 }, { name: '3:2', w: 3, h: 2 },
      { name: '4:3', w: 4, h: 3 }, { name: '21:9', w: 21, h: 9 },
      { name: '1:1', w: 1, h: 1 }, { name: '4:5', w: 4, h: 5 },
      { name: '2:3', w: 2, h: 3 }, { name: '3:4', w: 3, h: 4 },
      { name: '9:16', w: 9, h: 16 },
    ],
  },
  {
    label: 'Devices',
    items: [
      { name: 'iPhone 16', w: 1179, h: 2556 },
      { name: 'iPhone 16 Pro Max', w: 1290, h: 2796 },
      { name: 'iPhone SE', w: 750, h: 1334 },
      { name: 'Pixel 9', w: 1080, h: 2424 },
      { name: 'iPad Pro 11″', w: 1668, h: 2388 },
      { name: 'iPad 10.9″', w: 1640, h: 2360 },
      { name: 'MacBook Air 13″', w: 2560, h: 1664 },
      { name: 'MacBook Pro 14″', w: 3024, h: 1964 },
      { name: 'Apple Watch 45mm', w: 396, h: 484 },
    ],
  },
  {
    label: 'Screens',
    items: [
      { name: 'Laptop · 768p', w: 1366, h: 768 },
      { name: 'Desktop · 1080p', w: 1920, h: 1080 },
      { name: 'QHD · 1440p', w: 2560, h: 1440 },
      { name: '4K UHD', w: 3840, h: 2160 },
      { name: 'Ultrawide', w: 3440, h: 1440 },
      { name: 'Browser window', w: 1280, h: 720 },
      { name: 'Browser + left nav', w: 1024, h: 720 },
    ],
  },
]

function gcd(a, b) { return b === 0 ? a : gcd(b, Math.abs(a % b)) }
function round(n) { return Math.round(n * 100) / 100 }

export default function RatioCalculator({ onCopy }) {
  // Aspect ratio (W:H) + one known dimension → compute the other.
  const [rw, setRw] = useState('1920')
  const [rh, setRh] = useState('1080')
  const [side, setSide] = useState('width') // which dimension the user is entering
  const [known, setKnown] = useState('1920')
  const [group, setGroup] = useState('Screens') // active preset category

  const ratioW = Number(rw) || 0
  const ratioH = Number(rh) || 0
  const validRatio = ratioW > 0 && ratioH > 0

  const out = useMemo(() => {
    const k = Number(known) || 0
    if (!validRatio || k <= 0) return null
    return side === 'width'
      ? { width: k, height: round(k * ratioH / ratioW) }
      : { width: round(k * ratioW / ratioH), height: k }
  }, [known, side, ratioW, ratioH, validRatio])

  const simplified = useMemo(() => {
    if (!validRatio) return null
    const a = Math.round(ratioW), b = Math.round(ratioH)
    const g = gcd(a, b) || 1
    return `${a / g}:${b / g}`
  }, [ratioW, ratioH, validRatio])

  const orientation = validRatio ? (ratioW > ratioH ? 'Landscape' : ratioW < ratioH ? 'Portrait' : 'Square') : null

  // Reverse: from a known W × H, derive the simplified ratio.
  const [pw, setPw] = useState('')
  const [ph, setPh] = useState('')
  const fromDims = useMemo(() => {
    const a = Math.round(Number(pw) || 0), b = Math.round(Number(ph) || 0)
    if (a <= 0 || b <= 0) return null
    const g = gcd(a, b) || 1
    return { ratio: `${a / g}:${b / g}`, decimal: round(a / b) }
  }, [pw, ph])

  // Visualiser box — constrained so extreme ratios still fit the panel.
  const vis = useMemo(() => {
    if (!validRatio) return { w: 0, h: 0 }
    const MAX = 240
    const a = ratioW / ratioH
    return a >= 1 ? { w: MAX, h: Math.round(MAX / a) } : { w: Math.round(MAX * a), h: MAX }
  }, [ratioW, ratioH, validRatio])

  // Ratio presets only lock the shape; pixel presets (Devices/Screens) also
  // seed the known dimension with the real size so the result is immediately live.
  const applyPreset = (p) => {
    setRw(String(p.w))
    setRh(String(p.h))
    if (p.w > 100 || p.h > 100) {
      setSide('width')
      setKnown(String(p.w))
    }
  }

  const flip = () => { setRw(rh); setRh(rw) }
  const copy = (v) => onCopy?.(v)

  const activeGroup = PRESET_GROUPS.find(g => g.label === group) || PRESET_GROUPS[0]

  return (
    <div className="sec">
      <div className="sec-h">
        <div className="sec-h-eyebrow">Imagery</div>
        <h1>Aspect Ratio Calculator</h1>
        <p>Pick a device, screen, or ratio — or type your own — enter one dimension, and get the exact matching size with a live preview of the shape.</p>
      </div>

      <div className="rc-grid">
        {/* Controls */}
        <div className="card rc-panel">
          <div className="rc-tabs">
            {PRESET_GROUPS.map(g => (
              <button
                key={g.label}
                type="button"
                className={`rc-tab${group === g.label ? ' on' : ''}`}
                onClick={() => setGroup(g.label)}
              >
                {g.label}
              </button>
            ))}
          </div>
          <div className="rc-presets">
            {activeGroup.items.map(p => {
              const active = Math.round(ratioW) === p.w && Math.round(ratioH) === p.h
              return (
                <button key={p.name} type="button" className={`pt-t${active ? ' on' : ''}`} onClick={() => applyPreset(p)}>
                  {p.name}
                </button>
              )
            })}
          </div>

          <div className="rc-field">
            <div className="seg-label">Aspect ratio</div>
            <div className="rc-ratio-row">
              <input type="number" min="0" value={rw} onChange={e => setRw(e.target.value)} aria-label="Ratio width" />
              <button type="button" className="rc-flip" onClick={flip} title="Swap width and height" aria-label="Swap width and height">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M8 3 4 7l4 4" /><path d="M4 7h16" /><path d="m16 21 4-4-4-4" /><path d="M20 17H4" />
                </svg>
              </button>
              <input type="number" min="0" value={rh} onChange={e => setRh(e.target.value)} aria-label="Ratio height" />
              {simplified && <span className="rc-simplified">= {simplified}</span>}
            </div>
          </div>

          <div className="rc-field">
            <div className="seg-label">I know the…</div>
            <div className="rc-known">
              <div className="row" style={{ gap: 6 }}>
                <button type="button" className={`pt-t${side === 'width' ? ' on' : ''}`} onClick={() => setSide('width')}>Width</button>
                <button type="button" className={`pt-t${side === 'height' ? ' on' : ''}`} onClick={() => setSide('height')}>Height</button>
              </div>
              <input
                type="number" min="0" value={known} onChange={e => setKnown(e.target.value)}
                aria-label={`Known ${side} in pixels`} placeholder={`${side} in px`}
              />
            </div>
          </div>

          {out && (
            <div className="rc-result">
              <div className="rc-result-dims">
                <button className="rc-dim" onClick={() => copy(String(out.width))} title="Copy width">{out.width}<small>W</small></button>
                <span className="rc-times">×</span>
                <button className="rc-dim" onClick={() => copy(String(out.height))} title="Copy height">{out.height}<small>H</small></button>
              </div>
              <button className="btn btn-s" onClick={() => copy(`${out.width} × ${out.height}`)}>Copy size</button>
            </div>
          )}
        </div>

        {/* Visualiser */}
        <div className="card rc-panel rc-vis-panel">
          <div className="rc-vis-head">
            <div className="seg-label">Shape preview</div>
            {orientation && <span className="rc-vis-tag">{orientation}</span>}
          </div>
          <div className="rc-vis-stage">
            {validRatio
              ? (
                <div className="rc-vis-box" style={{ width: vis.w, height: vis.h }}>
                  <span className="rc-vis-ratio">{simplified}</span>
                  {out && <span className="rc-vis-dims">{out.width} × {out.height}</span>}
                </div>
              )
              : <div className="rc-vis-empty">Enter a valid ratio</div>}
          </div>
        </div>
      </div>

      {/* Reverse */}
      <div className="card rc-panel rc-reverse">
        <div className="seg-label">Find the ratio from a size</div>
        <div className="rc-ratio-row">
          <input type="number" min="0" value={pw} onChange={e => setPw(e.target.value)} placeholder="width" aria-label="Width in pixels" />
          <span className="rc-colon">×</span>
          <input type="number" min="0" value={ph} onChange={e => setPh(e.target.value)} placeholder="height" aria-label="Height in pixels" />
          {fromDims && (
            <button className="rc-simplified rc-simplified-btn" onClick={() => copy(fromDims.ratio)} title="Copy ratio">
              = {fromDims.ratio} <small>({fromDims.decimal})</small>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
