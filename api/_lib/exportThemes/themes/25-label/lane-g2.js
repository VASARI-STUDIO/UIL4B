// Theme 25, Label: lane g2, the logo pages (logo-versions, clear-space, min-size, logo-grounds, logo-misuse). The page `logo` is round 1's and is not touched here.
// Each page is one wall: the logo hangs as the object (on a plate, lettered on the wall, or in a case), the label card carries the rule, and both sit where they sit on every page.
// Colours come from the brand's roles and colourways, sizes from the logo's own geometry; nothing names a brand id or writes a hex.
import { roles, solid, key, hung, hungX, wallText, labelCard, A, px, wrapLines, tie, numberWord, HANG, OBJ_H, page as freePage, seeAlso as freeSeeAlso } from './helpers.js';
import { namesOf } from './copy.js';

const MM = 96 / 25.4;                                   // CSS px to the millimetre, so a size in mm is drawn at actual size in the PDF
const HW = HANG.x1 - HANG.x0;                           // 616: the hang's width
const even = (n) => Math.floor(n / 2) * 2;

// The folio is the page's place in the whole book (the full set of guideline pages), so a logo page added here numbers itself.
const folioOf = (ctx, id) => String(ctx.pageNo(id)).padStart(3, '0');
const REF = { logo: 'Logo', 'logo-versions': 'Versions', 'clear-space': 'Clear space', 'min-size': 'Minimum size', 'logo-grounds': 'Grounds', 'logo-misuse': 'Misuse' };
const seeAlso = (ctx, id) => `See also ${REF[id]}, page ${folioOf(ctx, id)}`;

// the same wall as every other page: running head, the hang, the wall text, the fixed label and the folio
function wallPage(ctx, id, { object, wall, label }) {
  const head = `<div class="hd"><span>${A(ctx.brand.name)} brand guidelines</span></div>`;
  return `<section class="pg" data-page="${id}">${head}<div class="hang">${object}</div>${wallText(ctx, id, wall)}${labelCard(ctx, id, label)}<div class="fo num">${folioOf(ctx, id)}</div></section>`;
}

// a logo version scaled to fit a box
const fitIn = (g, maxW, maxH) => { const k = Math.min(maxW / g.w, maxH / g.h); return { w: g.w * k, h: g.h * k }; };
// The logo placed at x, y inside its parent. In the slot edition the frame takes the colourway's name colour, so it reads on its ground, and a frame too short for its words is left unlabelled, so nothing spills from it.
function mark(ctx, id, x, y, w, cw, extra = '') {
  const g = ctx.logo.geos[id], h = w * g.h / g.w, opts = { width: w, colourway: cw, color: ctx.brand.logo.colourways[cw].name };
  if (ctx.edition === 'slot' && h < 30) opts.label = '';
  return `<div class="g2-l" style="left:${px(x)};top:${px(y)};width:${px(w)};height:${px(h)};${extra}">${ctx.logo.html(id, opts)}</div>`;
}

