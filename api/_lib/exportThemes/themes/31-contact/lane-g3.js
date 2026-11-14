// Theme 31, Contact sheet, lane g3: the colour and type pages that round 1 left out (proportion, contrast, colour-values, hierarchy, type-in-use, type-rules).
// Every page keeps the theme's sheet: the strip with its own frame circled, the stage under frames 1 to 4, and the notes in the caption column at x 996.
// Each stage is laid out as a darkroom object: paper nested in an easel, a step tablet, step wedges under the frames, the enlargement factors, a print on the table.
// Colours come from ctx roles and brand data; no colour id, hex or name of a sample brand is written here.
import { A, tokens, palette, put, hline, adv, wrap, fitBalanced, fontOf, shell, captionHead, px, rollOf, GX, splitLine } from './helpers.js';
import { cut, photoFrame, photoShot } from './arts.js';

const frameFn = (ctx) => (setup, k, w, h, f, v = 0) => (setup === 'photo' ? photoFrame(ctx, k, w, h, v) : cut(ctx, setup, k, w, h, 'Frame ' + f));
const page = (ctx, id, body) => shell(ctx, id, tokens(ctx), body, frameFn(ctx));
const capNo = (ctx, id) => String(ctx.pageNo(id)).padStart(2, '0');
const firstSentence = (t) => { const m = t.match(/^.*?[.!?](?=\s|$)/); return m ? m[0] : t; };
const stop = (t) => (/[.!?]$/.test(t.trim()) ? t.trim() : t.trim() + '.');
const listJoin = (a) => (a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]);
const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const inWords = (n) => WORDS[n] || String(n);
const WNAME = { 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'Semibold', 700: 'Bold', 800: 'Extrabold', 900: 'Black' };

// the circled frame's caption, at the head of the column: a photograph says its own caption and who took it; a render says what the scene is and how the page's subject shows in it
const SCENE_TITLE = { app: 'The app on a phone, on stone', laptop: 'The desktop screen on a night desk', night: 'Poster at a venue, at night', card: 'Cards on the box-office sill', poster: 'Poster in a black frame, studio corner', sheets: 'Three sheets, gallery wall', book: 'Portfolio book, in hand', tote: 'Print bag on the studio hook', letter: 'Print order letter on linen', lightbox: 'The studio sheet under the loupe' };
function ownCap(ctx, id, texts) {
  const r = rollOf(ctx)[ctx.pageNo(id)], no = capNo(ctx, id);
  if (!r) return captionHead(ctx, { no, title: 'Unexposed', text: 'The roll has ended here.', lines: 2 });
  if (r[0] === 'photo') {
    const s = photoShot(ctx, r[1]);
    return captionHead(ctx, { no, title: s ? s.caption : 'Your photograph', text: s ? (s.generated ? '' : `Photo: ${s.credit || 'the studio'}.`) : 'Your own photograph, as shot, in the light you work in.', lines: 3 });
  }
  return captionHead(ctx, { no, title: SCENE_TITLE[r[0]] || 'The brand at work', text: (texts[r[0]] || (() => ''))(), lines: 2 });
}

