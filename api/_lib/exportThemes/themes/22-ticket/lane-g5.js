// Theme 22, Ticket: lane g5, the applications pages round 1 left out (business-card, social, email-signature, digital). signage is round 1's and is
// not touched here. Every page keeps the one roll ticket on the bar top (helpers.js), and every application is drawn as a ticket of its own: the card
// has a stub and a printed perforation that lines up front and back, each post prints its line on a body over a row of holes, the email signature
// puts the logo on a stub, and the product screen is the UI kit's own components. Each page holds the flat artwork on the ticket (the card at a
// readable size, the posts, the signature at true size, the screen) and one photograph from the Late series as proof it works on a real night:
//   business-card    late-box-office, the two cards on the box office counter
//   social           late-door-scan, the story on a phone held up to the door scanner
//   email-signature  late-laptop-desk, the whole message on a laptop, cropped close
//   digital          late-laptop-desk again, the product screen, cropped tall so the frame is not the email page's
// Photographs are framed 24 px inside the body, as on the signage page, so the ticket's outline holds against a dark photograph.
import { plateImg } from '../../engine/plate.js';
import { A, px, T, roles, device, stub, textWidth, fitBlock } from './helpers.js';
import { root, t, logoAt, printedHoles } from './art.js';
import { kitCss } from './lane-u1.js';
import { isStreet } from './street.js';

const r2 = (n) => Math.round(n * 100) / 100;
const el = (x, y, cls, html, style = '', w = null) => `<div class="a ${cls}" style="left:${px(x)};top:${px(y)};${w ? `width:${px(w)};` : ''}${style}">${html}</div>`;

// ---- measuring: greedy wrap in the body face (as lane g4), so the lines laid out are the lines that render ----
const bodyW = (ctx, text, size, weight = 400) => textWidth(ctx, 'body', text, size) * (weight >= 600 ? 1.07 : weight >= 500 ? 1.035 : 1);
function wrap(ctx, text, size, w, weight = 400) {
  const lines = []; let cur = '';
  for (const wd of String(text).split(/\s+/).filter(Boolean)) { const s = cur ? `${cur} ${wd}` : wd; if (cur && bodyW(ctx, s, size, weight) > w * 0.96) { lines.push(cur); cur = wd; } else cur = s; }
  if (cur) lines.push(cur);
  return lines;
}
const linesHtml = (lines) => lines.map((l) => `<span class="ln">${A(l)}</span>`).join('');

// the colour's own name where the role is a brand colour (the bar top can be a derived near-black, which has none)
const nameOf = (ctx, hex, fallback) => (ctx.colours.find((c) => c.hex.toLowerCase() === hex.toLowerCase()) || { name: fallback }).name;

// a printed perforation running down an art piece (art.js keeps its own private)
const holesV = (x, y0, y1, fill, W, H) => {
  const n = Math.round((y1 - y0) / 10) + 1, pitch = (y1 - y0) / (n - 1);
  return `<svg class="a" style="left:0;top:0" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true"><g fill="${fill}">${Array.from({ length: n }, (_, i) => `<circle cx="${x}" cy="${r2(y0 + i * pitch)}" r="2"/>`).join('')}</g></svg>`;
};
// larger holes for a piece that is printed big (a post is 1080 px across, so a 4 px hole would vanish)
const holesH = (x0, x1, y, r, pitch, fill, W, H) => {
  const n = Math.round((x1 - x0) / pitch) + 1, p = (x1 - x0) / (n - 1);
  return `<svg class="a" style="left:0;top:0" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true"><g fill="${fill}">${Array.from({ length: n }, (_, i) => `<circle cx="${r2(x0 + i * p)}" cy="${y}" r="${r}"/>`).join('')}</g></svg>`;
};

// ---- the page: the device, then the content and the stub; the lane class scopes this lane's css ----
function ticketPage(ctx, R, id, { body = '', zone = '' }) {
  return `<section class="pg g5" data-page="${id}" style="--ink:${R.fieldInk};--field:${R.field}">${device(R, {})}<div class="ct">${body}${stub(ctx, R, id)}${zone}</div></section>`;
}
// a dark-zone note: the name in paper, then its text in the measured quiet colour
const note = (ctx, x, y, w, name, text) => el(x, y, 'c15 b paper', A(name), '', w) + el(x, y + 26, 'c13 qt', linesHtml(wrap(ctx, text, 13, w)), '', w);
// a caption on the field: the name, then its detail, both in the field's ink (weight is the only hierarchy there)
const cap = (ctx, x, y, w, name, text) => el(x, y, 'c13 b ink', A(name), '', w) + el(x, y + 18, 'c12 ink', linesHtml(wrap(ctx, text, 12, w)), '', w);

