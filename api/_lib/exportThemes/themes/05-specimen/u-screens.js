// UI kit pages: screen-light, screen-dark, screen-mobile, tokens, code. Styles are in css-u-screens.js (classes start ku4-).
// Open catalogue sheets: the call number and title top left, the rod hole at the foot. The screens are the product's own UI in the
// brand's ui roles; the page furniture around them is the catalogue's: guide-card tabs, an open drawer, tracings and See also lines.
// Every value comes from ctx and the brand; no brand name or hex is written here.
import { A } from './helpers.js';
import { hole } from './guidelines-k.js';
import { colourMap, tokenGroups } from '../../engine/tokens.js';

const sc = (ctx) => ctx.brand.ui.screen.content;
const byRole = (ctx, role) => ctx.colours.find((c) => c.role === role);
const mono = (s) => `<span class="ku4-mono">${A(s)}</span>`;
const n = (v) => `<span class="num">${v}</span>`;
// navigation: the brand's own links, plus Account as the fourth destination (tab bar)
const nav = (ctx) => { const e = sc(ctx).example; return [...e.links, [e.account, 'user']]; };
// a cross-reference to another page of the kit, by its title and folio
const see = (ctx, id) => `${A(ctx.pages.find((p) => p.id === id).title)}, page ${n(ctx.pageNo(id))}`;
const join = (a) => (a.length < 2 ? a.join('') : `${a.slice(0, -1).join(', ')} and ${a.at(-1)}`);
// tracings: numbered entries run together, as at the foot of a catalogue card
const trace = (items) => items.map((t, i) => `${n(i + 1 + '.')} ${t}`).join(' ');
// a guide card seen edge on: its tab stands on the rule, set at one of the catalogue's cut positions
const guide = (name, cut, inner, cls = '') => `<section class="ku4-guide ${cls}" style="--cut:${cut}"><h2 class="ku4-gtab"><span>${name}</span></h2><div class="ku4-gbody">${inner}</div></section>`;

// the open sheet of the UI kit: the gate's frame and classes, with the kit's run head
function sheet(ctx, id, inner, cls = '') {
  const p = ctx.pages.find((x) => x.id === id);
  return `<section class="pg k-sheet ku4-pg ${cls}" data-page="${id}">
<header class="k-hd"><div><span class="k-call k-mono">${A(p.ref || '')}</span><h1 class="k-ttl">${A(p.title)}</h1></div><p class="k-rh">${A(ctx.brand.name)} UI kit</p></header>
${inner}
<footer class="k-ft">${hole(16)}<span class="k-fo num">${ctx.pageNo(id)}</span></footer></section>`;
}

// ---- the product screens
const logoIn = (ctx, dark) => ctx.logo.html('horizontal', dark ? { width: 112, colourway: 'mono-light', color: 'var(--text)', label: 'Logo' } : { width: 112, color: 'var(--text)', label: 'Logo' });
// the supplied cover, as a flat panel with its caption: the kit never shows a photo
const coverArt = (ctx, title, cls = '') => `<div class="ku4-cover ${cls}" role="img" aria-label="Cover of ${A(title)}"><span>Cover of ${A(title)}, supplied by ${A(ctx.brand.name)}</span></div>`;
const progress = (S) => `<div class="ui-progress" role="progressbar" aria-label="Print progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(S.progress * 100)}"><div class="ui-progress__bar"><i style="width:${S.progress * 100}%"></i></div><span class="ui-progress__dot" style="left:${S.progress * 100}%"></span></div><div class="ku4-route"><span>${A(S.from)}</span><span>${A(S.to)}</span></div>`;
// a status chip whose label is a placeholder in the slot edition: the state names are the sample brand's own words
const stateOf = (ctx, id) => (ctx.status.find((s) => s.id === id) || { label: '' }).label;
const chip = (ctx, id) => ctx.ui.statusChip(id, { label: ctx.ph('ui.screen.content.status', stateOf(ctx, id)) });
// the line on what the action colour marks: the action, and the state it also fills if the brand gives one
const actLine = (ctx, act) => { const s = ctx.status.find((x) => x.tone === 'action'); return s ? `${A(act.name)} marks the action and the ${A(ctx.ph('ui.screen.content.status', s.label))} state, and nothing else.` : `${A(act.name)} marks the action, and nothing else.`; };
// the row's lead is a drawn book cover (a spine and a title bar), no brand word on it, so it holds in the slot too
const bookRows = (ctx, rows) => `<ul class="ui-list">${rows.map((d) => ctx.ui.row({ lead: '<i class="ku-cvr" aria-hidden="true"></i>', title: d.to, sub: d.when, end: d.price, chip: chip(ctx, d.status) })).join('')}</ul>`;

