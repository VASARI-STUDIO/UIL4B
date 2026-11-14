// Theme 22, Ticket: lane bk, the HTML brand book (brandBook and bookCss). The book is a roll of tickets laid on the bar top and read by scrolling.
// Each of the nine sections opens on one ticket at the guidelines' proportion: the body carries the section's one thing, a perforation with two
// die-cut notches divides it from the stub, and the stub holds the only chrome (the section's name, its number and a barcode of it). Below each
// ticket the section runs on as long-form text on the bar top, with smaller tickets wherever there is something to take away: a boilerplate to
// copy, the type tester, the kit to download. The action always sits on the stub, the part you tear off.
// On a narrow screen every ticket turns the way a phone ticket does: the stub drops below the body and the perforation runs across.
import { plateImg } from '../../engine/plate.js';
import { A, roles, barcodeRects, fitLines, slugOf, listAnd, weightName, textWidth } from './helpers.js';
import { BOOK_SECTIONS } from '../../engine/book.js';
import { bookCss } from './lane-bk-css.js';
import { appPhotos } from './lane-bk-apps.js';
import { hasPlate } from './plates.js';
import { shotPhoto } from './lane-ht-parts.js';

export { bookCss };

const sec = (id, inner) => `<section class="bk-sec tb-sec tb-sec--${id}" id="${id}" aria-labelledby="h-${id}">${inner}</section>`;
const serialOf = (id) => String(BOOK_SECTIONS.findIndex((s) => s.id === id) + 1).padStart(3, '0');
const titleOf = (id) => BOOK_SECTIONS.find((s) => s.id === id).title;

// a copy control: the visible text is the action, the accessible name says what it copies
const copyBtn = (text, value, what, cls = '') => `<button type="button" class="bk-btn tb-btn ${cls}" data-copy="${A(value)}" data-copy-label="${A(what)}" aria-label="${A(text + ', ' + what)}"><span class="bk-btn__t">${A(text)}</span></button>`;
// a value that copies itself: the shown text is the value
const valBtn = (kind, value, name) => `<button type="button" class="bk-btn tb-val" data-copy="${A(value)}" data-copy-label="${A(name + ' ' + kind)}" aria-label="Copy ${kind} ${A(value)}, ${A(name)}"><span class="bk-btn__t">${A(value)}</span></button>`;
const dl = (f, label, text) => (f ? `<a class="tb-dl" href="${A(f.href)}" download aria-label="Download ${A(label)}, ${A(f.ext)}, ${A(f.sizeText)}">${A(text || f.ext)}</a>` : '');

// The page's one big line, fitted by the theme's rule (sentence ends first, then the largest size that holds the line count) twice: once for the
// wide ticket body and once for a phone. The lines are explicit, so the count laid out is the count that renders; the size then scales with the
// box (cqw), so a line can only get smaller than the box, never wider.
function fitTwo(ctx, text, { wide, narrow }) {
  const W = fitLines(ctx, text, wide), N = fitLines(ctx, text, narrow);
  const lines = (f) => f.lines.map((l) => `<span class="tb-ln">${A(l)}</span>`).join('');
  return `<span class="tb-fit tb-fit--w" style="font-size:min(${W.size}px,${(W.size / wide.w * 100).toFixed(3)}cqw)">${lines(W)}</span>`
    + `<span class="tb-fit tb-fit--n" style="font-size:min(${Math.round(N.size * 1.5)}px,${(N.size / narrow.w * 100).toFixed(3)}cqw)">${lines(N)}</span>`;
}
// several lines that share one size (a set list): the smallest of their fits, so they read as one column
function fitSet(ctx, texts, { wide, narrow }) {
  const sizeW = Math.min(...texts.map((t) => fitLines(ctx, t, wide).size)), sizeN = Math.min(...texts.map((t) => fitLines(ctx, t, narrow).size));
  return texts.map((t) => {
    const W = fitLines(ctx, t, { ...wide, max: sizeW, min: sizeW }), N = fitLines(ctx, t, { ...narrow, max: sizeN, min: sizeN });
    const lines = (f) => f.lines.map((l) => `<span class="tb-ln">${A(l)}</span>`).join('');
    return `<span class="tb-fit tb-fit--w" style="font-size:min(${sizeW}px,${(sizeW / wide.w * 100).toFixed(3)}cqw)">${lines(W)}</span><span class="tb-fit tb-fit--n" style="font-size:min(${Math.round(sizeN * 1.5)}px,${(sizeN / narrow.w * 100).toFixed(3)}cqw)">${lines(N)}</span>`;
  });
}