// flat art on the ticket: drawn at its own size, zoomed into its slot (zoom, not transform: see index.js)
const flat = (x, y, w, art, label) => {
  const k = w / art.w, h = art.h * k;
  return { html: `<div class="a ar g5-flat" role="img" aria-label="${A(label)}" style="left:${px(x)};top:${px(y)};width:${px(w)};height:${px(h)}"><div class="sc" style="width:${art.w}px;height:${art.h}px;zoom:${r2(k * 10000) / 10000}">${art.html}</div></div>`, h };
};
// a photograph cropped to its frame: c is the centre of the window in scene px and ww its width; the height follows the frame's proportion
function photo(ctx, scene, src, { x, y, w, h }, { cx, cy, ww }, alt) {
  const si = ctx.sceneInfo(scene), wh = ww * h / w;
  const wx = Math.max(0, Math.min(si.w - ww, cx - ww / 2)), wy = Math.max(0, Math.min(si.h - wh, cy - wh / 2)), k = w / ww;
  if (ww > si.w + 0.5 || wh > si.h + 0.5) throw new Error(`ticket g5: the ${scene} window ${ww} x ${r2(wh)} is larger than the scene`);
  return `<div class="a ar" role="img" aria-label="${A(alt)}" style="left:${px(x)};top:${px(y)};width:${px(w)};height:${px(h)}">${plateImg(`${A(src)}`, ``, `position:absolute;left:${px(-wx * k)};top:${px(-wy * k)};width:${px(si.w * k)};height:${px(si.h * k)}`)}</div>`;
}
const artDoc = (ctx, a) => ({ html: ctx.artPage(a.html, { w: a.w, h: a.h }), w: a.w, h: a.h });
const asp = (ctx) => ctx.logo.geo.aspect;

// ================================================================ business card: 90 x 55 mm at 6 px a mm
const CARD = { w: 540, h: 330, perf: 405, pad: 32 };
// the front: the logo on the bar-top colour, the line under it, the perforation and the url printed on the stub in the field colour
function cardFront(ctx, R) {
  const B = ctx.brand, C = CARD, bw = C.perf - 2 * C.pad, lh = Math.min(72, bw / asp(ctx));
  const line = wrap(ctx, B.lines.others[0], 22, bw, 600);
  const inner = logoAt(ctx, R, R.table, C.pad, C.pad, lh)
    + t(C.pad, C.h - C.pad - line.length * 28, linesHtml(line), `font:600 22px/28px var(--body);color:${R.paper}`, { w: bw })
    + holesV(C.perf, 16, C.h - 16, R.field, C.w, C.h)
    + t(C.perf + (C.w - C.perf - 24) / 2, C.pad, A(B.applications.site.url), `font:600 17px/24px var(--body);color:${R.paper};writing-mode:vertical-rl;white-space:nowrap`);
  if (bodyW(ctx, B.applications.site.url, 17, 600) > C.h - 2 * C.pad) throw new Error('ticket g5: the url is longer than the card stub');
  return { html: root(C.w, C.h, R.table, inner), w: C.w, h: C.h };
}
// the back: the same perforation, seen from behind (so on the left), and the person on the body, on the paper colour
function cardBack(ctx, R) {
  const B = ctx.brand, c = B.applications.card, C = CARD, x0 = C.w - C.perf + C.pad, bw = C.w - x0 - C.pad, ink = R.onPaper().fieldInk;
  const name = fitBlock(ctx, c.person, { x: x0, y: C.pad, w: bw, max: 44, min: 14, maxLines: 2, color: ink });
  const contact = [c.contact, B.applications.site.url];
  contact.forEach((s) => { if (bodyW(ctx, s, 17) > bw) throw new Error(`ticket g5: "${s}" is wider than the card`); });
  const inner = name.html
    + t(x0, C.pad + name.height + 8, A(c.role), `font:400 17px/24px var(--body);color:${ink}`, { w: bw })
    + t(x0, C.h - C.pad - 48, contact.map((s) => `<span class="ln">${A(s)}</span>`).join(''), `font:400 17px/24px var(--body);color:${ink}`, { w: bw })
    + holesV(C.w - C.perf, 16, C.h - 16, ink, C.w, C.h);
  return { html: root(C.w, C.h, R.paper, inner), w: C.w, h: C.h };
}

