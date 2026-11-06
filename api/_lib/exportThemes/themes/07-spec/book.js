// Brand book markup for theme 07 (Specification): the brand book as a standards document on the web. A contents column,
// then each section a sheet with a running head, numbered clauses (4.3) hung in a left margin column, requirement words
// (shall, shall not), ledger tables, numbered figures (Figure 3.2) and a full contrast matrix. Mono only on literal values.
// The engine wraps these in the shell (skip link, section nav, light and dark switch) and adds the behaviour:
// data-copy, data-tester-*. Section order and ids are the engine's BOOK_SECTIONS, so section n is also the nav number.
import { A, mono, nameOf, fit } from './helpers.js';

const rgbOf = (ctx, hex) => { const [r, g, b] = ctx.C.hexToRgb(hex); return `rgb(${r}, ${g}, ${b})`; };
const hairlineOn = (ctx, hex) => hex.toLowerCase() === ctx.roles.light.surface.toLowerCase();

// a copy button: visible text is the action, the accessible name says what it copies
const copyBtn = (text, value, what, cls = '') => `<button type="button" class="bk-btn ${cls}" data-copy="${A(value)}" data-copy-label="${A(what)}" aria-label="${A(text + ' ' + what)}"><span class="bk-btn__t">${A(text)}</span></button>`;
const dl = (f, label) => (f ? `<a class="bk-dl" href="${A(f.href)}" download aria-label="Download ${A(label)}, ${A(f.ext)}, ${A(f.sizeText)}">${A(f.ext)}</a>` : '');
// a cross-reference that works as a link: "§4.4"
const ref = (id, text) => `<a class="bk-ref" href="#${id}">${A(text)}</a>`;
const sec = (id, cls, inner) => `<section class="bk-sec ${cls}" id="${id}" aria-labelledby="h-${id}">${inner}</section>`;
// the running head of a sheet, then the section title with its number
const rh = (ctx, n, title) => `<p class="bk-rh" aria-hidden="true"><span>${A(ctx.brand.name)} brand book</span><span>§${n} ${A(title)}</span></p>`;
const head = (ctx, n, id, title, lead) => `${rh(ctx, n, title)}<div class="bk-head"><h2 class="bk-h2" id="h-${id}"><span class="bk-sn" aria-hidden="true">§${n}</span>${A(title)}</h2>${lead ? `<p class="bk-lead">${lead}</p>` : ''}</div>`;
// numbered clauses inside a section: clauses(n) gives a function that numbers 2.1, 2.2, ... in order. The number hangs in the margin.
// Each clause is a link target (#cl-4-1), and its number links to itself so a reader can copy the address of any block.
const clId = (no) => `cl-${String(no).replace(/\./g, '-')}`;
const clauses = (n) => { let i = 0; return (title, inner, cls = '') => { i += 1; const no = `${n}.${i}`; return `<div class="bk-cl ${cls}" id="${clId(no)}"><h3 class="bk-cl__h"><a class="bk-cn bk-cn--a num" href="#${clId(no)}">${no}</a><span class="bk-cl__t">${A(title)}</span></h3>${inner}</div>`; }; };
// a cross-reference to a clause: "§4.1 Colour definitions"
const clRef = (no, title) => `<a class="bk-ref" href="#${clId(no)}">§${no}</a>${title ? ` <span class="bk-cap">${A(title)}</span>` : ''}`;
const subNo = (cell) => (String(cell).match(/class="[^"]*\bnum\b[^"]*">(\d+\.\d+\.\d+)<\/span>/) || [])[1];
// a ledger table. cols: [{ h, c?, row? }]; rows: arrays of cell html. Every cell carries its column name so the table can stack at narrow widths.
const table = (cls, label, cols, rows) => `<table class="bk-t ${cls}" aria-label="${A(label)}"><thead><tr>${cols.map((c) => `<th scope="col" class="${c.c || ''}">${A(c.h)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => { const k = subNo(r[0]); return `<tr${k ? ` id="${clId(k)}"` : ''}>${r.map((cell, i) => { const c = cols[i]; return c.row ? `<th scope="row" data-l="${A(c.h)}" class="${c.c || ''}">${cell}</th>` : `<td data-l="${A(c.h)}" class="${c.c || ''}">${cell}</td>`; }).join('')}</tr>`; }).join('')}</tbody></table>`;
// requirements: "n.m  Shall: ... / Shall not: ..." with the clause number in front of each
const requirements = (prefix, rules) => `<ul class="bk-rules">${rules.map((r, i) => `<li id="${clId(`${prefix}.${i + 1}`)}"><span class="bk-cn num">${prefix}.${i + 1}</span><p class="bk-do"><b>Shall</b>${A(r.do)}</p><p class="bk-dont"><b>Shall not</b>${A(r.dont)}</p></li>`).join('')}</ul>`;
// a numbered figure with its caption below: "Figure 3.2"
const fig = (n, i, inner, cap, cls = '') => `<figure class="bk-fg ${cls}"><div class="bk-fg__b">${inner}</div><figcaption class="bk-fg__c"><b class="num">Figure ${n}.${i}</b><span>${cap}</span></figcaption></figure>`;
// a width dimension line: ticks at both ends, a label on the line
const dimW = (w, label) => `<div class="bk-dw" style="width:${w}px"><span>${A(label)}</span></div>`;
const COPY_ICON = '<svg class="bk-val__i" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true" focusable="false"><rect x="3.5" y="3.5" width="7" height="7" rx="1" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M8.5 1.5h-6a1 1 0 0 0-1 1v6" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>';
const chipOf = (ctx, hex) => `<i class="bk-ch${hairlineOn(ctx, hex) ? ' is-hair' : ''}" style="background:${hex}" aria-hidden="true"></i>`;

function overview(ctx) {
  const B = ctx.brand, c = clauses(1);
  const rows = [['Document', `${A(B.name)} brand book`], ['Version', A(ctx.versionLine)], ['Covers', `${ref('voice', '§2 Voice')} to ${ref('downloads', '§9 Downloads')}`], ['City', A(B.city)], ['Brand team', `${A(B.contact.owner)}, ${mono(B.contact.email)}`]];
  return sec('overview', 'bk-sec--overview', `
