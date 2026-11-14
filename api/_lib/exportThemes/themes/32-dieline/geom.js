// Theme 32, Dieline: shared geometry. A page is one panel of the brand's pack, flattened. Colour roles come from share, the shape from the pack kind.
// Nothing here names a colour id, a photo or a brand's art: roles, shares, pairs and the logo colourways are all read from brand data.
import { loadFont } from '../../engine/nodeFont.js';

export const W = 1080, H = 1080;
export const r2 = (n) => Math.round(n * 100) / 100;
export const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ---- colour roles (spec 1.3), computed from the brand's colours ----
export function roles(ctx) {
  const B = ctx.brand, cs = ctx.colours;
  const lum = (h) => ctx.C.luminance(h);
  const byShare = (xs) => [...xs].sort((a, b) => b.share - a.share);   // stable: a tie keeps the brand's order
  const ground = cs.find((c) => c.role === 'ground') || [...cs].sort((a, b) => lum(b.hex) - lum(a.hex))[0];
  let rest = cs.filter((c) => c !== ground);
  const act = rest.find((c) => c.role === 'action');
  const front = act && act.share >= 0.10 ? act : byShare(rest)[0];
  rest = rest.filter((c) => c !== front);
  const back = byShare(rest)[0] || front; rest = rest.filter((c) => c !== back);
  const side = byShare(rest)[0] || front; rest = rest.filter((c) => c !== side);
  const flap = byShare(rest).pop() || side;
  const R = { ground, front, back, side, flap };

  // text on a field: the brand's own pairs on that background, highest ratio first (a pair marked for large sizes only is skipped)
  const cache = {};
  R.textOn = (hex) => {
    const k = hex.toLowerCase(); if (cache[k]) return cache[k];
    const seen = new Set();
    let rows = ctx.pairs.filter((p) => p.bgHex.toLowerCase() === k && p.ratio >= 4.5 && !p.large).sort((a, b) => b.ratio - a.ratio).map((p) => p.fgHex).filter((h) => !seen.has(h) && seen.add(h));
    if (!rows.length) {
      const all = [...B.colours, ...(B.tones || [])].map((c) => c.hex).filter((h) => ctx.ratio(h, hex) >= 4.5).sort((a, b) => ctx.ratio(b, hex) - ctx.ratio(a, hex));
      if (!all.length) throw new Error(`no brand colour reads at 4.5:1 on ${hex}`);
      rows = all;
    }
    return (cache[k] = { ink: rows[0], mid: rows[Math.floor((rows.length - 1) / 2)], quiet: rows[rows.length - 1] });
  };
  R.groundText = R.textOn(ground.hex);
  // the colour of a die line on a field: ink on a colour, quiet on the unprinted ground
  // on a pure-white ground the quiet grey vanishes at 1 px dashed, so the die lines there take the mid ink instead
  R.ghost = lum(ground.hex) > 0.97 ? R.groundText.mid : R.groundText.quiet;
  R.lineOn = (hex) => (hex.toLowerCase() === ground.hex.toLowerCase() ? R.ghost : R.textOn(hex).ink);
  R.isGround = (hex) => hex.toLowerCase() === ground.hex.toLowerCase();
  // the logo colourway drawn for a ground, else the one whose name colour reads best
  R.colourwayOn = (hex) => {
    const cw = B.logo.colourways, keys = Object.keys(cw);
    return keys.find((k) => cw[k].ground.toLowerCase() === hex.toLowerCase()) || keys.reduce((a, b) => (ctx.ratio(cw[b].name, hex) > ctx.ratio(cw[a].name, hex) ? b : a));
  };
  // the panels of the net: one per colour, widest share first
  R.order = byShare(cs);
  return R;
}

