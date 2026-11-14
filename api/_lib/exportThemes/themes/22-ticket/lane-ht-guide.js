// Theme 22, Ticket: lane ht, the guidelines as a web site (guideSite). One page a file, every page opens on its own ticket: the body carries the
// page's one thing (the line, the mark, the colours, a photograph) and the stub holds the page's name as its h1, its number, its barcode and the
// next page. The rules, values and examples run on below the ticket, on the bar top, on the ticket's own two columns. The front page is the cover
// ticket and the running order in full. All copy comes from brand.json or is the template's own; every value is read from ctx.
import { plateImg } from '../../engine/plate.js';
import { A, roles, listAnd, weightName, textWidth } from './helpers.js';
import { siteUnits } from '../../engine/guide-site.js';
import { appPhotos } from './lane-bk-apps.js';
import { shotPhoto, big, fitTwo, fitSet, BODY, logoOn, logoAs, logoBoth, ticket, paperOf, pageStub, codeOf, h2, rows, rules, zone, main, side, full, bar, order, pager } from './lane-ht-parts.js';

const PART = 'Brand guidelines';
const pctOf = (n) => `${Math.round(n * 100)}%`;
const hex = (h) => `<span class="m">${A(h.toUpperCase())}</span>`;
// a colour value as the engine gives it (an array, an { r, g, b } or { L, C, H } object, or a string), printed as numbers with spaces
const valText = (v) => (typeof v === 'string' ? v.replace(/^[a-z]+\(|\)$/gi, '') : (Array.isArray(v) ? v : Object.values(v || {})).map((n) => (typeof n === 'number' ? +n.toFixed(3) : n)).join(' '));
const fam = (f) => (f === 'display' ? 'var(--display)' : f === 'mono' ? 'var(--mono)' : 'var(--body)');

// the page's ticket: the body, then the stub with the page's name, number, barcode and the next page
function open(ctx, R, id, body, { cls = '', bg, ink } = {}) {
  const nav = siteUnits(ctx), p = ctx.pages.find((x) => x.id === id), i = nav.units.findIndex((u) => u.id === id), nx = nav.units[i + 1];
  const next = nx ? { href: nx.file, ref: nx.ref, title: nx.title } : null;
  const stub = pageStub(ctx, { part: PART, section: p.section ? `${p.section.n} ${p.section.title}` : '', title: p.title, no: p.ref, code: codeOf(ctx, 'g', ctx.pageNo(id)), next });
  return ticket(ctx, R, { body, stub, cls: `tb-tk--open ht-tk ${cls}`, bg, ink });
}
const page = (ctx, R, id, body, z, opt) => `${open(ctx, R, id, body, opt)}\n${zone(z)}`;
const foot = (t) => `<p class="tb-body-foot">${t}</p>`;

// ---- 1 Introduction ----
function intro(ctx, R) {
  const B = ctx.brand;
  return page(ctx, R, 'intro', `<p class="tb-big disp">${big(ctx, B.product, { max: 88, min: 40, maxLines: 3, nMax: 44, nMin: 26, nLines: 6 })}</p>`,
    main(`<p class="tb-lead">${A(B.description)}</p>`) + side(rows([['City', A(B.city || '')], ['Version', A(B.version.number)], ['Issued', A(ctx.date)]]))
    + main(`${h2('Who it serves')}<p class="tb-p">${A(B.audience)}</p>`));
}
function personality(ctx, R) {
  const B = ctx.brand, P = B.personality, set = fitSet(ctx, P.map((p) => p.trait), { wide: { w: BODY.w - 64, max: 96, min: 40, maxLines: 1 }, narrow: { w: BODY.n - 40, max: 48, min: 28, maxLines: 2 } });
  const body = `<ol class="ht-traits">${P.map((p, i) => `<li><span class="num tb-b">${i + 1}</span><p class="disp">${set[i]}</p></li>`).join('')}</ol>`;
  return page(ctx, R, 'personality', body,
    main(`${h2('What each one means')}<ol class="tb-order">${P.map((p) => `<li><p class="tb-order__k disp">${A(p.trait)}</p><p class="tb-p">${A(p.means)}</p></li>`).join('')}</ol>`)
    + side(`<p class="tb-note">${P.length} traits. Read them as a running order: the first leads.</p>`), paperOf(R));
}

