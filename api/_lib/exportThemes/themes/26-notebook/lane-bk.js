// Theme 26, Notebook, lane bk: the brand book. The notebook laid open on a desk, one open spread after another: dot-grid leaves on a 24 px
// unit, the fold and its thread down the middle, each section's name on a tab of the brand's own tape stepping across the top edge, and
// the brand stuck in on prints and cut cards. The stylesheet is in lane-bk-css.js.
import { plateImg } from '../../engine/plate.js';
import { BOOK_SECTIONS } from '../../engine/book.js';
import { A, advance, CHROME_STEMS, sceneCrop, nearPaper, signSpec, photoAt } from './helpers.js';
import { artKit } from './art.js';
import { bookCss } from './lane-bk-css.js';

export { bookCss };

const pad = (n) => String(n).padStart(3, '0');
const P = (text, cls = '') => `<p class="nb-p${cls ? ' ' + cls : ''}"><span class="nb-k">${A(text)}</span></p>`;
const h3 = (text, cls = '') => `<h3 class="nb-h3${cls ? ' ' + cls : ''}"><span class="nb-k">${A(text)}</span></h3>`;
// a tab of tape carrying a label: as wide as the label plus 24 px, rounded up to the unit
const tapeW = (text) => Math.ceil((advance(CHROME_STEMS[600], 13, text) + 24) / 24) * 24;
const tag = (text, el = 'span', cls = '') => `<${el} class="nb-tag${cls ? ' ' + cls : ''}" style="--tw:${tapeW(text)}px">${A(text)}</${el}>`;
const copyBtn = (text, value, what) => `<button type="button" class="bk-btn nb-copy" data-copy="${A(value)}" data-copy-label="${A(what)}" aria-label="${A(text + ', ' + what)}" style="--tw:${tapeW(text)}px"><span class="bk-btn__t">${A(text)}</span></button>`;
const valBtn = (kind, value, name) => `<button type="button" class="bk-btn nb-val" data-copy="${A(value)}" data-copy-label="${A(name + ' ' + kind)}" aria-label="Copy ${A(kind)} ${A(value)}, ${A(name)}"><span class="bk-btn__t">${A(value)}</span></button>`;
const dl = (f, what, text = '') => (f ? `<a class="nb-dl" href="${A(f.href)}" download aria-label="Download ${A(what)}, ${A(f.ext)}, ${A(f.sizeText)}">${A(text || f.ext)}</a>` : '');
// the brand's sign shown in place: a poster in a bus shelter for a brand whose sign is a poster, else the sign on a ute door
function signMock(ctx, kit) {
  const B = ctx.brand, ss = signSpec(ctx);
  if (ss.poster) return mock(ctx, ss.vehicle, [kit.sign(593, 876, ss.line)], [480, 360], 0.5, 'w', `${B.name} poster in a bus shelter: ${ss.line}`, B.applications.signage);
  return mock(ctx, 'kerb-ute-kerbside', [kit.sign(1280, 800)], [480, 360], 0.42, 'w', `${B.name} on a ute door: ${B.lines.primary}`, B.applications.signage);
}
// a print of the brand photographed in place: the scene cropped to a bw x bh box (as percentages, so it stays fluid), held by a piece of tape
function mock(ctx, sid, arts, [bw, bh], frac, by, alt, cap) {
  const sc = ctx.sceneInfo(sid), url = ctx.mockup(sid, arts), c = sceneCrop(sc, bw, bh, frac, by);
  const pc = (v, of) => (v / of * 100).toFixed(3);
  return `<figure class="nb-print"><div class="nb-print__f" style="aspect-ratio:${bw}/${bh}"><div class="nb-print__i">${plateImg(A(url), A(alt), `width:${pc(c.iw, bw)}%;left:${pc(c.left, bw)}%;top:${pc(c.top, bh)}%`, 'nb-mock')}</div><span class="nb-piece" aria-hidden="true"></span></div><figcaption><span class="nb-k">${A(cap)}</span></figcaption></figure>`;
}
const rgbOf = (ctx, hex) => { const [r, g, b] = ctx.C.hexToRgb(hex); return `rgb(${r}, ${g}, ${b})`; };

