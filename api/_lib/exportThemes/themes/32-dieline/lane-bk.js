// Theme 32, Dieline: lane bk, the HTML brand book (brandBook and bookCss). The book is the brand's pack as a long read: one die-cut net
// turned on its side and run down the page. Each section is a run of panels joined by fold lines; the outer edges are cut lines; every
// section's first panel carries a tuck flap on its right edge with the section's number and name, the way a printer marks a net. Printed
// panels take the pack's roles (front, back, side, flap) and carry the brand at work; unprinted board panels carry the reading and the specs.
// The net opens with the pack's top closure (tuck flap, bag film or satchel flap, from brand.packaging.kind) and ends with its bottom one,
// and a printer's colour bar sits over it at the head of the sheet. On a phone the net keeps its shape: the flaps narrow to a number and a
// vertical name, and the colour net turns from columns into rows.
import { BOOK_SECTIONS, BOOK_BREAK } from '../../engine/book.js';
import { roles, pack, allocate, measure, wrap, esc, r2 } from './geom.js';
import { bookCss } from './lane-bk-css.js';

export { bookCss };
void BOOK_BREAK;

// every photographed scene the book draws, in one place: the pack's own scene by its kind, and the wall poster for a pack that has none
// (no satchel scene exists; the guidelines draw the satchel flat and photograph the poster)
const SCENES = { bag: 'counter-pouch-shelf', box: 'counter-bag-handover', poster: 'kerb-shelter-morning' };
// the satchel's poster hangs in a bus shelter (the scene), and the caption says so; the headline is the poster's own
const POSTER_CAP = 'Bus shelter poster, one line to read from across the road.';
const POSTER_ALT = 'A poster panel in a tram stop shelter, printed with the logo and one line';

