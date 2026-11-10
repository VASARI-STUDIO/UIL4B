// Guidelines pages for theme 02, Ticket: logo, logo-versions, clear-space, min-size, logo-grounds, logo-misuse. Styles are in css-p-logo.js
// (classes start tl-). No full tickets here: these are open Stock pages carrying the ticket's parts as edge devices. The perforation is the
// rule (horizontal between rows, vertical between a body and a stub column), serials are the running numbers, facts are set label over value,
// and small labels take the condensed stub face. The logo is always the engine's; nothing here redraws it. No hex is written here.
import { A, fit } from './helpers.js';
import { page, perf, serial, fields, inkOn, holeOn, same, hexName, NUM } from './gate.js';

const COUNT = [...NUM, 'Seven', 'Eight', 'Nine'];
// the perforation as a rule on an open Stock page: holes in the control edge (a Stock hole on Stock would vanish), 3 px at a 9 px pitch
const tear = (ctx, o = {}) => perf(ctx.roles.light.border, { d: 3, p: 9, ...o });
const tearH = (ctx, cls = '') => `<div class="tl-tear ${cls}">${tear(ctx, { dir: 'h' })}</div>`;
// a small label in the condensed stub face
const stub = (t, cls = '') => `<b class="tk-sn tl-sl ${cls}">${t}</b>`;

