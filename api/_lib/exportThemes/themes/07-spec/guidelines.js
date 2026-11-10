// Guidelines pages for theme 07 (ids in engine/pages.js GUIDE_PAGES): cover, contents, logo-versions, contrast, business-card here;
// the other pages live in guidelines-a.js and guidelines-b.js and are merged below. Helpers are in helpers.js, styles (classes g-) in cssG in index.js.
import { A, mono, nameOf, fit, issued, head, std, title, kindOf, designation } from './helpers.js';
import { guidelinesA } from './guidelines-a.js';
import { guidelinesB } from './guidelines-b.js';

const nameOfHex = (ctx, hex) => ctx.colours.find((c) => c.hex.toLowerCase() === hex.toLowerCase())?.name || hex;
const levelOf = (n) => (n >= 7 ? 'AAA' : n >= 4.5 ? 'AA' : n >= 3 ? 'AA large' : 'Below 3 : 1');
const chipOf = (ctx, hex) => `<i class="g-ch${hex.toLowerCase() === ctx.roles.light.surface.toLowerCase() ? ' hairline' : ''}" style="background:${hex}"></i>`;
const FILE = { colour: 'full-colour' }; // the brand kit's own file names (engine/render.js LOGO_FILE)
// a table head from [label, width px, class] triples
const th = (cols) => `<thead><tr>${cols.map(([l, w, c]) => `<th${c ? ` class="${c}"` : ''}${w ? ` style="width:${w}px"` : ''}>${l}</th>`).join('')}</tr></thead>`;