const A = esc;
const NO = (id) => String(BOOK_SECTIONS.findIndex((s) => s.id === id) + 1).padStart(2, '0');
const TITLE = (id) => BOOK_SECTIONS.find((s) => s.id === id).title;
const WEIGHT = { 100: 'Thin', 200: 'ExtraLight', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold', 900: 'Black' };
const wName = (w) => `${WEIGHT[w] || w} ${w}`;
const listAnd = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

// ---- the die, drawn as inline SVG under the text: one line per kind (fold dashed 8/6, seal dotted, cut solid). Percent coordinates let a
// line run the full length of a panel of any size, and the dash pattern stays in px because the SVG has no viewBox to scale it ----
const svgH = (kind, cls = '') => `<svg class="dl-ln dl-ln--h dl-${kind} ${cls}" aria-hidden="true" focusable="false"><line x1="0" y1="0.75" x2="100%" y2="0.75"/></svg>`;
const svgV = (kind, cls = '') => `<svg class="dl-ln dl-ln--v dl-${kind} ${cls}" aria-hidden="true" focusable="false"><line x1="0.75" y1="0" x2="0.75" y2="100%"/></svg>`;
// heat-seal crimp under a seal line: 1 px ribs 3 px apart
const crimp = () => `<svg class="dl-crimp" aria-hidden="true" focusable="false">${[3, 6, 9, 12].map((y) => `<line x1="0" y1="${y + 0.5}" x2="100%" y2="${y + 0.5}"/>`).join('')}</svg>`;
// the one-way valve on a coffee bag's front: two dotted rings
const valve = () => `<svg class="dl-valve" viewBox="-24 -24 48 48" width="48" height="48" aria-hidden="true" focusable="false"><circle r="22"/><circle r="8"/></svg>`;
// tear notch: a V cut into the outer edge
const notch = (side) => `<svg class="dl-notch dl-notch--${side}" viewBox="0 0 12 14" width="12" height="14" aria-hidden="true" focusable="false"><path class="dl-notch__f" d="${side === 'l' ? 'M0 0L10 7L0 14Z' : 'M12 0L2 7L12 14Z'}"/><path class="dl-notch__l" d="${side === 'l' ? 'M0 0L10 7L0 14' : 'M12 0L2 7L12 14'}"/></svg>`;

// ---- fitting display type: the largest size at which the text sets in the line count, measured with the real glyphs. The text is printed
// whole; the size is a cap (and scales with the box through cqw), so a longer placeholder still fits. Wide and narrow are fitted apart. ----
function fitSize(ctx, text, { w, max, min, lines, role = 'display', weight }) {
  const wt = weight || (role === 'display' ? ctx.weights.heading : ctx.weights.regular);
  for (let s = max; s >= min; s -= 2) {
    const L = wrap(ctx, role, wt, text, s, w);
    if (L.length <= lines && L.every((l) => measure(ctx, role, wt, l, s) <= w)) return s;
  }
  // past the floor, the size at which the longest word still fits the box
  const longest = Math.max(...String(text).split(/\s+/).map((x) => measure(ctx, role, wt, x, min)));
  return Math.max(10, Math.floor(min * Math.min(1, w / longest)));
}
const cq = (s, w) => `min(${s}px,${(s / w * 100).toFixed(3)}cqw)`;
// a display line fitted twice (the wide panel, and a phone panel 270 px across)
function fit(ctx, text, wide, narrow, opts = {}) {
  const sw = fitSize(ctx, text, { ...opts, ...wide }), sn = fitSize(ctx, text, { ...opts, ...narrow });
  return `--fw:${cq(sw, wide.w)};--fn:${cq(sn, narrow.w)}`;
}
// a size that only caps the longest word (wrapping text at a set size)
function wordCap(ctx, text, size, role, weight, w = 270) {
  const longest = Math.max(...String(text).split(/\s+/).map((x) => measure(ctx, role, weight, x, size)));
  return longest <= w ? `${size}px` : `min(${size}px,${(size * 100 / longest).toFixed(3)}cqw)`;
}

// ---- panels ----
// a printed panel takes its fill and the brand's own text pair on it; a board panel is unprinted and follows the light or dark preview
function printVars(R, hex) {
  const t = R.textOn(hex);
  return `--f:${hex};--fi:${t.ink};--fq:${t.quiet};--fl:${R.lineOn(hex)}`;
}
// deco: die marks drawn on the panel itself (a bag's seal, crimp, notches and valve), placed from the panel's edges, not its padded content
const panel = (inner, { R, hex, cls = '', flap = '', glue = '', dust = '', deco = '' } = {}) =>
  `<div class="dl-pn${hex ? ' dl-pn--print' : ''} ${cls}"${hex ? ` style="${printVars(R, hex)}"` : ''}>${svgH('fold', 'dl-top')}${deco}${flap}${glue}${dust}<div class="dl-in">${inner}</div></div>`;
// the tuck flap on the right edge: the section's number and its name. Its hinge is a fold over the panel's cut edge.
function flap(id, { heading = true } = {}) {
  const t = heading ? `<h2 class="dl-flap__t" id="h-${id}">${A(TITLE(id))}</h2>` : `<p class="dl-flap__t">${A(TITLE(id))}</p>`;
  return `<div class="dl-flap"><span class="dl-hinge">${svgV('fold')}</span><p class="dl-flap__n" aria-hidden="true">${NO(id)}</p>${t}</div>`;
}
// the dust flap on the left edge (wide screens): chamfered, unprinted, no words
const dust = () => `<span class="dl-dust" aria-hidden="true"><svg viewBox="0 0 56 168" width="56" height="168" focusable="false"><path class="dl-dust__f" d="M56 0L32 0L0 24V144L32 168H56Z"/><path class="dl-cutp" d="M56 0.75H32.3L0.75 24.3V143.7L32.3 167.25H56"/></svg><span class="dl-hinge dl-hinge--l">${svgV('fold')}</span></span>`;
// the glue flap on the net's first panel (wide screens): a trapezoid 32 wide, its outer edge inset 24
const glue = () => `<span class="dl-glue" aria-hidden="true"><svg viewBox="0 0 32 360" width="32" height="360" focusable="false"><path class="dl-dust__f" d="M32 0L0 24V336L32 360Z"/><path class="dl-cutp" d="M32 0.5L0.75 24.3V335.7L32 359.5"/></svg><span class="dl-hinge dl-hinge--l">${svgV('fold')}</span></span>`;
const sec = (id, inner, cls = '') => `<section class="bk-sec dl-sec dl-sec--${id} ${cls}" id="${id}" aria-labelledby="h-${id}">${inner}</section>`;

// ---- logo helpers ----
function logoOn(ctx, R, id, ground, w, label = 'Logo') {
  const cwKey = R.colourwayOn(ground), cw = ctx.brand.logo.colourways[cwKey], g = ctx.logo.geos[id];
  return `<span class="dl-logo" style="--lw:${w}px;--ar:${g.w.toFixed(2)}/${g.h.toFixed(2)}">${ctx.logo.html(id, { width: w, colourway: cwKey, color: cw.name, label })}</span>`;
}
// on an unprinted board the logo follows the preview: the light board in light, the dark board in dark
const logoBoard = (ctx, R, id, w) => `<span class="dl-for-light">${logoOn(ctx, R, id, ctx.roles.light.surface, w)}</span><span class="dl-for-dark">${logoOn(ctx, R, id, ctx.roles.dark.surface, w)}</span>`;

// ---- photographed art: the flat art a scene's surface carries, copied from guidelines.js (bagArt, posterArt) so the book and the
// guidelines print the same pack. K is pack(ctx). ----
const px = (n) => `${r2(n)}px`;
const at = (x, y, w, h, cls, html, style = '') => `<div class="tx ${cls}" style="left:${px(x)};top:${px(y)};width:${px(w)};height:${px(h)};${style}">${html}</div>`;
const artDoc = (ctx, R, w, h, inner) => ({ w, h, html: ctx.artPage(`<div style="position:relative;width:${w}px;height:${h}px;overflow:hidden;background:${R.front.hex}">${inner}</div>`, { w, h }) });
const artSize = (ctx, sceneId, w) => { const q = ctx.sceneInfo(sceneId).quads[0]; return [w, Math.round(w / q.aspect)]; };
function bagArt(ctx, R, K, sceneId, w0) {
  const W = ctx.weights, tx = R.textOn(R.front.hex), [w, h] = artSize(ctx, sceneId, w0), s = w / 520, m = 48 * s, iw = w - 2 * m, pr = K.product;
  let o = '';
  if (K.place) o += at(m, 104 * s, iw, 24 * s, 'b-small', esc(K.place), `font-size:${17 * s}px;line-height:${24 * s}px;color:${tx.quiet}`);
  let cur = h - 72 * s;
  if (pr.net) { o += at(m, cur - 4 * s, iw, 24 * s, 'b-small', esc(pr.net), `font-size:${17 * s}px;line-height:${24 * s}px;color:${tx.mid}`); cur -= 36 * s; }
  if (pr.date) { const ds = Math.round(56 * s); o += at(m, cur - ds, iw, ds, 'disp', esc(pr.date), `font-size:${ds}px;line-height:${ds}px;color:${tx.quiet}`); cur -= ds + 48 * s; }
  if (pr.note) { const nr = wrap(ctx, 'body', W.regular, pr.note, 18 * s, iw); o += at(m, cur - nr.length * 26 * s, iw, nr.length * 26 * s, 'b-body', nr.map(esc).join('<br>'), `font-size:${18 * s}px;line-height:${26 * s}px;color:${tx.mid}`); cur -= nr.length * 26 * s + 16 * s; }
  const ns = Math.round(40 * s); o += at(m, cur - ns, iw, ns, 'disp', esc(pr.name), `font-size:${ns}px;line-height:${ns}px;color:${tx.ink}`); cur -= ns + 56 * s;
  const lw = Math.min(pr.logoW * s, iw), lh = lw / ctx.logo.geo.aspect;
  o += at(m, cur - lh, lw, lh, '', ctx.logo.html('colour', { width: lw, colourway: R.colourwayOn(R.front.hex), color: tx.ink }));
  return artDoc(ctx, R, w, h, o);
}
function posterArt(ctx, R, K, sceneId, w0) {
  const W = ctx.weights, tx = R.textOn(R.front.hex), [w, h] = artSize(ctx, sceneId, w0), m = 48, iw = w - 2 * m, name = K.product.poster || K.product.name;
  let o = '';
  const lw = Math.min(360, iw), lh = lw / ctx.logo.geo.aspect;
  o += at(m, m, lw, lh, '', ctx.logo.html('colour', { width: lw, colourway: R.colourwayOn(R.front.hex), color: tx.ink }));
  let sz = 112, rows; for (const s of [112, 96, 80, 64]) { sz = s; rows = wrap(ctx, 'display', W.heading, name, s, iw); if (rows.length <= 3 && rows.every((r) => measure(ctx, 'display', W.heading, r, s) <= iw)) break; }
  const lh2 = Math.round(sz * 0.92);
  o += at(m, h - m - rows.length * lh2, iw, rows.length * lh2, 'disp', rows.map(esc).join('<br>'), `font-size:${sz}px;line-height:${lh2}px;color:${tx.ink}`);
  return artDoc(ctx, R, w, h, o);
}
// the crop of a scene in a bw x bh box, as percentages of the box: scaled to cover, and with `fill` the surface fills that share of the
// box height, centred on the surface (the guidelines' crop, made fluid)
function cropPct(ctx, sceneId, bw, bh, fill) {
  const sc = ctx.sceneInfo(sceneId), q = sc.quads[0].corners, xs = q.map((c) => c[0]), ys = q.map((c) => c[1]);
  const qh = Math.max(...ys) - Math.min(...ys), cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const k = Math.max(fill * bh / qh, bw / sc.w, bh / sc.h), cl = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const left = cl(bw / 2 - cx * k, bw - sc.w * k, 0), top = cl(bh / 2 - cy * k, bh - sc.h * k, 0);
  return { w: (sc.w * k / bw * 100).toFixed(3), l: (left / bw * 100).toFixed(3), t: (top / bh * 100).toFixed(3) };
}
// the pack photographed on its own surface (bag or box), or the wall poster for a satchel: one figure, cropped apart for wide and phone
function photographed(ctx, R, K) {
  const own = SCENES[K.kind], sid = own || SCENES.poster, S = K.signage;
  const art = own ? bagArt(ctx, R, K, sid, sid === SCENES.bag ? 520 : 1008) : posterArt(ctx, R, K, sid, 520);
  const url = ctx.mockup(sid, [art]);
  // the wide box follows the surface: landscape for the pack on its bench, a 4:5 sheet for the poster (a landscape crop cuts a tall poster)
  const fill = own ? 0.78 : 0.66, [bw, bh] = own ? [832, 520] : [560, 700];
  const cw = cropPct(ctx, sid, bw, bh, fill), cn = cropPct(ctx, sid, 4, 5, fill);
  const alt = own ? `${K.name}, front panel, photographed` : POSTER_ALT;
  const cap = own ? [S.hero, S.heroVal] : [POSTER_CAP, S.secondVal];
  return `<figure class="dl-shotp"><div class="dl-shotp__w" style="--ar:${bw}/${bh};--mw:${bw}px;--cw:${cw.w}%;--cl:${cw.l}%;--ct:${cw.t}%;--cnw:${cn.w}%;--cnl:${cn.l}%;--cnt:${cn.t}%"><svg viewBox="0 0 ${ctx.sceneInfo(sid).w} ${ctx.sceneInfo(sid).h}" role="img" aria-label="${A(alt)}"><image href="${A(url)}" width="100%" height="100%" preserveAspectRatio="none"/></svg></div>
<figcaption><span class="dl-shotp__t">${A(cap[0])}</span>${cap[1] ? ` <span class="dl-q">${A(cap[1])}</span>` : ''}</figcaption></figure>`;
}

// ---- controls ----
const copyBtn = (text, value, what) => `<button type="button" class="bk-btn dl-btn" data-copy="${A(value)}" data-copy-label="${A(what)}" aria-label="${A(text + ', ' + what)}"><span class="bk-btn__t">${A(text)}</span></button>`;
const valBtn = (kind, value, name) => `<button type="button" class="bk-btn dl-val" data-copy="${A(value)}" data-copy-label="${A(name + ' ' + kind)}" aria-label="Copy ${A(kind)} ${A(value)}, ${A(name)}"><span class="bk-btn__t">${A(value)}</span></button>`;
const dlLink = (f, label, text) => (f ? `<a class="dl-dl" href="${A(f.href)}" download aria-label="Download ${A(label)}, ${A(f.ext)}, ${A(f.sizeText)}">${A(text || f.ext)}</a>` : '');
const h3 = (t) => `<h3 class="dl-h3">${t}</h3>`;
const rules = (list) => `<ul class="dl-rules">${list.map((r) => `<li><p><span class="dl-do">Do</span> ${A(r.do)}</p><p class="dl-q"><span class="dl-do">Don&rsquo;t</span> ${A(r.dont)}</p></li>`).join('')}</ul>`;

// ---- the top of the net: the colour bar, then the closure by pack kind ----
function head(ctx, R, P) {
  const cols = ctx.colours;
  const per = allocate(cols.map((c) => c.share), 1000, 30);
  const bar = `<div class="dl-bar" aria-hidden="true"><svg class="dl-reg" viewBox="-10 -10 20 20" width="20" height="20" focusable="false"><circle r="6"/><line x1="-10" y1="0" x2="10" y2="0"/><line x1="0" y1="-10" x2="0" y2="10"/></svg><span class="dl-bar__s">${cols.map((c, i) => `<i style="flex:0 0 ${per[i] / 10}%;background:${c.hex}"${R.isGround(c.hex) ? ' class="is-ground"' : ''}></i>`).join('')}</span><svg class="dl-reg" viewBox="-10 -10 20 20" width="20" height="20" focusable="false"><circle r="6"/><line x1="-10" y1="0" x2="10" y2="0"/><line x1="0" y1="-10" x2="0" y2="10"/></svg></div>`;
  let top = '';
  if (P.kind === 'box') top = `<div class="dl-tuck dl-tuck--top" aria-hidden="true"></div>`;
  else if (P.kind === 'satchel') top = `<div class="dl-sflap" aria-hidden="true" style="${printVars(R, R.flap.hex)}"><span class="dl-peel"><svg focusable="false"><rect x="0.75" y="0.75" width="100%" height="100%"/></svg></span></div>`;
  return bar + top;
}
function foot(ctx, R, P) {
  if (P.kind === 'box') return `<div class="dl-tuck dl-tuck--bot" aria-hidden="true">${svgH('fold')}</div>`;
  return '';
}

// ---- 1 Overview: the front panel (the pack's face: the logo, the brand's line), then the board with what the brand is ----
function overview(ctx, R, P) {
  const B = ctx.brand, hex = R.front.hex, bag = P.kind === 'bag';
  const line = B.lines.primary;
  const deco = bag ? `${crimp()}${svgH('seal', 'dl-sealt')}${valve()}${notch('l')}${notch('r')}` : '';
  const front = `<div class="dl-cover">
<p class="dl-place">${A(P.place || B.city || '')}</p>
<div class="dl-cover__lg">${logoOn(ctx, R, 'colour', hex, 360)}</div>
<h1 class="dl-hero disp dl-fit" id="h-overview" style="${fit(ctx, line, { w: 820, max: 128, min: 48, lines: 2 }, { w: 270, max: 64, min: 30, lines: 4 })}">${A(line)}</h1>
<p class="dl-cover__v"><span>Brand book</span><span>${A(ctx.versionLine)}</span></p>
</div>`;
  const traits = `<ol class="dl-cols">${B.personality.map((p) => `<li>${svgV('fold', 'dl-colfold')}<p class="dl-trait disp">${A(p.trait)}</p><p class="dl-p">${A(p.means)}</p></li>`).join('')}</ol>`;
  const board = `<p class="dl-lead">${A(B.description)}</p>
<dl class="dl-pair"><div><dt class="dl-h3">What it does</dt><dd class="dl-p">${A(B.product)}</dd></div><div><dt class="dl-h3">Who it serves</dt><dd class="dl-p">${A(B.audience)}</dd></div></dl>
${h3('How it behaves')}${traits}`;
  return sec('overview', `${head(ctx, R, P)}${panel(front, { R, hex, cls: `dl-pn--front${bag ? ' is-bag' : ''}`, deco, flap: flap('overview', { heading: false }), glue: P.kind === 'satchel' ? '' : glue() })}
${panel(board, { cls: 'dl-pn--board' })}`, `is-${P.kind}`);
}

// ---- 2 Voice: the back panel (where a pack does its talking): the four rules as the lines themselves; then write this, not that ----
function voice(ctx, R) {
  const B = ctx.brand, V = B.voice, hex = R.back.hex;
  const ex = V.principles.map((p) => p.example);
  const longest = ex.reduce((a, b) => (measure(ctx, 'display', ctx.weights.heading, a, 40) >= measure(ctx, 'display', ctx.weights.heading, b, 40) ? a : b));
  const style = fit(ctx, longest, { w: 760, max: 56, min: 28, lines: 2 }, { w: 270, max: 32, min: 22, lines: 4 });
  const back = `<ol class="dl-say">${V.principles.map((p) => `<li><p class="dl-say__x disp dl-fit" style="${style}">${A(p.example)}</p><p class="dl-say__k">${A(p.title)}</p></li>`).join('')}</ol>`;
  const wtn = `<ul class="dl-wtn">${V.writeThis.map((r) => `<li><p class="dl-wtn__w">${A(r.write)}</p><p class="dl-wtn__n"><span class="dl-do">Not</span> <s>${A(r.not)}</s></p><p class="dl-wtn__b">${A(r.because)}</p></li>`).join('')}</ul>`;
  const take = (title, text, what) => `<div class="dl-take">${h3(title)}<p class="dl-take__t">${A(text)}</p>${copyBtn('Copy text', text, what)}</div>`;
  const board = `${h3('Write this, not that')}${wtn}
<div class="dl-takes">${take('The brand in 25 words', V.boilerplate25, '25-word boilerplate')}${svgV('fold', 'dl-takefold')}${take('The brand in 50 words', V.boilerplate50, '50-word boilerplate')}</div>
<div class="dl-narrow">${h3('Lines in use')}<ul class="dl-lines">${[B.lines.primary, ...B.lines.others].map((l) => `<li class="disp">${A(l)}</li>`).join('')}</ul>
${h3('Writing the name')}<p class="dl-p">${A(V.nameRules)}</p></div>`;
  return sec('voice', `${panel(back, { R, hex, cls: 'dl-pn--back', flap: flap('voice') })}${panel(board, { cls: 'dl-pn--board', dust: dust() })}`);
}

// ---- 3 Logo: the logo alone on the board it is drawn for; the versions as one strip of joined panels, each on its own ground ----
function logo(ctx, R) {
  const B = ctx.brand, L = ctx.logo, cw = B.logo.colourways, slot = ctx.edition === 'slot';
  const big = `<div class="dl-logohero">${logoBoard(ctx, R, 'colour', 640)}</div><p class="dl-p dl-narrow">${A(B.logo.idea)}</p>`;
  const order = ['colour', 'reversed', 'mono-dark', 'mono-light', 'horizontal', 'stacked', 'symbol'].filter((id) => L.versions.includes(id));
  const cell = (id) => {
    const w = cw[L.colourwayOf(id)], t = R.textOn(w.ground), g = L.geos[id];
    const maxW = id === 'symbol' ? 72 : id === 'stacked' ? 120 : 176, lw = Math.floor(Math.min(maxW, 64 * g.w / g.h, maxW));
    const files = ctx.book.logo(id), name = `${L.labels[id]} logo`;
    const links = slot || !files ? '' : `<span class="dl-dls">${dlLink(files.svg, name)}${dlLink(files.png.find((p) => p.w === 1024), name + ', PNG, 1024 px wide', 'PNG')}${dlLink(files.pdf, name)}</span>`;
    return `<li class="dl-cell" style="--f:${w.ground};--fi:${t.ink};--fq:${t.quiet};--fl:${R.lineOn(w.ground)}">${svgV('fold', 'dl-cellv')}${svgH('fold', 'dl-cellh')}
<span class="dl-cell__lg"><span class="dl-logo" style="--lw:${lw}px;--ar:${g.w.toFixed(2)}/${g.h.toFixed(2)}">${L.html(id, { width: lw, color: w.name, label: 'Logo' })}</span></span>
<span class="dl-cell__k">${A(L.labels[id])}</span><span class="dl-cell__w">${A(B.logo.when[id] || '')}</span>${links}</li>`;
  };
  const geo = L.geo, pad = (L.clearShare / 100) * geo.height / geo.width * 100, ms = L.minSize;
  const clear = `<div class="dl-clear"><div class="dl-clear__b" style="padding:${pad.toFixed(3)}%"><svg class="dl-box dl-fold" aria-hidden="true" focusable="false"><rect x="0.75" y="0.75" width="100%" height="100%"/></svg>${logoBoard(ctx, R, 'colour', 320)}</div></div>
<p class="dl-p">Keep ${L.clearShare}% of the logo&rsquo;s height clear on every side. Nothing else crosses the fold line.</p>`;
  const min = slot
    ? `<p class="dl-p">Set the smallest size once the logo is in place: the width at which every part of it still reads as one mark.</p>`
    : `<div class="dl-min">${logoBoard(ctx, R, 'colour', ms.screenPx)}</div><p class="dl-p"><span class="m">${ms.screenPx} px</span> wide on screen, <span class="m">${ms.printMm} mm</span> in print. Never smaller.</p>`;
  const misuse = ['Do not stretch, squash or skew it.', 'Do not recolour it outside the versions above.', 'Do not rotate it.', 'Do not add shadows, glows or other effects.', 'Do not set it on a busy part of a photo.', 'Do not outline it or put it in a box.'];
  const board = `<div class="dl-narrow">${h3('The versions')}<p class="dl-p">Each version is printed on the ground it is made for. ${slot ? 'The frames hold the place and the proportion until the approved files go in the kit&rsquo;s logo folder.' : 'Download any one as SVG, PNG or PDF.'}</p></div>
<ul class="dl-strip dl-strip--logo">${order.map(cell).join('')}</ul>
<div class="dl-two"><div>${h3('Clear space')}${clear}</div><div>${h3('Smallest size')}${min}</div></div>
${h3('Never')}<ul class="dl-never">${misuse.map((m) => `<li>${A(m)}</li>`).join('')}</ul>`;
  return sec('logo', `${panel(big, { cls: 'dl-pn--logo', flap: flap('logo') })}${panel(board, { cls: 'dl-pn--board' })}`);
}

// ---- 4 Colour: the net at the palette's true proportion, each panel as wide (on a phone, as tall) as its share; then every value ----
function colour(ctx, R, P) {
  const B = ctx.brand, cols = ctx.colours;
  const per = allocate(cols.map((c) => c.share), 1000, 90);
  const rgb = (hex) => { const [r, g, b] = ctx.C.hexToRgb(hex); return `rgb(${r}, ${g}, ${b})`; };
  const bag = P.kind === 'bag';
  const net = `<div class="dl-net${bag ? ' is-bag' : ''}">${cols.map((c, i) => {
    const t = R.textOn(c.hex), pct = Math.round(c.share * 100), isFront = c === R.front;
    return `<div class="dl-cp" style="--f:${c.hex};--fi:${t.ink};--fq:${t.quiet};--fl:${R.lineOn(c.hex)};--w:${per[i] / 10}%;--nh:${Math.max(88, Math.round(per[i] * 0.8))}px">${i ? `${svgV('fold', 'dl-cpv')}${svgH('fold', 'dl-cph')}` : ''}${bag ? `${crimp()}${svgH('seal', 'dl-sealt')}` : ''}${bag && isFront ? valve() : ''}
<p class="dl-cp__n">${A(c.name)}</p>${valBtn('HEX', c.hex, c.name)}<p class="dl-cp__s disp">${pct}%</p></div>`;
  }).join('')}</div>`;
  const vals = (c) => `<dl class="dl-vals"><div><dt>HEX</dt><dd>${valBtn('HEX', c.hex, c.name)}</dd></div><div><dt>RGB</dt><dd>${valBtn('RGB', rgb(c.hex), c.name)}</dd></div><div><dt>OKLCH</dt><dd>${valBtn('OKLCH', c.oklch || ctx.C.oklchString(c.hex), c.name)}</dd></div>${ctx.C.cmykOf(c) ? `<div><dt>CMYK</dt><dd>${valBtn('CMYK', ctx.C.cmykOf(c), c.name)}</dd></div>` : ''}</dl>`;
  const ramp = (c) => (c.ramp && c.rampBase !== 50 ? `<ol class="dl-ramp" aria-label="${A(c.name)} ramp, lightest to darkest">${Object.entries(c.ramp).map(([k, hx]) => `<li${+k === c.rampBase ? ' class="is-base"' : ''}><button type="button" class="dl-ramp__b" style="background:${hx}" data-copy="${hx}" data-copy-label="${A(c.name)} ${k} HEX ${hx}" aria-label="Copy HEX ${hx}, ${A(c.name)} ${k}"></button></li>`).join('')}</ol>` : '');
  const entry = (c) => `<li class="dl-col"><span class="dl-col__sw" style="background:${c.hex}" aria-hidden="true"></span><div class="dl-col__t"><h4 class="dl-col__n disp">${A(c.name)}</h4><p class="dl-p">${A(c.lands)}</p>${vals(c)}${ramp(c)}</div></li>`;
  const pair = (p) => `<li class="dl-pc">${svgV('fold', 'dl-cellv')}${svgH('fold', 'dl-cellh')}<span class="dl-pc__s" style="background:${p.bgHex};color:${p.fgHex}"><span class="dl-pc__r disp">${A(p.ratioText)}&thinsp;:&thinsp;1</span></span><span class="dl-pc__u">${A(p.use)}</span></li>`;
  const roleKeys = [['surface', 'Surface'], ['raised', 'Raised'], ['text', 'Text'], ['quiet', 'Quiet text'], ['border', 'Border'], ['action', 'Action'], ['actionLabel', 'Action label'], ['focus', 'Focus']];
  const toneKeys = [['success', 'Success'], ['warning', 'Warning'], ['danger', 'Danger'], ['info', 'Info']];
  const roleList = (mode, title) => {
    const r = ctx.roles[mode], items = [...roleKeys.map(([k, n]) => [n, r[k]]), ...toneKeys.map(([k, n]) => [n, r[k].fg])];
    return `<div>${h3(title)}<ul class="dl-roles">${items.map(([n, hx]) => `<li><span class="dl-roles__sw" style="background:${hx}" aria-hidden="true"></span><span class="dl-roles__n">${A(n)}</span>${valBtn('HEX', hx, `${mode} ${n}`)}</li>`).join('')}</ul></div>`;
  };
  const board = `<p class="dl-lead">Colour by share. Each panel of the net is as wide as that colour&rsquo;s share of a ${A(B.name)} page. Press a value to copy it.</p>
<ul class="dl-cols-list">${cols.map(entry).join('')}</ul>
${ctx.tones.length ? `${h3('Tones')}<ul class="dl-cols-list dl-cols-list--tones">${ctx.tones.map(entry).join('')}</ul>` : ''}
<div class="dl-narrow">${h3('Contrast, pair by pair')}<p class="dl-p">Every text pair ${A(B.name)} uses, in its own colours, with its WCAG ratio. Text needs 4.5&thinsp;:&thinsp;1; type at 24&nbsp;px and over needs 3&thinsp;:&thinsp;1.</p></div>
<ul class="dl-strip dl-strip--pairs">${ctx.pairs.map(pair).join('')}</ul>
<div class="dl-two">${roleList('light', 'Interface roles, light')}${roleList('dark', 'Interface roles, dark')}</div>`;
  return sec('colour', `${panel(net, { cls: 'dl-pn--net', flap: flap('colour') })}${panel(board, { cls: 'dl-pn--board', dust: dust() })}`);
}

// ---- 5 Typography: the side panel (the gusset) printed with the faces; then a line to try, the scale and the rules ----
function typography(ctx, R) {
  const B = ctx.brand, F = B.fonts, T = B.type, W = ctx.weights, hex = R.side.hex, P = pack(ctx);
  const dW = W.heading, bW = W.semibold || W.medium || W.regular, mW = F.mono ? F.mono.weights[0] : 400;
  const side = `<div class="dl-faces">
<div class="dl-face"><p class="dl-face__big disp dl-fit" style="${fit(ctx, F.display.family, { w: 760, max: 160, min: 48, lines: 2 }, { w: 270, max: 72, min: 28, lines: 3 })}">${A(F.display.family)}</p><p class="dl-face__d"><span class="dl-face__k">Display, ${A(F.display.weights.map(wName).join(', '))}.</span> ${A(P.type.display)}</p></div>
<div class="dl-face">${svgH('fold', 'dl-facefold')}<p class="dl-face__mid" style="font-weight:${bW};font-size:${wordCap(ctx, F.body.family, 40, 'body', bW)}">${A(F.body.family)}</p><p class="dl-face__d"><span class="dl-face__k">Text, ${A(F.body.weights.map(wName).join(', '))}.</span> ${A(P.type.body)}</p></div>
${F.mono ? `<div class="dl-face">${svgH('fold', 'dl-facefold')}<p class="dl-face__mono" style="font-weight:${mW}">${A(F.mono.family)}</p><p class="dl-face__d"><span class="dl-face__k">Values, ${A(F.mono.weights.map(wName).join(', '))}.</span> ${A(P.type.mono)}</p></div>` : ''}
</div>`;
  const fams = [F.display.family, F.body.family, F.mono && F.mono.family].filter((f, i, a) => f && a.indexOf(f) === i);
  const tester = `<div class="dl-tester" data-tester>${svgH('seal', 'dl-testseal')}
<p class="dl-tester__out disp" data-tester-out aria-hidden="true">${A(T.sample.headline)}</p>
<div class="dl-tester__c"><div class="dl-field"><label for="tester-text">Your line</label><input id="tester-text" type="text" value="${A(T.sample.headline)}" data-tester-text data-default="${A(T.sample.headline)}" autocomplete="off" spellcheck="false"></div>
<div class="dl-field"><label for="tester-size">Size <output for="tester-size" data-tester-value class="m">56 px</output></label><input id="tester-size" type="range" min="16" max="144" step="1" value="56" data-tester-size></div></div></div>`;
  const scale = `<ol class="dl-scale">${T.scale.map((s) => {
    const disp = s.face === 'display', text = disp ? T.sample.headline : T.sample.paragraph;
    const fs = wordCap(ctx, text, s.size, disp ? 'display' : 'body', s.weight);
    return `<li><div class="dl-scale__k"><p class="dl-scale__t">${A(ctx.cap(s.token))}</p><p class="dl-q"><span class="m">${s.size} px</span>, line <span class="m">${s.line}</span>, ${A(WEIGHT[s.weight] || s.weight)}. ${A(s.use)}</p></div><p class="dl-scale__s${disp ? ' disp' : ''}" style="font-weight:${s.weight};line-height:${s.line};font-size:${fs}">${A(text)}</p></li>`;
  }).join('')}</ol>`;
  const board = `<p class="dl-chars disp" aria-label="The character set">ABCDEFGHIJKLMNOPQRSTUVWXYZ<br>abcdefghijklmnopqrstuvwxyz<br>${A(P.type.charset)}</p>
<p class="dl-p dl-narrow">${A(listAnd(fams))} ${fams.length > 1 ? 'are' : 'is'} open source under the SIL Open Font Licence: free in print and on screen.</p>
${h3('Try a line')}${tester}
${h3('The scale')}${scale}
${h3('Rules')}${rules(T.rules)}`;
  return sec('typography', `${panel(side, { R, hex, cls: 'dl-pn--side', flap: flap('typography') })}${panel(board, { cls: 'dl-pn--board' })}`);
}

// ---- 6 Imagery: a window cut in the net, the first photograph in it (or the brief for it); then the direction and the shot list ----
// a shot with no photograph is the brief for one: the frame in dashed crop marks, the shot's name, then what to shoot (the slot text splits at its first colon)
function briefCard(s, i, n, lead) {
  const t = String(s.slot || s.alt || ''), c = t.indexOf(': '), name = c > 0 && c < 48 ? t.slice(0, c) : String(s.id || `shot ${i + 1}`).replace(/^./, (x) => x.toUpperCase()), text = c > 0 && c < 48 ? t.slice(c + 2).replace(/^./, (x) => x.toUpperCase()) : t;
  return `<div class="dl-brief${lead ? ' dl-brief--lead' : ''}" role="img" aria-label="${A(`Shot ${i + 1} of ${n}, to be shot. ${t}`)}"><p class="dl-brief__k">${lead ? 'The lead frame, ' : ''}shot ${i + 1} of ${n}, to be shot</p><p class="dl-brief__t disp">${A(name)}</p><p class="dl-brief__p">${A(text)}</p>${lead ? '<span class="dl-brief__g" aria-hidden="true">Keep this third clear for a line of type</span>' : ''}</div>`;
}
function imagery(ctx, R) {
  const B = ctx.brand, D = B.imagery.direction, shots = B.imagery.shots, first = shots.find((s) => s.photo) || shots[0];
  const hero = `<figure class="dl-window${first.photo ? '' : ' dl-window--brief'}">${first.photo ? ctx.photo(first.id, { cls: 'dl-photo', pos: '50% 45%' }) : briefCard(first, shots.indexOf(first), shots.length, true)}</figure>`;
  const fig = (s, i) => {
    if (!s.photo) return `<li class="dl-shot">${svgV('fold', 'dl-cellv')}${svgH('fold', 'dl-cellh')}<figure>${briefCard(s, i, shots.length)}</figure></li>`;
    const f = s.photo ? ctx.book.find(`05 Imagery/photos/${s.photo.split('/').pop()}`) : null;
    const cap = s.photo ? `${A(s.caption || s.alt || '')}` : A(s.slot);
    return `<li class="dl-shot">${svgV('fold', 'dl-cellv')}${svgH('fold', 'dl-cellh')}<figure>${ctx.photo(s.id, { cls: 'dl-photo', slotNote: false })}<figcaption class="dl-q">${cap}${f ? ` ${dlLink(f, 'photo ' + (s.caption || s.id), 'Download JPG')}` : ''}</figcaption></figure></li>`;
  };
  const rows = [['Light', D.light], ['Crop', D.crop], ['Colour', D.colour], ['People', D.people]].filter(([, v]) => v);
  const board = `<p class="dl-lead">${A(D.subject)}</p>
<dl class="dl-rows">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${A(v)}</dd></div>`).join('')}</dl>
<div class="dl-narrow">${h3('The shot list')}<p class="dl-p">${shots.some((s) => s.photo) ? 'The photographs in the kit, each with its caption.' : 'No photographs yet. Each frame is the brief for one shot: who, where, the crop and the light.'}</p></div>
<ul class="dl-strip dl-strip--shots">${shots.map(fig).join('')}</ul>
${h3('Rules')}${rules(B.imagery.rules)}`;
  return sec('imagery', `${panel(hero, { cls: 'dl-pn--photo', flap: flap('imagery') })}${panel(board, { cls: 'dl-pn--board' })}`);
}

// ---- 7 Layout: the page grid drawn as a panel of its own, its column count beside it; then the measures, spacing and corners ----
function layout(ctx, R) {
  const G = ctx.gridMeasures, B = ctx.brand;
  const m = (G.margin / G.page.w) * 100, inner = G.page.w - 2 * G.margin, gap = (G.gutter / inner) * 100;
  const col = String(Math.round(G.col * 10) / 10);
  const grid = `<div class="dl-grid"><div class="dl-grid__page" role="img" aria-label="The page grid: ${G.columns} columns, ${G.margin} pixel margins and ${G.gutter} pixel gutters on a ${G.page.w} by ${G.page.h} page" style="aspect-ratio:${G.page.w}/${G.page.h};padding:${m.toFixed(3)}%"><svg class="dl-box dl-fold" aria-hidden="true" focusable="false"><rect x="0.75" y="0.75" width="100%" height="100%"/></svg><div class="dl-grid__cols" style="column-gap:${gap.toFixed(3)}%;grid-template-columns:repeat(${G.columns},minmax(0,1fr))">${Array.from({ length: G.columns }, () => '<i></i>').join('')}</div></div>
