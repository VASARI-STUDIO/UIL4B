// Guidelines pages for theme 03 (ids in engine/pages.js GUIDE_PAGES): cover, contents, logo-versions, contrast, business-card here;
// the other pages live in guidelines-a.js and guidelines-b.js and are merged below. Helpers are in helpers.js.
import { A, ratioText, nameOf, fit, std, edition } from './helpers.js';
import { guidelinesA } from './guidelines-a.js';
import { guidelinesB } from './guidelines-b.js';

const own = {
  // the front page: ears, a double-ruled nameplate between two lines, then a photo slot and the week's list
  cover(ctx) {
    const B = ctx.brand, slot = ctx.edition === 'slot', S = B.ui.screen.content;
    const week = S.deliveries.slice(0, 4).map((d) => {
      const [item, region] = d.to.split(', ');
      return `<li><span>${A(item)}<span class="q">${A(region)}</span></span><span class="pr">${A(d.price)}</span></li>`;
    }).join('');
    const plate = slot ? `<span class="nameplate disp">${A(B.name)}</span>` : `<span class="nameplate">${ctx.logo.html('colour', { width: 640 })}</span>`;
    return `<section class="pg pg--cover" data-page="cover">
<div class="ears"><span>Brand guidelines</span><span>${A(edition(ctx))}</span><span>${A(ctx.date)}</span><span>${A(B.city)}</span></div>
<div class="mast"><div class="ear">${A(B.lines.others[0]).replace(', ', ',<br>')}</div>${plate}<div class="ear r">${A(B.lines.primary).replace('. ', '.<br>')}</div></div>
<div class="rule2"></div>
<div class="front">
<div class="l">${ctx.photo('quandongs')}<p class="cap">Photograph: a handful of quandongs on the shop counter at opening, printed black and white.</p></div>
<div class="r"><p class="lead">${A(`How ${B.name} sounds and looks: the name, the two lines, the colours, the type and the counter.`)}</p>
${slot ? `<div>${ctx.logo.html('colour', { width: 220, label: 'Your logo goes here' })}</div>` : ''}
<div class="wk"><h3><i></i>${A(B.ui.screen.title)}</h3><ul>${week}</ul></div></div>
</div></section>`;
  },

  // the contents as a newspaper index: nine items in three ruled columns, the section number set large, the page number on a leader
  contents(ctx) {
    const rows = ctx.sections.map((s) => `<li><span class="n">${s.n}</span><span class="t">${A(s.title)}</span><span class="p">${s.pages[0].no}</span><span class="s">${s.pages.map((p) => A(p.title)).join(', ')}</span></li>`).join('');
    return std(ctx, 'contents', `<div class="body"><div class="ctop"><h1 class="headline">Contents</h1><p class="txt">${A(`${ctx.brand.name} brand guidelines, ${edition(ctx).toLowerCase()}, ${ctx.date}.`)}</p></div><ol class="idx">${rows}</ol></div>`, 'pg--contents');
  },

  // the logo as the nameplate across the full measure (ears either side, as on the cover), the other six versions down two ruled columns with captions
  'logo-versions'(ctx) {
    const L = ctx.logo, cw = ctx.brand.logo.colourways, surface = ctx.roles.light.surface.toLowerCase(), when = ctx.brand.logo.when;
    const tile = (id, box) => {
      const w = cw[L.colourwayOf(id)], g = w.ground;
      return `<div class="tile ${g.toLowerCase() === surface ? 'hairline' : ''}" style="background:${g}">${L.html(id, { width: fit(ctx, id, ...box), color: w.name, label: L.labels[id] })}</div>`;
    };
    const item = ([id, box]) => `<li>${tile(id, box)}<p class="cap"><b>${A(L.labels[id])}</b>${A(when[id])}</p></li>`;
    const colA = [['mono-dark', [190, 80]], ['mono-light', [190, 80]], ['reversed', [190, 80]]];
    const colB = [['symbol', [90, 80]], ['horizontal', [200, 60]], ['stacked', [112, 84]]];
    const mast = `<div class="vmast"><div class="ear"><b>${A(L.labels.colour)}</b>${A(when.colour)}</div><div class="nameplate">${L.html('colour', { width: fit(ctx, 'colour', 600, 124), color: cw[L.colourwayOf('colour')].name, label: L.labels.colour })}</div><div class="ear r">Seven versions, no more. Start with full colour, and reach for another only when the ground or the space asks for it.</div></div>`;
    return std(ctx, 'logo-versions', `<div class="body">${mast}<div class="vcols"><ol>${colA.map(item).join('')}</ol><ol>${colB.map(item).join('')}</ol></div></div>`, 'pg--versions');
  },

  // the weather table: pairs as cities, ratios as temperatures, "passes at" as the forecast; the pairs not used as a second column
  contrast(ctx) {
    const surface = ctx.roles.light.surface.toLowerCase();
    const sv = (inner) => `<svg viewBox="0 0 22 22" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
    const cloud = 'M6 16.5a3.5 3.5 0 0 1 .4-7A5.2 5.2 0 0 1 16.5 10a3.3 3.3 0 0 1-.3 6.5z';
    const icon = {
      sun: sv('<circle cx="11" cy="11" r="3.6"/><path d="M11 2.5v2.4M11 17.1v2.4M2.5 11h2.4M17.1 11h2.4M5 5l1.7 1.7M15.3 15.3 17 17M17 5l-1.7 1.7M6.7 15.3 5 17"/>'),
      part: sv(`<circle cx="7.5" cy="7.5" r="2.6"/><path d="M7.5 2v1.6M2 7.5h1.6M3.6 3.6l1.1 1.1M11.4 3.6l-1.1 1.1"/><path d="${cloud}" transform="translate(1.5 1.5)" fill="var(--ground)"/>`),
      rain: sv(`<path d="${cloud}" transform="translate(0 -2)"/><path d="M7.5 17.5l-.8 2.2M11.5 17.5l-.8 2.2M15.5 17.5l-.8 2.2"/>`),
    };
    const used = (p) => {
      const pass = p.large ? `${p.minSize || 24} px and over` : 'Any size';
      return `<li class="wx-r"><span class="sw ${p.bgHex.toLowerCase() === surface ? 'hairline' : ''}" style="background:${p.bgHex};color:${p.fgHex}" aria-hidden="true">Aa</span><div class="wx-c"><b>${A(nameOf(ctx, p.fg))} on ${A(nameOf(ctx, p.bg))}</b><span>${A(p.use)}</span></div><span class="wx-t">${ratioText(p.ratioText)}</span><span class="wx-f">${p.large ? icon.part : icon.sun}${pass}</span></li>`;
    };
    const unused = (p) => `<li class="wx-r wx-r--no"><span class="sw sw--s" style="background:${p.bgHex}" aria-hidden="true"><i style="background:${p.fgHex}"></i></span><div class="wx-c"><b>${A(nameOf(ctx, p.fg))} on ${A(nameOf(ctx, p.bg))}</b></div><span class="wx-t">${ratioText(p.ratioText)}</span><span class="wx-f">${icon.rain}Not used</span></li>`;
    const head = (a, b) => `<div class="wx-h" aria-hidden="true"><span></span><span>${a}</span><span class="r">Ratio</span><span>${b}</span></div>`;
    const para = `Every text pair ${A(ctx.brand.name)} uses, with its contrast ratio. Text needs 4.5 : 1, and type 24 px and over needs 3 : 1. A pair below its mark is not used for text.`;
    return std(ctx, 'contrast', `<div class="body"><p class="lead">${para}</p><div class="wx-cols"><section class="wx"><h3 class="h3">Used</h3>${head('Pair', 'Passes at')}<ul>${ctx.pairs.map(used).join('')}</ul></section><section class="wx wx--no"><h3 class="h3">Not used</h3>${head('Pair', 'Forecast')}<ul>${ctx.unusedPairs.map(unused).join('')}</ul></section></div></div>`, 'pg--contrast');
  },

  // a newspaper photo spread: headline and standfirst over a double rule, the two faces as photographs in two ruled columns with captions
  'business-card'(ctx) {
    const B = ctx.brand, L = ctx.logo, c = B.applications.card, rev = B.logo.colourways.reversed;
    const [cw, ch] = [90, 55]; // Australian standard card, mm
    const front = `<div class="card card--front"><div class="logo">${L.html('reversed', { width: fit(ctx, 'reversed', 400, 160), color: rev.name, label: 'Your logo goes here' })}</div><span class="line">${A(B.lines.primary)}</span></div>`;
    const back = `<div class="card card--back"><div class="mark">${L.html('symbol', { width: fit(ctx, 'symbol', 90, 72), label: 'Logo' })}</div><div class="who"><p class="nm">${A(c.person)}</p><p class="rl">${A(c.role)}</p><p class="ct">${A(c.contact)}<br>${A(B.applications.site.url)}</p></div></div>`;
    const fig = (card, cap) => `<figure class="bc-f">${card}<figcaption class="cap">${cap}</figcaption></figure>`;
    const top = `<div class="bc-top"><h1 class="headline">Business card</h1><p class="lead">Printed ${cw} × ${ch} mm, shown at 6 px to the millimetre.</p></div>`;
    const body = `<div class="body">${top}<div class="bc-cols">${fig(front, `<b>Front</b>${A(L.labels.reversed)} logo and the line`)}${fig(back, '<b>Back</b>Name, role and contact')}</div></div>`;
    return std(ctx, 'business-card', body, 'pg--card');
  },
};

export const guidelines = { ...guidelinesA, ...guidelinesB, ...own };
