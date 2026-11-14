// Guidelines pages for theme 29 (Blueprint), round 1. Built so far: cover, palette, typefaces. Every page is an A3 landscape sheet (1587 x 1123)
// made by sheet(): film ground, zone frame, centring marks and the title block at the foot. Work is placed in page px, so every x and y below is the spec's.
import { esc as A } from '../../engine/brand.js';
import { outline } from '../../engine/logo.js';
import { loadFont } from '../../engine/nodeFont.js';
import { inkW, wrap, fitW, heaviest, displayStem, bodyStem, baseline, nb, nbt, specimen } from './measure.js';
import { arts, artDoc, placePhoto, CLIP, hoardingScene, isCourier, photoFill } from './scenes.js';
import { WEIGHT_NAMES, unusedWeights } from "./weights.js";
import { phTight } from './ph.js';
import { letterArts } from './lane-bk-arts.js';

const FILM = '#EEF1F2', INK = '#1F2A33';
const PX = 3.7795; // px per mm at 96 dpi
const ZX = Array.from({ length: 9 }, (_, k) => 40 + 188.375 * k);
const ZY = Array.from({ length: 7 }, (_, j) => 40 + (1043 / 6) * j);
const r1 = (n) => Math.round(n * 10) / 10;
const crisp = (v) => Math.round(v) + 0.5;
// words in the sheet's sans, with only a literal value in mono: [1:20] becomes a mono span (Dylan's mono rule)
const mixed = (t) => A(t).replace(/\[(.+?)\]/g, '<span class="v">$1</span>');
// a sheet is not a page: the brand's "Most of every page" reads "Most of every brand piece" here
const piece = (t) => String(t).replace('Most of every page', 'Most of every brand piece');

// ---- redlines: one list per page, drawn as one svg plus horizontal values ----
function reds(ctx) {
  const lines = [], vals = [];
  const seg = (a, b, w) => lines.push(`<line x1="${r1(a[0])}" y1="${r1(a[1])}" x2="${r1(b[0])}" y2="${r1(b[1])}" stroke-width="${w}"/>`);
  const tick = (p, u, w) => { const c = Math.SQRT1_2, t = [u[0] * c - u[1] * c, u[0] * c + u[1] * c]; seg([p[0] - t[0] * 5, p[1] - t[1] * 5], [p[0] + t[0] * 5, p[1] + t[1] * 5], w); };
  return {
    // a dimension for the edge p1 to p2, offset d along the outward normal n. place: 'out' (default) puts the value 6 px clear of the line, 'side' to the right of a vertical line
    dim(p1, p2, n, { d = 28, value, w = 1.5, tab = false, place = 'out' } = {}) {
      const len = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]), u = [(p2[0] - p1[0]) / len, (p2[1] - p1[1]) / len];
      const q1 = [p1[0] + n[0] * d, p1[1] + n[1] * d], q2 = [p2[0] + n[0] * d, p2[1] + n[1] * d];
      for (const [p, q] of [[p1, q1], [p2, q2]]) { const e = tab ? 2 : 1; lines.push(`<line x1="${r1(p[0] + n[0] * 4)}" y1="${r1(p[1] + n[1] * 4)}" x2="${r1(q[0] + n[0] * 6)}" y2="${r1(q[1] + n[1] * 6)}" stroke-width="${e === 2 ? 1.5 : 1}"/>`); }
      seg(q1, q2, w); tick(q1, u, w); tick(q2, u, w);
      const m = [(q1[0] + q2[0]) / 2, (q1[1] + q2[1]) / 2];
      const style = place === 'side' ? `left:${r1(m[0] + 12)}px;top:${r1(m[1] - 6)}px` : place === 'left' ? `left:${r1(m[0] - 12)}px;top:${r1(m[1] - 6)}px;transform:translateX(-100%)` : `left:${r1(m[0] + n[0] * 12)}px;top:${r1(m[1] + n[1] * 12 - 6)}px;transform:translateX(-50%)`;
      vals.push(`<span class="rv" style="${style}${tab ? ';background:var(--film);padding:2px 6px' : ''}">${A(value)}</span>`);
    },
    svg: () => `<svg class="a" style="left:0;top:0" width="1587" height="1123" viewBox="0 0 1587 1123" fill="none" stroke="var(--red)" aria-hidden="true">${lines.join('')}</svg>${vals.join('')}`,
  };
}

