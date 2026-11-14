// Lane g5 for theme 21 (applications): social, signage, email-signature, digital. Business-card is one of 21's round 1 pages and stays as it is.
// The pages speak the slide language of guidelines-r1.js: fields in the brand's role colours meeting at straight edges, one big thing a slide, everything
// else at 12 to 15 px, and the one running head at y 28. Each page holds the flat artwork itself (the posts, the sign face, the signature, the screen),
// drawn from the brand's colour fields, and one photograph from the theme's scene library (10_library_map.md, row 21) as proof that it works. Nothing is
// laid over a photograph. Colours come by role, never by id; display lines are measured with the brand's own font files and set as explicit lines.
// Styles: g5- classes below, plus the r- classes of css-r1.js. Art drawn for a scene is inline-styled, because the art page has no pg--r.
import { plateImg } from '../../engine/plate.js';
import { deliveryRows } from './once.js';
import { onceRe, sentences } from './lane-g3-kit.js';
import { A } from './helpers.js';
import { outline } from '../../engine/logo.js';
import { loadFont } from '../../engine/nodeFont.js';
import { logoAt as uiLogo, sc } from './lane-u3-lib.js';

// ---- measuring (as in lane-g1.js) ------------------------------------------------------------------------------------------------
const face = (ctx, role, weight) => ctx.faces.find((f) => f.role === role && f.style !== 'italic' && f.weight === weight) || ctx.faces.find((f) => f.role === role && f.style !== 'italic');
const dispW = (ctx) => ctx.brand.fonts.display.weights[ctx.brand.fonts.display.weights.length - 1];
const textW = (ctx, role, weight, text, size, track = 0) => { const o = outline(loadFont(face(ctx, role, weight).stem), text, size, track); return (o.x2 - Math.min(0, o.x1)) * 1.02; };
function greedy(ctx, role, weight, words, size, maxW, track) {
  const out = []; let cur = '';
  for (const w of words) { const t = cur ? `${cur} ${w}` : w; if (cur && textW(ctx, role, weight, t, size, track) > maxW) { out.push(cur); cur = w; } else cur = t; }
  if (cur) out.push(cur);
  return out;
}
function balanced(ctx, role, weight, text, size, maxW, track) {
  const words = text.split(' '), n = greedy(ctx, role, weight, words, size, maxW, track).length;
  if (n === 1) return [text];
  let lo = Math.max(...words.map((w) => textW(ctx, role, weight, w, size, track))), hi = maxW;
  for (let i = 0; i < 14; i++) { const mid = (lo + hi) / 2; if (greedy(ctx, role, weight, words, size, mid, track).length <= n) hi = mid; else lo = mid; }
  return greedy(ctx, role, weight, words, size, hi, track);
}
// display lines: the whole text on one line if it fits, else whole sentences to a line, a sentence still too wide balanced
function wrapLines(ctx, text, size, maxW, track = -0.01) {
  const dw = dispW(ctx);
  if (textW(ctx, 'display', dw, text, size, track) <= maxW) return [text];
  const lines = []; let cur = '';
  for (const s of text.split(/(?<=[.!?]) /)) {
    const t = cur ? `${cur} ${s}` : s;
    if (cur && textW(ctx, 'display', dw, t, size, track) > maxW) { lines.push(...balanced(ctx, 'display', dw, cur, size, maxW, track)); cur = s; } else cur = t;
  }
  if (cur) lines.push(...balanced(ctx, 'display', dw, cur, size, maxW, track));
  return lines;
}
// the largest display size from hi down to lo at which the text sets in maxLines lines or fewer, no line wider than maxW
function fitSet(ctx, text, hi, lo, maxW, maxLines, track = -0.01) {
  const dw = dispW(ctx);
  for (let s = hi; s > lo; s -= 2) { const lines = wrapLines(ctx, text, s, maxW, track); if (lines.length <= maxLines && lines.every((l) => textW(ctx, 'display', dw, l, s, track) <= maxW)) return { size: s, lines }; }
  return { size: lo, lines: wrapLines(ctx, text, lo, maxW, track) };
}
const px = (n) => +(+n).toFixed(2);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// ---- colour roles and the chrome rule (as in guidelines-r1.js) ----------------------------------------------------------------
const L = (ctx) => ctx.roles.light;
const byRole = (ctx, role) => ctx.colours.find((c) => c.role === role);
const inkOn = (ctx, hex) => (ctx.ratio(L(ctx).text, hex) >= ctx.ratio(L(ctx).surface, hex) ? L(ctx).text : L(ctx).surface);
const chromeOn = (ctx, hex) => {
  const q = [L(ctx).quiet, L(ctx).quietOnSunken, ctx.roles.dark.quiet].find((c) => ctx.ratio(c, hex) >= 4.5);
  return q || [L(ctx).text, L(ctx).surface, ctx.roles.dark.textSoft].sort((a, b) => ctx.ratio(b, hex) - ctx.ratio(a, hex))[0];
};
const softOn = (ctx, hex) => {
  const ink = inkOn(ctx, hex);
  if (ink === L(ctx).text) return ctx.ratio(L(ctx).textSoft, hex) >= 4.5 ? L(ctx).textSoft : ink;
  return ctx.ratio(ctx.roles.dark.textSoft, hex) >= 4.5 ? ctx.roles.dark.textSoft : ink;
};
const dark = (ctx) => byRole(ctx, 'text').hex;
const act = (ctx) => byRole(ctx, 'action');
const panel = (ctx) => L(ctx).sunken;

