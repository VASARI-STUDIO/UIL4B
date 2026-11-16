// Theme 23, Broadsheet, lane g2: the six logo pages (logo, logo-versions, clear-space, min-size, logo-grounds, logo-misuse).
// Each page is one story on the paper, set in a newspaper's own way of showing a thing: the picture above the fold, a register of seven, a
// runaround and a rule set around the nameplate, a printer's line gauge at actual size, the press colour bar, and a galley proof marked up.
// Nothing here names a brand, a colour id or a photo id: versions, colourways, grounds, sizes and copy come from brand data and ctx.logo.
import { A, N, G, E, col, hr, px, pad3, jump, folio, fitLines, headLines, fitLogo, copyGuard } from './helpers.js';

const WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
const word = (n) => WORDS[n] || String(n);
const lc = (s) => s.charAt(0).toLowerCase() + s.slice(1);
const page = (ctx, id, inner) => copyGuard(ctx, id, `<section class="pg" data-page="${id}">${inner}</section>`);
const r1 = (n) => +n.toFixed(1);

// ---- colour words: a colourway said in the brand's colour names, never its hex unless the colour has no name ----------------------
const nameOf = (ctx, hex) => {
  const c = ctx.colours.find((x) => x.hex.toLowerCase() === String(hex).toLowerCase());
  return c ? A(c.name) : /^#?f{6}$/i.test(String(hex).replace('#', '')) ? 'White' : `<span class="c-mono">${A(hex)}</span>`;
};
// "Bluestone name, Quandong mark", or "All Bluestone" when every part takes one colour
const partsOf = (ctx, cw) => {
  const keys = Object.keys(cw).filter((k) => k !== 'ground'), hexes = [...new Set(keys.map((k) => cw[k].toLowerCase()))];
  return hexes.length === 1 ? `All ${nameOf(ctx, cw[keys[0]])}` : keys.map((k) => `${nameOf(ctx, cw[k])} ${A(k)}`).join(', ');
};
const ratio = (ctx, a, b) => ctx.C.ratio(a, b);
// the colour a slot frame's label takes on a ground: whichever of the logo's own name colour, the ink and the paper reads best on it
const labelOn = (ctx, ground, cw) => [cw ? cw.name : null, N.ink, N.paper].filter(Boolean).reduce((b, c) => (ratio(ctx, c, ground) > ratio(ctx, b, ground) ? c : b));
// a ground that would vanish into the newsprint gets a hairline edge
const edge = (ctx, ground) => (ratio(ctx, ground, N.paper) < 1.3 ? 'box-shadow:inset 0 0 0 .75px var(--hair);' : '');
const logoH = (ctx, id, w) => w * ctx.logo.geos[id].h / ctx.logo.geos[id].w;
// a logo placed with its top-left corner at x, y (page px)
const logoAt = (ctx, id, x, y, w, opts = {}) => E(x, y, 'g2-lg', ctx.logo.html(id, { width: w, label: 'Logo', ...opts }), { w, h: logoH(ctx, id, w) });


// ---- photographs: where a logo can sit on one, measured from the picture itself ------------------------------------------------------
// A brand's photographs are cover-fitted to a box and reduced to a grid of 4 px cells of luminance, so the grounds page can put the logo on the
// darkest, quietest patch it finds and the misuse page on the busiest. The server holds no photographs and no browser to measure them in, so
// there are no grids: both pages run their no-photograph layouts.
const CELL = 4;
const BOXES = { hero: [1000, 456], slot: [488, 168] };
const GRIDS = {};
// mean and spread of luminance over a rectangle (page px inside the box)
function stats(g, x, y, w, h) {
  const c0 = Math.max(0, Math.floor(x / CELL)), c1 = Math.min(g.cw, Math.ceil((x + w) / CELL)), r0 = Math.max(0, Math.floor(y / CELL)), r1_ = Math.min(g.ch, Math.ceil((y + h) / CELL));
  let n = 0, s = 0, s2 = 0;
  for (let r = r0; r < r1_; r++) for (let c = c0; c < c1; c++) { const v = g.Y[r * g.cw + c]; n++; s += v; s2 += v * v; }
  const m = s / n; return { m, sd: Math.sqrt(Math.max(0, s2 / n - m * m)) };
}
// every place a w x h logo (with its clear space pad) fits inside the box, inset by m
function spots(g, W, H, w, h, pad, m) {
  const out = [];
  for (let y = m; y + h <= H - m; y += 8) for (let x = m; x + w <= W - m; x += 8) out.push({ x, y, ...stats(g, x - pad, y - pad, w + 2 * pad, h + 2 * pad) });
  return out;
}
const shotsWithGrid = (ctx, key) => ctx.brand.imagery.shots.filter((s) => GRIDS[`${ctx.slug}|${s.id}|${key}`]);