// ---- the sheet: frame, zone references, centring marks, title block ----
function sheet(ctx, id, { drawing, section, scale }, inner) {
  const B = ctx.brand, p = ctx.pages.find((x) => x.id === id), cell = (k, lab, val, cls = 'tv') => `<span class="tl" style="left:${ZX[k] + 24}px;top:987px">${A(lab)}</span>${val}`;
  const sec = section ?? (p.section ? `${String(p.section.n).padStart(2, '0')} ${p.section.title}` : 'Cover');
  const d = new Date(B.version.date + 'T00:00:00Z');
  const rev = `${B.version.number}, ${d.getUTCDate()} ${d.toLocaleDateString('en-AU', { month: 'long', year: 'numeric', timeZone: 'UTC' })}`;
  const size = [22, 20, 18].find((s) => inkW('Chivo-500', drawing, s) <= 328) || 18;
  const no = String(ctx.pageNo(id)).padStart(3, '0'), total = String(ctx.pages.length).padStart(3, '0');
  const lw = fitW(ctx, 'horizontal', 140, 40), lh = (lw * ctx.logo.geos.horizontal.h) / ctx.logo.geos.horizontal.w;
  let svg = `<rect x="16" y="16" width="1555" height="1091" stroke="var(--quiet)" stroke-width=".75"/>`;
  for (let k = 0; k < 9; k++) { const x = crisp(ZX[k]); svg += `<path d="M${x} 16V40M${x} 1083V1107" stroke="var(--quiet)" stroke-width="1"/>`; }
  for (let j = 0; j < 7; j++) { const y = crisp(ZY[j]); svg += `<path d="M16 ${y}H40M1547 ${y}H1571" stroke="var(--quiet)" stroke-width="1"/>`; }
  svg += `<path d="M793.5 0V40M793.5 1083V1123M0 561.5H40M1547 561.5H1587" stroke="var(--ink)" stroke-width="1.5"/>`;
  svg += `<rect x="40" y="40" width="1507" height="1043" stroke="var(--ink)" stroke-width="1.5"/><path d="M40 971H1547" stroke="var(--ink)" stroke-width="1.5"/>`;
  for (const k of [2, 3, 4, 5, 6, 7]) svg += `<path d="M${crisp(ZX[k])} 972V1082" stroke="var(--hair)" stroke-width="1"/>`;
  const zw = 188.375;
  const nums = Array.from({ length: 8 }, (_, k) => [22, 1089].map((y) => `<span class="zr" style="left:${ZX[k]}px;width:${zw}px;top:${y}px">${k + 1}</span>`).join('')).join('');
  const lets = Array.from({ length: 6 }, (_, j) => [22, 1553].map((x) => `<span class="zr" style="left:${x}px;width:12px;top:${ZY[j] + 86.9 - 7}px">${'ABCDEF'[j]}</span>`).join('')).join('');
  const tb = [
    cell(0, 'Drawing', `<span class="tv t" style="left:${ZX[0] + 24}px;top:1007px;font-size:${size}px">${A(drawing)}</span>`),
    cell(2, 'Section', `<span class="tv" style="left:${ZX[2] + 24}px;top:1007px">${A(sec)}</span>`),
    cell(3, 'Scale', `<span class="tv nw" style="left:${ZX[3] + 24}px;top:1007px">${mixed(scale)}</span>`),
    cell(4, 'Revision', `<span class="tv" style="left:${ZX[4] + 24}px;top:1007px">${A(rev)}</span>`),
    cell(5, 'Project', `<span class="tv" style="left:${ZX[5] + 24}px;top:1007px;font-weight:500">${A(B.name)}</span><span class="tv c-quiet" style="left:${ZX[5] + 24}px;top:1025px;color:var(--quiet)">Brand guidelines</span>`),
    cell(6, 'Sheet', `<span class="sn" style="left:${ZX[6] + 24}px;top:1007px">${no}<small> of ${total}</small></span>`),
    `<span class="a" style="left:${ZX[7] + 24}px;top:${1027 - lh / 2}px;width:${lw}px">${ctx.logo.html('horizontal', { width: lw, label: 'Logo' })}</span>`,
  ].join('');
  return `<section class="pg${phTight(ctx, id)}" data-page="${id}">${inner}<svg class="a" style="left:0;top:0" width="1587" height="1123" viewBox="0 0 1587 1123" fill="none" aria-hidden="true">${svg}</svg>${nums}${lets}${tb}</section>`;
}

// text colour on a colour field: the brand's own pair for that background if there is one, else ink or white by ratio
function onField(ctx, c) {
  const own = ctx.pairs.filter((p) => p.bgHex.toUpperCase() === c.hex.toUpperCase()).sort((a, b) => b.ratio - a.ratio)[0];
  if (own && own.ratio >= 4.5) return own.fgHex;
  return ctx.ratio('#FFFFFF', c.hex) >= ctx.ratio(INK, c.hex) ? '#FFFFFF' : INK;
}

