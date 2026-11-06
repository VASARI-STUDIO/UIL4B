import MenuSelect from '../components/tool/MenuSelect'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import SnapSlider from '../components/SnapSlider'
import FontPicker from '../components/FontPicker'
import UIKitGuide from '../components/UIKitGuide'
import SaveTypeSystem, { SaveTypeSystemPanel } from '../components/SaveTypeSystem'
import { useSaveTypeSystemToolbar } from '../hooks/useSaveTypeSystem'
import { FontCatalogLoading, FontCatalogNotice } from '../components/FontCatalogState'
import {
  ToolLayout, ToolButton, ToolGrid, ToolMain, ToolPanel, ToolSection, ToolIcon, SlidePills,
} from '../components/tool/ToolLayout'
import { useFontCatalog } from '../hooks/useFontCatalog'
import { useProject } from '../contexts/ProjectContext'
import { bodyWeight, fontStack, getFontImportUrl, headingWeight, loadFont, reloadFont, verifyFontLoaded } from '../utils/googleFonts'
import { consumeScaleDraft, ownFont, ownTypeScale, readScaleDraft, setPairDraft } from '../utils/typeHandoff'
import { lockScroll } from '../utils/scrollLock'
import { fitTypePreviewSize, typePreviewNeedsFitting, TYPE_PREVIEW_MAX_PX, TYPE_PREVIEW_MIN_PX } from '../utils/typeScalePreview'
import { FLUID_VIEWPORTS, fluidClamp, sizeAtViewport, stepName, stepPx } from '../utils/fluidType'
// The shared sheets for the font picker, the catalogue notice, the slider and
// the loader, then the page's own sheet, scoped under `.tsc-page`.
import '../styles/deferred/tool-shell.css'
import '../styles/deferred/type.css'
import '../styles/pages/type-scale.css'
import '../styles/pages/type-scale-kerbside.css'
import KerbsidePage from '../components/typescale/KerbsidePage'
import { ladderNote, litLineCount, usedStepNames } from '../components/typescale/kerbsideSteps'
import { useAppearance } from '../contexts/AppearanceContext'
import GroundSegment from '../components/tool/GroundSegment'
import { typeToolsBarItems } from '../components/tool/TypeToolsBar'
import { useAuth } from '../contexts/AuthContext'

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
const WEIGHT_NAMES = { 100: 'Thin', 200: 'Extra light', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'Semibold', 700: 'Bold', 800: 'Extra bold', 900: 'Black' }
const weightLabel = w => (WEIGHT_NAMES[w] ? `${w} ${WEIGHT_NAMES[w]}` : String(w))

const WIDTHS = [
  { id: 'mobile', label: 'Mobile', px: 375, vw: FLUID_VIEWPORTS.min },
  { id: 'tablet', label: 'Tablet', px: 768, vw: 768 },
  { id: 'full', label: 'Desktop', px: FLUID_VIEWPORTS.max, vw: FLUID_VIEWPORTS.max },
]
const DESKTOP = WIDTHS[2]


// The width the preview opens on is the visitor's own device class, so a phone
// no longer opens on the desktop sizes: Mobile under 768, Tablet from 768 to
// 1023, Desktop from 1024.
function deviceWidth() {
  if (typeof window === 'undefined') return 'full'
  const w = window.innerWidth
  return w < 768 ? 'mobile' : w < 1024 ? 'tablet' : 'full'
}

// The work column is split into the ladder and the page from this width, once the
// panel, the page padding and the gap are already counted. The column at a 1440
// screen is 1046px (1031 beside a 15px scrollbar), so 1024 puts 1440 in the split
// and keeps two halves of about 500px: a 40px token, a 48px value and a sample of
// about 390px between them. Samples wrap at their true size and are never cut.
const SPLIT_MIN = 1024
// Below this the split is left: 16px of slack, wider than a scrollbar.
const SPLIT_LEAVE = 1008

// The strip of the phone screen the page is read in: under the sticky toolbar,
// above the dock.
function readingBand() {
  const bar = document.querySelector('.tsc-page .tl-toolbar')
  const dock = document.querySelector('.tsc-page .tl-dock')
  return {
    top: bar ? bar.getBoundingClientRect().bottom : 0,
    bottom: dock ? dock.getBoundingClientRect().top : window.innerHeight,
  }
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
  base: 15,
  // The mobile anchor. Slightly smaller base, and the ratio is chosen separately
  // (see mobileRatioId) rather than shared — see the state comment for why one
  // ratio across both breakpoints cannot work.
  mobileBase: 15,
  ratio: 1.618,
  custom: 1.333,
  up: 4,
  down: 1,
  lineHeight: 1.5,
  // Matches the project's own default (data/designDefaults.js, 0), so the first
  // load and Reset scale read the same letter spacing (K17).
  headingTrack: 0,
  bodyTrack: 0,
  rounding: 'none',
}

// The default specimen. It is the SAME string on every row, and that is a
// decision rather than an oversight: a scale is judged by holding the text
// constant and letting only the size vary, which is what makes two adjacent
// steps comparable at a glance. #327 examined this and kept it; this change
// does not overturn it. What it adds is the ability to swap the string for
// your own words — see `sample` — which is the part that was missing.
const PANGRAM = 'There at 11:40.'
// The field's hint. It is never the value, so the ladder keeps the default line.
const PREVIEW_HINT = 'Bikes, not vans.'
const PHONE_SPECIMEN = PANGRAM

// (stepName lived here. It is now in utils/fluidType.js beside stepPx, because
// the homepage workbench's Typography preview labels its steps with the same
// token names this page exports — and two copies of a naming table is how a
// preview and an export come to disagree about what a step is called.)

// (roundPx lived here. It is now `stepPx` in utils/fluidType.js, so the two
// breakpoint ladders and their clamp() are all rounded by one function that the
// unit suite can reach without a browser.)

