// Theme 30, Fluted, lane g3: the colour and type pages (proportion, contrast, colour-values, hierarchy, type-in-use, type-rules; palette and typefaces are round 1 pages).
// Lane g1's rule holds here: the band at y 768 to 1152 shows the page's own data, never ornament, as windows (a column with a round head) drawn behind the reeds:
// proportion, the shares as areas of one half disc; contrast, each pair as a window as tall as its ratio; colour values, each colour's ramp inside its window;
// hierarchy, one window per step of the scale, as wide as the step's size; type in use, the piece's three columns carried down into the glass; type rules, a solid
// and an outlined window for each rule. Brand strings are printed whole through esc() and never counted or split: blocks of text whose height is unknown are laid out
// by the browser (a grid anchored at its foot), not by counting lines. Every ratio comes from ctx.pairs or ctx.unusedPairs. Colours come from ctx roles and brand data only.
import { A, put, shell, rect, tokens, fitSize, TXT } from './helpers.js';
import { warpPath } from './glass.js';

const P = 12;            // the reed pitch
const LIP = 720;         // the top of the widest head on a page: 48 px of it flat above the band's top edge
const BB = 1152, KEY = 1184, PH = 1350;
const TRACK = -0.02;
const snap = (x) => Math.round(x / P) * P;   // a reed boundary, where the bend is zero
const lo = (h) => h.toLowerCase();
const tok = (ctx, id) => ctx.brand.type.scale.find((t) => t.token === id);
const linePx = (t) => Math.round(t.size * t.line);
// the text colour of a pair, named once: a tone whose own name already carries its ground ("Quiet on Blue hour") is listed by its job ("Quiet text"), so the ground is said only in its column
const fgName = (ctx, p) => { const t = ctx.tones.find((x) => x.id === p.fg), g = nameOf(ctx, p.bg); return t && t.role && String(t.name).toLowerCase().includes(String(g).toLowerCase()) ? ctx.cap(t.role) : nameOf(ctx, p.fg); };
const nameOf = (ctx, id) => (ctx.colours.find((c) => c.id === id) || ctx.tones.find((t) => t.id === id) || { name: id }).name;

// A polygon under a round-headed outline (centre cx, head centre cy, radius r, straight sides below cy) between x0 and x1, down to the band's foot.
// The arc is sampled by angle, every half degree, so the head stays round where it meets the sides.
function underArc(x0, x1, cx, cy, r) {
  const ang = (x) => Math.acos(Math.max(-1, Math.min(1, (x - cx) / r)));
  const a0 = ang(x0), a1 = ang(x1), pts = [[x0, BB], [x0, cy - r * Math.sin(a0)]];
  for (let a = a0 - Math.PI / 360; a > a1; a -= Math.PI / 360) pts.push([cx + r * Math.cos(a), cy - r * Math.sin(a)]);
  pts.push([x1, cy - r * Math.sin(a1)], [x1, BB]);
  return `M${pts.map(([px, py]) => `${px.toFixed(2)} ${py.toFixed(2)}`).join('L')}Z`;
}
// One painted region: flat (seen outside the band), the same bent by the reeds (drawn over them), and a rect of its body for the glass to sample.
function region(d, paint, body = '') {
  const wd = warpPath(d, 0, 0, {});
  return { flat: `<path d="${d}" ${paint}/>`, over: `<path d="${wd || d}" ${paint}/>`, body };
}
const fillP = (hex) => `fill="${hex}"`;
const lineP = (hex) => `fill="none" stroke="${hex}" stroke-width="2"`;

