// Guidelines run B pages (typefaces to contact-scope), laid out as a standards document: tables, numbered requirements
// and figures with numbered captions. Styles are in css-b.js (classes start b-); helpers are in helpers.js.
import { A, mono, nameOf, std, title, issued } from './helpers.js';
import { cssNum } from '../../engine/escape.js';

const refOf = (ctx, id) => ctx.pages.find((p) => p.id === id).ref;
// the "ref.n" folio for a numbered item on a page
const num = (ctx, id, n) => `<span class="num">${refOf(ctx, id)}.${n}</span>`;
// an absolutely placed box inside a drawing (units are the drawing's own)
const ab = (x, y, w, h, style = '', html = '', cls = '') => `<div class="b-ab ${cls}" style="left:${x}px;top:${y}px;${w != null ? `width:${w}px;` : ''}${h != null ? `height:${h}px;` : ''}${style}">${html}</div>`;
// a drawing authored at real size (w x h) and shown at scale k, so type keeps its true size in the markup
const sc = (w, h, k, inner, style = '', cls = '') => `<div class="b-sc ${cls}" style="width:${Math.round(w * k)}px;height:${Math.round(h * k)}px;${style}"><div class="b-sc__in" style="width:${w}px;height:${h}px;transform:scale(${k})">${inner}</div></div>`;
// the first sentence of a slot brief, used as its title ("The ridge: ..." -> "The ridge")
const shotTitle = (s) => (s.slot || s.alt || s.id).split(':')[0];
const shotBrief = (s) => { const t = (s.slot || s.alt || '').split(':').slice(1).join(':').trim(); return t.charAt(0).toUpperCase() + t.slice(1); };
const faded = (ctx, hex, ground, share) => {
  const a = ctx.C.hexToRgb(hex), b = ctx.C.hexToRgb(ground);
  return ctx.C.rgbToHex(a.map((v, i) => b[i] + (v - b[i]) * share));
};
const roleColour = (ctx, role) => ctx.brand.colours.find((c) => c.role === role);
const rn = (ctx, role) => A(roleColour(ctx, role).name);  // the brand's own word for a colour, read from brand data
// numbered requirements under a table: "5.1.4 text"
const reqList = (ctx, id, from, items) => `<ol class="b-req">${items.map((t, i) => `<li>${num(ctx, id, from + i)}<span>${t}</span></li>`).join('')}</ol>`;
// "Figure 5.2 caption"
const fcap = (label, text) => `<figcaption class="b-fcap"><b>Figure ${label}</b> ${text}</figcaption>`;
// a ledger table: headings, column widths (px, null = the rest) and rows of cell html
const table = (heads, widths, rows, cls = '') => `<table class="st b-tb ${cls}"><colgroup>${widths.map((w) => `<col${w ? ` style="width:${w}px"` : ''}>`).join('')}</colgroup><thead><tr>${heads.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table>`;
const row = (cells) => `<tr>${cells.map((c) => (typeof c === 'string' ? `<td>${c}</td>` : `<td class="${c[0]}">${c[1]}</td>`)).join('')}</tr>`;

