// Theme 30, Fluted, lane g5: the applications (social, signage, email-signature, digital). business-card is round 1's and is left alone.
// Every page shows the flat artwork itself at a working size and a photograph from the new scene library as the proof. Each piece stands on the band
// at y 768, the way the page's fields do on the other pages: a flat artwork's own ground runs on behind the glass as a column of its width, so it is seen flat,
// then reeded; a photograph runs on as its reflection, mirrored about the band's top edge (the business card's recipe). The band therefore shows what the page holds.
// The brand's own artwork carries the same device at its own scale: a reeded band over the palette across 57 to 85% of its height, the line above it, the logo
// below it, as the document does. Brand copy is printed whole through esc(); strings are measured to fit, never cut. Colours come from ctx roles and brand data only.
import { plateImg } from '../../engine/plate.js';
import { A, put, shell, rect, tokens, adv, logoHtml, TXT } from './helpers.js';
import { paletteFields, glassBand } from './glass.js';
import { colourMap, tokenGroups } from '../../engine/tokens.js';
import { componentsCss } from '../../engine/components.js';
import { phoneArt, phoneScene } from './lane-bk.js';

const KEY = 1184;
const lo = (h) => h.toLowerCase();

// the colourway drawn on a given ground, else the one whose name colour reads best on it (the business card's rule)
const cwOn = (ctx, bg) => {
  const cw = ctx.brand.logo.colourways, keys = Object.keys(cw);
  return keys.find((k) => lo(cw[k].ground) === lo(bg)) || keys.reduce((a, b) => (ctx.ratio(cw[b].name, bg) > ctx.ratio(cw[a].name, bg) ? b : a));
};
// the better of the page's ink and ground on a fill, asserted at the size it is set
const inkOn = (ctx, T, bg, size, weight) => {
  const fg = ctx.ratio(T.ink, bg) >= ctx.ratio(T.ground, bg) ? T.ink : T.ground;
  ctx.pair(fg, bg, { size, weight, what: '(Line on an application ground)' });
  return fg;
};
// the brand colours other than the page's ground, by share: the grounds of the artwork, so each piece has an edge against the page
const grounds = (ctx, T) => ctx.colours.slice().sort((a, b) => b.share - a.share).map((c) => c.hex).filter((h) => lo(h) !== lo(T.ground));

// the number of lines a run wraps to in a box `w` wide (measurement only; the browser sets the text whole)
function lineCount(ctx, role, text, size, w, weight) {
  const sp = adv(ctx, role, ' ', size, 0, weight);
  let n = 1, x = 0;
  for (const wd of text.trim().split(/\s+/)) {
    const a = adv(ctx, role, wd, size, 0, weight) * 1.03;
    if (x > 0 && x + sp + a > w) { n++; x = a; } else x += (x > 0 ? sp : 0) + a;
  }
  return n;
}
const widest = (ctx, role, text, size, weight) => Math.max(...text.trim().split(/\s+/).map((wd) => adv(ctx, role, wd, size, 0, weight)));
// the largest size, down from `from`, at which a run wraps inside w x room with its longest word whole; a cap, so a placeholder of another length still fits the box
function fitWrap(ctx, text, from, w, room, lh = 1.05, min = 12) {
  const wt = ctx.weights.heading;
  for (let s = from; s > min; s--) if (widest(ctx, 'display', text, s, wt) * 1.03 <= w && lineCount(ctx, 'display', text, s, w, wt) * Math.round(s * lh) <= room) return s;
  return min;
}

