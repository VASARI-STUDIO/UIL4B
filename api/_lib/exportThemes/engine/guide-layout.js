/**
 * guide-layout.js: the theme-neutral half of a themed A4 style guide.
 *
 * A themed guide (themes/<id>/lane-guide.js) draws nine pages with absolute coordinates at 794 x 1123 and measures its text with the
 * fonts' own metrics. Everything below is what every such guide needs and none of them should write twice. A theme keeps only its
 * look (the foot strip, the head, the title, each page's drawing) and its copy (guide-copy.js).
 *
 * What a theme author gets
 * ------------------------
 *   PAGE                  the frame: { W, H, X0, XR, CW, COL, COLW }. Three columns 216 wide from x 48 to 746 (CW 698). Name your own
 *                         foot (the strip's top and height) and the lowest y content may reach (BOT) in the theme.
 *   r1(n), sum(list)      round to one decimal (coordinates), and add up.
 *   hook(ctx, patch)      what the pages say that the engine's facts do not, for style-guide.md (see engine/styleguide.js, ctx.mdHooks).
 *   hookAdd(ctx, key, rows)  the same, appending rows to a hook that is a list.
 *   withHooks(ctx, draw)  runs a page and puts the hooks back as they were if it throws, so the md never describes a page left out.
 *   pageSection(id, inner)   the page wrapper every document and the snapshot test read: <section class="pg" data-page="id">.
 *   PAGE_IDS, makeGuide(pages, opts)  the nine page ids in reading order, and the `guide` export a theme's index.js merges.
 *   stacker({theme, bottom, footWarn})  returns flow(id, top, sections, {gap, maxGap}): stacks sections down a page and shares the
 *                         spare height by weight (see below). Throws when the sections do not fit; warns when much is left at the foot.
 *   firstFit(candidates, fits)  the first candidate that fits, or undefined: a theme says what it does then (throw, shorten, drop).
 *   headLabel(name, fits, tail) the running head's left text: "<name> <tail>", then the name, then the name cut short with an ellipsis.
 *   drawWithFewer(draw, start)  re-draws a page with fewer logo tiles when it is too tall (see below).
 *   slotW, logoArt, SLOT_MIN_H  the slot edition draws a frame labelled Logo where the mark would be; these keep it tall enough.
 *
 * Sections and flow
 * -----------------
 * A section is { h, flex?, draw(y, extra) }. `h` is its natural height in px. `flex` is the most extra height it can use (px) and
 * `draw` is told how much it got in `extra`. Spare height goes first to the sections with `flex`, shared by weight and never more
 * than each asks for; then to the gaps between sections, up to `maxGap`. Whole pixels throughout, so the arithmetic is the same on
 * every run and every page ends where it should. A page whose sections do not fit throws: the route leaves that page out and says so.
 *
 * Logo retry
 * ----------
 * The logo page can carry many colourways. Draw it with `drawWithFewer((max) => ..., 6)`; when the page is too tall, return
 * `{ fewer: n }` from the draw (n smaller than max) and it is drawn again with at most n tiles. Return the page html otherwise.
 * Write the md hooks after the check, so the retry never leaves a second copy.
 */
export const PAGE = { W: 794, H: 1123, X0: 48, XR: 746, CW: 698, COL: [48, 289, 530], COLW: 216 };

export const r1 = (n) => Math.round(n * 10) / 10;
export const sum = (a) => a.reduce((x, y) => x + y, 0);

// ---- the markdown hooks ----
export const hook = (ctx, patch) => { ctx.mdHooks = { ...(ctx.mdHooks || {}), ...patch }; };
export const hookAdd = (ctx, key, rows) => hook(ctx, { [key]: [...((ctx.mdHooks || {})[key] || []), ...rows] });
export function withHooks(ctx, draw) {
  const kept = ctx.mdHooks;
  try { return draw(ctx); } catch (err) { ctx.mdHooks = kept; throw err; }
}

