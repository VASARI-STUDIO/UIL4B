// Shared page helpers for theme 01. Every page file imports these; pages return one <section class="pg"> at 1280 x 720.
import { esc } from '../../engine/brand.js';

export const A = esc;
// The family the font files are. A design family with no files here is served by its category's stand-in files (fonts.<role>.css names them), so a spec that
// names the design's family would send a developer to a font the page is not set in: the spec names the served family, and says what it stands in for.
export const servedFamily = (f) => (f && f.standIn && f.css ? String(f.css).split(':')[0].replace(/\+/g, ' ') : f.family);
export const standInNote = (f) => (f && f.standIn && servedFamily(f) !== f.family ? `${servedFamily(f)} stands in for ${f.family}: add ${f.family}'s own font files to set the page in it.` : '');
// The brand's colours with each hex once, in the brand's order. A colour that carries another's hex under a second role (the label on the
// action is the canvas where the two match) folds into the first, and its share is added to it, so a count or a strip never shows one colour twice.
export const distinctColours = (ctx) => {
  const out = [];
  for (const c of ctx.colours) {
    const o = out.find((x) => x.hex.toLowerCase() === c.hex.toLowerCase());
    if (o) o.share = (o.share || 0) + (c.share || 0); else out.push({ ...c });
  }
  return out;
};
export const ratioText = (t) => `${t} : 1`;
// a tone (soft, quiet...) is a text colour: name it by its role, so it reads "Quiet text on White"
export const nameOf = (ctx, id) => { const c = ctx.byId[id]; return ctx.tones.some((t) => t.id === id) && c.role.endsWith('text') ? ctx.cap(c.role) : c.name; };
// width that fits a logo version inside a box
export const fit = (ctx, id, maxW, maxH) => { const g = ctx.logo.geos[id]; return Math.floor(Math.min(maxW, (maxH * g.w) / g.h)); };

// the standard slide: running head, one idea, folio
export function std(ctx, id, inner, cls = '') {
  const p = ctx.pages.find((x) => x.id === id);
  const head = `<div class="hd"><span>${p.ref ? `<b class="num">${p.ref}</b>` : ''}${A(p.title)}</span><span>${A(ctx.brand.name)} brand guidelines</span></div>`;
  return `<section class="pg pg--std ${cls}" data-page="${id}">${head}${inner}<span class="fo">${ctx.pageNo(id)}</span></section>`;
}

// Secondary text on a dark field: the page ground (cream) at 72% over the field, where that still reaches 4.5:1, so the second tone is a lighter shade of the
// ink and never a grey the field did not choose. Null on a light field, where the brand's own quiet tone is used.
export const softOnDark = (ctx, hex) => {
  const s = ctx.roles.light.surface;
  if (ctx.ratio(s, hex) < ctx.ratio(ctx.roles.light.text, hex)) return null;
  const a = ctx.C.hexToRgb(s), b = ctx.C.hexToRgb(hex);
  const c = '#' + a.map((v, i) => Math.round(v * 0.72 + b[i] * 0.28).toString(16).padStart(2, '0')).join('').toUpperCase();
  return ctx.ratio(c, hex) >= 4.5 ? c : null;
};
