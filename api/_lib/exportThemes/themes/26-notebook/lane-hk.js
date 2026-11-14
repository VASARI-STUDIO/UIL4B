// Theme 26, Notebook, lane hk: the UI kit as a web page. The same sewn dot-grid notebook as the guidelines, a second volume: the desk is a cool
// grey, each page a sheet of dotted stock with a thread down its left, and the product is stuck in as pieces cut from its own surfaces (real
// ctx.ui components, light or dark), named on tape. Exports only kitSite; the builders are in lane-hk-*.js. Every class starts hk-.
import { kitCss } from './lane-hk-css.js';
import { found } from './lane-hk-found.js';
import { comp } from './lane-hk-comp.js';
import { screensPages } from './lane-hk-screens.js';

const E = (ctx, s) => ctx.esc(s == null ? '' : String(s));

const pages = { ...found, ...comp, ...screensPages };

function bar(ctx, K) {
  const side = K.sections.map((s) => `<div><h2>${E(ctx, `${s.n} ${s.title}`)}</h2>${s.pages.map((p) => `<a href="${K.href(p.id)}"${p.id === K.page.id ? ' aria-current="page"' : ''}>${E(ctx, p.title)}</a>`).join('')}</div>`).join('');
  const lead = `<div><h2>Start</h2>${['cover', 'contents'].map((id) => { const p = K.pages.find((x) => x.id === id); return p ? `<a href="${K.href(id)}"${id === K.page.id ? ' aria-current="page"' : ''}>${E(ctx, p.title)}</a>` : ''; }).join('')}</div>`;
  return `<header class="hk-bar"><a class="hk-bar__name" href="${K.href('cover')}">${E(ctx, ctx.brand.name)} UI kit</a><div class="hk-bar__ctl">`
    + `<button type="button" class="hk-btn" data-disclosure aria-controls="hk-index" aria-expanded="false">Pages</button>`
    + `<div class="hk-mode" role="group" aria-label="Notebook mode"><button type="button" class="hk-btn" data-mode="light" aria-pressed="true">Light</button><button type="button" class="hk-btn" data-mode="dark" aria-pressed="false">Dark</button></div></div></header>`
    + `<nav class="hk-index" id="hk-index" aria-label="Pages">${lead}${side}</nav>`;
}

function foot(ctx, K) {
  const link = (u, w) => (u ? `<a href="${K.href(u.id)}"><span>${w}</span><span>${E(ctx, u.title)}</span></a>` : '');
  return `<nav class="hk-pn" aria-label="Neighbouring pages">${link(K.prev, 'Before')}${link(K.next, 'Next')}</nav>`;
}

export const kitSite = {
  css: (ctx) => kitCss(ctx),
  shell(ctx, K, body) {
    const p = K.page, n = ctx.brand.name;
    if (p.id === 'cover') return `<div class="sx">${bar(ctx, K)}${body}</div>`;
    const where = p.section && !p.title.includes(',') ? `${p.section.title}, ${p.title}` : p.title;
    return `<div class="sx">${bar(ctx, K)}<main class="hk-sheet"><i class="hk-hole" style="top:46px"></i><i class="hk-hole" style="top:50%"></i><i class="hk-hole" style="bottom:46px"></i>`
      + `<div class="hk-head"><span>${E(ctx, n)} UI kit</span><span>${E(ctx, where)}</span></div><h1 class="hk-title">${E(ctx, p.title)}</h1>${body}${foot(ctx, K)}</main></div>`;
  },
  pages: Object.fromEntries(Object.entries(pages).map(([id, f]) => [id, (ctx, K) => f(ctx, K)])),
  fallback: (ctx, K) => `<div class="hk-body"><p class="hk-note">${E(ctx, K.page.title)}</p></div>`,
};