// The window: straight sides from the band's foot up to a round head of radius w / 2 whose top is `top` (lane g1's mark). A hollow window's 2 px line sits inside its box.
function windowMark(x, w, top, { fill = null, stroke = null } = {}) {
  const ins = stroke ? 1 : 0, r = w / 2 - ins, cx = x + w / 2, cy = top + w / 2;
  const d = underArc(x + ins, x + w - ins, cx, cy, r);
  // a hollow window is a line, not closed: its two ends stand on the band's foot, where the glass ends (lane g1's mark)
  const open = stroke ? d.replace(/Z$/, '') : d;
  // the body for the glass covers only the whole reeds inside the window: a reed cut by the window's edge would mirror the body out past the outline
  const bx0 = Math.ceil(x / P) * P, bx1 = Math.floor((x + w) / P) * P;
  return region(open, fill ? fillP(fill) : lineP(stroke), fill && bx1 > bx0 ? rect(bx0, Math.round(cy), bx1 - bx0, BB - Math.round(cy), fill) : '');
}
const page = (ctx, id, T, ms, html, extraShape = '') => shell(ctx, id, T, {
  flat: ms.map((m) => m.flat).join(''), shape: ms.map((m) => m.body).join('') + extraShape, fields: false, band: { over: ms.map((m) => m.over).join('') }, html,
});

// the mark colours: the strong colour, then the brand's other colours by share, each kept only if it stands 0.12 OKLCH L off the ground (lane g1's rule)
function marks(ctx, T) {
  const L = (h) => ctx.C.toOklch(h).L, g = L(T.ground);
  const cs = ctx.colours.slice().sort((a, b) => b.share - a.share).map((c) => c.hex).filter((h) => lo(h) !== lo(T.ground) && lo(h) !== lo(T.strong));
  return [T.strong, ...cs].filter((h) => Math.abs(L(h) - g) >= 0.12);
}
const colourName = (ctx, hex) => (ctx.colours.find((c) => lo(c.hex) === lo(hex)) || { name: hex.toUpperCase() }).name;

const headline = (ctx, l1, l2, { y = 96, w = 777 } = {}) => {
  const s = Math.min(64, fitSize(ctx, 'display', l2 && l2.length > l1.length ? l2 : l1, 64, w, TRACK, ctx.weights.heading, 40));
  return put(ctx, { x: 64, y, w, cls: 'disp', html: `<div style="font-size:${s}px;line-height:64px;color:var(--ink)">${A(l1)}</div>${l2 ? `<div style="font-size:${s}px;line-height:64px;color:var(--quiet)">${A(l2)}</div>` : ''}` });
};
const body = (ctx, x, y, w, html, style = '') => put(ctx, { x, y, w, cls: 'body', style: `white-space:normal;${style}`, html });
// a block hung from its foot: its last line ends at `foot`, whatever its height (the browser sets the lines)
const hang = (x, foot, w, html, cls = '', style = '') => `<div class="a ${cls}" style="left:${x}px;bottom:${PH - foot}px;width:${w}px;white-space:normal;${style}">${html}</div>`;
const keyAt = (ctx, x, w, html, y = KEY, cls = 'k') => put(ctx, { x, y, w, cls, html });

