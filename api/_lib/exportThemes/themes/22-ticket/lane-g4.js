// Theme 22, Ticket: lane g4, the imagery and layout pages that round 1 left out (photo-direction, shot-list, imagery-rules, grid).
// layouts is round 1's and is not touched here. Every page keeps the one roll ticket on the bar top (helpers.js): the perforation, notches and
// stub never move. What is printed on the body changes job, and each job comes from the ticket's world:
//   photo-direction  the photograph printed on the ticket, as gig tickets carry the act; the subject beside it, the other four lines on the bar top
//   shot-list        the night's running order: the lead shot printed large, the rest listed beside it as a set list, each with its own frame
//   imagery-rules    the conditions printed on a ticket: do and don't in two columns, and the one rule a print can show (a wash) printed twice
//   grid             the brand's page drawn to scale on the ticket, its twelve columns printed as a value step, its line set across them
// A brand without photographs gets art-directed photo slots: a dark printed panel with crop marks and the brief written in it, never an apology.
// The slot edition keeps every layout; the engine (engine/placeholders.js) turns each piece of brand copy into a placeholder, and ph-tight on the page body asks for the compact form.
import { plateImg } from '../../engine/plate.js';
import { A, px, T, roles, device, stub, textWidth, fitLines, trackOf } from './helpers.js';
import { hasPlate, plateWindow, plateAlt } from './plates.js';

const r2 = (n) => Math.round(n * 100) / 100;
const el = (x, y, cls, html, style = '', w = null) => `<div class="a ${cls}" style="left:${px(x)};top:${px(y)};${w ? `width:${px(w)};` : ''}${style}">${html}</div>`;
const WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'];
const word = (n) => WORDS[n] || String(n);
const lower = (s) => s.charAt(0).toLowerCase() + s.slice(1);
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const stop = (s) => (/[.!?]$/.test(s.trim()) ? s.trim() : `${s.trim()}.`);

// ---- measuring: greedy wrap in the body face (copied from lane g3's helper, so the lines laid out are the lines that render) ----
const bodyW = (ctx, text, size, weight = 400) => textWidth(ctx, 'body', text, size) * (weight >= 600 ? 1.07 : weight >= 500 ? 1.035 : 1);
function wrap(ctx, text, size, w, weight = 400) {
  const lines = []; let cur = '';
  for (const wd of String(text).split(/\s+/).filter(Boolean)) { const t = cur ? `${cur} ${wd}` : wd; if (cur && bodyW(ctx, t, size, weight) > w * 0.96) { lines.push(cur); cur = wd; } else cur = t; }
  if (cur) lines.push(cur);
  return lines;
}
// a run of type set as explicit lines, so the count laid out is the count that renders
const linesHtml = (lines) => lines.map((l) => `<span class="ln">${A(l)}</span>`).join('');

const isSlot = (ctx) => ctx.edition === 'slot';

