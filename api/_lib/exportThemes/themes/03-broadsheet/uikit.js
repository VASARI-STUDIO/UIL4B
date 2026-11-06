// UI kit document pages for theme 03 (Broadsheet): the 25 ids of engine/pages.js UIKIT_PAGES, one 1280 x 720 page each.
// Every component is the real engine component (ctx.ui) inside a .ui region, so a page shows what components.css ships.
// Each page is a newspaper page, and the page types differ the way a paper's do:
//   front page (frontPage): the headline and the component as the lead story, the rules boxed out in a sidebar on the right.
//   story page (storyPage): the headline and the rules as the story on the left, the exhibits beside them.
//   fold page (foldPage): a big headline, the exhibit across the measure, the rules as briefs in ruled columns below the fold.
//   band page (bandPage): headline and rules as a band across the top, the exhibit below.
//   and the markets page (colour), the front-page anatomy (type scale), the weather strip (status), the product itself (screens).
// Styles are in css-kit.js.
import { A, ratioText } from './helpers.js';
import { colourMap, tokenGroups, statusText } from '../../engine/tokens.js';

const m = (s) => `<span class="mono">${A(s)}</span>`;
const rt = (ctx, a, b) => ratioText(ctx.fmt(ctx.ratio(a, b)));
const sc = (ctx) => ctx.brand.ui.screen.content;
const roleColour = (ctx, r) => ctx.colours.find((c) => c.role === r);
const NUM = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const cap1 = (s) => s.charAt(0).toUpperCase() + s.slice(1);
// "Finger limes, Riverland" -> ["Finger limes", "Riverland"]
const split = (d) => { const [item, ...rest] = d.to.split(', '); return [item, rest.join(', ')]; };
// the demo copy for the kit: brand data ui.screen.content.example, else neutral words (same defaults as the engine's example.html)
const X = (ctx) => ({ secondary: 'Secondary', quiet: 'Skip', danger: 'Delete', small: 'Add', account: 'Account', checks: ['Checked', 'Unchecked', 'Disabled'], switches: ['Switch on', 'Switch off'], radios: ['First choice', 'Second choice'], statLabel: 'Total', crumbs: ['Home', 'Section'], tabs: ['One', 'Two', 'Three'], links: [['One', 'map-pin'], ['Two', 'plus'], ['Three', 'clock']], ...(sc(ctx).example || {}) });
const navItems = (ctx) => [...X(ctx).links, [X(ctx).account, 'user']];
const bookLabel = (ctx) => `${sc(ctx).form.book}, ${sc(ctx).paid}`;

// ---- frames and small parts
// a page: the running head (brand, "UI kit: page", folio) over a double rule, then a .ui region that holds the page
function kstd(ctx, id, inner, cls = '') {
  const p = ctx.pages.find((x) => x.id === id);
  return `<section class="pg pg--std pg--k ${cls}" data-page="${id}"><div class="hd"><span class="nm">${A(ctx.brand.name)}</span><span class="tt">UI kit: ${A(p.title)}</span><span class="fo">${ctx.pageNo(id)}</span></div><div class="ui kb">${inner}</div></section>`;
}
const headline = (t, cls = '') => `<h2 class="headline ${cls}">${A(t)}</h2>`;
const cols = (tpl, cells, cls = '') => `<div class="kc ${cls}" style="grid-template-columns:${tpl}">${cells.map((c) => `<div class="kcol">${c}</div>`).join('')}</div>`;
const col = (title, inner) => `<h3 class="kh3">${A(title)}</h3>${inner}`;
const rules = (items) => `<ul class="krules">${items.map((t) => `<li>${t}</li>`).join('')}</ul>`;
const cap = (b, t = '') => `<span class="kcap"><b>${A(b)}</b>${t}</span>`;
const cell = (inner, b, t) => `<div class="kcell">${inner}${b ? cap(b, t) : ''}</div>`;
const na = (t = 'Not used') => `<span class="kna">${A(t)}</span>`;
const uniq = (html, tag) => html.replace(/dlg-t/g, tag);
// front page: headline and lead story on the left, the sidebar (boxed out by rules) on the right
const aside = (...blocks) => `<aside class="kside">${blocks.join('<div class="kgap"></div>')}</aside>`;
const frontPage = (ctx, id, head, lead, side, { w = 300, cls = '' } = {}) => kstd(ctx, id, `<div class="kA" style="grid-template-columns:minmax(0,1fr) ${w}px"><div class="kl">${headline(head)}${lead}</div>${side}</div>`, cls);
// story page: the headline and the rules as the story on the left, the exhibits beside it
const storyPage = (ctx, id, head, ruleItems, lead, { w = 300, cls = '', rev = false, extra = '' } = {}) => {
  const story = `<div class="kl kstory">${headline(head, 'headline--s')}${rules(ruleItems)}${extra}</div>`, exh = `<div class="kl kexh">${lead}</div>`;
  return kstd(ctx, id, `<div class="kA kS${rev ? ' kS--rev' : ''}" style="grid-template-columns:${rev ? `minmax(0,1fr) ${w}px` : `${w}px minmax(0,1fr)`}">${rev ? exh + story : story + exh}</div>`, cls);
};
// fold page: a big headline, the exhibit, then briefs in ruled columns below the fold
const foldPage = (ctx, id, head, lead, briefs, { xl = false, cls = '' } = {}) => kstd(ctx, id, `<div class="kB"><div class="kB-top">${headline(head, xl ? 'headline--xl' : '')}</div><div class="kB-lead">${lead}</div><ul class="kfold" style="grid-template-columns:repeat(${briefs.length},minmax(0,1fr))">${briefs.map((t) => `<li>${t}</li>`).join('')}</ul></div>`, cls);
// band page: headline left, the rules in ruled columns right, the exhibit under a double rule
const bandPage = (ctx, id, head, ruleItems, lead, { cls = '' } = {}) => kstd(ctx, id, `<div class="kband">${headline(head, 'headline--s')}<ul class="kfold kfold--band" style="grid-template-columns:repeat(${ruleItems.length},minmax(0,1fr))">${ruleItems.map((t) => `<li>${t}</li>`).join('')}</ul></div><div class="kband-lead">${lead}</div>`, cls);
// "Inside": the pages whose components make up a screen, as leader lines to the folio
const inside = (ctx, ids) => `<h3 class="kh3 kh3--d kinside">Parts, by page</h3><ol class="kidx kidx--s">${ids.map((id) => { const p = ctx.pages.find((x) => x.id === id); return `<li><span>${A(p.title)}</span><i class="kdots"></i><span class="num">${ctx.pageNo(id)}</span></li>`; }).join('')}</ol>`;
// a row for the shop's list: item, region under it, price in the action colour, optional status chip
const itemRow = (ctx, d, { lead, chip = true, href } = {}) => {
  const [item, region] = split(d);
  return ctx.ui.row({ lead, title: item, sub: `${region}${region ? ', ' : ''}${d.when}`, endHtml: `<span class="kpr ui-num">${A(d.price)}</span>${chip ? ctx.ui.statusChip(d.status) : ''}`, href });
};

