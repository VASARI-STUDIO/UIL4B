// Lane u1 for theme 21 (UI kit foundations): cover, contents, colour-light, colour-dark, type-scale, spacing, radii-borders, elevation.
// The kit speaks the guidelines' slide language (guidelines-r1.js): full-height fields in the brand's role colours meeting at straight edges, one big
// thing a slide, chrome at 12 to 15 px, and the one running head at y 28 with a three-digit folio. Every component shown is the real ctx.ui markup inside a
// .ui region, so the page documents what the code package ships; nothing here restyles a component. Colours come by role, never by id, and every value
// printed is read from ctx. Styles: u1- classes in css() below, plus the r- classes of css-r1.js.
import { A } from './helpers.js';
import { outline, capHeight } from '../../engine/logo.js';
import { loadFont } from '../../engine/nodeFont.js';
import { colourMap, tokenGroups } from '../../engine/tokens.js';

// ---- measuring (copied from guidelines-r1.js, which keeps them private) ----------------------------------------------------------
const face = (ctx, role, weight) => ctx.faces.find((f) => f.role === role && f.style !== 'italic' && f.weight === weight) || ctx.faces.find((f) => f.role === role && f.style !== 'italic');
const dispW = (ctx) => ctx.brand.fonts.display.weights[ctx.brand.fonts.display.weights.length - 1];
const textW = (ctx, role, weight, text, size, track = 0) => { const o = outline(loadFont(face(ctx, role, weight).stem), text, size, track); return (o.x2 - Math.min(0, o.x1)) * 1.02; };
const topForBaseline = (ctx, role, weight, size, lh, y) => { const f = loadFont(face(ctx, role, weight).stem), u = f.unitsPerEm, asc = f.ascender / u, desc = -f.descender / u; return +(y - ((lh * size - (asc + desc) * size) / 2 + asc * size)).toFixed(1); };
function greedy(ctx, role, weight, text, size, maxW, track = 0) {
  const out = []; let cur = '';
  for (const w of String(text).split(' ')) { const t = cur ? `${cur} ${w}` : w; if (cur && textW(ctx, role, weight, t, size, track) > maxW) { out.push(cur); cur = w; } else cur = t; }
  if (cur) out.push(cur);
  return out;
}
// the largest display size from hi down to lo at which every text sets on one line of maxW
const fitOne = (ctx, texts, hi, lo, maxW, track = -0.01) => { for (let s = hi; s > lo; s--) if (texts.every((t) => textW(ctx, 'display', dispW(ctx), t, s, track) <= maxW)) return s; return lo; };
// the largest display size at which a text sets in maxLines lines of maxW, as explicit lines
function fitLines(ctx, text, hi, lo, maxW, maxLines) {
  for (let s = hi; s > lo; s--) { const l = greedy(ctx, 'display', dispW(ctx), text, s, maxW, -0.01); if (l.length <= maxLines) return { size: s, lines: l }; }
  return { size: lo, lines: greedy(ctx, 'display', dispW(ctx), text, lo, maxW, -0.01) };
}
const lineHtml = (lines) => lines.map((l) => `<span class="r-ln">${A(l)}</span>`).join('');
const px = (n) => +(+n).toFixed(2);
const words = (n) => ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'][n] || String(n);

// ---- colour roles and the chrome rule (as in guidelines-r1.js) ----------------------------------------------------------------
const L = (ctx) => ctx.roles.light;
const byRole = (ctx, role) => ctx.colours.find((c) => c.role === role);
const inkOn = (ctx, hex) => (ctx.ratio(L(ctx).text, hex) >= ctx.ratio(L(ctx).surface, hex) ? L(ctx).text : L(ctx).surface);
// the brand's quiet tone that reaches 4.5:1 on every ground given; else the best of the text colour, the page ground and the dark soft text
const chromeOn = (ctx, ...hexes) => {
  const q = [L(ctx).quiet, L(ctx).quietOnSunken, ctx.roles.dark.quiet].find((c) => hexes.every((h) => ctx.ratio(c, h) >= 4.5));
  return q || [L(ctx).text, L(ctx).surface, ctx.roles.dark.textSoft].sort((a, b) => Math.min(...hexes.map((h) => ctx.ratio(b, h))) - Math.min(...hexes.map((h) => ctx.ratio(a, h))))[0];
};
const rt = (ctx, a, b) => `${ctx.fmt(ctx.ratio(a, b))}&nbsp;:&nbsp;1`;

