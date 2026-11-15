// Theme 31, Contact sheet: the six round-1 gate pages. Layouts are spec 5.1 to 5.6; the strip, loop, caption column and foot come from helpers.js.
import { outline } from '../../engine/logo.js';
import { A, tokens, palette, cwOn, put, hline, adv, shown, wrap, fitLines, fontOf, splitLine, shell, captionHead, px, rollOf, frameLabel } from './helpers.js';
import { cut, photoFrame, photoShot } from './arts.js';

const frameFn = (ctx) => (setup, k, w, h, f, v = 0) => (setup === 'photo' ? photoFrame(ctx, k, w, h, v) : cut(ctx, setup, k, w, h, 'Frame ' + f));
const fullDate = (ctx) => new Date(ctx.brand.version.date + 'T00:00:00Z').toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const logoAt = (ctx, bg, w) => ctx.logo.html('colour', { width: w, colourway: cwOn(ctx, bg) });
const page = (ctx, id, body) => { const T = tokens(ctx); return shell(ctx, id, T, body, frameFn(ctx)); };


const printBox = (ctx, x, y, w, h, setup, v, alt) => `<div class="a fr" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px">${cut(ctx, setup, v, w, h, alt)}</div>`;
// the page's own frame (the one the loop circles), printed 678 x 452: the roll's photograph where it holds one, else the setup's render
const framePrint = (ctx, x, y, w, h, f, alt) => {
  const r = rollOf(ctx)[f];
  return `<div class="a fr" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px">${r[0] === 'photo' ? photoFrame(ctx, r[1], w, h, 0) : cut(ctx, r[0], 0, w, h, alt)}</div>`;
};
// its caption: the shot's own caption (never its alt text), then who took it; the slot edition says what goes there
const photoCap = (ctx, x, w, f, no) => {
  const r = rollOf(ctx)[f], s = photoShot(ctx, r[1]);
  return capUnder(ctx, x, w, no, s ? s.caption : 'Your photograph', s ? (s.generated ? '' : `Photo: ${s.credit || 'the studio'}.`) : 'The frame the book circles is your own photograph, as shot, in the daylight you work in.');
};
// the brand line said once on a page: drop any sentence that carries it from a paragraph (the headline already says it)
const withoutLine = (ctx, t) => { const key = ctx.brand.lines.primary.replace(/[.!?]+$/, '').toLowerCase(); const parts = t.match(/[^.!?]+[.!?]+(\s|$)/g) || [t]; const kept = parts.filter((p) => !p.toLowerCase().includes(key)); return (kept.length ? kept : parts).join('').trim(); };
const firstSentence = (t) => { const m = t.match(/^.*?[.!?](?=\s|$)/); return m ? m[0] : t; };
// the caption under a print: the frame number, the title, then the words. Both prints end at y 768 and the caption starts at 792, on every page that has a print
const capUnder = (ctx, x, w, no, title, text, lines = 2) => captionHead(ctx, { x, w, no, title, text, head: 792, baseline: 824, titleY: 848, textY: 876, lines });
// the line about a poster, said only as far as the picture shows it: the brand's signage line when it quotes the line on the poster, else the line itself
const posterNote = (ctx, P) => { const B = ctx.brand; return B.applications.signage.includes(B.lines.primary) ? B.applications.signage : `The primary line at poster size, on ${P.dark.name}.`; };
const label = (ctx, x, y, t, w = 444) => put(ctx, { x, y, w, h: 16, cls: 'nl', role: 'chrome', size: 12, line: 16, weight: 500, html: A(t) });
// a display headline in explicit lines, stepping down until it holds `maxLines`
function headline(ctx, x, y, text, size0, lineH, w, maxLines, minSize = 28) {
  const wt = ctx.weights.heading, f = fitLines(ctx, 'display', text, size0, w, maxLines, -0.01, wt, 4, minSize), lh = Math.round(f.size * lineH / size0);
  return { h: f.lines.length * lh, html: f.lines.map((l, i) => put(ctx, { x, y: y + i * lh, w, h: lh, cls: 'disp', role: 'display', size: f.size, line: lh, weight: wt, style: `font-size:${f.size}px`, html: A(l) })).join('') };
}