// The pack a brand with no packaging of its own is drawn on: two satchels and a parcel box, in plain words. The upstream sample brands carry their own pack
// (brand.packaging); a project brand has none, so these are measurements and labels only: no name, place or product of anyone's.
const DEFAULT_PACKAGING = {
  kind: 'satchel', name: 'A4 satchel', size: 'A4 satchel, 340 x 400 mm',
  nets: [
    { id: 'a', kind: 'satchel', name: 'A4 satchel', panels: [['ground', 340], ['front', 340, 'front']], height: 400, flap: 60, seal: 16, art: { logoMm: 220, brandLine: true, headMax: 36, headWhole: true, headMin: 16, headLines: 4, title: '', date: '' } },
    { id: 'b', kind: 'satchel', name: 'A3 satchel', panels: [['ground', 440], ['front', 440, 'front']], height: 520, flap: 70, seal: 16, art: { logoMm: 300, brandLine: true, headMax: 36, headWhole: true, headMin: 16, headLines: 4, title: '', date: '' } },
    { id: 'c', kind: 'box', name: '1 kg parcel box', panels: [['back', 15, 'glue'], ['side', 100], ['front', 220, 'front'], ['side', 100], ['back', 220]], height: 160, tuck: 50, dust: 40, art: { date: '', dateMm: 22 }, note: 'Flaps stay unprinted board. The date sits on the front, never on a flap.' },
  ],
  copy: {
    place: '', monoSample: '#000000 / 340 mm / 00.00.00',
    signage: { title: 'Packaging', hero: 'A4 satchel, front, drawn flat.', heroVal: '340 x 400 mm', second: 'A second place the brand appears, drawn to scale.', secondVal: '', secondScene: 'counter-fascia-opening' },
    product: { note: '', date: '', net: '', fascia: 'Sign text', logoW: 360 },
  },
};

// ---- packaging data: the brand's own copy where it has it, else a plain fallback ----
export function pack(ctx) {
  const B = ctx.brand, p = B.packaging || DEFAULT_PACKAGING, raw = p.copy || {};
  // slot (placeholders on): the engine does not swap the pack's own copy, so the words it would leak give way to plain labels and the
  // fallbacks below; sizes, scene ids and measurements are not words and stay
  const rs = raw.signage || {}, rp = raw.product || {}, w = (v, s) => (v ? s : v);
  const c = ctx.placeholders ? {
    place: B.city || '', monoSample: w(raw.monoSample, '#000000 / 250 g / 00.00.00'),
    signage: { ...(rs.heroVal ? { heroVal: rs.heroVal } : {}), second: w(rs.second, 'A second place the brand appears, drawn to scale.'), secondVal: rs.secondVal || '', secondScene: rs.secondScene || 'counter-fascia-opening' },
    product: { name: 'Product name', note: w(rp.note, 'One line about the product.'), date: w(rp.date, 'Date'), net: w(rp.net, 'Net weight'), fascia: w(rp.fascia, 'Sign text'), logoW: rp.logoW || 424 },
  } : raw;
  const kind = ['bag', 'box', 'satchel'].includes(p.kind) ? p.kind : 'box';
  const noun = { bag: 'bag', box: 'carton', satchel: 'satchel' }[kind];
  const t = c.type || {};
  return {
    kind, noun, name: p.name || '', size: p.size || '', nets: p.nets || [],
    place: c.place !== undefined ? c.place : (B.city || ''),
    groundNote: c.groundNote || `The back panel of every ${noun} carries these three lines. The front carries only the name.`,
    type: { display: t.display || 'Names and one line a page.', body: t.body || 'Everything a customer reads for longer than a glance.', mono: t.mono || 'Values and dates.', charset: t.charset || '0123456789 &%' },
    gusset: (c.gusset && c.gusset.text) || (B.voice && B.voice.boilerplate25) || B.description,
    monoSample: c.monoSample || '',
    signage: { title: 'Packaging', hero: `${p.name || 'Pack'}, front panel. The cover of this book, printed.`, heroVal: p.size || '', second: '', secondVal: '', secondScene: 'counter-fascia-opening', ...(c.signage || {}) },
    product: { name: B.name, note: '', date: '', net: '', fascia: '', logoW: 424, ...(c.product || {}) },
    layouts: { intro: 'Three packs, one scale; the colours are the same shares as the palette, laid on the panels that carry them.', rules: ['The name is as large as the date.', 'One colour fills the front. The back carries the words.', 'Every pack has a closure and nothing else drawn on it.'], boxNote: 'Flaps stay unprinted board.', ...(c.layouts || {}) },
  };
}

// ---- share allocation: integer widths that sum to the strip, largest remainder, none under the minimum ----
export function allocate(shares, total, min) {
  const n = shares.length, out = new Array(n).fill(null);
  let free = total;
  for (let go = true; go;) {
    go = false;
    const open = shares.map((s, i) => i).filter((i) => out[i] === null), sum = open.reduce((s, i) => s + shares[i], 0);
    for (const i of open) if (shares[i] / sum * free < min) { out[i] = min; free -= min; go = true; break; }
  }
  const open = shares.map((s, i) => i).filter((i) => out[i] === null), sum = open.reduce((s, i) => s + shares[i], 0);
  const raw = open.map((i) => shares[i] / sum * free), fl = raw.map(Math.floor);
  const left = free - fl.reduce((s, v) => s + v, 0);
  open.map((i, k) => ({ k, f: raw[k] - fl[k] })).sort((a, b) => b.f - a.f || a.k - b.k).slice(0, left).forEach(({ k }) => fl[k]++);
  open.forEach((i, k) => { out[i] = fl[k]; });
  return out;
}

