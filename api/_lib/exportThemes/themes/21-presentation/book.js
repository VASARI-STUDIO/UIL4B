// Brand book markup for theme 01 (Presentation): the book is a deck played full screen. Each content unit is a 16:9 slide, edge to
// edge in the main column, one idea per slide, mostly empty. Sections open on a title slide; folios come from a CSS counter.
// The engine wraps these in the shell (skip link, section nav, light and dark switch) and adds the behaviour.
// Copy, the type tester and the downloads read data attributes the engine script understands: data-copy, data-tester-*.
import { A, fit } from './helpers.js';

const rgbOf = (ctx, hex) => { const [r, g, b] = ctx.C.hexToRgb(hex); return `rgb(${r}, ${g}, ${b})`; };
// the readable text colour on a brand colour: the better of the light-mode text and surface colours, checked
const onColour = (ctx, hex, size = 13, what = `book slide ${hex}`) => {
  const L = ctx.roles.light, pick = ctx.ratio(L.text, hex) >= ctx.ratio(L.surface, hex) ? L.text : L.surface;
  ctx.pair(pick, hex, { size, what }); return pick;
};
const hairlineOn = (ctx, hex) => hex.toLowerCase() === ctx.roles.light.surface.toLowerCase();

// a copy button: visible text is the action, the accessible name says what it copies
const copyBtn = (text, value, what, cls = '') => `<button type="button" class="bk-btn ${cls}" data-copy="${A(value)}" data-copy-label="${A(what)}" aria-label="${A(text + ' ' + what)}"><span class="bk-btn__t">${A(text)}</span></button>`;
// a value that is its own copy button: the shown text is the value, the accessible name says what it copies
const valBtn = (kind, value, name) => `<button type="button" class="bk-btn bk-btn--val" data-copy="${A(value)}" data-copy-label="${A(name + ' ' + kind)}" aria-label="Copy ${kind} ${A(value)}, ${A(name)}"><span class="bk-btn__t">${A(value)}</span></button>`;
const dl = (f, label) => (f ? `<a class="bk-dl" href="${A(f.href)}" download aria-label="Download ${A(label)}, ${A(f.ext)}, ${A(f.sizeText)}">${A(f.ext)}</a>` : '');
const sec = (id, cls, inner) => `<section class="bk-sec ${cls}" id="${id}" aria-labelledby="h-${id}">${inner}</section>`;

// a slide: a body that holds the idea and an optional foot that holds the spec
const slide = (cls, body, foot = '', style = '', attrs = '') => `<div class="bk-slide ${cls}"${style ? ` style="${style}"` : ''}${attrs ? ' ' + attrs : ''}><div class="bk-sb">${body}</div>${foot ? `<div class="bk-sf">${foot}</div>` : ''}</div>`;
// the section opener: the title set huge on the ink ground, the lead in the foot
const opener = (id, title, lead, extra = '') => slide('bk-slide--title', `<h2 class="disp bk-giant" id="h-${id}">${A(title)}</h2>`, lead ? `<p class="bk-lead">${lead}</p>` : '', '', '') + extra;
const rulesSlides = (rules) => rules.map((r) => slide('bk-slide--rule', `<p class="bk-do bk-big"><b>Do</b><span>${A(r.do)}</span></p><p class="bk-dont bk-big"><b>Don't</b><span>${A(r.dont)}</span></p>`)).join('');

function overview(ctx) {
  const B = ctx.brand, rev = B.logo.colourways.reversed;
  const shot = ctx.shot('riders');
  ctx.pair(rev.name, rev.ground, { size: 84, what: 'book cover' });
  const cover = `<div class="bk-slide bk-slide--cover" style="background:${rev.ground};color:${rev.name}"><div class="bk-sb"><p class="bk-capcover">${A(B.name)} brand book. ${A(ctx.versionLine)}.</p><h1 class="disp bk-cover" id="h-overview">${A(B.lines.primary)}</h1></div></div>`;
  const photo = `<figure class="bk-slide bk-slide--photo"><div class="bk-sb">${ctx.photo('riders', { cls: 'bk-ph', pos: '100% 40%' })}</div><figcaption class="bk-sf cap">${A(shot.caption || '')}.${shot.generated ? '' : ` Photo: ${A(shot.credit)}.`}</figcaption></figure>`;
  return sec('overview', 'bk-sec--overview', `${cover}${photo}
${slide('bk-slide--say', `<p class="bk-say">${A(B.description)}</p>`)}
${slide('bk-slide--pair', `<div><h3 class="bk-st">What it does</h3><p class="bk-txt">${A(B.product)}</p></div><div><h3 class="bk-st">Who it serves</h3><p class="bk-txt">${A(B.audience)}</p></div>`)}
${slide('bk-slide--traits', `<ul class="bk-traits">${B.personality.map((p) => `<li><p class="bk-trait disp">${A(p.trait)}</p><p class="bk-txt">${A(p.means)}</p></li>`).join('')}</ul>`)}`);
}

