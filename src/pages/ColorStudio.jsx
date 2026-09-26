import { useState, useCallback, useRef, useEffect, useMemo, useLayoutEffect } from 'react'
import { generateHarmony, generateTintScale, textColorForBg, hslToHex, hexToHsl, contrastRatio, hexToRgb, describeColor, autoTonalPalette, applyAdjust, roleHueArcs } from '../utils/colors'
import {
  SEMANTIC_ROLES as ROLE_IDS, SEMANTIC_STEPS as STATE_LABELS, STATE_PRESETS, INFO_PURPLE,
  resolveStateShades, readSemanticStates,
} from '../data/semanticPresets'
import { useProject } from '../contexts/ProjectContext'
import {
  ToolLayout, ToolButton, ToolPills, ToolSlider, ToolSelect, ToolCode, ToolIcon,
} from '../components/tool/ToolLayout'
import { useExport } from '../contexts/ExportContext'
// The keyboard + dismissal contract every non-modal popover in this app owes
// its user (Escape closes and hands focus back, a press outside closes, opening
// moves focus in, tabbing past either end closes). The Add-to-Project panel
// below held none of it.
import usePopover from '../hooks/usePopover'
import useExportGate from '../hooks/useExportGate'
// The free-tier cap's refusal, rendered where it was thrown. Shared with the
// Palette Builder and /projects so one refusal cannot be worded — or styled —
// two ways on two surfaces.
import SaveRefusal from '../components/SaveRefusal'
import { useTheme } from '../contexts/ThemeContext'
import { useAppearance } from '../contexts/AppearanceContext'
// The `semantic-color` page stylesheet. Imported here rather than from global.css so
// Vite emits it as this lazy route's own chunk stylesheet — only a visitor who
// opens this page downloads it, and it arrives with the chunk, before paint.
// The stylesheet families this surface needs, split out of the one
// render-blocking global sheet (see src/styles/deferred/). They ride this
// route's own lazy chunk, so they arrive with it and never with the homepage.
import '../styles/deferred/account.css'
import '../styles/deferred/colour.css'
import '../styles/deferred/tool-shell.css'
import '../styles/pages/semantic-color.css'

const ROLES = ['PRIMARY', 'SECONDARY', 'ACCENT', 'SUBTLE', 'DEEP']

// THE SEMANTIC SET is four roles, steps 50–900:
// Success, Warning, Error, Information. Information carries what "pending"
// used to (underway, no outcome yet), and it comes in two hue families — blue
// (the default) or purple — chosen with the Information pills in the side
// card. The choice flows through every export (copy, CSS download, HTML style
// guide, the cached shades other exports read).
//
// SAVED DATA: a project saved with a `pending` key has it DROPPED on load — it
// is not folded into Information, because folding would overwrite the
// Information choice the person made. Nothing else about the saved set moves.
// The roles, their ramps, the purple Information family and the resolver
// live in data/semanticPresets.js, which the token export reads too, so the
// tool and every exported file resolve a saved selection the same way.

// `purple` is the index into INFO_PURPLE each bundle uses when Information is
// set to purple — the index its retired pending ramp had, so a bundle keeps
// its character in either family.
const STATE_BUNDLES = [
  { name: 'Balanced', desc: 'Familiar, calm defaults for most product UI.', config: { success: 1, warning: 0, error: 0, info: 0 }, purple: 0 },
  { name: 'Material', desc: 'Established Material state foundations.', config: { success: 4, warning: 4, error: 4, info: 4 }, purple: 4 },
  { name: 'Vivid', desc: 'Higher chroma for expressive interfaces.', config: { success: 0, warning: 2, error: 1, info: 2 }, purple: 2 },
  { name: 'Cool', desc: 'Teal, yellow, pink, sky and violet emphasis.', config: { success: 2, warning: 1, error: 2, info: 1 }, purple: 0 },
  { name: 'Warm', desc: 'Classic green, amber and red signals.', config: { success: 1, warning: 0, error: 0, info: 2 }, purple: 2 },
  { name: 'Apple', desc: 'System colours aligned with Apple platforms.', config: { success: 3, warning: 3, error: 3, info: 3 }, purple: 3 },
  { name: 'Tailwind', desc: 'Direct mapping to Tailwind colour ramps.', config: { success: 5, warning: 5, error: 5, info: 5 }, purple: 5 },
]

// The cue is the NON-COLOUR half of each role (WCAG 1.4.1).
const STATE_META = {
  success: { label: 'Success', cue: '✓', intent: 'Completed, connected or ready' },
  warning: { label: 'Warning', cue: '!', intent: 'Needs attention before continuing' },
  error: { label: 'Error', cue: '×', intent: 'Failed, destructive or blocked' },
  info: { label: 'Information', cue: 'i', intent: 'Context, or work that is underway' },
}

// Reference "500" per role from the Balanced bundle — the seed for each role's
// custom hue arc (Cluster F).
const STATE_REF_HEX = Object.fromEntries(
  Object.entries(STATE_BUNDLES[0].config).map(([role, idx]) => [role, STATE_PRESETS[role][idx].shades[5]])
)
const ROLE_ARCS = roleHueArcs(STATE_REF_HEX)

// The preset list a role offers: Information's depends on its hue family.
const presetsFor = (state, infoHue) => (state === 'info' && infoHue === 'purple' ? INFO_PURPLE : STATE_PRESETS[state])

// Load a saved `design.states`: the four roles (a retired `pending` is
// dropped) and the Information hue family, blue unless purple was chosen.
const initialStates = readSemanticStates

function StateShade({ shade, label, onCopy, base }) {
  const fg = textColorForBg(shade)
  return (
    <div onClick={() => onCopy(shade)}
      role="button" tabIndex={0} aria-label={`Copy ${label}, ${shade.toUpperCase()}${base ? ', the base step' : ''}`}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onCopy(shade) } }}
      className={base ? 'stc-cell is-base' : 'stc-cell'}
      ref={(el) => { if (el) { el.style.setProperty('--stc-c', shade); el.style.setProperty('--stc-ink', fg) } }}
    >
      <span className="stc-cell-swatch" aria-hidden="true" />
      <span className="stc-cell-tone">{label}</span>
    </div>
  )
}

const BASE_STEPS = [
  { value: 4, label: 'Step 400' },
  { value: 5, label: 'Step 500' },
  { value: 6, label: 'Step 600' },
]
const alphaOf = (hex, a) => `color-mix(in srgb, ${hex} ${Math.round(a * 100)}%, transparent)`


