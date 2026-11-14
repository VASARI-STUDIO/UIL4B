// Theme 30, Fluted, lane hg: the guide site, the webpage version of the guidelines (exports only guideSite). It is the brand book's lobby wall run down a page per
// guideline: a sticky running head (logo, the two sites, contents, the mode switch), then the page's own wall (running head, two-tone headline, lead, one big thing,
// the band of reeded glass across the full width holding that page's data, the key under it, the specs as hairline rows) and previous and next at the foot.
// The cover (index.html) opens on the brand's own initial and the palette by share in the glass; the contents are every page by section.
import { A, v, logoModes, glass, sheet } from './lane-hg-lib.js';
import { initial } from './helpers.js';
import { guideCss } from './lane-hg-css.js';
import { hasPage, pageSpec } from './lane-hg-pages.js';
import { shareFields } from './lane-bk-glass.js';

const pad = (n, k = 3) => String(n).padStart(k, '0');
function infoOf(ctx, id) {
  for (const s of ctx.sections) {
    const pg = s.pages.find((x) => x.id === id);
    if (pg) return { section: s.title, no: pad(typeof pg.no === 'number' ? pg.no : ctx.pageNo(id)), title: pg.title };
  }
  return { section: '', no: '', title: id };
}
const unitMap = (S) => { const m = {}; for (const u of S.units || []) for (const i of (u.ids || [u.id])) m[i] = u; return m; };

const extraCss = `
.hg-initial{display:block;font-size:min(360px,78cqw);line-height:.78;color:var(--ink);text-align:right;padding-top:.08em}
.hg-contents{display:flex;flex-direction:column}
.hg-contents > li{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));column-gap:16px;padding:20px 0;border-top:1px solid var(--hair)}
.hg-contents > li:last-child{border-bottom:1px solid var(--hair)}
.hg-contents__s{grid-column:1 / span 3;font:500 15px/20px var(--hg-chrome);color:var(--ink);padding:6px 0}
.hg-contents__l{grid-column:4 / span 5;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 24px}
.hg-contents__l a{display:flex;gap:12px;align-items:baseline;padding:6px 0;font:400 16px/24px var(--hg-body);color:var(--soft);text-decoration:none}
@media (hover:hover){.hg-contents__l a:hover{color:var(--ink);text-decoration:underline}}
@media (max-width:840px){.hg-contents > li{grid-template-columns:minmax(0,1fr)}.hg-contents__s,.hg-contents__l{grid-column:1}.hg-contents__l{grid-template-columns:minmax(0,1fr)}}`;

export const guideSite = {
  css(ctx) { return guideCss(ctx) + extraCss; },
  shell(ctx, S) {
    const B = ctx.brand, id = S.unit && S.unit.id;
    const toc = `<div class="hg-toc" id="hg-toc" data-open="false"><div class="hg-toc__in">${(S.sections || []).map((s) => `<div><p class="hg-toc__s">${A(s.title)}</p><ol>${s.units.map((u) => `<li><a class="hg-toc__a" href="${A(u.file)}"${u.id === id && !S.isFront ? ' aria-current="page"' : ''}><span class="hg-toc__n">${A(infoOf(ctx, u.id).no)}</span>${A(u.title)}</a></li>`).join('')}</ol></div>`).join('')}</div></div>`;
    const bar = `<header class="hg-bar"><div class="hg-bar__in"><a class="hg-brand" href="index.html" aria-label="${A(B.name)} brand guidelines, cover">${logoModes(ctx, 'colour', 132)}</a>
<nav class="hg-sites" aria-label="Sites"><a href="index.html" aria-current="true">Guidelines</a><a href="../ui-kit-html/index.html">UI kit</a></nav>
<button type="button" class="hg-btn" data-gs-toggle aria-controls="hg-toc" aria-expanded="false">Contents</button>
<div class="hg-mode" role="group" aria-label="Colour mode"><button type="button" data-mode="light">Light</button><button type="button" data-mode="dark">Dark</button></div></div>${toc}</header>`;
    const pn = (u, dir) => (u ? `<a href="${A(u.file)}" rel="${dir}"><span class="hg-pn__l">${dir === 'prev' ? 'Previous' : 'Next'}</span><span>${infoOf(ctx, u.id).no ? `${v(A(infoOf(ctx, u.id).no))} ` : ''}${A(u.title)}</span></a>` : '<span></span>');
    const foot = `<footer class="hg-foot">${S.isFront ? '' : `<nav class="hg-pn" aria-label="Previous and next">${pn(S.prev, 'prev')}${pn(S.next, 'next')}</nav>`}<p class="hg-fine">${A(B.name)} brand guidelines, version ${v(A(B.version.number))}, ${A(ctx.date)}</p></footer>`;
    return `<div data-gs-root>${bar}<main id="hg-main" class="hg-main" tabindex="-1">${S.body}</main>${foot}</div>`;
  },
  front(ctx, S) {
    const B = ctx.brand, U = unitMap(S), cols = ctx.colours.slice().sort((a, b) => b.share - a.share);
    const strong = ctx.roles.dark.action, sc = cols.find((c) => c.hex.toLowerCase() === strong.toLowerCase()) || cols[0], rest = cols.filter((c) => c !== sc);
    const its = [{ value: 1, fill: sc.hex, name: A(sc.name), val: `${Math.round(sc.share * 100)}%` }, ...rest.map((c) => ({ value: 0, fill: c.hex, name: A(c.name), val: `${Math.round(c.share * 100)}%` }))];
    const fields = (D) => shareFields(ctx, D.W).map((f) => ({ ...f, fill: f.c === sc ? 'g' : f.fill }));
    const layout = (D) => { const f = shareFields(ctx, D.W).find((x) => x.c === sc), a = Math.ceil(f.x / 12) * 12; return [{ x: a, w: Math.floor((f.x + f.w) / 12) * 12 - a }, ...rest.map(() => ({ x: 0, w: 0 }))]; };
    const band = glass(ctx, 'cover', its, { label: `The ${B.name} palette by share: ${cols.map((c) => `${c.name} ${Math.round(c.share * 100)}%`).join(', ')}`, fields, layout, settle: true });
    const toc = `<h2 class="hg-h2">Contents</h2><ol class="hg-contents">${ctx.sections.map((s) => `<li><p class="hg-contents__s">${A(s.title)}</p><ol class="hg-contents__l">${s.pages.map((pg) => `<li><a href="${A(U[pg.id] ? U[pg.id].file : 'index.html')}"><span class="hg-v">${A(infoOf(ctx, pg.id).no)}</span>${A(pg.title)}</a></li>`).join('')}</ol></li>`).join('')}</ol>`;
    return sheet(ctx, 'cover', {
      no: '', section: `${B.name} brand guidelines`, l1: A(B.lines.primary), l2: `Version ${A(B.version.number)}`, lead: A(B.description), note: 'In the glass, the palette by share',
      big: `<span class="hg-initial hg-disp" aria-hidden="true">${A(initial(ctx))}</span>`, band, body: toc, cls: 'hg-sec--cover',
    });
  },
  page(ctx, id) {
    const inf = infoOf(ctx, id);
    if (!hasPage(id)) return sheet(ctx, id, { no: inf.no, section: inf.section, title: inf.title, l1: A(inf.title) });
    return sheet(ctx, id, { no: inf.no, section: inf.section, title: inf.title, ...pageSpec(ctx, id) });
  },
  adapt: { strip: [], noLink: '.hg-v' },
  darkSample: ['cover', 'palette', 'logo-grounds'],
};
