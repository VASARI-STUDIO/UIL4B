// Brand book markup for theme 04 (Standards): nine sections, each a ruled page of the manual: a running head, a title column
// of numbered clauses, and the work to its right. Every size is given in x, the stroke of the wake.
// The engine wraps these in the shell (skip link, section nav, light and dark switch) and adds the behaviour.
// Copy, the type tester and the downloads read data attributes the engine script understands: data-copy, data-tester-*.
import { A } from './helpers.js';

const rgbOf = (ctx, hex) => { const [r, g, b] = ctx.C.hexToRgb(hex); return `rgb(${r}, ${g}, ${b})`; };
// the readable text colour on a brand colour: the better of the light-mode text and surface colours, checked
const onColour = (ctx, hex) => {
  const L = ctx.roles.light, pick = ctx.ratio(L.text, hex) >= ctx.ratio(L.surface, hex) ? L.text : L.surface;
  ctx.pair(pick, hex, { size: 13, what: `book swatch ${hex}` }); return pick;
};
// a swatch that sits on the ground (Deck, White) needs a hairline to be seen
const hairlineOn = (ctx, hex) => [ctx.roles.light.surface, ctx.roles.light.raised].some((h) => h.toLowerCase() === hex.toLowerCase());

// a copy button: visible text is the action, the accessible name says what it copies
const copyBtn = (text, value, what, cls = '', verb = text) => `<button type="button" class="bk-btn ${cls}" data-copy="${A(value)}" data-copy-label="${A(what)}" aria-label="${A(verb + ' ' + what)}"><span class="bk-btn__t">${A(text)}</span></button>`;
// x on screen: the layout's base unit, in px
const xPx = (ctx) => ctx.gridMeasures.base;
const sub = (t) => `<h3 class="bk-h3">${A(t)}</h3>`;
const dl = (f, label) => (f ? `<a class="bk-dl" href="${A(f.href)}" download aria-label="Download ${A(label)}, ${A(f.ext)}, ${A(f.sizeText)}">${A(f.ext)}</a>` : '');
// a logo that scales with its box: width is a cap in px, the svg fills the wrapper and keeps its proportion
const fluid = (ctx, id, w, opts = {}) => {
  const g = ctx.logo.geos[id];
  return `<div class="bk-fluid" style="width:min(100%,${w}px);aspect-ratio:${g.w.toFixed(2)}/${g.h.toFixed(2)}">${ctx.logo.html(id, { width: w, ...opts })}</div>`;
};

// one page of the manual. clauses are numbered n.1, n.2 ...; the work sits to the right of the title column.
function page(ctx, n, id, title, lead, clauses, work, cls = '', heading = 'h2') {
  const B = ctx.brand;
  const cl = clauses.length ? `<ol class="bk-cl">${clauses.map((t, i) => `<li><span class="num">${n}.${i + 1}</span><div>${t}</div></li>`).join('')}</ol>` : '';
  return `<section class="bk-sec ${cls}" id="${id}" aria-labelledby="h-${id}">
<div class="bk-rh"><span>${A(B.name)} graphic standards</span><span>${n} ${A(title)}</span><span>${A(ctx.versionLine)}</span></div>
<div class="bk-std"><div class="bk-tc"><${heading} class="bk-title" id="h-${id}">${A(title)}</${heading}><p class="bk-tlead">${lead}</p>${cl}</div>
<div class="bk-work">${work}</div></div></section>`;
}
const term = (t) => `<span class="bk-term">${A(t)}</span>`;

function overview(ctx) {
  const B = ctx.brand, cw = B.logo.colourways['on-buoy'];
  const clauses = B.personality.map((p) => `${term(p.trait)} ${A(p.means)}`);
  const work = `<div class="bk-buoy" style="background:${cw.ground};color:${cw.name}"><span class="bk-buoy__k">${A(B.name)}</span>${fluid(ctx, 'colour', 360, { colourway: 'on-buoy', color: cw.name, label: 'Your logo goes here' })}</div>
<div class="bk-hero"><h1 class="disp" id="h-overview-line">${A(B.lines.primary)}</h1><p class="bk-measure bk-x">Every size in this manual is given in x, the stroke of the wake.</p></div>
<div class="bk-two bk-two--even"><div>${sub('What it does')}<p class="bk-body">${A(B.product)}</p></div><div>${sub('Who it serves')}<p class="bk-body">${A(B.audience)}</p></div></div>`;
  return page(ctx, 1, 'overview', 'Overview', A(B.description), clauses, work, 'bk-sec--overview');
}

function voice(ctx) {
  const B = ctx.brand, V = B.voice, lines = [B.lines.primary, ...B.lines.others];
  const clauses = V.principles.map((p) => A(p.title));
  const work = `<ol class="bk-principles">${V.principles.map((p, i) => `<li><span class="num">2.${i + 1}</span><p class="disp bk-pe">${A(p.example)}</p></li>`).join('')}</ol>
<div class="bk-block">${sub('Lines in use')}<ul class="bk-lines">${lines.map((l) => `<li class="disp">${A(l)}</li>`).join('')}</ul></div>
<div class="bk-block">${sub('Write this, not that')}
<div class="bk-wtn" role="table" aria-label="Write this, not that">
<div class="bk-wtn__h" role="row"><span role="columnheader">Write this</span><span role="columnheader">Not that</span><span role="columnheader">Because</span></div>
${V.writeThis.map((r) => `<div class="bk-wtn__r" role="row"><p role="cell" class="w">${A(r.write)}</p><p role="cell" class="n">${A(r.not)}</p><p role="cell" class="b">${A(r.because)}</p></div>`).join('')}
</div></div>
<div class="bk-block bk-two bk-two--even">
<div>${sub('The brand in 25 words')}<p class="bk-body">${A(V.boilerplate25)}</p>${copyBtn('Copy text', V.boilerplate25, '25-word boilerplate')}</div>
<div>${sub('The brand in 50 words')}<p class="bk-body">${A(V.boilerplate50)}</p>${copyBtn('Copy text', V.boilerplate50, '50-word boilerplate')}</div>
</div>
<div class="bk-block">${sub('Writing the name')}<p class="bk-body bk-measure">${A(V.nameRules)}</p></div>`;
  return page(ctx, 2, 'voice', 'Voice', 'Four rules for how we write, each with a line from the brand.', clauses, work, 'bk-sec--voice');
}

