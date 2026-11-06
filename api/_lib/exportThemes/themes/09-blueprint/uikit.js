// UI kit document pages for theme 09 (Blueprint): 25 ids (engine/pages.js UIKIT_PAGES), one A4 drawing sheet each.
// Every component is the engine's own markup (ctx.ui) under a .ui region, with states forced by the .is-* classes. Styles are in css-kit.js.
// Redlines print the 1x value of what they measure; a figure drawn larger says so ("Drawn at 3x") and its numbers stay 1x.
import { A, ratioText } from './helpers.js';
import { colourMap, tokenGroups, statusText } from '../../engine/tokens.js';
import { iconSet } from '../../engine/components.js';
import { rgbString, oklchString } from '../../engine/color.js';

const m = (s) => `<span class="mono">${A(s)}</span>`;
const rt = (ctx, a, b) => ratioText(ctx.fmt(ctx.ratio(a, b)));
const sc = (ctx) => ctx.brand.ui.screen.content;
const hexName = (ctx, hex) => (ctx.colours.find((c) => c.hex.toLowerCase() === String(hex).toLowerCase()) || {}).name || hex;
// redlines: a horizontal or vertical line with end ticks, its number inside; classes u (number below), l (number left), t (number above)
const rh = (st, n, cls = '') => `<i class="rl h ${cls}" style="${st}"><b>${A(n)}</b></i>`;
const rv = (st, n, cls = '') => `<i class="rl v ${cls}" style="${st}"><b>${A(n)}</b></i>`;
// general notes: numbered like the notes block on a drawing sheet
const rules = (items) => `<div class="krules"><p class="krules-h">General notes</p>${items.map((t, i) => `<p><span class="krn-n">${i + 1}</span><span>${t}</span></p>`).join('')}</div>`;
// a detail: the drawing first, then its title under it (bubble, name, scale), as on a drawing sheet. The letter is filled in by kstd, in reading
// order. {bub:false} leaves the bubble off a group whose details are drawn inside it (the states), so each letter is used once.
const grp = (title, inner, scale = '1×', { bub = true } = {}) => `<div class="kg"><div class="kg-in">${inner}</div><h2 class="kh2">${bub ? '<span class="kbub"></span>' : ''}<span class="kh2-t">${A(title)}</span><span class="kh2-s">Scale ${scale}</span></h2></div>`;
// a lettered detail inside a drawing: bubble, name, one line of spec
const dl = (name, sub = '') => `<div class="kdl"><span class="kbub"></span><span class="kdl-t"><b>${A(name)}</b>${sub ? `<span class="kcap">${sub}</span>` : ''}</span></div>`;
// a figure with its redlines laid over it (the lines are positioned against the figure's own box)
const dm = (inner, lines = '', cls = '', st = '') => `<div class="kdm ${cls}" style="${st}">${inner}${lines}</div>`;
// a chain of vertical redlines [[height, number]], one under another from top, in a dimension column
const vs = (parts, top = 0, x = 34, cls = 'l') => { let y = top; return parts.map(([h, n]) => { const r = rv(`left:${typeof x === 'number' ? x + 'px' : x};top:${y}px;height:${h}px`, n ?? h, cls); y += h; return r; }).join(''); };
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const SCALE = { buttons: '1×, figure at 3×', status: '1×, figure at 4×', 'radii-borders': '1×, corners at 4×', choices: '1×, sizes at 3×', spacing: '1×, rows at 4×', cover: '3×' };
const uniq = (html, tag) => html.replace(/dlg-t/g, tag);
const na = (t = 'Not used') => `<span class="kna">${A(t)}</span>`;
// a labelled grid of real controls. cols: [name, rule] (each a lettered detail); rows: [name, cells, dimensions?]. The name column carries the row's
// own spec line; the dimension column carries the redlines for that row's control.
const mx = (cols, rows, cls = '') => `<div class="kmx ${cls}">${[`<div class="kmx-h"></div><div class="kmx-h"></div>`, ...cols.map(([n, r]) => `<div class="kmx-h kmx-hd"><span class="kbub"></span><b>${A(n)}</b>${r ? `<span class="kcap">${r}</span>` : ''}</div>`), ...rows.flatMap(([name, cells, dim]) => [`<div class="kmx-r">${name}</div>`, `<div class="kmx-d">${dim || ''}</div>`, ...cells.map((c) => `<div class="kmx-c">${c}</div>`)])].join('')}</div>`;

// a sheet: drawing title, optional lead, the body as a .ui region, and the ruled title block at the foot
function kstd(ctx, id, inner, { lead = '', cls = '' } = {}) {
  const p = ctx.pages.find((x) => x.id === id), B = ctx.brand;
  let n = 0;
  const body = inner.replace(/<span class="kbub"><\/span>/g, () => `<span class="kbub">${LETTERS[n++] || '+'}</span>`);
  const frame = '<div class="kframe" aria-hidden="true"><i></i><i></i><i></i><i></i></div>';
  const sc1 = SCALE[id] || '1×';
  const title = `<header class="kttl"><span class="kbub kbub--sheet num">${ctx.pageNo(id)}</span><h1 class="ttl">${A(p.title)}</h1><span class="kscale">Scale ${sc1}</span></header>`;
  const tb = `<footer class="ktb"><div class="ktb-c ktb-c--w"><span class="k">Project</span>${A(B.name)} UI kit</div><div class="ktb-c ktb-c--w"><span class="k">Drawing</span><b>${A(p.title)}</b></div><div class="ktb-c"><span class="k">Scale</span>${sc1}</div><div class="ktb-c"><span class="k">Sheet</span><span class="num">${ctx.pageNo(id)} of ${ctx.pages.length}</span></div><div class="ktb-c"><span class="k">Date</span>${A(ctx.date)}</div></footer>`;
  return `<section class="pg pg--std pg--kit ${cls}" data-page="${id}">${frame}${title}${lead ? `<p class="lead">${lead}</p>` : ''}<div class="ui kbody">${body}</div>${tb}</section>`;
}

// ---- the product screen (desktop and phone): Plumbline's build screen, the engine's own components
const wordmark = (ctx) => `<strong class="ui-display">${A(ctx.brand.logo.showcase.wordmark)}</strong>`;
const navItems = (ctx) => [...sc(ctx).example.links, ['Account', 'user']];
const progress = (S) => `<div class="ui-progress" role="progressbar" aria-label="Build progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(S.progress * 100)}"><div class="ui-progress__bar"><i style="width:${S.progress * 100}%"></i></div><span class="ui-progress__dot" style="left:${S.progress * 100}%"></span></div><div class="ks-route"><span>${A(S.from)}</span><span>${A(S.to)}</span></div>`;
const leadRow = (ctx, S) => `<div class="ks-rider"><span class="ui-avatar">${A(S.initials)}</span><div class="ks-rmain"><p class="ks-rname">${A(S.rider)}</p><p class="ks-rsub">${A(S.riderNote)}</p></div>${ctx.ui.btn(S.call, { variant: 'secondary', size: 'sm', iconLeft: 'phone' })}</div>`;
const detailRows = (S) => `<dl class="ks-detail"><div><dt>${A(S.deliverToLabel)}</dt><dd>${A(S.deliverTo)}</dd></div><div><dt>${A(S.paidLabel)}</dt><dd class="ui-num">${A(S.paid)}</dd></div></dl>`;

function desktopScreen(ctx, dark) {
  const S = sc(ctx), ui = ctx.ui, N = navItems(ctx);
  return `<div class="ui kscreen" ${dark ? 'data-theme="dark"' : ''}>
<nav class="ui-topbar" aria-label="Main">${wordmark(ctx)}<div class="ui-topbar__links">${ui.links(N.slice(0, 3), 0)}</div><span class="ks-clock ui-num">${A(S.time)}</span></nav>
<div class="ks-main">
<div class="ks-top">
<section class="ks-track" aria-label="${A(ctx.brand.ui.screen.title)}"><p class="ks-title">${A(ctx.brand.ui.screen.title)}</p>
<div class="ks-eta"><h2 class="ui-display ks-time">${A(S.eta)}</h2>${ui.statusChip('booked')}</div>
<p class="ks-pickup">${A(S.pickup)}</p>
<div class="ks-prog">${progress(S)}</div></section>
<section class="ks-side" aria-label="Site lead">${leadRow(ctx, S)}${detailRows(S)}${ui.btn(S.share, { variant: 'secondary', block: true })}</section>
</div>
<section class="ks-deliv" aria-label="Jobs"><div class="ks-jh"><p class="ks-title">Jobs</p>${ui.btn(S.form.book, { size: 'sm', iconRight: 'arrow-right' })}</div>${ui.deliveryRows(5)}</section>
</div></div>`;
}

function phoneScreen(ctx) {
  const S = sc(ctx), ui = ctx.ui, N = navItems(ctx);
  return `<div class="ui kphone">
<div class="kph-top"><span class="ui-num">${A(S.time)}</span>${wordmark(ctx)}</div>
<div class="kph-body">
<span class="kph-chip">${ui.statusChip('booked')}</span>
<h2 class="ui-display kph-time">${A(S.eta)}</h2>
<p class="ks-pickup">${A(S.pickup)}</p>
<div class="ks-prog">${progress(S)}</div>
${leadRow(ctx, S)}
${detailRows(S)}
${ui.btn(S.share, { variant: 'secondary', block: true })}
</div>
<nav class="ui-tabbar" aria-label="Sections">${N.map(([t, i], k) => `<a href="#"${k === 0 ? ' aria-current="page"' : ''}>${ui.icon(i, 20)}${A(t)}</a>`).join('')}</nav>
</div>`;
}

// a key tag on a screen drawing: a numbered circle, centred on x, y of the figure
const ktag = (n, x, y) => `<i class="ktag" style="left:${x}px;top:${y}px">${n}</i>`;
// the desktop screen as a measured drawing. Every number was read off the rendered screen: padding 28, columns 310.1 and 281.9 across the
// top; top bar 56, 20, 240.7, 20, jobs 394.5, 24 down the left; Call 36, Share 44, Book 36 and five rows of 69.9 down the right.
function screenFig(ctx, dark) {
  const tags = [[1, 580, 29], [2, 15, 134], [3, 15, 281], [4, 667, 107], [5, 667, 265], [6, 667, 356], [7, 15, 423], [8, 667, 431]];
  const across = [[1, 28], [29, 310.1], [339.1, 32], [371.1, 281.9], [653, 28]].map(([x, w]) => rh(`left:${x}px;top:-14px;width:${w}px`, w)).join('');
  const down = vs([[56], [20], [240.7], [20], [394.5], [24]], 1, -14);
  const right = `${vs([[36]], 89.1, 'calc(100% + 10px)', 'r')}${vs([[44]], 243.2, 'calc(100% + 10px)', 'r')}${vs([[36]], 337.7, 'calc(100% + 10px)', 'r')}${vs([[69.9], [69.9], [69.9], [69.9], [69.9]], 382.7, 'calc(100% + 10px)', 'r')}`;
  const key = [[1, 'Top bar, 56'], [2, 'Headline, 60'], [3, 'Progress, 24'], [4, 'Call, 36'], [5, 'Share, 44'], [6, 'Book, 36'], [7, 'Job row, 69.9'], [8, 'Status words, 16.9']].map(([n, t]) => `<span><i class="ktag ktag--s">${n}</i>${A(t)}</span>`).join('');
  return `<div class="kfig kscr">${desktopScreen(ctx, dark)}${across}${down}${right}${tags.map(([n, x, y]) => ktag(n, x, y)).join('')}</div><div class="kkey">${key}</div>`;
}

