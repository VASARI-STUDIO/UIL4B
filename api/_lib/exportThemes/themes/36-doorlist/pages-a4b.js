// Theme 36, Doorlist: the A4 portrait edition (794 x 1123), pages 17 to 31 (Type, Layout, In use, Close; the openers are in pages-a4a.js). Same system as pages-a4a.js: margins 40, four
// columns of 165 with 18 gutters, rows of 48 from y 40, the list row at y 1075. Mockup pages (in use, compositions, digital, print, social, contact) draw designed flat layouts: the poster,
// the plates, the phone, the wristband and the marquee are shown as art on colour fields, and photographs keep their 3:4 crops. Encore's words come from showcase.js through copy().
import { typeLadder } from '../../engine/styleguide.js';
import { groundsOf, tones, mix, at, hr, fill, svgAt, field, measure, word, baseTop, ghost, ghostRule, isGhost, hl, PHOTO_NOTE, nameOf as cust, page, n1, pad, fullFolio, varsOf } from './kit.js';
import { copy } from './showcase.js';
import { photo } from './photos.js';
import { flat } from './mockups.js';
import { posterArt, POSTER_W, POSTER_H } from './pages-3.js';
import { webArt, phoneArt, bandArt, ticket, marqueeArt, slotPic, symbol } from './pages-4.js';
import { cover, palette, L, R, CW, FOOT } from './pages-a4a.js';

const slotOn = (ctx) => ctx.edition === 'slot';
const nt = (ctx, s) => `<span class="nt">${ctx.esc(s)}</span>`;
const gl = (ctx, line) => ghostRule(ctx, line, '');
const H1 = (txt, x = L, y = 40, w = CW, size = 40) => at(x, y, w, Math.round(size * 1.15), `<h1 class="h1" style="font-size:${size}px;line-height:1.1">${txt}</h1>`);
const lab = (ctx, x, y, w, s, q = false) => at(x, y, w, 16, `<span class="lb${q ? ' q' : ''}">${ctx.esc(s)}</span>`);
const mono = (ctx, x, y, w, s, q = false) => at(x, y, w, 18, `<span class="m13${q ? ' q' : ''}">${ctx.esc(s)}</span>`);
const weightsOf = (ctx, role) => [...new Set(ctx.faces.filter((f) => f.role === role && f.style !== 'italic').map((f) => f.weight))].sort((a, b) => a - b).slice(0, 4);
const realOf = (ctx, s) => (typeof ctx.real === 'function' ? ctx.real(s) : String(s));
const cname = (ctx, hex) => { const c = [...ctx.colours, ...(ctx.tones || [])].find((x) => x.hex && x.hex.toLowerCase() === String(hex).toLowerCase()); return c && c.name ? ctx.esc(realOf(ctx, c.name)) : String(hex).toUpperCase(); };
// the headline slot of type.sample.headline: the user's words or ghost type
const headline = (ctx, fb, ghostText = 'Your headline, up to 6 words.') => { const v = copy(ctx, 'type.sample.headline'); return !slotOn(ctx) ? ctx.esc(fb) : isGhost(ctx, v) ? gl(ctx, ghostText) : ctx.esc(v); };
const HEAD_NOTE = 'Your headline, 5 to 8 words. Example: Fresh bread, warm by six.';
// an A4 page drawn as art inside another page (its section becomes a div, named so the harness does not count it as a page)
const asArt = (html, name) => html.replace(/^<section class="pg dl" data-page="[^"]*" style="/, `<div class="pg dl" data-page="${name}" style="break-after:auto;break-inside:auto;position:relative;width:794px;height:1123px;`).replace(/<\/section>$/, '</div>');

