// Wraps theme page markup into standalone HTML documents and lists the font files they refer to.
import { esc } from './brand.js';
import { fontFaceCss } from './tokens.js';
import { finishText } from './placeholders.js';

// the theme's own faces, embedded beside the brand's: meta.chrome (running heads, folios) and any extra meta.fonts ({ family, weight, stem, q, stretch?, style? });
// style 'italic' declares a real italic face (stem like "Literata-i400", query "Literata:ital,wght@1,400")
export const chromeFaces = (theme) => [
  ...theme.meta.chrome.faces.map((f) => ({ family: theme.meta.chrome.family, weight: f.weight, stem: f.stem, style: f.style || 'normal' })),
  ...(theme.meta.fonts || []).map((f) => ({ family: f.family, weight: f.weight, stem: f.stem, stretch: f.stretch, style: f.style || 'normal' })),
];
export const allFaces = (ctx, theme) => [...ctx.faces, ...chromeFaces(theme)];

// The font files the documents embed or link, as a file map: assets/fonts/<stem>.woff2 (the theme's own faces beside the brand's).
export function fontFiles(ctx, theme) {
  const files = {};
  for (const f of allFaces(ctx, theme)) files[`assets/fonts/${f.stem}.woff2`] = ctx.loaders.fontFile(f.stem, 'woff2');
  return files;
}

// Per-page sizes: meta.pageSizes { pageId: [w, h] } lets one page differ from the document's size (a 1280 x 760 sheet inside a 794 x 1123 book).
// pageSizeMap gives { pageId: { w, h } }; largestSize is the viewport that fits every page of a document.
export const pageSizeMap = (meta) => Object.fromEntries(Object.entries((meta && meta.pageSizes) || {}).map(([id, v]) => [id, Array.isArray(v) ? { w: v[0], h: v[1] } : v]));
export const largestSize = (size, sizes = {}) => Object.values(sizes).reduce((m, s) => ({ w: Math.max(m.w, s.w), h: Math.max(m.h, s.h) }), size);

// engine-owned page frame: page size, break after each page, and (given a colour) a stack for screen viewing.
// A page with its own size (sizes[id]) gets a named @page and a [data-page] rule, so the PDF has mixed page sizes.
export function frameCss(size, stackBg = null, sizes = {}) {
  const own = Object.entries(sizes);
  return `@page{size:${size.w}px ${size.h}px;margin:0}
${own.map(([id, s]) => `@page pg-${id}{size:${s.w}px ${s.h}px;margin:0}`).join('\n')}
*,*::before,*::after{box-sizing:border-box}
html,body{margin:0;padding:0}
body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
.pg{position:relative;width:${size.w}px;height:${size.h}px;overflow:hidden;break-after:page;break-inside:avoid}
${own.map(([id, s]) => `.pg[data-page="${id}"]{width:${s.w}px;height:${s.h}px;page:pg-${id}}`).join('\n')}
.pg:last-child{break-after:auto}
${stackBg ? `@media screen{body.stack{background:${stackBg};padding:24px 0}body.stack .pg{margin:0 auto 24px}}` : ''}`;
}

// One HTML document holding one or more pages, finished for the edition (slot placeholders swapped in).
export function pageDoc(ctx, theme, { title, pages, size, stack = false }) {
  const faces = fontFaceCss(ctx, (f) => `assets/fonts/${f.stem}.woff2`, chromeFaces(theme));
  return finishText(`<!doctype html>
<html lang="en-AU">
<head><meta charset="utf-8"><meta name="viewport" content="width=${size.w}"><title>${esc(title)}</title>
<style>
${faces}
${frameCss(size, ctx.roles.light.sunken, pageSizeMap(theme.meta))}
${theme.css(ctx)}
</style></head>
<body${stack ? ' class="stack"' : ''}>
${pages.join('\n')}
</body></html>
`, 'page.html');
}
