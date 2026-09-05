import { useEffect, useMemo, useRef, useState } from 'react'

// Aspect & Resolution Calculator — start from ANY single piece of information
// (a device, a screen, a social format, a ratio, one dimension, or a full size)
// and get everything else: the matching dimensions, simplified + nearest
// standard ratio, PPI, and the diagonal in pixels and inches.
//
// Preset sources are dropdowns (not pill walls) so each option can carry a
// mini box drawn at the option's true aspect ratio plus its exact resolution,
// PPI and diagonal. Devices list REAL panel resolutions and manufacturer PPI.

function gcd(a, b) { return b === 0 ? a : gcd(b, Math.abs(a % b)) }
function round(n) { return Math.round(n * 100) / 100 }
function round1(n) { return Math.round(n * 10) / 10 }

// GCD-reduced ratios whose conventional name is the unreduced form — designers
// say "16:10" and "21:9", never "8:5" or "7:3".
const CANONICAL = { '8:5': '16:10', '5:8': '10:16', '7:3': '21:9', '3:7': '9:21' }
function ratioLabel(w, h) {
  const g = gcd(w, h) || 1
  const r = `${w / g}:${h / g}`
  return CANONICAL[r] || r
}

// ── Preset data ─────────────────────────────────────────────────────────────
// Devices: physical pixel resolution + manufacturer PPI (diagonal is derived,
// so it always agrees with the numbers shown).
const DEVICES = [
  { name: 'iPhone 16', w: 1179, h: 2556, ppi: 460 },
  { name: 'iPhone 16 Pro', w: 1206, h: 2622, ppi: 460 },
  { name: 'iPhone 16 Pro Max', w: 1320, h: 2868, ppi: 460 },
  { name: 'iPhone SE (3rd gen)', w: 750, h: 1334, ppi: 326 },
  { name: 'Google Pixel 9', w: 1080, h: 2424, ppi: 422 },
  { name: 'Google Pixel 9 Pro XL', w: 1344, h: 2992, ppi: 486 },
  { name: 'Samsung Galaxy S24', w: 1080, h: 2340, ppi: 416 },
  { name: 'Samsung Galaxy S24 Ultra', w: 1440, h: 3120, ppi: 505 },
  { name: 'iPad Pro 11″ (M4)', w: 1668, h: 2420, ppi: 264 },
  { name: 'iPad 10.9″ (10th gen)', w: 1640, h: 2360, ppi: 264 },
  { name: 'MacBook Air 13″', w: 2560, h: 1664, ppi: 224 },
  { name: 'MacBook Pro 14″', w: 3024, h: 1964, ppi: 254 },
  { name: 'MacBook Pro 16″', w: 3456, h: 2234, ppi: 254 },
  { name: 'Apple Watch Series 10 (46mm)', w: 416, h: 496, ppi: 326 },
]

// Screens: resolution + the diagonal it most commonly ships at; PPI is derived
// from that pairing and labelled with the size so it's honest, not absolute.
const SCREENS = [
  { name: 'HD laptop · 1366×768', w: 1366, h: 768, diag: 15.6 },
  { name: 'Full HD · 1080p', w: 1920, h: 1080, diag: 24 },
  { name: 'QHD · 1440p', w: 2560, h: 1440, diag: 27 },
  { name: '4K UHD', w: 3840, h: 2160, diag: 27 },
  { name: '5K', w: 5120, h: 2880, diag: 27 },
  { name: 'Ultrawide QHD', w: 3440, h: 1440, diag: 34 },
  { name: 'Super ultrawide', w: 5120, h: 1440, diag: 49 },
  { name: '8K UHD', w: 7680, h: 4320, diag: 65 },
]

// Social formats: the platform-recommended export size. Social assets are
// resolution-based; 72 PPI is the standard export density they assume.
const SOCIAL = [
  { name: 'Instagram post (portrait)', w: 1080, h: 1350 },
  { name: 'Instagram post (square)', w: 1080, h: 1080 },
  { name: 'Instagram Reel / Story', w: 1080, h: 1920 },
  { name: 'TikTok video', w: 1080, h: 1920 },
  { name: 'YouTube video', w: 1920, h: 1080 },
  { name: 'YouTube thumbnail', w: 1280, h: 720 },
  { name: 'YouTube channel banner', w: 2560, h: 1440 },
  { name: 'X / Twitter post image', w: 1600, h: 900 },
  { name: 'X / Twitter header', w: 1500, h: 500 },
  { name: 'LinkedIn profile banner', w: 1584, h: 396 },
  { name: 'Facebook cover photo', w: 820, h: 312 },
  { name: 'Pinterest pin', w: 1000, h: 1500 },
  { name: 'Open Graph / link preview', w: 1200, h: 630 },
]

