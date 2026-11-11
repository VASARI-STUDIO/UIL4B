// Run A's guideline pages for theme 03 (Broadsheet): intro, personality, voice, write-this, messaging, logo, clear-space, min-size,
// logo-grounds, logo-misuse, palette, proportion, colour-values. Each page is a newspaper page: a lead story, sidebar briefs, ruled columns.
// Colour is the markets page (a dense ruled listing, a price-table strip per ramp); the logo is the nameplate, its misuse a corrections column.
// Styles are in css-a.js (classes start a-). Helpers are in helpers.js.
import { A, std } from './helpers.js';

const sameHex = (a, b) => a.toLowerCase() === b.toLowerCase();
// the brand's own name for a hex, or the hex itself when it is not a palette colour or tone
const hexName = (ctx, hex) => [...ctx.colours, ...ctx.tones].find((c) => sameHex(c.hex, hex))?.name || hex;
// the brand colour that plays a role, else the nth colour
const byRole = (ctx, role, n = 0) => ctx.colours.find((c) => c.role === role) || ctx.colours[n];
const isGround = (ctx, hex) => sameHex(hex, ctx.roles.light.surface);
// text colour for a field: the brand's own listed pair for that ground, else whichever of text and surface reads better
const inkFor = (ctx, hex) => {
  const p = ctx.pairs.find((x) => sameHex(x.bgHex, hex) && !x.large);
  if (p) return p.fgHex;
  const t = ctx.roles.light.text, g = ctx.roles.light.surface;
  return ctx.ratio(t, hex) >= ctx.ratio(g, hex) ? t : g;
};
const sentences = (s) => s.split(/(?<=\.)\s+/);
const words = (s) => s.split(/\s+/).filter(Boolean).length;
const spell = (n) => ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight'][n] || String(n);
// a photo or an art-directed slot in a figure; a real photo gets its alt text as a caption (a slot already prints its brief)
const fig = (ctx, id, { cls = '', pos } = {}) => {
  const s = ctx.shot(id);
  return `<figure class="a-ph ${cls}">${ctx.photo(id, { pos })}${s.photo ? `<figcaption class="cap">${A(s.alt)}</figcaption>` : ''}</figure>`;
};
// the cross that marks a wrong example
const CROSS = `<svg class="a-cross" viewBox="0 0 24 24" width="24" height="24" role="img" aria-label="Not allowed"><circle cx="12" cy="12" r="12" fill="currentColor"/><path d="M8 8l8 8M16 8l-8 8" stroke="var(--ground)" stroke-width="2" stroke-linecap="square" fill="none"/></svg>`;
// the mark colour key in a colourway (the one that is neither the name nor the ground)
const markKey = (cw) => Object.keys(cw).find((k) => k !== 'name' && k !== 'ground');
const hl = (s) => A(s).replace(/\S+-\S+/g, '<span class="a-nb">$&</span>');