export default function ColorStudio({ onCopy, toast }) {
  // downloadHTML and downloadCSS produce FILES and need a free account;
  // copyCSS beside them stays free forever. See src/hooks/useExportGate.js.
  const requireExportAccount = useExportGate()
  const { theme } = useTheme()
  const { rounding } = useAppearance()
  const { design, setPalette, setStates, setTints, setGradient, saveProject, projects, loadProject, overwriteProject, canSaveProjects } = useProject()

  const [undoToast, setUndoToast] = useState(null)
  const undoTimerRef = useRef(null)
  const dismissUndo = useCallback(() => {
    clearTimeout(undoTimerRef.current)
    setUndoToast(null)
  }, [])

  const [baseColor, setBaseColor] = useState(() => design?.palette?.base || '#2563EB')
  const [harmony] = useState(() => design?.palette?.harmony || 'auto')
  // Engine selector — 'auto' (HCT/Material-3 tonal) is the Slice-1 default and the
  // only mode wired so far. The Auto/HSL toggle UI is a later slice; we read+persist
  // `mode` now (so the value round-trips through ProjectContext) but don't expose a
  // setter until that toggle exists. Add `setMode` back when the toggle lands.
  const [mode] = useState(() => design?.palette?.mode || 'auto')
  const [globalAdjust] = useState(() => design?.palette?.globalAdjust || { h: 0, s: 0, b: 0, temp: 0 })
  const [extraColors, setExtraColors] = useState(() => design?.palette?.extraColors || [])
  // Reconcile the incoming palette against this studio's base+harmony model.
  // The Palette Builder (and project loads / brand + variation picks) persist the
  // full, authoritative palette in `colors`, but describe the five roles ONLY
  // there — not via base+harmony, which can't reproduce a brand or hand-authored
  // palette. Without this, a handed-off Apple/variation palette would be rebuilt
  // from just its first colour + analogous (and then written back, corrupting the
  // shared state). Pin any role the harmony generator wouldn't regenerate as an
  // override so the palette survives the tool switch. Skipped when a global-adjust
  // lens is baked into `colors` (the studio's own base+harmony+adjust round-trip
  // is already faithful, and pinning the adjusted colours would double-apply it).
  const [overrides, setOverrides] = useState(() => {
    const p = design?.palette || {}
    const stored = p.overrides || {}
    const full = Array.isArray(p.colors) ? p.colors : null
    const adj = p.globalAdjust
    const zeroAdj = !adj || (!adj.h && !adj.s && !adj.b && !adj.temp)
    if (!full || full.length < 2 || !zeroAdj) return stored
    const gen = generateHarmony(p.base || '#2563EB', p.harmony || 'auto')
    const merged = { ...stored }
    for (let i = 0; i < gen.length; i++) {
      const c = full[i]
      if (c && gen[i] && !merged[i] && c.toUpperCase() !== gen[i].toUpperCase()) merged[i] = c
    }
    return merged
  })
  // The four roles, seeded from the default bundle with the saved values
  // winning; a retired `pending` key is dropped (see initialStates), and the
  // Information hue family is read beside them.
  const [initial] = useState(() => initialStates(design?.states))
  const [stateColors, setStateColors] = useState(initial.roles)
  const [infoHue, setInfoHue] = useState(initial.infoHue)
  const [baseStep, setBaseStep] = useState(5)
  const [activeColorIdx] = useState(() => design?.palette?.activeIdx || 0)
  const [locked] = useState(() => new Set(design?.palette?.locked || []))
  const [cbMode] = useState('normal')  // 'normal' | one of CB_MODES

  // Tint-ramp tuning. The standalone Tints section (with its sliders) folded
  // into the palette builder's per-card tonal undersides in Slice 1; these
  // values still drive tintScale/allTintScales (used by Systems + exports), so
  // they persist at their saved/default settings until a later slice re-exposes
  // controls for them.
  const lumBias = design?.tints?.lumBias ?? 82
  const satDecay = design?.tints?.satDecay ?? 12
  const oled = design?.tints?.oled ?? true

  const [gradStops] = useState(() => design?.gradient?.stops || [{ color: null, position: 0 }, { color: null, position: 100 }])
  const [gradAngle] = useState(() => design?.gradient?.angle ?? 135)
  const [gradType] = useState(() => design?.gradient?.type || 'Linear')


  // Memoised on its scalar inputs so the array identity is stable across unrelated
  // renders — otherwise the whole downstream pipeline (baseColors→allColors→cbColors
  // →cbClash, incl. applyAdjust/simCvd per swatch) would recompute on every state
  // change (menus, toasts). generateHarmony is pure for a given (base, harmony).
  const colors = useMemo(() => generateHarmony(baseColor, harmony), [baseColor, harmony])
  // Per-index manual overrides applied on top of the harmony-generated colours.
  const resolvedColors = useMemo(() => colors.map((c, i) => overrides[i] || c), [colors, overrides])
  // baseColors = the RAW palette (generator + overrides + extras). All write-back
  // handlers (drag/edit/remove/randomise) operate on THIS — the global adjust is a
  // non-destructive lens layered on top for display/export only.
  const baseColors = useMemo(() => [...resolvedColors, ...extraColors], [resolvedColors, extraColors])
  // allColors = baseColors through the global-adjust lens. applyAdjust returns the
  // same array reference when the adjust is zeroed (identity), so every downstream
  // consumer/export is untouched until a slider moves.
  const allColors = useMemo(() => applyAdjust(baseColors, globalAdjust), [baseColors, globalAdjust])


  // CB segmented-toggle sliding thumb — same measure technique as the page nav
  // (DRY: third use of the pattern). Sets --cs-cb-x / --cs-cb-w on the thumb ref.
  const cbBarRef = useRef(null)
  const cbThumbRef = useRef(null)
  const cbSegRefs = useRef({})
  const measureCbThumb = useCallback(() => {
    const el = cbSegRefs.current[cbMode]
    const thumb = cbThumbRef.current
    if (!el || !thumb) return
    thumb.style.setProperty('--cs-cb-x', el.offsetLeft + 'px')
    thumb.style.setProperty('--cs-cb-w', el.offsetWidth + 'px')
  }, [cbMode])
  useLayoutEffect(() => { measureCbThumb() }, [measureCbThumb])
  useEffect(() => {
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measureCbThumb) : null
    if (ro && cbBarRef.current) ro.observe(cbBarRef.current)
    window.addEventListener('resize', measureCbThumb)
    document.fonts?.ready.then(measureCbThumb).catch(() => {})
    return () => { if (ro) ro.disconnect(); window.removeEventListener('resize', measureCbThumb) }
  }, [measureCbThumb])

  // ── Free-tier 6-colour cap (CS#3.17) — single state-level chokepoint ──
  // Every palette-growth path (insert-between, manual hue-offset, custom pick,
  // brand-palette merge) funnels through these two helpers so the cap is enforced
  // in the reducer logic, not just the UI — it holds against a console caller, not
  // only a button click. PRO_MAX is the free ceiling on TOTAL swatches.
  const PRO_MAX = 8

  // Sync palette state to ProjectContext (full design persistence)
  useEffect(() => {
    setPalette({ base: baseColor, harmony, mode, globalAdjust, extraColors, overrides, activeIdx: activeColorIdx, colors: allColors, locked: [...locked] })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseColor, harmony, mode, JSON.stringify(globalAdjust), extraColors, JSON.stringify(overrides), activeColorIdx, allColors.join(',')])

  useEffect(() => {
    // `pending: undefined` because setStates MERGES into the saved states — a
    // saved retired key would otherwise ride along forever. JSON drops it.
    setStates({ ...stateColors, infoHue, pending: undefined })
    // Cache resolved state shades to localStorage so the global style-guide
    // export (in TopBar) can include them without needing STATE_PRESETS.
    try {
      const resolved = Object.fromEntries(
        ROLE_IDS.map((state) => [state, resolveStateShades(state, stateColors[state], infoHue)])
      )
      localStorage.setItem('vs-state-shades', JSON.stringify(resolved))
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateColors, infoHue])

  // The gradient editor is gone from this page, but this state is NOT dead: the
  // effect below still runs on every mount and writes the gradient through to
  // ProjectContext. It is seeded from the project and never changes afterwards,
  // so the write is the same round-trip it always was. Removing it would change
  // what a project stores, which is a product decision rather than a dead-code
  // one - see the pipeline note on colorstudio-dead-sections.
  useEffect(() => {
    setGradient({ stops: gradStops, angle: gradAngle, type: gradType })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gradStops, gradAngle, gradType])

  // Tonal randomise (CS#3.10). Default mode='auto' deals an HCT/Material-3 tonal
  // palette mapped to the 5 ROLES — accessible-by-construction. Locked swatches
  // survive. Murphy's-law: if the HCT solver throws, fall back to HSL random +
  // a non-blocking toast; never white-screen.
  const randomize = useCallback(() => {
    let fresh
    try {
      fresh = autoTonalPalette()
      if (!Array.isArray(fresh) || fresh.length < colors.length || fresh.some(c => !/^#[0-9a-f]{6}$/i.test(c))) {
        throw new Error('tonal palette invalid')
      }
    } catch {
      fresh = colors.map(() => hslToHex(Math.floor(Math.random() * 360), 50 + Math.floor(Math.random() * 40), 50 + Math.floor(Math.random() * 30)))
      toast?.('Colour engine fell back to a simple random palette')
    }

    if (!locked.has(0)) setBaseColor(fresh[0])
    setOverrides(prev => {
      const next = { ...prev }
      for (let i = 1; i < colors.length; i++) {
        if (locked.has(i)) next[i] = baseColors[i]       // keep the locked colour
        else next[i] = fresh[i] || hslToHex(Math.floor(Math.random() * 360), 60, 55)
      }
      return next
    })
    setExtraColors(prev => prev.map((c, i) => {
      const globalIdx = colors.length + i
      if (locked.has(globalIdx)) return c
      return hslToHex(Math.floor(Math.random() * 360), 50 + Math.floor(Math.random() * 40), 50 + Math.floor(Math.random() * 30))
    }))
  }, [locked, colors, baseColors, toast])

  // Deal a fresh Auto tonal palette once on mount (CS#3.8) — only if the user
  // hasn't carried in a saved/customised palette.
  const didInitRandomRef = useRef(false)
  useEffect(() => {
    if (didInitRandomRef.current) return
    didInitRandomRef.current = true
    const pristine = harmony === 'auto' && extraColors.length === 0 && Object.keys(overrides).length === 0 && (baseColor === '#2563EB' || baseColor === '#0051FF')
    if (pristine) randomize()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])


  const activeColor = allColors[activeColorIdx] || allColors[0]

  const tintScale = useMemo(() => {
    return generateTintScale({
      hex: activeColor, anchor: 5, hueShift: 0,
      satMin: -satDecay, satMax: satDecay / 2,
      lMin: oled ? 3 : 5, lMax: lumBias, mode: 'perceived',
    })
  }, [activeColor, lumBias, satDecay, oled])

  // Sync tints to ProjectContext
  useEffect(() => {
    setTints({ lumBias, satDecay, oled, scale: tintScale })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lumBias, satDecay, oled, tintScale.join(',')])

  const { registerExport, clearExport } = useExport()

  useEffect(() => {
    const labels = allColors.map((_, i) => ['Primary', 'Secondary', 'Accent', 'Neutral', 'Surface'][i] || `Colour ${i + 1}`)
    const stateLabels = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900']

    const buildVars = () => {
      const colorVars = allColors.map((c, i) => `  --color-${labels[i].toLowerCase().replace(/\s+/g, '-')}: ${c};`).join('\n')
      const tintVars = tintScale.map((c, i) => `  --tint-${i + 1}: ${c};`).join('\n')
      const stateVars = ROLE_IDS.map((state) => {
        const shades = resolveStateShades(state, stateColors[state], infoHue)
        return shades.map((c, i) => `  --${state}-${stateLabels[i]}: ${c};`).join('\n')
      }).join('\n')
      return { colorVars, tintVars, stateVars }
    }

    const generateHTML = () => {
      const { colorVars, tintVars, stateVars } = buildVars()
      const stateEntries = ROLE_IDS.map((state) => ({
        name: state, shades: resolveStateShades(state, stateColors[state], infoHue)
      }))
      const isDark = theme === 'dark'
      const rdMap = { none: ['0px', '0px'], subtle: ['6px', '4px'], default: ['12px', '8px'], pronounced: ['20px', '14px'] }
      const [rdVal, rdSVal] = rdMap[rounding] || rdMap.default
      return `<!DOCTYPE html>
<html lang="en" data-theme="${isDark ? 'dark' : 'light'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Design System — UIL4B</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
:root {
${colorVars}
${tintVars}
${stateVars}
  --ds-bg: #faf9f7; --ds-bg2: #fff; --ds-text: #1a1a17; --ds-text2: #6b6b63;
  --ds-text3: #a3a299; --ds-border: rgba(0,0,0,.08); --ds-border2: rgba(0,0,0,.05);
  --ds-code-bg: #1a1a17; --ds-code-text: #e5e5dd;
  --ds-sidebar: rgba(255,255,255,.85); --ds-hover: rgba(0,0,0,.04);
  --ds-accent: #a78bfa; --ds-accent-bg: rgba(167,139,250,.1);
  --ds-radius: ${rdVal}; --ds-radius-s: ${rdSVal};
  --ds-shadow: 0 1px 3px rgba(0,0,0,.04), 0 4px 12px rgba(0,0,0,.03);
  --ds-shadow-lg: 0 4px 16px rgba(0,0,0,.06), 0 12px 40px rgba(0,0,0,.04);
  --ds-glass: rgba(255,255,255,.6);
}
[data-theme="dark"] {
  --ds-bg: #0d0d0c; --ds-bg2: #161614; --ds-text: #e8e8e2; --ds-text2: #8a8a80;
  --ds-text3: #555550; --ds-border: rgba(255,255,255,.07); --ds-border2: rgba(255,255,255,.04);
  --ds-code-bg: #111110; --ds-code-text: #d4d4cc;
  --ds-sidebar: rgba(17,17,15,.9); --ds-hover: rgba(255,255,255,.04);
  --ds-accent: #a78bfa; --ds-accent-bg: rgba(167,139,250,.12);
  --ds-shadow: 0 1px 3px rgba(0,0,0,.2), 0 4px 12px rgba(0,0,0,.15);
  --ds-shadow-lg: 0 4px 16px rgba(0,0,0,.3), 0 12px 40px rgba(0,0,0,.2);
  --ds-glass: rgba(255,255,255,.04);
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; background: var(--ds-bg); color: var(--ds-text); line-height: 1.6; display: flex; min-height: 100vh; -webkit-font-smoothing: antialiased; }
.sidebar { position: fixed; top: 0; left: 0; width: 220px; height: 100vh; background: var(--ds-sidebar); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border-right: 1px solid var(--ds-border); padding: 24px 0; overflow-y: auto; z-index: 10; }
.sidebar-brand { padding: 0 20px 20px; border-bottom: 1px solid var(--ds-border); margin-bottom: 12px; }
.sidebar-brand h3 { font-size: 14px; font-weight: 800; letter-spacing: -.02em; }
.sidebar-brand .brand-sub { font-size: 10px; color: var(--ds-accent); display: block; margin-top: 2px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; }
.sidebar-brand .brand-date { font-size: 10px; color: var(--ds-text3); display: block; margin-top: 4px; }
.sidebar .nav-label { font-size: 9px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--ds-text3); padding: 16px 20px 6px; }
.sidebar a { display: block; padding: 8px 20px; font-size: 12px; font-weight: 500; color: var(--ds-text2); text-decoration: none; transition: all .15s; border-left: 2px solid transparent; }
.sidebar a:hover { color: var(--ds-text); background: var(--ds-hover); }
.sidebar a.active { color: var(--ds-accent); background: var(--ds-accent-bg); border-left-color: var(--ds-accent); }
.sidebar-footer { position: absolute; bottom: 0; left: 0; right: 0; padding: 16px 20px; border-top: 1px solid var(--ds-border); }
.sidebar-footer span { font-size: 9px; color: var(--ds-text3); letter-spacing: .04em; }
.content { margin-left: 220px; flex: 1; padding: 48px 48px; max-width: 920px; }
header { margin-bottom: 48px; }
header .tag { display: inline-block; font-size: 10px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--ds-accent); background: var(--ds-accent-bg); padding: 4px 12px; border-radius: 20px; margin-bottom: 14px; }
header h1 { font-size: 2.2rem; font-weight: 800; letter-spacing: -.03em; line-height: 1.1; margin-bottom: 8px; }
header p { font-size: 14px; color: var(--ds-text2); line-height: 1.7; }
.meta { font-size: 11px; color: var(--ds-text3); margin-top: 8px; font-family: 'SF Mono', 'Fira Code', monospace; }
.format-bar { display: flex; gap: 4px; margin-bottom: 24px; flex-wrap: wrap; }
.fmt-btn { padding: 6px 14px; border: 1px solid var(--ds-border); background: var(--ds-glass); color: var(--ds-text2); font-size: 10px; font-weight: 600; letter-spacing: .04em; border-radius: var(--ds-radius-s); cursor: pointer; font-family: inherit; text-transform: uppercase; transition: all .2s cubic-bezier(.16,1,.3,1); }
.fmt-btn:hover { border-color: var(--ds-text2); color: var(--ds-text); transform: translateY(-1px); }
.fmt-btn.active { background: var(--ds-accent-bg); color: var(--ds-accent); border-color: rgba(167,139,250,.3); box-shadow: 0 0 0 1px rgba(167,139,250,.1); }
section { margin-bottom: 56px; scroll-margin-top: 24px; }
section h2 { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .1em; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 1px solid var(--ds-border2); color: var(--ds-text3); }
.color-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 14px; }
.color-card { border-radius: var(--ds-radius); overflow: hidden; border: 1px solid var(--ds-border); background: var(--ds-bg2); cursor: pointer; transition: all .25s cubic-bezier(.16,1,.3,1); box-shadow: var(--ds-shadow); }
.color-card:hover { transform: translateY(-3px); box-shadow: var(--ds-shadow-lg); }
.color-swatch { height: 80px; position: relative; transition: filter .2s ease; }
.color-card:hover .color-swatch { filter: brightness(1.12) saturate(1.05); }
.color-swatch .swatch-overlay { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; font-weight: 600; color: #fff; background: rgba(0,0,0,.5); backdrop-filter: blur(4px); opacity: 0; transition: opacity .2s; }
.color-card:hover .swatch-overlay { opacity: 1; }
.swatch-overlay .hex-val { font-size: 11px; letter-spacing: .04em; text-transform: uppercase; }
.swatch-overlay .rgb-val { font-size: 9px; opacity: .85; font-family: 'SF Mono', 'Fira Code', monospace; }
.color-info { padding: 12px; }
.color-name { font-weight: 600; font-size: 12px; margin-bottom: 3px; }
.color-val { font-family: 'SF Mono', 'Fira Code', monospace; font-size: 11px; color: var(--ds-text2); }
.tint-row { display: flex; gap: 4px; }
.tint-swatch { flex: 1; height: 48px; border-radius: var(--ds-radius-s); cursor: pointer; display: flex; align-items: flex-end; justify-content: center; padding-bottom: 5px; transition: transform .15s cubic-bezier(.16,1,.3,1); box-shadow: inset 0 -1px 0 rgba(0,0,0,.06); }
.tint-swatch:hover { transform: scaleY(1.2) translateY(-2px); }
.tint-swatch span { font-size: 7px; font-family: 'SF Mono', 'Fira Code', monospace; opacity: .5; }
.state-section { margin-bottom: 24px; }
.state-label { font-size: 11px; font-weight: 700; text-transform: capitalize; margin-bottom: 8px; letter-spacing: .02em; }
.state-row { display: flex; gap: 4px; }
.state-chip { flex: 1; height: 40px; border-radius: var(--ds-radius-s); display: flex; align-items: flex-end; justify-content: center; padding-bottom: 4px; cursor: pointer; transition: transform .15s cubic-bezier(.16,1,.3,1); }
.state-chip:hover { transform: scaleY(1.15) translateY(-1px); }
.state-chip span { font-size: 7px; font-family: 'SF Mono', 'Fira Code', monospace; opacity: .5; }
pre.code { background: var(--ds-code-bg); color: var(--ds-code-text); padding: 24px; border-radius: var(--ds-radius); overflow-x: auto; font-size: 11px; line-height: 1.9; border: 1px solid var(--ds-border); font-family: 'SF Mono', 'Fira Code', monospace; }
.toast { position: fixed; bottom: 24px; right: 24px; background: var(--ds-text); color: var(--ds-bg); padding: 10px 20px; border-radius: var(--ds-radius-s); font-size: 12px; font-weight: 600; opacity: 0; transition: opacity .2s, transform .2s; pointer-events: none; z-index: 100; transform: translateY(8px); box-shadow: var(--ds-shadow-lg); }
.toast.show { opacity: 1; transform: translateY(0); }
.theme-toggle { position: fixed; top: 16px; right: 16px; z-index: 20; background: var(--ds-glass); border: 1px solid var(--ds-border); backdrop-filter: blur(12px); padding: 8px 14px; border-radius: var(--ds-radius-s); cursor: pointer; font-size: 11px; font-weight: 600; color: var(--ds-text2); font-family: inherit; transition: all .15s; }
.theme-toggle:hover { color: var(--ds-text); border-color: var(--ds-text2); }
@media (max-width: 700px) {
  .sidebar { display: none; }
  .content { margin-left: 0; padding: 24px 16px; }
  .theme-toggle { top: 12px; right: 12px; }
}
  </style>
</head>
<body>
  <button class="theme-toggle" onclick="var t=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=t;this.textContent=t==='dark'?'Light Mode':'Dark Mode'">${isDark ? 'Light Mode' : 'Dark Mode'}</button>
  <nav class="sidebar">
    <div class="sidebar-brand"><h3>UIL4B</h3><span class="brand-sub">Design System</span><span class="brand-date">Generated ${new Date().toLocaleDateString()}</span></div>
    <div class="nav-label">Sections</div>
    <a href="#colours" class="active">Colours</a>
    <a href="#tint-scale">Tint Scale</a>
    <a href="#state-colours">State Colours</a>
    <a href="#css-properties">CSS Properties</a>
    <div class="sidebar-footer"><span>Exported from UIL4B</span></div>
  </nav>
  <div class="content">
    <header>
      <span class="tag">Design System Export</span>
      <h1>Colour System</h1>
      <p>Complete colour palette, tint scale, and UI state colours with CSS custom properties ready for production.</p>
    </header>
    <div class="format-bar">
      <button class="fmt-btn active" data-fmt="hex">HEX</button>
      <button class="fmt-btn" data-fmt="rgb">RGB</button>
      <button class="fmt-btn" data-fmt="hsl">HSL</button>
      <button class="fmt-btn" data-fmt="hsb">HSB</button>
      <button class="fmt-btn" data-fmt="cmyk">CMYK</button>
      <button class="fmt-btn" data-fmt="oklch">OKLCH</button>
    </div>
    <section id="colours">
      <h2>Colours</h2>
      <div class="color-grid">
${allColors.map((c, i) => {
          const rgb = hexToRgb(c)
          return `        <div class="color-card" data-hex="${c}">
          <div class="color-swatch" style="background:${c}">
            <div class="swatch-overlay">
              <span class="hex-val">${c.toUpperCase()}</span>
              <span class="rgb-val">rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})</span>
            </div>
          </div>
          <div class="color-info">
            <div class="color-name">${labels[i]}</div>
            <div class="color-val">${c.toUpperCase()}</div>
          </div>
        </div>`
        }).join('\n')}
      </div>
    </section>
    <section id="tint-scale">
      <h2>Tint Scale</h2>
      <div class="tint-row">
${tintScale.map((c) => `        <div class="tint-swatch" data-hex="${c}" style="background:${c}"><span>${c.toUpperCase()}</span></div>`).join('\n')}
      </div>
    </section>
    <section id="state-colours">
      <h2>State Colours</h2>
${stateEntries.map(s => `      <div class="state-section">
        <div class="state-label">${s.name}</div>
        <div class="state-row">
${s.shades.map((c, i) => `          <div class="state-chip" data-hex="${c}" style="background:${c};color:${i < 5 ? '#000' : '#fff'}"><span>${stateLabels[i]}</span></div>`).join('\n')}
        </div>
      </div>`).join('\n')}
    </section>
    <section id="css-properties">
      <h2>CSS Custom Properties</h2>
      <pre class="code">:root {
${colorVars}
${tintVars}
${stateVars}
}</pre>
    </section>
  </div>
  <div class="toast" id="toast"></div>
  <script>
(function(){
  function hexToRgb(h){h=h.replace('#','');var r=parseInt(h.substr(0,2),16),g=parseInt(h.substr(2,2),16),b=parseInt(h.substr(4,2),16);return{r:r,g:g,b:b}}
  function hexToHsl(h){var c=hexToRgb(h),r=c.r/255,g=c.g/255,b=c.b/255,mx=Math.max(r,g,b),mn=Math.min(r,g,b),l=(mx+mn)/2,s=0,hh=0;if(mx!==mn){var d=mx-mn;s=l>.5?d/(2-mx-mn):d/(mx+mn);if(mx===r)hh=((g-b)/d+(g<b?6:0))/6;else if(mx===g)hh=((b-r)/d+2)/6;else hh=((r-g)/d+4)/6}return{h:Math.round(hh*360),s:Math.round(s*100),l:Math.round(l*100)}}
  function hexToHsb(h){var c=hexToRgb(h),r=c.r/255,g=c.g/255,b=c.b/255,mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn,s=mx===0?0:d/mx,v=mx,hh=0;if(d!==0){if(mx===r)hh=((g-b)/d+(g<b?6:0))/6;else if(mx===g)hh=((b-r)/d+2)/6;else hh=((r-g)/d+4)/6}return{h:Math.round(hh*360),s:Math.round(s*100),b:Math.round(v*100)}}
  function hexToCmyk(h){var c=hexToRgb(h),r=c.r/255,g=c.g/255,b=c.b/255,k=1-Math.max(r,g,b);if(k===1)return{c:0,m:0,y:0,k:100};return{c:Math.round((1-r-k)/(1-k)*100),m:Math.round((1-g-k)/(1-k)*100),y:Math.round((1-b-k)/(1-k)*100),k:Math.round(k*100)}}
  function hexToOklch(h){var c=hexToRgb(h),r=c.r/255,g=c.g/255,b=c.b/255;function lin(v){return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4)}var lr=lin(r),lg=lin(g),lb=lin(b);var l=Math.cbrt(.4122214708*lr+.5363325363*lg+.0514459929*lb);var m=Math.cbrt(.2119034982*lr+.6806995451*lg+.1073969566*lb);var s=Math.cbrt(.0883024619*lr+.2164557872*lg+.6652917509*lb);var L=.2104542553*l+.793617785*m-.0040720468*s;var a=1.9779984951*l-2.428592205*m+.4505937099*s;var bb=.0259040371*l+.7827717662*m-.808675766*s;var C=Math.sqrt(a*a+bb*bb);var H=Math.atan2(bb,a)*180/Math.PI;if(H<0)H+=360;return{l:+(L*100).toFixed(1),c:+C.toFixed(3),h:+H.toFixed(1)}}
  function fmt(hex,f){hex=hex.trim();switch(f){case'hex':return hex.toUpperCase();case'rgb':var c=hexToRgb(hex);return'rgb('+c.r+', '+c.g+', '+c.b+')';case'hsl':var h=hexToHsl(hex);return'hsl('+h.h+', '+h.s+'%, '+h.l+'%)';case'hsb':var v=hexToHsb(hex);return'hsb('+v.h+', '+v.s+'%, '+v.b+'%)';case'cmyk':var k=hexToCmyk(hex);return'cmyk('+k.c+'%, '+k.m+'%, '+k.y+'%, '+k.k+'%)';case'oklch':var o=hexToOklch(hex);return'oklch('+o.l+'% '+o.c+' '+o.h+')';default:return hex.toUpperCase()}}
  var cur='hex';
  var toast=document.getElementById('toast');var tid;
  function show(m){toast.textContent=m;toast.classList.add('show');clearTimeout(tid);tid=setTimeout(function(){toast.classList.remove('show')},1800)}
  function update(){document.querySelectorAll('.color-val').forEach(function(el){var card=el.closest('[data-hex]');if(card)el.textContent=fmt(card.dataset.hex,cur)});document.querySelectorAll('.tint-swatch span, .state-chip span').forEach(function(el){var p=el.closest('[data-hex]');if(p)el.textContent=fmt(p.dataset.hex,cur)})}
  document.querySelectorAll('.fmt-btn').forEach(function(btn){btn.addEventListener('click',function(){cur=btn.dataset.fmt;document.querySelectorAll('.fmt-btn').forEach(function(b){b.classList.remove('active')});btn.classList.add('active');update()})});
  document.querySelectorAll('[data-hex]').forEach(function(el){el.addEventListener('click',function(){var t=fmt(el.dataset.hex,cur);navigator.clipboard.writeText(t).then(function(){show('Copied: '+t)}).catch(function(){show('Copied: '+t)})})});
  document.querySelectorAll('.sidebar a').forEach(function(a){a.addEventListener('click',function(){document.querySelectorAll('.sidebar a').forEach(function(l){l.classList.remove('active')});a.classList.add('active')})});
  var sections=document.querySelectorAll('section[id]');var links=document.querySelectorAll('.sidebar a');
  var io=new IntersectionObserver(function(entries){entries.forEach(function(e){if(e.isIntersecting){links.forEach(function(l){l.classList.toggle('active',l.getAttribute('href')==='#'+e.target.id)})}})},{rootMargin:'-20% 0px -60% 0px'});
  sections.forEach(function(s){io.observe(s)});
})();
  </script>
</body>
</html>`
    }

    registerExport({
      label: 'Colour System',
      downloadHTML: async () => {
        if (!(await requireExportAccount('download the colour system'))) return
        const html = generateHTML()
        const blob = new Blob([html], { type: 'text/html' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'colour-system.html'
        a.click()
        URL.revokeObjectURL(url)
      },
      downloadCSS: async () => {
        if (!(await requireExportAccount('download the colour system CSS'))) return
        const { colorVars, tintVars, stateVars } = buildVars()
        const css = `:root {\n${colorVars}\n\n${tintVars}\n\n${stateVars}\n}\n`
        const blob = new Blob([css], { type: 'text/css' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'colour-system.css'
        a.click()
        URL.revokeObjectURL(url)
      },
      copyCSS: () => {
        const { colorVars, tintVars, stateVars } = buildVars()
        onCopy(`:root {\n${colorVars}\n\n${tintVars}\n\n${stateVars}\n}`)
      },
    })

    return () => clearExport()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allColors.join(','), tintScale.join(','), JSON.stringify(stateColors), infoHue, theme, rounding])



  // Colour System popup (CS#3.14, Slice 3) — replaced the old cs-add-menu dropdown.
  const [csysOpen, setCsysOpen] = useState(false)
  // Close on route change (the popup is anchored to a page-local trigger).
  useEffect(() => {
    if (!csysOpen) return
    const onPop = () => setCsysOpen(false)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [csysOpen])



  const [saveProjectName, setSaveProjectName] = useState('')
  const [saveMenuOpen, setSaveMenuOpen] = useState(false)
  // THE CAP'S REFUSAL, HELD UNDER THE FIELD IT REFUSED.
  //
  // It used to go out through `toast?.(err.message)`, which is the SUCCESS
  // toast: `class="toast toast-success show"`, on a white ground, carrying
  // "Free plan saves up to 3 projects — go Pro for unlimited." with nothing to
  // press. That is the exact fault #436 named and #437 fixed on the Palette
  // Builder and on /projects; this page still had it. Measured 2026-09-11,
  // signed in free with three saved projects, 1440x900: the message arrived as
  // toast-success, the panel stayed open, the typed name stayed in the field,
  // and no way to Pro was offered anywhere on screen.
  //
  // Same treatment as the other two surfaces now: ProjectContext's own words,
  // under the field, with the way forward as a link — SaveRefusal, so the three
  // cannot drift apart.
  const [saveError, setSaveError] = useState('')

  // The project-name field's accessible name IS its placeholder, written once
  // so the two cannot disagree. A placeholder is not a name: measured on this
  // page the input reported no accessible name at all, so a screen reader read
  // "edit text, blank" for the only field in the panel.
  const SAVE_NAME_LABEL = 'Project name'

  const closeSaveMenu = useCallback(() => { setSaveMenuOpen(false); setSaveError('') }, [])
  const { triggerRef: saveTriggerRef, popRef: savePopRef } = usePopover(saveMenuOpen, closeSaveMenu)

  // One commit path for the panel's two ways to save (Enter in the field, and
  // the Save button), so a refusal cannot be handled one way by one and another
  // way by the other — which is how the toast survived on one of them before.
  const commitSaveProject = useCallback(() => {
    const name = saveProjectName.trim()
    if (!name) return
    try {
      saveProject(name)
      setSaveProjectName(''); setSaveError(''); setSaveMenuOpen(false)
      toast?.('Project saved')
    } catch (err) {
      setSaveError(err?.message || 'Couldn’t save')
    }
  }, [saveProjectName, saveProject, toast])







  // ── Long-press → bottom-sheet context menu (≤480, §4.A) ──
  // 450ms hold with a >10px move / scroll cancel. Touch only; right-click is the
  // desktop path. Refs (not state) so the timer never triggers a render mid-press.
  const lpTimer = useRef(null)
  // Unmount cleanup: a pending long-press would otherwise fire setCtxMenu on an
  // unmounted component (mirrors gapTimerRef/adjustRafRef cleanups).
  useEffect(() => () => clearTimeout(lpTimer.current), [])



  const gapTimerRef = useRef(null)
  useEffect(() => () => { if (gapTimerRef.current) clearTimeout(gapTimerRef.current) }, [])

  // Global-adjust slider write — rAF-throttled so a fast drag coalesces to one
  // state update per frame (<16ms), avoiding re-render thrash on the rail.
  const adjustRafRef = useRef(null)
  useEffect(() => () => { if (adjustRafRef.current) cancelAnimationFrame(adjustRafRef.current) }, [])



  const shadesOf = (state) => resolveStateShades(state, stateColors[state], infoHue)
  const baseOf = (state) => shadesOf(state)[baseStep]
  // The export: the base-step aliases (the design's "SEED AND BASE STEP" code, D:1469)
  // and then every step of every role, `--color-<role>-<step>`.
  const baseCSS = ROLE_IDS.map((state) => `  --color-${state}: ${baseOf(state)};`).join('\n')
  const stateCSS = ROLE_IDS.map((state) => shadesOf(state)
    .map((c, i) => `  --color-${state}-${STATE_LABELS[i]}: ${c};`).join('\n')).join('\n')
  const tokensCSS = `:root {\n${baseCSS}\n\n${stateCSS}\n}`
  const sameRoles = (a, b) => ROLE_IDS.every((r) => JSON.stringify(a[r]) === JSON.stringify(b[r]))
  const activeStateBundleIndex = STATE_BUNDLES.findIndex((bundle) => sameRoles(stateColors, bundle.config))
  const handleStateBundleKeyDown = (event, index) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const last = STATE_BUNDLES.length - 1
    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? last
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? (index - 1 + STATE_BUNDLES.length) % STATE_BUNDLES.length
          : (index + 1) % STATE_BUNDLES.length
    pickBundle(nextIndex)
    requestAnimationFrame(() => document.getElementById(`stc-bundle-${nextIndex}`)?.focus())
  }
  // A bundle sets all four roles; with Information on purple, it takes the
  // bundle's purple ramp.
  const pickBundle = (i) => {
    const b = STATE_BUNDLES[i]
    setStateColors({ ...b.config, info: infoHue === 'purple' ? b.purple : b.config.info })
    setSemCopied(false)
  }
  // Blue ↔ purple keeps the position in the preset list (the two lists are
  // parallel: Blue/Violet, Sky/Purple, Indigo/Fuchsia, Apple, Material,
  // Tailwind). A custom hue returns to the first preset of the new family.
  const pickInfoHue = (hue) => {
    if (hue === infoHue) return
    setInfoHue(hue)
    const sel = stateColors.info
    if (sel && typeof sel === 'object') setStateColors({ ...stateColors, info: 0 })
    setSemCopied(false)
  }

  // "Custom" semantic-hue helpers (Cluster F). Switching a role to Custom seeds
  // the slider at its canonical hue; pasting a hex rotates the pasted hue into
  // the role's arc and clamps it (imports any brand colour, still legible).
  const setCustomHue = (state, hue) => setStateColors({ ...stateColors, [state]: { custom: Math.round(hue) } })
  const applyHexToArc = (state, raw) => {
    const hex = (raw || '').trim().replace(/^#?/, '#')
    if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return false
    const arc = ROLE_ARCS[state]
    const mid = (arc.lo + arc.hi) / 2
    let h = hexToHsl(hex)[0]
    while (h - mid > 180) h -= 360
    while (h - mid < -180) h += 360
    setCustomHue(state, Math.max(arc.lo, Math.min(arc.hi, h)))
    return true
  }

  const [semCopied, setSemCopied] = useState(false)
  const copyStateTokens = async () => {
    const ok = await onCopy(tokensCSS)
    if (ok === false) return
    setSemCopied(true)
    setTimeout(() => setSemCopied(false), 1200)
  }

  // The kit's own brand colour paints "Save changes" in THE COLOURS AT WORK
  // (the design's card fills it with the Brand family, which this set does not have).
  const brand = allColors[0] || baseColor

  // The design's card paints every icon, border and the error line in the role's BASE
  // step (D:1985-1987). On this set that measured under AA in light theme (a
  // 500 amber icon 2.1:1 on the white card, the 500 red error line 3.8:1), so
  // each job walks from the base step toward the readable end of its OWN ramp
  // until it clears its floor on the card — 3:1 for icons and borders (1.4.11),
  // 4.5:1 for text. The wash stays the base step at 14%, as drawn. Nothing is
  // invented: every colour painted is a step of the chosen ramp.
  const card = theme === 'dark' ? '#111215' : '#FFFFFF'
  // The icon sits on the role's own 14% wash, not on the bare card, so that
  // composite is the ground it is measured against.
  const washOver = (hex) => {
    const [r1, g1, b1] = hexToRgb(card)
    const [r2, g2, b2] = hexToRgb(hex)
    const m = (a, b) => Math.round(a * 0.86 + b * 0.14).toString(16).padStart(2, '0')
    return `#${m(r1, r2)}${m(g1, g2)}${m(b1, b2)}`
  }
  const legible = (state, floor) => {
    const shades = shadesOf(state)
    const ground = washOver(shades[baseStep])
    const dir = theme === 'dark' ? -1 : 1
    for (let i = baseStep; i >= 0 && i < shades.length; i += dir) {
      if (contrastRatio(shades[i], ground) >= floor && contrastRatio(shades[i], card) >= floor) return shades[i]
    }
    return shades[dir > 0 ? shades.length - 1 : 0]
  }
  const sceneRef = (el) => {
    if (!el) return
    const set = (k, v) => el.style.setProperty(k, v)
    set('--stc-brand', brand); set('--stc-brand-ink', textColorForBg(brand))
    for (const role of ROLE_IDS) {
      set(`--stc-${role}`, legible(role, 3))
      set(`--stc-${role}-wash`, alphaOf(baseOf(role), 0.14))
    }
    set('--stc-error-text', legible('error', 4.5))
  }

  const saveItem = canSaveProjects ? [{
    id: 'save', priority: 1,
    render: () => (
      <ToolButton
        ref={saveTriggerRef}
        className="stc-save-trigger"
        icon="bookmark-simple"
        aria-expanded={saveMenuOpen}
        aria-haspopup="dialog"
        aria-controls={saveMenuOpen ? 'stc-save-panel' : undefined}
        onClick={() => (saveMenuOpen ? closeSaveMenu() : setSaveMenuOpen(true))}
      >
        Add to project
      </ToolButton>
    ),
    menu: { label: 'Add to project', icon: 'bookmark-simple', onSelect: () => setSaveMenuOpen(true) },
  }] : []

  return (
    // `.stc` is the root every selector in semantic-color.css is scoped under.
    <ToolLayout
      className="stc"
      title="Semantic Colour"
      titleId="stc-title"
      items={saveItem}
      primary={(
        <ToolButton variant="accent" icon="copy" iconSize={14} onClick={copyStateTokens}>
          {semCopied ? 'Copied' : 'Copy tokens'}
        </ToolButton>
      )}
    >
      <div className="stc-body">
        <div className="stc-grid">
          {/* THE COLOURS AT WORK (D:883-907). The design's components, painted from the
              chosen base step of each role. Information carries the
              "underway" meaning the retired pending role had, so it gets both an
              informational note and an in-progress row. The card is a picture
              of an interface, so it is inert: nothing in it can be pressed. */}
          <section className="stc-card stc-work" aria-labelledby="stc-work-title" ref={sceneRef}>
            <h2 id="stc-work-title" className="tl-sec-label">The colours at work</h2>
            <div className="stc-work-body" inert>
              <div className="stc-btns">
                <span className="stc-btn stc-btn--primary">Save changes</span>
                <span className="stc-btn">Cancel</span>
              </div>
              <div className="stc-alert stc-alert--success">
                <ToolIcon name="check-circle" size={16} className="stc-alert-ico" />
                <span>Kit exported to your downloads.</span>
              </div>
              <div className="stc-alert stc-alert--warning">
                <ToolIcon name="warning" size={16} className="stc-alert-ico" />
                <span>Two roles sit below 4.5:1 on paper.</span>
              </div>
              <div className="stc-alert stc-alert--info">
                <ToolIcon name="info" size={16} className="stc-alert-ico" />
                <span>Billing runs on the 1st. Changes apply next cycle.</span>
              </div>
              <div className="stc-alert stc-alert--info">
                <ToolIcon name="circle-notch" size={16} className="stc-alert-ico stc-spin" />
                <span>Publishing design system — 3 of 5 token files written</span>
              </div>
              <div className="stc-field">
                <span className="stc-field-k">Project name</span>
                <span className="stc-field-input">Untitled</span>
                <span className="stc-field-err">
                  <ToolIcon name="x-circle" size={13} />
                  A project needs a name before it can be shared.
                </span>
              </div>
            </div>
          </section>

          {/* SEED AND BASE STEP (D:909-925). The design's Brand hue slider seeds a
              Brand family this set does not have; the build's seed is the
              bundle, so the bundles sit here, then the Information family
              (blue, or its purple alternative), then the design's base-step pills and
              the code the toolbar copies. */}
          <section className="stc-card stc-seed" aria-labelledby="stc-seed-title">
            <h2 id="stc-seed-title" className="tl-sec-label">Seed and base step</h2>
            <div className="stc-bundles" role="radiogroup" aria-label="Semantic colour bundle">
              {STATE_BUNDLES.map((bundle, bundleIndex) => {
                const selected = bundleIndex === activeStateBundleIndex
                return (
                  <button
                    key={bundle.name}
                    type="button"
                    id={`stc-bundle-${bundleIndex}`}
                    className={selected ? 'tl-pill is-on' : 'tl-pill'}
                    role="radio"
                    aria-checked={selected}
                    title={bundle.desc}
                    tabIndex={selected || (activeStateBundleIndex < 0 && bundleIndex === 0) ? 0 : -1}
                    onClick={() => pickBundle(bundleIndex)}
                    onKeyDown={(event) => handleStateBundleKeyDown(event, bundleIndex)}
                  >
                    {bundle.name}
                  </button>
                )
              })}
            </div>
            <div className="stc-row">
              <span className="stc-row-k" id="stc-info-label">Information</span>
              <ToolPills
                labelledBy="stc-info-label"
                options={[{ value: 'blue', label: 'Blue' }, { value: 'purple', label: 'Purple' }]}
                value={infoHue}
                onChange={pickInfoHue}
              />
            </div>
            <ToolPills
              label="Base step"
              mono
              options={BASE_STEPS}
              value={baseStep}
              onChange={(v) => { setBaseStep(v); setSemCopied(false) }}
            />
            <ToolCode tone="page" className="stc-code" label="Semantic colour tokens">{tokensCSS}</ToolCode>
          </section>
        </div>

        {/* The families (D:928-942): one row per role, name and token, the
            role's preset (or a custom hue), and its ten steps with the base
            step ringed. A step copies its hex. */}
        <div className="stc-families">
          {ROLE_IDS.map((state) => {
            const sel = stateColors[state]
            const isCustom = !!(sel && typeof sel === 'object' && Number.isFinite(sel.custom))
            const presets = presetsFor(state, infoHue)
            const shades = shadesOf(state)
            const arc = ROLE_ARCS[state]
            const [, refS, refL] = hexToHsl(STATE_REF_HEX[state])
            const norm = (h) => ((h % 360) + 360) % 360
            const at = (h) => hslToHex(norm(h), refS, refL)
            return (
              <div key={state} className="stc-fam" data-role={state}>
                <div className="stc-fam-id">
                  <span className="stc-fam-name"><span className="stc-fam-cue" aria-hidden="true">{STATE_META[state].cue}</span>{STATE_META[state].label}</span>
                  <span className="stc-fam-token">--color-{state}</span>
                  <ToolSelect
                    className="stc-fam-preset"
                    label="Preset"
                    ariaLabel={`${STATE_META[state].label} preset`}
                    value={isCustom ? 'custom' : String(Number.isInteger(sel) ? sel : 0)}
                    options={[...presets.map((p, pi) => ({ value: String(pi), label: p.name })), { value: 'custom', label: 'Custom' }]}
                    onChange={(v) => {
                      if (v === 'custom') setCustomHue(state, arc.canonical)
                      else setStateColors({ ...stateColors, [state]: Number(v) })
                      setSemCopied(false)
                    }}
                  />
                </div>
                <div className="stc-ramp">
                  {shades.map((shade, si) => (
                    <StateShade key={si} shade={shade} label={STATE_LABELS[si]} onCopy={onCopy} base={si === baseStep} />
                  ))}
                </div>
                {isCustom && (
                  <div className="stc-hue">
                    <ToolSlider
                      wide
                      label="Hue"
                      min={Math.round(arc.lo)}
                      max={Math.round(arc.hi)}
                      step={1}
                      value={sel.custom}
                      onChange={(v) => setCustomHue(state, v)}
                      display={`${norm(sel.custom)}°`}
                      track={`linear-gradient(90deg, ${[0, 0.25, 0.5, 0.75, 1].map((t) => at(arc.lo + t * (arc.hi - arc.lo))).join(', ')})`}
                      ariaLabel={`${state} custom hue`}
                      ariaValueText={describeColor(at(sel.custom))}
                    />
                    {/* Paste any brand colour: its hue is rotated into this
                        role's arc and clamped, so it stays legible as the role. */}
                    <input
                      type="text"
                      className="stc-hue-hex"
                      placeholder="Paste hex"
                      maxLength={7}
                      aria-label={`Import a hex colour for ${state}`}
                      onKeyDown={(e) => {
                        if (e.key !== 'Enter') return
                        if (applyHexToArc(state, e.currentTarget.value)) e.currentTarget.value = ''
                        else toast?.('Enter a six-digit hex colour, for example #16A34A')
                      }}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {saveMenuOpen && (
        <div
          id="stc-save-panel"
          ref={savePopRef}
          className="stc-save-panel"
          role="dialog"
          aria-label="Add current design to project"
          tabIndex={-1}
        >
          <div className="stc-save-title">Add current design to project</div>
          <div className="stc-save-row">
            <input type="text" className="stc-save-input" value={saveProjectName}
              onChange={e => { setSaveProjectName(e.target.value); if (saveError) setSaveError('') }}
              placeholder={`${SAVE_NAME_LABEL}...`} aria-label={SAVE_NAME_LABEL}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commitSaveProject() } }}
            />
            <button type="button" className="tl-btn tl-btn--accent stc-save-go" onClick={commitSaveProject}>Save</button>
          </div>
          {saveError && <SaveRefusal message={saveError} testId="semantic-save-refusal" />}
          {projects.length > 0 && (
            <>
              <div className="stc-save-sub">Overwrite existing</div>
              {projects.slice(-5).map(p => (
                <button key={p.id} type="button" className="stc-save-item"
                  onClick={() => {
                    // An overwrite replaces a record that already exists, so
                    // the cap cannot refuse it — but a missing record still
                    // throws, and a failure has never been a success.
                    try { overwriteProject(p.id); closeSaveMenu(); toast?.('Updated: ' + p.name) }
                    catch (err) { toast?.(err?.message || 'Couldn’t save', 'error') }
                  }}
                >{p.name} <span className="stc-save-item-date">{new Date(p.updatedAt).toLocaleDateString()}</span></button>
              ))}
              <div className="stc-save-sub">Load</div>
              {projects.slice(-5).map(p => (
                <button key={`load-${p.id}`} type="button" className="stc-save-item"
                  onClick={() => { loadProject(p.id); closeSaveMenu(); toast?.('Loaded: ' + p.name) }}
                >{p.name}</button>
              ))}
            </>
          )}
        </div>
      )}

      {undoToast && (
        <div className="cs-undo-toast">
          <span>{undoToast.message}</span>
          <button onClick={() => { undoToast.undoFn(); dismissUndo() }}>Undo</button>
          <button className="cs-undo-dismiss" onClick={dismissUndo}>&times;</button>
        </div>
      )}
    </ToolLayout>
  )
}
