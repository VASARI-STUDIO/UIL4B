// UI kit document pages for theme 01 (25 ids, see engine/pages.js UIKIT_PAGES). Every component is the real engine component (ctx.ui),
// so the page shows what components.css ships; states are forced with the .is-* classes. Styles are in css-kit.js.
import { A, ratioText } from './helpers.js';
import { colourMap, tokenGroups, statusText } from '../../engine/tokens.js';

const m = (s) => `<span class="mono">${A(s)}</span>`;
const rt = (ctx, a, b) => ratioText(ctx.fmt(ctx.ratio(a, b)));
const px = (n) => `${n} px`;
// every page is one slide: the stage (the component, large, mostly empty) on top, and a foot with the title in the display face
// bottom left and the page's rules set small in columns beside it. The page body is a .ui region, so the chrome reads the kit tokens.
const kstd = (ctx, id, stage, cls = '', foot = '') => {
  const p = ctx.pages.find((x) => x.id === id);
  const head = `<div class="hd"><span>${p.ref ? `<b class="num">${p.ref}</b>` : ''}${A(p.title)}</span><span>${A(ctx.brand.name)} UI kit</span></div>`;
  return `<section class="pg pg--std pg--kit ${cls}" data-page="${id}">${head}<div class="ui kbody"><div class="kstage">${stage}</div><div class="kfoot"><h2 class="disp kft">${A(p.title)}</h2>${foot}</div></div><span class="fo">${ctx.pageNo(id)}</span></section>`;
};
const rules = (items) => `<div class="krules" style="--n:${items.length}">${items.map((t) => `<p class="krule">${t}</p>`).join('')}</div>`;
const grp = (title, inner, cls = '') => `<div class="kg ${cls}"><h3>${A(title)}</h3>${inner}</div>`;
// a framed slide holding one specimen, caption under it
const cell = (inner, cap, sub) => `<div class="kcell"><div class="kfr">${inner}</div>${cap ? `<span class="kcap"><b>${A(cap)}</b>${sub || ''}</span>` : ''}</div>`;
// a build sequence: frames left to right, an arrow between each
const arrow = (ctx) => `<span class="kseq-a" aria-hidden="true">${ctx.ui.icon('arrow-right', 16)}</span>`;
const step = (head, sub, body) => `<div class="ksf"><div class="ksf-h"><b>${A(head)}</b>${sub ? `<span class="kcap">${sub}</span>` : ''}</div><div class="ksf-b">${body}</div></div>`;
const seq = (ctx, frames, cls = '') => `<div class="kseq ${cls}">${frames.join(arrow(ctx))}</div>`;
const lab = (t, inner) => `<div class="kl"><span class="kl-t">${A(t)}</span>${inner}</div>`;
const na = (t = 'Not used') => `<span class="kna">${A(t)}</span>`;
const uniq = (html, tag) => html.replace(/dlg-t/g, tag);
const sc = (ctx) => ctx.brand.ui.screen.content;
const actionColour = (ctx) => ctx.colours.find((c) => c.role === 'action');
const textColour = (ctx) => ctx.colours.find((c) => c.role === 'text');
const ground = (ctx) => ctx.colours.find((c) => c.role === 'ground');

// ---- colour roles, one list for light and dark: [label, token, swatch bg, swatch fg, swatch ring, ratio fg, ratio bg, note]
function roleRows(ctx, mode) {
  const M = colourMap(ctx, mode);
  const R = (a, b) => rt(ctx, M[a], M[b]);
  const g = (label, tok, note, on) => [label, tok, M[tok], M.text, '', R('text', tok), note];
  const t = (label, tok, bgTok, note) => [label, tok, M[bgTok], M[tok], '', R(tok, bgTok), note];
  const st = (label, tok) => [label, tok, M.surface, M[tok], '', R(tok, 'surface'), 'Words on the page ground'];
  return [
    g('Surface', 'surface', 'Text on it'), g('Raised', 'raised', 'Text on it'), g('Sunken', 'sunken', 'Text on it'),
    t('Text', 'text', 'surface', 'On surface'), t('Soft text', 'text-soft', 'surface', 'On surface'), t('Quiet text', 'quiet', 'surface', 'On surface'),
    t('Quiet on sunken', 'quiet-sunken', 'sunken', 'On sunken'),
    ['Control edge', 'edge', M.surface, M.text, `box-shadow:inset 0 0 0 var(--w-control) ${M.edge}`, R('edge', 'surface'), 'On surface'],
    ['Divider', 'divider', M.surface, M.text, `box-shadow:inset 0 -1px 0 ${M.divider}`, R('divider', 'surface'), 'Decoration'],
    ['Focus ring', 'focus', M.surface, M.text, `box-shadow:inset 0 0 0 2px ${M.focus}`, R('focus', 'surface'), 'On surface'],
    ['Action', 'action', M.action, M['action-label'], '', R('action', 'surface'), 'Fill on surface'],
    ['Action hover', 'action-hover', M['action-hover'], M['action-label'], '', R('action-label', 'action-hover'), 'Label on it'],
    ['Action pressed', 'action-pressed', M['action-pressed'], M['action-label'], '', R('action-label', 'action-pressed'), 'Label on it'],
    ['Action label', 'action-label', M.action, M['action-label'], '', R('action-label', 'action'), 'On action'],
    ['Disabled text', 'disabled-text', M['disabled-bg'], M['disabled-text'], '', R('disabled-text', 'disabled-bg'), 'On --disabled-bg'],
    ['Scrim', 'scrim', M.scrim, M.scrim, '', null, 'Behind dialogs'],
    st('Success', 'success'), st('Warning', 'warning'), st('Danger', 'danger'), st('Info', 'info'),
  ].map(([label, tok, bg, fg, ring, ratio, note]) => ({ label, tok, val: M[tok], bg, fg, ring, ratio, note }));
}
// one role = one small slide filled with the role's pair: the name in the display face bottom left, the token and ratio along the top,
// the value and what it is measured on along the foot. A scrim has no text pair, so its words take the surface colour.
const roleTile = (r, M, ctx) => `<div class="kroles-t" style="background:${r.bg};color:${r.tok === 'scrim' ? (ctx.ratio(M.surface, M.scrim) > ctx.ratio(M.text, M.scrim) ? M.surface : M.text) : r.fg};${r.ring}"><span class="krt-top">${m('--' + r.tok)}<b class="num">${r.ratio || 'Overlay'}</b></span><span class="disp krt-name">${A(r.label)}</span><span class="krt-foot">${m(r.val)}<span>${A(r.note)}</span></span></div>`;

