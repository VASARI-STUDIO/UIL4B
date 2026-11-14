// Theme 22, Ticket, lane g1: the brand and voice pages (contents, intro, voice, write-this, messaging, summary, contact-scope).
// Every page is the same roll ticket on the bar top (helpers.js draws it); only what is printed on the body and what lies on the bar top changes.
// The ticket alternates between the brand's field colour and its paper stock, so a run of pages reads as a pile of different tickets.
// Text that wraps is measured here and laid out line by line, so the count of lines planned is the count that renders.
import { A, px, T, page, roles, fitLines, textWidth, lineTop, trackOf, sentences, listAnd, longDate, serialOf } from './helpers.js';
import { loadFont } from '../../engine/nodeFont.js';

// ---- small layout pieces (lane-local names, so nothing clashes with the other lanes) ----
const at = (x, y, cls, html, style = '', w = null) => `<div class="a ${cls}" style="left:${px(x)};top:${px(y)};${w ? `width:${px(w)};` : ''}${style}">${html}</div>`;
const rule = (x, y, w, colour) => `<div class="a g1-rule" style="left:${px(x)};top:${px(y)};width:${px(w)};background:${colour}"></div>`;
// a label over a value: the printed fields of a ticket (Admit, Venue, Date), here in the page's ink
const field = (x, y, w, label, value, { size = 15, ink = 'var(--ink)' } = {}) => at(x, y, '', `<div class="c13 b" style="color:${ink}">${label}</div><div class="${size === 15 ? 'c15' : 'c13'}" style="color:${ink};margin-top:4px">${value}</div>`, '', w);

