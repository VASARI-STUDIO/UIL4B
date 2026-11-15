// Theme 23, Broadsheet, lane ht: the parts both web parts share. The masthead (ears, nameplate, thin-thick rule, section strip), the
// headline fit, the folio bar, the jump lines and the foot. The same paper as the brand book: Sofia Sans Condensed for the furniture,
// the brand's display face for headlines, its body face for the copy. Nothing here names a brand colour id or writes a brand hex.
import { A, N, measure, editionLine, pad3 } from './helpers.js';

export { A };
// The headline fit (as the book's): the size never lets the longest word pass its column. --k is font px per column px for that word,
// read from the brand's own display face.
export const fitK = (ctx, text) => { const w = Math.max(...String(text).split(/\s+/).map((t) => measure(ctx, t, 100))); return (100 / w) * 0.94; };
export const head = (ctx, tag, text, { cls = 'hx-h1', fs = 72, id = '' } = {}) =>
  `<${tag} class="${cls}"${id ? ` id="${id}"` : ''} style="--fs:${fs}px;--k:${fitK(ctx, text).toFixed(4)}">${A(text)}</${tag}>`;
// a display size that follows the length: a word sets as a poster, a sentence as a paragraph of display type
export const sizeFor = (text, big = 88) => { const n = String(text).length; return n > 110 ? 40 : n > 70 ? 48 : n > 40 ? 64 : big; };
export const mono = (s) => `<span class="hx-m">${A(s)}</span>`;

// the nameplate: the full logo, printed in ink by day and reversed by night. h is the cap at 1440, hn at 390.
export function nameplate(ctx, { h, hn, href = 'index.html', label }) {
  const L = ctx.logo, g = L.geos.colour, w = (h * g.w) / g.h, wn = (hn * g.w) / g.h;
  const art = (id, color) => L.html(id, { width: w, color, label: label || ctx.brand.name });
  return `<div class="hx-np"><a href="${href}" aria-label="${A(label || ctx.brand.name)}, front page" style="--nw:${w.toFixed(1)}px;--nwn:${wn.toFixed(1)}px;--na:${g.w.toFixed(2)}/${g.h.toFixed(2)}"><span class="hx-l">${art('colour', N.ink)}</span><span class="hx-d">${art('reversed', N.paper)}</span></a></div>`;
}

// the masthead. part: 'Brand guidelines' or 'UI kit'. secs: [{ n, title, href, current }]. toggle: the engine's disclosure attribute.
export function masthead(ctx, { part, secs, toggle, front = false, current = '' }) {
  const ears = `<div class="hx-ears"><p class="hx-ed">${A(editionLine(ctx))}</p><p class="hx-part">${A(ctx.brand.name)} ${A(part)}</p>
<div class="hx-mode" role="group" aria-label="Edition"><button type="button" data-mode="light" aria-pressed="true">Day</button><button type="button" data-mode="dark" aria-pressed="false">Night</button></div></div>`;
  const list = secs.map((s) => `<li><a href="${s.href}"${s.current ? ' aria-current="page"' : ''}><span class="hx-n">${A(s.n)}</span><span>${A(s.title)}</span></a></li>`).join('');
  const strip = `<nav class="hx-strip" aria-label="Sections"><button type="button" class="hx-secbtn" ${toggle} aria-controls="hx-secs" aria-expanded="false"><span>Sections</span><i>${A(current)}</i></button>
<ol class="hx-secs" id="hx-secs" data-open="false">${list}</ol></nav>`;
  return `<header class="hx-top${front ? ' hx-front' : ''}"><div class="hx-wrap">${ears}
${nameplate(ctx, front ? { h: 132, hn: 64 } : { h: 52, hn: 40 })}
<i class="hx-rule" aria-hidden="true"></i>
${strip}</div></header>`;
}

// the folio bar over the head rule: the section, and the page's number in the printed document
export const folio = (ctx, { no, title, page }) =>
  `<div class="hx-folio"><p class="hx-folio__no">${A(no)}</p><p class="hx-folio__t">${A(title)}</p>${page ? `<p class="hx-folio__pg">${A(page)}</p>` : ''}</div><i class="hx-rule" aria-hidden="true"></i>`;
export const pageNo = (ctx, id) => { const n = ctx.pageNo(id); return n ? pad3(n) : ''; };

// "continued on": the jump lines to the page before and the page after, as real links
export function jumps(prev, next) {
  if (!prev && !next) return '';
  return `<nav class="hx-jumps" aria-label="Pages">${prev ? `<a href="${prev.href}"><i>Back to</i> <b>${A(prev.title)}</b></a>` : ''}${next ? `<a class="hx-next" href="${next.href}"><i>Turn to</i> <b>${A(next.title)}</b></a>` : ''}</nav>`;
}
export const foot = (ctx, part) => `<footer class="hx-foot"><p>${A(ctx.brand.name)} ${A(part)}</p><p>${A(ctx.versionLine || editionLine(ctx))}</p></footer>`;

// "In this section": the section's pages, the one on screen marked
export const also = (items) => `<ol class="hx-also">${items.map((u) => `<li><a href="${u.href}"${u.current ? ' aria-current="page"' : ''}><span class="hx-n">${A(u.ref || '')}</span><span>${A(u.title)}</span></a></li>`).join('')}</ol>`;
