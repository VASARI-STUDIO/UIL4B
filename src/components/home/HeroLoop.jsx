import { LOOP_SIZES } from './heroLoopSize'

// THE HERO LOOP'S MODULE, loaded on its own so it never sits on the hero's
// critical path. HomeHero reserves this frame's box before the module arrives
// (home-hero.css, `.hh-slot`), so mounting it moves nothing.
//
// It draws one size, the one HomeHero picked, as an empty frame at that size's
// fixed dimensions. Hidden from assistive tech until the loop itself is drawn
// into it.
export default function HeroLoop({ size }) {
  const { width, height } = LOOP_SIZES[size] || LOOP_SIZES.wide
  return (
    <div
      className="hh-loop"
      data-size={size}
      style={{ width, height }}
      aria-hidden="true"
    />
  )
}
