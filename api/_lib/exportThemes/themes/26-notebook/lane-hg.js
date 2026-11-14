// Theme 26, Notebook, lane hg: the guide site. The guidelines as the notebook laid open on a desk: a spread a page, dot-grid leaves, the fold and its
// thread, the section on a strip of the brand's own tape across the top edge, the brand stuck in as prints and cut cards. Every class is hg-.
import { plateImg } from '../../engine/plate.js';
import { A, nearPaper } from './helpers.js';
import { artKit } from './art.js';
import { guideCss } from './lane-hg-css.js';
import { P, H3, tag, pageOf, h1, lead, ink, reversed, cwKey, logoAt, cut, mock, photo, posOf, spread } from './lane-hg-parts.js';
import { signSpec } from './helpers.js';

const pad2 = (n) => String(n).padStart(2, '0');
const shots = (ctx) => ctx.brand.imagery.shots || [];
const list = (items, cls = '') => `<ul class="hg-list${cls ? ' ' + cls : ''}">${items.map((i) => `<li>${i}</li>`).join('')}</ul>`;
const rulesList = (rules) => `<ul class="hg-rules">${rules.map((r) => `<li>${P(r.do)}<p class="hg-not"><s>${A(r.dont)}</s></p></li>`).join('')}</ul>`;
const rgbOf = (ctx, hex) => { const [r, g, b] = ctx.C.hexToRgb(hex); return `rgb(${r}, ${g}, ${b})`; };
const sceneArts = (ctx) => artKit(ctx);
// the brand's sign shown in place: a poster in a bus shelter for a brand whose sign is a poster, else the sign on a ute door
function signMock(ctx, kit) {
  const B = ctx.brand, ss = signSpec(ctx);
  if (ss.poster) return mock(ctx, ss.vehicle, [kit.sign(593, 876, ss.line)], [480, 360], 0.5, 'w', `${B.name} poster in a bus shelter: ${ss.line}`, B.applications.signage);
  return mock(ctx, 'kerb-ute-kerbside', [kit.sign(1280, 800)], [480, 360], 0.42, 'w', `${B.name} on a ute door: ${B.lines.primary}`, B.applications.signage);
}
// the sections and their pages, from the engine's own site when we have it, else from ctx.pages
const secsOf = (ctx, S) => {
  if (S && S.sections) return S.sections;
  const out = [];
  for (const p of ctx.pages) {
    if (!p.section) continue;
    let s = out.find((x) => x.n === p.section.n);
    if (!s) out.push(s = { n: p.section.n, title: p.section.title, units: [] });
    s.units.push({ id: p.id, ids: [p.id], title: p.title, file: `${p.id}.html` });
  }
  return out;
};

// ---- clear space: the logo with x drawn on all four sides (x is the brand's own unit, scaled by width) ----
function clearCard(ctx, id, w) {
  const k = cwKey(ctx, id), cw = ctx.brand.logo.colourways[k], g = ctx.logo.geos[id], unit = ctx.logo.geo.unit, x = unit * w / g.w;
  const corner = (c) => `<i class="hg-x hg-x--${c}" style="width:${x.toFixed(1)}px;height:${x.toFixed(1)}px"></i>`;
  return `<div class="hg-clear${nearPaper(ctx, cw.ground) ? ' is-edge' : ''}" style="background:${cw.ground};padding:${x.toFixed(1)}px">${logoAt(ctx, id, w, k)}${['tl', 'tr', 'bl', 'br'].map(corner).join('')}</div>`;
}

// ---- the cross over a try ----
const cross = '<svg class="hg-cross" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false"><line x1="0" y1="0" x2="100" y2="100" class="u"/><line x1="0" y1="100" x2="100" y2="0" class="u"/><line x1="0" y1="0" x2="100" y2="100" class="o"/><line x1="0" y1="100" x2="100" y2="0" class="o"/></svg>';

// ---- the sample screen on the laptop (drawn from the brand's own colours, type and copy) ----
function screenArt(ctx) {
  const B = ctx.brand, L = ctx.roles.light, W = ctx.weights, d = B.fonts.display, b = B.fonts.body, t = B.type.sample, F = B.ui.screen.content.form;
  const stretch = d.stretch ? `font-stretch:${d.stretch}%;` : '';
  const k = cwKey(ctx, 'horizontal');
  const inner = `<div style="position:absolute;inset:0;background:${L.surface}">`
    + `<div style="position:absolute;left:64px;top:40px;width:200px">${ctx.logo.html('horizontal', { width: 200, colourway: k })}</div>`
    + `<div style="position:absolute;left:64px;top:200px;width:760px;font-family:'${d.family}',sans-serif;font-weight:${W.heading};${stretch}font-size:72px;line-height:80px;color:${L.text}">${A(t.headline)}</div>`
    + `<div style="position:absolute;left:64px;top:480px;width:640px;font-family:'${b.family}',sans-serif;font-weight:${W.regular};font-size:22px;line-height:34px;color:${L.text}">${A(t.paragraph)}</div>`
    + `<div style="position:absolute;left:64px;top:660px;height:64px;padding:0 40px;display:flex;align-items:center;background:${L.action};color:${L.actionLabel};font-family:'${b.family}',sans-serif;font-weight:${W.strong};font-size:22px">${A(F.book)}</div></div>`;
  return { html: ctx.artPage(inner, { w: 1280, h: 800 }), w: 1280, h: 800 };
}

