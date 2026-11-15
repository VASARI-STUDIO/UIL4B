// Theme 31, Contact sheet, lane u2: the UI kit's component pages. The chrome (strip, roll, loop, caption column, foot) is lane u1's, imported read-only.
// On the bench every component is shot like a setup: its states are bracketed exposures on a cut of film (a frame per state, the state in edge print under
// the gate), and the one the page is about is printed large on paper, the enlargement, with its measurements drawn on it. Light gates and prints are the
// light theme; dark specimens sit straight on the darkroom ground, as on lane u1's pages. Every class this lane adds starts u2-.
import { A, put, wrap, adv, px, cwOn, tokens } from './helpers.js';
import { photoFrame } from './arts.js';
import { colourMap } from '../../engine/tokens.js';
import { kitPage, kitCaption, kitLabel, uiDark, uiLight } from './lane-u1-kit.js';

const NB = String.fromCharCode(160);   // a ratio never breaks across lines
const ratioText = (ctx, a, b) => `${ctx.fmt(ctx.ratio(a, b))}${NB}:${NB}1`;
const pxOf = (list, token) => (list.find((t) => t.token === token) || {}).px;
const typeOf = (ctx, token) => ctx.uiType.find((t) => t.token === token) || {};
const sc = (ctx) => ctx.brand.ui.screen.content;
const ex = (ctx) => sc(ctx).example || {};

// ---- small type: a token name, a literal value (mono), both in a print's own ink ----
const tok = (ctx, x, y, t, w, c = 'var(--ink)') => put(ctx, { x, y, w, h: 16, role: 'chrome', size: 12, line: 16, weight: 500, style: `font:500 12px/16px var(--chrome);color:${c}`, html: A(t) });
const lit = (ctx, x, y, t, w, c = 'var(--quiet)', st = '') => put(ctx, { x, y, w, h: 18, role: 'mono', size: 12, line: 18, style: `font:400 12px/18px var(--mono);color:${c};${st}`, html: A(t) });

// ---- a cut of film on the stage at scale s of the roll (s 1: the roll's 210 x 140 gates on its 234 pitch, so the gates line up with the strip above).
// `top` is the film's top edge and gx the first gate's left edge. Holes run in both rebates at the roll's pitch; the cut's title is edge print in the
// top band over the first gate, and each frame's state is edge print centred under its gate. frames: [{ label, html, dark, pad, gw }]; a frame's own gw makes a panorama.
function cut(ctx, gx, top, frames, { s = 1, title = '', gh: gh0 } = {}) {
  const rb = 40 * s, gh = gh0 || 140 * s, gws = frames.map((f) => f.gw || 210 * s), gap = 24 * s;
  const W = gws.reduce((a, b) => a + b, 0) + gap * (frames.length - 1) + 24 * s, H = gh + 2 * rb, hw = 12 * s, hh = 17 * s, pitch = 29.25 * s;
  let holes = '';
  for (let c = 14.625 * s; c + hw / 2 <= W - 2 * s; c += pitch) holes += `<rect x="${(c - hw / 2).toFixed(2)}" y="${(6 * s).toFixed(2)}" width="${hw.toFixed(2)}" height="${hh.toFixed(2)}" rx="${(2.5 * s).toFixed(2)}"/><rect x="${(c - hw / 2).toFixed(2)}" y="${(H - 6 * s - hh).toFixed(2)}" width="${hw.toFixed(2)}" height="${hh.toFixed(2)}" rx="${(2.5 * s).toFixed(2)}"/>`;
  const band = 17 * s, ly = rb + gh + (band - 12) / 2;
  let x = 12 * s, gates = '';
  frames.forEach((f, i) => {
    const w = gws[i], st = `border-radius:2px;overflow:hidden;display:flex;align-items:center;justify-content:center;padding:${f.pad ?? 16}px`;
    gates += (f.dark ? uiDark : uiLight)(+x.toFixed(2), +rb.toFixed(2), +w.toFixed(2), +gh.toFixed(2), f.html, st)
      + put(ctx, { x, y: ly, w, h: 12, cls: 'edge', style: 'line-height:12px', align: 'center', html: A(f.label) });
    x += w + gap;
  });
  const head = title ? put(ctx, { x: 12 * s + 8, y: rb - band + (band - 12) / 2, w: Math.min(gws[0], 320), h: 12, cls: 'edge', style: 'line-height:12px', html: A(title) }) : '';
  return { html: `<div class="a u2-film" style="left:${px(gx - 12 * s)};top:${px(top)};width:${px(W)};height:${px(H)}"><svg class="a" style="left:0;top:0" width="${W.toFixed(2)}" height="${H.toFixed(2)}" aria-hidden="true" fill="var(--hole)">${holes}</svg>${gates}${head}</div>`, h: H };
}

