// Theme 24 (Standards), the applications page (guidelines['business-card']): a sign and a card photographed, each with its drawing and sizes.
// The art is flat svg with outlined text, so the photo, the small drawing and the slot edition all come from one markup.
import { A, f2, roles, adv, wrap, displayFont, outline, capHeight, loadFont, blk, dimH, dimV, cropTicks, ruler, tab, head, page, colourwayFor, artOf, pad3 } from './helpers.js';

import { signScene, signLine, signWhere, sceneClearX, libScene } from './scene-pick.js';
// text as a path: left / right aligned at x, baseline at y
function text(font, str, size, x, y, col, { right = false } = {}) {
  const o = outline(font, str, size, 0);
  return `<path d="${o.d}" fill="${col}" transform="translate(${f2(right ? x - o.x2 : x)} ${f2(y)})"/>`;
}
// the body face nearest a weight (a brand that does not load 600 still gets its heaviest)
function bodyFace(ctx, weight) {
  const fs = ctx.faces.filter((f) => f.role === 'body' && f.style !== 'italic');
  return loadFont(fs.reduce((b, f) => (Math.abs(f.weight - weight) < Math.abs(b.weight - weight) ? f : b)).stem);
}
const svgDoc = (w, h, inner, label) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${A(label)}">${inner}</svg>`;
// the same svg at another size: only the outer tag's width and height change
const sized = (svg, w, h) => svg.replace(/ width="[\d.]+" height="[\d.]+"/, ` width="${f2(w)}" height="${f2(h)}"`);
// the logo placed in an art: the real logo, or in the slot edition a dashed box of the same size
function placeLogo(ctx, id, opts, x, y, col, label) {
  const g = ctx.logo.geos[id], W = opts.width, H = (W * g.h) / g.w;
  if (ctx.edition === 'slot') return `<rect x="${f2(x + 0.75)}" y="${f2(y + 0.75)}" width="${f2(W - 1.5)}" height="${f2(H - 1.5)}" fill="none" stroke="${col}" stroke-width="1.5" stroke-dasharray="8 6"/>` + (label ? text(bodyFace(ctx, 600), label, Math.min(20, W / 8), x + 16, y + H / 2 + 7, col) : '');
  return ctx.logo.svg(id, opts).replace('<svg ', `<svg x="${f2(x)}" y="${f2(y)}" `);
}

// the sign for a brand with no plate of its own: the field, the primary line top-left in the top display weight, the logo at the foot
// safe: the share of the width that stays in the photo's window when the sign is wider than the window; the line wraps inside it
function frame(ctx, { w, h, safe = 1 }) {
  const R = roles(ctx), B = ctx.brand, dws = B.fonts.display.weights, font = displayFont(ctx, dws[dws.length - 1]), inset = w / 15;
  const room = safe < 1 ? w * safe - inset - 40 : w - 2 * inset;
  let size = 0.08 * h, lines = wrap(font, signLine(ctx), size, room);
  for (const k of [0.12, 0.10, 0.08]) { const l = wrap(font, signLine(ctx), k * h, room); if (l.length <= 2) { size = k * h; lines = l; break; } }
  const cap = capHeight(font, size), lead = size * 1.05, geo = ctx.logo.geos.colour, LW = w / 3, LH = (LW * geo.h) / geo.w;
  let s = `<rect width="${w}" height="${h}" fill="${R.field}"/>`;
  lines.forEach((t, i) => { s += text(font, t, size, inset, inset + cap + i * lead, R.fieldInk); });
  s += placeLogo(ctx, 'colour', { width: LW, colourway: colourwayFor(ctx, R.field) }, inset, h - inset - LH, R.fieldInk, 'Your logo goes here');
  return svgDoc(w, h, s, 'Sign');
}

// the business card, 900 x 550 (10 px to the mm)
function card(ctx, side) {
  const R = roles(ctx), B = ctx.brand, c = B.applications.card, W = 900, H = 550;
  if (side === 'front') {
    const g = ctx.logo.geos.colour, LW = 520, LH = (LW * g.h) / g.w;
    return svgDoc(W, H, `<rect width="${W}" height="${H}" fill="${R.field}"/>` + placeLogo(ctx, 'colour', { width: LW, colourway: colourwayFor(ctx, R.field) }, 80, (H - LH) / 2, R.fieldInk, 'Your logo goes here'), 'Card front');
  }
  const semi = bodyFace(ctx, 600), reg = bodyFace(ctx, 400), mid = (top, lh, size, font) => top + lh / 2 + capHeight(font, size) / 2;
  const s = `<rect width="${W}" height="${H}" fill="${R.ground}"/>` + placeLogo(ctx, 'symbol', { width: 96, colourway: 'colour' }, W - 80 - 96, 80, R.ink, '')
    + text(semi, c.person, 60, 80, mid(270, 64, 60, semi), R.ink)
    + text(reg, c.role, 42, 80, mid(342, 48, 42, reg), R.quiet)
    + text(reg, c.contact, 42, 80, mid(424, 48, 42, reg), R.ink);
  return svgDoc(W, H, s, 'Card back');
}

