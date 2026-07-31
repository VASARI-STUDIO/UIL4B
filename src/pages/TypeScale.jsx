import { useEffect, useMemo, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import SnapSlider from '../components/SnapSlider'
import FontPicker from '../components/FontPicker'
import UIKitGuide from '../components/UIKitGuide'
import { FontCatalogLoading, FontCatalogNotice } from '../components/FontCatalogState'
import { useFontCatalog } from '../hooks/useFontCatalog'
import { useProject } from '../contexts/ProjectContext'
import { bodyWeight, fontStack, getFontImportUrl, headingWeight, loadFont } from '../utils/googleFonts'
import { consumeScaleDraft, readScaleDraft, setPairDraft } from '../utils/typeHandoff'

// Type Scale Generator — the standalone /typescale page. One base size and one
// ratio generate a whole modular scale, previewed in a real article and handed
// off as CSS custom properties, a Tailwind fontSize map or SCSS variables.
//
// The maths is deliberately the plain modular scale — size = base × ratio^step —
// because that is the thing designers actually reason about, and every value in
// the export can be traced back to two numbers the user set. What the tool adds
// on top is the honest part:
//
//   • ROUNDING is explicit. Unrounded scales produce 40.96px, which no engineer
//     ships; rounding is a decision, so it's a control, not a hidden .toFixed().
//   • The PREVIEW uses the user's real families at their real weights, so a
//     ratio that works for Inter and falls apart under a display face is
//     visible before the tokens are copied.
//   • The scale persists to ProjectContext, so the kit the other tools read is
//     the scale the user actually tuned.
//
// The families come from the Google Fonts catalogue, which is the one part of
// this tool that can fail. It degrades to the bundled list with a visible
// notice and a retry (see useFontCatalog) — the maths, the preview and every
// export keep working either way, so a blocked font host never blanks the page.

const RATIOS = [
  { id: '1.067', label: 'Minor second', value: 1.067 },
  { id: '1.125', label: 'Major second', value: 1.125 },
  { id: '1.2', label: 'Minor third', value: 1.2 },
  { id: '1.25', label: 'Major third', value: 1.25 },
  { id: '1.333', label: 'Perfect fourth', value: 1.333 },
  { id: '1.414', label: 'Augmented fourth', value: 1.414 },
  { id: '1.5', label: 'Perfect fifth', value: 1.5 },
  { id: '1.618', label: 'Golden ratio', value: 1.618 },
  { id: 'custom', label: 'Custom ratio', value: 0 },
]

const ROUNDING = [
  { id: 'none', label: 'Exact (2 decimals)' },
  { id: 'half', label: 'Nearest 0.5px' },
  { id: 'whole', label: 'Whole pixels' },
]

const WIDTHS = [
  { id: 'full', label: 'Desktop', px: null },
  { id: 'tablet', label: 'Tablet', px: 768 },
  { id: 'mobile', label: 'Mobile', px: 375 },
]

const UP_NAMES = ['lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl', '7xl', '8xl']
const DOWN_NAMES = ['sm', 'xs', '2xs', '3xs', '4xs']

const DEFAULTS = {
  base: 16,
  ratio: 1.25,
  custom: 1.333,
  up: 6,
  down: 2,
  lineHeight: 1.5,
  headingTrack: -0.02,
  bodyTrack: 0,
  rounding: 'half',
}

const PANGRAM = 'The quick brown fox jumps over the lazy dog'

// A step's token name. `base` is the anchor; everything above walks lg → 8xl and
// everything below walks sm → 4xs, which is the naming most teams already read
// fluently from Tailwind. Beyond the named runs it falls back to `Nxl`/`Nxs`
// rather than running out of names on a deep scale.
function stepName(exp) {
  if (exp === 0) return 'base'
  if (exp > 0) return UP_NAMES[exp - 1] || `${exp}xl`
  return DOWN_NAMES[-exp - 1] || `${-exp}xs`
}

function roundPx(px, mode) {
  if (mode === 'whole') return Math.round(px)
  if (mode === 'half') return Math.round(px * 2) / 2
  return Math.round(px * 100) / 100
}

// Trim a computed number to a readable literal — 1.5 not 1.5000, 0.875 not
// 0.87500. Exports read like something a person typed.
function trim(n, places = 4) {
  return String(+(+n).toFixed(places))
}

// Write a set of CSS custom properties onto a node. The no-inline-styles route
// for values that are genuinely computed per row (font-size, weight, tracking),
// mirroring TintTool's swatch refs. Inline arrow refs re-run every render, so
// the preview tracks live edits to the sliders.
function varsRef(vars) {
  return (el) => {
    if (!el) return
    for (const key of Object.keys(vars)) el.style.setProperty(key, vars[key])
  }
}

export default function TypeScale({ onCopy, toast }) {
  const navigate = useNavigate()
  const { design, setFonts, setTypeScale } = useProject()
  const { fonts: catalog, status, degraded, online, retry, retrying } = useFontCatalog()

  // A selection handed over from the Font Gallery or Font Pair. Read — never
  // consumed — during render, so a render React throws away can't lose it; the
  // mount effect below empties the slot exactly once. A reload or a direct
  // visit reads nothing and the tool opens on the saved kit instead.
  const carried = readScaleDraft()

  const [base, setBase] = useState(() => carried?.scale?.base ?? design?.typeScale?.base ?? DEFAULTS.base)
  const [ratioId, setRatioId] = useState(() => {
    const r = carried?.scale?.ratio ?? design?.typeScale?.ratio ?? DEFAULTS.ratio
    return RATIOS.find(o => o.value === r)?.id || 'custom'
  })
  const [customRatio, setCustomRatio] = useState(() => carried?.scale?.ratio ?? design?.typeScale?.ratio ?? DEFAULTS.custom)
  const [up, setUp] = useState(DEFAULTS.up)
  const [down, setDown] = useState(DEFAULTS.down)
  const [lineHeight, setLineHeight] = useState(() => design?.typeScale?.lineHeight ?? DEFAULTS.lineHeight)
  const [headingTrack, setHeadingTrack] = useState(() => design?.typeScale?.headingSpacing ?? DEFAULTS.headingTrack)
  const [bodyTrack, setBodyTrack] = useState(() => design?.typeScale?.bodySpacing ?? DEFAULTS.bodyTrack)
  const [rounding, setRounding] = useState(DEFAULTS.rounding)
  const [width, setWidth] = useState('full')
  const [audience, setAudience] = useState('designer')
  const [format, setFormat] = useState('css')

  // The two families the preview and the export use. Seeded from the hand-off,
  // then the saved kit — the tool never opens on a font the user didn't choose.
  const seedHeading = carried?.heading || design?.fonts?.heading
  const seedBody = carried?.body || design?.fonts?.body
  const [headingName, setHeadingName] = useState(() => seedHeading?.family || 'Inter')
  const [bodyName, setBodyName] = useState(() => seedBody?.family || 'Inter')
  const [headingW, setHeadingW] = useState(() => seedHeading?.weight || 700)
  const [bodyW, setBodyW] = useState(() => seedBody?.weight || 400)

  // Commit the hand-off. Effects only run for a committed tree, so the slot
  // empties exactly once — a remount or a second visit inherits nothing.
  useEffect(() => {
    const draft = readScaleDraft()
    if (draft?.heading) toast?.(`Previewing ${draft.heading.family} from your font selection`)
    consumeScaleDraft()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const headingFont = useMemo(
    () => catalog.find(f => f.family === headingName) || null,
    [catalog, headingName],
  )
  const bodyFont = useMemo(
    () => catalog.find(f => f.family === bodyName) || null,
    [catalog, bodyName],
  )

  // Load exactly the two weights the preview renders, so nothing is synthesised.
  useEffect(() => {
    if (headingFont) loadFont(headingFont.family, [headingW])
  }, [headingFont, headingW])
  useEffect(() => {
    if (bodyFont) loadFont(bodyFont.family, [bodyW])
  }, [bodyFont, bodyW])

  const ratio = ratioId === 'custom' ? customRatio : (RATIOS.find(o => o.id === ratioId)?.value || DEFAULTS.ratio)

  const steps = useMemo(() => {
    const out = []
    for (let exp = up; exp >= -down; exp -= 1) {
      const px = roundPx(base * Math.pow(ratio, exp), rounding)
      const isHeading = exp >= 2
      out.push({
        exp,
        name: stepName(exp),
        px,
        rem: +(px / 16).toFixed(4),
        role: isHeading ? 'heading' : 'body',
        weight: isHeading ? headingW : bodyW,
        track: isHeading ? headingTrack : bodyTrack,
        lineHeight: +(px * lineHeight).toFixed(1),
      })
    }
    return out
  }, [base, ratio, up, down, rounding, headingW, bodyW, headingTrack, bodyTrack, lineHeight])

  // Persist from the handlers rather than an effect: an effect that writes on
  // every slider tick both fights the context's own debounce and trips the
  // set-state-in-effect lint rule.
  const persistScale = (patch) => setTypeScale({
    base, ratio, lineHeight, headingSpacing: headingTrack, bodySpacing: bodyTrack, ...patch,
  })

  const changeBase = (v) => { setBase(v); persistScale({ base: v }) }
  const changeRatioId = (id) => {
    setRatioId(id)
    const v = id === 'custom' ? customRatio : RATIOS.find(o => o.id === id)?.value
    if (v) persistScale({ ratio: v })
  }
  const changeCustomRatio = (v) => { setCustomRatio(v); if (ratioId === 'custom') persistScale({ ratio: v }) }
  const changeLineHeight = (v) => { setLineHeight(v); persistScale({ lineHeight: v }) }
  const changeHeadingTrack = (v) => { setHeadingTrack(v); persistScale({ headingSpacing: v }) }
  const changeBodyTrack = (v) => { setBodyTrack(v); persistScale({ bodySpacing: v }) }

  const chooseHeading = (font) => {
    const w = font.variants.includes(headingW) ? headingW : headingWeight(font)
    setHeadingName(font.family)
    setHeadingW(w)
    setFonts({ heading: { family: font.family, weight: w, category: font.category } })
  }
  const chooseBody = (font) => {
    const w = font.variants.includes(bodyW) ? bodyW : bodyWeight(font)
    setBodyName(font.family)
    setBodyW(w)
    setFonts({ body: { family: font.family, weight: w, category: font.category } })
  }
  const chooseHeadingWeight = (w) => {
    setHeadingW(w)
    if (headingFont) setFonts({ heading: { family: headingFont.family, weight: w, category: headingFont.category } })
  }
  const chooseBodyWeight = (w) => {
    setBodyW(w)
    if (bodyFont) setFonts({ body: { family: bodyFont.family, weight: w, category: bodyFont.category } })
  }

  const reset = () => {
    setBase(DEFAULTS.base)
    setRatioId('1.25')
    setCustomRatio(DEFAULTS.custom)
    setUp(DEFAULTS.up)
    setDown(DEFAULTS.down)
    setLineHeight(DEFAULTS.lineHeight)
    setHeadingTrack(DEFAULTS.headingTrack)
    setBodyTrack(DEFAULTS.bodyTrack)
    setRounding(DEFAULTS.rounding)
    persistScale({
      base: DEFAULTS.base,
      ratio: DEFAULTS.ratio,
      lineHeight: DEFAULTS.lineHeight,
      headingSpacing: DEFAULTS.headingTrack,
      bodySpacing: DEFAULTS.bodyTrack,
    })
    toast?.('Scale reset to a 16px major third')
  }

  const headingStack = headingFont ? fontStack(headingFont) : 'var(--font)'
  const bodyStack = bodyFont ? fontStack(bodyFont) : 'var(--font)'

  const importUrl = useMemo(() => {
    const families = []
    if (headingFont) families.push({ family: headingFont.family, weights: [headingW] })
    if (bodyFont && bodyFont.family !== headingFont?.family) families.push({ family: bodyFont.family, weights: [bodyW] })
    else if (bodyFont && bodyFont.family === headingFont?.family && bodyW !== headingW) {
      families[0] = { family: headingFont.family, weights: [...new Set([headingW, bodyW])] }
    }
    return families.length ? getFontImportUrl(families) : null
  }, [headingFont, bodyFont, headingW, bodyW])

  const cssExport = useMemo(() => {
    const lines = steps.map(s => `  --text-${s.name}: ${trim(s.rem)}rem; /* ${s.px}px */`)
    const out = [
      importUrl ? `@import url('${importUrl}');\n` : '',
      ':root {',
      ...lines,
      '',
      `  --leading: ${trim(lineHeight, 3)};`,
      `  --tracking-heading: ${trim(headingTrack, 3)}em;`,
      `  --tracking-body: ${trim(bodyTrack, 3)}em;`,
      headingFont ? `  --font-heading: ${headingStack};` : '',
      bodyFont ? `  --font-body: ${bodyStack};` : '',
      headingFont ? `  --weight-heading: ${headingW};` : '',
      bodyFont ? `  --weight-body: ${bodyW};` : '',
      '}',
    ]
    return out.filter(l => l !== '').join('\n')
  }, [steps, lineHeight, headingTrack, bodyTrack, headingFont, bodyFont, headingStack, bodyStack, headingW, bodyW, importUrl])

  const tailwindExport = useMemo(() => {
    const sizes = steps
      .map(s => `        '${s.name}': ['${trim(s.rem)}rem', { lineHeight: '${trim(lineHeight, 3)}' }],`)
      .join('\n')
    return [
      'module.exports = {',
      '  theme: {',
      '    extend: {',
      '      fontSize: {',
      sizes,
      '      },',
      headingFont || bodyFont ? '      fontFamily: {' : '',
      headingFont ? `        heading: [${headingStack.split(', ').map(p => `'${p.replace(/^'|'$/g, '')}'`).join(', ')}],` : '',
      bodyFont ? `        body: [${bodyStack.split(', ').map(p => `'${p.replace(/^'|'$/g, '')}'`).join(', ')}],` : '',
      headingFont || bodyFont ? '      },' : '',
      '    },',
      '  },',
      '}',
    ].filter(l => l !== '').join('\n')
  }, [steps, lineHeight, headingFont, bodyFont, headingStack, bodyStack])

  const scssExport = useMemo(() => {
    const lines = steps.map(s => `$text-${s.name}: ${trim(s.rem)}rem; // ${s.px}px`)
    return [
      ...lines,
      '',
      `$leading: ${trim(lineHeight, 3)};`,
      `$tracking-heading: ${trim(headingTrack, 3)}em;`,
      `$tracking-body: ${trim(bodyTrack, 3)}em;`,
      headingFont ? `$font-heading: (${headingStack});` : '',
      bodyFont ? `$font-body: (${bodyStack});` : '',
    ].filter(l => l !== '').join('\n')
  }, [steps, lineHeight, headingTrack, bodyTrack, headingFont, bodyFont, headingStack, bodyStack])

  const currentExport = format === 'tailwind' ? tailwindExport : format === 'scss' ? scssExport : cssExport

  const openInFontPair = () => {
    const staged = setPairDraft({
      heading: headingFont
        ? { family: headingFont.family, weight: headingW, category: headingFont.category }
        : null,
      body: bodyFont
        ? { family: bodyFont.family, weight: bodyW, category: bodyFont.category }
        : null,
      scale: { base, ratio },
    })
    if (!staged) { toast?.('Choose a family first — the pairing tool needs somewhere to start.'); return }
    navigate('/fontpairs')
  }

  const handleAudienceKeyDown = (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const next = event.key === 'ArrowLeft' || event.key === 'Home' ? 'designer' : 'developer'
    setAudience(next)
    requestAnimationFrame(() => document.getElementById(`tsc-tab-${next}`)?.focus())
  }

  if (status === 'loading') {
    return (
      <div className="sec tsc-page">
        <FontCatalogLoading label="Opening the Type Scale Generator" />
      </div>
    )
  }

  const previewVars = {
    '--tsc-heading-ff': headingStack,
    '--tsc-body-ff': bodyStack,
    '--tsc-heading-fw': String(headingW),
    '--tsc-body-fw': String(bodyW),
    '--tsc-lh': String(lineHeight),
    '--tsc-heading-ls': `${headingTrack}em`,
    '--tsc-body-ls': `${bodyTrack}em`,
  }
  const activeWidth = WIDTHS.find(w => w.id === width) || WIDTHS[0]

  return (
    <div className="sec tsc-page">
      <header className="tsc-hero">
        <div className="sec-h-eyebrow">Typography system workspace</div>
        <div className="tsc-hero-copy">
          <h1>Type Scale Generator</h1>
          <p>
            Two numbers — a base size and a ratio — generate every size in your
            interface. Tune the curve, read it back in a real layout, then copy a
            complete set of CSS custom properties.
          </p>
        </div>
        <div className="tsc-audience" role="tablist" aria-label="Choose your type scale workflow">
          <button
            type="button"
            role="tab"
            id="tsc-tab-designer"
            aria-selected={audience === 'designer'}
            aria-controls="tsc-audience-panel"
            tabIndex={audience === 'designer' ? 0 : -1}
            className={audience === 'designer' ? 'tsc-audience-tab tsc-audience-tab--on' : 'tsc-audience-tab'}
            onClick={() => setAudience('designer')}
            onKeyDown={handleAudienceKeyDown}
          >
            <span className="tsc-audience-kicker">For designers</span>
            <strong>Preview the hierarchy</strong>
            <span>See the scale as a real page before you commit.</span>
          </button>
          <button
            type="button"
            role="tab"
            id="tsc-tab-developer"
            aria-selected={audience === 'developer'}
            aria-controls="tsc-audience-panel"
            tabIndex={audience === 'developer' ? 0 : -1}
            className={audience === 'developer' ? 'tsc-audience-tab tsc-audience-tab--on' : 'tsc-audience-tab'}
            onClick={() => setAudience('developer')}
            onKeyDown={handleAudienceKeyDown}
          >
            <span className="tsc-audience-kicker">For developers</span>
            <strong>Ship the tokens</strong>
            <span>Copy CSS custom properties, Tailwind or SCSS.</span>
          </button>
        </div>
      </header>

      <FontCatalogNotice
        online={online}
        degraded={degraded}
        onRetry={retry}
        retrying={retrying}
        count={catalog.length}
      />

      <div className="tsc-status" aria-live="polite">
        <span><strong>{steps.length}</strong> size{steps.length === 1 ? '' : 's'}</span>
        <span><strong>{base}px</strong> base</span>
        <span><strong>{trim(ratio, 3)}</strong> ratio</span>
        <span><strong>{steps[0].px}px</strong> largest</span>
        <span><strong>{steps[steps.length - 1].px}px</strong> smallest</span>
      </div>

      <div className="tsc-grid">
        {/* ── Scale + delivery ── */}
        <section className="card tsc-panel tsc-output" aria-labelledby="tsc-output-title">
          <div className="tsc-section-head tsc-section-head--output">
            <span className="tsc-section-num">01</span>
            <div>
              <h2 id="tsc-output-title">Read the scale</h2>
              <p>Every step at its real size, weight and tracking. Select one to copy its declaration.</p>
            </div>
          </div>

          <div className="tsc-width-switch" role="group" aria-label="Preview width">
            {WIDTHS.map(w => (
              <button
                key={w.id}
                type="button"
                className={width === w.id ? 'tsc-width-btn tsc-width-btn--on' : 'tsc-width-btn'}
                aria-pressed={width === w.id}
                onClick={() => setWidth(w.id)}
              >
                {w.label}{w.px ? ` · ${w.px}px` : ''}
              </button>
            ))}
          </div>

          <div
            className={activeWidth.px ? 'tsc-ladder tsc-ladder--clamped' : 'tsc-ladder'}
            ref={varsRef({ ...previewVars, '--tsc-w': activeWidth.px ? `${activeWidth.px}px` : '100%' })}
          >
            {steps.map(s => (
              <button
                key={s.name}
                type="button"
                className="tsc-row"
                onClick={() => onCopy?.(`font-size: ${trim(s.rem)}rem; /* ${s.px}px */\nline-height: ${trim(lineHeight, 3)};\nletter-spacing: ${trim(s.track, 3)}em;`)}
                aria-label={`Copy the ${s.name} step — ${s.px} pixels`}
              >
                <span className="tsc-row-meta">
                  <span className="tsc-row-name">--text-{s.name}</span>
                  <span className="tsc-row-num">{s.px}px · {trim(s.rem)}rem</span>
                  <span className="tsc-row-sub">{s.weight} · {s.lineHeight}px line</span>
                </span>
                <span
                  className={s.role === 'heading' ? 'tsc-row-text tsc-row-text--heading' : 'tsc-row-text'}
                  ref={varsRef({ '--tsc-fs': `${s.px}px` })}
                >
                  {PANGRAM}
                </span>
              </button>
            ))}
          </div>

          <div className="tsc-delivery">
            <div className="tsc-delivery-head">
              <div>
                <span className="tsc-section-num">03</span>
                <div>
                  <h2>{audience === 'designer' ? 'Evaluate the hierarchy' : 'Prepare the handoff'}</h2>
                  <p>
                    {audience === 'designer'
                      ? 'The same scale, laid out as a page — check the jumps actually read.'
                      : `${steps.length} sizes plus leading, tracking and both families, ready to paste.`}
                  </p>
                </div>
              </div>
              <div className="tsc-view-switch" aria-label="Output view">
                <button
                  type="button"
                  className={audience === 'designer' ? 'tsc-view-btn tsc-view-btn--on' : 'tsc-view-btn'}
                  aria-pressed={audience === 'designer'}
                  onClick={() => setAudience('designer')}
                >
                  Design preview
                </button>
                <button
                  type="button"
                  className={audience === 'developer' ? 'tsc-view-btn tsc-view-btn--on' : 'tsc-view-btn'}
                  aria-pressed={audience === 'developer'}
                  onClick={() => setAudience('developer')}
                >
                  Developer handoff
                </button>
              </div>
            </div>

            <div
              id="tsc-audience-panel"
              role="tabpanel"
              aria-labelledby={audience === 'designer' ? 'tsc-tab-designer' : 'tsc-tab-developer'}
            >
              {audience === 'designer' ? (
                <article className="tsc-article" ref={varsRef(previewVars)}>
                  <span className="tsc-article-eyebrow">Article preview</span>
                  <h3 className="tsc-article-h1" ref={varsRef({ '--tsc-fs': `${steps.find(s => s.exp === Math.min(up, 4))?.px || steps[0].px}px` })}>
                    A scale you can defend in a review
                  </h3>
                  <p className="tsc-article-lede" ref={varsRef({ '--tsc-fs': `${steps.find(s => s.exp === 1)?.px || base}px` })}>
                    Every size below comes from {base}px multiplied by {trim(ratio, 3)}. Nothing is
                    hand-picked, so the rhythm holds when the page grows.
                  </p>
                  <h4 className="tsc-article-h2" ref={varsRef({ '--tsc-fs': `${steps.find(s => s.exp === 2)?.px || base}px` })}>
                    Where the jumps matter
                  </h4>
                  <p className="tsc-article-body" ref={varsRef({ '--tsc-fs': `${base}px` })}>
                    A ratio that looks elegant in isolation can flatten a page: if the step between
                    body copy and a subheading is too small, the hierarchy stops doing its job.
                    Read this paragraph at each preview width before you copy the tokens.
                  </p>
                  <p className="tsc-article-small" ref={varsRef({ '--tsc-fs': `${steps.find(s => s.exp === -1)?.px || base}px` })}>
                    Captions and helper text live down here — check they are still comfortably legible.
                  </p>
                </article>
              ) : (
                <div className="tsc-developer-view">
                  <div className="tsc-code-meta">
                    <div>
                      <span className="seg-label">Export format</span>
                      <div className="tsc-fmt" role="group" aria-label="Export format">
                        {[['css', 'CSS variables'], ['tailwind', 'Tailwind'], ['scss', 'SCSS']].map(([id, label]) => (
                          <button
                            key={id}
                            type="button"
                            className={format === id ? 'tsc-fmt-btn tsc-fmt-btn--on' : 'tsc-fmt-btn'}
                            aria-pressed={format === id}
                            onClick={() => setFormat(id)}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="tsc-code-actions">
                      {importUrl && (
                        <button type="button" className="tsc-copy-all" onClick={() => onCopy?.(importUrl)}>
                          Copy font import
                        </button>
                      )}
                      <button type="button" className="tsc-copy-primary" onClick={() => onCopy?.(currentExport)}>
                        Copy {format === 'css' ? 'CSS' : format === 'tailwind' ? 'config' : 'SCSS'}
                      </button>
                    </div>
                  </div>
                  <pre id="tsc-export" className="tsc-export" tabIndex="0"><code>{currentExport}</code></pre>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── Controls ── */}
        <section className="card tsc-panel tsc-config" aria-labelledby="tsc-config-title">
          <div className="tsc-section-head">
            <span className="tsc-section-num">02</span>
            <div>
              <h2 id="tsc-config-title">Tune the scale</h2>
              <p>Two numbers drive every size. Everything else is presentation.</p>
            </div>
          </div>

          <label className="seg-label" htmlFor="tsc-ratio">Scale ratio</label>
          <select
            id="tsc-ratio"
            className="tsc-select"
            value={ratioId}
            onChange={e => changeRatioId(e.target.value)}
          >
            {RATIOS.map(r => (
              <option key={r.id} value={r.id}>
                {r.label}{r.value ? ` — ${r.value}` : ''}
              </option>
            ))}
          </select>
          {ratioId === 'custom' && (
            <div className="tsc-slider-row">
              <div className="tsc-slider-head">
                <label className="seg-label" htmlFor="tsc-custom">Custom ratio</label>
              </div>
              <SnapSlider
                id="tsc-custom"
                min={1.05}
                max={2}
                step={0.001}
                decimals={3}
                value={customRatio}
                defaultValue={DEFAULTS.custom}
                snaps={[1.125, 1.25, 1.333, 1.5, 1.618]}
                snapRadius={0.012}
                inputMin={1.01}
                inputMax={3}
                onChange={changeCustomRatio}
                ariaLabel="Custom scale ratio"
              />
            </div>
          )}
          <p className="typ-hint">
            Smaller ratios keep long pages calm; anything past a perfect fifth needs
            room to breathe or the headings start shouting.
          </p>

          <div className="tsc-slider-row">
            <div className="tsc-slider-head">
              <label className="seg-label" htmlFor="tsc-base">Base size</label>
            </div>
            <SnapSlider
              id="tsc-base"
              min={10}
              max={28}
              value={base}
              defaultValue={DEFAULTS.base}
              snaps={[14, 16, 18, 20]}
              unit="px"
              inputMin={8}
              inputMax={40}
              onChange={changeBase}
              ariaLabel="Base font size in pixels"
            />
          </div>

          <div className="tsc-slider-row">
            <div className="tsc-slider-head">
              <label className="seg-label" htmlFor="tsc-up">Steps above base</label>
            </div>
            <SnapSlider
              id="tsc-up"
              min={1}
              max={9}
              value={up}
              defaultValue={DEFAULTS.up}
              snaps={[3, 6, 9]}
              onChange={setUp}
              ariaLabel="Number of steps above the base size"
            />
          </div>
          <div className="tsc-slider-row">
            <div className="tsc-slider-head">
              <label className="seg-label" htmlFor="tsc-down">Steps below base</label>
            </div>
            <SnapSlider
              id="tsc-down"
              min={0}
              max={5}
              value={down}
              defaultValue={DEFAULTS.down}
              snaps={[0, 2, 4]}
              onChange={setDown}
              ariaLabel="Number of steps below the base size"
            />
          </div>

          <div className="tsc-slider-row">
            <div className="tsc-slider-head">
              <label className="seg-label" htmlFor="tsc-leading">Line height</label>
            </div>
            <SnapSlider
              id="tsc-leading"
              min={1}
              max={2.2}
              step={0.01}
              decimals={2}
              value={lineHeight}
              defaultValue={DEFAULTS.lineHeight}
              snaps={[1.2, 1.4, 1.5, 1.6, 1.75]}
              snapRadius={0.03}
              onChange={changeLineHeight}
              ariaLabel="Line height multiplier"
            />
          </div>
          <div className="tsc-slider-row">
            <div className="tsc-slider-head">
              <label className="seg-label" htmlFor="tsc-htrack">Heading tracking</label>
            </div>
            <SnapSlider
              id="tsc-htrack"
              min={-0.06}
              max={0.12}
              step={0.005}
              decimals={3}
              value={headingTrack}
              defaultValue={DEFAULTS.headingTrack}
              snaps={[-0.04, -0.02, 0, 0.04]}
              snapRadius={0.006}
              unit="em"
              onChange={changeHeadingTrack}
              ariaLabel="Letter spacing for heading sizes"
            />
          </div>
          <div className="tsc-slider-row">
            <div className="tsc-slider-head">
              <label className="seg-label" htmlFor="tsc-btrack">Body tracking</label>
            </div>
            <SnapSlider
              id="tsc-btrack"
              min={-0.03}
              max={0.08}
              step={0.002}
              decimals={3}
              value={bodyTrack}
              defaultValue={DEFAULTS.bodyTrack}
              snaps={[-0.01, 0, 0.02]}
              snapRadius={0.004}
              unit="em"
              onChange={changeBodyTrack}
              ariaLabel="Letter spacing for body sizes"
            />
          </div>

          <label className="seg-label" htmlFor="tsc-round">Rounding</label>
          <select
            id="tsc-round"
            className="tsc-select"
            value={rounding}
            onChange={e => setRounding(e.target.value)}
          >
            {ROUNDING.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
          <p className="typ-hint">
            An unrounded modular scale produces values like 40.96px. Rounding is a
            decision — make it here rather than in the stylesheet.
          </p>

          <div className="tsc-fonts">
            <span className="tsc-fonts-title">Preview families</span>
            <FontPicker
              label="Heading family"
              fonts={catalog}
              value={headingFont}
              onChange={chooseHeading}
            />
            {headingFont && (
              <div className="tsc-weights" role="group" aria-label="Heading weight">
                {headingFont.variants.map(w => (
                  <button
                    key={w}
                    type="button"
                    className={headingW === w ? 'tsc-weight tsc-weight--on' : 'tsc-weight'}
                    aria-pressed={headingW === w}
                    onClick={() => chooseHeadingWeight(w)}
                  >
                    {w}
                  </button>
                ))}
              </div>
            )}
            <FontPicker
              label="Body family"
              fonts={catalog}
              value={bodyFont}
              onChange={chooseBody}
            />
            {bodyFont && (
              <div className="tsc-weights" role="group" aria-label="Body weight">
                {bodyFont.variants.map(w => (
                  <button
                    key={w}
                    type="button"
                    className={bodyW === w ? 'tsc-weight tsc-weight--on' : 'tsc-weight'}
                    aria-pressed={bodyW === w}
                    onClick={() => chooseBodyWeight(w)}
                  >
                    {w}
                  </button>
                ))}
              </div>
            )}
            <button type="button" className="tsc-handoff" onClick={openInFontPair}>
              Find a pairing for these &rarr;
            </button>
          </div>

          <button type="button" className="tsc-reset" onClick={reset}>
            Reset scale
          </button>
        </section>
      </div>

      {/* Cross-links keep the standalone page part of the typography suite. */}
      <nav className="tsc-more" aria-label="More typography tools">
        <div>
          <span className="tsc-more-kicker">Continue your typography system</span>
          <strong>A scale is half the system — the families carry the rest.</strong>
        </div>
        <div className="tsc-more-links">
          <NavLink to="/fontpairs" className="tsc-more-link">Pair two families &rarr;</NavLink>
          <NavLink to="/fontgallery" className="tsc-more-link">Browse the font gallery &rarr;</NavLink>
          <NavLink to="/color/palette" className="tsc-more-link">Build a colour palette &rarr;</NavLink>
        </div>
      </nav>

      {/* Step 3 of the guided UI-kit flow (colour → fonts → type scale → icons). */}
      <UIKitGuide step="typescale" />
    </div>
  )
}
