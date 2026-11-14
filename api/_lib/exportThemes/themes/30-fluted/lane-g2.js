// Theme 30, Fluted, lane g2: the logo pages (logo-versions, clear-space, min-size, logo-grounds, logo-misuse; `logo` is a round 1 page).
// The band at y 768 to 1152 carries each page's own data, never ornament, in the window language of lane g1 (a column with a round head, its width the value):
// versions: each shape as wide as it stands at one height; clear space: each logo (solid) inside its clear space (outline), at the scale drawn above;
// min-size: the two minimum values themselves, standing in the glass; grounds: each colour the logo may sit on, and a photograph, as a window running down
// through the glass; misuse: the sixth misuse is the glass itself, the logo laid over the reeds.
// Colours come from ctx roles, colourways and brand data only; no brand colour id, hex or name is written here. Brand strings are printed whole, never split or counted.
import { A, put, shell, rect, tokens, fitSize, logoHtml, paths, TXT } from './helpers.js';
import { warpPath } from './glass.js';

function jpegSize() { throw new Error('theme 30: photograph files are not read by the server export'); }

const P = 12;            // the reed pitch
const LIP = 720;         // the top of the widest head on a page: 48 px of it flat above the band's top edge
const BB = 1152, KEY = 1184;
const TRACK = -0.02;
const WORD = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'];
const word = (n) => WORD[n] || String(n);
const lo = (h) => String(h).toLowerCase();
const r2 = (n) => Math.round(n * 100) / 100;
const px = (n) => `${r2(n)}px`;

// The window (as lane g1): straight sides from the band's foot up to a round head of radius w / 2 whose top is `top`. Returns the flat drawing (seen above the band),
// the same outline bent by the reeds (drawn over them), and a rect of its body for the glass to sample.
function windowMark(x, w, top, { fill = null, stroke = null, sw = 2 } = {}) {
  const r = w / 2, cx = x + r, cy = top + r, ins = stroke ? sw / 2 : 0;
  const pts = [[x + ins, BB], [x + ins, cy]];
  for (let a = 180; a <= 360; a += 0.5) pts.push([cx + (r - ins) * Math.cos(a * Math.PI / 180), cy + (r - ins) * Math.sin(a * Math.PI / 180)]);
  pts.push([x + w - ins, cy], [x + w - ins, BB]);
  const d = `M${pts.map(([px1, py]) => `${px1.toFixed(2)} ${py.toFixed(2)}`).join('L')}${fill ? 'Z' : ''}`;
  const paint = fill ? `fill="${fill}"` : `fill="none" stroke="${stroke}" stroke-width="${sw}"`;
  const wd = warpPath(d, 0, 0, {});
  return { d, flat: `<path d="${d}" ${paint}/>`, over: `<path d="${wd || d}" ${paint}/>`, body: fill ? rect(r2(x), Math.round(cy), r2(w), BB - Math.round(cy), fill) : '' };
}
const page = (ctx, id, T, ms, html, extra = {}) => shell(ctx, id, T, {
  flat: ms.map((m) => m.flat).join('') + (extra.flat || ''), shape: ms.map((m) => m.body).join('') + (extra.shape || ''),
  fields: !!extra.fields, band: { over: ms.map((m) => m.over).join('') }, html,
});

const headline = (ctx, l1, l2, { y = 96, w = 777 } = {}) => {
  const s = Math.min(64, fitSize(ctx, 'display', l2 && l2.length > l1.length ? l2 : l1, 64, w, TRACK, ctx.weights.heading, 32));
  return put(ctx, { x: 64, y, w, cls: 'disp', html: `<div style="font-size:${s}px;line-height:64px;color:var(--ink)">${A(l1)}</div>${l2 ? `<div style="font-size:${s}px;line-height:64px;color:var(--quiet)">${A(l2)}</div>` : ''}` });
};
const body = (ctx, x, y, w, html, style = '') => put(ctx, { x, y, w, cls: 'body', style: `white-space:normal;${style}`, html });
const keyAt = (ctx, x, w, html, y = KEY, cls = 'k') => put(ctx, { x, y, w, cls, style: 'white-space:normal', html });

