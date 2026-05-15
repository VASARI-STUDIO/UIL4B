// Builds CSS and HTML exports from the current design state.
// HTML export is styled using the user's chosen palette + fonts as the
// actual page styling so it serves as a live preview / brand reference.

import { hexToRgb } from './colors'

function lum(hex) {
  try {
    const { r, g, b } = hexToRgb(hex)
    const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) }
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
  } catch {
    return 0.5
  }
}

function contrastText(bg) {
  return lum(bg) > 0.5 ? '#0F172A' : '#F8FAFC'
}

function googleFontUrl(families) {
  const unique = Array.from(new Set(families.filter(Boolean)))
  if (!unique.length) return ''
  const params = unique.map(f => `family=${encodeURIComponent(f)}:wght@400;500;600;700;800`).join('&')
  return `https://fonts.googleapis.com/css2?${params}&display=swap`
}

const PALETTE_LABELS = ['Primary', 'Secondary', 'Accent', 'Neutral', 'Surface', 'Highlight']
const TINT_LABELS = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900']

export function buildCSSVars({ palette, tints, states, fonts, typeScale, stateShades }) {
  const lines = [':root {']

  // Palette colours
  ;(palette?.colors || []).forEach((c, i) => {
    const name = PALETTE_LABELS[i] || `colour-${i + 1}`
    lines.push(`  --color-${name.toLowerCase().replace(/\s+/g, '-')}: ${c};`)
  })

  // Tints
  ;(tints?.scale || []).forEach((c, i) => {
    lines.push(`  --tint-${i + 1}: ${c};`)
  })

  // State colours
  if (stateShades) {
    Object.entries(stateShades).forEach(([state, shades]) => {
      shades.forEach((c, i) => {
        lines.push(`  --${state}-${TINT_LABELS[i] || i * 100}: ${c};`)
      })
    })
  }

  // Fonts
  if (fonts?.heading?.family) {
    lines.push(`  --font-heading: "${fonts.heading.family}", system-ui, sans-serif;`)
  }
  if (fonts?.body?.family) {
    lines.push(`  --font-body: "${fonts.body.family}", system-ui, sans-serif;`)
  }

  // Type scale
  if (typeScale) {
    const { base, ratio, lineHeight } = typeScale
    if (base) lines.push(`  --font-size-base: ${base}px;`)
    if (ratio) lines.push(`  --type-ratio: ${ratio};`)
    if (lineHeight) lines.push(`  --line-height-body: ${lineHeight};`)
    const sizes = [0, 1, 2, 3, 4, 5, 6]
    sizes.forEach(step => {
      const size = (base || 16) * Math.pow(ratio || 1.25, step)
      lines.push(`  --font-size-${step}: ${size.toFixed(2)}px;`)
    })
  }

  lines.push('}')
  return lines.join('\n')
}

