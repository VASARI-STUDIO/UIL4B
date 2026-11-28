// Theme 33, Flyleaf: the brand guidelines, pages 26 to 28 (6 In use: digital, print, social), at 16:9 and A4 portrait. The opener (6.0) is the shared opener in brand-a.js.
// Same contract as brand-a.js: absolute boxes on the grid in kit.js, a size is its own arrangement (K.portrait), every text colour from tones() of the ground it sits on
// (readableOn, measured against that ground), brand copy the user writes through ctx.esc() so the slot edition shows its placeholder at the real size of the copy it stands for.
// Everything is flat: no device frames, no photographs. Sizes, radii, spacing and type steps are the project's own (usageFacts, typeLadder, ctx.radii); nothing here invents one.
import { usageFacts, typeLadder } from '../../engine/styleguide.js';
import { tones, varsOf, geo, own, at, hr, mono, page, textCol, field, groundsOf, n1 } from './kit.js';
import { edged } from './brand-a.js';

// a type step as it is drawn at scale k (display steps in the heading weight, as the engine's own pages draw them)
const step = (ctx, t, k = 1) => `font-family:var(--${t.face === 'display' ? 'display' : 'body'});font-weight:${t.face === 'display' ? ctx.weights.heading : t.weight};font-size:${n1(t.size * k)}px;line-height:${t.lineRatio};${t.face === 'display' && t.size * k > 40 ? 'letter-spacing:-0.02em;' : ''}`;
const stepOf = (L, token, fallback) => L.find((t) => t.token === token) || fallback;
// a hairline edge for a sheet that sits on a ground it would melt into
const edge = (ctx, hex, ground) => (hex.toLowerCase() === ground.toLowerCase() ? `box-shadow:inset 0 0 0 .5px ${tones(ctx, ground).hair};` : edged(ctx, hex));
// the spec rows under or beside a drawing: a label left, a value right, a hairline above each
const specRows = (x, y, w, rows, rowH = 28) => rows.map(([a, v], i) => hr(x, y + i * rowH, w) + at(x, y + i * rowH + 7, w, 14, `<span class="m">${a}</span><span class="m i" style="float:right">${v}</span>`)).join('');

