// Theme 28 (Riso), lane bk: the HTML brand book. Each section is one sheet of the run, laid on the bench: a plate across its head, a pass of
// the key drum screened down its right edge, and the hit, a numeral in the brand's display face cut out of the plate and printed a few px out
// of register. The hit is always a real count from ctx, and the note beside it says what it counts. Words are in the brand's body face; literal
// values (hex, rgb, oklch, px, mm, folios) are in Sono Mono, the mono the guidelines pages use. The press itself is in lane-bk-ink.js.
import { BOOK_SECTIONS } from '../../engine/book.js';
import { pressOf, faceCss, inkLayers } from './sheet.js';
import { bookBrand } from './copy.js';
import { tile, hit, passVars, colourBar, A } from './lane-bk-ink.js';
import { plateImg } from '../../engine/plate.js';

const NO = (id) => String(BOOK_SECTIONS.findIndex((s) => s.id === id) + 1).padStart(2, '0');
const TITLE = (id) => BOOK_SECTIONS.find((s) => s.id === id).title;
const TOTAL = String(BOOK_SECTIONS.length).padStart(2, '0');
const WEIGHT = { 100: 'Thin', 200: 'ExtraLight', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold', 900: 'Black' };
const listAnd = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const v = (t) => `<span class="v">${A(String(t))}</span>`;
const h3 = (t) => `<h3 class="rb-h3">${t}</h3>`;
const plural = (n, one, many) => (n === 1 ? one : many);

// ---- controls ----
const copyBtn = (text, value, what) => `<button type="button" class="bk-btn rb-btn" data-copy="${A(value)}" data-copy-label="${A(what)}" aria-label="${A(text + ', ' + what)}"><span class="bk-btn__t">${A(text)}</span></button>`;
const valBtn = (kind, value, name) => `<button type="button" class="bk-btn rb-val" data-copy="${A(value)}" data-copy-label="${A(name + ' ' + kind)}" aria-label="Copy ${A(kind)} ${A(value)}, ${A(name)}"><span class="bk-btn__t">${A(value)}</span></button>`;
const dlLink = (f, label, text) => (f && f.href ? `<a class="rb-dl" href="${A(f.href)}" download aria-label="Download ${A(label)}, ${A(f.ext || text)}, ${A(f.sizeText || '')}">${A(text || f.ext)}</a>` : '');
const rules = (list) => `<ul class="rb-rules">${list.map((r) => `<li><p><span class="rb-do">Do</span> ${A(r.do)}</p><p><span class="rb-do">Don&rsquo;t</span> ${A(r.dont)}</p></li>`).join('')}</ul>`;

// ---- the logo on a ground: the colourway whose own ground is nearest that ground (lowest ratio), once for light and once for dark ----
function cwFor(ctx, ground) {
  const cws = ctx.brand.logo.colourways;
  return Object.keys(cws).filter((k) => cws[k].ground).sort((a, b) => ctx.ratio(cws[a].ground, ground) - ctx.ratio(cws[b].ground, ground))[0];
}
function logoAt(ctx, id, ground, w, label = 'Logo') {
  const k = cwFor(ctx, ground), cw = ctx.brand.logo.colourways[k];
  return ctx.logo.html(id, { width: w, colourway: k, color: cw.name, label });
}
const logoBoth = (ctx, id, w, label) => `<span class="rb-lg rb-for-light">${logoAt(ctx, id, pressOf(ctx).paper, w, label)}</span><span class="rb-lg rb-for-dark">${logoAt(ctx, id, ctx.roles.dark.surface, w, label)}</span>`;

// ---- one sheet: the head (plate, head pass, hit, title and what the hit counts), then the body (body pass, content, foot) ----
function sheet(ctx, id, count, note, headText, body, opts = {}) {
  const H = hit(ctx, id, String(count), opts);
  return `<section class="bk-sec rb-sh rb-sh--${id}" id="${id}" aria-labelledby="h-${id}" style="${passVars(id)};${H.vars}">
<div class="rb-hd"><div class="rb-plate mot" aria-hidden="true"><i></i></div><div class="rb-pass rb-pass--hd" aria-hidden="true"></div>${H.html}
<div class="rb-hd__t"><div class="rb-hd__tt">${headText || `<h2 class="rb-h2" id="h-${id}">${A(TITLE(id))}</h2>`}</div><p class="rb-hd__c">${note}</p></div></div>
<div class="rb-bd"><div class="rb-pass rb-pass--bd" aria-hidden="true"></div><div class="rb-in">${body}</div>
<div class="rb-ft">${colourBar(ctx)}<span class="rb-ft__n">${A(TITLE(id))}</span><span class="rb-ft__f v">${NO(id)} / ${TOTAL}</span></div></div>
</section>`;
}

// ---- 1 Overview: the brand's line is the only h1, and the only place lines.primary is printed ----
function overview(ctx) {
  const B = bookBrand(ctx), n = B.personality.length;
  const head = `<h1 class="rb-h1" id="h-overview" style="${faceCss(ctx, 'display', ctx.weights.heading)}">${(String(ctx.brand.lines.primary).match(/[^.!?]+[.!?]+/g) || [ctx.brand.lines.primary]).map((x) => `<span class="rb-sent">${A(x.trim())}</span>`).join(' ')}</h1>`;
  const body = `<div class="rb-intro"><span class="rb-intro__lg">${logoBoth(ctx, 'colour', 220, `${B.name} logo`)}</span><p class="rb-lead">${A(B.description)}</p></div>
<dl class="rb-pair"><div><dt class="rb-h3">What it does</dt><dd class="rb-p">${A(B.product)}</dd></div><div><dt class="rb-h3">Who it serves</dt><dd class="rb-p">${A(B.audience)}</dd></div></dl>
${h3('How it behaves')}<ol class="rb-traits">${B.personality.map((p, i) => `<li><span class="v rb-traits__n">${String(i + 1).padStart(2, '0')}</span><p class="rb-trait" style="${faceCss(ctx, 'display', ctx.weights.heading)}">${A(p.trait)}</p><p class="rb-p">${A(p.means)}</p></li>`).join('')}</ol>
<p class="rb-meta">Brand book, ${A(ctx.versionLine)}</p>`;
  return sheet(ctx, 'overview', n, `${A(ctx.cap(plural(n, 'personality trait', 'personality traits')))}, each with what it means in practice.`, head, body, { wide: 300 });
}

// ---- 2 Voice ----
function voice(ctx) {
  const B = bookBrand(ctx), V = B.voice, n = V.principles.length, dsp = faceCss(ctx, 'display', ctx.weights.heading);
  const pr = `<ol class="rb-say">${V.principles.map((p) => `<li><p class="rb-say__k">${A(p.title)}</p><p class="rb-say__x" style="${dsp}">${A(p.example)}</p></li>`).join('')}</ol>`;
  const wtn = `<ul class="rb-wtn">${V.writeThis.map((r) => `<li><p class="rb-wtn__w">${A(r.write)}</p><p class="rb-wtn__n"><span class="rb-do">Not</span> <s>${A(r.not)}</s></p><p class="rb-p">${A(r.because)}</p></li>`).join('')}</ul>`;
  const take = (title, text, what) => `<div class="rb-take">${h3(title)}<p class="rb-p">${A(text)}</p>${copyBtn('Copy text', text, what)}</div>`;
  const others = B.lines.others || [];
  const body = `${pr}${h3('Write this, not that')}${wtn}
<div class="rb-two">${take('The brand in 25 words', V.boilerplate25, '25-word boilerplate')}${take('The brand in 50 words', V.boilerplate50, '50-word boilerplate')}</div>
<div class="rb-two">${others.length ? `<div>${h3('Lines in use')}<ul class="rb-lines">${others.map((l) => `<li style="${dsp}">${A(l)}</li>`).join('')}</ul></div>` : ''}<div>${h3('Writing the name')}<p class="rb-p">${A(V.nameRules)}</p></div></div>`;
  return sheet(ctx, 'voice', n, `${ctx.cap(plural(n, 'principle', 'principles'))} of the voice, each with a line that shows it.`, '', body);
}

// ---- 3 Logo ----
function logo(ctx) {
  const B = ctx.brand, L = ctx.logo, cw = B.logo.colourways, slot = ctx.edition === 'slot', n = L.versions.length;
  const cell = (id) => {
    const w = cw[L.colourwayOf(id)], g = L.geos[id];
    const maxW = id === 'symbol' ? 72 : id === 'stacked' ? 120 : 200, lw = Math.floor(Math.min(maxW, (72 * g.w) / g.h));
    const files = slot ? null : ctx.book.logo(id), name = `${L.labels[id]} logo`;
    const links = files ? `<span class="rb-dls">${dlLink(files.svg, name)}${dlLink(files.png.find((p) => p.w === 1024), name + ', PNG, 1024 px wide', 'PNG')}${dlLink(files.pdf, name)}</span>` : '';
    return `<li class="rb-ver"><span class="rb-ver__g" style="background:${w.ground}">${L.html(id, { width: lw, color: w.name, label: name })}</span><span class="rb-ver__k">${A(L.labels[id])}</span><span class="rb-p">${A(B.logo.when[id] || '')}</span>${links}</li>`;
  };
  const ms = L.minSize, pad = ((L.clearShare / 100) * L.geo.height / L.geo.width) * 100;
  const clear = `<div class="rb-clear"><div class="rb-clear__b" style="padding:${pad.toFixed(3)}%">${logoBoth(ctx, 'colour', 280, 'Logo with its clear space')}</div></div><p class="rb-p">Keep ${v(L.clearShare + '%')} of the logo&rsquo;s height clear on every side.</p>`;
  const min = slot
    ? `<p class="rb-p">Set the smallest size once the logo is in place: the width at which every part of it still reads as one mark.</p>`
    : `<div class="rb-min">${logoBoth(ctx, 'colour', ms.screenPx, 'Logo at its smallest size')}</div><p class="rb-p">${v(ms.screenPx + ' px')} wide on screen, ${v(ms.printMm + ' mm')} in print. Never smaller.</p>`;
  const never = ['Do not stretch, squash or skew it.', 'Do not recolour it outside the versions above.', 'Do not rotate it.', 'Do not add shadows, glows or other effects.', 'Do not set it on a busy part of a photo.', 'Do not outline it or put it in a box.'];
  const body = `<div class="rb-logohero">${logoBoth(ctx, 'colour', 520, `${B.name} logo`)}</div><p class="rb-lead">${A(B.logo.idea)}</p>
${h3('The versions')}<p class="rb-p">Each version is printed on the ground it is made for. ${slot ? 'The frames hold the place and the proportion until the approved files go in the kit&rsquo;s logo folder.' : 'Download any one as SVG, PNG or PDF.'}</p>
<ul class="rb-vers">${L.versions.map(cell).join('')}</ul>
<div class="rb-two"><div>${h3('Clear space')}${clear}</div><div>${h3('Smallest size')}${min}</div></div>
${h3('Never')}<ul class="rb-never">${never.map((m) => `<li>${A(m)}</li>`).join('')}</ul>`;
  return sheet(ctx, 'logo', n, `${ctx.cap(plural(n, 'version', 'versions'))} of the logo, each for its own ground.`, '', body);
}

// ---- 4 Colour ----
function colour(ctx) {
  const B = ctx.brand, cols = ctx.colours, n = cols.length, P = pressOf(ctx);
  const rgb = (hex) => { const [r, g, b] = ctx.C.hexToRgb(hex); return `rgb(${r}, ${g}, ${b})`; };
  const share = `<div class="rb-share" role="img" aria-label="The palette by share of a page: ${A(cols.map((c) => `${c.name} ${Math.round(c.share * 100)}%`).join(', '))}">${cols.map((c) => `<i style="flex:${Math.max(c.share, 0.02)} 1 0;background:${c.hex}"></i>`).join('')}</div>`;
  const entry = (c) => `<li class="rb-col"><span class="rb-col__sw" style="background:${c.hex}" aria-hidden="true"></span><div class="rb-col__t"><h4 class="rb-col__n">${A(c.name)}${c.share != null ? ` <span class="v">${Math.round(c.share * 100)}%</span>` : ''}</h4><p class="rb-p">${A(c.lands)}</p>
<dl class="rb-vals"><div><dt>HEX</dt><dd>${valBtn('HEX', c.hex, c.name)}</dd></div><div><dt>RGB</dt><dd>${valBtn('RGB', rgb(c.hex), c.name)}</dd></div><div><dt>OKLCH</dt><dd>${valBtn('OKLCH', c.oklch || ctx.C.oklchString(c.hex), c.name)}</dd></div>${ctx.C.cmykOf(c) ? `<div><dt>CMYK</dt><dd>${valBtn('CMYK', ctx.C.cmykOf(c), c.name)}</dd></div>` : ''}</dl></div></li>`;
  const pair = (p) => `<li class="rb-pc"><span class="rb-pc__s" style="background:${p.bgHex};color:${p.fgHex}">${A(p.ratioText)}&thinsp;:&thinsp;1</span><span class="rb-p">${A(p.use)}</span></li>`;
  const drums = `<p class="rb-p">On paper this brand prints in ${P.drums.length === 1 ? 'one drum' : `${P.drums.length} drums`}: ${A(listAnd(P.drums.map((d) => d.name)))}. Where two inks cross, the colour is the overprint, shown in the bar at the foot of every sheet.</p>`;
  const body = `${share}<p class="rb-lead">Each colour at its share of a ${A(B.name)} page. Press a value to copy it.</p>
<ul class="rb-cols">${cols.map(entry).join('')}</ul>
${ctx.tones.length ? `${h3('Tones')}<ul class="rb-cols">${ctx.tones.map(entry).join('')}</ul>` : ''}
${h3('On the press')}${drums}
${h3('Contrast, pair by pair')}<p class="rb-p">Every text pair ${A(B.name)} uses, in its own colours, with its WCAG ratio. Text needs ${v('4.5 : 1')}; type at ${v('24 px')} and over needs ${v('3 : 1')}.</p>
<ul class="rb-pairs">${ctx.pairs.map(pair).join('')}</ul>`;
  return sheet(ctx, 'colour', n, `${ctx.cap(plural(n, 'colour', 'colours'))} in the palette, at their true share of a page.`, '', body);
}

// ---- 5 Typography ----
function typography(ctx) {
  const B = bookBrand(ctx), F = B.fonts, T = B.type, n = T.scale.length;
  const wn = (ws) => ws.map((w) => `${WEIGHT[w] || w} ${w}`).join(', ');
  const face = (role, f, what) => `<div class="rb-face"><p class="rb-face__big" style="${faceCss(ctx, role, f.weights[f.weights.length - 1])}">${A(f.family)}</p><p class="rb-p"><span class="rb-face__k">${what}</span>, ${A(wn(f.weights))}.</p></div>`;
  const faces = `<div class="rb-faces">${face('display', F.display, 'Display')}${face('body', F.body, 'Text')}${F.mono ? face('mono', F.mono, 'Values') : ''}</div>`;
  const fams = [F.display.family, F.body.family, F.mono && F.mono.family].filter((f, i, a) => f && a.indexOf(f) === i);
  const tester = `<div class="rb-tester" data-tester>
<p class="rb-tester__out" data-tester-out aria-hidden="true" style="${faceCss(ctx, 'display', ctx.weights.heading)}">${A(T.sample.headline)}</p>
<div class="rb-tester__c"><div class="rb-field"><label for="tester-text">Your line</label><input id="tester-text" type="text" value="${A(T.sample.headline)}" data-tester-text data-default="${A(T.sample.headline)}" autocomplete="off" spellcheck="false"></div>
<div class="rb-field"><label for="tester-size">Size <output for="tester-size" data-tester-value class="v">56 px</output></label><input id="tester-size" type="range" min="16" max="144" step="1" value="56" data-tester-size></div></div></div>`;
  const scale = `<ol class="rb-scale">${T.scale.map((s) => {
    const disp = s.face === 'display', text = disp ? T.sample.headline : T.sample.paragraph;
    return `<li><div class="rb-scale__k"><p class="rb-scale__t">${A(ctx.cap(s.token))}</p><p class="rb-p">${v(s.size + ' px')}, line ${v(s.line)}, ${A(WEIGHT[s.weight] || s.weight)}. ${A(s.use)}</p></div><p class="rb-scale__s" style="${faceCss(ctx, disp ? 'display' : 'body', s.weight)};--fs:${s.size}px;line-height:${s.line}">${A(text)}</p></li>`;
  }).join('')}</ol>`;
  const body = `${faces}<p class="rb-p">${A(listAnd(fams))} ${fams.length > 1 ? 'are' : 'is'} open source under the SIL Open Font Licence: free in print and on screen.</p>
${h3('Try a line')}${tester}
${h3('The scale')}${scale}
${h3('Rules')}${rules(T.rules)}`;
  return sheet(ctx, 'typography', n, `${ctx.cap(plural(n, 'step', 'steps'))} in the type scale, display to small print.`, '', body);
}

// ---- 6 Imagery ----
function imagery(ctx) {
  const B = ctx.brand, D = B.imagery.direction, shots = B.imagery.shots, n = shots.length;
  const fig = (s) => {
    const f = s.photo ? ctx.book.find(`05 Imagery/photos/${s.photo.split('/').pop()}`) : null;
    const cap = s.photo ? `${A(s.caption || s.alt || '')}${s.credit && !s.generated ? ` Photo: ${A(s.credit)}.` : ''}` : A(s.slot);
    return `<li class="rb-shot"><figure>${ctx.photo(s.id, { cls: 'rb-photo', slotNote: false })}<figcaption class="rb-p">${cap}${f ? ` ${dlLink(f, 'photo ' + (s.caption || s.id), 'Download JPG')}` : ''}</figcaption></figure></li>`;
  };
  const rows = [['Light', D.light], ['Crop', D.crop], ['Colour', D.colour], ['People', D.people]].filter(([, x]) => x);
  const body = `<p class="rb-lead">${A(D.subject)}</p>
<dl class="rb-rows">${rows.map(([k, x]) => `<div><dt>${k}</dt><dd class="rb-p">${A(x)}</dd></div>`).join('')}</dl>
${h3('The shot list')}<p class="rb-p">${shots.some((s) => s.photo) ? 'The photographs in the kit, each with its caption.' : 'No photographs yet. Each frame is the brief for one shot: who, where, the crop and the light.'}</p>
<ul class="rb-shots">${shots.map(fig).join('')}</ul>
${h3('Rules')}${rules(B.imagery.rules)}`;
  return sheet(ctx, 'imagery', n, `${ctx.cap(plural(n, 'shot', 'shots'))} on the shot list, each the brief for one photograph.`, '', body);
}

// ---- 7 Layout ----
function layout(ctx) {
  const G = ctx.gridMeasures, B = ctx.brand, n = G.columns;
  const m = (G.margin / G.page.w) * 100, inner = G.page.w - 2 * G.margin, gap = (G.gutter / inner) * 100;
  const grid = `<div class="rb-grid" role="img" aria-label="The page grid: ${G.columns} columns, ${G.margin} pixel margins and ${G.gutter} pixel gutters on a ${G.page.w} by ${G.page.h} page" style="aspect-ratio:${G.page.w}/${G.page.h};padding:${m.toFixed(3)}%"><div class="rb-grid__c" style="column-gap:${gap.toFixed(3)}%;grid-template-columns:repeat(${G.columns},1fr)">${'<i></i>'.repeat(G.columns)}</div></div>`;
  const col = String(Math.round(G.col * 10) / 10);
  const meas = `<dl class="rb-meas">${[['Page', `${G.page.w} × ${G.page.h} px`], ['Margin', `${G.margin} px`], ['Gutter', `${G.gutter} px`], ['Column', `${col} px`], ['Base', `${G.base} px`]].map(([k, x]) => `<div><dt>${k}</dt><dd>${v(x)}</dd></div>`).join('')}</dl>`;
  const space = `<ol class="rb-space">${ctx.space.map((s) => `<li><i style="width:${s.px}px;height:${s.px}px" aria-hidden="true"></i>${v(s.px)}</li>`).join('')}</ol>`;
  const radii = ctx.radii.filter((r) => r.px < 9999);
  const body = `<div class="rb-gridw">${grid}<div>${meas}<p class="rb-p">Text sits on the columns; images may run to the margins. Every measure is a step of ${v(G.base + ' px')}.</p></div></div>
<div class="rb-two"><div>${h3('Spacing')}<p class="rb-p">Space inside a group is smaller than the space between groups.</p>${space}</div>
<div>${h3('Corners and edges')}<p class="rb-p">Edges are ${v(B.ui.border + ' px')}. ${A(B.ui.elevationNote || '')}</p><ul class="rb-radii">${radii.map((r) => `<li><i style="border-radius:${r.px}px" aria-hidden="true"></i><span class="rb-p">${A(r.use)}, ${v(r.px + ' px')}</span></li>`).join('')}</ul></div></div>`;
  return sheet(ctx, 'layout', n, `${ctx.cap(plural(n, 'column', 'columns'))} in the page grid.`, '', body);
}

// ---- 8 Applications ----
// the poster: a 420 x 594 sheet off the same press (plate, pass, no hit), the brand's second line and its logo
function posterArt(ctx) {
  const B = bookBrand(ctx), P = pressOf(ctx), w = 420, h = 594, line = (B.lines.others || [])[0] || B.name;
  const ink = inkLayers(ctx, 'book-poster', { w, h, plate: { x: 0, y: 0, w, h: 330 }, pass: { x: 330, y: -8, w: 98, h: h + 16 }, hit: null });
  const lw = 150, lg = logoAt(ctx, 'colour', P.paper, lw, `${B.name} logo`);
  const inner = `${ink.html}<div class="lay" style="z-index:3"><p style="position:absolute;left:28px;top:356px;width:290px;${faceCss(ctx, 'display', ctx.weights.heading)};font-size:40px;line-height:1.05;color:var(--key)">${A(line)}</p><span style="position:absolute;left:28px;bottom:32px;display:block;width:${lw}px">${lg}</span></div>`;
  return { w, h, html: ctx.artPage(inner, { w, h }) };
}
function applications(ctx) {
  const B = bookBrand(ctx), ap = B.applications, P = pressOf(ctx), S = B.ui.screen.content, dsp = faceCss(ctx, 'display', ctx.weights.heading);
  const art = posterArt(ctx);
  const shot = (sid, alt) => `<figure class="rb-mock">${plateImg(A(ctx.mockup(sid, [art])), A(alt), '')}</figure>`;
  const mocks = [shot('bench-press-tray', `${B.name} poster, fresh off the press in the tray`), shot('late-door-poster', `${B.name} poster on a door at night`)];
  const plateCw = cwFor(ctx, P.plate);
  ctx.pair(P.textOnPlate, P.plate, { size: 13, what: 'book business card front' });
  const front = `<div class="rb-card rb-card--f" style="background:${P.plate};color:${P.textOnPlate}" role="img" aria-label="Business card, front: the logo on the plate"><span class="rb-card__lg">${ctx.logo.html('colour', { width: 150, colourway: plateCw, color: ctx.brand.logo.colourways[plateCw].name, label: 'Logo' })}</span></div>`;
  const back = `<div class="rb-card rb-card--b"><p class="rb-card__nm">${A(ap.card.person)}</p><p>${A(ap.card.role)}</p><p class="rb-card__ct">${A(ap.card.contact)}<br>${A(ap.site.url)}</p></div>`;
  const social = (ap.social || []).slice(0, 3);
  const posts = social.map((t, i) => {
    const onPlate = i === 1, bg = onPlate ? P.plate : P.paper, ink = onPlate ? P.textOnPlate : P.key;
    ctx.pair(ink, bg, { size: 22, what: 'book social post' });
    return `<li class="rb-post ph-tight" style="background:${bg};color:${ink}"><p style="${dsp}">${A(t)}</p><span class="rb-post__lg">${logoAt(ctx, 'symbol' in ctx.logo.geos ? 'symbol' : 'colour', bg, 40, 'Logo')}</span></li>`;
  });
  const email = `<div class="rb-email"><p class="rb-email__n">${A(ap.email.person)}</p><p>${A(ap.email.role)}, ${A(B.name)}</p><p>${A(ap.card.contact)}<br>${A(ap.site.url)}</p><div class="rb-email__l">${logoBoth(ctx, 'horizontal', 160, 'Logo')}</div></div>`;
  const rowsS = S.deliveries.slice(0, 3);
  const screen = `<div class="rb-device"><div class="ui rb-screen" role="img" aria-label="${A(B.name)} product screen: ${A(S.eta)}. ${A(S.pickup)}." inert>
<div class="rb-scr__top"><span class="ui-num">${A(S.time)}</span>${ctx.ui.statusChip(rowsS[0] ? rowsS[0].status : ctx.status[0].id)}</div>
<p class="ui-display rb-scr__eta">${A(S.eta)}</p><p class="rb-scr__note">${A(S.pickup)}</p>
<ul class="ui-list">${rowsS.map((d) => ctx.ui.row({ title: d.to, sub: d.when, end: d.price, chip: ctx.ui.statusChip(d.status) })).join('')}</ul></div></div>`;
  const n = mocks.length + 2 + posts.length + 2;
  const body = `<div class="rb-mocks">${mocks.join('')}</div><p class="rb-p">The poster off the same press as this book: the plate, the pass and the second line, ${v('420 × 594 mm')}.</p>
<div class="rb-two"><div>${h3('Business card')}<p class="rb-p">${v('90 × 55 mm')}, front and back.</p><div class="rb-cards">${front}${back}</div></div>
<div>${h3('Social')}<p class="rb-p">The brand&rsquo;s lines, one to a post.</p><ul class="rb-posts">${posts.join('')}</ul></div></div>
<div class="rb-two"><div>${h3('Email signature')}<p class="rb-p">Name, role, contact and the horizontal logo.</p>${email}</div>
<div>${h3('Product screen')}<p class="rb-p">${A(B.ui.screen.title || 'The product')}</p>${screen}</div></div>`;
  return sheet(ctx, 'applications', n, `${ctx.cap(plural(n, 'piece', 'pieces'))} on this sheet, printed and on screen.`, '', body);
}

// ---- 9 Downloads ----
function downloads(ctx) {
  const D = ctx.book, L = ctx.logo, slot = ctx.edition === 'slot', B = ctx.brand, n = D.all.length;
  const file = (f) => `<li class="rb-file"><span class="rb-file__n">${A(f.name)}</span><span class="v">${A(f.ext)}, ${A(f.sizeText)}</span><a class="rb-dl" href="${A(f.href)}" download aria-label="Download ${A(f.name)}">Download</a></li>`;
  const files = (list) => `<ul class="rb-files">${list.filter(Boolean).map(file).join('')}</ul>`;
  const logoRows = slot ? files(D.logoFiles)
    : `<ul class="rb-files">${L.versions.map((id) => { const f = D.logo(id); return `<li class="rb-file"><span class="rb-file__n">${A(L.labels[id])}</span><span class="rb-dls">${dlLink(f.svg, L.labels[id] + ' logo')}${dlLink(f.pdf, L.labels[id] + ' logo')}${f.png.map((p) => dlLink(p, `${L.labels[id]} logo, PNG, ${p.w} px wide`, `PNG ${p.w}`)).join('')}</span></li>`; }).join('')}</ul>`;
  const photos = D.imagery.filter((f) => f.rel.startsWith('05 Imagery/photos/')), pdfs = D.imagery.filter((f) => f.ext === 'PDF');
  const group = (title, what, inner) => `<li class="rb-group"><div class="rb-group__k">${h3(A(title))}<p class="rb-p">${A(what)}</p></div><div>${inner}</div></li>`;
  const body = `<div class="rb-zip"><p class="rb-zip__n" style="${faceCss(ctx, 'display', ctx.weights.heading)}">${A(B.name)} brand kit</p>
<p class="rb-p">Logo, colour, type, icons and imagery in one zip, ready for print and screen.</p>
<p class="rb-zip__a"><a class="bk-btn rb-btn rb-btn--prime" href="${A(D.zip.href)}" download aria-label="Download ${A(D.zip.name)}, ${A(D.zip.sizeText)}"><span class="bk-btn__t">Download the kit</span></a><span class="v">${A(D.zip.name)}, ${A(D.zip.sizeText)}</span></p></div>
<ol class="rb-groups">
${group('Read me', 'Start here: what is in the kit and how to use it.', files([D.readmePdf, D.readme]))}
${group('Logo', slot ? 'The labelled slot frame, and where the approved files go.' : 'Each version as SVG and PDF, and as PNG at three widths, transparent.', logoRows)}
${group('Colour', 'The palette for Adobe, CSS and JSON, and a swatch sheet.', files(D.colour))}
${group('Type', 'The specimen sheet, and the faces with their links and licence.', files(D.type))}
${group('Icons', `${D.icons.length} interface icons as SVG, and their licence.`, files([...D.icons, D.iconsLicence]))}
${group('Imagery', photos.length ? 'The photography direction, and the photos.' : 'The photography direction and shot list.', files([...pdfs, ...photos]))}
</ol>`;
  return sheet(ctx, 'downloads', n, `${ctx.cap(plural(n, 'file', 'files'))} in the kit, each one linked below.`, '', body);
}

export function brandBook(ctx) {
  if (!ctx.book) throw new Error('brandBook needs ctx.book (set by the engine book builder)');
  return [overview, voice, logo, colour, typography, imagery, layout, applications, downloads].map((f) => f(ctx)).join('\n');
}

// ---- the stylesheet. No hex is written here: every colour is the press's or the brand's roles. ----
export function bookCss(ctx) {
  const P = pressOf(ctx), L = ctx.roles.light, D = ctx.roles.dark, B = ctx.brand, d = B.fonts.display, b = B.fonts.body, m = B.fonts.mono;
  const mk = (u, n) => `-webkit-mask-image:url(${u});mask-image:url(${u});-webkit-mask-size:${n}px ${n}px;mask-size:${n}px ${n}px`;
  const passMask = P.passScreen ? mk(tile('screen-24.png'), 384) : mk(tile('ink-mottle.png'), 512);
  const full = `url(data:image/svg+xml;base64,${Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8"/></svg>').toString('base64')})`;
  const hole = (img, w, h) => `-webkit-mask-image:${img},${full};mask-image:${img},${full};-webkit-mask-position:left var(--x0) bottom var(--pad),0 0;mask-position:left var(--x0) bottom var(--pad),0 0;-webkit-mask-size:${w} ${h},100% 100%;mask-size:${w} ${h},100% 100%;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;-webkit-mask-composite:xor;mask-composite:exclude`;
  return `:root,.bk--board{--bench:${L.sunken};--paper:${P.paper};--key:${P.key};--plate:${P.plate};--pass:${P.pass};--passp:${P.passPlate || P.pass};--hit:${P.hit};--ptxt:${P.textOnPlate};--focus:${L.focus};
--pblend:multiply;--bblend:multiply;--hblend:multiply;--fibre:url(${tile('paper-fibre.png')});
--display:'${d.family}',serif;--body:'${b.family}',sans-serif;--bmono:'${(m || b).family}','${b.family}';--val:'Sono Mono','${b.family}';
--x0:48px;--pad:40px}
[data-theme="dark"]{--bench:${D.sunken};--paper:${D.surface};--key:${D.text};--pass:${D.text};--pblend:normal;--bblend:screen;--hblend:normal;--focus:${D.focus}}
body{background:var(--bench);color:var(--key);margin:0}
.bk{background:var(--bench);color:var(--key);font:400 15px/1.55 var(--body);-webkit-font-smoothing:antialiased;min-height:100vh}
.bk *{box-sizing:border-box}
.bk :where(h1,h2,h3,h4,p,ul,ol,dl,dd,figure){margin:0;padding:0}
.bk :where(ul,ol){list-style:none}
.bk :where(a){color:inherit}
.bk .v{font-family:var(--val);font-weight:400;font-size:.92em;font-variant-numeric:tabular-nums;letter-spacing:0}
.bk :focus-visible{outline:2px solid var(--focus);outline-offset:2px}
.rb-for-dark{display:none}[data-theme="dark"] .rb-for-dark{display:inline-block}[data-theme="dark"] .rb-for-light{display:none}
.bk-for-dark{display:none}[data-theme="dark"] .bk-for-dark{display:block}[data-theme="dark"] .bk-for-light{display:none}
.bk-skip{position:absolute;left:16px;top:-80px;z-index:30;background:var(--key);color:var(--paper);padding:12px 16px;font:600 14px/1 var(--body);text-decoration:none}
.bk-skip:focus{top:16px}
/* the slug line across the bench */
.bk-top{position:sticky;top:0;z-index:20;display:flex;align-items:center;gap:24px;padding:12px 32px;background:var(--bench);border-bottom:1px solid var(--key)}
.bk-brand{display:block;flex:none;text-decoration:none;width:128px}
.bk-brand svg{display:block;width:128px;height:auto}
.bk-name{font:600 18px/1.2 var(--body)}
.bk-menu{display:none}
.bk-nav{flex:1;min-width:0}
.bk-nav ol{display:flex;flex-wrap:wrap;gap:4px 18px;list-style:none;margin:0;padding:0}
.bk-nav a{display:flex;gap:6px;align-items:baseline;padding:8px 0;font:500 14px/1.2 var(--body);color:var(--key);text-decoration:none;border-bottom:2px solid transparent;transition:border-color 120ms ease-out}
.bk-nav .bk-n{font-family:var(--val);font-size:12px;font-variant-numeric:tabular-nums}
.bk-nav a[aria-current]{border-bottom-color:var(--key)}
@media (hover:hover){.bk-nav a:hover{border-bottom-color:var(--plate)}}
.bk-mode{display:inline-flex;flex:none;border:1px solid var(--key)}
.bk-mode button{appearance:none;border:0;background:transparent;color:var(--key);font:500 14px/1 var(--body);height:36px;padding:0 14px;cursor:pointer;transition:background-color 120ms ease-out,color 120ms ease-out}
.bk-mode button[aria-pressed="true"]{background:var(--key);color:var(--bench)}
.bk-mode button:focus-visible{outline-offset:-4px}
.bk main{display:block;padding:32px 32px 0}
.bk main:focus{outline:none}
.bk-foot{display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px 16px;max-width:1280px;margin:0 auto;padding:16px 0 48px;font:400 14px/1.4 var(--body);color:var(--key)}
.bk-live{position:fixed;left:50%;bottom:24px;z-index:40;padding:12px 20px;background:var(--key);color:var(--paper);font:500 14px/1.3 var(--body);visibility:hidden;transform:translate(-50%,12px);pointer-events:none;max-width:calc(100vw - 32px);transition:transform 150ms ease-in,visibility 0s linear 150ms}
.bk-live.is-on{visibility:visible;transform:translate(-50%,0);transition:transform 180ms cubic-bezier(.23,1,.32,1)}
.bk-live:empty{display:none}

/* ---- the sheet ---- */
.rb-sh{--pw:clamp(24px,12cqi - 20px,164px);container-type:inline-size;position:relative;isolation:isolate;overflow:hidden;max-width:1280px;margin:0 auto 32px;background:var(--paper);color:var(--key);scroll-margin-top:72px}
.rb-sh > *{--pw:clamp(24px,12cqi - 20px,164px);--rp:calc(var(--pw) + var(--x0))}
.rb-sh::before{content:'';position:absolute;inset:0;z-index:0;background:var(--fibre) var(--fx) var(--fy)/512px 512px;mix-blend-mode:multiply;pointer-events:none}
[data-theme="dark"] .rb-sh::before{display:none}
.rb-hd{position:relative}
.rb-plate{position:absolute;inset:0;z-index:1;mix-blend-mode:var(--pblend);${mk(tile('ink-mottle.png'), 512)};-webkit-mask-position:var(--mx) var(--my);mask-position:var(--mx) var(--my)}
.rb-plate i{position:absolute;inset:0;background:var(--plate);${hole('var(--holew)', 'var(--hw)', 'var(--hh)')}}
.rb-hit{position:absolute;z-index:2;left:calc(var(--x0) + var(--hdx));bottom:calc(var(--pad) - var(--hdy));mix-blend-mode:var(--hblend);pointer-events:none;${mk(tile('ink-mottle.png'), 512)};-webkit-mask-position:var(--my) var(--mx);mask-position:var(--my) var(--mx)}
.rb-hit svg{display:block;overflow:visible}
.rb-hit path{fill:var(--hit)}
.rb-hit--n{display:none}
.rb-pass{position:absolute;top:0;bottom:0;right:-8px;width:calc(var(--pw) + 8px);z-index:2;pointer-events:none;${passMask};-webkit-mask-position:var(--mx) var(--my);mask-position:var(--mx) var(--my)}
.rb-pass--hd{background:var(--passp);mix-blend-mode:multiply;clip-path:polygon(var(--pa) 0,100% 0,100% 100%,var(--pb) 100%)}
.rb-pass--bd{background:var(--pass);mix-blend-mode:var(--bblend);clip-path:polygon(var(--pb) 0,100% 0,100% 100%,var(--pc) 100%)}
.rb-hd__t{position:relative;z-index:3;display:grid;grid-template-columns:var(--hw) minmax(0,1fr);grid-template-areas:"sp t" "sp c";column-gap:40px;row-gap:24px;padding:var(--pad) var(--rp) var(--pad) var(--x0);min-height:calc(var(--hh) + 2 * var(--pad));color:var(--ptxt)}
.rb-hd__tt{grid-area:t}
.rb-hd__c{grid-area:c;align-self:end;max-width:34ch;font:400 15px/1.45 var(--body)}
.rb-h2{font:600 18px/1.25 var(--body);color:var(--ptxt)}
.rb-h1{font-size:clamp(40px,5.6cqi,80px);line-height:1.04;letter-spacing:-.01em;color:var(--ptxt);max-width:none;text-wrap:balance}
.rb-sent{display:block}
.rb-bd{position:relative}
.rb-in{position:relative;z-index:3;display:flex;flex-direction:column;gap:24px;padding:48px var(--rp) 56px var(--x0)}
.rb-in > .rb-h3{margin-top:24px}
.rb-ft{position:relative;z-index:3;display:flex;align-items:center;gap:12px;padding:0 var(--rp) 24px var(--x0);font:400 13px/1.3 var(--body)}
.rb-ft__f{margin-left:auto}
.rb-bar{display:flex;gap:2px}
.rb-sq{position:relative;display:block;width:10px;height:10px}
.rb-ov{isolation:isolate}
.rb-ov i{position:absolute;inset:0}
.rb-ov i + i{mix-blend-mode:multiply}
.rb-scr{${mk(tile('screen-24.png'), 384)}}

/* ---- type in the body ---- */
.rb-lead{font:400 20px/1.45 var(--body);max-width:40ch}
.rb-p{font:400 15px/1.55 var(--body);max-width:68ch}
.rb-h3{font:600 15px/1.3 var(--body);padding-top:12px;border-top:1px solid var(--key)}
.rb-do{font-weight:600}
.rb-meta{font:400 14px/1.4 var(--body)}
.rb-two{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr));gap:24px 40px}
.rb-two > div{display:flex;flex-direction:column;gap:16px}
.rb-rules{display:grid;gap:16px}
.rb-rules li{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:8px 40px;font:400 15px/1.55 var(--body)}
.rb-lg{line-height:0}
.rb-lg svg{display:block;max-width:100%;height:auto}

/* controls */
.rb-btn,.rb-val{appearance:none;display:inline-flex;align-items:center;min-height:36px;padding:0 12px;border:1px solid var(--key);background:transparent;color:var(--key);cursor:pointer;font:500 14px/1 var(--body);text-decoration:none;transition:background-color 120ms ease-out,color 120ms ease-out}
.rb-val{min-height:32px;padding:0 10px;font:400 13px/1 var(--val);font-variant-numeric:tabular-nums}
.rb-btn--prime{background:var(--key);color:var(--paper);min-height:44px;padding:0 20px;font-weight:600}
@media (hover:hover){.rb-btn:hover,.rb-val:hover{background:var(--key);color:var(--paper)}.rb-btn--prime:hover{background:transparent;color:var(--key)}}
.rb-btn:active,.rb-val:active{transform:scale(.97)}
.rb-dl{font:500 14px/1.3 var(--body);text-decoration:underline;text-underline-offset:3px;padding:6px 0}
@media (hover:hover){.rb-dl:hover{text-decoration-thickness:2px}}
.rb-dls{display:flex;flex-wrap:wrap;gap:4px 14px}

/* 1 overview */
.rb-intro{display:grid;grid-template-columns:auto minmax(0,1fr);gap:24px 48px;align-items:start}
.rb-intro__lg{display:block;width:220px}
.rb-pair{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:24px 40px}
.rb-pair > div{display:flex;flex-direction:column;gap:12px}
.rb-traits{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr));gap:24px 40px}
.rb-traits li{display:flex;flex-direction:column;gap:8px}
.rb-traits__n{font-size:13px}
.rb-trait{font-size:32px;line-height:1.1}

/* 2 voice */
.rb-say{display:grid;gap:24px}
.rb-say li{display:grid;grid-template-columns:200px minmax(0,1fr);gap:8px 40px;align-items:baseline;padding-bottom:24px;border-bottom:1px solid var(--key)}
.rb-say__k{font:600 15px/1.4 var(--body)}
.rb-say__x{font-size:32px;line-height:1.15;max-width:28ch}
.rb-wtn{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr));gap:24px 40px}
.rb-wtn li{display:flex;flex-direction:column;gap:6px}
.rb-wtn__w{font:600 17px/1.35 var(--body)}
.rb-wtn__n{font:400 15px/1.45 var(--body)}
.rb-take{display:flex;flex-direction:column;gap:16px;align-items:flex-start}
.rb-lines{display:grid;gap:8px}
.rb-lines li{font-size:28px;line-height:1.15}

/* 3 logo */
.rb-logohero{max-width:520px}
.rb-vers{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:32px 32px}
.rb-ver{display:flex;flex-direction:column;gap:8px}
.rb-ver__g{display:flex;align-items:center;justify-content:center;aspect-ratio:3/2;padding:16px;outline:1px solid var(--key);outline-offset:-1px}
.rb-ver__g svg{display:block;max-width:100%;height:auto}
.rb-ver__k{font:600 15px/1.3 var(--body)}
.rb-clear{max-width:420px}
.rb-clear__b{outline:1px dashed var(--key);outline-offset:-1px}
.rb-min{display:flex}
.rb-never{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:8px 40px;font:400 15px/1.5 var(--body)}

/* 4 colour */
.rb-share{display:flex;height:96px;gap:0;outline:1px solid var(--key);outline-offset:-1px}
.rb-cols{display:grid;gap:0}
.rb-col{display:grid;grid-template-columns:120px minmax(0,1fr);gap:24px;padding:24px 0;border-top:1px solid var(--key)}
.rb-col__sw{display:block;width:120px;height:120px;outline:1px solid var(--key);outline-offset:-1px}
.rb-col__t{display:flex;flex-direction:column;gap:12px}
.rb-col__n{font:600 18px/1.25 var(--body)}
.rb-vals{display:flex;flex-wrap:wrap;gap:12px 24px}
.rb-vals div{display:flex;align-items:center;gap:8px}
.rb-vals dt{font:600 12px/1 var(--body);letter-spacing:.04em}
.rb-pairs{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:24px 24px}
.rb-pc{display:flex;flex-direction:column;gap:8px}
.rb-pc__s{display:flex;align-items:flex-end;height:96px;padding:12px;font:400 24px/1 var(--val);outline:1px solid var(--key);outline-offset:-1px}

/* 5 typography */
.rb-faces{display:grid;gap:24px}
.rb-face{display:flex;flex-direction:column;gap:8px;padding-bottom:24px;border-bottom:1px solid var(--key)}
.rb-face__big{font-size:clamp(40px,7cqi,96px);line-height:1.05;overflow-wrap:anywhere}
.rb-face__k{font-weight:600}
.rb-tester{display:flex;flex-direction:column;gap:24px;padding:24px;outline:1px solid var(--key);outline-offset:-1px}
.rb-tester__out{font-size:var(--tester-size,56px);line-height:1.1;overflow-wrap:anywhere;min-height:1.1em}
.rb-tester__c{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:16px 32px}
.rb-field{display:flex;flex-direction:column;gap:8px;font:600 14px/1.3 var(--body)}
.rb-field label{display:flex;justify-content:space-between;gap:8px}
.rb-field input[type=text]{font:400 16px/1.4 var(--body);color:var(--key);background:var(--paper);border:1px solid var(--key);border-radius:0;padding:10px 12px;min-height:44px}
.rb-field input[type=range]{accent-color:var(--key);min-height:44px;width:100%}
.rb-scale{display:grid;gap:0}
.rb-scale li{display:grid;grid-template-columns:260px minmax(0,1fr);gap:12px 40px;padding:24px 0;border-top:1px solid var(--key)}
.rb-scale__k{display:flex;flex-direction:column;gap:6px}
.rb-scale__t{font:600 15px/1.3 var(--body)}
.rb-scale__s{font-size:var(--fs);overflow-wrap:anywhere;max-width:30em}

/* 6 imagery */
.rb-rows{display:grid;gap:0}
.rb-rows div{display:grid;grid-template-columns:160px minmax(0,1fr);gap:8px 40px;padding:12px 0;border-top:1px solid var(--key)}
.rb-rows dt{font:600 15px/1.5 var(--body)}
.rb-shots{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:32px 24px}
.rb-shot figure{display:flex;flex-direction:column;gap:8px}
.rb-photo{display:block;width:100%;aspect-ratio:3/2;object-fit:cover;background:var(--bench);outline:1px solid var(--key);outline-offset:-1px}

/* 7 layout */
.rb-gridw{display:grid;grid-template-columns:minmax(0,360px) minmax(0,1fr);gap:24px 48px;align-items:start}
.rb-grid{position:relative;width:100%;background:var(--paper);outline:1px solid var(--key);outline-offset:-1px}
.rb-grid__c{display:grid;height:100%}
.rb-grid__c i{display:block;background:var(--plate);mix-blend-mode:var(--pblend)}
.rb-meas{display:grid;gap:0;margin-bottom:16px}
.rb-meas div{display:flex;justify-content:space-between;gap:16px;padding:10px 0;border-top:1px solid var(--key);font:400 15px/1.4 var(--body)}
.rb-meas dt{font-weight:600}
.rb-space{display:flex;flex-wrap:wrap;align-items:flex-end;gap:16px}
.rb-space li{display:flex;flex-direction:column;align-items:flex-start;gap:6px;font-size:13px}
.rb-space i{display:block;background:var(--plate)}
.rb-radii{display:grid;gap:12px}
.rb-radii li{display:flex;align-items:center;gap:16px}
.rb-radii i{display:block;width:48px;height:48px;border:1px solid var(--key);flex:none}

/* 8 applications */
.rb-mocks{display:grid;grid-template-columns:3fr 2fr;gap:24px}
.rb-mock img,.rb-mock svg.pl{display:block;width:100%;height:100%;aspect-ratio:3/2}
.rb-mock + .rb-mock img,.rb-mock + .rb-mock svg.pl{aspect-ratio:auto;height:100%}
.rb-cards{display:flex;flex-direction:column;gap:16px}
.rb-card{position:relative;width:100%;max-width:420px;aspect-ratio:90/55;padding:16px;display:flex;flex-direction:column;justify-content:flex-end;gap:2px;font:400 13px/1.35 var(--body);outline:1px solid var(--key);outline-offset:-1px}
.rb-card--b{background:var(--paper);color:var(--key)}
.rb-card__lg{display:block;width:150px}
.rb-card__lg svg{display:block;width:100%;height:auto}
.rb-card__nm{font-weight:600;font-size:15px}
.rb-card__ct{margin-top:6px}
.rb-posts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.rb-post{position:relative;aspect-ratio:1;padding:14px;display:flex;flex-direction:column;justify-content:space-between;outline:1px solid var(--key);outline-offset:-1px}
.rb-post p{font-size:22px;line-height:1.1}
.rb-post__lg{display:block;width:40px}
.rb-post__lg svg{display:block;width:100%;height:auto}
.rb-email{display:flex;flex-direction:column;gap:4px;padding:20px;outline:1px solid var(--key);outline-offset:-1px;font:400 14px/1.45 var(--body)}
.rb-email__n{font-weight:600;font-size:16px}
.rb-email__l{margin-top:12px;width:160px}
.rb-device{max-width:380px;padding:10px;border:1px solid var(--key)}
.rb-screen{padding:16px;display:flex;flex-direction:column;gap:12px}
.rb-scr__top{display:flex;justify-content:space-between;align-items:center}
.rb-scr__eta{margin:0}
.rb-scr__note{margin:0}

/* 9 downloads */
.rb-zip{display:flex;flex-direction:column;gap:16px;align-items:flex-start}
.rb-zip__n{font-size:clamp(36px,5cqi,64px);line-height:1.05}
.rb-zip__a{display:flex;flex-wrap:wrap;align-items:center;gap:12px 20px}
.rb-groups{display:grid;gap:0}
.rb-group{display:grid;grid-template-columns:280px minmax(0,1fr);gap:16px 40px;padding:24px 0}
.rb-group .rb-h3{border:0;padding:0;margin-bottom:6px}
.rb-group{border-top:1px solid var(--key)}
.rb-files{display:grid;gap:0}
.rb-file{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:4px 20px;align-items:center;padding:6px 0;font:400 15px/1.4 var(--body)}
.rb-file__n{overflow-wrap:anywhere}

/* the one moment: on the first sheet the pass drops in and the hit lands after it */
@keyframes rb-feed{from{transform:translateY(-16px)}}
@keyframes rb-land{from{opacity:0}}
.rb-sh--overview .rb-pass{animation:rb-feed 640ms cubic-bezier(.23,1,.32,1) both}
.rb-sh--overview .rb-hit{animation:rb-land 300ms ease-out 760ms both}
@media (prefers-reduced-motion:reduce){.rb-sh--overview .rb-pass,.rb-sh--overview .rb-hit{animation:none}}

@media (max-width:1279px){
.bk-top{flex-wrap:wrap;padding:10px 16px;gap:12px}
.bk-menu{display:inline-flex;margin-left:auto;appearance:none;align-items:center;height:44px;padding:0 14px;border:1px solid var(--key);border-radius:0;background:transparent;color:var(--key);font:500 14px/1 var(--body);cursor:pointer}
.bk-menu[aria-expanded="true"]{background:var(--key);color:var(--bench)}
.bk-nav{display:none;order:3;flex-basis:100%}
.bk-top[data-open="true"] .bk-nav{display:block}
.bk-nav ol{flex-direction:column;gap:0}
.bk-nav a{padding:12px 0;font-size:15px}
.bk-mode button{height:44px}
}
@media (max-width:840px){
.rb-sh,.rb-sh > *{--x0:16px;--pad:24px}
.bk main{padding:12px 0 0}
.rb-sh{margin-bottom:12px}
.bk-foot{padding:16px 16px 40px}
.rb-plate i{${hole('var(--holen)', 'var(--hn-w)', 'var(--hn-h)')}}
.rb-hit--w{display:none}
.rb-hit--n{display:block}
.rb-hd__t{grid-template-columns:var(--hn-w) minmax(0,1fr);grid-template-areas:"t t" "sp c";grid-template-rows:auto minmax(var(--hn-h),auto);column-gap:16px;min-height:0}
.rb-hd__c{font-size:14px}
.rb-in{padding-top:32px;padding-bottom:40px;gap:20px}
.rb-lead{font-size:18px}
.rb-intro{grid-template-columns:1fr}
.rb-intro__lg{width:160px}
.rb-say li,.rb-scale li,.rb-rows div,.rb-group{grid-template-columns:1fr}
.rb-say__x{font-size:26px}
.rb-trait{font-size:28px}
.rb-col{grid-template-columns:64px minmax(0,1fr);gap:16px}
.rb-col__sw{width:64px;height:64px}
.rb-scale__s{font-size:min(var(--fs),40px)}
.rb-gridw,.rb-mocks{grid-template-columns:1fr}
.rb-posts{grid-template-columns:1fr 1fr}
.rb-card{width:100%;max-width:270px}
.rb-file{grid-template-columns:minmax(0,1fr) auto}
.rb-file .v{grid-column:1}
.rb-tester{padding:16px}
}
`;
}