// ---- small pieces -------------------------------------------------------------------------------------------------------------------
// the logo section's pages, from the page list, so a cross-reference never names a page this document does not have
const logoPages = (ctx) => { const me = ctx.pages.find((p) => p.id === 'logo'); return me && me.section ? ctx.pages.filter((p) => p.section && p.section.title === me.section.title) : []; };
const headline = (ctx, text, { w = 1000, max = 64, min = 44, lines = 2 } = {}) => {
  const hd = fitLines(ctx, text, { w, max, min, maxLines: lines }), lh = Math.round(hd.size * 68 / 64);
  return { html: E(G.left, G.top, 'story', headLines(hd.lines, hd.size, lh), { w }), bottom: G.top + hd.lines.length * lh };
};
// the clear-space unit said in words: the capital it is the height of, when the plugin measured it from the name's cap height
const unitWords = (ctx) => {
  const L = ctx.logo, wm = String(ctx.brand.logo.showcase?.wordmark || ctx.brand.name), first = wm.charAt(0);
  const isCap = L.geo.cap === L.geo.unit && /\p{Lu}/u.test(first) && ctx.edition !== 'slot';
  return isCap ? `the height of the capital ${first}, ${L.clearShare}% of the logo’s height` : `${L.clearShare}% of the logo’s height`;
};
// centre a primary logo in a box; a wordmark with a tail (a kerb) is centred on its name while the tail still clears the box
function centred(ctx, id, bx, by, bw, bh, w) {
  const L = ctx.logo, gm = L.geo || {}, h = logoH(ctx, id, w);
  let x = bx + (bw - w) / 2;
  if (L.geos[id] === L.geos.colour && gm.W && gm.tail && ctx.edition !== 'slot') {
    const s = w / L.geos.colour.w, xn = bx + bw / 2 - gm.W * s / 2;
    if (xn + w <= bx + bw - 16) x = xn;
  }
  return { x, y: by + (bh - h) / 2, w, h };
}
// an ink cross over a box, drawn as an svg so it stays a hairline at any size
const cross = (x, y, w, h) => `<svg class="a g2-x" style="left:${px(x)};top:${px(y)}" width="${r1(w)}" height="${r1(h)}" viewBox="0 0 ${r1(w)} ${r1(h)}" aria-hidden="true"><path d="M0 0L${r1(w)} ${r1(h)}M${r1(w)} 0L0 ${r1(h)}" stroke="${N.ink}" stroke-width="2" fill="none"/></svg>`;

