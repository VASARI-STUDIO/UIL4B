import { Suspense, useCallback, useEffect, useState } from 'react'
import { lazyRoute as lazy } from '../../utils/lazyRoute'
import { Link } from 'react-router-dom'
import { SPECTRUM_HERO, SPECTRUM_HERO_SUB } from '../spectrum/spectrumHero'
import SpectrumSearch from '../spectrum/SpectrumSearch'
import { useAutoplaySlot } from './useAutoplaySlot'
import { LOOP_SIZES, useLoopSize } from './heroLoopSize'
import ChunkBoundary from './ChunkBoundary'

const HeroLoop = lazy(() => import('./HeroLoop'))

// THE HOMEPAGE HERO (`#top`): the headline, one line under it, two links, the
// tool search and the loop panel. Layout, sizes and the one entrance live in
// src/styles/pages/home-hero.css, imported by the page so it is in the
// render-blocking sheet.
//
// The headline is the page's largest paint and has no entrance: it is plain
// text in one element, the same chain scripts/home-shell.mjs writes into the
// served page. Only the loop panel enters.
//
// The search is the page's command bar: while it is mounted it owns Ctrl/Cmd+K
// (the nav's palette stands down for that chord and keeps "/"). Its results
// open over the loop rather than pushing it (home-hero.css, `.hh-search`).
//
// The loop's frame (`.hh-slot`) is the element the page's autoplay owner
// watches. It is sized by CSS from the first paint, and the loop module that
// fills it loads after, so its arrival cannot move the layout. If that module
// cannot download, the boundary leaves an empty panel of the same size, so the
// rest of the hero stays and the page does not fall to the route's error card.

/** The loop's panel with nothing drawn in it: what the frame holds when the loop's code did not arrive. */
function LoopStandIn({ size, onReady }) {
  const { width, height } = LOOP_SIZES[size] || LOOP_SIZES.wide
  // The stand-in is all there will be, so the frame may enter around it.
  useEffect(() => { onReady() }, [onReady])
  return <div className="hh-loop" data-size={size} style={{ width, height }} aria-hidden="true" />
}

export default function HomeHero() {
  const size = useLoopSize()
  const [frameEl, setFrameEl] = useState(null)
  // The loop reads this in the run that draws it; the frame reports its own
  // visibility to the page's autoplay owner either way.
  const playing = useAutoplaySlot('hero', frameEl)
  // The panel holds clear until the loop has drawn something, then makes its one
  // entrance (home-hero.css, `.hh-fig[data-ready]`). Without this the frame rose in
  // empty and the loop popped into it a beat later. The frame keeps its box
  // throughout, so waiting moves nothing.
  const [loopReady, setLoopReady] = useState(false)
  const markReady = useCallback(() => setLoopReady(true), [])

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
          <Link className="hh-ghost ui-pill-out" to="/plans">View plans</Link>
        </div>
        <p className="sr-only" id="hh-search-label">Search every tool</p>
        <div className="hh-search">
          <SpectrumSearch labelledBy="hh-search-label" />
        </div>
      </div>

      <figure className="hh-fig" data-ready={loopReady || undefined}>
        <div className="hh-slot" data-size={size} data-playing={playing ? 'true' : 'false'} ref={setFrameEl}>
          <ChunkBoundary key={size} fallback={<LoopStandIn size={size} onReady={markReady} />}>
            <Suspense fallback={null}>
              <HeroLoop size={size} playing={playing} onReady={markReady} />
            </Suspense>
          </ChunkBoundary>
        </div>
      </figure>
    </section>
  )
}
