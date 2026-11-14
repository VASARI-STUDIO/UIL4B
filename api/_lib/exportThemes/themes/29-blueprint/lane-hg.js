// Theme 29 (Blueprint), lane hg: the guide site (guideSite). The guidelines on the web as the drawing set: one sheet per page, each on the cool film in its
// own frame, with zone numbers in its margin and a title strip down its right edge (a ruled title block at the head on a phone). The front page is the
// title sheet and the drawing register: every page, by section. Prev and next close each sheet like a transmittal.
import { baseCss } from './lane-hg-css.js';
import { chromeCss, pagesCss } from './lane-hg-css2.js';
import { pages1 } from './lane-hg-pages1.js';
import { pages2 } from './lane-hg-pages2.js';
import { A, pad2, sheet, dimH, dimV, fitDisp, cq, logoFilm, geoH, label } from './lane-hg-parts.js';

const PAGES = { ...pages1, ...pages2 };

const register = (S, cur) => `<div class="hg-panel__g">${S.sections.map((s) => `<div class="hg-reg"><h2>${pad2(s.n)} ${A(s.title)}</h2><ol>${s.units.map((u) => `<li><a href="${A(u.file)}"${u.id === cur ? ' aria-current="page"' : ''}><span class="hg-m">${A(u.ref || '')}</span><span>${A(u.title)}</span></a></li>`).join('')}</ol></div>`).join('')}</div>`;

function cover(ctx, S) {
  const B = ctx.brand, line = B.lines.primary, W = { s: 280, m: 400, l: 640 };
  const hs = { l: fitDisp(ctx, line, 900, 2, [104, 96, 88, 80, 72, 64, 56]), s: fitDisp(ctx, line, 320, 4, [44, 40, 36, 32, 28]) };
  const vals = (f) => ({ s: f(W.s), m: f(W.m), l: f(W.l) });
  const ga = `<figure class="hg-ga" aria-label="The logo, ${W.l} px wide on a wide screen"><div class="hg-ga__lg">${dimH(vals(String))}${logoFilm(ctx, 'colour', W.l)}${dimV(vals((w) => String(geoH(ctx, 'colour', w))))}</div></figure>`;
  const reg = `<div class="hg-block">${label('Drawing register')}<div class="hg-regs">${S.sections.map((s) => `<div class="hg-reg"><h2>${pad2(s.n)} ${A(s.title)}</h2><ol>${s.units.map((u) => `<li><a href="${A(u.file)}"><span class="hg-m">${A(u.ref || '')}</span><span>${A(u.title)}</span><span class="hg-m">${pad2(ctx.pageNo(u.id))}</span></a></li>`).join('')}</ol></div>`).join('')}</div></div>`;
  const inner = `${ga}<div class="hg-ov"><p class="hg-hero hg-disp" style="--fl:${cq(hs.l, 900)};--fs:${cq(hs.s, 320)}">${A(line)}</p><p class="hg-place">${A([B.place || B.city, ctx.versionLine].filter(Boolean).join(', '))}</p></div>${reg}`;
  return sheet(ctx, 'cover', { drawing: 'Brand guidelines', scale: '<span class="hg-m">1:1</span>, sizes in px', title: `${B.name} brand guidelines` }, inner);
}

export const guideSite = {
  css(ctx) { return `${baseCss(ctx)}\n${chromeCss()}\n${pagesCss(ctx)}\n.hg-regs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:32px 48px}\n@media (max-width:1199px){.hg-regs{grid-template-columns:repeat(2,minmax(0,1fr))}}\n@media (max-width:840px){.hg-regs{grid-template-columns:minmax(0,1fr)}}`; },
  shell(ctx, S) {
    const B = ctx.brand, u = S.unit;
    const logo = ctx.edition === 'slot'
      ? ctx.logo.html('horizontal', { width: 132, label: 'Logo' })
      : `<span class="hg-for-light">${ctx.logo.html('horizontal', { width: 132, colourway: 'colour', label: 'Logo' })}</span><span class="hg-for-dark">${ctx.logo.html('horizontal', { width: 132, colourway: 'reversed', label: 'Logo' })}</span>`;
    const top = `<header class="hg-top"><a class="hg-brand" href="index.html" aria-label="${A(B.name)} brand guidelines, start">${logo}</a>
<nav class="hg-links" aria-label="Sections"><a href="index.html"${S.isFront ? ' aria-current="page"' : ''}>Guidelines</a><a href="../ui-kit-html/index.html">UI kit</a></nav>
<button type="button" class="hg-btn" data-gs-toggle aria-controls="hg-contents" aria-expanded="false">Contents</button>
<div class="hg-mode" role="group" aria-label="Colour mode"><button type="button" data-mode="light">Light</button><button type="button" data-mode="dark">Dark</button></div></header>
<nav class="hg-panel" id="hg-contents" data-open="false" aria-label="Contents">${register(S, u && u.id)}</nav>`;
    const pn = S.isFront ? '' : `<nav class="hg-pn" aria-label="Previous and next page">${S.prev ? `<a href="${A(S.prev.file)}"><span class="hg-pn__k">Previous, <span class="hg-m">${A(S.prev.ref || '')}</span></span><span class="hg-pn__t">${A(S.prev.title)}</span></a>` : '<span></span>'}${S.next ? `<a href="${A(S.next.file)}"><span class="hg-pn__k">Next, <span class="hg-m">${A(S.next.ref || '')}</span></span><span class="hg-pn__t">${A(S.next.title)}</span></a>` : ''}</nav>`;
    return `<div data-gs-root class="hg-root">${top}<main id="main" tabindex="-1">${S.body}</main>${pn}<footer class="hg-foot"><span>${A(B.name)} brand guidelines, ${A(ctx.versionLine)}</span><span>Made with UIL4B</span></footer></div>`;
  },
  front(ctx, S) { return cover(ctx, S); },
  page(ctx, id) { const f = PAGES[id]; return f ? f(ctx) : ''; },
  adapt: { strip: [], noLink: '.hg-m' },
  darkSample: ['cover', 'palette', 'logo-grounds'],
};
