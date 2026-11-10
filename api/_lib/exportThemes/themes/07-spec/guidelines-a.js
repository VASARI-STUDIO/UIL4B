// Guidelines pages for theme 07, run A: intro, personality, voice, write-this, messaging, logo, clear-space, min-size,
// logo-grounds, logo-misuse, palette, proportion, colour-values. Laid out as a standards document: numbered clauses,
// ledger tables, numbered figures ("Figure 3.3"), definitions and a contrast conformance matrix. Styles are in css-a.js (classes start a-).
import { A, mono, std, title } from './helpers.js';

const sentences = (s) => s.split(/(?<=\.)\s+/);
const words = (s) => s.trim().split(/\s+/).length;
const NUM = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven'];
const nWord = (n) => NUM[n] || String(n);
const isGround = (ctx, hex) => hex.toLowerCase() === ctx.roles.light.surface.toLowerCase();
// the brand colour for a hex, else the hex itself
const hexName = (ctx, hex) => ctx.colours.find((c) => c.hex.toLowerCase() === hex.toLowerCase())?.name || hex;
const refOf = (ctx, id) => ctx.pages.find((p) => p.id === id).ref;
const hair = (ctx, hex) => (isGround(ctx, hex) ? ' hairline' : '');
const level = (r) => (r >= 7 ? 'AAA' : r >= 4.5 ? 'AA' : r >= 3 ? 'AA large' : 'Below 3 : 1');
// a numbered figure: the picture, then "Figure 3.3" and its caption
const fig = (no, cap, inner, cls = '') => `<figure class="a-fig ${cls}">${inner}<figcaption class="a-fc"><b class="num">Figure ${no}</b> ${cap}</figcaption></figure>`;
// a clause: its number hangs in the left column
const clause = (no, inner) => `<div class="a-cl"><span class="a-cn num">${no}</span><div>${inner}</div></div>`;
// a table head from [label, width px or ''] pairs
// mechanicals: 1 CSS px is 0.2646 mm (96 px to 25.4 mm), so a drawing can give both
const MM = 25.4 / 96, n1 = (n) => String(Number(n.toFixed(1))), f1 = (n) => n.toFixed(1);
const both = (pxv) => `${n1(pxv * MM)} mm, ${n1(pxv)} px`;
// a dimension line in ink with oblique end ticks: horizontal from a1 to a2 at y = at, or vertical at x = at when v is set
const seg = (x1, y1, x2, y2) => `<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}"/>`;
const dim = (a1, a2, at, v = false) => {
  const tick = (q) => (v ? seg(at - 4, q + 4, at + 4, q - 4) : seg(q - 4, at + 4, q + 4, at - 4));
  return `<g class="a-dm">${v ? seg(at, a1, at, a2) : seg(a1, at, a2, at)}</g><g class="a-tk">${tick(a1)}${tick(a2)}</g>`;
};
const ext = (x1, y1, x2, y2) => `<g class="a-el">${seg(x1, y1, x2, y2)}</g>`;
// four x-squares, one in the middle of each side of a zone (ox, oy, zw, zh)
const xsq = (ox, oy, zw, zh, X) => [[ox + zw / 2 - X / 2, oy], [ox + zw / 2 - X / 2, oy + zh - X], [ox, oy + zh / 2 - X / 2], [ox + zw - X, oy + zh / 2 - X / 2]];
const sq = (pts, X) => pts.map(([x, y]) => `<rect class="a-xs" x="${f1(x)}" y="${f1(y)}" width="${f1(X)}" height="${f1(X)}"/>`).join('');
// labels on a drawing are HTML, centred on (x, y): text inside SVG would be caught by the site's clause linker
const lab = (x, y, t, cls = '') => `<span class="a-dl${cls}" style="left:${f1(x)}px;top:${f1(y)}px">${t}</span>`;
// a roof-plan crop for the photo slot (no photography is licensed): a 400 x 300 plan field, the roof with its ridge,
// 15 panels on the north plane, the meter box on the east wall and a north arrow. Heavy outline, medium ridge and
// panel edges, light panel cells. Lines in the mono-light ink on its own ground; geometry only, no text.
const roofCrop = (ml) => {
  const x0 = 150, y0 = 60, w = 220, h = 170, ry = y0 + h / 2, pw = 34, ph = 20, gx = 4, gy = 4, cols = 5, rws = 3;
  const px0 = x0 + (w - (cols * pw + (cols - 1) * gx)) / 2, py0 = y0 + 8;
  const panels = Array.from({ length: cols * rws }, (_, i) => {
    const x = px0 + (i % cols) * (pw + gx), y = py0 + Math.floor(i / cols) * (ph + gy);
    const cells = [1, 2, 3].map((k) => seg(x + (pw * k) / 4, y, x + (pw * k) / 4, y + ph)).join('') + seg(x, y + ph / 2, x + pw, y + ph / 2);
    return `<rect class="a-rp-m" x="${f1(x)}" y="${f1(y)}" width="${pw}" height="${ph}"/><g class="a-rp-l">${cells}</g>`;
  }).join('');
  // the crop shows the north plane, the ridge and the top of the south plane; the logo takes the empty top left
  const arrow = `<g class="a-rp-m">${seg(36, 182, 36, 150)}${seg(31, 134, 31, 122)}${seg(31, 122, 41, 134)}${seg(41, 134, 41, 122)}</g><path class="a-rp-f" d="M36 140 L31 154 L36 151 L41 154 Z"/>`;
  return `<svg class="a-rp" viewBox="0 50 400 138" preserveAspectRatio="xMidYMid slice" aria-hidden="true" style="--rp:${ml.name}">
<rect class="a-rp-l" x="12" y="56" width="376" height="200"/>
<rect class="a-rp-h" x="${x0}" y="${y0}" width="${w}" height="${h}"/><g class="a-rp-m">${seg(x0, ry, x0 + w, ry)}</g>${panels}
<rect class="a-rp-m" x="${x0 + w}" y="${ry + 6}" width="9" height="16"/>${arrow}</svg>`;
};
const thead = (cols) => `<thead><tr>${cols.map(([l, w]) => `<th${w ? ` style="width:${w}px"` : ''}>${l}</th>`).join('')}</tr></thead>`;

