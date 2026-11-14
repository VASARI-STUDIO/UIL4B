// Theme 28 (Riso), lane hg: the guide site's pages. Each guideline id is one sheet of the run (see lane-hg-press.js): the head carries the page's
// title and its hit, a real count from ctx, and the note beside the hit says what it counts. Words are in the brand's body face, the display face
// is the brand's own, literal values (hex, rgb, oklch, px, ratios, folios) are in Sono Mono. Copy is the brand's, printed whole through esc().
import { pressOf, faceFor, inkLayers, A } from './sheet.js';
import { faceCss } from './sheet.js';
import { bookBrand } from './copy.js';
import { sheet } from './lane-hg-press.js';
import { plateImg } from '../../engine/plate.js';

const WEIGHT = { 100: 'Thin', 200: 'ExtraLight', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold', 900: 'Black' };
const listAnd = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const plural = (n, one, many) => (n === 1 ? one : many);
const v = (t) => `<span class="hg-v">${A(String(t))}</span>`;
const h3 = (t) => `<h3 class="hg-h3">${A(t)}</h3>`;
const fc = (ctx, role, weight) => { const f = faceFor(ctx, role, weight); return `font-family:var(--g-${role === 'display' ? 'display' : role === 'mono' ? 'bmono' : 'body'});font-weight:${f.weight};font-style:${f.style === 'italic' ? 'italic' : 'normal'}${f.stretch ? `;font-stretch:${f.stretch}%` : ''}`; };
const rules = (list) => `<ul class="hg-rules">${list.map((r) => `<li><p><span class="hg-do">Do</span> ${A(r.do)}</p><p><span class="hg-do">Don&rsquo;t</span> ${A(r.dont)}</p></li>`).join('')}</ul>`;
const rowsOf = (items) => `<dl class="hg-rows">${items.filter(Boolean).map(([k, x]) => `<div><dt>${A(k)}</dt><dd>${x}</dd></div>`).join('')}</dl>`;
const rgbOf = (ctx, hex) => { const [r, g, b] = ctx.C.hexToRgb(hex); return `rgb(${r}, ${g}, ${b})`; };

// ---- the logo on a ground: the colourway whose own ground is nearest that ground, once for light and once for dark ----
function cwFor(ctx, ground) {
  const cws = ctx.brand.logo.colourways;
  return Object.keys(cws).filter((k) => cws[k].ground).sort((a, b) => ctx.ratio(cws[a].ground, ground) - ctx.ratio(cws[b].ground, ground))[0];
}
function logoAt(ctx, id, ground, w, label = 'Logo') {
  const k = cwFor(ctx, ground), cw = ctx.brand.logo.colourways[k];
  return ctx.logo.html(id, { width: w, colourway: k, color: cw.name, label });
}
const logoBoth = (ctx, id, w, label) => `<span class="hg-lg hg-for-light">${logoAt(ctx, id, pressOf(ctx).paper, w, label)}</span><span class="hg-lg hg-for-dark">${logoAt(ctx, id, ctx.roles.dark.surface, w, label)}</span>`;

// ---- a poster off the press: the plate, the pass and the brand's line ----
function posterArt(ctx, line) {
  const P = pressOf(ctx), w = 420, h = 594;
  const ink = inkLayers(ctx, 'site-poster', { w, h, plate: { x: 0, y: 0, w, h: 330 }, pass: { x: 330, y: -8, w: 98, h: h + 16 }, hit: null });
  const lw = 150, lg = logoAt(ctx, 'colour', P.paper, lw, `${ctx.brand.name} logo`);
  const inner = `${ink.html}<div class="lay" style="z-index:3"><p style="position:absolute;left:28px;top:356px;width:290px;${faceCss(ctx, 'display', ctx.weights.heading)};font-size:40px;line-height:1.05;color:var(--key)">${A(line)}</p><span style="position:absolute;left:28px;bottom:32px;display:block;width:${lw}px">${lg}</span></div>`;
  return { w, h, html: ctx.artPage(inner, { w, h }) };
}

// ---- one page: its count, the note that says what the count is, and its body ----
const PAGES = {
  intro(ctx) {
    const B = bookBrand(ctx), art = posterArt(ctx, (B.lines.others || [])[0] || B.lines.primary);
    return { count: 2, note: 'Things to know first: what the brand does and who it serves.', body: `<div class="hg-intro"><span class="hg-intro__lg">${logoBoth(ctx, 'colour', 240, `${B.name} logo`)}</span><p class="hg-lead">${A(B.description)}</p></div>
<dl class="hg-pair"><div><dt class="hg-h3">What it does</dt><dd class="hg-p">${A(B.product)}</dd></div><div><dt class="hg-h3">Who it serves</dt><dd class="hg-p">${A(B.audience)}</dd></div></dl>
<figure class="hg-mock">${plateImg(A(ctx.mockup('bench-press-tray', [art])), `${A(B.name)} poster, fresh off the press in the tray`, '')}<figcaption class="hg-meta">The poster off the press, in the tray.</figcaption></figure>` };
  },
  personality(ctx) {
    const B = bookBrand(ctx), n = B.personality.length;
    return { count: n, note: `${A(ctx.cap(plural(n, 'trait', 'traits')))} of the personality, each with what it means in practice.`, body: `<ol class="hg-traits">${B.personality.map((p, i) => `<li><span class="hg-v hg-traits__n">${String(i + 1).padStart(2, '0')}</span><p class="hg-trait" style="${fc(ctx, 'display', ctx.weights.heading)}">${A(p.trait)}</p><p class="hg-p">${A(p.means)}</p></li>`).join('')}</ol>` };
  },
  voice(ctx) {
    const V = bookBrand(ctx).voice, n = V.principles.length;
    return { count: n, note: `${A(ctx.cap(plural(n, 'principle', 'principles')))} of the voice, each with a line that shows it.`, body: `<ol class="hg-say">${V.principles.map((p) => `<li><p class="hg-say__k">${A(p.title)}</p><p class="hg-say__x" style="${fc(ctx, 'display', ctx.weights.heading)}">${A(p.example)}</p></li>`).join('')}</ol>` };
  },
  'write-this'(ctx) {
    const R = bookBrand(ctx).voice.writeThis, n = R.length;
    return { count: n, note: `${A(ctx.cap(plural(n, 'line', 'lines')))} written this way, each beside the line it replaces.`, body: `<ul class="hg-wtn">${R.map((r) => `<li><p class="hg-wtn__w">${A(r.write)}</p><p class="hg-wtn__n"><span class="hg-do">Not</span> <s>${A(r.not)}</s></p><p class="hg-p">${A(r.because)}</p></li>`).join('')}</ul>` };
  },
  messaging(ctx) {
    const B = bookBrand(ctx), V = B.voice, lines = [B.lines.primary, ...(B.lines.others || [])], n = lines.length, dsp = fc(ctx, 'display', ctx.weights.heading);
    return { count: n, note: `${A(ctx.cap(plural(n, 'line', 'lines')))} in use, and the boilerplate in two lengths.`, body: `<ul class="hg-lines">${lines.map((l) => `<li style="${dsp}">${A(l)}</li>`).join('')}</ul>
<div class="hg-two"><div>${h3('The brand in 25 words')}<p class="hg-p">${A(V.boilerplate25)}</p></div><div>${h3('The brand in 50 words')}<p class="hg-p">${A(V.boilerplate50)}</p></div></div>
${h3('Writing the name')}<p class="hg-p">${A(V.nameRules)}</p>` };
  },
  logo(ctx) {
    const B = ctx.brand, n = Object.keys(B.logo.colourways).length;
    return { count: n, note: `${A(ctx.cap(plural(n, 'colourway', 'colourways')))} of the logo, each for its own ground.`, body: `<div class="hg-logohero">${logoBoth(ctx, 'colour', 520, `${B.name} logo`)}</div><p class="hg-lead">${A(B.logo.idea)}</p>` };
  },
  'logo-versions'(ctx) {
    const B = ctx.brand, L = ctx.logo, cw = B.logo.colourways, n = L.versions.length;
    const cell = (id) => {
      const w = cw[L.colourwayOf(id)], g = L.geos[id], maxW = id === 'symbol' ? 72 : id === 'stacked' ? 120 : 200, lw = Math.floor(Math.min(maxW, (72 * g.w) / g.h));
      return `<li class="hg-ver"><span class="hg-ver__g" style="background:${w.ground}">${L.html(id, { width: lw, color: w.name, label: `${L.labels[id]} logo` })}</span><span class="hg-ver__k">${A(L.labels[id])}</span><span class="hg-p">${A(B.logo.when[id] || '')}</span></li>`;
    };
    return { count: n, note: `${A(ctx.cap(plural(n, 'version', 'versions')))} of the logo, each printed on the ground it is made for.`, body: `<ul class="hg-vers">${L.versions.map(cell).join('')}</ul>` };
  },
  'clear-space'(ctx) {
    const L = ctx.logo, pad = ((L.clearShare / 100) * L.geo.height / L.geo.width) * 100;
    return { count: L.clearShare, note: 'Per cent of the logo&rsquo;s height, kept clear on every side.', body: `<div class="hg-clear"><div class="hg-clear__b" style="padding:${pad.toFixed(3)}%">${logoBoth(ctx, 'colour', 360, 'Logo with its clear space')}</div></div>
<p class="hg-lead">Keep ${v(L.clearShare + '%')} of the logo&rsquo;s height clear on every side. Nothing else sits inside the dashed line.</p>` };
  },
  'min-size'(ctx) {
    const ms = ctx.logo.minSize, slot = ctx.edition === 'slot';
    return { count: ms.screenPx, note: 'Pixels wide on screen, the smallest the logo is set.', body: slot
      ? `<p class="hg-lead">Set the smallest size once the logo is in place: the width at which every part of it still reads as one mark.</p>`
      : `<div class="hg-min">${logoBoth(ctx, 'colour', ms.screenPx, 'Logo at its smallest size')}</div><p class="hg-lead">${v(ms.screenPx + ' px')} wide on screen, ${v(ms.printMm + ' mm')} in print. Never smaller.</p>` };
  },
  'logo-grounds'(ctx) {
    const L = ctx.logo, B = ctx.brand, cws = B.logo.colourways, seen = [];
    for (const k of Object.keys(cws)) { const g = (cws[k].ground || '').toUpperCase(); if (g && !seen.some((x) => x.g === g)) seen.push({ g, k }); }
    const nameOf = (hex) => (ctx.colours.find((c) => c.hex.toUpperCase() === hex) || {}).name || hex;
    return { count: seen.length, note: `${A(ctx.cap(plural(seen.length, 'ground', 'grounds')))} the logo sits on, each in its own colourway.`, body: `<ul class="hg-grounds">${seen.map(({ g, k }) => `<li><span class="hg-ground" style="background:${g}">${L.html('colour', { width: 200, colourway: k, color: cws[k].name, label: 'Logo' })}</span><span class="hg-p"><b>On ${A(nameOf(g))}</b> ${v(g)}. ${A(B.logo.when[k] || '')}</span></li>`).join('')}</ul>` };
  },
  'logo-misuse'(ctx) {
    const P = pressOf(ctx), L = ctx.logo, never = ['Do not stretch, squash or skew it.', 'Do not recolour it outside the versions.', 'Do not rotate it.', 'Do not add shadows, glows or other effects.', 'Do not set it on a busy part of a photo.', 'Do not outline it or put it in a box.'];
    const plain = (w = 180) => L.html('colour', { width: w, label: 'Logo' });
    const eg = [['Stretched', `<div style="transform:scale(1.4,.66)">${plain(140)}</div>`], ['Rotated', `<div style="transform:rotate(-12deg)">${plain(150)}</div>`], ['Boxed', `<div class="hg-boxed">${plain(140)}</div>`]];
    return { count: never.length, note: `${A(ctx.cap(plural(never.length, 'way', 'ways')))} the logo is never used.`, body: `<ul class="hg-miss">${eg.map(([t, a]) => `<li><span class="hg-miss__a" aria-hidden="true">${a}</span><span class="hg-miss__k">${A(t)}</span></li>`).join('')}</ul>
<ul class="hg-never">${never.map((m) => `<li>${A(m)}</li>`).join('')}</ul>` };
  },
  palette(ctx) {
    const cols = ctx.colours, n = cols.length;
    const entry = (c) => `<li class="hg-col"><span class="hg-col__sw" style="background:${c.hex}" aria-hidden="true"></span><div class="hg-col__t"><h2 class="hg-col__n">${A(c.name)}</h2><p class="hg-p">${A(c.lands)}</p><p class="hg-vals">${v(c.hex)}</p></div></li>`;
    return { count: n, note: `${A(ctx.cap(plural(n, 'colour', 'colours')))} in the palette.`, body: `<ul class="hg-cols">${cols.map(entry).join('')}</ul>` };
  },
  proportion(ctx) {
    const cols = [...ctx.colours].sort((a, b) => b.share - a.share), tot = cols.reduce((a, c) => a + c.share, 0), pc = (c) => Math.round((c.share / tot) * 100);
    return { count: pc(cols[0]), note: `Per cent of a page the ${A(cols[0].name)} ground takes, the largest share.`, body: `<div class="hg-share" role="img" aria-label="The palette by share of a page: ${A(cols.map((c) => `${c.name} ${pc(c)}%`).join(', '))}">${cols.map((c) => `<i style="flex:${Math.max(c.share, 0.02)} 1 0;background:${c.hex}"></i>`).join('')}</div>
<ul class="hg-shares">${cols.map((c) => `<li><span class="hg-sw" style="background:${c.hex}" aria-hidden="true"></span><span>${A(c.name)}</span>${v(pc(c) + '%')}</li>`).join('')}</ul>` };
  },
  contrast(ctx) {
    const B = ctx.brand, used = ctx.pairs, un = ctx.unusedPairs || [];
    const pair = (p) => `<li class="hg-pc"><span class="hg-pc__s" style="background:${p.bgHex};color:${p.fgHex}">${A(p.ratioText)}&thinsp;:&thinsp;1</span><span class="hg-p">${A(p.use)}</span></li>`;
    return { count: used.length, note: `${A(ctx.cap(plural(used.length, 'pair', 'pairs')))} of colour carry ${A(B.name)} text, each with its ratio.`, body: `<p class="hg-lead">Text needs ${v('4.5 : 1')}. Type at ${v('24 px')} and over needs ${v('3 : 1')}.</p><ul class="hg-pairs">${used.map(pair).join('')}</ul>
${un.length ? `${h3('Never used for text')}<ul class="hg-pairs">${un.map((p) => `<li class="hg-pc"><span class="hg-pc__s hg-pc__s--n" style="background:${p.bgHex}" aria-hidden="true"><i style="background:${p.fgHex}"></i></span><span class="hg-p">${v(String(p.ratioText) + ' : 1')}</span></li>`).join('')}</ul>` : ''}` };
  },
  'colour-values'(ctx) {
    const cols = ctx.colours, tones = ctx.tones || [], n = cols.length * 3;
    const entry = (c) => {
      const steps = Object.entries(c.ramp || {});
      return `<li class="hg-cv"><span class="hg-col__sw" style="background:${c.hex}" aria-hidden="true"></span><div class="hg-col__t"><h2 class="hg-col__n">${A(c.name)}</h2>${rowsOf([['HEX', v(c.hex)], ['RGB', v(rgbOf(ctx, c.hex))], ['OKLCH', v(c.oklch || ctx.C.oklchString(c.hex))], ...(ctx.C.cmykOf(c) ? [['CMYK', v(ctx.C.cmykOf(c))]] : [])])}${steps.length ? `<ul class="hg-ramp" aria-label="${A(c.name)} ramp">${steps.map(([k, hx]) => `<li><i style="background:${hx}" aria-hidden="true"></i>${v(k)}<br>${v(hx)}</li>`).join('')}</ul>` : ''}</div></li>`;
    };
    return { count: n, note: `Values, three for each of ${cols.length} colours: HEX, RGB and OKLCH.`, body: `<ul class="hg-cvs">${cols.map(entry).join('')}</ul>${tones.length ? `${h3('Tones')}<ul class="hg-cvs">${tones.map(entry).join('')}</ul>` : ''}` };
  },
  typefaces(ctx) {
    const F = bookBrand(ctx).fonts, wn = (ws) => ws.map((w) => `${WEIGHT[w] || w} ${w}`).join(', ');
    const face = (role, f, what) => `<li class="hg-face"><p class="hg-face__big" style="${fc(ctx, role, f.weights[f.weights.length - 1])}">${A(f.family)}</p><p class="hg-p"><b>${what}</b>, ${A(wn(f.weights))}.</p></li>`;
    const list = [['display', F.display, 'Display'], ['body', F.body, 'Text']];
    const fams = [F.display.family, F.body.family, F.mono && F.mono.family].filter((f, i, a) => f && a.indexOf(f) === i);
    return { count: fams.length, note: `${A(ctx.cap(plural(fams.length, 'typeface', 'typefaces')))} in the system.`, body: `<ul class="hg-faces">${list.map((x) => face(...x)).join('')}${F.mono ? face('mono', F.mono, 'Values') : ''}</ul><p class="hg-p">${A(listAnd(fams))} ${fams.length > 1 ? 'are' : 'is'} open source under the SIL Open Font Licence: free in print and on screen.</p>` };
  },
  hierarchy(ctx) {
    const T = bookBrand(ctx).type, n = T.scale.length;
    return { count: n, note: `${A(ctx.cap(plural(n, 'step', 'steps')))} in the type scale, display to small print.`, body: `<ol class="hg-scale">${T.scale.map((s) => {
      const disp = s.face === 'display', text = disp ? T.sample.headline : T.sample.paragraph;
      return `<li><div class="hg-scale__k"><p class="hg-scale__t">${A(ctx.cap(s.token))}</p><p class="hg-p">${v(s.size + ' px')}, line ${v(s.line)}, ${A(WEIGHT[s.weight] || s.weight)}. ${A(s.use)}</p></div><p class="hg-scale__s" style="${fc(ctx, disp ? 'display' : 'body', s.weight)};--fs:${s.size}px;line-height:${s.line}">${A(text)}</p></li>`;
    }).join('')}</ol>` };
  },
  'type-in-use'(ctx) {
    const T = bookBrand(ctx).type, S = T.scale, tok = (name, i) => S.find((s) => String(s.token).toLowerCase().includes(name)) || S[i] || S[S.length - 1];
    const used = [['Headline', tok('headline', 1), T.sample.headline], ['Body', tok('body', 3), T.sample.paragraph], ['Caption', tok('caption', S.length - 1), T.sample.caption]];
    return { count: used.length, note: 'Sizes in use together: a headline, the body and a caption.', body: `<ol class="hg-use">${used.map(([k, s, text]) => `<li><p class="hg-scale__t">${k} ${v(s.size + ' px')}</p><p class="hg-use__s" style="${fc(ctx, s.face === 'display' ? 'display' : 'body', s.weight)};--fs:${s.size}px;line-height:${s.line}">${A(text)}</p></li>`).join('')}</ol>` };
  },
  'type-rules'(ctx) {
    const R = bookBrand(ctx).type.rules, n = R.length;
    return { count: n, note: `${A(ctx.cap(plural(n, 'rule', 'rules')))} for setting type, each with what to avoid.`, body: rules(R) };
  },
  'photo-direction'(ctx) {
    const D = ctx.brand.imagery.direction, rows = [['Light', D.light], ['Crop', D.crop], ['Colour', D.colour], ['People', D.people]].filter(([, x]) => x);
    return { count: rows.length, note: `Notes on how a ${A(ctx.brand.name)} photograph is made: ${A(rows.map(([k]) => k.toLowerCase()).join(', '))}.`, body: `<p class="hg-lead">${A(D.subject)}</p>${rowsOf(rows.map(([k, x]) => [k, `<span class="hg-p">${A(x)}</span>`]))}` };
  },
  'shot-list'(ctx) {
    const shots = ctx.brand.imagery.shots, n = shots.length;
    const fig = (s) => `<li class="hg-shot"><figure>${ctx.photo(s.id, { cls: 'hg-photo', slotNote: false })}<figcaption class="hg-p">${A(s.photo ? (s.caption || s.alt || '') : s.slot)}</figcaption></figure></li>`;
    // a credit prints only for a real photographer, once for the page; a generated shot carries none
    const credits = [...new Set(shots.filter((s) => s.photo && s.credit && !s.generated).map((s) => s.credit))];
    return { count: n, note: `${A(ctx.cap(plural(n, 'shot', 'shots')))} on the list, each the brief for one photograph.`, body: `<ul class="hg-shots">${shots.map(fig).join('')}</ul>${credits.length ? `<p class="hg-meta">Photographs: ${A(listAnd(credits))}.</p>` : ''}` };
  },
  'imagery-rules'(ctx) {
    const R = ctx.brand.imagery.rules, n = R.length;
    return { count: n, note: `${A(ctx.cap(plural(n, 'rule', 'rules')))} for choosing a photograph.`, body: rules(R) };
  },
  grid(ctx) {
    const G = ctx.gridMeasures, B = ctx.brand, m = (G.margin / G.page.w) * 100, inner = G.page.w - 2 * G.margin, gap = (G.gutter / inner) * 100;
    const col = String(Math.round(G.col * 10) / 10);
    const radii = ctx.radii.filter((r) => r.px < 9999);
    const grid = `<div class="hg-grid" role="img" aria-label="The page grid: ${G.columns} columns, ${G.margin} pixel margins and ${G.gutter} pixel gutters on a ${G.page.w} by ${G.page.h} page" style="aspect-ratio:${G.page.w}/${G.page.h};padding:${m.toFixed(3)}%"><div class="hg-grid__c" style="column-gap:${gap.toFixed(3)}%;grid-template-columns:repeat(${G.columns},1fr)">${'<i></i>'.repeat(G.columns)}</div></div>`;
    return { count: G.columns, note: `${A(ctx.cap(plural(G.columns, 'column', 'columns')))} in the page grid.`, body: `<div class="hg-gridw">${grid}<div>${rowsOf([['Page', v(`${G.page.w} × ${G.page.h} px`)], ['Margin', v(G.margin + ' px')], ['Gutter', v(G.gutter + ' px')], ['Column', v(col + ' px')], ['Base', v(G.base + ' px')]])}<p class="hg-p">Text sits on the columns; images may run to the margins. Every measure is a step of ${v(G.base + ' px')}.</p></div></div>
<div class="hg-two"><div>${h3('Spacing')}<p class="hg-p">Space inside a group is smaller than the space between groups.</p><ol class="hg-space">${ctx.space.map((s) => `<li><i style="width:${s.px}px;height:${s.px}px" aria-hidden="true"></i>${v(s.px)}</li>`).join('')}</ol></div>
<div>${h3('Corners and edges')}<p class="hg-p">Edges are ${v(B.ui.border + ' px')}. ${A(B.ui.elevationNote || '')}</p><ul class="hg-radii">${radii.map((r) => `<li><i style="border-radius:${r.px}px" aria-hidden="true"></i><span class="hg-p">${A(r.use)}, ${v(r.px + ' px')}</span></li>`).join('')}</ul></div></div>` };
  },
  layouts(ctx) {
    const B = bookBrand(ctx), P = pressOf(ctx), line = B.lines.primary, second = (B.lines.others || [])[0] || B.name;
    ctx.pair(P.textOnPlate, P.plate, { size: 24, what: 'site layout flood' });
    const lgPlate = ctx.logo.html('colour', { width: 96, colourway: Object.keys(B.logo.colourways).find((k) => (B.logo.colourways[k].ground || '').toUpperCase() === P.plate.toUpperCase()) || 'mono-dark', color: P.textOnPlate, label: 'Logo' });
    const pieces = [
      ['Plate and pass', `<i class="hg-lay__plate" style="height:46%"></i><i class="hg-lay__pass hg-scr"></i><p class="hg-lay__t" style="top:52%;${fc(ctx, 'display', ctx.weights.heading)}">${A(second)}</p><span class="hg-lay__lg">${logoBoth(ctx, 'colour', 96, 'Logo')}</span>`],
      ['The plate alone', `<i class="hg-lay__plate" style="height:100%"></i><p class="hg-lay__t hg-lay__t--p" style="top:12%;${fc(ctx, 'display', ctx.weights.heading)}">${A(line)}</p><span class="hg-lay__lg">${lgPlate}</span>`],
      ['The pass alone', `<i class="hg-lay__pass hg-scr"></i><p class="hg-lay__t" style="top:12%;${fc(ctx, 'display', ctx.weights.heading)}">${A(second)}</p><span class="hg-lay__lg">${logoBoth(ctx, 'colour', 96, 'Logo')}</span>`],
    ];
    return { count: pieces.length, note: 'Ways to lay a page off the press: the plate and the pass, the plate alone, the pass alone.', body: `<ul class="hg-lays">${pieces.map(([k, h]) => `<li><div class="hg-lay">${h}</div><p class="hg-ver__k">${A(k)}</p></li>`).join('')}</ul>` };
  },
  'business-card'(ctx) {
    const B = bookBrand(ctx), P = pressOf(ctx), ap = B.applications, plateCw = cwFor(ctx, P.plate);
    ctx.pair(P.textOnPlate, P.plate, { size: 13, what: 'site business card front' });
    return { count: 2, note: 'Sides to the card: the logo on the plate, and the name and contact.', body: `<div class="hg-cards"><div class="hg-card" style="background:${P.plate};color:${P.textOnPlate}" role="img" aria-label="Business card, front: the logo on the plate"><span class="hg-card__lg">${ctx.logo.html('colour', { width: 170, colourway: plateCw, color: B.logo.colourways[plateCw].name, label: 'Logo' })}</span></div>
<div class="hg-card hg-card--b"><p class="hg-card__nm">${A(ap.card.person)}</p><p>${A(ap.card.role)}</p><p class="hg-card__ct">${A(ap.card.contact)}<br>${A(ap.site.url)}</p></div></div>` };
  },
  social(ctx) {
    const B = bookBrand(ctx), P = pressOf(ctx), dsp = fc(ctx, 'display', ctx.weights.heading), posts = (B.applications.social || []).slice(0, 3);
    const li = posts.map((t, i) => {
      const onPlate = i === 1, bg = onPlate ? P.plate : P.paper, ink = onPlate ? P.textOnPlate : P.key;
      ctx.pair(ink, bg, { size: 22, what: 'site social post' });
      return `<li class="hg-post" style="background:${bg};color:${ink}"><p style="${dsp}">${A(t)}</p><span class="hg-post__lg">${logoAt(ctx, 'symbol' in ctx.logo.geos ? 'symbol' : 'colour', bg, 48, 'Logo')}</span></li>`;
    });
    return { count: posts.length, note: `${A(ctx.cap(plural(posts.length, 'post', 'posts')))}, one of the brand&rsquo;s lines to each.`, body: `<ul class="hg-posts">${li.join('')}</ul>` };
  },
  signage(ctx) {
    const Br = bookBrand(ctx), P = pressOf(ctx), street = /street/i.test(JSON.stringify(ctx.brand.imagery));
    const brief = String(Br.applications.signage || '');
    // the scene follows the brief: a bus shelter brief gets the brand's own bus shelter (photo-busstop), another street brand the door poster, a room brand the gallery panel
    const scene = street ? (/shelter/i.test(brief) ? 'photo-busstop' : 'late-door-poster') : 'room-gallery-panel', S = ctx.sceneInfo(scene), asp = S.quads[0].aspect, surf = scene === 'late-door-poster' ? 'poster' : 'panel', wide = S.w > S.h;
    const face = [Br.lines.primary, ...(Br.lines.others || [])].find((t) => t && brief.endsWith(t)) || Br.lines.primary;
    const w = 400, h = Math.round(w / asp), p = 28, pw = Math.round(w * 0.12), ph = Math.round(h * 0.6);
    const ink = inkLayers(ctx, 'site-sign', { w, h, plate: { x: -6, y: -6, w: w + 12, h: ph + 6 }, pass: { x: w - pw, y: -6, w: pw + 6, h: h + 12 }, hit: null });
    const lw = Math.floor(Math.min(w * 0.46, (h * 0.15 * ctx.logo.geos.colour.w) / ctx.logo.geos.colour.h)), cwp = cwFor(ctx, P.plate);
    const art = `${ink.html}<div class="lay" style="z-index:3"><span style="position:absolute;left:${p}px;top:${p}px;display:block;width:${lw}px">${ctx.logo.html('colour', { width: lw, colourway: cwp, color: ctx.brand.logo.colourways[cwp].name, label: 'Logo' })}</span><p style="position:absolute;left:${p}px;top:${Math.round(h * 0.2)}px;width:${w - 2 * p - pw}px;${faceCss(ctx, 'display', ctx.weights.heading)};font-size:${Math.round(w * 0.1)}px;line-height:1.1;color:var(--ptxt)">${A(face)}</p><p style="position:absolute;left:${p}px;bottom:${p}px;${faceCss(ctx, 'body', 600)};font-size:16px;color:var(--key)">${A(Br.applications.site.url)}</p></div>`;
    const shot = ctx.mockup(scene, { [surf]: { html: ctx.artPage(art, { w, h }), w, h } });
    const uses = [[P.plateDrum, 'Plate'], [P.passDrum, 'Pass'], [P.keyDrum, 'Type']], drums = [];
    for (const [d, role] of uses) { const o = drums.find((x) => x.hex.toUpperCase() === d.hex.toUpperCase()); if (o) o.roles.push(role); else drums.push({ hex: d.hex, name: d.name, roles: [role] }); }
    return { count: drums.length, note: `${A(ctx.cap(plural(drums.length, 'drum', 'drums')))} print the sign face, each listed below with what it prints.`, body: `<div class="hg-sign${wide ? ' hg-sign--wide' : ''}"><figure class="hg-mock"><img src="${A(shot)}" alt="${A(Br.name)} sign face in place"></figure><div class="hg-sign__t"><p class="hg-lead">${A(brief)}</p>
${h3('Printed in')}<ul class="hg-drums">${drums.map((d) => `<li><span class="hg-sw" style="background:${d.hex}" aria-hidden="true"></span><b>${A(d.name)}</b><span>${A(listAnd(d.roles))}</span></li>`).join('')}</ul></div></div>` };
  },
  'email-signature'(ctx) {
    const B = bookBrand(ctx), ap = B.applications;
    return { count: 4, note: 'Lines in the signature: name, role, contact and the horizontal logo.', body: `<div class="hg-email"><p class="hg-email__n">${A(ap.email.person)}</p><p>${A(ap.email.role)}, ${A(B.name)}</p><p>${A(ap.card.contact)}<br>${A(ap.site.url)}</p><div class="hg-email__l">${logoBoth(ctx, 'horizontal', 180, 'Logo')}</div></div>` };
  },
  digital(ctx) {
    const B = bookBrand(ctx), S = B.ui.screen.content, rows = S.deliveries.slice(0, 3);
    return { count: rows.length, note: `${A(ctx.cap(plural(rows.length, 'row', 'rows')))} on the product screen, each with its status.`, body: `<div class="hg-device"><div class="ui hg-screen" role="img" aria-label="${A(B.name)} product screen: ${A(S.eta)}. ${A(S.pickup)}." inert>
<div class="hg-scr__top"><span class="ui-num">${A(S.time)}</span>${ctx.ui.statusChip(rows[0] ? rows[0].status : ctx.status[0].id)}</div>
<p class="ui-display hg-scr__eta">${A(S.eta)}</p><p class="hg-scr__note">${A(S.pickup)}</p>
<ul class="ui-list">${rows.map((d) => ctx.ui.row({ title: d.to, sub: d.when, end: d.price, chip: ctx.ui.statusChip(d.status) })).join('')}</ul></div></div>
<p class="hg-p">${A(B.ui.screen.title || 'The product')}. The same components as the UI kit, laid by the page; none restyled.</p>` };
  },
  summary(ctx) {
    const B = ctx.brand, P = pressOf(ctx), G = B.guideB || {}, rl = G.rules || [], nd = P.drums.length, F = B.fonts;
    const paperName = (ctx.colours.find((c) => c.hex.toUpperCase() === P.paper.toUpperCase()) || { name: 'Offset' }).name;
    const cols = ctx.colours.slice().sort((a, b) => b.share - a.share);
    return { count: nd, note: `${A(ctx.cap(plural(nd, 'ink', 'inks')))} run for ${A(B.name)}, on ${A(paperName)}: ${A(listAnd(P.drums.map((d) => d.name)))}.`, body: `<span class="hg-sum__lg">${logoBoth(ctx, 'colour', 280, `${B.name} logo`)}</span>
<ol class="hg-sumr">${rl.map((r) => `<li><p class="hg-say__k" style="${fc(ctx, 'display', ctx.weights.heading)}">${A(r.title)}</p><p class="hg-p">${A(r.text || r.body || '')}</p></li>`).join('')}</ol>
<div class="hg-share" role="img" aria-label="The palette by share of a page: ${A(cols.map((c) => `${c.name} ${Math.round(c.share * 100)}%`).join(', '))}">${cols.map((c) => `<i style="flex:${Math.max(c.share, 0.02)} 1 0;background:${c.hex}"></i>`).join('')}</div>
<ul class="hg-faces hg-faces--2"><li class="hg-face"><p class="hg-face__big" style="${fc(ctx, 'display', ctx.weights.heading)}">Aa</p><p class="hg-p"><b>${A(F.display.family)}</b></p></li><li class="hg-face"><p class="hg-face__big" style="${fc(ctx, 'body', 400)}">Aa</p><p class="hg-p"><b>${A(F.body.family)}</b></p></li></ul>` };
  },
  'contact-scope'(ctx) {
    const B = ctx.brand, P = pressOf(ctx), C = B.contact || {}, np = ctx.pages.length, ns = ctx.sections.length, F = B.fonts;
    const not = (B.guideB && B.guideB.notIn) || ['Logo files, palettes and fonts. They are in the brand kit.', 'Interface components and tokens. They are in the UI kit.'];
    const fam = [...new Set([F.display.family, F.body.family])];
    return { count: np, note: 'Pages in this edition, cover to close.', body: `<p class="hg-lead">${A(C.owner)} owns this document. Write to ${v(C.email)} for a logo file, a missing asset or an exception.</p>
<div class="hg-two"><div>${h3('Colophon')}<p class="hg-p">This edition runs to ${np} pages in ${ns} sections. Printed in ${P.drums.length} ink${P.drums.length === 1 ? '' : 's'}: ${A(listAnd(P.drums.map((d) => d.name)))}. Set in ${A(listAnd(fam))}, with values in Sono Mono.</p></div>
<div>${h3('Not in this document')}<ul class="hg-nots">${not.map((t) => `<li class="hg-p">${A(t)}</li>`).join('')}</ul></div></div>
${h3('Version history')}<p class="hg-p">${v(B.version.number)} ${A(ctx.date)}. First release.</p>` };
  },
};

// the cover and contents are the front's two sheets; they answer page() too, so every id has a page
export function pageHtml(ctx, id, S) {
  const u = ctx.pages.find((x) => x.id === id) || { id, title: id };
  const P = pressOf(ctx);
  ctx.pair(P.textOnPlate, P.plate, { size: 16, what: 'site sheet head' });
  const fn = PAGES[id];
  if (!fn) throw new Error(`lane-hg: no page for ${id}`);
  const r = fn(ctx);
  const total = String(ctx.pages.length).padStart(3, '0');
  return sheet(ctx, id, { count: r.count, note: r.note, title: u.title, folio: `${String(ctx.pageNo(id)).padStart(3, '0')} / ${total}`, foot: u.section ? u.section.title : u.title }, r.body);
}
export const guidelineIds = () => Object.keys(PAGES);
