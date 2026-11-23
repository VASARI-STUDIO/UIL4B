// Shopfront: a hardware shop's frontage, painted with the user's palette.
//
// The shop is drawn here from the palette's own colours, not a photograph: a
// primary fascia carrying the name, a striped secondary awning, a deep door
// with its number on an accent plate. It is a still picture. Copy comes from
// Shopfront.data.js.
//
// Pure: no state, no effects. Colours arrive as --pv-* custom properties from
// the dialog; the inks this scene works out are set on its root.
import { useMemo } from 'react'
import { COPY, STRIPES } from './Shopfront.data.js'
import { fieldInks } from './fieldInks.js'
import './Shopfront.css'

// The two window displays share a sill and shelf height across the frontage.
function DisplayWindow({ paint }) {
  return (
    <div className="sf-win" aria-hidden="true">
      <svg viewBox="0 0 120 84" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
        {paint ? (
          <>
            <path d="M12 65V44h23v21m-24-21h25m-21-3a8 8 0 0 1 17 0M43 65V36h28v29m-30-29h32m-26-4a10 10 0 0 1 20 0M82 65V47h23v18m-25-18h27" />
            <path d="M15 52h17m14-7h22m17 10h17" strokeWidth="5" />
          </>
        ) : (
          <>
            <path d="m20 65 9-36 7 2-9 34m-1-36 1-6 18 4-1 7zM48 65l5-29 6 1-5 28m-3-31 2-13 4 1 2 8 4-7 3 1-3 12zM75 65l8-33 7 2-8 31m-3-35 2-10 20 5-2 10z" />
          </>
        )}
        <path d="M4 67h112" strokeWidth="3" />
      </svg>
    </div>
  )
}

/** @param {{roles: object}} props roles: derivePaletteRoles() output */
export default function Shopfront({ roles }) {
  const { vars } = useMemo(() => fieldInks(roles), [roles])
  return (
    <div className="sf" style={vars}>
      <div className="sf-shop" role="img" aria-label={COPY.imageLabel}>
        <div className="sf-fascia" data-role="primary">
          <span className="sf-wm">{COPY.name}</span>
        </div>
        <div className="sf-awning" aria-hidden="true">
          {STRIPES.map((on, i) => (on ? <i key={i} data-role="secondary" /> : <i key={i} className="is-alt" data-role="neutral" />))}
        </div>
        <div className="sf-wall">
          <DisplayWindow paint />
          <div className="sf-door" data-role="deep">
            <span className="sf-no" data-role="accent">{COPY.number}</span>
          </div>
          <DisplayWindow />
        </div>
      </div>
      <p className="sf-cap" data-role="neutral">{COPY.caption}</p>
    </div>
  )
}