// ---- 18 Typefaces, family CS "Cropped specimen": the display face's name cut by the right edge, its glyphs, then one row for each of the three faces ----
function faces(ctx) {
  const G = groundsOf(ctx), g = G.stock, M = measure(ctx), E = ctx.esc, B = ctx.brand, W = ctx.weights;
  const dn = String(B.fonts.display.family), bn = String(B.fonts.body.family), mn = 'DM Mono';
  const size = Math.min(300, M.fit(dn, CW, 300));
  let out = lab(ctx, L, 40, 400, 'Typefaces') + at(454, 40, 300, 16, `<span class="m" style="display:block;text-align:right">Display, weight ${W.heading}</span>`) + word(M, L, 104 + M.cap * size, E(dn), size);
  ['ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz', '0123456789'].forEach((ln, i) => { out += word(M, L, 372 + i * 44, ln, Math.min(34, M.fit(ln, CW, 34))); });
  out += hr(L, 470, CW, 'var(--ink)', 2);
  const set = [['Display', dn, [W.heading], 'font-family:var(--display);font-weight:' + W.heading + ';letter-spacing:-.01em'], ['Reading', bn, weightsOf(ctx, 'body'), 'font-family:var(--body);font-weight:400'], ['Values', mn, [400], 'font-family:var(--mono);font-weight:400']];
  set.forEach(([label, fam, ws, css], i) => {
    const y = 472 + i * 132, role = copy(ctx, `page.faces.role.${i}`, '');
    out += (i ? hr(L, y, CW, 'var(--hair)') : '') + lab(ctx, L, y + 24, 90, label)
      + at(L + 96, y + 16, 150, 88, `<span style="${css};font-size:64px;line-height:88px;white-space:nowrap;display:block">Aa</span>`)
      + at(330, y + 24, 424, 24, `<span style="font:600 18px/24px var(--body)">${E(fam)}</span>`) + at(330, y + 54, 424, 18, `<span class="m">${ws.join(', ')}</span>`)
      + (role ? at(330, y + 82, 424, 40, `<div class="cap" style="line-height:20px;color:var(--quiet)">${E(role)}</div>`) : '');
  });
  const para = copy(ctx, 'page.faces.text', `${dn} sets headlines and names. ${bn} sets reading and small print. ${mn} sets values only.`);
  out += hr(L, 868, CW, 'var(--ink)') + at(L, 888, 640, 96, `<div class="b">${E(para)}</div>`);
  return page(ctx, 'faces', g, out);
}

// ---- 19 Scale, family BL "Bill": the engine's steps at their own size, largest first, each with its token and size over it ----
function scalePage(ctx) {
  const G = groundsOf(ctx), g = G.red, t = tones(ctx, g), M = measure(ctx), E = ctx.esc, L_ = typeLadder(ctx), n = L_.length;
  const rows = L_.map((s) => {
    const text = copy(ctx, `page.scale.${L_.indexOf(s)}`, s.use), disp = s.face === 'display';
    const size = disp ? Math.min(s.size, M.fit(text, CW, s.size)) : s.size, cap = disp ? M.cap : 0.66;
    return { s, text, disp, size, h: cap * size, d: 0.24 * size };
  });
  const top = 112, bot = 1040, LB = 40, used = rows.reduce((a, r) => a + LB + r.h + r.d, 0), gap = Math.max(10, Math.min(96, (bot - top - used) / Math.max(n - 1, 1)));
  let out = lab(ctx, L, 40, 300, 'Type scale') + at(223, 40, 531, 34, `<span class="m" style="display:block;text-align:right;white-space:normal;line-height:17px">${E(copy(ctx, 'page.scale.note', 'Largest first, each at its own size.'))}</span>`) + hr(L, 80, CW, t.ink, 2);
  let y = top;
  rows.forEach((r, i) => {
    const b = y + LB + r.h, lh = Math.round(r.size * 1.3);
    if (i) out += hr(L, y - gap / 2, CW, t.hair);
    out += at(L, y, CW, 16, `<span class="m">${E(r.s.token)}</span><span class="m" style="margin-left:16px">${n1(r.size)} / ${r.s.lineRatio}</span>`)
      + (r.disp ? word(M, L, b, E(r.text), r.size) : at(L, baseTop(b, r.size, lh), CW, lh, E(r.text), { style: `font:${r.s.weight} ${n1(r.size)}px/${lh}px var(--body);color:var(--ink);white-space:nowrap` }));
    y = b + r.d + gap;
  });
  return page(ctx, 'scale', g, out);
}