// ---- the enlargement: a light print on paper holding one component at zoom z, positioned in print pixels; marks are drawn over it in the print's ink ----
function print(x, y, w, h, inner = '') { return `<div class="a ui u2-print" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px">${inner}</div>`; }
const zoomed = (z, L, T, w, html) => `<div style="position:absolute;left:0;top:0;zoom:${z}"><div style="position:absolute;left:${px(L / z)};top:${px(T / z)};${w ? `width:${px(w)};` : ''}">${html}</div></div>`;
const at = (L, T, w, html, st = '') => `<div style="position:absolute;left:${px(L)};top:${px(T)};${w ? `width:${px(w)};` : ''}${st}">${html}</div>`;
// leaders and dimension lines in the light text colour
const svgMarks = (w, h, ink, d, dots = []) => `<svg class="a" style="left:0;top:0" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true" fill="none" stroke="${ink}" stroke-width="1"><path d="${d}"/>${dots.map(([cx, cy]) => `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="3" fill="${ink}" stroke="none"/>`).join('')}</svg>`;
const dimH = (x1, x2, y) => `M${x1} ${y}H${x2}M${x1} ${y - 5}V${y + 5}M${x2} ${y - 5}V${y + 5}`;
const dimV = (x, y1, y2) => `M${x} ${y1}V${y2}M${x - 5} ${y1}H${x + 5}M${x - 5} ${y2}H${x + 5}`;
// a token and its value printed on the print, in the light roles
const mark = (ctx, L, x, y, t, v, w = 200) => tok(ctx, x, y, t, w, L.text) + lit(ctx, x, y + 18, v, w, L.quiet);

// ---- the caption column's words from y 512: a note label, then paragraphs, rows of name and literal value, or another label ----
function words(ctx, id, label, parts) {
  let y = 512, out = kitLabel(ctx, 996, y, label);
  y += 24;
  for (const p of parts) {
    if (p.label) { y += 8; out += kitLabel(ctx, 996, y, p.label); y += 24; } else if (p.rows) {
      p.rows.forEach(([n, v]) => {
        out += put(ctx, { x: 996, y, w: 270, h: 20, role: 'body', size: 14, line: 20, style: 'font:400 14px/20px var(--body);color:var(--soft)', html: A(n) })
          + put(ctx, { x: 1270, y: y + 1, w: 170, h: 18, cls: 'mono', role: 'mono', size: 12, line: 18, style: 'text-align:right', html: A(v) });
        y += 28;
      });
      y += 12;
    } else {
      const n = wrap(ctx, 'body', p, 14, 440, 0, ctx.weights.regular).length;
      out += put(ctx, { x: 996, y, w: 444, h: n * 22, cls: 'cx', html: A(p) });
      y += n * 22 + 14;
    }
  }
  if (y > 950) console.warn(`31-contact lane u2: the words on ${id} run to y ${y}`);
  return out;
}
const page = (ctx, id, body, notes) => kitPage(ctx, id, body + kitCaption(ctx, id) + notes, 'u2-' + id);

