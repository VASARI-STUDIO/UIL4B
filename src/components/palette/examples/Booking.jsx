// Booking: a physio clinic's booking page, painted with the user's palette.
//
// The artefact is the month: the chosen day is the primary, days with room are
// the subtle, today carries the accent dot. One state at a time from the
// dialog's State menu (pick, held, full). In a live scene the selected slot
// updates the appointment summary. A comparison pane stays a still picture.
//
// The appointment is local to this example. Colours and inks follow the palette.
import { useMemo, useState } from 'react'
import { COPY, SLOTS, THURSDAY_SLOTS, WEEKDAYS, calendarCells, slotList, ctaFor, calendarLabel } from './Booking.data.js'
import { fieldInks } from './fieldInks.js'
import './Booking.css'

const Held = ({ className }) => (
  <svg className={className} data-role="success" aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <circle cx="8" cy="8" r="6" /><path d="M8 4.8V8l2 1.4" />
  </svg>
)

const Chevron = ({ d }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
)

/**
 * @param {{roles: object, state?: string}} props roles: derivePaletteRoles() output;
 *   state: the State menu's pick (pick, held, full)
 */
export default function Booking({ roles, state, onState }) {
  const { vars, linkAdjusted, deepAdjusted } = useMemo(() => fieldInks(roles), [roles])
  const view = state === 'held' || state === 'full' ? state : 'pick'
  const live = typeof onState === 'function' && !roles.pair
  const [appointment, setAppointment] = useState({ day: 18, time: COPY.time })
  const day = view === 'full' ? 18 : appointment.day
  const slots = day === 19 ? THURSDAY_SLOTS : SLOTS
  const time = appointment.time
  const act = () => {
    if (view === 'full') setAppointment({ day: 19, time: THURSDAY_SLOTS[0] })
    onState(view === 'pick' ? 'held' : 'pick')
  }
  const actionLabel = view === 'held' ? 'Release time' : view === 'full' ? COPY.ctaFull : `Book ${time}`
  return (
    <div className="bk" style={vars} data-state={view}>
      <header className="bk-top">
        <span className="bk-mark" data-role="deep" data-adjusted={deepAdjusted ? 'true' : undefined}>{COPY.brand}</span>
        <nav className="bk-nav" aria-label={COPY.brand}>
          {COPY.nav.map((n, i) => (
            <span key={n} className={i === COPY.nav.length - 1 ? 'is-cur' : undefined} data-role="neutral" aria-current={i === COPY.nav.length - 1 ? 'page' : undefined}>{n}</span>
          ))}
        </nav>
      </header>
      <div className="bk-body">
        <div className="bk-l">
          <h3 className="bk-h" data-role="neutral">{COPY.heading}</h3>
          <div className="bk-sum">
            <div className="bk-row">
              <span className="bk-svc" data-role="neutral">{COPY.service}</span>
              <span className="bk-price" data-role="neutral">{COPY.price}</span>
            </div>
            <p className="bk-mut" data-role="neutral">{COPY.length}</p>
            <p data-role="neutral">{COPY.clinician}</p>
            <div className="bk-pin">
              <svg data-role="secondary" aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 14s4.5-3.9 4.5-7.5a4.5 4.5 0 0 0-9 0C3.5 10.1 8 14 8 14z" /><circle cx="8" cy="6.5" r="1.6" />
              </svg>
              <span data-role="neutral">{COPY.clinic}</span>
              <span className="bk-lnk" data-role="secondary" data-adjusted={linkAdjusted ? 'true' : undefined}>{COPY.changeClinic}</span>
            </div>
          </div>
        </div>
        <div className="bk-r">
          <div className="bk-mo">
            <b data-role="neutral">{COPY.month}</b>
            <span className="bk-chev" aria-hidden="true"><Chevron d="M10 3.5L5.5 8l4.5 4.5" /><Chevron d="M6 3.5L10.5 8 6 12.5" /></span>
          </div>
          <div className="bk-cal" role="img" aria-label={calendarLabel(view, day)}>
            {WEEKDAYS.map((w, i) => <span key={i} className="bk-wd" data-role="neutral">{w}</span>)}
            {calendarCells(view, day).map((c, i) => (
              <span key={i} className="bk-d">
                {c.n !== null && <b className={`bk-bg ${c.cls}`} data-role={c.role}>{c.n}</b>}
                {c.today && <i className="bk-dot" data-role="accent" />}
              </span>
            ))}
          </div>
          <p className="bk-note"><i className="bk-wdot" data-role="warning" /><span data-role="neutral">{COPY.note}</span></p>
          <p className="bk-sh" data-role="neutral">{COPY.slotsHeading}</p>
          {view !== 'full' && (
            <div className="bk-slots">
              {slotList(view, time, slots).map((s) => (
                <span key={s.t} className="bk-sl">
                  {live && view === 'pick' ? (
                    <button
                      type="button" className={`bk-s ${s.cls}`}
                      data-role={s.t === time ? 'primary' : 'neutral'} aria-pressed={s.t === time}
                      disabled={s.cls === 'is-taken'} onClick={() => setAppointment({ day, time: s.t })}
                    >{s.t}</button>
                  ) : <span className={`bk-s ${s.cls}`} data-role={s.t === time ? 'primary' : 'neutral'}>{s.t}</span>}
                  {s.hold && <Held className="bk-hi" />}
                </span>
              ))}
            </div>
          )}
          {view === 'full' && <p className="bk-err" data-role="error"><span aria-hidden="true">▲ </span>{COPY.full}</p>}
        </div>
        <div className="bk-confirm">
          <div className="bk-when" aria-live={live ? 'polite' : undefined}>
            <p className="bk-dt" data-role="neutral">{day === 19 ? 'Thursday 19 November' : COPY.date}</p>
            {view !== 'full' && <p className="bk-mut" data-role="neutral">{time}</p>}
          </div>
          <div className="bk-act">
            {view === 'held' && <p className="bk-hold" data-role="success"><Held /><span>{COPY.held}</span></p>}
            {live
              ? <button type="button" className="bk-cta" data-role="primary" onClick={act}>{actionLabel}</button>
              : <span className="bk-cta" data-role="primary">{ctaFor(view)}</span>}
          </div>
        </div>
      </div>
    </div>
  )
}
