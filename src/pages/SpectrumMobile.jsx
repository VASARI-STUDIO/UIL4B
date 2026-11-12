import { useRef, useState } from 'react'
import PillNav from '../components/PillNav'
import SpectrumFooter from '../components/spectrum/SpectrumFooter'
import HomeFinalCall from '../components/home/HomeFinalCall'
import { InkPill } from '../components/marketing/MkPill'
import { prefersReducedMotion } from '../components/spectrum/reducedMotion'
import { useTheme } from '../contexts/ThemeContext'
import '../styles/pages/home-tokens.css'

// /mobile: three real captures of the app on a phone, in a row on wide screens
// and a swipe strip under 768px. The pictures are the app's own screens, cropped
// to the top of each; the strip snaps to one phone at a time (the snapping is in
// v3-marketing.css). The buttons and the "N of 3" line follow the scroll position.
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
              <figure key={s.id} className="mk-fig">
                <div className="mk-frame">
                  <div className="mk-shot">
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
                <figcaption>{s.caption}<span>The live app, cropped to the tool.</span></figcaption>
              </figure>
            ))}
            <p className="mk-live">Captured from the live app and cropped to the top of each screen.</p>
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
