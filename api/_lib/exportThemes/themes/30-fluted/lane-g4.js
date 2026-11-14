// Theme 30, Fluted, lane g4: the imagery and layout pages (photo-direction, shot-list, imagery-rules, grid, layouts).
// The band at y 768 to 1152 keeps lane g1's rule: what stands behind the glass is the page's own data, never ornament. Each measure is a window, a column
// with a round head, as on the g1 pages. Here a window is a shot (filled with its photograph if the brand has one, a dashed outline holding the brief if not),
// a rule (filled for the do, struck for the don't), a column of the brand's grid at its real width, or the share of the grid a layout gives each part.
// The sample brand has no photographs: its shots are briefs, printed whole in their frames, and no photograph is ever drawn in for one.
// Brand copy is printed whole through esc(); a string is measured (advance width, for the room it needs) but never split, sliced or counted.
// Colours come from ctx roles and brand data only; no brand colour id, hex or name is written here.
import { A, put, shell, rect, tokens, adv, fitSize, logoHtml, px } from './helpers.js';
import { warpPath } from './glass.js';

const P = 12;            // the reed pitch
const LIP = 720;         // the top of a low window head: 48 px of it flat above the band's top edge
const BB = 1152, KEY = 1184;
const TRACK = -0.02;
// a photograph counts only where the brand has one and the edition shows it: the slot edition holds frames for the user's own photographs, never the sample brand's
const hasPhoto = (ctx, s) => !!(s && s.photo) && ctx.edition !== 'slot';
// the point of the shot to keep in frame, [x, y] as fractions of the photograph (the shot's `focus`); the middle when the brand gives none
const focusOf = (s) => (Array.isArray(s.focus) && s.focus.length === 2 ? s.focus : [0.5, 0.5]);
function jpegSize() { throw new Error('theme 30: photograph files are not read by the server export'); }
// a generated photograph carries no credit line (brand.json `generated: true`); a real photographer's credit prints once on the page, not under each tile
const creditOnce = (ctx, ss) => { const c = [...new Set(ss.filter((s) => hasPhoto(ctx, s) && !s.generated && s.credit).map((s) => s.credit))]; return c.length ? c.join(', ') : ''; };
// the brief of a shot in its frame: the engine's slot markup, drawn whether or not the shot has a photograph (the slot edition never shows it)
const briefOf = (s) => s.slot || '';   // a shot with a photograph has no brief of its own: in the slot edition its frame stays empty
const brief = (ctx, shot, cls, style) => `<div class="photo-slot ${cls}" role="img" aria-label="${A('Photo slot. ' + briefOf(shot))}" style="${style}"><span>${A(briefOf(shot))}</span></div>`;
const r2 = (n) => Math.round(n * 100) / 100;
const num = (n) => `<span class="num">${r2(n)}</span>`;

// the lines a run needs in a box `w` wide, from its whole advance width and a wrap allowance (measured, never split)
const estLines = (ctx, role, text, size, w, weight) => Math.max(1, Math.ceil(adv(ctx, role, text, size, 0, weight) * (1.06 + 24 / w) / w));

