// Guidelines pages for theme 06, run B: typefaces, hierarchy, type-in-use, type-rules, photo-direction, shot-list, imagery-rules,
// grid, layouts, social, signage, email-signature, digital, summary, contact-scope. Styles are in css-b.js (classes start b-).
// Studio pages are a design-system book: Steel panels holding the brand's real surfaces, hairline-ruled spec rows, drawn dimension marks,
// and the Toolbox cut (the diagonal the logo is sawn at) used once on a page, to cross out the wrong way. Anything drawn at a real size
// (a post, a sign, a page) is authored in its own units and shown with a transform scale, so its type keeps the size it has in use.
import { A, std, fit } from './helpers.js';
import { cssNum } from '../../engine/escape.js';

const px = (n) => +n.toFixed(2);
const tok = (ctx, t) => ctx.brand.type.scale.find((s) => s.token === t);
const sentence = (s) => s.split(/(?<=\.)\s/)[0];
const full = 'width:100%;height:100%';
// a hex mixed toward another by t (0 keeps a, 1 gives b): used for the one wrong colour on type-rules
const mix = (ctx, a, b, t) => { const [x, y] = [ctx.C.hexToRgb(a), ctx.C.hexToRgb(b)]; return ctx.C.rgbToHex(x.map((v, i) => v * (1 - t) + y[i] * t)); };
// vertical metrics of a face, in em, from the font file: where the baseline, cap line and x-height sit inside a line box of line-height 1
const metrics = (ctx, role, weight) => {
  const f = ctx.faces.find((x) => x.role === role && x.weight === weight && x.style !== 'italic') || ctx.faces.find((x) => x.role === role);
  const font = ctx.loadFont(f.stem), u = font.unitsPerEm, h = font.tables.hhea, o = font.tables.os2;
  const asc = h.ascender / u, desc = -h.descender / u, base = (1 - (asc + desc)) / 2 + asc;
  return { base, cap: o.sCapHeight / u, xh: o.sxHeight / u };
};
const scaled = (k, w, h, inner, cls = '', st = '') => `<div class="b-sc ${cls}" style="width:${px(w * k)}px;height:${px(h * k)}px"><div class="b-sc__in" style="width:${w}px;height:${h}px;transform:scale(${k});${st}">${inner}</div></div>`;
const ab = (x, y, w, h, st = '', inner = '', cls = '') => `<div class="b-ab ${cls}" style="left:${px(x)}px;top:${px(y)}px;${w ? `width:${px(w)}px;` : ''}${h ? `height:${px(h)}px;` : ''}${st}">${inner}</div>`;
// a numbered callout: the drawn mark that ties a thing on a panel to its note (nb in a row, pin on a drawing)
const nb = (n, cls = '') => `<i class="b-nb ${cls}">${n}</i>`;
const pin = (x, y, n, st = '') => `<i class="b-nb b-nb--ab" style="left:${px(x)}px;top:${px(y)}px;${st}">${n}</i>`;
const cap2 = (b, t) => `<p class="cap"><b>${b}</b>${t}</p>`;
// the cut: the logo's own diagonal, drawn across a wrong example
const strike = '<svg class="b-strike" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><line x1="-4" y1="104" x2="104" y2="-4" vector-effect="non-scaling-stroke"/></svg>';