// ================================================================ social: each post is a ticket, the line on the body and the logo on the stub
// the logo on a post's stub: as tall as 96 px allows, never wider than 560
const postLogo = (ctx) => Math.min(96, 560 / asp(ctx));
function square(ctx, R) {
  const B = ctx.brand, W = 1080, perf = 820, lh = postLogo(ctx);
  const line = fitBlock(ctx, B.applications.social[0], { x: 88, y: 88, w: 904, max: 200, min: 88, maxLines: 4, color: R.paper });
  const inner = line.html + holesH(24, W - 24, perf, 5, 24, R.field, W, W)
    + logoAt(ctx, R, R.table, 88, perf + (W - perf - lh) / 2, lh);
  return { html: root(W, W, R.table, inner), w: W, h: W };
}
function portrait(ctx, R) {
  const B = ctx.brand, W = 1080, H = 1350, P = R.onPaper(), ink = P.fieldInk, perf = 1090, lh = postLogo(ctx);
  // a brand with photographs leads with its first one; a brand without prints the line large on the paper colour
  const shot = (B.imagery.shots || []).find((s) => s.photo);
  let inner = '', top = 88;
  if (shot) { inner += `<div class="a" style="left:0;top:0;width:${W}px;height:700px">${ctx.photo(shot.id, { style: 'width:100%;height:100%' })}</div>`; top = 760; }
  const line = fitBlock(ctx, B.applications.social[1], { x: 88, y: top, w: 904, max: shot ? 132 : 180, min: 72, maxLines: shot ? 2 : 4, color: ink });
  inner += line.html + holesH(24, W - 24, perf, 5, 24, ink, W, H) + logoAt(ctx, P, R.paper, 88, perf + (H - perf - lh) / 2, lh);
  return { html: root(W, H, R.paper, inner), w: W, h: H };
}
// the story: a field-coloured ticket in the middle of the bar top, die-cut where its perforation crosses the edges; 250 px kept clear top and bottom
const STORY = { w: 1080, h: 1920, tx: 96, ty: 480, tw: 888, th: 960, perf: 1160 };
function storyInner(ctx, R) {
  const B = ctx.brand, S = STORY, lh = postLogo(ctx);
  const line = fitBlock(ctx, B.applications.social[2], { x: S.tx + 56, y: S.ty + 56, w: S.tw - 112, max: 160, min: 72, maxLines: 4, color: R.fieldInk });
  return `<div class="a" style="left:${S.tx}px;top:${S.ty}px;width:${S.tw}px;height:${S.th}px;background:${R.field}"></div>`
    + line.html
    + holesH(S.tx + 40, S.tx + S.tw - 40, S.perf, 5, 24, R.table, S.w, S.h)
    + `<svg class="a" style="left:0;top:0" width="${S.w}" height="${S.h}" viewBox="0 0 ${S.w} ${S.h}" aria-hidden="true"><g fill="${R.table}"><circle cx="${S.tx}" cy="${S.perf}" r="24"/><circle cx="${S.tx + S.tw}" cy="${S.perf}" r="24"/></g></svg>`
    + logoAt(ctx, R, R.field, S.tx + 56, S.perf + (S.ty + S.th - S.perf - lh) / 2, lh)
    + t(S.tx, S.ty + S.th + 72, A(B.applications.site.url), `font:400 36px/44px var(--body);color:${R.paper};white-space:nowrap`);
}
const story = (ctx, R) => ({ html: root(STORY.w, STORY.h, R.table, storyInner(ctx, R)), w: STORY.w, h: STORY.h });
// the phone at the door: the story as the viewer shows it, under the clock and a full progress line, 390 x 844
export function phoneStory(ctx, R) {
  const W = 390, H = 844, k = W / STORY.w, c = ctx.brand.ui.screen.content;
  const inner = t(24, 12, A(c.time), `font:600 15px/20px var(--body);color:${R.paper};font-variant-numeric:tabular-nums`)
    + `<div class="a" style="left:8px;top:48px;width:${W - 16}px;height:2px;background:${R.paper}"></div>`
    + `<div class="a" style="left:0;top:60px;width:${STORY.w}px;height:${STORY.h}px;zoom:${r2(k * 10000) / 10000}">${storyInner(ctx, R)}</div>`;
  return { html: root(W, H, R.table, inner), w: W, h: H };
}

