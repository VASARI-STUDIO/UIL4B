export const FONT_PROBE = 'mmmmmwwwwwlli0O'
export const GENERIC_FONT_BASELINES = ['monospace', 'serif', 'sans-serif']

// Valid multi-baseline detection compares `"Target", generic` with that same
// generic. A loaded target differs from every baseline; an unloaded target
// matches every baseline. Mixed evidence is inconclusive.
export function detectCanvasFontRendered(ctx, family, weight = 400) {
  if (!ctx?.measureText) return null
  let differences = 0

  try {
    for (const generic of GENERIC_FONT_BASELINES) {
      ctx.font = `${weight} 72px ${generic}`
      const baselineWidth = ctx.measureText(FONT_PROBE).width
      ctx.font = `${weight} 72px "${family}", ${generic}`
      const targetWidth = ctx.measureText(FONT_PROBE).width
      if (!Number.isFinite(baselineWidth) || !Number.isFinite(targetWidth)) return null
      if (Math.abs(targetWidth - baselineWidth) > 0.5) differences += 1
    }
  } catch {
    return null
  }

  if (differences === GENERIC_FONT_BASELINES.length) return true
  if (differences === 0) return false
  return null
}
