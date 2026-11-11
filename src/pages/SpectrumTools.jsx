import { useState } from 'react'
import { Link } from 'react-router-dom'
import PillNav from '../components/PillNav'
import SpectrumFooter from '../components/spectrum/SpectrumFooter'
import HomeFinalCall from '../components/home/HomeFinalCall'
import { InkPill, OutPill } from '../components/marketing/MkPill'
import ToolArt from '../components/spectrum/ToolArt'
import NavIcon from '../components/NavIcon'
import { BASES, CONTRAST_START, FONTS, FONT_SAMPLE, SCALE_BASE_PX, SCALE_RATIOS, SCALE_RATIO_START, rampOf, ratio, verdictOf } from '../components/spectrum/spectrumKit'
import { TOOL_COUNT, numberWord, route } from '../components/spectrum/spectrumFacts'
import { createTools, NAV_SECTIONS } from '../data/toolTree'
import { CREATE_TOOL_SEARCH } from '../data/toolIndex'
import { TOOL_VOTES_ON } from '../data/toolVotes'
import WhatsNext from '../components/spectrum/WhatsNext'
import '../styles/pages/home-tokens.css'
import '../styles/pages/spectrum-tools.css'

// /tools: every listed tool, with a way to try it. The Spectrum nav and footer
// around a page built on the V3 tokens (v3-marketing.css).
//
// THE SIX CARDS are the colour, type, icons and images path, in the order a kit
// is built. The first four are live: they run the same maths the homepage ships
// (rampOf, ratio, FONTS, the modular scale). Icon Library and File Converter
// are drawn plates (ToolArt), built from the tools' own helpers and one measured run.
// THE LIST is derived: every listed, live tool that is not a card or in beta,
// grouped by the nav's own labels. Counts are never typed. A row's thumbnail is
// the tool's drawn plate (ToolArt).
// Beta tools are not in the count the heading gives, so they get a line of their
// own under the list, not a row.

const CARD_IDS = ['palette', 'contrast', 'type-scale', 'font-gallery', 'icons', 'file-converter']
const LIVE = createTools().filter((t) => !t.soon)
const BY_ID = new Map(LIVE.map((t) => [t.id, t]))
const describe = (id) => CREATE_TOOL_SEARCH[id]?.description || ''

// The nav's Create columns, flattened to { label, tools } with the card tools and
// anything unbuilt taken out.
const GROUPS = NAV_SECTIONS.find((s) => s.id === 'create').columns
  .flat()
  .map((g) => ({ label: g.label, tools: g.tools.filter((t) => !t.soon && !t.beta && !CARD_IDS.includes(t.id)) }))
  .filter((g) => g.tools.length)