// A step above the base takes its size plus 8px as a line height, so a large step
// doesn't carry the body's leading: never under 1.1, never over the line height
// the user set, in steps of 0.05. The base and the steps below keep the user's value.
function leadFor(exp, px, lineHeight, tight) {
  if (exp <= 0 || !tight) return lineHeight
  return Math.round(Math.min(lineHeight, Math.max(1.1, 1 + 8 / px)) * 20) / 20
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

// `onExport` is this tool's ONE declared export hook — the copy of the whole
// scale as CSS, SCSS or a Tailwind config. Copying one step's font-size or the
// Google Fonts import URL stays on `onCopy`: those are lookups, not a finished
// type scale. See src/config/activationExports.js.
export default function TypeScale({ onCopy, onExport = onCopy, toast }) {
  const { design, projects, setFonts, setTypeScale } = useProject()
  const { user } = useAuth()
  // The step pressed in the ladder; the page lights each line that uses it.
  const [litStep, setLitStep] = useState('')
  // The step whose Copy label reads Copied, for a moment after it is pressed.
  const [copiedStep, setCopiedStep] = useState('')
  const copiedTimer = useRef(0)
  // Steps above the base take a tighter line height than the body's.
  const [tight, setTight] = useState(true)
  // The ground the ladder is read on, Dark or Light.
  const [ground, setGround] = useState('d')
  const { fonts: catalog, status, degraded, online, retry, retrying } = useFontCatalog()

  // A selection handed over from the Font Gallery or Font Pair. Read — never
  // consumed — during render, so a render React throws away can't lose it; the
  // mount effect below empties the slot exactly once. A reload or a direct
  // visit reads nothing and the tool opens on the saved kit instead.
  const carried = readScaleDraft()

  // The project's own scale and families, or nothing. `design` falls back to the
  // blank project's seed (Inter, 16px, 1.25) when nothing is saved, and that seed
  // is not a choice: only a scale or pair that differs from it counts as the
  // user's own and wins over the tool's defaults.
  const savedScale = ownTypeScale(design)

  const [base, setBase] = useState(() => carried?.scale?.base ?? savedScale?.base ?? DEFAULTS.base)
  const [ratioId, setRatioId] = useState(() => {
    const r = carried?.scale?.ratio ?? savedScale?.ratio ?? DEFAULTS.ratio
    return RATIOS.find(o => o.value === r)?.id || 'custom'
  })
  const [customRatio, setCustomRatio] = useState(() => carried?.scale?.ratio ?? savedScale?.ratio ?? DEFAULTS.custom)
  const [up, setUp] = useState(DEFAULTS.up)
  const [down, setDown] = useState(DEFAULTS.down)
  const [lineHeight, setLineHeight] = useState(() => savedScale?.lineHeight ?? DEFAULTS.lineHeight)
  const [headingTrack, setHeadingTrack] = useState(() => savedScale?.headingSpacing ?? DEFAULTS.headingTrack)
  const [bodyTrack, setBodyTrack] = useState(() => savedScale?.bodySpacing ?? DEFAULTS.bodyTrack)
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
  // media queries. Fluid is the default because it
  // avoids a visible step on resize, but the choice is real — a team
  // with strict per-breakpoint specs needs the other one.
  const [fluid, setFluid] = useState(true)
  const [width, setWidth] = useState(deviceWidth)
  const [view, setView] = useState('scale')
  const [sheetOpen, setSheetOpen] = useState(false)
  // The sheet's two tabs: the settings, and the code for the scale.
  const [sheetTab, setSheetTab] = useState('settings')
  const phone = useMedia('(max-width: 767px)')
  const ladderRef = useRef(null)
  const pageColRef = useRef(null)
  const dockRatioRef = useRef(null)
  // Whichever control opened the sheet, so closing it gives focus back there.
  const sheetOpenerRef = useRef(null)
  const [colW, setColW] = useState(0)
  // The work column's own box, read from the column itself (not the viewport) so
  // the panel beside it is already counted. It decides between the split and
  // the Scale / Page / Code switch.
  const [workEl, setWorkEl] = useState(null)
  const [work, setWork] = useState({ left: 0, width: 0 })
  // The split is entered at SPLIT_MIN and left only below SPLIT_LEAVE, held in a
  // ref, so a scrollbar appearing or going away cannot flip the layout back and forth.
  const splitRef = useRef(false)
  if (work.width >= SPLIT_MIN) splitRef.current = true
  else if (work.width < SPLIT_LEAVE) splitRef.current = false
  const split = splitRef.current
  // A phone is one scroll: the width, the page, then the ladder, with Code in the
  // sheet. From 768 the Scale / Page / Code switch (or the split) takes over.
  const stackedView = phone && !split
  const { reducedMotion } = useAppearance() || {}
  // Phone dock chip: whether the page is mostly out of the reading band, and
  // which side of it the page lies on. `litSeen` marks the first lit step, the
  // one press that brings the page into view by itself.
  const [pageOff, setPageOff] = useState(false)
  const [pageDir, setPageDir] = useState('up')
  const [litSeen, setLitSeen] = useState(false)
  // From 768 Code is a drawer over the foot of the page, opened from the docked bar.
  const [codeOpen, setCodeOpen] = useState(false)
  const codeBtnRef = useRef(null)
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
  const seedHeading = carried?.heading || ownFont(design, 'heading')
  const seedBody = carried?.body || ownFont(design, 'body')
  const [headingName, setHeadingName] = useState(() => seedHeading?.family || 'Archivo')
  const [bodyName, setBodyName] = useState(() => seedBody?.family || 'IBM Plex Sans')
  const [headingW, setHeadingW] = useState(() => seedHeading?.weight || 800)
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

  // Whether the heading face is painting. The page and the heading rows show a
  // loading line until the face is confirmed, and an error with Retry if it
  // never arrives; `face` holds the verdict for one family and weight.
  const faceKey = headingFont ? `${headingFont.family}|${headingW}` : ''
  const [face, setFace] = useState({ key: '', status: '' })
  const [faceTry, setFaceTry] = useState(0)
  useEffect(() => {
    if (!headingFont) return undefined
    let live = true
    verifyFontLoaded(headingFont.family, headingW).then(status => {
      if (live) setFace({ key: faceKey, status })
    })
    return () => { live = false }
  }, [headingFont, headingW, faceKey, faceTry])
  const headingLoading = Boolean(headingFont) && face.key !== faceKey
  const headingFailed = Boolean(headingFont) && face.key === faceKey && face.status === 'failed'
  const retryFace = () => {
    if (!headingFont) return
    setFace({ key: '', status: '' })
    reloadFont(headingFont.family).then(() => loadFont(headingFont.family, [headingW])).then(() => setFaceTry(n => n + 1))
  }

  const ratio = ratioId === 'custom' ? customRatio : (RATIOS.find(o => o.id === ratioId)?.value || DEFAULTS.ratio)

  const mobileRatio = mobileRatioId === 'custom'
    ? mobileCustomRatio
    : (RATIOS.find(o => o.id === mobileRatioId)?.value || 1.2)

  // The viewport width the preview REPRESENTS — the number the fluid maths is
  // evaluated at. Declared here rather than beside `activeWidth` further down
  // because `steps` depends on it.
  const previewVw = (WIDTHS.find(w => w.id === width) || DESKTOP).vw

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
      const lead = leadFor(exp, px, lineHeight, tight)
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
        lead,
        lineHeight: +(previewPx * lead).toFixed(1),
      })
    }
    return out
  }, [base, ratio, mobileBase, mobileRatio, fluid, previewVw, up, down, rounding, headingW, bodyW, headingTrack, bodyTrack, lineHeight, tight])
  // The ladder draws each step at the previewed width, so that is the size to test.
  const previewIsFitted = typePreviewNeedsFitting(steps.map(s => ({ px: s.previewPx })))

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
    setRatioId(String(DEFAULTS.ratio))
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
    setLitStep('')
    setTight(true)
    toast?.('Scale reset to a 15px golden ratio')
  }

  // While the catalogue is still loading the chosen family is already known by
  // name, so the first paint names it instead of the site face.
  const pendingStack = (name, seed) => (status === 'loading' ? fontStack({ family: name, category: seed?.category }) : 'var(--font)')
  const headingStack = headingFont ? fontStack(headingFont) : pendingStack(headingName, seedHeading)
  const bodyStack = bodyFont ? fontStack(bodyFont) : pendingStack(bodyName, seedBody)

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
      ...(tight ? steps.filter(s => s.exp > 0).map(s => `  --text-${s.name}--line-height: ${trim(s.lead, 3)};`) : []),
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
  }, [steps, tight, fluid, lineHeight, headingTrack, bodyTrack, headingFont, bodyFont, headingStack, bodyStack, headingW, bodyW, importUrl])

  // Tailwind v4 reads its theme from CSS: each --text-<name> makes a text-<name>
  // utility, and --text-<name>--line-height sets its leading. The clamp is a valid value there.
  const tailwind4Export = useMemo(() => {
    const out = ['@theme {']
    steps.forEach(s => {
      out.push(`  --text-${s.name}: ${fluid ? s.css : `${trim(s.rem)}rem`};`)
      out.push(`  --text-${s.name}--line-height: ${trim(s.lead, 3)};`)
    })
    if (headingFont) out.push(`  --font-heading: ${headingStack};`)
    if (bodyFont) out.push(`  --font-body: ${bodyStack};`)
    out.push('}')
    return out.join('\n')
  }, [steps, fluid, headingFont, bodyFont, headingStack, bodyStack])

  // The v3 config. Tailwind v4 loads it only through @config in the stylesheet.
  const tailwindExport = useMemo(() => {
    // Tailwind takes the clamp directly — an arbitrary value in a fontSize map
    // is valid and is how fluid type is done there, so the theme carries the
    // same behaviour the CSS export does rather than a desktop-only snapshot.
    const sizes = steps
      .map(s => `        '${s.name}': ['${fluid ? s.css : `${trim(s.rem)}rem`}', { lineHeight: '${trim(s.lead, 3)}' }],`)
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
  }, [steps, fluid, headingFont, bodyFont, headingStack, bodyStack])

  const scssExport = useMemo(() => {
    const lines = steps.map(s => (fluid
      ? `$text-${s.name}: ${s.css}; // ${s.mobilePx}px → ${s.px}px`
      : `$text-${s.name}: ${trim(s.rem)}rem; // ${s.px}px`))
    return [
      ...lines,
      '',
      `$leading: ${trim(lineHeight, 3)};`,
      ...(tight ? steps.filter(s => s.exp > 0).map(s => `$text-${s.name}-line-height: ${trim(s.lead, 3)};`) : []),
      `$tracking-heading: ${trim(headingTrack, 3)}em;`,
      `$tracking-body: ${trim(bodyTrack, 3)}em;`,
      headingFont ? `$font-heading: (${headingStack});` : '',
      bodyFont ? `$font-body: (${bodyStack});` : '',
    ].filter(l => l !== '').join('\n')
  }, [steps, tight, fluid, lineHeight, headingTrack, bodyTrack, headingFont, bodyFont, headingStack, bodyStack])

  const currentExport = format === 'tailwind' ? tailwindExport : format === 'tailwind4' ? tailwind4Export : format === 'scss' ? scssExport : cssExport
  // Copy CSS exports through here.
  const exportCode = () => onExport?.(currentExport)

  // The switcher's Font Pair link opens Font Pair on these families: the pair is
  // staged as the link is pressed, and the link's own navigation carries on.
  const stagePair = (event) => {
    if (!event.target.closest?.('a[href="/create/font-pair"]')) return
    setPairDraft({
      heading: headingFont
        ? { family: headingFont.family, weight: headingW, category: headingFont.category }
        : null,
      body: bodyFont
        ? { family: bodyFont.family, weight: bodyW, category: bodyFont.category }
        : null,
      scale: { base, ratio },
    })
  }

  const VIEWS = [['scale', 'Scale'], ['page', 'Page']]
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
    const pageShown = split || phone || view === 'page'
    if (!pageShown || !el || typeof ResizeObserver === 'undefined') return undefined
    const ro = new ResizeObserver(() => setColW(el.clientWidth))
    ro.observe(el)
    return () => ro.disconnect()
  }, [view, split, phone])

  // The dock chip needs to know when the page has left the screen. The page
  // counts as off once under half of it sits between the toolbar and the dock.
  useEffect(() => {
    const el = pageColRef.current?.querySelector('.tsc-kerb')
    if (!stackedView || !el || typeof IntersectionObserver === 'undefined') return undefined
    const band = readingBand()
    const io = new IntersectionObserver(entries => {
      const last = entries[entries.length - 1]
      setPageOff(last.intersectionRatio < 0.5)
      setPageDir(last.boundingClientRect.top > 0 ? 'down' : 'up')
    }, {
      threshold: [0, 0.25, 0.5, 0.75, 1],
      rootMargin: `-${Math.round(band.top)}px 0px -${Math.round(window.innerHeight - band.bottom)}px 0px`,
    })
    io.observe(el)
    return () => io.disconnect()
  }, [stackedView, status])

  // Measure the work column before it paints, then follow it as it resizes.
  useLayoutEffect(() => {
    if (!workEl) return undefined
    const read = () => {
      const left = Math.round(workEl.getBoundingClientRect().left)
      const width = workEl.clientWidth
      setWork(prev => (prev.left === left && prev.width === width ? prev : { left, width }))
    }
    read()
    if (typeof ResizeObserver === 'undefined') return undefined
    const ro = new ResizeObserver(read)
    ro.observe(workEl)
    window.addEventListener('resize', read)
    return () => { ro.disconnect(); window.removeEventListener('resize', read) }
  }, [workEl])


  // The settings sheet is non-modal. Opening it brings the sample screen up under
  // the toolbar, so it stays in view above the sheet while the controls change it.
  const openSheet = (opener) => {
    sheetOpenerRef.current = opener
    setSheetTab('settings')
    setSheetOpen(true)
    requestAnimationFrame(() => {
      const card = pageColRef.current?.querySelector('.tsc-kerb') || ladderRef.current
      card?.scrollIntoView({ block: 'start', behavior: reducedMotion ? 'auto' : 'smooth' })
    })
  }
  // The Code drawer closes on Escape (a popup inside the panel keeps its own Escape)
  // and when the page narrows to a phone, where Code is a tab in the sheet.
  useEffect(() => {
    if (!codeOpen) return undefined
    const onKey = event => {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      if (event.target instanceof Element && event.target.closest('[aria-modal="true"], [role="listbox"], .snapv-input')) return
      setCodeOpen(false)
      codeBtnRef.current?.focus({ preventScroll: true })
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [codeOpen])
  const drawerOpen = codeOpen && !phone
  // Closing hides the sheet, so focus goes back to the row that opened it
  // rather than falling to <body>.
  const closeSheet = () => {
    setSheetOpen(false)
    sheetOpenerRef.current?.focus({ preventScroll: true })
  }
  // On a phone the open sheet holds the page still: the sheet scrolls on its own.
  useEffect(() => {
    if (!sheetOpen || !phone) return undefined
    return lockScroll()
  }, [sheetOpen, phone])
  // Escape closes the open sheet. Escape that belongs to a popup inside it (a
  // list, the font dialog, the Base value field) is left to that popup.
  useEffect(() => {
    if (!sheetOpen) return undefined
    const onKey = event => {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      if (event.target instanceof Element && event.target.closest('[aria-modal="true"], [role="listbox"], .snapv-input')) return
      setSheetOpen(false)
      sheetOpenerRef.current?.focus({ preventScroll: true })
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [sheetOpen])

  const formatLabel = { css: 'CSS', tailwind: 'v3 config', tailwind4: 'v4 theme', scss: 'SCSS' }[format] || 'SCSS'

  // Keeping the scale in a project is the one step here that asks for an
  // account; everything else on the page works signed out. From 768 the trigger
  // sits in the sticky toolbar, so it stays on screen while the page scrolls; on
  // a phone it is the middle of the dock.
  const saveOptions = {
    gate: 'type-save-type-scale',
    label: 'this type scale',
    summary: `${trim(base)}px base on a ${trim(ratio, 3)} ratio, ${headingName} and ${bodyName}. Kept with the project’s palette and tokens.`,
    toast,
  }
  const save = useSaveTypeSystemToolbar(saveOptions)

  // The open project's name, or empty for the sample (the chip then reads "Kerbside · Sample").
  const projectName = ((projects || []).find(p => p.id === design?.source?.projectId)?.name || '').trim()
  const bar = typeToolsBarItems({
    current: 'scale',
    heading: headingFont ? { family: headingFont.family, weight: headingW } : null,
    body: bodyFont ? { family: bodyFont.family, weight: bodyW } : null,
    scale: ratio,
    headingStack,
    bodyStack,
    projectName,
    ground,
    onGround: setGround,
  }).map(it => {
    // The chip leaves the row first; in More it is the project row.
    if (it.id === 'ttb-chip') {
      return {
        ...it,
        menu: () => (
          <p className="tl-menu-row tsc-menu-project">
            <ToolIcon name="bicycle" size={16} />
            <span>{projectName || 'Kerbside'}{!projectName && <span className="tsc-menu-sample"> &middot; Sample</span>}</span>
          </p>
        ),
      }
    }
    // The switcher's Font Pair link carries these families across.
    if (it.id === 'ttb-switcher') {
      const draw = it.render
      return { ...it, render: () => <span className="tsc-switch" onClickCapture={stagePair}>{draw()}</span> }
    }
    return it
  })
  const groundItem = bar.find(it => it.id === 'ttb-ground')
  const resetItem = {
    id: 'reset',
    priority: 3,
    render: () => (
      <ToolButton icon="arrow-counter-clockwise" collapse className="tsc-reset" onClick={reset}>Reset scale</ToolButton>
    ),
    menu: { label: 'Reset scale', icon: 'arrow-counter-clockwise', onSelect: reset },
  }
  const importItem = {
    id: 'import',
    priority: 2,
    render: () => (
      <ToolButton className="tsc-copy-all" onClick={() => importUrl && onCopy?.(importUrl)} disabled={!importUrl}>Copy font import</ToolButton>
    ),
    menu: { label: 'Copy font import', icon: 'copy', onSelect: () => importUrl && onCopy?.(importUrl), disabled: !importUrl },
  }
  const items = [
    ...bar.filter(it => it !== groundItem),
    // On a phone everything past the switcher is in More, in the board's order,
    // and the ground is a section of the settings sheet.
    ...(phone
      ? [importItem, resetItem]
      : [resetItem, { id: 'div', divider: true, align: 'end' }, groundItem, importItem]),
  ]
  const primary = (
    <ToolButton variant="accent" icon="copy" iconSize={14} className="tsc-copy-primary" onClick={exportCode}>
      {`Copy ${formatLabel}`}
    </ToolButton>
  )
  // The phone dock: the scale trigger that opens the settings sheet, then Save, then Copy.
  const ratioRec = RATIOS.find(r => r.id === ratioId)
  const ratioShort = ratioRec?.label?.replace(/ ratio$/i, '') || 'Custom'
  const dockRatio = (
    <button
      type="button"
      ref={dockRatioRef}
      className="tsc-dock-ratio"
      aria-haspopup="dialog"
      aria-expanded={sheetOpen}
      aria-controls="tsc-sheet"
      aria-label={`${ratioRec?.label || 'Custom ratio'} ${ratio}. Scale, families and fine tuning`}
      onClick={() => (sheetOpen ? closeSheet() : openSheet(dockRatioRef.current))}
    >
      <b>{ratioShort}</b>
      <span className="tsc-dock-ratio-v">{ratio}</span>
      <ToolIcon name="caret-down" size={14} />
    </button>
  )
  // The dock chip: while a step is lit and the page is off screen, it says how
  // many lines of the page the step sets, and a tap brings the page back.
  const showPage = () => {
    pageColRef.current?.querySelector('.tsc-kerb')?.scrollIntoView({ block: 'start', behavior: reducedMotion ? 'auto' : 'smooth' })
  }
  const pageHidden = () => {
    const el = pageColRef.current?.querySelector('.tsc-kerb')
    if (!el) return false
    const rect = el.getBoundingClientRect()
    const band = readingBand()
    return Math.min(rect.bottom, band.bottom) - Math.max(rect.top, band.top) < rect.height * 0.5
  }
  // Pressing a step lights it (a second press clears it). The first lit step the
  // page uses brings an off-screen page into view; after that the chip does it.
  const lightStep = (name) => {
    const on = litStep !== name
    setLitStep(on ? name : '')
    if (!stackedView || !on) return
    const first = !litSeen && litLineCount(steps, up, !!user, name) > 0 && pageHidden()
    if (first) {
      setLitSeen(true)
      showPage()
    } else if (pageOff && window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
      // At the very end of the page the chip is about to cover the last lines; the page gains 40px of room below them.
      requestAnimationFrame(() => window.scrollBy({ top: 40, behavior: reducedMotion ? 'auto' : 'smooth' }))
    }
  }
  const litUses = litStep ? litLineCount(steps, up, !!user, litStep) : 0
  const litPlural = `${litUses} ${litUses === 1 ? 'line' : 'lines'}`
  const chipRoom = stackedView && !!litStep && !sheetOpen
  const litChip = chipRoom && pageOff && (litUses > 0 ? (
    <button
      type="button"
      className="tsc-chip"
      aria-label={`${litStep} is lit on ${litPlural} of the sample screen. Scroll to it`}
      onClick={showPage}
    >
      <span className="tsc-chip-n">{litStep}</span>
      <span>lit on {litPlural}</span>
      <span className="tsc-chip-ico" data-down={pageDir === 'down'}><ToolIcon name="arrow-up" size={16} /></span>
    </button>
  ) : (
    <p className="tsc-chip tsc-chip--quiet" role="status"><span className="tsc-chip-n">{litStep}</span><span>is not used on the page</span></p>
  ))
  const layout = (body) => (
    <ToolLayout className="tsc-page" data-chip={String(chipRoom)} back={false} title="Type Scale" titleId="tsc-title" showTitle={false} feedback={false} items={items} primary={phone ? <>{litChip}{dockRatio}<div className="tsc-dock-save"><SaveTypeSystem {...saveOptions} /></div>{primary}</> : primary}>
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
  const activeWidth = WIDTHS.find(w => w.id === width) || DESKTOP
  const codeTab = stackedView && sheetTab === 'code'
  const stepsLine = `${steps.length} step${steps.length === 1 ? '' : 's'}, ${steps[steps.length - 1].px}px to ${steps[0].px}px`
  // The step pressed in the ladder, when the page never sets it.
  const litUnused = litStep && !usedStepNames(steps, up, !!user).has(litStep)
  // On a phone the screen keeps the phone's width whatever is chosen, so the note
  // only speaks when another width is.
  const widthNote = stackedView
    ? (width !== 'mobile' ? `Sizes are shown as they fall at ${activeWidth.px}px wide. The screen keeps this phone’s width.` : '')
    : `Sizes as on a ${activeWidth.px}px screen.${colW > 0 && colW < activeWidth.px - 1 ? ' Lines wrap sooner here.' : ''}`
  const ratioHint = RATIOS.find(r => r.id === ratioId)?.hint
  // The chevrons walk the named ratios; each row of the list says what the top step would be.
  const namedRatios = RATIOS.filter(r => r.value)
  const ratioAt = namedRatios.findIndex(r => r.id === ratioId)
  const ratioOptions = RATIOS.map(r => ({
    value: r.id,
    label: `${r.label}${r.value ? ` ${r.value}` : ''}`,
    note: r.value ? `${trim(stepPx(base, r.value, up, rounding))}px top step` : undefined,
  }))

  // One menu per family. Only the weights the family has are listed.
  const weightSelect = (font, value, onPick, label) => (
    <div
      id={label === 'Heading weight' ? 'tsc-hweight' : 'tsc-bweight'}
      className="tsc-weights"
      role="group"
      aria-label={label}
    >
      {font.variants.map(w => (
        <button
          key={w}
          type="button"
          className="tsc-wt"
          aria-pressed={w === value}
          aria-label={weightLabel(w)}
          onClick={() => onPick(w)}
        >
          {w}
        </button>
      ))}
    </div>
  )

  // The three pieces of the work column. The split shows the ladder and the
  // page together; below it the Scale / Page / Code switch shows one at a time.
  const ladderView = (
    <div className="tsc-ladder" ref={ladderRef} data-ladder="" data-ground={ground}>
      <h2 className="sr-only">Read the scale</h2>
      {stackedView && <p className="tsc-steps-line" aria-live="polite">{stepsLine}</p>}
      <p className="tsc-use" role="status">{stackedView ? ladderNote(steps, up, !!user, '') : ladderNote(steps, up, !!user, litStep)}</p>
      {previewIsFitted && (
        <p className="tsc-fit-note" role="status">
          {stackedView
            ? `Preview sizes are fitted between ${TYPE_PREVIEW_MIN_PX}px and ${TYPE_PREVIEW_MAX_PX}px to keep the preview readable. The code keeps the true values.`
            : `Preview sizes are fitted between ${TYPE_PREVIEW_MIN_PX}px and ${TYPE_PREVIEW_MAX_PX}px to keep the preview usable. Labels and exports retain the exact scale.`}
        </p>
      )}
      {steps.map((s, i) => {
        const heading = s.role === 'heading'
        const loading = heading && headingLoading
        const fitted = fitTypePreviewSize(s.previewPx)
        // A step too large to hold the whole line shows its first word, sized to
        // fit the row's own width.
        const first = !loading && fitted >= 49
        const text = first ? specimen.split(' ')[0] : specimen
        // A phone prints the scale's own size, the one the code keeps; the
        // preview beside it may be fitted or shown at the narrower width.
        const num = stackedView ? `${trim(s.px, 2)}px` : `${trim(s.previewPx, 2)} / ${trim(s.lead, 3)}`
        // The first heading row gives way to the error when the face failed.
        if (heading && headingFailed && i === steps.findIndex(x => x.role === 'heading')) {
          return (
            <div key={s.name} className="tsc-row tsc-row--static" role="alert" data-step={s.name} data-px={s.px}>
              <span className="tsc-row-l">
                <span className="tsc-row-name"><span className="tsc-row-prefix">--text-</span>{s.name}</span>
                <span className="tsc-row-num">{num}</span>
              </span>
              <span className="tsc-row-text tsc-row-err">
                <span>{headingName} didn’t load.</span>
                <button type="button" className="tsc-retry" onClick={retryFace}>Retry</button>
              </span>
            </div>
          )
        }
        const cls = ['tsc-row-text', heading && 'tsc-row-text--heading', loading && 'is-loading', first && 'is-first'].filter(Boolean).join(' ')
        return (
          <button
            key={s.name}
            type="button"
            className="tsc-row"
            data-step={s.name}
            data-px={s.px}
            aria-pressed={litStep === s.name}
            onClick={() => {
              lightStep(s.name)
              onCopy?.(`font-size: ${fluid ? s.css : `${trim(s.rem)}rem`};${fluid ? ` /* ${s.mobilePx}px → ${s.px}px */` : ` /* ${s.px}px */`}\nline-height: ${trim(s.lead, 3)};\nletter-spacing: ${trim(s.track, 3)}em;`)
              toast?.(`Copied --text-${s.name}`)
              setCopiedStep(s.name)
              clearTimeout(copiedTimer.current)
              copiedTimer.current = setTimeout(() => setCopiedStep(''), 1600)
            }}
            aria-label={`Copy the ${s.name} step and light it on the page. ${s.mobilePx} pixels on mobile, ${s.px} pixels on desktop`}
          >
            <span className="tsc-row-l">
              <span className="tsc-row-name"><span className="tsc-row-prefix">--text-</span>{s.name}</span>
              <span className="tsc-row-num">{num}</span>
              <span className={copiedStep === s.name ? 'tsc-row-cp is-did' : 'tsc-row-cp'} aria-hidden="true"><span className="tsc-cp-a">Copy</span><span className="tsc-cp-b">Copied</span></span>
            </span>
            <span
              className={cls}
              ref={varsRef({ '--tsc-fs': `${fitted}px`, '--tsc-lead': trim(s.lead, 3) })}
            >
              {loading ? `Loading ${headingName}` : text}
              {s.previewPx < 12 && !loading && <span className="tsc-row-cap">Under 12px: captions only</span>}
            </span>
          </button>
        )
      })}
    </div>
  )

  // One width menu, shared by the Scale and Page views. In the split it sits in
  // the Page half's bar; below the split it joins the Scale / Page / Code switch.
  const widthSegment = (
    <SlidePills id="tsc-width" className="tsc-width-seg tl-pills" role="group" aria-label="Preview width" value={width}>
      {WIDTHS.map(w => (
        <button
          key={w.id}
          type="button"
          className={width === w.id ? 'tsc-width-btn tl-pill is-on' : 'tsc-width-btn tl-pill'}
          aria-pressed={width === w.id}
          onClick={() => setWidth(w.id)}
        >
          {w.label}<span className="tsc-width-px">{w.px}</span>
        </button>
      ))}
    </SlidePills>
  )

  // Declared before pageView, which shows them as the Code half at 1440.
  const formatPills = (
    <SlidePills className="tsc-fmt tl-pills" role="group" aria-label="Export format" value={format}>
      {[['css', 'CSS variables'], ['tailwind4', 'Tailwind v4'], ['tailwind', 'Tailwind v3'], ['scss', 'SCSS']].map(([id, label]) => (
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
    </SlidePills>
  )
  const exportPre = (
    <pre id="tsc-export" className="tl-code tsc-export" tabIndex={0} aria-label={`Type scale as ${formatLabel}`}><code>{currentExport}</code></pre>
  )
  // The Code view's own copy, named for the format it copies (the tool bar's says CSS).
  const exportCopy = (
    <ToolButton className="tsc-export-copy" onClick={exportCode}>
      <ToolIcon name="copy" size={15} />
      Copy as {{ css: 'CSS', tailwind: 'Tailwind v3', tailwind4: 'Tailwind v4', scss: 'SCSS' }[format] || 'CSS'}
    </ToolButton>
  )


  const pageView = (
    <div className="tsc-page-view">
      {stackedView ? (
        <h2 className="sr-only">{user ? 'A sample screen set on this scale' : 'Kerbside’s tracking screen, set on this scale'}</h2>
      ) : !split && <div className="tsc-page-bar"><p className="tsc-page-label">Page set on this scale</p></div>}
      <div className="tsc-page-col" ref={pageColRef}>
        <div className="tsc-kerb" data-width={width} ref={varsRef({ ...previewVars, '--tsc-w': `${activeWidth.px}px` })}>
          <KerbsidePage
            steps={steps}
            up={up}
            mine={!!user}
            text={sample.trim()}
            lit={litStep}
            headingName={headingName}
            headingLoading={headingLoading}
            headingFailed={headingFailed}
            onRetry={retryFace}
          />
        </div>
        {stackedView && !user && <p className="tsc-sample-line">Kerbside &middot; sample screen</p>}
        {stackedView && litUnused && <p className="tsc-lit-note" role="status">Nothing on this page uses {litStep}.</p>}
      </div>
    </div>
  )

  // The Base and Ratio strip. From 768 it is the first section of the panel; on a phone it
  // is the top of the settings sheet.
  const scaleSection = (
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
          <div className="tsc-ratio-row">
            <button
              type="button"
              className="tsc-ratio-step"
              aria-label="Previous ratio"
              disabled={ratioAt <= 0}
              onClick={() => changeRatioId(namedRatios[ratioAt - 1].id)}
            >
              <ToolIcon name="arrow-left" size={16} />
            </button>
            <MenuSelect label="Scale ratio"
              id="tsc-ratio"
              className="tsc-select tsc-scale-select"
              value={ratioId}
              options={ratioOptions}
              triggerLabel={phone ? <span className="tsc-ratio-t"><b>{ratioShort}</b><span className="tsc-ratio-v">{ratio}</span></span> : undefined}
              onChange={nextValue => changeRatioId(nextValue)}
            />
            <button
              type="button"
              className="tsc-ratio-step"
              aria-label="Next ratio"
              disabled={ratioAt < 0 || ratioAt >= namedRatios.length - 1}
              onClick={() => changeRatioId(namedRatios[ratioAt + 1].id)}
            >
              <ToolIcon name="arrow-right" size={16} />
            </button>
          </div>
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
      {(!phone || ratioHint) && (
        <p className="tsc-scale-out" aria-live="polite">
          {!phone && <span className="tsc-scale-range">{stepsLine}</span>}
          {ratioHint && <span className="tsc-scale-hint">{ratioHint}</span>}
        </p>
      )}
    </ToolSection>
  )

  return layout(
    <>
      <ToolGrid className="tsc-grid">
        {/* The panel is first in the source, so reading order, Tab order and
            what's on screen agree below 1024: Base and Ratio, then the
            families, then the ladder. From 1024 the grid puts it in the right
            column. Phone: all of it, and the Code tab, is in the non-modal
            sheet the dock opens. */}
        <ToolPanel label="Type Scale controls" className="tsc-panel tsc-config">
          {!phone && scaleSection}

          <div id="tsc-sheet" className="tsc-sheet" role="group" aria-label="Scale, families, preview text and fine tuning" data-open={sheetOpen ? 'true' : 'false'} data-tab={codeTab ? 'code' : 'settings'}>
            <div className="tsc-sheet-head">
              <h2 className="sr-only">{codeTab ? 'Code' : 'Type settings'}</h2>
              <SlidePills className="tsc-sheet-tabs tl-pills" role="group" aria-label="Sheet" value={sheetTab}>
                {[['settings', 'Settings'], ['code', 'Code']].map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    className={sheetTab === id ? 'tsc-sheet-tab tl-pill is-on' : 'tsc-sheet-tab tl-pill'}
                    aria-pressed={sheetTab === id}
                    onClick={() => setSheetTab(id)}
                  >
                    {label}
                  </button>
                ))}
              </SlidePills>
              <button type="button" className="tl-btn tl-btn--quiet tsc-sheet-done" onClick={closeSheet}>Done</button>
            </div>
            {/* A field that takes focus while the keyboard is up scrolls into the room above it. */}
            <div className="tsc-sheet-body" onFocus={(e) => { if (e.target.matches?.('input, textarea')) e.target.scrollIntoView?.({ block: 'nearest' }) }}>
              {codeTab && (
                <div className="tsc-sheet-code">
                  {formatPills}
                  {exportPre}
                </div>
              )}
              {/* Kept mounted behind the Code tab, so a field's state and the open
                  fine-tuning group are still there when Settings comes back. */}
              <div className="tsc-sheet-set" hidden={codeTab}>
              {phone && scaleSection}
              <ToolSection className="tsc-fonts">
                <FontCatalogNotice
                  online={online}
                  degraded={degraded}
                  onRetry={retry}
                  retrying={retrying}
                  count={catalog.length}
                  compact
                />
                <div className="tsc-fams">
                  <div className="tsc-fams-grid">
                    <div className="tsc-fam">
                      <FontPicker
                        label="Heading family"
                        fonts={catalog}
                        value={headingFont}
                        onChange={chooseHeading}
                      />
                      {headingFont && weightSelect(headingFont, headingW, chooseHeadingWeight, 'Heading weight')}
                    </div>
                    <div className="tsc-fam">
                      <FontPicker
                        label="Body family"
                        fonts={catalog}
                        value={bodyFont}
                        onChange={chooseBody}
                      />
                      {bodyFont && weightSelect(bodyFont, bodyW, chooseBodyWeight, 'Body weight')}
                    </div>
                  </div>
                </div>
              </ToolSection>

              {phone && (
                <ToolSection className="tsc-ground-sec">
                  <span className="tsc-k">Specimen ground</span>
                  <GroundSegment ground={ground} onGround={setGround} className="ttb-seg--full" />
                </ToolSection>
              )}

          <ToolSection className="tsc-tuning-sec">
            <div className="tsc-words-row">
              <div className="tsc-words-field">
                <label className="tsc-k" htmlFor="tsc-sample">Preview text</label>
                <input
                  id="tsc-sample"
                  type="text"
                  className="tsc-sample-input"
                  value={sample}
                  maxLength={60}
                  placeholder={PREVIEW_HINT}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="sentences"
                  enterKeyHint="done"
                  onChange={e => setSample(e.target.value)}
                />
              </div>
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
            </div>
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
                <SlidePills className="tsc-bp-mode tl-pills tl-pills--block" role="group" aria-label="How the two scales are joined" value={fluid}>
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
                </SlidePills>
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
                <button type="button" className="tsc-tight" role="switch" aria-checked={tight} onClick={() => setTight(t => !t)}>
                  <span>Tighter headings</span>
                  <span className="tsc-tight-trk" aria-hidden="true"><i /></span>
                </button>
                <p className="tsc-hint">Steps above base use size plus 8px, between 1.1 and your line height.</p>
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
          </div>
        </ToolPanel>

        {/* The work column. It is a size container (see type-scale.css) and is
            measured as one: from SPLIT_MIN the ladder and the page sit side by
            side and Code is a view beside the scale; below it the
            Scale / Page / Code switch shows one view at a time. On a phone
            there is no switch: the width, the page and the ladder are one
            scroll, and Code is a tab in the sheet. */}
        <ToolMain className="tsc-output" ref={setWorkEl} data-sheet={String(phone && sheetOpen)}>
          {!stackedView && !split && (
            <div className="tsc-view-bar">
              <SlidePills className="tsc-view-switch tl-pills" role="tablist" aria-label="Output view" value={view}>
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
              </SlidePills>
            </div>
          )}

          {/* The page header: the width every size on the page is read at. */}
          {(
            <div className="tsc-width-bar">
              <span className="tsc-width-k" id="tsc-width-k">Preview width</span>
              {widthSegment}
              {widthNote && <p className="tsc-width-note" role="status">{widthNote}</p>}
            </div>
          )}

          <div
            id="tsc-view-panel"
            role={split || stackedView ? undefined : 'tabpanel'}
            aria-labelledby={split || stackedView ? undefined : `tsc-tab-${view}`}
            className="tsc-view"
            data-view={split ? 'split' : stackedView ? 'stack' : view}
            data-width={width}
            ref={varsRef(previewVars)}
          >
            {stackedView && <>{pageView}{ladderView}</>}
            {!stackedView && (split || view === 'scale') && ladderView}
            {!stackedView && (split || view === 'page') && pageView}
          </div>
        </ToolMain>
      </ToolGrid>

      {/* From 768 the docked bar holds Code and Save to a project; Code opens a
          drawer over the foot of the page. A phone has the dock and the sheet. */}
      {!phone && (
        <div className="tsc-dock" role="group" aria-label="Code and save" data-code={drawerOpen ? 'open' : 'closed'}>
          <div id="tsc-code-drawer" className="tsc-drawer" role="dialog" aria-modal="false" aria-label="Code" hidden={!drawerOpen}>
            <div className="tsc-drawer-head">
              {formatPills}
              {exportCopy}
              <ToolButton variant="quiet" icon="x" className="tl-btn--square tsc-drawer-close" aria-label="Close code" onClick={() => { setCodeOpen(false); codeBtnRef.current?.focus({ preventScroll: true }) }} />
            </div>
            {exportPre}
          </div>
          <div className="tsc-dock-l">
            <ToolButton
              ref={codeBtnRef}
              icon="code"
              className="tsc-code-btn"
              aria-expanded={drawerOpen}
              aria-controls="tsc-code-drawer"
              aria-haspopup="dialog"
              onClick={() => setCodeOpen(open => !open)}
            >
              Code
            </ToolButton>
            <p className="tsc-dock-status" aria-live="polite">{user ? 'Keeps this scale with your project' : 'Kept in this browser. Log in to save it to a project.'}</p>
          </div>
          <div className="tsc-save-wrap">
            <ToolButton
              ref={save.triggerRef}
              icon="bookmark-simple"
              className="tsc-save"
              aria-expanded={save.open}
              aria-haspopup="dialog"
              onClick={save.trigger}
            >
              Save to a project
            </ToolButton>
            <SaveTypeSystemPanel open={save.open} panelRef={save.popRef} menuProps={save.menuProps} />
          </div>
        </div>
      )}

      {/* Step 3 of the guided UI-kit flow (colour → fonts → type scale → icons). */}
      <UIKitGuide step="typescale" />
    </>,
  )
}
