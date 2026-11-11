// Guidelines pages for theme 04 (ids in engine/pages.js GUIDE_PAGES): cover, contents, logo-versions, contrast, business-card here;
// the rest live in guidelines-a.js and guidelines-b.js (wave 2). Helpers are in helpers.js; styles for these five pages are the g- block in index.js.
// The manual's one unit: x, 4 px on screen. The cover, the card and the versions sheet are drawn in it, so a length printed in x is the same x everywhere.
import { A, ratioText, nameOf, std } from './helpers.js';
import { guidelinesA } from './guidelines-a.js';
import { guidelinesB } from './guidelines-b.js';

const r1 = (n) => +(Math.round(n * 10) / 10).toString();
const f2 = (n) => +n.toFixed(2);
const xb = (ctx) => ctx.brand.ui.spacingBase;
// x as printed in the manual: "14x", "3.25x"
const fx = (px, b) => `${f2(px / b)}x`;
// a dimension line with an end tick at each end, drawn horizontally or vertically, label centred on it
const dh = (y, x1, x2, text, { dy = -6, anchor = 'middle', tx } = {}) => `<path d="M${f2(x1)} ${y}H${f2(x2)}M${f2(x1)} ${y - 4}V${y + 4}M${f2(x2)} ${y - 4}V${y + 4}"/>${text ? `<text x="${f2(tx ?? (x1 + x2) / 2)}" y="${y + dy}" text-anchor="${anchor}">${A(text)}</text>` : ''}`;
const dv = (x, y1, y2, text, { dx = 8, anchor = 'start' } = {}) => `<path d="M${x} ${f2(y1)}V${f2(y2)}M${x - 4} ${f2(y1)}H${x + 4}M${x - 4} ${f2(y2)}H${x + 4}"/>${text ? `<text x="${x + dx}" y="${f2((y1 + y2) / 2 + 4)}" text-anchor="${anchor}">${A(text)}</text>` : ''}`;

