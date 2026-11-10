// Guidelines pages for theme 08, Riso: logo, logo-versions, clear-space, min-size, logo-grounds, logo-misuse. Styles are in
// css-p-logo.js (classes start rl-). The logo is a print job: the name and the plate each print on a drum, so the logo page shows it
// as separations (each drum's layer alone, then the composite larger), and every printed version carries the job line of its drums.
// Every figure is a printed sheet (the gate's r-sheet) with registration crosses at its corners. The logo is always the engine's own:
// a separation is the real logo with the other drums' parts left unprinted (css-p-logo.js hides a path by its fill).
import { A, fit } from './helpers.js';
import { page, corners, drums, drumNo, paper, byRole, readInk, isSurface, Word } from './guidelines-r.js';

const same = (a, b) => a.toLowerCase() === b.toLowerCase();
const hx = (h) => String(h).toLowerCase();
// a brand colour's name for a hex (the colourways give hex only), else the hex
const nameOfHex = (ctx, hex) => (ctx.colours.find((c) => same(c.hex, hex)) || { name: hex }).name;
// a list in words: "Ink", "Ink and Blush", "Ink, Vermilion and Blush" (the items are already escaped)
const and = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
// the page's name in the contents is its H1: one name per page
const titleOf = (ctx, id) => A(ctx.pages.find((p) => p.id === id).title);
const lab = (w) => (w < 150 ? 'Logo' : 'Your logo goes here');

// the drums a colourway needs: those of its ground, name and plate colours that are not the paper, in drum order
const drumsOf = (ctx, cw) => drums(ctx).filter((d) => [cw.ground, cw.name, cw.plate].some((h) => same(h, d.hex)));
// what a drum prints of a colourway: its ground, the name, the plate
const prints = (cw, d) => and([[cw.ground, 'the ground'], [cw.name, 'the name'], [cw.plate, 'the plate']].filter(([h]) => same(h, d.hex)).map(([, t]) => t));

// the job line, copied from p-image.js so every lane prints one form: each drum the sheet prints, in drum order, its name in its own
// ink where that reads, then what it carries; whatever is in the paper's colour is the paper showing through; a tone that is no drum
// is named as it is. One change: a line with no drum (the logo knocked out of a photograph) starts at the paper showing through.
const drumOf = (ctx, hex) => drums(ctx).find((c) => hx(c.hex) === hx(hex));
const toneOf = (ctx, hex) => { const c = ctx.colours.find((x) => hx(x.hex) === hx(hex)) || ctx.tones.find((x) => hx(x.hex) === hx(hex)); return c ? c.name : ''; };
function job(ctx, uses, photo = false) {
  const D = drums(ctx), p = paper(ctx), by = new Map(), through = [], other = [];
  for (const [hex, what] of uses) {
    const c = drumOf(ctx, hex);
    if (c) { if (!by.has(c)) by.set(c, []); if (!by.get(c).includes(what)) by.get(c).push(what); } else if (isSurface(ctx, hex) || hx(hex) === hx(p.hex)) through.push(what); else other.push([toneOf(ctx, hex), what]);
  }
  const used = D.filter((c) => by.has(c));
  const parts = used.map((c) => `<span class="rl-jd"><i class="rl-sw" style="background:${c.hex}"></i><b style="color:${readInk(ctx, c.hex)}">Drum ${drumNo(ctx, c)} ${A(c.name)}</b>: ${by.get(c).join(', ')}.</span>`);
  const n = used.length, lead = n ? `<span class="rl-jn">${Word(n)} drum${n === 1 ? '' : 's'} on ${A(p.name)}.</span>` : '';
  const show = through.length ? ` <span>The paper shows through for ${through.join(', ')}.</span>` : '';
  const rest = other.map(([nm, what]) => ` <span>${A(nm)}: ${what}.</span>`).join('');
  const ph = photo ? ' <span class="rl-jn">The photograph keeps its own colour: no drum prints over it.</span>' : '';
  return `<p class="rl-job">${`${lead} ${parts.join(' ')}${show}${rest}${ph}`.trim()}</p>`;
}
// a colourway's parts as the job line's uses, one per colour: the ground (unless it is the bare paper), the name, the plate.
// drumsOnly leaves out the parts that are bare paper, where the caption above has already named their colour.
function uses(ctx, cw, drumsOnly = false) {
  const out = [];
  for (const [h, t] of [[cw.ground, 'the ground'], [cw.name, 'the name'], [cw.plate, 'the plate']]) {
    if (t === 'the ground' && isSurface(ctx, h)) continue;
    if (drumsOnly && !drumOf(ctx, h)) continue;
    const u = out.find((x) => same(x[0], h)); if (u) u[2].push(t); else out.push([h, '', [t]]);
  }
  return out.map(([h, , ts]) => [h, and(ts)]);
}
// the crosses on a sheet print in whichever ink of its job shows on the paper: the ground's when printed, else the name's
const xInk = (ctx, cw) => (isSurface(ctx, cw.ground) ? cw.name : cw.ground);