// the colourway key drawn on a given ground, else the one whose name colour reads best on it (as the round 1 logo page)
const cwOn = (ctx, bg) => {
  const cw = ctx.brand.logo.colourways, keys = Object.keys(cw);
  return keys.find((k) => lo(cw[k].ground) === lo(bg)) || keys.reduce((a, b) => (ctx.ratio(cw[b].name, bg) > ctx.ratio(cw[a].name, bg) ? b : a));
};
// the better of ink and ground on a fill (no assertion: the checker measures the text against the plate under it)
const inkOn = (ctx, T, bg) => (ctx.ratio(T.ink, bg) >= ctx.ratio(T.ground, bg) ? T.ink : T.ground);
// a colourway's name: the engine's label for the four logo colourways, else "on" and the brand colour that is its ground
const cwName = (ctx, key) => {
  if (ctx.logo.labels[key]) return ctx.logo.labels[key];
  const g = ctx.brand.logo.colourways[key].ground, col = ctx.brand.colours.find((c) => lo(c.hex) === lo(g));
  return col ? `on ${col.name}` : key.replace(/-/g, ' ');
};

// ---- 010 logo-versions: the colourways on their own grounds; the three shapes standing over the glass, each above a window as wide as it stands at their common height ----
function versions(ctx) {
  const T = tokens(ctx), B = ctx.brand, L = ctx.logo, cws = B.logo.colourways, when = B.logo.when || {};
  const cIds = L.versions.filter((id) => L.colourwayOf(id) === id && cws[id]), sIds = L.versions.filter((id) => !cIds.includes(id));
  const head = headline(ctx, `${word(L.versions.length)} versions`, '');
  const lead = body(ctx, 64, 176, 468, `${word(cIds.length)} colourways of the full logo, and ${word(sIds.length).toLowerCase()} shapes. Choose the colourway by the ground and the shape by the space. In the glass, each shape as wide as it stands at one height.`);
  // the colourways: one column each, the logo on the colourway's own ground, its name and when to use it under the plate
  const k = cIds.length, CW = Math.floor((952 - 16 * (k - 1)) / k), PY = 296, PH = 104;
  const lw = Math.min(CW - 48, Math.round(44 * L.geo.aspect)), lh = lw / L.geo.aspect;
  const tier = cIds.map((id, i) => {
    const x = 64 + i * (CW + 16), g = cws[id].ground, near = ctx.ratio(g, T.ground) < 1.25, fg = inkOn(ctx, T, g);
    return `<div class="a" style="left:${x}px;top:${PY}px;width:${CW}px;height:${PH}px;background:${g};${near ? 'box-shadow:inset 0 0 0 1px var(--hair);' : ''}">`
      + `<div class="a" style="left:${px((CW - lw) / 2)};top:${px((PH - lh) / 2)}">${logoHtml(ctx, T, id, { width: lw, colourway: id, color: fg })}</div></div>`
      + put(ctx, { x, y: PY + PH + 16, w: CW, cls: 'kn', html: A(L.labels[id]) })
      + (when[id] ? body(ctx, x, PY + PH + 42, CW, A(when[id]), 'font-size:15px;line-height:22px') : '');
  }).join('');
  // the shapes: the largest common height (up to 96) at which each stands in a column at least 232 wide (its key's room), 24 between columns
  const asp = sIds.map((id) => L.geos[id].w / L.geos[id].h), MINC = 232, GAP = 24;
  let H = 96; while (H > 32 && asp.reduce((a, s) => a + Math.max(s * H, MINC), 0) + GAP * (asp.length - 1) > 952) H -= 1;
  const ws = asp.map((s) => s * H), cols = ws.map((w) => Math.max(w, MINC));
  const xs = cols.map((_, i) => 64 + cols.slice(0, i).reduce((a, b) => a + b + GAP, 0));
  const ys = LIP + Math.max(...ws) / 2, SB = LIP - 24, cwG = cwOn(ctx, T.ground);
  let shapes = '', keys = '';
  const ms = sIds.map((id, i) => {
    shapes += `<div class="a" style="left:${px(xs[i])};top:${px(SB - H)}">${logoHtml(ctx, T, id, { width: r2(ws[i]), colourway: cwG, label: L.labels[id] })}</div>`;
    const kw = (i < sIds.length - 1 ? xs[i + 1] - 16 : 1016) - xs[i];
    keys += keyAt(ctx, xs[i], kw, `<span class="kn">${A(L.labels[id])}</span> <span class="v num">${asp[i].toFixed(2)} : 1</span>`)
      + (when[id] ? keyAt(ctx, xs[i], kw, A(when[id]), KEY + 24) : '');
    return windowMark(xs[i], ws[i], ys - ws[i] / 2, { fill: T.strong });
  });
  return page(ctx, 'logo-versions', T, ms, head + lead + tier + shapes + keys);
}

