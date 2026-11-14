// The sheet for theme 28 (Riso): the device every page shares (plate, pass, hit), the foot, and the text helpers.
// Everything is placed in page px (794 x 1123). The three drums are layers inside .pg; the browser's multiply makes the overprint,
// so the overlap colour is always the truth of these inks (spec 3.2). The tiles are in css() as data URIs.
import { esc as A } from '../../engine/brand.js';
import { pathData, outline } from '../../engine/logo.js';
import { loadFont } from '../../engine/nodeFont.js';
import { press, misreg, mul, fnv1a } from './press.js';

// the hole in the plate is cut 2 px left and 2 px up of the numeral (the drum is out of register); KEEP is how much plate is left inside the hole
const HOLE = { x: 1, y: 1 }, KEEP = 0.15;
export const W = 794, H = 1123, X0 = 49, X1 = 627; // text lives in columns 1 to 5: x 49 to 627, w 578
// the page label, said once: the label on the page and the name in the foot are the same word
export const PAGE_LABEL = { cover: 'Cover', intro: 'Introduction', palette: 'Colour', typefaces: 'Type', 'business-card': 'Applications', layouts: 'Layouts' };
// a literal value (hex, rgb, oklch, mm, %, folio) is the only thing set in mono: inside a line of words it is a span
export const val = (t) => `<span class="v">${A(String(t))}</span>`;
const r1 = (n) => Math.round(n * 10) / 10;
const b64 = (s) => Buffer.from(s).toString('base64');

// the press is the same for every page of a document, so work it out once per ctx
export function pressOf(ctx) { return (ctx._press ??= press(ctx)); }

// ---- text measuring (opentype advance widths plus kerning, as outline() lays them out) ----
export function inkW(stem, text, size, track = 0) { const o = outline(loadFont(stem), text, size, track); return o.x2 - o.x1; }
export function wrap(stem, text, size, maxW, track = 0) {
  const out = []; let cur = '';
  for (const w of text.split(' ')) {
    const t = cur ? cur + ' ' + w : w;
    if (cur && inkW(stem, t, size, track) > maxW) { out.push(cur); cur = w; } else cur = t;
  }
  if (cur) out.push(cur);
  return out;
}
// the text cut at the last whole sentence that wraps to at most maxLines (the first sentence alone if even that is longer, cut to maxLines)
export function fitSentences(stem, text, size, maxW, maxLines, track = 0) {
  const s = text.match(/[^.!?]+[.!?]+(\s|$)/g) || [text];
  let out = null;
  for (let i = 1; i <= s.length; i++) { const t = s.slice(0, i).join('').trim(), l = wrap(stem, t, size, maxW, track); if (l.length > maxLines) break; out = { text: t, lines: l }; }
  if (!out) { const t = s[0].trim(); out = { text: t, lines: wrap(stem, t, size, maxW, track).slice(0, maxLines) }; }
  return out;
}
export const fitW =(ctx, id, maxW, maxH) => { const g = ctx.logo.geos[id]; return Math.floor(Math.min(maxW, (maxH * g.w) / g.h)); };
export const heaviest = (f) => f.weights[f.weights.length - 1];
// the loaded face of a brand role nearest the asked weight; italic only if the brand has a real italic of that role (else upright)
export function faceFor(ctx, role, weight, italic = false) {
  const of = ctx.faces.filter((f) => f.role === role);
  const pool = italic && of.some((f) => f.style === 'italic') ? of.filter((f) => f.style === 'italic') : of.filter((f) => f.style !== 'italic');
  return pool.reduce((a, b) => (Math.abs(b.weight - weight) < Math.abs(a.weight - weight) ? b : a));
}
// family, weight, style and stretch for a brand line, so a brand that sets its display in a width or weight other than 400/500 is drawn true
export function faceCss(ctx, role, weight, italic = false) {
  const f = faceFor(ctx, role, weight, italic);
  return `font-family:var(--${role === 'display' ? 'display' : role === 'mono' ? 'bmono' : 'body'});font-weight:${f.weight};font-style:${f.style === 'italic' ? 'italic' : 'normal'}${f.stretch ? `;font-stretch:${f.stretch}%` : ''}`;
}
export const displayStem = (ctx, weight = heaviest(ctx.brand.fonts.display), italic = false) => faceFor(ctx, 'display', weight, italic).stem;