// ---- the page ----
export const pageSection = (id, inner) => `<section class="pg" data-page="${id}">${inner}</section>`;
export const PAGE_IDS = ['cover', 'logo', 'colour', 'ruler', 'applied', 'type', 'contrast', 'tokens', 'usage'];
// the `guide` object a theme exports: its pages (cover, logo ... each (ctx) => html), the order they read in, and the pages added to the engine's seven
export const makeGuide = (pages, { order = PAGE_IDS, extra = ['ruler', 'applied'] } = {}) => ({ ...pages, extra: () => extra, order: () => order });

// ---- spare height ----
// Content fills the page: sections stack from `top`; spare height goes first to the sections that can grow (flex, in px), then to the gaps (up to maxGap).
export function stacker({ theme, bottom, footWarn = 70 }) {
  return function flow(id, top, sections, { gap = 28, maxGap = 60 } = {}) {
    const n = sections.length, nat = sum(sections.map((s) => s.h)) + gap * (n - 1);
    let slack = bottom - top - nat;
    if (slack < 0) throw new Error(`${theme} guide: ${id} is ${Math.ceil(-slack)} px too tall (top ${top}, sections ${sections.map((s) => Math.round(s.h)).join(', ')})`);
    const flexTotal = sum(sections.map((s) => s.flex || 0)), extra = sections.map(() => 0);
    if (flexTotal) { const give = Math.min(slack, flexTotal); sections.forEach((s, i) => { extra[i] = Math.floor(((s.flex || 0) / flexTotal) * give); }); slack -= sum(extra); }
    const g = n > 1 ? Math.min(maxGap, gap + Math.floor(slack / (n - 1))) : gap;
    if (n > 1) slack -= (g - gap) * (n - 1);
    if (slack > footWarn) console.warn(`  ${theme} guide: ${id} leaves ${slack} px at the foot`);
    let y = top, html = '';
    sections.forEach((s, i) => { html += s.draw(y, extra[i]); y += s.h + extra[i] + g; });
    return html;
  };
}

// ---- fit or fall back ----
export const firstFit = (candidates, fits) => candidates.find((c) => fits(c));

// the running head's left text: the full title, the name alone, then the name cut short ("Bright Harbour Stu…")
export function headLabel(name, fits, tail = 'style guide') {
  const left = firstFit([`${name} ${tail}`, name], fits);
  if (left) return left;
  let n = name;
  while (n.length > 1 && !fits(`${n.trimEnd()}…`)) n = n.slice(0, -1);
  return `${n.trimEnd()}…`;
}

// a draw that may ask to be drawn again with fewer logo tiles: it returns { fewer: n } (n under the max it was given) or the page
export function drawWithFewer(draw, start = 6) {
  let max = start;
  for (;;) {
    const out = draw(max);
    if (out && typeof out === 'object' && 'fewer' in out) {
      if (!(out.fewer < max) || out.fewer < 1) throw new Error('guide layout: a logo retry must ask for fewer tiles');
      max = out.fewer;
    } else return out;
  }
}

// ---- the logo in the slot edition ----
// The slot edition draws a frame, and every frame carries the one word Logo. A frame under 22 px tall cannot hold the word inside its dashed edge, so no page draws one:
// each width is chosen so the frame is tall enough (a frame that is not says so here, and the page is changed)
export const SLOT_MIN_H = 22;
export const slotW = (ctx, w) => Math.max(w, Math.ceil((SLOT_MIN_H * ctx.logo.geos.colour.w) / ctx.logo.geos.colour.h));
const slotLabel = (ctx, w, id = 'colour') => {
  const h = (w * ctx.logo.geos[id].h) / ctx.logo.geos[id].w;
  if (h < SLOT_MIN_H - 0.5) console.warn(`  ${ctx.theme.name} guide: a slot frame ${Math.round(w)} px wide is only ${Math.round(h)} px tall and cannot hold its label`);
  return 'Logo';
};
export const logoArt = (ctx, id, w, o = {}) => ctx.logo.html(id, { width: r1(w), ...o, ...(ctx.edition === 'slot' ? { label: slotLabel(ctx, w, id) } : {}) });
