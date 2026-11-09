import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { loadFont } from '../../utils/googleFonts'

// The kit sheet (design B): a name, one line about it, the next-step pill, and the four parts as plates
// with their own "Open in" link. `kit` comes from kit.js; the loading and failed sheets are below.

export function GoArrow({ size = 14, variant = 'ink' }) {
  const arrow = (cls) => (
    <svg className={cls} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 17L17 7M8 7h9v9" />
    </svg>
  )
  return <span className={`db-arrow db-arrow--${variant}`} aria-hidden="true">{arrow('db-arrow-a')}{arrow('db-arrow-b')}</span>
}

const stack = (family) => `'${family}', system-ui, sans-serif`

function PalettePlate({ part }) {
  const many = part.stops.length > 6
  return (
    <div className="db-plate pal" role="img" aria-label={`Palette: ${part.stops.map((s) => s.c).join(', ')}`}>
      {part.stops.map((s, i) => (
        <span key={`${s.c}-${i}`} className="db-stop" style={{ background: s.c, color: s.on }}>
          {!many && <span className="db-hex">{s.c}</span>}
        </span>
      ))}
    </div>
  )
}

function ScalePlate({ part, face }) {
  return (
    <div className="db-plate l2 sc" aria-hidden="true" style={face ? { fontFamily: stack(face.family), fontWeight: face.weight } : undefined}>
      <span className="db-sch">{part.label}</span>
      <span className="rows">
        {part.lines.map((l) => (
          <span key={l.px} className="row" style={{ fontSize: `${l.size}px`, lineHeight: `${l.lh}px` }}>
            <span>Aa</span><span className="px">{l.px}px</span>
          </span>
        ))}
      </span>
    </div>
  )
}

function FontPlate({ part }) {
  return (
    <div className="db-plate l2 fp" aria-hidden="true">
      <p className="db-fname" style={{ fontFamily: stack(part.heading.family), fontWeight: part.heading.weight }}>{part.heading.family}</p>
      <p className="db-fm">{part.hLabel}</p>
      <p className="db-fsample" style={{ fontFamily: stack(part.body.family), fontWeight: part.body.weight }}>{part.sample}</p>
      <p className="db-fm last">{part.bLabel}</p>
    </div>
  )
}

function Ramp({ stops, cls }) {
  return <span className={`db-ramp${cls ? ` ${cls}` : ''}`}>{stops.map((c, i) => <i key={`${c}-${i}`} style={{ background: c }} />)}</span>
}

// The one moment: the full-strength ramp unrolls over the dimmed preview on hover or focus of this part
// or of the head pill (see dashboard.css).
function TintsPlate({ part }) {
  const seed = part.seed
  return (
    <div className="db-plate l2 tn" aria-hidden="true">
      {!part.set && seed && (
        <>
          <span className="db-tstop" style={{ background: seed.c, color: seed.on }}><span className="db-hex">{seed.c}</span></span>
          <p className="db-tnote">Preview: {part.stops.length} steps from <span className="db-mono">{seed.c}</span>.</p>
        </>
      )}
      {!part.set && !seed && <p className="db-blank">{part.note}</p>}
      {!part.set && seed && part.stops.length > 0 && <Ramp stops={part.stops} cls="rest" />}
      {part.stops.length > 0 && <Ramp stops={part.stops} cls={part.set ? 'set' : ''} />}
    </div>
  )
}