// The window (lane g1's, with a dashed and a struck outline): straight sides from the band's foot up to a round head of radius w / 2 whose top is `top`.
// Returns the flat drawing (seen above the band), the same outline bent by the reeds (drawn over them), a rect of its body for the glass to sample, and its path.
function windowMark(x, w, top, { fill = null, stroke = null, dash = false, strike = false } = {}) {
  const r = w / 2, cx = x + r, cy = top + r, ins = stroke ? 1 : 0;
  const pts = [[x + ins, BB], [x + ins, cy]];
  for (let a = 180; a <= 360; a += 0.5) pts.push([cx + (r - ins) * Math.cos(a * Math.PI / 180), cy + (r - ins) * Math.sin(a * Math.PI / 180)]);
  pts.push([x + w - ins, cy], [x + w - ins, BB]);
  const d = `M${pts.map(([px2, py]) => `${px2.toFixed(2)} ${py.toFixed(2)}`).join('L')}${fill ? 'Z' : ''}`;
  const paint = fill ? `fill="${fill}"` : `fill="none" stroke="${stroke}" stroke-width="2"${dash ? ' stroke-dasharray="7 6"' : ''}`;
  let flat = `<path d="${d}" ${paint}/>`, over = `<path d="${warpPath(d, 0, 0, {}) || d}" ${paint}/>`;
  // the strike: one line from the foot of the left side to the top of the right, so the don't is crossed out flat above the band and reeded in it
  if (strike) {
    const s = `M${x + 4} ${BB - 24}L${x + w - 4} ${cy}`, sp = `fill="none" stroke="${stroke}" stroke-width="2"`;
    flat += `<path d="${s}" ${sp}/>`; over += `<path d="${warpPath(s, 0, 0, {}) || s}" ${sp}/>`;
  }
  return { flat, over, body: fill ? rect(x, Math.round(cy), w, BB - Math.round(cy), fill) : '', d: `M${pts.map(([px2, py]) => `${px2.toFixed(2)} ${py.toFixed(2)}`).join('L')}Z` };
}

// A shot's photograph standing in a window: flat above the band (clipped to the window), and its band part behind the glass, so the reeds refract the photograph itself
function photoWindow(ctx, shot, x, w, top, id) {
  const m = windowMark(x, w, top, {}), h = BB - top;
  // the photograph fills the window and is placed so the shot's focus stays in frame: a tall window is a narrow slice of the picture, so it is slid to the subject
  const n = jpegSize(), k = Math.max(w / n.w, h / n.h), iw = n.w * k, ih = n.h * k, [fx, fy] = focusOf(shot);
  const ix = x - Math.min(Math.max(fx * iw - w / 2, 0), iw - w), iy = top - Math.min(Math.max(fy * ih - h / 2, 0), ih - h);
  const img = `<image href="${A(ctx.photoUrl(shot.photo))}" x="${r2(ix)}" y="${r2(iy)}" width="${r2(iw)}" height="${r2(ih)}" preserveAspectRatio="none"/>`;
  return {
    flat: `<defs><clipPath id="${id}"><path d="${m.d}"/></clipPath></defs><g clip-path="url(#${id})">${img}</g>`,
    shape: `<svg x="${x}" y="768" width="${w}" height="384" viewBox="${x} 768 ${w} 384">${img}</svg>`,
    html: `<div class="a" role="img" aria-label="${A(shot.alt || shot.caption || '')}" style="left:${px(x)};top:${px(top)};width:${px(w)};height:${px(h)}"></div>`,
  };
}

const joinMarks = (ms) => ({ flat: ms.map((m) => m.flat).join(''), over: ms.map((m) => m.over).join(''), shape: ms.map((m) => m.body).join('') });
const page = (ctx, id, T, ms, html, { flat = '', shape = '' } = {}) => {
  const J = joinMarks(ms);
  return shell(ctx, id, T, { flat: flat + J.flat, shape: J.shape + shape, fields: false, band: { over: J.over }, html });
};

const headline = (ctx, l1, l2, { y = 96, w = 777 } = {}) => {
  const s = Math.min(64, fitSize(ctx, 'display', l2 && l2.length > l1.length ? l2 : l1, 64, w, TRACK, ctx.weights.heading, 40));
  return put(ctx, { x: 64, y, w, cls: 'disp', html: `<div style="font-size:${s}px;line-height:64px;color:var(--ink)">${A(l1)}</div>${l2 ? `<div style="font-size:${s}px;line-height:64px;color:var(--quiet)">${A(l2)}</div>` : ''}` });
};
const keyAt = (ctx, x, w, html, y = KEY, cls = 'k') => put(ctx, { x, y, w, cls, html, style: 'white-space:normal' });
const body = (ctx, x, y, w, html, style = '') => put(ctx, { x, y, w, cls: 'body', style: `white-space:normal;${style}`, html });
const shotsOf = (ctx) => ctx.brand.imagery.shots || [];

