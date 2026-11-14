// Theme 29 (Blueprint), lane bk: the HTML brand book (brandBook and bookCss). The book is the drawing set on the web: nine sheets, one per section,
// each on the cool film in its own frame, with zone numbers in its margin and a title strip down its right edge (a ruled title block at the head on a
// phone). Every sheet does a drafter's job: a general arrangement, a details sheet and a revision schedule, a finishes schedule, a lettering sheet,
// a photo schedule, the page grid at scale, the applications on site and a transmittal. Redlines print only true sizes, in px as set on the page.
import { BOOK_SECTIONS } from '../../engine/book.js';
import { A, NO, TITLE, pad2, listAnd, WEIGHT, capOf, stemOf, sheet, dimH, dimV, detail, tag, notes, label, fitDisp, cq, wordCap, copyBtn, valBtn, dlLink, logoFilm, shot, surfAspect } from './lane-bk-parts.js';
import { displayStem, specimen } from './measure.js';
import { cardArts, cardFront, cardBack, phoneArt, laptopArt, hoardingArt, letterArts, mmOf, isCourier, clipLetter, courierSign } from './lane-bk-arts.js';
import { bookCss } from './lane-bk-css.js';

export { bookCss };

// the scenes this book photographs, from the library map for theme 29 (04_mockups/10_library_map.md)
const SCENES = { stationery: 'bench-letterhead-reno', card: 'bench-cards-offcuts', social: 'room-kitchen-phone', email: 'bench-laptop-shoulder', signage: 'kerb-hoarding-footpath' };
const PX_MM = 3.7795;
const geoH = (ctx, id, w) => Math.round((w * ctx.logo.geos[id].h) / ctx.logo.geos[id].w);
const W3 = { s: 280, m: 400, l: 640 };

// ---- 1 Overview: the general arrangement. The logo dimensioned at its set size, the primary line, then the traits called out as details ----
function overview(ctx) {
  const B = ctx.brand, line = B.lines.primary;
  const hs = { l: fitDisp(ctx, line, 900, 2, [104, 96, 88, 80, 72, 64, 56]), s: fitDisp(ctx, line, 320, 4, [44, 40, 36, 32, 28]) };
  const vals = (f) => ({ s: f(W3.s), m: f(W3.m), l: f(W3.l) });
  const ga = `<figure class="bp-ga" aria-label="The logo, ${W3.l} px wide on a wide screen">
<div class="bp-ga__lg">${dimH(vals(String))}${logoFilm(ctx, 'colour', W3.l)}${dimV(vals((w) => String(geoH(ctx, 'colour', w))))}</div></figure>`;
  const hero = `<h1 class="bp-hero bp-disp" id="h-overview" style="--fl:${cq(hs.l, 900)};--fs:${cq(hs.s, 320)}">${A(line)}</h1>
<p class="bp-place">${A([B.place || B.city, ctx.versionLine].filter(Boolean).join(', '))}</p>`;
  const traits = `<ol class="bp-traits">${B.personality.map((p, i) => `<li><p class="bp-trait bp-disp">${A(p.trait)}</p><span class="bp-lead" aria-hidden="true"></span>${tag(i + 1)}<p class="bp-note">${A(p.means)}</p></li>`).join('')}</ol>`;
  const inner = `${ga}<div class="bp-ov">${hero}</div>
<div class="bp-split"><div>${label('The brand')}<p class="bp-big">${A(B.description)}</p></div>
<div>${label('General notes')}${notes([[1, `<p class="bp-note"><span class="bp-note__h">What it does.</span> ${A(B.product)}</p>`], [2, `<p class="bp-note"><span class="bp-note__h">Who it serves.</span> ${A(B.audience)}</p>`]])}</div></div>
<div class="bp-block">${label('How it behaves')}${traits}</div>`;
  return sheet(ctx, 'overview', { drawing: 'General arrangement', scale: '<span class="bp-m">1:1</span>, sizes in px' }, inner, { first: true });
}

