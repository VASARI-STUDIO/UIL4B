// Lane g1 for theme 21 (brand and voice): contents, intro, voice, write-this, messaging, summary, contact-scope.
// The pages speak the round 1 slide language (guidelines-r1.js): full-height fields in the brand's role colours meeting at straight edges,
// one element at display scale a slide, everything else at 12 to 15 px, and the one running head at y 28. Each page takes its own split of the
// 16:9 slide, so no two pages share a structure. Colours come by role, never by id; every line of text is measured with the brand's own font
// files and set as explicit lines, so the lines laid out are the lines that render. Styles: g1- classes below, plus the r- classes of css-r1.js.
import { A } from './helpers.js';
import { onceRe } from './lane-g3-kit.js';
import { outline, capHeight } from '../../engine/logo.js';
import { loadFont } from '../../engine/nodeFont.js';

// ---- measuring (copied from guidelines-r1.js, which keeps them private) ----------------------------------------------------------
const face = (ctx, role, weight) => ctx.faces.find((f) => f.role === role && f.style !== 'italic' && f.weight === weight) || ctx.faces.find((f) => f.role === role && f.style !== 'italic');
const dispW = (ctx) => ctx.brand.fonts.display.weights[ctx.brand.fonts.display.weights.length - 1];
// width of one line of text in px, from the font file (letter-spacing in em)
const textW = (ctx, role, weight, text, size, track = 0) => { const o = outline(loadFont(face(ctx, role, weight).stem), text, size, track); return (o.x2 - Math.min(0, o.x1)) * 1.02; };
// top of a text box so that its first baseline lands on y
const topForBaseline = (ctx, role, weight, size, lh, y) => { const f = loadFont(face(ctx, role, weight).stem), u = f.unitsPerEm, asc = f.ascender / u, desc = -f.descender / u; return +(y - ((lh * size - (asc + desc) * size) / 2 + asc * size)).toFixed(1); };
function greedy(ctx, role, weight, words, size, maxW, track) {
  const out = []; let cur = '';
  for (const w of words) { const t = cur ? `${cur} ${w}` : w; if (cur && textW(ctx, role, weight, t, size, track) > maxW) { out.push(cur); cur = w; } else cur = t; }
  if (cur) out.push(cur);
  return out;
}
// the same line count as greedy, with the lines as even as they can be
function balanced(ctx, role, weight, text, size, maxW, track) {
  const words = text.split(' '), n = greedy(ctx, role, weight, words, size, maxW, track).length;
  if (n === 1) return [text];
  let lo = Math.max(...words.map((w) => textW(ctx, role, weight, w, size, track))), hi = maxW;
  for (let i = 0; i < 14; i++) { const mid = (lo + hi) / 2; if (greedy(ctx, role, weight, words, size, mid, track).length <= n) hi = mid; else lo = mid; }
  return greedy(ctx, role, weight, words, size, hi, track);
}
// display lines: the whole text on one line if it fits, else whole sentences to a line, a sentence that is still too wide balanced
function wrapLines(ctx, role, weight, text, size, maxW, track = -0.01) {
  if (textW(ctx, role, weight, text, size, track) <= maxW) return [text];
  const lines = []; let cur = '';
  for (const s of text.split(/(?<=[.!?]) /)) {
    const t = cur ? `${cur} ${s}` : s;
    if (cur && textW(ctx, role, weight, t, size, track) > maxW) { lines.push(...balanced(ctx, role, weight, cur, size, maxW, track)); cur = s; } else cur = t;
  }
  if (cur) lines.push(...balanced(ctx, role, weight, cur, size, maxW, track));
  return lines;
}
// the largest display size from hi down to lo at which the text sets in maxLines lines or fewer, no line wider than maxW
function fitSet(ctx, text, hi, lo, maxW, maxLines, track = -0.01) {
  const dw = dispW(ctx);
  for (let s = hi; s > lo; s--) { const lines = wrapLines(ctx, 'display', dw, text, s, maxW, track); if (lines.length <= maxLines && lines.every((l) => textW(ctx, 'display', dw, l, s, track) <= maxW)) return { size: s, lines }; }
  return { size: lo, lines: wrapLines(ctx, 'display', dw, text, lo, maxW, track) };
}
// running text: plain greedy lines of the body face
const para = (ctx, text, size, maxW, weight = 400) => greedy(ctx, 'body', weight, String(text).split(' '), size, maxW, 0);
const lineHtml = (lines) => lines.map((l) => `<span class="r-ln">${A(l)}</span>`).join('');
const sentences = (s) => (s || '').split(/(?<=[.!?]) /).map((x) => x.trim()).filter(Boolean);
const px = (n) => +(+n).toFixed(2);

