// UI kit document pages for theme 07 (Specification), run K. Same document as the guidelines: an A4 standards page, a running head with the
// section, one idea a page, ledger tables, rules numbered as cross-references (5.1.1). Every component is the engine's own (ctx.ui) so a page
// shows what components.css ships. Styles are in css-kit.js (classes start k).
import { A, mono, nameOf, issued, sectionOf } from './helpers.js';
import { colourMap, tokenGroups, statusText } from '../../engine/tokens.js';

const m = mono;
const S = (ctx) => ctx.brand.ui.screen.content;
const fm = (ctx, a, b) => ctx.fmt(ctx.ratio(a, b));
const roleColour = (ctx, r) => ctx.colours.find((c) => c.role === r);
const roleName = (ctx, r) => roleColour(ctx, r).name;  // the brand's own word for a colour, read from brand data
const refOf = (ctx, id) => ctx.pages.find((p) => p.id === id).ref;

// running head: the section on the left (the document on the cover and contents), the folio on the right
function head(ctx, id) {
  const s = sectionOf(ctx, id);
  const left = s ? `§${s.n} ${A(s.title)}` : `${A(ctx.brand.name)} UI kit ${m(ctx.brand.version.number)}`;
  return `<div class="hd"><span>${left}</span><span class="num">${ctx.pageNo(id)}</span></div>`;
}
const title = (ctx, id, lede = '') => {
  const p = ctx.pages.find((x) => x.id === id);
  return `<h1 class="t">${p.ref ? `${p.ref} ` : ''}${A(p.title)}</h1>${lede ? `<p class="lede">${lede}</p>` : ''}`;
};
// The standard kit page, written as a clause of the standard: the title carries the section number (2.1), the scope is clause 2.1.1,
// the work is a numbered Table beside a numbered Figure (.kz), further tables and figures follow full width, and the requirements
// carry on from the scope (2.1.2, 2.1.3 ...). Table and Figure numbers are filled in order of appearance, so a page never counts by hand.
//   left / right: the table(s) and figure(s) of the first zone;  flip: figure on the left;  fw: width of the narrow column
//   body: further full-width blocks after the zone;  zone2: a second zone, same shape: { left, right, flip, fw }
function kzone(z, ref) {
  if (!z || (!z.left && !z.right)) return '';
  const col = (x, c) => `<div class="${c}">${[].concat(x || []).join('')}</div>`;
  return `<div class="kz${z.flip ? ' kz--flip' : ''}" style="--fw:${z.fw || 250}px">${col(z.flip ? z.right : z.left, 'kz-a')}${col(z.flip ? z.left : z.right, 'kz-b')}</div>`;
}
function kpage(ctx, id, { lede = '', left, right, flip = false, fw = 250, zone2, body = '', rules = [], note = '', cls = '' }) {
  const ref = refOf(ctx, id);
  const scope = lede ? `<div class="ksc"><span class="num">${ref}.1</span><p><b>Scope.</b> ${lede}</p></div>` : '';
  const first = lede ? 2 : 1;
  const rl = rules.length ? `<h2 class="h3 krh">Requirements</h2><ol class="kr">${rules.map((t, i) => `<li><span class="num">${ref}.${i + first}</span><span>${t}</span></li>`).join('')}</ol>` : '';
  const work = `${kzone({ left, right, flip, fw }, ref)}${zone2 ? `<div class="ksgap"></div>${kzone(zone2, ref)}` : ''}${body ? `${left || right ? '<div class="ksgap"></div>' : ''}${body}` : ''}`;
  let html = `<section class="pg pg--std pg--k ${cls}" data-page="${id}">${head(ctx, id)}${title(ctx, id)}${scope}<div class="ui kb">${work}</div>${rl}${note ? `<p class="foot">${note}</p>` : ''}</section>`;
  // Table 2.1a, Figure 2.1b: a single one carries no letter
  for (const [mark, word] of [['@@TBL@@', 'Table'], ['@@FIG@@', 'Figure']]) {
    const n = html.split(mark).length - 1; let i = 0;
    html = html.split(mark).reduce((s, part) => (i === 0 ? (i++, part) : `${s}${word} ${ref}${n > 1 ? String.fromCharCode(96 + i++) : ''}${part}`), '');

  }
  return html;
}
// a labelled figure and a titled table; the words Figure / Table and the number are added by kpage
const fig = (inner, cap, sub = '') => `<figure class="kf">${inner}<figcaption class="cap"><b><span class="kn">@@FIG@@</span> ${A(cap)}</b>${sub}</figcaption></figure>`;
const tb = (name, inner) => `<div class="ktb"><p class="kz-l"><span class="kn">@@TBL@@</span> ${A(name)}</p>${inner}</div>`;

// ---- colour roles: [label, token, swatch bg, swatch fg, ring?, ratio, pair note]
function roleRows(ctx, mode) {
  const M = colourMap(ctx, mode);
  const R = (a, b) => fm(ctx, M[a], M[b]);
  const act = roleColour(ctx, 'action');
  const g = (label, tok, note = 'Text on it') => [label, tok, M[tok], M.text, R('text', tok), note, ['text', tok]];
  const t = (label, tok, bgTok, note) => [label, tok, M[bgTok], M[tok], R(tok, bgTok), note, [tok, bgTok]];
  const st = (label, tok) => [label, tok, M.surface, M[tok], R(tok, 'surface'), 'Words on surface', [tok, 'surface']];
  return [
    g('Surface', 'surface'), g('Raised', 'raised'), g('Sunken', 'sunken'),
    t('Text', 'text', 'surface', 'On surface'), t('Soft text', 'text-soft', 'surface', 'On surface'), t('Quiet text', 'quiet', 'surface', 'On surface'), t('Quiet on sunken', 'quiet-sunken', 'sunken', 'On sunken'),
    ['Control edge', 'edge', M.surface, M.text, R('edge', 'surface'), 'On surface', ['edge', 'surface']],
    ['Divider', 'divider', M.surface, M.text, R('divider', 'surface'), 'Decoration only', ['divider', 'surface']],
    ['Focus ring', 'focus', M.surface, M.text, R('focus', 'surface'), 'On surface', ['focus', 'surface']],
    ['Action', 'action', M.action, M['action-label'], R('action', 'surface'), mode === 'light' && ctx.roles.light.actionExempt ? `${act.name} fill, label carries it` : 'Fill on surface', ['action', 'surface']],
    ['Action hover', 'action-hover', M['action-hover'], M['action-label'], R('action-label', 'action-hover'), 'Label on it', ['action-label', 'action-hover']],
    ['Action pressed', 'action-pressed', M['action-pressed'], M['action-label'], R('action-label', 'action-pressed'), 'Label on it', ['action-label', 'action-pressed']],
    ['Action label', 'action-label', M.action, M['action-label'], R('action-label', 'action'), 'On action', ['action-label', 'action']],
    ['Disabled text', 'disabled-text', M['disabled-bg'], M['disabled-text'], R('disabled-text', 'disabled-bg'), 'On --disabled-bg', ['disabled-text', 'disabled-bg']],
    ['Scrim', 'scrim', M.scrim, M.scrim, '', 'Behind a dialog', null],
    st('Success', 'success'), st('Warning', 'warning'), st('Danger', 'danger'), st('Info', 'info'),
  ].map(([label, tok, bg, fg, ratio, note, pair]) => ({ label, tok, val: M[tok], bg, fg, ratio, note, pair, ring: bg === M.surface }));
}
// pass level of a ratio: AAA from 7, AA from 4.5, UI from 3 (large text and non-text), nothing below
const level = (n) => (n >= 7 ? 'AAA' : n >= 4.5 ? 'AA' : n >= 3 ? 'UI' : '');
function colourPage(ctx, id, mode) {
  const dark = mode === 'dark', act = roleColour(ctx, 'action'), txt = roleColour(ctx, 'text'), R = ctx.roles[mode];
  const ref = refOf(ctx, id), M = colourMap(ctx, mode), roles = roleRows(ctx, mode);
  // definitions: one numbered clause per role, a small inline chip of the colour, the token and the value as literals
  const def = (r, i) => `<li><span class="num">${ref}.${i + 2}</span><span class="kdc${r.tok === 'scrim' || r.ring ? ' is-ring' : ''}" style="background:${r.val}"></span><span class="kdt"><b>${A(r.label)}.</b> ${A(r.note)}<br>${m('--' + r.tok)} ${m(r.val)}</span></li>`;
  const half = Math.ceil(roles.length / 2);
  const defs = `<div class="kdf"><ol>${roles.slice(0, half).map((r, i) => def(r, i)).join('')}</ol><ol>${roles.slice(half).map((r, i) => def(r, i + half)).join('')}</ol></div>`;
  // the conformance matrix: each text or line colour (rows) on each ground (columns); the pairs the kit uses are outlined
  const rowsFg = [['text', 'Text'], ['text-soft', 'Soft text'], ['quiet', 'Quiet'], ['quiet-sunken', 'Quiet, sunken'], ['edge', 'Control edge'], ['divider', 'Divider'], ['focus', 'Focus ring'], ['action', 'Action'], ['action-label', 'Action label'], ['disabled-text', 'Disabled text'], ['success', 'Success'], ['warning', 'Warning'], ['danger', 'Danger'], ['info', 'Info']];
  const colsBg = [['surface', 'Surface'], ['raised', 'Raised'], ['sunken', 'Sunken'], ['action', 'Action'], ['action-hover', 'Hover'], ['action-pressed', 'Pressed'], ['disabled-bg', 'Disabled'], ['success-bg', 'Success'], ['warning-bg', 'Warning'], ['danger-bg', 'Danger'], ['info-bg', 'Info']];
  const used = new Set(roles.filter((r) => r.pair).map((r) => r.pair.join('|')));
  const chip = (tok) => `<i class="kmc" style="background:${M[tok]}"></i>`;
  const cell = (f, b) => {
    const n = ctx.ratio(M[f], M[b]);
    if (f === b) return '<td class="kx">–</td>';
    const lv = level(n);
    return `<td class="kx${used.has(f + '|' + b) ? ' is-used' : ''}${lv ? '' : ' is-low'}"><span>${ctx.fmt(n)}</span>${lv ? `<i>${lv}</i>` : ''}</td>`;
  };
  const matrix = `<table class="st kmx"><thead><tr><th class="kmx-c">Text on ground</th>${colsBg.map(([t, n]) => `<th>${chip(t)}${A(n)}</th>`).join('')}</tr></thead><tbody>${rowsFg.map(([f, n]) => `<tr><th scope="row">${chip(f)}${A(n)}</th>${colsBg.map(([b]) => cell(f, b)).join('')}</tr>`).join('')}</tbody></table>`;
  const inner = `${defs}<div class="ksgap"></div>${tb('Conformance matrix', matrix)}<p class="kmx-key"><span class="kx is-used">Outlined</span> a pair the kit uses. <b>AAA</b> 7 : 1, <b>AA</b> 4.5 : 1, <b>UI</b> 3 : 1, large text and non-text. No level below 3 : 1. The ${m('-bg')} tints are for highlights and charts, never under text.</p>`;
  const body = dark ? `<div class="ui kdk" data-theme="dark">${inner}</div>` : inner;
  const lede = dark
    ? `The same roles, the same names. ${A(ctx.brand.name)} ships dark as a second set of values on ${m('[data-theme="dark"]')}, so no markup changes.`
    : `Roles name a job, not a colour. Components read ${m('--action')} and ${m('--text')}, never a palette name. Text needs 4.5 : 1; edges, the focus ring and fills need 3 : 1.`;
  const exempt = !dark && R.actionExempt;
  const note = exempt
    ? `${A(act.name)} is ${fm(ctx, R.action, R.surface)} : 1 on ${A(nameOf(ctx, ctx.colours.find((c) => c.role === 'ground').id))}, under the 3 : 1 a fill would otherwise need. It is allowed because the label carries the contrast: ${A(txt.name)} on ${A(act.name)} is ${fm(ctx, R.actionLabel, R.action)} : 1, and the label is what names the button.`
    : dark ? `${A(act.name)} stays in dark with the same ${A(txt.name)} label, so a button reads the same in both. On the dark surface it is ${fm(ctx, R.action, R.surface)} : 1, so no exemption is needed.` : '';
  return kpage(ctx, id, { lede, body, note });
}