// ---- 2 Voice: a details sheet (each principle's example is the detail), then the revision schedule (write this, not that) ----
function voice(ctx) {
  const B = ctx.brand, V = B.voice;
  const det = `<ol class="bp-details">${V.principles.map((p, i) => `<li><p class="bp-ex">${A(p.example)}</p>${detail(i + 1, A(p.title))}</li>`).join('')}</ol>`;
  const rev = `<div class="bp-rev" role="list">
<div class="bp-rev__h" aria-hidden="true"><span>Rev</span><span>Was</span><span>Now</span><span>Because</span></div>
${V.writeThis.map((r, i) => `<div class="bp-rev__r" role="listitem"><span class="bp-delta" aria-hidden="true"><svg viewBox="0 0 28 26" width="28" height="26" focusable="false"><path d="M14 1.5L26.5 24.5H1.5Z"/></svg><span class="bp-m">${i + 1}</span></span>
<p class="bp-was"><s>${A(r.not)}</s></p><p class="bp-now"><span class="bp-cloud"><span class="bp-cloud__e bp-cloud__e--t" aria-hidden="true"></span><span class="bp-cloud__e bp-cloud__e--b" aria-hidden="true"></span><span class="bp-cloud__e bp-cloud__e--l" aria-hidden="true"></span><span class="bp-cloud__e bp-cloud__e--r" aria-hidden="true"></span><span class="bp-cloud__t">${A(r.write)}</span></span></p><p class="bp-note">${A(r.because)}</p></div>`).join('')}</div>`;
  const take = (title, text, what) => `<div class="bp-take">${detail(title === 'Short boilerplate' ? 'A' : 'B', title)}<div class="bp-measure">${dimH({ s: 'Screen width', m: '520', l: '520' })}<p class="bp-body">${A(text)}</p></div>${copyBtn('Copy text', text, what)}</div>`;
  const inner = `${det}
<div class="bp-block">${label('Revision schedule')}<h3 class="bp-h3">Write this, not that</h3>${rev}</div>
<div class="bp-block">${label('Typesetting')}<h3 class="bp-h3">The brand in 25 and 50 words</h3><div class="bp-takes">${take('Short boilerplate', V.boilerplate25, '25-word boilerplate')}${take('Long boilerplate', V.boilerplate50, '50-word boilerplate')}</div></div>
<div class="bp-split"><div>${label('Lines in use')}<ul class="bp-lines">${[B.lines.primary, ...B.lines.others].map((l) => `<li class="bp-disp">${A(l)}</li>`).join('')}</ul></div>
<div>${label('General notes')}${notes([[1, `<p class="bp-note"><span class="bp-note__h">Writing the name.</span> ${A(V.nameRules)}</p>`]])}</div></div>`;
  return sheet(ctx, 'voice', { drawing: 'Details and revisions', scale: 'Not to scale' }, inner);
}

// ---- 3 Logo: the mark in its clear zone, dimensioned; the versions as a schedule on their own grounds; the smallest size drawn at size ----
function logo(ctx) {
  const B = ctx.brand, L = ctx.logo, cw = B.logo.colourways, slot = ctx.edition === 'slot';
  const W = { s: 180, m: 320, l: 480 }, cs = L.clearShare / 100;
  const clr = (w) => String(Math.round(geoH(ctx, 'colour', w) * cs));
  const ga = `<figure class="bp-clear" style="--cs:${cs};--ar:${(L.geos.colour.w / L.geos.colour.h).toFixed(4)}" aria-label="The logo in its clear zone: ${L.clearShare}% of its height on every side">
<div class="bp-clear__z"><span class="bp-clear__box" aria-hidden="true"></span>
<div class="bp-clear__pad">${dimV({ s: clr(W.s), m: clr(W.m), l: clr(W.l) })}</div>
<div class="bp-clear__lg">${dimH({ s: String(W.s), m: String(W.m), l: String(W.l) })}${logoFilm(ctx, 'colour', W.l)}${dimV({ s: String(geoH(ctx, 'colour', W.s)), m: String(geoH(ctx, 'colour', W.m)), l: String(geoH(ctx, 'colour', W.l)) })}</div></div>
<figcaption>${detail(1, 'Clear zone', { note: `Keep ${L.clearShare}% of the logo&rsquo;s height clear on every side. The redline at the left prints that clearance.` })}</figcaption></figure>`;
  const order = ['colour', 'reversed', 'mono-dark', 'mono-light', 'horizontal', 'stacked', 'symbol'].filter((id) => L.versions.includes(id));
  const row = (id, i) => {
    const w = cw[L.colourwayOf(id)], g = L.geos[id], maxW = id === 'symbol' ? 64 : id === 'stacked' ? 120 : 180, lw = Math.floor(Math.min(maxW, (56 * g.w) / g.h));
    const files = ctx.book.logo(id), name = `${L.labels[id]} logo`;
    const links = slot || !files ? '' : `<span class="bp-dls">${dlLink(files.svg, name)}${dlLink(files.png.find((p) => p.w === 1024), name + ', PNG, 1024 px wide', 'PNG')}${dlLink(files.pdf, name)}</span>`;
    const ground = B.colours.find((c) => c.hex.toUpperCase() === String(w.ground).toUpperCase());
    return `<li class="bp-ver"><span class="bp-ver__n bp-m" aria-hidden="true">${pad2(i + 1)}</span><span class="bp-ver__f" style="background:${w.ground}"><span class="bp-logo" style="width:${lw}px;--ar:${g.w.toFixed(2)}/${g.h.toFixed(2)}">${L.html(id, { width: lw, color: w.name, label: 'Logo' })}</span></span>
<span class="bp-ver__t"><span class="bp-ver__k">${A(L.labels[id])}</span><span class="bp-note">${A(B.logo.when[id] || '')}${ground ? ` On ${A(ground.name)}.` : ''}</span></span>${links}</li>`;
  };
  const ms = L.minSize;
  const min = slot
    ? `<p class="bp-note">Set the smallest size once the logo is in place: the width at which every part of it still reads as one mark.</p>`
    : `<div class="bp-min"><div class="bp-min__lg">${dimH(String(ms.screenPx), { gap: 6 })}${logoFilm(ctx, 'colour', ms.screenPx)}</div></div><p class="bp-note"><span class="bp-m">${ms.screenPx} px</span> wide on screen, <span class="bp-m">${ms.printMm} mm</span> in print. Never smaller.</p>`;
  const misuse = ['Do not stretch, squash or skew it.', 'Do not recolour it outside the versions above.', 'Do not rotate it.', 'Do not add shadows, glows or other effects.', 'Do not set it on a busy part of a photo.', 'Do not outline it or put it in a box.'];
  const inner = `${ga}<p class="bp-big bp-measure-t">${A(B.logo.idea)}</p>
<div class="bp-block">${label('Schedule of versions')}<p class="bp-note">Each version on the ground it is made for. ${slot ? 'The frames hold the place and the proportion until the approved files go in the kit&rsquo;s logo folder.' : 'Download any one as SVG, PNG or PDF.'}</p><ol class="bp-vers">${order.map(row).join('')}</ol></div>
<div class="bp-split"><div>${detail(2, 'Smallest size')}${min}</div><div>${label('Never')}${notes(misuse.map((m, i) => [i + 1, `<p class="bp-note">${A(m)}</p>`]))}</div></div>`;
  return sheet(ctx, 'logo', { drawing: 'The mark', scale: '<span class="bp-m">1:1</span>, sizes in px' }, inner);
}