// ---- 20 In use, family PW "Poster on a wall": the A2 poster (the same shape as the page) pasted on a Stage wall, a Night panel with the words and the specs under it ----
function hierarchy(ctx) {
  const G = groundsOf(ctx), g = G.night, M = measure(ctx), E = ctx.esc, slot = slotOn(ctx), W = ctx.weights, L_ = typeLadder(ctx), st = G.stage, ts = tones(ctx, st);
  const k = 0.52, pw = POSTER_W * k, ph = POSTER_H * k, px = (794 - pw) / 2, tape = mix(st, ts.ink, 0.5);
  const wall = field(ctx, 0, 0, 794, 760, st, '')
    + at(px, 48, pw, ph, `<div style="width:${POSTER_W}px;height:${POSTER_H}px;transform:scale(${k});transform-origin:0 0">${posterArt(ctx, G, M)}</div>`, { style: `overflow:hidden;box-shadow:0 0 0 1px ${ts.hair}` })
    + fill(px - 10, 38, 56, 18, tape) + fill(px + pw - 46, 38, 56, 18, tape);
  const body = L_.find((s) => s.token === 'body') || L_[L_.length - 3];
  const rowsT = [['Ground', `${cname(ctx, G.night)}, ${G.night.toUpperCase()}`], ['Names', `${E(ctx.brand.fonts.display.family)} ${W.heading}, fitted`], ['Phrase', `${cname(ctx, G.red)}, ${G.red.toUpperCase()}`], ['Small print', `${body.size} px, ${E(ctx.brand.fonts.body.family)}`]];
  const info = rowsT.map(([l, v], i) => hr(406, 790 + i * 62, 348, i ? 'var(--hair)' : 'var(--ink)') + at(406, 806 + i * 62, 348, 40, `<span class="lb">${l}</span><br><span class="m13">${v}</span>`)).join('');
  const text = at(L, 874, 330, 130, `<div class="b">${E(copy(ctx, 'page.use.text', 'A poster is read from a distance. Set the names large, light one phrase, keep the rest small.'))}</div>`);
  return page(ctx, 'hierarchy', g, wall + lab(ctx, L, 786, 330, 'Poster, A2') + H1('In use', L, 810, 330, 36) + text + (slot ? at(L, 1000, 330, 56, nt(ctx, HEAD_NOTE)) : '') + info);
}

// ---- 21 Type rules, family PT "Photo strips": one line set three ways, each a full-width crop of the room with the rule and the verdict in the bar under it ----
function typeRules(ctx) {
  const G = groundsOf(ctx), g = G.stage, t = tones(ctx, g), M = measure(ctx), E = ctx.esc, slot = slotOn(ctx), tn = tones(ctx, G.night);
  const sample = headline(ctx, copy(ctx, 'page.rules.sample', 'Your headline.'));
  const strips = [
    { ok: true, f: { fx: 0.5, fy: 0.12 }, ground: G.night, col: G.stock, ty: 40, do: 'type.rules.0.do', what: 'A habit to keep.' },
    { ok: false, f: { fx: 0.5, fy: 0.55 }, ground: G.stage, col: G.stock, ty: 150, do: 'type.rules.0.dont', what: 'A habit to avoid.' },
    { ok: false, f: { fx: 0.5, fy: 0.27 }, ground: G.red, col: mix(G.red, G.night, 0.14), ty: 92, do: 'type.rules.1.dont', what: 'A habit to avoid.' },
  ];
  let out = H1('Type rules', L, 40, 500, 32) + at(L, 84, CW, 24, `<span class="cap" style="color:var(--quiet)">${E(copy(ctx, 'page.rules.text', 'One line, set three ways. Only the first is let in.'))}</span>`);
  strips.forEach((s, i) => {
    const y = 120 + i * 304, size = n1(Math.min(48, M.fit('Doors at 8. You are on the list.', 650, 48)));
    const type = at(24, s.ty, 680, 56, `<div class="d" style="font-size:${size}px;line-height:56px;color:${s.col}">${sample}</div>`);
    const pic = slot ? field(ctx, 0, 0, CW, 224, s.ground, type + (i === 0 ? at(24, 190, 660, 16, nt(ctx, PHOTO_NOTE)) : ''), `box-shadow:inset 0 0 0 1px ${t.hair}`)
      : at(0, 0, CW, 224, `<div data-contrast="demo">${photo(ctx, 'IMG-01', { w: CW, h: 224, ...s.f })}${type}</div>`, { style: 'overflow:hidden' });
    const verdict = s.ok ? hl(ctx, 'In') : '<span class="lb q">Turned away</span>';
    const rule = slot ? ghostRule(ctx, s.what, '') : E(copy(ctx, `page.rules.${i}`, ''));
    const cap = at(0, 224, CW, 56, at(16, 16, 560, 24, `<span class="b" style="font-size:15px;line-height:24px">${rule}</span>`) + at(570, 16, 128, 24, verdict, { style: 'line-height:24px;text-align:right' }), { style: `background:${G.night};${varsOf(tn)}` });
    out += at(L, y, CW, 280, pic + cap, { style: 'overflow:hidden' });
  });
  return page(ctx, 'type-rules', g, out);
}