${rh(ctx, 1, 'Overview')}
<div class="bk-hero"><h1 class="disp" id="h-overview">${A(B.lines.primary)}</h1></div>
<div class="bk-front"><dl class="bk-meta">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
<p class="bk-lead bk-lead--big">${A(B.description)}</p></div>
${c('What it does', `<p class="bk-body">${A(B.product)}</p>`)}
${c('Who it serves', `<p class="bk-body">${A(B.audience)}</p>`)}
${c('Personality', table('bk-pers', 'Personality traits', [{ h: 'Ref', c: 'bk-t__ref' }, { h: 'Trait', row: true }, { h: 'What it means in practice' }], B.personality.map((p, i) => [`<span class="num">1.3.${i + 1}</span>`, A(p.trait), A(p.means)])))}`);
}

function voice(ctx) {
  const B = ctx.brand, V = B.voice, c = clauses(2);
  const wtn = table('bk-wtn', 'Write this, not that', [{ h: 'Ref', c: 'bk-t__ref' }, { h: 'Write', c: 'w' }, { h: 'Not', c: 'n' }, { h: 'Because', c: 'b' }],
    V.writeThis.map((r, i) => [`<span class="num">2.3.${i + 1}</span>`, A(r.write), A(r.not), A(r.because)]));
  const bp = (words, text) => `<div class="bk-bpb"><p class="bk-bpb__h">${words} words</p><p class="bk-bp">${A(text)}</p>${copyBtn(ctx.edition === 'slot' ? 'Copy placeholder text' : 'Copy text', text, `${words}-word boilerplate`)}</div>`;
  return sec('voice', 'bk-sec--voice', `
