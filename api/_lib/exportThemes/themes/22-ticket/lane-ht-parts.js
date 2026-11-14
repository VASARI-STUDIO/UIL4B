// Theme 22, Ticket: lane ht, the parts both web sites share (the guidelines site, lane-ht-guide.js, and the UI kit site, lane-ht-kit.js).
// The sites are the box office: a bar across the top (the brand, the part, the other part, light and dark), the running order down the left (every
// section and page, the current one lit in the ticket's colour), and every page opening on its own ticket. The ticket is the book's (lane-bk-css.js):
// the body carries the page's one thing, the perforation and two notches divide it from the stub, and the stub holds the page's name, its number,
// a barcode of it and the way to the next page, the part you tear off. Below the ticket the page runs on as text on the bar top.
import { plateImg } from '../../engine/plate.js';
import { A, barcodeRects, fitLines, slugOf } from './helpers.js';
import { hasPlate, plateWindow, plateAlt } from './plates.js';

// a shot's frame: the brand's photograph, a stand-in plate (plates.js, read only: the bar, the door, the queue) for a shot not yet taken, else the brief's slot.
// The plate's window is set in container units, so the same plate fills a frame of any shape: the window's width is the frame's width.
export function shotPhoto(ctx, R, s, cls, { note = true } = {}) {
  if (!hasPlate(ctx, s)) return ctx.photo(s.id, { cls, slotNote: note });
  const W = 1000, H = 800, html = plateWindow(ctx, R, s, W, H), px = (k) => parseFloat(new RegExp(`[;"]${k}:(-?[\\d.]+)px`).exec(html)[1]);
  const src = /src="([^"]+)"/.exec(html)[1], left = px('left') / W * 100, w = px('width') / W * 100, cy = (-px('top') + H / 2) / W * 100;
  return `<div class="ht-plate ${cls}" role="img" aria-label="${A(plateAlt(s))}">${plateImg(`${src}`, ``, `position:absolute;left:${left.toFixed(3)}cqw;top:calc(50cqh - ${cy.toFixed(3)}cqw);width:${w.toFixed(3)}cqw;height:auto;max-width:none`)}</div>`;
}

// ---- the fitted big line (the theme's rule: the largest size that holds the line count), once for the wide body and once for a phone ----
const lines = (f) => f.lines.map((l) => `<span class="tb-ln">${A(l)}</span>`).join('');
export function fitTwo(ctx, text, { wide, narrow }) {
  const W = fitLines(ctx, text, wide), N = fitLines(ctx, text, narrow);
  return `<span class="tb-fit tb-fit--w" style="font-size:min(${W.size}px,${(W.size / wide.w * 100).toFixed(3)}cqw)">${lines(W)}</span>`
    + `<span class="tb-fit tb-fit--n" style="font-size:min(${Math.round(N.size * 1.5)}px,${(N.size / narrow.w * 100).toFixed(3)}cqw)">${lines(N)}</span>`;
}
// several lines at one shared size (the smallest of their fits), so they read as one column
export function fitSet(ctx, texts, { wide, narrow }) {
  const sw = Math.min(...texts.map((t) => fitLines(ctx, t, wide).size)), sn = Math.min(...texts.map((t) => fitLines(ctx, t, narrow).size));
  return texts.map((t) => {
    const W = fitLines(ctx, t, { ...wide, max: sw, min: sw }), N = fitLines(ctx, t, { ...narrow, max: sn, min: sn });
    return `<span class="tb-fit tb-fit--w" style="font-size:min(${sw}px,${(sw / wide.w * 100).toFixed(3)}cqw)">${lines(W)}</span><span class="tb-fit tb-fit--n" style="font-size:min(${Math.round(sn * 1.5)}px,${(sn / narrow.w * 100).toFixed(3)}cqw)">${lines(N)}</span>`;
  });
}
// the body is 768 px wide inside the ticket on a 1440 screen (the running order takes 256), 294 on a phone
export const BODY = { w: 768, n: 294 };
export const big = (ctx, text, { max = 120, min = 48, maxLines = 2, nMax = 60, nMin = 32, nLines = 4 } = {}) =>
  fitTwo(ctx, text, { wide: { w: BODY.w, max, min, maxLines }, narrow: { w: BODY.n, max: nMax, min: nMin, maxLines: nLines } });