// ---- shots: a real photograph where the brand has one, otherwise a printed slot panel with the brief written in it ----
// the brief's own title ("The queue: people lined up ...") is the text before its colon
function partsOf(s) {
  if (s.photo) return { title: s.caption || '', brief: s.alt ? stop(s.alt) : '', credit: s.generated ? '' : (s.credit || '') };  // a generated sample photo prints no credit line
  const m = /^([^:.]{2,40}):\s*(.+)$/.exec(s.slot || '');
  return m ? { title: m[1].trim(), brief: stop(cap(m[2])) } : { title: '', brief: stop(s.slot || '') };
}
// crop marks: four corner ticks 8 px inside the frame, in the quiet colour, so a panel reads as a frame waiting for its picture
const cropMarks = (R, w, h, c = R.quiet) => {
  const t = 14, i = 8;
  const at = (x, y, b) => `<i class="g4-cm" style="left:${x}px;top:${y}px;${b}"></i>`;
  return at(i, i, `border-left:1px solid ${c};border-top:1px solid ${c}`) + at(w - i - t, i, `border-right:1px solid ${c};border-top:1px solid ${c}`)
    + at(i, h - i - t, `border-left:1px solid ${c};border-bottom:1px solid ${c}`) + at(w - i - t, h - i - t, `border-right:1px solid ${c};border-bottom:1px solid ${c}`);
};
// a frame on the field. opts.text: write the shot's title and brief inside the panel (slots only); opts.wash: lay a flat colour over it (the don't)
function frame(ctx, R, shot, n, { x, y, w, h, text = true, wash = null, measure = 360, pos = '50% 50%' }) {
  const p = partsOf(shot), plate = hasPlate(ctx, shot);
  let inner, brief = false;
  if (shot.photo) inner = ctx.photo(shot.id, { style: 'width:100%;height:100%', pos });
  // a brief with no photograph yet shows a stand-in plate (plates.js), not an empty frame
  else if (plate) inner = plateWindow(ctx, R, shot, w, h);
  else if (!text && !isSlot(ctx)) {
    // a small frame whose shot is a brief: not an empty dark box but a framing outline on the field with the shot's number and "to shoot"
    // (the brief itself is printed beside it), so it reads as a shot still to be taken, not a missing picture
    brief = true;
    inner = cropMarks(R, w, h, R.fieldInk) + `<div class="a g4-brief" style="left:0;top:0;width:${px(w)};height:${px(h)}"><b class="c12 b ink">Shot ${n}</b><span class="c12 ink">to shoot</span></div>`;
  } else {
    inner = cropMarks(R, w, h);
    if (text) {
      const tw = Math.min(measure, w - 40);
      {
        const bl = wrap(ctx, p.brief, 13, tw), tl = p.title ? wrap(ctx, p.title, 15, tw, 600) : [];
        const bh = bl.length * 18, th = tl.length * 22;
        if (th + bh + 8 > h - 40) throw new Error(`ticket g4: the brief for shot ${shot.id} does not fit its ${w} x ${h} panel`);
        // a large frame carries its title in the display face, as the act is printed on a ticket; a small one in the body face
        if (tl.length && w >= 400) inner += fitLines(ctx, p.title, { w: w - 40, max: 40, min: 24, maxLines: 1 }).lines.length === 1
          ? `<div class="a disp" style="left:20px;top:20px;font-size:${fitLines(ctx, p.title, { w: w - 40, max: 40, min: 24, maxLines: 1 }).size}px;line-height:1;letter-spacing:${trackOf(ctx)}em;color:${R.paper};white-space:nowrap">${A(p.title)}</div>` : el(20, 20, 'c15 b paper', linesHtml(tl), '', tw);
        else if (tl.length) inner += el(20, 20, 'c15 b paper', linesHtml(tl), '', tw);
        inner += el(20, h - 20 - bh, 'c13 qt', linesHtml(bl), '', tw);
      }
    }
  }
  const washHtml = wash ? `<i class="g4-wash" style="background:${wash}"></i>` : '';
  const label = isSlot(ctx) ? `Photo slot, shot ${n}` : (plate ? plateAlt(shot) : `Photo slot. ${shot.slot}`);
  const role = shot.photo ? '' : ` role="img" aria-label="${A(label)}"`;
  return `<div class="a g4-fr${shot.photo || plate ? ' g4-fr--photo' : ''}"${role} style="left:${px(x)};top:${px(y)};width:${px(w)};height:${px(h)};background:${brief ? R.field : R.table}${brief ? `;box-shadow:inset 0 0 0 1.5px ${R.fieldInk}` : ''}">${inner}${washHtml}</div>`;
}

// the page: the device, then the content and the stub; the lane class scopes this lane's css
function ticketPage(ctx, R, id, { body = '', zone = '' }) {
  return `<section class="pg g4" data-page="${id}" style="--ink:${R.fieldInk};--field:${R.field}">${device(R, {})}<div class="ct${isSlot(ctx) ? ' ph-tight' : ''}">${body}${stub(ctx, R, id)}${zone}</div></section>`;
}

// a dark-zone note: the name in paper, then its text in the measured quiet colour
function note(ctx, R, { x, y, w, name, text, key, n = 1, size = 13 }) {
  let html = el(x, y, 'c15 b paper', A(name), '', w);
  const lines = wrap(ctx, text, size, w), lh = size === 13 ? 18 : 16;
  if (30 + lines.length * lh > 156) return note(ctx, R, { x, y, w, name, text, key, n, size: 12 });
  return html + el(x, y + 30, `${size === 13 ? 'c13' : 'c12'} qt`, linesHtml(lines), '', w);
}

// which shot leads: the first real photograph, else the first brief that asks for a wide crop, else the first shot
const leadShot = (shots) => shots.find((s) => s.photo) || shots.find((s) => /\bwide\b/i.test(s.slot || '')) || shots[0];
const indexOf = (ctx, s) => ctx.brand.imagery.shots.indexOf(s) + 1;

