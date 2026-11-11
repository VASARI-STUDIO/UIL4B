// Brand book markup for theme 02, Ticket (Encore): the HTML book as the roll ticket. Styles are bookCss in css-book.js (classes start tb-).
// At 1440 the roll runs down a left column (each section's serial and name, held in view) with the work to its right, past a vertical
// perforation; a horizontal perforation tears one section from the next. At 390 the roll folds over each section: one ticket wide.
// Full tickets only where the theme allows them: the cover ticket (overview), the colour rolls, the print hierarchy and the kit's zip.
// Everywhere else the ticket's parts are edge devices: perforations as rules, serials as running numbers, fields label over value.
// The engine wraps these in the shell (skip link, section nav, light and dark switch) and adds the behaviour: data-copy, data-tester-*.
import { A, fit, ratioText, nameOf } from './helpers.js';
import { perf, serial, inkOn, holeOn, same, bySize, byRole } from './gate.js';

const COUNT = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'];
const rgbOf = (ctx, hex) => { const [r, g, b] = ctx.C.hexToRgb(hex); return `rgb(${r}, ${g}, ${b})`; };
// a ground that is the page in either mode (Stock in light, Night in dark) needs a drawn edge
const edge = (ctx, hex) => [ctx.roles.light.surface, ctx.roles.dark.surface].some((g) => same(g, hex)) ? ' tb-edge' : '';
// the readable print ink on a fixed ground, registered with the contrast check
const ink = (ctx, hex, what, size = 13) => { const f = inkOn(ctx, hex); ctx.pair(f, hex, { size, what: `book ${what}` }); return f; };

// the perforation as a rule: 3 px holes at a 9 px pitch, in the colour the CSS gives (currentColor), vertical or horizontal
const pv = (cls = '') => `<span class="tb-pv ${cls}" aria-hidden="true">${perf('currentColor', { d: 3, p: 9, cls: 'tb-perf' })}</span>`;
const ph = (cls = '') => `<span class="tb-ph ${cls}" aria-hidden="true">${perf('currentColor', { d: 3, p: 9, dir: 'h', cls: 'tb-perf' })}</span>`;
// the serial in the condensed stub face, and fact fields label over value
const sn = (n, w = 3, cls = '') => `<span class="tb-sn num ${cls}">${serial(n, w)}</span>`;
const ff = (cols, cls = '') => `<dl class="tb-ff ${cls}">${cols.map(([k, v, vc = '']) => `<div><dt>${A(k)}</dt><dd class="${vc}">${v}</dd></div>`).join('')}</dl>`;
const sub = (t) => `<h3 class="tb-h3">${A(t)}</h3>`;
// a copy button: visible text is the action, the accessible name says what it copies (the engine swaps .bk-btn__t to "Copied")
const copyBtn = (text, value, what, cls = '') => `<button type="button" class="tb-btn ${cls}" data-copy="${A(value)}" data-copy-label="${A(what)}" aria-label="${A(text + ' ' + what)}"><span class="bk-btn__t">${A(text)}</span></button>`;
const dl = (f, label, text = f && f.ext) => (f ? `<a class="tb-dl" href="${A(f.href)}" download aria-label="Download ${A(label)}, ${A(f.ext)}, ${A(f.sizeText)}">${A(text)}</a>` : '');
// Do on the body you keep, Don't past the perforation on the stub side: an open row, not a ticket
const doRows = (rules) => `<ul class="tb-rows">${rules.map((r) => `<li>${ph()}<div class="tb-row"><p class="tb-row__k"><b class="tb-sl">Do</b>${A(r.do)}</p>${pv()}<p class="tb-row__s"><b class="tb-sl">Don't</b>${A(r.dont)}</p></div></li>`).join('')}</ul>`;
// a section is one ticket on the roll: its serial and name in the roll column, the work past the perforation
// A wide row (the print hierarchy ticket) runs the full width above the roll and the work at 1440, and under the heading at 390.
const sec = (id, no, title, lead, main, { cls = '', wide = '' } = {}) => `<section class="bk-sec tb-sec tb-sec--${id} ${cls}" id="${id}" aria-labelledby="h-${id}">${ph('tb-tear')}<div class="tb-frame${wide ? ' tb-frame--wide' : ''}"><div class="tb-roll"><div class="tb-roll__in">${sn(no, 4)}<h2 class="tb-rh" id="h-${id}">${A(title)}</h2>${lead ? `<p class="tb-lead">${lead}</p>` : ''}</div></div>${pv('tb-pv--frame')}${ph('tb-ph--frame')}${wide ? `<div class="tb-wide-row">${wide}</div>` : ''}<div class="tb-main">${main}</div></div></section>`;
const slotCap = (s) => A(s.caption || s.alt || s.slot || '');

