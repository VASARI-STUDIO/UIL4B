// Brand book markup for theme 08, Riso (Long Room): the art space's riso press, as a site. The page is Wall (the paper); in the
// dark edition it is the drum room, an Ink ground. Every figure is a printed sheet of the paper (Wall in both editions), edged by a
// hairline, with a registration cross at each corner, and under it its job line: the drums it prints and what each one carries,
// worked out from the hexes it really uses. Separations (each drum's layer alone, then the composite larger) only on the cover, the
// logo and the type; everywhere else composites. Only the brand's real colours and ramp steps; no overprints, tints, grain or
// misregistration (except where the misuse sheet shows it as the fault). Styles are in css-book.js (bookCss); classes start rb-.
// The engine wraps these sections in the shell (skip link, section nav, light and dark switch) and adds the behaviour: copy
// controls (data-copy, with a .bk-btn__t label), the type tester (data-tester-*) and the downloads read data attributes it knows.
import { A, fit } from './helpers.js';
import { cross, drums, drumNo, paper, byRole, isSurface, Word, pc, printCopy } from './guidelines-r.js';

const hx = (h) => String(h).toLowerCase();
const same = (a, b) => hx(a) === hx(b);
const rgbOf = (ctx, hex) => { const [r, g, b] = ctx.C.hexToRgb(hex); return `rgb(${r}, ${g}, ${b})`; };
const drumOf = (ctx, hex) => drums(ctx).find((c) => same(c.hex, hex));
const nameOfHex = (ctx, hex) => { const c = ctx.colours.find((x) => same(x.hex, hex)) || ctx.tones.find((x) => same(x.hex, hex)); return c ? c.name : hex; };
// a list in words: "Ink", "Ink and Blush", "Ink, Vermilion and Blush" (the items are already escaped)
const and = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

// a registration cross at each corner of the sheet it sits in, in the ink of the job's top drum
const xc = (col, s = 15) => ['tl', 'tr', 'bl', 'br'].map((k) => `<span class="rb-xc rb-xc--${k}">${cross(col, s)}</span>`).join('');
// a printed sheet: the paper, its crosses, the print
const sheet = (ink, inner, cls = '', s = 15, attrs = '') => `<div class="rb-sheet ${cls}"${attrs}>${xc(ink, s)}${inner}</div>`;
// a swatch of a drum's solid, as the job line and run sheet show it (a fill, never text)
const sw = (ctx, hex) => `<i class="rb-sw${isSurface(ctx, hex) ? ' is-paper' : ''}" style="background:${hex}" aria-hidden="true"></i>`;

// the job line: how many drums on the paper, then each drum in drum order with what it carries; whatever is in the paper's colour
// is the paper showing through; a tone that is no drum is named as it is. uses: [hex, what] (what already escaped).
function job(ctx, uses, { photo = false, lead = '' } = {}) {
  const D = drums(ctx), p = paper(ctx), by = new Map(), through = [], other = [];
  for (const [hex, what] of uses) {
    if (!what) continue;
    const c = drumOf(ctx, hex);
    if (c) { if (!by.has(c)) by.set(c, []); if (!by.get(c).includes(what)) by.get(c).push(what); } else if (same(hex, p.hex)) { if (!through.includes(what)) through.push(what); } else other.push([nameOfHex(ctx, hex), what]);
  }
  const used = D.filter((c) => by.has(c)), n = used.length;
  const head = `<span class="rb-job__n">${lead}${lead ? Word(n).toLowerCase() : Word(n)} drum${n === 1 ? '' : 's'} on ${A(p.name)}.</span>`;
  const parts = used.map((c) => `<span class="rb-job__d">${sw(ctx, c.hex)}<span class="rb-job__k">Drum ${drumNo(ctx, c)} ${A(c.name)}</span>: ${and(by.get(c))}.</span>`);
  const show = through.length ? `<span class="rb-job__d">The paper shows through for ${and(through)}.</span>` : '';
  const rest = other.map(([nm, what]) => `<span class="rb-job__d">${A(nm)}: ${what}.</span>`).join('');
  const ph = photo ? '<span class="rb-job__d">The photograph keeps its own colour: no drum prints over it.</span>' : '';
  return `<p class="rb-job">${head}${parts.join('')}${show}${rest}${ph}</p>`;
}
// the job of a logo colourway: its ground (when printed), name and plate
const cwUses = (cw) => [[cw.ground, 'the ground'], [cw.name, 'the name'], [cw.plate, 'the plate']];
const cwJob = (ctx, cw) => job(ctx, cwUses(cw).filter(([h], i) => i > 0 || !same(h, paper(ctx).hex)));
// the crosses on a logo sheet print in whichever ink of its job shows on the paper: the ground's when printed, else the name's
const cwInk = (ctx, cw) => (same(cw.ground, paper(ctx).hex) ? cw.name : cw.ground);

const copyBtn = (text, value, what) => `<button type="button" class="rb-btn rb-btn--copy" data-copy="${A(value)}" data-copy-label="${A(what)}" aria-label="${A(text + ' ' + what)}"><span class="bk-btn__t">${A(text)}</span></button>`;
const dl = (f, label, text) => (f ? `<a class="rb-dl" href="${A(f.href)}" download aria-label="Download ${A(label)}, ${A(f.ext)}, ${A(f.sizeText)}">${A(text || f.ext)}</a>` : '');
const head = (id, title, lead) => `<header class="rb-head"><h2 class="rb-h2" id="h-${id}">${A(title)}</h2>${lead ? `<p class="rb-lead">${lead}</p>` : ''}</header>`;
const sec = (id, inner) => `<section class="bk-sec rb-sec rb-sec--${id}" id="${id}" aria-labelledby="h-${id}">${inner}</section>`;
const h3 = (t, cls = '') => `<h3 class="rb-h3 ${cls}">${t}</h3>`;
// a block of the section: its own heading, a line on it, then the work
const part = (title, note, work, cls = '') => `<div class="rb-part ${cls}">${title || note ? `<div class="rb-part__h">${title ? h3(A(title)) : ''}${note ? `<p class="rb-note">${note}</p>` : ''}</div>` : ''}${work}</div>`;
const rulesList = (rules, cls = '') => `<ul class="rb-rules ${cls}">${rules.map((r) => `<li><p class="rb-do"><span class="rb-dk">Do</span>${A(r.do)}</p><p class="rb-dont"><span class="rb-dk">Don't</span>${A(r.dont)}</p></li>`).join('')}</ul>`;