// ---- 4 Colour: the finishes schedule. Fields edge to edge by share, each share dimensioned; then every value, the pairs and the roles ----
function colour(ctx) {
  const B = ctx.brand, cols = ctx.colours, rgb = (hex) => { const [r, g, b] = ctx.C.hexToRgb(hex); return `rgb(${r}, ${g}, ${b})`; };
  const fg = (hex) => {
    const own = ctx.pairs.filter((p) => p.bgHex.toUpperCase() === hex.toUpperCase()).sort((a, b) => b.ratio - a.ratio)[0];
    if (own && own.ratio >= 4.5) return own.fgHex;
    return ctx.ratio(ctx.roles.light.text, hex) >= ctx.ratio(ctx.roles.dark.text, hex) ? ctx.roles.light.text : ctx.roles.dark.text;
  };
  // the field widths are the shares exactly; a field under a tenth of the page sets its name on its side
  const sum = cols.reduce((a, c) => a + c.share, 0), wd = cols.map((c) => (c.share / sum) * 100);
  const fields = `<div class="bp-fields" role="list">${cols.map((c, i) => {
    const t = fg(c.hex), pct = Math.round(c.share * 100);
    ctx.pair(t, c.hex, { size: 13, what: 'book finishes field' });
    return `<div class="bp-field" role="listitem" style="--w:${wd[i].toFixed(3)}%;--h:${Math.max(64, Math.round(c.share * 640))}px"><div class="bp-field__f${c.share < 0.1 ? ' is-thin' : ''}" style="background:${c.hex};color:${t}"><span class="bp-field__n bp-m">${pad2(i + 1)}</span><span class="bp-field__k">${A(c.name)}</span><span class="bp-field__s bp-m bp-at-s">${pct}%</span></div>${dimH(`${pct}%`, { side: 'bottom' })}</div>`;
  }).join('')}</div>`;
  const ramp = (c) => (c.ramp && c.rampBase !== 50 ? `<ol class="bp-ramp" aria-label="${A(c.name)} ramp, lightest to darkest">${Object.entries(c.ramp).map(([k, hx]) => `<li${+k === c.rampBase ? ' class="is-base"' : ''}><button type="button" class="bp-ramp__b" style="background:${hx}" data-copy="${hx}" data-copy-label="${A(c.name)} ${k} HEX ${hx}" aria-label="Copy HEX ${hx}, ${A(c.name)} ${k}"></button></li>`).join('')}</ol>` : '');
  const entry = (c, i, pre = '') => `<li class="bp-fin"><span class="bp-fin__n bp-m" aria-hidden="true">${pre}${pad2(i + 1)}</span><span class="bp-fin__sw" style="background:${c.hex}" aria-hidden="true"></span>
<div class="bp-fin__t"><h4 class="bp-fin__k">${A(c.name)}</h4><p class="bp-note">${A(c.lands)}</p>${ramp(c)}</div>
<dl class="bp-fin__v"><div><dt>HEX</dt><dd>${valBtn('HEX', c.hex, c.name)}</dd></div><div><dt>RGB</dt><dd>${valBtn('RGB', rgb(c.hex), c.name)}</dd></div><div><dt>OKLCH</dt><dd>${valBtn('OKLCH', c.oklch || ctx.C.oklchString(c.hex), c.name)}</dd></div>${ctx.C.cmykOf(c) ? `<div><dt>CMYK</dt><dd>${valBtn('CMYK', ctx.C.cmykOf(c), c.name)}</dd></div>` : ''}</dl></li>`;
  const pair = (p) => `<li class="bp-pr"><span class="bp-pr__s" style="background:${p.bgHex};color:${p.fgHex}"><span class="bp-pr__a">Aa</span></span><span class="bp-note">${A(p.use)}</span><span class="bp-pr__r bp-m">${A(p.ratioText)}&thinsp;:&thinsp;1</span></li>`;
  const roleKeys = [['surface', 'Surface'], ['raised', 'Raised'], ['text', 'Text'], ['quiet', 'Quiet text'], ['border', 'Border'], ['action', 'Action'], ['actionLabel', 'Action label'], ['focus', 'Focus']];
  const toneKeys = [['success', 'Success'], ['warning', 'Warning'], ['danger', 'Danger'], ['info', 'Info']];
  const roleList = (mode, title) => {
    const r = ctx.roles[mode], items = [...roleKeys.map(([k, n]) => [n, r[k]]), ...toneKeys.map(([k, n]) => [n, r[k].fg])];
    return `<div><h3 class="bp-h3">${title}</h3><ul class="bp-roles">${items.map(([n, hx]) => `<li><span class="bp-roles__sw" style="background:${hx}" aria-hidden="true"></span><span class="bp-roles__n">${A(n)}</span>${valBtn('HEX', hx, `${mode} ${n}`)}</li>`).join('')}</ul></div>`;
  };
  const inner = `${fields}
<p class="bp-big bp-measure-t">Each field is sized to that colour&rsquo;s share of a ${A(B.name)} page. Press a value to copy it.</p>
<div class="bp-block">${label('Finishes schedule')}<ol class="bp-fins">${cols.map((c, i) => entry(c, i)).join('')}</ol></div>
${ctx.tones.length ? `<div class="bp-block">${label('Tones')}<ol class="bp-fins">${ctx.tones.map((c, i) => entry(c, i, 'T')).join('')}</ol></div>` : ''}
<div class="bp-block">${label('Contrast, pair by pair')}<p class="bp-note bp-measure-t">Every text pair ${A(B.name)} uses, in its own colours, with its WCAG ratio. Text needs 4.5&#8239;:&#8239;1; type at 24&nbsp;px and over needs 3&#8239;:&#8239;1.</p><ul class="bp-prs">${ctx.pairs.map(pair).join('')}</ul></div>
<div class="bp-split">${roleList('light', 'Interface roles, light')}${roleList('dark', 'Interface roles, dark')}</div>`;
  return sheet(ctx, 'colour', { drawing: 'Finishes schedule', scale: 'Share of a page' }, inner);
}

