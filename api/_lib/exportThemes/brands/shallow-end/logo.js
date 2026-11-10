// Shallow End's logo: the name swims in a lane. A lane rope of round dashes runs under it, exactly as wide as the name.
// Receives { brand, font, outline, capHeight } from engine/logo.js; returns the lockups, the clear-space unit and the role map.
export default function shallowEndLogo({ brand, font, outline, capHeight }) {
  const size = 100, track = -0.01;
  const cap = capHeight(font, size);
  const name = outline(font, brand.logo.showcase.wordmark, size, track);
  const W = name.x2 - name.x1, asc = -name.y1;
  const T = 0.13 * cap, gap = 0.3 * cap, g = 1.5 * T;
  // a rope of n round dashes across width w, top edge at y0
  const rope = (w, n, y0) => {
    const d = (w - (n - 1) * g) / n, r = T / 2; let p = '';
    for (let i = 0; i < n; i++) { const x = i * (d + g); p += `M${(x + r).toFixed(2)} ${y0.toFixed(2)}H${(x + d - r).toFixed(2)}A${r.toFixed(2)} ${r.toFixed(2)} 0 0 1 ${(x + d - r).toFixed(2)} ${(y0 + T).toFixed(2)}H${(x + r).toFixed(2)}A${r.toFixed(2)} ${r.toFixed(2)} 0 0 1 ${(x + r).toFixed(2)} ${y0.toFixed(2)}Z`; }
    return p;
  };
  const n = Math.round((W + g) / (3.4 * T + g));
  const primary = { w: W, h: asc + gap + T, parts: [{ d: name.d, role: 'name', tf: `translate(${(-name.x1).toFixed(2)} ${asc.toFixed(2)})` }, { d: rope(W, n, asc + gap), role: 'lane', tf: '' }] };
  const p = outline(font, [...brand.logo.showcase.wordmark][0], size, 0), Wp = p.x2 - p.x1;
  const symbol = { w: Wp, h: cap + gap + T, parts: [{ d: p.d, role: 'name', tf: `translate(${(-p.x1).toFixed(2)} ${cap.toFixed(2)})` }, { d: rope(Wp, 3, cap + gap), role: 'lane', tf: '' }] };
  const move = (parts, dx, dy, sc) => parts.map((q) => ({ role: q.role, d: q.d, tf: `translate(${dx.toFixed(2)} ${dy.toFixed(2)}) scale(${sc}) ${q.tf}`.trim() }));
  const sc = 1.6, sgap = cap;
  const horizontal = { w: symbol.w * sc + sgap + primary.w, h: Math.max(symbol.h * sc, primary.h), parts: [] };
  horizontal.parts = [...move(symbol.parts, 0, (horizontal.h - symbol.h * sc) / 2, sc), ...move(primary.parts, symbol.w * sc + sgap, (horizontal.h - primary.h) / 2, 1)];
  const stacked = { w: Math.max(symbol.w * sc, primary.w), h: symbol.h * sc + sgap + primary.h, parts: [...move(symbol.parts, 0, 0, sc), ...move(primary.parts, 0, symbol.h * sc + sgap, 1)] };
  return { primary, horizontal, stacked, symbol, clearUnit: cap, roles: { name: 'name', lane: 'lane' }, geo: { W, T, cap, gap, n } };
}