function overview(ctx) {
  const B = ctx.brand, slot = ctx.edition === 'slot', red = byRole(ctx, 'action'), fg = ink(ctx, red.hex, 'cover ticket', 13), rev = B.logo.colourways.reversed;
  const shot = ctx.shot('queue');
  // the cover ticket: body and stub at 4 : 1.5, 2.75 : 1 overall. The stub tears off along its perforation once, on first load.
  const name = slot
    ? `<div class="tb-cv__slot">${ctx.logo.html('reversed', { width: 300, color: rev.name, label: 'Your logo goes here' })}</div><p class="tb-disp tb-cv__name">${A(B.name)}</p>`
    : `<div class="tb-cv__logo">${ctx.logo.html('reversed', { width: fit(ctx, 'reversed', 480, 110) })}</div>`;
  const ticket = `<div class="tb-cv" style="--red:${red.hex};color:${fg}">
<div class="tb-cv__body"><div class="tb-cv__top">${sn(1, 4)}<span class="tb-sn">Gig tickets, ${A(B.city)}</span></div>
<div class="tb-cv__mid">${name}<h1 class="tb-disp tb-cv__line" id="h-overview">${A(B.lines.primary)}</h1></div>
${ff([['Document', 'Brand book'], ['Version', A(B.version.number), 'num'], ['City', A(B.city)]], 'tb-ff--cover')}${pv('tb-pv--hole')}${ph('tb-ph--hole')}</div>
<div class="tb-cv__stub">${pv('tb-pv--hole')}${ph('tb-ph--hole')}${sn(1, 4)}<p class="tb-cv__stubname">${A(B.name)}</p>${ff([['Sections', `<span class="num">9</span>`], ['Kept by', 'You']], 'tb-ff--stub')}</div>
</div>`;
  const facts = [['What it is', B.description], ['What it does', B.product], ['Who it serves', B.audience]];
  const P = B.personality;
  const main = `
<div class="tb-facts">${facts.map(([k, v], i) => `${i ? pv() : ''}<div class="tb-fact">${ff([[k, A(v)]], 'tb-ff--fact')}</div>`).join('')}</div>
<figure class="tb-wide">${ctx.photo('queue', { cls: 'tb-ph', pos: '50% 40%' })}<figcaption class="tb-cap">${shot.photo ? `${A(shot.caption || shot.alt)}. Photo: ${A(shot.credit)}.` : `${slotCap(shot)} Art-directed slot: the shot, the crop and the light.`}</figcaption></figure>
<ol class="tb-traits">${P.map((p, i) => `<li class="tb-trait tb-trait--${Math.min(i, 2)}">${ph()}${sn(i + 1, 2)}<p class="tb-disp tb-trait__t">${A(p.trait)}</p><p class="tb-body">${A(p.means)}</p></li>`).join('')}</ol>`;
  const top = `<div class="tb-hero">${ticket}<p class="tb-cap tb-hero__cap">${A(B.name)} brand book. ${A(ctx.versionLine)}.</p></div>`;
  // the overview's roll column carries its name as a label: the section's heading is the line on the ticket
  return `<section class="bk-sec tb-sec tb-sec--overview" id="overview" aria-labelledby="h-overview">${top}<div class="tb-frame"><div class="tb-roll"><div class="tb-roll__in">${sn(1, 4)}<p class="tb-rh" aria-hidden="true">The brand</p><p class="tb-lead">${COUNT[P.length] || P.length} traits, and who the brand is for.</p></div></div>${pv('tb-pv--frame')}${ph('tb-ph--frame')}<div class="tb-main">${main}</div></div></section>`;
}

function voice(ctx) {
  const B = ctx.brand, V = B.voice, lines = [B.lines.primary, ...B.lines.others];
  const n = V.principles.length;
  const main = `
<ol class="tb-prin">${V.principles.map((p, i) => `${i ? pv() : ''}<li>${sn(i + 1, 2)}<p class="tb-prin__t">${A(p.title)}</p><p class="tb-disp tb-prin__e">${A(p.example)}</p></li>`).join('')}</ol>
<div class="tb-block">${sub('Lines in use')}<ol class="tb-lines">${lines.map((l, i) => `<li class="tb-line${i ? '' : ' tb-line--lead'}">${ph()}${sn(i + 1, 2)}<p class="tb-disp">${A(l)}</p></li>`).join('')}</ol></div>
<div class="tb-block">${sub('Write this, not that')}
<div class="tb-wtn" role="table" aria-label="Write this, not that">
<div class="tb-wtn__h" role="row"><span role="columnheader" class="tb-sl">Write this</span><span role="columnheader" aria-label="Because"></span><span role="columnheader" class="tb-sl">Not that</span></div>
${V.writeThis.map((r) => `<div class="tb-wtn__r" role="row">${ph()}<div class="tb-wtn__b"><p role="cell" class="tb-disp tb-wtn__w">${A(r.write)}</p><p role="cell" class="tb-wtn__c">${A(r.because)}</p></div>${pv()}<p role="cell" class="tb-wtn__n">${A(r.not)}</p></div>`).join('')}
</div></div>
<div class="tb-block tb-boil">
<div>${sub('The brand in 25 words')}<p class="tb-body">${A(V.boilerplate25)}</p>${copyBtn('Copy text', V.boilerplate25, '25-word boilerplate')}</div>${pv()}
<div>${sub('The brand in 50 words')}<p class="tb-body">${A(V.boilerplate50)}</p>${copyBtn('Copy text', V.boilerplate50, '50-word boilerplate')}</div>
</div>
<div class="tb-block">${sub('Writing the name')}<p class="tb-body">${A(V.nameRules)}</p></div>`;
  return sec('voice', 2, 'Voice', `${COUNT[n] || n} rules for how we write, each with a line from the brand.`, main);
}