// ---- the cover: one sheet in three drums, authored at 500 x 707 and set in container units so it prints at any width ----
const u = (n) => `${(n / 5).toFixed(2)}cqw`;
function coverLayers(ctx) {
  const B = ctx.brand, L = ctx.logo, cw = B.logo.colourways, ink = byRole(ctx, 'text'), act = byRole(ctx, 'action'), acc = byRole(ctx, 'accent');
  const way = cw['on-blush'] ? 'on-blush' : 'mono-dark', lw = 220, lh = lw / L.geo.aspect;
  const logo = `<div class="rb-cv-logo" style="left:${u(68)};top:${u(56 + 320 - 28 - lh)};width:${u(lw)};--ar:${L.geo.aspect.toFixed(4)}">${L.html('colour', { width: lw, colourway: way, color: cw[way].name, label: 'Logo' })}</div>`;
  return [
    { c: acc, html: (top) => `<i class="rb-cv-plate" style="left:${u(40)};top:${u(56)};width:${u(320)};height:${u(320)};background:${acc.hex}"></i>`, carries: 'the square plate' },
    { c: act, html: (top) => (top ? `<h1 class="rb-cv-line" id="h-overview" style="color:${act.hex}">${A(B.lines.primary)}</h1>` : `<p class="rb-cv-line" style="color:${act.hex}">${A(B.lines.primary)}</p>`), carries: 'the line' },
    { c: ink, html: () => `${logo}<p class="rb-cv-t" style="color:${ink.hex}">Brand book</p><p class="rb-cv-v num" style="color:${ink.hex}">${A(ctx.versionLine)}</p>`, carries: 'the logo, the title and the version' },
  ];
}
// a cover sheet with the given layers; the crosses print in the ink of the top layer (on the composite, the Ink drum's set)
const coverSheet = (layers, top, cls) => `<div class="rb-cv ${cls}"><div class="rb-cv__in">${layers.map((l, i) => `<div class="rb-l" style="--i:${i}">${l.html(top)}</div>`).join('')}${xc(layers[layers.length - 1].c.hex, 25)}</div></div>`;

function overview(ctx) {
  const B = ctx.brand, layers = coverLayers(ctx), shot = ctx.shot('room');
  const seps = [...layers].sort((a, b) => drumNo(ctx, a.c) - drumNo(ctx, b.c)).map((l) => `<figure class="rb-sep" aria-hidden="true">${coverSheet([l], false, 'rb-cv--sep ph-tight')}<figcaption><span class="rb-sep__d">Drum ${drumNo(ctx, l.c)}</span><span class="rb-sep__n">${A(l.c.name)}</span></figcaption></figure>`).join('');
  const run = job(ctx, layers.map((l) => [l.c.hex, l.carries]));
  const cover = `<div class="rb-cover"><div class="rb-seps">${seps}</div><div class="rb-cvc">${coverSheet(layers, true, 'rb-cv--comp')}</div>
<div class="rb-cover__m"><p class="rb-cover__o">${A(B.lines.others[0] || '')}</p><p class="rb-cover__c">${A(B.name)} brand book. ${A(ctx.versionLine)}.</p>${run}<p class="rb-note">Each drum's layer is at the left, the sheet as it comes off the press beside it.</p></div></div>`;
  const facts = `<div class="rb-facts"><div><h3 class="rb-h3">What it does</h3><p class="rb-body">${A(B.product)}</p></div><div><h3 class="rb-h3">Who it serves</h3><p class="rb-body">${A(B.audience)}</p></div></div>`;
  // three traits as a stepped wedge: each one set a step further in, in the order a visitor meets them
  const traits = `<ol class="rb-traits">${B.personality.map((p, i) => `<li style="--s:${i}"><p class="rb-trait">${A(p.trait)}</p><p class="rb-body">${A(p.means)}</p></li>`).join('')}</ol>`;
  return sec('overview', `${cover}
<div class="rb-who"><h2 class="rb-h3 rb-who__h">Who we are</h2><p class="rb-who__d">${A(B.description)}</p></div>
<figure class="rb-room">${ctx.photo('room', { cls: 'rb-ph', pos: '50% 50%' })}<figcaption class="rb-note">${A(shot.caption || 'Art-directed slot: the shot, the crop and the light.')}</figcaption></figure>
${facts}
${part('Three traits', 'How the brand behaves, in the order a visitor meets it.', traits, 'rb-part--traits')}`);
}

function voice(ctx) {
  const B = ctx.brand, V = B.voice, ink = byRole(ctx, 'text'), act = byRole(ctx, 'action');
  const lines = [B.lines.primary, ...B.lines.others];
  const rules = `<ol class="rb-prin">${V.principles.map((p) => `<li><p class="rb-prin__t">${A(p.title)}</p><p class="rb-prin__e">${A(p.example)}</p></li>`).join('')}</ol>`;
  const used = `<ul class="rb-lines">${lines.map((l) => `<li>${A(l)}</li>`).join('')}</ul>`;
  // two-drum sheets: the line in Ink and its reason in Vermilion; what we never say sits beside on the bare page, never printed
  const wtn = `<ol class="rb-wtn">${V.writeThis.map((r, i) => `<li class="rb-wtn__r${i % 2 ? ' is-r' : ''}">${sheet(ink.hex, `<p class="rb-wtn__k">Write this</p><p class="rb-wtn__w">${A(r.write)}</p><p class="rb-wtn__b" style="color:${act.hex}">${A(r.because)}</p>`, 'rb-wtn__sh', 13)}<div class="rb-wtn__n"><p class="rb-wtn__k">Not that</p><p class="rb-wtn__x">${A(r.not)}</p></div></li>`).join('')}</ol>`;
  const wjob = job(ctx, [[ink.hex, 'the line'], [act.hex, 'the reason']]);
  const bp = (t, use, text, what, cls) => `<div class="rb-bp ${cls}"><h3 class="rb-h3">${t}</h3><p class="rb-note">${use}</p><p class="rb-body rb-bp__t">${A(text)}</p>${copyBtn('Copy text', text, what)}</div>`;
  return sec('voice', `${head('voice', 'Voice', 'Four rules for how we write, each with a line from the brand.')}
${part('Four rules', 'Each one is a line the brand already uses.', rules, 'rb-part--prin')}
${part('Lines in use', 'Set once, plainly, beside the button.', used, 'rb-part--lines')}
${part('Write this, not that', 'The label names the work. It does not review it.', `${wtn}${wjob}<p class="rb-note">What we never say sits beside the sheet. It never goes to press.</p>`, 'rb-part--wtn')}
<div class="rb-bps">${bp('The brand in 25 words', 'For a programme line or a listing.', V.boilerplate25, '25-word boilerplate', 'rb-bp--25')}${bp('The brand in 50 words', 'For a press note or an about page.', V.boilerplate50, '50-word boilerplate', 'rb-bp--50')}</div>
${part('Writing the name', 'Two words, two capitals.', `<p class="rb-body rb-name">${A(V.nameRules)}</p>`, 'rb-part--name')}`);
}

