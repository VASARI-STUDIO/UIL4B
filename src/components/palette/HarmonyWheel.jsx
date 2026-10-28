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
const RING_R = 7
const RING_W = 2.5
const SAT = 62
const LIGHT = 52
// Monochromatic: one hue at the same angle, stepping inward from light to dark.
const MONO_STEPS = [
  { r: RING_R, size: 2.4, light: 58 },
  { r: 4.2, size: 1.8, light: 42 },
  { r: 1.4, size: 1.5, light: 27 },
]
const BASE_DOT = 2.4
const DOT = 1.9

const polar = (angle, radius) => {
  const a = (angle * Math.PI) / 180
  return [MID + radius * Math.sin(a), MID - radius * Math.cos(a)]
}

// Twelve hue segments, each 30 degrees wide and centred on its own hue. The fill
// is a mix of the hue into the surface, so the ring is quiet in light and dark.
const RING = Array.from({ length: 12 }, (_, k) => {
  const [x1, y1] = polar(k * 30 - 15, RING_R)
  const [x2, y2] = polar(k * 30 + 15, RING_R)
  return {
    k,
    d: `M${x1.toFixed(2)} ${y1.toFixed(2)}A${RING_R} ${RING_R} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`,
    colour: `color-mix(in srgb, hsl(${(WHEEL_BASE_HUE + k * 30) % 360} 70% 55%) 50%, var(--bg-1))`,
  }
})

export default function HarmonyWheel({ system, size = 20, className }) {
  const offsets = HARMONY_OFFSETS[system] || HARMONY_OFFSETS.auto
  // The outline stays 1px on screen whatever size the box is drawn at.
  const edge = BOX / size
  const dots = system === 'monochromatic'
    ? MONO_STEPS.map(({ r, size: dot, light }) => ({ pos: polar(0, r), dot, fill: hslToHex(WHEEL_BASE_HUE, SAT, light) }))
    : offsets.map((off, i) => ({ pos: polar(off, RING_R), dot: i === 0 ? BASE_DOT : DOT, fill: hslToHex(WHEEL_BASE_HUE + off, SAT, LIGHT) }))
  // The base dot is drawn last so it stays whole where a neighbour overlaps it.
  const ordered = system === 'monochromatic' ? [...dots].reverse() : [...dots.slice(1), dots[0]]
  return (
    <svg className={`harm-wheel${className ? ` ${className}` : ''}`} width={size} height={size} viewBox={`0 0 ${BOX} ${BOX}`} fill="none" aria-hidden="true" focusable="false">
      <g strokeWidth={RING_W}>
        {RING.map(({ k, d, colour }) => <path key={k} d={d} style={{ stroke: colour }} />)}
      </g>
      {ordered.map(({ pos, dot, fill }, i) => (
        <circle key={i} className="harm-dot" cx={pos[0]} cy={pos[1]} r={dot} fill={fill} strokeWidth={edge} style={{ stroke: 'var(--hw-edge, var(--bg-1))' }} />
      ))}
    </svg>
  )
}
