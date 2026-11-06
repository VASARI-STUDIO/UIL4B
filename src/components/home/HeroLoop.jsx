import { LOOP_SIZES } from './heroLoopSize'
import LoopStandard from './hero-loop/LoopStandard'

// THE HERO LOOP'S MODULE, loaded on its own so it never sits on the hero's
// critical path. HomeHero reserves this frame's box before the module arrives
// (home-hero.css, `.hh-slot`), so mounting it moves nothing.
//
// It draws one size, the one HomeHero picked, inside the frame at that size's
// fixed dimensions. A size without a panel yet stays an empty frame, hidden
// from assistive tech.
const PANELS = { wide: LoopStandard }

export default function HeroLoop({ size, playing }) {
  const { width, height } = LOOP_SIZES[size] || LOOP_SIZES.wide
  const Panel = PANELS[size]
  return (
    <div className="hh-loop" data-size={size} style={{ width, height }} aria-hidden={Panel ? undefined : 'true'}>
      {Panel && <Panel active={playing} />}
    </div>
  )
}
