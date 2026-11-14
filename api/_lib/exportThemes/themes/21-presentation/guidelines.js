// Guidelines pages for theme 01: cover, contents, logo-versions, contrast, business-card here (run G);
// the other pages live in guidelines-a.js and guidelines-b.js and are merged below. Helpers are in helpers.js.
// Run G's pages are slides played full screen: edge-to-edge panels, the running head and folio laid over the first panel. Styles: g- classes in index.js.
import { plateImg } from '../../engine/plate.js';
import { A, ratioText, nameOf, fit } from './helpers.js';
import { guidelinesA } from './guidelines-a.js';
import { guidelinesB } from './guidelines-b.js';
import { r1 } from './guidelines-r1.js';

// the slide: the running head and folio sit over the first panel (hdW narrows the head to that panel's width)
const slide = (ctx, id, inner, o = {}) => {
  const p = ctx.pages.find((x) => x.id === id);
  const hs = o.hdW ? ` style="right:auto;width:${Math.floor(o.hdW)}px;flex-direction:column;gap:2px"` : '';
  const head = `<div class="hd"${hs}><span>${p.ref ? `<b class="num">${p.ref}</b>` : ''}${A(p.title)}</span><span>${A(ctx.brand.name)} brand guidelines</span></div>`;
  return `<section class="pg pg--g" data-page="${id}" style="background:${o.ground || 'var(--ground)'};color:${o.ink || 'var(--ink)'}">${head}${inner}<span class="fo">${ctx.pageNo(id)}</span></section>`;
};
// the panel grounds: [background, text]
const PANEL = ['var(--panel)', 'var(--ink)'], SIGNAL = ['var(--accent)', 'var(--accent-ink)'], DARK = ['var(--dark)', 'var(--dark-ink)'], PAGE = ['var(--ground)', 'var(--ink)'];
const sty = ([bg, fg]) => `background:${bg};color:${fg}`;
// whichever of the page's text and ground colours reads better on a hex
const inkOn = (ctx, hex) => { const t = ctx.roles.light.text, g = ctx.roles.light.surface; return ctx.ratio(t, hex) >= ctx.ratio(g, hex) ? t : g; };