// ---- the brand's artwork: one recipe at any size ----
// A ground, the line top-left, a reeded band over the palette from 57 to 85% of the height, the logo in the foot below it.
// pitch is the art's reed; slotFs and slotBw size the slot frame's label and dash for where the art is seen (on the page, or photographed at a third of its size).
function artwork(ctx, T, { w, h, bg, line, id, pitch = 6, slotFs = TXT, slotBw = 1.5, slotLabel = 'Logo' }) {
  const W = ctx.weights, light = ctx.C.toOklch(bg).L >= 0.4;
  const m = Math.round(w * 0.08), by = Math.round(h * 0.57), bh = Math.round(h * 0.28), fy = by + bh, foot = h - fy;
  const s = fitWrap(ctx, line, Math.round(w * 0.12), w - 2 * m, by - m - Math.round(h * 0.04)), fg = inkOn(ctx, T, bg, s, W.heading);
  const text = `<div class="disp" style="position:absolute;left:${m}px;top:${m}px;width:${w - 2 * m}px;font-size:${s}px;line-height:${Math.round(s * 1.05)}px;color:${fg};white-space:normal">${A(line)}</div>`;
  const g = ctx.logo.geos.horizontal, lh0 = foot * 0.5, lw = Math.round(Math.min(w * 0.42, lh0 * g.w / g.h)), lh = lw * g.h / g.w;
  const logo = `<div style="position:absolute;left:${m}px;top:${(fy + (foot - lh) / 2).toFixed(1)}px">${logoHtml(ctx, T, 'horizontal', { width: lw, colourway: cwOn(ctx, bg), label: lh >= slotFs * 1.2 ? slotLabel : '', fs: slotFs, bw: slotBw, color: fg })}</div>`;
  const behind = rect(-40, by - 10, w + 80, bh + 20, bg) + paletteFields(ctx, { ground: T.ground, y: by, h: bh, W: w, actionHex: T.strong, snap: pitch });
  const band = glassBand(ctx, { id, behind, light, ground: bg, pitch, x0: 0, w, y0: by, h: bh });
  return `<div class="g5-art" style="width:${w}px;height:${h}px;background:${bg}">${text}${band}${logo}</div>`;
}

// ---- photographs ----
// P: {x, y, w, h} on the page, the scene's size (sw, sh), the source crop's top-left (sx, sy) and the scale s; the crop is asserted to sit inside the scene
function photoBox(P) {
  if (P.sx < 0 || P.sy < 0 || P.sx + P.w / P.s > P.sw + 0.5 || P.sy + P.h / P.s > P.sh + 0.5) throw new Error(`g5: crop outside the scene (${P.alt})`);
  return `<div class="a g5-ph" style="left:${P.x}px;top:${P.y}px;width:${P.w}px;height:${P.h}px">${plateImg(`${A(P.url)}`, `${A(P.alt)}`, `width:${(P.sw * P.s).toFixed(1)}px;height:${(P.sh * P.s).toFixed(1)}px;margin-left:${(-P.sx * P.s).toFixed(1)}px;margin-top:${(-P.sy * P.s).toFixed(1)}px`)}</div>`;
}
// the photograph mirrored about the band's top edge, for the glass to reed (its foot must stand on y 768)
function reflect(P) {
  const W = P.sw * P.s, H = P.sh * P.s;
  return `<svg x="${P.x}" y="768" width="${P.w}" height="384" viewBox="0 0 ${P.w} 384"><g transform="scale(1 -1)"><image href="${A(P.url)}" x="${(-P.sx * P.s).toFixed(1)}" y="${(-(P.h + P.sy * P.s)).toFixed(1)}" width="${W.toFixed(1)}" height="${H.toFixed(1)}" preserveAspectRatio="none"/></g></svg>`;
}
const scene = (ctx, id) => { const S = ctx.sceneInfo(id); return { sw: S.w, sh: S.h, aspect: S.quads[0].aspect }; };
// a flat piece's ground running on behind the glass, from its top to the band's foot
const column = (x, y, w, fill) => rect(x, y, w, 1162 - y, fill);
const key = (ctx, x, w, name, value) => put(ctx, { x, y: KEY, w, cls: 'kn', html: name }) + (value ? put(ctx, { x, y: KEY + 22, w, cls: 'k', style: 'white-space:normal', html: value }) : '');

