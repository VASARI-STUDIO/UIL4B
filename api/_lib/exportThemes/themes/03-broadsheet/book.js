// Brand book markup for theme 03 (Broadsheet): nine sections, each a page of the paper (running head, one headline, ruled columns).
// The engine wraps these in the shell (skip link, section rail, light and dark switch) and adds the behaviour.
// Copy, the type tester and the downloads read data attributes the engine script understands: data-copy, data-tester-*.
// Each content family takes a newspaper page type: colour is the markets page, contrast the weather table, type a front page
// with its styles labelled in the margin, logo the nameplate with a corrections column, downloads the classifieds.
import { A, fit, edition } from './helpers.js';

const rgbOf = (ctx, hex) => { const [r, g, b] = ctx.C.hexToRgb(hex); return `rgb(${r}, ${g}, ${b})`; };
const hairlineOn = (ctx, hex) => hex.toLowerCase() === ctx.roles.light.surface.toLowerCase();
const copyBtn = (text, value, what, cls = '') => `<button type="button" class="bk-btn ${cls}" data-copy="${A(value)}" data-copy-label="${A(what)}" aria-label="${A(text + ' ' + what)}"><span class="bk-btn__t">${A(text)}</span></button>`;
const sub = (t) => `<h3 class="bk-h3">${A(t)}</h3>`;
const dl = (f, label) => (f ? `<a class="bk-dl" href="${A(f.href)}" download aria-label="Download ${A(label)}, ${A(f.ext)}, ${A(f.sizeText)}">${A(f.ext)}</a>` : '');
const rulesList = (rules, cls = '') => `<ul class="bk-rules ${cls}">${rules.map((r) => `<li><p class="bk-do"><b>Do</b>${A(r.do)}</p><p class="bk-dont"><b>Don't</b>${A(r.dont)}</p></li>`).join('')}</ul>`;
const sec = (id, cls, inner) => `<section class="bk-sec ${cls}" id="${id}" aria-labelledby="h-${id}">${inner}</section>`;
// a section opens with the running head over the action rule, then one headline and its deck
const open = (ctx, n, id, title, deck) => `<div class="bk-run"><span class="bk-run__nm">${A(ctx.brand.name)}</span><span class="bk-run__f num">${n} of 9</span></div>
<div class="bk-hd"><h2 class="bk-headline" id="h-${id}">${A(title)}</h2>${deck ? `<p class="bk-deck">${deck}</p>` : ''}</div>`;
const cols = (n, items) => `<div class="bk-cols" style="--n:${n}">${items.join('')}</div>`;

function overview(ctx) {
  const B = ctx.brand, S = B.ui.screen.content, slot = ctx.edition === 'slot';
  const both = (light, dark) => `<span class="bk-for-light">${light}</span><span class="bk-for-dark">${dark}</span>`;
  const plate = slot ? `<span class="bk-plate__t">${A(B.name)}</span>` : both(ctx.logo.html('colour', { width: 560 }), ctx.logo.html('reversed', { width: 560 }));
  const week = S.deliveries.map((d) => {
    const [item, region] = d.to.split(', ');
    return `<li><span>${A(item)}<span class="q">${A(region)}</span></span>${d.status === 'short' ? `<span class="gone">${A(d.when)}</span>` : `<span class="pr">${A(d.price)}</span>`}</li>`;
  }).join('');
  return sec('overview', 'bk-sec--front', `
<div class="bk-ears"><span>Brand book</span><span>${A(edition(ctx))}</span><span>${A(ctx.date)}</span><span>${A(B.city)}</span></div>
<div class="bk-mast"><p class="bk-ear">${A(B.lines.others[0]).replace(', ', ',<br>')}</p><h1 class="bk-plate" id="h-overview" aria-label="${A(B.name)} brand book">${plate}</h1><p class="bk-ear r">${A(B.lines.primary).replace('. ', '.<br>')}</p></div>
<div class="bk-rule2"></div>
<div class="bk-front"><figure class="bk-front__l">${ctx.photo('quandongs')}<figcaption class="bk-cap">Photograph: a handful of quandongs on the shop counter at opening, printed black and white.</figcaption></figure>
<div class="bk-front__r"><p class="bk-lead">${A(B.description)}</p><div class="bk-wk"><h3><i></i>${A(B.ui.screen.title)}</h3><ul>${week}</ul></div></div></div>
<div class="bk-about"><div>${sub('What it does')}<p class="bk-body">${A(B.product)}</p></div><div>${sub('Who it serves')}<p class="bk-body">${A(B.audience)}</p></div></div>
<ul class="bk-traits">${B.personality.map((p) => `<li><p class="bk-trait">${A(p.trait)}</p><p class="bk-body">${A(p.means)}</p></li>`).join('')}</ul>`);
}

