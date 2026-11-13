// Theme 30, Fluted, kit site: the glass band for the web. One figure per page: a flat strip above (the 48 px of every mark that stands clear of the glass),
// then the real reeded band (glass.js, the PDF's own) over the page's marks. The figure is 1080 x 432 in its own units and scales with its column.
// Marks are towers (a column with a round head, the theme's window) or boxes. Their sizes are values of the kit (a ratio, a size, a count), never ornament.
// Every class here starts hk-.
import { glassBand } from './glass.js';

export const VW = 1080, FLAT = 48, GH = 384, VH = FLAT + GH, P = 12;
const f2 = (n) => (+n.toFixed(2)).toString();

// the outline of a tower (straight sides to the foot, a head of radius r) or a box (all four corners rounded by r)
function outline(x, y, w, h, rt, rb) {
  const t = Math.max(0, Math.min(rt, w / 2, h)), b = Math.max(0, Math.min(rb, w / 2, h / 2));
  return `M${f2(x)} ${f2(y + t)}${t ? `A${f2(t)} ${f2(t)} 0 0 1 ${f2(x + t)} ${f2(y)}` : ''}H${f2(x + w - t)}${t ? `A${f2(t)} ${f2(t)} 0 0 1 ${f2(x + w)} ${f2(y + t)}` : ''}V${f2(y + h - b)}${b ? `A${f2(b)} ${f2(b)} 0 0 1 ${f2(x + w - b)} ${f2(y + h)}` : ''}H${f2(x + b)}${b ? `A${f2(b)} ${f2(b)} 0 0 1 ${f2(x)} ${f2(y + h - b)}` : ''}Z`;
}
// a mark: art is its markup; a solid one also leaves a plain rect of its body, which the glass reads to weaken its profile on a dark field
function mark(x, y, w, h, rt, rb, { fill = null, stroke = null, sw = 2 } = {}) {
  if (fill) {
    const body = h - Math.max(rt, rb) > 2 ? `<rect x="${f2(x)}" y="${f2(y + rt)}" width="${f2(w)}" height="${f2(h - rt - rb)}" fill="${fill}"/>` : '';
    return `<path d="${outline(x, y, w, h, rt, rb)}" fill="${fill}"/>${body}`;
  }
  const s = Math.min(sw, w / 2 - 0.5, h / 2 - 0.5);
  return `<path fill-rule="evenodd" fill="${stroke}" d="${outline(x, y, w, h, rt, rb)}${outline(x + s, y + s, w - 2 * s, h - 2 * s, Math.max(0, rt - s), Math.max(0, rb - s))}"/>`;
}
// a tower standing on the foot of the figure, its head of radius r (default: the window, w / 2)
export const tower = (x, w, top, { r = null, foot = VH, ...o } = {}) => mark(x, top, w, foot - top, r == null ? w / 2 : r, 0, o);
export const box = (x, y, w, h, r, o = {}) => mark(x, y, w, h, r, r, o);
// a tower filled and ringed (a ring where the fill would vanish on the ground, or the floating one's edge)
export const win = (x, w, top, { fill, ring = null, sw = 2, r = null } = {}) => tower(x, w, top, { r, fill }) + (ring ? tower(x, w, top, { r, stroke: ring, sw }) : '');
// a filled polygon
export const poly = (pts, fill) => `<path d="M${pts.map(([a, b]) => `${f2(a)} ${f2(b)}`).join('L')}Z" fill="${fill}"/>`;

// n equal columns across the figure, in whole reeds: { cw, x(i) }
export function columns(n, { gap = P, x0 = 60, total = 960 } = {}) {
  const cw = Math.floor((total - gap * (n - 1)) / n / P) * P;
  return { cw, x: (i) => x0 + i * (cw + gap) };
}

// the figure: flat strip + glass + optional hairlines (lines: [value-in-figure-y]) over it. art is the markup of every mark. id is unique per page and mode.
export function figure(ctx, id, M, art, { lines = [] } = {}) {
  const ground = M.surface, light = ctx.C.toOklch(ground).L >= 0.4;
  const behind = `<rect x="-60" y="-10" width="${VW + 120}" height="${VH + 20}" fill="${ground}"/>${art}`;
  const glass = glassBand(ctx, { id, behind, light, ground, pitch: P, x0: 0, w: VW, y0: FLAT, h: GH, accent: !light })
    .replace(/ width="1080" height="384" style="[^"]*"/, ' class="hk-gl"');
  const flat = `<svg class="hk-fl" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VW} ${VH}" aria-hidden="true"><rect x="0" y="0" width="${VW}" height="${VH}" fill="${ground}"/>${art}</svg>`;
  const ov = lines.length ? `<svg class="hk-ov" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="none" aria-hidden="true">${lines.map((y) => `<line x1="0" x2="${VW}" y1="${f2(y)}" y2="${f2(y)}" stroke="${M.quiet}" stroke-width="1" vector-effect="non-scaling-stroke"/>`).join('')}</svg>` : '';
  return `<div class="hk-fig">${flat}${glass}${ov}</div>`;
}

// the key row under the figure: items { x, w, a, b }, left to right, placed on the figure's own columns at wide widths and listed in two columns at narrow ones.
// a is the name line, b the value line (both are markup the caller has escaped).
export function keys(items) {
  const xs = items.slice().sort((p, q) => p.x - q.x);
  const cols = [];
  let at = 0;
  const cells = xs.map((it, i) => {
    const x = Math.max(it.x, at), w = Math.max(P, Math.min(it.w, VW - x));
    if (x > at) cols.push(`minmax(0,${f2(x - at)}fr)`);
    cols.push(`minmax(0,${f2(w)}fr)`);
    at = x + w;
    return `<div class="hk-key" style="--gc:${cols.length}">${it.a ? `<span class="hk-ka">${it.a}</span>` : ''}${it.b ? `<span class="hk-kb">${it.b}</span>` : ''}</div>`;
  });
  if (at < VW) cols.push(`minmax(0,${f2(VW - at)}fr)`);
  return `<div class="hk-keys" style="--tc:${cols.join(' ')}">${cells.join('')}</div>`;
}