// ---- social: the three formats standing on the band; above them the story on a phone on a kitchen bench at dusk ----
function social(ctx) {
  const T = tokens(ctx), B = ctx.brand, L = B.applications.social, G = grounds(ctx, T);
  // the phone: the story as it fills the screen (the screen's own aspect, 0.462), art drawn at 1080 px wide with a 24 px reed so the reeds survive the photograph
  const sc = scene(ctx, 'room-kitchen-phone'), aw = 1080, ah = Math.round(aw / sc.aspect);
  const story = (w, h, o) => artwork(ctx, T, { w, h, bg: G[2 % G.length], line: L[2 % L.length], ...o });
  const url = ctx.mockup('room-kitchen-phone', { 'screen-phone': { html: ctx.artPage(story(aw, ah, { id: 'fx-g5-so-ph', pitch: 24, slotFs: 48, slotBw: 5 }), { w: aw, h: ah }), w: aw, h: ah } });
  // the photo: a strip across the measure, the bench with the phone, the keys and the hand (scene y 470 to 954)
  const P = { x: 64, y: 96, w: 952, h: 300, s: 952 / sc.sw, sx: 0, sy: 470, ...sc, url, alt: `${B.name} story on a phone, on a kitchen bench at dusk` };
  // the three posts at one height, each in its own brand colour, feet on the band
  const H = 340, top = 768 - H, fm = [['Square', 1080, 1080], ['Portrait', 1080, 1350], ['Story', 1080, 1920]];
  let x = 64, posts = '', shape = '', keys = '';
  fm.forEach(([name, fw, fh], i) => {
    const w = Math.round(H * fw / fh), bg = G[i % G.length];
    posts += `<div class="a" style="left:${x}px;top:${top}px">${artwork(ctx, T, { w, h: H, bg, line: L[i % L.length], id: `fx-g5-so-${i}` })}</div>`;
    shape += column(x, top, w, bg);
    keys += key(ctx, x, Math.max(w, 160), name, `<span class="num">${fw} x ${fh}</span> px`);
    x += w + 24;
  });
  const cap = put(ctx, { x: 64, y: 404, w: 952, cls: 'k', html: 'The story on a phone, at the scale it is read.' });
  return shell(ctx, 'social', T, { shape, fields: false, html: photoBox(P) + cap + posts + keys });
}

// ---- signage: the brand's own sign. A billboard brand (its signage brief says billboard) gets the underpass wall; any other gets the street panel after dark ----
function signage(ctx) {
  const T = tokens(ctx), B = ctx.brand, G = grounds(ctx, T), lines = [B.lines.primary, ...B.lines.others];
  // the sign carries the line the brand's signage brief names when it names one of its lines, else the primary line (compared whole, never cut)
  const line = lines.find((l) => String(B.applications.signage || '').includes(l)) || B.lines.primary, bg = G[0];
  const board = /billboard|hoarding/i.test(ctx.real(String(B.applications.signage || '')));   // reads the brief to choose the scene only; what is printed is the brief itself, whole
  if (board) {
    const sc = scene(ctx, 'billboard-underpass'), aw = 1150, ah = Math.round(aw / sc.aspect);
    const url = ctx.mockup('billboard-underpass', { billboard: { html: ctx.artPage(artwork(ctx, T, { w: aw, h: ah, bg, line, id: 'fx-g5-sg-ph', pitch: 24, slotFs: 40, slotBw: 5 }), { w: aw, h: ah }), w: aw, h: ah } });
    // the photo: the whole wall, the billboard in it (scene x 100 to 1460, y 140 to 763), its foot on the band
    const P = { x: 64, y: 332, w: 952, h: 436, s: 0.7, sx: 100, sy: 140, ...sc, url, alt: `${B.name} billboard on an underpass wall` };
    // the face flat, at the sign's proportions of 2 to 1: 420 x 210 (70 reeds of 6 px)
    const FW = 420, FH = 210, face = `<div class="a" style="left:64px;top:96px">${artwork(ctx, T, { w: FW, h: FH, bg, line, id: 'fx-g5-sg' })}</div>`;
    const lead = put(ctx, { x: 508, y: 96, w: 508, cls: 'body', html: 'The face, drawn flat at the proportions of the sign. Below, the same face on the wall.' });
    const keys = key(ctx, 64, 468, 'Signage', A(B.applications.signage)) + key(ctx, 508, 508, 'In place', 'On an underpass wall, read from the road.');
    return shell(ctx, 'signage', T, { shape: reflect(P), fields: false, band: { photo: true }, html: photoBox(P) + face + lead + keys });
  }
  const sc = scene(ctx, 'late-tram-panel'), aw = 1016, ah = Math.round(aw / sc.aspect);
  const url = ctx.mockup('late-tram-panel', { panel: { html: ctx.artPage(artwork(ctx, T, { w: aw, h: ah, bg, line, id: 'fx-g5-sg-ph', pitch: 24, slotFs: 40, slotBw: 5 }), { w: aw, h: ah }), w: aw, h: ah } });
  const P = { x: 64, y: 96, w: 468, h: 672, s: 468 / sc.sw, sx: 0, sy: 30, ...sc, url, alt: `${B.name} poster in a street panel at night` };
  // the face: 456 x 672 (76 reeds of 6 px), within 0.3% of the panel's aspect
  const FX = 560, FW = 456, FH = 672;
  const face = `<div class="a" style="left:${FX}px;top:96px">${artwork(ctx, T, { w: FW, h: FH, bg, line, id: 'fx-g5-sg' })}</div>`;
  const keys = key(ctx, 64, 468, 'After dark', 'Backlit, read from the kerb.') + key(ctx, FX, FW, 'Signage', A(B.applications.signage));
  return shell(ctx, 'signage', T, { shape: reflect(P) + column(FX, 96, FW, bg), fields: false, band: { photo: true }, html: photoBox(P) + face + keys });
}