function logo(ctx) {
  const B = ctx.brand, L = ctx.logo, cw = B.logo.colourways, slot = ctx.edition === 'slot', g = L.geo, ms = L.minSize;
  // clear space: 4x on four sides, drawn on the x grid. The sheet is sized from the logo's own proportions so it is exact at any width.
  const u = g.unit, xs = g.x || u / 4, n = Math.round(u / xs), W = g.width + 2 * u, H = g.height + 2 * u;
  const pctX = (u / W) * 100, pctY = (u / H) * 100;
  const gridPath = (() => { const d = []; for (let i = 1; i * xs < W - 0.01; i++) d.push(`M${(i * xs).toFixed(2)} 0V${H.toFixed(2)}`); for (let j = 1; j * xs < H - 0.01; j++) d.push(`M0 ${(j * xs).toFixed(2)}H${W.toFixed(2)}`); return d.join(''); })();
  const sheet = `<div class="bk-clear" role="img" aria-label="Construction: the logo on a grid of x, with ${n}x clear on every side" style="aspect-ratio:${W.toFixed(2)}/${H.toFixed(2)}">
<svg class="bk-clear__grid" viewBox="0 0 ${W.toFixed(2)} ${H.toFixed(2)}" preserveAspectRatio="none" aria-hidden="true"><path class="g" d="${gridPath}"/><rect class="k" x="0" y="0" width="${xs.toFixed(2)}" height="${xs.toFixed(2)}"/><rect class="z" x="${u.toFixed(2)}" y="${u.toFixed(2)}" width="${g.width.toFixed(2)}" height="${g.height.toFixed(2)}"/></svg>
<div class="bk-clear__logo" style="left:${pctX.toFixed(3)}%;right:${pctX.toFixed(3)}%;top:${pctY.toFixed(3)}%;bottom:${pctY.toFixed(3)}%">${L.html('colour', { width: 320, label: 'Logo' })}</div>
<span class="bk-dv" style="left:50%;top:0;height:${pctY.toFixed(3)}%"><i>${n}x</i></span><span class="bk-dv" style="left:50%;bottom:0;height:${pctY.toFixed(3)}%"><i>${n}x</i></span>
<span class="bk-dhz" style="top:50%;left:0;width:${pctX.toFixed(3)}%"><i>${n}x</i></span><span class="bk-dhz" style="top:50%;right:0;width:${pctX.toFixed(3)}%"><i>${n}x</i></span></div>`;
  const xr = xs / g.width, mmPx = Math.round((ms.printMm * 96) / 25.4);
  const px1 = (v) => (Math.round(v * 10) / 10).toString();
  const keys = `<dl class="bk-keys"><div><dt>Unit</dt><dd>x is the stroke of the wake</dd></div><div><dt>Clear space</dt><dd class="num">${n}x on every side</dd></div><div><dt>Cap height</dt><dd class="num">${Math.round((g.cap || 10 * xs) / xs)}x</dd></div><div><dt>Height</dt><dd class="num">${Math.round(g.height / xs)}x</dd></div></dl>`;
  const clauses = [...B.logo.idea.split(/(?<=\.)\s+/).map((s) => A(s)), slot ? 'Set the smallest size once the logo is in place.' : `The smallest size is ${ms.screenPx} px wide on screen and ${ms.printMm} mm in print.`, `Keep ${n}x clear on every side.`];
  // the seven versions, each a numbered clause in a strict two-column grid
  const cells = [['colour', 300], ['mono-dark', 180], ['mono-light', 180], ['reversed', 180], ['symbol', 64], ['horizontal', 300], ['stacked', 104]];
  const k0 = clauses.length;
  const ver = ([id, w], i) => {
    const c = cw[L.colourwayOf(id)], files = ctx.book.logo(id), name = `${L.labels[id]} logo`;
    const links = slot ? '' : `<span class="bk-dls">${dl(files.svg, name)}${dl(files.png.find((p) => p.w === 1024), name + ', 1024 px wide')}</span>`;
    return `<li class="bk-ver"><p class="bk-ver__h"><span class="num">3.${k0 + i + 1}</span><b>${A(L.labels[id])}</b></p><div class="bk-ground${hairlineOn(ctx, c.ground) ? ' is-hair' : ''}" style="background:${c.ground}">${fluid(ctx, id, w, { color: c.name, label: L.labels[id] })}</div><div class="bk-capt"><span>${A(B.logo.when[id])}</span>${links}</div></li>`;
  };
  const minBlock = slot
    ? `<p class="bk-body">Set the smallest size once the logo is in place. Below that size the name and the wake stop reading as one mark.</p>`
    : `<div class="bk-min"><div class="bk-min__item"><div class="bk-min__logo" style="width:${ms.screenPx}px">${L.html('colour', { width: ms.screenPx })}</div><div class="bk-dh" style="width:${ms.screenPx}px"><i>${ms.screenPx} px</i></div><p class="bk-cap">On screen. x is ${px1(ms.screenPx * xr)} px.</p></div><div class="bk-min__item"><div class="bk-min__logo" style="width:${mmPx}px">${L.html('colour', { width: mmPx })}</div><div class="bk-dh" style="width:${mmPx}px"><i>${ms.printMm} mm</i></div><p class="bk-cap">In print. x is ${(Math.round(ms.printMm * xr * 100) / 100).toString()} mm.</p></div></div>`;
  // the don'ts, each a specimen crossed through
  const wrong = (ctx.colours.find((c) => c.role === 'action') || ctx.colours[2]).hex, hull = ctx.roles.light.text, cs = ctx.colours.map((c) => c.hex);
  const bands = [[0, 70, 0], [40, 40, 2], [95, 55, 3], [140, 30, 1], [180, 60, 2], [-20, 28, 4], [60, 22, 1]].map(([y, h, c], i) => `<rect x="-60" y="${y}" width="400" height="${h}" fill="${cs[c % cs.length]}" transform="rotate(${i % 2 ? -14 : 11} 100 100)"/>`).join('');
  const busy = `<svg class="bk-busy" viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${bands}</svg><span class="bk-onbusy${slot ? ' is-plate' : ''}">${L.forMisuse(112, { fill: hull })}</span>`;
  const specs = [
    `<div style="transform:scale(1.25,0.6)">${L.forMisuse(104)}</div>`,
    L.forMisuse(112, { fill: wrong }),
    `<div style="transform:rotate(-14deg)">${L.forMisuse(112)}</div>`,
    `<div style="filter:drop-shadow(4px 5px 0 ${ctx.roles.light.quiet})">${L.forMisuse(112)}</div>`,
    busy,
    `<div class="bk-wakeonly">${L.forMisuse(220)}</div>`,
  ];
  const misuse = ['Do not stretch, squash or skew it.', 'Do not recolour it outside the versions above.', 'Do not rotate it.', 'Do not add shadows, glows or other effects.', 'Do not set it on a busy part of a photo.', 'Do not draw the wake without the name.'];
  const CROSS = `<svg class="bk-cross" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M0 0L100 100M100 0L0 100"/></svg>`;
  const k1 = k0 + cells.length + 1;
  const never = `<ol class="bk-never">${misuse.map((m, i) => `<li><div class="bk-mt${i === 4 ? ' is-busy' : ''}">${specs[i]}${CROSS}</div><p><span class="num">3.${k1 + i}</span>${A(m)}</p></li>`).join('')}</ol>`;
  const dlSlot = slot ? `<p class="bk-body bk-measure bk-block">This book has no logo files yet. The frames above hold the place and the proportion. The brand kit's logo folder says where the approved files go.</p>` : '';
  const work = `${sub('Construction')}${sheet}${keys}<p class="bk-cap bk-clear__n">The filled square is 1x. Clear space is ${n}x, measured from the edge of the name and the wake.</p>
<div class="bk-block">${sub('Versions')}<ol class="bk-vers">${cells.map(ver).join('')}</ol>${dlSlot}</div>
<div class="bk-block">${sub('Smallest size')}${minBlock}</div>
<div class="bk-block">${sub('Never')}${never}</div>`;
  return page(ctx, 3, 'logo', 'Logo', 'Seven versions of one mark. Pick by the ground it sits on.', clauses, work, 'bk-sec--logo');
}

