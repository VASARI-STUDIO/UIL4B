// What the customiser says while a viewer who is not Pro previews a Pro setting: which upgrade
// gate the Upgrade button opens, the one preview line, and the proof caption in the upgrade popup.
// DOM-free so the wording is testable on its own.

import { isProSize } from './iconSize.js'
import { isProLineStyle, lineStyleOf } from './iconLineStyle.js'

/** The gate names the Upgrade to Pro button reports under. */
export const GATE_LINE_STYLE = 'icon-line-style'
export const GATE_EXPORT_SIZE = 'icon-export-size'
export const GATE_BOTH = 'icon-pro-preview'

/** Said once through the live region when the last Pro setting goes. */
export const BACK_TO_FREE_NOTE = 'Back to free settings. Copy, download and save are on.'

const TAIL = 'saving and export need Pro.'

/**
 * What the viewer is previewing, or null when nothing Pro is on screen (always null for Pro).
 *   gate     which upgrade popup the Upgrade button opens
 *   style    the Pro line style's name: "Sharp", "Crisp", or "Custom ends and corners" (null if none)
 *   size     the Pro export size in pixels (null if none)
 *   parts    the preview line: strings, and { code } for a literal value (set in mono)
 *   text     the same line as plain text, for the live region and aria-describedby
 *   caption  the proof caption under the picture in the upgrade popup, same shape as `parts`
 */
export function proPreview({ isPro, size, cap, join }) {
  if (isPro) return null
  const sizePro = isProSize(size)
  const linePro = isProLineStyle(cap, join)
  if (!sizePro && !linePro) return null

  const tile = lineStyleOf(cap, join)
  const style = linePro ? (tile ? tile.name : 'Custom ends and corners') : null

  let parts
  let caption
  if (linePro && sizePro) {
    parts = [`${style} and custom sizes are Pro. Preview them here; ${TAIL}`]
    caption = [`${style}, `, { code: `${size}px` }]
  } else if (sizePro) {
    parts = ['Custom sizes are Pro. Preview ', { code: `${size}px` }, ` here; ${TAIL}`]
    caption = ['Exports at ', { code: `${size}px` }]
  } else if (tile) {
    parts = [`${style} is a Pro line style. Preview it here; ${TAIL}`]
    caption = [style]
  } else {
    parts = [`Custom ends and corners are Pro. Preview them here; ${TAIL}`]
    caption = [style]
  }

  const flat = (list) => list.map((p) => (typeof p === 'string' ? p : p.code)).join('')
  return {
    gate: linePro && sizePro ? GATE_BOTH : sizePro ? GATE_EXPORT_SIZE : GATE_LINE_STYLE,
    style,
    size: sizePro ? size : null,
    parts,
    text: flat(parts),
    caption,
  }
}