function logo(ctx) {
  const B = ctx.brand, L = ctx.logo, cw = B.logo.colourways, slot = ctx.edition === 'slot', p = paper(ctx), act = byRole(ctx, 'action'), acc = byRole(ctx, 'accent');
  const files = (id, name) => (slot ? '' : `<p class="rb-dls">${dl(ctx.book.logo(id).svg, name)}${dl(ctx.book.logo(id).png.find((x) => x.w === 1024), name + ', 1024 px wide', 'PNG 1024')}</p>`);
  // the full colour logo as separations: each drum's layer is the real logo with the other drums' parts left unprinted
  const main = cw[L.colourwayOf('colour')], mainD = drums(ctx).filter((d) => [main.name, main.plate].some((h) => same(h, d.hex)));
  // a slot layer is drawn in its drum's ink; a drum too pale to read (Blush) keeps its frame but sets the label in the text ink
  const layer = (d, w, label = 'Logo') => (slot
    ? `<div class="rb-lay${ctx.C.ratio(d.hex, p.hex) < 4.5 ? ' rb-lay--pale' : ''}">${L.html('colour', { width: w, colourway: 'colour', color: d.hex, label })}</div>`
    : `<div class="rb-lay rb-only--${drumNo(ctx, d)}">${L.html('colour', { width: w, colourway: 'colour', label: 'Logo' })}</div>`);
  const prints = (d) => and(cwUses(main).filter(([h], i) => i > 0 && same(h, d.hex)).map(([, t]) => t));
  const seps = mainD.map((d) => `<figure class="rb-lsep">${sheet(d.hex, layer(d, 180), 'rb-lsep__sh', 13)}<figcaption><span class="rb-sep__d">Drum ${drumNo(ctx, d)}</span><span class="rb-sep__n">${A(d.name)}</span><span class="rb-note">Prints ${prints(d)}</span></figcaption></figure>`).join('');
  const comp = `<figure class="rb-lcomp">${sheet(cwInk(ctx, main), `<div class="rb-lcomp__pr">${L.html('colour', { width: fit(ctx, 'colour', 420, 220), colourway: 'colour', color: main.name, label: L.labels.colour })}</div>`, 'rb-lcomp__sh', 19)}<figcaption>${h3(A(L.labels.colour))}${cwJob(ctx, main)}<p class="rb-note">${A(B.logo.when.colour)}</p>${files('colour', `${L.labels.colour} logo`)}</figcaption></figure>`;
  // the other versions ganged up on one press sheet, each on its own ground, its job line and files under it
  const gang = ['mono-dark', 'mono-light', 'reversed', 'horizontal', 'symbol', 'stacked'];
  const box = { 'mono-dark': [200, 96], 'mono-light': [200, 96], reversed: [200, 96], horizontal: [400, 72], symbol: [64, 96], stacked: [120, 120] };
  const cell = (id) => {
    const c = cw[L.colourwayOf(id)], name = `${L.labels[id]} logo`;
    const ground = `<div class="rb-gd${same(c.ground, p.hex) ? ' is-paper' : ''}" style="background:${c.ground}">${L.html(id, { width: fit(ctx, id, ...box[id]), color: c.name, label: L.labels[id] })}</div>`;
    return `<figure class="rb-gc rb-gc--${id}">${ground}<figcaption>${h3(A(L.labels[id]))}${cwJob(ctx, c)}<p class="rb-note">${A(B.logo.when[id])}</p>${files(id, name)}</figcaption></figure>`;
  };
  const gangSheet = sheet(cw.colour.name, `<div class="rb-gang">${gang.map(cell).join('')}</div>`, 'rb-gang__sh', 15);
  const dlSlot = slot ? `<p class="rb-body rb-slotnote">This book has no logo files yet. The frames above hold the place and the proportion. The brand kit's logo folder says where the approved files go.</p>` : '';
  // clear space: the margin the press keeps clear, drawn as a dashed line at the clear distance with x marked on each side
  const cwid = 300, pad = Math.round((cwid / L.geo.aspect) * L.clearShare / 100);
  const clear = `<figure class="rb-clear">${sheet(main.name, `<div class="rb-clear__z" style="padding:${pad}px"><span class="rb-clear__x rb-clear__x--t">x</span><span class="rb-clear__x rb-clear__x--l">x</span><div class="rb-clear__in">${L.html('colour', { width: cwid, label: 'Your logo goes here' })}</div></div>`, 'rb-clear__sh', 13)}<figcaption>${h3('Clear space')}<p class="rb-note">Keep ${L.clearShare}% of the logo's height clear on every side. x is that distance.</p></figcaption></figure>`;
  const ms = L.minSize;
  const min = `<figure class="rb-min">${sheet(main.name, `<div class="rb-min__pr">${slot ? L.html('colour', { width: 120, label: 'Logo' }) : L.html('colour', { width: ms.screenPx })}</div>`, 'rb-min__sh', 13)}<figcaption>${h3('Smallest size')}<p class="rb-note">${slot ? 'Set the smallest size once the logo is in place. Below that size the plate and the name stop reading as one mark.' : `${ms.screenPx} px wide on screen. ${ms.printMm} mm wide in print.`}</p></figcaption></figure>`;
  // the wrong uses on the press, each drawn with the real logo: off register, the wrong drum, a tint under it
  const NO = `<svg class="rb-no" viewBox="0 0 24 24" width="24" height="24" role="img" aria-label="Not allowed"><circle cx="12" cy="12" r="12" fill="${act.hex}"/><path d="M8 8l8 8M16 8l-8 8" stroke="${p.hex}" stroke-width="2" stroke-linecap="square" fill="none"/></svg>`;
  // the second drum's layer lands off line; in the slot edition it is the frame alone, so the two labels never print over each other
  const off = (w) => `<div class="rb-off">${mainD.map((d, i) => `<div class="${i ? 'rb-off__b' : 'rb-off__a'}">${layer(d, w, i ? '' : 'Logo')}</div>`).join('')}</div>`;
  const tint = (w) => `<div class="rb-tint"><svg class="rb-scr" aria-hidden="true"><defs><pattern id="rb-dots" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><circle cx="2.5" cy="2.5" r="1.4" fill="${acc.hex}"/></pattern></defs><rect width="100%" height="100%" fill="url(#rb-dots)"/></svg><div class="rb-tint__l">${L.html('colour', { width: w, colourway: 'colour', color: main.name, label: 'Logo' })}</div></div>`;
  const press = [
    ['Off register', 'Never print the drums out of line. Proof the first sheet and line the plate up with the name before the run.', off(220)],
    ['The wrong drum', `Never recolour it. The name prints in ${A(nameOfHex(ctx, main.name))}; use a colourway from the versions above.`, L.forMisuse(150, { fill: act.hex })],
    ['A tint under it', `Never print it over a tint. Set it on bare ${A(p.name)} or on a solid from the versions above.`, tint(150)],
  ];
  const fault = ([t, why, html], i) => `<figure class="rb-mu rb-mu--${i}">${sheet(main.name, `<div class="rb-mu__pr">${html}</div>${NO}`, 'rb-mu__sh', 13)}<figcaption>${h3(A(t))}<p class="rb-note">${why}</p></figcaption></figure>`;
  const misuse = ['Do not stretch, squash or skew it.', 'Do not move the plate off the left edge of the L.', 'Do not recolour it outside the versions above.', 'Do not set the name in capitals.', 'Do not add shadows, glows or other effects.', 'Do not set it on a busy part of a photo.'];
  return sec('logo', `${head('logo', 'Logo', A(B.logo.idea))}
<div class="rb-lseps">${seps}${comp}</div>
${part('Seven versions', 'Start with full colour. Reach for another only when the ground or the space asks for it. The rest are ganged up on one sheet here, each with the drums it needs.', `${gangSheet}${dlSlot}`, 'rb-part--gang')}
<div class="rb-cm">${clear}${min}</div>
${part('Never', 'Three faults on the press, and six ways to spoil the mark.', `<div class="rb-mus">${press.map(fault).join('')}</div><ol class="rb-never">${misuse.map((m) => `<li>${A(m)}</li>`).join('')}</ol>`, 'rb-part--never')}`);
}

