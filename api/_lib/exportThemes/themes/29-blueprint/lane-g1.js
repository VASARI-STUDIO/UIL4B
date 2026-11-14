// Theme 29 (Blueprint), lane g1: the brand and voice pages (contents, personality, voice, write-this, messaging, summary, contact-scope).
// Each is a drawing sheet doing a drafter's job: a drawing register, called-out details, a revision schedule, a typesetting sheet, a key sheet and a
// transmittal. Redlines only print true sizes (a sheet, a text measure, the logo); every other mark is a drafting mark carrying structure.
import { esc as A } from '../../engine/brand.js';
import { outline } from '../../engine/logo.js';
import { loadFont } from '../../engine/nodeFont.js';
import { inkW, wrap, inkEnd, displayStem, baseline, shown } from './measure.js';
import { sheet, reds, cloud, detailTag, PX, ZX, ZY, r1 } from './lane-g1-sheet.js';

const CHIVO = 'Chivo-400';
const stemOf = (ctx, role, w) => (ctx.faces.find((f) => f.role === role && f.weight === w && f.style !== 'italic') || ctx.faces.find((f) => f.role === role)).stem;
// lines a string takes at a width, measured with the face's own advances; a few px of slack so the browser's wrap lands on the same count
const linesOf = (stem, text, size, w, track = 0) => wrap(stem, text, size, w - 6, track).length;
// the brand's lead token (24/32 when a brand has none), with its line height in px whether the scale gives a ratio or px
function lead(ctx) {
  const t = ctx.brand.type.scale.find((x) => x.token === 'lead') || { size: 24, line: 32 };
  return { size: t.size, line: Math.round(t.line < 4 ? t.line * t.size : t.line) };
}
const words = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
const count = (n) => words[n] || String(n);
const capOf = (stem, s) => -outline(loadFont(stem), 'H', s, 0).y1;