const PAGES = {
  // ---------------------------------------------------------------- 1 Introduction
  intro: (ctx) => {
    const B = ctx.brand;
    const ute = signMock(ctx, sceneArts(ctx));
    return spread(ctx, 'intro', { rows: [
      [ute, lead(`${h1(ctx, 'intro')}${P(B.description, 'hg-lede')}${P(B.product, 'hg-line')}`)],
      [null, `${tag('Who it serves', 'h2')}${P(B.audience)}`],
    ] });
  },
  personality: (ctx) => {
    const B = ctx.brand;
    const traits = `<dl class="hg-traits">${B.personality.map((p) => `<div><dt>${tag(p.trait)}</dt><dd>${P(p.means)}</dd></div>`).join('')}</dl>`;
    return spread(ctx, 'personality', { rows: [
      [`<p class="hg-hero disp"><span class="hg-k">${A(B.lines.primary)}</span></p>${(B.lines.others || []).length ? '' : ''}`, lead(`${h1(ctx, 'personality')}${traits}`)],
    ] });
  },
  // ---------------------------------------------------------------- 2 Voice
  voice: (ctx) => {
    const V = ctx.brand.voice, [first, ...rest] = V.principles;
    const v = `${tag(first.title, 'h2')}<p class="hg-big disp"><span class="hg-k">${A(first.example)}</span></p>`;
    const r = `${h1(ctx, 'voice')}<ul class="hg-list">${rest.map((p) => `<li>${tag(p.title, 'h2')}<p class="hg-title disp"><span class="hg-k">${A(p.example)}</span></p></li>`).join('')}</ul>`;
    return spread(ctx, 'voice', { rows: [[v, lead(r)]] });
  },
  'write-this': (ctx) => {
    const V = ctx.brand.voice;
    return spread(ctx, 'write-this', { rows: [
      [lead(`${h1(ctx, 'write-this')}${H3('Write this')}`), H3('Not that')],
      ...V.writeThis.map((w) => [`<p class="hg-write">${A(w.write)}</p>`, `<p class="hg-not"><s>${A(w.not)}</s></p>${P(w.because, 'hg-note')}`]),
    ] });
  },
  messaging: (ctx) => {
    const B = ctx.brand, V = B.voice, lines = [B.lines.primary, ...(B.lines.others || [])];
    return spread(ctx, 'messaging', { rows: [
      [lead(`${h1(ctx, 'messaging')}${H3('Lines in use')}<ul class="hg-list">${lines.map((l) => `<li class="hg-title disp"><span class="hg-k">${A(l)}</span></li>`).join('')}</ul>`),
        `${H3('Boilerplate, 25 words')}${P(V.boilerplate25)}${H3('Boilerplate, 50 words')}${P(V.boilerplate50)}`],
      [null, `${H3('Writing the name')}${P(V.nameRules)}`],
    ] });
  },
  // ---------------------------------------------------------------- 3 Logo
  logo: (ctx) => {
    const B = ctx.brand, k = cwKey(ctx, 'colour'), cw = B.logo.colourways[k];
    const front = `<div class="hg-bigmark">${logoAt(ctx, 'colour', 336, k)}</div>`;
    return spread(ctx, 'logo', { end: { side: 'v', ground: cw.ground, ink: cw.name, html: front }, rows: [[null, lead(`${h1(ctx, 'logo')}${P(B.logo.idea, 'hg-lede')}`)]] });
  },
  'logo-versions': (ctx) => {
    const B = ctx.brand, L = ctx.logo;
    return spread(ctx, 'logo-versions', { rows: L.versions.map((id, i) => [
      cut(ctx, id, id === 'symbol' ? 96 : 192),
      (i === 0 ? lead : (x) => x)(`${i === 0 ? h1(ctx, 'logo-versions') : ''}${tag(L.labels[id], 'h2')}${P(B.logo.when[id] || '', 'hg-note')}`),
    ]) });
  },
  'clear-space': (ctx) => {
    const sh = ctx.logo.clearShare;
    return spread(ctx, 'clear-space', { rows: [
      [clearCard(ctx, 'colour', 216), lead(`${h1(ctx, 'clear-space')}${P(`Keep clear space around the logo on every side, measured from its edge. Nothing enters it: no type, no edge, no other logo. The space is x, and x is ${sh}% of the logo's height. As the logo grows or shrinks, x goes with it.`)}`)],
      [clearCard(ctx, 'stacked', 168), clearCard(ctx, 'symbol', 96)],
    ] });
  },
  'min-size': (ctx) => {
    const m = ctx.logo.minSize, k = cwKey(ctx, 'colour'), cw = ctx.brand.logo.colourways[k];
    const at = (w) => `<div class="hg-cut hg-cut--tight${nearPaper(ctx, cw.ground) ? ' is-edge' : ''}" style="background:${cw.ground}">${logoAt(ctx, 'colour', w, k)}</div>`;
    const mm = `<div class="hg-cut hg-cut--tight${nearPaper(ctx, cw.ground) ? ' is-edge' : ''}" style="background:${cw.ground}">${logoAt(ctx, 'colour', 72, k).replace('style="width:72px;', `style="width:${m.printMm}mm;`)}</div>`;
    return spread(ctx, 'min-size', { rows: [
      [at(m.screenPx), lead(`${h1(ctx, 'min-size')}${P('The smallest the logo goes, drawn at that size. Below it, use the symbol.')}`)],
      [`${tag('On screen', 'h2')}${P(`${m.screenPx} px wide, ${m.screenH} px tall.`)}`, mm],
      [null, `${tag('In print', 'h2')}${P(`${m.printMm} mm wide, ${m.printH} mm tall.`)}`],
    ] });
  },
  'logo-grounds': (ctx) => {
    const B = ctx.brand, cws = B.logo.colourways, s0 = shots(ctx)[0], mono = cwKey(ctx, 'mono-light');
    const tiles = ctx.colours.map((c) => {
      const best = Object.keys(cws).sort((a, b) => ctx.ratio(cws[b].name, c.hex) - ctx.ratio(cws[a].name, c.hex))[0];
      if (ctx.ratio(cws[best].name, c.hex) < 3) return null;
      return `<div class="hg-tile${nearPaper(ctx, c.hex) ? ' is-edge' : ''}" style="background:${c.hex};color:${ink(ctx, c.hex)}">${logoAt(ctx, 'colour', 168, best)}<p class="hg-tile__n">${A(c.name)}</p></div>`;
    }).filter(Boolean);
    const real = s0 && s0.photo && ctx.edition !== 'slot', R = reversed(ctx);
    const over = real ? `<span class="hg-over">${logoAt(ctx, 'horizontal', 192, mono)}</span>` : `<span class="hg-over hg-over--panel" style="background:${R.ground}">${logoAt(ctx, 'horizontal', 168, 'reversed')}</span>`;
    const onPhoto = s0 ? `<figure class="hg-print"><div class="hg-print__f" style="aspect-ratio:4/3"><div class="hg-print__i"${posOf(s0) ? ` style="--pos:${posOf(s0)}"` : ''}>${ctx.photo(s0.id, { cls: 'hg-photo' })}${over}</div><span class="hg-piece" aria-hidden="true"></span></div><figcaption><span class="hg-k">${real ? 'On a photo, the light logo on a quiet part of the picture.' : 'On a photo, the logo sits on a solid panel of its own ground.'}</span></figcaption></figure>` : '';
    const rows = [[onPhoto, lead(`${h1(ctx, 'logo-grounds')}${P('The logo sits on each of these colours, in the colourway that reads on it. The brand does not put it on any other.')}`)]];
    for (let i = 0; i < tiles.length; i += 2) rows.push([tiles[i], tiles[i + 1] || null]);
    return spread(ctx, 'logo-grounds', { rows });
  },
  'logo-misuse': (ctx) => {
    const B = ctx.brand, lg = ctx.logo, R = reversed(ctx), s0 = shots(ctx)[0];
    const act = ctx.C.toOklch(ctx.roles.light.action), wrong = ctx.C.fromOklch(Math.min(act.L, 0.42), Math.max(act.C, 0.08), (act.H + 180) % 360);
    const items = [
      ['Stretched', 'Never squash or stretch it. Scale it evenly.', 'transform:scale(1.32,0.7)', {}],
      ['Recoloured', 'Never recolour it. Use one of the colourways.', '', { fill: wrong }],
      ['Rotated', 'Never tilt or turn it. It sits level with the page.', 'transform:rotate(-12deg)', {}],
      ['Effects', 'No shadows, glows or bevels. The logo is flat colour.', 'filter:drop-shadow(5px 6px 4px rgba(0,0,0,0.5))', {}],
      ['Outlined or boxed', 'No outlines, boxes or frames. Its clear space is the only frame it needs.', '', { box: true }],
    ];
    const K = sceneArts(ctx), real = s0 && s0.photo && ctx.edition !== 'slot';
    const bench = `${plateImg(A(ctx.mockup('bench-cards-offcuts', { 'card-front': K.cardFront(340, 208), 'card-back': K.cardBack(340, 208) })), 'Shavings on a workbench', 'object-fit:cover', 'hg-bench')}`;
    const busy = `<div class="hg-print__i hg-busy"${real && posOf(s0) ? ` style="--pos:${posOf(s0)}"` : ''}>${real ? ctx.photo(s0.id, { cls: 'hg-photo' }) : bench}<span class="hg-xw hg-busy__l"><span class="hg-mu" style="--ar:${lg.geos.colour.w}/${lg.geos.colour.h}">${lg.forMisuse(240)}</span>${cross}</span></div>`;
    const first = `<figure class="hg-print"><div class="hg-print__f" style="aspect-ratio:4/3">${busy}<span class="hg-piece" aria-hidden="true"></span></div><figcaption><span class="hg-k">Busy ground: never on a busy photo. On a photo, use the light logo on a quiet part of the picture.</span></figcaption></figure>`;
    const w = 150;
    const rows = [[first, lead(`${h1(ctx, 'logo-misuse')}${P('Six ways the logo goes wrong. Use the supplied files as they are, and none of these.')}`)]];
    for (const [name, why, css, o] of items) {
      const art = `<span class="hg-mu${o.box ? ' is-boxed' : ''}" style="--ar:${lg.geos.colour.w}/${lg.geos.colour.h};width:${w}px;${css}">${lg.forMisuse(w, o.fill ? { fill: o.fill } : {})}</span>`;
      rows.push([`<div class="hg-try"><span class="hg-xw" style="width:${w}px">${art}${cross}</span></div>`, `${tag(name, 'h2')}${P(why, 'hg-note')}`]);
    }
    return spread(ctx, 'logo-misuse', { rows });
  },
  // ---------------------------------------------------------------- 4 Colour
  palette: (ctx) => spread(ctx, 'palette', { rows: ctx.colours.map((c, i) => [
    `<div class="hg-sw${nearPaper(ctx, c.hex) ? ' is-edge' : ''}" style="background:${c.hex};color:${ink(ctx, c.hex)};--sh:${Math.max(0.3, c.share)}"><span>${A(c.name)}</span></div>`,
    (i === 0 ? lead : (x) => x)(`${i === 0 ? h1(ctx, 'palette') : ''}${tag(c.name, 'h2')}${P(c.lands)}`),
  ]) }),
  proportion: (ctx) => {
    const bands = ctx.colours.map((c) => `<li${nearPaper(ctx, c.hex) ? ' class="is-edge"' : ''} style="background:${c.hex};color:${ink(ctx, c.hex)};--sh:${Math.max(0.05, c.share)}"><span>${Math.round(c.share * 100)}%</span></li>`).join('');
    const names = `<ol class="hg-shares">${ctx.colours.map((c) => `<li><span class="hg-sq${nearPaper(ctx, c.hex) ? ' is-edge' : ''}" style="background:${c.hex}" aria-hidden="true"></span><span class="hg-shares__n">${A(c.name)}</span><span class="m">${Math.round(c.share * 100)}%</span></li>`).join('')}</ol>`;
    return spread(ctx, 'proportion', { rows: [[`<ul class="hg-bands" aria-label="Each colour's share of a page">${bands}</ul>`, lead(`${h1(ctx, 'proportion')}${P(`Each band is as tall as that colour's share of a page.`)}${names}`)]] });
  },
  contrast: (ctx) => spread(ctx, 'contrast', { rows: [
    [lead(`${h1(ctx, 'contrast')}${P('Text needs 4.5:1. Type at 24 px and over needs 3:1. These are the pairs the brand uses.')}`), null],
    ...ctx.pairs.map((p) => [
      `<div class="hg-pair" style="background:${p.bgHex};color:${p.fgHex}"><span class="hg-pair__a disp" aria-hidden="true">Aa</span><span class="hg-pair__r disp">${A(p.ratioText)}</span></div>`,
      `${P(p.use)}${p.large ? P('24 px and over only', 'hg-note') : ''}`,
    ]),
  ] }),
  'colour-values': (ctx) => {
    const val = (k, v) => `<div><dt>${k}</dt><dd class="m">${A(v)}</dd></div>`;
    const ramp = (c) => (c.ramp ? `<ol class="hg-ramp" aria-label="${A(c.name)} ramp, lightest to darkest">${Object.entries(c.ramp).map(([, hx]) => `<li style="background:${hx}"></li>`).join('')}</ol>` : '');
    return spread(ctx, 'colour-values', { rows: [
      [lead(`${h1(ctx, 'colour-values')}${P('Ask your printer for a proof before a colour goes to press.')}`), null],
      ...ctx.colours.map((c) => [
        `<div class="hg-sw hg-sw--s${nearPaper(ctx, c.hex) ? ' is-edge' : ''}" style="background:${c.hex};color:${ink(ctx, c.hex)}"><span>${A(c.name)}</span></div>`,
        `<dl class="hg-vals">${val('HEX', c.hex)}${val('RGB', rgbOf(ctx, c.hex))}${val('OKLCH', c.oklch || ctx.C.oklchString(c.hex))}${ctx.C.cmykOf(c) ? val('CMYK', ctx.C.cmykOf(c)) : ''}</dl>${ramp(c)}`,
      ]),
    ] });
  },
  // ---------------------------------------------------------------- 5 Typography
  typefaces: (ctx) => {
    const F = ctx.brand.fonts;
    const face = (f, role) => `${tag(f.family, 'h2')}<ul class="hg-weights">${f.weights.map((w) => `<li style="font-family:var(--${role});font-weight:${w}">${A(f.family)} ${w}</li>`).join('')}</ul>`;
    const mono = F.mono ? `${tag(F.mono.family, 'h2')}<p class="hg-monos">${A(ctx.roles.light.action)}</p>` : '';
    return spread(ctx, 'typefaces', { rows: [
      [`<p class="hg-aa disp" aria-hidden="true">Aa</p>${P(`${F.display.family}, for lines and titles.`)}`, lead(`${h1(ctx, 'typefaces')}${face(F.body, 'body')}${mono}`)],
    ] });
  },
  hierarchy: (ctx) => {
    const T = ctx.brand.type, face = (f) => (f === 'display' ? 'var(--display)' : f === 'mono' ? 'var(--mono)' : 'var(--body)');
    const row = (s) => [`<span class="m hg-sc">${A(s.token)} ${s.size}/${Math.round(s.size * s.line)}</span>`,
      `<p class="hg-scale__s" style="font-family:${face(s.face)};font-weight:${s.weight};font-size:min(${s.size}px, ${(s.size / 4.8).toFixed(2)}cqw);line-height:${s.line}"><span class="hg-k">${A(s.use)}</span></p>`];
    return spread(ctx, 'hierarchy', { rows: [[lead(h1(ctx, 'hierarchy')), null], ...T.scale.map(row)] });
  },
  'type-in-use': (ctx) => {
    const t = ctx.brand.type.sample, L = ctx.roles.light, D = ctx.roles.dark;
    const piece = `<article class="hg-piece-set"><p class="hg-set__h disp">${A(t.headline)}</p><p class="hg-set__p">${A(t.paragraph)}</p><p class="hg-set__c">${A(t.caption)}</p></article>`;
    void L; void D;
    return spread(ctx, 'type-in-use', { rows: [[lead(`${h1(ctx, 'type-in-use')}${P('A headline, a paragraph and a caption, set as the brand sets them.')}`), piece]] });
  },
  'type-rules': (ctx) => spread(ctx, 'type-rules', { rows: [[lead(`${h1(ctx, 'type-rules')}${H3('Do')}`), H3('Not that')], ...ctx.brand.type.rules.map((r) => [P(r.do), `<p class="hg-not"><s>${A(r.dont)}</s></p>`])] }),
  // ---------------------------------------------------------------- 6 Imagery
  'photo-direction': (ctx) => {
    const D = ctx.brand.imagery.direction, s0 = shots(ctx)[0];
    const dl = `<dl class="hg-dir">${[['Light', D.light], ['Crop', D.crop], ['Colour', D.colour], ['People', D.people]].map(([k, v]) => `<div><dt>${tag(k)}</dt><dd>${P(v)}</dd></div>`).join('')}</dl>`;
    return spread(ctx, 'photo-direction', { rows: [[s0 ? photo(ctx, s0, { ar: '4/5', cls: 'hg-print--big' }) : '', lead(`${h1(ctx, 'photo-direction')}${P(D.subject, 'hg-lede')}${dl}`)]] });
  },
  'shot-list': (ctx) => {
    const s = shots(ctx);
    const rows = [[lead(`${h1(ctx, 'shot-list')}${P(`${s.length} shots.`)}`), s[0] ? photo(ctx, s[0]) : null]];
    for (let i = 1; i < s.length; i += 2) rows.push([photo(ctx, s[i]), s[i + 1] ? photo(ctx, s[i + 1]) : null]);
    return spread(ctx, 'shot-list', { rows });
  },
  'imagery-rules': (ctx) => {
    const s = shots(ctx), R = ctx.brand.imagery.rules;
    return spread(ctx, 'imagery-rules', { rows: [[lead(h1(ctx, 'imagery-rules')), null], ...R.map((r, i) => [s.length ? photo(ctx, s[i % s.length]) : '', `${P(r.do)}<p class="hg-not"><s>${A(r.dont)}</s></p>`])] });
  },
  // ---------------------------------------------------------------- 7 Layout
  grid: (ctx) => {
    const G = ctx.gridMeasures, B = ctx.brand, cws = B.logo.colourways, ground = (cws.colour || Object.values(cws)[0]).ground;
    const cols = Array.from({ length: G.columns }, () => '<i></i>').join('');
    const page = `<div class="hg-page" style="background:${ground};aspect-ratio:${G.page.w}/${G.page.h};--m:${(G.margin / G.page.w * 100).toFixed(3)}%;--g:${(G.gutter / G.page.w * 100).toFixed(3)}%;--n:${G.columns}" role="img" aria-label="A ${G.page.w} by ${G.page.h} page with ${G.columns} columns"><div class="hg-page__c">${cols}</div></div>`;
    const meas = `<dl class="hg-meas">${[['Page', `${G.page.w} x ${G.page.h}`], ['Margin', `${G.margin} px`], ['Gutter', `${G.gutter} px`], ['Base', `${G.base} px`]].map(([k, x]) => `<div><dt>${A(k)}</dt><dd class="m">${A(x)}</dd></div>`).join('')}</dl>`;
    const space = `<ol class="hg-space">${ctx.space.map((s) => `<li><i style="width:${s.px}px" aria-hidden="true"></i><span class="m">${A(s.token)} ${s.px}</span></li>`).join('')}</ol>`;
    return spread(ctx, 'grid', { rows: [[`<p class="hg-hero disp"><span class="hg-k">${G.columns} columns</span></p>${page}`, lead(`${h1(ctx, 'grid')}${meas}${H3('Spacing')}${space}`)]] });
  },
  layouts: (ctx) => {
    const G = ctx.gridMeasures, B = ctx.brand, t = B.type.sample, cws = B.logo.colourways, s0 = shots(ctx)[0], k = cwKey(ctx, 'colour');
    const rev = reversed(ctx), L = ctx.roles.light, ar = `${G.page.w}/${G.page.h}`;
    const frame = (inner, bg, cap, xc = '') => `<figure class="hg-lay"><div class="hg-lay__p${xc}" style="aspect-ratio:${ar};background:${bg}">${inner}</div><figcaption><span class="hg-k">${A(cap)}</span></figcaption></figure>`;
    const a = frame(`<p class="hg-lay__h disp" style="color:${rev.name}">${A(B.lines.primary)}</p><span class="hg-lay__logo">${logoAt(ctx, 'horizontal', 120, 'reversed', '')}</span>`, rev.ground, 'A line and the logo');
    const b = frame(`<div class="hg-lay__ph"${posOf(s0) ? ` style="--pos:${posOf(s0)}"` : ''}>${s0 && s0.photo && ctx.edition !== 'slot' ? ctx.photo(s0.id, { cls: 'hg-photo' }) : `<span class="hg-lay__fill" style="background:${rev.ground}"></span>`}</div><p class="hg-lay__t" style="color:${L.text}">${A(t.caption)}</p>`, L.surface, 'A photograph and its caption');
    const c = frame(`<p class="hg-lay__h hg-lay__h--s disp" style="color:${L.text}">${A(t.headline)}</p><p class="hg-lay__t" style="color:${L.text}">${A(t.paragraph)}</p>`, L.surface, 'A headline and a paragraph', ctx.placeholders ? ' hg-lay__p--flow ph-tight' : '');
    void cws; void k;
    return spread(ctx, 'layouts', { rows: [[lead(`${h1(ctx, 'layouts')}${P(`Built on the ${G.columns} column grid, with its margins and gutters.`)}`), a], [b, c]] });
  },
  // ---------------------------------------------------------------- 8 Applications
  'business-card': (ctx) => {
    const B = ctx.brand, Ap = B.applications, cws = B.logo.colourways, R = reversed(ctx), ck = cwKey(ctx, 'colour');
    const front = `<div class="hg-card" style="background:${cws[ck].ground};color:${cws[ck].name}">${logoAt(ctx, 'colour', 144, ck)}<p class="hg-card__p"><span class="hg-card__n">${A(Ap.card.person)}</span><span>${A(Ap.card.role)}</span><span>${A(Ap.card.contact)}</span></p></div>`;
    const back = `<div class="hg-card hg-card--back" style="background:${R.ground};color:${R.name}">${logoAt(ctx, 'colour', 168, R.key)}</div>`;
    const K = sceneArts(ctx);
    const till = mock(ctx, 'counter-till-cards', [K.cardFront(340, 208), K.cardBack(340, 208)], [480, 360], 0.8, 'w', `${B.name} business cards on a shop counter`, 'Business cards, 85 x 55 mm, front and back');
    return spread(ctx, 'business-card', { rows: [[`<div class="hg-cards">${front}${back}</div>`, lead(`${h1(ctx, 'business-card')}${P('Front and back, at the proportion they are printed.')}${till}`)]] });
  },
  social: (ctx) => {
    const B = ctx.brand, R = reversed(ctx), kinds = ['Square', 'Portrait', 'Story'];
    const post = (s, i) => `<li><div class="hg-post hg-post--${i}" style="background:${R.ground};color:${R.name}"><p class="disp">${A(s)}</p></div><p class="hg-note hg-post__c"><span class="hg-k">${kinds[i]}</span></p></li>`;
    const ps = B.applications.social;
    return spread(ctx, 'social', { rows: [[lead(`${h1(ctx, 'social')}${P('Three posts: square, portrait and story.')}`), post(ps[0], 0)], [post(ps[1], 1), post(ps[2], 2)]].map((r) => r.map((c) => (typeof c === 'string' && c.startsWith('<li>') ? `<ul class="hg-posts">${c}</ul>` : c))) });
  },
  signage: (ctx) => {
    const B = ctx.brand, K = sceneArts(ctx);
    // a brand whose sign is a poster shows the poster in the shelter with the line the spec names (as the print book does), not a hoarding
    if (signSpec(ctx).poster) return spread(ctx, 'signage', { rows: [[signMock(ctx, K), lead(`${h1(ctx, 'signage')}${P(B.applications.signage)}`)]] });
    const hoard = mock(ctx, 'kerb-hoarding-footpath', [K.sign(1360, 400)], [480, 320], 0.86, 'w', `${B.name} on a site hoarding: ${B.lines.primary}`, 'Site hoarding beside the footpath', 'hg-print--wide');
    const clip = mock(ctx, 'bench-clipboard-toolbox', [K.clipboard(840, 1000)], [400, 500], 0.8, 'w', `An ${B.name} sheet on a clipboard on a toolbox`, 'A4 sheet on the clipboard');
    return spread(ctx, 'signage', { rows: [[clip, lead(`${h1(ctx, 'signage')}${P(B.applications.signage)}${hoard}`)]] });
  },
  'email-signature': (ctx) => {
    const B = ctx.brand, e = B.applications.email, cws = B.logo.colourways, ck = cwKey(ctx, 'colour'), L = ctx.roles.light;
    const sig = `<div class="hg-sig${nearPaper(ctx, L.surface) ? ' is-edge' : ''}" style="background:${L.surface};color:${L.text}"><p class="hg-sig__n">${A(e.person)}</p><p>${A(e.role)}</p><p>${A(B.applications.site.url)}</p>${logoAt(ctx, 'horizontal', 120, ck, '')}</div>`;
    void cws;
    return spread(ctx, 'email-signature', { rows: [[sig, lead(`${h1(ctx, 'email-signature')}${P('The signature as it renders in a mail client. No quote, no banner, no second logo.')}`)]] });
  },
  digital: (ctx) => {
    const B = ctx.brand, F = B.ui.screen.content.form, ui = ctx.ui;
    const laptop = mock(ctx, 'bench-laptop-shoulder', [screenArt(ctx)], [480, 360], 0.5, 'w', `${B.name} on a laptop at a shared bench`, 'On the screen, at a shared bench');
    const form = `<div class="ui hg-live"><div class="hg-form">${ui.field({ id: 'hg-f1', label: F.size, kind: 'select', options: F.sizes, value: F.sizes[0] })}${ui.field({ id: 'hg-f2', label: F.dropoff, value: F.dropoffValue })}${ui.btn(F.book, { block: true })}</div></div>`;
    return spread(ctx, 'digital', { rows: [[laptop, lead(`${h1(ctx, 'digital')}${P(`One filled button on a screen: ${F.book}.`)}`)], [null, `${H3(F.title)}${form}`]] });
  },
  // ---------------------------------------------------------------- 9 Close
  summary: (ctx) => {
    const B = ctx.brand, R = reversed(ctx), F = B.fonts;
    const front = `<div class="hg-bigmark">${logoAt(ctx, 'colour', 240, R.key)}</div><p class="hg-endline disp">${A(B.lines.primary)}</p>`;
    const strip = `<ul class="hg-chips">${ctx.colours.map((c) => `<li class="${nearPaper(ctx, c.hex) ? 'is-edge' : ''}" style="background:${c.hex};color:${ink(ctx, c.hex)}"><span>${A(c.name)}</span><span class="m">${A(c.hex)}</span></li>`).join('')}</ul>`;
    const rules = (B.guideB && B.guideB.rules) || [];
    return spread(ctx, 'summary', { end: { side: 'v', ground: R.ground, ink: R.name, html: front }, rows: [
      [null, lead(`${h1(ctx, 'summary')}${strip}`)],
      [null, `${H3('Type')}${P(`${F.display.family} for lines and titles, ${F.body.family} for the rest.`)}`],
      [null, `${H3('Three rules')}<ol class="hg-three">${rules.slice(0, 3).map((r) => `<li>${tag(r.title)}${P(r.text)}</li>`).join('')}</ol>`],
    ] });
  },
  'contact-scope': (ctx, S) => {
    const B = ctx.brand, secs = secsOf(ctx, S).map((s) => s.title).join(', ');
    return spread(ctx, 'contact-scope', { rows: [
      [lead(`${h1(ctx, 'contact-scope')}${H3('Who to ask')}${P(`${B.contact.owner} looks after the ${B.name} brand. Ask before you change the logo, the colours or the type.`)}<p class="hg-strip">${A(B.contact.email)}</p>`),
        `${H3('Version')}${P(`Version ${B.version.number}, ${B.version.date}`)}${H3('In this guide')}${P(secs || 'Voice, logo, colour, typography, imagery, layout and applications.')}${H3('Not in this guide')}${P('The files themselves. Logo, colour, type and imagery files come in the brand kit.')}`],
    ] });
  },
};

// ---- the front: the cover on its own spread, then the contents ----
function cover(ctx) {
  const B = ctx.brand, R = reversed(ctx);
  const front = `<p class="hg-end__t">Brand guidelines</p><p class="hg-end__v">Version ${A(B.version.number)}, ${A(B.version.date)}</p><div class="hg-end__logo">${logoAt(ctx, 'colour', 216, R.key)}</div>`;
  const r = `<h1 class="hg-hero hg-hero--cover disp"><span class="hg-k">${A(B.name)} brand guidelines</span></h1>${P(B.lines.primary, 'hg-line')}${P(B.description)}<p class="hg-strip">If found, return to ${A(B.contact.email)}</p>`;
  return spread(ctx, 'cover', { tab: false, end: { side: 'v', ground: R.ground, ink: R.name, html: front }, rows: [[null, lead(r)]] });
}
function contents(ctx, S) {
  const secs = secsOf(ctx, S).map((s) => `${tag(`${s.n} ${s.title}`, 'h2')}<ol class="hg-toc-l">${s.units.map((u) => `<li><a href="${A(u.file)}"><span>${A(u.title)}</span><span class="m">${pad2(ctx.pageNo(u.ids ? u.ids[0] : u.id))}</span></a></li>`).join('')}</ol>`);
  const rows = [];
  for (let i = 0; i < secs.length; i += 2) rows.push([secs[i], secs[i + 1] || null]);
  rows[0][0] = `<h2 class="hg-h1 disp"><span class="hg-k">Contents</span></h2>${rows[0][0]}`;
  return spread(ctx, 'contents', { tab: false, rows });
}

export const guideSite = {
  css: (ctx) => guideCss(ctx),
  shell(ctx, S, ) {
    const B = ctx.brand, k = cwKey(ctx, 'horizontal'), R = reversed(ctx);
    const home = S.isFront ? 'index.html' : 'index.html';
    const logoL = logoAt(ctx, 'horizontal', 120, k, ''), logoD = logoAt(ctx, 'horizontal', 120, 'reversed', '');
    const toc = S.sections.map((s) => `<li><p class="hg-toc__s">${A(`${s.n} ${s.title}`)}</p><ol>${s.units.map((u) => `<li><a href="${A(u.file)}"${S.unit && S.unit.id === u.id ? ' aria-current="page"' : ''}>${A(u.title)}</a></li>`).join('')}</ol></li>`).join('');
    const nav = (u, dir) => (u ? `<a class="hg-pn hg-pn--${dir}" href="${A(u.file)}" rel="${dir}"><span class="hg-pn__d">${dir === 'prev' ? 'Previous' : 'Next'}</span><span class="hg-pn__t">${A(u.title)}</span></a>` : '<span></span>');
    void R; void B;
    return `<div data-gs-root class="hg"><header class="hg-top"><a class="hg-brand" href="${home}" aria-label="${A(B.name)} brand guidelines, contents"><span class="hg-for-light">${logoL}</span><span class="hg-for-dark">${logoD}</span></a>`
      + `<nav class="hg-links" aria-label="Documents"><a href="index.html" aria-current="page">Guidelines</a><a href="../ui-kit-html/index.html">UI kit</a></nav>`
      + `<button type="button" class="hg-toc-btn" data-gs-toggle aria-controls="hg-toc" aria-expanded="false">Contents</button>`
      + `<div class="hg-mode" role="group" aria-label="Colour mode"><button type="button" data-mode="light" aria-pressed="true">Light</button><button type="button" data-mode="dark" aria-pressed="false">Dark</button></div>`
      + `<div class="hg-toc" id="hg-toc" data-open="false"><ol>${toc}</ol></div></header>`
      + `<main id="main" tabindex="-1">${S.body}</main>`
      + `<footer class="hg-foot"><nav class="hg-pager" aria-label="Pages">${nav(S.prev, 'prev')}${nav(S.next, 'next')}</nav><p class="hg-credit">Made with UIL4B</p></footer></div>`;
  },
  front(ctx, S) { return cover(ctx) + contents(ctx, S); },
  page(ctx, id, S) {
    if (id === 'cover') return cover(ctx);
    if (id === 'contents') return contents(ctx, S);
    const fn = PAGES[id];
    if (!fn) throw new Error(`26 guide site: no page for ${id} (${pageOf(ctx, id).title})`);
    return fn(ctx, S);
  },
  adapt: { strip: [], noLink: '.m, .hg-ver' },
  darkSample: ['cover', 'palette', 'logo-grounds'],
};