function voice(ctx) {
  const B = ctx.brand, V = B.voice;
  const lines = [B.lines.primary, ...B.lines.others];
  const wtn = V.writeThis;
  return sec('voice', 'bk-sec--voice', `
${opener('voice', 'Voice', 'Four rules for how we write, each with a line from the brand.')}
${V.principles.map((p) => slide('bk-slide--line', `<p class="bk-pe bk-hug">${A(p.example)}</p>`, `<h3 class="bk-pt">${A(p.title)}</h3>`)).join('')}
${lines.map((l, i) => slide('bk-slide--line bk-slide--ink', `<p class="bk-hug disp">${A(l)}</p>`, i === 0 ? '<h3 class="bk-pt">Lines in use</h3>' : '<span class="bk-pt">Lines in use</span>')).join('')}
${slide('bk-slide--wtn', `<ul class="bk-wlist">${wtn.map((r) => `<li><p class="bk-big w">${A(r.write)}</p><p class="bk-cap b">${A(r.because)}</p></li>`).join('')}</ul>`, '<h3 class="bk-pt">Write this</h3><span class="bk-cap">Because, under each line.</span>')}
${slide('bk-slide--wtn bk-slide--not', `<ul class="bk-wlist">${wtn.map((r) => `<li><p class="bk-big n">${A(r.not)}</p></li>`).join('')}</ul>`, '<h3 class="bk-pt">Not that</h3>')}
${slide('bk-slide--say', `<p class="bk-say">${A(V.boilerplate25)}</p>${copyBtn('Copy text', V.boilerplate25, '25-word boilerplate')}`, '<h3 class="bk-pt">The brand in 25 words</h3>')}
${slide('bk-slide--say', `<p class="bk-say">${A(V.boilerplate50)}</p>${copyBtn('Copy text', V.boilerplate50, '50-word boilerplate')}`, '<h3 class="bk-pt">The brand in 50 words</h3>')}
${slide('bk-slide--say', `<p class="bk-say">${A(V.nameRules)}</p>`, '<h3 class="bk-pt">Writing the name</h3>')}`);
}

function logo(ctx) {
  const B = ctx.brand, L = ctx.logo, cw = B.logo.colourways, slot = ctx.edition === 'slot';
  // each version alone on its own ground: a slide per version, the logo at a share of the slide's width
  const cells = [['colour', 34, 64], ['mono-dark', 30, 60], ['mono-light', 30, 60], ['reversed', 30, 60], ['symbol', 12, 26], ['horizontal', 40, 80], ['stacked', 20, 44]];
  const tile = ([id, share, mob]) => {
    const w = cw[L.colourwayOf(id)], files = ctx.book.logo(id), name = `${L.labels[id]} logo`, g = L.geos[id];
    const fg = onColour(ctx, w.ground, 13, `book logo slide ${id}`);
    const links = slot ? '' : `<span class="bk-dls">${dl(files.svg, name)}${dl(files.png.find((p) => p.w === 1024), name + ', 1024 px wide')}</span>`;
    const body = `<div class="bk-lg" style="--lw:${share}cqw;--lm:${mob}%;aspect-ratio:${g.w.toFixed(2)}/${g.h.toFixed(2)}">${L.html(id, { width: fit(ctx, id, 420, 240), color: w.name, label: L.labels[id] })}</div>`;
    return slide(`bk-slide--logo bk-slide--ground${hairlineOn(ctx, w.ground) ? ' is-hair' : ''}`, body, `<span class="bk-capt"><b>${A(L.labels[id])}</b>${A(B.logo.when[id])}</span>${links}`, `background:${w.ground};color:${fg}`);
  };
  const g = L.geo, padK = (g.height / g.width) * L.clearShare / 100;
  const ms = L.minSize;
  const minBlock = slot
    ? `<p class="bk-txt">Set the smallest size once the logo is in place. Below that size the kerb line and the name stop reading as one mark.</p>`
    : `<div class="bk-min"><div class="bk-min__logo">${L.html('colour', { width: ms.screenPx })}</div><p class="bk-txt">${ms.screenPx} px wide on screen. ${ms.printMm} mm wide in print.</p></div>`;
  const construction = slide('bk-slide--construct', `<div><div class="bk-clear" style="--pad:${padK.toFixed(4)}"><div class="bk-clear__in" style="aspect-ratio:${g.width}/${g.height}">${L.html('colour', { width: 420 })}</div></div><p class="bk-txt">Keep ${L.clearShare}% of the logo's height clear on every side.</p></div><div>${minBlock}</div>`, '<h3 class="bk-pt">Clear space and smallest size</h3>');
  const misuse = ['Do not stretch, squash or skew it.', 'Do not recolour it outside the versions above.', 'Do not rotate it.', 'Do not add shadows, glows or other effects.', 'Do not set it on a busy part of a photo.', 'Do not outline it or put it in a box.'];
  const dlSlot = slot ? slide('bk-slide--say', `<p class="bk-say">This book has no logo files yet. The frames above hold the place and the proportion. The brand kit's logo folder says where the approved files go.</p>`) : '';
  return sec('logo', 'bk-sec--logo', `
${opener('logo', 'Logo', A(B.logo.idea))}
${cells.map(tile).join('')}${dlSlot}
${construction}
${slide('bk-slide--never', `<ul class="bk-never">${misuse.map((m) => `<li class="bk-big">${A(m)}</li>`).join('')}</ul>`, '<h3 class="bk-pt">Never</h3>')}`);
}

