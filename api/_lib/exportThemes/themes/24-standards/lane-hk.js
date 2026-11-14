// Theme 24, Standards, lane hk: the kit site. A volume of the same measured manual as the PDF kit: a bar, a running head, the x-ruler,
// then one sheet per page with a thumb tab cut into the right edge. Pages in lane-hk-pages-a/-b/-c.js, css in lane-hk-css.js.
import { A, pad3, title, ruler } from './lane-hk-parts.js';
import { kitCss } from './lane-hk-css.js';
import { pagesA } from './lane-hk-pages-a.js';
import { pagesB } from './lane-hk-pages-b.js';
import { pagesC } from './lane-hk-pages-c.js';

const sectionOf = (ctx, id) => ctx.sections.find((s) => s.pages.some((q) => q.id === id));

function bar(ctx, K) {
  const cws = ctx.brand.logo.colourways, dk = cws.reversed ? 'reversed' : 'mono-light';
  const logo = `<span class="hk-lgl">${ctx.logo.html('horizontal', { width: 112, label: ctx.brand.name })}</span><span class="hk-lgd">${ctx.logo.html('horizontal', { width: 112, colourway: dk, label: ctx.brand.name })}</span>`;
  const nav = ctx.sections.map((s) => `<li><h2>${s.n} ${A(s.title)}</h2><ul>${s.pages.map((q) => `<li><a href="${K.href(q.id)}"${q.id === K.page.id ? ' aria-current="page"' : ''}>${A(q.title)}<span>${pad3(ctx.pageNo(q.id))}</span></a></li>`).join('')}</ul></li>`).join('');
  return `<header class="hk-bar"><a class="hk-brand" href="${K.href('cover')}" aria-label="${A(ctx.brand.name)} UI kit, cover">${logo}</a><span class="hk-nm">UI kit</span>`
    + `<button type="button" class="hk-menu" data-disclosure aria-controls="hk-nav" aria-expanded="false">Pages</button>`
    + `<div class="hk-mode" role="group" aria-label="Colour mode"><button type="button" data-mode="light" aria-pressed="true">Light</button><button type="button" data-mode="dark" aria-pressed="false">Dark</button></div></header>`
    + `<nav id="hk-nav" class="hk-nav" aria-label="Pages"><ol>${nav}</ol></nav>`;
}

const link = (p, dir) => (p ? `<a href="${A(p.href)}" rel="${dir}"><small>${dir === 'prev' ? 'Previous' : 'Next'}</small><b>${A(p.title)}</b></a>` : '<span></span>');

export const kitSite = {
  css(ctx) { return kitCss(ctx); },
  shell(ctx, K, body) {
    const sec = sectionOf(ctx, K.page.id), isCover = K.page.id === 'cover';
    const rh = `<div class="hk-rh"><span>${A(ctx.brand.name)} UI kit</span><span>${sec ? `${sec.n} ${A(sec.title)}` : ''}</span><span>${A(K.page.title)}</span><span>${pad3(ctx.pageNo(K.page.id))}</span></div>`;
    return `<div class="sx hk">${bar(ctx, K)}<main id="main" class="hk-main" tabindex="-1"><div class="hk-wrap">${isCover ? '' : rh + ruler(ctx)}${body}`
      + `<nav class="hk-pn" aria-label="Previous and next page">${link(K.prev, 'prev')}${link(K.next, 'next')}</nav></div>`
      + `${sec ? `<div class="hk-tab" style="--n:${sec.n}" aria-hidden="true">${sec.n}</div>` : ''}</main>`
      + `<footer class="hk-foot"><span>Made with UIL4B</span><span>${A(ctx.brand.name)}, version ${A(ctx.brand.version.number)}</span></footer></div>`;
  },
  pages: { ...pagesA, ...pagesB, ...pagesC },
  fallback(ctx, K) { return title(ctx, K, ''); },
};