<div class="dl-grid__n"><p class="dl-grid__big disp">${G.columns}</p><p class="dl-p">columns on a <span class="m">${G.page.w} × ${G.page.h}</span> page</p></div></div>`;
  const meas = `<dl class="dl-meas">${[['Margin', G.margin], ['Gutter', G.gutter], ['Column', col], ['Base', G.base]].map(([k, v]) => `<div>${svgV('fold', 'dl-cellv')}<dt>${k}</dt><dd><span class="disp">${v}</span> <span class="m">px</span></dd></div>`).join('')}</dl>`;
  const space = `<ol class="dl-space">${ctx.space.map((s) => `<li><i style="width:${s.px}px;height:${s.px}px" aria-hidden="true"></i><span class="m">${s.px}</span></li>`).join('')}</ol>`;
  const radii = ctx.radii.filter((r) => r.px < 9999);
  const board = `${grid}${meas}
<div class="dl-two"><div>${h3('Spacing')}<p class="dl-p">Every gap is a step of ${G.base} px. Space inside a group is smaller than the space between groups.</p>${space}</div>
<div>${h3('Corners and edges')}<p class="dl-p">Edges are <span class="m">${B.ui.border} px</span>. ${A(B.ui.elevationNote || '')}</p><ul class="dl-radii">${radii.map((r) => `<li><i style="border-radius:${r.px}px" aria-hidden="true"></i><span class="dl-q">${A(r.use)}, <span class="m">${r.px} px</span></span></li>`).join('')}</ul></div></div>`;
  return sec('layout', `${panel(board, { cls: 'dl-pn--board dl-pn--layout', flap: flap('layout'), dust: dust() })}`);
}

// ---- 8 Applications: the flap colour's panel with the printed pieces laid on it (card, posts), then the inbox and the product on board ----
function applications(ctx, R) {
  const B = ctx.brand, ap = B.applications, S = B.ui.screen.content, hex = R.flap.hex;
  const fr = R.front.hex, frT = R.textOn(fr), gr = R.ground.hex, grT = R.textOn(gr);
  ctx.pair(frT.ink, fr, { size: 13, what: 'book business card' }); ctx.pair(grT.ink, gr, { size: 13, what: 'book business card back' });
  const front = `<div class="dl-card" style="background:${fr};color:${frT.ink}" role="img" aria-label="Business card, front: the logo and the line ${A(B.lines.primary)}"><span class="dl-card__lg">${logoOn(ctx, R, 'colour', fr, 180)}</span><p class="dl-card__l">${A(B.lines.primary)}</p></div>`;
  const back = `<div class="dl-card dl-card--back" style="background:${gr};color:${grT.ink}"><p class="dl-card__nm">${A(ap.card.person)}</p><p>${A(ap.card.role)}</p><p class="dl-card__ct">${A(ap.card.contact)}<br>${A(ap.site.url)}</p></div>`;
  const grounds = [R.front.hex, R.back.hex, R.side.hex];
  const posts = `<ul class="dl-posts">${ap.social.slice(0, 3).map((t, i) => {
    const bg = grounds[i % 3] === hex ? gr : grounds[i % 3], ink = R.textOn(bg).ink;
    ctx.pair(ink, bg, { size: 24, what: 'book social post' });
    return `<li class="dl-post" style="background:${bg};color:${ink}"><p class="disp" style="font-size:${wordCap(ctx, t, 26, 'display', ctx.weights.heading, 180)}">${A(t)}</p><span class="dl-post__lg">${logoOn(ctx, R, 'colour', bg, 96)}</span></li>`;
  }).join('')}</ul>`;
  const K = pack(ctx);
  const printed = `<div class="dl-apps"><div class="dl-app dl-app--pack">${h3(SCENES[K.kind] ? 'Packaging' : 'Poster')}${photographed(ctx, R, K)}</div>
