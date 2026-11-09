import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PRO_PERKS } from '../userhome/workspace'

// The plan line at the foot of the page, and on Free the four Pro perks under "What Pro adds".
//
//   signed out   See plans
//   Free         You're on Free.  What Pro adds (opens the perks)  See plans
//   Pro          You're on Pro.  Manage plan
//   loading      a short bar, so the line does not jump when the plan answers
//
// The perks are workspace.js PRO_PERKS (the numbers come from the plan config); the icon paths are drawn in the
// same order.
const PERK_ICONS = [
  'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z M18.5 15l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z',
  'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 3v18 M4.2 7.5l15.6 9 M4.2 16.5l15.6-9',
  'M12 3l7 3v6c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6z M9 12l2 2 4-4',
  'M7 9a3 3 0 1 0 0 6c2 0 3-1.5 5-3s3-3 5-3a3 3 0 1 1 0 6c-2 0-3-1.5-5-3S9 9 7 9z',
]

export default function PlanLine({ loading, signedOut, isPro }) {
  const [open, setOpen] = useState(false)
  const free = !loading && !signedOut && !isPro
  return (
    <>
      <div className="db-plan">
        {loading && <span className="db-sk" aria-hidden="true" style={{ width: 140, height: 14, borderRadius: 4 }} />}
        {!loading && !signedOut && <p>{isPro ? 'You\u2019re on Pro.' : 'You\u2019re on Free.'}</p>}
        {free && (
          <button type="button" className="db-textbtn" aria-expanded={open} aria-controls="db-perks" onClick={() => setOpen((v) => !v)}>
            What Pro adds
            <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
          </button>
        )}
        {!loading && (isPro
          ? <Link className="db-tl m" to="/settings">Manage plan</Link>
          : <Link className="db-tl m" to="/plans">See plans</Link>)}
      </div>
      {free && open && (
        <ul className="db-perks" id="db-perks">
          {PRO_PERKS.map((pk, i) => (
            <li key={pk.label}>
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EFEEEA" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }}><path d={PERK_ICONS[i]} /></svg>
              <span><b>{pk.label}</b>. {pk.note}.</span>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
