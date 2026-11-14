// Theme 22, Ticket: the pieces that are drawn at their own size inside a page or photographed onto a scene:
// the list sheet and the screen (layouts page), the street poster and the printed ticket (signage page).
// Each function returns { html, w, h }: markup in the piece's own pixels, to be scaled into the page or passed to ctx.artPage.
import { statusText } from '../../engine/tokens.js';
import { A, px, fitBlock, fitLines, textWidth, trackOf, barcodeRectsC, slugOf } from './helpers.js';
export const ART_ZOOM = 1.5;                          // the ticket photograph's art: scale 2 (the engine's) x 1.5 = 3 device px per art px

// a slot-edition piece holds placeholders (the sentinel starts at U+E000): the compact form, as the frame is small and fixed (ph-tight)
export const root = (w, h, bg, inner) => `<div class="ar-root${inner.includes('') ? " ph-tight" : ""}" style="width:${w}px;height:${h}px;background:${bg}">${inner}</div>`;
// absolutely placed text; `right` is the x its right edge sits on
export const t = (x, y, text, style = '', { right = null, w = null, cls = '' } = {}, rootW = 0) =>
  `<div class="a ${cls}" style="${right !== null ? `right:${px(rootW - right)}` : `left:${px(x)}`};top:${px(y)};${w ? `width:${px(w)};` : ''}${style}">${text}</div>`;
const statusOf = (ctx, id) => ctx.status.find((s) => s.id === id);
export const logoAt = (ctx, R, bg, x, y, h, { right = null, rootW = 0 } = {}) => {
  const w = h * ctx.logo.geo.aspect;
  const html = ctx.logo.html('colour', { width: w, colourway: R.colourwayOn(bg), color: R.inkOn(bg, 13, 400, '(Logo slot frame)'), label: 'Logo' });
  return `<div class="a" style="${right !== null ? `left:${px(right - w)}` : `left:${px(x)}`};top:${px(y)};width:${px(w)};height:${px(h)}">${html}</div>`;
};
// a row of printed perforation holes along x, diameter 4, pitch about 10
export const printedHoles = (x0, x1, y, fill) => {
  const n = Math.round((x1 - x0) / 10) + 1, pitch = (x1 - x0) / (n - 1);
  return `<svg class="a" style="left:0;top:0" width="${x1 + 8}" height="${y + 8}" viewBox="0 0 ${x1 + 8} ${y + 8}" aria-hidden="true"><g fill="${fill}">${Array.from({ length: n }, (_, i) => `<circle cx="${Math.round((x0 + i * pitch) * 100) / 100}" cy="${y}" r="2"/>`).join('')}</g></svg>`;
};
const printedHolesV = (x, y0, y1, fill, W, H) => {
  const n = Math.round((y1 - y0) / 10) + 1, pitch = (y1 - y0) / (n - 1);
  return `<svg class="a" style="left:0;top:0" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true"><g fill="${fill}">${Array.from({ length: n }, (_, i) => `<circle cx="${x}" cy="${Math.round((y0 + i * pitch) * 100) / 100}" r="2"/>`).join('')}</g></svg>`;
};

// ---- layouts: piece A, the A4 list sheet, 595 x 842 ----
// crop: { w, h } is the window the layouts page shows (from the sheet's top-left corner): only what lies wholly inside it is drawn, so the page shows a detail
// at a size it can be read, not the whole sheet shrunk. Without a crop the sheet is drawn whole.
export function sheetArt(ctx, R, crop = null) {
  const B = ctx.brand, c = B.ui.screen.content, lt = ctx.roles.light, W = 595, H = 842, M = 48;
  const ground = R.paper;
  const crumbs = B.ui.screen.content.example && B.ui.screen.content.example.crumbs;
  const title = (crumbs && crumbs[crumbs.length - 1]) || B.ui.screen.title;
  const head = fitBlock(ctx, title, { x: M, y: 120, w: crop ? crop.w - M - 56 : W - 2 * M, max: crop ? 72 : 96, min: 48, maxLines: 1, color: lt.text });
  const right = !crop || W - M <= crop.w - 8;
  let rows = '';
  c.deliveries.slice(0, 5).forEach((d, i) => {
    const y = 260 + i * 96, s = statusOf(ctx, d.status), col = s ? statusText(ctx, 'light', s).hex : lt.text;
    if (crop && y + 78 > crop.h) { rows += `<div class="a" style="left:${M}px;top:${y}px;width:${(crop ? crop.w : W) - M}px;height:1px;background:${lt.divider}"></div>`; return; }
    rows += `<div class="a" style="left:${M}px;top:${y}px;width:${crop ? crop.w - M : W - 2 * M}px;height:1px;background:${lt.divider}"></div>`
      + t(M, y + 20, A(d.to), `font:600 24px/30px var(--body);color:${lt.text}`)
      + t(M, y + 54, A(d.when), `font:400 17px/24px var(--body);color:${lt.quiet}`)
      + (right ? t(0, y + 20, A(d.price), `font:600 17px/24px var(--body);font-variant-numeric:tabular-nums;color:${lt.text}`, { right: W - M }, W)
      + t(0, y + 56, A(s ? s.label : ''), `font:600 15px/20px var(--body);color:${col}`, { right: W - M }, W) : '');
  });
  const inner = logoAt(ctx, R, ground, M, M, 32) + head.html + rows
    + (crop ? '' : t(M, 778, A(B.applications.site.url), `font:400 15px/20px var(--body);color:${lt.quiet}`));
  return { html: root(W, H, ground, inner), w: W, h: H, title: title };
}