<div class="dl-app">${h3('Business card')}<p class="dl-q">90 × 55 mm, front and back.</p><div class="dl-cards">${front}${back}</div></div>
<div class="dl-app">${h3('Social')}<p class="dl-q">The brand&rsquo;s lines, one to a post.</p>${posts}</div></div>`;
  const email = `<div class="dl-email"><p class="dl-email__n">${A(ap.email.person)}</p><p>${A(ap.email.role)}, ${A(B.name)}</p><p class="dl-q">${A(ap.card.contact)}<br>${A(ap.site.url)}</p><div class="dl-email__l">${logoBoard(ctx, R, 'horizontal', 168)}</div></div>`;
  const rowsS = S.deliveries.slice(0, 3);
  const screen = `<div class="dl-device"><div class="ui dl-screen" role="img" aria-label="${A(B.name)} product screen: ${A(S.eta)}. ${A(S.rider)}, ${A(S.riderNote)}." inert>
<div class="dl-scr__top"><span class="ui-num">${A(S.time)}</span>${ctx.ui.statusChip(rowsS[0] ? rowsS[0].status : 'on-the-way')}</div>
<p class="ui-display dl-scr__eta">${A(S.eta)}</p><p class="dl-scr__note">${A(S.pickup)}</p>
<div class="ui-progress"><div class="ui-progress__bar"><i style="width:${S.progress * 100}%"></i></div><span class="ui-progress__dot" style="left:${S.progress * 100}%"></span></div>
<div class="dl-scr__ft"><span>${A(S.from)}</span><span>${A(S.to)}</span></div>
<ul class="ui-list">${rowsS.map((d) => ctx.ui.row({ title: d.to, sub: d.when, end: d.price, chip: ctx.ui.statusChip(d.status) })).join('')}</ul>
</div></div>`;
  const board = `<div class="dl-two dl-two--app"><div>${h3('Email signature')}<p class="dl-q">Name, role, contact and the horizontal logo.</p>${email}</div>