function desktop(ctx, dark) {
  const S = sc(ctx), F = S.form, ui = ctx.ui, b = S.deliveries[0];
  return `<div class="ui ku4-desk" ${dark ? 'data-theme="dark"' : ''}>
<nav class="ui-topbar" aria-label="Main"><span class="ku4-logo">${logoIn(ctx, dark)}</span><div class="ui-topbar__links">${ui.links(nav(ctx).slice(0, 3), 0)}</div></nav>
<div class="ku4-main">${coverArt(ctx, b.to, 'ku4-cover--desk')}
<section class="ku4-info" aria-label="${A(ctx.brand.ui.screen.title)}">
<h2 class="ui-display ku4-title">${A(b.to)}</h2>
<p class="ku4-by">${A(S.rider)}. ${A(S.riderNote)}.</p>
<div class="ku4-st">${chip(ctx, b.status)}<span class="ku4-eta">${A(S.eta)}</span></div>
<p class="ku4-pick">${A(S.pickup)}</p>
<div class="ku4-prog">${progress(S)}</div>
<div class="ku4-seg">${ui.segmented(F.sizes, 0)}<span class="ku4-price ui-num">${A(S.paid)}</span></div>
<div class="ku4-btns">${ui.btn(F.book, { iconRight: 'arrow-right' })}${ui.btn(S.call, { variant: 'secondary' })}</div>
</section></div>
<section class="ku4-list" aria-label="${A(S.example.tabs[0])}"><h3 class="ku4-lh">${A(S.example.tabs[0])}</h3>${bookRows(ctx, S.deliveries.slice(0, dark && ctx.edition === 'slot' ? 3 : 4))}</section>
</div>`;
}

function phone(ctx) {
  const S = sc(ctx), F = S.form, ui = ctx.ui, b = S.deliveries[0];
  return `<div class="ui ku4-phone">
<div class="ku4-ph-top"><span class="ui-num">${A(S.time)}</span><span class="ku4-logo">${logoIn(ctx, false)}</span></div>
<div class="ku4-ph-body">
<span class="ku4-ph-chip">${chip(ctx, b.status)}</span>
<h2 class="ui-display ku4-ph-title">${A(b.to)}</h2>
<p class="ku4-eta">${A(S.eta)}</p>
<p class="ku4-pick">${A(S.pickup)}</p>
<div class="ku4-prog">${progress(S)}</div>
<div class="ku4-author"><span class="ui-avatar">${ctx.edition === 'slot' ? ui.icon('user', 18) : A(S.initials)}</span><div class="ku4-amain"><p class="ku4-aname">${A(S.rider)}</p><p class="ku4-asub">${A(S.riderNote)}</p></div>${ui.btn(S.call, { variant: 'secondary', size: 'sm', iconLeft: 'book-open' })}</div>
<dl class="ku4-detail"><div><dt>${A(S.deliverToLabel)}</dt><dd>${A(S.deliverTo)}</dd></div><div><dt>${A(S.paidLabel)}</dt><dd class="ui-num">${A(S.paid)}</dd></div></dl>
<section class="ku4-ph-list" aria-label="${A(S.example.tabs[0])}"><h3 class="ku4-lh">${A(S.example.tabs[0])}</h3>${bookRows(ctx, S.deliveries.slice(1, 3))}</section>
${ui.btn(F.book, { block: true, iconRight: 'arrow-right' })}
</div>
<nav class="ui-tabbar" aria-label="Sections">${nav(ctx).map(([t, i], k) => `<a href="#"${k === 0 ? ' aria-current="page"' : ''}>${ui.icon(i, 20)}${A(t)}</a>`).join('')}</nav>
</div>`;
}

// the components a screen is built from, as its tracings, and the pages that show each one
const builtFrom = (ctx) => trace(['Top bar and links.', 'Status words.', 'Progress bar.', 'Segmented control.', 'Buttons, primary and secondary.', 'List rows.']);
const seeAlso = (ctx, ids) => `<p class="ku4-see"><b>See also</b> ${join(ids.map((id) => see(ctx, id)))}.</p>`;

// the colour roles a book page paints, light then dark: the swap the dark page makes
// the scale the desktop screens are drawn at, so the full desktop fits the sheet; the css reads it too
export const KU4_Z = 0.84;
const SWAP = ['surface', 'sunken', 'text', 'quiet', 'divider', 'edge', 'action', 'action-label'];

