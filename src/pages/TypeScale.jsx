import { useEffect, useMemo, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import SnapSlider from '../components/SnapSlider'
import FontPicker from '../components/FontPicker'
import UIKitGuide from '../components/UIKitGuide'
import SaveTypeSystem from '../components/SaveTypeSystem'
import { FontCatalogLoading, FontCatalogNotice } from '../components/FontCatalogState'
import { useFontCatalog } from '../hooks/useFontCatalog'
import { useProject } from '../contexts/ProjectContext'
import { bodyWeight, fontStack, getFontImportUrl, headingWeight, loadFont } from '../utils/googleFonts'
import { consumeScaleDraft, readScaleDraft, setPairDraft } from '../utils/typeHandoff'
import { fitTypePreviewSize, typePreviewNeedsFitting } from '../utils/typeScalePreview'
import { FLUID_VIEWPORTS, fluidClamp, sizeAtViewport, stepName, stepPx } from '../utils/fluidType'
// The stylesheet families this surface needs, split out of the one
// render-blocking global sheet (see src/styles/deferred/). They ride this
// route's own lazy chunk, so they arrive with it and never with the homepage.
import '../styles/deferred/colour.css'
import '../styles/deferred/tool-shell.css'
import '../styles/deferred/type.css'
// This page's own Spectrum sheet, every selector rooted at .tsc-page.
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

  if (status === 'loading') {
    return (
      <div className="sec tsc-page">
        <FontCatalogLoading label="Opening the Type Scale Generator" />
      </div>
    )
  }

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

  return (
    <div className="sec tsc-page">
      {/* THE TAXONOMY EYEBROW IS GONE, AND SO IS THE DISPLAY-SIZED h1.
          ──────────────────────────────────────────────────────────────────
          #382 deleted `<div className="sec-h-eyebrow">` from every tool
          masthead it reached — the founder marked that exact element "AI" on
          the Font Gallery, where it also announced the wrong section — and it
          did not reach this page. "Create / Typography" was still sitting above
          an h1 that says the same thing in fewer words, on a route the nav
          already shows you are in.

          The h1 came down from clamp(38px,5vw,64px). On a page whose whole
          subject is type, the biggest type on it was the one string the visitor
          cannot change, and it was setting the scale the specimen then had to
          compete with. The specimen is the largest thing here now.
          (The Spectrum pass kept this: pages/type-scale.css gives the h1
          Spectrum's weight and tracking but NOT the display size the other
          Create tools open on — 54-type-scale-overhaul holds it under 40px.)

          The paragraph lost two of its three clauses. What it said — tune the
          curve, read it back, copy the properties — was the page describing its
          own workflow to someone who can see it. What is left is the one fact a
          first-time visitor needs and cannot infer: what a modular scale is.

          Reset moved up here because it acts on the whole page, and it was
          previously the last control in a rail of thirteen. */}
      <header className="tsc-masthead">
        <div className="tsc-masthead-copy">
          <h1>Type Scale Generator</h1>
          <p>One base size and one ratio. Every step below is that multiplication.</p>
        </div>
        <button type="button" className="tsc-reset" onClick={reset}>
          Reset scale
        </button>
        {/* THE HERO TABLIST IS GONE, AND THE STATE IT SET IS NOT.
            `audience` had TWO controls. This one — a pair of large cards
            captioned "For designers" and "For developers" — sat at the top of
            the page under `role="tablist"`, and the panel it declared via
            aria-controls was 1,593px further down: roughly two full screens on
            a 900px viewport. Pressing it changed nothing you could see. The
            other control, a plain segmented switch, sits directly above that
            same panel and sets the same variable, in a different visual
            language and with different ARIA (aria-pressed, no tablist).

            One piece of state, two controls, neither agreeing with the other
            about what kind of control it was. The one that survives is the one
            adjacent to the thing it changes; it is promoted to the real tablist
            below. The split itself is kept — the backlog asked whether the
            designer/developer division earns its place, and it does: it is a
            genuine either/or on one output panel. What it does not earn is
            being posed as a workflow choice before the tool has been used.

            The hero paragraph above already tells both audiences what the tool
            does ("read it back in a real layout, then copy a complete set of
            CSS custom properties"), so no information is lost with the cards.

            NB #298 fixed a stacked-indicator glitch on these cards' ::after
            when they wrapped on a phone. That fix is not being reverted — the
            element it corrected no longer exists on the page, and its dead
            rules went with it. The lesson it recorded is preserved in the
            `.hw-tabs` note in global.css, which cites it. */}
      </header>

      <FontCatalogNotice
        online={online}
        degraded={degraded}
        onRetry={retry}
        retrying={retrying}
        count={catalog.length}
      />

      {/* ── The scale, stated ────────────────────────────────────────────────
          THIS REPLACES A FIVE-UP FIGURE STRIP, and the strip is not restyled —
          it is replaced by the thing it was describing.

          What stood here was `.tsc-status`, a 1348x46px band reading
          "9 sizes · 16px base · 1.25 ratio · 61px largest · 10px smallest".
          #382 deleted the three-up version of that motif from the Font Gallery
          because the founder marked it "AI", and moved its one working figure
          into the search placeholder where it does a job. This instance was
          worse than the Gallery's, because every one of its five figures was
          restated within 150px of it: "61px largest" and "10px smallest" ARE
          the top and bottom rows of the ladder underneath, "16px base" and
          "1.25 ratio" were the two controls, and "9 sizes" counted rows you can
          see. Nothing there survived the test the Gallery fix applied.

          So the two numbers come out of the rail and become the statement.
          `base x ratio` is the whole of the maths this tool does, and here the
          two terms are the live controls rather than a readout of them — you
          edit the sentence that describes the scale. The range is the one
          figure the strip carried that was not visible anywhere else, and it
          stays, as the RESULT of the multiplication rather than a fourth and
          fifth item in a row of equals.

          It spans the full width above the grid, so the two controls that make
          the scale are adjacent to the ladder they drive at EVERY width. #327
          fixed the same adjacency problem for the rail by reordering the DOM so
          two columns arrive at 1344px; the primary controls no longer depend on
          that at all. */}
      <section className="tsc-scale-bar" aria-label="The scale">
        <div className="tsc-scale-term">
          <label className="seg-label" htmlFor="tsc-base">Base size</label>
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
          <label className="seg-label" htmlFor="tsc-ratio">Scale ratio</label>
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
        {/* The result of the two terms above, not a statistic about the page.
            The interval name is a fact about music; this line is the one that
            answers "should I pick this one?", so it rides with the range. */}
        <p className="tsc-scale-out" aria-live="polite">
          <span className="tsc-scale-eq" aria-hidden="true">=</span>
          <strong>{steps.length} step{steps.length === 1 ? '' : 's'}</strong>
          <span className="tsc-scale-range">
            {steps[steps.length - 1].px}px – {steps[0].px}px
          </span>
          {RATIOS.find(r => r.id === ratioId)?.hint && (
            <span className="tsc-scale-hint">{RATIOS.find(r => r.id === ratioId).hint}</span>
          )}
        </p>
      </section>
      {ratioId === 'custom' && (
        <div className="tsc-scale-custom">
          <label className="seg-label" htmlFor="tsc-custom">Custom ratio</label>
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

      <div className="tsc-grid">
        {/* ── The ladder leads, at every width ────────────────────────────
            THIS SECTION MOVED ABOVE THE RAIL IN THE DOM, and the media query
            that used to reorder the two columns at 1344px+ went with it.

            The old order was rail-then-ladder, which #327 chose for a good
            reason: the rail held every input the tool had, and below 1344px the
            page is a single 940px column, so putting the inputs second meant
            adjusting a ratio while the ladder it changed was off screen.

            That reason has gone. The base and the ratio are in the scale bar
            above this grid now, adjacent to the ladder at every width, so what
            is left in the rail is the two families and a closed disclosure —
            about 330px of secondary controls that were standing between the
            scale bar and the thing the scale bar describes on every screen
            narrower than 1344px. A tool for reading a scale should open on the
            scale.

            With the DOM in this order the 1344px grid needs no reorder at all:
            `.tsc-grid` is `1fr 340px`, so the ladder takes the wide column and
            the rail the narrow one by source order. Two fewer rules, and the
            numbering they existed to keep honest is gone anyway. */}
        <section className="card tsc-panel tsc-output" aria-labelledby="tsc-output-title">
          {/* THE 01 / 02 / 03 BADGES ARE GONE FROM ALL THREE PANELS.
              ──────────────────────────────────────────────────────────────
              They were `.tsc-section-num`: a 30x24px mono numeral in a
              brand-tinted box with its own border, one per panel head. Two
              things were wrong with them, and only the second is a look.

              THEY READ RIGHT TO LEFT. Measured at 1440x1000 before this
              change: "01 Tune the scale" had its box at x=1079 and "02 Read the
              scale" at x=71, both on the same line at y=494. #327 introduced
              the numbers to fix a DOM-order problem and reordered the DOM so
              they would read 01-02-03; the two-column grid at 1344px+ then puts
              the rail on the right, so on the widest screens the sequence runs
              backwards. A numbered sequence that has to be read against the
              reading direction is worse than no numbering.

              AND THEY WERE DECORATION DOING HIERARCHY'S JOB. Three panels, one
              of them nested INSIDE another (03 lived in 02's card), given rank
              by a coloured numeral rather than by size, position or weight —
              which is the motif the anti-slop bar names as "decoration that
              pretends to be product proof". MagicPath's design-system editor on
              Mobbin (mobbin.com/screens/8284a8ac-b530-4b95-8d12-ba78a1a905fb)
              titles the equivalent block with a plain small-caps "TYPE SCALE"
              and nothing else, and its hierarchy is legible without it.

              The width switch moves up onto the title line because it belongs
              to the ladder rather than to the page: it says which end of the
              scale you are reading. */}
          <div className="tsc-ladder-head">
            <div>
              <h2 id="tsc-output-title">Read the scale</h2>
              <p>Every step at its real size, weight and tracking. Select one to copy its declaration.</p>
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
          </div>

          {/* YOUR WORDS, NOT OURS. "Is this step usable?" is a question about
              the content that will sit at that size, and a pangram cannot
              answer it for a nav label, a price or a German compound noun.
              Font Pair has had this control since it shipped, and so has the
              homepage Typography panel that mirrors this tool — this page, the
              one whose only job is judging sizes, was the exception.

              It is one input for the whole page: the ladder below and the
              article heading further down both read it, because they are two
              views of one decision. Empty falls back to the pangram, which is
              why the placeholder IS the pangram rather than a description of
              it. */}
          <div className="tsc-sample-row">
            <label className="seg-label" htmlFor="tsc-sample">Preview text</label>
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
                  {/* The size AT THE PREVIEWED WIDTH, not the desktop size. The
                      old readout always said the desktop figure even while the
                      Mobile preview was selected, which is what made the
                      breakpoint control look decorative. The mobile→desktop
                      range sits underneath so both ends stay visible. */}
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

          <div className="tsc-delivery">
            <div className="tsc-delivery-head">
              <div>
                <h2>{audience === 'designer' ? 'Evaluate the hierarchy' : 'Prepare the handoff'}</h2>
                <p>
                  {audience === 'designer'
                    ? 'The same scale, laid out as a page — check the jumps actually read.'
                    : `${steps.length} sizes plus leading, tracking and both families, ready to paste.`}
                </p>
              </div>
              {/* Now the ONLY control for `audience`, and a real tablist: it
                  sits immediately above the tabpanel it switches, so the
                  arrow-key and roving-tabindex contract it advertises actually
                  lands somewhere the user can see. */}
              <div className="tsc-view-switch" role="tablist" aria-label="Output view">
                <button
                  type="button"
                  role="tab"
                  id="tsc-tab-designer"
                  aria-selected={audience === 'designer'}
                  aria-controls="tsc-audience-panel"
                  tabIndex={audience === 'designer' ? 0 : -1}
                  className={audience === 'designer' ? 'tsc-view-btn tsc-view-btn--on' : 'tsc-view-btn'}
                  onClick={() => setAudience('designer')}
                  onKeyDown={handleAudienceKeyDown}
                >
                  Design preview
                </button>
                <button
                  type="button"
                  role="tab"
                  id="tsc-tab-developer"
                  aria-selected={audience === 'developer'}
                  aria-controls="tsc-audience-panel"
                  tabIndex={audience === 'developer' ? 0 : -1}
                  className={audience === 'developer' ? 'tsc-view-btn tsc-view-btn--on' : 'tsc-view-btn'}
                  onClick={() => setAudience('developer')}
                  onKeyDown={handleAudienceKeyDown}
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
                  {/* The eyebrow said "Article preview" directly beneath a tab
                      that says "Design preview", above an article. Three labels
                      for one thing.

                      The heading said "A scale you can defend in a review",
                      which is the product arguing for itself inside its own
                      specimen — the anti-slop bar's "headings that sound
                      polished but do not help the user predict the product".
                      What replaces it is what the block is, and it takes the
                      typed preview text when there is any, exactly as the
                      ladder does. */}
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
                      <button type="button" className="tsc-copy-primary" onClick={() => onExport?.(currentExport)}>
                        Copy {format === 'css' ? 'CSS' : format === 'tailwind' ? 'config' : 'SCSS'}
                      </button>
                    </div>
                  </div>
                  <pre id="tsc-export" className="tsc-export" tabIndex="0"><code>{currentExport}</code></pre>
                </div>
              )}
            </div>

            {/* OUTSIDE the audience tabpanel on purpose. The panel swaps its
                whole subtree on the designer/developer toggle, so a save
                control placed inside would exist for one audience and vanish
                for the other — and would mount twice in the tree if it were
                added to both branches. Keeping is not a developer concern.

                Founder decision 2026-09-05: browsing is free, saving is Pro.
                Every control above this line — the ratio, the steps, the
                preview, Copy CSS/Tailwind/SCSS and Copy font import — works
                signed out and stays that way. */}
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
          </div>
        </section>

        {/* ── The rail ──────────────────────────────────────────────────────
            THIRTEEN LABELLED CONTROLS USED TO STAND HERE AT ONE WEIGHT.
            Measured before this change: a 340x1592px column holding, in order,
            a mobile base, a mobile ratio, a fluid/fixed pair, the desktop
            ratio, the base size, steps above, steps below, line height,
            heading tracking, body tracking, rounding, and two family pickers.
            Every one of them was a `.tsc-slider-row` or a `.tsc-select` of
            identical size, spacing and colour.

            That is the flat, evenly-spaced stack the anti-slop bar calls
            "spacing, hierarchy and state behaviour that feel generated section
            by section", and it had a specific cost here rather than only a
            look: the two numbers that ARE a modular scale — the base and the
            ratio — sat fifth and fourth in that list, between "Steps below
            base" and "Body tracking", weighted exactly the same as letter
            spacing. Nothing in the rail said what to do first, so the tool
            answered "what am I trying to do with a type scale?" with a
            settings screen.

            The base and the ratio are now the scale bar above the ladder. What
            is left here is the two families — which drive what the specimen and
            the article are set in, and are the reason this tool previews with
            real type rather than a stand-in — and everything else behind one
            plain text disclosure.

            The disclosure is a text toggle rather than another card or an
            accordion chevron, per Dialpad's settings screen on Mobbin
            (mobbin.com/screens/6087e60e-1bc3-44dd-9f6b-252fb48706ab), which
            puts its primary control at the top and hides the ring-duration and
            call-handling detail behind a bare "Hide advanced options" link in
            accent text. Adding a twelfth container to a page already criticised
            for containers would have been the wrong instrument.

            NOTHING IS REMOVED FROM THE TOOL. Every control that existed still
            exists, keeps its id, its label and its aria-label, and drives the
            same maths. */}
        <section className="card tsc-panel tsc-config" aria-labelledby="tsc-config-title">
          <h2 id="tsc-config-title" className="tsc-panel-title">Preview families</h2>
          <p className="tsc-panel-note">
            The ladder and the page preview are set in these two faces, at these weights.
          </p>

          <div className="tsc-fonts">
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

          {/* `hidden` rather than conditional rendering, so `aria-controls`
              always names a node that exists — a control pointing at an absent
              id is a broken relationship, not a collapsed one. */}
          <button
            type="button"
            className="tsc-tuning-toggle"
            aria-expanded={tuning}
            aria-controls="tsc-tuning"
            onClick={() => setTuning(open => !open)}
          >
            {tuning ? 'Hide fine tuning' : 'Fine tuning'}
          </button>
          <div id="tsc-tuning" className="tsc-tuning" hidden={!tuning}>
            <fieldset className="tsc-bp">
              <legend className="seg-label">How far the scale runs</legend>
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
            </fieldset>

            {/* ── The mobile end ──
                A ratio compounds, so one ratio cannot serve both breakpoints:
                at 1.333 the sixth step is 5.6x the base, which reads as
                confident on a 1440px desktop and as shouting on a 375px phone.
                Mobile gets its own base and its own gentler ratio, and the two
                ladders are joined by clamp() — that is what makes an h1
                genuinely different at each breakpoint instead of merely
                previewed in a narrower box.

                Fluid/fixed sits in this group rather than beside the preview
                width switch because it is a fact about THIS end of the scale:
                it decides whether the mobile ladder interpolates up to the
                desktop one or is swapped for it at a breakpoint. */}
            <fieldset className="tsc-bp">
              <legend className="seg-label">Mobile &middot; {FLUID_VIEWPORTS.min}px</legend>
              <div className="tsc-bp-row">
                <div className="tsc-slider-row">
                  <div className="tsc-slider-head">
                    <label className="seg-label" htmlFor="tsc-mbase">Base size</label>
                  </div>
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
                <div>
                  <label className="seg-label" htmlFor="tsc-mratio">Ratio</label>
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
              </div>
              {mobileRatioId === 'custom' && (
                <div className="tsc-slider-row">
                  <div className="tsc-slider-head">
                    <label className="seg-label" htmlFor="tsc-mcustom">Custom mobile ratio</label>
                  </div>
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
              {/* Their own class. These two buttons are not preview widths,
                  and they used to borrow the preview switch's class — which
                  made the segmented control beside the ladder and this pair
                  indistinguishable to anything reading the DOM, tests
                  included, and would have been actively wrong once one of the
                  two moved inside a disclosure. */}
              <div className="tsc-bp-mode" role="group" aria-label="How the two scales are joined">
                <button
                  type="button"
                  className={fluid ? 'tsc-mode-btn tsc-mode-btn--on' : 'tsc-mode-btn'}
                  aria-pressed={fluid}
                  onClick={() => setFluid(true)}
                >
                  Fluid &middot; clamp()
                </button>
                <button
                  type="button"
                  className={!fluid ? 'tsc-mode-btn tsc-mode-btn--on' : 'tsc-mode-btn'}
                  aria-pressed={!fluid}
                  onClick={() => setFluid(false)}
                >
                  Fixed &middot; media query
                </button>
              </div>
            </fieldset>

            <fieldset className="tsc-bp">
              <legend className="seg-label">Rhythm</legend>
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
            </fieldset>

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
          </div>
        </section>
      </div>

      {/* Cross-links keep the standalone page part of the typography suite.
          The band used to open with a mono-caps kicker ("Continue your
          typography system") and an aphorism in bold ("A scale is half the
          system — the families carry the rest") above the same three links.
          Neither told the visitor anything the links do not, and the aphorism
          is the register the anti-slop bar calls generic aspirational copy.
          Three links, which is what this is. */}
      <nav className="tsc-more" aria-label="More typography tools">
        <NavLink to="/create/font-pair" className="tsc-more-link">Pair two families &rarr;</NavLink>
        <NavLink to="/create/font-gallery" className="tsc-more-link">Browse the font gallery &rarr;</NavLink>
        <NavLink to="/create/palette" className="tsc-more-link">Build a colour palette &rarr;</NavLink>
      </nav>

      {/* Step 3 of the guided UI-kit flow (colour → fonts → type scale → icons). */}
      <UIKitGuide step="typescale" />
    </div>
  )
}
