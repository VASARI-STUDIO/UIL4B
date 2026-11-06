import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { EXPORT_THEMES_LIVE, themeById } from '../../config/exportFormats'
import { plansLead, proRows } from '../../config/planFacts'
import { usePrices } from '../../hooks/usePrices'
import { FreeList, ProList } from './PlanLists'
import { freePrice, planPriceFacts } from './plansPrices'
import '../../styles/pages/home-plans.css'

// The homepage's plans section: the Free and Pro cards. Every amount comes
// from plansPrices.js (the plan ladder, with live prices once they arrive) and
// every list line from planFacts.js; nothing here is typed.
//
// The cards sit Free then Pro in the DOM. Under 1200px the stylesheet shows Pro
// first, because the offer is what a thumb or a scroll should reach first.

// The prices are fetched only once the section is within this distance of the
// viewport. The fallback figures render before that.
const NEAR_MARGIN = '600px'

// Two Pro cover pages, as the exports render them. Widths are the encoded
// files in public/home-plans; the sizes attribute says which one is drawn.
const FIGURE_PAGES = [
  {
    id: '10-inuse',
    file: 'pro-inuse-cover',
    widths: [100, 200, 300],
    width: 100,
    height: 141,
    sizes: '(max-width: 767px) 74px, 100px',
  },
  {
    id: '01-presentation',
    file: 'pro-presentation-cover',
    widths: [187, 374, 484],
    width: 242,
    height: 136,
    sizes: '(max-width: 767px) 187px, 242px',
  },
]

const srcSet = (file, widths, ext) => widths.map((w) => `/home-plans/${file}-${w}.${ext} ${w}w`).join(', ')

function PlanFigure() {
  return (
    <figure className="hpl-fig">
      <div className="hpl-fig-row">
        {FIGURE_PAGES.map((page) => {
          const theme = themeById(page.id)
          if (!theme) return null
          return (
            <picture key={page.id}>
              <source type="image/avif" srcSet={srcSet(page.file, page.widths, 'avif')} sizes={page.sizes} />
              <source type="image/webp" srcSet={srcSet(page.file, page.widths, 'webp')} sizes={page.sizes} />
              <img
                className={`hpl-fig-img hpl-fig-img--${page.id}`}
                src={`/home-plans/${page.file}-${page.widths[1]}.webp`}
                alt={`Cover of the ${theme.brand} brand guidelines, in the ${theme.name} theme`}
                width={page.width}
                height={page.height}
                loading="lazy"
                decoding="async"
              />
            </picture>
          )
        })}
      </div>
    </figure>
  )
}

function GoArrow() {
  return (
    <span className="mi-go hpl-go-icon" aria-hidden="true">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M7 17L17 7M8 7h9v9" />
      </svg>
    </span>
  )
}

export default function HomePlans() {
  const live = EXPORT_THEMES_LIVE
  const sectionRef = useRef(null)
  const [near, setNear] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    const section = sectionRef.current
    // Without an observer the fallback figures stand and nothing is fetched.
    if (!section || near || typeof IntersectionObserver === 'undefined') return undefined
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) setNear(true)
    }, { rootMargin: NEAR_MARGIN })
    observer.observe(section)
    return () => observer.disconnect()
  }, [near])

  const { prices } = usePrices({ enabled: near })
  const facts = useMemo(() => planPriceFacts(prices), [prices])
  const proCount = proRows(live).length

  return (
    <section id="plans" ref={sectionRef} className="hpl" aria-labelledby="plans-h">
      <div className="hpl-wrap">
        <div className="hpl-head">
          <h2 id="plans-h" className="hpl-h2" tabIndex={-1}>
            <span>Free to build it.</span> <span>Pro to hand it over.</span>
          </h2>
          <p className="hpl-lead">{plansLead(live)}</p>
        </div>

        <div className="hpl-grid">
          <div className="hpl-card hpl-free">
            <h3 className="hpl-plan">Free</h3>
            <p className="hpl-amount">{freePrice()}</p>
            <p className="hpl-note">No card, no time limit.</p>
            <FreeList live={live} />
            <div className="hpl-freefoot">
              <Link className="hpl-btn hpl-ghost ui-pill-out" to="/projects">Open the toolkit</Link>
              <p>No account needed to start.</p>
            </div>
          </div>

          <div className="hpl-card hpl-pro">
            <span className="hpl-edge" aria-hidden="true" />
            <div className="hpl-prohead">
              <div className="hpl-protext">
                <div className="hpl-planrow">
                  <h3 className="hpl-plan">Pro</h3>
                  {facts?.trialBadge && <span className="hpl-badge">{facts.trialBadge}</span>}
                </div>
                <p className="hpl-tagline">The full studio, white-labelled.</p>
                {facts && (
                  <>
                    <p className="hpl-price">
                      <span className="hpl-amount">{facts.perMonth}</span>
                      <span className="hpl-billed">{facts.billedLine}</span>
                      {facts.savingLabel && <span className="hpl-save">{facts.savingLabel}</span>}
                    </p>
                    <p className="hpl-terms">{facts.terms}</p>
                  </>
                )}
              </div>
              {/* ships with the export themes */}
              {live && <PlanFigure />}
            </div>

            <ProList live={live} collapsed={!expanded} />
            <button
              type="button"
              className="hpl-more"
              aria-expanded={expanded}
              aria-controls="pp-prolist"
              onClick={() => setExpanded((open) => !open)}
            >
              {expanded ? 'Show fewer' : `Show all ${proCount} Pro features`}
              <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>

            <div className="hpl-foot">
              <Link className="hpl-btn hpl-go" to="/plans">
                <span>{facts?.cta || 'Start Pro'}</span>
                <GoArrow />
              </Link>
              <p className="hpl-small">
                Cancel any time and keep every export you made. You pick yearly or monthly on the next page.{' '}
                <Link className="hpl-link" to="/plans">Compare every limit</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