function colourPage(ctx, id, mode) {
  const M = colourMap(ctx, mode);
  const rows = roleRows(ctx, mode).map((r) => roleTile(r, M, ctx)).join('');
  const dark = mode === 'dark';
  const intro = rules([
    `Roles name a job, not a colour. Components read ${m('--action')}, never a palette name, so ${dark ? 'dark' : 'light'} changes nothing in the markup.`,
    'Every text pair is measured. Text under 24 px needs 4.5 : 1. Edges, the focus ring and fills against their ground need 3 : 1. The -bg tints are for highlights and charts, never under text.',
    dark ? `Dark keeps ${actionColour(ctx).name}. The label stays ${textColour(ctx).name}, so a button reads the same in both.` : `${actionColour(ctx).name} is the action and the live status. Nothing else is allowed to use it.`,
  ]);
  const panel = `<div class="ui kband ${dark ? 'kband--dark' : ''}" ${dark ? 'data-theme="dark"' : ''}><div class="kroles">${rows}</div></div>`;
  return kstd(ctx, id, panel, `pg--kroles ${dark ? 'is-dark' : ''}`, intro);
}

// ---- screens
const wordmark = (ctx) => `<strong class="ui-display">${A(ctx.brand.logo.showcase.wordmark)}</strong>`;
const navItems = [['Track', 'map-pin'], ['Book', 'plus'], ['History', 'clock'], ['Account', 'user']];
const progress = (S) => `<div class="ui-progress" role="progressbar" aria-label="Delivery progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(S.progress * 100)}"><div class="ui-progress__bar"><i style="width:${S.progress * 100}%"></i></div><span class="ui-progress__dot" style="left:${S.progress * 100}%"></span></div><div class="ks-route"><span>${A(S.from)}</span><span>${A(S.to)}</span></div>`;
const riderRow = (ctx, S) => `<div class="ks-rider"><span class="ui-avatar">${A(S.initials)}</span><div class="ks-rmain"><p class="ks-rname">${A(S.rider)}</p><p class="ks-rsub">${A(S.riderNote)}</p></div>${ctx.ui.btn(S.call, { variant: 'secondary', size: 'sm', iconLeft: 'phone' })}</div>`;
const detailRows = (S) => `<dl class="ks-detail"><div><dt>${A(S.deliverToLabel)}</dt><dd>${A(S.deliverTo)}</dd></div><div><dt>${A(S.paidLabel)}</dt><dd class="ui-num">${A(S.paid)}</dd></div></dl>`;

function desktopScreen(ctx, dark) {
  const S = sc(ctx), ui = ctx.ui;
  const frame = `<div class="ui kscreen" ${dark ? 'data-theme="dark"' : ''}>
<nav class="ui-topbar" aria-label="Main">${wordmark(ctx)}<div class="ui-topbar__links">${ui.links(navItems.slice(0, 3), 0)}</div><span class="ks-clock ui-num">${A(S.time)}</span></nav>
<div class="ks-main">
<section class="ks-track" aria-label="${A(ctx.brand.ui.screen.title)}">
<p class="ks-title">${A(ctx.brand.ui.screen.title)}</p>
<div class="ks-eta"><h2 class="ui-display ks-time">${A(S.eta)}</h2>${ui.statusChip('on-the-way')}</div>
<p class="ks-pickup">${A(S.pickup)}</p>
<div class="ks-prog">${progress(S)}</div>
${riderRow(ctx, S)}
${detailRows(S)}
${ui.btn(S.share, { variant: 'secondary', block: true })}
</section>
<section class="ks-deliv" aria-label="Deliveries"><p class="ks-title">Deliveries</p>${ui.deliveryRows(4)}<div class="ks-book">${ui.btn(S.form.book, { iconRight: 'arrow-right' })}</div></section>
</div></div>`;
  return frame;
}

function phoneScreen(ctx) {
  const S = sc(ctx), ui = ctx.ui;
  return `<div class="ui kphone">
<div class="kph-top"><span class="ui-num">${A(S.time)}</span>${wordmark(ctx)}</div>
<div class="kph-body">
<span class="kph-chip">${ui.statusChip('on-the-way')}</span>
<h2 class="ui-display kph-time">${A(S.eta)}</h2>
<p class="ks-pickup">${A(S.pickup)}</p>
<div class="ks-prog">${progress(S)}</div>
${riderRow(ctx, S)}
${detailRows(S)}
${ui.btn(S.share, { variant: 'secondary', block: true })}
</div>
<nav class="ui-tabbar" aria-label="Sections">${navItems.map(([t, i], k) => `<a href="#"${k === 0 ? ' aria-current="page"' : ''}>${ui.icon(i, 20)}${A(t)}</a>`).join('')}</nav>
</div>`;
}