// ---- 022 photo-direction: the direction's lines on the left; at the right the first shot on the list as one tall window running through the glass ----
function photoDirection(ctx) {
  const T = tokens(ctx), D = ctx.brand.imagery.direction, W = ctx.weights, S = shotsOf(ctx), hero = S[0], heroPhoto = hasPhoto(ctx, hero);
  const items = [['Subject', D.subject], ['Light', D.light], ['Crop', D.crop], ['Colour', D.colour], ['People', D.people]].filter(([, v]) => v);
  const head = headline(ctx, 'Photography', '');
  const lead = body(ctx, 64, 176, 468, `${items.length} lines hold for every photograph. ${heroPhoto
    ? 'At the right, the first shot on the list: flat above the glass, reeded in it.'
    : 'At the right, the first shot on the list, as its brief. The frame stays empty until the photograph is taken.'}`);
  // the lines: label in the first column, text over the next four; the gap between them shrinks if the lines need the room
  const TW = 468, Y0 = 296, room = LIP - 40 - Y0;
  const ls = items.map(([, v]) => estLines(ctx, 'body', v, 16, TW, W.regular));
  const need = ls.reduce((a, b) => a + b, 0) * 25, gap = Math.max(12, Math.min(32, Math.floor((room - need) / Math.max(1, items.length - 1))));
  let y = Y0, rows = '';
  items.forEach(([k, v], i) => {
    rows += `<div class="hair" style="left:64px;top:${y - Math.round(gap / 2)}px;width:589px"></div>`
      + put(ctx, { x: 64, y: y + 2, w: 105, cls: 'kn', html: k })
      + body(ctx, 185, y, TW, A(v), 'color:var(--ink)');
    y += ls[i] * 25 + gap;
  });
  // the frame: 26 reeds wide, its sides on reed centres, its head at the top of the content zone
  const x = 702, w = 312, top = 96;
  let ms = [], extra = { flat: '', shape: '' }, inner = '', keys = '';
  if (heroPhoto) {
    const pw = photoWindow(ctx, hero, x, w, top, 'g4-pd-photo');
    extra = pw; inner = pw.html;
    keys = keyAt(ctx, x, 314, `<span class="kn">${A(hero.caption || '')}</span>`) + (creditOnce(ctx, [hero]) ? keyAt(ctx, x, 314, `Photo: ${A(creditOnce(ctx, [hero]))}`, KEY + 24) : '');
  } else if (hero) {
    ms = [windowMark(x, w, top, { stroke: T.soft, dash: true })];
    // the brief inside the frame, below its head, in the display face: it is the page's content until the photograph exists
    const bw = w - 48, BS = 24;
    inner = `<div class="a" style="left:${px(x + 24)};top:${px(top + w / 2 + 32)};width:${px(bw)}">${brief(ctx, hero, 'g4-brief', `font-size:${BS}px;line-height:30px`)}</div>`;
    keys = keyAt(ctx, x, 314, '<span class="kn">To be shot</span>') + keyAt(ctx, x, 314, 'The brief holds the frame until then.', KEY + 24);
  }
  keys += keyAt(ctx, 64, 589, `<span class="kn">The first of ${num(S.length)} shots</span>`) + keyAt(ctx, 64, 589, 'Every shot on the list follows these lines.', KEY + 24);
  return page(ctx, 'photo-direction', T, ms, head + lead + rows + inner + keys, extra);
}

