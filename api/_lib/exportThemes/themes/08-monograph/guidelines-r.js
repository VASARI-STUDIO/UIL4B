// Guidelines gate pages for theme 08, Riso: cover, palette, colour-values, contrast. Styles are in css-r.js (classes start r-).
// The art space's own riso press: each brand colour that prints is a drum, numbered by how much of a page it covers; the ground colour
// is the paper and takes no ink. Every figure is a printed sheet (paper edged by a hairline), and only sheets carry registration
// crosses, at their corners. Only the brand's real colours and ramp steps are shown: no overprints, no grain.
import { A, ratioText, nameOf } from './helpers.js';

export const NUM = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
export const Word = (n) => NUM[n] || String(n);
export const surface = (ctx) => ctx.roles.light.surface.toLowerCase();
export const isSurface = (ctx, hex) => hex.toLowerCase() === surface(ctx);
// the paper: the ground colour; the drums: every other colour, largest share first (ties keep the brand's order)
export const paper = (ctx) => ctx.colours.find((c) => c.role === 'ground') || ctx.colours.find((c) => isSurface(ctx, c.hex)) || ctx.colours[0];
export const drums = (ctx) => { const p = paper(ctx); return ctx.colours.map((c, i) => [c, i]).filter(([c]) => c !== p).sort((a, b) => b[0].share - a[0].share || a[1] - b[1]).map(([c]) => c); };
export const drumNo = (ctx, c) => drums(ctx).indexOf(c) + 1;
export const byRole = (ctx, role) => ctx.colours.find((c) => c.role === role);
export const pc = (c) => Math.round(c.share * 100);
// whichever of the text and ground colours reads better on a hex
export const inkOn = (ctx, hex) => { const t = ctx.roles.light.text, g = ctx.roles.light.surface; return ctx.ratio(t, hex) >= ctx.ratio(g, hex) ? t : g; };
// the ink a sheet's margin words print in: the drum's own ink where it passes 4.5 : 1 on the paper, else the text colour
export const readInk = (ctx, hex) => (ctx.ratio(hex, ctx.roles.light.surface) >= 4.5 ? hex : ctx.roles.light.text);

// the registration cross: a thin cross through a circle, drawn on the half pixel (odd size) so a 1 px line stays crisp
export const cross = (col, s = 15) => { const m = s / 2, r = Math.round(s * 0.27); return `<svg class="r-x" viewBox="0 0 ${s} ${s}" width="${s}" height="${s}" aria-hidden="true"><circle cx="${m}" cy="${m}" r="${r}" fill="none" stroke="${col}" stroke-width="1"/><path d="M${m} 0v${s}M0 ${m}h${s}" stroke="${col}" stroke-width="1" fill="none"/></svg>`; };
// a cross at each corner of the sheet it sits in (the sheet is position:relative); --xi sets the inset
export const corners = (col, s) => ['tl', 'tr', 'bl', 'br'].map((k) => `<span class="r-xc r-xc--${k}">${cross(col, s)}</span>`).join('');

// the page: a running head (name left, folio right), then the content. The page is not a sheet, so it has no crosses.
export function page(ctx, id, inner, cls = '') {
  const head = `<div class="r-hd"><span>${A(ctx.brand.name)}, brand guidelines</span><span class="num">${ctx.pageNo(id)}</span></div>`;
  return `<section class="pg r-pg ${cls}" data-page="${id}">${head}${inner}</section>`;
}
export const vals = (c) => `<dl class="r-vals">${[['HEX', c.hex], ['RGB', c.rgb], ['OKLCH', c.oklch]].map(([k, v]) => `<div><dt>${k}</dt><dd class="r-mono">${A(v)}</dd></div>`).join('')}</dl>`;