// ---- 2 Voice ----
function voice(ctx, R) {
  const V = ctx.brand.voice, ex = fitSet(ctx, V.principles.map((p) => p.example), { wide: { w: BODY.w - 232, max: 56, min: 24, maxLines: 1 }, narrow: { w: BODY.n, max: 36, min: 22, maxLines: 2 } });
  const body = `<ol class="tb-set">${V.principles.map((p, i) => `<li><p class="tb-set__k">${A(p.title)}</p><p class="tb-set__v disp">${ex[i]}</p></li>`).join('')}</ol>`;
  return page(ctx, R, 'voice', body,
    main(`${h2('The principles')}<ol class="tb-order">${V.principles.map((p) => `<li><p class="ht-k">${A(p.title)}</p><p class="tb-p">${A(p.example)}</p></li>`).join('')}</ol>`)
    + side(`<p class="tb-note">Each principle with the line that shows it. Write the line first; the principle is the reason.</p>`)
    + main(`${h2('Writing the name')}<p class="tb-p">${A(V.nameRules)}</p>`));
}
function writeThis(ctx, R) {
  const W = ctx.brand.voice.writeThis, w0 = W[0];
  const body = `<p class="tb-big disp">${big(ctx, w0.write, { max: 96, min: 40, maxLines: 2, nMax: 48, nMin: 28 })}</p><p class="ht-not"><b>Not</b> ${A(w0.not)}</p>`;
  return page(ctx, R, 'write-this', body,
    full(`${h2('Write this, not that')}<ul class="tb-wtn">${W.map((r) => `<li><p class="tb-wtn__w">${A(r.write)}</p><p class="tb-wtn__n"><b>Not</b> ${A(r.not)}</p><p class="tb-wtn__b">${A(r.because)}</p></li>`).join('')}</ul>`));
}
function messaging(ctx, R) {
  const B = ctx.brand, V = B.voice, P = paperOf(R);
  const take = (title, text) => ticket(ctx, R, { body: `<p class="tb-h4">${title}</p><p class="tb-say">${A(text)}</p>`, stub: `<div class="tb-stub__act"><p class="tb-b">Boilerplate</p><p class="tb-s">Use it whole.</p></div>`, cls: 'tb-tk--s tb-tk--inv' });
  return page(ctx, R, 'messaging', `<p class="tb-big disp">${big(ctx, B.lines.primary, { max: 120, min: 48 })}</p>${foot('The primary line. It leads every piece that has room for one line.')}`,
    main(`${h2('The other lines')}<ul class="tb-lines">${B.lines.others.map((l) => `<li class="disp">${A(l)}</li>`).join('')}</ul>`)
    + full(`<div class="tb-take">${take('The brand in 25 words', V.boilerplate25)}${take('The brand in 50 words', V.boilerplate50)}</div>`), P);
}

