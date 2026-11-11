// Long Room's logo: a plate (a square of colour) hangs above the name, the way a work hangs above its label.
// The plate sits flush with the left edge of the L. The wordmark is outlined from the display face (Bodoni Moda 500).
// Called by the engine with { brand, font, outline, capHeight }; returns the four geometries, the clear-space unit and the role map
// (see engine/README.md, "Logo plugin").
export default function longRoomLogo({ brand, font, outline: engineOutline, capHeight }) {
  const outline = engineOutline;
  const size = 100, track = 0;
  const cap = capHeight(font, size);
  const word = brand.logo.showcase.wordmark;                    // "Long Room"
  const name = outline(font, word, size, track);
  const W = name.x2 - name.x1, desc = Math.max(0, name.y2);     // width of the name, depth of the g below the baseline
  const P = 2.4 * cap, gap = 0.7 * cap;                         // the plate, and the space between plate and name
  const sq = (x, y, s) => `M${x.toFixed(2)} ${y.toFixed(2)} H${(x + s).toFixed(2)} V${(y + s).toFixed(2)} H${x.toFixed(2)} Z`;
  const at = (o, x, baseline) => `translate(${(x - o.x1).toFixed(2)} ${baseline.toFixed(2)})`;

  // primary: plate above the name, both on the left edge of the L
  const primary = { w: Math.max(W, P), h: P + gap + cap + desc, parts: [{ d: sq(0, 0, P), role: 'plate', tf: '' }, { d: name.d, role: 'name', tf: at(name, 0, P + gap + cap) }] };

  // symbol: the plate with the L beneath it. The L is set at twice the wordmark's size so it carries at small sizes (it was a speck at 1x)
  const LS = 2, Lcap = LS * cap, sgapL = 0.5 * cap;
  const L = outline(font, [...word][0], size * LS, 0);
  const symbol = { w: P, h: P + sgapL + Lcap, parts: [{ d: sq(0, 0, P), role: 'plate', tf: '' }, { d: L.d, role: 'name', tf: at(L, 0, P + sgapL + Lcap) }] };

  // horizontal: a plate as tall as the capitals, then the name on one line
  const hgap = 0.55 * cap;
  const horizontal = { w: cap + hgap + W, h: cap + desc, parts: [{ d: sq(0, 0, cap), role: 'plate', tf: '' }, { d: name.d, role: 'name', tf: at(name, cap + hgap, cap) }] };

  // stacked: plate, then the name on two lines
  const [first, second] = word.split(' ');
  const l1 = outline(font, first, size, track), l2 = outline(font, second, size, track);
  const SP = 1.8 * cap, lead = 1.3 * cap, sgap = 0.6 * cap;
  const stacked = {
    w: Math.max(SP, l1.x2 - l1.x1, l2.x2 - l2.x1), h: SP + sgap + cap + lead + Math.max(0, l2.y2),
    parts: [{ d: sq(0, 0, SP), role: 'plate', tf: '' }, { d: l1.d, role: 'name', tf: at(l1, 0, SP + sgap + cap) }, { d: l2.d, role: 'name', tf: at(l2, 0, SP + sgap + cap + lead) }],
  };

  return { primary, horizontal, stacked, symbol, clearUnit: cap, roles: { name: 'name', plate: 'plate' }, geo: { W, P, gap, cap, desc } };
}
