// UI kit pages for theme 08, Riso: cover, contents, colour-light, colour-dark, type-scale, spacing, radii-borders, elevation, states.
// Styles are in css-u-found.js (classes start ru1-). The page is Wall, the paper. The UI kit shows composites only (no separations):
// each figure is a printed sheet with a registration cross at its corners and a run-sheet line under it (the drums it really prints
// in, then the paper). Components are the engine's real ones (ctx.ui) in the brand's ui roles, printed straight onto the sheet; a
// component that is itself a card (a card, a dialog) prints on the open page, never on a sheet, so there is no card in a card.
import { A } from './helpers.js';
import { corners, drums, drumNo, paper, byRole, isSurface } from './guidelines-r.js';
import { colourMap, tokenGroups } from '../../engine/tokens.js';

const sc = (ctx) => ctx.brand.ui.screen.content;
const m = (s) => `<span class="r-mono">${A(s)}</span>`;
const low = (s) => String(s).toLowerCase();
const rt = (ctx, a, b) => `${ctx.fmt(ctx.ratio(a, b))} : 1`;
const title = (ctx, id) => ctx.pages.find((p) => p.id === id).title;
const uniq = (html, tag) => html.replace(/dlg-t/g, tag);
const top = (h, lead) => `<div class="r-top"><h1 class="r-h1">${A(h)}</h1>${lead ? `<p class="r-lead">${lead}</p>` : ''}</div>`;
// a drum's own ink for words at a size, where it passes on the paper (4.5 : 1, or 3 : 1 at 24 px and over); else the text colour
const inkAt = (ctx, hex, px) => { const L = ctx.roles.light; return ctx.ratio(hex, L.surface) >= (px >= 24 ? 3 : 4.5) ? hex : L.text; };
// the job line (review D1, round 2): ONE line a page, under the page's main figure, flush with the sheet's left edge, never inside it.
// Each drum the page prints, in drum order: an 8 px swatch, `Drum n Name`, then what it prints (as job() in p-image.js draws it).
// Whatever is in the paper's colour is the paper showing through and closes the line; a tone that is no drum is named as it is.
function job(ctx, uses) {
  const D = drums(ctx), p = paper(ctx), by = new Map(), through = [], other = [];
  const hex_ = (h) => String(h).toLowerCase();
  for (const [hex, what] of uses) {
    const c = D.find((d) => hex_(d.hex) === hex_(hex));
    const t = ctx.colours.find((x) => hex_(x.hex) === hex_(hex)) || ctx.tones.find((x) => hex_(x.hex) === hex_(hex));
    if (c) { if (!by.has(c)) by.set(c, []); if (!by.get(c).includes(what)) by.get(c).push(what); } else if (isSurface(ctx, hex) || hex_(hex) === hex_(p.hex)) { if (!through.includes(what)) through.push(what); } else other.push([t ? t.name : '', what]);
  }
  const parts = D.filter((c) => by.has(c)).map((c) => `<span class="ru1-jd"><i class="ru1-sw" style="background:${c.hex}"></i>Drum ${drumNo(ctx, c)} ${A(c.name)}: ${by.get(c).join(', ')}.</span>`);
  const rest = other.map(([nm, what]) => `<span class="ru1-jd">${A(nm)}: ${what}.</span>`);
  const show = through.length ? [`<span class="ru1-jd">Paper ${A(p.name)}: ${through.join(', ')}.</span>`] : [];
  return `<p class="ru1-job">${[...parts, ...rest, ...show].join(' ')}</p>`;
}
// the job line for a page of colour roles: each drum a role is printed in, and what that drum prints on the page
const ROLE_WHAT = { text: 'type, edges and lines', action: 'the action fills', accent: 'the status words' };
// M is a mode's colour map; the four status -bg tints are left out: status prints as words on the ground, so no tint is on the page
const printed = (M) => Object.entries(M).filter(([k]) => !/^(success|warning|danger|info)-bg$/.test(k)).map(([, v]) => v);
const jobRoles = (ctx, hexes) => {
  const uses = [];
  for (const h of new Set(hexes.map(low))) { const c = ctx.colours.find((x) => low(x.hex) === h); if (c && ROLE_WHAT[c.role]) uses.push([c.hex, ROLE_WHAT[c.role]]); }
  uses.push([ctx.roles.light.surface, 'the grounds']);
  return job(ctx, uses);
};
// the page's words under a figure: one short paragraph, no headings (round 2: the note grid is gone from the kit)
const para = (html, cls = '') => `<p class="ru1-para ${cls}">${html}</p>`;