// ---- 3 Logo ----
function logo(ctx, R) {
  const B = ctx.brand, L = ctx.logo;
  const body = `<div class="tb-logo-hero">${logoOn(ctx, R, 'colour', R.field, 680, 200)}</div>${foot(A(B.logo.idea))}`;
  const when = L.versions.filter((id) => B.logo.when[id]).map((id) => [A(L.labels[id]), A(B.logo.when[id])]);
  return page(ctx, R, 'logo', body, main(`${h2('Which logo, where')}${rows(when)}`) + side(`<p class="tb-note">${L.versions.length} versions, all drawn from one mark.</p>`));
}
function logoVersions(ctx, R) {
  const B = ctx.brand, L = ctx.logo, cw = B.logo.colourways;
  const order = ['colour', 'symbol', 'mono-dark', 'mono-light', 'stacked', 'reversed', 'horizontal'].filter((id) => L.versions.includes(id));
  const wide = new Set(['colour', 'horizontal']);
  const cell = (id) => {
    const w = cw[L.colourwayOf(id)], ink = R.inkOn(w.ground, 13, 400, `guide site logo sheet ${id}`), maxW = wide.has(id) ? 340 : 180, maxH = id === 'symbol' ? 96 : id === 'stacked' ? 110 : 80;
    const near = `${ctx.ratio(w.ground, R.table) < 1.3 ? ' is-near-d' : ''}${ctx.ratio(w.ground, ctx.roles.light.surface) < 1.3 ? ' is-near-l' : ''}`;
    return `<li class="tb-cell${wide.has(id) ? ' tb-cell--w' : ''}${near}" style="background:${w.ground};color:${ink}"><span class="tb-cell__lg">${logoAs(ctx, id, maxW, maxH)}</span><span class="tb-cell__cap"><b>${A(L.labels[id])}</b><span>${A(B.logo.when[id] || '')}</span></span></li>`;
  };
  const P = paperOf(R);
  const body = `<div class="tb-logo-hero">${logoOn(ctx, R, 'horizontal', P.bg, 640, 120)}</div>${foot('The horizontal logo on Stock. Every version below is printed on the ground it is made for.')}`;
  return `${open(ctx, R, 'logo-versions', body, P)}\n${zone(`<ul class="tb-full tb-sheet tb-sheet--logo">${order.map(cell).join('')}</ul>`)}`;
}
function clearSpace(ctx, R) {
  const L = ctx.logo, g = L.geo, pad = (L.clearShare / 100) * 100 * g.height / g.width;
  const body = `<div class="ht-center"><div class="tb-clear__box ht-clear" style="padding:${pad.toFixed(3)}%">${logoOn(ctx, R, 'colour', R.field, 420, 140)}</div></div>`;
  return page(ctx, R, 'clear-space', body,
    main(`<p class="tb-lead">Keep ${L.clearShare}% of the logo&rsquo;s height clear on every side.</p><p class="tb-p ht-gap">Nothing else enters the dashed line: no type, no edge of a photo, no other mark. Where a piece is tight, use a smaller logo, never a smaller margin.</p>`)
    + side(rows([['Clear space', `<span class="m">${L.clearShare}%</span> of the height`]])));
}
function minSize(ctx, R) {
  const L = ctx.logo, ms = L.minSize, slot = ctx.edition === 'slot';
  const sizes = [ms.screenPx, ms.screenPx * 2, ms.screenPx * 4];
  const body = slot ? `<p class="tb-big disp">${big(ctx, 'Set the smallest size with the logo.', { max: 72, min: 36 })}</p>`
    : `<ol class="ht-ladder">${sizes.map((w) => `<li style="--w:${w}px"><span class="ht-ladder__lg">${logoOn(ctx, R, 'colour', R.field, w, 400)}</span><span class="m">${w} px</span></li>`).join('')}</ol>`;
  return page(ctx, R, 'min-size', body,
    main(slot ? `<p class="tb-p">Set the smallest size once the logo is in place: the width at which every part of it still reads as one mark.</p>`
      : `<p class="tb-lead">Never smaller than <span class="m">${ms.screenPx} px</span> wide on screen or <span class="m">${ms.printMm} mm</span> in print.</p><p class="tb-p ht-gap">The ticket shows it at that width, then at twice and four times.</p>`)
    + side(slot ? '' : rows([['Screen', `<span class="m">${ms.screenPx} px</span>`], ['Print', `<span class="m">${ms.printMm} mm</span>`]])));
}
function logoGrounds(ctx, R) {
  const B = ctx.brand, cw = B.logo.colourways, ids = Object.keys(cw);
  const seg = (k) => {
    const c = cw[k], ink = R.inkOn(c.ground, 13, 600, `guide site grounds ${k}`);
    return `<li class="ht-gr" style="background:${c.ground};color:${ink}"><span class="ht-gr__lg">${logoOn(ctx, R, 'colour', c.ground, 300, 72)}</span><span class="tb-b">${A(ctx.cap(k.replace(/-/g, ' ')))}</span></li>`;
  };
  const shot = (B.imagery.shots || [])[0];
  const onPhoto = shot ? full(`${h2('On a photograph')}<figure class="ht-onph">${ctx.photo(shot.id, { cls: 'ht-onph__img' })}<span class="ht-onph__lg" style="--onph:${R.table}">${logoOn(ctx, R, 'colour', R.table, 280, 64)}</span></figure><p class="tb-note ht-gap">Set it on the photograph&rsquo;s darkest quiet area, never across a face or a lit sign.</p>`) : '';
  return `${open(ctx, R, 'logo-grounds', `<ul class="ht-grounds">${ids.map(seg).join('')}</ul>`, { cls: 'tb-tk--strip' })}\n${zone(main(rows(ids.filter((k) => B.logo.when[k]).map((k) => [A(ctx.cap(k.replace(/-/g, ' '))), A(B.logo.when[k])]))) + onPhoto)}`;
}
function logoMisuse(ctx, R) {
  const P = paperOf(R);
  const wrong = [['Do not stretch, squash or skew it.', 'transform:scaleX(1.45)'], ['Do not rotate it.', 'transform:rotate(-12deg)'], ['Do not recolour it outside the versions.', '', ctx.colours.find((c) => !['action'].includes(c.role) && ctx.ratio(c.hex, P.bg) >= 1.5)], ['Do not outline it or put it in a box.', 'outline:2px solid currentColor;outline-offset:12px']];
  const cell = ([t, st, col]) => `<li class="ht-mis"><span class="ht-mis__lg" style="${st}${col ? `;color:${col.hex}` : ''}">${ctx.logo.forMisuse(220, { fill: col ? col.hex : P.ink })}</span><p class="tb-b">${A(t)}</p></li>`;
  return page(ctx, R, 'logo-misuse', `<ul class="ht-miss">${wrong.map(cell).join('')}</ul>`,
    main(`${h2('Never')}<ul class="tb-never">${['Do not add shadows, glows or other effects.', 'Do not set it on a busy part of a photo.', 'Do not rebuild it from type.'].map((m) => `<li>${A(m)}</li>`).join('')}</ul>`), P);
}

