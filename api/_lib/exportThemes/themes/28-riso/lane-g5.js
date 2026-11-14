// Lane g5 for theme 28 (Riso): the applications pages round 1 left out (social, signage, email-signature, digital). business-card is round 1's.
// Each page is one sheet off the press, made by sheet(): a plate, a pass and a hit. As in lanes g1 to g4, the hit numeral is a real count taken
// from what the page shows (the posts, the drums the sign face is printed in, the lines of the signature, the kit components on the screen),
// and the words on the plate say what it counts.
// The pieces are riso prints in their own right: a post or a sign face has its own plate and pass, misregistered by its own seed (inkLayers),
// with the words and the logo clean on top. A screen or a mail client is never printed with the press: it is pasted clean onto the sheet, in
// register and unmottled, like a photograph (lane u1's rule), and the kit's own components sit in it unrestyled.
// signage carries the one photographed scene: room-gallery-panel for a brand of rooms, late-door-poster for a street brand (library map, row 28).
// Brand copy is printed whole through A(); text is measured only to choose a size, and the browser wraps it, so a slot placeholder still fits.
import { sheet, A, wrap, inkW, faceFor, faceCss, pressOf, logoOnPlate, fitW, inkLayers, val, r1, X0, X1, W } from './sheet.js';
import { bookBrand } from './copy.js';
import { kitCss } from './lane-u1.js';
import { plateImg } from '../../engine/plate.js';

