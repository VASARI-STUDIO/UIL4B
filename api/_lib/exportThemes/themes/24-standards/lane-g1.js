// Theme 24, Standards, lane g1: the brand and voice pages (contents, intro, voice, write-this, messaging, summary, contact-scope).
// Each page is a sheet of the standards manual: a ruled register whose rows are real counts from the brand data (sections, pages,
// principles, rewrites, rules, issues), numbered by section and item so a reference like 2.3 points at one thing. The device stays
// the theme's own: the running head, one thumb tab, dimension lines in x and the x-ruler lighting up the page's one hero.
// Every string is read from ctx.brand or ctx and printed whole through A(); no colour id, photo id or brand name is written here.
import { A, G, f2, pad3, xOf, fx, roles, adv, wrap, displayFont, loadFont, blk, fill, dimH, dimV, ruler, tab, head, page, colourwayFor, dateLong, span } from './helpers.js';

const WORD = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const word = (n) => WORD[n] || String(n);
const Word = (n) => { const w = word(n); return w[0].toUpperCase() + w.slice(1); };
const pg = (ctx, id) => ctx.pages.find((q) => q.id === id);
const bodyFont = (ctx, w) => loadFont(ctx.faces.find((f) => f.role === 'body' && f.weight === w && f.style !== 'italic').stem);
const topW = (f) => f.weights[f.weights.length - 1];
// the largest of the sizes at which text sets in at most maxLines lines inside w (measured with the face's own metrics)
function fit(font, text, w, sizes, maxLines) {
  for (const s of sizes) { const l = wrap(font, text, s, w); if (l.length <= maxLines) return { size: s, lines: l }; }
  const s = sizes[sizes.length - 1]; return { size: s, lines: wrap(font, text, s, w) };
}
const widest = (font, lines, size) => Math.max(...lines.map((l) => adv(font, l, size)));

export const css = () => `
.pg .g1-sec{font-size:20px;line-height:24px;font-weight:400;letter-spacing:-0.005em}
.pg .g1-no{font-size:20px;line-height:24px;font-weight:600;letter-spacing:-0.005em}
.pg .g1-ex{font-family:var(--body);font-size:17px;line-height:24px}
.pg .g1-big{font-family:var(--display);text-wrap:wrap}
.pg .g1-pages{font-size:12px;line-height:16px}
.pg .g1-reg{display:flex;justify-content:space-between;white-space:nowrap}
.pg .g1-wt{display:flex;flex-direction:column;box-sizing:border-box}
.pg .g1-wrow{flex:1 1 auto;display:grid;grid-template-columns:320px 320px 320px;column-gap:24px;align-content:start;padding:12px 0 16px}
.pg .g1-struck{text-decoration-line:line-through;text-decoration-thickness:1px}
.pg .g1-msg{display:flex;flex-direction:column;gap:20px}
.pg .g1-msg>div{padding-top:8px}
.pg .g1-msg h2{margin-bottom:6px}
.pg .g1-bp{font-family:var(--body);font-size:15px;line-height:22px;max-width:60ch}
`;