// one drum's layer of a version: the real logo with only that drum's parts printed. In the slot edition it is the slot frame in that
// drum's ink, keeping its words only where the ink reads as text on the paper.
function layer(ctx, id, w, d, key = 'colour') {
  const cw = ctx.brand.logo.colourways[key];
  if (ctx.edition === 'slot') return `<div class="rl-lay ${readInk(ctx, d.hex) === d.hex ? '' : 'rl-nolab'}">${ctx.logo.html(id, { width: w, colourway: key, color: d.hex, label: lab(w) })}</div>`;
  return `<div class="rl-lay rl-only--${drumNo(ctx, d)}">${ctx.logo.html(id, { width: w, colourway: key, color: cw.name, label: lab(w) })}</div>`;
}
// fields, label over value
const fields = (rows, cls = '') => `<dl class="rl-f ${cls}">${rows.map(([k, v]) => `<div><dt>${A(k)}</dt><dd>${v}</dd></div>`).join('')}</dl>`;
// a figure's caption: its bold name, a line on its use, then the job line (already a paragraph) and anything else
const cap = (title, use, jobLine = '', extra = '') => `<figcaption class="rl-cap"><p class="rl-t">${title}</p>${use ? `<p class="rl-use">${use}</p>` : ''}${jobLine}${extra}</figcaption>`;

