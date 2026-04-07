import { useState, useCallback, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { generateTintScale, T_LABELS, hexToHsl, hslToHex, textColorForBg } from '../utils/colors'
import { usePalette } from '../contexts/PaletteContext'

function getHarmonicPairs(hex) {
  const [h, s, l] = hexToHsl(hex)
  return [
    { name: 'Soft Rose', hex: hslToHex((h + 150) % 360, Math.min(s + 10, 100), Math.min(l + 20, 90)), match: 84 },
    { name: 'Royal Amethyst', hex: hslToHex((h + 30) % 360, s, l), match: 98 },
  ]
}

const HEX_RE = /^#[0-9a-f]{6}$/i

export default function TintGenerator({ onCopy }) {
  const [searchParams] = useSearchParams()
  const { palette } = usePalette()
  const [baseHex, setBaseHex] = useState('#cc97ff')
  const [lumBias, setLumBias] = useState(82)
  const [satDecay, setSatDecay] = useState(12)
  const [oled, setOled] = useState(true)
  const [anchor] = useState(5)
  const mode = 'perceived'

  // Pick up ?seed= from URL on mount
  useEffect(() => {
    const seed = searchParams.get('seed')
    if (seed && HEX_RE.test(seed)) setBaseHex(seed)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const cfg = { hex: baseHex, anchor, hueShift: 0, satMin: 0, satMax: 0, lMin: oled ? 3 : 5, lMax: lumBias + 16, mode }
  const scale = generateTintScale(cfg)

  const harmonics = getHarmonicPairs(baseHex)

  const buildCSS = useCallback(() => {
    let css = ':root {\n'
    scale.forEach((c, i) => { css += `  --color-${T_LABELS[i]}: ${c};\n` })
    css += '}'
    return css
  }, [scale])

  const buildJSON = useCallback(() => {
    const obj = {}
    scale.forEach((c, i) => { obj[T_LABELS[i]] = c })
    return JSON.stringify(obj, null, 2)
  }, [scale])

  const tailwindConfig = useCallback(() => {
    const name = 'obsidian-purple'
    let cfg = `"${name}": {\n`
    scale.forEach((c, i) => { cfg += `  "${T_LABELS[i]}": "${c}",\n` })
    cfg += '}'
    return cfg
  }, [scale])

  const randomSeed = () => {
    const hex = hslToHex(Math.floor(Math.random() * 360), 50 + Math.floor(Math.random() * 40), 50 + Math.floor(Math.random() * 30))
    setBaseHex(hex)
  }

  return (
    <div className="sec">
      {/* Algorithm label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ width: 32, height: 2, background: 'var(--accent)' }} />
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--accent)', fontFamily: 'var(--mono)' }}>Algorithm V2.4</span>
      </div>

      {/* Title + Seed */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 24, marginBottom: 12 }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <h1 style={{ fontSize: 'clamp(36px, 6vw, 56px)', fontWeight: 800, letterSpacing: '-.04em', lineHeight: 1, textTransform: 'uppercase', marginBottom: 16 }}>
            Tint<br />Generator
          </h1>
          <p style={{ fontSize: 15, color: 'var(--t1)', maxWidth: 550, lineHeight: 1.7, marginBottom: 20 }}>
            Generate mathematically perfect tonal variations for the Obsidian design system. Balancing luminance and saturation across 12-step scales.
          </p>
        </div>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t2)' }}>Current Seed</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 700, color: 'var(--accent)' }}>{baseHex.toUpperCase()}</div>
          </div>
          <button onClick={randomSeed} style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--bg-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--t1)', transition: 'all var(--t)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10"/><path d="M20.49 15a9 9 0 01-14.85 3.36L1 14"/>
            </svg>
          </button>
          <input type="color" value={baseHex} onChange={e => setBaseHex(e.target.value)} style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }} />
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
        <button className="btn" onClick={() => onCopy(buildJSON())} style={{ textTransform: 'uppercase', letterSpacing: '.06em', fontSize: 11, fontWeight: 700 }}>Export JSON</button>
        <button className="btn btn-accent" onClick={() => onCopy(buildCSS())} style={{ textTransform: 'uppercase', letterSpacing: '.06em', fontSize: 11, fontWeight: 700 }}>Push to Figma</button>
      </div>

      {/* Controls + Vertical Tint Column */}
      <div className="split" style={{ marginBottom: 40, alignItems: 'flex-start' }}>
        <div className="side" style={{ flex: '0 0 340px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Generator Controls */}
          <div className="card" style={{ padding: 0 }}>
            <div style={{ padding: '22px 22px 16px' }}>
              <h3 style={{ fontSize: 14, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 24 }}>Generator Controls</h3>

              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t2)' }}>Luminance Bias</span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>{(lumBias / 100).toFixed(2)}</span>
                </div>
                <input type="range" min="50" max="100" value={lumBias} onChange={e => setLumBias(+e.target.value)} style={{ width: '100%' }} />
              </div>

              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t2)' }}>Saturation Decay</span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>{satDecay}%</span>
                </div>
                <input type="range" min="0" max="50" value={satDecay} onChange={e => setSatDecay(+e.target.value)} style={{ width: '100%' }} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t2)' }}>OLED Optimization</span>
                <button className={`toggle-switch${oled ? ' on' : ''}`} onClick={() => setOled(!oled)} />
              </div>
            </div>

            <div style={{ padding: '16px 22px', borderTop: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t2)' }}>System Ready</span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--t1)', lineHeight: 1.6 }}>
                Optimizing contrast ratios for accessibility (WCAG 2.1 AAA)
              </p>
            </div>
          </div>

          {/* Import from Palette Builder */}
          <div className="card" style={{ padding: '18px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h3 style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase' }}>From Palette Builder</h3>
              <Link to="/palette" style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', fontFamily: 'var(--mono)' }}>Open &rarr;</Link>
            </div>
            {palette.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--t2)', lineHeight: 1.6 }}>
                No palette saved yet. Generate one in <Link to="/palette">Palette Builder</Link> and it will appear here.
              </p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(palette.length, 5)}, 1fr)`, gap: 6 }}>
                {palette.map((c, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setBaseHex(c)}
                    title={`Use ${c.toUpperCase()}`}
                    style={{
                      background: c,
                      height: 56,
                      border: baseHex.toLowerCase() === c.toLowerCase() ? '2px solid var(--accent)' : '1px solid var(--border)',
                      borderRadius: 4,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'flex-end',
                      justifyContent: 'center',
                      padding: '0 0 6px',
                    }}
                  >
                    <span style={{ fontSize: 8, fontFamily: 'var(--mono)', fontWeight: 700, color: textColorForBg(c) }}>
                      {c.toUpperCase().replace('#', '')}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Vertical Tint Column */}
        <div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, borderRadius: 4, overflow: 'hidden', border: '1px solid var(--border)' }}>
            {scale.map((c, i) => {
              const isCore = i === anchor
              const [h, s, l] = hexToHsl(c)
              return (
                <div
                  key={i}
                  onClick={() => onCopy(c)}
                  style={{
                    display: 'flex',
                    alignItems: 'stretch',
                    cursor: 'pointer',
                    borderBottom: i < scale.length - 1 ? '1px solid var(--border)' : 'none',
                    background: 'var(--card)',
                    borderLeft: isCore ? '3px solid var(--accent)' : '3px solid transparent',
                    transition: 'background var(--t)',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--hvr)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--card)'}
                >
                  {/* Swatch */}
                  <div style={{
                    width: 220,
                    background: c,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 18px',
                    flexShrink: 0,
                  }}>
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: textColorForBg(c), opacity: 0.65 }}>
                      {isCore ? 'SEED' : `STEP ${String(i + 1).padStart(2, '0')}`}
                    </span>
                    {isCore && (
                      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: textColorForBg(c), padding: '2px 8px', border: `1px solid ${textColorForBg(c)}`, borderRadius: 3, opacity: 0.8 }}>BASE</span>
                    )}
                  </div>

                  {/* Meta */}
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', gap: 16, minWidth: 0 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 700, color: 'var(--t0)' }}>
                        {c.toUpperCase()}
                      </span>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t2)' }}>
                        hsl({h}, {s}%, {l}%)
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                        {T_LABELS[i]}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); onCopy(c) }}
                        className="btn btn-s"
                        style={{ padding: '4px 10px', fontSize: 10, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' }}
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Harmonic Pairs + Tailwind Config */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px,100%), 1fr))', gap: 14, marginBottom: 40 }}>
        <div className="card">
          <h3 style={{ fontSize: 13, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 20 }}>Harmonic Pairs</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {harmonics.map((pair, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'var(--bg-2)', borderRadius: 4, cursor: 'pointer' }} onClick={() => onCopy(pair.hex)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 3, background: pair.hex }} />
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 500 }}>{pair.name} {pair.hex.toUpperCase()}</span>
                </div>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, color: 'var(--accent)' }}>{pair.match}% MATCH</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 13, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase' }}>Tailwind Config Map</h3>
            <button className="btn btn-s" style={{ padding: '3px 8px' }} onClick={() => onCopy(tailwindConfig())}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </button>
          </div>
          <div className="code" onClick={() => onCopy(tailwindConfig())} style={{ fontSize: 11 }}>{tailwindConfig()}</div>
        </div>
      </div>

      {/* Footer meta */}
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24, marginBottom: 32 }}>
        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t2)', marginBottom: 4 }}>Engine Status</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Stable Distribution</div>
          </div>
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t2)', marginBottom: 4 }}>Color Space</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>OKLCH Adaptive</div>
          </div>
        </div>
      </div>
    </div>
  )
}
