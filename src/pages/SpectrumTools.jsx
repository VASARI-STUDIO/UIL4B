import { useState } from 'react'
import { Link } from 'react-router-dom'
import PillNav from '../components/PillNav'
import SpectrumRamp from '../components/spectrum/SpectrumRamp'
import SpectrumWords from '../components/spectrum/SpectrumWords'
import SpectrumFooter from '../components/spectrum/SpectrumFooter'
import OpenPill from '../components/spectrum/OpenPill'
import PhGlyph from '../components/spectrum/PhGlyph'
import PhIcon from '../components/spectrum/PhIcon'
import { PH_ARROW_UP_RIGHT } from '../components/spectrum/phosphorNav'
import { prefersReducedMotion } from '../components/spectrum/reducedMotion'
import { BASES, FONTS, FONT_SAMPLE, rampOf, ratio } from '../components/spectrum/spectrumKit'
import { TOOL_COUNT, numberWord, route } from '../components/spectrum/spectrumFacts'
import { createTools, NAV_SECTIONS } from '../data/toolTree'
import { CREATE_TOOL_SEARCH } from '../data/toolIndex'
import { gradientCss } from '../data/gradientGallery'
import { LIBRARY_GRADIENT_ROWS } from '../data/gradientLibrary'
import { MODEL_PREVIEW } from '../components/spectrum/spectrumKit'
import '../styles/pages/spectrum-mobile.css'
import '../styles/pages/spectrum-tools.css'

// /tools: every listed tool, with a way to try it. Built like /mobile (the
// Spectrum nav and footer above the app shell).
//
// THE SIX CARDS are the colour, type, icons and images path, in the order a kit
// is built. The first four are live: they run the same maths the homepage ships
// (rampOf, ratio, FONTS, the modular scale). Icon Library and File Converter
// are shown by name and description until their captures are committed.
// THE LIST is derived: every listed, live tool that is not a card, grouped by the
// nav's own labels. Counts are never typed.

const CARD_IDS = ['palette', 'contrast', 'font-gallery', 'type-scale', 'icons', 'file-converter']
const LIVE = createTools().filter((t) => !t.soon)
const BY_ID = new Map(LIVE.map((t) => [t.id, t]))
const describe = (id) => CREATE_TOOL_SEARCH[id]?.description || ''

// The nav's Create columns, flattened to { label, tools } with the card tools and
// anything unbuilt taken out.
const GROUPS = NAV_SECTIONS.find((s) => s.id === 'create').columns
  .flat()
  .map((g) => ({ label: g.label, tools: g.tools.filter((t) => !t.soon && !CARD_IDS.includes(t.id)) }))
  .filter((g) => g.tools.length)