// ---- 5 Typography: the lettering sheet. The headline at a set size with its cap height dimensioned, the faces, the tester, the scale ----
function typography(ctx) {
  const B = ctx.brand, F = B.fonts, T = B.type, W = ctx.weights, stem = displayStem(ctx);
  const S = { s: 44, m: 72, l: 112 }, cap = (s) => String(Math.round(capOf(stem, s)));
  // each display line in this section is a different line: the head, the tester's start and one per display row in the scale
  const pool = [...new Set([0, 1, 2, 3, 4, 5].map((i) => specimen(ctx, i)).filter((t) => t !== T.sample.caption))], pick = (i) => pool[i % pool.length];
  let dk = 0;
  const head = `<figure class="bp-letter${ctx.placeholders ? " ph-tight" : ""}" aria-label="${A(F.display.family)} at ${S.l} px, cap height ${cap(S.l)} px">
<p class="bp-letter__t bp-disp"><span class="bp-letter__cap">${dimV({ s: cap(S.s), m: cap(S.m), l: cap(S.l) })}</span>${A(pick(0))}</p>
<figcaption class="bp-note">${A(F.display.family)} at <span class="bp-m">${S.l} px</span> on a wide screen, <span class="bp-m">${S.s} px</span> on a phone. The redline is the cap height.</figcaption></figure>`;
  const bodyW = F.body.weights;
  const weights = `<ul class="bp-wts">${bodyW.map((w) => `<li style="font-weight:${w}">${WEIGHT[w] || w} <span class="bp-m">${w}</span></li>`).join('')}</ul>`;
  const face = (n, role, f, cls, style, what) => `<li class="bp-face">${tag(n)}<div><p class="${cls}" style="${style}">${A(f.family)}</p><p class="bp-note"><span class="bp-note__h">${role}, ${A(f.weights.map((w) => `${WEIGHT[w] || w} ${w}`).join(', '))}.</span> ${what}</p></div></li>`;
  const faces = `<ol class="bp-faces">
${face(1, 'Display', F.display, 'bp-face__d bp-disp', '', 'Headlines and the lines.')}
${face(2, 'Text', F.body, 'bp-face__b', `font-weight:${W.regular}`, 'Everything else: paragraphs, labels, captions.')}
${F.mono ? face(3, 'Values', F.mono, 'bp-face__m', `font-weight:${F.mono.weights[0]}`, 'Prices, times and figures that line up.') : ''}</ol>`;
  const fams = [F.display.family, F.body.family, F.mono && F.mono.family].filter((f, i, a) => f && a.indexOf(f) === i);
  const tester = `<div class="bp-tester" data-tester>
<div class="bp-tester__c"><div class="bp-field-in"><label for="tester-text">Your line</label><input id="tester-text" type="text" value="${A(pick(1))}" data-tester-text data-default="${A(pick(1))}" autocomplete="off" spellcheck="false"></div>
<div class="bp-field-in"><label for="tester-size">Size <output for="tester-size" data-tester-value class="bp-m">56 px</output></label><input id="tester-size" type="range" min="16" max="144" step="1" value="56" data-tester-size></div></div>
<p class="bp-tester__out bp-disp${ctx.placeholders ? " ph-tight" : ""}" data-tester-out aria-hidden="true">${A(pick(1))}</p></div>`;
  const scale = `<ol class="bp-scale${ctx.placeholders ? " ph-tight" : ""}">${T.scale.map((s) => {
    const disp = s.face === 'display', text = disp ? pick(2 + dk++) : T.sample.paragraph;
    const fs = wordCap(disp ? stem : stemOf(ctx, 'body', s.weight), text, s.size, 300);
    return `<li><div class="bp-scale__k"><p class="bp-scale__t">${A(ctx.cap(s.token))}</p><p class="bp-q"><span class="bp-m">${s.size} / ${s.line}</span>, ${A(WEIGHT[s.weight] || s.weight)}. ${A(s.use)}</p></div><p class="bp-scale__s${disp ? ' bp-disp' : ''}" style="font-weight:${s.weight};line-height:${s.line};font-size:${fs}">${A(text)}</p></li>`;
  }).join('')}</ol>`;
  const inner = `${head}${weights}
<div class="bp-block">${label('The faces')}${faces}<p class="bp-note bp-measure-t bp-faces__l">${A(listAnd(fams))} ${fams.length > 1 ? 'are' : 'is'} open source under the SIL Open Font Licence: free in print and on screen.</p></div>
<div class="bp-block">${label('Try a line')}${tester}</div>
<div class="bp-block">${label('The scale')}${scale}</div>
<div class="bp-block">${label('Rules')}${rules(T.rules)}</div>`;
  return sheet(ctx, 'typography', { drawing: 'Lettering', scale: '<span class="bp-m">1:1</span>, sizes in px' }, inner);
}
const rules = (list) => notes(list.map((r, i) => [i + 1, `<p class="bp-note"><span class="bp-note__h">Do.</span> ${A(r.do)}</p><p class="bp-note bp-q"><span class="bp-note__h">Don&rsquo;t.</span> ${A(r.dont)}</p>`]), 'bp-notes--rules');