// ---- logo-versions: seven plates hung in one column, each in its own colourway's ground, with a small object label on the wall beside it ----
function logoVersions(ctx) {
  const R = roles(ctx), B = ctx.brand, L = ctx.logo, cws = B.logo.colourways, when = B.logo.when || {};
  const colourways = ['colour', 'mono-dark', 'mono-light', 'reversed'].filter((v) => cws[v]);
  const lockups = ['horizontal', 'stacked', 'symbol'].filter((v) => L.geos[v]);
  const panelCw = R.colourwayOn(R.panel);
  const items = [...colourways.map((v) => ({ v, cw: v, fill: cws[v].ground })), ...lockups.map((v) => ({ v, cw: panelCw, fill: R.panel }))];
  const plateW = 240, minH = 72, gap = 12, capX = plateW + 24, capW = HW - capX;
  // each row is as tall as its plate or its caption, whichever is taller; the caption is the version's name and the brand's own line on when to use it
  const rows = items.map((it) => {
    const w = when[it.v] ? tie(when[it.v], { names: namesOf(ctx) }) : '';
    const n = w ? wrapLines(ctx, 'body', ctx.weights.regular, 13, w, capW).length : 0;
    return { ...it, w, h: Math.max(minH, even(18 + n * 18 + 1)) };
  });
  const H = rows.reduce((s, r) => s + r.h, 0) + gap * (rows.length - 1);
  if (H > OBJ_H) throw new Error(`logo-versions: the column is ${H} px tall and the hang holds ${OBJ_H}`);
  let y = hung(H);
  const x0 = hungX(HW);
  const object = rows.map((r) => {
    const g = L.geos[r.v], f = fitIn(g, plateW - 48, r.h - 24);
    const plate = solid(R, x0, y, plateW, r.h, r.fill, mark(ctx, r.v, (plateW - f.w) / 2, (r.h - f.h) / 2, f.w, r.cw));
    const cap = `<div class="g2-cap" style="left:${px(x0 + capX)};top:${px(y - 1)};width:${capW}px"><div class="g2-cn">${A(L.labels[r.v])}</div>${r.w ? `<div class="g2-cw">${A(r.w)}</div>` : ''}</div>`;
    y += r.h + gap;
    return plate + cap;
  }).join('');
  const nc = colourways.length, nl = lockups.length;
  return wallPage(ctx, 'logo-versions', {
    object,
    wall: { title: 'Versions', line: '' },
    label: {
      title: `${numberWord(items.length)} versions`,
      detail: `${numberWord(nc)} colourways of the logo and ${numberWord(nl).toLowerCase()} lock-ups, each on the ground it is made for.`,
      paragraph: (B.logo.showcase || {}).symbolNote || '',
      credit: seeAlso(ctx, 'clear-space'),
    },
  });
}

// ---- clear-space: the plate is the clear space. The logo and the symbol each hang on a plate cut one unit wider than the mark on every side ----
function clearSpace(ctx) {
  const R = roles(ctx), L = ctx.logo, G = L.geo, gp = L.geos.colour, gs = L.geos.symbol, cw = R.colourwayOn(R.panel);
  const gap = 32;
  // one scale for both marks, the largest at which the pair fits the hang's width and the primary's plate stays under 440 px tall
  const k = Math.min((HW - gap) / (gp.w + gs.w + 4 * G.unit), 440 / (gp.h + 2 * G.unit), 520 / gp.w);
  const u = G.unit * k;
  const P = { w: even(gp.w * k + 2 * u), h: even(gp.h * k + 2 * u) }, S = { w: even(gs.w * k + 2 * u), h: even(gs.h * k + 2 * u) };
  const gx = hungX(P.w + gap + S.w), sx = gx + P.w + gap;
  // the unit, drawn as a square in each of the four gaps between the mark and the plate's edge, at the middle of the side
  const sq = (W, H, mw, mh) => {
    const ox = (W - mw) / 2, oy = (H - mh) / 2, s = u;
    return [[(W - s) / 2, oy - s], [(W - s) / 2, oy + mh], [ox - s, (H - s) / 2], [ox + mw, (H - s) / 2]]
      .map(([x, y]) => `<div class="g2-sq" style="left:${px(x)};top:${px(y)};width:${px(s)};height:${px(s)}"></div>`).join('');
  };
  const pw = gp.w * k, ph = gp.h * k, sw = gs.w * k, sh = gs.h * k;
  const primary = solid(R, gx, hung(P.h), P.w, P.h, R.panel, mark(ctx, 'colour', (P.w - pw) / 2, (P.h - ph) / 2, pw, cw) + sq(P.w, P.h, pw, ph));
  const symbol = solid(R, sx, hung(S.h), S.w, S.h, R.panel, mark(ctx, 'symbol', (S.w - sw) / 2, (S.h - sh) / 2, sw, cw) + sq(S.w, S.h, sw, sh));
  const keys = key(1, gx, hung(P.h) + P.h) + key(2, sx, hung(S.h) + S.h);
  // clear-space is one of the Free twelve, so it takes the book's own page wrapper and folio (005)
  return freePage(ctx, 'clear-space', {
    object: primary + symbol + keys,
    wall: { title: 'Clear space', line: '' },
    label: {
      title: 'One unit on every side',
      detail: `The unit is ${L.clearShare}% of its height.`,
      paragraph: 'Each plate is cut to it. Nothing else sits inside: no text, no edge and no other mark.',
      keys: [{ n: 1, text: L.labels.colour }, { n: 2, text: L.labels.symbol }], cols: 2,
      credit: freeSeeAlso('logo'),
    },
  });
}

