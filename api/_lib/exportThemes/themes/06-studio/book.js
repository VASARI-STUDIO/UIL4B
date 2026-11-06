// Brand book markup for theme 06 (Studio): nine sections laid out as an annotated design-system book. Steel panels hold the brand's real
// interface (quote screen, invoice, app bar), with drawn dimension marks and numbered callouts joined by leader lines; colour is an
// inspector (a token table like a dev-tools pane) and downloads are a file tree. The engine wraps these in the shell (skip link, section
// rail, light and dark switch) and adds the behaviour. Copy, the type tester and the downloads read data attributes the engine script
// understands: data-copy, data-tester-*.
import { A, fit } from './helpers.js';
import { cssNum } from '../../engine/escape.js';

const rgbOf = (ctx, hex) => { const [r, g, b] = ctx.C.hexToRgb(hex); return `rgb(${r}, ${g}, ${b})`; };
// the readable text colour on a brand colour: the better of the light-mode text and surface colours, checked
const onColour = (ctx, hex) => {
  const L = ctx.roles.light, pick = ctx.ratio(L.text, hex) >= ctx.ratio(L.surface, hex) ? L.text : L.surface;
  ctx.pair(pick, hex, { size: 13, what: `book swatch ${hex}` }); return pick;
};
const hairlineOn = (ctx, hex) => hex.toLowerCase() === ctx.roles.light.surface.toLowerCase();

// a copy button: visible text is the action, the accessible name says what it copies
const copyBtn = (text, value, what, cls = '') => `<button type="button" class="bk-btn ${cls}" data-copy="${A(value)}" data-copy-label="${A(what)}" aria-label="${A(text + ' ' + what)}"><span class="bk-btn__t">${A(text)}</span></button>`;
const head = (id, title, lead, tag = 'h2') => `<div class="bk-head"><${tag} id="h-${id}">${A(title)}</${tag}>${lead ? `<p class="bk-lead">${lead}</p>` : ''}</div>`;
const sub = (t) => `<h3 class="bk-h3">${A(t)}</h3>`;
const dl = (f, label) => (f ? `<a class="bk-dl" href="${A(f.href)}" download aria-label="Download ${A(label)}, ${A(f.ext)}, ${A(f.sizeText)}">${A(f.ext)}</a>` : '');
const rulesList = (rules) => `<ul class="bk-rules">${rules.map((r) => `<li><p class="bk-do"><b>Do</b>${A(r.do)}</p><p class="bk-dont"><b>Don't</b>${A(r.dont)}</p></li>`).join('')}</ul>`;
const sec = (id, cls, inner) => `<section class="bk-sec ${cls}" id="${id}" aria-labelledby="h-${id}">${inner}</section>`;
// a Steel panel holding one figure, with its number and caption along the foot
const fig = (no, cls, inner, cap, attrs = '') => `<figure class="bk-fig ${cls}"${attrs}><div class="bk-fig__st">${inner}</div><figcaption class="bk-figc"><span class="num">${no}</span><span>${A(cap)}</span></figcaption></figure>`;

// drawn dimensions: a rule with end ticks and its label, along the top or the left of what it measures
const dimH = (label) => `<span class="bk-dim bk-dim--h"><i></i><span class="num">${A(label)}</span></span>`;
const dimV = (label) => `<span class="bk-dim bk-dim--v"><i></i><span class="num">${A(label)}</span></span>`;
// a logo with its width and height drawn on it, in the same pixels as it is set
function marked(ctx, id, width, color, label) {
  const g = ctx.logo.geos[id], h = Math.round((width * g.h) / g.w);
  return `<span class="bk-mk"><span class="bk-mk__w" style="width:${width}px">${dimH(`${width} px`)}</span><span class="bk-mk__r"><span class="bk-mk__h" style="height:${h}px">${dimV(`${h} px`)}</span><span class="bk-mk__l" style="width:${width}px">${ctx.logo.html(id, { width, color, label })}</span></span></span>`;
}

// ---- 1 overview ----
function overview(ctx) {
  const B = ctx.brand, L = ctx.logo, T = B.fonts, cw = B.logo.colourways.colour;
  const bar = ctx.colours.map((c) => `<li class="${hairlineOn(ctx, c.hex) ? 'is-hair' : ''}" style="background:${c.hex};flex-grow:${Math.round(c.share * 100)}"></li>`).join('');
  return sec('overview', 'bk-sec--overview', `
<div class="bk-hero"><h1 class="disp" id="h-overview">${A(B.lines.primary)}</h1><p class="bk-cap">${A(B.name)} brand book. ${A(ctx.versionLine)}.</p></div>
<div class="bk-brief">
<p class="bk-lead">${A(B.description)}</p>
<dl class="bk-kv"><div><dt>What it does</dt><dd>${A(B.product)}</dd></div><div><dt>Who it serves</dt><dd>${A(B.audience)}</dd></div></dl>
</div>
<ol class="bk-traits">${B.personality.map((p, i) => `<li><span class="bk-no num" aria-hidden="true">${i + 1}</span><div><p class="bk-trait">${A(p.trait)}</p><p class="bk-body">${A(p.means)}</p></div></li>`).join('')}</ol>
<div class="bk-glance">
${fig('1.1', 'bk-fig--sm', `<div class="bk-glance__f is-hair" style="background:${cw.ground}">${L.html('colour', { width: fit(ctx, 'colour', 200, 72), label: 'Logo' })}</div>`, 'The logo, in full colour.')}
${fig('1.2', 'bk-fig--sm', `<ul class="bk-glance__bar" aria-hidden="true">${bar}</ul>`, `${ctx.colours.map((c) => c.name).join(', ')}. Widths show how much of a page each takes.`)}
${fig('1.3', 'bk-fig--sm', `<div class="bk-glance__f bk-glance__aa"><span class="disp" aria-hidden="true">Aa</span><span class="bk-glance__b" aria-hidden="true">Aa</span></div>`, `${T.display.family} for the big line, ${T.body.family} for reading.`)}
</div>`);
}