function colour(ctx) {
  const B = ctx.brand, x = xPx(ctx), L = ctx.roles.light;
  const steps = Object.keys(ctx.colours[0].ramp);
  const nC = ctx.colours.length, nT = ctx.tones.length;
  // the tint table: ten strips with their step numbers; the step that is the colour itself is marked by a bar
  const tint = (c) => (c.rampBase === 50
    ? `<p class="bk-tint bk-tint--none bk-cap">The ground. No tints.</p>`
    : `<div class="bk-tint" role="img" aria-label="${A(c.name)} tint ramp, steps ${steps[0]} to ${steps.at(-1)}. Step ${c.rampBase} is the colour itself.">${steps.map((k) => `<span class="bk-t${+k === c.rampBase ? ' is-base' : ''}"><i class="${ctx.ratio(c.ramp[k], L.surface) < 1.25 ? 'is-hair' : ''}" style="background:${c.ramp[k]}"></i><em class="num">${k}</em></span>`).join('')}</div>`);
  const spec = (c, num) => {
    const rgb = rgbOf(ctx, c.hex), ok = c.oklch || ctx.C.oklchString(c.hex);
    return `<div class="bk-spec"><p class="bk-cnum num">${num}</p><p class="bk-cname">${A(c.name)}</p><p class="bk-clands">${A(c.lands)}</p><dl class="bk-vals"><div><dt>HEX</dt><dd>${c.hex}</dd></div><div><dt>RGB</dt><dd>${rgb}</dd></div><div><dt>OKLCH</dt><dd>${ok}</dd></div></dl><div class="bk-copies"><span class="bk-cap">Copy</span>${copyBtn('HEX', c.hex, `${c.name} HEX`, '', 'Copy HEX')}${copyBtn('RGB', rgb, `${c.name} RGB`, '', 'Copy RGB')}${copyBtn('OKLCH', ok, `${c.name} OKLCH`, '', 'Copy OKLCH')}</div></div>`;
  };
  // a colour: its chip (a button that copies the HEX), the tint table under it, the spec block under that
  const cell = (c, i) => {
    const fg = onColour(ctx, c.hex), sh = Math.round(c.share * 100);
    const chip = `<button type="button" class="bk-sw${hairlineOn(ctx, c.hex) ? ' is-hair' : ''}" style="background:${c.hex};color:${fg}" data-copy="${c.hex}" data-copy-label="${A(c.name)} HEX ${c.hex}" aria-label="Copy HEX ${A(c.hex)}, ${A(c.name)}"><span class="bk-sw__no num">4.${i + 1}</span><span class="bk-sw__share disp">${sh}%</span></button>`;
    return `<li class="bk-crow">${chip}${tint(c)}${spec(c, `4.${i + 1}`)}</li>`;
  };
  const toneCell = (c, i) => `<li class="bk-crow bk-crow--tone"><span class="bk-chip${hairlineOn(ctx, c.hex) ? ' is-hair' : ''}" style="background:${c.hex}" aria-hidden="true"></span>${spec(c, `4.${nC + i + 1}`)}</li>`;
  // contrast: one clause per pair, the pair set as a sample at its smallest size, the size given in x
  const sampleP = B.type.sample, k0 = nC + nT;
  const mult = (v) => `${Math.round((v / x) * 10) / 10}x`;
  const pair = (p, i) => {
    const min = p.large ? 24 : 15;
    const note = p.large ? `Large type only: ${min} px and over, ${mult(min)}.` : `Any size. Set here at ${min} px, ${mult(min)}.`;
    return `<li class="bk-pair${p.large ? ' is-large' : ''}"><span class="bk-pair__c num">4.${k0 + i + 1}</span><p class="bk-pair__s${hairlineOn(ctx, p.bgHex) ? ' is-hair' : ''}${p.large ? ' disp' : ''}" style="background:${p.bgHex};color:${p.fgHex};font-size:${min}px">${A(p.large ? sampleP.headline : sampleP.caption)}</p><div class="bk-pair__i"><span class="bk-pair__r disp">${A(p.ratioText)} : 1</span><span class="bk-pair__u">${A(p.use)}</span><span class="bk-pair__n">${note}</span></div></li>`;
  };
  const roleKeys = [['surface', 'Surface'], ['raised', 'Raised'], ['text', 'Text'], ['quiet', 'Quiet text'], ['border', 'Border'], ['action', 'Action'], ['actionLabel', 'Action label'], ['focus', 'Focus']];
  const toneKeys = [['success', 'Success'], ['warning', 'Warning'], ['danger', 'Danger'], ['info', 'Info']];
  const roles = (mode) => {
    const r = ctx.roles[mode];
    const items = [...roleKeys.map(([k, n]) => [n, r[k]]), ...toneKeys.map(([k, n]) => [n, r[k].fg])];
    return `<ul class="bk-roles bk-for-${mode}">${items.map(([n, hx]) => `<li><button type="button" class="bk-role" data-copy="${hx}" data-copy-label="${mode} ${A(n)} HEX ${hx}" aria-label="Copy HEX ${A(hx)}, ${mode} ${A(n)}"><span class="bk-role__sw${hairlineOn(ctx, hx) ? ' is-hair' : ''}" style="background:${hx}" aria-hidden="true"></span><span class="bk-role__n">${A(n)}</span><span class="bk-role__h">${hx}</span></button></li>`).join('')}</ul>`;
  };
  const clauses = ctx.colours.map((c) => `${term(c.name)} ${A(c.lands)}`);
  const key = `<li class="bk-key"><p class="bk-cnum">Key</p><dl><div><dt>Chip</dt><dd>Click it to copy the HEX.</dd></div><div><dt>Figure</dt><dd>The share of a page the colour takes.</dd></div><div><dt>Tint table</dt><dd>Steps ${steps[0]} to ${steps.at(-1)}. The bar marks the colour itself.</dd></div></dl></li>`;
  const work = `<ol class="bk-chips">${ctx.colours.map(cell).join('')}${key}</ol>
<div class="bk-block">${sub('Text tones')}<ol class="bk-chips bk-chips--tones">${ctx.tones.map(toneCell).join('')}</ol></div>
<div class="bk-block">${sub('Contrast, pair by pair')}<p class="bk-body bk-measure">Every text pair ${A(B.name)} uses, with its WCAG ratio. Text needs 4.5 : 1. Type at 24 px and over needs 3 : 1. Sizes are given in x, which is ${x} px on screen.</p><ol class="bk-pairs">${ctx.pairs.map(pair).join('')}</ol></div>
<div class="bk-block">${sub('Interface roles')}<p class="bk-body bk-measure">The same roles in the light and dark previews. Use the switch to see the other set.</p>${roles('light')}${roles('dark')}</div>`;
  return page(ctx, 4, 'colour', 'Colour', 'Five colours and two tones. Deck and Hull do most of the work.', clauses, work, 'bk-sec--colour');
}