const box = (x, y, w, h, st = '', inner = '', cls = '') => `<div class="r-a ${cls}" style="left:${px(x)}px;top:${px(y)}px;${w ? `width:${px(w)}px;` : ''}${h ? `height:${px(h)}px;` : ''}${st}">${inner}</div>`;
const field = (x, y, w, h, hex, st = '') => box(x, y, w, h, `background:${hex};${st}`);
const p = (cls, text, st = '') => `<p class="${cls}"${st ? ` style="${st}"` : ''}>${text}</p>`;
const mono = (t) => `<span class="u1-m">${A(t)}</span>`;

// the 12-column grid of the 1280 slide (margin 56, gutter 16), read from the page size
const grid = (ctx) => { const cw = (ctx.size.w - 112 - 11 * 16) / 12; return { col: (n) => 56 + n * (cw + 16), span: (k) => k * cw + (k - 1) * 16 }; };

// the one running head: section number and title left, document name and a three-digit folio right, each in the chrome colour of the field under it
const docName = (ctx) => `${ctx.brand.name} UI kit`;
const headRightW = (ctx) => textW(ctx, 'body', 400, docName(ctx), 12) + 44;
function head(ctx, id, { left = [L(ctx).surface], right } = {}) {
  const pg = ctx.pages.find((x) => x.id === id);
  const cl = chromeOn(ctx, ...left), cr = chromeOn(ctx, ...(right || left));
  const folio = String(ctx.pageNo(id)).padStart(3, '0');
  return `<div class="r-hd"><span class="r-hl num" style="color:${cl}">${pg.ref ? `<b>${pg.ref}</b>` : ''}${A(pg.title)}</span><span class="r-hr num" style="color:${cr}"><i>${A(docName(ctx))}</i><b>${folio}</b></span></div>`;
}
const page = (id, inner, bg, cls = '') => `<section class="pg pg--r u1 ${cls}" data-page="${id}" style="background:${bg}">${inner}</section>`;
// a .ui region that reads the kit's tokens but leaves the field's colour showing through
const uiR = (inner, dark = false, st = '') => `<div class="ui u1-ui"${dark ? ' data-theme="dark"' : ''}${st ? ` style="${st}"` : ''}>${inner}</div>`;
import { screenContent as sc } from './once.js';

// the logo, or in the slot edition a dashed frame of the same size (as guidelines-r1.js draws it)
function logoAt(ctx, id, width, ink) {
  if (ctx.edition !== 'slot') return ctx.logo.html(id, { width });
  const g = ctx.logo.geos[id], h = (width * g.h) / g.w;
  return `<div class="logo-slot" role="img" aria-label="Logo slot" style="width:${px(width)}px;height:${px(Math.max(h, 24))}px;box-sizing:border-box;border:1.5px dashed ${ink};color:${ink};display:flex;align-items:center;justify-content:center;font:500 12px/1.2 var(--body);white-space:nowrap">Your logo goes here</div>`;
}