// ---- 2 voice ----
function voice(ctx) {
  const B = ctx.brand, V = B.voice;
  const lines = [B.lines.primary, ...B.lines.others];
  const words = (s) => s.trim().split(/\s+/).length;
  return sec('voice', 'bk-sec--voice', `
${head('voice', 'Voice', `${V.principles.length === 4 ? 'Four' : V.principles.length} rules for how we write, each with a line from the brand.`)}
<ol class="bk-principles">${V.principles.map((p, i) => `<li><span class="bk-no num" aria-hidden="true">${i + 1}</span><p class="bk-pt">${A(p.title)}</p><div class="bk-msg"><p class="bk-pe">${A(p.example)}</p></div></li>`).join('')}</ol>
<div class="bk-block">${sub('Lines in use')}<ul class="bk-lines">${lines.map((l) => `<li>${A(l)}</li>`).join('')}</ul></div>
<div class="bk-block">${sub('Write this, not that')}
<div class="bk-wtn" role="table" aria-label="Write this, not that">
<div class="bk-wtn__h" role="row"><span role="columnheader">Write this</span><span role="columnheader">Not that</span><span role="columnheader">Because</span></div>
${V.writeThis.map((r) => `<div class="bk-wtn__r" role="row"><p role="cell" class="w" data-l="Write this">${A(r.write)}</p><p role="cell" class="n" data-l="Not that">${A(r.not)}</p><p role="cell" class="b" data-l="Because">${A(r.because)}</p></div>`).join('')}
</div></div>
<div class="bk-block bk-two bk-two--even">
<div class="bk-panel">${sub(`The brand in ${words(V.boilerplate25)} words`)}<p class="bk-body">${A(V.boilerplate25)}</p>${copyBtn('Copy text', V.boilerplate25, '25-word boilerplate')}</div>
<div class="bk-panel">${sub(`The brand in ${words(V.boilerplate50)} words`)}<p class="bk-body">${A(V.boilerplate50)}</p>${copyBtn('Copy text', V.boilerplate50, '50-word boilerplate')}</div>
</div>
<div class="bk-block">${sub('Writing the name')}<p class="bk-body bk-measure">${A(V.nameRules)}</p></div>`);
}