export const guidelines = {
  // ---- contents: the register. Nine rows, each level with its section's thumb tab; a run on each row places the section's
  // pages along the whole book, so the register is also a measured drawing of the manual ----
  contents(ctx) {
    const R = roles(ctx), secs = ctx.sections, N = ctx.pages.length, p = pg(ctx, 'contents');
    const S0 = 716, S1 = G.R, k = (S1 - S0) / N, f600 = loadFont('PublicSans-600');
    let body = '', svg = '';
    for (const s of secs) {
      const y = G.top + (s.n - 1) * G.tabPitch, first = s.pages[0].no, last = s.pages[s.pages.length - 1].no, n = s.pages.length;
      const names = s.pages.map((q) => pg(ctx, q.id).title).join(', ');
      body += fill(314, y, G.R - 314, 1, s.n === 1 ? R.ink : R.hair)
        + blk(314, y + 8, 32, 24, 'g1-no nw', String(s.n), `color:${R.ink}`)
        + blk(352, y + 8, 340, 24, 'g1-sec nw', A(s.title), `color:${R.ink}`, 'h2')
        + blk(352, y + 34, 340, 32, 'g1-pages', A(names), `color:${R.quiet}`)
        + blk(S1 - 120, y + 42, 120, 16, 'c-micro nw', `${pad3(first)}${n > 1 ? ` to ${pad3(last)}` : ''}`, `text-align:right;font-weight:600;color:${R.ink}`);
      // the whole book as a hairline, the section's pages as a 2 px run with slash ends and its page count over it
      const x1 = S0 + (first - 1) * k, x2 = S0 + last * k, ly = y + 24, lab = `${n} ${n === 1 ? 'page' : 'pages'}`, tw = adv(f600, lab, 12);
      const room = x2 + 8 + tw <= S1;
      svg += `<rect x="${S0}" y="${ly}" width="${S1 - S0}" height="1" fill="${R.hair}"/><rect x="${f2(x1)}" y="${ly - 0.5}" width="${f2(x2 - x1)}" height="2" fill="${R.ink}"/>`
        + dimH(ctx, { x1, x2, y: ly + 0.5, label: lab, col: R.ink, qcol: R.quiet, outside: true, labelAt: room ? x2 + 8 : x1 - 8 - tw });
    }
    const spec = [['Pages', String(N)], ['Sections', String(secs.length)], ['Page', `${Math.round((ctx.size.w * 25.4) / 96)} × ${Math.round((ctx.size.h * 25.4) / 96)} mm`], ['Unit', `1x = ${xOf(ctx)} px`]];
    const TY = G.bottom - spec.length * 32;
    body += head(ctx, 'contents', [{ x1: G.L, x2: G.R, col: R.ink, slots: [[G.col[0], `${ctx.brand.name} brand standards`], [G.col[3], p.title]] }])
      + blk(56, 88, 226, 24, 'c-title', A(p.title), `color:${R.ink}`, 'h1')
      + blk(56, 120, 226, 120, 'c-body', `${Word(N)} pages in ${word(secs.length)} sections. Each row sits level with its section's tab, and its run shows where those pages fall in the book.`, `color:${R.quiet}`, 'p')
      + spec.map(([a, b], i) => fill(56, TY + i * 32, 226, 1, R.hair) + blk(56, TY + i * 32 + 6, 226, 20, 'c-body g1-reg', `<span>${a}</span><span>${A(b)}</span>`, `color:${R.ink}`)).join('')
      + fill(56, G.bottom, 226, 1, R.hair)
      + secs.map((s) => tab(ctx, s.n)).join('');
    svg += ruler(ctx, { uid: 'g1c', live: [314, G.R], edgeAnchor: true });
    return page(ctx, 'contents', { bg: R.ground, body, svg });
  },

  // ---- voice: the principles as numbered clauses (section.item, so 2.3 names one principle) down the ground; the first
  // clause's own line set large on the dark field, as the brand would set it ----
  voice(ctx) {
    const R = roles(ctx), B = ctx.brand, p = pg(ctx, 'voice'), sn = p.section.n, P = B.voice.principles, n = P.length;
    const FX = 658, HX = 682, HW = G.R - HX;
    const dfont = displayFont(ctx, topW(B.fonts.display)), ex = P[0].example;
    const big = fit(dfont, ex, HW, [96, 88, 80, 72, 64, 56, 48, 40], 4), BY = 300;
    const bw = widest(dfont, big.lines, big.size);
    const RH = 104, RY = G.bottom - n * RH;
    const rows = P.map((q, i) => {
      const y = RY + i * RH;
      return fill(56, y, FX - 24 - 56, 1, i ? R.hair : R.ink)
        + blk(56, y + 12, 72, 24, 'g1-no nw', `${sn}.${i + 1}`, `color:${R.ink}`)
        + blk(142, y + 12, 234, 72, 'g1-sec' + (ctx.edition === 'slot' ? ' ph-tight' : ''), A(q.title), `color:${R.ink}`, 'h2')
        + blk(400, y + 12, 234, 80, 'g1-ex' + (ctx.edition === 'slot' ? ' ph-tight' : ''), A(q.example), `color:${R.ink}`, 'p');
    }).join('');
    const body = fill(FX, 0, ctx.size.w - FX, ctx.size.h, R.dark)
      + head(ctx, 'voice', [
        { x1: 56, x2: FX - 24, col: R.ink, slots: [[56, `${B.name} brand standards`], [314, `${sn} ${p.section.title}`]] },
        { x1: HX, x2: G.R, col: R.darkInk, slots: [[HX, p.title]] }])
      + blk(56, 88, 380, 24, 'c-title', A(p.title), `color:${R.ink}`, 'h1')
      + blk(56, 120, 380, 60, 'c-body', `${Word(n)} principles, numbered ${sn}.1 to ${sn}.${n}. Each comes with one line written to it, as it would be printed.`, `color:${R.quiet}`, 'p')
      + rows
      + blk(HX, BY - 56, HW, 16, 'c-head nw', `${sn}.1 in use`, `color:${R.darkInk}`)
      + blk(HX, BY, HW, big.size * big.lines.length + 8, 'g1-big', A(ex), `font-size:${big.size}px;line-height:${big.size}px;font-weight:${topW(B.fonts.display)};color:${R.darkInk}`, 'p')
      + tab(ctx, sn, { inverted: true });
    const svg = dimH(ctx, { x1: HX, x2: HX + bw, y: BY - 20, label: fx(ctx, bw), col: R.darkInk, qcol: R.darkQuiet, obj: BY + 4 })
      + ruler(ctx, { uid: 'g1v', pieces: [{ x1: 56, x2: FX - 12, ink: R.ink, quiet: R.quiet, hair: R.hair }, { x1: FX + 12, x2: G.R, ink: R.darkInk, quiet: R.darkQuiet, hair: R.darkQuiet }], live: [56, FX - 24], endAnchor: false });
    return page(ctx, 'voice', { bg: R.ground, body, svg });
  },

  // ---- intro: one register of four clauses (what it is, what it does, who it is for, where). Clause 1.1 is the hero, the
  // brand's own description set in its display face across the register's text column; the other three are short rows ----
  intro(ctx) {
    const R = roles(ctx), B = ctx.brand, p = pg(ctx, 'intro'), sn = p.section.n, dw = topW(B.fonts.display), dfont = displayFont(ctx, dw);
    const TX = G.col[3], TW = G.R - TX, RH = 72, RY = G.bottom - 3 * RH, HY = 216;
    // the largest size whose lines (line-height 1.05) leave 40 px above the next row for the measure line
    let big = null;
    for (const s of [64, 56, 52, 48, 44, 40, 36, 32, 28]) { const l = wrap(dfont, B.description, s, TW); if (l.length * Math.round(s * 1.05) <= RY - HY - 48) { big = { size: s, lines: l }; break; } }
    big = big || { size: 28, lines: wrap(dfont, B.description, 28, TW) };
    const lh = Math.round(big.size * 1.05), bw = widest(dfont, big.lines, big.size), bh = big.lines.length * lh;
    const label = (y, no, t) => blk(56, y + 12, 72, 24, 'g1-no nw', no, `color:${R.ink}`) + blk(142, y + 14, 148, 20, 'c-name', t, `color:${R.ink}`, 'h2');
    const rows = [['What it does', B.product], ['Who it is for', B.audience], ['Where', B.city]].map(([t, v], i) => {
      const y = RY + i * RH;
      return fill(56, y, G.W, 1, R.hair) + label(y, `${sn}.${i + 2}`, t) + blk(TX, y + 12, TW, 56, 'g1-ex', A(v), `color:${R.ink}`, 'p');
    }).join('');
    const body = head(ctx, 'intro')
      + blk(56, 88, 380, 24, 'c-title', A(p.title), `color:${R.ink}`, 'h1')
      + blk(56, 120, 380, 60, 'c-body', 'Four clauses the rest of this manual is written to: what the brand is, what it does, who it is for and where.', `color:${R.quiet}`, 'p')
      + fill(56, HY - 16, G.W, 1, R.ink) + label(HY - 16, `${sn}.1`, 'What it is')
      + blk(TX, HY, TW, bh + 8, 'g1-big' + (ctx.edition === 'slot' ? ' ph-tight' : ''), A(B.description), `font-size:${big.size}px;line-height:${lh}px;font-weight:${dw};color:${R.ink}`, 'p')
      + rows + tab(ctx, sn);
    const svg = dimH(ctx, { x1: TX, x2: TX + bw, y: HY + bh + 20, label: fx(ctx, bw), col: R.ink, qcol: R.quiet, obj: HY + bh + 4 })
      + ruler(ctx, { uid: 'g1i', live: [TX, TX + bw] });
    return page(ctx, 'intro', { bg: R.ground, body, svg });
  },

  // ---- write-this: the corrections register. Three columns measured in x across the head of the table; the line to write,
  // the line it replaces (struck through, as a correction is marked) and the reason ----
  'write-this'(ctx) {
    const R = roles(ctx), B = ctx.brand, p = pg(ctx, 'write-this'), sn = p.section.n, W = B.voice.writeThis, bw = B.fonts.body.weights;
    const cols = [G.col[0], G.col[4], G.col[8]], CW = span(4), HY = 232;
    const heads = ['Write this', 'Not that', 'Because'];
    const rows = W.map((r) => `<div class="g1-wrow" style="border-top:1px solid ${R.hair}">`
      + `<p class="g1-ex" style="font-weight:${bw.includes(600) ? 600 : bw[bw.length - 1]};color:${R.ink}">${A(r.write)}</p>`
      + `<p class="g1-ex g1-struck" style="color:${R.quiet};text-decoration-color:${R.quiet}">${A(r.not)}</p>`
      + `<p class="c-body" style="color:${R.ink};padding-top:2px">${A(r.because)}</p></div>`).join('');
    const body = head(ctx, 'write-this')
      + blk(56, 88, 380, 24, 'c-title', A(p.title), `color:${R.ink}`, 'h1')
      + blk(56, 120, 380, 60, 'c-body', `${Word(W.length)} corrections. Write the left-hand line; the middle one is what it replaces, and the right says why.`, `color:${R.quiet}`, 'p')
      + heads.map((h, i) => blk(cols[i], HY, CW, 16, 'c-head nw', h, `color:${R.ink}`)).join('')
      + fill(56, HY + 24, G.W, 1, R.ink)
      // the register runs to the foot of the content area, its rows sharing the height so the page reads as one ruled form
      + `<div class="a g1-wt" style="left:56px;top:${HY + 25}px;width:${G.W}px;min-height:${G.bottom - HY - 25}px;border-bottom:1px solid ${R.ink}">${rows}</div>`
      + tab(ctx, sn);
    const svg = cols.map((c) => dimH(ctx, { x1: c, x2: c + CW, y: HY - 20, label: fx(ctx, CW), col: R.ink, qcol: R.quiet, obj: HY - 4 })).join('')
      + ruler(ctx, { uid: 'g1w', live: [G.L, G.R], edgeAnchor: true });
    return page(ctx, 'write-this', { bg: R.ground, body, svg });
  },

  // ---- messaging: the lines in use on the brand's highlight field, set as the brand sets them; the two boilerplates and the
  // naming rule on the ground beside them, at a measure given in x ----
  messaging(ctx) {
    const R = roles(ctx), B = ctx.brand, V = B.voice, p = pg(ctx, 'messaging'), sn = p.section.n;
    const FX = 600, CX = 624, CW = G.R - CX, d = B.fonts.display, dw = topW(d), lw = d.weights[0], dfont = displayFont(ctx, dw), lfont = displayFont(ctx, lw);
    const big = fit(dfont, B.lines.primary, FX - 56 - 56, [88, 80, 72, 64, 56, 48, 40], 3), bwid = widest(dfont, big.lines, big.size);
    const others = B.lines.others || [];
    const osz = Math.min(32, ...others.map((t) => Math.floor((32 * (FX - 112)) / Math.max(1, adv(lfont, t, 32)))));
    const PY = 216, OY = G.bottom - others.length * 64;
    const lines = others.map((t, i) => fill(56, OY + i * 64, FX - 112, 1, R.fieldInk)
      + blk(56, OY + i * 64 + 16, FX - 112, 40, 'g1-big nw', A(t), `font-size:${osz}px;line-height:40px;font-weight:${lw};color:${R.fieldInk}`, 'p')).join('');
    const body = fill(0, 0, FX, ctx.size.h, R.field)
      + head(ctx, 'messaging', [
        { x1: 56, x2: FX - 24, col: R.fieldInk, slots: [[56, `${B.name} brand standards`], [314, `${sn} ${p.section.title}`]] },
        { x1: CX, x2: G.R, col: R.ink, slots: [[CX, p.title]] }])
      + blk(56, PY - 40, 300, 16, 'c-head nw', 'The line', `color:${R.fieldInk}`)
      + blk(56, PY, FX - 112, big.lines.length * big.size + 8, 'g1-big', A(B.lines.primary), `font-size:${big.size}px;line-height:${big.size}px;font-weight:${dw};color:${R.fieldInk}`, 'p')
      + (others.length ? blk(56, OY - 32, 300, 16, 'c-head nw', `With it, ${word(others.length)} more`, `color:${R.fieldInk}`) : '') + lines
      + blk(CX, 88, CW, 24, 'c-title', A(p.title), `color:${R.ink}`, 'h1')
      + blk(CX, 120, 380, 40, 'c-body', 'The words to reach for first, and the two set paragraphs about the brand.', `color:${R.quiet}`, 'p')
      + `<div class="a g1-msg" style="left:${CX}px;top:216px;width:${CW}px">`
      + `<div style="border-top:1px solid ${R.ink}"><h2 class="c-head" style="color:${R.ink}">Short boilerplate, 25 words</h2><p class="g1-bp" style="color:${R.ink}">${A(V.boilerplate25)}</p></div>`
      + `<div style="border-top:1px solid ${R.hair}"><h2 class="c-head" style="color:${R.ink}">Long boilerplate, 50 words</h2><p class="g1-bp" style="color:${R.ink}">${A(V.boilerplate50)}</p></div>`
      + `<div style="border-top:1px solid ${R.hair}"><h2 class="c-head" style="color:${R.ink}">Writing the name</h2><p class="c-body" style="color:${R.ink}">${A(V.nameRules)}</p></div></div>`
      + tab(ctx, sn);
    const svg = dimH(ctx, { x1: 56, x2: 56 + bwid, y: PY - 12, label: fx(ctx, bwid), col: R.fieldInk, qcol: R.fieldQuiet, obj: PY + 4, labelAt: undefined, above: false })
      + dimH(ctx, { x1: CX, x2: G.R, y: 192, label: `${fx(ctx, CW)} measure`, col: R.ink, qcol: R.quiet, obj: 208 })
      + ruler(ctx, { uid: 'g1m', pieces: [{ x1: 56, x2: FX - 12, ink: R.fieldInk, quiet: R.fieldQuiet, hair: R.fieldQuiet }, { x1: CX, x2: G.R, ink: R.ink, quiet: R.quiet, hair: R.hair }], live: [56, 56 + bwid] });
    return page(ctx, 'messaging', { bg: R.ground, body, svg });
  },

  // ---- summary: the data sheet. The logo, measured, leads; the colours at their true shares with a register of values,
  // the faces, the line and the brand's rules as numbered clauses of the closing section ----
  summary(ctx) {
    const R = roles(ctx), B = ctx.brand, p = pg(ctx, 'summary'), sn = p.section.n, slot = ctx.edition === 'slot';
    const geo = ctx.logo.geos.colour, rules = (B.guideB && B.guideB.rules) || [];
    let LW = 520, LH = (LW * geo.h) / geo.w;
    if (LH > 128) { LH = 128; LW = (LH * geo.w) / geo.h; }
    const LY = 216, cw = colourwayFor(ctx, R.ground);
    const logo = slot
      ? `<div class="slot-box c-micro" style="width:${f2(LW)}px;height:${f2(LH)}px;color:${R.ink}">Logo, ${fx(ctx, LW)} wide</div>`
      : `<div class="logo-box">${ctx.logo.svg('colour', { colourway: cw, width: f2(LW) })}</div>`;
    // the line, the faces
    const d = B.fonts.display, b = B.fonts.body, dw = topW(d), dfont = displayFont(ctx, dw);
    const ln = fit(dfont, B.lines.primary, span(6), [40, 36, 32, 28, 24], 2), LNY = 392;
    const faceRow = (y, role, f, fam) => fill(56, y, span(6), 1, R.hair)
      + blk(56, y + 8, 120, 16, 'c-micro nw', role, `color:${R.quiet}`)
      + blk(G.col[2], y + 6, span(4), 32, 'nw', A(f.family), `font-family:${fam};font-weight:${fam === 'var(--display)' ? dw : b.weights[0]};font-size:24px;line-height:32px;color:${R.ink}`);
    // colours: a bar at their true shares, then one register row each
    const RX = G.col[7], RW = G.R - RX, cols = B.colours, sum = cols.reduce((a, c) => a + (c.share || 0), 0) || 1;
    const share = (c) => (sum > 0 && cols.every((k) => k.share > 0) ? c.share / sum : 1 / cols.length);
    let bx = RX, bar = '';
    cols.forEach((c, i) => { const w = i === cols.length - 1 ? RX + RW - bx : Math.round(share(c) * RW); bar += fill(bx, LY, w, 32, c.hex, `box-shadow:inset 0 0 0 1px ${R.hair}`); bx += w; });
    const creg = cols.slice(0, 6).map((c, i) => {
      const y = LY + 48 + i * 28;
      return fill(RX, y, RW, 1, R.hair) + fill(RX, y + 8, 12, 12, c.hex, `box-shadow:inset 0 0 0 1px ${R.hair}`)
        + blk(RX + 24, y + 4, RW - 24, 20, 'c-body g1-reg', `<span style="font-weight:600">${A(c.name)}</span><span><span class="val">${A(c.hex)}</span><span style="display:inline-block;width:48px;text-align:right">${Math.round(share(c) * 100)}%</span></span>`, `color:${R.ink}`);
    }).join('');
    const ry0 = LY + 48 + Math.min(6, cols.length) * 28 + 40, rh = Math.floor((G.bottom - ry0) / Math.max(1, rules.length));
    const rreg = rules.map((r, i) => {
      const y = ry0 + i * rh;
      return fill(RX, y, RW, 1, i ? R.hair : R.ink) + blk(RX, y + 10, 48, 20, 'c-name nw', `${sn}.${i + 1}`, `color:${R.ink}`)
        + blk(RX + 48, y + 10, RW - 48, rh - 14, '', `<h3 class="c-name">${A(r.title)}</h3><p class="c-body" style="color:${R.quiet}">${A(r.text)}</p>`, `color:${R.ink}`);
    }).join('');
    const body = head(ctx, 'summary')
      + blk(56, 88, 380, 24, 'c-title', A(p.title), `color:${R.ink}`, 'h1')
      + blk(56, 120, 380, 40, 'c-body', `The logo, ${word(cols.length)} colours, two faces, the line and ${word(rules.length)} rules. The pages before this one set each out in full.`, `color:${R.quiet}`, 'p')
      + blk(56, LY, LW, LH, '', logo, `color:${R.ink}`)
      + blk(56, LNY, span(6), ln.lines.length * Math.round(ln.size * 1.05) + 8, 'g1-big', A(B.lines.primary), `font-size:${ln.size}px;line-height:${Math.round(ln.size * 1.05)}px;font-weight:${dw};color:${R.ink}`, 'p')
      + faceRow(578, 'Display', d, 'var(--display)') + faceRow(626, 'Body', b, 'var(--body)') + fill(56, 674, span(6), 1, R.hair)
      + bar + creg + rreg + tab(ctx, sn);
    const svg = dimH(ctx, { x1: 56, x2: 56 + LW, y: LY - 20, label: fx(ctx, LW), col: R.ink, qcol: R.quiet, obj: LY - 4 })
      + dimV(ctx, { x: 40, y1: LY, y2: LY + LH, label: fx(ctx, LH), col: R.ink, qcol: R.quiet, obj: 56, labelAt: 34 })
      + ruler(ctx, { uid: 'g1s', live: [56, 56 + LW] });
    return page(ctx, 'summary', { bg: R.ground, body, svg });
  },

  // ---- contact-scope: the imprint. The issue register (one row a release, ruled rows left for the next) and the scope on the
  // ground; who to ask on a dark band across the foot, the address set large because it is the one thing to take away ----
  'contact-scope'(ctx) {
    const R = roles(ctx), B = ctx.brand, p = pg(ctx, 'contact-scope'), sn = p.section.n, N = ctx.pages.length, secs = ctx.sections;
    const DY = 446, mono = ctx.faces.find((f) => f.role === 'mono'), mfont = mono && loadFont(mono.stem);
    const email = B.contact.email, ES = Math.min(40, Math.floor((span(9) * 40) / (mfont ? adv(mfont, email, 40) : email.length * 24)));
    const ew = mfont ? adv(mfont, email, ES) : email.length * ES * 0.6;
    const IC = [56, 142, 314], IY = 216;
    const first = B.version.number === '1.0' || B.version.number === '1';
    const issue = [fill(56, IY, span(7), 1, R.ink), ...['Issue', 'Date', 'Change'].map((h, i) => blk(IC[i], IY + 8, 160, 16, 'c-head nw', h, `color:${R.ink}`)),
      fill(56, IY + 32, span(7), 1, R.hair), blk(56, IY + 38, 80, 20, 'c-body nw', A(B.version.number), `color:${R.ink}`),
      blk(142, IY + 38, 160, 20, 'c-body nw', A(dateLong(B.version.date)), `color:${R.ink}`),
      blk(314, IY + 38, span(4), 20, 'c-body nw', `${first ? 'First issue' : 'This issue'}, ${N} pages`, `color:${R.ink}`),
      ...[1, 2, 3].map((k) => fill(56, IY + 32 + k * 32, span(7), 1, R.hair))].join('');
    const out = [['Logo files, palettes and fonts', 'in the brand kit'], ['Interface components and tokens', 'in the UI kit'], ['Print colour (CMYK and Pantone)', 'ask the printer for a proof']];
    const SX = G.col[8], SW = G.R - SX;
    const scope = blk(SX, IY, SW, 16, 'c-head nw', 'In this manual', `color:${R.ink}`)
      + blk(SX, IY + 24, SW, 60, 'c-body', `${Word(N)} pages in ${word(secs.length)} sections, from the ${A(secs[0].title.toLowerCase())} to the ${A(secs[secs.length - 1].title.toLowerCase())}.`, `color:${R.ink}`, 'p')
      + blk(SX, IY + 92, SW, 16, 'c-head nw', 'Not in this manual', `color:${R.ink}`)
      + blk(SX, IY + 116, SW, 0, '', out.map(([a, c]) => `<p class="c-body" style="margin-bottom:4px">${a}: <span style="color:${R.quiet}">${c}</span></p>`).join(''), `color:${R.ink}`);
    const body = fill(0, DY, ctx.size.w, ctx.size.h - DY, R.dark)
      + head(ctx, 'contact-scope')
      + blk(56, 88, 380, 24, 'c-title', A(p.title), `color:${R.ink}`, 'h1')
      + blk(56, 120, 380, 40, 'c-body', 'Who owns this manual, what is in it, and what is kept elsewhere.', `color:${R.quiet}`, 'p')
      + issue + scope
      + blk(56, DY + 40, 400, 16, 'c-head nw', 'Who to ask', `color:${R.darkInk}`)
      + blk(56, DY + 64, 600, 24, 'g1-sec nw', A(B.contact.owner), `color:${R.darkInk}`)
      + blk(56, DY + 152, span(9), ES + 8, 'val nw', A(email), `font-size:${ES}px;line-height:${ES + 8}px;color:${R.darkInk}`)
      + blk(56, DY + 152 + ES + 24, 440, 40, 'c-body', `${A(B.contact.owner)} owns this manual. Write for a logo file, a missing asset or an exception to a rule here.`, `color:${R.darkQuiet}`, 'p')
      + tab(ctx, sn, { inverted: true });
    const svg = dimH(ctx, { x1: 56, x2: 56 + ew, y: DY + 132, label: fx(ctx, ew), col: R.darkInk, qcol: R.darkQuiet, obj: DY + 148 })
      + ruler(ctx, { uid: 'g1k', pieces: [{ x1: G.L, x2: G.R, ink: R.darkInk, quiet: R.darkQuiet, hair: R.darkQuiet }], live: [56, 56 + ew] });
    return page(ctx, 'contact-scope', { bg: R.ground, body, svg });
  },
};
