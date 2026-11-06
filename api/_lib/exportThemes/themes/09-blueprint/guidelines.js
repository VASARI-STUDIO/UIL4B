// Guidelines pages for theme 09 (Blueprint): cover, contents, logo-versions, contrast, business-card here;
// the other pages live in guidelines-a.js and guidelines-b.js and are merged below. Helpers are in helpers.js; styles are in css-a.js
// under "base pages (run G)" (classes start g-). Cover is the title sheet, contents the drawing register, logo-versions a detail sheet
// (Details A to G in bubbles), contrast a ruled schedule whose redline is drawn at 20 px to 1 : 1, business-card a dimensioned detail.
import { A, ratioText, nameOf, fit, hline, vline, cell } from './helpers.js';
import { guidelinesA, bub, sheet } from './guidelines-a.js';
import { guidelinesB } from './guidelines-b.js';

const letter = (i) => String.fromCharCode(65 + i);
const rd = (n) => Math.round(n);
// the sheet's zone frame: an outer and an inner border, the band between them cut into lettered and numbered zones
const frame = () => {
  const z = (items, cls) => `<div class="g-z ${cls}">${items.map((t) => `<span>${t}</span>`).join('')}</div>`;
  const nums = [1, 2, 3, 4], lets = ['A', 'B', 'C', 'D', 'E', 'F'];
  return `<div class="g-fr" aria-hidden="true"><i class="g-fr2"></i>${z(nums, 'g-zt')}${z([...nums].reverse(), 'g-zb')}${z(lets, 'g-zl')}${z([...lets].reverse(), 'g-zr')}</div>`;
};