// ---- the ticket ----
// body: the section's one thing. stub: the chrome, or a small ticket's action. The perforation and the notches are cut through to the bar top,
// so they take the page ground in either mode; they are drawn by CSS (lane-bk-css.js).
function ticket(ctx, R, { body, stub, cls = '', bg, ink, label = '' }) {
  const style = bg ? ` style="--tk:${bg};--tk-ink:${ink}"` : '';
  return `<div class="tb-tk ${cls}"${style}${label}><div class="tb-tk__body">${body}</div><div class="tb-tk__stub"><i class="tb-notch tb-notch--a" aria-hidden="true"></i><i class="tb-notch tb-notch--b" aria-hidden="true"></i>${stub}</div></div>`;
}
// the section stub: the brand and the document, the section's name, No. and the serial (the section's place in the nav), and a barcode of it
function sectionStub(ctx, id, { heading = true } = {}) {
  const B = ctx.brand, serial = serialOf(id), code = `${slugOf(ctx)}-${serial}`;
  const bc = barcodeRects(code, 0, 0, 192, 24, 'currentColor');
  const title = heading ? `<h2 class="tb-stub__h" id="h-${id}">${A(titleOf(id))}</h2>` : `<p class="tb-stub__h">${A(titleOf(id))}</p>`;
  return `<div class="tb-stub__top"><p class="tb-b">${A(B.name)}</p><p class="tb-s">Brand book ${A(B.version.number)}</p></div>
<div class="tb-stub__sec">${title}</div>
<div class="tb-stub__no"><p class="tb-b">No.</p><p class="tb-serial disp">${serial}</p></div>
<div class="tb-stub__bc"><svg class="tb-bc" viewBox="0 0 ${bc.width.toFixed(2)} 24" width="${bc.width.toFixed(2)}" height="24" role="img" aria-label="Barcode, ${A(code)}">${bc.svg}</svg><p class="tb-code">${A(code)}</p></div>`;
}
const opener = (ctx, R, id, body, { cls = '', heading = true } = {}) => ticket(ctx, R, { body, stub: sectionStub(ctx, id, { heading }), cls: `tb-tk--open ${cls}` });

// a small ticket printed in the ground's opposite (Stock on Night, Night on Stock), its stub holding one action
const takeaway = (ctx, R, title, body, action, cls = '') => ticket(ctx, R, { body: `<h3 class="tb-h4">${title}</h3>${body}`, stub: `<div class="tb-stub__act">${action}</div>`, cls: `tb-tk--s tb-tk--inv ${cls}` });

// a logo in the colourway made for a ground; the slot edition draws the labelled frame at the same proportion
const fitW = (ctx, id, maxW, maxH) => { const g = ctx.logo.geos[id]; return Math.floor(Math.min(maxW, (maxH * g.w) / g.h)); };
const logoOn = (ctx, R, id, ground, maxW, maxH, label = 'Logo') => {
  const cw = ctx.brand.logo.colourways[R.colourwayOn(ground)], g = ctx.logo.geos[id];
  return `<span class="tb-logo" style="--lw:${fitW(ctx, id, maxW, maxH)}px;aspect-ratio:${g.w.toFixed(2)}/${g.h.toFixed(2)}">${ctx.logo.html(id, { width: fitW(ctx, id, maxW, maxH), colourway: R.colourwayOn(ground), color: cw.name, label })}</span>`;
};
// the same logo for the ground of each mode: the bar top after dark, the paper in daylight
const logoBoth = (ctx, R, id, maxW, maxH) => `<span class="tb-for-dark">${logoOn(ctx, R, id, R.table, maxW, maxH)}</span><span class="tb-for-light">${logoOn(ctx, R, id, ctx.roles.light.surface, maxW, maxH)}</span>`;

const rows = (items) => `<dl class="tb-rows">${items.map(([k, v]) => `<div class="tb-row"><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>`;
const rules = (list) => `<ul class="tb-rules">${list.map((r) => `<li><p class="tb-rules__do"><b>Do</b> ${A(r.do)}</p><p class="tb-rules__dont"><b>Don't</b> ${A(r.dont)}</p></li>`).join('')}</ul>`;
const h3 = (t) => `<h3 class="tb-h3">${t}</h3>`;

// ---- 1 Overview: the act ticket. The promoter's mark small at the top, the brand's line as the act, the rest on the bar top ----
function overview(ctx, R) {
  const B = ctx.brand, line = B.lines.primary;
  const body = `<div class="tb-cover__logo">${logoOn(ctx, R, 'colour', R.field, 260, 72, 'Logo')}</div>
<h1 class="tb-big disp" id="h-overview">${fitTwo(ctx, line, { wide: { w: 864, max: 128, min: 56, maxLines: 2 }, narrow: { w: 300, max: 64, min: 36, maxLines: 4 } })}</h1>
<p class="tb-cover__foot">${A(B.lines.others[0] || '')}</p>`;
  const meta = rows([['Version', A(B.version.number)], ['Issued', A(ctx.date)], ['From', A(B.city || '')]]);
  const traits = `<ol class="tb-order">${B.personality.map((p) => `<li><p class="tb-order__k disp">${A(p.trait)}</p><p class="tb-order__v">${A(p.means)}</p></li>`).join('')}</ol>`;
  return sec('overview', `${opener(ctx, R, 'overview', body, { cls: 'tb-tk--hero', heading: false })}
<div class="tb-zone">
<div class="tb-main"><p class="tb-lead">${A(B.description)}</p></div><aside class="tb-side">${meta}</aside>
<div class="tb-main tb-pair"><div>${h3('What it does')}<p class="tb-p">${A(B.product)}</p></div><div>${h3('Who it serves')}<p class="tb-p">${A(B.audience)}</p></div></div>
<div class="tb-main tb-gap">${h3('How it behaves')}${traits}</div>
</div>`);
}

// ---- 2 Voice: the four rules as a set list on the ticket, then write this and not that, and the boilerplate to take away ----
function voice(ctx, R) {
  const B = ctx.brand, V = B.voice;
  const ex = fitSet(ctx, V.principles.map((p) => p.example), { wide: { w: 640, max: 56, min: 26, maxLines: 1 }, narrow: { w: 300, max: 40, min: 22, maxLines: 2 } });
  const body = `<ol class="tb-set">${V.principles.map((p, i) => `<li><p class="tb-set__k">${A(p.title)}</p><p class="tb-set__v disp">${ex[i]}</p></li>`).join('')}</ol>`;
  const wtn = `<ul class="tb-wtn">${V.writeThis.map((r) => `<li><p class="tb-wtn__w">${A(r.write)}</p><p class="tb-wtn__n"><b>Not</b> ${A(r.not)}</p><p class="tb-wtn__b">${A(r.because)}</p></li>`).join('')}</ul>`;
  const lines = [B.lines.primary, ...B.lines.others];
  return sec('voice', `${opener(ctx, R, 'voice', body)}