// ---- layouts: piece B, the 1920 x 1080 screen, drawn on the brand's 12-column grid at 1.5 times its page grid ----
// cropped: draw only the left seven columns (the headline panel), and return the window ({ w, h }) the layouts page shows
export function screenArt(ctx, R, cropped = false) {
  const B = ctx.brand, c = B.ui.screen.content, dk = ctx.roles.dark, W = 1920, H = 1080;
  const g = B.layout, k = W / g.page.w, mg = g.margin * k, gut = g.gutter * k, n = g.columns, col = (W - 2 * mg - (n - 1) * gut) / n;
  const colX = (i) => mg + i * (col + gut);
  const L = 7, leftW = L * col + (L - 1) * gut, rightX = colX(L), rightW = (n - L) * col + (n - L - 1) * gut;
  const crop = cropped ? { w: Math.round(rightX - gut / 2), h: 704 } : null;
  const st = statusOf(ctx, (ctx.status.find((s) => s.label === c.status) || {}).id);
  const stCol = st ? statusText(ctx, 'dark', st).hex : dk.text;
  const eta = fitBlock(ctx, c.eta, { x: mg, y: 352, w: crop ? crop.w - 2 * mg : leftW, max: 220, min: 100, maxLines: 1, color: dk.text });
  let rows = '';
  (cropped ? [] : c.deliveries.slice(0, 5)).forEach((d, i) => {
    const y = 300 + i * 120, s = statusOf(ctx, d.status), sc = s ? statusText(ctx, 'dark', s).hex : dk.text;
    rows += `<div class="a" style="left:${px(rightX)};top:${y}px;width:${px(rightW)};height:1px;background:${dk.divider}"></div>`
      + t(rightX, y + 20, A(d.to), `font:600 36px/44px var(--body);color:${dk.text};white-space:nowrap`)
      + t(rightX, y + 68, A(d.when), `font:400 24px/32px var(--body);color:${dk.quiet};white-space:nowrap`)
      + t(0, y + 24, A(s ? s.label : ''), `font:600 24px/32px var(--body);color:${sc};white-space:nowrap`, { right: rightX + rightW }, W);
  });
  const inner = logoAt(ctx, R, dk.surface, mg, 84, 56)
    + t(mg, 300, A(c.status), `font:600 32px/40px var(--body);color:${stCol}`)
    + eta.html
    + t(mg, cropped ? 576 : 600, A(`${c.rider}. ${c.riderNote}.`), `font:500 40px/48px var(--body);color:${dk.text};white-space:nowrap`)
    + t(mg, cropped ? 636 : 660, A(c.deliverTo), `font:400 32px/40px var(--body);color:${dk.quiet}`)
    + rows
    + (cropped ? '' : t(mg, 980, A(B.applications.site.url), `font:400 24px/32px var(--body);color:${dk.quiet}`));
  return { html: root(W, H, dk.surface, inner), w: W, h: H, crop, grid: { k, mg, gut, n, col, colX } };
}

