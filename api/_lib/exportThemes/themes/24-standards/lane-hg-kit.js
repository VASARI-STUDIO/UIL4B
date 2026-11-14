// Theme 24, Standards, lane hg: the device for the guide site, the same three marks as the book (x-ruler with its live run, dimension lines with
// slash ticks, the thumb tab) under hg- class names. A page has three drawn sizes: 960 px from 1100, 720 px from 841, 312 px under that. Every
// label is computed for its own size and only that size's label shows, so the page never prints a measurement the screen does not have.
import { A, f2, half, xOf, roles, adv, loadFont } from './helpers.js';
import { fitSize, widest, dfont, dispStyle, cwOn } from './lane-bk-kit.js';
export { fitSize, widest, dfont, dispStyle, cwOn };

export const TIERS = ['w', 'm', 'n'];
export const CW = { w: 960, m: 720, n: 312 };
export const map3 = (fn) => ({ w: fn('w'), m: fn('m'), n: fn('n') });
export const X = (ctx, px) => `${half(px / xOf(ctx))}x`;
export const tri = (fn, tag = 'span') => TIERS.map((k) => `<${tag} class="hg-t hg-t${k}">${fn(k)}</${tag}>`).join('');
export const sv = (p, o) => TIERS.map((k) => `--${p}${k}:${f2(o[k])}px`).join(';');
export const lab = (ctx, px) => map3((k) => X(ctx, px[k]));
export const live = (off, w) => map3((k) => [off, off + w[k]]);
export const mono = (t) => `<span class="hg-mono">${A(t)}</span>`;

// a horizontal dimension line spans its box, the label centred with the line broken either side; lab is a string or {w, m, n}
export const dimH = (l, cls = '') => `<div class="hg-dh ${cls}" aria-hidden="true"><b></b><i></i><span class="hg-dl">${typeof l === 'string' ? l : tri((k) => l[k])}</span><i></i><b></b></div>`;
export const dimV = (l, cls = '') => `<div class="hg-dv ${cls}" aria-hidden="true"><b></b><i></i><span class="hg-dl">${typeof l === 'string' ? l : tri((k) => l[k])}</span><i></i><b></b></div>`;
export const crop = () => '<span class="hg-crop" aria-hidden="true"><i></i><i></i><i></i><i></i></span>';
// a hero figure: dimH above, dimV to the left (either may be absent), the object, a caption under
export function fig(obj, { h, v, cap = '', cls = '' } = {}) {
  return `<figure class="hg-fig${v ? ' hg-fig--v' : ''}${cls ? ' ' + cls : ''}">${v ? '<span></span>' : ''}${h ? dimH(h) : '<span></span>'}${v ? dimV(v) : ''}<div class="hg-obj">${obj}</div>${cap ? `${v ? '<span></span>' : ''}<figcaption class="hg-cap">${cap}</figcaption>` : ''}</figure>`;
}

// the x-ruler: ticks every x, 4x, 16x; labels every 16x. liveExt {w, m, n} -> [left, right] px from the sheet's left edge, the page's one hero.
export function ruler(ctx, uid, liveExt, { draw = false } = {}) {
  const x = xOf(ctx), step = 16 * x, lw = (t, w) => adv(loadFont(`PublicSans-${w}`), t, 12);
  const ticks = Array.from({ length: 16 }, (_, i) => { const h = i === 0 ? 10 : i % 4 === 0 ? 6 : 3, c = i === 0 ? 'ink' : i % 4 === 0 ? 'qt' : 'hr'; return `<rect x="${i * x}" y="${15 - h}" width="1" height="${h}" style="fill:var(--${c})"/>`; }).join('');
  const svg = `<svg class="hg-rl__k" width="100%" height="16" focusable="false"><defs><pattern id="hgr-${uid}" width="${step}" height="16" patternUnits="userSpaceOnUse">${ticks}</pattern></defs><rect width="100%" height="15" fill="url(#hgr-${uid})"/><rect y="15" width="100%" height="1" style="fill:var(--ink)"/></svg>`;
  const group = (k) => {
    const lim = k === 'n' ? 300 : CW[k] - 24, L = liveExt && liveExt[k];
    const lives = L ? L.map((px, i) => {
      const t = px === 0 ? '0' : `${half(px / x)}x`, w = lw(t, 600), end = i === 1 && k !== 'n' && px >= CW[k] - 1, start = px === 0;
      const a = start ? 0 : end ? px - w : px - w / 2;
      return { px, t, a, c: a + w / 2, end };
    }) : [];
    let o = '';
    for (let p = 0; p <= lim; p += step) {
      if (lives.some((l) => Math.abs(l.c - p) < 40)) continue;
      o += `<span class="hg-rl__n" style="left:${p}px${p === 0 ? '' : ';transform:translateX(-50%)'}">${p === 0 ? '0' : Math.round(p / x)}</span>`;
    }
    for (const l of lives) o += `<i class="hg-rl__m${draw ? ' hg-draw' : ''}" style="left:${f2(l.end ? l.px - 1 : l.px)}px"></i><span class="hg-rl__n hg-rl__n--live" style="left:${f2(l.a)}px">${l.t}</span>`;
    if (lives.length === 2) o += `<i class="hg-rl__r${draw ? ' hg-draw' : ''}" style="left:${f2(lives[0].px)}px;width:${f2(lives[1].px - lives[0].px)}px"></i>`;
    return o;
  };
  return `<div class="hg-foot"><div class="hg-rl" aria-hidden="true">${svg}${tri(group)}${liveExt ? '' : '<span class="hg-rl__n hg-rl__u">x</span>'}</div></div>`;
}

// ---- logo on a ground: the colourway drawn for that ground; --ar keeps the slot frame at the logo's proportion ----
export function logoOn(ctx, id, hex, w, label = 'Logo') {
  const k = cwOn(ctx, hex), cw = ctx.brand.logo.colourways[k], g = ctx.logo.geos[id];
  return `<span class="hg-lg" style="--ar:${f2(g.w)}/${f2(g.h)}">${ctx.logo.html(id, { width: w, colourway: k, color: cw.name, label })}</span>`;
}
export const logoMode = (ctx, id, w, label) => `<span class="hg-ml">${logoOn(ctx, id, roles(ctx).ground, w, label)}</span><span class="hg-md">${logoOn(ctx, id, ctx.roles.dark.surface, w, label)}</span>`;

// ---- page parts ----
export const rh = (ctx, sec, ttl) => `<div class="hg-rh" aria-hidden="true"><span>${A(ctx.brand.name)} brand guidelines</span><span>${A(sec)}${sec && ttl ? ', ' : ''}${A(ttl)}</span></div>`;
export const head = (ctx, id, title, lead, ref) => `${rh(ctx, ref ? ref : '', title)}<h1 class="hg-h1">${A(title)}</h1>${lead ? `<p class="hg-lead">${lead}</p>` : ''}`;
export const h2 = (no, text) => `<h2 class="hg-h2">${no ? `<span class="hg-no">${no}</span>` : ''}${A(text)}</h2>`;
// a register: hairline rows, the first rule in ink. rows: [no, name html, body html, aside html]
export const reg = (rows, cls = '') => `<ol class="hg-reg${cls ? ' ' + cls : ''}">${rows.map(([no, nm, bd, as]) => `<li class="hg-row"><span class="hg-no">${no}</span><div class="hg-nm">${nm}</div><div class="hg-bd">${bd || ''}</div>${as ? `<div class="hg-as">${as}</div>` : ''}</li>`).join('')}</ol>`;
export const num = (ref, i, j) => `${ref}.${i + 1}${j == null ? '' : '.' + (j + 1)}`;