export const guidelinesA = {
  // the front page: the photo down the left, the lead story in the middle, two briefs in the right column
  intro(ctx) {
    const B = ctx.brand, [first, ...rest] = sentences(B.description);
    const inner = `<div class="body a-rules a-intro">${fig(ctx, 'chalkboard', { pos: '50% 50%' })}
<div class="a-story"><h1 class="disp a-h1">${hl(first)}</h1><p class="lead">${A(rest.join(' '))}</p>
<div class="a-dbl a-rules a-briefs"><div><h2 class="h2">What it does</h2><p class="lead">${A(B.product)}</p></div><div><h2 class="h2">Who it serves</h2><p class="lead">${A(B.audience)}</p></div></div></div></div>`;
    return std(ctx, 'intro', inner);
  },

  // the first trait is the lead story, the others run beside it at a lower headline size; the two lines close the page under a double rule
  personality(ctx) {
    const B = ctx.brand, [l1, l2] = B.lines.others;
    const traits = B.personality.map((t, i) => `<li class="${i ? 'a-trait--sub' : 'a-trait--lead'}"><h2 class="disp a-trait">${A(t.trait)}</h2><p class="${i ? 'a-sub' : 'lead'}">${A(t.means)}</p></li>`).join('');
    const inner = `<div class="body a-pers"><p class="lead a-pers-lead">${spell(B.personality.length)} traits shape how ${A(B.name)} sounds and behaves. Two lines say it in a breath.</p>
<ul class="a-rules a-traits">${traits}</ul>
<div class="a-dbl a-rules a-two"><p class="disp a-line">${A(l1)}</p><p class="disp a-line">${A(l2)}</p></div></div>`;
    return std(ctx, 'personality', inner);
  },

  // the primary line as the banner headline, the habits as four columns under it, each a heading and a line in the display face
  voice(ctx) {
    const B = ctx.brand, P = B.voice.principles;
    const stack = sentences(B.lines.primary).map((s) => `<span>${A(s)}</span>`).join('');
    const cols = P.map((p) => `<li><h2 class="a-pt">${A(p.title)}</h2><p class="disp a-ex">${A(p.example)}</p></li>`).join('');
    const inner = `<div class="body a-voice"><div class="a-banner"><h1 class="disp a-h1 a-h1--stack">${stack}</h1><p class="lead">Short sentences, real prices, no exclamation marks. ${spell(P.length)} habits keep it so.</p></div><ul class="a-dbl a-rules a-habits" style="grid-template-columns:repeat(${P.length},minmax(0,1fr))">${cols}</ul></div>`;
    return std(ctx, 'voice', inner);
  },

  // the classifieds: six ruled cells, the lead sentence in the first, then each write-this line with the line it replaces struck through
  'write-this'(ctx) {
    const W = ctx.brand.voice.writeThis;
    const rows = W.map((r) => `<li><span class="a-lbl">Write this</span><p class="disp a-w">${A(r.write)}</p><p class="a-n"><span class="a-lbl">Not that</span><s>${A(r.not)}</s></p><p class="a-b"><span class="a-lbl">Because</span>${A(r.because)}</p></li>`).join('');
    const inner = `<div class="body a-wt"><ul class="a-ads"><li class="a-ads-lead"><p class="disp a-h1 a-h1--sm">${A(`${spell(W.length)} lines as the counter would say them, beside the lines they replace.`)}</p></li>${rows}</ul></div>`;
    return std(ctx, 'write-this', inner);
  },

  // the name as a banner headline over four columns: the name rule, the other lines, the two boilerplates
  messaging(ctx) {
    const B = ctx.brand, V = B.voice, [first, ...others] = [B.lines.primary, ...B.lines.others];
    const lines = others.map((l) => `<li>${A(l)}</li>`).join('');
    const inner = `<div class="body a-msg"><div class="a-msg-top"><span class="disp a-nm">${A(B.name)}</span><p class="disp a-first">${A(first)}</p></div>
<div class="a-dbl a-rules a-msg-cols"><div><h2 class="h2">Writing the name</h2><p class="lead">${A(V.nameRules)}</p></div>
<div><h2 class="h2">Lines in use</h2><ul class="a-linelist">${lines}</ul></div>
<div><h2 class="h2">Short boilerplate</h2><p class="cap">${words(V.boilerplate25)} words</p><p class="a-bpt">${A(V.boilerplate25)}</p></div>
<div><h2 class="h2">Long boilerplate</h2><p class="cap">${words(V.boilerplate50)} words</p><p class="a-bpt">${A(V.boilerplate50)}</p></div></div></div>`;
    return std(ctx, 'messaging', inner);
  },

  // the logo is the nameplate across the full measure between double rules, the idea set in the columns under it
  logo(ctx) {
    const L = ctx.logo, B = ctx.brand, cw = B.logo.colourways.colour, [s1, ...s2] = sentences(B.logo.idea);
    const inner = `<div class="body a-logo"><figure class="a-np"><div class="a-np-in" style="background:${cw.ground}">${L.html('colour', { width: 880, color: cw.name, label: 'Your logo goes here' })}</div></figure>
<div class="a-rules a-three"><p class="cap"><b>${A(L.labels.colour)}</b>${A(B.logo.when.colour)}</p><p class="lead">${A(s1)}</p><p class="lead">${A(s2.join(' '))}</p></div></div>`;
    return std(ctx, 'logo', inner);
  },

  // a headline over the diagram, the rules of the zone in a column beside it
  'clear-space'(ctx) {
    const L = ctx.logo, B = ctx.brand, g = L.geos.colour, lw = 620, s = lw / g.w, lh = g.h * s, X = L.geo.cap * s;
    const cw = B.logo.colourways.colour, share = L.clearShare;
    const zw = lw + 2 * X, zh = lh + 2 * X, r = (n) => n.toFixed(1);
    const dim = (cls, st) => `<i class="a-dim ${cls}" style="${st}"><b>x</b></i>`;
    const unit = (st) => `<span class="a-unit" style="${st};width:${r(X)}px;height:${r(X)}px"></span>`;
    const zone = `<div class="a-zone" style="width:${r(zw)}px;height:${r(zh)}px">${unit('left:0;top:0')}${unit('right:0;top:0')}${unit('left:0;bottom:0')}${unit('right:0;bottom:0')}
${dim('a-dim--v', `left:50%;top:0;height:${r(X)}px`)}${dim('a-dim--v', `left:50%;bottom:0;height:${r(X)}px`)}${dim('a-dim--h', `top:50%;left:0;width:${r(X)}px`)}${dim('a-dim--h', `top:50%;right:0;width:${r(X)}px`)}
<div class="a-zin" style="left:${r(X)}px;top:${r(X)}px;width:${r(lw)}px;height:${r(lh)}px">${L.html('colour', { width: lw, color: cw.name, label: 'Your logo goes here' })}</div></div>`;
    const what = ctx.edition === 'slot' ? `x is ${share}% of the logo's height.` : `x is the height of the name's capitals, ${share}% of the logo's height.`;
    const inner = `<div class="body a-diagram"><h1 class="disp a-h1 a-h1--md">Keep a clear zone around the logo, x on every side.</h1>
<div class="a-rules a-dg-cols"><figure class="a-stage-wrap"><div class="a-stage">${zone}</div></figure><div class="a-stack"><p class="lead">${A(what)}</p><p class="lead">Nothing enters the zone: no type, no edges, no other logos.</p><p class="cap"><b>Clear space</b>Measured from the edge of the logo, all four sides.</p></div></div></div>`;
    return std(ctx, 'clear-space', inner);
  },

  // a headline over two actual-size columns, screen and print, each between a heavy rule and a hairline
  'min-size'(ctx) {
    const L = ctx.logo, m = L.minSize, cw = ctx.brand.logo.colourways.colour;
    const mmPx = (mm) => (mm * 96) / 25.4; // CSS px for a length in mm
    const panel = (title, w, wText, hText, note) => `<figure class="a-ms"><div class="a-msbox"><div class="a-mslogo">${L.html('colour', { width: w, color: cw.name, label: 'Logo' })}<i class="a-ruler" style="width:${w}px"></i></div></div><figcaption class="cap"><b>${title}: ${wText} wide</b>${hText} high. ${note}</figcaption></figure>`;
    const inner = `<div class="body a-diagram a-diagram--ms"><div class="a-ms-top"><h1 class="disp a-h1 a-h1--md">The logo never goes smaller than these widths.</h1><p class="lead">Both are drawn at actual size: on screen at 1 px to the pixel, in print at true millimetres.</p></div>
<div class="a-ms2 a-rules">${panel('Screen', m.screenPx, `${m.screenPx} px`, `${m.screenH} px`, 'The smallest it appears on a page or screen.')}${panel('Print', mmPx(m.printMm), `${m.printMm} mm`, `${m.printH} mm`, 'The smallest it prints, on any paper.')}</div></div>`;
    return std(ctx, 'min-size', inner);
  },

  // the grounds as four ruled bands, each with its caption beside it; the photo runs down the right column
  'logo-grounds'(ctx) {
    const L = ctx.logo, cw = ctx.brand.logo.colourways;
    const keys = ['colour', ...Object.keys(cw).filter((k) => k.startsWith('on-')), 'reversed'];
    const ground = (key) => {
      const c = cw[key], mk = markKey(cw[key]), same = !mk || sameHex(c.name, c[mk]);
      const desc = same ? `${hexName(ctx, c.name)} name and mark` : `${hexName(ctx, c.name)} name, ${hexName(ctx, c[mk])} mark`;
      return `<li><div class="a-gt ${isGround(ctx, c.ground) ? 'hairline' : ''}" style="background:${c.ground}">${L.html('colour', { width: 150, colourway: key, color: c.name, label: 'Logo' })}</div><p class="cap"><b>On ${A(hexName(ctx, c.ground))}</b>${A(desc)}</p></li>`;
    };
    const ml = cw['mono-light'];
    const photo = `<figure class="a-gphoto"><div class="a-gt a-gt--photo">${ctx.photo('grower', { cls: 'a-dark' })}<span class="a-onphoto">${L.html('mono-light', { width: 200, colourway: 'mono-light', color: ml.name, label: 'Logo' })}</span></div><figcaption class="cap"><b>On a photo</b>Mono light, on a quiet dark part of the picture, clear of faces and edges.</figcaption></figure>`;
    const names = [...new Set(keys.map((k) => hexName(ctx, cw[k].ground)))];
    const inner = `<div class="body a-diagram a-diagram--gr"><div class="a-ms-top"><h1 class="disp a-h1 a-h1--md">${A(`The logo sits on ${names.slice(0, -1).join(', ')} and ${names.at(-1)}, each in its own colourway.`)}</h1><p class="lead">On a photo it goes in mono light.</p></div>
<div class="a-rules a-gs"><ul class="a-bands">${keys.map(ground).join('')}</ul>${photo}</div></div>`;
    return std(ctx, 'logo-grounds', inner);
  },

  // the don'ts as corrections: a headline on the left, then a column boxed out by rules, six items each a specimen and its correction
  'logo-misuse'(ctx) {
    const L = ctx.logo, B = ctx.brand, w = 136;
    const off = ctx.C.toOklch(byRole(ctx, 'action').hex); const wrong = ctx.C.fromOklch(Math.min(off.L, 0.42), off.C, (off.H + 180) % 360);
    // a ground of loose blocks in the brand's own colours: busy enough that no colourway reads on it
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const cols = ctx.colours.map((c) => c.hex);
    const blocks = Array.from({ length: 46 }, () => `<rect x="${(rnd() * 250 - 20).toFixed(0)}" y="${(rnd() * 220 - 20).toFixed(0)}" width="${(14 + rnd() * 50).toFixed(0)}" height="${(14 + rnd() * 50).toFixed(0)}" fill="${cols[Math.floor(rnd() * cols.length)]}"/>`).join('');
    const busy = `<svg class="a-busy" viewBox="0 0 230 190" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${blocks}</svg><span class="a-onphoto a-onphoto--mid">${L.forMisuse(w - 20)}</span>`;
    const items = [
      ['Stretched', 'Never squash or stretch it. Scale it evenly.', `<div style="transform:scale(1.3,0.7)">${L.forMisuse(w)}</div>`],
      ['Recoloured', 'Never recolour it. Use a colourway from the versions page.', L.forMisuse(w, { fill: wrong })],
      ['Rotated', 'Never tilt or turn it. It sits level with the page.', `<div style="transform:rotate(-14deg)">${L.forMisuse(w)}</div>`],
      ['Effects', 'No shadows, glows or bevels.', `<div style="filter:drop-shadow(5px 6px 4px rgba(${ctx.C.hexToRgb(B.logo.colourways.colour.name).join(',')},0.55))">${L.forMisuse(w)}</div>`],
      ['Busy ground', 'Never on a busy picture. Use mono light on a quiet part of a photo.', null],
      ['Outlined or boxed', 'No outlines, no boxes, no frames around it.', `<div class="a-boxed">${L.forMisuse(w - 40)}</div>`],
    ];
    const item = ([t, cap, html]) => `<li><div class="a-mt ${html === null ? 'a-mt--busy' : ''}">${html === null ? busy : html}${CROSS}</div><p class="a-corr"><b>Correction: ${t}.</b>${cap}</p></li>`;
    const inner = `<div class="body a-corrs"><div class="a-corr-l"><h1 class="disp a-h1 a-h1--md">Six ways the logo goes wrong.</h1><p class="lead">Use the supplied files as they are, and none of these.</p></div><ul class="a-corr-col">${items.map(item).join('')}</ul></div>`;
    return std(ctx, 'logo-misuse', inner);
  },

  // the front page of colour: the action colour is the lead story with one large swatch for its photo, the others run down a sidebar as briefs
  palette(ctx) {
    const cs = ctx.colours, B = ctx.brand, V = B.voice.principles, S = B.ui.screen;
    const action = byRole(ctx, 'action');
    const sample = { ground: B.type.sample.headline, text: B.lines.others[0], action: S.content.form.book, mark: S.title };
    const field = (c, i, cls) => {
      const txt = sample[c.role] || V[i % V.length].example, big = c.role === 'ground';
      return `<div class="a-pt-tile ${cls} ${isGround(ctx, c.hex) ? 'hairline' : ''}" style="background:${c.hex};color:${inkFor(ctx, c.hex)}"><span class="a-pn">${A(c.name)}</span><span class="${big ? 'disp a-ptext' : 'a-ptext2'}">${A(txt)}</span></div>`;
    };
    const cap = (c) => `<p class="cap"><b>${A(c.name)}</b>${A(ctx.cap(c.role))}. ${A(c.lands)}</p>`;
    const lead = cs.indexOf(action);
    const side = cs.map((c, i) => [c, i]).filter(([c]) => c !== action).map(([c, i]) => `<li>${field(c, i, 'a-pt-tile--brief')}${cap(c)}</li>`).join('');
    const inner = `<div class="body a-rules a-pal"><article class="a-pal-lead"><h1 class="disp a-h1 a-h1--md">${A(action.name)} is the one people see us by.</h1><p class="lead">${A(`${spell(cs.length)} colours, each named for where it lands.`)}</p>
<figure>${field(action, lead, 'a-pt-tile--lead')}${cap(action)}</figure></article><ul class="a-sidebar">${side}</ul></div>`;
    return std(ctx, 'palette', inner);
  },

  // one page drawn to scale; a headline over the story, the figure, and a share table with a bar for each colour
  proportion(ctx) {
    const cs = [...ctx.colours].sort((a, b) => b.share - a.share), pc = (c) => Math.round(c.share * 100);
    const [g, p, ...rest] = cs; // ground, then the next-biggest, then the rest side by side
    const total = cs.reduce((s, c) => s + c.share, 0);
    const col2 = 1 - g.share / total; // width of the right column as a share of the page
    const pH = p.share / total / col2, restH = 1 - pH; // heights in the right column
    const restW = rest.reduce((s, c) => s + c.share, 0);
    const block = (c) => `<div style="background:${c.hex}"></div>`;
    const page = `<div class="a-pg" style="grid-template-columns:${(g.share / total * 100).toFixed(2)}fr ${(col2 * 100).toFixed(2)}fr"><div style="background:${g.hex}"></div><div class="a-pgcol" style="grid-template-rows:${(pH * 100).toFixed(2)}fr ${(restH * 100).toFixed(2)}fr">${block(p)}<div class="a-pgrow" style="grid-template-columns:${rest.map((c) => (c.share / restW * 100).toFixed(2) + 'fr').join(' ')}">${rest.map(block).join('')}</div></div></div>`;
    const list = cs.map((c) => `<li><span class="a-sw ${isGround(ctx, c.hex) ? 'hairline' : ''}" style="background:${c.hex}"></span><span class="a-pcn">${A(c.name)}</span><span class="disp a-pct num">${pc(c)}%</span><i class="a-bar ${isGround(ctx, c.hex) ? 'hairline' : ''}" style="width:${(c.share / g.share * 100).toFixed(1)}%;background:${c.hex}"></i></li>`).join('');
    const same = rest.every((c) => pc(c) === pc(rest[0]));
    const lead = `Most of every page is ${g.name}. ${p.name} holds the quiet work, and ${rest.map((c) => c.name).join(' and ')} take ${same ? `${pc(rest[0])} per cent each` : rest.map((c) => `${pc(c)} per cent`).join(' and ')}, so they stay the loudest things on the page.`;
    const [l1, ...l2] = sentences(lead);
    const inner = `<div class="body a-prop"><h1 class="disp a-h1 a-h1--md">${A(l1)}</h1><div class="a-rules a-prop-cols"><figure>${page}<figcaption class="cap"><b>One page, drawn to scale</b>Each colour's area is its share of the page.</figcaption></figure><div class="a-prop-side"><p class="lead">${A(l2.join(' '))}</p><ul class="a-plist">${list}</ul></div></div></div>`;
    return std(ctx, 'proportion', inner);
  },

  // the markets page: a dense ruled listing with a price-table strip under each colour, and a sidebar story with the tones
  'colour-values'(ctx) {
    const steps = Object.keys(ctx.colours[0].ramp);
    const sq = (hex) => `<i class="a-sq ${isGround(ctx, hex) ? 'hairline' : ''}" style="background:${hex}"></i>`;
    const head = `<div class="a-mrow a-mhead"><span>Colour</span><span>HEX</span><span>RGB</span><span>OKLCH</span><span>Use</span></div>`;
    const strip = (c) => c.rampBase === 50
      ? `<div class="a-mnote">The ground. No tints.</div>`
      : `<div class="a-mramp">${steps.map((k) => `<div class="a-mstep ${+k === c.rampBase ? 'a-mstep--base' : ''}"><em class="num">${k}</em><i class="a-chip ${isGround(ctx, c.ramp[k]) ? 'hairline' : ''}" style="background:${c.ramp[k]}"></i><span class="a-mono num">${A(c.ramp[k])}</span></div>`).join('')}</div>`;
    const row = (c) => `<div class="a-mblock"><div class="a-mrow"><span class="a-vname">${sq(c.hex)}<b>${A(c.name)}</b></span><span class="a-mono">${A(c.hex)}</span><span class="a-mono">${A(c.rgb.replace(/R(\d+) G(\d+) B(\d+)/, 'R $1 G $2 B $3'))}</span><span class="a-mono">${A(c.oklch)}</span><span class="a-muse">${A(c.lands)}</span></div>${strip(c)}</div>`;
    const tones = ctx.tones.map((t) => `<li>${sq(t.hex)}<b>${A(t.name)}</b><span class="a-mono">${A(t.hex)}</span></li>`).join('');
    const [s1, ...s2] = sentences(`Values are for screens. Print can shift a colour, so ask your printer for a proof before a run, and match ${byRole(ctx, 'action').name} to the proof. Every ramp step is in the palette files in the brand kit. The bar under a step marks the colour itself.`);
    const inner = `<div class="body a-rules a-vals"><div class="a-market">${head}${ctx.colours.map(row).join('')}</div>
<div class="a-vside"><h2 class="disp a-h1 a-h1--sm">${A(s1)}</h2><p class="a-vtext">${A(s2.join(' '))}</p><div><h2 class="h2">Tones</h2><ul class="a-tones">${tones}</ul></div></div></div>`;
    return std(ctx, 'colour-values', inner);
  },
};