const own = {
    // the line stands once: a shopfront cover has it on the fascia already, so the line under the logo is for the photograph that does not carry it
  cover(ctx) {
    const B = ctx.brand, g = ctx.logo.geos.colour, X = ZX[1];
    // the wordmark and tagline sit above a photograph of the brand at work, which runs edge to edge at the foot of the drawing area
    const W = Math.min(ZX[7] - ZX[1], Math.floor((280 * g.w) / g.h)), H = (W * g.h) / g.w, Y = 108 + Math.round((280 - H) / 2);
    const box = { x: 40, y: 491, w: 1507, h: 480 };
    // its own scene, a shopfront fascia: neither the hoarding (page 3, Plumbline) nor the laptop (page 5, Kerbside) shows twice. The crop starts 45 scene px down, under the stone.
    // a courier brand with its own photographs opens on the first of them (riders on the street), slid to its focus; a shopfront never stands for it
    const own = isCourier(ctx) ? photoFill(ctx, B.imagery.shots.find((s) => s.photo), box) : null;
    const P = own ? { html: own } : placePhoto(ctx, 'shopfront-fascia', { fascia: artDoc(ctx, arts.fascia(ctx)) }, box, { alt: `${B.name}'s fascia on a shopfront`, focus: [768, 290] });
    const R = reds(ctx);
    R.dim([X, Y], [X + W, Y], [0, -1], { d: 32, value: String(Math.round(W / PX)) });
    R.dim([X + W, Y], [X + W, Y + H], [1, 0], { d: 32, value: String(Math.round(H / PX)), place: 'side' });
    const lead = B.type.scale.find((t) => t.token === 'lead') || { size: 24, line: 32 };
    const inner = `${P.html}<div class="a" style="left:${X}px;top:${Y}px;width:${W}px">${ctx.logo.html('colour', { width: W, colourway: 'colour', label: 'Your logo goes here' })}</div>${R.svg()}
${own ? `<p class="a bn" style="left:${X}px;top:${Math.round(Y + H + 40)}px;width:900px;font-weight:500;font-size:${lead.size}px;line-height:${lead.line * (lead.line < 4 ? lead.size : 1)}px;color:var(--b-text)">${A(B.lines.primary)}</p>` : ""}`;
    return sheet(ctx, 'cover', { drawing: 'Brand guidelines', section: 'Cover', scale: '[1:1], sizes in mm' }, inner);
  },

  palette(ctx) {
    const cols = ctx.colours, total = 1507, n = cols.length;
    let ws = cols.map((c) => Math.max(48, c.share * total));
    const over = ws.reduce((a, b) => a + b, 0) - total; if (over > 0.01) { const i = ws.indexOf(Math.max(...ws)); ws[i] -= over; }
    // a short schedule (under five finishes) hands its spare rows to the fields, so the table always ends 71 px above the title block
    // a schedule of five or fewer has 36 px more again, so the table ends about 35 px above the title block and no dead strip is left under it
    const roomy = n <= 5 ? 36 : 0, spare = Math.max(0, 5 - n) * 32 + roomy, FH = Math.max(480, 620 - Math.max(0, n - 5) * 36) + spare, RY = 740 + spare;
    let x = 40, fields = '', ext = '', segs = '', vals = '', rows = '';
    const R = reds(ctx), cy = 40 + FH + 24;
    const dimLine = [];
    // the primary line, set once on the widest dark field in the brand's own text colour for it: the page shows a pairing at work
    const stem = displayStem(ctx), line = specimen(ctx);
    // the widest dark field where each sentence sets on one line at 28 px or more; failing that, the widest field the line holds 7 : 1 on (a narrow field would break a sentence)
    const sentsOf = line.split(/(?<=[.!?])\s+/), oneLine = (o) => sentsOf.every((t) => inkW(stem, t, 28, -0.01) <= o.w - 32);
    const cand = cols.map((c, i) => ({ c, i, w: ws[i] })).filter((o) => o.w >= 220 && ctx.ratio(onField(ctx, o.c), o.c.hex) >= 7).sort((p, q) => q.w - p.w);
    const pick = cand.find((o) => ctx.ratio('#FFFFFF', o.c.hex) >= 7 && oneLine(o)) || cand.find(oneLine) || cand[0];
    let say = '';
    if (pick) {
      // one sentence to a line where the field is wide enough for it, at the largest size that does
      const sents = line.split(/(?<=[.!?])\s+/), fit = (s) => sents.every((t) => inkW(stem, t, s, -0.01) <= pick.w - 32);
      const sz = [40, 36, 34, 32, 30, 28, 26].find(fit) || 26, ls = fit(sz) ? sents : wrap(stem, line, sz, pick.w - 38, -0.01), lh = Math.round(sz * 1.1);
      const fx = ws.slice(0, pick.i).reduce((a, b) => a + b, 40);
      say = `<p class="a bd" style="left:${r1(fx + 16)}px;top:${40 + FH - 24 - ls.length * lh}px;font-size:${sz}px;line-height:${lh}px;color:${onField(ctx, pick.c)}">${ls.map((l) => A(l)).join('<br>')}</p>`;
    }
    cols.forEach((c, i) => {
      const w = ws[i], fg = onField(ctx, c), edge = ctx.ratio(c.hex, FILM) < 1.3;
      let lab = '';
      if (w >= 160) lab = `<span class="a c-mono" style="left:${x + 16}px;top:56px;color:${fg}">C${i + 1}</span><span class="a bn nw" style="left:${x + 16}px;top:${56 + 18}px;font:600 15px/20px var(--body);color:${fg}">${A(c.name)}</span><span class="a nw" style="left:${x + 16}px;top:${56 + 18 + 22}px;font:400 12px/16px var(--cmono);color:${fg}">${A(c.hex)}</span>`;
      else if (w >= 40) lab = `<span class="a nw" style="left:${x + 12}px;top:56px;font:400 12px/16px var(--cmono);color:${fg}">C${i + 1}</span>`;
      fields += `<div class="fld${edge ? ' edge' : ''}" style="left:${x}px;top:40px;width:${r1(w)}px;height:${FH}px;background:${c.hex}"></div>${lab}`;
      dimLine.push(x);
      vals += `<span class="rv" style="left:${r1(x + w / 2)}px;top:${cy + 8}px;transform:translateX(-50%)">${Math.round(c.share * 100)}%</span>`;
      x += w;
      const ry = RY + i * 32;
      rows += `<div class="hl" style="left:64px;top:${ry}px;width:1459px"></div><span class="sw" style="left:64px;top:${ry + 10}px;background:${c.hex}"></span>
<span class="a c-mono" style="left:84px;top:${ry + 8}px">C${i + 1}</span><span class="a nw" style="left:112px;top:${ry + 6}px;font:600 15px/20px var(--body)">${A(c.name)}</span><span class="a c-note nw" style="left:296px;top:${ry + 6}px">${A(c.role)}</span>
<span class="a c-note" style="left:440.8px;top:${ry + 2}px;width:729px;font-size:13px;line-height:16px;height:28px;display:flex;align-items:center">${A(piece(c.lands))}</span>
<span class="a c-mono" style="left:1194.3px;top:${ry + 8}px">${A(c.hex)}</span>`;
    });
    dimLine.push(1547);
    // chain dimension: one line under the fields, shared oblique ticks at every field edge
    const t = (px) => { const c = Math.SQRT1_2; return `<line x1="${px - 5 * c}" y1="${cy + 5 * c}" x2="${px + 5 * c}" y2="${cy - 5 * c}"/>`; };
    segs = `<svg class="a" style="left:0;top:0" width="1587" height="1123" viewBox="0 0 1587 1123" fill="none" stroke="var(--red)" aria-hidden="true"><line x1="40" y1="${cy}" x2="1547" y2="${cy}" stroke-width="1.5"/>${dimLine.map((px) => `<line x1="${px}" y1="${40 + FH + 4}" x2="${px}" y2="${cy + 6}" stroke-width="1"/>${t(px)}`).join('')}</svg>`;
    // RGB and OKLCH are not printed here: they belong to the values appendix, so this sheet stays about the colours at work
    const head = ['Key', 'Finish', 'Role', 'Where it lands', 'HEX'].map((h, i) => `<span class="a c-label" style="left:${[64, 112, 296, 440.8, 1194.3][i]}px;top:${RY - 24}px">${h}</span>`).join('');
    const inner = `${fields}${say}${segs}${vals}${head}${rows}<div class="hl" style="left:64px;top:${RY + n * 32}px;width:1459px"></div>`;
    return sheet(ctx, 'palette', { drawing: 'Finishes schedule', scale: 'Share of a page' }, inner);
  },

  typefaces(ctx) {
    const B = ctx.brand, F = B.fonts, stem = displayStem(ctx), text = specimen(ctx);
    const f = loadFont(stem), ex = (ch, dir, s) => outline(f, ch, s, 0)[dir], nScale = B.type.scale.length;
    // every vertical position follows from the specimen size: the largest one that sets in two lines (inside the redlines at x 1406) and leaves the scale schedule room above the title block
    const lay = (s) => {
      // break at the comma when the sample has one and both halves fit, so a line never ends on a hanging "on"; otherwise the greedy wrap
      const half = text.split(/(?<=,) /), lines = half.length === 2 && half.every((t) => inkW(stem, t, s, -0.01) <= 1318.6) ? half : wrap(stem, text, s, 1318.6, -0.01), cap = -ex('H', 'y1', s), xh = -ex('x', 'y1', s), desc = ex('p', 'y2', s), base = 104 + cap;
      const rowTop = base + (lines.length - 1) * s + desc + 40, noteTop = rowTop + 48, midTop = noteTop + 64, head = midTop + 124 + 44;
      return { s, lines, cap, xh, desc, base, rowTop, noteTop, midTop, head, end: head + 24 + 28 * nScale };
    };
    let L = lay(88);
    for (let s = 200; s >= 88; s -= 2) { const t = lay(s); if (t.lines.length <= 2 && t.end <= 925) { L = t; break; } }
    const { s: size, lines, cap, xh, desc, base, rowTop, noteTop, midTop, head } = L;
    const lg = [['Cap height', base - cap], ['x-height', base - xh], ['Baseline', base], ['Descender', base + desc]];
    const guides = lg.map(([lab, y]) => `<div class="hl" style="left:40px;top:${r1(y)}px;width:1507px"></div><span class="a c-label" style="right:${1587 - 1523}px;top:${r1(y - 18)}px;text-align:right">${lab}</span>`).join('');
    // the line box is `size` tall, so its baseline sits bo px below its top (from the font's own ascent and descent); every guide hangs off that
    const bo = baseline(stem, size, size);
    const spec = lines.map((l, i) => `<div class="a bd" style="left:64px;top:${r1(base + i * size - bo)}px;font-size:${size}px;line-height:${size}px">${A(l)}</div>`).join('');
    const cv = (cap).toFixed(1), xv = (xh).toFixed(1);
    // vertical redlines drawn at x 1406.6 and 1446.6: cap line to baseline, x-line to baseline; the cap value sits above its line so it never crosses the x-height redline
    const rl = `<svg class="a" style="left:0;top:0" width="1587" height="1123" viewBox="0 0 1587 1123" fill="none" stroke="var(--red)" aria-hidden="true">${[[1406.6, base - cap], [1446.6, base - xh]].map(([px, y]) => `<line x1="${px}" y1="${r1(y)}" x2="${px}" y2="${base}" stroke-width="1.5"/>${[y, base].map((yy) => `<line x1="${px - 3.5}" y1="${r1(yy + 3.5)}" x2="${px + 3.5}" y2="${r1(yy - 3.5)}" stroke-width="1.5"/>`).join('')}`).join('')}</svg>
<span class="rv" style="left:1406.6px;top:${r1(base - cap - 20)}px;transform:translateX(-50%)">${cv} px</span><span class="rv" style="left:1458.6px;top:${r1(base - xh / 2 - 6)}px">${xv} px</span>`;
    // weights row: the body family's weights, each in its own weight (only the weights this build loads)
    const NAMES = WEIGHT_NAMES;
    const used = [...new Set([...F.body.weights, ...(F.display.family === F.body.family ? F.display.weights : [])])].sort((a, b) => a - b);
    // the whole family, so the weights the brand leaves out show beside the ones it uses (meta.fonts loads them); at 24 px if the row would pass 1459
    const all = [...new Set([...used, ...unusedWeights(F)])].sort((a, b) => a - b);
    const rowW = (s) => all.reduce((n, w) => n + inkW(bodyStem(ctx, w), NAMES[w], s), 0) + 24 * (all.length - 1);
    const rowSize = all.length > used.length && rowW(28) > 1459 ? 24 : 28;
    const row = all.map((w) => `<span class="bn nw" style="font-weight:${w}${used.includes(w) ? '' : ';color:var(--faint)'}">${NAMES[w] || w}</span>`).join('');
    const fams = [...new Set([F.display.family, F.body.family, (F.mono || {}).family].filter(Boolean))];
    const join = fams.length === 1 ? fams[0] : fams.length === 2 ? fams.join(' and ') : fams.slice(0, -1).join(', ') + ' and ' + fams.at(-1);
    const dispNote = F.display.axes ? ` Display: ${F.display.family} ${heaviest(F.display)} at ${F.display.axes.replace('wdth ', 'width ')}.` : '';
    const col = (x, w, h, role, body) => `<h3 class="a c-head" style="left:${x}px;top:${midTop}px;width:${w}px">${A(h)}</h3><p class="a c-label" style="left:${x}px;top:${midTop + 24}px;width:${w}px">${A(role)}</p>${body}`;
    const hex = ctx.roles.light.action, rgb = ctx.C.hexToRgb(hex).join(' '), ok = ctx.C.oklchString(hex);
    const bt = midTop + 52;
    const monoBody = F.mono ? [hex, `rgb(${rgb})`, ok].map((s, i) => `<p class="a nw" style="left:629.1px;top:${bt + i * 24}px;font:400 16px/24px var(--bmono)">${A(s)}</p>`).join('') : `<p class="a bd" style="left:629.1px;top:${bt}px;font-size:32px;line-height:40px">0123456789</p>`;
    // the scale schedule: one row per token in the brand's type scale, so the sheet shows the sizes as well as the faces
    const SX = [64, 296, 629.1, 850], sched = [['Token', 0], ['Face and weight', 1], ['Size / leading', 2], ['Use', 3]].map(([h, i]) => `<span class="a c-label" style="left:${SX[i]}px;top:${head}px">${h}</span>`).join('')
      + B.type.scale.map((t, i) => {
        const ry = head + 24 + i * 28, lead = t.line < 4 ? Math.round(t.size * t.line) : t.line;
        return `<div class="hl" style="left:64px;top:${ry}px;width:1459px"></div><span class="a c-mono" style="left:64px;top:${ry + 6}px">${A(t.token)}</span><span class="a c-note nw" style="left:296px;top:${ry + 4}px">${A(F[t.face].family)} ${t.weight}</span><span class="a c-mono" style="left:629.1px;top:${ry + 6}px">${t.size} / ${lead}</span><span class="a c-note c-quiet nw" style="left:850px;top:${ry + 4}px">${A(t.use)}</span>`;
      }).join('') + `<div class="hl" style="left:64px;top:${head + 24 + 28 * nScale}px;width:1459px"></div>`;
    const inner = `${guides}${spec}${rl}
<div class="a c-note nw" style="left:64px;top:${rowTop}px;display:flex;gap:24px;font-size:${rowSize}px;line-height:32px">${row}</div>
<p class="a c-note c-quiet" style="left:64px;top:${noteTop}px;width:1100px">Weights in ink are the ones in use: ${used.join(', ').replace(/, (\d+)$/, ' and $1')}. The rest of the family stays out.${A(dispNote)}</p>
${col(64, 517, F.body.family, `Body, ${F.body.weights.join(' ')}`, `<p class="a bn" style="left:64px;top:${bt}px;width:517px;font:400 16px/24px var(--body);color:var(--b-text)">${A(nb(B.type.sample.paragraph))}</p>`)}
${col(629.1, 329, (F.mono || F.display).family, F.mono ? 'Values only' : 'Figures', monoBody)}
${col(1194.3, 329, 'Licence', '', `<p class="a c-note c-quiet" style="left:1194.3px;top:${bt}px;width:329px">${A(join)} ${fams.length > 1 ? 'are' : 'is'} under the SIL Open Font Licence, free in print and on screen. Download ${fams.length > 1 ? (fams.length === 2 ? 'both' : 'all') : 'it'} from Google Fonts.</p>`)}
${sched}`;
    return sheet(ctx, 'typefaces', { drawing: 'Lettering', scale: '[1:1], sizes in px' }, inner);
  },
};