const own = {
  // the cover: the logo at 160x wide on the page's own margins, dimensioned in x, and a ruler in x along the foot
  cover(ctx) {
    const B = ctx.brand, L = ctx.logo, g = L.geos.colour, slot = ctx.edition === 'slot', cw = B.logo.colourways['on-buoy'], b = xb(ctx), m = B.layout.margin;
    const secs = ctx.sections.map((s) => `<li><span>${s.n}</span>${A(s.title)}</li>`).join('');
    const LW = 640, LH = Math.round((LW * g.h) / g.w), top = 40, W = ctx.size.w, right = W - 2 * m;
    const logo = L.html('colour', { width: LW, colourway: 'on-buoy', color: cw.name, label: 'Your logo goes here' });
    // dimensions, in the group's own coordinates: x = 0 is the page edge, the logo starts at the margin
    const dims = `${dh(20, 0, m, fx(m, b), { tx: m / 2 })}${dh(20, m, m + LW, `${fx(LW, b)}, ${LW} px`)}${dv(m + LW + 28, top, top + LH, fx(LH, b))}`;
    let tick = '', num = '';
    for (let k = 0; k * b <= right; k++) { const X = k * b, big = k % 16 === 0, mid = k % 4 === 0; tick += `M${X} 0v${big ? 12 : mid ? 8 : 4}`; if (big && k) num += `<text x="${X}" y="26" text-anchor="middle">${k}</text>`; }
    const ruler = `<svg class="g-ruler" width="${right}" height="30" viewBox="-1 0 ${right + 2} 30" aria-hidden="true"><path d="${tick}"/><path d="M0 0H${right}"/>${num}<text x="${right}" y="26" text-anchor="end">x</text></svg>`;
    const tabs = `<ol class="g-tabs" aria-label="Sections">${ctx.sections.map((s) => `<li>${s.n}</li>`).join('')}</ol>`;
    return `<section class="pg pg--cover g-cv" data-page="cover" style="position:relative">${tabs}<div class="cv-top"><div><h1>Graphic standards manual</h1><p>Brand guidelines for ${A(B.name)}, river ferry, ${A(B.city)}. ${A(ctx.versionLine)}.</p></div><ul class="sec">${secs}</ul></div>
<div class="g-cvm" style="height:${top + LH + 4}px"><svg class="g-cvd" width="${W}" height="${top + LH + 4}" viewBox="0 0 ${W} ${top + LH + 4}" aria-hidden="true">${dims}</svg><div class="g-cvl" style="left:0;top:${top}px">${logo}</div><p class="g-cvn">Every size in this manual is given in x,<br>the stroke of the wake.</p></div>${ruler}</section>`;
  },

  // the manual's index: two columns, each section a ruled head, each page under it as a clause with its folio on a leader
  contents(ctx) {
    const sec = (s) => `<li class="g-ix"><h2 class="g-ixh"><span class="num">${s.n}</span><span>${A(s.title)}</span><span class="num">${s.pages[0].no}</span></h2><ol>${s.pages.map((p) => `<li><span class="num">${p.ref}</span><span class="g-ixt">${A(p.title)}</span><i aria-hidden="true"></i><span class="num">${p.no}</span></li>`).join('')}</ol></li>`;
    const rows = (a) => a.map(sec).join('');
    const rowsOf = (s) => s.pages.length + 2;
    // split where the two columns come out nearest equal
    let k = 1, best = 1e9;
    for (let i = 1; i < ctx.sections.length; i++) { const l = ctx.sections.slice(0, i).reduce((n, s) => n + rowsOf(s), 0), r = ctx.sections.slice(i).reduce((n, s) => n + rowsOf(s), 0); if (Math.abs(l - r) < best) { best = Math.abs(l - r); k = i; } }
    return std(ctx, 'contents', { lead: `${ctx.sections.length === 9 ? 'Nine' : ctx.sections.length} sections. Every size in this manual is given in x, the stroke of the wake.`, rules: ['A number such as 3.2.1 reads section 3, page 2, clause 1. The number at the right is the folio.'], work: `<div class="g-ixs"><ol>${rows(ctx.sections.slice(0, k))}</ol><ol>${rows(ctx.sections.slice(k))}</ol></div>` });
  },

  // the construction sheet for the versions: every version drawn at one scale, x = 4 px, on a grid of x with a heavier line every 6x
  'logo-versions'(ctx) {
    const L = ctx.logo, cw = ctx.brand.logo.colourways, b = xb(ctx), surface = ctx.roles.light.surface.toLowerCase(), ref = ctx.pages.find((x) => x.id === 'logo-versions').ref;
    const ux = L.geo.x || L.geo.cap / 10, cell = 6 * b, COLS = 30, ROWS = 25, SW = COLS * cell, SH = ROWS * cell, id = 'gvg';
    // [version, column, row, columns, rows] on the 6x grid
    const plan = [['colour', 0, 0, 15, 6], ['mono-dark', 15, 0, 15, 6], ['mono-light', 0, 6, 15, 6], ['reversed', 15, 6, 15, 6], ['horizontal', 0, 12, 30, 6], ['stacked', 0, 18, 8, 7], ['symbol', 8, 18, 6, 7]];
    const tile = ([vid, c, r, cs, rs], i) => {
      const w = cw[L.colourwayOf(vid)], g = L.geos[vid], lw = Math.floor((g.w / ux) * b), lh = (g.h / ux) * b, W = cs * cell, H = rs * cell;
      const lx = Math.round((W - lw) / 2 / b) * b, ly = Math.round((H - lh) / 2 / b) * b, dy = ly + Math.round(lh) + 22;
      const dim = `${r1(g.w / ux)}x by ${r1(g.h / ux)}x`;
      return `<div class="g-vt ${w.ground.toLowerCase() === surface ? 'hairline' : ''}" style="left:${c * cell}px;top:${r * cell}px;width:${W}px;height:${H}px;background:${w.ground};color:${w.name};--g:${w.ground}"><span class="g-tg num">${ref}.${i + 1}</span><div class="g-vl" style="left:${lx}px;top:${ly}px">${L.html(vid, { width: lw, color: w.name, label: L.labels[vid] })}</div><svg class="g-vd" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true">${dh(dy, lx, lx + lw, dim, { dy: -7 })}</svg></div>`;
    };
    const grid = `<svg class="g-vg" width="${SW}" height="${SH}" viewBox="0 0 ${SW} ${SH}" aria-hidden="true"><defs><pattern id="${id}a" width="${b}" height="${b}" patternUnits="userSpaceOnUse"><path d="M${b} 0V${b}M0 ${b}H${b}" fill="none"/></pattern><pattern id="${id}b" width="${cell}" height="${cell}" patternUnits="userSpaceOnUse"><path d="M${cell} 0V${cell}M0 ${cell}H${cell}" fill="none"/></pattern></defs><rect width="${SW}" height="${SH}" fill="url(#${id}a)" class="m1"/><rect width="${SW}" height="${SH}" fill="url(#${id}b)" class="m6"/></svg>`;
    // ruler above the sheet: a number at every 6x
    let num = '';
    for (let k = 2; k * cell < SW; k += 2) num += `<text x="${k * cell}" y="12" text-anchor="middle">${k * 6}</text>`;
    const ruler = `<svg class="g-vr" width="${SW}" height="18" viewBox="0 0 ${SW} 18" aria-hidden="true">${num}</svg>`;
    const rules = plan.map(([vid]) => `<span style="font-weight:600;color:var(--ink)">${A(L.labels[vid])}.</span> ${A(ctx.brand.logo.when[vid])}`);
    const key = `<div class="g-vk" style="left:${14 * cell}px;top:${18 * cell}px;width:${16 * cell}px;height:${7 * cell}px"><p><b>One square is x, ${b} px.</b> The heavier line is every 6x, one repeat of the wake.</p><p>Every version is drawn at this one scale, so the widths compare. Each length is printed in x.</p></div>`;
    return std(ctx, 'logo-versions', { lead: 'Seven versions, no more. Start with full colour and reach for another only when the ground or the space asks for it.', rules, work: `<div class="g-vs">${ruler}<div class="g-sheet" style="width:${SW}px;height:${SH}px">${grid}${plan.map(tile).join('')}${key}</div></div>` });
  },

  // a clause per pair: the pair set as a sample at the smallest size it is used at, the size given in x
  contrast(ctx) {
    const B = ctx.brand, b = xb(ctx), surface = ctx.roles.light.surface.toLowerCase(), S = B.type.sample, ref = ctx.pages.find((x) => x.id === 'contrast').ref;
    const floor = Math.min(...B.type.scale.map((s) => s.size));
    const rules = ['Text under 24 px needs 4.5 : 1.', 'Type at 24 px and over needs 3 : 1.', 'A pair below its mark is not used for text.'];
    const row = (p, i) => {
      const min = p.large ? 24 : floor, hair = p.bgHex.toLowerCase() === surface;
      return `<li class="g-cr"><span class="num g-cn">${ref}.${rules.length + i + 1}</span><p class="g-cs ph-tight ${hair ? 'hairline' : ''} ${p.large ? 'disp' : ''}" style="background:${p.bgHex};color:${p.fgHex};font-size:${min}px">${A(p.large ? S.headline : S.caption)}</p><div class="g-ci"><span class="g-cr1 num">${ratioText(p.ratioText)}</span><span class="g-cu">${A(p.use)}</span><span class="cap">${A(nameOf(ctx, p.fg))} on ${A(nameOf(ctx, p.bg))}. ${p.large ? `Large type only, ${min} px, ${fx(min, b)}` : `Smallest size, ${min} px, ${fx(min, b)}`}.</span></div></li>`;
    };
    const nu = ctx.unusedPairs.map((p) => `<li class="g-nu"><span class="g-nsw" style="background:${p.bgHex}"><i style="background:${p.fgHex}"></i></span><span class="cap"><b>${A(nameOf(ctx, p.fg))} on ${A(nameOf(ctx, p.bg))}</b>${ratioText(p.ratioText)}, not used</span></li>`).join('');
    return std(ctx, 'contrast', { lead: `Every text pair ${A(B.name)} uses, with its contrast ratio.`, rules, work: `<ol class="g-crs">${ctx.pairs.map(row).join('')}</ol><h3 class="h3 g-nh">Not used</h3><ul class="g-nus">${nu}</ul>` });
  },

  // front and back at 5 px to the millimetre, which makes x (4 px) 0.8 mm: the logo is drawn 62x wide, so its own x is the manual's x
  'business-card'(ctx) {
    const B = ctx.brand, L = ctx.logo, c = B.applications.card, rev = B.logo.colourways.reversed, b = xb(ctx), CW = 450, CH = 275, T = 26, ux = L.geo.x || L.geo.cap / 10;
    const lw = Math.round((L.geos.reversed.w / ux) * b), lh = (L.geos.reversed.h / ux) * b, sw = Math.round((L.geos.symbol.w / ux) * b), sh = (L.geos.symbol.h / ux) * b;
    const ly = (CH - lh) / 2, z = 4 * b;
    const frontMarks = `<g>${`<rect class="g-z" x="${40 - z}" y="${f2(ly - z)}" width="${lw + 2 * z}" height="${f2(lh + 2 * z)}"/>`}<text x="${40 + lw + z / 2}" y="${f2(ly + lh / 2 + 4)}" text-anchor="middle">${fx(z, b)}</text>${dh(205, 40, 40 + lw, fx(lw, b))}${dh(237, 0, 40, fx(40, b), { tx: 20 })}${dv(14, 247, CH, fx(28, b), { dx: 8 })}</g>`;
    const backMarks = `<g>${dh(56, CW - 28, CW, fx(28, b), { tx: CW - 14 })}${dv(CW - 28 - sw / 2, 0, 28, fx(28, b), { dx: -6, anchor: 'end' })}${dh(104, CW - 28 - sw, CW - 28, fx(sw, b), { tx: CW - 28 - sw / 2 })}${dh(124, 0, 28, fx(28, b), { tx: 14 })}${dv(14, 247, CH, fx(28, b), { dx: 8 })}</g>`;
    const front = `<div class="card card--front"><div class="logo" style="left:40px;top:${f2(ly)}px;transform:none">${L.html('reversed', { width: lw, color: rev.name, label: 'Your logo goes here' })}</div><span class="line ph-tight">${A(B.lines.primary)}</span><svg class="g-cm" width="${CW}" height="${CH}" viewBox="0 0 ${CW} ${CH}" aria-hidden="true">${frontMarks}</svg></div>`;
    const back = `<div class="card card--back"><div class="mark" style="right:28px;top:28px">${L.html('symbol', { width: sw, label: 'Logo' })}</div><div class="who"><p class="nm">${A(c.person)}</p><p class="rl">${A(c.role)}</p><p class="ct">${A(c.contact)}<br>${A(B.applications.site.url)}</p></div><svg class="g-cm" width="${CW}" height="${CH}" viewBox="0 0 ${CW} ${CH}" aria-hidden="true">${backMarks}</svg></div>`;
    // the sheet's own dimensions: the card's size in mm along the top and the right
    const outer = `<svg class="g-co" width="${CW + 40}" height="${CH + T}" viewBox="0 0 ${CW + 40} ${CH + T}" aria-hidden="true">${dh(14, 0, CW, '90 mm', { dy: -5 })}${dv(CW + 14, T, T + CH, '')}<text transform="translate(${CW + 30} ${T + CH / 2}) rotate(-90)" text-anchor="middle">55 mm</text></svg>`;
    const refs = ctx.pages.find((x) => x.id === 'business-card').ref;
    const plate = (card, n, name, cap, rows, note = '') => `<figure class="g-cp"><div class="g-cd" style="width:${CW + 40}px;height:${CH + T}px">${outer}<div class="g-cc" style="top:${T}px">${card}</div></div><figcaption><p class="g-ch"><span class="num">${refs}.${n}</span><b>${name}</b></p><p class="cap">${cap}</p><dl class="g-sch">${rows.map(([k, v]) => `<dt>${k}</dt><dd class="num">${v}</dd>`).join('')}</dl>${note}</figcaption></figure>`;
    const frontRows = [['Logo width', fx(lw, b)], ['Clear zone', `${fx(z, b)} each side`], ['Left margin', fx(40, b)], ['Line to foot', fx(28, b)]];
    const backRows = [['Symbol width', fx(sw, b)], ['Margins', fx(28, b)], ['Name', fx(16, b)], ['Role and contact', fx(13, b)]];
    return std(ctx, 'business-card', { lead: 'Front and back at actual proportion, 90 × 55 mm, shown at 5 px to the millimetre.', rules: ['The front carries the reversed logo and the line, 4x clear on every side.', `The back carries name, role and contact in ${A(B.fonts.body.family)}, never under 7 pt.`, 'The symbol sits top right, on the same wake.'], work: `<div class="g-cps">${plate(front, 4, 'Front', `${A(L.labels.reversed)} logo and the line`, frontRows, `<p class="cap g-xn">x is ${b} px on this sheet, ${f2(b / 5)} mm on the card.</p>`)}${plate(back, 5, 'Back', 'Name, role and contact', backRows)}</div>` });
  },
};

export const guidelines = { ...guidelinesA, ...guidelinesB, ...own };
