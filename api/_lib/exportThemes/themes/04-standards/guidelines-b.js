/// Guidelines pages for theme 04, run B: typefaces, hierarchy, type-in-use, type-rules, photo-direction, shot-list, imagery-rules,
// grid, layouts, social, signage, email-signature, digital, summary, contact-scope. Styles are in css-b.js (classes start b-).
// Every page is the manual's standard page: a 250 px column of clauses, the work to its right, drawn dimensions and numbered clauses.
import { A, std, fit, wide, crop, VIEWS, wakePlan, wharfPlan, drawnLogo } from './helpers.js';
import { cssNum } from '../../engine/escape.js';
// a drawing standing in for a photograph: one crop of the hull sheet's world, labelled as a drawing
const drawn = (ctx, view, o = {}) => crop(ctx, VIEWS[view] || view, { label: 'Drawing', wharf: true, ...o });

const scaleTok = (ctx, t) => ctx.brand.type.scale.find((s) => s.token === t);
const px = (k) => (n) => +(n * k).toFixed(2);
const WN = { 400: 'Regular', 500: 'Medium', 600: 'Semibold', 700: 'Bold' };
const timeOf = (s) => (s.match(/\d{1,2}:\d{2}/) || [s])[0];
// the clause number for item n of a page, continuing after the page's own rules
const cn = (ctx, id, n) => `${ctx.pages.find((x) => x.id === id).ref}.${n}`;

// cap height and x-height of a face, as a share of its size, read from the font file the build already ships
const metrics = (ctx, family, weight) => {
  const stem = `${family.replace(/\s+/g, '')}-${weight}`;
  let m = { cap: 0.7, x: 0.5 };
  try {
    const f = ctx.loadFont(stem);
    m = { cap: f.tables.os2.sCapHeight / f.unitsPerEm, x: f.tables.os2.sxHeight / f.unitsPerEm };
  } catch { /* fall back to the usual proportions */ }
  return m;
};
const r1 = (n) => Math.round(n * 10) / 10;
// the manual's one x is 4 px on screen (the same as the book and the UI kit); sizes are printed in px and in x
const XB = 4;
const fx = (px) => `${+(px / XB).toFixed(2)}x`;
// one drawn line of type: the sample on its baseline, cap-height and x-height guides across, and a bracket for each in the ruler column
const gauge = ({ css, size, text, w, h, base, m, labels = false, ruler = 56, cls = '' }) => {
  const cap = m.cap * size, xh = m.x * size, y0 = base, bx = 8, bw = 22;
  const lab = labels ? `<text class="b-gl" x="${ruler + w + 10}" y="${r1(y0 - cap + 4)}">Cap height ${Math.round(cap)} px, ${fx(cap)}</text><text class="b-gl" x="${ruler + w + 10}" y="${r1(y0 - xh + 4)}">x-height ${Math.round(xh)} px, ${fx(xh)}</text><text class="b-gl" x="${ruler + w + 10}" y="${r1(y0 + 4)}">Baseline</text>` : '';
  const br = (x, y1, y2) => `<path class="b-gb" d="M${x - 4} ${r1(y1)}H${x + 4}M${x} ${r1(y1)}V${r1(y2)}M${x - 4} ${r1(y2)}H${x + 4}"/>`;
  return `<svg class="b-gs ${cls}" width="${ruler + w + (labels ? 170 : 0)}" height="${h}" aria-hidden="true"><line class="b-gg b-gg--b" x1="${ruler - 6}" x2="${ruler + w}" y1="${y0}" y2="${y0}"/><line class="b-gg b-gg--d" x1="${ruler - 6}" x2="${ruler + w}" y1="${r1(y0 - xh)}" y2="${r1(y0 - xh)}"/><line class="b-gg b-gg--d" x1="${ruler - 6}" x2="${ruler + w}" y1="${r1(y0 - cap)}" y2="${r1(y0 - cap)}"/>${br(bx, y0 - cap, y0)}${br(bx + bw, y0 - xh, y0)}<text class="b-gt" x="${ruler}" y="${y0}" style="${css};font-size:${size}px">${A(text)}</text>${lab}</svg>`;
};
const FACE = { display: 'font-family:var(--display);font-weight:__W__', body: 'font-family:var(--body);font-weight:__W__', mono: 'font-family:var(--bmono);font-weight:__W__' };
const faceCss = (face, w) => FACE[face].replace('__W__', w);