<div class="tb-zone">
<div class="tb-main">${h3('Write this, not that')}${wtn}</div><aside class="tb-side"><p class="tb-note">The line to write first, the line it replaces under it, and why.</p></aside>
<div class="tb-full tb-take">
${takeaway(ctx, R, 'The brand in 25 words', `<p class="tb-say">${A(V.boilerplate25)}</p>`, copyBtn('Copy text', V.boilerplate25, '25-word boilerplate'), 'tb-take--a')}
${takeaway(ctx, R, 'The brand in 50 words', `<p class="tb-say">${A(V.boilerplate50)}</p>`, copyBtn('Copy text', V.boilerplate50, '50-word boilerplate'), 'tb-take--b')}
</div>
<div class="tb-main">${h3('Lines in use')}<ul class="tb-lines">${lines.map((l) => `<li class="disp">${A(l)}</li>`).join('')}</ul></div>
<div class="tb-main">${h3('Writing the name')}<p class="tb-p">${A(V.nameRules)}</p></div>
</div>`);
}

// ---- 3 Logo: the logo printed big on the ticket, then the versions as one sheet of tickets torn along perforations ----
function logo(ctx, R) {
  const B = ctx.brand, L = ctx.logo, cw = B.logo.colourways, slot = ctx.edition === 'slot';
  const body = `<div class="tb-logo-hero">${logoOn(ctx, R, 'colour', R.field, 760, 220, 'Logo')}</div><p class="tb-body-foot">${A(B.logo.idea)}</p>`;
  // the sheet: wide versions take two cells, so seven versions fill three rows of three
  const order = ['colour', 'symbol', 'mono-dark', 'mono-light', 'stacked', 'reversed', 'horizontal'].filter((id) => L.versions.includes(id));
  const wide = new Set(['colour', 'horizontal']);
  const cell = (id) => {
    const w = cw[L.colourwayOf(id)], ink = R.inkOn(w.ground, 13, 400, `book logo sheet ${id}`), name = `${L.labels[id]} logo`, files = ctx.book.logo(id);
    const g = L.geos[id], maxW = wide.has(id) ? 340 : 180, maxH = id === 'symbol' ? 96 : id === 'stacked' ? 110 : 80;
    const links = slot || !files ? '' : `<span class="tb-dls">${dl(files.svg, name)}${dl(files.png.find((p) => p.w === 1024), name + ', 1024 px wide', 'PNG')}${dl(files.pdf, name)}</span>`;
    return `<li class="tb-cell${wide.has(id) ? ' tb-cell--w' : ''}${ctx.ratio(w.ground, R.table) < 1.3 ? ' is-near-d' : ''}${ctx.ratio(w.ground, ctx.roles.light.surface) < 1.3 ? ' is-near-l' : ''}" style="background:${w.ground};color:${ink}">
<span class="tb-cell__lg"><span class="tb-logo" style="--lw:${fitW(ctx, id, maxW, maxH)}px;aspect-ratio:${g.w.toFixed(2)}/${g.h.toFixed(2)}">${L.html(id, { width: fitW(ctx, id, maxW, maxH), color: w.name, label: 'Logo' })}</span></span>
<span class="tb-cell__cap"><b>${A(L.labels[id])}</b><span>${A(B.logo.when[id] || '')}</span></span>${links}</li>`;
  };
  const g = L.geo, pad = (L.clearShare / 100) * 100 * g.height / g.width, ms = L.minSize;
  const clear = `<figure class="tb-clear"><div class="tb-clear__box" style="padding:${pad.toFixed(3)}%">${logoBoth(ctx, R, 'colour', 360, 120)}</div><figcaption class="tb-p">Keep ${L.clearShare}% of the logo&rsquo;s height clear on every side. Nothing else enters the dashed line.</figcaption></figure>`;
  const min = slot
    ? `<p class="tb-p">Set the smallest size once the logo is in place, the width at which every part of it still reads as one mark.</p>`
    : `<div class="tb-min">${logoBoth(ctx, R, 'colour', ms.screenPx, 200)}<p class="tb-p"><span class="m">${ms.screenPx} px</span> wide on screen. <span class="m">${ms.printMm} mm</span> wide in print. Never smaller.</p></div>`;
  const misuse = ['Do not stretch, squash or skew it.', 'Do not recolour it outside the versions above.', 'Do not rotate it.', 'Do not add shadows, glows or other effects.', 'Do not set it on a busy part of a photo.', 'Do not outline it or put it in a box.'];
  return sec('logo', `${opener(ctx, R, 'logo', body)}