// voice: the editorial page. Lines in use as the headlines, the four rules as a ruled sidebar, the style desk's table, the standing text
function voice(ctx) {
  const B = ctx.brand, V = B.voice, lines = [B.lines.primary, ...B.lines.others];
  return sec('voice', 'bk-sec--voice', `
${open(ctx, 2, 'voice', 'Voice', 'Four rules for how we write, each with a line from the brand.')}
<div class="bk-vo">
<div class="bk-vo__main">
<div>${sub('Lines in use')}<ul class="bk-lines">${lines.map((l, i) => `<li${i ? '' : ' class="is-lead"'}>${A(l)}</li>`).join('')}</ul></div>
<div class="bk-block">${sub('Write this, not that')}
<div class="bk-wtn" role="table" aria-label="Write this, not that">
<div class="bk-wtn__h" role="row"><span role="columnheader">Write this</span><span role="columnheader">Not that</span><span role="columnheader">Because</span></div>
${V.writeThis.map((r) => `<div class="bk-wtn__r" role="row"><p role="cell" class="w">${A(r.write)}</p><p role="cell" class="n">${A(r.not)}</p><p role="cell" class="b">${A(r.because)}</p></div>`).join('')}
</div></div>
</div>
<ol class="bk-vo__side bk-principles" aria-label="The four rules">${V.principles.map((p) => `<li><p class="bk-pt">${A(p.title)}</p><p class="bk-pe">${A(p.example)}</p></li>`).join('')}</ol>
</div>
<div class="bk-block bk-boil">${cols(2, [`<div>${sub('The brand in 25 words')}<p class="bk-body">${A(V.boilerplate25)}</p>${copyBtn('Copy text', V.boilerplate25, '25-word boilerplate')}</div>`, `<div>${sub('The brand in 50 words')}<p class="bk-body">${A(V.boilerplate50)}</p>${copyBtn('Copy text', V.boilerplate50, '50-word boilerplate')}</div>`])}</div>
<div class="bk-nr">${sub('Writing the name')}<p class="bk-body bk-measure">${A(V.nameRules)}</p></div>`);
}

