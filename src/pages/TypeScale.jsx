import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SnapSlider from '../components/SnapSlider'
import FontPicker from '../components/FontPicker'
import UIKitGuide from '../components/UIKitGuide'
import SaveTypeSystem from '../components/SaveTypeSystem'
import { FontCatalogLoading, FontCatalogNotice } from '../components/FontCatalogState'
import {
  ToolLayout, ToolButton, ToolGrid, ToolMain, ToolPanel, ToolSection, ToolIcon,
} from '../components/tool/ToolLayout'
import { useFontCatalog } from '../hooks/useFontCatalog'
import { useProject } from '../contexts/ProjectContext'
import { bodyWeight, fontStack, getFontImportUrl, headingWeight, loadFont } from '../utils/googleFonts'
import { consumeScaleDraft, readScaleDraft, setPairDraft } from '../utils/typeHandoff'
import { fitTypePreviewSize, typePreviewNeedsFitting } from '../utils/typeScalePreview'
import { FLUID_VIEWPORTS, fluidClamp, sizeAtViewport, stepName, stepPx } from '../utils/fluidType'
// The shared sheets for the font picker, the catalogue notice, the slider and
// the loader, then the page's own sheet, scoped under `.tsc-page`.
import '../styles/deferred/tool-shell.css'
import '../styles/deferred/type.css'
import '../styles/pages/type-scale.css'

// Type Scale Generator — the standalone /create/type-scale page. One base size and one
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

// The musical intervals are the canonical set (they are what type-scale.com
// offers, and what most articles on the subject name). They were also the ONLY
// thing offered here — which left out both ends of what real web work uses:
//
//   • Dense product UI and dashboards routinely run TIGHTER than 1.067. Those
//     scales are not musical, they are practical — you want six usable steps
//     inside ~11-24px and a 1.2 ratio blows past that by the third step.
//   • Editorial and marketing pages run LOOSER than the golden ratio, and the
//     octave in particular is a standard step this list stopped just short of.
//
// `hint` says where each one actually suits, because "Augmented fourth" tells a
// designer nothing about whether to pick it. Descriptive, not a claim about any
// specific framework — Tailwind, Material and Bootstrap all ship hand-tuned
// step lists rather than a single ratio, so naming one here would be false.
const RATIOS = [
  { id: '1.067', label: 'Minor second', value: 1.067, hint: 'Very tight — data-dense tables' },
  { id: '1.1', label: 'Tight', value: 1.1, hint: 'Dashboards and admin UI' },
  { id: '1.125', label: 'Major second', value: 1.125, hint: 'Compact product UI' },
  { id: '1.2', label: 'Minor third', value: 1.2, hint: 'A safe default for apps' },
  { id: '1.25', label: 'Major third', value: 1.25, hint: 'The common web default' },
  { id: '1.333', label: 'Perfect fourth', value: 1.333, hint: 'Marketing and landing pages' },
  { id: '1.414', label: 'Augmented fourth', value: 1.414, hint: 'Editorial, print-like' },
  { id: '1.5', label: 'Perfect fifth', value: 1.5, hint: 'Bold, display-led layouts' },
  { id: '1.618', label: 'Golden ratio', value: 1.618, hint: 'Dramatic — few steps' },
  { id: '2', label: 'Octave', value: 2, hint: 'Poster scale — two or three steps only' },
  { id: 'custom', label: 'Custom ratio', value: 0, hint: 'Set your own' },
]

const ROUNDING = [
  { id: 'none', label: 'Exact (2 decimals)' },
  { id: 'half', label: 'Nearest 0.5px' },
  { id: 'whole', label: 'Whole pixels' },
]