// ---- min-size: the two smallest uses, drawn at actual size: a business card with the logo at its print minimum, and a phone header with it at its screen minimum ----
function minSize(ctx) {
  const R = roles(ctx), B = ctx.brand, L = ctx.logo, M = L.minSize, ap = B.applications, cw = R.colourwayOn(R.panel);
  const card = { w: even(85 * MM + 1), h: even(55 * MM + 1) };          // 85 x 55 mm at actual size
  const bar = { w: 390, h: 56 };                                         // a phone's width, in CSS px
  const gap = 48, H = card.h + gap + bar.h, y0 = hung(H), cx = hungX(card.w), bx = hungX(bar.w), by = y0 + card.h + gap;
  const lwPrint = M.printMm * MM, lwScreen = M.screenPx, g = L.geos.colour;
  const inset = 20;
  const cardInner = mark(ctx, 'colour', inset, inset, lwPrint, cw)
    + (ap.card ? `<div class="g2-cd" style="left:${inset}px;bottom:${inset}px"><div class="cd-n">${A(ap.card.person)}</div><div class="cd-r">${A(ap.card.role)}</div></div>` : '');
  const barInner = mark(ctx, 'colour', 16, (bar.h - lwScreen * g.h / g.w) / 2, lwScreen, cw);
  const object = solid(R, cx, y0, card.w, card.h, R.panel, cardInner) + solid(R, bx, by, bar.w, bar.h, R.panel, barInner)
    + key(1, cx, y0 + card.h) + key(2, bx, by + bar.h);
  return wallPage(ctx, 'min-size', {
    object,
    wall: { title: 'Minimum size', line: '' },
    label: {
      title: 'The smallest it goes',
      detail: 'Both are drawn at actual size.',
      keys: [{ n: 1, text: `Print: ${M.printMm} mm wide, on a business card.` }, { n: 2, text: `Screen: ${M.screenPx} px wide, in a phone header.` }], cols: 1,
      credit: seeAlso(ctx, 'clear-space'),
    },
  });
}

// ---- logo-grounds: every brand colour that has a colourway of its own. Where that colour is the wall, the logo is lettered straight onto the wall; the others hang as plates beneath ----
function logoGrounds(ctx) {
  const R = roles(ctx), B = ctx.brand, L = ctx.logo, cws = B.logo.colourways, g = L.geos.colour;
  const cwFor = (hex) => Object.keys(cws).find((k) => cws[k].ground.toLowerCase() === hex.toLowerCase());
  const grounds = B.colours.filter((c) => cwFor(c.hex)).sort((a, b) => b.share - a.share).map((c) => ({ c, cw: cwFor(c.hex) }));
  // the hero: the wall itself when the wall is one of the grounds, else the ground with the largest share
  const wi = grounds.findIndex((x) => x.c.hex.toLowerCase() === R.wall.toLowerCase());
  const vinyl = wi >= 0;
  const hero = grounds.splice(vinyl ? wi : 0, 1)[0], rest = grounds;
  const hw = G2_HERO(L.geo.aspect), hh = hw * g.h / g.w;
  const heroBox = vinyl ? { w: even(hw + 1), h: even(hh + 1) } : { w: HW, h: even(hh + 96) };
  const n = rest.length, rowGap = 24, pw = n ? even((HW - rowGap * (n - 1)) / n) : 0, ph = 128, gap = 48;
  const H = heroBox.h + (n ? gap + ph : 0), y0 = hung(H), hx = hungX(heroBox.w);
  const heroMark = (x, y) => mark(ctx, 'colour', x, y, hw, hero.cw);
  let object = vinyl
    ? `<div class="g2-vinyl" style="position:absolute;left:${px(hx)};top:${px(y0)};width:${heroBox.w}px;height:${heroBox.h}px">${heroMark((heroBox.w - hw) / 2, (heroBox.h - hh) / 2)}</div>`
    : solid(R, hx, y0, heroBox.w, heroBox.h, hero.c.hex, heroMark((heroBox.w - hw) / 2, (heroBox.h - hh) / 2));
  object += key(1, hx, y0 + heroBox.h);
  const rx0 = hungX(n * pw + (n - 1) * rowGap), ry = y0 + heroBox.h + gap;
  rest.forEach((r, i) => {
    const x = rx0 + i * (pw + rowGap), f = fitIn(g, pw - 48, ph - 56);
    object += solid(R, x, ry, pw, ph, r.c.hex, mark(ctx, 'colour', (pw - f.w) / 2, (ph - f.h) / 2, f.w, r.cw)) + key(i + 2, x, ry + ph);
  });
  const all = [hero, ...rest], when = B.logo.when || {};
  return wallPage(ctx, 'logo-grounds', {
    object,
    wall: { title: 'Grounds', line: vinyl ? 'The first is lettered straight onto the wall.' : '' },
    label: {
      title: `The logo on ${numberWord(all.length).toLowerCase()} grounds`,
      detail: 'One colourway for each ground.',
      paragraph: when['mono-light'] || '',
      keys: all.map((x, i) => ({ n: i + 1, text: x.c.name })), cols: 2,
      credit: seeAlso(ctx, 'logo-misuse'),
    },
  });
}
// the hero mark's width: a wide wordmark gets more of the hang so it reads at a similar height
const G2_HERO = (aspect) => (aspect > 4 ? 520 : 400);

