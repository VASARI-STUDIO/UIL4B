// Lane ht: theme 21's two web parts, the guidelines site and the UI kit site, as the deck published to the web.
// Guidelines: every page is its slide at its own size on the dark field (one thing a screen), then the slide's notes on the page
// ground (one big line and the rules as readable text, so the page works on a phone where the slide is a picture), then the next
// slide as a field of the action colour. The front is the cover slide and the contents as the deck's stripes.
// UI kit (lane-ht-kit.js): the same bar and fields, the live components where the slide would be.
// The engine (engine/guide-site.js, engine/kit-site.js) owns files, links, behaviour, check and shots; this lane owns markup and CSS.
import { guidelines } from './guidelines.js';
import { A, darkF, actF, panelF, fieldStyle, fitSize, bar, tocPanel, nextField } from './lane-ht-lib.js';
import { htCss } from './lane-ht-css.js';
import { NOTES } from './lane-ht-notes.js';
import { kitSite } from './lane-ht-kit.js';

export { kitSite };

const docName = (ctx) => `${ctx.brand.name} brand guidelines`;
// a big line's cap follows its length, so a sentence sets as a paragraph of display type and a word as a poster
const bigCap = (t) => (String(t).length > 90 ? 36 : String(t).length > 44 ? 48 : 72);
const big = (ctx, t, cls = 'ht-big') => `<p class="ht-d ${cls}" style="--bs:${fitSize(ctx, [t], 0.94, bigCap(t), 18)};--bn:${String(t).length > 44 ? 30 : 72}px">${A(t)}</p>`;

// the slide at its own size, zoomed to the column below 1280 (it is a picture of the PDF page, its text kept as text).
// Below 841 the engine sets --fit on [data-gs-fit]; above it the CSS sets the zoom per breakpoint.
const stage = (ctx, id, html) => `<section class="ht-stage" id="${id}" aria-label="Slide" style="${fieldStyle(ctx, darkF(ctx), 'site stage')}"><div class="ht-fit"><div class="ht-slides" data-gs-fit>${html}</div></div></section>`;
// a slide the deck cannot draw for this brand (it needs a photo or a colourway the brand lacks): the deck's plain title slide,
// the running head over the action field and the title at display size
const titleSlide = (ctx, id) => {
  const p = ctx.pages.find((x) => x.id === id), hex = actF(ctx);
  return `<section class="pg ht-ps" data-page="${id}" style="${fieldStyle(ctx, hex, 'site title slide', 15)}"><p class="ht-ps__hd"><span><b class="num">${A(p.ref || '')}</b>${A(p.title)}</span><span>${A(docName(ctx))}</span></p><p class="ht-d ht-ps__t" style="font-size:${fitSize(ctx, [p.title], 0.8, 160, 48)}">${A(p.title)}</p><span class="ht-ps__fo num">${ctx.pageNo(id)}</span></section>`;
};
const slideOf = (ctx, id) => { try { return guidelines[id](ctx); } catch (e) { return titleSlide(ctx, id); } };

function page(ctx, id) {
  const n = NOTES[id] ? NOTES[id](ctx) : { big: ctx.pages.find((p) => p.id === id).title, html: '' };
  // below 841 the 1280 px slide would be a 330 px thumbnail nobody can read, so the CSS swaps it for this lead: the deck's running head
  // and the page's title at display size on the same dark field. The slide stays in the markup for the wide layouts.
  const p = ctx.pages.find((x) => x.id === id);
  const lead = `<section class="ht-ml" aria-label="Page" style="${fieldStyle(ctx, darkF(ctx), 'site narrow lead')}"><p class="ht-ml__hd"><span>${A(docName(ctx))}</span><span class="num">${String(ctx.pageNo(id)).padStart(3, '0')}</span></p><p class="ht-d ht-ml__t" style="--bs:${fitSize(ctx, [p.title], 0.9, 72, 32)}">${A(p.title)}</p></section>`;
  return `${lead}${stage(ctx, 'slide', slideOf(ctx, id))}
<section class="ht-notes" aria-label="Notes"><div class="ht-bigc">${big(ctx, n.big)}</div><div class="ht-nb">${n.html}</div></section>`;
}

// index.html: the cover slide, then the contents as stripes of the deck's fields, a section to a stripe
function front(ctx, S) {
  const grounds = [darkF(ctx), actF(ctx), panelF(ctx)];
  const hs = fitSize(ctx, S.sections.map((s) => s.title), 0.9, 72, 32);
  const rows = S.sections.map((s, i) => `<li style="${fieldStyle(ctx, grounds[i % 3], 'site contents section', 32)}"><h2 class="ht-d ht-ix__h" style="--bs:${hs}"><b class="num">${s.n}</b>${A(s.title)}</h2><ol>${s.units.map((u) => `<li><a href="${u.file}"><span class="num">${u.ref}</span><span>${A(u.title)}</span></a></li>`).join('')}</ol></li>`).join('');
  return `${stage(ctx, 'cover', guidelines.cover(ctx))}
<section class="ht-cv" aria-labelledby="ht-cv-h"><h1 class="ht-d ht-cv__t" id="ht-cv-h" style="--bs:${fitSize(ctx, [docName(ctx)], 0.94, 96, 32)}">${A(docName(ctx))}</h1><p class="ht-cv__l">${A(ctx.brand.lines.primary)}</p></section>
<ol class="ht-ix" id="contents" aria-label="Contents">${rows}</ol>`;
}

function shell(ctx, S) {
  const u = S.unit, file = (x) => x && { href: x.file, ref: x.ref, title: x.title };
  const sections = S.sections.map((s) => ({ n: s.n, title: s.title, pages: s.units.map((x) => ({ id: x.id, ref: x.ref, title: x.title })) }));
  const href = (id) => S.units.find((x) => x.id === id).file;
  const no = u.front ? 1 : ctx.pageNo(u.id);
  const toggle = `<button class="ht-btn" type="button" data-gs-toggle aria-expanded="false" aria-controls="ht-toc">Contents</button>`;
  const mode = `<div class="ht-mode" role="group" aria-label="Colour mode"><button type="button" data-mode="light" aria-pressed="true">Light</button><button type="button" data-mode="dark" aria-pressed="false">Dark</button></div>`;
  const toc = tocPanel(ctx, { id: 'ht-toc', sections, href, current: u.id, front: 'Cover and contents' }).replace('<ol class="ht-toc__l">', `${mode}<ol class="ht-toc__l">`);
  return `<div class="ht" data-gs-root data-page="${u.id}">

${bar(ctx, { home: 'index.html', doc: docName(ctx), ref: u.ref, title: u.front ? 'Cover and contents' : u.title, no, toggle })}
${toc}
<main id="ht-main" tabindex="-1" data-rd-doc>${S.body}</main>
${nextField(ctx, { next: file(S.next), prev: file(S.prev) })}
<footer class="ht-foot"><span>${A(docName(ctx))}</span><span>${A(ctx.versionLine)}</span></footer>
</div>`;
}

export const guideSite = {
  css: htCss, shell, front, page,
  // the slides keep their own type: nothing in them is linked, and literal values are never read as references
  adapt: { strip: [], minStack: 99, noLink: '.pg,.ht-m' },
  darkSample: ['index', 'personality', 'logo-versions', 'palette', 'contrast', 'hierarchy'],
};