// ---- email-signature: the message as a mail client draws it, the signature at the foot at its real size; the same message on a laptop at night ----
// The panel is drawn in the light roles, as most mail is read on white. k scales it for the laptop's screen.
function mailPanel(ctx, T, { w, h, k = 1, border = false, slotFs = TXT }) {
  const B = ctx.brand, e = B.applications.email, g = B.guideB.email, c = B.applications.card, RL = ctx.roles.light, W = ctx.weights;
  const pad = 32, lbl = `font:${W.regular} 15px/20px var(--body);color:${RL.quiet}`, val = `font:${W.regular} 15px/20px var(--body);color:${RL.text}`;
  const row = (y, l, v) => `<div style="position:absolute;left:${pad}px;top:${y}px;width:64px;${lbl}">${l}</div><div style="position:absolute;left:${pad + 64}px;top:${y}px;width:${w - 2 * pad - 64 - 96}px;${val};white-space:normal">${v}</div>`;
  const head = `<div class="disp" style="position:absolute;left:${pad}px;top:${pad}px;width:${w - 2 * pad}px;font-size:24px;line-height:30px;color:${RL.text};white-space:normal">${A(g.subject)}</div>`
    + row(84, 'From', `${A(e.person)}, ${A(c.contact)}`) + row(108, 'To', A(g.to))
    + `<div style="position:absolute;right:${pad}px;top:84px;font:${W.regular} 15px/20px var(--dm);color:${RL.quiet}" class="num">${A(g.time)}</div>`
    + `<div style="position:absolute;left:${pad}px;top:148px;width:${w - 2 * pad}px;height:1px;background:${RL.divider}"></div>`;
  const body = (Array.isArray(g.body) ? g.body : [g.body].filter(Boolean)).map((t) => `<p style="margin:0 0 16px;font:${W.regular} 16px/25px var(--body);color:${RL.text}">${A(t)}</p>`).join('');
  const sig = `<div style="margin-top:32px">${logoHtml(ctx, T, 'horizontal', { width: 160, colourway: cwOn(ctx, RL.surface), label: 'Your logo here', fs: slotFs, color: RL.quiet })}</div>`
    + `<div class="disp" style="margin-top:16px;font-size:18px;line-height:24px;letter-spacing:0;color:${RL.text}">${A(e.person)}</div>`
    + `<div style="${lbl}">${A(e.role)}</div>`
    + `<div style="margin-top:12px;${val}">${A(c.contact)}</div><div style="${val}">${A(B.applications.site.url)}</div>`;
  const inner = `<div style="position:relative;width:${w}px;height:${h}px;background:${RL.surface};${border ? `box-shadow:inset 0 0 0 1px ${T.hair};` : ''}">${head}<div style="position:absolute;left:${pad}px;top:172px;width:${Math.min(w - 2 * pad, 560)}px;white-space:normal">${body}${sig}</div></div>`;
  return k === 1 ? inner : `<div style="zoom:${k}">${inner}</div>`;
}
function emailSignature(ctx) {
  const T = tokens(ctx), B = ctx.brand, RL = ctx.roles.light;
  const sc = scene(ctx, 'late-laptop-desk'), aw = 1280, ah = Math.round(aw / sc.aspect);
  // the laptop's screen: a quiet bar for the client, the message at 1.5 times, so its shape reads at the photograph's scale
  const screen = `<div style="position:relative;width:${aw}px;height:${ah}px;overflow:hidden;background:${RL.surface}"><div style="height:48px;background:${RL.raised}"></div><div style="position:absolute;left:${Math.round((aw - 624 * 1.5) / 2)}px;top:48px">${mailPanel(ctx, T, { w: 624, h: 500, k: 1.5, slotFs: 24 })}</div></div>`;
  const url = ctx.mockup('late-laptop-desk', { 'screen-laptop': { html: ctx.artPage(screen, { w: aw, h: ah }), w: aw, h: ah } });
  // the photo: the screen, the hand on the trackpad and the lamp, scene x 680 to 1363
  const P = { x: 712, y: 312, w: 304, h: 456, s: 456 / sc.sh, sx: 680, sy: 0, ...sc, url, alt: `${B.name} email open on a laptop on a desk at night` };
  const MW = 624, MH = 672;
  const panel = `<div class="a" style="left:64px;top:96px">${mailPanel(ctx, T, { w: MW, h: MH, border: T.light })}</div>`;
  const keys = key(ctx, 64, 296, 'Logo', `${A(ctx.logo.labels.horizontal)} version, <span class="num">160</span> px wide.`)
    + key(ctx, 376, 296, 'Type', `${A(B.fonts.display.family)} for the name, ${A(B.fonts.body.family)} for the rest. Live text, so it reads with images off.`)
    + key(ctx, 712, 304, 'On a laptop', 'The same message, read at a desk after dark.');
  return shell(ctx, 'email-signature', T, { shape: column(64, 96, MW, RL.surface) + reflect(P), fields: false, band: { photo: true }, html: panel + photoBox(P) + keys });
}