// ---- 1.3 type scale
function typeScale(ctx) {
  const F = S(ctx).form, X = S(ctx);
  const sample = { caption: F.notesHelp, label: F.pickup, body: X.pickup, control: F.book, 'title-s': X.dialog.title, title: X.rider, headline: X.eta };
  const fam = (t) => ctx.brand.fonts[t.face].family;
  const rows = [...ctx.uiType].reverse().map((t) => `<tr><td><span class="kt-k">${m(t.token)}</span><span class="kts" style="font-family:var(--ff-${t.face});font-size:${t.size}px;line-height:${t.line}px;font-weight:${t.weight}">${A(sample[t.token] || t.use)}</span></td><td>${A(fam(t))}</td><td class="num">${t.size}</td><td class="num">${t.line}</td><td class="num">${t.weight}</td><td class="num">${t.face === 'display' ? '−0.01 em' : '0'}</td><td class="kq">${A(t.use)}</td></tr>`).join('');
  const table = `<table class="st kt"><thead><tr><th style="width:262px">Style and specimen</th><th style="width:76px">Face</th><th style="width:32px">Size</th><th style="width:32px">Line</th><th style="width:48px">Weight</th><th style="width:64px">Tracking</th><th>Use</th></tr></thead><tbody>${rows}</tbody></table>`;
  const d = ctx.brand.fonts.display, b = ctx.brand.fonts.body, mono_ = ctx.brand.fonts.mono;
  const bd = ctx.uiType.find((t) => t.token === 'body');
  return kpage(ctx, 'type-scale', {
    lede: `Seven sizes. Sizes and line heights are px. Numbers that change use tabular figures, so a time never shifts.`,
    body: tb('Type specification', table),
    rules: [`Body text shall be ${bd.size} px on a ${bd.line} px line, in ${A(b.family)}.`, `${A(d.family)} shall be used for titles and the live status, ${A(b.family)} for everything people read, ${A(mono_.family)} for a hex, a token or a code string only.`, 'Nothing on screen shall be smaller than 14 px.', 'Secondary text shall take the quiet colour. It shall never be faded with opacity.'],
  });
}

// ---- 1.4 spacing, drawn
function spacing(ctx) {
  const uses = ['Icon to its text, a tight pair', 'Inside a group: a field and its help', 'A row’s lead to its text', 'Card padding, between fields', 'Dialog padding, between groups', 'Empty-state padding, between blocks', 'Between sections of a screen', 'Page margin on desktop'];
  const rows = ctx.space.map((s, i) => `<tr><td>${m('--' + s.token.replace('space-', 'sp-'))}</td><td class="num">${s.px} px</td><td><i class="ksq" style="width:${s.px}px;height:${s.px}px"></i></td><td class="kq">${A(uses[i] || '')}</td></tr>`).join('');
  const table = `<table class="st ksp"><thead><tr><th style="width:84px">Token</th><th style="width:60px">Step</th><th style="width:100px">Drawn at 1×</th><th>Use</th></tr></thead><tbody>${rows}</tbody></table>`;
  const inside = ctx.space[1].px, between = ctx.space[5].px, bar = 20;
  const g1 = bar * 3 + inside * 2;
  const group = '<div class="kgp"><i></i><i></i><i></i></div>';
  const grouping = `<div class="kgrp" style="--in:${inside}px;--bt:${between}px">${group}${group}
<span class="kd-v" style="left:-16px;top:${bar}px;height:${inside}px"></span><span class="kd-n" style="left:-38px;top:${bar + inside / 2 - 6}px">${inside}</span>
<span class="kd-v" style="left:-16px;top:${g1}px;height:${between}px"></span><span class="kd-n" style="left:-44px;top:${g1 + between / 2 - 6}px">${between}</span></div>`;
  return kpage(ctx, 'spacing', {
    lede: `Everything sits on one scale of ${ctx.space.length} steps, in px, from ${ctx.space[0].px} to ${ctx.space[ctx.space.length - 1].px}. Proximity is meaning: the gap inside a group is always smaller than the gap between groups.`,
    left: tb('Spacing scale', table), right: fig(grouping, 'Grouping', `${inside} px inside a group, ${between} px between groups. The numbers are px.`), fw: 210,
    rules: ['A gap off the scale is a mistake. Pick the nearest step.', `Controls are 44 px tall, which is eleven steps of ${ctx.brand.ui.spacingBase}. A small button is 36 px, a large one 52.`],
  });
}

// the one sentence both the buttons and states pages owe: why a Sunbelt fill under 3 : 1 is allowed
function exemptNote(ctx) {
  const R = ctx.roles.light, act = roleColour(ctx, 'action'), txt = roleColour(ctx, 'text');
  const ground = nameOf(ctx, ctx.colours.find((c) => c.role === 'ground').id);
  return `${A(act.name)} is ${fm(ctx, R.action, R.surface)} : 1 on ${A(ground)}, under the 3 : 1 a fill would otherwise need. It is allowed because the label carries the contrast, and the label is what names the button: ${A(txt.name)} on ${A(act.name)} is ${fm(ctx, R.actionLabel, R.action)} : 1, on hover ${fm(ctx, R.actionLabel, R.actionHover)} : 1, pressed ${fm(ctx, R.actionLabel, R.actionPressed)} : 1.`;
}