// ---- the colour pages: the screen's grounds left to right as fields, each holding the roles that sit on it --------------------
function colourPage(ctx, id, mode) {
  const M = colourMap(ctx, mode), dark = mode === 'dark', W = ctx.size.w, H = ctx.size.h;
  // the scrim field is wide enough to hold the head's right part, so the document name never straddles two fields
  const scrimX = Math.min(1088, ctx.size.w - 56 - headRightW(ctx) - 24);
  const xs = [0, 400, 576, 752, scrimX, W];
  const F = [['Surface', 'surface'], ['Raised', 'raised'], ['Sunken', 'sunken'], ['Action', 'action'], ['Scrim', 'scrim']];
  const bg = (i) => M[F[i][1]], ink = (i) => (i === 3 ? M['action-label'] : i === 4 ? (ctx.ratio(M.surface, M.scrim) >= ctx.ratio(M.text, M.scrim) ? M.surface : M.text) : M.text);
  const ch = (i) => (i === 3 ? M['action-label'] : i === 4 ? ink(4) : [M.quiet, M['quiet-sunken'], M['text-soft']].find((c) => ctx.ratio(c, bg(i)) >= 4.5) || M.text);
  const nameSize = fitOne(ctx, F.slice(0, 3).map((f) => f[0]).concat('Scrim'), 26, 18, 176 - 48);
  const dw = dispW(ctx);
  let out = '';
  F.forEach(([name, tok], i) => {
    const x = xs[i], w = xs[i + 1] - x, tx = x + (i === 0 ? 56 : 24), tw = w - (i === 0 ? 80 : 48);
    // light grounds next to each other get a hairline, so a near-white raised field still shows its edge
    out += field(x, 0, w, H, bg(i), i && i < 3 ? `box-shadow:inset 1px 0 0 ${M.divider}` : '');
    const ns = i === 3 ? Math.min(40, fitOne(ctx, [name], 40, 26, tw)) : nameSize;
    out += box(tx, topForBaseline(ctx, 'display', dw, ns, 1.05, 136), tw, 0, `color:${ink(i)};font-size:${ns}px;line-height:1.05`, `<h2 class="disp r-nw">${A(name)}</h2>`);
    out += box(tx, 152, tw, 16, `color:${ink(i)}`, p('r-t12 r-nw', `${mono('--' + tok)}&nbsp; ${mono(M[tok])}`));
  });
  // a role row: the role's own words in its own colour on the field, its ratio at the right, the token and value under it
  const row = (x, y, w, label, fg, on, tok, note) => box(x, y, w, 40, '', `<p class="r-t15 r-w600 u1-rr" style="color:${fg}"><span>${A(label)}</span><span class="num">${rt(ctx, fg, on)}</span></p>` +
    p('r-t12 r-nw', `${mono('--' + tok)}&nbsp; ${mono(fg)}${note ? `&nbsp; ${A(note)}` : ''}`, `color:${[M.quiet, M.text].find((c) => ctx.ratio(c, on) >= 4.5)}`));
  // a drawn role (edge, divider, focus): a mark in the role's colour, its words in the text colour
  const mark = (x, y, w, label, tok, st, on) => box(x, y, 32, 24, st) + box(x + 48, y, w - 48, 40, '', `<p class="r-t15 r-w600 u1-rr" style="color:${M.text}"><span>${A(label)}</span><span class="num">${rt(ctx, M[tok], on)}</span></p>` +
    p('r-t12 r-nw', `${mono('--' + tok)}&nbsp; ${mono(M[tok])}`, `color:${M.quiet}`));
  const s0 = M.surface, x0 = 56, w0 = 320;
  let y = 200;
  for (const [l, t] of [['Text', 'text'], ['Soft text', 'text-soft'], ['Quiet text', 'quiet']]) { out += row(x0, y, w0, l, M[t], s0, t); y += 48; }
  y += 16;
  const cw = tokenGroups(ctx).width['w-control'];
  out += mark(x0, y, w0, 'Control edge', 'edge', `box-shadow:inset 0 0 0 ${cw} ${M.edge}`, s0); y += 48;
  out += mark(x0, y, w0, 'Divider', 'divider', `box-shadow:inset 0 -1px 0 ${M.divider}`, s0); y += 48;
  out += mark(x0, y, w0, 'Focus ring', 'focus', `box-shadow:inset 0 0 0 2px ${M.focus}`, s0); y += 64;
  for (const [l, t] of [['Success', 'success'], ['Warning', 'warning'], ['Danger', 'danger'], ['Info', 'info']]) { out += row(x0, y, w0, l, M[t], s0, t); y += 48; }
  // raised and sunken: the text that sits on each
  out += row(xs[1] + 24, 200, 128, 'Text', M.text, M.raised, 'text');
  out += row(xs[2] + 24, 200, 128, 'Quiet', M['quiet-sunken'], M.sunken, 'quiet-sunken');
  out += box(xs[2] + 24, 264, 128, 72, `background:${M['disabled-bg']};padding:12px`, `<p class="r-t15 r-w600" style="color:${M['disabled-text']}">Disabled</p>` + p('r-t12 num', rt(ctx, M['disabled-text'], M['disabled-bg']), `color:${M['disabled-text']}`));
  out += box(xs[2] + 24, 344, 128, 16, `color:${ch(2)}`, p('r-t12 r-nw', mono('--disabled-bg')));
  // action: the fill against the surface, the label on it, then hover and pressed as their own fields at the foot
  const ax = xs[3], aw = xs[4] - ax, al = M['action-label'];
  out += box(ax + 24, 200, aw - 48, 0, `color:${al}`, p('r-t15 r-w600 u1-rr', `<span>Label</span><span class="num">${rt(ctx, al, M.action)}</span>`) + p('r-t12 r-nw', `${mono('--action-label')}&nbsp; ${mono(al)}`) +
    p('r-t12 u1-gap', `The fill is ${rt(ctx, M.action, M.surface)} on the surface.`));
  [['Hover', 'action-hover'], ['Pressed', 'action-pressed']].forEach(([l, t], k) => {
    const fy = H - 192 + k * 96;
    out += field(ax, fy, aw, 96, M[t]) + box(ax + 24, fy + 24, aw - 48, 0, `color:${al}`, p('r-t15 r-w600 u1-rr', `<span>${l}</span><span class="num">${rt(ctx, al, M[t])}</span>`) + p('r-t12 r-nw', `${mono('--' + t)}&nbsp; ${mono(M[t])}`));
  });
  out += box(xs[4] + 24, 200, W - xs[4] - 48, 0, `color:${ink(4)}`, p('r-t12', 'Behind dialogs. Never under text.'));
  const lead = dark ? `Dark keeps ${byRole(ctx, 'action').name}. The label stays the same, so a button reads alike in both modes.` : 'Roles name a job, not a colour. Components read the role, so dark mode changes nothing in the markup.';
  // the page's one rule sits in the open middle of the action field, in the label colour
  out += box(ax + 24, 312, aw - 48, 0, `color:${al}`, p('r-t15', lineHtml(greedy(ctx, 'body', 400, lead, 15, aw - 48))));
  return page(id, out + head(ctx, id, { left: [bg(0)], right: [bg(4)] }), bg(0), dark ? 'u1-dark' : '');
}