// ---- 6 Imagery: the photo schedule. The first photograph large in a framed view, the direction as notes, every shot as a numbered frame ----
function imagery(ctx) {
  const B = ctx.brand, D = B.imagery.direction, shots = B.imagery.shots, first = shots.find((s) => s.photo) || shots[0];
  const hero = `<figure class="bp-ph">${ctx.photo(first.id, { cls: 'bp-photo', pos: '50% 45%', slotNote: false })}<figcaption>${detail(1, A(first.caption || first.alt || first.slot || ''))}</figcaption></figure>`;
  const rows = [['Light', D.light], ['Crop', D.crop], ['Colour', D.colour], ['People', D.people]].filter(([, v]) => v);
  const seenCr = new Set();   // a generated photograph carries no credit; a real photographer's prints once
  const fig = (s, i) => {
    const f = s.photo ? ctx.book.find(`05 Imagery/photos/${s.photo.split('/').pop()}`) : null;
    const cap = s.photo ? A(s.caption || s.alt || '') : A(s.slot);
    const cr = s.photo && s.credit && !s.generated && !seenCr.has(s.credit) ? (seenCr.add(s.credit), `<p class="bp-note bp-q">Photo: ${A(s.credit)}</p>`) : '';
    return `<li class="bp-shotl"><figure>${ctx.photo(s.id, { cls: 'bp-photo', slotNote: false })}<figcaption>${tag(i + 1)}<div class="bp-shotl__t"><p class="bp-note">${cap}</p>${cr}${f ? `<p class="bp-note">${dlLink(f, 'photo ' + (s.caption || s.id), 'Download JPG')}</p>` : ''}</div></figcaption></figure></li>`;
  };
  const inner = `${hero}
<div class="bp-split"><div>${label('Subject')}<p class="bp-big">${A(D.subject)}</p></div><div>${label('General notes')}${notes(rows.map(([k, v], i) => [i + 1, `<p class="bp-note"><span class="bp-note__h">${k}.</span> ${A(v)}</p>`]))}</div></div>
<div class="bp-block">${label('Photo schedule')}<p class="bp-note bp-measure-t">${shots.some((s) => s.photo) ? 'The photographs in the kit, each with its caption.' : 'No photographs yet. Each frame is the brief for one shot: who, where, the crop and the light.'}</p><ol class="bp-shots">${shots.map(fig).join('')}</ol></div>
<div class="bp-block">${label('Rules')}${rules(B.imagery.rules)}</div>`;
  return sheet(ctx, 'imagery', { drawing: 'Photo schedule', scale: 'Not to scale' }, inner);
}

