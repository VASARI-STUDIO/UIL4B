// Lane hk for theme 28 (Riso): the UI kit as a webpage, the same press job as the PDF kit. Every page is a sheet off the brand's press: a plate
// carrying the page's name and its hit numeral (a real count taken from ctx, named on the plate), a pass band down the right edge, and the paper
// under them. The product is never printed with the press: a .ui region is the product's own surface pasted onto the paper, with the real
// components (ctx.ui) in it, unrestyled. The paper stays paper in dark mode; the switch turns the product's surfaces.
// Pages live in lane-hk-found.js, lane-hk-comp.js and lane-hk-scr.js; the pieces they share in lane-hk-lib.js; the css in lane-hk-css.js.
import { hkCss } from './lane-hk-css.js';
import { found } from './lane-hk-found.js';
import { comp } from './lane-hk-comp.js';
import { scr } from './lane-hk-scr.js';
import { A, bar, parts, sheet, lab, b } from './lane-hk-lib.js';

const pages = { ...found, ...comp, ...scr };

const statusCss = `
.sx .hk-sl{display:flex;flex-direction:column}
.sx .hk-sr{display:grid;grid-template-columns:minmax(0,1fr);gap:0 24px;align-items:stretch}
.sx .hk-sr .hk-pan{display:flex;align-items:center;min-width:0}
.sx .hk-sr>.hk-note{padding:12px 0;border-top:.5px solid var(--hk-hair)}
.sx .hk-sr .hk-pan+.hk-pan{margin-top:-1px}
.sx .hk-srh{display:none}
@media (min-width:841px){
  .sx .hk-sr{grid-template-columns:200px 200px minmax(0,1fr)}
  .sx .hk-srh{display:grid}
  .sx .hk-srh .hk-lab{padding-bottom:4px}
}
.sx .hk-mb{display:flex}
html:not([data-theme="dark"]) .sx .hk-modes button[data-mode="light"],html[data-theme="dark"] .sx .hk-modes button[data-mode="dark"]{background:var(--hk-key);color:var(--hk-paper)}
.sx .hk-mlab{font-size:13px}
`;

export const kitSite = {
  photos: true, // the cards page shows the brand's own photo
  css(ctx) { return hkCss(ctx) + statusCss; },

  shell(ctx, K, body) {
    const P = parts(K), p = K.page, cur = p.section ? P.find((s) => s.n === p.section.n) : null;
    const menu = P.map((s) => `<div class="hk-ms"><h2><span class="hk-v">${String(s.n).padStart(2, '0')}</span> ${A(s.title)}</h2><ul>${s.pages.map((x) => `<li><a href="${x.href}"${x.id === p.id ? ' aria-current="page"' : ''}><span>${A(x.title)}</span><span class="hk-v">${String(x.folio).padStart(3, '0')}</span></a></li>`).join('')}</ul></div>`).join('');
    const sub = cur ? `<nav class="hk-sub" aria-label="In ${A(cur.title)}"><ul>${cur.pages.map((x) => `<li><a href="${x.href}"${x.id === p.id ? ' aria-current="page"' : ''}>${A(x.title)}</a></li>`).join('')}</ul></nav>` : '';
    return `<div class="sx"><div class="hk-wrap">
<header class="hk-top"><a class="hk-id" href="${K.href('cover')}">${bar(ctx)}<span>UI kit</span><span class="hk-ed">${A(ctx.brand.name)}</span></a>
<a class="hk-back" href="../guidelines-html/index.html">Guidelines</a>
<div class="hk-modes"><span class="hk-mlab" id="hk-mlab">Product</span><div class="hk-mb" role="group" aria-labelledby="hk-mlab"><button type="button" data-mode="light">Light</button><button type="button" data-mode="dark">Dark</button></div></div>
<button type="button" class="hk-menu-b" data-disclosure aria-controls="hk-menu">Contents</button></header>
<nav id="hk-menu" class="hk-menu" aria-label="All pages"><div class="hk-mg">${menu}</div></nav>
${sub}<main id="hk-main">${body}</main></div></div>`;
  },

  pages,

  fallback(ctx, K) {
    return sheet(ctx, K, { label: A(K.page.title), hit: K.pages.findIndex((x) => x.id === K.page.id) + 1, hitLeft: true, plate: `${b('This page')}<br>is part of the kit.`, body: `<div class="hk-sec">${lab('Contents')}<p class="hk-note"><a href="${K.href('contents')}">Back to the contents</a></p></div>` });
  },
};