function Part({ part, face }) {
  let plate
  if (part.id === 'palette') plate = part.set ? <PalettePlate part={part} /> : <div className="db-plate l2"><p className="db-blank">{part.note}</p></div>
  else if (part.id === 'type-scale') plate = part.set ? <ScalePlate part={part} face={face} /> : <div className="db-plate l2"><p className="db-blank">{part.note}</p></div>
  else if (part.id === 'fonts') plate = part.set ? <FontPlate part={part} /> : <div className="db-plate l2"><p className="db-blank">{part.note}</p></div>
  else plate = <TintsPlate part={part} />
  const meta = part.id === 'tints' ? (part.set ? `${part.count} steps` : 'Not set') : part.set ? part.meta : 'Not set'
  return (
    <div className={`db-part${part.id === 'tints' ? ' db-tn' : ''}`}>
      {plate}
      <p className="db-cap">
        {part.set
          ? <svg className="db-tick" aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7" /></svg>
          : <i className="db-circle" aria-hidden="true" />}
        <span className="n">{part.name}</span>
        <span className="m">{meta}{part.set && part.mono && <span className="db-mono">{part.mono}</span>}</span>
      </p>
      <Link className="db-open db-link" to={part.tool}>{part.linkLabel}<GoArrow size={12} variant="t" /></Link>
    </div>
  )
}

export default function KitSheet({ kit, openHref, onPill }) {
  // Fonts the plates draw in are real families; ask for them once, then the plates restyle themselves.
  const fontsPart = kit.parts.find((p) => p.id === 'fonts')
  const family = fontsPart?.set ? fontsPart.heading : null
  const body = fontsPart?.set ? fontsPart.body : null
  useEffect(() => {
    if (family) loadFont(family.family, [family.weight])
    if (body) loadFont(body.family, [body.weight])
  }, [family, body])

  const pill = kit.pill
  const pillBody = pill && (
    <>{pill.text}<GoArrow /></>
  )
  return (
    <section className="db-sheet" aria-label={kit.region}>
      <div className="db-head">
        <h2 className="db-name" style={kit.face ? { fontFamily: stack(kit.face.family), fontWeight: kit.face.weight, letterSpacing: '-.01em' } : undefined}>{kit.title}</h2>
        <div className="db-headr">
          {openHref && <Link className="db-ghost db-ring" to={openHref} aria-label={`Open project, ${kit.title}`}>Open project</Link>}
          {pill && (onPill
            ? <button type="button" className="db-go" onClick={onPill}>{pillBody}</button>
            : <Link className={`db-go${pill.cls ? ` ${pill.cls}` : ''}`} to={pill.href} aria-label={`${pill.text}, ${kit.title}`}>{pillBody}</Link>)}
        </div>
      </div>
      <p className="db-meta">{kit.meta}</p>
      <div className="db-kit">
        {kit.parts.map((p) => <Part key={p.id} part={p} face={p.id === 'type-scale' && family ? family : null} />)}
      </div>
    </section>
  )
}

export function LoadingSheet() {
  const bar = (w, h = 14, extra = {}) => <span className="db-sk" aria-hidden="true" style={{ width: w, height: h, borderRadius: 4, ...extra }} />
  const part = (a, b, i) => (
    <div key={i} className="db-part">
      <span className="db-sk" style={{ height: 280, borderRadius: 12 }} />
      {bar(a, 14, { marginTop: 17 })}{bar(b, 14, { marginTop: 18 })}
    </div>
  )
  return (
    <section className="db-sheet" aria-label="Loading your projects" aria-busy="true">
      <p className="db-sr" role="status">Loading your projects</p>
      <div className="db-head">{bar(240, 48, { borderRadius: 8 })}</div>
      <div className="db-meta" style={{ display: 'flex', alignItems: 'center' }}>{bar(280)}</div>
      <div className="db-kit" aria-hidden="true">
        {[[120, 160], [100, 120], [100, 130], [80, 100]].map(([a, b], i) => part(a, b, i))}
      </div>
    </section>
  )
}

export function FailedSheet({ onRetry }) {
  return (
    <section className="db-sheet failed" aria-label="Latest project">
      <div className="db-fail" role="alert">
        <h2>Your projects didn&apos;t load.</h2>
        <p>Your tools still work. Try again in a moment.</p>
        <button type="button" className="db-go" onClick={onRetry}>Try again<GoArrow /></button>
      </div>
    </section>
  )
}