const capNo = (ctx, id) => String(ctx.pageNo(id)).padStart(2, '0');
// whole sentences of `text` that wrap into at most `maxLines` at the given size
function sentencesFit(ctx, text, size, w, maxLines) {
  const parts = text.match(/[^.!?]+[.!?]+(\s|$)/g) || [text]; let out = '';
  for (const s of parts) { const t = (out + s).trim(); if (wrap(ctx, 'body', t, size, w, 0, 400).length > maxLines) break; out = t + ' '; }
  return (out || text).trim();
}
const small = (ctx, x, y, w, h, html, extra = '') => put(ctx, { x, y, w, h, role: 'body', size: 12, line: 18, style: `font:400 12px/18px var(--body);color:var(--soft);white-space:normal;${extra}`, html });
const titleCase = (s) => s.replace(/-/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());

const WNAME = { 100: 'Thin', 200: 'Extralight', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'Semibold', 700: 'Bold', 800: 'Extrabold', 900: 'Black' };
const listJoin = (a) => (a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]);
const weightsText = (ws) => listJoin(ws.map((w) => `${WNAME[w] || 'Weight'} ${w}`));
const AX = { opsz: 'optical size', wdth: 'width', slnt: 'slant' };
const axesText = (axes) => (axes || '').split(/[,;]/).map((s) => s.trim().match(/^(\w+)\s+([\d.]+)$/)).filter((m) => m && AX[m[1]]).map((m) => `${AX[m[1]]} ${m[2]}`).join(', ');

