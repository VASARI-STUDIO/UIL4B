// Icon drawings from a third party (Iconify) are drawn inline, so each body is
// checked before it reaches the page. Only plain <path> elements pass, optionally
// inside the single <g fill="currentColor"> wrapper the duotone weight uses, and
// each path may carry only a drawing (d), a currentColor fill and an opacity.
// The result is rebuilt from the parsed values, so nothing the source sent
// beyond those survives.

const WRAPPER = /^<g fill="currentColor">([\s\S]*)<\/g>$/
const PATH = /<path((?:\s+[a-z-]+="[^"<>]*")+)\s*\/>/g
const ATTR = /([a-z-]+)="([^"<>]*)"/g
const DRAWING = /^[MmLlHhVvCcSsQqTtAaZz0-9eE.,+\-\s]+$/
const OPACITY = /^(0?\.\d{1,2}|1)$/
const MAX_PATHS = 8
const MAX_DRAWING = 8000

/** The body rebuilt as plain paths, or '' when it holds anything else. */
export function safeBody(body) {
  if (typeof body !== 'string' || body.length > MAX_DRAWING * MAX_PATHS) return ''
  const wrapped = WRAPPER.exec(body.trim())
  const inner = wrapped ? wrapped[1] : body.trim()
  const paths = []
  let end = 0
  for (const m of inner.matchAll(PATH)) {
    if (m.index !== end) return ''
    end = m.index + m[0].length
    let d = ''
    let opacity = ''
    for (const [, name, value] of m[1].matchAll(ATTR)) {
      if (name === 'd') d = value
      else if (name === 'opacity') opacity = value
      else if (!(name === 'fill' && value === 'currentColor')) return ''
    }
    if (!d || d.length > MAX_DRAWING || !DRAWING.test(d)) return ''
    if (opacity && !OPACITY.test(opacity)) return ''
    paths.push(`<path d="${d}"${opacity ? ` opacity="${opacity}"` : ''}/>`)
  }
  if (!paths.length || paths.length > MAX_PATHS || end !== inner.length) return ''
  return paths.join('')
}