function colour(ctx) {
  const B = ctx.brand, D = drums(ctx), p = paper(ctx), max = D[0].share, L = ctx.roles.light;
  const values = (c) => {
    const rgb = rgbOf(ctx, c.hex), ok = c.oklch || ctx.C.oklchString(c.hex);
    return `<dl class="rb-vals"><div><dt>HEX</dt><dd>${c.hex}</dd></div><div><dt>RGB</dt><dd>${rgb}</dd></div><div><dt>OKLCH</dt><dd>${ok}</dd></div></dl><p class="rb-copies">${copyBtn('Copy HEX', c.hex, `${c.name} HEX`)}${copyBtn('Copy RGB', rgb, `${c.name} RGB`)}${copyBtn('Copy OKLCH', ok, `${c.name} OKLCH`)}</p>`;
  };
  // the ramp: the brand's ten real steps, each a patch with its step and hex printed on the paper under it; the base step marked
  const ramp = (c) => `<ol class="rb-ramp" aria-label="${A(c.name)}, ten steps from 50 to 900">${Object.entries(c.ramp).map(([k, v]) => `<li${+k === c.rampBase ? ' class="is-base"' : ''}><i class="${isSurface(ctx, v) ? 'is-paper' : ''}" style="background:${v}" role="img" aria-label="${k} ${v}"></i><span class="rb-ramp__k num">${k}${+k === c.rampBase ? ' Base' : ''}</span><span class="rb-ramp__h">${v}</span></li>`).join('')}</ol>`;
  // a drum's tint chart: the solid sized by its share of a page (by area), the copy control on the solid, the values in the margin
  const chart = (c, i) => {
    const f = Math.sqrt(c.share / max);
    const solid = `<button type="button" class="rb-solid" style="background:${c.hex};--f:${f.toFixed(3)}" data-copy="${c.hex}" data-copy-label="${A(c.name)} HEX ${c.hex}" aria-label="Copy HEX ${A(c.hex)}, ${A(c.name)}"></button>`;
    return `<li class="rb-chart rb-chart--${i ? 'half' : 'full'}">${sheet(c.hex, `<div class="rb-chart__top">${solid}<div class="rb-chart__m"><p class="rb-sep__d">Drum ${drumNo(ctx, c)}</p><h3 class="rb-cname">${A(c.name)}</h3><p class="rb-note">${A(ctx.cap(c.role))}. <span class="num">${pc(c)}%</span> of a page.</p><p class="rb-lands">${A(c.lands)}</p>${values(c)}</div></div>${ramp(c)}<p class="rb-note rb-ramp__n">Ten steps, 50 to ${Object.keys(c.ramp).pop()}, as the brand sets them. The base is marked.</p>`, 'rb-chart__sh', 13)}</li>`;
  };
  const paperSheet = sheet(L.text, `<div class="rb-paper__m"><p class="rb-sep__d">Paper</p><h3 class="rb-cname">${A(p.name)}</h3><p class="rb-note">${A(ctx.cap(p.role))}. <span class="num">${pc(p)}%</span> of a page. ${A(p.name)} is the ground. It takes no ink, so it has no tints.</p><p class="rb-lands">${A(p.lands)}</p></div><div>${values(p)}</div>`, 'rb-paper', 13);
  const tones = `<ul class="rb-tones">${ctx.tones.map((t) => `<li><i class="${isSurface(ctx, t.hex) ? 'is-paper' : ''}" style="background:${t.hex}" aria-hidden="true"></i><div><h3 class="rb-h3">${A(t.name)}</h3>${values(t)}</div></li>`).join('')}</ul>`;
  // two-drum test prints: each pair the brand sets, printed in its two inks with a real line, its ratio and use as the job line.
  // Rows of one, two, then three; the slot edition has no copy yet, so past the lead sheet a print carries its pair's names.
  const slot = ctx.edition === 'slot', share = (id) => ctx.byId[id].share || 0;
  const used = [...ctx.pairs].map((x, i) => [x, i]).sort((a, b) => share(b[0].bg) - share(a[0].bg) || share(b[0].fg) - share(a[0].fg) || a[1] - b[1]).map(([x]) => x);
  const rows = []; for (let i = 0, k = 1; i < used.length; i += k, k = Math.min(k + 1, 3)) rows.push(used.slice(i, i + k));
  const copy = printCopy(ctx, used, (i) => i >= 3);
  const pairName = (x) => `${A(nameOfHex(ctx, x.fgHex))} on ${A(nameOfHex(ctx, x.bgHex))}`;
  const xInk = (x) => (ctx.ratio(x.fgHex, L.surface) >= ctx.ratio(x.bgHex, L.surface) ? x.fgHex : x.bgHex);
  const print = (x) => { const i = used.indexOf(x), named = slot && i > 0;
    return `<li class="rb-tp">${sheet(xInk(x), `<div class="rb-tp__pr" style="background:${x.bgHex};color:${x.fgHex}"><p class="rb-tp__c">${named ? pairName(x) : A(copy[i])}</p></div>`, 'rb-tp__sh', 13)}<p class="rb-tp__r"><span class="num">${A(x.ratioText)} : 1</span> <span class="rb-tp__s">${x.large ? '24 px and over' : 'Any size'}</span></p><p class="rb-note">${named ? '' : `${pairName(x)}. `}${A(x.use)}</p></li>`; };
  const prints = rows.map((r, n) => `<ol class="rb-tps rb-tps--${Math.min(n, 2)}">${r.map(print).join('')}</ol>`).join('');
  const never = ctx.unusedPairs.length ? `<div class="rb-never-t"><h3 class="rb-h3">Not for text</h3><ul class="rb-runl">${ctx.unusedPairs.map((x) => `<li>${A(nameOfHex(ctx, x.fgHex))} on ${A(nameOfHex(ctx, x.bgHex))} <span class="num">${A(x.ratioText)} : 1</span></li>`).join('')}</ul></div>` : '';
  const roleKeys = [['surface', 'Surface'], ['raised', 'Raised'], ['text', 'Text'], ['quiet', 'Quiet text'], ['border', 'Border'], ['action', 'Action'], ['actionLabel', 'Action label'], ['focus', 'Focus']];
  const toneKeys = [['success', 'Success'], ['warning', 'Warning'], ['danger', 'Danger'], ['info', 'Info']];
  const roles = (mode) => { const r = ctx.roles[mode];
    const items = [...roleKeys.map(([k, n]) => [n, r[k]]), ...toneKeys.map(([k, n]) => [n, r[k].fg])];
    return `<ul class="rb-roles bk-for-${mode}">${items.map(([n, h]) => `<li><button type="button" class="rb-role" data-copy="${h}" data-copy-label="${mode} ${A(n)} HEX ${h}" aria-label="Copy HEX ${A(h)}, ${mode} ${A(n)}"><i style="background:${h}" aria-hidden="true"></i><span class="rb-role__n">${A(n)}</span><span class="rb-role__h">${h}</span></button></li>`).join('')}</ul>`; };
  return sec('colour', `${head('colour', 'Colour', 'Wall is nearly all of a page. Ink does the work, Vermilion is spent once a screen, and Blush is a fill, never type.')}
${part('The drums', `${Word(D.length)} drums and the paper they print on. Each solid is sized by how much of a page its ink covers. Click a solid to copy its HEX.`, `<ol class="rb-charts">${D.map(chart).join('')}</ol>${paperSheet}`, 'rb-part--drums')}
${part('Text tones', 'Greys that carry captions and plates.', tones, 'rb-part--tones')}
${part('Contrast', `Every text pair ${A(B.name)} uses, printed in its two inks, with its WCAG ratio. Text needs 4.5 : 1. Type at 24 px and over needs 3 : 1.`, `${prints}${never}`, 'rb-part--tp')}
${part('Interface roles', 'The same roles in the light and dark previews. Use the switch to see the other set. Click one to copy its HEX.', `${roles('light')}${roles('dark')}`, 'rb-part--roles')}`);
}