// ---- colour roles and the chrome rule (as in guidelines-r1.js) ----------------------------------------------------------------
const L = (ctx) => ctx.roles.light;
const byRole = (ctx, role) => ctx.colours.find((c) => c.role === role);
const inkOn = (ctx, hex) => (ctx.ratio(L(ctx).text, hex) >= ctx.ratio(L(ctx).surface, hex) ? L(ctx).text : L(ctx).surface);
// the brand's quiet tone that reaches 4.5:1 on the ground; else the best of the text colour, the page ground and the dark soft text
const chromeOn = (ctx, hex) => {
  const q = [L(ctx).quiet, L(ctx).quietOnSunken, ctx.roles.dark.quiet].find((c) => ctx.ratio(c, hex) >= 4.5);
  return q || [L(ctx).text, L(ctx).surface, ctx.roles.dark.textSoft].sort((a, b) => ctx.ratio(b, hex) - ctx.ratio(a, hex))[0];
};
// running text a step below the ink: the soft text where it reads on the ground, else the ink itself
const softOn = (ctx, hex) => (ctx.ratio(L(ctx).textSoft, hex) >= 4.5 && inkOn(ctx, hex) === L(ctx).text ? L(ctx).textSoft : inkOn(ctx, hex));

const box = (x, y, w, h, st = '', inner = '') => `<div class="r-a" style="left:${px(x)}px;top:${px(y)}px;${w ? `width:${px(w)}px;` : ''}${h ? `height:${px(h)}px;` : ''}${st}">${inner}</div>`;
const field = (x, y, w, h, hex, edge = '') => box(x, y, w, h, `background:${hex};${edge}`);

// the one running head: section number and title left, document name and a three-digit folio right, each in the chrome colour of the field under it
function head(ctx, id, { left, right } = {}) {
  const p = ctx.pages.find((x) => x.id === id), g = L(ctx).surface;
  const cl = chromeOn(ctx, left || g), cr = chromeOn(ctx, right || left || g);
  const folio = String(ctx.pageNo(id)).padStart(3, '0');
  return `<div class="r-hd"><span class="r-hl num" style="color:${cl}">${p.ref ? `<b>${p.ref}</b>` : ''}${A(p.title)}</span><span class="r-hr num" style="color:${cr}"><i>${A(ctx.brand.name)} brand guidelines</i><b>${folio}</b></span></div>`;
}
const page = (id, inner, bg) => `<section class="pg pg--r g1" data-page="${id}" style="background:${bg}">${inner}</section>`;

// the 12-column grid of the 1280 slide (margin 56, gutter 16), read from the page size
const grid = (ctx) => { const cw = (ctx.size.w - 112 - 11 * 16) / 12; return { col: (n) => 56 + n * (cw + 16), span: (k) => k * cw + (k - 1) * 16 }; };

// text blocks: lines set at a size, top-left at x, y. Returns the html and the block's height.
const block = (ctx, x, y, w, lines, { cls = 'r-t15', lh = 24, color, st = '' } = {}) => ({ html: box(x, y, w, lines.length * lh, `color:${color};${st}`, `<p class="${cls}">${lineHtml(lines)}</p>`), h: lines.length * lh });
// a display block: lines at a size and line height, first baseline at y (or last baseline at yLast)
function dispBlock(ctx, x, w, fit, lh, color, { y, yLast } = {}) {
  const dw = dispW(ctx), n = fit.lines.length, first = y ?? yLast - (n - 1) * fit.size * lh;
  const top = topForBaseline(ctx, 'display', dw, fit.size, lh, first);
  return { html: box(x, top, w, 0, `color:${color};font-size:${fit.size}px;line-height:${lh}`, `<h2 class="disp">${lineHtml(fit.lines)}</h2>`), top, bottom: top + n * fit.size * lh };
}
const words = (n) => ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'][n] || String(n);