// ---- colour roles, one list for light and dark: the markets page
// min = the ratio a pair has to reach (null where it is not a text or edge pair)
function roleRows(ctx, mode) {
  const M = colourMap(ctx, mode);
  const R = (a, b) => rt(ctx, M[a], M[b]);
  const g = (label, tok) => [label, tok, 'Text on it', R('text', tok), 4.5];
  const t = (label, tok, bgTok, note) => [label, tok, note, R(tok, bgTok), 4.5];
  const st = (label, tok) => [label, tok, 'Words on the page ground', R(tok, 'surface'), 4.5];
  return [
    g('Surface', 'surface'), g('Raised', 'raised'), g('Sunken', 'sunken'),
    t('Text', 'text', 'surface', 'On surface'), t('Soft text', 'text-soft', 'surface', 'On surface'), t('Quiet text', 'quiet', 'surface', 'On surface'), t('Quiet on sunken', 'quiet-sunken', 'sunken', 'On sunken'),
    ['Control edge', 'edge', 'On surface', R('edge', 'surface'), 3],
    ['Divider', 'divider', 'Decoration', R('divider', 'surface'), null],
    ['Focus ring', 'focus', 'On surface', R('focus', 'surface'), 3],
    ['Action', 'action', 'Fill on surface', R('action', 'surface'), 3],
    ['Action hover', 'action-hover', 'Label on it', R('action-label', 'action-hover'), 4.5],
    ['Action pressed', 'action-pressed', 'Label on it', R('action-label', 'action-pressed'), 4.5],
    ['Action label', 'action-label', 'On action', R('action-label', 'action'), 4.5],
    ['Disabled text', 'disabled-text', 'On --disabled-bg', R('disabled-text', 'disabled-bg'), 4.5],
    ['Scrim', 'scrim', 'Behind dialogs', null, null],
    st('Success', 'success'), st('Warning', 'warning'), st('Danger', 'danger'), st('Info', 'info'),
  ].map(([label, tok, note, ratio, min]) => ({ label, tok, val: M[tok], note, ratio, min }));
}
// one listing line, like a share price: inline square, role, token, value, ratio, the forecast (pass mark), use
const roleRow = (r) => {
  const pass = r.min == null || !r.ratio ? 'Not a pair' : parseFloat(r.ratio) >= r.min ? `Pass at ${r.min}` : `Below ${r.min}`;
  return `<div class="kmr"><i class="kmq" style="background:${r.val}"></i><b>${A(r.label)}</b>${m('--' + r.tok)}${m(r.val)}<span class="kmn num">${r.ratio || 'Overlay'}</span><span class="kmf">${pass}</span><span class="kmu">${A(r.note)}</span></div>`;
};

function colourPage(ctx, id, mode) {
  const dark = mode === 'dark', M = colourMap(ctx, mode);
  const act = roleColour(ctx, 'action'), mk = roleColour(ctx, 'mark');
  const light = [
    `Roles name a job, not a colour. Components read ${m('--action')}, never a palette name, so a change of mode touches no markup.`,
    'Every text pair is measured. Text under 24 px needs 4.5 : 1. Edges, the focus ring and fills against their ground need 3 : 1.',
    mk ? `${A(mk.name)}: ${A(mk.lands)}` : '',
  ].filter(Boolean);
  const night = [
    `Dark keeps every name and changes the value behind it. A component never knows which mode it is in.`,
    `Edges are measured again in dark: the control edge is ${rt(ctx, M.edge, M.surface)} on the ground and the focus ring ${rt(ctx, M.focus, M.surface)}.`,
  ];
  const photoCap = dark ? `${act ? A(act.name) : 'The action'} is lifted to ${m(M.action)} so it holds ${rt(ctx, M.action, M.surface)} on the dark ground. Its label turns to ${m(M['action-label'])}.` : act ? `<b>${A(act.name)}</b>${A(act.lands)}` : '';
  const head = `<div class="kmr kmr--h"><i></i><span>Role</span><span>Token</span><span>Value</span><span class="kmn">Ratio</span><span>Forecast</span><span>Use</span></div>`;
  const list = `<div class="kmk-list${dark ? ' ui kdk' : ''}"${dark ? ' data-theme="dark"' : ''}>${head}${roleRows(ctx, mode).map(roleRow).join('')}</div>`;
  const title = dark ? 'Dark swaps the values, not the names.' : 'Roles name a job, not a colour.';
  const photo = `<figure class="kph"><div class="kph-sw" style="background:${dark ? M.action : act ? act.hex : M.action}"></div><figcaption class="kcap kcap--ink">${photoCap}</figcaption></figure>`;
  const story = `<div class="kmk-story">${headline(title, 'headline--s')}${photo}${rules(dark ? night : light)}</div>`;
  return kstd(ctx, id, `<div class="kmk"><div class="kmk-l">${list}</div>${story}</div>`, dark ? 'pg--kdark' : '');
}

// ---- screens: the shop's order page
const wordmark = (ctx) => `<strong class="ui-display kwm">${A(ctx.brand.logo.showcase.wordmark)}</strong>`;
const timeField = (ctx, k, active) => { const F = sc(ctx).form; return `<span class="ui-label">${A(F.size)}</span>${ctx.ui.segmented(F.sizes, active)}`; };

function desktopScreen(ctx, dark) {
  const S = sc(ctx), F = S.form, ui = ctx.ui, N = navItems(ctx);
  const [, region0] = split(S.deliveries[0]);
  return `<div class="kscreen ui" ${dark ? 'data-theme="dark"' : ''}>
<nav class="ui-topbar" aria-label="Main">${wordmark(ctx)}<div class="ui-topbar__links">${ui.links(N.slice(0, 3), 0)}</div><span class="ks-clock ui-num">${A(S.deliverTo)}</span></nav>
<div class="ks-main">
<section class="ks-list" aria-label="${A(ctx.brand.ui.screen.title)}">
<h2 class="ks-h">${A(ctx.brand.ui.screen.title)}</h2>
<p class="ks-sub">${A(S.deliveries[0].when)}</p>
<ul class="ui-list">${S.deliveries.slice(0, 5).map((d) => itemRow(ctx, d)).join('')}</ul>
</section>
<section class="ks-order" aria-label="${A(F.title)}">
<h2 class="ks-h">${A(F.title)}</h2>
${ui.field({ id: `ks-n${dark ? 'd' : 'l'}`, label: F.pickup, value: F.pickupValue })}
${ui.field({ id: `ks-m${dark ? 'd' : 'l'}`, label: F.dropoff, value: F.dropoffValue })}
<div class="ks-time">${timeField(ctx, 0, 1)}</div>
${ui.btn(bookLabel(ctx), { block: true })}
</section>
</div></div>`;
}

function phoneScreen(ctx) {
  const S = sc(ctx), F = S.form, ui = ctx.ui;
  return `<div class="kphone ui">
<div class="kph-top">${wordmark(ctx)}<span class="ui-num">${A(S.deliverTo.split(', ')[0])}</span></div>
<div class="kph-body">
<h2 class="ks-h">${A(ctx.brand.ui.screen.title)}</h2>
<p class="ks-sub">${A(S.deliveries[0].when)}</p>
<ul class="ui-list">${S.deliveries.slice(0, 4).map((d) => { const [item, region] = split(d); return ui.row({ title: item, sub: region, endHtml: `<span class="kpr ui-num">${A(d.price)}</span>` }); }).join('')}</ul>
<div class="ks-time">${timeField(ctx, 0, 0)}</div>
${ui.btn(bookLabel(ctx), { block: true })}
</div></div>`;
}