const own = {
  typefaces(ctx) {
    const B = ctx.brand, F = B.fonts, d = F.display, b = F.body, mo = F.mono, R = B.type.rules, sc = B.type.scale, id = 'typefaces';
    const tokensOf = (face) => sc.filter((s) => s.face === face).map((s) => s.token).join(', ');
    const sample = timeOf(B.ui.screen.content.eta) + ' ' + B.ui.screen.content.to;
    const dm = metrics(ctx, d.family, cssNum(d.weights[d.weights.length - 1])), bm = metrics(ctx, b.family, cssNum(b.weights[0])), mm = metrics(ctx, mo.family, cssNum(mo.weights[0]));
    const dw = [...d.weights].reverse().map((w) => `<li style="font-family:var(--display);font-weight:${w}"><span class="b-wn">${WN[w] || w} ${w}</span><span>${A(sample)}</span></li>`).join('');
    const bw = b.weights.map((w) => `<li style="font-family:var(--body);font-weight:${w}"><span class="b-wn">${WN[w] || w} ${w}</span><span>${A(B.lines.others[1])}</span></li>`).join('');
    const head = (n, name, fam, wts, use) => `<header class="b-fh"><span class="b-n num">${cn(ctx, id, n)}</span><b>${name}</b><span>${A(fam)}</span><span>${wts}</span><span>${use}</span></header>`;
    const work = `<div class="b-faces">
<section class="b-fc">${head(4, 'Display', d.family, `Weights ${d.weights.join(' and ')}`, `Set for ${A(tokensOf('display'))}.`)}<div class="b-fc__w">${gauge({ css: faceCss('display', cssNum(d.weights[d.weights.length - 1])), size: 170, text: 'Aa', w: 168, h: 150, base: 140, m: dm, labels: true, ruler: 40 })}<div class="b-fc__r"><p class="b-glyphs disp">ABCDEFGHIJKLMNOPQRSTUVWXYZ<br>abcdefghijklmnopqrstuvwxyz<br>0123456789</p><ul class="b-weights ph-tight">${dw}</ul></div></div></section>
<section class="b-fc">${head(5, 'Body', b.family, `Weights ${b.weights.join(', ')}`, `Set for ${A(tokensOf('body'))}.`)}<div class="b-fc__w">${gauge({ css: faceCss('body', 500), size: 150, text: 'Aa', w: 166, h: 130, base: 122, m: bm, labels: true, ruler: 40 })}<div class="b-fc__r"><p class="b-glyphs b-glyphs--body">ABCDEFGHIJKLMNOPQRSTUVWXYZ<br>abcdefghijklmnopqrstuvwxyz<br>0123456789</p><ul class="b-weights ph-tight">${bw}</ul></div></div></section>
<section class="b-fc b-fc--mono">${head(6, 'Mono', mo.family, `Weight ${mo.weights.join(', ')}`, 'Only for a hex, a token or a code string.')}<div class="b-fc__w">${gauge({ css: faceCss('mono', cssNum(mo.weights[0])), size: 80, text: ctx.roles.light.action, w: 340, h: 100, base: 80, m: mm, labels: true, ruler: 40 })}</div></section>
<p class="cap b-xnote"><b>Sizes</b>Given in px and in x, 4 px on screen, the stroke of the wake. ${r1(dm.cap / dm.x) === r1(bm.cap / bm.x) ? `Cap height is ${r1(dm.cap / dm.x)} times the x-height in both faces.` : `Cap height is ${r1(dm.cap / dm.x)} times the x-height in ${A(d.family)} and ${r1(bm.cap / bm.x)} times in ${A(b.family)}.`}</p></div>`;
    const lic = `${A(d.family)}, ${A(b.family)} and ${A(mo.family)} are open source under the SIL Open Font Licence. Free in print and on screen, and free to download from Google Fonts.`;
    return std(ctx, id, { lead: `Two faces do the work. ${A(d.family)} sets the time and the line you read first. ${A(b.family)} carries everything after it.`, rules: [A(R[0].do), A(R[5].do), lic], work });
  },

  hierarchy(ctx) {
    const B = ctx.brand, S = B.type, c = B.ui.screen.content, o = B.lines.others, id = 'hierarchy';
    const bodyT = scaleTok(ctx, 'body'), capT = scaleTok(ctx, 'caption'), dispT = scaleTok(ctx, 'display');
    // the slot edition's display and time placeholders are wider than a step's sample, so those two steps show their own name
    const slot = ctx.edition === 'slot';
    const samples = { display: slot ? 'Display' : timeOf(c.eta), headline: o[0], time: slot ? 'Time' : `${timeOf(c.eta)} ${c.to}`, title: B.voice.principles[1].example, body: `${o[1]} ${o[0]}`, label: c.riderNote, caption: S.sample.caption };
    const rows = S.scale.map((t, i) => {
      const disp = t.face === 'display', fam = B.fonts[t.face], m = metrics(ctx, fam.family, t.weight), capPx = m.cap * t.size, xh = m.x * t.size;
      const css = disp ? faceCss('display', cssNum(fam.weights[fam.weights.length - 1])) : faceCss('body', t.weight);
      return `<li class="b-sc"><span class="b-n num">${cn(ctx, id, i + 4)}</span>${gauge({ css, size: t.size, text: samples[t.token] || t.use, w: 330, h: 86, base: Math.round(43 + (m.cap * t.size) / 2), m, ruler: 44 })}<p class="cap"><b>${A(ctx.cap(t.token))}</b>${t.size} px, ${fx(t.size)}, line ${t.line}, weight ${t.weight}<br>Cap height ${r1(capPx)} px, ${fx(capPx)}; x-height ${r1(xh)} px, ${fx(xh)}<br>${A(t.use)}</p></li>`;
    }).join('');
    const fam = (face) => B.fonts[face].family;
    const rules = [`${S.scale.length} steps and no more. Nothing sits between two steps.`, `Line height tightens as size grows: ${dispT.line} at ${dispT.size} px, ${bodyT.line} at ${bodyT.size} px.`, `${A(fam('display'))} sets ${S.scale.filter((t) => t.face === 'display').map((t) => t.token).join(', ')}. ${A(fam('body'))} sets the rest.`];
    return std(ctx, id, { lead: `Every size has one job. Reading text is ${bodyT.size} px and captions are ${capT.size} px. Nothing is smaller.`, rules, work: `<ol class="b-scale">${rows}</ol>` });
  },

  'type-in-use'(ctx) {
    const B = ctx.brand, S = B.type, h = scaleTok(ctx, 'headline'), bd = scaleTok(ctx, 'body'), cp = scaleTok(ctx, 'caption'), id = 'type-in-use';
    const fam = (t) => B.fonts[t.face].family;
    const spec = (n, name, t) => { const m = metrics(ctx, fam(t), t.weight); return `<div class="b-us"><i class="b-ld" aria-hidden="true"></i><p class="cap"><b><span class="b-n num">${cn(ctx, id, n)}</span> ${name}</b>${t.size} px, ${fx(t.size)}, line ${t.line}, ${A(fam(t))} ${t.weight}<br>Cap height ${r1(m.cap * t.size)} px, ${fx(m.cap * t.size)}; x-height ${r1(m.x * t.size)} px, ${fx(m.x * t.size)}</p></div>`; };
    const work = `<div class="b-use"><figure class="b-use__f"><div class="b-use__d">${drawn(ctx, 'crossing')}</div><figcaption class="cap" style="font-size:${cp.size}px;line-height:${cp.line}">${A(S.sample.caption)}</figcaption></figure>${spec(1, 'Caption', cp)}
<h2 class="disp b-h" style="font-size:${h.size}px;line-height:${h.line}">${A(S.sample.headline)}</h2>${spec(2, 'Headline', h)}
<p class="b-p" style="font-size:${bd.size}px;line-height:${bd.line}">${A(S.sample.paragraph)}</p>${spec(3, 'Paragraph', bd)}</div>`;
    return std(ctx, id, { lead: `A headline, a paragraph and a caption, set the way ${A(B.name)} sets them.`, work });
  },

  'type-rules'(ctx) {
    const B = ctx.brand, R = B.type.rules, c = B.ui.screen.content, o = B.lines.others, id = 'type-rules';
    const t = ctx.edition === 'slot' ? c.eta : timeOf(c.eta) + ' ' + c.to, ic = (n) => ctx.ui.icon(n, 16);
    const demos = [
      [`<span class="disp b-d" style="font-size:22px">${A(t)}</span>`, `<span class="b-d" style="font-size:22px;font-weight:600">${A(t)}</span>`],
      [`<span class="disp b-d" style="font-size:22px">${A(o[0])}</span>`, `<span class="disp b-d" style="font-size:22px;text-transform:uppercase">${A(o[0])}</span>`],
      [`<span class="b-d" style="font-size:17px">${A(o[1])}</span>`, `<span class="b-d" style="font-size:9px">${A(o[1])}</span>`],
      [`<span class="b-d" style="font-size:14px;color:var(--quiet)">${A(c.riderNote)}</span>`, ''],
      [`<span class="b-d b-tab" style="font-variant-numeric:tabular-nums">07:20<br>11:11</span>`, `<span class="b-d b-tab" style="font-variant-numeric:proportional-nums">07:20<br>11:11</span>`],
      [`<span class="b-mono b-d">${A(ctx.roles.light.action)}</span>`, `<span class="b-mono b-d">${A(c.form.book)}</span>`],
    ];
    const rows = R.map((r, i) => `<li class="b-rule"><span class="b-n num">${cn(ctx, id, i + 1)}</span><div class="b-rule__t"><p class="b-rt">${ic('check')}<span><b>Do</b>${A(r.do)}</span></p><p class="b-rt b-rt--no">${ic('x')}<span><b>Don't</b>${A(r.dont)}</span></p></div><div class="b-sp ph-tight"><div class="b-demo">${demos[i][0]}</div></div><div class="b-sp b-sp--no ph-tight">${demos[i][1] ? `<div class="b-demo">${demos[i][1]}</div><svg class="b-xx" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M0 100L100 0" vector-effect="non-scaling-stroke"/></svg>` : ''}</div></li>`).join('');
    return std(ctx, id, { lead: `${R.length} rules for setting type. Each says what to do, and what never happens.`, work: `<ul class="b-rules">${rows}</ul>` });
  },

  'photo-direction'(ctx) {
    const D = ctx.brand.imagery.direction, id = 'photo-direction';
    const items = [['Subject', D.subject], ['Light', D.light], ['Crop', D.crop], ['Colour', D.colour], ['People', D.people]];
    const list = items.map(([k, v], i) => `<li class="b-dir"><span class="b-n num">${cn(ctx, id, i + 1)}</span><div><b>${k}</b><p>${A(v)}</p></div></li>`).join('');
    // the hull sheet: the ferry in side elevation at the manual's own x (4 px), framed the way the photograph is framed:
    // a clear band in the top third, the waterline on the lower third, every length in x
    const S = 4, W = 1011, H = 280, vx = 80 - W / S / 2, vy = -50, px = (wx) => +((wx - vx) * S).toFixed(1), py = (wy) => +((wy - vy) * S).toFixed(1);
    const art = crop(ctx, [vx, vy, W / S, H / S], { label: 'Drawing of the ferry on the river at Queens Wharf, in side elevation', wharf: true, sunX: 190 });
    const tick = (x, y1, y2) => `M${x - 4} ${y1}H${x + 4}M${x - 4} ${y2}H${x + 4}M${x} ${y1}V${y2}`;
    const hx = (y, x1, x2) => `M${x1} ${y - 4}V${y + 4}M${x2} ${y - 4}V${y + 4}M${x1} ${y}H${x2}`;
    const dims = `<svg class="b-hd" width="${W}" height="${H}" aria-hidden="true"><path class="b-hd__b" d="M0 ${H / 3}H${W}"/><path d="${hx(H - 40, px(0), px(160))}${tick(px(166), py(0), py(-34))}${tick(px(-6) + 10, py(0), py(-10))}${tick(px(166), py(0), py(4))}"/></svg>`;
    const lab = (x, y, t, st = '') => `<span class="b-hl num" style="left:${x}px;top:${y}px;${st}">${A(t)}</span>`;
    const labels = lab(px(80) - 20, H - 34, '160x') + lab(px(166) + 10, py(-17) - 7, '34x') + lab(px(-6) + 22, py(-5) - 7, '10x') + lab(px(166) + 10, py(2) - 7, '4x');
    const tg = (n, x, y) => `<i class="b-tg" style="left:${x}px;top:${y}px">${cn(ctx, id, n)}</i>`;
    const tags = tg(1, px(97), py(-32)) + tg(2, px(190) - 21, py(-9) - 26) + tg(3, 8, H / 3 - 9) + tg(4, px(21) - 21, py(-15) - 26) + tg(5, px(139) + 12, py(-15) - 26);
    const band = `<p class="disp b-hb ph-tight">${A(ctx.brand.lines.primary)}</p>`;
    const spec = [['Length', '160x'], ['Sheer', '10x'], ['Wheelhouse top', '26x'], ['Mast', '34x'], ['Draft', '4x'], ['Name', '5x high, on the topsides'], ['Wake', 'x thick, every 6x, on the waterline in Buoy'], ['Rails', '5x, a stanchion every 6x']];
    const sheet = `<figure class="b-hs"><div class="b-hsf" style="width:${W}px;height:${H}px">${art}${dims}${labels}${tags}${band}</div><figcaption class="b-hsc"><p class="cap"><b>The hull sheet. A drawing, not a photograph.</b>No photographs are licensed yet. Each one is shot to the five clauses keyed on this drawing.</p><dl class="b-hsd">${spec.map(([k, v]) => `<div><dt>${k}</dt><dd class="num">${A(v)}</dd></div>`).join('')}</dl></figcaption></figure>`;
    return wide(ctx, id, { lead: `${A(ctx.brand.name)} photographs the crossing as it happens, in daylight, with the river around it. Five clauses cover every photograph, each keyed on the drawing.`, work: `<div class="b-hull">${sheet}<ol class="b-dirs b-dirs--5">${list}</ol></div>` });
  },

  'shot-list'(ctx) {
    const SHOT = { crossing: (c) => drawn(c, 'crossing'), wharf: (c) => wharfPlan(c), boarding: (c) => drawn(c, 'boarding'), deck: (c) => drawn(c, 'deck'), wake: (c) => wakePlan(c), stockton: (c) => drawn(c, 'stockton') };
    const id = 'shot-list', sh = ctx.brand.imagery.shots;
    const rows = sh.map((s, i) => {
      const [name, ...rest] = ctx.edition === 'slot' ? [s.slot] : s.slot.split(':'), brief = rest.join(':').trim().replace(/^./, (c) => c.toUpperCase());
      // the slot edition's brief is a placeholder block, so its caption moves under the drawing to keep the row its height
      const slot = ctx.edition === 'slot', capT = `<p class="cap">${s.photo ? `Photo from ${A(s.credit)}` : 'Drawing. To be shot to this brief.'}</p>`, img = `<div class="b-shot__img">${SHOT[s.id] ? SHOT[s.id](ctx) : drawn(ctx, 'crossing')}</div>`;
      return `<li class="b-shot${slot ? ' b-shot--slot' : ''}"><span class="b-n num">${cn(ctx, id, i + 1)}</span>${slot ? `<div>${img}${capT}</div>` : img}<div class="b-shot__t"><p class="b-shot__n">${A(name)}</p>${brief ? `<p class="b-shot__b">${A(brief)}</p>` : ''}${slot ? '' : capT}</div></li>`;
    }).join('');
    return std(ctx, id, { lead: `Six photographs tell the whole crossing. Each is briefed by subject, crop and light, so any photographer can shoot it.`, work: `<ol class="b-shots">${rows}</ol>` });
  },

  'imagery-rules'(ctx) {
    const B = ctx.brand, R = B.imagery.rules, X = B.guideB.examples, ic = (n) => ctx.ui.icon(n, 16), id = 'imagery-rules';
    // each frame is drawn: the hull sheet's world cropped as the photograph would be, the brief kept as the drawing's label
    const tile = (brief, art) => `<div class="b-tile b-tile--d" title="${A(brief)}">${art}</div>`;
    const tag = (t) => `<i class="b-tag">${A(t)}</i>`;
    const lab = (b) => `Drawing. ${b}`;
    const logoOn = (id, cw, extra = '') => drawnLogo(ctx, id, 52, -21, 6, { colourway: cw, frame: cw === 'reversed' ? 'var(--dark-ink)' : 'var(--ink)' }) + extra;
    const doT = [
      tile(X[0].do, `${drawn(ctx, 'crossing', { label: lab(X[0].do) })}${tag('Level')}`),
      tile(X[1].do, `${drawn(ctx, 'deck', { label: lab(X[1].do) })}${tag('Buoy: the lifebuoy')}`),
      tile(X[2].do, `${wharfPlan(ctx, { behind: true, label: lab(X[2].do) })}${tag('From behind')}`),
      tile(X[3].do, `${drawn(ctx, 'topsides', { label: lab(X[3].do) })}${tag('Flat Hull')}`),
    ];
    const dontT = [
      tile(X[0].dont, `${drawn(ctx, [20, -26, 60, 22], { label: lab(X[0].dont), tilt: -7 })}${tag('Tilted')}`),
      tile(X[1].dont, `${drawn(ctx, 'deck', { label: lab(X[1].dont), extra: '<rect class="dr-wash" x="-200" y="-200" width="600" height="400"/>' })}${tag('Buoy: a wash')}`),
      tile(X[2].dont, `${wharfPlan(ctx, { behind: false, label: lab(X[2].dont) })}${tag('To camera')}`),
      tile(X[3].dont, `${drawn(ctx, 'busy', { label: lab(X[3].dont), extra: logoOn('colour', 'colour') })}${tag('Busy')}`),
    ];
    const half = (tl, icon, who, text) => `<div class="b-ih"><div class="b-ir__tile">${tl}</div><p class="cap b-ir__cap">${ic(icon)}<span><b>${who}</b>${A(text)}</span></p></div>`;
    const rows = R.slice(0, 4).map((r, i) => `<li class="b-ir"><span class="b-n num">${cn(ctx, id, i + 1)}</span>${half(doT[i], 'check', 'Do', r.do)}${half(dontT[i], 'x', "Don't", r.dont)}</li>`).join('');
    return std(ctx, id, { lead: `Four rules keep the photographs honest. Each shows the right frame beside the wrong one.`, work: `<ol class="b-irs">${rows}</ol>` });
  },

  grid(ctx) {
    const G = ctx.gridMeasures, k = 0.58, p = px(k), B = ctx.brand, id = 'grid';
    const colX = (i) => G.margin + i * (G.col + G.gutter), span = (n) => n * G.col + (n - 1) * G.gutter;
    const hl = scaleTok(ctx, 'headline');
    const bars = Array.from({ length: G.columns }, (_, i) => `<i class="b-gcol" style="left:${p(colX(i))}px;width:${p(G.col)}px"></i>`).join('');
    const dim = (x, w, t, hi = '') => `<span class="b-dim" style="left:${p(x)}px;width:${p(w)}px"><em class="${hi}">${t}</em></span>`;
    const dims = dim(0, G.margin, G.margin) + dim(colX(0), G.col, ctx.fmt(G.col)) + dim(colX(0) + G.col, G.gutter, G.gutter, 'b-hi');
    const drawing = `<div class="b-gpage" style="width:${p(G.page.w)}px;height:${p(G.page.h)}px">${bars}
<h2 class="disp b-gh" style="left:${p(colX(0))}px;top:${p(G.margin + 24)}px;width:${p(span(6))}px;font-size:${p(hl.size)}px;line-height:${hl.line};font-weight:700">${A(B.type.sample.headline)}</h2>
<p class="cap b-gc" style="left:${p(colX(0))}px;bottom:${p(G.margin)}px;width:${p(span(5))}px">${A(B.type.sample.caption)}</p>
<div class="b-gph" style="left:${p(colX(7))}px;top:${p(G.margin)}px;width:${p(span(5))}px;height:${p(G.page.h - 2 * G.margin)}px">${drawn(ctx, 'wheel')}</div></div>`;
    const sd = (a, z, t) => `<span class="b-sdim" style="left:${p(colX(a))}px;width:${p(colX(z) + G.col - colX(a))}px"><em>${t}</em></span>`;
    const spans = `<div class="b-sdims" style="width:${p(G.page.w)}px">${sd(0, 5, 'Type, columns 1 to 6')}${sd(6, 6, 'Clear')}${sd(7, 11, 'Photograph, columns 8 to 12')}</div>`;
    const m = [['Page', `${G.page.w} × ${G.page.h} px`], ['Margin', `${G.margin} px`], ['Columns', `${G.columns} of ${ctx.fmt(G.col)} px`], ['Gutter', `${G.gutter} px`], ['Base unit', `${G.base} px`]];
    const meas = `<ol class="b-meas">${m.map(([a, v], i) => `<li><span class="b-n num">${cn(ctx, id, i + 4)}</span><p class="cap"><b>${a}</b><span class="num">${A(v)}</span></p></li>`).join('')}</ol>`;
    const rules = [`Set everything on ${G.columns} columns. Type and photographs start on a column edge.`, `Margins and gutters are multiples of ${G.base} px: ${G.margin} and ${G.gutter}.`, `The photograph takes five columns and the type takes six, with one column clear between them.`];
    const vdim = `<div class="b-vdim" style="height:${p(G.page.h)}px"><em class="num">${G.page.h}</em></div>`;
    return std(ctx, id, { lead: `Twelve columns on a ${G.page.w} by ${G.page.h} page. The drawing is at ${Math.round(k * 100)}% of full size.`, rules, work: `<div class="b-grid"><div class="b-gd"><div class="b-gd__l"><div class="b-dims" style="width:${p(G.page.w)}px">${dims}</div><div class="b-gd__r">${vdim}${drawing}</div>${spans}</div>${meas}</div></div>` });
  },

  layouts(ctx) {
    const B = ctx.brand, G = ctx.gridMeasures, k = 0.25, p = px(k), hl = scaleTok(ctx, 'headline'), D = B.ui.screen.content.deliveries, id = 'layouts';
    const colX = (i) => G.margin + i * (G.col + G.gutter), span = (n) => n * G.col + (n - 1) * G.gutter, H = G.page.h;
    const a = (x, y, w, h, st, inner = '') => `<div class="b-ab" style="left:${p(x)}px;top:${p(y)}px;width:${p(w)}px;height:${p(h)}px;${st}">${inner}</div>`;
    const bars = (x, y, w, n) => Array.from({ length: n }, (_, i) => a(x, y + i * 28, i === n - 1 ? w * 0.6 : w, 10, 'background:var(--hair)')).join('');
    const hd = (x, y, w, txt, size = hl.size, col = 'var(--ink)') => `<div class="disp b-ab b-th" style="left:${p(x)}px;top:${p(y)}px;width:${p(w)}px;font-size:${p(size)}px;line-height:${hl.line};font-weight:700;color:${col}">${txt}</div>`;
    const full = 'width:100%;height:100%';
    const T = (inner) => `<div class="b-thumb ph-tight" style="width:${p(G.page.w)}px;height:${p(H)}px">${inner}</div>`;
    const photoW = colX(8) - G.gutter / 2;
    const poster = T(`${a(0, 0, photoW, H, '', drawn(ctx, 'wheel'))}${a(photoW, 0, G.page.w - photoW, H, 'background:var(--buoy)')}${hd(colX(8), G.margin, span(4), (ctx.edition === 'slot' ? A(B.lines.primary) : A(B.lines.primary).replace('. ', '.<br>')), 70, 'var(--buoy-ink)')}<div class="b-ab" style="left:${p(colX(8))}px;top:${p(H - G.margin - 60)}px">${ctx.logo.html('horizontal', { colourway: 'on-buoy', width: Math.round(p(250)), label: 'Logo', color: 'var(--buoy-ink)' })}</div>`);
    const editorial = T(`${hd(colX(0), G.margin, span(5), A(B.type.sample.headline))}<p class="b-ab b-lt" style="left:${p(colX(0))}px;top:${p(270)}px;width:${p(span(4))}px;font-size:${p(17)}px">${A(B.type.sample.paragraph)}</p>${a(colX(6), G.margin, span(6), H - 2 * G.margin - 36, '', drawn(ctx, 'stockton'))}<p class="b-ab b-lt b-lt--q" style="left:${p(colX(6))}px;top:${p(H - G.margin - 18)}px;width:${p(span(6))}px;font-size:${p(12)}px">${A(B.type.sample.caption)}</p>`);
    const rows = D.slice(0, 5).map((d, i) => {
      const y = 250 + i * 90, hot = d.status === 'boarding', st = B.ui.status.find((x) => x.id === d.status)?.label || '';
      const ink = hot ? 'var(--buoy-ink)' : 'var(--dark-ink)', tx = (x, w, t, al = 'left') => `<p class="b-ab b-lt" style="left:${p(x)}px;top:${p(y + 30)}px;width:${p(w)}px;font-size:${p(24)}px;color:${ink};text-align:${al};font-weight:600">${A(t)}</p>`;
      const bar = (x, w) => a(x, y + 32, w, 20, `background:${ink}`);
      const cells = ctx.edition === 'slot' ? `${bar(colX(0), span(2))}${bar(colX(3), span(3))}${bar(colX(10), span(2))}` : `${hd(colX(0), y + 14, span(2), A(timeOf(d.when)), 48, ink)}${tx(colX(3), span(4), d.to)}${tx(colX(8), span(4), st, 'right')}`;
      return `${a(0, y, G.page.w, hot ? 80 : 2, hot ? 'background:var(--buoy)' : 'background:var(--dark-ink)')}${cells}`;
    }).join('');
    const timetable = T(`${a(0, 0, G.page.w, H, 'background:var(--dark)')}${hd(colX(0), G.margin, span(10), A(B.lines.primary), 70, 'var(--dark-ink)')}${rows}<div class="b-ab" style="left:${p(colX(0))}px;top:${p(H - G.margin - 50)}px">${ctx.logo.html('horizontal', { colourway: 'reversed', width: Math.round(p(250)), label: 'Logo', color: 'var(--dark-ink)' })}</div>`);
    // the slot edition's placeholders are longer than the copy and cannot be set at 25 %, so its reduced pieces carry the structure only:
    // the text and caption are left out and the panel's rows are bars; each headline keeps one compact placeholder
    const real = (h) => (ctx.edition === 'slot' ? h.replace(/<p class="b-ab b-lt[^"]*"[^>]*>[\s\S]*?<\/p>/g, '') : h);
    const spec = (rs) => `<ul class="b-lspec">${rs.map(([n, v]) => `<li><span>${n}</span><span class="num">${v}</span></li>`).join('')}</ul>`;
    const cells = [
      [poster, 'Timetable poster', 'The picture runs across 8 columns. The line and the logo take the other 4, on Buoy. The picture is drawn until photographs are shot.', [['Picture', 'Columns 1 to 8'], ['Line', 'Columns 9 to 12'], ['Logo', 'Columns 9 to 12']]],
      [real(editorial), 'Editorial page', 'The headline takes 5 columns, the text 4 and the picture 6. One column stays clear between them.', [['Headline', 'Columns 1 to 5'], ['Text', 'Columns 1 to 4'], ['Picture', 'Columns 7 to 12']]],
      [real(timetable), 'Wharf panel', 'A flat Hull panel. One row for each sailing, times down the left. The boarding row takes Buoy.', [['Line', 'Columns 1 to 10'], ['Time', 'Columns 1 to 2'], ['Boarding row', 'Buoy, full width']]],
    ].map(([t, n, c, s], i) => `<li class="b-lay"><span class="b-n num">${cn(ctx, id, i + 1)}</span>${t}<div class="b-lay__t"><p class="cap"><b>${n}</b>${A(c)}</p>${spec(s)}</div></li>`).join('');
    return std(ctx, id, { lead: `Three layouts cover most pieces. Each sits on the same 12 columns, drawn here at ${Math.round(k * 100)}% of full size.`, work: `<ol class="b-lays">${cells}</ol>` });
  },

  social(ctx) {
    const B = ctx.brand, k = 0.19, p = px(k), S = B.applications.social, full = 'width:100%;height:100%', id = 'social';
    const lg = (w, cw, color) => ctx.logo.html('horizontal', { colourway: cw, width: p(w), label: 'Logo', color });
    const post = (w, h, bg, inner) => `<div class="b-post ph-tight" style="width:${p(w)}px;height:${p(h)}px;background:${bg}">${inner}</div>`;
    const at = (x, y, w, st, inner) => `<div class="b-ab" style="left:${p(x)}px;top:${p(y)}px;${w ? `width:${p(w)}px;` : ''}${st}">${inner}</div>`;
    const hl = (x, y, w, size, color, txt) => at(x, y, w, `color:${color};font-size:${p(size)}px;line-height:0.95;font-weight:700`, `<span class="disp b-th">${A(txt)}</span>`);
    const square = post(1080, 1080, 'var(--buoy)', `${hl(96, 96, 880, 150, 'var(--buoy-ink)', S[0])}${at(96, 900, 0, '', lg(380, 'on-buoy', 'var(--buoy-ink)'))}`);
    const portrait = post(1080, 1350, 'var(--dark)', `${at(0, 0, 1080, `height:${p(860)}px`, wakePlan(ctx))}${hl(72, 920, 936, 96, 'var(--dark-ink)', S[1])}${at(72, 1236, 0, '', lg(330, 'reversed', 'var(--dark-ink)'))}`);
    const story = post(1080, 1920, 'var(--ground)', `${at(0, 0, 1080, `height:${p(1120)}px`, drawn(ctx, 'gangway'))}${hl(72, 1190, 936, 128, 'var(--ink)', S[2])}${at(72, 1590, 0, '', lg(300, 'colour', 'var(--ink)'))}`);
    // each format drawn with its width above and its height beside it, in px at full size
    const fig = (el, w, h, n, c, i) => `<li class="b-sfig"><div class="b-dh" style="width:${p(w)}px"><span class="b-dh__l num">${w} px</span></div><div class="b-sfig__r">${el}<div class="b-dv" style="height:${p(h)}px"><span class="b-dv__l num">${h} px</span></div></div><p class="cap"><b><span class="b-n num">${cn(ctx, id, i)}</span> ${n}</b>${A(c)}</p></li>`;
    return std(ctx, id, { lead: `Three formats for the platforms. Each carries one line and the horizontal logo, drawn here at ${Math.round(k * 100)}% of full size.`, work: `<ol class="b-socials">${fig(square, 1080, 1080, 'Square', '1080 × 1080 px. The line and the horizontal logo on Buoy.', 1)}${fig(portrait, 1080, 1350, 'Portrait', '1080 × 1350 px. A picture, then the line on Hull. Drawn here.', 2)}${fig(story, 1080, 1920, 'Story', '1080 × 1920 px. Keep type 250 px clear of the top and bottom.', 3)}</ol>` });
  },

  signage(ctx) {
    // the size is parsed from the real string; the line after it is a placeholder of its own in the slot edition
    const B = ctx.brand, [spec0, ...head0] = ctx.real(B.applications.signage).split(': '), mm = spec0.match(/(\d+) x (\d+) mm/), W = +mm[1], H = +mm[2], k = 0.54, id = 'signage';
    const head = head0.length ? ctx.ph('applications.signage.line', head0.join(': ')) : B.lines.primary, D = B.ui.screen.content.deliveries.slice(0, 4), st = (s) => B.ui.status.find((x) => x.id === s).label;
    const tg = (n, st2 = '') => `<i class="b-tg" style="${st2}">${cn(ctx, id, n)}</i>`;
    const rows = D.map((d, i) => {
      const hot = d.status === 'boarding', note = ctx.edition === 'slot' ? '' : ctx.real(d.when).split(', ')[1];
      return `<li class="b-sg__r${hot ? ' b-sg__r--hot' : ''}">${hot ? tg(3, 'left:-41px;top:50%;margin-top:-9px') : ''}<span class="disp b-sg__t" style="font-weight:700">${A(timeOf(d.when))}${i === 1 ? tg(4, 'left:-71px;top:50%;margin-top:-9px') : ''}</span><span class="b-sg__d">${A(d.to)}</span><span class="b-sg__s">${A(note && !hot ? `${st(d.status)}, ${note}` : st(d.status))}</span></li>`;
    }).join('');
    const sign = `<div class="b-sg ph-tight${ctx.edition === 'slot' ? ' b-sg--slot' : ''}" style="width:${W * k}px;height:${H * k}px"><h3 class="disp b-sg__h" style="font-weight:700">${A(head)}${tg(2, 'left:-73px;top:8px')}</h3><ul class="b-sg__rows">${rows}</ul><div class="b-sg__f">${ctx.logo.html('reversed', { width: 190, label: 'Logo', color: 'var(--dark-ink)' })}${tg(5, 'left:206px;top:50%;margin-top:-9px')}</div>${tg(1, 'right:10px;top:-9px')}</div>`;
    const dims = `<div class="b-sgd"><div class="b-dh" style="width:${W * k}px"><span class="b-dh__l num">${W} mm</span></div><div class="b-sgd__r">${sign}<div class="b-dv" style="height:${H * k}px"><span class="b-dv__l num">${H} mm</span></div></div></div>`;
    const lb = (t) => `<span class="b-lb">${t}.</span>`;
    const rules = [[`Panel`, `Hull, flat. ${W} × ${H} mm, drawn here at ${Math.round(k * 100)}% of full size`], ['Line', 'Set in Barlow Condensed 700, Deck on Hull'], ['Boarding row', 'The one Buoy on the sign. Text on it is Hull'], ['Times', 'To the minute, in tabular figures, so the column stays in line'], ['Logo', `Reversed horizontal, never under ${B.logo.showcase.minPrintMm} mm wide`]].map(([n, t]) => `${lb(n)} ${t}.`);
    return std(ctx, id, { lead: `The wharf departure sign is a flat Hull panel with the times set large. One row, the boarding one, is Buoy.`, rules, work: `<div class="b-signw">${dims}</div>` });
  },

  'email-signature'(ctx) {
    const B = ctx.brand, e = B.applications.email, g = B.guideB.email, c = B.applications.card, bd = scaleTok(ctx, 'body'), lb = scaleTok(ctx, 'label'), id = 'email-signature';
    const tg = (n) => `<i class="b-tg b-tg--r">${cn(ctx, id, n)}</i>`;
    const lines = g.body.map((t) => `<p>${A(t)}</p>`).join('');
    const sig = `<div class="b-sig"><div class="b-sig__logo"><div class="b-dh" style="width:190px"><span class="b-dh__l num">190 px</span></div>${ctx.logo.html('horizontal', { width: 190, label: 'Your logo goes here' })}${tg(1)}</div><p class="b-sig__n">${A(e.person)}${tg(2)}</p><p class="b-sig__r">${A(e.role)}</p><p class="b-sig__c">${A(c.contact)}<br>${A(B.applications.site.url)}</p><p class="b-sig__l">${A(B.lines.primary)}${tg(3)}</p></div>`;
    const mail = `<div class="b-mail"><div class="b-mail__h"><p><span>From</span>${A(e.person)}, ${A(c.contact)}</p><p><span>To</span>${A(g.to)}</p><p><span>Subject</span><b style="font-weight:600">${A(g.subject)}</b></p><p class="b-mail__t num">${A(g.time)}</p></div><div class="b-mail__b">${lines}${sig}</div></div>`;
    const rules = [`The ${A(ctx.logo.labels.horizontal.toLowerCase())} logo, 190 px wide. ${A(B.logo.when.horizontal)}`, `${A(B.fonts.body.family)}. The name is ${bd.size} px at weight 600. Role and contact are ${lb.size} px.`, `Live text, not a picture, so it still reads with images off. Use Arial where ${A(B.fonts.body.family)} is not installed.`];
    return std(ctx, id, { lead: `The signature as it renders in a mail client: the logo, a name, a role and a way to reach us.`, rules, work: `<div class="b-mailw">${mail}</div>` });
  },

  digital(ctx) {
    const B = ctx.brand, S = B.ui.screen.content, ui = ctx.ui, pct = Math.round(S.progress * 100), id = 'digital';
    const tg = (n, st2 = '') => `<i class="b-tg" style="${st2}">${cn(ctx, id, n)}</i>`;
    const track = `<div class="b-trk"><div class="b-trk__top">${ui.statusChip('boarding')}<span class="b-trk__t">${A(B.ui.screen.title)}</span></div><div class="b-trk__e"><h2 class="ui-display b-trk__eta">${A(S.eta)}</h2>${tg(1, 'right:0;top:6px')}</div><div class="ui-progress" role="progressbar" aria-label="Crossing progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><div class="ui-progress__bar"><i style="width:${pct}%"></i></div><span class="ui-progress__dot" style="left:${pct}%"></span></div><div class="b-trk__ft"><span>${A(S.from)}</span><span>${A(S.to)}</span></div><p class="b-trk__p">${A(S.pickup)}</p>
<div class="b-trk__rider"><span class="ui-avatar" aria-hidden="true">${A(S.initials)}</span><div><p class="b-trk__rn">${A(S.rider)}</p><p class="b-trk__rs">${A(S.riderNote)}</p></div>${ui.btn(S.call, { variant: 'secondary', size: 'sm', iconLeft: 'phone' })}</div>
<div class="b-trk__facts"><div><p class="b-trk__fl">${A(S.deliverToLabel)}</p><p class="b-trk__fv">${A(S.deliverTo)}</p></div><div><p class="b-trk__fl">${A(S.paidLabel)}</p><p class="b-trk__fv num">${A(S.paid)}</p></div><span class="b-tgw">${ui.btn(S.form.book, { iconRight: 'arrow-right' })}${tg(3, 'right:0;top:-24px')}</span></div></div>`;
    const list = `<aside class="b-dl"><h3 class="b-dl__h" style="font-weight:600">Later</h3><div class="b-dl__l">${ui.deliveryRows(3)}${tg(2, 'right:0;top:-26px')}</div></aside>`;
    const logo = ctx.edition === 'slot' ? `<strong class="ui-display">${A(B.name)}</strong>` : ctx.logo.html('horizontal', { width: fit(ctx, 'horizontal', 150, 26) });
    const bar = `<nav class="ui-topbar" aria-label="Main"><span class="b-bar__logo">${logo}</span><div class="ui-topbar__links">${ui.links(S.example.links, 0)}</div></nav>`;
    const win = `<div class="ui b-win"><div class="b-win__url"><span>${A(B.applications.site.url)}/next</span></div>${bar}<div class="b-win__body">${track}${list}</div></div>`;
    const rules = ['The next ferry comes first, with its time set largest.', 'The ferries after it sit in a column beside it.', 'One action on the screen, in Rope.'];
    return std(ctx, id, { lead: `The product on a desktop screen: the next ferry first, the ones after it beside it, and one action in Rope.`, rules, work: win });
  },

  summary(ctx) {
    const B = ctx.brand, G = B.guideB, f = B.fonts, [d, b] = [f.display, f.body], cols = ctx.colours.slice().sort((x, y) => y.share - x.share), id = 'summary';
    const light = [ctx.roles.light.surface, ctx.roles.light.raised].map((h) => h.toLowerCase());
    const top = cols[0].share;
    const ring = (c) => (light.includes(c.hex.toLowerCase()) ? ';box-shadow:inset 0 0 0 1px var(--hair)' : '');
    const table = cols.map((c) => `<li class="b-pr"><i class="b-scw" style="background:${c.hex}${ring(c)}"></i><p class="cap"><b>${A(c.name)}</b><span class="b-mono">${A(c.hex)}</span></p><span class="b-pr__bar"><i style="width:${(c.share / top * 100).toFixed(1)}%;background:${c.hex}${ring(c)}"></i></span><span class="b-pr__v num">${Math.round(c.share * 100)}%</span></li>`).join('');
    const rules = G.rules.map((r) => `<span class="b-lb">${A(r.title)}.</span> ${A(r.text)}`);
    const lines = [B.lines.primary, ...B.lines.others].map((l, i) => `<li class="${i ? 'b-ln' : 'b-ln b-ln--first'}">${A(l)}</li>`).join('');
    const sec = (n, name, inner) => `<section class="b-sec"><header class="b-sec__h"><span class="b-n num">${cn(ctx, id, n)}</span><b>${name}</b></header>${inner}</section>`;
    const work = `<div class="b-sum"><div class="b-sum__l">${sec(4, 'Mark', `<div class="b-sum__logo">${ctx.logo.html('colour', { width: 300, label: 'Your logo goes here' })}</div>`)}${sec(5, 'Lines', `<ul class="b-lines">${lines}</ul>`)}</div>
<div class="b-sum__r">${sec(6, 'Faces', `<div class="b-faces2"><p><span class="b-aa2 disp">Aa</span><span class="cap"><b>${A(d.family)}</b>Display, ${d.weights.join(', ')}</span></p><p><span class="b-aa2 b-aa2--body">Aa</span><span class="cap"><b>${A(b.family)}</b>Body, ${b.weights.join(', ')}</span></p></div>`)}${sec(7, 'Colour', `<ul class="b-prt">${table}</ul>`)}</div></div>`;
    return std(ctx, id, { lead: `The whole of ${A(B.name)} on one page: the mark, the lines, the faces, the colours and three rules to keep.`, rules, work });
  },

  'contact-scope'(ctx) {
    const B = ctx.brand, id = 'contact-scope';
    const secs = ctx.sections.map((s) => `<li><span class="num b-sn">${s.n}</span><span>${A(s.title)}</span><span class="num b-sp2">${s.pages[0].no}</span></li>`).join('');
    const rules = [['Logo files, palettes and fonts', 'They are in the brand kit.'], ['Interface components and tokens', 'They are in the UI kit.'], ['Print specifications, CMYK and Pantone values', 'Ask your printer for a proof.']].map(([a, c]) => `<span class="b-lb">${a}.</span> ${c}`);
    const work = `<div class="b-cs"><div class="b-cs__top"><div><h2 class="disp b-cs__h">Who to ask</h2><p class="b-cs__p">${A(B.contact.owner)} owns this document. Write to <span class="b-mono">${A(B.contact.email)}</span> for a logo file, a missing asset or an exception.</p></div>
<div><h3 class="h3 b-cs__v">Version history</h3><table class="b-vt"><tbody><tr><td class="num">${A(B.version.number)}</td><td>${A(ctx.date)}</td><td>First release.</td></tr></tbody></table></div></div>
<div class="b-cs__ix"><h3 class="h3">In this document</h3><ol class="b-in">${secs}</ol></div></div>`;
    return std(ctx, id, { lead: `Who to write to, what changed, and what this document leaves to other files.`, rules, work });
  },
};

export const guidelinesB = own;