const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const word = (n) => WORDS[n] || String(n);
const Word = (n) => { const w = word(n); return w[0].toUpperCase() + w.slice(1); };
const andList = (a) => (a.length < 2 ? a.join('') : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`);
const stem = (ctx, role, weight = 400) => faceFor(ctx, role, weight).stem;
// lines a text takes at this size: measured 12 px narrower than it is set, so the browser never wraps sooner than the count says
const nLines = (st, t, size, w) => wrap(st, String(t || ''), size, w - 12).length;
const fit = (st, texts, sizes, w, maxLines) => sizes.find(([s]) => texts.every((t) => nLines(st, t, s, w) <= maxLines && (maxLines > 1 || inkW(st, String(t || ''), s) <= w - 12))) || sizes[sizes.length - 1];
// display sizes from hi down to lo, a line 1.1 of the size
const steps = (hi, lo) => { const o = []; for (let s = Math.round(hi); s >= lo; s -= s > 40 ? 4 : 2) o.push([s, Math.round(s * 1.1)]); return o; };
const plateLabel = (t, x = 403) => `<p class="a c-label" style="left:${x}px;top:48px;color:var(--ptxt)">${t}</p>`;
const plateNote = (t, x, y, w) => `<p class="a c-body" style="left:${x}px;top:${y}px;width:${w}px;color:var(--ptxt)">${t}</p>`;
const hair = (y, x = X0, w = X1 - X0) => `<i class="a g5-hr" style="left:${x}px;top:${y}px;width:${w}px"></i>`;
const label = (x, y, t) => `<p class="a c-label nw" style="left:${x}px;top:${y}px">${t}</p>`;
const note = (x, y, w, t) => `<p class="a c-note" style="left:${x}px;top:${y}px;width:${w}px">${t}</p>`;
const logoAt = (ctx, id, cw, w, x, y) => `<div class="a" style="left:${r1(x)}px;top:${r1(y)}px;width:${r1(w)}px">${ctx.logo.html(id, { width: w, colourway: cw, label: 'Your logo goes here' })}</div>`;
const colourName = (ctx, hex) => { const c = ctx.colours.find((x) => x.hex.toUpperCase() === String(hex).toUpperCase()); return c ? c.name : String(hex).toUpperCase(); };
const swatch = (ctx, x, y, hex, s = 11) => `<i class="a" style="left:${x}px;top:${y}px;width:${s}px;height:${s}px;background:${hex}${ctx.ratio(hex, pressOf(ctx).paper) < 1.3 ? ';box-shadow:inset 0 0 0 .5px var(--hair)' : ''}"></i>`;

// crop marks at every corner of each box: 10 px long, 3 px off the trim, in the key at a half point (as on the layouts sheet)
function cropMarks(boxes) {
  let d = '';
  for (const [x, y, w, h] of boxes) for (const [px, py, sx, sy] of [[x, y, -1, -1], [x + w, y, 1, -1], [x, y + h, -1, 1], [x + w, y + h, 1, 1]]) {
    d += `M${r1(px + sx * 3)} ${r1(py)}H${r1(px + sx * 13)}M${r1(px)} ${r1(py + sy * 3)}V${r1(py + sy * 13)}`;
  }
  return `<svg class="a" width="${W}" height="1123" viewBox="0 0 ${W} 1123" style="left:0;top:0" aria-hidden="true"><path d="${d}" fill="none" style="stroke:var(--key);stroke-width:.5"/></svg>`;
}

// one printed piece placed on the sheet: its own inks (seeded by key), clipped at the trim, then its words and logo clean on top.
// The trim is a stock tint and a half-point key edge, so a piece with bare paper in it still reads as a cut sheet.
const piece = (ctx, key, x, y, w, h, ink, content) => {
  const L = inkLayers(ctx, 'g5:' + key, { w, h, ...ink });
  return `<div class="a g5-pc" style="left:${r1(x)}px;top:${r1(y)}px;width:${r1(w)}px;height:${r1(h)}px">${L.html}<div class="lay" style="z-index:3">${content}</div><i class="g5-trim"></i></div>`;
};
const line = (ctx, text, x, y, w, size, lh, col, extra = '') => `<p class="a g5-ln" style="left:${r1(x)}px;${y}:${r1(extra)}px;width:${r1(w)}px;${faceCss(ctx, 'display', 500)};font-size:${size}px;line-height:${lh}px;color:${col}">${A(text)}</p>`;

export function css(ctx) {
  // the kit's tokens and shipped component styles, for the screen on the digital page (lane u1 writes them for the UI kit document only)
  const kit = ctx.kind === 'guidelines' ? kitCss(ctx) : '';
  return `${kit}
.pg .g5-hr{display:block;height:0;border-top:.5px solid var(--hair)}
.pg .g5-pc{overflow:hidden;isolation:isolate;background:rgba(0,0,0,.035)}
.pg .g5-trim{position:absolute;inset:0;z-index:5;box-shadow:inset 0 0 0 .5px color-mix(in srgb,var(--key) 40%,transparent);pointer-events:none}
.pg .g5-ln{margin:0;letter-spacing:-.01em;text-wrap:balance}
.pg .g5-ph{position:absolute;overflow:hidden}
.pg .g5-ph img,.pg .g5-ph svg.pl{position:absolute;max-width:none;display:block}
.pg .g5-scr{position:absolute;overflow:hidden;isolation:isolate;outline:.5px solid var(--hair)}
.pg .g5-mail{position:absolute;display:flex;flex-direction:column}
.pg .g5-pane{outline:.5px solid var(--hair);padding:20px 24px 24px}
.pg .g5-mh{display:grid;grid-template-columns:48px 1fr auto;column-gap:8px;row-gap:2px;padding-bottom:14px;border-bottom:.5px solid var(--g5-div)}
.pg .g5-mh .g5-s{grid-column:1/4;margin-bottom:8px}
.pg .g5-mb{display:flex;flex-direction:column;gap:12px;padding-top:16px;max-width:62ch}
.pg .g5-sig{display:flex;flex-direction:column;gap:12px;margin-top:12px;padding-top:16px;border-top:.5px solid var(--g5-div);width:max-content}
.pg .g5-spec{display:grid;grid-template-columns:136px 1fr auto;column-gap:16px;margin-top:28px}
.pg .g5-spec>*{padding:6px 0;border-top:.5px solid var(--hair)}
.pg .ui.g5-desk{width:960px;height:600px;overflow:hidden;display:flex;flex-direction:column;background:var(--surface)}
.pg .ui.g5-desk .ui-topbar,.pg .ui.g5-ph1 .ui-topbar{flex:none}
.pg .g5-main{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:48px;padding:40px 48px 0}
.pg .g5-col{display:flex;flex-direction:column;align-items:flex-start;gap:16px;min-width:0}
.pg .g5-col>*{max-width:100%}
.pg .g5-eta{margin:0;font-size:var(--fs-display);line-height:var(--lh-display)}
.pg .g5-soft{margin:0;color:var(--text-soft)}
.pg .g5-prog{width:100%;display:flex;flex-direction:column;gap:6px}
.pg .g5-ends{display:flex;justify-content:space-between;gap:12px;font-size:var(--fs-caption);line-height:var(--lh-caption);color:var(--quiet)}
.pg .g5-rid{width:100%;display:flex;align-items:center;gap:12px}
.pg .g5-who{flex:1;min-width:0}
.pg .g5-b{margin:0;font-weight:600}
.pg .g5-q{margin:0;color:var(--quiet);font-size:var(--fs-label);line-height:var(--lh-label)}
.pg .g5-form{display:flex;flex-direction:column;gap:12px;margin-top:8px}
.pg .g5-rows{padding:32px 48px 0}
.pg .ui.g5-ph1{width:390px;height:600px;overflow:hidden;display:flex;flex-direction:column;background:var(--surface)}
.pg .g5-pbody{display:flex;flex-direction:column;align-items:flex-start;gap:14px;padding:24px 20px 0}
.pg .g5-pbody>*{max-width:100%}
.pg .g5-pbody .ui-list{width:100%}
.pg .g5-tlogo{display:block;flex:none}
`;
}

// ================================================================ the pages

export const guidelines = {
  // Social: three posts cut from one sheet, each in a shape a feed takes (square, portrait, story), at one scale, with crop marks at their
  // corners. Each post is its own print: its own plate and pass, out of register by its own seed, carrying one of the brand's social lines.
  // The hit is the number of posts.
  social(ctx) {
    const B = bookBrand(ctx), P = pressOf(ctx), soc = B.applications.social || [], dst = stem(ctx, 'display', 500);
    const lines = [0, 1, 2].map((i) => soc[i] || [B.lines.primary, ...(B.lines.others || [])][i] || B.lines.primary);
    const cwP = logoOnPlate(ctx), k = 220 / 1080;
    // square: the plate holds the top three fifths and the line; the pass runs down the right edge; the logo on the paper below
    const sq = (() => {
      const w = 220, h = 220, p = 18, pw = Math.round(w * 0.13), ph = Math.round(h * 0.62), tw = w - 2 * p - pw;
      const [s, l] = fit(dst, [lines[0]], steps(30, 14).filter(([, ll]) => ll * 3 <= ph - 2 * p), tw, 3);
      const lw = fitW(ctx, 'colour', 110, 40), lh = (ctx.logo.geos.colour.h * lw) / ctx.logo.geos.colour.w;
      return { w, h, ink: { plate: { x: -4, y: -4, w: w + 8, h: ph + 4 }, pass: { x: w - pw, y: -4, w: pw + 4, h: h + 8 }, hit: null },
        html: `${line(ctx, lines[0], p, 'top', tw, s, l, 'var(--ptxt)', p)}${logoAt(ctx, 'colour', 'colour', lw, p, h - p - lh)}` };
    })();
    // portrait: the plate floods the post; the pass crosses it as a band, so the overprint is the post's third colour; the logo under the band
    const pt = (() => {
      const w = 220, h = 275, p = 18, by = Math.round(h * 0.6), bh = Math.round(h * 0.075), tw = w - 2 * p;
      const [s, l] = fit(dst, [lines[1]], steps(30, 14).filter(([, ll]) => ll * 4 <= by - 2 * p), tw, 4);
      const lw = fitW(ctx, 'colour', 110, 40), lh = (ctx.logo.geos.colour.h * lw) / ctx.logo.geos.colour.w;
      return { w, h, ink: { plate: { x: -4, y: -4, w: w + 8, h: h + 8 }, pass: { x: -4, y: by, w: w + 8, h: bh }, hit: null },
        html: `${line(ctx, lines[1], p, 'top', tw, s, l, 'var(--ptxt)', p)}${logoAt(ctx, 'colour', cwP, lw, p, h - p - lh)}` };
    })();
    // story: the line on bare paper, the plate below holding the logo, the pass down the left edge across both; type keeps 250 px (at 1080) clear
    // of the top and the bottom, where the feed lays its own controls
    const ks = 335 / 1080, st = (() => {
      const w = 335, h = Math.round((1920 * w) / 1080), safe = Math.round(250 * ks), pw = Math.round(w * 0.1), p = 22, px = pw + p, tw = w - px - p;
      const py = Math.round(h * 0.56);
      const [s, l] = fit(dst, [lines[2]], steps(44, 16).filter(([, ll]) => ll * 5 <= py - safe - 24), tw, 5);
      const lw = fitW(ctx, 'colour', 170, 56), lh = (ctx.logo.geos.colour.h * lw) / ctx.logo.geos.colour.w;
      return { w, h, safe, ink: { plate: { x: -4, y: py, w: w + 8, h: h - py + 4 }, pass: { x: -4, y: -4, w: pw + 4, h: h + 8 }, hit: null },
        html: `${line(ctx, lines[2], px, 'top', tw, s, l, 'var(--key)', safe)}${logoAt(ctx, 'colour', cwP, lw, px, h - safe - lh)}` };
    })();
    const X = 49, Y = 288, sx = X1 - st.w, n = 3;
    const posts = [[sq, X, Y, 'square'], [pt, X, Y + 220 + 100, 'portrait'], [st, sx, Y, 'story']];
    let body = posts.map(([o, x, y, key]) => piece(ctx, 'post:' + key, x, y, o.w, o.h, o.ink, o.html)).join('');
    body += cropMarks(posts.map(([o, x, y]) => [x, y, o.w, o.h]));
    const cap = (x, y, w, name, size, t) => `${label(x, y, name)}<p class="a c-value nw" style="left:${x + 64}px;top:${y}px">${size}</p>${note(x, y + 20, w, t)}`;
    body += cap(X, Y + 220 + 16, 220, 'Square', '1080 × 1080 px', 'The line on the plate, the logo on the paper.');
    body += cap(X, Y + 320 + 275 + 16, 220, 'Portrait', '1080 × 1350 px', 'The plate floods the post; the pass crosses it.');
    body += cap(sx, Y + st.h + 16, st.w, 'Story', '1080 × 1920 px', `The line on the paper, the logo on the plate. Both keep ${val('250 px')} clear of the top and the bottom.`);
    body += `<i class="a" style="left:${sx - 18}px;top:${r1(Y + st.safe)}px;width:12px;height:.5px;background:var(--key)"></i><i class="a" style="left:${sx - 18}px;top:${r1(Y + st.h - st.safe)}px;width:12px;height:.5px;background:var(--key)"></i>`;
    const inner = `${plateLabel('Social')}
${plateNote(`<b style="font-weight:600">${Word(n)} posts</b><br>one for each shape a feed takes, cut from one sheet. Each carries one of the brand's own social lines.`, 403, 72, 224)}${body}`;
    return sheet(ctx, 'social', { hp: 232, hit: { text: String(n), x: 49, base: 200, size: 200, maxW: 300 } }, inner);
  },

  // Signage: the sign face, flat and large, beside the photograph of it in place. The face is a riso print at the scene's own proportion: the
  // plate holds the logo and the line, the pass runs down its right edge, the site sits on the paper below. Under them, the drums it is printed
  // in, one row a drum with what that drum prints. The hit is the number of drums.
  signage(ctx) {
    const Br = ctx.brand, P = pressOf(ctx), street = /street/i.test(JSON.stringify(Br.imagery));
    const scene = street ? 'photo-busstop' : 'room-gallery-panel', S = ctx.sceneInfo(scene), q = S.quads[0], asp = q.aspect;
    const brief = String(Br.applications.signage || '');
    // the line the brand's signage brief closes on; else the primary line. Compared whole, never cut out of the brief.
    const face = [Br.lines.primary, ...(Br.lines.others || [])].find((t) => t && brief.endsWith(t)) || Br.lines.primary;
    const urlHit = ctx.ratio(P.hit, P.paper) >= 4.5;
    const dst = stem(ctx, 'display', 500), bst = stem(ctx, 'body', 600);
    const signFace = (key, w) => {
      const h = Math.round(w / asp), s = w / 400, p = Math.round(28 * s), pw = Math.round(w * 0.12), ph = Math.round(h * 0.6), tw = w - 2 * p - pw;
      const lw = fitW(ctx, 'colour', Math.round(w * 0.46), Math.round(h * 0.15));
      const [ls, ll] = fit(dst, [face], steps(w * 0.14, 12).filter(([, l]) => l * 3 <= ph - 3 * p - h * 0.15), tw, 3);
      const us = Math.max(8, Math.round(16 * s));
      const ink = { plate: { x: -6, y: -6, w: w + 12, h: ph + 6 }, pass: { x: w - pw, y: -6, w: pw + 6, h: h + 12 }, hit: null };
      const html = `${logoAt(ctx, 'colour', logoOnPlate(ctx), lw, p, p)}
${line(ctx, face, p, 'bottom', tw, ls, ll, 'var(--ptxt)', h - ph + p)}
<p class="a nw" style="left:${p}px;bottom:${p}px;${faceCss(ctx, 'body', 600)};font-size:${us}px;line-height:${Math.round(us * 1.25)}px;color:${urlHit ? 'var(--hit)' : 'var(--key)'}">${A(Br.applications.site.url)}</p>`;
      return { w, h, ink, html };
    };
    // the art for the photograph, at 400 px across
    const art = signFace('sign:art', 400);
    const L = inkLayers(ctx, 'g5:sign', { w: art.w, h: art.h, ...art.ink });
    const surf = 'panel';
    const shot = ctx.mockup(scene, { [surf]: { html: ctx.artPage(`${L.html}<div class="lay" style="z-index:3">${art.html}</div>`, { w: art.w, h: art.h }), w: art.w, h: art.h } });
    // the flat face, 300 px across, and the photograph beside it at the same height, cropped to the full height of the scene around the sign
    const fw = 300, fl = signFace('sign:flat', fw), FY = 288;
    const dw = X1 - (X0 + fw + 24), dh = fl.h, kk = dh / S.h, cw = dw / kk;
    const qx = q.corners.map((c) => c[0]), x0 = Math.max(0, Math.min(S.w - cw, Math.min(...qx) - 20));
    const photo = `<div class="g5-ph" style="left:${X0 + fw + 24}px;top:${FY}px;width:${dw}px;height:${dh}px">${plateImg(A(shot), `${A(Br.name)} sign face in place`, `left:${r1(-x0 * kk)}px;top:0;width:${r1(S.w * kk)}px;height:${r1(S.h * kk)}px`)}</div>`;
    // the drums this face is printed in: plate, pass, the type (key) and, where it reads on paper, the site in the hit; one row a drum
    const uses = [[P.plateDrum, 'Plate'], [P.passDrum, 'Pass'], [P.keyDrum, 'Type'], ...(urlHit ? [[P.hitDrum, 'Site address']] : [])];
    const drums = [];
    for (const [d, role] of uses) { const o = drums.find((x) => x.hex.toUpperCase() === d.hex.toUpperCase()); if (o) o.roles.push(role); else drums.push({ hex: d.hex, name: d.name, roles: [role] }); }
    const n = drums.length, TY = FY + fl.h + 120;
    const rows = drums.map((d, i) => { const y = TY + 28 + i * 28; return `${hair(y)}${swatch(ctx, 49, y + 9, d.hex)}<p class="a c-note nw" style="left:69px;top:${y + 6}px;font-weight:600">${A(d.name)}</p><p class="a c-note nw" style="left:229px;top:${y + 6}px">${andList(d.roles.map((r, j) => (j ? r.toLowerCase() : r)))}</p><p class="a c-value nw" style="right:${W - X1}px;top:${y + 7}px">${A(d.hex.toUpperCase())}</p>`; }).join('');
    const where = street ? 'In place: the poster panel in a bus shelter, on the street it is for.' : 'In place: the panel on a gallery wall.';
    const inner = `${plateLabel('Signage')}
${plateNote(`<b style="font-weight:600">${Word(n)} drum${n === 1 ? '' : 's'}</b><br>print the sign face. Each is listed below with what it prints.`, 403, 72, 224)}
${piece(ctx, 'sign:flat', X0, FY, fl.w, fl.h, fl.ink, fl.html)}${cropMarks([[X0, FY, fl.w, fl.h]])}${photo}
${label(X0, FY + fl.h + 20, 'The sign face')}${/\bfree\b/i.test(face) ? '' : note(X0, FY + fl.h + 40, fw, A(brief))}
${note(X0 + fw + 24, FY + fl.h + 20, dw, where)}
${label(X0, TY, 'Printed in')}${rows}${hair(TY + 28 + n * 28)}`;
    return sheet(ctx, 'signage', { hp: 232, hit: { text: String(n), x: 49, base: 200, size: 200, maxW: 300 } }, inner);
  },

  // Email signature: the message as it renders in a mail client, pasted clean onto the sheet (a screen is never printed with the press), with
  // the signature closing it. Under it, how each part of the signature is set. The hit is the number of lines of type under the logo.
  'email-signature'(ctx) {
    const B = ctx.brand, P = pressOf(ctx), e = B.applications.email || {}, c = B.applications.card || {}, g = (B.guideB && B.guideB.email) || {};
    const lt = ctx.roles.light, surf = lt.surface, ink = lt.text;
    const linkCol = ctx.ratio(P.hit, surf) >= 4.5 ? P.hit : ink;
    const F = B.fonts.body, w4 = faceFor(ctx, 'body', 400).weight, w6 = faceFor(ctx, 'body', 600).weight;
    const lw = fitW(ctx, 'colour', 160, 44);
    const parts = [
      [e.person, 'Name', `${w6}, ${val('15 / 20 px')}`, `font-size:15px;line-height:20px;${faceCss(ctx, 'body', 600)}`, ink],
      [e.role, 'Role', `${w4}, ${val('13 / 18 px')}`, `font-size:13px;line-height:18px;${faceCss(ctx, 'body', 400)}`, ink],
      [c.contact, 'Address', `${w4}, ${val('13 / 18 px')}`, `font-size:13px;line-height:18px;${faceCss(ctx, 'body', 400)}`, ink],
      [B.applications.site.url, 'Site', `${w6}, ${val('13 / 18 px')}, in ${A(colourName(ctx, linkCol))}`, `font-size:13px;line-height:18px;${faceCss(ctx, 'body', 600)}`, linkCol],
    ].filter((r) => r[0]);
    const n = parts.length;
    const t12 = `font-size:12px;line-height:17px;${faceCss(ctx, 'body', 400)}`, t14 = `font-size:14px;line-height:21px;${faceCss(ctx, 'body', 400)}`;
    const head = `<div class="g5-mh"><p class="g5-s" style="font-size:18px;line-height:24px;${faceCss(ctx, 'body', 600)}">${A(g.subject || '')}</p>
<p style="${t12}">From</p><p style="${t12}">${A(e.person)}, ${A(c.contact)}</p><p style="${t12};text-align:right">${A(g.time || '')}</p>
<p style="${t12}">To</p><p style="${t12}">${A(g.to || '')}</p><p></p></div>`;
    const body = `<div class="g5-mb">${(g.body || []).map((t) => `<p style="${t14}">${A(t)}</p>`).join('')}</div>`;
    const sig = `<div class="g5-sig"><div style="width:${lw}px">${ctx.logo.html('colour', { width: lw, colourway: 'colour', label: 'Your logo goes here' })}</div><div>${parts.map(([t, , , st, col]) => `<p class="nw" style="${st};color:${col}">${A(t)}</p>`).join('')}</div></div>`;
    const pane = `<div class="g5-pane" style="--g5-div:${ink}33;background:${surf};color:${ink}">${head}${body}${sig}</div>`;
    const spec = `<div class="g5-spec"><p class="c-note" style="font-weight:600">Logo</p><p class="c-note">The colour version, on the message's white</p><p class="c-value" style="text-align:right">${lw} px wide</p>
${parts.map(([, nm, how]) => `<p class="c-note" style="font-weight:600">${nm}</p><p class="c-note">${A(F.family)} ${how}</p><p></p>`).join('')}</div>`;
    const inner = `${plateLabel('Email signature')}
${plateNote(`<b style="font-weight:600">${Word(n)} lines</b><br>under the logo, set as live text, so the signature still reads with images turned off.`, 403, 72, 224)}
${label(X0, 224 + 32, 'As it arrives')}
<div class="g5-mail" style="left:${X0}px;top:${224 + 56}px;width:${X1 - X0}px">${pane}${spec}</div>`;
    return sheet(ctx, 'email-signature', { hp: 224, hit: { text: String(n), x: 49, base: 192, size: 190, maxW: 300 } }, inner);
  },

  // Digital: the brand's own site, built from the UI kit's components, pasted clean onto the sheet at two widths (a screen is never printed
  // with the press). Beside the phone, the components it is made of, one row each with its class. The hit is the number of components.
  digital(ctx) {
    const B = ctx.brand, S = B.ui.screen.content, ui = ctx.ui, F = S.form || {}, X = S.example || {};
    const live = (ctx.status.find((s) => s.label === S.status) || {}).id || S.deliveries[0].status;
    const pc = Math.max(0, Math.min(1, S.progress || 0)) * 100;
    const g = ctx.logo.geos.colour, lh = 28, lwT = Math.min(170, (lh * g.w) / g.h);
    const tlogo = (w) => `<span class="g5-tlogo" style="width:${r1(w)}px">${ctx.logo.html('colour', { width: w, colourway: 'colour', label: 'Logo' })}</span>`;
    const prog = `<div class="g5-prog"><div class="ui-progress" role="img" aria-label="${A(S.from)} to ${A(S.to)}"><div class="ui-progress__bar"><i style="width:${pc}%"></i></div><span class="ui-progress__dot" style="left:${pc}%"></span></div><div class="g5-ends"><span>${A(S.from)}</span><span>${A(S.to)}</span></div></div>`;
    const rider = `<div class="g5-rid"><span class="ui-avatar" aria-hidden="true">${A(S.initials)}</span><div class="g5-who"><p class="g5-b">${A(S.rider)}</p><p class="g5-q">${A(S.riderNote)}</p></div>${ui.btn(S.call, { variant: 'secondary', size: 'sm' })}</div>`;
    const bar = `<nav class="ui-topbar" aria-label="Main">${tlogo(lwT)}<div class="ui-topbar__links">${ui.links(X.links || [], 0)}</div>${ui.btn(F.book || S.share, { size: 'sm' })}</nav>`;
    const form = `<div class="g5-form">${ui.field({ id: 'g5-d1', label: F.size, kind: 'select', options: F.sizes || [], value: (F.sizes || [])[0] })}${ui.field({ id: 'g5-d2', label: F.dropoff, type: 'email', value: F.dropoffValue })}${ui.btn(F.book, { block: true })}</div>`;
    const desk = `<div class="ui g5-desk">${bar}<div class="g5-main"><div class="g5-col">${ui.statusChip(live)}<h2 class="ui-display g5-eta">${A(S.eta)}</h2><p class="g5-soft">${A(S.pickup)}</p>${prog}${rider}</div>${ui.card({ title: F.title, raised: true, action: form })}</div><div class="g5-rows">${ui.deliveryRows(2)}</div></div>`;
    const phone = `<div class="ui g5-ph1"><nav class="ui-topbar" aria-label="Main">${tlogo(Math.min(120, lwT))}<span class="ui-avatar" aria-label="${A(X.account || S.initials)}">${A(S.initials)}</span></nav><div class="g5-pbody">${ui.statusChip(live)}<h2 class="ui-display g5-eta" style="font-size:var(--fs-headline);line-height:var(--lh-headline)">${A(S.eta)}</h2><p class="g5-soft">${A(S.pickup)}</p>${prog}${ui.deliveryRows(2)}${ui.btn(F.book, { block: true })}</div></div>`;
    const used = [['Top bar', '.ui-topbar'], ['Link', '.ui-link'], ['Button', '.ui-btn'], ['Status chip', '.ui-chip'], ['Progress', '.ui-progress'], ['Avatar', '.ui-avatar'], ['Card', '.ui-card'], ['Field', '.ui-field'], ['List row', '.ui-list']];
    const n = used.length;
    const DY = 264, dk = (X1 - X0) / 960, dh = r1(600 * dk);
    const PY = DY + dh + 48, pw = 234, pk = pw / 390, ph = r1(600 * pk);
    const shot = (x, y, w, h, k, html) => `<div class="g5-scr" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px"><div style="zoom:${k}">${html}</div></div>`;
    const TX = X0 + pw + 40, rows = used.map(([nm, cl], i) => { const y = PY + 28 + i * 24; return `${hair(y, TX, X1 - TX)}<p class="a c-note nw" style="left:${TX}px;top:${y + 4}px;font-weight:600">${nm}</p><p class="a c-value nw" style="right:${W - X1}px;top:${y + 5}px">${cl}</p>`; }).join('');
    const inner = `${plateLabel('Digital')}
${plateNote(`<b style="font-weight:600">${Word(n)} components</b><br>from the UI kit make the site, as the code package ships them.`, 403, 72, 224)}
${shot(X0, DY, X1 - X0, dh, r1(dk * 10000) / 10000, desk)}

<p class="a c-label nw" style="left:${X0}px;top:${DY + dh + 14}px">${A(B.ui.screen.title)}, desktop</p><p class="a c-value nw" style="right:${W - X1}px;top:${DY + dh + 14}px">960 px wide, at ${Math.round(dk * 100)}%</p>
${shot(X0, PY, pw, ph, r1(pk * 10000) / 10000, phone)}
<p class="a c-label nw" style="left:${X0}px;top:${r1(PY + ph + 12)}px">Phone</p><p class="a c-value nw" style="left:${X0 + 48}px;top:${r1(PY + ph + 12)}px">390 px wide, at ${Math.round(pk * 100)}%</p>
${label(TX, PY, 'Made of')}${rows}${hair(PY + 28 + n * 24, TX, X1 - TX)}
${note(TX, PY + 28 + n * 24 + 14, X1 - TX, 'The same components at both widths, each cropped to its first 600 px. The page arranges them; it never restyles one.')}`;
    return sheet(ctx, 'digital', { hp: 232, hit: { text: String(n), x: 49, base: 200, size: 200, maxW: 300 } }, inner);
  },
};