// ---- 1.5 radii and borders, drawn on real controls
function radiiBorders(ctx) {
  const ui = ctx.ui, SC = S(ctx), X = SC.example, R = ctx.roles.light;
  const rr = ctx.radii.map((r) => `<tr><td>${m('--' + r.token.replace('radius-', 'r-'))}</td><td><i class="krd" style="border-radius:${Math.min(r.px, 999)}px"></i></td><td class="num">${r.px > 999 ? 'Full' : r.px + ' px'}</td><td class="kq">${A(r.use)}</td></tr>`).join('');
  const rt = `<table class="st krt"><thead><tr><th style="width:96px">Token</th><th style="width:84px">Drawn</th><th style="width:48px">Radius</th><th>Use</th></tr></thead><tbody>${rr}</tbody></table>`;
  const br = ctx.borders.map((b) => `<tr><td>${m('--' + b.token.replace('border-', 'w-'))}</td><td><i class="kbl" style="border-top-width:${b.px}px"></i></td><td class="num">${b.px} px</td><td class="kq">${A(b.use)}</td></tr>`).join('');
  const bt = `<table class="st krt"><thead><tr><th style="width:96px">Token</th><th style="width:84px">Drawn</th><th style="width:48px">Width</th><th>Use</th></tr></thead><tbody>${br}</tbody></table>`;
  const real = `<div class="krow">${ui.btn(X.small)}<input class="ui-input" style="width:132px" value="${A(SC.paid)}" aria-label="${A(SC.paidLabel)}">${ui.statusChip('booked')}<label class="ui-choice"><input class="ui-switch" type="checkbox" role="switch" checked aria-label="${A(X.switches[1])}"></label><span class="ui-avatar">${A(SC.initials)}</span>${ui.stat(SC.paid, X.statLabel)}</div>`;
  return kpage(ctx, 'radii-borders', {
    lede: 'Two corner sizes and three line widths, nothing in between. Controls share one radius, cards and dialogs take the larger, and only the avatar and the switch go round.',
    left: [tb('Radii', rt), tb('Border widths', bt)], right: fig(real, 'On real controls', `A button, input and switch at ${ctx.radius.control} px, a stat card at ${ctx.radius.card} px, the avatar round.`), fw: 240,
    rules: [`A control is ${ctx.radius.control} px, a card or dialog ${ctx.radius.card} px. A button or input never takes the card radius.`, `A control edge is ${ctx.brand.ui.border} px in ${m('--edge')}, ${fm(ctx, R.border, R.surface)} : 1 on white. The 1 px line is for dividers only, never a control.`, 'Round is for the avatar and the switch. Nothing else is a pill.'],
  });
}

// ---- 1.6 elevation: rules, not shadows
function elevation(ctx) {
  const bw = ctx.brand.ui.border;
  const lv = [
    ['Ground', 'The page and the screen.', '--surface', 'None', 'background:var(--surface)'],
    ['Raised', 'Cards that group, empty states, the sidebar.', '--raised', 'None', 'background:var(--raised)'],
    ['Card', 'Cards, stats and lists that sit on the ground.', '--surface', `1 px ${m('--divider')}`, 'background:var(--surface);border:1px solid var(--divider)'],
    ['Floats', 'Dialogs, menus and popovers over a scrim.', '--surface', `${bw} px ${m('--text')}`, `background:var(--surface);border:${bw}px solid var(--text);box-shadow:var(--shadow-float)`],
  ];
  const rows = lv.map(([n, use, fill, edge, css]) => `<tr><td><span class="kel"><i style="${css}"></i></span></td><td><b class="kb2">${A(n)}</b><span class="kq">${A(use)}</span></td><td>${m(fill)}</td><td class="num">${edge}</td></tr>`).join('');
  const table = `<table class="st kelt"><thead><tr><th style="width:72px">Level</th><th>Name and use</th><th style="width:82px">Fill</th><th style="width:76px">Edge</th></tr></thead><tbody>${rows}</tbody></table>`;
  const SC = S(ctx), D = SC.dialog;
  const dlg = `<div class="ui-dialog" role="dialog" aria-labelledby="kel-t"><h3 class="ui-dialog__title" id="kel-t">${A(D.title)}</h3><div class="ui-dialog__actions">${ctx.ui.btn(D.keep, { variant: 'secondary' })}${ctx.ui.btn(D.confirm)}</div></div>`;
  const scene = `<div class="kscene">${ctx.ui.card({ title: SC.eta, text: SC.pickup, meta: SC.status })}<div class="kscene__f">${dlg}</div></div>`;
  return kpage(ctx, 'elevation', {
    lede: A(ctx.brand.ui.elevationNote),
    left: tb('Elevation levels', table), right: fig(scene, 'Card and float together', `A card sits on the ground with a hairline. The dialog floats over it on a 1.5 px ${A(roleName(ctx, 'text'))} edge and no shadow.`), fw: 262,
    rules: [`${m('--shadow-float')} is ${m(ctx.brand.ui.shadows)}. The token exists so a product can add one; this kit does not.`, 'A card has a 1 px divider or a raised fill, never both.', `A dialog sits on ${m('--scrim')}. Its ${bw} px edge, not a shadow, separates it from what is behind.`, 'The focus ring is not elevation. It sits on top of every level.'],
  });
}

// ---- 1.7 states, drawn
function states(ctx) {
  const ui = ctx.ui, SC = S(ctx), X = SC.example, R = ctx.roles.light;
  const row = (label, cells) => `<tr><td>${A(label)}</td>${cells.map((c) => `<td>${c}</td>`).join('')}</tr>`;
  const btn = (label, variant) => ['', 'hover', 'pressed', 'focus', 'disabled'].map((st) => ui.btn(label, { variant, state: st || undefined }));
  const t1 = `<table class="st kst"><thead><tr><th style="width:84px">Button</th><th>Rest</th><th>Hover</th><th>Pressed</th><th>Focus</th><th>Disabled</th></tr></thead><tbody>${row('Primary', btn(X.small, 'primary'))}${row('Secondary', btn(X.secondary, 'secondary'))}${row('Quiet', btn(X.quiet, 'quiet'))}</tbody></table>`;
  const inp = (cls = '', attrs = '') => `<input class="ui-input ${cls}" value="${A(SC.paid)}" aria-label="${A(SC.paidLabel)}"${attrs}>`;
  const chk = (cls = '', attrs = '') => `<label class="ui-choice"><input type="checkbox" aria-label="${A(X.checks[0])}" class="${cls}"${attrs}></label>`;
  const sw = (cls = '', attrs = '') => `<label class="ui-choice"><input class="ui-switch ${cls}" type="checkbox" role="switch" aria-label="${A(X.switches[0])}"${attrs}></label>`;
  const na = '<span class="kq">None</span>';
  const t2 = `<table class="st kst"><thead><tr><th style="width:84px">Field</th><th>Rest</th><th>Focus</th><th>Error</th><th>Disabled</th></tr></thead><tbody>${row('Input', [inp(), inp('is-focus'), inp('', ' aria-invalid="true"'), inp('', ' disabled')])}${row('Checkbox', [chk(), chk('is-focus'), na, chk('', ' disabled')])}${row('Switch', [sw(), sw('is-focus'), na, sw('', ' disabled')])}</tbody></table>`;
  return kpage(ctx, 'states', {
    lede: 'Every control has five states and none of them is left to the browser. Each one is drawn from the same tokens, so a new component inherits them.',
    body: `${tb('Button states', t1)}<div class="ksgap"></div>${tb('Field states', t2)}`,
    rules: [`Hover moves the fill one step, to ${m('--action-hover')} ${m(R.actionHover)}, and only where a pointer can hover. Touch never latches it.`, `Focus is a 2 px ring in ${m('--focus')} with a 2 px gap, ${fm(ctx, R.focus, R.surface)} : 1 on white. It shows for the keyboard and is never removed.`, 'Pressed takes the pressed tone and scales to 97% in 120 ms. Disabled controls never scale.', `Disabled uses ${m('--disabled-bg')} and ${m('--disabled-text')} (${fm(ctx, R.disabledText, R.disabledBg)} : 1). It is never faded with opacity.`, `Error is the ${m('--danger')} edge plus a message below that says what to do. Colour is never the only cue.`],
    note: exemptNote(ctx),
  });
}

