// Theme 09 Blueprint, run A: intro, personality, voice, write-this, messaging, logo, clear-space, min-size, logo-grounds,
// logo-misuse, palette, proportion, colour-values. Styles are in css-a.js (classes start a-). Every page is a drawing sheet that
// ends in a ruled title block. Colour is a finishes schedule (a drawn elevation with C1.. key tags, then a keyed table); logo pages
// are details lettered A, B, C in bubbles; redlines print the length they draw.
import { A, nameOf, fit, std, hline, vline } from './helpers.js';

// the brand's own name for a hex, else the hex itself
const hexName = (ctx, hex) => ctx.colours.find((c) => c.hex.toLowerCase() === hex.toLowerCase())?.name || hex;
const byRole = (ctx, role, n = 0) => ctx.colours.find((c) => c.role === role) || ctx.colours[n];
// whichever of the page's text and card colours reads better on a hex
const inkOn = (ctx, hex) => { const t = ctx.roles.light.text, g = ctx.roles.light.surface; return ctx.ratio(t, hex) >= ctx.ratio(g, hex) ? t : g; };
// a colour that needs a hairline edge on the sheet: White, or Plaster (the sheet's own ground)
const isCard = (ctx, hex) => [ctx.roles.light.surface, ctx.roles.light.raised].some((c) => c.toLowerCase() === hex.toLowerCase());
const sentences = (s) => s.split(/(?<=\.)\s+/);
const words = (s) => s.trim().split(/\s+/).length;
const NUM = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven'];
const cap1 = (s) => s.replace(/^./, (c) => c.toUpperCase());
const join = (a) => (a.length > 1 ? `${a.slice(0, -1).join(', ')} and ${a.at(-1)}` : a[0] || '');
const mmPx = (mm) => (mm * 96) / 25.4;
const letter = (i) => String.fromCharCode(65 + i);

// a key bubble: a Brick ring with a letter or a number (C1, A, 3)
export const bub = (t) => `<span class="a-bub">${A(String(t))}</span>`;
// the finish key for a colour: C1, C2 ... in the palette's own order
const tag = (ctx, c) => `C${ctx.colours.findIndex((x) => x.id === c.id) + 1}`;
// the ruled title block that closes every sheet of this run
const tblock = (ctx, id, scale) => {
  const p = ctx.pages.find((x) => x.id === id), s = p.section;
  return `<div class="a-tb"><div><span class="k">Drawing</span><b>${A(p.title)}</b></div><div><span class="k">Section</span>${s ? `${A(String(s.n))} ${A(s.title)}` : 'Front matter'}</div><div><span class="k">Scale</span>${A(scale)}</div><div><span class="k">Revision</span>${A(ctx.versionLine)}</div></div>`;
};
export const sheet = (ctx, id, inner, scale = 'Not to scale', cls = '') => std(ctx, id, `${inner}<div class="a-gap"></div>${tblock(ctx, id, scale)}`, `a-sheet ${cls}`);
// a drawn detail: the drawing, then a title strip with the bubble, as on a drawing sheet
const detail = (l, title, note, drawing, h, cls = '') => `<figure class="a-detail ${cls}"><div class="a-dwg" style="height:${h}px">${drawing}</div><figcaption class="a-dt">${bub(l)}<span><b>${A(title)}</b>${A(note)}</span></figcaption></figure>`;