// logo: the nameplate across the full measure, the versions down a ruled column, the don'ts as corrections
function logo(ctx) {
  const B = ctx.brand, L = ctx.logo, cw = B.logo.colourways, slot = ctx.edition === 'slot';
  const tile = (id, box, cls = '') => {
    const w = cw[L.colourwayOf(id)], files = ctx.book.logo(id), name = `${L.labels[id]} logo`;
    const links = slot ? '' : `<span class="bk-dls">${dl(files.svg, name)}${dl(files.png.find((p) => p.w === 1024), name + ', 1024 px wide')}</span>`;
    return `<figure class="bk-tile ${cls}"><div class="bk-ground${hairlineOn(ctx, w.ground) ? ' is-hair' : ''}" style="background:${w.ground}">${L.html(id, { width: fit(ctx, id, ...box), color: w.name, label: L.labels[id] })}</div><figcaption class="bk-capt"><span><b>${A(L.labels[id])}</b>${A(B.logo.when[id])}</span>${links}</figcaption></figure>`;
  };
  const versions = [['mono-dark', [200, 64]], ['mono-light', [200, 64]], ['reversed', [200, 64]], ['symbol', [56, 64]], ['horizontal', [300, 72]], ['stacked', [140, 84]]];
  const g = L.geo, pad = Math.round((420 * g.height / g.width) * L.clearShare / 100), ms = L.minSize;
  const minBlock = slot
    ? `<p class="bk-body">Set the smallest size once the logo is in place. Below that size the logo stops reading as one mark.</p>`
    : `<div class="bk-min"><div class="bk-min__logo">${L.html('colour', { width: ms.screenPx })}</div><p class="bk-body">${ms.screenPx} px wide on screen. ${ms.printMm} mm wide in print.</p></div>`;
  const misuse = ['Do not stretch, squash or skew it.', 'Do not recolour it outside the versions above.', 'Do not rotate it.', 'Do not add shadows, glows or other effects.', 'Do not set it on a busy part of a photo.', 'Do not outline it or put it in a box.'];
  const dlSlot = slot ? `<p class="bk-body bk-measure" style="margin-top:24px">This book has no logo files yet. The frames above hold the place and the proportion. The brand kit's logo folder says where the approved files go.</p>` : '';
  return sec('logo', 'bk-sec--logo', `
${open(ctx, 3, 'logo', 'Logo', A(B.logo.idea))}
<div class="bk-nameplate">${tile('colour', [560, 232], 'bk-tile--lead')}</div>${dlSlot}
<div class="bk-lg">
<div class="bk-lg__main">
<div>${sub('Clear space')}<div class="bk-clear" style="padding:${pad}px"><div style="width:420px;max-width:100%">${L.html('colour', { width: 420 })}</div></div><p class="bk-body">Keep ${L.clearShare}% of the logo's height clear on every side.</p></div>
<div class="bk-block">${sub('Smallest size')}${minBlock}</div>
<aside class="bk-corr" aria-labelledby="h-corr"><h3 class="bk-h3" id="h-corr">Corrections</h3><ul>${misuse.map((m) => `<li><b>Correction:</b> ${A(m)}</li>`).join('')}</ul></aside>
</div>
<ol class="bk-vers" aria-label="Logo versions">${versions.map(([id, box]) => `<li>${tile(id, box)}</li>`).join('')}</ol>
</div>`);
}