// ---- 4 Colour ----
function stripOf(ctx, R, cols, label) {
  return `<ul class="tb-strip ht-strip" aria-label="${A(label)}">${cols.map((c) => {
    const ink = R.inkOn(c.hex, 15, 600, `guide site strip ${c.id}`);
    return `<li class="tb-seg${R.nearTable(c.hex) ? ' is-near' : ''}${ctx.ratio(c.hex, ctx.roles.light.surface) < 1.3 ? ' is-near-l' : ''}" style="--share:${c.share};background:${c.hex};color:${ink}"><span class="ht-seg"><span class="tb-b">${A(c.name)}</span><span class="m">${A(c.hex.toUpperCase())}</span><span class="tb-seg__p disp" style="--pfs:${Math.min(56, Math.max(24, Math.floor(c.share * 180)))}px">${pctOf(c.share)}</span></span></li>`;
  }).join('')}</ul>`;
}
function palette(ctx, R) {
  const cols = ctx.colours;
  const list = `<ul class="ht-cols-l">${cols.map((c) => `<li><span class="ht-chip" style="background:${c.hex}"></span><div><p class="ht-k">${A(c.name)}</p><p class="tb-p">${A(c.lands)}</p></div><p class="ht-v">${hex(c.hex)}<span class="tb-s">${A(c.role)}</span></p></li>`).join('')}</ul>`;
  return `${open(ctx, R, 'palette', stripOf(ctx, R, cols, 'The palette, by share'), { cls: 'tb-tk--strip' })}\n${zone(main(`${h2('Where each colour lands')}${list}`) + side(`<p class="tb-note">${cols.length} colours. The width of each on the ticket is its share of a piece.</p>`))}`;
}
function proportion(ctx, R) {
  const cols = [...ctx.colours].sort((a, b) => b.share - a.share);
  const body = `<ol class="ht-prop">${cols.map((c) => `<li style="--share:${c.share};background:${c.hex};color:${R.inkOn(c.hex, 24, 600, `guide site proportion ${c.id}`)}"${R.nearTable(c.hex) ? ' class="is-near"' : ''}><span class="disp">${pctOf(c.share)}</span><span class="tb-b">${A(c.name)}</span></li>`).join('')}</ol>`;
  return page(ctx, R, 'proportion', body,
    main(`<p class="tb-lead">${A(cols[0].name)} carries ${pctOf(cols[0].share)} of a piece. ${A(cols[cols.length - 1].name)} gets ${pctOf(cols[cols.length - 1].share)}.</p>`)
    + main(`${h2('The tones')}${rows(ctx.tones.map((t) => [A(t.name), `${A(t.lands || t.role || '')} ${hex(t.hex)}`]))}`), { cls: 'ht-tk--flush' });
}
function contrast(ctx, R) {
  const P = ctx.pairs, top = [...P].sort((a, b) => b.ratio - a.ratio)[0], name = (h) => (ctx.colours.find((c) => c.hex.toLowerCase() === h.toLowerCase()) || ctx.tones.find((c) => c.hex.toLowerCase() === h.toLowerCase()) || { name: h }).name;
  // a tone is often named for its ground already ("Muted on Stock"): say the ground once; a tone for another ground reads "Quiet on White, on Concrete"
  const pairName = (p) => { const f = name(p.fgHex), g = name(p.bgHex); return f.toLowerCase().endsWith(` on ${g.toLowerCase()}`) ? f : / on /i.test(f) ? `${f}, on ${g}` : `${f} on ${g}`; };
  const body = `<p class="ht-ratio disp">${A(top.ratioText)}<span class="ht-ratio__1">:1</span></p>${foot(`${A(pairName(top))}. ${A(top.use)}.`)}`;
  const item = (p) => `<li><span class="ht-pair disp${p.ratio < 1.3 ? ' is-near' : ''}" style="background:${p.bgHex};color:${p.fgHex}">Aa</span><div><p class="ht-k">${A(pairName(p))}</p><p class="tb-p">${A(p.use)}${p.large && !/24 px/.test(p.use) ? '. Large type only: 24 px and over.' : '.'}</p></div><p class="ht-v"><span class="m">${A(p.ratioText)}:1</span></p></li>`;
  return page(ctx, R, 'contrast', body, main(`${h2('Every pair the brand uses')}<ul class="ht-cols-l">${P.map(item).join('')}</ul>`)
    + side(`<p class="tb-note">${P.length} pairs, measured with the WCAG formula. Body text needs 4.5:1; type at 24 px and over needs 3:1.</p>`), { bg: top.bgHex, ink: top.fgHex });
}
function colourValues(ctx, R) {
  const f = ctx.colours.find((c) => c.hex.toLowerCase() === R.field.toLowerCase()) || ctx.colours[0];
  const v = (c) => `<li><span class="ht-chip" style="background:${c.hex}"></span><p class="ht-k">${A(c.name)}</p><dl class="ht-vals"><div><dt>HEX</dt><dd class="m">${A(c.hex.toUpperCase())}</dd></div><div><dt>RGB</dt><dd class="m">${A(valText(c.rgb || ctx.C.hexToRgb(c.hex)))}</dd></div><div><dt>OKLCH</dt><dd class="m">${A(valText(c.oklch || ''))}</dd></div>${ctx.C.cmykOf(c) ? `<div><dt>CMYK</dt><dd class="m">${A(ctx.C.cmykOf(c))}</dd></div>` : ''}</dl></li>`;
  return page(ctx, R, 'colour-values', `<p class="ht-hex m">${A(f.hex.toUpperCase())}</p>${foot(`${A(f.name)}, the ticket&rsquo;s colour.`)}`,
    full(`${h2('The colours')}<ul class="ht-valist">${ctx.colours.map(v).join('')}</ul>`) + full(`${h2('The tones')}<ul class="ht-valist">${ctx.tones.map(v).join('')}</ul>`));
}

