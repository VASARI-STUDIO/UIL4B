// Theme 22, Ticket: the daylight street scenes for a brand whose own photograph is a bus shelter (Kerbside). The night plates (the brick wall, the lamp and the bar
// top, light.js) are Encore's: this file does not touch them. Here the engine's own shade lights the print (ctx.mockup, strength 1): the photographs are flat
// daylight, so there is no lamp to relight for, only what the page draws over the photo.
//   poster: photo-busstop, the shelter's own ad panel (the brand's `busstop` shot)
//   ticket: docket-steel, a delivery docket under a bulldog clip on a steel counter
// Scene geometry (note, quad aspect, corners) is read from ctx.sceneInfo, and each art is laid out to the quad's aspect.
import { plateImg } from '../../engine/plate.js';
import { A, px, page, roles, fitLines, fitBlock, textWidth, trackOf, barcodeRectsC } from './helpers.js';
import { ART_ZOOM, root, t, logoAt, printedHoles } from './art.js';

export const STREET_POSTER = 'photo-busstop', STREET_DOCKET = 'docket-steel';
// a brand that ships the bus-shelter shot lives on the street (the night plates stay with the brands that do not)
export const isStreet = (ctx) => !!(ctx.brand.imagery && ctx.brand.imagery.shots || []).some((s) => s.id === 'busstop');

// (the photo-busstop scene used to need an advertiser wordmark patch and a clean-bezel overlay, at fixed px; the generated scene has neither)

