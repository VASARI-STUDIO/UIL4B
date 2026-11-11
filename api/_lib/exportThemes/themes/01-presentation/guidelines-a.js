// Guidelines pages for theme 01, run A: intro, personality, voice, write-this, messaging, logo, clear-space, min-size,
// logo-grounds, logo-misuse, palette, proportion, colour-values. Styles are in css-a.js (classes start a-). See guidelines.js for the split.
// Each page is one slide played full screen: edge-to-edge panels, one idea, the running head and folio laid over the first panel.
import { A } from './helpers.js';

const COLOUR_ID_OF_HEX = (ctx, hex) => ctx.colours.find((c) => c.hex.toLowerCase() === hex.toLowerCase());
// the brand's own colour name for a hex, or the hex when it is not a palette colour
const hexName = (ctx, hex) => COLOUR_ID_OF_HEX(ctx, hex)?.name || hex;
// the brand colour that plays a role (action, text, panel, ground), else the nth colour
const byRole = (ctx, role, n = 0) => ctx.colours.find((c) => c.role === role) || ctx.colours[n];
// whichever of the page's text and ground colours reads better on a hex
const inkOn = (ctx, hex) => { const t = ctx.roles.light.text, g = ctx.roles.light.surface; return ctx.ratio(t, hex) >= ctx.ratio(g, hex) ? t : g; };
const isGround = (ctx, hex) => hex.toLowerCase() === ctx.roles.light.surface.toLowerCase();
const sentences = (s) => s.split(/(?<=\.)\s+/);
// the cross that marks a wrong example
const CROSS = `<svg class="a-cross" viewBox="0 0 24 24" width="24" height="24" role="img" aria-label="Not allowed"><circle cx="12" cy="12" r="12" fill="currentColor"/><path d="M8 8l8 8M16 8l-8 8" stroke="var(--ground)" stroke-width="2" stroke-linecap="square" fill="none"/></svg>`;

// the slide: running head and folio sit over the first panel, so the page takes that panel's ground and ink.
// hdW narrows the head to the first panel's width when the page is split into panels; fo is the folio's colour when it lands on another panel.
const slide = (ctx, id, inner, o = {}) => {
  const p = ctx.pages.find((x) => x.id === id);
  const hs = o.hdW ? ` style="right:auto;width:${Math.floor(o.hdW)}px;flex-direction:column;gap:2px"` : '';
  const head = `<div class="hd"${hs}><span>${p.ref ? `<b class="num">${p.ref}</b>` : ''}${A(p.title)}</span><span>${A(ctx.brand.name)} brand guidelines</span></div>`;
  return `<section class="pg pg--a" data-page="${id}" style="background:${o.ground || 'var(--ground)'};color:${o.ink || 'var(--ink)'}">${head}${inner}<span class="fo"${o.fo ? ` style="color:${o.fo}"` : ''}>${ctx.pageNo(id)}</span></section>`;
};
// the panel grounds the theme uses: [background, text]
const PANEL = ['var(--panel)', 'var(--ink)'], SIGNAL = ['var(--accent)', 'var(--accent-ink)'], DARK = ['var(--dark)', 'var(--dark-ink)'], PAGE = ['var(--ground)', 'var(--ink)'];
const sty = ([bg, fg]) => `background:${bg};color:${fg}`;

