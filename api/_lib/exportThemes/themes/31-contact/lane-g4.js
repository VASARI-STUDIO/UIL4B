// Theme 31, Contact sheet, lane g4: the imagery and layout pages (photo-direction, shot-list, imagery-rules, grid, layouts).
// A contact sheet is where a photographer chooses, so these pages are the theme's heart: the enlargement itself, the roll printed on paper,
// keepers above and rejects struck out below, the brand's page drawn as an enlargement, and two layouts hung under the strip's frames.
// The strip, the loop, the caption column and the foot come from helpers.js. Colours come from ctx roles and brand data; no sample brand's
// colour, photo or copy is written here. The slot edition shows every piece of brand copy as a placeholder (the descriptors in
// engine/placeholders.js), and a shot without a photograph is unexposed film carrying its brief, never a grey box.
import { DESCRIPTORS } from '../../engine/placeholders.js';
import { A, tokens, palette, cwOn, put, hline, adv, wrap, fitLines, shell, captionHead, px, rollOf, GX } from './helpers.js';
import { cut, photoFrame, photoShot, photoScene } from './arts.js';

const frameFn = (ctx) => (setup, k, w, h, f, v = 0) => (setup === 'photo' ? photoFrame(ctx, k, w, h, v) : cut(ctx, setup, k, w, h, 'Frame ' + f));
const page = (ctx, id, body) => shell(ctx, id, tokens(ctx), body, frameFn(ctx));
const capNo = (ctx, id) => String(ctx.pageNo(id)).padStart(2, '0');
const isSlot = (ctx) => ctx.edition === 'slot';
const WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'];
const inWords = (n) => WORDS[n] || String(n);
const label = (ctx, x, y, t, w = 444) => put(ctx, { x, y, w, h: 16, cls: 'nl', role: 'chrome', size: 12, line: 16, weight: 500, html: A(t) });

// ---- placeholders (slot edition): the engine's descriptor for a brand.json path, drawn as a dashed note ----
const desc = (path, n = 1) => { const d = DESCRIPTORS[path]; return d ? { label: d.label.replace('{n}', n), what: d.what, length: d.length } : { label: 'Your words', what: 'Write this in the brand voice.', length: '1 sentence' }; };
// a paragraph of brand copy, measured: the words in showcase, the descriptor in a dashed frame in the slot edition. Returns { html, h }
function para(ctx, x, y, w, real, path, n, { size = 14, line = 22, color = 'var(--soft)', withLabel = false } = {}) {
  if (isSlot(ctx)) {
    const d = desc(path, n), t = `${withLabel ? d.label + '. ' : ''}${d.what} ${d.length}.`;
    const ln = wrap(ctx, 'body', t, 12, w - 24, 0, 500).length, h = ln * 18 + 14;
    const html = `<div class="a g4-ph" style="left:${px(x)};top:${px(y)};width:${px(w)};height:${px(h)};color:${color}">${withLabel ? `<b>${A(d.label)}.</b> ` : ''}${A(d.what)} ${A(d.length)}.</div>`;
    return { html, h };
  }
  const h = wrap(ctx, 'body', real, size, w, 0, 400).length * line;
  return { html: put(ctx, { x, y, w, h, cls: 'cx', style: `font-size:${size}px;line-height:${line}px;color:${color}`, html: A(real) }), h };
}

