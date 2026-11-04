import { HARMONY_OFFSETS, hslToHex } from '../../utils/colors'

// A small colour wheel showing where a colour system's hues sit round the ring.
//
// The base hue is fixed rather than following the seed: the menu's icons stay
// the same while the seed is dragged, and a system reads the same every time.
// 230 is a clean blue, and the other systems then land on warm and green hues
// that sit well beside it (triadic gives a red and a green, complement an amber).
// The base sits at the top; hue increases clockwise, the way the studio's wheels run.
export const WHEEL_BASE_HUE = 230

const BOX = 20
const MID = BOX / 2
const RING_R = 7.2
const RING_W = 2.4
const SAT = 62
const LIGHT = 52
// Dot radii. Neighbours 30 degrees apart sit 2 * RING_R * sin(15deg) = 3.7 units
// apart centre to centre, so the two radii together must stay under that or the
// dots merge. The base is bigger so it still leads.
const BASE_DOT = 1.8
const DOT = 1.2
// Monochromatic: one hue as a swatch bar bent along the ring, light to dark
// clockwise. It is a bar, not dots, so it cannot be mistaken for Auto's pair. The
// darkest step is kept light enough to stay visible on the dark surface.
const MONO_BAR_W = 4.4
const MONO_SPAN = 28
const MONO_STEPS = [
  { at: -30, light: 76 },
  { at: 0, light: 58 },
  { at: 30, light: 42 },
]

const polar = (angle, radius) => {
  const a = (angle * Math.PI) / 180
  return [MID + radius * Math.sin(a), MID - radius * Math.cos(a)]
}

// A clockwise arc along the ring from one angle to another (under 180 degrees).
const arc = (from, to, radius) => {
  const [x1, y1] = polar(from, radius)
  const [x2, y2] = polar(to, radius)
  return `M${x1.toFixed(2)} ${y1.toFixed(2)}A${radius} ${radius} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`
}

// Twelve hue segments, each 30 degrees wide and centred on its own hue. The fill
// is a mix of the hue into the surface, so the ring is quiet in light and dark.
const RING = Array.from({ length: 12 }, (_, k) => ({
  k,
  d: arc(k * 30 - 15, k * 30 + 15, RING_R),
  colour: `color-mix(in srgb, hsl(${(WHEEL_BASE_HUE + k * 30) % 360} 70% 55%) 50%, var(--bg-1))`,
}))

export default function HarmonyWheel({ system, size = 20, className }) {
  const offsets = HARMONY_OFFSETS[system] || HARMONY_OFFSETS.auto
  // The outline stays about a pixel on screen whatever size the box is drawn at. It is
  // painted behind its own dot (paint-order), so it cuts the ring without eating the fill.
  const edge = BOX / size
  const dots = offsets.map((off, i) => ({ pos: polar(off, RING_R), dot: i === 0 ? BASE_DOT : DOT, fill: hslToHex(WHEEL_BASE_HUE + off, SAT, LIGHT) }))
  // The base dot is drawn last so it stays whole if a neighbour ever touches it.
  const ordered = [...dots.slice(1), dots[0]]
  return (
    <svg className={`harm-wheel${className ? ` ${className}` : ''}`} width={size} height={size} viewBox={`0 0 ${BOX} ${BOX}`} fill="none" aria-hidden="true" focusable="false">
      <g strokeWidth={RING_W}>
        {RING.map(({ k, d, colour }) => <path key={k} d={d} style={{ stroke: colour }} />)}
      </g>
      {system === 'monochromatic'
        ? <g strokeWidth={MONO_BAR_W}>
            {MONO_STEPS.map(({ at, light }) => (
              <path key={at} className="harm-dot" d={arc(at - MONO_SPAN / 2, at + MONO_SPAN / 2, RING_R)} style={{ stroke: hslToHex(WHEEL_BASE_HUE, SAT, light) }} />
            ))}
          </g>
        : ordered.map(({ pos, dot, fill }, i) => (
            <circle key={i} className="harm-dot" cx={pos[0]} cy={pos[1]} r={dot} fill={fill} strokeWidth={edge * 1.6} paintOrder="stroke" style={{ stroke: 'var(--hw-edge, var(--bg-1))' }} />
          ))}
    </svg>
  )
}