const own = {
  typefaces(ctx) {
    const F = ctx.brand.fonts, d = F.display, b = F.body, m = F.mono, sc = ctx.brand.type.scale;
    const toks = (face) => sc.filter((s) => s.face === face).map((s) => s.token).join(', ');
    const S = 84, pad = 12;
    // the specimen "Aa" with its baseline, cap line and x-height drawn across the panel
    const spec = (role, weight, cls, fam) => {
      const k = metrics(ctx, role, weight), y = (v) => px(pad + v * S);
      const line = (v, c, t, n) => `<div class="b-gl ${c}" style="top:${y(v)}px"><span>${t}${nb(n, 'b-nb--s')}</span></div>`;
      return `<div class="b-fp__spec" style="height:${S + 2 * pad}px">${line(k.base - k.cap, '', `Cap height, ${k.cap.toFixed(2)} em`, 1)}${line(k.base - k.xh, 'b-gl--dash', `x-height, ${k.xh.toFixed(2)} em`, 2)}${line(k.base, 'b-gl--base', 'Baseline', 3)}<p class="b-fp__aa ${cls}" style="top:${pad}px;font-size:${S}px;${cls ? '' : `font-family:var(--body);font-weight:${weight}`}" aria-hidden="true">Aa</p></div>`;
    };
    const glyph = (cls, st) => ['ABCDEFGHIJKLM', 'NOPQRSTUVWXYZ', 'abcdefghijklm', 'nopqrstuvwxyz', '0123456789'].map((r) => `<span class="${cls}" style="${st}">${r}</span>`).join('');
    const p1 = `<section class="b-panel b-fp">${spec('display', cssNum(d.weights[d.weights.length - 1]), 'disp')}<div class="b-fp__row"><div class="b-fp__id"><h2 class="disp b-fp__n">${A(d.family)}</h2><p class="b-fp__d">Display, weights ${d.weights.join(' and ')}. Sets ${A(toks('display'))}, and the wordmark. 18 px and larger, never small.</p></div><p class="b-fp__gl disp">${glyph('', '')}</p></div></section>`;
    const bw = [[ctx.weights.regular, 'Regular', sentence(ctx.brand.type.sample.paragraph)], [ctx.weights.medium, 'Medium', ctx.brand.ui.screen.content.form.book], [ctx.weights.strong, 'Semibold', ctx.brand.ui.screen.content.toast]];
    const ws = bw.map(([w, n, t]) => `<li><span class="b-ws__w num">${w}, ${n}</span><span class="b-ws__t" style="font-weight:${w}">${A(t)}</span></li>`).join('');
    const p2 = `<section class="b-panel b-fp">${spec('body', ctx.weights.regular, '', b.family)}<div class="b-fp__row"><div class="b-fp__id"><h2 class="b-fp__n b-fp__n--body">${A(b.family)}</h2><p class="b-fp__d">Body, weights ${b.weights.join(', ')}. Sets ${A(toks('body'))}. Weight ${ctx.weights.strong} is for badges, avatars and toast buttons.</p></div><ul class="b-ws">${ws}</ul></div></section>`;
    const mono = `<section class="b-panel b-fm"><div><h2 class="b-fp__n b-fp__n--body">${A(m.family)}</h2><p class="b-fp__d b-fp__d--w">Weight ${m.weights.join(', ')}. A hex, a token or a code string, and nothing else.</p></div><p class="b-fm__s"><span class="b-mono">${A(ctx.roles.light.action)}</span><span class="b-mono">--action</span><span class="b-mono">--sp-4</span></p></section>`;
    const lic = `All three faces are open source under the SIL Open Font Licence, and free to download from Google Fonts.`;
    return std(ctx, 'typefaces', `${p1}${p2}${mono}<p class="cap b-lic">${lic}</p>`, { lead: `Two faces do the work. ${d.family} sets what you read first, and the figures. ${b.family} carries everything after it.` });
  },

  hierarchy(ctx) {
    const T = ctx.brand.type, c = ctx.brand.ui.screen.content, d = ctx.brand.fonts.display;
    const lines = ctx.brand.lines.primary.split(/(?<=\.)\s/);
    const samples = { display: lines, headline: [c.paid], title: [c.form.title], subtitle: [c.deliveries[1].to], body: [sentence(T.sample.paragraph)], label: [c.deliveries[1].when], caption: [T.sample.caption] };
    const rows = T.scale.map((t, i) => {
      const disp = t.face === 'display';
      const st = `font-size:${t.size}px;line-height:${t.line};${disp ? '' : `font-family:var(--body);font-weight:${t.weight};`}`;
      const text = samples[t.token].map((s) => A(s)).join('<br>');
      const n = samples[t.token].length, lb = `${n > 1 ? `${n} x ` : ''}${+(t.size * t.line).toFixed(1)} px`;
      return `<li class="b-hr"><p class="b-ht">${nb(i + 1)}<b>${A(ctx.cap(t.token))}</b><span class="num">${t.size} px, line ${t.line}, weight ${t.weight}</span><span>${A(t.use)}</span></p><div class="b-hw"><p class="b-hs ${disp ? 'disp' : ''}" style="${st}">${text}</p><i class="b-dm b-dm--v b-vd" aria-hidden="true"><span class="num">${lb}</span></i></div></li>`;
    }).join('');
    const body = tok(ctx, 'body'), cap = tok(ctx, 'caption');
    return std(ctx, 'hierarchy', `<section class="b-panel b-hp"><ul class="b-hrs">${rows}</ul></section>`, { lead: `${['Zero','One','Two','Three','Four','Five','Six','Seven','Eight','Nine'][T.scale.length]} steps, each with one job. The white block behind each line is its line box, measured at its side: the size times the line height. Reading text is ${body.size} px and the smallest is ${cap.size} px.` });
  },

  'type-in-use'(ctx) {
    const T = ctx.brand.type, h = tok(ctx, 'headline'), bd = tok(ctx, 'body'), lb = tok(ctx, 'label'), cp = tok(ctx, 'caption'), ti = tok(ctx, 'title');
    const c = ctx.brand.ui.screen.content, d = ctx.brand.fonts.display;
    const items = [['Item', 'Qty', 'Amount'], ['Replace hot water unit', '1', '$1,080.00'], ['Labour, $95 an hour', '2', '$190.00'], ['Callout', '1', '$50.00']];
    const li = items.map((r, i) => `<li class="b-li ${i ? '' : 'b-li--h'}"><span>${A(r[0])}</span><span class="num">${A(r[1])}</span><span class="num">${A(r[2])}</span></li>`).join('');
    const fam = (t) => ctx.brand.fonts[t.face].family;
    const rows = [
      [`<h2 class="disp b-u__h" style="font-size:${h.size}px;line-height:${h.line}">${T.sample.headline.split(/(?<=\.)\s/).map((x) => A(x)).join('<br>')}</h2>`, 'Headline', `${fam(h)} ${h.weight}, ${h.size} px`, 22],
      [`<p class="b-u__p" style="font-size:${bd.size}px;line-height:${bd.line}">${A(T.sample.paragraph)}</p>`, 'Paragraph', `${fam(bd)} ${bd.weight}, ${bd.size} px`, 2],
      [`<ul class="b-lis" style="font-size:${lb.size}px;line-height:${lb.line};font-weight:${lb.weight}">${li}</ul>`, 'Figures', `${fam(lb)} ${lb.weight}, ${lb.size} px, tabular figures`, 6],
      [`<p class="disp b-u__t" style="font-size:${ti.size}px;line-height:${ti.line}">${A(c.paid)}</p>`, 'Total', `${fam(ti)} ${ti.weight}, ${ti.size} px`, 6],
      [`<p class="b-u__c" style="font-size:${cp.size}px;line-height:${cp.line}">${A(T.sample.caption)}</p>`, 'Caption', `${fam(cp)} ${cp.weight}, ${cp.size} px, Quiet Ink`, 0],
    ];
    const grid = rows.map(([el, n, spec, off], i) => `<div class="b-tu__s">${el}</div><p class="b-tu__a" style="--lt:${off}px;padding-top:${off}px"><b>${nb(i + 1)}${n}</b>${A(spec)}</p>`).join('');
    return std(ctx, 'type-in-use', `<section class="b-panel b-tu">${grid}</section>`, { lead: `A quote as Dan Pearce opens it, set the way ${ctx.brand.name} sets type: a headline, a paragraph, figures, a total and a caption, each marked with what it is.` });
  },

  'type-rules'(ctx) {
    const R = ctx.brand.type.rules, c = ctx.brand.ui.screen.content, L = ctx.roles.light, ui = ctx.ui;
    const q = ctx.pairs.find((p) => p.fg === 'quiet' && p.bgHex.toLowerCase() === L.surface.toLowerCase());
    const faded = mix(ctx, L.text, L.surface, 0.62), fr = ctx.ratio(faded, L.surface);
    const amt = c.deliveries[1].price;
    const t = (inner) => `<div class="b-demo ui">${inner}</div>`, tn = (inner) => `<div class="b-demo ui">${inner}${strike}</div>`;
    const dis = (s, txt) => `<span class="disp" style="font-size:${s}px;line-height:1.2">${A(txt)}</span>`;
    const demos = [
      [t(dis(28, amt)), tn(dis(12, amt))],
      [t('<span class="b-fig" style="font-variant-numeric:tabular-nums">$1,111.00<br>$9,999.00</span>'), tn('<span class="b-fig" style="font-variant-numeric:proportional-nums">$1,111.00<br>$9,999.00</span>')],
      [t(ui.btn(c.form.book)), tn(ui.btn(c.form.book.toUpperCase()))],
      [t(`<span class="b-sw" style="background:${L.quiet}"></span><span class="b-fig2">Quiet Ink, <span class="num">${ctx.fmt(q.ratio)} : 1</span> on White</span>`), tn(`<span class="b-sw" style="background:${faded}"></span><span class="b-fig2">Ink faded, <span class="num">${ctx.fmt(fr)} : 1</span> on White</span>`)],
      [t(`<span class="b-mono b-mono--l">${A(L.action)}</span>`), tn(`<span class="b-mono b-mono--l">${A(amt)}</span>`)],
    ];
    const names = ['Display size', 'Figures', 'Case', 'Secondary text', 'Mono'];
    const ic = (n) => ui.icon(n, 16);
    const rows = R.map((r, i) => `<li class="b-panel b-tr"><p class="b-tr__n">${nb(i + 1)}${names[i] || ''}</p><div class="b-tr__c">${demos[i][0]}<p class="b-ic">${ic('check')}<span>${A(r.do)}</span></p></div><div class="b-tr__c">${demos[i][1]}<p class="b-ic b-ic--no">${ic('x')}<span>${A(r.dont)}</span></p></div></li>`).join('');
    return std(ctx, 'type-rules', `<div class="b-trh"><span></span><h3 class="h3">Do</h3><h3 class="h3">Don't</h3></div><ul class="b-trs">${rows}</ul>`, { lead: `${R.length} rules for setting type. Each says what to do, and what never happens. The cut marks the wrong way.` });
  },

  'photo-direction'(ctx) {
    const D = ctx.brand.imagery.direction;
    const rows = [['Subject', D.subject], ['Light', D.light], ['Crop', D.crop], ['Colour', D.colour], ['People', D.people]];
    const thirds = '<i class="b-th b-th--v" style="left:33.333%"></i><i class="b-th b-th--v" style="left:66.667%"></i><i class="b-th b-th--h" style="top:33.333%"></i><i class="b-th b-th--h" style="top:66.667%"></i>';
    // five pins on the frame, one for each choice in the key
    const at = [[66.667, 66.667], [83, 15], [50, 50], [90, 60], [50, 84]];
    const pins = at.map(([x, y], i) => `<i class="b-nb b-nb--ab b-nb--l" style="left:${x}%;top:${y}%">${i + 1}</i>`).join('');
    const photo = `<figure class="b-panel b-pp"><div class="b-pd">${ctx.photo('ladder', { cls: 'b-fill', pos: '50% 40%' })}${thirds}${pins}<span class="b-pd__tag">Sky, or room for a line, in the top third</span></div><figcaption class="cap" style="margin-top:12px"><b>Thirds</b>Wide enough to see the job. The work sits on the lower lines, and the top third stays open.</figcaption></figure>`;
    const list = rows.map(([n, t], i) => `<li class="b-pr"><h3 class="h3">${nb(i + 1)}${n}</h3><p>${A(t)}</p></li>`).join('');
    return std(ctx, 'photo-direction', `${photo}<ul class="b-prs">${list}</ul>`, { lead: `Photography shows the job as it happens, on site, in daylight. Five choices set every picture.` });
  },

  'shot-list'(ctx) {
    const S = ctx.brand.imagery.shots;
    // a contact sheet read like a project panel: one row a shot, the frame drawn with its viewfinder marks, the note beside it
    const fig = (s, i) => `<li class="b-shr"><div class="cap"><b>${nb(String(i + 1).padStart(2, '0'), 'b-nb--w')}${A(ctx.cap(s.id))}</b>${A(s.slot.split(/:\s/)[0])}</div><div class="b-shr__f"><i class="b-vf b-vf--a"></i><i class="b-vf b-vf--b"></i><i class="b-vf b-vf--c"></i><i class="b-vf b-vf--d"></i>${ctx.photo(s.id, { cls: 'b-fill b-shr__p' })}</div></li>`;
    return std(ctx, 'shot-list', `<ul class="b-panel b-shs">${S.map(fig).join('')}</ul>`, { lead: `Six shots cover the brand. Each slot says what to shoot, how to crop it and which light to wait for.` });
  },

  'imagery-rules'(ctx) {
    const G = ctx.brand.imagery, R = G.rules, B = ctx.brand, ic = (n) => ctx.ui.icon(n, 16);
    const L = ctx.logo, line = B.lines.primary.split(/(?<=\.)\s/)[0], cw = B.logo.colourways, rev = cw.reversed;
    const slotT = (txt, st = '') => `<div class="photo-slot b-fill b-tile" role="img" aria-label="${A('Photo slot. ' + txt)}" style="${st}"><span>${A(txt)}</span></div>`;
    // a busy ground of loose strokes in the brand's own colours, laid at fixed angles
    let seed = 11; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const cols = ctx.colours.map((c) => c.hex);
    const strokes = Array.from({ length: 40 }, (_, i) => `<rect x="${(rnd() * 330 - 10).toFixed(0)}" y="${(rnd() * 120 - 20).toFixed(0)}" width="${(6 + rnd() * 10).toFixed(0)}" height="${(40 + rnd() * 60).toFixed(0)}" fill="${cols[i % cols.length]}" transform="rotate(${(rnd() * 180).toFixed(0)} 165 60)"/>`).join('');
    const busy = `<svg class="b-bg" viewBox="0 0 330 120" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${strokes}</svg>`;
    const lw = fit(ctx, 'colour', 120, 44);
    const demos = [
      [ctx.photo('undersink', { cls: 'b-fill b-tile' }), slotT(B.guideB.studioSlot)],
      [ctx.photo('ute', { cls: 'b-fill b-tile' }), `<div class="b-wrap">${ctx.photo('ladder', { cls: 'b-fill b-tile' })}<i class="b-wash" aria-hidden="true"></i></div>`],
      [`<div class="b-wrap">${ctx.photo('ladder', { cls: 'b-fill b-tile' })}<span class="b-line disp">${A(line)}</span></div>`, `<div class="b-wrap">${slotT('A face, cropped to fill the frame.')}<span class="b-line b-line--mid disp">${A(line)}</span></div>`],
      [`<div class="b-wrap b-logo" style="background:${rev.ground}">${L.html('colour', { width: lw, colourway: 'reversed', color: rev.name, label: 'Logo' })}</div>`, `<div class="b-wrap">${busy}<span class="b-onbusy">${L.html('colour', { width: lw, color: cw.colour.name, label: 'Logo' })}</span></div>`],
    ];
    // four numbered panels in two columns, each with the right way above the wrong way
    const rows = R.map((r, i) => `<li class="b-panel b-ir"><div class="b-ir__c"><div class="b-tilebox">${demos[i][0]}<span class="b-tag">Do</span></div><p class="b-ic">${ic('check')}<span>${A(r.do)}</span></p></div><div class="b-ir__c"><div class="b-tilebox">${demos[i][1]}${strike}<span class="b-tag b-tag--no">Don't</span></div><p class="b-ic b-ic--no">${ic('x')}<span>${A(r.dont)}</span></p></div>${nb(i + 1, 'b-nb--ab b-nb--c')}</li>`).join('');
    return std(ctx, 'imagery-rules', `<ul class="b-irs">${rows}</ul>`, { lead: `${['Zero', 'One', 'Two', 'Three', 'Four', 'Five'][R.length]} rules for pictures. The cut marks the wrong way.` });
  },

  grid(ctx) {
    const g = ctx.gridMeasures, k = 0.55, m = g.margin, pw = px(g.page.w * k), ph = px(g.page.h * k);
    const x = (i) => m + i * (g.col + g.gutter), span = (n) => n * g.col + (n - 1) * g.gutter;
    const bands = Array.from({ length: g.columns }, (_, i) => ab(x(i) * k, m * k, g.col * k, ph - 2 * m * k, 'background:var(--panel)')).join('');
    const nums = Array.from({ length: g.columns }, (_, i) => ab(x(i) * k, -20, g.col * k, 14, 'text-align:center', `<span class="b-gn num">${i + 1}</span>`)).join('');
    // blocks laid on the columns: a title across 9, a picture across 12, three text columns of 4
    const blk = (c, n, y, h, bg) => ab(x(c) * k, y * k, span(n) * k, h * k, `background:${bg}`);
    const lines = [0, 1, 2].flatMap((c) => [0, 1, 2, 3].map((r) => blk(c * 4, 4, 700 + r * 24, 8, 'var(--quiet)')));
    const faux = blk(0, 9, m, 56, 'var(--ink)') + blk(0, 12, m + 96, 440, 'var(--line)') + blk(0, 5, m + 568, 12, 'var(--ink)') + lines.join('');
    const guides = [ab(m * k, 0, 1, ph, 'background:var(--accent)'), ab((g.page.w - m) * k - 1, 0, 1, ph, 'background:var(--accent)'), ab(0, m * k, pw, 1, 'background:var(--accent)'), ab(0, (g.page.h - m) * k - 1, pw, 1, 'background:var(--accent)')].join('');
    const dm = (st, label, cls) => ab(0, 0, 0, 0, st, `<span>${label}</span>`, `b-dm ${cls}`);
    const dims = dm(`left:0;top:${px(ph * 0.5)}px;width:${px(m * k)}px;height:0`, m, 'b-dm--h') + dm(`left:${px(pw - m * k)}px;top:${px(ph * 0.5)}px;width:${px(m * k)}px;height:0`, m, 'b-dm--h') + dm(`left:${px(pw / 2)}px;top:0;width:0;height:${px(m * k)}px`, m, 'b-dm--v') + dm(`left:${px(pw / 2)}px;top:${px(ph - m * k)}px;width:0;height:${px(m * k)}px`, m, 'b-dm--v');
    // pins 1 to 6 sit on the drawing where each measure is taken, in the order of the key beside it
    const pins = pin(pw - m * k / 2, ph - m * k / 2, 1) + pin(m * k / 2, ph * 0.22, 2) + pin(pw + 14, -13, 3) + pin((x(4) + g.col / 2) * k, ph * 0.8, 4) + pin((x(3) + g.col + g.gutter / 2) * k, ph * 0.9, 5) + pin(x(1) * k, 700 * k + 14, 6);
    const page = `<div class="b-gr" style="width:${pw}px;height:${ph}px">${bands}${faux}${guides}${dims}${nums}${pins}</div>`;
    const cw = g.page.w - 2 * m;
    const ms = [['Page', `${g.page.w} x ${g.page.h} px`, 'A4, 210 x 297 mm'], ['Margin', `${m} px`, 'On all four sides'], ['Columns', String(g.columns), `${cw} px of content`], ['Column', `${px(g.col)} px`, 'Every column the same'], ['Gutter', `${g.gutter} px`, 'Between columns'], ['Base unit', `${g.base} px`, 'Everything snaps to it']];
    const list = ms.map(([n, v, d], i) => `<li><span>${nb(i + 1)}${n}</span><b class="num">${A(v)}</b><i>${A(d)}</i></li>`).join('');
    const key = `<ul class="b-gk"><li><i class="b-gk__s" style="background:var(--panel);box-shadow:inset 0 0 0 1px var(--line)"></i>Column</li><li><i class="b-gk__s" style="background:var(--accent);height:2px"></i>Margin</li></ul>`;
    return std(ctx, 'grid', `<div class="b-grid"><section class="b-panel b-gp">${page}</section><div class="b-gm"><ul class="b-ms">${list}</ul>${key}</div></div>`, { lead: `${g.columns} columns of ${px(g.col)} px with a ${g.gutter} px gutter, inside a ${m} px margin. Type and pictures start and end on a column.` });
  },

  layouts(ctx) {
    const B = ctx.brand, c = B.ui.screen.content, g = ctx.gridMeasures, m = g.margin, W = g.page.w, H = g.page.h, L = ctx.logo, cw = B.logo.colourways, rev = cw.reversed;
    const x = (i) => m + i * (g.col + g.gutter), span = (n) => n * g.col + (n - 1) * g.gutter;
    const lw = 150, lines = B.lines.primary.split(/(?<=\.)\s/);
    const items = [['Item', 'Qty', 'Amount'], ['Replace hot water unit', '1', '$1,080.00'], ['Labour, $95 an hour', '2', '$190.00'], ['Callout', '1', '$50.00']];
    const li = items.map((r, i) => `<li class="b-li ${i ? '' : 'b-li--h'}"><span>${A(r[0])}</span><span class="num">${A(r[1])}</span><span class="num">${A(r[2])}</span></li>`).join('');
    const logo = (id, o) => L.html(id, { label: 'Logo', ...o });
    const quote = `${ab(m, m, lw, 0, '', logo('colour', { width: lw, color: cw.colour.name }))}${ab(x(6), m + 6, span(6), 20, 'text-align:right;font-size:15px;line-height:20px;color:var(--quiet)', `<span class="num">${A(B.guideB.email.subject.split(' for ')[0])}</span>`)}
${ab(m, 168, span(9), 0, '', `<p class="disp" style="font-size:52px;line-height:1.1">${A(c.form.dropoffValue)}</p>`)}
${ab(m, 288, span(4), 0, '', `<p class="b-lb">${A(c.deliverToLabel)}</p><p class="b-lv">${A(c.deliverTo)}</p>`)}${ab(x(6), 288, span(6), 0, '', `<p class="b-lb">${A(c.eta)}</p><p class="b-lv">${A(c.riderNote)}</p>`)}
${ab(m, 408, W - 2 * m, 0, '', `<ul class="b-lis" style="font-size:17px;line-height:1.4">${li}</ul>`)}
${ab(x(6), 620, span(6), 140, 'background:var(--panel);border-radius:var(--rk)', `<div class="b-tt"><span class="b-lb">${A(c.paidLabel)}</span><span class="disp" style="font-size:46px;line-height:1.1">${A(c.paid)}</span></div>`)}
${ab(m, 640, span(5), 0, '', `<div class="ui">${ctx.ui.btn('Accept quote')}</div>`)}
${ab(m, H - m - 20, W - 2 * m, 20, 'border-top:1px solid var(--hair);padding-top:12px;font-size:13px;color:var(--quiet)', A(B.contact.email))}`;
    const photo = `${ab(m, m, W - 2 * m, 640, 'border-radius:12px;overflow:hidden', ctx.photo('ladder', { cls: 'b-fill', style: 'font-size:28px;padding:36px;line-height:1.4' }))}
${ab(m, 760, W - 2 * m, 0, '', `<p class="disp" style="font-size:68px;line-height:1.1">${lines.map((l) => A(l)).join('<br>')}</p>`)}${ab(m, H - m - 44, lw * 1.2, 0, '', logo('colour', { width: lw * 1.2, color: cw.colour.name }))}`;
    const od = c.deliveries[2], pd = c.paid;
    const paid = `${ab(m, m, lw, 0, '', logo('colour', { width: lw, colourway: 'reversed', color: rev.name }))}
${ab(m, 360, W - 2 * m, 0, '', `<p class="b-lb b-lb--on">${A(c.deliveries[3].to)}</p><p class="disp" style="font-size:120px;line-height:1.05;color:var(--dark-ink)">${A(c.deliveries[3].price)}</p>`)}
${ab(m, 640, span(8), 0, '', `<p class="disp" style="font-size:56px;line-height:1.15;color:var(--dark-ink)">${A(B.applications.social[2].split(/(?<=\.)\s/)[0])}</p>`)}`;
    const big = scaled(420 / W, W, H, quote, 'b-sheet', 'background:var(--ground)');
    const s1 = scaled(198 / W, W, H, photo, 'b-sheet', 'background:var(--ground)'), s2 = scaled(198 / W, W, H, paid, 'b-sheet', `background:${rev.ground}`);
    const f = (sheet, t, d, n) => `<figure class="b-lf"><div class="b-lf__s">${sheet}${nb(n, 'b-nb--ab b-nb--c')}</div><figcaption class="cap"><b>${nb(n)}${t}</b>${d}</figcaption></figure>`;
    return std(ctx, 'layouts', `<section class="b-panel b-ly">${f(big, 'Quote', 'A white page. The headline spans eight columns, the total six.', 1)}<div class="b-ly__r">${f(s1, 'Photo and line', 'A picture across all twelve, then one line.', 2)}${f(s2, 'Receipt', 'Ink ground, the amount as the picture.', 3)}</div></section>`, { lead: `Three pages from the one grid. Each starts at the margin, and each leaves room around the one thing it is about.` });
  },

  social(ctx) {
    const B = ctx.brand, c = B.ui.screen.content, S = B.applications.social, cw = B.logo.colourways, rev = cw.reversed, sw = cw['on-steel'], L = ctx.logo;
    const k = 198 / 1080, lw = 260;
    const lg = (id, o) => L.html(id, { label: 'Logo', ...o });
    const line = S[0].split(/(?<=\.)\s/);
    const [paidW, ...paidRest] = S[2].split(/(?<=\.)\s/), [, amt, from] = paidRest.join(' ').match(/^(\S+)\s+(.*)$/);
    const square = `${ab(72, 72, lw, 0, '', lg('colour', { width: lw, colourway: 'reversed', color: rev.name }))}${ab(72, 460, 936, 0, '', `<p class="disp" style="font-size:132px;line-height:1.05;color:var(--dark-ink)">${line.map((l) => A(l)).join('<br>')}</p>`)}`;
    const portrait = `${ab(0, 0, 1080, 880, '', ctx.photo('ute', { cls: 'b-fill', style: 'font-size:36px;padding:56px;line-height:1.4;border-radius:0' }))}${ab(72, 940, 936, 0, '', `<p class="disp" style="font-size:112px;line-height:1.05">${A(S[1])}</p>`)}${ab(72, 1350 - 72 - 64, lw, 0, '', lg('colour', { width: lw, color: cw.colour.name }))}`;
    const story = `${ab(72, 250, lw, 0, '', lg('colour', { width: lw, colourway: 'on-steel', color: sw.name }))}
${ab(72, 560, 936, 0, 'background:var(--ground);border-radius:56px;padding:72px 72px 80px', `<p style="font-family:var(--body);font-size:44px;line-height:1.3;color:var(--quiet)">${A(paidW.replace(/\.$/, ''))}</p><p class="disp" style="font-size:112px;line-height:1.1;margin-top:24px">${A(amt)}</p><p style="font-family:var(--body);font-size:56px;line-height:1.3;margin-top:16px;color:var(--soft)">${A(from.replace(/\.$/, ''))}</p>`)}${ab(72, 1920 - 340 - 72, 936, 0, '', `<p class="disp" style="font-size:96px;line-height:1.05">${A(B.lines.others[0])}</p>`)}`;
    const grounds = [['Square', 1080, 1080, rev.ground, square, 'Feed. One line, the logo reversed on Ink.'], ['Portrait', 1080, 1350, 'var(--ground)', portrait, 'Feed, tall. The picture above, one line below.'], ['Story', 1080, 1920, sw.ground, story, 'Stories. The top 250 px and bottom 340 px stay clear.']];
    // each post is dimensioned across the top; the three rules are keyed to the marks drawn on the first post (the line, the logo, the Toolbox wedge)
    const sq = (x, y, n) => pin(x * k, 22 + y * k, n);
    const marks = `${sq(0, 640, 1)}${sq(0, 110, 2)}${sq(380, 110, 3)}`;
    const figs = grounds.map(([n, w, h, bg, inner, d], i) => `<figure class="b-sf"><div class="b-sf__d"><i class="b-dm b-dm--h b-hd" aria-hidden="true"><span class="num">${w} px</span></i>${scaled(k, w, h, inner, 'b-sheet', `background:${bg}`)}${i ? '' : marks}</div><figcaption class="cap"><b>${n}</b><span class="num">${w} x ${h} px</span>${A(d)}</figcaption></figure>`).join('');
    const rules = [['One line a post', 'Never two ideas. The line is one of the brand lines, as written.'], ['Logo once', `At ${lw} px wide on a 1080 px post, never below the ${B.logo.showcase.minScreenPx} px minimum.`], ['Toolbox from the logo', 'The wedge in the logo is the Toolbox on the post. Nothing else is painted red.']];
    const rl = rules.map(([t, d], i) => `<li class="b-pr"><h3 class="h3">${nb(i + 1)}${t}</h3><p>${A(d)}</p></li>`).join('');
    return std(ctx, 'social', `<section class="b-panel b-so">${figs}</section><ul class="b-prs">${rl}</ul>`, { lead: `Three shapes, one voice. Each post carries one line and the logo, drawn here at ${Math.round(k * 100)} per cent of its size.` });
  },

  signage(ctx) {
    const B = ctx.brand, ap = B.applications, rev = B.logo.colourways.reversed, L = ctx.logo, G = L.geos.horizontal;
    const W = 1200, H = 500, k = 0.46, pad = 60, lw = 320, lh = (lw * G.h) / G.w;
    const lines = B.lines.primary.split(/(?<=\.)\s/), url = ap.site.url;
    const sign = `${ab(pad, pad, W - 2 * pad, H - 2 * pad, 'border:3px dashed var(--quiet)')}${ab(pad + 24, pad + 20, 0, 0, '', `<p class="disp" style="font-size:112px;line-height:1.12;color:var(--dark-ink)">${lines.map((l) => A(l)).join('<br>')}</p>`)}${ab(pad + 24, H - pad - 20 - lh, lw, lh, '', L.html('horizontal', { width: lw, colourway: 'reversed', color: rev.name, label: 'Logo' }))}${ab(W - pad - 24 - 400, H - pad - 20 - 44, 400, 44, 'text-align:right;font-size:44px;line-height:44px;color:var(--dark-ink)', A(url))}`;
    const sw = px(W * k), sh = px(H * k);
    const dm = (st, label, cls) => ab(0, 0, 0, 0, st, `<span>${label}</span>`, `b-dm ${cls}`);
    // pins 1 to 6 follow the rows below: the size marks, the line, the logo, the dashed margin, the Ink ground, the address
    const pins = pin(sw / 2 + 44, 12, 1) + pin(pad * k / 2, 36 + 130 * k, 2) + pin(pad * k / 2, 36 + (H - pad - 20 - lh / 2) * k, 3) + pin(sw / 2, 36 + pad * k / 2, 4) + pin(sw / 3, 36 + sh - pad * k / 2, 5) + pin(sw - pad * k / 2, 36 + (H - pad - 42) * k, 6);
    const draw = `<div class="b-sg" style="width:${sw + 64}px;height:${sh + 36}px">${ab(0, 36, 0, 0, '', scaled(k, W, H, sign, 'b-sheet', `background:${rev.ground}`))}${dm(`left:0;top:12px;width:${sw}px`, `${W} mm`, 'b-dm--h')}${dm(`left:${sw + 16}px;top:36px;height:${sh}px`, `${H} mm`, 'b-dm--v')}${pins}</div>`;
    const rows = [['Size', `${W} x ${H} mm, one door.`], ['Lines', `The brand line, on two lines, in the display face at 112 mm.`], ['Logo', `Horizontal, reversed, ${lw} mm wide. The smallest it prints is ${B.logo.showcase.minPrintMm} mm.`], ['Margin', `${pad} mm on every side, shown dashed. Nothing sits inside it.`], ['Colour', 'Ink ground, White type. The wedge in the logo is the only Toolbox.'], ['Address', `${url}, set right in the body face, in White.`]];
    const list = rows.map(([n, t], i) => `<li class="b-pr"><h3 class="h3">${nb(i + 1)}${n}</h3><p>${A(t)}</p></li>`).join('');
    return std(ctx, 'signage', `<figure><section class="b-panel b-sgp">${draw}</section><figcaption class="cap" style="margin-top:12px"><b>Ute door sign</b>Drawn at ${k} px to the millimetre.</figcaption></figure><ul class="b-prs">${list}</ul>`, { lead: `The sign on the ute door says the brand line and where to find it. Nothing else.` });
  },

  'email-signature'(ctx) {
    const B = ctx.brand, ap = B.applications, E = B.guideB.email, c = ap.card, L = ctx.logo, G = L.geos.horizontal, cw = B.logo.colourways.colour;
    const lw = 120, lh = px((lw * G.h) / G.w), nameY = lh + 12;
    // the signature in absolute units, so the 2x drawing can carry marks at exact places
    const sig = (marks) => `<div class="b-sig" style="width:240px;height:${nameY + 100}px"><div class="b-ab" style="left:0;top:16px;right:0;bottom:0"><span class="b-ab" style="left:0;top:0;width:${lw}px;height:${lh}px">${L.html('horizontal', { width: lw, color: cw.name, label: 'Logo' })}</span><p class="b-ab b-sig__n" style="left:0;top:${nameY}px">${A(ap.email.person)}</p><p class="b-ab b-sig__r" style="left:0;top:${nameY + 20}px">${A(ap.email.role)}</p><p class="b-ab b-sig__c" style="left:0;top:${nameY + 40}px">${A(c.contact)}<br>${A(ap.site.url)}</p>${marks || ''}</div></div>`;
    const body = E.body.map((p) => `<p>${A(p)}</p>`).join('');
    const win = `<div class="b-mw"><dl class="b-mw__h"><div><dt>From</dt><dd>${A(ap.email.person)}, ${A(B.name)}</dd></div><div><dt>To</dt><dd>${A(E.to)}</dd></div><div><dt>Subject</dt><dd><b>${A(E.subject)}</b></dd></div></dl><div class="b-mw__b">${body}<div class="b-mw__s">${sig('')}</div></div></div>`;
    const dm = (st, label, cls) => ab(0, 0, 0, 0, st, `<span>${label}</span>`, `b-dm ${cls}`);
    const marks = dm(`left:0;top:-8px;width:${lw}px`, `${lw} px`, 'b-dm--h') + dm(`left:${lw + 12}px;top:${lh}px;height:12px`, '12', 'b-dm--v') + pin(204, lh / 2, 1) + pin(204, nameY + 10, 2) + pin(204, nameY + 30, 3) + pin(204, nameY + 50, 4);
    const zoom = `<div class="b-z2">${scaled(1.5, 240, nameY + 100, sig(marks), '', '')}</div>`;
    const rows = [['Logo', `Horizontal, ${lw} px wide, in colour on White.`], ['Name', 'The name, body Semibold, 14 px.'], ['Role', `Soft Ink, 13 px, the role as written: ${ap.email.role}.`], ['Contact', 'Quiet Ink, 13 px. The mail address, then the site.']];
    const list = rows.map(([n, t], i) => `<li><h3 class="h3">${nb(i + 1)}${n}</h3><p>${A(t)}</p></li>`).join('');
    return std(ctx, 'email-signature', `<section class="b-panel b-mp">${win}</section><div class="b-mz"><figure>${zoom}<figcaption class="cap" style="margin-top:12px"><b>The signature at one and a half times the size</b>Marked in pixels.</figcaption></figure><ul class="b-ms2">${list}</ul></div>`, { lead: `A quote goes out from a person, and the signature says who. It reads the same in every mail client.` });
  },

  digital(ctx) {
    const B = ctx.brand, c = B.ui.screen.content, ui = ctx.ui, L = ctx.logo, cw = B.logo.colourways.colour, url = B.applications.site.url;
    const prog = `<div class="b-pg"><span class="b-pg__l">${A(c.from)}</span><div class="b-pg__t" role="img" aria-label="${A(`${c.from} to ${c.to}: ${Math.round(c.progress * 100)} per cent`)}"><i style="width:${Math.round(c.progress * 100)}%"></i></div><span class="b-pg__l">${A(c.to)}</span></div>`;
    const win = `<div class="b-bw ui"><div class="b-bw__bar"><span class="b-bw__url">${A(url)}/quotes</span></div><div class="b-bw__nav">${L.html('horizontal', { width: 96, color: cw.name, label: 'Logo' })}${ui.tabs(['Quotes', 'Invoices', 'Clients'], 0)}</div><div class="b-bw__main">${ui.crumbs(['Quotes', c.deliverTo])}<div class="b-bw__top"><div><h2 class="disp">${A(c.form.dropoffValue)}</h2><p>${A(c.riderNote)}</p></div>${ui.statusChip('sent')}</div>${prog}<div class="b-bw__list">${ui.deliveryRows(5)}${nb(2, 'b-nb--ab b-nb--e')}</div><div class="b-bw__act">${ui.btn(c.empty.cta, { iconLeft: 'plus' })}${nb(1)}</div>${nb(3, 'b-nb--ab b-nb--t')}</div></div>`;
    const notes = [['One Toolbox a screen', `${c.empty.cta} is the one filled button.`], ['Dollars and days', 'Every row has the amount and the day.'], ['Cards on Steel', 'White cards on Steel, with hairlines.']];
    const nl = notes.map(([t, d], i) => `<li><h3 class="h3">${nb(i + 1)}${t}</h3><p>${A(d)}</p></li>`).join('');
    return std(ctx, 'digital', `<section class="b-panel b-dp">${win}</section><ul class="b-rl">${nl}</ul>`, { lead: `The quote screen on the web, built from the UI kit. The amount and the day are the first things you see.` });
  },

  summary(ctx) {
    const B = ctx.brand, L = ctx.logo, sw = B.logo.colourways['on-steel'] || B.logo.colourways.colour, F = B.fonts, lines = B.lines.primary.split(/(?<=\.)\s/);
    const g = fit(ctx, 'colour', 230, 80);
    const top = `<section class="b-panel b-su"><div class="b-su__l">${L.html('colour', { width: g, colourway: 'on-steel', color: sw.name, label: 'Your logo goes here' })}</div><div class="b-su__t"><p class="disp">${lines.map((l) => A(l)).join('<br>')}</p><p class="b-su__o">${B.lines.others.map((l) => A(l)).join(' ')}</p></div></section>`;
    const light = ctx.roles.light.surface.toLowerCase();
    // each colour is dimensioned by its share of the page; the faces are rows of a type inspector; the rules are keyed 1 to 3
    const segs = ctx.colours.map((c) => `<li style="flex:${c.share} 1 0"><i class="b-dm b-dm--h b-sd" aria-hidden="true"><span class="num">${Math.round(c.share * 100)}%</span></i><i class="b-sg2" style="background:${c.hex};${c.hex.toLowerCase() === light ? 'box-shadow:inset 0 0 0 1px var(--line)' : ''}"></i><b>${A(c.name)}</b><span class="b-mono">${A(c.hex)}</span></li>`).join('');
    const strip = `<section class="b-panel b-sp"><h3 class="h3 b-sh">Colour, by share of a page</h3><ul class="b-st">${segs}</ul></section>`;
    const face = (fam, cls, st, role) => `<li><span class="b-fa ${cls}" style="${st}" aria-hidden="true">Aa</span><b>${A(fam)}</b><span>${A(role)}</span></li>`;
    const faces = `<section class="b-panel b-sp"><h3 class="h3 b-sh">Faces</h3><ul class="b-fs">${face(F.display.family, 'disp', '', 'Display: headlines and figures')}${face(F.body.family, '', `font-family:var(--body);font-weight:${ctx.weights.regular}`, 'Body: everything you read')}${face(F.mono.family, '', `font-family:var(--bmono)`, 'Mono: a hex or a token')}</ul></section>`;
    const rules = B.guideB.rules.map((r, i) => `<li>${nb(i + 1)}<h3 class="h3">${A(r.title)}</h3><p>${A(r.text)}</p></li>`).join('');
    return std(ctx, 'summary', `${top}${strip}${faces}<div><h3 class="h3 b-sh">Three rules</h3><ol class="b-rs">${rules}</ol></div>`, { lead: `The logo, the lines, the colours, the faces and three rules to keep.`, cls: 'b-pgsum' });
  },

  'contact-scope'(ctx) {
    const B = ctx.brand, V = B.version;
    const secs = ctx.sections.map((s) => `<li><span class="num">${s.n}</span><span>${A(s.title)}</span><span class="num">${s.pages[0].no}${s.pages.length > 1 ? `–${s.pages.at(-1).no}` : ''}</span></li>`).join('');
    const not = [['Logo files, palettes and fonts', 'They are in the brand kit.'], ['Interface components and tokens', 'They are in the UI kit.'], ['Print specifications, CMYK and Pantone values', 'Ask your printer for a proof.']].map(([a, c], i) => `<li><b>${nb(i + 1)}${a}</b>${c}</li>`).join('');
    const contact = `<section class="b-panel b-cn"><h3 class="h3">Who to ask</h3><p class="disp b-cn__o">${A(B.contact.owner)}</p><p class="b-cn__t">Write for a logo file, a missing asset or an exception.</p><p class="b-mono b-mono--l">${A(B.contact.email)}</p></section>`;
    const ver = `<section class="b-panel b-vp"><h3 class="h3 b-sh">Version history</h3><ul class="b-vh"><li><span class="num">${A(V.number)}</span><span>${A(ctx.date)}</span><span>First release.</span></li></ul></section>`;
    return std(ctx, 'contact-scope', `<div class="b-ct">${contact}${ver}</div><section class="b-panel b-cs2"><div><h3 class="h3 b-sh">In this document</h3><ol class="b-in">${secs}</ol></div><div><h3 class="h3 b-sh">Not in this document</h3><ul class="b-not">${not}</ul></div></section>`, { lead: `Who owns this document, what has changed in it, and what it leaves to other files.` });
  },

  //@@NEXT
};

export const guidelinesB = own;
