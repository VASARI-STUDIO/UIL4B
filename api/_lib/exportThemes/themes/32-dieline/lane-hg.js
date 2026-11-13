// Theme 32, Dieline, lane hg: the guidelines web site (guideSite). Every page is one run of the brand's pack, die-cut and laid down the screen
// the way the book lays it (lane-bk.js): a printed panel carrying the brand at work, then the unprinted board with the reading, joined by a
// fold, closed by the pack's own top and bottom closure, the section's number and name on a tuck flap. Each page prints a different role of
// the net (front, back, side, flap), and the locator in the bar outlines that colour. The shared parts (the net, the bar, the side nav, the
// pager and their CSS) come read-only from lane-ht-net.js; this file holds the pages and lane-hg-css.js their CSS.
import { roles, pack, allocate, measure, wrap, r2, sentences } from './geom.js';
import { A, net, win, h2, lead, para, quiet, rows, rules, mono, strip, cellVars, printVars, fit, wordCap, logoOn, logoBoard, svgH, svgV, bar, contentsNav, pager, netCss } from './lane-ht-net.js';
import { pageCss } from './lane-hg-css.js';

// the sections of the site, in order, with the pages on each (the primer's map)
const SECS = [
  ['Introduction', ['intro', 'personality']],
  ['Voice', ['voice', 'write-this', 'messaging']],
  ['Logo', ['logo', 'logo-versions', 'clear-space', 'min-size', 'logo-grounds', 'logo-misuse']],
  ['Colour', ['palette', 'proportion', 'contrast', 'colour-values']],
  ['Typography', ['typefaces', 'hierarchy', 'type-in-use', 'type-rules']],
  ['Imagery', ['photo-direction', 'shot-list', 'imagery-rules']],
  ['Layout', ['grid', 'layouts']],
  ['Applications', ['business-card', 'social', 'signage', 'email-signature', 'digital']],
  ['Close', ['summary', 'contact-scope']],
];
const secOf = (id) => { const i = SECS.findIndex(([, ids]) => ids.includes(id)); return i < 0 ? { n: '', t: '' } : { n: String(i + 1).padStart(2, '0'), t: SECS[i][0] }; };
const WEIGHT = { 100: 'Thin', 200: 'ExtraLight', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold', 900: 'Black' };
const wName = (w) => `${WEIGHT[w] || w} ${w}`;
const listAnd = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
// a literal dotted value (a version, a ratio, a line height) that must not be read as a clause number, in the reading face
const lit = (t) => `<span class="m hg-lit">${A(t)}</span>`;
const SCENES = { bag: 'counter-pouch-shelf', box: 'counter-bag-handover', poster: 'kerb-shelter-morning' };
// the satchel's poster hangs in a bus shelter (the scene), and the caption says so; the headline is the poster's own
const POSTER_CAP = 'Bus shelter poster, one line to read from across the road.';
const POSTER_ALT = 'A poster panel in a tram stop shelter, printed with the logo and one line';

// one page's net: the flap carries this page's section, the bar's locator outlines `hex`
const page = (ctx, R, id, panels, hex) => net(ctx, R, pack(ctx), panels, { flap: secOf(id), hex: hex || R.ground.hex, cls: `hg-net hg-net--${id}` });
const pr = (hex, html, cls = '') => ({ hex, html, cls });
const bd = (html, cls = '') => ({ html, cls });

// ---- photographed art, as the book draws it (bagArt, posterArt, cropPct, photographed) ----
const px = (n) => `${r2(n)}px`;
const at = (x, y, w, h, cls, html, style = '') => `<div class="tx ${cls}" style="position:absolute;left:${px(x)};top:${px(y)};width:${px(w)};height:${px(h)};margin:0;white-space:nowrap;${style}">${html}</div>`;
const artDoc = (ctx, R, w, h, inner) => ({ w, h, html: ctx.artPage(`<div style="position:relative;width:${w}px;height:${h}px;overflow:hidden;background:${R.front.hex}">${inner}</div>`, { w, h }) });
const artSize = (ctx, sceneId, w) => { const q = ctx.sceneInfo(sceneId).quads[0]; return [w, Math.round(w / q.aspect)]; };
function bagArt(ctx, R, K, sceneId, w0) {
  const W = ctx.weights, tx = R.textOn(R.front.hex), [w, h] = artSize(ctx, sceneId, w0), s = w / 520, m = 48 * s, iw = w - 2 * m, p = K.product;
  let o = '';
  if (K.place) o += at(m, 104 * s, iw, 24 * s, 'b-small', A(K.place), `font-size:${17 * s}px;line-height:${24 * s}px;color:${tx.quiet}`);
  let cur = h - 72 * s;
  if (p.net) { o += at(m, cur - 4 * s, iw, 24 * s, 'b-small', A(p.net), `font-size:${17 * s}px;line-height:${24 * s}px;color:${tx.mid}`); cur -= 36 * s; }
  if (p.date) { const ds = Math.round(56 * s); o += at(m, cur - ds, iw, ds, 'disp', A(p.date), `font-size:${ds}px;line-height:${ds}px;color:${tx.quiet}`); cur -= ds + 48 * s; }
  if (p.note) { const nr = wrap(ctx, 'body', W.regular, p.note, 18 * s, iw); o += at(m, cur - nr.length * 26 * s, iw, nr.length * 26 * s, 'b-body', nr.map(A).join('<br>'), `font-size:${18 * s}px;line-height:${26 * s}px;color:${tx.mid}`); cur -= nr.length * 26 * s + 16 * s; }
  const ns = Math.round(40 * s); o += at(m, cur - ns, iw, ns, 'disp', A(p.name), `font-size:${ns}px;line-height:${ns}px;color:${tx.ink}`); cur -= ns + 56 * s;
  const lw = Math.min(p.logoW * s, iw), lh = lw / ctx.logo.geo.aspect;
  o += at(m, cur - lh, lw, lh, '', ctx.logo.html('colour', { width: lw, colourway: R.colourwayOn(R.front.hex), color: tx.ink }));
  return artDoc(ctx, R, w, h, o);
}
function posterArt(ctx, R, K, sceneId, w0) {
  const W = ctx.weights, tx = R.textOn(R.front.hex), [w, h] = artSize(ctx, sceneId, w0), m = 48, iw = w - 2 * m, name = K.product.poster || K.product.name;
  let o = '';
  const lw = Math.min(360, iw), lh = lw / ctx.logo.geo.aspect;
  o += at(m, m, lw, lh, '', ctx.logo.html('colour', { width: lw, colourway: R.colourwayOn(R.front.hex), color: tx.ink }));
  let sz = 112, rws; for (const s of [112, 96, 80, 64]) { sz = s; rws = wrap(ctx, 'display', W.heading, name, s, iw); if (rws.length <= 3 && rws.every((r) => measure(ctx, 'display', W.heading, r, s) <= iw)) break; }
  const lh2 = Math.round(sz * 0.92);
  o += at(m, h - m - rws.length * lh2, iw, rws.length * lh2, 'disp', rws.map(A).join('<br>'), `font-size:${sz}px;line-height:${lh2}px;color:${tx.ink}`);
  return artDoc(ctx, R, w, h, o);
}
function cropPct(ctx, sceneId, bw, bh, fill) {
  const sc = ctx.sceneInfo(sceneId), q = sc.quads[0].corners, xs = q.map((c) => c[0]), ys = q.map((c) => c[1]);
  const qh = Math.max(...ys) - Math.min(...ys), cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const k = Math.max(fill * bh / qh, bw / sc.w, bh / sc.h), cl = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const left = cl(bw / 2 - cx * k, bw - sc.w * k, 0), top = cl(bh / 2 - cy * k, bh - sc.h * k, 0);
  return { w: (sc.w * k / bw * 100).toFixed(3), l: (left / bw * 100).toFixed(3), t: (top / bh * 100).toFixed(3) };
}
// the fascia's art, as the guidelines print it: the horizontal logo at the left, the word at the right, 56 in from each end
function fasciaArt(ctx, R, K, sceneId, w0) {
  const tx = R.textOn(R.front.hex), [w, h] = artSize(ctx, sceneId, w0), g = ctx.logo.geos.horizontal, lh = Math.round(h * 0.52), lw = lh * g.w / g.h, fs = Math.round(h * 0.5), e = 64;
  let o = at(e, (h - lh) / 2, lw, lh, '', ctx.logo.html('horizontal', { width: lw, colourway: R.colourwayOn(R.front.hex), color: tx.ink }));
  if (K.product.fascia) o += at(w - e - 640, (h - fs) / 2, 640, fs, 'disp', A(K.product.fascia), `font-size:${fs}px;line-height:${fs}px;text-align:right;color:${tx.quiet}`);
  return artDoc(ctx, R, w, h, o);
}
// one photographed figure: scene, art, the wide box and the phone box (--ar and --arn), the crop for each
function shotFigure(ctx, sid, art, [bw, bh], [nw, nh], fill, alt, cap) {
  const url = ctx.mockup(sid, [art]), cw = cropPct(ctx, sid, bw, bh, fill), cn = cropPct(ctx, sid, nw, nh, fill);
  return `<figure class="hg-shotp"><div class="hg-shotp__w" style="--ar:${bw}/${bh};--arn:${nw}/${nh};--mw:${bh > bw * 0.8 ? `${bw}px` : "none"};--cw:${cw.w}%;--cl:${cw.l}%;--ct:${cw.t}%;--cnw:${cn.w}%;--cnl:${cn.l}%;--cnt:${cn.t}%"><img src="${A(url)}" alt="${A(alt)}" decoding="async"></div>
${cap[0] ? `<figcaption class="hs-q">${A(cap[0])}${cap[1] ? ` ${A(cap[1])}` : ''}</figcaption>` : ''}</figure>`;
}
// the pack on its own surface (bag or box), then the second surface the brand names: the fascia over the shop door, or the satchel's shelter poster.
// A tall poster gets a tall box (a landscape crop cuts its headline), as in the book.
function photographed(ctx, R, K) {
  const own = SCENES[K.kind], sid = own || SCENES.poster, S = K.signage, nm = K.name || ctx.brand.name;
  if (!own) return shotFigure(ctx, sid, posterArt(ctx, R, K, sid, 520), [560, 700], [4, 5], 0.66, POSTER_ALT, [POSTER_CAP, S.secondVal]);
  const bag = shotFigure(ctx, sid, bagArt(ctx, R, K, sid, sid === SCENES.bag ? 520 : 1008), [832, 520], [4, 5], 0.78, `${nm}, front panel, photographed`, [S.hero, S.heroVal]);
  const fs = S.secondScene && ctx.sceneInfo(S.secondScene).quads[0].aspect > 2 ? S.secondScene : '';
  if (!fs) return bag;
  const fascia = shotFigure(ctx, fs, fasciaArt(ctx, R, K, fs, 1376), [832, 440], [832, 440], 0.34, `${nm} fascia over the shop door, photographed`, [S.second, S.secondVal]);
  return `${bag}${fascia}`;
}

// ---- 01 Introduction ----
function intro(ctx, R, P) {
  const B = ctx.brand, hex = R.front.hex, line = B.lines.primary;
  const face = `<div class="hg-cover">${P.place || B.city ? `<p class="hg-place">${A(P.place || B.city)}</p>` : ''}
<div class="hg-cover__lg">${logoOn(ctx, R, 'colour', hex, 360)}</div>
<p class="hg-hero disp hs-fit" style="${fit(ctx, line, { max: 120, min: 44, lines: 2 }, { max: 60, min: 28, lines: 4 })}">${A(line)}</p></div>`;
  const board = `${lead(A(B.description))}
<div class="hs-two"><div>${h2('What it does')}${para(A(B.product))}</div><div>${h2('Who it serves')}${para(A(B.audience))}</div></div>`;
  return page(ctx, R, 'intro', [pr(hex, face, 'hg-pn--face'), bd(board)], hex);
}
function personality(ctx, R) {
  const B = ctx.brand, hex = R.side.hex, T = B.personality;
  const longest = T.map((p) => p.trait).reduce((a, b) => (measure(ctx, 'display', ctx.weights.heading, a, 40) >= measure(ctx, 'display', ctx.weights.heading, b, 40) ? a : b), '');
  const st = fit(ctx, longest, { w: 360, max: 64, min: 28, lines: 1 }, { max: 44, min: 24, lines: 1 });
  const face = `<ol class="hg-traits">${T.map((p, i) => `<li>${i ? svgH('fold', 'hg-tfold') : ''}<p class="hg-trait disp hs-fit" style="${st}">${A(p.trait)}</p><p class="hs-p">${A(p.means)}</p></li>`).join('')}</ol>`;
  const board = `${h2('How the traits work together')}${para(`${A(B.name)} is ${A(listAnd(T.map((p) => p.trait.toLowerCase())))}. Each trait is a test for a page: read it back against all ${T.length} before it goes out.`)}`;
  return page(ctx, R, 'personality', [pr(hex, face), bd(board)], hex);
}

// ---- 02 Voice ----
function voice(ctx, R) {
  const V = ctx.brand.voice, hex = R.back.hex, ex = V.principles.map((p) => p.example);
  const longest = ex.reduce((a, b) => (measure(ctx, 'display', ctx.weights.heading, a, 40) >= measure(ctx, 'display', ctx.weights.heading, b, 40) ? a : b), '');
  const st = fit(ctx, longest, { max: 52, min: 26, lines: 2 }, { max: 30, min: 20, lines: 4 });
  const face = `<ol class="hg-say">${V.principles.map((p, i) => `<li>${i ? svgH('fold', 'hg-tfold') : ''}<p class="hg-say__k">${A(p.title)}</p><p class="hg-say__x disp hs-fit" style="${st}">${A(p.example)}</p></li>`).join('')}</ol>`;
  const board = `${h2('Writing the name')}${para(A(V.nameRules))}`;
  return page(ctx, R, 'voice', [pr(hex, face), bd(board)], hex);
}
function writeThis(ctx, R) {
  const V = ctx.brand.voice, hex = R.flap.hex;
  const list = `<ul class="hg-wtn">${V.writeThis.map((r, i) => `<li>${i ? svgH('fold', 'hg-tfold') : ''}<p class="hg-wtn__w disp" style="font-size:${wordCap(ctx, r.write, 26, 'display', ctx.weights.heading)}">${A(r.write)}</p><p class="hg-wtn__n"><span class="hs-do">Not</span> <s>${A(r.not)}</s></p><p class="hs-q hg-wtn__b">${A(r.because)}</p></li>`).join('')}</ul>`;
  return page(ctx, R, 'write-this', [pr(hex, list)], hex);
}
function messaging(ctx, R) {
  const B = ctx.brand, V = B.voice, hex = R.front.hex, all = [B.lines.primary, ...(B.lines.others || [])];
  const face = `<ul class="hg-lines">${all.map((l, i) => `<li class="disp${i ? '' : ' is-first'}" style="font-size:${i ? wordCap(ctx, l, 32, 'display', ctx.weights.heading) : wordCap(ctx, l, 56, 'display', ctx.weights.heading)}">${A(l)}</li>`).join('')}</ul>`;
  const take = (t, text) => `<div class="hg-take">${h2(t)}<p class="hg-take__t">${A(text)}</p></div>`;
  const board = `<div class="hs-two">${take('The brand in 25 words', V.boilerplate25)}${take('The brand in 50 words', V.boilerplate50)}</div>`;
  return page(ctx, R, 'messaging', [pr(hex, face), bd(board)], hex);
}

// ---- 03 Logo ----
function logo(ctx, R) {
  const B = ctx.brand, hex = R.front.hex;
  const big = `<div class="hg-logohero">${logoBoard(ctx, R, 'colour', 560)}</div>${para(A(B.logo.idea))}`;
  const onPack = `<div class="hg-logopack">${logoOn(ctx, R, 'colour', hex, 320)}</div>${quiet(`On the front of the ${A(pack(ctx).noun)}, in the colourway drawn for it.`)}`;
  return page(ctx, R, 'logo', [bd(big, 'hg-pn--logo'), pr(hex, onPack)], hex);
}
function logoVersions(ctx, R) {
  const B = ctx.brand, L = ctx.logo, cw = B.logo.colourways, slot = ctx.edition === 'slot';
  const order = ['colour', 'reversed', 'mono-dark', 'mono-light', 'horizontal', 'stacked', 'symbol'].filter((id) => L.versions.includes(id));
  const cells = order.map((id) => {
    const w = cw[L.colourwayOf(id)], g = L.geos[id];
    const maxW = id === 'symbol' ? 72 : id === 'stacked' ? 120 : 176, lw = Math.floor(Math.min(maxW, 64 * g.w / g.h));
    return { ...cellVars(R, w.ground), cls: 'hg-vcell', html: `<span class="hg-vcell__lg"><span class="hs-logo" style="--lw:${lw}px;--ar:${g.w.toFixed(2)}/${g.h.toFixed(2)}">${L.html(id, { width: lw, color: w.name, label: 'Logo' })}</span></span><span class="hg-vcell__k">${A(L.labels[id])}</span><span class="hs-q">${A(B.logo.when[id] || '')}</span>` };
  });
  const board = `${para(`Each version is printed on the ground it is made for. ${slot ? 'The frames hold the place and the proportion until the approved files go in the kit&rsquo;s logo folder.' : 'The files are in the brand kit&rsquo;s logo folder.'}`)}${strip(cells, 'hg-vstrip')}`;
  return page(ctx, R, 'logo-versions', [bd(board)], R.ground.hex);
}
function clearSpace(ctx, R) {
  const L = ctx.logo, geo = L.geo, padPct = (L.clearShare / 100) * geo.height / geo.width * 100, hex = R.back.hex;
  const box = `<div class="hg-clear"><div class="hg-clear__b" style="--pp:${(padPct / 100).toFixed(5)};--lw:360px"><svg class="hg-box" aria-hidden="true" focusable="false"><rect x="0.75" y="0.75" width="100%" height="100%"/></svg>${logoBoard(ctx, R, 'colour', 360)}</div></div>`;
  const onPrint = `<div class="hg-clear hg-clear--p"><div class="hg-clear__b" style="--pp:${(padPct / 100).toFixed(5)};--lw:240px"><svg class="hg-box" aria-hidden="true" focusable="false"><rect x="0.75" y="0.75" width="100%" height="100%"/></svg>${logoOn(ctx, R, 'colour', hex, 240)}</div></div>`;
  return page(ctx, R, 'clear-space', [bd(`${box}${para(`Keep ${L.clearShare}% of the logo&rsquo;s height clear on every side. Nothing else crosses the fold line.`)}`), pr(hex, `${onPrint}${quiet('The same space on a printed panel. The fold line is the edge of the clear space, not a border to print.')}`)], hex);
}
function minSize(ctx, R) {
  const ms = ctx.logo.minSize, slot = ctx.edition === 'slot';
  if (slot) return page(ctx, R, 'min-size', [bd(`${para('Set the smallest size once the logo is in place: the width at which every part of it still reads as one mark.')}<div class="hg-min">${logoBoard(ctx, R, 'colour', 160)}</div>`)]);
  const steps = [1, 2, 3].map((k) => `<li><div class="hg-min__lg">${logoBoard(ctx, R, 'colour', ms.screenPx * k)}</div><p class="hs-q">${k === 1 ? 'Smallest, ' : ''}${mono(`${ms.screenPx * k} px`)}</p></li>`).join('');
  const board = `<ol class="hg-mins">${steps}</ol>
${rows([['On screen', `${mono(`${ms.screenPx} px`)} wide. Never smaller.`], ['In print', `${mono(`${ms.printMm} mm`)} wide. Never smaller.`]])}`;
  return page(ctx, R, 'min-size', [bd(board)]);
}
function logoGrounds(ctx, R) {
  const B = ctx.brand, cols = ctx.colours, L = ctx.logo;
  // the logo version drawn in the colourway this ground takes
  const verOn = (hex) => L.versions.find((v) => L.colourwayOf(v) === R.colourwayOn(hex));
  const cells = cols.map((c) => ({ ...cellVars(R, c.hex), cls: 'hg-gcell', html: `<span class="hg-gcell__lg">${logoOn(ctx, R, 'colour', c.hex, 200)}</span><span class="hg-vcell__k">On ${A(c.name)}</span>${verOn(c.hex) ? `<span class="hs-q">${A(ctx.logo.labels[verOn(c.hex)])}</span>` : ''}` }));
  const board = `${para(`The logo goes on every colour of the palette in the colourway drawn for that colour. On a photograph it sits on a calm, even part of the frame.`)}${strip(cells, 'hg-gstrip')}`;
  return page(ctx, R, 'logo-grounds', [bd(board)], R.ground.hex);
}
function logoMisuse(ctx, R) {
  const hex = R.side.hex;
  const show = [['Do not stretch, squash or skew it.', 'hg-mis--stretch'], ['Do not rotate it.', 'hg-mis--rotate'], ['Do not outline it or put it in a box.', 'hg-mis--box'], ['Do not recolour it outside the versions.', 'hg-mis--recol']];
  const more = ['Do not add shadows, glows or other effects.', 'Do not set it on a busy part of a photo.'];
  const L = ctx.logo, g = L.geos.colour, cw = ctx.brand.logo.colourways[R.colourwayOn(hex)];
  const odd = [ctx.colours.find((c) => c.hex !== hex && c.hex !== cw.name && ctx.ratio(c.hex, hex) >= 3), ...ctx.colours].find((c) => c && c.hex.toLowerCase() !== hex.toLowerCase());
  const cells = show.map(([t, cls]) => {
    const art = cls === 'hg-mis--recol' ? `<span class="hs-logo" style="--lw:160px;--ar:${g.w.toFixed(2)}/${g.h.toFixed(2)}">${L.html('colour', { width: 160, colourway: R.colourwayOn(hex), color: odd ? odd.hex : cw.name, label: '' })}</span>` : logoOn(ctx, R, 'colour', hex, 160, '');
    return { ...cellVars(R, hex), cls: `hg-mis ${cls}`, html: `<span class="hg-mis__x" aria-hidden="true"><svg viewBox="0 0 20 20" width="20" height="20" focusable="false"><path d="M4 4L16 16M16 4L4 16"/></svg></span><span class="hg-mis__lg" role="img" aria-label="${A(t)}">${art}</span><span class="hg-vcell__k">${A(t)}</span>` };
  });
  const board = `${strip(cells, 'hg-mstrip')}${h2('And never')}<ul class="hg-never">${more.map((m) => `<li>${A(m)}</li>`).join('')}</ul>`;
  return page(ctx, R, 'logo-misuse', [bd(board)], hex);
}

// ---- 04 Colour ----
const rgb = (ctx, hex) => { const [r, g, b] = ctx.C.hexToRgb(hex); return `rgb(${r}, ${g}, ${b})`; };
function palette(ctx, R, P) {
  const cols = ctx.colours, per = allocate(cols.map((c) => c.share), 1000, 90), B = ctx.brand;
  const cnet = `<div class="hg-cnet">${cols.map((c, i) => {
    const t = R.textOn(c.hex);
    return `<div class="hg-cp" style="${printVars(R, c.hex)};--w:${per[i] / 10}%;--nh:${Math.max(96, Math.round(per[i] * 0.7))}px">${i ? `${svgV('fold', 'hg-cpv')}${svgH('fold', 'hg-cph')}` : ''}<p class="hg-cp__n">${A(c.name)}</p><p class="hg-cp__h">${mono(c.hex)}</p><p class="hg-cp__s disp">${Math.round(c.share * 100)}%</p></div>`;
  }).join('')}</div>`;
  const entry = (c) => `<li><span class="hg-sw" style="background:${c.hex}" aria-hidden="true"></span><div><h2 class="hs-h2 hg-cn disp">${A(c.name)}</h2>${para(A(c.lands))}</div></li>`;
  const board = `${lead(`Colour by share. Each panel of the net is as wide as that colour&rsquo;s share of a ${A(B.name)} page.`)}<ul class="hg-clist">${cols.map(entry).join('')}</ul>
${ctx.tones && ctx.tones.length ? `${h2('Tones')}<ul class="hg-clist">${ctx.tones.map(entry).join('')}</ul>` : ''}`;
  return page(ctx, R, 'palette', [bd(cnet, 'hg-pn--net'), bd(board)], R.ground.hex);
}
function proportion(ctx, R) {
  const B = ctx.brand, order = R.order, per = allocate(order.map((c) => c.share), 1000, 60);
  const panels = order.map((c, i) => pr(c.hex, `<div class="hg-prop" style="--ph:${Math.max(72, Math.round(per[i] * 0.72))}px"><p class="hg-prop__s disp">${Math.round(c.share * 100)}%</p><div><p class="hg-prop__n">${A(c.name)}</p><p class="hs-q">${A(c.lands)}</p></div></div>`, 'hg-pn--prop'));
  panels.push(bd(`${para(`Read down the net: each panel is as tall as its colour&rsquo;s share of a ${A(B.name)} page. Hold the shares on every page, and the brand reads the same at any size.`)}`));
  return page(ctx, R, 'proportion', panels, order[0].hex);
}
function contrast(ctx, R) {
  const B = ctx.brand;
  const cells = ctx.pairs.map((p) => ({ style: `--f:${p.bgHex};--fi:${p.fgHex};--fq:${p.large ? R.textOn(p.bgHex).ink : p.fgHex};--fl:${R.lineOn(p.bgHex)}`, hex: p.bgHex, cls: 'hg-pcell', html: `<p class="hg-pcell__r disp">${lit(p.ratioText)}<span class="hg-pcell__c">&thinsp;:&thinsp;1</span></p><p class="hg-pcell__u">${A(p.use)}</p>` }));
  const board = `${para(`Every text pair ${A(B.name)} uses, in its own colours, with its WCAG ratio. Text needs 4.5&thinsp;:&thinsp;1; type at 24&nbsp;px and over needs 3&thinsp;:&thinsp;1.`)}${strip(cells, 'hg-pstrip')}`;
  return page(ctx, R, 'contrast', [bd(board)], R.back.hex);
}
function colourValues(ctx, R) {
  const cols = [...ctx.colours, ...(ctx.tones || [])];
  const vals = `<ul class="hg-vals">${cols.map((c) => `<li><span class="hg-sw hg-sw--s" style="background:${c.hex}" aria-hidden="true"></span><h2 class="hs-h2">${A(c.name)}</h2><dl><div><dt>HEX</dt><dd>${mono(c.hex)}</dd></div><div><dt>RGB</dt><dd>${mono(rgb(ctx, c.hex))}</dd></div><div><dt>OKLCH</dt><dd>${mono(c.oklch || ctx.C.oklchString(c.hex))}</dd></div>${ctx.C.cmykOf(c) ? `<div><dt>CMYK</dt><dd>${mono(ctx.C.cmykOf(c))}</dd></div>` : ''}</dl></li>`).join('')}</ul>`;
  const roleKeys = [['surface', 'Surface'], ['raised', 'Raised'], ['text', 'Text'], ['quiet', 'Quiet text'], ['border', 'Border'], ['action', 'Action'], ['actionLabel', 'Action label'], ['focus', 'Focus']];
  const toneKeys = [['success', 'Success'], ['warning', 'Warning'], ['danger', 'Danger'], ['info', 'Info']];
  const roleList = (mode, title) => {
    const r = ctx.roles[mode], items = [...roleKeys.map(([k, n]) => [n, r[k]]), ...toneKeys.map(([k, n]) => [n, r[k] && r[k].fg])].filter(([, hx]) => typeof hx === 'string');
    return `<div>${h2(title)}<ul class="hg-roles">${items.map(([n, hx]) => `<li><span class="hg-sw hg-sw--xs" style="background:${hx}" aria-hidden="true"></span><span>${A(n)}</span>${mono(hx)}</li>`).join('')}</ul></div>`;
  };
  return page(ctx, R, 'colour-values', [bd(vals), bd(`<div class="hs-two">${roleList('light', 'Interface roles, light')}${roleList('dark', 'Interface roles, dark')}</div>`)], R.side.hex);
}

// ---- 05 Typography ----
function typefaces(ctx, R, P) {
  const F = ctx.brand.fonts, W = ctx.weights, hex = R.side.hex, bW = W.semibold || W.medium || W.regular, mW = F.mono ? F.mono.weights[0] : 400;
  const face = `<div class="hg-faces">
<div class="hg-face"><p class="hg-face__big disp hs-fit" style="${fit(ctx, F.display.family, { max: 152, min: 48, lines: 2 }, { max: 68, min: 28, lines: 3 })}">${A(F.display.family)}</p><p class="hs-p"><span class="hs-do">Display, ${A(F.display.weights.map(wName).join(', '))}.</span> ${A(P.type.display)}</p></div>
<div class="hg-face">${svgH('fold', 'hg-tfold')}<p class="hg-face__mid" style="font-weight:${bW};font-size:${wordCap(ctx, F.body.family, 40, 'body', bW)}">${A(F.body.family)}</p><p class="hs-p"><span class="hs-do">Text, ${A(F.body.weights.map(wName).join(', '))}.</span> ${A(P.type.body)}</p></div>
${F.mono ? `<div class="hg-face">${svgH('fold', 'hg-tfold')}<p class="hg-face__mono" style="font-weight:${mW}">${A(F.mono.family)}</p><p class="hs-p"><span class="hs-do">Values, ${A(F.mono.weights.map(wName).join(', '))}.</span> ${A(P.type.mono)}</p></div>` : ''}</div>`;
  const fams = [F.display.family, F.body.family, F.mono && F.mono.family].filter((f, i, a) => f && a.indexOf(f) === i);
  const board = `<p class="hg-chars disp" aria-label="The character set">ABCDEFGHIJKLMNOPQRSTUVWXYZ<br>abcdefghijklmnopqrstuvwxyz<br>${A(P.type.charset)}</p>
${para(`${A(listAnd(fams))} ${fams.length > 1 ? 'are' : 'is'} open source under the SIL Open Font Licence: free in print and on screen.`)}`;
  return page(ctx, R, 'typefaces', [pr(hex, face), bd(board)], hex);
}
function hierarchy(ctx, R) {
  const T = ctx.brand.type;
  const scale = `<ol class="hg-scale">${T.scale.map((s, i) => {
    const disp = s.face === 'display', text = disp ? T.sample.headline : T.sample.paragraph;
    return `<li>${i ? svgH('fold', 'hg-tfold') : ''}<div class="hg-scale__k"><p class="hg-scale__t">${A(ctx.cap ? ctx.cap(s.token) : s.token)}</p><p class="hs-q">${mono(`${s.size} px`)}, line ${lit(String(s.line))}, ${A(WEIGHT[s.weight] || s.weight)}. ${A(s.use)}</p></div><p class="hg-scale__s${disp ? ' disp' : ''}" style="font-weight:${s.weight};line-height:${s.line};font-size:${wordCap(ctx, text, s.size, disp ? 'display' : 'body', s.weight)}">${A(text)}</p></li>`;
  }).join('')}</ol>`;
  return page(ctx, R, 'hierarchy', [bd(scale)]);
}
function typeInUse(ctx, R) {
  const B = ctx.brand, T = B.type, hex = R.front.hex, sm = T.sample, s0 = T.scale.find((s) => s.face === 'display') || { weight: ctx.weights.heading };
  const face = `<div class="hg-inuse"><p class="hg-inuse__h disp hs-fit" style="font-weight:${s0.weight};${fit(ctx, sm.headline, { max: 88, min: 36, lines: 3 }, { max: 44, min: 24, lines: 4 })}">${A(sm.headline)}</p>
<p class="hg-inuse__p">${A(sm.paragraph)}</p>${sm.caption ? `<p class="hs-q">${A(sm.caption)}</p>` : ''}</div>`;
  const board = rows([['Headline', `${A(B.fonts.display.family)}, the largest step of the scale. One a page.`], ['Text', `${A(B.fonts.body.family)}, for everything read for longer than a glance.`], ['Caption', 'The smallest step, under the thing it names.']]);
  return page(ctx, R, 'type-in-use', [pr(hex, face), bd(board)], hex);
}
function typeRules(ctx, R) { return page(ctx, R, 'type-rules', [bd(rules(ctx.brand.type.rules))]); }

// ---- 06 Imagery ----
// a shot with no photograph is the brief for one: the frame in dashed crop marks, the shot's name, then what to shoot (the slot text splits at its first colon)
function briefCard(s, i, n, lead) {
  const t = String(s.slot || s.alt || ''), c = t.indexOf(': '), name = c > 0 && c < 48 ? t.slice(0, c) : String(s.id || `shot ${i + 1}`).replace(/^./, (x) => x.toUpperCase()), text = c > 0 && c < 48 ? t.slice(c + 2).replace(/^./, (x) => x.toUpperCase()) : t;
  return `<div class="hg-brief${lead ? ' hg-brief--lead' : ''}" role="img" aria-label="${A(`Shot ${i + 1} of ${n}, to be shot. ${t}`)}"><p class="hg-brief__k">${lead ? 'The lead frame, ' : ''}shot ${i + 1} of ${n}, to be shot</p><p class="hg-brief__t disp">${A(name)}</p><p class="hg-brief__p">${A(text)}</p>${lead ? '<span class="hg-brief__g" aria-hidden="true">Keep this third clear for a line of type</span>' : ''}</div>`;
}
function photoDirection(ctx, R) {
  const B = ctx.brand, D = B.imagery.direction, shots = B.imagery.shots, first = shots.find((s) => s.photo) || shots[0];
  const hero = `<figure class="hg-window">${first.photo ? ctx.photo(first.id, { cls: 'hg-photo', pos: '50% 45%' }) : briefCard(first, shots.indexOf(first), shots.length, true)}</figure>`;
  const r = [['Light', D.light], ['Crop', D.crop], ['Colour', D.colour], ['People', D.people]].filter(([, v]) => v).map(([k, v]) => [k, A(v)]);
  return page(ctx, R, 'photo-direction', [bd(hero, 'hg-pn--photo'), bd(`${lead(A(D.subject))}${rows(r)}`)]);
}
function shotList(ctx, R) {
  const shots = ctx.brand.imagery.shots;
  const cells = shots.map((s, i) => ({ cls: 'hg-shot', html: !s.photo ? `<figure>${briefCard(s, i, shots.length)}</figure>` : `<figure>${ctx.photo(s.id, { cls: 'hg-photo', slotNote: false })}<figcaption class="hs-q">${s.photo ? `${A(s.caption || s.alt || '')}` : A(s.slot || s.alt || '')}</figcaption></figure>` }));
  const intro = shots.some((s) => s.photo) ? 'The photographs in the kit, each with its caption.' : 'No photographs yet. Each frame is the brief for one shot: who, where, the crop and the light.';
  return page(ctx, R, 'shot-list', [bd(`${para(intro)}${strip(cells, 'hg-sstrip')}`)]);
}
function imageryRules(ctx, R) { return page(ctx, R, 'imagery-rules', [bd(rules(ctx.brand.imagery.rules))]); }

// ---- 07 Layout ----
function grid(ctx, R) {
  const G = ctx.gridMeasures, B = ctx.brand;
  const m = (G.margin / G.page.w) * 100, inner = G.page.w - 2 * G.margin, gap = (G.gutter / inner) * 100;
  const col = String(Math.round(G.col * 10) / 10);
  const drawing = `<div class="hg-grid"><div class="hg-grid__page" role="img" aria-label="The page grid: ${G.columns} columns, ${G.margin} pixel margins and ${G.gutter} pixel gutters on a ${G.page.w} by ${G.page.h} page" style="aspect-ratio:${G.page.w}/${G.page.h};padding:${m.toFixed(3)}%"><svg class="hg-box" aria-hidden="true" focusable="false"><rect x="0.75" y="0.75" width="100%" height="100%"/></svg><div class="hg-grid__cols" style="column-gap:${gap.toFixed(3)}%;grid-template-columns:repeat(${G.columns},minmax(0,1fr))">${Array.from({ length: G.columns }, () => '<i></i>').join('')}</div></div>
<div class="hg-grid__n"><p class="hg-grid__big disp">${G.columns}</p><p class="hs-p">columns on a ${mono(`${G.page.w} × ${G.page.h}`)} page</p></div></div>`;
  const meas = `<dl class="hg-meas">${[['Margin', G.margin], ['Gutter', G.gutter], ['Column', col], ['Base', G.base]].map(([k, v], i) => `<div>${i ? svgV('fold', 'hg-mv') : ''}<dt>${k}</dt><dd><span class="disp">${lit(String(v))}</span> ${mono('px')}</dd></div>`).join('')}</dl>`;
  const space = `<ol class="hg-space">${ctx.space.map((s) => `<li><i style="width:${s.px}px;height:${s.px}px" aria-hidden="true"></i>${mono(String(s.px))}</li>`).join('')}</ol>`;
  const radii = ctx.radii.filter((r) => r.px < 9999);
  const board = `<div class="hs-two"><div>${h2('Spacing')}${para(`Every gap is a step of ${G.base} px. Space inside a group is smaller than the space between groups.`)}${space}</div>
<div>${h2('Corners and edges')}${para(`Edges are ${mono(`${B.ui.border} px`)}. ${A(B.ui.elevationNote || '')}`)}<ul class="hg-radii">${radii.map((r) => `<li><i style="border-radius:${r.px}px" aria-hidden="true"></i><span class="hs-q">${A(r.use)}, ${mono(`${r.px} px`)}</span></li>`).join('')}</ul></div></div>`;
  return page(ctx, R, 'grid', [bd(`${drawing}${meas}`), bd(board)]);
}
// the printed art on a net's front panel, in mm of the net: the brand line large above, then the logo, name and date stacked up from the foot,
// as the print drawing lays them. HTML over the drawing, sized in container units so it scales with the net (1 mm = 100cqw / (W + 2)).
function netArt(ctx, R, n, W, H, top) {
  const fi = n.panels.findIndex((p) => p[2] === 'front'); if (fi < 0) return '';
  const a = n.art || {}, x0 = n.panels.slice(0, fi).reduce((s, p) => s + p[1], 0), fm = n.panels[fi][1], hex = R[n.panels[fi][0]] ? R[n.panels[fi][0]].hex : R.front.hex, tx = R.textOn(hex), Wt = ctx.weights;
  const sides = n.panels.filter((p) => p[0] === 'side').map((p) => p[1]), gus = (sides.length ? Math.min(...sides) : 70) / 2;
  const pad = Math.max(6, Math.round(fm * 0.07)), aw = fm - 2 * pad, T = W + 2;
  const floor = top + n.height - (n.kind === 'bag' ? gus : n.kind === 'satchel' ? (n.seal || 0) : 0) - pad;
  const unit = (v) => `calc(${v.toFixed(3)} * 100cqw / ${T})`, pc = (v, d) => `${(v / d * 100).toFixed(3)}%`;
  const put = (y, _h, cls, html, style = '') => `<div class="hg-fa ${cls}" style="left:${pc(x0 + pad + 1, T)};top:${pc(y + 1, H + 2)};width:${pc(aw, T)};background:${hex};${style}">${html}</div>`;
  let o = '', cur = floor, ytop = top + pad;
  const fit1 = (text, s0, w, wt) => { let s = s0; while (s > 3 && measure(ctx, 'display', wt, text, s) > w) s -= 0.5; return s; };
  if (a.brandLine || a.head) {
    const lines = a.head || sentences(ctx.brand.lines.primary);
    // slot: the line prints as a placeholder label, so its size is fitted to a label of that length, not to the sentinel
    let hs = Math.min(fm * 0.115, 44); for (const t of lines) hs = Math.min(hs, fit1(ctx.placeholders ? 'Main line, 3 to 7 words' : t, hs, aw, Wt.heading));
    o += put(ytop, hs * lines.length, 'disp', lines.map(A).join('<br>'), `font-size:${unit(hs)};line-height:${unit(hs * 0.96)};color:${tx.ink}`);
  }
  if (a.date) { const s = fit1(a.date, a.dateMm || 14, aw, Wt.heading); cur -= s; o += put(cur, s, 'disp', A(a.date), `font-size:${unit(s)};line-height:${unit(s)};color:${tx.quiet}`); cur -= s * 0.6; }
  if (a.title) { const s = fit1(a.title, a.titleMm || 20, aw, Wt.heading); cur -= s; o += put(cur, s, 'disp', A(a.title), `font-size:${unit(s)};line-height:${unit(s)};color:${tx.ink}`); cur -= s * 0.7; }
  if (a.logoMm) {
    const lw = Math.min(a.logoMm, aw), lh = lw / ctx.logo.geo.aspect; cur -= lh;
    o += `<div class="hg-fa hg-fa__lg" style="left:${pc(x0 + pad + 1, T)};top:${pc(cur + 1, H + 2)};width:${pc(lw, T)};background:${hex};--ar:${ctx.logo.geo.width.toFixed(2)}/${ctx.logo.geo.height.toFixed(2)}">${ctx.logo.html('colour', { width: 100, colourway: R.colourwayOn(hex), color: tx.ink })}</div>`;
  }
  return o;
}
function layouts(ctx, R, P) {
  const nets = P.nets || [], hexOf = (role) => (R[role] ? R[role].hex : R.ground.hex);
  const span = (n) => n.panels.reduce((s, p) => s + p[1], 0);
  const maxW = Math.max(1, ...nets.map(span));
  const draw = (n) => {
    const W = span(n), top = n.kind === 'satchel' ? (n.flap || 0) : n.kind === 'box' ? Math.min(40, n.height * 0.25) : 0, bot = n.kind === 'box' ? top : 0, H = n.height + top + bot;
    let x = 0, o = '';
    n.panels.forEach(([role, mm, tag]) => {
      const fill = tag === 'glue' ? 'var(--hs-board)' : hexOf(role), ground = tag === 'glue' || R.isGround(hexOf(role));
      o += `<rect x="${x}" y="${top}" width="${mm}" height="${n.height}" fill="${fill}"${ground ? ' class="is-board"' : ''}/>`;
      if (tag === 'front' && n.kind === 'box') { o += `<path class="hg-cut" d="M${x} ${top}V${top * 0.35}Q${x} 0 ${x + top * 0.65} 0H${x + mm - top * 0.65}Q${x + mm} 0 ${x + mm} ${top * 0.35}V${top}"/><path class="hg-cut" d="M${x} ${top + n.height}V${H - bot * 0.35}Q${x} ${H} ${x + bot * 0.65} ${H}H${x + mm - bot * 0.65}Q${x + mm} ${H} ${x + mm} ${H - bot * 0.35}V${top + n.height}"/>`; }
      if (x > 0) o += `<line class="hg-fold" x1="${x}" y1="${top}" x2="${x}" y2="${top + n.height}"/>`;
      x += mm;
    });
    if (n.kind === 'satchel' && top) o = `<path d="M0 ${top}V${top * 0.5}Q0 0 ${top * 0.5} 0H${W - top * 0.5}Q${W} 0 ${W} ${top * 0.5}V${top}Z" fill="${hexOf('front')}"/><path class="hg-cut" d="M0 ${top}V${top * 0.5}Q0 0 ${top * 0.5} 0H${W - top * 0.5}Q${W} 0 ${W} ${top * 0.5}V${top}"/><line class="hg-fold" x1="0" y1="${top}" x2="${W}" y2="${top}"/>${o}`;
    if (n.seal && n.kind !== 'box') o += `<line class="hg-seal" x1="0" y1="${top + n.height - n.seal}" x2="${W}" y2="${top + n.height - n.seal}"/>${n.kind === 'bag' ? `<line class="hg-seal" x1="0" y1="${top + n.seal}" x2="${W}" y2="${top + n.seal}"/>` : ''}`;
    o += `<rect class="hg-cut" x="0" y="${top}" width="${W}" height="${n.height}" fill="none"/>`;
    const label = `${n.name}, ${W} by ${n.height} mm flat, ${n.panels.length} panels`;
    return `<li class="hg-flat" style="--nw:${(W / maxW * 100).toFixed(3)}%"><div class="hg-flat__fig"><svg viewBox="-1 -1 ${W + 2} ${H + 2}" role="img" aria-label="${A(label)}" focusable="false" preserveAspectRatio="xMinYMin meet">${o}</svg>${netArt(ctx, R, n, W, H, top)}</div><p class="hg-flat__n">${A(n.name)}</p><p class="hs-q">${mono(`${W} × ${n.height} mm`)} flat, ${n.panels.length} panels</p></li>`;
  };
  const board = `${lead(A(P.layouts.intro))}<ul class="hg-flats">${nets.map(draw).join('')}</ul>
${h2('On every pack')}<ul class="hg-never">${P.layouts.rules.map((r) => `<li>${A(r)}</li>`).join('')}</ul>${P.layouts.boxNote ? quiet(A(P.layouts.boxNote)) : ''}`;
  return page(ctx, R, 'layouts', [bd(board)], R.front.hex);
}

// ---- 08 Applications ----
function businessCard(ctx, R) {
  const B = ctx.brand, ap = B.applications, hex = R.flap.hex, fr = R.front.hex, frT = R.textOn(fr), gr = R.ground.hex, grT = R.textOn(gr);
  const front = `<div class="hg-card" style="background:${fr};color:${frT.ink}" role="img" aria-label="Business card, front: the logo and the line ${A(B.lines.primary)}"><span class="hg-card__lg">${logoOn(ctx, R, 'colour', fr, 180, '')}</span><p class="hg-card__l">${A(B.lines.primary)}</p></div>`;
  const back = `<div class="hg-card hg-card--back" style="background:${gr};color:${grT.ink}"><p class="hg-card__nm">${A(ap.card.person)}</p><p>${A(ap.card.role)}</p><p class="hg-card__ct">${A(ap.card.contact)}<br>${A(ap.site.url)}</p></div>`;
  const face = `<div class="hg-cards">${front}${back}</div>`;
  const board = rows([['Size', `${mono('90 × 55 mm')}, printed both sides.`], ['Front', `The logo and the line, on ${A(R.front.name)}.`], ['Back', `Name, role, contact and the site, on ${A(R.ground.name)}.`]]);
  return page(ctx, R, 'business-card', [pr(hex, face), bd(board)], hex);
}
function social(ctx, R) {
  const ap = ctx.brand.applications, gr = R.ground.hex, hex = R.back.hex, grounds = [R.front.hex, R.back.hex, R.side.hex];
  const posts = `<ul class="hg-posts">${ap.social.slice(0, 3).map((t, i) => {
    const bg = grounds[i % 3], ink = R.textOn(bg).ink;
    return `<li class="hg-post" style="background:${bg};color:${ink}"><p class="disp" style="font-size:${wordCap(ctx, t, 26, 'display', ctx.weights.heading, 180)}">${A(t)}</p><span class="hg-post__lg">${logoOn(ctx, R, 'colour', bg, 96, '')}</span></li>`;
  }).join('')}</ul>`;
  void gr;
  return page(ctx, R, 'social', [bd(`${posts}`), bd(`${para('The brand&rsquo;s lines, one to a post, square. One colour fills the post; the logo sits at its foot.')}`)], hex);
}
function signage(ctx, R, P) {
  const B = ctx.brand, own = SCENES[P.kind];
  // a satchel's line names the poster that is drawn: the shelter poster and its own headline
  const sig = own ? B.applications.signage : `Bus shelter poster${P.signage.secondVal ? `, ${P.signage.secondVal}` : ''}: ${P.product.poster || P.product.name}`;
  return page(ctx, R, 'signage', [bd(photographed(ctx, R, P), 'hg-pn--photo'), bd(`${h2(A(P.signage.title))}${sig ? para(A(sig)) : ''}`)], R.front.hex);
}
function emailSignature(ctx, R) {
  const B = ctx.brand, ap = B.applications;
  const email = `<div class="hg-email"><p class="hg-email__n">${A(ap.email.person)}</p><p>${A(ap.email.role)}, ${A(B.name)}</p><p class="hs-q">${A(ap.card.contact)}<br>${A(ap.site.url)}</p><div class="hg-email__l">${logoBoard(ctx, R, 'horizontal', 168)}</div></div>`;
  return page(ctx, R, 'email-signature', [bd(`${email}${quiet('Name, role, contact and the horizontal logo. Plain text, so it reads in every mail app.')}`)]);
}
function digital(ctx, R) {
  const B = ctx.brand, S = B.ui.screen.content, list = (S.deliveries || []).slice(0, 3), hex = R.side.hex;
  const screen = `<div class="hg-device"><div class="ui hg-screen" role="img" aria-label="${A(B.name)} product screen: ${A(S.eta)}. ${A(S.rider)}, ${A(S.riderNote)}." inert>
<div class="hg-scr__top"><span class="ui-num">${A(S.time)}</span>${ctx.ui.statusChip(list[0] ? list[0].status : 'on-the-way')}</div>
<p class="ui-display hg-scr__eta">${A(S.eta)}</p><p class="hg-scr__note">${A(S.pickup)}</p>
<div class="ui-progress"><div class="ui-progress__bar"><i style="width:${(S.progress || 0) * 100}%"></i></div><span class="ui-progress__dot" style="left:${(S.progress || 0) * 100}%"></span></div>
<div class="hg-scr__ft"><span>${A(S.from)}</span><span>${A(S.to)}</span></div>
<ul class="ui-list">${list.map((d) => ctx.ui.row({ title: d.to, sub: d.when, end: d.price, chip: ctx.ui.statusChip(d.status) })).join('')}</ul></div></div>`;
  const board = `${h2(A(B.ui.screen.title || 'The product'))}${para('The product uses the same palette and type as print. The components and their tokens are in the UI kit.')}<p class="hs-p"><a class="hg-link" href="../ui-kit-html/index.html">Open the UI kit</a></p>`;
  return page(ctx, R, 'digital', [pr(hex, screen, 'hg-pn--screen'), bd(board)], hex);
}

// ---- 09 Close ----
function summary(ctx, R) {
  const B = ctx.brand, hex = R.front.hex, G = (B.guideB && B.guideB.rules) || [];
  const list = G.length ? G.map((r) => [r.title, r.text]) : B.personality.map((p) => [p.trait, p.means]);
  const face = `<ol class="hg-sum">${list.map(([t, x], i) => `<li>${i ? svgH('fold', 'hg-tfold') : ''}<p class="hg-sum__n" aria-hidden="true">${i + 1}</p><div><p class="hg-sum__t disp" style="font-size:${wordCap(ctx, t, 36, 'display', ctx.weights.heading)}">${A(t)}</p><p class="hs-p">${A(x)}</p></div></li>`).join('')}</ol>`;
  return page(ctx, R, 'summary', [pr(hex, face), bd(para(`If a page keeps these ${list.length}, it reads as ${A(B.name)}.`))], hex);
}
function contactScope(ctx, R) {
  const B = ctx.brand, c = B.contact || {}, hex = R.back.hex, n = ctx.pages ? ctx.pages.length : 33;
  const owner = c.owner || B.name;
  const face = `<div class="hg-ask"><p class="hg-ask__k">Who to ask</p><p class="hg-ask__o disp hs-fit" style="${fit(ctx, owner, { max: 72, min: 36, lines: 2 }, { max: 44, min: 24, lines: 3 })}">${A(owner)}</p>
${para(`${A(owner)} owns this document. Write to them for a logo file, a missing asset or an exception.`)}${c.email ? `<p class="hs-p hg-ask__e"><a href="mailto:${A(c.email)}">${A(c.email)}</a></p>` : ''}
${h2('Version history')}<p class="hs-p">${lit(ctx.versionLine)}</p></div>`;
  const not = [['Logo files, palettes and fonts.', 'They are in the brand kit.'], ['Interface components and tokens.', 'They are in the UI kit.'], ['Print specifications, CMYK and Pantone values.', 'Ask your printer for a proof.']];
  const board = `<div class="hs-two"><div>${h2('In this document')}${para(`${n} pages in ${SECS.length} sections: ${A(SECS.map((s) => s[0]).join(', '))}.`)}</div>
<div>${h2('Not in this document')}<ul class="hg-not">${not.map(([a, b]) => `<li><p class="hs-p">${A(a)}</p><p class="hs-q">${A(b)}</p></li>`).join('')}</ul></div></div>`;
  return page(ctx, R, 'contact-scope', [pr(hex, face), bd(board)], hex);
}

const PAGES = {
  intro, personality, voice, 'write-this': writeThis, messaging,
  logo, 'logo-versions': logoVersions, 'clear-space': clearSpace, 'min-size': minSize, 'logo-grounds': logoGrounds, 'logo-misuse': logoMisuse,
  palette, proportion, contrast, 'colour-values': colourValues,
  typefaces, hierarchy, 'type-in-use': typeInUse, 'type-rules': typeRules,
  'photo-direction': photoDirection, 'shot-list': shotList, 'imagery-rules': imageryRules,
  grid, layouts,
  'business-card': businessCard, social, signage, 'email-signature': emailSignature, digital,
  summary, 'contact-scope': contactScope,
};

// ---- the front: the pack's face as the cover (the line is the h1), then the running order as a net of sections ----
function front(ctx, S) {
  const B = ctx.brand, R = roles(ctx), P = pack(ctx), hex = R.front.hex, line = B.lines.primary;
  const cover = `<div class="hg-cover hg-cover--front">${P.place || B.city ? `<p class="hg-place">${A(P.place || B.city)}</p>` : ''}
<div class="hg-cover__lg">${logoOn(ctx, R, 'colour', hex, 400)}</div>
<h1 class="hg-hero disp hs-fit" style="${fit(ctx, line, { max: 120, min: 44, lines: 2 }, { max: 60, min: 28, lines: 4 })}">${A(line)}</h1>
<p class="hg-cover__v"><span>Brand guidelines</span>${lit(ctx.versionLine)}</p></div>`;
  const roleHex = [R.front.hex, R.back.hex, R.side.hex, R.flap.hex];
  const secs = (S.sections || []).map((s, i) => {
    const sw = roleHex[i % 4];
    return `<li class="hg-toc__s">${i ? svgH('fold', 'hg-tfold') : ''}<p class="hg-toc__n"><span class="hg-toc__sw" style="background:${sw}" aria-hidden="true"></span>${String(s.n).padStart(2, '0')}</p><h2 class="hg-toc__t disp">${A(s.title)}</h2><ol class="hg-toc__p">${s.units.map((u) => `<li><a href="${A(u.file)}"><span class="hg-toc__r">${A(u.ref || '')}</span><span>${A(u.title)}</span></a></li>`).join('')}</ol></li>`;
  }).join('');
  const board = `${lead(A(B.description))}<ol class="hg-toc">${secs}</ol>`;
  return net(ctx, R, P, [pr(hex, cover, 'hg-pn--face'), bd(board)], { flap: { n: '00', t: 'Brand guidelines' }, hex, cls: 'hg-net hg-net--front' });
}

const chev = `<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false"><path d="M3.5 6l4.5 4.5L12.5 6" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>`;

export const guideSite = {
  css(ctx) { return `${netCss(ctx, roles(ctx))}\n${pageCss(ctx, roles(ctx))}`; },
  shell(ctx, S) {
    const R = roles(ctx), B = ctx.brand, m = /data-hex="(#[0-9a-fA-F]{3,8})"/.exec(S.body || ''), hex = m ? m[1] : '';
    const cur = S.unit ? S.unit.id : '';
    const secs = (S.sections || []).map((s) => ({ n: String(s.n).padStart(2, '0'), title: s.title, pages: s.units }));
    const nav = contentsNav(secs, { cur, front: !!S.isFront, href: (u) => u.file, frontTitle: 'Cover and contents' });
    const here = S.unit ? (S.sections || []).find((s) => s.units.some((u) => u.id === cur)) : null;
    const ctl = `<button type="button" class="hs-ctl" data-gs-toggle aria-controls="hs-nav" aria-expanded="false"><span>${here ? `${A(here.title)}: ${A(S.unit.title)}` : 'Contents'}</span>${chev}</button>`;
    const head = S.isFront || !S.unit ? '' : `<header class="hs-head"><p class="hs-kick">${here ? `${String(here.n).padStart(2, '0')} ${A(here.title)}` : ''}</p><h1 class="hs-h1">${S.unit.ref ? `<span class="hs-ref">${A(S.unit.ref)}</span>` : ''}${A(S.unit.title)}</h1></header>`;
    const link = (u) => (u ? { href: u.file, ref: u.ref, title: u.title } : null);
    return `<div class="hs hg" data-gs-root>
${bar(ctx, R, { part: 'guidelines', hex, toggle: '' })}
<div class="hs-cols"><div class="hs-side">${ctl}${nav}</div>
<main class="hs-main" id="hs-main" tabindex="-1">${head}${S.body}${pager(link(S.prev), link(S.next))}</main></div>
<footer class="hs-foot"><span>${A(B.name)} brand guidelines</span>${lit(ctx.versionLine)}</footer></div>`;
  },
  front(ctx, S) { return front(ctx, S); },
  page(ctx, id) {
    const f = PAGES[id];
    if (!f) throw new Error(`guideSite: no page for ${id}`);
    return f(ctx, roles(ctx), pack(ctx));
  },
  adapt: { strip: [], noLink: '.m' },
  darkSample: ['cover', 'palette', 'logo-grounds'],
};