// ---- 2.1 buttons: one drawn at 2x, then each state in a ledger
function buttons(ctx) {
  const ui = ctx.ui, SC = S(ctx), F = SC.form, X = SC.example, R = ctx.roles.light, M = colourMap(ctx, 'light');
  const bw = ctx.brand.ui.border;
  const big = `<div class="kbx"><span class="kbx-b">${A(F.book)}</span>
<span class="kd-v" style="left:-20px;top:0;height:88px"></span><span class="kd-n" style="left:-44px;top:38px">44</span>
<span class="kd-h" style="left:0;top:108px;width:40px"></span><span class="kd-n" style="left:12px;top:122px">20</span>
<span class="kd-n" style="left:0;top:-24px">r ${ctx.radius.button}</span></div>`;
  const rows = [
    ['Rest', '', M.action, M['action-label'], 'None', fm(ctx, R.actionLabel, R.action)],
    ['Hover', 'hover', M['action-hover'], M['action-label'], 'None', fm(ctx, R.actionLabel, R.actionHover)],
    ['Pressed', 'pressed', M['action-pressed'], M['action-label'], 'Scale 97%', fm(ctx, R.actionLabel, R.actionPressed)],
    ['Focus', 'focus', M.action, M['action-label'], `2 px ${m('--focus')}`, fm(ctx, R.focus, R.surface)],
    ['Disabled', 'disabled', M['disabled-bg'], M['disabled-text'], 'None', fm(ctx, R.disabledText, R.disabledBg)],
  ].map(([st, state, fill, label, edge, ratio]) => `<tr><td>${ui.btn(F.book, { state: state || undefined })}</td><td>${A(st)}<span class="kq kb3">${edge}</span></td><td>${m(fill)}</td><td>${m(label)}</td><td class="r num">${ratio}</td></tr>`).join('');
  const table = `<table class="st kbt"><thead><tr><th style="width:168px">Actual size</th><th>State and edge</th><th style="width:64px">Fill</th><th style="width:64px">Label</th><th class="r" style="width:42px">Ratio</th></tr></thead><tbody>${rows}</tbody></table>`;
  const v = (b, name) => `<div class="kv">${b}<span class="cap"><b>${A(name)}</b></span></div>`;
  const variants = `<div class="kvg">${v(ui.btn(X.secondary, { variant: 'secondary' }), 'Secondary')}${v(ui.btn(X.quiet, { variant: 'quiet' }), 'Quiet')}${v(ui.btn(X.danger, { variant: 'danger' }), 'Danger')}${v(ui.btn(X.small, { size: 'sm' }), 'Small, 36')}${v(ui.btn(X.account, { variant: 'secondary', iconLeft: 'user' }), 'With icon')}</div>`;
  return kpage(ctx, 'buttons', {
    lede: 'One filled button per screen, and its label says what happens. Everything else is an outline or plain text.',
    left: [tb('Button states', table), fig(`<div class="kbx-wrap">${big}</div>`, 'Drawn at 2×', `Height 44, side padding 20, radius ${ctx.radius.button}, edge ${bw} px. Numbers are px at actual size.`)], right: fig(variants, 'Variants', 'Large is 52 px, one per screen at most.'), fw: 190,
    rules: [`One ${A(roleColour(ctx, 'action').name)} button per screen. It books, pays or confirms, and the label names the act: “${A(F.book)}”, not “Submit”.`, `Hover lightens the fill to ${m('--action-hover')}, the brand’s own lighter ${A(roleColour(ctx, 'action').name)}, with the label still at ${fm(ctx, R.actionLabel, R.actionHover)} : 1.`, 'A disabled button says why in the line beside or under it, never in a tooltip alone.'],
    note: exemptNote(ctx),
  });
}

// ---- 2.2 inputs
function inputs(ctx) {
  const ui = ctx.ui, SC = S(ctx), F = SC.form, R = ctx.roles.light, bw = ctx.brand.ui.border, M = colourMap(ctx, 'light');
  const cell = (inner, name) => `<div class="kfld">${inner}<span class="cap"><b>${A(name)}</b></span></div>`;
  const states = `<div class="kfs">${[
    cell(ui.field({ id: 'k-i1', label: F.pickup, value: F.pickupValue }), 'Rest'),
    cell(ui.field({ id: 'k-i2', label: F.dropoff, value: F.dropoffValue, state: 'focus' }), 'Focus'),
    cell(ui.field({ id: 'k-i3', label: F.ready, value: F.readyValue, error: F.readyError }), 'Error'),
    cell(ui.field({ id: 'k-i4', label: SC.paidLabel, value: SC.paid, disabled: true }), 'Disabled'),
  ].join('')}</div>`;
  const kinds = `<div class="kfg">${[
    cell(ui.field({ id: 'k-i5', label: F.size, kind: 'select', options: F.sizes, value: F.sizes[1] }), 'Select'),
    cell(ui.field({ id: 'k-i6', label: F.notes, kind: 'textarea', help: F.notesHelp }), 'Textarea with help'),
  ].join('')}</div>`;
  // state x property: where each state takes its edge, fill and text from, and the text's ratio on its fill
  const sp = [['Rest', '--edge', '--surface', '--text', fm(ctx, M.text, M.surface)], ['Focus', '--text', '--surface', '--text', fm(ctx, M.text, M.surface)], ['Error', '--danger', '--surface', '--text', fm(ctx, M.text, M.surface)], ['Disabled', '--edge', '--disabled-bg', '--disabled-text', fm(ctx, M['disabled-text'], M['disabled-bg'])]];
  const matrix = `<table class="st kspec"><thead><tr><th style="width:62px">State</th><th style="width:66px">Edge</th><th style="width:104px">Fill</th><th>Text</th><th class="r" style="width:34px">Ratio</th></tr></thead><tbody>${sp.map(([a, e, f, t, r]) => `<tr><td>${A(a)}</td><td>${m(e)}</td><td>${m(f)}</td><td>${m(t)}</td><td class="r num">${r}</td></tr>`).join('')}</tbody></table>`;
  const spec = [['Height', m('44 px'), 'The same as a button, so a row of both lines up.'], ['Edge', `${m(bw + ' px --edge')}`, `${fm(ctx, R.border, R.surface)} : 1 on white; focus turns it ${m('--text')}.`], ['Radius', m(ctx.radius.input + ' px'), 'The control radius.'], ['Padding', m('12 px'), 'Text sits 12 px in from the edge.'], ['Label', m('label 14 / 500'), 'Above the field, always. Never only a placeholder.'], ['Help and error', m('caption 14'), `Help is ${m('--quiet')}. An error is ${m('--danger')} on ${m('--danger-bg')}.`]];
  const table = `<table class="st kspec"><thead><tr><th style="width:66px">Part</th><th style="width:120px">Value</th><th>Note</th></tr></thead><tbody>${spec.map(([a, b, c]) => `<tr><td>${A(a)}</td><td>${b}</td><td class="kq">${c}</td></tr>`).join('')}</tbody></table>`;
  return kpage(ctx, 'inputs', {
    lede: 'A field is a label, a control and one line of help or error. The label is always visible, so no field depends on a placeholder.',
    left: [tb('Field states', matrix), tb('Field parts', table), fig(kinds, 'Select and textarea')], right: fig(states, 'The four states', 'Each field keeps its label and value in every state.'), fw: 224,
    rules: ['Say what is wrong and how to fix it: “Enter the amount in dollars, such as 410.” Not “Invalid input”.', `Validate when the field loses focus, not on every key. The error appears under the field and the field takes the ${m('--danger')} edge.`, 'A disabled field keeps its label and shows its value, so nobody wonders what it holds.'],
  });
}

// ---- 2.3 choices
function choices(ctx) {
  const ui = ctx.ui, SC = S(ctx), X = SC.example, F = SC.form, R = ctx.roles.light;
  const box = (cls, attrs) => `<label class="ui-choice"><input type="checkbox" aria-label="${A(X.checks[0])}" class="${cls}"${attrs}></label>`;
  const rad = (cls, attrs) => `<label class="ui-choice"><input type="radio" aria-label="${A(X.radios[0])}" class="${cls}"${attrs}></label>`;
  const sw = (cls, attrs) => `<label class="ui-choice"><input class="ui-switch ${cls}" type="checkbox" role="switch" aria-label="${A(X.switches[0])}"${attrs}></label>`;
  const set = (f) => [f('', ''), f('', ' checked'), f('is-focus', ' checked'), f('', ' disabled')];
  const row = (n, cells) => `<tr><td>${A(n)}</td>${cells.map((c) => `<td>${c}</td>`).join('')}</tr>`;
  const table = `<table class="st kst"><thead><tr><th style="width:96px">Control</th><th>Off</th><th>On</th><th>Focus</th><th>Disabled</th></tr></thead><tbody>${row('Checkbox', set(box))}${row('Radio', set(rad))}${row('Switch', set(sw))}</tbody></table>`;
  const seg = `<div class="kseg">${ui.segmented(F.sizes, 1)}${ui.segmented(F.sizes, 0, { disabled: true })}</div>`;
  const use = `<div class="kuse"><div>${X.checks.map((t, i) => ui.check(t, { checked: i === 0, disabled: i === 2 })).join('')}</div><div>${X.radios.map((t, i) => ui.check(t, { type: 'radio', name: 'k-r', checked: i === 0 })).join('')}</div><div>${X.switches.map((t, i) => ui.switch(t, { checked: i === 0 })).join('')}</div></div>`;
  return kpage(ctx, 'choices', {
    lede: 'Pick several with checkboxes, pick one with radios or a segmented control, and use a switch only for a setting that takes effect at once.',
    left: [tb('Choice states', table), fig(seg, 'Segmented control', `One choice from a short set. Selected fills with ${m('--text')}; the disabled one is greyed and cannot take focus.`)], right: fig(use, 'In use', 'The label is part of the target: the whole 44 px row toggles.'), fw: 190,
    rules: ['The target is 44 px tall and includes the label.', `A checked box fills with ${m('--text')}. It never relies on colour alone: the tick is drawn.`, 'A switch never needs a Save button. If the setting waits for one, use a checkbox.'],
    note: `A switch that is on fills with ${A(roleColour(ctx, 'action').name)}, which is ${fm(ctx, R.action, R.surface)} : 1 on white. As with the button, it is allowed because the ${m('--text')} edge and thumb carry the meaning, not the fill.`,
  });
}