const box = (x, y, w, h, st = '', inner = '', cls = '') => `<div class="r-a${cls ? ' ' + cls : ''}" style="left:${px(x)}px;top:${px(y)}px;${w ? `width:${px(w)}px;` : ''}${h ? `height:${px(h)}px;` : ''}${st}">${inner}</div>`;
const field = (x, y, w, h, hex) => box(x, y, w, h, `background:${hex}`);
// a note: a 12 px label at weight 600, its text under it; the browser wraps the text, so a placeholder of another length still fits the column
const note = (x, y, w, label, text, ink, soft, { bottom } = {}) => box(x, bottom === undefined ? y : 0, w, 0, `${bottom === undefined ? '' : `top:auto;bottom:${bottom}px;`}`, `<p class="r-t12 r-w600" style="color:${ink}">${label}</p><p class="r-t12 g5-gap" style="color:${soft}">${text}</p>`);

function head(ctx, id, { left, right } = {}) {
  const p = ctx.pages.find((x) => x.id === id), g = L(ctx).surface;
  const cl = chromeOn(ctx, left || g), cr = chromeOn(ctx, right || left || g);
  const folio = String(ctx.pageNo(id)).padStart(3, '0');
  return `<div class="r-hd"><span class="r-hl num" style="color:${cl}">${p.ref ? `<b>${p.ref}</b>` : ''}${A(p.title)}</span><span class="r-hr num" style="color:${cr}"><i>${A(ctx.brand.name)} brand guidelines</i><b>${folio}</b></span></div>`;
}
const page = (id, inner, bg) => `<section class="pg pg--r g5" data-page="${id}" style="background:${bg}">${inner}</section>`;

// ---- art: boxes with inline styles only, so they draw the same on the page and on an art page ---------------------------------
const ab = (x, y, w, h, st = '', inner = '') => `<div style="position:absolute;box-sizing:border-box;left:${px(x)}px;top:${px(y)}px;${w ? `width:${px(w)}px;` : ''}${h ? `height:${px(h)}px;` : ''}${st}">${inner}</div>`;
const abB = (x, bottom, w, st = '', inner = '') => `<div style="position:absolute;box-sizing:border-box;left:${px(x)}px;bottom:${px(bottom)}px;${w ? `width:${px(w)}px;` : ''}${st}">${inner}</div>`;
const dispCss = (ctx, size, lh, color) => `color:${color};font-size:${size}px;line-height:${lh};font-stretch:${ctx.brand.fonts.display.stretch || 100}%`;
const dispLines = (lines) => lines.map((l) => `<p class="disp" style="margin:0;white-space:nowrap">${A(l)}</p>`).join('');
// the art at its own size, shown on the page at k with zoom (zoom keeps the type as vector and the PDF at 1:1)
const zoomed = (x, y, w, h, k, inner, st = '') => box(x, y, w * k, h * k, `overflow:hidden;${st}`, `<div style="position:relative;width:${w}px;height:${h}px;zoom:${k};overflow:hidden">${inner}</div>`);