export function css(ctx) {
  return `.pg.g4 .g4-fr{position:absolute;overflow:hidden;isolation:isolate}
.pg.g4 .g4-fr>img,.pg.g4 .g4-fr>svg.pl{position:absolute;left:0;top:0}
.pg.g4 .g4-fr--photo::after{content:'';position:absolute;inset:0;box-shadow:inset 0 0 0 1px oklch(0 0 0 / .1);pointer-events:none;z-index:3}
.pg.g4 .g4-brief{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;text-align:center}
.pg.g4 .g4-cm{position:absolute;width:14px;height:14px;box-sizing:border-box}
.pg.g4 .g4-wash{position:absolute;inset:0;z-index:2;opacity:.55}
.pg.g4 .g4-run .ln{white-space:nowrap}
.pg.g4 .g4-run b,.pg.g4 .g4-b{font-weight:600}
.pg.g4 .g4-rule{position:absolute;height:1px;background:var(--ink)}
.pg.g4 .g4-val{font-family:var(--mono);font-weight:${ctx.brand.fonts.mono.weights[0]};font-size:15px;line-height:22px;font-variant-numeric:tabular-nums;white-space:nowrap}
.pg.g4 .g4-v{font-family:var(--mono);font-weight:${ctx.brand.fonts.mono.weights[0]};font-size:0.92em;font-variant-numeric:tabular-nums}
.pg.g4 .g4-sheet{position:absolute;box-sizing:border-box;border:1px solid var(--ink)}
.pg.g4 .g4-col{position:absolute;top:0;height:100%}`;
}