// Ratios: each carries its standard, real-world resolutions so picking a ratio
// immediately unlocks a "standard sizes" dropdown (16:9 → 720p…8K, etc).
const RATIOS = [
  { name: '16:9', w: 16, h: 9, use: 'Video · screens', sizes: [[1280, 720, 'HD 720p'], [1366, 768, 'WXGA'], [1600, 900, 'HD+'], [1920, 1080, 'Full HD 1080p'], [2560, 1440, 'QHD 1440p'], [3840, 2160, '4K UHD'], [7680, 4320, '8K UHD']] },
  { name: '16:10', w: 16, h: 10, use: 'Laptop displays', sizes: [[1280, 800, 'WXGA'], [1440, 900, 'WXGA+'], [1920, 1200, 'WUXGA'], [2560, 1600, 'WQXGA'], [2880, 1800, 'Retina 15″']] },
  { name: '4:3', w: 4, h: 3, use: 'Classic screens · iPad', sizes: [[800, 600, 'SVGA'], [1024, 768, 'XGA'], [1600, 1200, 'UXGA'], [2048, 1536, 'QXGA']] },
  { name: '3:2', w: 3, h: 2, use: 'Photography · Surface', sizes: [[1080, 720, 'Web photo'], [2160, 1440, 'Surface'], [3000, 2000, '6 MP photo'], [6000, 4000, '24 MP photo']] },
  { name: '21:9', w: 21, h: 9, use: 'Ultrawide · cinema', sizes: [[2560, 1080, 'UW Full HD'], [3440, 1440, 'UW QHD'], [5120, 2160, '5K2K']] },
  { name: '1:1', w: 1, h: 1, use: 'Square · avatars', sizes: [[400, 400, 'Avatar'], [1080, 1080, 'Instagram square'], [2048, 2048, 'Hi-res square']] },
  { name: '4:5', w: 4, h: 5, use: 'Instagram portrait', sizes: [[864, 1080, 'Compact'], [1080, 1350, 'Instagram post'], [2048, 2560, 'Hi-res']] },
  { name: '2:3', w: 2, h: 3, use: 'Pinterest · print', sizes: [[1000, 1500, 'Pinterest pin'], [1200, 1800, '4×6″ print @300'], [4000, 6000, '24 MP portrait']] },
  { name: '3:4', w: 3, h: 4, use: 'Portrait photo', sizes: [[768, 1024, 'XGA portrait'], [1536, 2048, 'iPad portrait'], [3024, 4032, '12 MP photo']] },
  { name: '9:16', w: 9, h: 16, use: 'Stories · Reels', sizes: [[720, 1280, 'HD vertical'], [1080, 1920, 'Reel / Story / TikTok'], [2160, 3840, '4K vertical']] },
  { name: '1.91:1', w: 1.91, h: 1, use: 'Open Graph · ads', sizes: [[1200, 630, 'Open Graph']] },
]

// Nearest-standard matcher: lets the reverse finder answer "1179 × 2556" with
// "≈ 9:19.5" instead of the technically-exact-but-useless 131:284.
const COMMON_RATIOS = [
  ['32:9', 32 / 9], ['2.39:1', 2.39], ['21:9', 21 / 9], ['20:9', 20 / 9],
  ['19.5:9', 19.5 / 9], ['19:9', 19 / 9], ['18:9', 2], ['1.91:1', 1.91],
  ['16:9', 16 / 9], ['5:3', 5 / 3], ['16:10', 1.6], ['3:2', 1.5],
  ['7:5', 1.4], ['4:3', 4 / 3], ['5:4', 1.25], ['1:1', 1],
]

function nearestCommon(w, h) {
  if (!(w > 0 && h > 0)) return null
  const a = w >= h ? w / h : h / w
  let best = null
  for (const [label, val] of COMMON_RATIOS) {
    const d = Math.abs(a - val) / val
    if (!best || d < best.d) best = { label, d }
  }
  const label = w < h ? best.label.split(':').reverse().join(':') : best.label
  return { label, off: best.d * 100 }
}