// ================================================================ email: the signature, a small ticket with the logo on its stub
// lt: the mail's ground and text roles (the product's light surface). Returns { html, w, h } at true size, positioned at 0, 0.
function signature(ctx, R, lt) {
  const B = ctx.brand, e = B.applications.email, c = B.applications.card;
  const rows = [[e.person, 15, 600, 20], [e.role, 13, 400, 18], [c.contact, 13, 400, 18], [B.applications.site.url, 13, 400, 18]];
  const slot = ctx.edition === 'slot';   // slot: the placeholders are compact boxes, so the text column is a fixed width, not a measure of the sentinels
  const textW = slot ? 196 : Math.ceil(Math.max(...rows.map(([s, size, wt]) => bodyW(ctx, s, size, wt)))) + 4;
  const stubW = 136, lw = stubW - 32, lh = Math.min(32, lw / asp(ctx)), H = 104, W = stubW + 20 + textW;
  let y = (H - rows.reduce((s, r) => s + r[3], 0)) / 2;
  const text = rows.map(([s, size, wt, line], i) => { const out = t(stubW + 20, y, A(s), `font:${wt} ${size}px/${line}px var(--body);color:${lt.text};white-space:nowrap`); y += line; return out; }).join('');
  const html = `<div class="g5-sig${slot ? ' ph-tight' : ''}" style="width:${W}px;height:${H}px">`
    + `<div class="a" style="left:0;top:0;width:${stubW}px;height:${H}px;background:${R.field}"></div>`
    + logoAt(ctx, R, R.field, 16, (H - lh) / 2, lh)
    + holesV(stubW - 8, 8, H - 8, lt.surface, W, H)
    + text + '</div>';
  return { html, w: W, h: H, stubW, logoW: r2(lh * asp(ctx)) };
}
// the message as the mail client shows it, 1280 x 800: subject, sender, recipient and time, the body, then the signature
function mailArt(ctx, R) {
  const B = ctx.brand, g = B.guideB.email, e = B.applications.email, c = B.applications.card, lt = ctx.roles.light, W = 1280, H = 800, X = 120;
  const sig = signature(ctx, R, lt);
  let y = 72, inner = '';
  inner += t(X, y, A(g.subject), `font:600 28px/36px var(--body);color:${lt.text};white-space:nowrap`); y += 56;
  inner += t(X, y, A(e.person), `font:600 17px/24px var(--body);color:${lt.text};white-space:nowrap`)
    + t(X, y + 24, A(c.contact), `font:400 15px/22px var(--body);color:${lt.quiet};white-space:nowrap`)
    + t(0, y, A(g.time), `font:400 15px/24px var(--body);color:${lt.quiet};font-variant-numeric:tabular-nums;white-space:nowrap`, { right: W - X }, W);
  y += 60;
  inner += t(X, y, A(g.to), `font:400 15px/22px var(--body);color:${lt.quiet};white-space:nowrap`); y += 46;
  inner += `<div class="a" style="left:${X}px;top:${y}px;width:${W - 2 * X}px;height:1px;background:${lt.divider}"></div>`; y += 40;
  g.body.forEach((p) => { const ls = wrap(ctx, p, 17, 720); inner += t(X, y, linesHtml(ls), `font:400 17px/28px var(--body);color:${lt.text}`, { w: 720 }); y += ls.length * 28 + 20; });
  y += 20;
  inner += `<div class="a" style="left:${X}px;top:${y}px;width:${sig.w}px;height:${sig.h}px">${sig.html}</div>`;
  if (y + sig.h > H - 40) throw new Error('ticket g5: the message does not fit the mail screen');
  return { html: root(W, H, lt.surface, inner), w: W, h: H };
}