// ---- 23 Grid, family LR "Ledger rows": the rows ruled like a list from y 40, the four columns laid over them; the list row is the last row ----
function grid(ctx) {
  const G = groundsOf(ctx), g = G.stock, t = tones(ctx, g), E = ctx.esc, gm = ctx.gridMeasures || {};
  const gu = 18, base = gm.base || 4, cw = 165, X = (i) => L + i * (cw + gu), span = (a, b) => (b - a + 1) * (cw + gu) - gu, band = mix(g, t.ink, 0.035), used = [true, true, true, true];
  let out = '';
  for (let i = 0; i < 4; i++) out += fill(X(i), 40, cw, 1008, band) + at(X(i) + 6, 12, cw, 22, used[i] ? hl(ctx, `<span class="m" style="color:inherit">${pad(i + 1)}</span>`) : `<span class="m q">${pad(i + 1)}</span>`, { style: 'line-height:22px' });
  for (let r = 1; r <= 21; r++) out += (r > 1 ? hr(0, 40 + 48 * (r - 1), 794, t.hair) : '') + at(10, 40 + 48 * (r - 1) + 16, 28, 16, `<span class="m q">${pad(r)}</span>`);
  out += hr(0, 1048, 794, t.hair);
  out += at(X(0), 52, span(0, 1), 48, '<h1 class="h1">Grid</h1>') + at(X(0), 136, span(0, 1), 120, `<div class="b">${E('Twenty-one rows of 48, ruled like a list. Text sits on the four columns; photographs stop above the list row.')}</div>`);
  out += field(ctx, X(2), 184, span(2, 3), 192, G.red, at(20, 16, 300, 16, '<span class="lb">2 columns, 4 rows</span>') + at(20, 152, 300, 20, `<span class="m">x ${n1(X(2))}, width ${n1(span(2, 3))} px</span>`));
  out += field(ctx, X(0), 568, span(0, 2), 192, G.night, at(20, 16, 300, 16, '<span class="lb">3 columns, 4 rows</span>') + at(20, 152, 380, 20, `<span class="m">x ${n1(X(0))}, width ${n1(span(0, 2))} px</span>`));
  out += at(X(3), 580, cw, 168, `<div class="b" style="font-size:15px;line-height:22px">${E('Row 22 is the list row. It sits on every page and nothing is set under it.')}</div>`);
  const vals = [['Columns', '4'], ['Column', `${cw} px`], ['Gutter', `${gu} px`], ['Margin', '40 px'], ['Rows', '21 of 48 px'], ['Base', `${base} px`]];
  vals.forEach(([l, v], i) => { out += at(X((i % 2) * 2), 808 + Math.floor(i / 2) * 48, 340, 32, `<span class="lb q" style="display:inline-block;width:90px">${l}</span><span class="m13">${v}</span>`, { style: 'line-height:32px' }); });
  const over = at(4, 1088, 40, 22, hl(ctx, '22', 'font:400 13px/22px var(--mono);letter-spacing:.02em'), { style: `${varsOf(tones(ctx, G.stock))};line-height:22px;padding-left:6px` });
  return page(ctx, 'grid', g, out, over);
}

