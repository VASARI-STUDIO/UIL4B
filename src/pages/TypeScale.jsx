import { useState, useMemo, useEffect } from 'react'
import { useI18n } from '../contexts/I18nContext'
import { useProject } from '../contexts/ProjectContext'

const NAMES = ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl', '7xl']
const EXPS = [-2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8]
const RATIOS = [
  { label: 'Minor 2nd', value: 1.067 },
  { label: 'Major 2nd', value: 1.125 },
  { label: 'Minor 3rd', value: 1.200 },
  { label: 'Major 3rd', value: 1.250 },
  { label: 'Perfect 4th', value: 1.333 },
  { label: 'Augmented 4th', value: 1.414 },
  { label: 'Perfect 5th', value: 1.500 },
  { label: 'Golden Ratio', value: 1.618 },
  { label: 'Custom', value: 0 },
]

const WEIGHTS = [
  { label: 'Thin', value: 100 },
  { label: 'Extra Light', value: 200 },
  { label: 'Light', value: 300 },
  { label: 'Normal', value: 400 },
  { label: 'Medium', value: 500 },
  { label: 'Semibold', value: 600 },
  { label: 'Bold', value: 700 },
  { label: 'Extra Bold', value: 800 },
  { label: 'Black', value: 900 },
]

function CopyIcon({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

export default function TypeScale({ onCopy }) {
  const { t } = useI18n()
  const { design, setTypeScale } = useProject()
  const [base, setBase] = useState(() => design?.typeScale?.base || 16)
  const [ratio, setRatio] = useState(() => design?.typeScale?.ratio || 1.250)
  const [customRatio, setCustomRatio] = useState(1.333)
  const [lineHeight, setLineHeight] = useState(() => design?.typeScale?.lineHeight || 1.5)
  const [headingSpacing, setHeadingSpacing] = useState(() => design?.typeScale?.headingSpacing || 0)
  const [bodySpacing, setBodySpacing] = useState(() => design?.typeScale?.bodySpacing || 0)
  const [exportFormat, setExportFormat] = useState('css')
  const [previewWidth, setPreviewWidth] = useState('full')

  const activeRatio = ratio === 0 ? customRatio : ratio

  // Persist to ProjectContext
  useEffect(() => {
    setTypeScale({ base, ratio: activeRatio, lineHeight, headingSpacing, bodySpacing })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, activeRatio, lineHeight, headingSpacing, bodySpacing])

  const scale = useMemo(() =>
    EXPS.map((e, i) => {
      const size = +(base * Math.pow(activeRatio, e)).toFixed(1)
      const isHeading = e >= 2
      return {
        name: NAMES[i],
        size,
        rem: +(size / 16).toFixed(4),
        exp: e,
        lh: +(size * lineHeight).toFixed(1),
        ls: isHeading ? headingSpacing : bodySpacing,
        weight: e >= 4 ? 700 : e >= 2 ? 600 : 400,
      }
    }).reverse()
  , [base, activeRatio, lineHeight, headingSpacing, bodySpacing])

  const cssExport = useMemo(() => {
    let css = ':root {\n'
    scale.forEach(s => {
      css += `  --text-${s.name}: ${s.rem}rem; /* ${s.size}px */\n`
    })
    css += `\n  --leading: ${lineHeight};\n`
    if (headingSpacing) css += `  --tracking-heading: ${headingSpacing}em;\n`
    if (bodySpacing) css += `  --tracking-body: ${bodySpacing}em;\n`
    css += '}'
    return css
  }, [scale, lineHeight, headingSpacing, bodySpacing])

  const tailwindExport = useMemo(() => {
    let cfg = 'module.exports = {\n  theme: {\n    fontSize: {\n'
    scale.forEach(s => {
      cfg += `      '${s.name}': ['${s.rem}rem', { lineHeight: '${lineHeight}' }],\n`
    })
    cfg += '    },\n  },\n}'
    return cfg
  }, [scale, lineHeight])

  const scssExport = useMemo(() => {
    let scss = ''
    scale.forEach(s => {
      scss += `$text-${s.name}: ${s.rem}rem; // ${s.size}px\n`
    })
    scss += `\n$leading: ${lineHeight};\n`
    if (headingSpacing) scss += `$tracking-heading: ${headingSpacing}em;\n`
    if (bodySpacing) scss += `$tracking-body: ${bodySpacing}em;\n`
    return scss
  }, [scale, lineHeight, headingSpacing, bodySpacing])

  const currentExport = exportFormat === 'tailwind' ? tailwindExport : exportFormat === 'scss' ? scssExport : cssExport
  const widthMap = { full: '100%', tablet: 768, mobile: 375 }

  return (
    <div className="sec">
      <div className="sec-h">
        <div className="sec-h-eyebrow">Typography</div>
        <h1>{t('typeScale.title')}</h1>
        <p>{t('tools.typeScale.description')}</p>
      </div>

      {/* Controls */}
      <div className="card" style={{ padding: 16, marginBottom: 20 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end' }}>
          <div>
            <div className="seg-label">Base Size</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="number" value={base} min="8" max="32" style={{ width: 60 }} onChange={e => setBase(+e.target.value)} />
              <span style={{ fontSize: 11, color: 'var(--t2)' }}>px</span>
            </div>
          </div>
          <div>
            <div className="seg-label">Scale Ratio</div>
            <select value={ratio} onChange={e => setRatio(+e.target.value)} style={{ minWidth: 160 }}>
              {RATIOS.map(r => <option key={r.value} value={r.value}>{r.label}{r.value ? ` (${r.value})` : ''}</option>)}
            </select>
          </div>
          {ratio === 0 && (
            <div>
              <div className="seg-label">Custom Ratio</div>
              <input type="number" step="0.001" min="1.01" max="3" value={customRatio} onChange={e => setCustomRatio(+e.target.value)} style={{ width: 80 }} />
            </div>
          )}
          <div>
            <div className="seg-label">Line Height</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="range" min="1" max="2" step="0.05" value={lineHeight} onChange={e => setLineHeight(+e.target.value)} style={{ width: 80 }} />
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--t1)', minWidth: 28 }}>{lineHeight}</span>
            </div>
          </div>
          <div>
            <div className="seg-label">Heading Tracking</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="range" min="-0.05" max="0.15" step="0.005" value={headingSpacing} onChange={e => setHeadingSpacing(+e.target.value)} style={{ width: 80 }} />
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--t1)', minWidth: 42 }}>{headingSpacing.toFixed(3)}em</span>
            </div>
          </div>
          <div>
            <div className="seg-label">Body Tracking</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="range" min="-0.02" max="0.08" step="0.002" value={bodySpacing} onChange={e => setBodySpacing(+e.target.value)} style={{ width: 80 }} />
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--t1)', minWidth: 42 }}>{bodySpacing.toFixed(3)}em</span>
            </div>
          </div>
        </div>
      </div>

      {/* Responsive preview tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
        {[{ k: 'full', l: 'Desktop' }, { k: 'tablet', l: 'Tablet (768px)' }, { k: 'mobile', l: 'Mobile (375px)' }].map(v => (
          <button key={v.k} className={`pt-t${previewWidth === v.k ? ' on' : ''}`} onClick={() => setPreviewWidth(v.k)} style={{ padding: '5px 12px', fontSize: 11 }}>{v.l}</button>
        ))}
      </div>

      {/* Scale preview */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ maxWidth: typeof widthMap[previewWidth] === 'number' ? widthMap[previewWidth] : '100%', margin: '0 auto', width: '100%' }}>
          {scale.map(s => (
            <div key={s.name} style={{ display: 'flex', alignItems: 'baseline', gap: 16, padding: '14px 20px', borderBottom: '1px solid var(--border)', transition: 'background .15s', cursor: 'pointer' }}
              onClick={() => onCopy(`font-size: ${s.rem}rem; /* ${s.size}px */`)}
            >
              <div style={{ minWidth: 80, flexShrink: 0 }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, color: 'var(--accent)', marginBottom: 2 }}>{s.name}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t2)' }}>{s.size}px / {s.rem}rem</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t3)' }}>↕ {s.lh}px {s.ls ? `↔ ${s.ls}em` : ''}</div>
              </div>
              <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: `${s.size}px`, fontWeight: s.weight, lineHeight: lineHeight, letterSpacing: `${s.ls}em` }}>
                The quick brown fox jumps over the lazy dog
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Font weight reference */}
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Font Weight Reference</h3>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {WEIGHTS.map(w => (
            <div key={w.value} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '10px 20px', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
              onClick={() => onCopy(`font-weight: ${w.value};`)}
            >
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t2)', minWidth: 56 }}>{w.value}</span>
              <span style={{ fontSize: 10, color: 'var(--t2)', minWidth: 72, textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 600 }}>{w.label}</span>
              <span style={{ flex: 1, fontSize: 16, fontWeight: w.value }}>The quick brown fox jumps over the lazy dog</span>
            </div>
          ))}
        </div>
      </div>

      {/* Export */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700 }}>Export</h3>
          <div style={{ display: 'flex', gap: 4 }}>
            {[{ k: 'css', l: 'CSS Variables' }, { k: 'tailwind', l: 'Tailwind' }, { k: 'scss', l: 'SCSS' }].map(f => (
              <button key={f.k} className={`pt-t${exportFormat === f.k ? ' on' : ''}`} onClick={() => setExportFormat(f.k)} style={{ padding: '4px 10px', fontSize: 10 }}>{f.l}</button>
            ))}
          </div>
          <button className="btn btn-s" onClick={() => onCopy(currentExport)} style={{ marginLeft: 'auto', padding: '4px 10px', fontSize: 10 }}>
            <CopyIcon /> Copy
          </button>
        </div>
        <div className="code" onClick={() => onCopy(currentExport)} style={{ fontSize: 11, maxHeight: 300, overflow: 'auto' }}>
          {currentExport}
        </div>
      </div>
    </div>
  )
}