export const guidelines = {
  // 002: the drawing register. Every sheet of the set drawn as its own outline at 1:14, one column per section, this sheet shaded.
  contents(ctx) {
    const K = 14, W = (420 / K) * PX, H = (297 / K) * PX, G = 8;
    const front = ctx.pages.filter((p) => !p.section), cols = [{ n: null, title: 'Front matter', pages: front }, ...ctx.sections];
    const rows = Math.max(...cols.map((c) => c.pages.length)), Y = 947 - 16 - rows * H - (rows - 1) * G;
    // the front matter stands apart from the nine sections, with room between for the redline on this sheet
    const x0 = 64, x1 = 273.4, gap = (1523 - x1 - (cols.length - 1) * W) / (cols.length - 2);
    let svg = '', txt = '';
    cols.forEach((c, i) => {
      const x = i === 0 ? x0 : x1 + (i - 1) * (W + gap);
      txt += c.n ? `<span class="a c-mono" style="left:${r1(x)}px;top:${r1(Y - 68)}px;color:var(--quiet)">${String(c.n).padStart(2, '0')}</span>` : '';
      txt += `<h3 class="a c-head nw" style="left:${r1(x)}px;top:${r1(Y - 48)}px">${A(c.title)}</h3>`;
      c.pages.forEach((p, j) => {
        const y = Y + j * (H + G), here = p.id === 'contents', f = 40 / K, tb = (971 / 1123) * H;
        // the paper's own edge only shows where it is shaded; the drawn frame and its title block line are what a register shows
        if (here) svg += `<rect x="${r1(x)}" y="${r1(y)}" width="${r1(W)}" height="${r1(H)}" fill="var(--film2)" stroke="none"/>`;
        svg += `<rect x="${r1(x + f) + 0.5}" y="${r1(y + f) + 0.5}" width="${r1(W - 2 * f)}" height="${r1(H - 2 * f)}" stroke="var(--ink)" stroke-width="1"/><path d="M${r1(x + f)} ${r1(y + tb) + 0.5}H${r1(x + W - f)}" stroke="var(--ink)" stroke-width="1"/>`;
        txt += `<span class="a c-mono" style="left:${r1(x + 10)}px;top:${r1(y + 8)}px">${String(p.no).padStart(3, '0')}</span><span class="a c-label" style="left:${r1(x + 10)}px;top:${r1(y + 26)}px;width:${r1(W - 18)}px;color:var(--ink)">${A(p.title)}</span>`;
      });
    });
    // the register's head rule: every column hangs from it, the way a drawing list hangs from its header
    svg += `<path d="M${x0} ${r1(Y - 16) + 0.5}H1523" stroke="var(--ink)" stroke-width="1.5"/>`;
    // this sheet's own outline, dimensioned at its real size: the set is drawn at 1:14, so the values are the A3 sheet in mm
    const here = Y + H + G, R = reds();
    R.dim([x0, here + H], [x0 + W, here + H], [0, 1], { d: 24, value: '420' });
    R.dim([x0 + W, here], [x0 + W, here + H], [1, 0], { d: 24, value: '297', place: 'side' });
    const total = ctx.pages.length, secs = ctx.sections.length;
    const notes = [`${count(total)} sheets: the cover, this register and ${count(secs).toLowerCase()} sections.`, 'Each sheet is drawn at 1:14 with its number and title. The shaded sheet is this one.'];
    const nt = notes.map((t, i) => `<div style="display:grid;grid-template-columns:24px 1fr"><span class="c-mono" style="line-height:20px">${i + 1}</span><p class="c-note">${A(t)}</p></div>`).join('');
    const inner = `<svg class="a" style="left:0;top:0" width="1587" height="1123" viewBox="0 0 1587 1123" fill="none" aria-hidden="true">${svg}</svg>${txt}${R.svg()}
<h3 class="a c-head" style="left:${ZX[6] + 24}px;top:64px">General notes</h3><div class="a" style="left:${ZX[6] + 24}px;top:102px;width:329px;display:flex;flex-direction:column;gap:16px">${nt}</div>`;
    return sheet(ctx, 'contents', { drawing: 'Drawing register', scale: '[1:14], sizes in mm' }, inner);
  },

  // 004: the traits called out like details on a drawing. Each word in the display face, a leader to its tag, and what it means in practice.
  personality(ctx) {
    const B = ctx.brand, T = B.personality, n = T.length, stem = displayStem(ctx), Ld = lead(ctx);
    const lineH = Ld.line, linesTop = 947;   // the lines are on messaging, the cover and the summary; this page carries the traits
    const slot = Math.min(280, (linesTop - 64 - 72) / n), widest = (s) => Math.max(...T.map((t) => inkW(stem, t.trait, s, -0.01)));
    const S = [192, 176, 160, 144, 128, 112, 104, 96, 88, 80, 72, 64].find((s) => widest(s) <= 760 && s <= slot * 0.72) || 64;
    const cap = capOf(stem, S), tagX = ZX[5] + 14, noteX = ZX[5] + 48, noteW = 400;
    let svg = '', html = '';
    T.forEach((t, i) => {
      const top = 64 + i * slot, base = top + baseline(stem, S, S), mid = base - cap / 2;
      const end = 64 + inkEnd(stem, t.trait, S, -0.01);
      html += `<p class="a bd" style="left:64px;top:${r1(top)}px;font-size:${S}px;line-height:${S}px">${A(t.trait)}</p>`;
      svg += `<circle cx="${r1(end + 20)}" cy="${r1(mid)}" r="2.5" fill="var(--ink)" stroke="none"/><path d="M${r1(end + 20)} ${r1(mid) + 0.5}H${r1(tagX - 14)}" stroke="var(--ink)" stroke-width="1"/>`;
      html += detailTag(tagX, mid, i + 1);
      html += `<p class="a c-note" style="left:${noteX}px;top:${r1(mid - 10)}px;width:${r1(noteW)}px">${A(t.means)}</p>`;
    });
    const inner = `<svg class="a" style="left:0;top:0" width="1587" height="1123" viewBox="0 0 1587 1123" fill="none" aria-hidden="true">${svg}</svg>${html}`;
    return sheet(ctx, 'personality', { drawing: 'Personality', scale: 'Not to scale' }, inner);
  },

  // 005: a details sheet. Each principle's example is the detail, set in the brand's body face, with the drafter's detail title under it.
  voice(ctx) {
    const P = ctx.brand.voice.principles, n = P.length, bw = mid(ctx), stem = stemOf(ctx, 'body', bw);
    // the drawing area is divided into one panel per detail, the way a detail sheet is: four make a 2 by 2 split on the centring marks, three or fewer sit side by side
    const cols = n <= 3 ? n : n === 4 ? 2 : 3, rows = Math.ceil(n / cols), PW = 1507 / cols, PH = 931 / rows, EW = PW - 64;
    const fits = (s) => P.every((p) => linesOf(stem, p.example, s, EW, -0.01) * Math.round(s * 1.15) <= PH - 32 - 104);
    const S = [72, 64, 60, 56, 52, 48, 44, 40, 36, 32, 28].find(fits) || 28, lh = Math.round(S * 1.15);
    let html = '', svg = '';
    for (let c = 1; c < cols; c++) svg += `<path d="M${r1(40 + c * PW) + 0.5} 40V971" stroke="var(--ink)" stroke-width="1"/>`;
    for (let r = 1; r < rows; r++) svg += `<path d="M40 ${r1(40 + r * PH) + 0.5}H1547" stroke="var(--ink)" stroke-width="1"/>`;
    P.forEach((p, i) => {
      const px = 40 + (i % cols) * PW, py = 40 + Math.floor(i / cols) * PH;
      html += `<p class="a bn" style="left:${r1(px + 32)}px;top:${r1(py + 32)}px;width:${r1(EW)}px;font:${bw} ${S}px/${lh}px var(--body);letter-spacing:-.01em;color:var(--b-text)">${A(p.example)}</p>`;
      // the detail title at the panel's foot: a numbered circle, the title on a heavy rule, as a drafter titles a detail under the drawing
      const ty = py + PH - 32 - 28, tw = inkW('Chivo-500', shown(ctx, p.title), 15) + (ctx.placeholders ? 12 : 0);  // slot: the compact placeholder's width, not the sentinel's
      html += detailTag(px + 32 + 14, ty + 14, i + 1) + `<h3 class="a c-head nw${ctx.placeholders ? ' ph-tight' : ''}" style="left:${r1(px + 72)}px;top:${r1(ty + 1)}px">${A(p.title)}</h3>`;
      svg += `<path d="M${r1(px + 72)} ${r1(ty + 27)}H${r1(px + 72 + tw + 32)}" stroke="var(--ink)" stroke-width="1.5"/>`;
    });
    const inner = `<svg class="a" style="left:0;top:0" width="1587" height="1123" viewBox="0 0 1587 1123" fill="none" aria-hidden="true">${svg}</svg>${html}`;
    return sheet(ctx, 'voice', { drawing: 'How we sound', scale: 'Not to scale' }, inner);
  },

  // 006: the revision schedule. What was written is struck through, what replaces it sits in a revision cloud, and the reason is the note.
  'write-this'(ctx) {
    const W = ctx.brand.voice.writeThis, n = W.length, bw = mid(ctx), stem = stemOf(ctx, 'body', bw);
    const C = { rev: 64, was: 112, now: ZX[2] + 40, because: ZX[6] + 24 }, wasW = C.now - 40 - C.was, nowMax = C.because - 56 - C.now, becW = 1523 - C.because;
    const lay = (s) => {
      const lh = Math.round(s * 1.3);
      const rows = W.map((r) => {
        // slot: the brand's words are sentinels, so there is nothing to measure; each cell is one compact line
        if (ctx.placeholders) return { r, w: nowMax - 6, nl: 1, h: s * 1.3 + 32 };
        const ls = wrap(stem, r.write, s, nowMax - 6), ink = Math.max(...ls.map((l) => inkW(stem, l, s))), w = Math.min(nowMax - 6, Math.ceil(ink) + 6);
        const h = Math.max(ls.length * lh + 32, linesOf(CHIVO, r.not, 13, wasW) * 20, linesOf(CHIVO, r.because, 13, becW) * 20);
        return { r, w, nl: ls.length, h };
      });
      return { s, lh, rows, total: rows.reduce((a, b) => a + b.h, 0) };
    };
    let L = lay(18);
    for (const s of [34, 32, 30, 28, 26, 24, 22, 20, 18]) { const t = lay(s); if (t.total + n * 40 <= 947 - 120) { L = t; break; } }
    // the rows share out the whole drawing area, so the schedule reaches the title block instead of stopping short
    const gap = Math.min(120, (947 - 120 - L.total) / Math.max(1, n));
    let y = 120, html = '', svg = '';
    html += [['Rev', C.rev], ['Was', C.was], ['Now', C.now], ['Because', C.because]].map(([h, x]) => `<span class="a c-label" style="left:${r1(x)}px;top:72px">${h}</span>`).join('');
    svg += `<path d="M64 ${96.5}H1523" stroke="var(--ink)" stroke-width="1.5"/>`;
    L.rows.forEach(({ r, w, nl, h }, i) => {
      const top = y + gap / 2, textTop = top + 16;
      // the revision delta: a triangle with the revision's number in it
      svg += `<path d="M${C.rev + 12} ${r1(textTop - 4)}L${C.rev + 26} ${r1(textTop + 20)}H${C.rev - 2}Z" stroke="var(--ink)" stroke-width="1"/>`;
      html += `<span class="a c-mono" style="left:${C.rev}px;top:${r1(textTop + 5)}px;width:24px;text-align:center">${i + 1}</span>`;
      html += `<p class="a c-note c-quiet" style="left:${C.was}px;top:${r1(textTop)}px;width:${wasW}px;color:var(--quiet);text-decoration:line-through;text-decoration-thickness:1px">${A(r.not)}</p>`;
      html += `<p class="a bn" style="left:${r1(C.now)}px;top:${r1(textTop)}px;width:${w}px;font:${bw} ${L.s}px/${L.lh}px var(--body);color:var(--b-text)">${A(r.write)}</p>`;
      svg += `<path d="${cloud(C.now - 16, textTop - 12, w + 32, nl * L.lh + 24, 10)}" stroke="var(--ink)" stroke-width="1"/>`;
      html += `<p class="a c-note" style="left:${r1(C.because)}px;top:${r1(textTop)}px;width:${becW}px">${A(r.because)}</p>`;
      y += h + gap;
      if (i < n - 1) svg += `<path d="M64 ${r1(y) + 0.5}H1523" stroke="var(--hair)" stroke-width="1"/>`;
    });
    const inner = `<svg class="a" style="left:0;top:0" width="1587" height="1123" viewBox="0 0 1587 1123" fill="none" aria-hidden="true">${svg}</svg>${html}`;
    return sheet(ctx, 'write-this', { drawing: 'Write this, not that', scale: '[1:1]' }, inner);
  },

  // 007: a typesetting sheet. The primary line at full width in the display face, the other lines under it, and the boilerplates set at their measures,
  // each measure dimensioned in mm (a true size of the column as printed).
  messaging(ctx) {
    const B = ctx.brand, V = B.voice, stem = displayStem(ctx), bstem = stemOf(ctx, 'body', mid(ctx));
    const S1 = [128, 120, 112, 104, 96, 88, 80, 72, 64].find((s) => inkW(stem, B.lines.primary, s, -0.01) <= 1440) || 64;
    const S2 = Math.max(28, Math.round(S1 * 0.36)), l2 = Math.round(S2 * 1.25);
    const body = B.type.scale.find((t) => t.token === 'body') || { size: 16, line: 24 }, bs = body.size, bl = Math.round(body.line < 4 ? body.line * body.size : body.line);
    let html = `<span class="a c-label" style="left:64px;top:72px">Primary line</span><p class="a bd" style="left:64px;top:96px;font-size:${S1}px;line-height:${S1}px">${A(B.lines.primary)}</p>`;
    const oy = 96 + S1 + 48;
    if (B.lines.others.length) {
      html += `<span class="a c-label" style="left:64px;top:${oy}px">${B.lines.others.length === 1 ? 'Other line' : 'Other lines'}</span>`;
      html += B.lines.others.map((l, i) => `<p class="a bn nw" style="left:64px;top:${oy + 24 + i * l2}px;font:${mid(ctx)} ${S2}px/${l2}px var(--body);color:var(--b-text)">${A(l)}</p>`).join('');
    }
    // three columns along the foot: how to write the name (a rule, so in the sheet's sans), then the two boilerplates in the body face at two measures
    const cols = [
      { x: 64, w: 329, label: 'Writing the name', text: V.nameRules, brand: false },
      { x: ZX[2] + 24, w: 330, label: 'Short boilerplate', text: V.boilerplate25, brand: true },
      { x: ZX[4] + 24, w: 520, label: 'Long boilerplate', text: V.boilerplate50, brand: true },
    ];
    const hOf = (c) => (c.brand ? linesOf(bstem, c.text, bs, c.w) * bl : linesOf(CHIVO, c.text, 13, c.w) * 20);
    // the columns hang from one line and their deepest one ends on the content floor, so the foot of the sheet is held and the middle stays open
    const top = Math.max(947 - Math.max(...cols.map(hOf)) - 8, oy + 24 + B.lines.others.length * l2 + 96);
    // the voice in use: the brand's own example line for each principle, set at the lead size in four columns, centred in the space between the lines and the foot
    const Ld = lead(ctx), vstem = stemOf(ctx, 'body', 400), ex = V.principles.slice(0, 4), vw = 329, vx = [64, ZX[2] + 24, ZX[4] + 24, ZX[6] + 24];
    const vh = Math.max(...ex.map((p) => linesOf(vstem, p.example, Ld.size, vw) * Ld.line)), endOther = oy + (B.lines.others.length ? 24 + B.lines.others.length * l2 : 0);
    const vgap = Math.round(((top - 56) - endOther - (40 + vh)) / 2 / 8) * 8;
    if (ex.length && vgap >= 48) {
      const vy = endOther + Math.min(vgap, 120);
      html += ex.map((p, i) => `<div class="hl" style="left:${r1(vx[i])}px;top:${r1(vy)}px;width:${vw}px;background:var(--hair)"></div><span class="a c-label" style="left:${r1(vx[i])}px;top:${r1(vy + 12)}px">${A(p.title)}</span><p class="a bn" style="left:${r1(vx[i])}px;top:${r1(vy + 40)}px;width:${vw}px;font:400 ${Ld.size}px/${Ld.line}px var(--body);color:var(--b-text)">${A(p.example)}</p>`).join('');
    }
    const R = reds();
    cols.forEach((c) => {
      html += `<span class="a c-label" style="left:${r1(c.x)}px;top:${r1(top - 56)}px">${c.label}</span>`;
      html += c.brand
        ? `<p class="a bn" style="left:${r1(c.x)}px;top:${r1(top)}px;width:${c.w}px;font:400 ${bs}px/${bl}px var(--body);color:var(--b-text)">${A(c.text)}</p>`
        : `<p class="a c-note" style="left:${r1(c.x)}px;top:${r1(top)}px;width:${c.w}px">${A(c.text)}</p>`;
      if (c.brand) R.dim([c.x, top], [c.x + c.w, top], [0, -1], { d: 16, value: String(Math.round(c.w / PX)) });
    });
    const inner = `${html}${R.svg()}`;
    return sheet(ctx, 'messaging', { drawing: 'Lines and boilerplate', scale: '[1:1], sizes in mm' }, inner);
  },

  // 032: the key sheet. The logo dimensioned at its drawn size, the rules as general notes, the two faces named in themselves,
  // and the palette laid along the foot of the drawing area by share, edge to edge.
  summary(ctx) {
    const B = ctx.brand, F = B.fonts, g = ctx.logo.geos.colour, rules = B.guideB.rules, Ld = lead(ctx);
    const LW = Math.floor(Math.min(620, (180 * g.w) / g.h)), LH = (LW * g.h) / g.w, LX = 64, LY = 104;
    const R = reds();
    R.dim([LX, LY], [LX + LW, LY], [0, -1], { d: 32, value: String(Math.round(LW / PX)) });
    R.dim([LX + LW, LY], [LX + LW, LY + LH], [1, 0], { d: 32, value: String(Math.round(LH / PX)), place: 'side' });
    let html = `<div class="a" style="left:${LX}px;top:${LY}px;width:${LW}px">${ctx.logo.html('colour', { width: LW, colourway: 'colour', label: 'Your logo goes here' })}</div>`;
    const all = [B.lines.primary, ...B.lines.others], ly = Math.round(LY + LH + 72);
    html += `<span class="a c-label" style="left:64px;top:${ly}px">${all.length === 1 ? 'Line' : 'Lines'}</span>` + all.map((l, i) => `<p class="a bn nw" style="left:64px;top:${ly + 24 + i * Ld.line}px;font:500 ${Ld.size}px/${Ld.line}px var(--body);color:var(--b-text)">${A(l)}</p>`).join('');
    // the rules, numbered as general notes in the right half
    const RX = ZX[4] + 24, items = rules.map((r, i) => `<div style="display:grid;grid-template-columns:24px 1fr;row-gap:4px"><span class="c-mono" style="line-height:22px">${i + 1}</span><h3 class="c-head">${A(r.title)}</h3><span></span><p class="c-note">${A(r.text)}</p></div>`).join('');
    html += `<h3 class="a c-head" style="left:${RX}px;top:64px">${count(rules.length)} rules</h3><div class="a" style="left:${RX}px;top:102px;width:440px;display:flex;flex-direction:column;gap:24px">${items}</div>`;
    // the short boilerplate under the lines, at the lead size: what the brand is, in its own words
    const bw = 620, bpy = ly + 24 + all.length * Ld.line + 72;
    html += `<span class="a c-label" style="left:64px;top:${bpy}px">Short boilerplate</span><p class="a bn" style="left:64px;top:${bpy + 24}px;width:${bw}px;font:400 ${Ld.size}px/${Ld.line}px var(--body);color:var(--b-text)">${A(B.voice.boilerplate25)}</p>`;
    // the faces, each family named in itself and stacked under the rules, centred in the space above the palette
    const rulesEnd = 102 + rules.reduce((a, r) => a + 26 + linesOf(CHIVO, r.text, 13, 416) * 20, 0) + 24 * (rules.length - 1), fs = 72, fl = 80, pitch = fl + 20 + 32;
    const fy = Math.round((rulesEnd + (787 - rulesEnd - (2 * pitch - 32)) / 2) / 8) * 8, faces = [['Display', F.display, `var(--display)`, heaviestW(F.display)], ['Body', F.body, 'var(--body)', F.body.weights[0]]];
    html += faces.map(([role, f, fam, w], i) => `<p class="a nw" style="left:${RX}px;top:${fy + i * pitch}px;font:${w} ${fs}px/${fl}px ${fam};color:var(--b-text)">${A(f.family)}</p><span class="a c-label" style="left:${RX}px;top:${fy + i * pitch + fl + 4}px">${role}, ${f.weights.join(' ')}</span>`).join('');
    // the palette along the foot, each colour as wide as its share, closing against the frame and the title block
    const top = 787, h = 971 - top, cols = ctx.colours;
    let ws = cols.map((c) => Math.max(48, c.share * 1507)); const over = ws.reduce((a, b) => a + b, 0) - 1507; if (over > 0.01) { const k = ws.indexOf(Math.max(...ws)); ws[k] -= over; }
    let x = 40;
    cols.forEach((c, i) => {
      const w = ws[i], fg = onField(ctx, c), edge = ctx.ratio(c.hex, '#EEF1F2') < 1.3;
      html += `<div class="fld${edge ? ' edge' : ''}" style="left:${r1(x)}px;top:${top}px;width:${r1(w)}px;height:${h}px;background:${c.hex}"></div>`;
      if (w >= 160) html += `<span class="a nw" style="left:${r1(x + 16)}px;top:${top + 16}px;font:600 15px/20px var(--body);color:${fg}">${A(c.name)}</span><span class="a c-mono nw" style="left:${r1(x + 16)}px;top:${top + 40}px;color:${fg}">${A(c.hex)}</span><span class="a c-mono nw" style="left:${r1(x + 16)}px;top:${top + h - 32}px;color:${fg}">${Math.round(c.share * 100)}%</span>`;
      x += w;
    });
    html += `<div class="hl" style="left:40px;top:${top}px;width:1507px;background:var(--ink)"></div>`;
    return sheet(ctx, 'summary', { drawing: 'The brand on one page', scale: '[1:1], sizes in mm' }, `${html}${R.svg()}`);
  },

  // 033: the transmittal. Who to ask, set large in the display face, the issue record, and what this set holds and leaves out.
  'contact-scope'(ctx) {
    const B = ctx.brand, stem = displayStem(ctx), c = B.contact;
    const S = [112, 104, 96, 88, 80, 72, 64, 56].find((s) => inkW(stem, c.owner, s, -0.01) <= 680) || 56;
    let html = `<span class="a c-label" style="left:64px;top:72px">Who to ask</span><p class="a bd" style="left:64px;top:96px;font-size:${S}px;line-height:${S}px">${A(c.owner)}</p>`;
    html += `<p class="a nw" style="left:64px;top:${96 + S + 24}px;font:400 22px/26px var(--cmono);color:var(--ink)">${A(c.email)}</p>`;
    html += `<p class="a c-note" style="left:64px;top:${96 + S + 74}px;width:400px">${A(c.owner)} owns this set of drawings. Write for a logo file, a missing asset or an exception to a rule.</p>`;
    // the issue record: one row per revision, as a drawing's revision table
    const d = new Date(B.version.date + 'T00:00:00Z'), date = `${d.getUTCDate()} ${d.toLocaleDateString('en-AU', { month: 'long', year: 'numeric', timeZone: 'UTC' })}`;
    const T = [64, 136, 330, 520], ty = 800;
    html += `<h3 class="a c-head" style="left:64px;top:${ty - 48}px">Revisions</h3>` + ['Rev', 'Date', 'Description', 'By'].map((h, i) => `<span class="a c-label" style="left:${T[i]}px;top:${ty - 20}px">${h}</span>`).join('');
    html += `<div class="hl" style="left:64px;top:${ty}px;width:666px;background:var(--ink)"></div><span class="a c-mono" style="left:64px;top:${ty + 10}px">${A(B.version.number)}</span><span class="a c-note nw" style="left:136px;top:${ty + 8}px">${A(date)}</span><span class="a c-note nw" style="left:330px;top:${ty + 8}px">Issued for use</span><span class="a c-note nw" style="left:520px;top:${ty + 8}px">${A(c.owner)}</span><div class="hl" style="left:64px;top:${ty + 36}px;width:666px"></div>`;
    // the right half: the sections in this set with their sheet ranges, then what is kept elsewhere
    const RX = ZX[4] + 24, no = (n) => String(n).padStart(3, '0');
    html += `<h3 class="a c-head" style="left:${RX}px;top:64px">In this set</h3>`;
    ctx.sections.forEach((s, i) => {
      const y = 104 + i * 32, a = s.pages[0].no, b = s.pages.at(-1).no;
      html += `<div class="hl" style="left:${RX}px;top:${y}px;width:${1523 - RX}px"></div><span class="a c-mono" style="left:${RX}px;top:${y + 8}px;color:var(--quiet)">${String(s.n).padStart(2, '0')}</span><span class="a c-note nw" style="left:${RX + 40}px;top:${y + 6}px">${A(s.title)}</span><span class="a c-note nw" style="left:${ZX[7] + 24}px;top:${y + 6}px">Sheets <span class="v">${no(a)}</span>${a === b ? '' : ` to <span class="v">${no(b)}</span>`}</span>`;
    });
    const end = 104 + ctx.sections.length * 32;
    html += `<div class="hl" style="left:${RX}px;top:${end}px;width:${1523 - RX}px"></div>`;
    const not = [['Logo files, palettes and fonts', 'They are in the brand kit.'], ['Interface components and tokens', 'They are in the UI kit.'], ['Print specifications, CMYK and Pantone values', 'Ask your printer for a proof.']];
    html += `<h3 class="a c-head" style="left:${RX}px;top:${end + 56}px">Not in this set</h3><div class="a" style="left:${RX}px;top:${end + 94}px;width:520px;display:flex;flex-direction:column;gap:12px">${not.map(([a, b], i) => `<div style="display:grid;grid-template-columns:24px 1fr"><span class="c-mono" style="line-height:20px">${i + 1}</span><p class="c-note">${a}. <span class="c-quiet" style="color:var(--quiet)">${b}</span></p></div>`).join('')}</div>`;
    return sheet(ctx, 'contact-scope', { drawing: 'Contact and scope', scale: 'Not to scale' }, html);
  },
};

// the body weight a set line uses: 500 when the brand loads it, else the nearest it does
function mid(ctx) {
  const w = ctx.brand.fonts.body.weights;
  return w.includes(500) ? 500 : w.reduce((a, b) => (Math.abs(b - 500) < Math.abs(a - 500) ? b : a));
}
const heaviestW = (f) => f.weights[f.weights.length - 1];
// text on a colour field: the brand's own pair for that ground when one holds 4.5 : 1, else ink or white by ratio (as the palette sheet does)
function onField(ctx, c) {
  const own = ctx.pairs.filter((p) => p.bgHex.toUpperCase() === c.hex.toUpperCase()).sort((a, b) => b.ratio - a.ratio)[0];
  if (own && own.ratio >= 4.5) return own.fgHex;
  return ctx.ratio('#FFFFFF', c.hex) >= ctx.ratio('#1F2A33', c.hex) ? '#FFFFFF' : '#1F2A33';
}

export function css() {
  return '';
}