// ---- digital: the web app built from the UI kit, flat on the band; the same screen on a laptop in a hall at dusk ----
function appScreen(ctx, T, { w = 1280, h = 800, logo = true }) {
  const B = ctx.brand, S = B.ui.screen.content, ui = ctx.ui, mode = T.light ? 'light' : 'dark', R = T.R;
  const act = ctx.ratio(R.action, R.surface) >= 3 ? 'var(--action)' : 'var(--text)';
  const nav = (S.example && S.example.links) || [];
  const sym = logo ? `<span style="display:block;width:40px">${logoHtml(ctx, T, 'symbol', { width: 40, colourway: cwOn(ctx, R.surface), label: '', color: R.quiet })}</span>` : '';
  const bar = `<nav class="ui-topbar" aria-label="Main" style="height:72px;padding:0 48px;gap:24px;display:flex;align-items:center;border-bottom:1px solid var(--divider)">${sym}<span class="ui-display" style="font-size:22px;line-height:28px;margin-right:16px">${A(B.ui.screen.title)}</span><div class="ui-topbar__links">${ui.links(nav, 0)}</div></nav>`;
  const pct = Math.round(S.progress * 100), st = S.deliveries[0].status;
  const left = `<div style="position:absolute;left:48px;top:120px;width:560px">${ui.statusChip(st, { label: S.status })}`
    + `<div class="ui-display" style="margin-top:24px;font-size:128px;line-height:128px;letter-spacing:-0.02em">${A(S.time)}</div>`
    + `<div class="ui-display" style="margin-top:16px;font-size:44px;line-height:52px;color:${act}">${A(S.eta)}</div>`
    + `<div class="ui-progress" style="margin-top:48px"><span class="ui-progress__bar"><i style="width:${pct}%"></i></span><span class="ui-progress__dot" style="left:${pct}%"></span></div>`
    + `<div style="display:flex;justify-content:space-between;margin-top:16px;font-size:24px;line-height:32px;color:var(--quiet)"><span>${A(S.from)}</span><span>${A(S.to)}</span></div>`
    + `<p style="margin-top:40px;font-size:26px;line-height:38px;color:var(--text-soft);white-space:normal">${A(S.pickup)}</p></div>`;
  // the room in focus and the rest of tonight, at 1.4 times so the rows read on the page; 672 + 560 = 1232, 48 px clear of the edge
  const right = `<div style="position:absolute;left:672px;top:112px;width:560px"><div style="width:400px;zoom:1.4">`
    + `<div style="display:flex;align-items:center;gap:12px;padding:12px 0 16px"><span class="ui-avatar" aria-hidden="true">${A(S.initials)}</span><div style="flex:1"><p style="font-size:16px;line-height:22px;color:var(--text)">${A(S.rider)}</p><p style="font-size:14px;line-height:20px;color:var(--quiet)">${A(S.riderNote)}</p></div>${ui.btn(S.call, { variant: 'secondary', size: 'sm' })}</div>`
    + `${ui.deliveryRows(4)}</div></div>`;
  return `<div class="g5-kit"><div class="ui" data-theme="${mode}" style="position:relative;width:${w}px;height:${h}px;overflow:hidden;background:var(--surface);color:var(--text);font-family:var(--ff-body)">${bar}${left}${right}</div></div>`;
}
function digital(ctx) {
  const T = tokens(ctx), B = ctx.brand, R = T.R;
  // the courier brand is shown on a phone at a street crossing (its own scene, as the book and the guide site do); the other brand on the laptop in the hall
  const street = phoneScene(ctx) === 'kerb-crossing-phone';
  const aw = 1280, ah = Math.round(aw / scene(ctx, 'room-hall-laptop').aspect);
  const sc = street ? scene(ctx, 'kerb-crossing-phone') : scene(ctx, 'room-hall-laptop');
  const url = street ? ctx.mockup('kerb-crossing-phone', { 'screen-phone': phoneArt(ctx, !T.light) })
    : ctx.mockup('room-hall-laptop', { 'screen-laptop': { html: ctx.artPage(appScreen(ctx, T, { w: aw, h: ah }), { w: aw, h: ah }), w: aw, h: ah } });
  // the photo: tall and narrow. Hall: the lamp on the wall above the laptop (scene x 330 to 793). Crossing: the phone in hand, centred (scene x 193 to 888)
  const s0 = 672 / sc.sh;
  const P = { x: 64, y: 96, w: 304, h: 672, s: s0, sx: street ? 193 : 330, sy: 0, ...sc, url, alt: street ? `${B.name} app on a phone, held at a street crossing` : `${B.name} web app on a laptop on a hall table at dusk` };
  // the flat screen: 1280 x 800 at 0.4875, 624 x 390, its foot on the band
  const SX = 392, SW = 624, k = SW / aw, SH = Math.round(ah * k), SY = 768 - SH;
  const flat = `<div class="a" style="left:${SX}px;top:${SY}px;width:${SW}px;height:${SH}px;overflow:hidden;${T.light ? `box-shadow:0 0 0 1px ${T.hair};` : ''}"><div style="zoom:${k}">${appScreen(ctx, T, { w: aw, h: ah })}</div></div>`;
  const lead = put(ctx, { x: SX, y: 96, w: 468, cls: 'body', html: `The ${A(B.ui.screen.title)} screen of the web app, built only from the UI kit: the top bar, a status, the progress line, a button and the list rows.` });
  const keys = (street ? key(ctx, 64, 304, 'On a phone', 'The same screen on a phone, at the crossing.') : key(ctx, 64, 304, 'On a laptop', 'The same screen on a laptop, on a hall table at dusk.')) + key(ctx, SX, SW, 'Web app', `${T.light ? 'Light' : 'Dark'} mode.`);
  return shell(ctx, 'digital', T, { shape: reflect(P) + column(SX, SY, SW, R.surface), fields: false, band: { photo: true }, html: photoBox(P) + lead + flat + keys });
}