function typography(ctx) {
  const B = ctx.brand, F = B.fonts, T = B.type, alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789';
  const word = B.name.split(' ').pop(), ink = byRole(ctx, 'text'), acc = byRole(ctx, 'accent');
  const faces = `<div class="rb-faces"><div class="rb-face rb-face--d"><p class="rb-word" aria-hidden="true">${A(word)}</p><p class="rb-word rb-word--i" aria-hidden="true">${A(word)}</p>${h3(A(F.display.family))}<p class="rb-note">Titles and the one line, weight ${F.display.weights.join(', ')}. The italic is for the names of shows and artists.</p><p class="rb-al rb-al--d">${alpha}</p></div>
<div class="rb-face rb-face--b"><p class="rb-word rb-word--b" aria-hidden="true">${A(word)}</p>${h3(A(F.body.family))}<p class="rb-note">Everything a visitor reads or presses, weights ${F.body.weights.join(', ')}. ${A(F.mono.family)} is for a hex, a token or a code string only. All three faces are open licence (SIL OFL 1.1), free for commercial use.</p><p class="rb-al">${alpha}</p></div></div>`;
  // the scale as a poster in two drums: the Blush drum prints the plate, the Ink drum the type at true size; each style's spec sits
  // in the sheet's slug, the margin outside the trim
  const sample = (s) => (s.token === 'body' ? T.sample.paragraph : s.token === 'caption' ? T.sample.caption : T.sample.headline);
  const style = (s) => `font-family:${s.face === 'display' ? 'var(--display)' : 'var(--body)'};font-weight:${s.weight};line-height:${s.line};${s.token === 'title' ? 'font-style:italic;' : ''}--size:${s.size}px`;
  const lines = T.scale.map((s) => `<li class="rb-ps"><p class="rb-ps__s" style="${style(s)}">${A(sample(s))}</p><p class="rb-ps__m"><span class="rb-ps__t">${A(s.token)}</span><span class="num">${s.size} / ${Math.round(s.size * s.line)} px, ${A(s.face === 'display' ? F.display.family : F.body.family)} ${s.weight}${s.token === 'title' ? ' italic' : ''}.</span> ${A(s.use)}.</p></li>`).join('');
  const poster = `<figure class="rb-poster">${sheet(ink.hex, `<i class="rb-poster__plate" style="background:${acc.hex}"></i><ul class="rb-pss">${lines}</ul>`, 'rb-poster__sh', 19)}</figure>`;
  // the separations: the same poster at a quarter size, one drum each
  const thumb = (c, inner) => `<figure class="rb-tsep" aria-hidden="true">${sheet(c.hex, inner, 'rb-tsep__sh ph-tight', 9)}<figcaption><span class="rb-sep__d">Drum ${drumNo(ctx, c)}</span><span class="rb-sep__n">${A(c.name)}</span></figcaption></figure>`;
  const tLines = T.scale.map((s) => `<p class="rb-tsep__s" style="${style(s)}">${A(sample(s))}</p>`).join('');
  const tseps = [[ink, `<i class="rb-poster__plate is-blank"></i><div class="rb-tsep__ls">${tLines}</div>`], [acc, `<i class="rb-poster__plate" style="background:${acc.hex}"></i>`]].sort((a, b) => drumNo(ctx, a[0]) - drumNo(ctx, b[0])).map(([c, h]) => thumb(c, h)).join('');
  const pjob = job(ctx, [[acc.hex, 'the plate'], [ink.hex, 'the type']]);
  const tester = `<div class="rb-tester" data-tester>
<div class="rb-tester__c"><div class="rb-field"><label for="tester-text">Your line</label><input id="tester-text" type="text" value="${A(T.sample.headline)}" data-tester-text data-default="${A(T.sample.headline)}" autocomplete="off" spellcheck="false"></div>
<div class="rb-field"><label for="tester-size">Size <output for="tester-size" data-tester-value class="num">64 px</output></label><input id="tester-size" type="range" min="14" max="120" step="1" value="64" data-tester-size></div></div>
${sheet(ink.hex, `<p class="rb-tester__d" data-tester-out aria-hidden="true">${A(T.sample.headline)}</p><p class="rb-tester__b" data-tester-out aria-hidden="true">${A(T.sample.headline)}</p>`, 'rb-proof', 13)}
</div>`;
  return sec('typography', `${head('typography', 'Typography', 'One face for the line and the names, one for everything you read.')}
${faces}
${part('Scale', 'Six sizes, set at true size on a poster. Nothing smaller than 12 px. The Ink drum carries all the type.', `<div class="rb-scale"><div class="rb-tseps">${tseps}</div>${poster}</div>${pjob}`, 'rb-part--scale')}
${part('Try it', 'Type your own line. The proof pulls it in both faces.', tester, 'rb-part--tester')}
${part('In use', 'A line, a paragraph and a caption, as a visitor meets them.', `<div class="rb-use"><p class="rb-use__h">${A(T.sample.headline)}</p><p class="rb-use__p">${A(T.sample.paragraph)}</p><p class="rb-use__c">${A(T.sample.caption)}</p></div>`, 'rb-part--use')}
${part('Rules', 'Set in the order a reader meets them.', rulesList(T.rules, 'rb-rules--cols'), 'rb-part--trules')}`);
}