// ---- the shots ----
// each shot with its name (the caption, else its number) and its brief (the slot, whole); a shot shows its photograph only in showcase.
// Brand strings are printed whole, never cut, so the engine's slot placeholders can stand in for them
function shotsOf(ctx) {
  return (ctx.brand.imagery.shots || []).map((s, i) => ({ ...s, i, has: !!s.photo && !isSlot(ctx), name: s.caption || `Shot ${i + 1}`, brief: s.slot || '' }));
}
// the largest size from `sizes` at which `text` wraps into `maxH` at width w; the smallest when none does. Returns { size, line, n }
function fitText(ctx, text, w, maxH, sizes) {
  let r = null;
  for (const [size, line] of sizes) { const n = wrap(ctx, 'body', text, size, w, 0, 400).length; r = { size, line, n }; if (n * line <= maxH) break; }
  return r;
}
// a photograph cut to w x h at `cover`, centred; a shot whose photograph holds a blank panel is drawn from its scene, as on the strip
function shotPic(ctx, s, w, h, extra = '') {
  const sc = photoScene(ctx, s);
  // a scene takes the same treatment (a crop, a filter) through a wrapper, so a Don't frame never looks like its Do
  if (sc) return extra ? `<div class="a" style="left:0;top:0;width:${px(w)};height:${px(h)};${extra}">${cut(ctx, sc, 0, w, h, s.alt)}</div>` : cut(ctx, sc, 0, w, h, s.alt);
  return ctx.photo(s.id, { style: `position:absolute;left:0;top:0;width:${px(w)};height:${px(h)};${extra}` });
}
// the shot the roll holds on frame f, when that frame is a photograph and the brand has photographs
function rollShot(ctx, f) {
  const r = rollOf(ctx)[f], real = shotsOf(ctx).filter((s) => s.photo);
  if (!r || r[0] !== 'photo' || !real.length || isSlot(ctx)) return null;
  return real[r[1] % real.length];
}
const frameBox = (x, y, w, h, inner, empty = false, extra = '') => `<div class="a fr${empty ? ' fr--empty' : ''}" style="left:${px(x)};top:${px(y)};width:${px(w)};height:${px(h)};background:var(--film);${extra}">${inner}</div>`;
// the sizes a brief steps down through to fit its frame whole (a frame clips, so nothing may run past it)
const briefSizes = (size, line) => [[size, line], ...[[13, 20], [12, 18], [11, 16]].filter(([s]) => s < size)];
// unexposed film carrying a shot's brief: what to shoot, the crop and the light. The slot edition carries the shot descriptor instead
function unexposed(ctx, s, w, h, { n = 1, size = 12, line = 18, pad = 14, name = true } = {}) {
  const iw = w - 2 * pad;
  if (isSlot(ctx)) {
    const d = desc('imagery.shots.*.slot', n), t = `${d.what} ${d.length}.`, max = Math.max(1, Math.floor((h - 2 * pad - 30) / 18));
    const ln = Math.min(max, wrap(ctx, 'body', t, 12, iw - 24, 0, 400).length);
    return `<div class="g4-unx" style="padding:${pad}px"><div class="g4-ph" style="position:static;width:100%;color:var(--soft);max-height:${ln * 18 + 14 + 22}px"><b>${A(d.label)}.</b> ${A(t)}</div></div>`;
  }
  if (!s || !s.brief) return '';
  const f = fitText(ctx, s.brief, iw, h - 2 * pad - (name ? 22 : 0), briefSizes(size, line));
  return `<div class="g4-unx" style="padding:${pad}px">${name ? `<span class="g4-nm">${A(s.name)}</span>` : ''}<span class="g4-br" style="font-size:${f.size}px;line-height:${f.line}px">${A(s.brief)}</span></div>`;
}

// ---- the circled frame's caption: a photograph says its caption and who took it; a render says what the scene shows ----
const SCENE_TITLE = { app: 'The app on a phone, on stone', laptop: 'The desktop screen on a night desk', night: 'Poster at a venue, at night', card: 'Cards on the box-office sill', poster: 'Poster in a black frame, studio corner', sheets: 'Three sheets, gallery wall', book: 'Portfolio book, in hand', tote: 'Print bag on the studio hook', letter: 'Print order letter on linen', lightbox: 'The studio sheet under the loupe' };
function ownCap(ctx, id) {
  const P = palette(ctx), slot = isSlot(ctx), r = rollOf(ctx)[ctx.pageNo(id)], no = capNo(ctx, id);
  if (!r) return captionHead(ctx, { no, title: 'Unexposed', text: 'The roll has ended here.', lines: 2 });
  if (r[0] === 'photo') {
    const s = photoShot(ctx, r[1]);
    return captionHead(ctx, { no, title: s ? s.caption : 'Your photograph', text: s ? (s.generated ? '' : `Photo: ${s.credit || 'the studio'}.`) : 'The frame the book circles is your own photograph, as shot, in the daylight you work in.', lines: 2 });
  }
  // colour names are the brand's words too, so the slot edition says which colour by its job
  const TEXT = {
    sheets: () => (slot ? 'The three lines at A1, each on one of three brand colours.' : `The three lines at A1, on ${P.dark.name}, ${P.light.name} and ${P.action.name}.`),
    tote: () => (slot ? 'The stacked logo on canvas in the darkest brand colour.' : `The stacked logo on ${P.dark.name} canvas.`),
    app: () => (slot ? 'On a phone: the dark screen, with the action colour on the progress bar.' : `On a phone: the dark screen, with ${P.action.name} on the progress bar.`),
  };
  return captionHead(ctx, { no, title: SCENE_TITLE[r[0]] || 'The brand at work', text: (TEXT[r[0]] || (() => ''))(), lines: 2 });
}