function colour(ctx) {
  const B = ctx.brand, steps = Object.keys(ctx.colours[0].ramp);
  const bar = ctx.colours.map((c) => {
    const fg = onColour(ctx, c.hex);
    return `<button type="button" class="bk-sw${hairlineOn(ctx, c.hex) ? ' is-hair' : ''}" style="background:${c.hex};color:${fg};flex-grow:${Math.round(c.share * 100)}" data-copy="${c.hex}" data-copy-label="${A(c.name)} HEX ${c.hex}" aria-label="Copy HEX ${A(c.hex)}, ${A(c.name)}"><span class="bk-sw__share">${Math.round(c.share * 100)}%</span><span class="bk-sw__name">${A(c.name)}</span><span class="bk-sw__hex">${c.hex}</span></button>`;
  }).join('');
  const vals = (c, name) => {
    const rgb = rgbOf(ctx, c.hex), ok = c.oklch || ctx.C.oklchString(c.hex);
    return `<dl class="bk-vals"><div><dt>HEX</dt><dd>${valBtn('HEX', c.hex, name)}</dd></div><div><dt>RGB</dt><dd>${valBtn('RGB', rgb, name)}</dd></div><div><dt>OKLCH</dt><dd>${valBtn('OKLCH', ok, name)}</dd></div></dl>`;
  };
  // one slide per brand colour: filled with it, the name huge bottom left, the values along the foot as the copy controls, the ramp a build strip on the top edge
  const colourSlide = (c) => {
    const fg = onColour(ctx, c.hex, 64, `book colour slide ${c.name}`);
    const ramp = c.rampBase === 50 ? '' : `<span class="bk-ramp" aria-hidden="true">${steps.map((k) => `<i${+k === c.rampBase ? ' class="is-base"' : ''} style="background:${c.ramp[k]}"></i>`).join('')}</span>`;
    return `<div class="bk-slide bk-slide--c bk-crow${hairlineOn(ctx, c.hex) ? ' is-hair' : ''}" style="background:${c.hex};color:${fg}">${ramp}<div class="bk-sb"><p class="bk-clands">${A(c.lands)}</p><h3 class="bk-cname disp bk-giant">${A(c.name)}</h3></div><div class="bk-sf">${vals(c, c.name)}</div></div>`;
  };
  // a tone: a text tone is the name set in the tone on the page ground; any other tone fills its slide
  const L0 = ctx.roles.light;
  const toneSlide = (t) => {
    const isText = /text$/.test(t.role);
    if (!isText) {
      const fg = onColour(ctx, t.hex, 64, `book tone slide ${t.name}`);
      return `<div class="bk-slide bk-slide--c bk-crow" style="background:${t.hex};color:${fg}"><div class="bk-sb"><p class="bk-clands">${A(t.lands)}</p><h3 class="bk-cname disp bk-giant">${A(t.name)}</h3></div><div class="bk-sf">${vals(t, t.name)}</div></div>`;
    }
    ctx.pair(t.hex, L0.surface, { size: 64, what: `book tone slide ${t.name}` });
    return `<div class="bk-slide bk-slide--c bk-slide--tone bk-crow"><div class="bk-sb"><p class="bk-clands">${A(t.lands)}</p><h3 class="bk-cname disp bk-giant" style="color:${t.hex}">${A(t.name)}</h3></div><div class="bk-sf">${vals(t, t.name)}</div></div>`;
  };
  // the measured pairs as a results slide: the ratio big, each pair set in its own colours
  const pair = (p) => `<li class="bk-pair${hairlineOn(ctx, p.bgHex) ? ' is-hair' : ''}${p.large ? ' is-large' : ''}" style="background:${p.bgHex};color:${p.fgHex}"><span class="bk-pair__r">${A(p.ratioText)} : 1</span><span class="bk-pair__u">${A(p.use)}</span>${p.large ? '' : '<span class="bk-pair__n">Any size</span>'}</li>`;
  const roleKeys = [['surface', 'Surface'], ['raised', 'Raised'], ['text', 'Text'], ['quiet', 'Quiet text'], ['border', 'Border'], ['action', 'Action'], ['actionLabel', 'Action label'], ['focus', 'Focus']];
  const toneKeys = [['success', 'Success'], ['warning', 'Warning'], ['danger', 'Danger'], ['info', 'Info']];
  const roles = (mode) => {
    const r = ctx.roles[mode];
    const items = [...roleKeys.map(([k, n]) => [n, r[k]]), ...toneKeys.map(([k, n]) => [n, r[k].fg])];
    return `<ul class="bk-roles bk-for-${mode}">${items.map(([n, hx]) => `<li><button type="button" class="bk-role" data-copy="${hx}" data-copy-label="${mode} ${A(n)} HEX ${hx}" aria-label="Copy HEX ${A(hx)}, ${mode} ${A(n)}"><span class="bk-role__sw${hairlineOn(ctx, hx) ? ' is-hair' : ''}" style="background:${hx}" aria-hidden="true"></span><span class="bk-role__n">${A(n)}</span><span class="bk-role__h">${hx}</span></button></li>`).join('')}</ul>`;
  };
  const opening = slide('bk-slide--title bk-slide--bar', `<h2 class="disp bk-giant" id="h-colour">Colour</h2><p class="bk-lead">Click a swatch to copy its HEX. Click a value on any colour slide to copy it. Wider swatches take more of a page.</p>`, `<div class="bk-bar">${bar}</div>`);
  return sec('colour', 'bk-sec--colour', `
${opening}
${ctx.colours.map(colourSlide).join('')}
${ctx.tones.map(toneSlide).join('')}
${slide('bk-slide--data', `<h3 class="bk-st">Contrast, pair by pair</h3><ul class="bk-pairs">${ctx.pairs.map(pair).join('')}</ul>`, `<p class="bk-txt">Every text pair ${A(B.name)} uses, with its WCAG ratio. Text needs 4.5 : 1. Type at 24 px and over needs 3 : 1.</p>`)}
${slide('bk-slide--data', `<h3 class="bk-st">Interface roles</h3>${roles('light')}${roles('dark')}`, `<p class="bk-txt">The same roles in the light and dark previews. Use the switch to see the other set.</p>`)}`);
}