const WORKSHOP = createTools().filter((t) => t.soon).map((t) => t.label)
const joinNames = (names) => (names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`)

const RATIOS = [1.2, 1.25, 1.333]
const SCALE_STEPS = [3, 2, 1, 0, -1].map((n) => n)

function PaletteDemo() {
  const [seed, setSeed] = useState(0)
  const ramp = rampOf(BASES[seed])
  return (
    <div className="spt-demo">
      <div className="spt-seeds" role="group" aria-label="Seed colour">
        {BASES.map((b, i) => (
          <button key={b.label} type="button" className="spt-seed" style={{ background: b.color }} aria-label={`${b.label} seed`} aria-pressed={seed === i} onClick={() => setSeed(i)} />
        ))}
      </div>
      <ol className="spt-ramp" aria-label={`${BASES[seed].label} ramp`}>
        {ramp.map((r) => (
          <li key={r.step} style={{ background: r.hex, color: r.ink }}><span>{r.hex}</span></li>
        ))}
      </ol>
    </div>
  )
}

const verdictOf = (cr) => (cr >= 7 ? 'AAA' : cr >= 4.5 ? 'AA' : 'Fails')

function ContrastDemo() {
  const ramp = rampOf(BASES[0])
  const [a, setA] = useState(1)
  const [b, setB] = useState(7)
  const cr = Math.round(ratio(ramp[a].hex, ramp[b].hex) * 10) / 10
  const verdict = verdictOf(cr)
  return (
    <div className="spt-demo">
      <div className="spt-pair">
        <button type="button" className="spt-swatch" style={{ background: ramp[a].hex }} aria-label={`Colour one, step ${ramp[a].step}`} onClick={() => setA((a + 1) % ramp.length)} />
        <button type="button" className="spt-swatch" style={{ background: ramp[b].hex }} aria-label={`Colour two, step ${ramp[b].step}`} onClick={() => setB((b + 1) % ramp.length)} />
      </div>
      <p className="spt-result" data-pass={verdict === 'Fails' ? 'no' : 'yes'} aria-live="polite">
        <b>{cr.toFixed(1)}</b> <span>{verdict === 'Fails' ? 'Fails' : verdict}</span>
      </p>
    </div>
  )
}

function FontDemo() {
  const [text, setText] = useState('Make it readable')
  return (
    <div className="spt-demo">
      <label className="spt-field">
        <span className="sr-only">Sample text</span>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder={FONT_SAMPLE.slice(0, 24)} aria-label="Sample text" autoComplete="off" spellCheck="false" />
      </label>
      <ul className="spt-fonts">
        {FONTS.slice(0, 4).map((f) => (
          <li key={f.name}><span className="spt-font-name">{f.name}</span><span style={{ fontFamily: f.family }}>{text || FONT_SAMPLE.slice(0, 24)}</span></li>
        ))}
      </ul>
    </div>
  )
}

function ScaleDemo() {
  const [r, setR] = useState(1)
  return (
    <div className="spt-demo">
      <div className="spt-seg" role="group" aria-label="Scale ratio">
        {RATIOS.map((v, i) => (
          <button key={v} type="button" aria-pressed={r === i} aria-label={`Ratio ${v}`} onClick={() => setR(i)}>{v}</button>
        ))}
      </div>
      <ul className="spt-scale">
        {SCALE_STEPS.map((n) => {
          const rem = RATIOS[r] ** n
          return (
            <li key={n}>
              <span style={{ fontSize: `${Math.min(rem, 2.6) * 16}px` }}>Ag Heading</span>
              <span className="spt-num">{rem.toFixed(3)}rem, {Math.round(rem * 16)}px</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

const DEMOS = { palette: PaletteDemo, contrast: ContrastDemo, 'font-gallery': FontDemo, 'type-scale': ScaleDemo }

function Card({ id }) {
  const tool = BY_ID.get(id)
  const Demo = DEMOS[id]
  return (
    <article className="spt-card" data-tool={id}>
      {Demo ? <div className="spt-preview"><Demo /></div> : null}
      <h3>{tool.label}</h3>
      <p>{describe(id)}</p>
      <OpenPill to={route(id)}>{`Open ${tool.label}`}</OpenPill>
    </article>
  )
}

function Row({ tool }) {
  const grad = tool.id === 'gradient' ? LIBRARY_GRADIENT_ROWS.find((g) => g.stops) : null
  const model = tool.id === '3d-converter'
  return (
    <li>
      <Link className="spt-row" to={route(tool.id)}>
        <span className="spt-thumb" aria-hidden="true" style={grad ? { background: gradientCss(grad.type, grad.angle, grad.stops) } : undefined}>
          {model ? <img src={MODEL_PREVIEW.poster} alt="" width={MODEL_PREVIEW.width} height={MODEL_PREVIEW.height} loading="lazy" decoding="async" /> : null}
        </span>
        <span className="spt-row-text">
          <b>{tool.label}{tool.beta ? ' Beta' : ''}</b>
          <span>{describe(tool.id)}</span>
        </span>
        <span className="spt-row-go" aria-hidden="true"><PhIcon name="arrow-up-right" /></span>
      </Link>
    </li>
  )
}

export default function SpectrumTools() {
  const [heroLit] = useState(() => typeof document !== 'undefined'
    && !document.documentElement.hasAttribute('data-hero-prepainted')
    && !prefersReducedMotion())
  return (
    <div className="spectrum spm spt">
      <PillNav variant="spectrum" />
      <div className="sp-grain" aria-hidden="true" />
      <div className="spm-spacer" aria-hidden="true" />
      <main id="main" tabIndex={-1}>
        <section className="spm-intro" aria-labelledby="spt-h1">
          <div className={heroLit ? 'spm-hero is-in' : 'spm-hero'}>
            <div className="spm-hero-copy">
              <h1 className="spm-h1" id="spt-h1">
                <SpectrumWords text={`${numberWord(TOOL_COUNT, { capital: true })} tools, one tab.`} />
              </h1>
              <p className="spm-lede">
                Each one opens without an account. Start with the six most kits begin with, or jump to the one you came for.
              </p>
            </div>
            <div className="spm-hero-side">
              <Link className="spm-cta" to="/projects">
                <span>Open the toolkit</span>
                <span className="spm-cta-icon" aria-hidden="true"><PhGlyph d={PH_ARROW_UP_RIGHT} size={13} /></span>
              </Link>
            </div>
          </div>
        </section>

        <section className="spt-section" aria-labelledby="spt-start-h">
          <h2 className="spt-h2" id="spt-start-h">Where most kits start.</h2>
          <div className="spt-cards">
            {CARD_IDS.map((id) => <Card key={id} id={id} />)}
          </div>
        </section>

        <section className="spt-section" aria-labelledby="spt-rest-h">
          <h2 className="spt-h2" id="spt-rest-h">And the rest of the bench.</h2>
          {GROUPS.map((g) => (
            <div key={g.label} className="spt-group">
              <h3>{g.label}</h3>
              <ul className="spt-rows">{g.tools.map((t) => <Row key={t.id} tool={t} />)}</ul>
            </div>
          ))}
          {WORKSHOP.length > 0 && <p className="spt-workshop">In the workshop: {joinNames(WORKSHOP)}.</p>}
        </section>

        <section className="sp-close" aria-labelledby="spt-close-h">
          <h2 id="spt-close-h"><SpectrumWords text="Start your first project today." /></h2>
          <p>
            Free to use, no account needed. Sign up when you want to export files or save projects and
            come back to them.
          </p>
          <div className="sp-close-cta">
            <Link className="sp-pill sp-pill--close" to="/projects">
              <span>Use for free</span>
              <span className="sp-pill-icon" aria-hidden="true"><PhIcon name="arrow-up-right" /></span>
            </Link>
            <Link className="sp-ghost sp-ghost--close" to="/plans">See the plans</Link>
          </div>
        </section>

        <SpectrumRamp className="sp-ramp--close spm-ramp" />
      </main>
      <SpectrumFooter />
    </div>
  )
}