<div class="tb-zone">
<div class="tb-main">${h3('The versions')}<p class="tb-p">Each version is printed on the ground it is made for. ${slot ? 'The frames hold the place and the proportion until the approved files go in the kit&rsquo;s logo folder.' : 'Download any one as SVG, PNG or PDF.'}</p></div>
<ul class="tb-full tb-sheet tb-sheet--logo">${order.map(cell).join('')}</ul>
<div class="tb-main tb-pair">${`<div>${h3('Clear space')}${clear}</div><div>${h3('Smallest size')}${min}</div>`}</div>
<div class="tb-main">${h3('Never')}<ul class="tb-never">${misuse.map((m) => `<li>${A(m)}</li>`).join('')}</ul></div>
</div>`);
}

// ---- 4 Colour: the palette as a strip of joined tickets, each as wide as its share; then each colour, the pairs, and the interface roles ----
function colour(ctx, R) {
  const B = ctx.brand, cols = ctx.colours.map((c, i) => ({ ...c, i })).sort((a, b) => b.share - a.share || a.i - b.i);
  const rgb = (hex) => { const [r, g, b] = ctx.C.hexToRgb(hex); return `rgb(${r}, ${g}, ${b})`; };
  // each segment is its share of the strip (the body's width, 100cqw). The share figures share one size, so they read as one row: the largest that fits
  // every segment, less the button's 40 px of padding, measured in the display face with 4% to spare. A figure that would come out under 24 px on the
  // full-width ticket (the strip's body is 944 px, unpadded) joins the small lines instead and leaves the shared size to the others
  const total = cols.reduce((n, c) => n + c.share, 0);
  const figs = cols.map((c) => { const pct = Math.round(c.share * 100), f = c.share / total, k = textWidth(ctx, 'display', `${pct}%`, 100, -0.015) / 100 * 1.04; return { pct, f, k, big: (f * 944 - 40) / k >= 24 }; });
  const pfs = `min(56px,${figs.filter((g) => g.big).map((g) => `calc((${(g.f * 100).toFixed(3)}cqw - 40px) / ${g.k.toFixed(3)})`).join(',') || '56px'})`;
  const seg = (c, i) => {
    const ink = R.inkOn(c.hex, 56, 400, `book colour strip ${c.name}`), { pct, big } = figs[i];
    const fig = big ? `<span class="tb-seg__p disp">${pct}%</span>` : `<span class="tb-seg__h m">${pct}%</span>`;
    const near = `${R.nearTable(c.hex) ? ' is-near' : ''}${ctx.ratio(c.hex, ctx.roles.light.surface) < 1.3 ? ' is-near-l' : ''}`;
    return `<li class="tb-seg${near}" style="--share:${pct};background:${c.hex};color:${ink}"><button type="button" class="tb-seg__b" data-copy="${c.hex}" data-copy-label="${A(c.name)} HEX ${c.hex}" aria-label="Copy HEX ${c.hex}, ${A(c.name)}"><span class="tb-seg__n">${A(c.name)}</span><span class="tb-seg__h m">${c.hex}</span>${fig}</button></li>`;
  };
  const body = `<ul class="tb-strip" style="--pfs:${pfs}">${cols.map(seg).join('')}</ul>`;
  const vals = (c) => `<dl class="tb-vals"><div><dt>HEX</dt><dd>${valBtn('HEX', c.hex, c.name)}</dd></div><div><dt>RGB</dt><dd>${valBtn('RGB', rgb(c.hex), c.name)}</dd></div><div><dt>OKLCH</dt><dd>${valBtn('OKLCH', c.oklch || ctx.C.oklchString(c.hex), c.name)}</dd></div>${ctx.C.cmykOf(c) ? `<div><dt>CMYK</dt><dd>${valBtn('CMYK', ctx.C.cmykOf(c), c.name)}</dd></div>` : ''}</dl>`;
  const ramp = (c) => (c.ramp && c.rampBase !== 50 ? `<ol class="tb-ramp" aria-label="${A(c.name)} ramp, lightest to darkest">${Object.entries(c.ramp).map(([k, hx]) => `<li${+k === c.rampBase ? ' class="is-base"' : ''}><button type="button" style="background:${hx}" data-copy="${hx}" data-copy-label="${A(c.name)} ${k} HEX ${hx}" aria-label="Copy HEX ${hx}, ${A(c.name)} ${k}"></button></li>`).join('')}</ol>` : '');
  const entry = (c) => `<li class="tb-col"><span class="tb-col__chip${R.nearTable(c.hex) ? ' is-near-d' : ''}${ctx.ratio(c.hex, ctx.roles.light.surface) < 1.3 ? ' is-near-l' : ''}" style="background:${c.hex}" aria-hidden="true"></span><div class="tb-col__t"><h4 class="tb-col__n disp">${A(c.name)}</h4><p class="tb-p">${A(c.lands)}</p>${vals(c)}${ramp(c)}</div></li>`;
  const pair = (p) => `<li class="tb-cell tb-cell--pair${R.nearTable(p.bgHex) ? ' is-near-d' : ''}${ctx.ratio(p.bgHex, ctx.roles.light.surface) < 1.3 ? ' is-near-l' : ''}" style="background:${p.bgHex};color:${p.fgHex}"><span class="tb-pair__r disp">${A(p.ratioText)}&thinsp;:&thinsp;1</span><span class="tb-pair__u${p.large ? ' tb-pair__u--lg disp' : ''}">${A(p.use)}</span></li>`;
  const roleKeys = [['surface', 'Surface'], ['raised', 'Raised'], ['text', 'Text'], ['quiet', 'Quiet text'], ['border', 'Border'], ['action', 'Action'], ['actionLabel', 'Action label'], ['focus', 'Focus']];
  const toneKeys = [['success', 'Success'], ['warning', 'Warning'], ['danger', 'Danger'], ['info', 'Info']];
  const roleList = (mode) => {
    const r = ctx.roles[mode];
    const items = [...roleKeys.map(([k, n]) => [n, r[k]]), ...toneKeys.map(([k, n]) => [n, r[k].fg])];
    return `<ul class="tb-roles tb-for-${mode === 'light' ? 'light' : 'dark'}">${items.map(([n, hx]) => `<li><span class="tb-roles__sw" style="background:${hx}" aria-hidden="true"></span><span class="tb-roles__n">${A(n)}</span>${valBtn('HEX', hx, `${mode} ${n}`)}</li>`).join('')}</ul>`;
  };
  return sec('colour', `${opener(ctx, R, 'colour', body, { cls: 'tb-tk--strip' })}