function typography(ctx) {
  const B = ctx.brand, F = B.fonts, T = B.type, alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789';
  const wlist = (f) => f.weights.join(', ');
  // a slide per face: the face's name set huge in itself
  const face = (f, note, style, cls = '') => slide('bk-slide--face', `<h3 class="bk-face__n bk-giant ${cls}" style="${style}">${A(f.family)}</h3>`, `<p class="bk-cap">${note} Weights ${wlist(f)}.</p><p class="bk-face__al" style="${style.replace(/font-size:[^;]+;?/, '')}">${alpha}</p>`);
  const scaleSlides = T.scale.map((s) => {
    const fam = s.face === 'display' ? 'var(--display)' : 'var(--body)';
    const st = s.face === 'display' ? 'font-stretch:125%;letter-spacing:-0.01em;' : '';
    return slide('bk-slide--scale', `<p class="bk-scale__s" style="font-family:${fam};font-weight:${s.weight};line-height:${s.line};${st}--size:${s.size}px">${A(T.sample.headline)}</p>`, `<h3 class="bk-pt">${A(ctx.cap(s.token))}</h3><p class="bk-cap num">${s.size} px, line ${s.line}, weight ${s.weight}</p><p class="bk-cap">${A(s.use)}</p>`);
  }).join('');
  const tester = `<div class="bk-slide bk-slide--tester bk-tester" data-tester><div class="bk-sb"><h3 class="bk-st">Try it</h3>
<div class="bk-tester__c"><div class="bk-field"><label for="tester-text">Your line</label><input id="tester-text" type="text" value="${A(T.sample.headline)}" data-tester-text data-default="${A(T.sample.headline)}" autocomplete="off" spellcheck="false"></div>
<div class="bk-field"><label for="tester-size">Size <output for="tester-size" data-tester-value class="num">64 px</output></label><input id="tester-size" type="range" min="14" max="120" step="1" value="64" data-tester-size></div></div>
<p class="bk-tester__d disp" data-tester-out aria-hidden="true">${A(T.sample.headline)}</p>
<p class="bk-tester__b" data-tester-out aria-hidden="true">${A(T.sample.headline)}</p></div></div>`;
  return sec('typography', 'bk-sec--type', `
${opener('typography', 'Typography', 'One face for the big line, one for everything you read.')}
${face(F.display, 'For headlines, one or two lines at a time.', 'font-family:var(--display);font-stretch:125%;font-weight:800;letter-spacing:-0.01em')}
${face(F.body, 'For reading text, labels and captions.', 'font-family:var(--body);font-weight:500')}
${slide('bk-slide--face', `<h3 class="bk-face__n bk-giant" style="font-family:var(--mono);font-weight:400">${A(F.mono.family)}</h3>`, `<p class="bk-cap">${A(F.mono.family)} is for a hex, a token or a code string only. All three faces are open licence (SIL OFL 1.1), free for commercial use.</p>`)}
${scaleSlides}
${tester}
${slide('bk-slide--use', `<p class="bk-use__h disp">${A(T.sample.headline)}</p><p class="bk-use__p">${A(T.sample.paragraph)}</p>`, `<h3 class="bk-pt">In use</h3><p class="bk-cap">${A(T.sample.caption)}</p>`)}
${rulesSlides(T.rules)}`);
}