// ---- logos ----
const fitW = (ctx, id, maxW, maxH) => { const g = ctx.logo.geos[id]; return Math.floor(Math.min(maxW, (maxH * g.w) / g.h)); };
export function logoOn(ctx, R, id, ground, maxW, maxH, label = 'Logo') {
  const cwId = R.colourwayOn(ground), cw = ctx.brand.logo.colourways[cwId], g = ctx.logo.geos[id], w = fitW(ctx, id, maxW, maxH);
  return `<span class="tb-logo" style="--lw:${w}px;aspect-ratio:${g.w.toFixed(2)}/${g.h.toFixed(2)}">${ctx.logo.html(id, { width: w, colourway: cwId, color: cw.name, label })}</span>`;
}
// a version in its own colourway (the sheet of versions), whatever ground it lands on
export function logoAs(ctx, id, maxW, maxH, label = 'Logo') {
  const cw = ctx.brand.logo.colourways[ctx.logo.colourwayOf(id)], g = ctx.logo.geos[id], w = fitW(ctx, id, maxW, maxH);
  return `<span class="tb-logo" style="--lw:${w}px;aspect-ratio:${g.w.toFixed(2)}/${g.h.toFixed(2)}">${ctx.logo.html(id, { width: w, color: cw.name, label })}</span>`;
}
// the same logo for each mode's ground: the bar top after dark, the light surface in daylight
export const logoBoth = (ctx, R, id, maxW, maxH, label = 'Logo') =>
  `<span class="tb-for-dark">${logoOn(ctx, R, id, R.table, maxW, maxH, label)}</span><span class="tb-for-light">${logoOn(ctx, R, id, ctx.roles.light.surface, maxW, maxH, label)}</span>`;

// ---- the ticket ----
// bg and ink print the ticket in another colour (a Stock ticket, a colour's own ticket); near says it needs its edge on a ground it nearly matches
export function ticket(ctx, R, { body, stub, cls = '', bg, ink, label = '' }) {
  let near = '';
  if (bg) {
    if (ctx.ratio(bg, ctx.roles.light.surface) < 1.3) near += ' is-near-l';
    if (ctx.ratio(bg, R.table) < 1.3) near += ' is-near-d';
  }
  const style = bg ? ` style="--tk:${bg};--tk-ink:${ink}"` : '';
  return `<div class="tb-tk ${cls}${near}"${style}${label}><div class="tb-tk__body">${body}</div><div class="tb-tk__stub"><i class="tb-notch tb-notch--a" aria-hidden="true"></i><i class="tb-notch tb-notch--b" aria-hidden="true"></i>${stub}</div></div>`;
}
// a Stock ticket: the paper colour with the bar-top colour as ink (helpers.js R.onPaper holds it to 7:1)
export const paperOf = (R) => { const P = R.onPaper(); return { bg: P.field, ink: P.fieldInk }; };

// the page stub: the brand and the part, the section, the page's name (the page's h1), its number, a barcode of it, and the way on
// part: 'Brand guidelines' or 'UI kit'; next: { href, ref, title } or null; code: the barcode's text
export function pageStub(ctx, { part, section, title, no, code, next, h1 = true }) {
  const B = ctx.brand, bc = barcodeRects(code, 0, 0, 192, 24, 'currentColor');
  const name = h1 ? `<h1 class="tb-stub__h">${A(title)}</h1>` : `<p class="tb-stub__h">${A(title)}</p>`;
  const on = next ? `<a class="ht-next" href="${next.href}"><span class="tb-s">Next</span><span class="ht-next__t">${next.ref ? `<span class="num">${A(next.ref)}</span> ` : ''}${A(next.title)}</span></a>` : '';
  return `<div class="tb-stub__top"><p class="tb-b">${A(B.name)}</p><p class="tb-s">${A(part)} ${A(B.version.number)}</p></div>
<div class="tb-stub__sec">${section ? `<p class="tb-s ht-sec">${A(section)}</p>` : ''}${name}</div>
<div class="tb-stub__no"><p class="tb-b">No.</p><p class="tb-serial disp">${A(no)}</p></div>
<div class="tb-stub__bc"><svg class="tb-bc" viewBox="0 0 ${bc.width.toFixed(2)} 24" width="${bc.width.toFixed(2)}" height="24" role="img" aria-label="Barcode, ${A(code)}">${bc.svg}</svg><p class="tb-code">${A(code)}</p></div>${on}`;
}
export const codeOf = (ctx, kind, n) => `${slugOf(ctx)}-${kind}${String(n).padStart(3, '0')}`;

