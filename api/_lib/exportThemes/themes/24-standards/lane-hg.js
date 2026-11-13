// Theme 24, Standards, lane hg: the guide site. The brand book's measured manual as one sheet per guideline: a running head, one hero drawn
// at a fixed size per sheet width with its dimension lines in x, hairline registers, the x-ruler at the foot and the section's thumb tab.
// Device in lane-hg-kit.js, the page bodies in lane-hg-a.js (words, logo, colour) and lane-hg-b.js (type, imagery, layout, applications),
// the CSS in lane-hg-css.js.
import { GUIDE_PAGES } from '../../engine/pages.js';
import { A, roles, xOf } from './helpers.js';
import { CW, TIERS, fig, ruler, lab, sv, reg, logoOn, logoMode, dispStyle, fitSize, widest, dfont, dimH, map3 } from './lane-hg-kit.js';
import { hgCss } from './lane-hg-css.js';
import { PAGES_A } from './lane-hg-a.js';
import { PAGES_B } from './lane-hg-b.js';
import { meta } from './lane-hg-meta.js';

const BUILD = { ...PAGES_A, ...PAGES_B };
const FALLBACK = (ctx, id) => { const m = meta(id); return `<div class="hg-rh"><span>${A(ctx.brand.name)} brand guidelines</span><span>${m.ref} ${A(m.title)}</span></div><h1 class="hg-h1">${A(m.title)}</h1>`; };

const tabOf = (n) => `<div class="hg-tab" aria-hidden="true" style="--n:${n}">${n}</div>`;
const sectionOf = (S, u) => { const i = S.sections.findIndex((s) => s.units.some((x) => x.id === u.id)); return i < 0 ? 0 : i + 1; };

function bar(ctx, S) {
  const toc = S.sections.map((s, i) => `<div class="hg-toc__s"><p class="hg-toc__t"><span class="hg-no">${i + 1}</span>${A(s.title)}</p><ul>${s.units.map((u) => `<li><a href="${A(u.file)}"${!S.isFront && u.id === S.unit.id ? ' aria-current="page"' : ''}>${A(u.title)}</a></li>`).join('')}</ul></div>`).join('');
  return `<header class="hg-bar" id="hg-top"><a class="hg-brand" href="index.html" aria-label="${A(ctx.brand.name)} guidelines, home">${logoMode(ctx, 'horizontal', 112, ctx.brand.name)}</a>`
    + `<nav class="hg-nav" aria-label="Sections"><a href="index.html"${S.isFront ? ' aria-current="page"' : ''}>Guidelines</a><a href="../ui-kit-html/index.html">UI kit</a></nav>`
    + `<button type="button" class="hg-menu" data-gs-toggle aria-controls="hg-toc" aria-expanded="false">Contents</button>`
    + `<div class="hg-mode" role="group" aria-label="Colour mode"><button type="button" data-mode="light" aria-pressed="true">Light</button><button type="button" data-mode="dark" aria-pressed="false">Dark</button></div>`
    + `<div class="hg-toc" id="hg-toc" data-open="false"><div class="hg-toc__in">${toc}</div></div></header>`;
}

function pn(S) {
  const l = (u, dir) => (u ? `<a class="hg-pn__${dir}" href="${A(u.file)}" rel="${dir === 'p' ? 'prev' : 'next'}"><span class="hg-pn__d">${dir === 'p' ? 'Previous' : 'Next'}</span><span class="hg-pn__t">${A(u.title)}</span></a>` : '<span></span>');
  return `<nav class="hg-pn" aria-label="Pages">${l(S.prev, 'p')}${l(S.next, 'n')}</nav>`;
}

const credit = (ctx) => `<footer class="hg-end"><span>${A(ctx.brand.name)} brand guidelines, ${A(ctx.versionLine)}</span><span>Made with UIL4B</span></footer>`;

export const guideSite = {
  css(ctx) { return hgCss(ctx); },
  shell(ctx, S) {
    const n = S.isFront ? 0 : sectionOf(S, S.unit);
    return `<div class="hg" data-gs-root>${bar(ctx, S)}<main id="main" class="hg-main"><div class="hg-pg${S.isFront ? ' hg-pg--cover' : ''}"><article class="hg-sheet">${S.body}${S.isFront ? '' : pn(S)}</article>${n ? tabOf(n) : ''}</div>${credit(ctx)}</main></div>`;
  },
  front(ctx, S) {
    const B = ctx.brand, R = roles(ctx), g = ctx.logo.geos.colour, W = { w: 640, m: 480, n: 264 }, H = map3((k) => (W[k] * g.h) / g.w);
    const logo = `<div class="hg-hz" style="${sv('hz', W)}">${logoOn(ctx, 'colour', R.field, 640, B.name + ' logo')}</div>`;
    const band = `<div class="hg-band hg-on-field"><div class="hg-band__in"><h1 class="hg-h1">${A(B.name)} brand guidelines</h1><p class="hg-ver">${A(ctx.versionLine)}</p>`
      + fig(logo, { h: lab(ctx, W), v: lab(ctx, H), cls: 'hg-fig--cover' })
      + `<p class="hg-coverline">Every size in these guidelines is given in x. One x is ${xOf(ctx)} px on screen, the step of the spacing scale.</p>${ruler(ctx, 'cv', map3((k) => [24, 24 + W[k]]), { draw: true })}</div></div>`;
    const rows = S.sections.map((s, i) => [String(i + 1), A(s.title), `<ul class="hg-pl">${s.units.map((u) => `<li><a href="${A(u.file)}">${A(u.title)}</a></li>`).join('')}</ul>`]);
    return `${band}<div class="hg-front"><div class="hg-rh" aria-hidden="true"><span>${A(B.name)} brand guidelines</span><span>Contents</span></div><h2 class="hg-h2 hg-h2--big" id="hg-contents">Contents</h2>${reg(rows, 'hg-reg--toc')}</div>`;
  },
  page(ctx, id) { return (BUILD[id] || FALLBACK)(ctx, id); },
  adapt: { strip: [], noLink: '.hg-mono,.hg-no,.hg-dl,.hg-rl__n,.hg-pn__d' },
  darkSample: ['cover', 'palette', 'logo-grounds'],
};