// ---- proportion: one half disc in the band, cut into upright strips whose areas are the colours' shares of a page; each share set large above its strip ----
function proportion(ctx) {
  const T = tokens(ctx), cs = ctx.colours.slice().sort((a, b) => b.share - a.share), total = cs.reduce((a, c) => a + c.share, 0);
  // the disc stands on the band's foot, 80 reeds wide (x 60 to 1020), its top 96 px above the band
  const R = 480, CX = 540, X0 = CX - R, X1 = CX + R;
  // the share of the half disc's area left of x: (u sqrt(1 - u^2) + asin u + pi / 2) / pi, u = (x - CX) / R; each edge is found by bisection,
  // then moved to the nearest reed centre so the reed that holds it mirrors it (the palette page's rule)
  const areaLeft = (x) => { const u = (x - CX) / R; return (u * Math.sqrt(1 - u * u) + Math.asin(u) + Math.PI / 2) / Math.PI; };
  const edgeAt = (f) => { let a = X0, b = X1; for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (areaLeft(m) < f) a = m; else b = m; } return Math.round((a - P / 2) / P) * P + P / 2; };
  let cum = 0;
  const edges = [X0, ...cs.slice(0, -1).map((c) => { cum += c.share / total; return edgeAt(cum); }), X1];
  const ms = [];
  // each strip's body for the glass: one rect a reed, from the arc's lowest point over that reed down to the foot, so it stays inside the disc and no reed
  // mirrors a curved edge into teeth (the bent strip drawn over the reeds carries the true arc)
  const arcY = (x) => BB - Math.sqrt(Math.max(0, R * R - (x - CX) * (x - CX)));
  const stairs = (x0, x1, hex) => {
    let out = '';
    for (let a = Math.floor(x0 / P) * P; a < x1; a += P) {
      const l = Math.max(a, x0), r = Math.min(a + P, x1), y = Math.ceil(Math.max(arcY(l), arcY(r)));
      if (r > l && y < BB) out += rect(l, y, r - l, BB - y, hex);
    }
    return out;
  };
  cs.forEach((c, i) => { if (lo(c.hex) !== lo(T.ground)) ms.push(region(underArc(edges[i], edges[i + 1], CX, BB, R), fillP(c.hex), stairs(edges[i], edges[i + 1], c.hex))); });
  // the disc's outline in ink, last, so the ground's own share (painted as the ground) still reads as area
  const ring = underArc(X0 + 1, X1 - 1, CX, BB, R - 1).replace(/Z$/, '');
  ms.push(region(ring, lineP(T.ink)));
  // the shares, large, each over its own strip and no wider than it; one size for all of them, the largest that fits the narrowest strip
  const pc = (c) => `${Math.round(c.share * 100)}%`;
  const NS = Math.min(...cs.map((c, i) => fitSize(ctx, 'display', pc(c), 96, (edges[i + 1] - edges[i]) - 16, TRACK, ctx.weights.heading, 32)));
  const nums = cs.map((c, i) => put(ctx, { x: edges[i] + 4, y: 640 - NS, w: edges[i + 1] - edges[i] - 8, cls: 'disp num', html: `<div style="font-size:${NS}px;line-height:${NS}px;color:var(--ink)">${pc(c)}</div>` })).join('');
  const big = cs[0], most = big.share / total >= 0.5;
  const head = headline(ctx, most ? 'Most of every page' : 'The largest share', `is ${big.name}`);
  const lead = body(ctx, 64, 256, 468, 'How much of a page each colour takes. In the glass, one half disc cut into strips, each strip’s area its colour’s share.');
  const keys = cs.map((c, i) => {
    const w = (i < cs.length - 1 ? edges[i + 1] : 1016) - edges[i] - 8;
    return keyAt(ctx, edges[i] + 4, w, A(c.name), KEY, 'kn') + keyAt(ctx, edges[i] + 4, w, A(ctx.cap(c.role)), KEY + 22);
  }).join('');
  return page(ctx, 'proportion', T, ms, head + lead + nums + keys);
}