// ---- 24 Compositions, family TF "Taped to the floor": pages 1, 13 and 19 as A4 plates taped to the Stage floor, with the sheet's own measures under them ----
function compositions(ctx) {
  const G = groundsOf(ctx), E = ctx.esc, g = G.stage, t = tones(ctx, g), PWd = 226, K = PWd / 794, PHt = 1123 * K, Y = 230, tape = mix(g, t.ink, 0.5);
  const arts = [['cover', 'You', cover], ['palette', 'Palette', palette], ['scale', 'Scale', scalePage]].map(([id, name, fn]) => ({ id, name, no: fullFolio(id), html: asArt(fn(ctx), `art-${id}`) }));
  let out = H1('Compositions', L, 40, CW, 40) + at(L, 100, 560, 48, `<div class="b">${E(copy(ctx, 'page.compositions.text', `Pages ${arts.map((a) => a.no).join(', ')}, each with its list row.`))}</div>`);
  arts.forEach((a, i) => {
    const x = L + i * (PWd + 18);
    out += at(x, Y, PWd, PHt, `<div data-contrast="demo" style="width:794px;height:1123px;transform:scale(${K.toFixed(5)});transform-origin:0 0">${a.html}</div>`, { style: `overflow:hidden;box-shadow:0 0 0 1px ${t.hair}` })
      + fill(x - 8, Y - 10, 56, 18, tape) + fill(x + PWd - 48, Y - 10, 56, 18, tape)
      + at(x, Y + PHt + 20, PWd, 40, `<span class="lb">${E(a.name)}</span><br><span class="m13">${pad(a.no)} of 31</span>`);
  });
  const specs = [['Sheet', 'A4 portrait, 794 x 1123 px'], ['Margins', '40 px on every side'], ['Columns', '4 of 165 px, gutter 18 px'], ['Rows', '48 px from y 40'], ['List row', 'y 1075 to 1123']];
  specs.forEach(([l, v], i) => { out += hr(L, 740 + i * 52, CW, i ? 'var(--hair)' : 'var(--ink)') + lab(ctx, L, 758 + i * 52, 160, l, true) + mono(ctx, 223, 756 + i * 52, 531, v); });
  return page(ctx, 'compositions', g, out);
}

// ---- 26 Digital, family QD "Queue at the door": the web hero across the top, the phone pass below on the left, the specs and the words on the right ----
function digital(ctx) {
  const G = groundsOf(ctx), g = G.night, M = measure(ctx), E = ctx.esc, slot = slotOn(ctx);
  const hero = flat({ html: webArt(ctx, G, M), w: 1440, h: 900 }, L, 96, CW);
  let left;
  if (slot) left = slotPic(ctx, 0, 574, 400, 501, G.red);
  else {
    const k = 0.5, pw = 390 * k, ph = 844 * k, px = (400 - pw) / 2, py = (501 - ph) / 2;
    left = field(ctx, 0, 574, 400, 501, G.stage, at(px - 8, py - 8, pw + 16, ph + 16, '', { style: `background:${G.night};border-radius:28px` })
      + at(px, py, pw, ph, `<div style="width:390px;height:844px;transform:scale(${k});transform-origin:0 0">${phoneArt(ctx, G, M)}</div>`, { style: 'overflow:hidden;border-radius:20px' })
      + at(px + pw / 2 - 28, py + 6, 56, 14, '', { style: `background:${G.night};border-radius:7px` }));
  }
  const cells = [['Web hero', '1440 x 900'], ['Phone', '390 x 844'], ['Button', 'Door red, ink label']];
  let out = H1('Digital', L, 36, CW, 36) + hero.html + left;
  cells.forEach(([l, v], i) => { out += hr(440, 590 + i * 60, 314, i ? 'var(--hair)' : 'var(--ink)') + lab(ctx, 440, 606 + i * 60, 314, l, true) + mono(ctx, 440, 626 + i * 60, 314, v); });
  out += at(440, 790, 314, 150, slot ? nt(ctx, HEAD_NOTE) : `<div class="b" style="color:var(--ink)">${E(copy(ctx, 'page.digital.text', 'The hero says one thing, with one button in the action colour.'))}</div>`);
  return page(ctx, 'digital', g, out);
}

