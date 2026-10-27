import { BASES, FONTS, HARMONIES, ICONS, ICON_WEIGHTS } from './spectrumKit.js'

// The rail's second line at 1001px and up: what each tool window holds right now.
// One pure function, so the strings are tested without a browser. Nothing here is
// typed as a fact: every part is read off the state the windows already own.

const FORMAT_WORDS = { WEBP: 'WebP', JPEG: 'JPEG', PNG: 'PNG' }

/** "92% smaller as WebP". Before the converter has been near the screen it reads
 *  "Not measured yet"; "Measuring…" is only while a figure is on its way; a file
 *  that would not decode reads "File not supported". */
export function converterSummary(result) {
  if (result?.failed) return 'File not supported'
  if (!result || result.pct == null) return result?.measuring ? 'Measuring…' : 'Not measured yet'
  const { pct, format } = result
  const word = FORMAT_WORDS[format] || format
  if (pct < 0) return `${-pct}% larger as ${word}`
  if (pct === 0) return format === 'PNG' ? 'Lossless PNG' : `Same size as ${word}`
  return `${pct}% smaller as ${word}`
}

/** The icon window's code peek: the first three lines of the snippet that Copy
 *  puts on the clipboard. A standalone SVG is one long line, so for the peek only
 *  it breaks before its width, viewBox, fill and id attributes; each line is cut
 *  with an ellipsis by the stylesheet. Always three entries, so the box never
 *  changes height. */
export function peekLines(snippet) {
  const lines = snippet
    .replace(/ (id|width|viewBox|fill)=/g, '\n  $1=')
    .split('\n')
    .slice(0, 3)
  while (lines.length < 3) lines.push('')
  return lines
}

/** The four summary lines, in rail order: Palette, Icons, Fonts, Converter. */
export function railSummary({ base, harmony, icon, weight, size, font, result }) {
  const seed = BASES[base] || BASES[0]
  const pick = ICONS.find(([slug]) => slug === icon) || ICONS[0]
  const spec = FONTS[font] || FONTS[0]
  return [
    `${seed.label}, ${HARMONIES[harmony][0].toLowerCase()}`,
    `${pick[1]}, ${ICON_WEIGHTS[weight][0].toLowerCase()}, ${size}px`,
    `${spec.name} with ${spec.pair}`,
    converterSummary(result),
  ]
}