// ---- contrast: every pair the brand uses, each row set in its own two colours; in the band each pair is a window as tall as its ratio ----
function contrast(ctx) {
  const T = tokens(ctx), B = ctx.brand, W = ctx.weights;
  const used = ctx.pairs.slice().sort((a, b) => b.ratio - a.ratio), unused = (ctx.unusedPairs || []).slice().sort((a, b) => b.ratio - a.ratio);
  const head = headline(ctx, 'Contrast', '');
  const lead = body(ctx, 548, 104, 468, `Every text pair ${A(B.name)} uses, set in its own colours. Text needs 4.5 : 1; type 24 px and over needs 3 : 1. In the glass, each pair is a window as tall as its ratio, its outer arch the ground and its inner arch the text, with a line at 4.5 and at 3.`);
  // the rows: a plate of the pair's ground with every word in the pair's text colour, so the checker measures the pair itself. A pair passed only for large type is set at 24 px.
  const cols = 'grid-template-columns:220px 220px 1fr 112px';
  const hdr = put(ctx, { x: 64, y: 232, w: 952, cls: 'k', style: `display:grid;${cols};padding:0 16px;box-sizing:border-box`, html: '<span>Text</span><span>On</span><span>Use</span><span style="text-align:right">Ratio</span>' });
  const rows = used.map((p, i) => {
    const big = p.large, fs = big ? 24 : 16, lh = big ? 32 : 24, fw = W.regular;
    ctx.pair(p.fgHex, p.bgHex, { size: fs, weight: fw, what: `(contrast row ${i + 1})` });
    const onG = lo(p.bgHex) === lo(T.ground), prevG = i > 0 && lo(used[i - 1].bgHex) === lo(T.ground);
    return `<div${ctx.placeholders ? ' class="ph-tight ph-keep"' : ''} style="display:grid;${cols};align-items:baseline;padding:${big ? 12 : 8}px 16px;background:${p.bgHex};color:${p.fgHex};font:${fw} ${fs}px/${lh}px var(--body);${onG && prevG ? 'border-top:1px solid var(--hair);' : ''}">`
      + `<span>${A(fgName(ctx, p))}</span><span>${A(nameOf(ctx, p.bg))}</span><span style="padding-right:16px">${A(p.use)}</span><span class="num" style="text-align:right;font:400 ${big ? 24 : TXT}px/${lh}px var(--dm)">${A(p.ratioText)} : 1</span></div>`;
  }).join('');
  const table = `<div class="a" style="left:64px;top:260px;width:952px;white-space:normal">${rows}</div>`;
  // the windows: height = ratio x 432 / 21, so 21 : 1 would reach the top of the widest head on the other pages. The pairs in use first, in the rows' order, then a reed's gap
  // and the pairs not used, narrower. Each window is the pair: its outer arch the ground, an inner arch the text colour; an outer arch the page's own ground is drawn as an outline.
  const k = (BB - LIP) / 21, nu = used.length, nn = unused.length;
  let wu = 4, wn = 2; while (nu * (wu + 1) + nn * (wn + 1) + 1 > 80 && wu > 2) { wu--; if (wn > 1 && nu * (wu + 1) + nn * (wn + 1) + 1 > 80) wn--; }
  const ms = [];
  const win = (p, x, wr) => {
    const w = wr * P, top = BB - p.ratio * k, iw = Math.max(P, Math.round(w / 2 / P) * P), ix = x + (w - iw) / 2, itop = top + (w - iw) / 2;
    ms.push(windowMark(x, w, top, lo(p.bgHex) === lo(T.ground) ? { stroke: T.ink } : { fill: p.bgHex }));
    ms.push(windowMark(ix, iw, itop, lo(p.fgHex) === lo(T.ground) && lo(p.bgHex) === lo(T.ground) ? { stroke: T.ink } : { fill: p.fgHex }));
  };
  let x = 60;
  used.forEach((p) => { win(p, x, wu); x += (wu + 1) * P; });
  const xn = x + P;
  x = xn; unused.forEach((p) => { win(p, x, wn); x += (wn + 1) * P; });
  const line = (r) => rect(0, Math.round(BB - r * k), 1080, 1, T.quiet);
  // the pairs not used, at the right under their windows: one line a pair (text colour, its ground, ratio), three lines a table, so the list stays clear of the folio
  // however many pairs there are. The block is anchored at its right edge (x 1016) and the browser sets every width, so no brand string is measured.
  const groups = [];
  for (let i = 0; i < nn; i += 3) groups.push(unused.slice(i, i + 3));
  const keyN = nn ? `<div><div class="kn">Not used for text</div><div style="display:flex;column-gap:40px;margin-top:2px">${groups.map((g) => `<div style="display:grid;grid-template-columns:auto auto auto;column-gap:12px">${g.map((p) => `<span class="k">${A(fgName(ctx, p))}</span><span class="k">on ${A(nameOf(ctx, p.bg))}</span><span class="v num" style="text-align:right">${A(p.ratioText)}</span>`).join('')}</div>`).join('')}</div></div>` : '';
  // both keys in one row the width of the type area: the browser sets them apart, and wraps the second under the first when they cannot share the line
  const keys = `<div class="a" style="left:64px;top:${KEY}px;width:952px;display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-start;gap:8px 40px;white-space:normal"><div class="kn">In use, ${nu} pairs</div>${keyN}</div>`;
  return page(ctx, 'contrast', T, ms, head + lead + hdr + table + keys, line(4.5) + line(3));
}

