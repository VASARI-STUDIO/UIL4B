// The Gradient Generator's preview styles: Grain, Fluted glass, Glow ring, Streak,
// Soft glow, Fade, Poster, Spec card, Mesh, Waves, App icon and Phone. Each is a real-time CSS render of the person's
// own stops (see GradientFx.jsx); this module is the part that is plain data and string
// building, so the colours a style draws can be checked without a browser.
//
// A style never invents a colour. Every colour it paints comes from the stops, in the
// interpolation space the canvas uses; the only other colours are the neutral grounds
// the styles sit on, which are set in gradient.css.
import { colourAt } from './gradientScore.js'
import { hexToOklchRaw } from '../components/tool/oklch.js'

/** The styles, in switcher order. `as` completes the canvas's spoken name. */
export const PREVIEW_STYLES = [
  { id: 'grain', label: 'Grain', as: ', shown as grain' },
  { id: 'fluted', label: 'Fluted glass', as: ', shown as fluted glass' },
  { id: 'ring', label: 'Glow ring', as: ', shown as a glow ring' },
  { id: 'streak', label: 'Streak', as: ', shown as a streak' },
  { id: 'glow', label: 'Soft glow', as: ', shown as a soft glow' },
  { id: 'fade', label: 'Fade', as: ', shown as a fade' },
  { id: 'poster', label: 'Poster', as: ', shown as a poster' },
  { id: 'spec', label: 'Spec card', as: ', shown as a spec card' },
  { id: 'mesh', label: 'Mesh', as: ', shown as a mesh' },
  { id: 'waves', label: 'Waves', as: ', shown as waves' },
  { id: 'icon', label: 'App icon', as: ', shown as an app icon' },
  { id: 'phone', label: 'Phone', as: ', shown as a phone screen' },
]

export const isPreviewStyle = (id) => PREVIEW_STYLES.some((s) => s.id === id)

// The switch has two tiers. A PLACE is where the gradient is shown (the canvas itself,
// a hero, a card, a button, a poster, a spec card, an app icon, a phone). A FILL STYLE
// is how the canvas's fill is drawn, and only means something while the place is Fill.
// Picking any other place sets the fill style aside; coming back to Fill brings it back.

/** The fill styles, in picker order. Plain is the canvas as it is. */
export const FILL_STYLES = [
  { id: 'plain', label: 'Plain', as: '' },
  ...['grain', 'fluted', 'ring', 'streak', 'glow', 'fade', 'mesh', 'waves'].map((id) => PREVIEW_STYLES.find((s) => s.id === id)),
]
export const isFillStyle = (id) => FILL_STYLES.some((s) => s.id === id)

/** The places, in switcher order. Fill first; the four object scenes last. */
export const PREVIEW_PLACES = [
  { id: 'fill', label: 'Fill', as: '' },
  { id: 'hero', label: 'Hero', as: ', shown as a hero' },
  { id: 'card', label: 'Card', as: ', shown as a card' },
  { id: 'button', label: 'Button', as: ', shown as a button' },
  ...['poster', 'spec', 'icon', 'phone'].map((id) => PREVIEW_STYLES.find((s) => s.id === id)),
]
export const isPreviewPlace = (id) => PREVIEW_PLACES.some((p) => p.id === id)

/** Fill styles that draw their own shape, so the gradient's Type and Angle don't change them. */
export const FIXED_SHAPE_STYLES = ['streak', 'glow', 'fade', 'mesh', 'waves']

/** The one id the stage renders: the place, or under Fill the fill style ('fill' when Plain). */
export function previewId(place, fill) {
  if (place !== 'fill') return place
  return fill && fill !== 'plain' && isFillStyle(fill) ? fill : 'fill'
}

/**
 * A stored preview id read back as { place, fill }. Ids saved before the split (one flat
 * list, 'grain' meaning Fill drawn as grain) land on Fill with that style; anything
 * unknown falls back to Fill, Plain.
 */
export function splitPreview(stored, storedFill) {
  const fill = isFillStyle(storedFill) ? storedFill : 'plain'
  if (isPreviewPlace(stored)) return { place: stored, fill }
  if (isFillStyle(stored)) return { place: 'fill', fill: stored }
  return { place: 'fill', fill }
}

/** The styles whose words or objects are set in a text layer drawn after the effects layer (GradientText.jsx). */
export const TEXT_STYLES = ['poster', 'spec', 'icon', 'phone']
export const isTextStyle = (id) => TEXT_STYLES.includes(id)

