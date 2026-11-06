// Kerbside's logo: the name sits on a kerb, a line that runs the length of the name and steps down to the road.
// The engine (engine/logo.js) calls this with the brand and some drawing helpers and builds everything generic from the result:
// the seven versions, svg/png/pdf, the slot frame, clear space and minimum sizes.
//
// Receives { brand, faces, font, loadFont, outline, capHeight, edition }:
//   font        the display face, parsed (opentype.js)
//   outline(font, text, size, track)  glyph outlines as path data on a baseline at y=0 ({ d, x1, x2, y1, y2 })
//   capHeight(font, size)             cap height in px at that size
// Returns:
//   primary, horizontal, stacked, symbol   each { w, h, parts: [{ d, role, tf }] }  (tf is an svg transform or '')
//   clearUnit   the clear-space unit x in the same units as the geometry (here the cap height)
//   roles       how a part's role takes its colour from a brand.json colourway: role -> key, or role -> (colourway, name) => colour
//   geo         optional extra measurements for themes (ctx.logo.geo)
export default function kerbsideLogo({ brand, font, outline, capHeight }) {
  const size = 100, track = -0.01;
  const cap = capHeight(font, size);
  const name = outline(font, brand.logo.showcase.wordmark, size, track);
  const W = name.x2 - name.x1;
  const T = (14 / 760) * W, gap = 0.22 * cap, tail = 10 * T;
  const kerb = (w, tl, y0) => `M0 ${y0.toFixed(2)} H${w.toFixed(2)} V${(y0 + T).toFixed(2)} H${(w + tl).toFixed(2)} V${(y0 + 2 * T).toFixed(2)} H${(w - T).toFixed(2)} V${(y0 + T).toFixed(2)} H0 Z`;
  // primary lockup: name on top (cap-top at y=0), kerb below
  const primary = { w: W + tail, h: cap + gap + 2 * T, parts: [{ d: name.d, role: 'name', tf: `translate(${(-name.x1).toFixed(2)} ${cap.toFixed(2)})` }, { d: kerb(W, tail, cap + gap), role: 'kerb', tf: '' }] };
  // symbol: the first letter on its own piece of kerb
  const k = outline(font, [...brand.logo.showcase.wordmark][0], size, 0); const Wk = k.x2 - k.x1;
  const symbol = { w: Wk + 3 * T, h: cap + gap + 2 * T, parts: [{ d: k.d, role: 'name', tf: `translate(${(-k.x1).toFixed(2)} ${cap.toFixed(2)})` }, { d: kerb(Wk, 3 * T, cap + gap), role: 'kerb', tf: '' }] };
  const move = (parts, dx, dy, sc) => parts.map((p) => ({ role: p.role, d: p.d, tf: `translate(${dx.toFixed(2)} ${dy.toFixed(2)}) scale(${sc}) ${p.tf}`.trim() }));
  const sc = 1.6, sgap = cap * 1.0;
  const horizontal = { w: symbol.w * sc + sgap + primary.w, h: symbol.h * sc, parts: [...move(symbol.parts, 0, 0, sc), ...move(primary.parts, symbol.w * sc + sgap, (symbol.h * sc - primary.h) / 2, 1)] };
  const stacked = { w: Math.max(symbol.w * sc, primary.w), h: symbol.h * sc + sgap + primary.h, parts: [...move(symbol.parts, 0, 0, sc), ...move(primary.parts, 0, symbol.h * sc + sgap, 1)] };
  return { primary, horizontal, stacked, symbol, clearUnit: cap, roles: { name: 'name', kerb: 'kerb' }, geo: { W, T, cap, gap, tail } };
}