<div class="tb-zone">
<div class="tb-main"><p class="tb-lead">Each ticket in the strip is as wide as that colour&rsquo;s share of a page. Press one to copy its HEX.</p></div>
<ul class="tb-main tb-cols">${cols.map(entry).join('')}</ul>
${ctx.tones.length ? `<div class="tb-main">${h3('Tones')}<ul class="tb-cols tb-cols--tones">${ctx.tones.map(entry).join('')}</ul></div>` : ''}
<div class="tb-main">${h3('Contrast, pair by pair')}<p class="tb-p">Every text pair ${A(B.name)} uses, set in its own colours with its WCAG ratio. Text needs 4.5&thinsp;:&thinsp;1, and type at 24&nbsp;px and over needs 3&thinsp;:&thinsp;1.</p></div>
<ul class="tb-full tb-sheet tb-sheet--pairs">${ctx.pairs.map(pair).join('')}</ul>
<div class="tb-main">${h3('Interface roles')}<p class="tb-p">The colour each job takes in the product. The Light and Dark switch at the top shows the other set.</p>${roleList('light')}${roleList('dark')}</div>
</div>`);
}

// ---- 5 Typography: the faces on the ticket, then a ticket you can print your own line on, the scale as a running order, and the rules ----
function typography(ctx, R) {
  const B = ctx.brand, F = B.fonts, T = B.type, W = ctx.weights;
  const stretch = F.display.stretch || 100;
  const faceRow = (f, cls, style, note) => `<li><p class="tb-face__n ${cls}" style="${style}">${A(f.family)}</p><p class="tb-face__d">${note}</p></li>`;
  const ws = (f) => f.weights.map(weightName).join(', ');
  const body = `<div class="tb-type"><p class="tb-aa disp" aria-hidden="true">Aa</p><ul class="tb-faces">
${faceRow(F.display, 'disp', '', `Display. ${A(ws(F.display))}. For the one big line.`)}
${faceRow(F.body, '', `font-family:var(--body);font-weight:${W.semibold || 600}`, `Text. ${A(ws(F.body))}. For everything you read.`)}
${faceRow(F.mono, '', `font-family:var(--mono);font-weight:${F.mono.weights[0]}`, 'Mono. For a ticket code or a hex only.')}
</ul></div>`;
  const fams = [F.display.family, F.body.family, F.mono.family].filter((f, i, a) => a.indexOf(f) === i);
  const tester = ticket(ctx, R, {
    cls: 'tb-tk--tester', label: ' data-tester',
    body: `<h3 class="tb-h4">Try a line</h3><p class="tb-tester__out disp" data-tester-out aria-hidden="true">${A(T.sample.headline)}</p>`,
    stub: `<div class="tb-field"><label for="tester-text">Your line</label><input id="tester-text" type="text" value="${A(T.sample.headline)}" data-tester-text data-default="${A(T.sample.headline)}" autocomplete="off" spellcheck="false"></div>
<div class="tb-field"><label for="tester-size">Size <output for="tester-size" data-tester-value class="m">72 px</output></label><input id="tester-size" type="range" min="16" max="144" step="1" value="72" data-tester-size></div>`,
  });
  const scale = `<ol class="tb-scale">${T.scale.map((s) => {
    const disp = s.face === 'display';
    const st = disp ? `font-family:var(--display);font-stretch:${stretch}%;letter-spacing:-0.015em;` : 'font-family:var(--body);';
    return `<li><div class="tb-scale__k"><p class="tb-b">${A(ctx.cap(s.token))}</p><p class="tb-s"><span class="m">${s.size} px</span>, line <span class="m">${s.line}</span>, ${A(weightName(s.weight))}</p><p class="tb-s">${A(s.use)}</p></div><p class="tb-scale__s" style="${st}font-weight:${s.weight};line-height:${s.line};--size:${s.size}">${A(disp ? T.sample.headline : T.sample.paragraph)}</p></li>`;
  }).join('')}</ol>`;
  return sec('typography', `${opener(ctx, R, 'typography', body)}
