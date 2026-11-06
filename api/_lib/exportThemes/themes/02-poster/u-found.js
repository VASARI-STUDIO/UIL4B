// UI kit pages: cover, contents, colour-light, colour-dark, type-scale, spacing, radii-borders, elevation, states. Styles are in css-u-found.js
// (classes start tu1-). The pages stand on the gate's page (.pg.tk) and take its parts as they are: serials, fact fields, the perforation.
// Full tickets only on the cover (one roll) and the colour pages (the roles as rolls of tickets); the states run as one roll of serials.
// Everywhere else the perforation is an edge device on an open page. Components are the real engine components (ctx.ui) in the brand's
// ui roles, on Stock, or on Night for the dark pages; no component ever sits inside a ticket. No hex is written here.
import { A, ratioText, fit } from './helpers.js';
import { page, perf, fields, serial, byRole, inkOn, same } from './gate.js';
import { colourMap, tokenGroups } from '../../engine/tokens.js';

const m = (s) => `<span class="tu1-m">${A(s)}</span>`;
const rt = (ctx, a, b) => ratioText(ctx.fmt(ctx.ratio(a, b)));
const NW = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const nw = (n) => { const w = NW[n] || String(n); return w[0].toUpperCase() + w.slice(1); };
const sc = (ctx) => ctx.brand.ui.screen.content;
// the perforation on an open page: holes 3 px across at a 9 px pitch, in the page's ink, on the left (or top) edge of its block
const pv = () => perf('currentColor', { d: 3, p: 9, cls: 'tu1-perf' });
const ph = () => perf('currentColor', { d: 3, p: 9, dir: 'h', cls: 'tu1-perf' });
const na = (t = 'Not used') => `<span class="tu1-na">${A(t)}</span>`;
// a page's headline: two short sentences, the second on its own line
const head2 = (a, b, cls = '') => `<h1 class="disp tu1-h ${cls}">${A(a)}<br>${A(b)}</h1>`;

