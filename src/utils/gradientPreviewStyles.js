// The Gradient Generator’s fill styles and object scenes render the person’s
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
  { id: 'orb', label: 'Orb', as: ', shown as a gradient orb' },
  { id: 'aperture', label: 'Aperture', as: ', shown through an optical aperture' },
  { id: 'satin', label: 'Satin', as: ', shown on satin' },
  { id: 'folds', label: 'Folded paper', as: ', shown on folded paper' },
  { id: 'halftone', label: 'Halftone', as: ', shown as halftone ink' },
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
  ...['mesh', 'orb', 'aperture', 'satin', 'folds', 'halftone', 'grain', 'fluted', 'ring', 'streak', 'glow', 'fade', 'waves'].map((id) => PREVIEW_STYLES.find((s) => s.id === id)),
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
export const FIXED_SHAPE_STYLES = ['orb', 'aperture', 'streak', 'glow', 'fade', 'mesh', 'waves']

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
export function styleVars(id, { stops, paint, oklch, layout }) {
  switch (id) {
    case 'orb': {
      const [point] = artworkPoints(id, stops, oklch, layout)
      return {
        '--fx-x': `${point.x}%`, '--fx-y': `${point.y}%`, '--fx-diameter': `${point.size}cqmin`,
        '--fx-orb-paint': [
          'radial-gradient(ellipse 70% 57% at 29% 18%, rgb(255 255 255 / .61), transparent 68%)',
          'radial-gradient(ellipse at 38% 32%, transparent 37%, rgb(8 9 18 / .42) 75%, rgb(255 255 255 / .23) 96%)',
          `radial-gradient(ellipse at 33% 26%${oklch ? ' in oklch' : ''}, ${stopList(stops)})`,
        ].join(', '),
      }
    }
    case 'aperture': return { '--fx-spectrum': stopList(stops), '--fx-space': oklch ? 'in oklch' : 'in srgb' }
    case 'streak': return { '--fx-row': linearThrough(90, stops, oklch) }
    case 'fade': return { '--fx-wash': linearThrough(180, stops, oklch) }
    case 'glow': {
      const c = glowColours(stops)
      return { '--fx-heart': c.heart, '--fx-low': c.low, '--fx-high': c.high }
    }
    case 'mesh': return { '--fx-ground': meshGround(stops), '--fx-mesh': meshBackground(artworkPoints(id, stops, oklch, layout)) }
    default: return { '--fx-paint': paint }
  }
}

/** Where along the ramp the Spec card samples its strip, in percent. */
export const SPEC_POSITIONS = [0, 25, 50, 75, 100]
/**
 * How many hexes the Spec card's list holds on one line, the "+N" counted as one, until the card
 * has been laid out and measured (GradientText.jsx sizes it from the real line). Five, so a
 * five-stop gradient shows every hex and "+N" is only ever a real overflow.
 */
export const SPEC_HEX_ROOM = 5
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
export const MESH_TABLE = [[-6, 14], [88, 96], [66, 8], [12, 92], [49, 65]]
// Elliptical pools can cross the crop. Each holds a solid centre and feathers at its own rate.
const MESH_POOLS = [[95, 104, 25], [80, 70, 22], [68, 83, 16], [68, 61, 26], [70, 50, 14]]
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

export const isArtwork = id => id === 'mesh' || id === 'orb'

// Store only geometry. Colours continue to come from the current gradient.
export function cleanLayout(kind, raw) {
  if (!isArtwork(kind) || !Array.isArray(raw)) return []
  const limit = kind === 'orb' ? 1 : MESH_TABLE.length
  const bounded = (value, low, high) => Math.max(low, Math.min(high, Math.round(value)))
  return raw.slice(0, limit).map(point => {
    if (!point || ![point.x, point.y, point.size].every(Number.isFinite)) return null
    return { x: bounded(point.x, -10, 110), y: bounded(point.y, -10, 110), size: bounded(point.size, 20, 160) }
  })
}

export function artworkPoints(kind, stops, oklch, layout) {
  const base = kind === 'orb'
    ? [{ x: 50, y: 50, color: byPosition(stops)[0].color, size: 74 }]
    : meshPoints(stops, oklch).map(p => ({ ...p, size: 100 }))
  const clean = cleanLayout(kind, layout)
  return base.map((point, i) => ({ ...point, ...clean[i] }))
}

export const meshBackground = (points) => points.map((p, index) => {
  const [width, height, core] = MESH_POOLS[index]
  const scale = (p.size ?? 100) / 100
  return `radial-gradient(ellipse ${Math.round(width * scale)}% ${Math.round(height * scale)}% at ${p.x}% ${p.y}%, ${p.color} 0 ${core}%, transparent 100%)`
}).join(', ')

// A responsive CSS background for sites. The PNG also includes the grain layer.
export function meshCss(stops, oklch, layout) {
  const vars = styleVars('mesh', { stops, oklch, layout })
  return `background-color: ${vars['--fx-ground']};\nbackground-image: ${vars['--fx-mesh']};`
}

// Apply the class to an empty element. Its aspect ratio can be set by the host layout.
export function orbCss(stops, oklch, layout) {
  const vars = styleVars('orb', { stops, oklch, layout })
  return `.orb-field {
  position: relative;
  container-type: size;
  aspect-ratio: 16 / 9;
  overflow: hidden;
}
.orb-field::before {
  content: "";
  position: absolute;
  left: ${vars['--fx-x']};
  top: ${vars['--fx-y']};
  width: ${vars['--fx-diameter']};
  aspect-ratio: 1;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: ${vars['--fx-orb-paint']};
}`
}

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
  email: 'mel@offcut.example',
  label: 'Email',
  button: 'Continue',
  link: 'Create an account',
}

/** The App icon: Tenner's "T", and the part of the icon (fractions of its side) the glyph's ink is chosen over. */
export const ICON_GLYPH = 'T'
export const ICON_INK_BOX = { x: 0.25, y: 0.25, w: 0.5, h: 0.5 }