// The preview breakpoints. `vw` is the viewport width each one REPRESENTS —
// previously these only resized the preview container while every step kept its
// desktop size, so the control implied a per-breakpoint scale the tool did not
// have. Now the ladder resolves each step at this width, so what you see is
// what the exported clamp() actually computes there.
const WIDTHS = [
  { id: 'full', label: 'Desktop', px: null, vw: FLUID_VIEWPORTS.max },
  { id: 'tablet', label: 'Tablet', px: 768, vw: 768 },
  { id: 'mobile', label: 'Mobile', px: 375, vw: FLUID_VIEWPORTS.min },
]


const DEFAULTS = {
  base: 16,
  // The mobile anchor. Slightly smaller base, and the ratio is chosen separately
  // (see mobileRatioId) rather than shared — see the state comment for why one
  // ratio across both breakpoints cannot work.
  mobileBase: 15,
  ratio: 1.25,
  custom: 1.333,
  up: 6,
  down: 2,
  lineHeight: 1.5,
  headingTrack: -0.02,
  bodyTrack: 0,
  rounding: 'half',
}

// The default specimen. It is the SAME string on every row, and that is a
// decision rather than an oversight: a scale is judged by holding the text
// constant and letting only the size vary, which is what makes two adjacent
// steps comparable at a glance. #327 examined this and kept it; this change
// does not overturn it. What it adds is the ability to swap the string for
// your own words — see `sample` — which is the part that was missing.
const PANGRAM = 'The quick brown fox jumps over the lazy dog'

// (stepName lived here. It is now in utils/fluidType.js beside stepPx, because
// the homepage workbench's Typography preview labels its steps with the same
// token names this page exports — and two copies of a naming table is how a
// preview and an export come to disagree about what a step is called.)

// (roundPx lived here. It is now `stepPx` in utils/fluidType.js, so the two
// breakpoint ladders and their clamp() are all rounded by one function that the
// unit suite can reach without a browser.)

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