function logo(ctx) {
  const B = ctx.brand, L = ctx.logo, cw = B.logo.colourways, slot = ctx.edition === 'slot';
  const fig = (id, box, cls = '') => {
    const w = cw[L.colourwayOf(id)], files = ctx.book.logo(id), name = `${L.labels[id]} logo`;
    const links = slot ? '' : `<span class="tb-dls">${dl(files.svg, name)}${dl(files.png.find((p) => p.w === 1024), name + ', 1024 px wide', 'PNG')}</span>`;
    return `<figure class="tb-lv tb-lv--${id} ${cls}"><div class="tb-lv__g${edge(ctx, w.ground)}" style="background:${w.ground}">${L.html(id, { width: fit(ctx, id, ...box), color: w.name, label: L.labels[id] })}</div><figcaption><b class="tb-sl">${A(L.labels[id])}</b><span>${A(B.logo.when[id])}</span>${links}</figcaption></figure>`;
  };
  const strip = (items) => `<div class="tb-lvs">${items.map(([id, box], i) => `${i ? pv() : ''}${fig(id, box)}`).join('')}</div>`;
  // clear space is x, the cap height of the E, on every side. The pad is a share of the figure's width, so it is exact at any size.
  const g = L.geo, u = g.unit / g.width, pad = (u / (1 + 2 * u)) * 100, padS = pad.toFixed(3) + '%';
  const ms = L.minSize, st = cw.colour;
  const dim = (cls) => `<span class="tb-x ${cls}" style="--p:${padS}" aria-hidden="true"><i>x</i></span>`;
  const clearFig = `<div class="tb-clearfig"><div class="tb-clear tb-edge" style="padding:${padS};background:${st.ground};--sign:${st.sign};color:${st.name}"><div class="tb-clear__logo">${L.html('colour', { width: 420, color: st.name, label: 'Logo' })}</div>${dim('tb-x--t')}${dim('tb-x--b')}${dim('tb-x--l')}${dim('tb-x--r')}</div></div>`;
  const minBlock = slot
    ? `<p class="tb-body">Set the smallest size once the logo is in place. Below that size the repeat mark and the name stop reading as one mark.</p>`
    : `<div class="tb-min"><div class="tb-min__logo tb-edge" style="background:${st.ground}">${L.html('colour', { width: ms.screenPx, color: st.name })}</div><span class="tb-min__dim" style="width:${ms.screenPx}px" aria-hidden="true"></span>${ff([['On screen', `<span class="num">${ms.screenPx} px</span> wide`], ['In print', `<span class="num">${ms.printMm} mm</span> wide`]], 'tb-ff--min')}</div>`;
  // each misuse drawn with the engine's logo, with the fault and its reason. The recolour turns Door red half way round the hue circle.
  const off = ctx.C.toOklch(byRole(ctx, 'action').hex), wrong = ctx.C.fromOklch(0.72, off.C, (off.H + 180) % 360);
  const widths = [34, 12, 52, 20, 9, 44, 16, 28, 60, 14, 38, 22, 11, 48, 26, 18, 56, 10, 32, 24];
  let x = 0; const bars = widths.map((bw, i) => { const e = `<rect x="${x}" y="0" width="${bw}" height="200" fill="${ctx.colours[(i * 3 + (i >> 2)) % ctx.colours.length].hex}"/>`; x += bw; return e; }).join('');
  const busy = `<svg class="tb-busy" viewBox="0 0 ${x} 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${bars}</svg>`;
  const lit = ctx.C.hexToRgb(cw.colour.sign).join(',');
  const misuse = [
    ['st', 'Do not stretch, squash or skew it.', `<div class="tb-mu__a" style="transform:scale(1.4,0.66)">${L.forMisuse(150)}</div>`],
    ['re', 'Do not recolour it outside the versions above.', L.forMisuse(150, { fill: wrong })],
    ['cut', 'Do not draw the repeat mark without the name, or the name without it.', `<div class="tb-mu__cut">${L.forMisuse(150)}</div>`],
    ['fx', 'Do not add shadows, glows or other effects.', `<div style="filter:drop-shadow(5px 6px 4px rgba(${lit},0.6))">${L.forMisuse(150)}</div>`],
    ['bu', 'Do not set it on a bright part of a photo.', `${busy}<span class="tb-mu__on">${L.forMisuse(130)}</span>`],
    ['bo', 'Do not outline it or put it in a box.', `<div class="tb-mu__box">${L.forMisuse(110)}</div>`],
  ];
  const never = `<ol class="tb-mu">${misuse.map(([k, t, art], i) => `<li class="tb-mu__i tb-mu--${k}">${ph()}${sn(i + 1, 2)}<div class="tb-mu__art tb-edge" aria-hidden="true">${art}</div><p class="tb-mu__t">${A(t)}</p></li>`).join('')}</ol>`;
  const dlSlot = slot ? `<p class="tb-body tb-slotnote">This book has no logo files yet. The frames above hold the place and the proportion. The brand kit's logo folder says where the approved files go.</p>` : '';
  const main = `
${fig('colour', [560, 200], 'tb-lv--lead')}
${strip([['mono-dark', [240, 90]], ['mono-light', [240, 90]], ['reversed', [240, 90]]])}
${strip([['horizontal', [320, 80]], ['stacked', [170, 120]], ['symbol', [72, 80]]])}${dlSlot}
<div class="tb-block tb-split">
<div>${sub('Clear space')}${clearFig}<p class="tb-body">Keep x, the cap height of the E, clear on every side. Nothing else enters that zone.</p></div>${pv()}
<div>${sub('Smallest size')}${minBlock}</div>
</div>
<div class="tb-block">${sub('Never')}${never}</div>`;
  return sec('logo', 3, 'Logo', A(B.logo.idea), main);
}

