import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getLenis } from '../../hooks/useSmoothScroll'
import useMediaQuery from '../../hooks/useMediaQuery'
import PhIcon from './PhIcon'
import OpenPill from './OpenPill'
import BenchConverter from './BenchConverter'
import { PH_REGULAR } from './phosphorRegular'
import { prefersReducedMotion } from './reducedMotion'
import { route } from './spectrumFacts'
import {
  BASES,
  FONTS,
  FONT_CATS,
  FONT_SAMPLE,
  FORMATS,
  HARMONIES,
  ICONS,
  ICON_FORMATS,
  ICON_SIZES,
  ICON_WEIGHTS,
  iconSnippet,
  rampOf,
  ratio,
  rolesOf,
} from './spectrumKit'

// ═════════════════════════════════════════════════════════════════════════════
// THE BENCH — "Say goodbye to bookmark folders."
// ═════════════════════════════════════════════════════════════════════════════
//
// The design's four tool windows: Palette Builder, Icon Library,
// Font Gallery and File Converter, each a fixed 700px window in its own
// step with a little air above and below, beside a sticky numbered rail. Every
// control the design draws is here and works: seeds, harmonies, roles you can copy, Copy as; icon
// search, five weights, four sizes, three formats and a Copy SVG that copies a
// real icon; font search, categories, your own preview words and a size slider
// over six self-hosted families; and a converter that measures real encodes.
//
// Scroll does two things, both the design's: the rail lights the window nearest
// the middle of the screen, and each window scales by 1 − t × 0.022 and fades by
// 1 − t × 0.34 with its distance t from that middle (`stepDepth`). Reduced
// motion keeps the lit row and drops the depth.
//
// AT 1000px AND BELOW the bench is a tool switcher, not a column of windows. The
// rail becomes a four-segment tablist, the windows share one grid cell and only
// the selected one is visible (the rest are `inert`, so they leave the tab order
// and the accessibility tree but stay mounted: the seed and family picked in
// Palette and Fonts still drive the exports cards below). The cell is as tall as
// the tallest window, so switching never moves the page. Nothing there follows
// the scroll and nothing is written to a window's `style`, so the text in the
// window is always at full ink.
//
// Destinations come off the tool tree through `route()`, so a renamed tool
// fails the build rather than shipping a dead link.

const RAIL = ['Palette Builder', 'Icon Library', 'Font Gallery', 'File Converter']
// The switcher's labels: each window's title bar still carries the full name.
const TABS = ['Palette', 'Icons', 'Fonts', 'Converter']
// The width at and below which the bench is the switcher. spectrum.css switches
// layout at the same 1000px, so the markup and the styling change together.
const SWITCHER = '(max-width: 1000px)'
// At and below this the Font Gallery starts at a smaller preview size.
const PHONE = '(max-width: 760px)'

function copyText(value) {
  // Clipboard access is permission-gated and throws on an insecure origin. The
  // label still confirms: the visitor pressed the button and nothing depends on
  // the write.
  navigator.clipboard?.writeText(value).catch(() => {})
}

/** A label that says "Copied" for a beat, then goes back. */
function useFlash(ms) {
  const [on, setOn] = useState(null)
  const timer = useRef(0)
  useEffect(() => () => clearTimeout(timer.current), [])
  const flash = useCallback((key) => {
    setOn(key)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setOn(null), ms)
  }, [ms])
  return [on, flash]
}