// ================================================================ digital: the product's screen, 1280 x 800, the kit's components after dark
const sc = (ctx) => ctx.brand.ui.screen.content;
const ex = (ctx) => ({ account: 'Account', links: [], ...(sc(ctx).example || {}) });
function screen(ctx, R) {
  const S = sc(ctx), X = ex(ctx), ui = ctx.ui, F = S.form, dk = ctx.roles.dark, W = 1280, H = 800;
  const live = (ctx.status.find((s) => s.label === S.status) || {}).id || S.deliveries[0].status;
  const p = Math.max(0, Math.min(1, S.progress || 0)) * 100;
  const lh = Math.min(28, 160 / asp(ctx));
  const logo = `<span class="g5-logo" style="width:${px(lh * asp(ctx))};height:${px(lh)}">${ctx.logo.html('colour', { width: lh * asp(ctx), colourway: R.colourwayOn(dk.surface), color: dk.text, label: 'Logo' })}</span>`;
  const bar = `<nav class="ui-topbar" aria-label="Main">${logo}<div class="ui-topbar__links">${ui.links(X.links, 0)}</div><span class="ui-avatar" aria-label="${A(X.account)}">${A(S.initials)}</span></nav>`;
  const left = `<div class="g5-live">${ui.statusChip(live)}<h2 class="ui-display g5-eta">${A(S.eta)}</h2><p class="g5-soft">${A(S.pickup)}</p>`
    + `<div class="g5-prog"><div class="ui-progress" role="img" aria-label="${A(S.from)} to ${A(S.to)}"><div class="ui-progress__bar"><i style="width:${p}%"></i></div><span class="ui-progress__dot" style="left:${p}%"></span></div><div class="g5-ends ui-num"><span>${A(S.from)}</span><span>${A(S.to)}</span></div></div>`
    + `<div class="g5-rider"><span class="ui-avatar">${A(S.initials)}</span><div class="g5-who"><p class="g5-b">${A(S.rider)}</p><p class="g5-q ui-num">${A(S.riderNote)}</p></div>${ui.btn(S.call, { variant: 'secondary', size: 'sm' })}</div></div>`;
  const form = `<div class="g5-form">${ui.field({ id: 'g5-f1', label: F.size, kind: 'select', options: F.sizes, value: F.sizes[1] })}${ui.field({ id: 'g5-f2', label: F.dropoff, value: F.dropoffValue })}${ui.btn(F.book, { block: true })}</div>`;
  const right = `<div class="g5-side">${ui.card({ title: F.title, raised: true, action: form })}</div>`;
  const html = `<div class="ui g5-scr" data-theme="dark" style="width:${W}px;height:${H}px">${bar}<div class="g5-main">${left}${right}</div><div class="g5-rows">${ui.deliveryRows(2)}</div></div>`;
  return { html, w: W, h: H };
}

export function css(ctx) {
  // the shipped component styles and tokens, for the screen on the digital page (lane u1 writes them for the UI kit document only)
  const kit = ctx.kind === 'guidelines' ? kitCss(ctx) : '';
  return `${kit}
.pg.g5 .g5-flat{background:var(--table)}
.pg .g5-sig{position:relative;overflow:hidden}
.pg .g5-sig .a{position:absolute}
.pg .g5-mail{position:absolute;box-sizing:border-box}
.pg .g5-scr{position:relative;display:flex;flex-direction:column;overflow:hidden;background:var(--surface)}
.pg .g5-scr .ui-topbar{padding-left:48px;padding-right:48px}
.pg .g5-logo{display:block;flex:none}
.pg .g5-main{display:grid;grid-template-columns:minmax(0,1fr) 400px;gap:64px;padding:48px 48px 0}
.pg .g5-live{display:flex;flex-direction:column;align-items:flex-start;gap:16px;min-width:0}
.pg .g5-live>*{max-width:100%}
.pg .g5-eta{margin:0;font-size:var(--fs-headline);line-height:var(--lh-headline)}
.pg .g5-soft{margin:0;color:var(--text-soft);max-width:44ch}
.pg .g5-prog{width:100%;display:flex;flex-direction:column;gap:4px}
.pg .g5-ends{display:flex;justify-content:space-between;gap:12px;font-size:var(--fs-caption);line-height:var(--lh-caption);color:var(--quiet)}
.pg .g5-rider{width:100%;display:flex;align-items:center;gap:12px}
.pg .g5-who{flex:1;min-width:0}
.pg .g5-b{margin:0;font-weight:600;line-height:var(--lh-label)}
.pg .g5-q{margin:0;color:var(--quiet);font-size:var(--fs-label);line-height:var(--lh-label)}
.pg .g5-form{display:flex;flex-direction:column;gap:12px;margin-top:8px}
.pg .g5-rows{padding:32px 48px 0}
`;
}