// a part-by-part spec table: Part | Value | Note
function specTable(rows, cls = 'kspec', w = [96, 152]) {
  return `<table class="st ${cls}"><thead><tr><th style="width:${w[0]}px">Part</th><th style="width:${w[1]}px">Value</th><th>Note</th></tr></thead><tbody>${rows.map(([a, b, c]) => `<tr><td>${A(a)}</td><td>${b}</td><td class="kq">${c}</td></tr>`).join('')}</tbody></table>`;
}

// a narrow two-column spec: Part | Specification (the value, then its note under it)
function specNarrow(rows) {
  return `<table class="st kspec"><thead><tr><th style="width:68px">Part</th><th>Specification</th></tr></thead><tbody>${rows.map(([a, b, c]) => `<tr><td>${A(a)}</td><td>${b}<span class="kq kb3">${c}</span></td></tr>`).join('')}</tbody></table>`;
}

// ---- 2.4 cards
function cards(ctx) {
  const ui = ctx.ui, SC = S(ctx), X = SC.example;
  const plain = ui.card({ title: SC.eta, text: SC.pickup, meta: SC.status, action: `<div class="kca">${ui.btn(SC.share, { variant: 'secondary', size: 'sm' })}</div>` });
  const raised = ui.card({ title: SC.rider, text: SC.riderNote, raised: true });
  const stats = `<div class="kst2">${ui.stat(SC.paid, X.statLabel)}${ui.stat(ctx.real(SC.riderNote).split(' ')[0] + ' of ' + ctx.real(SC.riderNote).split(' ')[2], 'Panels on')}</div>`;
  const spec = [['Radius', m(ctx.radius.card + ' px'), 'The card radius, larger than a control.'], ['Edge', m('1 px --divider'), 'Or a raised fill with no edge. Never both.'], ['Padding', m('16 px'), 'Gap of 6 px between the lines inside.'], ['Title', m('title-s 20 / 26'), 'Display face. One per card.'], ['Text', m('body 16 / 24'), `${m('--text-soft')}, at most three lines.`], ['Meta', m('label 14'), `${m('--quiet')}, above the title.`], ['Stat value', m('title 28 / 32'), 'Tabular figures, so a changing number holds its width.']];
  return kpage(ctx, 'cards', {
    lede: 'A card groups one thing: a job, a person, a number. It carries an edge or a tint, not a shadow, and at most one action.',
    left: tb('Card parts', specTable(spec, 'kspec', [58, 124])), right: fig(`<div class="kcs">${plain}${raised}${stats}</div>`, 'Card, raised card and stat', 'A hairline card with its one action, a raised card with no edge, and a stat: a number and its label, not a link.'), fw: 262,
    rules: ['A card holds one subject. If it needs two buttons, it is a screen.', `A card that opens something is a link: the whole card is the target and it takes the ${m('--focus')} ring outside its edge.`, 'Cards in a row share a height and a top edge. They do not stack shadows or nest.'],
  });
}

// ---- 2.5 navigation
function navTable(ctx) {
  const rows = [['Top bar', '56 px', 'Underline and darker text', 'Desktop, one per screen'], ['Tabs', '44 px', 'Underline and darker text', 'Views of one thing'], ['Breadcrumbs', '44 px', 'Last crumb, not a link', 'Depth of three or more'], ['Sidebar', '220 px', 'Tint and a left edge', 'Desktop sections'], ['Tab bar', '64 px', 'Darker text and icon', 'Phone, four items at most']];
  return `<table class="st kspec"><thead><tr><th style="width:84px">Component</th><th style="width:48px">Size</th><th>Current place</th><th>Where</th></tr></thead><tbody>${rows.map(([a, b, c, d]) => `<tr><td>${A(a)}</td><td class="num">${b}</td><td class="kq">${c}</td><td class="kq">${d}</td></tr>`).join('')}</tbody></table>`;
}
function navigation(ctx) {
  const ui = ctx.ui, SC = S(ctx), X = SC.example, B = ctx.brand;
  const links = [...X.links, [X.account, 'user']];
  const top = `<nav class="ui-topbar" aria-label="Main"><strong class="ui-display">${A(B.logo.showcase.wordmark)}</strong><div class="ui-topbar__links">${ui.links(X.links, 0)}</div><span class="num kclock">${A(SC.time)}</span></nav>`;
  const side = `<nav class="ui-sidebar" aria-label="Section">${ui.links(links, 0)}</nav>`;
  const bar = `<nav class="ui-tabbar" aria-label="Sections">${links.map(([t, i], k) => `<a href="#"${k === 0 ? ' aria-current="page"' : ''}>${ui.icon(i, 20)}${A(t)}</a>`).join('')}</nav>`;
  return kpage(ctx, 'navigation', {
    lede: 'Four ways to say where you are: a top bar, tabs, a sidebar and breadcrumbs on the desktop, and a tab bar on a phone. All of them mark the current place the same way.',
    left: tb('Navigation components', navTable(ctx)),
    right: [fig(side, 'Sidebar', '220 px, current item tinted and edged.'), fig(`<div class="kphn">${bar}</div>`, 'Tab bar', 'Phones, 64 px, four items at most.')], fw: 232,
    body: `${fig(top, 'Top bar', '56 px. The wordmark, three links, the current one underlined.')}<div class="ksgap"></div><div class="knv2">${fig(ui.tabs(X.tabs, 0), 'Tabs', 'Switch views of the same thing.')}${fig(ui.crumbs([...X.crumbs, SC.deliverTo]), 'Breadcrumbs', 'The last crumb is the page and is not a link.')}</div>`,
    rules: [`The current place is marked with ${A(roleColour(ctx, 'action').name)} and by darker text, set in ${m('aria-current')}. The mark is never colour alone.`, 'A link target is 44 px tall.', 'Icons sit beside a label. An icon alone is for the close and add buttons only.'],
    note: `The ${A(roleColour(ctx, 'action').name)} mark is ${fm(ctx, ctx.roles.light.action, ctx.roles.light.surface)} : 1 on white, so it is a cue, not the carrier: the current item also takes ${m('--text')} against ${m('--text-soft')} for the rest, and ${m('aria-current')} tells assistive tech.`,
  });
}

// ---- 2.6 lists
function lists(ctx) {
  const ui = ctx.ui, SC = S(ctx);
  const spec = [['Row', m('min 64 px'), 'The whole row is the target when it is a link, and hover tints it.'], ['Lead', m('40 px round'), 'Initials or an icon, on the sunken tone.'], ['Title', m('body 16 / 500'), 'The subject: an address, a name.'], ['Sub line', m('label 14'), `${m('--quiet')}, tabular figures: dates, times, amounts.`], ['End', m('label 14'), 'A figure and a status, right-aligned.'], ['Divider', m('1 px --divider'), 'Between rows. No box around the list.']];
  return kpage(ctx, 'lists', {
    lede: 'A list is rows on one hairline. Each row leads with who or where, then says what changed, and ends on a figure and a status.',
    flip: true, fw: 380, left: tb('Row parts', specNarrow(spec)), right: fig(ui.deliveryRows(5), 'Row list', `${SC.deliveries.length} installs, each with its own status.`),
    rules: ['Titles that run long wrap. They are never cut with an ellipsis.', 'A list of more than twenty rows is paged or searchable.', 'Figures in the end column are right-aligned so they compare down the page.'],
  });
}