// colour: the markets page. A ruled listing of colours like share prices, one lead story beside it, the contrast pairs as the weather table
function colour(ctx) {
  const B = ctx.brand, lead = ctx.colours.reduce((a, c) => (c.share > a.share ? c : a), ctx.colours[0]);
  const maxShare = Math.max(...ctx.colours.map((c) => c.share));
  const hair = (hex) => (hairlineOn(ctx, hex) ? ' is-hair' : '');
  const row = (c, isColour) => {
    const rgb = rgbOf(ctx, c.hex), ok = c.oklch || ctx.C.oklchString(c.hex);
    const mark = isColour
      ? `<button type="button" class="bk-sw${hair(c.hex)}" style="background-color:${c.hex}" data-copy="${c.hex}" data-copy-label="${A(c.name)} HEX ${c.hex}" aria-label="Copy HEX ${A(c.hex)}, ${A(c.name)}"></button>`
      : `<span class="bk-chip${hair(c.hex)}" style="background-color:${c.hex}" aria-hidden="true"></span>`;
    const share = isColour ? `<p class="bk-share num"><span>${Math.round(c.share * 100)}%</span><i style="width:${((c.share / maxShare) * 100).toFixed(1)}%"></i></p>` : '<p class="bk-share"></p>';
    return `<li class="bk-crow">${mark}<div class="bk-cinfo"><p class="bk-cname">${A(c.name)}</p><p class="bk-clands">${A(c.lands)}</p></div>${share}<dl class="bk-vals"><div><dt>HEX</dt><dd>${c.hex}</dd></div><div><dt>RGB</dt><dd>${rgb}</dd></div><div><dt>OKLCH</dt><dd>${ok}</dd></div></dl><div class="bk-copies">${copyBtn('Copy HEX', c.hex, `${c.name} HEX`)}${copyBtn('Copy RGB', rgb, `${c.name} RGB`)}${copyBtn('Copy OKLCH', ok, `${c.name} OKLCH`)}</div></li>`;
  };
  const head = (first, share) => `<div class="bk-th" aria-hidden="true"><span></span><span>${first}</span><span class="r">${share}</span><span>HEX</span><span>RGB</span><span>OKLCH</span></div>`;
  const pair = (p) => `<li class="bk-pair"><p class="bk-pair__u">${A(p.use)}</p><span class="bk-pair__s${hair(p.bgHex)}" style="background-color:${p.bgHex};color:${p.fgHex}" aria-hidden="true">Aa</span><p class="bk-pair__r num">${A(p.ratioText)} : 1</p><p class="bk-pair__n">${p.large ? `${p.minSize || 24} px and over` : 'Any size'}</p></li>`;
  const roleKeys = [['surface', 'Surface'], ['raised', 'Raised'], ['text', 'Text'], ['quiet', 'Quiet text'], ['border', 'Border'], ['action', 'Action'], ['actionLabel', 'Action label'], ['focus', 'Focus']];
  const toneKeys = [['success', 'Success'], ['warning', 'Warning'], ['danger', 'Danger'], ['info', 'Info']];
  const roles = (mode) => {
    const r = ctx.roles[mode], items = [...roleKeys.map(([k, n]) => [n, r[k]]), ...toneKeys.map(([k, n]) => [n, r[k].fg])];
    return `<ul class="bk-roles bk-for-${mode}">${items.map(([n, hx]) => `<li><button type="button" class="bk-role" data-copy="${hx}" data-copy-label="${mode} ${A(n)} HEX ${hx}" aria-label="Copy HEX ${A(hx)}, ${mode} ${A(n)}"><span class="bk-role__sw" style="background-color:${hx}" aria-hidden="true"></span><span class="bk-role__n">${A(n)}</span><span class="bk-role__h">${hx}</span></button></li>`).join('')}</ul>`;
  };
  return sec('colour', 'bk-sec--colour', `
${open(ctx, 4, 'colour', 'Colour', 'Click a swatch to copy its HEX. RGB and OKLCH are one button away. Wider swatches take more of a page.')}
<div class="bk-mkt">
<aside class="bk-story" aria-label="The lead colour"><h3 class="bk-story__h">${A(lead.name)} takes ${Math.round(lead.share * 100)} in every 100.</h3><figure><div class="bk-photo${hair(lead.hex)}" style="background-color:${lead.hex}" role="img" aria-label="A swatch of ${A(lead.name)}, ${lead.hex}"></div><figcaption class="bk-cap"><b>${A(lead.name)}, ${lead.hex}.</b> ${A(lead.lands)}</figcaption></figure></aside>
<div class="bk-mkt__main">
<div>${sub('Values')}${head('Colour', 'Share')}<ul class="bk-clist">${ctx.colours.map((c) => row(c, true)).join('')}</ul></div>
<div class="bk-block">${sub('Text tones')}${head('Tone', '')}<ul class="bk-clist">${ctx.tones.map((c) => row(c, false)).join('')}</ul></div>
<div class="bk-block">${sub('Contrast, pair by pair')}<p class="bk-body bk-measure">Every text pair ${A(B.name)} uses, with its WCAG ratio. Text needs 4.5 : 1. Type at 24 px and over needs 3 : 1.</p>
<div class="bk-wxh" aria-hidden="true"><span>Where it is used</span><span>Pair</span><span class="r">Ratio</span><span>Passes at</span></div><ul class="bk-pairs">${ctx.pairs.map(pair).join('')}</ul></div>
<div class="bk-block">${sub('Interface roles')}<p class="bk-body bk-measure">The same roles in the light and dark previews. Use the switch to see the other set.</p>${roles('light')}${roles('dark')}</div>
</div>
</div>`);
}

