import { GLYPHS } from './workspaceGlyphs'

// One Phosphor glyph, sized in pixels the way the design sizes its icon font
// (`font-size:15px` on a `.ph` span draws a 15px square). Always decorative:
// every control that carries one also carries a text label or an aria-label.
export default function Glyph({ name, size = 16, className }) {
  const d = GLYPHS[name]
  if (!d) return null
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 256 256"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d={d} />
    </svg>
  )
}