<div class="tb-zone">
<div class="tb-main"><p class="tb-chars disp" aria-label="The character set">ABCDEFGHIJKLMNOPQRSTUVWXYZ<br>abcdefghijklmnopqrstuvwxyz 0123456789</p></div>
<aside class="tb-side"><p class="tb-note">${A(listAnd(fams))} ${fams.length > 1 ? 'are' : 'is'} open source under the SIL Open Font Licence: free in print and on screen.</p></aside>
<div class="tb-full">${tester}</div>
<div class="tb-main">${h3('The scale')}${scale}</div>
<div class="tb-main">${h3('In use')}<div class="tb-inuse"><p class="tb-inuse__h disp">${A(T.sample.headline)}</p><p class="tb-inuse__p">${A(T.sample.paragraph)}</p><p class="tb-s">${A(T.sample.caption)}</p></div></div>
<div class="tb-main">${h3('Rules')}${rules(T.rules)}</div>
</div>`);
}

// ---- 6 Imagery: the first photograph printed on the ticket (or the direction, when the brand has no photographs yet), then the shot list ----
function imagery(ctx, R) {
  const B = ctx.brand, D = B.imagery.direction, shots = B.imagery.shots, first = shots.find((s) => s.photo), hero = first || shots.find((s) => hasPlate(ctx, s));
  // a shot not yet taken shows a stand-in plate (plates.js) where the theme has one: the bar, the door, the queue
  const stand = shots.some((s) => hasPlate(ctx, s));
  const body = hero
    ? `<figure class="tb-ph-hero">${first ? ctx.photo(first.id, { cls: 'tb-ph', pos: '50% 45%' }) : shotPhoto(ctx, R, hero, 'tb-ph')}</figure>`
    : `<p class="tb-big disp">${fitTwo(ctx, D.subject.split(/(?<=[.!?])\s/)[0], { wide: { w: 864, max: 72, min: 36, maxLines: 4 }, narrow: { w: 300, max: 40, min: 24, maxLines: 6 } })}</p>`;
  const credited = new Set();
  const fig = (s, i) => {
    const f = s.photo ? ctx.book.find(`05 Imagery/photos/${s.photo.split('/').pop()}`) : null;
    // a generated sample photograph prints no credit; a real credit prints once on the page
    const credit = s.credit && !s.generated && !credited.has(s.credit) ? (credited.add(s.credit), ` Photo: ${A(s.credit)}.`) : '';
    const cap = s.photo ? `${A(s.caption || s.alt)}.${credit}` : A(s.slot);
    return `<li class="tb-shot${i === 0 ? ' tb-shot--lead' : ''}"><figure>${shotPhoto(ctx, R, s, 'tb-ph', { note: false })}<figcaption class="tb-s">${cap}${f ? ` ${dl(f, 'photo ' + (s.caption || s.id), 'Download JPG')}` : ''}</figcaption></figure></li>`;
  };
  return sec('imagery', `${opener(ctx, R, 'imagery', body, { cls: hero ? 'tb-tk--photo' : '' })}
<div class="tb-zone">
<div class="tb-main"><p class="tb-lead">${A(hero ? D.subject : D.subject.split(/(?<=[.!?])\s/).slice(1).join(' ') || D.subject)}</p></div>
<div class="tb-main">${rows([['Light', A(D.light)], ['Crop', A(D.crop)], ['Colour', A(D.colour)], ['People', A(D.people)]])}</div>
<div class="tb-main">${h3('The shot list')}<p class="tb-p">${shots.some((s) => s.photo) ? 'The photographs in the kit, each with its caption.' : (stand ? 'No photographs yet. Each frame is a stand-in for one shot, and its caption is the brief: who, where, the crop and the light.' : 'No photographs yet. Each frame is the brief for one shot: who, where, the crop and the light.')}</p></div>
<ul class="tb-full tb-shots">${shots.map(fig).join('')}</ul>
<div class="tb-main">${h3('Rules')}${rules(B.imagery.rules)}</div>
</div>`);
}

// ---- 7 Layout: the grid drawn in ink on the ticket beside its column count; then the measures, the spacing scale and the corners ----
function layout(ctx, R) {
  const G = ctx.gridMeasures, B = ctx.brand;
  const m = (G.margin / G.page.w) * 100, inner = G.page.w - 2 * G.margin, gap = (G.gutter / inner) * 100;
  const cols = Array.from({ length: G.columns }, () => '<i></i>').join('');
  const col = String(Math.round(G.col * 10) / 10);
  const body = `<div class="tb-grid"><div class="tb-grid__page" role="img" aria-label="The page grid: ${G.columns} columns, ${G.margin} pixel margins, ${G.gutter} pixel gutters, on a ${G.page.w} by ${G.page.h} page" style="aspect-ratio:${G.page.w}/${G.page.h};padding:${(m * G.page.w / G.page.w).toFixed(3)}%"><div class="tb-grid__cols" style="column-gap:${gap.toFixed(3)}%;grid-template-columns:repeat(${G.columns},minmax(0,1fr))">${cols}</div></div>
<div class="tb-grid__n"><p class="tb-grid__big disp">${G.columns}</p><p class="tb-grid__w">columns on a <span class="m">${G.page.w} × ${G.page.h}</span> page</p></div></div>`;
  const meas = `<dl class="tb-meas"><div><dt>Margin</dt><dd class="disp">${G.margin}<span> px</span></dd></div><div><dt>Gutter</dt><dd class="disp">${G.gutter}<span> px</span></dd></div><div><dt>Column</dt><dd class="disp">${col}<span> px</span></dd></div><div><dt>Base</dt><dd class="disp">${G.base}<span> px</span></dd></div></dl>`;
  const space = `<ol class="tb-space">${ctx.space.map((s) => `<li><i style="width:${s.px}px;height:${s.px}px" aria-hidden="true"></i><span class="m">${s.px}</span></li>`).join('')}</ol>`;
  const radii = ctx.radii.filter((r) => r.px < 9999);
  return sec('layout', `${opener(ctx, R, 'layout', body)}