// ---- colour roles, one list for light and dark (the same rows, values and notes the old pages carried)
function roleRows(ctx, mode) {
  const M = colourMap(ctx, mode);
  const R = (a, b) => rt(ctx, M[a], M[b]);
  const g = (label, tok, note) => [label, tok, M[tok], M.text, '', R('text', tok), note];
  const t = (label, tok, bgTok, note) => [label, tok, M[bgTok], M[tok], '', R(tok, bgTok), note];
  const st = (label, tok) => [label, tok, M.surface, M[tok], '', R(tok, 'surface'), 'Words on surface'];
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
// the roles after Surface, as four rolls: one roll of tickets per job. In light, Disabled text closes the Action roll (its tickets are
// tall there); in dark it rides with the edges, so the four hanging columns come out even.
const GROUNDS = ['Grounds and text', ['raised', 'sunken', 'text', 'text-soft', 'quiet', 'quiet-sunken']], STATUS = ['Status', ['success', 'warning', 'danger', 'info']];
const EDGES = ['Edges and overlay', ['edge', 'divider', 'focus', 'scrim']], ACTION = ['Action', ['action', 'action-hover', 'action-pressed', 'action-label']];
const ROLLS = [GROUNDS, ['Edges, overlay, disabled', [...EDGES[1], 'disabled-text']], ACTION, STATUS];

// one role printed as a ticket on its roll: its fill, its text, its ratio as the price, its token and value. The scrim is an overlay, so
// its ticket is the surface with a swatch of the scrim on it. Holes take the page ground (or the control edge where the ticket is the page).
function roleTicket(ctx, r, M, ground, first, dir) {
  const scr = r.tok === 'scrim', bg = scr ? M.surface : r.bg, fg = scr ? M.text : r.fg, onPage = same(bg, ground);
  const hole = perf(onPage ? M.edge : ground, { d: 4, p: 9, dir, cls: 'tu1-hole' });
  return `<div class="tu1-rt${onPage && !r.ring ? ' tu1-edge' : ''}" style="background:${bg};color:${fg};${r.ring}">${first ? '' : hole}
<b class="tu1-rt__n">${A(r.label)}</b><div class="tu1-rt__b"><span class="tu1-m">--${A(r.tok)}</span><span class="tu1-rt__r num">${r.ratio || 'Overlay'}</span></div>
<div class="tu1-rt__b"><span class="tu1-m">${A(r.val)}</span><span class="tu1-rt__u">${A(r.note)}</span></div>${scr ? `<i class="tu1-rt__sc" style="background:${r.val}"></i>` : ''}</div>`;
}
// the lead and the note under each colour page (kept from the old pages)
function colourWords(ctx, mode) {
  const dark = mode === 'dark', R = ctx.roles[mode], nm = (hex) => (ctx.colours.find((c) => same(c.hex, hex)) || {}).name || hex;
  const lead = `Components read ${m('--action')}, never a palette name, so ${dark ? 'dark' : 'light'} changes nothing in the markup. Text under 24 px needs 4.5&nbsp;:&nbsp;1. Edges, the ring and fills need 3&nbsp;:&nbsp;1.`;
  const note = dark ? `In dark the action is ${A(nm(R.action))} and its label ${A(nm(R.actionLabel))}: the one lit button on a ${A(nm(R.surface))} page.` : `In light the action is ${A(nm(R.action))} and its label ${A(nm(R.actionLabel))}, so a button still carries the one lit colour.`;
  return { lead, note };
}
// Surface, the role used most, as one hard ticket: the body carries the face in its own colours, the stub its token, value and ratio
function surfaceTicket(ctx, by, ground, cls, M) {
  const h = by.surface;
  const body = `<div class="tu1-sf__body"><span class="tk-sn">${serial(1, 3)}</span><span class="disp tu1-sf__aa" aria-hidden="true">Aa</span><b class="disp tu1-sf__n">${A(h.label)}</b></div>`;
  const stub = `<div class="tu1-sf__stub">${perf(same(h.bg, ground) ? M.edge : ground, { d: 6, p: 14, cls: 'tu1-hole' })}${fields([['Token', `<span class="tu1-m">--${A(h.tok)}</span>`], ['Value', `<span class="tu1-m">${A(h.val)}</span>`], ['Text on it', `<span class="num">${h.ratio}</span>`]], 'tu1-ff tu1-ff--stack')}</div>`;
  return `<div class="tu1-sf ${cls}${same(h.bg, ground) ? ' tu1-edge' : ''}" style="background:${h.bg};color:${h.fg}">${body}${stub}</div>`;
}

export const uFound = {
  // one Door red roll across the page: the logo on the face ticket, the kit's name on the next, the roll running on off the right edge.
  // Under it, every logo version as a run of serials, each on the ground its colourway is drawn for.
  cover(ctx) {
    const B = ctx.brand, slot = ctx.edition === 'slot', red = byRole(ctx, 'action'), ink = inkOn(ctx, red.hex), stock = ctx.roles.light.surface;
    const last = ctx.pages[ctx.pages.length - 1].id, hole = { d: 8, p: 20, cls: 'tu1-hole' };
    const logo = slot ? ctx.logo.html('reversed', { width: 420, color: B.logo.colourways.reversed.name, label: 'Your logo goes here' }) : ctx.logo.html('reversed', { width: fit(ctx, 'reversed', 560, 112) });
    const face = `<div class="tu1-cv__face"><div class="tu1-cv__top"><span class="tk-sn">${serial(1, 3)}</span><span class="tk-sn">${A(B.city)}</span></div>
<div class="tu1-cv__logo">${logo}</div>${fields([['Document', 'UI kit'], ['Version', A(B.version.number), 'num'], ['Date', A(ctx.date)]], 'tu1-ff')}</div>`;
    const kit = `<div class="tu1-cv__kit">${perf(stock, hole)}<span class="tk-sn">${serial(2, 3)}</span><p class="disp tu1-cv__name">UI kit</p><p class="tu1-cv__line">${A(B.lines.primary)}</p>
${fields([['Kept by', 'Example project']], 'tu1-ff tu1-ff--kept')}</div>`;
    // the last ticket on the roll says how much kit there is: its sections and its pages
    const tail = `<div class="tu1-cv__tail">${perf(stock, hole)}<span class="tk-sn">${serial(3, 3)}</span>${fields([['Sections', `<span class="num">${ctx.sections.length}</span>`], ['Pages', `<span class="num">${ctx.pageNo(last)}</span>`]], 'tu1-ff tu1-ff--stack tu1-ff--tail')}</div>`;
    const roll = `<div class="tu1-cv__roll" style="background:${red.hex};color:${ink}">${face}${kit}${tail}</div>`;
    const vers = ctx.logo.versions.map((id, i) => {
      const cw = B.logo.colourways[ctx.logo.colourwayOf(id)], g = cw.ground, onPage = same(g, stock), w = fit(ctx, id, 170, 52), sw = Math.min(w, 150);
      // a slot cell narrower than 120 px drops the words, so they never spill out of the frame (as 05 does)
      const lg = slot ? ctx.logo.html(id, { width: sw, color: cw.name, ...(sw < 120 ? { label: '' } : {}) }) : ctx.logo.html(id, { width: w });
      // the full-colour logo, first on the strip, takes twice the room of the others
      return `<li class="tu1-vs${onPage ? '' : ' tu1-vs--g'}" style="flex:${i ? 1 : 2} 1 ${Math.max(140, w + 32) * (i ? 1 : 2)}px;${onPage ? '' : `background:${g};color:${inkOn(ctx, g)}`}">${i ? pv() : ''}<span class="tk-sn">${serial(i + 1, 3)}</span><div class="tu1-vs__l">${lg}</div><span class="tu1-vs__n">${A(ctx.logo.labels[id])}</span></li>`;
    }).join('');
    const hd = `<header class="tk-hd"><span>UI kit</span><span class="num">${ctx.pageNo('cover')}</span></header>`;
    return `<section class="pg tk tu1 tu1--cover" data-page="cover">${hd}${roll}<div class="tu1-vstrip">${ph()}<ol class="tu1-vss">${vers}</ol></div></section>`;
  },

  // the running order as seat rows: each section a row torn from the next, its name and pages on the body, its first page on the stub
  contents(ctx) {
    const S = ctx.sections;
    const rows = S.map((s, i) => `<li class="tu1-co__r">${ph()}<div class="tu1-co__t"><span class="tk-sn">${serial(i + 1, 3)}</span><h2 class="disp">${A(s.title)}</h2></div>
<ol class="tu1-co__set">${s.pages.map((p) => `<li><span class="tu1-no num">${p.no}</span><span>${A(p.title)}</span></li>`).join('')}</ol>
<div class="tu1-co__stub">${pv()}<span class="tu1-co__k">Page</span><span class="tu1-co__p num">${s.pages[0].no}</span></div></li>`).join('');
    return page(ctx, 'contents', `<p class="disp tu1-co__line">${A(ctx.brand.lines.primary)}</p><ol class="tu1-co">${rows}</ol>`, 'tu1 tu1--contents');
  },

  // light: Surface as the one big hard ticket, the headline beside it; Grounds unwinding across the page, then Edges and Action (the one
  // lit colour, twice as tall) on the body, and Status hanging down the stub beyond the perforation
  'colour-light'(ctx) {
    const M = colourMap(ctx, 'light'), rows = roleRows(ctx, 'light'), by = Object.fromEntries(rows.map((r) => [r.tok, r])), G = ctx.roles.light.surface;
    const { lead, note } = colourWords(ctx, 'light');
    const roll = ([name, toks], lit) => `<div class="tu1-roll${lit ? ' tu1-roll--lit' : ''}"><span class="tu1-roll__k">${A(name)}</span><div class="tu1-roll__t">${toks.map((t, i) => roleTicket(ctx, by[t], M, G, i === 0, 'v')).join('')}</div></div>`;
    const stub = `<div class="tu1-cl__stub">${pv()}<span class="tu1-roll__k">${A(STATUS[0])}</span><div class="tu1-hang__t">${STATUS[1].map((t, i) => roleTicket(ctx, by[t], M, G, i === 0, 'h')).join('')}</div></div>`;
    const top = `<div class="tu1-cl__top">${surfaceTicket(ctx, by, G, 'tu1-sf--big', M)}<div class="tu1-cl__say">${head2('Roles, not colours.', 'Here in the light.')}<p class="tk-lead">${lead}</p><p class="tk-lead">${note}</p></div></div>`;
    const split = `<div class="tu1-cl__split"><div class="tu1-rolls">${roll(EDGES)}${roll(['Action', [...ACTION[1], 'disabled-text']], true)}</div>${stub}</div>`;
    return page(ctx, 'colour-light', `${top}<div class="tu1-cl__low">${roll(GROUNDS)}${split}</div>`, 'tu1 tu1--cl');
  },

  // dark, the queue at night: the same roles, the rolls hanging down from the head like tickets at the door; Surface on the left
  'colour-dark'(ctx) {
    const M = colourMap(ctx, 'dark'), rows = roleRows(ctx, 'dark'), by = Object.fromEntries(rows.map((r) => [r.tok, r])), G = ctx.roles.dark.surface;
    const { lead, note } = colourWords(ctx, 'dark');
    const cols = ROLLS.map(([name, toks]) => `<div class="tu1-hang"><span class="tu1-roll__k">${A(name)}</span><div class="tu1-hang__t" style="--n:${toks.length}">${toks.map((t, i) => roleTicket(ctx, by[t], M, G, i === 0, 'h')).join('')}</div></div>`).join('');
    const left = `<div class="tu1-cd__l">${head2('Roles, not colours.', 'Here in the dark.', 'tu1-h--s')}${surfaceTicket(ctx, by, G, 'tu1-sf--tall', M)}<div class="tu1-cd__w"><p class="tk-lead">${lead}</p><p class="tk-lead">${note}</p></div></div>`;
    return page(ctx, 'colour-dark', `<div class="tu1-cd">${left}<div class="tu1-hangs">${cols}</div></div>`, 'tu1 tu1--cd tu1-night');
  },

  // the scale as print on a ticket, biggest line first: each size set at its true size in the product's own words, its spec in the fine
  // print under it. The faces and the rule sit on the stub beyond the perforation.
  'type-scale'(ctx) {
    const S = sc(ctx), F = S.form, B = ctx.brand, d = B.fonts.display;
    const sample = { caption: F.notesHelp, label: F.pickup, body: S.pickup, control: F.book, 'title-s': S.dialog.title, title: S.rider, headline: S.eta };
    // slot: a descriptor box is set at 18 px at most and would wrap at the big sizes, so the page that shows the scale sets the three
    // display steps in neutral words true for any brand, at their own size and line height
    if (ctx.edition === 'slot') Object.assign(sample, { headline: 'Headline', title: 'Screen title', 'title-s': 'Card title' });
    const small = Math.min(...ctx.uiType.map((t) => t.size));
    const rows = [...ctx.uiType].reverse().map((t) => {
      const face = t.face === 'display' ? `font-family:var(--display);font-stretch:${d.stretch || 100}%;letter-spacing:-0.01em;` : 'font-family:var(--body);';
      return `<li class="tu1-ts__r"><span class="tu1-ts__px num">${t.size}</span><div class="tu1-ts__b"><p class="tu1-ts__s" style="${face}font-size:${t.size}px;line-height:${t.line}px;font-weight:${t.weight}">${A(sample[t.token] || t.use)}</p>
<p class="tu1-ts__f"><span class="tu1-m">${A(t.token)}</span><b class="num">${t.size} / ${t.line} / ${t.weight}</b><span>${A(t.use)}</span></p></div></li>`;
    }).join('');
    const lead = `${A(d.family)} for headlines and big figures. ${A(B.fonts.body.family)} for everything people read. Sizes are px, then line height, then weight. Nothing is smaller than ${small}.`;
    // each face named in itself at 38 px, straight under the lead
    const faceLine = (css, fam) => `<span class="tu1-ts__face" style="${css}">${A(fam)}</span>`;
    const stub = `<div class="tu1-ts__stub">${pv()}${head2('Two faces.', `${nw(ctx.uiType.length)} sizes.`, 'tu1-h--s')}<p class="tk-lead">${lead}</p>
${fields([['Display', faceLine(`font-family:var(--display);font-stretch:${d.stretch || 100}%;letter-spacing:-0.01em;font-weight:800`, d.family)], ['Body', faceLine('font-family:var(--chrome);font-weight:400', B.fonts.body.family)]], 'tu1-ff tu1-ff--stack tu1-ff--faces')}</div>`;
    return page(ctx, 'type-scale', `<div class="tu1-ts"><ol class="tu1-ts__rs">${rows}</ol>${stub}</div>`, 'tu1 tu1--ts');
  },

  // each step is a ticket torn at the perforation and pulled apart by the step: the body carries its serial, token and job, the gap
  // between body and stub is the step drawn at four times, and the stub carries the figure. Stacked smallest first, the stubs walk out
  // to the right, so the scale reads as stub positions, never as a row of squares.
  spacing(ctx) {
    const base = ctx.brand.ui.spacingBase, Z = 4, G = ctx.roles.light.surface;
    const uses = ['Inside a tight pair', 'Icon to label', 'Field padding, row gaps', 'Card padding', 'Button sides, dialog padding', 'Between related blocks', 'Between groups', 'Between sections'];
    const hole = (edge) => perf(G, { d: 6, p: 12, cls: `tu1-hole${edge ? ' tk-perf--edge-r' : ''}` });
    const rows = ctx.space.map((s, i) => `<li class="tu1-sp__r"><div class="tu1-sp__body"><span class="tk-sn">${serial(i + 1, 3)}</span>${m('--' + s.token.replace('space-', 'sp-'))}<span class="tu1-sp__u">${A(uses[i] || '')}</span>${hole(true)}</div>
<span class="tu1-sp__gap" style="width:${s.px * Z}px" aria-hidden="true"></span><div class="tu1-sp__stub">${hole(false)}<span class="tu1-sp__n num">${s.px}</span><span class="tu1-sp__px">px</span></div></li>`).join('');
    const lead = `Every gap is a step on this scale. A gap inside a group is smaller than the gap between groups, so grouping reads at a glance. Controls are 44 tall: ${nw(44 / base).toLowerCase()} steps.`;
    const top = `<div class="tu1-sp__top">${head2(`Steps of ${base}.`, 'Nothing between.')}<p class="tk-lead">${lead}</p></div>`;
    return page(ctx, 'spacing', `${top}<div class="tu1-sp"><ol class="tu1-sp__rs">${rows}</ol><p class="tu1-cap">Each tear drawn at ${Z}&times;: the gap between body and stub is the step. Figures are px at 1&times;.</p></div>`, 'tu1 tu1--sp');
  },

  // radius on the body: each corner drawn at sixteen times, the real components that take it beside the figure. Border width on the
  // stub beyond the perforation: each weight drawn at eight times over the control that carries it.
  'radii-borders'(ctx) {
    const S = sc(ctx), ui = ctx.ui, F = S.form, [rc, rk, rr] = ctx.radii, [bh, bc, bf] = ctx.borders, K = 16, Kb = 8;
    const corner = (r) => {
      const R = r.px > 999 ? 64 : r.px * K, W = 168, H = 112;
      const d = r.px > 999 ? `M ${W} 2 H ${R + 2} A ${R} ${R} 0 0 0 ${R + 2} ${2 * R + 2} H ${W}` : `M 2 ${H} V ${R + 2} A ${R} ${R} 0 0 1 ${R + 2} 2 H ${W}`;
      return `<svg class="tu1-rb__fig" aria-hidden="true" width="${W}" height="${r.px > 999 ? 2 * R + 4 : H}"><path d="${d}" fill="none" stroke="currentColor" stroke-width="3"/></svg>`;
    };
    const spec = (title, use) => `<p class="tu1-rb__k"><b>${A(title)}</b><span>${A(use)}</span></p>`;
    const rad = [
      [rc, `${rc.token}, ${rc.px} px`, `<div class="tu1-rb__row">${ui.btn(F.book)}${ui.btn(S.example.secondary, { variant: 'secondary' })}</div>`],
      [rk, `${rk.token}, ${rk.px} px`, `<div class="tu1-rb__card">${ui.card({ meta: S.status, title: S.rider, text: S.riderNote })}</div>`],
      [rr, `${rr.token}, round`, `<div class="tu1-rb__row"><span class="ui-avatar">${A(S.initials)}</span>${ui.switch('Text me', { checked: true })}</div>`],
    ].map(([r, t, c], i) => `<li class="tu1-rb__r">${i ? pv() : ''}<span class="tk-sn">${serial(i + 1, 3)}</span>${corner(r)}${spec(t, r.use)}<div class="ui tu1-ui">${c}</div></li>`).join('');
    const bor = [
      [bh, `<ul class="ui-list tu1-rb__list">${ui.row({ title: S.deliverTo, sub: S.from, end: S.paid })}</ul>`],
      [bc, ui.field({ id: 'tu1-rb1', label: F.pickup, value: F.pickupValue })],
      [bf, ui.field({ id: 'tu1-rb2', label: F.dropoff, value: F.dropoffValue, state: 'focus' })],
    ].map(([b, c], i) => `<li class="tu1-rb__b">${i ? ph() : ''}<i class="tu1-rb__w" style="height:${b.px * Kb}px"></i>${spec(`${b.token}, ${b.px} px`, b.use)}<div class="ui tu1-ui">${c}</div></li>`).join('');
    const lead = `Controls take a ${rc.px} px radius and cards ${rk.px}. Round is for avatars and switches only. The focus ring sits outside the edge on a ${bf.px} px gap of the ground, so it shows on any fill.`;
    // the line drops to the head of the stub at lead size, so the corners on the body are the large thing and the page does not open on the slogan
    const body = `<div class="tu1-rb__body"><h2 class="tk-h3">Radius <span class="tu1-rb__x">drawn at ${K}&times;</span></h2><ol class="tu1-rb__rs">${rad}</ol></div>`;
    const stub = `<div class="tu1-rb__stub">${pv()}<div class="tu1-rb__t"><h1 class="tu1-lh">${A(`Corners of ${rc.px}. Cards of ${rk.px}.`)}</h1><p class="tk-lead">${lead}</p></div><h2 class="tk-h3">Border width <span class="tu1-rb__x">drawn at ${Kb}&times;</span></h2><ol class="tu1-rb__bs">${bor}</ol></div>`;
    return page(ctx, 'radii-borders', `<div class="tu1-rb">${body}${stub}</div>`, 'tu1 tu1--rb');
  },

  // at night, where the steps show: four grounds rising from the foot of the page like stairs, Sunken lowest and the dialog on its scrim
  // at the top, each step carrying the real component that stands on it
  elevation(ctx) {
    const S = sc(ctx), ui = ctx.ui, g = tokenGroups(ctx);
    // the dialog has its own page; here the floating step carries a toast, in the brand's own words
    const toast = ui.toast(ctx.brand.lines.others[1] || ctx.brand.lines.primary);
    const steps = [
      ['Sunken', 'sunken', 'Avatars, skeletons', `<div class="tu1-el__row"><span class="ui-avatar">${A(S.initials)}</span>${ui.chip(S.status, 'neutral')}</div>`, ''],
      ['Surface', 'surface', 'The page and every card on it', ui.card({ meta: S.status, title: S.eta, text: S.pickup }), `<b>Card</b> ${m('--divider')} at ${ctx.borders[0].px} px. A raised card drops the line.`],
      ['Raised', 'raised', 'Tickets, sidebars, table headers', ui.card({ meta: S.status, title: S.rider, text: S.riderNote, raised: true }), ''],
      ['Floating', 'scrim', 'Toasts, menus and dialogs, over everything', `<div class="tu1-el__fl">${toast}</div>`, `<b>Toast</b> a ${m('--text')} fill, no shadow. A dialog takes a ${ctx.borders[1].px} px edge in ${m('--text')} on a ${m('--scrim')} ground.`],
    ];
    const stair = steps.map(([n, t, u, c, cap], i) => `<li class="tu1-el__s tu1-el__s--${i}" style="background:var(--${t})"><div class="tu1-el__k"><span class="tk-sn">${serial(i + 1, 3)}</span><p><b>${A(n)}</b> ${m('--' + t)}</p><p class="tu1-el__u">${A(u)}</p></div><div class="tu1-el__c">${c}</div>${cap ? `<p class="tu1-el__cap">${cap}</p>` : ''}</li>`).join('');
    const lead = `${A(ctx.brand.ui.elevationNote)} ${m('--shadow-float')} is ${m(String(g.shadow['shadow-float']))}.`;
    return page(ctx, 'elevation', `<div class="tu1-el__top">${head2('No shadows.', 'Steps and edges.')}<p class="tk-lead">${lead}</p></div><ol class="ui tu1-el" data-theme="dark">${stair}</ol>`, 'tu1 tu1--el tu1-night');
  },

  // the states as one roll of serials across the head of the page: each state a ticket, its name on the body and its spec on the stub
  // under the perforation. The real controls stand on Stock under their state, one row each.
  states(ctx) {
    const S = sc(ctx), ui = ctx.ui, F = S.form, roll = ctx.roles.light.text, rollInk = ctx.roles.light.surface;
    const cols = [
      ['Rest', 'The control as it stands.'], ['Hover', `Action steps to ${m('--action-hover')}. Outlined controls fill ${m('--sunken')}.`], ['Focus', `A ${ctx.borders[2].px} px ring in ${m('--focus')} on a ${ctx.borders[2].px} px gap.`],
      ['Pressed', `Action goes to ${m('--action-pressed')} and the control scales to 0.97.`], ['Disabled', `${m('--disabled-bg')} fill, ${m('--disabled-text')} type.`], ['Error', `${m('--danger')} edge and a message under the field.`],
    ];
    const tix = cols.map(([n, spec], i) => `<li class="tu1-st__t">${i ? perf(rollInk, { d: 4, p: 9, cls: 'tu1-hole' }) : ''}<div class="tu1-st__body"><span class="tk-sn">${serial(i + 1, 3)}</span><b class="tu1-st__n">${A(n)}</b></div><p class="tu1-st__spec">${spec}</p>${i === cols.length - 1 ? perf(rollInk, { d: 4, p: 9, cls: 'tu1-hole tk-perf--edge-r' }) : ''}</li>`).join('');
    const foot = `<p class="tu1-st__lead">Rest, hover, focus, pressed, disabled and error, drawn on the real components. Where a control has no change, the cell says so.</p>`;
    // the lead sits in the corner beside the roll, where the eye meets the matrix
    const strip = `<div class="tu1-st__corner">${foot}</div><ol class="tu1-st__roll" style="background:${roll};color:${rollInk}">${tix}<li class="tu1-st__tear" aria-hidden="true">${perf(rollInk, { d: 4, p: 9, dir: 'h', cls: 'tu1-hole' })}</li></ol>`;
    const btn = (variant, label) => (st) => ui.btn(label, { variant, state: st });
    // slot: the value is the descriptor sentence, which a one-line field clips mid-word; there it holds a short neutral entry
    const val = ctx.edition === 'slot' ? 'Sample entry' : F.readyValue;
    const field = (st, id) => ui.field({ id, label: F.ready, value: val, state: st });
    const row = (name, cells) => `<div class="tu1-st__name">${ph()}<span>${A(name)}</span></div>${cells.map((c) => `<div class="ui tu1-ui tu1-st__c">${ph()}${c}</div>`).join('')}`;
    const rows = [
      row('Primary button', [undefined, 'hover', 'focus', 'pressed'].map(btn('primary', F.book)).concat(na('Not used: the label names the next step'), na())),
      row('Secondary button', [undefined, 'hover', 'focus', 'pressed', 'disabled'].map(btn('secondary', S.example.secondary)).concat(na())),
      row('Text field', [field(undefined, 'tu1-st-r'), na('No change'), field('focus', 'tu1-st-f'), na(), ui.field({ id: 'tu1-st-d', label: F.ready, value: val, disabled: true }), ui.field({ id: 'tu1-st-e', label: F.ready, value: val, error: F.readyError })]),
      row('Checkbox', [ui.check(S.example.checks[0]), na('No change'), ui.check(S.example.checks[0], { state: 'focus' }), na(), ui.check(S.example.checks[0], { disabled: true }), na()]),
      row('Switch', [ui.switch(S.example.switches[0], { checked: true }), na('No change'), ui.switch(S.example.switches[0], { checked: true, state: 'focus' }), na(), ui.switch(S.example.switches[0], { disabled: true }), na()]),
    ].join('');
    // the headline runs the full width above the roll
    return page(ctx, 'states', `<h1 class="disp tu1-h tu1-st__h">Six states. Every control.</h1><div class="tu1-st">${strip}${rows}</div>`, 'tu1 tu1--st');
  },
};
