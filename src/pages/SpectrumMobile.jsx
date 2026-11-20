import { useRef, useState } from 'react'
import PillNav from '../components/PillNav'
import SpectrumFooter from '../components/spectrum/SpectrumFooter'
import HomeFinalCall from '../components/home/HomeFinalCall'
import { InkPill } from '../components/marketing/MkPill'
import { prefersReducedMotion } from '../components/spectrum/reducedMotion'
import { useTheme } from '../contexts/ThemeContext'
import '../styles/pages/home-tokens.css'

// /mobile: three real captures of the app on a phone, in a row from 768px and a
// swipe strip under it. The pictures are the app's own screens, shown whole inside
// a phone drawn in CSS (the drawing, the sizes and the snapping are in
// v3-marketing.css); the strip snaps to one phone at a time. The buttons and the
// "N of 3" line follow the scroll position.
// Colours follow the theme: the Palette and Icon screens have a dark and a light
// capture, swapped in CSS. The workspace is dark in every theme, so it has one.

const GAP = 16
const SCREENS = [
  {
    id: 'palette',
    caption: 'Palette Builder, full controls',
    alt: 'The Palette Builder on a phone, with colour rows and adjust sliders',
    dark: '/mobile-screens/palette-dark.jpg',
    light: '/mobile-screens/palette-light.jpg',
  },
  {
    id: 'icons',
    caption: 'Icon Library, recolour and export',
    alt: 'The Icon Library on a phone, with search and the recolour row',
    dark: '/mobile-screens/icons-dark.jpg',
    light: '/mobile-screens/icons-light.jpg',
  },
  {
    id: 'projects',
    caption: 'Projects and your plan',
    alt: 'The workspace on a phone, with a project card showing its palette, type scale and font pair',
    dark: '/mobile-screens/projects-dark.jpg',
    // The workspace is a dark surface in every theme, so there is one capture for both.
    light: '/mobile-screens/projects-dark.jpg',
  },
]

// The status bar of the drawn phone: the time, then signal, wifi and battery. Decoration only.
function StatusBar() {
  return (
    <span className="mk-status" aria-hidden="true">
      <span className="mk-time">9:41</span>
      <svg viewBox="0 0 62 12" fill="currentColor">
        <rect x="0" y="8" width="3" height="4" rx=".8" />
        <rect x="4.5" y="5.5" width="3" height="6.5" rx=".8" />
        <rect x="9" y="3" width="3" height="9" rx=".8" />
        <rect x="13.5" y="0.5" width="3" height="11.5" rx=".8" />
        <path d="M23.5 4.6a9.5 9.5 0 0 1 13 0M25.8 7.3a6 6 0 0 1 8.4 0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        <circle cx="30" cy="10.3" r="1.2" />
        <rect x="42.5" y="1.5" width="16" height="9.5" rx="3" fill="none" stroke="currentColor" strokeOpacity=".5" />
        <rect x="44.2" y="3.2" width="12.6" height="6.1" rx="1.6" />
        <rect x="59.6" y="4.5" width="1.6" height="3.5" rx=".8" fillOpacity=".5" />
      </svg>
    </span>
  )
}

function Chevron({ d }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  )
}

export default function SpectrumMobile() {
  const strip = useRef(null)
  const [pos, setPos] = useState(0)
  const last = SCREENS.length - 1
  // The hidden theme's capture stays lazy; the one on show loads at once.
  const light = useTheme()?.theme === 'light'

  const step = () => {
    const fig = strip.current?.querySelector('.mk-fig')
    return (fig ? fig.getBoundingClientRect().width : 0) + GAP
  }
  const onScroll = () => {
    const el = strip.current
    const s = step()
    if (!el || s <= GAP) return
    setPos(Math.min(last, Math.max(0, Math.round(el.scrollLeft / s))))
  }
  const go = (i) => {
    const el = strip.current
    if (!el || i < 0 || i > last) return
    el.scrollTo({ left: step() * i, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
  }

  return (
    <div className="spectrum spt mkt">
      <PillNav variant="spectrum" />
      <div className="mk-spacer" aria-hidden="true" />
      <main id="main" tabIndex={-1}>
        <section className="mk-intro mk-intro--solo mk-wrap" aria-labelledby="mk-h1">
          <div className="mk-intro-copy">
            <h1 className="mk-h1" id="mk-h1">The same tools on a phone.</h1>
            <p className="mk-lead">Every tool runs the same on a phone. Pick colours on the train, check contrast in a meeting, then copy the tokens when you get back to your desk.</p>
            <InkPill to="/projects">Open the toolkit</InkPill>
          </div>
        </section>

        <section className="mk-sec mk-sec--last mk-sec--phones mk-wrap" aria-label="Phone screens">
          <div
            ref={strip}
            id="mk-phones"
            className="mk-phones"
            role="region"
            aria-label="Phone screens"
            tabIndex={0}
            onScroll={onScroll}
          >
            {SCREENS.map((s) => (
              <figure key={s.id} className={`mk-fig mk-fig--${s.id}`}>
                <div className="mk-frame">
                  <div className="mk-chassis">
                    <div className="mk-shot">
                      <StatusBar />
                      {s.dark === s.light ? (
                        <img src={s.dark} alt={s.alt} width="780" height="1424" loading="eager" decoding="async" />
                      ) : (
                        <>
                          <img className="mk-img-dark" src={s.dark} alt={s.alt} width="780" height="1424" loading={light ? 'lazy' : 'eager'} decoding="async" />
                          <img className="mk-img-light" src={s.light} alt={s.alt} width="780" height="1424" loading={light ? 'eager' : 'lazy'} decoding="async" />
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <figcaption>{s.caption}<span>The live app, as captured.</span></figcaption>
              </figure>
            ))}
            <p className="mk-live">Captured from the live app, each screen shown whole.</p>
          </div>
          <div className="mk-bar">
            <p className="mk-pos mk-mono" aria-live="polite">{pos + 1} of {SCREENS.length}</p>
            <div className="mk-arrows">
              <button type="button" aria-label="Previous screen" aria-controls="mk-phones" aria-disabled={pos === 0 ? 'true' : undefined} onClick={() => go(pos - 1)}>
                <Chevron d="M15 6l-6 6 6 6" />
              </button>
              <button type="button" aria-label="Next screen" aria-controls="mk-phones" aria-disabled={pos === last ? 'true' : undefined} onClick={() => go(pos + 1)}>
                <Chevron d="M9 6l6 6-6 6" />
              </button>
            </div>
          </div>
        </section>

        <HomeFinalCall toolkitTo="/projects" />
      </main>
      <SpectrumFooter toolkitTo="/projects" home pageColumn={false} />
    </div>
  )
}
