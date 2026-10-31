import Glyph from './Glyph'
import OpenPill from '../spectrum/OpenPill'
import { usePrices, useProPrice } from '../../hooks/usePrices'
import { PRO_PERKS, UPGRADE_LINE, upgradeOffer } from './workspace'

// The Pro panel at the foot of the workspace (UIL4B App.dc.html, `projects`
// screen). Hidden for a Pro account by the page — there is nothing to sell it.
//
// FACTS CHANGED, LAYOUT NOT: the layout is the design's, the facts are the
// product's. The price is live, in the visitor's own currency (workspace.js
// upgradeOffer; no amount until one is live), "cancel any time"
// is gone (there is no cancel flow), the version-history claims are
// gone (there is no version history), and "Curves and OKLCH controls" is the
// HCT editor and the per-colour contrast chip, which are what the Palette
// Builder actually gates. The pill goes to /plans, never to checkout.
//
// The panel is flat: the card colour and a hairline, with no gradient, shadow or accent border.

export default function ProPanel() {
  const { currency, loaded } = useProPrice()
  const { prices } = usePrices()
  const upgrade = upgradeOffer({ prices, currency, loaded })
  return (
    <section className="uh-pro" aria-labelledby="uh-pro-h">
      <div className="uh-pro-copy">
        <h2 id="uh-pro-h" className="uh-pro-h">Lift the daily cap and the export mark.</h2>
        <p className="uh-pro-line">{UPGRADE_LINE}</p>
        <div className="uh-pro-cta-row">
          <OpenPill to="/plans" className="uh-pro-cta">{upgrade.label}</OpenPill>
          {upgrade.billed && <span className="uh-pro-billed">{upgrade.billed}</span>}
        </div>
      </div>
      <ul className="uh-pro-perks">
        {PRO_PERKS.map((pk) => (
          <li key={pk.label} className="uh-pro-perk">
            <span className="uh-pro-perk-ico" aria-hidden="true"><Glyph name={pk.icon} size={16} /></span>
            <span className="uh-pro-perk-text">
              <span className="uh-pro-perk-label">{pk.label}</span>
              <span className="uh-pro-perk-note">{pk.note}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