<div>${h3('Product screen')}<p class="dl-q">${A(B.ui.screen.title || 'The product')}</p>${screen}</div></div>`;
  return sec('applications', `${panel(printed, { R, hex, cls: 'dl-pn--apps', flap: flap('applications') })}${panel(board, { cls: 'dl-pn--board', dust: dust() })}`);
}

// ---- 9 Downloads: the last panel, the kit and its folders, closed by the pack's bottom closure ----
function downloads(ctx, R, P) {
  const D = ctx.book, L = ctx.logo, slot = ctx.edition === 'slot', B = ctx.brand;
  const file = (f) => `<li class="dl-file"><span class="dl-file__n">${A(f.name)}</span><span class="m dl-q">${A(f.ext)}, ${A(f.sizeText)}</span><a class="dl-dl" href="${A(f.href)}" download aria-label="Download ${A(f.name)}">Download</a></li>`;
  const files = (list) => `<ul class="dl-files">${list.filter(Boolean).map(file).join('')}</ul>`;
  const logoRows = slot ? files(D.logoFiles)
    : `<ul class="dl-files">${L.versions.map((id) => { const f = D.logo(id); return `<li class="dl-file"><span class="dl-file__n">${A(L.labels[id])}</span><span class="dl-dls">${dlLink(f.svg, L.labels[id] + ' logo')}${dlLink(f.pdf, L.labels[id] + ' logo')}${f.png.map((p) => dlLink(p, `${L.labels[id]} logo, PNG, ${p.w} px wide`, `PNG ${p.w}`)).join('')}</span></li>`; }).join('')}</ul>`;
  const icons = `<ul class="dl-icons">${D.icons.map((f) => `<li><a class="dl-icon" href="${A(f.href)}" download aria-label="Download ${A(f.name)} icon, SVG">${ctx.ui.icon(f.name.replace('.svg', ''), 24)}<span>${A(f.name.replace('.svg', ''))}</span></a></li>`).join('')}</ul>${files([D.iconsLicence])}`;
  const photos = D.imagery.filter((f) => f.rel.startsWith('05 Imagery/photos/')), pdfs = D.imagery.filter((f) => f.ext === 'PDF');
  const group = (title, what, inner) => `<li class="dl-group">${svgH('fold', 'dl-groupfold')}<div class="dl-group__k"><h3 class="dl-group__n disp">${A(title)}</h3><p class="dl-q">${A(what)}</p></div><div class="dl-group__v">${inner}</div></li>`;
  const kitName = `${B.name} brand kit`;
  const board = `<div class="dl-zip"><p class="dl-zip__n disp dl-fit" style="${fit(ctx, kitName, { w: 560, max: 88, min: 40, lines: 2 }, { w: 270, max: 48, min: 28, lines: 3 })}">${A(B.name)} brand kit</p>