// one open spread: running heads, rows of verso and recto cells (a phone reads v1, r1, v2, r2), folios; an endpaper takes a whole leaf
function spread(st, sec, { rows = [], end = null, tab = '', cls = '', bare = false }) {
  const f1 = pad(++st.folio), f2 = pad(++st.folio);
  const endV = end && end.side !== 'r', endR = end && end.side === 'r', n = rows.length + 2;
  let h = tab;
  if (!endV) h += `<div class="nb-v nb-hd">${A(st.name)} brand book</div>`;
  if (!endR) h += `<div class="nb-r nb-hd">${bare ? '' : A(sec.title)}</div>`;
  if (end) h += `<div class="nb-end ${endV ? 'nb-v' : 'nb-r'}" style="--span:${n};--eg:${end.ground};--ei:${end.ink}">${end.html}</div>`;
  for (const [v, r] of rows) {
    if (!endV) h += `<div class="nb-v${v ? '' : ' nb-empty'}">${v || ''}</div>`;
    if (!endR) h += `<div class="nb-r${r ? '' : ' nb-empty'}">${r || ''}</div>`;
  }
  if (!endV) h += `<div class="nb-v nb-ft"><span class="nb-fo">${f1}</span></div>`;
  if (!endR) h += `<div class="nb-r nb-ft">${bare ? '' : `<span class="nb-fo">${f2}</span>`}</div>`;
  return `<div class="nb-spread${cls ? ' ' + cls : ''}">${thread()}${h}</div>`;
}
const thread = () => `<svg class="nb-thread" aria-hidden="true" focusable="false"><line x1="2" y1="0" x2="2" y2="100%"/><circle cx="2" cy="0" r="2"/><circle cx="2" cy="50%" r="2"/><circle cx="2" cy="100%" r="2"/></svg>`;
function secTab(sec, i, el = 'h2') {
  const label = `${i + 1} ${sec.title}`;
  return `<${el} class="nb-tab"${el === 'h2' ? ` id="h-${sec.id}"` : ''} style="--i:${i};--tw:${tapeW(label)}px">${A(label)}</${el}>`;
}
const section = (sec, inner) => `<section class="bk-sec nb-sec" id="${sec.id}" aria-labelledby="h-${sec.id}">${inner}</section>`;

// the reversed colourway (light name on a dark ground) for the endpapers
function reversed(ctx) {
  const cws = ctx.brand.logo.colourways, lum = (h) => ctx.C.luminance(h);
  const key = cws.reversed ? 'reversed' : Object.keys(cws).sort((a, b) => lum(cws[a].ground) - lum(cws[b].ground))[0];
  return { key, ...cws[key] };
}
const logoHtml = (ctx, id, key, w, label) => {
  const cw = ctx.brand.logo.colourways[key];
  return `<span class="nb-logo" style="width:${w}px">${ctx.logo.html(id, { width: w, colourway: key, color: cw.name, label })}</span>`;
};

// ---- 1 Overview ----
function overview(ctx, st, sec, i) {
  const B = ctx.brand, R = reversed(ctx);
  const front = `<p class="nb-end__t">Brand book</p><p class="nb-end__v">Version ${A(B.version.number)}, ${A(B.version.date)}</p>
<div class="nb-end__logo">${logoHtml(ctx, 'colour', R.key, 192, `${B.name} logo`)}</div>`;
  const recto = `<h1 class="nb-hero disp" id="h-overview">${A(B.lines.primary)}</h1>${P(B.product, 'nb-line')}${P(B.description)}
<p class="nb-strip">If found, return to ${A(B.contact.email)}</p>`;
  const a = spread(st, sec, { tab: secTab(sec, i, 'p'), end: { side: 'v', ground: R.ground, ink: R.name, html: front }, rows: [[null, recto]] });
  const traits = `<dl class="nb-traits">${B.personality.map((p) => `<div><dt>${tag(p.trait)}</dt><dd>${P(p.means)}</dd></div>`).join('')}</dl>`;
  const ute = signMock(ctx, artKit(ctx));
  const b = spread(st, sec, { rows: [[ute, `${tag('Who it serves', 'h3')}${P(B.audience, 'nb-lead')}${tag('How it behaves', 'h3')}${traits}`]] });
  return section(sec, a + b);
}