function imagery(ctx) {
  const B = ctx.brand, D = B.imagery.direction, shots = B.imagery.shots, ink = byRole(ctx, 'text'), acc = byRole(ctx, 'accent');
  const dirRows = [['Light', D.light], ['Crop', D.crop], ['Colour', D.colour], ['People', D.people]];
  // the brief, printed in one drum: label over line
  const brief = `<figure class="rb-brief">${sheet(ink.hex, `<dl class="rb-dir">${dirRows.map(([k, v]) => `<div><dt>${k}</dt><dd>${A(v)}</dd></div>`).join('')}</dl>`, 'rb-brief__sh', 13)}${job(ctx, [[ink.hex, 'the brief']])}</figure>`;
  // the shot list as a print plan: six shots imposed on one press sheet, each with its number, its name and the drums that print it.
  // A shot the accent drum lands on sits on that drum's plate.
  const plated = (s) => !!(acc && acc.lands && new RegExp(`\\b${s.id.replace(/[^a-z0-9]/gi, '')}s?\\b`, 'i').test(ctx.real(acc.lands)));
  const mark = (c) => `<span class="rb-dm">${sw(ctx, c.hex)}<span class="num">${drumNo(ctx, c)}</span></span>`;
  const plates = [];
  const fig = (s, i) => {
    const real = !!s.photo, f = real ? ctx.book.find(`05 Imagery/photos/${s.photo.split('/').pop()}`) : null, pl = plated(s);
    if (pl) plates.push(i + 1);
    const ds = [ink, pl ? acc : null].filter(Boolean).sort((a, b) => drumNo(ctx, a) - drumNo(ctx, b));
    const cap = real ? `<span class="rb-shot__cr">${A(s.caption || s.alt)}. Photo: ${A(s.credit)}.</span>` : '';
    return `<figure class="rb-shot rb-shot--${i}"><div class="rb-shot__f${pl ? ' is-plated' : ''}"${pl ? ` style="background:${acc.hex}"` : ''}>${ctx.photo(s.id, { cls: 'rb-ph', pos: '50% 50%' })}</div><figcaption><span class="rb-shot__n num">${i + 1}</span><span class="rb-shot__t">${A(ctx.cap(s.id))}</span><span class="rb-shot__d" aria-label="Drums ${ds.map((c) => drumNo(ctx, c)).join(' and ')}">${ds.map(mark).join('')}</span>${cap}${f ? `<span class="rb-dls">${dl(f, 'photo ' + (s.caption || s.id))}</span>` : ''}</figcaption></figure>`;
  };
  const shotsHtml = shots.map(fig).join('');
  const uses = [[ink.hex, 'the numbers and names']];
  if (plates.length) uses.push([acc.hex, `the plate under shot ${plates.join(' and ')}`]);
  const plan = `${sheet(ink.hex, `<div class="rb-shots">${shotsHtml}</div>`, 'rb-plan', 15)}${job(ctx, uses, { photo: true })}`;
  const rules = `<div class="rb-irules"><p class="rb-irules__h"><span>Do</span><span>Don't</span></p><ul>${B.imagery.rules.map((r) => `<li><p class="rb-do"><span class="rb-dk">Do</span>${A(r.do)}</p><p class="rb-dont"><span class="rb-dk">Don't</span>${A(r.dont)}</p></li>`).join('')}</ul></div>`;
  return sec('imagery', `${head('imagery', 'Imagery', A(D.subject))}
${part('Direction', 'Five things to settle before anyone lifts a camera. The subject is above.', brief, 'rb-part--dir')}
${part('Six shots', 'Each frame is a brief: the shot, the crop and the light. The sheet is the print plan: each shot says which drums print round it.', plan, 'rb-part--plan')}
${part('Rules', 'What to show, and what to leave out.', rules, 'rb-part--irules')}`);
}