// ---- 27 Print, family AT "Actual ticket": the wristband laid flat on Night across the top, the ticket at 120 x 50 mm (454 x 189 px) under it ----
function printPage(ctx) {
  const G = groundsOf(ctx), g = G.stock, M = measure(ctx), E = ctx.esc, slot = slotOn(ctx);
  let top;
  if (slot) top = slotPic(ctx, 0, 96, 794, 304, G.night);
  else {
    const bh = CW * 250 / 1200;
    top = field(ctx, 0, 96, 794, 304, G.night, at(L, (304 - bh) / 2 - 12, CW, bh, `<div style="width:1200px;height:250px;transform:scale(${(CW / 1200).toFixed(5)});transform-origin:0 0">${bandArt(ctx, G, M)}</div>`, { style: 'overflow:hidden' })
      + at(L, (304 + bh) / 2 + 4, CW, 18, '<span class="m13 q">Wristband, 25 mm deep, laid flat</span>'));
  }
  const rows = [['Ticket', '120 x 50 mm, shown at actual size'], ['Wristband', '25 mm deep, the mark at 10 mm'], ['Ink and paper', `${G.night.toUpperCase()} on ${G.stock.toUpperCase()}`]];
  let out = H1('Print', L, 36, CW, 36) + top + lab(ctx, L, 440, 300, 'Ticket, actual size', true) + ticket(ctx, G, M, L, 468) + mono(ctx, L, 668, 454, '454 x 189 px at 96 dpi', true)
    + at(520, 468, 234, 200, `<div class="b" style="font-size:15px;line-height:22px">${E(copy(ctx, 'page.print.text', 'Set the date large and keep the rest small. Light one line.'))}</div>`);
  rows.forEach(([l, v], i) => { out += hr(L, 740 + i * 52, CW, i ? 'var(--hair)' : 'var(--ink)') + lab(ctx, L, 758 + i * 52, 160, l, true) + mono(ctx, 223, 756 + i * 52, 531, v); });
  return page(ctx, 'print', g, out);
}