// the first of a brand's strings that fits w px at size, else the narrowest: a field's value is never cut by the gate
function fitting(ctx, list, size, w) {
  const m = list.filter(Boolean).map((t) => [t, adv(ctx, 'body', t, size, 0, ctx.weights.regular)]);
  return (m.find(([, a]) => a <= w) || m.sort((a, b) => a[1] - b[1])[0])[0];
}

// ---- states: the contact sheet itself. Three cuts, one per control, each frame the same control in one state ----
function states(ctx) {
  const ui = ctx.ui, S = sc(ctx), F = S.form, E = ex(ctx), M = colourMap(ctx, 'light'), s = 0.79, ctl = typeOf(ctx, 'control').size || 16;
  const val = fitting(ctx, [F.pickupValue, F.dropoffValue, F.readyValue], ctl, 210 * s - 2 * 12 - 26);
  const label = F.pickupValue === val ? F.pickup : F.dropoffValue === val ? F.dropoff : F.ready;
  const b = (lab, variant) => (st) => ({ label: st === 'disabled' ? 'Disabled' : st ? st[0].toUpperCase() + st.slice(1) : 'Rest', html: ui.btn(lab, { variant, state: st }) });
  const fld = (n, st, v, dis) => ({ label: n, pad: 12, html: `<div style="width:100%">${ui.field({ id: 'u2s' + n, label, value: v, state: st, disabled: dis })}</div>` });
  // a primary button is never shown disabled (it stays live and says why beside it), so its cut is one frame short
  const rows = [
    ['Primary button', [undefined, 'hover', 'focus', 'pressed'].map(b(F.book, 'primary'))],
    ['Secondary button', [undefined, 'hover', 'focus', 'pressed', 'disabled'].map(b(E.secondary || F.book, 'secondary'))],
    ['Text field', [fld('Rest', undefined, ''), fld('Focus', 'focus', val), fld('Filled', undefined, val), fld('Disabled', undefined, val, true)]],
  ];
  let y = 316, body = '';
  rows.forEach(([t, fr]) => { const c = cut(ctx, 60, y, fr, { s, title: t }); body += c.html; y += c.h + 40; });
  const bFoc = pxOf(ctx.borders, 'border-focus');
  const notes = words(ctx, 'states', 'What changes', [
    { rows: [['Hover', M['action-hover']], ['Pressed, scaled to 0.97', M['action-pressed']], [`Focus ring, ${bFoc} px`, M.focus], ['Disabled', M['disabled-bg']]] },
    'Outlined buttons fill with the sunken ground on hover. A field shows focus with its edge in the text colour and the same ring, 2 px clear.',
    `The primary button is never shown disabled. When the form isn't ready, the reason sits beside it: ${F.bookWhy}`,
  ]);
  return page(ctx, 'states', body, notes);
}