// ---- 023 shot-list: every shot on the list as a window, in list order; a photograph fills its window, a brief stands in a dashed one ----
function shotList(ctx) {
  const T = tokens(ctx), S = shotsOf(ctx), N = S.length, W = ctx.weights;
  const taken = S.filter((s) => hasPhoto(ctx, s)).length;
  const l2 = taken === 0 ? `${N} briefs, none shot yet` : taken === N ? `${N} shots, all taken` : `${taken} taken, ${N - taken} to shoot`;
  const head = headline(ctx, 'Shot list', l2);
  const lead = body(ctx, 64, 248, 520, 'Every photograph the brand needs. A filled window is taken; a dashed one holds its brief until it is shot. Shoot each to the lines on the page before.');
  // the windows: the 80 reeds between the margins shared out, a reed between windows, the row centred on a reed boundary
  const KR = Math.max(4, Math.floor((80 - (N - 1)) / N)), w = KR * P, span = N * KR * P + (N - 1) * P;
  const x0 = 60 + Math.round((960 - span) / 2 / P) * P, at = (i) => x0 + i * (KR + 1) * P, TOP = 360;
  const ms = [];
  let html = '', keys = '', flat = '', shape = '';
  S.forEach((s, i) => {
    const x = at(i);
    if (hasPhoto(ctx, s)) {
      const pw = photoWindow(ctx, s, x, w, TOP, `g4-sl-${i}`);
      flat += pw.flat; shape += pw.shape; html += pw.html;
      keys += keyAt(ctx, x, w + 8, `<div class="kn">${A(s.caption || '')}</div>`);
    } else {
      ms.push(windowMark(x, w, TOP, { stroke: T.soft, dash: true }));
      // the brief at the type floor, inside the window under its head; the size steps down only if the brief would run into the glass
      const bw = w - 20, room = 760 - (TOP + w / 2 + 12);
      let fs = 16; while (fs > 15 && estLines(ctx, 'body', briefOf(s), fs, bw, W.regular) * (fs + 7) > room) fs--;
      html += `<div class="a" style="left:${px(x + 10)};top:${px(TOP + w / 2 + 12)};width:${px(bw)}">${brief(ctx, s, 'g4-brief g4-brief--s', `font-size:${fs}px;line-height:${fs + 7}px`)}</div>`;
      keys += keyAt(ctx, x, w + 8, '<div class="kn">To be shot</div><div>Brief only</div>');
    }
  });
  const cr = creditOnce(ctx, S);
  if (cr) keys += keyAt(ctx, 64, 952, `Photographs: ${A(cr)}`, 1252);
  return page(ctx, 'shot-list', T, ms, head + lead + html + keys, { flat, shape });
}

// ---- 024 imagery-rules: one column per rule, the do above the don't; in the glass, a window for each, filled for the do and struck through for the don't ----
function imageryRules(ctx) {
  const T = tokens(ctx), R = ctx.brand.imagery.rules || [], k = R.length, W = ctx.weights;
  const CW = Math.floor((952 - 24 * (k - 1)) / k), cx = (i) => 64 + i * (CW + 24);
  const head = headline(ctx, 'Imagery rules', '');
  const lead = body(ctx, 64, 176, 468, `${k} rules for choosing and placing a photograph. Each says what to do, then what never happens. In the glass, a filled window for the do and a struck one for the don't.`);
  // the do at the largest of 28, 26 or 24 px at which every column's block fits the room above the windows
  const top = 304, DL = 12;
  let DS, dl, nl;
  for (DS of [28, 26, 24]) {
    dl = Math.max(...R.map((r) => estLines(ctx, 'display', r.do, DS, CW, W.heading)));
    nl = Math.max(...R.map((r) => estLines(ctx, 'body', r.dont, 16, CW, W.regular)));
    if (28 + dl * (DS + 4) + 24 + 28 + nl * 25 <= 360) break;
  }
  const dY = top + 28, nH = dY + dl * (DS + 4) + 24, nY = nH + 28, end = nY + nl * 25;
  // the windows rise to 48 px under the lowest text, so the taller the rules run, the shorter the glass they stand in; never lower than the g1 lip
  const wTop = Math.min(LIP, end + 72), half = Math.floor((CW - DL) / 2 / P) * P;
  let cols = '', keys = '';
  const ms = [];
  R.forEach((r, i) => {
    const x = cx(i);
    cols += `<div class="hair" style="left:${x}px;top:${top - 16}px;width:${CW}px"></div>`
      // one flowing block per rule, so a rule that wraps longer than measured pushes its own don't down instead of running into it
      + put(ctx, { x, y: top, w: CW, style: 'white-space:normal', html: `<div class="kn">Do</div><div class="disp" style="margin-top:8px;font-size:${DS}px;line-height:${DS + 4}px;color:var(--ink)">${A(r.do)}</div>`
        + `<div class="kn" style="margin-top:24px">Don’t</div><div style="margin-top:8px;font:${W.regular} 16px/25px var(--body);color:var(--quiet);text-decoration:line-through;text-decoration-thickness:1px">${A(r.dont)}</div>` });
    const a = Math.round((x - 6) / P) * P + 6, b = a + half + DL;   // both sides on reed centres
    ms.push(windowMark(a, half, wTop, { fill: T.strong }), windowMark(b, half, wTop + half / 2, { stroke: T.ink, strike: true }));
    keys += keyAt(ctx, a, half + 8, 'Do') + keyAt(ctx, b, half + 8, 'Don’t');
  });
  return page(ctx, 'imagery-rules', T, ms, head + lead + cols + keys);
}