// ---- colour values: each colour's name and values above, its ramp inside its window in the band, light to dark ----
function colourValues(ctx) {
  const T = tokens(ctx), cs = ctx.colours.slice().sort((a, b) => b.share - a.share), n = cs.length;
  const head = headline(ctx, 'Colour values', '');
  const lead = body(ctx, 64, 176, 468, 'The values are for screens. Print shifts colour, so ask your printer for a proof before a run. In the glass, each colour’s ramp, light to dark.');
  // the tones made from the palette, at the right: name, what it is for, hex
  const tones = `<div class="a" style="left:548px;top:176px;width:468px;white-space:normal">${ctx.tones.map((t, i) => `<div style="display:grid;grid-template-columns:1fr auto;column-gap:16px;padding:6px 0;${i ? 'border-top:1px solid var(--hair)' : ''}">`
    + `<span class="kn" style="white-space:normal">${A(t.name)} <span class="k">${A(t.role)}</span></span><span class="v num">${A(t.hex.toUpperCase())}</span></div>`).join('')}</div>`;
  // the windows: as many reeds as share the 80 between the margins, two reeds apart at the least; each on a reed boundary
  const wr = Math.floor((80 - 2 * (n - 1)) / n), w = wr * P, gap = n > 1 ? (960 - n * w) / (n - 1) : 0;
  const xs = cs.map((_, i) => snap(60 + i * (w + gap)));
  const top = LIP, cx = (x) => x + w / 2, cy = top + w / 2;
  const ms = [];
  let cols = '', keys = '';
  cs.forEach((c, i) => {
    const x = xs[i], steps = Object.keys(c.ramp), sw = w / steps.length, tint = c.rampBase !== 50;
    if (tint) steps.forEach((s, j) => ms.push(region(underArc(x + j * sw, x + (j + 1) * sw, cx(x), cy, w / 2), fillP(c.ramp[s]), rect(Math.round(x + j * sw), Math.round(cy), Math.round(sw), BB - Math.round(cy), c.ramp[s]))));
    else ms.push(windowMark(x, w, top, lo(c.hex) === lo(T.ground) ? { stroke: T.ink } : { fill: c.hex }));
    cols += hang(x + 4, LIP - 32, w - 8, `<div class="disp" style="font-size:28px;line-height:32px;color:var(--ink)">${A(c.name)}</div>`
      + `<div class="v num" style="margin-top:8px;white-space:normal;color:var(--soft)">${A(c.hex.toUpperCase())}<br>${A(c.rgb)}<br>${A(c.oklch)}${ctx.C.cmykOf(c) ? `<br>${A(ctx.C.cmykOf(c))}` : ''}</div>`);
    keys += keyAt(ctx, x + 4, w - 8, tint ? `Steps ${A(steps[0])} to ${A(steps[steps.length - 1])}` : 'No tints', KEY, 'kn')
      + (tint ? keyAt(ctx, x + 4, w - 8, `The colour is <span class="v num">${A(String(c.rampBase))}</span>`, KEY + 22) : '');
  });
  return page(ctx, 'colour-values', T, ms, head + lead + tones + cols + keys);
}