// ---- buttons: the primary button enlarged three times with its measurements; the other kinds on a cut below ----
function buttons(ctx) {
  const ui = ctx.ui, S = sc(ctx), F = S.form, E = ex(ctx), L = ctx.roles.light, M = colourMap(ctx, 'light'), Z = 3;
  const t = typeOf(ctx, 'control'), pad = pxOf(ctx.space, 'space-5') ?? 20, bw = pxOf(ctx.borders, 'border-control') || 1, rad = ctx.brand.ui.radius.button ?? ctx.brand.ui.radius.control;
  const tw = adv(ctx, 'body', F.book, t.size, 0, t.weight), BW = (tw + 2 * pad + 2 * bw) * Z, BH = 44 * Z, X = 184, Y = 112;
  const tx = X + (bw + pad + tw / 2) * Z, rx = X + BW + 56;
  const d = dimV(X - 40, Y, Y + BH) + dimH(X, X + pad * Z, Y - 32) + `M${X + BW - rad * Z * 0.3} ${Y + rad * Z * 0.3}L${rx - 8} ${Y - 24}` + `M${tx} ${Y + BH / 2 + 18}V${Y + BH + 40}`;
  const marks = svgMarks(912, 360, L.text, d, [[X + BW - rad * Z * 0.3, Y + rad * Z * 0.3], [tx, Y + BH / 2 + 18]])
    + mark(ctx, L, 32, Y + BH / 2 - 17, 'Height', '44 px', 104) + mark(ctx, L, X, Y - 84, 'space-5', `${pad} px each side`)
    + mark(ctx, L, rx, Y - 41, ctx.brand.ui.radius.button != null ? 'radius-button' : 'radius-control', `${rad} px`)
    + mark(ctx, L, tx - 100, Y + BH + 48, 'control', `${t.size} / ${t.weight}, ${ctx.brand.fonts.body.family}`, 320)
    + lit(ctx, 32, 324, `Drawn at ${Z} times.`, 300, L.quiet);
  const big = print(60, 316, 912, 360, zoomed(Z, X, Y, 0, ui.btn(F.book)) + marks);
  const c = cut(ctx, 60, 716, [
    { label: 'Secondary', html: ui.btn(E.secondary || F.book, { variant: 'secondary' }) },
    { label: 'Quiet', html: ui.btn(E.quiet || F.book, { variant: 'quiet' }) },
    { label: 'Danger', html: ui.btn(E.danger || F.book, { variant: 'danger' }) },
    { label: 'Small, 36 px', html: ui.btn(E.small || F.book, { size: 'sm' }) },
  ], { title: 'The other kinds' });
  const notes = words(ctx, 'buttons', 'Buttons', [
    `One primary button a screen. Its label is a verb that says what happens: ${F.book}.`,
    'Secondary sits beside it with an edge in the text colour. Quiet is underlined, with no fill. Danger is only for what cannot be undone.',
    { rows: [['Height', '44 px'], ['Small', '36 px'], ['Label on action', ratioText(ctx, M['action-label'], M.action)]] },
  ]);
  return page(ctx, 'buttons', big + c.html, notes);
}

// ---- inputs: four fields on a cut; the error state enlarged twice below, where the edge and the message carry the danger tone ----
function inputs(ctx) {
  const ui = ctx.ui, F = sc(ctx).form, L = ctx.roles.light, M = colourMap(ctx, 'light'), Z = 2, FW = 300;
  const lab = typeOf(ctx, 'label'), ctl = typeOf(ctx, 'control'), bCtl = pxOf(ctx.borders, 'border-control');
  const fw = (h) => `<div style="width:100%">${h}</div>`;
  const val = fitting(ctx, [F.pickupValue, F.dropoffValue], ctl.size, 178 - 26);
  const c = cut(ctx, 60, 316, [
    { label: 'With help', pad: 12, html: fw(ui.field({ id: 'u2i1', label: F.notes, help: F.notesHelp })) },
    { label: 'Filled', html: fw(ui.field({ id: 'u2i2', label: val === F.pickupValue ? F.pickup : F.dropoff, value: val })) },
    { label: 'Select', html: fw(ui.field({ id: 'u2i3', label: F.size, kind: 'select', options: F.sizes, value: F.sizes[1] })) },
    { label: 'Text area', pad: 8, html: fw(ui.field({ id: 'u2i4', label: F.notes, kind: 'textarea' })) },
  ], { title: 'Fields at rest' });
  // the enlarged field's rows, in screen px: label, gap 6, input 44, gap 6, then the message at the label size and 1.4 line height
  const eLines = wrap(ctx, 'body', F.readyError, lab.size, FW, 0, ctx.weights.medium).length, eLh = lab.size * 1.4;
  const X = 40, Y = 64, lx = X + FW * Z + 48, rows = [Y + lab.line / 2 * Z, Y + (lab.line + 6 + 22) * Z, Y + (lab.line + 56 + eLh * eLines / 2) * Z];
  const d = rows.map((ry) => `M${X + FW * Z + 4} ${ry}H${lx - 8}`).join('');
  const marks = svgMarks(912, 368, L.text, d, rows.map((ry) => [X + FW * Z + 4, ry]))
    + mark(ctx, L, lx, rows[0] - 17, 'Label, always shown', `${lab.size} / ${lab.line}, ${lab.weight}`, 200)
    + mark(ctx, L, lx, rows[1] - 17, 'Edge in --danger', `${bCtl} px, ${M.danger}`, 200)
    + mark(ctx, L, lx, rows[2] - 17, 'Message', `${ratioText(ctx, M.danger, M.surface)} on surface`, 200)
    + lit(ctx, 40, 332, `Drawn at ${Z} times.`, 300, L.quiet);
  const big = print(60, 568, 912, 368, zoomed(Z, X, Y, FW, ui.field({ id: 'u2ie', label: F.ready, value: F.readyValue, error: F.readyError })) + marks);
  const notes = words(ctx, 'inputs', 'Fields', [
    'The label sits above the field and stays visible. Help sits under it and gives way to the error when there is one.',
    `An error says what to do next: ${F.readyError}`,
    { rows: [['Field height', '44 px'], ['Edge on surface', ratioText(ctx, M.edge, M.surface)]] },
  ]);
  return page(ctx, 'inputs', c.html + big, notes);
}