${head(ctx, 2, 'voice', 'Voice', 'Four rules for how we write, each with a line from the brand.')}
${c('The line', `<div class="bk-defn"><p class="bk-bigline disp">${A(B.lines.primary)}</p>${B.lines.others.map((l) => `<p class="bk-line2 disp disp--sub">${A(l)}</p>`).join('')}</div><p class="bk-note">The line is a promise with a day in it. Use it only where a real install date follows.</p>`)}
${c('How we write', table('bk-pr4', 'Writing requirements', [{ h: 'Ref', c: 'bk-t__ref' }, { h: 'Rule', row: true }, { h: 'Example' }], V.principles.map((p, i) => [`<span class="num">2.2.${i + 1}</span>`, A(p.title), `<span class="bk-pe">${A(p.example)}</span>`])))}
${c('Write this, not that', wtn)}
${c('The brand in 25 and 50 words', `<div class="bk-bps">${bp(25, V.boilerplate25)}${bp(50, V.boilerplate50)}</div>`)}
${c('Writing the name', `<p class="bk-body">${A(V.nameRules)}</p>`)}`);
}

function logo(ctx) {
  const B = ctx.brand, L = ctx.logo, cw = B.logo.colourways, slot = ctx.edition === 'slot', c = clauses(3);
  const ids = ['colour', 'stacked', 'mono-dark', 'mono-light', 'reversed', 'symbol', 'horizontal'];
  const ms = L.minSize;
  const groundName = (hex) => { const k = [...ctx.colours, ...ctx.tones].find((x) => x.hex.toLowerCase() === hex.toLowerCase()); return k ? k.name : ''; };
  const rows = ids.map((id, i) => {
    const w = cw[L.colourwayOf(id)], files = ctx.book.logo(id), name = `${L.labels[id]} logo`;
    const render = `<div class="bk-ground${hairlineOn(ctx, w.ground) ? ' is-hair' : ''}" style="background:${w.ground}">${L.html(id, { width: fit(ctx, id, 150, 44), color: w.name, label: L.labels[id] })}</div>`;
    const links = slot ? '' : `<span class="bk-dls">${dl(files.svg, name)}${dl(files.png.find((p) => p.w === 1024), name + ', 1024 px wide')}</span>`;
    const file = slot ? '<span class="bk-cap">No file yet</span>' : `<span class="bk-file__n">${A(files.svg.name)}</span>`;
    return [`<div class="bk-vcell">${render}<p class="bk-vcell__n"><span class="bk-cn num">3.1.${i + 1}</span><b>${A(L.labels[id])}</b></p></div>`, file, `<span class="m">${A(w.ground)}</span><span class="bk-cap">${A(groundName(w.ground))}</span>`, `<span class="m">${ms.screenPx} px</span><span class="bk-cap">${ms.printMm} mm in print</span>`, A(B.logo.when[id]), links];
  });
  const vtable = table('bk-vt', 'Logo versions', [{ h: 'Version', c: 'bk-vt__v', row: true }, { h: 'File', c: 'bk-vt__f' }, { h: 'Ground' }, { h: 'Minimum size' }, { h: 'Use' }, { h: 'Download' }], rows);
  const g = L.geo, pad = Math.round((420 * g.height / g.width) * L.clearShare / 100);
  const x = `<b class="bk-xn">x</b>`;
  const clearFig = `<div class="bk-clear" style="padding:${pad}px"><div class="bk-clear__in" style="width:420px;max-width:100%">${L.html('colour', { width: 420 })}</div><i class="bk-x bk-xt" style="height:${pad}px">${x}</i><i class="bk-x bk-xb" style="height:${pad}px">${x}</i><i class="bk-x bk-xl" style="width:${pad}px">${x}</i><i class="bk-x bk-xr" style="width:${pad}px">${x}</i></div>`;
  const printPx = Math.round(ms.printMm * 3.7795);
  const minFig = `<div class="bk-min"><div class="bk-min__panel"><div class="bk-minfig" style="width:${ms.screenPx}px">${dimW(ms.screenPx, `${ms.screenPx} px`)}${L.html('colour', { width: ms.screenPx })}</div></div><div class="bk-min__panel"><div class="bk-minfig" style="width:${printPx}px">${dimW(printPx, `${ms.printMm} mm`)}${L.html('colour', { width: printPx })}</div></div></div>`;
  const minBlock = slot
    ? `<p class="bk-body">Set the smallest size once the logo is in place. Below that size the horizon line and the name stop reading as one mark.</p>`
    : `${fig(3, 3, minFig, 'The logo at its smallest: on screen, and in print. Both are drawn at actual size.')}`;
  const misuse = ['Do not stretch, squash or skew it.', 'Do not recolour it outside the versions above.', 'Do not rotate it, or tilt the horizon line.', 'Do not add shadows, glows or other effects.', 'Do not set it on a busy part of a photo.', 'Do not outline it or put it in a box.'];
  const dlSlot = slot ? `<p class="bk-note bk-measure">This book has no logo files yet. The frames above hold the place and the proportion. The brand kit's logo folder says where the approved files go.</p>` : '';
  return sec('logo', 'bk-sec--logo', `
${head(ctx, 3, 'logo', 'Logo', A(B.logo.idea))}
${c('Versions', `${vtable}${dlSlot}`)}
${c('Clear space', `${fig(3, 2, `<div class="bk-clearwrap">${clearFig}</div>`, `Keep ${L.clearShare}% of the logo's height clear on every side, marked <span class="bk-mk">x</span> in the drawing. Nothing enters that space: no type, no edge of the page, no other mark.`)}`)}
${c('Smallest size', minBlock + (slot ? '' : `<p class="bk-body bk-measure">${mono(ms.screenPx + ' px')} wide on screen. ${mono(ms.printMm + ' mm')} wide in print.</p>`))}
${c('Never', `<ol class="bk-never">${misuse.map((m, i) => `<li id="${clId(`3.4.${i + 1}`)}"><span class="bk-cn num">3.4.${i + 1}</span><span><b>Shall not.</b> ${A(m)}</span></li>`).join('')}</ol>`)}`);
}