function colour(ctx) {
  const B = ctx.brand, cs = bySize(ctx), total = cs.reduce((s, c) => s + c.share, 0);
  // a field that copies its value: the label over the value, the whole field the button
  const fv = (c, k, v) => `<button type="button" class="tb-fv" data-copy="${A(v)}" data-copy-label="${A(c.name)} ${k} ${A(v)}" aria-label="Copy ${k} ${A(v)}, ${A(c.name)}"><span class="tb-fv__k">${k}</span><span class="bk-btn__t tb-mono">${A(v)}</span></button>`;
  const vals = (c) => { const rgb = rgbOf(ctx, c.hex), ok = c.oklch || ctx.C.oklchString(c.hex); return fv(c, 'HEX', c.hex) + fv(c, 'RGB', rgb) + fv(c, 'OKLCH', ok); };
  // one roll per colour, the biggest share first; its height is its share. Face, values and where it lands are three tickets on the roll.
  const roll = (c, i) => {
    const fg = ink(ctx, c.hex, `roll ${c.name}`), hole = holeOn(ctx, c.hex), h = Math.round(150 + (c.share / total) * 520);
    // the name's size follows the roll's height, capped by its length so it stays inside the face ticket
    const fs = Math.max(44, Math.min(132, Math.round(h * 0.3), Math.floor(352 / (c.name.length * 0.84))));
    const hp = (dir) => `<span class="tb-${dir === 'h' ? 'ph' : 'pv'}" aria-hidden="true">${perf(hole, { d: 4, p: 10, dir, cls: 'tb-perf' })}</span>`;
    return `<li class="tb-cr${edge(ctx, c.hex)}" style="--h:${h}px;background:${c.hex};color:${fg}">
<button type="button" class="tb-cr__face" data-copy="${c.hex}" data-copy-label="${A(c.name)} HEX ${c.hex}" aria-label="Copy HEX ${A(c.hex)}, ${A(c.name)}"><span class="tb-sn num">${Math.round(c.share * 100)}%</span><span class="tb-disp tb-cr__n" style="--fs:${fs}px;--fit:${(100 / (c.name.length * 1.05)).toFixed(2)}cqw">${A(c.name)}</span></button>
${hp('v')}${hp('h')}<div class="tb-cr__vals">${sn(i * 10 + 2)}${vals(c)}</div>
${hp('v')}${hp('h')}<div class="tb-cr__lands">${sn(i * 10 + 3)}<p><b>${A(ctx.cap(c.role))}.</b> ${A(c.lands)}</p></div></li>`;
  };
  const tones = `<ul class="tb-tones">${ctx.tones.map((t, i) => `<li>${i ? ph() : ''}<div class="tb-tone"><span class="tb-tone__sw${edge(ctx, t.hex)}" style="background:${t.hex}" aria-hidden="true"></span><div><p class="tb-tone__n">${A(t.name)}</p><p class="tb-cap">${A(t.lands)}</p></div><div class="tb-tone__v">${vals(t)}</div></div></li>`).join('')}</ul>`;
  // the pairs as a roll of tickets still joined: each printed in its own colours, the ratio as the price field
  const pairs = `<ol class="tb-pairs">${ctx.pairs.map((p, i) => {
    const sm = p.large ? inkOn(ctx, p.bgHex) : p.fgHex, hole = holeOn(ctx, p.bgHex);
    return `<li class="tb-pr${edge(ctx, p.bgHex)}${i === 0 ? ' tb-pr--lead' : ''}${p.large ? ' is-large' : ''}" style="background:${p.bgHex};color:${sm}">${i ? `<span class="tb-ph" aria-hidden="true">${perf(hole, { d: 4, p: 10, dir: 'h', cls: 'tb-perf' })}</span>` : ''}<div class="tb-pr__b"><p class="tb-pr__u">${A(p.use)}</p><p class="tb-pr__nm">${A(nameOf(ctx, p.fg))} on ${A(nameOf(ctx, p.bg))}. ${p.large ? '24 px and over.' : 'Any size.'}</p></div><dl class="tb-pr__p"><dt>Ratio</dt><dd class="tb-disp num" style="color:${p.fgHex}">${ratioText(p.ratioText)}</dd></dl></li>`;
  }).join('')}</ol>`;
  const roleKeys = [['surface', 'Surface'], ['raised', 'Raised'], ['text', 'Text'], ['quiet', 'Quiet text'], ['border', 'Border'], ['action', 'Action'], ['actionLabel', 'Action label'], ['focus', 'Focus']];
  const toneKeys = [['success', 'Success'], ['warning', 'Warning'], ['danger', 'Danger'], ['info', 'Info']];
  const roles = (mode) => {
    const r = ctx.roles[mode], items = [...roleKeys.map(([k, n]) => [n, r[k]]), ...toneKeys.map(([k, n]) => [n, r[k].fg])];
    return `<ul class="tb-roles tb-roles--${mode}">${items.map(([n, hx]) => `<li><button type="button" class="tb-role" data-copy="${hx}" data-copy-label="${mode} ${A(n)} HEX ${hx}" aria-label="Copy HEX ${A(hx)}, ${mode} ${A(n)}"><span class="tb-role__sw" style="background:${hx}" aria-hidden="true"></span><span class="tb-role__n">${A(n)}</span><span class="tb-role__h tb-mono">${hx}</span></button></li>`).join('')}</ul>`;
  };
  const main = `
<ol class="tb-rolls">${cs.map(roll).join('')}</ol>
<div class="tb-block">${sub('Text tones')}${tones}</div>
<div class="tb-block">${sub('Contrast, pair by pair')}<p class="tb-body">Every text pair ${A(B.name)} uses, with its WCAG ratio. Text needs 4.5 : 1. Type at 24 px and over needs 3 : 1.</p>${pairs}</div>
<div class="tb-block">${sub('Interface roles')}<p class="tb-body">The same roles in the light and dark previews. Use the switch to see the other set.</p>${roles('light')}${roles('dark')}</div>`;
  return sec('colour', 4, 'Colour', 'Click a colour to copy its HEX. RGB and OKLCH are one click away. A roll is as tall as the share of a page the colour takes.', main);
}

