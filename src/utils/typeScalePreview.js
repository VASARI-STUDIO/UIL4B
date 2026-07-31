export const TYPE_PREVIEW_MIN_PX = 8
export const TYPE_PREVIEW_MAX_PX = 96

// Token maths remains exact. Only the rendered specimen is bounded so an
// intentionally extreme scale cannot create a multi-megabyte layout or make
// the controls unreachable.
export function fitTypePreviewSize(px, {
  min = TYPE_PREVIEW_MIN_PX,
  max = TYPE_PREVIEW_MAX_PX,
} = {}) {
  const value = Number(px)
  if (!Number.isFinite(value)) return min
  return Math.round(Math.max(min, Math.min(max, value)) * 100) / 100
}

export function typePreviewNeedsFitting(steps, options) {
  return steps.some(step => fitTypePreviewSize(step.px, options) !== step.px)
}