function imagery(ctx) {
  const B = ctx.brand, D = B.imagery.direction, shots = B.imagery.shots;
  const dirRows = [['Subject', D.subject], ['Light', D.light], ['Crop', D.crop], ['Colour', D.colour], ['People', D.people]];
  const fig = (s, i) => {
    const real = !!s.photo;
    const f = real ? ctx.book.find(`05 Imagery/photos/${s.photo.split('/').pop()}`) : null;
    const cap = real ? `${A(s.caption || s.alt)}.${s.generated ? '' : ` Photo: ${A(s.credit)}.`}` : 'Art-directed slot: the shot, the crop and the light.';
    return `<figure class="bk-slide bk-slide--photo bk-shot bk-shot--${i}"><div class="bk-sb">${ctx.photo(s.id, { cls: 'bk-ph', pos: '50% 50%' })}</div><figcaption class="bk-sf bk-capt"><span>${cap}</span>${f ? `<span class="bk-dls">${dl(f, 'photo ' + (s.caption || s.id))}</span>` : ''}</figcaption></figure>`;
  };
  return sec('imagery', 'bk-sec--imagery', `
${opener('imagery', 'Imagery', A(D.subject))}
${dirRows.slice(1).map(([k, v]) => slide('bk-slide--say', `<p class="bk-say">${A(v)}</p>`, `<h3 class="bk-pt">${k}</h3>`)).join('')}
${shots.map(fig).join('')}
${rulesSlides(B.imagery.rules)}`);
}