function typography(ctx) {
  const B = ctx.brand, F = B.fonts, T = B.type, c = B.ui.screen.content, alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789';
  const S = Object.fromEntries(T.scale.map((t) => [t.token, t]));
  const spec = (t) => `${t.size} px, line ${t.line}, weight ${t.weight}`;
  const st = (t) => `--size:${t.size}px;line-height:${t.line};${t.face === 'display' ? '' : `font-weight:${t.weight};`}`;
  // one hard ticket at true proportion carrying the print hierarchy: every line a style of the scale at its true size, top to bottom,
  // and its stub specs each style in the order it is printed. Reading text is the one style a ticket does not carry: it sits below.
  const stage = byRole(ctx, 'panel', 2), tf = ink(ctx, stage.hex, 'hierarchy ticket'), hole = holeOn(ctx, stage.hex);
  const line = (k, txt, cls = '') => S[k] ? `<p class="tb-hl ${S[k].face === 'display' ? 'tb-disp' : ''} ${cls}" style="${st(S[k])}">${txt}</p>` : '';
  const lab = S.label ? `font-size:${S.label.size}px;line-height:${S.label.line};font-weight:${S.label.weight}` : '';
  const flds = [[c.deliverToLabel, c.deliverTo], [c.form.size, c.form.sizes[1]], [c.paidLabel, c.paid]].map(([k, v]) => `<div><dt style="${lab}">${A(k)}</dt><dd class="num">${A(v)}</dd></div>`).join('');
  // the display line is the doors time, the biggest print on a gig ticket, read out of the brand's line through ctx.real (the name if none)
  const time = (ctx.real(c.eta).match(/\d{1,2}:\d{2}/) || [])[0];
  const specs = T.scale.map((t, i) => `<li>${sn(i + 1, 2)}<p class="tb-hs__t">${A(ctx.cap(t.token))}</p><p class="tb-hs__s num">${spec(t)}</p><p class="tb-hs__u">${A(t.use)}</p></li>`).join('');
  const ticket = `<div class="tb-ht" style="background:${stage.hex};color:${tf}">
<div class="tb-ht__b">${line('display', time ? A(time) : A(B.name))}${line('headline', A(c.rider))}${line('title', A(B.lines.primary))}
<div class="tb-ht__f"><dl class="tb-ht__ff">${flds}</dl>${line('caption', A(T.sample.caption))}</div></div>
<div class="tb-ht__s"><span class="tb-pv" aria-hidden="true">${perf(hole, { d: 6, p: 15, cls: 'tb-perf' })}</span><span class="tb-ph" aria-hidden="true">${perf(hole, { d: 6, p: 15, dir: 'h', cls: 'tb-perf' })}</span>${sn(2, 4)}<ol class="tb-hs">${specs}</ol></div></div>`;
  const below = S.body ? `<div class="tb-ht__below"><p class="tb-ht__para" style="font-size:${S.body.size}px;line-height:${S.body.line}">${A(T.sample.paragraph)}</p><p class="tb-cap">Every line on the ticket is a style at its true size, in the order the stub lists it. ${A(ctx.cap('body'))}, at ${spec(S.body)}, is the reading text at its left.</p></div>` : '';
  const face = (cls, f, note, style, n) => `<div class="tb-face tb-face--${n}"><p class="tb-face__aa ${cls}" aria-hidden="true">Aa</p><p class="tb-face__n">${A(f.family)}</p><p class="tb-cap">${note} Weights ${f.weights.join(', ')}.</p><p class="tb-face__al" style="${style}">${alpha}</p></div>`;
  const main = `
<div class="tb-faces">${face('tb-disp', F.display, 'For the name and every headline, one or two lines at a time.', 'font-family:var(--tb-disp);font-stretch:150%', 1)}${pv()}${face('', F.body, 'For tickets, times, labels and buttons.', 'font-family:var(--tb-body)', 2)}</div>
<p class="tb-cap tb-faces__mono">${A(F.mono.family)} is for a hex, a token or a code string only. All three faces are open licence (SIL OFL 1.1), free for commercial use.</p>
<div class="tb-block tb-tester" data-tester>
${sub('Try it')}
<div class="tb-tester__c"><div class="tb-field"><label for="tester-text">Your line</label><input id="tester-text" type="text" value="${A(T.sample.headline)}" data-tester-text data-default="${A(T.sample.headline)}" autocomplete="off" spellcheck="false"></div>
<div class="tb-field"><label for="tester-size">Size <output for="tester-size" data-tester-value class="num">64 px</output></label><input id="tester-size" type="range" min="14" max="120" step="1" value="64" data-tester-size></div></div>
<p class="tb-tester__d tb-disp" data-tester-out aria-hidden="true">${A(T.sample.headline)}</p>
<p class="tb-tester__b" data-tester-out aria-hidden="true">${A(T.sample.headline)}</p>
</div>
<div class="tb-block tb-split tb-split--use"><div>${sub('In use')}<p class="tb-use__h tb-disp">${A(T.sample.headline)}</p><p class="tb-use__p">${A(T.sample.paragraph)}</p><p class="tb-cap">${A(T.sample.caption)}</p></div>${pv()}<div>${sub('Rules')}${doRows(T.rules)}</div></div>`;
  return sec('typography', 5, 'Typography', 'One expanded face for the big line, one plain face for everything you read.', main, { wide: ticket + below });
}

