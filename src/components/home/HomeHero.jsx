import { lazy, Suspense, useState } from 'react'
import { Link } from 'react-router-dom'
import { SPECTRUM_HERO, SPECTRUM_HERO_SUB } from '../spectrum/spectrumHero'
import { useAutoplaySlot } from './useAutoplaySlot'
import { useLoopSize } from './heroLoopSize'

const HeroLoop = lazy(() => import('./HeroLoop'))

// THE HOMEPAGE HERO (`#top`): the headline, one line under it, two links and the
// loop panel. Layout, sizes and the one entrance live in
// src/styles/pages/home-hero.css, imported by the page so it is in the
// render-blocking sheet.
//
// The headline is the page's largest paint and has no entrance: it is plain
// text in one element, the same chain scripts/home-shell.mjs writes into the
// served page. Only the loop panel enters.
//
// The loop's frame (`.hh-slot`) is the element the page's autoplay owner
// watches. It is sized by CSS from the first paint, and the loop module that
// fills it loads after, so its arrival cannot move the layout.
export default function HomeHero() {
  const size = useLoopSize()
  const [frameEl, setFrameEl] = useState(null)
  // The loop reads this in the run that draws it; the frame reports its own
  // visibility to the page's autoplay owner either way.
  const playing = useAutoplaySlot('hero', frameEl)

  return (
    <section id="top" className="hh-hero">
      <div className="hh-glow" aria-hidden="true"><span /></div>

      <div className="hh-copy">
        <h1 className="hh-h1">
          {SPECTRUM_HERO.lead}{' '}
          <span className="hh-h1-mark">{SPECTRUM_HERO.mark}</span>
          {SPECTRUM_HERO.tail}
        </h1>
        <p className="hh-sub">{SPECTRUM_HERO_SUB}</p>
        <div className="hh-cta">
          <Link className="hh-go" to="/projects">
            Open the toolkit
            <span className="hh-go-disc" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M7 17L17 7M8 7h9v9" />
              </svg>
            </span>
          </Link>
          <Link className="hh-ghost mi-ring" to="/plans">View plans</Link>
        </div>
      </div>

      <figure className="hh-fig">
        <div className="hh-slot" data-size={size} data-playing={playing ? 'true' : 'false'} ref={setFrameEl}>
          <Suspense fallback={null}>
            <HeroLoop key={size} size={size} playing={playing} />
          </Suspense>
        </div>
      </figure>
    </section>
  )
}