// ---- photographed pages: intro, business-card (applications) and layouts (elevations) ----
const colourIdx = (ctx, hex) => ctx.colours.findIndex((c) => c.hex.toUpperCase() === String(hex).toUpperCase());
const nameOf = (ctx, hex) => (ctx.colours[colourIdx(ctx, hex)] || {}).name || '';
const x2 = (s) => s.replace(/ x /g, ' × ');
// the frame's zone references a box covers, as a drawing cites them: "Zone B1 to C4" (codes in mono, they are literals)
const zone = (x, y) => `${'ABCDEF'[Math.min(5, Math.max(0, Math.floor((y - 40) / (1043 / 6))))]}${Math.min(8, Math.max(1, Math.floor((x - 40) / 188.375) + 1))}`;
const zones = (x, y, w, h) => { const a = zone(x, y), b = zone(x + w, y + h), m = (c) => `<span class="c-mono">${c}</span>`; return a === b ? `Zone ${m(a)}` : `Zones ${m(a)} to ${m(b)}`; };
// a 28 px film square carrying the drawing number, at a photo's corner
const tag = (x, y, n) => `<span class="a c-mono" style="left:${x}px;top:${y}px;width:28px;height:28px;background:var(--film);text-align:center;line-height:28px">${n}</span>`;
// a numbered note: the number hangs in a 24 px column, the text flows beside it
const noteItem = (n, text) => `<div style="display:grid;grid-template-columns:24px 1fr"><span class="c-mono" style="line-height:20px">${n}</span><p class="c-note">${A(nb(text))}</p></div>`;
const flow = (x, y, w, items, gap = 16) => `<div class="a" style="left:${x}px;top:${y}px;width:${w}px;display:flex;flex-direction:column;gap:${gap}px">${items.join('')}</div>`;

