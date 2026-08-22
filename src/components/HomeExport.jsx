import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { PALETTE_LABELS, buildCSSVars, buildStyleGuideHTML, buildTailwindTheme } from '../utils/exportBuilder'
import { DEFAULT_DESIGN } from '../contexts/ProjectContext'
import { GALLERY_PALETTES } from '../data/paletteGallery'

// ── The export section ───────────────────────────────────────────────────────
//
// The pitch is input-and-output in one frame: the system as a designer sees it
// on the left, the same system as a file on the right.
//
// Every character in the right-hand panel is produced by the functions that
// write the real downloads — buildCSSVars, buildTailwindTheme and
// buildStyleGuideHTML, all from utils/exportBuilder.js, the same three the
// Export menu calls. Nothing here is a hand-written sample. That is not a style
// preference: a typed-out sample is the one thing on this page that could be
// false, and it would go stale the first time the exporter changed.
//
// It is also why the section shows three formats and not a longer marketing
// list. These three are what the product actually writes today.

// A fixed sample system. The palette is a real entry from the shipped gallery;
// the fonts, type scale and rounding are DEFAULT_DESIGN — literally what a new
// project starts on. So the inputs are product data too, not invented.
const SAMPLE_PALETTE = GALLERY_PALETTES.find((p) => p.id === 'nordic-frost') || GALLERY_PALETTES[0]

const SAMPLE_DESIGN = {
  ...DEFAULT_DESIGN,
  palette: { ...DEFAULT_DESIGN.palette, colors: SAMPLE_PALETTE.colors, base: SAMPLE_PALETTE.colors[0] },
}

const SAMPLE_APPEARANCE = { rounding: 'default', density: 'cozy' }

const FORMATS = [
  {
    id: 'css',
    label: 'CSS custom properties',
    file: 'design.css',
    describe: 'CSS custom properties export',
    build: () => buildCSSVars({
      palette: SAMPLE_DESIGN.palette,
      fonts: SAMPLE_DESIGN.fonts,
      typeScale: SAMPLE_DESIGN.typeScale,
      appearance: SAMPLE_APPEARANCE,
    }),
  },
  {
    id: 'tailwind',
    label: 'Tailwind theme',
    file: 'tailwind.config.js',
    describe: 'Tailwind theme export',
    build: () => buildTailwindTheme({ palette: SAMPLE_DESIGN.palette, fonts: SAMPLE_DESIGN.fonts }),
  },
  {
    id: 'guide',
    label: 'Style guide',
    file: 'style-guide.html',
    describe: 'style guide export',
    build: () => buildStyleGuideHTML({
      design: SAMPLE_DESIGN,
      stateShades: null,
      projectName: 'Nordic Frost',
      appearance: SAMPLE_APPEARANCE,
    }),
  },
]

// The style guide is a whole HTML document — several hundred lines of it. The
// panel shows a bounded head of the file and says exactly how much it is
// showing, because silently truncating would misrepresent what downloads and
// rendering six hundred numbered lines would cost more than it is worth.
const MAX_LINES = 60

function tabKeyIndex(key, index, length) {
  if (key === 'Home') return 0
  if (key === 'End') return length - 1
  if (key === 'ArrowLeft') return (index - 1 + length) % length
  if (key === 'ArrowRight') return (index + 1) % length
  return -1
}

// The type ladder, computed with the SAME expression buildCSSVars writes into
// --font-size-N. Two implementations of one ladder would eventually disagree,
// and the panel beside it would be quoting numbers the file does not contain.
function ladderStep(step) {
  const { base, ratio } = SAMPLE_DESIGN.typeScale
  return (base * Math.pow(ratio, step)).toFixed(2)
}

const LADDER = [
  { step: 4, name: 'Display' },
  { step: 2, name: 'Heading' },
  { step: 0, name: 'Body' },
]