export const guidelines = {
  // ---- the logo: the picture above the fold, the nameplate as this page's headline, the idea as the story below it ----------------------
  logo: (ctx) => {
    const B = ctx.brand, L = ctx.logo, cw = B.logo.colourways.colour, PH = 616, PY = G.top;
    const plate = E(G.left, PY, 'g2-plate', '', { w: 1000, h: PH, style: `background:${cw.ground};${edge(ctx, cw.ground)}` });
    const w0 = fitLogo(ctx, 'colour', 744, 248), c = centred(ctx, 'colour', G.left, PY, 1000, PH, w0);
    const mark = logoAt(ctx, 'colour', c.x, c.y, c.w, { colourway: 'colour', color: labelOn(ctx, cw.ground, cw), label: 'Your logo goes here' });
    // the caption runs under the picture as a news photograph's does; the credit line on the right says what the name is drawn in
    const yc = PY + PH + 8, face = B.fonts.display;
    const capt = E(G.left, yc, 'c-cap c-ink', `<span class="c-label">${A(L.labels.colour)}.</span> ${A(B.logo.when.colour)}`, { w: 744 });
    const credit = ctx.edition === 'slot' ? '' : E(G.x[3], yc, 'c-cap c-quiet c-right', `Name in ${A(face.family)}`, { w: G.col });
    // below the fold: the idea as the story, the logo's colours in a ruled list, the section's other pages as an index
    const y0 = 848;
    const story = col(G.left, y0, 488, `<p class="b-deck g2-idea">${A(B.logo.idea)}</p>`);
    const parts = Object.keys(cw).map((k, i, a) => `<div class="g2-row${i === a.length - 1 ? ' last' : ''}"><p class="c-label">${A(k.charAt(0).toUpperCase() + k.slice(1))}</p><p class="c-cap c-ink">${nameOf(ctx, cw[k])}</p><p class="c-mono">${A(cw[k].toUpperCase())}</p></div>`).join('');
    const colours = col(G.x[2], y0, G.col, `<p class="c-label">In full colour</p><div class="g2-list">${parts}</div>`, { rule: true });
    const others = logoPages(ctx).filter((p) => p.id !== 'logo');
    const ix = others.map((p, i) => `<div class="g2-ix${i === others.length - 1 ? ' last' : ''}"><span class="c-note">${A(p.title)}</span><span class="c-label">${pad3(p.no)}</span></div>`).join('');
    const index = others.length ? col(G.x[3], y0, G.col, `<p class="c-label">In this section</p><div class="g2-list">${ix}</div>`, { rule: true }) : '';
    return page(ctx, 'logo', folio(ctx, 'logo') + plate + mark + capt + credit + story + colours + index);
  },

  // ---- logo versions: a register of seven, every version drawn to one scale on the ground its colourway names ------------------------------
  'logo-versions': (ctx) => {
    const B = ctx.brand, L = ctx.logo, cws = B.logo.colourways;
    const order = ['colour', 'mono-dark', 'mono-light', 'reversed', 'horizontal', 'stacked', 'symbol'].filter((v) => L.geos[v]);
    const hd = headline(ctx, `One logo, ${lc(word(order.length))} versions.`);
    // one scale for all seven, so the name is the same size in each: the largest at which every version fits its box
    const g = L.geos, s = Math.min(264 / g.colour.w, 72 / g.colour.h, 424 / g.horizontal.w, 64 / g.horizontal.h, 360 / g.stacked.w, 136 / g.stacked.h, 200 / g.symbol.w, 96 / g.symbol.h);
    const yH = hd.bottom + 48, heads = E(G.left, yH, 'c-folio c-quiet', 'Version') + E(G.x[2], yH, 'c-folio c-quiet', 'Colours') + E(G.x[3], yH, 'c-folio c-quiet', 'When to use it');
    let y = yH + 30, rows = '';
    order.forEach((v, i) => {
      const k = L.colourwayOf(v), cw = cws[k], w = g[v].w * s, h = g[v].h * s, bh = Math.max(104, Math.round(h + 48));
      rows += E(G.left, y + 16, 'g2-gd', '', { w: 488, h: bh, style: `background:${cw.ground};${edge(ctx, cw.ground)}` });
      const c = centred(ctx, v, G.left, y + 16, 488, bh, w);
      rows += logoAt(ctx, v, c.x, c.y, w, { colourway: k, color: labelOn(ctx, cw.ground, cw), label: L.labels[v] });
      rows += E(G.x[2], y + 16, 'g2-txt', `<p class="c-label">${A(L.labels[v])}</p><p class="c-cap c-quiet">${partsOf(ctx, cw)}, on ${nameOf(ctx, cw.ground)}</p>`, { w: G.col });
      rows += E(G.x[3], y + 16, 'c-note', A(B.logo.when[v] || ''), { w: G.col });
      y += bh + 32;
      rows += hr(G.left, y, 1000, i === order.length - 1 ? 1 : .75, i === order.length - 1 ? 'ink' : 'hair');
    });
    const foot = col(G.left, y + 16, 488, `<p class="c-cap c-quiet">${ctx.edition === 'slot' ? 'Each version is drawn to one scale.' : 'All drawn to one scale, so the name is the same size in each.'}</p>${jump(ctx, 'clear-space', 'Clear space for every version')}`);
    return page(ctx, 'logo-versions', folio(ctx, 'logo-versions') + hd.html + heads + hr(G.left, yH + 29, 1000, 1) + rows + foot);
  },

  // ---- clear space: the zone drawn in units of x, the rule text runs beside it, and the paper's own head rule set around the logo -------
  'clear-space': (ctx) => {
    const L = ctx.logo, gc = L.geos.colour, u = L.geo.unit, cw = ctx.brand.logo.colourways.colour;
    const hd = headline(ctx, 'Keep x clear on every side.');
    // the zone fills the measure: the logo plus x on each side is 1000 px wide
    const ZW = 1000, s = ZW / (gc.w + 2 * u), X = u * s, lw = gc.w * s, lh = gc.h * s, ZH = lh + 2 * X, zx = G.left, zy = hd.bottom + 56;
    const zone = E(zx, zy, 'g2-zone', '', { w: ZW, h: ZH }) + E(zx + X, zy + X, 'g2-zin', '', { w: lw, h: lh })
      + [[0, 0], [ZW - X, 0], [0, ZH - X], [ZW - X, ZH - X]].map(([a, b]) => E(zx + a, zy + b, 'g2-unit', '', { w: X, h: X })).join('')
      + logoAt(ctx, 'colour', zx + X, zy + X, lw, { colourway: 'colour', color: N.ink, label: 'Your logo goes here' });
    // the four measures: a tick line from the zone's edge to the logo's, with its x
    const dimV = (x, y) => `<i class="a g2-dv" style="left:${px(x)};top:${px(y)};height:${px(X)}"></i>` + E(x + 8, y + X / 2 - 11, 'g2-xl', 'x');
    const dimH = (x, y) => `<i class="a g2-dh" style="left:${px(x)};top:${px(y)};width:${px(X)}"></i>` + E(x + X / 2 - 4, y - 26, 'g2-xl', 'x');
    const dims = dimV(zx + ZW / 2, zy) + dimV(zx + ZW / 2, zy + X + lh) + dimH(zx, zy + ZH / 2) + dimH(zx + X + lw, zy + ZH / 2);
    const yn = zy + ZH + 40;
    const notes = [`<p class="c-note">x is ${A(unitWords(ctx))}.</p>`, '<p class="c-note">Measured from the edge of the logo, on all four sides.</p>', '<p class="c-note">Nothing enters the zone: no type, no rules, no edges, no other logos.</p>', `<p class="c-note">Drawn here, x is <span class="c-mono c-ink">${Math.round(X)} px</span>.</p>`];
    const side = notes.map((t, i) => col(G.x[i], yn, G.col, t, { rule: i > 0 })).join('');
    // in the paper: the thin-thick head rule stops x short of the horizontal logo on both sides
    const gh = L.geos.horizontal, hw = Math.min(744, fitLogo(ctx, 'horizontal', 744, 168)), s2 = hw / gh.w, X2 = u * s2, hh = gh.h * s2;
    const y2 = Math.max(yn + 120 + 208, 940), mid = y2 + hh / 2, hx = G.mid - hw / 2, a = hx - X2, b = hx + hw + X2;
    const rules = hr(G.left, mid - 4, a - G.left, 1) + hr(G.left, mid, a - G.left, 3) + hr(b, mid - 4, G.right - b, 1) + hr(b, mid, G.right - b, 3);
    const hlogo = logoAt(ctx, 'horizontal', hx, y2, hw, { colourway: 'colour', color: N.ink, label: 'Logo' });
    const marks = `<i class="a g2-dh" style="left:${px(a)};top:${px(y2 - 24)};width:${px(X2)}"></i><i class="a g2-dh" style="left:${px(hx + hw)};top:${px(y2 - 24)};width:${px(X2)}"></i>`
      + E(a + X2 / 2 - 4, y2 - 52, 'g2-xl', 'x') + E(hx + hw + X2 / 2 - 4, y2 - 52, 'g2-xl', 'x');
    const yc = y2 + hh + 40;
    const cap = col(G.left, yc, 488, `<p class="c-cap c-ink"><span class="c-label">In the paper.</span> The head rule stops x short of the logo, on both sides, as type and photographs do.</p>${jump(ctx, 'min-size', 'How small it goes')}`);
    void cw;
    return page(ctx, 'clear-space', folio(ctx, 'clear-space') + hd.html + zone + dims + side + rules + hlogo + marks + cap);
  },

  // ---- minimum size: the two numbers as the headline, the logo at actual size on a printer's line gauge ----------------------------------
  'min-size': (ctx) => {
    const L = ctx.logo, m = L.minSize, mm = 96 / 25.4;
    const hdf = fitLines(ctx, `${m.screenPx} px on screen. ${m.printMm} mm in print.`, { w: 1000, max: 144, min: 72, maxLines: 2, step: 1 });
    const hlh = Math.round(hdf.size * 0.95), head = E(G.left, G.top, 'story', headLines(hdf.lines, hdf.size, hlh, 'b-headxl'), { w: 1000 }), hb = G.top + hdf.lines.length * hlh;
    const deck = col(G.left, hb + 40, 488, `<p class="b-deck g2-deck">The full colour logo is never drawn narrower than these widths. Below, both are drawn at actual size.</p>`);
    // the gauges stand on one line; each logo sits on its gauge from the zero mark
    const sw = m.screenPx, sh = logoH(ctx, 'colour', sw), pw = m.printMm * mm, ph = logoH(ctx, 'colour', pw);
    // the ladder: the screen minimum doubled, then doubled again, then again; each rung is a ruled row with its multiple and its width
    let yl = hb + 40 + 3 * 32 + 64, ladder = '';
    for (const k of [2, 4, 7]) {
      const w = Math.min(sw * k, 744), h = logoH(ctx, 'colour', w), pad = 48;
      ladder += hr(G.left, yl, 1000, 1) + E(G.left, yl + pad, 'c-mono c-ink', `×${+(w / sw).toFixed(1)}`, { w: 232 }) + E(G.left, yl + pad + 24, 'c-cap c-quiet', `${Math.round(w)} px wide`, { w: 232 })
        + logoAt(ctx, 'colour', G.x[1], yl + pad, w, { colourway: 'colour', color: N.ink, label: 'Logo' });
      yl += pad + Math.max(h, 48) + pad;
    }
    ladder += hr(G.left, yl, 1000, 1);
    const yG = Math.max(yl + 96, 960);
    const cwc = ctx.brand.logo.colourways.colour;
    const lg = logoAt(ctx, 'colour', G.left, yG - 16 - sh, sw, { colourway: 'colour', color: N.ink, label: 'Logo' })
      + logoAt(ctx, 'colour', G.x[2], yG - 16 - ph, pw, { colourway: 'colour', color: N.ink, label: 'Logo' });
    // a line gauge: a long rule with ticks, every 8 px (every 40 labelled), or every millimetre (every 5 longer, every 10 labelled)
    const gauge = (x0, len, step, mid, big, unit, fmt) => {
      let d = `M0 0.5H${len}`, labels = '';
      for (let i = 0, v = 0; v <= len + 0.01; i++, v = i * step) {
        const t = i % big === 0 ? 14 : mid && i % mid === 0 ? 9 : 5;
        d += `M${r1(v) + 0.5} 0V${t}`;
        if (i % big === 0 && v + 64 <= len) labels += E(x0 + v, yG + 20, 'c-mono c-quiet', fmt(i * (unit === 'mm' ? 1 : step)));
      }
      return `<svg class="a" style="left:${px(x0)};top:${px(yG)}" width="${len + 1}" height="15" viewBox="0 0 ${len + 1} 15" aria-hidden="true"><path d="${d}" stroke="${N.ink}" stroke-width="1" fill="none"/></svg>` + labels;
    };
    const gs = gauge(G.left, 480, 8, 0, 5, 'px', (v) => String(v)) + E(G.left + 488 - 40, yG + 20, 'c-mono c-quiet c-right', 'px', { w: 40 });
    const gp = gauge(G.x[2], Math.floor(488 / mm) * mm, mm, 5, 10, 'mm', (v) => String(v)) + E(G.x[2] + 488 - 40, yG + 20, 'c-mono c-quiet c-right', 'mm', { w: 40 });
    // the width the logo takes, marked on the gauge in ink
    const bars = hr(G.left, yG - 8, sw, 2) + hr(G.x[2], yG - 8, pw, 2);
    const yc = yG + 72;
    const caps = col(G.left, yc, 488, `<p class="c-label">On screen</p><p class="c-cap c-quiet"><span class="c-mono c-ink">${sw} × ${m.screenH} px</span>, at one pixel to the pixel. The smallest on any screen.</p>`)
      + col(G.x[2], yc, 488, `<p class="c-label">In print</p><p class="c-cap c-quiet"><span class="c-mono c-ink">${m.printMm} × ${m.printH} mm</span>, at true size when this page prints at A3. The smallest on any paper.</p>${jump(ctx, 'logo-grounds', 'Grounds it sits on')}`, { rule: true });
    void cwc;
    return page(ctx, 'min-size', folio(ctx, 'min-size') + head + deck + ladder + lg + bars + gs + gp + caps);
  },

  // ---- logo grounds: a photograph with the logo on its quietest patch, then the grounds as a press colour bar, one logo a patch ------------
  'logo-grounds': (ctx) => {
    const B = ctx.brand, L = ctx.logo, cws = B.logo.colourways;
    // one colourway per ground: full colour first, then reversed, then the brand's own, then the mono pair only for a ground nothing else covers
    const keys = Object.keys(cws), pref = ['colour', 'reversed', ...keys.filter((k) => !['colour', 'reversed', 'mono-dark', 'mono-light'].includes(k)), 'mono-dark', 'mono-light'].filter((k) => cws[k]);
    const seen = new Set(), grounds = [];
    for (const k of pref) { const gr = cws[k].ground.toLowerCase(); if (!seen.has(gr)) { seen.add(gr); grounds.push(k); } }
    const gs = grounds.slice(0, 6), names = gs.map((k) => nameOf(ctx, cws[k].ground));
    const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names[0];
    const hd = headline(ctx, `It sits on ${list.replace(/<[^>]+>/g, '')}.`);
    // the photograph, 1000 x 456: the logo goes where the picture is darkest and quietest (mono light), or, failing that, lightest (full colour)
    const [PW, PHh] = BOXES.hero, py = hd.bottom + 48, lw = 280;
    let best = null;
    for (const sh of shotsWithGrid(ctx, 'hero')) {
      const gr = GRIDS[`${ctx.slug}|${sh.id}|hero`], h = logoH(ctx, 'colour', lw), pad = L.geo.unit * lw / L.geos.colour.w;
      for (const p of spots(gr, PW, PHh, lw, h, pad, 48)) {
        const dark = p.m < 0.4, light = p.m > 0.66, sc = dark ? p.m + 2 * p.sd : light ? (1 - p.m) + 2 * p.sd : 9;
        if (sc < 9 && (!best || sc < best.sc)) best = { sc, sh, x: p.x, y: p.y, k: dark ? 'mono-light' : 'colour' };
      }
    }
    let photo = '', pcap = '', yb = py;
    if (best) {
      const k = cws[best.k] ? best.k : 'colour';
      const pic = ctx.photo(best.sh.id, { style: `width:${PW}px;height:${PHh}px`, pos: `${(best.sh.focus || [0.5, 0.5])[0] * 100}% ${(best.sh.focus || [0.5, 0.5])[1] * 100}%` });
      photo = E(G.left, py, 'g2-ph', pic, { w: PW, h: PHh })
        + logoAt(ctx, 'colour', G.left + best.x, py + best.y, lw, { colourway: k, color: k === 'mono-light' ? cws[k].name : N.ink, label: 'Logo' });
      pcap = E(G.left, py + PHh + 8, 'c-cap c-ink', `<span class="c-label">On a photograph.</span> ${A(L.labels[k] || k)}: ${A(lc(B.logo.when[k] || ''))}`, { w: 744 })
        + (best.sh.caption ? E(G.x[3], py + PHh + 8, 'c-cap c-quiet', A(best.sh.caption), { w: G.col }) : '');
      yb = py + PHh + 8 + 44 + 48;
    }
    // the colour bar: the grounds abut across the measure; with four, each patch's edges fall on the column rules, so a caption sits in its column
    const n = gs.length, FH = 272, xs = n === 4 ? [G.left, ...G.rule, G.right] : Array.from({ length: n + 1 }, (_, i) => G.left + 1000 * i / n);
    let bar = '', caps = '';
    gs.forEach((k, i) => {
      const cw = cws[k], x = xs[i], w = xs[i + 1] - x;
      bar += E(x, yb, 'g2-gd', '', { w, h: FH, style: `background:${cw.ground};${i === 0 ? edge(ctx, cw.ground) : ''}` });
      const lw2 = Math.max(L.minSize.screenPx, fitLogo(ctx, 'colour', w - 72, 80)), c = centred(ctx, 'colour', x, yb, w, FH, lw2);
      bar += logoAt(ctx, 'colour', c.x, c.y, lw2, { colourway: k, color: labelOn(ctx, cw.ground, cw), label: 'Logo' });
      const tx = n === 4 ? G.x[i] : x + (i ? 12 : 0), tw = n === 4 ? G.col : w - 24;
      caps += E(tx, yb + FH + 16, 'g2-txt', `<p class="c-label">On ${nameOf(ctx, cw.ground)}</p><p class="c-cap c-quiet">${partsOf(ctx, cw)}.</p>`, { w: tw });
    });
    const yj = yb + FH + 16 + 22 + 44 + 24;
    const foot = col(G.left, yj, 488, `<p class="c-cap c-quiet">Each in its own colourway, and no ground but these.</p>${jump(ctx, 'logo-misuse', 'What never to do')}`);
    return page(ctx, 'logo-grounds', folio(ctx, 'logo-grounds') + hd.html + photo + pcap + bar + caps + foot);
  },

  // ---- logo misuse: a galley proof down the middle of the page, six faults struck out, the fault named in the left margin and the fix in the right
  'logo-misuse': (ctx) => {
    const B = ctx.brand, L = ctx.logo, C = ctx.C;
    const hd = headline(ctx, 'Use the files as they are.');
    const deck = col(G.left, hd.bottom + 32, 488, `<p class="b-deck g2-deck">Six things never to do to the logo, each struck out on the proof, with the fix beside it.</p>`);
    const [GW, SH] = BOXES.slot, gx = G.x[1], gy = hd.bottom + 32 + 3 * 32 + 48, w = 216;
    // a wrong colour: the action colour turned half way round the wheel, at a lightness that still shows on the proof
    const o = C.toOklch(ctx.roles.light.action), oc = Math.max(o.C, 0.08), oh = (o.H + 180) % 360;
    let l = Math.min(o.L, 0.5), wrong = C.fromOklch(l, oc, oh);
    // dark enough that the slot frame's label, drawn in it, still reads on the proof
    while (C.ratio(wrong, N.paper2) < 4.5 && l > 0.2) { l -= 0.02; wrong = C.fromOklch(l, oc, oh); }
    const mh = logoH(ctx, 'colour', w), shadow = `rgba(${C.hexToRgb(B.logo.colourways.colour.name).join(',')},.5)`;
    // the busy ground: the brand's photograph cropped to the slot, with the logo over its busiest patch
    let busy = null;
    for (const sh of shotsWithGrid(ctx, 'slot')) for (const p of spots(GRIDS[`${ctx.slug}|${sh.id}|slot`], GW, SH, w, mh, 0, 16)) if (!busy || p.sd > busy.sd) busy = { ...p, sh };
    const items = [
      ['Stretched', 'Never squash or stretch it. Scale it evenly.', `<div style="transform:scale(1.4,.62)">${L.forMisuse(w)}</div>`],
      ['Recoloured', 'Never recolour it. Use a colourway from the versions page.', L.forMisuse(w, { fill: wrong })],
      ['Rotated', 'Never tilt or turn it. It sits level with the page.', `<div style="transform:rotate(-12deg)">${L.forMisuse(w)}</div>`],
      ['Effects', 'No shadows, glows, bevels or outlines on the letters.', `<div style="filter:drop-shadow(6px 6px 3px ${shadow})">${L.forMisuse(w)}</div>`],
      busy ? ['Busy ground', 'Never on a busy part of a photograph. Use mono light on a quiet, dark part.', null]
        : ['Low contrast', 'Never on a ground it cannot be read on. Use the grounds on the grounds page.', L.forMisuse(w, { fill: ctx.roles.light.surface })],
      ['Boxed', 'No boxes, frames or keylines around it. Clear space is the only border.', `<div class="g2-boxed">${L.forMisuse(w - 40)}</div>`],
    ];
    let galley = E(gx, gy, 'g2-galley', '', { w: GW, h: SH * items.length }), margins = '';
    items.forEach(([t, fix, html], i) => {
      const y = gy + i * SH;
      if (i) galley += hr(gx, y, GW, .75, 'hair');
      if (html === null) {
        galley += E(gx, y, 'g2-ph', ctx.photo(busy.sh.id, { style: `width:${GW}px;height:${SH}px`, pos: `${(busy.sh.focus || [0.5, 0.5])[0] * 100}% ${(busy.sh.focus || [0.5, 0.5])[1] * 100}%` }), { w: GW, h: SH })
          + E(gx + busy.x, y + busy.y, 'g2-lg', L.forMisuse(w), { w, h: mh });
      } else galley += E(gx + (GW - w) / 2, y + (SH - mh) / 2, 'g2-lg g2-mis', html, { w, h: mh });
      galley += cross(gx + 24, y + 16, GW - 48, SH - 32);
      margins += E(G.left, y + SH / 2 - 11, 'c-label c-right', A(t), { w: G.col }) + E(G.x[3], y + SH / 2 - 22, 'c-cap c-ink g2-fix', A(fix), { w: G.col });
    });
    const rules = `<i class="a g2-vr" style="left:${px(G.rule[0])};top:${px(gy)};height:${px(SH * items.length)}"></i><i class="a g2-vr" style="left:${px(G.rule[2])};top:${px(gy)};height:${px(SH * items.length)}"></i>`;
    const foot = col(G.x[1], gy + SH * items.length + 16, GW, jump(ctx, 'logo-versions', 'The seven versions to use instead'));
    return page(ctx, 'logo-misuse', folio(ctx, 'logo-misuse') + hd.html + deck + galley + margins + rules + foot);
  },
};

