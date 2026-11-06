import { lazy, Suspense, useEffect } from 'react'
import { LOOP_SIZES } from './heroLoopSize'
import { loadFont } from '../../utils/googleFonts'

// THE HERO LOOP'S MODULE, loaded on its own so it never sits on the hero's
// critical path. HomeHero reserves this frame's box before the module arrives
// (home-hero.css, `.hh-slot`), so mounting it moves nothing.
//
// It draws one size, the one HomeHero picked, inside the frame at that size's
// fixed dimensions. Each size is its own chunk, so a visitor downloads only the
// loop they see. A size without a panel stays an empty frame, hidden from
// assistive tech.
const PANELS = {
  large: lazy(() => import('./hero-loop/LoopLarge')),
  wide: lazy(() => import('./hero-loop/LoopStandard')),
  tablet: lazy(() => import('./hero-loop/LoopTablet')),
  phone: lazy(() => import('./hero-loop/LoopPhone')),
}

// The faces the loop draws besides Geist, with the weights it sets them in.
const PHONE_FACES = [['Archivo', [800]], ['Bricolage Grotesque', [700]], ['IBM Plex Sans', [400]]]
const FACES = [
  ['Archivo', [800]],
  ['Bricolage Grotesque', [700]],
  ['Manrope', [700]],
  ['Outfit', [600]],
  ['Syne', [700]],
  ['Anton', [400]],
  ['IBM Plex Sans', [400, 500, 600]],
]

export default function HeroLoop({ size, playing }) {
  const { width, height } = LOOP_SIZES[size] || LOOP_SIZES.wide
  const Panel = PANELS[size]

  // The Font Pair scene sets the sample brand's heading and its alternatives in
  // their own faces. loadFont fetches a face once however many times a loop
  // mounts, and only the weights listed above.
  useEffect(() => {
    if (!Panel) return
    const faces = size === 'phone' ? PHONE_FACES : FACES
    faces.forEach(([family, weights]) => loadFont(family, weights))
  }, [Panel, size])

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