function colour(ctx) {
  const B = ctx.brand, c = clauses(4);
  const def = (k, no, share) => {
    const rgb = rgbOf(ctx, k.hex), ok = k.oklch || ctx.C.oklchString(k.hex);
    const sw = share === undefined ? `<span class="bk-swc${hairlineOn(ctx, k.hex) ? ' is-hair' : ''}" style="background:${k.hex}" aria-hidden="true"></span>` : `<button type="button" class="bk-sw${hairlineOn(ctx, k.hex) ? ' is-hair' : ''}" style="background:${k.hex}" data-copy="${k.hex}" data-copy-label="${A(k.name)} HEX ${k.hex}" aria-label="Copy HEX ${A(k.hex)}, ${A(k.name)}"></button>`;
    // each value is its own copy button (the value, then an empty slot the engine fills with "Copied"), then one button copies all three
    const val = (kind, v) => `<div><dt>${kind}</dt><dd><button type="button" class="bk-val" data-copy="${A(v)}" data-copy-label="${A(k.name)} ${kind}" aria-label="Copy ${kind} ${A(v)}, ${A(k.name)}"><span class="m">${A(v)}</span>${COPY_ICON}<span class="bk-btn__t"></span></button></dd></div>`;
    return `<li class="bk-crow" id="${clId(no)}"><span class="bk-cn num">${no}</span><div class="bk-cdef"><p class="bk-cline">${sw}<span class="bk-cname">${A(k.name)}</span><span class="bk-crole">The ${A(k.roleText ?? k.role)} colour.</span></p><p class="bk-clands">${A(k.lands)}${share ? ` Share of a page: <span class="num">${Math.round(share * 100)}%</span>.` : ''}</p><dl class="bk-vals">${val('HEX', k.hex)}${val('RGB', rgb)}${val('OKLCH', ok)}</dl>${copyBtn('Copy all values', `HEX ${k.hex}\nRGB ${rgb}\nOKLCH ${ok}`, `${k.name} values`, 'bk-copyall')}</div></li>`;
  };
  const level = (r) => (r >= 7 ? 'AAA' : r >= 4.5 ? 'AA' : r >= 3 ? 'AA large' : 'Fail');
  // the contrast matrix: every brand colour as text (rows) on every brand colour as ground (columns)
  const texts = [...ctx.colours, ...ctx.tones.filter((t) => ctx.pairs.some((p) => p.fg === t.id))];
  const grounds = [...ctx.colours, ...ctx.tones];
  const usedSet = new Set(ctx.pairs.map((p) => p.fg + '>' + p.bg));
  const mcell = (f, g) => {
    if (f.id === g.id) return `<td class="bk-mx__c is-same"><span class="bk-cap">Same colour</span></td>`;
    const r = ctx.ratio(f.hex, g.hex), used = usedSet.has(f.id + '>' + g.id), lv = level(r);
    return `<td data-l="${A(g.name)}" class="bk-mx__c${used ? ' is-used' : ''}${lv === 'Fail' ? ' is-fail' : ''}"><span class="bk-mx__s${hairlineOn(ctx, g.hex) ? " is-hair" : ""}" style="background:${g.hex};color:${f.hex}" aria-hidden="true"><i></i><i></i></span><span class="bk-mx__r num">${A(ctx.C.fmt(r))} : 1</span><span class="bk-mx__l">${lv}</span>${used ? `<span class="bk-mx__u">Used</span>` : ""}</td>`;
  };
  const matrix = `<div class="bk-mxw" role="region" aria-label="Contrast matrix, text colour against ground colour" tabindex="0"><table class="bk-mx"><thead><tr><th scope="col" class="bk-mx__corner">Text on ground</th>${grounds.map((g) => `<th scope="col">${chipOf(ctx, g.hex)}<span>${A(g.name)}</span></th>`).join('')}</tr></thead><tbody>${texts.map((f) => `<tr><th scope="row">${chipOf(ctx, f.hex)}<span>${A(f.name)}</span></th>${grounds.map((g) => mcell(f, g)).join('')}</tr>`).join('')}</tbody></table></div>
<p class="bk-cap bk-mx__key"><span class="bk-mx__swatch" aria-hidden="true"></span>Outlined cells are the pairs ${A(B.name)} uses. Text needs 4.5 : 1 (AA). Type at 24 px and over needs 3 : 1 (AA large). Below 3 : 1 a pair fails.</p>`;
  const prow = (p, i) => [`<span class="num">4.4.${i + 1}</span>`, `<span class="bk-smp${p.large ? ' bk-smp--big' : ''}${hairlineOn(ctx, p.bgHex) ? ' is-hair' : ''}" style="background:${p.bgHex};color:${p.fgHex}" aria-hidden="true">Aa</span>`, `<span class="bk-pn">${A(nameOf(ctx, p.fg))} on ${A(nameOf(ctx, p.bg))}</span><span class="bk-pu">${A(p.use)}${p.large ? `, ${p.minSize} px and over` : ''}</span>`, `<span class="bk-pr num">${A(p.ratioText)} : 1</span>`, `<span class="bk-pl">${level(p.ratio)}</span>`];
  const roleKeys = [['surface', 'Surface'], ['raised', 'Raised'], ['text', 'Text'], ['quiet', 'Quiet text'], ['border', 'Border'], ['action', 'Action'], ['actionLabel', 'Action label'], ['focus', 'Focus']];
  const toneKeys = [['success', 'Success'], ['warning', 'Warning'], ['danger', 'Danger'], ['info', 'Info']];
  const roleHex = (mode, k, tone) => (tone ? ctx.roles[mode][k].fg : ctx.roles[mode][k]);
  const rbtn = (mode, n, hx) => `<button type="button" class="bk-role" data-copy="${hx}" data-copy-label="${mode} ${A(n)} HEX ${hx}" aria-label="Copy HEX ${A(hx)}, ${mode} ${A(n)}"><span class="bk-role__sw${hairlineOn(ctx, hx) ? ' is-hair' : ''}" style="background:${hx}" aria-hidden="true"></span><span class="bk-role__h">${hx}</span></button>`;
  const roleRows = [...roleKeys.map(([k, n]) => [n, k, false]), ...toneKeys.map(([k, n]) => [n, k, true])].map(([n, k, tone], i) => [`<span class="num">4.5.${i + 1}</span>`, A(n), rbtn('light', n, roleHex('light', k, tone)), rbtn('dark', n, roleHex('dark', k, tone))]);
  const nCol = ctx.colours.length;
  return sec('colour', 'bk-sec--colour', `
${head(ctx, 4, 'colour', 'Colour', 'Each colour is defined once, then tested against every other. Click a chip or a value to copy it.')}
${c('Colour definitions', `<ol class="bk-defs">${ctx.colours.map((k, i) => def(k, `4.1.${i + 1}`, k.share)).join('')}</ol>`)}
${c('Text tones', `<ol class="bk-defs">${ctx.tones.map((k, i) => def(k, `4.2.${i + 1}`)).join('')}</ol>`)}
${c('Contrast matrix', `<p class="bk-body bk-measure">Every colour as text, on every colour as ground, with its WCAG ratio and level. ${nCol} brand colours${ctx.tones.length ? ` and ${ctx.tones.length === 1 ? 'one measured tone' : ctx.tones.length + ' measured tones'}` : ''}.</p>${matrix}`)}
${c('Pairs in use', table('bk-ct', 'Text pairs the brand uses', [{ h: 'Ref', c: 'bk-t__ref' }, { h: 'Sample' }, { h: 'Pair', row: true }, { h: 'Ratio', c: 'r' }, { h: 'Level', c: 'r' }], ctx.pairs.map(prow)))}
${c('Interface roles', `<p class="bk-body bk-measure">The same roles in the light and dark sets. Click a value to copy it.</p>${table('bk-rt', 'Interface roles, light and dark', [{ h: 'Ref', c: 'bk-t__ref' }, { h: 'Role', row: true }, { h: 'Light' }, { h: 'Dark' }], roleRows)}`)}`);
}

