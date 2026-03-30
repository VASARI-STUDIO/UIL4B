import { useState, useMemo } from 'react'
import { contrastRatio, hexToRgb, hexToHsl, hslToHex, luminance, fixForeground, fixBackground } from '../utils/colors'

export default function ContrastChecker({ onCopy }) {
  const [fg, setFg] = useState('#c0c1ff')
  const [bg, setBg] = useState('#131313')

  const ratio = useMemo(() => contrastRatio(fg, bg), [fg, bg])
  const fgRgb = hexToRgb(fg)
  const bgRgb = hexToRgb(bg)
  const fgLum = luminance(fgRgb[0], fgRgb[1], fgRgb[2])
  const bgLum = luminance(bgRgb[0], bgRgb[1], bgRgb[2])

  const checks = [
    { label: 'WCAG AA', sub: 'Normal Text', target: 4.5 },
    { label: 'WCAG AA', sub: 'Large Text', target: 3 },
    { label: 'WCAG AAA', sub: 'Normal Text', target: 7 },
    { label: 'WCAG AAA', sub: 'Large Text', target: 4.5 },
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
    <div className="sec on">
      <div className="sec-h">
        <h1>Contrast Checker</h1>
        <p>Validate colour combinations against WCAG for maximum legibility.</p>
      </div>

      <div className="split" style={{ marginBottom: 24 }}>
        <div className="side">
          <div className="card" style={{ marginBottom: 10 }}>
            <div className="sl">Foreground Colour</div>
            <div className="row" style={{ marginTop: 6 }}>
              <input type="color" value={fg} onChange={e => setFg(e.target.value)} />
              <input type="text" value={fg} style={{ flex: 1, minWidth: 0, fontFamily: 'var(--mono)' }} onChange={e => { if (/^#[0-9a-f]{6}$/i.test(e.target.value)) setFg(e.target.value) }} />
            </div>
          </div>
          <div className="card" style={{ marginBottom: 10 }}>
            <div className="sl">Background Colour</div>
            <div className="row" style={{ marginTop: 6 }}>
              <input type="color" value={bg} onChange={e => setBg(e.target.value)} />
              <input type="text" value={bg} style={{ flex: 1, minWidth: 0, fontFamily: 'var(--mono)' }} onChange={e => { if (/^#[0-9a-f]{6}$/i.test(e.target.value)) setBg(e.target.value) }} />
            </div>
          </div>
          <button className="btn" onClick={swap} style={{ width: '100%', justifyContent: 'center', marginBottom: 10 }}>
            &#8644; Swap Colours
          </button>
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>Compliance</span>
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
                  <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
                    <span className={`tag ${pass ? 'tag-pass' : 'tag-fail'}`}>
                      {pass ? 'PASS \u2713' : 'FAIL'}
                    </span>
                    {!pass && (
                      <>
                        <button className="btn btn-s" style={{ marginLeft: 6 }} onClick={() => setFg(fixForeground(fg, bg, row.target))}>Fix FG</button>
                        <button className="btn btn-s" style={{ marginLeft: 4 }} onClick={() => setBg(fixBackground(fg, bg, row.target))}>Fix BG</button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div>
          <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border)', background: bg, color: fg }}>
            <div style={{ padding: 'clamp(20px,4vw,44px) clamp(16px,3vw,32px)', textAlign: 'center' }}>
              <div style={{ fontSize: 'clamp(24px,4vw,40px)', fontWeight: 700, letterSpacing: '-.04em', lineHeight: 1.1, marginBottom: 12 }}>
                The future of<br />design is accessible.
              </div>
              <div style={{ fontSize: 14, lineHeight: 1.6, opacity: 0.75, maxWidth: 380, margin: '0 auto' }}>
                Good design is not just what it looks like. Design is how it works for everyone.
              </div>
              <div style={{ marginTop: 18, display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                <div style={{ padding: '10px 22px', fontSize: 12, fontWeight: 600, borderRadius: 8, background: fg, color: bg }}>Primary CTA</div>
                <div style={{ padding: '10px 22px', fontSize: 12, borderRadius: 8, border: `1px solid ${fg}`, color: fg, opacity: 0.5 }}>Ghost Action</div>
              </div>
            </div>
            <div style={{ padding: '0 clamp(16px,3vw,32px) clamp(16px,3vw,24px)', display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ flex: 1, minWidth: 140, padding: 14, border: '1px solid rgba(128,128,128,.15)', borderRadius: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 8 }}>Interface</div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 9, padding: '3px 8px', border: '1px solid', borderRadius: 4, opacity: 0.6 }}>Nav</span>
                  <span style={{ fontSize: 9, padding: '3px 8px', border: '1px solid', borderRadius: 4, opacity: 0.3 }}>Disabled</span>
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 140, padding: 14, border: '1px solid rgba(128,128,128,.15)', borderRadius: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 8 }}>Luminance</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, opacity: 0.6 }}>FG: {fgLum.toFixed(3)}<br />BG: {bgLum.toFixed(3)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {suggestions.length > 0 && (
        <div className="suggest-bar">
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Suggested Adjustments</div>
            <div style={{ fontSize: 11, color: 'var(--t2)' }}>Tones that meet AAA with your background.</div>
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