function imagery(ctx) {
  const B = ctx.brand, D = B.imagery.direction, shots = B.imagery.shots;
  const dir = [['Light', D.light], ['Crop', D.crop], ['Colour', D.colour], ['People', D.people]];
  // the shot list as a pad of stubs: each shot's serial, caption and file on the stub, the photo on the body past the perforation
  const shot = (s, i) => {
    const real = !!s.photo;
    const f = real ? ctx.book.find(`05 Imagery/photos/${s.photo.split('/').pop()}`) : null;
    const cap = real ? `${A(s.caption || s.alt)}. Photo: ${A(s.credit)}.` : `${slotCap(s)} Art-directed slot: the shot, the crop and the light.`;
    return `<li class="tb-shot tb-shot--${i % 3}">${i ? ph() : ''}<div class="tb-shot__s">${sn(i + 1, 2, 'tb-sn--big')}<p class="tb-cap">${cap}</p>${f ? `<span class="tb-dls">${dl(f, 'photo ' + (s.caption || s.id))}</span>` : ''}</div>${pv()}<div class="tb-shot__f">${ctx.photo(s.id, { cls: 'tb-ph', pos: '50% 50%' })}</div></li>`;
  };
  const main = `
${ff(dir.map(([k, v]) => [k, A(v)]), 'tb-ff--dir')}
<ol class="tb-shots">${shots.map(shot).join('')}</ol>
<div class="tb-block">${sub('Rules')}${doRows(B.imagery.rules)}</div>`;
  return sec('imagery', 6, 'Imagery', A(D.subject), main, { cls: 'tb-night' });
}

function layout(ctx) {
  const G = ctx.gridMeasures, B = ctx.brand;
  const m = (G.margin / G.page.w) * 100, inner = G.page.w - 2 * G.margin, gap = (G.gutter / inner) * 100;
  const cols = Array.from({ length: G.columns }, () => '<i></i>').join('');
  const col = (Math.round(G.col * 10) / 10).toString();
  const radii = ctx.radii.filter((r) => r.px < 9999);
  const meas = ff([['Margin', `${G.margin} px`, 'num'], ['Gutter', `${G.gutter} px`, 'num'], ['Column', `${col} px`, 'num'], ['Base', `${G.base} px`, 'num']], 'tb-ff--meas');
  const main = `
<div class="tb-grid"><div class="tb-page" role="img" aria-label="The page grid: ${G.columns} columns, ${G.margin} pixel margin, ${G.gutter} pixel gutter" style="aspect-ratio:${G.page.w}/${G.page.h};padding:${m.toFixed(3)}%"><div class="tb-page__g" style="column-gap:${gap.toFixed(3)}%;grid-template-columns:repeat(${G.columns},minmax(0,1fr))">${cols}</div></div>${pv()}${meas}</div>
<div class="tb-block">${sub('Spacing')}<ol class="tb-space">${ctx.space.map((s) => `<li><i style="width:${s.px}px;height:${s.px}px"></i><span class="tb-sn num">${s.px}</span></li>`).join('')}</ol></div>
<div class="tb-block">${sub('Corners and edges')}<div class="tb-shape">${radii.map((r) => `<div><i style="border-radius:${r.px}px"></i><span class="tb-cap">${A(r.use)}, ${r.px} px</span></div>`).join('')}</div><p class="tb-body">Edges are ${B.ui.border} px. ${A(B.ui.elevationNote)}</p></div>`;
  return sec('layout', 7, 'Layout', `${G.columns} columns on a ${G.page.w} by ${G.page.h} page, a ${G.margin} px margin and a ${G.gutter} px gutter. Everything sits on a ${G.base} px base.`, main);
}

