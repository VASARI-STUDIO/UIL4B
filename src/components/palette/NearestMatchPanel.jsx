// "Nearest named colours" panel for one Palette Builder swatch (the third kind of
// the per-column panel, beside Tints and Colour values). It shows the closest
// entry of each colour system with its name, code and closeness.
//
// Pro: the five colour-system chunks load on first open and each row fills in as
// its chunk arrives. Free and signed out: a locked preview built from the index
// only (real system names, the person's own colour, blurred placeholders); no
// chunk is requested and nothing in the DOM is a real match.
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { LockGlyph, LockedTeaseCta } from '../library/LockedTease'
import { NEAREST_SYSTEMS } from '../../data/nearest/index.js'
import { loadSystem } from '../../utils/nearestSystems'
import { BANDS, bandLabel, formatDE, matchSystem } from '../../utils/nearestMatch'
import ToolIcon from '../tool/ToolIcon'

const GROUPS = [
  { id: 'screen', title: 'Screen colours', note: '' },
  { id: 'physical', title: 'Physical colour systems', note: 'Approximate. Check a physical swatch.' },
]
// Second line of a row: the system, then its code when it has one.
const SYSTEM_LINE = { tailwind: 'Tailwind v4', munsell: 'Munsell 1943 renotation', material: 'Material 2014' }

function useSystems(enabled) {
  const [state, setState] = useState({})
  const start = useCallback((id) => {
    loadSystem(id).then(
      (data) => setState((s) => ({ ...s, [id]: { status: 'ready', data } })),
      () => setState((s) => ({ ...s, [id]: { status: 'error' } })),
    )
  }, [])
  useEffect(() => {
    if (enabled) NEAREST_SYSTEMS.forEach((s) => start(s.id))
  }, [enabled, start])
  const retry = useCallback((ids) => {
    setState((s) => ({ ...s, ...Object.fromEntries(ids.map((id) => [id, { status: 'loading' }])) }))
    ids.forEach(start)
  }, [start])
  return [state, retry]
}

// A code prints in <code>; a "No. 182" prints its "No." as text and only the
// number in <code>, so the monospace does not add a second gap after the dot.
function codeNode(code) {
  const m = /^(No\.)\s+(.+)$/.exec(code)
  return m ? <>{m[1]} <code>{m[2]}</code></> : <code>{code}</code>
}

function Seam({ left, right }) {
  return (
    <span className="plb-match-seam" aria-hidden="true">
      <span style={{ background: left }} />
      {right ? <span style={{ background: right }} /> : <span className="plb-match-seam-empty" />}
    </span>
  )
}