// ---- the numeral: the brand's own display face as outlines, laid out glyph by glyph so the plate can be cut with the same shape ----
// Long Room's Bodoni Moda, Kerbside's Archivo 125 ExtraBold: the numeral is the brand's, not the theme's.
// text origin (ox, oy) is the left of the first glyph and the baseline. Steps down 20 px at a time until the ink fits maxW.
export function numeral(stem, text, ox, oy, size, maxW) {
  const font = loadFont(stem), track = -0.02;
  let s = size;
  while (s > 40 && inkW(stem, text, s, track) > maxW) s -= 20;
  let x = ox, prev = null; const d = [];
  for (const ch of text) {
    const g = font.charToGlyph(ch);
    if (prev) { try { x += (font.getKerningValue(prev, g) * s) / font.unitsPerEm; } catch { /* no kerning */ } }
    d.push(pathData(g.getPath(x, oy, s)));
    x += (g.advanceWidth * s) / font.unitsPerEm + track * s;
    prev = g;
  }
  return { d: d.join(' '), size: s };
}

// ---- the device: plate with a hole, pass band, hit numeral ----
// hit: { text, x, base, size, maxW }. The ink is at the true position; the hole in the plate is cut 3 px left and 2 px up of it (the drum is
// out of register): one sliver of bare paper on the left and top, one sliver of overprint on the right and bottom, nothing on the other sides.
// The generic form: a piece (a page, a poster, a card) w x h px, with a plate rect, a pass strip and a hit numeral, all in the piece's px.
// o = { w, h, plate: {x,y,w,h}|null, pass: {x,y,w,h}|null, hit: {text,x,base,size,maxW}|null, plateVar }. Misregistration is seeded by `key`.
export function inkLayers(ctx, key, o) {
  const P = pressOf(ctx), m = misreg(key);
  let html = '', size = 0;
  const stem = displayStem(ctx), n = o.hit ? numeral(stem, o.hit.text, o.hit.x, o.hit.base, o.hit.size, o.hit.maxW ?? 578) : null;
  const nh = o.hit ? numeral(stem, o.hit.text, o.hit.x - HOLE.x, o.hit.base - HOLE.y, n.size, 1e9) : null; // the same glyphs, cut in the plate
  if (n) size = n.size;
  // each piece (and each brand) shows its own part of every tile (the seed), so no two pages print the same grain
  const th = fnv1a(ctx.brand.slug + ':' + key + ':tile'), ox = th % 384, oy = (th >>> 9) % 384;
  const mpos = (x, y) => `-webkit-mask-position:${r1(x)}px ${r1(y)}px;mask-position:${r1(x)}px ${r1(y)}px`;
  if (o.plate) {
    const pl = o.plate, plateMask = P.plateScreen ? `mk${P.plateScreen}` : 'mot';
    // the hole's path is in piece px, so shift it into the plate's own box; KEEP of the plate stays inside the hole (the knock-out is not quite clean)
    const hole = n ? `<svg xmlns="http://www.w3.org/2000/svg" width="${pl.w}" height="${pl.h}" viewBox="${pl.x} ${pl.y} ${pl.w} ${pl.h}"><path fill-rule="evenodd" d="M${pl.x} ${pl.y}h${pl.w}v${pl.h}h${-pl.w}Z ${nh.d}"/>${KEEP ? `<path fill-opacity="${KEEP}" d="${nh.d}"/>` : ''}</svg>` : '';
    const holeCss = n ? `-webkit-mask-image:url(data:image/svg+xml;base64,${b64(hole)});mask-image:url(data:image/svg+xml;base64,${b64(hole)});-webkit-mask-size:${pl.w}px ${pl.h}px;mask-size:${pl.w}px ${pl.h}px;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat` : '';
    html += `<div class="dr ${plateMask}" style="left:${pl.x}px;top:${pl.y}px;width:${pl.w}px;height:${pl.h}px;z-index:1;${mpos(ox, oy)}"><div style="position:absolute;inset:0;background:var(--plate);${holeCss}"></div></div>`;
  }
  if (o.pass) {
    const ps = o.pass, passMask = P.passScreen ? `mk${P.passScreen}` : 'mot';
    // the band's slight skew is a clip-path, not transform:rotate: a rotated mask-image is flattened to solid ink in Chromium's multi-page PDF.
    // poly(dy) is the strip's tilted quad, in the coordinates of an element whose top sits dy px below the strip's top.
    const ang = (m.pass.rot * Math.PI) / 180, cx = ps.w / 2, cy = ps.h / 2;
    const poly = (dy) => 'polygon(' + [[0, 0], [ps.w, 0], [ps.w, ps.h], [0, ps.h]].map(([x, y]) => `${r1(cx + (x - cx) * Math.cos(ang) - (y - cy) * Math.sin(ang))}px ${r1(cy + (x - cx) * Math.sin(ang) + (y - cy) * Math.cos(ang) - dy)}px`).join(',') + ')';
    const left = ps.x + m.pass.dx;
    if (P.passScreen !== 24) {
      html += `<div class="dr ${passMask}" style="left:${left}px;top:${ps.y}px;width:${ps.w}px;height:${ps.h}px;z-index:2;background:var(--pass);clip-path:${poly(0)};${mpos(ox, oy)}"></div>`;
    } else {
      // the 24% pass: a 17% screen over the whole strip, plus the ring (31% minus 17%) faded across it, so the coverage runs from 31% down to 17%
      // (mean 24%). Split into y-bands at the plate's edge: inside the plate the ink is the deepened hue (--passp), outside it is the pass grey.
      // Every element carries the same tile phase in strip coordinates, so the bands join with no seam and the two screens stay nested.
      const bands = [], pl = o.plate, y0 = ps.y, y1 = ps.y + ps.h;
      // the deepened hue only where the strip truly crosses the plate (in x as well as y); a plate beside the strip leaves it plain
      if (pl && P.passPlate && Math.min(y1, pl.y + pl.h) > Math.max(y0, pl.y) && Math.min(left + ps.w, pl.x + pl.w) > Math.max(left, pl.x)) {
        const a = Math.max(y0, pl.y), b = Math.min(y1, pl.y + pl.h);
        if (a > y0) bands.push([y0, a, '--pass']);
        bands.push([a, b, '--passp']);
        if (b < y1) bands.push([b, y1, '--pass']);
      } else bands.push([y0, y1, '--pass']);
      const dir = (th >>> 18) & 1 ? 'to right' : 'to left';
      for (const [a, b, col] of bands) {
        const box = `left:${left}px;top:${a}px;width:${ps.w}px;height:${b - a}px;z-index:2;clip-path:${poly(a - y0)}`, pos = mpos(ox, oy - (a - y0));
        const grad = `linear-gradient(${dir},#000,transparent)`;
        html += `<div class="dr mk17" style="${box};background:var(${col});${pos}"></div>`;
        html += `<div class="dr" style="${box};-webkit-mask-image:${grad};mask-image:${grad}"><div class="mkring" style="position:absolute;inset:0;background:var(${col});${pos}"></div></div>`;
      }
    }
  }
  if (n) html += `<div class="dr mot" style="left:0;top:0;width:${o.w}px;height:${o.h}px;z-index:2;${mpos(oy, ox)}"><svg width="${o.w}" height="${o.h}" viewBox="0 0 ${o.w} ${o.h}" style="position:absolute;left:0;top:0" aria-hidden="true"><path fill="var(--hit)" d="${n.d}"/></svg></div>`;
  return { html, numeralSize: size };
}
export function device(ctx, id, hp, hit) {
  return inkLayers(ctx, id, { w: W, h: hp, plate: { x: 0, y: 0, w: W, h: hp }, pass: { x: 639, y: -8, w: 163, h: 1139 }, hit });
}

