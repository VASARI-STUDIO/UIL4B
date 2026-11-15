// Theme 31, Contact sheet, lane g2: the logo pages after `logo` (logo-versions, clear-space, min-size, logo-grounds, logo-misuse).
// Each page keeps the device: the strip with its circled frame, the caption column at x 996 that names the circled frame, the foot.
// Under the strip each page is a darkroom job on the frame grid (stage x 60 to 972, y 316 to 936): a bracket of exposures, an enlargement
// with its crop marks, a print at actual size beside a 35 mm gate, a print with the logo set where the photograph is measured quietest,
// and two strips of rejects crossed out in grease pencil. Colours come from ctx roles and brand data; no brand colour id, hex or name is written here.
// In the slot edition the logo is the engine's slot frame and the brand's own words (logo uses, the imagery rule) are placeholders.
import { A, tokens, palette, put, hline, adv, wrap, fitLines, shell, captionHead, px, rollOf, frameLabel } from './helpers.js';
import { cut, photoFrame, photoShot, photoScene } from './arts.js';
import { grids, boxStats } from './lane-g2-photo.js';

// ---- shared bits, copied from guidelines.js (its helpers are not exported) ----
const frameFn = (ctx) => (setup, k, w, h, f, v = 0) => (setup === 'photo' ? photoFrame(ctx, k, w, h, v) : cut(ctx, setup, k, w, h, 'Frame ' + f));
const page = (ctx, id, body) => shell(ctx, id, tokens(ctx), body, frameFn(ctx));
const capNo = (ctx, id) => String(ctx.pageNo(id)).padStart(2, '0');
const label = (ctx, x, y, t, w = 444) => put(ctx, { x, y, w, h: 16, cls: 'nl', role: 'chrome', size: 12, line: 16, weight: 500, html: A(t) });
const small = (ctx, x, y, w, h, html, extra = '') => put(ctx, { x, y, w, h, role: 'body', size: 12, line: 18, style: `font:400 12px/18px var(--body);color:var(--soft);white-space:normal;${extra}`, html });
const text14 = (ctx, x, y, w, t) => { const n = wrap(ctx, 'body', t, 14, w - 2, 0, 400).length; return { h: 22 * n, html: put(ctx, { x, y, w, h: 22 * n, cls: 'cx', html: A(t) }) }; };
const titleCase = (s) => s.replace(/-/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
const r2 = (n) => Math.round(n * 100) / 100;
const isSlot = (ctx) => ctx.edition === 'slot';
function headline(ctx, x, y, text, size0, lineH, w, maxLines, minSize = 28) {
  const wt = ctx.weights.heading, f = fitLines(ctx, 'display', text, size0, w - 2, maxLines, -0.01, wt, 4, minSize), lh = Math.round(f.size * lineH / size0);
  return { h: f.lines.length * lh, html: f.lines.map((l, i) => put(ctx, { x, y: y + i * lh, w, h: lh, cls: 'disp', role: 'display', size: f.size, line: lh, weight: wt, style: `font-size:${f.size}px`, html: A(l) })).join('') };
}
// whole sentences of `text` that wrap into at most `maxLines`
function sentencesFit(ctx, text, size, w, maxLines) {
  const parts = text.match(/[^.!?]+[.!?]+(\s|$)/g) || [text]; let out = '';
  for (const s of parts) { const t = (out + s).trim(); if (wrap(ctx, 'body', t, size, w, 0, 400).length > maxLines) break; out = t + ' '; }
  return (out || text).trim();
}

// ---- the logo and its colourways ----
const cwLabel = (ctx, k) => ctx.logo.labels[k] || titleCase(k);
// a brand colour's name from its hex (a colourway stores hexes)
const nameOf = (ctx, hex) => { const B = ctx.brand, c = [...B.colours, ...(B.tones || [])].find((x) => x.hex.toLowerCase() === hex.toLowerCase()); return c ? c.name : hex; };
const isMono = (k) => /^mono/.test(k);
// the colourway drawn on a ground: one whose ground is that ground, full colour before mono; else the one whose name reads best on it
function bestCw(ctx, bg) {
  const cw = ctx.brand.logo.colourways, keys = Object.keys(cw);
  const on = keys.filter((k) => cw[k].ground.toLowerCase() === bg.toLowerCase()).sort((a, b) => isMono(a) - isMono(b));
  if (on.length) return on[0];
  return keys.reduce((a, b) => { const ra = ctx.ratio(cw[a].name, bg), rb = ctx.ratio(cw[b].name, bg); return rb > ra + 1e-9 || (Math.abs(rb - ra) <= 1e-9 && isMono(a) && !isMono(b)) ? b : a; });
}
// a version fitted inside bw x bh
const fitIn = (ctx, id, bw, bh) => { const g = ctx.logo.geos[id], s = Math.min(bw / g.w, bh / g.h); return { w: g.w * s, h: g.h * s }; };
// the slot frame's words, as long as the frame can hold (the engine sets them at 11 to 13 px with 6 px padding each side)
function slotLabel(ctx, w, want) {
  const size = Math.max(11, Math.min(13, w / 14));
  return [want, 'Your logo', 'Logo'].find((t) => adv(ctx, 'chrome', t, size, 0, 400) + 16 <= w) || '';
}
// the logo (showcase) or its slot frame (slot) at width w: markup and height. The slot frame is kept at least 28 px high so its words clear the dashes
function mark(ctx, id, w, { cw, ink, want = 'Your logo' } = {}) {
  const L = ctx.logo, g = L.geos[id], h = w * g.h / g.w;
  if (!isSlot(ctx)) return { html: L.svg(id, { width: r2(w), colourway: cw }), h };
  const sh = Math.max(28, h);
  return { html: L.html(id, { width: r2(w), color: ink, label: slotLabel(ctx, w, want) }).replace(/height:[\d.]+px/, `height:${sh.toFixed(1)}px`), h: sh };
}
const markAt = (x, y, w, m, style = '') => `<div class="a g2-m" style="left:${px(x)};top:${px(y)};width:${px(w)};${style}">${m.html}</div>`;
// slot edition: where the brand's own words go, in a dashed frame at the size they would take
function holder(ctx, x, y, w, t) {
  const n = wrap(ctx, 'body', t, 12, w - 26, 0, 400).length, h = 18 * n + 16;
  return { h, html: `<div class="a g2-ph" style="left:${px(x)};top:${px(y)};width:${px(w)};height:${px(h)}">${A(t)}</div>` };
}

// ---- the caption for whichever frame the loop circles ----
function frameCap(ctx, f) {
  const B = ctx.brand, P = palette(ctx), r = rollOf(ctx)[f];
  if (!r) return { title: 'Unexposed frame', text: 'The roll has ended.' };
  if (r[0] === 'photo') {
    const s = photoShot(ctx, r[1]);
    return s ? { title: s.caption, text: (s.generated ? '' : `Photo: ${s.credit || 'the studio'}.`) } : { title: 'Your photograph', text: 'Your own photograph, as shot, in the light you work in.' };
  }
  const C = {
    laptop: ['Client gallery on a laptop', 'The symbol in the top bar, then the page title.'],
    card: ['Cards on the box-office sill', `${cwLabel(ctx, bestCw(ctx, P.dark.hex))} on the front, on ${P.dark.name}.`],
    night: ['Poster on brick, at night', `The logo in ${nameOf(ctx, B.logo.colourways[bestCw(ctx, P.action.hex)].name)}, on ${P.action.name}.`],
    book: ['Portfolio book, in hand', `The stacked logo on ${(P.panel || P.dark).name} cloth.`],
    tote: ['Print bag on the studio hook', `The stacked logo on ${P.dark.name} canvas.`],
  }[r[0]] || ['Frame ' + frameLabel(f), ''];
  return { title: C[0], text: C[1] };
}
const capCol = (ctx, id) => { const c = frameCap(ctx, ctx.pageNo(id)); return captionHead(ctx, { no: capNo(ctx, id), title: c.title, text: c.text, lines: 2 }) + hline(996, 488, 444); };

// ---- seeded hand (the pencil X on the rejects) ----
const hash32 = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
// two tapered strokes of a wax pencil across a w x h frame: each one pass, bowed a little, heavier in the middle
function pencilX(seed, w, h, fill) {
  const rnd = mulberry32(hash32(seed)), j = () => (rnd() - 0.5) * 0.08;
  const stroke = (x0, y0, x1, y1) => {
    const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy), nx = -dy / len, ny = dx / len, bow = (rnd() - 0.5) * 0.05 * len, Wm = 4.2 + 2 * rnd(), N = 48, Lp = [], Rp = [];
    for (let i = 0; i <= N; i++) {
      const s = i / N, off = bow * Math.sin(Math.PI * s), x = x0 + dx * s + nx * off, y = y0 + dy * s + ny * off;
      const W = Math.max(1.1, Wm * Math.min(1, s / 0.07) ** 0.5 * Math.min(1, (1 - s) / 0.22) ** 0.8 * (0.9 + 0.1 * Math.sin(5 * s + rnd())));
      Lp.push([x + nx * W / 2, y + ny * W / 2]); Rp.push([x - nx * W / 2, y - ny * W / 2]);
    }
    return `<path d="M${[...Lp, ...Rp.reverse()].map((p) => `${r2(p[0])} ${r2(p[1])}`).join('L')}Z" fill="${fill}"/>`;
  };
  return `<svg class="a" style="left:0;top:0" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true">${stroke(w * (0.13 + j()), h * (0.15 + j()), w * (0.87 + j()), h * (0.85 + j()))}${stroke(w * (0.85 + j()), h * (0.13 + j()), w * (0.15 + j()), h * (0.87 + j()))}</svg>`;
}