// ---- choices: the whole set as it ships, printed at true size; their focus and disabled states on a cut ----
function choices(ctx) {
  const ui = ctx.ui, F = sc(ctx).form, E = ex(ctx), L = ctx.roles.light;
  const checks = E.checks || [], radios = E.radios || [], sws = E.switches || [];
  const col = (x, head, items) => at(x, 24, 260, `<div style="font:500 12px/16px var(--chrome);color:${L.quiet};margin-bottom:8px">${A(head)}</div><div style="display:flex;flex-direction:column">${items}</div>`);
  const seg = at(32, 212, 0, `<div class="ui-field"><span class="ui-label">${A(F.size)}</span>${ui.segmented(F.sizes, 1)}</div>`);
  const big = print(60, 316, 912, 312,
    col(32, 'Checkbox', checks.map((t, i) => ui.check(t, { checked: i === 0, name: 'u2c' + i })).join(''))
    + col(332, 'Radio', radios.map((t, i) => ui.check(t, { type: 'radio', name: 'u2r', checked: i === 0 })).join(''))
    + col(632, 'Switch', sws.map((t, i) => ui.switch(t, { checked: i === 0 })).join('')) + seg);
  const w = (h) => `<div style="width:100%">${h}</div>`;
  const last = sws[sws.length - 1] || checks[0];
  const c = cut(ctx, 60, 716, [
    { label: 'Checkbox, focus', html: w(ui.check(checks[0], { checked: true, state: 'focus', name: 'u2cf' })) },
    { label: 'Checkbox, disabled', html: w(ui.check(checks[checks.length - 1], { disabled: true, name: 'u2cd' })) },
    { label: 'Switch, focus', html: w(ui.switch(last, { checked: true, state: 'focus' })) },
    { label: 'Switch, disabled', html: w(ui.switch(last, { disabled: true })) },
  ], { title: 'Focus and disabled' });
  const radC = pxOf(ctx.radii, 'radius-control'), bCtl = pxOf(ctx.borders, 'border-control');
  const notes = words(ctx, 'choices', 'Choices', [
    'A checkbox is a yes or no that waits for the form. A switch acts at once. A segmented control picks one of a few, and one is always picked.',
    { rows: [['Box', `22 px, ${radC} px corner`], ['Switch', '44 x 26 px'], ['Edge', `${bCtl} px`], ['Target height', '44 px']] },
    'Checked marks fill with the text colour; the switch takes the action colour when it is on.',
  ]);
  return page(ctx, 'choices', big + c.html, notes);
}