export const guidelines = {
  'business-card'(ctx) {
    const B = ctx.brand, P = palette(ctx), n = ctx.pageNo('business-card');
    // the poster's frame is whichever frame on this strip holds the poster setup
    const roll = rollOf(ctx), pf = [n - 2, n - 1, n + 1, n + 2, n + 3].find((f) => roll[f] && roll[f][0] === 'poster') || n + 2;
    const a = printBox(ctx, 60, 316, 678, 452, 'lightbox', 1, 'The studio sheet under the loupe');
    const b = printBox(ctx, 996, 316, 444, 452, 'poster', 1, 'Poster in a black frame');
    const cap = capUnder(ctx, 60, 678, capNo(ctx, 'business-card'), 'The studio sheet under the loupe', `A4 landscape on ${P.light.name}, on top of every set of proofs.`);
    const cap2 = capUnder(ctx, 996, 444, frameLabel(pf), 'Poster in a black frame', posterNote(ctx, P), 3);
    return page(ctx, 'business-card', a + b + cap + cap2);
  },
  typefaces(ctx) {
    const B = ctx.brand, T = tokens(ctx), P = palette(ctx), F = B.fonts, wt = ctx.weights.heading, dstr = F.display.stretch || 100, sc = B.type.scale;
    const inSelf = (x, y, w, fam, size, line, wght, role, extra = '') => put(ctx, { x, y, w, h: line, role, size, line, weight: wght, style: `font:${wght} ${size}px/${line}px var(--${fam});${fam === 'display' ? `font-stretch:${dstr}%;` : ''}color:var(--ink);${extra}`, html: A(F[fam].family) });
    const dDetail = `${weightsText(F.display.weights)}${axesText(F.display.axes) ? ', ' + axesText(F.display.axes) : ''}.`;
    const useTokens = sc.filter((s) => s.face === 'display').map((s) => s.token);
    // the extreme element: the first letter of the name, as large as it can go without reaching the body column
    const ch = ctx.placeholders ? "A" : [...B.name][0]; let ks = 520; while (adv(ctx, 'display', ch, ks, 0, wt) > 440 && ks > 240) ks -= 20;
    const left = inSelf(60, 316, 558, 'display', 56, 60, wt, 'display')
      + small(ctx, 60, 388, 558, 24, A(dDetail), 'font-size:16px;line-height:24px')
      + put(ctx, { x: 60, y: 420, w: 558, h: 22, cls: 'cx', style: 'color:var(--quiet)', html: A(`For ${listJoin(useTokens)}.`) })
      + (() => { const o = outline(fontOf(ctx, 'display', wt), ch, ks, 0), w = o.x2 - o.x1, h = o.y2 - o.y1;
        return `<svg class="a" style="left:60px;top:${px(900 + o.y1)}" width="${px(w)}" height="${px(h)}" viewBox="0 0 ${+w.toFixed(2)} ${+h.toFixed(2)}" role="img" aria-label="${A(ch)}"><path d="${o.d}" transform="translate(${+(-o.x1).toFixed(2)} ${+(-o.y1).toFixed(2)})" fill="${T.ink}"/></svg>`; })();
    const bw = F.body.weights;
    const monoRule = (B.type.rules.find((r) => /mono/i.test(r.do)) || B.type.rules[B.type.rules.length - 1]).do;
    const mid = inSelf(528, 552, 444, 'body', 32, 36, 500, 'body')
      + put(ctx, { x: 528, y: 600, w: 444, h: 22, cls: 'cx', html: A(`${weightsText(bw)}.`) })
      + put(ctx, { x: 528, y: 640, w: 444, h: 100, cls: 'cx', style: 'font:400 16px/25px var(--body)', html: A(B.type.sample.paragraph) })
      + inSelf(528, 788, 444, 'mono', 20, 28, 400, 'mono')
      + put(ctx, { x: 528, y: 824, w: 444, h: 22, role: 'mono', size: 14, line: 22, style: 'font:400 14px/22px var(--mono);color:var(--soft);white-space:pre', html: A(P.action.hex) })
      + put(ctx, { x: 528, y: 852, w: 444, h: 44, cls: 'cx', style: 'color:var(--quiet)', html: A(monoRule) });
    // the scale: a step is drawn at its true size with the brand's whole line when the line holds in its column; a step too big for the column is listed with its face and size and no sample, never cut to a fragment
    const own = { display: B.lines.primary, title: (B.lines.others || [])[0] || B.lines.primary };
    const sampleOf = (s) => (s.token === 'title' ? own.title : s.token === 'display' ? own.display : B.type.sample.headline);
    let y = 504;
    const rows = sc.slice(0, 6).map((s) => {
      const role = s.face === 'display' ? 'display' : 'body', fam = role, fst = fam === 'display' ? `font-stretch:${dstr}%;` : '';
      const spec = put(ctx, { x: 1316, y: y + 0, w: 124, h: 18, cls: 'mono', role: 'mono', size: 12, line: 18, style: 'text-align:right', html: A(`${s.size} / ${Math.round(s.size * s.line)}, ${s.weight}`) });
      const tok = put(ctx, { x: 996, y: y + 1, w: 110, h: 16, cls: 'nl', role: 'chrome', size: 12, line: 16, weight: 500, html: A(s.token) });
      const text = sampleOf(s);
      if (role === 'display') {
        const size = s.size, line = Math.round(size * s.line), top = y + 20;
        if (adv(ctx, role, text, size, 0, s.weight) > 444) { const html = tok + spec + small(ctx, 1113, y, 200, 18, A(F.display.family)); y += 28; return html; }
        const html = tok + spec + put(ctx, { x: 996, y: top, w: 444, h: line, role, size, line, weight: s.weight, style: `font:${s.weight} ${size}px/${line}px var(--${fam});${fst}color:var(--ink)`, html: A(text) });
        y = top + line + 14; return html;
      }
      const size = Math.min(s.size, 16);
      const html = tok + put(ctx, { x: 1113, y, w: 203, h: 20, role, size, line: 20, weight: s.weight, style: `font:${s.weight} ${size}px/20px var(--${fam});${fst}color:var(--ink)`, html: A(adv(ctx, role, shown(ctx, text), size, 0, s.weight) + (ctx.placeholders ? 12 : 0) <= 203 ? text : F.body.family) })
        + put(ctx, { x: 1316, y, w: 124, h: 18, cls: 'mono', role: 'mono', size: 12, line: 18, style: 'text-align:right', html: A(`${s.size} / ${Math.round(s.size * s.line)}, ${s.weight}`) });
      y += 26; return html;
    }).join('');
    // two rules, each one line at 14 px where the brand has such rules, so nothing ends on a lone word
    const oneLine = B.type.rules.map((r) => r.do).filter((t) => adv(ctx, 'body', t, 14, 0, 400) <= 440);
    const picks = [...oneLine, ...B.type.rules.map((r) => r.do).filter((t) => !oneLine.includes(t))].slice(0, 2);
    const ry = y + 52; let rr = ry;
    const rules = picks.map((t) => { const ln = wrap(ctx, 'body', t, 14, 444, 0, 400).length, h = put(ctx, { x: 996, y: rr, w: 444, h: 22 * ln, cls: 'cx', html: A(t) }); rr += 22 * ln + 8; return h; }).join('');
    const cap = captionHead(ctx, { no: capNo(ctx, 'typefaces'), title: 'Print order letter on linen', text: `${F.body.family} for the letter, ${F.display.family} for the one line that matters.`, lines: 2 });
    return page(ctx, 'typefaces', left + mid + cap + hline(996, 488, 444) + rows + hline(996, y + 4, 444) + label(ctx, 996, y + 24, 'Rules') + rules);
  },
  palette(ctx) {
    const B = ctx.brand, T = tokens(ctx), P = palette(ctx), cols = B.colours.slice(0, 6);
    // the test strip: fields in share order, widths floor(912 x share), the last taking the remainder; each field says its share, the rows say the names and hexes
    let x = 60; const ws = cols.map((c, i) => (i === cols.length - 1 ? 972 - 60 - cols.slice(0, i).reduce((s, d, j) => s + Math.floor(912 * d.share), 0) : Math.floor(912 * c.share)));
    const fields = cols.map((c, i) => {
      const w = ws[i], x0 = x; x += w;
      const ink = ctx.ratio(T.ink, c.hex) >= ctx.ratio(T.ground, c.hex) ? T.ink : T.ground, room = w - 24;
      let h = `<div class="a" style="left:${x0}px;top:316px;width:${w}px;height:300px;background:${c.hex}"></div>`;
      const pct = `${Math.round(c.share * 100)}%`;
      if (adv(ctx, 'edge', pct, 32, 0, 600) <= room) h += put(ctx, { x: x0 + 12, y: 328, w: room, h: 32, cls: 'fno num', role: 'edge', size: 32, line: 32, weight: 600, style: `font-size:32px;line-height:32px;color:${ink}`, html: pct });
      return h;
    }).join('') + `<div class="a" style="left:60px;top:316px;width:912px;height:300px;box-shadow:inset 0 0 0 1px var(--hair);pointer-events:none"></div>`;
    // the rule
    const rule = B.guideB.rules[1].text, first = firstSentence(rule), rest = rule.slice(first.length).trim();
    const hd = headline(ctx, 60, 664, first, 40, 44, 558, 2);
    const ruleText = put(ctx, { x: 60, y: 664 + hd.h + 12, w: 558, h: 44, cls: 'cx', html: A(rest) });
    // the tones
    const tones = (B.tones || []).slice(0, 5).map((t, i) => { const tx = [60, 242, 424, 606, 788][i];
      return `<div class="a" style="left:${tx}px;top:880px;width:24px;height:24px;background:${t.hex};box-shadow:inset 0 0 0 1px var(--hair)"></div>` + put(ctx, { x: tx + 36, baseline: 897, w: 146, h: 16, role: 'body', size: 12, line: 16, style: 'font:400 12px/16px var(--body);color:var(--soft)', html: A(t.name) }); }).join('');
    // the colour rows
    const rh = cols.length > 4 ? 64 : 72;
    const rows = cols.map((c, i) => { const y = 512 + i * rh;
      return `<div class="a" style="left:996px;top:${y}px;width:32px;height:32px;background:${c.hex};box-shadow:inset 0 0 0 1px var(--hair)"></div>`
        + put(ctx, { x: 1044, y, w: 280, h: 20, role: 'body', size: 14, line: 20, weight: 500, style: 'font:500 14px/20px var(--body);color:var(--ink)', html: A(c.name) })
        + put(ctx, { x: 1340, y, w: 100, h: 20, role: 'mono', size: 12, line: 20, style: 'font:400 12px/20px var(--mono);color:var(--quiet);text-align:right', html: A(c.hex) })
        + small(ctx, 1044, y + 22, 396, 36, A(sentencesFit(ctx, c.lands, 12, 396, 2))); }).join('');
    const cap = captionHead(ctx, { no: capNo(ctx, 'palette'), title: 'Print bag on the studio hook', text: `${P.action.name} on ${P.dark.name} canvas: the palette in the proportion people carry it.`, lines: 2 });
    return page(ctx, 'palette', fields + hd.html + ruleText + label(ctx, 60, 848, 'Tones') + tones + cap + hline(996, 488, 444) + rows);
  },
  logo(ctx) {
    const B = ctx.brand, T = tokens(ctx), P = palette(ctx), L = ctx.logo, G = L.geos.colour, cw0 = cwOn(ctx, T.ground), slotEd = ctx.edition === 'slot';
    // clear space: the primary logo at 400 wide in a panel, a box one clearUnit out on every side
    const lw = 400, lh = (G.h / G.w) * lw, u = L.geo.unit * lw / G.w, px0 = 60 + (558 - lw) / 2, py0 = 316 + (220 - lh) / 2;
    const clear = `<div class="a" style="left:60px;top:316px;width:558px;height:220px;background:var(--panel)"></div>`
      + `<div class="a" style="left:${px(px0 - u)};top:${px(py0 - u)};width:${px(lw + 2 * u)};height:${px(lh + 2 * u)};box-shadow:inset 0 0 0 1px var(--quiet)"></div>`
      + `<div class="a" style="left:${px(px0)};top:${px(py0)};width:${lw}px">${L.html('colour', { width: lw, colourway: cw0 })}</div>`
      + put(ctx, { x: px0 - u, y: py0 - u + (u - 16) / 2, w: lw + 2 * u, h: 16, cls: 'nl', role: 'chrome', size: 12, line: 16, weight: 500, align: 'center', html: 'x' })
      + put(ctx, { x: px0 - u, y: py0 + (lh - 16) / 2, w: u, h: 16, cls: 'nl', role: 'chrome', size: 12, line: 16, weight: 500, align: 'center', html: 'x' });
    const note = small(ctx, 60, 560, 558, 18, A("x is the height of the wordmark's lowercase."));
    const SG = L.geos.symbol, ss = Math.min(300 / SG.w, 200 / SG.h), sw = SG.w * ss, sh = SG.h * ss;
    const sym = `<div class="a" style="left:645px;top:316px;width:327px;height:218px;background:var(--panel)"></div><div class="a" style="left:${px(645 + (327 - sw) / 2)};top:${px(316 + (218 - sh) / 2)};width:${px(sw)}">${L.html('symbol', { width: sw, colourway: cw0 })}</div>`
      + small(ctx, 645, 552, 327, 36, A(B.logo.showcase.symbolNote));
    // the colourways; in the slot edition the label is the short one and the ink is the best of the brand's two ends and its action label on that ground
    const cws = Object.keys(B.logo.colourways).slice(0, 6), RL = ctx.roles;
    // a slot frame at a wide logo's proportion is too short to hold its words: the slot edition keeps the frame at least 28 px high so the dashes stay clear of the text
    const slotH = (w) => Math.max(28, (G.h / G.w) * w), slotFit = (html, w) => html.replace(/height:[\d.]+px/, `height:${slotH(w).toFixed(1)}px`);
    const slotInk = (g) => [P.light.hex, P.dark.hex, RL.light.actionLabel, RL.dark.actionLabel].filter(Boolean).reduce((a, b) => (ctx.ratio(b, g) > ctx.ratio(a, g) ? b : a));
    const tiles = cws.map((k, i) => {
      const x = 60 + i * 154, g = B.logo.colourways[k].ground, same = g.toLowerCase() === T.ground.toLowerCase();
      const logo = slotEd ? slotFit(L.html('colour', { width: 104, colourway: k, color: slotInk(g), label: 'Your logo' }), 104) : L.html('colour', { width: 104, colourway: k }), lh0 = slotEd ? slotH(104) : (G.h / G.w) * 104;
      return `<div class="a" style="left:${x}px;top:600px;width:140px;height:93px;background:${g};${same ? 'box-shadow:inset 0 0 0 1px var(--hair)' : ''}"></div>`
        + `<div class="a" style="left:${x + 18}px;top:${px(600 + (93 - lh0) / 2)};width:104px;color:${P.inkOn(g)}">${logo}</div>`
        + put(ctx, { x, baseline: 714, w: 140, h: 16, cls: 'nl', role: 'chrome', size: 12, line: 16, weight: 500, html: A(L.labels[k] || titleCase(k)) });
    }).join('');
    // smallest
    const mw = B.logo.showcase.minScreenPx;
    const sm = `<div class="a" style="left:60px;top:760px;width:72px">${slotEd ? L.html('colour', { width: mw, colourway: cw0, label: '' }) : L.html('colour', { width: mw, colourway: cw0 })}</div>`
      + small(ctx, 60, 812, 420, 18, `<span class="mono">${mw}&thinsp;px</span> on screen, <span class="mono">${B.logo.showcase.minPrintMm}&thinsp;mm</span> in print`);
    // don'ts: the misuse drawn from the panel towards the ink until it holds 3 to 1 on the panel (4.5 to 1 in the slot edition, where it carries words)
    const C = ctx.C, pn = C.toOklch(T.panel), ik = C.toOklch(T.ink), want = slotEd ? 4.5 : 3;
    let grey = T.ink; for (let t = 0.5; t <= 1.001; t += 0.02) { grey = C.fromOklch(pn.L + t * (ik.L - pn.L), pn.C, pn.H); if (ctx.ratio(grey, T.panel) >= want) break; }
    const dw = 120, dh = slotEd ? slotH(dw) : (G.h / G.w) * dw;
    // the slot edition draws the slot frame itself, never the sample brand's wordmark
    const solid = slotEd ? slotFit(L.html('colour', { width: dw, color: grey, label: 'Your logo' }), dw) : L.svg('colour', { width: dw, fill: grey });
    const outl = slotEd ? solid.replace(`;color:${grey};`, `;color:transparent;-webkit-text-stroke:.6px ${grey};`) : solid.replace(/fill="[^"]*"/g, `fill="none" stroke="${grey}" stroke-width="1.5" vector-effect="non-scaling-stroke"`);
    const cell = (x, inner, txt) => `<div class="a" style="left:${x}px;top:748px;width:210px;height:140px;background:var(--panel)"></div><div class="a" style="left:${x + (210 - dw) / 2}px;top:${px(748 + (140 - dh) / 2)};width:${dw}px;height:${px(dh)}">${inner}</div>`
      + put(ctx, { x, baseline: 908, w: 210, h: 16, role: 'body', size: 12, line: 16, style: 'font:400 12px/16px var(--body);color:var(--soft)', html: A(txt) });
    const donts = cell(294, `<div style="transform:scaleX(1.3)">${solid}</div>`, "Don't stretch it.") + cell(528, `<div style="transform:rotate(-8deg)">${solid}</div>`, "Don't rotate it.") + cell(762, outl, "Don't outline it.");
    // right column: the idea, then when to use each; each use is one line (its first sentence if the whole will not fit)
    const oneLine = (t) => (adv(ctx, 'body', t, 12, 0, 400) <= 440 ? t : firstSentence(t));
    const idea = sentencesFit(ctx, B.logo.idea, 14, 444, 6), wy = 512 + 22 * wrap(ctx, 'body', idea, 14, 444, 0, 400).length + 36;
    const when = Object.keys(B.logo.when).filter((k) => B.logo.colourways[k]).slice(0, 4).map((k, i) => put(ctx, { x: 996, y: wy + 24 + i * 48, w: 444, h: 16, role: 'body', size: 12, line: 16, weight: 500, style: 'font:500 12px/16px var(--body);color:var(--ink)', html: A(L.labels[k] || titleCase(k)) }) + small(ctx, 996, wy + 42 + i * 48, 444, 18, A(oneLine(B.logo.when[k])))).join('');
    const cap = captionHead(ctx, { no: capNo(ctx, 'logo'), title: 'Portfolio book, in hand', text: `The stacked logo on ${(P.panel || P.dark).name} cloth.`, lines: 1 });
    const right = hline(996, 488, 444) + put(ctx, { x: 996, y: 512, w: 444, h: 132, cls: 'cx', html: A(idea) }) + label(ctx, 996, wy, 'When to use each') + when;
    return page(ctx, 'logo', clear + note + sym + tiles + sm + donts + cap + right);
  },
  intro(ctx) {
    const B = ctx.brand, P = palette(ctx);
    const cap = photoCap(ctx, 60, 678, ctx.pageNo('intro'), capNo(ctx, 'intro'));
    // the headline sits straight under the rule; the paragraph starts 24 px under its last line; the personality block follows the paragraph
    const hd = headline(ctx, 996, 512, B.lines.primary, 40, 44, 444, 2), ay = 512 + hd.h + 24;
    const boiler = withoutLine(ctx, B.voice.boilerplate50), aboutLines = wrap(ctx, 'body', boiler, 14, 444, 0, 400).length;
    const about = put(ctx, { x: 996, y: ay, w: 444, h: 22 * aboutLines, cls: 'cx', html: A(boiler) });
    const py = ay + 22 * aboutLines + 36;
    const stk = !!ctx.placeholders, pitch = stk ? 48 : 32;
    const rows = B.personality.slice(0, 3).map((p, i) => put(ctx, { x: 996, y: py + 28 + i * pitch, w: stk ? 444 : 100, h: 20, cls: '', role: 'body', size: 14, line: 20, weight: 500, style: 'font:500 14px/20px var(--body);color:var(--ink);overflow:hidden;text-overflow:ellipsis', html: A(p.trait) })
      + put(ctx, { x: stk ? 996 : 1113, y: py + 28 + i * pitch + (stk ? 22 : 0), w: stk ? 444 : 327, h: 20, role: 'body', size: 14, line: 20, style: 'font:400 14px/20px var(--body);color:var(--soft);overflow:hidden;text-overflow:ellipsis', html: A(firstSentence(p.means)) })).join('');
    return page(ctx, 'intro', framePrint(ctx, 60, 316, 678, 452, ctx.pageNo('intro'), 'Frame 3') + cap + hline(996, 488, 444) + hd.html + about + label(ctx, 996, py, 'Personality') + rows);
  },

  cover(ctx) {
    const B = ctx.brand, T = tokens(ctx), P = palette(ctx), wt = ctx.weights.heading, dstr = B.fonts.display.stretch || 100, MW = 660;
    let lines = splitLine(B.lines.primary), size = 120;
    const over = () => lines.some((l) => adv(ctx, 'display', l, size, -0.02, wt) > MW);
    while (over() && size > 72) size -= 8;
    // still too wide: each sentence keeps its own line(s), so a break never falls mid-sentence ("ten. There")
    if (over()) { size = 88; const parts = splitLine(B.lines.primary), fit = () => parts.flatMap((p) => wrap(ctx, 'display', p, size, MW, -0.02, wt)); lines = fit(); while (lines.length > 3 && size > 48) { size -= 8; lines = fit(); } }
    const lh = Math.round(size * 116 / 120), last = 876;
    const base0 = last - (lines.length - 1) * lh;
    const text = lines.map((l, i) => put(ctx, { x: 60, baseline: base0 + i * lh, w: MW, h: lh, cls: 'disp', role: 'display', size, line: lh, weight: wt, style: `font-size:${size}px;letter-spacing:-0.02em;font-stretch:${dstr}%`, html: A(l) })).join('');
    // the logo large enough that its symbol keeps its notches (80 px or more wide)
    const lw = 288, lgh = (ctx.logo.geos.colour.h / ctx.logo.geos.colour.w) * lw;
    const logo = `<div class="a" style="left:60px;top:316px;width:${lw}px">${logoAt(ctx, T.ground, lw)}</div>`;
    const by = Math.round(316 + lgh + 64);
    const left = put(ctx, { x: 60, y: by, w: 444, h: 24, cls: 'ct', role: 'body', size: 16, line: 24, weight: 500, html: 'Brand guidelines' })
      + put(ctx, { x: 60, y: by + 28, w: 444, h: 22, cls: 'cx', html: A(`Version ${B.version.number}, ${fullDate(ctx)}`) })
      + put(ctx, { x: 60, y: by + 64, w: 444, h: 66, cls: 'cx', html: A(withoutLine(ctx, B.voice.boilerplate25)) });
    // the circled frame, printed: 678 x 452 on the right, its caption under it
    const print = framePrint(ctx, 762, 316, 678, 452, ctx.pageNo('cover'), 'Frame 1');
    const cap = photoCap(ctx, 762, 678, ctx.pageNo('cover'), capNo(ctx, 'cover'));
    return page(ctx, 'cover', text + logo + left + print + cap);
  },
};