function typography(ctx) {
  const B = ctx.brand, F = B.fonts, T = B.type, c = clauses(5), alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789';
  const wlist = (f) => f.weights.join(', ');
  const faceRows = [
    [`<span class="bk-fa disp" aria-hidden="true">Aa</span><span class="bk-face__n">${A(F.display.family)}</span>`, 'For headlines, one or two lines at a time.', mono(wlist(F.display)), `<span class="bk-face__al" style="font-family:var(--display);font-weight:700;letter-spacing:-0.01em">${alpha}</span>`],
    [`<span class="bk-fa" aria-hidden="true">Aa</span><span class="bk-face__n">${A(F.body.family)}</span>`, 'For reading text, labels and captions.', mono(wlist(F.body)), `<span class="bk-face__al" style="font-family:var(--body)">${alpha}</span>`],
  ];
  const scaleRows = T.scale.map((s) => {
    const fam = s.face === 'display' ? 'var(--display)' : 'var(--body)', fname = s.face === 'display' ? F.display.family : F.body.family;
    const track = s.face === 'display' ? '-0.015em' : 'normal';
    return [`<span class="bk-sm" style="font-family:${fam};font-weight:${s.weight};line-height:1;letter-spacing:${track};--size:${s.size}px" aria-hidden="true">Aa</span><span class="bk-scale__t">${A(ctx.cap(s.token))}</span>`, A(fname), mono(`${s.size} px`), mono(String(s.line)), mono(String(s.weight)), mono(track), A(s.use)];
  });
  return sec('typography', 'bk-sec--type', `
${head(ctx, 5, 'typography', 'Typography', 'One face for the big line, one for everything you read.')}
${c('Families and weights', `${table('bk-ft', 'Typefaces', [{ h: 'Face', row: true }, { h: 'Use' }, { h: 'Weights' }, { h: 'Specimen' }], faceRows)}<p class="bk-cap bk-measure bk-ftn">${A(F.mono.family)} is for a hex, a token or a code string only. All three faces are open licence (SIL OFL 1.1), free for commercial use.</p>`)}
${c('Scale', table('bk-st', 'Type scale', [{ h: 'Style', row: true }, { h: 'Face' }, { h: 'Size', c: 'r' }, { h: 'Line', c: 'r' }, { h: 'Weight', c: 'r' }, { h: 'Tracking', c: 'r' }, { h: 'Use' }], scaleRows))}
${c('Requirements', requirements('5.3', T.rules))}
${c('In use', fig(5, 4, `<p class="bk-use__h disp">${A(T.sample.headline)}</p><p class="bk-use__p">${A(T.sample.paragraph)}</p><p class="bk-cap">${A(T.sample.caption)}</p>`, 'A headline, a paragraph and a caption, set to the scale above.'))}
${c('Try it', `<div class="bk-tester" data-tester>
<div class="bk-tester__c"><div class="bk-field"><label for="tester-text">Your line</label><input id="tester-text" type="text" value="${A(T.sample.headline)}" data-tester-text data-default="${A(T.sample.headline)}" autocomplete="off" spellcheck="false"></div>
<div class="bk-field"><label for="tester-size">Size <output for="tester-size" data-tester-value class="num">64 px</output></label><input id="tester-size" type="range" min="14" max="120" step="1" value="64" data-tester-size></div></div>
<p class="bk-tester__d disp" data-tester-out aria-hidden="true">${A(T.sample.headline)}</p>
<p class="bk-tester__b" data-tester-out aria-hidden="true">${A(T.sample.headline)}</p>
</div>`)}`);
}