// ---- 6.1 Digital: a web page header and a whole phone screen, flat, built from the brand's tokens (each drawn at the largest scale its room allows, the scale labelled) ----
function digital(ctx) {
  const K = geo(ctx), G = groundsOf(ctx), e = K.ex, B = ctx.brand, C = B.ui.screen.content, U = usageFacts(ctx), L = typeLadder(ctx), surface = ctx.roles.light.surface, lg = ctx.logo;
  const WEB = 1280, PHONE = 390, PHONE_H = 780, kw = e.w / WEB;
  const headline = stepOf(L, 'headline', L[0]), titleS = stepOf(L, 'title', L[1] || L[0]), body = U.button.type, rb = U.button.radius.px, rc = U.card.radius.px;
  const tp = tones(ctx, G.primary), ts = tones(ctx, surface), cap = (x, y, w, t) => at(x, y, w, 14, mono(t));
  // a button at scale k: the brand's fill, its control type, padding from the space tokens, its radius; the label is the project's own (a placeholder until written)
  const button = (k, x, y, w, label, kind = 'fill') => {
    const sc = (v) => n1(v * k), h = body.line + 2 * U.button.padY.px, fill = kind === 'fill';
    return at(x, y, w, sc(h), `<div class="a btn" style="left:0;right:0;top:0;bottom:0;display:flex;align-items:center;justify-content:center;font-size:${sc(body.size)}px">${label}</div>`,
      { style: `background:${fill ? G.primary : 'transparent'};${varsOf(fill ? tp : ts)};color:var(--ink);border-radius:${sc(rb)}px;${fill ? '' : `border:.5px solid ${ts.ink}`}` });
  };
  // the web header: logo left, three links, the primary button right, then the headline (the brand line) and a button
  const sc = (v) => n1(v * kw), lw = sc(170), sh = Math.round(sc(470));
  const links = (C.example.links || []).slice(0, 3).map((l, i) => at(sc(300) + i * 118, sc(36), 112, sc(24), ctx.esc(l[0]), { cls: 'ph-tight', style: 'font-size:' + sc(body.size) + 'px' })).join('');
  const hero = at(sc(64), sc(150), sc(760), null, `<div class="d wc" style="${step(ctx, headline, kw)}white-space:normal;color:var(--ink)">${ctx.esc(B.lines.primary)}</div>`)
    + button(kw, sc(64), sc(380), sc(220), ctx.esc(C.example.small));
  const web = field(ctx, e.x, e.y, e.w, sh, surface,
    `<div class="a lj" style="left:${sc(64)}px;top:${sc(32)}px;color:var(--ink)">${lg.html('colour', { width: lw, color: ts.ink })}</div>${links}${button(kw, sc(1280 - 64 - 190), sc(28), sc(190), ctx.esc(C.example.small))}${hr(0, sc(100), e.w)}${hero}`, `--pk:${kw};${edge(ctx, surface, G.ink)}`);
  // the phone, whole: it sits where the room is tallest (A4: under the web header; 16:9: under the text column) and is drawn at the scale that fills that room to the foot margin
  const px = K.portrait ? e.x : K.tx.x, capY = K.portrait ? e.y + sh + 40 : 252, py = capY + 24, kp = Math.min((K.y1 - py) / PHONE_H, K.portrait ? 0.6 : 0.52);
  const s2 = (v) => n1(v * kp), pw = Math.round(PHONE * kp), ph = Math.round(PHONE_H * kp), cardFill = U.card.fill, tc = tones(ctx, cardFill);
  // the card is as tall as its four lines need (the placeholders keep their own size at any scale), the controls and the list rows follow it
  const cp = Math.max(s2(U.card.pad.px) - 4, 8), lineH = 18, cardY = s2(80), cardH = Math.max(s2(212), 2 * cp + 4 * lineH + 8 + 14), cx = s2(16), cwid = s2(PHONE - 32);
  const bY = cardY + cardH + s2(16), bH = s2(body.line + 2 * U.button.padY.px), b2Y = bY + bH + s2(12), listY = b2Y + bH + s2(20), rowH = Math.max(s2(52), 34);
  const deliveries = (C.deliveries || []).slice(0, Math.max(0, Math.min(6, Math.floor((ph - listY) / rowH))));
  const inner = [
    at(0, 0, pw, s2(64), `<div class="ph-tight d" style="${step(ctx, titleS, kp)}position:absolute;left:${s2(20)}px;top:${s2(16)}px;right:${s2(20)}px;color:var(--ink)">${ctx.esc(B.ui.screen.title)}</div>`, { style: `background:${G.primary};${varsOf(tp)}` }),
    at(cx, cardY, cwid, cardH, `<div class="ph-tight nw" style="position:absolute;left:${cp}px;top:${cp}px;right:${cp}px;font-size:${n1(body.size * 0.8)}px;line-height:${lineH}px;color:var(--ink);white-space:nowrap">${ctx.esc(C.status)}<br>${ctx.esc(C.eta)}<br>${ctx.esc(C.from)}<br>${ctx.esc(C.to)}</div>`
      + at(cp, cardH - cp - 8, cwid - 2 * cp, 8, '', { style: `background:${tc.hair};border-radius:4px;overflow:hidden` })
      + at(cp, cardH - cp - 8, (cwid - 2 * cp) * (C.progress || 0), 8, '', { style: `background:${G.primary};border-radius:4px` }),
      { style: `background:${cardFill};${varsOf(tc)};color:var(--ink);border-radius:${s2(rc)}px;border:.5px solid ${tc.hair}` }),
    button(kp, cx, bY, cwid, ctx.esc(C.example.small)),
    button(kp, cx, b2Y, cwid, ctx.esc(C.example.secondary), 'line'),
    deliveries.map((d, i) => hr(cx, listY + i * rowH, cwid) + at(cx, listY + i * rowH, cwid, rowH, ctx.esc(d.to), { cls: 'ph-tight', style: `display:flex;align-items:center;font-size:${n1(body.size * 0.8)}px;color:var(--ink)` })).join(''),
  ].join('');
  const phone = field(ctx, px, py, pw, ph, surface, inner, `overflow:hidden;--pk:${kp};${edge(ctx, surface, G.ink)}`);
  // the spec rows: under the web header on 16:9, beside the phone on A4
  const sx = K.portrait ? px + pw + 28 : e.x, sy = K.portrait ? py + 4 : e.y + sh + 44, sw = K.portrait ? e.x + e.w - sx : e.w;
  const rows = [['Web layout', `${WEB} px wide, drawn at ${Math.round(kw * 100)}%`], ['Phone layout', `${PHONE} px wide, drawn at ${Math.round(kp * 100)}%`], ['Button radius', `${rb} px`], ['Button padding', `${U.button.padY.px} / ${U.button.padX.px} px`],
    ['Card radius', `${rc} px`], ['Card padding', `${U.card.pad.px} px`], ['Button type', `${body.name}, ${body.size} / ${body.line} px`], ['Headline', `${headline.name}, ${headline.size} / ${headline.line} px`]];
  const room = K.portrait ? ph - 8 : K.y1 - sy;
  const body2 = cap(e.x, e.y + sh + 10, e.w, `Web header, ${WEB} px layout`) + cap(px, capY, K.portrait ? pw + 60 : 300, `Phone, ${PHONE} px layout`)
    + specRows(sx, sy, sw, rows.slice(0, Math.max(3, Math.floor(room / 28))));
  return page(ctx, 'digital', { ground: G.ink, body: textCol(ctx, 'digital', 'A web page header and a phone screen, built from the brand tokens and drawn flat.') + web + phone + body2 });
}