// ---- 5 Type ----
function typefaces(ctx, R) {
  const F = ctx.brand.fonts, P = paperOf(R);
  const body = `<p class="tb-big disp">${big(ctx, F.display.family, { max: 160, min: 48, maxLines: 1, nMax: 44, nMin: 28, nLines: 2 })}</p>${foot(`Display, ${A(listAnd(F.display.weights.map(weightName)))}. Body in ${A(F.body.family)}. Values in ${A(F.mono.family)}.`)}`;
  const face = (k, f, what) => `<li><p class="ht-face" style="font-family:${fam(k)};${k === 'display' ? `font-stretch:${f.stretch || 100}%;` : ''}font-weight:${f.weights[f.weights.length - 1]}">${A(f.family)}</p><div><p class="ht-k">${what}</p><p class="tb-p">${A(listAnd(f.weights.map((w) => `${weightName(w)} ${w}`)))}${f.axes ? `, ${A(f.axes)}` : ''}</p></div></li>`;
  return page(ctx, R, 'typefaces', body, main(`${h2('Three faces')}<ul class="ht-faces">${face('display', F.display, 'Display: the big line')}${face('body', F.body, 'Body: reading text and labels')}${face('mono', F.mono, 'Mono: values only')}</ul>`), P);
}
function hierarchy(ctx, R) {
  const S = ctx.brand.type.scale, F = ctx.brand.fonts;
  const wOf = (s) => { const f = F[s.face] || F.body; return f.weights.includes(s.weight) ? s.weight : f.weights[f.weights.length - 1]; };
  const label = (s) => ctx.cap(s.token);
  // shown at the real size where it fits the body; larger steps are capped to the width, and say so
  const shown = (s) => Math.min(s.size, Math.floor((BODY.w - 160) / (textWidth(ctx, s.face === 'display' ? 'display' : 'body', label(s), 100) / 100) * 0.96));
  const body = `<ol class="ht-scale">${S.map((s) => `<li><span class="num tb-s">${s.size}</span><span class="ht-scale__t" style="font-family:${fam(s.face)};${s.face === 'display' ? `font-stretch:${F.display.stretch || 100}%;letter-spacing:-0.015em;` : ''}font-weight:${wOf(s)};--fs:${shown(s)}px">${A(label(s))}</span></li>`).join('')}</ol>`;
  return page(ctx, R, 'hierarchy', body,
    full(`${h2('The scale')}<ul class="ht-cols-l ht-cols-l--4">${S.map((s) => `<li><p class="ht-k">${A(label(s))}</p><p class="tb-p">${A(s.use)}</p><p class="ht-v"><span class="m">${s.size} px</span><span class="tb-s">line ${s.line}, ${A(weightName(wOf(s)))}</span></p>${shown(s) < s.size ? `<p class="tb-s">On the ticket at ${shown(s)} px.</p>` : '<p></p>'}</li>`).join('')}</ul>`), { cls: 'ht-tk--scale' });
}
function typeInUse(ctx, R) {
  const T = ctx.brand.type.sample, P = paperOf(R);
  const body = `<div class="ht-use"><p class="disp ht-use__h">${big(ctx, T.headline, { max: 72, min: 36, maxLines: 2, nMax: 40, nMin: 24 })}</p><p class="ht-use__p">${A(T.paragraph)}</p><p class="tb-s">${A(T.caption || '')}</p></div>`;
  const S = ctx.brand.type.scale, at = (k) => S.find((s) => s.token === k);
  const used = [['headline', 'The line'], ['body', 'The paragraph'], ['caption', 'The caption']].filter(([k]) => at(k)).map(([k, t]) => [t, `${A(ctx.cap(k))}, <span class="m">${at(k).size} px</span>`]);
  return page(ctx, R, 'type-in-use', body, main(`<p class="tb-lead">One line, one paragraph and a caption: the whole hierarchy most pieces need.</p>`) + side(rows(used)), P);
}
function typeRules(ctx, R) {
  const r = ctx.brand.type.rules;
  return page(ctx, R, 'type-rules', `<p class="tb-big disp">${big(ctx, r[0].do, { max: 64, min: 32, maxLines: 3, nMax: 34, nMin: 22, nLines: 6 })}</p>${foot(`<b>Don't</b> ${A(r[0].dont)}`)}`,
    full(`${h2('The rules')}${rules(r)}`));
}

// ---- 6 Imagery ----
function photoBody(ctx, R, shot) { return `<div class="ht-ph">${shotPhoto(ctx, R, shot, 'ht-ph__img')}</div>`; }
function photoDirection(ctx, R) {
  const D = ctx.brand.imagery.direction, shot = ctx.brand.imagery.shots[0];
  const keys = [['subject', 'Subject'], ['light', 'Light'], ['crop', 'Crop'], ['colour', 'Colour'], ['people', 'People']].filter(([k]) => D[k]);
  return page(ctx, R, 'photo-direction', photoBody(ctx, R, shot), main(`<p class="tb-lead">${A(D.subject)}</p>`) + main(`${h2('How to shoot it')}${rows(keys.slice(1).map(([k, t]) => [t, A(D[k])]))}`), { cls: 'tb-tk--photo' });
}
function shotList(ctx, R) {
  const S = ctx.brand.imagery.shots;
  const body = `<ul class="ht-contact">${S.map((s, i) => `<li>${shotPhoto(ctx, R, s, 'ht-contact__img', { note: false })}<span class="num">${i + 1}</span></li>`).join('')}</ul>`;
  return page(ctx, R, 'shot-list', body, main(`${h2('The shots')}<ol class="ht-shots">${S.map((s, i) => `<li><span class="num disp">${i + 1}</span><p class="tb-p">${A(s.slot || [s.caption, s.alt].filter(Boolean).join(". ").replace(/([^.!?])$/, "$1."))}</p></li>`).join('')}</ol>`)
    + side(`<p class="tb-note">${S.length} shots. Each frame on the ticket is numbered to its line here.</p>`), { cls: 'tb-tk--photo' });
}
function imageryRules(ctx, R) {
  const r = ctx.brand.imagery.rules, S = ctx.brand.imagery.shots, shot = S[2] || S[0];
  return page(ctx, R, 'imagery-rules', photoBody(ctx, R, shot), full(`${h2('The rules')}${rules(r)}`), { cls: 'tb-tk--photo' });
}