// `onExport` is this tool's ONE declared export hook — the copy of the whole
// scale as CSS, SCSS or a Tailwind config. Copying one step's font-size or the
// Google Fonts import URL stays on `onCopy`: those are lookups, not a finished
// type scale. See src/config/activationExports.js.
export default function TypeScale({ onCopy, onExport = onCopy, toast }) {
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
  // The MOBILE end of the scale. `base`/`ratio` above are the desktop end.
  //
  // These exist because the tool used to generate one ladder and only narrow
  // the preview container, so an h1 was the same size on a 375px phone as on a
  // 1440px desktop — which is not how any real design system behaves, and not
  // what a control labelled "Mobile / Tablet / Desktop" appeared to promise.
  // A ratio compounds: at 1.333 the sixth step is 5.6× the base, and 5.6× of
  // anything is too big for a phone. So mobile needs its own smaller base AND
  // its own gentler ratio; one number cannot fix it.
  const [mobileBase, setMobileBase] = useState(DEFAULTS.mobileBase)
  const [mobileRatioId, setMobileRatioId] = useState('1.2')
  const [mobileCustomRatio, setMobileCustomRatio] = useState(DEFAULTS.custom)
  // Fluid joins the two ends with clamp(); fixed emits per-breakpoint values in
  // media queries. Fluid is the default because it is what the founder chose
  // and what avoids a visible step on resize, but the choice is real — a team
  // with strict per-breakpoint specs needs the other one.
  const [fluid, setFluid] = useState(true)
  const [width, setWidth] = useState('full')
  const [audience, setAudience] = useState('designer')
  const [format, setFormat] = useState('css')
  // THE WORDS IN THE PREVIEW. Empty means the pangram below.
  //
  // This tool judged type with a string the visitor could not change, while the
  // homepage panel that mirrors it — HomeWorkbench's Typography tab — has
  // carried a "Preview text" input all along, and so has Font Pair. The tool
  // whose entire job is deciding whether a size is usable was the only one of
  // the three that would not show you your own words at it.
  //
  // One string drives BOTH previews — the ladder and the article heading below
  // it — because they are two views of one decision, and two preview-text boxes
  // is how they would come to disagree.
  const [sample, setSample] = useState('')
  // The fine-tuning disclosure. Closed on arrival: the two numbers that make a
  // modular scale are the base and the ratio, and every other control here
  // adjusts a scale that already exists. See the rail comment for the count.
  const [tuning, setTuning] = useState(false)

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

  const mobileRatio = mobileRatioId === 'custom'
    ? mobileCustomRatio
    : (RATIOS.find(o => o.id === mobileRatioId)?.value || 1.2)

  // The viewport width the preview REPRESENTS — the number the fluid maths is
  // evaluated at. Declared here rather than beside `activeWidth` further down
  // because `steps` depends on it.
  const previewVw = (WIDTHS.find(w => w.id === width) || WIDTHS[0]).vw

  // Every step now carries BOTH ends of the scale and the clamp that joins
  // them. `px` stays the desktop size so every existing consumer (the ladder
  // labels, the Tailwind/SCSS exports, the saved kit) keeps reading the same
  // field and means the same thing by it; `mobilePx` and `css` are additive.
  //
  // `previewPx` is what the step ACTUALLY resolves to at the width the user is
  // previewing — read from the same fluidType helpers the export is built from,
  // so the preview cannot drift from the CSS that gets copied.
  const steps = useMemo(() => {
    const out = []
    for (let exp = up; exp >= -down; exp -= 1) {
      const px = stepPx(base, ratio, exp, rounding)
      const mobilePx = stepPx(mobileBase, mobileRatio, exp, rounding)
      const isHeading = exp >= 2
      const clamped = fluidClamp(mobilePx, px)
      const previewPx = fluid
        ? sizeAtViewport(mobilePx, px, previewVw)
        : (previewVw <= 768 ? mobilePx : px)
      out.push({
        exp,
        name: stepName(exp),
        px,
        mobilePx,
        previewPx,
        css: clamped.css,
        isFluid: clamped.fluid,
        rem: +(px / 16).toFixed(4),
        mobileRem: +(mobilePx / 16).toFixed(4),
        role: isHeading ? 'heading' : 'body',
        weight: isHeading ? headingW : bodyW,
        track: isHeading ? headingTrack : bodyTrack,
        lineHeight: +(previewPx * lineHeight).toFixed(1),
      })
    }
    return out
  }, [base, ratio, mobileBase, mobileRatio, fluid, previewVw, up, down, rounding, headingW, bodyW, headingTrack, bodyTrack, lineHeight])
  const previewIsFitted = typePreviewNeedsFitting(steps)

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
    setSample('')
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
    // FLUID: one clamp per step, interpolating between the mobile and desktop
    // ladders across the viewport range. FIXED: the mobile ladder as the base
    // and a single media query carrying the desktop one — which is what a team
    // with strict per-breakpoint specs actually needs, and is mobile-first, so
    // the smaller values are the default rather than an override.
    const lines = fluid
      ? steps.map(s => `  --text-${s.name}: ${s.css}; /* ${s.mobilePx}px → ${s.px}px */`)
      : steps.map(s => `  --text-${s.name}: ${trim(s.mobileRem)}rem; /* ${s.mobilePx}px */`)
    const desktopBlock = fluid ? [] : [
      '',
      `@media (min-width: ${FLUID_VIEWPORTS.max}px) {`,
      '  :root {',
      ...steps.map(s => `    --text-${s.name}: ${trim(s.rem)}rem; /* ${s.px}px */`),
      '  }',
      '}',
    ]
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
      ...desktopBlock,
    ]
    return out.filter(l => l !== '').join('\n')
  }, [steps, fluid, lineHeight, headingTrack, bodyTrack, headingFont, bodyFont, headingStack, bodyStack, headingW, bodyW, importUrl])

  const tailwindExport = useMemo(() => {
    // Tailwind takes the clamp directly — an arbitrary value in a fontSize map
    // is valid and is how fluid type is done there, so the theme carries the
    // same behaviour the CSS export does rather than a desktop-only snapshot.
    const sizes = steps
      .map(s => `        '${s.name}': ['${fluid ? s.css : `${trim(s.rem)}rem`}', { lineHeight: '${trim(lineHeight, 3)}' }],`)
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
  }, [steps, fluid, lineHeight, headingFont, bodyFont, headingStack, bodyStack])

  const scssExport = useMemo(() => {
    const lines = steps.map(s => (fluid
      ? `$text-${s.name}: ${s.css}; // ${s.mobilePx}px → ${s.px}px`
      : `$text-${s.name}: ${trim(s.rem)}rem; // ${s.px}px`))
    return [
      ...lines,
      '',
      `$leading: ${trim(lineHeight, 3)};`,
      `$tracking-heading: ${trim(headingTrack, 3)}em;`,
      `$tracking-body: ${trim(bodyTrack, 3)}em;`,
      headingFont ? `$font-heading: (${headingStack});` : '',
      bodyFont ? `$font-body: (${bodyStack});` : '',
    ].filter(l => l !== '').join('\n')
  }, [steps, fluid, lineHeight, headingTrack, bodyTrack, headingFont, bodyFont, headingStack, bodyStack])

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
    navigate('/create/font-pair')
  }

  const handleAudienceKeyDown = (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const next = event.key === 'ArrowLeft' || event.key === 'Home' ? 'designer' : 'developer'
    setAudience(next)
    requestAnimationFrame(() => document.getElementById(`tsc-tab-${next}`)?.focus())
  }

  const formatLabel = format === 'css' ? 'CSS' : format === 'tailwind' ? 'config' : 'SCSS'

  // The toolbar's actions exist in every state so the row keeps its shape
  // while the catalogue loads.
  const items = [
    {
      id: 'reset',
      priority: 1,
      render: () => (
        <ToolButton icon="arrow-counter-clockwise" collapse className="tsc-reset" onClick={reset}>Reset scale</ToolButton>
      ),
      menu: { label: 'Reset scale', icon: 'arrow-counter-clockwise', onSelect: reset },
    },
    {
      id: 'pair',
      priority: 0,
      render: () => (
        <ToolButton icon="caret-right" className="tsc-handoff" onClick={openInFontPair} aria-label="Find a pairing for these families">
          Find a pairing
        </ToolButton>
      ),
      menu: { label: 'Find a pairing for these families', icon: 'caret-right', onSelect: openInFontPair },
    },
    { id: 'div', divider: true, align: 'end' },
    {
      id: 'import',
      priority: 2,
      render: () => (
        <ToolButton className="tsc-copy-all" onClick={() => importUrl && onCopy?.(importUrl)} disabled={!importUrl}>Copy font import</ToolButton>
      ),
      menu: { label: 'Copy font import', icon: 'copy', onSelect: () => importUrl && onCopy?.(importUrl), disabled: !importUrl },
    },
  ]
  const primary = (
    <ToolButton variant="accent" icon="copy" iconSize={14} className="tsc-copy-primary" onClick={() => onExport?.(currentExport)}>
      {`Copy ${formatLabel}`}
    </ToolButton>
  )
  const layout = (body) => (
    <ToolLayout className="tsc-page" title="Type Scale" titleId="tsc-title" items={items} primary={primary}>
      {body}
    </ToolLayout>
  )

  if (status === 'loading') return layout(<FontCatalogLoading label="Opening the Type Scale Generator" />)

  // The string every preview on the page is set in. Trimmed, because a space
  // typed and deleted is not a choice to preview a space.
  const specimen = sample.trim() || PANGRAM

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
  const ratioHint = RATIOS.find(r => r.id === ratioId)?.hint

  const weightButtons = (font, value, onPick, label) => (
    <div className="tsc-weights tl-pills" role="group" aria-label={label}>
      {font.variants.map(w => (
        <button
          key={w}
          type="button"
          className={value === w ? 'tsc-weight tl-pill tl-pill--mono is-on' : 'tsc-weight tl-pill tl-pill--mono'}
          aria-pressed={value === w}
          onClick={() => onPick(w)}
        >
          {w}
        </button>
      ))}
    </div>
  )

  return layout(
    <>
      <FontCatalogNotice
        online={online}
        degraded={degraded}
        onRetry={retry}
        retrying={retrying}
        count={catalog.length}
      />

      <ToolGrid className="tsc-grid">
        {/* ── The output leads: the scale, stated as base × ratio, then every
            step at its real size. First in the source, so a phone opens on
            it; the controls follow in the side panel. ── */}
        <ToolMain className="tsc-output">
          <section className="tsc-card" aria-labelledby="tsc-output-title">
            <h2 id="tsc-output-title" className="sr-only">Read the scale</h2>

            {/* The two numbers that ARE a modular scale sit directly above
                the ladder they drive, at every width. */}
            <div className="tsc-scale-bar" role="group" aria-label="The scale">
              <div className="tsc-scale-term">
                <label className="tl-sec-label" htmlFor="tsc-base">Base size</label>
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
              <span className="tsc-scale-x" aria-hidden="true">&times;</span>
              <div className="tsc-scale-term tsc-scale-term--ratio">
                <label className="tl-sec-label" htmlFor="tsc-ratio">Scale ratio</label>
                <select
                  id="tsc-ratio"
                  className="tsc-select tsc-scale-select"
                  value={ratioId}
                  onChange={e => changeRatioId(e.target.value)}
                >
                  {RATIOS.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.label}{r.value ? ` — ${r.value}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              {ratioId === 'custom' && (
                <div className="tsc-scale-term tsc-scale-custom">
                  <label className="tl-sec-label" htmlFor="tsc-custom">Custom ratio</label>
                  <SnapSlider
                    id="tsc-custom"
                    min={1.05}
                    max={2}
                    step={0.001}
                    decimals={3}
                    value={customRatio}
                    defaultValue={DEFAULTS.custom}
                    snaps={[1.1, 1.125, 1.2, 1.25, 1.333, 1.5, 1.618, 2]}
                    snapRadius={0.012}
                    inputMin={1.01}
                    inputMax={3}
                    onChange={changeCustomRatio}
                    ariaLabel="Custom scale ratio"
                  />
                </div>
              )}
            </div>

            {/* The result of the two terms above, and which end of the scale
                the ladder is showing. */}
            <div className="tsc-ladder-head">
              <p className="tsc-scale-out" aria-live="polite">
                <strong>{steps.length} step{steps.length === 1 ? '' : 's'}</strong>
                <span className="tsc-scale-range">
                  {steps[steps.length - 1].px}px – {steps[0].px}px
                </span>
                {ratioHint && <span className="tsc-scale-hint">{ratioHint}</span>}
              </p>
              <div className="tsc-width-switch tl-pills" role="group" aria-label="Preview width">
                {WIDTHS.map(w => (
                  <button
                    key={w.id}
                    type="button"
                    className={width === w.id ? 'tsc-width-btn tl-pill is-on' : 'tsc-width-btn tl-pill'}
                    aria-pressed={width === w.id}
                    onClick={() => setWidth(w.id)}
                  >
                    {w.label}{w.px ? ` · ${w.px}px` : ''}
                  </button>
                ))}
              </div>
            </div>

            <div
              className={activeWidth.px ? 'tsc-ladder tsc-ladder--clamped' : 'tsc-ladder'}
              ref={varsRef({ ...previewVars, '--tsc-w': activeWidth.px ? `${activeWidth.px}px` : '100%' })}
            >
              {previewIsFitted && (
                <p className="tsc-fit-note" role="status">
                  Preview sizes are fitted between 8px and 96px to keep the preview usable. Labels and exports retain the exact scale.
                </p>
              )}
              {steps.map(s => (
                <button
                  key={s.name}
                  type="button"
                  className="tsc-row"
                  onClick={() => onCopy?.(`font-size: ${fluid ? s.css : `${trim(s.rem)}rem`};${fluid ? ` /* ${s.mobilePx}px → ${s.px}px */` : ` /* ${s.px}px */`}\nline-height: ${trim(lineHeight, 3)};\nletter-spacing: ${trim(s.track, 3)}em;`)}
                  aria-label={`Copy the ${s.name} step — ${s.mobilePx} pixels on mobile, ${s.px} pixels on desktop`}
                >
                  <span className="tsc-row-meta">
                    <span className="tsc-row-name">--text-{s.name}</span>
                    {/* The size at the previewed width, with the mobile →
                        desktop range under it so both ends stay visible. */}
                    <span className="tsc-row-num">{s.previewPx}px · {trim(+(s.previewPx / 16).toFixed(4))}rem</span>
                    <span className="tsc-row-sub">
                      {s.mobilePx !== s.px ? `${s.mobilePx} → ${s.px}px · ` : ''}{s.weight} · {s.lineHeight}px line
                    </span>
                  </span>
                  <span
                    className={s.role === 'heading' ? 'tsc-row-text tsc-row-text--heading' : 'tsc-row-text'}
                    ref={varsRef({ '--tsc-fs': `${fitTypePreviewSize(s.previewPx)}px` })}
                  >
                    {specimen}
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="tsc-delivery" aria-labelledby="tsc-delivery-title">
            <div className="tsc-delivery-head">
              <h2 id="tsc-delivery-title">{audience === 'designer' ? 'Evaluate the hierarchy' : 'Prepare the handoff'}</h2>
              {/* The one control for `audience`: a tablist directly above the
                  panel it switches. */}
              <div className="tsc-view-switch tl-pills" role="tablist" aria-label="Output view">
                {[['designer', 'Design preview'], ['developer', 'Developer handoff']].map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    id={`tsc-tab-${id}`}
                    aria-selected={audience === id}
                    aria-controls="tsc-audience-panel"
                    tabIndex={audience === id ? 0 : -1}
                    className={audience === id ? 'tsc-view-btn tl-pill is-on' : 'tsc-view-btn tl-pill'}
                    onClick={() => setAudience(id)}
                    onKeyDown={handleAudienceKeyDown}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <p className="tsc-delivery-note">
              {audience === 'designer'
                ? 'The same scale, laid out as a page — check the jumps actually read.'
                : `${steps.length} sizes plus leading, tracking and both families, ready to paste.`}
            </p>

            <div
              id="tsc-audience-panel"
              role="tabpanel"
              aria-labelledby={audience === 'designer' ? 'tsc-tab-designer' : 'tsc-tab-developer'}
            >
              {audience === 'designer' ? (
                <article className="tsc-article" ref={varsRef(previewVars)}>
                  <h3 className="tsc-article-h1" ref={varsRef({ '--tsc-fs': `${fitTypePreviewSize(steps.find(s => s.exp === Math.min(up, 4))?.px || steps[0].px, { max: 72 })}px` })}>
                    {sample.trim() || 'A page set on this scale'}
                  </h3>
                  <p className="tsc-article-lede" ref={varsRef({ '--tsc-fs': `${fitTypePreviewSize(steps.find(s => s.exp === 1)?.px || base, { max: 28 })}px` })}>
                    Every size below comes from {base}px multiplied by {trim(ratio, 3)}. Nothing is
                    hand-picked, so the rhythm holds when the page grows.
                  </p>
                  <h4 className="tsc-article-h2" ref={varsRef({ '--tsc-fs': `${fitTypePreviewSize(steps.find(s => s.exp === 2)?.px || base, { max: 48 })}px` })}>
                    Where the jumps matter
                  </h4>
                  <p className="tsc-article-body" ref={varsRef({ '--tsc-fs': `${fitTypePreviewSize(base, { max: 24 })}px` })}>
                    A ratio that looks elegant in isolation can flatten a page: if the step between
                    body copy and a subheading is too small, the hierarchy stops doing its job.
                  </p>
                  <p className="tsc-article-small" ref={varsRef({ '--tsc-fs': `${fitTypePreviewSize(steps.find(s => s.exp === -1)?.px || base, { max: 18 })}px` })}>
                    Captions and helper text live down here — check they are still comfortably legible.
                  </p>
                </article>
              ) : (
                <div className="tsc-developer-view">
                  <div className="tsc-fmt tl-pills" role="group" aria-label="Export format">
                    {[['css', 'CSS variables'], ['tailwind', 'Tailwind'], ['scss', 'SCSS']].map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        className={format === id ? 'tsc-fmt-btn tl-pill is-on' : 'tsc-fmt-btn tl-pill'}
                        aria-pressed={format === id}
                        onClick={() => setFormat(id)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <pre id="tsc-export" className="tl-code tsc-export" tabIndex={0} aria-label={`Type scale as ${formatLabel}`}><code>{currentExport}</code></pre>
                </div>
              )}
            </div>

            {/* Outside the tabpanel, so the save exists for both views. The
                controls above work signed out; keeping the scale in a project
                is the step that asks for an account. */}
            <div className="tsc-keep">
              <SaveTypeSystem
                gate="type-save-type-scale"
                label="this type scale"
                summary={`${trim(base)}px base on a ${trim(ratio, 3)} ratio, ${headingName} and ${bodyName}.`}
                toast={toast}
              />
              <p className="tsc-keep-note">
                Keeps the scale and both families with the project’s palette and tokens.
              </p>
            </div>
          </section>
        </ToolMain>

        {/* ── The panel: the words, the families, and everything else behind
            one disclosure. Every control keeps its id, label and maths. ── */}
        <ToolPanel label="Type Scale controls" className="tsc-panel tsc-config">
          <ToolSection>
            <label className="tl-sec-label" htmlFor="tsc-sample">Preview text</label>
            <input
              id="tsc-sample"
              type="text"
              className="tsc-sample-input"
              value={sample}
              maxLength={60}
              placeholder={PANGRAM}
              autoComplete="off"
              onChange={e => setSample(e.target.value)}
            />
          </ToolSection>

          <ToolSection>
            <FontPicker
              label="Heading family"
              fonts={catalog}
              value={headingFont}
              onChange={chooseHeading}
            />
            {headingFont && weightButtons(headingFont, headingW, chooseHeadingWeight, 'Heading weight')}
            <FontPicker
              label="Body family"
              fonts={catalog}
              value={bodyFont}
              onChange={chooseBody}
            />
            {bodyFont && weightButtons(bodyFont, bodyW, chooseBodyWeight, 'Body weight')}
          </ToolSection>

          <ToolSection className="tsc-tuning-sec">
            {/* `hidden` rather than conditional rendering, so aria-controls
                always names a node that exists. */}
            <button
              type="button"
              className="tsc-tuning-toggle"
              aria-expanded={tuning}
              aria-controls="tsc-tuning"
              onClick={() => setTuning(open => !open)}
            >
              {tuning ? 'Hide fine tuning' : 'Fine tuning'}
              <ToolIcon name="caret-right" size={13} className="tsc-tuning-caret" />
            </button>
            <div id="tsc-tuning" className="tsc-tuning" hidden={!tuning}>
              <fieldset className="tsc-bp">
                <legend className="tl-sec-label">How far the scale runs</legend>
                <div className="tsc-slider-row">
                  <label className="tsc-slider-k" htmlFor="tsc-up">Steps above base</label>
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
                  <label className="tsc-slider-k" htmlFor="tsc-down">Steps below base</label>
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
              </fieldset>

              {/* The mobile end: its own base and a gentler ratio, joined to
                  the desktop ladder by clamp() (fluid) or swapped at a
                  breakpoint (fixed). */}
              <fieldset className="tsc-bp">
                <legend className="tl-sec-label">Mobile &middot; {FLUID_VIEWPORTS.min}px</legend>
                <div className="tsc-slider-row">
                  <label className="tsc-slider-k" htmlFor="tsc-mbase">Base size</label>
                  <SnapSlider
                    id="tsc-mbase"
                    min={12}
                    max={22}
                    step={0.5}
                    decimals={1}
                    unit="px"
                    value={mobileBase}
                    defaultValue={DEFAULTS.mobileBase}
                    snaps={[14, 15, 16, 18]}
                    snapRadius={0.6}
                    onChange={setMobileBase}
                    ariaLabel="Mobile base size"
                  />
                </div>
                <div className="tsc-slider-row">
                  <label className="tsc-slider-k" htmlFor="tsc-mratio">Ratio</label>
                  <select
                    id="tsc-mratio"
                    className="tsc-select"
                    value={mobileRatioId}
                    onChange={e => setMobileRatioId(e.target.value)}
                  >
                    {RATIOS.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.label}{r.value ? ` — ${r.value}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                {mobileRatioId === 'custom' && (
                  <div className="tsc-slider-row">
                    <label className="tsc-slider-k" htmlFor="tsc-mcustom">Custom mobile ratio</label>
                    <SnapSlider
                      id="tsc-mcustom"
                      min={1.05}
                      max={2}
                      step={0.001}
                      decimals={3}
                      value={mobileCustomRatio}
                      defaultValue={DEFAULTS.custom}
                      snaps={[1.1, 1.125, 1.2, 1.25, 1.333]}
                      snapRadius={0.012}
                      inputMin={1.01}
                      inputMax={3}
                      onChange={setMobileCustomRatio}
                      ariaLabel="Custom mobile scale ratio"
                    />
                  </div>
                )}
                <div className="tsc-bp-mode tl-pills tl-pills--block" role="group" aria-label="How the two scales are joined">
                  <button
                    type="button"
                    className={fluid ? 'tsc-mode-btn tl-pill is-on' : 'tsc-mode-btn tl-pill'}
                    aria-pressed={fluid}
                    onClick={() => setFluid(true)}
                  >
                    Fluid &middot; clamp()
                  </button>
                  <button
                    type="button"
                    className={!fluid ? 'tsc-mode-btn tl-pill is-on' : 'tsc-mode-btn tl-pill'}
                    aria-pressed={!fluid}
                    onClick={() => setFluid(false)}
                  >
                    Fixed &middot; media query
                  </button>
                </div>
              </fieldset>

              <fieldset className="tsc-bp">
                <legend className="tl-sec-label">Rhythm</legend>
                <div className="tsc-slider-row">
                  <label className="tsc-slider-k" htmlFor="tsc-leading">Line height</label>
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
                  <label className="tsc-slider-k" htmlFor="tsc-htrack">Heading tracking</label>
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
                  <label className="tsc-slider-k" htmlFor="tsc-btrack">Body tracking</label>
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
              </fieldset>

              <div className="tsc-bp">
                <label className="tl-sec-label" htmlFor="tsc-round">Rounding</label>
                <select
                  id="tsc-round"
                  className="tsc-select"
                  value={rounding}
                  onChange={e => setRounding(e.target.value)}
                >
                  {ROUNDING.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                </select>
                <p className="tsc-hint">
                  An unrounded modular scale produces values like 40.96px. Rounding is a
                  decision — make it here rather than in the stylesheet.
                </p>
              </div>
            </div>
          </ToolSection>
        </ToolPanel>
      </ToolGrid>

      {/* Step 3 of the guided UI-kit flow (colour → fonts → type scale → icons). */}
      <UIKitGuide step="typescale" />
    </>,
  )
}