// typography: a mock front page set in the brand's real lines, each style labelled in the margin with a leader rule and its spec
function typography(ctx) {
  const B = ctx.brand, F = B.fonts, T = B.type, alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789';
  const fam = { display: 'var(--display)', body: 'var(--body)', chrome: 'var(--chrome)' };
  const S = Object.fromEntries(T.scale.map((s) => [s.token, s]));
  const st = (s) => `font-family:${fam[s.face] || fam.body};font-weight:${s.weight};line-height:${s.line};--size:${s.size}px`;
  const an = (s, inner) => `<li class="bk-an"><div class="bk-an__m"><p class="bk-an__t">${A(ctx.cap(s.token))}</p><p class="bk-cap num">${s.size} px, line ${s.line}, weight ${s.weight}</p><p class="bk-cap">${A(s.use)}</p></div><i class="bk-an__l" aria-hidden="true"></i><div class="bk-an__s">${inner}</div></li>`;
  const text = (s, t) => `<p class="bk-an__x" style="${st(s)}">${A(t)}</p>`;
  const face = (cls, f, note, style) => `<div class="bk-face"><p class="bk-face__aa ${cls}" aria-hidden="true">Aa</p><p class="bk-face__n">${A(f.family)}</p><p class="bk-cap">${note} Weights ${f.weights.join(', ')}.</p><p class="bk-face__al" style="${style}">${alpha}</p></div>`;
  const page = [
    an(S.nameplate, text(S.nameplate, B.name)),
    an(S.headline, text(S.headline, T.sample.headline)),
    an(S.lead, text(S.lead, B.description)),
    an(S.caption, `<figure class="bk-an__ph">${ctx.photo('quandongs')}<figcaption style="${st(S.caption)};font-size:${S.caption.size}px">${A(T.sample.caption)}</figcaption></figure>`),
    an(S.body, `<div class="bk-an__cols" style="${st(S.body)};font-size:${S.body.size}px"><p>${A(T.sample.paragraph)}</p><p>${A(B.product)}</p></div>`),
    an(S.title, `<p class="bk-pq" style="${st(S.title)}">${A(B.lines.primary)}</p>`),
  ].join('');
  return sec('typography', 'bk-sec--type', `
${open(ctx, 5, 'typography', 'Typography', 'One face for the big line, one for everything you read.')}
<div class="bk-ty">
<div class="bk-ty__page">${sub('In use')}<ol class="bk-anat">${page}</ol></div>
<aside class="bk-ty__side">${sub('Faces')}${face('disp', F.display, 'For headlines and the name, one or two lines at a time.', 'font-family:var(--display)')}${face('', F.body, 'For reading text, labels and captions.', 'font-family:var(--body)')}
<p class="bk-cap">${A(F.mono.family)} is for a hex, a token or a code string only. All three faces are open licence (SIL OFL 1.1), free for commercial use.</p>
<div class="bk-block">${sub('Rules')}${rulesList(T.rules, 'bk-rules--stack')}</div></aside>
</div>
<div class="bk-block bk-tester" data-tester>${sub('Try it')}
<div class="bk-tester__c"><div class="bk-field"><label for="tester-text">Your line</label><input id="tester-text" type="text" value="${A(T.sample.headline)}" data-tester-text data-default="${A(T.sample.headline)}" autocomplete="off" spellcheck="false"></div>
<div class="bk-field"><label for="tester-size">Size <output for="tester-size" data-tester-value class="num">64 px</output></label><input id="tester-size" type="range" min="14" max="120" step="1" value="64" data-tester-size></div></div>
<p class="bk-tester__d disp" data-tester-out aria-hidden="true">${A(T.sample.headline)}</p><p class="bk-tester__b" data-tester-out aria-hidden="true">${A(T.sample.headline)}</p></div>`);
}