// ---- 2 Voice ----
function voice(ctx, st, sec, i) {
  const V = ctx.brand.voice, [first, ...rest] = V.principles;
  const v1 = `${tag(first.title, 'h3')}<p class="nb-big disp"><span class="nb-k">${A(first.example)}</span></p>`;
  const r1 = `<ul class="nb-list">${rest.map((p) => `<li>${tag(p.title, 'h3')}<p class="nb-title disp"><span class="nb-k">${A(p.example)}</span></p></li>`).join('')}</ul>`;
  const a = spread(st, sec, { tab: secTab(sec, i), rows: [[v1, r1]] });
  const rows = [[h3('Write this'), h3('Not that')], ...V.writeThis.map((w) => [
    `<p class="nb-write">${A(w.write)}</p>`,
    `<p class="nb-not"><s>${A(w.not)}</s></p>${P(w.because, 'nb-note')}`,
  ])];
  const b = spread(st, sec, { rows });
  const lines = [ctx.brand.lines.primary, ...(ctx.brand.lines.others || [])];
  const c = spread(st, sec, { rows: [
    [`${h3('Boilerplate, 25 words')}${P(V.boilerplate25)}${copyBtn('Copy text', V.boilerplate25, '25 word boilerplate')}`,
      `${h3('Boilerplate, 50 words')}${P(V.boilerplate50)}${copyBtn('Copy text', V.boilerplate50, '50 word boilerplate')}`],
    [`${h3('Lines in use')}<ul class="nb-list">${lines.map((l) => `<li class="nb-title disp"><span class="nb-k">${A(l)}</span></li>`).join('')}</ul>`,
      `${h3('Writing the name')}${P(V.nameRules)}`],
  ] });
  return section(sec, a + b + c);
}

// ---- 3 Logo ----
function logo(ctx, st, sec, i) {
  const B = ctx.brand, L = ctx.logo, D = ctx.book, cws = B.logo.colourways, slot = ctx.edition === 'slot';
  const R = reversed(ctx);
  const zone = `<div class="nb-zone"><span class="nb-for-light">${logoHtml(ctx, 'colour', cws.colour ? 'colour' : Object.keys(cws)[0], 288, `${B.name} logo`)}</span><span class="nb-for-dark">${logoHtml(ctx, 'colour', R.key, 288, `${B.name} logo, reversed`)}</span></div>${P(B.logo.idea)}`;
  const card = (id) => {
    const key = cws[id] ? id : (cws.colour ? 'colour' : Object.keys(cws)[0]), cw = cws[key], f = slot ? null : D.logo(id);
    const files = f ? `<p class="nb-files">${dl(f.svg, L.labels[id] + ' logo')}${dl(f.pdf, L.labels[id] + ' logo')}${f.png.map((p) => dl(p, `${L.labels[id]} logo, PNG ${p.w} px wide`, `PNG ${p.w}`)).join('')}</p>` : '';
    return `<li class="nb-ver">${tag(L.labels[id], 'h3')}<div class="nb-cut" style="background:${cw.ground}">${logoHtml(ctx, id, key, id === 'symbol' ? 72 : 168, `${B.name} logo, ${L.labels[id]}`)}</div>${P(B.logo.when[id] || '', 'nb-note')}${files}</li>`;
  };
  const a = spread(st, sec, { tab: secTab(sec, i), rows: [[zone, `<ul class="nb-vers">${L.versions.map(card).join('')}</ul>`]] });
  const S = B.logo.showcase;
  const b = spread(st, sec, { rows: [[
    `${h3('Clear space')}${P(`Keep clear space around the logo on every side. Nothing else enters it: type, edges or other marks.`)}`,
    `${h3('Smallest size')}${P(`${S.minScreenPx} px wide on screen, ${S.minPrintMm} mm wide in print. Below that, use the symbol.`)}`,
  ]] });
  return section(sec, a + b);
}