export const uScreens = {
  // the book page on a desk, full width on the open sheet; the components it is built from are its tracings
  'screen-light'(ctx) {
    const act = byRole(ctx, 'action');
    const inner = `<p class="k-lead ku4-lead">${A(ctx.brand.ui.screen.title)}, desktop, light. ${actLine(ctx, act)} Drawn at ${KU4_Z} times actual size.</p>
<div class="ku4-shot">${desktop(ctx, false)}</div>
<div class="ku4-foot"><p class="ku4-trace"><b>Built from</b> ${builtFrom(ctx)}</p>${seeAlso(ctx, ['navigation', 'status', 'buttons', 'choices', 'lists'])}</div>`;
    return sheet(ctx, 'screen-light', inner, 'ku4-pg-light');
  },

  // the same page in an open drawer: the drawer interior is the dark edition. Its guide tabs name the two editions, Dark in front
  'screen-dark'(ctx) {
    const L = colourMap(ctx, 'light'), D = colourMap(ctx, 'dark');
    const swaps = SWAP.filter((k) => k in L).map((k) => `<li class="ku4-tp">${mono('--' + k)} ${mono(L[k])} to ${mono(D[k])}</li>`).join('');
    const inner = `<p class="k-lead k-lead--s ku4-lead">${A(ctx.brand.ui.screen.title)}, desktop, dark. Same markup and the same tokens; only the values change.</p>
<div class="ku4-tabs"><span class="ku4-etab ku4-etab--back" aria-hidden="true">Light</span><span class="ku4-etab ku4-etab--front" aria-hidden="true">Dark</span><p class="ku4-scale">Drawn at ${KU4_Z} times actual size.</p></div>
<div class="ku4-drawer"><div class="ku4-shot ku4-shot--dark">${desktop(ctx, true)}</div><span class="ku4-lip"></span></div>
<div class="ku4-foot ku4-foot--dark"><div class="ku4-trace ku4-trace--swap"><b>Values that change</b><ol class="ku4-tps ku4-swaps">${swaps}</ol></div>${seeAlso(ctx, ['screen-light', 'tokens'])}</div>`;
    return sheet(ctx, 'screen-dark', inner, 'ku4-pg-dark');
  },

  // the phone at true size on the left; beside it, the notes and the title in each state, each an entry with its first and second indention
  'screen-mobile'(ctx) {
    const S = sc(ctx), act = byRole(ctx, 'action');
    const rl = ['The title is the headline in every state. The status gives the state.', 'The person on the job and the one button stay in reach of the thumb.', actLine(ctx, act)];
    const notes = `<ol class="ku4-notes">${rl.map((t, i) => `<li>${n(i + 1 + '.')} ${t}</li>`).join('')}</ol>`;
    const states = `<ol class="ui ku4-entries">${S.deliveries.map((d) => `<li class="ku4-entry"><span class="ku4-echip">${chip(ctx, d.status)}</span><span class="ku4-etitle">${A(d.to)}</span><span class="ku4-ewhen">${A(d.when)}</span></li>`).join('')}</ol>`;
    const inner = `<div class="ku4-mob"><div class="ku4-mob-l">${phone(ctx)}</div><div class="ku4-mob-r">${guide('Notes', 0, notes)}${guide('The title, state by state', 1, states, 'ku4-guide--states')}</div></div>`;
    return sheet(ctx, 'screen-mobile', inner, 'ku4-pg-mob');
  },

  // every token, filed behind guide cards whose tabs step across the drawer, as the cuts of a guide set do
  tokens(ctx) {
    const g = tokenGroups(ctx), L = colourMap(ctx, 'light'), D = colourMap(ctx, 'dark');
    const sw = (c) => `<i class="ku4-sw" style="background:${c}"></i>`;
    const colour = `<ol class="ku4-cols">${Object.keys(L).map((k) => `<li class="ku4-ce"><span class="ku4-mono ku4-ck">--${A(k)}</span><span class="ku4-cv">${sw(L[k])}${mono(L[k])}</span><span class="ku4-cv">${sw(D[k])}${mono(D[k])}</span></li>`).join('')}</ol>`;
    const pal = `<ol class="ku4-pal">${ctx.colours.map((c) => `<li class="ku4-ce"><span class="ku4-mono ku4-ck">--palette-${A(c.id)}</span><span class="ku4-cv">${sw(c.hex)}${mono(c.hex)}</span></li>`).join('')}</ol>`;
    const run = (o) => `<p class="ku4-run">${Object.entries(o).map(([k, v]) => `${mono('--' + k)} ${mono(v)}.`).join(' ')}</p>`;
    // one token and its value per line, never broken inside the pair
    const pairs = (rows) => `<ol class="ku4-tps">${rows.map(([k, v]) => `<li class="ku4-tp">${k} ${v}</li>`).join('')}</ol>`;
    const kv = (o) => pairs(Object.entries(o).map(([k, v]) => [mono('--' + k), mono(v)]));
    const fam = (id) => ctx.brand.fonts[id].family;
    const ff = `<ol class="ku4-tps ku4-tps--one">${[['ff-display', fam('display')], ['ff-body', fam('body')], ['ff-mono', fam('mono')]].map(([k, v]) => `<li class="ku4-tp">${mono('--' + k)} ${A(v)}</li>`).join('')}</ol>`;
    const tx = pairs(ctx.uiType.map((t) => [mono(t.token), mono(`${t.size} / ${t.line} / ${t.weight}`)]));
    const inner = `<p class="k-lead k-lead--s ku4-lead">Every token in the package, by group. A colour token carries two values: light first, then dark. Type reads size / line / weight.</p>
<div class="ku4-tokens">
${guide('Colour', 0, `<p class="ku4-key"><span>${sw(L.surface)}Light</span><span>${sw(D.surface)}Dark</span></p>${colour}`, 'ku4-guide--colour')}
${guide('Palette', 1, pal)}
<div class="ku4-pair">${guide('Space', 2, kv(g.space))}${guide('Radius', 3, kv(g.radius))}</div>
<div class="ku4-pair">${guide('Border width', 0, kv(g.width))}${guide('Shadow', 1, run({ 'shadow-float': g.shadow['shadow-float'] }))}</div>
<div class="ku4-pair">${guide('Fonts', 2, ff)}${guide('Type', 1, tx)}</div>
</div>`;
    return sheet(ctx, 'tokens', inner, 'ku4-pg-tok');
  },

  // the three lines that use the package, large on the drawer interior; the folder below as a shelf list, file names as call numbers
  code(ctx) {
    const F = sc(ctx).form;
    const files = [
      ['README.md', 'Install, use, token naming, light and dark, accessibility notes.'], ['tokens.css', 'Custom properties. Light on :root, dark on [data-theme="dark"] and the system setting.'],
      ['tokens.json', 'The same tokens in the W3C design token format, with a dark value on each colour.'], ['tokens.ts', 'A typed export of the same values.'], ['tailwind.css', 'A Tailwind CSS v4 @theme block mapped to the tokens.'],
      ['components.css', 'Classes for every component in this kit, built only on the tokens.'], ['example.html', 'Every component live, with a light and dark switch.'], ['fonts.css', `@font-face rules for ${[...new Set(ctx.faces.map((f) => f.family))].join(', ')}.`],
      ['assets/', `The logo, ${ctx.brand.ui.icons ? ctx.brand.ui.icons.length : 16} icons and the font files.`],
    ].map(([f, d]) => `<li class="ku4-file"><span class="ku4-mono ku4-fname">${A(f)}</span><span class="ku4-fdesc">${A(d)}</span></li>`).join('');
    const install = `<link rel="stylesheet" href="fonts.css">
<link rel="stylesheet" href="tokens.css">
<link rel="stylesheet" href="components.css">

<body class="ui">
  <button class="ui-btn" type="button">${F.book}</button>
</body>`;
    const dark = `<html data-theme="dark">`;
    const tw = `@import "tailwindcss";
@import "./tokens.css";
@import "./tailwind.css";`;
    const block = (t, c, cls = '') => `<figure class="ku4-code ${cls}"><figcaption class="ku4-ccap">${A(t)}</figcaption><pre class="ui ku4-pre" data-theme="dark"><code>${A(c)}</code></pre></figure>`;
    const rl = [`Plain CSS, no framework. Copy the folder, link three stylesheets, and put class ${mono('ui')} on the body.`, `Colour tokens name a job: ${mono('--surface')}, ${mono('--text')}, ${mono('--action')}. Dark swaps the values and leaves the names. Controls are real elements; state is carried by ${mono('disabled')}, ${mono('aria-invalid')} and ${mono('aria-current')}.`];
    const inner = `<p class="k-lead ku4-lead">What is in the folder, and the three stylesheets and one class that use it.</p>
${block('Install', install, 'ku4-code--big')}
<div class="ku4-code2">${block('Dark mode', dark)}${block('Tailwind v4', tw)}</div>
${guide('The folder', 0, `<ol class="ku4-files">${files}</ol>`, 'ku4-guide--files')}
<div class="ku4-foot"><p class="ku4-trace">${trace(rl)}</p><p class="ku4-see"><b>See also</b> ${see(ctx, 'tokens')}.</p></div>`;
    return sheet(ctx, 'code', inner, 'ku4-pg-code');
  },
};