// ---- what each tone means, for the weather strip (the words are drawn in the tone's own colour, see statusText)
const chipMeaning = { info: 'Marks what is new or notable.', warning: 'Running out. Say how much is left.', success: 'Done or ready. Name the time.', danger: 'Gone for now. Say when it is back.', action: 'The one live state.', neutral: 'Settled. Nothing to do.' };

export const uikit = {
  // the front page: the logo as the nameplate across the full measure, the headline, the index in a ruled column
  cover(ctx) {
    const B = ctx.brand, ui = ctx.ui, slot = ctx.edition === 'slot';
    const mark = slot ? `<span class="disp kc-name">${A(B.name)}</span>` : ctx.logo.html('colour', { width: 600 });
    const toc = ctx.sections.map((s) => `<li><span>${A(s.title)}</span><i class="kdots"></i><span class="num">${s.pages[0].no}</span></li>`).join('');
    return `<section class="pg pg--kcover" data-page="cover">
<div class="kc-mast"><div class="ear"><b>UI kit</b><br>${A(`Edition ${B.version.number}`)}</div><div class="kc-np">${mark}</div><div class="ear r">${A(ctx.date)}<br>${A(B.city)}</div></div>
<p class="kc-dl">${A(B.lines.primary)}</p>
<div class="kc-body">
<div class="kc-main"><h1 class="kc-h">${A(B.lines.others[0])}</h1>
<p class="lead">${A(B.product)} Each piece is drawn at actual size, with the rule it follows.</p>
<div class="ui kc-btn">${ui.btn(bookLabel(ctx))}<span class="kcap">Shown at actual size.</span></div></div>
<div class="kc-r">${slot ? `<div class="kc-slot">${ctx.logo.html('colour', { width: 220, label: 'Your logo goes here' })}</div>` : ''}<ul class="kc-toc">${toc}</ul><blockquote class="kc-pull"><p>${A(B.lines.others[1])}</p><span class="kcap">A line in use.</span></blockquote></div>
</div></section>`;
  },

  // the index: the headline in the first column, one ruled column of leaders per section
  contents(ctx) {
    const li = (p) => `<li><span>${A(p.title)}</span><i class="kdots"></i><span class="num">${p.no}</span></li>`;
    const list = (s) => `<h3 class="kh3 kh3--d">${A(s.title)}</h3><ol class="kidx">${s.pages.map(li).join('')}</ol>`;
    const [f, c, p, h] = ctx.sections;
    const half = Math.ceil(c.pages.length / 2);
    const comp = `<h3 class="kh3 kh3--d">${A(c.title)}</h3><div class="kidx2"><ol class="kidx">${c.pages.slice(0, half).map(li).join('')}</ol><ol class="kidx">${c.pages.slice(half).map(li).join('')}</ol></div>`;
    const tail = `${list(p)}<div class="kgap"></div>${list(h)}`;
    const B = ctx.brand, fam = [...new Set([B.fonts.display.family, B.fonts.body.family])].join(' and ');
    const colo = [
      `<b>This edition</b>${A(B.name)} UI kit, edition ${A(B.version.number)}, ${A(ctx.date)}. ${A(B.city)}. Set in ${A(fam)}.`,
      `<b>How to read it</b>Each piece is drawn at actual size beside the rule it follows. Token names are set in monospace, like ${m('--action')}.`,
      `<b>In the package</b>The same tokens ship as CSS, JSON, TypeScript and a Tailwind theme. The last page lists every file.`,
    ];
    return kstd(ctx, 'contents', `${cols('250px minmax(0,1fr) minmax(0,2fr) minmax(0,1fr)', [headline('Contents', 'headline--m'), list(f), comp, tail])}<ul class="kfold kcolo" style="grid-template-columns:repeat(3,minmax(0,1fr))">${colo.map((t) => `<li>${t}</li>`).join('')}</ul>`, 'pg--kcontents');
  },

  'colour-light': (ctx) => colourPage(ctx, 'colour-light', 'light'),
  'colour-dark': (ctx) => colourPage(ctx, 'colour-dark', 'dark'),

  // front-page anatomy: each style set at its true size on the page, labelled in the margin with a leader rule and its spec
  'type-scale'(ctx) {
    const S = sc(ctx), F = S.form, B = ctx.brand;
    const sample = { caption: F.notesHelp, label: F.pickup, body: S.pickup, control: F.book, 'title-s': S.dialog.title, title: B.ui.screen.title, headline: S.eta };
    const rows = [...ctx.uiType].reverse().map((t) => {
      const face = t.face === 'display' ? 'font-family:var(--ff-display);letter-spacing:-0.01em;' : 'font-family:var(--ff-body);';
      return `<div class="kfp"><div class="kfp-l"><span class="kfp-t"><span class="mono">${A(t.token)}</span><i class="kld"></i></span><span class="kfp-s"><span class="mono">${t.size} / ${t.line} / ${t.weight}</span> ${A(t.use)}</span></div><span class="kts" style="${face}font-size:${t.size}px;line-height:${t.line}px;font-weight:${t.weight}">${A(sample[t.token] || t.use)}</span></div>`;
    }).join('');
    const l = rules([
      `${A(B.fonts.display.family)} for titles and the one big line. ${A(B.fonts.body.family)} for everything people read.`,
      'Sizes are px, then line height in px, then weight. Numbers that change use tabular figures, so a price never shifts.',
      'Nothing on screen is smaller than 12 px.',
    ]);
    const n = ctx.uiType.length;
    const fc = (f, role, use) => `<div class="kface"><span class="kface-a" style="font-family:var(--ff-${role});font-weight:400">Aa</span><b>${A(f.family)}</b><span class="kcap">${use}</span></div>`;
    const faces = `<div class="kfaces">${fc(B.fonts.display, 'display', 'Titles and the one big line')}${fc(B.fonts.body, 'body', 'Everything people read')}</div>`;
    return kstd(ctx, 'type-scale', `<div class="kA kfp-page" style="grid-template-columns:minmax(0,1fr) 300px"><div class="kfp-sheet">${rows}</div><aside class="kside">${headline(`Two faces, ${NUM[n] || n} sizes.`, 'headline--s')}${l}<div class="kgap"></div>${col('The faces', faces)}</aside></div>`);
  },

  // a bar chart: each step drawn at actual size, one ruled column apiece
  spacing(ctx) {
    const base = ctx.brand.ui.spacingBase;
    const uses = ['Inside a tight pair', 'Icon to label', 'Gaps in a row, field padding', 'Card padding', 'Dialog padding, button sides', 'Empty state padding', 'Between groups', 'Between sections'];
    const chart = `<div class="ksp">${ctx.space.map((s, i) => `<div class="ksp-c"><div class="ksp-f"><i style="width:${s.px}px;height:${s.px}px"></i></div><span class="mono">--${s.token.replace('space-', 'sp-')}</span><b class="num">${s.px} px</b><span class="kcap">${A(uses[i] || '')}</span></div>`).join('')}</div><p class="kcap kcap--after">Drawn at actual size.</p>`;
    const l = [
      `Everything sits on a ${base} px step. A gap inside a group is smaller than the gap between groups, so grouping reads at a glance.`,
      44 % base === 0 ? `Controls are 44 px tall, which is ${NUM[44 / base] || 44 / base} steps. Small buttons are 36 px.` : 'Controls are 44 px tall. Small buttons are 36 px.',
    ];
    return foldPage(ctx, 'spacing', `Space on a ${base} px step.`, chart, l, { xl: true });
  },

  'radii-borders'(ctx) {
    const S = sc(ctx), ui = ctx.ui, [rc, rk, rr] = ctx.radii, [bh, bc, bf] = ctx.borders;
    const [item, region] = split(S.deliveries[0]);
    const rad = [
      cell(ui.btn(S.form.book), `${rc.token}, ${rc.px} px`, A(rc.use)),
      cell(`<div class="ksp-card">${ui.card({ meta: region, title: item, text: S.deliveries[0].when })}</div>`, `${rk.token}, ${rk.px} px`, A(rk.use)),
      cell(`<div class="krow2"><span class="ui-avatar">${A(S.initials)}</span>${ui.switch(X(ctx).switches[0], { checked: true })}</div>`, `${rr.token}, round`, A(rr.use)),
    ].join('');
    const bor = [
      cell(`<ul class="ui-list">${ui.row({ title: item, sub: region, end: S.deliveries[0].price })}</ul>`, `${bh.token}, ${bh.px} px`, A(bh.use)),
      cell(ui.field({ id: 'rb1', label: S.form.pickup, value: S.form.pickupValue }), `${bc.token}, ${bc.px} px`, A(bc.use)),
      cell(ui.field({ id: 'rb2', label: S.form.dropoff, value: S.form.dropoffValue, state: 'focus' }), `${bf.token}, ${bf.px} px`, A(bf.use)),
    ].join('');
    const l = rules([
      rc.px === 0 ? 'Controls and cards have square corners. Only radios, switches and avatars are round.' : `Controls take a ${rc.px} px radius and cards ${rk.px}. Round is for radios, switches and avatars only.`,
      `Control edges are ${bc.px} px so they hold against the ground. Dividers stay at ${bh.px} px.`,
      'The focus ring sits outside the edge, on a 2 px gap of the ground colour, so it shows on any fill.',
    ]);
    const title = rc.px === 0 ? 'Corners are square.' : `Corners are ${rc.px} px.`;
    const px = (v) => (v >= 9999 ? 'round' : `${v} px`);
    const vals = [...ctx.radii.map((r) => [r.token, px(r.px)]), ...ctx.borders.map((b) => [b.token, px(b.px)])].map(([k, v]) => `<div class="ktk ktk--2"><span class="mono">--${A(k)}</span>${m(v)}</div>`).join('');
    return frontPage(ctx, 'radii-borders', title, `<div class="ksec">${col('Radius', `<div class="kr3">${rad}</div>`)}</div><div class="ksec ksec--b">${col('Border width', `<div class="kr3">${bor}</div>`)}</div>`, aside(col('Rules', l), col('Values', vals)), { w: 280 });
  },

  elevation(ctx) {
    const S = sc(ctx), ui = ctx.ui, B = ctx.brand, flat = B.ui.shadows === 'none';
    const [item, region] = split(S.deliveries[0]);
    const steps = [['Surface', 'surface', 'The page and every card on it'], ['Raised', 'raised', 'Raised cards, sidebars, table headers'], ['Sunken', 'sunken', 'Panels, avatars, skeletons']]
      .map(([n, t, u]) => `<div class="kstep"><span class="kstep-sw" style="background:var(--${t})"></span>${cap(n, `${m('--' + t)}<br>${A(u)}`)}</div>`).join('');
    const dlg = uniq(ui.dialog({ title: S.dialog.title, body: S.dialog.body, confirm: S.dialog.confirm, keep: S.dialog.keep, danger: true }), 'dlg-el');
    const l = rules([A(B.ui.elevationNote), flat ? `${m('--shadow-float')} is ${m('none')}. There is no blur, no spread and no glow anywhere in the kit.` : `${m('--shadow-float')} is ${m(String(tokenGroups(ctx).shadow['shadow-float']))}, and only a floating layer takes it.`, 'Depth is three things only: a step in the ground, a hairline, or a control edge.']);
    const g2 = `<div class="kcell">${ui.card({ meta: region, title: item, text: S.deliveries[0].when })}${cap('Card', `${m('--divider')} at ${ctx.borders[0].px} px. A raised card drops the line.`)}</div>`;
    const g3 = `<div class="kcell"><div class="ui-scrim kscrim">${dlg}</div>${cap('Dialog', `${ctx.borders[1].px} px edge in ${m('--text')}, on a ${m('--scrim')} ground.`)}</div>`;
    const g4 = `<div class="kcell"><div class="ktoast">${ui.toast(S.toast)}</div>${cap('Toast', 'Floats at the foot of the screen and leaves by itself.')}</div>`;
    const tg = tokenGroups(ctx), vals = Object.entries({ ...tg.shadow, ...tg.width }).map(([k, v]) => `<div class="ktk ktk--2"><span class="mono">--${A(k)}</span>${m(String(v))}</div>`).join('');
    return frontPage(ctx, 'elevation', flat ? 'Rules, not shadows.' : 'Shadows only where something floats.', cols('minmax(0,1fr) minmax(0,1.5fr)', [`${col('Hairline', g2)}<div class="kgap"></div>${col('Ground steps', `<div class="kstack">${steps}</div>`)}`, `${col('Floating', g3)}<div class="kgap"></div>${g4}`]), aside(col('Rules', l), col('Values', vals)), { w: 280 });
  },

  // the league table turned on its side: a row for each state, a column for each control
  states(ctx) {
    const S = sc(ctx), ui = ctx.ui, F = S.form, X_ = X(ctx);
    const colsH = [
      ['Rest', ''], ['Hover', `Action steps to ${m('--action-hover')}. Outlined controls fill ${m('--sunken')}.`], ['Focus', `A ${ctx.borders[2].px} px ring in ${m('--focus')}, on a ${ctx.borders[2].px} px gap.`],
      ['Pressed', `Action goes to ${m('--action-pressed')} and the control scales to 0.97.`], ['Disabled', `Dashed ${m('--quiet')} edge and type. The reason sits beside it.`], ['Error', `${m('--danger')} edge and a message under the field.`],
    ];
    const names = ['Primary button', 'Secondary button', 'Text field', 'Checkbox', 'Switch'];
    const btn = (variant, label) => (st) => ui.btn(label, { variant, state: st });
    const field = (st, id) => ui.field({ id, label: F.dropoff, value: F.dropoffValue, state: st });
    const data = [
      [undefined, 'hover', 'focus', 'pressed', 'disabled'].map(btn('primary', F.book)).concat(na()),
      [undefined, 'hover', 'focus', 'pressed', 'disabled'].map(btn('secondary', X_.secondary)).concat(na()),
      [field(undefined, 'st-r'), na('No change'), field('focus', 'st-f'), na(), ui.field({ id: 'st-d', label: F.dropoff, value: F.dropoffValue, disabled: true }), ui.field({ id: 'st-e', label: F.dropoff, value: F.readyValue, error: F.readyError })],
      [ui.check(X_.checks[2], { name: 'st-c1' }), na('No change'), ui.check(X_.checks[2], { state: 'focus' }), na(), ui.check(X_.checks[2], { disabled: true }), na()],
      [ui.switch(X_.switches[1], { checked: true }), na('No change'), ui.switch(X_.switches[1], { checked: true, state: 'focus' }), na(), ui.switch(X_.switches[1], { disabled: true }), na()],
    ];
    const head = `<div class="kmx-h"></div>${names.map((n) => `<div class="kmx-h"><b>${A(n)}</b></div>`).join('')}`;
    const rows = colsH.map(([n, r], k) => `<div class="kmx-r kmx-r--s"><b>${A(n)}</b><span class="kcap">${r}</span></div>${data.map((d) => `<div class="kmx-c">${d[k]}</div>`).join('')}`).join('');
    return kstd(ctx, 'states', `${headline('Every control, every state.', 'headline--s')}<div class="kmx kmx--st">${head}${rows}</div>`);
  },

  buttons(ctx) {
    const S = sc(ctx), F = S.form, ui = ctx.ui, X_ = X(ctx), R = ctx.roles.light;
    const act = roleColour(ctx, 'action'), ctl = ctx.uiType.find((t) => t.token === 'control');
    const padPx = ctx.space[4].px, H = 44, Z = 2, bw = ctx.brand.fonts.body.family;
    const textName = ctx.tones.find((t) => t.role === 'label')?.name || 'label';
    const draw = `<div class="kdraw">
<span class="kd" style="left:28px;top:20px;width:1px;height:${H * Z}px"></span><span class="kd" style="left:23px;top:20px;width:11px;height:1px"></span><span class="kd" style="left:23px;top:${19 + H * Z}px;width:11px;height:1px"></span>
<span class="kd-v mono" style="left:0;top:${20 + H * Z / 2 - 8}px;width:20px;text-align:right">${H}</span>
<div class="kzoom" style="left:56px;top:20px">${ui.btn(F.book)}</div>
<span class="kd" style="left:56px;top:${H * Z + 36}px;width:${padPx * Z}px;height:1px"></span><span class="kd" style="left:56px;top:${H * Z + 31}px;width:1px;height:11px"></span><span class="kd" style="left:${55 + padPx * Z}px;top:${H * Z + 31}px;width:1px;height:11px"></span>
<span class="kd-v mono" style="left:56px;top:${H * Z + 44}px;width:${padPx * Z}px;text-align:center">${padPx}</span>
<span class="kd-n" style="left:130px;top:${H * Z + 28}px">Label: ${A(bw)} ${ctl.weight}, ${ctl.size} px. ${A(textName)} on ${A(act.name)}, ${rt(ctx, R.actionLabel, R.action)}</span>
</div>`;
    const variants = [
      ['Secondary', ui.btn(X_.secondary, { variant: 'secondary' }), `${ctx.borders[1].px} px edge in the text colour.`],
      ['Quiet', ui.btn(X_.quiet, { variant: 'quiet' }), 'Underlined, no fill.'],
      ['Danger', ui.btn(S.dialog.confirm, { variant: 'danger' }), 'Only for what cannot be undone.'],
      ['Sizes', `<span class="kpair">${ui.btn(X_.small, { size: 'sm' })}${ui.btn(F.book, { size: 'lg' })}</span>`, 'Small is 36, large is 52. Large only once a screen.'],
    ].map(([n, b, d]) => `<div class="kvar"><span class="kcap"><b>${n}</b></span>${b}<span class="kcap">${d}</span></div>`).join('');
    const l = rules([
      `One ${A(act.name)} button a screen. Anything else a person can press is secondary.`,
      `The label says what happens: ${A(F.book)}. Once a choice is made, its price joins the label. Never Submit.`,
      `On hover the fill turns ${A(roleColour(ctx, 'text').name)} and the label stays light.`,
      `Focus is a 2 px ring in ${m('--focus')} outside a 2 px gap.`,
      `Until a choice is made the button is dashed, and the field beside it says why: ${A(F.bookWhy)}`,
    ]);
    const st = [['Rest', undefined], ['Hover', 'hover'], ['Focus', 'focus'], ['Pressed', 'pressed'], ['Disabled', 'disabled']].map(([n, s]) => `<div class="kst"><span class="kcap">${n}</span>${ui.btn(F.book, { state: s })}</div>`).join('');
    return frontPage(ctx, 'buttons', F.book, `${col('Measured', `${draw}<p class="kcap kcap--after">Drawn at twice actual size. Measurements are px at actual size.</p><div class="kvars">${variants}</div>`)}`, aside(col('Rules', l), col('At actual size', `<div class="kstack kstack--s kstack--2">${st}</div>`)), { w: 400 });
  },

  // the band page: headline and the two rules across the top, the grid of states below
  inputs(ctx) {
    const S = sc(ctx), F = S.form, ui = ctx.ui;
    const heads = ['Rest', 'Focus', 'Filled', 'Error', 'Disabled'];
    const f = (o) => `<div class="kcell">${ui.field(o)}</div>`;
    const sel = (id, st, extra = {}) => f({ id, label: F.size, kind: 'select', options: F.sizes, value: F.sizes[1], state: st, ...extra });
    const note = 'Level 2, ring the bell.';
    const grid = [
      ...heads.map((h) => `<div class="kmx-h"><b>${h}</b></div>`),
      f({ id: 'in-t1', label: F.pickup, placeholder: 'Name' }), f({ id: 'in-t2', label: F.pickup, state: 'focus', value: F.pickupValue.slice(0, 4) }), f({ id: 'in-t3', label: F.pickup, value: F.pickupValue }),
      f({ id: 'in-t4', label: F.ready, value: F.readyValue, error: F.readyError }), f({ id: 'in-t5', label: F.pickup, value: F.pickupValue, disabled: true }),
      sel('in-s1'), sel('in-s2', 'focus'), sel('in-s3', undefined, { value: F.sizes[2] }), sel('in-s4', undefined, { error: `Choose a ${F.size.toLowerCase()}.` }), sel('in-s5', undefined, { disabled: true }),
      f({ id: 'in-a1', label: F.notes, kind: 'textarea', help: F.notesHelp }), f({ id: 'in-a2', label: F.notes, kind: 'textarea', state: 'focus', value: note }), f({ id: 'in-a3', label: F.notes, kind: 'textarea', value: note }),
      f({ id: 'in-a4', label: F.notes, kind: 'textarea', error: 'Keep notes under 200 characters.', value: note }), f({ id: 'in-a5', label: F.notes, kind: 'textarea', disabled: true, value: note }),
    ].join('');
    return bandPage(ctx, 'inputs', 'Label above, hint below.', ['The label is always visible and sits above the field. A hint sits under it and turns into the error when there is one.', `An error says what to enter, not what went wrong: ${A(F.readyError)}`], `<div class="kgrid5">${grid}</div>`);
  },

  // checks, radios and switches: a row for each state, a column for each control; the segmented control beside them
  choices(ctx) {
    const ui = ctx.ui, F = sc(ctx).form, X_ = X(ctx);
    const rowsN = ['Off', 'On', 'Focus', 'Disabled', 'Disabled, on'];
    const chk = (label, type, name) => [ui.check(label, { type, name: name + 1 }), ui.check(label, { type, name: name + 2, checked: true }), ui.check(label, { type, name: name + 3, state: 'focus', checked: true }), ui.check(label, { type, name: name + 4, disabled: true }), ui.check(label, { type, name: name + 5, disabled: true, checked: true })];
    const sw = (label) => [ui.switch(label), ui.switch(label, { checked: true }), ui.switch(label, { state: 'focus', checked: true }), ui.switch(label, { disabled: true }), ui.switch(label, { disabled: true, checked: true })];
    const data = [chk(X_.checks[2], 'checkbox', 'cb'), chk(X_.radios[0], 'radio', 'rd'), sw(X_.switches[1])];
    const head = `<div class="kmx-h"></div>${['Checkbox', 'Radio', 'Switch'].map((n) => `<div class="kmx-h"><b>${n}</b></div>`).join('')}`;
    const rows = rowsN.map((n, k) => `<div class="kmx-r kmx-r--s"><b>${n}</b></div>${data.map((d) => `<div class="kmx-c">${d[k]}</div>`).join('')}`).join('');
    const grid = `<div class="kmx kmx--ch">${head}${rows}</div>`;
    const seg = `<div class="kstack">${cell(ui.segmented(F.sizes, 1), 'Segmented', 'One choice, always one selected. The selected segment fills with the text colour.')}${cell(ui.segmented(F.sizes, 0, { disabled: true }), 'Segmented, disabled', 'All segments go quiet together.')}</div>`;
    const cr = rules(['A checkbox takes many, a radio takes one. If the answer is yes or no, use a switch.', 'The label is part of the target. Press the words and the control changes.', 'A switch acts at once. A checkbox waits for the form to be sent.']);
    return frontPage(ctx, 'choices', 'Checks take many. Radios take one.', grid, aside(col('Rules', cr), seg), { w: 300 });
  },

  // the lead card as the lead story, two briefs stacked beside it, the stat in the last column
  cards(ctx) {
    const S = sc(ctx), ui = ctx.ui;
    const d = S.deliveries, [i0, r0] = split(d[3]), [i1, r1] = split(d[0]), [i2, r2] = split(d[1]);
    const media = ctx.photo('quandongs', { cls: 'ui-card__media', slotNote: false });
    const lead = cell(ui.card({ media, meta: r0, title: i0, text: `${d[3].when}. ${d[3].price}.`, action: `<div class="kcard-act">${ui.btn(X(ctx).secondary, { variant: 'secondary', size: 'sm' })}</div>` }), 'With media', 'The photo takes 16 : 9 and the card keeps its hairline.');
    const second = `${cell(ui.card({ meta: r1, title: i1, text: `${d[0].when}. ${d[0].price}.` }), 'Without media', 'Meta, title, one line.')}<div class="kgap"></div>${cell(ui.card({ meta: r2, title: i2, text: `${d[1].when}. ${d[1].price}.`, raised: true }), 'Raised', `${m('--raised')} ground and no edge, for a second level.`)}`;
    const stat = cell(`<div class="kstats">${ui.stat(S.paid, S.paidLabel)}${ui.stat(S.time, ctx.brand.ui.status[0]?.label || 'Time')}</div>`, 'Stat', 'One number, one label.');
    return kstd(ctx, 'cards', `<div class="kc kc--cards" style="grid-template-columns:1.5fr 1fr 0.7fr"><div class="kcol">${headline('A card holds one thing.', 'headline--m')}${lead}</div><div class="kcol kcol--top">${second}</div><div class="kcol kcol--top">${stat}</div></div>`);
  },

  // the top bar across the full measure like a nameplate, then the brief columns below the fold
  navigation(ctx) {
    const ui = ctx.ui, S = sc(ctx), N = navItems(ctx), X_ = X(ctx), act = roleColour(ctx, 'action');
    const top = `<nav class="ui-topbar ktop" aria-label="Main">${wordmark(ctx)}<div class="ui-topbar__links">${ui.links(N.slice(0, 3), 0)}</div></nav>`;
    const side = `<nav class="ui-sidebar" aria-label="Sections">${ui.links(N, 0)}</nav>`;
    const bar = `<nav class="ui-tabbar" aria-label="Sections">${N.map(([t, i], k) => `<a href="#"${k === 0 ? ' aria-current="page"' : ''}>${ui.icon(i, 20)}${A(t)}</a>`).join('')}</nav>`;
    const g = (t, inner, c) => `<div class="kg"><h3 class="kh3">${A(t)}</h3>${inner}<span class="kcap kcap--after">${c}</span></div>`;
    const lead = `${g('Top bar', top, `The current page has a 3 px bar in ${A(act.name)} under it. Links are 44 px tall.`)}<div class="kgap"></div>${cols('1.5fr 1fr 1fr', [`<div class="kstack kstack--n">${g('Tabs', ui.tabs(X_.tabs, 0), 'Tabs switch views of the same list. They do not change the page.')}${g('Breadcrumbs', ui.crumbs([...X_.crumbs, S.deliveries[0].to.split(', ')[0]]), 'Quiet, with the current page in full ink.')}</div>`, g('Sidebar', side, 'A bar on the left marks the current page.'), g('Mobile tab bar', `<div class="kbar">${bar}</div>`, 'Four destinations at most, 64 px tall.')])}`;
    const briefs = [`The current page is marked by a bar and by weight, never by colour alone.`, 'Four destinations at most on a phone. Anything more goes under Account.', 'Tabs change the view and links change the page. A breadcrumb shows the way back.'];
    return kstd(ctx, 'navigation', `<div class="kB"><div class="kB-top">${headline('Say where you are.')}</div><div class="kB-lead">${lead}</div><ul class="kfold" style="grid-template-columns:repeat(3,minmax(0,1fr))">${briefs.map((t) => `<li>${t}</li>`).join('')}</ul></div>`);
  },

  lists(ctx) {
    const ui = ctx.ui, S = sc(ctx), d = S.deliveries;
    const l = rules(['One row is one item. The name is the title, the place and time are the detail, and the price is set in the action colour.', 'Prices and times use tabular figures so a column lines up.', 'A row that opens is a link, and the whole row is the target.']);
    const main = `<ul class="ui-list">${d.slice(0, 5).map((x) => itemRow(ctx, x, { lead: ui.icon('shopping-basket', 18) })).join('')}</ul>`;
    const second = `<ul class="ui-list">${d.slice(0, 2).map((x) => itemRow(ctx, x, { chip: false })).join('')}</ul>`;
    const third = `<ul class="ui-list">${itemRow(ctx, d[3], { chip: false, href: '#' })}</ul>`;
    return frontPage(ctx, 'lists', 'One row is one item.', col('With a lead and a status', main), aside(col('Rules', l), col('Without a lead', second), col('As a link', third)), { w: 400 });
  },

  // the weather strip: one column per status, the chip in light and dark, the ratios as the temperatures
  status(ctx) {
    const toneOf = (s) => (s.custom ? 'neutral' : s.tone);
    // three bands across the page: the light words, one unbroken dark panel with the dark words, then the meanings
    const band = (cls, attr, fn) => `<div class="kwx-strip ${cls}"${attr} style="grid-template-columns:repeat(${ctx.status.length},minmax(0,1fr))">${ctx.status.map((s) => `<div class="kwx">${fn(s, toneOf(s), statusText(ctx, 'light', s), statusText(ctx, 'dark', s))}</div>`).join('')}</div>`;
    const lightBand = band('kwx-lt', '', (s, tone, tl) => `<div class="kwx-line"><span>${ctx.ui.statusChip(s.id)}</span><span class="krr"><b>${rt(ctx, tl.hex, ctx.roles.light.surface)}</b>Light</span></div>`);
    const darkBand = band('kwx-dk ui', ' data-theme="dark"', (s, tone, tl, td) => `<div class="kwx-line"><span>${ctx.ui.statusChip(s.id)}</span><span class="krr"><b>${rt(ctx, td.hex, ctx.roles.dark.surface)}</b>Dark</span></div>`);
    const capBand = band('kwx-cp', '', (s, tone, tl, td) => `<p class="kcap kcap--ink">${A(chipMeaning[tone])}<br>${tl.token === td.token ? m(tl.token) : `${m(tl.token)} light, ${m(td.token)} dark`} on the page ground</p>`);
    const strip = `${lightBand}${darkBand}${capBand}`;
    const ui = ctx.ui, S = sc(ctx), N = navItems(ctx);
    const rowsUse = `<ul class="ui-list">${S.deliveries.slice(0, 2).map((d) => itemRow(ctx, d)).join('')}</ul>`;
    const badges = `<div class="kbdg"><span class="kbd"><span>${A(N[2][0])}</span><span class="ui-badge">3</span></span><span class="kbd"><span class="kbd-i">${ui.icon(N[2][1], 20)}<span class="ui-badge">3</span></span></span></div>`;
    const use = cols('minmax(0,1.5fr) minmax(0,1fr)', [col('On a row', `${rowsUse}${cap('A status on a row', 'It sits under the price and says its state in words.')}`), col('Count badge', `${badges}${cap('On a tab or an icon', 'The number is the message. Nothing else needs to change.')}`)], 'kwx-use');
    return bandPage(ctx, 'status', 'Words first, colour second.', ['Plain words, with a time or a count where it helps.', 'A status is words in one colour, with no fill. The ratio is the words on the page ground.', `A count badge sits on a tab or an icon: <span class="ui-badge">3</span>`], `${strip}<div class="kgap"></div>${use}`);
  },

  feedback(ctx) {
    const ui = ctx.ui, S = sc(ctx);
    const alerts = `<div class="kalerts">${ui.alert('info', S.pickup)}${ui.alert('success', S.toast)}${ui.alert('warning', S.alert)}${ui.alert('danger', S.form.readyError)}</div>`;
    const toast = `<div class="kcell">${ui.toast(S.toast)}<span class="kcap">Bottom of the screen, gone in five seconds. Undo stays reachable by keyboard.</span></div>`;
    const inline = `<div class="kcell"><p class="ui-inline-msg">${ui.icon('info', 16)}${A(S.inline)}</p></div>`;
    const load = `<div class="kload">${ui.spinner()}<div class="kskel">${ui.skeleton('220px')}${ui.skeleton('150px')}${ui.skeleton('180px')}</div></div><span class="kcap kcap--after">The spinner is for a wait under a few seconds. Longer lists get skeleton lines in the shape of the rows.</span>`;
    const l = rules(['Say what happened and what to do, in one or two sentences.', 'A banner stays until it is dealt with. A toast leaves by itself.', 'A banner has a 2 px edge and an icon in the tone colour. The words stay in the text colour.']);
    return frontPage(ctx, 'feedback', 'Say what happened and what to do.', `${col('Alert banners', alerts)}<div class="kgap"></div>${l}`, aside(col('Toast', toast), col('Inline message', inline), col('Loading', load)), { w: 330 });
  },

  dialog(ctx) {
    const ui = ctx.ui, S = sc(ctx);
    const a = uniq(ui.dialog({ title: S.form.title, body: S.empty.body, confirm: S.form.book, keep: 'Close' }), 'dlg-a');
    const b = uniq(ui.dialog({ title: S.dialog.title, body: S.dialog.body, confirm: S.dialog.confirm, keep: S.dialog.keep, danger: true }), 'dlg-b');
    const l = ['A dialog asks one thing. The title is the question, and the buttons answer it.', 'The safe answer is on the left, and it is the one the cursor lands on.', 'Danger is for what cannot be undone. Where it can, the button says what it does and stays plain.', 'Esc and a click on the scrim close it.'];
    const parts = ['<b>Title</b>The question, in one line.', '<b>Body</b>What happens next, in one or two sentences. No second question.', '<b>Buttons</b>The safe answer on the left, the action on the right. Each says what it does.'];
    const anat = `<ul class="kfold kanat" style="grid-template-columns:repeat(3,minmax(0,1fr))">${parts.map((t) => `<li>${t}</li>`).join('')}</ul>`;
    return storyPage(ctx, 'dialog', 'A dialog asks one thing.', l, `${cols('minmax(0,1fr) minmax(0,1fr)', [col('Modal', `<div class="ui-scrim kscrim">${a}</div>${cap('One action and a way out.')}`), col('Confirmation', `<div class="ui-scrim kscrim">${b}</div>${cap('The danger button names the action.')}`)])}${anat}`, { w: 300 });
  },

  // box scores: the table across the measure, the rules as briefs below the fold
  table(ctx) {
    const ui = ctx.ui, S = sc(ctx), act = roleColour(ctx, 'action');
    const sortBtn = (t, dir) => `<button type="button">${A(t)}${dir ? ui.icon(dir === 'asc' ? 'arrow-up' : 'arrow-down', 14) : ''}</button>`;
    const rows = S.deliveries.map((d, i) => `<tr${i === 0 ? ' aria-selected="true"' : ''}${i === 2 ? ' class="is-hover"' : ''}><td>${A(d.to)}</td><td>${A(d.when)}</td><td>${ui.statusChip(d.status)}</td><td class="is-num">${A(d.price)}</td></tr>`).join('');
    const table = `<table class="ui-table"><thead><tr><th scope="col" aria-sort="ascending">${sortBtn('Item', 'asc')}</th><th scope="col">${sortBtn('When')}</th><th scope="col">Status</th><th scope="col" class="is-num">${sortBtn('Price')}</th></tr></thead><tbody>${rows}</tbody></table>`;
    const l = ['A sortable header is a button, and the sorted one shows its direction.', 'Numbers sit right and use tabular figures.', `Row states: rest, hover on pointer devices, and selected with a 3 px ${A(act.name)} bar on the left.`];
    const keys = `<div class="kkeys">${cap('Selected', 'First row')}${cap('Hover', 'Third row')}${cap('Sorted', 'Item, ascending')}</div>`;
    return foldPage(ctx, 'table', 'Numbers sit right.', `${table}${keys}`, l);
  },

  empty(ctx) {
    const S = sc(ctx), F = S.form, ui = ctx.ui, E = S.empty;
    const none = `<div class="ui-empty"><h3 class="ui-empty__title">${A(E.title)}</h3><p class="ui-empty__text">${A(E.body)}</p>${ui.btn(E.cta)}</div>`;
    const first = `<div class="ui-empty"><h3 class="ui-empty__title">${A(F.title)}</h3><ol class="ksteps"><li><span>1</span>${A(F.pickup)}</li><li><span>2</span>${A(F.dropoff)}</li><li><span>3</span>${A(F.size)}</li></ol>${ui.btn(F.book, { disabled: true })}<p class="ui-help">${A(F.bookWhy)}</p></div>`;
    const l = ['Say what is missing and offer the one action that fixes it.', 'First run lists what is needed, in the order it is asked.', 'The empty state sits on a raised ground with no edge, so it does not read as a card.'];
    const parts = ['<b>Title</b>What is missing, in plain words.', '<b>Body</b>Why, or what to do about it, in a sentence.', '<b>Action</b>The one thing that fixes it. Never two.'];
    const anat = `<ul class="kfold kanat" style="grid-template-columns:repeat(3,minmax(0,1fr))">${parts.map((t) => `<li>${t}</li>`).join('')}</ul>`;
    return storyPage(ctx, 'empty', 'Say what is missing.', l, `${cols('minmax(0,1fr) minmax(0,1fr)', [col('Empty', `${none}${cap('Nothing ordered yet.')}`), col('First run', `${first}${cap('Before the first order.')}`)])}${anat}`, { w: 300 });
  },

  // the feature page: the story on the left, the product itself as the plate beside it
  'screen-light'(ctx) {
    const act = roleColour(ctx, 'action');
    const l = [
      `One ${A(act.name)} button on the page: ${A(bookLabel(ctx))}. Everything else a person can press is quiet or outlined.`,
      'A row holds the item, where it grew, when, the price and a status chip. The status is words in one colour, with no fill.',
      `The order form sits beside the list, divided by a ${ctx.borders[0].px} px rule, not a box.`,
    ];
    return storyPage(ctx, 'screen-light', 'The list, then the form.', l, `<div class="kscreen-wrap">${desktopScreen(ctx, false)}</div><p class="kcap kcap--after">${A(ctx.brand.ui.screen.title)}, at 1280 px wide.</p>`, { w: 300, extra: inside(ctx, ['navigation', 'lists', 'status', 'buttons']) });
  },
  // the same story turned round: the plate on the left, the story on the right
  'screen-dark'(ctx) {
    const D = colourMap(ctx, 'dark'), act = roleColour(ctx, 'action');
    const l = [
      `The ground is ${m('--surface')} at ${m(D.surface)} and the text ${m(D.text)}, ${rt(ctx, D.text, D.surface)}.`,
      `${A(act.name)} is lifted to ${m(D.action)} so the button holds ${rt(ctx, D.action, D.surface)} on the dark ground.`,
      'Nothing is added or taken away. The same tokens, the same names, the same components.',
    ];
    return storyPage(ctx, 'screen-dark', 'Dark changes the ground, not the page.', l, `<div class="kscreen-wrap">${desktopScreen(ctx, true)}</div><p class="kcap kcap--after">${A(ctx.brand.ui.screen.title)}, dark, at 1280 px wide.</p>`, { w: 300, rev: true, extra: inside(ctx, ['colour-dark', 'screen-light', 'tokens']) });
  },

  'screen-mobile'(ctx) {
    const S = sc(ctx), F = S.form, ui = ctx.ui, act = roleColour(ctx, 'action');
    const l = [`The list leads. What is in, where it grew and the price are on one row.`, 'The time is one tap: a segmented control, never a dropdown.', `One ${A(act.name)} button, at the foot, in reach of the thumb. Its label carries the price.`];
    const states = `<div class="kstack kstack--s"><div class="kst"><span class="kcap"><b>Before a time is chosen</b></span>${ui.btn(F.book, { disabled: true })}<p class="ui-help">${A(F.bookWhy)}</p></div><div class="kst"><span class="kcap"><b>Once one is</b></span>${ui.btn(bookLabel(ctx))}</div></div>`;
    return storyPage(ctx, 'screen-mobile', 'The same page, 390 wide.', l, cols('430px minmax(0,1fr)', [`${phoneScreen(ctx)}<p class="kcap kcap--after">${A(ctx.brand.ui.screen.title)} at 390 px wide.</p>`, `${col('The order button', states)}<div class="kgap"></div>${col('The time', cell(ui.segmented(F.sizes, 1), 'One tap', 'One choice, always one selected.'))}<div class="kgap"></div>${col('The row', `<ul class="ui-list">${itemRow(ctx, S.deliveries[0], { chip: false })}</ul>${cap('Name, place and time, price', 'Tabular figures, so prices line up down the list.')}`)}`], 'kc--phone'), { w: 300, cls: 'pg--kphone', extra: inside(ctx, ['buttons', 'choices', 'lists']) });
  },

  // the classifieds: dense ruled listings, three columns of tokens
  tokens(ctx) {
    const g = tokenGroups(ctx), L = colourMap(ctx, 'light'), D = colourMap(ctx, 'dark');
    const sw = (c) => `<i class="ktsw" style="background:${c}"></i>`;
    const colr = Object.keys(L).map((k) => `<div class="ktk"><span class="mono">--${k}</span><span class="ktv">${sw(L[k])}${m(L[k])}</span><span class="ktv">${sw(D[k])}${m(D[k])}</span></div>`).join('');
    const line = (k, v) => `<div class="ktk ktk--2"><span class="mono">--${k}</span>${m(v)}</div>`;
    const fam = (id) => ctx.brand.fonts[id].family;
    const sp = Object.entries(g.space).map(([k, v]) => line(k, v)).join('');
    const rd = Object.entries(g.radius).map(([k, v]) => line(k, v)).join('');
    const wd = Object.entries(g.width).map(([k, v]) => line(k, v)).join('');
    const ff = [['ff-display', fam('display')], ['ff-body', fam('body')], ['ff-mono', fam('mono')]].map(([k, v]) => `<div class="ktk ktk--2"><span class="mono">--${k}</span><span>${A(v)}</span></div>`).join('');
    const tx = ctx.uiType.map((t) => `<div class="ktk ktk--2"><span class="mono">${A(t.token)}</span>${m(`${t.size} / ${t.line} / ${t.weight}`)}</div>`).join('');
    const pal = ctx.colours.map((c) => `<div class="ktk ktk--2"><span class="mono">--palette-${A(c.id)}</span><span class="ktv">${sw(c.hex)}${m(c.hex)}</span></div>`).join('');
    const G = (t, inner) => `<div class="ktg"><h3 class="kh3 kh3--d">${A(t)}</h3>${inner}</div>`;
    const head = `<div class="ktk ktk--h"><span></span><span>Light</span><span>Dark</span></div>`;
    const n = Object.keys(L).length;
    const story = `${headline('Every value has a name.', 'headline--s')}${rules([`${n} colour roles, each with a light and a dark value. Dark changes the values and keeps the names.`, `${Object.keys(g.space).length} space steps, ${Object.keys(g.radius).length} radii and ${Object.keys(g.width).length} border widths, all named here.`, 'Use the name, never the value, so a change is made once.'])}<div class="kgap"></div>${G('Fonts', ff)}`;
    return kstd(ctx, 'tokens', cols('250px minmax(0,1.25fr) minmax(0,1fr) minmax(0,1fr)', [story, G('Colour, light then dark', head + colr), G('Space', sp) + G('Radius', rd), G('Type, size / line / weight', tx) + G('Palette', pal) + G('Border width', wd)], 'ktcols'));
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
  <button class="ui-btn" type="button">
    ${F.book}
  </button>
</body>`;
    const dark = '<html data-theme="dark">';
    const tw = `@import "tailwindcss";
@import "./tokens.css";
@import "./tailwind.css";`;
    const block = (t, c) => `<div class="kg"><h3 class="kh3">${A(t)}</h3><pre class="ui kcode" data-theme="dark"><code>${A(c)}</code></pre></div>`;
    const l = [`Plain CSS, no framework. Copy the folder, link three stylesheets, and put class ${m('ui')} on the body.`, `Colour tokens name a job: ${m('--surface')}, ${m('--text')}, ${m('--action')}. Dark swaps the values and leaves the names.`, `Controls are real elements. State is carried by ${m('disabled')}, ${m('aria-invalid')}, ${m('aria-pressed')} and ${m('aria-current')}.`];
    return foldPage(ctx, 'code', 'Link three files.', cols('minmax(0,1fr) 430px', [col('In the package', `<div class="kfiles">${files}</div>`), `<div class="kstack">${block('Install', code)}${block('Dark mode', dark)}${block('Tailwind v4', tw)}</div>`]), l);
  },
};