export const guidelinesA = {
  intro(ctx) {
    const B = ctx.brand, [first, ...rest] = sentences(B.description), r = refOf(ctx, 'intro');
    const defs = [['What it does', B.product], ['Who it serves', B.audience]].map(([k, v], i) => `<tr><td class="a-no num">${r}.${i + (rest.length ? 3 : 2)}</td><th scope="row" class="a-term">${k}</th><td class="a-def">${A(v)}</td></tr>`).join('');
    const body = `${title(ctx, 'intro', `The scope of this document, and the two terms it rests on.`)}
<div class="a-clauses">${clause(`${r}.1`, `<p class="disp a-lead">${A(first)}</p>`)}${rest.length ? clause(`${r}.2`, `<p class="a-body">${A(rest.join(' '))}</p>`) : ''}</div>
<h2 class="a-h2">Terms and definitions</h2>
<table class="st a-t a-bl">${thead([['', 56], ['Term', 168], ['Definition', '']])}<tbody>${defs}</tbody></table>`;
    return std(ctx, 'intro', body, { note: 'In this document, shall is a requirement, should is a recommendation and may is a permission.' });
  },

  personality(ctx) {
    const B = ctx.brand, r = refOf(ctx, 'personality'), n = B.personality.length;
    const rows = B.personality.map((t, i) => `<tr><td class="a-no num">${r}.${i + 1}</td><th scope="row" class="a-term a-term--big"><span class="disp">${A(t.trait)}</span></th><td class="a-def">${A(t.means)}</td></tr>`).join('');
    const lines = B.lines.others.map((l, i) => `<tr><td class="a-no num">${r}.${n + i + 1}</td><td class="a-def a-def--line disp disp--sub">${A(l)}</td></tr>`).join('');
    const body = `${title(ctx, 'personality', `${A(ctx.cap(nWord(n)))} traits shape how ${A(B.name)} sounds and behaves. Each one shows up in the work, not only in the words.`)}
<table class="st a-t a-bl">${thead([['', 56], ['Trait', 200], ['What it means', '']])}<tbody>${rows}</tbody></table>
<h2 class="a-h2">${B.lines.others.length > 1 ? 'The other lines' : 'The other line'}</h2>
<table class="st a-t a-bl">${thead([['', 56], ['Line', '']])}<tbody>${lines}</tbody></table>`;
    return std(ctx, 'personality', body);
  },

  voice(ctx) {
    const B = ctx.brand, r = refOf(ctx, 'voice');
    const rows = B.voice.principles.map((p, i) => `<tr><td class="a-no num">${r}.${i + 2}</td><th scope="row" class="a-term">${A(p.title)}</th><td class="a-def a-def--line disp disp--sub">${A(p.example)}</td></tr>`).join('');
    const body = `${title(ctx, 'voice', `Short sentences, real numbers, no exclamation marks. ${A(ctx.cap(nWord(B.voice.principles.length)))} habits keep it so.`)}
${clause(`${r}.1`, `<p class="a-h3">Primary line</p><p class="disp a-lead">${A(B.lines.primary)}</p>`)}
<h2 class="a-h2">Habits</h2>
<table class="st a-t a-bl">${thead([['', 56], ['Habit', 168], ['In use', '']])}<tbody>${rows}</tbody></table>`;
    return std(ctx, 'voice', body);
  },

  'write-this'(ctx) {
    const W = ctx.brand.voice.writeThis, S = ctx.brand.type.sample, r = refOf(ctx, 'write-this');
    const rows = W.map((x, i) => `<tr><td class="a-no num">${r}.${i + 1}</td><td class="a-w">${A(x.write)}</td><td class="a-n">${A(x.not)}</td><td class="a-because">${A(x.because)}</td></tr>`).join('');
    const body = `${title(ctx, 'write-this', `${A(ctx.cap(nWord(W.length)))} lines as ${A(ctx.brand.name)} writes them, beside the lines they replace. Each row is a clause: the conforming line, the non-conforming one, and the reason.`)}
<table class="st a-t a-st">${thead([['', 52], ['Conforming', 204], ['Non-conforming', 188], ['Clause', '']])}<tbody>${rows}</tbody></table>
${fig(`${r}.1`, 'Written this way. A conforming message, set in the body face.',`<p class="a-msg"><span>${A(ctx.brand.name)}</span>${A(S.paragraph)}</p>`, 'a-fig--msg')}`;
    return std(ctx, 'write-this', body);
  },

  messaging(ctx) {
    const B = ctx.brand, V = B.voice, r = refOf(ctx, 'messaging'), all = [B.lines.primary, ...B.lines.others];
    const lines = all.map((l, i) => `<tr><td class="a-no num">${r}.${i + 1}</td><th scope="row" class="a-term">${i ? 'Other line' : 'Primary line'}</th><td class="a-def a-def--line disp disp--sub">${A(l)}</td><td class="a-wc"></td></tr>`).join('');
    const k = all.length;
    const bp = (n, label, text) => `<tr><td class="a-no num">${r}.${k + n}</td><th scope="row" class="a-term">${label}</th><td class="a-def">${A(text)}</td><td class="a-wc num">${words(ctx.real(text))} words</td></tr>`;
    const body = `${title(ctx, 'messaging')}
<table class="st a-t a-bl">${thead([['', 56], ['Item', 128], ['Text', ''], ['Length', 72]])}<tbody>${lines}${bp(1, 'Short boilerplate', V.boilerplate25)}${bp(2, 'Long boilerplate', V.boilerplate50)}</tbody></table>
${clause(`${r}.${k + 3}`, `<p class="a-h3">Writing the name</p><p class="a-body a-measure">${A(V.nameRules)}</p>`)}`;
    return std(ctx, 'messaging', body);
  },

  logo(ctx) {
    const L = ctx.logo, B = ctx.brand, cw = B.logo.colourways.colour, g = L.geos.colour, m = L.minSize, r = refOf(ctx, 'logo');
    const w = 520, h = Math.round((w * g.h) / g.w);
    const table = `<table class="st a-t a-idt">${thead([['', 56], ['Version', 176], ['Ground', 120], ['Minimum width', 160], ['Clear space', '']])}<tbody><tr><td class="a-no num">${r}.1</td><th scope="row" class="a-term">${A(L.labels.colour)}</th><td>${A(hexName(ctx, cw.ground))}</td><td class="num">${m.screenPx} px, ${m.printMm} mm</td><td class="num">${L.clearShare}% of its height</td></tr></tbody></table>`;
    const body = `${title(ctx, 'logo', A(B.logo.idea))}
${table}
${fig(`${r}.1`, `${A(L.labels.colour)}. ${A(B.logo.when.colour)}`, `<div class="a-stage${hair(ctx, cw.ground)}" style="background:${cw.ground};height:${h + 160}px">${L.html('colour', { width: w, color: cw.name, label: 'Your logo goes here' })}</div>`)}`;
    return std(ctx, 'logo', body);
  },

  'clear-space'(ctx) {
    const L = ctx.logo, B = ctx.brand, g = L.geos.colour, cw = B.logo.colourways.colour, share = L.clearShare, r = refOf(ctx, 'clear-space');
    const lw = 440, s = lw / g.w, lh = g.h * s, X = L.geo.cap * s, zw = lw + 2 * X, zh = lh + 2 * X;
    const ox = 72, oy = 64, TW = ox + zw + 8, TH = oy + zh + 8, yd = oy - 28, xd = ox - 28;
    const unit = ctx.edition === 'slot' ? `x is ${share}% of the logo's height.` : `x is the height of the N, ${share}% of the logo's height.`;
    // a chained dimension across the top (x, logo width, x) and down the left (x, logo height, x), extension lines from each edge
    const xs = [ox, ox + X, ox + X + lw, ox + zw], ys = [oy, oy + X, oy + X + lh, oy + zh];
    const geo = `<rect class="a-zl" x="${f1(ox)}" y="${f1(oy)}" width="${f1(zw)}" height="${f1(zh)}"/><rect class="a-ll" x="${f1(ox + X)}" y="${f1(oy + X)}" width="${f1(lw)}" height="${f1(lh)}"/>${sq(xsq(ox, oy, zw, zh, X), X)}`
      + xs.map((x, i) => ext(x, (i % 3 ? oy + X : oy) - 3, x, yd - 7)).join('') + ys.map((y, i) => ext((i % 3 ? ox + X : ox) - 3, y, xd - 7, y)).join('')
      + [0, 1, 2].map((i) => dim(xs[i], xs[i + 1], yd) + dim(ys[i], ys[i + 1], xd, true)).join('');
    const labels = [
      lab(ox + X / 2, yd - 12, 'x', ' a-dl--x'), lab(ox + X + lw / 2, yd - 12, both(lw)), lab(ox + zw - X / 2, yd - 12, 'x', ' a-dl--x'),
      lab(xd - 12, oy + X / 2, 'x', ' a-dl--x'), lab(xd - 12, oy + X + lh / 2, both(lh), ' a-dl--v'), lab(xd - 12, oy + zh - X / 2, 'x', ' a-dl--x'),
      ...xsq(ox, oy, zw, zh, X).map(([x, y]) => lab(x + X / 2, y + X / 2, 'x', ' a-dl--x')),
    ].join('');
    const draw = `<div class="a-mech" style="width:${f1(TW)}px;height:${f1(TH)}px">
<div class="a-zone" style="left:${f1(ox)}px;top:${f1(oy)}px;width:${f1(zw)}px;height:${f1(zh)}px"><div class="a-zin" style="left:${f1(X)}px;top:${f1(X)}px;width:${f1(lw)}px;height:${f1(lh)}px;background:${cw.ground}">${L.html('colour', { width: lw, color: cw.name, label: 'Your logo goes here' })}</div></div>
<svg class="a-msvg" viewBox="0 0 ${f1(TW)} ${f1(TH)}" width="${f1(TW)}" height="${f1(TH)}" aria-hidden="true">${geo}</svg>${labels}</div>`;
    const sched = [['x, the clear space', X], ['Logo width', lw], ['Logo height', lh], ['Zone width', zw], ['Zone height', zh]];
    const table = `<table class="st a-t a-sch">${thead([['Dimension on this drawing', ''], ['mm', 96], ['px', 96]])}<tbody>${sched.map(([k, v]) => `<tr><th scope="row" class="a-term">${k}</th><td class="num">${n1(v * MM)}</td><td class="num">${n1(v)}</td></tr>`).join('')}</tbody></table>`;
    const body = `${title(ctx, 'clear-space', 'A clear zone around the logo keeps it legible.')}
<div class="a-clauses">${clause(`${r}.1`, `<p class="a-body">A clear zone of x shall surround the logo on every side. ${A(unit)}</p>`)}${clause(`${r}.2`, `<p class="a-body">Nothing shall enter the zone: no type, no edges, no other logos.</p>`)}${clause(`${r}.3`, `<p class="a-body">Take sizes from the schedule, not by measuring a print. At any other size x keeps its share, ${share}% of the logo's height.</p>`)}</div>
${fig(`${r}.1`, 'Clear space, measured from the edge of the logo on all four sides. Dimensions are in millimetres and pixels at the size of this drawing.', `<div class="a-zonewrap">${draw}</div><div class="a-tb">${table}<p class="a-dns">Do not scale this drawing</p></div>`, 'a-fig--mid')}`;
    return std(ctx, 'clear-space', body);
  },

  'min-size'(ctx) {
    const L = ctx.logo, m = L.minSize, cw = ctx.brand.logo.colourways.colour, g = L.geos.colour, r = refOf(ctx, 'min-size');
    const mmPx = (mm) => mm / MM; // CSS px for a length in mm
    const rows = [['Screen', `${m.screenPx} px`, `${m.screenPx} px`, `${m.screenH} px`, 'The smallest it appears on a page or a screen.'], ['Print', `${m.printMm} mm`, `${m.printMm} mm`, `${m.printH} mm`, 'The smallest it prints, on any paper.']];
    const trs = rows.map(([k, , wt, ht, note], i) => `<tr><td class="a-no num">${r}.${i + 1}</td><th scope="row" class="a-term">${k}</th><td class="num">${wt}</td><td class="num">${ht}</td><td class="a-def">${note}</td></tr>`).join('');
    // one panel: the logo at actual size inside its clear zone (x-squares on each side), a width line below and a height line to the right
    const panel = (n, label, w, hv, wText) => {
      const s = w / g.w, h = g.h * s, X = L.geo.cap * s, BW = 320, BH = 320, ox = (BW - w) / 2 - 24, oy = (BH - h) / 2 - 16;
      const yd = oy + h + X + 20, xd = ox + w + X + 20, z = [ox - X, oy - X, w + 2 * X, h + 2 * X];
      const geo = `<rect class="a-zl" x="${f1(z[0])}" y="${f1(z[1])}" width="${f1(z[2])}" height="${f1(z[3])}"/>${sq(xsq(...z, X), X)}`
        + ext(ox, oy + h + 3, ox, yd + 7) + ext(ox + w, oy + h + 3, ox + w, yd + 7) + ext(ox + w + 3, oy, xd + 7, oy) + ext(ox + w + 3, oy + h, xd + 7, oy + h)
        + dim(ox, ox + w, yd) + dim(oy, oy + h, xd, true);
      const inner = `<div class="a-msbox" style="height:${BH}px"><div class="a-mech" style="width:${BW}px;height:${BH}px"><div class="a-mslogo" style="left:${f1(ox)}px;top:${f1(oy)}px">${L.html('colour', { width: w, color: cw.name, label: 'Logo' })}</div><svg class="a-msvg" viewBox="0 0 ${BW} ${BH}" width="${BW}" height="${BH}" aria-hidden="true">${geo}</svg>${lab(ox + w / 2, yd + 12, both(w))}${lab(xd + 12, oy + h / 2, both(hv), ' a-dl--v')}</div></div>`;
      return fig(`${r}.${n}`, `${label}, ${wText} wide, drawn at actual size inside its clear zone.`, inner, 'a-ms');
    };
    const body = `${title(ctx, 'min-size', 'The logo never goes smaller than these widths. Both are drawn at actual size: on screen at 1 px to the pixel, in print at true millimetres.')}
<table class="st a-t">${thead([['', 52], ['Medium', 96], ['Width', 80], ['Height', 80], ['Where', '']])}<tbody>${trs}</tbody></table>
<div class="a-ms2">${panel(1, 'Screen', m.screenPx, m.screenH, `${m.screenPx} px`)}${panel(2, 'Print', mmPx(m.printMm), mmPx(m.printH), `${m.printMm} mm`)}</div>
<p class="a-dns a-dns--ms">Do not scale this drawing</p>`;
    return std(ctx, 'min-size', body, { note: `Below these widths use the symbol (§${refOf(ctx, 'logo-versions')}) and let the name sit nearby in type.` });
  },

  'logo-grounds'(ctx) {
    const L = ctx.logo, cw = ctx.brand.logo.colourways, r = refOf(ctx, 'logo-grounds');
    // one row per distinct ground, using the first colourway that sits on it (mono ones repeat a ground)
    const seen = new Set(), keys = Object.keys(cw).filter((k) => !k.startsWith('mono') && !seen.has(cw[k].ground.toLowerCase()) && seen.add(cw[k].ground.toLowerCase()));
    const ml = cw['mono-light'];
    const row = (k, i) => {
      const c = cw[k], same = c.name.toLowerCase() === c.sun.toLowerCase();
      return `<tr><td class="a-no num">${r}.${i + 2}</td><td><div class="a-gt${hair(ctx, c.ground)}" style="background:${c.ground}">${L.html('colour', { width: 112, colourway: k, color: c.name, label: 'Logo' })}</div></td><th scope="row" class="a-term">${A(hexName(ctx, c.ground))}</th><td class="a-def">${A(hexName(ctx, c.name))} name${same ? '' : `, ${A(hexName(ctx, c.sun))} sun`}</td></tr>`;
    };
    const names = keys.map((k) => hexName(ctx, cw[k].ground));
    const list = `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
    const photo = fig(`${r}.1`, 'On a picture. Mono light, on a quiet part of it, clear of faces and edges. Illustration: a roof-plan crop stands in for a photograph.', `<div class="a-gt a-gt--photo" style="background:${ml.ground}">${roofCrop(ml)}<span class="a-onphoto">${L.html('mono-light', { width: 200, colourway: 'mono-light', color: ml.name, label: 'Logo' })}</span></div>`, 'a-gphoto');
    const body = `${title(ctx, 'logo-grounds', `The logo sits on ${A(list)}, each in its own colourway. On a photo it goes in mono light, on a quiet part of the picture, clear of faces and edges.`)}
<table class="st a-t a-gtab">${thead([['', 52], ['Render', 176], ['Ground', 104], ['Colourway', '']])}<tbody>${keys.map(row).join('')}</tbody></table>
${photo}`;
    return std(ctx, 'logo-grounds', body);
  },

  'logo-misuse'(ctx) {
    const L = ctx.logo, B = ctx.brand, r = refOf(ctx, 'logo-misuse'), w = 112;
    const off = ctx.C.toOklch(ctx.colours.find((c) => c.role === 'action').hex), wrong = ctx.C.fromOklch(Math.min(off.L, 0.42), off.C, (off.H + 180) % 360);
    // a busy ground drawn from the palette: small blocks in every brand colour, in a fixed order so it never changes between builds
    const cs = ctx.colours.map((c) => c.hex), bw = 14, cols = 16, rows = 10;
    const busy = `<svg class="a-busy" viewBox="0 0 ${cols * bw} ${rows * bw}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${Array.from({ length: cols * rows }, (_, i) => `<rect x="${(i % cols) * bw}" y="${Math.floor(i / cols) * bw}" width="${bw}" height="${bw}" fill="${cs[(i * 7 + Math.floor(i / cols) * 3 + ((i * i) % 5)) % cs.length]}"/>`).join('')}</svg>`;
    const items = [
      ['Stretched', 'Never squash or stretch it. Scale it evenly.', `<div style="transform:scale(1.35,0.7)">${L.forMisuse(w)}</div>`],
      ['Recoloured', 'Never recolour it. Use a colourway from the versions page.', L.forMisuse(w, { fill: wrong })],
      ['Rotated', 'Never tilt or turn it. It sits level with the page.', `<div style="transform:rotate(-14deg)">${L.forMisuse(w)}</div>`],
      ['Effects', 'No shadows, glows or bevels.', `<div style="filter:drop-shadow(5px 6px 4px rgba(${ctx.C.hexToRgb(B.logo.colourways.colour.name).join(',')},0.55))">${L.forMisuse(w)}</div>`],
      ['Busy ground', 'Never on a busy image or pattern. Use a flat colourway.', null],
      ['Outlined or boxed', 'No outlines, no boxes, no frames around it.', `<div class="a-boxed">${L.forMisuse(w - 36)}</div>`],
    ];
    const X = `<svg class="a-cross" viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Not allowed" role="img"><path d="M0 0L100 100M100 0L0 100" fill="none" stroke="var(--mark)" stroke-width="1.5" vector-effect="non-scaling-stroke"/></svg>`;
    const tr = ([t, cap, html], i) => `<tr><td class="a-no num">${r}.${i + 1}</td><td><div class="a-mt${html === null ? ' a-mt--busy' : ''}">${html === null ? `${busy}<span class="a-onbusy">${L.forMisuse(w)}</span>` : html}${X}</div></td><th scope="row" class="a-term">${t}</th><td class="a-def">${cap}</td></tr>`;
    const body = `${title(ctx, 'logo-misuse', 'Six ways the logo goes wrong. Use the supplied files as they are, and none of these.')}
<table class="st a-t a-mtab">${thead([['', 52], ['Figure', 224], ['Shall not', 128], ['Rule', '']])}<tbody>${items.map(tr).join('')}</tbody></table>`;
    return std(ctx, 'logo-misuse', body);
  },

  palette(ctx) {
    const cs = ctx.colours, V = ctx.brand.voice.principles, sample = ctx.brand.type.sample, r = refOf(ctx, 'palette');
    const action = cs.find((c) => c.role === 'action') || cs[0];
    const texts = [sample.headline, V[0].example, V[1].example, ctx.brand.lines.others[0] || V[2].example, V[3].example];
    const t = ctx.roles.light.text, g = ctx.roles.light.surface;
    const inkOn = (hex) => (ctx.ratio(t, hex) >= ctx.ratio(g, hex) ? t : g);
    const chip = (hex) => `<i class="a-ch${hair(ctx, hex)}" style="background:${hex}"></i>`;
    const defs = cs.map((c, i) => `<tr><td class="a-no num">${r}.${i + 1}</td><td class="a-def"><p><b>${chip(c.hex)}${A(c.name)}.</b> The ${A(c.roleText ?? c.role)} colour. ${A(c.lands)}</p><p class="a-val">Value: ${mono(c.hex)}</p></td><td><div class="a-ex${hair(ctx, c.hex)}" style="background:${c.hex};color:${inkOn(c.hex)}"><span class="disp disp--sub">${A(texts[i % texts.length])}</span></div></td></tr>`).join('');
    // the conformance matrix: every brand colour as text (rows) on every brand colour as ground (columns); the pairs the brand uses are outlined
    const used = new Set(ctx.pairs.map((p) => `${p.fgHex}|${p.bgHex}`.toLowerCase()));
    const mc = (f, b) => {
      if (f.hex === b.hex) return `<td class="a-mx a-mx--same">Same</td>`;
      const n = ctx.ratio(f.hex, b.hex), lv = level(n), u = used.has(`${f.hex}|${b.hex}`.toLowerCase());
      return `<td class="a-mx${u ? ' is-used' : ''}${n < 3 ? ' is-low' : ''}"><div class="a-mxi"><span class="a-pair${hair(ctx, b.hex)}" style="background:${b.hex};color:${f.hex}" aria-hidden="true"><i></i><i></i></span><span><span class="a-r num">${ctx.fmt(n)} : 1</span><span class="a-lv">${lv}</span></span></div></td>`;
    };
    const m = `<table class="st a-mxt"><thead><tr><th scope="col" class="a-mxc">Text on ground</th>${cs.map((b) => `<th scope="col">${chip(b.hex)}${A(b.name)}</th>`).join('')}</tr></thead><tbody>${cs.map((f) => `<tr><th scope="row">${chip(f.hex)}${A(f.name)}</th>${cs.map((b) => mc(f, b)).join('')}</tr>`).join('')}</tbody></table>`;
    const body = `${title(ctx, 'palette', `${A(ctx.cap(nWord(cs.length)))} colours, each named for where it lands. ${A(action.name)} is the one people see ${A(ctx.brand.name)} by.`)}
<table class="st a-t a-dt">${thead([['', 52], ['Definition', ''], ['In use', 216]])}<tbody>${defs}</tbody></table>
<h2 class="a-h2"><span class="num">${r}.${cs.length + 1}</span> Conformance matrix</h2>
${m}
<p class="a-key"><span class="a-keybox"></span>Outlined cells are the pairs ${A(ctx.brand.name)} uses. Text shall have 4.5 : 1 (AA). Type at 24 px and over may have 3 : 1 (AA large). Below 3 : 1 a pair is not used.</p>`;
    return std(ctx, 'palette', body);
  },

  proportion(ctx) {
    const cs = [...ctx.colours].sort((a, b) => b.share - a.share), total = cs.reduce((s, c) => s + c.share, 0), r = refOf(ctx, 'proportion');
    // a hundred cells, one per cent of the page, shared out by largest remainder so the count is always exactly 100
    const raw = cs.map((c) => (c.share / total) * 100), cells = raw.map(Math.floor);
    raw.map((v, i) => [v - Math.floor(v), i]).sort((a, b) => b[0] - a[0]).slice(0, 100 - cells.reduce((a, b) => a + b, 0)).forEach(([, i]) => cells[i]++);
    const grid = cs.flatMap((c, i) => Array.from({ length: cells[i] }, () => `<i class="${isGround(ctx, c.hex) ? 'hairline' : ''}" style="background:${c.hex}"></i>`)).join('');
    const rows = cs.map((c, i) => `<tr><td class="a-no num">${r}.${i + 2}</td><th scope="row" class="a-term"><i class="a-ch${hair(ctx, c.hex)}" style="background:${c.hex}"></i>${A(c.name)}</th><td class="a-def">${A(ctx.cap(c.roleText ?? c.role))}</td><td class="a-pct num disp disp--sub">${cells[i]}%</td></tr>`).join('');
    const [g, ...rest] = cs;
    const body = `${title(ctx, 'proportion', `Most of every page is ${A(g.name)}. The rest takes its share so ${A(cs.find((c) => c.role === 'action')?.name || rest[0].name)} stays the loudest thing on the page.`)}
<div class="a-prop"><table class="st a-t">${thead([['', 52], ['Colour', 112], ['Role', ''], ['Share', 64]])}<tbody>${rows}</tbody></table>${fig(`${r}.1`, 'One page, a hundred squares. Each square is one per cent of the page.', `<div class="a-waffle" role="img" aria-label="One hundred squares, one per cent of a page, coloured by share">${grid}</div>`, 'a-fig--w')}</div>`;
    return std(ctx, 'proportion', body);
  },

  'colour-values'(ctx) {
    const steps = Object.keys(ctx.colours[0].ramp), r = refOf(ctx, 'colour-values'), action = ctx.colours.find((c) => c.role === 'action') || ctx.colours[0];
    const chip = (hex) => `<i class="a-ch${hair(ctx, hex)}" style="background:${hex}"></i>`;
    const n0 = ctx.colours.length;
    const vals = ctx.colours.map((c, i) => `<tr><td class="a-no num">${r}.${i + 1}</td><th scope="row" class="a-term">${chip(c.hex)}${A(c.name)}</th><td>${mono(c.hex)}</td><td>${mono(c.rgb.replace(/R(\d+) G(\d+) B(\d+)/, 'R $1  G $2  B $3'))}</td><td>${mono(c.oklch)}</td></tr>`).join('');
    // tones carry a hex only; the rest of the row says where the tone lands, in its own words
    const tones = ctx.tones.map((t, i) => `<tr><td class="a-no num">${r}.${n0 + i + 1}</td><th scope="row" class="a-term">${chip(t.hex)}${A(t.name)}</th><td>${mono(t.hex)}</td><td colspan="2" class="a-tone">Tone. ${A(sentences(t.lands)[0])}</td></tr>`).join('');
    const nv = n0 + ctx.tones.length;
    const ramped = ctx.colours.filter((c) => c.rampBase !== 50), flat = ctx.colours.filter((c) => c.rampBase === 50);
    // Figure: OKLCH lightness against step, drawn to scale (L 0 to 1 up, step 50 to 900 across)
    const W = 504, H = 168, ml = 44, mr = 12, mt = 8, mb = 28, pw = W - ml - mr, ph = H - mt - mb;
    const s0 = +steps[0], s1 = +steps.at(-1), px = (k) => ml + ((+k - s0) / (s1 - s0)) * pw, py = (l) => mt + (1 - l) * ph, f1 = (n) => n.toFixed(1);
    const Ls = ramped.map((c) => steps.map((k) => ctx.C.toOklch(c.ramp[k]).L));
    const all = Ls.flat(), hi = Math.max(...all), lo = Math.min(...all), f2 = (n) => n.toFixed(2);
    const dash = ['', '', '6 4', '2 3', '8 3 2 3'];
    const grid = [hi, lo].map((l) => `<line class="a-pl-g" x1="${ml}" x2="${W - mr}" y1="${f1(py(l))}" y2="${f1(py(l))}"/><text class="a-pl-t" x="${ml - 8}" y="${f1(py(l) + 4)}" text-anchor="end">${f2(l)}</text>`).join('');
    const ends = [0, 1].map((l) => `<line class="a-pl-a" x1="${ml - 4}" x2="${ml}" y1="${f1(py(l))}" y2="${f1(py(l))}"/>`).join('');
    const xt = steps.map((k) => `<line class="a-pl-a" x1="${f1(px(k))}" x2="${f1(px(k))}" y1="${H - mb}" y2="${H - mb + 4}"/><text class="a-pl-t" x="${f1(px(k))}" y="${H - mb + 17}" text-anchor="middle">${A(k)}</text>`).join('');
    const curves = ramped.map((c, j) => {
      const pts = steps.map((k, i) => [px(k), py(Ls[j][i])]);
      const line = `<polyline class="a-pl-c" points="${pts.map(([x, y]) => `${f1(x)},${f1(y)}`).join(' ')}" style="stroke:${c.hex}${dash[j % dash.length] ? `;stroke-dasharray:${dash[j % dash.length]}` : ''}"/>`;
      const dots = steps.map((k, i) => +k === c.rampBase ? `<circle class="a-pl-b" cx="${f1(pts[i][0])}" cy="${f1(pts[i][1])}" r="5.5" style="fill:${c.ramp[k]}"/>` : `<circle class="a-pl-d" cx="${f1(pts[i][0])}" cy="${f1(pts[i][1])}" r="2.5" style="fill:${c.ramp[k]}"/>`).join('');
      return line + dots;
    }).join('');
    const svg = `<svg class="a-plot" viewBox="0 0 ${W} ${H}" role="img" aria-label="OKLCH lightness of each tint ramp, from step ${A(steps[0])} to ${A(steps.at(-1))}">${grid}<line class="a-pl-a" x1="${ml}" x2="${ml}" y1="${mt}" y2="${H - mb}"/><line class="a-pl-a" x1="${ml}" x2="${W - mr}" y1="${H - mb}" y2="${H - mb}"/>${ends}${xt}${curves}</svg>`;
    const key = ramped.map((c, j) => {
      const bi = steps.findIndex((k) => +k === c.rampBase);
      return `<li><svg class="a-pk" viewBox="0 0 24 8" aria-hidden="true"><line x1="0" x2="24" y1="4" y2="4" class="a-pl-c" style="stroke:${c.hex}${dash[j % dash.length] ? `;stroke-dasharray:${dash[j % dash.length]}` : ''}"/></svg><span><b>${A(c.name)}</b><span class="a-pkv">Base ${A(String(c.rampBase))}, L ${f2(Ls[j][bi])}</span></span></li>`;
    }).join('');
    const plot = `<div class="a-plw"><div class="a-ply">OKLCH L, 0 to 1</div><div>${svg}<div class="a-plx">Step</div></div><ul class="a-plk">${key}</ul></div>`;
    const rc = (c, k) => `<td class="a-rc${+k === c.rampBase ? ' is-base' : ''}">${chip(c.ramp[k])}${mono(c.ramp[k])}${+k === c.rampBase ? '<span class="a-bs">base</span>' : ''}</td>`;
    const ramps = `<table class="st a-rt"><thead><tr><th scope="col" class="a-rs">Step</th>${ramped.map((c) => `<th scope="col">${A(c.name)}</th>`).join('')}</tr></thead><tbody>${steps.map((k) => `<tr><th scope="row" class="a-rs num">${A(k)}</th>${ramped.map((c) => rc(c, k)).join('')}</tr>`).join('')}</tbody></table>`;
    const body = `${title(ctx, 'colour-values', `Values for screens in three formats. Each colour but the ground has a tint ramp of ${steps.length} steps (${A(steps[0])} to ${A(steps.at(-1))}), plotted below and listed in Annex A.`)}
<table class="st a-t a-vt">${thead([['', 52], ['Colour', 144], ['HEX', 88], ['RGB', 144], ['OKLCH', '']])}<tbody>${vals}${tones}</tbody></table>
${fig(`${r}.1`, `Lightness by step, drawn to scale. The ringed point is the colour itself. Gridlines mark the lightest and darkest steps.`, plot, 'a-fig--plot')}
<h2 class="a-h2 a-h2--annex"><span class="num">Annex A</span> (informative) Tint ramps</h2>
${ramps}`;
    return std(ctx, 'colour-values', body, { note: `${flat.length ? `${flat.map((c) => A(c.name)).join(' and ')}: the ground. No tints. ` : ''}Print can shift a colour, so ask your printer for a proof before a run, and match ${A(action.name)} to the proof. Every ramp step is in the palette files in the brand kit.` });
  },
};