/** The Poster's words: the Shallow End brand's own name, primary line and sample caption. */
export const POSTER_COPY = {
  brand: 'Shallow End',
  display: 'Lessons that fit after school.',
  footer: 'Pool 2, Sandy Bay. Tuesdays at 4:15.',
}

const byPosition = (stops) => [...stops].sort((a, b) => a.position - b.position)

/** "#AAA 0%, #BBB 100%": the stops as a gradient's colour list, in position order. */
export function stopList(stops) {
  return byPosition(stops).map((s) => `${s.color.toUpperCase()} ${Math.round(s.position)}%`).join(', ')
}

/** A linear gradient along `deg` through the stops, interpolated in OKLCH when asked. */
export function linearThrough(deg, stops, oklch) {
  return `linear-gradient(${deg}deg${oklch ? ' in oklch' : ''}, ${stopList(stops)})`
}

/**
 * The three colours Soft glow mixes: the first stop at the heart, the middle stop low
 * and to the left, the last stop high and to the right. Two stops give the heart the
 * first and both flanks the last.
 */
export function glowColours(stops) {
  const sorted = byPosition(stops).map((s) => s.color.toUpperCase())
  const first = sorted[0]
  const last = sorted[sorted.length - 1]
  const middle = sorted.length > 2 ? sorted[Math.floor(sorted.length / 2)] : last
  return { heart: first, low: middle, high: last }
}

/**
 * The custom properties a style reads, as an object for a `style` prop.
 * `paint` is the canvas's own gradient (its type, angle and space), used by the styles
 * that show the gradient as the canvas draws it; Streak and Fade lay the same stops
 * along their own axis (across for Streak, down for Fade) because their look needs it.
 */
export function styleVars(id, { stops, paint, oklch }) {
  switch (id) {
    case 'streak': return { '--fx-row': linearThrough(90, stops, oklch) }
    case 'fade': return { '--fx-wash': linearThrough(180, stops, oklch) }
    case 'glow': {
      const c = glowColours(stops)
      return { '--fx-heart': c.heart, '--fx-low': c.low, '--fx-high': c.high }
    }
    case 'mesh': return { '--fx-ground': meshGround(stops), '--fx-mesh': meshBackground(meshPoints(stops, oklch)) }
    default: return { '--fx-paint': paint }
  }
}

/** Where along the ramp the Spec card samples its strip, in percent. */
export const SPEC_POSITIONS = [0, 25, 50, 75, 100]
/** How many hexes the Spec card's list holds on one line, the "+N" counted as one. */
export const SPEC_HEX_ROOM = 4
/** Under this many stops the strip holds colours between the stops, and the card says so. */
export const SPEC_FULL_STOPS = 5

/** The five colours of the Spec card's strip: the ramp at 0, 25, 50, 75 and 100%, blended as the canvas blends (`oklch`, else sRGB). */
export function specStrip(stops, oklch = true) {
  const ramp = byPosition(stops)
  return SPEC_POSITIONS.map((pos) => colourAt(ramp, pos, oklch ? 'oklch' : 'srgb'))
}

/** The stops' hexes in position order, upper-case. */
export const specHexes = (stops) => byPosition(stops).map((s) => s.color.toUpperCase())

/** `hexes` cut to what fits one line: all of them, or `room - 1` and the count left over as "+N". */
export function fitHexes(hexes, room = SPEC_HEX_ROOM) {
  if (hexes.length <= room) return [...hexes]
  const shown = hexes.slice(0, room - 1)
  return [...shown, `+${hexes.length - shown.length}`]
}

/** "Linear 135° · OKLCH", "Radial · sRGB", "Conic 90° · OKLCH". */
export function specTypeLine(type, angle, oklch) {
  const turn = type === 'Radial' ? '' : ` ${Math.round(angle)}°`
  return `${type}${turn} · ${oklch ? 'OKLCH' : 'sRGB'}`
}

/** The line under the strip. Only a gradient with fewer than five stops has one. */
export const specSampledNote = (stops) => (stops.length < SPEC_FULL_STOPS ? 'Sampled at 0, 25, 50, 75 and 100%' : null)

/** The card's name: the saved project's, else the type's plain name (as the save field opens with). */
export const specName = (savedName, type) => String(savedName ?? '').trim() || `${type} gradient`

