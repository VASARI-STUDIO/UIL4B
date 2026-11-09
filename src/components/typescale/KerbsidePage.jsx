import { createContext, useContext } from 'react'
import { pickSteps, screenCopy } from './kerbsideSteps'

// The page half of the Type Scale tool: one product screen set on the scale
// that is being built. Every line names the step it uses, and the step pressed
// in the ladder lights a kerb mark beside each line that uses it.
//
// Signed out it is the sample brand's tracking screen. Signed in it is the
// same layout with neutral working copy, in the project's own families.

const FIT_MIN = 8

const KERB_LINES = [
  { time: '10:52', label: 'Picked up', state: 'done' },
  { time: '11:20', label: 'On Brunswick Street', state: 'now' },
  { time: '11:40', label: 'Signed in', state: 'next' },
]
const OWN_DELIVERIES = [
  ['Carrots, bunch', 'Mon 08:30', '$4.50'],
  ['Leeks, bunch', 'Mon 08:30', '$3.80'],
  ['Silverbeet, bunch', 'Thu 08:30', '$3.20'],
]

const LitStep = createContext('')

// A step's size on the page: the size it resolves to at the previewed width,
// held between the floor and the most this line can take without overflowing.
const capPx = (step, max) => Math.min(max, Math.max(FIT_MIN, step.previewPx))

function lineStyle(step, max, heading) {
  return {
    fontSize: `${capPx(step, max)}px`,
    lineHeight: step.lead,
    letterSpacing: `${step.track}em`,
    fontWeight: heading ? 'var(--tsc-heading-fw)' : 'var(--tsc-body-fw)',
    margin: 0,
  }
}

// One tagged line: the text, its step name in the right margin and the kerb mark.
function Line({ step, children, className = '', style }) {
  const on = useContext(LitStep) === step.name
  return (
    <div className={`tsk-ln${on ? ' is-lit' : ''}${className ? ` ${className}` : ''}`} style={style}>
      {children}
      <span className="tsk-tag">{step.name}</span>
      <span className="tsk-kb" aria-hidden="true" />
    </div>
  )
}

export default function KerbsidePage({ steps, up, mine, text, lit, headingName, headingLoading, headingFailed, onRetry }) {
  const { eta, head, stat, lede, base, caption } = pickSteps(steps, up)
  const loadingLine = <p className="tsk-loading">Loading {headingName}</p>
  const failed = headingFailed
  const hf = headingLoading ? loadingLine : null

  const headLine = text || (mine ? 'Fresh this week.' : 'There at')
  const { label, caption: sampleCaption, brand } = screenCopy(mine)

  return (
    <LitStep.Provider value={lit}>
    <section className={`tsk${failed ? ' has-err' : ''}`} aria-label={label}>
      {!failed && (
        <div className={`tsk-hdr${mine ? ' is-mine' : ''}`}>
          <Line step={head}>{hf || <p className="tsk-pt tsk-h" style={lineStyle(head, 72, true)}>{headLine}</p>}</Line>
          {!mine && <Line step={eta}>{hf ? null : <p className="tsk-pt tsk-h" style={lineStyle(eta, 96, true)}>11:40.</p>}</Line>}
        </div>
      )}
      {mine ? (
        <div className="tsk-body">
          <p className="tsk-sample">{sampleCaption}</p>
          <Line step={stat}>{hf || <p className="tsk-pt tsk-h" style={lineStyle(stat, 48, true)}>Picked this morning</p>}</Line>
          <Line step={lede} style={{ marginTop: 12 }}>
            <p className="tsk-pt tsk-b" style={lineStyle(lede, 28, false)}>Picked at dawn and packed the same day, ready when you are.</p>
          </Line>
          {OWN_DELIVERIES.map(([to, when, price], i) => (
            <Line key={to} step={base} style={{ marginTop: i === 0 ? 20 : 8 }}>
              <div className="tsk-dl tsk-b" style={lineStyle(base, 28, false)}>
                <p className="tsk-pt">{to}</p><span className="tsk-dw">{when}</span><span className="tsk-dp">{price}</span>
              </div>
            </Line>
          ))}
          <Line step={caption} style={{ marginTop: 24 }}>
            <p className="tsk-pt tsk-b" style={lineStyle(caption, 18, false)}>Items change each week.</p>
          </Line>
        </div>
      ) : (
        <div className="tsk-body tsk-track">
          <Line step={stat}>{hf || <p className="tsk-pt tsk-h" style={lineStyle(stat, 48, true)}>On the way</p>}</Line>
          <div className="tsk-route" role="img" aria-label="The route from 88 Brunswick Street to 240 Adelaide Street. The rider is past halfway.">
            <span className="tsk-rt" /><span className="tsk-rd" /><span className="tsk-rs tsk-ra" /><span className="tsk-rs tsk-rb" /><span className="tsk-rr" />
          </div>
          <Line step={caption} style={{ marginTop: 8 }}>
            <div className="tsk-rl tsk-b" style={lineStyle(caption, 18, false)}><span>88 Brunswick Street</span><span>240 Adelaide Street</span></div>
          </Line>
          <div className="tsk-rider">
            <span className="tsk-ri" aria-hidden="true"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="16.5" r="3.5" /><circle cx="18" cy="16.5" r="3.5" /><path d="M6 16.5l3.5-7.5h6l2.5 7.5M9.5 9l2.5 7.5M9.5 9H7.5M15.5 9l-1-3h2.5" /></svg></span>
            <div>
              <Line step={lede}><p className="tsk-pt tsk-b" style={lineStyle(lede, 28, false)}>Mai, cargo bike</p></Line>
              <Line step={base}><p className="tsk-pt tsk-b" style={lineStyle(base, 28, false)}>Picked up at 10:52.</p></Line>
            </div>
          </div>
          <div className="tsk-tl">
            {KERB_LINES.map(r => (
              <Line key={r.time} step={base} className={`tsk-tr is-${r.state}`}>
                <div className="tsk-tc tsk-b" style={lineStyle(base, 28, false)}>
                  <span className="tsk-tm" aria-hidden="true" /><span className="tsk-tt">{r.time}</span><span>{r.label}</span>
                </div>
              </Line>
            ))}
          </div>
        </div>
      )}
      <div className="tsk-spacer" />
      {!mine && !failed && (
        <div className="tsk-foot">
          <span className="tsk-fk" aria-hidden="true" />
          <Line step={caption}>
            <div className="tsk-ft" style={lineStyle(caption, 18, false)}>
              {hf || <span className="tsk-h">{brand}</span>}<span className="tsk-b">Bikes, not vans.</span>
            </div>
          </Line>
        </div>
      )}
      {failed && (
        <div className="tsk-err" role="alert">
          <span>{headingName} didn’t load.</span>
          <button type="button" className="tsk-retry" onClick={onRetry}>Retry</button>
        </div>
      )}
    </section>
    </LitStep.Provider>
  )
}
