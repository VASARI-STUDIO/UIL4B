import MenuSelect from '../components/tool/MenuSelect'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SnapSlider from '../components/SnapSlider'
import FontPicker from '../components/FontPicker'
import UIKitGuide from '../components/UIKitGuide'
import { SaveTypeSystemPanel } from '../components/SaveTypeSystem'
import { useSaveTypeSystemToolbar } from '../hooks/useSaveTypeSystem'
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
  { id: 'full', label: 'Desktop', px: FLUID_VIEWPORTS.max, vw: FLUID_VIEWPORTS.max },
  { id: 'tablet', label: 'Tablet', px: 768, vw: 768 },
  { id: 'mobile', label: 'Mobile', px: 375, vw: FLUID_VIEWPORTS.min },
]


// The width the preview opens on is the visitor's own device class, so a phone
// no longer opens on the desktop sizes: Mobile under 768, Tablet from 768 to
// 1023, Desktop from 1024.
function deviceWidth() {
  if (typeof window === 'undefined') return 'full'
  const w = window.innerWidth
  return w < 768 ? 'mobile' : w < 1024 ? 'tablet' : 'full'
}

function useMedia(query) {
  const get = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false)
  const [match, setMatch] = useState(get)
  useEffect(() => {
    if (!window.matchMedia) return undefined
    const mq = window.matchMedia(query)
    const on = () => setMatch(mq.matches)
    on()
    mq.addEventListener?.('change', on)
    return () => mq.removeEventListener?.('change', on)
  }, [query])
  return match
}

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
  // Matches the project's own default (data/designDefaults.js, 0), so the first
  // load and Reset scale read the same letter spacing (K17).
  headingTrack: 0,
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
// Under 768 the pangram wraps the top step to four lines and pushes the lower
// steps out of view, so a phone gets a short default. Typed text is never cut.
const PHONE_SPECIMEN = 'Scale it'

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
  const [width, setWidth] = useState(deviceWidth)
  const [view, setView] = useState('scale')
  const [sheetOpen, setSheetOpen] = useState(false)
  const phone = useMedia('(max-width: 767px)')
  const ladderRef = useRef(null)
  const pageColRef = useRef(null)
  const sheetRowRef = useRef(null)
  const [colW, setColW] = useState(0)
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
      // A step is never larger on a phone than on desktop (K19), so a smaller
      // desktop base can't leave a caption bigger on mobile.
      const mobilePx = Math.min(stepPx(mobileBase, mobileRatio, exp, rounding), px)
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

  const VIEWS = [['scale', 'Scale'], ['page', 'Page'], ['code', 'Code']]
  const handleViewKeyDown = (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const at = VIEWS.findIndex(([id]) => id === view)
    const next = event.key === 'Home' ? 0
      : event.key === 'End' ? VIEWS.length - 1
        : (at + (event.key === 'ArrowRight' ? 1 : -1) + VIEWS.length) % VIEWS.length
    setView(VIEWS[next][0])
    requestAnimationFrame(() => document.getElementById(`tsc-tab-${VIEWS[next][0]}`)?.focus())
  }

  // How wide the page column really is, so the width note can say when the
  // chosen width doesn't fit and lines wrap sooner.
  useEffect(() => {
    const el = pageColRef.current
    if (view !== 'page' || !el || typeof ResizeObserver === 'undefined') return undefined
    const ro = new ResizeObserver(() => setColW(el.clientWidth))
    ro.observe(el)
    return () => ro.disconnect()
  }, [view])

  // The settings sheet is non-modal. Opening it brings the ladder up under the
  // toolbar, so the steps stay in view above it.
  const openSheet = () => {
    setSheetOpen(true)
    requestAnimationFrame(() => ladderRef.current?.scrollIntoView({ block: 'start' }))
  }
  // Closing hides the sheet, so focus goes back to the row that opened it
  // rather than falling to <body>.
  const closeSheet = () => {
    setSheetOpen(false)
    sheetRowRef.current?.focus({ preventScroll: true })
  }
  // Escape closes the open sheet. Escape that belongs to a popup inside it (a
  // list, the font dialog, the Base value field) is left to that popup.
  useEffect(() => {
    if (!sheetOpen) return undefined
    const onKey = event => {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      if (event.target instanceof Element && event.target.closest('[aria-modal="true"], [role="listbox"], .snapv-input')) return
      setSheetOpen(false)
      sheetRowRef.current?.focus({ preventScroll: true })
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [sheetOpen])

  const formatLabel = format === 'css' ? 'CSS' : format === 'tailwind' ? 'config' : 'SCSS'

  // Keeping the scale in a project is the one step here that asks for an
  // account; everything else on the page works signed out. The trigger sits in
  // the docked bar at the foot of the page, so it stays on screen while the
  // page scrolls.
  const save = useSaveTypeSystemToolbar({
    gate: 'type-save-type-scale',
    label: 'this type scale',
    summary: `${trim(base)}px base on a ${trim(ratio, 3)} ratio, ${headingName} and ${bodyName}. Kept with the project’s palette and tokens.`,
    toast,
  })

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
    <ToolLayout className="tsc-page" title="Type Scale" titleId="tsc-title" items={items} primary={phone ? undefined : primary}>
      {body}
    </ToolLayout>
  )

  if (status === 'loading') return layout(<FontCatalogLoading label="Opening the Type Scale Generator" />)

  // The string every preview on the page is set in. Trimmed, because a space
  // typed and deleted is not a choice to preview a space.
  const defaultSpecimen = phone ? PHONE_SPECIMEN : PANGRAM
  const specimen = sample.trim() || defaultSpecimen

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
        {/* The panel is first in the source, so reading order, Tab order and
            what's on screen agree below 1024: Base and Ratio, then the
            families, then the ladder. From 1024 the grid puts it in the right
            column. Phone: the Base and Ratio strip above the ladder, and
            everything else in a non-modal sheet. */}
        <ToolPanel label="Type Scale controls" className="tsc-panel tsc-config">
          <ToolSection className="tsc-sec-scale">
            <div className="tsc-scale-bar" role="group" aria-label="The scale">
              <div className="tsc-scale-term tsc-scale-term--base">
                <label className="tsc-k" htmlFor="tsc-base">Base size</label>
                <SnapSlider
                  id="tsc-base"
                  className="tsc-range"
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
              <div className="tsc-scale-term tsc-scale-term--ratio">
                <label className="tsc-k" htmlFor="tsc-ratio">Ratio</label>
                <MenuSelect label="Scale ratio"
                  id="tsc-ratio"
                  className="tsc-select tsc-scale-select"
                  value={ratioId}
                  onChange={nextValue => changeRatioId(nextValue)}
                >
                  {RATIOS.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.label}{r.value ? ` ${r.value}` : ''}
                    </option>
                  ))}
                </MenuSelect>
              </div>
              {ratioId === 'custom' && (
                <div className="tsc-scale-term tsc-scale-custom">
                  <label className="tsc-k" htmlFor="tsc-custom">Custom ratio</label>
                  <SnapSlider
                    id="tsc-custom"
                    className="tsc-range"
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
            <p className="tsc-scale-out" aria-live="polite">
              <span className="tsc-scale-range">
                {steps.length} step{steps.length === 1 ? '' : 's'}, {steps[steps.length - 1].px}px to {steps[0].px}px
              </span>
              {ratioHint && <span className="tsc-scale-hint">{ratioHint}</span>}
            </p>
          </ToolSection>

          <button
            type="button"
            ref={sheetRowRef}
            className="tsc-sheet-row"
            aria-expanded={sheetOpen}
            aria-controls="tsc-sheet"
            onClick={() => (sheetOpen ? closeSheet() : openSheet())}
          >
            Families, preview text and fine tuning
            <ToolIcon name="caret-right" size={13} />
          </button>

          <div id="tsc-sheet" className="tsc-sheet" role="group" aria-label="Families, preview text and fine tuning" data-open={sheetOpen ? 'true' : 'false'}>
            <div className="tsc-sheet-head">
              <span className="tsc-sheet-title">Families, preview text and fine tuning</span>
              <button type="button" className="tl-btn tl-btn--quiet tsc-sheet-done" onClick={closeSheet}>Done</button>
            </div>
            <div className="tsc-sheet-body">
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

              <ToolSection>
                <label className="tsc-k" htmlFor="tsc-sample">Preview text</label>
                <input
                  id="tsc-sample"
                  type="text"
                  className="tsc-sample-input"
                  value={sample}
                  maxLength={60}
                  placeholder={defaultSpecimen}
                  autoComplete="off"
                  onChange={e => setSample(e.target.value)}
                />
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
                  <MenuSelect label="Ratio"
                    id="tsc-mratio"
                    className="tsc-select"
                    value={mobileRatioId}
                    onChange={nextValue => setMobileRatioId(nextValue)}
                  >
                    {RATIOS.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.label}{r.value ? ` — ${r.value}` : ''}
                      </option>
                    ))}
                  </MenuSelect>
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
                <MenuSelect label="Rounding"
                  id="tsc-round"
                  className="tsc-select"
                  value={rounding}
                  onChange={nextValue => setRounding(nextValue)}
                >
                  {ROUNDING.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                </MenuSelect>
                <p className="tsc-hint">
                  An unrounded modular scale produces values like 40.96px. Rounding is a
                  decision — make it here rather than in the stylesheet.
                </p>
              </div>
            </div>
          </ToolSection>
            </div>
          </div>
        </ToolPanel>

        {/* The work column. It is a size container (see type-scale.css), so the
            later ladder-beside-page split can key off the column's own width
            with the panel already counted. */}
        <ToolMain className="tsc-output">
          <div className="tsc-view-switch tl-pills" role="tablist" aria-label="Output view">
            {VIEWS.map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                id={`tsc-tab-${id}`}
                aria-selected={view === id}
                aria-controls="tsc-view-panel"
                tabIndex={view === id ? 0 : -1}
                className={view === id ? 'tsc-view-btn tl-pill is-on' : 'tsc-view-btn tl-pill'}
                onClick={() => setView(id)}
                onKeyDown={handleViewKeyDown}
              >
                {label}
              </button>
            ))}
          </div>

          <div
            id="tsc-view-panel"
            role="tabpanel"
            aria-labelledby={`tsc-tab-${view}`}
            className="tsc-view"
            data-view={view}
            data-width={width}
            ref={varsRef(previewVars)}
          >
            {view === 'scale' && (
              <div className="tsc-ladder" ref={ladderRef} data-ladder="">
                <h2 className="sr-only">Read the scale</h2>
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
                    data-step={s.name}
                    data-px={s.px}
                    onClick={() => {
                      onCopy?.(`font-size: ${fluid ? s.css : `${trim(s.rem)}rem`};${fluid ? ` /* ${s.mobilePx}px → ${s.px}px */` : ` /* ${s.px}px */`}\nline-height: ${trim(lineHeight, 3)};\nletter-spacing: ${trim(s.track, 3)}em;`)
                      toast?.(`Copied --text-${s.name}`)
                    }}
                    aria-label={`Copy the ${s.name} step — ${s.mobilePx} pixels on mobile, ${s.px} pixels on desktop`}
                  >
                    <span className="tsc-row-name"><span className="tsc-row-prefix">--text-</span>{s.name}</span>
                    <span
                      className={s.role === 'heading' ? 'tsc-row-text tsc-row-text--heading' : 'tsc-row-text'}
                      ref={varsRef({ '--tsc-fs': `${fitTypePreviewSize(s.px)}px` })}
                    >
                      {specimen}
                    </span>
                    <span className="tsc-row-num">{s.px}px<span className="tsc-row-rem"> · {trim(+(s.px / 16).toFixed(4))}rem</span></span>
                  </button>
                ))}
              </div>
            )}

            {view === 'page' && (
              <div className="tsc-page-view">
                <div className="tsc-page-bar">
                  <p className="tsc-page-label">Page set on this scale</p>
                  <MenuSelect
                    label="Preview width"
                    id="tsc-width"
                    className="tsc-select tsc-width-select"
                    value={width}
                    onChange={setWidth}
                  >
                    {WIDTHS.map(w => <option key={w.id} value={w.id}>{`${w.label} · ${w.px}px`}</option>)}
                  </MenuSelect>
                </div>
                {colW > 0 && colW < activeWidth.px - 1 && (
                  <p className="tsc-width-note" role="status">
                    Sizes as on a {activeWidth.px}px screen. Lines wrap sooner here.
                  </p>
                )}
                <div className="tsc-page-col" ref={pageColRef}>
                  <article className="tsc-article" data-width={width} ref={varsRef({ ...previewVars, '--tsc-w': `${activeWidth.px}px` })}>
                    <h3 className="tsc-article-h1" ref={varsRef({ '--tsc-fs': `${fitTypePreviewSize(steps.find(s => s.exp === Math.min(up, 4))?.previewPx || steps[0].previewPx, { max: 72 })}px` })}>
                      {sample.trim() || 'A page set on this scale'}
                    </h3>
                    <p className="tsc-article-lede" ref={varsRef({ '--tsc-fs': `${fitTypePreviewSize(steps.find(s => s.exp === 1)?.previewPx || base, { max: 28 })}px` })}>
                      Every size below comes from {base}px multiplied by {trim(ratio, 3)}. Nothing is
                      hand-picked, so the rhythm holds when the page grows.
                    </p>
                    <h4 className="tsc-article-h2" ref={varsRef({ '--tsc-fs': `${fitTypePreviewSize(steps.find(s => s.exp === 2)?.previewPx || base, { max: 48 })}px` })}>
                      Where the jumps matter
                    </h4>
                    <p className="tsc-article-body" ref={varsRef({ '--tsc-fs': `${fitTypePreviewSize(steps.find(s => s.exp === 0)?.previewPx || base, { max: 24 })}px` })}>
                      A ratio that looks elegant in isolation can flatten a page: if the step between
                      body copy and a subheading is too small, the hierarchy stops doing its job.
                    </p>
                    <p className="tsc-article-small" ref={varsRef({ '--tsc-fs': `${fitTypePreviewSize(steps.find(s => s.exp === -1)?.previewPx || base, { max: 18 })}px` })}>
                      Captions and helper text live down here — check they are still comfortably legible.
                    </p>
                  </article>
                </div>
              </div>
            )}

            {view === 'code' && (
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
        </ToolMain>
      </ToolGrid>

      {/* The docked bar. Tablet and wide: Save to a project. Phone: Save and
          Copy CSS, above the tab bar. The save menu opens from it. */}
      <div className="tsc-dock" role="group" aria-label={phone ? 'Save and copy' : 'Save'}>
        <ToolButton
          ref={save.triggerRef}
          icon="bookmark-simple"
          className="tsc-save"
          aria-expanded={save.open}
          aria-haspopup="dialog"
          onClick={save.trigger}
        >
          {phone ? 'Save' : 'Save to a project'}
        </ToolButton>
        <SaveTypeSystemPanel open={save.open} panelRef={save.popRef} menuProps={save.menuProps} />
        {phone && primary}
      </div>

      {/* Step 3 of the guided UI-kit flow (colour → fonts → type scale → icons). */}
      <UIKitGuide step="typescale" />
    </>,
  )
}