// ---- 011 clear-space: three shapes, each in its clear space drawn in units of x at one scale; in the glass each logo (solid) inside its clear space (outline), at that scale ----
function clearSpace(ctx) {
  const T = tokens(ctx), L = ctx.logo, u = L.geo.unit, cwG = cwOn(ctx, T.ground);
  const ids = ['colour', 'stacked', 'symbol'].filter((id) => L.geos[id]), GAP = 32;
  const wu = ids.map((id) => L.geos[id].w / u), hu = ids.map((id) => L.geos[id].h / u);
  // x on the page: the largest (up to 44 px) at which the three boxes fit the 952 px measure side by side
  const X = Math.min(44, (952 - GAP * (ids.length - 1)) / wu.reduce((a, w) => a + w + 2, 0));
  const bw = wu.map((w) => (w + 2) * X), bh = hu.map((h) => (h + 2) * X);
  const xs = bw.map((_, i) => 64 + bw.slice(0, i).reduce((a, b) => a + b + GAP, 0)), BOT = 680;
  const head = headline(ctx, 'Keep x clear', 'on every side');
  const lead = body(ctx, 64, 256, 468, `x is the wordmark's cap height, ${L.clearShare}% of the logo's height. No type, edge or image enters this space. In the glass, each logo inside its clear space, at the scale drawn here.`);
  // a unit square of panel in each corner of the box, x on a side, so the margin reads as x before it is measured; the first carries the label
  const sq = (x, y) => `<div class="a" style="left:${px(x)};top:${px(y)};width:${px(X)};height:${px(X)};background:var(--panel)"></div>`;
  const lab = ctx.ratio(T.soft, T.panel) >= 4.5 ? T.soft : T.ink;
  let boxes = '', keys = '';
  const ms = [];
  ids.forEach((id, i) => {
    const x = xs[i], y = BOT - bh[i];
    boxes += `<div class="a" style="left:${px(x)};top:${px(y)};width:${px(bw[i])};height:${px(bh[i])};border:1px solid var(--hair);box-sizing:border-box"></div>`
      + sq(x, y) + sq(x + bw[i] - X, y) + sq(x, y + bh[i] - X) + sq(x + bw[i] - X, y + bh[i] - X)
      + put(ctx, { x, y: y + (X - 20) / 2, w: X, h: 20, cls: 'v', align: 'center', style: 'line-height:20px', plate: T.panel, fg: lab, html: 'x' })
      + `<div class="a" style="left:${px(x + X)};top:${px(y + X)}">${logoHtml(ctx, T, id, { width: r2(wu[i] * X), colourway: cwG, label: id === 'colour' ? 'Your logo' : L.labels[id] })}</div>`;
    const kw = (i < ids.length - 1 ? xs[i + 1] - 16 : 1016) - x;
    keys += keyAt(ctx, x, kw, `<span class="kn">${A(id === 'colour' ? 'Full logo' : L.labels[id])}</span>`)
      + keyAt(ctx, x, kw, `<span class="num">${wu[i].toFixed(1)}</span> x wide, <span class="num">${(wu[i] + 2).toFixed(1)}</span> x with its space`, KEY + 24);
  });
  // the windows: the clear space as an outline the box's width, the logo's own width solid inside it, both on the box's centre line
  const ys = LIP + Math.max(...bw) / 2;
  ids.forEach((id, i) => {
    const c = xs[i] + bw[i] / 2, lw = wu[i] * X;
    ms.push(windowMark(c - lw / 2, lw, ys - lw / 2, { fill: T.strong }), windowMark(xs[i], bw[i], ys - bw[i] / 2, { stroke: T.ink }));
  });
  return page(ctx, 'clear-space', T, ms, head + lead + boxes + keys);
}