export const uikit = {
  cover(ctx) {
    const B = ctx.brand, rev = B.logo.colourways.reversed, slot = ctx.edition === 'slot';
    const mark = slot ? `<span class="disp kc-name">${A(B.name)}</span>${ctx.logo.html('colour', { width: 220, color: rev.name, label: 'Your logo goes here' })}` : ctx.logo.html('reversed', { width: 640 });
    // a title slide: the logo centred alone on its ground
    return `<section class="pg pg--kcover" data-page="cover">
<div class="kc-top"><span>${A(B.name)} UI kit</span><span class="num">${A(ctx.versionLine)}</span></div>
<div class="kc-mid">${mark}</div>
<p class="kc-line">${A(B.product)}</p>
</section>`;
  },

  // the slide sorter: each section a small slide, its pages listed under it
  contents(ctx) {
    const tiles = ctx.sections.map((s) => `<li class="kct"><div class="kct-s"><span class="disp kct-n num">${s.n}</span><span class="disp kct-t">${A(s.title)}</span></div><ul class="kct-l">${s.pages.map((p) => `<li><span>${A(p.title)}</span><span class="num">${p.no}</span></li>`).join('')}</ul></li>`).join('');
    return kstd(ctx, 'contents', `<ol class="kct-g">${tiles}</ol>`, 'pg--contents');
  },

  'colour-light': (ctx) => colourPage(ctx, 'colour-light', 'light'),
  'colour-dark': (ctx) => colourPage(ctx, 'colour-dark', 'dark'),

  'type-scale'(ctx) {
    const S = sc(ctx), F = S.form, B = ctx.brand;
    const sample = { caption: F.notesHelp, label: F.pickup, body: S.pickup, control: F.book, 'title-s': S.dialog.title, title: S.rider, headline: S.eta };
    const stretch = B.fonts.display.stretch || 100;
    // a slide for the two faces, then one slide per style at its true size with the spec in the slide's foot
    const faces = `<div class="kts-t kts-t--face"><span class="disp kts-fd" style="font-family:var(--ff-display);font-stretch:${stretch}%">${A(B.fonts.display.family)}</span><span class="kts-fb">${A(B.fonts.body.family)}</span></div>`;
    const rows = faces + [...ctx.uiType].reverse().map((t) => {
      const face = t.face === 'display' ? `font-family:var(--ff-display);font-stretch:${stretch}%;letter-spacing:-0.01em;` : 'font-family:var(--ff-body);';
      return `<div class="kts-t"><span class="kts-s" style="${face}font-size:${t.size}px;line-height:${t.line}px;font-weight:${t.weight}">${A(sample[t.token] || t.use)}</span><span class="kts-f"><span class="mono">${A(t.token)}</span><span class="mono">${t.size} / ${t.line} / ${t.weight}</span><span class="kcap">${A(t.use)}</span></span></div>`;
    }).join('');
    const l = rules([
      `${A(B.fonts.display.family)} for the live status and titles. ${A(B.fonts.body.family)} for everything people read.`,
      'Sizes are in px, then line height in px, then weight. Numbers that change use tabular figures, so a time never shifts.',
      'Nothing on screen is smaller than 12 px.',
    ]);
    return kstd(ctx, 'type-scale', `<div class="kts-g">${rows}</div>`, '', l);
  },

  spacing(ctx) {
    const uses = ['Inside a tight pair', 'Icon to label', 'Gaps in a row, field padding', 'Card padding', 'Dialog padding, button sides', 'Empty state padding', 'Between groups', 'Between sections'];
    // the scale as a staircase: each step a square at its true size, left to right
    const rows = ctx.space.map((s, i) => `<div class="ksc"><span class="ksq"><i style="width:${s.px}px;height:${s.px}px"></i></span><span class="mono">--${s.token.replace('space-', 'sp-')}</span><span class="mono">${s.px} px</span><span class="kcap">${A(uses[i] || '')}</span></div>`).join('');
    const l = rules([
      `Everything sits on a ${ctx.brand.ui.spacingBase} px step. A gap inside a group is smaller than the gap between groups, so grouping reads at a glance.`,
      'Controls are 44 px tall, which is eleven steps. Small buttons are 36 px.',
    ]);
    return kstd(ctx, 'spacing', `<div class="kstair">${rows}</div>`, '', l);
  },

  'radii-borders'(ctx) {
    const S = sc(ctx), ui = ctx.ui, [rc, rk, rr] = ctx.radii, [bh, bc, bf] = ctx.borders;
    const rad = [
      cell(ui.btn(S.form.book), `${rc.token}, ${rc.px} px`, rc.use),
      cell(`<div class="ksp-card">${ui.card({ meta: S.status, title: S.rider, text: S.riderNote })}</div>`, `${rk.token}, ${rk.px} px`, rk.use),
      cell(`<div class="krow2"><span class="ui-avatar">${A(S.initials)}</span>${ui.switch('Text me', { checked: true })}</div>`, `${rr.token}, round`, rr.use),
    ].join('');
    const bor = [
      cell(`<ul class="ui-list kw">${ui.row({ title: S.deliverTo, sub: S.pickup.split(' from')[0], end: S.paid })}</ul>`, `${bh.token}, ${bh.px} px`, bh.use),
      cell(ui.field({ id: 'rb1', label: S.form.pickup, value: S.form.pickupValue }), `${bc.token}, ${bc.px} px`, bc.use),
      cell(ui.field({ id: 'rb2', label: S.form.dropoff, value: S.form.dropoffValue, state: 'focus' }), `${bf.token}, ${bf.px} px`, bf.use),
    ].join('');
    const l = rules([
      `Controls take a ${rc.px} px radius and cards ${rk.px}. Round is for avatars and switches only.`,
      `Control edges are ${bc.px} px so they hold against the ground. Dividers stay at ${bh.px} px.`,
      'The focus ring sits outside the edge, on a 2 px gap of the ground colour, so it shows on any fill.',
    ]);
    return kstd(ctx, 'radii-borders', `<div class="kstack">${grp('Radius', `<div class="k3">${rad}</div>`)}${grp('Border width', `<div class="k3">${bor}</div>`)}</div>`, '', l);
  },

  elevation(ctx) {
    const S = sc(ctx), ui = ctx.ui;
    const R = ctx.roles.light;
    const steps = [['Surface', 'surface', R.surface, 'The page and every card on it'], ['Raised', 'raised', R.raised, 'Raised cards, sidebars, table headers'], ['Sunken', 'sunken', R.sunken, 'Avatars, skeletons']]
      .map(([n, t, c, u]) => `<div class="kstep"><span class="kstep-sw" style="background:var(--${t})"></span><span class="kcap"><b>${A(n)}</b>${m('--' + t)}<br>${A(u)}</span></div>`).join('');
    const dlg = uniq(ui.dialog({ title: S.dialog.title, body: S.dialog.body, confirm: S.dialog.confirm, keep: S.dialog.keep, danger: true }), 'dlg-el');
    const l = rules([A(ctx.brand.ui.elevationNote), `${m('--shadow-float')} is ${m(String(tokenGroups(ctx).shadow['shadow-float']))}. There is no blur, no spread and no glow anywhere in the kit.`, 'Depth is three things only: a step in the ground, a hairline, or a control edge.']);
    // depth as a build sequence: a step in the ground, then a hairline, then a floating dialog
    const g1 = step('Ground steps', '', `<div class="kstepl">${steps}</div>`);
    const g2 = step('Hairline', '', `<div class="kcell">${ui.card({ meta: S.status, title: S.eta, text: S.pickup })}<span class="kcap"><b>Card</b>${m('--divider')} at ${ctx.borders[0].px} px. Raised cards drop the line.</span></div>`);
    const g3 = step('Floating', '', `<div class="kcell">${dlg}<span class="kcap"><b>Dialog</b>${ctx.borders[1].px} px edge in ${m('--text')}, on a ${m('--scrim')} ground.</span></div>`);
    return kstd(ctx, 'elevation', seq(ctx, [g1, g2, g3], 'kelev'), '', l);
  },

  states(ctx) {
    const S = sc(ctx), ui = ctx.ui, F = S.form;
    const R = ctx.roles.light;
    const cols = [
      ['Rest', ''], ['Hover', `Action steps to ${m('--action-hover')}. Outlined controls fill ${m('--sunken')}.`], ['Focus', `A ${ctx.borders[2].px} px ring in ${m('--focus')}, on a ${ctx.borders[2].px} px gap.`],
      ['Pressed', `Action goes to ${m('--action-pressed')} and the control scales to 0.97.`], ['Disabled', `${m('--disabled-bg')} fill, ${m('--disabled-text')} type. The reason sits beside it.`], ['Error', `${m('--danger')} edge and a message under the field.`],
    ];
    const btn = (variant, label) => (st) => ui.btn(label, { variant, state: st });
    const field = (st, id) => ui.field({ id, label: F.ready, value: F.readyValue, state: st });
    const items = [
      ['Primary button', [undefined, 'hover', 'focus', 'pressed', 'disabled'].map(btn('primary', F.book)).concat(na())],
      ['Secondary button', [undefined, 'hover', 'focus', 'pressed', 'disabled'].map(btn('secondary', 'Track')).concat(na())],
      ['Text field', [field(undefined, 'st-r'), na('No change'), field('focus', 'st-f'), na(), ui.field({ id: 'st-d', label: F.ready, value: F.readyValue, disabled: true }), ui.field({ id: 'st-e', label: F.ready, value: F.readyValue, error: 'Enter a time before 10:00.' })]],
      ['Checkbox', [ui.check('Fragile'), na('No change'), ui.check('Fragile', { state: 'focus' }), na(), ui.check('Fragile', { disabled: true }), na()]],
      ['Switch', [ui.switch('Text me', { checked: true }), na('No change'), ui.switch('Text me', { checked: true, state: 'focus' }), na(), ui.switch('Text me', { disabled: true }), na()]],
    ];
    // the states as a build sequence, rest to error, left to right: one frame per state, the five parts stacked inside it
    const frames = cols.map(([n, r], j) => step(n, r, items.map(([name, cells]) => lab(name, cells[j])).join('')));
    return kstd(ctx, 'states', seq(ctx, frames, 'kseq--states'));
  },

  buttons(ctx) {
    const S = sc(ctx), F = S.form, ui = ctx.ui, R = ctx.roles.light;
    const act = actionColour(ctx), txt = textColour(ctx), gnd = ground(ctx), ctl = ctx.uiType.find((t) => t.token === 'control');
    const padPx = ctx.space[4].px, H = 44, rad = ctx.brand.ui.radius.control, Z = 2;
    const l = rules([
      `One ${act.name} button per screen. It books, pays or calls a rider, and its label says which.`,
      `${txt.name} type on ${act.name}, always. ${gnd.name} type on ${act.name} is ${rt(ctx, R.surface, R.action)}, which is for 24 px type and over, never a button.`,
      'Labels are verbs: Book rider, Pay $18.50, Track. Never Submit or OK.',
      `A disabled button says why beside it: ${F.bookWhy}`,
    ]);
    const draw = `<div class="kdraw">
<span class="kd" style="left:48px;top:20px;width:${padPx * Z}px;height:1px"></span><span class="kd" style="left:48px;top:16px;width:1px;height:9px"></span><span class="kd" style="left:${47 + padPx * Z}px;top:16px;width:1px;height:9px"></span>
<span class="kd-v mono" style="left:${48 + padPx * Z / 2 - 8}px;top:-2px">${padPx}</span>
<span class="kd" style="left:24px;top:36px;width:1px;height:${H * Z}px"></span><span class="kd" style="left:20px;top:36px;width:9px;height:1px"></span><span class="kd" style="left:20px;top:${35 + H * Z}px;width:9px;height:1px"></span>
<span class="kd-v mono" style="left:0;top:${36 + H * Z / 2 - 8}px">${H}</span>
<div class="kzoom" style="left:24px;top:18px">${ui.btn(F.book)}</div>
<span class="kcap" style="position:absolute;left:48px;top:${48 + H * Z}px">Drawn at 2&times;. Measurements are at 1&times;.</span>
</div>`;
    const spec = `<div class="kspec"><span>Height ${m(H)}, padding ${m(padPx)}, radius ${m(rad)}</span><span>${A(ctx.brand.fonts.body.family)} ${ctl.weight}, ${m(ctl.size)} px</span><span>${A(act.name)} ${m(act.hex)}, ${A(txt.name)} type ${rt(ctx, R.actionLabel, R.action)}</span><span>Width follows the label</span></div>`;
    const states = [
      [ui.btn(F.book), 'Default', `${A(act.name)} fill, ${A(txt.name)} type.`], [ui.btn(F.book, { state: 'hover' }), 'Hover', `${m(R.actionHover)}, ${A(txt.name)} type ${rt(ctx, R.actionLabel, R.actionHover)}.`],
      [ui.btn(F.book, { state: 'focus' }), 'Focus', '2 px ring on a 2 px gap.'], [ui.btn(F.book, { state: 'pressed' }), 'Pressed', `${m(R.actionPressed)}, scaled to 0.97.`],
      [ui.btn(F.book, { state: 'disabled' }), 'Disabled', `${m('--disabled-bg')} fill, quiet type.`],
    ].map(([b, n, d]) => `<div class="kst"><div class="kfr">${b}</div><b>${n}</b><p>${d}</p></div>`);
    const bcell = (inner, cap, sub) => `<div class="kcell">${inner}<span class="kcap"><b>${A(cap)}</b>${sub}</span></div>`;
    const variants = [
      bcell(ui.btn('Track', { variant: 'secondary' }), 'Secondary', `${ctx.borders[1].px} px ${A(txt.name)} edge.`), bcell(ui.btn('Skip', { variant: 'quiet' }), 'Quiet', 'Underlined, no fill.'), bcell(ui.btn('Cancel pickup', { variant: 'danger' }), 'Danger', 'Only for what cannot be undone.'),
      bcell(ui.btn('Track', { size: 'sm', variant: 'secondary' }), 'Small, 36', 'Inside rows and cards.'), bcell(ui.btn(F.book, { size: 'lg', iconRight: 'arrow-right' }), 'Large, 52', 'One per screen, at most.'),
    ].join('');
    return kstd(ctx, 'buttons', `<div class="kbtn"><div class="kbtn-l">${draw}${spec}</div><div class="kstack">${seq(ctx, states, 'kseq--btn')}<div class="k5 k5--v">${variants}</div></div></div>`, '', l);
  },

  inputs(ctx) {
    const S = sc(ctx), F = S.form, ui = ctx.ui;
    const heads = ['Rest', 'Focus', 'Filled', 'Error', 'Disabled'];
    const f = (o) => ui.field(o);
    const sel = (id, st, extra = {}) => f({ id, label: F.size, kind: 'select', options: F.sizes, value: F.sizes[1], state: st, ...extra });
    const cells = [
      f({ id: 'in-t1', label: F.pickup, placeholder: 'Street and number' }), f({ id: 'in-t2', label: F.pickup, state: 'focus', value: '88 Brun' }), f({ id: 'in-t3', label: F.pickup, value: F.pickupValue }),
      f({ id: 'in-t4', label: F.ready, value: F.readyValue, error: F.readyError }), f({ id: 'in-t5', label: F.pickup, value: F.pickupValue, disabled: true }),
      sel('in-s1'), sel('in-s2', 'focus'), sel('in-s3', undefined, { value: F.sizes[2] }), sel('in-s4', undefined, { error: 'Choose a parcel size.' }), sel('in-s5', undefined, { disabled: true }),
      f({ id: 'in-a1', label: F.notes, kind: 'textarea', help: F.notesHelp }), f({ id: 'in-a2', label: F.notes, kind: 'textarea', state: 'focus', value: 'Level 2, ring the bell.' }), f({ id: 'in-a3', label: F.notes, kind: 'textarea', value: 'Level 2, ring the bell.' }),
      f({ id: 'in-a4', label: F.notes, kind: 'textarea', error: 'Keep notes under 200 characters.', value: 'Level 2, ring the bell.' }), f({ id: 'in-a5', label: F.notes, kind: 'textarea', disabled: true, value: 'Level 2, ring the bell.' }),
    ];
    // the five states as a build sequence: each frame holds the text field, the select and the text area in that state
    const frames = heads.map((h, j) => step(h, '', [0, 1, 2].map((r) => `<div class="kcell">${cells[r * 5 + j]}</div>`).join('')));
    const foot = rules(['The label is always visible and sits above the field. A hint sits under it and turns into the error when there is one.', `An error says what to enter, not what went wrong: ${A(F.readyError)}`]);
    return kstd(ctx, 'inputs', seq(ctx, frames, 'kseq--inputs'), '', foot);
  },

  choices(ctx) {
    const ui = ctx.ui, F = sc(ctx).form;
    const heads = ['Off', 'On', 'Focus', 'Disabled', 'Disabled, on'];
    const chk = (label, type, name) => [ui.check(label, { type, name: name + 1 }), ui.check(label, { type, name: name + 2, checked: true }), ui.check(label, { type, name: name + 3, state: 'focus', checked: true }), ui.check(label, { type, name: name + 4, disabled: true }), ui.check(label, { type, name: name + 5, disabled: true, checked: true })];
    const sw = [ui.switch('Text me'), ui.switch('Text me', { checked: true }), ui.switch('Text me', { state: 'focus', checked: true }), ui.switch('Text me', { disabled: true }), ui.switch('Text me', { disabled: true, checked: true })];
    const rows = [['Checkbox', chk('Fragile', 'checkbox', 'cb')], ['Radio', chk('Cargo bike', 'radio', 'rd')], ['Switch', sw]];
    // off, on, focus, disabled as a build sequence; the segmented control sits below it
    const frames = heads.map((h, j) => step(h, '', rows.map(([n, cs]) => lab(n, cs[j])).join('')));
    const seg = `<div class="kseg">${cell(ui.segmented(F.sizes, 1), 'Segmented', 'One choice, always one selected. Selected fills with the text colour.')}${cell(ui.segmented(F.sizes, 0, { disabled: true }), 'Segmented, disabled', 'All segments grey together.')}</div>`;
    return kstd(ctx, 'choices', `<div class="kfull">${seq(ctx, frames, 'kseq--choices')}${seg}</div>`);
  },

  cards(ctx) {
    const S = sc(ctx), ui = ctx.ui;
    const media = ctx.photo('evening', { cls: 'ui-card__media' });
    const cards = [
      cell(ui.card({ media, meta: S.status, title: S.eta, text: S.pickup, action: `<div class="kcard-act">${ui.btn('Track', { variant: 'secondary', size: 'sm' })}</div>` }), 'With media', 'The photo takes 16 : 9 and the card keeps its hairline.'),
      cell(ui.card({ meta: S.status, title: S.rider, text: S.riderNote }), 'Without media', 'Meta, title, one line.'),
      cell(ui.card({ meta: S.deliverToLabel, title: S.deliverTo, text: S.eta, raised: true }), 'Raised', `${m('--raised')} ground and no edge, for a second level.`),
      cell(`<div class="kstats">${ui.stat(S.paid, S.paidLabel)}${ui.stat('10:52', 'Picked up')}</div>`, 'Stat', 'One number, one label.'),
    ].join('');
    return kstd(ctx, 'cards', `<div class="kfull kcards">${cards}</div>`);
  },

  navigation(ctx) {
    const ui = ctx.ui, S = sc(ctx);
    const top = `<nav class="ui-topbar ktop" aria-label="Main">${wordmark(ctx)}<div class="ui-topbar__links">${ui.links(navItems.slice(0, 3), 0)}</div></nav>`;
    const side = `<nav class="ui-sidebar" aria-label="Sections">${ui.links(navItems, 0)}</nav>`;
    const bar = `<nav class="ui-tabbar" aria-label="Sections">${navItems.map(([t, i], k) => `<a href="#"${k === 0 ? ' aria-current="page"' : ''}>${ui.icon(i, 20)}${A(t)}</a>`).join('')}</nav>`;
    const tabs = ui.tabs(['Today', 'Booked', 'Past'], 0);
    const crumbs = ui.crumbs(['Deliveries', 'Today', S.deliverTo]);
    const g = (t, inner, cap, flush) => grp(t, `<div class="kfr${flush ? ' kfr--flush' : ''}">${inner}</div><span class="kcap kcap--after">${cap}</span>`);
    return kstd(ctx, 'navigation', `<div class="knav">
<div class="kstack">${g('Top bar', top, `The current page has a 3 px bar in ${actionColour(ctx).name} under it. Links are 44 px tall.`, true)}${g('Tabs', tabs, 'Tabs switch views of the same list. They do not change the page.')}${g('Breadcrumbs', crumbs, 'Quiet, with the current page in full ink.')}</div>
${g('Sidebar', side, 'A bar on the left marks the current page.', true)}${g('Mobile tab bar', bar, 'Four destinations at most, 64 px tall.', true)}
</div>`);
  },

  lists(ctx) {
    const ui = ctx.ui, S = sc(ctx);
    const d = S.deliveries;
    const l = rules(['One row is one delivery. The street is the title, the time is the detail, and the status is the only colour.', 'Prices and times use tabular figures so a column lines up.', 'A row that opens is a link, and the whole row is the target.']);
    const main = grp('With a leading icon and status', ui.deliveryRows(5));
    const second = grp('Without a lead', `<ul class="ui-list">${d.slice(0, 2).map((x) => ui.row({ title: x.to, sub: x.when, end: x.price })).join('')}</ul>`);
    const third = grp('As a link', `<ul class="ui-list">${ui.row({ lead: ui.icon('package', 18), title: d[0].to, sub: d[0].when, end: d[0].price, href: '#' })}</ul>`);
    return kstd(ctx, 'lists', `<div class="klists">${main}${second}${third}</div>`, '', l);
  },

  status(ctx) {
    const meaning = { booked: 'A rider is assigned. The pickup is still to come.', 'on-the-way': `The rider has the parcel. The live state, in ${actionColour(ctx).name} where it reads as words.`, late: 'Behind the time we gave. The label names the minutes.', delivered: 'Done. The label names the time it was handed over.', failed: 'Nothing was handed over. Offer the next step beside it.' };
    const rows = ctx.status.map((s) => {
      const L = statusText(ctx, 'light', s), D = statusText(ctx, 'dark', s);
      const tok = L.token === D.token ? m(L.token) : `${m(L.token)} light, ${m(D.token)} dark`;
      // one slide per state: the words on the light ground, then on the dark, then the token, the two ratios and when to use it
      return `<div class="kstat"><span class="kstat-l"><span>${ctx.ui.statusChip(s.id)}</span><span class="krr"><b>${rt(ctx, L.hex, ctx.roles.light.surface)}</b>Light</span></span><span class="ui kdk kstat-d" data-theme="dark"><span>${ctx.ui.statusChip(s.id)}</span><span class="krr"><b>${rt(ctx, D.hex, ctx.roles.dark.surface)}</b>Dark</span></span><span class="kcap">${tok} on the page ground</span><span class="kcap kcap--ink">${A(meaning[s.id])}</span></div>`;
    });
    const l = rules(['Five states, each with plain words and a time or a count where it helps.', 'A status is words in one colour, with no fill. The ratio is the words on the page ground.', `A count badge sits on a tab or an icon: ${'<span class="ui-badge">3</span>'}`]);
    return kstd(ctx, 'status', `<div class="kstatus">${rows.join('')}</div>`, '', l);
  },

  feedback(ctx) {
    const ui = ctx.ui, S = sc(ctx);
    const alerts = grp('Alert banners', `<div class="kalerts">${ui.alert('info', S.pickup)}${ui.alert('success', S.toast)}${ui.alert('warning', S.alert)}${ui.alert('danger', S.form.readyError)}</div>`);
    const toast = grp('Toast', `<div class="kcell"><div class="kfr">${ui.toast(S.toast)}</div><span class="kcap">Bottom of the screen, gone in five seconds. Undo stays reachable by keyboard.</span></div>`);
    const inline = grp('Inline message', `<div class="kcell"><div class="kfr"><p class="ui-inline-msg">${ui.icon('info', 16)}${A(S.inline)}</p></div></div>`);
    const load = grp('Loading', `<div class="kfr"><div class="kload">${ui.spinner()}<div class="kskel">${ui.skeleton('220px')}${ui.skeleton('150px')}${ui.skeleton('180px')}</div></div></div><span class="kcap kcap--after">The spinner is for a wait under a few seconds. Longer lists get skeleton lines in the shape of the rows.</span>`);
    return kstd(ctx, 'feedback', `<div class="kfeed">${alerts}<div class="kfeed-r">${toast}${inline}${load}</div></div>`, '', rules(['Say what happened and what to do, in one or two sentences.', 'A banner stays until it is dealt with. A toast leaves by itself.', 'A banner has a 2 px edge and an icon in the tone colour. The words stay in the text colour.']));
  },

  dialog(ctx) {
    const ui = ctx.ui, S = sc(ctx);
    const a = uniq(ui.dialog({ title: 'Share tracking link', body: `Anyone with the link sees ${S.rider.split(',')[0]} until she arrives at ${S.deliverTo}.`, confirm: 'Copy link', keep: 'Close' }), 'dlg-a');
    const b = uniq(ui.dialog({ title: S.dialog.title, body: S.dialog.body, confirm: S.dialog.confirm, keep: S.dialog.keep, danger: true }), 'dlg-b');
    const l = rules(['A dialog asks one thing. The title is the question, and the buttons answer it.', 'The safe answer is on the left, and it is the one the cursor lands on.', 'Danger is for what cannot be undone. Here, cancelling is free until the rider arrives, so the button says what it does.', 'Esc and a click on the scrim close it.']);
    return kstd(ctx, 'dialog', `<div class="kdlg">${cell(`<div class="ui-scrim">${a}</div>`, 'Modal', 'One action and a way out.')}${cell(`<div class="ui-scrim">${b}</div>`, 'Confirmation', 'The danger button names the action.')}</div>`, '', l);
  },

  table(ctx) {
    const ui = ctx.ui, S = sc(ctx);
    const sortBtn = (t, dir) => `<button type="button">${A(t)}${dir ? ui.icon(dir === 'asc' ? 'arrow-up' : 'arrow-down', 14) : ''}</button>`;
    const rows = S.deliveries.map((d, i) => `<tr${i === 0 ? ' aria-selected="true"' : ''}${i === 2 ? ' class="is-hover"' : ''}><td>${A(d.to)}</td><td class="ui-num">${A(d.when)}</td><td>${ui.statusChip(d.status)}</td><td class="is-num">${A(d.price)}</td></tr>`).join('');
    const table = `<table class="ui-table"><thead><tr><th scope="col" aria-sort="ascending">${sortBtn('Deliver to', 'asc')}</th><th scope="col">${sortBtn('When')}</th><th scope="col">Status</th><th scope="col" class="is-num">${sortBtn('Price')}</th></tr></thead><tbody>${rows}</tbody></table>`;
    const l = rules(['Headers are verbs of the data, not decoration. A sortable header is a button, and the sorted one shows its direction.', 'Numbers sit right and use tabular figures.', `Row states: rest, hover on pointer devices, and selected with a 3 px ${actionColour(ctx).name} bar on the left.`]);
    const keys = `<div class="kkeys"><span class="kcap"><b>Selected</b>First row</span><span class="kcap"><b>Hover</b>Third row</span><span class="kcap"><b>Sorted</b>Deliver to, ascending</span></div>`;
    return kstd(ctx, 'table', `<div class="kstack">${table}${keys}</div>`, '', l);
  },

  empty(ctx) {
    const S = sc(ctx), F = S.form, ui = ctx.ui;
    const E = S.empty;
    const none = `<div class="ui-empty"><h3 class="ui-empty__title">${A(E.title)}</h3><p class="ui-empty__text">${A(E.body)}</p>${ui.btn(E.cta)}</div>`;
    const first = `<div class="ui-empty kfirst"><h3 class="ui-empty__title">${A(F.title)}</h3><ol class="ksteps"><li><span>1</span>${A(F.pickup)}</li><li><span>2</span>${A(F.dropoff)}</li><li><span>3</span>${A(F.ready)}</li></ol>${ui.btn(F.book, { disabled: true })}<p class="ui-help">${A(F.bookWhy)}</p></div>`;
    const l = rules(['Say what is missing and offer the one action that fixes it.', 'First-run lists what is needed, in the order it is asked.', 'The empty state sits on a raised ground with no edge, so it does not read as a card.']);
    return kstd(ctx, 'empty', `<div class="k2">${cell(none, 'Empty', 'Nothing booked yet.')}${cell(first, 'First run', 'Before the first booking.')}</div>`, '', l);
  },

  'screen-light': (ctx) => kstd(ctx, 'screen-light', `<div class="kscreen-wrap">${desktopScreen(ctx, false)}</div>`, 'pg--kscreen'),
  'screen-dark': (ctx) => kstd(ctx, 'screen-dark', `<div class="kscreen-wrap">${desktopScreen(ctx, true)}</div>`, 'pg--kscreen'),

  'screen-mobile'(ctx) {
    const p = ctx.pages.find((x) => x.id === 'screen-mobile'), S = sc(ctx);
    const states = [
      ['booked', 'Booked for 13:30', ''], ['on-the-way', S.eta, ''], ['late', 'There at 12:06', ''], ['delivered', 'Delivered', ''], ['failed', "Couldn't deliver", ''],
    ].map(([id, line, sub]) => `<div class="kstate"><span class="kstate-chip">${ctx.ui.statusChip(id)}</span><span class="ui-display kstate-line ${id === 'delivered' || id === 'failed' ? 'is-final' : ''}">${A(line)}${sub ? `<small class="ui-num">${A(sub)}</small>` : ''}</span></div>`);
    const foot = rules(['The arrival time is the headline in every state. The status word beside it says where the delivery is.', 'The rider and the Call button stay in reach of the thumb.', 'Once it is over, the last state is one large word. The status keeps the time.']);
    // the headline state by state, left to right; the phone sits on a panel on the right
    return `<section class="pg pg--kphone" data-page="screen-mobile">
<div class="kp-r"><div class="hd"><span><b class="num">${p.ref}</b>${A(p.title)}</span><span>${A(ctx.brand.name)} UI kit</span></div>
<div class="ui kbody"><div class="kstage"><div class="kg"><h3>The headline, state by state</h3>${seq(ctx, states, 'kseq--states2')}</div></div><div class="kfoot"><h2 class="disp kft">${A(p.title)}</h2>${foot}</div></div>
<span class="fo">${ctx.pageNo('screen-mobile')}</span></div>
<div class="kp-l">${phoneScreen(ctx)}<p class="kcap-d">${A(ctx.brand.ui.screen.title)}. ${A(actionColour(ctx).name)} marks the live status only.</p></div>
</section>`;
  },

  tokens(ctx) {
    const g = tokenGroups(ctx), L = colourMap(ctx, 'light'), D = colourMap(ctx, 'dark');
    const sw = (c) => `<i class="ktsw" style="background:${c}"></i>`;
    const colKeys = Object.keys(L), half = Math.ceil(colKeys.length / 2);
    const colRow = (k) => `<div class="ktk"><span class="mono">--${k}</span><span class="ktv">${sw(L[k])}${m(L[k])}</span><span class="ktv">${sw(D[k])}${m(D[k])}</span></div>`;
    const colHead = '<div class="ktk ktk--h"><span></span><span>Light</span><span>Dark</span></div>';
    const col1 = colKeys.slice(0, half).map(colRow).join(''), col2 = colKeys.slice(half).map(colRow).join('');
    const line = (k, v) => `<div class="ktk ktk--2"><span class="mono">--${k}</span>${m(v)}</div>`;
    const fam = (id) => ctx.brand.fonts[id].family;
    const sp = Object.entries(g.space).map(([k, v]) => line(k, v)).join('');
    const rd = Object.entries(g.radius).map(([k, v]) => line(k, v)).join('');
    const wd = Object.entries(g.width).map(([k, v]) => line(k, v)).join('');
    const ff = [['ff-display', fam('display')], ['ff-body', fam('body')], ['ff-mono', fam('mono')]].map(([k, v]) => `<div class="ktk ktk--2"><span class="mono">--${k}</span><span>${A(v)}</span></div>`).join('');
    const tx = ctx.uiType.map((t) => `<div class="ktk ktk--2"><span class="mono">${A(t.token)}</span>${m(`${t.size} / ${t.line} / ${t.weight}`)}</div>`).join('');
    const pal = ctx.colours.map((c) => `<div class="ktk ktk--2"><span class="mono">--palette-${A(c.id)}</span><span class="ktv">${sw(c.hex)}${m(c.hex)}</span></div>`).join('');
    const G = (t, inner) => `<div class="ktg"><h3>${A(t)}</h3>${inner}</div>`;
    // a reference sheet: four ruled columns, colour split across the first two
    return kstd(ctx, 'tokens', `<div class="ktokens"><div>${G('Colour, light then dark', `${colHead}${col1}`)}</div><div>${G('Colour, continued', `${colHead}${col2}`)}</div><div>${G('Space', sp)}${G('Radius', rd)}${G('Border width', wd)}</div><div>${G('Fonts', ff)}${G('Type, size / line / weight', tx)}${G('Palette', pal)}${G('Shadow', line('shadow-float', g.shadow['shadow-float']))}</div></div>`);
  },

  code(ctx) {
    const F = sc(ctx).form;
    const files = [
      ['README.md', 'Install, use, token naming, light and dark, accessibility notes.'], ['tokens.css', 'Custom properties. Light on :root, dark on [data-theme="dark"] and the system setting.'],
      ['tokens.json', 'The same tokens in the W3C design token format, with a dark value on each colour.'], ['tokens.ts', 'A typed export of the same values.'], ['tailwind.css', 'A Tailwind CSS v4 @theme block mapped to the tokens.'],
      ['components.css', 'Classes for every component in this kit, built only on the tokens.'], ['example.html', 'Every component live, with a light and dark switch.'], ['fonts.css', `@font-face rules for ${[...new Set(ctx.faces.map((f) => f.family))].join(', ')}.`],
      ['assets/', 'The logo, 16 icons and the font files.'],
    ].map(([n, d]) => `<div class="kfile"><span class="mono">${A(n)}</span><span>${A(d)}</span></div>`).join('');
    const code = `<link rel="stylesheet" href="fonts.css">
<link rel="stylesheet" href="tokens.css">
<link rel="stylesheet" href="components.css">

<body class="ui">
  <button class="ui-btn" type="button">${F.book}</button>
</body>`;
    const dark = `<html data-theme="dark">`;
    const tw = `@import "tailwindcss";
@import "./tokens.css";
@import "./tailwind.css";`;
    const block = (t, c) => grp(t, `<pre class="ui kcode" data-theme="dark"><code>${A(c)}</code></pre>`);
    const l = rules([`Plain CSS, no framework. Copy the folder, link three stylesheets, and put class ${m('ui')} on the body.`, `Colour tokens name a job: ${m('--surface')}, ${m('--text')}, ${m('--action')}. Dark swaps the values and leaves the names.`, `Controls are real elements. State is carried by ${m('disabled')}, ${m('aria-invalid')}, ${m('aria-pressed')} and ${m('aria-current')}.`]);
    return kstd(ctx, 'code', `<div class="kstack"><div class="kcode-row">${block('Install', code)}${block('Dark mode', dark)}${block('Tailwind v4', tw)}</div><div class="kfiles">${grp('In the package', `<div class="kfiles-g">${files}</div>`)}</div></div>`, '', l);
  },
};