// ---- cards: one card with a photograph at true size, its parts marked; the other kinds on a short cut ----
function cards(ctx) {
  const ui = ctx.ui, S = sc(ctx), E = ex(ctx), L = ctx.roles.light, M = colourMap(ctx, 'light'), d = S.deliveries;
  const CW = 300, MH = Math.round(CW * 9 / 16), X = 32, Y = 32;
  // inside .ui, --edge is the control edge; the slot's edge print needs the theme's film edge colour back
  const media = `<div class="ui-card__media" style="position:relative;overflow:hidden;height:${MH}px;--edge:${tokens(ctx).edge}">${photoMedia(ctx, CW, MH)}</div>`;
  const card = ui.card({ media, meta: S.status, title: S.eta, text: S.pickup });
  const rCard = pxOf(ctx.radii, 'radius-card'), bHair = pxOf(ctx.borders, 'border-hairline'), ts = typeOf(ctx, 'title-s');
  const lx = X + CW + 72, R = X + CW;
  const pts = [[R - 1, Y + 2 + rCard], [R - 40, Y + MH / 2], [R - 1, Y + MH + 40], [X + 16, Y + MH + 8]];
  const ys = [Y + 8, Y + MH / 2, Y + MH + 40, Y + MH + 8];
  const dd = pts.map(([px0, py], i) => `M${px0} ${py}${i === 3 ? `V${ys[3]}` : ''}H${lx - 8}${i === 3 ? '' : `V${ys[i]}`}`).join('');
  const marks = svgMarks(678, 376, L.text, dd, pts)
    + mark(ctx, L, lx, ys[0] - 17, 'radius-card', `${rCard} px`) + mark(ctx, L, lx, ys[1] - 17, 'Photograph', '16 : 9, edge to edge')
    + mark(ctx, L, lx, ys[2] - 17, 'border-hairline', `${bHair} px, ${M.divider}`) + mark(ctx, L, lx, ys[3] - 17, 'Padding', '16 px');
  const big = print(60, 316, 678, 376, at(X, Y, CW, card) + marks);
  const c = cut(ctx, 60, 716, [
    { label: 'Without a photograph', pad: 12, html: `<div style="width:100%">${ui.card({ meta: d[1].price, title: d[1].to })}</div>` },
    { label: 'Raised', pad: 12, html: `<div style="width:100%">${ui.card({ meta: d[2].price, title: d[2].to, raised: true })}</div>` },
    { label: 'Stat', pad: 12, html: `<div style="width:100%">${ui.stat(S.paid, E.statLabel || S.paidLabel)}</div>` },
  ], { title: 'The other kinds' });
  const notes = words(ctx, 'cards', 'Cards', [
    'A card holds one thing someone can open or act on. It rests on the ground with a hairline edge; a raised card drops the edge and steps up one ground instead.',
    { rows: [['Card title', `${ts.size} / ${ts.line}, ${ts.weight}`], ['Corner', `${rCard} px`], ['Edge', `${bHair} px`]] },
    'A stat is one number and one label, in tabular figures.',
  ]);
  return page(ctx, 'cards', big + c.html, notes);
}
// the brand's own photograph for a card's media (the first shot, its 1.10 crop), or the theme's empty slot in the slot edition
const photoMedia = (ctx, w, h) => photoFrame(ctx, 0, w, h, 1);

