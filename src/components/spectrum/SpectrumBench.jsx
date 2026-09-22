import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getLenis } from '../../hooks/useSmoothScroll'
import NavIcon from '../NavIcon'
import SpectrumIcon from './SpectrumIcon'
import { AI_LIMITS } from '../../config/plans'
import { COLOUR_SYSTEMS } from '../../config/colourSystems'
import { CURATED_LIBRARY_PALETTES } from '../../data/paletteLibrary'
import { contrastRatio, hexToOklch, textColorForBg } from '../../utils/colors'
import { BENCH, LIVE_TOOLS } from './spectrumFacts'

// THE RAIL COUNTS WHAT THE HEADLINE COUNTS, AND IT DID NOT.
//
// The headline says "Thirteen tools", derived from TOOL_COUNT = live AND not
// beta. The rail printed `panel.tools.length`, which is live only — so Brand
// Starter (beta: true) was in the rail's arithmetic and not in the headline's,
// and the five rail rows added up to fourteen a finger-width from a sentence
// saying thirteen. Two derivations of one quantity, side by side, and a reader
// settles it in three seconds.
//
// Fixed by counting off the SAME array TOOL_COUNT measures rather than by
// repeating its predicate here: `LIVE_TOOLS` is `!soon && !beta`, so the rail
// and the headline cannot drift again. Ship the UI Component Builder and both
// move together.
//
// The panel below a row still LISTS its beta tool, badge and all — hiding a
// shipped tool to make a count tidy would be the founder's number-one
// constraint broken for an arithmetic problem. The rail counts the claim; the
// panel shows the shelf.
const COUNTED_ROUTES = new Set(LIVE_TOOLS.map((t) => t.route))
const railCount = (panel) => panel.tools.filter((t) => COUNTED_ROUTES.has(t.route)).length

// ═════════════════════════════════════════════════════════════════════════════
// THE BENCH — "Say goodbye to bookmark folders."
// ═════════════════════════════════════════════════════════════════════════════
//
// The design's centrepiece: a sticky numbered rail on the left, and to its right
// a column of full-height windows, one per tool, each a mock of the real thing
// with the real thing's CTA at the bottom. Scroll drives which rail row is lit;
// pressing a rail row scrolls to its panel.
//
// ── WHAT CHANGED FROM THE MOCK, AND WHY ─────────────────────────────────────
//
// 1. ONE PANEL PER CATEGORY, NOT PER TOOL. The mock has four windows for four
//    named tools out of thirteen, which leaves nine tools with no seat and makes
//    the choice of four look arbitrary — it is arbitrary, it is a prototype. The
//    categories are the product's own top level (they are what the nav
//    mega-menu, the sitemap and the footer are all built on), there are five of
//    them with something live, and every live tool appears in exactly one. So
//    the rail becomes a complete index rather than a sample.
//
// 2. THE PANELS SHOW REAL ARTEFACTS AND REAL ARITHMETIC. The mock fakes a
//    converter with a bundled photograph and a hard-coded table of KB-per-
//    quality measurements. Nothing here fakes a computation: the colour panel
//    measures its own contrast with `contrastRatio`, the type panel computes a
//    real modular scale, the imagery panel does the real ratio arithmetic, and
//    the palettes come out of CURATED_LIBRARY_PALETTES — the same array the
//    Discover gallery renders. `principle-ai-slop-diagnostic`'s first dimension
//    is product specificity: "does this expose real product work, inputs and
//    states?" A screenshot of a tool does not; the tool's own maths does.
//
// 3. NO PHOSPHOR. Category glyphs are `NavIcon`, keyed by the same group id the
//    nav uses. Utility glyphs are SpectrumIcon. No CDN, no icon font.
//
// ── CITATION ────────────────────────────────────────────────────────────────
// The rail's shape — numbered rows, exactly one lit, the rest quiet, with the
// step's own short label and no progress bar — is Sequence's onboarding rail:
// https://mobbin.com/sites/sections/27bf1023-ba04-4af0-ae50-5fad11815613
// It is the version of this pattern that does not pretend the reader is making
// linear progress through a funnel, which matters here because the bench is an
// index a reader can enter at any row, not a sequence.