// ---- text, measured so the box is the height the lines take ----
const label = (ctx, x, y, t, w = 444) => put(ctx, { x, y, w, h: 16, cls: 'nl', role: 'chrome', size: 12, line: 16, weight: 500, html: A(t) });
function para(ctx, x, y, w, text, { size = 14, line = 22, color = 'var(--soft)', weight = 400, max = 6 } = {}) {
  const n = Math.min(max, wrap(ctx, 'body', text, size, w, 0, weight).length);
  return { h: n * line, html: put(ctx, { x, y, w, h: n * line, role: 'body', size, line, weight, style: `font:${weight} ${size}px/${line}px var(--body);color:${color};white-space:normal;text-wrap:pretty`, html: A(text) }) };
}
const name14 = (ctx, x, y, w, t, color = 'var(--ink)') => put(ctx, { x, y, w, h: 20, role: 'body', size: 14, line: 20, weight: 500, style: `font:500 14px/20px var(--body);color:${color}`, html: A(t) });
const mono = (ctx, x, y, w, t, align = 'left', color = 'var(--quiet)') => put(ctx, { x, y, w, h: 18, cls: 'mono', role: 'mono', size: 12, line: 18, style: `color:${color};${align === 'right' ? 'text-align:right' : ''}`, html: A(t) });
// a numeral in the edge print's condensed face, the way the frame numbers are set
const numeral = (ctx, { x, y, baseline, w, t, size = 32, color = 'var(--ink)', align = 'left' }) => put(ctx, { x, y, baseline, w, h: size, role: 'edge', size, line: size, weight: 600, align, style: `font:600 ${size}px/${size}px var(--chrome);font-stretch:75%;font-variant-numeric:tabular-nums;color:${color}`, html: A(t) });
const ink = (ctx, T, bg) => (ctx.ratio(T.ink, bg) >= ctx.ratio(T.ground, bg) ? T.ink : T.ground);
const colourName = (ctx, hex) => { const c = [...ctx.brand.colours, ...(ctx.brand.tones || [])].find((x) => x.hex.toLowerCase() === hex.toLowerCase()); return c ? c.name : null; };
// the brand's own whole sentence that holds at `maxW`: the paragraph's first sentence when it fits, else the shortest sentence that does; never a cut
function sentenceFit(ctx, role, size, wght, maxW, track = 0) {
  const B = ctx.brand, par = B.type.sample.paragraph.match(/[^.!?]+[.!?]+/g) || [B.type.sample.paragraph], all = [...par.map((t) => t.trim()), B.type.sample.caption, ...(B.lines.others || []), B.lines.primary];
  const m = (t) => adv(ctx, role, t, size, track, wght);
  return all.find((t) => m(t) <= maxW) || all.slice().sort((x, y) => m(x) - m(y))[0];
}
// a brand line printed whole: one line if it fits, else a split at a full stop, else a balanced wrap (never a lone last word); a word is never cut
function wholeLines(ctx, role, text, size, maxW, track = 0, wght) {
  const m = (t) => adv(ctx, role, t, size, track, wght);
  if (m(text) <= maxW) return [text];
  const sp = splitLine(text); if (/[.!?]\s/.test(text) && sp.every((l) => m(l) <= maxW)) return sp;
  const w = wrap(ctx, role, text, size, maxW, track, wght);
  if (w.length === 2 && !w[1].includes(' ')) { const t = text.split(/\s+/); let best = null; for (let k = 1; k < t.length; k++) { const a = t.slice(0, k).join(' '), b = t.slice(k).join(' '), mw = Math.max(m(a), m(b)); if (mw <= maxW && (!best || mw < best.mw)) best = { mw, l: [a, b] }; } if (best) return best.l; }
  return w;
}
// the shortest whole brand line that holds at `maxW` for a treatment (tracking, capitals); the shortest line at the smallest width if none holds
function pickLine(ctx, role, size, wght, maxW, track = 0, upper = false) {
  const B = ctx.brand, all = [B.lines.primary, ...(B.lines.others || [])], m = (t) => adv(ctx, role, upper ? t.toUpperCase() : t, size, track, wght);
  const fit = all.filter((t) => m(t) <= maxW);
  return (fit.length ? fit : all).slice().sort((a, b) => m(a) - m(b))[0];
}
const sh = (s) => s.size, lh = (s) => Math.round(s.size * s.line);
const roleOf = (s) => (s.face === 'display' ? 'display' : s.face === 'mono' ? 'mono' : 'body');
const famVar = (s) => (s.face === 'display' ? 'display' : s.face === 'mono' ? 'mono' : 'body');
// where the first baseline falls in a line box of height `line` that starts at `top`
function baselineIn(ctx, role, size, line, top, weight) {
  const f = fontOf(ctx, role, weight), h = f.tables.hhea, u = f.unitsPerEm, asc = h.ascender / u * size, desc = -h.descender / u * size;
  return top + (line - (asc + desc)) / 2 + asc;
}

