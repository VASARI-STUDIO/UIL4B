// The Gradient Generator's preview styles: Grain, Fluted glass, Glow ring, Streak,
// Soft glow and Fade. Each is a real-time CSS render of the person's own stops (see
// GradientFx.jsx); this module is the part that is plain data and string building, so
// the colours a style draws can be checked without a browser.
//
// A style never invents a colour. Every colour it paints comes from the stops, in the
// interpolation space the canvas uses; the only other colours are the neutral grounds
// the styles sit on, which are set in gradient.css.

/** The styles, in switcher order. `as` completes the canvas's spoken name. */
export const PREVIEW_STYLES = [
  { id: 'grain', label: 'Grain', as: ', shown as grain' },
  { id: 'fluted', label: 'Fluted glass', as: ', shown as fluted glass' },
  { id: 'ring', label: 'Glow ring', as: ', shown as a glow ring' },
  { id: 'streak', label: 'Streak', as: ', shown as a streak' },
  { id: 'glow', label: 'Soft glow', as: ', shown as a soft glow' },
  { id: 'fade', label: 'Fade', as: ', shown as a fade' },
]

export const isPreviewStyle = (id) => PREVIEW_STYLES.some((s) => s.id === id)

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
    default: return { '--fx-paint': paint }
  }
}