function imagery(ctx) {
  const B = ctx.brand, D = B.imagery.direction, shots = B.imagery.shots, c = clauses(6);
  const dirRows = [['Light', D.light], ['Crop', D.crop], ['Colour', D.colour], ['People', D.people]];
  const shotFig = (s, i) => {
    const real = !!s.photo;
    const f = real ? ctx.book.find(`05 Imagery/photos/${s.photo.split('/').pop()}`) : null;
    const name = (s.slot || '').split(':')[0] || s.id;
    const cap = real ? `${A(s.caption || s.alt)}. Photo: ${A(s.credit)}.` : 'Art-directed slot: the shot, the crop and the light.';
    return `<figure class="bk-shot"><div class="bk-shot__f">${ctx.photo(s.id, { cls: 'bk-ph', pos: '50% 50%' })}</div><figcaption class="bk-capt"><span><b><span class="num">Figure 6.2.${i + 1}</span> ${A(name)}</b>${cap}</span>${f ? `<span class="bk-dls">${dl(f, 'photo ' + (s.caption || s.id))}</span>` : ''}</figcaption></figure>`;
  };
  return sec('imagery', 'bk-sec--imagery', `
${head(ctx, 6, 'imagery', 'Imagery', A(D.subject))}
${c('Direction', table('bk-dir', 'Photography direction', [{ h: 'Ref', c: 'bk-t__ref' }, { h: 'Term', row: true }, { h: 'Requirement' }], dirRows.map(([k, v], i) => [`<span class="num">6.1.${i + 1}</span>`, k, A(v)])))}
${c('Shot list', `<div class="bk-shots">${shots.map(shotFig).join('')}</div>`)}
${c('Requirements', requirements('6.3', B.imagery.rules))}`);
}

function layout(ctx) {
  const G = ctx.gridMeasures, B = ctx.brand, c = clauses(7);
  const m = (G.margin / G.page.w) * 100, inner = G.page.w - 2 * G.margin, gap = (G.gutter / inner) * 100;
  const cols = Array.from({ length: G.columns }, () => '<i></i>').join('');
  const col = (Math.round(G.col * 10) / 10).toString();
  const radii = ctx.radii.filter((r) => r.px < 9999);
  const meas = [['Margin', G.margin], ['Gutter', G.gutter], ['Column', col], ['Base', G.base]];
  const pageFig = `<div class="bk-page" role="img" aria-label="The page grid: ${G.columns} columns, ${G.margin} pixel margin, ${G.gutter} pixel gutter" style="aspect-ratio:${G.page.w}/${G.page.h};padding:${m.toFixed(3)}%"><div class="bk-page__g" style="column-gap:${gap.toFixed(3)}%;grid-template-columns:repeat(${G.columns},minmax(0,1fr))">${cols}</div></div>`;
  return sec('layout', 'bk-sec--layout', `
${head(ctx, 7, 'layout', 'Layout', `${G.columns} columns on a ${G.page.w} by ${G.page.h} page, a ${G.margin} px margin and a ${G.gutter} px gutter. Everything sits on a ${G.base} px base.`)}
${c('Page grid', `<div class="bk-gridfig">${fig(7, 1, pageFig, `The page grid, ${G.page.w} by ${G.page.h}.`)}${table('bk-meas', 'Page grid measures', [{ h: 'Ref', c: 'bk-t__ref' }, { h: 'Measure', row: true }, { h: 'Value', c: 'r' }], meas.map(([k, v], i) => [`<span class="num">7.1.${i + 1}</span>`, k, `<span class="num">${v} px</span>`]))}</div>`)}
${c('Spacing', table('bk-spt', 'Spacing steps', [{ h: 'Ref', c: 'bk-t__ref' }, { h: 'Step', row: true }, { h: 'Value', c: 'r' }, { h: 'Drawn' }], ctx.space.map((s, i) => [`<span class="num">7.2.${i + 1}</span>`, mono(s.token), `<span class="num">${s.px} px</span>`, `<span class="bk-bar" style="width:${s.px}px" aria-hidden="true"></span>`])))}
${c('Corners and edges', `${table('bk-rdt', 'Corner radii', [{ h: 'Ref', c: 'bk-t__ref' }, { h: 'Sample' }, { h: 'Token', row: true }, { h: 'Value', c: 'r' }, { h: 'Use' }], radii.map((r, i) => [`<span class="num">7.3.${i + 1}</span>`, `<i class="bk-rd" style="border-radius:${r.px}px" aria-hidden="true"></i>`, mono(r.token), `<span class="num">${r.px} px</span>`, A(r.use)]))}<p class="bk-body bk-measure bk-ftn">Edges are ${B.ui.border} px. ${A(B.ui.elevationNote)}</p>`)}`);
}