// ---- 012 min-size: the logo at both minimum widths, at actual size; the two values themselves standing in the glass, their tops flat above it ----
function minSize(ctx) {
  const T = tokens(ctx), L = ctx.logo, m = L.minSize, W = ctx.weights, cwG = cwOn(ctx, T.ground);
  const mmPx = 96 / 25.4, cols = [
    { x: 64, t: 'On screen', w: m.screenPx, desc: `<span class="num">${m.screenPx}</span> px wide, <span class="num">${m.screenH}</span> px tall`, n: String(m.screenPx), unit: 'px, the narrowest on screen', fill: T.strong },
    { x: 548, t: 'In print', w: m.printMm * mmPx, desc: `<span class="num">${m.printMm}</span> mm wide, <span class="num">${m.printH}</span> mm tall`, n: String(m.printMm), unit: 'mm, the narrowest in print', fill: T.ink },
  ];
  const head = headline(ctx, 'No smaller', 'than this');
  const lead = body(ctx, 64, 256, 468, 'The logo is never set narrower than these widths. Each is drawn at actual size: on screen at 100%, and in print when this PDF prints at 100%.');
  // a dimension line over each logo, its end stops on the logo's own edges
  const tk = (x, y, w, h) => `<div class="a" style="left:${px(x)};top:${px(y)};width:${px(w)};height:${px(h)};background:var(--quiet)"></div>`;
  const DY = 456;
  const upper = cols.map((c) => put(ctx, { x: c.x, y: 392, w: 452, cls: 'kn', html: c.t }) + put(ctx, { x: c.x, y: 416, w: 452, cls: 'k', html: c.desc })
    + tk(c.x, DY, c.w, 1) + tk(c.x, DY - 5, 1, 11) + tk(c.x + c.w - 1, DY - 5, 1, 11)
    + `<div class="a" style="left:${px(c.x)};top:${DY + 16}px">${logoHtml(ctx, T, 'colour', { width: r2(c.w), colourway: cwG, label: '' })}</div>`).join('');
  // the numerals: one size for both, the largest (up to 560) at which each fits its 452 px column; the top of the figures on LIP, so 48 px stand clear of the glass
  const S = Math.min(...cols.map((c) => fitSize(ctx, 'display', c.n, 560, 452, 0, W.heading, 160)));
  const ms = cols.map((c) => {
    const g = paths(ctx, 'display', c.n, S, 0, W.heading), tx = r2(c.x - g.x1), ty = r2(LIP - g.y1);
    const wd = warpPath(g.d, tx, ty, {});
    return { flat: `<path d="${g.d}" transform="translate(${tx} ${ty})" fill="${c.fill}"/>`, over: wd ? `<path d="${wd}" fill="${c.fill}"/>` : '', body: '' };
  });
  const keys = cols.map((c) => keyAt(ctx, c.x, 452, `<span class="kn num">${A(c.n)}</span> ${c.unit}`)).join('')
    + keyAt(ctx, 548, 452, `${r2(m.printMm * mmPx).toFixed(1)} px at 96 px to the inch`, KEY + 24);
  return page(ctx, 'min-size', T, ms, head + lead + upper + keys);
}

