// Which rows of the Palette, Gradient and Prompt libraries are free, and what a
// locked row may show — in ONE place, read by the three pages, by the Palette
// Builder, and by the server-side tooling that builds the free bundle.
//
// WHY THIS IS A MODULE AND NOT THREE INLINE LAMBDAS. The free set is "the first
// N eligible rows of the canonical library", so the answer depends on two
// things: the eligibility rule (`isOpen`) and the cap (GALLERY_TIER_LIMITS).
// The pages used to carry their own copy of the rule. Now that the Pro rows are
// not in the browser at all, the browser's copy of the library is built FROM
// this rule (scripts/library/clientRows.js), and the pages read it back from
// here, so the rows that ship and the rows the page treats as open cannot be
// two different lists. tests/unit/pro-library-server-only.test.js recomputes the
// split from the server data with the page's own splitLockedLibrary and fails
// if src/data disagrees.
//
// A row in the browser is one of two shapes:
//   full  the whole record, for a row a free account may open.
//   stub  { id, name | tags, slots, ...flag } — only what `isOpen` and the
//         locked tease need. A stub has no `colors`, `stops` or `text`.
// `isOpen` must give the same answer for a stub as for the full record, which is
// why the flag (`pro` on a palette, `free` on a prompt) is kept on the stub.

/** The three libraries that hand over a copyable payload. */
export const LIBRARY_KINDS = Object.freeze(['palettes', 'gradients', 'prompts'])

/** How many values a row holds — a count, never the values. */
export function rowSlots(row) {
  if (Array.isArray(row?.colors)) return row.colors.length
  if (Array.isArray(row?.stops)) return row.stops.length
  return Number(row?.slots) || 0
}

/** Is this row a stub (a Pro row with its payload withheld)? */
export function isStub(row) {
  return !(Array.isArray(row?.colors) || Array.isArray(row?.stops) || typeof row?.text === 'string')
}

const tagList = (tags) => (tags ? String(tags).split(',').map((t) => t.trim().toLowerCase()).filter(Boolean) : [])

export const LIBRARY_RULES = Object.freeze({
  // Curated palettes carry no flag and brands carry `pro`; the library cap then
  // decides how many of the eligible rows a tier gets.
  palettes: Object.freeze({
    isOpen: (palette) => palette.pro !== true,
    preview: (palette) => ({ id: palette.id, label: palette.name, slots: rowSlots(palette) }),
  }),
  // No per-row flag: the cap is the whole gate.
  gradients: Object.freeze({
    isOpen: () => true,
    preview: (gradient) => ({ id: gradient.id, label: gradient.name, slots: rowSlots(gradient) }),
  }),
  // `free` must be exactly true. A prompt added without the flag is locked.
  // No label: a prompt's title is the idea being sold. `slots` is the card's
  // shape (three lines), not a measurement of the withheld text.
  prompts: Object.freeze({
    isOpen: (prompt) => prompt.free === true,
    preview: (prompt) => ({ id: prompt.id, tags: tagList(prompt.tags).slice(0, 2), slots: 3 }),
  }),
  // The Palette Builder's Brands panel: its own flag, no tier cap.
  brands: Object.freeze({
    isOpen: (brand) => brand.free === true,
    preview: (brand) => ({ id: brand.id, label: brand.name, slots: rowSlots(brand) }),
  }),
})