// ---- navigation: a panorama across the cut, the top of a desktop screen; under it the dark sidebar and the phone's tab bar on the ground ----
function navigation(ctx) {
  const ui = ctx.ui, B = ctx.brand, S = sc(ctx), E = ex(ctx), L = ctx.roles.light;
  const links = (E.links || []).slice(0, 3), all = [...links, [E.account || 'Account', 'user']];
  const logo = `<span style="display:block;width:104px">${ctx.logo.html('horizontal', { width: 104, colourway: cwOn(ctx, L.surface) })}</span>`;
  const top = `<nav class="ui-topbar" aria-label="Main" style="padding:0 24px">${logo}<div class="ui-topbar__links">${ui.links(links, 0)}</div></nav>`;
  const under = `<div style="padding:20px 24px 0">${ui.crumbs(E.crumbs || [B.ui.screen.title])}<div class="ui-display" style="margin:12px 0 16px;font-size:var(--fs-title);line-height:var(--lh-title);font-stretch:${B.fonts.display.stretch || 100}%">${A(B.ui.screen.title)}</div>${ui.tabs(E.tabs || [B.ui.screen.title], 0)}</div>`;
  const pano = cut(ctx, 60, 316, [{ label: 'Top bar, breadcrumbs and tabs, desktop', gw: 912, pad: 0, html: `<div style="width:100%;height:100%;align-self:flex-start">${top + under}</div>` }], { gh: 224, title: 'Panorama' });
  const yL = 316 + pano.h + 32;
  const side = uiDark(60, yL + 24, 220, 0, `<nav class="ui-sidebar" aria-label="Sections">${ui.links(all, 0)}</nav>`);
  const bar = uiDark(528, yL + 24, 390, 64, `<nav class="ui-tabbar" aria-label="Sections">${all.map(([t, i], k) => `<a href="#"${k === 0 ? ' aria-current="page"' : ''}>${ui.icon(i, 20)}${A(t)}</a>`).join('')}</nav>`);
  const notes = words(ctx, 'navigation', 'Navigation', [
    'The current page carries a 3 px bar in the action colour, under a link and a tab, beside a sidebar link, over a tab bar item.',
    'Tabs change the view of one list. They never change the page.',
    { rows: [['Link height', '44 px'], ['Tab bar height', '64 px'], ['Sidebar width', '220 px'], ['Tab bar items', `${all.length}`]] },
  ]);
  return page(ctx, 'navigation', pano.html + kitLabel(ctx, 60, yL, 'Sidebar, dark') + side + kitLabel(ctx, 528, yL, 'Tab bar, dark, on a phone 390 px wide') + bar, notes);
}

// ---- lists: the list printed as the screen shows it, light; beside it the other row kinds, dark, straight on the ground ----
function lists(ctx) {
  const ui = ctx.ui, B = ctx.brand, S = sc(ctx), d = S.deliveries, n = Math.min(5, d.length);
  const head = `<div class="ui-display" style="font-size:var(--fs-title-s);line-height:var(--lh-title-s);font-stretch:${B.fonts.display.stretch || 100}%;margin-bottom:16px">${A(B.ui.screen.title)}</div>`;
  const big = print(60, 316, 444, 32 + 28 + 16 + n * 65 + 1 + 32, at(24, 32, 396, head + ui.deliveryRows(n)));
  const plain = uiDark(528, 340, 444, 0, `<ul class="ui-list">${d.slice(0, 2).map((x) => ui.row({ title: x.to, sub: x.when, end: x.price })).join('')}</ul>`);
  const person = uiDark(528, 340 + 130 + 48, 444, 0, `<ul class="ui-list">${ui.row({ lead: A(S.initials), title: S.rider, sub: S.riderNote, endHtml: ui.btn(S.call, { variant: 'secondary', size: 'sm' }) })}</ul>`);
  const bHair = pxOf(ctx.borders, 'border-hairline');
  const notes = words(ctx, 'lists', 'Rows', [
    'The title says who or where, the line under it says when, and the status is the only colour in the row.',
    'Prices and times use tabular figures, so a column lines up.',
    { rows: [['Row height, at least', '64 px'], ['Lead', '40 px'], ['Divider', `${bHair} px`]] },
  ]);
  return page(ctx, 'lists', big + kitLabel(ctx, 528, 316, 'Without a lead, dark') + plain + kitLabel(ctx, 528, 340 + 130 + 24, 'With a person and an action, dark') + person, notes);
}