// ---- 013 logo-grounds: one tall window for each brand colour the logo may sit on, every colourway for that ground set inside it, and a last window that is a photograph ----
function grounds(ctx) {
  const T = tokens(ctx), B = ctx.brand, L = ctx.logo, cws = B.logo.colourways;
  const G = ctx.colours.slice().sort((a, b) => b.share - a.share).map((c) => ({ c, ids: Object.keys(cws).filter((k) => lo(cws[k].ground) === lo(c.hex)) })).filter((g) => g.ids.length).slice(0, 5);
  const N = G.length + 1, KR = Math.floor((80 - 2 * (N - 1)) / N), w = KR * P, x0 = 60, at = (i) => x0 + i * (KR + 2) * P, TOP = 288;
  const lw = w - 40, lh = lw / L.geo.aspect, head = headline(ctx, 'Where it sits', '');
  const lead = body(ctx, 64, 176, 520, 'Each brand colour that carries the logo, with the colourways made for it, and a photograph. Set it on a flat area of the ground, never across an edge.');
  let html = '', keys = '';
  const ms = G.map((g, i) => {
    const x = at(i), hex = g.c.hex, isG = lo(hex) === lo(T.ground), fg = inkOn(ctx, T, hex);
    g.ids.slice(0, 3).forEach((id, j) => {
      const y = TOP + w / 2 + 40 + j * 112;
      html += `<div class="a" style="left:${px(x + 20)};top:${px(y)}">${logoHtml(ctx, T, 'colour', { width: lw, colourway: id, color: fg, label: '' })}</div>`
        + put(ctx, { x: x + 20, y: y + lh + 12, w: lw, h: 20, cls: 'k', plate: hex, fg, style: 'line-height:20px', html: A(cwName(ctx, id)) });
    });
    keys += keyAt(ctx, x, w, `<span class="kn">${A(g.c.name)}</span>`) + keyAt(ctx, x, w, `<span class="v num">${A(hex.toUpperCase())}</span>`, KEY + 24);
    return windowMark(x, w, TOP, isG ? { stroke: T.ink } : { fill: hex });
  });
  // the photograph: the brand's own first photograph if it has one, else the theme's dusk hallway (room-hall-laptop) cropped to the open door, the laptop out of frame.
  // The scene must be given art for its one surface: the brand's ground with its logo, which this crop never shows.
  // The logo goes on a quiet area of the photograph: a flat stretch with no edge, window frame or subject under it. The brand marks that spot on its shot (`quiet`, [x, y] as fractions of the
  // picture, the centre of the logo); the dusk hallway's is the bare wall between the lamp and the table (scene x 560, y 420). The logo's centre stays above the band (y 768) less half its height.
  const x = at(G.length), ph = BB - TOP, own = ctx.edition !== 'slot' && (B.imagery.shots || []).find((s) => s.photo), lhP = lw / L.geo.aspect;
  const clampY = (cy) => Math.min(Math.max(cy - lhP / 2, TOP + w / 2 + 16), 768 - lhP - 16);
  let img, ly;
  if (own) {
    const n = jpegSize(), k = Math.max(w / n.w, ph / n.h), iw = n.w * k, ih = n.h * k, [qx, qy] = Array.isArray(own.quiet) && own.quiet.length === 2 ? own.quiet : [0.5, 0.5];
    const ix = x - Math.min(Math.max(qx * iw - w / 2, 0), iw - w), iy = TOP - Math.min(Math.max(qy * ih - ph / 2, 0), ih - ph);
    img = `<image href="${A(ctx.photoUrl(own.photo))}" x="${r2(ix)}" y="${r2(iy)}" width="${r2(iw)}" height="${r2(ih)}" preserveAspectRatio="none"/>`;
    ly = clampY(iy + qy * ih);
  } else {
    const s = ph / 1024; ly = clampY(TOP + 420 * s);
    const art = `<div style="width:1440px;height:900px;background:${T.ground};display:flex;align-items:center;justify-content:center"></div>`;
    const url = ctx.mockup('room-hall-laptop', { 'screen-laptop': { html: ctx.artPage(art, { w: 1440, h: 900 }), w: 1440, h: 900 } });
    img = `<image href="${A(url)}" x="${r2(x + w / 2 - 560 * s)}" y="${TOP}" width="${r2(1536 * s)}" height="${ph}" preserveAspectRatio="none"/>`;
  }
  const win = windowMark(x, w, TOP, { fill: T.ground });
  const flat = `<defs><clipPath id="g2-grounds-photo"><path d="${win.d}"/></clipPath></defs><g clip-path="url(#g2-grounds-photo)">${img}</g>`;
  const shape = `<svg x="${x}" y="768" width="${w}" height="384" viewBox="${x} 768 ${w} 384">${img}</svg>`;
  const pid = cws['mono-light'] ? 'mono-light' : cwOn(ctx, T.light ? T.ink : T.ground);
  html += `<div class="a" style="left:${px(x + 20)};top:${px(ly)}">${logoHtml(ctx, T, 'colour', { width: lw, colourway: pid, color: cws[pid].name, label: '' })}</div>`;
  keys += keyAt(ctx, x, 1016 - x, '<span class="kn">A photograph</span>') + keyAt(ctx, x, 1016 - x, A(cwName(ctx, pid)), KEY + 24);
  return page(ctx, 'logo-grounds', T, ms, head + lead + html + keys, { flat, shape });
}
const cwG = (ctx, T) => cwOn(ctx, T.ground);

