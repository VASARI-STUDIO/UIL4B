import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { HOME_GALLERY, HOME_GALLERY_FILTERS } from '../data/homeGallery'

// ── The homepage Discover gallery ────────────────────────────────────────────
//
// What this replaced, and why it mattered: the section used to render
// COMMUNITY_DESIGNS — twelve curated links to Dribbble, Awwwards, Behance and
// Mobbin — as anchors opening in a new tab, marked nofollow. A block labelled
// "[ COMMUNITY ]" therefore spent its whole job sending visitors OFF the site,
// which is the exact failure positioning.md warns about: Discover has to drive
// people INTO the product.
//
// So this is a data change, not a copy change. Every card is now a real UIL4B
// artefact from the shipped galleries, every thumbnail IS that artefact (real
// swatches, real gradientCss), and every link points inward through the same
// hand-off helpers Discover already uses. No external host, no external asset,
// no Storage dependency — it still renders offline.
//
// The eyebrow says [ DISCOVER ], not [ COMMUNITY ]. Nothing in this grid is
// member-submitted, and naming a community we have not built yet would be the
// fabricated proof growth-persuasion.md forbids.
//
// The item list itself lives in data/homeGallery.js so the inward-linking and
// Pro-gate guarantees can be asserted without a browser.

const PAGE = 12

// Data values, not styling decisions, so they arrive as custom properties and
// the declaration that consumes them stays in global.css. Same technique the
// section used for its old two-stop thumbnails.
const setVar = (name, value) => (node) => {
  if (node) node.style.setProperty(name, value)
}

function CardArt({ item }) {
  if (item.kind === 'gradient') {
    return (
      <span className="hcomm-art" aria-hidden="true">
        <span className="hcomm-grad" ref={setVar('--hcomm-grad', item.gradient)} />
      </span>
    )
  }
  return (
    <span className="hcomm-art" aria-hidden="true">
      {item.colors.map((hex, i) => (
        <span className="hcomm-sw" key={`${hex}-${i}`} ref={setVar('--hcomm-sw', hex)} />
      ))}
    </span>
  )
}

export default function HomeGallery() {
  const [filter, setFilter] = useState('all')
  const [shown, setShown] = useState(PAGE)
  // { key, ok } — `ok: false` is a real state, not a swallowed failure. A
  // blocked clipboard must never render "Copied".
  const [copy, setCopy] = useState(null)
  const [status, setStatus] = useState('')
  const timer = useRef(null)

  useEffect(() => () => clearTimeout(timer.current), [])

  const items = HOME_GALLERY[filter]
  const visible = useMemo(() => items.slice(0, shown), [items, shown])

  const pick = useCallback((id) => {
    setFilter(id)
    setShown(PAGE)
  }, [])

  const copyCss = useCallback(async (item) => {
    let ok = false
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(item.css)
        ok = true
      }
    } catch {
      ok = false
    }
    setCopy({ key: item.key, ok })
    setStatus(ok ? `Copied the CSS for ${item.name}` : 'Your browser blocked the clipboard, so nothing was copied')
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopy(null), 1600)
  }, [])

  const showMore = useCallback(() => {
    setShown((prev) => {
      const next = Math.min(prev + PAGE, items.length)
      setStatus(`Showing ${next} of ${items.length}`)
      return next
    })
  }, [items.length])

  return (
    <section className="hcomm" aria-labelledby="hcomm-title">
      <div className="home-container">
        <div className="hcomm-head" data-reveal>
          <div>
            <span className="hbrow">[ DISCOVER ]</span>
            <h2 className="hh2" id="hcomm-title">Start from something that already works.</h2>
          </div>
          <div className="hcomm-tabs" role="group" aria-label="Filter the gallery">
            {HOME_GALLERY_FILTERS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className="hcomm-tab"
                aria-pressed={tab.id === filter}
                onClick={() => pick(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <ul className="hcomm-grid" data-reveal-group>
          {visible.map((item) => (
            <li className="hcomm-card" key={item.key} data-kind={item.kind}>
              <CardArt item={item} />

              {/* Real controls, always in the DOM and always focusable. The
                  reveal is visual only — :hover, :focus-within — so a keyboard
                  reaches exactly what a pointer reveals, and touch (which has
                  no hover) gets them permanently. A hover-only affordance would
                  put this section's primary action out of reach. */}
              <span className="hcomm-acts">
                <Link className="hcomm-act hcomm-act-open" to={item.to} aria-label={item.openHint}>
                  {item.openLabel}
                </Link>
                <button
                  type="button"
                  className="hcomm-act hcomm-act-copy"
                  onClick={() => copyCss(item)}
                  aria-label={`Copy the CSS for ${item.name}`}
                >
                  {copy?.key === item.key ? (copy.ok ? 'Copied' : 'Copy failed') : 'Copy CSS'}
                </button>
              </span>

              <span className="hcomm-card-foot">
                <span className="hcomm-card-name">{item.name}</span>
                <span className="hcomm-card-facts">
                  {item.facts.map((fact, i) => (
                    <span className="hcomm-fact" key={`${fact}-${i}`}>{fact}</span>
                  ))}
                </span>
              </span>
            </li>
          ))}
        </ul>

        <div className="hcomm-more">
          {shown < items.length && (
            <button type="button" className="ui-pill ui-pill-quiet ui-pill-md" onClick={showMore}>
              Show more
            </button>
          )}
          <p className="hcomm-count">{visible.length} of {items.length} shown</p>
        </div>

        {/* The honesty note the old strip carried, kept intact and moved below
            the grid so the section no longer opens on a disclaimer. */}
        <p className="hcomm-note">
          Every card opens in the tool with its values already loaded. Ranking, member
          submissions and real save counts arrive with the community build — until then these
          are curated starting points, in a fixed order.
        </p>

        <p className="sr-only" role="status">{status}</p>

        <div className="hcomm-cta">
          <Link className="ui-pill ui-pill-quiet ui-pill-md" to="/discover">
            Explore Discover
            <span className="ui-pill-arrow" aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </div>
    </section>
  )
}