// Precomputed dropdown options (deterministic, so module scope is safe).
const DEVICE_OPTIONS = DEVICES.map(d => ({
  ...d,
  meta: `${d.w} × ${d.h} · ${d.ppi} PPI · ${round1(Math.hypot(d.w, d.h) / d.ppi)}″`,
}))
const SCREEN_OPTIONS = SCREENS.map(s => {
  const ppi = Math.round(Math.hypot(s.w, s.h) / s.diag)
  return { ...s, ppi, meta: `${s.w} × ${s.h} · ${ratioLabel(s.w, s.h)} · ${ppi} PPI @ ${s.diag}″` }
})
const SOCIAL_OPTIONS = SOCIAL.map(s => (
  { ...s, ppi: 72, meta: `${s.w} × ${s.h} · ${ratioLabel(s.w, s.h)} · 72 PPI export` }
))
const RATIO_OPTIONS = RATIOS.map(r => ({ ...r, meta: r.use }))

const TABS = ['Ratios', 'Devices', 'Screens', 'Social']

// A tiny box drawn at the option's true aspect ratio — the visual cue that
// makes the dropdowns scannable without reading a single number.
function RatioThumb({ w, h, big }) {
  const MAXW = big ? 44 : 22
  const MAXH = big ? 30 : 15
  const a = w / h
  const bw = a >= MAXW / MAXH ? MAXW : Math.max(4, Math.round(MAXH * a))
  const bh = a >= MAXW / MAXH ? Math.max(4, Math.round(MAXW / a)) : MAXH
  return (
    <span className={`arc-thumb${big ? ' arc-thumb-big' : ''}`} aria-hidden="true">
      <span className="arc-thumb-box" style={{ width: bw, height: bh }} />
    </span>
  )
}

