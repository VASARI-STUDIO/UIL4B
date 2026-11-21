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
import { hasPh, nameOf, docOf, siteCtx, NOT_WRITTEN } from './lane-ht-clean.js';

export { kitSite };

const docName = (ctx) => docOf(ctx, 'guidelines');
// pages whose slide is a picture of a table or a spec: the slide is not drawn at all, the page is the notes alone, laid out as a spread
// (the colours as fields with their values, the type as a spec list, the misuse as a grid of tiles), so each point is said once.
// Every other page shows its slide and then the notes, which add what the slide cannot carry.
const REFLOW = new Set(['palette', 'proportion', 'contrast', 'colour-values', 'typefaces', 'hierarchy', 'type-in-use', 'logo-misuse']);
// pages whose slide already says everything the notes would: the notes are for the narrow layout alone, where the slide is not drawn
const COVERED = new Set(['intro', 'personality', 'voice', 'write-this', 'messaging', 'logo', 'logo-versions', 'photo-direction']);
// a big line's cap follows its length, so a sentence sets as a paragraph of display type and a word as a poster
const bigCap = (t) => (String(t).length > 90 ? 36 : String(t).length > 44 ? 48 : 72);
const big = (ctx, t, cls = 'ht-big') => `<p class="ht-d ${cls}" style="--bs:${fitSize(ctx, [t], 0.94, bigCap(t), 18)};--bn:${String(t).length > 44 ? 30 : String(t).length > 20 ? 44 : 72}px">${A(t)}</p>`;

// the slide at its own size, zoomed to the column below 1280 (it is a picture of the PDF page, its text kept as text).
// Below 841 the engine sets --fit on [data-gs-fit]; above it the CSS sets the zoom per breakpoint.
const stage = (ctx, id, html) => `<section class="ht-stage" id="${id}" aria-label="Slide" style="${fieldStyle(ctx, darkF(ctx), 'site stage')}"><div class="ht-fit"><div class="ht-slides" data-gs-fit>${html}</div></div></section>`;
// a slide the deck cannot draw for this brand (it needs a photo or a colourway the brand lacks): the deck's plain title slide,
// the running head over the action field and the title at display size
// A slide the page cannot draw for this brand is not drawn at all (the page's own title leads it). So is a slide that holds a placeholder
// (words the project has not written: a published page carries no box that asks for them) and, while the brand has no name, a slide
// that would set the logo (there is nothing to set). The slide is drawn from the context that sets the brand name where the logo goes.
const slideOf = (ctx, id) => {
  const draw = (c) => { try { return guidelines[id](c) || ''; } catch (e) { return ''; } };
  const raw = draw(ctx);
  return !raw || hasPh(raw) || (!nameOf(ctx) && /logo-slot/.test(raw)) ? '' : draw(siteCtx(ctx));
};

// the text a block of notes carries, for the test of whether there is anything to print
const hasText = (html) => !!String(html || '').replace(/<[^>]*>/g, '').trim();

function page(ctx0, id) {
  const ctx = siteCtx(ctx0);
  let n = null;
  try { n = NOTES[id] ? NOTES[id](ctx) : null; } catch (e) { n = null; }
  const text = n && !hasPh(n.big) && n.big ? n.big : '';
  const notes = n && !hasPh(n.html) && hasText(n.html) ? n.html : '';
  // below 841 the 1280 px slide would be a 330 px thumbnail nobody can read, so the CSS swaps it for this lead: the deck's running head
  // and the page's title at display size on the same dark field. The slide stays in the markup for the wide layouts.
  // A spread page has no slide at any width: the lead is its title and the notes are the page.
  const slide = REFLOW.has(id) ? '' : slideOf(ctx0, id);
  const p = ctx.pages.find((x) => x.id === id), spread = !slide;
  const lead = `<section class="ht-ml${spread ? ' ht-ml--spread' : ''}" aria-label="Page heading" style="${fieldStyle(ctx, darkF(ctx), 'site narrow lead')}"><p class="ht-ml__hd"><span>${A(docName(ctx))}</span><span class="num">${String(ctx.pageNo(id)).padStart(3, '0')}</span></p><h1 class="ht-d ht-ml__t" style="--bs:${fitSize(ctx, [p.title], 0.9, 96, 32)}">${p.ref ? `<b class="num">${A(p.ref)}</b>` : ''}${A(p.title)}</h1></section>`;
  // nothing real to print and nothing drawn: the one quiet line, once
  const body = `${text ? `<div class="ht-bigc">${big(ctx, text)}</div>` : ''}${notes || (!text && !slide) ? `<div class="ht-nb">${notes || NOT_WRITTEN}</div>` : ''}`;
  return `${lead}${slide ? stage(ctx, 'slide', slide) : ''}${body ? `
<section class="ht-notes${spread ? ' ht-notes--spread' : ''}${text ? '' : ' ht-notes--bare'}${slide && COVERED.has(id) ? ' ht-notes--narrow' : ''}" aria-label="${spread ? 'Page' : 'Notes'}">${body}</section>` : ''}`;
}

// index.html: the cover slide, then the contents as stripes of the deck's fields, a section to a stripe
function front(ctx0, S) {
  const ctx = siteCtx(ctx0), cover = slideOf(ctx0, 'cover'), line = ctx.brand.lines.primary;
  const sections = S.sections.map((x) => ({ n: x.n, title: x.title, pages: x.units.map((u) => ({ href: u.file, ref: u.ref, title: u.title })) }));
  return `${cover ? stage(ctx, 'cover', cover) : ''}
<section class="ht-cv" aria-labelledby="ht-cv-h"><h1 class="ht-d ht-cv__t" id="ht-cv-h" style="--bs:${fitSize(ctx, [docName(ctx)], 0.94, 96, 32)}">${A(docName(ctx))}</h1>${line ? `<p class="ht-cv__l">${A(line)}</p>` : ''}</section>
${contentsGrid(ctx, sections)}`;
}

function shell(ctx0, S) {
  const ctx = siteCtx(ctx0);
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
