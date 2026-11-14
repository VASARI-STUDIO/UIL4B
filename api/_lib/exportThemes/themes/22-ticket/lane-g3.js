// Theme 22, Ticket: lane g3, the colour and type pages that round 1 left out (proportion, contrast, colour-values, hierarchy, type-in-use, type-rules).
// palette and typefaces are round 1's and are not touched here. Every page keeps the one roll ticket on the bar top (helpers.js): the perforation,
// notches and stub never move. Only what is printed on the body changes job, and each job comes from the ticket's own world:
//   proportion    a sheet of a hundred tickets, perforated both ways, one ticket for each per cent of a page
//   contrast      the ticket's own ink measured at poster size, the other pairs as the fine print beside it
//   colour-values each colour as a roll of ten tint tickets, its own step marked under the roll
//   hierarchy     the type scale at true size on a stock ticket, each step's numbers on its baseline
//   type-in-use   a headline, a paragraph and a caption set as the brand sets them
//   type-rules    two joined tickets: do on the field, don't on the dark half
import { A, px, T, PAGE, page, stub, roles, fitLines, textWidth, lineTop, trackOf, sentences } from './helpers.js';

const r2 = (n) => Math.round(n * 100) / 100;
const same = (a, b) => String(a).toLowerCase() === String(b).toLowerCase();
// an absolutely placed element inside the page's content layer
const el = (x, y, cls, html, style = '', w = null) => `<div class="a ${cls}" style="left:${px(x)};top:${px(y)};${w ? `width:${px(w)};` : ''}${style}">${html}</div>`;
// a literal value inside a sentence: only the value is mono
const v = (s) => `<span class="g3-v">${A(String(s))}</span>`;
const ratioOf = (t) => `${String(t).replace(/\s*:\s*1$/, '')} : 1`;
// a swatch's edge is lost on the field only when it is near the field in lightness and in hue: the contrast rule alone rings a mid grey on
// an orange field, which reads plainly. OKLab distance under 0.1 and a ratio under 1.3.
const lab = (ctx, hex) => { const { L, C, H } = ctx.C.toOklch(hex), r = H * Math.PI / 180; return [L, C * Math.cos(r), C * Math.sin(r)]; };
const nearField = (ctx, hex, field) => { const a = lab(ctx, hex), b = lab(ctx, field); return ctx.ratio(hex, field) < 1.3 && Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) < 0.1; };
// a colour or tone's name, by id or by hex
const nameById = (ctx, id) => (ctx.colours.find((c) => c.id === id) || ctx.tones.find((t) => t.id === id) || { name: id }).name;
const nameByHex = (ctx, hex) => ([...ctx.colours, ...ctx.tones].find((c) => same(c.hex, hex)) || { name: hex.toUpperCase() }).name;
// "Muted on Stock" on Stock reads once, not twice
// a colour already named for another ground ("Quiet on White") set on a third reads "Quiet on White, on Concrete", not "on ... on"
const pairName = (fg, bg) => (fg.toLowerCase().endsWith(` on ${bg.toLowerCase()}`) ? fg : / on /i.test(fg) ? `${fg}, on ${bg}` : `${fg} on ${bg}`);
// a body-face run's width at a weight: textWidth measures the regular face, and the heavier weights run a little wider
const bodyW = (ctx, text, size, weight = 400) => textWidth(ctx, 'body', text, size) * (weight >= 600 ? 1.07 : weight >= 500 ? 1.035 : 1);
// greedy wrap in the regular body face, so the lines laid out are the lines that render
function wrapBody(ctx, text, size, w, weight = 400) {
  const lines = []; let cur = '';
  for (const word of text.split(/\s+/)) { const t = cur ? `${cur} ${word}` : word; if (cur && bodyW(ctx, t, size, weight) > w * 0.97) { lines.push(cur); cur = word; } else cur = t; }
  if (cur) lines.push(cur);
  return lines;
}
// baseline of a line box's first line, from its top (the browser centres the face's ascent and descent in the line)
const baseOf = (ctx, role, size, line) => -lineTop(ctx, role, size, line, 0);
// the perforation: holes of 4 px at a pitch near 10 px between two points, as SVG circles
function holes(x0, y0, x1, y1, pitch = 10) {
  const len = Math.hypot(x1 - x0, y1 - y0), n = Math.round(len / pitch) + 1, out = [];
  for (let i = 0; i < n; i++) out.push([x0 + (x1 - x0) * i / (n - 1), y0 + (y1 - y0) * i / (n - 1)]);
  return out;
}
const circ = (pts, r = 2) => pts.map(([x, y]) => `<circle cx="${r2(x)}" cy="${r2(y)}" r="${r}"/>`).join('');
// largest remainder: whole counts that add up to `total`, in the order given
function counts(shares, total) {
  const sum = shares.reduce((s, k) => s + k, 0), raw = shares.map((s) => s / sum * total), n = raw.map(Math.floor);
  let left = total - n.reduce((s, k) => s + k, 0);
  raw.map((r, i) => [r - Math.floor(r), i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]).forEach(([, i]) => { if (left > 0) { n[i]++; left--; } });
  return n;
}
// the tokens of the brand's scale, by name
const tok = (ctx, name) => ctx.brand.type.scale.find((t) => t.token === name);
// the first candidate that fits the width at the size; else the shortest
function pick(ctx, cands, fits) {
  const list = cands.filter(Boolean).map((s) => s.trim()).filter((s, i, a) => s && a.indexOf(s) === i);
  return list.find(fits) || [...list].sort((a, b) => a.length - b.length)[0];
}

