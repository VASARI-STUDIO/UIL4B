// Theme 36, Doorlist: the photo loader. The photographs live in ../../fonts/36-doorlist (the folder the export function ships, vercel.json includeFiles) as JPEG q88 at the size they were made (never resized up). A page asks for a frame:
//
//   photo(ctx, 'paperbacks', { w: 512, h: 720, fx: 0.5, fy: 0.62 })   returns the html of one box (w x h px, no position of its own: wrap it in an absolute box)
//   photo(ctx, 'proofs', { w: 1280, h: 720, fx: 0.3, fy: 0.5, zoom: 1.2 })   a tighter crop of the same image
//
// fx and fy are the focal point as a share of the photo (0 to 1): the crop is placed so that point sits as near the middle of the frame as the photo allows.
// zoom (default 1) is how much tighter than "cover" the crop is. The photo is never scaled past 1.25x its own pixels: a frame that would need more is
// pushed onto ctx.photoWarnings (the harness prints them) and the crop is held at 1.25x, so the page still builds but the box shows a short image.
// Each photo is embedded once per document as a data URI, by css(ctx) (pageDoc draws the pages first, then the css), and every frame is a class plus a size.
// Real exports allow `img-src data:` only, which is why nothing here is a file URL.
import fs from 'node:fs';

const DIR = new URL('../../fonts/36-doorlist/', import.meta.url);
export const MAX_UPSCALE = 1.25;

// id: [file, width px, height px, what it shows]
export const PHOTOS = {
  // stand-in photographs, JPEG q88. A reshoot replaces the files under the same names, so every crop is driven by fx, fy; the mockup quads (mockups.js) are measured on these files
  'IMG-01': ['IMG-01.jpg', 3600, 2400, 'the back of a packed room mid-set, a band small and far off under one red light'],
  'IMG-02': ['IMG-02.jpg', 1024, 1536, 'a door person stamping the back of a hand at a scuffed counter'],
  'IMG-03': ['IMG-03.jpg', 2400, 3200, 'a wrist in a plain paper wristband holding a drink at a bar rail'],
  'IMG-04': ['IMG-04.jpg', 2160, 3840, 'a clipboard on a stool at the venue door, a torch lying across it'],
  'IMG-05': ['IMG-05.jpg', 3840, 2160, 'a laneway wall of torn posters with one fresh blank sheet'],
  'IMG-06': ['IMG-06.jpg', 2400, 3200, 'a hand holding a phone up to a door person in a queue'],
  'IMG-07': ['IMG-07.jpg', 1672, 941, 'three sheets gaffer-taped to a stage floor beside a wedge monitor'],
  'IMG-08': ['IMG-08.jpg', 2400, 3200, 'the front of a small brick pub venue at night with a lit marquee'],
};

const cache = new Map();
const dataUri = (id) => {
  if (!cache.has(id)) cache.set(id, `data:image/jpeg;base64,${fs.readFileSync(new URL(PHOTOS[id][0], DIR)).toString('base64')}`);
  return cache.get(id);
};
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const r2 = (n) => Math.round(n * 100) / 100;

// A light or glare layer (a pre-rendered JPEG beside the photographs) as a data URI, for the mockup warp.
export const layerUri = (name) => {
  if (!cache.has(name)) cache.set(name, `data:image/jpeg;base64,${fs.readFileSync(new URL(name, DIR)).toString('base64')}`);
  return cache.get(name);
};

// Where a photo sits in a frame: the scale it is drawn at, its drawn size and its offset in the frame. photo() and the mockup warp share this, so a quad measured
// in photo px lands on the same page px as the photograph the page draws.
export function frameOf(ctx, id, { w, h, fx = 0.5, fy = 0.5, zoom = 1 } = {}) {
  const p = PHOTOS[id];
  if (!p) throw new Error(`photo: no photo named ${id}`);
  if (!(w > 0 && h > 0)) throw new Error(`photo ${id}: a frame needs w and h`);
  const [, iw, ih] = p;
  let s = Math.max(w / iw, h / ih) * Math.max(1, zoom);
  if (s > MAX_UPSCALE) {
    (ctx.photoWarnings = ctx.photoWarnings || []).push(`${id}: a ${w}x${h} frame needs ${r2(s)}x, held at ${MAX_UPSCALE}x`);
    s = MAX_UPSCALE;
  }
  const bw = iw * s, bh = ih * s;
  // the focal point at the middle of the frame, then held inside the photo's edges
  const ox = bw <= w ? (w - bw) / 2 : clamp(w / 2 - fx * bw, w - bw, 0);
  const oy = bh <= h ? (h - bh) / 2 : clamp(h / 2 - fy * bh, h - bh, 0);
  return { s, bw, bh, ox, oy };
}

export function photo(ctx, id, { w, h, fx = 0.5, fy = 0.5, zoom = 1, alt = '' } = {}) {
  const { bw, bh, ox, oy } = frameOf(ctx, id, { w, h, fx, fy, zoom });
  const p = PHOTOS[id];
  (ctx.photosUsed = ctx.photosUsed || new Set()).add(id);
  return `<div class="dl-im dl-im-${id}" role="img" aria-label="${ctx.esc(alt || p[3])}" style="width:${r2(w)}px;height:${r2(h)}px;background-size:${r2(bw)}px ${r2(bh)}px;background-position:${r2(ox)}px ${r2(oy)}px"></div>`;
}

// The css for the photos a document used. Called from css(ctx), after the pages are drawn.
export function photoCss(ctx) {
  const used = ctx.photosUsed ? [...ctx.photosUsed] : [];
  return `.pg.dl .dl-im{display:block;background-repeat:no-repeat;background-color:var(--wash,transparent);flex:none}\n`
    + used.map((id) => `.pg.dl .dl-im-${id}{background-image:url(${dataUri(id)})}`).join('\n');
}