// ---- 6.2 Print: a business card front and back and a letterhead, flat, each at its true proportion ----
function print(ctx) {
  const K = geo(ctx), G = groundsOf(ctx), e = K.ex, B = ctx.brand, lg = ctx.logo, surface = ctx.roles.light.surface, st = tones(ctx, surface), L = typeLadder(ctx);
  const CARD = { w: 85, h: 55 }, SHEET = { w: 210, h: 297 }, PT = 0.3528; // mm per point
  const bar = (x, y, w, h, c) => at(x, y, w, h, '', { style: `background:${c}` });
  // the card at s px to the mm: type is set in points, so it is the size it prints at
  const card = (x, y, s, side) => {
    const w = CARD.w * s, h = CARD.h * s, pt = (p) => n1(p * PT * s), m = 6 * s;
    if (side === 'front') {
      const t = tones(ctx, G.primary), lw = Math.min(w * 0.34, 32 * s);
      return field(ctx, x, y, w, h, G.primary, `<div class="a lj" style="left:${n1(m)}px;bottom:${n1(m)}px;color:var(--ink)">${lg.html('colour', { width: lw, color: t.ink })}</div>`
        + at(m, m, w - 2 * m, null, `<div class="d wc ph-tight" style="font-size:${pt(11)}px;line-height:1.2;white-space:normal;color:var(--ink)">${ctx.esc(B.lines.primary)}</div>`), `--pk:${n1(s / 3.78)};${edge(ctx, G.primary, surface)}`);
    }
    return field(ctx, x, y, w, h, surface,
      `<div class="a lj" style="left:${n1(m)}px;top:${n1(m)}px;color:var(--ink)">${lg.html('symbol', { width: 10 * s, color: st.ink })}</div>`
      + at(m, h - m - 20 * s, w - 2 * m, 20 * s, `<div class="d" style="font-size:${pt(10)}px;line-height:1.2;white-space:normal;color:var(--ink)">${own(ctx, B.name)}</div><div class="ph-tight" style="font-size:${pt(7.5)}px;line-height:1.5;margin-top:${n1(1.2 * s)}px;color:var(--ink)">${ctx.esc(B.applications.card.person)}<br>${ctx.esc(B.applications.card.role)}<br>${ctx.esc(B.applications.card.contact)}</div>`, { style: 'display:flex;flex-direction:column;justify-content:flex-end' }),
      `--pk:${n1(s / 3.78)};border:.5px solid ${st.hair};`);
  };
  // the letterhead at s px to the mm: the mark and name at the head, bars for the letter, the contact lines at the foot
  const sheet = (x, y, s) => {
    const w = SHEET.w * s, h = SHEET.h * s, m = 20 * s, pt = (p) => n1(p * PT * s);
    return field(ctx, x, y, w, h, surface,
      `<div class="a lj" style="left:${n1(m)}px;top:${n1(m)}px;color:var(--ink)">${lg.html('colour', { width: 52 * s, color: st.ink })}</div>`
      + bar(m, 84 * s, 50 * s, 2.2 * s, st.hair) + [0, 1, 2, 3, 4, 5, 6].map((i) => bar(m, 100 * s + i * 7 * s, (i === 6 ? 0.5 : 1) * (w - 2 * m - 30 * s), 1.6 * s, st.hair)).join('')
      + at(m, h - m - 20 * s, w - 2 * m, 20 * s, `<div class="ph-tight" style="font-size:${pt(7)}px;line-height:1.5;color:var(--ink)">${ctx.esc(B.contact.owner)}<br>${ctx.esc(B.contact.email)}<br>${ctx.esc(B.applications.site.url)}</div>`, { style: 'display:flex;flex-direction:column;justify-content:flex-end' }),
      `--pk:${n1(s / 3.78)};border:.5px solid ${st.hair};`);
  };
  const lab = (x, y, w, a, b) => at(x, y, w, 30, `<div class="m i">${a}</div><div class="m">${b}</div>`);
  let out, sx;
  if (K.portrait) {
    // A4: the letterhead tall on the left (a little over half the width), the two card faces stacked on its right with the sizes under them, so no room beside the sheet is left bare
    const s2 = Math.min((e.w * 0.66) / SHEET.w, (e.h - 38) / SHEET.h), lw = SHEET.w * s2, cx = e.x + lw + 28, cw = e.x + e.w - cx, s = cw / CARD.w, ch = CARD.h * s;
    out = sheet(e.x, e.y, s2) + lab(e.x, e.y + SHEET.h * s2 + 8, lw, 'Letterhead', `A4, ${SHEET.w} x ${SHEET.h} mm`)
      + card(cx, e.y, s, 'front') + lab(cx, e.y + ch + 8, cw, 'Card, front', `${CARD.w} x ${CARD.h} mm`)
      + card(cx, e.y + ch + 50, s, 'back') + lab(cx, e.y + 2 * ch + 58, cw, 'Card, back', `${CARD.w} x ${CARD.h} mm`);
    out += specRows(cx, e.y + 2 * ch + 112, cw, [['Card', `${CARD.w} x ${CARD.h} mm`], ['Letterhead', `A4`], ['Card scale', `${n1(s)} px to the mm`], ['Letter scale', `${n1(s2)} px to the mm`], ['Contact', 'placeholders']]);
  } else {
    // 16:9: the two card faces stacked on the left, the letterhead tall on the right
    const s2 = (e.h - 34) / SHEET.h, lw = SHEET.w * s2, cw = e.w - lw - 40, s = Math.min(cw / CARD.w, (e.h - 2 * 34 - 16) / 2 / CARD.h), ch = CARD.h * s;
    out = card(e.x, e.y, s, 'front') + lab(e.x, e.y + ch + 8, cw, 'Card, front', `${CARD.w} x ${CARD.h} mm, ${n1(s)} px to the mm`)
      + card(e.x, e.y + ch + 50, s, 'back') + lab(e.x, e.y + 2 * ch + 58, cw, 'Card, back', `${CARD.w} x ${CARD.h} mm`)
      + sheet(e.x + e.w - lw, e.y, s2) + lab(e.x + e.w - lw, e.y + SHEET.h * s2 + 8, lw, 'Letterhead', `A4, ${SHEET.w} x ${SHEET.h} mm, ${n1(s2)} px to the mm`);
  }
  return page(ctx, 'print', { body: textCol(ctx, 'print', 'A business card, front and back, and a letterhead, each at its true proportion. The contact lines are the owner\'s to write.') + out });
}