// the brand's photographs this lane can measure: [k (index among shots with a photo), shot, luminance grid]
function measured(ctx) {
  const shots = (ctx.brand.imagery.shots || []).filter((s) => s.photo), G = grids[ctx.slug] || {};
  return shots.map((s, k) => [k, s, G[s.id]]).filter(([, s, g]) => g && !photoScene(ctx, s));
}
// the frame on the roll that holds photograph k, nearest the page's own frame
function frameOfShot(ctx, k, near) {
  const fs = Object.entries(rollOf(ctx)).filter(([, r]) => r[0] === 'photo' && r[1] === k).map(([f]) => +f);
  return fs.length ? fs.reduce((a, b) => (Math.abs(b - near) < Math.abs(a - near) ? b : a)) : null;
}

export const guidelines = {
  // The versions as a bracket of exposures: the three shapes on the bare page, then the four colourways from the darkest ground to the lightest.
  'logo-versions'(ctx) {
    const B = ctx.brand, T = tokens(ctx), P = palette(ctx), C = ctx.C, slot = isSlot(ctx), cw0 = bestCw(ctx, T.ground), ink0 = P.inkOn(T.ground);
    // the horizontal fills its own box; the stacked and the symbol share one scale, so the symbol shows at its size in the stacked logo, not blown up to fill its box
    const boxes = [['horizontal', 60, 444], ['stacked', 528, 210], ['symbol', 762, 210]], Gs = ctx.logo.geos, fitS = (id, bw) => Math.min(bw / Gs[id].w, 160 / Gs[id].h);
    const sc = Math.min(fitS('stacked', 210), fitS('symbol', 210));
    let a = '';
    for (const [id, x, bw] of boxes) {
      const f = { w: Gs[id].w * (id === 'horizontal' ? fitS(id, bw) : sc) }, m = mark(ctx, id, f.w, { cw: cw0, ink: ink0, want: id === 'symbol' ? 'Your symbol' : `Your ${id} logo` });
      a += markAt(x, 492 - m.h, f.w, m);
      a += put(ctx, { x, y: 516, w: bw, h: 20, role: 'body', size: 14, line: 20, weight: 500, style: 'font:500 14px/20px var(--body);color:var(--ink)', html: A(cwLabel(ctx, id)) });
      if (slot) a += holder(ctx, x, 544, bw, `Where the ${id} version goes. One sentence.`).html;
      else { const t = sentencesFit(ctx, B.logo.when[id] || '', 12, bw - 2, 4); a += small(ctx, x, 540, bw, 18 * wrap(ctx, 'body', t, 12, bw - 2, 0, 400).length, A(t)); }
    }
    // the bracket: four frames edge to edge, ground luminance rising left to right
    const cws = B.logo.colourways, four = ['colour', 'mono-dark', 'mono-light', 'reversed'].filter((k) => cws[k]).sort((p, q) => C.luminance(cws[p].ground) - C.luminance(cws[q].ground));
    let b = '';
    four.forEach((k, i) => {
      const g = cws[k].ground, x = 60 + i * 228, f = fitIn(ctx, 'colour', 156, 72), m = mark(ctx, 'colour', f.w, { cw: k, ink: P.inkOn(g) });
      b += `<div class="a" style="left:${x}px;top:652px;width:228px;height:152px;background:${g}">${markAt((228 - f.w) / 2, (152 - m.h) / 2, f.w, m)}</div>`;
      if (i && cws[four[i - 1]].ground.toLowerCase() === g.toLowerCase()) b += `<div class="a" style="left:${x}px;top:652px;width:1px;height:152px;background:var(--hair)"></div>`;
      b += label(ctx, x, 820, cwLabel(ctx, k), 216) + small(ctx, x, 838, 216, 18, A(`On ${nameOf(ctx, g)}`));
    });
    b += `<div class="a" style="left:60px;top:652px;width:${228 * four.length}px;height:152px;box-shadow:inset 0 0 0 1px var(--hair);pointer-events:none"></div>`;
    // the column: the rule, then where each shape shows on this roll
    const hd = headline(ctx, 996, 512, `Start with ${cwLabel(ctx, 'colour').toLowerCase()}.`, 40, 44, 444, 2);
    const s1 = text14(ctx, 996, 512 + hd.h + 16, 444, 'The colourways are one logo, bracketed like exposures from the darkest ground to the lightest. Use the one made for the ground under it.');
    const uses = { horizontal: ['app'], stacked: ['book', 'tote'], symbol: ['laptop', 'sheets'] }, roll = rollOf(ctx);
    let ry = 512 + hd.h + 16 + s1.h + 36, rows = label(ctx, 996, ry, 'On this roll');
    ry += 28;
    for (const [v, setups] of Object.entries(uses)) {
      const fs = Object.entries(roll).filter(([, r]) => setups.includes(r[0])).map(([f]) => frameLabel(+f));
      if (!fs.length) continue;
      rows += put(ctx, { x: 996, y: ry, w: 140, h: 20, role: 'body', size: 14, line: 20, weight: 500, style: 'font:500 14px/20px var(--body);color:var(--ink)', html: A(cwLabel(ctx, v)) })
        + put(ctx, { x: 1140, baseline: ry + 15, w: 300, h: 16, cls: 'edge', role: 'edge', size: 12, line: 16, weight: 600, style: 'line-height:16px;word-spacing:.5em', html: A(`Frames ${fs.join(' ')}`) });
      ry += 28;
    }
    return page(ctx, 'logo-versions', a + b + capCol(ctx, 'logo-versions') + hd.html + s1.html + rows);
  },

  // Clear space as an enlargement: the logo as wide as the stage allows inside its zone, crop marks at the corners, x dimensioned in each gap.
  'clear-space'(ctx) {
    const B = ctx.brand, T = tokens(ctx), P = palette(ctx), L = ctx.logo, G = L.geos.colour, u0 = L.geo.unit, slot = isSlot(ctx);
    let lw = 864 / (1 + 2 * u0 / G.w), k = lw / G.w, u = u0 * k, lh = slot ? Math.max(28, G.h * k) : G.h * k;
    if (lh + 2 * u > 380) { const s = 380 / (lh + 2 * u); lw *= s; lh *= s; u *= s; }
    const zw = lw + 2 * u, zh = lh + 2 * u, zx = 60 + (912 - zw) / 2, zy = 316;
    const zInk = [T.quiet, T.soft, T.ink].find((c) => ctx.ratio(c, T.panel) >= 4.5) || T.ink;
    const m = mark(ctx, 'colour', lw, { cw: bestCw(ctx, T.panel), ink: P.inkOn(T.panel) });
    // dimension lines with end ticks, one per gap
    const tk = 5, dimV = (x, y0, y1) => `M${r2(x)} ${r2(y0)}V${r2(y1)}M${r2(x - tk)} ${r2(y0)}H${r2(x + tk)}M${r2(x - tk)} ${r2(y1)}H${r2(x + tk)}`;
    const dimH = (y, x0, x1) => `M${r2(x0)} ${r2(y)}H${r2(x1)}M${r2(x0)} ${r2(y - tk)}V${r2(y + tk)}M${r2(x1)} ${r2(y - tk)}V${r2(y + tk)}`;
    const vx = u + lw * 0.5, hy = u + lh * 0.5;
    const dims = `<svg class="a" style="left:0;top:0" width="${r2(zw)}" height="${r2(zh)}" viewBox="0 0 ${r2(zw)} ${r2(zh)}" aria-hidden="true"><path d="${dimV(vx, 0.5, u - 0.5)}${dimV(vx, u + lh + 0.5, zh - 0.5)}${dimH(hy, 0.5, u - 0.5)}${dimH(hy, u + lw + 0.5, zw - 0.5)}" stroke="${zInk}" stroke-width="1" fill="none"/></svg>`;
    const xs = Math.min(14, Math.max(11, Math.floor(u * 0.5))), xl = (x, y, w = 16, align = 'left') => put(ctx, { x, y, w, h: 20, role: 'body', size: xs, line: 20, weight: 500, align, style: `font:500 ${xs}px/20px var(--body);color:${zInk}`, html: 'x' });
    const xlabels = xl(vx + 8, (u - 20) / 2) + xl(vx + 8, u + lh + (u - 20) / 2) + xl(0, hy - 24, u, 'center') + xl(u + lw, hy - 24, u, 'center');
    const bounds = `<div class="a" style="left:${r2(u)}px;top:${r2(u)}px;width:${r2(lw)}px;height:${r2(lh)}px;box-sizing:border-box;border:1px dashed ${zInk}"></div>`;
    const zone = `<div class="a g2-zone" style="left:${r2(zx)}px;top:${zy}px;width:${r2(zw)}px;height:${r2(zh)}px;background:var(--panel)">${bounds}${markAt(u, u, lw, m)}${dims}${xlabels}</div>`;
    // crop marks outside the four corners
    const o = 8, c = 16, crop = [[zx, zy, -1, -1], [zx + zw, zy, 1, -1], [zx, zy + zh, -1, 1], [zx + zw, zy + zh, 1, 1]].map(([x, y, sx, sy]) => `M${r2(x + sx * o)} ${r2(y)}H${r2(x + sx * (o + c))}M${r2(x)} ${r2(y + sy * o)}V${r2(y + sy * (o + c))}`).join('');
    const marks = `<svg class="a" style="left:0;top:0;pointer-events:none" width="1500" height="1000" viewBox="0 0 1500 1000" aria-hidden="true"><path d="${crop}" stroke="${T.quiet}" stroke-width="1" fill="none"/></svg>`;
    const minPx = L.minSize.screenPx, minMm = L.minSize.printMm, xAt = (w) => u0 * w / G.w, f1 = (n) => String(+n.toFixed(1));
    // under the enlargement: the same zone at actual size (1, 2 and 3 times the screen minimum) along the foot, the rule in words beside them
    const hy0 = Math.round(zy + zh + 48), base = 892;
    let rx = 60, row = '';
    for (const mult of [1, 2, 3]) {
      const w = mult * minPx, uu = xAt(w), mm = mark(ctx, 'colour', w, { cw: bestCw(ctx, T.panel), ink: P.inkOn(T.panel) }), bw = w + 2 * uu, bh = mm.h + 2 * uu, by = base - bh;
      row += `<div class="a g2-zone" style="left:${r2(rx)}px;top:${r2(by)}px;width:${r2(bw)}px;height:${r2(bh)}px;background:var(--panel)"><div class="a" style="left:${r2(uu)}px;top:${r2(uu)}px;width:${r2(w)}px;height:${r2(mm.h)}px;box-sizing:border-box;border:1px dashed ${zInk}"></div>${markAt(uu, uu, w, mm)}</div>`
        + put(ctx, { x: rx, y: base + 8, w: Math.max(bw, 64), h: 18, cls: 'mono', role: 'mono', size: 12, line: 18, html: A(`${w} px wide`) });
      rx += bw + 40;
    }
    const tx = Math.max(rx + 24, 700), tw = 972 - tx;
    const hd = headline(ctx, tx, hy0, 'Nothing enters the zone.', 40, 44, tw, 2);
    const say = slot ? 'x is the clear-space unit your own logo sets. Keep that much room on all four sides, at every size.' : `x is ${L.clearShare}% of the logo's height. Keep that much room on all four sides, at every size.`;
    const s1 = text14(ctx, tx, hy0 + hd.h + 12, tw, say);
    // the column: x worked out at the sizes people set
    let col = label(ctx, 996, 512, 'x at each size');
    if (slot) col += holder(ctx, 996, 540, 444, 'Your x at the minimum size, at twice and four times it: in px on screen and mm in print.').html;
    else {
      const rows = [[`${minPx} px wide`, `x = ${f1(xAt(minPx))} px`], [`${2 * minPx} px wide`, `x = ${f1(xAt(2 * minPx))} px`], [`${3 * minPx} px wide`, `x = ${f1(xAt(3 * minPx))} px`], [`${minMm} mm wide`, `x = ${f1(xAt(minMm))} mm`], [`${2 * minMm} mm wide`, `x = ${f1(xAt(2 * minMm))} mm`]];
      col += rows.map(([l, r], i) => put(ctx, { x: 996, y: 540 + i * 26, w: 200, h: 18, cls: 'mono', role: 'mono', size: 12, line: 18, html: A(l) }) + put(ctx, { x: 1240, y: 540 + i * 26, w: 200, h: 18, cls: 'mono', role: 'mono', size: 12, line: 18, align: 'right', style: 'color:var(--soft)', html: A(r) })
        + (i < rows.length - 1 ? `<div class="a" style="left:996px;top:${540 + i * 26 + 22}px;width:444px;height:1px;background:var(--hair)"></div>` : '')).join('');
    }
    return page(ctx, 'clear-space', zone + marks + row + hd.html + s1.html + capCol(ctx, 'clear-space') + col);
  },

  // The smallest sizes, printed at actual size: the screen minimum over a px rule, the print minimum inside a true-scale 35 mm gate over a mm rule.
  'min-size'(ctx) {
    const B = ctx.brand, T = tokens(ctx), P = palette(ctx), L = ctx.logo, G = L.geos.colour, M = L.minSize, wt = ctx.weights.heading, slot = isSlot(ctx), MM = 96 / 25.4;
    const fig = (x, n, unit) => {
      const s = 264, w = adv(ctx, 'display', String(n), s, -0.02, wt);
      return put(ctx, { x, baseline: 548, w: Math.ceil(w) + 8, h: 264, cls: 'disp num', role: 'display', size: s, line: 264, weight: wt, style: 'font-size:264px;line-height:264px;letter-spacing:-0.02em', html: A(String(n)) })
        + put(ctx, { x: x + w + 14, baseline: 548, w: 60, h: 24, role: 'body', size: 16, line: 24, weight: 500, style: 'font:500 16px/24px var(--body);color:var(--soft)', html: A(unit) });
    };
    // screen: the logo at its minimum, bottom at 740, over a px rule ticked every 10
    const sw = M.screenPx, sm = mark(ctx, 'colour', sw, { cw: bestCw(ctx, T.ground), ink: P.inkOn(T.ground) });
    const RL = Math.ceil((sw + 12) / 10) * 10;
    let rt = ''; for (let v = 0; v <= RL; v += 10) rt += `M${60 + v + 0.5} 752V${v % 50 === 0 ? 762 : 758}`;
    rt += `M${60 + sw + 0.5} 752V766M60 752.5H${60 + RL + 1}`;
    const ruler = (d) => `<svg class="a" style="left:0;top:0;pointer-events:none" width="1500" height="1000" viewBox="0 0 1500 1000" aria-hidden="true"><path d="${d}" stroke="${T.quiet}" stroke-width="1" fill="none"/></svg>`;
    const tick = (x, t, align = 'left', w = 40) => put(ctx, { x: align === 'center' ? x - w / 2 : x, y: 770, w, h: 18, cls: 'mono', role: 'mono', size: 12, line: 18, align, html: A(t) });
    const screen = markAt(60, 740 - sm.h, sw, sm) + tick(60, '0') + tick(60 + sw, `${sw} px`, 'left', 60);
    // print: 36 x 24 mm of film, the logo at its print minimum inside
    const gw = 36 * MM, gh = 24 * MM, gx = 528, gy = 740 - gh, pw = M.printMm * MM, pm = mark(ctx, 'colour', pw, { cw: bestCw(ctx, T.film), ink: T.edge, want: 'Logo' });
    const gate = `<div class="a g2-gate" style="left:${gx}px;top:${r2(gy)}px;width:${r2(gw)}px;height:${r2(gh)}px">${markAt((gw - pw) / 2, (gh - pm.h) / 2, pw, pm)}</div>`;
    for (let v = 0; v <= 36; v++) rt += `M${r2(gx + v * MM) + 0.5} 752V${v % 10 === 0 ? 762 : v % 5 === 0 ? 759 : 756}`;
    rt += `M${gx} 752.5H${r2(gx + 36 * MM) + 1}`;
    const print = gate + [0, 10, 20, 30].map((v) => tick(gx + v * MM, String(v), v ? 'center' : 'left', v ? 24 : 40)).join('') + tick(gx + 36 * MM + 8, 'mm');
    const share = M.printMm / 36, frac = Math.abs(share - 0.5) < 0.02 ? 'half the width' : Math.abs(share - 1 / 3) < 0.02 ? 'a third of the width' : `${Math.round(share * 100)}% of the width`;
    const caps = small(ctx, 60, 808, 444, 18, A(`${M.screenPx} px wide and ${M.screenH} px high, on any screen.`))
      + small(ctx, 528, 808, 444, 36, A(`${M.printMm} mm wide and ${M.printH} mm high: ${frac} of a 35 mm frame, shown here at actual size.`));
    const heads = fig(60, M.screenPx, 'px') + fig(528, M.printMm, 'mm') + label(ctx, 60, 584, 'On screen') + label(ctx, 528, 584, 'In print');
    // the column: the measured values at the minimum, then what to do below it
    const xs = L.geo.unit / G.w, f1 = (n) => String(+n.toFixed(1));
    const rows = [['', 'Screen', 'Print'], ['Width', `${M.screenPx} px`, `${M.printMm} mm`], ['Height', `${M.screenH} px`, `${M.printH} mm`], ['x', `${f1(M.screenPx * xs)} px`, `${f1(M.printMm * xs)} mm`]];
    let col = label(ctx, 996, 512, 'At the minimum');
    col += rows.map((r, i) => { const y = 540 + i * 26, head = i === 0;
      return [[996, 150, 'left'], [1146, 140, 'right'], [1300, 140, 'right']].map(([x, w, align], j) => (head ? (r[j] ? put(ctx, { x, y, w, h: 16, cls: 'nl', role: 'chrome', size: 12, line: 16, weight: 500, align, html: A(r[j]) }) : '') : put(ctx, { x, y, w, h: 18, cls: 'mono', role: 'mono', size: 12, line: 18, align, style: j ? 'color:var(--soft)' : '', html: A(r[j]) }))).join('')
        + (i < rows.length - 1 ? `<div class="a" style="left:996px;top:${y + 22}px;width:444px;height:1px;background:var(--hair)"></div>` : ''); }).join('');
    const by = 540 + rows.length * 26 + 28;
    col += label(ctx, 996, by, 'Smaller than this');
    const sym = slot ? holder(ctx, 996, by + 28, 444, 'Where the symbol takes over from the full logo. One sentence.') : text14(ctx, 996, by + 28, 444, B.logo.when.symbol || cwLabel(ctx, 'symbol'));
    col += sym.html;
    // a brand with a small mark (drawn for 16 to 96 px) shows it at actual size, its bottoms on one line, under the sentence that says when to use it
    if (!slot && L.small) {
      const sy = by + 28 + sym.h + 24, st = text14(ctx, 996, sy + 28, 444, `Below ${L.small.belowPx} px, use the small mark. Its notches are deeper and its sheet heavier.`);
      const sizes = [16, 24, 32, 48, 96], bottom = sy + 28 + st.h + 12 + 64, cwk = bestCw(ctx, T.ground);
      col += label(ctx, 996, sy, `Below ${L.small.belowPx} px`) + st.html;
      let sx = 996;
      for (const s of sizes) {
        col += markAt(sx, bottom - s * L.geos.small.h / L.geos.small.w, s, mark(ctx, 'small', s, { cw: cwk }))
          + put(ctx, { x: sx, y: bottom + 6, w: 40, h: 18, cls: 'mono', role: 'mono', size: 12, line: 18, html: A(String(s)) });
        sx += Math.max(s, 24) + 28;
      }
    }
    return page(ctx, 'min-size', heads + screen + print + ruler(rt) + caps + capCol(ctx, 'min-size') + col);
  },

  // Grounds: one print with the logo set where the photograph is measured quietest, and a column of frames, one per ground the logo is made for.
  'logo-grounds'(ctx) {
    const B = ctx.brand, T = tokens(ctx), P = palette(ctx), L = ctx.logo, C = ctx.C, G = L.geos.colour, slot = isSlot(ctx), cws = B.logo.colourways;
    const lw = 200, lh = lw * G.h / G.w, m0 = 32;
    const corners = [[m0, m0], [678 - m0 - lw, m0], [m0, 452 - m0 - lh], [678 - m0 - lw, 452 - m0 - lh]];
    const onPhoto = Object.keys(B.logo.when).filter((k) => cws[k] && /photo/i.test(B.logo.when[k]));
    const cands = onPhoto.length ? onPhoto : [bestCw(ctx, T.ground)];
    // every measured photograph, every corner, every colourway made for photographs: the best ratio against the corner's worst tenth wins
    let best = null;
    for (const [k, s, grid] of measured(ctx)) for (const [x, y] of corners) for (const cw of cands) {
      const st = boxStats(grid, 678, x, y, lw, lh), nl = C.luminance(cws[cw].name), light = nl > (st.p95 + st.p05) / 2;
      const r = light ? (nl + 0.05) / (st.p95 + 0.05) : (st.p05 + 0.05) / (nl + 0.05);
      if (!best || r > best.r + 1e-9) best = { k, s, x, y, cw, r, light };
    }
    const nShots = (B.imagery.shots || []).filter((s) => s.photo).length;
    if (!best) best = { k: 0, s: null, x: corners[2][0], y: corners[2][1], cw: cands[0], r: null };
    const m = mark(ctx, 'colour', lw, { cw: best.cw, ink: T.edge });
    const my = slot ? 452 - m0 - m.h : best.y;
    const printHtml = `<div class="a fr" style="left:60px;top:316px;width:678px;height:452px">${nShots ? photoFrame(ctx, best.k, 678, 452, 0) : `<div class="a pslot" style="left:0;top:0;width:678px;height:452px"></div>`}${markAt(slot ? m0 : best.x, my, lw, m)}</div>`;
    let cap;
    // no measured shot: the print is the photograph frame nearest this page on the roll, so its number is not the circled frame's
    const nearPhoto = () => { const n0 = ctx.pageNo('logo-grounds'), fs = Object.entries(rollOf(ctx)).filter(([, r]) => r[0] === 'photo').map(([f]) => +f); return fs.length ? frameLabel(fs.reduce((a, b) => (Math.abs(b - n0) < Math.abs(a - n0) ? b : a))) : capNo(ctx, 'logo-grounds'); };
    if (slot || !best.s) cap = captionHead(ctx, { x: 60, w: 678, no: nearPhoto(), title: 'Your photograph', text: 'Measure the corners of your own photograph and set the logo in the one that holds it best.', head: 792, baseline: 824, titleY: 848, textY: 876, lines: 2 });
    else {
      const f = frameOfShot(ctx, best.k, ctx.pageNo('logo-grounds'));
      const ratio = best.r ? ` It holds ${ctx.fmt(best.r)} to 1 against the ${best.light ? 'brightest' : 'darkest'} part of that corner.` : '';
      cap = captionHead(ctx, { x: 60, w: 678, no: f ? frameLabel(f) : capNo(ctx, 'logo-grounds'), title: best.s.caption, text: `${cwLabel(ctx, best.cw)}, in the quietest corner of the frame.${ratio}`, head: 792, baseline: 824, titleY: 848, textY: 876, lines: 2 });
    }
    // the grounds: one frame per ground a colourway is made for, full colour before mono
    const grounds = [];
    for (const k of Object.keys(cws).sort((a, b) => isMono(a) - isMono(b))) if (!grounds.some((g) => g.g.toLowerCase() === cws[k].ground.toLowerCase())) grounds.push({ g: cws[k].ground, k });
    grounds.sort((a, b) => C.luminance(a.g) - C.luminance(b.g));
    const n = grounds.length, gap = 16, fh = Math.min(140, (620 - (n - 1) * gap) / n);
    const strip = grounds.map(({ g, k }, i) => {
      const y = 316 + i * (fh + gap), ink = P.inkOn(g), f = fitIn(ctx, 'colour', 150, fh - 60), mk = mark(ctx, 'colour', f.w, { cw: k, ink });
      const same = g.toLowerCase() === T.ground.toLowerCase();
      return `<div class="a" style="left:762px;top:${r2(y)}px;width:210px;height:${r2(fh)}px;background:${g};${same ? 'box-shadow:inset 0 0 0 1px var(--hair)' : ''}">`
        + markAt(14, 14, f.w, mk)
        + put(ctx, { x: 14, baseline: fh - 14, w: 96, h: 16, role: 'chrome', size: 12, line: 16, weight: 500, style: `font:500 12px/16px var(--chrome);color:${ink}`, html: A(nameOf(ctx, g)) })
        + put(ctx, { x: 100, baseline: fh - 14, w: 96, h: 16, role: 'chrome', size: 12, line: 16, weight: 400, align: 'right', style: `font:400 12px/16px var(--chrome);color:${ink}`, html: A(cwLabel(ctx, k)) })
        + '</div>';
    }).join('');
    // the column: the brand's own rule for the logo on a photograph
    const rule = (B.imagery.rules || []).find((r) => /logo/i.test(r.do));
    let col = '';
    if (slot) { const hd = headline(ctx, 996, 512, 'The logo on a photograph.', 40, 44, 444, 2); col = hd.html + holder(ctx, 996, 512 + hd.h + 20, 444, 'Your rule for the logo on a photograph: where it sits, and where it never goes.').html; }
    else if (rule) {
      const hd = headline(ctx, 996, 512, rule.do, 40, 44, 444, 4);
      col = hd.html + label(ctx, 996, 512 + hd.h + 28, 'Never') + text14(ctx, 996, 512 + hd.h + 52, 444, rule.dont).html;
    }
    return page(ctx, 'logo-grounds', printHtml + cap + strip + capCol(ctx, 'logo-grounds') + col);
  },

  // Misuse as rejects: two strips cut from the roll at 1.3 times, six frames each crossed out in grease pencil, the fault in the edge print.
  'logo-misuse'(ctx) {
    const B = ctx.brand, T = tokens(ctx), P = palette(ctx), L = ctx.logo, C = ctx.C, G = L.geos.colour, slot = isSlot(ctx);
    const S = 1.3, FW = 273, FH = 182, cw0 = bestCw(ctx, T.ground), g0 = B.logo.colourways[cw0].ground, ink = P.inkOn(g0), lw = 150, slug = ctx.slug || B.slug;
    const lm = mark(ctx, 'colour', lw, { cw: cw0, ink }), lx = (FW - lw) / 2, ly = (FH - lm.h) / 2;
    const centred = (style = '', m = lm) => markAt(lx, (FH - m.h) / 2, lw, m, style);
    // the accent turned to its opposite hue, lightened until it holds 3:1 on the ground (4.5:1 in the slot edition, where it carries words)
    const ao = C.toOklch(P.action.hex), H2 = (ao.H + 180) % 360, want = slot ? 4.5 : 3, gL = C.toOklch(g0).L, up = gL < 0.5;
    let swap = ink; for (let i = 0; i <= 100; i++) { const Lx = up ? gL + i * 0.01 : gL - i * 0.01; if (Lx < 0 || Lx > 1) break; const c = C.fromOklch(Lx, Math.min(ao.C, 0.13), H2); if (ctx.ratio(c, g0) >= want) { swap = c; break; } }
    let recol;
    if (slot) recol = mark(ctx, 'colour', lw, { cw: cw0, ink: swap });
    else {
      const sv = L.svg('colour', { width: lw, colourway: cw0 }), re = new RegExp(`fill="${P.action.hex}"`, 'gi');
      recol = { html: re.test(sv) ? sv.replace(re, `fill="${swap}"`) : L.svg('colour', { width: lw, fill: swap }), h: lm.h };
    }
    // the busy ground: the photograph whose middle is busiest, measured
    const meas = measured(ctx).map(([k, s, g]) => ({ k, s, sd: boxStats(g, FW, lx, ly, lw, lm.h).sd })).sort((a, b) => b.sd - a.sd);
    const busyBg = slot || !meas.length ? `<div class="a pslot" style="left:0;top:0;width:${FW}px;height:${FH}px;align-items:flex-start;justify-content:flex-start;padding:10px 12px"><span class="edge">Your photo</span></div>` : photoFrame(ctx, meas[0].k, FW, FH, 0);
    const busyMark = slot ? mark(ctx, 'colour', lw, { cw: cw0, ink: T.edge }) : lm;
    const items = [
      ['Stretched', 'Scale it from a corner, never from one side.', centred('transform:scaleX(1.35) scaleY(.75)')],
      ['Recoloured', 'Use a colourway as it is made. Never mix a new colour.', centred('', recol)],
      ['Rotated', 'Keep it level, on every surface.', centred('transform:rotate(-12deg)')],
      ['Effects', 'No shadow, glow or bevel. The flat file is the logo.', centred(`filter:drop-shadow(0 0 5px ${T.ink}) drop-shadow(0 0 14px ${T.ink})`)],
      ['Busy ground', 'Move it to a quiet part of the photo, or onto a flat ground.', busyBg + centred('', busyMark)],
      ['Boxed', 'No outline or box. Clear space does that job.', `<div class="a" style="left:${r2(lx - 14)}px;top:${r2(ly - 14)}px;width:${r2(lw + 28)}px;height:${r2(lm.h + 28)}px;box-sizing:border-box;border:2px solid ${slot ? ink : B.logo.colourways[cw0].name}"></div>` + centred()],
    ];
    // a reject strip: the theme's strip at 1.3 times, three frames, holes on the same pitch
    const rejects = (y, three, si) => {
      const W = 912.6, H = 286; let holes = '';
      for (let j = 0; ; j++) { const x = (8.625 + 29.25 * j) * S; if (x + 12 * S > W) break; holes += `<rect x="${r2(x)}" y="${r2(6 * S)}" width="${r2(12 * S)}" height="${r2(17 * S)}" rx="3.2"/><rect x="${r2(x)}" y="${r2(197 * S)}" width="${r2(12 * S)}" height="${r2(17 * S)}" rx="3.2"/>`; }
      const frames = three.map(([title, , inner], i) => {
        const fx = 12 * S + i * 234 * S;
        return `<div class="a fr" style="left:${r2(fx)}px;top:${r2(40 * S)}px;width:${FW}px;height:${FH}px;background:${g0}">${inner}${pencilX(`${slug}:misuse:${si * 3 + i}`, FW, FH, T.ink)}</div>`
          + put(ctx, { x: fx, baseline: 192 * S, w: FW, h: 12, cls: 'edge', role: 'edge', size: 12, line: 12, weight: 600, align: 'center', html: A(title) + '<i class="tri"></i>' });
      }).join('');
      return `<div class="a strip" style="left:44.4px;top:${y}px;width:${W}px;height:${H}px;background:${T.film};overflow:hidden"><svg class="a" style="left:0;top:0" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true" fill="${T.hole}">${holes}</svg>${frames}</div>`;
    };
    const stage = rejects(316, items.slice(0, 3), 0) + rejects(626, items.slice(3), 1);
    // the column: the rule, then each fault and its fix
    const hd = headline(ctx, 996, 512, 'Use the files as they are.', 40, 44, 444, 2);
    let y = 512 + hd.h + 24;
    const rows = items.map(([t, s]) => { const n = wrap(ctx, 'body', s, 14, 325, 0, 400).length, h = put(ctx, { x: 996, y, w: 110, h: 22, role: 'body', size: 14, line: 22, weight: 500, style: 'font:500 14px/22px var(--body);color:var(--ink)', html: A(t) }) + put(ctx, { x: 1113, y, w: 327, h: 22 * n, cls: 'cx', html: A(s) }); y += 22 * n + 14; return h; }).join('');
    return page(ctx, 'logo-misuse', stage + capCol(ctx, 'logo-misuse') + hd.html + rows);
  },
};

export function css() {
  return `.pg .g2-m svg{display:block}
.pg .g2-ph{box-sizing:border-box;border:1px dashed var(--quiet);padding:7px 12px;font:400 12px/18px var(--body);color:var(--soft);white-space:normal}
.pg .g2-gate{background:var(--film);border-radius:2px;box-shadow:inset 0 0 0 1px var(--gate)}
`;
}
