// Lane g4 for theme 28 (Riso): the imagery and layout pages (photo-direction, shot-list, imagery-rules, grid). Layouts is round 1's.
// Each page is one sheet off the press, made by sheet(): a plate, a pass and a hit. As in lanes g1 and g2, the hit numeral is always a real count
// taken from ctx (the direction's notes, the shots, the rules, the brand page's columns), and the plate's words say what it counts.
// A photograph is never misregistered, mottled or overprinted (spec never-do 1): it sits clean on the paper. The one exception is the spoil on the
// imagery rules page, where the brand's own photograph is shown run through two drums as a duotone, said so in its caption, as what never to do.
// Brand copy is printed whole through A(); text is measured only to choose a size, and the browser wraps it, so a slot placeholder still fits.
import { sheet, A, wrap, inkW, faceFor, faceCss, pressOf, val, X0 } from './sheet.js';

const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen'];
const word = (n) => WORDS[n] || String(n);
const Word = (n) => { const w = word(n); return w[0].toUpperCase() + w.slice(1); };
const no2 = (n) => String(n).padStart(2, '0');
const r1 = (n) => Math.round(n * 10) / 10;
const stem = (ctx, role, weight = 400) => faceFor(ctx, role, weight).stem;
// lines a text takes at this size: measured 12 px narrower than it is set, so the browser never wraps sooner than the count says
const nLines = (st, t, size, w) => wrap(st, String(t || ''), size, w - 12).length;
const fit = (st, texts, sizes, w, maxLines) => sizes.find(([s]) => texts.every((t) => nLines(st, t, s, w) <= maxLines && (maxLines > 1 || inkW(st, String(t || ''), s) <= w - 12))) || sizes[sizes.length - 1];
const plateLabel = (t, x = 403) => `<p class="a c-label" style="left:${x}px;top:48px;color:var(--ptxt)">${t}</p>`;
const plateNote = (t, x, y, w) => `<p class="a c-body" style="left:${x}px;top:${y}px;width:${w}px;color:var(--ptxt)">${t}</p>`;
const hair = (y, x = X0, w = 578) => `<i class="a g4-hr" style="left:${x}px;top:${y}px;width:${w}px"></i>`;
// a brand colour's name from its hex
const hexName = (ctx, hex) => { const c = ctx.colours.find((x) => x.hex.toUpperCase() === String(hex).toUpperCase()); return c ? A(c.name) : val(String(hex).toUpperCase()); };
// the photograph in a box: a real photo fills it; a slot is a key field with a dashed keyline and (when there is room) the slot's own direction
const photoBox = (ctx, id, x, y, w, h, { note = true, cls = '' } = {}) => {
  const s = ctx.shot(id), slot = !s.photo;
  const tag = slot && !note ? `<p class="a c-note nw" style="left:14px;bottom:12px;color:var(--paper)">Photo slot</p>` : '';
  return `<div class="g4-ph ${cls}" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px">${ctx.photo(id, { slotNote: note })}${tag}${cls ? '<i></i>' : ''}</div>`;
};
// the direction's notes, in the brand's order; a key the theme has no label for is shown with its first letter raised
const NOTE = { subject: 'Subject', light: 'Light', crop: 'Crop', colour: 'Colour', color: 'Colour', people: 'People' };
const noteLabel = (k) => NOTE[k] || k[0].toUpperCase() + k.slice(1);