// ---- logo-misuse: one case holding six wrong logos, each crossed through in the action colour, keyed and named on the label ----
function logoMisuse(ctx) {
  const R = roles(ctx), B = ctx.brand, L = ctx.logo, g = L.geos.colour, cw = R.colourwayOn(R.panel), cwd = B.logo.colourways[cw];
  const pad = 32, colGap = 24, rowGap = 56, cols = 3;
  const cw_ = even((HW - 2 * pad - colGap * (cols - 1)) / cols), ch = 136;
  const H = pad + ch + rowGap + ch + 48, y0 = hung(H), x0 = hungX(HW);
  // the base size every wrong logo starts from, so the six read as one mark mistreated six ways
  const base = fitIn(g, cw_ - 56, ch - 64);
  const recolour = [R.action, R.quiet].find((c) => c.toLowerCase() !== (cwd.name || '').toLowerCase()) || R.action;
  const inCell = (w, h) => ({ x: (cw_ - w) / 2, y: (ch - h) / 2 });
  // a mark drawn at any width and height (stretched): the SVG is told not to keep its proportion; a slot frame is simply resized
  const stretched = (w, h) => {
    const c = inCell(w, h);
    if (ctx.edition === 'slot') return `<div class="g2-l" style="left:${px(c.x)};top:${px(c.y)};width:${px(w)};height:${px(h)}">${L.forMisuse(w).replace(/width:[\d.]+px;height:[\d.]+px/, `width:${px(w)};height:${px(h)}`)}</div>`;
    const s = L.svg('colour', { colourway: cw, width: w }).replace(/ width="[\d.]+" height="[\d.]+"/, ` width="${w.toFixed(2)}" height="${h.toFixed(2)}" preserveAspectRatio="none"`);
    return `<div class="g2-l" style="left:${px(c.x)};top:${px(c.y)};width:${px(w)};height:${px(h)}">${s}</div>`;
  };
  // a mark in one flat colour; in the slot edition the frame is drawn in that colour with no words, since the wrong colour is the point and words in it would not read
  const flat = (w, fill, dx = 0, dy = 0) => {
    const h = w * g.h / g.w, c = inCell(w, h);
    const m = ctx.edition === 'slot' ? L.html('colour', { width: w, color: fill, label: '' }) : L.forMisuse(w, { fill });
    return `<div class="g2-l" style="left:${px(c.x + dx)};top:${px(c.y + dy)};width:${px(w)};height:${px(h)}">${m}</div>`;
  };
  const plain = (w, extra = '') => { const h = w * g.h / g.w, c = inCell(w, h); return mark(ctx, 'colour', c.x, c.y, w, cw, extra); };
  // the busy ground: the brand's own colours in narrow upright bands across the whole cell
  const bands = () => { const cs = B.colours.map((c) => c.hex), bw = 12; return Array.from({ length: Math.ceil(cw_ / bw) }, (_, i) => `<div style="position:absolute;left:${i * bw}px;top:0;width:${Math.min(bw, cw_ - i * bw)}px;height:${ch}px;background:${cs[i % cs.length]}"></div>`).join(''); };
  const boxPad = 12, bwid = base.w - 2 * boxPad - 4;
  const cases = [
    ['Stretched', stretched(Math.min(base.w * 1.4, cw_ - 16), base.h * 0.7)],
    ['Recoloured', flat(base.w, recolour)],
    ['Rotated', plain(base.w, 'transform:rotate(-14deg);transform-origin:50% 50%')],
    ['Shadowed', flat(base.w, R.quiet, 5, 5) + plain(base.w)],
    ['Busy ground', bands() + plain(base.w)],
    ['Boxed', (() => { const bh = bwid * g.h / g.w, c = inCell(bwid + 2 * boxPad + 4, bh + 2 * boxPad + 4); return `<div class="g2-box" style="left:${px(c.x)};top:${px(c.y)};width:${px(bwid + 2 * boxPad)};height:${px(bh + 2 * boxPad)};border:2px solid ${cwd.name}">${mark(ctx, 'colour', boxPad, boxPad, bwid, cw)}</div>`; })()],
  ];
  // the cross: two strokes corner to corner of the cell, in the action colour
  const cross = `<svg class="g2-x" width="${cw_}" height="${ch}" viewBox="0 0 ${cw_} ${ch}" aria-hidden="true"><path d="M0 0L${cw_} ${ch}M${cw_} 0L0 ${ch}" stroke="${R.action}" stroke-width="2" fill="none"/></svg>`;
  const cells = cases.map(([, inner], i) => {
    const cx = pad + (i % cols) * (cw_ + colGap), cy = pad + Math.floor(i / cols) * (ch + rowGap);
    return `<div class="g2-cell" style="left:${cx}px;top:${cy}px;width:${cw_}px;height:${ch}px">${inner}${cross}</div>${key(i + 1, cx, cy + ch)}`;
  }).join('');
  return wallPage(ctx, 'logo-misuse', {
    object: solid(R, x0, y0, HW, H, R.panel, cells),
    wall: { title: 'Misuse', line: '' },
    label: {
      title: `${numberWord(cases.length)} wrong logos`,
      detail: 'Each is crossed through.',
      paragraph: 'Use the logo files as they are supplied, at their own shape and colour.',
      keys: cases.map(([nm], i) => ({ n: i + 1, text: nm })), cols: 2,
      credit: seeAlso(ctx, 'logo-versions'),
    },
  });
}