// the logo colourway whose ground is this colour; else the plain colour logo on a light ground, the light mono on a dark one
const logoOn = (ctx, hex) => Object.entries(ctx.brand.logo.colourways).find(([, v]) => v.ground.toLowerCase() === hex.toLowerCase())?.[0] || (inkOn(ctx, hex) === L(ctx).surface ? 'mono-light' : 'colour');
const lid = (ctx) => (ctx.logo.geos.horizontal ? 'horizontal' : 'colour');
const lockH = (ctx, id, w) => (w * ctx.logo.geos[id].h) / ctx.logo.geos[id].w;
// The logo, or in the slot edition the theme's one frame (as in guidelines-r1.js): a dashed line that reads 1.5 px and a 12 px label as they land on the
// page, k being the scale the art is shown at. "Your logo goes here" where it fits, "Logo" where it does not.
function logoAt(ctx, id, width, { k = 1, ink, colourway } = {}) {
  if (ctx.edition !== 'slot') return ctx.logo.html(id, { width, colourway, color: ink });
  const g = ctx.logo.geos[id], h = Math.max((width * g.h) / g.w, 20 / k), line = +(1.5 / k).toFixed(2);
  const bw = ctx.brand.fonts.body.weights.includes(500) ? 500 : ctx.brand.fonts.body.weights[0], per = (t) => textW(ctx, 'body', bw, t, 100, 0) / 100;
  const room = width - 2 * line - 8 / k, high = h - 2 * line;
  let text = 'Your logo goes here', fs = 12 / k;
  if (per(text) * fs > room) text = 'Logo';
  fs = Math.min(fs, room / per(text), high / 1.2);
  return `<div class="logo-slot" role="img" aria-label="Logo slot" style="width:${px(width)}px;height:${px(h)}px;box-sizing:border-box;border:${line}px dashed ${ink};color:${ink};display:flex;align-items:center;justify-content:center;font:${bw} ${px(fs)}px/1.2 var(--body);text-align:center;white-space:nowrap">${text}</div>`;
}

// ---- scenes ----------------------------------------------------------------------------------------------------------------------
const quadEdge = (q) => { const d = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]); return (d(q[0], q[1]) + d(q[3], q[2])) / 2; };
// a crop of a scene for a w x h box: ch scene px tall (less where the scene is narrower), centred on the surface, kept inside the scene
function sceneCrop(ctx, id, w, h, ch, { dx = 0, dy = 0 } = {}) {
  const s = ctx.sceneInfo(id), q = s.quads[0].corners;
  let hh = Math.min(ch, s.h), ww = (hh * w) / h;
  if (ww > s.w) { ww = s.w; hh = (ww * h) / w; }
  const cx = q.reduce((a, p) => a + p[0], 0) / 4 + dx, cy = q.reduce((a, p) => a + p[1], 0) / 4 + dy;
  return { s, c: { x: clamp(cx - ww / 2, 0, s.w - ww), y: clamp(cy - hh / 2, 0, s.h - hh), w: ww, h: hh }, k: w / ww, edge: quadEdge(q) };
}
const photo = (url, cr, x, y, w, h, alt) => box(x, y, w, h, 'overflow:hidden', `${plateImg(`${A(url)}`, `${A(alt)}`, `position:absolute;display:block;max-width:none;width:${px(cr.s.w * cr.k)}px;height:${px(cr.s.h * cr.k)}px;left:${px(-cr.c.x * cr.k)}px;top:${px(-cr.c.y * cr.k)}px`)}`);