// lane g2 styles: every rule sits under .pg and the g2- prefix
export function css() {
  return `
.pg .g2-lg svg,.pg .g2-lg .logo-slot{display:block}
.pg .g2-plate{border-top:1px solid var(--ink);box-sizing:border-box}
.pg .g2-idea{hyphens:manual;-webkit-hyphens:manual;text-wrap:pretty}
.pg .g2-deck{text-wrap:pretty}
.pg .g2-list{margin-top:8px;border-top:1px solid var(--ink)}
.pg .g2-row{padding:8px 0;border-bottom:.75px solid var(--hair)}
.pg .g2-row.last,.pg .g2-ix.last{border-bottom:1px solid var(--ink)}
.pg .g2-ix{display:flex;justify-content:space-between;align-items:baseline;gap:8px;padding:7px 0;border-bottom:.75px solid var(--hair)}
.pg .g2-ix .c-label{font-variant-numeric:tabular-nums}
.pg .g2-txt p+p{margin-top:4px}
.pg .g2-p{margin-top:16px}
.pg .g2-zone{background:var(--paper2);box-shadow:inset 0 0 0 .75px var(--ink)}
.pg .g2-zin{background:var(--paper)}
.pg .g2-unit{box-shadow:inset 0 0 0 .75px var(--ink)}
.pg .g2-dv{position:absolute;width:0;border-left:1px solid var(--ink)}
.pg .g2-dv::before,.pg .g2-dv::after{content:'';position:absolute;left:-5px;width:9px;height:0;border-top:1px solid var(--ink)}
.pg .g2-dv::before{top:0}.pg .g2-dv::after{bottom:0}
.pg .g2-dh{position:absolute;height:0;border-top:1px solid var(--ink)}
.pg .g2-dh::before,.pg .g2-dh::after{content:'';position:absolute;top:-5px;height:9px;width:0;border-left:1px solid var(--ink)}
.pg .g2-dh::before{left:0}.pg .g2-dh::after{right:0}
.pg .g2-xl{font:italic 500 17px/22px 'Sofia Sans',sans-serif;color:var(--ink)}
.pg .g2-ph{overflow:hidden}.pg .g2-ph img{display:block;max-width:none}
.pg .g2-galley{background:var(--paper2)}
.pg .g2-vr{position:absolute;width:.75px;background:var(--hair)}
.pg .g2-mis>div{transform-origin:50% 50%}
.pg .g2-boxed{padding:16px 20px;margin:-16px -20px;box-shadow:inset 0 0 0 2px var(--ink)}
.pg .g2-x{position:absolute;pointer-events:none}
`;
}
