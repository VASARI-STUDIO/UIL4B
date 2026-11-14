// Theme 29 (Blueprint), lane g4: the imagery and grid sheets (photo-direction, shot-list, imagery-rules, grid). layouts is round 1's own
// elevation sheet and stays as it is. Each page is a drawing doing a drafter's job: a photograph brief with general notes, a site photograph
// sheet, a schedule of typical details, and a page plan with an enlarged corner detail. Photographs come only from ctx.photo; a shot still to be
// taken is drawn as the drafter's void (film-2, crossed in hair). Redlines print only true sizes: the brand's page and its grid, in px.
import { esc as A } from '../../engine/brand.js';
import { wrap, inkW } from './measure.js';
import { sheet, reds, detailTag, ZX, r1 } from './lane-g1-sheet.js';
function jpegSize() { throw new Error('theme 29: photograph files are not read by the server export'); }

const CH = 'Chivo-400';
const svgAll = (s) => `<svg class="a" style="left:0;top:0" width="1587" height="1123" viewBox="0 0 1587 1123" fill="none" aria-hidden="true">${s}</svg>`;
// lines a string sets in at a width, from the face's own advances, with a few px of slack so the browser's break lands on the same count
const nl = (stem, t, s, w) => wrap(stem, String(t), s, w - 6).length;
const words = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen'];
const count = (n) => words[n] || String(n);
const low = (n) => (words[n] ? words[n].toLowerCase() : String(n));
const stemOf = (ctx, w) => (ctx.faces.find((f) => f.role === 'body' && f.weight === w && f.style !== 'italic') || ctx.faces.find((f) => f.role === 'body')).stem;
// the body weight a set line uses: 500 when the brand loads it, else the nearest it does
function mid(ctx) {
  const w = ctx.brand.fonts.body.weights;
  return w.includes(500) ? 500 : w.reduce((a, b) => (Math.abs(b - 500) < Math.abs(a - 500) ? b : a));
}
// a photograph pasted on the sheet: the real photo, or the shot still to be taken drawn as a void (crossed in hair) with its brief on a film tab
// when note is set. n is the shot's number on a 28 px film tag at the top left corner, as round 1's photo sheets number theirs.
// the object-position that centres the shot's focus (brand.json `focus`, fractions of the picture) in a w x h frame, clamped to the picture
function focusPos(ctx, s, w, h) {
  if (!s.photo || !Array.isArray(s.focus) || s.focus.length !== 2) return undefined;
  const n = jpegSize();
  if (!n) return undefined;
  const k = Math.max(w / n.w, h / n.h), pct = (full, view, fc) => (full - view > 0.5 ? (Math.min(Math.max(fc * full - view / 2, 0), full - view) / (full - view)) * 100 : 50);
  return `${r1(pct(n.w * k, w, s.focus[0]))}% ${r1(pct(n.h * k, h, s.focus[1]))}%`;
}
function frame(ctx, s, x, y, w, h, { n, note = false, pos } = {}) {
  const W = r1(w), H = r1(h);
  pos = pos || focusPos(ctx, s, w, h);
  const inner = s.photo
    ? ctx.photo(s.id, { pos, style: 'width:100%;height:100%' })
    : `<svg class="a" style="left:0;top:0" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" fill="none" stroke="var(--hair)" stroke-width="1" aria-hidden="true"><path d="M0 0L${W} ${H}M${W} 0L0 ${H}"/></svg>${ctx.photo(s.id, { slotNote: note })}`;
  const tag = n ? `<span class="g4-tag c-mono">${n}</span>` : '';
  return `<div class="g4f" style="left:${r1(x)}px;top:${r1(y)}px;width:${W}px;height:${H}px">${inner}${tag}</div>`;
}
const shotNo = (ctx, s) => ctx.brand.imagery.shots.indexOf(s) + 1;