export const guidelinesA = {
  intro(ctx) {
    const B = ctx.brand; const [first, ...rest] = sentences(B.description);
    const inner = `<div class="a-full a-intro"><h1 class="disp a-h1">${A(first)}</h1><div class="a-intro-foot"><p class="a-body">${A(rest.join(' '))}</p><div><h3 class="h3">What it does</h3><p class="lead">${A(B.product)}</p></div><div><h3 class="h3">Who it serves</h3><p class="lead">${A(B.audience)}</p></div></div></div>`;
    return slide(ctx, 'intro', inner, { ground: SIGNAL[0], ink: SIGNAL[1] });
  },

  personality(ctx) {
    const B = ctx.brand; const [l1, l2] = B.lines.others, n = B.personality.length;
    const grounds = [PANEL, SIGNAL, DARK];
    const traits = B.personality.map((t, i) => `<li style="${sty(grounds[i % 3])}"><p class="lead">${A(t.means)}</p><h2 class="disp a-trait">${A(t.trait)}</h2></li>`).join('');
    const inner = `<ul class="a-traits" style="grid-template-columns:repeat(${n},minmax(0,1fr))">${traits}</ul><div class="a-pband"><p class="lead">${["Zero", "One", "Two", "Three", "Four", "Five", "Six"][n] || n} traits shape how ${A(B.name)} sounds and behaves. Two lines say it in a breath.</p><p class="a-lines"><span>${A(l1)}</span><span>${A(l2)}</span></p></div>`;
    return slide(ctx, 'personality', inner, { ground: PANEL[0], ink: PANEL[1], hdW: 1280 / n - 112, fo: 'var(--ink)' });
  },

  voice(ctx) {
    const B = ctx.brand;
    const rows = B.voice.principles.map((p) => `<li><h3 class="a-pt">${A(p.title)}</h3><p class="a-ex">${A(p.example)}</p></li>`).join('');
    const inner = `<div class="a-full a-voice"><div><h1 class="disp a-h1 a-h1--xl">${A(B.lines.primary)}</h1><p class="lead a-vlead">Real times, short sentences, no exclamation marks. ${B.voice.principles.length} habits keep it so.</p></div><ul class="a-steps" style="grid-template-columns:repeat(${B.voice.principles.length},minmax(0,1fr))">${rows}</ul></div>`;
    return slide(ctx, 'voice', inner, { ground: DARK[0], ink: DARK[1] });
  },

  'write-this'(ctx) {
    const W = ctx.brand.voice.writeThis;
    const rows = W.map((r) => `<p class="a-w a-wl">${A(r.write)}</p><div class="a-wr"><p class="a-n">${A(r.not)}</p><p class="a-b">${A(r.because)}</p></div>`).join('');
    const inner = `<div class="a-full a-wt" style="grid-template-rows:188px repeat(${W.length},minmax(0,1fr)) 64px"><div class="a-wl a-wh"><h1 class="disp a-wtitle">Write this</h1><p class="lead">${W.length} lines as a rider would say them, beside the lines they replace.</p></div><div class="a-wr a-wh"><h2 class="disp a-wtitle">Not that</h2></div>${rows}<div class="a-wl"></div><div class="a-wr"></div></div>`;
    return slide(ctx, 'write-this', inner, { ground: DARK[0], ink: DARK[1], hdW: 640 - 112 });
  },

  messaging(ctx) {
    const B = ctx.brand, V = B.voice, all = [B.lines.primary, ...B.lines.others];
    const grounds = [SIGNAL, PANEL, PAGE];
    const lines = all.map((l, i) => `<p class="a-ml ${i === 2 ? 'hairline' : ''}" style="${sty(grounds[i % 3])}">${i === 0 ? '<span class="h3 a-mlab">Lines in use</span>' : ''}${A(l)}</p>`).join('');
    const inner = `<div class="a-full a-msg" style="grid-template-columns:3fr repeat(${all.length},minmax(0,1fr))"><div class="a-mname" style="${sty(DARK)}"><span class="disp a-nm">${A(B.name)}</span><span class="cap">As it appears in a sentence.</span></div>${lines}</div>
<div class="a-mrow"><div><h3 class="h3">Writing the name</h3><p class="lead">${A(V.nameRules)}</p></div><div><h3 class="h3">Short boilerplate</h3><p class="lead">${A(V.boilerplate25)}</p></div><div><h3 class="h3">Long boilerplate</h3><p class="lead">${A(V.boilerplate50)}</p></div></div>`;
    return slide(ctx, 'messaging', inner, { ground: DARK[0], ink: DARK[1], hdW: (1280 * 3) / (3 + all.length) - 112, fo: 'var(--ink)' });
  },

  logo(ctx) {
    const L = ctx.logo, B = ctx.brand, cw = B.logo.colourways.colour;
    const inner = `<div class="a-full a-lg">${L.html('colour', { width: 760, color: cw.name, label: 'Your logo goes here' })}</div><p class="lead a-bl">${A(B.logo.idea)}</p><p class="cap a-br"><b>${A(L.labels.colour)}</b>${A(B.logo.when.colour)}</p>`;
    return slide(ctx, 'logo', inner, { ground: cw.ground });
  },

  'clear-space'(ctx) {
    const L = ctx.logo, B = ctx.brand, g = L.geos.colour, lw = 880, s = lw / g.w, lh = g.h * s, X = L.geo.cap * s;
    const cw = B.logo.colourways.colour, share = L.clearShare;
    const zw = lw + 2 * X, zh = lh + 2 * X, r = (n) => n.toFixed(1);
    const dim = (cls, st) => `<i class="a-dim ${cls}" style="${st}"><b>x</b></i>`;
    const zone = `<div class="a-zone" style="width:${r(zw)}px;height:${r(zh)}px">
<span class="a-unit" style="left:0;top:0;width:${r(X)}px;height:${r(X)}px"></span><span class="a-unit" style="right:0;top:0;width:${r(X)}px;height:${r(X)}px"></span><span class="a-unit" style="left:0;bottom:0;width:${r(X)}px;height:${r(X)}px"></span><span class="a-unit" style="right:0;bottom:0;width:${r(X)}px;height:${r(X)}px"></span>
${dim('a-dim--v', `left:50%;top:0;height:${r(X)}px`)}${dim('a-dim--v', `left:50%;bottom:0;height:${r(X)}px`)}${dim('a-dim--h', `top:50%;left:0;width:${r(X)}px`)}${dim('a-dim--h', `top:50%;right:0;width:${r(X)}px`)}
<div class="a-zin" style="left:${r(X)}px;top:${r(X)}px;width:${r(lw)}px;height:${r(lh)}px">${L.html('colour', { width: lw, color: cw.name, label: 'Your logo goes here' })}</div></div>`;
    const unit = ctx.edition === 'slot' ? `x is ${share}% of the logo's height.` : `x is the height of the K, ${share}% of the logo's height.`;
    const inner = `<div class="a-full a-lg a-lg--zone">${zone}</div><div class="a-bl a-stack"><p class="lead">Keep a clear zone around the logo, x on every side. ${A(unit)}</p><p class="lead">Nothing enters the zone: no type, no edges, no other logos.</p></div><p class="cap a-br"><b>Clear space</b>Measured from the edge of the logo, all four sides.</p>`;
    return slide(ctx, 'clear-space', inner);
  },

  'min-size'(ctx) {
    const L = ctx.logo, m = L.minSize, cw = ctx.brand.logo.colourways.colour;
    const mmPx = (mm) => (mm * 96) / 25.4; // CSS px for a length in mm
    const half = (bg, intro, title, w, wText, hText, note) => `<figure class="a-half" style="${sty(bg)}"><p class="lead">${intro}</p><div class="a-mslogo">${L.html('colour', { width: w, color: cw.name, label: 'Logo' })}<i class="a-ruler" style="width:${w}px"></i></div><figcaption class="cap"><b>${title}: ${wText} wide</b>${hText} high. ${note}</figcaption></figure>`;
    const inner = `<div class="a-full a-halves">${half(PAGE, 'The logo never goes smaller than these widths.', 'Screen', m.screenPx, `${m.screenPx} px`, `${m.screenH} px`, 'The smallest it appears on a page or screen.')}${half(PANEL, 'Both are drawn at actual size: on screen at 1 px to the pixel, in print at true millimetres.', 'Print', mmPx(m.printMm), `${m.printMm} mm`, `${m.printH} mm`, 'The smallest it prints, on any paper.')}</div>`;
    return slide(ctx, 'min-size', inner, { hdW: 640 - 112 });
  },

  'logo-grounds'(ctx) {
    const L = ctx.logo, cw = ctx.brand.logo.colourways;
    const keys = ['colour', 'on-concrete', 'on-signal', 'reversed'];
    const ground = (key, w) => {
      const c = cw[key]; const same = c.name.toLowerCase() === c.kerb.toLowerCase();
      const desc = same ? `${hexName(ctx, c.name)} name and kerb` : `${hexName(ctx, c.name)} name, ${hexName(ctx, c.kerb)} kerb`;
      return `<figure class="a-gcell" style="background:${c.ground};color:${inkOn(ctx, c.ground)}"><div class="a-gart">${L.html('colour', { width: w, colourway: key, color: c.name, label: 'Logo' })}</div><figcaption class="cap"><b>On ${A(hexName(ctx, c.ground))}</b>${A(desc)}</figcaption></figure>`;
    };
    const ml = cw['mono-light'];
    const photo = `<figure class="a-gcell a-gcell--photo" style="${sty(DARK)}"><div class="a-gart a-gart--photo">${ctx.photo('evening', { cls: 'a-fillimg', pos: '20% 20%' })}<span class="a-onphoto">${L.html('mono-light', { width: 220, colourway: 'mono-light', color: ml.name, label: 'Logo' })}</span></div><figcaption class="cap"><b>On a photo</b>Mono light, on a quiet dark part of the picture.</figcaption></figure>`;
    const names = [...new Set(keys.map((k) => hexName(ctx, cw[k].ground)))];
    const lead = `The logo sits on ${names.slice(0, -1).join(', ')} and ${names.at(-1)}, each in its own colourway. On a photo it goes in mono light, on a quiet area. Keep it clear of faces and edges.`;
    const inner = `<p class="lead a-glead">${A(lead)}</p><div class="a-ggrid">${keys.map((k) => ground(k, 150)).join('')}${photo}</div>`;
    return slide(ctx, 'logo-grounds', inner);
  },

  'logo-misuse'(ctx) {
    const L = ctx.logo, B = ctx.brand, w = 190;
    const off = ctx.C.toOklch(byRole(ctx, 'action').hex); const wrong = ctx.C.fromOklch(Math.min(off.L, 0.42), off.C, (off.H + 180) % 360);
    const items = [
      ['Stretched', 'Never squash or stretch it. Scale it evenly.', `<div style="transform:scale(1.35,0.7)">${L.forMisuse(w)}</div>`],
      ['Recoloured', 'Never recolour it. Use a colourway from the versions page.', L.forMisuse(w, { fill: wrong })],
      ['Rotated', 'Never tilt or turn it. It sits level with the page.', `<div style="transform:rotate(-14deg)">${L.forMisuse(w)}</div>`],
      ['Effects', 'No shadows, glows or bevels.', `<div style="filter:drop-shadow(5px 6px 4px rgba(${ctx.C.hexToRgb(B.logo.colourways.colour.name).join(',')},0.55))">${L.forMisuse(w)}</div>`],
      ['Busy ground', 'Never on a busy photo. Use mono light on a quiet part of one.', null],
      ['Outlined or boxed', 'No outlines, no boxes, no frames around it.', `<div class="a-boxed">${L.forMisuse(w - 36)}</div>`],
    ];
    const tile = ([t, cap, html], i) => {
      const alt = (i + Math.floor(i / 3)) % 2 ? PAGE : PANEL;
      return `<figure class="a-mt ${alt === PAGE ? 'hairline' : ''}" style="${sty(alt)}"><figcaption class="cap"><b>${t}</b>${cap}</figcaption><div class="a-art ${html === null ? 'a-art--photo' : ''}">${html === null ? `${ctx.photo('riders', { cls: 'a-fillimg', pos: '50% 60%' })}<span class="a-onphoto a-onphoto--mid">${L.forMisuse(w)}</span>` : html}</div>${CROSS}</figure>`;
    };
    const inner = `<p class="lead a-glead">Six ways the logo goes wrong. Use the supplied files as they are, and none of these.</p><div class="a-mgrid">${items.map(tile).join('')}</div>`;
    return slide(ctx, 'logo-misuse', inner);
  },

  palette(ctx) {
    const cs = ctx.colours, action = byRole(ctx, 'action'), V = ctx.brand.voice.principles, sample = ctx.brand.type.sample;
    const onAction = ctx.pairs.filter((p) => p.bgHex === action.hex);
    const fgs = onAction.filter((p) => !p.large).map((p) => hexName(ctx, p.fgHex)), big = onAction.find((p) => p.large);
    const lead = `${cs.length} colours, each named for where it lands. ${action.name} is the one people see us by.${fgs.length ? ` ${fgs[0]} type goes on it${big ? `, and ${hexName(ctx, big.fgHex)} type only from ${big.minSize} px` : ''}.` : ''}`;
    const texts = [sample.headline, V[0].example, V[1].example, V[3].example];
    const tile = (c, i) => {
      const ink = inkOn(ctx, c.hex);
      const body = i === 0 ? `<span class="disp a-ptext">${A(texts[0])}</span>` : `<span class="a-ptext2">${A(texts[i % texts.length])}</span>`;
      return `<figure class="a-pt-tile ${i === 0 ? 'a-p0' : ''} ${isGround(ctx, c.hex) ? 'hairline' : ''}" style="background:${c.hex};color:${ink}">${body}<figcaption class="cap"><span class="disp a-pn">${A(c.name)}</span>${A(ctx.cap(c.role))}. ${A(c.lands)}</figcaption></figure>`;
    };
    const inner = `<p class="lead a-glead">${A(lead)}</p><div class="a-pal" style="grid-template-columns:2fr repeat(${cs.length - 1},minmax(0,1fr))">${cs.map(tile).join('')}</div>`;
    return slide(ctx, 'palette', inner, { fo: inkOn(ctx, cs[0].hex) });
  },

  proportion(ctx) {
    // order by share: biggest is the ground; the page is split by area, so every share is true to the percent. The slide is the page.
    const cs = [...ctx.colours].sort((a, b) => b.share - a.share), pc = (c) => Math.round(c.share * 100);
    const [g, p, ...rest] = cs; // ground, panel, then the rest side by side
    const total = cs.reduce((s, c) => s + c.share, 0);
    const col2 = 1 - g.share / total; // width of the right column as a share of the page
    const pH = p.share / total / col2, restH = 1 - pH; // heights in the right column
    const restW = rest.reduce((s, c) => s + c.share, 0);
    const label = (c, big) => `<span class="a-pcl"><span class="disp a-pctn ${big ? 'a-pctn--xl' : ''}">${pc(c)}%</span><span class="a-pcn">${A(c.name)}</span></span>`;
    const block = (c, cls = '', extra = '') => `<div class="a-pb ${cls}" style="background:${c.hex};color:${inkOn(ctx, c.hex)}">${extra}${label(c, cls === 'a-pgb')}</div>`;
    const lead = `Most of every page is ${g.name}. ${p.name} holds the quiet work, and ${rest.map((c) => c.name).join(' and ')} take ${rest.every((c) => pc(c) === pc(rest[0])) ? `${pc(rest[0])} per cent each` : rest.map((c) => `${pc(c)} per cent`).join(' and ')} so they stay the loudest things on the page.`;
    const gtxt = `<div class="a-pgtxt"><p class="lead">${A(lead)}</p><p class="cap"><b>One page, drawn to scale</b>Each colour's area is its share of the page.</p></div>`;
    const page = `<div class="a-full a-pg" style="grid-template-columns:${(g.share / total * 100).toFixed(2)}fr ${(col2 * 100).toFixed(2)}fr">${block(g, 'a-pgb', gtxt)}<div class="a-pgcol" style="grid-template-rows:${(pH * 100).toFixed(2)}fr ${(restH * 100).toFixed(2)}fr">${block(p)}<div class="a-pgrow" style="grid-template-columns:${rest.map((c) => (c.share / restW * 100).toFixed(2) + 'fr').join(' ')}">${rest.map((c) => block(c)).join('')}</div></div></div>`;
    return slide(ctx, 'proportion', page, { ground: g.hex, ink: inkOn(ctx, g.hex), hdW: (1280 * g.share) / total - 112 });
  },

  'colour-values'(ctx) {
    const steps = Object.keys(ctx.colours[0].ramp), surface = ctx.roles.light.surface.toLowerCase();
    const mono = (s) => `<dd class="a-mono">${A(s)}</dd>`;
    const colour = (c) => {
      const ink = inkOn(ctx, c.hex);
      const strip = c.rampBase === 50 ? `<span class="a-vnote">The ground. No tints.</span>` : `<span class="a-vramp">${steps.map((k) => `<i class="a-chip ${+k === c.rampBase ? 'a-chip--base' : ''}" style="background:${c.ramp[k]}"><em class="num">${k}</em></i>`).join('')}</span>`;
      return `<div class="a-vcell ${isGround(ctx, c.hex) ? 'hairline' : ''}" style="background:${c.hex};color:${ink};--ci:${ink}">${strip}<b class="disp a-vn">${A(c.name)}</b><dl class="a-vv"><dt>HEX</dt>${mono(c.hex)}<dt>RGB</dt>${mono(c.rgb.replace(/R(\d+) G(\d+) B(\d+)/, 'R $1  G $2  B $3'))}<dt>OKLCH</dt>${mono(c.oklch)}</dl></div>`;
    };
    const tones = ctx.tones.map((t) => `<li><i class="a-sw ${isGround(ctx, t.hex) ? 'hairline' : ''}" style="background:${t.hex}"></i><span><b>${A(t.name)}</b><span class="a-mono">${A(t.hex)}</span></span></li>`).join('');
    const note = `<div class="a-vcell a-vcell--note"><p class="lead">Values are for screens. Print can shift a colour, so ask your printer for a proof before a run, and match ${A(byRole(ctx, 'action').name)} to the proof. Every ramp step is in the palette files in the brand kit. The bar under a step marks the colour itself.</p></div>`;
    const toneCell = `<div class="a-vcell a-vcell--tones" style="${sty(PANEL)}"><h3 class="h3">Tones</h3><ul class="a-tones">${tones}</ul></div>`;
    const cells = [note, ...ctx.colours.map(colour), toneCell], cols = Math.ceil(cells.length / 2);
    const under = ctx.colours[cols - 1]; // the cell the folio lands on: first of the second row
    const inner = `<div class="a-full a-vgrid" style="grid-template-columns:repeat(${cols},minmax(0,1fr))">${cells.join('')}</div>`;
    return slide(ctx, 'colour-values', inner, { hdW: 1280 / cols - 112, fo: under ? inkOn(ctx, under.hex) : 'var(--ink)' });
  },
};