/* ── shared chrome ────────────────────────────────────────────────────────── */

function PanelChrome({ no, label, glyph, children, action }) {
  return (
    <div className="sp-panel-chrome">
      <div className="sp-panel-bar">
        <span className="sp-panel-lights" aria-hidden="true"><i /><i /><i /></span>
        <span className="sp-panel-rule" aria-hidden="true" />
        <span className="sp-panel-no">{no}</span>
        <span className="sp-panel-glyph" aria-hidden="true"><NavIcon id={glyph} /></span>
        <span className="sp-panel-name">{label}</span>
        {action}
      </div>
      {children}
    </div>
  )
}

// A copy button whose label is its own live region. The design's panels each
// carry one; the app's shared `useClipboard` needs a toast host, and these
// panels render on a chromeless route that has none — so the confirmation is
// inline, which is also where the reader is looking.
function CopyButton({ value, label = 'Copy', copiedLabel = 'Copied' }) {
  const [copied, setCopied] = useState(false)
  const timer = useRef(0)
  useEffect(() => () => clearTimeout(timer.current), [])
  const onClick = useCallback(() => {
    // Optional chaining, not a capability check that assumes success: clipboard
    // access is permission-gated and throws on an insecure origin. The label
    // still confirms, because the visitor pressed the button and the failure is
    // not theirs — and nothing downstream depends on the write.
    navigator.clipboard?.writeText(value).catch(() => {})
    setCopied(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), 1200)
  }, [value])
  return (
    <button type="button" className="sp-chip sp-chip--copy" onClick={onClick}>
      <span aria-live="polite">{copied ? copiedLabel : label}</span>
      <SpectrumIcon name="copy" size={13} />
    </button>
  )
}

/* ── 01 · Colour ──────────────────────────────────────────────────────────── */

// Six seeds, from the gallery the Discover page renders. Picked by id so a
// rename cannot silently swap one, and a missing id throws at module load —
// which fails `npm run build`, because prerender renders this page.
const SEED_IDS = ['midnight-teal', 'terracotta-dusk', 'forest-floor', 'electric-grape', 'desert-clay', 'ocean-deep']
const SEEDS = SEED_IDS
  .map((id) => CURATED_LIBRARY_PALETTES.find((p) => p.id === id))
  .filter(Boolean)
// Not a throw: the curated library is editable content and losing one row should
// cost one swatch, not the front door. Below four the panel has no story, so it
// falls back to the first six the library carries.
const SEED_SET = SEEDS.length >= 4 ? SEEDS : CURATED_LIBRARY_PALETTES.slice(0, 6)

const FORMATS = ['HEX', 'OKLCH', 'CSS VAR']

function formatValue(hex, format, slug, index) {
  if (format === 'OKLCH') {
    const [L, C, H] = hexToOklch(hex)
    return `oklch(${(L / 100).toFixed(2)} ${C.toFixed(3)} ${H})`
  }
  if (format === 'CSS VAR') return `--${slug}-${(index + 1) * 100}`
  return hex
}