// greedy word wrap with the theme's calibrated widths; the margin covers the heavier weights, which are measured with the regular face
function wrap(ctx, text, size, w, { role = 'body', track = 0, margin = 0.94 } = {}) {
  const lines = []; let cur = '';
  for (const word of String(text).split(/\s+/)) {
    const t = cur ? `${cur} ${word}` : word;
    if (cur && textWidth(ctx, role, t, size, track) > w * margin) { lines.push(cur); cur = word; } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}
const lineSpans = (lines) => lines.map((l) => `<span class="ln">${A(l)}</span>`).join('');

// where a face's cap top sits inside a line box of height `line` (for hanging a small figure off a display line's cap height)
const faceOf = (ctx, role) => ctx.faces.find((x) => x.role === role && x.style !== 'italic');
function capTop(ctx, role, size, line) {
  const f = loadFont(faceOf(ctx, role).stem), cap = ((f.tables.os2 && f.tables.os2.sCapHeight) || f.unitsPerEm * 0.7) / f.unitsPerEm * size;
  return -lineTop(ctx, role, size, line, 0) - cap;
}

// a display block whose lines are already decided
const dispBlock = (ctx, x, y, w, size, lines, colour, extra = '') => {
  const lh = Math.round(size * 0.92 * 100) / 100;
  return { html: `<div class="a disp" style="left:${px(x)};top:${px(y)};width:${px(w)};font-size:${size}px;line-height:${lh}px;letter-spacing:${trackOf(ctx)}em;color:${colour};${extra}">${lineSpans(lines)}</div>`, h: lh * lines.length, lh };
};
// the largest display size (max down to min, 2 px steps) at which the text wraps to at most maxLines and the block is at most h tall
function fitDisp(ctx, text, { w, max, min, maxLines, h = 1e9 }) {
  for (let s = max; s >= min; s -= 2) { const f = fitLines(ctx, text, { w, max: s, min: s, maxLines }); if (f.lines.length <= maxLines && f.lines.length * s * 0.92 <= h) return f; }
  return fitLines(ctx, text, { w, max: min, min, maxLines });
}

export const guidelines = {
  // ---- 002: the contents as a gig poster's billing block. Each section is an act on the bill, and the figure that hangs off its
  // cap height is the page it opens on: the same three-digit serial that page carries on its stub ----
  contents: (ctx) => {
    const R = roles(ctx).onPaper(), tr = trackOf(ctx);
    const acts = ctx.sections.map((s) => ({ t: s.title, no: serialOf(ctx, s.pages[0].id) }));
    const noW = Math.max(...acts.map((a) => textWidth(ctx, 'body', a.no, 15))) * 1.06, gapNo = 8;
    let plan = null;
    for (let s = 120; s >= 32 && !plan; s -= 2) {
      const gap = Math.max(24, Math.round(s * 0.36)), lh = Math.round(s * 0.96), lines = [];
      let cur = [], wCur = 0;
      for (const a of acts) {
        const tw = textWidth(ctx, 'display', a.t, s, tr), iw = tw + gapNo + noW, add = cur.length ? gap + iw : iw;
        if (cur.length && wCur + add > 864 * 0.98) { lines.push(cur); cur = []; wCur = 0; }
        cur.push({ ...a, tw }); wCur += cur.length > 1 ? gap + iw : iw;
      }
      lines.push(cur);
      if (lines.length <= 5 && lines.length * lh <= 340) plan = { s, gap, lh, lines };
    }
    const { s, gap, lh, lines } = plan, dy = capTop(ctx, 'display', s, lh) - capTop(ctx, 'body', 15, 22);
    let body = '';
    lines.forEach((ln, i) => {
      let x = 72; const y = 72 + i * lh;
      for (const a of ln) {
        body += `<div class="a disp nw" style="left:${px(x)};top:${px(y)};font-size:${s}px;line-height:${lh}px;letter-spacing:${tr}em;color:var(--ink)">${A(a.t)}</div>`
          + at(x + a.tw + gapNo, y + dy, 'g1-no nw', a.no);
        x += a.tw + gapNo + noW + gap;
      }
    });
    const zone = at(72, 532, 'c15 qt', 'The figure after each section is the page it opens on, the same number as the serial on that page&rsquo;s stub.', '', 520);
    return page(ctx, R, 'contents', { body, zone });
  },

  // ---- 003: who the brand is. Its first sentence printed large, and what it does and who it serves as the ticket's printed fields ----
  intro: (ctx) => {
    const R = roles(ctx), B = ctx.brand, first = sentences(B.description)[0];
    const fields = [['What it does', B.product], ['Who it serves', B.audience]];
    const fh = 18 + 4 + Math.max(...fields.map(([, v]) => wrap(ctx, v, 15, 420).length)) * 22;
    const fy = 460 - fh, ry = fy - 16;
    const f = fitDisp(ctx, first, { w: 864, max: 112, min: 40, maxLines: 3, h: ry - 32 - 72 });
    const big = dispBlock(ctx, 72, 72, 864, f.size, f.lines, 'var(--ink)');
    const body = big.html + rule(72, ry, 864, 'var(--ink)') + fields.map(([k, v], i) => field(72 + i * 444, fy, 420, A(k), A(v))).join('');
    return page(ctx, R, 'intro', { body });
  },

  // ---- 005: how the brand sounds, set like the set-times panel of a gig ticket: the principle on the left, the line it produces
  // printed beside it in the display face. One shared size for every line, the largest at which the whole panel fits the body ----
  voice: (ctx) => {
    const R = roles(ctx), P = ctx.brand.voice.principles, gapRow = 33, ex = 296, exW = 640;
    let plan = null;
    for (let s = 88; s >= 24 && !plan; s -= 2) {
      const rows = P.map((p) => fitLines(ctx, p.example, { w: exW, max: s, min: s, maxLines: 3 }).lines);
      const h = rows.reduce((t, l) => t + l.length * Math.round(s * 0.92 * 100) / 100, 0) + gapRow * (P.length - 1);
      if (rows.every((l) => l.length <= 3) && h <= 388) plan = { s, rows };
    }
    const { s, rows } = plan, lh = Math.round(s * 0.92 * 100) / 100;
    // the principle's name sits on the first baseline of its line
    const base = -lineTop(ctx, 'display', s, lh, 0), dy = base - (-lineTop(ctx, 'body', 15, 22, 0)), cap = capTop(ctx, 'display', s, lh);
    let y = 72, body = '', lastBase = 0;
    rows.forEach((lines, i) => {
      // the rule between two rows sits halfway from the last baseline above to the cap height below
      if (i) { body += rule(72, Math.round((lastBase + y + cap) / 2), 864, 'var(--ink)'); }
      lastBase = y + (lines.length - 1) * lh + base;
      body += at(72, y + dy, `c15 b ink${ctx.edition === 'slot' ? ' ph-tight' : ''}`, A(P[i].title), '', 200) + dispBlock(ctx, ex, y, exW, s, lines, 'var(--ink)').html;
      y += lines.length * lh + gapRow;
    });
    return page(ctx, R, 'voice', { body: ctx.edition === 'slot' ? `<div class="ph-tight">${body}</div>` : body });   // slot: compact placeholders, so the example boxes do not cross the rules
  },

  // ---- 006: write this, not that. What the brand writes is printed on the ticket; under each one, on the bar top, lies the line it
  // replaces, struck through, and the reason. The ticket's bottom edge is the line between the two ----
  'write-this': (ctx) => {
    const R = roles(ctx).onPaper(), W = ctx.brand.voice.writeThis, n = W.length, cw = (864 - 24 * (n - 1)) / n;
    const xs = W.map((_, i) => 72 + i * (cw + 24));
    const writes = W.map((r) => wrap(ctx, r.write, 20, cw));
    const slot = ctx.edition === "slot", tc = slot ? " ph-tight" : "";   // slot placeholders: the compact form, room for three lines
    const top = 460 - (slot ? 3 : Math.max(...writes.map((l) => l.length))) * 28;
    const f = fitDisp(ctx, 'Write this', { w: 864, max: 160, min: 48, maxLines: 1, h: top - 32 - 72 });
    let body = dispBlock(ctx, 72, 72, 864, f.size, f.lines, 'var(--ink)').html;
    W.forEach((r, i) => { body += at(xs[i], top, `c20 ink${tc}`, lineSpans(writes[i]), 'font-weight:500', cw); });
    // the struck line and the reason share one size: 13 px, or 12 px if any column would run past the page's bottom margin
    const fits = (sz, lh) => W.every((r) => (wrap(ctx, r.not, sz, cw).length + wrap(ctx, r.because, sz, cw).length) * lh + 8 <= 156);
    const [sz, cls] = fits(13, 18) ? [13, 'c13'] : [12, 'c12'];
    const zone = W.map((r, i) => at(xs[i], 532, '', `<div class="${cls} qt g1-strike${tc}">${lineSpans(wrap(ctx, r.not, sz, cw))}</div><div class="${cls} paper${tc}" style="margin-top:8px">${lineSpans(wrap(ctx, r.because, sz, cw))}</div>`, '', cw)).join('');
    return page(ctx, R, 'write-this', { body, zone });
  },

  // ---- 007: lines and boilerplate. The 25-word boilerplate is the ticket's one big thing, set as large as four lines allow;
  // the lines in use run along the foot as the ticket's printed fields; the 50 words and the name rule are the small print on the bar top ----
  messaging: (ctx) => {
    const R = roles(ctx), B = ctx.brand, V = B.voice, all = [B.lines.primary, ...B.lines.others];
    // the foot: a label column, then one column per line in use
    const lw = 124, cw = (864 - lw - 24 * all.length) / all.length;
    const slot = ctx.edition === "slot";   // slot placeholders: the compact form, room for three lines
    const footH = (slot ? 3 : Math.max(...all.map((l) => wrap(ctx, l, 15, cw, { margin: 0.9 }).length))) * 22;
    const fy = 460 - footH, ry = fy - 12;
    // the boilerplate takes the same label column as the foot, so its label is a field name and not a heading over it
    const bx = 72 + lw + 24, bw = 864 - lw - 24;
    let s = 48, lines;
    for (; s >= 24; s -= 2) { lines = wrap(ctx, V.boilerplate25, s, bw, { margin: 0.93 }); if (lines.length <= 5 && 72 + lines.length * Math.round(s * 1.2) <= ry - 32) break; }
    const lh = Math.round(s * 1.2), dy = (-lineTop(ctx, 'body', s, lh, 0)) - (-lineTop(ctx, 'body', 13, 18, 0));
    let body = at(72, 72 + dy, 'c13 b ink', 'In 25 words', '', lw) + at(bx, 72, 'ink', lineSpans(lines), `font:500 ${s}px/${lh}px var(--body);letter-spacing:-0.01em`, bw)
      + rule(72, ry, 864, 'var(--ink)') + at(72, fy, 'c13 b ink', 'Lines in use', 'line-height:22px', lw);
    all.forEach((l, i) => { body += at(72 + lw + 24 + i * (cw + 24), fy, `c15 b ink${slot ? " ph-tight" : ""}`, lineSpans(wrap(ctx, l, 15, cw, { margin: 0.9 })), '', cw); });
    // the small print: 15 px where it fits the dark zone, else 13
    const small = (x, w, label, text) => {
      const big = wrap(ctx, text, 15, w);
      const [cls, ln] = 22 + 4 + big.length * 22 <= 156 ? ['c15', big] : ['c13', wrap(ctx, text, 13, w)];
      return at(x, 532, '', `<div class="c15 b paper">${label}</div><div class="${cls} qt" style="margin-top:4px">${lineSpans(ln)}</div>`, '', w);
    };
    const zone = small(72, 568, 'In 50 words', V.boilerplate50) + small(664, 272, 'Writing the name', V.nameRules);
    return page(ctx, R, 'messaging', { body, zone });
  },

  // ---- 032: the brand on one page, on one ticket: the logo, the lines, the three families, and the palette printed as the colour bar
  // a printer runs along a ticket's edge, each colour as wide as its share. The three rules lie on the bar top ----
  summary: (ctx) => {
    const R = roles(ctx), B = ctx.brand, F = B.fonts, asp = ctx.logo.geo.aspect;
    const lw = Math.min(560, 136 * asp), lgh = lw / asp;
    const logo = `<div class="a" style="left:72px;top:72px;width:${px(lw)};height:${px(lgh)}">${ctx.logo.html('colour', { width: lw, colourway: R.colourwayOn(R.field), color: R.inkOn(R.field, 13, 400, '(Logo slot frame)'), label: 'Logo' })}</div>`;
    // the lines under the logo: the primary at 24 px, the others at 15
    const ly = Math.round(72 + lgh + 32), p1 = wrap(ctx, B.lines.primary, 24, 560, { margin: 0.92 });
    let body = logo + at(72, ly, `c24 ink${ctx.edition === 'slot' ? ' ph-tight' : ''}`, lineSpans(p1), 'font-weight:600', 560)
      + at(72, ly + p1.length * 32 + 8, `c15 ink${ctx.edition === 'slot' ? ' ph-tight' : ''}`, B.lines.others.map((l) => `<span class="ln">${A(l)}</span>`).join(''), '', 560);
    // the families, each named in its own face
    const dn = F.display.family; let ds = 40; while (ds > 24 && textWidth(ctx, 'display', dn, ds, trackOf(ctx)) > 272 * 0.96) ds -= 2;
    const fams = at(664, 72, 'disp ink nw', A(dn), `font-size:${ds}px;line-height:44px;letter-spacing:${trackOf(ctx)}em`, 272)
      + at(664, 120, 'c12 ink', A(`Display, weight ${F.display.weights.join(', ')}`), '', 272)
      + at(664, 152, 'ink nw', A(F.body.family), `font:600 24px/32px var(--body);letter-spacing:-0.005em`, 272)
      + at(664, 188, 'c12 ink', A(`Body, weights ${listAnd(F.body.weights.map(String))}`), '', 272)
      + (F.mono ? at(664, 220, 'ink nw', A(F.mono.family), `font:${F.mono.weights[0]} 15px/22px var(--mono)`, 272) + at(664, 246, 'c12 ink', A(`Mono, weight ${F.mono.weights[0]}`), '', 272) : '');
    body += fams;
    // the colour bar: widths by share (largest remainder), a 96 px floor so every name fits; a 1 px rule in the ink holds its outline on the field
    const cols = ctx.colours.map((c, i) => ({ ...c, i })).sort((a, b) => b.share - a.share || a.i - b.i);
    const total = cols.reduce((t, c) => t + c.share, 0), raw = cols.map((c) => 864 * c.share / total), w = raw.map(Math.floor);
    let left = 864 - w.reduce((t, k) => t + k, 0);
    raw.map((r, i) => [r - Math.floor(r), i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]).forEach(([, i]) => { if (left > 0) { w[i]++; left--; } });
    if (w.some((k) => k < 96)) {
      const small = w.map((k) => k < 96), need = w.reduce((t, k, i) => t + (small[i] ? 96 - k : 0), 0), pool = w.reduce((t, k, i) => t + (small[i] ? 0 : k), 0);
      w.forEach((k, i) => { w[i] = small[i] ? 96 : k - Math.round(need * k / pool); });
      w[w.indexOf(Math.max(...w))] += 864 - w.reduce((t, k) => t + k, 0);
    }
    let x = 72, bar = '';
    cols.forEach((c, i) => {
      const ink = R.inkOn(c.hex, 12, 600, '(Summary colour bar)'), share = `${Math.round(c.share * 100)}%`;
      const both = textWidth(ctx, 'body', `${c.name} ${share}`, 12) * 1.08 + 8 <= w[i] - 16;
      bar += `<div class="a" style="left:${px(x - 72)};top:0;width:${w[i]}px;height:48px;background:${c.hex}"><div class="a c12 b nw" style="left:8px;top:8px;color:${ink}">${A(c.name)}${both ? ` <span class="num" style="font-weight:400">${share}</span>` : ''}</div></div>`;
      x += w[i];
    });
    body += `<div class="a g1-bar" style="left:72px;top:412px;width:864px;height:48px">${bar}</div>`;
    // the three rules on the bar top, one per body column pair
    const rules = ((B.guideB && B.guideB.rules) || []).slice(0, 3);
    const zone = rules.map((r, i) => at(72 + i * 296, 532, '', `<div class="c15 b paper">${lineSpans(wrap(ctx, r.title, 15, 272, { margin: 0.9 }))}</div><div class="c13 qt" style="margin-top:4px">${lineSpans(wrap(ctx, r.text, 13, 272))}</div>`, '', 272)).join('');
    return page(ctx, R, 'summary', { body, zone });
  },

  // ---- 033: contact and scope, the last ticket. Who to write to is the one big thing; the version history runs along the foot as
  // printed fields; what is in and not in this document lies on the bar top ----
  'contact-scope': (ctx) => {
    const R = roles(ctx).onPaper(), B = ctx.brand, mail = B.contact.email;
    const intro = wrap(ctx, `${B.contact.owner} owns this document. Write to them for a logo file, a missing asset or an exception.`, 24, 600, { margin: 0.92 });
    let s = 96; while (s > 32 && textWidth(ctx, 'body', mail, s, -0.01) * 1.07 > 864) s -= 2;
    const my = 72 + intro.length * 32 + 32;
    let body = at(72, 72, 'c24 ink', lineSpans(intro), '', 600)
      + at(72, my, 'ink nw', A(mail), `font:600 ${s}px/${Math.round(s * 1.1)}px var(--body);letter-spacing:-0.01em`, 864);
    const hist = [['Version', B.version.number, 72, 124], ['Issued', longDate(B.version.date), 220, 272]];
    if (/^1(\.0)?$/.test(String(B.version.number))) hist.push(['Changes', 'First release.', 516, 420]);
    body += rule(72, 404, 864, 'var(--ink)') + hist.map(([k, v, hx, hw]) => field(hx, 416, hw, A(k), A(v))).join('');
    const secs = `${listAnd(ctx.sections.map((x) => x.title))}.`;
    const not = ['Logo files, palettes and fonts are in the brand kit.', 'Interface components and tokens are in the UI kit.', 'Print specifications, CMYK and Pantone values: ask your printer for a proof.'];
    const zone = at(72, 532, '', `<div class="c15 b paper">In this document</div><div class="c15 qt" style="margin-top:4px">${lineSpans(wrap(ctx, secs, 15, 272))}</div>`, '', 272)
      + at(368, 532, '', `<div class="c15 b paper">Not in this document</div><div class="c15 qt" style="margin-top:4px">${not.map((l) => `<span class="ln">${A(l)}</span>`).join('')}</div>`, '', 568);
    return page(ctx, R, 'contact-scope', { body, zone });
  },
};

// scoped under .pg and the g1- prefix, so nothing here reaches another lane's pages
export function css() {
  return `.pg .g1-rule{height:1px}
.pg .g1-no{font:600 15px/22px var(--body);font-variant-numeric:tabular-nums;color:var(--ink)}
.pg .g1-strike{text-decoration:line-through;text-decoration-thickness:1px}
.pg .g1-bar{overflow:hidden}
.pg .g1-bar::after{content:'';position:absolute;inset:0;box-shadow:inset 0 0 0 1px var(--ink);pointer-events:none}
`;
}