export function css() {
  return `.pg .g4-hr{display:block;height:0;border-top:.5px solid var(--hair)}
.pg .g4-ph{position:absolute;overflow:hidden;background:var(--key)}
.pg .g4-ph img,.pg .g4-ph svg.pl{width:100%;height:100%}
.pg .g4-ph .photo-slot{position:absolute;inset:0;background:var(--key)}
.pg .g4-ph .photo-slot::after{content:'';position:absolute;inset:8px;border:1px dashed var(--paper)}
.pg .g4-ph .photo-slot span{position:absolute;right:16px;bottom:12px;width:224px;font:400 12px/17px var(--chrome);color:var(--paper);text-align:right}
.pg .g4-duo{isolation:isolate}
.pg .g4-duo img,.pg .g4-duo svg.pl{filter:grayscale(1) contrast(1.08)}
.pg .g4-duo>i{position:absolute;inset:0;background:var(--plate);mix-blend-mode:multiply}
.pg .g4-tk{position:absolute;display:block;background:var(--key)}
.pg .g4-col{position:absolute;background:var(--plate);mix-blend-mode:multiply}
.pg .g4-pg{position:absolute;background:var(--paper);box-shadow:inset 0 0 0 .5px var(--hair)}
`;
}

// a dimension line in the key: a hairline from x to x + w with an end tick at each side, at y
const dimH = (x, y, w) => `<i class="g4-tk" style="left:${r1(x)}px;top:${r1(y)}px;width:${r1(w)}px;height:.5px"></i><i class="g4-tk" style="left:${r1(x)}px;top:${r1(y - 4)}px;width:.5px;height:8.5px"></i><i class="g4-tk" style="left:${r1(x + w - 0.5)}px;top:${r1(y - 4)}px;width:.5px;height:8.5px"></i>`;
const dimV = (x, y, h) => `<i class="g4-tk" style="left:${r1(x)}px;top:${r1(y)}px;width:.5px;height:${r1(h)}px"></i><i class="g4-tk" style="left:${r1(x - 4)}px;top:${r1(y)}px;width:8.5px;height:.5px"></i><i class="g4-tk" style="left:${r1(x - 4)}px;top:${r1(y + h - 0.5)}px;width:8.5px;height:.5px"></i>`;
const fmt = (n) => (Math.abs(n - Math.round(n)) < 0.05 ? String(Math.round(n)) : n.toFixed(1));