// ---- css: the art box and the photo frame; the UI kit's tokens and components nested under .g5-kit, so they reach only this lane's screens ----
export function css(ctx) {
  const g = tokenGroups(ctx), decl = (o) => Object.entries(o).map(([k, v]) => `--${k}:${v};`).join('');
  return `.pg .g5-art{position:relative;overflow:hidden;isolation:isolate}
.pg .g5-art .glass{z-index:0}
.pg .g5-ph{overflow:hidden}
.pg .g5-ph img,.pg .g5-ph svg.pl{display:block;max-width:none}
.pg .g5-kit{
.ui{${decl(colourMap(ctx, 'light'))}${decl(g.space)}${decl(g.radius)}${decl(g.width)}${decl(g.font)}${decl(g.text)}${decl(g.shadow)}}
.ui[data-theme="dark"]{${decl(colourMap(ctx, 'dark'))}}
${componentsCss(ctx).replace(/^\/\*[^\n]*\n/, '').replace(/@keyframes[^{]*\{[^{}]*\{[^{}]*\}\s*\}/g, '')}
.ui .ui-display{font-stretch:${ctx.brand.fonts.display.stretch || 100}%}
.ui :where(h1,h2,h3,p,ul,ol,dl,dd){margin:0;padding:0}
}`;
}

export const guidelines = { social, signage, 'email-signature': emailSignature, digital };