// ---- social: the three posts, drawn flat at their own sizes in the brand's fields -----------------------------------------------
// the brand's social line i; for a brand that says a word once, the lines without it, then the first sentence of its short boilerplate
const socialLine = (ctx, i) => {
  const s = ctx.brand.applications.social, re = onceRe(ctx);
  if (!re) return s[i];
  const ok = s.filter((t) => !re.test(t));
  return ok[i] || sentences(ctx.brand.voice.boilerplate25).find((t) => !re.test(t)) || ok[0] || s[i];
};
const SAFE = 250;   // the story's top and foot, where the apps draw their own controls
function squarePost(ctx, k) {
  const a = act(ctx).hex, ink = inkOn(ctx, a), id = lid(ctx), fit = fitSet(ctx, socialLine(ctx, 0), 170, 64, 888, 3);
  return ab(0, 0, 1080, 1080, `background:${a}`) + ab(96, 96, 888, 0, dispCss(ctx, fit.size, 0.98, ink), dispLines(fit.lines)) +
    abB(96, 96, 380, '', logoAt(ctx, id, 380, { k, ink, colourway: logoOn(ctx, a) }));
}
function portraitPost(ctx, k) {
  const d = dark(ctx), ink = inkOn(ctx, d), white = L(ctx).surface, id = lid(ctx), split = 1020, lw = 340, lh = lockH(ctx, id, lw);
  const fit = fitSet(ctx, socialLine(ctx, 1), 150, 56, 888, 4);
  return ab(0, 0, 1080, split, `background:${d}`) + ab(0, split, 1080, 1350 - split, `background:${white}`) +
    abB(96, 1350 - split + 88, 888, dispCss(ctx, fit.size, 0.98, ink), dispLines(fit.lines)) +
    ab(96, split + (1350 - split - Math.max(lh, 20 / k)) / 2, lw, 0, '', logoAt(ctx, id, lw, { k, ink: inkOn(ctx, white), colourway: logoOn(ctx, white) }));
}
function storyPost(ctx, k, { marks = false } = {}) {
  const pn = panel(ctx), a = act(ctx).hex, split = 1240, id = lid(ctx);
  const fit = fitSet(ctx, socialLine(ctx, 2), 150, 56, 888, 5);
  const m = marks ? [SAFE, 1920 - SAFE].map((y) => ab(0, y, 1080, Math.max(2, 1 / k), `background:${chromeOn(ctx, y < split ? pn : a)}`)).join('') : '';
  return ab(0, 0, 1080, split, `background:${pn}`) + ab(0, split, 1080, 1920 - split, `background:${a}`) +
    ab(96, SAFE + 72, 888, 0, dispCss(ctx, fit.size, 0.98, inkOn(ctx, pn)), dispLines(fit.lines)) +
    ab(96, split + 96, 340, 0, '', logoAt(ctx, id, 340, { k, ink: inkOn(ctx, a), colourway: logoOn(ctx, a) })) + m;
}
// the story as a phone shows it, 390 x 844: the post across the width under the three progress marks, the screen's own dark above and below
function storyScreen(ctx, k) {
  const d = dark(ctx), ks = 390 / 1080, top = 52, pn = panel(ctx);
  const bars = [0, 1, 2].map((i) => ab(12 + i * 124, top + 10, 118, 3, `background:${i === 0 ? inkOn(ctx, pn) : chromeOn(ctx, pn)}`)).join('');
  return `<div style="position:absolute;inset:0;background:${d}">${ab(0, top, 390, 1920 * ks, 'overflow:hidden', `<div style="position:relative;width:1080px;height:1920px;zoom:${ks}">${storyPost(ctx, k * ks)}</div>`)}${bars}</div>`;
}

// ---- signage: the sign face -------------------------------------------------------------------------------------------------------
// the sign's line: the part of the brand's signage text after its colon, as on the business-card page; else the brand's last other line
const signParts = (ctx) => { const s = ctx.brand.applications.signage || '', i = s.indexOf(': '); return i > 0 ? { spec: s.slice(0, i), line: s.slice(i + 2) } : { spec: s, line: ctx.brand.lines.others[ctx.brand.lines.others.length - 1] || ctx.brand.lines.primary }; };
// the sign's own proportion from its size in mm ("1185 x 1750 mm"); 2:3 where the text gives none
const signAspect = (ctx) => { const m = /(\d+)\s*[x×]\s*(\d+)\s*mm/.exec(signParts(ctx).spec); return m ? +m[1] / +m[2] : 2 / 3; };
// The face, 1200 px wide: the line on the action field, one sentence a line where it can; a band in the text colour at the foot with the logo and the address
function signArt(ctx, W, H, k) {
  const a = act(ctx).hex, d = dark(ctx), split = Math.round(H * 0.76), bandH = H - split, id = lid(ctx);
  const lw = Math.min(560, (bandH * 0.36 * ctx.logo.geos[id].w) / ctx.logo.geos[id].h), lh = lockH(ctx, id, lw);
  const fit = fitSet(ctx, signParts(ctx).line, 260, 96, W - 192, 4);
  return ab(0, 0, W, split, `background:${a}`) + ab(0, split, W, bandH, `background:${d}`) +
    ab(96, 112, W - 192, 0, dispCss(ctx, fit.size, 1, inkOn(ctx, a)), dispLines(fit.lines)) +
    ab(96, split + (bandH - Math.max(lh, 20 / k)) / 2, lw, 0, '', logoAt(ctx, id, lw, { k, ink: inkOn(ctx, d), colourway: logoOn(ctx, d) })) +
    ab(W - 96 - 600, split + bandH / 2 - 24, 600, 48, `color:${inkOn(ctx, d)};font:500 40px/48px var(--body);text-align:right;white-space:nowrap`, `<p style="margin:0">${A(ctx.brand.applications.site.url)}</p>`);
}