// ---- 7 Layout: the page grid drawn at scale and dimensioned in its true px; the spacing steps and the corners drawn at size ----
function gridDrawing(ctx, G, maxW, cls) {
  const k = Math.max(1, Math.ceil(G.page.w / maxW)), w = G.page.w / k, h = G.page.h / k, m = G.margin / k, g = G.gutter / k, c = G.col / k;
  let cols = '';
  for (let i = 0; i < G.columns; i++) cols += `<rect x="${(m + i * (c + g)).toFixed(2)}" y="${m.toFixed(2)}" width="${c.toFixed(2)}" height="${(h - 2 * m).toFixed(2)}"/>`;
  const box = (x, wd, value, gap) => `<span class="bp-gd__d" style="left:${(x / w * 100).toFixed(3)}%;width:${(wd / w * 100).toFixed(3)}%">${dimH(value, { gap })}</span>`;
  const col = String(Math.round(G.col * 10) / 10);
  return `<figure class="bp-gd ${cls}" style="--w:${w.toFixed(1)}px;--ar:${G.page.w}/${G.page.h}" aria-label="The page grid at 1 to ${k}: ${G.columns} columns, ${G.margin} px margins and ${G.gutter} px gutters on a ${G.page.w} by ${G.page.h} px page">
<div class="bp-gd__dims">${box(0, m, String(G.margin), 6)}${box(m, c, col, 30)}${box(m + c, g, String(G.gutter), 54)}</div>
<div class="bp-gd__p"><svg viewBox="0 0 ${w.toFixed(2)} ${h.toFixed(2)}" width="100%" aria-hidden="true" focusable="false"><rect class="bp-gd__pg" x="0.75" y="0.75" width="${(w - 1.5).toFixed(2)}" height="${(h - 1.5).toFixed(2)}"/><g class="bp-gd__c">${cols}</g></svg>${dimV(String(G.page.h))}</div>
<figcaption class="bp-note">Drawn at <span class="bp-m">1:${k}</span>. A <span class="bp-m">${G.page.w} × ${G.page.h}</span> page in ${G.columns} columns; the redlines print its true sizes.</figcaption></figure>`;
}
function layout(ctx) {
  const G = ctx.gridMeasures, B = ctx.brand;
  const space = `<ol class="bp-space">${ctx.space.map((s) => `<li><span class="bp-space__b" style="width:${s.px}px;height:${s.px}px" aria-hidden="true"></span><span class="bp-m">${s.px}</span></li>`).join('')}</ol>`;
  const radii = ctx.radii.filter((r) => r.px < 9999);
  const meas = [['Margin', G.margin], ['Gutter', G.gutter], ['Column', String(Math.round(G.col * 10) / 10)], ['Base step', G.base]];
  const inner = `<div class="bp-lay">${gridDrawing(ctx, G, 760, 'bp-gd--w')}${gridDrawing(ctx, G, 240, 'bp-gd--n')}
<dl class="bp-meas">${meas.map(([k, v]) => `<div><dt>${k}</dt><dd><span class="bp-meas__v">${v}</span> <span class="bp-m">px</span></dd></div>`).join('')}</dl></div>
<div class="bp-split"><div>${detail(1, 'Spacing', { note: `Every gap is a step of ${G.base} px. Space inside a group is smaller than the space between groups. Each square is drawn at its size.` })}${space}</div>
<div>${detail(2, 'Corners and edges', { note: `Edges are <span class="bp-m">${B.ui.border} px</span>. ${A(B.ui.elevationNote || '')}` })}<ul class="bp-radii">${radii.map((r) => `<li><span class="bp-radii__b" style="border-radius:${r.px}px" aria-hidden="true"></span><span class="bp-note">${A(r.use)}, <span class="bp-m">${r.px} px</span></span></li>`).join('')}</ul></div></div>`;
  return sheet(ctx, 'layout', { drawing: 'Page grid', scale: 'As noted, sizes in px' }, inner);
}

