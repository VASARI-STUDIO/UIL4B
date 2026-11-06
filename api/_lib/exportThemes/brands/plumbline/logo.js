// Plumbline's logo: the name hangs a plumb line from its first l. A fine line drops below the baseline and ends in a plumb bob.
// The symbol is that line on its own, drawn the way a redline is: a tick at the top, the line, the bob at the bottom.
// Receives { brand, font, outline, capHeight } from engine/logo.js (see engine/README.md, "Logo plugin").
export default function plumblineLogo({ brand, font, outline, capHeight }) {
  const size = 100, track = -0.01;
  const cap = capHeight(font, size);
  const word = brand.logo.showcase.wordmark;
  const name = outline(font, word, size, track);
  const W = name.x2 - name.x1, top = -name.y1; // baseline sits `top` below the ascender line
  const T = 0.07 * cap, lineLen = 0.6 * cap, bobH = 0.4 * cap, bobW = 0.3 * cap, tick = 0.5 * cap;
  // stem centre of the first l: the right edge of "Pl" minus half the ink width of an l
  const l1 = outline(font, 'l', size, 0), pl = outline(font, word.slice(0, 2), size, track);
  const cx = pl.x2 - (l1.x2 - l1.x1) / 2 - name.x1;
  const r = (n) => n.toFixed(2);
  // a plumb line from y0 down: line, then a bob (square shoulder, tapered to a point)
  const plumb = (x, y0, len, bw, bh, t) => `M${r(x - t / 2)} ${r(y0)} H${r(x + t / 2)} V${r(y0 + len)} H${r(x + bw / 2)} V${r(y0 + len + bh * 0.35)} L${r(x)} ${r(y0 + len + bh)} L${r(x - bw / 2)} ${r(y0 + len + bh * 0.35)} V${r(y0 + len)} H${r(x - t / 2)} Z`;
  const nameTf = `translate(${r(-name.x1)} ${r(top)})`;
  const primary = { w: W, h: top + lineLen + bobH, parts: [{ d: name.d, role: 'name', tf: nameTf }, { d: plumb(cx, top, lineLen, bobW, bobH, T), role: 'plumb', tf: '' }] };
  // symbol: tick, line, bob; as tall as the primary is, 0.9 cap wide
  const sh = top + lineLen + bobH, sw = tick;
  const symbol = { w: sw, h: sh, parts: [{ d: `M0 0 H${r(sw)} V${r(T)} H${r(sw / 2 + T / 2)} V${r(sh - bobH - 0)} H${r(sw / 2 - T / 2)} V${r(T)} H0 Z`, role: 'plumb', tf: '' }, { d: plumb(sw / 2, sh - bobH - 0.01, 0.01, bobW, bobH, T), role: 'plumb', tf: '' }] };
  const nameOnly = [{ d: name.d, role: 'name', tf: nameTf }];
  const move = (parts, dx, dy, sc) => parts.map((p) => ({ role: p.role, d: p.d, tf: `translate(${r(dx)} ${r(dy)}) scale(${sc}) ${p.tf}`.trim() }));
  const gap = cap * 0.8, nameH = top + 0 + cap * 0; // the name block is as tall as the ascender line to the baseline
  const horizontal = { w: symbol.w + gap + W, h: sh, parts: [...move(symbol.parts, 0, 0, 1), ...move(nameOnly, symbol.w + gap, 0, 1)] };
  const stacked = { w: Math.max(W, symbol.w), h: sh + gap + top, parts: [...move(symbol.parts, (W - symbol.w) / 2, 0, 1), ...move(nameOnly, 0, sh + gap, 1)] };
  return { primary, horizontal, stacked, symbol, clearUnit: cap, roles: { name: 'name', plumb: 'plumb' }, geo: { W, T, cap, top, lineLen, bobH, bobW, cx, tick, gap } };
}
