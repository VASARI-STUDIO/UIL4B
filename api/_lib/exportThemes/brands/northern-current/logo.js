// Northern Current's logo: the name over a horizon line, with the sun rising at the line's end.
// Receives { brand, font, outline, capHeight } from the engine (see engine/README.md, "Logo plugin").
// Roles: name and rule take the colourway's `name`, sun takes its `sun`.
export default function northernCurrentLogo({ brand, font, outline, capHeight }) {
  const size = 100, track = -0.01;
  const cap = capHeight(font, size);
  const [first, second] = ['Northern', 'Current'];
  const o1 = outline(font, first, size, track), o2 = outline(font, second, size, track);
  const w1 = o1.x2 - o1.x1, w2 = o2.x2 - o2.x1;
  const lead = cap * 1.3, gap = cap * 0.3, T = cap * 0.16, sgap = cap * 0.36;
  const tr = (o, x, y) => `translate(${(x - o.x1).toFixed(2)} ${y.toFixed(2)})`;
  const rule = (w, y) => `M0 ${y.toFixed(2)} H${w.toFixed(2)} V${(y + T).toFixed(2)} H0 Z`;
  const sun = (cx, y, R) => `M${(cx - R).toFixed(2)} ${y.toFixed(2)} A${R.toFixed(2)} ${R.toFixed(2)} 0 0 1 ${(cx + R).toFixed(2)} ${y.toFixed(2)} Z`;

  // primary: two lines, the horizon under them, the sun beside "Current"
  const W = Math.max(w1, w2 + sgap + cap);
  const R = Math.min((W - w2 - sgap) / 2, cap * 0.95);
  const ruleY = cap + lead + gap;
  const primary = { w: W, h: ruleY + T, parts: [
    { d: o1.d, role: 'name', tf: tr(o1, 0, cap) }, { d: o2.d, role: 'name', tf: tr(o2, 0, cap + lead) },
    { d: rule(W, ruleY), role: 'rule', tf: '' }, { d: sun(W - R, ruleY, R), role: 'sun', tf: '' },
  ] };

  // symbol: the N on its own length of horizon, the sun at the end
  const n = outline(font, 'N', size, 0), wn = n.x2 - n.x1, Rs = cap * 0.5;
  const Ws = wn + sgap + 2 * Rs;
  const symbol = { w: Ws, h: cap + gap + T, parts: [
    { d: n.d, role: 'name', tf: tr(n, 0, cap) }, { d: rule(Ws, cap + gap), role: 'rule', tf: '' }, { d: sun(Ws - Rs, cap + gap, Rs), role: 'sun', tf: '' },
  ] };
  const move = (parts, dx, dy, sc) => parts.map((p) => ({ role: p.role, d: p.d, tf: `translate(${dx.toFixed(2)} ${dy.toFixed(2)}) scale(${sc}) ${p.tf}`.trim() }));

  // horizontal: symbol, then the name on one line
  const one = outline(font, brand.logo.showcase.wordmark, size, track), w3 = one.x2 - one.x1;
  const sc = 1.5, hgap = cap * 0.9, hh = symbol.h * sc;
  const horizontal = { w: symbol.w * sc + hgap + w3, h: hh, parts: [...move(symbol.parts, 0, 0, sc), { d: one.d, role: 'name', tf: tr(one, symbol.w * sc + hgap, cap * sc) }] };

  // stacked: the symbol over the two-line name (no second horizon)
  const ss = 1.7, sgapV = cap * 0.9;
  const stacked = { w: Math.max(symbol.w * ss, w1), h: symbol.h * ss + sgapV + cap + lead, parts: [
    ...move(symbol.parts, 0, 0, ss),
    { d: o1.d, role: 'name', tf: tr(o1, 0, symbol.h * ss + sgapV + cap) }, { d: o2.d, role: 'name', tf: tr(o2, 0, symbol.h * ss + sgapV + cap + lead) },
  ] };
  return { primary, horizontal, stacked, symbol, clearUnit: cap, roles: { name: 'name', rule: 'name', sun: 'sun' }, geo: { cap, T, gap, lead, R } };
}