// ---- 6.3 Social: three square posts, each a colour field, a line and the mark ----
function social(ctx) {
  const K = geo(ctx), G = groundsOf(ctx), e = K.ex, B = ctx.brand, lg = ctx.logo, surface = ctx.roles.light.surface, L = typeLadder(ctx);
  const titleS = stepOf(L, 'headline', L[0]), size = K.portrait ? Math.floor((e.w - K.gut) / 2) : 340, k = K.portrait ? 0.58 : 0.6;
  // post three: the first of the accent, the panel and the sunken ground that is not already a post
  const taken = [G.primary, G.ink].map((h) => h.toLowerCase());
  const third = [G.accent, G.panel, G.sunken, G.raised].find((h) => !taken.includes(h.toLowerCase())) || G.sunken;
  const posts = [[G.primary, B.lines.primary, 'Brand line'], [G.ink, B.applications.social[0], 'Social post 1'], [third, B.applications.social[1], 'Social post 2']];
  const draw = (x, y, [ground, line, name]) => {
    const t = tones(ctx, ground), m = size * 0.075, lw = size * 0.3;
    const inner = `<div class="a lj" style="left:${n1(m)}px;top:${n1(m)}px;color:var(--ink)">${lg.html('symbol', { width: lw * 0.5, color: t.ink })}</div>`
      + at(m, size * 0.3, size - 2 * m, size * 0.62, `<div class="d wc" style="${step(ctx, titleS, k)}white-space:normal;color:var(--ink)">${ctx.esc(line)}</div>`, { cls: 'post' })
      + at(m, size - m - 14, size - 2 * m, 14, `<span class="m i">${own(ctx, B.name)}</span>`);
    const nm = (ctx.colours.find((c) => c.hex.toLowerCase() === ground.toLowerCase()) || {}).name;
    return field(ctx, x, y, size, size, ground, inner, `--pk:${n1(size / 1080)};${edge(ctx, ground, surface)}`) + at(x, y + size + 8, size, 30, `<div class="m i">${name}</div><div class="m">${nm ? own(ctx, nm) : ''} ${ground.toUpperCase()}</div>`);
  };
  let out;
  if (K.portrait) {
    const gap = K.gut, y2 = e.y + size + 50, sx = e.x + size + gap, sw = e.x + e.w - sx;
    out = draw(e.x, e.y, posts[0]) + draw(sx, e.y, posts[1]) + draw(e.x, y2, posts[2])
      + specRows(sx, y2 + 4, sw, [['Format', 'Square, 1:1'], ['Field', 'A palette colour'], ['Line', 'The brand line or a post line'], ['Mark', 'The logo, small, top left']]);
  } else {
    const y = K.y1 - 30 - size;
    out = posts.map((p, i) => draw(K.x(1 + 4 * i), y, p)).join('');
  }
  return page(ctx, 'social', { body: textCol(ctx, 'social', 'Three square posts: a colour field, one line and the mark.') + out });
}

export const guidelines = {
  digital,
  print,
  social,
};