function Chrome({ name, action, children }) {
  return (
    <div className="sp-panel-in">
      <div className="sp-panel-bar">
        <div className="sp-panel-title">
          <span className="sp-panel-name">{name}</span>
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}


/* ── 01 · Palette builder ─────────────────────────────────────────────────── */

function PalettePanel({ base, onBase }) {
  const [harmony, setHarmony] = useState(0)
  const [fmt, setFmt] = useState(0)
  const [copied, flash] = useFlash(1100)
  const seed = BASES[base]
  const ramp = rampOf(seed)
  const roles = rolesOf(seed, harmony, fmt)
  const surface = ramp[8].hex
  const primary = ramp[4].hex
  const prevInk = ratio('#EFEEEA', surface) >= ratio('#0B0C0E', surface) ? '#EFEEEA' : '#0B0C0E'
  const prevBtnFg = ratio('#EFEEEA', primary) >= ratio('#0B0C0E', primary) ? '#EFEEEA' : '#0B0C0E'

  const shuffle = () => {
    onBase((b) => (b + 1 + Math.floor(Math.random() * (BASES.length - 1))) % BASES.length)
    setHarmony(Math.floor(Math.random() * HARMONIES.length))
  }

  return (
    <Chrome
      name="Palette Builder"
      action={(
        <button type="button" className="sp-shuffle" onClick={shuffle} aria-label="Shuffle the seed" title="Shuffle the seed">
          <PhIcon name="shuffle" /><span>Shuffle</span>
        </button>
      )}
    >
      <div className="sp-panel-body sp-panel-body--pad">
        <div className="sp-pal-strip">
          <div className="sp-pal-seedwrap">
            <span className="sp-seeds" role="group" aria-label="Seed colour">
              {BASES.map((b, i) => {
                const on = base === i
                return (
                  <button
                    key={b.label}
                    type="button"
                    className="sp-seed"
                    aria-label={`Seed ${b.label}`}
                    aria-pressed={on}
                    title={b.label}
                    onClick={() => onBase(i)}
                    style={{
                      background: b.color,
                      boxShadow: on ? '0 0 0 2px var(--sp-page),0 0 0 3.5px var(--sp-ink)' : 'inset 0 0 0 1px rgba(var(--sp-ink-rgb),.14)',
                      color: ratio(b.color, '#EFEEEA') >= ratio(b.color, '#0B0C0E') ? '#EFEEEA' : '#0B0C0E',
                    }}
                  >
                    <PhIcon name="check-bold" style={{ opacity: on ? 1 : 0 }} />
                  </button>
                )
              })}
            </span>
            <span className="sp-seed-name">
              <b>{seed.label}</b>
              <small>{seed.color}</small>
            </span>
          </div>
          <div className="sp-pal-seedwrap">
            <span className="sp-seg" role="group" aria-label="Harmony">
              {HARMONIES.map(([label], i) => (
                <button key={label} type="button" aria-pressed={harmony === i} onClick={() => setHarmony(i)}>{label}</button>
              ))}
            </span>
          </div>
        </div>

        <div className="sp-roles">
          {roles.map((r) => (
            <button
              key={r.name}
              type="button"
              className="sp-role"
              title={r.use}
              onClick={() => { copyText(r.value); flash(r.hex) }}
              style={{ gridColumn: r.span, background: r.hex, color: r.ink }}
            >
              <span className="sp-role-name">{r.name}</span>
              <span className="sp-role-row">
                <span className="sp-role-val" aria-live="polite">{copied === r.hex ? 'Copied' : r.value}</span>
                <span className="sp-role-aa">{r.aa}</span>
              </span>
            </button>
          ))}
        </div>

        <div className="sp-prev" style={{ background: surface }}>
          <span className="sp-prev-say" style={{ color: prevInk }}>
            <small>Surface and ink</small>
            <b>3 items in your bag</b>
          </span>
          <span className="sp-prev-btn" style={{ background: primary, color: prevBtnFg }}>Pay now</span>
        </div>

        <div className="sp-copyas">
          <span className="sp-label">Copy as</span>
          <div role="group" aria-label="Copy format">
            {FORMATS.map((f, i) => (
              <button key={f} type="button" className="sp-utab" aria-pressed={fmt === i} onClick={() => setFmt(i)}>{f}</button>
            ))}
          </div>
        </div>

        <div className="sp-panel-foot">
          <span>
            <OpenPill to={route('palette')}>Open Palette Builder</OpenPill>
            <Link className="sp-ghost" to={route('gradient')}>Gradient Generator</Link>
          </span>
        </div>
      </div>
    </Chrome>
  )
}

/* ── 02 · Icon library ────────────────────────────────────────────────────── */

function IconPanel() {
  const [query, setQuery] = useState('')
  const [icon, setIcon] = useState('palette')
  const [weight, setWeight] = useState(2)
  const [size, setSize] = useState(24)
  const [fmt, setFmt] = useState(0)
  const [copied, flash] = useFlash(1100)
  // Regular ships with the page; the other four weights are a separate chunk,
  // fetched the first time a visitor asks for one.
  const [weights, setWeights] = useState(null)
  const wantWeight = (i) => {
    setWeight(i)
    if (i !== 2 && !weights) import('./phosphorWeights').then((m) => setWeights(m.PH_WEIGHTS)).catch(() => {})
  }
  const wName = ICON_WEIGHTS[weight][1]
  const bodyOf = (slug) => (weight === 2 || !weights ? PH_REGULAR[slug] : weights[wName][slug])
  const shownWeight = weight === 2 || weights ? wName : 'regular'

  const q = query.trim().toLowerCase()
  const shown = (q ? ICONS.filter(([slug, name]) => `${slug} ${name}`.toLowerCase().includes(q)) : ICONS).slice(0, 24)
  const pick = ICONS.find(([slug]) => slug === icon) || ICONS[0]
  const gridSize = `${Math.min(26, Math.round(size * 0.92))}px`

  const copy = () => {
    copyText(iconSnippet({ slug: pick[0], weight: shownWeight, size, fmt, body: bodyOf(pick[0]) }))
    flash('icon')
  }

  return (
    <Chrome name="Icon Library">
      <div className="sp-panel-body">
        <div className="sp-ico-strip">
          <label className="sp-find">
            <PhIcon name="magnifying-glass" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the set"
              autoComplete="off"
              spellCheck="false"
              name="icon-search"
              aria-label="Search icons"
            />
          </label>
          <div className="sp-tabs-row" role="group" aria-label="Weight">
            {ICON_WEIGHTS.map(([label], i) => (
              <button key={label} type="button" className="sp-utab" aria-pressed={weight === i} onClick={() => wantWeight(i)}>{label}</button>
            ))}
          </div>
        </div>

        <div className="sp-icogrid">
          {shown.map(([slug, name]) => (
            <button
              key={slug}
              type="button"
              className="sp-ico"
              title={name}
              aria-label={name}
              aria-pressed={icon === slug}
              onClick={() => setIcon(slug)}
            >
              <PhIcon body={bodyOf(slug)} style={{ fontSize: gridSize }} />
            </button>
          ))}
        </div>

        <div className="sp-ico-detail">
          <span className="sp-ico-big"><PhIcon body={bodyOf(pick[0])} /></span>
          <span className="sp-ico-meta">
            <b>{`${pick[1]}, ${ICON_WEIGHTS[weight][0].toLowerCase()}, ${size}px`}</b>
            <span className="sp-ico-opts">
              {ICON_SIZES.map((px) => (
                <button key={px} type="button" className="sp-utab" aria-pressed={size === px} onClick={() => setSize(px)}>{px}px</button>
              ))}
              <span className="sp-panel-rule" aria-hidden="true" />
              {ICON_FORMATS.map((f, i) => (
                <button key={f} type="button" className="sp-utab" aria-pressed={fmt === i} onClick={() => setFmt(i)}>{f}</button>
              ))}
            </span>
          </span>
        </div>

        <div className="sp-ico-foot">
          <i aria-hidden="true" />
          <button type="button" className="sp-ghost sp-copybtn" onClick={copy}>
            <span aria-live="polite">{copied ? 'Copied' : 'Copy SVG'}</span>
            <span className="sp-pill-icon" aria-hidden="true"><PhIcon name="copy" /></span>
          </button>
          <OpenPill to={route('icons')}>Open Icon Library</OpenPill>
        </div>
      </div>
    </Chrome>
  )
}

/* ── 03 · Font Gallery ────────────────────────────────────────────────────── */

function FontPanel({ font, onFont }) {
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState(0)
  // 32px on a phone, where a 46px family name is wider than its column.
  const [size, setSize] = useState(() => (typeof window !== 'undefined' && window.matchMedia?.(PHONE).matches ? 32 : 46))
  const [preview, setPreview] = useState('')
  const q = query.trim().toLowerCase()
  const rows = FONTS
    .map((f, i) => ({ f, i }))
    .filter(({ f }) => (cat === 0 || f.cat === FONT_CATS[cat].toUpperCase()) && (!q || f.name.toLowerCase().includes(q)))
  const spec = FONTS[font]

  return (
    <Chrome name="Font Gallery">
      <div className="sp-panel-body">
        <div className="sp-font-strip">
          <label className="sp-find">
            <PhIcon name="magnifying-glass" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search families"
              autoComplete="off"
              spellCheck="false"
              name="font-search"
              aria-label="Search families"
            />
          </label>
          <div className="sp-font-cats" role="group" aria-label="Category">
            {FONT_CATS.map((label, i) => (
              <button key={label} type="button" className="sp-utab" aria-pressed={cat === i} onClick={() => setCat(i)}>{label}</button>
            ))}
          </div>
        </div>

        <div className="sp-font-ctl">
          <label>
            <span className="sp-label">Preview</span>
            <input
              type="text"
              value={preview}
              onChange={(e) => setPreview(e.target.value)}
              placeholder="Type your own words"
              autoComplete="off"
              spellCheck="false"
              name="font-preview"
              aria-label="Preview text"
            />
          </label>
          <label>
            <span className="sp-label">Size</span>
            <input type="range" min="24" max="72" step="2" value={size} onChange={(e) => setSize(parseInt(e.target.value, 10))} aria-label="Preview size" />
            <output>{size}px</output>
          </label>
        </div>

        <div className="sp-fontlist">
          {rows.map(({ f, i }) => (
            <button key={f.name} type="button" className="sp-fontrow" aria-pressed={font === i} onClick={() => onFont(i)}>
              <span className="sp-fontrow-top">
                <span className="sp-fontrow-main">
                  <span className="sp-fontrow-name" style={{ fontFamily: f.family, fontSize: `${size}px` }}>{f.name}</span>
                  <span className="sp-fontrow-sample" style={{ fontFamily: f.family }}>{preview.trim() ? preview : FONT_SAMPLE}</span>
                  <span className="sp-fontrow-w" style={{ fontFamily: f.family }}>
                    <span>Regular</span>
                    <span>Semibold</span>
                  </span>
                </span>
                <span className="sp-fontrow-add" aria-hidden="true"><PhIcon name={font === i ? 'check' : 'plus'} /></span>
              </span>
              <span className="sp-fontrow-meta">
                <span>{`${f.cat.charAt(0)}${f.cat.slice(1).toLowerCase()}, ${f.styles}`}</span>
                <span>{f.axes}</span>
              </span>
            </button>
          ))}
        </div>

        <div className="sp-font-foot">
          <span className="sp-font-pair">
            <small>Pairs with</small>
            <b style={{ fontFamily: spec.pairFamily }}>{spec.pair}</b>
          </span>
          <span>
            <OpenPill to={route('font-gallery')}>Open Font Gallery</OpenPill>
            <Link className="sp-ghost" to={route('font-pair')}>Font Pair</Link>
          </span>
        </div>
      </div>
    </Chrome>
  )
}

/* ── the bench ────────────────────────────────────────────────────────────── */

export default function SpectrumBench({ head, base, onBase, font, onFont }) {
  const switcher = useMediaQuery(SWITCHER)
  const [step, setStep] = useState(0)
  const panels = useRef([])
  const tabs = useRef([])

  // ONE rAF-throttled scroll pass, as the design's tick(): light the rail row
  // for the panel nearest the middle, and write each panel's depth. Off while
  // the bench is the switcher: the selected tab is the user's, and a window
  // never gets an inline transform or opacity.
  useEffect(() => {
    if (switcher) {
      panels.current.forEach((el) => { if (el) { el.style.transform = ''; el.style.opacity = '' } })
      return undefined
    }
    let raf = 0
    const run = () => {
      raf = 0
      const vh = window.innerHeight || 0
      const reduce = prefersReducedMotion()
      let best = -1
      let bestDist = Infinity
      panels.current.forEach((el, i) => {
        if (!el) return
        const r = el.getBoundingClientRect()
        const mid = r.top + r.height / 2
        const dist = Math.abs(mid - vh / 2)
        if (dist < bestDist) { bestDist = dist; best = i }
        if (reduce) { el.style.transform = ''; el.style.opacity = ''; return }
        const t = Math.max(0, Math.min(1, dist / vh))
        el.style.transform = `scale(${(1 - t * 0.022).toFixed(4)})`
        el.style.opacity = (1 - t * 0.34).toFixed(3)
      })
      if (best > -1) setStep(best)
    }
    const request = () => { if (!raf) raf = requestAnimationFrame(run) }
    run()
    window.addEventListener('scroll', request, { passive: true })
    window.addEventListener('resize', request, { passive: true })
    return () => {
      window.removeEventListener('scroll', request)
      window.removeEventListener('resize', request)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [switcher])

  // The tablist's keys (APG): arrows wrap, Home and End jump, and the tab
  // that takes focus is the one selected.
  const onTabKey = (e) => {
    const last = RAIL.length - 1
    const next = { ArrowRight: step === last ? 0 : step + 1, ArrowLeft: step === 0 ? last : step - 1, Home: 0, End: last }[e.key]
    if (next === undefined) return
    e.preventDefault()
    setStep(next)
    tabs.current[next]?.focus()
  }

  // The design scrolls the panel's top to 110px under the viewport top. Lenis
  // owns the scroll on this route and would undo a native scrollTo, so ask it
  // when it is there; the native call covers reduced motion, where it is not.
  const jump = (i) => {
    const el = panels.current[i]
    if (!el) return
    const y = el.getBoundingClientRect().top + window.scrollY - 110
    const lenis = getLenis()
    if (lenis) lenis.scrollTo(y)
    else window.scrollTo({ top: y, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
  }

  const setRef = (i) => (el) => { panels.current[i] = el }

  // The four windows, in one place for both layouts. As the switcher each step
  // is a tabpanel and the unselected ones are inert.
  const windows = [
    <PalettePanel key="p" base={base} onBase={onBase} />,
    <IconPanel key="i" />,
    <FontPanel key="f" font={font} onFont={onFont} />,
    <Chrome key="c" name="File Converter"><BenchConverter /></Chrome>,
  ]

  return (
    <div className="sp-bench-grid">
      <div className="sp-bench-col">
        {head}
        {switcher ? (
          <div className="sp-rail sp-rail--tabs" role="tablist" aria-label="Tools" onKeyDown={onTabKey}>
            {TABS.map((label, i) => (
              <button
                key={label}
                type="button"
                role="tab"
                id={`sp-tab-${i}`}
                ref={(el) => { tabs.current[i] = el }}
                className={step === i ? 'sp-rail-row is-on' : 'sp-rail-row'}
                aria-selected={step === i}
                aria-controls={`sp-tabpanel-${i}`}
                tabIndex={step === i ? 0 : -1}
                onClick={() => setStep(i)}
              >
                <span className="sp-rail-label">{label}</span>
              </button>
            ))}
          </div>
        ) : (
          <ol className="sp-rail" aria-label="Jump to a tool">
            {RAIL.map((label, i) => (
              <li key={label}>
                <button
                  type="button"
                  className={step === i ? 'sp-rail-row is-on' : 'sp-rail-row'}
                  aria-current={step === i ? 'true' : undefined}
                  onClick={() => jump(i)}
                >
                  <span className="sp-rail-no">{`0${i + 1}`}</span>
                  <span className="sp-rail-label">{label}</span>
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="sp-steps">
        {windows.map((win, i) => (
          <div
            key={RAIL[i]}
            className="sp-step"
            {...(switcher ? {
              role: 'tabpanel',
              id: `sp-tabpanel-${i}`,
              'aria-labelledby': `sp-tab-${i}`,
              'data-on': step === i ? 'true' : 'false',
              inert: step !== i,
            } : {})}
          >
            <article className="sp-panel" data-panel={i} ref={setRef(i)}>{win}</article>
          </div>
        ))}
      </div>
    </div>
  )
}