// ---- 7 Layout ----
function gridFig(ctx, L, cls = '') {
  const W = L.page.w, H = L.page.h, m = L.margin, g = L.gutter, n = L.columns, cw = (W - 2 * m - (n - 1) * g) / n, pc = (v) => `${(v / W * 100).toFixed(4)}%`;
  const cols = Array.from({ length: n }, (_, i) => `<i style="left:${pc(m + i * (cw + g))};width:${pc(cw)}"></i>`).join('');
  return `<div class="ht-grid ${cls}" style="aspect-ratio:${W}/${H};--m:${pc(m)};--mv:${(m / H * 100).toFixed(4)}%" role="img" aria-label="${n} columns, ${m} px margins, ${g} px gutters, on a ${W} by ${H} px page">${cols}</div>`;
}
function grid(ctx, R) {
  const L = ctx.brand.layout, W = L.page.w, cw = (W - 2 * L.margin - (L.columns - 1) * L.gutter) / L.columns;
  return page(ctx, R, 'grid', gridFig(ctx, L),
    main(`<p class="tb-lead">${L.columns} columns on a ${L.page.w} by ${L.page.h} px page, with ${L.margin} px margins and ${L.gutter} px gutters.</p><p class="tb-p ht-gap">Every size and gap is a multiple of the ${L.base} px base.</p>`)
    + side(rows([['Page', `<span class="m">${L.page.w} × ${L.page.h}</span>`], ['Columns', `<span class="m">${L.columns}</span>`], ['Column', `<span class="m">${ctx.fmt(cw)} px</span>`], ['Margin', `<span class="m">${L.margin} px</span>`], ['Gutter', `<span class="m">${L.gutter} px</span>`], ['Base', `<span class="m">${L.base} px</span>`]])), { cls: 'ht-tk--grid' });
}
function layouts(ctx, R) {
  const B = ctx.brand, L = B.layout, P = paperOf(R);
  const lay = (title, note, inner) => `<li><div class="ht-lay" style="aspect-ratio:${L.page.w}/${L.page.h};padding:${(L.margin / L.page.w * 100).toFixed(3)}%">${inner}</div><p class="ht-k">${title}</p><p class="tb-s">${note}</p></li>`;
  const one = lay('One line', 'The line across eight columns, the rest of the page empty.', `<p class="disp ht-lay__l">${A(B.lines.primary)}</p>`);
  const two = lay('Line and photograph', 'Six columns of type, six of photograph.', `<div class="ht-lay__two"><p class="disp ht-lay__l ht-lay__l--s">${A(B.lines.others[0] || B.lines.primary)}</p><span class="ht-lay__ph"></span></div>`);
  const tk = lay('The ticket', 'Body, perforation and stub: the stub takes the last three columns.', `<div class="ht-lay__tk"><span></span><span></span></div>`);
  return page(ctx, R, 'layouts', `<ul class="ht-lays">${one}${two}${tk}</ul>`,
    main(`${h2('Three layouts')}<p class="tb-p">Start from one of these. Each sits on the ${L.columns}-column grid; none fills it.</p>`) + full(`${h2('The brand&rsquo;s rules')}<ol class="tb-order">${(B.guideB.rules || []).map((r) => `<li><p class="ht-k">${A(r.title)}</p><p class="tb-p">${A(r.text)}</p></li>`).join('')}</ol>`), P);
}

