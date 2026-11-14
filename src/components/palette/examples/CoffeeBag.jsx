// Coffee bag: a roaster's product page, painted with the user's palette.
//
// The bag is drawn here from the palette's own colours, not a photograph: a
// primary backdrop, a subtle bag, a deep label with the roast dots in the
// accent. It is a still picture; the button does nothing. Copy and the roast
// level come from CoffeeBag.data.js.
//
// Pure: no state, no effects. Colours arrive as --pv-* custom properties from
// the dialog; the inks this scene works out are set on its root.
import { useMemo } from 'react'
import { COPY, DOTS, roastLabel } from './CoffeeBag.data.js'
import { fieldInks } from './fieldInks.js'
import './CoffeeBag.css'

/** @param {{roles: object}} props roles: derivePaletteRoles() output */
export default function CoffeeBag({ roles }) {
  const { vars } = useMemo(() => fieldInks(roles), [roles])
  return (
    <div className="cf" style={vars}>
      <div className="cf-tx">
        <p className="cf-brand" data-role="neutral">{COPY.brand}</p>
        <h3 className="cf-n" data-role="neutral">{COPY.name}</h3>
        <p className="cf-p" data-role="neutral">{COPY.notes}</p>
        <p className="cf-pr" data-role="neutral">{COPY.price}</p>
        <span className="cf-add" data-role="primary">{COPY.cta}</span>
      </div>
      <div className="cf-ph" data-role="primary" role="img" aria-label={COPY.imageLabel}>
        <div className="cf-bag" data-role="subtle">
          <i className="cf-seal" />
          <div className="cf-label" data-role="deep">
            <span className="cf-wm">{COPY.wordmark[0]}<br />{COPY.wordmark[1]}</span>
            <span className="cf-row">
              <span className="cf-dt">{COPY.roasted}</span>
              <span className="cf-dots" aria-label={roastLabel}>
                {DOTS.map((on, i) => (on ? <i key={i} data-role="accent" /> : <i key={i} className="is-off" data-role="deep" />))}
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