// ---- status: a test strip. The same five words exposed on the light print and on the dark ground, each with its token and its ratio ----
function statusKey(s) { return s.custom ? `status-${s.id}-text` : s.tone === 'action' ? 'action-text' : s.tone === 'neutral' ? 'text-soft' : s.tone; }
function status(ctx) {
  const ui = ctx.ui;
  const band = (mode) => {
    const M = colourMap(ctx, mode), ink = M.text, q = M.quiet;
    return `<div style="position:absolute;left:24px;top:24px;font:500 12px/16px var(--chrome);color:${q}">${mode === 'light' ? 'Light' : 'Dark'}</div><div style="position:absolute;left:24px;right:24px;top:84px;display:flex;justify-content:space-between;gap:24px">${ctx.status.map((s) => {
      const k = statusKey(s), hex = M[k] || M.text;
      return `<div style="min-width:0"><div>${ui.statusChip(s.id)}</div><div style="margin-top:16px;font:500 12px/16px var(--chrome);color:${ink}">${A('--' + k)}</div><div style="font:400 12px/18px var(--mono);color:${q}">${A(hex)}</div><div style="font:400 12px/18px var(--mono);color:${q}">${A(ratioText(ctx, hex, M.surface))}</div></div>`;
    }).join('')}</div>`;
  };
  const light = print(60, 316, 912, 240, band('light'));
  const dark = uiDark(60, 580, 912, 240, band('dark'), 'box-shadow:inset 0 0 0 1px var(--hair)');
  const notes = words(ctx, 'status', 'Status', [
    'A status is plain words in one colour, with no fill and no pill. Where it helps, the words carry the time.',
    `${ctx.status.length} states, shown on the light print and on the dark ground. Each ratio is the words on that ground.`,
    'The words carry the meaning, so the colour is never the only cue.',
  ]);
  return page(ctx, 'status', light + dark, notes);
}

// ---- feedback: the small signals on a cut; the banners and the toast printed below ----
function feedback(ctx) {
  const ui = ctx.ui, S = sc(ctx), F = S.form, L = ctx.roles.light, rc = pxOf(ctx.radii, 'radius-control');
  const c = cut(ctx, 60, 316, [
    { label: 'Inline message', pad: 12, html: `<p class="ui-inline-msg" style="width:100%">${ui.icon('info', 16)}<span>${A(S.inline)}</span></p>` },
    { label: 'Spinner', html: ui.spinner() },
    { label: 'Skeleton', html: `<div style="width:100%;display:flex;flex-direction:column;gap:12px">${ui.skeleton('100%')}${ui.skeleton('62%')}${ui.skeleton('80%')}</div>` },
  ], { title: 'Waiting and hints' });
  const alerts = at(32, 56, 480, `<div style="display:flex;flex-direction:column;gap:16px">${ui.alert('info', S.pickup)}${ui.alert('success', S.toast)}${ui.alert('warning', S.alert)}${ui.alert('danger', F.readyError)}</div>`);
  const heads = `<div style="position:absolute;left:32px;top:24px;font:500 12px/16px var(--chrome);color:${L.quiet}">Banners</div><div style="position:absolute;left:576px;top:24px;font:500 12px/16px var(--chrome);color:${L.quiet}">Toast</div>`;
  const big = print(60, 568, 912, 368, heads + alerts + at(576, 56, 304, ui.toast(S.toast)));
  const notes = words(ctx, 'feedback', 'Feedback', [
    'Say what happened and what to do next, in one or two sentences.',
    'A banner stays until it is dealt with. A toast leaves by itself, and its Undo can be reached from the keyboard.',
    { rows: [['Banner edge', '2 px'], ['Toast corner', `${rc} px`], ['Spinner', '24 px']] },
    'The spinner is for a wait of a few seconds. A longer wait shows skeleton lines in the shape of what is coming.',
  ]);
  return page(ctx, 'feedback', c.html + big, notes);
}

export const uikit = { states, buttons, inputs, choices, cards, navigation, lists, status, feedback };

export const css = () => `
.pg .u2-film{background:var(--film);isolation:isolate}
.pg .u2-print{overflow:hidden;background:var(--surface);color:var(--text);white-space:normal;isolation:isolate}
.pg .u2-print .a{white-space:nowrap}
`;
