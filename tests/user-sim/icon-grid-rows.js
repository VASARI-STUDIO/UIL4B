// The signed-out icon grid is cut to whole rows: 60 icons rounded up to a
// multiple of the column count, and rounded down instead once that would pass
// 72. Written out here on purpose, separately from src/data/iconPackTiers.js,
// so a spec that compares the two catches either one drifting.
export const ANON_BASE = 60
export const ANON_CEILING = 72

/** How many icons a signed-out grid of `cols` columns holds. */
export function wholeRowCount(cols) {
  const up = Math.ceil(ANON_BASE / cols) * cols
  return up <= ANON_CEILING ? up : Math.floor(ANON_CEILING / cols) * cols
}

/** The live column count of the icon grid, read off its resolved template. */
export function gridColumns(page) {
  return page.locator('.ig').evaluate((grid) => getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length)
}