// the UI kit page: the gate's running head, titled for the UI kit
export function kpage(ctx, id, inner, cls = '', style = '') {
  const head = `<div class="r-hd"><span>${A(ctx.brand.name)}, UI kit</span><span class="num">${ctx.pageNo(id)}</span></div>`;
  return `<section class="pg r-pg ru1-pg ${cls}" data-page="${id}"${style ? ` style="${style}"` : ''}>${head}${inner}</section>`;
}

// ---- colour roles, measured: { label, tok, val, bg, fg, ring, ratio, note }
function roles(ctx, mode) {
  const M = colourMap(ctx, mode), R = (a, b) => rt(ctx, M[a], M[b]);
  const g = (label, tok, note) => [label, tok, M[tok], M.text, '', R('text', tok), note];
  const t = (label, tok, bgTok, note) => [label, tok, M[bgTok], M[tok], '', R(tok, bgTok), note];
  const st = (label, tok) => [label, tok, M.surface, M[tok], '', R(tok, 'surface'), 'On surface'];
  const list = [
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
  return { M, list, of: (tok) => list.find((r) => r.tok === tok) };
}
// a role's caption: its name, the token and value (literal, so mono), then the measured pair
// (named: false where the sample above already prints the role's name)
const rcap = (r, named = true) => `<p class="ru1-rc">${named ? `<b class="ru1-rl">${A(r.label)}</b> ` : ''}<span class="ru1-nw">${m('--' + r.tok)}</span> <span class="ru1-nw">${m(r.val)}</span></p><p class="ru1-rm"><b class="num">${r.ratio || 'Overlay'}</b> ${A(r.note)}</p>`;
const patch = (r, cls = '') => `<span class="ru1-pt ${cls}" style="background:${r.bg};color:${r.fg};${r.ring}">${r.tok === 'scrim' ? '' : 'Aa'}</span>`;
const rnote = (ctx, mode) => {
  const dark = mode === 'dark', R = ctx.roles[mode], act = byRole(ctx, 'action');
  const nm = (hex) => { const c = ctx.colours.find((x) => low(x.hex) === low(hex)); return c ? c.name : hex; };
  return {
    rule: `Roles name a job, not a colour. Components read ${m('--action')}, never a palette name, so ${dark ? 'dark' : 'light'} changes nothing in the markup.`,
    measured: 'Text under 24 px needs 4.5 : 1. Edges, the focus ring and fills against their ground need 3 : 1.',
    last: [dark ? 'Dark' : 'Action', dark ? `The ground is ${A(nm(R.surface))}. ${A(act.name)} stays, and the label stays ${A(nm(R.actionLabel))}, so a button reads the same in both.` : `${A(act.name)} is the action and the live status. It is spent once a screen.`],
  };
}

// ---- the spacing steps' uses, smallest first
// a type style's use as the brand writes it; in the slot edition a use that names the sample brand's product is said for any brand
const useOf = (ctx, t) => (ctx.edition === 'slot' && t.token === 'title' ? 'Screen titles, the product name' : t.use);

const SPACE_USES = ['Inside a tight pair', 'Icon to label', 'Gaps in a row, field padding', 'Card padding', 'Dialog padding, button sides', 'Empty state padding', 'Between groups', 'Between sections'];

export const uFound = {
  // the UI kit's name set large, then one composite sheet of the product: the Blush plate carrying the logo, the product line in
  // Ink and the real Book entry button in Vermilion; the run-sheet line under it, the imprint at the foot. No separations here.
  cover(ctx) {
    const B = ctx.brand, S = sc(ctx), slot = ctx.edition === 'slot', cw = B.logo.colourways, L = ctx.roles.light;
    const acc = byRole(ctx, 'accent'), ink = byRole(ctx, 'text'), way = cw['on-blush'] ? 'on-blush' : 'mono-dark';
    const logo = ctx.logo.html('colour', { width: 200, colourway: way, color: cw[way].name, label: 'Your logo goes here' });
    const sheet = `<figure class="ru1-cv"><div class="r-sheet ru1-cv__sh">${corners(ink.hex, 25)}<div class="ru1-cv__pl" style="background:${acc.hex}"><div class="ru1-cv__lg">${logo}</div></div>`
      + `<div class="ui ru1-cv__ui"><p class="disp ru1-cv__p" style="color:${ink.hex}">${A(B.product)}</p>${ctx.ui.btn(S.form.book)}</div></div>`
      + `<figcaption>${job(ctx, [[acc.hex, 'the plate'], [ink.hex, 'the product line'], [L.action, 'the button'], [L.surface, 'the rest of the sheet']])}</figcaption></figure>`;
    // in slot the brand name is a placeholder: it takes its own line above the title, not a tag beside it
    return `<section class="pg r-pg ru1-pg ru1-pg--cover" data-page="cover"><h1 class="ru1-cv__t">${slot ? `<span class="ru1-cv__b">${A(B.name)}</span>` : ''}UI kit</h1>${sheet}`
      + `<div class="ru1-cv__im"><p>Interface sheets and notes</p><p class="num">${A(ctx.versionLine)}</p></div></section>`;
  },

  // the sections down the page, each led by its number large in the action drum; its pages listed beside it in two columns,
  // each with its reference and its folio. The first section, the foundations, has the most pages and so the most room.
  contents(ctx) {
    const act = byRole(ctx, 'action'), nk = inkAt(ctx, act.hex, 72);
    const secs = ctx.sections.map((s) => `<li class="ru1-ts"><span class="ru1-ts__n num" style="color:${nk}">${s.n}</span><div class="ru1-ts__b"><h2 class="ru1-ts__t">${A(s.title)}</h2>`
      + `<ol class="ru1-ts__p">${s.pages.map((p) => `<li><span class="ru1-ts__r num">${p.ref}</span><span class="ru1-ts__pt">${A(p.title)}</span><span class="ru1-ts__f num">${p.no}</span></li>`).join('')}</ol></div></li>`).join('');
    return kpage(ctx, 'contents', `${top('Contents')}<ol class="ru1-toc">${secs}</ol>`);
  },

  // a test print of the light roles on one sheet: the three grounds as fields, wide to narrow, the text roles printed on the ground
  // they are measured on; then the action fills, the lines and the status pairs as a run of patches, each captioned under it
  'colour-light'(ctx) {
    const { M, of } = roles(ctx, 'light'), N = rnote(ctx, 'light'), ink = byRole(ctx, 'text');
    const ts = (r) => `<div class="ru1-tl"><p class="ru1-tl__s" style="color:${r.fg}">${A(r.label)}</p>${rcap(r, false)}</div>`;
    const field = (tok, inner, cls = '') => { const r = of(tok); return `<div class="ru1-gf ${cls}" style="background:${r.bg};color:${M.text}"><p class="ru1-gf__n">${A(r.label)}</p>${rcap(r, false)}${inner}</div>`; };
    const grounds = `<div class="ru1-gr">${field('surface', `<div class="ru1-tls">${['text', 'text-soft', 'quiet'].map((t) => ts(of(t))).join('')}</div>`, 'ru1-gf--s')}${field('raised', '')}${field('sunken', ts(of('quiet-sunken')))}</div>`;
    const run = (toks, cls) => `<ul class="ru1-run ${cls}">${toks.map((t) => { const r = of(t); return `<li>${patch(r)}${rcap(r)}</li>`; }).join('')}</ul>`;
    const sheet = `<figure class="ru1-fig"><div class="r-sheet ru1-cl">${corners(ink.hex, 13)}<div class="ui ru1-cl__pr">`
      + `<h2 class="r-tg__h">Grounds and text</h2>${grounds}`
      + `<h2 class="r-tg__h ru1-gap">Action</h2>${run(['action', 'action-hover', 'action-pressed', 'action-label'], 'ru1-run--act')}`
      + `<h2 class="r-tg__h ru1-gap">Lines, disabled and scrim</h2>${run(['edge', 'divider', 'focus', 'disabled-text', 'scrim'], 'ru1-run--ln')}`
      + `<h2 class="r-tg__h ru1-gap">Status</h2>${run(['success', 'warning', 'danger', 'info'], 'ru1-run--st')}</div></div>`
      + `<figcaption>${jobRoles(ctx, printed(M))}</figcaption></figure>`;
    return kpage(ctx, 'colour-light', `${top(title(ctx, 'colour-light'), N.rule)}<div class="r-body ru1-body">${sheet}${para(`${N.measured} ${N.last[1]}`)}</div>`);
  },

  // the drum room: the page is the sheet, flooded with the dark ground to its edge. The dark rule set large beside the real button,
  // then every dark role as a press control strip, patches butted down two columns, each captioned beside its patch
  'colour-dark'(ctx) {
    const { M, list } = roles(ctx, 'dark'), N = rnote(ctx, 'dark'), S = sc(ctx);
    const half = Math.ceil(list.length / 2);
    const strip = (rs) => `<ol class="ru1-cs">${rs.map((r) => `<li>${patch(r, r.bg.toLowerCase() === M.surface.toLowerCase() ? 'ru1-pt--ring' : '')}<div class="ru1-cs__c">${rcap(r)}</div></li>`).join('')}</ol>`;
    const flood = `<div class="ui ru1-fl" data-theme="dark"><div class="ru1-fl__hd"><p class="disp ru1-fl__l">${N.last[1]}</p>${ctx.ui.btn(S.form.book)}</div>`
      + `<div class="ru1-fl__cs">${strip(list.slice(0, half))}${strip(list.slice(half))}</div></div>`;
    const sheet = `<figure class="ru1-fig">${flood}<figcaption>${jobRoles(ctx, printed(M))}</figcaption></figure>`;
    // the page is the sheet: its own variables take the dark roles, so the running head, title, lead, notes and job line print in the
    // dark set, and the four registration crosses sit at the page's corners
    const vars = `background:${M.surface};--ground:${M.surface};--ink:${M.text};--soft:${M['text-soft']};--quiet:${M.quiet};--hair:${M.divider};--xi:24px`;
    return kpage(ctx, 'colour-dark', `${corners(M.text, 25)}${top(title(ctx, 'colour-dark'), `${N.rule} ${N.measured}`)}<div class="r-body ru1-body">${sheet}</div>`, 'ru1-pg--dk', vars);
  },

  // one sheet set as a screen's reading column, largest style first, each line in the brand's own words; each style's spec hung in
  // the sheet's right margin beside its line, past the margin rule
  'type-scale'(ctx) {
    const S = sc(ctx), F = S.form, B = ctx.brand, L = ctx.roles.light, ink = byRole(ctx, 'text');
    const sample = { caption: F.notesHelp, label: F.pickup, body: S.pickup, control: F.book, 'title-s': S.dialog.title, title: S.rider, headline: S.eta };
    const rows = [...ctx.uiType].reverse().map((t) => {
      const face = t.face === 'display' ? 'font-family:var(--ff-display);letter-spacing:-0.01em;' : 'font-family:var(--ff-body);';
      return `<li class="ru1-ty"><p class="ru1-ty__s" style="${face}font-size:${t.size}px;line-height:${t.line}px;font-weight:${t.weight}">${A(sample[t.token] || useOf(ctx, t))}</p>`
        + `<p class="ru1-ty__m"><b class="ru1-ty__n">${A(t.token)}</b>${m(`${t.size} / ${t.line} / ${t.weight}`)}<span class="ru1-ty__u">${A(useOf(ctx, t))}</span></p></li>`;
    }).join('');
    const sheet = `<figure class="ru1-fig"><div class="r-sheet ru1-tsh">${corners(ink.hex, 13)}<ol class="ui ru1-tys">${rows}</ol></div><figcaption>${job(ctx, [[L.text, 'the samples and their specs'], [L.surface, 'the page']])}</figcaption></figure>`;
    return kpage(ctx, 'type-scale', `${top(title(ctx, 'type-scale'))}<div class="r-body ru1-body ru1-body--ty">${sheet}${para(`${A(B.fonts.display.family)} for titles and the one big line. ${A(B.fonts.body.family)} for everything a person reads or presses. Sizes are in px, then line height in px, then weight. Nothing on screen is smaller than 12 px. Times and counts use tabular figures, so a time never shifts.`)}</div>`);
  },

  // the steps as the gaps of one printed sheet, at true size: a page of the kit's own parts (a tight pair, a group, a field, a card, a
  // dialog, an empty state, two sections), each gap or padding printed as a band in the field drum with its step number beside it, and
  // the key under the sheet. Then grouping measured on a real form, and the two control heights.
  spacing(ctx) {
    const S = sc(ctx), X = S.example, L = ctx.roles.light, ink = byRole(ctx, 'text'), acc = byRole(ctx, 'accent');
    const tok = (s) => '--' + s.token.replace('space-', 'sp-');
    const P = ctx.space.map((s) => s.px);
    // the space itself: a band as tall as the step, its number on a short rule beside it
    const vg = (i) => `<span class="ru1-vg" style="height:${P[i]}px"><b class="ru1-mk num">${i + 1}</b></span>`;
    const bar = (w, h, c = ink.hex) => `<span class="ru1-br" style="width:${w}px;height:${h}px;background:${c}"></span>`;
    const sg = (px) => `<span class="ru1-sg" style="height:${px}px"></span>`;
    // a part with padding on the step: the band is its top padding, the side and bottom padding are the same step
    const box = (i, inner, edge) => `<div class="ru1-bx" style="--p:${P[i]}px;outline-color:${edge}">${vg(i)}<div class="ru1-bx__in">${inner}</div></div>`;
    const quiet = 'var(--quiet)', hair = 'var(--hair)';
    const colA = `${bar(120, 16)}${vg(0)}${bar(150, 10, quiet)}${vg(6)}${bar(16, 16)}${vg(1)}${bar(90, 10)}${vg(7)}${bar(100, 16)}`;
    const colB = `${box(2, bar(90, 20), ink.hex)}${sg(16)}${box(3, `${bar(90, 14)}${sg(8)}${bar(110, 10, quiet)}`, hair)}${sg(16)}${box(5, bar(70, 10), hair)}`;
    const colC = box(4, `${bar(80, 14)}${sg(12)}${bar(100, 8, quiet)}${sg(16)}<span class="ru1-bt" style="background:${L.action}"></span>`, ink.hex);
    const key = `<ol class="ru1-key">${ctx.space.map((s, i) => `<li><b class="ru1-key__n num">${i + 1}</b><span class="ru1-key__t">${m(tok(s))} <span class="r-mono num">${s.px} px</span></span><span class="ru1-key__u">${A(SPACE_USES[i] || '')}</span></li>`).join('')}</ol>`;
    const plate = `<figure class="ru1-fig" style="--bl:${acc.hex}"><div class="r-sheet ru1-pl">${corners(ink.hex, 13)}<div class="ru1-pl__c"><div>${colA}</div><div>${colB}</div><div>${colC}</div></div></div>${key}`
      + `<figcaption>${job(ctx, [[ink.hex, 'the parts, fields and numbers'], [acc.hex, 'the gaps'], [L.action, 'the buttons'], [L.surface, 'the sheets']])}</figcaption></figure>`;
    // grouping, measured on a real form: the gap inside the group (the row step) against the gap between groups
    const inG = ctx.space[2] || ctx.space[0], btwG = ctx.space[6] || ctx.space[ctx.space.length - 1];
    const gapMark = (s) => `<span class="ru1-vg ru1-vg--v" style="height:${s.px}px;--bl:${acc.hex}"><b class="ru1-mk r-mono num">${s.px} px</b></span>`;
    const group = `<figure class="ru1-fig"><div class="r-sheet ru1-gp">${corners(ink.hex, 13)}<div class="ui ru1-gp__ui">${ctx.ui.field({ id: 'ru1-sp1', label: S.form.pickup, value: S.form.pickupValue })}${gapMark(inG)}`
      + `${ctx.ui.field({ id: 'ru1-sp2', label: S.form.dropoff, value: S.form.dropoffValue })}${gapMark(btwG)}<div>${ctx.ui.btn(S.form.book)}</div></div></div></figure>`;
    const hi = (px, btn) => `<div class="ru1-ht__i"><span class="ru1-dm" style="height:${px}px" aria-hidden="true"></span><div class="ru1-ht__b">${btn}<p class="r-mono num">${px} px</p></div></div>`;
    const heights = `<figure class="ru1-fig"><div class="r-sheet ru1-ht">${corners(ink.hex, 13)}<div class="ui ru1-ht__r">${hi(44, ctx.ui.btn(S.form.book))}${hi(36, ctx.ui.btn(X.small, { size: 'sm' }))}</div></div></figure>`;
    return kpage(ctx, 'spacing', `${top(title(ctx, 'spacing'), `Everything sits on a ${ctx.brand.ui.spacingBase} px step.`)}<div class="r-body ru1-body ru1-body--sp">${plate}`
      + `<div class="ru1-sp2"><div>${group}${para('A gap inside a group is smaller than the gap between groups, so grouping reads at a glance.', 'ru1-para--u')}</div>`
      + `<div>${heights}${para('Controls are 44 px tall, eleven steps. Small buttons are 36 px.', 'ru1-para--u')}</div></div></div>`);
  },

  // a control's corner drawn eight times its size (the radius and the edge, both to scale) is the large figure; beside it the real
  // controls on a sheet with the radii, the card on the open page; under both, a sheet of the edges: a row's hairline and two fields
  'radii-borders'(ctx) {
    const S = sc(ctx), ui = ctx.ui, X = S.example, L = ctx.roles.light, ink = byRole(ctx, 'text'), [rc, rk, rr] = ctx.radii, [bh, bc, bf] = ctx.borders;
    // the corner at 8x: the control edge as a band of 8 x its width, turning through the control radius at 8 x
    const K = 8, W = 232, r = Math.min(rc.px * K, W - 40), e = bc.px * K;
    const arc = r ? `L${e / 2} ${e / 2 + r}A${r} ${r} 0 0 1 ${e / 2 + r} ${e / 2}` : `L${e / 2} ${e / 2}`;
    const corner = `<svg class="ru1-cn" viewBox="0 0 ${W} ${W}" width="${W}" height="${W}" aria-hidden="true"><path d="M${e / 2} ${W}${arc}L${W} ${e / 2}" fill="none" stroke="${ink.hex}" stroke-width="${e}" stroke-linejoin="miter"/></svg>`;
    const cornerFig = `<figure class="ru1-cnf">${corner}<figcaption><p class="ru1-cn__t">The control corner, drawn eight times its size.</p><p class="ru1-np">${m(rc.token)} ${rc.px} px and ${m(bc.token)} ${bc.px} px, to scale.</p></figcaption></figure>`;
    const rad = `<figure class="ru1-fig"><div class="r-sheet ru1-rd">${corners(ink.hex, 13)}<div class="ui ru1-rd__ui">${ui.btn(S.form.book)}<div class="ru1-rd__r"><span class="ui-avatar">${A(S.initials)}</span>${ui.switch(X.switches[0], { checked: true })}</div></div></div>`
      + `<figcaption>${job(ctx, [[ink.hex, 'the avatar, rules, edges and type'], [L.action, 'the button and the switch'], [L.surface, 'the sheets']])}</figcaption></figure>`;
    const card = `<div class="ui ru1-rd__cd">${ui.card({ meta: S.status, title: S.rider, text: S.riderNote })}</div>`;
    const rlines = `<ul class="ru1-ln">${[[rc, `${rc.px} px`], [rk, `${rk.px} px`], [rr, 'round']].map(([x, v]) => `<li>${m(x.token)} <span class="num">${v}</span>. ${A(x.use)}.</li>`).join('')}</ul>`;
    const bor = `<figure class="ru1-fig"><div class="r-sheet ru1-bd">${corners(ink.hex, 13)}<div class="ui ru1-bd__ui"><ul class="ui-list">${ui.row({ title: S.deliverTo, sub: S.pickup, end: S.paid })}</ul>`
      + `<div class="ru1-bd__f"><div>${ui.field({ id: 'ru1-rb1', label: S.form.pickup, value: S.form.pickupValue })}</div><div>${ui.field({ id: 'ru1-rb2', label: S.form.dropoff, value: S.form.dropoffValue, state: 'focus' })}</div></div></div></div>`
      + `</figure>`;
    const blines = `<ul class="ru1-ln">${[bh, bc, bf].map((x) => `<li>${m(x.token)} <span class="num">${x.px} px</span>. ${A(x.use)}.</li>`).join('')}</ul>`;
    return kpage(ctx, 'radii-borders', `${top(title(ctx, 'radii-borders'), 'Drawn on the real controls: the radius, then the border width (hairline, control edge and focus ring).')}<div class="r-body ru1-body ru1-rb">`
      + `<div class="ru1-rb__l">${cornerFig}<div class="ru1-rb__t">${rlines}${para(`Controls take ${rc.px}, cards ${rk.px}. The kit is square. Round is for avatars and switches only.`, 'ru1-para--s')}</div>`
      + `<div class="ru1-rb__t">${blines}${para(`Control edges are ${bc.px} px so they hold against the ground. Dividers stay at ${bh.px} px. The focus ring sits outside the edge, on a 2 px gap of the ground colour, so it shows on any fill.`, 'ru1-para--s')}</div></div>`
      + `<div class="ru1-rb__r">${rad}${card}${bor}</div></div>`);
  },

  // the grounds as three stepped fields on one sheet, Wall to the quiet grey, the registration crosses at the sheet's outer corners
  // only; the hairline card and the floating dialog print on the open page, as they sit on a wall of White. The dialog is the large figure.
  elevation(ctx) {
    const S = sc(ctx), ui = ctx.ui, tg = tokenGroups(ctx), M = colourMap(ctx, 'light'), ink = byRole(ctx, 'text');
    const steps = [['Surface', 'surface', 'The page and every card on it'], ['Raised', 'raised', 'Raised cards, sidebars, table headers'], ['Sunken', 'sunken', 'Chips, avatars, skeletons']]
      .map(([n, t, u], i) => `<li class="ru1-gs" style="--i:${i};background:${M[t]}"><p class="ru1-gs__n">${A(n)}</p><p class="ru1-gs__c">${m('--' + t)} ${m(M[t])}</p><p class="ru1-gs__u">${A(u)}</p></li>`).join('');
    const dlg = uniq(ui.dialog({ title: S.dialog.title, body: S.dialog.body, confirm: S.dialog.confirm, keep: S.dialog.keep, danger: true }), 'ru1-dlg');
    const lift = (h, note, inner, cls) => `<figure class="ru1-lf ${cls}"><div class="ui ru1-lf__ui">${inner}</div><figcaption><h2 class="ru1-nh">${A(h)}</h2><p class="ru1-np">${note}</p></figcaption></figure>`;
    return kpage(ctx, 'elevation', `${top(title(ctx, 'elevation'), A(ctx.brand.ui.elevationNote))}<div class="r-body ru1-body ru1-el">`
      + `<figure class="ru1-gsf"><div class="r-sheet ru1-gss">${corners(ink.hex, 13)}<ol class="ru1-gso">${steps}</ol></div><figcaption><h2 class="ru1-nh">Ground steps</h2><p class="ru1-np">Wall steps to a quiet grey.</p></figcaption></figure>`
      + lift('Hairline', `A card sits on the page with ${m('--divider')} at ${ctx.borders[0].px} px.`, ui.card({ meta: S.status, title: S.eta, text: S.pickup }), 'ru1-lf--card')
      + lift('Floating', `A dialog takes a ${ctx.borders[1].px} px edge in ${m('--text')}. On a wall of White the edge does the lifting.`, dlg, 'ru1-lf--dlg')
      + para(`${m('--shadow-float')} is ${m(String(tg.shadow['shadow-float']))}. No blur, no spread and no glow anywhere in the kit. Depth is a step in the ground, a hairline, or a control edge. Nothing else.`, 'ru1-para--el')
      + `</div>`);
  },

  // a make-ready run: one sheet of the buttons, the states in press order down the sheet, each state's rule printed beside its
  // pair; then a second sheet of the text field's four states and the checkbox and switch beside them
  states(ctx) {
    const S = sc(ctx), ui = ctx.ui, F = S.form, X = S.example, L = ctx.roles.light, ink = byRole(ctx, 'text');
    const rule = {
      focus: `A ${ctx.borders[2].px} px ring in ${m('--focus')}, on a ${ctx.borders[2].px} px gap.`,
      hover: `The fill steps to ${m('--action-hover')}. Outlined controls fill ${m('--sunken')}.`,
      pressed: `${m('--action-pressed')}, and the control scales to 0.97.`,
      disabled: `${m('--disabled-bg')} fill, ${m('--disabled-text')} type. The reason sits beside it. Secondary only.`,
    };
    const sts = [['Rest', undefined], ['Hover', 'hover'], ['Focus', 'focus'], ['Pressed', 'pressed'], ['Disabled', 'disabled']];
    const cols = sts.map(([n, st]) => `<li class="ru1-sc"><h3 class="ru1-sc__h">${n}</h3><div class="ru1-sc__b">${st === 'disabled' ? '<span class="ru1-na">Not used: the label names the next step</span>' : ui.btn(F.book, { state: st })}${ui.btn(X.secondary, { variant: 'secondary', state: st })}</div><p class="ru1-sc__r">${st ? rule[st] : ''}</p></li>`).join('');
    const btns = `<figure class="ru1-fig"><div class="r-sheet ru1-sb">${corners(ink.hex, 13)}<h2 class="r-tg__h">Buttons <span class="ru1-hq">Primary and secondary, every state.</span></h2><ol class="ui ru1-scs">${cols}</ol></div>`
      + `</figure>`;
    const fld = (n, id, extra) => `<li><h3 class="ru1-sc__h">${n}</h3>${ui.field({ id, label: F.ready, value: F.readyValue, ...extra })}</li>`;
    const fields = `<div class="ru1-sf"><h2 class="r-tg__h">Text field <span class="ru1-hq">Rest, focus, disabled and error. Hover changes the edge to Ink on every field.</span></h2><ol class="ru1-sf__l">${fld('Rest', 'ru1-st-r', {})}${fld('Focus', 'ru1-st-f', { state: 'focus' })}${fld('Disabled', 'ru1-st-d', { disabled: true })}${fld('Error', 'ru1-st-e', { error: F.readyError })}</ol></div>`;
    const ch = `<div class="ru1-sx"><h2 class="r-tg__h">Checkbox and switch</h2><ol class="ru1-sx__l">${[['Rest', undefined, false], ['Focus', 'focus', false], ['Disabled', undefined, true]].map(([n, st, d]) => `<li><h3 class="ru1-sc__h">${n}</h3>${ui.check(X.checks[0], { state: st, disabled: d, checked: true })}${ui.switch(X.switches[0], { state: st, disabled: d, checked: true })}</li>`).join('')}</ol></div>`;
    const second = `<figure class="ru1-fig"><div class="r-sheet ru1-s2">${corners(ink.hex, 13)}<div class="ui ru1-s2__ui">${fields}${ch}</div></div><figcaption>${job(ctx, [[ink.hex, 'the labels, edges, rules and checks'], [L.action, 'the fills and the switches'], [L.surface, 'the sheets']])}</figcaption></figure>`;
    return kpage(ctx, 'states', `${top(title(ctx, 'states'))}<div class="r-body ru1-body ru1-stb">${btns}${second}</div>`);
  },
};