// ---- 4 Colour ----
function colour(ctx, st, sec, i) {
  const B = ctx.brand, cols = ctx.colours;
  const rows = `<ul class="nb-crows">${cols.map((c) => `<li><span class="nb-sw" style="background:${c.hex}" aria-hidden="true"></span><span class="nb-crows__n">${A(c.name)}</span><span class="m">${Math.round(c.share * 100)}%</span>${P(c.lands, 'nb-note')}</li>`).join('')}</ul>`;
  const lengths = `<ul class="nb-lengths">${cols.map((c) => {
    const ink = ctx.ratio('#ffffff', c.hex) >= ctx.ratio(B.colours.find((x) => x.role === 'text')?.hex || '#16181d', c.hex) ? '#ffffff' : (B.colours.find((x) => x.role === 'text')?.hex || '#16181d');
    return `<li${nearPaper(ctx, c.hex) ? ' class="is-edge"' : ''} style="--c:${c.hex};--ci:${ink};--sh:${Math.max(0.12, c.share)}"><span class="nb-lengths__n">${A(c.name)}</span>${valBtn('HEX', c.hex, c.name)}<span class="m">${rgbOf(ctx, c.hex)}</span></li>`;
  }).join('')}</ul>`;
  const lead = P(`${B.name} by share: each length of tape is as long as that colour's share of a page. Press a value to copy it.`, 'nb-lead');
  const a = spread(st, sec, { tab: secTab(sec, i), rows: [[`${lead}${rows}`, lengths]] });
  const vals = (c) => `<dl class="nb-vals"><div><dt>HEX</dt><dd>${valBtn('HEX', c.hex, c.name)}</dd></div><div><dt>RGB</dt><dd>${valBtn('RGB', rgbOf(ctx, c.hex), c.name)}</dd></div><div><dt>OKLCH</dt><dd>${valBtn('OKLCH', c.oklch || ctx.C.oklchString(c.hex), c.name)}</dd></div>${ctx.C.cmykOf(c) ? `<div><dt>CMYK</dt><dd>${valBtn('CMYK', ctx.C.cmykOf(c), c.name)}</dd></div>` : ''}</dl>`;
  const ramp = (c) => (c.ramp ? `<ol class="nb-ramp" aria-label="${A(c.name)} ramp, lightest to darkest">${Object.entries(c.ramp).map(([k, hx]) => `<li><button type="button" class="nb-step" style="background:${hx}" data-copy="${hx}" data-copy-label="${A(c.name)} ${k} HEX ${hx}" aria-label="Copy HEX ${hx}, ${A(c.name)} ${k}"></button></li>`).join('')}</ol>` : '');
  const values = `${h3('Values')}<ul class="nb-cvals">${cols.map((c) => `<li>${tag(c.name, 'h4')}${vals(c)}${ramp(c)}</li>`).join('')}</ul>`;
  const pairs = `${h3('Contrast, pair by pair')}${P('Text needs 4.5:1. Type at 24 px and over needs 3:1.', 'nb-note')}<ul class="nb-pairs">${ctx.pairs.map((p) => `<li><div class="nb-pair" style="background:${p.bgHex};color:${p.fgHex}"><span class="nb-pair__r disp">${A(p.ratioText)}</span></div>${P(p.use + (p.large ? ', 24 px and over only' : ''), 'nb-note')}</li>`).join('')}</ul>`;
  const roleKeys = [['surface', 'Surface'], ['text', 'Text'], ['quiet', 'Quiet text'], ['border', 'Border'], ['action', 'Action'], ['actionLabel', 'Action label'], ['focus', 'Focus']];
  const roles = (mode, title) => `${tag(title, 'h4')}<ul class="nb-roles">${roleKeys.filter(([k]) => ctx.roles[mode][k]).map(([k, n]) => `<li><span class="nb-sw" style="background:${ctx.roles[mode][k]}" aria-hidden="true"></span><span>${A(n)}</span>${valBtn('HEX', ctx.roles[mode][k], `${mode} ${n}`)}</li>`).join('')}</ul>`;
  const b = spread(st, sec, { rows: [[values, `${pairs}${h3('Interface roles')}${roles('light', 'Light')}${roles('dark', 'Dark')}`]] });
  return section(sec, a + b);
}