// imagery: a picture page. The lead photograph beside the brief, the other shots in ruled columns, the picture desk's rules
function imagery(ctx) {
  const B = ctx.brand, D = B.imagery.direction, shots = B.imagery.shots;
  const dirRows = [['Light', D.light], ['Crop', D.crop], ['Colour', D.colour], ['People', D.people]];
  const fig = (s, i) => {
    const f = s.photo ? ctx.book.find(`05 Imagery/photos/${s.photo.split('/').pop()}`) : null;
    const cap = s.photo ? `${A(s.caption || s.alt)}. Photo: ${A(s.credit)}.` : `<b>${i + 1}. ${A(ctx.cap(s.id))}</b>Art-directed slot: the shot, the crop and the light.`;
    return `<figure class="bk-shot bk-shot--${i}"><div class="bk-shot__f">${ctx.photo(s.id, { cls: 'bk-ph', pos: '50% 50%' })}</div><figcaption class="bk-capt"><span>${cap}</span>${f ? `<span class="bk-dls">${dl(f, 'photo ' + (s.caption || s.id))}</span>` : ''}</figcaption></figure>`;
  };
  const figs = shots.map(fig);
  return sec('imagery', 'bk-sec--imagery', `
${open(ctx, 6, 'imagery', 'Imagery', A(D.subject))}
<div class="bk-im"><div class="bk-im__lead">${figs[0]}</div>
<dl class="bk-dir">${dirRows.map(([k, v]) => `<div><dt>${k}</dt><dd>${A(v)}</dd></div>`).join('')}</dl></div>
<div class="bk-reel">${figs.slice(1).join('')}</div>
<div class="bk-block">${sub('Rules')}${rulesList(B.imagery.rules)}</div>`);
}

// layout: the page grid as the lead figure, the measures as the figures box beside it, spacing and corners as two ruled briefs
function layout(ctx) {
  const G = ctx.gridMeasures, B = ctx.brand;
  const m = (G.margin / G.page.w) * 100, inner = G.page.w - 2 * G.margin, gap = (G.gutter / inner) * 100;
  const cols2 = Array.from({ length: G.columns }, () => '<i></i>').join('');
  const radii = ctx.radii.filter((r) => r.px < 9999);
  return sec('layout', 'bk-sec--layout', `
${open(ctx, 7, 'layout', 'Layout', `${G.columns} columns on a ${G.page.w} by ${G.page.h} page, a ${G.margin} px margin and a ${G.gutter} px gutter. Everything sits on a ${G.base} px base.`)}
<div class="bk-gridfig"><div class="bk-page" role="img" aria-label="The page grid: ${G.columns} columns, ${G.margin} pixel margin, ${G.gutter} pixel gutter" style="aspect-ratio:${G.page.w}/${G.page.h};padding:${m.toFixed(3)}%"><div class="bk-page__g" style="column-gap:${gap.toFixed(3)}%;grid-template-columns:repeat(${G.columns},minmax(0,1fr))">${cols2}</div></div>
<dl class="bk-meas"><div><dt>Margin</dt><dd class="num">${G.margin} px</dd></div><div><dt>Gutter</dt><dd class="num">${G.gutter} px</dd></div><div><dt>Column</dt><dd class="num">${Math.round(G.col * 10) / 10} px</dd></div><div><dt>Base</dt><dd class="num">${G.base} px</dd></div></dl></div>
<div class="bk-block bk-two bk-two--even bk-two--ruled"><div>${sub('Spacing')}<ul class="bk-space">${ctx.space.map((s) => `<li><i style="width:${s.px}px;height:${s.px}px"></i><span class="bk-cap num">${s.px}</span></li>`).join('')}</ul></div>
<div>${sub('Corners and edges')}<div class="bk-shape">${radii.map((r) => `<div><i style="border-radius:${r.px}px"></i><span class="bk-cap">${A(r.use)}, ${r.px} px</span></div>`).join('')}</div><p class="bk-body">Edges are ${B.ui.border} px. ${A(B.ui.elevationNote)}</p></div></div>`);
}