function applications(ctx) {
  const B = ctx.brand, L = ctx.logo, ap = B.applications, S = B.ui.screen.content, cw = B.logo.colourways, rev = cw.reversed, sb = cw['on-sunbelt'], c = clauses(8);
  const R = ctx.roles.light;
  const front = `<div class="bk-card bk-card--front"><div class="bk-card__logo">${L.html('colour', { width: 200, colourway: 'on-sunbelt', color: sb.name, label: 'Your logo goes here' })}</div><p class="bk-card__line">${A(B.lines.primary)}</p></div>`;
  const back = `<div class="bk-card bk-card--back"><div class="bk-card__mark">${L.html('symbol', { width: 40, label: 'Logo' })}</div><div class="bk-card__who"><p class="nm">${A(ap.card.person)}</p><p class="rl">${A(ap.card.role)}</p><p class="ct">${A(ap.card.contact)}<br>${A(ap.site.url)}</p></div></div>`;
  const social = `<div class="bk-posts">
<div class="bk-post bk-post--sq" style="background:${R.action};color:${R.actionLabel}"><p class="disp">${A(ap.social[0])}</p><span class="bk-post__lg">${L.html('mono-dark', { width: 96, color: R.actionLabel, label: 'Logo' })}</span></div>
<div class="bk-post bk-post--pt" style="background:${rev.ground};color:${rev.name}"><p class="disp">${A(ap.social[1])}</p><span class="bk-post__lg">${L.html('reversed', { width: 96, color: rev.name, label: 'Logo' })}</span></div>
<div class="bk-post bk-post--st" style="background:${sb.ground};color:${sb.name}"><p class="disp">${A(ap.social[2])}</p><span class="bk-post__lg">${L.html('symbol', { width: 40, colourway: 'on-sunbelt', color: sb.name, label: 'Logo' })}</span></div>
</div>`;
  const [signSpec, signHead] = [ctx.real(ap.signage).split(': ')[0], ctx.ph('applications.signage.line', ctx.real(ap.signage).split(': ').slice(1).join(': '))];  // the size is data in the string; slot: a placeholder on the line
  const signMm = (signSpec.match(/(\d+) x (\d+) mm/) || [, 600, 900]);
  const sign = `<div class="bk-sign"><div class="bk-sign__w"><div class="bk-sign__dh"><span>${signMm[1]} mm</span></div><div class="bk-sign__dv"><span>${signMm[2]} mm</span></div><div class="bk-board" style="background:${sb.ground};color:${sb.name};aspect-ratio:${signMm[1]}/${signMm[2]}"><p class="disp bk-board__h">${A(signHead || B.lines.primary)}</p><div class="bk-board__lg">${L.html('stacked', { width: 120, colourway: 'on-sunbelt', color: sb.name, label: 'Logo' })}</div></div></div></div>`;
  const email = `<div class="bk-email"><p class="bk-email__n">${A(ap.email.person)}</p><p class="bk-email__r">${A(ap.email.role)}, ${A(B.name)}</p><p class="bk-email__c">${A(ap.card.contact)}<br>${A(ap.site.url)}</p><div class="bk-email__l">${L.html('horizontal', { width: 168, label: 'Logo' })}</div></div>`;
  const rows = S.deliveries.slice(0, 3);
  const screen = `<div class="bk-device"><div class="ui bk-screen" role="img" aria-label="${A(B.name)} product screen: ${A(B.ui.screen.title)}. ${A(S.eta)}. ${A(S.rider)}, ${A(S.riderNote)}." inert>
<div class="bk-scr__top"><span class="ui-num bk-scr__time">${A(S.time)}</span>${ctx.ui.statusChip('producing')}</div>
<p class="ui-display bk-scr__eta">${A(S.eta)}</p><p class="bk-scr__note">${A(S.pickup)}</p>
<div class="ui-progress"><div class="ui-progress__bar"><i style="width:${S.progress * 100}%"></i></div><span class="ui-progress__dot" style="left:${S.progress * 100}%"></span></div>
<div class="bk-scr__ft"><span>${A(S.from)}</span><span>${A(S.to)}</span></div>
<ul class="ui-list">${ctx.ui.row({ lead: `<span class="ui-avatar">${A(S.initials)}</span>`, title: S.rider, sub: S.riderNote, endHtml: ctx.ui.btn(S.call, { variant: 'secondary', size: 'sm', iconLeft: 'phone' }) })}</ul>
<ul class="ui-list">${rows.map((d) => ctx.ui.row({ lead: ctx.ui.icon('house', 18), title: d.to, sub: d.when, end: d.price, chip: ctx.ui.statusChip(d.status) })).join('')}</ul>
</div></div>`;
  return sec('applications', 'bk-sec--apps', `
${head(ctx, 8, 'applications', 'Applications', 'The brand at work: a card, a feed, a site board, an inbox and the product itself.')}
${c('Business card', fig(8, 1, `<div class="bk-cards">${front}${back}</div>`, 'Business card, 90 by 55 mm, front and back.'))}
${c('Social', fig(8, 2, social, 'Three social posts: square, portrait and story.'))}
${c('Site board', fig(8, 3, sign, `${A(signSpec.replace(/ x /g, ' × '))}. The board names the day, then the logo.`))}
${c('Email signature', fig(8, 4, email, 'Email signature.'))}
${c('Product screen', fig(8, 5, screen, 'The product screen.'))}`);
}