// outward normal of quad edge i (corners run TL, TR, BR, BL), pointing away from the centroid
function outward(c, i) {
  const p1 = c[i], p2 = c[(i + 1) % 4], cx = c.reduce((a, p) => a + p[0], 0) / 4, cy = c.reduce((a, p) => a + p[1], 0) / 4;
  let n = [-(p2[1] - p1[1]), p2[0] - p1[0]]; const l = Math.hypot(n[0], n[1]); n = [n[0] / l, n[1] / l];
  if (((p1[0] + p2[0]) / 2 - cx) * n[0] + ((p1[1] + p2[1]) / 2 - cy) * n[1] < 0) n = [-n[0], -n[1]];
  return n;
}
// a dimension along quad edge i, drawn in 2 px with its value on a film tab, as over a photograph
function photoDim(R, c, i, value, over = {}) {
  const n = outward(c, i), place = Math.abs(n[0]) > 0.9 ? (n[0] < 0 ? 'left' : 'side') : 'out';
  R.dim(over.p1 || c[i], over.p2 || c[(i + 1) % 4], n, { d: over.d || 28, w: 2, tab: true, value, place });
}
const SHADE = 2.4; // the door's own gloss and curvature, pushed past the engine's 1 so the printed sign takes the light of the panel
const unitOf = (a, v) => (a.unit === 'px' ? `${v} px` : String(v));