export const guidelines = {
  // Contents: a dark field on the first third holds the slide's title; the nine sections run down the other two thirds as rows, each named in the display
  // face with its pages listed small beside it and the page it opens on at the right edge.
  contents(ctx) {
    const W = ctx.size.w, H = ctx.size.h, dark = byRole(ctx, 'text').hex, white = L(ctx).surface, fw = W / 3, dw = dispW(ctx);
    const onDark = inkOn(ctx, dark), S = ctx.sections, n = S.length, total = ctx.pages.length;
    const x0 = fw + 56, top0 = 88, rowH = Math.min(72, (H - 40 - top0) / n);
    const titleSize = (() => { for (let s = 32; s > 20; s--) if (S.every((s2) => textW(ctx, 'display', dw, s2.title, s, -0.01) <= 280)) return s; return 20; })();
    const xT = x0 + 48, xP = grid(ctx).col(8), wP = W - 56 - 88 - xP;
    let rows = '';
    S.forEach((s, i) => {
      const t = top0 + i * rowH, base = t + 14 + capHeight(loadFont(face(ctx, 'display', dw).stem), titleSize);
      const list = para(ctx, s.pages.map((p) => p.title).join(', '), 12, wP).slice(0, 3);
      rows += box(x0, t, W - 56 - x0, 1, `background:${L(ctx).divider}`) +
        box(x0, topForBaseline(ctx, 'body', 400, 15, 1.6, base), 40, 0, `color:${L(ctx).quiet}`, `<p class="r-t15 num">${s.n}</p>`) +
        box(xT, topForBaseline(ctx, 'display', dw, titleSize, 1, base), 300, 0, `color:${L(ctx).text};font-size:${titleSize}px;line-height:1`, `<h2 class="disp r-nw">${A(s.title)}</h2>`) +
        box(xP, t + 12, wP, list.length * 16, `color:${L(ctx).quiet}`, `<p class="r-t12">${lineHtml(list)}</p>`) +
        box(W - 56 - 80, topForBaseline(ctx, 'body', 400, 15, 1.6, base), 80, 0, `color:${L(ctx).text};text-align:right`, `<p class="r-t15 num">${String(s.pages[0].no).padStart(3, '0')}</p>`);
    });
    rows += box(x0, top0 + n * rowH, W - 56 - x0, 1, `background:${L(ctx).divider}`);
    const intro = para(ctx, `${words(n)} sections over ${total} pages. Each section opens on the page number at the right of its row.`, 15, fw - 112);
    const titleFit = { size: Math.min(54, (() => { for (let s = 54; s > 32; s--) if (textW(ctx, 'display', dw, 'Contents', s, -0.01) <= fw - 112) return s; return 32; })()), lines: ['Contents'] };
    const inner = field(0, 0, fw, H, dark) + block(ctx, 56, 104, fw - 112, intro, { color: onDark }).html +
      dispBlock(ctx, 56, fw - 112, titleFit, 1, onDark, { yLast: H - 56 }).html + rows + head(ctx, 'contents', { left: dark, right: white });
    return page('contents', inner, white);
  },

  // Who we are: the brand's first sentence about itself is the slide, set large on the white two thirds; what it does and who it serves stand at the
  // foot of an action-colour field on the last third, the field's top left empty.
  intro(ctx) {
    const B = ctx.brand, W = ctx.size.w, H = ctx.size.h, act = byRole(ctx, 'action').hex, white = L(ctx).surface, g = grid(ctx), fx = (W * 2) / 3;
    // the first sentence is the headline; a one-sentence description splits at its colon, so the headline stays a sentence and the rest follows under it
    let [first, ...rest] = sentences(B.description); rest = rest.join(' ');
    if (!rest && first.includes(': ')) { const [a, b] = first.split(/: (.+)/); first = `${a}.`; rest = b.charAt(0).toUpperCase() + b.slice(1); }
    const hl = fitSet(ctx, first, 80, 44, g.span(8), 3);
    const restLines = rest ? para(ctx, rest, 22, g.span(6), 500) : [];
    const ink = inkOn(ctx, act), cw = W - fx - 112;
    const re = onceRe(ctx), groups = [['What it does', B.product], ['Who it serves', B.audience]].filter(([, v]) => !(re && re.test(v))).map(([k, v]) => ({ k, lines: para(ctx, v, 15, cw) }));
    let y = H - 48, right = '';
    for (const gr of groups.reverse()) {
      const h = 20 + gr.lines.length * 24; y -= h;
      right += box(fx + 56, y, cw, 16, `color:${ink}`, `<p class="r-t12 r-w600">${A(gr.k)}</p>`) + block(ctx, fx + 56, y + 20, cw, gr.lines, { color: ink }).html;
      y -= 32;
    }
    const inner = dispBlock(ctx, 56, g.span(8), hl, 1.02, L(ctx).text, { y: 104 + hl.size * 0.78 }).html +
      (restLines.length ? block(ctx, 56, H - 48 - restLines.length * 28, g.span(6), restLines, { cls: 'r-lead', lh: 28, color: softOn(ctx, white) }).html : '') +
      field(fx, 0, W - fx, H, act) + right + head(ctx, 'intro', { left: white, right: act });
    return page('intro', inner, white);
  },

  // How we sound: one line in the brand's voice at slide scale on a dark field across two thirds, the habit it shows under it.
  // The other habits stand on the white third, each with its own line.
  voice(ctx) {
    const B = ctx.brand, V = B.voice.principles, W = ctx.size.w, H = ctx.size.h, dark = byRole(ctx, 'text').hex, white = L(ctx).surface, fx = (W * 2) / 3;
    const onDark = inkOn(ctx, dark), big = fitSet(ctx, V[0].example, 120, 40, fx - 112, 2);
    const cw = W - fx - 112, soft = softOn(ctx, white);
    const intro = para(ctx, `${words(V.length)} habits keep the voice. Each one comes with a line in ${B.name}'s own words.`, 15, cw);
    let y = H - 48, right = '';
    for (const v of V.slice(1).reverse()) {
      const t = para(ctx, v.title, 15, cw, 600), e = para(ctx, v.example, 15, cw); y -= (t.length + e.length) * 24;
      right += block(ctx, fx + 56, y, cw, t, { cls: 'r-t15 r-w600', color: L(ctx).text }).html + block(ctx, fx + 56, y + t.length * 24, cw, e, { color: soft }).html;
      y -= 32;
    }
    const title = para(ctx, V[0].title, 22, fx - 112, 500);
    const inner = field(0, 0, fx, H, dark) +
      dispBlock(ctx, 56, fx - 112, big, 0.98, onDark, { yLast: H - 56 - 28 * title.length - 40 }).html +
      block(ctx, 56, H - 48 - 28 * title.length, fx - 112, title, { cls: 'r-lead', lh: 28, color: onDark }).html +
      block(ctx, fx + 56, 104, cw, intro, { color: soft }).html + right + head(ctx, 'voice', { left: dark, right: white });
    return page('voice', inner, white);
  },

  // Write this, not that: the page splits down the middle. The lines to write sit on white in full ink; the lines they replace sit across from them on
  // the panel colour, struck through, each with the reason under it.
  'write-this'(ctx) {
    const R = ctx.brand.voice.writeThis, W = ctx.size.w, H = ctx.size.h, white = L(ctx).surface, panel = L(ctx).sunken, half = W / 2, cw = half - 112;
    const ink = L(ctx).text, inkP = inkOn(ctx, panel), quietP = chromeOn(ctx, panel), top = 176, bottom = H - 48;
    // the write lines take the lead size, stepping down only if the rows would not fit the slide
    let rows, lead;
    for (const [size, lh] of [[22, 28], [18, 24], [15, 24]]) {
      lead = { size, lh };
      rows = R.map((r) => {
        const w = size >= 18 ? wrapLines(ctx, 'body', 500, r.write, size, cw, 0) : para(ctx, r.write, size, cw, 500);
        const n = para(ctx, r.not, 15, cw), b = para(ctx, r.because, 12, cw);
        return { w, n, b, h: Math.max(w.length * lh, n.length * 24 + 4 + b.length * 16) };
      });
      if (rows.reduce((a, r) => a + r.h, 0) + 24 * (R.length - 1) <= bottom - top) break;
    }
    const gap = Math.min(48, (bottom - top - rows.reduce((a, r) => a + r.h, 0)) / Math.max(1, R.length - 1));
    const headSize = (() => { for (let s = 40; s > 26; s--) if (['Write this', 'Not that'].every((t) => textW(ctx, 'display', dispW(ctx), t, s, -0.01) <= cw)) return s; return 26; })();
    let y = top, body = '';
    for (const r of rows) {
      body += box(56, y, cw, r.w.length * lead.lh, `color:${ink};font:500 ${lead.size}px/${lead.lh}px var(--body)`, `<p>${lineHtml(r.w)}</p>`) +
        block(ctx, half + 56, y, cw, r.n, { color: quietP, st: '' }).html.replace('class="r-t15"', 'class="r-t15 g1-x"') +
        block(ctx, half + 56, y + r.n.length * 24 + 4, cw, r.b, { cls: 'r-t12', lh: 16, color: inkP }).html;
      y += r.h + gap;
    }
    const heads = dispBlock(ctx, 56, cw, { size: headSize, lines: ['Write this'] }, 1, ink, { y: 120 }).html + dispBlock(ctx, half + 56, cw, { size: headSize, lines: ['Not that'] }, 1, inkP, { y: 120 }).html;
    return page('write-this', field(half, 0, half, H, panel) + heads + body + head(ctx, 'write-this', { left: white, right: panel }), white);
  },

  // Lines and boilerplate: the brand's main line at slide scale on a panel-colour band across the top, its other lines beside it;
  // under the band, on white, the short and long boilerplate and how to write the name, in three columns of four.
  messaging(ctx) {
    const B = ctx.brand, V = B.voice, W = ctx.size.w, H = ctx.size.h, panel = L(ctx).sunken, white = L(ctx).surface, g = grid(ctx), bandH = 400;
    const inkP = inkOn(ctx, panel), quietP = chromeOn(ctx, panel), soft = softOn(ctx, white);
    const main = fitSet(ctx, B.lines.primary, 96, 44, g.span(8), 2);
    const ox = g.col(9), ow = W - 56 - ox, others = B.lines.others.map((l) => wrapLines(ctx, 'body', 500, l, 22, ow, 0)).flat();
    const capLines = para(ctx, others.length > 1 ? 'Other lines, for smaller spaces.' : 'The other line, for smaller spaces.', 12, ow);
    const oBottom = bandH - 48, oTop = oBottom - others.length * 28 - 8 - capLines.length * 16;
    const cols = [['Short boilerplate', V.boilerplate25], ['Long boilerplate', V.boilerplate50], ['Writing the name', V.nameRules]].filter(([, v]) => v);
    const colsHtml = cols.map(([k, v], i) => box(g.col(4 * i), bandH + 40, g.span(4), 16, `color:${L(ctx).text}`, `<p class="r-t12 r-w600">${A(k)}</p>`) +
      block(ctx, g.col(4 * i), bandH + 64, g.span(4), para(ctx, v, 15, g.span(4)), { color: soft }).html).join('');
    const inner = field(0, 0, W, bandH, panel) + dispBlock(ctx, 56, g.span(8), main, 1, inkP, { yLast: bandH - 56 }).html +
      (others.length ? block(ctx, ox, oTop, ow, others, { cls: 'r-lead', lh: 28, color: inkP }).html + block(ctx, ox, oBottom - capLines.length * 16, ow, capLines, { cls: 'r-t12', lh: 16, color: quietP }).html : '') +
      colsHtml + head(ctx, 'messaging', { left: panel, right: panel });
    return page('messaging', inner, white);
  },

  // The brand on one page: the logo and the line on white, the three rules under them, the two faces at the foot, and down the right edge the palette as
  // one column of fields, each as tall as the colour's share.
  summary(ctx) {
    const B = ctx.brand, W = ctx.size.w, H = ctx.size.h, white = L(ctx).surface, F = B.fonts, d = F.display, b = F.body, dw = dispW(ctx);
    const colW = 192, cx = W - colW, cs = ctx.colours.slice().sort((p, q) => q.share - p.share), sum = cs.reduce((a, c) => a + c.share, 0);
    // the share column: each field labelled with its name, share and hex, on two lines where it is tall enough and on one where it is not
    let y = 0, column = '';
    cs.forEach((c, i) => {
      const h = i === cs.length - 1 ? H - y : Math.round((H * c.share) / sum), ink = inkOn(ctx, c.hex), pct = `${Math.round((c.share * 100) / sum)}%`;
      const edge = c.hex.toLowerCase() === white.toLowerCase() ? `box-shadow:inset 1px 0 0 ${L(ctx).divider}` : '';
      const label = `<span class="r-w600">${A(c.name)}</span>&nbsp;&nbsp;<span class="num">${pct}</span>`;
      column += field(cx, y, colW, h, c.hex, edge) + (h >= 64
        ? box(cx + 16, y + h - 16 - 32, colW - 32, 32, `color:${ink}`, `<p class="r-t12 r-nw">${label}</p><p class="r-mono num">${A(c.hex)}</p>`)
        : box(cx + 16, y + (h - 16) / 2, colW - 32, 16, `color:${ink}`, `<p class="r-t12 r-nw">${label}&nbsp;&nbsp;<span class="r-mono num">${A(c.hex)}</span></p>`));
      y += h;
    });
    const area = cx - 56 - 56, g3 = (area - 64) / 3;
    const lg = ctx.logo.geos.colour, lw = Math.floor(Math.min(520, (160 * lg.w) / lg.h)), lh = (lw * lg.h) / lg.w;
    const logo = box(56, 104, lw, lh, '', ctx.logo.html('colour', { width: lw, label: 'Your logo goes here', color: L(ctx).text }));
    const line = block(ctx, 56, 104 + lh + 24, area, para(ctx, (onceRe(ctx)?.test(B.lines.primary) ? B.lines.others[0] : '') || B.lines.primary, 22, area, 500), { cls: 'r-lead', lh: 28, color: L(ctx).text });
    // the rules: one display size for all three titles (the largest that sets each in two lines), the text measured under each
    const rules = (B.guideB?.rules || []).slice(0, 3);
    const rs = (() => { for (let s = 32; s > 18; s--) if (rules.every((r) => fitSet(ctx, r.title, s, s - 1, g3, 2).size === s)) return s; return 18; })();
    const ry = 104 + lh + 24 + line.h + 80;
    const rulesHtml = rules.map((r, i) => {
      const x = 56 + i * (g3 + 32), t = wrapLines(ctx, 'display', dw, r.title, rs, g3), tx = para(ctx, r.text || r.body || '', 15, g3);
      // in the slot edition the title is a compact placeholder that may wrap to two lines: the row is two lines tall
      const tl = ctx.placeholders ? Math.max(2, t.length) : t.length;
      return box(x, ry, g3, tl * rs * 1.15, `color:${L(ctx).text};font-size:${rs}px;line-height:1.15`, `<h3 class="disp">${lineHtml(t)}</h3>`) +
        block(ctx, x, ry + tl * rs * 1.15 + 12, g3, tx, { color: softOn(ctx, white) }).html;
    }).join('');
    const quiet = L(ctx).quiet, wname = (ws) => ws.join(', ');
    const faces = box(56, H - 56 - 52, g3, 52, '', `<p class="disp r-nw" style="font-size:26px;line-height:30px;color:${L(ctx).text}">${A(d.family)}</p><p class="r-t12" style="margin-top:6px;color:${quiet}">Display, weight ${wname(d.weights)}${d.stretch ? `, width ${d.stretch}` : ''}</p>`) +
      box(56 + g3 + 32, H - 56 - 52, g3, 52, '', `<p class="r-nw" style="font:600 22px/30px var(--body);color:${L(ctx).text}">${A(b.family)}</p><p class="r-t12" style="margin-top:6px;color:${quiet}">Body, weights ${wname(b.weights)}</p>`);
    return page('summary', logo + line.html + rulesHtml + faces + column + head(ctx, 'summary', { left: white, right: cs[0].hex }), white);
  },

  // Contact and scope: the closing slide. Who owns the document stands large on an action field across the left half, with the address to write to and the
  // version under it; the right half lists what is in the document and what is not.
  'contact-scope'(ctx) {
    const B = ctx.brand, W = ctx.size.w, H = ctx.size.h, act = byRole(ctx, 'action').hex, white = L(ctx).surface, half = W / 2, cw = half - 112;
    const ink = inkOn(ctx, act), soft = softOn(ctx, white), quiet = L(ctx).quiet;
    const owner = fitSet(ctx, B.contact.owner, 96, 44, cw, 2);
    const ask = para(ctx, 'Write for a logo file, a missing asset or an exception.', 15, cw);
    const ver = para(ctx, `${ctx.versionLine}. First release.`, 12, cw);
    const verTop = H - 48 - ver.length * 16, askTop = verTop - 48 - ask.length * 24, mailTop = askTop - 8 - 28;
    const left = field(0, 0, half, H, act) + dispBlock(ctx, 56, cw, owner, 1, ink, { yLast: mailTop - 40 }).html +
      box(56, mailTop, cw, 28, `color:${ink}`, `<p class="r-lead r-nw">${A(B.contact.email)}</p>`) + block(ctx, 56, askTop, cw, ask, { color: ink }).html +
      block(ctx, 56, verTop, cw, ver, { cls: 'r-t12', lh: 16, color: ink }).html;
    const rx = half + 56;
    const secs = ctx.sections.map((s, i) => box(rx, 128 + i * 24, cw, 24, '', `<p class="r-t15 r-nw"><span class="num" style="display:inline-block;width:32px;color:${quiet}">${s.n}</span><span style="color:${L(ctx).text}">${A(s.title)}</span></p>`)).join('');
    // what the guidelines leave out: the brand's own list where it has one, else the three things the other exports carry
    const notIn = B.guideB?.notIn || ['Logo files, palettes and fonts. They are in the brand kit.', 'Interface components and tokens. They are in the UI kit.', 'Print specifications. Ask your printer for a proof.'];
    const items = notIn.map((t) => { const [a, ...r] = sentences(t); return { a: para(ctx, a, 15, cw, 600), r: para(ctx, r.join(' '), 15, cw) }; });
    let y = H - 48, out = '';
    for (const it of items.slice().reverse()) {
      y -= (it.a.length + it.r.length) * 24;
      out += block(ctx, rx, y, cw, it.a, { cls: 'r-t15 r-w600', color: L(ctx).text }).html + block(ctx, rx, y + it.a.length * 24, cw, it.r, { color: soft }).html;
      y -= 16;
    }
    const labels = box(rx, 104, cw, 16, `color:${L(ctx).text}`, '<p class="r-t12 r-w600">In this document</p>') + box(rx, y - 8 - 16, cw, 16, `color:${L(ctx).text}`, '<p class="r-t12 r-w600">Not in this document</p>');
    return page('contact-scope', left + labels + secs + out + head(ctx, 'contact-scope', { left: act, right: white }), white);
  },
};

export function css() {
  return `
.pg.g1 .g1-x{text-decoration:line-through;text-decoration-thickness:1px}
.pg.g1 h3{margin:0;font-size:inherit}
`;
}