function typography(ctx) {
  const B = ctx.brand, F = B.fonts, T = B.type, x = xPx(ctx), alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789';
  const wlist = (f) => f.weights.join(', ');
  const px1 = (v) => (Math.round(v * 10) / 10).toString();
  const xs = (px) => `${px1(px / x)}x`;
  // live text with its cap-height and x-height drawn: guide lines across and a two-bracket ruler beside, all in em of the text itself
  const guided = (m, line, size, text, st, cls = '') => {
    const base = (line - (m.asc + m.desc)) / 2 + m.asc, em = (v) => `${v.toFixed(4)}em`;
    const ln = (k, v) => `<i class="bk-g bk-g--${k}" style="top:${em(v)}"></i>`;
    const br = (k, h) => `<i class="bk-rl bk-rl--${k}" style="top:${em(base - h)};height:${em(h)}"></i>`;
    return `<p class="bk-gt ${cls}" style="font-size:min(${size}px,13vw);line-height:${line};${st}">${ln('base', base)}${size >= 30 ? ln('x', base - m.xh) + ln('cap', base - m.cap) : ''}${br('cap', m.cap)}${br('x', m.xh)}${A(text)}</p>`;
  };
  const fm = (face, weight) => {
    const f = ctx.loadFont(`${F[face].file}-${weight}`), u = f.unitsPerEm, o = f.tables.os2, h = f.tables.hhea, typo = o && (o.fsSelection & 128), top = (c) => f.charToGlyph(c).getBoundingBox().y2 / u;
    return { asc: (typo ? o.sTypoAscender : h.ascender) / u, desc: -(typo ? o.sTypoDescender : h.descender) / u, cap: top('H'), xh: top('x') };
  };
  const spec = (m, size) => `<p class="bk-cap num">Cap height ${px1(m.cap * size)} px, ${xs(m.cap * size)}<br>x-height ${px1(m.xh * size)} px, ${xs(m.xh * size)}</p>`;
  const k0 = T.rules.length;
  const faceRow = (face, cls, f, note, weight, style, i) => {
    const m = fm(face, weight), size = 168;
    return `<li class="bk-ty"><span class="num bk-ty__n">5.${k0 + i + 1}</span><div class="bk-ty__m"><p class="bk-ty__t">${A(f.family)}</p><p class="bk-cap">${note} Weights ${wlist(f)}.</p>${spec(m, size)}</div><div class="bk-ty__s">${guided(m, 1, size, 'Aa', style, 'bk-aa ' + cls)}<p class="bk-face__al" style="${style}">${alpha}</p></div></li>`;
  };
  const faces = `<ol class="bk-tys">${faceRow('display', 'disp', F.display, 'For times and headlines, one or two lines at a time.', 700, 'font-family:var(--display);font-weight:700', 0)}${faceRow('body', '', F.body, 'For reading text, labels and captions.', 500, 'font-family:var(--body);font-weight:500', 1)}</ol>`;
  const scaleRows = T.scale.map((s, i) => {
    const fam = s.face === 'display' ? 'var(--display)' : 'var(--body)', m = fm(s.face, s.weight);
    return `<li class="bk-ty bk-scale"><span class="num bk-ty__n">5.${k0 + 3 + i}</span><div class="bk-ty__m"><p class="bk-scale__t">${A(ctx.cap(s.token))}</p><p class="bk-cap num">${s.size} px, ${xs(s.size)}, line ${s.line}, weight ${s.weight}</p>${spec(m, s.size)}<p class="bk-cap">${A(s.use)}</p></div><div class="bk-ty__s">${guided(m, s.line, s.size, T.sample.headline, `font-family:${fam};font-weight:${s.weight}`, 'bk-scale__s' + (s.face === 'display' ? ' disp' : ''))}</div></li>`;
  }).join('');
  const clauses = T.rules.map((r) => A(r.do));
  const donts = `<ol class="bk-donts">${T.rules.map((r, i) => `<li><span class="num">5.${i + 1}</span><p>${A(r.dont)}</p></li>`).join('')}</ol>`;
  const work = `<p class="bk-cap bk-sheetn">Every style is drawn on its own guides: the solid line is the baseline, the dashed lines are the x-height and the cap height. Sizes are given in x, which is ${x} px on screen.</p>
${sub('Faces')}${faces}
<p class="bk-cap bk-measure bk-faces__n">${A(F.mono.family)} is for a hex, a token or a code string only. All three faces are open licence (SIL OFL 1.1), free for commercial use.</p>
<div class="bk-block">${sub('Scale')}<ol class="bk-tys">${scaleRows}</ol></div>
<div class="bk-block bk-tester" data-tester>
${sub('Try it')}
<div class="bk-tester__c"><div class="bk-field"><label for="tester-text">Your line</label><input id="tester-text" type="text" value="${A(T.sample.headline)}" data-tester-text data-default="${A(T.sample.headline)}" autocomplete="off" spellcheck="false"></div>
<div class="bk-field"><label for="tester-size">Size <output for="tester-size" data-tester-value class="num">64 px</output></label><input id="tester-size" type="range" min="14" max="120" step="1" value="64" data-tester-size></div></div>
<p class="bk-tester__d disp" data-tester-out aria-hidden="true">${A(T.sample.headline)}</p>
<p class="bk-tester__b" data-tester-out aria-hidden="true">${A(T.sample.headline)}</p>
</div>
<div class="bk-block bk-two"><div>${sub('In use')}<p class="bk-use__h disp">${A(T.sample.headline)}</p><p class="bk-use__p">${A(T.sample.paragraph)}</p><p class="bk-cap">${A(T.sample.caption)}</p></div><div>${sub('Not allowed')}${donts}</div></div>`;
  return page(ctx, 5, 'typography', 'Typography', 'One condensed face for the time, one face for everything you read.', clauses, work, 'bk-sec--type');
}

