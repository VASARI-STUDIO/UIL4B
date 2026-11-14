// The colours the Booking, Order email, Sales report and Brand scenes share:
// the ink for type set on a brand fill, the edge for a fill that would melt
// into the page, and a brand colour set as link text. Worked out per palette
// and mode, never assumed, so a pale primary still reads and a near-canvas
// accent still shows its shape.
import { brandAsText, fieldEdge, inkOnField } from '../../../utils/palettePreviewRoles.js'

/**
 * @param {object} r derivePaletteRoles() output
 * @returns {{vars: Record<string, string>, linkAdjusted: boolean, deepAdjusted: boolean}}
 */
export function fieldInks(r) {
  const grounds = { text: r.text, canvas: r.canvas }
  const link = brandAsText(r.secondary, [r.canvas, r.surface])
  const deepText = brandAsText(r.deep, [r.canvas, r.surface])
  return {
    vars: {
      '--fi-ink': inkOnField(r.primary, { on: r.onPrimary, ...grounds }).hex,
      '--fi-edge': fieldEdge(r.primary, r.canvas, r.borderStrong),
      '--fi-sub-ink': inkOnField(r.subtle, { on: r.onSubtle, ...grounds }).hex,
      '--fi-deep-ink': inkOnField(r.deep, { on: r.onDeep, ...grounds }).hex,
      '--fi-sec-ink': inkOnField(r.secondary, { on: r.onSecondary, ...grounds }).hex,
      '--fi-acc-ink': inkOnField(r.accent, { on: r.onAccent, ...grounds }).hex,
      '--fi-acc-edge': fieldEdge(r.accent, r.canvas, r.borderStrong),
      '--fi-sec-edge': fieldEdge(r.secondary, r.canvas, r.borderStrong),
      '--fi-sub-edge': fieldEdge(r.subtle, r.canvas, r.borderStrong),
      '--fi-deep-edge': fieldEdge(r.deep, r.canvas, r.borderStrong),
      '--fi-link': link.hex,
      '--fi-deep-text': deepText.hex,
    },
    linkAdjusted: link.adjusted,
    deepAdjusted: deepText.adjusted,
  }
}