export function css(ctx) {
  const m = ctx.brand.fonts.mono;
  return `.pg .g3-v{font-family:var(--mono);font-weight:${m.weights[0]};font-size:0.92em;font-variant-numeric:tabular-nums}
.pg .g3-chip{position:absolute;box-sizing:border-box;display:flex;align-items:center;justify-content:center;font-family:var(--body);font-weight:600;white-space:nowrap}
.pg .g3-sv{position:absolute;left:0;top:0;z-index:1;pointer-events:none}
.pg .g3-num{font-variant-numeric:tabular-nums}
.pg .g3-row{position:absolute;display:flex;align-items:baseline;gap:8px;white-space:nowrap}`;
}

export const guidelines = {
  // ---- 015: a sheet of a hundred tickets, perforated both ways. Each ticket is one per cent of a page, filled from the top left,
  // largest share first, so the sheet is the brand's page counted out. The stub and the main perforation are the same as every page. ----
  proportion: (ctx) => {
    const R = roles(ctx);
    const cols = ctx.colours.map((c, i) => ({ ...c, i })).sort((a, b) => b.share - a.share || a.i - b.i);
    const n = counts(cols.map((c) => c.share), 100);
    const NX = 10, NY = 10, cw = T.bodyW / NX, chh = T.h / NY;
    const cell = []; cols.forEach((c, k) => { for (let j = 0; j < n[k]; j++) cell.push(k); });
    const at = (col, row) => (col < 0 || row < 0 || col >= NX || row >= NY ? -1 : cell[row * NX + col]);
    const near = (k) => k >= 0 && R.nearTable(cols[k].hex);
    // plates: each row's runs as one rectangle, so no seam shows inside a run
    let plates = '';
    for (let row = 0; row < NY; row++) {
      let c0 = 0;
      for (let col = 1; col <= NX; col++) if (col === NX || at(col, row) !== at(c0, row)) {
        plates += `<div class="pl" style="left:${px(T.x + c0 * cw)};top:${px(T.y + row * chh)};width:${px((col - c0) * cw)};height:${px(chh)};background:${cols[at(c0, row)].hex}"></div>`;
        c0 = col;
      }
    }
    plates += `<div class="pl" style="left:${T.stubX}px;top:${T.y}px;width:${T.stubW}px;height:${T.h}px;background:${R.field}"></div>`;
    // each run is labelled on its first ticket: the share in the display face, and the name beside it when the run has room on that row
    const tr = trackOf(ctx), sz = 26;
    let body = ''; const keep = [];
    cols.forEach((c, k) => {
      const first = cell.indexOf(k); if (first < 0) return;
      const col = first % NX, row = Math.floor(first / NX);
      let run = 0; while (col + run < NX && at(col + run, row) === k) run++;
      const ink = R.inkOn(c.hex, 13, 600, '(Proportion sheet label)');
      const pc = `${Math.round(c.share * 100)}%`, room = run * cw - 20;
      const pw = textWidth(ctx, 'display', pc, sz, tr), withName = pw + 8 + bodyW(ctx, c.name, 13, 600) <= room * 0.96;
      // the label's box (with a 6 px margin): no perforation hole may sit inside it
      keep.push([T.x + col * cw + 4, T.y + row * chh + 4, T.x + col * cw + 10 + pw + (withName ? 8 + bodyW(ctx, c.name, 13, 600) : 0) + 6, T.y + row * chh + 10 + sz + 6]);
      body += `<div class="g3-row" style="left:${px(T.x + col * cw + 10)};top:${px(T.y + row * chh + 10)};color:${ink}"><span class="disp" style="font-size:${sz}px;line-height:${sz}px;letter-spacing:${tr}em">${pc}</span>${withName ? `<span class="c13 b">${A(c.name)}</span>` : ''}</div>`;
    });
    // the sheet's perforations: the same holes as the main one, 12 px in from the ticket's edges; a hole between two tickets of the bar top's
    // own colour is ringed in the edge colour, or it could not be seen
    let cut = '', ringed = '';
    const put = (pts, side) => pts.forEach(([x, y]) => {
      if (keep.some(([l, t, r, b]) => x >= l - T.holeR && x <= r + T.holeR && y >= t - T.holeR && y <= b + T.holeR)) return;
      const a = side === 'v' ? [Math.floor((x - T.x - 3) / cw), Math.floor((y - T.y) / chh)] : [Math.floor((x - T.x) / cw), Math.floor((y - T.y - 3) / chh)];
      const b = side === 'v' ? [Math.floor((x - T.x + 3) / cw), a[1]] : [a[0], Math.floor((y - T.y + 3) / chh)];
      const c = `<circle cx="${r2(x)}" cy="${r2(y)}" r="${T.holeR}"/>`;
      if (near(at(...a)) && near(at(...b))) ringed += c; else cut += c;
    });
    for (let i = 1; i < NX; i++) put(holes(T.x + i * cw, T.y + 12, T.x + i * cw, T.y + T.h - 12), 'v');
    for (let j = 1; j < NY; j++) put(holes(T.x + 12, T.y + j * chh, T.perf - 12, T.y + j * chh), 'h');
    const main = holes(T.perf, T.y + T.notchR + 12, T.perf, T.y + T.h - T.notchR - 12, 412 / 41);
    // the edge rule: a ticket of nearly the bar top's colour on the sheet's outside gets a 1 px edge, so the outline holds
    let edges = '';
    for (let col = 0; col < NX; col++) {
      if (near(at(col, 0))) edges += `<rect x="${r2(T.x + col * cw)}" y="${T.y}" width="${r2(cw)}" height="1"/>`;
      if (near(at(col, NY - 1))) edges += `<rect x="${r2(T.x + col * cw)}" y="${T.y + T.h - 1}" width="${r2(cw)}" height="1"/>`;
    }
    for (let row = 0; row < NY; row++) if (near(at(0, row))) edges += `<rect x="${T.x}" y="${r2(T.y + row * chh)}" width="1" height="${r2(chh)}"/>`;
    const svg = `<svg class="tk" viewBox="0 0 ${PAGE.w} ${PAGE.h}" width="${PAGE.w}" height="${PAGE.h}" aria-hidden="true"><g fill="${R.hole}"><circle cx="${T.perf}" cy="${T.y}" r="${T.notchR}"/><circle cx="${T.perf}" cy="${T.y + T.h}" r="${T.notchR}"/>${circ(main)}${cut}</g><g fill="${R.hole}" stroke="${R.edge}" stroke-width="1">${ringed}</g><g fill="${R.edge}">${edges}</g></svg>`;
    // the bar top: how to read the sheet, then every colour's count in reading order
    const list = cols.map((c, k) => `${A(c.name)} ${n[k]}`).join(', ');
    const zone = el(72, 532, 'c15 b paper', 'A sheet of 100 tickets, read from the top left.', '', 560)
      + el(72, 554, 'c15 qt', `One ticket is one per cent of a page. ${list}.`, '', 560)
      + el(T.inX, 532, 'c13 qt', 'Counts are the brand&rsquo;s shares rounded to whole tickets.', '', T.inW);
    return `<section class="pg" data-page="proportion" style="--ink:${R.fieldInk};--field:${R.field}"><div class="plates">${plates}</div>${svg}<div class="ct">${body}${stub(ctx, R, 'proportion')}${zone}</div></section>`;
  },

  // ---- 016: the ticket's own pair, ink on the field, measured and printed at poster size; the other pairs in use beside it, each with a
  // sample in its own colours. The pairs that fail sit on the bar top, each as a swatch of its two colours, so no failing text is ever set. ----
  contrast: (ctx) => {
    const R = roles(ctx), tr = trackOf(ctx);
    const own = ctx.pairs.find((p) => same(p.bgHex, R.field) && same(p.fgHex, R.fieldInk));
    const ownText = ratioOf(own ? own.ratioText : ctx.fmt(ctx.ratio(R.fieldInk, R.field)));
    // the ratio on one line, as large as fits between x 72 and the "In use" list (x 528, less a 32 px gap). Measured whole with textWidth:
    // fitLines splits at sentence ends and reads "10.4 : 1" as the sentence "4 : 1". Proportional figures here, so the run measured (the
    // .ttf's default figures) is the run drawn; .disp's tabular figures draw about 9% wider.
    const room = 528 - 32 - 72;
    let size = 220; while (size > 64 && textWidth(ctx, 'display', ownText, size, tr) > room) size -= 2;
    const lh = r2(size * 0.92);
    let body = `<div class="a disp" style="left:72px;top:${px(68)};font-size:${size}px;line-height:${lh}px;letter-spacing:${tr}em;color:${R.fieldInk};white-space:nowrap;font-variant-numeric:proportional-nums">${A(ownText)}</div>`;
    const y2 = 68 + lh + 20;
    body += el(72, y2, 'c24 ink', A(pairName(nameByHex(ctx, R.fieldInk), nameByHex(ctx, R.field))), 'font-weight:600', 420)
      + el(72, y2 + 36, 'c15 ink', A(own ? own.use : 'The ink on the ticket'), '', 420);
    body += `<div class="a c13 ink" style="left:72px;bottom:${PAGE.h - 460}px;width:424px">Text needs ${v('4.5 : 1')}, and type ${v('24 px')} and over needs ${v('3 : 1')}.<br>A pair under its mark is not used for text.</div>`;
    // the other pairs in use, highest ratio first: a sample in the pair's own colours, the ratio, the names
    const used = ctx.pairs.filter((p) => p !== own).sort((a, b) => b.ratio - a.ratio);
    const rowH = Math.min(36, Math.floor((460 - 98) / Math.max(used.length, 1)));
    body += el(528, 72, 'c13 b ink', 'In use', '', 408);
    used.forEach((p, i) => {
      const y = 98 + i * rowH, ring = nearField(ctx, p.bgHex, R.field) ? `outline:1px solid ${R.fieldInk};outline-offset:-1px;` : '';
      const label = pairName(nameById(ctx, p.fg), nameById(ctx, p.bg)) + (p.large ? ', 24 px and over' : '');
      body += `<div class="g3-chip" style="left:528px;top:${y}px;width:48px;height:28px;background:${p.bgHex};color:${p.fgHex};font-size:24px;line-height:28px;${ring}">Aa</div>`
        + el(588, y + 5, 'c13 b ink g3-num nw', A(ratioOf(p.ratioText)), '', 72)
        + el(668, y + 5, 'c13 ink nw', A(label), '', 268);
    });
    // the bar top: what "not used" means, then each failing pair as a swatch with its names and ratio. The swatch is the engine's mark for a
    // pair not used (theme 01's): the ground with a block of the ink on it, and no letterforms, so nothing on the page reads as failing text.
    const un = ctx.unusedPairs, slots = [[368, 272], [664, 272], [T.inX, T.inW]];
    const rows = Math.max(1, Math.ceil(un.length / slots.length)), pitch = Math.min(52, Math.floor(156 / rows));
    let zone = el(72, 532, 'c15 b paper', 'Not used', '', 272) + el(72, 554, 'c15 qt', 'These pairs fall under their mark, so they are never set as text.', '', 272);
    let svg = '';
    un.forEach((p, i) => {
      const [x, w] = slots[Math.floor(i / rows)], y = 532 + (i % rows) * pitch;
      const ring = R.nearTable(p.bgHex) ? ` stroke="${R.edge}" stroke-width="1"` : '';
      svg += `<g transform="translate(${x} ${y})"><rect x="0.5" y="0.5" width="39" height="27" fill="${p.bgHex}"${ring}/><rect x="12" y="6" width="16" height="16" fill="${p.fgHex}"/></g>`;
      zone += el(x + 52, y - 2, 'c13 b paper', A(pairName(nameById(ctx, p.fg), nameById(ctx, p.bg))), '', w - 52)
        + `<div class="a c12 qt g3-num" style="left:${x + 52}px;top:${y + (ctx.edition === "slot" ? 34 : 16)}px;width:${w - 52}px">${A(ratioOf(p.ratioText))}</div>`;
    });
    // the unused samples move with each pair's text block when a name wraps: they stay at the top of the block, which is where the eye starts
    zone += `<svg class="g3-sv" viewBox="0 0 ${PAGE.w} ${PAGE.h}" width="${PAGE.w}" height="${PAGE.h}" aria-hidden="true">${svg}</svg>`;
    return page(ctx, R, 'contrast', { body, zone });
  },

  // ---- 017: each colour as a roll of ten tint tickets, light to dark, joined by perforations; its values printed beside the roll and
  // a bar under the step that is the colour itself. Tones and the print note sit on the bar top. ----
  'colour-values': (ctx) => {
    const R = roles(ctx), cs = ctx.colours, steps = Object.keys(cs[0].ramp).map(Number).sort((a, b) => a - b);
    const x0 = 296, cw = Math.floor(640 / steps.length), top = 96, gap = 12;
    const rh = Math.min(96, Math.floor((460 - top - gap * (cs.length - 1)) / cs.length));
    // the step numbers, once, over the rolls
    let body = steps.map((s, i) => el(x0 + i * cw + 8, 72, 'c12 ink g3-num', String(s))).join('');
    let svg = '';
    cs.forEach((c, k) => {
      const y = top + k * (rh + gap);
      const rgb = c.rgb.match(/\d+/g).join(', '), ok = c.oklch.replace(/^oklch\(|\)$/g, '');
      body += el(72, y - 2, 'c15 b ink nw', A(c.name), '', 208)
        + el(72, y + 22, 'c12 ink nw', `Hex ${v(c.hex.toUpperCase())}`, '', 208)
        + el(72, y + 38, 'c12 ink nw', `RGB ${v(rgb)}`, '', 208)
        + el(72, y + 54, 'c12 ink nw', `OKLCH ${v(ok)}`, '', 208)
        + (ctx.C.cmykParts(c) ? el(72, y + 70, 'c12 ink nw', `CMYK ${v(ctx.C.cmykParts(c).join(', '))}`, '', 208) : '');
      // the ground colour has no tints: its own step only
      const only = c.rampBase === steps[0] && same(c.hex, R.paper);
      const shown = only ? [steps[0]] : steps;
      shown.forEach((s) => {
        const i = steps.indexOf(s), hex = c.ramp[s], ring = nearField(ctx, hex, R.field) ? `outline:1px solid ${R.fieldInk};outline-offset:-1px;` : '';
        body += `<div class="a" style="left:${x0 + i * cw}px;top:${y}px;width:${cw}px;height:${rh}px;background:${hex};${ring}"></div>`;
      });
      if (only) body += el(x0 + cw + 16, y + rh / 2 - 9, 'c13 ink nw', 'The ground. No tints.');
      else for (let i = 1; i < steps.length; i++) svg += circ(holes(x0 + i * cw, y + 6, x0 + i * cw, y + rh - 6, 8), 1.5);
      const bi = steps.indexOf(c.rampBase);
      if (bi >= 0) body += `<div class="a" style="left:${x0 + bi * cw}px;top:${y + rh + 4}px;width:${cw}px;height:3px;background:${R.fieldInk}"></div>`;
    });
    body += `<svg class="g3-sv" viewBox="0 0 ${PAGE.w} ${PAGE.h}" width="${PAGE.w}" height="${PAGE.h}" aria-hidden="true"><g fill="${R.hole}">${svg}</g></svg>`;
    // the bar top: the tones (each with a small key, ringed when it is nearly the bar top), how to read the rolls, and the print note
    const tn = ctx.tones.slice(0, 8), per = 4;
    let zone = tn.map((t, i) => {
      const x = 72 + (i % per) * 216, y = 532 + Math.floor(i / per) * 60, ring = R.nearTable(t.hex) ? `outline:1px solid ${R.edge};outline-offset:-1px;` : '';
      return `<div class="a" style="left:${x}px;top:${y + 3}px;width:12px;height:12px;background:${t.hex};${ring}"></div>`
        + el(x + 20, y, 'c13 b paper nw', A(t.name), '', 172) + el(x + 20, y + 18, 'c12 qt', `${v(t.hex.toUpperCase())} ${A(t.role)}`, '', 172);
    }).join('');
    const action = cs.find((c) => c.role === 'action') || cs[0];
    zone += el(72, 532 + Math.ceil(tn.length / per) * 60 + 4, 'c13 qt', `Each roll runs from ${v(steps[0])} to ${v(steps[steps.length - 1])}. The bar under a step marks the colour itself. Every step is in the palette files in the brand kit.`, '', 560)
      + el(T.inX, 532, 'c13 qt', `Values are for screens. Print can shift a colour, so ask your printer for a proof before a run, and match ${A(action.name)} to the proof.`, '', T.inW);
    return page(ctx, R, 'colour-values', { body, zone });
  },

  // ---- 019: the scale at true size on a stock ticket, largest first, each step's size, line and weight set on its baseline ----
  hierarchy: (ctx) => {
    const R = roles(ctx).onPaper(), B = ctx.brand, S = B.type.scale, c = B.ui.screen.content, tr = trackOf(ctx);
    const sw = 576, sx = 72, specX = 680, specW = 256;
    const prim = sentences(B.lines.primary), head = sentences(B.type.sample.headline);
    // the sample for each step: real lines from the brand, the first that fits the column at the step's true size
    const cands = {
      display: [(c.eta.match(/\d{1,2}:\d{2}/) || [])[0], c.time, ...prim],
      headline: [...prim, ...head, ...B.lines.others],
      title: [B.lines.others[0], ...B.lines.others, ...prim],
      body: [...sentences(B.type.sample.paragraph), c.pickup],
      label: [c.form && c.form.book, c.call, c.share],
      caption: [B.type.sample.caption, c.deliverTo],
    };
    const widthOf = (t, s) => (t.face === 'display' ? textWidth(ctx, 'display', s, t.size, tr) : bodyW(ctx, s, t.size, t.weight));
    const rows = S.map((t) => {
      const text = pick(ctx, cands[t.token] || [t.use], (s) => widthOf(t, s) <= sw * 0.97);
      const line = r2(t.size * t.line), base = baseOf(ctx, t.face === 'display' ? 'display' : 'body', t.size, line);
      // the row is as tall as the sample, or the two spec lines when the sample is smaller
      const specBase = baseOf(ctx, 'body', 13, 18);
      return { t, text, line, base, h: Math.max(line, base - specBase + 34) };
    });
    const total = rows.reduce((s, r) => s + r.h, 0), gap = Math.max(4, Math.min(24, (388 - total) / Math.max(rows.length - 1, 1)));
    let y = 72, body = '';
    const fam = (t) => B.fonts[t.face === 'display' ? 'display' : 'body'].family;
    for (const r of rows) {
      const { t } = r, disp = t.face === 'display';
      const style = disp ? `font-size:${t.size}px;line-height:${r.line}px;letter-spacing:${tr}em;color:${R.fieldInk}` : `font:${t.weight} ${t.size}px/${r.line}px var(--body);color:${R.fieldInk}`;
      body += `<div class="a ${disp ? "disp " : ""}nw${ctx.edition === "slot" ? " ph-tight" : ""}" style="left:${sx}px;top:${px(y)};${style}">${A(r.text)}</div>`;
      // the spec's first baseline sits on the sample's baseline
      const sy = y + r.base - baseOf(ctx, 'body', 13, 18);
      body += el(specX, sy, 'c13 ink nw', `<span style="font-weight:600">${A(ctx.cap(t.token))}</span>&ensp;${v(`${t.size} / ${t.line}`)}&ensp;${A(fam(t))} ${v(t.weight)}`, '', specW)
        + el(specX, sy + 18, 'c12 ink nw', A(t.use), '', specW);
      y += r.h + gap;
    }
    const bd = tok(ctx, 'body'), cp = tok(ctx, 'caption');
    const zone = el(72, 532, 'c15 b paper', `${S.length} steps, each with one job.`, '', 560)
      + el(72, 554, 'c15 qt', `Size over line height, then the weight. Reading text is ${bd ? v(`${bd.size} px`) : ''} and captions are ${cp ? v(`${cp.size} px`) : ''}; nothing is set smaller.`, '', 560);
    return page(ctx, R, 'hierarchy', { body, zone });
  },

  // ---- 020: a real piece, set the way the brand sets it: the headline at its true size, a paragraph at reading size, a caption under a rule ----
  'type-in-use': (ctx) => {
    const R = roles(ctx), B = ctx.brand, S = B.type.sample, tr = trackOf(ctx);
    const h = tok(ctx, 'headline'), bd = tok(ctx, 'body'), cp = tok(ctx, 'caption');
    // the headline at the brand's own headline size (never fitted): sentences first, then words, in a 420 px column
    const slot = ctx.edition === 'slot', hsz = slot ? Math.min(h.size, 40) : h.size;   // slot: the placeholder box is capped so it fits the column
    const hl = fitLines(ctx, S.headline, { w: 420, max: hsz, min: hsz, maxLines: 9 });
    const hlh = r2(hsz * h.line);
    let body = `<div class="a disp" style="left:72px;top:72px;width:420px;font-size:${hsz}px;line-height:${hlh}px;letter-spacing:${tr}em;color:${R.fieldInk}">${hl.lines.map((l) => `<span class="ln">${A(l)}</span>`).join('')}</div>`;
    // the paragraph at reading size in a measured column; the lines are laid out here, so the measure printed below is the one that renders
    const pw = 400, blh = r2(bd.size * bd.line), plines = wrapBody(ctx, S.paragraph, bd.size, pw, bd.weight);
    const chars = Math.round(plines.reduce((s, l) => s + l.length, 0) / plines.length);
    const ptop = 72 + r2(baseOf(ctx, 'display', hsz, hlh) - baseOf(ctx, 'body', bd.size, blh));
    body += `<div class="a" style="left:536px;top:${px(ptop)};width:${pw}px;font:${bd.weight} ${bd.size}px/${blh}px var(--body);color:${R.fieldInk}">${plines.map((l) => `<span class="ln">${A(l)}</span>`).join('')}</div>`;
    // the caption on its own line at the foot, under a hairline in the ink
    const clh = r2(cp.size * cp.line);
    body += `<div class="a" style="left:536px;top:${px(460 - clh - 12)};width:${pw}px;height:1px;background:${R.fieldInk}"></div>`
      + `<div class="a nw${slot ? ' ph-tight' : ''}" style="left:536px;top:${px(460 - clh)};font:${cp.weight} ${cp.size}px/${clh}px var(--body);color:${R.fieldInk}">${A(S.caption)}</div>`;
    const spec = (t) => `${A(B.fonts[t.face === 'display' ? 'display' : 'body'].family)} ${v(t.weight)}, ${v(`${t.size} px`)}, line ${v(t.line)}`;
    const zone = el(72, 532, 'c15 b paper', 'Headline', '', 420) + el(72, 554, 'c15 qt', spec(h), '', 420)
      + el(536, 532, 'c15 b paper', 'Paragraph', '', 200) + el(536, 554, 'c15 qt', slot ? `${spec(bd)}.` : `${spec(bd)}. About ${v(chars)} characters a line.`, '', 200)
      + el(760, 532, 'c15 b paper', 'Caption', '', 176) + el(760, 554, 'c15 qt', spec(cp), '', 176);
    return page(ctx, R, 'type-in-use', { body, zone });
  },

  // ---- 021: two joined tickets: what to do, printed on the field, and what never happens, on the dark half. Each rule's two sides share a row. ----
  'type-rules': (ctx) => {
    const R = roles(ctx), rules = ctx.brand.type.rules, tr = trackOf(ctx);
    // the dark half: the darkest brand colour that is not the bar top, if it is dark; else the bar top's own colour (the edge rule then holds the outline)
    const L = (hex) => ctx.C.toOklch(hex).L;
    const dark = ctx.colours.filter((c) => !same(c.hex, R.table) && L(c.hex) < 0.35).sort((a, b) => L(a.hex) - L(b.hex))[0];
    const half = T.bodyW / 2, dHex = dark ? dark.hex : R.table;
    const dInk = R.inkOn(dHex, 15, 400, '(Type rules, dark half)');
    const segs = [{ x: T.x, w: half, hex: R.field }, { x: T.x + half, w: half, hex: dHex }];
    const lx = 72, rx = T.x + half + 40, cw = half - 80;
    // the two heads in the display face, then the rows; each row is as tall as its longer side
    const hs = 56, hlh = 56;
    let body = `<div class="a disp nw" style="left:${lx}px;top:72px;font-size:${hs}px;line-height:${hlh}px;letter-spacing:${tr}em;color:${R.fieldInk}">Do</div>`
      + `<div class="a disp nw" style="left:${rx}px;top:72px;font-size:${hs}px;line-height:${hlh}px;letter-spacing:${tr}em;color:${dInk}">Don&rsquo;t</div>`;
    const rows = rules.map((r) => ({ r, n: Math.max(wrapBody(ctx, r.do, 15, cw).length, wrapBody(ctx, r.dont, 15, cw).length) }));
    const y0 = 72 + hlh + 28, used = rows.reduce((s, x) => s + x.n * 22, 0);
    const gap = Math.max(8, Math.min(24, (460 - y0 - used) / Math.max(rows.length - 1, 1)));
    let y = y0;
    for (const { r, n } of rows) {
      const tc = ctx.edition === 'slot' ? ' ph-tight' : '';   // slot: the compact placeholder
      body += el(lx, y, `c15 ink${tc}`, A(r.do), '', cw) + el(rx, y, `c15${tc}`, A(r.dont), `color:${dInk}`, cw);
      y += n * 22 + gap;
    }
    return page(ctx, R, 'type-rules', { segments: segs, body });
  },
};
