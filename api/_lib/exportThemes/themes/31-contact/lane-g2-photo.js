// Theme 31, Contact sheet, lane g2: where a logo can sit on the brand's own photographs, measured rather than guessed.
// Imported by lane-g2.js (the lane loader skips lane-g2-*.js). The engine measures each brand photograph in a browser when this module loads.
// The server has no browser and no photographs (its pictures are neutral plates), so nothing is measured: `grids` stays empty and the logo
// pages use their fallback corner. The luminance statistics are kept for a build that does hold a measurement.
export const GW = 150, GH = 100;   // the luminance grid, 3:2 like every print on these pages

// slug -> { shotId: luminance grid }; empty on the server
export const grids = {};

// luminance statistics of a box given in print pixels on a print of width pw (3:2)
export function boxStats(grid, pw, x, y, w, h) {
  const k = GW / pw, x0 = Math.max(0, Math.floor(x * k)), y0 = Math.max(0, Math.floor(y * k)), x1 = Math.min(GW, Math.ceil((x + w) * k)), y1 = Math.min(GH, Math.ceil((y + h) * k));
  const v = [];
  for (let j = y0; j < y1; j++) for (let i = x0; i < x1; i++) v.push(grid[j * GW + i]);
  v.sort((a, b) => a - b);
  const mean = v.reduce((s, a) => s + a, 0) / v.length, sd = Math.sqrt(v.reduce((s, a) => s + (a - mean) ** 2, 0) / v.length);
  return { mean, sd, p05: v[Math.floor(v.length * 0.05)], p95: v[Math.min(v.length - 1, Math.floor(v.length * 0.95))] };
}