// ---- 5 Typography ----
function typography(ctx, st, sec, i) {
  const B = ctx.brand, F = B.fonts, T = B.type, W = ctx.weights;
  const fam = (f) => `${A(f.family)}`;
  const v1 = `<p class="nb-aa disp" aria-hidden="true">Aa</p>${h3(F.display.family)}${P(`Display, for lines and titles. Weights ${F.display.weights.join(', ')}.`)}`;
  const r1 = `${h3(F.body.family)}<ul class="nb-weights">${F.body.weights.map((w) => `<li style="font-weight:${w}">${A(F.body.family)} ${w}</li>`).join('')}</ul>${F.mono ? `${h3(F.mono.family)}<p class="nb-monos">${A(ctx.roles.light.action)}</p>` : ''}`;
  const a = spread(st, sec, { tab: secTab(sec, i), rows: [[v1, r1]] });
  const tester = `<div class="nb-tester" data-tester><p class="nb-tester__out disp" data-tester-out aria-hidden="true">${A(T.sample.headline)}</p>
<div class="nb-field"><label for="tester-text">Your line</label><input id="tester-text" type="text" value="${A(T.sample.headline)}" data-tester-text data-default="${A(T.sample.headline)}" autocomplete="off" spellcheck="false"></div>
<div class="nb-field"><label for="tester-size">Size <output for="tester-size" data-tester-value class="m">48 px</output></label><input id="tester-size" type="range" min="16" max="144" step="1" value="48" data-tester-size></div></div>`;
  const face = (f) => (f === 'display' ? 'var(--display)' : f === 'mono' ? 'var(--mono)' : 'var(--body)');
  const scale = `<ol class="nb-scale">${T.scale.map((s) => `<li><span class="m">${A(s.token)} ${s.size}/${Math.round(s.size * s.line)}</span><span class="nb-scale__s" style="font-family:${face(s.face)};font-weight:${s.weight};font-size:min(${s.size}px, ${(s.size / 4.8).toFixed(2)}cqw);line-height:${s.line}">${A(s.use)}</span></li>`).join('')}</ol>`;
  const rules = `<ul class="nb-rules">${T.rules.map((r) => `<li>${P(r.do)}<p class="nb-not"><s>${A(r.dont)}</s></p></li>`).join('')}</ul>`;
  const b = spread(st, sec, { rows: [[`${h3('Try a line')}${tester}`, `${h3('The scale')}${scale}`], [null, `${h3('Rules')}${rules}`]] });
  void W; void fam;
  return section(sec, a + b);
}

// ---- 6 Imagery ----
function imagery(ctx, st, sec, i) {
  const I = ctx.brand.imagery, D = I.direction, shots = I.shots || [];
  const first = shots[0];
  const print = (s, cls = '') => `<figure class="nb-print${cls ? ' ' + cls : ''}"><div class="nb-print__f"><div class="nb-print__i">${photoAt(ctx, s.id, { cls: 'nb-photo' })}</div><span class="nb-piece" aria-hidden="true"></span></div>${s.caption ? `<figcaption><span class="nb-k">${A(s.caption)}</span></figcaption>` : ''}</figure>`;
  const r1 = `${P(D.subject, 'nb-lead')}<dl class="nb-dir">${[['Light', D.light], ['Crop', D.crop], ['Colour', D.colour], ['People', D.people]].map(([k, v]) => `<div><dt>${tag(k)}</dt><dd>${P(v)}</dd></div>`).join('')}</dl>`;
  const a = spread(st, sec, { tab: secTab(sec, i), rows: [[first ? print(first, 'nb-print--big') : '', r1]] });
  const rest = shots.slice(1), half = Math.ceil(rest.length / 2);
  const grid = (list) => `<div class="nb-prints">${list.map((s) => print(s)).join('')}</div>`;
  const rules = `<ul class="nb-rules">${I.rules.map((r) => `<li>${P(r.do)}<p class="nb-not"><s>${A(r.dont)}</s></p></li>`).join('')}</ul>`;
  const b = spread(st, sec, { rows: [[`${h3('The shot list')}${grid(rest.slice(0, half))}`, grid(rest.slice(half))], [null, `${h3('Rules')}${rules}`]] });
  return section(sec, a + b);
}