// ---- the foot: colour bar, section name, folio (spec 2.4) ----
function foot(ctx, id) {
  const P = pressOf(ctx), p = ctx.pages.find((x) => x.id === id);
  const sq = (x, bg, extra = '') => `<i class="sq" style="left:${x}px;background:${bg}${extra}"></i>`;
  let x = X0, bar = '';
  for (const d of P.drums) { bar += sq(x, d.hex); x += 12; }
  // the overprints this page shows: plate x pass, plate x hit. Each is two squares of the same place, stacked with multiply.
  const ov = (under, over, screen) => `<span class="ov" style="left:${x}px"><i style="background:${under}"></i><i class="${screen ? 'mk' + screen : ''}" style="background:${over};mix-blend-mode:multiply"></i></span>`;
  const seen = new Set();
  const pairs = [[P.plate, P.passPlate || P.pass, P.passScreen, P.passOnPlate], [P.plate, P.hit, 0, P.hitOnPlate]];
  for (const [u, o, s, res] of pairs) { if (seen.has(res)) continue; seen.add(res); bar += ov(u, o, s); x += 12; }
  const end = x - 2;
  const title = PAGE_LABEL[id] || (p.section ? p.section.title : 'Cover');
  const no = String(ctx.pageNo(id)).padStart(3, '0'), total = String(ctx.pages.length).padStart(3, '0');
  return `${bar}<span class="a c-foot" style="left:${end + 12}px;top:1078px;white-space:nowrap">${A(title)}</span>
<span class="a c-value" style="right:${W - X1}px;top:1078px;white-space:nowrap">${no} / ${total}</span>`;
}

