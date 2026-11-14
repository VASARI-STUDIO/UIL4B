// Text measuring for theme 29 (opentype, so a build needs no canvas), shared by the pages and the photo art.
import { outline } from '../../engine/logo.js';
import { loadFont } from '../../engine/nodeFont.js';

export const inkW = (stem, text, size, track = 0) => { const o = outline(loadFont(stem), text, size, track); return o.x2 - o.x1; };
export function wrap(stem, text, size, maxW, track) {
  const out = []; let cur = '';
  for (const w of text.split(' ')) {
    const t = cur ? cur + ' ' + w : w;
    if (cur && inkW(stem, t, size, track) > maxW) { out.push(cur); cur = w; } else cur = t;
  }
  if (cur) out.push(cur);
  return out;
}
export const fitW = (ctx, id, maxW, maxH) => { const g = ctx.logo.geos[id]; return Math.floor(Math.min(maxW, (maxH * g.w) / g.h)); };
// Where the baseline falls inside a line box of height lh: half-leading plus the font's own ascent (hhea, as Chromium lays it out), in px.
export function baseline(stem, size, lh) {
  const f = loadFont(stem), s = size / f.unitsPerEm, a = f.ascender * s, d = -f.descender * s;
  return (lh - (a + d)) / 2 + a;
}
// x where the ink of a line ends, from the text's origin (tracking in em, as outline() takes it)
export const inkEnd = (stem, text, size, track = 0) => outline(loadFont(stem), text, size, track).x2;
// The body face nearest a weight, from the faces this build loads, so a weight the brand's files lack measures in the closest one it has
export const bodyStem = (ctx, w) => {
  const fs = ctx.faces.filter((f) => f.role === 'body' && f.style !== 'italic');
  return (fs.find((f) => f.weight === w) || fs.reduce((a, b) => (Math.abs(b.weight - w) < Math.abs(a.weight - w) ? b : a))).stem;
};
// a day and its month never split across a line; used on copy that sets a date
export const nb = (s) => String(s).replace(/\b(\d{1,2}) (January|February|March|April|May|June|July|August|September|October|November|December)\b/g, '$1 $2');
// for flowing notes: also keeps "at 11:40" with the word before it, so a clock time never wraps alone
export const nbt = (s) => nb(s).replace(/(\S+) at (\d{1,2}:\d{2})/g, '$1 at $2');
export const heaviest = (f) => f.weights[f.weights.length - 1];
export const displayStem = (ctx) => ctx.faces.find((x) => x.role === 'display' && x.weight === heaviest(ctx.brand.fonts.display) && x.style !== 'italic').stem;
// The type specimen's headline. A brand's sample headline is often one of its own lines; a line belongs on the pages where it is the job
// (cover, lines, an application, summary), so a specimen that would repeat a line takes the first whole voice example of 10 to 40 characters.
// specimen(ctx, 1) is the next one along, for a lead line under it.
export function specimen(ctx, n = 0) {
  const B = ctx.brand, own = new Set([B.lines.primary, ...B.lines.others]), h = B.type.sample.headline;
  const V = B.voice || {}, pool = [...(V.principles || []).map((p) => p.example), ...(V.writeThis || []).map((w) => w.write)].filter((t) => t && !own.has(t) && t.length >= 10 && t.length <= 40);
  const all = [...new Set([...(own.has(h) ? [] : [h]), ...pool])];
  return all[n] || (n ? B.type.sample.caption : h);
}
// Slot edition: the words a placeholder prints in a one-line (compact) form, so a layout can measure what will be on the page.
// A showcase string passes through unchanged. Only reads the sentinel (never cuts it); the string stays whole for printing.
export const shown = (ctx, s) => (ctx.placeholders
  ? String(s).replace(/\uE000([\uE010-\uE019]+)\uE001/g, (m, g) => { const e = ctx.placeholders.entries[Number([...g].map((c) => c.charCodeAt(0) - 0xE010).join(''))]; return e.bare ? e.label : `${e.label}, ${e.length}`; })
  : String(s));