// ---- 014 logo-misuse: five misuses crossed out above the glass; the sixth, the logo over a busy ground, is laid over the glass itself ----
function misuse(ctx) {
  const T = tokens(ctx), B = ctx.brand, L = ctx.logo, cws = B.logo.colourways, cw = cwOn(ctx, T.ground), slot = ctx.edition === 'slot';
  const asp = L.geo.aspect, CW = 304, BH = 168, cx = (c) => 64 + c * (CW + 20), ry = (r) => (r ? 416 : 96);
  // a recolour: the ramp step, from any brand colour, with the most chroma that still reads on the ground (3:1) and sits 0.1 OKLCH L from every logo colour
  const used = new Set(Object.values(cws).flatMap((c) => Object.values(c)).map(lo)), Lk = (h) => ctx.C.toOklch(h);
  let re = null;
  for (const c of ctx.colours) for (const st of [200, 300, 400, 500, 600, 700, 800]) {
    const h = c.ramp && c.ramp[st]; if (!h || used.has(lo(h)) || ctx.ratio(h, T.ground) < 3) continue;
    if ([...used].some((u) => /^#[0-9a-f]{6}$/.test(u) && Math.abs(Lk(u).L - Lk(h).L) < 0.1)) continue;
    if (!re || Lk(h).C > Lk(re).C) re = h;
  }
  re = re || T.quiet;
  // the logo at w x h: the drawing (stretched when h is not its own height), one flat colour, or the slot's frame
  const mark = (w, h, { fill, color = T.quiet, label = true } = {}) => {
    if (slot) return `<div role="img" aria-label="Logo slot" style="width:${px(w)};height:${px(h)};box-sizing:border-box;border:1.5px dashed ${fill || color};color:${fill || color};display:flex;align-items:center;justify-content:center;font:400 ${TXT}px/1.2 var(--chrome)">${label && h >= 20 ? 'Your logo' : ''}</div>`;
    return L.svg('colour', { colourway: cw, width: w, fill }).replace('<svg ', '<svg preserveAspectRatio="none" style="display:block" ').replace(/height="[\d.]+"/, `height="${r2(h)}"`);
  };
  const lw = 200, lh = lw / asp;
  const at = (w, h, inner, style = '') => `<div class="a" style="left:${px((CW - w) / 2)};top:${px((BH - h) / 2)};${style}">${inner}</div>`;
  const cells = [
    { c: 1, r: 0, t: 'Stretched', b: 'Never stretch, squash or redraw it. Scale it whole.', art: at(lw * 1.4, lh * 0.8, mark(lw * 1.4, lh * 0.8)) },
    { c: 2, r: 0, t: 'Recoloured', b: `It comes in its ${word(Object.keys(cws).length).toLowerCase()} colourways and no others.`, art: at(lw, lh, mark(lw, lh, { fill: re, label: false })) },
    { c: 0, r: 1, t: 'Rotated', b: 'Set it level, on the line of the text around it.', art: at(lw, lh, mark(lw, lh), 'transform:rotate(-12deg)') },
    { c: 1, r: 1, t: 'Effects', b: 'No shadow, glow, bevel or texture. It is flat.', art: at(lw, lh, mark(lw, lh, { fill: T.quiet, label: false }), 'transform:translate(8px,8px)') + at(lw, lh, mark(lw, lh)) },
    { c: 2, r: 1, t: 'Boxed', b: 'Never frame it in a keyline. Give it its clear space instead.', art: at(lw + 24, lh + 24, `<div style="width:${px(lw + 24)};height:${px(lh + 24)};box-sizing:border-box;border:2px solid ${T.ink};padding:10px">${mark(lw, lh)}</div>`) },
  ];
  // the cross: one stroke corner to corner in the strong colour, on a keyline of the ground so it holds over any colour
  const cross = (w, h, i = 16) => `<svg class="a" style="left:0;top:0" width="${w}" height="${h}" aria-hidden="true"><path d="M${i} ${h - i}L${w - i} ${i}" stroke="${T.ground}" stroke-width="8" stroke-linecap="round"/><path d="M${i} ${h - i}L${w - i} ${i}" stroke="${T.strong}" stroke-width="3" stroke-linecap="round"/></svg>`;
  const head = headline(ctx, 'Never this', '', { w: CW });
  const lead = body(ctx, 64, 176, CW, 'Six ways the logo breaks, each crossed out. The sixth is below: the logo laid over the glass.');
  const html = cells.map((k) => {
    const x = cx(k.c), y = ry(k.r);
    return `<div class="a" style="left:${x}px;top:${y}px;width:${CW}px;height:${BH}px">${k.art}${cross(CW, BH)}</div>`
      + put(ctx, { x, y: y + BH + 16, w: CW, cls: 'kn', html: k.t }) + body(ctx, x, y + BH + 40, CW, k.b, 'font-size:15px;line-height:22px');
  }).join('');
  // the sixth: the logo 480 wide over the reeds, which refract the palette by share behind them
  const bw = 480, bh = bw / asp, bx = 540 - bw / 2, by = 960 - bh / 2;
  const busy = `<div class="a" style="left:${px(bx - 32)};top:${px(by - 32)};width:${px(bw + 64)};height:${px(bh + 64)}"><div class="a" style="left:32px;top:32px">${logoHtml(ctx, T, 'colour', { width: bw, colourway: cw })}</div>${cross(bw + 64, bh + 64, 8)}</div>`;
  const keys = keyAt(ctx, 64, 304, '<span class="kn">On a busy ground</span>') + keyAt(ctx, 388, 628, 'Never over the glass, a pattern or the busy part of a photograph. Find it a flat area of one colour.');
  return page(ctx, 'logo-misuse', T, [], head + lead + html + busy + keys, { fields: true });
}

export const guidelines = { 'logo-versions': versions, 'clear-space': clearSpace, 'min-size': minSize, 'logo-grounds': grounds, 'logo-misuse': misuse };