// the cover sheet at full size (500 x 707): one layer per drum. The Blush drum prints the square plate, the Vermilion drum the line,
// the Ink drum the logo, the title and the version. Each layer carries its own registration crosses, in its own ink.
export const CS = { w: 500, h: 707, plate: { x: 40, y: 56, s: 320 }, logoW: 220, pad: 28 };
export function coverLayers(ctx) {
  const B = ctx.brand, cw = B.logo.colourways, ink = byRole(ctx, 'text'), act = byRole(ctx, 'action'), acc = byRole(ctx, 'accent');
  const P = CS.plate, lh = CS.logoW / ctx.logo.geo.aspect, way = cw['on-blush'] ? 'on-blush' : 'mono-dark';
  const logo = `<div class="r-cv-logo" style="left:${P.x + CS.pad}px;top:${(P.y + P.s - CS.pad - lh).toFixed(1)}px">${ctx.logo.html('colour', { width: CS.logoW, colourway: way, color: cw[way].name, label: 'Your logo goes here' })}</div>`;
  return [
    { c: acc, html: `<i class="r-cv-plate" style="left:${P.x}px;top:${P.y}px;width:${P.s}px;height:${P.s}px;background:${acc.hex}"></i>`, carries: 'the square plate' },
    { c: act, html: `<p class="disp r-cv-line ph-tight" style="color:${act.hex}">${A(B.lines.primary)}</p>`, carries: 'the line' },
    { c: ink, html: `${logo}<p class="r-cv-t" style="color:${ink.hex}">Brand guidelines</p><p class="r-cv-v num" style="color:${ink.hex}">${A(ctx.versionLine)}</p>`, carries: 'the logo and the title' },
  ];
}
// a separation carries its own crosses in its own ink; on the composite the crosses print in register, so only the top (Ink) set shows
export const coverSheet = (layers, k) => `<div class="r-cs" style="transform:scale(${k})">${layers.map((l, i) => `<div class="r-l">${l.html}${i === layers.length - 1 ? corners(l.c.hex, 25) : ''}</div>`).join('')}</div>`;
// the cover's frame: the separations in a column at the left, spanning the composite's height; the composite; the colour bar under both
export const CV = { L: 48, top: 72, sepW: 112, gap: 28, bar: 56 };

// the copy a test print carries, from the brand's own words: body text on the paper gets the paragraph, a label on the action
// colour gets the button's words, quiet text gets a caption; the rest take the brand's short lines in turn, none twice. A small
// sheet takes the shortest line left in its list, so its copy stays a line or two.
export function printCopy(ctx, items, small) {
  const B = ctx.brand, S = B.type.sample, V = (B.voice.principles || []).map((p) => p.example), c0 = B.ui.screen.content;
  const role = (id) => ctx.byId[id].role || '';
  // the action colour as text carries changes and errors, so it reads the brand's examples from the last (the most specific) back
  const quiet = [S.caption, c0.riderNote, c0.pickup].filter(Boolean), pool = [B.lines.primary, ...(B.lines.others || []), ...V, c0.pickup, S.headline].filter(Boolean);
  const actionPool = [...V].reverse().concat(pool).filter(Boolean);
  const used = new Set();
  const take = (list, short) => { const left = list.filter((t) => !used.has(t)), s = (short ? [...left].sort((a, b) => a.length - b.length)[0] : left[0]) || list[0]; used.add(s); return s; };
  return items.map((x, i) => {
    const sm = small(i);
    if (i === 0 && role(x.bg) === 'ground') { used.add(S.paragraph); return S.paragraph; }
    if (role(x.bg) === 'action' && c0.form && c0.form.title) return c0.form.title;
    if (role(x.fg).includes('quiet')) return take(quiet, sm);
    if (role(x.fg) === 'action') return take(actionPool, sm);
    return take(pool, sm);
  });
}

