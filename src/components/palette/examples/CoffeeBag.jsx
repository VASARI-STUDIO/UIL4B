// Coffee bag: a roaster's product page, painted with the user's palette.
//
// The bag uses a neutral paper texture beneath the palette's own colours: a
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
        <dl className="cf-lot" data-role="neutral">
          <div><dt>Blend</dt><dd>{COPY.blend}</dd></div>
          <div><dt>In the cup</dt><dd>{COPY.tasting}</dd></div>
        </dl>
        <p className="cf-pr" data-role="neutral">{COPY.price}</p>
        <span className="cf-add" data-role="primary">{COPY.cta}</span>
      </div>
      <div className="cf-ph" data-role="primary" role="img" aria-label={COPY.imageLabel}>
        <div className="cf-bag" data-role="subtle">
          <div className="cf-label" data-role="deep">
            <span className="cf-imprint">{COPY.brand}</span>
            <svg className="cf-horizon" viewBox="0 0 160 60" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.3">
              <circle cx="115" cy="16" r="8" />
              <path d="M0 43C22 44 32 13 53 18S79 51 103 39s36-17 57-13M0 50c27 0 39-29 58-24s30 32 54 19 32-14 48-12M0 57c27 0 43-27 63-22s29 28 53 16 29-11 44-11" />
            </svg>
            <span className="cf-wm">{COPY.name}</span>
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