function downloads(ctx) {
  const D = ctx.book, L = ctx.logo, slot = ctx.edition === 'slot', c = clauses(9);
  const cols = [{ h: 'Item', row: true }, { h: 'File' }, { h: 'Format' }, { h: 'Size', c: 'r' }, { h: 'Reference' }, { h: 'Download', c: 'bk-t__dl' }];
  const dlBtn = (f, label) => `<a class="bk-btn bk-btn--quiet" href="${A(f.href)}" download aria-label="Download ${A(label)}"><span class="bk-btn__t">Download</span></a>`;
  const frow = (f, section, item) => [A(item || f.name), `<span class="bk-file__n">${A(f.rel || f.name)}</span>`, A(f.ext), `<span class="num">${A(f.sizeText)}</span>`, section, dlBtn(f, f.name)];
  const group = (title, what, label, rows) => c(title, `<p class="bk-cap bk-fwhat">${A(what)}</p>${table('bk-bom', label, cols, rows)}`);
  const logoRows = slot
    ? D.logoFiles.map((f) => frow(f, clRef('3.1', 'Versions')))
    : L.versions.map((id) => {
      const f = D.logo(id);
      const sizes = f.png.map((p) => `<a class="bk-dl" href="${A(p.href)}" download aria-label="Download ${A(L.labels[id])} logo, PNG, ${p.w} px wide, ${A(p.sizeText)}">${p.w}</a>`).join('');
      const chips = `<span class="bk-dls">${dl(f.svg, L.labels[id] + ' logo')}${dl(f.pdf, L.labels[id] + ' logo')}<span class="bk-pngs" role="group" aria-label="PNG widths in pixels"><span class="bk-cap">PNG</span>${sizes}</span></span>`;
      return [A(L.labels[id]), `<span class="bk-file__n">${A(f.svg.rel || f.svg.name)}</span>`, 'SVG, PDF, PNG', `<span class="num">${A(f.svg.sizeText)}</span>`, clRef('3.1', 'Versions'), chips];
    });
  const iconRows = D.icons.map((f) => { const n = f.name.replace('.svg', ''); return [`<span class="bk-iconi">${ctx.ui.icon(n, 20)}</span>${A(n)}`, `<span class="bk-file__n">${A(f.rel || f.name)}</span>`, A(f.ext), `<span class="num">${A(f.sizeText)}</span>`, clRef('8.5', 'Product screen'), `<a class="bk-btn bk-btn--quiet" href="${A(f.href)}" download aria-label="Download ${A(f.name)} icon, SVG"><span class="bk-btn__t">Download</span></a>`]; });
  iconRows.push(frow(D.iconsLicence, clRef('8.5', 'Product screen'), 'Icon licence'));
  const photos = D.imagery.filter((f) => f.rel.startsWith('05 Imagery/photos/'));
  const pdfs = D.imagery.filter((f) => f.ext === 'PDF');
  return sec('downloads', 'bk-sec--down', `
${head(ctx, 9, 'downloads', 'Downloads', 'Everything in the brand kit, folder by folder, as a bill of materials. The zip holds all of it.')}
${c('The whole kit', `<div class="bk-zip"><div><p class="bk-zip__n">${A(D.zip.name)}</p><p class="bk-cap">Every folder below. ${A(D.zip.sizeText)}.</p></div><a class="bk-btn bk-btn--primary" href="${A(D.zip.href)}" download aria-label="Download ${A(D.zip.name)}, ${A(D.zip.sizeText)}"><span class="bk-btn__t">Download the kit</span></a></div>`)}
${group('Read me', 'Start here: what is in the kit and how to use it.', 'Read me files', [D.readmePdf, D.readme].filter(Boolean).map((f) => frow(f, clRef('9.1', 'The whole kit'))))}
${group('Logo', slot ? 'The labelled slot frame, and where the approved files go.' : 'Each version as SVG and PDF, and as PNG at three widths, transparent.', 'Logo files', logoRows)}
${group('Colour', 'The palette for Adobe, CSS and JSON, and a swatch sheet.', 'Colour files', D.colour.map((f) => frow(f, clRef('4.1', 'Colour definitions'))))}
${group('Type', 'The specimen sheet, and the faces with their links and licence.', 'Type files', D.type.map((f) => frow(f, clRef('5.1', 'Families and weights'))))}
${group('Icons', `${D.icons.length} interface icons, drawn in the brand's stroke.`, 'Icon files', iconRows)}
${group('Imagery', photos.length ? 'The photography direction, and the photos.' : 'The photography direction and shot list.', 'Imagery files', [...pdfs, ...photos].map((f) => frow(f, clRef('6.1', 'Direction'))))}`);
}

export function brandBook(ctx) {
  if (!ctx.book) throw new Error('brandBook needs ctx.book (set by the engine book builder)');
  return [overview, voice, logo, colour, typography, imagery, layout, applications, downloads].map((f) => f(ctx)).join('\n');
}
