// One Phosphor outline, drawn inline at the size the design's icon font drew it.
//
// The design writes `<span class="ph ph-copy" style="font-size:9px">`; a
// Phosphor font glyph occupies a 1em square, so `size` is that font-size and
// the path is Phosphor's own 256-unit outline (see phosphorNav.js for where the
// paths come from and why they are inlined rather than loaded).
export default function PhGlyph({ d, size = 16, className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 256 256"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d={d} />
    </svg>
  )
}
