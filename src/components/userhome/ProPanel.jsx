import { Link } from 'react-router-dom'
import Glyph from './Glyph'
import { PRO_PERKS, UPGRADE, UPGRADE_LINE } from './workspace'

// The Pro panel at the foot of the workspace (UIL4B App.dc.html, `projects`
// screen). Hidden for a Pro account by the page — there is nothing to sell it.
//
// FACTS CHANGED, LAYOUT NOT: the layout is the design's, the facts are the
// product's. The price is derived (workspace.js UPGRADE), "cancel any time"
// is gone (there is no cancel flow), the version-history claims are
// gone (there is no version history), and "Curves and OKLCH controls" is the
// HCT editor and the per-colour contrast chip, which are what the Palette
// Builder actually gates. The pill goes to /plans, never to checkout.
export default function ProPanel() {
  return (
    <section className="uh-pro" aria-labelledby="uh-pro-h">
      <div className="uh-pro-copy">
        <span className="uh-pro-eyebrow">UIL4B PRO</span>
        <h2 id="uh-pro-h" className="uh-pro-h">Lift the daily cap and the export mark.</h2>
        <p className="uh-pro-line">{UPGRADE_LINE}</p>
        <div className="uh-pro-cta-row">
          <Link to="/plans" className="uh-pro-cta">
            <span>{UPGRADE.label}</span>
            <span className="uh-pro-cta-ico" aria-hidden="true"><Glyph name="arrow-up-right" size={13} /></span>
          </Link>
          {UPGRADE.billed && <span className="uh-pro-billed">{UPGRADE.billed}</span>}
        </div>
      </div>
      <ul className="uh-pro-perks">
        {PRO_PERKS.map((pk) => (
          <li key={pk.label} className="uh-pro-perk">
            <span className="uh-pro-perk-ico" aria-hidden="true"><Glyph name={pk.icon} size={14} /></span>
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