// ---- 28 Social, family SG "Story and grid": the story at 9:16 top left with its words beside it, six posts in a 3 x 2 grid under ----
function social(ctx) {
  const G = groundsOf(ctx), g = G.stage, M = measure(ctx), E = ctx.esc, slot = slotOn(ctx), tn = tones(ctx, G.night), tr = tones(ctx, G.red);
  const lineG = 'Your line, 2 to 4 words.', nm = cust(ctx) || 'Your name';
  const bigAt = (x, y, w, h, html, size, tt, extra = '') => at(x, y, w, h, html, { cls: 'big', style: `font-size:${size}px;line-height:.94;text-wrap:balance;color:${tt.ink};${extra}` });
  const sx = L, sy = 96, sw = 252, sh = 448, sentence = copy(ctx, 'page.social.story', '');
  const storyText = slot ? gl(ctx, lineG) : `${E(sentence.split(' ').slice(0, 1).join(' '))}<br>${hl(ctx, E(sentence.split(' ').slice(1).join(' ')))}`;
  const story = slot
    ? field(ctx, sx, sy, sw, sh, G.night, svgAt(0, 0, sw, sh, `<circle cx="${sw}" cy="${sh / 2}" r="${n1(sh * 0.6)}" fill="${mix(G.night, tn.ink, 0.04)}"/>`) + lab(ctx, 20, 20, 200, nm) + bigAt(20, 300, sw - 40, 130, storyText, 46, tn))
    : at(sx, sy, sw, sh, `<div data-contrast="demo">${photo(ctx, 'IMG-04', { w: sw, h: sh })}</div>` + at(20, 20, 200, 16, `<span class="lb" style="color:${G.stock}">${E(nm)}</span>`) + bigAt(20, 316, sw - 40, 112, storyText, 42, { ink: G.stock }), { style: 'overflow:hidden' });
  const P = 224, G2 = 21, gy = 580;
  const post = (i, kind, a) => {
    const x = L + (i % 3) * (P + G2), y = gy + Math.floor(i / 3) * (P + G2);
    if (kind === 'photo') return slot ? field(ctx, x, y, P, P, a.ground, svgAt(0, 0, P, P, `<circle cx="${P}" cy="${P / 2}" r="${P * 0.6}" fill="${mix(a.ground, tones(ctx, a.ground).ink, 0.04)}"/>`))
      : at(x, y, P, P, `<div data-contrast="demo">${photo(ctx, a.id, { w: P, h: P, fx: a.fx, fy: a.fy, zoom: a.zoom || 1 })}</div>`, { style: 'overflow:hidden' });
    const tt = tones(ctx, a.ground), txt = slot ? gl(ctx, lineG) : E(copy(ctx, `page.social.post.${a.k}`, ''));
    return field(ctx, x, y, P, P, a.ground, lab(ctx, 16, 16, 180, nm) + bigAt(16, 52, P - 32, P - 68, txt, a.size, tt, 'display:flex;align-items:flex-end'));
  };
  const posts = [
    post(0, 'photo', { id: 'IMG-02', fx: 0.5, fy: 0.45, ground: G.night }), post(1, 'photo', { id: 'IMG-08', fx: 0.62, fy: 0.7, zoom: 1.5, ground: G.red }), post(2, 'text', { k: 0, ground: G.red, size: 28 }),
    post(3, 'text', { k: 1, ground: G.night, size: 46 }), post(4, 'photo', { id: 'IMG-01', fx: 0.55, fy: 0.62, ground: G.night }), post(5, 'text', { k: 2, ground: G.stock, size: 30 }),
  ].join('');
  const spec = [['Story', '9:16, 1080 x 1920'], ['Post', '1:1, 1080 x 1080'], ['Line', '2 to 4 words']];
  let out = story + posts + H1('Social', 316, 92, 438, 44);
  spec.forEach(([l, v], i) => { out += hr(316, 176 + i * 62, 438, i ? 'var(--hair)' : 'var(--ink)') + lab(ctx, 316, 192 + i * 62, 438, l, true) + mono(ctx, 316, 212 + i * 62, 438, v); });
  out += at(316, 384, 438, 80, `<div class="b" style="font-size:15px;line-height:22px">${E(copy(ctx, 'page.social.text', 'Set one short line big. Light one post in six.'))}</div>`);
  out += slot ? at(316, 480, 438, 56, nt(ctx, PHOTO_NOTE)) : '';
  return page(ctx, 'social', g, out);
}

// ---- 30 On one page, family OL "One list": the brand as six list rows of 168, each marked in at its name ----
function summary(ctx) {
  const G = groundsOf(ctx), g = G.stock, t = tones(ctx, g), M = measure(ctx), E = ctx.esc, slot = slotOn(ctx), RH = 168;
  const rule = (i, fb) => E(copy(ctx, `page.summary.rule.${i}`, fb));
  const line = slot ? ghost(ctx, copy(ctx, 'lines.primary'), 'lines.primary', 'Your line, one sentence.', { what: false, example: false }) : E(copy(ctx, 'page.summary.line', ''));
  const voiceLines = slot ? gl(ctx, 'A line for a poster') : [0, 1, 2].map((i) => E(copy(ctx, `page.voice.${i}`, ''))).join('<br>');
  const chips = [G.red, G.night, G.stage, G.stock].map((c, i) => fill(i * 84, 0, 76, 96, c, `box-shadow:inset 0 0 0 1px ${t.hair}`)).join('');
  const rows = [
    { name: 'Mark', spec: at(0, 0, 96, 96, symbol(ctx, 96, t.ink)), fb: 'Used as drawn, on its own ground.' },
    { name: 'Colour', spec: `<div class="a" style="left:0;top:0;width:328px;height:96px">${chips}</div>`, fb: 'The palette, in its shares.' },
    { name: 'Type', spec: word(M, 0, 86, 'Aa', 96), fb: 'The faces, at the scale.' },
    { name: 'Photo', spec: slot ? slotPic(ctx, 0, 0, 348, 96, G.night, '') : photo(ctx, 'IMG-01', { w: 348, h: 96, fx: 0.5, fy: 0.55 }), fb: 'Your photograph, as briefed.', note: slot },
    { name: 'Line', spec: at(0, 8, 348, 84, `<div class="h2" style="line-height:28px">${line}</div>`), fb: 'The line that sums it up.' },
    { name: 'Voice', spec: at(0, 0, 348, 96, `<div class="${slot ? 'b' : 'big'}" style="font-size:22px;line-height:28px">${voiceLines}</div>`), fb: 'The words, in your voice.' },
  ];
  let out = hr(L, 40, CW, 'var(--ink)', 2);
  rows.forEach((r, i) => {
    const y = 40 + i * RH;
    out += (i ? hr(L, y, CW, 'var(--hair)') : '') + at(L, y + 26, 48, 18, `<span class="mono13 q">${pad(i + 1)}</span>`) + at(L, y + 56, 170, 36, `<div class="h2" style="line-height:36px">${hl(ctx, E(r.name))}</div>`)
      + at(223, y + 22, 348, 96, r.spec) + at(589, y + 26, 165, 120, `<div class="b" style="font-size:14px;line-height:20px">${rule(i, r.fb)}</div>`) + (r.note ? at(223, y + 124, 348, 36, nt(ctx, PHOTO_NOTE)) : '');
  });
  return page(ctx, 'summary', g, out);
}