// ---- 2.7 status
function status(ctx) {
  const ui = ctx.ui, R = ctx.roles.light;
  const toneName = { action: roleColour(ctx, 'action').name, success: 'Success', warning: 'Warning', danger: 'Danger', info: 'Info', neutral: 'Neutral' };
  const rows = ctx.status.map((s) => { const w = statusText(ctx, 'light', s); return `<tr><td>${ui.statusChip(s.id)}</td><td>${m(s.id)}</td><td>${A(toneName[s.tone] || s.tone)}</td><td>${m(w.token)}</td><td>${m(w.hex)}</td><td class="r num">${fm(ctx, w.hex, R.surface)}</td></tr>`; }).join('');
  const table = `<table class="st kstat"><thead><tr><th style="width:140px">Chip</th><th style="width:84px">Id</th><th style="width:60px">Tone</th><th style="width:108px">Token</th><th style="width:62px">Words</th><th class="r">On ground</th></tr></thead><tbody>${rows}</tbody></table>`;
  const dark = `<div class="ui kdk kchips" data-theme="dark">${ctx.status.map((s) => ui.statusChip(s.id)).join('')}</div>`;
  const spare = `<div class="krow2">${ui.chip('Neutral')}<span class="ui-badge">3</span><span class="ui-badge">12</span></div>`;
  return kpage(ctx, 'status', {
    lede: 'A status is a word first and a colour second. The five states of an install are words in one colour, so a row reads the same whether or not the colour shows.',
    left: tb('Status chips', table), right: [fig(dark, `On ${A(roleName(ctx, 'text'))}`, 'The same words in dark, from the same ids.'), fig(spare, 'Neutral chip and badge', 'A neutral chip for an unknown state. A badge counts.')], fw: 186,
    rules: ['Every chip carries its words. Colour is never the only cue.', `A status is label 14 / 500 in one colour, with no fill and no edge. It is not a button and never takes focus.`, `“${ctx.status.find((s) => s.tone === 'action').label}” is the action state. Where ${A(roleColour(ctx, 'action').name)} does not hold 4.5 : 1 as words, it takes ${m('--text')}.`, 'The ratio is the words on the page ground. Every status holds 4.5 : 1.'],
  });
}

// ---- 2.8 feedback
function feedback(ctx) {
  const ui = ctx.ui, SC = S(ctx), D = SC.deliveries;
  const alert = (tone, text, name) => `<div class="kal">${ui.alert(tone, text)}<span class="cap"><b>${A(name)}</b></span></div>`;
  const alerts = `<div class="kals">${alert('info', SC.alert, 'Info')}${alert('success', SC.toast, 'Success')}${alert('warning', `${D[2].to}: ${D[2].when}.`, 'Warning')}${alert('danger', `${D[4].to}: ${D[4].when}.`, 'Danger')}</div>`;
  const toast = fig(ui.toast(SC.toast), 'Toast', 'Bottom of the screen, gone in five seconds. Undo stays reachable by keyboard.');
  const inline = fig(`<p class="ui-inline-msg">${ui.icon('info', 18)}${A(SC.inline)}</p>`, 'Inline message', 'Under the field it concerns.');
  const loading = fig(`<div class="kld">${ui.spinner()}<div class="kld-s">${ui.skeleton('100%')}${ui.skeleton('72%')}${ui.skeleton('44%')}</div></div>`, 'Loading', 'A spinner under a second, a skeleton over.');
  const FT = [['Alert, info', m('status'), `${m('--info')} edge and icon`, 'Until dismissed'], ['Alert, success', m('status'), `${m('--success')} edge and icon`, 'Until dismissed'], ['Alert, warning', m('status'), `${m('--warning')} edge and icon`, 'Until fixed'], ['Alert, danger', m('alert'), `${m('--danger')} edge and icon`, 'Until fixed'], ['Toast', m('status'), `${m('--text')} on ${m('--surface')}`, '5 s, with Undo'], ['Inline message', '–', `${m('--text-soft')}, 14`, 'With its field'], ['Loading', m('status'), `${m('--sunken')} shapes`, 'Until it arrives']];
  const ftab = `<table class="st kspec"><thead><tr><th style="width:92px">Component</th><th style="width:48px">Role</th><th>Colour</th><th>Lasts</th></tr></thead><tbody>${FT.map(([a, b, c, d]) => `<tr><td>${A(a)}</td><td>${b}</td><td>${c}</td><td class="kq">${d}</td></tr>`).join('')}</tbody></table>`;
  return kpage(ctx, 'feedback', {
    lede: 'Four tones of alert for what happened, a toast for what you just did, and a calm loading state. Each says what it is in words as well as colour.',
    left: tb('Feedback components', ftab), right: fig(alerts, 'The four alerts'), fw: 300,
    body: `<div class="kfb3">${toast}<div class="kcol">${inline}${loading}</div></div>`,
    rules: ['An alert says what happened and what to do next. “Something went wrong” is never enough.', 'A danger alert has role alert and is read at once; the others are polite.', 'A toast can be undone and disappears by itself. Anything that must be read is an alert.', 'Loading under a second shows nothing. Over it, a skeleton in the shape of what is coming.'],
  });
}

// ---- 2.9 dialog
function dialog(ctx) {
  const ui = ctx.ui, SC = S(ctx), D = SC.dialog, X = SC.example, bw = ctx.brand.ui.border;
  const stage = (inner, cap, sub) => fig(`<div class="ui-scrim kst3">${inner}</div>`, cap, sub);
  const spec = [['Width', m('max 440 px'), 'Shrinks with the screen, 24 px from each side.'], ['Padding', m('24 px'), 'Gap of 12 px between title, text and actions.'], ['Scrim', m('--scrim'), 'Fills the screen behind it. Clicking it does not close a destructive dialog.'], ['Edge', m(`${bw} px --text`), `With ${m('--radius-card')} ${ctx.radius.card} px. No shadow: the edge is what lifts it.`], ['Title', m('title-s 20 / 26'), 'A question or a plain statement of the act.'], ['Actions', m('44 px, right'), 'The safe choice first, the act last. Wraps on a phone.']];
  return kpage(ctx, 'dialog', {
    lede: 'A dialog interrupts for one decision. It says what will happen, offers the safe choice by name, and the act in the same words the page used.',
    flip: true, fw: 350, left: tb('Dialog parts', specNarrow(spec)), right: stage(ui.dialog({ title: D.title, body: D.body, confirm: D.confirm, keep: D.keep }), 'Confirm', `The act is the ${A(roleName(ctx, 'action'))} button. A destructive dialog, such as “${X.danger}”, uses Danger for the act instead.`),
    rules: ['Buttons repeat the act: “Move install day”, not “OK” or “Yes”.', 'Focus moves into the dialog, stays inside it, and returns to the control that opened it. Escape closes it.', 'A dialog never opens by itself, except to warn about a loss.'],
  });
}

// ---- 2.10 table
function table(ctx) {
  const ui = ctx.ui, SC = S(ctx), D = SC.deliveries;
  const sort = (label, dir) => `<th${dir ? ` aria-sort="${dir}"` : ''}><button type="button" class="ksort">${A(label)}${ui.icon('chevron-right', 14)}</button></th>`;
  const rows = D.map((d, i) => `<tr${i === 0 ? ' aria-selected="true"' : ''}${i === 2 ? ' class="is-hover"' : ''}><td>${A(d.to)}</td><td class="kq">${A(d.when)}</td><td class="is-num">${A(d.price)}</td><td>${ui.statusChip(d.status)}</td></tr>`).join('');
  const t = `<table class="ui-table kut"><thead><tr>${sort('Address', 'ascending')}<th>Date</th><th class="is-num">System</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>`;
  const st = [['Header', m('--raised'), `${m('--text')} rule`, 'Button if sortable'], ['Row', m('--surface'), `1 px ${m('--divider')}`, 'None'], ['Hover', m('--raised'), `1 px ${m('--divider')}`, 'Tints the row'], ['Selected', m('--raised'), `3 px ${A(roleColour(ctx, 'action').name)}, left`, m('aria-selected')]];
  const stt = `<table class="st kspec"><thead><tr><th style="width:62px">State</th><th style="width:78px">Fill</th><th>Edge</th><th>Marked by</th></tr></thead><tbody>${st.map(([a, b, c, d]) => `<tr><td>${A(a)}</td><td>${b}</td><td class="kq">${c}</td><td class="kq">${d}</td></tr>`).join('')}</tbody></table>`;
  const spec = [['Header', m('label 14 / 500'), 'A sortable header is a button.'], ['Row', m('52 px'), 'No zebra stripes.'], ['Numbers', m('tabular, right'), 'Figures compare down the column.']];
  return kpage(ctx, 'table', {
    lede: 'A table is for comparing. Keep the columns few, align the figures, and let the header say what each column sorts by.',
    left: tb('Row states', stt), right: tb('Parts', specNarrow(spec)), fw: 216,
    body: fig(t, 'Installs', 'Sorted by address. The first row is selected and the third is under the pointer.'),
    rules: ['Four columns or fewer on a phone. Past that, a row becomes a card.', `The sorted column carries ${m('aria-sort')} and an arrow. Colour is not the cue.`, 'A table that can be empty shows an empty state, never just a header.'],
  });
}