// applications: the press page. The pieces sit on the newsprint in ruled cells of different widths, no band behind them
function applications(ctx) {
  const B = ctx.brand, L = ctx.logo, ap = B.applications, S = B.ui.screen.content, rev = B.logo.colourways.reversed, R = ctx.roles.light;
  const [signSpec, signLine] = ap.signage.split(': ');
  const front = `<div class="bk-card bk-card--front"><div class="bk-card__logo">${L.html('reversed', { width: fit(ctx, 'reversed', 200, 80), color: rev.name, label: 'Your logo goes here' })}</div><p class="bk-card__line">${A(B.lines.primary)}</p></div>`;
  const back = `<div class="bk-card bk-card--back"><div class="bk-card__mark">${L.html('symbol', { width: fit(ctx, 'symbol', 40, 46), label: 'Logo' })}</div><div class="bk-card__who"><p class="nm">${A(ap.card.person)}</p><p class="rl">${A(ap.card.role)}</p><p class="ct">${A(ap.card.contact)}<br>${A(ap.site.url)}</p></div></div>`;
  const social = `<div class="bk-posts">
<div class="bk-post bk-post--sq"><p class="disp">${A(ap.social[0])}</p><span class="bk-post__lg">${L.html('colour', { width: 96, colourway: 'on-quandong', color: R.actionLabel, label: 'Logo' })}</span></div>
<div class="bk-post bk-post--pt"><p class="disp">${A(ap.social[1])}</p><span class="bk-post__lg">${L.html('colour', { width: 96, label: 'Logo' })}</span></div>
<div class="bk-post bk-post--st"><p class="disp">${A(ap.social[2])}</p><span class="bk-post__lg">${L.html('reversed', { width: 96, color: rev.name, label: 'Logo' })}</span></div></div>`;
  const sign = `<figure class="bk-sign"><div class="bk-sign__panel"><p class="disp">${A(signLine || B.lines.primary)}</p>${L.html('reversed', { width: 120, color: rev.name, label: 'Logo' })}</div><figcaption class="cap">${A(signSpec.replace(/ x /g, ' × '))}.</figcaption></figure>`;
  const email = `<div class="bk-email"><p class="bk-email__n">${A(ap.email.person)}</p><p class="bk-email__r">${A(ap.email.role)}, ${A(B.name)}</p><p class="bk-email__c">${A(ap.card.contact)}<br>${A(ap.site.url)}</p><div class="bk-email__l">${L.html('horizontal', { width: 168, label: 'Logo' })}</div></div>`;
  const rows = S.deliveries.slice(0, 3).map((d) => ctx.ui.row({ lead: ctx.ui.icon('shopping-basket', 18), title: d.to, sub: d.when, end: d.price, chip: ctx.ui.statusChip(d.status) })).join('');
  const screen = `<div class="bk-device"><div class="ui bk-screen" role="img" aria-label="${A(B.name)} product screen: ${A(B.ui.screen.title)}. ${A(S.alert)}" inert>
<div class="bk-scr__top"><span class="ui-display bk-scr__brand">${A(B.name)}</span><span class="ui-num bk-scr__time">${A(S.deliverTo)}</span></div>
<h4 class="ui-display bk-scr__t">${A(B.ui.screen.title)}</h4><ul class="ui-list">${rows}</ul>${ctx.ui.btn(`${S.form.book}, ${S.paid}`, { block: true })}</div></div>`;
  const item = (cls, title, body) => `<div class="bk-app ${cls}">${sub(title)}${body}</div>`;
  return sec('applications', 'bk-sec--apps', `
${open(ctx, 8, 'applications', 'Applications', 'The brand at work: a card, a feed, a shop window, an inbox and the product itself.')}
<div class="bk-press">${item('bk-app--7', 'Business card', `<div class="bk-cards">${front}${back}</div><p class="bk-cap">90 by 55 mm, front and back.</p>`)}${item('bk-app--5', 'Signage', sign)}${item('bk-app--12', 'Social', social)}${item('bk-app--6', 'Email signature', email)}${item('bk-app--6', 'Product screen', screen)}</div>`);
}