function ColourFigure() {
  const [seed, setSeed] = useState(0)
  const [format, setFormat] = useState(0)
  const palette = SEED_SET[seed]
  const slug = palette.name.toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '')
  const fmt = FORMATS[format]

  // THE CONTRAST IS MEASURED, NOT ASSERTED. `contrastRatio` is the same function
  // /create/contrast runs, so the AA badge on this swatch and the verdict in the
  // real tool cannot disagree. The mock printed "AA" from a lookup table.
  const rows = palette.colors.map((hex, i) => {
    const ink = textColorForBg(hex)
    const ratio = contrastRatio(hex, ink)
    return {
      hex,
      ink,
      value: formatValue(hex, fmt, slug, i),
      pass: ratio >= 4.5,
      ratio: ratio.toFixed(2),
    }
  })
  const cssBlock = rows.map((r, i) => `  --${slug}-${(i + 1) * 100}: ${r.hex};`).join('\n')

  return (
    <div className="sp-fig sp-fig--colour">
      <div className="sp-fig-head">
        <div className="sp-seedset" role="group" aria-label="Choose a starting palette">
          {SEED_SET.map((p, i) => (
            <button
              key={p.id}
              type="button"
              className="sp-seed"
              aria-pressed={seed === i}
              aria-label={p.name}
              title={p.name}
              onClick={() => setSeed(i)}
              style={{ '--sp-seed': p.colors[Math.min(2, p.colors.length - 1)] }}
            >
              <span className="sp-seed-tick" aria-hidden="true"><SpectrumIcon name="check" size={11} strokeWidth={2.4} /></span>
            </button>
          ))}
        </div>
        <span className="sp-fig-meta">
          <span className="sp-fig-meta-name">{palette.name}</span>
          <span className="sp-fig-meta-sub">{palette.colors.length} colours</span>
        </span>
      </div>

      <ul className="sp-roles">
        {rows.map((r) => (
          <li key={r.hex}>
            <span className="sp-role" style={{ background: r.hex, color: r.ink }}>
              <span className="sp-role-val">{r.value}</span>
              <span className={r.pass ? 'sp-role-aa is-pass' : 'sp-role-aa'}>
                {r.pass ? 'AA' : 'LOW'} {r.ratio}
              </span>
            </span>
          </li>
        ))}
      </ul>

      <div className="sp-fig-foot">
        <span className="sp-fig-label">COPY AS</span>
        <div className="sp-tabs" role="group" aria-label="Copy format">
          {FORMATS.map((f, i) => (
            <button key={f} type="button" className="sp-tab" aria-pressed={format === i} onClick={() => setFormat(i)}>{f}</button>
          ))}
        </div>
        <CopyButton value={fmt === 'CSS VAR' ? `:root {\n${cssBlock}\n}` : rows.map((r) => r.value).join('\n')} label="Copy set" />
      </div>
    </div>
  )
}

/* ── 02 · Icons & emoji ───────────────────────────────────────────────────── */

// Drawn from NavIcon's own set, so every glyph in this grid is one the product
// already ships and none of them is a stand-in. The real library's catalogue
// size is stated on the card in the Discover section, where it is counted.
const GRID_GLYPHS = [
  'palette', 'gradient', 'contrast', 'tint', 'semantic', 'ui-colour', 'colour', 'auto', 'brand',
  'type', 'font-pair', 'typography', 'icons', 'emoji', 'imagery', 'ratio', 'component', 'box-shadow',
  'ai', 'alt-text', 'themes', 'principles', 'curated', 'collections', 'inspiration', 'seo', 'marketing',
]

function IconFigure() {
  const [picked, setPicked] = useState('palette')
  return (
    <div className="sp-fig sp-fig--icons">
      <div className="sp-glyphgrid" role="group" aria-label="Preview a glyph">
        {GRID_GLYPHS.map((id) => (
          <button
            key={id}
            type="button"
            className="sp-glyph"
            aria-pressed={picked === id}
            aria-label={id.replace(/-/g, ' ')}
            title={id.replace(/-/g, ' ')}
            onClick={() => setPicked(id)}
          >
            <NavIcon id={id} />
          </button>
        ))}
      </div>
      <div className="sp-glyph-detail">
        <span className="sp-glyph-large" aria-hidden="true"><NavIcon id={picked} /></span>
        <span className="sp-glyph-meta">
          <span className="sp-glyph-name">{picked.replace(/-/g, ' ')}</span>
          <span className="sp-glyph-note">Stroke inherits the colour it sits on, at any size.</span>
        </span>
        <CopyButton value={`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><!-- ${picked} --></svg>`} label="Copy SVG" />
      </div>
    </div>
  )
}

/* ── 03 · Type ────────────────────────────────────────────────────────────── */