export const uikit = {
  // Cover: the product on the action field, the Track screen at its real size rising out of the dark band that carries the logo, as the guidelines' cover does.
  cover(ctx) {
    const B = ctx.brand, W = ctx.size.w, H = ctx.size.h, bandTop = 536, bandH = H - bandTop, S = sc(ctx), ui = ctx.ui;
    const act = byRole(ctx, 'action').hex, band = byRole(ctx, 'text').hex, rev = B.logo.colourways.reversed, ink = rev.name;
    const g = ctx.logo.geos.colour, lw = Math.floor(Math.min(560, ((bandH - 80) * g.w) / g.h)), lh = (lw * g.h) / g.w, top = bandTop + (bandH - lh) / 2;
    const prog = `<div class="ui-progress" role="progressbar" aria-label="Delivery progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(S.progress * 100)}"><div class="ui-progress__bar"><i style="width:${S.progress * 100}%"></i></div><span class="ui-progress__dot" style="left:${S.progress * 100}%"></span></div><div class="ks-route"><span>${A(S.from)}</span><span>${A(S.to)}</span></div>`;
    const rider = `<div class="ks-rider"><span class="ui-avatar">${A(S.initials)}</span><div class="ks-rmain"><p class="ks-rname">${A(S.rider)}</p><p class="ks-rsub">${A(S.riderNote)}</p></div>${ui.btn(S.call, { variant: 'secondary', size: 'sm', iconLeft: 'phone' })}</div>`;
    // the top of the Track screen, as the phone draws it; the band cuts it where the screen carries on below the fold
    const screen = `<div class="ui u1-phone"><div class="kph-top"><span class="ui-num">${A(S.time)}</span><strong class="ui-display">${A(B.logo.showcase.wordmark)}</strong></div><div class="kph-body"><span class="kph-chip">${ui.statusChip(S.deliveries[0].status)}</span><h2 class="ui-display kph-time">${A(S.eta)}</h2><p class="ks-pickup">${A(S.pickup)}</p><div class="ks-prog">${prog}</div>${rider}</div></div>`;
    const right = box(944, top, 280, lh, '', `<p class="r-t15 r-w600" style="color:${ink}">UI kit</p><p class="r-t12" style="color:${chromeOn(ctx, band)}">${A(ctx.versionLine)}</p>`, 'r-col');
    const prod = box(56, 56, 560, 0, `color:${inkOn(ctx, act)}`, p('r-lead', lineHtml(greedy(ctx, 'body', 500, B.product, 22, 560))));
    const inner = field(0, 0, W, bandTop, act) + prod + `<div class="r-a" style="left:${W - 56 - 390}px;bottom:${bandH}px;width:390px">${screen}</div>` +
      field(0, bandTop, W, bandH, band) + box(56, top, lw, lh, '', logoAt(ctx, 'reversed', lw, ink)) + right;
    return page('cover', inner, band);
  },

  // Contents: the four sections stand along the foot of an action band, each named in the display face; their pages run down the white under them.
  contents(ctx) {
    const W = ctx.size.w, act = byRole(ctx, 'action').hex, white = L(ctx).surface, G = grid(ctx), S = ctx.sections, n = S.length, onA = inkOn(ctx, act);
    const colW = (W - 112 - (n - 1) * 16) / n, bandH = 296, dw = dispW(ctx);
    const size = fitOne(ctx, S.map((s) => s.title), 40, 20, colW - 8);
    const total = ctx.pages.length, last = S[n - 1].pages.at(-1).title.toLowerCase();
    let out = field(0, 0, W, bandH, act) + box(56, 104, G.span(5), 0, `color:${onA}`, p('r-t15', lineHtml(greedy(ctx, 'body', 400, `${words(n)} sections over ${total} pages. Each section's pages run under its name, from the tokens to ${last}.`, 15, G.span(5)))));
    S.forEach((s, i) => {
      const x = 56 + i * (colW + 16);
      out += box(x, topForBaseline(ctx, 'body', 400, 15, 1.6, bandH - 40 - size - 12), colW, 0, `color:${onA}`, p('r-t15 num', String(s.n)));
      out += box(x, topForBaseline(ctx, 'display', dw, size, 1, bandH - 40), colW, 0, `color:${onA};font-size:${size}px;line-height:1`, `<h2 class="disp r-nw">${A(s.title)}</h2>`);
      out += box(x, bandH + 24, colW, 0, '', `<ul class="u1-pl">${s.pages.map((pg) => `<li><span style="color:${L(ctx).text}">${A(pg.title)}</span><span class="num" style="color:${L(ctx).quiet}">${String(pg.no).padStart(3, '0')}</span></li>`).join('')}</ul>`);
    });
    return page('contents', out + head(ctx, 'contents', { left: [act] }), white);
  },

  'colour-light': (ctx) => colourPage(ctx, 'colour-light', 'light'),
  'colour-dark': (ctx) => colourPage(ctx, 'colour-dark', 'dark'),

  // Type scale: the face boundary is the field boundary. Display styles at their true size on a dark field, body styles on the white, each with its values.
  'type-scale'(ctx) {
    const B = ctx.brand, S = sc(ctx), F = S.form, W = ctx.size.w, H = ctx.size.h, dark = byRole(ctx, 'text').hex, white = L(ctx).surface, fw = 512;
    const sample = { caption: F.notesHelp, label: F.pickup, body: S.pickup, control: F.book, 'title-s': S.dialog.title, title: S.rider, headline: S.eta };
    const d = B.fonts.display, b = B.fonts.body, stretch = d.stretch || 100, dw = dispW(ctx);
    const onD = inkOn(ctx, dark), chD = chromeOn(ctx, dark), chW = chromeOn(ctx, white);
    const rows = (list, x, w, ink, chrome) => { let y = 104, h = ''; for (const t of list) {
      const st = t.face === 'display' ? `font-family:var(--display);font-stretch:${stretch}%;letter-spacing:-0.01em;` : 'font-family:var(--body);';
      const lines = greedy(ctx, t.face, t.weight, sample[t.token] || t.use, t.size, w, t.face === 'display' ? -0.01 : 0);
      h += box(x, y, w, lines.length * t.line, `color:${ink};${st}font-size:${t.size}px;line-height:${t.line}px;font-weight:${t.weight}`, `<p>${lineHtml(lines)}</p>`);
      y += lines.length * t.line + 8;
      h += box(x, y, w, 16, `color:${chrome}`, p('r-t12 r-nw', `${mono(t.token)}&nbsp; ${mono(`${t.size} / ${t.line} / ${t.weight}`)}&nbsp; ${A(t.use)}`));
      y += 16 + 40;
    } return h; };
    const disp = [...ctx.uiType].filter((t) => t.face === 'display').reverse(), body = [...ctx.uiType].filter((t) => t.face !== 'display').reverse();
    const nameSize = fitOne(ctx, [d.family], 54, 32, fw - 112);
    const minSize = Math.min(...ctx.uiType.map((t) => t.size));
    let out = field(0, 0, fw, H, dark) + rows(disp, 56, fw - 112, onD, chD) + rows(body, fw + 56, W - fw - 112, L(ctx).text, chW);
    out += box(56, topForBaseline(ctx, 'display', dw, nameSize, 1, 616), fw - 112, 0, `color:${onD};font-size:${nameSize}px;line-height:1`, `<h2 class="disp r-nw">${A(d.family)}</h2>`);
    out += box(56, 640, fw - 112, 16, `color:${chD}`, p('r-t12 r-nw', `Display. Weight ${dw}${d.stretch ? `, width ${d.stretch}` : ''}.`));
    out += box(fw + 56, 588, 400, 28, `color:${L(ctx).text}`, p('r-t22 r-nw', A(b.family)));
    out += box(fw + 56, 640, 400, 16, `color:${chW}`, p('r-t12 r-nw', `Body. Weights ${b.weights.join(', ')}.`));
    out += box(W - 56 - 300, 608, 300, 48, `color:${chW}`, p('r-t12', lineHtml(greedy(ctx, 'body', 400, `Sizes are px, then line height, then weight. Nothing on screen is under ${minSize} px. Numbers that change use tabular figures, so a time never shifts.`, 12, 300))));
    return page('type-scale', out + head(ctx, 'type-scale', { left: [dark], right: [white] }), white, ctx.placeholders ? 'ph-tight' : '');
  },

  // Spacing: the rule is the slide's one line, on the action field; the scale stands beside it on the white, each step a square at its true size.
  spacing(ctx) {
    const W = ctx.size.w, H = ctx.size.h, act = byRole(ctx, 'action').hex, white = L(ctx).surface, onA = inkOn(ctx, act), base = ctx.brand.ui.spacingBase, fx = 640;
    const uses = ['Inside a tight pair', 'Icon to label', 'Gaps in a row, field padding', 'Card padding', 'Dialog padding, button sides', 'Empty state padding', 'Between groups', 'Between sections'];
    let y = 104, out = field(fx, 0, W - fx, H, act);
    for (const [i, s] of ctx.space.entries()) {
      const rh = Math.max(24, s.px);
      out += box(56 + 64 - s.px, y, s.px, s.px, `background:${L(ctx).text}`);
      out += box(152, y + (rh - 24) / 2, 120, 24, `color:${L(ctx).text}`, p('r-t15 r-nw', mono(`--${s.token.replace('space-', 'sp-')}`)));
      out += box(272, y + (rh - 24) / 2, 72, 24, `color:${L(ctx).text}`, p('r-t15 r-nw num', `${s.px} px`));
      out += box(360, y + (rh - 24) / 2, 224, 24, `color:${L(ctx).quiet}`, p('r-t15 r-nw', A(uses[i] || '')));
      y += rh + 16;
    }
    const line = fitLines(ctx, `Everything sits on a ${base} px step.`, 54, 36, W - fx - 112, 3);
    out += box(fx + 56, topForBaseline(ctx, 'display', dispW(ctx), line.size, 1.02, 160), W - fx - 112, 0, `color:${onA};font-size:${line.size}px;line-height:1.02`, `<h2 class="disp">${lineHtml(line.lines)}</h2>`);
    // 44 and 36 are the control heights components.css ships (ui-btn, ui-input; ui-btn--sm)
    const note = `A gap inside a group is smaller than the gap between groups, so grouping reads at a glance. Controls are 44 px tall, ${words(44 / base).toLowerCase()} steps. Small buttons are 36 px, ${words(36 / base).toLowerCase()}.`;
    out += box(fx + 56, H - 56 - 96, 400, 96, `color:${onA}`, p('r-t15', lineHtml(greedy(ctx, 'body', 400, note, 15, 400))));
    return page('spacing', out + head(ctx, 'spacing', { left: [white], right: [act] }), white);
  },

  // Radii and borders: one corner of the real button and one of the real focused input, drawn at twelve times, then each at its true size with its tokens.
  'radii-borders'(ctx) {
    const W = ctx.size.w, H = ctx.size.h, white = L(ctx).surface, panel = L(ctx).sunken, S = sc(ctx), F = S.form, ui = ctx.ui, k = 12, half = W / 2, cw = half - 112;
    const [rc, rk, rr] = ctx.radii, [bh, bc, bf] = ctx.borders, R = ctx.radius;
    // the crop: the component at k times with its top-left corner a third of the way in, so the corner reads against the ground
    const crop = (x, inner) => box(x, 96, cw, 312, 'overflow:hidden', `<div class="ui u1-ui u1-zoom" style="zoom:${k};left:${px(cw * 0.3 / k)}px;top:${px(312 * 0.3 / k)}px">${inner}</div>`);
    const tbl = (x, y, rows, on) => rows.map(([t, v, u], i) => box(x, y + i * 24, cw, 24, `color:${L(ctx).text}`, `<p class="r-t15 r-nw u1-tr">${mono(t)}<span class="num">${v}</span><span style="color:${chromeOn(ctx, on)}">${A(u)}</span></p>`)).join('');
    let out = field(half, 0, half, H, panel);
    out += crop(56, `<button class="ui-btn" type="button" aria-label="Button corner" style="width:60px"></button>`);
    out += crop(half + 56, `<div style="padding:4px"><input class="ui-input is-focus" type="text" aria-label="Input corner" style="width:60px"></div>`);
    out += box(56, 424, cw, 16, `color:${chromeOn(ctx, white)}`, p('r-t12', `The button's corner at ${k} times: ${R.button} px.`));
    out += box(half + 56, 424, cw, 16, `color:${chromeOn(ctx, panel)}`, p('r-t12', `The focused input at ${k} times: the edge, a gap of the ground, then the ring.`));
    out += box(56, 472, cw, 44, '', uiR(`${ui.btn(F.book)}<span class="ui-avatar">${A(S.initials)}</span>`, false, 'display:flex;gap:24px;align-items:center'));
    out += box(half + 56, 456, 280, 0, '', uiR(ui.field({ id: 'u1rb', label: F.ready, value: F.readyValue, state: 'focus' })));
    out += tbl(56, 560, [[`--${rc.token.replace('radius-', 'r-')}`, `${rc.px} px`, rc.use], [`--r-card`, `${rk.px} px`, rk.use], ['--r-round', 'round', rr.use]], white);
    out += tbl(half + 56, 560, [[`--w-hairline`, `${bh.px} px`, bh.use], ['--w-control', `${bc.px} px`, bc.use], ['--w-focus', `${bf.px} px`, bf.use]], panel);
    return page('radii-borders', out + head(ctx, 'radii-borders', { left: [white], right: [panel] }), white);
  },

  // Elevation: depth without shadow. The three grounds step down the white as bands; what floats is the real dialog, at its true size, on the scrim.
  elevation(ctx) {
    const W = ctx.size.w, H = ctx.size.h, R = L(ctx), S = sc(ctx), ui = ctx.ui, fx = 512, scrim = R.scrim;
    const shadow = String(tokenGroups(ctx).shadow['shadow-float']);
    let out = box(56, 104, fx - 112, 0, `color:${R.text}`, p('r-lead', lineHtml(greedy(ctx, 'body', 500, ctx.brand.ui.elevationNote, 22, fx - 112))));
    out += box(56, 312, fx - 112, 16, `color:${R.quiet}`, p('r-t12 r-nw', `${mono('--shadow-float')}&nbsp; ${mono(shadow)}`));
    const steps = [['Surface', 'surface', 'The page and every card on it'], ['Raised', 'raised', 'Raised cards, sidebars, table headers'], ['Sunken', 'sunken', 'Avatars, skeletons, the progress track']];
    steps.forEach(([n, t, u], i) => {
      const y = H - 3 * 96 + i * 96, bg = R[t], ch = chromeOn(ctx, bg);
      out += field(0, y, fx, 96, bg, i === 0 ? `box-shadow:inset 0 1px 0 ${R.divider}` : '') + box(56, y + 24, 160, 48, `color:${R.text}`, p('r-t15 r-w600', A(n)) + p('r-t12 r-nw', `${mono('--' + t)}&nbsp; ${mono(bg)}`, `color:${ch}`)) +
        box(232, y + 28, fx - 232 - 56, 24, `color:${ch}`, p('r-t12', A(u)));
    });
    const dlg = ui.dialog({ title: S.dialog.title, body: S.dialog.body, confirm: S.dialog.confirm, keep: S.dialog.keep, danger: true }).replace(/dlg-t/g, 'u1-dlg');
    const sw = W - fx, chS = chromeOn(ctx, scrim);
    out += field(fx, 0, sw, H, scrim) + box(fx + (sw - 440) / 2, 0, 440, H, 'display:flex;flex-direction:column;justify-content:center', uiR(dlg, false, 'background:transparent') +
      `<p class="r-t12" style="color:${chS};margin-top:16px">Dialog. A ${ctx.borders[1].px} px edge in the text colour, on the scrim.</p>`);
    return page('elevation', out + head(ctx, 'elevation', { left: [R.surface], right: [scrim] }), R.surface);
  },
};

export function css(ctx) {
  return `
.pg.u1 .u1-ui{background:transparent}
.pg.u1 .u1-m{font-family:'${ctx.brand.fonts.mono.family}',monospace;font-variant-numeric:tabular-nums}
.pg.u1 .u1-rr{display:flex;justify-content:space-between;gap:12px;white-space:nowrap}
.pg.u1 .u1-gap{margin-top:16px}
.pg.u1 .u1-pl{margin:0;padding:0;list-style:none;border-top:1px solid var(--hair)}
.pg.u1 .u1-pl li{display:flex;justify-content:space-between;gap:12px;font:400 15px/24px var(--body);border-bottom:1px solid var(--hair);white-space:nowrap}
.pg.u1 .u1-phone{width:390px;background:var(--surface);padding-bottom:20px}
.pg.u1 .u1-zoom{position:absolute}
.pg.u1 .u1-tr{display:grid;grid-template-columns:120px 64px minmax(0,1fr);gap:8px}
`;
}
