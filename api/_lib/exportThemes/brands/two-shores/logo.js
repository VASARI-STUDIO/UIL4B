// Two Shores' logo: the name leaves a wake. Everything is set in x, the stroke of the wake: cap height = 10x, the wake band sits 2x below
// the baseline, is 2x tall (swing x + stroke x), repeats every 6x and is cut square at both ends. The symbol is T and S on the same wake.
// The wake is a filled ribbon (the engine draws fills only): a parabolic wave offset by x/2 each side, clipped to [0, width].
export default function twoShoresLogo({ brand, font, outline, capHeight }) {
  const size = 100, cap = capHeight(font, size), x = cap / 10;
  const word = (t) => outline(font, t, size, 0);
  const wake = (w, y0) => {
    const half = 3 * x, A = x / 2, N = 16, pts = [];
    for (let k = -2; k * half <= w + 2 * half; k++) for (let i = 0; i < N; i++) {
      const t = i / N, px = (k + t) * half, s = k % 2 === 0 ? 1 : -1;
      pts.push([px, s * 4 * A * t * (1 - t), s * 4 * A * (1 - 2 * t)]); // x, centre y, slope
    }
    const up = [], dn = [];
    for (const [px, py, sl] of pts) { const n = Math.hypot(1, sl), nx = -sl / n, ny = 1 / n; up.push([px - nx * x / 2, py - ny * x / 2]); dn.push([px + nx * x / 2, py + ny * x / 2]); }
    const poly = [...up, ...dn.reverse()];
    const clip = (p, inside, cut) => { const o = []; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length], ia = inside(a), ib = inside(b); if (ia) o.push(a); if (ia !== ib) o.push(cut(a, b)); } return o; };
    const at = (xv) => (a, b) => { const t = (xv - a[0]) / (b[0] - a[0]); return [xv, a[1] + t * (b[1] - a[1])]; };
    let c = clip(poly, (p) => p[0] >= 0, at(0)); c = clip(c, (p) => p[0] <= w, at(w));
    return 'M' + c.map((p) => `${p[0].toFixed(2)} ${(p[1] + y0).toFixed(2)}`).join(' L') + ' Z';
  };
  // words are outlined one at a time and placed by their own advance: the single-string outline mis-set the run after the space
  const sp = font.charToGlyph(' ').advanceWidth * size / font.unitsPerEm;
  const lock = (words) => { let ox = 0, w = 0; const parts = [];
    for (const t of words) { const o = word(t); parts.push({ d: o.d, role: 'name', tf: `translate(${(ox - o.x1).toFixed(2)} ${cap.toFixed(2)})` }); w = ox + (o.x2 - o.x1); ox = w + sp; }
    parts.push({ d: wake(w, cap + 3 * x), role: 'wake', tf: '' }); return { w, parts }; };
  const P = lock(brand.logo.showcase.wordmark.split(' ')); const primary = { ...P, h: 14 * x };
  const S = lock(['TS']); const symbol = { ...S, h: 14 * x };
  const move = (parts, dx, dy, sc) => parts.map((p) => ({ role: p.role, d: p.d, tf: `translate(${dx.toFixed(2)} ${dy.toFixed(2)}) scale(${sc}) ${p.tf}`.trim() }));
  // stacked: TWO over SHORES, one wake the width of SHORES
  const [a, b] = brand.logo.showcase.wordmark.split(' '); const oa = word(a), ob = word(b), wb = ob.x2 - ob.x1, step = cap + 3 * x;
  const stacked = { w: wb, h: step + 14 * x, parts: [{ d: oa.d, role: 'name', tf: `translate(${(-oa.x1).toFixed(2)} ${cap.toFixed(2)})` }, { d: ob.d, role: 'name', tf: `translate(${(-ob.x1).toFixed(2)} ${(cap + step).toFixed(2)})` }, { d: wake(wb, cap + step + 3 * x), role: 'wake', tf: '' }] };
  const sc = 1.4, gap = 6 * x, hh = Math.max(symbol.h * sc, primary.h);
  const horizontal = { w: symbol.w * sc + gap + primary.w, h: hh, parts: [...move(symbol.parts, 0, (hh - symbol.h * sc) / 2, sc), ...move(primary.parts, symbol.w * sc + gap, (hh - primary.h) / 2, 1)] };
  return { primary, horizontal, stacked, symbol, clearUnit: 4 * x, roles: { name: 'name', wake: 'wake' }, geo: { x, cap, W: P.w } };
}