// Custom dropdown: a native <select> can't render the aspect-ratio thumbnails,
// so this is a minimal listbox — click/Escape/outside-click, nothing exotic.
function PresetSelect({ value, placeholder, options, onPick }) {
  const [openSel, setOpenSel] = useState(false)
  const wrap = useRef(null)

  useEffect(() => {
    if (!openSel) return undefined
    const onDoc = (e) => { if (wrap.current && !wrap.current.contains(e.target)) setOpenSel(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpenSel(false) }
    document.addEventListener('pointerdown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [openSel])

  const sel = options.find(o => o.name === value)
  return (
    <div className="arc-select" ref={wrap}>
      <button
        type="button" className="arc-select-btn"
        aria-haspopup="listbox" aria-expanded={openSel}
        onClick={() => setOpenSel(v => !v)}
      >
        {sel
          ? (
            <span className="arc-opt-row">
              <RatioThumb w={sel.w} h={sel.h} />
              <span className="arc-opt-text">
                <span className="arc-opt-name">{sel.name}</span>
                <span className="arc-opt-meta">{sel.meta}</span>
              </span>
            </span>
          )
          : <span className="arc-select-ph">{placeholder}</span>}
        <svg className="arc-select-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
      </button>
      {openSel && (
        <div className="arc-select-pop" role="listbox" aria-label={placeholder}>
          {options.map(o => (
            <button
              key={o.name} type="button" role="option" aria-selected={o.name === value}
              className={`arc-opt${o.name === value ? ' on' : ''}`}
              onClick={() => { onPick(o); setOpenSel(false) }}
            >
              <span className="arc-opt-row">
                <RatioThumb w={o.w} h={o.h} />
                <span className="arc-opt-text">
                  <span className="arc-opt-name">{o.name}</span>
                  <span className="arc-opt-meta">{o.meta}</span>
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function RatioCalculator({ onCopy }) {
  // Aspect ratio (W:H) + one known dimension → everything else.
  const [rw, setRw] = useState('1920')
  const [rh, setRh] = useState('1080')
  const [side, setSide] = useState('width') // 'width' | 'height' | 'both' — what the user knows
  const [known, setKnown] = useState('1920')
  const [ppi, setPpi] = useState('92') // Full HD @ 24″ default, editable/clearable
  const [tab, setTab] = useState('Ratios')

  const ratioW = Number(rw) || 0
  const ratioH = Number(rh) || 0
  const validRatio = ratioW > 0 && ratioH > 0

  // In 'both' mode the ratio inputs hold the full pixel size and `known` tracks
  // the width, so the width branch below returns the typed size unchanged.
  const out = useMemo(() => {
    const k = Number(known) || 0
    if (!validRatio || k <= 0) return null
    return side === 'height'
      ? { width: round(k * ratioW / ratioH), height: k }
      : { width: k, height: round(k * ratioH / ratioW) }
  }, [known, side, ratioW, ratioH, validRatio])

  const simplified = useMemo(() => {
    if (!validRatio) return null
    if (!Number.isInteger(ratioW) || !Number.isInteger(ratioH)) return `${round(ratioW / ratioH)}:1`
    return ratioLabel(ratioW, ratioH)
  }, [ratioW, ratioH, validRatio])

  // "131:284" is exact but unhelpful — always offer the nearest standard too.
  const nearest = useMemo(
    () => (validRatio ? nearestCommon(ratioW, ratioH) : null),
    [ratioW, ratioH, validRatio],
  )

  const orientation = validRatio ? (ratioW > ratioH ? 'Landscape' : ratioW < ratioH ? 'Portrait' : 'Square') : null

  // Diagonal — in pixels always; in inches (plus physical size) once PPI is known.
  const ppiNum = Number(ppi) || 0
  const diag = useMemo(() => {
    if (!out) return null
    const px = Math.round(Math.hypot(out.width, out.height))
    return {
      px,
      inches: ppiNum > 0 ? round1(px / ppiNum) : null,
      physW: ppiNum > 0 ? round1(out.width / ppiNum) : null,
      physH: ppiNum > 0 ? round1(out.height / ppiNum) : null,
    }
  }, [out, ppiNum])

  // Know the diagonal instead of the PPI? Typing it solves PPI from the
  // current pixel size, and everything downstream lights up.
  const onDiagInput = (v) => {
    const d = Number(v) || 0
    if (out && d > 0) setPpi(String(Math.round(Math.hypot(out.width, out.height) / d)))
  }

  // Switching to "Width × height" (the old reverse finder) seeds the size
  // inputs from the current result so the numbers carry over, and keeps the
  // known-width invariant (rw === known) that makes `out` echo the typed size.
  const pickSide = (s) => {
    if (s === 'both') {
      if (out) {
        setRw(String(out.width))
        setRh(String(out.height))
        setKnown(String(out.width))
      } else {
        setKnown(rw)
      }
    }
    setSide(s)
  }

  // Visualiser box — constrained so extreme ratios still fit the panel.
  const vis = useMemo(() => {
    if (!validRatio) return { w: 0, h: 0 }
    const MAX = 240
    const a = ratioW / ratioH
    return a >= 1 ? { w: MAX, h: Math.round(MAX / a) } : { w: Math.round(MAX * a), h: MAX }
  }, [ratioW, ratioH, validRatio])

  // Pixel presets (device/screen/social) seed ratio + known + PPI in one click;
  // ratio presets only lock the shape and leave the user's numbers alone.
  const applyPixel = (p) => {
    setRw(String(p.w))
    setRh(String(p.h))
    setSide(s => (s === 'both' ? s : 'width')) // both-mode already shows the full size
    setKnown(String(p.w))
    if (p.ppi) setPpi(String(p.ppi))
  }
  const applyRatio = (r) => {
    if (side === 'both' && out) {
      // The user typed a size — keep their width and re-derive the height.
      const h = Math.max(1, Math.round(out.width * r.h / r.w))
      setRw(String(out.width))
      setRh(String(h))
      setKnown(String(out.width))
      return
    }
    setRw(String(r.w))
    setRh(String(r.h))
  }

  const flip = () => {
    setRw(rh)
    setRh(rw)
    if (side === 'both') setKnown(rh)
  }
  const copy = (v) => onCopy?.(v)

  // Dropdown selections are DERIVED from the live values, so hand-editing the
  // inputs automatically deselects a preset that no longer matches.
  const pixelValue = (opts) => opts.find(o => o.w === Number(rw) && o.h === Number(rh) && (!out || o.w === out.width))?.name
  const ratioMatch = RATIOS.find(r => r.name === simplified || (Number(rw) === r.w && Number(rh) === r.h))
  const sizeOptions = useMemo(() => {
    if (!ratioMatch) return []
    return ratioMatch.sizes.map(([w, h, label]) => ({ name: `${w} × ${h}`, meta: label, w, h }))
  }, [ratioMatch])
  const sizeValue = out ? sizeOptions.find(o => o.w === out.width && o.h === out.height)?.name : undefined

  return (
    <div className="sec">
      <div className="sec-h">
        {/* NO TAXONOMY EYEBROW. It read "Imagery" at y=102 — the name of the
            Create group the visitor clicked through to get here, above an h1
            that names the tool. #surface-headers-read-as-ai. */}
        <h1>Aspect &amp; Resolution Calculator</h1>
        <p>Start from anything — a device, a screen, a social format, a ratio, or a couple of pixels — and get the matching dimensions, simplified ratio, PPI and diagonal.</p>
      </div>

      <div className="rc-grid">
        {/* Controls */}
        <div className="card rc-panel">
          <div className="rc-tabs">
            {TABS.map(t => (
              <button
                key={t} type="button"
                className={`rc-tab${tab === t ? ' on' : ''}`}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === 'Devices' && (
            <PresetSelect
              placeholder="Pick a device…" options={DEVICE_OPTIONS}
              value={pixelValue(DEVICE_OPTIONS)} onPick={applyPixel}
            />
          )}
          {tab === 'Screens' && (
            <PresetSelect
              placeholder="Pick a screen…" options={SCREEN_OPTIONS}
              value={pixelValue(SCREEN_OPTIONS)} onPick={applyPixel}
            />
          )}
          {tab === 'Social' && (
            <>
              <PresetSelect
                placeholder="Pick a social format…" options={SOCIAL_OPTIONS}
                value={pixelValue(SOCIAL_OPTIONS)} onPick={applyPixel}
              />
              <p className="arc-note">Social sizes are the platform-recommended exports at the standard 72 PPI.</p>
            </>
          )}
          {tab === 'Ratios' && (
            <>
              <PresetSelect
                placeholder="Pick a ratio…" options={RATIO_OPTIONS}
                value={ratioMatch?.name} onPick={applyRatio}
              />
              <div className="arc-ratio-grid" role="group" aria-label="Ratio shapes">
                {RATIOS.map(r => (
                  <button
                    key={r.name} type="button"
                    className={`arc-ratio-card${ratioMatch?.name === r.name ? ' on' : ''}`}
                    onClick={() => applyRatio(r)}
                  >
                    <RatioThumb w={r.w} h={r.h} big />
                    <span className="arc-ratio-card-name">{r.name}</span>
                    <span className="arc-ratio-card-use">{r.use}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {ratioMatch && sizeOptions.length > 0 && (
            <div className="rc-field">
              <div className="seg-label">Standard {ratioMatch.name} sizes</div>
              <PresetSelect
                placeholder={`Pick a standard ${ratioMatch.name} size…`}
                options={sizeOptions} value={sizeValue} onPick={applyPixel}
              />
            </div>
          )}

          {side !== 'both' && (
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
                {simplified && (
                  <span className="rc-simplified">
                    = {simplified}
                    {nearest && nearest.label !== simplified && nearest.off < 2 && (
                      <small> ≈ {nearest.label}</small>
                    )}
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="rc-field">
            <div className="seg-label">I know the…</div>
            <div className="rc-known">
              <div className="row" style={{ gap: 6 }}>
                <button type="button" className={`pt-t${side === 'width' ? ' on' : ''}`} onClick={() => pickSide('width')}>Width</button>
                <button type="button" className={`pt-t${side === 'height' ? ' on' : ''}`} onClick={() => pickSide('height')}>Height</button>
                <button type="button" className={`pt-t${side === 'both' ? ' on' : ''}`} onClick={() => pickSide('both')}>Width × height</button>
              </div>
              {side === 'both'
                ? (
                  <div className="rc-ratio-row">
                    <input
                      type="number" min="0" value={rw}
                      onChange={e => { setRw(e.target.value); setKnown(e.target.value) }}
                      placeholder="width" aria-label="Width in pixels"
                    />
                    <span className="rc-colon">×</span>
                    <input
                      type="number" min="0" value={rh} onChange={e => setRh(e.target.value)}
                      placeholder="height" aria-label="Height in pixels"
                    />
                    {simplified && (
                      <span className="rc-simplified">
                        = {simplified}
                        {nearest && nearest.label !== simplified && nearest.off < 2 && (
                          <small> ≈ {nearest.label}</small>
                        )}
                      </span>
                    )}
                  </div>
                )
                : (
                  <input
                    type="number" min="0" value={known} onChange={e => setKnown(e.target.value)}
                    aria-label={`Known ${side} in pixels`} placeholder={`${side} in px`}
                  />
                )}
            </div>
          </div>

          <div className="rc-field">
            <div className="seg-label">Pixel density (optional — unlocks inches)</div>
            <div className="arc-ppi-row">
              <label className="arc-ppi-field">
                <input type="number" min="0" value={ppi} onChange={e => setPpi(e.target.value)} aria-label="Pixels per inch" placeholder="PPI" />
                <span>PPI</span>
              </label>
              <span className="arc-ppi-or">or diagonal</span>
              <label className="arc-ppi-field">
                <input
                  type="number" min="0" step="0.1"
                  value={diag?.inches ?? ''}
                  onChange={e => onDiagInput(e.target.value)}
                  aria-label="Diagonal in inches" placeholder="e.g. 27"
                />
                <span>″</span>
              </label>
            </div>
          </div>

          {out && diag && (
            <div className="rc-out">
              <div className="seg-label">Result</div>
              <div className="rc-out-size">
                <div className="rc-result-dims">
                  <button className="rc-dim" onClick={() => copy(String(out.width))} title="Copy width">{out.width}<small>W</small></button>
                  <span className="rc-times">×</span>
                  <button className="rc-dim" onClick={() => copy(String(out.height))} title="Copy height">{out.height}<small>H</small></button>
                </div>
                <button className="btn btn-s" onClick={() => copy(`${out.width} × ${out.height}`)}>Copy size</button>
              </div>
              <div className="arc-stats">
                <button className="arc-stat" onClick={() => copy(simplified || '')} title="Copy ratio">
                  <span className="arc-stat-k">Ratio</span>
                  <span className="arc-stat-v">{simplified}</span>
                  {nearest && nearest.label !== simplified && nearest.off < 2 && (
                    <span className="arc-stat-sub">≈ {nearest.label}{nearest.off >= 0.05 ? ` · ${round(nearest.off)}% off` : ''}</span>
                  )}
                </button>
                <button className="arc-stat" onClick={() => copy(String(round(ratioW / ratioH)))} title="Copy decimal ratio">
                  <span className="arc-stat-k">Decimal</span>
                  <span className="arc-stat-v">{round(ratioW / ratioH)}</span>
                </button>
                {orientation && (
                  <button className="arc-stat" onClick={() => copy(orientation)} title="Copy orientation">
                    <span className="arc-stat-k">Orientation</span>
                    <span className="arc-stat-v">{orientation}</span>
                  </button>
                )}
                <button className="arc-stat" onClick={() => copy(`${diag.px}px`)} title="Copy diagonal in pixels">
                  <span className="arc-stat-k">Diagonal</span>
                  <span className="arc-stat-v">{diag.px.toLocaleString()} px</span>
                </button>
                {diag.inches !== null && (
                  <button className="arc-stat" onClick={() => copy(`${diag.inches}"`)} title="Copy diagonal in inches">
                    <span className="arc-stat-k">Diagonal ″</span>
                    <span className="arc-stat-v">{diag.inches}″</span>
                  </button>
                )}
                {diag.physW !== null && (
                  <button className="arc-stat" onClick={() => copy(`${diag.physW}" × ${diag.physH}"`)} title="Copy physical size">
                    <span className="arc-stat-k">Physical</span>
                    <span className="arc-stat-v">{diag.physW}″ × {diag.physH}″</span>
                  </button>
                )}
              </div>
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
                  <svg className="rc-vis-diag" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                    <line x1="0" y1="0" x2="100" y2="100" vectorEffect="non-scaling-stroke" />
                  </svg>
                  <span className="rc-vis-ratio">{simplified}</span>
                  {out && <span className="rc-vis-dims">{out.width} × {out.height}</span>}
                  {diag && diag.inches !== null && <span className="rc-vis-dims">⤢ {diag.inches}″ · {ppiNum} PPI</span>}
                </div>
              )
              : <div className="rc-vis-empty">Enter a valid ratio</div>}
          </div>
        </div>
      </div>
    </div>
  )
}