const own = {
  // a document-control page: the designation, Figure 0.1, the title block, then the control table a standard opens with
  cover(ctx) {
    const B = ctx.brand, L = ctx.logo, g = L.geo, slot = ctx.edition === 'slot' || g.R === undefined, s = ctx.sections;  // a mark with no sun (a project's wordmark) is drawn as the slot is
    // Figure 0.1: the logo's horizon run on across the measure as the x-axis of one day, the sun's path a single curve back to the logo's sun.
    // The slot edition has no sun to meet: the slot's foot is the horizon and the day starts at its right edge, so the slot stays whole.
    const CW = 682, LW = 380, k = LW / g.width, LH = g.height * k, HC = 150; // measure, logo width, scale, logo height, crest height (px)
    const top = Math.max(0, Math.ceil(HC + 4 - LH)); // head room so the crest clears the top of the figure
    const y0 = top + (slot ? LH - 1.5 : (g.cap + g.lead + g.gap) * k); // the rule's top edge, where the sun sits; the slot's foot
    const x0 = slot ? LW : (g.width - g.R) * k, x1 = CW - 1, step = (x1 - x0) / 12; // 06:00 at the sun's centre (slot: its right edge), 18:00 at the measure's end
    const tickEnd = y0 + (slot ? 1.5 : g.T * k) + 7, at = (h) => x0 + (h - 6) * step, f1 = (n) => n.toFixed(1);
    const ticks = Array.from({ length: 13 }, (_, i) => `M${f1(at(6 + i))} ${f1(y0)}V${f1(i % 3 ? tickEnd - 3 : tickEnd)}`).join('');
    const arc = Array.from({ length: 61 }, (_, i) => `${i ? 'L' : 'M'}${f1(x0 + (x1 - x0) * i / 60)} ${f1(y0 - HC * Math.sin(Math.PI * i / 60))}`).join('');
    const SH = Math.ceil(tickEnd + 1), labels = [6, 9, 12, 15, 18].map((h) => `<li class="num" style="left:${f1(at(h))}px">${String(h).padStart(2, '0')}:00</li>`).join('');
    const svg = `<svg class="g-dsv" width="${CW}" height="${SH}" viewBox="0 0 ${CW} ${SH}" aria-hidden="true" focusable="false"><path d="M${f1(slot ? x0 : LW)} ${f1(y0 + 0.75)}H${CW}" stroke="var(--ink)" stroke-width="1.5" fill="none"/><path d="${ticks}" stroke="var(--ink)" stroke-width="1" fill="none"/><path d="${arc}" stroke="var(--accent)" stroke-width="3" fill="none" stroke-linejoin="round"/></svg>`;
    const figure = `<figure class="g-day"><div class="g-dw" style="height:${SH + 22}px"><div class="g-dl" style="top:${top}px">${L.html('colour', { width: LW, label: 'Your logo goes here' })}</div>${svg}<ul class="g-dt" style="top:${SH + 6}px">${labels}</ul></div><figcaption class="a-fc"><b class="num">Figure 0.1</b> ${slot ? 'The foot of the logo' : 'The horizon of the logo'}, run on as one day from 06:00 to 18:00. The sun rises at the logo and sets at the end of the line. The curve is drawn, not measured.</figcaption></figure>`;
    const rows = [
      ['Document', `${A(B.name)} brand guidelines`],
      ['Version', mono(B.version.number)],
      ['Issued', A(issued(ctx))],
      ['Owner', `${A(B.contact.owner)}, ${mono(B.contact.email)}`],
      ['Scope', `${s.length} sections and ${ctx.pages.length} pages, from §${s[0].n} ${A(s[0].title)} to §${s[s.length - 1].n} ${A(s[s.length - 1].title)}`],
      ['Read with', `${A(B.name)} UI kit ${mono(B.version.number)}`],
      ['Terms', 'In this document, shall is a requirement, should is a recommendation and may is a permission.'],
    ];
    return `<section class="pg pg--std pg--cover" data-page="cover">${head(ctx, 'cover')}
<div class="g-des"><p class="g-dsn">${designation(ctx)}</p><p class="g-dss">Issued ${A(issued(ctx))}</p></div>
${figure}
<h1 class="g-doc">Brand guidelines</h1>
<p class="g-line">${A(B.lines.primary)}</p>
<h2 class="a-h2 g-dch">Document control</h2>
<table class="st g-dc"><tbody>${rows.map(([k, v]) => `<tr><th scope="row">${k}</th><td>${v}</td></tr>`).join('')}</tbody></table>
<div class="notes"><p>Example project. The brand is made up to show this document.</p><p>Brand guidelines for ${A(B.name)}, ${A(B.city)}.</p></div>
</section>`;
  },

  // sections hang their number, kind and page range; the clauses sit under them. The revision history closes the page.
  contents(ctx) {
    const blocks = ctx.sections.map((s) => {
      const last = s.pages[s.pages.length - 1].no;
      const range = last === s.pages[0].no ? `${s.pages[0].no}` : `${s.pages[0].no} to ${last}`;
      return { n: s.pages.length + 1, html: `<div class="g-sec"><div class="g-sh"><span>§${s.n}</span><span>${A(s.title)} <span class="g-kd">(${kindOf(s.n)})</span></span><span class="num">${range}</span></div><ul>${s.pages.map((p) => `<li><span class="num">${p.ref}</span><span>${A(p.title)}</span><span class="num">${p.no}</span></li>`).join('')}</ul></div>` };
    });
    const total = blocks.reduce((a, b) => a + b.n, 0);
    let acc = 0; const left = [], right = [];
    for (const b of blocks) { (acc + b.n / 2 <= total / 2 ? left : right).push(b.html); acc += b.n; }
    const revs = `<h2 class="a-h2 g-rvh">Revision history</h2><table class="st g-rv">${th([['Version', 120], ['Issued', 180], ['Change', '']])}<tbody><tr><td>${mono(ctx.brand.version.number)}</td><td>${A(issued(ctx))}</td><td>First issue.</td></tr></tbody></table>`;
    const notes = `<div class="notes g-cn"><p>Values set in ${mono('mono')} are literal. Copy them as written. A normative section sets requirements; an informative one explains them.</p><p>A § number points to the section that sets the rule. Change a value there, never where it is quoted.</p></div>`;
    return std(ctx, 'contents', `<h1 class="t">Contents</h1><div class="g-toc"><div>${left.join('')}</div><div>${right.join('')}</div></div>${revs}${notes}`);
  },

  // a versions table with a small render per row, then one figure at actual size
  'logo-versions'(ctx) {
    const L = ctx.logo, B = ctx.brand, cw = B.logo.colourways, surface = ctx.roles.light.surface.toLowerCase(), ref = ctx.pages.find((p) => p.id === 'logo-versions').ref;
    const prim = L.geos.colour, m = L.minSize;
    // the brand sets one minimum, for full colour; the figure draws the other shapes with the name at that same size, unmarked
    const drawW = (id) => Math.ceil(m.screenPx * L.geos[id].w / prim.w);
    const ids = ['colour', 'stacked', 'mono-dark', 'mono-light', 'reversed', 'symbol', 'horizontal'];
    const box = { colour: [116, 52], stacked: [64, 56], 'mono-dark': [116, 52], 'mono-light': [116, 52], reversed: [116, 52], symbol: [48, 40], horizontal: [116, 52] };
    const rows = ids.map((id, i) => {
      const w = cw[L.colourwayOf(id)], file = `${ctx.slug}-${FILE[id] || id}.svg`;
      return `<tr><td class="a-no num">${ref}.${i + 1}</td><td><div class="g-rt${w.ground.toLowerCase() === surface ? ' hairline' : ''}" style="background:${w.ground}">${L.html(id, { width: fit(ctx, id, ...box[id]), colourway: L.colourwayOf(id), color: w.name, label: L.labels[id] })}</div></td><th scope="row" class="g-vn"><b>${A(L.labels[id])}</b><span class="m g-file">${A(file)}</span></th><td>${chipOf(ctx, w.ground)}${A(nameOfHex(ctx, w.ground))}</td><td class="a-def ph-tight">${A(B.logo.when[id])}</td></tr>`;
    }).join('');
    const table = `<table class="st g-lv">${th([['', 44], ['', 132], ['Version and file', 192], ['Ground', 72], ['Use', '']])}<tbody>${rows}</tbody></table>`;
    const figIds = ['colour', 'stacked', 'symbol', 'horizontal'];
    const tiles = figIds.map((id) => { const w = cw[L.colourwayOf(id)]; return `<div class="g-mt"><div class="g-ms hairline" style="background:${w.ground}">${L.html(id, { width: drawW(id), colourway: L.colourwayOf(id), color: w.name, label: L.labels[id] })}</div><span class="g-ml num">${ref}.${ids.indexOf(id) + 1}${id === 'colour' ? `, ${m.screenPx} px, minimum` : ''}</span></div>`; }).join('');
    const figure = `<figure class="a-fig g-fig"><div class="g-min">${tiles}</div><figcaption class="a-fc"><b class="num">Figure ${ref}.1</b> The four shapes drawn at actual size, the name the same size in each. Full colour is at its minimum screen width; mono dark, mono light and reversed share its shape and minimum.</figcaption></figure>`;
    return std(ctx, 'logo-versions', `${title(ctx, 'logo-versions', 'Seven versions, no more. Start with full colour, and reach for another only when the ground or the space asks for it.')}${table}${figure}`, { note: `The brand sets one minimum size, for full colour: ${m.screenPx} px or ${m.printMm} mm wide. Clear space and minimum size are in §${ctx.pages.find((p) => p.id === 'clear-space').ref} and §${ctx.pages.find((p) => p.id === 'min-size').ref}.` });
  },

  // the definitive conformance page: the pairs in use as numbered clauses, then every colour on every colour
  contrast(ctx) {
    const r = ctx.pages.find((p) => p.id === 'contrast').ref, surface = ctx.roles.light.surface.toLowerCase(), cs = ctx.colours;
    const t = ctx.roles.light.text, g = ctx.roles.light.surface;
    const inkOn = (hex) => (ctx.ratio(t, hex) >= ctx.ratio(g, hex) ? t : g);
    const rows = ctx.pairs.map((p, i) => `<tr><td class="a-no num">${r}.${i + 1}</td><td><span class="g-aa${p.large ? ' g-aa--big' : ''}${p.bgHex.toLowerCase() === surface ? ' hairline' : ''}" style="background:${p.bgHex};color:${p.fgHex}">Aa</span></td><td class="g-pr"><b>${A(nameOf(ctx, p.fg))} on ${A(nameOf(ctx, p.bg))}</b>${mono(p.fgHex)} ${mono(p.bgHex)}</td><td class="a-def">${A(p.use)}${p.large ? `, ${p.minSize} px and over` : ''}</td><td>${levelOf(p.ratio)}</td><td class="r">${ctx.fmt(p.ratio)}</td></tr>`).join('');
    const pairs = `<table class="st g-pt">${th([['', 52], ['', 56], ['Pair', 222], ['Use', ''], ['Level', 68], ['Ratio', 48, 'r']])}<tbody>${rows}</tbody></table>`;
    const used = new Set(ctx.pairs.map((p) => `${p.fgHex}|${p.bgHex}`.toLowerCase()));
    const cell = (f, b) => {
      if (f.hex === b.hex) return '<td class="g-x g-x--same" aria-label="Same colour"></td>';
      const n = ctx.ratio(f.hex, b.hex), u = used.has(`${f.hex}|${b.hex}`.toLowerCase());
      return `<td class="g-x${u ? ' is-used' : ''}"><b class="num">${ctx.fmt(n)} : 1</b><span>${u ? levelOf(n) : 'Not used'}</span></td>`;
    };
    const fill = (c) => `style="background:${c.hex};color:${inkOn(c.hex)}"`;
    const matrix = `<table class="st g-mx"><thead><tr><th scope="col" class="g-mxc">Text on ground</th>${cs.map((b) => `<th scope="col" class="g-ch2${b.hex.toLowerCase() === surface ? ' hairline' : ''}" ${fill(b)}>${A(b.name)}</th>`).join('')}</tr></thead><tbody>${cs.map((f) => `<tr><th scope="row" class="g-rh${f.hex.toLowerCase() === surface ? ' hairline' : ''}" ${fill(f)}>${A(f.name)}</th>${cs.map((b) => cell(f, b)).join('')}</tr>`).join('')}</tbody></table>`;
    const lede = `Every text pair ${A(ctx.brand.name)} uses, with its contrast ratio. Text shall have 4.5 : 1, and type 24 px and over may have 3 : 1. A pair below its mark shall not be used for text.`;
    const body = `${title(ctx, 'contrast', lede)}
<h2 class="a-h2">Pairs in use</h2>${pairs}
<h2 class="a-h2"><span class="num">${r}.${ctx.pairs.length + 1}</span> Conformance matrix</h2>${matrix}
<p class="a-key"><span class="a-keybox"></span>Outlined cells are the pairs ${A(ctx.brand.name)} uses. Every other cell is a pair that shall not be used for text. Rows are the text colour, columns the ground.</p>`;
    return std(ctx, 'contrast', body, { note: `Ratios are measured on the colours as printed in ${A(ctx.brand.name)}'s palette. Change a colour there, never here.` });
  },

  // two figures at 5 px to the millimetre, each beside the measurements it shows
  'business-card'(ctx) {
    const B = ctx.brand, L = ctx.logo, c = B.applications.card, cw = B.logo.colourways['on-sunbelt'], r = ctx.pages.find((p) => p.id === 'business-card').ref;
    const [mw, mh] = [90, 55]; // Australian standard card, mm
    const front = `<div class="card card--front" style="background:${cw.ground};color:${cw.name}"><div class="lg">${L.html('colour', { width: 270, colourway: 'on-sunbelt', color: cw.name, label: 'Your logo goes here' })}</div><span class="ln">${A(B.lines.primary)}</span></div>`;
    const back = `<div class="card card--back"><div class="mk">${L.html('symbol', { width: 64, label: 'Logo' })}</div><div class="who"><p class="nm">${A(c.person)}</p><p class="rl">${A(c.role)}</p><p class="ct">${A(c.contact)}<br>${A(B.applications.site.url)}</p></div></div>`;
    const dims = `<div class="dh"></div><span class="dn" style="left:205px;top:-38px;background:var(--ground);padding:0 6px">${mw} mm</span><div class="dv"></div><span class="dn" style="left:-58px;top:130px">${mh} mm</span>`;
    const reqs = (from, head, items) => `<div class="g-rq"><h2 class="a-h3">${head}</h2><table class="st g-rt2"><tbody>${items.map(([k, v], i) => `<tr><th scope="row"><span class="num">${r}.${from + i}</span> ${k}</th><td>${v}</td></tr>`).join('')}</tbody></table></div>`;
    const fig = (no, card, cap, withDims, side) => `<div class="g-cd"><figure class="g-cf"><div class="cdw">${withDims ? dims : ''}${card}</div><figcaption class="a-fc"><b class="num">Figure ${r}.${no}</b> ${cap}</figcaption></figure>${side}</div>`;
    const sz = `${mw} × ${mh} mm`;
    const side1 = reqs(1, 'Front', [['Size', sz], ['Ground', A(nameOfHex(ctx, cw.ground))], ['Logo', `${270 / 5} mm wide`], ['Margin', `${34 / 5} mm from the left`]]);
    const side2 = reqs(5, 'Back', [['Size', sz], ['Ground', A(nameOfHex(ctx, ctx.roles.light.surface))], ['Symbol', `${64 / 5} mm wide, ${30 / 5} mm from the top and right`], ['Margin', `${34 / 5} mm from the left, ${30 / 5} mm from the foot`]]);
    const body = `${title(ctx, 'business-card', `Front and back at actual proportion, ${mw} × ${mh} mm, drawn at 5 px to the millimetre.`)}<div class="g-cds">${fig(1, front, `Front. The logo on ${A(nameOfHex(ctx, cw.ground))}, and the line.`, true, side1)}${fig(2, back, 'Back. Name, role and contact, with the symbol.', false, side2)}</div>`;
    return std(ctx, 'business-card', body, { note: `The dimension lines are ${A(ctx.colours.find((c) => c.role === 'text').name)}, as on every drawing in this document.` });
  },
};

export const guidelines = { ...guidelinesA, ...guidelinesB, ...own };