export const guidelines = {
  // the photograph brief: one photograph of the brand's own, edge to edge from zone line 2 to the frame, and the direction as general notes
  // down the left column, each under a detail tag
  'photo-direction'(ctx) {
    const B = ctx.brand, D = B.imagery.direction, shots = B.imagery.shots;
    const s = shots.find((x) => x.photo) || shots[0], n = shotNo(ctx, s);
    const items = [['Subject', D.subject], ['Light', D.light], ['Crop', D.crop], ['Colour', D.colour], ['People', D.people]].filter(([, v]) => v);
    const TX = 104, TW = ZX[2] - 24 - TX;
    const hs = items.map(([, v]) => 22 + 8 + nl(CH, v, 13, TW) * 20);
    // what the photograph is, held on the content floor under the notes
    // a generated photograph carries no credit line; a real photographer's is named once
    const shown = s.photo ? `${A(s.caption)}. Shot ${n}${s.generated || !s.credit ? '' : `, a photograph from ${A(s.credit)}`}.` : `Shot ${n}, still to be photographed. Its brief is in the frame.`;
    const sh = 16 + 8 + nl(CH, shown, 13, ZX[2] - 24 - 64) * 20, sy = 947 - sh;
    const room = sy - 48 - 104, gap = Math.max(24, Math.min(48, (room - hs.reduce((a, b) => a + b, 0)) / Math.max(1, items.length - 1)));
    let y = 104, html = `<h3 class="a c-head" style="left:64px;top:64px">General notes</h3>`;
    items.forEach(([k, v], i) => {
      html += detailTag(64 + 14, y + 11, i + 1) + `<h3 class="a c-head nw" style="left:${TX}px;top:${r1(y)}px">${k}</h3><p class="a c-note" style="left:${TX}px;top:${r1(y + 30)}px;width:${TW}px">${A(v)}</p>`;
      y += hs[i] + gap;
    });
    html += `<span class="a c-label" style="left:64px;top:${r1(sy)}px">Shown</span><p class="a c-note" style="left:64px;top:${r1(sy + 24)}px;width:${ZX[2] - 24 - 64}px">${shown}</p>`;
    const inner = frame(ctx, s, ZX[2], 40, 1547 - ZX[2], 931, { n, note: true }) + html;
    return sheet(ctx, 'photo-direction', { drawing: 'Photograph brief', scale: 'Not to scale' }, inner);
  },

  // the site photograph sheet: every shot pasted in two rows on the zone lines, numbered at its corner, its caption under it. The wide frame
  // swaps sides between the rows, so the sheet never reads as a grid of cards.
  'shot-list'(ctx) {
    const shots = ctx.brand.imagery.shots, n = shots.length;
    const rows = n <= 3 ? [shots] : [shots.slice(0, Math.ceil(n / 2)), shots.slice(Math.ceil(n / 2))];
    const units = (m, r) => (m === 3 ? (r === 0 ? [2, 1, 1] : [1, 1, 2]) : m === 2 ? (r === 0 ? [3, 1] : [1, 3]) : m === 1 ? [4] : Array(m).fill(4 / m));
    const U = 1507 / 4;
    // the caption under each frame: the shot's own words, then where it stands
    const showCr = new Set(); { const seen = new Set(); shots.forEach((s) => { if (s.photo && !s.generated && s.credit && !seen.has(s.credit)) { seen.add(s.credit); showCr.add(s.id); } }); }
    const capH = (s, w) => (s.photo ? 22 + 4 + nl(CH, s.alt, 13, w) * 20 + (showCr.has(s.id) ? 4 + 16 : 0) : nl(CH, s.slot, 13, w) * 20 + 4 + 16);
    const plan = rows.map((row, r) => {
      const u = units(row.length, r);
      let x = 40;
      const cells = row.map((s, i) => { const w = u[i] * U, c = { s, x, w }; x += w; return c; });
      return { cells, ch: Math.max(...cells.map((c) => capH(c.s, c.w - 48))) };
    });
    const hf = Math.floor((907 - plan.reduce((a, p) => a + 16 + p.ch, 0) - (plan.length - 1) * 32) / plan.length);
    let y = 40, html = '';
    plan.forEach((p) => {
      p.cells.forEach((c, i) => {
        // 8 px between frames that meet; an outer edge runs to the frame
        const l = c.x + (i ? 4 : 0), rgt = c.x + c.w - (i < p.cells.length - 1 ? 4 : 0), s = c.s, no = shotNo(ctx, s), cy = y + hf + 16, tx = c.x + 24, tw = c.w - 48;
        html += frame(ctx, s, l, y, rgt - l, hf, { n: no });
        html += s.photo
          ? `<div class="a" style="left:${r1(tx)}px;top:${r1(cy)}px;width:${r1(tw)}px;display:flex;flex-direction:column;gap:4px"><h3 class="c-head">${A(s.caption)}</h3><p class="c-note">${A(s.alt)}</p>${showCr.has(s.id) ? `<span class="c-label">Photograph, ${A(s.credit)}</span>` : ''}</div>`
          : `<div class="a" style="left:${r1(tx)}px;top:${r1(cy)}px;width:${r1(tw)}px;display:flex;flex-direction:column;gap:4px"><p class="c-note">${A(s.slot)}</p><span class="c-label">To be shot to this brief</span></div>`;
      });
      y += hf + 16 + p.ch + 32;
    });
    return sheet(ctx, 'shot-list', { drawing: 'Photograph schedule', scale: 'Not to scale' }, html);
  },

  // a schedule of typical details: one row a rule, the example pasted in at the frame, what to do set in the brand's face and what not to do
  // beside it, the way a door schedule pairs each type with its notes
  'imagery-rules'(ctx) {
    const B = ctx.brand, R = B.imagery.rules, n = R.length, shots = B.imagery.shots;
    // real photographs first, so a rule is shown with a picture wherever the brand has one
    const pool = [...shots.filter((s) => s.photo), ...shots.filter((s) => !s.photo)];
    const top = 98, rh = (971 - top) / n, bw = mid(ctx), stem = stemOf(ctx, bw), stem4 = stemOf(ctx, B.fonts.body.weights[0]);
    const DX = ZX[2] + 64, DW = ZX[5] - 24 - DX, NX = ZX[5] + 24, NW = 1523 - NX;
    const fits = (s, lh) => R.every((r) => Math.max(nl(stem, r.do, s, DW), nl(stem4, r.dont, s, NW)) * lh <= rh - 48);
    const [S, LH] = [[28, 36], [26, 34], [24, 32], [22, 30], [20, 28], [18, 26], [16, 24]].find(([s, l]) => fits(s, l)) || [16, 24];
    let svg = `<path d="M40 ${top - 1.5}H1547" stroke="var(--ink)" stroke-width="1.5"/>`;
    let html = [['Example', 64], ['Do', DX], ["Don't", NX]].map(([h, x]) => `<span class="a c-label" style="left:${r1(x)}px;top:68px">${h}</span>`).join('');
    R.forEach((r, i) => {
      const y = top + i * rh, s = pool[i % pool.length];
      const t = y + (i ? 4 : 0), b = y + rh - (i < n - 1 ? 4 : 0);
      html += frame(ctx, s, 40, t, ZX[2] - 40, b - t, { n: shotNo(ctx, s) });
      if (i) svg += `<path d="M${r1(ZX[2])} ${r1(y) + 0.5}H1547" stroke="var(--hair)" stroke-width="1"/>`;
      html += detailTag(ZX[2] + 24 + 14, y + 24 + Math.min(LH, 28) / 2, i + 1);
      html += `<p class="a bn" style="left:${r1(DX)}px;top:${r1(y + 24)}px;width:${r1(DW)}px;font:${bw} ${S}px/${LH}px var(--body);color:var(--b-text);text-wrap:pretty">${A(r.do)}</p>`;
      html += `<p class="a bn" style="left:${r1(NX)}px;top:${r1(y + 24)}px;width:${r1(NW)}px;font:${B.fonts.body.weights[0]} ${S}px/${LH}px var(--body);color:var(--quiet);text-wrap:pretty">${A(r.dont)}</p>`;
    });
    return sheet(ctx, 'imagery-rules', { drawing: 'Typical details', scale: 'Not to scale' }, svgAll(svg) + html);
  },

  // the brand's page drawn as a plan at a true scale, its columns hatched, with the top left corner enlarged as detail 1 so the margin, a column,
  // a gutter and the base unit can be read. Every value is the page's own in px, from ctx.gridMeasures.
  grid(ctx) {
    const G = ctx.gridMeasures, P = G.page, m = G.margin, g = G.gutter, c = G.col, base = G.base, cols = G.columns;
    const KS = [[1, '1:1'], [3 / 4, '3:4'], [2 / 3, '2:3'], [1 / 2, '1:2'], [2 / 5, '2:5'], [1 / 3, '1:3'], [1 / 4, '1:4']];
    const [k, kl] = KS.find(([s]) => P.w * s <= 760 && P.h * s <= 749) || KS[KS.length - 1];
    const PX0 = 160, PY0 = 144, PW = P.w * k, PH = P.h * k;
    const R = reds();
    let svg = '', html = '';
    // hatching: 45 degree hair lines at a 7 px pitch, clipped to each column band
    svg += `<defs><pattern id="g4h" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V7" stroke="var(--hair)" stroke-width="1"/></pattern></defs>`;
    const bands = (ox, oy, s, x1, y1) => {
      // the column bands of the page at scale s from (ox, oy), cut at x1 and y1 (page px) where the view stops
      let o = '';
      for (let i = 0; i < cols; i++) {
        const a = m + i * (c + g), e = Math.min(a + c, x1);
        if (a >= x1) break;
        const b = Math.min(P.h - m, y1);
        o += `<rect x="${r1(ox + a * s)}" y="${r1(oy + m * s)}" width="${r1((e - a) * s)}" height="${r1((b - m) * s)}" fill="url(#g4h)" stroke="none"/>`;
        o += `<path d="M${r1(ox + a * s)} ${r1(oy + m * s)}V${r1(oy + b * s)}${e === a + c ? `M${r1(ox + e * s)} ${r1(oy + m * s)}V${r1(oy + b * s)}` : ''}" stroke="var(--quiet)" stroke-width=".75"/>`;
      }
      return o;
    };
    // the plan: the page edge in ink, the margin line dashed, the columns hatched and numbered under the page
    svg += bands(PX0, PY0, k, P.w, P.h);
    svg += `<rect x="${r1(PX0)}" y="${r1(PY0)}" width="${r1(PW)}" height="${r1(PH)}" stroke="var(--ink)" stroke-width="1"/>`;
    svg += `<rect x="${r1(PX0 + m * k)}" y="${r1(PY0 + m * k)}" width="${r1((P.w - 2 * m) * k)}" height="${r1((P.h - 2 * m) * k)}" stroke="var(--quiet)" stroke-width="1" stroke-dasharray="6 4"/>`;
    for (let i = 0; i < cols; i++) {
      const cx = PX0 + (m + i * (c + g) + c / 2) * k;
      html += `<span class="a c-mono" style="left:${r1(cx - 12)}px;top:${r1(PY0 + PH + 8)}px;width:24px;text-align:center;color:var(--quiet)">${i + 1}</span>`;
    }
    R.dim([PX0, PY0], [PX0 + PW, PY0], [0, -1], { d: 32, value: `${P.w} px` });
    R.dim([PX0, PY0], [PX0, PY0 + PH], [-1, 0], { d: 32, value: `${P.h} px`, place: 'left' });
    html += `<h3 class="a c-head nw" style="left:${PX0}px;top:${r1(PY0 + PH + 36)}px">Page plan</h3><span class="a c-label nw" style="left:${r1(PX0 + 96)}px;top:${r1(PY0 + PH + 40)}px">Scale <span class="v">${kl}</span></span>`;

    // detail 1: margin, two columns and two gutters and half a third column wide, three quarters of that deep, enlarged to the largest scale that fits
    const rw = m + 2 * (c + g) + c / 2, rh = rw * 0.75;
    const DX0 = PX0 + PW + 128, room = 1523 - DX0;
    const SS = [[4, '4:1'], [3, '3:1'], [5 / 2, '5:2'], [2, '2:1'], [3 / 2, '3:2'], [1, '1:1']];
    const [S, sl] = SS.find(([s]) => rw * s <= room) || SS[SS.length - 1];
    const DY0 = PY0, DW = rw * S, DH = rh * S;
    // the detail's boundary on the plan, as a chain line, and its tag
    const bx = PX0 - 6, by = PY0 - 6, bw2 = rw * k + 12, bh = rh * k + 12;
    svg += `<rect x="${r1(bx)}" y="${r1(by)}" width="${r1(bw2)}" height="${r1(bh)}" stroke="var(--ink)" stroke-width="1" stroke-dasharray="12 3 2 3"/>`;
    const tx = bx + bw2 + 22, ty = by + bh + 22;
    svg += `<path d="M${r1(bx + bw2)} ${r1(by + bh)}L${r1(tx - 10)} ${r1(ty - 10)}" stroke="var(--ink)" stroke-width="1"/><circle cx="${r1(tx)}" cy="${r1(ty)}" r="14" fill="var(--film)" stroke="none"/>`;
    html += detailTag(tx, ty, 1);
    // the detail: page edges solid along the top and left, break lines where the view is cut, the base unit ticked along the top edge
    svg += bands(DX0, DY0, S, rw, rh);
    svg += `<path d="M${r1(DX0)} ${r1(DY0 + DH)}V${r1(DY0)}H${r1(DX0 + DW)}" stroke="var(--ink)" stroke-width="1"/>`;
    svg += `<path d="M${r1(DX0 + m * S)} ${r1(DY0 + DH)}V${r1(DY0 + m * S)}H${r1(DX0 + DW)}" stroke="var(--quiet)" stroke-width="1" stroke-dasharray="6 4"/>`;
    const brk = (x1, y1, x2, y2) => {
      // a drafter's break line: straight, with one zigzag at its middle
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, v = x1 === x2;
      const z = v ? `L${r1(mx)} ${r1(my - 10)}L${r1(mx + 8)} ${r1(my - 4)}L${r1(mx - 8)} ${r1(my + 4)}L${r1(mx)} ${r1(my + 10)}` : `L${r1(mx - 10)} ${r1(my)}L${r1(mx - 4)} ${r1(my - 8)}L${r1(mx + 4)} ${r1(my + 8)}L${r1(mx + 10)} ${r1(my)}`;
      return `<path d="M${r1(x1)} ${r1(y1)}${z}L${r1(x2)} ${r1(y2)}" stroke="var(--ink)" stroke-width=".75"/>`;
    };
    svg += brk(DX0 + DW, DY0 - 12, DX0 + DW, DY0 + DH + 12) + brk(DX0 - 12, DY0 + DH, DX0 + DW + 12, DY0 + DH);
    for (let i = 1, x = base; x < rw; i++, x += base) svg += `<path d="M${r1(DX0 + x * S)} ${r1(DY0)}v${i % 4 ? 4 : 8}" stroke="var(--quiet)" stroke-width=".75"/>`;
    // the chain along the top: margin, column, gutter; the top margin down the left
    R.dim([DX0, DY0], [DX0 + m * S, DY0], [0, -1], { d: 32, value: `${m} px` });
    R.dim([DX0 + m * S, DY0], [DX0 + (m + c) * S, DY0], [0, -1], { d: 32, value: `${ctx.fmt(c)} px` });
    R.dim([DX0 + (m + c) * S, DY0], [DX0 + (m + c + g) * S, DY0], [0, -1], { d: 32, value: `${g} px` });
    R.dim([DX0, DY0], [DX0, DY0 + m * S], [-1, 0], { d: 32, value: `${m} px`, place: 'left' });
    // the detail title under the view: its tag, its name on a heavy rule, its scale
    const tY = DY0 + DH + 40;
    html += detailTag(DX0 + 14, tY + 14, 1) + `<h3 class="a c-head nw" style="left:${r1(DX0 + 40)}px;top:${r1(tY + 1)}px">Corner detail</h3><span class="a c-label nw" style="left:${r1(DX0 + 40)}px;top:${r1(tY + 34)}px">Scale <span class="v">${sl}</span></span>`;
    svg += `<path d="M${r1(DX0 + 40)} ${r1(tY + 27)}H${r1(DX0 + 40 + inkW('Chivo-500', 'Corner detail', 15) + 32)}" stroke="var(--ink)" stroke-width="1.5"/>`;

    // general notes under the detail, every figure from the grid
    const whole = m % base === 0 && g % base === 0;
    const notes = [
      `${count(cols)} columns on a ${P.w} × ${P.h} px page, sizes in px.`,
      `Margins ${m} px all round and gutters ${g} px, so each column is ${ctx.fmt(c)} px wide.`,
      ...(whole ? [`The margin is ${low(m / base)} steps of the ${base} px base and a gutter is ${low(g / base)}. The ticks along the detail's top edge are the base.`] : []),
      'Type and pictures start and stop on a column edge, inside the dashed margin line.',
    ];
    const NY = tY + 88, NX = DX0, NW = Math.min(440, 1523 - NX);
    html += `<h3 class="a c-head" style="left:${r1(NX)}px;top:${r1(NY)}px">General notes</h3><div class="a" style="left:${r1(NX)}px;top:${r1(NY + 38)}px;width:${r1(NW)}px;display:flex;flex-direction:column;gap:12px">${notes.map((t, i) => `<div style="display:grid;grid-template-columns:24px 1fr"><span class="c-mono" style="line-height:20px">${i + 1}</span><p class="c-note">${A(t)}</p></div>`).join('')}</div>`;
    return sheet(ctx, 'grid', { drawing: 'Page grid', scale: `[${kl}], [${sl}] as noted` }, svgAll(svg) + html + R.svg());
  },
};

export function css() {
  return `.pg .g4f{position:absolute;overflow:hidden;background:var(--film2);isolation:isolate}
.pg .g4f>img,.pg .g4f>svg.pl,.pg .g4f>.photo-slot{position:absolute;left:0;top:0;width:100%;height:100%}
.pg .g4f>.photo-slot{box-sizing:border-box;background:transparent;display:flex;align-items:flex-end;padding:24px;box-shadow:inset 0 0 0 1px var(--hair)}
.pg .g4f>.photo-slot>span{position:relative;z-index:1;background:var(--film);padding:12px 16px;font:400 15px/22px var(--chrome);color:var(--ink);max-width:420px;text-wrap:pretty}
.pg .g4f>.g4-tag{position:absolute;left:0;top:0;z-index:2;width:28px;height:28px;background:var(--film);text-align:center;line-height:28px}
`;
}