export const guidelines = {
  // Photo direction: the lead shot printed large and clean under the plate, and the direction's notes under it, one to a band of paper.
  // The hit is the number of notes every photograph is held to.
  'photo-direction'(ctx) {
    const B = ctx.brand, D = B.imagery.direction, keys = Object.keys(D), n = keys.length, s0 = B.imagery.shots[0];
    const bst = stem(ctx, 'body', 400);
    const [ts, tl] = fit(bst, keys.map((k) => D[k]), [[15, 22], [14, 21], [13, 19]], 460, 4);
    const rh = keys.map((k) => nLines(bst, D[k], ts, 460) * tl + 28), rowsH = rh.reduce((a, b) => a + b, 0);
    const capH = s0.photo ? 25 : 0, top = 264;
    const ph = Math.max(240, Math.min(400, 1048 - top - 40 - capH - rowsH));
    let y = top + ph + capH + 40, rows = '';
    keys.forEach((k, i) => {
      rows += `${hair(y)}<p class="a c-label" style="left:49px;top:${y + 16}px">${noteLabel(k)}</p>
<p class="a" style="left:167px;top:${y + 12}px;width:460px;${faceCss(ctx, 'body', 400)};font-size:${ts}px;line-height:${tl}px">${A(D[k])}</p>`;
      y += rh[i];
    });
    const cap = s0.photo ? `<p class="a c-note" style="left:49px;top:${top + ph + 8}px;width:578px">${A(s0.caption || s0.alt)}${s0.credit && !s0.generated ? `. Photograph: ${A(s0.credit)}.` : ''}</p>` : '';
    const inner = `${plateLabel('Photo direction')}
${plateNote(`${Word(n)} notes every photograph is held to. It prints clean, as it was shot: no ink from the press goes over it.`, 403, 72, 224)}
${photoBox(ctx, s0.id, 49, top, 578, ph)}${cap}${rows}`;
    return sheet(ctx, 'photo-direction', { hp: 232, hit: { text: String(n), x: 49, base: 200, size: 200, maxW: 300 } }, inner);
  },

  // Shot list: the job ticket for the shoot. One shot to a band: its number, the photograph (or the slot to fill), and what it shows or must show.
  // The hit is the number of shots; the plate says how many are photographed and how many are still to shoot.
  'shot-list'(ctx) {
    const S = ctx.brand.imagery.shots, n = S.length, np = S.filter((s) => s.photo).length, ns = n - np;
    const bst = stem(ctx, 'body', 400), top = 232, rowH = Math.min(160, Math.floor((1048 - top) / n)), thH = rowH - 24;
    const texts = S.map((s) => (s.photo ? s.alt : s.slot));
    const [ts, tl] = fit(bst, texts, [[14, 21], [13, 19], [12, 17]], 306, Math.floor((thH - 24 - 20) / 17));
    // a credit prints only for a real photographer (a generated shot has none), and once on the page, not under every shot
    let creditDone = false;
    const rows = S.map((s, i) => {
      const y = top + i * rowH;
      const head = s.photo ? A(s.caption || s.alt) : 'Still to shoot';
      const credited = s.photo && s.credit && !s.generated && !creditDone;
      if (credited) creditDone = true;
      const foot = credited ? `<p class="a c-note" style="left:321px;top:${y + 12 + thH - 17}px;width:306px">Photographed. Credit: ${A(s.credit)}.</p>` : '';
      return `${hair(y)}${photoBox(ctx, s.id, 49, y + 12, 224, thH, { note: false })}
<p class="a c-value" style="left:285px;top:${y + 15}px">${no2(i + 1)}</p>
<p class="a" style="left:321px;top:${y + 12}px;width:306px;${faceCss(ctx, 'body', 600)};font-size:14px;line-height:20px">${head}</p>
<p class="a" style="left:321px;top:${y + 36}px;width:306px;${faceCss(ctx, 'body', 400)};font-size:${ts}px;line-height:${tl}px">${A(s.photo ? s.alt : s.slot)}</p>${foot}`;
    }).join('');
    const said = ns === 0 ? 'all of them photographed' : np === 0 ? 'each one still to shoot, from the direction written in its slot' : `${word(np)} photographed and ${word(ns)} still to shoot`;
    const inner = `${plateLabel('Shot list')}
${plateNote(`${Word(n)} shots, ${said}.`, 403, 72, 224)}${rows}`;
    return sheet(ctx, 'shot-list', { hp: 200, hit: { text: String(n), x: 49, base: 168, size: 160, maxW: 300 } }, inner);
  },

  // Imagery rules: the brand's rules as the press sorts its sheets, the ones kept for the stack and the spoils. At the head of the paper, one
  // photograph kept clean beside the same photograph spoiled: run through the key and plate drums as a duotone, said so in its caption.
  // A brand with no photographs yet shows its slot alone. The hit is the number of rules.
  'imagery-rules'(ctx) {
    const B = ctx.brand, P = pressOf(ctx), R = B.imagery.rules, n = R.length, S = B.imagery.shots;
    const ex = S.find((s) => s.photo && s.id !== S[0].id) || S.find((s) => s.photo) || S[1] || S[0];
    const bst = stem(ctx, 'body', 400), wst = stem(ctx, 'body', 600);
    const [ds, dl] = fit(wst, R.map((r) => r.do), [[16, 23], [15, 22], [14, 21]], 272, 3);
    const rh = R.map((r) => Math.max(nLines(wst, r.do, ds, 272) * dl, nLines(bst, r.dont, 14, 282) * 21) + 32), rowsH = rh.reduce((a, b) => a + b, 0);
    const keyName = hexName(ctx, P.key), plateName = hexName(ctx, P.plate);
    const pair = !!ex.photo, cw = pair ? 283 : 578;
    const capKeep = `Kept. The photograph as it was shot, printed clean in its own colour.`;
    const capSpoil = `Spoiled. The same photograph turned to grey and overprinted in ${plateName}, as a two-ink duotone of ${keyName} and ${plateName}. A photograph never takes an ink from the press.`;
    const capH = Math.max(nLines(bst, capKeep, 12, cw), pair ? nLines(bst, capSpoil, 12, cw) : 0) * 17;
    const top = 264, ph = Math.max(160, Math.min(pair ? 240 : 360, 1048 - top - 8 - capH - 40 - 24 - rowsH));
    let ex1 = `${photoBox(ctx, ex.id, 49, top, cw, ph)}<p class="a c-note" style="left:49px;top:${top + ph + 8}px;width:${cw}px">${pair ? capKeep : `Kept. A photograph prints clean, in its own colour, and never takes an ink from the press. Until this one is shot, its slot holds the place.`}</p>`;
    if (pair) ex1 += `${photoBox(ctx, ex.id, 344, top, cw, ph, { cls: 'g4-duo' })}<p class="a c-note" style="left:344px;top:${top + ph + 8}px;width:${cw}px">${capSpoil}</p>`;
    let y = top + ph + 8 + capH + 40;
    let rows = `<p class="a c-label" style="left:49px;top:${y}px">Keep</p><p class="a c-label" style="left:344px;top:${y}px">Spoil</p>`;
    y += 24;
    R.forEach((r, i) => {
      rows += `${hair(y)}<p class="a" style="left:49px;top:${y + 14}px;width:272px;${faceCss(ctx, 'body', 600)};font-size:${ds}px;line-height:${dl}px">${A(r.do)}</p>
<p class="a c-body" style="left:344px;top:${y + 15}px;width:283px">${A(r.dont)}</p>`;
      y += rh[i];
    });
    const inner = `${plateLabel('Imagery rules')}
${plateNote(`${Word(n)} rules: what goes on the stack, and what goes in the spoil pile.`, 403, 72, 224)}${ex1}${rows}`;
    return sheet(ctx, 'imagery-rules', { hp: 232, hit: { text: String(n), x: 49, base: 200, size: 200, maxW: 300 } }, inner);
  },

  // Grid: the brand's own page grid. The whole page is drawn to scale with its columns printed by the pass drum, and its top left corner is
  // drawn again at full size, where the margin, a column and a gutter are measured. The hit is the number of columns.
  grid(ctx) {
    const B = ctx.brand, L = B.layout, pw = L.page.w, phh = L.page.h, m = L.margin, n = L.columns, g = L.gutter, base = L.base;
    const cwid = (pw - 2 * m - (n - 1) * g) / n;
    const colCls = 'mot'; // the plate drum prints the columns, a solid with its mottle
    // the page at scale k, at (x, y): paper with a hairline edge, and the columns from the top margin to the bottom margin
    const page = (x, y, k) => {
      let c = '';
      for (let i = 0; i < n; i++) c += `<i class="g4-col ${colCls}" style="left:${r1((m + i * (cwid + g)) * k)}px;top:${r1(m * k)}px;width:${r1(cwid * k)}px;height:${r1((phh - 2 * m) * k)}px"></i>`;
      return `<div class="g4-pg" style="left:${x}px;top:${y}px;width:${r1(pw * k)}px;height:${r1(phh * k)}px;isolation:isolate">${c}</div>`;
    };
    // the top left corner at full size (1 px of the brand page = 1 px here), w x h of it: margin, columns and gutters as far as they go
    const corner = (x, y, w, h) => {
      let c = '', lab = '', cx = m;
      for (let i = 0; i < n && cx < w; i++) {
        const cw = Math.min(cwid, w - cx);
        c += `<i class="g4-col ${colCls}" style="left:${r1(cx)}px;top:${m}px;width:${r1(cw)}px;height:${Math.max(0, h - m)}px"></i>`;
        cx += cwid + g;
      }
      // the base unit as a ruler down the margin: a tick every base px, a long one every fourth
      let rul = '';
      for (let t = 0, k = 0; t <= h; t += base, k++) rul += `<i class="g4-tk" style="left:0;top:${t}px;width:${k % 4 === 0 ? 10 : 5}px;height:.5px"></i>`;
      // dimension rows above the corner: margin, then column 1 and gutter 1 (the gutter's label sits one row higher, so narrow ones never collide)
      const dy = y - 12;
      lab += dimH(x, dy, m) + `<p class="a c-value nw" style="left:${x}px;top:${dy - 20}px">${fmt(m)}</p>`;
      lab += dimH(x + m, dy, cwid) + `<p class="a c-value nw" style="left:${r1(x + m + 4)}px;top:${dy - 20}px">${fmt(cwid)}</p>`;
      lab += dimH(x + m + cwid, dy - 24, g) + `<p class="a c-value nw" style="left:${r1(x + m + cwid + g + 4)}px;top:${dy - 31}px">${fmt(g)}</p>`;
      lab += dimV(x - 12, y, m) + `<p class="a c-value nw" style="right:${794 - (x - 20)}px;top:${y + m / 2 - 7}px">${fmt(m)}</p>`;
      return `<div class="g4-pg" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;isolation:isolate;box-shadow:inset .5px .5px 0 0 var(--hair)">${c}${rul}</div>${lab}`;
    };
    const top = 264, wide = pw >= phh;
    let art = '';
    if (wide) {
      // a landscape page: the whole page across the five columns, the corner under it
      const k = 578 / pw, h = phh * k;
      art += page(49, top, k);
      art += `<p class="a c-note" style="left:49px;top:${r1(top + h + 8)}px;width:578px">The whole page at ${Math.round(k * 100)}%, ${val(`${pw} × ${phh} px`)}.</p>`;
      const cy = Math.round(top + h + 8 + 17 + 72);
      art += corner(97, cy, 530, Math.min(220, 1048 - 140 - cy));
      art += `<p class="a c-note" style="left:97px;top:${cy + Math.min(220, 1048 - 140 - cy) + 8}px;width:530px">The top left corner at full size: margin, column and gutter in px, the ruler down the margin ticking every ${val(base + ' px')}.</p>`;
    } else {
      // a portrait page: the whole page on the left, the corner at full size beside it
      const h = 560, k = h / phh, w = pw * k;
      art += page(49, top, k);
      art += `<p class="a c-note" style="left:49px;top:${top + h + 8}px;width:${Math.round(w)}px">The whole page at ${Math.round(k * 100)}%, ${val(`${pw} × ${phh} px`)}.</p>`;
      const cx = Math.round(49 + w + 40), cy = top + 56, cw = 627 - cx;
      art += corner(cx, cy, cw, 400);
      art += `<p class="a c-note" style="left:${cx}px;top:${cy + 408}px;width:${cw}px">The top left corner at full size: margin, column and gutter in px, the ruler down the margin ticking every ${val(base + ' px')}.</p>`;
    }
    // the values, as an appendix: one row of six across the foot of the paper
    const V = [['Page', `${pw} × ${phh} px`], ['Margin', `${fmt(m)} px`], ['Columns', String(n)], ['Column', `${fmt(cwid)} px`], ['Gutter', `${fmt(g)} px`], ['Base unit', `${base} px`]];
    const vy = 984;
    const tab = hair(vy) + V.map(([l, v], i) => `<p class="a c-label nw" style="left:${49 + i * 98}px;top:${vy + 14}px">${l}</p><p class="a c-value nw" style="left:${49 + i * 98}px;top:${vy + 34}px">${A(v)}</p>`).join('');
    const inner = `${plateLabel('Grid')}
${plateNote(`${Word(n)} columns on the ${A(B.name)} page, ${fmt(m)} px in from every edge, on a ${base} px base.`, 403, 72, 224)}${art}${tab}`;
    return sheet(ctx, 'grid', { hp: 232, hit: { text: String(n), x: 49, base: 200, size: 200, maxW: 330 } }, inner);
  },
};