// ---- 8 Applications ----
let PHOTOS = null;
const photosOf = (ctx, R) => (PHOTOS && PHOTOS.slug === ctx.slug + ctx.edition ? PHOTOS.list : (PHOTOS = { slug: ctx.slug + ctx.edition, list: appPhotos(ctx, R) }).list);
function appCell(ctx, p) {
  const r = p.win.w / p.win.h, pc = (n) => `${(n * 100).toFixed(3)}%`;
  if (p.frame) return `<div class="tb-app tb-app--frame" style="--r:${r.toFixed(4)}"><p class="tb-b">${A(ctx.cap(p.what))}</p><p class="tb-s">Photograph to come</p></div>`;
  const img = `${plateImg(`${p.src}`, ``, `left:${pc(-p.win.x / p.win.w)};top:${pc(-p.win.y / p.win.h)};width:${pc(p.si.w / p.win.w)};height:${pc(p.si.h / p.win.h)}`)}`;
  return `<div class="tb-app" style="--r:${r.toFixed(4)}" role="img" aria-label="${A(`${ctx.brand.name} ${p.what}`)}"><div class="tb-app__win">${img}${p.over}</div></div>`;
}
function businessCard(ctx, R) {
  const B = ctx.brand, ap = B.applications, cw = B.logo.colourways, rev = cw[R.colourwayOn(R.table)], P = paperOf(R);
  ctx.pair(R.fieldInk, R.field, { size: 13, what: 'guide site business card' });
  const front = `<div class="tb-card" style="background:${R.field};color:${R.fieldInk}" role="img" aria-label="Business card, front: the logo and the line ${A(B.lines.primary)}"><span class="tb-card__lg">${logoOn(ctx, R, 'colour', R.field, 200, 64)}</span><p class="tb-card__l">${A(B.lines.primary)}</p></div>`;
  const back = `<div class="tb-card" style="background:${rev.ground};color:${R.inkOn(rev.ground, 13, 400, 'guide site card back')}"><p class="tb-card__nm">${A(ap.card.person)}</p><p>${A(ap.card.role)}</p><p class="tb-card__ct">${A(ap.card.contact)}<br>${A(ap.site.url)}</p></div>`;
  return page(ctx, R, 'business-card', `<div class="ht-cards">${front}${back}</div>`,
    main(`<p class="tb-lead">Front: the logo and the line on ${A(ctx.colours.find((c) => c.hex.toLowerCase() === R.field.toLowerCase())?.name || 'the ticket colour')}. Back: the person, on the dark.</p>`)
    + side(rows([['Size', '<span class="m">90 × 55 mm</span>'], ['Name', A(ap.card.person)], ['Role', A(ap.card.role)]])), P);
}
function social(ctx, R) {
  const B = ctx.brand, ap = B.applications;
  const posts = `<ul class="tb-posts ht-posts">${ap.social.map((t, i) => {
    const bg = i === 1 ? R.paper : R.table, ink = i === 1 ? R.table : R.paper;
    ctx.pair(ink, bg, { size: 24, what: 'guide site social post' });
    return `<li class="tb-post" style="background:${bg};color:${ink}"><p class="disp">${A(t)}</p><span class="tb-post__lg">${logoOn(ctx, R, 'colour', bg, 104, 28)}</span></li>`;
  }).join('')}</ul>`;
  return page(ctx, R, 'social', posts, main(`<p class="tb-lead">One line to a post, set big, with the logo small in a corner.</p>`) + main(`${h2('The lines')}<ul class="tb-lines">${ap.social.map((l) => `<li class="disp">${A(l)}</li>`).join('')}</ul>`));
}
function signage(ctx, R) {
  const B = ctx.brand, ph = photosOf(ctx, R);
  const body = `<div class="tb-apps" style="--apps-cols:${ph.map((p) => `minmax(0,${(p.win.w / p.win.h).toFixed(4)}fr)`).join(' ')}">${ph.map((p) => appCell(ctx, p)).join('')}</div>`;
  return page(ctx, R, 'signage', body, main(`<p class="tb-lead">${A(B.applications.signage)}</p>`) + side(`<p class="tb-note">${A(ctx.cap(listAnd(ph.map((p) => `the ${p.what}`))))}.</p>`), { cls: 'tb-tk--photo tb-tk--apps' });
}
function emailSignature(ctx, R) {
  const B = ctx.brand, ap = B.applications, E = B.guideB.email || {}, P = paperOf(R);
  const sig = `<div class="tb-email"><p class="tb-email__n">${A(ap.email.person)}</p><p>${A(ap.email.role)}, ${A(B.name)}</p><p class="tb-s">${A(ap.card.contact)}<br>${A(ap.site.url)}</p><div class="tb-email__l">${logoOn(ctx, R, 'horizontal', P.bg, 168, 40)}</div></div>`;
  const msg = `<div class="ht-mail">${E.subject ? `<p class="ht-mail__s">${A(E.subject)}</p>` : ''}${E.to ? `<p class="tb-s">To ${A(E.to)}${E.time ? `, ${A(E.time)}` : ''}</p>` : ''}<div class="ht-mail__b">${(E.body || []).map((t) => `<p>${A(t)}</p>`).join('')}</div>${sig}</div>`;
  return page(ctx, R, 'email-signature', msg, main(`<p class="tb-lead">Name, role, contact and the horizontal logo. Nothing else under the name.</p>`) + side(rows([['Name', A(ap.email.person)], ['Role', A(ap.email.role)]])), P);
}
function digital(ctx, R) {
  const B = ctx.brand, S = B.ui.screen.content, rs = S.deliveries.slice(0, 3);
  const screen = `<div class="tb-device ht-device"><div class="ui tb-screen" role="img" aria-label="${A(B.name)} product screen: ${A(S.eta)}. ${A(S.rider)}, ${A(S.riderNote)}." inert>
<div class="tb-scr__top"><span class="ui-num">${A(S.time)}</span>${ctx.ui.statusChip(rs[0] ? rs[0].status : ctx.status[0].id)}</div>
<p class="ui-display tb-scr__eta">${A(S.eta)}</p><p class="tb-scr__note">${A(S.pickup)}</p>
<ul class="ui-list">${rs.map((d) => ctx.ui.row({ title: d.to, sub: d.when, end: d.price, chip: ctx.ui.statusChip(d.status) })).join('')}</ul>
</div></div>`;
  return page(ctx, R, 'digital', `<div class="ht-dig">${screen}<p class="tb-big disp ht-dig__l">${fitTwo(ctx, B.ui.screen.title || B.name, { wide: { w: 248, max: 72, min: 28, maxLines: 2 }, narrow: { w: BODY.n, max: 40, min: 24, maxLines: 4 } })}</p></div>`,
    main(`<p class="tb-lead">The product follows the UI kit: the same colours, type and components as every page of it.</p>`) + side(rows([['Site', `<span class="m">${A(B.applications.site.url)}</span>`]])));
}