// ---- 025 grid: the measures of the brand's grid set large; in the glass its columns, one window each, at their real width on a page scaled to this one ----
function grid(ctx) {
  const T = tokens(ctx), G = ctx.gridMeasures, N = G.columns, k = 1080 / G.page.w, same = G.page.w === 1080 && G.page.h === 1350;
  const colX = (i) => G.margin + i * (G.col + G.gutter);
  const head = headline(ctx, 'The grid', `${N} columns, ${G.gutter} px apart`);
  const lead = body(ctx, 64, 248, 468, same
    ? `Every page of this document stands on this grid. In the glass, its ${N} columns at full size, where they fall on the page.`
    : `For a page ${G.page.w} by ${G.page.h} px. In the glass, its ${N} columns at ${Math.round(k * 100)}% of their size, where they fall on that page.`);
  // the measures: label in the chrome face, value in the display face; a long value steps down to fit its cell
  const M = [[64, 226, 'Page, px', `${G.page.w} × ${G.page.h}`], [306, 226, 'Columns, px', `${N} × ${r2(G.col)}`],
    [548, 105, 'Margin', `${G.margin}`], [669, 105, 'Gutter', `${G.gutter}`], [790, 105, 'Base unit', `${G.base}`]];
  const MY = 376, vals = M.map(([x, w, lab, v]) => {
    const s = fitSize(ctx, 'display', v, 40, w - 20, TRACK, ctx.weights.heading, 24);   // 20 px clear of the next cell
    return `<div class="hair" style="left:${x}px;top:${MY - 16}px;width:${w}px"></div>` + put(ctx, { x, y: MY, w, cls: 'kn', html: lab })
      + put(ctx, { x, y: MY + 28, w, cls: 'disp num', html: `<span style="font-size:${s}px;line-height:48px">${A(v)}</span>` });
  }).join('');
  // the columns: each a window as wide as the column, its head 72 px under the measures
  const top = 512;
  let keys = '';
  const ms = Array.from({ length: N }, (_, i) => {
    const x = r2(colX(i) * k), w = r2(G.col * k);
    if (w >= 40) keys += put(ctx, { x, y: KEY, w: Math.max(w, 40), cls: 'v num', html: String(r2(colX(i))) });
    return windowMark(x, w, top, { fill: T.strong });
  });
  keys += keyAt(ctx, 64, 952, same ? 'Each column’s x on the page, in px. The margins and gutters are the ground between the windows.' : 'Each column’s x on its own page, in px. The margins and gutters are the ground between the windows.', KEY + 32);
  return page(ctx, 'grid', T, ms, head + lead + vals + keys);
}