// ---- email: the message as a mail client draws it, with the signature at its foot ------------------------------------------------
function message(ctx, { k = 1, w, headGround, sizes = { label: 12, body: 15, subject: 22 } } = {}) {
  const B = ctx.brand, e = B.applications.email, g = (B.guideB && B.guideB.email) || {}, c = B.applications.card, white = L(ctx).surface, ink = L(ctx).text;
  const soft = softOn(ctx, white), z = sizes, id = lid(ctx), hg = headGround || white, hq = chromeOn(ctx, hg), hi = inkOn(ctx, hg);
  const row = (label, value, right = '') => `<div style="display:flex;gap:12px;align-items:baseline;font:400 ${z.body}px/${z.body * 1.6}px var(--body);color:${hi}"><span style="flex:none;width:${z.label * 5}px;font-size:${z.label}px;color:${hq}">${label}</span><span style="flex:1;min-width:0">${value}</span>${right ? `<span class="num" style="flex:none;font-size:${z.label}px;color:${hq}">${right}</span>` : ''}</div>`;
  const headRows = row('From', `${A(e.person)}, ${A(c.contact)}`, A(g.time || '')) + (g.to ? row('To', A(g.to)) : '');
  const body = (g.body || []).map((t) => `<p style="margin:0 0 ${z.body * 0.8}px;font:400 ${z.body}px/${z.body * 1.6}px var(--body);color:${ink}">${A(t)}</p>`).join('');
  const sig = `<div style="margin-top:${z.body * 1.6}px;padding-top:${z.body * 1.6}px;border-top:1px solid ${L(ctx).divider}">` +
    `<div style="margin-bottom:${z.body}px">${logoAt(ctx, id, 160 * (z.body / 15), { k, ink, colourway: logoOn(ctx, white) })}</div>` +
    `<p style="margin:0;font:600 ${z.body}px/${z.body * 1.6}px var(--body);color:${ink}">${A(e.person)}</p>` +
    `<p style="margin:0;font:400 ${z.label}px/${z.label * 1.4}px var(--body);color:${soft}">${A(e.role)}</p>` +
    `<p style="margin:${z.label * 0.6}px 0 0;font:400 ${z.label}px/${z.label * 1.4}px var(--body);color:${ink}">${A(c.contact)}</p>` +
    `<p style="margin:0;font:400 ${z.label}px/${z.label * 1.4}px var(--body);color:${ink}">${A(B.applications.site.url)}</p></div>`;
  return { head: headRows, subject: g.subject ? `<p style="margin:0 0 ${z.body}px;font:600 ${z.subject}px/${z.subject * 1.3}px var(--body);color:${ink}">${A(g.subject)}</p>` : '', body, sig, w };
}
// the reading pane on the laptop, 1440 x 900, drawn at half size and zoomed 2, so its type reads at a laptop's real scale
function mailScreen(ctx, k) {
  const pn = panel(ctx), white = L(ctx).surface, m = message(ctx, { k: k * 2, headGround: pn, sizes: { label: 11, body: 13, subject: 18 } });
  return `<div style="position:absolute;left:0;top:0;width:720px;height:450px;zoom:2;background:${white}">` +
    ab(0, 0, 720, 64, `background:${pn};padding:12px 40px`, m.head) +
    ab(40, 88, 560, 0, '', m.subject + m.body + m.sig) + `</div>`;
}