function applications(ctx) {
  const B = ctx.brand, L = ctx.logo, ap = B.applications, S = B.ui.screen.content, cw = B.logo.colourways;
  const R = ctx.roles.light, N = ctx.roles.dark, onStage = cw['on-stage'] ? 'on-stage' : 'mono-light', os = cw[onStage];
  const night = byRole(ctx, 'ink', 1).hex, stock = byRole(ctx, 'ground', 3).hex;
  ctx.pair(R.surface, night, { size: 13, what: 'book card front' }); ctx.pair(N.quiet, night, { size: 12, what: 'book card line' });
  // a logo on Night takes the on-stage colourway: Stock name, Door red repeat mark
  const onNight = (id, width, label = 'Logo') => L.html(id, { width, colourway: onStage, color: os.name, label });
  const front = `<div class="tb-card tb-card--front ph-tight" style="background:${night};color:${R.surface}"><div class="tb-card__logo">${onNight('colour', fit(ctx, 'colour', 200, 80), 'Your logo goes here')}</div><p class="tb-card__line" style="color:${N.quiet}">${A(B.lines.primary)}</p></div>`;
  const back = `<div class="tb-card tb-card--back tb-edge ph-tight" style="background:${stock};color:${R.text}"><div class="tb-card__mark">${L.html('symbol', { width: fit(ctx, 'symbol', 40, 46), label: 'Logo' })}</div><div class="tb-card__who"><p class="nm tb-disp">${A(ap.card.person)}</p><p class="rl" style="color:${R.textSoft}">${A(ap.card.role)}</p><p class="ct">${A(ap.card.contact)}<br>${A(ap.site.url)}</p></div></div>`;
  const red = byRole(ctx, 'action').hex, redInk = ink(ctx, red, 'social post'), stageG = os.ground;
  ctx.pair(os.name, stageG, { size: 24, what: 'book story post' });
  const social = `<div class="tb-posts">
<div class="tb-post tb-post--sq ph-tight" style="background:${red};color:${redInk}"><p class="tb-disp">${A(ap.social[0])}</p><span class="tb-post__lg">${L.html('reversed', { width: 96, label: 'Logo' })}</span></div>
<div class="tb-post tb-post--pt tb-edge ph-tight" style="background:${cw.colour.ground};color:${cw.colour.name}"><p class="tb-disp">${A(ap.social[1])}</p><span class="tb-post__lg">${L.html('colour', { width: 96, color: cw.colour.name, label: 'Logo' })}</span></div>
<div class="tb-post tb-post--st ph-tight" style="background:${stageG};color:${os.name}"><p class="tb-disp">${A(ap.social[2])}</p><span class="tb-post__lg">${L.html('colour', { width: 72, colourway: onStage, color: os.name, label: 'Logo' })}</span></div>
</div>`;
  // the street poster, drawn: Night, the line as big as it goes, the night's two times and the venue from the product's own copy, the logo
  ctx.pair(N.textSoft, night, { size: 12, what: 'book poster facts' });
  const sign = `<div class="tb-poster" style="background:${night};color:${R.surface}"><p class="tb-disp tb-poster__h">${A(B.lines.primary)}</p><ul class="tb-poster__f" style="color:${N.textSoft}"><li>${A(S.from)}</li><li>${A(S.to)}</li><li>${A(S.deliverTo)}</li></ul><div class="tb-poster__logo">${onNight('colour', 220)}</div></div>`;
  const email = `<div class="tb-email tb-edge" style="background:${R.raised};color:${R.text}"><p class="tb-email__n">${A(ap.email.person)}</p><p class="tb-email__r" style="color:${R.textSoft}">${A(ap.email.role)}, ${A(B.name)}</p><p class="tb-email__c">${A(ap.card.contact)}<br>${A(ap.site.url)}</p><div class="tb-email__l" style="border-color:${R.divider}">${L.html('horizontal', { width: 168, color: R.text, colourway: 'mono-dark', label: 'Logo' })}</div></div>`;
  const rows = S.deliveries.slice(0, 3);
  const screen = `<div class="tb-device"><div class="ui tb-screen" role="img" aria-label="${A(B.name)} product screen: ${A(B.ui.screen.title)}. ${A(S.eta)}. ${A(S.rider)}, ${A(S.riderNote)}." inert>
<div class="tb-scr__top"><span class="ui-num tb-scr__time">${A(S.time)}</span>${ctx.ui.statusChip('doors-open')}</div>
<p class="ui-display tb-scr__eta">${A(S.eta)}</p><p class="tb-scr__note">${A(S.pickup)}</p>
<div class="ui-progress"><div class="ui-progress__bar"><i style="width:${S.progress * 100}%"></i></div><span class="ui-progress__dot" style="left:${S.progress * 100}%"></span></div>
<div class="tb-scr__ft"><span>${A(S.from)}</span><span>${A(S.to)}</span></div>
<ul class="ui-list">${ctx.ui.row({ lead: `<span class="ui-avatar">${A(S.initials)}</span>`, title: S.rider, sub: S.riderNote, endHtml: ctx.ui.btn(S.call, { variant: 'secondary', size: 'sm', iconLeft: 'clock' }) })}</ul>
<ul class="ui-list">${rows.map((d) => ctx.ui.row({ lead: ctx.ui.icon('ticket', 18), title: d.to, sub: d.when, end: d.price, chip: ctx.ui.statusChip(d.status) })).join('')}</ul>
</div></div>`;
  // each piece: its serial and name in the stub face over the work, a note under it; pieces sit in rows split by perforations
  const piece = (n, title, note, body, cls = '') => `<figure class="tb-ap ${cls}"><figcaption class="tb-ap__h">${sn(n, 2)}<b class="tb-sl tb-ap__t">${A(title)}</b></figcaption><div class="tb-ap__w">${body}</div>${note ? `<p class="tb-cap">${note}</p>` : ''}</figure>`;
  const main = `
<div class="tb-aprow tb-aprow--1">${piece(1, 'Street poster', A(ap.signage), sign, 'tb-ap--poster')}${pv()}${piece(2, 'Product screen', '', screen, 'tb-ap--screen')}</div>
${ph('tb-aptear')}
<div class="tb-aprow">${piece(3, 'Social', 'Square, portrait and story, each with one line of the brand.', social, 'tb-ap--social')}</div>
${ph('tb-aptear')}
<div class="tb-aprow tb-aprow--3">${piece(4, 'Business card', '90 by 55 mm, front and back.', `<div class="tb-cards">${front}${back}</div>`, 'tb-ap--card')}${pv()}${piece(5, 'Email signature', '', email, 'tb-ap--email')}</div>`;
  return sec('applications', 8, 'Applications', 'The brand at work: a street, the product itself, a feed, a card and an inbox.', main);
}