// A REAL modular scale, computed here the way /create/type-scale computes it:
// base × ratio^n, rounded the same way. The mock rendered six Google Fonts
// families from a CDN stylesheet; this renders the type system the page is
// already set in, which needs no request and is the specimen a reader is
// looking at anyway.
const RATIOS = [
  { label: 'Minor third', value: 1.2 },
  { label: 'Major third', value: 1.25 },
  { label: 'Perfect fourth', value: 1.333 },
]
const STEP_NAMES = ['Caption', 'Body', 'Lead', 'Heading', 'Display']

function TypeFigure() {
  const [ratioIdx, setRatioIdx] = useState(1)
  const ratio = RATIOS[ratioIdx]
  const base = 16
  const steps = STEP_NAMES.map((name, i) => ({
    name,
    px: Math.round(base * Math.pow(ratio.value, i - 1) * 100) / 100,
  }))
  return (
    <div className="sp-fig sp-fig--type">
      <div className="sp-fig-head">
        <div className="sp-tabs" role="group" aria-label="Scale ratio">
          {RATIOS.map((r, i) => (
            <button key={r.label} type="button" className="sp-tab" aria-pressed={ratioIdx === i} onClick={() => setRatioIdx(i)}>
              {r.label}
            </button>
          ))}
        </div>
        <span className="sp-fig-meta"><span className="sp-fig-meta-sub">Base 16px · ratio {ratio.value}</span></span>
      </div>
      <ul className="sp-scale">
        {steps.map((s) => (
          <li key={s.name}>
            <span className="sp-scale-name">{s.name}</span>
            <span className="sp-scale-specimen" style={{ fontSize: `clamp(12px, ${s.px / 16}rem, ${s.px}px)` }}>
              A fresh perspective
            </span>
            <span className="sp-scale-px">{s.px}px</span>
          </li>
        ))}
      </ul>
      <div className="sp-fig-foot">
        <span className="sp-fig-label">SET IN</span>
        <span className="sp-fig-note">Geist and Geist Mono, self-hosted — no third-party font request on any page.</span>
      </div>
    </div>
  )
}

/* ── 04 · Imagery ─────────────────────────────────────────────────────────── */

// The real arithmetic /create/aspect-ratio does. No photograph, no measured-KB
// table: both of those were fixtures in the mock, and a fixture presented as a
// measurement is the claim this page is least able to defend.
const RATIO_PRESETS = [
  { label: '16:9', w: 1920, h: 1080 },
  { label: '4:5', w: 1080, h: 1350 },
  { label: '1:1', w: 1080, h: 1080 },
  { label: '21:9', w: 2560, h: 1097 },
]

function RatioFigure() {
  const [idx, setIdx] = useState(0)
  const preset = RATIO_PRESETS[idx]
  const half = { w: Math.round(preset.w / 2), h: Math.round(preset.h / 2) }
  const third = { w: Math.round(preset.w / 3), h: Math.round(preset.h / 3) }
  return (
    <div className="sp-fig sp-fig--ratio">
      <div className="sp-ratio-stage">
        <span
          className="sp-ratio-box"
          aria-hidden="true"
          style={{ aspectRatio: `${preset.w} / ${preset.h}` }}
        />
        <span className="sp-ratio-dims">{preset.w} × {preset.h}</span>
      </div>
      <div className="sp-tabs" role="group" aria-label="Aspect ratio">
        {RATIO_PRESETS.map((p, i) => (
          <button key={p.label} type="button" className="sp-tab" aria-pressed={idx === i} onClick={() => setIdx(i)}>{p.label}</button>
        ))}
      </div>
      <dl className="sp-ratio-rows">
        <div><dt>At 0.5×</dt><dd>{half.w} × {half.h}</dd></div>
        <div><dt>At 0.333×</dt><dd>{third.w} × {third.h}</dd></div>
        <div><dt>Where it runs</dt><dd>In your browser — nothing is uploaded</dd></div>
      </dl>
    </div>
  )
}

/* ── 05 · AI ──────────────────────────────────────────────────────────────── */

