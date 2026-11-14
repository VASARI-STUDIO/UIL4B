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
          <div className="sf-win" />
          <div className="sf-door" data-role="deep">
            <span className="sf-no" data-role="accent">{COPY.number}</span>
          </div>
          <div className="sf-win" />
        </div>
      </div>
      <p className="sf-cap" data-role="neutral">{COPY.caption}</p>
    </div>
  )
}