// ---- colour roles: a finishes schedule. A drawn elevation of the build screen carries key tags C1..C20; the schedule is keyed to them.
function roleRows(ctx, mode) {
  const M = colourMap(ctx, mode);
  const R = (a, b) => rt(ctx, M[a], M[b]);
  // [label, token, ground token, text token, ratio, note]: the pair a role is measured as
  const g = (label, tok) => [label, tok, tok, 'text', R('text', tok), 'self'];
  const t = (label, tok, bgTok, note) => [label, tok, bgTok, tok, R(tok, bgTok), note];
  const st = (label, tok) => [label, tok, 'surface', tok, R(tok, 'surface'), 'surface'];
  const lab = (label, tok) => [label, tok, 'action', 'action-label', R('action-label', 'action'), 'self'];
  return [
    g('Surface', 'surface'), g('Raised', 'raised'), g('Sunken', 'sunken'),
    t('Text', 'text', 'surface', 'surface'), t('Soft text', 'text-soft', 'surface', 'surface'), t('Quiet text', 'quiet', 'surface', 'surface'), t('Quiet on sunken', 'quiet-sunken', 'sunken', 'sunken'),
    t('Control edge', 'edge', 'surface', 'surface'), ['Divider', 'divider', 'surface', 'divider', null, 'Decoration only'], t('Focus ring', 'focus', 'surface', 'surface'),
    ['Action', 'action', 'action', 'action-label', R('action-label', 'action'), 'self'], ['Action hover', 'action-hover', 'action-hover', 'action-label', R('action-label', 'action-hover'), 'self'],
    ['Action pressed', 'action-pressed', 'action-pressed', 'action-label', R('action-label', 'action-pressed'), 'self'], lab('Action label', 'action-label'),
    ['Disabled text', 'disabled-text', 'disabled-bg', 'disabled-text', R('disabled-text', 'disabled-bg'), 'bg'], ['Scrim', 'scrim', 'scrim', 'scrim', null, 'Behind dialogs'],
    st('Success', 'success'), st('Warning', 'warning'), st('Danger', 'danger'), st('Info', 'info'),
  ].map(([label, tok, gTok, fTok, ratio, note], i) => ({ label, tok, key: i + 1, val: M[tok], gTok, fTok, ratio, note }));
}

// the elevation: the build screen as a line drawing, filled in the mode's real colours. Redline callouts name each measured pair;
// tag bubbles in the gutters point at where each role lands. Bubble numbers are the schedule's keys.
function elevation(ctx, mode, rows) {
  const M = colourMap(ctx, mode), K = Object.fromEntries(rows.map((r) => [r.tok, r])), ink = M.text, red = M.action, call = M.action;
  const W = 682, H = 356, bub = 13;
  const rat = (r) => (r.ratio || '').replace(' : 1', '');
  const R1 = (tok) => K[tok].ratio;
  const fill = (c) => `fill="${c}"`;
  const bar = (x, y, w, h, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h > 7 ? 2 : 1}" ${fill(c)}/>`;
  const line = (x1, y1, x2, y2, c, w = 1) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${w}"/>`;
  const txt = (x, y, s, c, anchor = 'start') => `<text x="${x}" y="${y}" text-anchor="${anchor}" fill="currentColor" style="color:${c}">${A(s)}</text>`;
  // a redline dimension under a bar, its ratio beside it
  const dim = (x, y, w, tok, lx) => `${line(x, y, x + w, y, call)}${line(x, y - 3, x, y + 4, call)}${line(x + w, y - 3, x + w, y + 4, call)}${txt(lx, y + 4, R1(tok), call)}`;
  const o = [];
  // the screen, its top bar and the ground
  o.push(`<rect x="40" y="12" width="602" height="306" ${fill(M.surface)} stroke="${ink}" stroke-width="1.5"/>`);
  o.push(`<rect x="40.75" y="12.75" width="600.5" height="37" ${fill(M.raised)}/>${line(40, 50, 642, 50, ink)}`);
  o.push(bar(56, 27, 56, 8, M.text), bar(140, 28, 36, 6, M['text-soft']), bar(190, 28, 36, 6, M['text-soft']), bar(240, 28, 36, 6, M['text-soft']), bar(136, 46, 48, 4, M.action));
  // headline block and its pairs
  o.push(bar(56, 64, 56, 6, M.quiet), bar(56, 78, 180, 14, M.text), dim(56, 100, 180, 'text', 244), bar(56, 112, 230, 6, M['text-soft']), dim(56, 124, 230, 'text-soft', 294));
  o.push(bar(56, 136, 304, 6, M.sunken), bar(56, 136, 160, 6, M.action), `<circle cx="216" cy="139" r="6" ${fill(M.action)} stroke="${M.surface}" stroke-width="2"/>`);
  o.push(bar(56, 150, 40, 6, M.quiet), bar(320, 150, 40, 6, M.quiet), dim(56, 162, 40, 'quiet', 104));
  // the list: divider rules, a lead, two lines and a price a row
  for (let i = 0; i < 3; i++) { const y = 174 + i * 28; o.push(line(56, y, 360, y, M.divider, 1.5), `<circle cx="72" cy="${y + 14}" r="8" ${fill(M.sunken)}/>`, bar(92, y + 7, 90, 6, M.text), bar(92, y + 16, 60, 5, M.quiet), bar(316, y + 10, 40, 7, M.text)); }
  o.push(line(56, 258, 360, 258, M.divider, 1.5));
  // the four buttons, their label pair named above each
  const btn = [['action', M.action, M['action-label']], ['action-hover', M['action-hover'], M['action-label']], ['action-pressed', M['action-pressed'], M['action-label']], ['disabled-text', M['disabled-bg'], M['disabled-text']]];
  btn.forEach(([tok, bg, fg], i) => { const x = 56 + i * 76; o.push(`<rect x="${x}" y="284" width="68" height="24" rx="4" ${fill(bg)}/>`, bar(x + 16, 293, 36, 6, fg), txt(x + 34, 277, R1(tok), call, 'middle')); });
  // the right column: lead, fields, dialog on its scrim, status words
  o.push(`<circle cx="600" cy="78" r="18" ${fill(M.sunken)} stroke="${ink}" stroke-width="1"/>${txt(600, 82, rat(K['quiet-sunken']), M['quiet-sunken'], 'middle')}`);
  o.push(bar(392, 64, 110, 8, M.text), bar(392, 80, 140, 6, M.quiet));
  o.push(`<rect x="392" y="112" width="234" height="30" rx="4" ${fill(M.surface)} stroke="${M.edge}" stroke-width="1.5"/>`, bar(404, 124, 60, 6, M.text), txt(612, 131, R1('edge'), call, 'end'));
  o.push(`<rect x="389" y="149" width="240" height="36" rx="6" fill="none" stroke="${M.focus}" stroke-width="2"/><rect x="392" y="152" width="234" height="30" rx="4" ${fill(M.surface)} stroke="${M.edge}" stroke-width="1.5"/>`, bar(404, 164, 60, 6, M.text), txt(612, 171, R1('focus'), call, 'end'));
  o.push(line(392, 196, 626, 196, M.divider, 1.5));
  o.push(`<rect x="392" y="204" width="78" height="104" ${fill(M.scrim)}/><rect x="400" y="214" width="62" height="78" rx="3" ${fill(M.surface)} stroke="${M.text}" stroke-width="1"/>`, bar(408, 224, 36, 5, M.text), bar(408, 236, 44, 4, M['text-soft']), bar(408, 244, 38, 4, M['text-soft']), `<rect x="408" y="272" width="30" height="10" rx="2" ${fill(M.action)}/>`);
  ['success', 'warning', 'danger', 'info'].forEach((tok, i) => { const y = 204 + i * 28; o.push(bar(580, y + 8, 46, 6, M[tok]), txt(572, y + 15, R1(tok), call, 'end')); });
  // tags: [token, side, target x, target y]
  const tags = [['raised', 'L', 48, 40], ['quiet', 'L', 60, 67], ['text', 'L', 60, 85], ['text-soft', 'L', 60, 115], ['surface', 'L', 46, 140], ['divider', 'L', 64, 204], ['scrim', 'B', 431, 306],
    ['sunken', 'R', 612, 68], ['quiet-sunken', 'R', 611, 87], ['edge', 'R', 626, 127], ['focus', 'R', 629, 168], ['success', 'R', 622, 215], ['warning', 'R', 622, 243], ['danger', 'R', 622, 271], ['info', 'R', 622, 299],
    ['action', 'B', 66, 304], ['action-label', 'B', 90, 296], ['action-hover', 'B', 142, 304], ['action-pressed', 'B', 218, 304], ['disabled-text', 'B', 318, 296]];
  const lead = [];
  for (const side of ['L', 'R']) {
    const list = tags.filter((t) => t[1] === side).sort((a, b) => a[3] - b[3]);
    let prev = -99;
    list.forEach((t) => { const by = Math.max(t[3], prev + 34, 20); prev = by; t.by = by; t.bx = side === 'L' ? 18 : W - 18; });
  }
  let prevX = -99; tags.filter((t) => t[1] === 'B').sort((a, b) => a[2] - b[2]).forEach((t) => { t.bx = Math.max(t[2], prevX + 36); prevX = t.bx; t.by = H - 16; });
  for (const t of tags) {
    const [tok, side, dx, dy] = t, k = K[tok].key;
    const sx = side === 'B' ? t.bx : side === 'L' ? t.bx + bub : t.bx - bub, sy = side === 'B' ? t.by - bub : t.by;
    lead.push(`${line(sx, sy, dx, dy, red)}<circle cx="${dx}" cy="${dy}" r="3" ${fill(red)} stroke="${M.surface}" stroke-width="1"/><circle cx="${t.bx}" cy="${t.by}" r="${bub}" fill="${M.raised}" stroke="${red}" stroke-width="1.25"/>${txt(t.bx, t.by + 4, 'C' + k, red, 'middle')}`);
  }
  return `<svg class="kelev" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Elevation of the build screen, ${mode}, with colour keys C1 to C${rows.length}"><title>Elevation of the build screen, ${mode}: key tags C1 to C${rows.length}</title>${o.join('')}${lead.join('')}</svg>`;
}

function colourPage(ctx, id, mode) {
  const dark = mode === 'dark';
  const rows = roleRows(ctx, mode), keyOf = Object.fromEntries(rows.map((r) => [r.tok, r.key]));
  const ground = (r) => (r.note === 'self' ? `on C${r.key}` : r.note === 'bg' ? 'on its bg' : keyOf[r.note] ? `on C${keyOf[r.note]}` : r.note);
  const line = (r) => `<div class="ksch-r"><span class="ksch-k"><i style="background:${r.val}"></i>C${r.key}</span><span>${A(r.label)}</span>${m('--' + r.tok)}${m(r.val)}${m(rgbString(r.val))}${m(oklchString(r.val))}<span class="ksch-q">${r.ratio ? `<b>${r.ratio}</b><span>${ground(r)}</span>` : `<span>${A(r.note)}</span>`}</span></div>`;
  const head = '<div class="ksch-r ksch-h"><span>Key</span><span>Finish</span><span>Token</span><span>HEX</span><span>RGB</span><span>OKLCH</span><span>Ratio</span></div>';
  const lead = `Roles name a job, not a colour. Components read ${m('--action')}, never a palette name, so ${dark ? 'dark' : 'light'} changes nothing in the markup. Ratios are the pair as drawn.`;
  return kstd(ctx, id, `<div class="kelevw${dark ? ' kelevw--dark' : ''}"${dark ? ` style="background:${colourMap(ctx, 'dark').surface}"` : ''}>${elevation(ctx, mode, rows)}</div><div class="ksch">${head}${rows.map(line).join('')}</div>`, { lead });
}