// ---- one sheet ----
// tab: optional html laid between the inks and the content (z-index 2, so its multiply meets the plate)
// pages whose slot placeholders use the compact form: their rows are placed by measured text height, which a descriptor block would overflow
const PH_TIGHT = new Set(['intro', 'personality', 'voice', 'write-this', 'messaging', 'logo-versions', 'logo-grounds', 'palette', 'proportion', 'typefaces', 'hierarchy', 'type-in-use', 'photo-direction', 'imagery-rules', 'layouts', 'contact-scope']);
export function sheet(ctx, id, { hp, hit, tab = '' }, inner) {
  const d = device(ctx, id, hp, hit);
  const fh = fnv1a(ctx.brand.slug + ':' + id + ':fibre');
  return `<section class="pg" data-page="${id}" style="--fx:${fh % 512}px;--fy:${(fh >>> 9) % 512}px">${d.html}${tab}<div class="lay${ctx.placeholders && PH_TIGHT.has(id) ? ' ph-tight' : ''}" style="z-index:3">${inner}${foot(ctx, id)}</div></section>`;
}

// the logo colourway to print on a plate: the brand's own colourway whose ground is the plate colour; else mono-dark if Ink reads on it, else mono-light
export function logoOnPlate(ctx) {
  const P = pressOf(ctx), cws = ctx.brand.logo.colourways;
  const hit = Object.entries(cws).find(([, c]) => c.ground && c.ground.toUpperCase() === P.plate.toUpperCase());
  if (hit) return hit[0];
  return ctx.ratio(P.key, P.plate) >= 4.5 ? 'mono-dark' : 'mono-light';
}
export const sectionNo =(ctx, id) => { const p = ctx.pages.find((x) => x.id === id); return p && p.section ? String(p.section.n).padStart(2, '0') : null; };
export const longDate = (iso) => { const d = new Date(iso + 'T00:00:00Z'); return `${d.getUTCDate()} ${d.toLocaleDateString('en-AU', { month: 'long', year: 'numeric', timeZone: 'UTC' })}`; };
export { A, r1, mul };