// ---- 7 Layout ----
function layout(ctx, st, sec, i) {
  const G = ctx.gridMeasures, B = ctx.brand;
  const cols = Array.from({ length: G.columns }, () => '<i></i>').join('');
  const cws = B.logo.colourways, ground = (cws.colour || Object.values(cws)[0]).ground;
  const page = `<div class="nb-page" style="background:${ground};aspect-ratio:${G.page.w}/${G.page.h};--m:${(G.margin / G.page.w * 100).toFixed(3)}%;--g:${(G.gutter / G.page.w * 100).toFixed(3)}%;--n:${G.columns}" role="img" aria-label="A ${G.page.w} by ${G.page.h} page with ${G.columns} columns"><div class="nb-page__c">${cols}</div></div>`;
  const v = `<p class="nb-hero disp">${G.columns} columns</p>${page}`;
  const meas = `<dl class="nb-meas">${[['Page', `${G.page.w} x ${G.page.h}`], ['Margin', `${G.margin} px`], ['Gutter', `${G.gutter} px`], ['Base', `${G.base} px`]].map(([k, x]) => `<div><dt>${A(k)}</dt><dd class="m">${A(x)}</dd></div>`).join('')}</dl>`;
  const space = `<ol class="nb-space">${ctx.space.map((s) => `<li><i style="width:${s.px}px" aria-hidden="true"></i><span class="m">${A(s.token)} ${s.px}</span></li>`).join('')}</ol>`;
  const radii = `<ul class="nb-radii">${ctx.radii.filter((r) => r.px < 9999).map((r) => `<li><i style="border-radius:${r.px}px" aria-hidden="true"></i><span class="m">${r.px} px</span>${P(r.use || r.token, 'nb-note')}</li>`).join('')}</ul>`;
  const r = `${h3('Measures')}${meas}${h3('Spacing')}${space}${h3('Corners')}${radii}${h3('Edges')}${P(`${B.ui.border} px borders. ${B.ui.elevationNote}`)}`;
  return section(sec, spread(st, sec, { tab: secTab(sec, i), rows: [[v, r]] }));
}

// ---- 8 Applications ----
function applications(ctx, st, sec, i) {
  const B = ctx.brand, Ap = B.applications, cws = B.logo.colourways, R = reversed(ctx);
  const ck = cws.colour ? 'colour' : Object.keys(cws)[0];
  const front = `<div class="nb-card" style="background:${cws[ck].ground};color:${cws[ck].name}">${logoHtml(ctx, 'colour', ck, 144, `${B.name} logo`)}<p class="nb-card__p"><span class="nb-card__n">${A(Ap.card.person)}</span><span>${A(Ap.card.role)}</span><span>${A(Ap.card.contact)}</span></p></div>`;
  const back = `<div class="nb-card nb-card--back" style="background:${R.ground};color:${R.name}">${logoHtml(ctx, 'colour', R.key, 168, `${B.name} logo, reversed`)}</div>`;
  const social = `<ul class="nb-social">${Ap.social.map((s) => `<li style="background:${R.ground};color:${R.name}"><p class="disp">${A(s)}</p></li>`).join('')}</ul>`;
  const email = `<div class="nb-sig" style="background:${cws[ck].ground};color:${cws[ck].name}"><p class="nb-sig__n">${A(Ap.email.person)}</p><p>${A(Ap.email.role)}</p><p>${A(Ap.site.url)}</p>${logoHtml(ctx, 'colour', ck, 120, `${B.name} logo`)}</div>`;
  const K = artKit(ctx);
  const till = mock(ctx, 'counter-till-cards', [K.cardFront(340, 208), K.cardBack(340, 208)], [480, 360], 0.8, 'w', `${B.name} business cards on a shop counter`, `Business cards, 85 x 55 mm, front and back`);
  const hoard = mock(ctx, 'kerb-hoarding-footpath', [K.sign(1360, 400)], [480, 320], 0.86, 'w', `${B.name} on a site hoarding: ${B.lines.primary}`, 'Site hoarding beside the footpath');
  const clip = mock(ctx, 'bench-clipboard-toolbox', [K.clipboard(840, 1000)], [400, 500], 0.8, 'w', `An ${B.name} sheet on a clipboard on a toolbox`, 'A4 sheet on the clipboard');
  // a brand whose sign is a poster shows the poster in the shelter with the line the spec names (as the print book does), not a hoarding
  const poster = signSpec(ctx).poster;
  const a = spread(st, sec, { tab: secTab(sec, i), rows: [
    [till, poster ? clip : hoard],
    [`${h3('Business card')}<div class="nb-cards">${front}${back}</div>`, `${h3('Social posts')}${social}`],
  ] });
  const b = spread(st, sec, { rows: [[poster ? signMock(ctx, K) : clip, `${h3('Email signature')}${email}${h3('Signage')}${P(Ap.signage)}`]] });
  return section(sec, a + b);
}