export const uikit = {
  cover(ctx) {
    const B = ctx.brand, S = sc(ctx), R = ctx.roles.light, ctl = ctx.uiType.find((t) => t.token === 'control');
    const sheets = ctx.sections.map((s) => `<li><span>${ctx.pageNo(s.pages[0].id)}</span>${A(s.title)}</li>`).join('');
    const fig = `<div class="kc-fig"><div class="ui kz">${ctx.ui.btn(S.form.book)}</div>
${rv('left:-40px;top:0;height:132px', 44, 'l')}${rh('left:0;top:-28px;width:72px', ctx.space[4].px)}${rh('right:0;top:-28px;width:72px', ctx.space[4].px)}<b class="rn" style="right:-8px;top:-20px">r ${ctx.radius.button}</b></div>`;
    return `<section class="pg pg--kcover" data-page="cover"><div class="kframe" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
<div class="hd"><span>${A(B.name)} UI kit, blueprint</span><span>${A(ctx.versionLine)}</span></div>
<h1 class="kc-t ui-display">UI kit</h1>
<div class="kc-det"><span class="kbub">A</span><span class="kcap"><b>Primary button</b>Scale 3×</span></div>
${fig}
<p class="kc-cap">Drawn at 3×. Label: ${A(B.fonts.body.family)} ${ctl.size} / ${ctl.weight}, ${A(hexName(ctx, R.actionLabel))} on ${A(hexName(ctx, R.action))}, ${rt(ctx, R.actionLabel, R.action)}.</p>
<div class="kc-grow"></div>
<div class="tb"><div class="tbl"><div class="cell kc-logo"><span class="k">Logo, drawn at 1×</span><div class="kc-lg">${ctx.logo.html('colour', { width: 300, label: 'Your logo goes here' })}${rh('left:0;bottom:-14px;width:300px', 300, 'u')}</div></div>${[['Drawing', 'UI kit', true], ['Project', `${B.name}, renovation builders, ${B.city}`], ['Scale', '1×, 3× and 4×. Every label is the 1× value.'], ['Date', `${ctx.date}. Example project.`]].map(([k, v, big]) => `<div class="cell"><span class="k">${A(k)}</span>${big ? `<span class="big">${A(v)}</span>` : A(v)}</div>`).join('')}</div>
<div class="tbr"><span class="k">Sections</span><ul class="sh">${sheets}</ul></div></div>
</section>`;
  },

  contents(ctx) {
    const holds = {
      'colour-light': 'Every colour role in light, with its ratio', 'colour-dark': 'The same roles in dark', 'type-scale': 'Seven sizes, line height and weight', spacing: 'The nine steps, and the card they build',
      'radii-borders': 'Radius and edge width on real controls', elevation: 'Edges and steps in place of shadows', states: 'Rest, hover, focus, pressed, disabled, error',
      buttons: 'Primary, secondary, quiet, danger, sizes', inputs: 'Text field, select and textarea in every state', choices: 'Checkbox, radio, switch, segmented', cards: 'Content card, raised card, stat',
      navigation: 'Top bar, tabs, sidebar, crumbs, tab bar', lists: 'Rows with a lead, a detail and a status', status: 'The five job states, at 4×', feedback: 'Alerts, toast, inline message, loading',
      dialog: 'A modal and a confirmation', table: 'Header, sorting, row states', empty: 'Empty and first-run', 'screen-light': 'The build screen, light', 'screen-dark': 'The same screen, dark',
      'screen-mobile': 'The build screen at 390', tokens: 'Every token, light and dark', code: 'What is in the package, and how to use it',
    };
    // the drawing register: one ruled row a sheet, grouped by section
    const sections = ctx.sections.filter((s) => s.pages.some((p) => holds[p.id])).map((s) => {
      const li = s.pages.filter((p) => holds[p.id]).map((p) => `<li><i>${ctx.pageNo(p.id)}</i><b>${A(p.title)}</b><span>${A(holds[p.id])}</span><em>${SCALE[p.id] || '1×'}</em></li>`).join('');
      return `<section class="kidx-s"><h2><span class="kbub kbub--sec num">${s.n}</span>${A(s.title)}</h2><ol>${li}</ol></section>`;
    }).join('');
    const head = '<div class="kidx-h"><span>Section</span><ol><li><span>Sheet</span><span>Drawing</span><span>Contents</span><span>Scale</span></li></ol></div>';
    const l = rules(['Every number on a redline is the 1× value, whatever scale the figure is drawn at.', 'Each detail has a letter, and its title and scale sit under it. Letters run down the sheet in reading order.', `Sizes and values are read from the kit's own tokens and stylesheet: ${m('tokens.css')} and ${m('components.css')}.`]);
    return kstd(ctx, 'contents', `<div class="kidx">${head}${sections}</div><div class="kgap"></div>${l}`, { lead: 'The drawing register: one drawing sheet a page. Sheet numbers are the page numbers in this document.' });
  },

  'colour-light': (ctx) => colourPage(ctx, 'colour-light', 'light'),
  'colour-dark': (ctx) => colourPage(ctx, 'colour-dark', 'dark'),

  // a lettering sheet: each style set on its drawn baseline, cap-height and x-height lines, with redlines giving the true sizes
  'type-scale'(ctx) {
    const S = sc(ctx), F = S.form, B = ctx.brand;
    const sample = { caption: F.notesHelp, label: F.pickup, body: S.pickup, control: F.book, 'title-s': S.dialog.title, title: F.title, headline: S.status };
    // Commissioner's own metrics (units per em 2000): ascent 2034, descent 412, cap height 1426, x-height 992 / 994 / 1001 by weight
    const asc = 2034 / 2000, dsc = 412 / 2000, cap = 1426 / 2000, xh = (w) => (w >= 800 ? 1001 : w >= 500 ? 994 : 992) / 2000;
    const f1 = (n) => (Math.round(n * 10) / 10).toString();
    const rows = [...ctx.uiType].reverse().map((t) => {
      const face = t.face === 'display' ? 'font-family:var(--ff-display);letter-spacing:-0.01em;' : 'font-family:var(--ff-body);';
      const s = t.size, L = t.line, base = (L - (asc + dsc) * s) / 2 + asc * s, capH = cap * s, xH = xh(t.weight) * s;
      const pos = (y) => `top:${f1(y)}px`;
      const dims = `${rv(`left:44px;top:0;height:${L}px`, L, 'l')}${rv(`left:104px;${pos(base - capH)};height:${f1(capH)}px`, f1(capH), 'l')}${rv(`left:148px;${pos(base - xH)};height:${f1(xH)}px`, f1(xH), 'l')}`;
      const guides = `<i class="ktl-g ktl-g--b" style="${pos(base)}"></i><i class="ktl-g" style="${pos(base - capH)}"></i><i class="ktl-g" style="${pos(base - xH)}"></i>`;
      return `<div class="ktl"><div class="ktl-d" style="height:${L}px">${dims}</div><div class="ktl-s"><div class="ktl-art" style="min-height:${L}px">${guides}<div class="ktl-t" style="${face}font-size:${s}px;line-height:${L}px;font-weight:${t.weight}">${A(sample[t.token] || t.use)}</div></div><span class="kcap">${A(t.use)}</span></div><div class="ktl-m"><b>${A(t.token)}</b>${m(`${s} / ${L} / ${t.weight}`)}</div></div>`;
    }).join('');
    const key = `<div class="ktl-key"><span><i class="ktl-g ktl-g--b"></i>Baseline</span><span><i class="ktl-g"></i>Cap height</span><span><i class="ktl-g"></i>X-height</span><span><i class="rl h"></i>Redline, true size in px</span></div>`;
    return kstd(ctx, 'type-scale', `${key}<div class="ktype">${rows}</div>`, { lead: `${A(B.fonts.display.family)} 800 for titles and the live status. ${A(B.fonts.body.family)} 400 to 600 for everything people read. Each style stands on its baseline; the redlines read, left to right, the line height, the cap height and the x-height. Nothing on screen is smaller than 12.` });
  },

  spacing(ctx) {
    const S = sc(ctx), F = S.form, ui = ctx.ui;
    const uses = ['Tight pairs', 'Icon to label', 'Quiet button sides', 'Card padding', 'Button sides, dialogs', 'Form card padding', 'Between groups', 'Between sections', 'The largest gap'];
    // each step is a dimension: extension lines at both ends, the redline between them printing the 1x value; the string is drawn at 4x
    const rows = ctx.space.map((s, i) => `<div class="ksp-r">${m(`--${s.token.replace('space-', 'sp-')}`)}<span class="kfig"><i class="ksp-x" style="left:0"></i><i class="ksp-x" style="left:${s.px * 4}px"></i>${rh(`left:0;top:22px;width:${s.px * 4}px`, s.px, 'u')}</span><span class="kcap">${A(uses[i] || '')}</span></div>`).join('');
    const card = `<div class="kfig" style="height:394px"><div class="kmcard kpanel-r">
<div class="kmt">${A(F.title)}</div>${ui.field({ id: 'sp-a', label: F.pickup, value: F.pickupValue })}${ui.field({ id: 'sp-b', label: F.size, kind: 'select', options: F.sizes, value: F.sizes[0] })}${ui.btn(F.book)}
${rv('left:360px;top:0;height:32px', 32)}${rv('left:360px;top:62px;height:24px', 24)}${rv('left:200px;top:104px;height:6px', 6, 't')}${rh('left:0;top:132px;width:32px', 32)}
${rv('left:456px;top:110px;height:44px', 44)}${rv('left:456px;top:154px;height:20px', 20)}${rv('left:456px;top:242px;height:32px', 32)}${rv('left:456px;top:274px;height:44px', 44)}${rv('left:456px;top:318px;height:32px', 32)}
<b class="rn" style="left:446px;top:-18px">r ${ctx.radius.card}</b><b class="rn" style="left:412px;top:262px">r ${ctx.radius.input}</b></div>${rh('left:0;top:366px;width:440px', 440, 'u')}${rv('left:-14px;top:0;height:350px', 350, 'l')}
<ul class="kmeas">${[['Card padding', 32], ['Title to label', 24], ['Label to control', 6], ['Between fields', 20], ['Before the action', 32], ['Control height', 44], ['Radius, card', ctx.radius.card], ['Radius, control', ctx.radius.input]].map(([k, v]) => `<li><span>${k}</span><b>${v}</b></li>`).join('')}</ul></div>`;
    return kstd(ctx, 'spacing', `${grp('The nine steps, drawn as dimensions', `<div class="ksp">${rows}</div>`, '4×')}<div class="kgap"></div>${grp('The measure-up card', card)}`, { lead: `${ctx.space.length} steps: ${ctx.space.map((s) => s.px).join(', ')}. Drawn at 4× so the longest, ${ctx.space[ctx.space.length - 1].px}, can be read; every number is the 1× value. A gap that is not a step is a mistake or a named exception: 6 between a label and its control, 20 between fields.` });
  },

  'radii-borders'(ctx) {
    const S = sc(ctx), F = S.form, ui = ctx.ui, R = ctx.radius, [bh, bc, bf] = ctx.borders;
    // a corner or an edge of the real control, drawn at 4x and clipped; its redlines hold the 1x value
    const crop = (inner, lines) => `<div class="kcropw"><div class="kcrop"><div class="ui kz4 kcz">${inner}</div></div>${lines}</div>`;
    const rad = (r) => rh(`left:24px;top:-14px;width:${r * 4}px`, r) + rv(`left:-14px;top:24px;height:${r * 4}px`, r, 'l');
    const wid = (w) => rv(`left:-14px;top:24px;height:${w * 4}px`, w, 'l');
    // the clipped drawings carry no words: only the shape is measured
    const bare = (cls, w) => `<input class="ui-input ${cls}" aria-hidden="true" tabindex="-1" style="width:${w}px">`;
    const cardH = ui.card({ meta: S.status, title: S.rider, text: S.riderNote });
    const shape = { btn: '<span class="ui-btn" aria-hidden="true"></span>', card: '<div class="ui-card" aria-hidden="true" style="width:150px;height:60px"></div>', list: '<ul class="ui-list" aria-hidden="true" style="width:150px;height:30px"></ul>' };
    // the real component under each corner, with its own height read off in redline (label 18, gap 6, control 44)
    const real = (html, lines) => `<div class="kreal">${dm(html, lines, 'kdm--b', 'margin-left:30px')}</div>`;
    const col = (cap, fig, r) => `<div class="kcol">${cap}${fig}${r}</div>`;
    const fieldDim = rv('left:-14px;top:24px;height:44px', 44, 'l');
    const radii = [
      col(dl(`Buttons, r ${R.button}`, m('--r-button')), crop(shape.btn, rad(R.button)), real(ui.btn(F.book), rv('left:-14px;top:0;height:44px', 44, 'l'))),
      col(dl(`Fields, r ${R.input}`, m('--r-input')), crop(bare('', 140), rad(R.input)), real(ui.field({ id: 'rb-a', label: F.ready, value: F.readyValue }), fieldDim)),
      col(dl(`Cards, r ${R.card}`, m('--r-card')), crop(shape.card, rad(R.card)), real(cardH, rh('left:1px;top:-14px;width:16px', 16))),
    ].join('');
    const rowH = ui.row({ title: S.deliverTo, sub: S.deliverToLabel, end: S.paid });
    const widths = [
      col(dl(`Divider, ${bh.px} px`, m('--w-hairline')), crop(shape.list, wid(bh.px)), real(`<ul class="ui-list">${rowH}</ul>`, rv('left:-14px;top:1px;height:64px', 64, 'l'))),
      col(dl(`Control edge, ${bc.px} px`, m('--w-control')), crop(bare('', 140), wid(bc.px)), real(ui.field({ id: 'rb-b', label: F.ready, value: F.readyValue }), fieldDim)),
      col(dl(`Focus ring, ${bf.px} px`, m('--w-focus')), crop(bare('is-focus', 140), rv('left:-14px;top:8px;height:16px', `${bf.px} + ${bf.px}`, 'l')), real(ui.field({ id: 'rb-c', label: F.ready, value: F.readyValue, state: 'focus' }), fieldDim)),
    ].join('');
    const l = rules([
      `Controls take r ${R.control}, cards r ${R.card}. ${m('--r-round')} is for avatars and the switch, nothing else.`,
      `Control edges are ${bc.px} px in ${m('--edge')}. Dividers are ${bh.px} px in ${m('--divider')} and are decoration only, so they stay light.`,
      `The focus ring is ${bf.px} px outside the edge on a ${bf.px} px gap of the ground colour, so it shows on any fill.`,
    ]);
    return kstd(ctx, 'radii-borders', `${grp('Radius', `<div class="k3">${radii}</div>`, '4×, controls at 1×', { bub: false })}<div class="kgap"></div>${grp('Border width', `<div class="k3">${widths}</div>`, '4×, controls at 1×', { bub: false })}<div class="kgap"></div>${l}`, { lead: `Two radii and three widths, drawn on the real controls. Each detail clips a corner or an edge from a 4× drawing and sets the real control under it, dimensioned at 1×.` });
  },

  elevation(ctx) {
    const S = sc(ctx), ui = ctx.ui, sh = String(tokenGroups(ctx).shadow['shadow-float']);
    const steps = [['Surface', 'surface', 'Page, cards, fields'], ['Raised', 'raised', 'Raised cards, empty states, headers'], ['Sunken', 'sunken', 'Chips, avatars, skeletons']]
      .map(([n, t, u]) => `<div><div class="kstep-sw" style="background:var(--${t})">${A(n)}</div>${dl(n, `${m('--' + t)} ${m(ctx.roles.light[t])}<br>${A(u)}`)}</div>`).join('');
    const dlg = uniq(ui.dialog({ title: S.dialog.title, body: S.dialog.body, confirm: S.dialog.confirm, keep: S.dialog.keep, danger: true }), 'dlg-el');
    const bd = ctx.borders[0].px;
    // padding 16 on the card is read off its left padding and its top padding; the radius is the card's own
    const edges = `<div class="kstack"><div>${dm(ui.card({ meta: S.status, title: S.eta, text: S.pickup }), `${rh('left:1px;top:-14px;width:16px', 16)}<b class="rn" style="right:0;top:-24px">r ${ctx.radius.card}</b>`, 'kdm--b', 'margin-top:26px')}${dl('Card', `${m('--surface')} with a ${bd} px ${m('--divider')} edge.`)}</div>
<div><div class="kpanel kpad kdm" style="margin-top:26px">${ui.card({ meta: S.deliverToLabel, title: S.deliverTo, text: S.eta, raised: true })}${rh('left:17px;top:-14px;width:16px', 16)}</div>${dl('Raised card', `${m('--raised')} and no edge, for a second level on white.`)}</div></div>`;
    const float = `<div class="kdm kdm--b" style="margin-top:26px"><div class="ui-scrim kscrim">${dlg}</div>${rh('left:25px;top:36px;width:24px', 24, 'u')}</div>${dl('Dialog', `${ctx.borders[1].px} px ${m('--text')} edge, padding 24, on a ${m('--scrim')} ground. ${m('--shadow-float')} is ${m(sh)}.`)}`;
    const l = rules([A(ctx.brand.ui.elevationNote), 'There is no blur, no spread and no glow anywhere in the kit.', 'Depth is three things only: a step in the ground, a hairline, or a control edge.']);
    return kstd(ctx, 'elevation', `${grp('Ground steps', `<div class="k3">${steps}</div>`, '1×', { bub: false })}<div class="kgap"></div><div class="k2">${grp('Edges', edges, '1×', { bub: false })}${grp('Floating', float, '1×', { bub: false })}</div><div class="kgap"></div>${l}`, { lead: 'Plumbline draws edges and steps of ground, not shadows. Three grounds, one hairline, and one stronger edge for what floats.' });
  },

  states(ctx) {
    const S = sc(ctx), F = S.form, ui = ctx.ui, bf = ctx.borders[2].px;
    const btns = (variant, label) => ['', 'hover', 'focus', 'pressed', 'disabled'].map((st) => ui.btn(label, { variant, state: st || undefined }));
    const sp = (t) => `<span class="kcap">${t}</span>`;
    const t1 = mx([['Rest', 'The role as drawn'], ['Hover', `${m('--action-hover')}. Outlined and quiet fill ${m('--sunken')}`], ['Focus', `${bf} px ${m('--focus')} ring on a ${bf} px gap`], ['Pressed', `${m('--action-pressed')}, scaled to 0.97`], ['Disabled', `${m('--disabled-bg')}, ${m('--disabled-text')}`]],
      [[`Primary${sp(`side ${ctx.space[4].px}`)}`, btns('primary', 'Book'), vs([[44]], 8)], [`Secondary${sp(`side ${ctx.space[4].px}`)}`, btns('secondary', 'Quote'), vs([[44]], 8)], [`Quiet${sp(`side ${ctx.space[2].px}`)}`, btns('quiet', 'Skip'), vs([[44]], 8)]]);
    const fld = (id, o = {}) => ui.field({ id, label: F.ready, value: F.readyValue, ...o });
    const t2 = mx([['Rest', ''], ['Hover', 'No change'], ['Focus', `${m('--text')} edge and the ${bf} px ring`], ['Disabled', `${m('--disabled-bg')}, no edge`], ['Error', `${m('--danger')} edge and a message`]],
      [[`Text field${sp('label 18, gap 6')}`, [fld('st-r'), na('No change'), fld('st-f', { state: 'focus' }), fld('st-d', { disabled: true }), fld('st-e', { error: 'Enter four digits.' })], vs([[18], [6], [44]], 8)],
        [`Checkbox${sp('box 22, row 44')}`, [ui.check('Text me', { checked: true }), na('No change'), ui.check('Text me', { checked: true, state: 'focus' }), ui.check('Text me', { disabled: true }), na()], vs([[44]], 8)],
        [`Switch${sp('44 × 26, row 44')}`, [ui.switch('Text me', { checked: true }), na('No change'), ui.switch('Text me', { checked: true, state: 'focus' }), ui.switch('Text me', { disabled: true }), na()], vs([[44]], 8)]]);
    const l = rules(['Hover is for pointer devices only. A touch screen never shows it, so nothing may depend on it.', 'Disabled controls say why in words beside them. Colour alone never carries a state.', 'Fields, checkboxes and switches have no hover and no pressed state. They change on focus and on error only.']);
    return kstd(ctx, 'states', `${grp('Buttons, five states', t1, '1×', { bub: false })}<div class="kgap"></div>${grp('Fields and choices, the states they have', t2, '1×', { bub: false })}<div class="kgap"></div>${l}`, { lead: 'Every state is a lettered detail. Each is forced with a class so the page shows what the stylesheet ships; the redlines read the control size.' });
  },

  buttons(ctx) {
    const S = sc(ctx), F = S.form, ui = ctx.ui, R = ctx.roles.light, X = S.example, ctl = ctx.uiType.find((t) => t.token === 'control'), pad = ctx.space[4].px;
    // the extension of the 1 px edge: the padding starts inside it, so the redline starts at 4 (1 at 1x)
    const fig = `<div class="kb4"><div class="ui kz">${ui.btn('Accept quote')}</div>
${rv('left:-40px;top:0;height:132px', 44, 'l')}${rh(`left:3px;top:-28px;width:${pad * 3}px`, pad)}${rh(`right:3px;top:-28px;width:${pad * 3}px`, pad)}<b class="rn" style="right:-8px;top:-22px">r ${ctx.radius.button}</b></div>`;
    const spec = [['Height', '44'], ['Side padding', String(pad)], ['Radius', String(ctx.radius.button)], ['Label', `${A(ctx.brand.fonts.body.family)} ${ctl.size} / ${ctl.weight}`], ['Colour', `${A(hexName(ctx, R.actionLabel))} on ${A(hexName(ctx, R.action))}, ${rt(ctx, R.actionLabel, R.action)}`]]
      .map(([k, v]) => `<div class="kspec-c"><span class="kcap">${k}</span><b>${v}</b></div>`).join('');
    const sts = mx([['Rest', ''], ['Hover', ''], ['Focus', ''], ['Pressed', ''], ['Disabled', '']], [[`Primary<span class="kcap">height 44, side ${pad}</span>`, ['', 'hover', 'focus', 'pressed', 'disabled'].map((st) => ui.btn('Book', { state: st || undefined })), vs([[44]], 8)]]);
    // a variant: the button with its height redlined on the left and its side padding above, then its lettered title
    const v = (b, n, d, h, p, extra = '') => `<div class="kvar">${dm(b, `${rv(`left:-14px;top:0;height:${h}px`, h, 'l')}${rh(`left:1px;top:-14px;width:${p}px`, p)}${extra}`, '', 'margin:18px 0 0 30px')}${dl(n, d)}</div>`;
    const vars = `<div class="k3 kvars">${v(ui.btn(X.secondary, { variant: 'secondary' }), 'Secondary', `${ctx.borders[1].px} px edge. The second choice.`, 44, pad)}${v(ui.btn(X.quiet, { variant: 'quiet' }), 'Quiet', 'Underlined, no fill. For a way out.', 44, ctx.space[2].px)}${v(ui.btn(X.danger, { variant: 'danger' }), 'Danger', 'Only for what cannot be undone.', 44, pad)}${v(ui.btn('Book', { size: 'sm' }), 'Small, 36', 'Inside rows and cards.', 36, ctx.space[3].px)}${v(ui.btn('Accept quote', { size: 'lg', iconRight: 'arrow-right' }), 'Large, 52', 'One a screen, at most.', 52, ctx.space[5].px)}${v(ui.btn('Add', { iconLeft: 'plus' }), 'With an icon', 'Icon 18, 8 from the label.', 44, pad, rh(`left:${1 + pad + 18}px;top:-14px;width:8px`, 8))}</div>`;
    const l = rules([`One Brick button per screen. It is the next step, and its label says which: Accept quote, ${A(F.book)}.`, `White on Brick is ${rt(ctx, R.actionLabel, R.action)}. Brick is the action colour and nothing else.`, `A disabled button says why beside it: ${A(F.bookWhy)}`]);
    return kstd(ctx, 'buttons', `${grp('Primary button', `${fig}<div class="kspec">${spec}</div>`, '3×')}<div class="kgap" style="height:2px"></div>${grp('The five states', sts, '1×', { bub: false })}<div class="kgap" style="height:14px"></div>${grp('Variants and sizes', vars, '1×', { bub: false })}<div class="kgap" style="height:6px"></div>${l}`, { lead: 'The primary button at 3×, then every state and variant at 1×.' });
  },

  inputs(ctx) {
    const S = sc(ctx), F = S.form, ui = ctx.ui;
    const heads = [['Rest', ''], ['Focus', ''], ['Filled', ''], ['Error', ''], ['Disabled', '']];
    const rooms = ['Bath', 'Deck', 'Study'];
    const sel = (id, o = {}) => ui.field({ id, label: F.size, kind: 'select', options: rooms, value: rooms[0], ...o });
    const ta = (id, o = {}) => ui.field({ id, label: 'Notes', kind: 'textarea', ...o });
    const tx = (id, o = {}) => ui.field({ id, label: F.ready, ...o });
    const sp = (t) => `<span class="kcap">${t}</span>`;
    const grid = mx(heads, [
      [`Text field${sp('height 44, side 12')}`, [tx('in-t1', { placeholder: 'Four digits' }), tx('in-t2', { state: 'focus', value: '33' }), tx('in-t3', { value: F.readyValue }), tx('in-t4', { value: '335', error: 'Enter four digits.' }), tx('in-t5', { value: F.readyValue, disabled: true })], vs([[18], [6], [44]], 8)],
      [`Select${sp('height 44, right 40')}`, [sel('in-s1'), sel('in-s2', { state: 'focus' }), sel('in-s3', { value: rooms[2] }), sel('in-s4', { error: 'Choose a room.' }), sel('in-s5', { disabled: true })], vs([[18], [6], [44]], 8)],
      [`Textarea${sp('min height 96, side 12')}`, [ta('in-a1', { help: F.notesHelp, placeholder: 'Gate code, pets' }), ta('in-a2', { state: 'focus', value: 'Side gate, dog inside.' }), ta('in-a3', { value: 'Side gate, dog inside.' }), ta('in-a4', { value: 'Side gate, dog inside.', error: 'Keep notes short.' }), ta('in-a5', { value: 'Side gate, dog inside.', disabled: true })], vs([[18], [6], [96]], 8)],
    ]);
    const l = rules(['The label is always visible and sits above the field, 6 above the control. A placeholder is an example, never the label.', 'Help sits under the field and gives way to the error when there is one.', `An error says what to enter, not what went wrong: ${A(F.readyError)}`]);
    return kstd(ctx, 'inputs', `${grp('Text field, select and textarea', grid, '1×', { bub: false })}<div class="kgap"></div>${l}`, { lead: 'Text field, select and textarea in the five states they have. Controls are 44 high, with a 12 side padding and a 1 px edge; the redlines read the label, the gap and the control.' });
  },

  choices(ctx) {
    const ui = ctx.ui, F = sc(ctx).form;
    const heads = [['Off', ''], ['On', ''], ['Focus', ''], ['Disabled', ''], ['Disabled, on', '']];
    const chk = (label, type, n) => [ui.check(label, { type, name: n + 1 }), ui.check(label, { type, name: n + 2, checked: true }), ui.check(label, { type, name: n + 3, state: 'focus', checked: true }), ui.check(label, { type, name: n + 4, disabled: true }), ui.check(label, { type, name: n + 5, disabled: true, checked: true })];
    const sw = [ui.switch('Text me'), ui.switch('Text me', { checked: true }), ui.switch('Text me', { state: 'focus', checked: true }), ui.switch('Text me', { disabled: true }), ui.switch('Text me', { disabled: true, checked: true })];
    const sp = (t) => `<span class="kcap">${t}</span>`;
    const grid = mx(heads, [[`Checkbox${sp('box 22, row 44')}`, chk('Text me', 'checkbox', 'cb'), vs([[44]], 8)], [`Radio${sp('dot 22, row 44')}`, chk('Morning', 'radio', 'rd'), vs([[44]], 8)], [`Switch${sp('44 × 26, row 44')}`, sw, vs([[44]], 8)]]);
    // the controls at 3x, measured; the numbers are the 1x values
    const cb = '<span class="ui-choice"><input type="checkbox" checked aria-label="Checkbox"></span>', sw1 = '<span class="ui-choice"><input class="ui-switch" type="checkbox" role="switch" checked aria-label="Switch"></span>';
    const fig = `<div class="kcz3"><div class="kfig"><div class="ui kz">${cb}</div>${rv('left:-28px;top:33px;height:66px', 22, 'l')}${rh('left:0;top:112px;width:66px', 22, 'u')}</div>
<div class="kfig"><div class="ui kz">${sw1}</div>${rv('left:-28px;top:27px;height:78px', 26, 'l')}${rh('left:0;top:112px;width:132px', 44, 'u')}</div>
<div class="kfig"><div class="ui kz"><span class="ui-choice kpx"></span></div>${rv('left:0;top:0;height:132px', 44, 'l')}<span class="kcap" style="position:absolute;left:20px;top:44px;width:140px"><b>Tap target</b>44 high, the whole row.</span></div></div>`;
    // the segmented control: 40 high inside its 1 px edge, 16 side padding
    const segD = (html) => dm(html, `${rv('left:-14px;top:1px;height:40px', 40, 'l')}${rh('left:1px;top:-14px;width:16px', 16)}`, '', 'margin:18px 0 0 30px');
    const seg = `<div class="k2 kseg"><div>${segD(ui.segmented(F.sizes, 1))}<span class="kcap kcap--after"><b>Segmented</b>One choice, always one selected. The selected segment fills with ${m('--text')}.</span></div><div>${segD(ui.segmented(F.sizes, 0, { disabled: true }))}<span class="kcap kcap--after"><b>Segmented, disabled</b>All segments go grey together.</span></div></div>`;
    return kstd(ctx, 'choices', `${grp('Checkbox, radio and switch', grid, '1×', { bub: false })}<div class="kgap"></div>${grp('Sizes', fig, '3×')}<div class="kgap"></div>${grp('Segmented control', seg)}`, { lead: `Every choice control is a real input. The edge is 1 px in ${m('--edge')}; a ticked box fills with Bluestone, and the switch track takes Brick when it is on.` });
  },

  cards(ctx) {
    const S = sc(ctx), ui = ctx.ui, D = S.deliveries, r = ctx.radius.card;
    const media = ctx.photo('measure-up', { cls: 'ui-card__media', slotNote: false });
    // the card's own box starts inside its 1 px edge: padding 16 is read off from 1
    const pad = (st = '') => `${rh('left:1px;top:-14px;width:16px', 16)}<b class="rn" style="right:0;top:-24px;${st}">r ${r}</b>`;
    // the raised card sits on a white panel (16 padding, 1 border), so its own box starts at 17
    const lines = `${rh('left:17px;top:-14px;width:16px', 16)}${rv('left:calc(100% + 14px);top:18px;height:16px', 16)}${rv('left:calc(100% + 14px);bottom:18px;height:16px', 16)}<b class="rn" style="right:-8px;top:-24px">r ${r}</b>`;
    const row1 = `<div class="k3 kcards">
<div>${dm(ui.card({ media, meta: S.status, title: S.eta, text: S.pickup }), `<b class="rn" style="right:0;top:-24px">r ${r}</b>`, 'kdm--b')}${dl('With media', `The photo takes 16 : 9. The card keeps its hairline.`)}</div>
<div>${dm(ui.card({ meta: S.deliverToLabel, title: S.rider, text: S.riderNote }), pad(), 'kdm--b')}${dl('Without media', `${m('--surface')}, ${ctx.borders[0].px} px ${m('--divider')} edge. Padding 16, gap 6.`)}</div>
<div><div class="kfig kpanel kpad">${ui.card({ meta: S.deliverToLabel, title: S.deliverTo, text: S.eta, raised: true })}${lines}</div>${dl('Raised', `${m('--raised')} and no edge, for a second level on white. Padding 16.`)}</div></div>`;
    const quote = dm(ui.card({ meta: D[1].when.split(',')[0], title: D[1].to, text: `Fixed price ${D[1].price}. ${S.riderNote}.`, action: `<div class="kcard-act">${ui.btn('Accept quote', { size: 'sm' })}${ui.btn(S.example.secondary, { variant: 'secondary', size: 'sm' })}</div>` }), `${rh('left:1px;top:-14px;width:16px', 16)}`, 'kdm--b', 'margin-top:22px');
    const stats = `<div class="kstats">${dm(ui.stat(S.paid, S.paidLabel), `${rh('left:1px;top:-14px;width:16px', 16)}`, 'kdm--b', 'margin-top:22px')}${ui.stat('4 weeks', 'Kitchen, start to handover')}${ui.stat('3', 'Jobs on site')}${ui.stat('$21,800', 'Quotes out')}</div>`;
    const l = rules(['A card is one thing: a job, a person, a number. The title is the thing and the line under it is the next fact.', `Edges, not shadows. A card has a ${ctx.borders[0].px} px hairline, or no edge on ${m('--raised')}.`, 'A card with an action keeps it at the bottom, in small buttons: one primary at most.']);
    return kstd(ctx, 'cards', `${grp('Content cards', row1, '1×', { bub: false })}<div class="kgap"></div><div class="k2">${grp('Quote card, with an action', `<div>${quote}</div>`)}${grp('Stat', stats)}</div><div class="kgap"></div>${l}`, { lead: `Padding 16, radius ${r}, title ${ctx.uiType.find((t) => t.token === 'title-s').size} / ${ctx.uiType.find((t) => t.token === 'title-s').line} in ${A(ctx.brand.fonts.display.family)}. Padding and radius are in redline on each card.` });
  },

  navigation(ctx) {
    const ui = ctx.ui, S = sc(ctx), X0 = S.example;
    const items = [...X0.links, ['Account', 'user']];
    const L = 'margin-left:30px';
    // the top bar is 56 high with its 1 px rule inside; the 44 high links centre in what is left (5.5 above and below)
    const top = `${dm(`<nav class="ui-topbar ktop" aria-label="Main"><strong class="ui-display kwm">${A(ctx.brand.logo.showcase.wordmark)}</strong><div class="ui-topbar__links">${ui.links(items.slice(0, 3), 0)}</div></nav>`, `${rv('left:calc(100% + 14px);top:0;height:56px', 56)}${rv('left:-14px;top:5.5px;height:44px', 44, 'l')}`, 'kdm--b', 'margin:0 30px 0 30px')}<span class="kcap kcap--after">The current page has a 3 px ${m('--action')} bar under it. Links are 44 high, with 12 side padding.</span>`;
    const tabs = `${dm(ui.tabs(X0.tabs, 0), `${rv('left:-14px;top:0;height:44px', 44, 'l')}${rh('left:0;top:-14px;width:16px', 16)}`, 'kdm--b', L)}<span class="kcap kcap--after">Tabs switch views of one list. They do not change the page. 44 high, 16 side padding.</span>`;
    const crumbs = `${ui.crumbs([...X0.crumbs, S.deliverTo])}<span class="kcap kcap--after">Quiet, with the current page in full ink.</span>`;
    const side = `${dm(`<nav class="ui-sidebar" aria-label="Sections">${ui.links(items, 0)}</nav>`, `${rh('left:0;top:-14px;width:220px', 220)}${rv('left:-14px;top:12px;height:44px', 44, 'l')}${rv('left:calc(100% + 14px);top:0;height:12px', 12)}`, '', 'margin:26px 0 0 30px')}<span class="kcap kcap--after">A 3 px bar on the left marks the current page. 220 wide, padding 12, 2 between links.</span>`;
    const bar = `${dm(`<nav class="ui-tabbar" aria-label="Sections">${items.map(([t, i], k) => `<a href="#"${k === 0 ? ' aria-current="page"' : ''}>${ui.icon(i, 20)}${A(t)}</a>`).join('')}</nav>`, `${rv('left:calc(100% + 14px);top:0;height:64px', 64)}`, 'kdm--b', 'margin-right:30px')}<span class="kcap kcap--after">Four destinations at most, 64 high. The bar sits above the current one.</span>`;
    return kstd(ctx, 'navigation', `${grp('Top bar', top)}<div class="kgap" style="height:34px"></div><div class="k2"><div class="kstack">${grp('Tabs', tabs)}${grp('Breadcrumbs', crumbs)}${grp('Mobile tab bar', bar)}</div>${grp('Sidebar', side)}</div><div class="kgap"></div>${rules(['Every destination is an icon and a word. The icon never stands alone.', 'The current page is marked three ways: ink, a Brick bar, and aria-current for a screen reader.', 'The tab bar is for phones. The top bar and the sidebar are for wider screens.'])}`, { lead: 'Five ways to move, all one pattern: a Brick bar marks where you are, and the label says it in words.' });
  },

  lists(ctx) {
    const ui = ctx.ui, S = sc(ctx), D = S.deliveries;
    const icons = ['calendar', 'receipt', 'hammer', 'ruler', 'house'];
    const rows = D.map((d, i) => ui.row({ lead: ui.icon(icons[i], 18), title: d.to, sub: d.when, end: d.price, chip: ui.statusChip(d.status) })).join('');
    // measured: a row with a status is 12 + (price 19.5, 4, the words 16.9) + 12 + a 1 hairline = 65.4; the lead is 40 with 12 to the words
    const main = `${dm(`<ul class="ui-list">${rows}</ul>`, `${rh('left:0;top:-14px;width:40px', 40)}${rh('left:40px;top:-14px;width:12px', 12)}${rv('left:-14px;top:1px;height:65.4px', 65.4, 'l')}${vs([[12], [19.5], [4, ''], [16.9], [12]], 1, 'calc(100% + 10px)', 'r')}`, 'kdm--b', 'margin:28px 44px 0 30px')}<span class="kcap kcap--after" style="margin-left:30px">With a status a row is 65.4: 12, the price 19.5, 4, the words 16.9, 12, and a 1 hairline.</span>`;
    const plain = `${dm(`<ul class="ui-list">${D.slice(0, 2).map((d) => ui.row({ title: d.to, sub: d.when, end: d.price })).join('')}</ul>`, vs([[64], [64]], 1, -14), 'kdm--b', 'margin:24px 0 0 30px')}<span class="kcap kcap--after" style="margin-left:30px">No lead and no status: the row holds its 64 minimum.</span>`;
    const link = `${dm(`<ul class="ui-list">${ui.row({ lead: ui.icon('calendar', 18), title: D[0].to, sub: D[0].when, end: D[0].price, href: '#' })}</ul>`, vs([[12], [40], [12]], 1, 'calc(100% + 10px)', 'r'), 'kdm--b', 'margin:24px 44px 0 0')}<span class="kcap kcap--after">With the 40 lead and no status, 12 + 40 + 12 + a 1 hairline: 65.</span>`;
    const l = rules(['One row is one job. The address is the title, the work and the date are the detail, and the status words are the only colour.', 'Prices use tabular figures so a column lines up. The icon says the kind of work, not the status.', 'A row that opens is a link, and the whole row is the target. It steps to Plaster on hover.']);
    return kstd(ctx, 'lists', `${grp('Lead, detail, price and status', main)}<div class="kgap" style="height:10px"></div><div class="k2">${grp('Without a lead', plain)}${grp('As a link', link)}</div><div class="kgap"></div>${l}`, { lead: 'A row is 64 high, 65 with a lead and 65.4 with a status.' });
  },

  status(ctx) {
    const ui = ctx.ui, M = { light: colourMap(ctx, 'light'), dark: colourMap(ctx, 'dark') }, lbl = ctx.uiType.find((t) => t.token === 'label');
    const ok = ctx.status.find((s) => s.id === 'needs-ok') || ctx.status[0];
    // the words at 4x: one line of the label size, no fill, no padding, no radius; the numbers are the 1x values
    const lh = +(lbl.size * 1.3).toFixed(1), half = +((52 - lh) / 2).toFixed(1);
    const okL = statusText(ctx, 'light', ok), okD = statusText(ctx, 'dark', ok);
    const fig = `<div class="kb4 kb4--chip"><div class="ui kz4">${ui.statusChip('needs-ok')}</div>
${rv(`left:-40px;top:0;height:${lh * 4}px`, lh, 'l')}</div>`;
    const spec = [['Line', String(lh)], ['Fill, padding, radius', 'None'], ['Label', `${A(ctx.brand.fonts.body.family)} ${lbl.size} / ${lbl.weight}`], ['Light, on the ground', rt(ctx, okL.hex, M.light.surface)], ['Dark, on the ground', rt(ctx, okD.hex, M.dark.surface)]]
      .map(([k, v]) => `<div class="kspec-c"><span class="kcap">${k}</span><b>${v}</b></div>`).join('');
    const meaning = { booked: 'The start date is set. The crew is not on site yet.', 'quote-sent': 'The quote is with the customer, who has not answered.', 'on-site': 'The crew is working in the house now.', 'needs-ok': 'The customer has to decide. The only status that asks for something.', finished: 'Handed over. Quiet: grey words.' };
    const ratio = (mode, s) => { const w = statusText(ctx, mode, s); return rt(ctx, w.hex, M[mode].surface); };
    const head = '<div class="kst kst--h"><span>Light</span><span>Dark</span><span>Light ratio</span><span>Dark ratio</span><span>When</span></div>';
    const rows = ctx.status.map((s) => `<div class="kst"><span>${ui.statusChip(s.id)}</span><span class="ui kdk" data-theme="dark">${ui.statusChip(s.id)}</span><span class="krr"><b>${ratio('light', s)}</b></span><span class="krr"><b>${ratio('dark', s)}</b></span><span class="kcap">${A(meaning[s.id])}</span></div>`).join('');
    // the schedule: header 32, rows 52 with the words centred; the dark samples are one panel, 132 wide, running through all five rows (5 x 52 = 260)
    const sched = `${dm(`<div class="kstl">${head}${rows}</div>`, `${vs([[32], [52], [52], [52], [52], [52]], 1, -8)}${vs([[half], [lh], [half]], 33, 'calc(100% + 12px)', '')}${rv('left:140px;top:33px;height:260px', 260, 'l')}`, 'kdm--b', 'margin:0 30px 0 0')}<span class="kcap kcap--after">Rows are 52 with the words centred. The dark samples share one panel, 132 wide, through all five rows: 260. The ratio is the words on the dark surface.</span>`;
    const l = rules(['A status is words in one colour, with no fill. The ratio is the words on the page ground.', 'Needs your OK is the one status that asks for something. Nothing else the customer sees is allowed to look as urgent.', `A count badge sits on a tab or an icon: <span class="ui-badge">3</span>`]);
    return kstd(ctx, 'status', `${grp('Needs your OK, the status that asks', `${fig}<p class="kcap kb4-c">Drawn at 4×. Every number is the 1× value. The words are ${m(okL.token)}${okL.token === okD.token ? '' : ` in light and ${m(okD.token)} in dark`}.</p><div class="kspec">${spec}</div>`, '4×')}<div class="kgap"></div>${grp('The five job states', sched)}<div class="kgap"></div>${l}`, { lead: 'Five states, each plain words in one colour, drawn at 4× for the one that asks the customer for something. Light and dark are both measured.' });
  },

  feedback(ctx) {
    const ui = ctx.ui, S = sc(ctx);
    // measured: an alert is 43.2 high (10, one 23.2 line, 10) with a 2 edge and 14 padding, so 16 side padding, a 20 icon and 12 to the words; 8 between alerts
    const alerts = `${dm(`<div class="kalerts">${ui.alert('info', S.pickup)}${ui.alert('success', S.toast)}${ui.alert('warning', S.alert)}${ui.alert('danger', S.form.readyError)}</div>`, `${rh('left:0;top:-14px;width:16px', 16)}${rh('left:16px;top:-14px;width:20px', 20)}${rh('left:36px;top:-14px;width:12px', 12, 'rt')}${vs([[43.2], [8], [43.2], [8], [43.2], [8], [43.2]], 0, -14)}${vs([[10], [23.2], [10]], 0, 'calc(100% + 10px)', 'r')}`, 'kdm--b', 'margin:28px 44px 0 30px')}<span class="kcap kcap--after" style="margin-left:30px">A 2 px edge and an icon in the tone, words in the text colour. A banner stays until it is dealt with.</span>`;
    const toast = `${dm(ui.toast('Quote sent to Sam.'), `${rv('left:-14px;top:0;height:48px', 48, 'l')}${rh('left:0;top:-14px;width:16px', 16)}${rh('right:0;top:-14px;width:16px', 16)}`, '', 'margin:28px 0 0 30px')}<span class="kcap kcap--after" style="margin-left:30px">48 high, 16 either side. At the foot of the screen, gone in five seconds. Undo stays reachable by keyboard.</span>`;
    const inline = `${dm(`<p class="ui-inline-msg">${ui.icon('info', 16)}${A(S.inline)}</p>`, `${rh('left:0;top:-14px;width:16px', 16)}${rh('left:16px;top:-14px;width:8px', 8, 'rt')}`, '', 'margin:28px 0 0 30px')}`;
    const load = `${dm(`<div class="kload">${ui.spinner()}<div class="kskel">${ui.skeleton('220px')}${ui.skeleton('150px')}${ui.skeleton('180px')}</div></div>`, `${rh('left:0;top:-14px;width:24px', 24)}${rh('left:24px;top:-14px;width:20px', 20)}${rh('left:44px;top:-14px;width:220px', 220)}${vs([[14], [10], [14], [10], [14]], 0, 'calc(100% + 10px)', 'r')}`, '', 'margin:28px 44px 0 0')}<span class="kcap kcap--after">A 24 spinner for a wait of a few seconds. A longer wait gets skeleton lines, 14 high and 10 apart, in the shape of the rows.</span>`;
    const l = rules(['Say what happened and what to do, in one or two sentences.', 'A banner stays until it is dealt with. A toast leaves by itself.', 'A banner has a 2 px edge and an icon in the tone colour. The words stay in the text colour.']);
    return kstd(ctx, 'feedback', `${grp('Alert banners', alerts)}<div class="kgap"></div><div class="k2"><div class="kstack">${grp('Toast', toast)}${grp('Inline message', inline)}</div>${grp('Loading', load)}</div><div class="kgap"></div>${l}`, { lead: 'Four tones of banner, one toast, one inline message, and two ways to wait. Each is the engine markup, so the roles carry over to dark.' });
  },

  dialog(ctx) {
    const ui = ctx.ui, S = sc(ctx), D = S.dialog;
    const a = uniq(ui.dialog({ title: 'Share the schedule', body: `Anyone with the link sees the build schedule for ${S.deliverTo}.`, confirm: 'Copy link', keep: 'Close' }), 'dlg-a');
    const b = uniq(ui.dialog({ title: D.title, body: D.body, confirm: D.confirm, keep: D.keep, danger: true }), 'dlg-b');
    // measured: a 440 dialog on a 24 scrim; inside its 1 px edge: 24, title 26, 12, text 39, 24, buttons 44, 24. Buttons sit 12 apart, the last 24 from the edge.
    const fig = (dlg, [w1, w2]) => {
      const r1 = 24 + 440 - 1 - 24 - w2, r0 = r1 - 12 - w1;
      return dm(`<div class="ui-scrim kscrim2">${dlg}</div>`, `${rh('left:0;top:-14px;width:24px', 24)}${rh('left:24px;top:-14px;width:440px', 440)}${rh('right:0;top:-14px;width:24px', 24)}${vs([[24], [26], [12], [39], [24], [44], [24]], 25, 'calc(100% + 10px)', 'r')}${rh(`left:${r0}px;top:calc(100% + 14px);width:${w1}px`, w1, 'u')}${rh(`left:${r0 + w1}px;top:calc(100% + 14px);width:12px`, 12, 'u')}${rh(`left:${r1}px;top:calc(100% + 14px);width:${w2}px`, w2, 'u')}`, '', 'margin:26px 0 30px 0;width:488px');
    };
    const spec = (rows) => `<div class="kdlspec">${rows.map(([k, v]) => `<div><span class="kcap">${k}</span><b>${v}</b></div>`).join('')}</div>`;
    const common = [['Width, padding', '440, 24'], ['Edge', `${ctx.borders[1].px} px, ${m('--text')}`], ['Radius, shadow', `${ctx.radius.card}, none`]];
    const fa = `<div class="kdlg"><div>${fig(a, [90.3, 117.8])}</div>${spec([['Use', 'One action and a way out'], ...common, ['Buttons', '44 high, 12 apart']])}</div>`;
    const fb = `<div class="kdlg"><div>${fig(b, [176.8, 189.2])}</div>${spec([['Use', 'Names the action. Safe answer on the left'], ...common, ['Danger button', `${m('--danger')} fill`]])}</div>`;
    const l = rules(['A dialog asks one thing. The title is the question and the buttons answer it.', `The danger button is for what is hard to undo, and it names the action: ${A(D.confirm)}.`, 'Esc and a click on the scrim close it.']);
    return kstd(ctx, 'dialog', `${grp('Modal', fa)}<div class="kgap" style="height:4px"></div>${grp('Confirmation', fb)}<div class="kgap" style="height:6px"></div>${l}`, { lead: 'Two dialogs on the scrim, lifted by a 1 px edge in ink, not a shadow.' });
  },

  table(ctx) {
    const ui = ctx.ui, S = sc(ctx);
    const data = [...S.deliveries].sort((a, b) => parseInt(a.to, 10) - parseInt(b.to, 10));
    const sortBtn = (t, dir) => `<button type="button">${A(t)}${dir ? ui.icon(dir === 'asc' ? 'arrow-up' : 'arrow-down', 14) : ''}</button>`;
    const rows = data.map((d) => `<tr${d.to.startsWith('14 ') ? ' aria-selected="true"' : ''}${d.to.startsWith('9 ') ? ' class="is-hover"' : ''}><td>${A(d.to)}</td><td>${A(d.when)}</td><td>${ui.statusChip(d.status)}</td><td class="is-num">${A(d.price)}</td></tr>`).join('');
    const table = `<table class="ui-table"><thead><tr><th scope="col" aria-sort="ascending">${sortBtn('Site', 'asc')}</th><th scope="col">Work and date</th><th scope="col">Status</th><th scope="col" class="is-num">${sortBtn('Price')}</th></tr></thead><tbody>${rows}</tbody></table>`;
    // measured: header 44, five rows of 52; columns 200, 276, 124 and the rest (82); cells pad 12
    const fig = `${dm(`<div class="kpanel-r ktable">${table}</div>`, `${vs([[44], [52], [52], [52], [52], [52]], 0, -8)}${rh('left:0;top:-14px;width:200px', 200)}${rh('left:200px;top:-14px;width:276px', 276)}${rh('left:476px;top:-14px;width:124px', 124)}${rh('left:600px;top:-14px;width:82px', 82)}`, 'kdm--b', 'margin-top:28px')}<span class="kcap kcap--after">Header 44 and five rows of 52: 304.5 in all. Cells have 12 side padding. The header rule is ${ctx.borders[1].px} px in ${m('--text')}; each row has a ${ctx.borders[0].px} px ${m('--divider')} hairline.</span>`;
    // the selected row's bar at 4x: three pixels wide, so 12 here; a crop with no words
    const crop = `<div class="kbarw kfig"><div class="kbarc" aria-hidden="true"><div class="ui kz4"><table class="ui-table"><tbody><tr aria-selected="true"><td></td></tr></tbody></table></div></div>${rh('left:0;top:-14px;width:12px', 3)}</div><span class="kcap kcap--after">Drawn at 4×. The bar is 3 wide, in ${m('--action')}, inside the row's left edge.</span>`;
    const keys = `<div class="kkeys"><span class="kcap"><b>Selected</b>14 Doveton Street North. ${m('--raised')} fill and the Brick bar.</span><span class="kcap"><b>Hover</b>9 Sebastopol Street. ${m('--raised')} fill, on pointer devices only.</span><span class="kcap"><b>Sorted</b>Site, ascending. The arrow shows the direction; ${m('aria-sort')} says it aloud.</span></div>`;
    const l = rules(['A sortable header is a button. Only one column is sorted at a time, and it shows its direction.', 'Numbers sit right and use tabular figures, so the price column lines up.', `The header is 44 high with a ${ctx.borders[1].px} px rule under it in ink. Every row is 52, with a hairline under it.`]);
    return kstd(ctx, 'table', `${grp('Jobs, sorted by site', fig)}<div class="kgap"></div><div class="k2">${grp('Selected row', crop)}${grp('Row states', keys)}</div><div class="kgap"></div>${l}`, { lead: 'Header, sorting and three row states, on five real jobs. The status words are the only colour in a row.' });
  },

  empty(ctx) {
    const S = sc(ctx), ui = ctx.ui, E = S.empty;
    const none = `<div class="ui-empty"><h3 class="ui-empty__title">${A(E.title)}</h3><p class="ui-empty__text">${A(E.body)}</p>${ui.btn(E.cta)}</div>`;
    const steps = ['Tell us the address and the room.', 'Pick a day for the measure-up.', 'Sam measures up and sends the quote within the week.'];
    const first = `<div class="ui-empty"><h3 class="ui-empty__title">Your first measure-up</h3><ol class="ksteps">${steps.map((t, i) => `<li><span>${i + 1}</span>${A(t)}</li>`).join('')}</ol>${ui.btn(S.form.book)}</div>`;
    // the empty state sits on a white panel (16 padding), so its own box starts at 16: padding 32, title, 12, text, 12, button, 32
    const two = `<div class="k2 kemp"><div>${dm(`<div class="kpanel-r kpad">${none}</div>`, `${vs([[16], [32], [60], [12], [39], [12], [44], [32], [16]], 0, -8)}${rh('left:16px;top:-14px;width:32px', 32)}${rh('right:16px;top:-14px;width:32px', 32)}`, 'kdm--b', 'margin-top:28px')}<span class="kcap kcap--after"><b>Empty</b>Nothing booked yet. Says what is missing and offers the one action that fixes it.</span></div><div>${dm(`<div class="kpanel-r kpad">${first}</div>`, `${vs([[16], [32], [30], [12], [36.4], [10], [24], [10], [36.4], [12], [44], [32], [16]], 0, -8)}`, 'kdm--b', 'margin-top:28px')}<span class="kcap kcap--after"><b>First run</b>Before the first booking. Lists what happens, in order.</span></div></div>`;
    const inline = `${dm(`<ul class="ui-list kemp-list"><li class="kemp-li"><p class="ui-inline-msg">${ui.icon('info', 16)}No jobs on site this week. Next start is ${A(S.eta.replace('Start ', ''))}.</p></li></ul>`, vs([[16], [19.5], [16]], 1, 'calc(100% - 8px)'), 'kdm--b', 'margin:0')}<span class="kcap kcap--after">Inside a list, one line. No card, no button: the page already has one.</span>`;
    const l = rules([`The empty state sits on ${m('--raised')} with no edge, so it does not read as a card. Padding 32, radius ${ctx.radius.card}.`, 'The title says what is missing, in the display face. The line under it says what to do, in 36 characters or fewer.', 'One button, and it is the primary one.']);
    return kstd(ctx, 'empty', `${grp('Empty and first run', two)}<div class="kgap"></div>${grp('Empty inside a list', inline)}<div class="kgap"></div>${l}`, { lead: 'Two empty states and the quiet one. Each says what is missing and what to do next.' });
  },

  'screen-light'(ctx) {
    return kstd(ctx, 'screen-light', screenFig(ctx, false), { lead: 'The build screen in light, drawn at 682 wide. Each key is a part; each number is its size.' });
  },

  'screen-dark'(ctx) {
    const ok = ctx.status.find((x) => x.id === 'needs-ok') || ctx.status[0];
    return kstd(ctx, 'screen-dark', screenFig(ctx, true), { lead: `The same screen in dark. Needs your OK reads at ${rt(ctx, statusText(ctx, 'dark', ok).hex, colourMap(ctx, 'dark').surface)}.` });
  },

  'screen-mobile'(ctx) {
    const S = sc(ctx);
    const lines = { booked: ['Start Mon 16 Nov', ''], 'quote-sent': ['Quote sent Mon 2 Nov', ''], 'on-site': ['On site since 26 Oct', ''], 'needs-ok': ['Decide by Fri 6 Nov', ''], finished: ['Handed over', 'final'] };
    const states = ctx.status.map((s) => { const ln = lines[s.id] || [s.label, '']; return `<li class="kstate"><span class="kstate-chip">${ctx.ui.statusChip(s.id)}</span><span class="ui-display kstate-line${ln[1] ? ' is-final' : ''}">${A(ln[0])}</span></li>`; }).join('');
    // measured: top bar 36, 20, status words 16.9 down the left; Share 44, 20, tab bar 64 at the foot; side padding 24 and content 340 across the top
    const tags = [[1, 13, 19], [2, 13, 65], [3, 13, 116], [4, 13, 234], [5, 377, 309], [6, 377, 473], [7, 378, 529]];
    const dims = `${rh('left:1px;top:-14px;width:24px', 24)}${rh('left:25px;top:-14px;width:340px', 340)}${rh('left:365px;top:-14px;width:24px', 24)}${vs([[36], [20], [16.9]], 1, -14)}${vs([[44], [20], [64]], 451, -14)}`;
    const phone = `<div class="kfig kphw">${phoneScreen(ctx)}${dims}${tags.map(([n, x, y]) => ktag(n, x, y)).join('')}</div><span class="kcap kcap--after">Drawn at 390 wide. The primary action sits 20 above the tab bar, inside reach of the thumb.</span>`;
    const key = `<div class="kkey kkey--v">${[[1, 'Top bar, 36'], [2, 'Status words, 16.9'], [3, 'Headline, 60'], [4, 'Progress, 24'], [5, 'Call, 36'], [6, 'Share, 44'], [7, 'Tab bar, 64']].map(([n, t]) => `<span><i class="ktag ktag--s">${n}</i>${A(t)}</span>`).join('')}</div>`;
    const right = `<div class="kdm kdm--b kmst">${grp('The headline, state by state', `<ul class="kstates">${states}</ul>`)}${vs([[82.5], [82.5], [82.5], [82.5], [100.5]], 1, -10, 'l')}</div>${key}`;
    const l = rules(['The start date or the decision is the headline in every state. The status word beside it says where the job is.', 'The site lead and the Call button stay in reach of the thumb.', 'When the job is over the headline is two words, and the status keeps the date.']);
    return kstd(ctx, 'screen-mobile', `<div class="kmob"><div>${phone}</div><div>${right}</div></div><div class="kgap"></div>${l}`, { lead: 'The product at 390, in light, and the headline in each of the five states.' });
  },

  // the token schedule: every row is the token, its value and a cell drawn at 1x; each group says which sheet draws it, and a colour carries its C key
  tokens(ctx) {
    const g = tokenGroups(ctx), L = colourMap(ctx, 'light'), D = colourMap(ctx, 'dark');
    const keyOf = Object.fromEntries(roleRows(ctx, 'light').map((r) => [r.tok, r.key]));
    const sw = (c) => `<i class="ktsw" style="background:${c}"></i>`;
    const col = Object.keys(L).map((k) => `<div class="ktk"><span class="kckey">${keyOf[k] ? 'C' + keyOf[k] : ''}</span><span class="mono">--${A(k)}</span><span class="ktv">${sw(L[k])}${m(L[k])}</span><span class="ktv">${sw(D[k])}${m(D[k])}</span></div>`).join('');
    const px = (v) => parseFloat(v);
    const line = (k, v, draw = '', cls = '') => `<div class="ktk ktk--2${cls}"><span class="mono">--${A(k)}</span>${m(v)}${draw}</div>`;
    const fam = (id) => ctx.brand.fonts[id].family;
    const sp = Object.entries(g.space).map(([k, v]) => line(k, v, `<i class="ktd-bar" style="width:${px(v)}px"></i>`, ' ktk--d')).join('');
    const rd = Object.entries(g.radius).map(([k, v]) => line(k, v, `<i class="ktd-box" style="border-radius:${v}"></i>`, ' ktk--d')).join('');
    const wd = Object.entries(g.width).map(([k, v]) => line(k, v, `<i class="ktd-rule" style="border-top-width:${px(v)}px"></i>`, ' ktk--d')).join('');
    const ff = [['ff-display', fam('display'), 'font-family:var(--ff-display);font-weight:800'], ['ff-body', fam('body'), 'font-family:var(--ff-body)'], ['ff-mono', fam('mono'), 'font-family:var(--ff-mono)']]
      .map(([k, v, s]) => `<div class="ktk ktk--2 ktk--f"><span class="mono">--${k}</span><span>${A(v)}</span><span class="ktd-f" style="${s}">Aa</span></div>`).join('');
    const tx = ctx.uiType.map((t) => `<div class="ktk ktk--2 ktk--t"><span class="mono">${A(t.token)}</span>${m(`${t.size} / ${t.line} / ${t.weight}`)}<span class="ktd-t" style="font:${t.weight} ${t.size}px/${t.line}px var(--ff-${t.face === 'display' ? 'display' : 'body'})${t.face === 'display' ? ';letter-spacing:-0.01em' : ''}">Ag</span></div>`).join('');
    const pal = ctx.colours.map((c) => `<div class="ktk ktk--2"><span class="mono">--palette-${A(c.id)}</span><span class="ktv">${sw(c.hex)}${m(c.hex)}</span></div>`).join('');
    const pn = (...ids) => ids.map((i) => ctx.pageNo(i)).join(', ');
    const G = (t, inner, ref) => `<div class="ktg"><h2 class="kh2"><span class="kbub"></span>${A(t)}<span class="kh2-s">${A(ref)}</span></h2>${inner}</div>`;
    const head = '<div class="ktk ktk--h"><span>Key</span><span></span><span>Light</span><span>Dark</span></div>';
    return kstd(ctx, 'tokens', `<div class="ktokens"><div>${G('Colour, light then dark', `${head}${col}`, `Sheets ${pn('colour-light', 'colour-dark')}`)}</div><div>${G('Space', sp, `Sheet ${pn('spacing')}, drawn at 1×`)}${G('Radius', rd, `Sheet ${pn('radii-borders')}`)}${G('Border width', wd, `Sheet ${pn('radii-borders')}`)}${G('Fonts', ff, `Sheet ${pn('type-scale')}`)}${G('Type, size / line / weight', tx, `Sheet ${pn('type-scale')}`)}${G('Shadow', line('shadow-float', g.shadow['shadow-float']), `Sheet ${pn('elevation')}`)}</div></div><div class="ktpal">${G('Palette', `<div class="ktpal-g">${pal}</div>`, `Feeds the roles on sheets ${pn('colour-light', 'colour-dark')}`)}</div>`);
  },

  // the package as a drawing register: one ruled row a file, with a mark and the sheets that draw what it holds
  code(ctx) {
    const F = sc(ctx).form;
    const fonts = [...new Set(ctx.faces.map((f) => f.family))].join(', ');
    const n = (id) => ctx.pageNo(id);
    const tok = `${n('colour-light')}–${n('elevation')}, ${n('tokens')}`;
    const comp = `${n('buttons')}–${n('empty')}`;
    const files = [
      ['README.md', 'Install, use, token naming, light and dark, accessibility notes.', `Sheet ${n('code')}`], ['tokens.css', 'Custom properties. Light on :root, dark on [data-theme="dark"] and on the system setting.', `Sheets ${tok}`],
      ['tokens.json', 'The same tokens in the W3C design token format, with a dark value on each colour.', `Sheet ${n('tokens')}`], ['tokens.ts', 'A typed export of the same values.', `Sheet ${n('tokens')}`],
      ['tailwind.css', 'A Tailwind CSS v4 @theme block mapped to the tokens.', `Sheet ${n('tokens')}`], ['components.css', 'Classes for every component in this kit, built only on the tokens.', `Sheets ${comp}`],
      ['example.html', 'Every component live, with a light and dark switch.', `Sheets ${comp}`], ['fonts.css', `@font-face rules for ${fonts}.`, `Sheet ${n('type-scale')}`],
      ['assets/', `The logo, ${iconSet(ctx).length} icons and the font files.`, 'Cover'],
    ].map(([f, d, s], i) => `<div class="kfile"><span class="kfm">F${i + 1}</span><span class="mono">${A(f)}</span><span>${A(d)}</span><span class="kfs">${A(s)}</span></div>`).join('');
    const reg = `<div class="kfh"><span>Mark</span><span>File</span><span>Holds</span><span>Drawn on</span></div><div class="kfiles">${files}</div>`;
    const code = `<link rel="stylesheet" href="fonts.css">
<link rel="stylesheet" href="tokens.css">
<link rel="stylesheet" href="components.css">

<body class="ui">
  <button class="ui-btn" type="button">
    ${F.book}
  </button>
</body>`;
    const tw = `@import "tailwindcss";
@import "./tokens.css";
@import "./tailwind.css";`;
    // a code block measured: padding 14 top and bottom, 16 left, a line 18.7 (11 at 1.7). side: where the vertical chain sits
    const block = (t, c, side) => {
      const lines = c.split('\n').length, h = 28 + lines * 18.7, last = Math.round((h - 14) * 10) / 10;
      const x = 'calc(100% + 10px)', down = side === 'i' ? `${vs([[14], [18.7]], 0, x, 'r')}${vs([[14]], last, x, 'r')}` : `${vs([[14]], 0, x, 'r')}${vs([[14]], last, x, 'r')}`;
      return grp(t, dm(`<pre class="ui kcode" data-theme="dark"><code>${A(c)}</code></pre>`, `${rh('left:0;top:-14px;width:16px', 16)}${down}`, 'kdm--b', 'margin-top:26px'));
    };
    const l = rules([`Plain CSS, no framework. Copy the folder, link three stylesheets, and put class ${m('ui')} on the body.`, `Colour tokens name a job: ${m('--surface')}, ${m('--text')}, ${m('--action')}. Dark swaps the values and leaves the names.`, `Controls are real elements. State is carried by ${m('disabled')}, ${m('aria-invalid')}, ${m('aria-pressed')} and ${m('aria-current')}.`]);
    return kstd(ctx, 'code', `${grp('Drawing register: the package', reg)}<div class="kgap"></div><div class="kcodes"><div>${block('Install', code, 'i')}</div><div class="kstack">${block('Dark mode', '<html data-theme="dark">', 'o')}${block('Tailwind v4', tw, 'o')}</div></div><div class="kgap"></div>${l}`, { lead: 'One folder, three stylesheets. Nothing to build and nothing to install.' });
  },

  // @@END pages
};