// ---- hierarchy: every step of the scale set at its own size, its spec beside it; in the band one window per step, 3 px of glass for each px of type ----
function hierarchy(ctx) {
  const T = tokens(ctx), B = ctx.brand, S = B.type.scale, sc = B.ui.screen.content, M = marks(ctx, T);
  const sample = { display: sc.time, headline: B.type.sample.headline, title: (B.voice.principles[0] || {}).title || B.lines.primary, body: B.type.sample.paragraph, label: sc.share, caption: B.type.sample.caption };
  const face = (t) => (t.face === 'display' ? `font-family:var(--display);font-stretch:${B.fonts.display.stretch || 100}%;letter-spacing:-0.02em` : 'font-family:var(--body)');
  // the display step is capped to the sample column, so a longer sample still sits on one line
  const rowsH = S.map((t, i) => {
    const s = sample[t.token] || t.use, size = t.token === 'display' ? Math.min(t.size, fitSize(ctx, 'display', s, t.size, 589 / 1.03, TRACK, t.weight, 40)) : t.size;
    const lh = Math.round(size * t.line);
    return `<div style="display:grid;grid-template-columns:605px 1fr;align-items:start;padding:${i ? 14 : 0}px 0 14px;${i ? 'border-top:1px solid var(--hair)' : ''}">`
      + `<div style="${face(t)};font-weight:${t.weight};font-size:${size}px;line-height:${lh}px;color:var(--ink);white-space:normal;max-width:589px">${A(s)}</div>`
      + `<div><div class="kn">${A(ctx.cap(t.token))} <span class="v num">${t.size} / ${linePx(t)}, ${t.weight}</span></div><div class="k" style="white-space:normal">${A(t.use)}</div></div></div>`;
  }).join('');
  const rows = `<div class="a" style="left:64px;top:96px;width:952px;white-space:normal">${rowsH}</div>`;
  // the windows: 3 px of glass per px of type (2 if the scale is too wide for that), left to right in the scale's order, two reeds apart; the heads share one centre,
  // so the widest rises 48 px clear of the band. Display steps in the strong colour, text steps in the next mark colour (an outline if there is none).
  const sum = S.reduce((a, t) => a + t.size, 0), k = [4, 3, 2, 1].find((q) => sum * q + (S.length - 1) * 2 * P <= 960) || 1;
  const ws = S.map((t) => t.size * k), ys = LIP + Math.max(...ws) / 2;
  let x = 60, keys = '';
  const textC = M[1] || null;
  const ms = S.map((t, i) => {
    const m = windowMark(x, ws[i], ys - ws[i] / 2, t.face === 'display' ? { fill: T.strong } : textC ? { fill: textC } : { stroke: T.ink });
    keys += keyAt(ctx, x, ws[i] + 2 * P - 4, `<span class="num">${t.size}</span>`, KEY, 'v');
    x = snap(x + ws[i] + 2 * P);
    return m;
  });
  const note = keyAt(ctx, 64, 952, `${k} px of glass for each px of type. ${A(colourName(ctx, T.strong))} for the display face, ${textC ? A(colourName(ctx, textC)) : 'an outline'} for the text face.`, KEY + 32);
  return page(ctx, 'hierarchy', T, ms, rows + keys + note);
}

// ---- type in use: a headline, a paragraph and a caption, hung above the band; the glass carries each block's column down as a window of its measure ----
function typeInUse(ctx) {
  const T = tokens(ctx), B = ctx.brand, S = B.type.sample, M = marks(ctx, T), f = B.fonts;
  const h = tok(ctx, 'headline'), bd = tok(ctx, 'body'), cp = tok(ctx, 'caption');
  const st = (t) => `${t.face === 'display' ? `font-family:var(--display);font-stretch:${f.display.stretch || 100}%;letter-spacing:-0.02em` : 'font-family:var(--body)'};font-weight:${t.weight};font-size:${t.size}px;line-height:${linePx(t)}px`;
  const lead = body(ctx, 64, 96, 468, `A headline, a paragraph and a caption, set the way ${A(B.name)} sets them.`);
  // the columns: the headline in four (x 64, 468 wide), the paragraph in the next four, the caption in the last two; each hangs 40 px above the heads
  const FOOT = LIP - 40;
  // slot: the headline placeholder is a tall block at the real size, so it is set at 48 px at most, which keeps it clear of the lead above
  const hSlot = !!ctx.placeholders && h.size > 48 ? `;font-size:48px;line-height:${Math.round(48 * h.line)}px` : '';
  const hl = hang(64, FOOT, 468, `<div style="${st(h)}${hSlot};color:var(--ink)">${A(S.headline)}</div>`);
  const para = hang(548, FOOT, 468, `<div style="${st(bd)};color:var(--soft)">${A(S.paragraph)}</div><div style="margin:${linePx(bd)}px 0 0 242px;width:226px;${st(cp)};color:var(--quiet);text-wrap:pretty">${A(S.caption)}</div>`);
  // the windows, each the measure of its column: the headline's solid, the paragraph's an outline, the caption's solid inside it at the right; the heads share one centre
  const wH = 468, wP = 468, wC = 216, ys = LIP + Math.max(wH, wP) / 2;
  const ms = [
    windowMark(60, wH, ys - wH / 2, { fill: T.strong }),
    windowMark(552, wP, ys - wP / 2, { stroke: T.ink }),
    windowMark(792, wC, ys - wC / 2, M[1] ? { fill: M[1] } : { fill: T.strong }),
  ];
  const spec = (n, t) => `${n}, ${A(f[t.face].family)} ${t.weight}`;
  const sz = (t) => `<span class="num">${t.size} / ${linePx(t)}</span>`;
  const keys = keyAt(ctx, 64, 468, spec('Headline', h), KEY, 'kn') + keyAt(ctx, 64, 468, sz(h), KEY + 22, 'v')
    + keyAt(ctx, 556, 226, spec('Paragraph', bd), KEY, 'kn') + keyAt(ctx, 556, 226, sz(bd), KEY + 22, 'v')
    + keyAt(ctx, 796, 220, spec('Caption', cp), KEY, 'kn') + keyAt(ctx, 796, 220, sz(cp), KEY + 22, 'v')
    + keyAt(ctx, 64, 952, 'In the glass, each column of the piece as a window of its measure.', KEY + 64);
  return page(ctx, 'type-in-use', T, ms, lead + hl + para + keys);
}

