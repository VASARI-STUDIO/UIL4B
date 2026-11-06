// UI kit pages for theme 05, Catalogue: cover, contents, colour-light, colour-dark, type-scale, spacing, radii-borders, elevation, states.
// Styles are in css-u-found.js (classes start ku1-). Every page but the cover is the gate's open sheet (call number top left, rod hole at
// the foot) with its run head turned to the UI kit. The furniture: one drawer pulled out with one card lifted from it (cover), guide-card tabs (contents), role cards
// edge on in a drawer (colour), the card's indention lines (type), indentions on a card (spacing), See also references (radii and borders),
// the card lifted out of the stock (elevation) and, on the states page only, each control's states filed as cards behind it.
// Components are the engine's real ones (ctx.ui) in the brand's ui roles, always set on the open page or in a drawer, never in a card,
// except the states drawers the brief asks for. Brand copy is read only through A(); no brand name or hex is written here.
import { A, ratioText } from './helpers.js';
import { sheet, hole, pull } from './guidelines-k.js';
import { colourMap, tokenGroups } from '../../engine/tokens.js';
import { cssNum } from '../../engine/escape.js';

const m = (s) => `<span class="ku1-m">${A(s)}</span>`;
const sc = (ctx) => ctx.brand.ui.screen.content;
const byRole = (ctx, role) => ctx.colours.find((c) => c.role === role);
const nameOfHex = (ctx, hex) => ctx.colours.find((c) => c.hex.toLowerCase() === hex.toLowerCase())?.name;
const join = (a) => (a.length < 2 ? a.join('') : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`);
const range = (s) => { const a = s.pages[0].no, z = s.pages.at(-1).no; return a === z ? `page ${a}` : `pages ${a} to ${z}`; };
// a See also reference to another page of the kit: its title and page number
const see = (ctx, id) => { const p = ctx.pages.find((x) => x.id === id); return p ? `<p class="ku1-see"><b>See also</b> ${A(p.title)}, page <span class="num">${ctx.pageNo(id)}</span>.</p>` : ''; };
// the tracings line: numbered items, as at the foot of a catalogue card
const tracings = (items, cls = '') => `<p class="ku1-trace ${cls}">${items.map((t, i) => `<span class="num">${i + 1}.</span> ${t}`).join(' ')}</p>`;
// the open sheet, with the run head naming the UI kit (the gate's frame names the guidelines)
const kit = (ctx, id, inner, cls = '') => sheet(ctx, id, inner, `ku1-pg ${cls}`).replace(' brand guidelines</p>', ' UI kit</p>');
// a control with no label text, for the states drawers (the label sits on the choices page)
const bare = (html, label) => html.replace(/<span>[^<]*<\/span>/, '').replace('<input ', `<input aria-label="${A(label)}" `);

// ---- colour roles: label, token, value, swatch bg and fg, ring, measured ratio, note (the same twenty as before)
function roleRows(ctx, mode) {
  const M = colourMap(ctx, mode);
  const R = (a, b) => ({ t: ratioText(ctx.fmt(ctx.ratio(M[a], M[b]))), n: ctx.ratio(M[a], M[b]) });
  const g = (label, tok, note) => [label, tok, M[tok], M.text, '', R('text', tok), note];
  const t = (label, tok, bgTok, note) => [label, tok, M[bgTok], M[tok], '', R(tok, bgTok), note];
  // a status is words in one colour: the card is the page ground and the ratio is the words on it
  const st = (label, tok) => [label, tok, M.surface, M[tok], '', R(tok, 'surface'), 'On surface'];
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
  ].map(([label, tok, bg, fg, ring, ratio, n]) => ({ label, tok, val: M[tok], bg, fg, ring, ratio: ratio && ratio.t, note: n }));
}
// a role card, edge on, printed in its own pair as on the gate's contrast drawer: the whole edge is the swatch, and the role's name,
// note, token, value, the pair stepping down to 12 px and the measured ratio are all printed on it. The edge roles (control edge,
// divider, focus) draw their line round the Aa sample; the scrim prints in whichever of text and surface holds on it
const ACTION = ['action', 'action-hover', 'action-pressed', 'action-label'];
const band = (r, tag = 'div') => {
  const glyphs = r.tok === 'scrim' ? '<span class="ku1-rg"></span>' : `<span class="ku1-rg" style="${r.ring}" aria-hidden="true"><i class="ku1-g18">Aa</i><i class="ku1-g14">Aa</i><i class="ku1-g12">Aa</i></span>`;
  return `<${tag} class="ku1-rb" style="background:${r.bg};color:${r.fg}"><p class="ku1-rl"><b>${A(r.label)}</b><span>${A(r.note)}</span></p><p class="ku1-rt">${m('--' + r.tok)}${m(r.val)}</p>${glyphs}<b class="ku1-rr num">${r.ratio || 'Overlay'}</b></${tag}>`;
};
// a lean edge, for the light drawer: the role's name and note and the measured ratio, printed on the swatch in its own pair. The token and
// value are not printed on it (they are the group's tracings line under the drawer); the edge roles keep one Aa inside their line. The
// name stands at the cut of its group (first, middle or last third), so the edges do not make four columns of one table
const GROUP = [['Grounds', 0, ['surface', 'raised', 'sunken']], ['Text', 1, ['text', 'text-soft', 'quiet', 'quiet-sunken']], ['Edges and the rest', 2, ['edge', 'divider', 'focus', 'disabled-text', 'scrim']], ['Status', 1, ['success', 'warning', 'danger', 'info']]];
const cutOf = (tok) => (GROUP.find((g) => g[2].includes(tok)) || [0, 0])[1];
const lean = (r) => `<div class="ku1-rb ku1-rb--lean" style="background:${r.bg};color:${r.fg};--cut:${cutOf(r.tok)}"><p class="ku1-rl"><b>${A(r.label)}</b><span>${A(r.note)}</span></p>${r.ring ? `<span class="ku1-rg" style="${r.ring}" aria-hidden="true"><i class="ku1-g14">Aa</i></span>` : ''}<b class="ku1-rr num">${r.ratio || 'Overlay'}</b></div>`;
// each group's tokens and values as one line under the drawer, in mono; the four action roles carry theirs on the lifted card
const tokenLines = (rows) => `<div class="ku1-tks">${GROUP.map(([name, , toks]) => `<p class="ku1-tk"><b>${name}</b> ${toks.map((t) => rows.find((r) => r.tok === t)).map((r) => `${m('--' + r.tok)} ${m(r.val)}`).join(', ')}.</p>`).join('')}</div>`;
// the cards in filing order; the four action roles are one card, lifted out of the drawer with its tab showing
const roleCards = (rows, thin = false) => rows.filter((r) => !ACTION.includes(r.tok) || r.tok === 'action').map((r) => (r.tok === 'action'
  ? `<li class="ku1-rc ku1-rc--use"><span class="ku1-utab">${A(r.label)}</span><ol class="ku1-ug">${rows.filter((x) => ACTION.includes(x.tok)).map((x) => band(x, 'li')).join('')}</ol></li>`
  : `<li class="ku1-rc">${thin ? lean(r) : band(r)}</li>`));

function colourPage(ctx, id, mode) {
  const dark = mode === 'dark', act = byRole(ctx, 'action'), R = ctx.roles[mode];
  const rows = roleRows(ctx, mode).map((r) => {
    if (r.tok !== 'scrim') return r;
    const M = colourMap(ctx, mode), on = [M.text, M.surface].sort((a, b) => ctx.ratio(b, M.scrim) - ctx.ratio(a, M.scrim))[0];
    return { ...r, fg: on };
  });
  const note = dark ? `The same twenty roles on ${m(R.surface)}. The names do not change. Each card is printed in its own pair, and the four action roles are one card, lifted.` : 'Twenty roles, each card printed in its own pair. The number closing each card is the measured ratio. The four action roles are one card, lifted out of the drawer with its tokens and values. The tokens of the rest are filed by group under the drawer.';
  const rl = [
    `Roles name a job, not a colour. Components read ${m('--action')}, never a palette name, so ${dark ? 'dark' : 'light'} changes nothing in the markup.`,
    'Every text pair is measured. Text under 24 px needs 4.5 : 1. Edges, the focus ring and fills against their ground need 3 : 1.',
    dark ? `Dark takes a lighter ${A(act.name)} for the action, so it holds on the dark ground. The label turns ${A(nameOfHex(ctx, R.actionLabel) || 'dark')}.` : `${A(act.name)} is the action: the main button and links. Nothing decorative uses it.`,
  ];
  // light: one long drawer, all twenty roles filed in it. Dark: the drawer interior, two drawers side by side, ten roles each
  // (the action card opens the second drawer)
  const drawer = (list, k = '', thin = false) => `<div class="ku1-drw ${k}"><ol class="ku1-rcs">${roleCards(list, thin).join('')}</ol><span class="ku1-lip"></span></div>`;
  const body = dark
    ? `<div class="ui ku1-night" data-theme="dark">${drawer(rows.slice(0, 10), 'ku1-drw--half')}${drawer(rows.slice(10), 'ku1-drw--half')}</div>`
    : `<div class="ui ku1-day">${drawer(rows, '', true)}</div>`;
  return kit(ctx, id, `<p class="ku1-lead">${note}</p>${body}${dark ? '' : tokenLines(rows)}${tracings(rl, 'ku1-trace--foot')}`, `ku1-pg-col ${dark ? 'ku1-pg-col--dark' : ''}`);
}

export const uFound = {
  // one drawer pulled out of the cabinet, seen from the front, and one card lifted out of it. The lifted card carries the kit: the
  // version and date as its call number, the wordmark as the main entry, "UI kit" as the title, the logo's screen sizes in the
  // tracings and the rod hole clear of the drawer. Below it the guide cards show their four tabs, a tab to each section of the kit,
  // and the drawer front holds the label, the rod end and the pull
  cover(ctx) {
    const B = ctx.brand, T = ctx.uiType, body = T.filter((t) => t.face === 'body'), disp = T.filter((t) => t.face === 'display');
    const sizes = body.map((t) => t.size), weights = [...new Set(body.map((t) => t.weight))].sort((a, b) => a - b);
    const minW = ctx.logo.minSize.screenPx, steps = [400, 280, 190, 140].filter((w) => w > minW + 8).concat(minW);
    const n = ctx.sections.length;
    const tabs = ctx.sections.map((s, i) => `<li class="ku1-tab" style="left:calc(${i} * 100% / ${n});width:calc(100% / ${n})"><span class="ku1-tabin"><b class="k-disp num">${s.n}</b><span class="k-disp ku1-tabt">${A(s.title)}</span><span class="ku1-tabr num">${range(s)}</span></span></li>`).join('');
    const last = ctx.pages.at(-1);
    const px = (w) => `<span class="num">${w}</span>`;
    const card = `<div class="ku1-lift">
<p class="ku1-callno k-mono" aria-label="Version and date"><span>${A(B.version.number)}</span><span>${A(B.version.date)}</span></p>
<div class="ku1-entry">
<div class="ku1-cp--main">${ctx.logo.html('colour', { width: steps[0], label: 'Your logo goes here' })}</div>
<div class="ku1-titlep"><h1 class="k-disp ku1-kt">UI kit</h1></div>
</div>
${tracings([`Interface: ${A(B.fonts.body.family)}, ${join(weights.map(String))}, ${px(Math.min(...sizes))} to ${px(Math.max(...sizes))} px.`, `Headings: ${A(B.fonts.display.family)}, ${px(Math.min(...disp.map((t) => t.size)))} px and up.`, `Logo on screen: ${join(steps.map(px))} px wide, the last the minimum.`], 'ku1-trace--card')}
${hole(20, 'ku1-lhole')}
</div>`;
    const front = `<div class="ku1-front"><span class="k-holder"><i class="k-screw"></i><span class="k-label"><b>${A(B.name)} UI kit</b><span class="k-range num">pages 1 to ${ctx.pageNo(last.id)}</span></span><i class="k-screw"></i></span>${hole(18, 'ku1-rod')}${pull}</div>`;
    return `<section class="pg ku1-cover" data-page="cover">
<header class="ku1-chd"><p class="ku1-crh"><b>${A(B.name)} UI kit</b></p></header>
<div class="ku1-pulled">${card}<ol class="ku1-tabs" aria-label="Sections">${tabs}</ol><span class="ku1-stock"></span>${front}</div>
</section>`;
  },

  // guide cards stepping down the open page, third cut, each tab carrying the section number large; behind each guide, its pages filed
  // in order with their page numbers; the product line sits at the foot of the drawer
  contents(ctx) {
    const CUTS = ['l', 'c', 'r'];
    const secs = ctx.sections.map((s, i) => `<li class="ku1-gd ku1-gd--${CUTS[i % 3]}"><span class="ku1-gtab"><b class="k-disp ku1-gn num">${s.n}</b><span class="k-disp ku1-gt">${A(s.title)}</span></span>
<ol class="ku1-gps">${s.pages.map((p) => `<li><span class="ku1-gpn num">${p.no}</span><span class="ku1-gpt">${A(p.title)}</span></li>`).join('')}</ol></li>`).join('');
    return kit(ctx, 'contents', `<ol class="ku1-gds" aria-label="Sections">${secs}</ol><p class="ku1-prod">${A(ctx.brand.product)}</p>`, 'ku1-pg-ct');
  },

  'colour-light': (ctx) => colourPage(ctx, 'colour-light', 'light'),
  'colour-dark': (ctx) => colourPage(ctx, 'colour-dark', 'dark'),

  // the two faces as main entries, the display face's Aa at the size of the page; then the interface scale filed down the card's
  // first and second indention lines, largest first, each sample at its true size with its spec as the note under it
  'type-scale'(ctx) {
    const S = sc(ctx), F = S.form, B = ctx.brand;
    const sample = { caption: F.notesHelp, label: F.pickup, body: S.pickup, control: F.book, 'title-s': S.dialog.title, title: S.deliveries[0].to, headline: S.empty.title };
    const dsz = ctx.uiType.filter((t) => t.face === 'display').map((t) => t.size), bsz = ctx.uiType.filter((t) => t.face === 'body').map((t) => t.size);
    const sets = ['ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz', '0123456789&?!.,:;\'"()%/@#-'];
    const grid = (ff) => `<div class="ku1-cs" style="font-family:${ff}" aria-hidden="true">${sets.map((r) => [...r].map((c) => `<i>${A(c)}</i>`).join('')).join('')}</div>`;
    const wts = (ff, ws) => `<ul class="ku1-wts">${ws.map((w) => `<li>${m(String(w))}<span style="font-family:${ff};font-weight:${w}">${A(F.book)}</span></li>`).join('')}</ul>`;
    const face = (f, ff, spec, cls) => `<div class="ku1-face2 ${cls}"><span class="ku1-aa" style="font-family:${ff};font-weight:${f.weights.includes(500) ? 500 : cssNum(f.weights[0])}" aria-hidden="true">Aa</span>
<div class="ku1-fm"><h2 class="k-disp ku1-ff">${A(f.family)}</h2><p class="ku1-fs">${spec}</p>${grid(ff)}${wts(ff, f.weights)}</div></div>`;
    const faces = face(B.fonts.display, 'var(--display)', `Display, <span class="num">${dsz.length ? Math.min(...dsz) : 26}</span> px and up.`, 'ku1-face2--d')
      + face(B.fonts.body, 'var(--body)', `Interface, <span class="num">${Math.min(...bsz)}</span> to <span class="num">${Math.max(...bsz)}</span> px.`, 'ku1-face2--b');
    const steps = [...ctx.uiType].reverse().map((t) => {
      const ff = t.face === 'display' ? 'font-family:var(--ff-display);letter-spacing:0;' : 'font-family:var(--ff-body);';
      return `<li class="ku1-ts"><span class="ku1-tsx" style="${ff}font-size:${t.size}px;line-height:${t.line}px;font-weight:${t.weight}">${A(sample[t.token] || t.use)}</span><p class="ku1-tsn"><b>${A(t.token)}</b> ${m(`${t.size} / ${t.line} / ${t.weight}`)} ${A(t.use)}</p></li>`;
    }).join('');
    const rl = [
      `${A(B.fonts.display.family)} for titles and the one big line. ${A(B.fonts.body.family)} for everything people read.`,
      'Sizes are in px, then line height in px, then weight. Prices and dates use tabular figures, so a column lines up.',
      'Nothing on screen is smaller than 12 px.',
    ];
    return kit(ctx, 'type-scale', `<p class="ku1-lead">Both faces with character set and weights, then the interface scale from large to 12 px.</p>
<div class="ku1-faces">${faces}</div><ol class="ui ku1-tss">${steps}</ol>${tracings(rl, 'ku1-trace--foot')}`, 'ku1-pg-ty');
  },

  // the step itself at the size of the page; then every step as an indention on a card at true size: each line of the card starts
  // that far in from the card's ruled margin, the measure drawn above it, smallest to largest, as a catalogue card indents its lines
  spacing(ctx) {
    const uses = ['Inside a tight pair', 'Icon to label', 'Gaps in a row, field padding', 'Card padding', 'Dialog padding, button sides', 'Empty state padding', 'Between groups', 'Between sections'];
    const base = ctx.brand.ui.spacingBase;
    const steps = ctx.space.map((s, i) => `<li class="ku1-in${i === 0 ? ' ku1-in--use' : ''}" style="--w:${s.px}px"><span class="ku1-ing" aria-hidden="true"></span><p class="ku1-inx">${m(`--${s.token.replace('space-', 'sp-')}`)}<b class="num">${s.px} px</b><span class="ku1-inu">${A(uses[i] || '')}</span></p></li>`).join('');
    const inner = `<div class="ku1-sbig"><span class="k-disp ku1-sn num">${base}</span><div class="ku1-sside"><p class="k-disp ku1-su">px step</p>
<p class="ku1-lead ku1-lead--sp">Everything sits on a <span class="num">${base}</span> px step. A gap inside a group is smaller than the gap between groups, so grouping reads at a glance.</p></div></div>
<p class="ku1-small">The spacing scale as indentions on a card, at true size. Each line starts its step in from the ruled margin.</p>
<ol class="ku1-ins">${steps}</ol>
<p class="ku1-ctl">Controls are 44 px tall, which is eleven steps. Small buttons are 36 px.</p>`;
    return kit(ctx, 'spacing', inner, 'ku1-pg-sp');
  },

  // the corner of a card drawn at sixteen times on a pixel grid, its edge a sixteen-pixel band, as the page's one large figure; then
  // each radius and border on the open page with the component that carries it and a See also reference to where it is filed
  'radii-borders'(ctx) {
    const S = sc(ctx), ui = ctx.ui, [rc, rk, rr] = ctx.radii, [bh, bc, bf] = ctx.borders;
    const Z = 16, W = 288, o = 32, E = Math.max(bh.px, 1) * Z, R = Math.min(rk.px * Z, W - o - E), r = Math.max(R - E / 2, 0), c = o + E / 2;
    const grid = Array.from({ length: W / Z + 1 }, (_, i) => `M${i * Z} 0V${W}M0 ${i * Z}H${W}`).join('');
    const corner = `<svg class="ku1-corner" viewBox="0 0 ${W} ${W}" width="${W}" height="${W}" aria-hidden="true">
<path d="M${o} ${W}V${o + R}${R ? `A${R} ${R} 0 0 1 ${o + R} ${o}` : ''}H${W}V${W}Z" fill="var(--face)"/>
<path d="${grid}" fill="none" stroke="var(--rod)" stroke-width="1" opacity=".35"/>
<path d="M${c} ${W}V${c + r}${r ? `A${r} ${r} 0 0 1 ${c + r} ${c}` : ''}H${W}" fill="none" stroke="var(--ink)" stroke-width="${E}"/></svg>`;
    const big = `<figure class="ku1-rbig">${corner}<figcaption class="ku1-rnum"><p class="k-disp ku1-ru"><span class="num">${rk.px}</span> px radius</p><p class="ku1-rcap">A card corner, <span class="num">${rk.px}</span> px, drawn at <span class="num">16</span>x. Each square is one pixel, and the band is the card's <span class="num">${bh.px}</span> px edge.</p><p class="ku1-rsub">Controls <span class="num">${rc.px}</span> px, cards <span class="num">${rk.px}</span> px.</p></figcaption></figure>`;
    const spec = (name, tok, val, demo, use, ref, cls = '') => `<li class="ku1-spec ${cls}"><div class="ui ku1-demo">${demo}</div><p class="ku1-specn"><b>${A(name)}</b> ${m(tok)} <span class="num">${val}</span></p><p class="ku1-specu">${use}</p>${see(ctx, ref)}</li>`;
    const radii = [
      spec('Control', rc.token, `${rc.px} px`, `${ui.btn(S.form.book)}${ui.btn(S.call, { variant: 'secondary' })}`, A(rc.use), 'buttons'),
      spec('Card', rk.token, `${rk.px} px`, ui.card({ meta: S.status, title: S.deliveries[0].to, text: S.riderNote }), 'Cards, dialogs, panels', 'cards', 'ku1-spec--card'),
      spec('Round', rr.token, 'round', `<span class="ui-avatar">${ctx.edition === 'slot' ? ui.icon('user', 18) : A(S.initials)}</span>${ui.switch(S.example.switches[0], { checked: true })}`, 'Avatars and switches only', 'choices'),
    ].join('');
    const borders = [
      spec('Hairline', bh.token, `${bh.px} px`, `<ul class="ui-list">${ui.row({ title: S.deliverTo, sub: S.deliverToLabel, end: S.paid })}</ul>`, 'Dividers between rows', 'lists'),
      spec('Control edge', bc.token, `${bc.px} px`, ui.field({ id: 'ku1-rb1', label: S.form.pickup, value: S.form.pickupValue }), 'Inputs, selects, segmented controls', 'inputs'),
      spec('Focus', bf.token, `${bf.px} px`, ui.field({ id: 'ku1-rb2', label: S.form.dropoff, value: S.form.dropoffValue, state: 'focus' }), `Ring in ${m('--focus')}, on a <span class="num">${bf.px}</span> px gap`, 'states'),
    ].join('');
    const rl = [
      `Controls take a <span class="num">${rc.px}</span> px radius and cards <span class="num">${rk.px}</span>. Round is for avatars and switches only.`,
      `Control edges are <span class="num">${bc.px}</span> px so they hold against the ground. Dividers stay at <span class="num">${bh.px}</span> px.`,
      `The focus ring sits outside the edge, on a <span class="num">${bf.px}</span> px gap of the ground colour, so it shows on any fill.`,
    ];
    const inner = `${big}<div class="ku1-specs"><div class="ku1-col"><h2 class="k-disp ku1-colh">Radii</h2><ol>${radii}</ol></div><div class="ku1-col"><h2 class="k-disp ku1-colh">Borders</h2><ol>${borders}</ol></div></div>${tracings(rl, 'ku1-trace--foot')}`;
    return kit(ctx, 'radii-borders', inner, 'ku1-pg-rb');
  },

  // the three grounds in section, each a step up from the one below, as a card is lifted out of the stock; the hairline card beside
  // them; then what floats: a toast over the list it answers, with the dialog's edge and scrim named
  elevation(ctx) {
    const S = sc(ctx), ui = ctx.ui, R = ctx.roles.light;
    // top to bottom: Raised, a step above Surface, a step above Sunken; each layer set further in as it rises
    const steps = [['Raised', 'raised', 'Raised cards, sidebars, table headers', R.raised], ['Surface', 'surface', 'The page and every card on it', R.surface], ['Sunken', 'sunken', 'Chips, avatars, skeletons', R.sunken]]
      .map(([n, t, u, hex], i) => `<li class="ku1-st" style="--k:${2 - i};background:var(--${t})"><b>${A(n)}</b><span>${m('--' + t)} ${m(hex)}</span><span>${A(u)}</span></li>`).join('');
    const inner = `<p class="ku1-lead">How one thing sits above another.</p>
<div class="ku1-elv"><div class="ku1-elg"><h2 class="k-disp ku1-colh">Ground steps</h2><ol class="ui ku1-sts">${steps}</ol></div>
<div class="ku1-elh"><h2 class="k-disp ku1-colh">Hairline</h2><div class="ui ku1-demo">${ui.card({ meta: S.status, title: S.eta, text: S.pickup })}</div><p class="ku1-specu">${m('--divider')}<br>Card: 1 px ${m('--divider')}. A raised card drops the line.</p></div></div>
<div class="ku1-elf"><h2 class="k-disp ku1-colh">Floating</h2><p class="ku1-specu">${m('--text')} ${m('--shadow-float')}<br>Toast: a ${m('--text')} ground over the page it answers. Dialog: <span class="num">${ctx.borders[1].px}</span> px edge in ${m('--text')}, on a ${m('--scrim')} ground.</p>${see(ctx, 'dialog')}<div class="ui ku1-float"><ul class="ui-list">${S.deliveries.slice(0, 3).map((d) => ui.row({ lead: '<i class="ku-cvr" aria-hidden="true"></i>', title: d.to, sub: d.when, end: d.price, chip: ui.statusChip(d.status) })).join('')}</ul><div class="ku1-toastw">${ui.toast(S.toast)}</div></div></div>
${tracings([A(ctx.brand.ui.elevationNote), `${m('--shadow-float')} is ${m(String(tokenGroups(ctx).shadow['shadow-float']))}. There is no blur, no spread and no glow anywhere in the kit.`, 'Depth is three things only: a step in the ground, a hairline, or a control edge.'], 'ku1-trace--foot')}`;
    return kit(ctx, 'elevation', inner, 'ku1-pg-el');
  },

  // a drawer to each control: its states filed behind it as cards, edges showing, the state name on each tab, one state lifted with
  // its rule. A state the control does not have has no card; the drawer front says so
  states(ctx) {
    const S = sc(ctx), F = S.form, ui = ctx.ui, e = S.example;
    const rule = {
      hover: 'The fill steps up a shade and the label underlines. Outlined controls fill.', focus: `A ${ctx.borders[2].px} px ring on a ${ctx.borders[2].px} px gap.`,
      pressed: 'A darker fill, and the control scales to 0.97.', disabled: 'A flat fill and muted type. The reason sits beside it.', error: 'A red edge and a message under the field.',
    };
    const NAME = { rest: 'Rest', hover: 'Hover', focus: 'Focus', pressed: 'Pressed', disabled: 'Disabled', error: 'Error' };
    const btn = (variant, label) => (st) => ui.btn(label, { variant, state: st });
    // only the Error card holds the entry the field would reject; the other cards are empty (a valid entry is brand data, not the theme's)
    const field = (st, id) => ui.field({ id, label: F.ready, value: '', state: st });
    // [control, lifted state, cards [state, html], not used, no change]
    const drawers = [
      // the primary is never drawn disabled: when it cannot act yet, its label names the next step
      ['Primary button', 'hover', ['rest', 'hover', 'focus', 'pressed'].map((s) => [s, btn('primary', F.book)(s === 'rest' ? undefined : s)]), ['disabled', 'error'], []],
      ['Secondary button', 'pressed', ['rest', 'hover', 'focus', 'pressed', 'disabled'].map((s) => [s, btn('secondary', e.small)(s === 'rest' ? undefined : s)]), ['error'], []],
      ['Text field', 'error', [['rest', field(undefined, 'ku1-st-r')], ['focus', field('focus', 'ku1-st-f')], ['disabled', ui.field({ id: 'ku1-st-d', label: F.ready, value: '', disabled: true })], ['error', ui.field({ id: 'ku1-st-e', label: F.ready, value: F.readyValue, error: F.readyError })]], ['pressed'], ['hover']],
      ['Checkbox', 'focus', [['rest', bare(ui.check(e.checks[0]), e.checks[0])], ['focus', bare(ui.check(e.checks[0], { state: 'focus', checked: true }), e.checks[0])], ['disabled', bare(ui.check(e.checks[0], { disabled: true }), e.checks[0])]], ['pressed', 'error'], ['hover']],
      ['Switch', 'disabled', [['rest', bare(ui.switch(e.switches[0], { checked: true }), e.switches[0])], ['focus', bare(ui.switch(e.switches[0], { checked: true, state: 'focus' }), e.switches[0])], ['disabled', bare(ui.switch(e.switches[0], { disabled: true }), e.switches[0])]], ['pressed', 'error'], ['hover']],
    ];
    const names = (a) => join(a.map((s) => NAME[s]));
    // each state is a card with its tab on its own top edge, the tabs stepping across the drawer in filing order, so a tab never sits
    // over the card in front of it. The lifted card stands 14 px proud of the stock, its tab in the action colour, with its rule
    const drawer = ([name, lift, cards, nu, nc], k) => {
      const n = cards.length;
      const list = cards.map(([s, html], i) => {
        const up = s === lift, before = cards[i + 1]?.[0] === lift;
        return `<li class="ku1-sc${up ? ' ku1-sc--lift' : ''}${before ? ' ku1-sc--pre' : ''}" style="z-index:${i + 1}"><span class="ku1-stab" style="left:calc(${(i / Math.max(n - 1, 1)).toFixed(3)} * (100% - var(--tabw)))">${NAME[s]}</span><div class="ku1-sface"><div class="ui ku1-scui">${html}</div>${up ? `<p class="ku1-scr">${A(rule[s])}</p>` : ''}</div></li>`;
      }).join('');
      const why = (s) => (name === 'Primary button' && s === 'disabled' ? `${NAME[s]} (the label names the next step)` : NAME[s]);
      const notes = [nc.length ? `No change: ${names(nc)}.` : '', nu.length ? `Not used: ${join(nu.map(why))}.` : ''].filter(Boolean).join(' ');
      return `<div class="ku1-sd ku1-sd--${k}"><ol class="ku1-scs" aria-label="${A(name)} states">${list}</ol><div class="ku1-sfront"><span class="k-holder ku1-shold"><i class="k-screw"></i><span class="k-label"><b>${A(name)}</b></span><i class="k-screw"></i></span><p class="ku1-snote">${notes}</p></div></div>`;
    };
    const inner = `<p class="ku1-lead ku1-lead--st">Every control in every state, a state to a card, filed in a drawer per control. The lifted card carries its rule. A state a control does not have has no card, and the drawer front says so.</p>
<div class="ku1-sds"><div class="ku1-scol">${drawer(drawers[0], 'a')}${drawer(drawers[3], 'b')}</div><div class="ku1-scol">${drawer(drawers[1], 'a')}${drawer(drawers[4], 'b')}</div><div class="ku1-scol ku1-scol--f">${drawer(drawers[2], 'c')}</div></div>`;
    return kit(ctx, 'states', inner, `ku1-pg-st${ctx.edition === 'slot' ? ' ku1-pg-st--slot' : ''}`);
  },
};