const BETA = LIVE.filter((t) => t.beta)
const WORKSHOP = createTools().filter((t) => t.soon).map((t) => t.label)
const joinNames = (names) => (names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`)

const SCALE_STEPS = [2, 1, 0, -1]
const SEED_START = BASES.findIndex((b) => b.label === 'Signal')
const HERO_STEPS = [1, 3, 4, 5, 7]

function Seeds({ seed, onPick }) {
  return (
    <div className="mk-seeds" role="group" aria-label="Seed colour">
      {BASES.map((b, i) => (
        <button key={b.label} type="button" className="mk-seed" style={{ background: b.color }} aria-label={`${b.label} seed`} aria-pressed={seed === i} onClick={() => onPick(i)} />
      ))}
    </div>
  )
}

function HeroPalette({ seed, onPick }) {
  const ramp = rampOf(BASES[seed])
  return (
    <div className="mk-pal" role="group" aria-label="Palette preview">
      <Seeds seed={seed} onPick={onPick} />
      <ol className="mk-ramp" aria-label="Five-step ramp">
        {HERO_STEPS.map((s, i) => (
          <li key={s} style={{ background: ramp[s].hex, color: ramp[s].ink, '--i': i }}><span className="mk-mono">{ramp[s].hex}</span></li>
        ))}
      </ol>
    </div>
  )
}

function PaletteDemo({ seed, onPick }) {
  const ramp = rampOf(BASES[seed])
  return (
    <div className="mk-demo">
      <Seeds seed={seed} onPick={onPick} />
      <ol className="mk-ramp" aria-label={`${BASES[seed].label} ramp`}>
        {ramp.map((r, i) => (
          <li key={r.step} style={{ background: r.hex, color: r.ink, '--i': i }}><span className="mk-mono">{r.hex}</span></li>
        ))}
      </ol>
    </div>
  )
}

function ContrastDemo({ seed }) {
  const ramp = rampOf(BASES[seed])
  const [a, setA] = useState(CONTRAST_START[0])
  const [b, setB] = useState(CONTRAST_START[1])
  const cr = Math.round(ratio(ramp[a].hex, ramp[b].hex) * 10) / 10
  const verdict = verdictOf(cr)
  return (
    <div className="mk-demo">
      <div className="mk-pair">
        <button type="button" className="mk-swatch" style={{ background: ramp[a].hex }} aria-label={`Colour one, step ${ramp[a].step}`} onClick={() => setA((a + 1) % ramp.length)} />
        <button type="button" className="mk-swatch" style={{ background: ramp[b].hex }} aria-label={`Colour two, step ${ramp[b].step}`} onClick={() => setB((b + 1) % ramp.length)} />
      </div>
      <p className="mk-result" data-pass={verdict === 'Fails' ? 'no' : 'yes'} aria-live="polite">
        <b>{cr.toFixed(1)}</b> <span>{verdict}</span>
      </p>
    </div>
  )
}

function FontDemo() {
  const [text, setText] = useState('Make it readable')
  return (
    <div className="mk-demo">
      <label className="mk-field">
        <span className="sr-only">Sample text</span>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder={FONT_SAMPLE.slice(0, 24)} aria-label="Sample text" autoComplete="off" spellCheck="false" />
      </label>
      <ul className="mk-fonts">
        {FONTS.slice(0, 3).map((f) => (
          <li key={f.name}><span className="mk-body">{f.name}</span><span style={{ fontFamily: f.family }}>{text || FONT_SAMPLE.slice(0, 24)}</span></li>
        ))}
      </ul>
    </div>
  )
}

function ScaleDemo() {
  const [r, setR] = useState(SCALE_RATIO_START)
  return (
    <div className="mk-demo">
      <div className="mk-seg" role="group" aria-label="Scale ratio">
        {SCALE_RATIOS.map((v, i) => (
          <button key={v} type="button" aria-pressed={r === i} aria-label={`Ratio ${v}`} onClick={() => setR(i)}>{v}</button>
        ))}
      </div>
      <ul className="mk-scale">
        {SCALE_STEPS.map((n) => {
          const rem = SCALE_RATIOS[r] ** n
          return (
            <li key={n}>
              <span style={{ fontSize: `${Math.min(rem, 2.6) * SCALE_BASE_PX}px` }}>Ag Heading</span>
              <span className="mk-mono">{rem.toFixed(3)}rem, {Math.round(rem * SCALE_BASE_PX)}px</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

const CARD_CLASS = {
  palette: 'mk-lead-card',
  contrast: 'mk-card-a',
  'type-scale': 'mk-card-b',
  'font-gallery': 'mk-wide',
  icons: 'mk-card-ic',
  'file-converter': 'mk-card-fc',
}

// Palette and Font Gallery open on their words and hold the demo last; Contrast
// and Type Scale open on the demo; the two drawn plates open on the plate.
function Card({ id, seed, onPick }) {
  const tool = BY_ID.get(id)
  const art = id === 'icons' || id === 'file-converter'
  const demoFirst = id === 'contrast' || id === 'type-scale'
  const demo = id === 'palette' ? <PaletteDemo seed={seed} onPick={onPick} />
    : id === 'contrast' ? <ContrastDemo seed={seed} />
      : id === 'type-scale' ? <ScaleDemo />
        : id === 'font-gallery' ? <FontDemo /> : null
  return (
    <article className={`mk-card ${CARD_CLASS[id]}`} data-tool={id}>
      {art ? <div className="mk-art"><ToolArt id={id} size="card" /></div> : null}
      {demoFirst ? demo : null}
      <h3 className="mk-t22">{tool.label}</h3>
      <p className="mk-body">{describe(id)}</p>
      <OutPill to={route(id)}>{`Open ${tool.label}`}</OutPill>
      {!demoFirst ? demo : null}
    </article>
  )
}

function Row({ tool }) {
  return (
    <li>
      <Link className="mk-row" to={route(tool.id)}>
        <span className="mk-thumb"><ToolArt id={tool.id} size="thumb" /></span>
        <span className="mk-row-text">
          <b>{tool.label}</b>
          <span className="mk-body">{describe(tool.id)}</span>
        </span>
        <span className="mk-row-go" aria-hidden="true">
          <svg className="mk-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M7 17L17 7M8 7h9v9" /></svg>
        </span>
      </Link>
    </li>
  )
}

const CLOSE_ARROW = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M7 17L17 7M8 7h9v9" />
  </svg>
)

export default function SpectrumTools() {
  const [seed, setSeed] = useState(SEED_START)
  return (
    <div className="spectrum spt mkt">
      <PillNav variant="spectrum" />
      <div className="mk-spacer" aria-hidden="true" />
      <main id="main" tabIndex={-1}>
        <section className="mk-intro mk-wrap" aria-labelledby="mk-h1">
          <div className="mk-intro-copy">
            <h1 className="mk-h1" id="mk-h1">{`${numberWord(TOOL_COUNT, { capital: true })} tools, one tab.`}</h1>
            <p className="mk-lead">Each one opens without an account. Start with the six below, or jump to the one you came for.</p>
            <InkPill to="/projects">Open the toolkit</InkPill>
          </div>
          <HeroPalette seed={seed} onPick={setSeed} />
        </section>

        <section className="mk-sec mk-wrap" aria-labelledby="mk-start-h">
          <h2 className="mk-h2" id="mk-start-h">Start with these six.</h2>
          <div className="mk-cards">
            {CARD_IDS.map((id) => <Card key={id} id={id} seed={seed} onPick={setSeed} />)}
          </div>
        </section>

        <section className="mk-sec mk-sec--last mk-wrap" aria-labelledby="mk-rest-h">
          <h2 className="mk-h2" id="mk-rest-h">And the rest of the bench.</h2>
          {GROUPS.map((g) => (
            <div key={g.label} className="mk-group" data-hue={g.tools[0].hue}>
              <h3 className="mk-t22">
                <span className="mk-gtile" aria-hidden="true"><NavIcon id={g.tools[0].hue} /></span>
                {g.label}
              </h3>
              <ul className="mk-rows">{g.tools.map((t) => <Row key={t.id} tool={t} />)}</ul>
            </div>
          ))}
          {TOOL_VOTES_ON ? <WhatsNext /> : (
            <>
              {BETA.length > 0 && (
                <p className="mk-more spt-beta">
                  In beta:{' '}
                  {BETA.map((t, i) => (
                    <span key={t.id}>{i > 0 ? (i === BETA.length - 1 ? ' and ' : ', ') : ''}<Link to={route(t.id)}>{t.label}</Link></span>
                  ))}.
                </p>
              )}
              {WORKSHOP.length > 0 && <p className="mk-more">In the workshop: {joinNames(WORKSHOP)}.</p>}
            </>
          )}
        </section>

        <HomeFinalCall
          toolkitTo="/projects"
          actions={(
            <>
              <Link className="hm-close-ghost ui-pill-out" to="/plans">See the plans</Link>
              <Link className="hm-close-cta" to="/projects">
                <span>Use for free</span>
                <span className="mi-go hm-close-icon" aria-hidden="true">{CLOSE_ARROW}</span>
              </Link>
            </>
          )}
        />
      </main>
      <SpectrumFooter toolkitTo="/projects" home pageColumn={false} />
    </div>
  )
}