// ---- signage: the street poster, 594 x 841 (1 px is 1 mm), printed in the field colour ----
// lit: the lamp's layers from light.js (the wall's relief, then the falloff), drawn over the whole sheet, ink included
export function posterArt(ctx, R, { bg = R.field, lit = null } = {}) {
  const B = ctx.brand, W = 594, H = 841, M = 40, line = B.applications.signage.split(/:\s+/).slice(1).join(': ');
  // the largest size, in 2 px steps, at which the head is within four lines and its widest line (a long word is never broken) fits the sheet
  const hw = W - 2 * M, trk = trackOf(ctx);
  let cap = 140;
  for (; cap > 48; cap -= 2) { const f = fitLines(ctx, line, { w: hw, max: cap, min: cap, maxLines: 4 }); if (f.lines.length <= 4 && f.lines.every((l) => textWidth(ctx, 'display', l, cap, trk) <= hw * 0.98)) break; }
  const head = fitBlock(ctx, line, { x: M, y: M, w: hw, max: cap, min: cap, maxLines: 4, color: R.fieldInk });
  const inner = head.html + printedHoles(M, W - M, 560, R.fieldInk)
    // the cover's tagline is not printed here (it would say the same line twice on the page); the url, under the dotted rule, is the one small line left.
    // The poster prints at 0.33 of its source size on the page: 32 px here is 10.5 px there, where 17 was 5.5
    + t(M, 584, A(B.applications.site.url), `font:400 32px/40px var(--body);color:${R.fieldInk}`)
    + logoAt(ctx, R, R.field, 0, 801 - 40, 40, { right: W - M, rootW: W })
    + (lit ? lit.layers : '');
  return { html: root(W, H, bg, inner), w: W, h: H, lines: head.lines, size: head.size };
}

// ---- signage: the printed ticket (or, for a brand that sells nothing with a ticket, the docket), 1040 x 400 (156 x 60 mm) ----
// The bar-top scene's ticket curls up at its right end, so nothing is printed on the last 10% (x past 936): the stub is a little narrower than the spec's.
// bg: the colour printed (the field, toned down by the caller so it sits in the lamp light); the logo's colourway is still chosen on the true field.
export function ticketArt(ctx, R, { bg = R.field, lit = null } = {}) {
  const B = ctx.brand, c = B.ui.screen.content, W = 1040, H = 400, P = 40, stubX = 740, sx = 764;
  const eta = fitBlock(ctx, c.eta, { x: P, y: 96, w: 660, max: 112, min: 48, maxLines: 1, color: R.fieldInk });
  const digits = String(c.time).replace(/\D/g, '').padStart(4, '0'), code = `${slugOf(ctx).toUpperCase()}-${digits}`;
  // Code 128 C, 3 px bars: 57 modules, 171 px (the old Code 128 B at 168 px had 0.75 px bars, which the warp turned into moire)
  const bc = barcodeRectsC(digits, sx, 300, 3, 36, R.fieldInk);
  const inner = printedHolesV(stubX, 16, 384, R.fieldInk, W, H)
    + logoAt(ctx, R, R.field, P, P, 28)
    + eta.html
    + t(P, 236, A(`${c.rider}. ${c.riderNote}.`), `font:600 20px/26px var(--body);color:${R.fieldInk};white-space:nowrap`)
    + t(P, 268, A(c.deliverTo), `font:400 17px/24px var(--body);color:${R.fieldInk};white-space:nowrap`)
    + t(P, 336, A(c.pickup), `font:400 16px/20px var(--body);color:${R.fieldInk}`, { w: 520 })
    + t(0, 336, A(c.paid), `font:600 16px/20px var(--body);font-variant-numeric:tabular-nums;color:${R.fieldInk}`, { right: 700 }, W)
    + t(sx, 40, A(c.from), `font:600 17px/22px var(--body);color:${R.fieldInk};white-space:nowrap`)
    + t(sx, 64, A(c.to), `font:600 17px/22px var(--body);color:${R.fieldInk};white-space:nowrap`)
    + `<svg class="a" style="left:0;top:0" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true">${bc.svg}</svg>`
    + t(sx, 344, A(digits), `font:400 13px/16px var(--mono);color:${R.fieldInk}`)
    + (lit ? lit.layers : '');
  // drawn at 3 times the final size (zoom 1.5 on top of the engine's scale 2): the engine warps a 3120 x 1200 px picture, not a 2080 x 800 one
  const zoomed = root(W, H, bg, inner).replace(/class="ar-root([^"]*)" style="/, `class="ar-root$1" style="zoom:${ART_ZOOM};`);
  return { html: zoomed, w: W * ART_ZOOM, h: H * ART_ZOOM, code, modules: bc.width / 3 };
}
