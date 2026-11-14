// Theme 30, Fluted: lane bk, the HTML brand book (brandBook and bookCss). The book is the lobby wall run down a web page: each section opens on a
// quiet ground (a running head, the two-tone headline, a short lead and the section's one big thing), then the band of reeded glass crosses the full
// width, and under it the key reads out what the glass holds. What sits behind the glass is the section's own data, never ornament: the palette by
// share, the two boilerplates, each logo version at its own proportion, the contrast of every text pair, the type scale, the shot list, the page grid,
// the product's rows by status and the kit's folders by size. Each measure is a window (a column with a round head, as in lane-g1), seen flat above
// the band and broken into reeds inside it. The specs follow the key as hairline rows, the appendix. Colours come from ctx roles and brand data only.
import { plateImg } from '../../engine/plate.js';
import { BOOK_SECTIONS, BOOK_BREAK } from '../../engine/book.js';
import { esc } from '../../engine/brand.js';
import { colourMap, tokenGroups } from '../../engine/tokens.js';
import { componentsCss } from '../../engine/components.js';
import { adv } from './helpers.js';
import { band, layoutWindows, shareFields, hexIn } from './lane-bk-glass.js';
import { bookCss } from './lane-bk-css.js';

export { bookCss };
void BOOK_BREAK;