function layout(ctx) {
  const G = ctx.gridMeasures, B = ctx.brand, ink = byRole(ctx, 'text'), acc = byRole(ctx, 'accent');
  const m = (G.margin / G.page.w) * 100, inner = G.page.w - 2 * G.margin, gap = (G.gutter / inner) * 100;
  const cols = Array.from({ length: G.columns }, () => `<i style="background:${acc.hex}"></i>`).join('');
  const col = (Math.round(G.col * 10) / 10).toString();
  const radii = ctx.radii.filter((r) => r.px < 9999);
  // the page drawn as a two-drum sheet: the columns are the Blush drum, the trim and the margin line the Ink drum
  const pg = `<figure class="rb-pgf">${sheet(ink.hex, `<div class="rb-page" role="img" aria-label="The page grid: ${G.columns} columns, ${G.margin} pixel margin, ${G.gutter} pixel gutter" style="aspect-ratio:${G.page.w}/${G.page.h};padding:${m.toFixed(3)}%"><div class="rb-page__g" style="column-gap:${gap.toFixed(3)}%;grid-template-columns:repeat(${G.columns},minmax(0,1fr))">${cols}</div></div>`, 'rb-pgf__sh', 13)}${job(ctx, [[acc.hex, 'the columns'], [ink.hex, 'the margin line']])}</figure>`;
  const meas = `<dl class="rb-meas"><div><dt>Margin</dt><dd class="num">${G.margin} px</dd></div><div><dt>Gutter</dt><dd class="num">${G.gutter} px</dd></div><div><dt>Column</dt><dd class="num">${col} px</dd></div><div><dt>Base</dt><dd class="num">${G.base} px</dd></div></dl>`;
  const space = `<ul class="rb-space">${ctx.space.map((s) => `<li><i style="width:${s.px}px;height:${s.px}px"></i><span class="num">${s.px}</span></li>`).join('')}</ul>`;
  const shape = `<ul class="rb-shape">${radii.map((r) => `<li><i style="border-radius:${r.px}px"></i><span class="rb-note">${A(r.use)}, ${r.px} px</span></li>`).join('')}</ul>`;
  return sec('layout', `${head('layout', 'Layout', `${G.columns} columns on a ${G.page.w} by ${G.page.h} page, a ${G.margin} px margin and a ${G.gutter} px gutter. Everything sits on a ${G.base} px base.`)}
<div class="rb-lay3">${part('The page', 'Every page sits on this grid.', `<div class="rb-pgw">${pg}${meas}</div>`, 'rb-part--page')}
<div class="rb-lay3__r">${part('Spacing', 'Steps of the base, in pixels.', space, 'rb-part--space')}
${part('Corners and edges', `Edges are ${B.ui.border} px. ${A(B.ui.elevationNote)}`, shape, 'rb-part--shape')}</div></div>`);
}

function applications(ctx) {
  const B = ctx.brand, L = ctx.logo, ap = B.applications, S = B.ui.screen.content, cw = B.logo.colourways, rev = cw.reversed, p = paper(ctx), ink = byRole(ctx, 'text');
  // the business card, front and back at 90 : 55, ganged on one press sheet
  const front = `<div class="rb-card rb-card--front" style="background:${rev.ground};color:${rev.name}"><div class="rb-card__logo">${L.html('reversed', { width: fit(ctx, 'reversed', 150, 90), color: rev.name, label: 'Your logo goes here' })}</div></div>`;
  const back = `<div class="rb-card rb-card--back"><div class="rb-card__mark">${L.html('symbol', { width: fit(ctx, 'symbol', 32, 50), label: 'Logo' })}</div><div class="rb-card__who"><p class="rb-card__nm">${A(ap.card.person)}</p><p class="rb-card__rl">${A(ap.card.role)}</p><p class="rb-card__ct">${A(ap.card.contact)}<br>${A(ap.site.url)}</p></div></div>`;
  const sym = cw[L.colourwayOf('symbol')];
  const card = `<figure class="rb-cardf">${sheet(rev.ground, `<div class="rb-cards">${front}${back}</div>`, 'rb-cards__sh', 15)}<figcaption>${job(ctx, cwUses(rev).map(([h, t]) => [h, `the front's ${t.replace('the ', '')}`]), { lead: 'Front: ' })}${job(ctx, [[sym.plate, "the back's mark"], [ink.hex, "the back's words"]], { lead: 'Back: ' })}</figcaption></figure>`;
  const ob = cw['on-blush'];
  const social = `<div class="rb-posts">
<div class="rb-post rb-post--sq" style="background:${ob.ground};color:${ob.name}"><p class="rb-post__l">${A(ap.social[0])}</p><span class="rb-post__lg">${L.html('colour', { colourway: 'on-blush', width: 96, label: 'Logo' })}</span></div>
<div class="rb-post rb-post--pt" style="background:${rev.ground};color:${rev.name}"><p class="rb-post__l rb-post__l--i">${A(ap.social[1])}</p><span class="rb-post__lg">${L.html('reversed', { width: 96, color: rev.name, label: 'Logo' })}</span></div>
<div class="rb-post rb-post--st"><div class="rb-post__ph">${ctx.photo('work', { cls: 'rb-ph', slotNote: false })}</div><p class="rb-post__l rb-post__l--i">${A(ap.social[2])}</p></div>
</div>`;
  // signage: entrance wall text in vinyl, drawn to proportion with its two measures (read from the line, never cut from it)
  const dims = (ctx.real(ap.signage).match(/(\d[\d,.]*)\s*x\s*(\d[\d,.]*)\s*mm/i) || []).slice(1);
  const sign = `<figure class="rb-sign"><div class="rb-sign__w">${dims[0] ? `<span class="rb-dim rb-dim--w"><span>${dims[0]} mm</span></span>` : ''}<div class="rb-sign__r"><div class="rb-wall"><p class="rb-wall__l">${A(B.lines.primary)}</p><span class="rb-wall__lg">${L.html('mono-dark', { width: 110, label: 'Logo' })}</span></div>${dims[1] ? `<span class="rb-dim rb-dim--h"><span>${dims[1]} mm</span></span>` : ''}</div></div><figcaption class="rb-note">${A(ap.signage)}</figcaption></figure>`;
  const email = `<div class="rb-email"><p class="rb-email__n">${A(ap.email.person)}</p><p class="rb-email__r">${A(ap.email.role)}, ${A(B.name)}</p><p class="rb-email__c">${A(ap.card.contact)}<br>${A(ap.site.url)}</p><div class="rb-email__l">${L.html('horizontal', { width: 168, label: 'Logo' })}</div></div>`;
  const rows = S.deliveries.slice(0, 3);
  const screen = `<div class="rb-device"><div class="ui rb-screen" role="img" aria-label="${A(B.name)} product screen: ${A(S.title)}. ${A(S.eta)}. ${A(S.rider)}, ${A(S.riderNote)}." inert>
<div class="rb-scr__top"><span class="ui-num rb-scr__time">${A(S.time)}</span>${ctx.ui.statusChip('booked')}</div>
<p class="ui-display rb-scr__eta">${A(S.eta)}</p><p class="rb-scr__note">${A(S.pickup)}</p>
<div class="ui-progress"><div class="ui-progress__bar"><i style="width:${S.progress * 100}%"></i></div><span class="ui-progress__dot" style="left:${S.progress * 100}%"></span></div>
<div class="rb-scr__ft"><span>${A(S.from)}</span><span>${A(S.to)}</span></div>
<ul class="ui-list">${ctx.ui.row({ lead: `<span class="ui-avatar">${A(S.initials)}</span>`, title: S.rider, sub: S.riderNote, endHtml: ctx.ui.btn(S.call, { variant: 'secondary', size: 'sm', iconLeft: 'image' }) })}</ul>
<ul class="ui-list">${rows.map((d) => ctx.ui.row({ lead: ctx.ui.icon('ticket', 18), title: d.to, sub: d.when, end: d.price, chip: ctx.ui.statusChip(d.status) })).join('')}</ul>
</div></div>`;
  return sec('applications', `${head('applications', 'Applications', 'The brand at work: a card, a feed, a wall, an inbox and the product itself.')}
${part('Business card', `90 by 55 mm, front and back, printed on ${A(p.name)}.`, card, 'rb-part--card')}
${part('Social', 'Blush is the one fill. A story gives the work the room.', social, 'rb-part--social')}
<div class="rb-apps2">${part('Entrance wall', 'Vinyl lettering straight on the wall, Ink on Wall.', sign, 'rb-part--sign')}
${part('Product screen', 'Vermilion once, on the one thing to press.', screen, 'rb-part--screen')}</div>
${part('Email signature', 'Name and role, then the horizontal logo.', email, 'rb-part--email')}`);
}