function downloads(ctx) {
  const D = ctx.book, L = ctx.logo, slot = ctx.edition === 'slot';
  let no = 0;
  // the stub book: each folder a pad, each file a stub torn from it with its serial, name, format and size; the tear-off is the link
  const file = (f, note = '') => `<li class="tb-file">${ph()}<div class="tb-file__b">${sn(++no)}<span class="tb-file__n tb-mono">${A(f.name)}</span><span class="tb-cap">${note ? A(note) + '. ' : ''}${A(f.ext)}, ${A(f.sizeText)}</span></div>${pv()}<a class="tb-file__s" href="${A(f.href)}" download aria-label="Download ${A(f.name)}"><span>Download</span></a></li>`;
  const pad = (title, what, inner) => `<div class="tb-pad"><div class="tb-pad__h">${sub(title)}<p class="tb-cap">${A(what)}</p></div><div class="tb-pad__set">${inner}</div></div>`;
  const logoRows = slot
    ? `<ul class="tb-files">${D.logoFiles.map((f) => file(f)).join('')}</ul>`
    : `<ul class="tb-files">${L.versions.map((id) => {
      const f = D.logo(id), sizes = f.png.map((p) => `<a class="tb-dl" href="${A(p.href)}" download aria-label="Download ${A(L.labels[id])} logo, PNG, ${p.w} px wide, ${A(p.sizeText)}">${p.w}</a>`).join('');
      return `<li class="tb-file tb-file--logo">${ph()}<div class="tb-file__b">${sn(++no)}<span class="tb-file__n">${A(L.labels[id])}</span><span class="tb-cap">SVG, PDF and PNG</span></div>${pv()}<div class="tb-file__s tb-file__s--set"><span class="tb-dls">${dl(f.svg, L.labels[id] + ' logo')}${dl(f.pdf, L.labels[id] + ' logo')}</span><span class="tb-dls" role="group" aria-label="PNG widths in pixels"><span class="tb-cap">PNG</span>${sizes}</span></div></li>`;
    }).join('')}</ul>`;
  const icons = `<ul class="tb-icons">${D.icons.map((f) => `<li><a class="tb-icon" href="${A(f.href)}" download aria-label="Download ${A(f.name)} icon, SVG">${ctx.ui.icon(f.name.replace('.svg', ''), 24)}<span>${A(f.name.replace('.svg', ''))}</span></a></li>`).join('')}</ul><ul class="tb-files">${file(D.iconsLicence, 'Licence')}</ul>`;
  const photos = D.imagery.filter((f) => f.rel.startsWith('05 Imagery/photos/'));
  const pdfs = D.imagery.filter((f) => f.ext === 'PDF');
  // the zip is the one whole ticket here: the kit on the body, the stub the download
  const zip = `<div class="tb-zip"><div class="tb-zip__b">${sn(0)}<p class="tb-zip__n tb-mono">${A(D.zip.name)}</p><p class="tb-zip__c">Every folder below. ${A(D.zip.sizeText)}.</p></div><a class="tb-zip__s" href="${A(D.zip.href)}" download aria-label="Download ${A(D.zip.name)}, ${A(D.zip.sizeText)}">${pv('tb-pv--hole')}${ph('tb-ph--hole')}<span>Download the kit</span></a></div>`;
  const main = `${zip}
${pad('Read me', 'Start here: what is in the kit and how to use it.', `<ul class="tb-files">${[D.readmePdf, D.readme].filter(Boolean).map((f) => file(f)).join('')}</ul>`)}
${pad('Logo', slot ? 'The labelled slot frame, and where the approved files go.' : 'Each version as SVG and PDF, and as PNG at three widths, transparent.', logoRows)}
${pad('Colour', 'The palette for Adobe, CSS and JSON, and a swatch sheet.', `<ul class="tb-files">${D.colour.map((f) => file(f)).join('')}</ul>`)}
${pad('Type', 'The specimen sheet, and the faces with their links and licence.', `<ul class="tb-files">${D.type.map((f) => file(f)).join('')}</ul>`)}
${pad('Icons', `${D.icons.length} interface icons, drawn in the brand's stroke.`, icons)}
${pad('Imagery', photos.length ? 'The photography direction, and the photos.' : 'The photography direction and shot list.', `<ul class="tb-files">${[...pdfs, ...photos].map((f) => file(f)).join('')}</ul>`)}`;
  return sec('downloads', 9, 'Downloads', 'Everything in the brand kit, folder by folder. The zip holds all of it.', main);
}

export function brandBook(ctx) {
  if (!ctx.book) throw new Error('brandBook needs ctx.book (set by the engine book builder)');
  return [overview, voice, logo, colour, typography, imagery, layout, applications, downloads].map((f) => f(ctx)).join('\n');
}