// ---- 026 layouts: three pages built on the brand's grid, drawn small; in the glass under each, its parts as windows as wide as the columns they take ----
function layouts(ctx) {
  const T = tokens(ctx), B = ctx.brand, G = ctx.gridMeasures, N = G.columns, W = ctx.weights, S = shotsOf(ctx);
  const PWb = G.page.w, PHb = G.page.h, colX = (i) => G.margin + i * (G.col + G.gutter), span = (n) => n * G.col + (n - 1) * G.gutter;
  const TW = 296, z = TW / PWb, TH = Math.round(PHb * z), TY = 256, tx = (i) => 64 + i * (TW + 32);
  const pa = Math.round(N * 5 / 8), ps = Math.round(N * 3 / 4), pc = Math.round(N / 2);
  const shot = S.find((s) => hasPhoto(ctx, s)) || S[0], m = G.margin;
  const lines = [B.lines.primary, ...(B.lines.others || [])];
  // the largest size (from `from`, down to `min`) at which a run fits `rows` lines of a box `w` wide; the measured size is a cap, so a shorter string still fits
  const sized = (role, text, from, w, rows, weight, min = 16) => { let s = from; while (s > min && estLines(ctx, role, text, s, w, weight) > rows) s -= 2; return s; };
  const box = (x, y, w, h, inner, st = '') => `<div style="position:absolute;left:${r2(x)}px;top:${r2(y)}px;width:${r2(w)}px;${h ? `height:${r2(h)}px;` : ''}${st}">${inner}</div>`;
  const disp = (text, size, color, w) => `<div class="disp" style="font-size:${size}px;line-height:${Math.round(size * 1.08)}px;color:var(${color});white-space:normal;width:${r2(w)}px">${A(text)}</div>`;
  const logo = (w) => logoHtml(ctx, T, 'colour', { width: Math.round(w), label: '', bw: 3 });
  const lh = (w) => w * ctx.logo.geos.colour.h / ctx.logo.geos.colour.w;
  const board = (inner) => `<div class="g4-b${ctx.placeholders ? ' ph-tight' : ''}" style="width:${PWb}px;height:${PHb}px;zoom:${r2(z * 10000) / 10000}">${inner}</div>`;
  const photoBox = (x, y, w, h) => hasPhoto(ctx, shot) ? box(x, y, w, h, ctx.photo(shot.id, { style: 'width:100%;height:100%', pos: `${focusOf(shot)[0] * 100}% ${focusOf(shot)[1] * 100}%` }))
    : box(x, y, w, h, '', `box-sizing:border-box;background:var(--panel);border:${Math.round(3 / z / 2)}px dashed var(--soft)`);   // no photograph yet: the area it will take, in the raised colour, dashed as every brief is
  // the body text at 27% of its size cannot be read, so it is drawn as the lines it sets: bars one text line apart, the last one short (a thumbnail is a diagram, not a proof)
  const textBars = (w, size, gap) => `<div style="margin-top:${gap}px">${[1, 1, 1, 0.6].map((f) => `<div style="height:${Math.round(size * 0.5)}px;width:${r2(w * f)}px;margin-bottom:${Math.round(size * 1.0)}px;background:var(--quiet)"></div>`).join('')}</div>`;
  const tall = PHb > PWb;
  // 1. photograph and line: the photograph to the bleed on the first `pa` columns, the line and the logo on the rest
  const xA = colX(pa) - G.gutter / 2, wA = span(N - pa), lgA = Math.min(wA * 0.7, 360);
  const sA = sized('display', lines[0], Math.round(PWb * (tall ? 0.1 : 0.08)), wA, tall ? 4 : 3, W.heading);
  const A1 = board(photoBox(0, 0, xA, PHb) + box(colX(pa), m, wA, 0, disp(lines[0], sA, '--ink', wA)) + box(colX(pa), PHb - m - lh(lgA), lgA, 0, logo(lgA)));
  // 2. the statement: the primary line across `ps` columns, the others under it in the quiet colour, the logo at the foot
  const wB = span(ps), sB = sized('display', lines[0], Math.round(PWb * (tall ? 0.11 : 0.09)), wB, tall ? 4 : 2, W.heading), lgB = Math.min(span(2), 240);
  const oB = lines.length > 1 ? textBars(wB * 0.8, Math.round(sB * 0.5), Math.round(sB * 0.2)) : '';   // the other lines are drawn as bars: they print once, on the messaging page, and at this size they could not be read
  const A2 = board(box(colX(0), m, wB, 0, disp(lines[0], sB, '--ink', wB) + `<div style="height:${Math.round(sB * 0.4)}px"></div>` + oB) + box(colX(0), PHb - m - lh(lgB), lgB, 0, logo(lgB)));
  // 3. headline and text on the first `pc` columns, the rest left as ground; the logo top right
  const wC = span(pc), sm = B.type.sample || {}, hC = sm.headline || lines[0], lgC = Math.min(span(2), 240);
  const sC = sized('display', hC, Math.round(PWb * 0.06), wC, 2, W.heading), pS = Math.max(G.base * 3, 20);
  const A3 = board(box(PWb - m - lgC, m, lgC, 0, logo(lgC)) + box(colX(0), m + lh(lgC) + G.base * 6, wC, 0, disp(hC, sC, '--ink', wC)
    + (sm.paragraph ? textBars(wC, pS, G.base * 3) : '')));
  const thumbs = [A1, A2, A3].map((a, i) => `<div class="a g4-t" style="left:${tx(i)}px;top:${TY}px;width:${TW}px;height:${TH}px">${a}</div>`).join('');
  const head = headline(ctx, 'Layouts', '');
  const lead = body(ctx, 64, 176, 520, `Three pages on the ${N}-column grid, drawn at ${Math.round(z * 100)}%. In the glass under each, its parts as wide as the columns they take.`);
  // the windows: each part of a layout at its x and width in the drawing, standing 56 px under the drawing (never lower than the g1 lip)
  const wt = Math.min(LIP, TY + TH + 56), X = (i, x) => r2(tx(i) + x * z);
  const photoPart = (i, x, w, id) => (hasPhoto(ctx, shot) ? { pw: photoWindow(ctx, shot, X(i, x), r2(w * z), wt, id) } : { m: windowMark(X(i, x), r2(w * z), wt, { stroke: T.soft, dash: true }) });
  const ph = photoPart(0, 0, xA - G.gutter / 2, 'g4-ly-a');
  const ms = [...(ph.m ? [ph.m] : []), windowMark(X(0, colX(pa)), r2(wA * z), wt, { fill: T.strong }), windowMark(X(1, colX(0)), r2(wB * z), wt, { fill: T.strong }), windowMark(X(2, colX(0)), r2(wC * z), wt, { fill: T.strong })];
  const keys = [
    ['Photograph and line', `The photograph on ${pa} of ${N} columns to the bleed, the line and logo on ${N - pa}.`],
    ['Statement', `The line across ${ps} of ${N} columns, the logo at the foot.`],
    ['Headline and text', `Text on ${pc} of ${N} columns, the rest left as ground.`],
  ].map(([n, t], i) => keyAt(ctx, tx(i), TW, `<div class="kn">${n}</div><div>${t}</div>`)).join('');
  return page(ctx, 'layouts', T, ms, head + lead + thumbs + (ph.pw ? ph.pw.html : '') + keys, ph.pw ? { flat: ph.pw.flat, shape: ph.pw.shape } : {});
}

export const guidelines = { 'photo-direction': photoDirection, 'shot-list': shotList, 'imagery-rules': imageryRules, grid, layouts };

// the brief in its frame (ctx.photo's slot) and the small pages of the layouts page; every rule under .pg and a g4- class
export function css(ctx) {
  return `.pg .photo-slot.g4-brief{display:block;background:none;border:0;padding:0}
.pg .photo-slot.g4-brief>span{display:block;font-family:var(--display);font-weight:${ctx.weights.heading};letter-spacing:-0.01em;color:var(--ink);white-space:normal}
.pg .photo-slot.g4-brief--s>span{font-family:var(--body);font-weight:${ctx.weights.regular};letter-spacing:0;color:var(--soft)}
.pg .g4-t{overflow:hidden;box-shadow:0 0 0 1px var(--hair);background:var(--ground)}
.pg .g4-b{position:relative;overflow:hidden;background:var(--ground)}`;
}