// No photograph is licensed yet, so every shot is drawn in the manual's line style, one drawing per shot, cropped the way the
// photograph is to be cropped. Lines only, no shading; the clause number in the corner keys it to the rule it must meet.
const WAKE = 'M8 146q10-6 20 0t20 0t20 0t20 0';
const FERRY = `<path class="ln oc" d="M34 112H266L254 138H46Z"/><path class="ln oc" d="M72 112V86H228V112Z"/>${Array.from({ length: 8 }, (_, i) => `<rect class="ln" x="${80 + i * 18.5}" y="92" width="11" height="10"/>`).join('')}<path class="ln oc" d="M126 86V68H174V86Z"/><path class="ln" d="M150 68V52"/>`;
const SHORE = '<path class="sh" d="M0 124C40 118 70 112 110 116S190 110 230 114S280 118 300 116"/>';
const V = {
  // the crossing: a small double-ended river ferry side-on mid-river, the far shore behind, water in the lower third
  crossing: `${SHORE}<path class="wl" d="M0 138H300"/>${FERRY}<path class="wk" d="${WAKE}"/>`,
  // the wharf: the departures sign on its posts, one passenger reading it from behind, cropped at the shoulder
  wharf: `<path class="ln" d="M120 28H284V118H120Z"/><path class="ln" d="M120 52H284M120 74H284M120 96H284M150 118V200M254 118V200"/><path class="wk" d="M132 64H200"/><path class="ln" d="M68 108a22 22 0 1 0 44 0a22 22 0 1 0 -44 0M28 200C28 156 50 140 90 140S152 156 152 200"/>`,
  // the boarding: side-on at knee height, the wharf edge, the gangway over the gap, the hull side, two feet stepping across
  boarding: `<path class="wl" d="M0 176H300"/><path class="ln" d="M0 146H104V200M206 128H300M206 128V176"/><path class="ln" d="M96 146L214 128"/><path class="ln" d="M130 0L128 136M146 0L146 134M118 141H150V133H128M178 0L192 112M194 0L206 108M184 120L214 112L210 104L192 108"/>`,
  // the deck: the rail close, a hand on it, the river going past behind and out of focus
  deck: `<path class="wl" d="M0 168H300M0 186H300"/><path class="ln" d="M0 78H300M0 88H300M0 140H300M40 88V200M250 88V200"/><path class="ln oc" d="M150 72Q148 54 168 52L300 14V60L222 90H150Z"/><path class="ln oc" d="M150 72v24a7 7 0 0 0 14 0v-24M164 72v26a7 7 0 0 0 14 0v-26M178 72v26a7 7 0 0 0 14 0v-26M192 72v22a7 7 0 0 0 14 0v-22"/>`,
  // the wake: from the stern, straight down the middle to the horizon, symmetrical
  wake: `<path class="wl" d="M0 44H300"/><path class="ln" d="M60 200Q150 168 240 200M112 186L150 46L188 186"/><path class="wk" d="M150 182V48"/>`,
  // the far shore: Stockton wharf seen from the water, its shed on piles, the bow in one corner
  stockton: `${SHORE}<path class="wl" d="M0 132H300"/><path class="ln" d="M150 112H246M160 112V132M188 112V132M216 112V132M240 112V132M168 112V92H228V112M162 92L198 78L234 92"/><path class="ln" d="M0 156H74L122 200M0 142H62M20 142V156M44 142V156"/>`,
};
V.ferry = V.crossing; V.plan = V.wharf; V.bow = V.stockton;
const SHOTS = Object.keys(V).slice(0, 6);
// the clause each shot meets (6.1 river and ferry, 6.2 Buoy from the signage, 6.3 passengers from behind)
export const SHOT_KEY = { crossing: 1, wharf: 2, boarding: 3, deck: 3, wake: 1, stockton: 1 };
export const drawKind = (s, i) => (V[s.id] ? s.id : SHOTS[i % SHOTS.length]);
export function drawing(kind, key) {
  const k = key ? `<text x="10" y="20">${A(key)}</text>` : '';
  return `<svg class="bk-draw" viewBox="0 0 300 200" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${k}${V[kind] || V.crossing}</svg>`;
}

