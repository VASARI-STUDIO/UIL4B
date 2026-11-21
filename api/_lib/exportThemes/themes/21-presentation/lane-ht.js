// Lane ht: theme 21's two web parts, the guidelines site and the UI kit site, as the deck published to the web.
// Guidelines: every page is its slide at its own size on the dark field (one thing a screen), then the slide's notes on the page
// ground (one big line and the rules as readable text, so the page works on a phone where the slide is a picture), then the next
// slide as a field of the action colour. The front is the cover slide and the contents as the deck's stripes.
// UI kit (lane-ht-kit.js): the same bar and fields, the live components where the slide would be.
// The engine (engine/guide-site.js, engine/kit-site.js) owns files, links, behaviour, check and shots; this lane owns markup and CSS.
import { guidelines } from './guidelines.js';
import { A, darkF, actF, fieldStyle, fitSize, bar, tocPanel, nextField, skipLink, contentsGrid } from './lane-ht-lib.js';
import { htCss } from './lane-ht-css.js';
import { NOTES } from './lane-ht-notes.js';
import { kitSite } from './lane-ht-kit.js';

export { kitSite };

const docName = (ctx) => `${ctx.brand.name} guidelines`;
// pages whose slide is a picture of a table or a spec: the slide is not drawn at all, the page is the notes alone, laid out as a spread
// (the colours as fields with their values, the type as a spec list, the misuse as a grid of tiles), so each point is said once.
// Every other page shows its slide and then the notes, which add what the slide cannot carry.
const REFLOW = new Set(['palette', 'proportion', 'contrast', 'colour-values', 'typefaces', 'hierarchy', 'type-in-use', 'logo-misuse']);
// a big line's cap follows its length, so a sentence sets as a paragraph of display type and a word as a poster
const bigCap = (t) => (String(t).length > 90 ? 36 : String(t).length > 44 ? 48 : 72);
const big = (ctx, t, cls = 'ht-big') => `<p class="ht-d ${cls}" style="--bs:${fitSize(ctx, [t], 0.94, bigCap(t), 18)};--bn:${String(t).length > 44 ? 30 : String(t).length > 20 ? 44 : 72}px">${A(t)}</p>`;

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
  // A spread page has no slide at any width: the lead is its title and the notes are the page.
  const p = ctx.pages.find((x) => x.id === id), spread = REFLOW.has(id);
  const lead = `<section class="ht-ml${spread ? ' ht-ml--spread' : ''}" aria-label="Page heading" style="${fieldStyle(ctx, darkF(ctx), 'site narrow lead')}"><p class="ht-ml__hd"><span>${A(docName(ctx))}</span><span class="num">${String(ctx.pageNo(id)).padStart(3, '0')}</span></p><h1 class="ht-d ht-ml__t" style="--bs:${fitSize(ctx, [p.title], 0.9, 96, 32)}">${p.ref ? `<b class="num">${A(p.ref)}</b>` : ''}${A(p.title)}</h1></section>`;
  return `${lead}${spread ? '' : stage(ctx, 'slide', slideOf(ctx, id))}
<section class="ht-notes${spread ? ' ht-notes--spread' : ''}" aria-label="${spread ? 'Page' : 'Notes'}"><div class="ht-bigc">${big(ctx, n.big)}</div><div class="ht-nb">${n.html}</div></section>`;
}

// index.html: the cover slide, then the contents as stripes of the deck's fields, a section to a stripe
function front(ctx, S) {
  const sections = S.sections.map((x) => ({ n: x.n, title: x.title, pages: x.units.map((u) => ({ href: u.file, ref: u.ref, title: u.title })) }));
  return `${stage(ctx, 'cover', guidelines.cover(ctx))}
<section class="ht-cv" aria-labelledby="ht-cv-h"><h1 class="ht-d ht-cv__t" id="ht-cv-h" style="--bs:${fitSize(ctx, [docName(ctx)], 0.94, 96, 32)}">${A(docName(ctx))}</h1><p class="ht-cv__l">${A(ctx.brand.lines.primary)}</p></section>
${contentsGrid(ctx, sections)}`;
}

function shell(ctx, S) {
  const u = S.unit, file = (x) => x && { href: x.file, ref: x.ref, title: x.title };
  const sections = S.sections.map((s) => ({ n: s.n, title: s.title, pages: s.units.map((x) => ({ id: x.id, ref: x.ref, title: x.title })) }));
  const href = (id) => S.units.find((x) => x.id === id).file;
  const no = u.front ? 1 : ctx.pageNo(u.id);
  const toggle = `<button class="ht-btn" type="button" data-gs-toggle aria-expanded="false" aria-controls="ht-toc">Contents</button>`;
  const toc = tocPanel(ctx, { id: 'ht-toc', sections, href, current: u.id, front: 'Cover and contents' });
  return `<div class="ht" data-gs-root data-page="${u.id}">
${skipLink()}
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