// ---- type rules: one column per rule, what to do above what never happens; in the band a solid window for the rule kept and an outline for the one broken ----
function typeRules(ctx) {
  const T = tokens(ctx), B = ctx.brand, R = B.type.rules, k = R.length;
  const CW = Math.floor((952 - 24 * (k - 1)) / k), cx = (i) => 64 + i * (CW + 24);
  const head = headline(ctx, 'Setting type', '');
  const lead = body(ctx, 64, 176, 468, `${k} rules for setting type. Each says what to do, and what never happens. In the glass, a solid window for each rule kept, an outline for each one broken.`);
  // one grid across the columns, so the four parts of every column (line, do, never) line up across the page however long each rule runs; it hangs 40 px above the heads
  const cell = (i, row, html, style = '') => `<div style="grid-column:${i + 1};grid-row:${row};${style}">${html}</div>`;
  const grid = R.map((r, i) => cell(i, 1, '', 'border-top:1px solid var(--hair);height:16px')
    + cell(i, 2, '<span class="kn">Do</span>') + cell(i, 3, A(r.do), 'color:var(--ink)')
    + cell(i, 4, '<span class="kn">Never</span>', 'padding-top:16px') + cell(i, 5, A(r.dont), 'color:var(--quiet)')).join('');
  const rules = hang(64, LIP - 40, 952, `<div style="display:grid;grid-template-columns:repeat(${k},${CW}px);column-gap:24px;row-gap:4px;font:${ctx.weights.regular} 16px/25px var(--body);text-wrap:pretty">${grid}</div>`);
  // the windows: two per column, each half the column less a reed, on reed boundaries; equal, so the heads stand level
  const ww = Math.max(2, Math.floor((CW - P) / 2 / P)) * P, ms = [];
  R.forEach((_, i) => { const x = snap(cx(i)); ms.push(windowMark(x, ww, LIP, { fill: T.strong }), windowMark(x + ww + P, ww, LIP, { stroke: T.ink })); });
  const keys = R.map((_, i) => { const x = snap(cx(i)); return keyAt(ctx, x + 4, ww - 4, 'Do', KEY, 'k') + keyAt(ctx, x + ww + P + 4, ww - 4, 'Never', KEY, 'k'); }).join('');
  return page(ctx, 'type-rules', T, ms, head + lead + rules + keys);
}

export const guidelines = { proportion, contrast, 'colour-values': colourValues, hierarchy, 'type-in-use': typeInUse, 'type-rules': typeRules };