// ---- a single pass of a chinagraph pencil, straight: the strike a photographer puts through a reject (one stroke, tapered, no texture) ----
function strike(w, h, ink) {
  const x0 = 14, y0 = h - 16, x1 = w - 14, y1 = 18, N = 24, dx = x1 - x0, dy = y1 - y0, m = Math.hypot(dx, dy), nx = -dy / m, ny = dx / m, L = [], R = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, W = 1.2 + 4.2 * Math.sin(Math.PI * Math.min(1, t * 1.15)) ** 0.6, bow = 3 * Math.sin(Math.PI * t);
    const x = x0 + dx * t + nx * bow, y = y0 + dy * t + ny * bow;
    L.push(`${(x + nx * W / 2).toFixed(1)} ${(y + ny * W / 2).toFixed(1)}`); R.unshift(`${(x - nx * W / 2).toFixed(1)} ${(y - ny * W / 2).toFixed(1)}`);
  }
  return `<svg class="a" style="left:0;top:0;pointer-events:none" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><path d="M${[...L, ...R].join(' L')}Z" fill="${ink}"/></svg>`;
}

// ---- the brand's own grid, in brand pixels ----
function gridOf(ctx) {
  const G = ctx.gridMeasures, colX = (i) => G.margin + i * (G.col + G.gutter), span = (n) => n * G.col + (n - 1) * G.gutter;
  // the widest run of columns, up to eight, whose 3:2 photograph fits between the top and bottom margins
  let pc = Math.min(8, G.columns); while (pc > 1 && span(pc) / 1.5 > G.page.h - 2 * G.margin) pc--;
  return { ...G, W: G.page.w, H: G.page.h, colX, span, pc, pw: span(pc), ph: span(pc) / 1.5 };
}
const num = (ctx, v) => { const n = Math.round(v * 100) / 100; return Number.isInteger(n) ? String(n) : ctx.fmt(n); };