function imagery(ctx) {
  const B = ctx.brand, D = B.imagery.direction, shots = B.imagery.shots, nR = B.imagery.rules.length;
  const dirRows = [['Light', D.light], ['Crop', D.crop], ['Colour', D.colour], ['People', D.people]];
  const fig = (s, i) => {
    const real = !!s.photo;
    const f = real ? ctx.book.find(`05 Imagery/photos/${s.photo.split('/').pop()}`) : null;
    const key = `6.${Math.min(SHOT_KEY[s.id] || (i % nR) + 1, nR)}`;
    const cap = real ? `${A(s.caption || s.alt)}. Photo: ${A(s.credit)}.` : `Illustration, keyed to ${key}. To shoot: ${A(s.slot)}`;
    const frame = real ? `<div class="bk-shot__f">${ctx.photo(s.id, { cls: 'bk-ph', pos: '50% 50%' })}</div>` : `<div class="bk-shot__f is-draw" role="img" aria-label="Line drawing standing in for a photograph: ${A(s.slot)}">${drawing(drawKind(s, i), key)}</div>`;
    return `<figure class="bk-shot">${frame}<figcaption class="bk-capt"><span>${cap}</span>${f ? `<span class="bk-dls">${dl(f, 'photo ' + (s.caption || s.id))}</span>` : ''}</figcaption></figure>`;
  };
  const clauses = B.imagery.rules.map((r) => A(r.do));
  const donts = `<ol class="bk-donts">${B.imagery.rules.map((r, i) => `<li><span class="num">6.${i + 1}</span><p>${A(r.dont)}</p></li>`).join('')}</ol>`;
  const work = `<p class="bk-pull">${A(D.subject)}</p>
<dl class="bk-dir">${dirRows.map(([k, v]) => `<div><dt>${k}</dt><dd>${A(v)}</dd></div>`).join('')}</dl>
<div class="bk-block">${sub('Six shots')}<div class="bk-shots">${shots.map(fig).join('')}</div>${shots.some((s) => !s.photo) ? `<p class="bk-body bk-nophoto">No photographs ship with this kit yet. Each frame is a line drawing of what to shoot, keyed to the clause it must meet.</p>` : ''}</div>
<div class="bk-block">${sub('Not allowed')}${donts}</div>`;
  return page(ctx, 6, 'imagery', 'Imagery', 'The crossing as it happens, in real light.', clauses, work, 'bk-sec--imagery');
}

function layout(ctx) {
  const G = ctx.gridMeasures, B = ctx.brand;
  const m = (G.margin / G.page.w) * 100, inner = G.page.w - 2 * G.margin, gap = (G.gutter / inner) * 100;
  const cols = Array.from({ length: G.columns }, () => '<i></i>').join('');
  const col = (Math.round(G.col * 10) / 10).toString();
  const radii = ctx.radii.filter((r) => r.px < 9999);
  const clauses = [`${G.columns} columns on a ${G.page.w} by ${G.page.h} page.`, `A ${G.margin} px margin and a ${G.gutter} px gutter.`, `Everything sits on a ${G.base} px base. On screen, x is ${G.base} px.`, `Edges are ${B.ui.border} px. ${A(B.ui.elevationNote)}`];
  const work = `<div class="bk-gridfig"><div class="bk-page" role="img" aria-label="The page grid: ${G.columns} columns, ${G.margin} pixel margin, ${G.gutter} pixel gutter" style="aspect-ratio:${G.page.w}/${G.page.h};padding:${m.toFixed(3)}%"><div class="bk-page__g" style="column-gap:${gap.toFixed(3)}%;grid-template-columns:repeat(${G.columns},minmax(0,1fr))">${cols}</div></div>
<dl class="bk-meas"><div><dt>Margin</dt><dd class="num">${G.margin} px</dd></div><div><dt>Gutter</dt><dd class="num">${G.gutter} px</dd></div><div><dt>Column</dt><dd class="num">${col} px</dd></div><div><dt>Base</dt><dd class="num">${G.base} px</dd></div></dl></div>
<div class="bk-block bk-two bk-two--even">
<div>${sub('Spacing')}<ul class="bk-space">${ctx.space.map((s) => `<li><i style="width:${s.px}px;height:${s.px}px"></i><span class="bk-cap num">${s.px}</span></li>`).join('')}</ul></div>
<div>${sub('Corners and edges')}<div class="bk-shape">${radii.map((r) => `<div><i style="border-radius:${r.px}px"></i><span class="bk-cap">${A(r.use)}, ${r.px} px</span></div>`).join('')}</div><p class="bk-body">${A(B.ui.elevationNote)}</p></div>
</div>`;
  return page(ctx, 7, 'layout', 'Layout', `Twelve columns, a ${G.base} px base, hairlines and no shadows.`, clauses, work, 'bk-sec--layout');
}