const own = {
  cover(ctx) {
    const B = ctx.brand, rev = B.logo.colourways.reversed;
    const [r, g, b] = ctx.C.hexToRgb(rev.ground);
    const slot = ctx.edition === 'slot';
    // a flat tint of the dark ground over the photo keeps the type legible; no gradient
    return `<section class="pg pg--cover" data-page="cover">
${ctx.photo('riders', { cls: 'bleed', pos: '100% 40%' })}
<div class="tint" style="background:rgba(${r},${g},${b},0.58)"></div>
<div class="top"><span>${A(B.name)} brand guidelines</span><span class="num">${A(ctx.versionLine)}</span></div>
<div class="title">${slot ? `<span class="disp">${A(B.name)}</span>` : ctx.logo.html('reversed', { width: 860 })}</div>
${slot ? `<div class="slot-corner">${ctx.logo.html('colour', { width: 220, color: rev.name, label: 'Your logo goes here' })}</div>` : `<span class="tag">${A(B.lines.primary)}</span>`}
</section>`;
  },

  // contents: the slide sorter. Each section is a small 16:9 thumbnail (its number and name on it), its pages listed under it.
  contents(ctx) {
    const grounds = [DARK, PANEL, SIGNAL, PAGE];
    const cells = ctx.sections.map((s, i) => {
      const g = grounds[i % grounds.length];
      const pages = s.pages.map((p) => `<li><span>${A(p.title)}</span><span class="num">${p.no}</span></li>`).join('');
      return `<li class="g-sc"><div class="g-th ${g === PAGE ? 'hairline' : ''}" style="${sty(g)}"><span class="g-thn num">${s.n}</span><span class="g-thp num">${s.pages[0].no}</span><span class="disp g-tht">${A(s.title)}</span></div><ol class="g-pl">${pages}</ol></li>`;
    }).join('');
    return slide(ctx, 'contents', `<h1 class="disp g-h1">Contents</h1><ol class="g-sorter">${cells}</ol>`);
  },

  // logo versions: a mosaic of slides, each version alone on its own ground
  'logo-versions'(ctx) {
    const L = ctx.logo, cw = ctx.brand.logo.colourways, surface = ctx.roles.light.surface.toLowerCase();
    // [version, grid placement, box to fit the logo in]
    const cells = [
      ['colour', 'grid-column:1/3;grid-row:1/3', [440, 280]], ['mono-dark', 'grid-column:3;grid-row:1', [190, 84]], ['mono-light', 'grid-column:4;grid-row:1', [190, 84]],
      ['reversed', 'grid-column:3;grid-row:2', [190, 84]], ['symbol', 'grid-column:4;grid-row:2', [64, 76]],
      ['horizontal', 'grid-column:2/4;grid-row:3', [400, 96]], ['stacked', 'grid-column:4;grid-row:3', [150, 100]],
    ];
    const cell = ([id, place, box]) => {
      const w = cw[L.colourwayOf(id)], ink = inkOn(ctx, w.ground);
      return `<figure class="g-vc ${id === 'colour' ? 'g-vc--first' : ''} ${w.ground.toLowerCase() === surface ? 'hairline' : ''}" style="background:${w.ground};color:${ink};${place}"><div class="g-va">${L.html(id, { width: fit(ctx, id, ...box), color: w.name, label: L.labels[id] })}</div><figcaption class="cap"><b>${A(L.labels[id])}</b>${A(ctx.brand.logo.when[id])}</figcaption></figure>`;
    };
    const lead = `<p class="lead g-vlead" style="grid-column:1;grid-row:3">Seven versions, no more. Start with full colour, and reach for another only when the ground or the space asks for it.</p>`;
    return slide(ctx, 'logo-versions', `<div class="g-mosaic">${cells.map(cell).join('')}${lead}</div>`, { hdW: 640 - 112 });
  },

  // contrast: one results slide. Each measured pair is a big ratio set in its own colours; the pairs not used run along the foot.
  contrast(ctx) {
    const normal = ctx.pairs.filter((p) => !p.large), large = ctx.pairs.filter((p) => p.large); // large (24 px and over) pairs come last
    const surface = ctx.roles.light.surface.toLowerCase();
    const num = (t) => String(t).replace(/\s*:\s*1$/, '');
    const rows = 3, cols = Math.ceil(normal.length / rows); // the pairs in three rows; the large-type pair stands in its own tall column
    const tile = (p, i, big) => `<li class="g-pr ${big ? 'g-pr--l' : i % cols === 0 ? 'g-pr--first' : ''} ${p.bgHex.toLowerCase() === surface ? 'hairline' : ''}" style="background:${p.bgHex};color:${p.fgHex}"><span class="disp g-rn num">${num(p.ratioText)}<i>&nbsp;:&nbsp;1</i></span><span class="g-ru"><b>${A(p.use)}</b>${A(nameOf(ctx, p.fg))} on ${A(nameOf(ctx, p.bg))}</span></li>`;
    const nu = ctx.unusedPairs.map((p) => `<li class="g-nu"><span class="g-nsw hairline" style="background:${p.bgHex}"><i style="background:${p.fgHex}"></i></span><span class="cap"><b>${A(nameOf(ctx, p.fg))} on ${A(nameOf(ctx, p.bg))}</b>${ratioText(p.ratioText)}, not used</span></li>`).join('');
    const para = `Every text pair ${A(ctx.brand.name)} uses, with its contrast ratio. Text needs 4.5 : 1, and type 24 px and over needs 3 : 1. A pair below its mark is not used for text.`;
    const inner = `<p class="lead g-clead">${para}</p><ul class="g-results" style="grid-template-columns:repeat(${cols},minmax(0,1fr))${large.length ? ' minmax(0,1.45fr)' : ''};grid-template-rows:repeat(${rows},minmax(0,1fr))">${normal.map((p, i) => tile(p, i)).join('')}${large.map((p, i) => tile(p, i, true)).join('')}</ul><div class="g-notused"><h3 class="h3">Not used</h3><ul>${nu}</ul></div>`;
    return slide(ctx, 'contrast', inner);
  },

  // business card: both sides photographed on a till counter (the counter-till-cards scene). The photograph is the page; the type is small
  // and sits in a strip below it, each caption under its own card. The art is drawn flat at 6 px to the millimetre, then placed on the photo.
  'business-card'(ctx) {
    const B = ctx.brand, L = ctx.logo, c = B.applications.card, rev = B.logo.colourways.reversed;
    const p = ctx.pages.find((x) => x.id === 'business-card');
    const [cw, ch] = [90, 55]; // Australian standard card, mm
    const [aw, ah] = [cw * 6, ch * 6];
    const front = `<div class="g-card g-card--front"><div class="logo">${L.html('reversed', { width: fit(ctx, 'reversed', 380, 160), color: rev.name, label: 'Your logo goes here' })}</div><span class="line">${A(B.lines.primary)}</span></div>`;
    const back = `<div class="g-card g-card--back"><div class="mark">${L.html('symbol', { width: fit(ctx, 'symbol', 64, 72), label: 'Logo' })}</div><div class="who"><p class="nm">${A(c.person)}</p><p class="rl">${A(c.role)}</p><p class="ct">${A(c.contact)}<br>${A(B.applications.site.url)}</p></div></div>`;
    // the art fills the whole card: the photo's mask gives it its edge, so no radius here
    const art = (inner) => ({ html: ctx.artPage(inner, { w: aw, h: ah, css: '.pg--art .g-card{width:100%;height:100%;border-radius:0}' }), w: aw, h: ah });
    const url = ctx.mockup('counter-till-cards', { 'card-front': art(front), 'card-back': art(back) });
    // each caption starts under the left edge of its card (scene px scaled to the page's width)
    const sc = ctx.sceneInfo('counter-till-cards'), k = ctx.size.w / sc.w;
    const left = (name) => Math.round(Math.min(...sc.quads[sc.surfaces.indexOf(name)].corners.map((q) => q[0])) * k);
    const alt = `${B.name} business card, front and back, on a till counter`;
    return `<section class="pg pg--bc" data-page="business-card">
<div class="hd"><span>${p.ref ? `<b class="num">${p.ref}</b>` : ''}${A(p.title)}</span><span>${A(B.name)} brand guidelines</span></div>
<figure class="bc-photo">${plateImg(`${A(url)}`, `${A(alt)}`)}</figure>
<p class="cap bc-cap" style="left:${left('card-front')}px"><b>Front</b>${A(L.labels.reversed)} logo and the line</p>
<p class="cap bc-cap" style="left:${left('card-back')}px"><b>Back</b>Name, role and contact</p>
<p class="cap bc-note">Printed ${cw} × ${ch} mm, the Australian standard card</p>
<span class="fo">${ctx.pageNo('business-card')}</span>
</section>`;
  },
};


export const guidelines = { ...guidelinesA, ...guidelinesB, ...own, ...r1 };