// ---- 31 Contact, family LC "Last call": "Last call." at the full measure, the contact rows under it, the marquee over the door at the foot ----
function contact(ctx) {
  const G = groundsOf(ctx), g = G.night, M = measure(ctx), E = ctx.esc, slot = slotOn(ctx);
  const big = [copy(ctx, 'page.contact.big.0', 'Last'), copy(ctx, 'page.contact.big.1', 'call.')];
  const size = Math.min(230, Math.min(...big.map((w) => M.fit(w, CW, 230)))), b1 = 48 + M.cap * size, b2 = b1 + size * 0.95;
  const email = slot ? gl(ctx, 'Your contact email.') : E(copy(ctx, 'page.contact.email', ''));
  const ver = E(copy(ctx, 'page.contact.version', String(ctx.versionLine || 'Version 1.0')));
  const rows = [
    ['Write to', at(160, 0, 554, 64, `<div class="d" style="font-size:${n1(Math.min(32, M.fit(slot ? 'Your contact email.' : copy(ctx, 'page.contact.email', ''), 520, 32)))}px;line-height:64px;white-space:normal">${email}</div>`)],
    ['Ask first', at(160, 0, 554, 64, slot ? `<div style="padding-top:10px">${nt(ctx, 'Who to ask before changing the mark.')}</div>` : `<div class="b" style="line-height:64px">${E(copy(ctx, 'page.contact.rule', ''))}</div>`)],
    ['Version', at(160, 0, 554, 64, `<div class="b" style="line-height:64px">${ver}</div>`)],
  ];
  let out = word(M, L, b1, E(big[0]), size) + word(M, L, b2, E(big[1]), size);
  const ry = Math.round(b2 + 56);
  rows.forEach(([l, v], i) => { out += at(L, ry + i * 64, CW, 64, lab(ctx, 0, 24, 140, l, true) + v) + hr(L, ry + i * 64, CW, i ? 'var(--hair)' : 'var(--ink)', i ? 1 : 2); });
  out += hr(L, ry + 192, CW, 'var(--hair)');
  const fy = 760, fh = FOOT - fy;
  let foot;
  if (slot) foot = slotPic(ctx, 0, fy, 794, fh, G.red);
  else {
    const mh = CW / 5;
    foot = field(ctx, 0, fy, 794, fh, G.stage, at(L, (fh - mh) / 2 - 14, CW, mh, `<div style="width:1500px;height:300px;transform:scale(${(CW / 1500).toFixed(5)});transform-origin:0 0">${marqueeArt(ctx, G, M)}</div>`, { style: 'overflow:hidden' })
      + at(L, (fh + mh) / 2, CW, 18, '<span class="m13 q">Marquee face, 3000 x 600 mm</span>'));
  }
  return page(ctx, 'contact', g, out + foot);
}

export const a4b = { faces, scale: scalePage, hierarchy, 'type-rules': typeRules, grid, compositions, digital, print: printPage, social, summary, contact };