export const guidelines = {
  // ---- business-card: the photograph on the left (the counter, the ticket roll above it), front and back on the right at 58% ----
  'business-card': (ctx) => {
    const R = roles(ctx), B = ctx.brand, front = cardFront(ctx, R), back = cardBack(ctx, R);
    // a brand photographed in daylight on the street (Kerbside) has its cards on the pick-up counter, not the box office's
    const street = isStreet(ctx), scene = street ? 'counter-till-cards' : 'late-box-office';
    const url = ctx.mockup(scene, { 'card-front': artDoc(ctx, front), 'card-back': artDoc(ctx, back) });
    let body = photo(ctx, scene, url, { x: 56, y: 56, w: 560, h: 420 }, { cx: 768, cy: 512, ww: 1365 }, street ? `${B.name} business card, front and back, on a counter` : `${B.name} business card, front and back, on a box office counter at night`);
    const f = flat(640, 56, 312, front, `${B.name} business card, front`), b = flat(640, 476 - f.h, 312, back, `${B.name} business card, back`);
    body += f.html + b.html;
    const tN = nameOf(ctx, R.table, 'the bar-top colour'), fN = nameOf(ctx, R.field, 'the field colour'), pN = nameOf(ctx, R.paper, 'the paper colour');
    const zone = note(ctx, 56, 532, 520, 'Business card, 90 × 55 mm', 'Front and back print the same perforation, a quarter of the card from one edge, so it lines up through the card.')
      + note(ctx, 640, 532, 312, 'Front and back', `The logo and the line on ${tN}, the holes and the logo’s sign in ${fN}. Name, role and contact on ${pN}.`);
    return ticketPage(ctx, R, 'business-card', { body, zone });
  },

  // ---- social: the three posts at one height across the body, the story on a phone at the door beside them ----
  social: (ctx) => {
    const R = roles(ctx), B = ctx.brand, H = 260;
    const posts = [[square(ctx, R), 'Square', '1080 × 1080 px.'], [portrait(ctx, R), 'Portrait', '1080 × 1350 px.'], [story(ctx, R), 'Story', '1080 × 1920 px. Type stays 250 px clear of the top and bottom.']];
    let x = 56, body = '';
    for (const [art, name, spec] of posts) {
      const w = r2(H * art.w / art.h), f = flat(x, 56, w, art, `${B.name} social post, ${name.toLowerCase()}`);
      body += f.html + cap(ctx, x, 56 + H + 16, Math.max(w, 120), name, spec);
      x += w + 16;
    }
    // Encore's story is held up at the door; Kerbside's is read by a rider at a crossing (the scene is a courier's glove, a bike's bars and the lights)
    const street = isStreet(ctx), scene = street ? 'kerb-crossing-phone' : 'late-door-scan';
    const url = ctx.mockup(scene, [artDoc(ctx, phoneStory(ctx, R))]);
    body += photo(ctx, scene, url, { x: 718, y: 56, w: 234, h: 420 }, street ? { cx: 540, cy: 520, ww: 640 } : { cx: 711, cy: 640, ww: 613 }, street ? `${B.name} story on a rider's phone at a crossing` : `${B.name} story on a phone held up to the door scanner`);
    const zone = note(ctx, 56, 532, 520, 'Each post is a ticket', 'The line is printed on the body, and the logo sits on the stub under a row of holes. One post, one line.')
      + (street ? note(ctx, 718, 532, 234, 'At the crossing', 'The story on a rider’s phone, read while waiting at the lights.')
        : note(ctx, 718, 532, 234, 'At the door', 'The story on a phone in the queue, held up to the scanner.'));
    return ticketPage(ctx, R, 'social', { body, zone });
  },

  // ---- email-signature: the whole message on a laptop on the left; the end of it at true size on the right, the signature at its foot ----
  'email-signature': (ctx) => {
    const R = roles(ctx), B = ctx.brand, lt = ctx.roles.light, g = B.guideB.email, e = B.applications.email;
    const url = ctx.mockup('late-laptop-desk', [artDoc(ctx, mailArt(ctx, R))]);
    let body = photo(ctx, 'late-laptop-desk', url, { x: 56, y: 56, w: 488, h: 420 }, { cx: 960, cy: 520, ww: 940 }, `${B.name} email open on a laptop at night`);
    // the panel: the mail's ground, the message's last paragraph and the signature, at 100%
    const sig = signature(ctx, R, lt), PX = 568, PW = 384, pad = 16;
    if (sig.w > PW - 2 * pad) throw new Error(`ticket g5: the signature is ${sig.w} px, wider than its ${PW - 2 * pad} px panel`);
    const para = wrap(ctx, g.body[g.body.length - 1], 13, PW - 2 * pad);
    const ph = pad + para.length * 20 + 24 + sig.h + pad;
    body += `<div class="a g5-mail${ctx.edition === "slot" ? " ph-tight" : ""}" style="left:${PX}px;top:56px;width:${PW}px;height:${ph}px;background:${lt.surface}">`
      + `<div class="a" style="left:${pad}px;top:${pad}px;width:${PW - 2 * pad}px;font:400 13px/20px var(--body);color:${lt.text}">${linesHtml(para)}</div>`
      + `<div class="a" style="left:${pad}px;top:${pad + para.length * 20 + 24}px;width:${sig.w}px;height:${sig.h}px">${sig.html}</div></div>`;
    const bf = B.fonts.body.family, specs = [
      ['At true size', 'The end of the message at 100%, as a mail client renders it.'],
      ['Type', `${bf}, the name at 15 px semibold, the rest at 13 px.`],
      ['Logo', `On the stub, ${sig.logoW} px wide, ${sig.stubW} px stub.`],
    ];
    let y = 56 + ph + 24;
    for (const [n, s] of specs) { body += cap(ctx, PX, y, PW, n, s); y += 18 + wrap(ctx, s, 12, PW).length * 16 + 12; }
    if (y - 12 > 476) throw new Error('ticket g5: the signature notes run past the ticket');
    const zone = note(ctx, 56, 532, 488, 'On screen', `The whole message from ${e.person}, with the signature at its foot.`)
      + note(ctx, PX, 532, PW, 'Live text', 'Every word is text, not a picture, so it still reads with images off. Only the stub is an image.');
    return ticketPage(ctx, R, 'email-signature', { body, zone });
  },

  // ---- digital: the product screen across the body at 47%, the same screen on a laptop at night beside it ----
  digital: (ctx) => {
    const R = roles(ctx), B = ctx.brand, scr = screen(ctx, R);
    const art = { html: root(scr.w, scr.h, ctx.roles.dark.surface, scr.html), w: scr.w, h: scr.h };
    const url = ctx.mockup('late-laptop-desk', [artDoc(ctx, art)]);
    const f = flat(56, 56, 600, art, `${B.ui.screen.title}, the product screen`);
    let body = f.html + photo(ctx, 'late-laptop-desk', url, { x: 672, y: 56, w: 280, h: 420 }, { cx: 1020, cy: 512, ww: 683 }, `${B.name} on a laptop at night`);
    body += el(56, 56 + f.h + 16, 'c13 b ink', A(B.ui.screen.title), '', 600) + el(56, 56 + f.h + 34, 'c12 ink', `${scr.w} × ${scr.h} px, dark, shown at ${Math.round(600 / scr.w * 100)}%.`, '', 600);
    const zone = note(ctx, 56, 532, 520, 'Built from the kit', 'The top bar, the status, the live line, the progress, a raised card with a select and an input, the list rows and the one filled button. Nothing on the screen is drawn for this page.')
      + note(ctx, 672, 532, 280, 'After dark', `${B.applications.site.url}, on a laptop at night.`);
    return ticketPage(ctx, R, 'digital', { body, zone });
  },
};
