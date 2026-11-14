// Theme 30, Fluted, lane hg: the 33 guideline pages of the guide site, one function each. Every page is the same lobby wall: running head, two-tone headline,
// lead, one big thing; the band across the full width holding the page's own data as windows; the key; then the specs as hairline rows.
// Copy comes from ctx.brand and is printed whole through esc(). Every number is computed from ctx.
import { plateImg } from '../../engine/plate.js';
import { A, v, h2, p, q, dl, two, rules, rgbOf, cap1, nWord, listAnd, WEIGHT, fitCap, cq, logoOn, logoModes, logoCw, slotFrame, glass, layoutWindows } from './lane-hg-lib.js';
import { brandRules } from './helpers.js';
import { shareFields } from './lane-bk-glass.js';
import { SCENES, phoneScene, signScene, signLine, phoneArt, cardArt, panelArt } from './lane-hg-art.js';

const pct = (x) => `${Math.round(x * 100)}%`;
const sorted = (ctx) => ctx.colours.slice().sort((a, b) => b.share - a.share);
const ul = (cls, items) => `<ul class="${cls}">${items.map((x) => `<li>${x}</li>`).join('')}</ul>`;
// where the subject sits in each photograph, from looking at it (x y); a portrait crop keeps the rider, the poster panel
const FRAME = { riders: '85% 50%', evening: '4% 50%', busstop: '90% 50%' };
// the nth photographed shot (wrapping), else the nth shot: the three pages with a big photograph each show a different one
const shotNth = (shots, n) => { const ph = shots.filter((s) => s.photo); return ph.length ? ph[n % ph.length] : shots[Math.min(n, shots.length - 1)]; };
// a shot still to take reads as a brief to shoot: a label and the brief inside the frame, not a blank box
const brief = (ctx, s, i) => `<div class="photo-slot hg-photo hg-brief" role="img" aria-label="${A('Photo to shoot. ' + s.slot)}"><b>${i == null ? 'To shoot' : `To shoot, ${String(i + 1).padStart(2, '0')}`}</b><span>${A(s.slot)}</span></div>`;
const shotBig = (ctx, shot, pos) => `<figure class="hg-photo-big">${shot.photo ? ctx.photo(shot.id, { cls: 'hg-photo', pos: pos || FRAME[shot.id] || '50% 45%', slotNote: false }) : brief(ctx, shot)}</figure>`;
const plate = (src, alt, wide) => `<figure class="hg-shot-big${wide ? " hg-shot-big--wide" : ""}">${plateImg(`${A(src)}`, `${A(alt)}`)}</figure>`;
const post = (ctx, i) => {
  const D = ctx.roles.dark, L = ctx.roles.light, bg = [D.surface, D.action, L.surface][i % 3], ink = ctx.ratio(D.text, bg) >= ctx.ratio(D.surface, bg) ? D.text : D.surface;
  ctx.pair(ink, bg, { size: 24, what: 'guide site social post' });
  return { bg, ink };
};
// the sample logo's ground for a colourway key, named by the brand colour that holds it
const colName = (ctx, hex) => (ctx.brand.colours.find((c) => c.hex.toLowerCase() === hex.toLowerCase()) || {}).name;

