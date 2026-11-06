// Reading the weights a JSX file sets, together with the face that renders them.
//
// Geist is a 300..700 variable face, so a weight outside it is clamped. A
// different face (Archivo for the hero loop's sample brand) has its own axis,
// and a weight set beside an explicit `fontFamily` naming it is not a Geist
// weight. Only a family that is written out as a string literal exempts a
// weight; a computed family, a missing one and any Geist family stay on the
// Geist axis.

const WEIGHT = /fontWeight\s*[:=]\s*["']?(\d{3})["']?/g

/** The span of `text` around `index` that sets one element's text: its style object or its tag. */
function enclosingSpan(text, index, isAttribute) {
  if (isAttribute) {
    const start = text.lastIndexOf('<', index)
    const end = text.indexOf('>', index)
    if (start === -1 || end === -1) return text.slice(Math.max(0, index - 200), index + 200)
    return text.slice(start, end + 1)
  }
  let depth = 0
  let start = 0
  for (let i = index; i >= 0; i--) {
    const c = text[i]
    if (c === '}') depth++
    else if (c === '{') {
      if (depth === 0) { start = i; break }
      depth--
    }
  }
  depth = 0
  let end = text.length
  for (let i = index; i < text.length; i++) {
    const c = text[i]
    if (c === '{') depth++
    else if (c === '}') {
      if (depth === 0) { end = i + 1; break }
      depth--
    }
  }
  return text.slice(start, end)
}

/** The first family named by a string-literal `fontFamily` in `span`, or null. */
function literalFamily(span) {
  const m = span.match(/fontFamily\s*[:=]\s*\{?\s*(["'`])((?:(?!\1).)*)\1/)
  if (!m) return null
  const first = m[2].split(',')[0].trim().replace(/^['"]|['"]$/g, '').trim()
  return first || null
}

/**
 * Every literal fontWeight in already comment-stripped JS/JSX that renders in
 * Geist (or in no face the source names), as numbers.
 */
export function geistWeights(source) {
  const out = []
  for (const m of source.matchAll(WEIGHT)) {
    const isAttribute = /fontWeight\s*=/.test(m[0])
    const family = literalFamily(enclosingSpan(source, m.index, isAttribute))
    if (family && !/^Geist/i.test(family)) continue
    out.push(Number(m[1]))
  }
  return out
}