// ---- 2.11 empty states
function empty(ctx) {
  const ui = ctx.ui, SC = S(ctx), E = SC.empty;
  const box = (title, text, btn) => `<div class="ui-empty"><h3 class="ui-empty__title">${A(title)}</h3><p class="ui-empty__text">${A(text)}</p>${btn}</div>`;
  const spec = [['Padding', m('32 px'), `On ${m('--raised')}, ${ctx.radius.card} px radius, no edge.`], ['Title', m('headline 36 / 40'), 'Names what is missing, in the user’s words.'], ['Text', m('body 16, 36 ch'), 'What will be here and how to fill it.'], ['Action', m('one button'), 'The next step. No second choice.']];
  return kpage(ctx, 'empty', {
    lede: 'An empty screen is the first thing a new user sees, so it gets the largest type in the kit. It names what is missing, says how to fill it, and offers one button.',
    left: tb('Empty-state parts', specTable(spec, 'kspec', [54, 124])), right: fig(box(E.title, E.body, ui.btn(E.cta)), 'First run', 'Nothing here yet. The button is the next step.'), fw: 290,
    body: `<div class="kfg">${fig(box(ctx.ph('uikit.noResults.title', 'No installs match'), ctx.ph('uikit.noResults.text', 'Try a different suburb, or clear the filter to see every install.'), ui.btn(ctx.ph('uikit.noResults.action', 'Clear filter'), { variant: 'secondary' })), 'No results', 'A filter or search found nothing.')}${fig(box(ctx.ph('uikit.error.title', 'Installs did not load'), ctx.ph('uikit.error.text', 'Check your connection, then try again. Your quotes are safe.'), ui.btn(ctx.ph('uikit.error.action', 'Try again'), { variant: 'secondary' })), 'Error', 'Says what happened and the way out.')}</div>`,
    rules: ['Use the user’s words for the title. “No quotes yet”, not “Empty state”.', `The ${A(roleName(ctx, 'action'))} button belongs to first run only. A filter or error empty offers a secondary button, and an error says what is safe.`],
  });
}

// ---- 3.x product screens: the real components composed into the Install day screen
const wordmark = (ctx) => `<strong class="ui-display">${A(ctx.brand.logo.showcase.wordmark)}</strong>`;
const navItems = (ctx) => [...S(ctx).example.links, [S(ctx).example.account, 'user']];
function trackBlock(ctx) {
  const SC = S(ctx), ui = ctx.ui;
  const prog = `<div class="ui-progress" role="progressbar" aria-label="${A(ctx.brand.ui.screen.title)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(SC.progress * 100)}"><div class="ui-progress__bar"><i style="width:${SC.progress * 100}%"></i></div><span class="ui-progress__dot" style="left:${SC.progress * 100}%"></span></div><div class="ks-route"><span>${A(SC.from)}</span><span>${A(SC.to)}</span></div>`;
  const rider = `<div class="ks-rider"><span class="ui-avatar">${A(SC.initials)}</span><div class="ks-rmain"><p class="ks-rname">${A(SC.rider)}</p><p class="ks-rsub">${A(SC.riderNote)}</p></div>${ui.btn(SC.call, { variant: 'secondary', size: 'sm', iconLeft: 'phone' })}</div>`;
  const detail = `<dl class="ks-detail"><div><dt>${A(SC.deliverToLabel)}</dt><dd>${A(SC.deliverTo)}</dd></div><div><dt>${A(SC.paidLabel)}</dt><dd class="ui-num">${A(SC.paid)}</dd></div></dl>`;
  return { prog, rider, detail };
}
function desktopScreen(ctx, dark) {
  const SC = S(ctx), ui = ctx.ui, T = trackBlock(ctx), links = navItems(ctx).slice(0, 3);
  return `<div class="ksz"><div class="ui kscreen" ${dark ? 'data-theme="dark"' : ''}>
<nav class="ui-topbar" aria-label="Main">${wordmark(ctx)}<div class="ui-topbar__links">${ui.links(links, 0)}</div><span class="ks-clock ui-num">${A(SC.time)}</span></nav>
<div class="ks-main">
<section class="ks-track" aria-label="${A(ctx.brand.ui.screen.title)}"><p class="ks-title">${A(ctx.brand.ui.screen.title)}</p>
<div class="ks-eta"><h2 class="ui-display ks-time">${A(SC.eta)}</h2>${ui.statusChip('producing')}</div>
<p class="ks-pickup">${A(SC.pickup)}</p><div class="ks-prog">${T.prog}</div>${T.rider}${T.detail}${ui.btn(SC.share, { variant: 'secondary', block: true })}</section>
<section class="ks-deliv" aria-label="Installs"><p class="ks-title">Installs</p>${ui.deliveryRows(4)}<div class="ks-book">${ui.btn(SC.form.book, { iconRight: 'arrow-right' })}</div></section>
</div></div></div>`;
}
function phoneScreen(ctx) {
  const SC = S(ctx), ui = ctx.ui, T = trackBlock(ctx);
  const pin = (n, y) => `<i class="kpn" style="top:${y}px">${n}</i>`;
  return `<div class="ui kphone">${pin(1, 18)}${pin(2, 62)}${pin(3, 306)}${pin(4, 548)}${pin(5, 612)}
<div class="kph-top"><span class="ui-num">${A(SC.time)}</span>${wordmark(ctx)}</div>
<div class="kph-body"><span class="kph-chip">${ui.statusChip('producing')}</span><h2 class="ui-display kph-time">${A(SC.eta)}</h2><p class="ks-pickup">${A(SC.pickup)}</p><div class="ks-prog">${T.prog}</div>${T.rider}${T.detail}${ui.btn(SC.share, { variant: 'secondary', block: true })}</div>
<nav class="ui-tabbar" aria-label="Sections">${navItems(ctx).map(([t, i], k) => `<a href="#"${k === 0 ? ' aria-current="page"' : ''}>${ui.icon(i, 20)}${A(t)}</a>`).join('')}</nav></div>`;
}
function screenPage(ctx, id, dark) {
  const sunbelt = roleColour(ctx, 'action').name;
  const tbl = `<table class="st kparts"><thead><tr><th style="width:100px">Part</th><th style="width:80px">Set in</th><th>Note</th></tr></thead><tbody>${[
    ['Top bar', 'navigation', 'The wordmark, three links, the clock.'], ['Status', 'status', `The live state, ${ctx.status.find((s) => s.id === 'producing').label}, beside the headline.`], ['Row list', 'lists', 'Each install with its own status.'], ['Buttons', 'buttons', `One filled: ${A(S(ctx).form.book)}. The rest are outlines.`],
  ].map(([a, r, n]) => `<tr><td>${A(a)}</td><td class="num">§${refOf(ctx, r)}</td><td class="kq">${n}</td></tr>`).join('')}</tbody></table>`;
  return kpage(ctx, id, {
    lede: dark ? `The same screen on ${A(roleName(ctx, 'text'))}. No markup changes: the page sets one attribute and every component follows.` : 'The Install day screen, built only from the components in this kit. Nothing on it is drawn for the page.',
    body: `${fig(desktopScreen(ctx, dark), `${A(ctx.brand.ui.screen.title)}${dark ? ', dark' : ''}`, `Shown at 76% of a 900 px window.`)}<div class="ksgap"></div>${tb('Parts of the screen', tbl)}`,
    rules: [`One filled button: “${A(S(ctx).form.book)}”. Everywhere else ${A(sunbelt)} marks a live state: the progress dot.`, dark ? `Dark is ${m('data-theme="dark"')} on any ancestor. Text, edges and the focus ring keep their ratios; ${A(sunbelt)} stays as it is.` : 'The headline is the live status in words. The status words repeat it, so the colour is never the only cue.'],
  });
}
function screenMobile(ctx) {
  const SC = S(ctx), sunbelt = roleColour(ctx, 'action').name;
  const notes = [['Top', `Time and wordmark. No back arrow on the first screen.`, 'navigation'], ['Status', `Chip, then the headline in the display face.`, 'status'], ['Crew', 'Avatar, name, one outline button.', 'buttons'], ['Share', 'Full-width outline. The only button above the bar.', 'buttons'], ['Tab bar', 'Four items, 64 px, the current one marked.', 'navigation']];
  const list = `<table class="st kparts"><thead><tr><th style="width:26px">No.</th><th>Part</th><th class="r" style="width:36px">Set in</th></tr></thead><tbody>${notes.map(([a, b, r], i) => `<tr><td class="num">${i + 1}</td><td><b class="kb2">${A(a)}</b><span class="kq kb3">${A(b)}</span></td><td class="r num">§${refOf(ctx, r)}</td></tr>`).join('')}</tbody></table>`;
  return kpage(ctx, 'screen-mobile', {
    lede: 'The same screen at 390 px. The two columns become one, the install list moves to its own tab, and the tab bar takes over from the top bar.',
    flip: true, fw: 392, left: tb('Numbered parts', list), right: fig(phoneScreen(ctx), `${A(ctx.brand.ui.screen.title)}, 390 px`, 'Light. Actual size.'),
    rules: [`One ${A(sunbelt)} fill above the fold, and it is a status, not a button.`, 'Every target is 44 px or more, and the tab bar clears the home indicator.'],
  });
}

