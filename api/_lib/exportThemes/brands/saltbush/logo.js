// Saltbush's logo: the name in Young Serif with a sprig of saltbush beside it, a stem with pairs of small leaves.
// The sprig is drawn here in a 100-unit box (stem at x=30) and placed by transform; the name is outlined from the display face.
// Receives { brand, font, outline, capHeight } from the engine (see engine/README.md, "Logo plugin").
const LEAF = 'M0 0 C9 -7 9 -22 0 -32 C-9 -22 -9 -7 0 0 Z';
// [y on the stem, angle from vertical, scale]: pairs low to high, then the leaf at the tip
const LEAVES = [[86, -58, 0.95], [86, 58, 0.95], [70, -54, 0.9], [70, 58, 0.9], [54, -50, 0.82], [54, 52, 0.82], [40, -42, 0.72], [40, 44, 0.72], [32, 0, 0.9]];
const STEM = 'M27.5 100 H32.5 V30 H27.5 Z';

export default function saltbushLogo({ brand, font, outline, capHeight }) {
  const size = 100, track = -0.01;
  const word = brand.logo.showcase.wordmark;
  const name = outline(font, word, size, track), init = outline(font, [...word][0], size, 0);
  const cap = capHeight(font, size);
  const top = name.y1, h = Math.max(name.y2, 0) - top; // the name spans top..bottom around the baseline at 0
  const place = (o) => `translate(${(-o.x1).toFixed(2)} ${(-top).toFixed(2)})`;
  // the sprig at height sh, its left edge at x, standing with its foot at y0 + sh
  const sprig = (x, y0, sh) => {
    const k = sh / 100, sw = 60 * k;
    const base = `translate(${x.toFixed(2)} ${y0.toFixed(2)}) scale(${k.toFixed(4)})`;
    return { w: sw, parts: [{ d: STEM, role: 'mark', tf: base }, ...LEAVES.map(([y, a, s]) => ({ d: LEAF, role: 'mark', tf: `${base} translate(30 ${y}) rotate(${a}) scale(${s})` }))] };
  };
  const gap = 0.3 * cap, nameW = name.x2 - name.x1, initW = init.x2 - init.x1;
  const sp = sprig(nameW + gap, 0, h);
  const primary = { w: nameW + gap + sp.w, h, parts: [{ d: name.d, role: 'name', tf: place(name) }, ...sp.parts] };
  const sps = sprig(initW + gap, 0, h);
  const symbol = { w: initW + gap + sps.w, h, parts: [{ d: init.d, role: 'name', tf: place(init) }, ...sps.parts] };
  const move = (parts, dx, dy) => parts.map((p) => ({ role: p.role, d: p.d, tf: `translate(${dx.toFixed(2)} ${dy.toFixed(2)}) ${p.tf}` }));
  // horizontal: the sprig leads, the name follows
  const lead = sprig(0, 0, h);
  const nameParts = [{ d: name.d, role: 'name', tf: place(name) }];
  const horizontal = { w: lead.w + gap * 1.5 + nameW, h, parts: [...lead.parts, ...move(nameParts, lead.w + gap * 1.5, 0)] };
  // stacked: a taller sprig centred over the name
  const sh2 = h * 1.4, up = sprig(0, 0, sh2), sgap = cap * 0.5;
  const sw = Math.max(nameW, up.w);
  const stacked = { w: sw, h: sh2 + sgap + h, parts: [...move(up.parts, (sw - up.w) / 2, 0), ...move(nameParts, (sw - nameW) / 2, sh2 + sgap)] };
  return { primary, horizontal, stacked, symbol, clearUnit: cap, roles: { name: 'name', mark: 'mark' }, geo: { cap, h, gap, sprigW: sp.w } };
}