<p class="dl-p">Logo, colour, type, icons and imagery in one zip, ready for print and screen.</p>
<p class="dl-zip__a"><a class="bk-btn dl-btn dl-btn--prime" href="${A(D.zip.href)}" download aria-label="Download ${A(D.zip.name)}, ${A(D.zip.sizeText)}"><span class="bk-btn__t">Download the kit</span></a><span class="m dl-q">${A(D.zip.name)}, ${A(D.zip.sizeText)}</span></p></div>
<ol class="dl-groups">
${group('Read me', 'Start here: what is in the kit and how to use it.', files([D.readmePdf, D.readme]))}
${group('Logo', slot ? 'The labelled slot frame, and where the approved files go.' : 'Each version as SVG and PDF, and as PNG at three widths, transparent.', logoRows)}
${group('Colour', 'The palette for Adobe, CSS and JSON, and a swatch sheet.', files(D.colour))}
${group('Type', 'The specimen sheet, and the faces with their links and licence.', files(D.type))}
${group('Icons', `${D.icons.length} interface icons, drawn in the brand's stroke.`, icons)}
${group('Imagery', photos.length ? 'The photography direction, and the photos.' : 'The photography direction and shot list.', files([...pdfs, ...photos]))}
</ol>`;
  const bag = P.kind === 'bag', sat = P.kind === 'satchel';
  const close = bag ? svgH('fold', 'dl-gusset') : sat ? `${svgH('seal', 'dl-weld')}<span class="dl-weldc">${crimp()}</span>` : '';
  return sec('downloads', `${panel(board + close, { cls: `dl-pn--board dl-pn--last is-${P.kind}`, flap: flap('downloads') })}${foot(ctx, R, P)}`);
}

export function brandBook(ctx) {
  if (!ctx.book) throw new Error('brandBook needs ctx.book (set by the engine book builder)');
  const R = roles(ctx), P = pack(ctx);
  return [overview, voice, logo, colour, typography, imagery, layout, applications, downloads].map((f) => f(ctx, R, P)).join('\n');
}