// The allowance, stated where the tool is introduced rather than only on the
// pricing page — api/_lib/plans.js is the boundary and src/config/plans.js is
// the mirror this reads. A meter is the honest illustration for a metered tool.
// FOUR BARS, NOT TWO: daily and monthly are different ceilings and a reader
// choosing a plan is looking at whichever one they will meet first. Each bar is
// drawn to scale against the largest allowance on that axis, so the Free bars
// are short because the Free allowance IS short — a meter that normalised each
// row to its own width would draw two full bars and say nothing.
const QUOTA_ROWS = [
  { plan: 'Free', axis: 'a day', value: AI_LIMITS.free.daily, max: AI_LIMITS.pro.daily },
  { plan: 'Free', axis: 'a month', value: AI_LIMITS.free.monthly, max: AI_LIMITS.pro.monthly },
  { plan: 'Pro', axis: 'a day', value: AI_LIMITS.pro.daily, max: AI_LIMITS.pro.daily, pro: true },
  { plan: 'Pro', axis: 'a month', value: AI_LIMITS.pro.monthly, max: AI_LIMITS.pro.monthly, pro: true },
]

function AiFigure() {
  return (
    <div className="sp-fig sp-fig--ai">
      <ul className="sp-quota">
        {QUOTA_ROWS.map((row) => (
          <li key={`${row.plan}-${row.axis}`}>
            <span className="sp-quota-name">{row.plan} · {row.axis}</span>
            <span className="sp-quota-track">
              <span
                className={row.pro ? 'sp-quota-fill is-pro' : 'sp-quota-fill'}
                style={{ width: `${Math.max(3, Math.round((row.value / row.max) * 100))}%` }}
              />
            </span>
            <span className="sp-quota-val">{row.value} generations</span>
          </li>
        ))}
      </ul>
      <p className="sp-fig-note">
        Capacity is metered across the whole site rather than per person, so the honest
        per-user allowance is small. Everything else in the toolkit is unmetered.
      </p>
      <p className="sp-fig-note sp-fig-note--quiet">
        {COLOUR_SYSTEMS.length} colour systems, and the prompt leaves the machine as text — never your assets.
      </p>
    </div>
  )
}

const FIGURES = {
  colour: ColourFigure,
  icons: IconFigure,
  type: TypeFigure,
  imagery: RatioFigure,
  ai: AiFigure,
}

/* ── the bench ────────────────────────────────────────────────────────────── */