export const guidelines = {
  // 22: the enlargement. The circled frame printed across the whole stage, and the five lines of direction in the margin notes
  'photo-direction'(ctx) {
    const id = 'photo-direction', D = ctx.brand.imagery.direction, s = rollShot(ctx, ctx.pageNo(id));
    const brief = shotsOf(ctx).find((x) => x.brief) || null;
    const print = s ? frameBox(60, 316, 912, 608, shotPic(ctx, s, 912, 608))
      : frameBox(60, 316, 912, 608, unexposed(ctx, brief, 912, 608, { size: 20, line: 30, pad: 176 }), true);
    const rows = [['Subject', 'subject'], ['Light', 'light'], ['Crop', 'crop'], ['Colour', 'colour'], ['People', 'people']].filter(([, k]) => D[k]);
    // the notes take 14/22 where they fit under the hairline, else a step smaller, so all five always show
    let body = '';
    for (const [size, line, gap] of [[14, 22, 18], [13, 20, 14], [12, 18, 12]]) {
      let y = 512; body = '';
      for (const [t, k] of rows) { const p = para(ctx, 996, y + 20, 444, D[k], `imagery.direction.${k}`, 1, { size, line }); body += label(ctx, 996, y, t) + p.html; y += 20 + p.h + gap; }
      if (y - gap <= 936) break;
    }
    return page(ctx, id, print + ownCap(ctx, id) + hline(996, 488, 444) + body);
  },

  // 23: the roll printed on paper. Two strips of three frames laid on the lightest brand colour, as a contact print is made; the margin lists the shots
  'shot-list'(ctx) {
    const id = 'shot-list', T = tokens(ctx), P = palette(ctx), slot = isSlot(ctx), shots = shotsOf(ctx).slice(0, 6);
    const PX = 60, PY = 316, PW = 912, PH = 560, SW = 792, SH = 228, FW = 240, FH = 160, FX = 20, FP = 256, RB = 34;
    const strips = [0, 1].map((row) => {
      const sx = PX + (PW - SW) / 2, sy = PY + 40 + row * (SH + 24);
      let holes = '';
      for (let j = 0; j < 33; j++) { const hx = 7 + j * 24; holes += `<rect x="${hx}" y="4" width="10" height="14" rx="2"/><rect x="${hx}" y="${SH - 18}" width="10" height="14" rx="2"/>`; }
      let inner = `<svg class="a" style="left:0;top:0" width="${SW}" height="${SH}" viewBox="0 0 ${SW} ${SH}" aria-hidden="true" fill="${T.hole}">${holes}</svg>`;
      for (let c = 0; c < 3; c++) {
        const i = row * 3 + c, s = shots[i], fx = FX + c * FP;
        // the edge print: the shot's name over its frame, its number under it; a name too long for the frame is printed as its shot number, never cut
        let nm = slot ? `Shot ${i + 1}` : s ? s.name : '';
        if (nm && adv(ctx, 'edge', nm.toUpperCase(), 12, 0.04, 600) > FW) nm = `Shot ${i + 1}`;
        if (nm) inner += put(ctx, { x: fx, y: 20, w: FW, h: 12, cls: 'edge', role: 'edge', size: 12, line: 12, weight: 600, html: A(nm) });
        inner += put(ctx, { x: fx, y: SH - 32, w: FW, h: 12, cls: 'edge', role: 'edge', size: 12, line: 12, weight: 600, html: `${i + 1}<i class="tri"></i>` });
        const pic = s && s.has ? shotPic(ctx, s, FW, FH) : unexposed(ctx, s, FW, FH, { n: i + 1, name: false });
        inner += frameBox(fx, RB, FW, FH, pic, !(s && s.has));
      }
      return `<div class="a" style="left:${sx}px;top:${sy}px;width:${SW}px;height:${SH}px;background:${T.film}">${inner}</div>`;
    }).join('');
    const paper = `<div class="a g4-paper" style="left:${PX}px;top:${PY}px;width:${PW}px;height:${PH}px;background:${P.light.hex}"></div>`;
    // the margin: one line on the roll, then each shot by its number, its name and where its picture comes from
    const nPhoto = shots.filter((s) => s.has).length, nSlot = shots.length - nPhoto;
    const lead = slot ? `${inWords(shots.length)} shots make the roll. Each frame holds your photograph, or the brief it will be shot to.`
      : nSlot ? `${inWords(shots.length)} shots make the roll. ${inWords(nSlot)} ${nSlot === 1 ? 'is' : 'are'} still to be shot, so ${nSlot === 1 ? 'its' : 'their'} frame${nSlot === 1 ? ' carries its' : 's carry their'} brief.`
        : `${inWords(shots.length)} shots make the roll, each printed as it came off the camera.`;
    const leadL = wrap(ctx, 'body', lead, 14, 444, 0, 400).length;
    let y = 512 + leadL * 22 + 24, rows = '', credited = false;
    shots.forEach((s, i) => {
      rows += put(ctx, { x: 996, y: y + 2, w: 32, h: 16, cls: 'edge num', role: 'edge', size: 16, line: 16, weight: 600, style: 'font-size:16px;line-height:16px;color:var(--ink)', html: String(i + 1) });
      const title = slot ? `<span class="g4-phi" style="font-size:12px">${A(desc('imagery.shots.*.caption', i + 1).label)}</span>` : A(s.name);
      rows += put(ctx, { x: 1036, y, w: 404, h: 20, role: 'body', size: 14, line: 20, weight: 500, style: 'font:500 14px/20px var(--body);color:var(--ink)', html: title });
      const how = slot ? 'Your photograph, or the brief for it.' : s.has ? (s.generated || credited ? '' : (credited = true, `Photo: ${s.credit || 'the studio'}.`)) : 'To be shot. The brief is in its frame.';
      rows += put(ctx, { x: 1036, y: y + 22, w: 404, h: 18, role: 'body', size: 12, line: 18, style: 'font:400 12px/18px var(--body);color:var(--soft)', html: A(how) });
      y += 62;
    });
    return page(ctx, id, paper + strips + ownCap(ctx, id) + hline(996, 488, 444) + put(ctx, { x: 996, y: 512, w: 444, h: leadL * 22, cls: 'cx', html: A(lead) }) + rows);
  },

  // 24: keepers and rejects. Each rule is a column under one of the strip's first four frames: the frame that keeps to it, then the frame that breaks it, struck out
  'imagery-rules'(ctx) {
    const id = 'imagery-rules', T = tokens(ctx), P = palette(ctx), B = ctx.brand, slot = isSlot(ctx), R = (B.imagery.rules || []).slice(0, 4);
    const real = shotsOf(ctx).filter((s) => s.has), FW = 210, FH = 140;
    const pic = (i, extra = '') => (real.length ? shotPic(ctx, real[i % real.length], FW, FH, extra) : null);
    const film = (inner = '') => `<div class="a" style="inset:0;background:var(--film)"></div>${inner}`;
    const plain = `<div class="g4-unx"><span class="g4-nm">Your photo</span></div>`;
    const lg = (w, bg, extra) => `<div class="a" style="${extra}">${ctx.logo.html('colour', { width: w, colourway: cwOn(ctx, bg), ...(slot ? { label: 'Logo' } : {}) })}</div>`;
    // what each rule shows, read from its own words: a logo rule places the logo, a wash or filter rule tints, a crop rule crops, a posed or studio rule is the brief for the wrong picture
    const demo = (r, i) => {
      const t = `${r.do} ${r.dont}`.toLowerCase(), d = r.dont.toLowerCase(), p = pic(i), base = p || film(plain);
      if (/logo/.test(t)) {
        const darkCw = ctx.brand.logo.colourways['mono-light'] ? 'mono-light' : cwOn(ctx, P.dark.hex);
        const onPic = (w, st) => `<div class="a" style="${st}">${ctx.logo.html('colour', { width: w, colourway: darkCw, ...(slot ? { label: 'Logo' } : {}) })}</div>`;
        return [p ? p + onPic(64, 'left:12px;bottom:12px') : `<div class="a" style="inset:0;background:${P.dark.hex}"></div>${lg(88, P.dark.hex, 'left:61px;top:56px')}`,
          (p || film()) + onPic(110, 'left:50px;top:50px')];
      }
      if (/tint|wash|colour cast/.test(d)) return [base, `${p || film()}<div class="a" style="inset:0;background:${P.action.hex};opacity:.5"></div>`];
      if (/filter|flash|preset|warm/.test(d)) return [base, p ? pic(i, 'filter:sepia(.75) saturate(1.7) contrast(1.15) brightness(1.08)') : film(plain)];
      if (/square|tall|story/.test(d)) {
        const sq = p ? `<div class="a" style="left:${(FW - FH) / 2}px;top:0;width:${FH}px;height:${FH}px;overflow:hidden">${shotPic(ctx, real[i % real.length], FH, FH)}</div>` : '';
        return [base, film(sq)];
      }
      if (/face|tight|close/.test(d)) return [base, p ? pic(i, `transform:scale(2.4);transform-origin:50% 35%`) : film(plain)];
      if (/pose|studio|smil|backdrop/.test(d) && (B.guideB && B.guideB.studioSlot)) {
        const st = slot ? `<div class="g4-unx"><span class="g4-phi" style="font-size:12px">${A(desc('guideB.studioSlot').label)}</span></div>`
          : (() => { const f = fitText(ctx, B.guideB.studioSlot, FW - 28, FH - 28, briefSizes(12, 18)); return `<div class="g4-unx" style="padding:14px"><span class="g4-br" style="font-size:${f.size}px;line-height:${f.line}px">${A(B.guideB.studioSlot)}</span></div>`; })();
        return [base, film(st)];
      }
      return [base, film()];
    };
    // texts measured so both rows of frames line up across every column
    const fit = (k) => { let r; for (const [size, line] of [[14, 22], [13, 20], [12, 18]]) { const n = Math.max(...R.map((x) => (slot ? 3 : wrap(ctx, 'body', x[k], size, FW, 0, 400).length))); r = { size, line, n }; if (n <= 4) break; } return r; };
    const fd = fit('do'), fn = fit('dont'), ty = 316 + FH + 16 + 20, dy = ty + Math.max(fd.n * fd.line, slot ? 68 : 0) + 32;
    const cols = R.map((r, i) => {
      const x = GX[i], [a, b] = demo(r, i);
      const pd = para(ctx, x, ty, FW, r.do, 'imagery.rules.*.do', i + 1, { size: fd.size, line: fd.line, color: 'var(--soft)' });
      const pn = para(ctx, x, dy + FH + 36, FW, r.dont, 'imagery.rules.*.dont', i + 1, { size: fn.size, line: fn.line, color: 'var(--soft)' });
      return frameBox(x, 316, FW, FH, a, false) + label(ctx, x, 316 + FH + 16, 'Do', FW) + pd.html
        + frameBox(x, dy, FW, FH, b + strike(FW, FH, T.ink), false) + label(ctx, x, dy + FH + 16, "Don't", FW) + pn.html;
    }).join('');
    const lead = `${inWords(R.length)} rules for every photograph. The top row keeps to them. The bottom row breaks them, and each frame is struck out.`;
    const leadL = wrap(ctx, 'body', lead, 14, 444, 0, 400).length;
    return page(ctx, id, cols + ownCap(ctx, id) + hline(996, 488, 444) + put(ctx, { x: 996, y: 512, w: 444, h: leadL * 22, cls: 'cx', html: A(lead) }));
  },

  // 25: the brand's page drawn as an enlargement on paper. The margins are the paper border an easel leaves, the columns run under and through the photograph
  grid(ctx) {
    const id = 'grid', P = palette(ctx), G = gridOf(ctx);
    const k = Math.min(912 / G.W, 560 / G.H), W = G.W * k, H = G.H * k, ox = 60, oy = 348, s = (v) => v * k;
    const paper = P.light.hex, q = P.quietOn(paper), C = ctx.C, pl = C.toOklch(paper);
    const field = C.fromOklch(Math.max(0, pl.L - 0.045), pl.C, pl.H);
    let cols = '', nums = '';
    for (let i = 0; i < G.columns; i++) {
      cols += `<div class="a" style="left:${px(s(G.colX(i)))};top:${px(s(G.margin))};width:${px(s(G.col))};height:${px(s(G.H - 2 * G.margin))};background:${field}"></div>`;
      nums += put(ctx, { x: ox + s(G.colX(i)) - 8, y: 316, w: s(G.col) + 16, h: 12, cls: 'edge num', role: 'edge', size: 12, line: 12, weight: 600, align: 'center', style: 'color:var(--quiet)', html: String(i + 1) });
    }
    // the photograph across its columns at 3:2, with the gutters carried through it as fine lines, so the grid reads under the picture too
    const s0 = rollShot(ctx, ctx.pageNo(id)), pw = s(G.pw), ph = s(G.ph), px0 = s(G.margin), py0 = s(G.margin);
    let through = '';
    for (let i = 1; i < G.pc; i++) { const gx = s(G.colX(i)) - px0; through += `<div class="a" style="left:${px(gx - s(G.gutter))};top:0;width:${px(s(G.gutter))};height:${px(ph)};background:oklch(1 0 0 / .16)"></div>`; }
    const brief = shotsOf(ctx).find((x) => x.brief) || null;
    const photo = s0 ? frameBox(px0, py0, pw, ph, shotPic(ctx, s0, pw, ph) + through, false, 'border-radius:0')
      : frameBox(px0, py0, pw, ph, unexposed(ctx, brief, pw, ph, { pad: 40, size: 14, line: 22 }), true, 'border-radius:0');
    const mlab = (x, y, w, h, t) => put(ctx, { x, y, w, h, cls: 'mono num', role: 'mono', size: 12, line: 18, align: 'center', style: `color:${q}`, html: A(t) });
    const sheet = `<div class="a g4-paper" style="left:${ox}px;top:${oy}px;width:${px(W)};height:${px(H)};background:${paper}">${cols}${photo}`
      + mlab(0, s(G.H) / 2 - 9, s(G.margin), 18, String(num(ctx, G.margin))) + mlab(s(G.colX(0)), s(G.margin) / 2 - 9, s(G.col), 18, String(num(ctx, G.margin))) + `</div>`;
    // the margin: the five measurements, then what they add up to
    const rowsData = [['Page', `${num(ctx, G.W)} × ${num(ctx, G.H)} px`], ['Margin', `${num(ctx, G.margin)} px`], ['Columns', `${G.columns} × ${num(ctx, G.col)} px`], ['Gutter', `${num(ctx, G.gutter)} px`], ['Base unit', `${num(ctx, G.base)} px`]];
    let y = 512;
    const rows = rowsData.map(([a, v], i) => {
      const h = put(ctx, { x: 996, y, w: 220, h: 20, role: 'body', size: 14, line: 20, weight: 500, style: 'font:500 14px/20px var(--body);color:var(--ink)', html: A(a) })
        + put(ctx, { x: 1220, y: y + 1, w: 220, h: 18, cls: 'mono num', role: 'mono', size: 12, line: 18, align: 'right', style: 'color:var(--soft)', html: A(v) })
        + (i < rowsData.length - 1 ? hline(996, y + 31, 444) : '');
      y += 40; return h;
    }).join('');
    const mult = [G.margin, G.gutter].every((v) => Math.abs(v / G.base - Math.round(v / G.base)) < 1e-9);
    const note = `${inWords(G.columns)} columns on a ${num(ctx, G.W)} by ${num(ctx, G.H)} page. The photograph takes ${G.pc} of them at 3:2, as shot, and the words take the rest.${mult ? ` Margins and gutters are whole steps of the ${num(ctx, G.base)} px base.` : ''}`;
    const nl = wrap(ctx, 'body', note, 14, 444, 0, 400).length;
    return page(ctx, id, nums + sheet + ownCap(ctx, id) + hline(996, 488, 444) + rows + put(ctx, { x: 996, y: y + 8, w: 444, h: nl * 22, cls: 'cx', html: A(note) }));
  },

  // 26: two layouts on that grid, each hung under two of the strip's frames (1 and 2, then 3 and 4), with a ruler of the columns it spans
  layouts(ctx) {
    const id = 'layouts', P = palette(ctx), G = gridOf(ctx), B = ctx.brand, slot = isSlot(ctx), wt = ctx.weights.heading;
    let k = 912 / G.W; const real = shotsOf(ctx).filter((s) => s.has), sc = B.type.scale;
    const tok = (t, d) => sc.find((x) => x.token === t) || d;
    const hl = tok('headline', { size: 56, line: 1.1 }), bd = tok('body', { size: 16, line: 1.5 }), cp = tok('caption', { size: 12, line: 1.45 });
    const at = (x, y, w, st, inner) => `<div style="position:absolute;left:${px(x)};top:${px(y)};${w ? `width:${px(w)};` : ''}${st}">${inner}</div>`;
    const dstr = B.fonts.display.stretch || 100;
    const dispSt = (size, line) => `font-family:var(--display);font-weight:${wt};font-stretch:${dstr}%;font-size:${size}px;line-height:${line}px;letter-spacing:-0.01em`;
    const bodySt = (size, line, color, w = 400) => `font:${w} ${size}px/${line}px var(--body);color:${color}`;
    const photoIn = (i, w, h) => (real.length ? `<div style="position:relative;width:${px(w)};height:${px(h)};overflow:hidden">${shotPic(ctx, real[i % real.length], w, h)}</div>`
      : `<div style="position:relative;width:${px(w)};height:${px(h)};background:var(--film);display:flex;align-items:center;justify-content:center"><span style="font:500 ${Math.round(12 / k)}px/1.3 var(--chrome);color:var(--edge)">Your photo</span></div>`);
    const phBig = (path, n, color, maxW) => `<span class="g4-phi" style="font-size:${Math.min(Math.round(13 / k), maxW ? Math.floor(maxW / (adv(ctx, 'body', desc(path, n).label, 1, 0, 500) + 1.1)) : 1e4)}px;color:${color};border-width:${Math.max(1, Math.round(1 / k))}px">${A(desc(path, n).label)}</span>`;
    // a line is printed whole and left to wrap where fitLines measured it; the box is 2 px over its column so rounding can't push a word down
    const SLACK = 2;

    // A: the print and the notes. The photograph across its columns at 3:2; the line, the words and the logo in the columns left over
    const buildA = () => {
      const bg = P.dark.hex, ink = P.inkOn(bg), soft = P.softOn(bg), q = P.quietOn(bg), rx = G.colX(G.pc), rw = G.W - G.margin - rx;
      const f = fitLines(ctx, 'display', B.lines.primary, hl.size, rw, 4, -0.01, wt, 4, 24), lh = Math.round(f.size * 1.1);
      const head = slot ? at(rx, G.margin, rw, '', phBig('lines.primary', 1, ink)) : at(rx, G.margin, rw + SLACK, `${dispSt(f.size, lh)};color:${ink}`, A(B.lines.primary));
      const by = G.margin + f.lines.length * lh + 2 * G.gutter;
      const body = slot ? at(rx, by, rw, '', phBig('voice.boilerplate25', 1, soft)) : at(rx, by, rw, bodySt(bd.size, Math.round(bd.size * bd.line), soft), A(B.voice.boilerplate25));
      const lw = Math.min(rw, G.span(2)), lhh = ctx.logo.geos.colour.h / ctx.logo.geos.colour.w * lw;
      const logo = at(rx, G.H - G.margin - lhh, lw, '', ctx.logo.html('colour', { width: lw, colourway: cwOn(ctx, bg), ...(slot ? { label: 'Logo' } : {}) }));
      const capY = G.margin + G.ph + G.gutter;
      const cap = capY + cp.size * cp.line <= G.H - G.margin + 1 ? at(G.margin, capY, G.pw, bodySt(cp.size, Math.round(cp.size * cp.line), q), slot ? phBig('type.sample.caption', 1, q) : A(B.type.sample.caption)) : '';
      return { bg, html: at(G.margin, G.margin, G.pw, '', photoIn(0, G.pw, G.ph)) + head + body + logo + cap, spans: [[1, G.pc]] };
    };

    // B: the line first. A second line across eight columns on the lightest colour, the photograph in the last four, three notes along the foot
    const buildB = () => {
      const bg = P.light.hex, ink = P.inkOn(bg), q = P.quietOn(bg), lw = G.span(2), lgh = ctx.logo.geos.colour.h / ctx.logo.geos.colour.w * lw;
      const tc = Math.max(1, G.columns - 4), tw = G.span(tc - 1), pw = G.span(4), ph = pw / 1.5, px1 = G.colX(G.columns - 4);
      const line = (B.lines.others && B.lines.others[0]) || B.lines.primary, lPath = B.lines.others && B.lines.others[0] ? 'lines.others.*' : 'lines.primary';
      const f = fitLines(ctx, 'display', line, Math.round(hl.size * 1.6), tw, 2, -0.01, wt, 4, 24), lh = Math.round(f.size * 1.05);
      const logo = at(G.margin, G.margin, lw, '', ctx.logo.html('colour', { width: lw, colourway: cwOn(ctx, bg), ...(slot ? { label: 'Logo' } : {}) }));
      const ly = G.margin + lgh + 3 * G.gutter;
      const head = slot ? at(G.margin, ly, tw, '', phBig(lPath, 1, ink)) : at(G.margin, ly, tw + SLACK, `${dispSt(f.size, lh)};color:${ink}`, A(line));
      const notes = (B.personality || []).slice(0, 3).map((p, i) => {
        const x = G.colX(i * 4), w = G.span(4) - G.gutter, s = Math.round(bd.size * bd.line), ml = wrap(ctx, 'body', p.means, bd.size, w, 0, 400).length;
        const y = G.H - G.margin - s * (1 + ml) - 4;
        return slot ? at(x, G.H - G.margin - s * 3, w, '', phBig('personality.*.trait', i + 1, ink, w))
          : at(x, y, w, '', `<div style="${bodySt(bd.size, s, ink, 500)}">${A(p.trait)}</div><div style="${bodySt(bd.size, s, q)}">${A(p.means)}</div>`);
      }).join('');
      return { bg, html: logo + head + at(px1, G.margin, pw, '', photoIn(1, pw, ph)) + notes, spans: [[1, 8], [G.columns - 3, G.columns]] };
    };

    // the first layout is printed across the stage, large enough to read its words; the second hangs in the column at the size the room leaves
    const T = tokens(ctx);
    const board = (x, y, w, L) => { const h = G.H * w / G.W; return `<div class="a g4-lay" style="left:${x}px;top:${y}px;width:${px(w)};height:${px(h)};background:${L.bg}${ctx.ratio(L.bg, T.ground) < 1.3 ? `;box-shadow:inset 0 0 0 1px var(--hair)` : ''}"><div style="position:relative;width:${G.W}px;height:${G.H}px;zoom:${w / G.W};white-space:normal;color:${P.inkOn(L.bg)}">${L.html}</div></div>`; };
    const capA = `The photograph across ${G.pc} of ${G.columns} columns at 3:2. The line, the words and the logo share the other ${G.columns - G.pc}.`;
    const capB = `The line across 8 columns, the photograph in the last 4. Three notes along the foot, 4 columns each.`;
    const note = `Both layouts sit on the grid from frame ${String(ctx.pageNo('grid')).padStart(2, '0')}: ${G.columns} columns of ${num(ctx, G.col)} px, ${num(ctx, G.gutter)} px gutters and ${num(ctx, G.margin)} px margins. Every edge lands on a column.`;
    const lines = (t) => wrap(ctx, 'body', t, 14, 444, 0, 400).length;
    let y = 512, col = '';
    for (const [t, d] of [['The print and the notes', capA], ['The line first', capB], ['On the grid', note]]) { col += label(ctx, 996, y, t) + put(ctx, { x: 996, y: y + 22, w: 444, h: lines(d) * 22, cls: 'cx', html: A(d) }); y += 22 + lines(d) * 22 + 16; }
    const bw = Math.min(444, Math.floor((936 - y) * G.W / G.H));
    k = 912 / G.W; const A1 = buildA(); k = bw / G.W; const B1 = buildB();
    return page(ctx, id, board(60, 316, 912, A1) + board(996, 936 - Math.round(G.H * bw / G.W), bw, B1) + ownCap(ctx, id) + hline(996, 488, 444) + col);
  },
};

export function css() {
  return `.pg .g4-unx{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;box-sizing:border-box;text-align:center;white-space:normal}
.pg .g4-nm{font:500 12px/16px var(--chrome);font-stretch:100%;letter-spacing:.02em;color:var(--edge)}
.pg .g4-br{font:400 12px/18px var(--body);color:var(--soft);text-wrap:pretty}
.pg .g4-ph{box-sizing:border-box;border:1px dashed currentColor;padding:6px 10px;font:400 12px/18px var(--body);white-space:normal;text-align:left;overflow:hidden}
.pg .g4-ph b{font-weight:500}
.pg .g4-phi{display:inline-block;box-sizing:border-box;border:1px dashed currentColor;padding:.15em .5em;font-family:var(--body);font-weight:500;line-height:1.3;white-space:nowrap;letter-spacing:0}
.pg .g4-lay{overflow:hidden}
`;
}