// ---- measuring text with the real glyphs (advance widths plus kerning, as engine/logo.js outline() sets them) ----
export function faceOf(ctx, role, weight) {
  if (role === 'chrome') return { stem: `FunnelSans-${weight === 500 ? 500 : 400}` };   // the theme's own faces, not the brand's
  if (role === 'val') return { stem: 'SplineSansMono-400' };
  return ctx.faces.find((f) => f.role === role && f.style !== 'italic' && f.weight === weight) || ctx.faces.find((f) => f.role === role && f.style !== 'italic');
}
export function measure(ctx, role, weight, text, size, track = 0) {
  const font = loadFont(faceOf(ctx, role, weight).stem);
  let x = 0, prev = null;
  for (const ch of text.replace(/\u00a0/g, ' ')) {   // a no-break space measures as a space
    const g = font.charToGlyph(ch);
    if (prev) { try { x += font.getKerningValue(prev, g) * size / font.unitsPerEm; } catch { /* no kerning table */ } }
    x += g.advanceWidth * size / font.unitsPerEm + track * size; prev = g;
  }
  return x;
}
// wrap at maxW into lines (an optimal fit over the whole paragraph, not greedy). A line may not end on an article, a short preposition or conjunction, or a possessive,
// and no line may be only the last one or two words of a sentence; those breaks cost far more than any raggedness, so they are used only when no other fit exists.
// Words that must stay together are joined by a no-break space, so they hold even if the text is ever re-wrapped elsewhere.
const NBSP = '\u00A0', HOLD = new Set(['the', 'a', 'an', 'with', 'of', 'to', 'and', 'or', 'in', 'on', 'for', 'by', 'at', 'from', 'into', 'than', 'but', 'as']);
const holdsNext = (w) => HOLD.has(w.toLowerCase().replace(/^[^a-z]+|[^a-z]+$/gi, '')) || /[\u2019']s$|s[\u2019']$/i.test(w);
// phrases that are one unit (a compound noun, a name with its article, "is all <colour>"): no break inside them
const normW = (w) => w.toLowerCase().replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi, '');
const unitsOf = (ctx) => ['valve ring', `a ${ctx.brand.name} page`, ...(ctx.brand.colours || []).map((c) => `is all ${c.name}`)].map((u) => u.toLowerCase().split(' '));
const endsSentence = (w) => /[.!?]["\u201D\u2019)]*$/.test(w);
export function wrap(ctx, role, weight, text, size, maxW, track = 0) {
  const words = text.trim().split(/[ \t\r\n]+/), n = words.length, wd = (t) => measure(ctx, role, weight, t, size, track);
  if (n < 2) return [words.join(' ')];
  // sentence start of every word, and the width of every run of words
  // unit[k]: word k is tied to word k+1 by a held phrase
  const nw = words.map(normW), unit = new Array(n).fill(false);
  for (const u of unitsOf(ctx)) for (let i = 0; i + u.length <= n; i++) if (u.every((x, q) => nw[i + q] === x)) for (let q = 0; q < u.length - 1; q++) unit[i + q] = true;
  const sStart = []; words.forEach((w, i) => { sStart[i] = i > 0 && !endsSentence(words[i - 1]) ? sStart[i - 1] : i; });
  const width = (i, j) => wd(words.slice(i, j + 1).join(' '));
  const INF = Infinity, best = new Array(n + 1).fill(INF), from = new Array(n + 1).fill(0); best[0] = 0;
  for (let j = 1; j <= n; j++) {
    for (let i = j - 1; i >= 0; i--) {   // the line holds words i .. j-1
      const w = width(i, j - 1), one = i === j - 1;
      if (w > maxW && !one) break;
      const last = j === n; let cost = 10000;   // each line costs, so the fewest lines wins unless a bad break is in the way
      if (!last && (holdsNext(words[j - 1]) || unit[j - 1])) cost += 1e6;
      if (j - i <= 2 && (last || endsSentence(words[j - 1])) && i > sStart[j - 1]) cost += 2e5;   // only the tail of a sentence on its own line
      if (!last && /[,;:.!?]$/.test(words[j - 1])) cost -= 30;   // a break at a comma or a full stop reads better than one inside a phrase
      const slack = Math.max(0, maxW - w) / maxW; cost += slack * slack * (last ? 40 : 100);
      if (best[i] + cost < best[j]) { best[j] = best[i] + cost; from[j] = i; }
    }
  }
  const lines = []; for (let j = n; j > 0; j = from[j]) lines.unshift([from[j], j]);
  // words tied to the next by a no-break space: a hold word or possessive, and the last two words of each sentence
  const tie = (k) => holdsNext(words[k]) || unit[k] || ((k + 1 === n - 1 || endsSentence(words[k + 1])) && sStart[k + 1] <= k);
  return lines.map(([i, j]) => { let o = words[i]; for (let k = i + 1; k < j; k++) o += (tie(k - 1) ? NBSP : ' ') + words[k]; return o; });
}
// the scale a net is drawn at, as a ratio against its real size on a 96 dpi page: the largest k that fits (kMax), rounded down to a half step of the ratio, so it prints as 1:4 or 1:6.5
export const PXMM = 96 / 25.4;
export function scaleFor(kMax) { const n = Math.ceil(PXMM / kMax * 2 - 1e-9) / 2; return { n, k: PXMM / n, label: '1:' + n }; }
export const sentences = (s) => s.match(/[^.!?]+[.!?]+(?=\s|$)|[^.!?]+$/g)?.map((x) => x.trim()) || [s];

// ---- the die: one line style per kind (spec 1.4) ----
const DASH = { cut: '', fold: '8 6', seal: '1.5 5' };
export function L(kind, x1, y1, x2, y2, col, w = 1.5) {
  const x = [x1, x2].map((v) => r2(Math.min(W + 4, Math.max(-4, v)))), y = [y1, y2].map((v) => r2(Math.min(H, Math.max(0, v))));
  return `<line x1="${x[0]}" y1="${y[0]}" x2="${x[1]}" y2="${y[1]}" stroke="${col}" stroke-width="${w}"${DASH[kind] ? ` stroke-dasharray="${DASH[kind]}"` : ''}${kind === 'seal' ? ' stroke-linecap="round"' : ''} fill="none"/>`;
}
export const pathLine = (kind, d, col, { fill = 'none', w = 1.5 } = {}) => `<path d="${d}" fill="${fill}" stroke="${col}" stroke-width="${w}"${DASH[kind] ? ` stroke-dasharray="${DASH[kind]}"` : ''}${kind === 'seal' ? ' stroke-linecap="round"' : ''} stroke-linejoin="miter"/>`;
export const fillPath = (d, fill) => `<path d="${d}" fill="${fill}"/>`;
// a line on the ground, split around text boxes (each grown by 12) so it never crosses type; fragments under 48 are dropped
export function ghost(kind, axis, at, a, b, boxes, col) {
  let segs = [[a, b]];
  for (const bx of boxes) {
    const [lo, hi] = axis === 'h' ? [bx.y - 12, bx.y + bx.h + 12] : [bx.x - 12, bx.x + bx.w + 12];
    if (at < lo || at > hi) continue;
    const [c0, c1] = axis === 'h' ? [bx.x - 12, bx.x + bx.w + 12] : [bx.y - 12, bx.y + bx.h + 12];
    segs = segs.flatMap(([s, e]) => (c1 <= s || c0 >= e ? [[s, e]] : [[s, Math.min(e, c0)], [Math.max(s, c1), e]]));
  }
  return segs.filter(([s, e]) => e - s >= 48).map(([s, e]) => (axis === 'h' ? L(kind, s, at, e, at, col, 1) : L(kind, at, s, at, e, col, 1))).join('');
}
// heat-seal crimp: a 14 px band of 1 px horizontal ribs, 3 px apart, starting 3 px under y
export function crimp(x0, x1, y, col, h = 14) { let s = ''; for (let yy = y + 3; yy <= y + h; yy += 3) s += L('cut', x0, yy, x1, yy, col, 1); return s; }
// outline of a tuck flap (rounded outer corners) or a dust flap (chamfered), open on the hinge at y0. dir -1 is up, +1 is down
export function flapPath(style, a, b, y0, h, dir, { ra = true, rb = true, r: rad } = {}) {
  const yt = y0 + dir * h, sweep = dir > 0 ? 0 : 1;
  if (style === 'tuck') {
    const r = rad ?? 32;
    return `M${a} ${y0}V${yt - dir * (ra ? r : 0)}${ra ? `A${r} ${r} 0 0 ${sweep} ${a + r} ${yt}` : ''}H${b - (rb ? r : 0)}${rb ? `A${r} ${r} 0 0 ${sweep} ${b} ${yt - dir * r}` : ''}V${y0}`;
  }
  const c = rad ?? 24;
  return `M${a} ${y0}V${yt - dir * (ra ? c : 0)}${ra ? `L${a + c} ${yt}` : ''}H${b - (rb ? c : 0)}${rb ? `L${b} ${yt - dir * c}` : ''}V${y0}`;
}
// the closure of one panel, by pack kind (spec 2.2).
// g: x0 x1 y0 y1, hex (the panel's fill), l and r ('fold' | 'cut' | 'bleed'), role ('front' | 'back' | 'side' | ''), valve (bool)
export function closure(R, kind, g, out) {
  const col = R.lineOn(g.hex), gcol = R.ghost;
  const xa = Math.max(0, g.x0), xb = Math.min(W, g.x1);
  const top = kind === 'bag' ? 'cut' : 'fold', bot = kind === 'satchel' || kind === 'bag' ? 'cut' : 'fold';
  const o = (s) => out.push(s);
  o(L(top, xa, g.y0 + 0.75, xb, g.y0 + 0.75, col)); o(L(bot, xa, g.y1 - 0.75, xb, g.y1 - 0.75, col));
  if (g.l === 'fold' || g.l === 'cut') o(L(g.l, g.x0 + 0.75, g.y0, g.x0 + 0.75, g.y1, col));
  if (g.r === 'fold' || g.r === 'cut') o(L(g.r, g.x1 - 0.75, g.y0, g.x1 - 0.75, g.y1, col));
  if (kind === 'bag') {
    o(L('seal', xa, g.y0 + 44, xb, g.y0 + 44, col)); o(L('fold', xa, g.y1 - 40, xb, g.y1 - 40, col)); o(crimp(xa, xb, g.y0 + 44, col));
    if (g.role === 'side') { const w = g.x1 - g.x0; o(pathLine('fold', `M${g.x0} ${g.y1 - 40}L${r2(g.x0 + w / 4)} ${g.y1 - 5}L${r2(g.x0 + w / 2)} ${g.y1 - 40}L${r2(g.x0 + 3 * w / 4)} ${g.y1 - 5}L${g.x1} ${g.y1 - 40}`, col)); }
    if (g.valve) {
      const cx = g.r !== 'bleed' ? g.x1 - 64 : g.x0 + 64 + 22, cy = g.y0 + 112;
      o(pathLine('seal', `M${cx - 22} ${cy}a22 22 0 1 0 44 0a22 22 0 1 0 -44 0`, col)); o(pathLine('seal', `M${cx - 8} ${cy}a8 8 0 1 0 16 0a8 8 0 1 0 -16 0`, col));
    }
  } else if (kind === 'box') {
    const tuck = g.role === 'front' || g.role === 'back', style = tuck ? 'tuck' : 'dust';
    const hUp = tuck ? 88 : 56, hDown = Math.min(g.y1 + hUp, 996) - g.y1;
    const ax = tuck ? (g.l === 'bleed' ? g.x0 - 4 : g.x0 + 12) : (g.l === 'bleed' ? g.x0 - 4 : g.x0);
    const bx = tuck ? (g.r === 'bleed' ? g.x1 + 4 : g.x1 - 12) : (g.r === 'bleed' ? g.x1 + 4 : g.x1);
    const opt = { ra: g.l !== 'bleed', rb: g.r !== 'bleed' };
    o(pathLine('cut', flapPath(style, ax, bx, g.y0, hUp, -1, opt), gcol));
    o(pathLine('cut', flapPath(style, ax, bx, g.y1, hDown, 1, opt), gcol));
  } else {
    o(L('seal', xa, g.y1 - 16, xb, g.y1 - 16, col)); o(crimp(xa, xb, g.y1 - 16, col));
  }
}
// the satchel's closing flap over a run of panels (spec 2.2): one path filled with the flap colour, rounded on edges that are not bleeding, a peel strip inside it
export function satchelFlap(R, x0, x1, y0, hex, l, r, out) {
  const rad = 48, yt = y0 - 104, col = R.lineOn(hex);
  const ra = l !== 'bleed' ? rad : 0, rb = r !== 'bleed' ? rad : 0;
  const d = `M${x0} ${y0}V${yt + ra}${ra ? `A${ra} ${ra} 0 0 1 ${x0 + ra} ${yt}` : ''}H${x1 - rb}${rb ? `A${rb} ${rb} 0 0 1 ${x1} ${yt + rb}` : ''}V${y0}Z`;
  out.push(fillPath(d, hex));
  const pa = x0 + 32, pb = r === 'bleed' ? x1 + 40 : x1 - 32;
  out.push(pathLine('seal', `M${pa} ${y0 - 80}H${pb}V${y0 - 56}H${pa}Z`, col));
}
