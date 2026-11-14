// Theme 28 (Riso), lane bk: the press for the web. A brand book section is one sheet of the run: a plate across its head, a pass of the key
// drum screened down its right edge, and the hit, a numeral in the brand's display face cut out of the plate and printed in the hit drum a few
// px out of register. The sheet is fluid, so the plate is as deep as its head, and the pass is drawn in two parts (over the plate, then over
// the paper) that join edge to edge. The numeral is outlines (the brand's own glyphs), so its hole in the plate is the same shape.
// The hit is always a real count from ctx, and the head's words say what it counts. Nothing here names a colour or a brand.


import { tile } from './tiles.js';
import { outline } from '../../engine/logo.js';
import { loadFont } from '../../engine/nodeFont.js';
import { pressOf, displayStem, A } from './sheet.js';
import { misreg, fnv1a } from './press.js';

const r1 = (n) => Math.round(n * 10) / 10;
const b64 = (s) => Buffer.from(s).toString('base64');
export { tile };

// the numeral as outlines, its ink box at (0, 0): the largest size (stepping down 10 px) whose ink fits maxW
export function numeral(ctx, text, size, maxW) {
  const font = loadFont(displayStem(ctx));
  let s = size, o = outline(font, text, s, -0.02);
  while (s > 40 && o.x2 - o.x1 > maxW) { s -= 10; o = outline(font, text, s, -0.02); }
  return { d: o.d, x: o.x1, y: o.y1, w: Math.ceil(o.x2 - o.x1), h: Math.ceil(o.y2 - o.y1), size: s };
}
const glyphSvg = (n, fill, extra = '') => `<svg xmlns="http://www.w3.org/2000/svg" width="${n.w}" height="${n.h}" viewBox="${r1(n.x)} ${r1(n.y)} ${n.w} ${n.h}"${extra}><path fill="${fill}" d="${n.d}"/></svg>`;

// the hit for one sheet, wide and narrow: the ink (an inline svg) and the hole (a mask layer for the plate, XOR'd with a full layer, so the
// plate is gone where the glyphs are, but for 15%: the knock-out is not quite clean)
export function hit(ctx, key, text, { wide = 280, narrow = 132, maxW = 440, maxN = 230 } = {}) {
  const m = misreg('book:' + key), w = numeral(ctx, text, wide, maxW), n = numeral(ctx, text, narrow, maxN);
  const dx = Math.abs(m.hit.dx), dy = Math.abs(m.hit.dy);
  const hole = (g) => `url(data:image/svg+xml;base64,${b64(glyphSvg(g, '#000', ' fill-opacity="0.85"'))})`;
  const ink = (g, cls) => `<span class="rb-hit ${cls}" aria-hidden="true" style="width:${g.w}px;height:${g.h}px"><svg width="${g.w}" height="${g.h}" viewBox="${r1(g.x)} ${r1(g.y)} ${g.w} ${g.h}" focusable="false"><path d="${g.d}"/></svg></span>`;
  return {
    vars: `--hw:${w.w}px;--hh:${w.h}px;--hn-w:${n.w}px;--hn-h:${n.h}px;--hdx:${dx}px;--hdy:${dy}px;--holew:${hole(w)};--holen:${hole(n)}`,
    html: ink(w, 'rb-hit--w') + ink(n, 'rb-hit--n'),
  };
}

// the pass's skew: the band's left edge drifts a few px from the sheet's head to its foot, the way a sheet feeds a little crooked.
// The head part drifts a then b, the body part b then c, so the two parts meet with no step.
export function passVars(key) {
  const h = fnv1a('28-riso:book:' + key), m = misreg('book:' + key), sgn = m.pass.rot < 0 ? -1 : 1;
  const a = 4 + m.pass.dx, b = a + sgn * 2, c = b + sgn * (3 + (h >>> 20) % 3);
  return `--pa:${a + 4}px;--pb:${b + 4}px;--pc:${c + 4}px;--fx:${h % 512}px;--fy:${(h >>> 9) % 512}px;--mx:${(h >>> 4) % 384}px;--my:${(h >>> 13) % 384}px`;
}

// the colour bar a sheet's foot carries: one square a drum, then the overprints the sheet shows (plate x pass, plate x hit), each two squares of
// the same place stacked with multiply, so the overprint is the browser's own
export function colourBar(ctx) {
  const P = pressOf(ctx), seen = new Set();
  let out = P.drums.map((d) => `<i class="rb-sq" style="background:${d.hex}"></i>`).join('');
  for (const [u, o, s, res] of [[P.plate, P.passPlate || P.pass, P.passScreen, P.passOnPlate], [P.plate, P.hit, 0, P.hitOnPlate]]) {
    if (seen.has(res)) continue; seen.add(res);
    out += `<span class="rb-sq rb-ov"><i style="background:${u}"></i><i class="${s ? 'rb-scr' : ''}" style="background:${o}"></i></span>`;
  }
  return `<span class="rb-bar" aria-hidden="true">${out}</span>`;
}

export { A };