const WHERE_CARD = { 'card-timber-pier': 'on a timber pier', 'card-concrete': 'on concrete', 'card-steel': 'on steel' };

export function applications(ctx) {
  const R = roles(ctx), B = ctx.brand, p = ctx.pages.find((q) => q.id === 'business-card');
  const sceneId = libScene(B.applications.scenes && B.applications.scenes.signage) || signScene(ctx);
  const cardScene = (B.applications.scenes && B.applications.scenes.card) || 'card-timber-pier';
  const sc = ctx.sceneInfo(sceneId), q = sc.quads[0], surf = sc.surfaces[0];
  // the sign art: the brand's own plate when the surface is about 3:2, else the frame at the surface's shape
  const plate = artOf(ctx) && artOf(ctx).plates && artOf(ctx).plates.signage;
  const usePlate = plate && Math.abs(q.aspect / 1.5 - 1) < 0.05;
  const SW = 1200, SH = usePlate ? 800 : Math.round(SW / q.aspect);
  // photo A bleeds top, left and bottom: 634 x 794, the picture scaled to the page height. A sign that fits is centred in the window;
  // a wider one (the billboard) starts 24 px in from the window's left edge and its art keeps the line to the part that shows
  const clrX = sceneClearX(sceneId), s = Math.max(794 / sc.h, 634 / (sc.w * clrX)), iw = sc.w * s, ih = sc.h * s, qx = q.corners.map((c) => c[0] * s), qx0 = Math.min(...qx), qw = Math.max(...qx) - qx0;
  const wide = qw > 634 - 48, ox = Math.min(Math.max(wide ? qx0 - 24 : (qx0 + qw / 2) - 317, 0), iw * clrX - 634);
  const signSvg = usePlate ? plate(ctx, { w: SW, h: SH }) : frame(ctx, { w: SW, h: SH, safe: wide ? 0.61 : 1 });
  // in the photo the sign takes the scene's light: its art is multiplied at 0.94 (a 6% black layer)
  const signLit = signSvg.replace(/<\/svg>$/, `<rect width="${SW}" height="${SH}" fill="#000" opacity="0.06"/></svg>`);
  const urlA = ctx.mockup(sceneId, { [surf]: { html: ctx.artPage(signLit, { w: SW, h: SH }), w: SW, h: SH } });
  const cardArt = (side) => ({ html: ctx.artPage(card(ctx, side), { w: 900, h: 550 }), w: 900, h: 550 });
  const urlB = ctx.mockup(cardScene, { 'card-front': cardArt('front'), 'card-back': cardArt('back') });

  // photo B: the card scene cropped to 406 x 271, zoomed in on the pair of cards so the type on the back is legible
  const cs = ctx.sceneInfo(cardScene), s0 = 406 / cs.w, cp = cs.quads.flatMap((c) => c.corners);
  const bx0 = Math.min(...cp.map((c) => c[0])) * s0, bx1 = Math.max(...cp.map((c) => c[0])) * s0, by0 = Math.min(...cp.map((c) => c[1])) * s0, by1 = Math.max(...cp.map((c) => c[1])) * s0;
  const zoom = Math.max(1, Math.min(1.6, (406 * 0.94) / (bx1 - bx0), (271 * 0.94) / (by1 - by0))), biw = 406 * zoom, bih = 271 * zoom;
  const box = Math.min(Math.max(((bx0 + bx1) / 2) * zoom - 203, 0), biw - 406), boy = Math.min(Math.max(((by0 + by1) / 2) * zoom - 135.5, 0), bih - 271);

  const qy = q.corners.map((c) => c[1] * s), oy = Math.min(Math.max((Math.min(...qy) + Math.max(...qy)) / 2 - 397, 0), ih - 794), where = signWhere(ctx);
  const photoA = `<div class="a" style="left:0;top:0;width:634px;height:794px;overflow:hidden"><svg role="img" aria-label="${A(B.name)} sign ${where}" style="position:absolute;left:${f2(-ox)}px;top:${f2(-oy)}px;width:${f2(iw)}px;height:${f2(ih)}px;max-width:none"><image href="${A(urlA)}" width="100%" height="100%" preserveAspectRatio="none"/></svg></div>`;
  const photoB = `<div class="a" style="left:658px;top:196px;width:406px;height:271px;overflow:hidden"><svg role="img" aria-label="${A(B.name)} business card, front and back, ${WHERE_CARD[cardScene] || 'on a table'}" style="position:absolute;left:${f2(-box)}px;top:${f2(-boy)}px;width:${f2(biw)}px;height:${f2(bih)}px;max-width:none"><image href="${A(urlB)}" width="100%" height="100%" preserveAspectRatio="none"/></svg></div>`;
  // a 2 px contact shadow at 18% black under the sign's bottom edge, with a 3 px fall-off at 9% (the quad, mapped into the window)
  const [tl, tr, br, bl] = q.corners.map((c) => [c[0] * s - ox, c[1] * s - oy]);
  // it falls on what the sign meets: the post (scene x range measured below the sign) or, with no post, the whole lower edge
  const POST = { 'wharf-sign': [608, 926] }, span = POST[sceneId] || [0, sc.w], cx0 = span[0] * s - ox, cx1 = span[1] * s - ox;
  const yAt = (x) => bl[1] + ((br[1] - bl[1]) * (x - bl[0])) / (br[0] - bl[0]), xa = Math.max(cx0, bl[0]), xb = Math.min(cx1, br[0]);
  const band = (d0, d1, o) => `<path d="M${f2(xa)} ${f2(yAt(xa) + d0)}L${f2(xb)} ${f2(yAt(xb) + d0)}L${f2(xb)} ${f2(yAt(xb) + d1)}L${f2(xa)} ${f2(yAt(xa) + d1)}Z" fill="#000" fill-opacity="${o}"/>`;
  const contact = `<clipPath id="app-win"><rect width="634" height="794"/></clipPath><g clip-path="url(#app-win)">${band(0, 2, 0.18)}${band(2, 5, 0.09)}</g>`;

  // sizes in mm: the brand's own sign size if it matches the art, else the art's own (1 art px = 1 mm)
  const m = /(\d+)\s*[x×]\s*(\d+)\s*mm/.exec(B.applications.signage || '');
  // the board in the new library is portrait: a brand that gives its size landscape (1200 x 800) has the same two numbers turned, so use them width first
  const fits = (a, b) => Math.abs(a / b / (SW / SH) - 1) < 0.05;
  const sMm = m && fits(m[1], m[2]) ? [+m[1], +m[2]] : m && fits(m[2], m[1]) ? [+m[2], +m[1]] : [SW, SH];
  // the two drawings, right-aligned so the card's crop marks end on x 1064 (photo B's edge); the first label starts on the column's left edge
  const lw = (t) => adv(loadFont('PublicSans-600'), t, 12), dy = 548, cdw = 124, cdh = Math.round((cdw * 550) / 900);
  const cx = 1058 - cdw, cvx = cx - 16, sdx = 658 + lw(`${sMm[1]} mm`) + 6;                // card x; card dim line x; sign dim line x
  const sx = sdx + 16, sdw = Math.floor(cvx - 6 - lw('55 mm') - 22 - 6 - sx), sdh = Math.round((sdw * SH) / SW);
  const drawing = (svg, x, w, h) => `<div class="a" style="left:${x}px;top:${dy}px;width:${w}px;height:${h}px">${sized(svg, w, h)}</div>`;
  const body = photoA + photoB
    + head(ctx, 'business-card', [{ x1: 658, x2: 1064, col: R.ink, slots: [[658, `${p.section.n} ${p.section.title}`]] }])
    + blk(658, 88, 406, 24, 'c-title', A(p.section.title), `color:${R.ink}`, 'h1')
    + blk(658, 120, 380, 40, 'c-body', 'Each piece here is drawn to the millimetre first, then mocked up in place.', `color:${R.quiet}`, 'p')
    + blk(658, 475, 406, 16, 'c-micro', `Business card, 90 × 55 mm, ${WHERE_CARD[cardScene] || 'on a table'}.`, `color:${R.quiet}`)
    + drawing(signSvg, f2(sx), sdw, sdh) + drawing(card(ctx, 'front'), cx, cdw, cdh)
    + blk(658, 684, 406, 16, 'c-micro', `Left: the sign, mocked up ${where}.`, `color:${R.quiet}`)
    + tab(ctx, p.section.n);
  const svg = (sceneId === 'wharf-sign' ? contact : '')
    + dimH(ctx, { x1: sx, x2: sx + sdw, y: 532, label: `${sMm[0]} mm`, col: R.ink, qcol: R.quiet, obj: dy, above: true })
    + dimV(ctx, { x: sdx, y1: dy, y2: dy + sdh, label: `${sMm[1]} mm`, col: R.ink, qcol: R.quiet, obj: sx })
    + dimH(ctx, { x1: cx, x2: cx + cdw, y: 532, label: '90 mm', col: R.ink, qcol: R.quiet, obj: dy, above: true })
    + dimV(ctx, { x: cvx, y1: dy, y2: dy + cdh, label: '55 mm', col: R.ink, qcol: R.quiet, obj: cx })
    + cropTicks(sx, dy, sdw, sdh, R.ink) + cropTicks(cx, dy, cdw, cdh, R.ink)
    + ruler(ctx, { uid: 'app', pieces: [{ x1: 658, x2: 1064, ink: R.ink, quiet: R.quiet, hair: R.hair }], live: [658, 1064], edgeAnchor: true });
  return page(ctx, 'business-card', { bg: R.ground, body, svg });
}