// ---- 4.1 token reference: every token on one page, light and dark side by side
function tokens(ctx) {
  const L = colourMap(ctx, 'light'), D = colourMap(ctx, 'dark'), g = tokenGroups(ctx);
  const cr = Object.keys(L).filter((k) => !k.startsWith('status-')).map((k) => `<tr><td>${m('--' + k)}</td><td><i class="ktw" style="background:${L[k]}"></i>${m(L[k])}</td><td><i class="ktw ktw--d" style="background:${D[k]}"></i>${m(D[k])}</td></tr>`).join('');
  const colour = `<table class="st ktk"><thead><tr><th style="width:128px">Token</th><th>Light</th><th>Dark</th></tr></thead><tbody>${cr}</tbody></table>`;
  const grp = (name, rows) => `<table class="st ktk"><thead><tr><th style="width:128px">Token</th><th>Value</th></tr></thead><tbody>${rows.map(([k, v]) => `<tr><td>${m('--' + k)}</td><td>${m(v)}</td></tr>`).join('')}</tbody></table>`;
  const type = ctx.uiType.map((t) => [`type-${t.token}`, `${t.size} / ${t.line} / ${t.weight}`]);
  const radius = Object.entries(g.radius).filter(([k]) => ['r-control', 'r-card', 'r-round'].includes(k)).map(([k, v]) => [k, v.replace('9999px', 'full')]);
  const right = [['Space', Object.entries(g.space)], ['Radius', radius], ['Width', Object.entries(g.width)], ['Type, size / line / weight', type], ['Shadow', Object.entries(g.shadow)]].map(([n, r]) => tb(n, grp(n, r)));
  return kpage(ctx, 'tokens', {
    lede: `Every value the components read, by name. Colour is set twice, light on ${m(':root')} and dark on ${m('[data-theme="dark"]')}. The rest is the same in both.`,
    left: tb('Colour, light and dark', colour), right, fw: 306,
    note: `Sizes and widths are px. A number in a type row is size, line height, weight. The same values ship as ${m('tokens.css')}, ${m('tokens.json')}, ${m('tokens.ts')} and ${m('tailwind.css')}.`,
  });
}

// ---- 4.2 the code package
function code(ctx) {
  const SC = S(ctx);
  const files = [['README.md', 'Install, use, the token names.'], ['tokens.css', 'Custom properties, light and dark.'], ['tokens.json', 'The same values, DTCG format.'], ['tokens.ts', 'Typed export of the values.'], ['tailwind.css', 'A Tailwind v4 theme block.'], ['components.css', 'Working classes for every component here.'], ['example.html', 'Every component live, with a light and dark switch.'], ['fonts.css', `${A(ctx.brand.fonts.display.family)} and ${A(ctx.brand.fonts.body.family)}.`], ['assets/', 'Logo and icons.']];
  const ft = `<table class="st kcd"><thead><tr><th style="width:116px">File</th><th>Holds</th></tr></thead><tbody>${files.map(([a, b]) => `<tr><td>${m(a)}</td><td class="kq">${b}</td></tr>`).join('')}</tbody></table>`;
  const cls = [['Buttons', '.ui-btn'], ['Fields', '.ui-field .ui-input'], ['Choices', '.ui-choice .ui-switch'], ['Cards', '.ui-card .ui-stat'], ['Navigation', '.ui-topbar .ui-tabs .ui-tabbar'], ['Lists', '.ui-list .ui-row'], ['Status', '.ui-chip .ui-badge'], ['Feedback', '.ui-alert .ui-toast'], ['Dialog', '.ui-dialog .ui-scrim'], ['Table', '.ui-table'], ['Empty', '.ui-empty']];
  const ct = `<table class="st kcd"><thead><tr><th style="width:80px">Component</th><th>Classes</th></tr></thead><tbody>${cls.map(([a, b]) => `<tr><td>${A(a)}</td><td>${m(b)}</td></tr>`).join('')}</tbody></table>`;
  const snip = `<pre class="kpre"><code>&lt;link rel="stylesheet" href="fonts.css"&gt;
&lt;link rel="stylesheet" href="tokens.css"&gt;
&lt;link rel="stylesheet" href="components.css"&gt;

&lt;body class="ui" data-theme="light"&gt;
  &lt;button class="ui-btn" type="button"&gt;${A(SC.form.book)}&lt;/button&gt;
&lt;/body&gt;</code></pre>`;
  return kpage(ctx, 'code', {
    lede: 'The code package carries every component in this kit as working HTML and CSS, built on the tokens and nothing else. Copy the folder, link three stylesheets, and the classes work.',
    left: tb('Files in the package', ft), right: tb('Class names, with a modifier such as .ui-btn--secondary', ct), fw: 300,
    body: fig(snip, 'Use', 'Link in this order. Set data-theme to dark on the body or the html element to switch.'),
    rules: ['Never write a hex or a pixel value in a component. Use a token, and change the token if the value must change.', 'Keep the order: fonts, tokens, components. A component reads a token that must already exist.', `${m('example.html')} is the reference. If a component there differs from a page in this kit, the page is right and the code is a bug.`],
  });
}

export const uikit = {
  cover(ctx) {
    const B = ctx.brand, slot = ctx.edition === 'slot', act = roleColour(ctx, 'action');
    const s = ctx.sections;
    const mark = slot
      ? `<span class="disp kk-name">${A(B.name).replace(' ', '<br>')}</span>`
      : ctx.logo.html('colour', { width: 300, label: 'Your logo goes here' });
    // document control: numbered like clauses, so the cover reads as the standard's first page
    const meta = [['Version', m(B.version.number)], ['Issued', A(issued(ctx))], ['Covers', `§${s[0].n} ${A(s[0].title)} to §${s[s.length - 1].n} ${A(s[s.length - 1].title)}`], ['Read with', `${A(B.name)} brand guidelines ${m(B.version.number)}`], ['Action colour', `<i class="kk-chip"></i>${m('color.action.fill')} ${m(act.hex)}`]];
    return `<section class="pg pg--std pg--kcover" data-page="cover"><div class="kk-bar"></div>${head(ctx, 'cover')}
<div class="kk-logo">${mark}</div>
<div class="kk-main"><p class="kk-n">UI kit</p><h1 class="disp kk-t">Design tokens and components</h1><p class="lede">${A(B.product)}</p></div>
<h2 class="h3 kk-h">Document control</h2>
<ol class="kk-ctl">${meta.map(([k, v], i) => `<li><span class="num">0.${i + 1}</span><span>${k}</span><span>${v}</span></li>`).join('')}</ol>
<div class="notes"><p>Values set in ${m('mono')} are literal. Copy them as written.</p><p>A § number points to the section that sets the rule. Change a value there, never where it is quoted.</p></div>
</section>`;
  },

  contents(ctx) {
    const rows = ctx.sections.map((s) => `<tr class="h"><td>§${s.n}</td><td>${A(s.title)}</td><td class="r">${s.pages[0].no}</td></tr>${s.pages.map((p) => `<tr><td>${p.ref}</td><td>${A(p.title)}</td><td class="r">${p.no}</td></tr>`).join('')}`).join('');
    return `<section class="pg pg--std" data-page="contents">${head(ctx, 'contents')}<h1 class="t">Contents</h1>
<table class="st kct"><thead><tr><th style="width:64px">Clause</th><th>Title</th><th class="r" style="width:48px">Page</th></tr></thead><tbody>${rows}</tbody></table>
<div class="notes" style="margin-top:auto"><p>The code package carries every component on these pages as working HTML and CSS, built only on the tokens in §4.</p><p>A page number is the folio at the foot of the page. Section numbers are the references used in the rules.</p></div></section>`;
  },

  'colour-light': (ctx) => colourPage(ctx, 'colour-light', 'light'),
  'colour-dark': (ctx) => colourPage(ctx, 'colour-dark', 'dark'),
  'type-scale': typeScale,
  spacing,
  'radii-borders': radiiBorders,
  elevation,
  states,
  buttons,
  inputs,
  choices,
  cards,
  navigation,
  lists,
  status,
  feedback,
  dialog,
  table,
  empty,
  'screen-light': (ctx) => screenPage(ctx, 'screen-light', false),
  'screen-dark': (ctx) => screenPage(ctx, 'screen-dark', true),
  'screen-mobile': screenMobile,
  tokens,
  code,
  // @@END pages
};
