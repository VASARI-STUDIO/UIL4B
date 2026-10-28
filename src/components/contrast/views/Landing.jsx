// Tidewell, the Landing view of a Contrast Checker pair: a bookkeeping product's
// front page with a nav, a hero, two buttons, a price card and a matched
// receipt. Painted in exactly two colours (--pv-text and --pv-canvas), so the
// picture is what the pair does to a page that has to sell.
//
// Pure: no state, no effects, no props. PairExample sorts the pieces into the
// three tests at runtime (data-size); this file only names the parts that are not
// text, as classes UI_PARTS lists. The same two rules as Interface keep that
// honest: a border or fill sits on a wrapper with the words in a span inside it,
// and a drawn line (the link underline, the receipt's torn edge) is its own
// element rather than text decoration.
import { BRAND, HERO, NAV, PLAN, RECEIPT } from './Landing.data.js'
import { part } from './pairPart.js'
import './Landing.css'

const Tick = ({ size }) => (
  <svg className="tw-check" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
)

// Twenty teeth across the receipt's foot, stretched to its width.
const TEETH = Array.from({ length: 21 }, (_, i) => `${i * 5},${i % 2 ? 6 : 0}`).join(' ')

export default function Landing({ job = null }) {
  return (
    <div className="tw">
      <div className="tw-nav">
        <p className="tw-brand" {...part('text', job)}>{BRAND}</p>
        <ul className="tw-links">
          {NAV.links.map((l) => <li key={l} {...part('text', job)}>{l}</li>)}
        </ul>
        <span className="tw-btn tw-btn--fill tw-btn--sm" {...part('fill-label', job)}><span>{NAV.start}</span></span>
      </div>

      <div className="tw-hero">
        <p className="tw-h" {...part('text', job)}>{HERO.heading}</p>
        <p className="tw-sub" {...part('text', job)}>{HERO.sub}</p>
        <div className="tw-cta">
          <span className="tw-btn tw-btn--fill" {...part('fill-label', job)}><span>{HERO.cta}</span></span>
          <span className="tw-link" {...part('text', job)}><span>{HERO.link}</span><i className="tw-link-u" /></span>
        </div>
        <p className="tw-help" {...part('text', job)}>{HERO.help}</p>
      </div>

      {/* 800px and up only: the receipt beside the hero. */}
      <div className="tw-receipt">
        <div className="tw-rbody">
          <p className="tw-rstore" {...part('text', job)}>{RECEIPT.store}</p>
          <p className="tw-rdate" {...part('text', job)}>{RECEIPT.date}</p>
          <ul className="tw-rlines">
            {RECEIPT.lines.map(([item, cost]) => <li key={item} className="tw-rrow" {...part('text', job)}><span>{item}</span><span>{cost}</span></li>)}
          </ul>
          <p className="tw-rrow tw-rtotal" {...part('text', job)}><span>{RECEIPT.total[0]}</span><span>{RECEIPT.total[1]}</span></p>
          <p className="tw-rgst" {...part('text', job)}>{RECEIPT.gst}</p>
          <span className="tw-badge" {...part('fill-label beside', job)}><Tick size={14} /><span>{RECEIPT.badge}</span></span>
        </div>
        <svg className="tw-torn" viewBox="0 0 100 6" preserveAspectRatio="none" fill="none" stroke="currentColor" strokeWidth="1" strokeLinejoin="miter" aria-hidden="true">
          <polyline points={TEETH} vectorEffect="non-scaling-stroke" />
        </svg>
      </div>

      <div className="tw-card">
        <p className="tw-plan" {...part('text', job)}>{PLAN.name}</p>
        <p className="tw-price" {...part('text', job)}><span className="tw-amt">{PLAN.price}</span><span className="tw-per">{PLAN.per}</span></p>
        <ul className="tw-feats">
          {PLAN.features.map((f) => <li key={f} className="tw-feat" {...part('text', job)}><Tick size={16} /><span>{f}</span></li>)}
        </ul>
        <span className="tw-btn tw-btn--outline tw-btn--block"><span {...part('text', job)}>{PLAN.choose}</span></span>
        <p className="tw-fine" {...part('text', job)}>{PLAN.fine}</p>
      </div>
    </div>
  )
}