// ---- 3 logo ----
function logo(ctx) {
  const B = ctx.brand, L = ctx.logo, cw = B.logo.colourways, slot = ctx.edition === 'slot', S = B.ui.screen.content, F = S.form, ap = B.applications;
  const paidLabel = (B.ui.status.find((s) => s.id === 'paid') || B.ui.status[0]).label;
  const delivery = S.deliveries[1] || S.deliveries[0];
  // each version sits in the context it is made for, on the ground its colourway names
  const ctxOf = {
    colour: () => {
      const row = ctx.ui.row({ lead: ctx.ui.icon('file-text', 18), title: delivery.to, sub: delivery.when, end: delivery.price });
      return `<div class="bk-doc bk-lt"><div class="bk-doc__h">${marked(ctx, 'colour', 140, cw.colour.name, 'Logo')}<p class="bk-doc__n">${A(ctx.brand.ui.screen.title)}</p></div><p class="bk-doc__c"><span>${A(S.deliverToLabel)}</span>${A(S.deliverTo)}</p><ul class="ui-list">${row}</ul><p class="bk-doc__t"><span>${A(S.paidLabel)}</span><b class="ui-num">${A(S.paid)}</b></p></div>`;
    },
    horizontal: () => `<div class="bk-app"><span class="bk-app__w" style="width:136px">${dimH('136 px')}</span><div class="bk-app__r"><span class="bk-app__v">${dimV('56 px')}</span><div class="bk-app__b bk-lt">${L.html('horizontal', { width: 136, color: cw.colour.name, label: 'Logo' })}${ctx.ui.btn(F.book, { size: 'sm' })}</div></div></div>`,
    reversed: () => `<div class="bk-app"><span class="bk-app__w" style="width:136px">${dimH('136 px')}</span><div class="bk-app__r"><span class="bk-app__v">${dimV('56 px')}</span><div class="bk-app__b bk-app__b--ink">${L.html('reversed', { width: 136, color: cw.reversed.name, label: 'Logo' })}<span class="bk-app__c">${A(S.eta)}</span></div></div></div>`,
    symbol: () => {
      const g = L.geos.symbol, h32 = Math.round((32 * g.h) / g.w);
      return `<div class="bk-icons2"><div class="bk-icon2"><span class="bk-icon2__w">${dimH('96 px')}</span><span class="bk-icon2__t bk-lt">${L.html('symbol', { width: fit(ctx, 'symbol', 52, 52), color: cw.colour.name, label: 'Logo' })}</span></div>
<div class="bk-fav bk-lt"><span class="bk-fav__v" style="height:${h32}px">${dimV('32 px')}</span><span class="bk-fav__i" style="width:32px;height:${h32}px">${L.html('symbol', { width: 32, color: cw.colour.name, label: 'Logo' })}</span><span class="bk-fav__n">${A(ap.site.url)}</span></div></div>`;
    },
    stacked: () => `<div class="bk-avatar"><span class="bk-avatar__d">${dimH('128 px')}</span><span class="bk-avatar__c bk-lt">${L.html('stacked', { width: fit(ctx, 'stacked', 84, 84), color: cw.colour.name, label: 'Logo' })}</span></div>`,
    'mono-dark': () => `<div class="bk-stamp bk-lt"><span class="bk-stamp__l">${marked(ctx, 'mono-dark', 120, cw['mono-dark'].name, 'Logo')}</span><span class="bk-stamp__t">${A(paidLabel)}</span></div>`,
    'mono-light': () => `<div class="bk-post2"><p class="disp">${A(ap.social[1])}</p><span class="bk-post2__l">${marked(ctx, 'mono-light', 120, cw['mono-light'].name, 'Logo')}</span></div>`,
  };
  const order = [['colour', 'bk-ctx--invoice', 'Quote'], ['horizontal', 'bk-ctx--bar', 'App bar'], ['reversed', 'bk-ctx--bar', 'App bar on Ink'], ['symbol', 'bk-ctx--icon', 'App icon and favicon'], ['stacked', 'bk-ctx--avatar', 'Profile image'], ['mono-dark', 'bk-ctx--stamp', 'Printed in one colour'], ['mono-light', 'bk-ctx--post', 'Post on Ink']];
  const tile = ([id, cls, where], i) => {
    const files = ctx.book.logo(id), name = `${L.labels[id]} logo`;
    const links = slot ? '' : `<span class="bk-dls">${dl(files.svg, name)}${dl(files.png.find((p) => p.w === 1024), name + ', 1024 px wide')}</span>`;
    return `<figure class="bk-fig bk-ctx ${cls}"><div class="bk-fig__st">${ctxOf[id]()}</div><figcaption class="bk-figc bk-figc--rich"><span class="num">3.${i + 1}</span><span><b>${A(L.labels[id])}. ${A(where)}.</b>${A(B.logo.when[id])}</span>${links}</figcaption></figure>`;
  };
  const W = 360, g = L.geo, u = g.unit ? Math.round(((g.unit * W) / g.width) * 10) / 10 : Math.round(((W * g.height) / g.width) * L.clearShare) / 100;
  const ms = L.minSize;
  const clear = `<div class="bk-clearwrap"><div class="bk-clear is-hair" style="padding:${u}px;--u:${u}px;width:min(100%,${W + 2 * u}px)"><div class="bk-clear__in" style="max-width:${W}px">${L.html('colour', { width: W, label: 'Logo' })}</div>
<span class="bk-x bk-x--t num" aria-hidden="true">x</span><span class="bk-x bk-x--b num" aria-hidden="true">x</span><span class="bk-x bk-x--l num" aria-hidden="true">x</span><span class="bk-x bk-x--r num" aria-hidden="true">x</span></div></div>`;
  const clearTxt = `<p class="bk-body">${g.unit ? `Keep x clear on every side. x is a quarter of the type size in the wordmark.` : `Keep ${L.clearShare}% of the logo's height clear on every side.`}</p>`;
  const minBlock = slot
    ? `<p class="bk-body">Set the smallest size once the logo is in place. Below that size the board and the name stop reading as one mark.</p>`
    : `<div class="bk-min"><div class="bk-min__logo is-hair" style="width:${ms.screenPx + 48}px">${dimH(`${ms.screenPx} px`)}${L.html('colour', { width: ms.screenPx })}</div></div><p class="bk-body">${ms.screenPx} px wide on screen. ${ms.printMm} mm wide in print.</p>`;
  const misuse = ['Do not stretch, squash or skew it.', 'Do not recolour it outside the versions above.', 'Do not rotate it.', 'Do not add shadows, glows or other effects.', 'Do not set it on a busy part of a photo.', 'Do not redraw the board, or move the wedge away from its cut.'];
  const dlSlot = slot ? `<p class="bk-body bk-measure">This book has no logo files yet. The frames above hold the place and the proportion. The brand kit's logo folder says where the approved files go.</p>` : '';
  return sec('logo', 'bk-sec--logo', `
${head('logo', 'Logo', A(B.logo.idea))}
<div class="bk-ctxs">${order.map(tile).join('')}</div>${dlSlot}
<div class="bk-block bk-two bk-two--even">
${fig('3.8', 'bk-fig--clear', `<div class="bk-fig__pad">${clear}</div>`, 'Clear space, drawn in x.')}
${fig('3.9', 'bk-fig--clear', `<div class="bk-fig__pad">${minBlock}</div>`, 'Smallest size.')}
</div>
<div class="bk-block bk-two bk-two--even"><div>${sub('Clear space')}${clearTxt}</div><div>${sub('Never')}<ol class="bk-never">${misuse.map((m, i) => `<li><span class="bk-x2" aria-hidden="true"></span><span class="bk-no num" aria-hidden="true">${i + 1}</span>${A(m)}</li>`).join('')}</ol></div></div>`);
}

// ---- 4 colour: the annotated screen ----
// Offcut's quote screen, pinned to light, built once and called out two ways (colours, then text pairs). A callout hangs off the part it
// names: a leader line from the part's edge to the note, on the left or right of the screen.
function screen(ctx, N = {}) {
  const S = ctx.brand.ui.screen.content, F = S.form;
  const p = (k, inner, cls = '') => `<div class="bk-part ${cls}">${inner}${N[k] || ''}</div>`;
  return `<div class="ui bk-lt bk-scr" inert>
${p('g0', '', 'bk-part--bare bk-part--g')}
${p('g1', `<p class="bk-scr__h">${A(S.title || ctx.brand.ui.screen.title)}</p>`)}
${p('g2', `<p class="bk-scr__p">${A(S.inline)}</p>`)}
${p('g3', `<p class="bk-scr__q">${A(S.eta)}</p>`)}
<div class="bk-scr__card">
${p('c0', '', 'bk-part--bare bk-part--c')}
${p('cT', `<p class="bk-scr__t">${A(S.rider)}</p>`)}
${p('cS', `<p class="bk-scr__s">${A(S.pickup)}</p>`)}
${p('cQ', `<p class="bk-scr__q">${A(S.riderNote)}</p>`)}
${p('cL', `<p class="bk-scr__l"><span>${A(S.share)}</span></p>`)}
${p('cB', ctx.ui.btn(F.book, { block: true }))}
</div>
${p('tt', `<div class="ui-toast"><span>${A(S.toast)}</span><span class="bk-scr__u">Undo</span></div>`)}
${p('nb', `<div class="bk-scr__band"><span class="ui-display bk-scr__n">${A(S.paid)}</span></div>`)}
</div>`;
}
// where each callout sits: part key and side
const SIDE = { g0: 'l', g1: 'l', g2: 'r', g3: 'l', c0: 'r', cT: 'l', cS: 'r', cQ: 'l', cL: 'l', cB: 'r', tt: 'l', nb: 'r' };
const note = (key, n, inner, extra = '') => ({ [key]: `<span class="bk-note bk-note--${SIDE[key]}${extra}" aria-hidden="true"><i class="bk-note__n num">${n}</i><span class="bk-note__b">${inner}</span></span><i class="bk-pn num" aria-hidden="true">${n}</i>` });

