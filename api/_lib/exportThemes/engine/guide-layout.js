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
 *   inkFor(ctx, hex, {size, weight})  text on a colour the user chose: the brand's light text or surface, whichever reads better, and when
 *                         neither reaches the ratio the size needs, the engine's readableOn fallback (#111, #FAFAFA, then pure black or white).
 *                         Every swatch, tile and chip a guide writes on uses this, so no palette leaves a page without a passing ink.
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
 *
 * The phone document
 * ------------------
 * The pages are fixed A4 and cannot reflow, so on a phone they would be a shrunken poster. `screenGuide(ctx, ids)` builds the same facts
 * (colourFacts, typeLadder, contrastFacts, logoFacts, tokenGroups, usageFacts) as one single-column document. The route passes it to
 * `pageDoc` as `screen` for the site documents (index.html and each page's html) and never for the print/PDF document. `screenCss(ctx)`
 * shows it below 842 px (an A4 page plus a margin) and the A4 pages above that and in print. A theme does nothing for it: the colour
 * and font variables (--ink, --quiet, --hair, --ground, --display, --body, --bmono) are set from the brand's roles and faces, so the
 * edition wears the brand without wearing the theme. A theme that wants its own look can add rules after `.sg-screen` in its guideCss.
 */
import { colourFacts, typeLadder, contrastFacts, logoFacts, tokenGroups, usageFacts, GRADE_NOTE } from './styleguide.js';
import { esc } from './brand.js';
import { readableOn } from './color.js';

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
    if (slack < 0) throw Object.assign(new Error(`${theme} guide: ${id} is ${Math.ceil(-slack)} px too tall (top ${top}, sections ${sections.map((s) => Math.round(s.h)).join(', ')})`), { code: 'too_tall' });
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

// ---- the phone document ----
export const SCREEN_BREAK = 842;
const SCREEN_IDS = ['logo', 'colour', 'type', 'contrast', 'tokens', 'usage'];
const TITLES = { logo: 'Logo', colour: 'Colour', type: 'Type', contrast: 'Contrast', tokens: 'Tokens', usage: 'Usage' };
const pctText = (s) => `${+(s * 100).toFixed(1)}%`;
const wName = (w) => ({ 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold', 900: 'Black' })[w] || String(w);

// the rules that show the phone document below the break and the A4 pages everywhere else (and always in print)
export function screenCss(ctx) {
  const L = ctx.roles.light, B = ctx.brand, d = B.fonts.display, b = B.fonts.body, mo = B.fonts.mono;
  return `.sg-screen{display:none}
@media screen and (max-width:${SCREEN_BREAK - 1}px){
.sg-pages{display:none}
.sg-screen{display:block;--ink:${L.text};--quiet:${L.quiet};--hair:${L.divider};--ground:${L.surface};--display:'${d.family}',sans-serif;--body:'${b.family}',sans-serif;--bmono:'${(mo || b).family}',monospace;background:var(--ground);color:var(--ink);font:400 16px/24px var(--body);padding:24px 20px 48px;min-height:100vh;overflow-wrap:anywhere;-webkit-font-smoothing:antialiased}
body.stack:has(.sg-screen){padding:0}
.sg-screen h1,.sg-screen h2,.sg-screen h3,.sg-screen p,.sg-screen ul{margin:0;padding:0}
.sg-screen ul{list-style:none}
.sg-screen .sg-wrap{max-width:640px;margin:0 auto}
.sg-screen h1{font:${ctx.weights.heading} clamp(32px,9vw,48px)/1.08 var(--display);font-stretch:${d.stretch || 100}%;letter-spacing:-0.01em;text-wrap:balance}
.sg-screen h2{font:500 16px/24px var(--body);border-top:1px solid var(--ink);padding-top:8px;margin:40px 0 16px}
.sg-screen .sg-quiet{color:var(--quiet)}
.sg-screen .sg-mono{font-family:var(--bmono);font-variant-numeric:tabular-nums}
.sg-screen li{border-top:1px solid var(--hair);padding:12px 0}
.sg-screen li:last-child{border-bottom:1px solid var(--hair)}
.sg-screen .sg-row{display:flex;justify-content:space-between;gap:16px;align-items:baseline}
.sg-screen .sg-sw{height:56px;margin-bottom:10px;border:1px solid var(--hair)}
.sg-screen .sg-bar{height:8px;background:var(--hair);margin-top:8px}
.sg-screen .sg-bar i{display:block;height:100%;background:var(--ink)}
.sg-screen .sg-tile{border:1px solid var(--hair);padding:16px;margin-bottom:12px;display:flex;align-items:center;min-height:96px}
.sg-screen .sg-btn{display:inline-block;padding:12px 20px;min-height:44px}
}
@media print{.sg-screen{display:none!important}.sg-pages{display:block!important}}
`;
}

// the better of the brand's light text and surface, kept when it reads; otherwise readableOn's fallback, ending on pure black or white
export const inkFor = (ctx, hex, o) => {
  const L = ctx.roles.light, textFirst = ctx.C.ratio(L.text, hex) >= ctx.C.ratio(L.surface, hex);
  return readableOn(hex, textFirst ? [L.text, L.surface] : [L.surface, L.text], o);
};
const li = (...rows) => `<li>${rows.join('')}</li>`;
const row = (a, b) => `<div class="sg-row"><span>${a}</span><span>${b}</span></div>`;
const faceVar = (face) => `var(--${face === 'display' ? 'display' : 'body'})`;

const screenSection = {
  logo(ctx) {
    const LF = logoFacts(ctx), shown = ctx.logoShown || LF.grounds.map((g) => ({ key: g.key, label: g.label }));
    const tiles = shown.map((t) => {
      const g = LF.grounds.find((o) => o.key === t.key);
      return `<div class="sg-tile" style="background:${g.groundHex}">${logoArt(ctx, 'colour', 180, { colourway: g.key, color: inkFor(ctx, g.groundHex) })}</div><p class="sg-quiet" style="margin:-4px 0 16px">${esc(t.label)}</p>`;
    }).join('');
    return `<p>Keep ${esc(LF.unitText)} clear on every side. Never under ${ctx.logo.minSize.screenPx} px wide on screen.</p><div style="margin-top:16px">${tiles}</div>`;
  },
  colour(ctx) {
    const cs = colourFacts(ctx), top = Math.max(...cs.map((c) => c.share || 0)) || 1;
    return `<ul>${cs.map((c) => li(
      `<div class="sg-sw" style="background:${c.hex}"></div>`,
      row(`<b style="font-weight:500">${esc(c.name)}</b>`, `<span class="sg-mono">${c.hex.replace('#', '')}</span>`),
      row(`<span class="sg-quiet">${esc(c.role)}</span>`, `<span class="sg-mono sg-quiet">${pctText(c.share || 0)}</span>`),
      `<div class="sg-bar"><i style="width:${Math.round(((c.share || 0) / top) * 100)}%"></i></div>`,
    )).join('')}</ul>`;
  },
  type(ctx) {
    const sample = (ctx.brand.type.sample && ctx.brand.type.sample.headline) || ctx.brand.name;
    return `<ul>${typeLadder(ctx).map((t) => {
      const w = t.face === 'display' ? ctx.weights.heading : t.weight, st = t.face === 'display' ? `font-stretch:${ctx.brand.fonts.display.stretch || 100}%;` : '';
      return li(
        `<div style="font:${w} min(${t.size}px,11vw)/${t.lineRatio} ${faceVar(t.face)};${st}margin-bottom:8px">${esc(sample)}</div>`,
        row(`<b style="font-weight:500">${esc(t.name)}</b>`, `<span class="sg-mono">${t.size} px / ${t.line}</span>`),
        `<p class="sg-quiet">${esc(t.family)} ${wName(w)}, ${t.rem}. ${esc(t.use || '')}</p>`,
      );
    }).join('')}</ul>`;
  },
  contrast(ctx) {
    const CF = contrastFacts(ctx);
    return `<ul>${CF.pairs.map((p) => li(
      `<div class="sg-tile" style="background:${p.bgHex};color:${p.fgHex};min-height:0;padding:12px 16px">${esc(p.label)}</div>`,
      row(esc(p.use || ''), `<span class="sg-mono">${esc(p.ratioText)}:1 ${esc(p.grade)}</span>`),
    )).join('')}</ul><p class="sg-quiet" style="margin-top:16px">${esc(GRADE_NOTE)}${CF.failing ? ` ${CF.failing} other pair${CF.failing === 1 ? '' : 's'} fail and are never used for text.` : ''}</p>`;
  },
  tokens(ctx) {
    const T = tokenGroups(ctx);
    const group = (title, rows) => `<h3 class="sg-quiet" style="font:400 16px/24px var(--body);margin:16px 0 4px">${title}</h3><ul>${rows.join('')}</ul>`;
    return group('Space', T.space.map((s) => li(row(esc(s.token || s.name || ''), `<span class="sg-mono">${s.px} px</span>`))))
      + group('Radii', T.radii.map((r) => li(row(r.tokens.map(esc).join(', '), `<span class="sg-mono">${r.px} px</span>`))))
      + group('Borders', T.borders.map((b) => li(row(b.tokens.map(esc).join(', '), `<span class="sg-mono">${b.px} px</span>`))));
  },
  usage(ctx) {
    const U = usageFacts(ctx), bt = U.button, cd = U.card;
    const btn = `<span class="sg-btn" style="background:${bt.fill};color:${bt.label};border-radius:${bt.radius.px}px;font:${bt.type.weight} ${bt.type.size}px/${bt.type.line}px var(--body)">${esc(bt.primary)}</span>`;
    const card = `<div style="background:${cd.fill};color:${inkFor(ctx, cd.fill)};border:${cd.border.px}px solid ${cd.edgeColour};border-radius:${cd.radius.px}px;padding:${cd.pad.px}px;margin-top:16px"><div style="font:${cd.title.weight} ${Math.min(cd.title.size, 24)}px/1.2 ${faceVar(cd.title.face)};margin-bottom:8px">${esc(cd.titleText)}</div><div>${esc(cd.bodyText)}</div></div>`;
    return `<p class="sg-quiet" style="margin-bottom:12px">Button: ${esc(bt.fillName)} fill, ${esc(bt.labelName)} label, ${bt.radius.px} px radius, ${esc(bt.type.name)} ${bt.type.size} px.</p>${btn}${card}<p style="margin-top:16px"><span style="text-decoration:underline;text-underline-offset:3px">${esc(U.link.text)}</span> <span class="sg-quiet">links are underlined, ${esc(U.link.type.name)} ${U.link.type.size} px.</span></p>`;
  },
};

// the same facts as one column; `ids` limits it to the pages a document holds (a page's own html shows only its own section)
export function screenGuide(ctx, ids = null) {
  const drawn = Array.isArray(ctx.pagesDrawn) ? ctx.pagesDrawn : SCREEN_IDS;
  const want = SCREEN_IDS.filter((id) => drawn.includes(id) && (!ids || ids.includes(id)));
  const whole = !ids || ids.includes('cover');
  if (!want.length && !whole) return '';
  const B = ctx.brand;
  const head = whole
    ? `<h1>${esc(B.name)} style guide</h1><p class="sg-quiet" style="margin-top:12px">Version ${esc(B.version.number)}</p>`
    : `<h1>${esc(TITLES[want[0]])}</h1><p class="sg-quiet" style="margin-top:12px">${esc(B.name)} style guide</p>`;
  return `<main class="sg-screen"><div class="sg-wrap">${head}${want.map((id) => `${whole ? `<h2>${TITLES[id]}</h2>` : '<div style="height:32px"></div>'}${screenSection[id](ctx)}`).join('')}</div></main>`;
}