export const guidelinesA = {
  intro(ctx) {
    const B = ctx.brand, [first, ...rest] = sentences(B.description);
    const notes = [['What it does', B.product], ['Who it serves', B.audience]].map(([k, v], i) => `<li>${bub(i + 1)}<span class="k">${A(k)}</span><p>${A(v)}</p></li>`).join('');
    return sheet(ctx, 'intro', `<div class="a-hero"><p class="disp a-big a-big--i">${A(first)}</p>${vline(-24, 0, 72, 72, { dx: -24 })}</div><p class="a-sub">${A(rest.join(' '))}</p><h2 class="a-nh">General notes</h2><ol class="a-notes">${notes}</ol>`);
  },

  personality(ctx) {
    const B = ctx.brand, [l1] = B.lines.others;
    const cols = B.personality.map((t, i) => `<li>${bub(letter(i))}<p class="disp a-trait">${A(t.trait)}</p><i class="a-dash"></i><p class="a-means">${A(t.means)}</p></li>`).join('');
    const lines = [B.lines.primary, l1].filter(Boolean).map((l) => `<p>${A(l)}</p>`).join('');
    return sheet(ctx, 'personality', `<p class="lead">${A(B.name)} is ${NUM[B.personality.length] || B.personality.length} things, and each one shows up in the work.</p><ol class="a-cols" style="grid-template-columns:repeat(${B.personality.length},minmax(0,1fr))">${cols}</ol><div class="a-sayit"><span class="k">In a breath</span>${lines}</div>`);
  },

  voice(ctx) {
    const B = ctx.brand, V = B.voice;
    const parts = sentences(B.lines.primary);
    const lines = parts.map((p) => `<span>${A(p)}</span>`).join('');
    const rows = V.principles.map((p, i) => `<li>${bub(i + 1)}<h2 class="a-pt">${A(p.title)}</h2><p class="a-ex">${A(p.example)}</p></li>`).join('');
    return sheet(ctx, 'voice', `<p class="lead">Dates, prices and materials, said once. ${cap1(NUM[V.principles.length] || String(V.principles.length))} habits keep it that way.</p><div class="a-hero a-hero--v"><p class="disp a-big a-big--v">${lines}</p>${parts.map((_, i) => vline(-24, i * 72, 72, 72, { dx: -24 })).join('')}</div><ol class="a-grid2">${rows}</ol>`);
  },

  'write-this'(ctx) {
    const W = ctx.brand.voice.writeThis;
    const rows = W.map((r, i) => `<li>${bub(i + 1)}<dl><div><dt class="a-wr">Write this</dt><dd class="a-w">${A(r.write)}</dd></div><div><dt>Not that</dt><dd class="a-nt"><s>${A(r.not)}</s></dd></div><div><dt>Because</dt><dd class="a-bc">${A(r.because)}</dd></div></dl></li>`).join('');
    return sheet(ctx, 'write-this', `<p class="lead">${cap1(NUM[W.length] || String(W.length))} lines as ${A(ctx.brand.name)} would write them, with the lines they replace struck through.</p><ul class="a-wt">${rows}</ul>`);
  },

  messaging(ctx) {
    const B = ctx.brand, V = B.voice, all = [B.lines.primary, ...B.lines.others];
    const lines = all.map((l, i) => `<li class="${i ? '' : 'a-first'}">${A(l)}</li>`).join('');
    const row = (n, h, body) => `<li class="a-mr">${bub(n)}<h2 class="a-mh">${h}</h2><div>${body}</div></li>`;
    return sheet(ctx, 'messaging', `<ul class="a-sched">${row(1, 'Name', `<p class="disp a-big a-big--n">${A(B.name)}</p><p class="a-rule">${A(V.nameRules)}</p>`)}${row(2, 'Lines in use', `<ul class="a-ll">${lines}</ul>`)}${row(3, `Short boilerplate, ${words(V.boilerplate25)} words`, `<p class="a-bp">${A(V.boilerplate25)}</p>`)}${row(4, `Long boilerplate, ${words(V.boilerplate50)} words`, `<p class="a-bp">${A(V.boilerplate50)}</p>`)}</ul>`);
  },

  logo(ctx) {
    const L = ctx.logo, B = ctx.brand, cw = B.logo.colourways.colour, g = L.geos.colour;
    const LW = 560, LH = Math.round((LW * g.h) / g.w);
    const gp = L.geo, sc = LW / g.w, by = Math.round(gp.top * sc), bx = Math.round(gp.cx * sc); // plumb dimension: baseline to the foot of the bob, only where the logo is drawn
    const plumb = ctx.edition === 'slot' || gp.top === undefined ? '' : `<i class="g-ext" style="left:${bx + 10}px;top:${by}px;width:38px"></i><i class="g-ext" style="left:${bx + 14}px;top:${LH}px;width:34px"></i>${vline(bx + 44, by, LH - by, LH - by, { dx: 10 })}`;
    const fig = `<div class="a-fig" style="width:${LW}px;height:${LH}px">${L.html('colour', { width: LW, color: cw.name, label: 'Your logo goes here' })}${hline(0, -32, LW, LW)}${vline(LW + 24, 0, LH, LH)}${plumb}</div>`;
    return sheet(ctx, 'logo', `<p class="lead a-lead2">${A(B.logo.idea)}</p>${detail('A', L.labels.colour, `. ${B.logo.when.colour} Drawn at 1×.`, fig, 560, 'a-detail--lg')}`, '1×');
  },

  'clear-space'(ctx) {
    const L = ctx.logo, B = ctx.brand, g = L.geos.colour, cw = B.logo.colourways.colour;
    const lw = 400, s = lw / g.w, lh = Math.round(g.h * s), X = Math.round(L.geo.cap * s), zw = lw + 2 * X, zh = lh + 2 * X;
    const unit = ctx.edition === 'slot' ? `x is ${L.clearShare}% of the logo's height.` : `x is the cap height of the name, ${L.clearShare}% of the logo's height.`;
    const marks = [hline(0, -28, X, X, { label: `x ${X}` }), vline(zw + 24, 0, X, X, { label: `x ${X}`, dx: 8 }), hline(zw - X, zh + 28, X, X, { label: `x ${X}`, dy: 12 }), vline(-24, zh - X, X, X, { label: `x ${X}`, dx: -44 })].join('');
    const total = hline(0, zh + 72, zw, zw, { dy: 12 });
    const hatch = `<svg class="a-hatch" width="${zw}" height="${zh}" aria-hidden="true"><defs><pattern id="a-hatch-cs" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V8" stroke="currentColor" stroke-width="0.6"/></pattern></defs><rect width="100%" height="100%" fill="url(#a-hatch-cs)"/></svg>`;
    const zone = `<div class="a-zone" style="width:${zw}px;height:${zh}px">${hatch}<div class="a-zin" style="left:${X}px;top:${X}px;width:${lw}px;height:${lh}px">${L.html('colour', { width: lw, color: cw.name, label: 'Your logo goes here' })}</div>${marks}${total}</div>`;
    return sheet(ctx, 'clear-space', `<p class="lead">Keep a clear zone around the logo, x on every side. ${A(unit)} Nothing enters the zone: no type, no edges, no other logos.</p>${detail('B', 'Clear space', '. Measured from the edge of the logo on all four sides. Drawn at 1×, in pixels.', zone, zh + 250, 'a-detail--cs')}`, '1×');
  },

  'min-size'(ctx) {
    const L = ctx.logo, m = L.minSize, g = L.geos.colour, cw = ctx.brand.logo.colourways.colour;
    // a pixel or millimetre grid behind the logo, so the true size can be counted (pattern drawn in SVG, one cell = `cell` px)
    const grid = (id, cell, label) => `<svg class="a-grid" aria-hidden="true"><defs><pattern id="a-grid-${id}" width="${cell}" height="${cell}" patternUnits="userSpaceOnUse"><path d="M${cell} 0H0V${cell}" fill="none" stroke="currentColor" stroke-width="0.6"/></pattern></defs><rect width="100%" height="100%" fill="url(#a-grid-${id})"/></svg><span class="a-gl cap">${label}</span>`;
    const row = (l, title, w, h, wLabel, hLabel, note, gr) => `<figure class="a-mrow"><figcaption class="a-mk">${bub(l)}<b>${title}: ${wLabel} wide</b><span class="cap">${hLabel} high. ${note}</span></figcaption><div class="a-mdw">${gr}<div class="a-msm" style="width:${w}px;height:${h}px">${L.html('colour', { width: Math.round(w), color: cw.name, label: 'Logo' })}${hline(0, -22, w, w, { label: wLabel })}${vline(w + 14, 0, h, h, { label: hLabel, dx: 8 })}</div></div></figure>`;
    const pw = mmPx(m.printMm), ph = (pw * g.h) / g.w;
    return sheet(ctx, 'min-size', `<p class="lead">The logo never goes smaller than these widths. Both are drawn at actual size: on screen at 1 px to the pixel, in print at true millimetres.</p><div class="a-mrows">${row('C', 'Screen', m.screenPx, m.screenH, `${m.screenPx} px`, `${m.screenH} px`, 'The smallest it appears on a page or a screen.', grid('px', 10, 'Grid: 10 px'))}${row('D', 'Print', pw, ph, `${m.printMm} mm`, `${m.printH} mm`, 'The smallest it prints, on any paper.', grid('mm', mmPx(5), 'Grid: 5 mm'))}</div>`, '1×');
  },

  'logo-grounds'(ctx) {
    const L = ctx.logo, cw = ctx.brand.logo.colourways, ml = cw['mono-light'], card = ctx.roles.light.surface;
    const row = (i, key, ground, label) => {
      const c = cw[key], desc = c.name.toLowerCase() === c.plumb.toLowerCase() ? `${hexName(ctx, c.name)} name and line` : `${hexName(ctx, c.name)} name, ${hexName(ctx, c.plumb)} line`;
      return `<li class="a-gr">${bub(letter(i))}<div class="a-gt ${isCard(ctx, ground) ? 'hairline' : ''}" style="background:${ground}">${L.html('colour', { width: fit(ctx, 'colour', 200, 56), colourway: key, color: c.name, label: 'Logo' })}</div><p class="cap"><b>On ${A(label)}</b>${A(desc)}</p></li>`;
    };
    const grounds = [['colour', cw.colour.ground], ['colour', card], ['reversed', cw.reversed.ground], ['on-brick', cw['on-brick'].ground], ['on-timber', cw['on-timber'].ground]];
    const names = grounds.map(([, gr]) => hexName(ctx, gr));
    const photo = `<li class="a-gr">${bub(letter(grounds.length))}<div class="a-gt a-gt--photo">${ctx.photo('measure-up', { cls: 'a-fillimg' })}<span class="a-onphoto">${L.html('mono-light', { width: fit(ctx, 'colour', 120, 40), colourway: 'mono-light', color: ml.name, label: 'Logo' })}</span></div><p class="cap"><b>On a photo</b>Mono light, on a quiet dark part of the picture.</p></li>`;
    return sheet(ctx, 'logo-grounds', `<p class="lead">The logo sits on ${A(join([...new Set(names)]))}, each in its own colourway. On a photo it goes in mono light, on a quiet area, clear of faces and edges.</p><ol class="a-grs">${grounds.map(([k, gr], i) => row(i, k, gr, names[i])).join('')}${photo}</ol>`);
  },

  'logo-misuse'(ctx) {
    const L = ctx.logo, w = 150, cs = ctx.colours;
    const off = ctx.C.toOklch(byRole(ctx, 'action').hex), wrong = ctx.C.fromOklch(Math.min(off.L, 0.42), off.C, (off.H + 120) % 360);
    const shade = ctx.C.hexToRgb(ctx.brand.logo.colourways.colour.name).join(',');
    const bands = [3, 1, 2, 1, 3, 2, 1, 2, 3, 1, 2], tot = bands.reduce((a, b) => a + b, 0);
    let ax = 0; const busy = `<svg class="a-busy" viewBox="0 0 ${tot} 10" preserveAspectRatio="none" aria-hidden="true">${bands.map((b, i) => { const r = `<rect x="${ax}" y="0" width="${b}" height="10" fill="${cs[(i * 2) % cs.length].hex}"/>`; ax += b; return r; }).join('')}</svg>`;
    const items = [
      ['Stretched', 'Never squash or stretch it. Scale it evenly.', `<div style="transform:scale(1.35,0.7)">${L.forMisuse(w)}</div>`],
      ['Recoloured', 'Never recolour it. Use a colourway from the versions page.', L.forMisuse(w, { fill: wrong })],
      ['Rotated', 'Never tilt or turn it. It hangs true, level with the page.', `<div style="transform:rotate(-14deg)">${L.forMisuse(w)}</div>`],
      ['Effects', 'No shadows, glows or bevels.', `<div style="filter:drop-shadow(5px 6px 4px rgba(${shade},0.55))">${L.forMisuse(w)}</div>`],
      ['Busy ground', 'Never on a busy ground. Use mono light on a quiet part of a photo.', `${busy}<span class="a-onbusy">${L.forMisuse(w)}</span>`],
      ['Outlined or boxed', 'No outlines, no boxes, no frames around it.', `<div class="a-boxed">${L.forMisuse(w - 30)}</div>`],
    ];
    const cross = '<svg class="a-x" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M0 0L100 100M100 0L0 100" fill="none" stroke="currentColor" stroke-width="1" vector-effect="non-scaling-stroke"/></svg>';
    const rev = (n) => `<svg class="a-tri" viewBox="0 0 26 24" aria-hidden="true"><path d="M13 2L24 22H2Z" fill="none" stroke="currentColor" stroke-width="1"/><text x="13" y="18" text-anchor="middle">${n}</text></svg>`;
    const cell = ([t, c, html], i) => `<figure class="a-zc"><div class="a-mt ${i === 4 ? 'a-mt--busy' : ''}">${html}${cross}</div><figcaption class="cap">${rev(i + 1)}<span><b>${t}</b>${c}</span></figcaption></figure>`;
    const rows = [0, 1, 2].map((r) => `<div class="a-zr"><span class="a-zn">${r + 1}</span>${items.slice(r * 2, r * 2 + 2).map((it, j) => cell(it, r * 2 + j)).join('')}</div>`).join('');
    return sheet(ctx, 'logo-misuse', `<p class="lead">Six ways the logo goes wrong, each struck through. Use the supplied files as they are, and none of these.</p><div class="a-zg"><div class="a-zh"><span></span><span>A</span><span>B</span></div>${rows}</div>`);
  },

  palette(ctx) {
    const cs = ctx.colours, action = byRole(ctx, 'action');
    const pick = (role, n) => byRole(ctx, role, n);
    const plaster = pick('ground', 0), white = pick('panel', 1), stone = pick('text', 2), brick = pick('action', 3), timber = pick('accent fill', 4);
    const courses = []; for (let y = 140; y < 244; y += 12) courses.push(`M120 ${y}H562`);
    const ticks = []; for (let x = 28; x < 662; x += 18) ticks.push(`M${x} 256l-7 7`);
    // [colour, bubble x, bubble y, point x, point y] in drawing units, 1 to 1 with the sheet
    const pts = [[plaster, 46, 150, 134, 142], [stone, 46, 62, 206, 98], [stone, 46, 236, 134, 250], [brick, 636, 236, 366, 236], [timber, 341, 282, 341, 262], [white, 636, 96, 520, 168]];
    const lead = pts.map(([, bx, by, px, py]) => `<path class="a-ld" d="M${bx} ${by}L${px} ${py}"/><circle class="a-ldd" cx="${px}" cy="${py}" r="3"/>`).join('');
    const bubs = pts.map(([c, bx, by]) => `<g><circle class="a-bc2" cx="${bx}" cy="${by}" r="14"/><text class="a-bt" x="${bx}" y="${by + 4}" text-anchor="middle">${tag(ctx, c)}</text></g>`).join('');
    const svg = `<svg class="a-elev" viewBox="0 0 682 300" role="img" aria-label="A house front drawn in line, with each finish tagged where it goes: ${cs.map((c, i) => `C${i + 1} ${A(c.name)}`).join(', ')}.">
<path class="a-el-m" d="M20 256H662${ticks.join('')}"/>
<rect class="a-el" x="120" y="128" width="442" height="128" fill="${plaster.hex}"/><path class="a-el-h" d="${courses.join('')}"/>
<polygon class="a-el" points="98,130 341,40 584,130" fill="${stone.hex}"/>
<rect class="a-el" x="114" y="244" width="454" height="12" fill="${stone.hex}"/>
<rect class="a-el" x="150" y="160" width="96" height="58" fill="${white.hex}"/><path class="a-el-m" d="M198 160V218M150 189H246"/>
<rect class="a-el" x="436" y="160" width="96" height="58" fill="${white.hex}"/><path class="a-el-m" d="M484 160V218M436 189H532"/>
<rect class="a-el" x="316" y="70" width="50" height="36" fill="${white.hex}"/><path class="a-el-m" d="M341 70V106"/>
<rect class="a-el" x="304" y="176" width="76" height="68" fill="${brick.hex}"/><path class="a-el-m" d="M314 186H370V212H314ZM314 222H370V238H314Z"/>
<rect class="a-el" x="284" y="172" width="8" height="72" fill="${timber.hex}"/><rect class="a-el" x="390" y="172" width="8" height="72" fill="${timber.hex}"/>
<rect class="a-el" x="272" y="162" width="138" height="12" fill="${timber.hex}"/><rect class="a-el" x="276" y="256" width="130" height="8" fill="${timber.hex}"/>
${lead}${bubs}</svg>`;
    const row = (c) => `<li class="a-pr">${bub(tag(ctx, c))}<span class="a-pf"><i class="a-sw2 ${isCard(ctx, c.hex) ? 'hairline' : ''}" style="background:${c.hex}"></i><b class="disp">${A(c.name)}</b></span><p><span class="a-prole">${A(ctx.cap(c.role))}.</span> ${A(c.lands)}</p></li>`;
    return sheet(ctx, 'palette', `<p class="lead">${cap1(NUM[cs.length] || String(cs.length))} colours, each named for where it lands. ${A(action.name)} is the one action on a page, and the redline.</p>${detail('A', 'Finishes elevation', '. A house front, so each finish has a place. The key tags run C1 to C' + cs.length + '.', svg, 300, 'a-detail--el')}<h2 class="a-nh">Finishes schedule</h2><ol class="a-pal"><li class="a-prh"><span>Key</span><span>Finish</span><span>Where it lands</span></li>${cs.map(row).join('')}</ol>`);
  },

  proportion(ctx) {
    const cs = [...ctx.colours].sort((a, b) => b.share - a.share), total = cs.reduce((s, c) => s + c.share, 0), W = 600, H = 180;
    let acc = 0;
    const bands = cs.map((c) => { const left = Math.round((acc / total) * W); acc += c.share; const right = Math.round((acc / total) * W); return { c, left, w: right - left, pct: Math.round((c.share / total) * 100) }; });
    const bar = bands.map((b) => `<div class="a-bd ${isCard(ctx, b.c.hex) ? 'hairline' : ''}" style="left:${b.left}px;width:${b.w}px;background:${b.c.hex}"></div>`).join('');
    const chain = bands.map((b) => hline(b.left, -22, b.w, b.w, { label: `${b.w}`, dy: -18 })).join('');
    const keys = bands.map((b) => { const cx = b.left + b.w / 2; return `<i class="a-lv" style="left:${cx}px;top:${H}px"></i><span class="a-kb" style="left:${cx - 13}px;top:${H + 22}px">${bub(tag(ctx, b.c))}</span>`; }).join('');
    const [g, ...rest] = bands;
    const small = rest.filter((b) => b.pct < 10);
    const lead = `Most of every page is ${g.c.name}. ${small.length ? `${join(small.map((b) => b.c.name))} stay small so they stay the loudest things on the page.` : ''}`;
    const rows = bands.map((b) => `<li>${bub(tag(ctx, b.c))}<span class="a-kn">${A(b.c.name)}</span><span class="num">${b.pct}%</span><span class="num a-kw">${b.w} px</span></li>`).join('');
    const drawing = `<div class="a-bar" style="width:${W}px;height:${H}px">${bar}${chain}${keys}</div>`;
    return sheet(ctx, 'proportion', `<p class="lead">${A(lead)}</p>${detail('A', 'One page, as a section', `. ${W} px stands for 100 per cent, so 6 px is one per cent. Each redline is the width its colour takes.`, drawing, 320, 'a-detail--pr')}<h2 class="a-nh">Share of the page</h2><ol class="a-keys">${rows}</ol>`);
  },

  'colour-values'(ctx) {
    const steps = Object.keys(ctx.colours[0].ramp);
    const ring = (c) => String(c.rampBase);
    const ramp = (c) => (Number(c.rampBase) === 50
      ? `<p class="a-rampnote">${A(c.name)} is the panel colour, used flat. No tints.</p>`
      : `<div class="a-st" style="grid-template-columns:repeat(${steps.length},minmax(0,1fr))">${steps.map((k, i) => `<span class="${String(k) === ring(c) ? 'base' : ''}"><i class="${isCard(ctx, c.ramp[k]) ? 'hairline' : ''}" style="height:${12 + i * 4}px;background:${c.ramp[k]}"></i><em class="num">${k}</em></span>`).join('')}</div>`);
    const row = (c) => `<li class="a-cv">${bub(tag(ctx, c))}<span class="a-cvn"><i class="a-sw2 ${isCard(ctx, c.hex) ? 'hairline' : ''}" style="background:${c.hex}"></i><b>${A(c.name)}</b></span><dl class="a-vals"><div><dt>HEX</dt><dd class="a-mono">${A(c.hex)}</dd></div><div><dt>RGB</dt><dd class="a-mono">${A(c.rgb.replace(/R(\d+) G(\d+) B(\d+)/, 'R $1  G $2  B $3'))}</dd></div><div><dt>OKLCH</dt><dd class="a-mono">${A(c.oklch)}</dd></div></dl>${ramp(c)}</li>`;
    const tones = ctx.tones.map((t, i) => `<li>${bub('T' + (i + 1))}<i class="a-sw2 ${isCard(ctx, t.hex) ? 'hairline' : ''}" style="background:${t.hex}"></i><span><b>${A(t.name)}</b><span class="a-mono">${A(t.hex)}</span></span></li>`).join('');
    const act = byRole(ctx, 'action');
    return sheet(ctx, 'colour-values', `<ol class="a-cvl"><li class="a-cvcols"><span>Key</span><span>Finish</span><span>Value</span><span>Ramp, ${A(steps[0])} to ${A(steps.at(-1))}</span></li>${ctx.colours.map(row).join('')}</ol><div class="a-vbot"><div><h2 class="a-h3">Tones</h2><ul class="a-tones">${tones}</ul></div><div class="a-note">${bub('N')}<p>Values are for screens. Print can shift a colour, so ask your printer for a proof before a run, and match ${A(act.name)} to the proof. The ringed step is the colour itself. Every ramp step is in the palette files in the brand kit.</p></div></div>`);
  },
};

