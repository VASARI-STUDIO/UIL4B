// Offcut's logo: the name in Unbounded, followed by a length of board with its end sawn off at 45 degrees.
// The board stands as tall as the name's own "x" and sits on its baseline; the sawn-off wedge sits just clear of the cut,
// and the wedge is the only Toolbox in the mark. The symbol is the board and its wedge on their own.
// Called by engine/logo.js with { brand, font, outline, capHeight }; see brands/kerbside/logo.js for the contract.
export default function offcutLogo({ brand, font, outline, capHeight }) {
  const size = 100, track = -0.01;
  const word = brand.logo.showcase.wordmark;
  const cap = capHeight(font, size);
  const name = outline(font, word, size, track);
  const ex = outline(font, 'x', size, 0), el = outline(font, 'l', size, 0);
  const h = -ex.y1, stem = el.x2 - el.x1;              // board height is the name's x-height; the l's stem sets the gaps
  const len = h * 2.4, kerf = stem * 0.42;            // the board's long (top) edge, and the gap the saw leaves
  const shift = kerf * Math.SQRT2;                    // a sideways move that opens the 45 degree cut by exactly the kerf

  // the board with its left edge at x = ox and its baseline at y = 0; returns path data and the bounds it covers
  const board = (ox) => {
    const f = (v) => v.toFixed(2);
    const body = `M${f(ox)} 0V${f(-h)}H${f(ox + len)}L${f(ox + len - h)} 0Z`;
    const wedge = `M${f(ox + len - h + shift)} 0L${f(ox + len + shift)} ${f(-h)}V0Z`;
    return { body, wedge, x1: ox, x2: ox + len + shift, y1: -h, y2: 0 };
  };

  // primary: the name, then the board on the same baseline
  const nameW = name.x2 - name.x1, gap = stem * 1.4;
  const top = Math.min(name.y1, -h), bottom = Math.max(name.y2, 0);
  const b0 = board(nameW + gap);
  const primary = {
    w: b0.x2, h: bottom - top,
    parts: [
      { d: name.d, role: 'name', tf: `translate(${(-name.x1).toFixed(2)} ${(-top).toFixed(2)})` },
      { d: b0.body, role: 'name', tf: `translate(0 ${(-top).toFixed(2)})` },
      { d: b0.wedge, role: 'cut', tf: `translate(0 ${(-top).toFixed(2)})` },
    ],
  };
  // symbol: the board and its wedge alone
  const bs = board(0);
  const symbol = { w: bs.x2, h, parts: [{ d: bs.body, role: 'name', tf: `translate(0 ${h.toFixed(2)})` }, { d: bs.wedge, role: 'cut', tf: `translate(0 ${h.toFixed(2)})` }] };
  // the name alone, for the horizontal and stacked lockups, which take the board as the symbol
  const nTop = name.y1, nameOnly = { w: nameW, h: name.y2 - nTop, parts: [{ d: name.d, role: 'name', tf: `translate(${(-name.x1).toFixed(2)} ${(-nTop).toFixed(2)})` }] };
  const move = (parts, dx, dy, sc) => parts.map((p) => ({ role: p.role, d: p.d, tf: `translate(${dx.toFixed(2)} ${dy.toFixed(2)}) scale(${sc}) ${p.tf}`.trim() }));
  // horizontal: the board first, then the name, sharing a baseline
  const sgap = cap * 0.6;
  const baseName = -nTop, hTop = Math.max(baseName, h);
  const horizontal = { w: symbol.w + sgap + nameOnly.w, h: hTop + Math.max(nameOnly.h - baseName, 0), parts: [...move(symbol.parts, 0, hTop - h, 1), ...move(nameOnly.parts, symbol.w + sgap, hTop - baseName, 1)] };
  // stacked: a larger board above the name, centred
  const ss = 1.5, W = Math.max(symbol.w * ss, nameOnly.w);
  const stacked = { w: W, h: symbol.h * ss + sgap * 1.4 + nameOnly.h, parts: [...move(symbol.parts, (W - symbol.w * ss) / 2, 0, ss), ...move(nameOnly.parts, (W - nameOnly.w) / 2, symbol.h * ss + sgap * 1.4, 1)] };

  // clear space is a quarter of the type size, as drawn on the guidelines cover
  return { primary, horizontal, stacked, symbol, clearUnit: size * 0.25, roles: { name: 'name', cut: 'cut' }, geo: { cap, stem, h, len, nameW, gap, size } };
}