function applications(ctx) {
  const B = ctx.brand, L = ctx.logo, ap = B.applications, S = B.ui.screen.content, cw = B.logo.colourways, rev = cw.reversed, buoy = cw['on-buoy'];
  const R = ctx.roles.light;
  const front = `<div class="bk-card bk-card--front"><div class="bk-card__logo">${fluid(ctx, 'reversed', 150, { color: rev.name, label: 'Your logo goes here' })}</div><p class="bk-card__line disp">${A(B.lines.primary)}</p></div>`;
  const back = `<div class="bk-card bk-card--back"><div class="bk-card__mark">${fluid(ctx, 'symbol', 36, { label: 'Logo' })}</div><div class="bk-card__who"><p class="nm">${A(ap.card.person)}</p><p class="rl">${A(ap.card.role)}</p><p class="ct">${A(ap.card.contact)}<br>${A(ap.site.url)}</p></div></div>`;
  const social = `<div class="bk-posts">
<div class="bk-post bk-post--sq" style="background:${buoy.ground};color:${buoy.name}"><p class="disp">${A(ap.social[0])}</p><span class="bk-post__lg">${fluid(ctx, 'colour', 96, { colourway: 'on-buoy', color: buoy.name, label: 'Logo' })}</span></div>
<div class="bk-post bk-post--pt" style="background:${rev.ground};color:${rev.name}"><p class="disp">${A(ap.social[1])}</p><span class="bk-post__lg">${fluid(ctx, 'reversed', 96, { color: rev.name, label: 'Logo' })}</span></div>
<div class="bk-post bk-post--st is-hair" style="background:${R.surface};color:${R.text}"><p class="disp">${A(ap.social[2])}</p><span class="bk-post__lg">${fluid(ctx, 'colour', 96, { label: 'Logo' })}</span></div>
</div>`;
  // the wharf departure sign: a Hull panel, the next sailings in display type, the boarding row in Buoy
  const label = (id) => (ctx.status.find((s) => s.id === id) || ctx.status[0]).label;
  // a slot placeholder is one token: never split it, the whole thing sits in the time cell
  const whenOf = (d) => (ctx.edition === 'slot' ? [d.when, ''] : d.when.split(', '));
  const rows = S.deliveries.slice(0, 3).map((d) => {
    const [time, note] = whenOf(d), board = d.status === 'boarding';
    return `<li class="bk-sign__r${board ? ' is-board' : ''}"><span class="disp bk-sign__t num">${A(time)}</span><span class="bk-sign__d"><span class="bk-sign__dn">${A(d.to)}</span><span class="bk-sign__note">${A(note)}</span></span><span class="bk-sign__s">${A(label(d.status))}</span></li>`;
  }).join('');
  const [signName] = ap.signage.split(': ');
  const sign = `<figure class="bk-sign"><div class="bk-sign__p" role="img" aria-label="${A(signName)}: ${A(S.deliveries.slice(0, 3).map((d) => whenOf(d)[0] + ' ' + d.to + ', ' + label(d.status)).join('. '))}"><div class="bk-sign__hd"><div class="bk-sign__logo">${fluid(ctx, 'reversed', 150, { color: rev.name, label: 'Logo' })}</div><p class="bk-sign__h disp">${A(B.ui.screen.title)}</p></div><ul class="bk-sign__rows">${rows}</ul></div><figcaption class="cap">${A(signName.replace(/ x /g, ' × '))}. Hull panel, Deck type, Buoy for the boarding row.</figcaption></figure>`;
  const email = `<div class="bk-email"><p class="bk-email__n">${A(ap.email.person)}</p><p class="bk-email__r">${A(ap.email.role)}, ${A(B.name)}</p><p class="bk-email__c">${A(ap.card.contact)}<br>${A(ap.site.url)}</p><div class="bk-email__l">${fluid(ctx, 'horizontal', 168, { label: 'Logo' })}</div></div>`;
  const dRows = S.deliveries.slice(0, 3);
  const screen = `<div class="bk-device"><div class="ui bk-screen" role="img" aria-label="${A(B.name)} product screen: ${A(B.ui.screen.title)}. ${A(S.eta)}. ${A(S.rider)}, ${A(S.riderNote)}." inert>
<div class="bk-scr__top"><span class="ui-num bk-scr__time">${A(S.time)}</span>${ctx.ui.statusChip('boarding')}</div>
<p class="ui-display bk-scr__eta">${A(S.eta)}</p><p class="bk-scr__note">${A(S.pickup)}</p>
<div class="ui-progress"><div class="ui-progress__bar"><i style="width:${S.progress * 100}%"></i></div><span class="ui-progress__dot" style="left:${S.progress * 100}%"></span></div>
<div class="bk-scr__ft"><span>${A(S.from)}</span><span>${A(S.to)}</span></div>
<ul class="ui-list">${ctx.ui.row({ lead: `<span class="ui-avatar">${A(S.initials)}</span>`, title: S.rider, sub: S.riderNote, endHtml: ctx.ui.btn(S.call, { variant: 'secondary', size: 'sm', iconLeft: 'phone' }) })}</ul>
<ul class="ui-list">${dRows.map((d) => ctx.ui.row({ lead: ctx.ui.icon('ship', 18), title: d.to, sub: d.when, end: d.price, chip: ctx.ui.statusChip(d.status) })).join('')}</ul>
</div></div>`;
  const item = (title, body) => `<div class="bk-app">${sub(title)}${body}</div>`;
  const clauses = ['Business card, 90 by 55 mm, front and back.', 'Three flat posts: Buoy square, Hull portrait, Deck story. No photos.', A(signName.replace(/ x /g, ' × ')) + '.', 'The email signature carries the horizontal logo.', 'The product screen uses the interface kit as it ships.'];
  const work = `${item('Business card', `<div class="bk-cards">${front}${back}</div><p class="bk-cap">90 by 55 mm, front and back.</p>`)}
<div class="bk-block">${item('Social', social)}</div>
<div class="bk-block">${item('Wharf departure sign', sign)}</div>
<div class="bk-block bk-two bk-two--even">${item('Email signature', email)}${item('Product screen', screen)}</div>`;
  return page(ctx, 8, 'applications', 'Applications', 'The brand at work: a card, a feed, a wharf, an inbox and the product itself.', clauses, work, 'bk-sec--apps');
}