export const guidelines = {
  // ---- photo-direction: one photograph printed on the ticket (cols 1 to 4), the subject beside it at 20 px, light, crop, colour and people
  // as four notes on the bar top under the ticket ----
  'photo-direction': (ctx) => {
    // a different shot from the shot list's lead on the next page: the second photograph, else the second wide brief, else the second shot
    const R = roles(ctx), I = ctx.brand.imagery, D = I.direction;
    const shot = I.shots.filter((s) => s.photo)[1] || I.shots.filter((s) => !s.photo && /\bwide\b/i.test(s.slot || ''))[1] || I.shots[1] || I.shots[0];
    let body = frame(ctx, R, shot, indexOf(ctx, shot), { x: 72, y: 72, w: 568, h: 388, measure: 360 });
    // the subject: the whole brief for every photograph, so it gets the field's second size
    body += el(664, 72, 'c13 b ink', 'Subject', '', 272);
    {
      let size = 20, lines = wrap(ctx, D.subject, 20, 272);
      if (lines.length * 28 > 358) { size = 15; lines = wrap(ctx, D.subject, 15, 272); }
      body += el(664, 102, size === 20 ? 'c20 ink' : 'c15 ink', linesHtml(lines), '', 272);
    }
    const cols = [[72, 272, 'Light', 'light'], [368, 272, 'Crop', 'crop'], [664, 272, 'Colour', 'colour'], [T.inX, T.inW, 'People', 'people']];
    const zone = cols.map(([x, w, name, k]) => note(ctx, R, { x, y: 532, w, name, text: D[k], key: `imagery.direction.${k}` })).join('');
    return ticketPage(ctx, R, 'photo-direction', { body, zone });
  },

  // ---- shot-list: the lead shot printed large on the right (cols 4 to 6), the others as a running order on the left (cols 1 to 3), one row
  // each with its own small frame, the way a ticket lists the night's acts ----
  'shot-list': (ctx) => {
    const R = roles(ctx), shots = ctx.brand.imagery.shots.slice(0, 6), lead = shots[0], rest = shots.slice(1);
    let body = frame(ctx, R, lead, 1, { x: 516, y: 72, w: 420, h: 388, measure: 340, pos: '95% 40%' });
    // the rows: a hairline at each row's top, the frame in column 1, the title and brief in columns 2 and 3
    const rowText = (s, n) => {
      const p = partsOf(s), credit = s.photo && p.credit ? ` Photo from ${p.credit}.` : '';
      const full = `${p.title ? `${stop(p.title)} ` : ''}${p.brief}${credit}`;
      return { full, title: p.title ? stop(p.title) : '', lines: wrap(ctx, full, 12, 272) };
    };
    const texts = rest.map((s, i) => rowText(s, i + 2));
    const need = texts.map((t) => t.lines.length * 16);
    const pitch = rest.length ? 388 / rest.length : 0;
    need.forEach((h, i) => { if (h + 11 > pitch) throw new Error(`ticket g4: shot ${i + 2} needs ${h} px in a ${r2(pitch)} px row`); });
    rest.forEach((s, i) => {
      const top = 72 + i * pitch, fh = Math.min(72, pitch - 17);
      body += `<i class="g4-rule" style="left:72px;top:${px(top)};width:420px"></i>`;
      body += frame(ctx, R, s, i + 2, { x: 72, y: top + 9, w: 124, h: fh, text: false });
      const t = texts[i];
      {
        // the title runs into the brief on the same line, set in the heavier weight: re-wrap with the title's lines measured at 600
        const html = t.lines.map((l, k) => (k === 0 && t.title && l.startsWith(t.title) ? `<span class="ln"><b>${A(t.title)}</b>${A(l.slice(t.title.length))}</span>` : `<span class="ln">${A(l)}</span>`)).join('');
        body += el(220, top + 8, 'c12 ink g4-run', html, '', 272);
      }
    });
    // the bar top: how many shots are photographed and how many are briefs, then the lead's caption under it when it is a photograph
    const nPhoto = shots.filter((s) => s.photo).length, nSlot = shots.length - nPhoto;
    const nPlate = shots.filter((s) => hasPlate(ctx, s)).length;
    const lead1 = nPhoto === 0 && nPlate === shots.length ? `${word(shots.length)} shots, each a brief to shoot to. The frames hold stand-in photographs until the real ones are shot.`
      : nPhoto === 0 ? `${word(shots.length)} shots, each a brief to shoot to: the subject, the crop and the light are written beside each one.`
      : nSlot === 0 ? `${word(shots.length)} shots, all photographed.`
        : `${word(shots.length)} shots. ${word(nPhoto)} ${nPhoto === 1 ? 'is' : 'are'} photographed; ${lower(word(nSlot))} ${nSlot === 1 ? 'is a brief' : 'are briefs'} to shoot to, written beside ${nSlot === 1 ? 'it' : 'them'}.`;
    let zone = el(72, 532, 'c15 paper', linesHtml(wrap(ctx, lead1, 15, 420)), '', 420);
    if (lead.photo || hasPlate(ctx, lead)) {
      const p = partsOf(lead);
      zone += el(516, 532, 'c15 b paper', A(p.title || 'Lead shot'), '', 420) + el(516, 562, 'c13 qt', linesHtml(wrap(ctx, `${p.brief}${p.credit ? ` Photo from ${p.credit}.` : ''}`, 13, 420)), '', 420);
    }
    return ticketPage(ctx, R, 'shot-list', { body, zone });
  },

  // ---- imagery-rules: the rules as the conditions printed on a ticket, do and don't side by side (cols 1 to 4); the one rule a print can
  // show, a colour laid over the photograph, printed twice beside them (cols 5 and 6): as shot, then washed in the ticket's own colour ----
  'imagery-rules': (ctx) => {
    const R = roles(ctx), I = ctx.brand.imagery, rules = I.rules.slice(0, 4);
    let body = el(72, 72, 'c13 b ink', 'Do', '', 272) + el(368, 72, 'c13 b ink', 'Don’t', '', 272);
    // rows: measured at 15 px; if the four rows will not fit the body they drop to 13 px
    const measure = (size) => rules.map((r) => {
      return Math.max(wrap(ctx, r.do, size, 272, 500).length, wrap(ctx, r.dont, size, 272).length) * (size === 15 ? 22 : 18);
    });
    let size = 15, hs = measure(15);
    const room = 460 - 100;
    if (hs.reduce((a, b) => a + b + 24, 0) > room) { size = 13; hs = measure(13); }
    if (hs.reduce((a, b) => a + b + 24, 0) > room) throw new Error('ticket g4: the imagery rules do not fit the ticket');
    // spread the rows over the body so the last one ends at the inner edge
    const gap = (room - hs.reduce((a, b) => a + b, 0)) / rules.length;
    let y = 100;
    rules.forEach((r, i) => {
      body += `<i class="g4-rule" style="left:72px;top:${px(y)};width:568px"></i>`;
      {
        const cls = size === 15 ? 'c15' : 'c13';
        body += el(72, y + 12, `${cls} ink g4-do`, linesHtml(wrap(ctx, r.do, size, 272, 500)), 'font-weight:500', 272);
        body += el(368, y + 12, `${cls} ink`, linesHtml(wrap(ctx, r.dont, size, 272)), '', 272);
      }
      y += hs[i] + gap;
    });
    // the demonstration: the first photograph (or the lead brief's panel) as shot, then the same frame under a flat wash of the field colour
    const shot = leadShot(I.shots), n = indexOf(ctx, shot);
    body += frame(ctx, R, shot, n, { x: 664, y: 72, w: 272, h: 160, text: false, pos: '50% 45%' });
    body += el(664, 240, 'c13 ink', '<b class="g4-b">Do.</b> As shot.', 'font-weight:500', 272);
    body += frame(ctx, R, shot, n, { x: 664, y: 272, w: 272, h: 160, text: false, wash: R.field, pos: '50% 45%' });
    body += el(664, 440, 'c13 ink', '<b class="g4-b">Don’t.</b> Washed in a brand colour.', 'font-weight:500', 272);
    // the bar top: the colour direction the demonstration comes from
    const lead = `${word(rules.length)} rules, each a do and a don’t. The pair at the right shows the one a print can: a colour laid over a photograph.`;
    const zone = el(72, 532, 'c15 paper', linesHtml(wrap(ctx, lead, 15, 520)), '', 520)
      + note(ctx, R, { x: 664, y: 532, w: 272, name: 'Colour', text: I.direction.colour, key: 'imagery.direction.colour' });
    return ticketPage(ctx, R, 'imagery-rules', { body, zone });
  },

  // ---- grid: the brand's page drawn to scale on the ticket (the height of the body), its columns printed as a value step of the ink, the
  // brand's line set across the first two thirds; the measures listed beside it, the sum that proves them on the bar top ----
  grid: (ctx) => {
    const R = roles(ctx), G = ctx.gridMeasures, C = ctx.C;
    const s = 388 / G.page.h, W = G.page.w * s;
    const colX = (i) => G.margin + i * (G.col + G.gutter), span = (n) => n * G.col + (n - 1) * G.gutter;
    // the column colour: the field moved 14% of the way to the ink in OKLCH, so it is a value step of the ticket's own two colours
    const f = C.toOklch(R.field), k = C.toOklch(R.fieldInk), t = 0.14;
    const colHex = C.fromOklch(f.L + (k.L - f.L) * t, f.C + (k.C - f.C) * t, f.C > 0.02 ? f.H : k.H);
    ctx.pair(R.fieldInk, colHex, { size: 24, weight: ctx.weights.heading, what: '(Ticket grid: the line over a column)' });
    let sheet = Array.from({ length: G.columns }, (_, i) => `<i class="g4-col" style="left:${px(colX(i) * s)};width:${px(G.col * s)};background:${colHex}"></i>`).join('');
    // the line spans two thirds of the columns from the first, set at the top margin
    const nSpan = Math.max(1, Math.round(G.columns * 2 / 3)), lw = span(nSpan) * s, lx = colX(0) * s, ly = G.margin * s + 8;
    {
      const fl = fitLines(ctx, ctx.brand.lines.primary, { w: lw, max: 56, min: 24, maxLines: 2 }), lh = r2(fl.size * 0.92);
      sheet += `<div class="disp fit" style="left:${px(lx)};top:${px(ly)};width:${px(lw)};font-size:${fl.size}px;line-height:${lh}px;letter-spacing:${trackOf(ctx)}em;color:${R.fieldInk}">${linesHtml(fl.lines)}</div>`;
    }
    let body = `<div class="g4-sheet" style="left:72px;top:72px;width:${px(W)};height:388px">${sheet}</div>`;
    // the measures, beside the drawing: the name, then the literal value in the mono face
    const fmt = (n) => ctx.fmt ? ctx.fmt(n) : String(r2(n));
    const meas = [['Page', `${G.page.w} × ${G.page.h} px`], ['Margins', `${G.margin} px`], ['Columns', `${G.columns} of ${fmt(G.col)} px`], ['Gutters', `${G.gutter} px`], ['Base unit', `${G.base} px`]];
    const mx = 72 + W + 24, mw = 936 - mx;
    meas.forEach(([name, val], i) => {
      if (val.length * 15 * 0.62 > mw) throw new Error(`ticket g4: the grid value "${val}" is wider than its ${r2(mw)} px column`);
      body += el(mx, 72 + i * 56, 'c13 b ink', A(name), '', mw) + el(mx, 72 + i * 56 + 20, 'g4-val ink', A(val), '', mw);
    });
    // the bar top: the grid in one sentence, then the sum across the page
    const allBase = [G.margin, G.gutter].every((v) => v % G.base === 0);
    const lead = `${word(G.columns)} columns on a ${G.page.w} by ${G.page.h} page, with ${G.margin} px margins and ${G.gutter} px gutters.${allBase ? ` Both are multiples of the ${G.base} px base.` : ''}`;
    const v = (x) => `<span class="g4-v">${A(String(x))}</span>`;
    const sum = `${v(2)} × ${v(G.margin)} + ${v(G.columns)} × ${v(fmt(G.col))} + ${v(G.columns - 1)} × ${v(G.gutter)} = ${v(G.page.w)} px across.`;
    const zone = el(72, 532, 'c15 paper', linesHtml(wrap(ctx, lead, 15, 520)), '', 520) + el(664, 532, 'c13 qt', sum, '', 344);
    return ticketPage(ctx, R, 'grid', { body, zone });
  },
};