function colour(ctx) {
  const B = ctx.brand;
  const bar = ctx.colours.map((c) => {
    const fg = onColour(ctx, c.hex);
    return `<button type="button" class="bk-sw${hairlineOn(ctx, c.hex) ? ' is-hair' : ''}" style="background:${c.hex};color:${fg};flex-grow:${Math.round(c.share * 100)}" data-copy="${c.hex}" data-copy-label="${A(c.name)} HEX ${c.hex}" aria-label="Copy HEX ${A(c.hex)}, ${A(c.name)}"><span class="bk-sw__share">${Math.round(c.share * 100)}%</span><span class="bk-sw__name">${A(c.name)}</span><span class="bk-sw__hex">${c.hex}</span></button>`;
  }).join('');
  // the inspector numbers its rows 1 to n: palette first, then the text tones. The callouts on the screen carry the same numbers.
  const all = [...ctx.colours.map((c) => ({ ...c, tok: `palette-${c.id}` })), ...ctx.tones.map((c) => ({ ...c, tok: c.id === 'soft' ? 'text-soft' : c.id }))];
  const no = Object.fromEntries(all.map((c, i) => [c.id, i + 1]));
  const row = (c) => {
    const rgb = rgbOf(ctx, c.hex), ok = c.oklch || ctx.C.oklchString(c.hex);
    return `<li class="bk-crow"><span class="bk-ix num">${no[c.id]}</span><span class="bk-chip${hairlineOn(ctx, c.hex) ? ' is-hair' : ''}" style="background:${c.hex}" aria-hidden="true"></span><div class="bk-cinfo"><p class="bk-cname">${A(c.name)}</p><p class="bk-tok">--${A(c.tok)}</p></div><dl class="bk-vals"><div><dt>HEX</dt><dd>${c.hex}</dd></div><div><dt>RGB</dt><dd>${rgb}</dd></div><div><dt>OKLCH</dt><dd>${ok}</dd></div></dl><div class="bk-copies">${copyBtn('Copy HEX', c.hex, `${c.name} HEX`)}${copyBtn('Copy RGB', rgb, `${c.name} RGB`)}${copyBtn('Copy OKLCH', ok, `${c.name} OKLCH`)}</div><p class="bk-clands">${A(c.lands)}</p></li>`;
  };
  // The callouts name the sample's colours. A project brand names its colours by role, so each sample id stands for the role it plays there.
  const SAMPLE_ROLE = { steel: 'panel', white: 'ground', ink: 'text', toolbox: 'action' };
  const nm = (id) => ctx.byId[id] || (SAMPLE_ROLE[id] ? ctx.colours.find((c) => c.role === SAMPLE_ROLE[id]) : undefined);
  const sampleId = (id) => Object.keys(SAMPLE_ROLE).find((k) => nm(k) && nm(k).id === id) || id;
  const pairKey = (p) => `${sampleId(p.fg)}/${sampleId(p.bg)}`;
  const pairAt = { 'ink/white': 'cT', 'soft/white': 'cS', 'quiet/white': 'cQ', 'ink/steel': 'g1', 'soft/steel': 'g2', 'quiet/steel': 'g3', 'white/toolbox': 'cB', 'toolbox/white': 'cL', 'white/ink': 'tt', 'toolbox/ink': 'nb' };
  const placed = ctx.pairs.filter((p) => pairAt[pairKey(p)]);
  const unplaced = ctx.pairs.filter((p) => !pairAt[pairKey(p)]);
  const pairNote = (p, i) => note(pairAt[pairKey(p)], i + 1, `<span class="bk-note__s" style="background:${p.bgHex};color:${p.fgHex}" aria-hidden="true">Aa</span><span class="bk-note__t"><b class="num">${A(p.ratioText)} : 1</b><span>${A(p.use)}</span></span>`, ' bk-note--pair');
  const key = (p) => `<li class="bk-pair${hairlineOn(ctx, p.bgHex) ? ' is-hair' : ''}${p.large ? ' is-large' : ''}${pairAt[pairKey(p)] ? '' : ' is-off'}" style="background:${p.bgHex};color:${p.fgHex}"><span class="bk-pair__r">${A(p.ratioText)} : 1</span><span class="bk-pair__u">${A(p.use)}</span>${p.large ? '' : '<span class="bk-pair__n">Any size</span>'}</li>`;
  const named = (key, id) => { const c = nm(id); return c ? note(key, no[c.id], `<b>${A(c.name)}</b><span>${A(ctx.cap(c.role))}. ${c.hex}</span>`) : {}; };  // a brand with no soft or quiet tone leaves that callout off
  const colourNotes = { ...named('g0', 'steel'), ...named('c0', 'white'), ...named('cT', 'ink'), ...named('cS', 'soft'), ...named('cQ', 'quiet'), ...named('cB', 'toolbox') };
  const pairNotes = Object.assign({}, ...placed.map(pairNote));
  // Offcut has no warning state, so the roles list leaves it out
  const roleKeys = [['surface', 'Surface', 'surface'], ['raised', 'Raised', 'raised'], ['text', 'Text', 'text'], ['quiet', 'Quiet text', 'quiet'], ['border', 'Border', 'edge'], ['action', 'Action', 'action'], ['actionLabel', 'Action label', 'action-label'], ['focus', 'Focus', 'focus']];
  const toneKeys = [['success', 'Success', 'success'], ['danger', 'Danger', 'danger'], ['info', 'Info', 'info']];
  const roles = (mode) => {
    const r = ctx.roles[mode];
    const items = [...roleKeys.map(([k, n, t]) => [n, t, r[k]]), ...toneKeys.map(([k, n, t]) => [n, t, r[k].fg])];
    return `<ul class="bk-roles bk-for-${mode}">${items.map(([n, t, hx]) => `<li><button type="button" class="bk-role" data-copy="${hx}" data-copy-label="${mode} ${A(n)} HEX ${hx}" aria-label="Copy HEX ${A(hx)}, ${mode} ${A(n)}"><span class="bk-role__sw${hairlineOn(ctx, hx) ? ' is-hair' : ''}" style="background:${hx}" aria-hidden="true"></span><span class="bk-role__n">${A(n)}</span><span class="bk-role__t">--${t}</span><span class="bk-role__h">${hx}</span></button></li>`).join('')}</ul>`;
  };
  const ticks = [0, 25, 50, 75, 100].map((t) => `<span style="left:${t}%"><i></i><span class="num">${t}%</span></span>`).join('');
  return sec('colour', 'bk-sec--colour', `
${head('colour', 'Colour', 'Each colour is called out where it sits on the screen. The inspector below lists every value, one button each to copy it.')}
${fig('4.1', 'bk-fig--ann', screen(ctx, colourNotes), `${B.name}'s quote screen. Each note names the colour, its role and its HEX.`, ' role="img" aria-label="' + A(`${B.name} quote screen with its colours called out. The inspector below lists the same colours.`) + '"')}
<div class="bk-block bk-share">${sub('Share of a page')}<div class="bk-ruler" aria-hidden="true">${ticks}</div><div class="bk-bar">${bar}</div><p class="bk-cap">Click a swatch to copy its HEX. Wider swatches take more of a page. Each one is a row in the inspector.</p></div>
<div class="bk-block"><div class="bk-insp">
<div class="bk-insp__bar"><span class="bk-insp__t">Inspector</span><span class="bk-cap num">${ctx.colours.length} palette, ${ctx.tones.length} text tones, ${roleKeys.length + toneKeys.length} interface roles</span></div>
<div class="bk-insp__g"><p class="bk-insp__h">Palette</p><ul class="bk-clist">${all.slice(0, ctx.colours.length).map(row).join('')}</ul></div>
<div class="bk-insp__g"><p class="bk-insp__h">Text tones</p><ul class="bk-clist">${all.slice(ctx.colours.length).map(row).join('')}</ul></div>
<div class="bk-insp__g"><p class="bk-insp__h">Interface roles</p><p class="bk-cap">The same roles in the light and dark previews. Use the switch to see the other set.</p>${roles('light')}${roles('dark')}</div>
</div></div>
<div class="bk-block">${sub('Contrast, pair by pair')}<p class="bk-body bk-measure">Every text pair ${A(B.name)} uses, with its WCAG ratio, called out where it is used. Text needs 4.5 : 1. Type at 24 px and over needs 3 : 1.</p>
${fig('4.2', 'bk-fig--ann bk-fig--pairs', screen(ctx, pairNotes) + `<ol class="bk-key">${[...placed, ...unplaced].map(key).join('')}</ol>`, `The same screen with each pair's ratio where it is used.`)}</div>`);
}

// ---- 5 typography ----
function typography(ctx) {
  const B = ctx.brand, F = B.fonts, T = B.type, alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789';
  const wlist = (f) => f.weights.join(', ');
  const face = (cls, f, note, style, no) => fig(no, 'bk-fig--sm bk-face', `<div class="bk-face__c bk-lt"><span class="bk-face__m">${dimV('120 px')}</span><p class="bk-face__aa ${cls}" aria-hidden="true">Aa</p><div><p class="bk-face__n">${A(f.family)}</p><p class="bk-cap">${note} Weights ${wlist(f)}.</p><p class="bk-face__al" style="${style}">${alpha}</p></div></div>`, `${f.family}, set at 120 px.`);
  const n1 = (v) => Number(v.toFixed(1));
  const scaleRows = T.scale.map((s) => {
    const fam = s.face === 'display' ? 'var(--display)' : 'var(--body)', lh = n1(s.size * s.line);
    return `<li class="bk-scale" style="--size:${s.size}px;--lh:${lh}px"><div class="bk-scale__c bk-lt"><div class="bk-scale__d"><span class="bk-dm" style="height:calc(var(--size) * var(--k, 1));margin-top:calc((var(--lh) - var(--size)) / 2 * var(--k, 1))"><em class="num">${s.size}</em></span><span class="bk-dm" style="height:calc(var(--lh) * var(--k, 1))"><em class="num">${lh}</em></span></div><p class="bk-scale__s" style="font-family:${fam};font-weight:${s.weight};line-height:${s.line}">${A(T.sample.headline)}</p></div><div class="bk-scale__m"><p class="bk-scale__t">${A(ctx.cap(s.token))}</p><p class="bk-cap num">${s.size} px, line ${s.line}, weight ${s.weight}</p><p class="bk-cap">${A(s.use)}</p></div></li>`;
  }).join('');
  const dw = cssNum(F.display.weights[F.display.weights.length - 1]);
  return sec('typography', 'bk-sec--type', `
${head('typography', 'Typography', 'One face for the big line, one for everything you read.')}
<div class="bk-faces">${face('disp', F.display, 'For headlines, totals and the wordmark, at 18 px or larger.', `font-family:var(--display);font-weight:${dw};letter-spacing:-0.01em`, '5.1')}${face('', F.body, 'For reading text, labels and captions.', 'font-family:var(--body)', '5.2')}</div>
<p class="bk-cap bk-measure">${A(F.mono.family)} is for a hex, a token or a code string only. All three faces are open licence (SIL OFL 1.1), free for commercial use.</p>
<div class="bk-block">${sub('Scale')}
<figure class="bk-fig bk-fig--scale"><div class="bk-fig__st"><div class="bk-scale__k" aria-hidden="true"><span>Size, px</span><span>Line, px</span></div><ul class="bk-scales">${scaleRows}</ul></div><figcaption class="bk-figc"><span class="num">5.3</span><span>Every text style at its true size, on the live ${A(B.name)} card. The marks beside it are the size and the line height, drawn to scale.</span></figcaption></figure></div>
<div class="bk-block bk-tester bk-panel" data-tester>
${sub('Try it')}
<div class="bk-tester__c"><div class="bk-field"><label for="tester-text">Your line</label><input id="tester-text" type="text" value="${A(T.sample.headline)}" data-tester-text data-default="${A(T.sample.headline)}" autocomplete="off" spellcheck="false"></div>
<div class="bk-field"><label for="tester-size">Size <output for="tester-size" data-tester-value class="num">64 px</output></label><input id="tester-size" type="range" min="14" max="120" step="1" value="64" data-tester-size></div></div>
<p class="bk-tester__d disp" data-tester-out aria-hidden="true">${A(T.sample.headline)}</p>
<p class="bk-tester__b" data-tester-out aria-hidden="true">${A(T.sample.headline)}</p>
</div>
<div class="bk-block bk-two"><div>${sub('In use')}<p class="bk-use__h disp">${A(T.sample.headline)}</p><p class="bk-use__p">${A(T.sample.paragraph)}</p><p class="bk-cap">${A(T.sample.caption)}</p></div><div>${sub('Rules')}${rulesList(T.rules)}</div></div>`);
}

// ---- 6 imagery ----
function imagery(ctx) {
  const B = ctx.brand, D = B.imagery.direction, shots = B.imagery.shots;
  const dirRows = [['Subject', D.subject], ['Light', D.light], ['Crop', D.crop], ['Colour', D.colour], ['People', D.people]];
  const fig2 = (s, i) => {
    const real = !!s.photo;
    const f = real ? ctx.book.find(`05 Imagery/photos/${s.photo.split('/').pop()}`) : null;
    const title = (s.slot || '').split(':')[0];
    const cap = real ? `${A(s.caption || s.alt)}. Photo: ${A(s.credit)}.` : `<b>${A(title)}</b>Art-directed slot, 4 × 3`;
    return `<figure class="bk-shot bk-shot--${i}"><div class="bk-shot__f"><div class="bk-shot__in">${ctx.photo(s.id, { cls: 'bk-ph', pos: '50% 50%' })}</div></div><figcaption class="bk-capt"><span class="num">6.${i + 1}</span><span>${cap}</span>${f ? `<span class="bk-dls">${dl(f, 'photo ' + (s.caption || s.id))}</span>` : ''}</figcaption></figure>`;
  };
  return sec('imagery', 'bk-sec--imagery', `
${head('imagery', 'Imagery', A(D.subject))}
<dl class="bk-dir">${dirRows.slice(1).map(([k, v], i) => `<div><dt><span class="num">${i + 1}</span>${k}</dt><dd>${A(v)}</dd></div>`).join('')}</dl>
<div class="bk-shots">${shots.map(fig2).join('')}</div>
<div class="bk-block">${sub('Rules')}${rulesList(B.imagery.rules)}</div>`);
}

// ---- 7 layout ----
function layout(ctx) {
  const G = ctx.gridMeasures, B = ctx.brand;
  const m = (G.margin / G.page.w) * 100, inner = G.page.w - 2 * G.margin, gap = (G.gutter / inner) * 100;
  const cols = Array.from({ length: G.columns }, () => '<i></i>').join('');
  const col = (Math.round(G.col * 10) / 10).toString();
  const radii = ctx.radii.filter((r) => r.px < 9999);
  return sec('layout', 'bk-sec--layout', `
${head('layout', 'Layout', `${G.columns} columns on a ${G.page.w} by ${G.page.h} page, a ${G.margin} px margin and a ${G.gutter} px gutter. Everything sits on a ${G.base} px base.`)}
<div class="bk-gridfig">${fig('7.1', 'bk-fig--grid', `<div class="bk-pw"><span class="bk-pw__w">${dimH(`${G.page.w} px`)}</span><div class="bk-pw__r"><span class="bk-pw__h">${dimV(`${G.page.h} px`)}</span><div class="bk-page" role="img" aria-label="The page grid: ${G.columns} columns, ${G.margin} pixel margin, ${G.gutter} pixel gutter" style="aspect-ratio:${G.page.w}/${G.page.h};padding:${m.toFixed(3)}%"><div class="bk-page__g" style="column-gap:${gap.toFixed(3)}%;grid-template-columns:repeat(${G.columns},minmax(0,1fr))">${cols}</div></div></div></div>`, 'The page grid, drawn to its measures.')}
<dl class="bk-meas"><div><dt>Margin</dt><dd class="num">${G.margin} px</dd></div><div><dt>Gutter</dt><dd class="num">${G.gutter} px</dd></div><div><dt>Column</dt><dd class="num">${col} px</dd></div><div><dt>Base</dt><dd class="num">${G.base} px</dd></div></dl></div>
<div class="bk-block bk-two bk-two--even">
${fig('7.2', 'bk-fig--sm', `<div class="bk-fig__pad"><ul class="bk-space">${ctx.space.map((s) => `<li><i style="width:${s.px}px;height:${s.px}px"></i><span class="bk-cap num">${s.px}</span></li>`).join('')}</ul></div>`, 'Spacing steps, in px.')}
${fig('7.3', 'bk-fig--sm', `<div class="bk-fig__pad"><div class="bk-shape">${radii.map((r) => `<div><i style="border-radius:${r.px}px"></i><span class="bk-cap">${A(r.use)}, ${r.px} px</span></div>`).join('')}</div></div>`, `Corners. Edges are ${B.ui.border} px.`)}
</div>
<p class="bk-body bk-block">${A(B.ui.elevationNote)}</p>`);
}

// ---- 8 applications ----
function applications(ctx) {
  const B = ctx.brand, L = ctx.logo, ap = B.applications, S = B.ui.screen.content, cw = B.logo.colourways, rev = cw.reversed;
  const R = ctx.roles.light;
  const statusId = (B.ui.status.find((s) => s.label === S.status) || B.ui.status[0]).id;
  const front = `<div class="bk-card bk-card--front"><div class="bk-card__logo">${L.html('reversed', { width: fit(ctx, 'reversed', 200, 80), color: rev.name, label: 'Your logo goes here' })}</div><p class="bk-card__line">${A(B.lines.primary)}</p></div>`;
  const back = `<div class="bk-card bk-card--back"><div class="bk-card__mark">${L.html('symbol', { width: fit(ctx, 'symbol', 40, 46), label: 'Logo' })}</div><div class="bk-card__who"><p class="nm">${A(ap.card.person)}</p><p class="rl">${A(ap.card.role)}</p><p class="ct">${A(ap.card.contact)}<br>${A(ap.site.url)}</p></div></div>`;
  const social = `<div class="bk-posts">
<div class="bk-post bk-post--sq" style="background:${R.action};color:${R.actionLabel}"><p class="disp">${A(ap.social[0])}</p><span class="bk-post__lg">${L.html('mono-light', { width: 96, color: R.actionLabel, label: 'Logo' })}</span></div>
<div class="bk-post bk-post--pt" style="background:${rev.ground};color:${rev.name}"><p class="disp">${A(ap.social[1])}</p><span class="bk-post__lg">${L.html('reversed', { width: 96, color: rev.name, label: 'Logo' })}</span></div>
<div class="bk-post bk-post--st"><p class="disp">${A(ap.social[2])}</p><span class="bk-post__lg">${L.html('symbol', { width: 40, label: 'Logo' })}</span></div>
</div>`;
  // signage: the ute door sign drawn to scale, in cqw of its own width so it scales as one piece, with its two dimensions marked
  const [signName, signHead] = ap.signage.split(': '), mm = /(\d+) x (\d+) mm/.exec(signName) || [0, 1200, 500];
  const lines = A(signHead || B.lines.primary).replace('. ', '.<br>');
  const sign = `<div class="bk-sign"><div class="bk-sign__d">${dimH(`${mm[1]} mm`)}<div class="bk-sign__v"><span class="bk-dim bk-dim--v"><i></i><span class="num">${mm[2]} mm</span></span><div class="bk-door" style="aspect-ratio:${mm[1]}/${mm[2]}"><p class="disp bk-door__h">${lines}</p><div class="bk-door__lg">${L.html('colour', { colourway: 'on-toolbox', width: 240, label: '' })}</div></div></div></div></div>`;
  const email = `<div class="bk-email"><p class="bk-email__n">${A(ap.email.person)}</p><p class="bk-email__r">${A(ap.email.role)}, ${A(B.name)}</p><p class="bk-email__c">${A(ap.card.contact)}<br>${A(ap.site.url)}</p><div class="bk-email__l">${L.html('horizontal', { width: 168, label: 'Logo' })}</div></div>`;
  const rows = S.deliveries.slice(0, 3);
  const screenUi = `<div class="bk-device"><div class="ui bk-screen" role="img" aria-label="${A(B.name)} product screen: ${A(S.title)}. ${A(S.eta)}. ${A(S.rider)}, ${A(S.riderNote)}." inert>
<div class="bk-scr__top"><span class="ui-num bk-scr__time">${A(S.time)}</span>${ctx.ui.statusChip(statusId)}</div>
<p class="ui-display bk-scr__eta">${A(S.eta)}</p><p class="bk-scr__note">${A(S.pickup)}</p>
<div class="ui-progress"><div class="ui-progress__bar"><i style="width:${S.progress * 100}%"></i></div><span class="ui-progress__dot" style="left:${S.progress * 100}%"></span></div>
<div class="bk-scr__ft"><span>${A(S.from)}</span><span>${A(S.to)}</span></div>
<ul class="ui-list">${ctx.ui.row({ lead: `<span class="ui-avatar">${A(S.initials)}</span>`, title: S.rider, sub: S.riderNote, endHtml: ctx.ui.btn(S.call, { variant: 'secondary', size: 'sm', iconLeft: 'phone' }) })}</ul>
<ul class="ui-list">${rows.map((d) => ctx.ui.row({ lead: ctx.ui.icon('file-text', 18), title: d.to, sub: d.when, end: d.price, chip: ctx.ui.statusChip(d.status) })).join('')}</ul>
</div></div>`;
  const cards = `<div class="bk-cards"><div class="bk-dimbox"><span class="bk-dimbox__w">${dimH('90 mm')}</span><div class="bk-dimbox__r"><span class="bk-dimbox__h">${dimV('55 mm')}</span>${front}</div></div><div class="bk-dimbox"><span class="bk-dimbox__w">${dimH('90 mm')}</span><div class="bk-dimbox__r"><span class="bk-dimbox__h">${dimV('55 mm')}</span>${back}</div></div></div>`;
  return sec('applications', 'bk-sec--apps', `
${head('applications', 'Applications', 'The brand at work: a card, a feed, a ute door, an inbox and the product itself.')}
<div class="bk-figgrid">
${fig('8.1', 'bk-fig--wide', `<div class="bk-fig__pad">${cards}</div>`, 'Business card, 90 by 55 mm, front and back.')}
${fig('8.2', 'bk-fig--wide', `<div class="bk-fig__pad">${social}</div>`, 'Social posts: square, portrait and story.')}
${fig('8.3', 'bk-fig--wide', `<div class="bk-fig__pad">${sign}</div>`, `${signName.replace(/ x /g, ' × ')}. Toolbox ground, the line in White, the logo on Toolbox.`)}
${fig('8.4', '', `<div class="bk-fig__pad">${email}</div>`, 'Email signature.')}
${fig('8.5', '', `<div class="bk-fig__pad">${screenUi}</div>`, 'The product screen.')}
</div>`);
}

// ---- 9 downloads: a project panel ----
function downloads(ctx) {
  const D = ctx.book, L = ctx.logo, slot = ctx.edition === 'slot';
  const sum = (fs) => fs.reduce((a, f) => a + (f.size || 0), 0);
  const fmt = (n) => (n < 1024 ? `${n} B` : n < 1048576 ? `${Math.round(n / 1024)} KB` : `${(n / 1048576).toFixed(1)} MB`);
  const file = (f, note = '') => `<li class="bk-file"><span class="bk-file__n">${A(f.name)}</span><span class="bk-cap">${note ? A(note) + '. ' : ''}${A(f.ext)}, ${A(f.sizeText)}</span><a class="bk-btn bk-btn--quiet" href="${A(f.href)}" download aria-label="Download ${A(f.name)}"><span class="bk-btn__t">Download</span></a></li>`;
  const folder = (no, title, what, count, size, inner) => `<li class="bk-dir2"><details open><summary><span class="bk-dir2__c" aria-hidden="true"></span><span class="bk-dir2__i num">${no}</span><span class="bk-dir2__n">${A(title)}</span><span class="bk-dir2__m num">${count} ${count === 1 ? 'file' : 'files'}, ${fmt(size)}</span></summary><p class="bk-cap bk-dir2__w">${A(what)}</p>${inner}</details></li>`;
  const logoFiles = slot ? D.logoFiles : L.versions.flatMap((id) => { const f = D.logo(id); return [f.svg, f.pdf, ...f.png]; });
  const logoRows = slot
    ? `<ul class="bk-files">${D.logoFiles.map((f) => file(f)).join('')}</ul>`
    : `<ul class="bk-files">${L.versions.map((id) => { const f = D.logo(id); const sizes = f.png.map((p) => `<a class="bk-dl" href="${A(p.href)}" download aria-label="Download ${A(L.labels[id])} logo, PNG, ${p.w} px wide, ${A(p.sizeText)}">${p.w}</a>`).join(''); return `<li class="bk-file bk-file--logo"><span class="bk-file__n">${A(L.labels[id])}</span><span class="bk-dls">${dl(f.svg, L.labels[id] + ' logo')}${dl(f.pdf, L.labels[id] + ' logo')}<span class="bk-pngs" role="group" aria-label="PNG widths in pixels"><span class="bk-cap">PNG</span>${sizes}</span></span></li>`; }).join('')}</ul>`;
  const icons = `<ul class="bk-icons">${D.icons.map((f) => `<li><a class="bk-icon" href="${A(f.href)}" download aria-label="Download ${A(f.name)} icon, SVG">${ctx.ui.icon(f.name.replace('.svg', ''), 24)}<span>${A(f.name.replace('.svg', ''))}</span></a></li>`).join('')}</ul><ul class="bk-files">${file(D.iconsLicence, 'Licence')}</ul>`;
  const photos = D.imagery.filter((f) => f.rel.startsWith('05 Imagery/photos/'));
  const pdfs = D.imagery.filter((f) => f.ext === 'PDF');
  const readme = [D.readmePdf, D.readme].filter(Boolean), img = [...pdfs, ...photos];
  const tree = [
    folder('01', 'Read me', 'Start here: what is in the kit and how to use it.', readme.length, sum(readme), `<ul class="bk-files">${readme.map((f) => file(f)).join('')}</ul>`),
    folder('02', 'Logo', slot ? 'The labelled slot frame, and where the approved files go.' : 'Each version as SVG and PDF, and as PNG at three widths, transparent.', logoFiles.length, sum(logoFiles), logoRows),
    folder('03', 'Colour', 'The palette for Adobe, CSS and JSON, and a swatch sheet.', D.colour.length, sum(D.colour), `<ul class="bk-files">${D.colour.map((f) => file(f)).join('')}</ul>`),
    folder('04', 'Type', 'The specimen sheet, and the faces with their links and licence.', D.type.length, sum(D.type), `<ul class="bk-files">${D.type.map((f) => file(f)).join('')}</ul>`),
    folder('05', 'Icons', `${D.icons.length} interface icons, drawn in the brand's stroke.`, D.icons.length + 1, sum(D.icons) + (D.iconsLicence ? D.iconsLicence.size : 0), icons),
    folder('06', 'Imagery', photos.length ? 'The photography direction, and the photos.' : 'The photography direction and shot list.', img.length, sum(img), `<ul class="bk-files">${img.map((f) => file(f)).join('')}</ul>`),
  ].join('');
  return sec('downloads', 'bk-sec--down', `
${head('downloads', 'Downloads', 'Everything in the brand kit, folder by folder. The zip holds all of it.')}
<div class="bk-tree">
<div class="bk-tree__bar"><span class="bk-insp__t">Brand kit</span><span class="bk-cap num">${D.all.length} files</span></div>
<div class="bk-zip"><div><p class="bk-zip__n">${A(D.zip.name)}</p><p class="bk-cap">Every folder below. ${A(D.zip.sizeText)}.</p></div><a class="bk-btn bk-btn--primary" href="${A(D.zip.href)}" download aria-label="Download ${A(D.zip.name)}, ${A(D.zip.sizeText)}"><span class="bk-btn__t">Download the kit</span></a></div>
<ul class="bk-tree__l">${tree}</ul>
</div>`);
}

export function brandBook(ctx) {
  if (!ctx.book) throw new Error('brandBook needs ctx.book (set by the engine book builder)');
  return [overview, voice, logo, colour, typography, imagery, layout, applications, downloads].map((f) => f(ctx)).join('\n');
}