// ---- text on the bar top ----
export const h2 = (t, id = '') => `<h2 class="ht-h2"${id ? ` id="${id}"` : ''}>${t}</h2>`;
export const rows = (items) => `<dl class="tb-rows">${items.map(([k, v]) => `<div class="tb-row"><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>`;
export const rules = (list) => `<ul class="tb-rules">${list.map((r) => `<li><p class="tb-rules__do"><b>Do</b> ${A(r.do)}</p><p class="tb-rules__dont"><b>Don't</b> ${A(r.dont)}</p></li>`).join('')}</ul>`;
export const zone = (inner) => `<div class="tb-zone ht-zone">${inner}</div>`;
export const main = (inner, cls = '') => `<div class="tb-main${cls ? ' ' + cls : ''}">${inner}</div>`;
export const side = (inner) => `<aside class="tb-side">${inner}</aside>`;
export const full = (inner, cls = '') => `<div class="tb-full${cls ? ' ' + cls : ''}">${inner}</div>`;

// ---- the box office bar and the running order, for both sites ----
// part: 'guidelines' or 'kit'. The two output folders sit side by side in an edition, so the other part is one folder up.
export function bar(ctx, R, { part, home }) {
  const B = ctx.brand, kitDir = 'ui-kit-html';
  const parts = [['guidelines', 'Guidelines', part === 'guidelines' ? 'index.html' : '../guidelines-html/index.html'], ['kit', 'UI kit', part === 'kit' ? 'index.html' : `../${kitDir}/index.html`]];
  return `<header class="ht-bar">
<a class="ht-brand" href="${home}" aria-label="${A(B.name)} ${part === 'kit' ? 'UI kit' : 'brand guidelines'}, home">${logoBoth(ctx, R, 'horizontal', 132, 32)}</a>
<nav class="ht-parts" aria-label="Parts">${parts.map(([k, t, h]) => `<a href="${h}"${k === part ? ' aria-current="page"' : ''}>${t}</a>`).join('')}</nav>
<div class="ht-mode" role="group" aria-label="Colour mode"><button type="button" data-mode="light" aria-pressed="true">Light</button><button type="button" data-mode="dark" aria-pressed="false">Dark</button></div>
</header>`;
}
// sections: [{ n, title, items: [{ href, ref, title, current }] }]; first: the home entry. toggle: the attribute the part's script reads.
export function order(ctx, { first, sections, current, toggle }) {
  const link = (it) => `<a href="${it.href}"${it.current ? ' aria-current="page"' : ''}><span class="num">${A(it.ref || '')}</span><span>${A(it.title)}</span></a>`;
  return `<nav class="ht-rail" aria-label="Running order">
<button type="button" class="ht-disc" ${toggle} aria-controls="ht-order" aria-expanded="false"><span class="tb-s">Running order</span><span class="ht-disc__c">${current ? `<span class="num">${A(current.ref || '')}</span> ${A(current.title)}` : ''}</span></button>
<div class="ht-order" id="ht-order">
<p class="ht-first">${[].concat(first).map(link).join('')}</p>
${sections.map((s) => `<div class="ht-set"><h2 class="ht-set__h"><span class="num">${A(String(s.n))}</span><span>${A(s.title)}</span></h2><ol>${s.items.map((it) => `<li>${link(it)}</li>`).join('')}</ol></div>`).join('\n')}
</div>
</nav>`;
}
export const pager = (prev, next) => `<nav class="ht-pager" aria-label="Previous and next page">${prev ? `<a href="${prev.href}" rel="prev"><span class="tb-s">Previous</span><b>${prev.ref ? `<span class="num">${A(prev.ref)}</span> ` : ''}${A(prev.title)}</b></a>` : '<span></span>'}${next ? `<a href="${next.href}" rel="next"><span class="tb-s">Next</span><b>${next.ref ? `<span class="num">${A(next.ref)}</span> ` : ''}${A(next.title)}</b></a>` : ''}</nav>`;