function layout(ctx) {
  const G = ctx.gridMeasures, B = ctx.brand;
  const m = (G.margin / G.page.w) * 100, inner = G.page.w - 2 * G.margin, gap = (G.gutter / inner) * 100;
  const cols = Array.from({ length: G.columns }, () => '<i></i>').join('');
  const col = (Math.round(G.col * 10) / 10).toString();
  const radii = ctx.radii.filter((r) => r.px < 9999);
  const pw = Math.min(62, (36 * G.page.w) / G.page.h).toFixed(1);
  return sec('layout', 'bk-sec--layout', `
${opener('layout', 'Layout', `${G.columns} columns on a ${G.page.w} by ${G.page.h} page, a ${G.margin} px margin and a ${G.gutter} px gutter. Everything sits on a ${G.base} px base.`)}
${slide('bk-slide--grid', `<div class="bk-pagebox" style="--pw:${pw}cqw"><div class="bk-page" role="img" aria-label="The page grid: ${G.columns} columns, ${G.margin} pixel margin, ${G.gutter} pixel gutter" style="aspect-ratio:${G.page.w}/${G.page.h};padding:${m.toFixed(3)}%"><div class="bk-page__g" style="column-gap:${gap.toFixed(3)}%;grid-template-columns:repeat(${G.columns},minmax(0,1fr))">${cols}</div></div></div>`, `<dl class="bk-meas"><div><dt>Margin</dt><dd class="num">${G.margin} px</dd></div><div><dt>Gutter</dt><dd class="num">${G.gutter} px</dd></div><div><dt>Column</dt><dd class="num">${col} px</dd></div><div><dt>Base</dt><dd class="num">${G.base} px</dd></div></dl>`)}
${slide('bk-slide--space', `<ul class="bk-space">${ctx.space.map((s) => `<li><i style="width:${s.px}px;height:${s.px}px"></i><span class="bk-cap num">${s.px}</span></li>`).join('')}</ul>`, '<h3 class="bk-pt">Spacing</h3>')}
${slide('bk-slide--space', `<div class="bk-shape">${radii.map((r) => `<div><i style="border-radius:${r.px}px"></i><span class="bk-cap">${A(r.use)}, ${r.px} px</span></div>`).join('')}</div>`, `<h3 class="bk-pt">Corners and edges</h3><p class="bk-cap">Edges are ${B.ui.border} px. ${A(B.ui.elevationNote)}</p>`)}`);
}

