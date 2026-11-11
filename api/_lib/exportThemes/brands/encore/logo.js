// Encore's logo: the name in the italic display face, ending on a repeat mark (dots, thin bar, thick bar), the sign a musician reads as "play it again".
// The symbol is the italic E and the same mark on a rounded tile. Receives and returns what engine/logo.js documents.
export default function encoreLogo({ brand, font, outline, capHeight }) {
  const size = 100, track = -0.015;
  const C = capHeight(font, size);
  const name = outline(font, brand.logo.showcase.wordmark, size, track);
  const f2 = (n) => n.toFixed(2);
  // the repeat mark at height H, left edge at x0, top at y0: two dots, a thin bar, a thick bar
  const repeat = (x0, y0, H) => {
    const r = 0.07 * H, tw = 0.055 * H, kw = 0.16 * H, g1 = 0.1 * H, g2 = 0.07 * H;
    const cx = x0 + r, bx = x0 + 2 * r + g1, kx = bx + tw + g2;
    const dot = (cy) => `M${f2(cx - r)} ${f2(cy)} a${f2(r)} ${f2(r)} 0 1 0 ${f2(2 * r)} 0 a${f2(r)} ${f2(r)} 0 1 0 ${f2(-2 * r)} 0 Z`;
    const bar = (x, w) => `M${f2(x)} ${f2(y0)} h${f2(w)} v${f2(H)} h${f2(-w)} Z`;
    return { d: `${dot(y0 + 0.36 * H)} ${dot(y0 + 0.64 * H)} ${bar(bx, tw)} ${bar(kx, kw)}`, w: kx + kw - x0 };
  };
  const top = -name.y1, W = name.x2 - name.x1, h = name.y2 - name.y1, gap = 0.34 * C;
  const sign = repeat(W + gap, top - C, C);
  const primary = { w: W + gap + sign.w, h, parts: [{ d: name.d, role: 'name', tf: `translate(${f2(-name.x1)} ${f2(top)})` }, { d: sign.d, role: 'sign', tf: '' }] };
  // symbol: E and the repeat mark, centred on a square tile 100 units wide
  const S = 100, rad = 5;
  const e = outline(font, [...brand.logo.showcase.wordmark][0], size, 0);
  const eW = e.x2 - e.x1, mark = repeat(0, 0, C), gE = 0.3 * C;
  const k = (0.62 * S) / (eW + gE + mark.w);
  const gw = (eW + gE + mark.w) * k, gx = (S - gw) / 2, gy = (S - C * k) / 2;
  const tile = `M${rad} 0 H${S - rad} A${rad} ${rad} 0 0 1 ${S} ${rad} V${S - rad} A${rad} ${rad} 0 0 1 ${S - rad} ${S} H${rad} A${rad} ${rad} 0 0 1 0 ${S - rad} V${rad} A${rad} ${rad} 0 0 1 ${rad} 0 Z`;
  const symbol = { w: S, h: S, parts: [
    { d: tile, role: 'tile', tf: '' },
    { d: e.d, role: 'tileInk', tf: `translate(${f2(gx - e.x1 * k)} ${f2(gy + C * k)}) scale(${f2(k)})` },
    { d: mark.d, role: 'tileInk', tf: `translate(${f2(gx + (eW + gE) * k)} ${f2(gy)}) scale(${f2(k)})` },
  ] };
  const move = (parts, dx, dy, sc) => parts.map((p) => ({ role: p.role, d: p.d, tf: `translate(${f2(dx)} ${f2(dy)}) scale(${f2(sc)}) ${p.tf}`.trim() }));
  // horizontal: tile beside the lockup; stacked: tile over the lockup
  const ts = 1.9 * C / S, tgap = 0.8 * C;
  const horizontal = { w: S * ts + tgap + primary.w, h: Math.max(S * ts, h), parts: [] };
  horizontal.parts = [...move(symbol.parts, 0, (horizontal.h - S * ts) / 2, ts), ...move(primary.parts, S * ts + tgap, (horizontal.h - h) / 2, 1)];
  const ss = 2.6 * C / S, sgap = 0.9 * C;
  const stacked = { w: primary.w, h: S * ss + sgap + h, parts: [...move(symbol.parts, (primary.w - S * ss) / 2, 0, ss), ...move(primary.parts, 0, S * ss + sgap, 1)] };
  return { primary, horizontal, stacked, symbol, clearUnit: C, roles: { name: 'name', sign: 'sign', tile: 'tile', tileInk: 'tileInk' }, geo: { cap: C, W } };
}