// ---- digital: the Track screen as the code package's components build it (the markup of lane-u3.js, at the laptop's 1440 x 900) ---
const progress = (S) => `<div class="ui-progress" role="progressbar" aria-label="Progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(S.progress * 100)}"><div class="ui-progress__bar"><i style="width:${S.progress * 100}%"></i></div><span class="ui-progress__dot" style="left:${S.progress * 100}%"></span></div><div class="ks-route"><span>${A(S.from)}</span><span>${A(S.to)}</span></div>`;
const riderRow = (ctx, S) => `<div class="ks-rider"><span class="ui-avatar">${A(S.initials)}</span><div class="ks-rmain"><p class="ks-rname">${A(S.rider)}</p><p class="ks-rsub">${A(S.riderNote)}</p></div>${ctx.ui.btn(S.call, { variant: 'secondary', size: 'sm', iconLeft: 'phone' })}</div>`;
const detailRows = (S) => `<dl class="ks-detail"><div><dt>${A(S.deliverToLabel)}</dt><dd>${A(S.deliverTo)}</dd></div><div><dt>${A(S.paidLabel)}</dt><dd class="ui-num">${A(S.paid)}</dd></div></dl>`;
const navItems = (ctx) => { const X = sc(ctx).example || {}, links = X.links || [], acc = X.account; return acc && !links.some(([t]) => t === acc) ? [...links, [acc, 'user']] : links; };
const DW = 1440, DH = 900;
function desktop(ctx, k) {
  const S = sc(ctx), ui = ctx.ui, nav = navItems(ctx), list = (S.example && S.example.crumbs && S.example.crumbs[0]) || ctx.brand.ui.screen.title;
  const logo = uiLogo(ctx, 'horizontal', 112, { colourway: 'colour', ink: L(ctx).text, k });
  return `<div class="ui kscreen g5-desk" style="width:${DW}px;height:${DH}px">
<nav class="ui-topbar" aria-label="Main">${logo}<div class="ui-topbar__links">${ui.links(nav.slice(0, 3), 0)}</div><span class="ks-clock ui-num">${A(S.time)}</span></nav>
<div class="ks-main">
<section class="ks-track" aria-label="${A(ctx.brand.ui.screen.title)}">
<p class="ks-title">${A(ctx.brand.ui.screen.title)}</p>
<div class="ks-eta"><h2 class="ui-display ks-time">${A(S.eta)}</h2>${ui.statusChip(S.deliveries[0].status)}</div>
<p class="ks-pickup">${A(S.pickup)}</p>
<div class="ks-prog">${progress(S)}</div>
${riderRow(ctx, S)}
${detailRows(S)}
${ui.btn(S.share, { variant: 'secondary', block: true })}
</section>
<section class="ks-deliv" aria-label="${A(list)}"><p class="ks-title">${A(list)}</p>${deliveryRows(ctx, 5)}<div class="ks-book">${ui.btn(S.form.book, { iconRight: 'arrow-right' })}</div></section>
</div></div>`;
}
const liveIsAction = (ctx) => ctx.status.find((s) => s.id === sc(ctx).deliveries[0].status)?.tone === 'action';