export const guidelinesR = {
  // the cover as separations: each drum's layer small in a column at the left, in drum order, from the composite's top to its bottom;
  // the composite large at the right; the colour bar (one solid per drum, then the paper) along the foot of both
  cover(ctx) {
    const layers = coverLayers(ctx), D = drums(ctx), p = paper(ctx);
    const W = 794 - CV.L * 2 - CV.sepW - CV.gap, k = W / CS.w, H = Math.round(CS.h * k), ks = CV.sepW / CS.w;
    const seps = [...layers].sort((a, b) => drumNo(ctx, a.c) - drumNo(ctx, b.c)).map((l) => `<figure class="r-sep"><div class="r-sep__sh" style="width:${CV.sepW}px;height:${Math.round(CS.h * ks)}px">${coverSheet([l], ks)}</div><figcaption><span class="r-sep__d">Drum ${drumNo(ctx, l.c)}</span><span class="r-sep__n">${A(l.c.name)}</span><span class="r-sep__c">Prints ${l.carries}</span></figcaption></figure>`).join('');
    const cell = (c, label, hair) => `<div class="r-bar__c"><i class="${hair ? 'r-hair' : ''}" style="background:${c.hex}"></i><p><span class="r-bar__l">${label}</span> <span class="r-mono">${A(c.hex)}</span></p></div>`;
    const bar = `<div class="r-bar" style="left:${CV.L}px;right:${CV.L}px;top:${CV.top + H + CV.bar}px;grid-template-columns:repeat(${D.length + 1},minmax(0,1fr))">${D.map((c) => cell(c, `Drum ${drumNo(ctx, c)}`)).join('')}${cell(p, 'Paper', true)}</div>`;
    return `<section class="pg r-pg r-pg--cover" data-page="cover"><div class="r-seps" style="left:${CV.L}px;top:${CV.top}px;width:${CV.sepW}px;height:${H}px">${seps}</div>`
      + `<div class="r-cvc" style="left:${CV.L + CV.sepW + CV.gap}px;top:${CV.top}px;width:${W}px;height:${H}px">${coverSheet(layers, k)}</div>${bar}</section>`;
  },

  // the drums as a stack of pulled sheets, in drum order, each overlapping the one before; each sheet carries its drum's solid,
  // sized by share (by area), and the drum number and ink name in its margin. The stack sits on the paper, whose words close the page.
  palette(ctx) {
    const V = ctx.brand.voice.principles, sample = ctx.brand.type.sample, c0 = ctx.brand.ui.screen.content;
    // the words each colour carries, by its place in the palette: the ground holds the headline, the action the button
    const texts = [sample.headline, V[1] ? V[1].example : sample.paragraph, c0.form.book, c0.deliveries[2] ? c0.deliveries[2].to : sample.caption];
    const textOf = (c) => texts[ctx.colours.indexOf(c) % texts.length];
    const D = drums(ctx), p = paper(ctx), max = D[0].share, n = D.length;
    // the stack inside the paper: sheets overlap by OV, stepping down by DY; the solid's print area stays clear of the next sheet
    const PAD = 32, OV = 16, DY = 28, M = 18, inner = 650 - PAD * 2, SW = Math.floor((inner + OV * (n - 1)) / n), step = SW - OV;
    const PW = step - M * 2, PH = Math.round(PW * 1.66), SH = M + PH + 92;
    const solid = (c) => { const f = Math.sqrt(c.share / max); return [Math.round(PW * f), Math.round(PH * f)]; };
    const sheet = (c, i) => { const [w, h] = solid(c), ink = readInk(ctx, c.hex); return `<div class="r-ps" style="left:${PAD + i * step}px;top:${PAD + i * DY}px;width:${SW}px;height:${SH}px;z-index:${i + 1}">${corners(c.hex)}`
      + `<div class="r-solid" style="left:${M}px;top:${M}px;width:${w}px;height:${h}px;background:${c.hex};color:${inkOn(ctx, c.hex)}"><span class="r-solid__t">${A(textOf(c))}</span></div>`
      + `<p class="r-ps__m" style="left:${M}px;right:${M + OV}px;color:${ink}"><span class="r-ps__d">Drum ${drumNo(ctx, c)}</span><span class="r-ps__n">${A(c.name)}</span></p></div>`; };
    const stackH = PAD + DY * (n - 1) + SH;
    const notes = D.map((c, i) => `<div class="r-pn"><p class="r-role">${A(ctx.cap(c.role))}. <span class="num">${pc(c)}%</span> of a page.</p><p class="r-lands" style="color:${readInk(ctx, c.hex)}">${A(c.lands)}</p></div>`).join('');
    const foot = `<div class="r-pf"><div><p class="r-ps__d">Paper</p><h2 class="r-dn">${A(p.name)}</h2><p class="r-role">${A(ctx.cap(p.role))}. <span class="num">${pc(p)}%</span> of a page. It takes no ink.</p><p class="r-lands">${A(p.lands)}</p></div><p class="disp r-pf__s">${A(textOf(p))}</p></div>`;
    const sheetOfPaper = `<div class="r-paper">${corners(ctx.roles.light.text)}<div class="r-stack" style="height:${stackH}px">${D.map(sheet).join('')}</div><div class="r-pns" style="padding:0 ${PAD}px;grid-template-columns:repeat(${n - 1},${step}px) minmax(0,1fr)">${notes}</div>${foot}</div>`;
    return page(ctx, 'palette', `<div class="r-top"><h1 class="r-h1">Palette</h1><p class="r-lead">${Word(n)} drums and the paper they print on. Each solid is sized by how much of a page its ink covers.</p></div><div class="r-body">${sheetOfPaper}</div>`);
  },

  // a tint chart: one printed sheet per drum, its name, drum number and values in the sheet's margin, its ten real ramp steps as a
  // stepped wedge of patches, each labelled with its step, the base step marked. The paper gets a blank sheet: it takes no ink.
  'colour-values'(ctx) {
    const D = drums(ctx), p = paper(ctx), steps = Object.keys(D[0].ramp), n = steps.length, L = ctx.roles.light;
    const patch = (c, k, i) => { const base = String(k) === String(c.rampBase), w = Math.round(46 + (54 * i) / Math.max(1, n - 1));
      // the step's label prints on the paper beside its patch, so every label reads at 4.5 : 1 whatever the tint
      return `<li class="r-wp ${base ? 'is-base' : ''}"><span class="r-wp__k num">${k}${base ? '<b>Base</b>' : ''}</span><i class="${isSurface(ctx, c.ramp[k]) ? 'r-hair' : ''}" style="width:calc((100% - 44px) * ${(w / 100).toFixed(3)});background:${c.ramp[k]}"></i></li>`; };
    const sheet = (c) => { const ink = readInk(ctx, c.hex);
      return `<li class="r-ts r-tc">${corners(c.hex)}<div class="r-tc__m" style="color:${ink}"><p class="r-ps__d">Drum ${drumNo(ctx, c)}</p><h2 class="r-tc__n">${A(c.name)}</h2><p class="r-role">${A(ctx.cap(c.role))}</p></div>`
        + `<ol class="r-wd">${steps.map((k, i) => patch(c, k, i)).join('')}</ol>${vals(c).replace('class="r-vals"', 'class="r-vals r-vals--st"')}</li>`; };
    const paperSheet = `<div class="r-ts r-tc r-tc--paper">${corners(L.text)}<div class="r-tc__m"><p class="r-ps__d">Paper</p><h2 class="r-tc__n">${A(p.name)}</h2><p class="r-role">${A(ctx.cap(p.role))}. Takes no ink, so it has no tints.</p></div>${vals(p)}</div>`;
    const tones = ctx.tones.map((t) => `<span class="r-tone"><i class="${isSurface(ctx, t.hex) ? 'r-hair' : ''}" style="background:${t.hex}"></i>${A(t.name)} <span class="r-mono">${A(t.hex)}</span></span>`).join('');
    const foot = `<div class="r-cvfoot"><h2 class="r-tg__h">Tones</h2><p class="r-tones">${tones}</p><p class="r-print">Values are for screens. Print can shift a colour, so ask your printer for a proof before a run, and match ${A(byRole(ctx, 'action').name)} to the proof. The ramp runs light to dark, and each colour sits at its base step. Every step is in the palette files in the brand kit.</p></div>`;
    return page(ctx, 'colour-values', `<div class="r-top"><h1 class="r-h1">Colour values</h1></div><div class="r-body r-body--cv"><ul class="r-tcs" style="grid-template-columns:repeat(${D.length},minmax(0,1fr))">${D.map(sheet).join('')}</ul>${paperSheet}${foot}</div>`);
  },

  // two-drum test prints: each used pair a sheet printed in just its two inks, a real line of the brand's copy in the text ink on the
  // ground ink, set at the smallest size the pair passes at, the ratio and use beneath as the job line. A sheet's size follows how much
  // its pair prints: by the share of the ground it prints on, then of its text colour. The most used pair runs the full width, then
  // two, then three to a row (widths by the ground's share), then the rest four to a row. Unused pairs are run-sheet lines.
  contrast(ctx) {
    const L = ctx.roles.light, share = (id) => ctx.byId[id].share || 0;
    const used = [...ctx.pairs].map((x, i) => [x, i]).sort((a, b) => share(b[0].bg) - share(a[0].bg) || share(b[0].fg) - share(a[0].fg) || a[1] - b[1]).map(([x]) => x);
    const rows = [];
    for (let i = 0, k = 1; i < used.length; i += k, k = Math.min(k + 1, 3)) rows.push(used.slice(i, i + k));
    const tierOf = (i) => { let n = 0; for (const [r, row] of rows.entries()) { if (i < n + row.length) return r; n += row.length; } return rows.length - 1; };
    const copy = printCopy(ctx, used, (i) => tierOf(i) >= 3), copyOf = (x) => copy[used.indexOf(x)];
    const sizeOf = (x) => x.minSize ?? 15;
    // the slot edition has no copy yet: past the lead sheet, a test print carries its pair's own names, so the job line needs only the use
    const slot = ctx.edition === 'slot', pairName = (x) => `${A(nameOf(ctx, x.fg))} on ${A(nameOf(ctx, x.bg))}`;
    // the crosses print in whichever of the pair's two inks shows on the paper
    const xInk = (x) => (ctx.ratio(x.fgHex, L.surface) >= ctx.ratio(x.bgHex, L.surface) ? x.fgHex : x.bgHex);
    const sheet = (x) => { const named = slot && used.indexOf(x) > 0;
      return `<li class="r-tp"><div class="r-tp__sh">${corners(xInk(x), 13)}<div class="r-tp__pr" style="background:${x.bgHex};color:${x.fgHex}"><p class="r-tp__c" style="font-size:${sizeOf(x)}px">${named ? pairName(x) : A(copyOf(x))}</p></div></div>`
        + `<p class="r-jb"><span class="r-jb__r num">${ratioText(x.ratioText)}</span> at <span class="num">${sizeOf(x)} px</span></p><p class="r-jb__u">${named ? '' : `${pairName(x)}. `}${A(x.use)}</p></li>`; };
    // the third row splits its width by the share of each ground, gently (a tone has none, so it takes the smallest share shown)
    const fr = (row) => { const s = row.map((x) => share(x.bg) ** 0.25), lo = Math.min(...s.filter((v) => v > 0), 1); return s.map((v) => `${(v || lo).toFixed(3)}fr`).join(' '); };
    const rowHtml = rows.map((row, r) => `<ol class="r-tr r-tr--${r}" style="grid-template-columns:${r === 2 ? fr(row) : `repeat(${Math.min(r + 1, 3)},minmax(0,1fr))`}">${row.map(sheet).join('')}</ol>`);
    const unused = ctx.unusedPairs.map((x) => `<li>${A(nameOf(ctx, x.fg))} on ${A(nameOf(ctx, x.bg))} <span class="num">${ratioText(x.ratioText)}</span>, never text</li>`).join('');
    const run = unused ? `<section class="r-run"><h2 class="r-tg__h">Not for text</h2><ul class="r-runl">${unused}</ul></section>` : '';
    return page(ctx, 'contrast', `<div class="r-top"><h1 class="r-h1">Contrast</h1><p class="r-lead">Every text pair ${A(ctx.brand.name)} uses, printed in its two inks, with its ratio. Text needs 4.5 : 1, and type 24 px and over needs 3 : 1.</p></div><div class="r-body r-body--ct">${rowHtml.join('')}${run}</div>`);
  },
};