const PAGES = {
  // ---- Introduction ----
  intro(ctx) {
    const B = ctx.brand, cols = sorted(ctx), strong = ctx.roles.dark.action, sc = cols.find((c) => c.hex.toLowerCase() === strong.toLowerCase()) || cols[0];
    const rest = cols.filter((c) => c !== sc);
    const its = [{ value: 1, fill: sc.hex, name: A(sc.name), val: pct(sc.share) }, ...rest.map((c) => ({ value: 0, fill: c.hex, name: A(c.name), val: pct(c.share) }))];
    const fields = (D) => shareFields(ctx, D.W).map((f) => ({ ...f, fill: f.c === sc ? 'g' : f.fill }));
    const layout = (D) => { const f = shareFields(ctx, D.W).find((x) => x.c === sc), a = Math.ceil(f.x / 12) * 12; return [{ x: a, w: Math.floor((f.x + f.w) / 12) * 12 - a }, ...rest.map(() => ({ x: 0, w: 0 }))]; };
    return {
      l1: A(B.lines.primary), l2: `Brand guidelines, version ${A(B.version.number)}`, lead: A(B.description), note: 'In the glass, the palette by share',
      big: `<div class="hg-bigl">${logoModes(ctx, 'colour', 360)}</div>`,
      band: glass(ctx, 'intro', its, { label: `The ${B.name} palette by share: ${cols.map((c) => `${c.name} ${pct(c.share)}`).join(', ')}`, fields, layout, settle: false }),
      body: dl([['What it does', A(B.product)], ['Who it serves', A(B.audience)], ...(B.city ? [['Where', A(B.city)]] : []), ['Other lines', ul('hg-lines', B.lines.others.map((l) => `<span class="hg-disp">${A(l)}</span>`))]]),
    };
  },
  personality(ctx) {
    const B = ctx.brand, T = B.personality, fills = ['strong', 'ink', 'quiet'];
    return {
      l1: `${cap1(nWord(T.length))} traits.`, l2: 'How it behaves.', lead: `${A(listAnd(T.map((t) => t.trait)))}.`, note: 'In the glass, one window for each trait',
      big: `<ol class="hg-bigwords">${T.map((t) => `<li class="hg-disp">${A(t.trait)}</li>`).join('')}</ol>`,
      band: glass(ctx, 'personality', T.map((t, i) => ({ value: 1, fill: fills[i % 3], name: A(t.trait), val: '' })), { label: `The ${T.length} personality traits: ${T.map((t) => t.trait).join(', ')}` }),
      body: `<ol class="hg-traits">${T.map((t) => `<li><p class="hg-trait hg-disp">${A(t.trait)}</p><p class="hg-p">${A(t.means)}</p></li>`).join('')}</ol>`,
    };
  },
  // ---- Voice ----
  voice(ctx) {
    const B = ctx.brand, V = B.voice, n = V.principles.length;
    return {
      l1: `How ${A(B.name)} writes.`, l2: `${cap1(nWord(n))} rules for every sentence.`, lead: A(V.boilerplate25), note: 'In the glass, one window for each rule',
      big: `<p class="hg-bigq hg-disp">${A(V.principles[0].example)}</p>`,
      band: glass(ctx, 'voice', V.principles.map((r, i) => ({ value: 1, fill: i % 2 ? 'ink' : 'strong', name: A(r.title), val: '' })), { label: `The ${n} voice rules: ${V.principles.map((r) => r.title).join(', ')}` }),
      body: `<ol class="hg-say">${V.principles.map((r, i) => `<li><span class="hg-v">${String(i + 1).padStart(2, '0')}</span><p class="hg-say__t">${A(r.title)}</p><p class="hg-say__x hg-disp">${A(r.example)}</p></li>`).join('')}</ol>${h2('Writing the name')}${p(V.nameRules)}`,
    };
  },
  'write-this'(ctx) {
    const W = ctx.brand.voice.writeThis;
    return {
      l1: 'Write this.', l2: 'Not that.', lead: 'Write the first line. Never the second.', note: 'In the glass, one window for each pair',
      big: `<p class="hg-bigq hg-disp">${A(W[0].write)}</p>`,
      band: glass(ctx, 'write-this', W.map((w, i) => ({ value: 1, fill: i % 2 ? 'ink' : 'strong', name: `Pair ${i + 1}`, val: '' })), { label: `${W.length} lines to write, each with the line not to write` }),
      body: `<ul class="hg-wtn">${W.map((w) => `<li><p class="hg-wtn__w">${A(w.write)}</p><p class="hg-wtn__n"><span class="hg-do">Not</span> <s>${A(w.not)}</s></p><p class="hg-q">${A(w.because)}</p></li>`).join('')}</ul>`,
    };
  },
  messaging(ctx) {
    const B = ctx.brand, V = B.voice;
    return {
      l1: 'The line.', l2: 'And the words around it.', lead: 'The lines and the boilerplate, to use as written.', note: 'In the glass, the two boilerplates',
      big: `<p class="hg-bigq hg-disp">${A(B.lines.primary)}</p>`,
      band: glass(ctx, 'messaging', [{ value: 25, fill: 'strong', name: 'The brand in 25 words', val: '25' }, { value: 50, fill: 'ink', name: 'The brand in 50 words', val: '50' }], { label: 'The two boilerplates, each as wide as its length: 25 words and 50 words' }),
      body: two(`${h2('The brand in 25 words')}${p(V.boilerplate25)}`, `${h2('The brand in 50 words')}${p(V.boilerplate50)}`)
        + two(`${h2('Lines in use')}${ul('hg-lines', [B.lines.primary, ...B.lines.others].map((l) => `<span class="hg-disp">${A(l)}</span>`))}`, `${h2('Writing the name')}${p(V.nameRules)}`),
    };
  },
  // ---- Logo ----
  logo(ctx) {
    const B = ctx.brand, L = ctx.logo, cw = B.logo.colourways;
    const order = ['colour', 'reversed', 'mono-dark', 'mono-light', 'horizontal', 'stacked', 'symbol'].filter((id) => L.versions.includes(id));
    const asp = (id) => L.geos[id].w / L.geos[id].h;
    return {
      l1: 'The logo.', l2: `${cap1(nWord(order.length))} versions.`, lead: A(B.logo.idea), note: 'In the glass, each version at its proportion',
      big: `<div class="hg-bigl">${logoModes(ctx, 'colour', 440)}</div>`,
      band: glass(ctx, 'logo', order.map((id) => ({ value: asp(id), fill: cw[L.colourwayOf(id)].ground, name: A(L.labels[id]), val: `${asp(id).toFixed(1)} : 1` })), { label: `Each logo version as wide as its proportion, on its own ground: ${order.map((id) => `${L.labels[id]} ${asp(id).toFixed(1)} to 1`).join(', ')}` }),
      body: `${B.logo.when.colour ? p(B.logo.when.colour) : ''}${h2('Writing the name')}${p(B.voice.nameRules)}`,
    };
  },
  'logo-versions'(ctx) {
    const B = ctx.brand, L = ctx.logo, cw = B.logo.colourways, order = ['colour', 'reversed', 'mono-dark', 'mono-light', 'horizontal', 'stacked', 'symbol'].filter((id) => L.versions.includes(id));
    const row = (id) => {
      const k = L.colourwayOf(id), g = L.geos[id], lw = Math.round(Math.min(id === 'symbol' ? 64 : 200, 72 * g.w / g.h));
      return `<li><span class="hg-ver__g" style="background:${cw[k].ground}">${logoCw(ctx, id, k, lw)}</span><span class="hg-ver__k"><span class="hg-ver__n">${A(L.labels[id])}</span><span class="hg-q">${A(B.logo.when[id] || '')}</span></span></li>`;
    };
    const first = L.versions.includes('horizontal') ? 'horizontal' : order[0];
    return {
      l1: `${cap1(nWord(order.length))} versions.`, l2: 'Each on the ground it is made for.', lead: A(B.logo.when[first] || B.logo.idea), note: 'In the glass, one window for each version, on its ground',
      big: `<div class="hg-bigl">${logoModes(ctx, first, 300)}</div>`,
      band: glass(ctx, 'logo-versions', order.map((id) => ({ value: 1, fill: cw[L.colourwayOf(id)].ground, name: A(L.labels[id]), val: '' })), { label: `The ${order.length} logo versions, each on its own ground` }),
      body: `<ul class="hg-vers">${order.map(row).join('')}</ul>`,
    };
  },
  'clear-space'(ctx) {
    const L = ctx.logo, sh = L.clearShare, pad = (sh / 100) * L.geo.height / L.geo.width * 100;
    return {
      l1: 'Clear space.', l2: `${sh}% of the height, every side.`, lead: `Keep ${v(`${sh}%`)} of the logo&rsquo;s height clear on every side. Nothing else comes inside it.`, note: 'In the glass, the logo between its clear bands',
      big: `<div class="hg-clear"><div class="hg-clear__b" style="padding:${pad.toFixed(3)}%">${logoModes(ctx, 'colour', 280)}</div></div>`,
      band: glass(ctx, 'clear-space', [{ value: sh, fill: 'g', stroke: null, name: 'Clear', val: `${sh}%` }, { value: 100, fill: 'strong', name: 'Logo height', val: '100%' }, { value: sh, fill: 'g', name: 'Clear', val: `${sh}%` }], { label: `The clear band, ${sh} percent of the logo height, either side of the logo` }),
      body: p('The dashed line on this page is the edge of the clear band.'),
    };
  },
  'min-size'(ctx) {
    const ms = ctx.logo.minSize, slot = ctx.edition === 'slot';
    return {
      l1: 'Smallest size.', l2: 'Never smaller.', lead: slot ? 'Set the smallest size once the logo is in place: the width at which every part of it still reads as one mark.' : `${v(`${ms.screenPx} px`)} wide on screen, ${v(`${ms.printMm} mm`)} in print.`, note: 'In the glass, the smallest logo, wide and tall',
      big: slot ? '' : `<div class="hg-min">${logoModes(ctx, 'colour', ms.screenPx)}</div>`,
      band: slot ? '' : glass(ctx, 'min-size', [{ value: ms.screenPx, fill: 'strong', name: 'Width on screen', val: `${ms.screenPx} px` }, { value: ms.screenH, fill: 'ink', name: 'Height on screen', val: `${ms.screenH} px` }], { label: `The smallest logo on screen: ${ms.screenPx} pixels wide and ${ms.screenH} pixels tall` }),
      body: dl([['On screen', v(`${ms.screenPx} px wide`)], ['In print', v(`${ms.printMm} mm wide`)]]),
    };
  },
  'logo-grounds'(ctx) {
    const B = ctx.brand, L = ctx.logo, cw = B.logo.colourways, ks = Object.keys(cw);
    const nm = (k) => { const g = colName(ctx, cw[k].ground), lb = /^on-/.test(k) ? '' : (L.labels[k] || ctx.cap(k.replace(/-/g, ' '))); return g ? (lb ? `${lb}, on ${g}` : `On ${g}`) : (lb || ctx.cap(k.replace(/-/g, ' '))); };
    const cell = (k) => `<li><span class="hg-ver__g" style="background:${cw[k].ground}">${logoCw(ctx, 'colour', k, 200)}</span><span class="hg-ver__k"><span class="hg-ver__n">${A(nm(k))}</span><span class="hg-q">${A(B.logo.when[k] || '')}</span></span></li>`;
    return {
      l1: 'Logo grounds.', l2: `${cap1(nWord(ks.length))} grounds, each with its own logo.`, lead: 'The logo on each brand ground. On a photograph, put it on the quietest part of the frame, never across a face.', note: 'In the glass, one window for each ground',
      big: `<div class="hg-bigl">${logoModes(ctx, 'colour', 360)}</div>`,
      band: glass(ctx, 'logo-grounds', ks.map((k) => ({ value: 1, fill: cw[k].ground, name: A(nm(k)), val: '' })), { label: `The logo on ${ks.length} grounds: ${ks.map(nm).join('; ')}` }),
      body: `<ul class="hg-vers">${ks.map(cell).join('')}</ul>`,
    };
  },
  'logo-misuse'(ctx) {
    const B = ctx.brand, L = ctx.logo, cw = B.logo.colourways, slot = ctx.edition === 'slot', k0 = L.colourwayOf('colour'), w0 = cw[k0];
    const never = [['Stretch', 'Do not stretch, squash or skew it.'], ['Recolour', 'Do not recolour it outside the versions.'], ['Rotate', 'Do not rotate it.'], ['Effects', 'Do not add shadows, glows or other effects.'], ['Busy photo', 'Do not set it on a busy part of a photo.'], ['Outline', 'Do not outline it or put it in a box.']];
    const fill = slot ? w0.name : (B.colours.filter((x) => ![w0.ground, w0.name].map((c) => c.toLowerCase()).includes(x.hex.toLowerCase())).sort((a, b) => ctx.ratio(b.hex, w0.ground) - ctx.ratio(a.hex, w0.ground))[0] || {}).hex || w0.name;
    const demo = (cls, inner) => `<li><span class="hg-ver__g hg-mis ${cls}" style="background:${w0.ground};color:${w0.name}">${inner}</span></li>`;
    const demos = `<ul class="hg-vers hg-vers--3">${demo('hg-mis--s', logoCw(ctx, 'colour', k0, 200))}${slot ? demo('', slotFrame(ctx, 'colour', 200, w0.ground)) : demo('', `<span class="hg-logo" style="--lw:200px">${L.forMisuse(240, { fill })}</span>`)}${demo('hg-mis--r', logoCw(ctx, 'colour', k0, 200))}</ul>`;
    return {
      l1: 'Never.', l2: `${cap1(nWord(never.length))} things to leave alone.`, lead: 'The logo is drawn once. These are the ways it gets spoiled.', note: 'In the glass, one open window for each',
      big: `<div class="hg-bigl">${logoModes(ctx, 'colour', 360)}</div>`,
      band: glass(ctx, 'logo-misuse', never.map(([n]) => ({ value: 1, stroke: 'ink', name: n, val: '' })), { label: `${never.length} things never to do to the logo: ${never.map(([n]) => n).join(', ')}` }),
      body: `${demos}<ul class="hg-never">${never.map(([, t]) => `<li>${A(t)}</li>`).join('')}</ul>`,
    };
  },
  // ---- Colour ----
  palette(ctx) {
    const B = ctx.brand, cols = sorted(ctx), mx = cols[0].share;
    const its = cols.map((c) => ({ value: c.share, fill: c.hex, name: A(c.name), val: pct(c.share) }));
    const entry = (c) => `<li class="hg-col"><span class="hg-col__sw" style="background:${c.hex}" aria-hidden="true"></span><div class="hg-col__t"><h3 class="hg-col__n">${A(c.name)} ${v(pct(c.share))}</h3><p class="hg-p">${A(c.lands)}</p>${c.role ? `<p class="hg-q">Role: ${A(c.role)}</p>` : ''}<p class="hg-q">${v(A(c.hex))}</p></div></li>`;
    return {
      l1: `${cap1(nWord(cols.length))} colours.`, l2: 'Each one has a job.', lead: `Each colour has a share of a ${A(B.name)} page and a job. The windows are as wide as the shares.`, note: 'In the glass, the palette by share',
      big: `<ol class="hg-arches" aria-hidden="true">${cols.map((c) => `<li style="flex:${Math.max(c.share, 0.12)}"><i style="background:${c.hex};height:${Math.round(40 + 60 * c.share / mx)}%"></i></li>`).join('')}</ol>`,
      band: glass(ctx, 'palette', its, { label: `The palette by share: ${cols.map((c) => `${c.name} ${pct(c.share)}`).join(', ')}` }),
      body: `<ul class="hg-cols">${ctx.colours.map(entry).join('')}</ul>`,
    };
  },
  proportion(ctx) {
    const B = ctx.brand, cols = sorted(ctx), strong = ctx.roles.dark.action, sc = cols.find((c) => c.hex.toLowerCase() === strong.toLowerCase()) || cols[0], top = cols[0];
    const fields = (D) => shareFields(ctx, D.W);
    const its = cols.map((c) => ({ value: 0, fill: c.hex, name: A(c.name), val: pct(c.share) }));
    return {
      l1: 'How much of a page.', l2: `${A(top.name)} takes ${pct(top.share)}.`, lead: `Each field is as wide as its share of a ${A(B.name)} page. ${A(sc.name)} is the one that is kept small.`, note: 'In the glass, the page by share',
      big: `<div class="hg-bignum"><p class="hg-bignum__n hg-disp">${pct(top.share)}</p><p class="hg-q">${A(top.name)}</p></div>`,
      band: glass(ctx, 'proportion', its, { label: `The palette as fields across the band, each as wide as its share: ${cols.map((c) => `${c.name} ${pct(c.share)}`).join(', ')}`, fields, layout: () => its.map(() => ({ x: 0, w: 0 })) }),
      body: ul('hg-shares', cols.map((c) => `<span class="hg-shares__p">${v(pct(c.share))}</span><span class="hg-shares__n">${A(c.name)}</span>`)),
    };
  },
  contrast(ctx) {
    const P = ctx.pairs, first = P[0];
    const items = P.map((x) => ({ value: x.ratio, fill: x.bgHex, name: A(x.use), val: `${A(x.ratioText)} : 1` }));
    const pair = (x) => `<li class="hg-pair${ctx.ratio(x.bgHex, ctx.roles.light.surface) < 1.5 && ctx.ratio(x.bgHex, ctx.roles.dark.surface) < 1.5 ? ' hg-pair--edge' : ''}${x.large ? ' hg-pair--lg' : ''}" style="background:${x.bgHex};color:${x.fgHex}"><p class="hg-pair__r">${A(x.ratioText)}&thinsp;:&thinsp;1</p><p class="hg-pair__u">${A(x.use)}</p></li>`;
    const layout = (D) => { const o = layoutWindows(P.map((x) => x.ratio), { W: D.W, margin: D.margin, min: 3 }); return o; };
    // each pair is two windows: the ground, and one reed in from each side, the text colour
    const g = glass(ctx, 'contrast', items, { label: `Every text pair as a window as wide as its contrast: ${P.map((x) => `${x.use}, ${x.ratioText} to 1`).join('; ')}`, layout, keyNote: 'Text needs 4.5&thinsp;:&thinsp;1; type at 24&nbsp;px and over needs 3&thinsp;:&thinsp;1.' });
    return {
      l1: `${cap1(nWord(P.length))} text pairs.`, l2: 'Each one passes.', lead: 'Every pair of text and ground the brand uses, set in its own colours, with its contrast ratio.', note: 'In the glass, the contrast of each pair',
      big: `<div class="hg-aa hg-disp" style="background:${first.bgHex};color:${first.fgHex}" aria-hidden="true">Aa</div>`,
      band: g, body: `<ul class="hg-pairs">${P.map(pair).join('')}</ul>`,
    };
  },
  'colour-values'(ctx) {
    const cols = ctx.colours, L = ctx.roles.light;
    const vals = (c) => dl([['HEX', v(A(c.hex))], ['RGB', v(A(rgbOf(ctx, c.hex)))], ['OKLCH', v(A(c.oklch || ctx.C.oklchString(c.hex)))], ...(ctx.C.cmykOf(c) ? [['CMYK', v(A(ctx.C.cmykOf(c)))]] : [])], 'hg-vals');
    const roleKeys = [['surface', 'Surface'], ['raised', 'Raised'], ['text', 'Text'], ['quiet', 'Quiet text'], ['border', 'Border'], ['action', 'Action'], ['actionLabel', 'Action label'], ['focus', 'Focus']];
    const toneKeys = [['success', 'Success'], ['warning', 'Warning'], ['danger', 'Danger'], ['info', 'Info']];
    const roleList = (mode, title) => { const r = ctx.roles[mode], its = [...roleKeys.map(([k, n]) => [n, r[k]]), ...toneKeys.map(([k, n]) => [n, r[k].fg])];
      return `${h2(title)}<ul class="hg-roles">${its.map(([n, hx]) => `<li><span class="hg-roles__sw" style="background:${hx}" aria-hidden="true"></span><span class="hg-roles__n">${A(n)}</span>${v(A(hx))}</li>`).join('')}</ul>`; };
    const rl = roleKeys.filter(([k]) => L[k]);
    return {
      l1: 'Every value.', l2: 'HEX, RGB and OKLCH.', lead: 'Every colour in three notations, then the interface roles for each mode.', note: 'In the glass, the light roles',
      big: `<ol class="hg-arches" aria-hidden="true">${cols.map((c) => `<li style="flex:1"><i style="background:${c.hex};height:${70 + (cols.indexOf(c) % 3) * 12}%"></i></li>`).join('')}</ol>`,
      band: glass(ctx, 'colour-values', rl.map(([k, n]) => ({ value: 1, fill: L[k], name: n, val: A(L[k]) })), { label: `The light interface roles: ${rl.map(([, n]) => n).join(', ')}` }),
      body: `<ul class="hg-cols">${cols.map((c) => `<li class="hg-col"><span class="hg-col__sw" style="background:${c.hex}" aria-hidden="true"></span><div class="hg-col__t"><h3 class="hg-col__n">${A(c.name)}</h3>${vals(c)}</div></li>`).join('')}</ul>`
        + (ctx.tones.length ? `${h2('Tones')}<ul class="hg-cols">${ctx.tones.map((c) => `<li class="hg-col"><span class="hg-col__sw" style="background:${c.hex}" aria-hidden="true"></span><div class="hg-col__t"><h3 class="hg-col__n">${A(c.name)}</h3><p class="hg-p">${A(c.lands || '')}</p>${vals(c)}</div></li>`).join('')}</ul>` : '')
        + two(roleList('light', 'Interface roles, light'), roleList('dark', 'Interface roles, dark')),
    };
  },
  // ---- Typography ----
  typefaces(ctx) {
    const B = ctx.brand, F = B.fonts, W = ctx.weights, dW = W.heading, mW = F.mono ? F.mono.weights[0] : 400;
    const fams = [F.display.family, F.body.family, F.mono && F.mono.family].filter((f, i, a) => f && a.indexOf(f) === i);
    const sz = fitCap(ctx, F.display.family, 'display', dW, 200, 620);
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789';
    const face = (role, f, what) => `<li><p class="hg-face__n" style="font-family:var(--hg-${role});font-weight:${role === 'mono' ? mW : role === 'display' ? dW : W.regular}">${A(f.family)}</p><p class="hg-face__c" aria-hidden="true" style="font-family:var(--hg-${role});font-weight:${role === 'mono' ? mW : role === 'display' ? dW : W.regular}">${chars}</p><p class="hg-q">${what}, ${A(f.weights.map((w) => `${WEIGHT[w] || w} ${w}`).join(', '))}</p></li>`;
    const faceList = [['display', F.display, 'Display'], ['body', F.body, 'Text'], ...(F.mono ? [['mono', F.mono, 'Values']] : [])];
    return {
      l1: 'Typefaces.', l2: `${cap1(nWord(fams.length))} ${fams.length === 1 ? 'family' : 'families'}.`, lead: `${A(F.display.family)} for the line that matters, ${A(F.body.family)} for everything you read.`, note: 'In the glass, the weights of each face',
      big: `<p class="hg-face-big hg-disp" aria-hidden="true" style="font-size:${cq(sz, 620)}">${A(F.display.family)}</p>`,
      band: glass(ctx, 'typefaces', faceList.map(([, f, w], i) => ({ value: f.weights.length, fill: ['strong', 'ink', 'quiet'][i], name: A(`${f.family}, ${w.toLowerCase()}`), val: `${f.weights.length} ${f.weights.length === 1 ? 'weight' : 'weights'}` })), { label: `The faces and how many weights each carries: ${faceList.map(([, f]) => `${f.family} ${f.weights.length}`).join(', ')}` }),
      body: `<ul class="hg-faces">${faceList.map(([r, f, w]) => face(r, f, w)).join('')}</ul>${p(`${listAnd(fams)} ${fams.length > 1 ? 'are' : 'is'} open source under the SIL Open Font Licence: free in print and on screen.`)}`,
    };
  },
  hierarchy(ctx) {
    const B = ctx.brand, T = B.type, lh = (l) => (l > 4 ? `${l}px` : String(l));
    const row = (s) => { const disp = s.face === 'display', text = disp ? T.sample.headline : s.token === 'caption' && T.sample.caption ? T.sample.caption : T.sample.paragraph;
      return `<li><div class="hg-scale__k"><p class="hg-scale__t">${A(cap1(s.token))}</p><p class="hg-q">${v(`${s.size} px`)}, line ${v(lh(s.line))}, ${A(WEIGHT[s.weight] || String(s.weight))}. ${A(s.use)}</p></div><p class="hg-scale__s${disp ? ' hg-disp' : ''}" style="font-weight:${s.weight};line-height:${lh(s.line)};font-size:${s.size}px">${A(text)}</p></li>`; };
    return {
      l1: `${cap1(nWord(T.scale.length))} sizes.`, l2: 'Each in its own face.', lead: A(T.sample.paragraph), note: 'In the glass, the scale, each step as wide as its size',
      big: `<p class="hg-bigq hg-disp">${A(T.sample.headline)}</p>`,
      band: glass(ctx, 'hierarchy', T.scale.map((s) => ({ value: s.size, fill: s.face === 'display' ? 'strong' : 'ink', name: A(cap1(s.token)), val: `${s.size} px` })), { label: `The type scale, each step as wide as its size: ${T.scale.map((s) => `${s.token} ${s.size} pixels`).join(', ')}`, keyNote: 'Display steps in the strong colour, text steps in ink.' }),
      body: `<ol class="hg-scale">${T.scale.map(row).join('')}</ol>`,
    };
  },
  'type-in-use'(ctx) {
    const B = ctx.brand, S = B.type.sample, U = ctx.uiType;
    return {
      l1: 'Type in use.', l2: 'Headline, paragraph and caption.', lead: A(S.paragraph), note: 'In the glass, the interface sizes',
      big: `<p class="hg-bigq hg-disp">${A(S.headline)}</p>`,
      band: glass(ctx, 'type-in-use', U.map((u, i) => ({ value: u.size, fill: i % 2 ? 'ink' : 'strong', name: A(ctx.cap(u.token)), val: `${u.size} px` })), { label: `The interface type sizes: ${U.map((u) => `${u.token} ${u.size} pixels`).join(', ')}` }),
      body: `<div class="hg-inuse"><p class="hg-inuse__h hg-disp">${A(S.headline)}</p><p class="hg-p">${A(S.paragraph)}</p>${S.caption ? `<p class="hg-q">${A(S.caption)}</p>` : ''}</div>${h2('On screen')}<ul class="hg-ui">${U.map((u) => `<li><span class="hg-ui__t">${A(ctx.cap(u.token))}</span>${v(`${u.size}/${u.line}`)}<span class="hg-q">${A(u.use)}</span></li>`).join('')}</ul>`,
    };
  },
  'type-rules'(ctx) {
    const R = ctx.brand.type.rules;
    return {
      l1: 'Type rules.', l2: `${cap1(nWord(R.length))} things to do and not to do.`, lead: 'What to do with the type, and what not to.', note: 'In the glass, one window for each rule',
      big: `<p class="hg-bigq hg-disp">${A(R[0].do)}</p>`,
      band: glass(ctx, 'type-rules', R.map((r, i) => ({ value: 1, fill: i % 2 ? 'ink' : 'strong', name: `Rule ${i + 1}`, val: '' })), { label: `${R.length} type rules` }),
      body: rules(R),
    };
  },
  // ---- Imagery ----
  'photo-direction'(ctx) {
    const B = ctx.brand, D = B.imagery.direction, shots = B.imagery.shots;
    const rows = [['Light', D.light], ['Crop', D.crop], ['Colour', D.colour], ['People', D.people]].filter(([, x]) => x);
    return {
      l1: 'Photo direction.', l2: `${cap1(nWord(rows.length))} things to hold.`, lead: A(D.subject), note: 'In the glass, one window for each',
      big: shotBig(ctx, shotNth(shots, 0)),
      band: glass(ctx, 'photo-direction', rows.map(([k], i) => ({ value: 1, fill: i % 2 ? 'ink' : 'strong', name: k, val: '' })), { label: `The photo direction: ${rows.map(([k]) => k).join(', ')}` }),
      body: dl(rows.map(([k, x]) => [k, A(x)])),
    };
  },
  'shot-list'(ctx) {
    const B = ctx.brand, shots = B.imagery.shots, np = shots.filter((s) => s.photo).length;
    const fig = (s, i) => `<li><span class="hg-v">${String(i + 1).padStart(2, '0')}</span><figure>${s.photo ? ctx.photo(s.id, { cls: 'hg-photo', pos: FRAME[s.id] || '50% 50%', slotNote: false }) : brief(ctx, s, i)}${s.photo ? `<figcaption class="hg-q">${A(s.caption || s.alt || '')}${s.credit && !s.generated ? `<span class="hg-credit">Photo: ${A(s.credit)}.</span>` : ''}</figcaption>` : ''}</figure></li>`;
    return {
      l1: 'The shot list.', l2: `${cap1(nWord(shots.length))} shots.`, lead: np ? 'The photographs, each with its caption, and a brief for each one still to take.' : 'No photographs yet. Each frame is the brief for one shot: who, where, the crop and the light.', note: 'In the glass, one window for each shot',
      big: shotBig(ctx, shotNth(shots, 1)),
      band: glass(ctx, 'shot-list', shots.map((s, i) => ({ value: 1, fill: s.photo ? 'strong' : null, stroke: s.photo ? null : 'ink', name: `Shot ${i + 1}`, val: s.photo ? 'photo' : 'brief' })), { label: `The shot list: ${shots.length} shots, ${np} photographed and ${shots.length - np} still a brief` }),
      body: `<ul class="hg-shots">${shots.map(fig).join('')}</ul>`,
    };
  },
  'imagery-rules'(ctx) {
    const R = ctx.brand.imagery.rules, shots = ctx.brand.imagery.shots;
    return {
      l1: 'Imagery rules.', l2: `${cap1(nWord(R.length))} things to do and not to do.`, lead: 'What to do with a photograph, and what not to.', note: 'In the glass, one window for each rule',
      big: shotBig(ctx, shotNth(shots, 2)),
      band: glass(ctx, 'imagery-rules', R.map((r, i) => ({ value: 1, fill: i % 2 ? 'ink' : 'strong', name: `Rule ${i + 1}`, val: '' })), { label: `${R.length} imagery rules` }),
      body: rules(R),
    };
  },
  // ---- Layout ----
  grid(ctx) {
    const G = ctx.gridMeasures, Pg = G.page, col = String(Math.round(G.col * 10) / 10);
    const items = Array.from({ length: G.columns }, (_, i) => ({ value: 1, fill: i % 2 ? 'ink' : 'strong', name: `Column ${i + 1}`, val: '' }));
    const lay = (D) => { const k = D.W / Pg.w, s = (x) => Math.round(x * k / 12) * 12; return items.map((_, i) => { const x0 = G.margin + i * (G.col + G.gutter), a = s(x0), b = s(x0 + G.col); return { x: a, w: Math.max(12, b - a) }; }); };
    const cols = Array.from({ length: G.columns }, (_, i) => `<rect class="hg-pg__c" x="${(G.margin + i * (G.col + G.gutter)).toFixed(2)}" y="${G.margin}" width="${G.col.toFixed(2)}" height="${Pg.h - 2 * G.margin}"/>`).join('');
    const label = `The page grid: ${G.columns} columns, ${G.margin} pixel margins and ${G.gutter} pixel gutters on a ${Pg.w} by ${Pg.h} page`;
    return {
      l1: 'The grid.', l2: `${cap1(nWord(G.columns))} columns, one step of ${G.base}.`, lead: `Every page sits on one grid. The band below is that grid at its own width: each window is a column, each gap a gutter.`, note: 'In the glass, the page grid',
      big: `<svg class="hg-pg" viewBox="0 0 ${Pg.w} ${Pg.h}" role="img" aria-label="${A(label)}"><rect class="hg-pg__p" x="0" y="0" width="${Pg.w}" height="${Pg.h}"/>${cols}<rect class="hg-pg__m" x="${G.margin}" y="${G.margin}" width="${Pg.w - 2 * G.margin}" height="${Pg.h - 2 * G.margin}"/></svg>`,
      band: glass(ctx, 'grid', items, { label, layout: lay, key: false }),
      body: dl([['Page', v(`${Pg.w} × ${Pg.h}`)], ['Columns', v(String(G.columns))], ['Margin', v(`${G.margin} px`)], ['Column', v(`${col} px`)], ['Gutter', v(`${G.gutter} px`)], ['Base', v(`${G.base} px`)]]),
    };
  },
  layouts(ctx) {
    const B = ctx.brand, G = ctx.gridMeasures, sp = ctx.space, radii = ctx.radii.filter((r) => r.px < 9999);
    const space = `<ol class="hg-space">${sp.map((s) => `<li><i style="width:${s.px}px;height:${s.px}px" aria-hidden="true"></i>${v(String(s.px))}</li>`).join('')}</ol>`;
    return {
      l1: 'Layouts.', l2: `Every gap a step of ${G.base}.`, lead: `Space inside a group is smaller than the space between groups. Every gap is a step of ${v(`${G.base} px`)}.`, note: 'In the glass, the spacing steps',
      big: `<div class="hg-bigsp">${space}</div>`,
      band: glass(ctx, 'layouts', sp.map((s, i) => ({ value: s.px, fill: i % 2 ? 'ink' : 'strong', name: A(ctx.cap(s.token || String(s.px))), val: `${s.px} px` })), { label: `The spacing steps, each as wide as its size: ${sp.map((s) => `${s.px} pixels`).join(', ')}` }),
      body: two(`${h2('Spacing')}${p(`Space inside a group is smaller than the space between groups.`)}`, `${h2('Corners and edges')}${q(`Edges are ${v(`${B.ui.border} px`)}. ${A(B.ui.elevationNote || '')}`)}<ul class="hg-radii">${radii.map((r) => `<li><i style="border-radius:${r.px}px" aria-hidden="true"></i><span class="hg-q">${A(ctx.cap(r.use || r.token || ''))}, ${v(`${r.px} px`)}</span></li>`).join('')}</ul>`),
    };
  },
  // ---- Applications ----
  'business-card'(ctx) {
    const B = ctx.brand, ap = B.applications, D = ctx.roles.dark, L = ctx.roles.light;
    const url = ctx.mockup(SCENES.card, cardArt(ctx));
    const front = `<div class="hg-card" style="background:${D.surface};color:${D.text}" role="img" aria-label="Business card, front: the horizontal logo"><span class="hg-card__lg">${logoOn(ctx, 'horizontal', D.surface, 200)}</span></div>`;
    const back = `<div class="hg-card hg-card--b" style="background:${L.surface};color:${L.text}"><p class="hg-card__nm">${A(ap.card.person)}</p><p style="color:${L.quiet}">${A(ap.card.role)}</p><p class="hg-card__ct">${A(ap.card.contact)}<br>${A(ap.site.url)}</p></div>`;
    return {
      l1: 'The business card.', l2: 'Front and back.', lead: `The front on ${A(colName(ctx, D.surface) || 'the dark ground')}, the back on ${A(colName(ctx, L.surface) || 'the light ground')}.`, note: 'In the glass, the card&rsquo;s two sides',
      big: plate(url, `${B.name} business card, front and back`),
      band: glass(ctx, 'business-card', [{ value: 1, fill: D.surface, name: 'Front', val: '' }, { value: 1, fill: L.surface, name: 'Back', val: '' }], { label: 'The business card: front on the dark ground, back on the light ground' }),
      body: `<div class="hg-cards">${front}${back}</div>${dl([['Name', A(ap.card.person)], ['Role', A(ap.card.role)], ['Contact', A(ap.card.contact)], ['Site', A(ap.site.url)]])}`,
    };
  },
  social(ctx) {
    const B = ctx.brand, S = B.applications.social;
    const cell = (t, i) => { const { bg, ink } = post(ctx, i); return `<li class="hg-post" style="background:${bg};color:${ink}"><p class="hg-disp">${A(t)}</p><span class="hg-post__lg">${logoOn(ctx, 'symbol', bg, 40)}</span></li>`; };
    const fill = (i) => post(ctx, i).bg;
    return {
      l1: 'Social.', l2: `${cap1(nWord(S.length))} posts, one line each.`, lead: 'The brand&rsquo;s lines, one to a post, each on a ground of its own.', note: 'In the glass, one window for each post',
      big: `<ul class="hg-posts hg-posts--one">${cell(S[0], 0)}</ul>`,
      band: glass(ctx, 'social', S.map((t, i) => ({ value: 1, fill: fill(i), name: `Post ${i + 1}`, val: '' })), { label: `${S.length} social posts, each on its own ground` }),
      body: `<ul class="hg-posts">${S.map(cell).join('')}</ul>`,
    };
  },
  signage(ctx) {
    const B = ctx.brand, D = ctx.roles.dark, ap = B.applications;
    const SS = signScene(ctx), line = signLine(ctx);
    const url = ctx.mockup(SS.id, panelArt(ctx));
    const ink = ctx.ratio(D.text, D.action) >= ctx.ratio(D.surface, D.action) ? D.text : D.surface;
    return {
      l1: 'Signage.', l2: 'The line, big.', lead: A(ap.signage), note: 'In the glass, the poster&rsquo;s ground and its type',
      big: plate(url, `${B.name} ${SS.alt}`, SS.surface === "hoarding"),
      band: glass(ctx, 'signage', [{ value: 2, fill: D.action, name: 'Poster ground', val: '' }, { value: 1, fill: ink, name: 'Poster type', val: '' }], { label: 'The poster: its ground and the colour of its type' }),
      body: `<div class="hg-poster" style="background:${D.action};color:${ink}"><p class="hg-disp">${A(line)}</p></div>${q(`The line at poster size, on ${A(colName(ctx, D.action) || 'the strong colour')}.`)}`,
    };
  },
  'email-signature'(ctx) {
    const B = ctx.brand, ap = B.applications, E = ap.email, G = B.guideB.email;
    const sig = `<div class="hg-sig"><span class="hg-sig__lg">${logoModes(ctx, 'horizontal', 160)}</span><p class="hg-sig__n">${A(E.person)}</p><p>${A(E.role)}, ${A(B.name)}</p><p class="hg-q">${A(ap.card.contact)}<br>${A(ap.site.url)}</p></div>`;
    const mail = G ? `<div class="hg-mail"><dl class="hg-mail__h"><div><dt>To</dt><dd>${A(G.to)}</dd></div><div><dt>Subject</dt><dd>${A(G.subject)}</dd></div><div><dt>Sent</dt><dd>${A(G.time)}</dd></div></dl>${(G.body || []).map((t) => p(t)).join('')}${sig}</div>` : sig;
    return {
      l1: 'Email signature.', l2: 'Four lines, nothing more.', lead: 'The name, the role, the logo and the site. Nothing else.', note: 'In the glass, one window for each line',
      big: sig,
      band: glass(ctx, 'email-signature', ['Name', 'Role', 'Logo', 'Site'].map((n, i) => ({ value: 1, fill: i % 2 ? 'ink' : 'strong', name: n, val: '' })), { label: 'The signature: name, role, logo and site' }),
      body: `${mail}${q('The signature sits under every message, in the text face.')}`,
    };
  },
  digital(ctx) {
    const B = ctx.brand, S = B.ui.screen.content, ap = B.applications, dark = ctx.C.toOklch((B.colours.find((c) => c.role === 'ground') || B.colours[0]).hex).L < 0.4;
    const url = ctx.mockup(phoneScene(ctx),{ 'screen-phone': phoneArt(ctx, dark) });
    const toneOf = (st) => { const s = ctx.status.find((x) => x.id === st); return s && ctx.roles.light[s.tone] && ctx.roles.light[s.tone].fg ? `t-${s.tone}` : 'strong'; };
    const labelOf = (st) => { const s = ctx.status.find((x) => x.id === st); return s ? s.label : st; };
    const rows = S.deliveries;
    return {
      l1: 'Digital.', l2: 'The product, on a phone.', lead: A(S.pickup), note: 'In the glass, the screen&rsquo;s rows',
      big: plate(url, `${B.name} app, ${B.ui.screen.title} screen, on a phone`),
      band: glass(ctx, 'digital', rows.map((d) => ({ value: 1, fill: toneOf(d.status), name: A(d.to), val: A(labelOf(d.status)) })), { label: `The rows of the ${B.ui.screen.title} screen, one window each in its status colour: ${rows.map((d) => `${d.to}, ${labelOf(d.status)}`).join('; ')}`, keyNote: 'Status colours are the interface tones, so each window matches its chip on the screen.' }),
      body: `<ul class="hg-rowsl">${rows.map((d) => `<li><span class="hg-rowsl__n">${A(d.to)}</span><span class="hg-q">${A(d.when)}</span><span class="hg-q">${A(d.price)}</span><span class="hg-rowsl__s">${A(labelOf(d.status))}</span></li>`).join('')}</ul>${q(`The site is at ${A(ap.site.url)}. The components and their tokens are in the UI kit.`)}`,
    };
  },
  // ---- Close ----
  summary(ctx) {
    const B = ctx.brand, R = brandRules(B), cols = sorted(ctx), F = B.fonts;
    return {
      l1: A(B.lines.primary), l2: `${cap1(nWord(R.length))} rules to remember.`, lead: A(B.description), note: 'In the glass, one window for each rule',
      big: `<div class="hg-bigl">${logoModes(ctx, 'colour', 360)}</div>`,
      band: glass(ctx, 'summary', R.map((r, i) => ({ value: 1, fill: ['strong', 'ink', 'quiet'][i % 3], name: A(r.title), val: '' })), { label: `The ${R.length} rules: ${R.map((r) => r.title).join(', ')}` }),
      body: `<ol class="hg-say">${R.map((r, i) => `<li><span class="hg-v">${String(i + 1).padStart(2, '0')}</span><p class="hg-say__t">${A(r.title)}</p><p class="hg-say__x">${A(r.text)}</p></li>`).join('')}</ol>`
        + two(`${h2('The colours')}<ul class="hg-roles">${cols.map((c) => `<li><span class="hg-roles__sw" style="background:${c.hex}" aria-hidden="true"></span><span class="hg-roles__n">${A(c.name)}</span>${v(A(c.hex))}</li>`).join('')}</ul>`, `${h2('The faces')}${dl([['Display', A(F.display.family)], ['Text', A(F.body.family)], ...(F.mono ? [['Mono', A(F.mono.family)]] : [])])}`),
    };
  },
  'contact-scope'(ctx) {
    const B = ctx.brand, secs = ctx.sections;
    const sz = fitCap(ctx, B.contact.email, 'display', ctx.weights.heading, 56, 620);
    return {
      l1: 'Who to ask.', l2: 'And what is in here.', lead: `${A(B.contact.owner)} owns this document. Write for a logo file, a missing asset or an exception.`, note: 'In the glass, one window for each page, by section',
      big: `<p class="hg-email hg-disp" style="font-size:${cq(sz, 620)}"><a href="mailto:${A(B.contact.email)}">${A(B.contact.email)}</a></p>`,
      band: glass(ctx, 'contact-scope', secs.map((s, i) => ({ value: s.pages.length, fill: i % 2 ? 'ink' : 'strong', name: A(s.title), val: String(s.pages.length) })), { label: `The pages in this document by section: ${secs.map((s) => `${s.title} ${s.pages.length}`).join(', ')}` }),
      body: dl([['Version', v(A(B.version.number))], ['Issued', A(ctx.date)], ['Covers', 'The logo, colour, type, imagery, layout and applications. The UI kit holds the interface components.']]),
    };
  },
};

export const hasPage = (id) => Object.prototype.hasOwnProperty.call(PAGES, id);
export const pageSpec = (ctx, id) => PAGES[id](ctx);