export default function SpectrumBench({ head }) {
  const [active, setActive] = useState(0)
  const panelRefs = useRef([])

  // WHICH PANEL IS THE READER LOOKING AT.
  //
  // An IntersectionObserver rather than a scroll handler doing getBoundingClientRect
  // on five elements per frame, which is what the design source does inside its
  // rAF `tick()`. One observer, `rootMargin` tightened to the middle band of the
  // viewport so the lit row changes when a panel is actually centred rather than
  // when its top edge grazes the fold.
  //
  // This is PRESENTATION ONLY — it lights a row. Every panel is fully rendered
  // and fully readable whether or not this ever fires, so a runtime without
  // IntersectionObserver loses a highlight, not content.
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return undefined
    const nodes = panelRefs.current.filter(Boolean)
    if (!nodes.length) return undefined
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((e) => e.isIntersecting)
        if (!hit.length) return
        const best = hit.reduce((a, b) => (a.intersectionRatio >= b.intersectionRatio ? a : b))
        const index = nodes.indexOf(best.target)
        if (index > -1) setActive(index)
      },
      { rootMargin: '-40% 0px -40% 0px', threshold: [0, 0.01, 0.5, 1] },
    )
    nodes.forEach((n) => io.observe(n))
    return () => io.disconnect()
  }, [])

  // ── PRESSING A RAIL ROW HAS TO ACTUALLY MOVE THE PAGE ────────────────────
  //
  // It did not. This was written as `node.scrollIntoView({ block: 'center' })`
  // and measured in a rendered browser: scrollY 0 before the click, scrollY 0
  // 1.6 seconds after it, with the row correctly lit and the page exactly where
  // it started. A rail whose rows light up and go nowhere is worse than no rail.
  //
  // Lenis owns the scroll on this route and re-asserts its virtual position
  // every frame, so a NATIVE scroll — `window.scrollTo`, `scrollIntoView`, an
  // anchor jump — is undone before the next paint. App.jsx's route-change effect
  // records the same thing about `window.scrollTo` and reaches for `getLenis()`
  // for exactly this reason; `scrollIntoView` is the same call wearing a
  // different name.
  //
  // So: ask Lenis when Lenis is there, and fall back to the native call when it
  // is not — which is the reduced-motion case, where `useSmoothScroll` never
  // instantiates it and the browser is doing the scrolling itself.
  const jump = (i) => {
    const node = panelRefs.current[i]
    if (!node) return
    const lenis = getLenis()
    if (!lenis) {
      node.scrollIntoView({ block: 'center', behavior: 'smooth' })
      return
    }
    // Lenis has no `block:'center'`. `offset` is added to the target's top, so a
    // NEGATIVE half of the leftover viewport centres the panel — and it degrades
    // correctly when the panel is taller than the viewport, where the offset goes
    // positive and the top of the panel is what lands on screen.
    const height = node.getBoundingClientRect().height
    const offset = -Math.max(0, (window.innerHeight - height) / 2)
    lenis.scrollTo(node, { offset })
  }

  return (
    <div className="sp-bench-grid">
      {/* THE RAIL IS A LIST OF LINKS TO CONTENT THAT IS ALREADY ON THE PAGE, so
          it is a <nav> of buttons, not a tablist. A tablist would promise that
          exactly one panel is showing and the others are hidden, which is the
          opposite of what this is: all five are rendered, stacked, and reachable
          by scrolling past the rail entirely. */}
      {/* THE HEAD IS INSIDE THE STICKY COLUMN, not above the grid.
          That is the design's composition and it is the reason the column is
          sticky at all: the claim ("say goodbye to bookmark folders") stays on
          screen while the evidence for it scrolls past. Rendered above the grid
          instead — which is where this was first built — the heading is read
          once, leaves, and five windows then arrive with nothing framing them.
          The caller owns the words; this owns where they sit. */}
      <div className="sp-rail-col">
        {head}
        <nav className="sp-rail" aria-label="Jump to a tool group">
          <ol>
            {BENCH.map((panel, i) => (
              <li key={panel.id}>
                <button
                  type="button"
                  className={active === i ? 'sp-rail-row is-on' : 'sp-rail-row'}
                  onClick={() => jump(i)}
                  aria-current={active === i ? 'true' : undefined}
                >
                  <span className="sp-rail-no">{panel.no}</span>
                  <span className="sp-rail-label">{panel.label}</span>
                  <span className="sp-rail-count">{railCount(panel)}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>
      </div>

      <div className="sp-panels">
        {BENCH.map((panel, i) => {
          const Figure = FIGURES[panel.id]
          return (
            <div
              className="sp-step"
              key={panel.id}
              ref={(el) => { panelRefs.current[i] = el }}
            >
              <article className="sp-panel" data-sp-reveal>
                <PanelChrome
                  no={panel.no}
                  label={panel.label}
                  glyph={panel.glyph}
                  action={panel.id === 'colour' ? <span className="sp-panel-hint">Live — change a value</span> : null}
                >
                  <div className="sp-panel-body">
                    {Figure ? <Figure /> : null}
                  </div>
                  <div className="sp-panel-foot">
                    <Link className="sp-cta sp-cta--ink" to={panel.to}>
                      <span>Open {panel.label}</span>
                      <span className="sp-cta-icon" aria-hidden="true"><SpectrumIcon name="arrow-up-right" size={12} /></span>
                    </Link>
                    <ul className="sp-panel-tools">
                      {panel.tools.map((tool) => (
                        <li key={tool.id}>
                          <Link className="sp-ghost" to={tool.route}>
                            {tool.label}
                            {tool.beta && <span className="sp-beta">Beta</span>}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </PanelChrome>
              </article>
            </div>
          )
        })}
      </div>
    </div>
  )
}