// ---- 9 Downloads ----
function downloads(ctx, st, sec, i) {
  const B = ctx.brand, D = ctx.book, L = ctx.logo, slot = ctx.edition === 'slot', R = reversed(ctx);
  const file = (f) => `<li class="nb-file"><span class="nb-file__n">${A(f.name)}</span><span class="m">${A(f.ext)}, ${A(f.sizeText)}</span><a class="nb-dl" href="${A(f.href)}" download aria-label="Download ${A(f.name)}">Download</a></li>`;
  const files = (list) => `<ul class="nb-files-l">${list.filter(Boolean).map(file).join('')}</ul>`;
  const group = (title, inner) => (/<li/.test(inner) ? `<div class="nb-group">${tag(title, 'h3')}${inner}</div>` : '');
  const logoRows = slot ? files(D.logoFiles) : `<ul class="nb-files-l">${L.versions.map((id) => { const f = D.logo(id); return `<li class="nb-file"><span class="nb-file__n">${A(L.labels[id])}</span><span class="nb-files">${dl(f.svg, L.labels[id] + ' logo')}${dl(f.pdf, L.labels[id] + ' logo')}${f.png.map((p) => dl(p, `${L.labels[id]} logo, PNG ${p.w} px wide`, `PNG ${p.w}`)).join('')}</span></li>`; }).join('')}</ul>`;
  const photos = D.imagery.filter((f) => f.rel && f.rel.startsWith('05 Imagery/photos/')), pdfs = D.imagery.filter((f) => f.ext === 'PDF');
  const icons = `<ul class="nb-icons">${D.icons.map((f) => `<li><a class="nb-icon" href="${A(f.href)}" download aria-label="Download ${A(f.name)} icon, SVG">${ctx.ui.icon(f.name.replace('.svg', ''), 24)}</a></li>`).join('')}</ul>${files([D.iconsLicence])}`;
  const v = `<p class="nb-hero disp">${A(B.name)} brand kit</p>${P('Logo, colour, type, icons and imagery in one zip, ready for print and screen.', 'nb-lead')}
<p class="nb-zip"><a class="bk-btn nb-kit" href="${A(D.zip.href)}" download aria-label="Download ${A(D.zip.name)}, ${A(D.zip.sizeText)}"><span class="bk-btn__t">Download the kit</span></a><span class="m">${A(D.zip.name)}, ${A(D.zip.sizeText)}</span></p>
${group('Read me', files([D.readmePdf, D.readme]))}${group('Colour', files(D.colour))}${group('Type', files(D.type))}${group('Icons', icons)}`;
  const r = `${group('Logo files', logoRows)}${group('Imagery', files([...pdfs, ...photos]))}`;
  const a = spread(st, sec, { tab: secTab(sec, i), rows: [[v, r]] });
  const ask = `${h3('Who to ask')}${P(`${B.contact.owner} looks after the ${B.name} brand. Ask before you change the logo, the colours or the type.`)}<p class="nb-strip">${A(B.contact.email)}</p>${P(`Version ${B.version.number}, ${B.version.date}`, 'nb-note')}`;
  const back = `<div class="nb-end__logo">${logoHtml(ctx, 'symbol', R.key, 72, `${B.name} symbol`)}</div>`;
  const b = spread(st, sec, { end: { side: 'r', ground: R.ground, ink: R.name, html: back }, rows: [[ask, null]] });
  return section(sec, a + b);
}

const PARTS = { overview, voice, logo, colour, typography, imagery, layout, applications, downloads };
export function brandBook(ctx) {
  if (!ctx.book) throw new Error('brandBook needs ctx.book (set by the engine book builder)');
  const st = { folio: 0, name: ctx.brand.name };
  return BOOK_SECTIONS.map((s, i) => PARTS[s.id](ctx, st, s, i)).join('\n');
}