// Label is a Free theme and ships only the Free twelve, so clear-space is the one logo page this lane exports. The other four logo pages above were drafted before that
// scope was set (11 Nov); they are kept, unpolished and unexported, for a Pro edition or a later round. Export them here to build them (they use ctx.pageNo folios).
export const guidelines = { 'clear-space': clearSpace };
export const draftLogoPages = { 'logo-versions': logoVersions, 'min-size': minSize, 'logo-grounds': logoGrounds, 'logo-misuse': logoMisuse };

// scoped to the page and prefixed g2-, so nothing here can reach another lane's markup
export function css(ctx) {
  const W = ctx.weights;
  return `.pg .g2-l{position:absolute}
.pg .g2-l>svg{display:block}
.pg .g2-cap{position:absolute}
.pg .g2-cn{font-size:13px;line-height:18px;font-weight:${W.medium};color:var(--ink)}
.pg .g2-cw{font-size:13px;line-height:18px;font-weight:${W.regular};color:var(--quiet);text-wrap:pretty}
.pg .g2-sq{position:absolute;border:1px solid var(--edge);box-sizing:border-box}
.pg .g2-cd{position:absolute}
.pg .g2-cell{position:absolute;overflow:hidden;isolation:isolate}
.pg .g2-x{position:absolute;left:0;top:0;z-index:1}
.pg .g2-box{position:absolute;box-sizing:content-box}
`;
}