function applications(ctx) {
  const B = ctx.brand, L = ctx.logo, ap = B.applications, S = B.ui.screen.content, cw = B.logo.colourways, rev = cw.reversed;
  const [rr, rg, rb] = ctx.C.hexToRgb(rev.ground);
  const lastLine = B.lines.others[B.lines.others.length - 1] || B.lines.primary;
  const R = ctx.roles.light;
  const front = `<div class="bk-card bk-card--front"><div class="bk-card__logo">${L.html('reversed', { width: fit(ctx, 'reversed', 200, 80), color: rev.name, label: 'Your logo goes here' })}</div><p class="bk-card__line">${A(B.lines.primary)}</p></div>`;
  const back = `<div class="bk-card bk-card--back"><div class="bk-card__mark">${L.html('symbol', { width: fit(ctx, 'symbol', 40, 46), label: 'Logo' })}</div><div class="bk-card__who"><p class="nm">${A(ap.card.person)}</p><p class="rl">${A(ap.card.role)}</p><p class="ct">${A(ap.card.contact)}<br>${A(ap.site.url)}</p></div></div>`;
  const social = `<div class="bk-posts">
<div class="bk-post bk-post--sq" style="background:${R.action};color:${R.actionLabel}"><p class="disp">${A(ap.social[0])}</p><span class="bk-post__lg">${L.html('mono-dark', { width: 96, color: R.actionLabel, label: 'Logo' })}</span></div>
<div class="bk-post bk-post--pt" style="background:${rev.ground};color:${rev.name}"><p class="disp">${A(ap.social[1])}</p><span class="bk-post__lg">${L.html('reversed', { width: 96, color: rev.name, label: 'Logo' })}</span></div>
<div class="bk-post bk-post--st">${ctx.photo('evening', { cls: 'bk-post__ph', pos: '15% 40%' })}<span class="bk-post__tint" style="background:rgba(${rr},${rg},${rb},0.5)"></span><p class="disp">${A(ap.social[2])}</p></div>
</div>`;
  // signage: the poster sits in the shelter's panel, as on the guidelines signage page. Sizes are in cqw of the stage,
  // so the whole scene scales together. The photo and poster geometry are fractions of the 1280 x 853 scene.
  const bus = ctx.shot('busstop'), [, signHead] = ap.signage.split(': ');
  const glass = bus.photo ? `<span class="bk-poster__glass" style="background-image:url(${A(ctx.photoUrl(bus.photo))})"></span>` : '';
  const logoGeo = L.geos.colour;
  const sign = `<figure class="bk-sign"><div class="bk-sign__crop"><div class="bk-stage">${ctx.photo('busstop', { cls: 'bk-stage__img' })}
<div class="bk-poster"><span class="bk-poster__ink"></span>${glass}<div class="bk-poster__in"><p class="disp bk-poster__h">${A(signHead || lastLine)}</p><div class="bk-poster__b"><p class="bk-poster__l">${A(B.lines.primary).replace('. ', '.<br>')}</p><div class="bk-poster__logo" style="aspect-ratio:${logoGeo.w.toFixed(2)}/${logoGeo.h.toFixed(2)}">${L.html('colour', { colourway: 'on-signal', width: 190, label: '', color: 'var(--bk-poster-ink)' })}</div></div></div></div></div></div>
<figcaption class="cap">${A(ap.signage.split(': ')[0].replace(/ x /g, ' × '))}. ${A(bus.caption || '')}.${bus.generated ? '' : ` Photo: ${A(bus.credit)}.`}</figcaption></figure>`;
  const email = `<div class="bk-email"><p class="bk-email__n">${A(ap.email.person)}</p><p class="bk-email__r">${A(ap.email.role)}, ${A(B.name)}</p><p class="bk-email__c">${A(ap.card.contact)}<br>${A(ap.site.url)}</p><div class="bk-email__l">${L.html('horizontal', { width: 168, label: 'Logo' })}</div></div>`;
  const rows = S.deliveries.slice(0, 3);
  const screen = `<div class="bk-device"><div class="ui bk-screen" role="img" aria-label="${A(B.name)} product screen: ${A(S.title)}. ${A(S.eta)}. ${A(S.rider)}, ${A(S.riderNote)}." inert>
<div class="bk-scr__top"><span class="ui-num bk-scr__time">${A(S.time)}</span>${ctx.ui.statusChip('on-the-way')}</div>
<p class="ui-display bk-scr__eta">${A(S.eta)}</p><p class="bk-scr__note">${A(S.pickup)}</p>
<div class="ui-progress"><div class="ui-progress__bar"><i style="width:${S.progress * 100}%"></i></div><span class="ui-progress__dot" style="left:${S.progress * 100}%"></span></div>
<div class="bk-scr__ft"><span>${A(S.from)}</span><span>${A(S.to)}</span></div>
<ul class="ui-list">${ctx.ui.row({ lead: `<span class="ui-avatar">${A(S.initials)}</span>`, title: S.rider, sub: S.riderNote, endHtml: ctx.ui.btn(S.call, { variant: 'secondary', size: 'sm', iconLeft: 'phone' }) })}</ul>
<ul class="ui-list">${rows.map((d) => ctx.ui.row({ lead: ctx.ui.icon('package', 18), title: d.to, sub: d.when, end: d.price, chip: ctx.ui.statusChip(d.status) })).join('')}</ul>
</div></div>`;
  return sec('applications', 'bk-sec--apps', `
${opener('applications', 'Applications', 'The brand at work: a card, a feed, a street, an inbox and the product itself.')}
${slide('bk-slide--panel', `<div class="bk-cards">${front}${back}</div>`, '<h3 class="bk-pt">Business card</h3><span class="bk-cap">90 by 55 mm, front and back.</span>')}
${slide('bk-slide--panel', social, '<h3 class="bk-pt">Social</h3>')}
${slide('bk-slide--panel bk-slide--sign', sign, '<h3 class="bk-pt">Signage</h3>')}
${slide('bk-slide--panel', email, '<h3 class="bk-pt">Email signature</h3>')}
${slide('bk-slide--panel bk-slide--screen', screen, '<h3 class="bk-pt">Product screen</h3>')}`);
}