const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const rgbHex = (v) => '#' + v.map((c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0')).join('');
// the art laid out to a quad's aspect: width fixed, height = width / aspect, within the engine's 5%
const heightFor = (ctx, scene, w) => 2 * Math.round(w / ctx.sceneInfo(scene).quads[0].aspect / 2);   // even, so the 1.5 zoom gives whole pixels

// ---- the poster: the brand line as large as the sheet allows, a dotted rule, the url and the logo at the foot ----
export function streetPosterArt(ctx, R) {
  const B = ctx.brand, W = 600, H = heightFor(ctx, STREET_POSTER, W), M = 44, line = B.applications.signage.split(/:\s+/).slice(1).join(': ');
  const hw = W - 2 * M, trk = trackOf(ctx), ruleY = H - 192;
  // the largest size, in 2 px steps, at which the head is within six lines, its widest line (a long word is never broken) fits, and it ends well above the rule
  let cap = 170;
  for (; cap > 48; cap -= 2) {
    const f = fitLines(ctx, line, { w: hw, max: cap, min: cap, maxLines: 6 });
    if (f.lines.length <= 6 && f.lines.every((l) => textWidth(ctx, 'display', l, cap, trk) <= hw * 0.98) && f.lines.length * cap * 0.92 <= ruleY - M - 64) break;
  }
  const head = fitBlock(ctx, line, { x: M, y: M, w: hw, max: cap, min: cap, maxLines: 6, color: R.fieldInk });
  // the poster prints at about 0.3 of its source size on the page: 32 px here is about 10 px there
  const inner = head.html + printedHoles(M, W - M, ruleY, R.fieldInk)
    + t(M, ruleY + 24, A(B.applications.site.url), `font:400 32px/40px var(--body);color:${R.fieldInk}`)
    + logoAt(ctx, R, R.field, 0, H - M - 40, 40, { right: W - M, rootW: W });
  return { html: root(W, H, R.field, inner), w: W, h: H, lines: head.lines, size: head.size, line };
}

// ---- the docket: white stock (the photograph's own paper shows above the art, under the clip), the pickup in the brand colour, a perforation, and a stub
// with the rider, the fare and a Code 128 C barcode with 3 px bars. Drawn at 3 times its final size like the night ticket's art ----
export function docketArt(ctx, R) {
  const B = ctx.brand, c = B.ui.screen.content, W = 400, H = heightFor(ctx, STREET_DOCKET, W), P = 16, ink = R.fieldInk, paper = R.paper;
  // the stock is the brand's lightest colour a hair dimmed (and cooler, like the photographed sheet): the engine's shade puts full white where the photo's paper is
  // brightest, which is 8 to 10 levels above the paper the clip shades, so a pure white art stepped against it at the seam under the jaw
  const stock = rgbHex(hexRgb(paper).map((v, i) => v * [0.953, 0.953, 0.965][i]));
  const f = c.form || {}, lt = ctx.roles.light;
  const dark = R.inkOn(paper, 13, 400, '(Docket text on paper)'), quiet = lt.quiet;
  // the headline is the pickup time, small: the sentence "Picked up at 10:52 from 88 Brunswick Street." split at the time (the place goes in the fields below).
  // The barcode prints the same digits, so the paper never shows two different times
  const m = /^(.*?)\s*(\d{1,2}:\d{2})\b/.exec(c.pickup || ''), when = m ? m[2] : c.time, said = m ? m[1].trim() : '';
  const digits = String(when).replace(/\D/g, '').padStart(4, '0');
  const bandY = 64, bandH = 112;
  const head = fitBlock(ctx, when, { x: P + 14, y: bandY + 42, w: W - 2 * (P + 14), max: 52, min: 36, maxLines: 1, color: ink });
  const bc = barcodeRectsC(digits, P, 446, 3, 36, dark);
  // dense small fields, all from the brand's screen data: label over value, two to a row, a hairline over each row
  const cells = [[f.pickup, f.pickupValue], [f.dropoff || c.deliverToLabel, f.dropoffValue || c.deliverTo], ['Rider', c.rider], [f.ready, f.readyValue], ['Status', c.status], [c.paidLabel || 'Paid', c.paid]]
    .filter((x) => x[0] && x[1]);
  const colW = (W - 2 * P - 16) / 2, rowY = 204, rowH = 62;
  const grid = cells.map(([k, v], i) => {
    const x = P + (i % 2) * (colW + 16), y = rowY + Math.floor(i / 2) * rowH;
    return (i % 2 ? '' : `<div class="a" style="left:${P}px;top:${y - 10}px;width:${W - 2 * P}px;height:1px;background:${lt.divider}"></div>`)
      + t(x, y, A(k), `font:600 12px/16px var(--body);color:${quiet};white-space:nowrap`)
      + t(x, y + 18, A(v), `font:600 16px/22px var(--body);font-variant-numeric:tabular-nums;color:${dark};white-space:nowrap`);
  }).join('');
  // the printing: a hair of ink spread on the type and the bars, a rougher edge (and the odd dropout) on the orange block, and a tooth over the whole sheet
  const defs = `<svg class="a" style="left:0;top:0" width="0" height="0" aria-hidden="true"><defs>`
    + `<filter id="dk-text" x="-1%" y="-1%" width="102%" height="102%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="0.3"/></filter>`
    + `<filter id="dk-ink" x="-3%" y="-3%" width="106%" height="106%" color-interpolation-filters="sRGB">`
    + `<feTurbulence type="fractalNoise" baseFrequency="0.35" numOctaves="2" seed="4" result="w"/><feDisplacementMap in="SourceGraphic" in2="w" scale="2.4" xChannelSelector="R" yChannelSelector="G" result="d"/>`
    + `<feGaussianBlur in="d" stdDeviation="0.45" result="s"/>`
    + `<feTurbulence type="fractalNoise" baseFrequency="1.2" numOctaves="2" seed="8" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -16 0 0 0 12.7" result="k"/>`
    + `<feComposite in="s" in2="k" operator="in"/></filter>`
    + `<filter id="dk-tooth" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">`
    + `<feTurbulence type="fractalNoise" baseFrequency="0.95" numOctaves="2" seed="5" result="a"/><feColorMatrix in="a" type="matrix" values="-0.55 0 0 0 1.27  -0.55 0 0 0 1.27  -0.55 0 0 0 1.27  0 0 0 0 1" result="fine"/>`
    + `<feTurbulence type="fractalNoise" baseFrequency="0.12 0.3" numOctaves="2" seed="9" result="b"/><feColorMatrix in="b" type="matrix" values="-0.2 0 0 0 1.1  -0.2 0 0 0 1.1  -0.2 0 0 0 1.1  0 0 0 0 1" result="mott"/>`
    + `<feBlend in="fine" in2="mott" mode="multiply"/></filter></defs></svg>`;
  const printed = logoAt(ctx, R, paper, P, 22, 26)
    + t(0, 30, A(B.applications.site.url), `font:400 12px/16px var(--body);color:${quiet};white-space:nowrap`, { right: W - P }, W)
    + t(P + 14, bandY + 16, A(said), `font:600 14px/18px var(--body);color:${ink};white-space:nowrap`)
    + head.html + grid
    + printedHoles(P, W - P, 418, dark)
    + `<svg class="a" style="left:0;top:0" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true">${bc.svg}</svg>`
    + t(P, 490, A(digits), `font:400 13px/16px var(--mono);color:${dark}`)
    + (c.eta ? t(0, 446, A(c.eta), `font:600 14px/18px var(--body);color:${dark};white-space:nowrap`, { right: W - P }, W) : '');
  const inner = defs
    + `<div class="a" style="left:${P}px;top:${bandY}px;width:${W - 2 * P}px;height:${bandH}px;background:${R.field};filter:url(#dk-ink)"></div>`
    + `<div class="a" style="left:0;top:0;width:${W}px;height:${H}px;filter:url(#dk-text)">${printed}</div>`
    + `<svg class="a" style="left:0;top:0;mix-blend-mode:multiply;-webkit-mask-image:linear-gradient(#0000,#000 44px);mask-image:linear-gradient(#0000,#000 44px)" width="${W}" height="${H}" aria-hidden="true"><rect width="${W}" height="${H}" fill="#fff" filter="url(#dk-tooth)"/></svg>`;
  const zoomed = root(W, H, stock, inner).replace(/class="ar-root([^"]*)" style="/, `class="ar-root$1" style="zoom:${ART_ZOOM};`);
  return { html: zoomed, w: W * ART_ZOOM, h: H * ART_ZOOM, digits, modules: bc.width / 3, mm: [100, Math.round(100 / ctx.sceneInfo(STREET_DOCKET).quads[0].aspect)] };
}