/** Where the Mesh's soft points sit, as [x, y] percent of the stage. A fixed table, never noise. */
export const MESH_TABLE = [[20, 24], [80, 20], [52, 56], [18, 84], [84, 80]]
/** How far each Mesh point's colour reaches before it is clear. */
export const MESH_REACH = '58cqmax'
/** The ramp positions the Mesh samples when there are more stops than points, in percent. */
export const MESH_POSITIONS = [0, 25, 50, 75, 100]

/**
 * The Mesh's points as { x, y, color }: one per stop in position order, up to five. With more
 * stops the ramp is sampled at 0, 25, 50, 75 and 100%, blended as the canvas blends (`oklch`, else sRGB).
 */
export function meshPoints(stops, oklch = true) {
  const ramp = byPosition(stops)
  const colours = ramp.length > MESH_TABLE.length
    ? MESH_POSITIONS.map((pos) => colourAt(ramp, pos, oklch ? 'oklch' : 'srgb'))
    : ramp.map((s) => s.color.toUpperCase())
  return colours.map((color, i) => ({ x: MESH_TABLE[i][0], y: MESH_TABLE[i][1], color }))
}

/** The Mesh's ground: the stop with the lowest OKLCH lightness (ties: the earlier stop by position). */
export function meshGround(stops) {
  return byPosition(stops).reduce((low, s) => (hexToOklchRaw(s.color)[0] < hexToOklchRaw(low.color)[0] ? s : low)).color.toUpperCase()
}

/** The Mesh's points as one `background` value: a soft circle of colour at each point, the first on top. */
export const meshBackground = (points) => points.map((p) => `radial-gradient(circle at ${p.x}% ${p.y}%, ${p.color} 0, transparent ${MESH_REACH})`).join(', ')

/** How many bands the Waves draw, how tall a crest is (percent of the height) and how far each band's phase steps (degrees). */
export const WAVE_COUNT = 7
export const WAVE_AMPLITUDE = 4
export const WAVE_PHASE_STEP = 51.4
const WAVE_SAMPLES = 200

/** The Waves' seven band colours: the ramp at k/6 for k = 0..6, blended as the canvas blends. */
export function waveBands(stops, oklch = true) {
  const ramp = byPosition(stops)
  return Array.from({ length: WAVE_COUNT }, (_, k) => colourAt(ramp, (k / (WAVE_COUNT - 1)) * 100, oklch ? 'oklch' : 'srgb'))
}

const round2 = (n) => Math.round(n * 100) / 100

/**
 * Band k's outline in a 100 x 100 box: its top edge is one sine period across the width, sitting at
 * k/7 of the height and shifted k x 51.4 degrees, and it runs down to the bottom. Band 0 is a flat fill.
 */
export function wavePath(k) {
  if (k === 0) return 'M0 0H100V100H0Z'
  const top = (k / WAVE_COUNT) * 100
  const phase = (k * WAVE_PHASE_STEP * Math.PI) / 180
  const edge = Array.from({ length: WAVE_SAMPLES + 1 }, (_, i) => {
    const x = (i / WAVE_SAMPLES) * 100
    return `${round2(x)} ${round2(top + WAVE_AMPLITUDE * Math.sin((x / 100) * 2 * Math.PI + phase))}`
  })
  return `M${edge.join('L')}V100H0Z`
}

/** How many hexes the Mesh and Waves caption lists before "+N" on viewports under 1024px. */
export const CAPTION_NARROW_HEXES = 3

/** The Phone's button fill: the stop with the highest OKLCH chroma (ties: the earlier stop by position). */
export function phoneButton(stops) {
  return byPosition(stops).reduce((top, s) => (hexToOklchRaw(s.color)[1] > hexToOklchRaw(top.color)[1] ? s : top)).color.toUpperCase()
}

/** The Phone's words: Offcut's own primary line, then the sign-in form. */
export const PHONE_COPY = {
  line: 'Quote on site. Paid by Friday.',
  heading: 'Sign in to Offcut',
  label: 'Email',
  button: 'Continue',
  link: 'Create an account',
}

/** The App icon: Tenner's "T", and the part of the icon (fractions of its side) the glyph's ink is chosen over. */
export const ICON_GLYPH = 'T'
export const ICON_INK_BOX = { x: 0.25, y: 0.25, w: 0.5, h: 0.5 }
