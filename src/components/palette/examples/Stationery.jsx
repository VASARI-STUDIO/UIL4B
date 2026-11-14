// Stationery: a swim school's logo, business card and letterhead, painted with
// the user's palette.
//
// The pieces are drawn here from the palette's own colours, not a photograph:
// a primary logo tile, a deep card with an accent rule, a letterhead on the
// surface with a secondary band. They are still pictures. Copy comes from
// Stationery.data.js.
//
// Pure: no state, no effects. Colours arrive as --pv-* custom properties from
// the dialog; the inks this scene works out are set on its root.
import { useMemo } from 'react'
import { COPY } from './Stationery.data.js'
import { fieldInks } from './fieldInks.js'
import './Stationery.css'

/** @param {{roles: object}} props roles: derivePaletteRoles() output */
export default function Stationery({ roles }) {
  const { vars, deepAdjusted } = useMemo(() => fieldInks(roles), [roles])
  return (
    <div className="st" style={vars} role="img" aria-label={COPY.imageLabel}>
      <div className="st-lg" data-role="primary">
        <span className="st-lgn">{COPY.logo}</span>
      </div>
      <div className="st-card" data-role="deep">
        <span className="st-nm">{COPY.cardName}</span>
        <i className="st-rule" data-role="accent" />
        <span className="st-ti">{COPY.cardTitle}</span>
      </div>
      <div className="st-lh">
        <i className="st-band" data-role="secondary" />
        <div className="st-hd">
          <span className="st-sc" data-role="deep" data-adjusted={deepAdjusted ? 'true' : undefined}>{COPY.school}</span>
          <span className="st-ad" data-role="neutral">{COPY.address}</span>
          <span className="st-ad" data-role="neutral">{COPY.phone}</span>
        </div>
        <p className="st-lt" data-role="neutral">{COPY.letter}</p>
      </div>
    </div>
  )
}