// One drawing set stands in for every photograph until the shots are made: the same house (a hip roof, 15 panels on the
// north plane, the meter box and back door on the east wall) drawn in plan, in elevation or as the meter-box detail.
// Each view is a 400 x 300 field in drawing units (1 unit = 50 mm); `crop` is the viewBox, so a slot shows the part its
// brief names. Weights are set in screen px, so every figure reads alike at any scale: heavy outline, medium ridge and
// panel edges, light panel cells. No fills, except the sun and the wash on the rule about colour.
const LW = { h: 2, m: 1.2, l: 0.6 };
const EAVE = 196, GROUND = 250, RISE = 33 / 80; // elevation: eave line, ground line, rise per unit of run (22.5 degree pitch)
const ev = (yp) => EAVE - (yp - 70) * RISE; // a plan y on the north plane, as a height in elevation
const PANELS = [0, 1, 2].flatMap((r) => [0, 1, 2, 3, 4].map((c) => ({ x: 116 + c * 34, y: 80 + r * 20, w: 32, h: 18 })));
const f2 = (v) => Math.round(v * 100) / 100;
const roofDrawing = (o) => {
  const [cx, cy, cw, ch] = o.crop, k = o.k || 1, s = Math.max(o.w / cw, o.h / ch), bg = o.bg || 'var(--ground)';
  const sw = (wt) => f2(LW[wt] / s);
  const P = (d, wt, extra = '') => `<path d="${d}" fill="none" stroke="currentColor" stroke-width="${sw(wt)}" stroke-linejoin="round" stroke-linecap="round"${extra}/>`;
  const rect = (x, y, w, h) => `M${f2(x)} ${f2(y)}h${f2(w)}v${f2(h)}h${f2(-w)}z`;
  const ln = (x1, y1, x2, y2) => `M${f2(x1)} ${f2(y1)}L${f2(x2)} ${f2(y2)}`;
  const dash = ` stroke-dasharray="${f2(5 / s)} ${f2(3 / s)}"`;
  const panels = o.panels !== false, ground = o.ground !== false;
  let g = '';
  if (o.wash) g += `<rect x="${cx}" y="${cy}" width="${cw}" height="${ch}" fill="var(--sun)"/>`;
  if (o.sun) g += `<circle cx="${o.sun[0]}" cy="${o.sun[1]}" r="${o.sun[2]}" fill="var(--sun)"/>`;
  if (o.view === 'plan') {
    g += P(rect(40, 70, 320, 160), 'h') + P('M40 70L120 150L280 150L360 70M40 230L120 150M280 150L360 230', 'm');
    g += P(rect(52, 82, 296, 136), 'l', dash) + P(rect(348, 186, 6, 18), 'm') + P(`${ln(348, 150, 330, 150)}M330 150A18 18 0 0 0 348 168`, 'l');
    if (ground) g += P(ln(-600, 30, 1000, 30), 'm') + P(ln(-600, 24, 1000, 24), 'l');
    if (panels) {
      g += P(PANELS.map((p) => rect(p.x, p.y, p.w, p.h)).join(''), 'm');
      g += P(PANELS.map((p) => [1, 2, 3, 4, 5].map((i) => ln(p.x + (p.w * i) / 6, p.y, p.x + (p.w * i) / 6, p.y + p.h)).join('') + [1, 2].map((j) => ln(p.x, p.y + (p.h * j) / 3, p.x + p.w, p.y + (p.h * j) / 3)).join('')).join(''), 'l');
    }
    const nr = 6 / s, nx = cx + cw - 12 / s, ny = cy + 18 / s;  // north arrow, in the top right of the crop
    g += P(`${ln(nx, ny + nr * 2, nx, ny - nr * 2)}M${f2(nx - nr * 0.7)} ${f2(ny - nr)}L${f2(nx)} ${f2(ny - nr * 2)}L${f2(nx + nr * 0.7)} ${f2(ny - nr)}`, 'm');
    g += `<text x="${f2(nx)}" y="${f2(ny + nr * 3.6)}" text-anchor="middle" fill="currentColor" style="font:600 ${f2(9 / s)}px var(--chrome)">N</text>`;
  } else if (o.view === 'north') {
    if (ground) g += P(ln(-600, GROUND, 1000, GROUND), 'h') + P(ln(-600, 262, 1000, 262), 'm') + P(ln(-600, 266, 1000, 266), 'l');
    g += P('M40 196L120 163L280 163L360 196Z', 'h') + P('M52 196V250M348 196V250', 'h');
    g += P(rect(84, 208, 64, 26) + rect(252, 208, 64, 26) + rect(190, 208, 20, 42), 'l');
    if (panels) {
      const box = PANELS.map((p) => ({ x: p.x, w: p.w, t: ev(p.y + p.h), b: ev(p.y) }));
      g += P(box.map((p) => rect(p.x, p.t, p.w, p.b - p.t)).join(''), 'm');
      g += P(box.map((p) => [1, 2, 3, 4, 5].map((i) => ln(p.x + (p.w * i) / 6, p.t, p.x + (p.w * i) / 6, p.b)).join('') + ln(p.x, (p.t + p.b) / 2, p.x + p.w, (p.t + p.b) / 2)).join(''), 'l');
    }
  } else if (o.view === 'end') {
    // looking west at the east end, north on the right; e = 350 - plan y
    if (ground) g += P('M-600 250H320V256H1000', 'h');
    g += P('M120 196L200 163L280 196Z', 'h') + P('M132 196V250M268 196V250', 'h');
    if (panels) g += P([0, 1, 2].map((r) => { const y0 = 80 + r * 20, y1 = y0 + 18, e0 = 350 - y0, e1 = 350 - y1; return `M${f2(e0)} ${f2(ev(y0) - 2.5)}L${f2(e1)} ${f2(ev(y1) - 2.5)}L${f2(e1)} ${f2(ev(y1) - 4.5)}L${f2(e0)} ${f2(ev(y0) - 4.5)}Z`; }).join(''), 'm');
    g += P(rect(146, 218, 18, 16) + rect(182, 208, 18, 42), 'm') + P(ln(155, 218, 155, 234), 'l');
  } else if (o.view === 'meter') {
    // the meter box, straight on: weatherboards either side, the eave above, the door open edge-on
    g += P(Array.from({ length: 13 }, (_, i) => 22 + i * 22).map((y) => ln(-200, y, 110, y) + ln(302, y, 600, y)).join(''), 'l');
    g += P(ln(-200, 6, 600, 6), 'h') + P(rect(110, 30, 180, 232), 'h') + P(rect(290, 30, 12, 232), 'm');
    g += P(rect(146, 48, 108, 60) + ln(124, 140, 276, 140) + ln(124, 196, 276, 196) + rect(222, 170, 46, 46) + ln(245, 182, 245, 204), 'm');
    g += P(rect(162, 60, 76, 22) + Array.from({ length: 9 }, (_, i) => rect(128 + i * 16, 122, 12, 36)).join('') + Array.from({ length: 5 }, (_, i) => rect(128 + i * 16, 178, 12, 36)).join('') + rect(222, 220, 46, 12), 'l');
  }
  if (o.light) {
    const [x1, y1, x2, y2] = o.light, a = Math.atan2(y2 - y1, x2 - x1), hl = 6 / s;
    const hd = (t) => `L${f2(x2 - hl * Math.cos(a + t))} ${f2(y2 - hl * Math.sin(a + t))}`;
    g += P(ln(x1, y1, x2, y2), 'm', dash) + P(`M${f2(x2 - hl * Math.cos(a - 0.5))} ${f2(y2 - hl * Math.sin(a - 0.5))}L${f2(x2)} ${f2(y2)}${hd(0.5)}`, 'm');
  }
  // keys 1, 2, 3: kept inside the crop; the clause each one stands for is listed in HTML beside the figure
  const r = 7 / s, pad = r + 3 / s;
  g += (o.keys || []).map(([x, y, n], i) => {
    const kx = f2(Math.min(Math.max(x, cx + pad), cx + cw - pad)), ky = f2(Math.min(Math.max(y, cy + pad), cy + ch - pad));
    return `<circle cx="${kx}" cy="${ky}" r="${f2(r)}" fill="${bg}" stroke="currentColor" stroke-width="${sw('m')}"/><text x="${kx}" y="${f2(ky + 3.2 / s)}" text-anchor="middle" fill="currentColor" style="font:600 ${f2(9 / s)}px var(--chrome)">${n || i + 1}</text>`;
  }).join('');
  const label = { plan: 'plan of the roof', north: 'the house from the street', end: 'the east end of the house', meter: 'the meter box, straight on' }[o.view];
  const at = o.tagAt || 'bl', edge = `${f2(4 / k)}px`;
  const tag = o.tag === false ? '' : `<span class="b-dw__t" style="font-size:${f2(9 / k)}px;padding:${f2(1 / k)}px ${f2(4 / k)}px;${at[0] === 't' ? 'top' : 'bottom'}:${edge};${at[1] === 'l' ? 'left' : 'right'}:${edge};background:${bg}">Illustrative</span>`;
  return `<div class="b-dw" role="img" aria-label="Illustrative drawing: ${label}" style="width:${f2(o.w / k)}px;height:${f2(o.h / k)}px;color:${o.ink || 'var(--ink)'};${o.style || ''}"><svg viewBox="${o.crop.join(' ')}" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${g}</svg>${tag}${o.over || ''}</div>`;
};
// each shot's drawing: the view its brief describes, the crop, and keys 1 subject, 2 edge of the crop, 3 light
const SHOT = {
  ridge: { view: 'north', crop: [20, 60, 360, 270], keys: [[266, 150], [130, 290], [40, 74]], light: [54, 84, 104, 126], tagAt: 'br' },
  array: { view: 'north', crop: [96, 40, 208, 156], keys: [[200, 180], [108, 188], [294, 54]], light: [282, 64, 246, 100], tagAt: 'tl' },
  meter: { view: 'meter', crop: [50, 0, 320, 240], keys: [[276, 166], [110, 30], [330, 16]] },
  street: { view: 'north', crop: [-120, 40, 520, 390], keys: [[200, 140], [-60, 120], [396, 52]], light: [372, 80, 330, 120] },
  kitchen: { view: 'plan', crop: [80, 56, 240, 180], keys: [[200, 108], [88, 64], [92, 214]], light: [106, 214, 146, 214], tagAt: 'br' },
  handover: { view: 'end', crop: [110, 160, 128, 96], keys: [[155, 208], [212, 226], [138, 180]] },
};
// a shot's frame: its photograph once there is one, until then the drawing (w x h in screen px, k the scale it sits at)
const frame = (ctx, id, o) => {
  const s = ctx.shot(id);
  if (s && s.photo) return ctx.photo(id, { slotNote: false, style: `width:${f2(o.w / (o.k || 1))}px;height:${f2(o.h / (o.k || 1))}px` });
  const d = SHOT[id] || SHOT.street;
  return roofDrawing({ ...d, ...(o.keyed ? {} : { keys: [], light: null }), ...o });
};
// the key mark, as HTML, for the clause lists beside a figure
const key = (n) => `<span class="b-k">${n}</span>`;