const A = esc;
// the scenes the book photographs, from the library map's row for theme 30 (social and digital: the anchor phone; business card: the box office)
const SCENES = { phone: 'room-kitchen-phone', card: 'late-box-office' };
// the courier brand gets a street phone scene, the other keeps the room (library map, row 30)
export const phoneScene = (ctx) => (/^kerbside/.test(ctx.brand.slug) ? 'kerb-crossing-phone' : SCENES.phone);
// the two band widths in design units: the wide band is drawn for 1440 and scales with the window, the phone band for 588 shown at about 390
const WIDE = { W: 1440, H: 336, lift: 48, margin: 64 }, NARROW = { W: 588, H: 264, lift: 40, margin: 24 };
const NO = (id) => String(BOOK_SECTIONS.findIndex((s) => s.id === id) + 1).padStart(2, '0');
const TITLE = (id) => BOOK_SECTIONS.find((s) => s.id === id).title;
const WEIGHT = { 100: 'Thin', 200: 'ExtraLight', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold', 900: 'Black' };
const NUM = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const nWord = (n) => NUM[n] || String(n);
const cap1 = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const listAnd = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const v = (t) => `<span class="fl-v">${t}</span>`;

// ---- type sized to its box: the size at which the whole run fits one line of `w` (measured with the real glyphs), used as a cap and scaled with the
// box through cqw, so a longer placeholder still fits ----
const fitCap = (ctx, text, role, weight, max, w, track = -0.02) => {
  const a = adv(ctx, role, text, 100, track, weight) / 100;
  return Math.max(16, Math.min(max, Math.floor(w / a)));
};
const cq = (s, w) => `min(${s}px,${(s / w * 100).toFixed(3)}cqw)`;

// ---- controls ----
const copyBtn = (label, value, what) => `<button type="button" class="bk-btn fl-cp" data-copy="${A(value)}" data-copy-label="${A(what)}" aria-label="${A(label + ', ' + what)}"><span class="bk-btn__t">${A(label)}</span></button>`;
const valBtn = (kind, value, name) => `<button type="button" class="bk-btn fl-val" data-copy="${A(value)}" data-copy-label="${A(name + ' ' + kind)}" aria-label="Copy ${A(kind)} ${A(value)}, ${A(name)}"><span class="bk-btn__t">${A(value)}</span></button>`;
const dlLink = (f, label, text) => (f ? `<a class="fl-dl" href="${A(f.href)}" download aria-label="Download ${A(label)}, ${A(f.ext)}, ${A(f.sizeText)}">${A(text || f.ext)}</a>` : '');
const h3 = (t) => `<h3 class="fl-h3">${t}</h3>`;
const rules = (list) => `<ul class="fl-rules">${list.map((r) => `<li><p><span class="fl-do">Do</span> ${A(r.do)}</p><p class="fl-q"><span class="fl-do">Don&rsquo;t</span> ${A(r.dont)}</p></li>`).join('')}</ul>`;

// ---- the logo: in each mode on that mode's ground, in the colourway made for it (else the one whose name reads best); a dashed frame in the slot edition ----
const cwOn = (ctx, bg) => {
  const cw = ctx.brand.logo.colourways, keys = Object.keys(cw);
  return keys.find((k) => cw[k].ground.toLowerCase() === bg.toLowerCase()) || keys.reduce((a, b) => (ctx.ratio(cw[b].name, bg) > ctx.ratio(cw[a].name, bg) ? b : a));
};
// on a coloured ground the frame takes whichever of the two text roles reads best there
const slotFrame = (ctx, id, w, bg = null) => { const g = ctx.logo.geos[id], tx = [ctx.roles.light.text, ctx.roles.dark.text], c = bg ? tx.reduce((a, b) => (ctx.ratio(b, bg) > ctx.ratio(a, bg) ? b : a)) : null; return `<span class="fl-slot" role="img" aria-label="Logo slot" style="width:${w}px;aspect-ratio:${g.w.toFixed(2)}/${g.h.toFixed(2)}${c ? `;color:${c};border-color:${c}` : ''}"><span>Your logo goes here</span></span>`; };
function logoOn(ctx, id, bg, w) {
  if (ctx.edition === 'slot') return slotFrame(ctx, id, w, bg);
  return `<span class="fl-logo" style="--lw:${w}px">${ctx.logo.html(id, { width: w, colourway: cwOn(ctx, bg), label: 'Logo' })}</span>`;
}
const logoModes = (ctx, id, w) => (ctx.edition === 'slot' ? slotFrame(ctx, id, w)
  : `<span class="fl-for-light">${logoOn(ctx, id, ctx.roles.light.surface, w)}</span><span class="fl-for-dark">${logoOn(ctx, id, ctx.roles.dark.surface, w)}</span>`);

// ---- the band and its key ----
// a window whose fill sits close to either mode's ground gets a quiet outline, so it never vanishes into the page
const edgeFor = (ctx, fill) => (['l', 'd'].some((m) => ctx.ratio(hexIn(ctx, m, fill), hexIn(ctx, m, 'g')) < 1.5) ? 'quiet' : null);
// the arch in the key: the same window in miniature, in the same paint
const arch = (t) => {
  const fill = t.fill ? (t.fill.startsWith('#') ? `fill="${t.fill}"` : `style="fill:var(--${t.fill})"`) : 'fill="none"';
  const st = t.stroke ? `stroke="currentColor" stroke-width="1.5"` : t.edge ? 'stroke="currentColor" stroke-width="1"' : '';
  return `<svg class="fl-arch${t.stroke || t.edge ? ' fl-arch--o' : ''}" viewBox="0 0 16 24" width="16" height="24" aria-hidden="true" focusable="false"><path d="M1.5 23.5V8.5a6.5 6.5 0 0 1 13 0V23.5Z" ${fill} ${st}/></svg>`;
};
// items: [{value, fill?, stroke?, name, val}]. layout(W): the windows' {x, w} for a band width, by value unless the section places them itself
function glass(ctx, id, items, { label, fields = null, layout = null, settle = false, keyNote = '' } = {}) {
  const its = items.map((t) => ({ ...t, edge: t.fill ? edgeFor(ctx, t.fill) : null }));
  const draw = (D, tag) => {
    const pos = layout ? layout(D) : layoutWindows(its.map((t) => t.value), { W: D.W, margin: D.margin });
    const ws = its.map((t, i) => ({ ...t, ...pos[i] })).filter((t) => t.w > 0);
    return band(ctx, { id: `fl-${id}-${tag}`, W: D.W, H: D.H, lift: D.lift, items: ws, fields: fields ? fields(D) : [], settle, cls: `fl-svg--${tag}` });
  };
  const key = `<ol class="fl-key" aria-label="${A(label)}, the key">${its.map((t) => `<li>${arch(t)}<span class="fl-key__n">${t.name}</span>${t.val ? v(t.val) : ''}</li>`).join('')}</ol>`;
  return `<figure class="fl-band" role="img" aria-label="${A(label)}">${draw(WIDE, 'w')}${draw(NARROW, 'n')}</figure>
<div class="fl-in fl-keyrow">${key}${keyNote ? `<p class="fl-q fl-keynote">${keyNote}</p>` : ''}</div>`;
}

// ---- the section: running head, headline in two tones, lead, the big thing; then the band; then the appendix ----
function sec(ctx, id, { l1, l2 = '', lead = '', big = '', note = '', band: bandHtml = '', body = '', h = 'h2', cls = '' }) {
  const run = `<p class="fl-run"><span class="fl-no">${NO(id)}</span><span class="fl-run__t">${A(TITLE(id))}</span>${note ? `<span class="fl-run__n">${note}</span>` : ''}</p>`;
  const head = `<${h} class="fl-h disp" id="h-${id}"><span class="fl-h__1">${l1}</span>${l2 ? ` <span class="fl-h__2">${l2}</span>` : ''}</${h}>`;
  return `<section class="bk-sec fl-sec fl-sec--${id} ${cls}" id="${id}" aria-labelledby="h-${id}">
<div class="fl-in fl-top"><div class="fl-top__t">${run}${head}${lead ? `<p class="fl-lead">${lead}</p>` : ''}</div>${big ? `<div class="fl-top__b">${big}</div>` : ''}</div>
${bandHtml}
${body ? `<div class="fl-in fl-body">${body}</div>` : ''}
</section>`;
}

// ---- 1 Overview: the logo and the line; in the glass the palette by share, the strong colour's window rising out of its field ----
function overview(ctx) {
  const B = ctx.brand, cols = ctx.colours.slice().sort((a, b) => b.share - a.share);
  const strong = ctx.roles.dark.action;
  const sc = cols.find((c) => c.hex.toLowerCase() === strong.toLowerCase()) || cols[0];
  // the fields fill the band edge to edge by share; the strong colour also stands as one window over its own field, as wide as it, rising clear of the band
  const fields = (D) => shareFields(ctx, D.W).map((f) => ({ ...f, fill: f.c === sc ? 'g' : f.fill }));
  const layout = (D) => { const f = shareFields(ctx, D.W).find((x) => x.c === sc); return [{ x: Math.ceil(f.x / 12) * 12, w: Math.floor((f.x + f.w) / 12) * 12 - Math.ceil(f.x / 12) * 12 }]; };
  const items = [{ value: 1, fill: sc.hex, name: A(sc.name), val: `${Math.round(sc.share * 100)}%` }];
  const key = cols.filter((c) => c !== sc).map((c) => ({ value: 0, fill: c.hex, name: A(c.name), val: `${Math.round(c.share * 100)}%` }));
  const its = [...items, ...key];
  const bandHtml = glass(ctx, 'overview', its, {
    label: `The ${B.name} palette by share: ${cols.map((c) => `${c.name} ${Math.round(c.share * 100)}%`).join(', ')}`, settle: true,
    fields, layout: (D) => [...layout(D), ...key.map(() => ({ x: 0, w: 0 }))],
  });
  const traits = `<ol class="fl-traits">${B.personality.map((p) => `<li><p class="fl-trait disp">${A(p.trait)}</p><p class="fl-p">${A(p.means)}</p></li>`).join('')}</ol>`;
  const body = `<dl class="fl-rows"><div><dt>What it does</dt><dd>${A(B.product)}</dd></div><div><dt>Who it serves</dt><dd>${A(B.audience)}</dd></div><div><dt>Where</dt><dd>${A(B.city || '')}</dd></div></dl>
${h3('How it behaves')}${traits}`;
  const big = `<div class="fl-cover__lg">${logoModes(ctx, 'colour', 360)}</div>`;
  return sec(ctx, 'overview', { h: 'h1', l1: A(B.lines.primary), l2: `Brand book, version ${A(B.version.number)}`, lead: A(B.description), big, note: 'In the glass, the palette by share', band: bandHtml, body, cls: 'fl-sec--open' });
}

// ---- 2 Voice: in the glass the two boilerplates, as wide as their word counts (25 and 50, as the brand names them) ----
function voice(ctx) {
  const B = ctx.brand, V = B.voice;
  const items = [{ value: 25, fill: 'strong', name: 'The brand in 25 words', val: '25' }, { value: 50, fill: 'ink', name: 'The brand in 50 words', val: '50' }];
  const bandHtml = glass(ctx, 'voice', items, { label: 'The two boilerplates, as wide as their length: 25 words and 50 words' });
  const principles = `<ol class="fl-say">${V.principles.map((p, i) => `<li><span class="fl-v">${String(i + 1).padStart(2, '0')}</span><p class="fl-say__t">${A(p.title)}</p><p class="fl-say__x disp">${A(p.example)}</p></li>`).join('')}</ol>`;
  const wtn = `<ul class="fl-wtn">${V.writeThis.map((r) => `<li><p class="fl-wtn__w">${A(r.write)}</p><p class="fl-wtn__n"><span class="fl-do">Not</span> <s>${A(r.not)}</s></p><p class="fl-q">${A(r.because)}</p></li>`).join('')}</ul>`;
  const take = (title, text, what) => `<div class="fl-take">${h3(title)}<p class="fl-p">${A(text)}</p>${copyBtn('Copy text', text, what)}</div>`;
  const body = `${h3('The rules')}${principles}
${h3('Write this, not that')}${wtn}
<div class="fl-two">${take('The brand in 25 words', V.boilerplate25, '25-word boilerplate')}${take('The brand in 50 words', V.boilerplate50, '50-word boilerplate')}</div>
<div class="fl-two"><div>${h3('Lines in use')}<ul class="fl-lines">${[B.lines.primary, ...B.lines.others].map((l) => `<li class="disp">${A(l)}</li>`).join('')}</ul></div><div>${h3('Writing the name')}<p class="fl-p">${A(V.nameRules)}</p></div></div>`;
  return sec(ctx, 'voice', { l1: `How ${A(B.name)} writes.`, l2: `${cap1(nWord(V.principles.length))} rules for every sentence.`, lead: A(V.boilerplate25), note: 'In the glass, the two boilerplates', band: bandHtml, body });
}

// ---- 3 Logo: the logo large; in the glass each version as wide as its own proportion, on the ground its colourway is drawn for ----
function logo(ctx) {
  const B = ctx.brand, L = ctx.logo, cw = B.logo.colourways, slot = ctx.edition === 'slot';
  const order = ['colour', 'reversed', 'mono-dark', 'mono-light', 'horizontal', 'stacked', 'symbol'].filter((id) => L.versions.includes(id));
  const asp = (id) => L.geos[id].w / L.geos[id].h;
  const items = order.map((id) => ({ value: asp(id), fill: cw[L.colourwayOf(id)].ground, name: A(L.labels[id]), val: `${asp(id).toFixed(1)} : 1` }));
  const bandHtml = glass(ctx, 'logo', items, { label: `Each logo version as wide as its proportion, on its own ground: ${order.map((id) => `${L.labels[id]} ${asp(id).toFixed(1)} to 1`).join(', ')}` });
  const row = (id) => {
    const w = cw[L.colourwayOf(id)], g = L.geos[id], lw = Math.round(Math.min(id === 'symbol' ? 64 : 200, 72 * g.w / g.h));
    const files = ctx.book.logo(id), name = `${L.labels[id]} logo`;
    const links = slot || !files ? '' : `<span class="fl-dls">${dlLink(files.svg, name)}${dlLink(files.png.find((p) => p.w === 1024), name + ', PNG, 1024 px wide', 'PNG')}${dlLink(files.pdf, name)}</span>`;
    const mark = slot ? slotFrame(ctx, id, lw, w.ground) : `<span class="fl-logo" style="--lw:${lw}px">${L.html(id, { width: lw, color: w.name, label: 'Logo' })}</span>`;
    return `<li><span class="fl-ver__g" style="background:${w.ground}">${mark}</span><span class="fl-ver__k"><span class="fl-ver__n">${A(L.labels[id])}</span><span class="fl-q">${A(B.logo.when[id] || '')}</span>${links}</span></li>`;
  };
  const pad = (L.clearShare / 100) * L.geo.height / L.geo.width * 100, ms = L.minSize;
  const clear = `<div class="fl-clear"><div class="fl-clear__b" style="padding:${pad.toFixed(3)}%">${logoModes(ctx, 'colour', 280)}</div></div><p class="fl-p">Keep ${v(`${L.clearShare}%`)} of the logo&rsquo;s height clear on every side.</p>`;
  const min = slot
    ? `<p class="fl-p">Set the smallest size once the logo is in place: the width at which every part of it still reads as one mark.</p>`
    : `<div class="fl-min">${logoModes(ctx, 'colour', ms.screenPx)}</div><p class="fl-p">${v(`${ms.screenPx} px`)} wide on screen, ${v(`${ms.printMm} mm`)} in print. Never smaller.</p>`;
  const misuse = ['Do not stretch, squash or skew it.', 'Do not recolour it outside the versions above.', 'Do not rotate it.', 'Do not add shadows, glows or other effects.', 'Do not set it on a busy part of a photo.', 'Do not outline it or put it in a box.'];
  const body = `${h3('The versions')}<p class="fl-p fl-narrow">Each version on the ground it is made for. ${slot ? 'The frames hold the place and the proportion until the approved files go in the kit&rsquo;s logo folder.' : 'Download any one as SVG, PNG or PDF.'}</p>
<ul class="fl-vers">${order.map(row).join('')}</ul>
<div class="fl-two"><div>${h3('Clear space')}${clear}</div><div>${h3('Smallest size')}${min}</div></div>
${h3('Never')}<ul class="fl-never">${misuse.map((m) => `<li>${A(m)}</li>`).join('')}</ul>`;
  return sec(ctx, 'logo', { l1: 'The logo.', l2: `${cap1(nWord(order.length))} versions.`, lead: A(B.logo.idea), big: `<div class="fl-logo-big">${logoModes(ctx, 'colour', 440)}</div>`, note: 'In the glass, each version at its proportion', band: bandHtml, body });
}

// ---- 4 Colour: in the glass every text pair the brand uses, the ground's window as wide as the pair's contrast, the text colour's window inside it ----
function colour(ctx) {
  const B = ctx.brand, cols = ctx.colours, P = ctx.pairs;
  const items = P.map((p) => ({ value: p.ratio, fill: p.bgHex, name: A(p.use), val: `${A(p.ratioText)} : 1` }));
  const inner = P.map((p) => ({ fill: p.fgHex }));
  // each pair is two windows: the ground, and inside it, one reed in from each side, the text colour
  const layout = (D) => { const o = layoutWindows(P.map((p) => p.ratio), { W: D.W, margin: D.margin, min: 3 }); return o; };
  const label = `Every text pair as a window as wide as its contrast: ${P.map((p) => `${p.use}, ${p.ratioText} to 1`).join('; ')}`;
  const draw = (D, tag) => {
    const pos = layout(D), ws = [];
    P.forEach((p, i) => { ws.push({ ...pos[i], fill: p.bgHex, edge: edgeFor(ctx, p.bgHex) }); if (pos[i].w > 24) ws.push({ x: pos[i].x + 12, w: pos[i].w - 24, fill: p.fgHex }); });
    return band(ctx, { id: `fl-colour-${tag}`, W: D.W, H: D.H, lift: D.lift, items: ws, cls: `fl-svg--${tag}` });
  };
  void inner;
  const key = `<ol class="fl-key" aria-label="${A(label)}, the key">${P.map((p, i) => `<li>${arch({ fill: p.bgHex, edge: edgeFor(ctx, p.bgHex) })}<span class="fl-key__n">${items[i].name}</span>${v(items[i].val)}</li>`).join('')}</ol>`;
  const bandHtml = `<figure class="fl-band" role="img" aria-label="${A(label)}">${draw(WIDE, 'w')}${draw(NARROW, 'n')}</figure>
<div class="fl-in fl-keyrow">${key}<p class="fl-q fl-keynote">Text needs 4.5&thinsp;:&thinsp;1; type at 24&nbsp;px and over needs 3&thinsp;:&thinsp;1.</p></div>`;
  const rgb = (hex) => { const [r, g, b] = ctx.C.hexToRgb(hex); return `rgb(${r}, ${g}, ${b})`; };
  const vals = (c) => `<dl class="fl-vals"><div><dt>HEX</dt><dd>${valBtn('HEX', c.hex, c.name)}</dd></div><div><dt>RGB</dt><dd>${valBtn('RGB', rgb(c.hex), c.name)}</dd></div><div><dt>OKLCH</dt><dd>${valBtn('OKLCH', c.oklch || ctx.C.oklchString(c.hex), c.name)}</dd></div>${ctx.C.cmykOf(c) ? `<div><dt>CMYK</dt><dd>${valBtn('CMYK', ctx.C.cmykOf(c), c.name)}</dd></div>` : ''}</dl>`;
  const ramp = (c) => (c.ramp ? `<ol class="fl-ramp" aria-label="${A(c.name)} ramp, lightest to darkest">${Object.entries(c.ramp).map(([k, hx]) => `<li><button type="button" class="fl-ramp__b" style="background:${hx}" data-copy="${hx}" data-copy-label="${A(c.name)} ${k} HEX ${hx}" aria-label="Copy HEX ${hx}, ${A(c.name)} ${k}"></button></li>`).join('')}</ol>` : '');
  const entry = (c) => `<li class="fl-col"><span class="fl-col__sw" style="background:${c.hex}" aria-hidden="true"></span><div class="fl-col__t"><h4 class="fl-col__n">${A(c.name)}${c.share ? ` ${v(`${Math.round(c.share * 100)}%`)}` : ''}</h4><p class="fl-p">${A(c.lands)}</p>${vals(c)}${ramp(c)}</div></li>`;
  const roleKeys = [['surface', 'Surface'], ['raised', 'Raised'], ['text', 'Text'], ['quiet', 'Quiet text'], ['border', 'Border'], ['action', 'Action'], ['actionLabel', 'Action label'], ['focus', 'Focus']];
  const toneKeys = [['success', 'Success'], ['warning', 'Warning'], ['danger', 'Danger'], ['info', 'Info']];
  const roleList = (mode, title) => {
    const r = ctx.roles[mode], its = [...roleKeys.map(([k, n]) => [n, r[k]]), ...toneKeys.map(([k, n]) => [n, r[k].fg])];
    return `<div>${h3(title)}<ul class="fl-roles">${its.map(([n, hx]) => `<li><span class="fl-roles__sw" style="background:${hx}" aria-hidden="true"></span><span class="fl-roles__n">${A(n)}</span>${valBtn('HEX', hx, `${mode} ${n}`)}</li>`).join('')}</ul></div>`;
  };
  const body = `<p class="fl-p fl-narrow">Press a value to copy it.</p><ul class="fl-cols">${cols.map(entry).join('')}</ul>
${ctx.tones.length ? `${h3('Tones')}<ul class="fl-cols fl-cols--tones">${ctx.tones.map(entry).join('')}</ul>` : ''}
<div class="fl-two">${roleList('light', 'Interface roles, light')}${roleList('dark', 'Interface roles, dark')}</div>`;
  return sec(ctx, 'colour', { l1: `${cap1(nWord(cols.length))} colours.`, l2: `${cap1(nWord(P.length))} text pairs.`, lead: `Each colour has a share of a ${A(B.name)} page and a job. In the glass, every pair of text and ground the brand uses, each window as wide as the pair&rsquo;s contrast.`, note: 'In the glass, the contrast of each pair', band: bandHtml, body });
}

// ---- 5 Typography: the display face's name large; in the glass the type scale, each step as wide as its size ----
function typography(ctx) {
  const B = ctx.brand, F = B.fonts, T = B.type, W = ctx.weights;
  const dW = W.heading, mW = F.mono ? F.mono.weights[0] : 400;
  const items = T.scale.map((s) => ({ value: s.size, fill: s.face === 'display' ? 'strong' : 'ink', name: A(cap1(s.token)), val: `${s.size} px` }));
  const bandHtml = glass(ctx, 'typography', items, { label: `The type scale, each step as wide as its size: ${T.scale.map((s) => `${s.token} ${s.size} pixels`).join(', ')}`, keyNote: 'Display steps in the strong colour, text steps in ink.' });
  const sz = fitCap(ctx, F.display.family, 'display', dW, 200, 620);
  const big = `<p class="fl-face-big disp" aria-hidden="true" style="font-size:${cq(sz, 620)}">${A(F.display.family)}</p>`;
  const fams = [F.display.family, F.body.family, F.mono && F.mono.family].filter((f, i, a) => f && a.indexOf(f) === i);
  const face = (role, f, what) => `<li><p class="fl-face__n" style="font-family:var(--${role});font-weight:${role === 'mono' ? mW : role === 'display' ? dW : W.regular}">${A(f.family)}</p><p class="fl-q">${what}, ${A(f.weights.map((w) => `${WEIGHT[w] || w} ${w}`).join(', '))}</p></li>`;
  const faces = `<ul class="fl-faces">${face('display', F.display, 'Display')}${face('body', F.body, 'Text')}${F.mono ? face('mono', F.mono, 'Values') : ''}</ul>`;
  const tester = `<div class="fl-tester" data-tester>
<p class="fl-tester__out disp" data-tester-out aria-hidden="true">${A(T.sample.headline)}</p>
<div class="fl-tester__c"><div class="fl-field"><label for="tester-text">Your line</label><input id="tester-text" type="text" value="${A(T.sample.headline)}" data-tester-text data-default="${A(T.sample.headline)}" autocomplete="off" spellcheck="false"></div>
<div class="fl-field"><label for="tester-size">Size <output for="tester-size" data-tester-value class="fl-v">64 px</output></label><input id="tester-size" type="range" min="16" max="160" step="1" value="64" data-tester-size></div></div></div>`;
  const scale = `<ol class="fl-scale">${T.scale.map((s) => {
    const disp = s.face === 'display', text = disp ? T.sample.headline : T.sample.paragraph;
    return `<li><div class="fl-scale__k"><p class="fl-scale__t">${A(cap1(s.token))}</p><p class="fl-q">${v(`${s.size} px`)}, line ${v(String(s.line))}, ${A(WEIGHT[s.weight] || String(s.weight))}. ${A(s.use)}</p></div><p class="fl-scale__s${disp ? ' disp' : ''}" style="font-weight:${s.weight};line-height:${s.line};font-size:${s.size}px">${A(text)}</p></li>`;
  }).join('')}</ol>`;
  const body = `${faces}<p class="fl-p fl-narrow">${A(listAnd(fams))} ${fams.length > 1 ? 'are' : 'is'} open source under the SIL Open Font Licence: free in print and on screen.</p>
${h3('Try a line')}${tester}
${h3('The scale')}${scale}
${h3('Rules')}${rules(T.rules)}`;
  return sec(ctx, 'typography', { l1: 'Typography.', l2: `${cap1(nWord(T.scale.length))} sizes, ${nWord(fams.length)} ${fams.length === 1 ? 'family' : 'families'}.`, lead: A(T.sample.paragraph), big, note: 'In the glass, the scale', band: bandHtml, body });
}

// ---- 6 Imagery: the first shot large; in the glass the shot list, a filled window for each photograph in the kit and an open one for each brief ----
function imagery(ctx) {
  const B = ctx.brand, D = B.imagery.direction, shots = B.imagery.shots, first = shots.find((s) => s.photo) || shots[0];
  const items = shots.map((s, i) => ({ value: 1, fill: s.photo ? 'strong' : null, stroke: s.photo ? null : 'ink', name: `Shot ${i + 1}`, val: s.photo ? 'photo' : 'brief' }));
  const np = shots.filter((s) => s.photo).length;
  const bandHtml = glass(ctx, 'imagery', items, { label: `The shot list: ${shots.length} shots, ${np} photographed and ${shots.length - np} still a brief` });
  // where the subject sits in each photograph (x y): the riders keep both couriers, bag and wheels in frame in a portrait or a wide crop
  const FRAME = { riders: '85% 50%', evening: '4% 50%', busstop: '90% 50%' };
  // a shot still to take reads as a brief to shoot: a label and the brief inside the frame, not a blank box
  const brief = (s, i) => `<div class="photo-slot fl-photo fl-brief" role="img" aria-label="${A('Photo to shoot. ' + s.slot)}"><b>${i == null ? 'To shoot' : `To shoot, ${String(i + 1).padStart(2, '0')}`}</b><span>${A(s.slot)}</span></div>`;
  const big = `<figure class="fl-photo-big">${first.photo ? ctx.photo(first.id, { cls: 'fl-photo', pos: FRAME[first.id] || '50% 45%' }) : brief(first)}</figure>`;
  const fig = (s, i) => {
    const f = s.photo ? ctx.book.find(`05 Imagery/photos/${s.photo.split('/').pop()}`) : null;
    if (!s.photo) return `<li><span class="fl-v">${String(i + 1).padStart(2, '0')}</span><figure>${brief(s, i)}</figure></li>`;
    const cap = `${A(s.caption || s.alt || '')}${s.credit && !s.generated ? ` Photo: ${A(s.credit)}.` : ''}`;
    return `<li><span class="fl-v">${String(i + 1).padStart(2, '0')}</span><figure>${ctx.photo(s.id, { cls: 'fl-photo', pos: FRAME[s.id] || '50% 50%', slotNote: false })}<figcaption class="fl-q">${cap}${f ? ` ${dlLink(f, 'photo ' + (s.caption || s.id), 'Download JPG')}` : ''}</figcaption></figure></li>`;
  };
  const rows = [['Light', D.light], ['Crop', D.crop], ['Colour', D.colour], ['People', D.people]].filter(([, x]) => x);
  const body = `<dl class="fl-rows">${rows.map(([k, x]) => `<div><dt>${k}</dt><dd>${A(x)}</dd></div>`).join('')}</dl>
${h3('The shot list')}<p class="fl-p fl-narrow">${np ? 'The photographs in the kit, each with its caption, and a brief for each one still to take.' : 'No photographs yet. Each frame is the brief for one shot: who, where, the crop and the light.'}</p>
<ul class="fl-shots">${shots.map(fig).join('')}</ul>
${h3('Rules')}${rules(B.imagery.rules)}`;
  return sec(ctx, 'imagery', { l1: 'Imagery.', l2: `${cap1(nWord(shots.length))} shots.`, lead: A(D.subject), big, note: 'In the glass, the shot list', band: bandHtml, body });
}

// ---- 7 Layout: in the glass the page grid itself, at the band's width: margins, columns and gutters, one window per column ----
function layout(ctx) {
  const G = ctx.gridMeasures, B = ctx.brand;
  const col = String(Math.round(G.col * 10) / 10);
  const items = Array.from({ length: G.columns }, (_, i) => ({ value: 1, fill: i % 2 ? 'ink' : 'strong', name: `Column ${i + 1}`, val: '' }));
  // the page's own grid scaled to the band: every edge to the nearest reed boundary
  const lay = (D) => { const k = D.W / G.page.w, s = (x) => Math.round(x * k / 12) * 12; return items.map((_, i) => { const x0 = G.margin + i * (G.col + G.gutter); const a = s(x0), b = s(x0 + G.col); return { x: a, w: Math.max(12, b - a) }; }); };
  const label = `The page grid at the width of the band: ${G.columns} columns, ${G.margin} pixel margins and ${G.gutter} pixel gutters on a ${G.page.w} by ${G.page.h} page`;
  const html = glass(ctx, 'layout', items, { label, layout: lay }).replace(/<ol class="fl-key"[\s\S]*?<\/ol>/, `<dl class="fl-meas">${[['Page', `${G.page.w} × ${G.page.h}`], ['Margin', `${G.margin} px`], ['Column', `${col} px`], ['Gutter', `${G.gutter} px`], ['Base', `${G.base} px`]].map(([k, x]) => `<div><dt>${k}</dt><dd>${v(x)}</dd></div>`).join('')}</dl>`);
  const space = `<ol class="fl-space">${ctx.space.map((s) => `<li><i style="width:${s.px}px;height:${s.px}px" aria-hidden="true"></i>${v(String(s.px))}</li>`).join('')}</ol>`;
  const radii = ctx.radii.filter((r) => r.px < 9999);
  const body = `<div class="fl-two"><div>${h3('Spacing')}<p class="fl-p">Every gap is a step of ${v(`${G.base} px`)}. Space inside a group is smaller than the space between groups.</p>${space}</div>
<div>${h3('Corners and edges')}<p class="fl-p">Edges are ${v(`${B.ui.border} px`)}. ${A(B.ui.elevationNote || '')}</p><ul class="fl-radii">${radii.map((r) => `<li><i style="border-radius:${r.px}px" aria-hidden="true"></i><span class="fl-q">${A(r.use)}, ${v(`${r.px} px`)}</span></li>`).join('')}</ul></div></div>`;
  return sec(ctx, 'layout', { l1: 'Layout.', l2: `${cap1(nWord(G.columns))} columns, one step of ${G.base}.`, lead: `Every ${A(B.name)} page sits on one grid. The band below is that grid at its own width: each window is a column, each gap a gutter.`, note: 'In the glass, the page grid', band: html, body });
}

// ---- 8 Applications: the product on a phone, photographed; in the glass the screen's rows, one window each in its status colour ----
function kitCss(ctx) {
  const g = tokenGroups(ctx), decl = (o) => Object.entries(o).map(([k, x]) => `--${k}:${x};`).join('');
  return `.pg .ui{${decl(colourMap(ctx, 'light'))}${decl(g.space)}${decl(g.radius)}${decl(g.width)}${decl(g.font)}${decl(g.text)}${decl(g.shadow)}}\n.pg .ui[data-theme="dark"]{${decl(colourMap(ctx, 'dark'))}}\n${componentsCss(ctx)}\n.ui-display{font-stretch:${ctx.brand.fonts.display.stretch || 100}%}\n.ui :where(h1,h2,h3,p,ul,ol,dl,dd){margin:0;padding:0}`;
}
export function phoneArt(ctx, dark) {
  const B = ctx.brand, S = B.ui.screen.content, q = ctx.sceneInfo(phoneScene(ctx)).quads[0], w = 540, h = Math.round(w / q.aspect), pg = Math.round(S.progress * 100);
  const inner = `<div class="ui" data-theme="${dark ? 'dark' : 'light'}" style="position:relative;width:${w}px;height:${h}px;overflow:hidden;background:var(--surface);color:var(--text);font-family:var(--ff-body);padding:96px 40px 0;box-sizing:border-box">
<div style="font:500 26px/32px var(--ff-body);color:var(--quiet)">${A(B.ui.screen.title)}</div>
<div class="ui-display" style="margin-top:24px;font-size:88px;line-height:92px;letter-spacing:-0.02em">${A(S.time)}</div>
<div style="margin-top:16px;font:500 30px/38px var(--ff-body);color:var(--text-soft)">${A(S.eta)}</div>
<div style="position:relative;margin-top:48px;height:2px;background:var(--divider)"><i style="position:absolute;left:0;top:-2px;width:${pg}%;height:6px;background:var(--action)"></i></div>
<div style="display:flex;justify-content:space-between;margin-top:16px;font:400 22px/28px var(--ff-body);color:var(--quiet)"><span>${A(S.from)}</span><span>${A(S.to)}</span></div>
<div style="margin-top:48px;zoom:1.25">${ctx.ui.deliveryRows(4)}</div></div>`;
  return { html: ctx.artPage(inner, { w, h, css: kitCss(ctx) }), w, h };
}
function cardArt(ctx) {
  const B = ctx.brand, card = B.applications.card, q = ctx.sceneInfo(SCENES.card).quads[0], cw = 1050, ch = Math.round(cw / q.aspect);
  const D = ctx.roles.dark, L = ctx.roles.light, hz = ctx.logo.geos.horizontal, lw = 420;
  const logoH = ctx.edition === 'slot' ? `<div style="width:${lw}px;height:${Math.round(lw * hz.h / hz.w)}px;border:5px dashed ${D.quiet};color:${D.quiet};display:flex;align-items:center;justify-content:center;font:400 36px/1.2 var(--body)">Your logo here</div>` : ctx.logo.html('horizontal', { width: lw, colourway: cwOn(ctx, D.surface) });
  const front = `<div style="position:relative;width:${cw}px;height:${ch}px;overflow:hidden;background:${D.surface}"><div style="position:absolute;left:72px;top:${Math.round(ch / 2 - lw * hz.h / hz.w / 2)}px">${logoH}</div></div>`;
  const back = `<div style="position:relative;width:${cw}px;height:${ch}px;overflow:hidden;background:${L.surface};color:${L.text}">`
    + `<div class="disp" style="position:absolute;left:72px;top:64px;font-size:64px;line-height:72px">${A(card.person)}</div>`
    + `<div style="position:absolute;left:72px;top:144px;font:400 44px/52px var(--body);color:${L.quiet}">${A(card.role)}</div>`
    + `<div style="position:absolute;left:72px;bottom:64px;font:400 44px/56px var(--body)">${A(card.contact)}<br>${A(B.applications.site.url)}</div></div>`;
  return [{ html: ctx.artPage(front, { w: cw, h: ch }), w: cw, h: ch }, { html: ctx.artPage(back, { w: cw, h: ch }), w: cw, h: ch }];
}
function applications(ctx) {
  const B = ctx.brand, ap = B.applications, S = B.ui.screen.content, dark = ctx.C.toOklch((B.colours.find((c) => c.role === 'ground') || B.colours[0]).hex).L < 0.4;
  const rowsS = S.deliveries;
  const toneOf = (st) => { const s = ctx.status.find((x) => x.id === st); return s && ctx.roles.light[s.tone] && ctx.roles.light[s.tone].fg ? `t-${s.tone}` : 'strong'; };
  const labelOf = (st) => { const s = ctx.status.find((x) => x.id === st); return s ? s.label : st; };
  const items = rowsS.map((d) => ({ value: 1, fill: toneOf(d.status), name: A(d.to), val: A(labelOf(d.status)) }));
  const bandHtml = glass(ctx, 'applications', items, { label: `The rows of the ${B.ui.screen.title} screen, one window each in its status colour: ${rowsS.map((d) => `${d.to}, ${labelOf(d.status)}`).join('; ')}`, keyNote: 'Status colours are the interface tones, so each window matches its chip on the screen.' });
  const phone = ctx.mockup(phoneScene(ctx), { 'screen-phone': phoneArt(ctx, dark) });
  const cards = ctx.mockup(SCENES.card, cardArt(ctx));
  const big = `<figure class="fl-shot-big">${plateImg(`${A(phone)}`, `${A(`${B.name} app, ${B.ui.screen.title} screen, on a phone`)}`)}</figure>`;
  const D = ctx.roles.dark, L = ctx.roles.light;
  const front = `<div class="fl-card" style="background:${D.surface};color:${D.text}" role="img" aria-label="Business card, front: the horizontal logo"><span class="fl-card__lg">${logoOn(ctx, 'horizontal', D.surface, 200)}</span></div>`;
  const back = `<div class="fl-card fl-card--back" style="background:${L.surface};color:${L.text}"><p class="fl-card__nm">${A(ap.card.person)}</p><p style="color:${L.quiet}">${A(ap.card.role)}</p><p class="fl-card__ct">${A(ap.card.contact)}<br>${A(ap.site.url)}</p></div>`;
  const posts = `<ul class="fl-posts">${ap.social.map((t, i) => {
    const bg = [D.surface, D.action, L.surface][i % 3], ink = ctx.ratio(D.text, bg) >= ctx.ratio(D.surface, bg) ? D.text : D.surface;
    ctx.pair(ink, bg, { size: 24, what: 'book social post' });
    return `<li class="fl-post" style="background:${bg};color:${ink}"><p class="disp">${A(t)}</p><span class="fl-post__lg">${logoOn(ctx, 'symbol', bg, 40)}</span></li>`;
  }).join('')}</ul>`;
  const email = `<div class="fl-email"><p class="fl-email__n">${A(ap.email.person)}</p><p>${A(ap.email.role)}, ${A(B.name)}</p><p class="fl-q">${A(ap.card.contact)}<br>${A(ap.site.url)}</p><div class="fl-email__l">${logoModes(ctx, 'horizontal', 160)}</div></div>`;
  const body = `<div class="fl-two fl-two--app"><div>${h3('Business card')}<p class="fl-q">90 × 55 mm, front and back, photographed and flat.</p><figure class="fl-shot">${plateImg(`${A(cards)}`, `${A(`${B.name} business card, front and back`)}`)}</figure><div class="fl-cards">${front}${back}</div></div>
<div>${h3('Social')}<p class="fl-q">The brand&rsquo;s lines, one to a post.</p>${posts}${h3('Email signature')}${email}</div></div>`;
  return sec(ctx, 'applications', { l1: 'Applications.', l2: 'The brand at work.', lead: A(S.pickup), big, note: 'In the glass, the screen&rsquo;s rows', band: bandHtml, body });
}

// ---- 9 Downloads: in the glass the kit's folders, each as wide as its size on disk ----
function downloads(ctx) {
  const D = ctx.book, L = ctx.logo, slot = ctx.edition === 'slot', B = ctx.brand;
  const sum = (fs) => fs.filter(Boolean).reduce((a, f) => a + (f.size || 0), 0);
  const fmt = (n) => (n < 1024 ? `${n} B` : n < 1048576 ? `${Math.round(n / 1024)} KB` : `${(n / 1048576).toFixed(1)} MB`);
  const groups = [['Read me', [D.readmePdf, D.readme]], ['Logo', D.logoFiles], ['Colour', D.colour], ['Type', D.type], ['Icons', [...D.icons, D.iconsLicence]], ['Imagery', D.imagery]].map(([n, fs]) => [n, sum(fs)]).filter(([, s]) => s > 0);
  const fills = ['strong', 'ink', 'quiet'];
  const items = groups.map(([n, s], i) => ({ value: s, fill: fills[i % 3], name: n, val: fmt(s) }));
  const bandHtml = glass(ctx, 'downloads', items, { label: `The brand kit's folders, each as wide as its size: ${groups.map(([n, s]) => `${n} ${fmt(s)}`).join(', ')}` });
  const file = (f) => `<li class="fl-file"><span class="fl-file__n">${A(f.name)}</span>${v(`${A(f.ext)}, ${A(f.sizeText)}`)}<a class="fl-dl" href="${A(f.href)}" download aria-label="Download ${A(f.name)}">Download</a></li>`;
  const files = (list) => `<ul class="fl-files">${list.filter(Boolean).map(file).join('')}</ul>`;
  const logoRows = slot ? files(D.logoFiles)
    : `<ul class="fl-files">${L.versions.map((id) => { const f = D.logo(id); return `<li class="fl-file"><span class="fl-file__n">${A(L.labels[id])}</span><span class="fl-dls">${dlLink(f.svg, L.labels[id] + ' logo')}${dlLink(f.pdf, L.labels[id] + ' logo')}${f.png.map((p) => dlLink(p, `${L.labels[id]} logo, PNG, ${p.w} px wide`, `PNG ${p.w}`)).join('')}</span></li>`; }).join('')}</ul>`;
  const icons = `<ul class="fl-icons">${D.icons.map((f) => `<li><a class="fl-icon" href="${A(f.href)}" download aria-label="Download ${A(f.name)} icon, SVG">${ctx.ui.icon(f.name.replace('.svg', ''), 24)}<span>${A(f.name.replace('.svg', ''))}</span></a></li>`).join('')}</ul>${files([D.iconsLicence])}`;
  const photos = D.imagery.filter((f) => f.rel.startsWith('05 Imagery/photos/')), pdfs = D.imagery.filter((f) => f.ext === 'PDF');
  const group = (title, what, inner) => `<li class="fl-group"><div class="fl-group__k"><h3 class="fl-h3">${A(title)}</h3><p class="fl-q">${A(what)}</p></div><div class="fl-group__v">${inner}</div></li>`;
  const big = `<div class="fl-zip"><p><a class="bk-btn fl-btn" href="${A(D.zip.href)}" download aria-label="Download ${A(D.zip.name)}, ${A(D.zip.sizeText)}"><span class="bk-btn__t">Download the kit</span></a></p><p class="fl-q">${v(`${A(D.zip.name)}, ${A(D.zip.sizeText)}`)}</p></div>`;
  const body = `<ol class="fl-groups">
${group('Read me', 'Start here: what is in the kit and how to use it.', files([D.readmePdf, D.readme]))}
${group('Logo', slot ? 'The labelled slot frame, and where the approved files go.' : 'Each version as SVG and PDF, and as PNG at three widths, transparent.', logoRows)}
${group('Colour', 'The palette for Adobe, CSS and JSON, and a swatch sheet.', files(D.colour))}
${group('Type', 'The specimen sheet, and the faces with their links and licence.', files(D.type))}
${group('Icons', `${D.icons.length} interface icons, drawn in the brand's stroke.`, icons)}
${group('Imagery', photos.length ? 'The photography direction, and the photos.' : 'The photography direction and shot list.', files([...pdfs, ...photos]))}
</ol>`;
  return sec(ctx, 'downloads', { l1: `The ${A(B.name)} kit.`, l2: 'Logo, colour, type, icons and imagery.', lead: 'One zip, ready for print and screen. Every file is also here on its own.', big, note: 'In the glass, the kit by size', band: bandHtml, body });
}

export function brandBook(ctx) {
  if (!ctx.book) throw new Error('brandBook needs ctx.book (set by the engine book builder)');
  return [overview, voice, logo, colour, typography, imagery, layout, applications, downloads].map((f) => f(ctx)).join('\n');
}