<div class="tb-zone">
<div class="tb-full">${meas}</div>
<div class="tb-main tb-pair"><div>${h3('Spacing')}<p class="tb-p">Every gap is a step of ${G.base} px. Space inside a group is smaller than the space between groups.</p>${space}</div>
<div>${h3('Corners and edges')}<p class="tb-p">Edges are <span class="m">${B.ui.border} px</span>. ${A(B.ui.elevationNote)}</p><ul class="tb-radii">${radii.map((r) => `<li><i style="border-radius:${r.px}px" aria-hidden="true"></i><span class="tb-s">${A(r.use)}, <span class="m">${r.px} px</span></span></li>`).join('')}</ul></div></div>
</div>`);
}

// ---- 8 Applications: the poster and the ticket photographed in place, printed on the ticket's body, then the pieces themselves ----
// The book draws its own photographs (lane-bk-apps.js, where the scene ids live) and carries them inside the file. Each photograph is shown through its
// window of the scene, cut to fill its cell (a size container), so the pair fills the body at any width; a print that can't be drawn keeps its cell as a frame.
function applications(ctx, R) {
  const B = ctx.brand, L = ctx.logo, ap = B.applications, S = B.ui.screen.content, cw = B.logo.colourways;
  const photos = appPhotos(ctx, R), shown = photos.filter((p) => !p.frame), pc = (n) => `${(n * 100).toFixed(3)}%`;
  const cell = (p) => {
    const r = p.win.w / p.win.h, at = `--r:${r.toFixed(4)}`;
    if (p.frame) return `<div class="tb-app tb-app--frame" style="${at}"><p class="tb-b">${A(ctx.cap(p.what))}</p><p class="tb-s">Photograph to come</p></div>`;
    const img = `${plateImg(`${p.src}`, ``, `left:${pc(-p.win.x / p.win.w)};top:${pc(-p.win.y / p.win.h)};width:${pc(p.si.w / p.win.w)};height:${pc(p.si.h / p.win.h)}`)}`;
    return `<div class="tb-app" style="${at}" role="img" aria-label="${A(`${B.name} ${p.what}`)}"><div class="tb-app__win">${img}${p.over}</div></div>`;
  };
  const body = `<div class="tb-apps" style="--apps-cols:${photos.map((p) => `minmax(0,${(p.win.w / p.win.h).toFixed(4)}fr)`).join(' ')}">${photos.map(cell).join('')}</div>`;
  const R0 = ctx.roles.light, rev = cw[R.colourwayOn(R.table)];
  ctx.pair(R.fieldInk, R.field, { size: 13, what: 'book business card' });
  const front = `<div class="tb-card" style="background:${R.field};color:${R.fieldInk}" role="img" aria-label="Business card, front: the logo and the line ${A(B.lines.primary)}"><span class="tb-card__lg">${logoOn(ctx, R, 'colour', R.field, 200, 64)}</span><p class="tb-card__l">${A(B.lines.primary)}</p></div>`;
  const back = `<div class="tb-card tb-card--back" style="background:${rev.ground};color:${R.inkOn(rev.ground, 13, 400, 'book business card back')}"><p class="tb-card__nm">${A(ap.card.person)}</p><p>${A(ap.card.role)}</p><p class="tb-card__ct">${A(ap.card.contact)}<br>${A(ap.site.url)}</p></div>`;
  const posts = `<ul class="tb-posts">${ap.social.map((t, i) => {
    const bg = i === 1 ? R.table : R.field, ink = i === 1 ? R.paper : R.fieldInk;
    ctx.pair(ink, bg, { size: 24, what: 'book social post' });
    return `<li class="tb-post${i === 1 ? ' is-night' : ''}" style="background:${bg};color:${ink}"><p class="disp">${A(t)}</p><span class="tb-post__lg">${logoOn(ctx, R, 'colour', bg, 104, 28)}</span></li>`;
  }).join('')}</ul>`;
  const email = `<div class="tb-email"><p class="tb-email__n">${A(ap.email.person)}</p><p>${A(ap.email.role)}, ${A(B.name)}</p><p class="tb-s">${A(ap.card.contact)}<br>${A(ap.site.url)}</p><div class="tb-email__l">${logoBoth(ctx, R, 'horizontal', 168, 40)}</div></div>`;
  const rowsS = S.deliveries.slice(0, 3);
  const screen = `<div class="tb-device"><div class="ui tb-screen" role="img" aria-label="${A(B.name)} product screen: ${A(S.eta)}. ${A(S.rider)}, ${A(S.riderNote)}." inert>
<div class="tb-scr__top"><span class="ui-num">${A(S.time)}</span>${ctx.ui.statusChip(rowsS[0] ? rowsS[0].status : 'on-sale')}</div>
<p class="ui-display tb-scr__eta">${A(S.eta)}</p><p class="tb-scr__note">${A(S.pickup)}</p>
<div class="ui-progress"><div class="ui-progress__bar"><i style="width:${S.progress * 100}%"></i></div><span class="ui-progress__dot" style="left:${S.progress * 100}%"></span></div>
<div class="tb-scr__ft"><span>${A(S.from)}</span><span>${A(S.to)}</span></div>
<ul class="ui-list">${ctx.ui.row({ lead: `<span class="ui-avatar">${A(S.initials)}</span>`, title: S.rider, sub: S.riderNote, endHtml: ctx.ui.btn(S.call, { variant: 'secondary', size: 'sm' }) })}</ul>
<ul class="ui-list">${rowsS.map((d) => ctx.ui.row({ title: d.to, sub: d.when, end: d.price, chip: ctx.ui.statusChip(d.status) })).join('')}</ul>
</div></div>`;
  const piece = (title, note, inner, cls = '') => `<div class="tb-piece ${cls}"><div class="tb-piece__k">${h3(title)}<p class="tb-s">${note}</p></div><div class="tb-piece__v">${inner}</div></div>`;
  return sec('applications', `${opener(ctx, R, 'applications', body, { cls: 'tb-tk--photo tb-tk--apps' })}