export const pLogo = {
  // separations: each drum the logo prints on, its layer alone on its own sheet, side by side; then the composite, large, with its
  // job line and the colours of its three parts
  logo(ctx) {
    const L = ctx.logo, B = ctx.brand, cw = B.logo.colourways.colour, D = drumsOf(ctx, cw).filter((d) => !same(d.hex, cw.ground));
    const ws = fit(ctx, 'colour', 190, 82), wc = fit(ctx, 'colour', 420, 250);
    const sep = (d) => `<figure class="rl-sep"><div class="r-sheet rl-sep__sh">${corners(d.hex, 13)}${layer(ctx, 'colour', ws, d)}</div><figcaption class="rl-sep__c">${job(ctx, [[d.hex, prints(cw, d)]])}</figcaption></figure>`;
    const comp = `<figure class="rl-comp"><div class="r-sheet rl-comp__sh">${corners(xInk(ctx, cw), 17)}<div class="rl-lay">${L.html('colour', { width: wc, colourway: 'colour', color: cw.name, label: lab(wc) })}</div></div>`
      + cap(A(L.labels.colour), A(B.logo.when.colour), job(ctx, uses(ctx, cw)), fields([['Ground', A(nameOfHex(ctx, cw.ground))], ['Name', A(nameOfHex(ctx, cw.name))], ['Plate', A(nameOfHex(ctx, cw.plate))]], 'rl-f--row')) + '</figure>';
    return page(ctx, 'logo', `<div class="r-top"><h1 class="r-h1">The logo</h1><p class="r-lead rl-idea">${A(B.logo.idea)}</p></div><div class="rl-body rl-body--logo"><div class="rl-seps" style="grid-template-columns:repeat(${D.length},minmax(0,1fr))">${D.map(sep).join('')}</div>${comp}</div>`, 'rl-pg');
  },

  // the versions grouped by the drums they need, the default printed large at the head of its group; each sheet in a group is as
  // wide as its version's shape asks, so the run reads as a stack of different jobs, not a grid. The group head names the drums, so
  // only the default carries a job line; the others keep their use.
  'logo-versions'(ctx) {
    const L = ctx.logo, B = ctx.brand, CW = B.logo.colourways;
    const ids = ['colour', 'mono-dark', 'mono-light', 'reversed', 'symbol', 'horizontal', 'stacked'].filter((id) => L.geos[id] && CW[L.colourwayOf(id)]);
    const groups = [];
    for (const id of ids) { const k = drumsOf(ctx, CW[L.colourwayOf(id)]).map((d) => d.id).join(' '), g = groups.find((x) => x.k === k); if (g) g.ids.push(id); else groups.push({ k, ids: [id] }); }
    const sheet = (id, big) => {
      const key = L.colourwayOf(id), cw = CW[key], w = big ? fit(ctx, id, 330, 140) : fit(ctx, id, 170, 52);
      const grow = big ? 1 : Math.max(1, Math.min(2.4, (w + 40) / 120)).toFixed(2);
      return `<figure class="rl-v ${big ? 'rl-v--big' : ''}" style="flex-grow:${grow}"><div class="r-sheet rl-v__sh">${corners(xInk(ctx, cw), 11)}<div class="rl-v__pr ${isSurface(ctx, cw.ground) ? '' : 'is-solid'}" style="background:${cw.ground}">${L.html(id, { width: w, colourway: key, color: cw.name, label: lab(w) })}</div></div>`
        + cap(A(L.labels[id]), A(B.logo.when[id]), big ? job(ctx, uses(ctx, cw)) : '') + '</figure>';
    };
    const group = (gr, gi) => { const D = drumsOf(ctx, CW[L.colourwayOf(gr.ids[0])]), big = gi === 0 && gr.ids[0] === 'colour';
      const rest = big ? gr.ids.slice(1) : gr.ids;
      return `<section class="rl-vg"><h2 class="r-tg__h">${Word(D.length)} drum${D.length === 1 ? '' : 's'}, ${and(D.map((d) => A(d.name)))}</h2>${big ? `<div class="rl-vrow">${sheet(gr.ids[0], true)}</div>` : ''}${rest.length ? `<div class="rl-vrow">${rest.map((id) => sheet(id, false)).join('')}</div>` : ''}</section>`; };
    return page(ctx, 'logo-versions', `<div class="r-top"><h1 class="r-h1">${titleOf(ctx, 'logo-versions')}</h1><p class="r-lead">${Word(ids.length)} versions. Start with full colour. Reach for another only when the ground or the space asks for it.</p></div><div class="rl-body rl-body--ver">${groups.map(group).join('')}</div>`, 'rl-pg');
  },

  // one sheet, down to the foot margin: the logo in its clear zone, the zone hatched as the edge of a sheet the drum cannot print,
  // x marked on all four sides; on the left, a bracket measures x off the capital L itself. The rule and the measures sit beneath.
  'clear-space'(ctx) {
    const L = ctx.logo, B = ctx.brand, g = L.geos.colour, cw = B.logo.colourways.colour, slot = ctx.edition === 'slot';
    const room = 584, lw = Math.min(470, room / (1 + (2 * L.geo.cap) / g.w)), s = lw / g.w, lh = g.h * s, X = L.geo.cap * s, zw = lw + 2 * X, zh = lh + 2 * X, r = (v) => v.toFixed(1);
    const unit = slot ? `x is ${L.clearShare}% of the logo's height` : `x is the height of the capital L, ${L.clearShare}% of the logo's height`;
    // the L's cap top in the logo: the name's baseline sits the descender's depth above the logo's foot (the brand's plugin gives desc)
    const capTop = L.geo.desc === undefined ? null : g.h - L.geo.desc - L.geo.cap;
    const bracket = !slot && capTop !== null;
    const band = (pos, w, h) => `<span class="rl-xb" style="${pos};width:${r(w)}px;height:${r(h)}px"><i>x</i></span>`;
    const hatch = `<svg class="rl-hatch" width="${r(zw)}" height="${r(zh)}" aria-hidden="true"><defs><pattern id="rl-hz" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0.5H6" stroke="currentColor" stroke-width="1" fill="none"/></pattern></defs><rect width="100%" height="100%" fill="url(#rl-hz)"/></svg>`;
    // the bracket: a 1 px Ink rule as tall as the L's capitals, ticked at both ends towards the L, x beside it
    const by = X + capTop * s, bx = Math.round(X - 10) + 0.5, bh = Math.round(X);
    const brk = bracket ? `<svg class="rl-brk" style="left:0;top:${r(by)}px" width="${r(X)}" height="${bh + 1}" aria-hidden="true"><path d="M${bx} 0.5V${bh + 0.5}M${bx} 0.5H${r(X - 2)}M${bx} ${bh + 0.5}H${r(X - 2)}" stroke="currentColor" stroke-width="1" fill="none"/></svg>`
      + `<span class="rl-xb rl-xb--brk" style="left:0;top:${r(by)}px;width:${r(X - 12)}px;height:${bh}px"><i>x</i></span>` : '';
    const zone = `<div class="rl-zone" style="width:${r(zw)}px;height:${r(zh)}px">${hatch}`
      + `${band(`left:${r(X)}px;top:0`, lw, X)}${band(`left:${r(X)}px;bottom:0`, lw, X)}${bracket ? '' : band(`left:0;top:${r(X)}px`, X, lh)}${band(`right:0;top:${r(X)}px`, X, lh)}`
      + `<div class="rl-zin" style="left:${r(X)}px;top:${r(X)}px;width:${r(lw)}px;height:${r(lh)}px;background:${cw.ground}">${L.html('colour', { width: +r(lw), colourway: 'colour', color: cw.name, label: 'Your logo goes here' })}</div>${brk}</div>`;
    // under the sheet, three columns: the figure's caption, what stays out of the zone, and the zone's measures
    const side = `<section class="rl-cz2"><h2 class="r-tg__h">Inside the zone</h2><p class="rl-use">Nothing enters it: no type, no edges, no other logos. Keep it as you would the edge of a riso sheet, where the drum cannot print.</p></section>`
      + `<section class="rl-cz3">${fields([['Measured', 'From the edge of the logo'], ['On', 'All four sides'], ['x', `<span class="num">${L.clearShare}%</span> of the logo's height`]])}</section>`;
    const fig = `<figure class="rl-cz"><div class="r-sheet rl-cz__sh">${corners(xInk(ctx, cw), 17)}${zone}</div>${cap('The clear zone', 'The zone, measured from the edge of the logo on all four sides.', '', side)}</figure>`;
    return page(ctx, 'clear-space', `<div class="r-top"><h1 class="r-h1">Clear space</h1><p class="r-lead">Keep a clear zone around the logo, x on every side. ${A(unit)}.</p></div><div class="rl-body rl-body--cz">${fig}</div>`, 'rl-pg');
  },

  // a size ladder on one long sheet: the logo stepping down to its smallest screen width, every step at one pixel to the pixel, the
  // smallest ruled; then the print minimum at true millimetres on a short sheet with a millimetre rule
  'min-size'(ctx) {
    const L = ctx.logo, m = L.minSize, cw = ctx.brand.logo.colourways.colour;
    const mmPx = (mm) => (mm * 96) / 25.4;
    // three times, one and a half times, then the smallest itself: the widest step still fits the sheet
    const steps = [3, 1.5, 1].map((k) => Math.round(m.screenPx * k));
    const rule = (w) => `<svg class="rl-rl" width="${Math.ceil(w) + 1}" height="9" viewBox="0 0 ${Math.ceil(w) + 1} 9" aria-hidden="true"><path d="M0.5 0.5v8M${(Math.round(w) + 0.5).toFixed(1)} 0.5v8M0.5 4.5H${(Math.round(w) + 0.5).toFixed(1)}" stroke="currentColor" stroke-width="1" fill="none"/></svg>`;
    const mmRule = (mm) => { const W = Math.round(mmPx(mm)) + 1; let t = ''; for (let i = 0; i <= mm; i++) t += `M${(Math.round(mmPx(i)) + 0.5).toFixed(1)} 0v${i % 5 === 0 ? 9 : 5}`;
      return `<svg class="rl-rl" width="${W}" height="10" viewBox="0 0 ${W} 10" aria-hidden="true"><path d="${t}M0 0.5H${W}" stroke="currentColor" stroke-width="1" fill="none"/></svg>`; };
    const step = (w, i) => { const min = i === steps.length - 1;
      return `<li class="rl-st ${min ? 'is-min' : ''}">${L.html('colour', { width: w, colourway: 'colour', color: cw.name, label: lab(w) })}${min ? rule(w) : ''}<p class="rl-st__w"><span class="num">${w} px</span>${min ? ' <b>Smallest</b>' : ''}</p></li>`; };
    const screen = `<figure class="rl-ms"><div class="r-sheet rl-ms__sh">${corners(xInk(ctx, cw), 13)}<ol class="rl-lad">${steps.map(step).join('')}</ol></div>`
      + cap('Screen', 'The smallest it appears on a page or screen.', '', fields([['Wide', `<span class="num">${m.screenPx} px</span>`], ['High', `<span class="num">${m.screenH} px</span>`]], 'rl-f--row')) + '</figure>';
    const pw = mmPx(m.printMm);
    const print = `<figure class="rl-mp"><div class="r-sheet rl-mp__sh">${corners(xInk(ctx, cw), 11)}<div class="rl-mp__l">${L.html('colour', { width: +pw.toFixed(1), colourway: 'colour', color: cw.name, label: 'Logo' })}${mmRule(m.printMm)}</div></div>`
      + cap('Print', 'The smallest it prints, on any paper.', '', fields([['Wide', `<span class="num">${m.printMm} mm</span>`], ['High', `<span class="num">${m.printH} mm</span>`]], 'rl-f--row')) + '</figure>';
    const note = `<section class="rl-msn"><h2 class="r-tg__h">Drawn at actual size</h2><p class="rl-use">On screen at one pixel to the pixel. In print at true millimetres. The rule under the print minimum is marked in millimetres.</p></section>`;
    return page(ctx, 'min-size', `<div class="r-top"><h1 class="r-h1">${titleOf(ctx, 'min-size')}</h1><p class="r-lead">The logo never goes smaller than these widths.</p></div><div class="rl-body rl-body--ms">${screen}<div class="rl-msb">${print}${note}</div></div>`, 'rl-pg');
  },

  // each ground the logo sits on, as its own printed sheet holding only the logo, centred: the bare paper large at the left with the
  // photo beneath it, the drums' solids stacked at the right at one width and one ratio (16 : 10). Every caption sits under its sheet:
  // the ground and the logo's colours, then the job line.
  'logo-grounds'(ctx) {
    const L = ctx.logo, CW = ctx.brand.logo.colourways;
    const keys = ['colour', 'on-blush', 'on-vermilion', 'reversed'].filter((k) => CW[k]);
    const names = keys.map((k) => A(nameOfHex(ctx, CW[k].ground)));
    const ml = CW['mono-light'];
    const photo = `<figure class="rl-gp"><div class="rl-gp__ph">${ctx.photo('late', { cls: 'rl-fillimg', pos: '50% 50%' })}${ml ? `<span class="rl-onph">${L.html('mono-light', { width: 150, colourway: 'mono-light', color: ml.name, label: 'Logo' })}</span>` : ''}</div>`
      + cap('On a photo', 'Mono light, on a quiet dark part of the picture. Keep it clear of faces and edges.', ml ? job(ctx, uses(ctx, { ...ml, ground: paper(ctx).hex })) : '', fields([['Colourway', 'Mono light']], 'rl-f--row')) + '</figure>';
    const colours = (cw) => (same(cw.name, cw.plate) ? `Name and plate in ${A(nameOfHex(ctx, cw.name))}.` : `Name in ${A(nameOfHex(ctx, cw.name))}, plate in ${A(nameOfHex(ctx, cw.plate))}.`);
    const ground = (k, i) => { const cw = CW[k], solid = !isSurface(ctx, cw.ground), w = i === 0 ? 220 : 116;
      const logo = L.html('colour', { width: w, colourway: k, color: cw.name, label: lab(w) });
      return `<figure class="rl-gc ${i === 0 ? 'rl-gc--paper' : ''}"><div class="r-sheet rl-gc__sh">${corners(xInk(ctx, cw), i === 0 ? 15 : 11)}${solid ? `<div class="rl-gc__solid" style="background:${cw.ground}">${logo}</div>` : `<div class="rl-gc__solid">${logo}</div>`}</div>`
        + `<figcaption class="rl-cap"><p class="rl-gc__h"><b>On ${A(nameOfHex(ctx, cw.ground))}.</b> ${colours(cw)}</p>${job(ctx, uses(ctx, cw, true))}</figcaption></figure>`; };
    const left = `<div class="rl-gl">${keys.length ? ground(keys[0], 0) : ''}${photo}</div>`;
    const right = `<div class="rl-gr">${keys.slice(1).map((k, i) => ground(k, i + 1)).join('')}</div>`;
    return page(ctx, 'logo-grounds', `<div class="r-top"><h1 class="r-h1">${titleOf(ctx, 'logo-grounds')}</h1><p class="r-lead">The logo sits on ${and(names)}, each in its own colourway. On a photo it goes in mono light.</p></div><div class="rl-body rl-body--gr">${left}${right}</div>`, 'rl-pg');
  },

  // the wrong uses in two runs: the press faults large (off register, the wrong drum, a tint under it), the first one largest; then
  // the file faults imposed on one waste sheet, three over two, cut apart at crop marks, each piece as big as its fault needs.
  // Each is the real logo, its fault and its reason; the heads and the reasons say they are wrong, so no badge does.
  'logo-misuse'(ctx) {
    const L = ctx.logo, B = ctx.brand, cw = B.logo.colourways.colour, act = byRole(ctx, 'action'), acc = byRole(ctx, 'accent'), p = paper(ctx);
    const D = drumsOf(ctx, cw).filter((d) => !same(d.hex, cw.ground)), slot = ctx.edition === 'slot';
    const rgb = ctx.C.hexToRgb(cw.name).join(',');
    // off register: the first drum's layer in place, every other drum's layer and its own crosses shifted right and down by the same
    // amount (9% of the logo's width, so the plate's edge visibly leaves the L), so the corners double up the way a printer sees it on the sheet
    const ow = 240, o = Math.max(8, Math.round(ow * 0.09));
    const off = `<div class="rl-off">${D.map((d, i) => `<div class="${i ? 'rl-off__b' : 'rl-off__a'}"${i ? ` style="transform:translate(${o}px,${o}px)"` : ''}>${layer(ctx, 'colour', ow, d)}</div>`).join('')}</div>`;
    const offX = D.slice(1).map((d) => `<div class="rl-reg" style="transform:translate(${o}px,${o}px)">${corners(d.hex, 11)}</div>`).join('');
    // a tint: the accent drum screened to dots at 45 degrees, 3 px apart, 1 px across, in its own solid ink
    const tint = (w) => `<div class="rl-tint"><svg class="rl-scr" aria-hidden="true"><defs><pattern id="rl-dots" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><circle cx="1.5" cy="1.5" r="0.5" fill="${acc.hex}"/></pattern></defs><rect width="100%" height="100%" fill="url(#rl-dots)"/></svg><div class="rl-tint__l">${L.html('colour', { width: w, colourway: 'colour', color: cw.name, label: lab(w) })}</div></div>`;
    const n = ctx.colours.length, cells = Array.from({ length: 36 }, (_, i) => `<i style="background:${ctx.colours[(i * 5 + (i >> 1) * 3 + Math.floor(i / 6)) % n].hex}"></i>`).join('');
    const press = [
      ['Off register', 'Never print the drums out of line. Proof the first sheet and line the plate up with the name before the run.', off, offX],
      ['The wrong drum', `Never recolour it. The name prints in ${A(nameOfHex(ctx, cw.name))}; use a colourway from the versions page.`, L.forMisuse(108, { fill: act.hex })],
      ['A tint under it', `Never print it over a tint. Set it on bare ${A(p.name)} or on a solid from the grounds page.`, tint(108)],
    ];
    const w = 84;
    // the file faults, each with its piece's shape: stretched wide and short, rotated square, the busy ground largest
    const file = [
      ['Stretched', 'Never squash or stretch it. Scale it evenly.', `<div style="transform:scale(1.35,0.7)">${L.forMisuse(w + 16)}</div>`, 'st'],
      ['Rotated', 'Never tilt or turn it. It sits level with the page.', `<div style="transform:rotate(-14deg)">${L.forMisuse(w)}</div>`, 'ro'],
      ['Effects', 'No shadows, glows or bevels.', `<div style="filter:drop-shadow(5px 6px 4px rgba(${rgb},0.55))">${L.forMisuse(w)}</div>`, 'fx'],
      ['Busy ground', `Never over a busy ground. Use a flat ${A(p.name)}, or mono light on a quiet part of a photo.`, `<div class="rl-busy">${cells}</div><span class="rl-onbusy ${slot ? 'rl-onbusy--slot' : ''}">${L.forMisuse(w + 20)}</span>`, 'bu'],
      ['Outlined or boxed', 'No outlines, no boxes, no frames around it.', `<div class="rl-boxed">${L.forMisuse(w - 24)}</div>`, 'bx'],
    ];
    const item = ([t, why, html, over = ''], cls) => `<figure class="rl-m ${cls}"><div class="r-sheet rl-m__sh">${corners(cw.name, 11)}${over}<div class="rl-m__pr">${html}</div></div>${cap(A(t), why)}</figure>`;
    // crop marks at a piece's four corners, standing off the trim by 4 px
    const crop = `<span class="rl-cm" aria-hidden="true">${['tl-h', 'tl-v', 'tr-h', 'tr-v', 'bl-h', 'bl-v', 'br-h', 'br-v'].map((k) => `<i class="rl-cm--${k}"></i>`).join('')}</span>`;
    const piece = ([t, why, html, k]) => `<figure class="rl-pc rl-pc--${k}"><div class="rl-pc__tr">${crop}<div class="rl-pc__pr">${html}</div></div><figcaption class="rl-pc__c"><b>${A(t)}.</b> ${why}</figcaption></figure>`;
    const waste = `<div class="r-sheet rl-ws">${corners(cw.name, 11)}<div class="rl-ws__r rl-ws__r--3">${file.slice(0, 3).map(piece).join('')}</div><div class="rl-ws__r rl-ws__r--2">${file.slice(3).map(piece).join('')}</div></div>`;
    const head = (t) => `<h2 class="r-tg__h">${t}</h2>`;
    return page(ctx, 'logo-misuse', `<div class="r-top"><h1 class="r-h1">${titleOf(ctx, 'logo-misuse')}</h1><p class="r-lead">${Word(press.length + file.length)} wrong uses. Use the supplied files as they are, and none of these.</p></div>`
      + `<div class="rl-body rl-body--mu"><section>${head('On the press')}<div class="rl-mp3">${item(press[0], 'rl-m--big')}<div class="rl-mcol">${press.slice(1).map((x) => item(x, 'rl-m--mid')).join('')}</div></div></section>`
      + `<section class="rl-mfile">${head('In the file')}${waste}</section></div>`, 'rl-pg');
  },
};