function downloads(ctx) {
  const D = ctx.book, L = ctx.logo, slot = ctx.edition === 'slot';
  const file = (f, note = '') => `<li class="bk-file"><span class="bk-file__n">${A(f.name)}</span><span class="bk-cap">${note ? A(note) + '. ' : ''}${A(f.ext)}, ${A(f.sizeText)}</span><a class="bk-btn bk-btn--quiet" href="${A(f.href)}" download aria-label="Download ${A(f.name)}"><span class="bk-btn__t">Download</span></a></li>`;
  let k = 3; // the title column holds clauses 9.1 to 9.3; the index continues from 9.4
  const group = (title, what, inner) => { k += 1; return `<section class="bk-fgroup" aria-label="${A(title)}"><div class="bk-fgroup__h"><span class="num bk-fgroup__n">9.${k}</span>${sub(title)}<p class="bk-cap">${A(what)}</p></div>${inner}</section>`; };
  const logoRows = slot
    ? `<ul class="bk-files">${D.logoFiles.map((f) => file(f)).join('')}</ul>`
    : `<ul class="bk-files">${L.versions.map((id) => { const f = D.logo(id); const sizes = f.png.map((p) => `<a class="bk-dl" href="${A(p.href)}" download aria-label="Download ${A(L.labels[id])} logo, PNG, ${p.w} px wide, ${A(p.sizeText)}">${p.w}</a>`).join(''); return `<li class="bk-file bk-file--logo"><span class="bk-file__n">${A(L.labels[id])}</span><span class="bk-dls">${dl(f.svg, L.labels[id] + ' logo')}${dl(f.pdf, L.labels[id] + ' logo')}<span class="bk-pngs" role="group" aria-label="PNG widths in pixels"><span class="bk-cap">PNG</span>${sizes}</span></span></li>`; }).join('')}</ul>`;
  const icons = `<ul class="bk-icons">${D.icons.map((f) => `<li><a class="bk-icon" href="${A(f.href)}" download aria-label="Download ${A(f.name)} icon, SVG">${ctx.ui.icon(f.name.replace('.svg', ''), 24)}<span>${A(f.name.replace('.svg', ''))}</span></a></li>`).join('')}</ul><ul class="bk-files">${file(D.iconsLicence, 'Licence')}</ul>`;
  const photos = D.imagery.filter((f) => f.rel.startsWith('05 Imagery/photos/'));
  const pdfs = D.imagery.filter((f) => f.ext === 'PDF');
  const clauses = ['Every file in the kit, folder by folder.', `The zip holds all of it: ${A(D.zip.sizeText)}.`, 'Files are named by what they are, so they sort in the folder.'];
  const work = `<div class="bk-zip"><div><p class="bk-zip__n">${A(D.zip.name)}</p><p class="bk-cap">Every folder below. ${A(D.zip.sizeText)}.</p></div><a class="bk-btn bk-btn--primary" href="${A(D.zip.href)}" download aria-label="Download ${A(D.zip.name)}, ${A(D.zip.sizeText)}"><span class="bk-btn__t">Download the kit</span></a></div>
<div class="bk-index"><div class="bk-ix__h" aria-hidden="true"><span>Clause</span><span>Item</span><span>Files</span></div>${group('Read me', 'Start here: what is in the kit and how to use it.', `<ul class="bk-files">${[D.readmePdf, D.readme].filter(Boolean).map((f) => file(f)).join('')}</ul>`)}
${group('Logo', slot ? 'The labelled slot frame, and where the approved files go.' : 'Each version as SVG and PDF, and as PNG at three widths, transparent.', logoRows)}
${group('Colour', 'The palette for Adobe, CSS and JSON, and a swatch sheet.', `<ul class="bk-files">${D.colour.map((f) => file(f)).join('')}</ul>`)}
${group('Type', 'The specimen sheet, and the faces with their links and licence.', `<ul class="bk-files">${D.type.map((f) => file(f)).join('')}</ul>`)}
${group('Icons', `${D.icons.length} interface icons, drawn in the brand's stroke.`, icons)}
${group('Imagery', photos.length ? 'The photography direction, and the photos.' : 'The photography direction and shot list.', `<ul class="bk-files">${[...pdfs, ...photos].map((f) => file(f)).join('')}</ul>`)}</div>`;
  return page(ctx, 9, 'downloads', 'Downloads', 'Everything in the brand kit, ready to take.', clauses, work, 'bk-sec--down');
}

export function brandBook(ctx) {
  if (!ctx.book) throw new Error('brandBook needs ctx.book (set by the engine book builder)');
  return [overview, voice, logo, colour, typography, imagery, layout, applications, downloads].map((f) => f(ctx)).join('\n');
}