export default function HomeExport() {
  const [format, setFormat] = useState(FORMATS[0].id)
  const [copied, setCopied] = useState(null)
  const [status, setStatus] = useState('')
  const tabsRef = useRef(null)
  const timer = useRef(null)

  useEffect(() => () => clearTimeout(timer.current), [])

  const active = FORMATS.find((f) => f.id === format) || FORMATS[0]

  // Only the visible format is built. The style guide is the expensive one and
  // nobody pays for it until they ask for it.
  const output = useMemo(() => active.build(), [active])
  const lines = useMemo(() => output.split('\n'), [output])
  const shown = lines.length > MAX_LINES ? lines.slice(0, MAX_LINES) : lines

  const onTabKeyDown = useCallback((event, index) => {
    const next = tabKeyIndex(event.key, index, FORMATS.length)
    if (next < 0) return
    event.preventDefault()
    setFormat(FORMATS[next].id)
    tabsRef.current?.querySelectorAll('.hexp-tab')[next]?.focus()
  }, [])

  const copy = useCallback(async () => {
    let ok = false
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(output)
        ok = true
      }
    } catch {
      ok = false
    }
    setCopied(ok)
    setStatus(ok
      ? `Copied ${active.file} to the clipboard`
      : 'Your browser blocked the clipboard, so nothing was copied')
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(null), 1600)
  }, [active.file, output])

  return (
    <section className="hexp" aria-labelledby="hexp-title">
      <div className="home-container">
        <div className="hexp-head" data-reveal>
          <span className="hbrow">[ EXPORT ]</span>
          <h2 className="hh2" id="hexp-title">Everything you build here comes out as code.</h2>
          <p className="hlede">
            The panel on the right is the real exporter running on a sample system — the same
            functions that write your files. Nothing here is hand-written.
          </p>
        </div>

        <div className="hexp-pair" data-reveal>
          {/* Input: the system as the designer sees it. */}
          <div className="hexp-in">
            <p className="hexp-in-label">{SAMPLE_PALETTE.name}</p>
            <ul className="hexp-ramp">
              {SAMPLE_DESIGN.palette.colors.map((hex, i) => (
                <li className="hexp-token" key={hex}>
                  <span
                    className="hexp-chip"
                    aria-hidden="true"
                    ref={(node) => { if (node) node.style.setProperty('--hexp-chip', hex) }}
                  />
                  <span className="hexp-token-name">{PALETTE_LABELS[i] || `Colour ${i + 1}`}</span>
                  <span className="hexp-token-hex">{hex.toUpperCase()}</span>
                </li>
              ))}
            </ul>
            <ul className="hexp-ladder">
              {LADDER.map((row) => (
                <li className="hexp-ladder-row" key={row.step}>
                  <span className="hexp-ladder-name">{row.name}</span>
                  <span className="hexp-ladder-size">{ladderStep(row.step)}px</span>
                </li>
              ))}
            </ul>
            <p className="hexp-in-foot">
              {SAMPLE_DESIGN.fonts.heading.family} · base {SAMPLE_DESIGN.typeScale.base}px ·
              ratio {SAMPLE_DESIGN.typeScale.ratio}
            </p>
          </div>

          {/* Output: the same system as a file. The chrome's mono label is the
              real filename the download carries, which is itself a signal that
              this is a file and not a marketing snippet. */}
          <div className="hexp-out">
            <div className="hexp-chrome">
              <span className="hexp-dots" aria-hidden="true"><i /><i /><i /></span>
              <span className="hexp-file">{active.file}</span>
              <button type="button" className="hexp-copy" onClick={copy}>
                {copied === null ? 'Copy' : copied ? 'Copied' : 'Failed'}
              </button>
            </div>
            {/* One panel, three tabs — so it keeps ONE stable id that every tab
                points at. Giving each tab an aria-controls for a panel that is
                not in the DOM would leave two dangling IDREFs.

                Named with aria-label rather than aria-labelledby: "Style guide"
                (the tab's own text) is thinner than "style-guide.html — style
                guide export", and the panel is the thing a screen reader lands
                on. It is also the scroll container, hence tabIndex. */}
            <div
              className="hexp-panel"
              id="hexp-panel"
              role="tabpanel"
              aria-label={`${active.file} — ${active.describe}`}
              tabIndex={0}
            >
              {/* Line numbers are drawn by a CSS counter, never as text, so a
                  copy from selection carries the code and not the gutter. */}
              <pre className="hexp-code" key={active.id}>
                {shown.map((line, i) => (
                  <span className="hexp-line" key={i}>{line || ' '}</span>
                ))}
              </pre>
            </div>
            {lines.length > MAX_LINES && (
              <p className="hexp-trunc">
                First {MAX_LINES} of {lines.length} lines. The download is the whole file.
              </p>
            )}
          </div>
        </div>

        <div className="hexp-tabs" role="tablist" aria-label="Export format" ref={tabsRef}>
          {FORMATS.map((tab, index) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`hexp-tab-${tab.id}`}
              className="hexp-tab"
              aria-selected={tab.id === format}
              aria-controls="hexp-panel"
              tabIndex={tab.id === format ? 0 : -1}
              onClick={() => setFormat(tab.id)}
              onKeyDown={(event) => onTabKeyDown(event, index)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="hexp-foot">
          <Link className="hexp-exit" to="/color">
            Open the Colour System Generator
            <span aria-hidden="true">&rarr;</span>
          </Link>
          {/* Founder decision, 2026-08-20: free gets every format. The credit,
              not the format list, is what Pro removes — ExportPanel and TopBar
              both pass `watermark: !isPro` to the style guide builder, and the
              token formats carry no credit at all. */}
          <p className="hexp-plan">
            Every format is free to export. Free style-guide exports carry a small UIL4B credit
            in the footer; Pro removes it.
          </p>
        </div>

        <p className="sr-only" role="status">{status}</p>
      </div>
    </section>
  )
}