export default function NearestMatchPanel({ hex, isPro, planKnown, onCopy, onClose, closeIcon, copyIcon }) {
  // The colour the shown matches were computed for. It trails the live hex while a
  // drag is in flight, so a row's seam, name and difference always agree.
  const shown = useDeferredValue(String(hex || '').toUpperCase())
  const [state, retry] = useSystems(isPro && planKnown)
  const upper = String(hex || '').toUpperCase()
  const unlocked = planKnown && isPro
  const locked = planKnown && !isPro

  const matches = useMemo(() => {
    const out = {}
    NEAREST_SYSTEMS.forEach((s) => {
      const st = state[s.id]
      out[s.id] = st && st.status === 'ready' ? matchSystem(shown, st.data) : null
    })
    return out
  }, [state, shown])

  const failed = NEAREST_SYSTEMS.filter((s) => state[s.id]?.status === 'error')
  const allFailed = unlocked && failed.length === NEAREST_SYSTEMS.length
  const names = NEAREST_SYSTEMS.map((s) => s.label.replace(/ v4$/, ''))
  const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0]

  const renderRow = (s) => {
    const st = state[s.id]
    const m = matches[s.id]
    const line2 = SYSTEM_LINE[s.id] || s.label
    if (locked) {
      return (
        <li key={s.id} className="plb-match-row plb-match-row--locked">
          <span className="plb-match-seam" aria-hidden="true">
            <span style={{ background: upper }} />
            <span className="lockt-rowcell plb-match-blur" data-step={NEAREST_SYSTEMS.indexOf(s) % 4} />
          </span>
          <span className="plb-match-main">
            <span className="lockt-line plb-match-bar" data-step="1" aria-hidden="true" />
            <span className="plb-match-meta">{s.label}</span>
          </span>
          <span className="plb-match-near"><span className="lockt-line plb-match-bar plb-match-bar--short" data-step="2" aria-hidden="true" /></span>
          <span />
        </li>
      )
    }
    if (st?.status === 'error') {
      return (
        <li key={s.id} className="plb-match-row plb-match-row--failed">
          <Seam left={upper} />
          <span className="plb-match-main">
            <span className="plb-match-fail">Couldn’t load {s.label}.</span>
          </span>
          <button type="button" className="plb-match-retry" onClick={() => retry([s.id])}>Try again</button>
          <span />
        </li>
      )
    }
    if (!m) {
      return (
        <li key={s.id} className="plb-match-row plb-match-row--loading">
          <Seam left={upper} />
          <span className="plb-match-main plb-match-wait">
            <span className="plb-match-skel" aria-hidden="true" />
            <span className="plb-match-meta">{line2}</span>
            <span className="plb-match-sr">Loading {s.label}</span>
          </span>
          <span className="plb-match-near"><span className="plb-match-skel plb-match-skel--short" aria-hidden="true" /></span>
          <span />
        </li>
      )
    }
    const word = bandLabel(m.band)
    const de = formatDE(m.dE)
    const label = `${s.label}: ${m.name}, ${word.toLowerCase()}, difference ${de}. Copy ${m.copy}`
    return (
      <li key={s.id} className="plb-match-row">
        <button type="button" className={`plb-match-btn${m.band === 'not-close' ? ' is-far' : ''}`} aria-label={label} onClick={() => onCopy?.(m.copy)}>
          <Seam left={shown} right={m.hex} />
          <span className="plb-match-main">
            <span className="plb-match-name">{m.name}</span>
            <span className="plb-match-meta">{line2}{m.code && s.id !== 'tailwind' ? <> · {codeNode(m.code)}</> : null}</span>
          </span>
          <span className="plb-match-near">
            <span className="plb-match-word">{word}</span>
            <span className="plb-match-de" title={`Colour difference ${de} (CIEDE2000)`}>ΔE {de}</span>
          </span>
          <span className="plb-match-copy" aria-hidden="true">{copyIcon}</span>
        </button>
      </li>
    )
  }

  return (
    <div className="plb-pop plb-tintpop plb-matchpop" role="dialog" aria-label={`Nearest named colours for ${upper}`}>
      <div className="plb-pop-head">
        <span className="plb-pop-title">
          Nearest named colours
          {locked ? <span className="lockt-tag plb-match-protag"><LockGlyph /> Pro</span> : null}
        </span>
        <button type="button" className="plb-pop-x" aria-label="Close nearest named colours" onClick={onClose}>{closeIcon}</button>
      </div>
      <div className="plb-match-scroll">
        <p className="plb-match-legend">Yours on the left, the match on the right.</p>
        {/* One live region, always mounted so a screen reader hears the text when it
            arrives: the full-width message and its retry when every system failed,
            else a spoken-only line naming the rows that did. */}
        <div role="status" className={allFailed ? 'plb-match-allfail' : 'plb-match-sr'}>
          {allFailed ? (
            <>
              <p>Couldn’t load the colour systems. Check your connection.</p>
              <button type="button" className="btn btn-s" onClick={() => retry(NEAREST_SYSTEMS.map((s) => s.id))}>Try again</button>
            </>
          ) : failed.map((s) => `Couldn’t load ${s.label}`).join('. ')}
        </div>
        {allFailed ? null : GROUPS.map((g) => {
          const rows = NEAREST_SYSTEMS.filter((s) => s.group === g.id)
          if (!rows.length) return null
          return (
            <section key={g.id} className="plb-match-group">
              <h3 id={`plb-match-h-${g.id}`} className="plb-match-h">
                {g.title}
                {g.note ? <>{' '}<span className="plb-match-h-note">{g.note}</span></> : null}
              </h3>
              <ul className={`plb-match-list${locked ? ' plb-match-list--locked' : ''}`} aria-labelledby={`plb-match-h-${g.id}`}>
                {rows.map(renderRow)}
              </ul>
            </section>
          )
        })}
        <details className="plb-match-how">
          <summary>
            How this works
            <span className="plb-match-caret" aria-hidden="true"><ToolIcon name="caret-down" size={14} /></span>
          </summary>
          <p>Closeness is the CIEDE2000 colour difference between your colour and the match. Under {BANDS[1].min} is very close, {BANDS[1].min} to {BANDS[2].min} close, {BANDS[2].min} to {BANDS[3].min} near, and {BANDS[3].min} or more not close.</p>
          <p>Physical systems are measured colours shown on a screen. Your screen and the light you’re in change how they look, so check a physical swatch before you buy or specify.</p>
          <p>Munsell runs only from N1 to N9, so black and white match the nearest dark and light samples.</p>
          <ul>{NEAREST_SYSTEMS.map((s) => <li key={s.id}>{s.credit}</li>)}</ul>
        </details>
        {/* After "How this works" in the page order, so Tab reaches the upgrade link last. */}
        {locked ? (
          <LockedTeaseCta
            gate="palette-nearest-match"
            heading={`Name this colour in ${NEAREST_SYSTEMS.length} colour systems`}
            body={`Pro shows the nearest ${list} colour for every swatch, and how close each one is.`}
            action="Upgrade to Pro"
          />
        ) : null}
      </div>
    </div>
  )
}
