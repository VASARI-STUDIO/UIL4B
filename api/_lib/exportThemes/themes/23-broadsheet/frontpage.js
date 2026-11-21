// Theme 23, Broadsheet: the brand's own sheet and its two screens, drawn as art (the newspaper on the counter, the phone and the post on the layouts page).
// All copy is read from brand data; colours are roles, never ids.
import { ttl, spotOf, postLine, sheetLine, foldLine, plateExample, A, N, G, E, hr, px, fitLines, balance2, headLines, fitLogo, bodyWeight, displayWeight, measure, plateInner } from './helpers.js';

const fill = (c) => `<i class="ar-fill" style="background:${c}"></i>`;
const light = (ctx) => ctx.roles.light;
const radius = (ctx) => (ctx.radii.find((r) => r.token === 'radius-control') || { px: 0 }).px;

// The full A3 sheet, 1123 x 1587. fold adds the plate and the brief below the fold (the page figure shows it; the photo crops it away).
export function frontPage(ctx, { fold = false } = {}) {
  const B = ctx.brand, L = ctx.logo, scr = B.ui.screen, items = scr.content.deliveries.slice(0, 5);
  const ears = E(G.left, 40, 'c-folio c-ink', A(scr.title)) + (B.city ? E(G.right - 200, 40, 'c-folio c-ink c-right', A(B.city), { w: 200 }) : '') + hr(G.left, 72, 1000, 1);
  const w = fitLogo(ctx, 'colour', 1000, 160), h = w * L.geos.colour.h / L.geos.colour.w;
  const plate = E(G.left + (1000 - w) / 2, 88 + (160 - h) / 2, 'nameplate', L.html('colour', { width: w, color: N.ink, label: 'Logo' }), { w, h });
  const dbl = hr(G.left, 264, 1000, 3) + hr(G.left, 271, 1000, 1);
  const hd = fitLines(ctx, sheetLine(ctx), { w: 744, max: 64, min: 48, maxLines: 3 });
  const lh = Math.round(hd.size * 68 / 64);
  const head = E(G.left, 304, 'story', headLines(hd.lines, hd.size, lh), { w: 744 });
  const deck = E(G.left, Math.max(540, 304 + hd.lines.length * lh + 32), 'b-deck', A(B.description), { w: 488 });
  // the list in the fourth column: a head, a rule and the rows, each row the thing, when it is there and what it costs
  const rows = items.map((d, i) => `<div class="fp-row${i === items.length - 1 ? ' last' : ''}"><p class="b-body">${A(d.to)}</p><p class="fp-when">${A(d.when)}</p><p class="b-price">${A(d.price)}</p></div>`).join('');
  const list = `<div class="a colm" style="left:${px(G.x[3])};top:304px;width:${G.col}px"><i class="vr"></i><p class="fp-head">${A(scr.title)}</p><div class="fp-list">${rows}</div></div>`;
  let below = '';
  if (fold) {
    below = `<div class="a colm" style="left:${px(G.left)};top:816px;width:744px">${plateInner(ctx, 'cover', 0)}</div>`
      + `<div class="a colm" style="left:${px(G.x[3])};top:816px;width:${G.col}px"><i class="vr"></i>${ttl(ctx, plateExample(ctx, foldLine(ctx)), G.col)}</div>`;
  }
  return ears + plate + dbl + head + deck + list + below;
}

// The phone screen, 390 x 844: the week's list as rows and one action.
export function phoneArt(ctx) {
  const B = ctx.brand, L = ctx.logo, S = light(ctx), scr = B.ui.screen, c = scr.content, items = c.deliveries.slice(0, 5);
  const lw = fitLogo(ctx, 'horizontal', 120, 24), lh = lw * L.geos.horizontal.h / L.geos.horizontal.w;
  const rows = items.map((d) => `<div class="ph-row" style="border-bottom:1px solid ${S.divider}"><p class="ph-to" style="color:${S.text}">${A(d.to)}</p><div class="ph-sub"><span class="ph-when" style="color:${S.quiet}">${A(d.when)}</span><span class="ph-price" style="color:${spotOf(ctx, S.surface)}">${A(d.price)}</span></div></div>`).join('');
  return fill(S.surface)
    + E(24, 56, 'ar-logo', L.html('horizontal', { width: lw, colourway: 'colour', label: 'Logo' }), { w: lw, h: lh })
    + E(24, 112, 'ph-title', A(scr.title), { w: 342, style: `color:${S.text}` })
    + `<div class="a" style="left:24px;top:176px;width:342px">${rows}</div>`
    + E(24, 760, 'ph-btn', A(`${c.form.book}, ${c.paid}`), { w: 342, h: 52, style: `background:${S.action};color:${S.actionLabel};border-radius:${radius(ctx)}px` });
}

// The post, 1080 x 1350: one line on the action colour.
export function postArt(ctx) {
  const B = ctx.brand, L = ctx.logo, S = light(ctx), cws = B.logo.colourways, line = postLine(ctx);
  let hd = balance2(ctx, line, { w: 936, max: 96, min: 72, step: 2 });
  if (!hd.ok) hd = fitLines(ctx, line, { w: 936, max: 96, min: 56, maxLines: 4 });
  const lhp = hd.size;
  const lum = (hex) => { const n = parseInt(hex.slice(1), 16); return (0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255; };
  const own = Object.keys(cws).find((k) => cws[k].ground.toLowerCase() === S.action.toLowerCase());
  const cw = own || (lum(S.actionLabel) > 0.5 && cws['mono-light'] ? 'mono-light' : 'mono-dark');
  const w = fitLogo(ctx, 'horizontal', 360, 72), h = w * L.geos.horizontal.h / L.geos.horizontal.w;
  return fill(S.action)
    + E(72, 96, 'po-line', hd.lines.map((t) => `<span class="ln">${A(t)}</span>`).join(''), { w: 936, style: `font-size:${hd.size}px;line-height:${lhp}px;color:${S.actionLabel}` })
    + E(72, 1206 + (72 - h) / 2, 'ar-logo', L.html('horizontal', { width: w, colourway: cw, color: cws[cw].name, label: 'Logo' }), { w, h });
}
