// The Palette Builder frame's logic, apart from the screen so it can be tested.
// The colour engine (adjust, vision, tonal ramps, names) is the app's own and is
// read in only when the frame is near the window, so the home page does not carry
// it up front.

export const SAMPLE = ['#FF5A1F', '#1A1A1A', '#E6E4DE', '#FFFFFF', '#3A3936']
export const KB_NAMES = { '#FF5A1F': 'Signal', '#1A1A1A': 'Asphalt', '#E6E4DE': 'Concrete', '#FFFFFF': 'White', '#3A3936': 'Soft Asphalt' }
export const ROLES = ['Primary', 'Secondary', 'Accent', 'Subtle', 'Deep']
export const VISIONS = [['normal', 'Normal'], ['protanopia', 'Protanopia'], ['deuteranopia', 'Deuteranopia'], ['tritanopia', 'Tritanopia'], ['achromatopsia', 'Achromatopsia']]

const sign = (v) => (v > 0 ? `+${v}` : String(v))
// The sliders' ranges and centre detents match the full tool's; Temperature also snaps at -50 and 50.
export const ADJ = [
  { k: 'h', label: 'Hue', min: -50, max: 50, snaps: [[0, 4]], fmt: (v) => `${v}°`, text: (v) => `Hue ${v} degrees`, note: (v) => (v ? `Hue ${v} degrees.` : 'Hue as built.') },
  { k: 's', label: 'Saturation', min: -100, max: 100, snaps: [[0, 8]], fmt: (v) => `${sign(v)}%`, text: (v) => `Saturation ${v > 0 ? 'plus ' : v < 0 ? 'minus ' : ''}${Math.abs(v)} percent`, note: (v) => (v ? `Saturation ${sign(v)}%.` : 'Saturation as built.') },
  { k: 'b', label: 'Tone', min: -100, max: 100, snaps: [[0, 8]], fmt: (v) => `${sign(v)}%`, text: (v) => `Tone ${v > 0 ? 'plus ' : v < 0 ? 'minus ' : ''}${Math.abs(v)} percent`, note: (v) => (v ? `Tone ${sign(v)}%.` : 'Tone as built.') },
  { k: 'temp', label: 'Temperature', min: -100, max: 100, snaps: [[-50, 6], [0, 12], [50, 6]], fmt: sign, text: (v) => (v > 0 ? `${v} warmer` : v < 0 ? `${-v} cooler` : '0, as built'), note: (v) => (v > 0 ? `All five, ${v} warmer.` : v < 0 ? `All five, ${-v} cooler.` : 'No change.') },
]
export const TEMP = ADJ[3]

/** A slider value pulled to a detent when it lands inside the detent's radius. */
export function snap(field, v) {
  for (const [at, r] of field.snaps) if (Math.abs(v - at) <= r) return at
  return v
}

// [lightness, chroma, hue offset] for each role.
const PLAN = [[0.52, 0.11, 0], [0.62, 0.13, 30], [0.80, 0.15, -40], [0.94, 0.03, 10], [0.26, 0.04, 0]]

const toLin = (v) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }
const toEnc = (v) => { const c = Math.max(0, Math.min(1, v)); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055 }
const rgbOf = (hex) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255] }
const lum = (hex) => { const [r, g, b] = rgbOf(hex).map((v) => toLin(v)); return 0.2126 * r + 0.7152 * g + 0.0722 * b }
const ratio = (a, b) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05)

function oklchLin(L, C, h) {
  const a = C * Math.cos((h * Math.PI) / 180)
  const b = C * Math.sin((h * Math.PI) / 180)
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s]
}

/** OKLCH to hex, taking chroma down in 0.01 steps until the colour fits in sRGB. */
export function oklchHex(L, C, h) {
  let c = C
  let lin = oklchLin(L, c, h)
  for (let i = 0; i < 40 && lin.some((v) => v < -0.0005 || v > 1.0005); i += 1) { c = Math.max(0, c - 0.01); lin = oklchLin(L, c, h) }
  return `#${lin.map((v) => Math.round(toEnc(v) * 255).toString(16).padStart(2, '0')).join('').toUpperCase()}`
}

/** The OKLCH hue of a hex, in degrees. */
export function hueOf(hex) {
  const [r, g, b] = rgbOf(hex).map((v) => toLin(v))
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  return ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360
}

/** Five colours, one per role, around the hue `H`. Secondary is lifted when it sits too close to Primary. */
export function build(H) {
  const out = PLAN.map(([L, C, off]) => oklchHex(L, C, (H + off + 720) % 360))
  if (ratio(out[0], out[1]) < 1.6) out[1] = oklchHex(PLAN[1][0] + 0.04, PLAN[1][1], (H + PLAN[1][2] + 720) % 360)
  return out
}

/** The new set after Randomise: locked colours stay, the others come from `fresh`. */
export const mix = (colours, locked, fresh) => colours.map((c, i) => (locked[i] ? c : fresh[i]))

/** The status line. `carried`: a move that carries the colours over has been made;
 *  `fresh`: the carry-over line is waiting to be read. */
export function statusLine({ copied, failed, locked, carried, fresh, note, noteIsVision, hexes }) {
  const n = locked.filter(Boolean).length
  if (copied) return failed ? 'Couldn’t copy. Try again.' : `Copied ${hexes[+copied.slice(4)]}.`
  if (n === 5) return 'All locked. Unlock one to randomise.'
  if (!carried) return note && !noteIsVision ? note : n ? 'Locked. Now randomise the rest.' : 'Lock one you like, then randomise.'
  if (fresh) return 'These five colours carry over.'
  return note || (n ? `${n} locked. Randomise changes the rest.` : 'Lock one you like, then randomise.')
}