// ---- 8 Applications: the pieces on site. The letterhead photographed, then the card (photographed, and flat at true size), the post,
// the email and, where the brand's hoarding has the hoarding's shape, the site hoarding ----
function applications(ctx) {
  const B = ctx.brand, ap = B.applications, n = B.name;
  // a courier's pieces stand on its own streets: the letter on the clipboard, the card flat at true size, the post at the crossing, the hoarding on the underpass
  const cr = isCourier(ctx), cs = cr ? courierSign(ctx) : null, S = { ...SCENES, ...(cr ? { social: 'kerb-crossing-phone', signage: cs.id } : {}) };
  const la = cr ? null : letterArts(ctx, surfAspect(ctx, S.stationery, 'envelope'));
  const letter = `<figure class="bp-app bp-app--hero">${cr ? shot(ctx, 'clipboard', [clipLetter(ctx)], { ar: '3/2', alt: `${n}'s letter on a clipboard` }) : shot(ctx, S.stationery, [la.letterhead, la.envelope], { ar: '3/2', alt: `${n}'s letterhead and envelope on a stone bench` })}
<figcaption>${detail(1, cr ? 'Letter' : 'Letterhead and envelope', { note: `A4, <span class="bp-m">210 × 297 mm</span>, with the horizontal logo at the head and the details set in ${A(B.fonts.body.family)}.` })}</figcaption></figure>`;
  const ca = cr ? null : cardArts(ctx, surfAspect(ctx, S.card, 'card-front'));
  // the flat card at true size: 90 x 55 mm is 340 x 208 px at 96 dpi
  const cw = Math.round(90 * PX_MM), ch = Math.round(55 * PX_MM);
  const flat = (art, side) => `<div class="bp-card" style="width:${cw}px;height:${ch}px;background:${art.ground};color:${art.ink}" role="img" aria-label="Business card, ${side}, at true size">${art.inner}</div>`;
  ctx.pair(ctx.brand.logo.colourways.reversed.name, ctx.brand.logo.colourways.reversed.ground, { size: 13, what: 'book card front' });
  const card = `<div class="bp-app bp-app--card${cr ? ' bp-app--flat' : ''}">${cr ? '' : `<figure>${shot(ctx, S.card, [ca['card-front'], ca['card-back']], { ar: '4/3', alt: `${n}'s business cards on a workbench among offcuts` })}</figure>`}
<div class="bp-app__flat">${detail(2, 'Business card', { note: 'Front and back at true size, <span class="bp-m">90 × 55 mm</span>.' })}
<div class="bp-cards"><div class="bp-card__w">${dimH('90 mm')}${flat(cardFront(ctx, cw, ch), 'front')}${dimV('55 mm')}</div><div class="bp-card__w">${flat(cardBack(ctx, cw, ch), 'back')}</div></div></div></div>`;
  const social = `<figure class="bp-app">${shot(ctx, S.social, [phoneArt(ctx, surfAspect(ctx, S.social, 'screen-phone'))], { ar: '4/5', alt: cr ? `${n}'s post on a phone held at a city crossing` : `${n}'s post on a phone on a kitchen bench` })}
<figcaption>${detail(3, 'Social post', { note: 'One line to a post, in the display face on the reversed ground.' })}<ul class="bp-lines bp-lines--s">${ap.social.map((t) => `<li class="bp-disp">${A(t)}</li>`).join('')}</ul></figcaption></figure>`;
  const email = `<figure class="bp-app">${shot(ctx, S.email, [laptopArt(ctx, surfAspect(ctx, S.email, 'screen-laptop'))], { ar: '4/5', alt: `${n}'s email open on a laptop on a workbench` })}
<figcaption>${detail(4, 'Email signature', { note: 'Name, role, contact and the horizontal logo.' })}
<div class="bp-sig"><p class="bp-sig__n">${A(ap.email.person)}</p><p class="bp-note">${A(ap.email.role)}, ${A(n)}</p><p class="bp-note bp-q">${A(ap.card.contact)}<br>${A(ap.site.url)}</p><div class="bp-sig__l">${logoFilm(ctx, 'horizontal', 168)}</div></div></figcaption></figure>`;
  const mm = mmOf((ctx.real || String)(ap.signage)), ha = surfAspect(ctx, S.signage, cr ? cs.surface : 'hoarding');
  const hoard = mm && Math.abs(mm[0] / mm[1] / ha - 1) <= 0.05
    ? `<figure class="bp-app bp-app--hero">${shot(ctx, S.signage, [hoardingArt(ctx, ha)], { ar: '3/2', alt: cr ? cs.alt : `${n}'s hoarding on a plywood site fence` })}
<figcaption>${detail(5, 'Site hoarding', { note: A(ap.signage) })}</figcaption></figure>` : '';
  const inner = `${letter}${card}<div class="bp-apps">${social}${email}</div>${hoard}`;
  return sheet(ctx, 'applications', { drawing: 'Applications on site', scale: 'Card <span class="bp-m">1:1</span>, others not to scale' }, inner);
}

// ---- 9 Downloads: the transmittal. The kit, then each document it holds, its format and size ----
function downloads(ctx) {
  const D = ctx.book, L = ctx.logo, slot = ctx.edition === 'slot', B = ctx.brand;
  let no = 0;
  const file = (f) => `<li class="bp-file"><span class="bp-file__no bp-m" aria-hidden="true">${pad2(++no)}</span><span class="bp-file__n">${A(f.name)}</span><span class="bp-file__f bp-m">${A(f.ext)}</span><span class="bp-file__s bp-m">${A(f.sizeText)}</span><a class="bp-dl" href="${A(f.href)}" download aria-label="Download ${A(f.name)}, ${A(f.sizeText)}">Download</a></li>`;
  const files = (list) => `<ul class="bp-files">${list.filter(Boolean).map(file).join('')}</ul>`;
  const logoRows = () => slot ? files(D.logoFiles)
    : `<ul class="bp-files">${L.versions.map((id) => { const f = D.logo(id); return `<li class="bp-file bp-file--logo"><span class="bp-file__no bp-m" aria-hidden="true">${pad2(++no)}</span><span class="bp-file__n">${A(L.labels[id])}</span><span class="bp-dls">${dlLink(f.svg, L.labels[id] + ' logo')}${dlLink(f.pdf, L.labels[id] + ' logo')}${f.png.map((p) => dlLink(p, `${L.labels[id]} logo, PNG, ${p.w} px wide`, `PNG ${p.w}`)).join('')}</span></li>`; }).join('')}</ul>`;
  const icons = () => `<ul class="bp-icons">${D.icons.map((f) => `<li><a class="bp-icon" href="${A(f.href)}" download aria-label="Download ${A(f.name)} icon, SVG">${ctx.ui.icon(f.name.replace('.svg', ''), 24)}<span>${A(f.name.replace('.svg', ''))}</span></a></li>`).join('')}</ul>${files([D.iconsLicence])}`;
  const photos = D.imagery.filter((f) => f.rel.startsWith('05 Imagery/photos/')), pdfs = D.imagery.filter((f) => f.ext === 'PDF');
  // groups are numbered and their files counted in the order they print; a group with no files is left out until the kit has some
  let gn = 0;
  const group = (title, what, make) => { const inner = make(); return inner.includes('<li') ? `<li class="bp-grp"><div class="bp-grp__k">${detail(++gn, A(title), { note: A(what) })}</div><div class="bp-grp__v">${inner}</div></li>` : ''; };
  const inner = `<div class="bp-zip"><p class="bp-zip__n bp-disp">${A(B.name)} brand kit</p>
<p class="bp-big">Logo, colour, type, icons and imagery in one zip, ready for print and screen.</p>
<p class="bp-zip__a"><a class="bk-btn bp-btn bp-btn--prime" href="${A(D.zip.href)}" download aria-label="Download ${A(D.zip.name)}, ${A(D.zip.sizeText)}"><span class="bk-btn__t">Download the kit</span></a><span class="bp-m bp-q">${A(D.zip.name)}, ${A(D.zip.sizeText)}</span></p></div>
<div class="bp-block">${label('Transmittal')}<p class="bp-note">Issued for use, ${A(ctx.versionLine)}.</p>
<ol class="bp-grps">
${group('Read me', 'Start here: what is in the kit and how to use it.', () => files([D.readmePdf, D.readme]))}
${group('Logo', slot ? 'The labelled slot frame, and where the approved files go.' : 'Each version as SVG and PDF, and as PNG at three widths, transparent.', logoRows)}
${group('Colour', 'The palette for Adobe, CSS and JSON, and a swatch sheet.', () => files(D.colour))}
${group('Type', 'The specimen sheet, and the faces with their links and licence.', () => files(D.type))}
${group('Icons', `${D.icons.length} interface icons, drawn in the brand's stroke.`, icons)}
${group('Imagery', photos.length ? 'The photography direction, and the photos.' : 'The photography direction and shot list.', () => files([...pdfs, ...photos]))}
</ol></div>`;
  return sheet(ctx, 'downloads', { drawing: 'Transmittal', scale: 'Not to scale' }, inner);
}

export function brandBook(ctx) {
  if (!ctx.book) throw new Error('brandBook needs ctx.book (set by the engine book builder)');
  void NO; void TITLE; void BOOK_SECTIONS;
  return [overview, voice, logo, colour, typography, imagery, layout, applications, downloads].map((f) => f(ctx)).join('\n');
}