function downloads(ctx) {
  const B = ctx.brand, D = ctx.book, L = ctx.logo, cw = B.logo.colourways, slot = ctx.edition === 'slot', ink = byRole(ctx, 'text');
  // the print run sheet: each job a folder, each line a file with its format, its size and its link
  const line = (f, note = '') => `<li class="rb-rl"><span class="rb-rl__f">${A(f.name)}</span><span class="rb-rl__m">${note ? `${A(note)}. ` : ''}<span class="rb-rl__x">${A(f.ext)}</span>, <span class="num">${A(f.sizeText)}</span></span><a class="rb-btn rb-btn--dl" href="${A(f.href)}" download aria-label="Download ${A(f.name)}"><span class="bk-btn__t">Download</span></a></li>`;
  const lines = (fs, note) => `<ul class="rb-rls">${fs.filter(Boolean).map((f) => line(f, note)).join('')}</ul>`;
  // a logo version is a line with the drums its colourway prints, then its files
  const drumsLine = (c) => { const ds = drums(ctx).filter((d) => [c.ground, c.name, c.plate].some((h) => same(h, d.hex))); return `<span class="rb-rl__dr" aria-label="Drums ${ds.map((d) => drumNo(ctx, d)).join(' and ')}">${ds.map((d) => `<span class="rb-dm">${sw(ctx, d.hex)}<span class="num">${drumNo(ctx, d)}</span></span>`).join('')}</span>`; };
  const logoRows = slot
    ? lines(D.logoFiles)
    : `<ul class="rb-rls">${L.versions.map((id) => { const f = D.logo(id); const sizes = f.png.map((x) => `<a class="rb-dl" href="${A(x.href)}" download aria-label="Download ${A(L.labels[id])} logo, PNG, ${x.w} px wide, ${A(x.sizeText)}">${x.w}</a>`).join(''); return `<li class="rb-rl rb-rl--logo"><span class="rb-rl__f rb-rl__f--v">${A(L.labels[id])}${drumsLine(cw[L.colourwayOf(id)])}</span><span class="rb-dls">${dl(f.svg, L.labels[id] + ' logo')}${dl(f.pdf, L.labels[id] + ' logo')}<span class="rb-pngs" role="group" aria-label="PNG widths in pixels"><span class="rb-pngs__k">PNG</span>${sizes}</span></span></li>`; }).join('')}</ul>`;
  const icons = `<ul class="rb-icons">${D.icons.map((f) => `<li><a class="rb-icon" href="${A(f.href)}" download aria-label="Download ${A(f.name)} icon, SVG">${ctx.ui.icon(f.name.replace('.svg', ''), 24)}<span>${A(f.name.replace('.svg', ''))}</span></a></li>`).join('')}</ul>${lines([D.iconsLicence], 'Licence')}`;
  const photos = D.imagery.filter((f) => f.rel.startsWith('05 Imagery/photos/'));
  const pdfs = D.imagery.filter((f) => f.ext === 'PDF');
  const jobs = [
    ['Read me', 'Start here: what is in the kit and how to use it.', lines([D.readmePdf, D.readme])],
    ['Logo', slot ? 'The labelled slot frame, and where the approved files go.' : 'Each version as SVG and PDF, and as PNG at three widths, transparent. The marks are the drums each version prints in.', logoRows],
    ['Colour', 'The palette for Adobe, CSS and JSON, and a swatch sheet.', lines(D.colour)],
    ['Type', 'The specimen sheet, and the faces with their links and licence.', lines(D.type)],
    ['Icons', `${D.icons.length} interface icons, drawn in the brand's stroke.`, icons],
    ['Imagery', photos.length ? 'The photography direction, and the photos.' : 'The photography direction and shot list.', lines([...pdfs, ...photos])],
  ];
  const run = sheet(ink.hex, `<div class="rb-run__h"><p class="rb-run__t">Run sheet</p><p class="rb-note">${A(B.name)} brand kit. ${A(ctx.versionLine)}.</p></div>${jobs.map(([t, w, inner], i) => `<div class="rb-job-g"><div class="rb-job-g__h"><p class="rb-job-g__n">Job <span class="num">${i + 1}</span></p><h3 class="rb-h3">${A(t)}</h3><p class="rb-note">${A(w)}</p></div>${inner}</div>`).join('')}`, 'rb-run', 15);
  const colophon = `<div class="rb-colo"><div><h3 class="rb-h3">Colophon</h3><p class="rb-body">${A(B.name)} brand book. ${A(ctx.versionLine)}. Set in ${A(B.fonts.display.family)} and ${A(B.fonts.body.family)}.</p></div>
<div class="rb-zip"><p class="rb-zip__n">${A(D.zip.name)}</p><p class="rb-note">Every job above. ${A(D.zip.sizeText)}.</p><a class="rb-btn rb-btn--primary" href="${A(D.zip.href)}" download aria-label="Download ${A(D.zip.name)}, ${A(D.zip.sizeText)}"><span class="bk-btn__t">Download the kit</span></a></div></div>`;
  return sec('downloads', `${head('downloads', 'Downloads', 'Everything in the brand kit, job by job. The zip holds all of it.')}
${run}
${colophon}`);
}

export function brandBook(ctx) {
  if (!ctx.book) throw new Error('brandBook needs ctx.book (set by the engine book builder)');
  return [overview, voice, logo, colour, typography, imagery, layout, applications, downloads].map((f) => f(ctx)).join('\n');
}