export const guidelines = {
  // Social: the post on a phone at the kerb is the slide's photograph, down the first third. The three posts stand on the white beside it, flat and at one
  // scale, so the square, the portrait and the story rise left to right as their real heights do; each is the brand's fields with one line and the logo.
  social(ctx) {
    const B = ctx.brand, W = ctx.size.w, H = ctx.size.h, white = L(ctx).surface, ink = L(ctx).text, soft = softOn(ctx, white), quiet = chromeOn(ctx, white);
    const pw = 448, scene = 'kerb-crossing-phone', cr = sceneCrop(ctx, scene, pw, H - 72, 1120, { dy: 60 });
    const url = ctx.mockup(scene, [{ html: ctx.artPage(storyScreen(ctx, (cr.edge * cr.k) / 390), { w: 390, h: 844 }), w: 390, h: 844 }]);
    const x0 = pw + 56, gap = 24, cw = (W - 56 - x0 - 2 * gap) / 3, k = cw / 1080, base = 584;
    const posts = [['Square', 1080, squarePost(ctx, k), `${act(ctx).name} ground. The line at the top, the logo at the foot.`],
      ['Portrait', 1350, portraitPost(ctx, k), `The line on ${byRole(ctx, 'text').name}, the logo on a ${byRole(ctx, 'ground')?.name || 'white'} band.`],
      ['Story', 1920, storyPost(ctx, k, { marks: true }), `Type keeps ${SAFE} px clear of the top and foot, marked here. Left, on a phone.`]];
    let out = photo(url, cr, 0, 72, pw, H - 72, `${B.name} story post on a phone held at a crossing`);
    posts.forEach(([name, h, art, text], i) => {
      const x = x0 + i * (cw + gap);
      out += zoomed(x, base - h * k, 1080, h, k, art) + note(x, base + 16, cw, `${name}, <span class="num">1080 × ${h}</span> px`, A(text), ink, soft);
    });
    const leadW = 2 * cw + gap;
    out += box(x0, 104, leadW, 0, `color:${ink}`, '<p class="r-lead">One line and the logo to a post, set on the brand’s own fields.</p>') +
      box(x0, 168, leadW, 0, `color:${quiet}`, `<p class="r-t12">The three formats at one scale, <span class="num">${Math.round(k * 1000) / 10}%</span>, so their heights compare.</p>`);
    return page('social', out + head(ctx, 'social'), white);
  },

  // Signage: the sign face at full height on a panel field across the left, with what it is beside it; the same face photographed where it is put up,
  // down the right. The face is two fields: the line on the action colour, the logo and the address on a band of the text colour.
  signage(ctx) {
    const B = ctx.brand, W = ctx.size.w, H = ctx.size.h, pn = panel(ctx), white = L(ctx).surface, inkP = inkOn(ctx, pn), softP = softOn(ctx, pn), quietP = chromeOn(ctx, pn);
    const asp = signAspect(ctx), AW = 1200, AH = Math.round(AW / asp), fx = 720;
    // the scene whose panel is nearest the sign's own proportion: a shelter poster or a wharf board
    const gallery = /wall text/i.test(B.applications.signage || ''), scene = gallery ? 'room-gallery-panel' : ['kerb-shelter-morning', 'kerb-wharf-board'].map((id) => ({ id, d: Math.abs(ctx.sceneInfo(id).quads[0].aspect - asp) })).sort((a, b) => a.d - b.d)[0].id;
    const place = scene === 'room-gallery-panel' ? 'On the entrance wall, right.' : scene === 'kerb-shelter-morning' ? 'In a bus shelter, right.' : 'On a ferry wharf, right.';
    // the shelter photo cuts a cyclist at its right edge (from about 0.91 of the width): that crop stays left of it
    const cr = scene === 'kerb-shelter-morning' ? sceneCrop(ctx, scene, W - fx, H - 72, 1060, { dx: -400 }) : sceneCrop(ctx, scene, W - fx, H - 72, 1180);
    const url = ctx.mockup(scene, [{ html: ctx.artPage(signArt(ctx, AW, AH, (cr.edge * cr.k) / AW), { w: AW, h: AH }), w: AW, h: AH }]);
    const fh = H - 104 - 56, k = fh / AH, fw = AW * k, cx = 56 + fw + 40, colW = fx - 56 - cx;
    const { spec } = signParts(ctx), a = act(ctx), d = byRole(ctx, 'text');
    let out = field(0, 0, fx, H, pn) + zoomed(56, 104, AW, AH, k, signArt(ctx, AW, AH, k));
    out += box(cx, 104, colW, 0, '', `<p class="r-t15 r-w600" style="color:${inkP}">${A(spec)}</p><p class="r-t12 g5-gap" style="color:${quietP}">The face at <span class="num">${Math.round(k * 1000) / 10}%</span>. ${place}</p>`);
    out += note(cx, 0, colW, A(a.name), `The line, in ${A(B.fonts.display.family)}, as large as the field allows. It fills three quarters of the face.`, inkP, softP, { bottom: 56 + 112 }) +
      note(cx, 0, colW, A(d.name), 'A band at the foot holds the logo and the address, so the line has the field to itself.', inkP, softP, { bottom: 56 });
    out += photo(url, cr, fx, 72, W - fx, H - 72, `${B.name} sign photographed in place`);
    return page('signage', out + head(ctx, 'signage', { left: pn, right: white }), white);
  },

  // Email signature: the message as it reads in a mail client, at its real size, down the left half: who it is from, the subject, the text, and the
  // signature under a hairline. The same message open on a laptop fills the right half; the three rules for the signature run along the foot.
  'email-signature'(ctx) {
    const B = ctx.brand, W = ctx.size.w, H = ctx.size.h, white = L(ctx).surface, ink = L(ctx).text, soft = softOn(ctx, white), fx = 640, cw = fx - 112;
    const scene = 'bench-laptop-shoulder', cr = sceneCrop(ctx, scene, W - fx, H - 72, 760);
    const url = ctx.mockup(scene, [{ html: ctx.artPage(mailScreen(ctx, (cr.edge * cr.k) / DW), { w: DW, h: DH }), w: DW, h: DH }]);
    const m = message(ctx, { w: cw });
    let out = box(56, 96, cw, 0, `border-bottom:1px solid ${L(ctx).divider};padding-bottom:12px`, m.head) + box(56, 176, cw, 0, '', m.subject + m.body + m.sig);
    const n3 = (cw - 32) / 3, id = lid(ctx);
    [['Logo', `The ${A((ctx.logo.labels && ctx.logo.labels[id]) || id)} logo, <span class="num">160</span> px wide, with the name as its alt text.`],
      ['Type', `${A(B.fonts.body.family)}, live text: the name at <span class="num">15</span> px, weight <span class="num">600</span>. The rest at <span class="num">12</span> px.`],
      ['Fallback', `Where ${A(B.fonts.body.family)} is not installed, the mail client sets it in Arial.`]]
      .forEach(([l, t], i) => { out += note(56 + i * (n3 + 16), 0, n3, l, t, ink, soft, { bottom: 48 }); });
    out += photo(url, cr, fx, 72, W - fx, H - 72, `${B.name} email open on a laptop on a timber desk`);
    return page('email-signature', out + head(ctx, 'email-signature'), white);
  },

  // Digital: the product screen, flat and whole, on a field of the text colour across the right two thirds, with what it is built from under it; the
  // same screen on a laptop in a shared workroom down the left third.
  digital(ctx) {
    const B = ctx.brand, W = ctx.size.w, H = ctx.size.h, white = L(ctx).surface, d = dark(ctx), onD = inkOn(ctx, d), softD = softOn(ctx, d), pw = 480;
    const scene = 'bench-laptop-shoulder', cr = sceneCrop(ctx, scene, pw, H - 72, 1024, { dx: -120 });
    const url = ctx.mockup(scene, [{ html: ctx.artPage(desktop(ctx, (cr.edge * cr.k) / DW), { w: DW, h: DH }), w: DW, h: DH }]);
    const sx = pw + 56, sw = W - 56 - sx, k = sw / DW, sh = DH * k, a = act(ctx);
    let out = photo(url, cr, 0, 72, pw, H - 72, `${B.name} ${B.ui.screen.title} screen on a laptop`) + field(pw, 0, W - pw, H, d);
    out += box(sx, 104, sw, sh, 'overflow:hidden', `<div style="zoom:${k}">${desktop(ctx, k)}</div>`);
    const n3 = (sw - 32) / 3, y = 104 + sh + 32;
    [[A(B.ui.screen.title), `<span class="num">${DW} × ${DH}</span> px, shown at <span class="num">${Math.round(k * 1000) / 10}%</span>. At left, on a laptop.`],
      ['Built from the kit', 'The status chip, the progress bar, the rows and the buttons are the UI kit’s own components.'],
      [A(a.name), liveIsAction(ctx) ? 'Marks the live status and the one primary button. Nothing else on the screen.' : 'Fills the progress dot and the one primary button. Nothing else on the screen.']]
      .forEach(([l, t], i) => { out += note(sx + i * (n3 + 16), y, n3, l, t, onD, softD); });
    return page('digital', out + head(ctx, 'digital', { left: white, right: d }), white);
  },
};

export function css() {
  return `
.pg.g5 .g5-gap{margin-top:4px}
.pg .g5-desk{border:0;border-radius:0}
`;
}