// the slide sorter: each folder is a small 16:9 thumbnail in a contact grid, its files listed under it
function downloads(ctx) {
  const B = ctx.brand, D = ctx.book, L = ctx.logo, slot = ctx.edition === 'slot';
  const file = (f, note = '') => `<li class="bk-file"><span class="bk-file__n">${A(f.name)}</span><span class="bk-cap">${note ? A(note) + '. ' : ''}${A(f.ext)}, ${A(f.sizeText)}</span><a class="bk-btn bk-btn--quiet" href="${A(f.href)}" download aria-label="Download ${A(f.name)}"><span class="bk-btn__t">Download</span></a></li>`;
  let n = 0;
  const grounds = ctx.colours.map((c) => c.hex);
  const group = (title, what, inner) => {
    const hex = grounds[n++ % grounds.length], fg = onColour(ctx, hex, 32, `book folder thumbnail ${title}`);
    return `<div class="bk-fgroup"><div class="bk-thumb${hairlineOn(ctx, hex) ? ' is-hair' : ''}" style="background:${hex};color:${fg}"><h3 class="bk-thumb__n disp">${A(title)}</h3></div><p class="bk-cap">${A(what)}</p>${inner}</div>`;
  };
  const logoRows = slot
    ? `<ul class="bk-files">${D.logoFiles.map((f) => file(f)).join('')}</ul>`
    : `<ul class="bk-files">${L.versions.map((id) => { const f = D.logo(id); const sizes = f.png.map((p) => `<a class="bk-dl" href="${A(p.href)}" download aria-label="Download ${A(L.labels[id])} logo, PNG, ${p.w} px wide, ${A(p.sizeText)}">${p.w}</a>`).join(''); return `<li class="bk-file bk-file--logo"><span class="bk-file__n">${A(L.labels[id])}</span><span class="bk-dls">${dl(f.svg, L.labels[id] + ' logo')}${dl(f.pdf, L.labels[id] + ' logo')}<span class="bk-pngs" role="group" aria-label="PNG widths in pixels"><span class="bk-cap">PNG</span>${sizes}</span></span></li>`; }).join('')}</ul>`;
  const icons = `<ul class="bk-icons">${D.icons.map((f) => `<li><a class="bk-icon" href="${A(f.href)}" download aria-label="Download ${A(f.name)} icon, SVG">${ctx.ui.icon(f.name.replace('.svg', ''), 24)}<span>${A(f.name.replace('.svg', ''))}</span></a></li>`).join('')}</ul><ul class="bk-files">${file(D.iconsLicence, 'Licence')}</ul>`;
  const photos = D.imagery.filter((f) => f.rel.startsWith('05 Imagery/photos/'));
  const pdfs = D.imagery.filter((f) => f.ext === 'PDF');
  const ink = ctx.roles.light.text;
  ctx.pair(ctx.roles.light.surface, ink, { size: 32, what: 'book kit thumbnail' });
  const zip = `<div class="bk-fgroup bk-fgroup--zip"><div class="bk-thumb" style="background:${ink};color:${ctx.roles.light.surface}"><h3 class="bk-thumb__n disp">The kit</h3></div><p class="bk-cap">Every folder below. ${A(D.zip.sizeText)}.</p><p class="bk-zip__n">${A(D.zip.name)}</p><a class="bk-btn bk-btn--primary" href="${A(D.zip.href)}" download aria-label="Download ${A(D.zip.name)}, ${A(D.zip.sizeText)}"><span class="bk-btn__t">Download the kit</span></a></div>`;
  return sec('downloads', 'bk-sec--down', `
${opener('downloads', 'Downloads', `Everything in the brand kit, folder by folder. The zip holds all of it.`)}
<div class="bk-sorter">
${zip}
${group('Read me', 'Start here: what is in the kit and how to use it.', `<ul class="bk-files">${[D.readmePdf, D.readme].filter(Boolean).map((f) => file(f)).join('')}</ul>`)}
${group('Logo', slot ? 'The labelled slot frame, and where the approved files go.' : 'Each version as SVG and PDF, and as PNG at three widths, transparent.', logoRows)}
${group('Colour', 'The palette for Adobe, CSS and JSON, and a swatch sheet.', `<ul class="bk-files">${D.colour.map((f) => file(f)).join('')}</ul>`)}
${group('Type', 'The specimen sheet, and the faces with their links and licence.', `<ul class="bk-files">${D.type.map((f) => file(f)).join('')}</ul>`)}
${group('Icons', `${D.icons.length} interface icons, drawn in the brand's stroke.`, icons)}
${group('Imagery', photos.length ? 'The photography direction, and the photos.' : 'The photography direction and shot list.', `<ul class="bk-files">${[...pdfs, ...photos].map((f) => file(f)).join('')}</ul>`)}
</div>`);
}

export function brandBook(ctx) {
  if (!ctx.book) throw new Error('brandBook needs ctx.book (set by the engine book builder)');
  return [overview, voice, logo, colour, typography, imagery, layout, applications, downloads].map((f) => f(ctx)).join('\n');
}