const photos = {
  intro(ctx) {
    const B = ctx.brand, a = arts.hoarding(ctx), R = reds(ctx), sc = hoardingScene(ctx);
    // the photograph runs the width of the drawing area; the caption sits under it and the notes run in three columns beside the caption
    const P = placePhoto(ctx, sc.id, { [sc.surface]: artDoc(ctx, a) }, { x: 40, y: 40, w: 1507, h: 740 }, { alt: sc.alt });
    const c = P.corners(0);
    photoDim(R, c, 0, String(a.mm[0]));
    photoDim(R, c, 3, String(a.mm[1]));
    const label = x2(B.applications.signage.split(':')[0]);
    const cols = [B.description, B.product, B.audience].map((t, i) => `<div class="a" style="left:${r1(629.1 + i * 306)}px;top:836px;width:282px">${noteItem(i + 1, t)}</div>`).join('');
    const inner = `${P.html}${R.svg()}
<p class="a c-note c-quiet" style="left:64px;top:804px;width:517px">${A(label)}, ${sc.where}. Reversed horizontal logo, the line in the display face.</p>
<h3 class="a c-head" style="left:629.1px;top:804px">General notes</h3>${cols}`;
    return sheet(ctx, 'intro', { drawing: 'On site', section: '01 Introduction', scale: '[NTS], sizes in mm' }, inner);
  },

  'business-card'(ctx) {
    const B = ctx.brand, L = ctx.roles.light, R = reds(ctx), vehicle = !!B.applications.vehicle;
    const a1 = vehicle ? arts.doorSign(ctx) : arts.trackScreen(ctx), a2 = arts.letter(ctx);
    const P1 = vehicle
      ? placePhoto(ctx, 'ute-door', { sign: artDoc(ctx, a1) }, { x: 40, y: 40, w: 941.9, h: 931 }, { alt: `${B.name}'s magnetic sign on a ute door`, shade: SHADE })
      : placePhoto(ctx, 'bench-laptop-shoulder', { 'screen-laptop': artDoc(ctx, a1) }, { x: 40, y: 40, w: 941.9, h: 931 }, { alt: `${B.name}'s tracking screen on a laptop` });
    // a courier brand keeps the library's clipboard (no bench stands for it); anyone else's letter lies on the stationery scene with its envelope,
    // whose letterhead surface is A4 exactly, so nothing sits under a jaw
    const cr = isCourier(ctx), box2 = { x: 981.9, y: 40, w: 565.1, h: 615 };
    let P2;
    if (cr) P2 = placePhoto(ctx, 'clipboard', { sheet: artDoc(ctx, a2, { top: CLIP, h: a2.h - CLIP }) }, box2, { alt: `${B.name}'s letter on a clipboard` });
    else {
      const ss = ctx.sceneInfo('bench-letterhead-reno');
      // scale 0.8: the letter fills about 270 px of the print, and the envelope beside it runs off the right edge
      P2 = placePhoto(ctx, 'bench-letterhead-reno', letterArts(ctx, ss.quads[1].aspect), box2, { alt: `${B.name}'s letterhead and envelope on a stone bench`, scale: 0.8, focus: [640, 500] });
    }
    const c1 = P1.corners(0), c2 = P2.corners(0);
    // the ute's width runs under the sign: along the top its left tick lands on the door handle
    photoDim(R, c1, vehicle ? 2 : 0, unitOf(a1, a1.mm[0]));
    photoDim(R, c1, 1, unitOf(a1, a1.mm[1]));
    // the sheet's top 18 mm sit under the clip, so its left edge is drawn up past the quad to the sheet's true top
    const up = cr ? CLIP / (a2.h - CLIP) : 0, top = [c2[0][0] + (c2[0][0] - c2[3][0]) * up, c2[0][1] + (c2[0][1] - c2[3][1]) * up];
    photoDim(R, c2, 2, String(a2.mm[0]), { d: 20 });
    photoDim(R, c2, 3, String(a2.mm[1]), { p1: c2[3], p2: top });
    const X = 1005.9;
    const t1 = vehicle ? `Magnetic door sign, ${a1.mm[0]} × ${a1.mm[1]} mm. Horizontal logo on ${nameOf(ctx, L.raised)}.` : `Track screen, ${a1.mm[0]} × ${a1.mm[1]} px. Horizontal logo, the status in ${nameOf(ctx, L.action)}.`;
    const t2 = `Letter, A4, ${a2.mm[0]} × ${a2.mm[1]} mm. Horizontal logo, the price set once.`;
    // the brand's three rules close the column, under a hairline: the notes above describe the pieces, these say how to use them
    const rules = B.guideB.rules.map((r, i) => `<p class="c-note c-quiet"${i === 0 ? ' style="border-top:1px solid var(--hair);padding-top:12px;margin-top:12px"' : ''}><span style="color:var(--ink);font-weight:500">${A(r.title)}.</span> ${A(piece(nbt(r.text)))}</p>`);
    const inner = `${P1.html}${P2.html}${R.svg()}${tag(40, 40, 1)}${tag(981.9, 40, 2)}
${flow(X, 679, 517, [noteItem(1, t1), noteItem(2, t2), ...rules], 12)}`;
    return sheet(ctx, 'business-card', { drawing: 'Applications on site', section: '08 Applications', scale: '[NTS], sizes as noted' }, inner);
  },

  layouts(ctx) {
    const B = ctx.brand, vehicle = !!B.applications.vehicle, R = reds(ctx);
    // a brand with a vehicle has the foot of the sheet free, so the group sits 24 px lower and the finishes run as a legend strip along the foot; a brand with a screen needs the full height and keeps its key in a column
    const Y0 = vehicle ? 176 : 152;
    const E = [
      { tag: 'E1', a: arts.hoarding(ctx), n: 20, x: 128, y: Y0, name: B.applications.signage.split(',')[0] },
      { tag: 'E2', a: vehicle ? arts.doorSign(ctx) : arts.trackScreen(ctx), n: vehicle ? 5 : 2, x: 128, y: Y0 + (vehicle ? 328 : 300), name: vehicle ? B.applications.vehicle.split(' on ')[0] : 'Track screen' },
      { tag: 'E3', a: arts.letter(ctx), n: 2, x: 1029.9, y: Y0, name: 'Letter, A4' },
    ];
    let inner = '';
    for (const e of E) {
      const px = e.a.unit === 'px', dw = px ? e.a.mm[0] / e.n : (e.a.mm[0] / e.n) * PX, dh = px ? e.a.mm[1] / e.n : (e.a.mm[1] / e.n) * PX, k = dw / e.a.w;
      e.dw = dw; e.dh = dh;
      inner += `<div class="a" style="left:${e.x}px;top:${e.y}px;width:${e.a.w}px;height:${e.a.h}px;transform:scale(${k});transform-origin:0 0;overflow:hidden">${e.a.inner}</div><div class="a" style="left:${e.x}px;top:${e.y}px;width:${r1(dw)}px;height:${r1(dh)}px;box-shadow:0 0 0 .5px var(--ink)"></div>`;
      R.dim([e.x, e.y], [e.x + dw, e.y], [0, -1], { d: 24, value: unitOf(e.a, e.a.mm[0]) });
      R.dim([e.x, e.y], [e.x, e.y + dh], [-1, 0], { d: 24, value: unitOf(e.a, e.a.mm[1]), place: 'left' });
      // grid ticks under the elevation: the art's own columns
      const gy = e.y + dh + 10, g = e.a.grid, cw = (e.a.w - 2 * g.margin) / g.cols;
      let tk = `<path d="M${e.x} ${crisp(gy)}H${r1(e.x + dw)}" stroke="var(--ink)" stroke-width="1"/>`;
      for (let i = 0; i <= g.cols; i++) tk += `<path d="M${crisp(e.x + (g.margin + i * cw) * k)} ${crisp(gy)}v6" stroke="var(--ink)" stroke-width="1"/>`;
      inner += `<svg class="a" style="left:0;top:0" width="1587" height="1123" viewBox="0 0 1587 1123" fill="none" aria-hidden="true">${tk}</svg>
<span class="a c-note c-quiet nw" style="right:${1587 - (e.x + dw)}px;top:${r1(gy + 12)}px">${mixed(g.label)}</span>
<p class="a c-note nw" style="left:${e.x}px;top:${r1(gy + 12)}px"><span class="c-mono">${e.tag}</span>  ${A(e.name)}, ${A(px ? `${e.a.mm[0]} × ${e.a.mm[1]} px` : x2(`${e.a.mm[0]} x ${e.a.mm[1]} mm`))}, 1:${e.n}</p>
<p class="a c-label nw" style="left:${e.x}px;top:${r1(gy + 32)}px">${zones(e.x, e.y, dw, dh)}</p>`;
      // finish keys: a circle 32 px outside the right edge on a leader that ends in a dot 12 px clear of what it points at; keys stack 28 px apart.
      // On a dark ground the leader runs in film colour until it leaves the art, then in ink.
      const dark = ctx.C.toOklch(e.a.ground).L < 0.4, ic = dark ? 'var(--film)' : 'var(--ink)';
      let prev = -99;
      const keys = e.a.keys.map((kk) => ({ i: colourIdx(ctx, kk.hex), x: e.x + kk.x * k + (kk.after ? 12 : 0), y: e.y + kk.y * k })).filter((kk) => kk.i >= 0).sort((p, q) => p.y - q.y);
      let ks = "", kl = "";
      for (const kk of keys) {
        const cy = Math.max(kk.y, prev + 28), rx = e.x + dw; prev = cy;
        ks += `<path d="M${r1(kk.x)} ${r1(kk.y)}H${r1(rx)}" stroke="${ic}" stroke-width="1"/><path d="M${r1(rx)} ${r1(kk.y)}H${r1(rx + 10)}L${r1(rx + 32)} ${r1(cy)}" stroke="var(--ink)" stroke-width="1"/><circle cx="${r1(kk.x)}" cy="${r1(kk.y)}" r="1.75" fill="${ic}"/><circle cx="${r1(rx + 43)}" cy="${r1(cy)}" r="11" fill="var(--film)" stroke="var(--ink)" stroke-width="1"/>`;
        kl += `<span class="a c-mono" style="left:${r1(rx + 32)}px;top:${r1(cy - 8)}px;width:22px;text-align:center;font-size:12px">C${kk.i + 1}</span>`;
      }
      inner += `<svg class="a" style="left:0;top:0" width="1587" height="1123" viewBox="0 0 1587 1123" fill="none" aria-hidden="true">${ks}</svg>${kl}`;
    }
    const rows = ctx.colours.map((c, i) => `<span class="sw" style="left:850px;top:${188 + i * 24 + 4}px;width:16px;height:16px;background:${c.hex}"></span><span class="a c-mono" style="left:874px;top:${188 + i * 24 + 2}px">C${i + 1}</span><span class="a c-note nw" style="left:904px;top:${188 + i * 24}px">${A(c.name)}</span>`).join('');
    // with the foot free the key is a legend strip along it, under a hairline, nowhere near an elevation's callouts
    const LY = 888, step = Math.min(260, Math.floor(1227 / ctx.colours.length));
    const legend = `<div class="hl" style="left:64px;top:${LY}px;width:1459px"></div><h3 class="a c-head" style="left:64px;top:${LY + 14}px">Finishes</h3>` + ctx.colours.map((c, i) => `<span class="sw" style="left:${296 + i * step}px;top:${LY + 20}px;width:16px;height:16px;background:${c.hex}"></span><span class="a c-mono" style="left:${320 + i * step}px;top:${LY + 18}px">C${i + 1}</span><span class="a c-note nw" style="left:${350 + i * step}px;top:${LY + 16}px">${A(c.name)}</span>`).join('');
    inner += vehicle ? legend : `<h3 class="a c-head" style="left:850px;top:152px">Finishes</h3>${rows}`;
    return sheet(ctx, 'layouts', { drawing: 'Elevations', section: '07 Layout', scale: [...new Set(E.map((e) => e.n))].map((n) => `[1:${n}]`).join(', ') }, `${inner}${R.svg()}`);
  },
};

export const guidelines = { ...own, ...photos };