export const guidelinesB = {
  typefaces(ctx) {
    const B = ctx.brand, F = B.fonts, ref = refOf(ctx, 'typefaces');
    const usedBy = (role) => B.type.scale.filter((s) => s.face === role).map((s) => s.token);
    const defs = [['display', 'Display', F.display], ['body', 'Body', F.body], ['mono', 'Mono', F.mono]].filter((r) => r[2]);
    const useOf = (role) => (role === 'mono' ? 'Literal values only: a hex, a token or a code string.' : `Sets ${usedBy(role).join(', ')}.`);
    // a real line in each face, at its heaviest cut: the primary line, the caption, a literal value
    const C = B.ui.screen.content, sample = { display: [A(C.eta), 22], body: [A(C.rider), 16], mono: ['6.6 kW, 3 pm', 13] };
    const faceRows = defs.map(([role, label, f], i) => {
      const [txt, fs] = sample[role], top = cssNum(f.weights[f.weights.length - 1]);
      return row([['b-r', num(ctx, 'typefaces', i + 1)], `<b class="b-fam">${A(f.family)}</b><span class="cap num">${label}, cut in ${f.weights.join(' and ')}</span>`, `<p class="b-line" style="font-family:var(--${role});font-weight:${top};font-size:${fs}px;${role === 'display' ? 'letter-spacing:-0.015em' : ''}">${txt}</p>`, A(useOf(role)), ['cap', 'Open Font Licence. Free from Google Fonts.']]);
    });
    const faces = table(['Ref', 'Face', 'Line set in the face', 'Use', 'Licence'], [46, 132, null, 168, 120], faceRows);
    const setRows = defs.map(([role, , f]) => {
      const fs = role === 'mono' ? 12 : role === 'display' ? 19 : 16;
      return row([`<b class="b-fam b-fam--s">${A(f.family)}</b>`, `<p class="b-alpha" style="font-family:var(--${role});font-weight:${cssNum(f.weights[f.weights.length - 1])};font-size:${fs}px">ABCDEFGHIJKLMNOPQRSTUVWXYZ<br>abcdefghijklmnopqrstuvwxyz<br>0123456789 kW 6.6 3 pm</p>`]);
    });
    const sets = table(['Face', 'Character set'], [186, null], setRows);
    const reqs = reqList(ctx, 'typefaces', 4, [
      `${A(F.display.family)} shall carry the name and the headlines.`,
      `${A(F.body.family)} shall carry everything read.`,
      `${A(F.mono.family)} shall mark a literal value.`,
      `All three are open source and free to use in print and on screen. The kit's fonts.md lists the files and the Google Fonts links.`,
    ]);
    return std(ctx, 'typefaces', `${title(ctx, 'typefaces', 'Three faces, each with one job. The table gives each face, the weights it is cut in and what it sets.')}${faces}<h2 class="h3 b-h3">${ref}.A Character sets</h2>${sets}<h2 class="h3 b-h3">${ref}.B Requirements</h2>${reqs}`);
  },

  hierarchy(ctx) {
    const B = ctx.brand, S = B.type.sample, C = B.ui.screen.content, F = B.fonts, ref = refOf(ctx, 'hierarchy');
    const fam = (s) => (s.face === 'display' ? 'var(--display)' : 'var(--body)');
    const trk = (s) => (s.face === 'display' ? '−0.015 em' : '0');
    // a real line per style, capped at 22 px so the table holds; the true size is the figure below
    const line = { display: B.name, headline: C.eta, title: B.ui.screen.title, body: C.rider, label: C.form.book, caption: C.deliverTo };
    const rows = B.type.scale.map((s) => row([
      `<b class="b-el">${A(ctx.cap(s.token))}</b><span class="cap">${A(F[s.face].family)}</span>`,
      `<p class="b-line" style="font-family:${fam(s)};font-weight:${s.weight};font-size:${Math.min(s.size, 22)}px;${s.face === 'display' ? 'letter-spacing:-0.015em' : ''}">${A(line[s.token] || S.headline)}</p>`,
      ['num', `${s.size} px`], ['num', `${s.line}`], ['num', `${s.weight}`], ['num', trk(s)], A(s.use),
    ]));
    const tab = table(['Style', 'Line set in the style', 'Size', 'Line', 'Weight', 'Tracking', 'Use'], [96, null, 54, 44, 54, 64, 170], rows);
    // the scale set on one sheet at half size, each style at its true size in the drawing
    const lg = ctx.logo.geos.colour, logoW = 400, logoH = Math.round((logoW * lg.h) / lg.w);
    const sty = (token) => { const s = B.type.scale.find((x) => x.token === token); return `font-family:${fam(s)};font-size:${s.size}px;line-height:${s.line};font-weight:${s.weight};${s.face === 'display' ? 'letter-spacing:-0.015em;' : ''}`; };
    const frow = (token, html) => `<div class="b-fr"><span class="b-fl">${A(ctx.cap(token))}</span><div>${html}</div></div>`;
    const inner = [
      frow('display', ctx.logo.html('colour', { width: logoW, label: 'Your logo goes here' })),
      frow('headline', `<p class="b-spc" style="${sty('headline')}">${A(S.headline)}</p>`),
      frow('title', `<p class="b-spc" style="${sty('title')}">${A(S.headline)}</p>`),
      frow('body', `<p class="b-spc" style="${sty('body')}max-width:760px">${A(S.paragraph)}</p>`),
      frow('label', `<p class="b-spc" style="${sty('label')}">${A(C.form.book)}</p>`),
      frow('caption', `<p class="b-spc" style="${sty('caption')}">${A(S.caption)}</p>`),
    ].join('');
    const H = logoH + 72 + 34 + 48 + 22 + 20 + 5 * 32 + 36 + 4;
    const fig = `<figure class="b-fgr b-fgr--wide">${sc(1364, H, 0.5, `<div class="b-fs">${inner}</div>`, 'box-shadow:inset 0 0 0 1px var(--rule)')}${fcap(ref, 'The six styles at half size. Each is drawn at the size it prints.')}</figure>`;
    const reqs = reqList(ctx, 'hierarchy', 1, ['The line height shall tighten as the size grows, from 1.5 at reading size to under 1 at the top.', 'Size and line height are given in pixels and a multiplier. In print, 1 px is 0.75 pt.']);
    return std(ctx, 'hierarchy', `${title(ctx, 'hierarchy', 'Six sizes, drawn at the size they print. The line height tightens as the size grows, from 1.5 at reading size to under 1 at the top.')}${tab}${fig}${reqs}`);
  },

  'type-in-use'(ctx) {
    const B = ctx.brand, S = B.type.sample, sc2 = Object.fromEntries(B.type.scale.map((s) => [s.token, s])), G = ctx.gridMeasures, ref = refOf(ctx, 'type-in-use');
    const t = (k) => sc2[k], w = (k) => sc2[k].weight, m = G.margin, span = (n) => n * G.col + (n - 1) * G.gutter;
    const mk = (n, y) => ab(8, y, 40, 40, 'background:var(--mark);color:var(--ground);border-radius:50%;font:600 22px/40px var(--chrome);text-align:center', String(n));
    const drawn = `${ab(m, 56, null, null, '', ctx.logo.html('horizontal', { width: 170, label: 'Your logo goes here' }))}${mk(1, 50)}${ab(m, 150, span(5), 216, `font-family:var(--display);font-weight:${w('headline')};font-size:${t('headline').size}px;line-height:${t('headline').line};letter-spacing:-0.015em`, A(S.headline))}${mk(2, 152)}${ab(m, 410, span(4), 80, `font-family:var(--body);font-size:${t('body').size}px;line-height:${t('body').line};font-weight:${w('body')}`, A(S.paragraph))}${mk(3, 404)}${ab(m, 540, span(6), 360, '', frame(ctx, 'ridge', { w: span(6) * 0.55, h: 360 * 0.55, k: 0.55, crop: [0, 96, 400, 240] }))}${mk(5, 534)}${ab(m, 916, span(6), 24, `font-family:var(--body);font-size:${t('caption').size}px;line-height:${t('caption').line};color:var(--quiet)`, A(S.caption))}${mk(4, 910)}`;
    const fig = `<figure class="b-fgr">${sc(G.page.w, G.page.h, 0.55, drawn, 'background:var(--ground);box-shadow:inset 0 0 0 1px var(--rule)')}${fcap(ref, 'One page composed from the scale, at 55% of its size.')}</figure>`;
    const rows = [
      ['Logo', 'Horizontal, 170 px wide, top left.'],
      ['Headline', `<span class="num">${t('headline').size} px, line ${t('headline').line}, ${w('headline')}</span>`],
      ['Body', `<span class="num">${t('body').size} px, line ${t('body').line}, ${w('body')}</span>`],
      ['Caption', `<span class="num">${t('caption').size} px, line ${t('caption').line}, ${w('caption')}</span>`],
      ['Photograph', `The first shot in §${refOf(ctx, 'shot-list')}. Drawn here as an illustration until it is shot.`],
    ].map(([a, b], i) => row([['b-mkc', `<span class="b-mk">${i + 1}</span>`], `<span class="num b-ref">${num(ctx, 'type-in-use', i + 1)}</span><b class="b-el">${a}</b>${b}`]));
    const tab = table(['Mark', 'Element and setting'], [40, null], rows, 'b-tb--n');
    return std(ctx, 'type-in-use', `${title(ctx, 'type-in-use', 'A page composed from the scale: the logo, one headline, one paragraph and a captioned photograph. Nothing else is needed.')}<div class="b-fside">${fig}<div>${tab}<p class="cap b-after">The marks in the figure are the rows of the table.</p></div></div>`);
  },

  'type-rules'(ctx) {
    const B = ctx.brand, S = B.ui.screen, ground = ctx.roles.light.surface, quiet = ctx.roles.light.quiet, text = ctx.roles.light.text;
    const fade = faded(ctx, text, ground, 0.35), fr = ctx.fmt(ctx.ratio(fade, ground)), qr = ctx.fmt(ctx.ratio(quiet, ground));
    const act = roleColour(ctx, 'action'), gnd = ctx.byId.white ? 'white' : (ctx.colours.find((c) => c.role === 'ground') || ctx.colours[0]).id;
    const demos = [
      [`<span class="disp disp--sub b-dm" style="font-size:28px">By Thursday.</span>`, `<span class="disp b-dm" style="font-size:28px">By Thursday.</span>`],
      [`<span class="b-dm b-dm--b">6.6 kW, 3 pm</span>`, `<span class="b-dm b-dm--b">6.6kW, 3PM</span>`],
      [`<span class="b-dm b-dm--b" style="font-size:16px">Sun in, bills down.</span>`, `<span class="b-dm b-dm--b" style="font-size:12px">Sun in, bills down.</span>`],
      [`<span class="b-dm b-dm--b" style="font-size:14px;color:var(--quiet)">6.6 kW, 15 panels.</span><span class="cap num">Quiet on ${A(nameOf(ctx, gnd))}, ${qr} : 1</span>`, `<span class="b-chip" style="background:${fade}"></span><span class="cap num">${fade.toUpperCase()} on ${A(nameOf(ctx, gnd))}, ${fr} : 1, fails</span>`],
      [`<span class="b-dm">${mono(act.hex)}</span>`, `<span class="b-dm b-mono20">${A(S.title)}</span>`],
    ];
    const rows = B.type.rules.slice(0, demos.length).map((r, i) => row([['b-r', num(ctx, 'type-rules', i + 1)], ['b-req1 ph-tight', A(r.do)], `<div class="b-demo">${demos[i][0]}</div>`, `<div class="b-demo b-demo--no">${demos[i][1]}</div><p class="cap b-dont ph-tight">${A(r.dont)}</p>`]));
    const tab = table(['Ref', 'Requirement', `<span class="b-yes">${ctx.ui.icon('check', 16)}Do</span>`, `<span class="b-no">${ctx.ui.icon('x', 16)}Don't</span>`], [46, 188, 196, null], rows);
    return std(ctx, 'type-rules', `${title(ctx, 'type-rules', 'Five requirements, each drawn right and wrong. They cover weight, units, size, secondary text and mono.')}${tab}`, { note: `The faded sample is a swatch, not text. Text is never faded: secondary text uses the quiet colour, which passes at ${qr} : 1.` });
  },

  'photo-direction'(ctx) {
    const d = ctx.brand.imagery.direction, shots = ctx.brand.imagery.shots, hero = shots.find((s) => s.id === 'street') || shots[0], ref = refOf(ctx, 'photo-direction');
    // keys in the figure: 1 the subject, 2 the light, 3 the crop (the first three lines of the table)
    const keyOf = { subject: 1, light: 2, crop: 3 };
    const rows = Object.entries(d).map(([k, v], i) => row([['b-r', num(ctx, 'photo-direction', i + 1)], `<b>${A(ctx.cap(k))}</b>${keyOf[k] ? `<span class="b-kc">${key(keyOf[k])}</span>` : ''}`, `<span class="b-dir__v">${A(v)}</span>`]));
    const tab = table(['Ref', 'Aspect', 'Requirement'], [46, 70, null], rows);
    // the hero shot as a drawing set: the elevation from the street over the plan, at one scale
    const elev = frame(ctx, hero.id, { keyed: true, w: 320, h: 160, crop: [-140, 90, 520, 260], keys: [[200, 140, 1], [-80, 130, 3]], light: null });
    const plan = roofDrawing({ view: 'plan', w: 320, h: 240, crop: [-40, 0, 480, 360], keys: [[-10, 150, 2]], light: [6, 150, 34, 150], tag: false });
    const fig = `<figure class="b-fgr"><div class="b-set">${elev}${plan}</div>${fcap(ref, `${A(shotTitle(hero))}, shot ${shots.indexOf(hero) + 1} of ${shots.length} in §${refOf(ctx, 'shot-list')}. An illustrative drawing, not a photograph: the elevation from the street over the plan. Keys 1 to 3 are the first three lines of the table.`)}</figure>`;
    return std(ctx, 'photo-direction', `${title(ctx, 'photo-direction', 'Five lines cover every photograph: the subject, the light, the crop, the colour and the people.')}<div class="b-fside b-fside--p">${fig}${tab}</div>`);
  },

  'shot-list'(ctx) {
    const shots = ctx.brand.imagery.shots;
    const rows = shots.map((s, i) => row([['b-r', num(ctx, 'shot-list', i + 1)], frame(ctx, s.id, { keyed: true, w: 128, h: 96 }), `<b class="b-el">${A(shotTitle(s))}</b>${A(shotBrief(s))}`, ['cap', s.photo ? `Photo from ${A(s.credit)}` : 'Illustrative drawing. To be shot to the brief.']]));
    const tab = table(['Ref', 'Frame', 'Shot and brief', 'Source'], [46, 144, null, 130], rows, 'b-tb--shots');
    const legend = `<ol class="b-kl"><li>${key(1)}The subject</li><li>${key(2)}The edge of the crop</li><li>${key(3)}The light: an arrow where it has a direction, the eave where it is shade</li></ol>`;
    return std(ctx, 'shot-list', `${title(ctx, 'shot-list', 'Six shots that cover a job from the first panel to the first bill. Each frame draws the shot from the angle in its brief, keyed to the subject, the crop and the light.')}${legend}${tab}`, { note: 'Until a brief is shot, its frame is a drawing of the same roof. Never fill one with a stock image.' });
  },

  'imagery-rules'(ctx) {
    const rules = ctx.brand.imagery.rules, cw = ctx.brand.logo.colourways, ref = refOf(ctx, 'imagery-rules');
    // each example is the house from the street, from the same drawing set as the shot list (tile 299 x 120)
    const tile = (o) => `<div class="b-t">${roofDrawing({ view: 'north', w: 299, h: 120, tagAt: 'br', ...o })}</div>`;
    const wide = [-60, 120, 500, 200], left = [-300, 104, 700, 280];
    const over = (x, y, w, style, html) => ab(x, y, w, null, style, html);
    const logo = ctx.logo.html('horizontal', { width: 110, label: 'Logo' });
    const logoBusy = ctx.logo.html('mono-dark', { width: 120, colourway: 'mono-dark', color: cw['mono-dark'].name, label: 'Logo' });
    const line = (size, w) => over(14, 18, w, `font-family:var(--display);font-weight:700;font-size:${size}px;line-height:1.05;letter-spacing:-0.015em;color:var(--ink)`, A(ctx.brand.ui.screen.content.eta));
    const demos = [
      [tile({ crop: wide }), tile({ crop: [40, 150, 320, 128], ground: false, panels: false })],
      [tile({ crop: [-60, 60, 500, 200], sun: [-6, 182, 14] }), tile({ crop: [-60, 60, 500, 200], sun: [-6, 182, 14], wash: true })],
      [tile({ crop: left, over: line(15, 124) }), tile({ crop: [170, 160, 110, 44], over: line(26, 270) })],
      [tile({ crop: left, over: over(14, 18, null, '', logo) }), tile({ crop: [150, 158, 150, 60], over: ab(0, 0, 299, 120, 'display:grid;place-items:center', logoBusy) })],
    ];
    const hd = `<div class="b-rr b-rr--h b-rr--i"><span>Ref</span><span class="b-yes">${ctx.ui.icon('check', 16)}Do</span><span class="b-no">${ctx.ui.icon('x', 16)}Don't</span></div>`;
    const rows = rules.map((r, i) => `<div class="b-rr b-rr--i"><span class="b-rr__n num">${num(ctx, 'imagery-rules', i + 1)}</span><div class="b-rr__c">${demos[i][0]}<p class="cap"><b>Figure ${ref}.${i + 1}a</b>${A(r.do)}</p></div><div class="b-rr__c b-rr__c--no">${demos[i][1]}<p class="cap"><b>Figure ${ref}.${i + 1}b</b>${A(r.dont)}</p></div></div>`).join('');
    return std(ctx, 'imagery-rules', `${title(ctx, 'imagery-rules', 'Four rules for choosing and cropping a photograph. The examples are illustrative drawings of one house from the street, not photographs.')}<div class="b-rules">${hd}${rows}</div>`);
  },

  grid(ctx) {
    const G = ctx.gridMeasures, B = ctx.brand, S = B.type.sample, k = 0.56, W = G.page.w, H = G.page.h, m = G.margin, cw = G.col, gt = G.gutter, ref = refOf(ctx, 'grid');
    const colX = (i) => m + i * (cw + gt), span = (n) => n * cw + (n - 1) * gt;
    const bl = 24; // the body line height, six bases
    const cols = Array.from({ length: G.columns }, (_, i) => ab(colX(i), m, cw, H - 2 * m, 'background:var(--panel)')).join('');
    const lines = `<svg class="b-ab" style="left:0;top:0" width="${W}" height="${H}" aria-hidden="true">${Array.from({ length: Math.floor((H - 2 * m) / bl) + 1 }, (_, i) => `<line x1="0" x2="${W}" y1="${m + i * bl + 0.5}" y2="${m + i * bl + 0.5}" stroke="var(--rule)" stroke-width="1"/>`).join('')}</svg>`;
    const hl = B.type.scale.find((s) => s.token === 'headline');
    const bars = [0, 1, 2, 3, 4].map((i) => ab(colX(0), m + bl * 14 + 6 + i * bl, span(i === 4 ? 1 : 2), 10, 'background:var(--ink)')).join('');
    const drawn = `${cols}${lines}${ab(colX(0), m, null, null, '', ctx.logo.html('horizontal', { width: 190, label: 'Logo' }))}${ab(colX(0), m + bl * 3, span(5), 216, `font-family:var(--display);font-weight:${hl.weight};font-size:${hl.size}px;line-height:${hl.line};letter-spacing:-0.015em;color:var(--ink)`, A(S.headline))}${ab(colX(2), m + bl * 14, span(4), bl * 14, '', frame(ctx, 'array', { w: span(4) * k, h: bl * 14 * k, k }))}${bars}${ab(colX(0), m + bl * 20, span(2), 52, 'background:var(--accent);color:var(--accent-ink);font:500 16px/52px var(--body);text-align:center;border-radius:var(--r)', A(B.ui.screen.content.form.book))}${ab(colX(0), H - m - 20, span(6), 20, 'font:400 14px/20px var(--body);color:var(--quiet)', A(S.caption))}`;
    const x = (v) => Math.round(v * k);
    const nums = Array.from({ length: G.columns }, (_, i) => `<span class="b-gn num" style="left:${x(colX(i))}px;width:${x(cw)}px">${i + 1}</span>`).join('');
    const ledger = [['Page', `${W} × ${H} px`], ['Margin', `${m} px`], ['Columns', `${G.columns}`], ['Column', `${cw} px`], ['Gutter', `${gt} px`], ['Base', `${G.base} px`], ['Baseline', `${bl} px`]];
    const tab = table(ledger.map((l) => l[0]), [112, null, null, null, null, null, null], [row(ledger.map((l) => ['num', l[1]]))], 'b-tb--h');
    const fig = `<figure class="b-fgr"><div class="b-gw" style="width:${x(W)}px;height:${x(H)}px">${nums}<span class="b-gm num" style="left:2px;top:${x(m) + 2}px">${m}</span>${sc(W, H, k, drawn, 'box-shadow:inset 0 0 0 1px var(--rule)')}</div></figure>`;
    const side = `<div class="b-gside"><p class="b-fcap"><b>Figure ${ref}</b> The grid drawn at 56%. Shaded bands are columns; the lines are the baseline grid. The figure at the top left is the margin, in pixels. The image is an illustrative drawing.</p>${reqList(ctx, 'grid', 1, ['Everything shall snap to the 4 px base.', `Text shall sit on the ${bl} px line.`, 'Nothing shall hang outside the margin.'])}</div>`;
    return std(ctx, 'grid', `${title(ctx, 'grid', `A ${G.columns}-column grid on a ${W} by ${H} page. Everything snaps to the ${G.base} px base, and text sits on a ${bl} px line.`)}${tab}<div class="b-grid">${fig}${side}</div>`);
  },

  layouts(ctx) {
    const G = ctx.gridMeasures, B = ctx.brand, S = B.type.sample, C = B.ui.screen.content, W = G.page.w, H = G.page.h, m = G.margin, cwy = B.logo.colourways, ref = refOf(ctx, 'layouts');
    const k = 0.266, colX = (i) => m + i * (G.col + G.gutter), span = (n) => n * G.col + (n - 1) * G.gutter;
    const hl = B.type.scale.find((s) => s.token === 'headline'), tt = B.type.scale.find((s) => s.token === 'title');
    const hStyle = (extra = '') => `font-family:var(--display);font-weight:${hl.weight};font-size:${hl.size}px;line-height:${hl.line};letter-spacing:-0.015em;${extra}`;
    const bars = (x, y, w, n) => Array.from({ length: n }, (_, i) => ab(x, y + i * 24, i === n - 1 ? Math.round(w * 0.6) : w, 10, 'background:var(--rule)')).join('');
    const page = (inner, bg = 'var(--ground)') => sc(W, H, k, inner, `background:${bg};box-shadow:inset 0 0 0 1px var(--rule)`);
    const cover = page(`${ab(0, 0, W, 640, '', frame(ctx, 'array', { w: W * k, h: 640 * k, k, crop: [40, 40, 320, 200] }))}${ab(colX(0), 696, span(5), 216, hStyle('color:var(--ink)'), A(S.headline))}${ab(colX(0), H - m - 28, null, null, '', ctx.logo.html('horizontal', { width: 190, label: 'Logo' }))}`);
    const facts = [[C.deliverToLabel, C.deliverTo], [C.paidLabel, C.paid]].map(([a, b], i) => ab(colX(4), 296 + i * 96, span(2), 80, 'border-top:1px solid var(--ink);padding-top:10px;font-family:var(--body)', `<div style="font-size:14px;line-height:20px;color:var(--quiet)">${A(a)}</div><div style="font-size:16px;line-height:24px;font-weight:500;color:var(--ink)">${A(b)}</div>`)).join('');
    const letter = page(`${ab(colX(0), m, null, null, '', ctx.logo.html('horizontal', { width: 190, label: 'Logo' }))}${ab(colX(0), 200, span(4), 40, `font-family:var(--display);font-weight:${tt.weight};font-size:${tt.size}px;line-height:${tt.line};color:var(--ink)`, A(B.ui.screen.title))}${ab(colX(0), 296, span(4), 120, 'font:400 16px/24px var(--body);color:var(--ink)', A(S.paragraph))}${bars(colX(0), 440, span(4), 12)}${facts}${ab(colX(0), H - m - 20, span(6), 20, 'font:400 14px/20px var(--body);color:var(--quiet)', A(S.caption))}`);
    const poster = page(`${ab(colX(0), m, null, null, '', ctx.logo.html('horizontal', { width: 190, colourway: 'on-sunbelt', color: cwy['on-sunbelt'].name, label: 'Logo' }))}${ab(colX(0), H - m - 216 - 72, span(5), 216, hStyle('color:var(--accent-ink)'), A(S.headline))}${ab(colX(0), H - m - 32, span(5), 32, `font-family:var(--display);font-weight:${tt.weight};font-size:${tt.size}px;line-height:32px;color:var(--accent-ink)`, A(B.lines.others[0]))}`, 'var(--accent)');
    const caps = [['Cover', `Photograph across six columns, the headline in five, the logo on the baseline.`], ['Letter', `Text in four columns, facts in the last two, one rule above each.`], ['Poster', `A ${rn(ctx, 'action')} ground, the logo top left, one headline at the foot.`]];
    const figs = [cover, letter, poster];
    const matrix = `<table class="st b-tb b-mx"><colgroup><col><col><col></colgroup><thead><tr>${caps.map((c, i) => `<th>${num(ctx, 'layouts', i + 1)} ${c[0]}</th>`).join('')}</tr></thead><tbody><tr>${figs.map((f) => `<td class="b-mx__f">${f}</td>`).join('')}</tr><tr>${caps.map((c, i) => `<td class="cap b-mx__c"><b>Figure ${ref}${'abc'[i]}</b>${c[1]}</td>`).join('')}</tr></tbody></table>`;
    const fixed = [['Margin', `${m} px, all four sides`], ['Columns', `${G.columns}, with a ${G.gutter} px gutter`], ['Logo', 'Top left, or on the baseline'], ['Type', `One headline, set in 700 from §${refOf(ctx, 'hierarchy')}`]].map(([a, b]) => row([a, A(b)]));
    return std(ctx, 'layouts', `${title(ctx, 'layouts', `Three layouts built on the §${refOf(ctx, 'grid')} grid. A page has one headline and one image or one ground, and the rest is space.`)}${matrix}<h2 class="h3 b-h3">${ref}.A What stays fixed</h2>${table(['Parameter', 'Requirement'], [160, null], fixed)}`, { note: 'Thumbnails are drawn at 27%. The text in them is real, at the size it prints; the image on the cover is an illustrative drawing.' });
  },

  social(ctx) {
    const B = ctx.brand, cw = B.logo.colourways, S = B.applications.social, k = 0.11, ref = refOf(ctx, 'social');
    const L = (id, w, way) => ctx.logo.html(id, { width: w, colourway: way, color: cw[way].name, label: 'Logo' });
    const hd = (y, size, color, text, lh = 1) => ab(72, y, 936, null, `font-family:var(--display);font-weight:${700};font-size:${size}px;line-height:${lh};letter-spacing:-0.015em;color:${color}`, A(text));
    const square = sc(1080, 1080, k, `${ab(72, 72, null, null, '', L('horizontal', 360, 'on-sunbelt'))}${hd(612, 132, 'var(--accent-ink)', S[0])}`, 'background:var(--accent)');
    const portrait = sc(1080, 1350, k, `${ab(0, 0, 1080, 760, '', frame(ctx, 'array', { w: 1080 * k, h: 760 * k, k, crop: [40, 60, 320, 225], ink: 'var(--night-ink)', bg: 'var(--night)' }))}${hd(832, 120, 'var(--night-ink)', S[1])}${ab(72, 1350 - 72 - 52, null, null, '', L('horizontal', 330, 'reversed'))}`, 'background:var(--night)');
    const story = sc(1080, 1920, k, `${ab(0, 0, 1080, 1000, '', frame(ctx, 'street', { w: 1080 * k, h: 1000 * k, k, crop: [-60, 10, 440, 407] }))}${ab(0, 1000, 1080, 920, 'background:var(--accent)')}${hd(1072, 104, 'var(--accent-ink)', S[2], 1.05)}${ab(72, 1920 - 72 - 52, null, null, '', L('horizontal', 330, 'on-sunbelt'))}`);
    const posts = [['Square', '1080 × 1080 px', `A ${rn(ctx, 'action')} ground, the logo top left, the line at the foot.`, square], ['Portrait', '1080 × 1350 px', `A photograph over a ${rn(ctx, 'text')} ground, the line beneath it.`, portrait], ['Story', '1080 × 1920 px', `A photograph over ${rn(ctx, 'action')}, the line on the colour.`, story]];
    const rows = posts.map(([n, size, d, f], i) => row([`<span class="b-ref">${num(ctx, 'social', i + 1)}</span><b class="b-el">${n}</b><span class="num">${size}</span>`, `<div class="b-pf">${f}</div>`, `<b class="b-el">Figure ${ref}${'abc'[i]}</b>${d}`]));
    const fixed = [['Margin', '72 px, all four sides'], ['Type', 'Weight 700, never 900'], ['Logo', 'Horizontal version'], ['Lines', `The lines in §${refOf(ctx, 'messaging')}`]].map(([a, b]) => row([a, A(b)]));
    return std(ctx, 'social', `${title(ctx, 'social', 'Three formats, one line each. The logo and the line stay inside a 72 px margin, and the type is always 700.')}${table(['Format', 'Figure', 'Composition'], [168, 176, null], rows, 'b-tb--posts')}<h2 class="h3 b-h3">${ref}.A What stays fixed</h2>${table(['Parameter', 'Requirement'], [160, null], fixed)}`, { note: `Posts are drawn at 11% of full size, so their relation to each other is true. The photographs are illustrative drawings until they are shot. ${rn(ctx, 'action')} is a fill here, and ${rn(ctx, 'text')} sets the type on it.` });
  },

  signage(ctx) {
    const B = ctx.brand, cw = B.logo.colourways, ap = B.applications.signage, C = B.ui.screen.content, ref = refOf(ctx, 'signage');
    // the board size is data inside the signage string; in the slot edition the string is a placeholder, so read the size from the sample text and put a placeholder on the line
    const [, size, realLine] = ctx.real(ap).match(/^(.*?):\s*(.*)$/), line = ctx.ph('applications.signage.line', realLine), [, bw, bh] = size.match(/(\d+)\s*x\s*(\d+)\s*mm/), k = 0.7, W = +bw, H = +bh;
    const board = sc(W, H, k, `${ab(48, 48, null, null, '', ctx.logo.html('stacked', { width: 230, colourway: 'on-sunbelt', color: cw['on-sunbelt'].name, label: 'Logo' }))}${ab(48, 330, 504, null, `font-family:var(--display);font-weight:${700};font-size:92px;line-height:1;letter-spacing:-0.015em;color:var(--accent-ink)`, A(line))}${ab(48, H - 48 - 78, 504, null, 'font:500 30px/39px var(--body);color:var(--accent-ink)', `${A(C.rider)}<br>${A(C.deliverTo)}`)}`, 'background:var(--accent)');
    const ground = B.colours.find((c) => c.hex.toLowerCase() === cw['on-sunbelt'].ground.toLowerCase());
    const w = Math.round(W * k), h = Math.round(H * k);
    const dims = `<div class="dh" style="width:${w}px"></div><span class="dn" style="left:${Math.round(w / 2) - 30}px;top:-38px;background:var(--ground);padding:0 6px">${W} mm</span><div class="dv" style="height:${h}px"></div><span class="dn" style="left:-66px;top:${Math.round(h / 2) - 6}px">${H} mm</span>`;
    const spec = [['Size', `${W} × ${H} mm`], ['Ground', ground ? A(ground.name) : ''], ['Type', `${A(ctx.cap(B.colours.find((c) => c.role === 'text').name))}, 700`], ['Logo', `Stacked, on ${ground ? A(ground.name) : rn(ctx, 'action')}`], ['Fixed', ctx.ph('applications.signage.fixed', 'To the front fence')]].map(([a, b], i) => `<tr><td class="b-spec"><span class="b-ref">${num(ctx, 'signage', i + 1)}</span><b class="b-el">${a}</b>${b}</td></tr>`).join('');
    const fig = `<figure class="b-fgr"><div class="b-sg"><div class="b-sg__w" style="width:${w}px;height:${h}px">${dims}${board}</div></div>${fcap(ref, `The site board, drawn flat at ${Math.round(k * 100)}% of ${W} by ${H} mm. The dimension lines are ${rn(ctx, 'text')}, as on every drawing in this document.`)}</figure>`;
    return std(ctx, 'signage', `${title(ctx, 'signage', 'The site board that goes on the front fence on install day: the date, the crew and the address, in one colour.')}<div class="b-sgrid">${fig}<table class="st b-tb b-tb--n"><colgroup><col></colgroup><thead><tr><th>Specification</th></tr></thead><tbody>${spec}</tbody></table></div>`);
  },

  'email-signature'(ctx) {
    const B = ctx.brand, e = B.applications.email, c = B.applications.card, g = B.guideB.email, body = B.type.scale.find((s) => s.token === 'body'), cap = B.type.scale.find((s) => s.token === 'caption'), ref = refOf(ctx, 'email-signature');
    const sig = `<div class="b-sig"><div class="b-sig__logo">${ctx.logo.html('horizontal', { width: 190, label: 'Your logo goes here' })}</div><p class="b-sig__n">${A(e.person)}</p><p class="b-sig__r">${A(e.role)}</p><p class="b-sig__c">${A(c.contact)}<br>${A(B.applications.site.url)}</p></div>`;
    const mail = `<div class="b-mail"><div class="b-mail__h"><p class="b-mail__s">${A(g.subject)}</p><p class="b-mail__m"><span>From</span><span class="b-mail__v">${A(e.person)}, ${A(B.name)}</span></p><p class="b-mail__m"><span>To</span><span class="b-mail__v">${A(g.to)}</span></p><p class="b-mail__m"><span>Sent</span><span class="b-mail__v">${A(g.time)}</span></p></div><div class="b-mail__b"><p>${A(g.greeting)}</p><p>${A(g.body)}</p><p>${A(e.person)}</p>${sig}</div></div>`;
    const specs = [['Logo', `${ctx.logo.labels.horizontal} version, 190 px wide.`], ['Type', `${B.fonts.body.family}. Name at ${body.size} px, weight 500. Role and contact at ${cap.size} px.`], ['Text', 'Live text, not a picture, so the signature still reads with images off.']].map(([a, t], i) => row([['b-r', num(ctx, 'email-signature', i + 1)], `<b>${a}</b>`, A(t)]));
    return std(ctx, 'email-signature', `${title(ctx, 'email-signature', 'The signature as it renders in a mail client: the logo, a name, a role and a way to reach us.')}<figure class="b-fgr">${mail}${fcap(ref, 'The signature at the foot of a message, as a mail client shows it.')}</figure><h2 class="h3 b-h3">${ref}.A Requirements</h2>${table(['Ref', 'Element', 'Requirement'], [46, 80, null], specs)}`);
  },

  digital(ctx) {
    const B = ctx.brand, S = B.ui.screen.content, ui = ctx.ui, pct = Math.round(S.progress * 100), ref = refOf(ctx, 'digital');
    const track = `<div class="b-trk"><div class="b-trk__top">${ui.statusChip('producing', { label: S.status })}<span class="b-trk__t">${A(B.ui.screen.title)}</span></div><h2 class="ui-display b-trk__eta">${A(S.eta)}</h2><div class="ui-progress"><span class="ui-progress__bar"><i style="width:${pct}%"></i></span><span class="ui-progress__dot" style="left:${pct}%"></span></div><div class="b-trk__ft"><span>${A(S.from)}</span><span>${A(S.to)}</span></div><p class="b-trk__p">${A(S.pickup)}</p><div class="b-trk__rider"><span class="ui-avatar" aria-hidden="true">${A(S.initials)}</span><div><p class="b-trk__rn">${A(S.rider)}</p><p class="b-trk__rs">${A(S.riderNote)}</p></div>${ui.btn(S.call, { variant: 'secondary', iconLeft: 'phone' })}</div><div class="b-trk__facts"><div><p class="b-trk__fl">${A(S.deliverToLabel)}</p><p class="b-trk__fv">${A(S.deliverTo)}</p></div><div><p class="b-trk__fl">${A(S.paidLabel)}</p><p class="b-trk__fv num">${A(S.paid)}</p></div>${ui.btn(S.share, { variant: 'quiet', iconRight: 'arrow-right' })}</div></div>`;
    const list = `<div class="b-dl"><h3 class="b-dl__h">Systems</h3>${ui.deliveryRows(3)}</div>`;
    const bar = `<nav class="ui-topbar" aria-label="Main"><span>${ctx.logo.html('horizontal', { width: 140, label: 'Logo' })}</span><div class="ui-topbar__links">${ui.links([['Quotes', 'file-text'], ['Installs', 'calendar'], ['Output', 'gauge']], 1)}</div>${ui.btn(S.form.book, { size: 'sm' })}</nav>`;
    const win = `<div class="ui b-win"><div class="b-win__url"><span>${A(B.applications.site.url)}/install</span></div>${bar}<div class="b-win__body">${track}${list}</div></div>`;
    return std(ctx, 'digital', `${title(ctx, 'digital', 'The install-day screen on the website, built from the UI kit: the date, the crew, the progress and the next system.')}<figure class="b-fgr">${win}${fcap(ref, `The install-day screen on the website. The button shall be ${rn(ctx, 'action')} with a ${rn(ctx, 'text')} label. The screen is the UI kit, unchanged.`)}</figure>`);
  },

  summary(ctx) {
    const B = ctx.brand, F = B.fonts, ref = refOf(ctx, 'summary');
    const sw = B.colours.map((c) => `<li><span class="b-sw" style="background:${c.hex}"></span><b>${A(c.name)}</b>${mono(c.hex)}</li>`).join('');
    const strip = B.colours.map((c) => `<i style="flex:${c.share};background:${c.hex}"></i>`).join('');
    const faces = [['display', F.display], ['body', F.body], ['mono', F.mono]].map(([r, f]) => `<li><span class="b-sf" style="font-family:var(--${r});font-weight:${cssNum(f.weights[f.weights.length - 1])}">Aa</span><b>${A(f.family)}</b><span class="num">${f.weights.join(', ')}</span></li>`).join('');
    const lines = [B.lines.primary, ...B.lines.others].map((l, i) => `<p class="${i ? 'b-ln' : 'b-ln b-ln--1'}">${A(l)}</p>`).join('');
    const rules = B.guideB.rules.map((r, i) => `<li><span class="num">${i + 1}</span><span>${A(typeof r === 'string' ? r : r.text)}</span></li>`).join('');
    const rows = [
      ['Logo', ctx.logo.html('colour', { width: 260, label: 'Your logo goes here' })],
      ['Colour', `<ul class="b-sws">${sw}</ul><div class="b-strip">${strip}</div>`],
      ['Type', `<ul class="b-sfs">${faces}</ul>`],
      ['Lines', lines],
      ['Rules', `<ol class="b-rl">${rules}</ol>`],
    ].map(([a, c], i) => row([['b-r', `<span class="num">${ref}.${i + 1}</span>`], `<b>${a}</b>`, c]));
    return std(ctx, 'summary', `${title(ctx, 'summary', `${A(B.name)} on one page: the logo, the colours, the faces, the lines and three rules.`)}${table(['Ref', 'Subject', 'Specification'], [56, 76, null], rows, 'b-tb--sum')}`);
  },

  'contact-scope'(ctx) {
    const B = ctx.brand, sec = ctx.sections, ref = refOf(ctx, 'contact-scope');
    const h = (n, t) => `<h2 class="h3 b-h3 b-h3--c"><span class="num">${ref}.${n}</span> ${t}</h2>`;
    const who = table(['Item', 'Entry'], [160, null], [row(['Owner', A(B.contact.owner)]), row(['Email', A(B.contact.email)])]);
    const hist = table(['Version', 'Issued', 'Change'], [160, 200, null], [row([['num', mono(B.version.number)], A(issued(ctx)), 'First issue'])]);
    const inDoc = table(['Section', 'Title'], [56, null], sec.map((s) => row([['b-r num', `§${s.n}`], A(s.title)])));
    const notIn = table(['Not covered'], [null], ['The UI kit: components, tokens and code, in its own document.', 'Photographs: the shot list is a brief, not a set of images.', 'Production artwork. Ask your printer for a proof.'].map((t) => row([A(t)])));
    return std(ctx, 'contact-scope', `${title(ctx, 'contact-scope', 'Who to ask, what changed, and what this document does and does not cover.')}${h(1, 'Who to ask')}${who}${h(2, 'Version history')}${hist}<div class="b-csg"><div>${h(3, 'In this document')}${inDoc}</div><div>${h(4, 'Not in this document')}${notIn}</div></div>`);
  },
};
