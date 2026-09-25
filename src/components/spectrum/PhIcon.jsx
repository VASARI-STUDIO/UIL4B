import { PH_REGULAR } from './phosphorRegular'

// One Phosphor glyph, drawn inline from the path data in phosphorRegular.js
// (or a `body` the caller already holds, for the other four weights).
//
// The design writes `<span class="ph ph-palette" style="font-size:16px">`
// against the Phosphor icon font. This is the same glyph at the same box: the
// <svg> is 1em square (see `.sp-ph` in spectrum.css), so `font-size` sizes it
// exactly as the font did, and it inherits `currentColor` the same way.
//
// The path data is our own generated module, never user input, which is why
// inlining it is safe here. `box` is the source set's own grid: 256 for
// Phosphor, 24 for the other packs on the Discover shelf.
export default function PhIcon({ name, body, box = 256, className = '', style }) {
  const d = body || PH_REGULAR[name]
  if (!d) return null
  return (
    <svg
      className={`sp-ph ${className}`.trim()}
      viewBox={`0 0 ${box} ${box}`}
      aria-hidden="true"
      focusable="false"
      style={style}
      dangerouslySetInnerHTML={{ __html: d }}
    />
  )
}