// Style guide HTML — uses the user's actual palette + fonts as page styling.
export function buildStyleGuideHTML({ design, stateShades, theme = 'light', projectName = 'Design System' }) {
  const primary = design?.palette?.colors?.[0] || '#2563EB'
  const secondary = design?.palette?.colors?.[1] || primary
  const accent = design?.palette?.colors?.[2] || primary
  const headingFamily = design?.fonts?.heading?.family || 'Inter'
  const bodyFamily = design?.fonts?.body?.family || 'Inter'
  const headingWeight = design?.fonts?.heading?.weight || 700
  const bodyWeight = design?.fonts?.body?.weight || 400
  const ts = design?.typeScale || { base: 16, ratio: 1.25, lineHeight: 1.5 }

  const primaryText = contrastText(primary)
  const isDark = theme === 'dark'
  const fontsUrl = googleFontUrl([headingFamily, bodyFamily])

  const cssVars = buildCSSVars({
    palette: design.palette,
    tints: design.tints,
    states: design.states,
    fonts: design.fonts,
    typeScale: ts,
    stateShades,
  })

  const date = new Date().toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' })

  const paletteSection = (design?.palette?.colors || []).map((c, i) => {
    const label = PALETTE_LABELS[i] || `Colour ${i + 1}`
    const textColor = contrastText(c)
    return `<div class="sg-color-card" data-hex="${c}">
        <div class="sg-color-swatch" style="background:${c};color:${textColor}">
          <span class="sg-color-hex">${c.toUpperCase()}</span>
        </div>
        <div class="sg-color-meta">
          <span class="sg-color-name">${label}</span>
          <span class="sg-color-token">--color-${label.toLowerCase()}</span>
        </div>
      </div>`
  }).join('\n')

  const tintsSection = (design?.tints?.scale || []).length ? `
    <section id="tints" class="sg-section">
      <div class="sg-section-head">
        <span class="sg-eyebrow">02</span>
        <h2>Tint Scale</h2>
        <p>Derived from your active colour for backgrounds, borders, and surfaces.</p>
      </div>
      <div class="sg-tint-row">
        ${design.tints.scale.map((c, i) => `<div class="sg-tint-cell" style="background:${c};color:${contrastText(c)}" data-hex="${c}"><span>${TINT_LABELS[i] || i * 100}</span></div>`).join('')}
      </div>
    </section>
  ` : ''

  const statesSection = stateShades ? `
    <section id="states" class="sg-section">
      <div class="sg-section-head">
        <span class="sg-eyebrow">03</span>
        <h2>State Colours</h2>
        <p>Semantic colour scales for feedback and status messaging.</p>
      </div>
      ${Object.entries(stateShades).map(([state, shades]) => `
        <div class="sg-state">
          <div class="sg-state-label">${state}</div>
          <div class="sg-state-row">
            ${shades.map((c, i) => `<div class="sg-state-cell" style="background:${c};color:${contrastText(c)}" data-hex="${c}"><span>${TINT_LABELS[i] || i * 100}</span></div>`).join('')}
          </div>
        </div>
      `).join('')}
    </section>
  ` : ''

  const fontsSection = `
    <section id="typography" class="sg-section">
      <div class="sg-section-head">
        <span class="sg-eyebrow">04</span>
        <h2>Typography</h2>
        <p>Type stack and scale tuned for your brand.</p>
      </div>
      <div class="sg-font-pair">
        <div class="sg-font-card">
          <div class="sg-font-label">Heading · ${headingFamily} ${headingWeight}</div>
          <p class="sg-font-sample" style="font-family:'${headingFamily}',sans-serif;font-weight:${headingWeight};font-size:48px">The quick brown fox</p>
          <p class="sg-font-sample-s" style="font-family:'${headingFamily}',sans-serif;font-weight:${headingWeight};font-size:24px">ABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789</p>
        </div>
        <div class="sg-font-card">
          <div class="sg-font-label">Body · ${bodyFamily} ${bodyWeight}</div>
          <p class="sg-font-sample" style="font-family:'${bodyFamily}',sans-serif;font-weight:${bodyWeight};font-size:18px;line-height:1.6">Typography is the craft of endowing human language with a durable visual form. Well-paired type creates harmony, rhythm, and clarity across every surface where your brand appears.</p>
        </div>
      </div>
      <div class="sg-type-scale">
        ${[6, 5, 4, 3, 2, 1, 0].map(step => {
          const size = (ts.base || 16) * Math.pow(ts.ratio || 1.25, step)
          return `<div class="sg-type-row">
            <span class="sg-type-token">--font-size-${step}</span>
            <span class="sg-type-size">${size.toFixed(0)}px</span>
            <span class="sg-type-preview" style="font-family:'${step >= 3 ? headingFamily : bodyFamily}',sans-serif;font-weight:${step >= 3 ? headingWeight : bodyWeight};font-size:${size}px;line-height:${step >= 3 ? 1.2 : ts.lineHeight}">Whereas recognition</span>
          </div>`
        }).join('')}
      </div>
    </section>
  `

  const gradient = design?.gradient
  const gradStops = gradient?.stops?.filter(s => s.color)
  const gradientSection = gradStops?.length >= 2 ? `
    <section id="gradients" class="sg-section">
      <div class="sg-section-head">
        <span class="sg-eyebrow">05</span>
        <h2>Gradient</h2>
        <p>Signature gradient using palette colours.</p>
      </div>
      <div class="sg-gradient" style="background:linear-gradient(${gradient.angle}deg, ${gradStops.map(s => `${s.color} ${s.position}%`).join(', ')})">
        <span>${gradient.angle}° · ${gradStops.length} stops</span>
      </div>
    </section>
  ` : ''

  return `<!DOCTYPE html>
<html lang="en" data-theme="${theme}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectName} — Style Guide</title>
  ${fontsUrl ? `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="${fontsUrl}" rel="stylesheet">` : ''}
  <style>
${cssVars}
* { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --sg-bg: ${isDark ? '#0B0F1A' : '#F8FAFC'};
  --sg-bg-1: ${isDark ? '#111827' : '#FFFFFF'};
  --sg-bg-2: ${isDark ? '#1E293B' : '#F1F5F9'};
  --sg-text: ${isDark ? '#F1F5F9' : '#0F172A'};
  --sg-text-2: ${isDark ? '#94A3B8' : '#475569'};
  --sg-text-3: ${isDark ? '#64748B' : '#94A3B8'};
  --sg-border: ${isDark ? 'rgba(255,255,255,.08)' : 'rgba(15,23,42,.06)'};
  --sg-radius: 10px;
  --sg-radius-s: 6px;
}
html { scroll-behavior: smooth; }
body {
  font-family: '${bodyFamily}', system-ui, -apple-system, sans-serif;
  font-weight: ${bodyWeight};
  background: var(--sg-bg);
  color: var(--sg-text);
  line-height: ${ts.lineHeight};
  font-size: ${ts.base}px;
  -webkit-font-smoothing: antialiased;
  display: flex;
  min-height: 100vh;
}
h1, h2, h3, h4 { font-family: '${headingFamily}', system-ui, sans-serif; font-weight: ${headingWeight}; letter-spacing: -0.02em; }
.sg-sidebar {
  position: sticky; top: 0; height: 100vh; width: 240px; flex-shrink: 0;
  background: var(--sg-bg-1); border-right: 1px solid var(--sg-border);
  padding: 24px 0; display: flex; flex-direction: column;
}
.sg-brand {
  padding: 0 22px 20px; border-bottom: 1px solid var(--sg-border); margin-bottom: 14px;
}
.sg-brand-mark {
  width: 32px; height: 32px; border-radius: 8px;
  background: ${primary}; color: ${primaryText};
  display: flex; align-items: center; justify-content: center;
  font-weight: 800; font-size: 14px; margin-bottom: 10px;
  font-family: '${headingFamily}', sans-serif;
}
.sg-brand h1 { font-size: 14px; font-weight: 800; letter-spacing: -0.015em; line-height: 1.2; }
.sg-brand .sg-brand-sub { font-size: 9px; color: var(--sg-text-2); letter-spacing: 0.1em; text-transform: uppercase; display: block; margin-top: 3px; font-weight: 700; }
.sg-brand .sg-brand-date { font-size: 10px; color: var(--sg-text-3); display: block; margin-top: 10px; font-family: ui-monospace, monospace; }
.sg-nav-label { font-size: 9px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--sg-text-3); padding: 14px 22px 8px; }
.sg-nav a {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 22px; font-size: 13px; font-weight: 500;
  color: var(--sg-text-2); text-decoration: none;
  transition: all .15s; border-left: 2px solid transparent;
}
.sg-nav a:hover { color: var(--sg-text); background: ${isDark ? 'rgba(255,255,255,.04)' : 'rgba(15,23,42,.02)'}; }
.sg-nav a.active { color: ${primary}; border-left-color: ${primary}; background: ${isDark ? 'rgba(96,165,250,.06)' : 'rgba(37,99,235,.06)'}; }
.sg-nav .num { font-family: ui-monospace, monospace; font-size: 10px; color: var(--sg-text-3); }
.sg-sidebar-footer { margin-top: auto; padding: 16px 22px; border-top: 1px solid var(--sg-border); font-size: 10px; color: var(--sg-text-3); }
.sg-main { flex: 1; min-width: 0; max-width: 1100px; padding: 56px clamp(24px, 5vw, 72px) 96px; }
.sg-hero { margin-bottom: 56px; padding-bottom: 32px; border-bottom: 1px solid var(--sg-border); }
.sg-hero-tag {
  display: inline-block; padding: 4px 10px; border-radius: 99px;
  background: ${primary}; color: ${primaryText}; font-size: 10px;
  font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;
  margin-bottom: 18px;
}
.sg-hero h1 { font-size: clamp(36px, 5vw, 56px); line-height: 1.05; margin-bottom: 12px; }
.sg-hero p { font-size: 16px; color: var(--sg-text-2); max-width: 56ch; line-height: 1.6; }
.sg-hero .sg-meta { display: flex; gap: 12px; margin-top: 18px; font-size: 11px; color: var(--sg-text-3); font-family: ui-monospace, monospace; }
.sg-section { margin-bottom: 64px; scroll-margin-top: 24px; }
.sg-section-head { margin-bottom: 24px; }
.sg-eyebrow {
  display: inline-block; font-family: ui-monospace, monospace; font-size: 10px;
  font-weight: 700; color: ${primary}; letter-spacing: 0.1em; margin-bottom: 8px;
}
.sg-section-head h2 { font-size: 28px; margin-bottom: 6px; letter-spacing: -0.02em; }
.sg-section-head p { font-size: 14px; color: var(--sg-text-2); max-width: 60ch; }
.sg-color-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; }
.sg-color-card {
  background: var(--sg-bg-1); border: 1px solid var(--sg-border);
  border-radius: var(--sg-radius); overflow: hidden; cursor: pointer;
  transition: transform .2s, box-shadow .2s;
}
.sg-color-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,.06); }
.sg-color-swatch {
  aspect-ratio: 4/3; display: flex; align-items: flex-end; justify-content: flex-start;
  padding: 14px; font-family: ui-monospace, monospace; font-size: 11px; font-weight: 600;
}
.sg-color-meta { padding: 12px 14px; }
.sg-color-name { display: block; font-size: 13px; font-weight: 600; }
.sg-color-token { display: block; font-size: 10px; color: var(--sg-text-3); font-family: ui-monospace, monospace; margin-top: 2px; }
.sg-tint-row { display: flex; gap: 4px; border-radius: var(--sg-radius); overflow: hidden; }
.sg-tint-cell { flex: 1; height: 64px; display: flex; align-items: flex-end; justify-content: center; padding-bottom: 8px; font-family: ui-monospace, monospace; font-size: 10px; cursor: pointer; transition: flex .15s; }
.sg-tint-cell:hover { flex: 1.5; }
.sg-state { margin-bottom: 18px; }
.sg-state-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--sg-text-2); margin-bottom: 6px; }
.sg-state-row { display: flex; gap: 3px; border-radius: var(--sg-radius-s); overflow: hidden; }
.sg-state-cell { flex: 1; height: 48px; display: flex; align-items: flex-end; justify-content: center; padding-bottom: 6px; font-family: ui-monospace, monospace; font-size: 9px; }
.sg-font-pair { display: grid; grid-template-columns: 1fr; gap: 16px; margin-bottom: 28px; }
.sg-font-card { background: var(--sg-bg-1); border: 1px solid var(--sg-border); border-radius: var(--sg-radius); padding: 24px; }
.sg-font-label { font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--sg-text-3); margin-bottom: 14px; font-family: ui-monospace, monospace; }
.sg-font-sample { margin-bottom: 12px; line-height: 1.1; letter-spacing: -0.02em; }
.sg-font-sample-s { color: var(--sg-text-2); letter-spacing: 0.04em; }
.sg-type-scale { display: flex; flex-direction: column; gap: 10px; }
.sg-type-row { display: grid; grid-template-columns: 130px 60px 1fr; gap: 14px; align-items: baseline; padding: 12px 0; border-bottom: 1px solid var(--sg-border); }
.sg-type-token { font-family: ui-monospace, monospace; font-size: 11px; color: var(--sg-text-3); }
.sg-type-size { font-family: ui-monospace, monospace; font-size: 11px; color: var(--sg-text-2); font-weight: 600; }
.sg-type-preview { color: var(--sg-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sg-gradient { aspect-ratio: 16/6; border-radius: var(--sg-radius); display: flex; align-items: flex-end; justify-content: flex-end; padding: 18px; color: #fff; font-family: ui-monospace, monospace; font-size: 11px; }
.sg-code-section { background: var(--sg-bg-1); border: 1px solid var(--sg-border); border-radius: var(--sg-radius); padding: 20px; margin-top: 24px; overflow-x: auto; }
.sg-code-section pre { font-family: ui-monospace, monospace; font-size: 12px; line-height: 1.7; color: var(--sg-text); }
.sg-toast { position: fixed; bottom: 24px; right: 24px; background: var(--sg-text); color: var(--sg-bg); padding: 10px 18px; border-radius: var(--sg-radius-s); font-size: 12px; font-weight: 600; opacity: 0; transition: opacity .2s, transform .2s; pointer-events: none; transform: translateY(8px); z-index: 100; }
.sg-toast.show { opacity: 1; transform: translateY(0); }
.sg-theme-toggle { position: fixed; top: 18px; right: 18px; background: var(--sg-bg-1); border: 1px solid var(--sg-border); padding: 7px 14px; border-radius: var(--sg-radius-s); cursor: pointer; font-size: 11px; font-weight: 600; color: var(--sg-text-2); font-family: inherit; z-index: 50; }
.sg-theme-toggle:hover { color: var(--sg-text); border-color: var(--sg-text-3); }
@media (max-width: 800px) {
  body { flex-direction: column; }
  .sg-sidebar { position: relative; width: 100%; height: auto; border-right: none; border-bottom: 1px solid var(--sg-border); }
  .sg-main { padding: 32px 20px; }
}
  </style>
</head>
<body>
  <button class="sg-theme-toggle" onclick="(function(b){var t=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=t;b.textContent=t==='dark'?'Light':'Dark'})(this)">${isDark ? 'Light' : 'Dark'}</button>
  <aside class="sg-sidebar">
    <div class="sg-brand">
      <div class="sg-brand-mark">${projectName.charAt(0).toUpperCase()}</div>
      <h1>${projectName}</h1>
      <span class="sg-brand-sub">Style Guide</span>
      <span class="sg-brand-date">${date}</span>
    </div>
    <div class="sg-nav-label">Sections</div>
    <nav class="sg-nav">
      <a href="#palette" class="active"><span class="num">01</span> Palette</a>
      ${design?.tints?.scale?.length ? '<a href="#tints"><span class="num">02</span> Tints</a>' : ''}
      ${stateShades ? '<a href="#states"><span class="num">03</span> States</a>' : ''}
      <a href="#typography"><span class="num">04</span> Typography</a>
      ${gradStops?.length >= 2 ? '<a href="#gradients"><span class="num">05</span> Gradient</a>' : ''}
      <a href="#tokens"><span class="num">06</span> Tokens</a>
    </nav>
    <div class="sg-sidebar-footer">Generated with UIL4B</div>
  </aside>
  <main class="sg-main">
    <header class="sg-hero">
      <span class="sg-hero-tag">Brand Reference</span>
      <h1>${projectName} Style Guide</h1>
      <p>The complete colour, typography, and token system for this brand — generated from your design choices and ready for production.</p>
      <div class="sg-meta">
        <span>${(design?.palette?.colors || []).length} colours</span>
        <span>·</span>
        <span>${headingFamily} / ${bodyFamily}</span>
        <span>·</span>
        <span>${ts.base}px / ${ts.ratio}×</span>
      </div>
    </header>

    <section id="palette" class="sg-section">
      <div class="sg-section-head">
        <span class="sg-eyebrow">01</span>
        <h2>Palette</h2>
        <p>Brand colours sourced from your chosen harmony. Click any swatch to copy.</p>
      </div>
      <div class="sg-color-grid">
        ${paletteSection}
      </div>
    </section>

    ${tintsSection}
    ${statesSection}
    ${fontsSection}
    ${gradientSection}

    <section id="tokens" class="sg-section">
      <div class="sg-section-head">
        <span class="sg-eyebrow">06</span>
        <h2>Design Tokens</h2>
        <p>Drop these CSS custom properties into your stylesheet.</p>
      </div>
      <div class="sg-code-section">
        <pre>${cssVars.replace(/</g, '&lt;')}</pre>
      </div>
    </section>
  </main>
  <div class="sg-toast" id="sgt"></div>
  <script>
  (function(){
    var t=document.getElementById('sgt'); var tid;
    function show(m){t.textContent=m;t.classList.add('show');clearTimeout(tid);tid=setTimeout(function(){t.classList.remove('show')},1600)}
    document.querySelectorAll('[data-hex]').forEach(function(el){
      el.addEventListener('click',function(){
        var h=el.getAttribute('data-hex'); if(!h) return;
        navigator.clipboard.writeText(h).then(function(){show('Copied '+h)}).catch(function(){show('Copied '+h)})
      })
    });
    var links=document.querySelectorAll('.sg-nav a');
    var sections=document.querySelectorAll('section[id]');
    var io=new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if(e.isIntersecting){links.forEach(function(l){l.classList.toggle('active',l.getAttribute('href')==='#'+e.target.id)})}
      })
    },{rootMargin:'-30% 0px -60% 0px'});
    sections.forEach(function(s){io.observe(s)});
  })();
  </script>
</body>
</html>`
}