// ---- the signage page: the poster in the shelter, the docket on the counter ----
// note: guidelines.js's dark-zone caption
export function signageStreet(ctx, note) {
  const R = roles(ctx), B = ctx.brand, shade = 1;
  const poster = streetPosterArt(ctx, R), dk = docketArt(ctx, R);
  const art = (a) => ({ html: ctx.artPage(a.html, { w: a.w, h: a.h }), w: a.w, h: a.h });
  const p1 = ctx.mockup(STREET_POSTER, [art(poster)], { shade }), p2 = ctx.mockup(STREET_DOCKET, [art(dk)], { shade });
  const kind = B.applications.signage.split(/:\s+/)[0];
  // the photographs are cropped to the print: win is the part of the scene shown, in scene pixels, in a box of the same proportion
  const photo = (x, y, w, h, src, scene, win, alt, over = '') => {
    const k = w / win.w, si = ctx.sceneInfo(scene);
    return `<div class="a ar" role="img" aria-label="${A(alt)}" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px">${plateImg(`${A(src)}`, ``, `position:absolute;left:${px(-win.x * k)};top:${px(-win.y * k)};width:${px(si.w * k)};height:${px(si.h * k)}`)}${over}</div>`;
  };
  const wP = { x: 942, y: 240, w: 450, h: 675 }, wD = { x: 153, y: 130, w: 1229, h: 860 };
  const body = photo(56, 56, 280, 420, p1, STREET_POSTER, wP, `${B.name} poster in a bus shelter panel, in daylight`)
    + photo(352, 56, 600, 420, p2, STREET_DOCKET, wD, `${B.name} docket on a steel counter, in daylight`);
  const zone = note(56, 532, 280, A(kind), "One line from the brand's voice, with the web address and the logo at the foot.")
    + note(352, 532, 600, A(`Docket, ${dk.mm[0]} x ${dk.mm[1]} mm`), 'The pickup time in the headline; the route, the rider and the fare in the fields; the barcode at the foot.');
  return page(ctx, R, 'signage', { body, zone });
}
