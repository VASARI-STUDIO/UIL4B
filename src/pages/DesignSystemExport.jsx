import { useState, useMemo } from 'react'
import { usePalette } from '../contexts/PaletteContext'

function CopyIcon({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

const SPACING_PRESETS = {
  tailwind: { name: 'Tailwind (4px base)', values: [0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64, 80, 96, 128, 160, 192, 256] },
  '8pt': { name: '8-point grid', values: [0, 8, 16, 24, 32, 40, 48, 56, 64, 72, 80, 96, 112, 128, 160, 192, 256, 320] },
  '4pt': { name: '4-point grid', values: [0, 4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 48, 56, 64, 80, 96, 128, 160] },
}

const TYPE_RATIOS = [
  { label: 'Minor 3rd (1.2)', value: 1.2 },
  { label: 'Major 3rd (1.25)', value: 1.25 },
  { label: 'Perfect 4th (1.333)', value: 1.333 },
  { label: 'Perfect 5th (1.5)', value: 1.5 },
  { label: 'Golden Ratio (1.618)', value: 1.618 },
]

export default function DesignSystemExport({ onCopy, toast }) {
  const { palette } = usePalette()
  const [systemName, setSystemName] = useState('My Design System')
  const [author, setAuthor] = useState('')
  const [version, setVersion] = useState('1.0.0')
  const [description, setDescription] = useState('')
  const [headingFont, setHeadingFont] = useState('Inter')
  const [bodyFont, setBodyFont] = useState('Inter')
  const [baseSize, setBaseSize] = useState(16)
  const [typeRatio, setTypeRatio] = useState(1.25)
  const [spacingPreset, setSpacingPreset] = useState('tailwind')
  const [colors, setColors] = useState(() => palette.length ? palette : ['#2563EB', '#1D4ED8', '#60A5FA', '#1a1814', '#f3efe8'])
  const [colorLabels, setColorLabels] = useState(['Primary', 'Secondary', 'Accent', 'Dark', 'Light'])

  const typeScale = useMemo(() => {
    const names = ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl']
    const exps = [-2, -1, 0, 1, 2, 3, 4, 5, 6]
    return exps.map((e, i) => ({ name: names[i], size: +(baseSize * Math.pow(typeRatio, e)).toFixed(1) }))
  }, [baseSize, typeRatio])

  const spacingValues = SPACING_PRESETS[spacingPreset].values

  const updateColor = (idx, val) => {
    const next = [...colors]
    next[idx] = val
    setColors(next)
  }
  const updateLabel = (idx, val) => {
    const next = [...colorLabels]
    next[idx] = val
    setColorLabels(next)
  }
  const addColor = () => {
    setColors([...colors, '#666666'])
    setColorLabels([...colorLabels, `Color ${colors.length + 1}`])
  }
  const removeColor = (idx) => {
    setColors(colors.filter((_, i) => i !== idx))
    setColorLabels(colorLabels.filter((_, i) => i !== idx))
  }
  const importFromPalette = () => {
    if (palette.length) {
      setColors([...palette])
      setColorLabels(palette.map((_, i) => ['Primary', 'Secondary', 'Accent', 'Neutral', 'Surface'][i] || `Color ${i + 1}`))
    }
  }

  const generateHTML = () => {
    const colorVars = colors.map((c, i) => `  --color-${colorLabels[i].toLowerCase().replace(/\s+/g, '-')}: ${c};`).join('\n')
    const typeVars = typeScale.map(t => `  --text-${t.name}: ${(t.size / 16).toFixed(4)}rem;`).join('\n')
    const spaceVars = spacingValues.map((v, i) => `  --space-${i + 1}: ${v}px;`).join('\n')

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${systemName}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=${headingFont.replace(/ /g, '+')}:wght@400;600;700;800&family=${bodyFont.replace(/ /g, '+')}:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
:root {
  /* Colors */
${colorVars}

  /* Typography */
  --font-heading: '${headingFont}', sans-serif;
  --font-body: '${bodyFont}', sans-serif;
${typeVars}

  /* Spacing */
${spaceVars}
}

* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: var(--font-body); background: #f8f9fa; color: #1a1a1a; line-height: 1.6; padding: 48px 24px; }
.container { max-width: 960px; margin: 0 auto; }
header { margin-bottom: 48px; padding-bottom: 32px; border-bottom: 1px solid #e5e5e5; }
header h1 { font-family: var(--font-heading); font-size: 2.5rem; font-weight: 800; margin-bottom: 8px; }
header p { font-size: 1.1rem; color: #666; }
.meta { font-size: 0.85rem; color: #999; margin-top: 8px; }
section { margin-bottom: 56px; }
section h2 { font-family: var(--font-heading); font-size: 1.5rem; font-weight: 700; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 1px solid #eee; }
.color-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 16px; }
.color-card { border-radius: 12px; overflow: hidden; border: 1px solid #e5e5e5; background: #fff; }
.color-swatch { height: 80px; }
.color-info { padding: 12px; }
.color-name { font-weight: 600; font-size: 0.9rem; margin-bottom: 4px; }
.color-hex { font-family: monospace; font-size: 0.8rem; color: #666; }
.type-row { display: flex; align-items: baseline; gap: 16px; padding: 12px 0; border-bottom: 1px solid #f0f0f0; }
.type-meta { min-width: 100px; font-family: monospace; font-size: 0.75rem; color: #999; }
.space-row { display: flex; align-items: center; gap: 12px; padding: 8px 0; }
.space-bar { height: 12px; background: var(--color-${colorLabels[0]?.toLowerCase().replace(/\s+/g, '-') || 'primary'}); border-radius: 4px; opacity: 0.6; }
.space-label { font-family: monospace; font-size: 0.75rem; color: #666; min-width: 80px; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>${systemName}</h1>
      ${description ? `<p>${description}</p>` : ''}
      <div class="meta">v${version}${author ? ` &middot; ${author}` : ''} &middot; Generated ${new Date().toLocaleDateString()}</div>
    </header>

    <section>
      <h2>Colors</h2>
      <div class="color-grid">
${colors.map((c, i) => `        <div class="color-card">
          <div class="color-swatch" style="background: ${c}"></div>
          <div class="color-info">
            <div class="color-name">${colorLabels[i] || 'Color ' + (i + 1)}</div>
            <div class="color-hex">${c.toUpperCase()}</div>
          </div>
        </div>`).join('\n')}
      </div>
    </section>

    <section>
      <h2>Typography</h2>
      <p style="margin-bottom: 16px; color: #666;">Heading: <strong>${headingFont}</strong> &middot; Body: <strong>${bodyFont}</strong> &middot; Base: ${baseSize}px &middot; Ratio: ${typeRatio}</p>
${typeScale.map(t => `      <div class="type-row">
        <div class="type-meta">${t.name}<br>${t.size}px</div>
        <div style="font-size: ${t.size}px; font-family: var(--font-heading); font-weight: ${t.size > 24 ? 700 : 400}; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;">The quick brown fox</div>
      </div>`).join('\n')}
    </section>

    <section>
      <h2>Spacing</h2>
      <p style="margin-bottom: 16px; color: #666;">${SPACING_PRESETS[spacingPreset].name}</p>
${spacingValues.slice(0, 12).map((v, i) => `      <div class="space-row">
        <div class="space-label">--space-${i + 1}: ${v}px</div>
        <div class="space-bar" style="width: ${Math.min(v, 300)}px;"></div>
      </div>`).join('\n')}
    </section>

    <section>
      <h2>CSS Custom Properties</h2>
      <pre style="background: #1a1a1a; color: #e5e5e5; padding: 24px; border-radius: 12px; overflow-x: auto; font-size: 0.8rem; line-height: 1.8;">:root {
${colorVars}
${typeVars}
${spaceVars}
  --font-heading: '${headingFont}', sans-serif;
  --font-body: '${bodyFont}', sans-serif;
}</pre>
    </section>
  </div>
</body>
</html>`
  }

  const downloadHTML = () => {
    const html = generateHTML()
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${systemName.toLowerCase().replace(/\s+/g, '-')}-design-system.html`
    a.click()
    URL.revokeObjectURL(url)
    if (toast) toast('Design system exported!')
  }

  const copyCSSVars = () => {
    const colorVars = colors.map((c, i) => `  --color-${colorLabels[i].toLowerCase().replace(/\s+/g, '-')}: ${c};`).join('\n')
    const typeVars = typeScale.map(t => `  --text-${t.name}: ${(t.size / 16).toFixed(4)}rem;`).join('\n')
    const spaceVars = spacingValues.map((v, i) => `  --space-${i + 1}: ${v}px;`).join('\n')
    const css = `:root {\n${colorVars}\n\n${typeVars}\n\n${spaceVars}\n\n  --font-heading: '${headingFont}', sans-serif;\n  --font-body: '${bodyFont}', sans-serif;\n}`
    onCopy(css)
  }

  return (
    <div className="sec">
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 700, letterSpacing: '-.04em', lineHeight: 1.1, marginBottom: 8 }}>Design System Export</h1>
        <p style={{ fontSize: 14, color: 'var(--t1)', maxWidth: 580, lineHeight: 1.7 }}>
          Build your design system and export as a self-contained HTML page for developers and clients.
        </p>
      </div>

      {/* System Config */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>System Configuration</h2>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <div>
              <div className="seg-label">System Name</div>
              <input type="text" value={systemName} onChange={e => setSystemName(e.target.value)} style={{ width: '100%' }} />
            </div>
            <div>
              <div className="seg-label">Author</div>
              <input type="text" value={author} onChange={e => setAuthor(e.target.value)} placeholder="Your name or company" style={{ width: '100%' }} />
            </div>
            <div>
              <div className="seg-label">Version</div>
              <input type="text" value={version} onChange={e => setVersion(e.target.value)} style={{ width: '100%' }} />
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <div className="seg-label">Description</div>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description of this design system" style={{ width: '100%' }} />
          </div>
        </div>
      </section>

      {/* Colors */}
      <section style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>Color Tokens</h2>
          <button className="btn btn-s" onClick={importFromPalette} style={{ fontSize: 10 }}>Import from Color Studio</button>
          <button className="btn btn-s" onClick={addColor} style={{ fontSize: 10 }}>+ Add</button>
        </div>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {colors.map((c, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="color" value={c} onChange={e => updateColor(i, e.target.value)} style={{ width: 36, height: 36, borderRadius: 8, cursor: 'pointer' }} />
                <input type="text" value={colorLabels[i]} onChange={e => updateLabel(i, e.target.value)} style={{ width: 120, fontSize: 12 }} />
                <input type="text" value={c.toUpperCase()} style={{ fontFamily: 'var(--mono)', fontSize: 11, width: 80 }}
                  onChange={e => { if (/^#[0-9a-f]{6}$/i.test(e.target.value)) updateColor(i, e.target.value) }}
                />
                <div style={{ width: 40, height: 24, borderRadius: 4, background: c, border: '1px solid var(--border)' }} />
                {colors.length > 2 && (
                  <button onClick={() => removeColor(i)} style={{ background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer', fontSize: 16 }}>&times;</button>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Typography */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Typography</h2>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
            <div>
              <div className="seg-label">Heading Font</div>
              <input type="text" value={headingFont} onChange={e => setHeadingFont(e.target.value)} style={{ width: 160 }} />
            </div>
            <div>
              <div className="seg-label">Body Font</div>
              <input type="text" value={bodyFont} onChange={e => setBodyFont(e.target.value)} style={{ width: 160 }} />
            </div>
            <div>
              <div className="seg-label">Base Size</div>
              <input type="number" value={baseSize} min="12" max="24" onChange={e => setBaseSize(+e.target.value)} style={{ width: 60 }} />
            </div>
            <div>
              <div className="seg-label">Scale Ratio</div>
              <select value={typeRatio} onChange={e => setTypeRatio(+e.target.value)}>
                {TYPE_RATIOS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            <div className="seg-label">Preview</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {typeScale.slice(4).map(t => (
                <div key={t.name} style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t2)', minWidth: 36 }}>{t.name}</span>
                  <span style={{ fontSize: Math.min(t.size, 48), fontWeight: t.size > 24 ? 700 : 400, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>Design System</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Spacing */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Spacing</h2>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
            {Object.entries(SPACING_PRESETS).map(([k, v]) => (
              <button key={k} className={`pt-t${spacingPreset === k ? ' on' : ''}`} onClick={() => setSpacingPreset(k)} style={{ padding: '5px 12px', fontSize: 11 }}>{v.name}</button>
            ))}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {spacingValues.slice(0, 12).map((v, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 4, background: 'var(--bg-2)', fontSize: 10, fontFamily: 'var(--mono)' }}>
                <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{i + 1}</span>
                <span style={{ color: 'var(--t2)' }}>{v}px</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Export */}
      <section>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Export</h2>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
            <button className="btn btn-s" style={{ padding: '10px 24px', fontSize: 13, fontWeight: 700, background: 'var(--accent)', color: '#fff', border: 'none' }} onClick={downloadHTML}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Export HTML
            </button>
            <button className="btn btn-s" onClick={copyCSSVars} style={{ padding: '10px 20px', fontSize: 12 }}>
              <CopyIcon /> Copy CSS Variables
            </button>
          </div>
          <p style={{ fontSize: 12, color: 'var(--t2)', lineHeight: 1.6 }}>
            Exports a self-contained HTML page with your complete design system — colors, typography, spacing, and CSS custom properties. Share directly with developers or present to clients.
          </p>
        </div>
      </section>
    </div>
  )
}