const own = {
  cover(ctx) {
    const B = ctx.brand, g = ctx.logo.geos.colour, geo = ctx.logo.geo, slot = ctx.edition === 'slot';
    const LW = 600, s = LW / g.w, LH = rd(g.h * s);
    // plumb line: from the baseline to the foot of the bob, only where the logo is actually drawn
    const baseY = rd(geo.top * s), px = rd(geo.cx * s);
    // (extension lines run from the baseline and the foot of the bob out to the dimension line)
    const plumb = slot || geo.top === undefined ? '' : `<i class="g-ext" style="left:${px + 10}px;top:${baseY}px;width:38px"></i><i class="g-ext" style="left:${px + 14}px;top:${LH}px;width:34px"></i>${vline(px + 44, baseY, LH - baseY, LH - baseY, { dx: 10 })}`;
    const sections = ctx.sections.map((s2) => `<li><span class="num">${ctx.pageNo(s2.pages[0].id)}</span>${A(s2.title)}</li>`).join('');
    const bar = [0, 1, 2, 3].map((i) => `<i style="left:${i * 50}px;background:${i % 2 ? 'var(--ground)' : 'var(--ink)'}"></i>`).join('');
    return `<section class="pg pg--cover g-cover" data-page="cover">${frame()}
<div class="hd"><span>${A(B.name)} brand guidelines, blueprint</span><span>${A(ctx.versionLine)}</span></div>
<div class="g-lg" style="width:${LW}px;height:${LH}px">${ctx.logo.html('colour', { width: LW, label: 'Your logo goes here' })}${hline(0, -36, LW, LW)}${vline(-36, 0, LH, LH, { dx: -34 })}${plumb}</div>
<p class="g-line">${A(B.lines.primary)}</p>
<div class="g-grow"></div>
<div class="g-tb">
<div class="g-tbc g-c1">${cell('Drawing', 'Brand guidelines', true)}</div>
<div class="g-tbc g-c2">${cell('Project', `${B.name}, renovation builders, ${B.city}`)}</div>
<div class="g-tbc"><span class="k">Scale</span>1×. Every redline is the size as drawn.</div>
<div class="g-tbc"><span class="k">Graphic scale, px</span><div class="g-bar" aria-hidden="true">${bar}<b class="rn" style="left:0;top:14px">0</b><b class="rn" style="left:100px;top:14px;transform:translateX(-50%)">100</b><b class="rn" style="left:200px;top:14px;transform:translateX(-100%)">200</b></div></div>
<div class="g-tbc"><span class="k">Date</span>${A(ctx.date)}. Example project.</div>
<div class="g-tbc g-sec"><span class="k">Sections</span><ul>${sections}</ul></div>
</div>
</section>`;
  },

  contents(ctx) {
    const front = ctx.pages.filter((p) => !p.section);
    const secs = [{ n: 0, title: 'Front matter', pages: front }, ...ctx.sections];
    const first = (s) => s.pages[0].no, last = (s) => s.pages.at(-1).no;
    const row = (s) => `<li class="g-rg">${bub(s.n)}<div class="g-rt"><h2>${A(s.title)}</h2><span class="cap num">${first(s) === last(s) ? `Sheet ${first(s)}` : `Sheets ${first(s)} to ${last(s)}`}</span></div><ol class="g-rs" style="grid-template-rows:repeat(${Math.ceil(s.pages.length / 2)},auto)">${s.pages.map((p) => `<li><span class="num">${p.no}</span>${A(p.title)}</li>`).join('')}</ol></li>`;
    const head = '<li class="g-rh"><span>Key</span><span>Section</span><span>Sheets in the section</span></li>';
    return sheet(ctx, 'contents', `<p class="lead">Nine sections, one drawing sheet a page. Page numbers are the sheet numbers in this document.</p><ol class="g-reg">${head}${secs.map(row).join('')}</ol>`);
  },

  'logo-versions'(ctx) {
    const L = ctx.logo, cw = ctx.brand.logo.colourways, light = ctx.roles.light;
    const cells = [
      ['colour', [420, 92], 'g-ldA'], ['mono-dark', [220, 62]], ['mono-light', [220, 62]],
      ['reversed', [220, 62]], ['symbol', [30, 78]], ['horizontal', [260, 62]], ['stacked', [150, 62]],
    ];
    const cellHtml = ([id, box, cls = ''], i) => {
      const w = cw[L.colourwayOf(id)], ground = w.ground, g = L.geos[id], width = fit(ctx, id, ...box), h = rd((width * g.h) / g.w);
      const dark = ctx.ratio(light.text, ground) < ctx.ratio(light.surface, ground);
      const dims = id === 'symbol' ? vline(width + 14, 0, h, h, { dx: 8 }) : `${hline(0, -18, width, width, { dy: -15 })}${i === 0 ? vline(width + 18, 0, h, h, { dx: 8 }) : ''}`;
      return `<figure class="g-ld ${cls}"><div class="g-dw ${dark ? 'g-dk' : ''}" style="background:${ground}"><div class="g-dl" style="width:${width}px;height:${h}px">${L.html(id, { width, colourway: L.colourwayOf(id), color: w.name, label: L.labels[id] })}${dims}</div></div><figcaption class="g-dt">${bub(letter(i))}<span><b>Detail ${letter(i)}, ${A(L.labels[id])}</b>${A(ctx.brand.logo.when[id])}</span></figcaption></figure>`;
    };
    return sheet(ctx, 'logo-versions', `<p class="lead">Seven versions, no more. Start with full colour, and reach for another only when the ground or the space asks for it.</p><div class="g-lds">${cells.map(cellHtml).join('')}</div>`, '1×');
  },

  contrast(ctx) {
    const K = 20; // px to 1 : 1: a redline is as long as the ratio it names
    const pairs = ctx.pairs;
    const row = (p, i) => `<li class="g-cr">${bub(i + 1)}<div class="g-cb" style="background:${p.bgHex};color:${p.fgHex}"><b>${A(p.use)}</b><span>${A(nameOf(ctx, p.fg))} on ${A(nameOf(ctx, p.bg))}</span></div><div class="g-cl"><i class="rl h" style="left:0;top:21px;width:${rd(p.ratio * K)}px"></i><b class="rn num" style="left:${rd(p.ratio * K) + 12}px;top:15px">${ratioText(p.ratioText)}</b></div></li>`;
    const nu = ctx.unusedPairs.slice(0, 12).map((p) => `<li class="g-nu"><span class="g-ns" style="background:${p.bgHex}"><i style="background:${p.fgHex}"></i></span><span class="cap"><b>${A(nameOf(ctx, p.fg))} on ${A(nameOf(ctx, p.bg))}</b>${ratioText(p.ratioText)}, not used</span><span class="g-nl"><i class="rl h" style="left:0;top:14px;width:${rd(p.ratio * K)}px"></i></span></li>`).join('');
    const para = `Every text pair ${A(ctx.brand.name)} uses, with its contrast ratio. Text needs 4.5 : 1, and type 24 px and over needs 3 : 1. Redlines are drawn at ${K} px to 1 : 1. A pair that falls short is not used for text.`;
    const marks = `<i class="g-th" style="--x:${3 * K}px"></i><i class="g-th" style="--x:${4.5 * K}px"></i><b class="rn g-tl3">3 : 1</b><b class="rn g-tl45">4.5 : 1</b>`;
    return sheet(ctx, 'contrast', `<p class="lead g-lead">${para}</p><div class="g-cs"><div class="g-ch"><span>Key</span><span>Pair</span><span class="g-cm">Ratio, as a redline</span></div><ol class="g-crs">${pairs.map(row).join('')}</ol>${marks}</div><h2 class="a-nh">Not used</h2><ul class="g-nus">${nu}</ul>`);
  },

  'business-card'(ctx) {
    const B = ctx.brand, L = ctx.logo, c = B.applications.card, rev = B.logo.colourways.reversed;
    const S = 5, W = 90 * S, H = 55 * S; // 90 x 55 mm, shown at 5 px to the millimetre: the redlines print millimetres
    const z = S / 6; // the card artwork is laid out at 6 px to the millimetre and scaled to fit
    const front = `<div class="g-card g-front" style="width:${W / z}px;height:${H / z}px;zoom:${z.toFixed(4)}"><div class="lg">${L.html('reversed', { width: fit(ctx, 'reversed', 340, 130), colourway: 'reversed', label: 'Your logo goes here', color: rev.name })}</div><span class="ln">${A(B.lines.primary)}</span></div>`;
    const back = `<div class="g-card g-back" style="width:${W / z}px;height:${H / z}px;zoom:${z.toFixed(4)}"><div class="mk">${L.html('symbol', { width: fit(ctx, 'symbol', 22, 60), label: 'Logo' })}</div><div class="who"><p class="nm">${A(c.person)}</p><p class="rl">${A(c.role)}</p><p class="ct">${A(c.contact)}<br>${A(B.applications.site.url)}</p></div></div>`;
    // numbered key bubbles sit on the card, on their own Plaster ground so they read on Bluestone too
    const pin = (n, style) => `<span class="g-pin" style="${style}">${bub(n)}</span>`;
    const fig = (i, card, pins, name, keys) => `<figure class="g-bc"><div class="g-bcd" style="width:${W}px;height:${H}px">${card}${pins}${hline(0, -26, W, 90, { label: '90 mm' })}${vline(W + 16, 0, H, 55, { label: '55 mm', dx: 8 })}</div><figcaption class="g-bn"><p class="g-bh">${bub(letter(i))}<b>Detail ${letter(i)}, ${name}</b></p><ol>${keys.map(([n, t]) => `<li>${bub(n)}<span>${t}</span></li>`).join('')}</ol></figcaption></figure>`;
    const f1 = fig(0, front, `${pin(1, `left:7px;top:${H / 2 - 13}px`)}${pin(2, `left:7px;top:${H - 48}px`)}`, 'Front', [[1, 'Reversed logo on Bluestone'], [2, 'The line']]);
    const f2 = fig(1, back, `${pin(3, 'right:58px;top:42px')}${pin(4, `left:7px;top:${H - 92}px`)}`, 'Back', [[3, 'The symbol sits top right'], [4, 'Name, role and contact']]);
    return sheet(ctx, 'business-card', `<p class="lead">Printed 90 × 55 mm, the Australian standard card. Shown at 5 px to the millimetre, so each redline is the size as printed.</p>${f1}${f2}`, '5 px to 1 mm');
  },
};

export const guidelines = { ...guidelinesA, ...guidelinesB, ...own };