<div class="tb-zone">
<div class="tb-main"><p class="tb-lead">${shown.length ? `${A(ctx.cap(listAnd(shown.map((p) => `the ${p.what}`))))}. ` : ''}The brand at work: a card, a feed, an inbox and the product itself.</p></div>
<div class="tb-full tb-pieces">
${piece('Business card', '90 × 55 mm, front and back.', `<div class="tb-cards">${front}${back}</div>`)}
${piece('Social', 'The brand&rsquo;s lines, one to a post.', posts)}
${piece('Email signature', 'Name, role, contact and the horizontal logo.', email)}
${piece('Product screen', A(B.ui.screen.title || 'The product'), screen, 'tb-piece--screen')}
</div>
</div>`);
}

// ---- 9 Downloads: the kit as one ticket whose stub is the download; each folder below as a line on the door list ----
function downloads(ctx, R) {
  const D = ctx.book, L = ctx.logo, slot = ctx.edition === 'slot';
  const zipTk = ticket(ctx, R, {
    cls: 'tb-tk--zip',
    body: `<h3 class="tb-zip__n disp">The kit</h3><p class="tb-zip__d">Every folder below in one zip. <span class="m">${A(D.zip.name)}</span>, <span class="m">${A(D.zip.sizeText)}</span>.</p>`,
    stub: `<div class="tb-stub__act"><a class="bk-btn tb-btn tb-btn--prime" href="${A(D.zip.href)}" download aria-label="Download ${A(D.zip.name)}, ${A(D.zip.sizeText)}"><span class="bk-btn__t">Download the kit</span></a></div>`,
  });
  const file = (f, note = '') => `<li class="tb-file"><span class="tb-file__n">${A(f.name)}</span><span class="tb-s">${note ? A(note) + '. ' : ''}<span class="m">${A(f.ext)}, ${A(f.sizeText)}</span></span><a class="tb-dl" href="${A(f.href)}" download aria-label="Download ${A(f.name)}">Download</a></li>`;
  const files = (list) => `<ul class="tb-files">${list.filter(Boolean).map((f) => file(f)).join('')}</ul>`;
  const logoRows = slot ? files(D.logoFiles)
    : `<ul class="tb-files">${L.versions.map((id) => { const f = D.logo(id); return `<li class="tb-file"><span class="tb-file__n">${A(L.labels[id])}</span><span class="tb-dls">${dl(f.svg, L.labels[id] + ' logo')}${dl(f.pdf, L.labels[id] + ' logo')}${f.png.map((p) => dl(p, `${L.labels[id]} logo, PNG, ${p.w} px wide`, `PNG ${p.w}`)).join('')}</span></li>`; }).join('')}</ul>`;
  const icons = `<ul class="tb-icons">${D.icons.map((f) => `<li><a class="tb-icon" href="${A(f.href)}" download aria-label="Download ${A(f.name)} icon, SVG">${ctx.ui.icon(f.name.replace('.svg', ''), 24)}<span>${A(f.name.replace('.svg', ''))}</span></a></li>`).join('')}</ul>${files([D.iconsLicence])}`;
  const photos = D.imagery.filter((f) => f.rel.startsWith('05 Imagery/photos/')), pdfs = D.imagery.filter((f) => f.ext === 'PDF');
  const group = (title, what, inner) => `<li class="tb-group"><div class="tb-group__k"><h3 class="tb-group__n disp">${A(title)}</h3><p class="tb-s">${A(what)}</p></div><div class="tb-group__v">${inner}</div></li>`;
  const body = `<p class="tb-big disp">${fitTwo(ctx, 'Take the kit.', { wide: { w: 864, max: 160, min: 64, maxLines: 1 }, narrow: { w: 300, max: 80, min: 40, maxLines: 2 } })}</p><p class="tb-body-foot">Logo, colour, type, icons and imagery, ready for print and screen.</p>`;
  return sec('downloads', `${opener(ctx, R, 'downloads', body)}
<div class="tb-zone">
<div class="tb-full">${zipTk}</div>
<ol class="tb-full tb-groups">
${group('Read me', 'Start here: what is in the kit and how to use it.', files([D.readmePdf, D.readme]))}
${group('Logo', slot ? 'The labelled slot frame, and where the approved files go.' : 'Each version as SVG and PDF, and as PNG at three widths, transparent.', logoRows)}
${group('Colour', 'The palette for Adobe, CSS and JSON, and a swatch sheet.', files(D.colour))}
${group('Type', 'The specimen sheet, and the faces with their links and licence.', files(D.type))}
${group('Icons', `${D.icons.length} interface icons, drawn in the brand's stroke.`, icons)}
${group('Imagery', photos.length ? 'The photography direction, and the photos.' : 'The photography direction and shot list.', files([...pdfs, ...photos]))}
</ol>
</div>`);
}

export function brandBook(ctx) {
  if (!ctx.book) throw new Error('brandBook needs ctx.book (set by the engine book builder)');
  const R = roles(ctx);
  return [overview, voice, logo, colour, typography, imagery, layout, applications, downloads].map((f) => f(ctx, R)).join('\n');
}