// ---- 9 Close ----
function summary(ctx, R) {
  const B = ctx.brand, F = B.fonts;
  const body = `<div class="tb-cover__logo">${logoOn(ctx, R, 'colour', R.field, 240, 64)}</div><p class="tb-big disp">${big(ctx, B.lines.primary, { max: 104, min: 44 })}</p>`;
  return page(ctx, R, 'summary', body,
    full(stripOf(ctx, R, ctx.colours, 'The palette'), 'ht-mini')
    + main(`${h2('The brand on one page')}${rows([['Is', A(listAnd(B.personality.map((p) => p.trait)))], ['Sounds', A(listAnd(B.voice.principles.map((p) => p.title.toLowerCase())))], ['Type', `${A(F.display.family)}, ${A(F.body.family)}`]])}`)
    + main(`<ol class="tb-order">${(B.guideB.rules || []).map((r) => `<li><p class="ht-k">${A(r.title)}</p><p class="tb-p">${A(r.text)}</p></li>`).join('')}</ol>`));
}
function contactScope(ctx, R) {
  const B = ctx.brand, P = paperOf(R);
  const body = `<p class="tb-b">Questions about the brand</p><p class="tb-big disp">${big(ctx, B.contact.email, { max: 88, min: 28, maxLines: 1, nMax: 34, nMin: 18, nLines: 2 })}</p>${foot(A(B.contact.owner))}`;
  return page(ctx, R, 'contact-scope', body,
    main(`${h2('What these guidelines cover')}<ol class="ht-scope">${ctx.sections.map((s) => `<li><span class="num">${s.n}</span><span>${A(s.title)}</span></li>`).join('')}</ol>`)
    + side(rows([['Owner', A(B.contact.owner)], ['Version', A(B.version.number)], ['Issued', A(ctx.date)]])), P);
}

const PAGES = {
  intro, personality, voice, 'write-this': writeThis, messaging, logo, 'logo-versions': logoVersions, 'clear-space': clearSpace, 'min-size': minSize,
  'logo-grounds': logoGrounds, 'logo-misuse': logoMisuse, palette, proportion, contrast, 'colour-values': colourValues, typefaces, hierarchy,
  'type-in-use': typeInUse, 'type-rules': typeRules, 'photo-direction': photoDirection, 'shot-list': shotList, 'imagery-rules': imageryRules, grid, layouts,
  'business-card': businessCard, social, signage, 'email-signature': emailSignature, digital, summary, 'contact-scope': contactScope,
};

// ---- the front page: the cover ticket, then the running order in full ----
function front(ctx, S) {
  const B = ctx.brand, R = roles(ctx), first = S.units.find((u) => !u.front);
  const body = `<div class="tb-cover__logo">${logoOn(ctx, R, 'colour', R.field, 280, 80)}</div><p class="tb-big disp">${big(ctx, B.lines.primary, { max: 128, min: 56, nMax: 64, nMin: 36 })}</p><p class="tb-cover__foot">${A(B.description)}</p>`;
  const stub = pageStub(ctx, { part: PART, section: '', title: `${B.name} brand guidelines`, no: B.version.number, code: codeOf(ctx, 'g', 0), next: first ? { href: first.file, ref: first.ref, title: first.title } : null });
  const set = S.sections.map((s) => `<li class="ht-run"><h2 class="ht-run__h"><span class="num disp">${s.n}</span><span>${A(s.title)}</span></h2><ol>${s.units.map((u) => `<li><a href="${u.file}"><span class="num">${A(u.ref)}</span><span>${A(u.title)}</span></a></li>`).join('')}</ol></li>`).join('');
  return `${ticket(ctx, R, { body, stub, cls: 'tb-tk--open tb-tk--hero ht-tk' })}
${zone(main(`<p class="tb-lead">${A(B.product)}</p>`) + side(rows([['Version', A(B.version.number)], ['Issued', A(ctx.date)], ['From', A(B.city || '')]]))
    + full(`${h2('Running order')}<ol class="ht-runs">${set}</ol>`))}`;
}

function shell(ctx, S) {
  const R = roles(ctx), u = S.unit;
  const sections = S.sections.map((s) => ({ n: s.n, title: s.title, items: s.units.map((x) => ({ href: x.file, ref: x.ref, title: x.title, current: x.id === u.id })) }));
  const first = { href: 'index.html', ref: '', title: 'Cover and contents', current: u.front };
  const pv = S.prev && { href: S.prev.file, ref: S.prev.ref, title: S.prev.title }, nx = S.next && { href: S.next.file, ref: S.next.ref, title: S.next.title };
  return `<a class="bk-skip" href="#ht-main">Skip to the page</a>
<div class="bk ht" data-gs-root data-page="${u.id}">
${bar(ctx, R, { part: 'guidelines', home: 'index.html' })}
<div class="ht-body">
${order(ctx, { first, sections, current: u.front ? null : { ref: u.ref, title: u.title }, toggle: 'data-gs-toggle' })}
<main class="ht-main" id="ht-main" tabindex="-1">${S.body}${pager(pv, nx)}
<footer class="bk-foot"><span>${A(ctx.brand.name)} brand guidelines</span><span>${A(ctx.versionLine)}</span></footer></main>
</div>
</div>`;
}

export const guideSite = {
  css: null, shell, front,
  page: (ctx, id) => { const f = PAGES[id]; if (!f) throw new Error(`guide site: no page ${id}`); return f(ctx, roles(ctx)); },
  adapt: { strip: [], minStack: 3, noLink: '.m,.num,.tb-serial,.tb-rows,.tb-s,.logo-slot,.photo-slot' },
  darkSample: ['index', 'logo-versions', 'palette', 'contrast', 'typefaces', 'shot-list', 'business-card', 'digital'],
};
