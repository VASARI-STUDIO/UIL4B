// The colour-board ref helpers, shared by every surface that renders a
// `.plb-board`.
//
// WHY THIS MODULE EXISTS. `.plb-col`, `.plb-ramp-bar` and their siblings are
// painted from three CSS custom properties — `--plb-c`, `--plb-ink`,
// `--plb-sim` on a column and `--plb-rc` on a ramp bar — rather than from
// inline `style` attributes, which is this codebase's no-inline-styles route
// (the same pattern as TintTool's swatchRef). That means the CLASSES alone are
// not enough to render a board: a consumer also has to know which properties
// to write and what to write into them.
//
// These lived inside PaletteBuilder.jsx while it was the only board. The
// homepage workbench's Palette mode is now a real board too — same classes,
// same properties — and a second private copy of two ref-setters is exactly how
// two boards drift apart one property at a time. One definition, two callers,
// no way for the contract to disagree with itself.
//
// Explicit extension so `node --test` can import this module directly.

/**
 * Paint a `.plb-col`: its colour, the ink that stays legible on it, and the
 * colour-vision-simulated shade for the bottom half of a split column.
 *
 * `sim` defaults to `color`, which is what a surface with no vision-type
 * simulation wants — the split gradient then has the same colour at both stops
 * and the column reads as one flat fill.
 */
export function colRef(color, ink, sim) {
  return (el) => {
    if (!el) return
    el.style.setProperty('--plb-c', color)
    el.style.setProperty('--plb-ink', ink)
    el.style.setProperty('--plb-sim', sim || color)
  }
}

/** Paint one `.plb-ramp-bar` / `.plb-strip-c` / chip with its own colour. */
export function barRef(color) {
  return (el) => { if (el) el.style.setProperty('--plb-rc', color) }
}
