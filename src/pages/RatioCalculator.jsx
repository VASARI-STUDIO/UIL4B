import { useState, useMemo } from 'react'

// Common aspect ratios designers reach for, grouped loosely landscape → square → portrait.
const PRESETS = [
  { w: 16, h: 9 }, { w: 3, h: 2 }, { w: 4, h: 3 }, { w: 21, h: 9 },
  { w: 1, h: 1 },
  { w: 4, h: 5 }, { w: 2, h: 3 }, { w: 3, h: 4 }, { w: 9, h: 16 },
]

function gcd(a, b) { return b === 0 ? a : gcd(b, Math.abs(a % b)) }
function round(n) { return Math.round(n * 100) / 100 }

export default function RatioCalculator({ onCopy }) {
  // Aspect ratio (W:H) + one known dimension → compute the other.
  const [rw, setRw] = useState('16')
  const [rh, setRh] = useState('9')
  const [side, setSide] = useState('width') // which dimension the user is entering
  const [known, setKnown] = useState('1920')

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

  const applyPreset = (p) => { setRw(String(p.w)); setRh(String(p.h)) }
  const copy = (v) => onCopy?.(v)

  return (
    <div className="sec">
      <div className="sec-h">
        <div className="sec-h-eyebrow">Imagery</div>
        <h1>Aspect Ratio Calculator</h1>
        <p>Lock an aspect ratio, enter a single dimension, and get the matching size — with a live preview of the shape.</p>
      </div>

      <div className="rc-grid">
        {/* Controls */}
        <div className="card rc-panel">
          <div className="seg-label">Aspect ratio</div>
          <div className="rc-presets">
            {PRESETS.map(p => {
              const active = Math.round(ratioW) === p.w && Math.round(ratioH) === p.h
              return (
                <button key={`${p.w}x${p.h}`} type="button" className={`pt-t${active ? ' on' : ''}`} onClick={() => applyPreset(p)}>
                  {p.w}:{p.h}
                </button>
              )
            })}
          </div>

          <div className="rc-ratio-row">
            <input type="number" min="0" value={rw} onChange={e => setRw(e.target.value)} aria-label="Ratio width" />
            <span className="rc-colon">:</span>
            <input type="number" min="0" value={rh} onChange={e => setRh(e.target.value)} aria-label="Ratio height" />
            {simplified && <span className="rc-simplified">= {simplified}</span>}
          </div>

          <div className="seg-label" style={{ marginTop: 18 }}>I know the…</div>
          <div className="row" style={{ gap: 6 }}>
            <button type="button" className={`pt-t${side === 'width' ? ' on' : ''}`} onClick={() => setSide('width')}>Width</button>
            <button type="button" className={`pt-t${side === 'height' ? ' on' : ''}`} onClick={() => setSide('height')}>Height</button>
          </div>
          <input
            type="number" min="0" value={known} onChange={e => setKnown(e.target.value)}
            aria-label={`Known ${side} in pixels`} placeholder={`${side} in px`}
            style={{ width: '100%', marginTop: 10 }}
          />

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
          <div className="seg-label">Shape preview</div>
          <div className="rc-vis-stage">
            {validRatio
              ? <div className="rc-vis-box" style={{ width: vis.w, height: vis.h }}><span>{simplified}</span></div>
              : <div className="rc-vis-empty">Enter a valid ratio</div>}
          </div>
        </div>
      </div>

      {/* Reverse */}
      <div className="card rc-panel" style={{ marginTop: 16 }}>
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
