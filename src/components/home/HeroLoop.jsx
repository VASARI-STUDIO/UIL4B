import { lazy, Suspense, useEffect } from 'react'
import { LOOP_SIZES } from './heroLoopSize'
import { loadFont } from '../../utils/googleFonts'

// THE HERO LOOP'S MODULE, loaded on its own so it never sits on the hero's
// critical path. HomeHero reserves this frame's box before the module arrives
// (home-hero.css, `.hh-slot`), so mounting it moves nothing.
//
// It draws one size, the one HomeHero picked, inside the frame at that size's
// fixed dimensions. Each size is its own chunk, so a visitor downloads only the
// loop they see. A size without a panel yet stays an empty frame, hidden from
// assistive tech.
const PANELS = {
  large: lazy(() => import('./hero-loop/LoopLarge')),
  wide: lazy(() => import('./hero-loop/LoopStandard')),
  tablet: lazy(() => import('./hero-loop/LoopTablet')),
}

export default function HeroLoop({ size, playing }) {
  const { width, height } = LOOP_SIZES[size] || LOOP_SIZES.wide
  const Panel = PANELS[size]

  // The Font Pair scene sets the sample brand's heading in Archivo. loadFont
  // fetches the face once however many times a loop mounts.
  useEffect(() => {
    if (Panel) loadFont('Archivo', [800])
  }, [Panel])

  return (
    <div className="hh-loop" data-size={size} style={{ width, height }} aria-hidden={Panel ? undefined : 'true'}>
      {Panel && (
        <Suspense fallback={null}>
          <Panel active={playing} />
        </Suspense>
      )}
    </div>
  )
}