export const pLogo = {
  // the logo as large as the page allows, then a tear across the page and the strip below it: the serial, the idea, and a stub
  // (behind a vertical perforation) saying which version and ground this is
  logo(ctx) {
    const L = ctx.logo, B = ctx.brand, cw = B.logo.colourways.colour;
    const w = fit(ctx, 'colour', 1100, 300);
    const strip = `<div class="tl-lgft"><span class="tk-sn tl-lgft__sn">${serial(1)}</span>${fields([['The idea', A(B.logo.idea)]], 'tl-ff--idea')}
<div class="tl-lgft__stub">${tear(ctx)}${fields([['Version', A(L.labels.colour)], ['Ground', A(hexName(ctx, cw.ground))]], 'tl-ff--col')}</div></div>`;
    const inner = `<div class="tl-lg"><div class="tl-lg__mark">${L.html('colour', { width: w, color: cw.name, label: 'Your logo goes here' })}</div></div>${tearH(ctx, 'tl-tear--bleed')}${strip}`;
    return page(ctx, 'logo', inner, 'tl--logo');
  },

  // the versions numbered in reading order (No. 001 the big full colour, 002 to 005 the run under the tear, 006 and 007 the two open
  // grounds off the right edge in Night and Door red), each on the ground it is made for. The lead sits under the title, as on palette.
  'logo-versions'(ctx) {
    const L = ctx.logo, B = ctx.brand, cw = B.logo.colourways;
    const ver = (id, no, w, h, cls = '') => {
      const c = cw[L.colourwayOf(id)];
      return `<figure class="tl-v ${cls}"><span class="tk-sn">${serial(no)}</span><div class="tl-v__lg">${L.html(id, { width: fit(ctx, id, w, h), color: c.name, label: L.labels[id] })}</div><figcaption>${stub(A(L.labels[id]))}<span class="tl-v__w">${A(B.logo.when[id])}</span></figcaption></figure>`;
    };
    const runIds = ['mono-dark', 'horizontal', 'stacked', 'symbol'];
    const col = (id, no) => {
      const g = cw[L.colourwayOf(id)].ground;
      return `<div class="tl-vs__stub" style="background:${g};color:${inkOn(ctx, g)}">${ver(id, no, 168, 80)}</div>`;
    };
    const n = COUNT[L.versions.length] || L.versions.length;
    const lead = `<p class="tk-lead tl-lead">${A(n)} versions, no more. Start with full colour, and reach for another only when the ground or the space asks for it.</p>`;
    const top = `<div class="tl-vs__top">${ver('colour', 1, 560, 150, 'tl-v--lead')}</div>`;
    const run = `<div class="tl-vs__run">${runIds.map((id, i) => `<div class="tl-vs__cell">${ver(id, i + 2, 150, 64)}</div>`).join('')}</div>`;
    const inner = `${lead}<div class="tl-vs"><div class="tl-vs__body">${top}${tearH(ctx)}${run}</div>${col('mono-light', runIds.length + 2)}${col('reversed', runIds.length + 3)}</div>`;
    return page(ctx, 'logo-versions', inner, 'tl--versions');
  },

  // the clear zone drawn as a hairline round the logo (the perforation stays for tear lines): nothing crosses it. The two rules sit in
  // opposite corners, outside the zone.
  'clear-space'(ctx) {
    const L = ctx.logo, B = ctx.brand, g = L.geos.colour, cw = B.logo.colourways.colour, share = L.clearShare;
    // the widest logo whose zone (logo plus x on every side) fits between the two rules
    const maxW = 860, maxH = 300, k = L.geo.cap / g.w;
    const lw = Math.floor(Math.min(maxW / (1 + 2 * k), maxH / (g.h / g.w + 2 * k))), s = lw / g.w, lh = g.h * s, X = L.geo.cap * s;
    const zw = lw + 2 * X, zh = lh + 2 * X, r = (v) => v.toFixed(1);
    const holes = `<span class="tl-zp" aria-hidden="true"></span>`;
    const dim = (cls, st) => `<i class="tl-dim ${cls}" style="${st}"><b class="disp">x</b></i>`;
    const zone = `<div class="tl-zone" style="width:${r(zw)}px;height:${r(zh)}px">${holes}
<span class="tl-zin" style="left:${r(X)}px;top:${r(X)}px;width:${r(lw)}px;height:${r(lh)}px"></span>
${dim('tl-dim--v', `left:${r(zw * 0.3)}px;top:0;height:${r(X)}px`)}${dim('tl-dim--v', `left:${r(zw * 0.7)}px;bottom:0;height:${r(X)}px`)}${dim('tl-dim--h', `top:${r(zh / 2)}px;left:0;width:${r(X)}px`)}${dim('tl-dim--h', `top:${r(zh / 2)}px;right:0;width:${r(X)}px`)}
<div class="tl-zlogo" style="left:${r(X)}px;top:${r(X)}px">${L.html('colour', { width: lw, color: cw.name, label: 'Your logo goes here' })}</div></div>`;
    const E = ctx.edition === 'slot' ? '' : [...ctx.real(B.logo.showcase.wordmark)][0];
    const unit = ctx.edition === 'slot' ? `x is the height of the logo's tallest letter.` :`x is the height of the ${A(E)}, ${share}% of the logo's height.`;
    const inner = `<div class="tl-cs">${fields([['The zone', `Keep a clear zone around the logo, x on every side. ${unit}`]], 'tl-ff--rule tl-cs__a')}${zone}${fields([['What stays out', 'Nothing enters the zone: no type, no edges, no other logos.']], 'tl-ff--rule tl-cs__b')}</div>`;
    return page(ctx, 'clear-space', inner, 'tl--clear');
  },

  // two rows torn apart: the screen minimum (the big number) over the print minimum, each logo drawn at its true size over a ruler
  'min-size'(ctx) {
    const L = ctx.logo, m = L.minSize, cw = ctx.brand.logo.colourways.colour;
    const mmPx = (mm) => (mm * 96) / 25.4; // CSS px for a length in mm
    const row = (cls, title, big, unit, w, h, note) => `<div class="tl-ms ${cls}"><p class="disp tl-ms__n num">${big}<small>${unit}</small></p>
<div class="tl-ms__fig"><div class="tl-ms__lg">${L.html('colour', { width: w, color: cw.name, label: 'Logo' })}</div><i class="tl-ruler" style="width:${w.toFixed(1)}px"></i></div>
<div class="tl-ms__txt">${stub(title)}${fields([['Wide', `<span class="num">${big} ${unit}</span>`], ['High', `<span class="num">${h} ${unit}</span>`]], 'tl-ff--ms')}<p class="tl-ms__note">${note}</p></div></div>`;
    const inner = `<div class="tl-mss">${row('tl-ms--screen', 'Screen', m.screenPx, 'px', m.screenPx, m.screenH, 'The smallest it appears on a page or screen, drawn at 1 px to the pixel.')}${tearH(ctx, 'tl-tear--bleed')}${row('tl-ms--print', 'Print', m.printMm, 'mm', mmPx(m.printMm), m.printH, 'The smallest it prints, on any paper, drawn at true millimetres.')}</div>`;
    return page(ctx, 'min-size', inner, 'tl--min');
  },

  // the photo bleeds off the left edge with the logo in mono light on it; beside it, each ground the logo is made for, one band each,
  // torn from the next. The Stock bands are the open page; Stage and Door red run off the right edge.
  'logo-grounds'(ctx) {
    const L = ctx.logo, cw = ctx.brand.logo.colourways, S = ctx.roles.light.surface;
    const keys = ['colour', 'mono-dark', 'on-stage', 'reversed'].filter((k) => cw[k]);
    const nm = (hex) => hexName(ctx, hex);
    const band = (key, i) => {
      const c = cw[key], open = same(c.ground, S), one = same(c.name, c.sign);
      // the slot names no part of the sample logo (its name and repeat mark): it says which colours the logo takes
      const desc = ctx.edition === 'slot' ? (one ? `Logo in ${nm(c.name)}` : `Logo in ${nm(c.name)} and ${nm(c.sign)}`) : one ? `${nm(c.name)} name and mark` : `${nm(c.name)} name, ${nm(c.sign)} repeat mark`;
      const st = open ? '' : ` style="background:${c.ground};color:${inkOn(ctx, c.ground)}"`;
      // the band names its ground and its version, so two bands on one ground still read apart (the on-stage colourway draws full colour)
      const ver = (L.labels[key] || L.labels.colour).toLowerCase();
      return `<div class="tl-gb${open ? '' : ' tl-gb--ink'}"${st}>${i ? perf(holeOn(ctx, c.ground), { d: 3, p: 9, dir: 'h' }) : ''}<div class="tl-gb__lg">${L.html('colour', { width: 210, colourway: key, color: c.name, label: 'Logo' })}</div><p class="tl-gb__c">${stub(`On ${A(nm(c.ground))}, ${ver}`)}<span>${A(desc)}</span></p></div>`;
    };
    const ml = cw['mono-light'];
    const names = [...new Set(keys.map((k) => nm(cw[k].ground)))].map(A);
    const photo = `<figure class="tl-gp"><div class="tl-gp__img">${ctx.photo('queue', { cls: 'tl-gp__fill' })}<span class="tl-gp__lg">${L.html('mono-light', { width: 220, colourway: 'mono-light', color: ml.name, label: 'Logo' })}</span></div>
<figcaption class="tl-gp__c">${stub('On a photo')}<span>Mono light, on a dark area of the picture, clear of faces and edges.</span></figcaption></figure>`;
    const lead = `<p class="tk-lead tl-lead">The logo sits on ${names.slice(0, -1).join(', ')} and ${names.at(-1)}, each in its own colourway. On a photo it goes in mono light.</p>`;
    const inner = `${lead}<div class="tl-gr">${photo}<div class="tl-gr__side">${tear(ctx)}<div class="tl-gbs">${keys.map(band).join('')}</div></div></div>`;
    return page(ctx, 'logo-grounds', inner, 'tl--grounds');
  },

  // one fault drawn large with the page's one line; under a tear, the other five as a run of stubs, each with its serial, the logo
  // drawn wrong, the fault and the reason. No stamps: the drawing is the fault.
  'logo-misuse'(ctx) {
    const L = ctx.logo, B = ctx.brand, w = 150;
    const off = ctx.C.toOklch(ctx.colours.find((c) => c.role === 'action').hex), wrong = ctx.C.fromOklch(0.72, off.C, (off.H + 180) % 360);
    // a busy ground drawn as vertical bars in the brand's own colours, in uneven widths
    const widths = [34, 12, 52, 20, 9, 44, 16, 28, 60, 14, 38, 22, 11, 48, 26, 18, 56, 10, 32, 24, 42, 15, 30, 54];
    let x = 0; const bars = widths.map((bw, i) => { const e = `<rect x="${x}" y="0" width="${bw}" height="200" fill="${ctx.colours[(i * 3 + (i >> 2)) % ctx.colours.length].hex}"/>`; x += bw; return e; }).join('');
    const busy = `<svg class="tl-busy" viewBox="0 0 ${x} 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${bars}</svg>`;
    const lit = ctx.C.hexToRgb(B.logo.colourways.colour.sign).join(',');
    const items = [
      ['re', 'Recoloured', 'Use a colourway from the versions page.', L.forMisuse(w, { fill: wrong })],
      ['ro', 'Rotated', 'It sits level with the page.', `<div style="transform:rotate(-14deg)">${L.forMisuse(w)}</div>`],
      ['ef', 'Effects', 'No shadows, glows or bevels.', `<div style="filter:drop-shadow(5px 6px 4px rgba(${lit},0.6))">${L.forMisuse(w)}</div>`],
      ['bu', 'Busy ground', 'Never on a busy ground. Mono light on a dark area of a photo.', `${busy}<span class="tl-onbusy">${L.forMisuse(w - 20)}</span>`],
      ['bo', 'Outlined or boxed', 'No outlines, boxes or frames around it.', `<div class="tl-boxed">${L.forMisuse(w - 40)}</div>`],
    ];
    const big = `<div class="tl-mu__top"><figure class="tl-mu__big"><div class="tl-mu__art"><div style="transform:scale(1.35,0.7)">${L.forMisuse(520)}</div></div></figure>
<div class="tl-mu__say"><span class="tk-sn">${serial(1)}</span>${stub('Stretched', 'tl-sl--big')}<p class="tl-mu__why">Scale it evenly, never squash or stretch it.</p></div></div>`;
    const lead = `<p class="tk-lead tl-lead">Six ways the logo goes wrong. Use the supplied files as they are, and none of these.</p>`;
    // the five share the one tear above them and are split by the grid's gutter, not by perforations
    const run = `<div class="tl-mu__run">${items.map(([a, t, cap, html], i) => `<figure class="tl-mi tl-mi--${a}"><span class="tk-sn">${serial(i + 2)}</span><div class="tl-mi__art">${html}</div><figcaption>${stub(t)}<span>${cap}</span></figcaption></figure>`).join('')}</div>`;
    return page(ctx, 'logo-misuse', `${lead}<div class="tl-mu">${big}${tearH(ctx, 'tl-tear--bleed')}${run}</div>`, 'tl--misuse');
  },
};