// downloads: the classifieds. A ruled grid of small ads, one per folder, the files as each ad's lines
function downloads(ctx) {
  const B = ctx.brand, D = ctx.book, L = ctx.logo, slot = ctx.edition === 'slot';
  const file = (f, note = '') => `<li class="bk-file"><span class="bk-file__n">${A(f.name)}</span><span class="bk-cap">${note ? A(note) + '. ' : ''}${A(f.ext)}, ${A(f.sizeText)}</span><a class="bk-btn bk-btn--quiet" href="${A(f.href)}" download aria-label="Download ${A(f.name)}"><span class="bk-btn__t">Download</span></a></li>`;
  const ad = (title, what, inner, cls = '') => `<div class="bk-ad ${cls}"><div class="bk-ad__h">${sub(title)}<p class="bk-cap">${A(what)}</p></div>${inner}</div>`;
  const logoRows = slot
    ? `<ul class="bk-files">${D.logoFiles.map((f) => file(f)).join('')}</ul>`
    : `<ul class="bk-files">${L.versions.map((id) => { const f = D.logo(id); const sizes = f.png.map((p) => `<a class="bk-dl" href="${A(p.href)}" download aria-label="Download ${A(L.labels[id])} logo, PNG, ${p.w} px wide, ${A(p.sizeText)}">${p.w}</a>`).join(''); return `<li class="bk-file bk-file--logo"><span class="bk-file__n">${A(L.labels[id])}</span><span class="bk-dls">${dl(f.svg, L.labels[id] + ' logo')}${dl(f.pdf, L.labels[id] + ' logo')}<span class="bk-pngs" role="group" aria-label="PNG widths in pixels"><span class="bk-cap">PNG</span>${sizes}</span></span></li>`; }).join('')}</ul>`;
  const icons = `<ul class="bk-icons">${D.icons.map((f) => `<li><a class="bk-icon" href="${A(f.href)}" download aria-label="Download ${A(f.name)} icon, SVG">${ctx.ui.icon(f.name.replace('.svg', ''), 24)}<span>${A(f.name.replace('.svg', ''))}</span></a></li>`).join('')}</ul><ul class="bk-files bk-files--after">${file(D.iconsLicence, 'Licence')}</ul>`;
  const photos = D.imagery.filter((f) => f.rel.startsWith('05 Imagery/photos/')), pdfs = D.imagery.filter((f) => f.ext === 'PDF');
  const list = (fs) => `<ul class="bk-files">${fs.map((f) => file(f)).join('')}</ul>`;
  return sec('downloads', 'bk-sec--down', `
${open(ctx, 9, 'downloads', 'Downloads', 'Everything in the brand kit, folder by folder. The zip holds all of it.')}
<div class="bk-ads">
<div class="bk-ad bk-ad--zip"><div><p class="bk-zip__n">${A(D.zip.name)}</p><p class="bk-cap">Every folder below. ${A(D.zip.sizeText)}.</p></div><a class="bk-btn bk-btn--primary" href="${A(D.zip.href)}" download aria-label="Download ${A(D.zip.name)}, ${A(D.zip.sizeText)}"><span class="bk-btn__t">Download the kit</span></a></div>
${ad('Read me', 'Start here: what is in the kit and how to use it.', list([D.readmePdf, D.readme].filter(Boolean)))}
${ad('Colour', 'The palette for Adobe, CSS and JSON, and a swatch sheet.', list(D.colour))}
${ad('Logo', slot ? 'The labelled slot frame, and where the approved files go.' : 'Each version as SVG and PDF, and as PNG at three widths, transparent.', logoRows, 'bk-ad--2')}
${ad('Type', 'The specimen sheet, and the faces with their links and licence.', list(D.type))}
${ad('Imagery', photos.length ? 'The photography direction, and the photos.' : 'The photography direction and shot list.', list([...pdfs, ...photos]))}
${ad('Icons', `${D.icons.length} interface icons, drawn in the brand's stroke.`, icons, 'bk-ad--4')}
</div>`);
}

export function brandBook(ctx) {
  if (!ctx.book) throw new Error('brandBook needs ctx.book (set by the engine book builder)');
  return [overview, voice, logo, colour, typography, imagery, layout, applications, downloads].map((f) => f(ctx)).join('\n');
}