export const guidelines = {
  // Proportion: the palette as paper nested in an easel. Every colour is a 3:2 sheet anchored in the same corner, so each band you see is exactly its colour's share of the area.
  proportion(ctx) {
    const B = ctx.brand, T = tokens(ctx), P = palette(ctx), id = 'proportion';
    const cols = [...B.colours].sort((a, b) => b.share - a.share).slice(0, 6), total = cols.reduce((s, c) => s + c.share, 0);
    const X = 60, Y = 316, W = 912, H = 608;
    const k = cols.map((c, i) => Math.sqrt(cols.slice(i).reduce((s, d) => s + d.share, 0) / total));
    const pct = (c) => `${Math.round(c.share / total * 100)}%`;
    let sheets = '', labels = '';
    cols.forEach((c, i) => {
      const w = W * k[i], h = H * k[i], wn = i + 1 < cols.length ? W * k[i + 1] : 0, hn = i + 1 < cols.length ? H * k[i + 1] : 0;
      sheets += `<div class="a" style="left:${X}px;top:${Y}px;width:${px(w)};height:${px(h)};background:${c.hex}"></div>`;
      // the label sits in the band's own corner (bottom right), so it never lands on the next sheet: in the bottom strip if it is tall enough, else up the right strip
      const fg = ink(ctx, T, c.hex), bw = w - wn, bh = h - hn, p = pct(c);
      const nameOk = ctx.ratio(fg, c.hex) >= 4.5, lw = Math.max(adv(ctx, 'edge', p, 32, 0, 600), nameOk ? adv(ctx, 'body', c.name, 14, 0, 500) : 0);
      const full = nameOk && (bh >= 56 + 24 || (i + 1 === cols.length && h >= 80) || bw >= lw + 28);
      const bare = bh >= 32 + 24 || bw >= adv(ctx, 'edge', p, 32, 0, 600) + 28;
      if (ctx.ratio(fg, c.hex) < 3 || (!full && !bare)) return;
      const right = X + w - 14, bottom = Y + h - 12;
      if (full) labels += numeral(ctx, { x: right - 200, y: bottom - 56, w: 200, t: p, color: fg, align: 'right' }) + put(ctx, { x: right - 200, y: bottom - 20, w: 200, h: 20, role: 'body', size: 14, line: 20, weight: 500, align: 'right', style: `font:500 14px/20px var(--body);color:${fg}`, html: A(c.name) });
      else labels += numeral(ctx, { x: right - 200, y: bottom - 32, w: 200, t: p, color: fg, align: 'right' });
    });
    const edge = `<div class="a" style="left:${X}px;top:${Y}px;width:${W}px;height:${H}px;box-shadow:inset 0 0 0 1px var(--hair);pointer-events:none"></div>`;
    const note = para(ctx, 996, 512 + cols.length * 56 + 8, 444, 'Each band is its colour’s share of the area, nested from one corner the way paper nests in an easel.', { max: 2 });
    // the column: each colour, its role and its share
    const rows = cols.map((c, i) => { const y = 512 + i * 56;
      return `<div class="a" style="left:996px;top:${y + 2}px;width:16px;height:16px;background:${c.hex};box-shadow:inset 0 0 0 1px var(--hair)"></div>`
        + name14(ctx, 1028, y, 300, c.name)
        + put(ctx, { x: 1028, y: y + 22, w: 300, h: 18, role: 'body', size: 12, line: 18, style: 'font:400 12px/18px var(--body);color:var(--quiet)', html: A(ctx.cap(c.role)) })
        + numeral(ctx, { x: 1340, y: y + 4, w: 100, t: pct(c), size: 24, align: 'right' }); }).join('');
    const surf = 'the dark screen';
    const cap = ownCap(ctx, id, { app: () => `On a phone: ${surf}, with ${P.action.name} on the progress bar.`, laptop: () => `On a laptop: ${surf}, with ${P.action.name} on the next step.` });
    return page(ctx, id, sheets + edge + labels + note.html + cap + hline(996, 488, 444) + rows);
  },

  // Contrast: a step tablet. Every text pair the brand uses, grouped by the ground it sits on, the grounds stepped from darkest to lightest, each line set in its own colours.
  contrast(ctx) {
    const B = ctx.brand, T = tokens(ctx), C = ctx.C, id = 'contrast';
    const nm = (k) => (ctx.byId[k] ? ctx.byId[k].name : k);
    const clean = (u) => u.replace(/\s*\(~?[^)]*:1\)/g, '').trim();
    const groups = [];
    for (const p of ctx.pairs) { let g = groups.find((x) => x.bg.toLowerCase() === p.bgHex.toLowerCase()); if (!g) groups.push(g = { bg: p.bgHex, id: p.bg, pairs: [] }); g.pairs.push(p); }
    groups.sort((a, b) => C.luminance(a.bg) - C.luminance(b.bg));
    const X = 60, W = 678, LH = 36, PAD = 12;
    let y = 316, html = '', keys = '';
    for (const g of groups) {
      const h = PAD * 2 + g.pairs.length * LH;
      html += `<div class="a" style="left:${X}px;top:${y}px;width:${W}px;height:${h}px;background:${g.bg}"></div>`;
      g.pairs.forEach((p, i) => {
        const top = y + PAD + i * LH, big = p.large, sz = big ? 24 : 14;
        html += put(ctx, { x: X + 16, y: top, w: 96, h: LH, role: 'edge', size: big ? 24 : 20, line: LH, weight: 600, style: `font:600 ${big ? 24 : 20}px/${LH}px var(--chrome);font-stretch:75%;font-variant-numeric:tabular-nums;color:${p.fgHex}`, html: A(`${p.ratioText} : 1`) });
        const use = clean(p.use), uw = big ? W - 128 - 16 : W - 128 - 16 - 168;
        html += put(ctx, { x: X + 128, y: top, w: uw, h: LH, role: 'body', size: sz, line: LH, weight: big ? 500 : 400, cls: big && ctx.placeholders ? 'g3-big' : '', style: `font:${big ? 500 : 400} ${sz}px/${LH}px var(--body);color:${p.fgHex};overflow:hidden`, html: A(use) });
        if (!big) html += put(ctx, { x: X + W - 16 - 160, y: top, w: 160, h: LH, role: 'body', size: 12, line: LH, align: 'right', style: `font:400 12px/${LH}px var(--body);color:${p.fgHex}`, html: A(nm(p.fg)) });
      });
      // the ground's name beside its step, on the page
      keys += name14(ctx, 762, y + PAD + 8, 210, nm(g.id)) + mono(ctx, 762, y + PAD + 30, 210, g.bg.toUpperCase());
      y += h;
    }
    const edge = `<div class="a" style="left:${X}px;top:316px;width:${W}px;height:${y - 316}px;box-shadow:inset 0 0 0 1px var(--hair);pointer-events:none"></div>`;
    // the column: the rule, then the pairs that miss it
    const rule = para(ctx, 996, 512, 444, 'Text needs 4.5 : 1. Type 24 px and over needs 3 : 1. A pair under its mark never carries text.', { max: 3 });
    const ny = 512 + rule.h + 28, room = Math.floor((936 - ny - 24) / 28);
    const un = ctx.unusedPairs.slice(0, Math.max(0, room)).map((p, i) => { const ry = ny + 24 + i * 28;
      return `<div class="a" style="left:996px;top:${ry + 2}px;width:16px;height:16px;background:${p.bgHex};box-shadow:inset 0 0 0 1px var(--hair)"><i style="position:absolute;left:5px;top:5px;width:6px;height:6px;background:${p.fgHex}"></i></div>`
        + put(ctx, { x: 1028, y: ry, w: 320, h: 20, role: 'body', size: 14, line: 20, style: 'font:400 14px/20px var(--body);color:var(--soft)', html: A(`${nm(p.fg)} on ${nm(p.bg)}`) })
        + mono(ctx, 1340, ry + 1, 100, `${p.ratioText} : 1`, 'right'); }).join('');
    const nu = ctx.unusedPairs.length ? label(ctx, 996, ny, 'Not used for text') + un : '';
    const cap = ownCap(ctx, id, {});
    return page(ctx, id, html + edge + keys + cap + hline(996, 488, 444) + rule.html + nu);
  },

  // Colour values: each colour printed as a step wedge under its own frame. The values head the wedge; the arrow marks the colour itself among its tints and shades.
  'colour-values'(ctx) {
    const B = ctx.brand, T = tokens(ctx), P = palette(ctx), R = ctx.roles.dark, id = 'colour-values';
    const cs = [...ctx.colours].sort((a, b) => b.share - a.share).slice(0, 6), n = cs.length;
    const pitch = n <= 4 ? 234 : Math.floor(936 / n), cw = pitch - 24;
    const steps = Object.keys(cs[0].ramp).map(Number).sort((a, b) => a - b), SH = 36, WY = 420;
    const best = (bg) => [P.light.hex, P.dark.hex, T.ink, T.ground].reduce((a, b) => (ctx.ratio(b, bg) > ctx.ratio(a, bg) ? b : a));
    const cols = cs.map((c, i) => {
      const x = n <= 4 ? GX[i] : 60 + i * pitch;
      const ok = c.oklch, okFits = adv(ctx, 'mono', ok, 12, 0, 400) <= cw;
      let h = name14(ctx, x, 316, cw, c.name) + mono(ctx, x, 344, cw, c.hex.toUpperCase()) + mono(ctx, x, 362, cw, c.rgb);
      h += okFits ? mono(ctx, x, 380, cw, ok) : mono(ctx, x, 380, cw, ok.replace(/^oklch\((.*)\)$/, '$1'));
      if (ctx.C.cmykOf(c)) h += mono(ctx, x, 398, cw, ctx.C.cmykOf(c));
      steps.forEach((s, j) => {
        const y = WY + j * SH, bg = c.ramp[s], fg = best(bg);
        h += `<div class="a" style="left:${x}px;top:${y}px;width:${cw}px;height:${SH}px;background:${bg}"></div>`;
        if (ctx.ratio(fg, bg) >= 4.5) h += put(ctx, { x: x + 10, y: y + 10, w: 60, h: 16, cls: 'nl', role: 'chrome', size: 12, line: 16, weight: 500, style: `color:${fg}`, html: String(s) });
        if (s === c.rampBase) h += `<i class="a g3-tl" style="left:${x + cw + 4}px;top:${y + SH / 2 - 5}px"></i>`;
      });
      return h + `<div class="a" style="left:${x}px;top:${WY}px;width:${cw}px;height:${steps.length * SH}px;box-shadow:inset 0 0 0 1px var(--hair);pointer-events:none"></div>`;
    }).join('');
    const below = para(ctx, 60, WY + steps.length * SH + 24, 678, `The arrow marks the colour itself. The steps are its tints and shades, ${steps[0]} to ${steps[steps.length - 1]}, and every one is in the palette files.`, { size: 12, line: 18, max: 2 });
    // the column: the tones, then the print note
    const tones = (B.tones || []).slice(0, 6), ty = 540;
    const trows = tones.map((t, i) => { const y = ty + i * 32;
      return `<div class="a" style="left:996px;top:${y + 2}px;width:16px;height:16px;background:${t.hex};box-shadow:inset 0 0 0 1px var(--hair)"></div>` + name14(ctx, 1028, y, 300, t.name) + mono(ctx, 1340, y + 1, 100, t.hex.toUpperCase(), 'right'); }).join('');
    const py = ty + tones.length * 32 + (tones.length ? 28 : 0);
    const note = para(ctx, 996, py + 24, 444, `These values are for screens. Print shifts colour, so ask your printer for a proof before a run, and match ${P.action.name} to the proof.`, { max: 4 });
    const act = ctx.ratio(R.action, R.surface) >= 3;
    const cap = ownCap(ctx, id, { laptop: () => (act ? `The dark screen: ${P.action.name} on the next step and on the progress bar.` : `The dark screen: ${P.action.name} on the progress bar.`), app: () => `The dark screen on a phone, ${P.action.name} on the progress bar.` });
    return page(ctx, id, cols + below.html + cap + hline(996, 488, 444) + (tones.length ? label(ctx, 996, 512, 'Tones') + trows : '') + label(ctx, 996, py, 'In print') + note.html);
  },

  // Hierarchy: the scale as enlargements of the reading size. Each step is set at its true size with its factor in the margin, and its key sits on the same baseline in the notes.
  hierarchy(ctx) {
    const B = ctx.brand, S = B.type.scale, id = 'hierarchy', c = (B.ui.screen && B.ui.screen.content) || {};
    const body = S.find((s) => s.token === 'body') || S.find((s) => s.face === 'body') || S[S.length - 1];
    const o = B.lines.others || [];
    const sample = { display: B.lines.primary, headline: B.type.sample.headline, title: o[0] || B.lines.primary, body: firstSentence(B.type.sample.paragraph), label: (c.form && c.form.book) || o[1] || B.lines.primary, caption: B.type.sample.caption };
    const fac = (s) => { const r = s.size / body.size, t = Number.isInteger(r) ? String(r) : r.toFixed(2).replace(/0$/, ''); return `${t}×`; };
    let top = 380, stage = '', keys = '';
    S.slice(0, 7).forEach((s, i) => {
      const role = roleOf(s), L = lh(s), size = sh(s), track = role === 'display' ? -0.01 : 0;
      let lines = wholeLines(ctx, role, sample[s.token] || s.use, size, 795, track, s.weight);
      // a display line that would need three lines gives way to the brand's shortest whole line that holds in two
      if (s.token === 'display' && lines.length > 2) { const alt = wholeLines(ctx, role, pickLine(ctx, role, size, s.weight, 795, track), size, 795, track, s.weight); if (alt.length < lines.length) lines = alt; }
      const bl = baselineIn(ctx, role, size, L, top, s.weight);
      stage += lines.map((t, j) => put(ctx, { x: 177, y: top + j * L, w: 795, h: L, role, size, line: L, weight: s.weight, style: `font:${s.weight} ${size}px/${L}px var(--${famVar(s)});${role === 'display' ? `font-stretch:${B.fonts.display.stretch || 100}%;letter-spacing:-0.01em;` : ''}color:var(--ink)`, html: A(t) })).join('')
        + numeral(ctx, { x: 60, baseline: bl, w: 93, t: fac(s), size: 24, color: 'var(--quiet)' });
      keys += put(ctx, { x: 996, baseline: bl, w: 108, h: 20, role: 'body', size: 14, line: 20, weight: 500, style: 'font:500 14px/20px var(--body);color:var(--ink)', html: A(ctx.cap(s.token)) })
        + put(ctx, { x: 1113, baseline: bl, w: 200, h: 18, role: 'body', size: 12, line: 18, style: 'font:400 12px/18px var(--body);color:var(--soft);white-space:normal', html: A(s.use) })
        + put(ctx, { x: 1316, baseline: bl, w: 124, h: 18, cls: 'mono', role: 'mono', size: 12, line: 18, style: 'text-align:right', html: A(`${size} / ${L}, ${s.weight}`) });
      const useLines = wrap(ctx, 'body', s.use, 12, 200, 0, 400).length;
      top += L * lines.length + Math.max(24, 18 * useLines + 22 - L + 8);
    });
    // the line above the ladder: what the factors are measured from
    const lead = para(ctx, 60, 316, 912, `${inWords(S.length).replace(/^./, (m) => m.toUpperCase())} steps, each measured from reading text at ${body.size} px. The factor is how far each one is enlarged.`, { size: 16, line: 24, color: 'var(--soft)', max: 3 });
    const fams = [...new Set(S.map((s) => B.fonts[s.face] && B.fonts[s.face].family).filter(Boolean))];
    const cap = ownCap(ctx, id, {});
    return page(ctx, id, lead.html + stage + cap + hline(996, 432, 444) + keys);
  },

  // Type in use: one composed piece laid on the table, a sheet in the lightest brand colour with a headline, a photograph and its caption, and a paragraph, all at the brand's own sizes.
  'type-in-use'(ctx) {
    const B = ctx.brand, P = palette(ctx), S = B.type.scale, id = 'type-in-use';
    const tok = (k, face) => S.find((s) => s.token === k) || S.find((s) => s.face === face);
    const hd = tok('headline', 'display'), bd = tok('body', 'body'), cp = tok('caption', 'body');
    const bg = P.light.hex, fg = P.inkOn(bg), soft = P.softOn(bg), quiet = P.quietOn(bg);
    const X = 60, Y = 316, W = 912, pad = 48, iw = W - pad * 2, dstr = B.fonts.display.stretch || 100;
    const hL = lh(hd), f = fitBalanced(ctx, 'display', B.type.sample.headline, hd.size, iw, 2, -0.01, hd.weight, 2, 28), hlh = Math.round(f.size * hL / hd.size);
    // two lines never end on a lone word: take the split whose longer line is shortest
    if (f.lines.length === 2 && !f.lines[1].includes(' ')) {
      const w = B.type.sample.headline.split(/\s+/), m = (t) => adv(ctx, 'display', t, f.size, -0.01, hd.weight);
      let bestK = 1, bestW = 1e9; for (let k = 1; k < w.length; k++) { const mw = Math.max(m(w.slice(0, k).join(' ')), m(w.slice(k).join(' '))); if (mw < bestW) { bestW = mw; bestK = k; } }
      if (bestW <= iw) f.lines = [w.slice(0, bestK).join(' '), w.slice(bestK).join(' ')];
    }
    const head = f.lines.map((l, i) => put(ctx, { x: X + pad, y: Y + pad + i * hlh, w: iw, h: hlh, role: 'display', size: f.size, line: hlh, weight: hd.weight, style: `font:${hd.weight} ${f.size}px/${hlh}px var(--display);font-stretch:${dstr}%;letter-spacing:-0.01em;color:${fg}`, html: A(l) })).join('');
    const py = Y + pad + f.lines.length * hlh + 32, pw = 432, ph = 288;
    const shot = (B.imagery.shots || []).findIndex((s) => s.photo);
    const photo = `<div class="a fr" style="left:${X + pad}px;top:${py}px;width:${pw}px;height:${ph}px">${photoFrame(ctx, Math.max(0, shot), pw, ph, 0)}</div>`;
    const cL = lh(cp), cLines = wrap(ctx, 'body', B.type.sample.caption, cp.size, pw, 0, cp.weight).length;
    const capT = put(ctx, { x: X + pad, y: py + ph + 12, w: pw, h: cL * cLines, role: 'body', size: cp.size, line: cL, weight: cp.weight, style: `font:${cp.weight} ${cp.size}px/${cL}px var(--body);color:${quiet};white-space:normal`, html: A(B.type.sample.caption) });
    const tx = X + pad + pw + 32, tw = X + W - pad - tx, bL = lh(bd), bLines = wrap(ctx, 'body', B.type.sample.paragraph, bd.size, tw, 0, bd.weight).length;
    const text = put(ctx, { x: tx, y: py - (bL - bd.size) / 2 + 0, w: tw, h: bL * bLines, role: 'body', size: bd.size, line: bL, weight: bd.weight, style: `font:${bd.weight} ${bd.size}px/${bL}px var(--body);color:${soft};white-space:normal`, html: A(B.type.sample.paragraph) });
    const H = (py + ph + 12 + cL * cLines + pad) - Y;
    const sheet = `<div class="a" style="left:${X}px;top:${Y}px;width:${W}px;height:${H}px;background:${bg}"></div>`;
    // the column: what each part is set in, the size the piece shows it at
    const fam = (s) => B.fonts[s.face].family, spec = (s, size) => `${fam(s)} ${WNAME[s.weight] || s.weight}`;
    const parts = [['Headline', hd, f.size, f.size === hd.size ? hlh : hlh], ['Paragraph', bd, bd.size, bL], ['Caption', cp, cp.size, cL]];
    let ky = 512;
    const keys = parts.map(([n, s, size, line]) => { const y = ky; ky += 64;
      return label(ctx, 996, y, n) + put(ctx, { x: 996, y: y + 22, w: 300, h: 22, role: 'body', size: 14, line: 22, style: 'font:400 14px/22px var(--body);color:var(--soft)', html: A(spec(s, size)) }) + mono(ctx, 1316, y + 24, 124, `${size} / ${line}`, 'right'); }).join('');
    const same = f.size === hd.size;
    const foot = para(ctx, 996, ky + 8, 444, same ? 'Set at the sizes the brand uses, one to one: nothing on this sheet is scaled.' : `Set at the sizes the brand uses, except the headline, brought down to ${f.size} px to hold two lines on this sheet.`, { max: 3 });
    const L = (o) => (B.lines.others || [])[o] || (B.voice.principles[o] || {}).example || B.lines.primary;
    const cap = ownCap(ctx, id, { night: () => `${stop(L(0))} Set on ${P.action.name}, at poster size.`, card: () => `${B.applications.card.person}’s card: the name in ${B.fonts.display.family}, the details in ${B.fonts.body.family}.` });
    return page(ctx, id, sheet + head + photo + capT + text + cap + hline(996, 488, 444) + keys + foot.html);
  },

  // Type rules: each rule shown at work, the right way in full ink and the wrong way in the quiet tone beside it, with the rule's words under each.
  'type-rules'(ctx) {
    const B = ctx.brand, P = palette(ctx), S = B.type.scale, id = 'type-rules', R = B.type.rules.slice(0, 5);
    const tok = (k, face) => S.find((s) => s.token === k) || S.find((s) => s.face === face);
    const ti = tok('title', 'display'), bd = tok('body', 'body'), dstr = B.fonts.display.stretch || 100;
    const c = (B.ui.screen && B.ui.screen.content) || {}, btn = (c.form && c.form.book) || 'Book';
    const o = B.lines.others || [], line = o[0] || B.type.sample.headline;
    const disp = (t, size, extra = '', colr = 'var(--ink)') => ({ html: (x, y, w) => put(ctx, { x, y, w, h: Math.round(size * 1.3), role: 'display', size, line: Math.round(size * 1.3), weight: ti.weight, style: `font:${ti.weight} ${size}px/${Math.round(size * 1.3)}px var(--display);font-stretch:${dstr}%;letter-spacing:-0.01em;color:${colr};${extra}`, html: A(t) }), h: Math.round(size * 1.3) });
    const bodyT = (t, size, colr, fam = 'body') => ({ html: (x, y, w) => put(ctx, { x, y, w, h: 28, role: fam === 'mono' ? 'mono' : 'body', size, line: 28, style: `font:400 ${size}px/28px var(--${fam});color:${colr}`, html: A(t) }), h: 28 });
    // a demonstration for each rule, chosen by what the rule is about; a rule nothing on a page can show honestly (fading text) keeps its words only
    const demo = (r) => {
      const t = `${r.do} ${r.dont}`;
      if (/mono/i.test(t)) return [bodyT(P.action.hex, 14, 'var(--ink)', 'mono'), bodyT(btn, 14, 'var(--quiet)', 'mono')];
      if (/opacity|fade/i.test(t)) return [null, null];
      if (/track|letter-spac/i.test(t)) { const w = pickLine(ctx, 'display', ti.size, ti.weight, 440, 0.14); return [disp(w, ti.size), disp(w, ti.size, 'letter-spacing:0.14em', 'var(--quiet)')]; }
      if (/capital|upper ?case|sentence case/i.test(t)) { const w = pickLine(ctx, 'display', ti.size, ti.weight, 440, -0.01, true); return [disp(w, ti.size), disp(w, ti.size, 'text-transform:uppercase', 'var(--quiet)')]; }
      if (/\d+\s*px/.test(t) && /smaller|under|below/i.test(t)) { const w = sentenceFit(ctx, 'body', bd.size, 400, 440); return [bodyT(w, bd.size, 'var(--ink)'), bodyT(w, 10, 'var(--quiet)')]; }
      if (/display face/i.test(t) && /paragraph|label/i.test(t)) { const w = sentenceFit(ctx, 'display', 14, ti.weight, 440); return [disp(pickLine(ctx, 'display', ti.size, ti.weight, 440), ti.size), disp(w, 14, '', 'var(--quiet)')]; }
      return [null, null];
    };
    let y = 348, rows = '';
    R.forEach((r, i) => {
      const [d0, d1] = demo(r), dh = Math.max(d0 ? d0.h : 0, d1 ? d1.h : 0), ty = y + (dh ? dh + 8 : 0);
      if (d0) rows += d0.html(60, y + dh - d0.h, 444); if (d1) rows += d1.html(528, y + dh - d1.h, 444);
      const a = para(ctx, 60, ty, 420, r.do, { max: 3 }), b = para(ctx, 528, ty, 420, r.dont, { max: 3 });
      rows += a.html + b.html;
      y = ty + Math.max(a.h, b.h) + 20;
      if (i < R.length - 1) { rows += hline(60, y, 912); y += 21; }
    });
    const heads = label(ctx, 60, 316, 'Do') + label(ctx, 528, 316, 'Don’t');
    const sizes = S.map((s) => s.size), smallest = Math.min(...sizes);
    const words = para(ctx, 996, 512, 444, `${inWords(R.length).replace(/^./, (m) => m.toUpperCase())} rules for setting type. Nothing is set under ${smallest} px, and only the display face goes over ${Math.max(...S.filter((s) => s.face !== 'display').map((s) => s.size))} px.`, { max: 4 });
    const cap = ownCap(ctx, id, { card: () => `${B.applications.card.person}’s card: the name in ${B.fonts.display.family}, the details in ${B.fonts.body.family}.`, night: () => `${stop((B.lines.others || [B.lines.primary])[0])} Set on ${P.action.name}, at poster size.` });
    return page(ctx, id, heads + rows + cap + hline(996, 488, 444) + words.html);
  },
};

export function css() {
  // the edge print's arrow turned to point back at a wedge step: the base colour's marker on the colour values page
  return `.pg .g3-big .ph-c{font-size:24px}
.pg .g3-tl{display:block;width:0;height:0;border-right:7px solid var(--ink);border-top:5px solid transparent;border-bottom:5px solid transparent}`;
}
