import { useState, useMemo } from 'react'
import { contrastRatio, hexToRgb, hexToHsl, hslToHex, luminance } from '../utils/colors'

export default function ContrastChecker() {
  const [fg, setFg] = useState('#c0c1ff')
  const [bg, setBg] = useState('#131313')

  const ratio = useMemo(() => contrastRatio(fg, bg), [fg, bg])
  const fgRgb = hexToRgb(fg)
  const bgRgb = hexToRgb(bg)
  const fgLum = luminance(fgRgb[0], fgRgb[1], fgRgb[2])
  const bgLum = luminance(bgRgb[0], bgRgb[1], bgRgb[2])

  const checks = [
    { label: 'WCAG AA', sub: 'NORMAL TEXT', target: 4.5 },
    { label: 'WCAG AA', sub: 'LARGE TEXT', target: 3 },
    { label: 'WCAG AAA', sub: 'NORMAL TEXT', target: 7 },
    { label: 'WCAG AAA', sub: 'LARGE TEXT', target: 4.5 },
  ]

  const suggestions = useMemo(() => {
    if (ratio >= 7) return []
    const fgHsl = hexToHsl(fg)
    const sugs = []
    ;[7, 4.5, 3].forEach(tgt => {
      const isDk = bgLum < 0.5
      let lo, hi
      if (isDk) { lo = fgHsl[2]; hi = 100 } else { lo = 0; hi = fgHsl[2] }
      let best = fg
      for (let j = 0; j < 30; j++) {
        const mid = (lo + hi) / 2
        const t = hslToHex(fgHsl[0], fgHsl[1], Math.round(mid))
        const r = contrastRatio(t, bg)
        if (r >= tgt) { best = t; if (isDk) hi = mid; else lo = mid }
        else { if (isDk) lo = mid; else hi = mid }
      }
      if (!sugs.includes(best)) sugs.push(best)
    })
    return sugs
  }, [fg, bg, ratio, bgLum])

  const swap = () => { const tmp = fg; setFg(bg); setBg(tmp) }

  return (
    <div className="sec">
      <div className="sec-h">
        <h1>Contrast Checker</h1>
        <p>Validate your color combinations against Web Content Accessibility Guidelines (WCAG) to ensure maximum legibility and inclusion.</p>
      </div>

      <div className="split" style={{ marginBottom: 24 }}>
        <div className="side">
          <div className="card" style={{ marginBottom: 10 }}>
            <div className="sl">Foreground Color</div>
            <div className="row" style={{ marginTop: 6 }}>
              <input type="color" value={fg} onChange={e => setFg(e.target.value)} />
              <input type="text" value={fg} style={{ flex: 1, minWidth: 0, fontFamily: 'var(--mono)' }} onChange={e => { if (/^#[0-9a-f]{6}$/i.test(e.target.value)) setFg(e.target.value) }} />
            </div>
          </div>
          <div className="card" style={{ marginBottom: 10 }}>
            <div className="sl">Background Color</div>
            <div className="row" style={{ marginTop: 6 }}>
              <input type="color" value={bg} onChange={e => setBg(e.target.value)} />
              <input type="text" value={bg} style={{ flex: 1, minWidth: 0, fontFamily: 'var(--mono)' }} onChange={e => { if (/^#[0-9a-f]{6}$/i.test(e.target.value)) setBg(e.target.value) }} />
            </div>
          </div>
          <button className="btn" onClick={swap} style={{ width: '100%', justifyContent: 'center', marginBottom: 10 }}>
            &#8644; Swap Colors
          </button>
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 14 }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>Compliance Report</span>
              <div className="cr-val">{ratio.toFixed(1)}:1</div>
            </div>
            {checks.map((row, i) => {
              const pass = ratio >= row.target
              return (
                <div key={i} className="comp-row">
                  <div>
                    <div className="label">{row.label}</div>
                    <div className="sublabel">{row.sub}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className={`tag ${pass ? 'tag-pass' : 'tag-fail'}`}>
                      {pass ? 'PASS \u2713' : 'FAIL'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div>
          <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border)', background: bg, color: fg }}>
            <div style={{ padding: 'clamp(24px,4vw,48px) clamp(20px,3vw,36px)', textAlign: 'center' }}>
              <div style={{ fontSize: 'clamp(26px,4vw,42px)', fontWeight: 700, letterSpacing: '-.04em', lineHeight: 1.1, marginBottom: 14 }}>
                The future of<br />design is <span style={{ color: fg }}>accessible</span>.
              </div>
              <div style={{ fontSize: 14, lineHeight: 1.6, opacity: 0.7, maxWidth: 380, margin: '0 auto' }}>
                Good design is not just what it looks like and feels like. Design is how it works for everyone.
              </div>
              <div style={{ marginTop: 20, display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                <div style={{ padding: '10px 24px', fontSize: 12, fontWeight: 600, borderRadius: 8, background: fg, color: bg }}>Primary CTA</div>
                <div style={{ padding: '10px 24px', fontSize: 12, borderRadius: 8, border: `1px solid ${fg}`, color: fg }}>Ghost Action</div>
              </div>
            </div>
            <div style={{ padding: '0 clamp(20px,3vw,36px) clamp(20px,3vw,30px)', display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ flex: 1, minWidth: 140, padding: 16, border: '1px solid rgba(128,128,128,.15)', borderRadius: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 10 }}>Interface Elements</div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 9, padding: '4px 10px', border: '1px solid', borderRadius: 4, opacity: 0.6 }}>Navigation</span>
                  <span style={{ fontSize: 9, padding: '4px 10px', border: '1px solid', borderRadius: 4, opacity: 0.6 }}>Interface</span>
                  <span style={{ fontSize: 9, padding: '4px 10px', border: '1px solid', borderRadius: 4, opacity: 0.3 }}>Disabled</span>
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 140, padding: 16, border: '1px solid rgba(128,128,128,.15)', borderRadius: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 10 }}>Visual Simulation</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, opacity: 0.6 }}>
                  LUMINANCE (FG): {fgLum.toFixed(3)}<br />
                  LUMINANCE (BG): {bgLum.toFixed(3)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {suggestions.length > 0 && (
        <div className="suggest-bar">
          <div style={{ flex: 1, minWidth: 200, display: 'flex', alignItems: 'center', gap: 12 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Suggested Adjustments</div>
              <div style={{ fontSize: 11, color: 'var(--t2)' }}>We've found {suggestions.length} similar tones that would meet AAA standards with your current background.</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {suggestions.map(c => (
              <div key={c} className="suggest-sw" style={{ background: c }} onClick={() => setFg(c)} title={c} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
