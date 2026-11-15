// Theme 31, Contact sheet: lane bk, the HTML brand book (brandBook and bookCss). The book is one contact sheet read by scrolling.
// Each of the nine sections opens with a strip of six frames cut from the roll, one of them circled in grease pencil; under the strip hangs
// the enlargement of the circled frame, and the caption column (the frame's number, what it shows, then the section's heading and words)
// sits under the last two gates, as on the guidelines pages. The long read runs on in the same frame grid, all of it in container units of
// one gate (14.957cqw wide), so the text lines up with the film at every width. Narrow screens stack each strip's two halves, as a contact
// sheet stacks its strips. Light mode is the paper the sheet is printed on (roles.light), dark mode the darkroom (roles.dark); the film is film in both.
// Colours come from ctx roles and brand data; no brand colour id, hex or name is written here.
import { A, tokens, palette, cwOn, rollOf, frameLabel, loopPath } from './helpers.js';
import { renderUrl, fillBox, photoScene, photoShot, SCENE } from './arts.js';
import { BOOK_SECTIONS } from '../../engine/book.js';

const r2 = (n) => Math.round(n * 100) / 100;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const titleOf = (id) => BOOK_SECTIONS.find((s) => s.id === id).title;
const isSlot = (ctx) => ctx.edition === 'slot';
const pad2 = (n) => String(n).padStart(2, '0');

// ---- frames ------------------------------------------------------------------------------------------------------------------
// A render cropped by the 3:2 gate: object-fit cover, placed so the first surface's centroid sits as near the middle as the picture allows,
// then the bracket crop (v1 1.10, v2 1.22) scaled about that centroid. The numbers are shares of the box, so the crop holds at any size.
function sceneImg(ctx, setup, v, alt) {
  const S = ctx.sceneInfo(SCENE[setup] || setup), q = S.quads[0].corners;
  const cx = q.reduce((s, p) => s + p[0], 0) / q.length / S.w, cy = q.reduce((s, p) => s + p[1], 0) / q.length / S.h;
  const r = S.w / S.h / 1.5, z = [1, 1.10, 1.22][v] || 1;
  let pos = '50% 50%', ox = cx, oy = cy;
  if (r > 1 + 1e-6) { const p = clamp01((0.5 - cx * r) / (1 - r)); pos = `${r2(p * 100)}% 50%`; ox = (1 - r) * p + cx * r; }
  else if (r < 1 - 1e-6) { const k = 1 / r, p = clamp01((0.5 - cy * k) / (1 - k)); pos = `50% ${r2(p * 100)}%`; oy = (1 - k) * p + cy * k; }
  const tf = z > 1 ? `transform:scale(${z});transform-origin:${r2(clamp01(ox) * 100)}% ${r2(clamp01(oy) * 100)}%;` : '';
  return `<span class="ct-img ct-plate" style="${tf}">${fillBox(renderUrl(ctx, setup), S, pos, alt)}</span>`;
}
// an unexposed frame: the gate's edge on plain film, with what it holds written in the edge print
const blank = (label, more = '') => `<div class="ct-slot"><span class="ct-edge">${A(label)}</span>${more}</div>`;
// the brand's k-th photograph (or the labelled frame in the slot edition, or when the brand has none)
function photoImg(ctx, k, v) {
  const s = photoShot(ctx, k);
  if (!s) return blank('Your photo');
  const sc = photoScene(ctx, s);
  if (sc) return sceneImg(ctx, sc, v, s.alt);
  const z = [1, 1.10, 1.22][v] || 1;
  return ctx.photo(s.id, { cls: 'ct-img', style: z > 1 ? `transform:scale(${z})` : '' });
}
// one frame of the roll: [setup, k, v] from rollOf, or a setup name and crop
function frameInner(ctx, spec, alt = '') {
  const [setup, k, v] = spec;
  return setup === 'photo' ? photoImg(ctx, k, v || 0) : sceneImg(ctx, setup, k || 0, alt);
}

// what the circled frame shows (the g1 caption, by setup): the theme names the setup, the brand fills the words
function frameCap(ctx, spec, noCredit = false) {
  const B = ctx.brand, P = palette(ctx), title = B.ui && B.ui.screen ? B.ui.screen.title : B.name;
  if (spec[0] === 'photo') {
    const s = photoShot(ctx, spec[1]);
    return s ? { title: s.caption || s.slot || s.alt, text: s.credit && !s.generated && !noCredit ? `Photo: ${s.credit}.` : '' } : { title: 'Your photograph', text: 'The frame the book circles is your own photograph, as shot, in the daylight you work in.' };
  }
  const posterNote = B.applications.signage.includes(B.lines.primary) ? B.applications.signage : `The primary line at poster size, on ${P.dark.name}.`;
  return ({
    poster: { title: 'Poster in a black frame, studio corner', text: posterNote },
    night: { title: 'Poster on brick, at night', text: `The line at poster size, on ${P.action.name}.` },
    sheets: { title: 'Three sheets, gallery wall', text: `The three lines at A1, on ${P.dark.name}, ${P.light.name} and ${P.action.name}.` },
    app: { title: 'Phone on travertine', text: `${title}, in the app's dark theme.` },
    laptop: { title: 'Laptop on a night desk', text: `${title} at desktop width, in the dark theme.` },
    book: { title: 'Portfolio book, in hand', text: `The stacked logo on ${(P.panel || P.dark).name} cloth.` },
    tote: { title: 'Print bag on the studio hook', text: `The stacked logo on ${P.dark.name} canvas.` },
    card: { title: 'Cards on the box-office sill', text: `The front on ${P.dark.name}, the back on ${P.light.name}.` },
    letter: { title: 'Print order letter on linen', text: `${B.fonts.body.family} for the letter, ${B.fonts.display.family} for the one line that matters.` },
    lightbox: { title: 'The studio sheet under the loupe', text: `A4 landscape on ${P.light.name}.` },
  })[spec[0]] || { title: titleOf('overview'), text: '' };
}

// ---- the strip ---------------------------------------------------------------------------------------------------------------
// frames: six { no, inner } (inner null: the leader, plain film with no gate). The third is circled. The strip is two halves of three, flush
// at wide; each half is its own row at narrow. Edge print: A over frame 1, the stock code over frame 2 (frame 5 at narrow), the section over frame 4.
function strip(ctx, id, frames, { draw = false, circled } = {}) {
  const B = ctx.brand, slug = ctx.slug || B.slug;
  const holes = '<svg class="ct-holes ct-holes--t" aria-hidden="true"><rect width="100%" height="17" fill="url(#ct-hole)"/></svg><svg class="ct-holes ct-holes--b" aria-hidden="true"><rect width="100%" height="17" fill="url(#ct-hole)"/></svg>';
  const tri = '<i class="ct-tri"></i>';
  const edge = (at, html, cls = '') => `<span class="ct-ep ${cls}" style="--at:${at}">${html}</span>`;
  const stock = `${A(B.name)} 400${tri}${pad2(circled)}A`;
  const cell = (fr, i) => {
    const loop = i === 2 ? `<svg class="ct-loop${draw ? ' ct-loop--draw' : ''}" viewBox="495 52 276 212" preserveAspectRatio="none" aria-hidden="true"><path d="${loopPath(slug, 'book-' + id)}"/></svg>` : '';
    const no = `<span class="ct-no${i === 2 ? ' ct-no--c' : ''}">${frameLabel(fr.no)}${tri}</span>`;
    return `<div class="ct-gw">${fr.inner == null ? '' : `<div class="ct-gate${fr.empty ? ' ct-gate--e' : ''}">${fr.inner}</div>`}${loop}${no}</div>`;
  };
  const half = (k) => `<div class="ct-strip">${holes}${k === 0
    ? edge(0, `${A(B.name)} brand book ${A(B.version.number)}`) + edge(1, stock, 'ct-ep--w')
    : edge(0, A(titleOf(id))) + edge(1, stock, 'ct-ep--n')}${frames.slice(k * 3, k * 3 + 3).map((f, i) => cell(f, k * 3 + i)).join('')}</div>`;
  return `<div class="ct-roll" aria-hidden="true">${half(0)}${half(1)}</div>`;
}
// a roll of six from the theme's setups: specs are [setup, k, v] (photo) or [setup, v]; -1 and 0 are the leader
const fr = (ctx, no, spec, alt) => (spec ? { no, inner: frameInner(ctx, spec[0] === 'photo' ? spec : [spec[0], spec[1]], alt) } : { no, inner: null });

// ---- the opening: strip, the enlargement hanging from the circled frame, the caption column ----------------------------------
function opening(ctx, id, { frames, circledNo, circled, enl, cap, head, draw = false }) {
  const c = cap || frameCap(ctx, circled);
  const capCol = `<div class="ct-cap"><p class="ct-fno">${A(pad2(circledNo))}</p><p class="ct-ct">${A(c.title)}</p>${c.text ? `<p class="ct-cx">${A(c.text)}</p>` : ''}<hr class="ct-hr">${head}</div>`;
  return `${strip(ctx, id, frames, { draw, circled: circledNo })}<div class="ct-grid ct-open"><figure class="ct-enl">${enl}</figure>${capCol}</div>`;
}
const h2 = (id, words) => `<h2 class="ct-h2" id="h-${id}">${A(titleOf(id))}</h2>${words ? `<p class="ct-words">${A(words)}</p>` : ''}`;
const sec = (id, inner, cls = '') => `<section class="bk-sec ct-sec ${cls}" id="${id}" aria-labelledby="h-${id}"><div class="ct-c">${inner}</div></section>`;
// a long-read row: its name in gate 1, the matter on gates 2 to 4, a note on 5 and 6 (or the matter on 2 to 6)
// (full: the name above, the matter across all six gates)
const row = (name, main, side = '', { wide = false, full = false, cls = '' } = {}) => `<div class="ct-grid ct-row ${cls}"><h3 class="ct-k">${name}</h3><div class="${full ? 'ct-mf' : wide ? 'ct-mw' : 'ct-m'}">${main}</div>${side && !wide && !full ? `<div class="ct-s">${side}</div>` : ''}</div>`;

// controls: a copy button whose visible text is the action, and a value that copies itself
const copyBtn = (text, value, what) => `<button type="button" class="bk-btn ct-btn" data-copy="${A(value)}" data-copy-label="${A(what)}" aria-label="${A(text + ', ' + what)}"><span class="bk-btn__t">${A(text)}</span></button>`;
const valBtn = (kind, value, name) => `<button type="button" class="bk-btn ct-val" data-copy="${A(value)}" data-copy-label="${A(name + ' ' + kind)}" aria-label="Copy ${kind} ${A(value)}, ${A(name)}"><span class="bk-btn__t">${A(value)}</span></button>`;
const dl = (f, label, text) => (f ? `<a class="ct-dl" href="${A(f.href)}" download aria-label="Download ${A(label)}, ${A(f.ext)}, ${A(f.sizeText)}">${A(text || f.ext)}</a>` : '');

// the logo in the colourway made for each mode's ground
const logoOn = (ctx, id, ground, w, label = 'Logo') => { const k = cwOn(ctx, ground); return ctx.logo.html(id, { width: w, colourway: k, color: ctx.brand.logo.colourways[k].name, label }); };
const logoBoth = (ctx, id, w) => `<span class="ct-logo bk-for-light">${logoOn(ctx, id, ctx.roles.light.surface, w)}</span><span class="ct-logo bk-for-dark">${logoOn(ctx, id, ctx.roles.dark.surface, w)}</span>`;

// ---- 1 Overview ----------------------------------------------------------------------------------------------------------------
// The sheet's head: the brand's line, the strip from the leader (00, 0) to frame 4, frame 1 circled and drawn as the page loads.
function overview(ctx) {
  const B = ctx.brand, R = rollOf(ctx);
  // hidden film parts used by every strip: the sprocket hole, one pattern
  const defs = `<svg class="ct-defs" width="0" height="0" aria-hidden="true" focusable="false"><defs><pattern id="ct-hole" patternUnits="userSpaceOnUse" width="29.25" height="17"><rect x="8.625" y="0" width="12" height="17" rx="2.5" fill="${tokens(ctx).hole}"/></pattern></defs></svg>`;
  const frames = [fr(ctx, -1), fr(ctx, 0), fr(ctx, 1, ['poster', 0], 'Frame 01'), fr(ctx, 2, ['poster', 1], 'Frame 02'), fr(ctx, 3, ['photo', 0, 0]), fr(ctx, 4, ['sheets', 0], 'Frame 04')];
  const cap = frameCap(ctx, ['poster']);
  const head = `<div class="ct-stamp">${logoBoth(ctx, 'colour', 200)}</div><p class="ct-words">${A(B.description)}</p>`;
  const meta = `<dl class="ct-meta"><div><dt>Version</dt><dd>${A(B.version.number)}</dd></div><div><dt>Issued</dt><dd>${A(ctx.date)}</dd></div>${B.city ? `<div><dt>From</dt><dd>${A(B.city)}</dd></div>` : ''}</dl>`;
  const traits = `<ol class="ct-traits">${B.personality.map((p) => `<li><p class="ct-trait">${A(p.trait)}</p><p class="ct-p">${A(p.means)}</p></li>`).join('')}</ol>`;
  return sec('overview', `${defs}<header class="ct-head"><h1 class="ct-h1" id="h-overview">${A(B.lines.primary)}</h1>${meta}</header>
${opening(ctx, 'overview', { frames, circledNo: 1, cap, enl: sceneImg(ctx, 'poster', 0, cap.title), head, draw: true })}
${row('What we do', `<p class="ct-lead">${A(B.product)}</p>`, `<p class="ct-p">${A(B.voice.boilerplate25)}</p>`)}
${row('Who it is for', `<p class="ct-p ct-p--l">${A(B.audience)}</p>`)}
${row('How we behave', traits, '', { wide: true })}`, 'ct-sec--first');
}

// ---- 2 Voice -------------------------------------------------------------------------------------------------------------------
function voice(ctx) {
  const B = ctx.brand, V = B.voice;
  const frames = [fr(ctx, 5, ['sheets', 1], 'Frame 05'), fr(ctx, 6, ['photo', 1, 0]), fr(ctx, 7, ['letter', 0], 'Frame 07'), fr(ctx, 8, ['letter', 1], 'Frame 08'), fr(ctx, 9, ['letter', 2], 'Frame 09'), fr(ctx, 10, ['app', 0], 'Frame 10')];
  const cap = frameCap(ctx, ['letter']);
  const n = V.principles.length;
  const habits = `<ol class="ct-habits">${V.principles.map((p) => `<li><p class="ct-habit__k">${A(p.title)}</p><p class="ct-habit__v">${A(p.example)}</p></li>`).join('')}</ol>`;
  const wtn = `<ul class="ct-wtn">${V.writeThis.map((r) => `<li><p class="ct-wtn__w">${A(r.write)}</p><p class="ct-wtn__n"><span class="ct-lab">Not</span> ${A(r.not)}</p><p class="ct-wtn__b">${A(r.because)}</p></li>`).join('')}</ul>`;
  const bp = (words, text) => `<div class="ct-bp"><p class="ct-lab">In ${words} words</p><p class="ct-bp__t">${A(text)}</p>${copyBtn('Copy text', text, `${words}-word boilerplate`)}</div>`;
  const lines = [B.lines.primary, ...(B.lines.others || [])];
  return sec('voice', `${opening(ctx, 'voice', { frames, circledNo: 7, cap, enl: sceneImg(ctx, 'letter', 0, cap.title), head: h2('voice', `${n === 1 ? 'One habit' : `${n} habits`}, each heard in a line ${B.name} would write.`) })}
${row('The habits', habits, '', { wide: true })}
${row('Write this, not that', wtn, '<p class="ct-note">The line to write first, the line it replaces, and why.</p>')}
${row('Boilerplate', bp(50, V.boilerplate50), bp(25, V.boilerplate25))}
${row('Lines in use', `<ul class="ct-lines">${lines.map((l) => `<li>${A(l)}</li>`).join('')}</ul>`)}
${row('Writing the name', `<p class="ct-p ct-p--l">${A(V.nameRules)}</p>`)}`);
}

// ---- shared by the sections below ------------------------------------------------------------------------------------------------
// the brand's k-th photograph on the roll; past the last one the shots come round again as the 1.10 and 1.22 crops
const ph = (ctx, k) => { const n = Math.max(1, (ctx.brand.imagery.shots || []).filter((s) => s.photo).length); return ['photo', k, Math.floor(k / n) % 3]; };
const frames6 = (ctx, from, specs) => specs.map((s, i) => (s ? fr(ctx, from + i, s, `Frame ${pad2(from + i)}`) : fr(ctx, from + i)));
// a ground that all but vanishes into the page in one mode gets a hairline in that mode
const near = (ctx, hex) => `${ctx.ratio(hex, ctx.roles.light.surface) < 1.3 ? ' is-near-l' : ''}${ctx.ratio(hex, ctx.roles.dark.surface) < 1.3 ? ' is-near-d' : ''}`;
const pct = (n) => `${r2(n * 100)}%`;
const lab = (t) => `<span class="ct-lab">${t}</span>`;
const rulesList = (list) => `<ul class="ct-rules">${list.map((r) => `<li><p class="ct-rules__do">${lab('Do')} ${A(r.do)}</p><p class="ct-rules__dont">${lab('Don&rsquo;t')} ${A(r.dont)}</p></li>`).join('')}</ul>`;

// the pencil X on a reject (from lane-g2): two tapered strokes of a wax pencil, each one pass, bowed a little, heavier in the middle
const hash32 = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
function pencilX(seed, w, h, fill) {
  const rnd = mulberry32(hash32(seed)), j = () => (rnd() - 0.5) * 0.08;
  const stroke = (x0, y0, x1, y1) => {
    const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy), nx = -dy / len, ny = dx / len, bow = (rnd() - 0.5) * 0.05 * len, Wm = 4.2 + 2 * rnd(), N = 48, Lp = [], Rp = [];
    for (let i = 0; i <= N; i++) {
      const s = i / N, off = bow * Math.sin(Math.PI * s), x = x0 + dx * s + nx * off, y = y0 + dy * s + ny * off;
      const W = Math.max(1.1, Wm * Math.min(1, s / 0.07) ** 0.5 * Math.min(1, (1 - s) / 0.22) ** 0.8 * (0.9 + 0.1 * Math.sin(5 * s + rnd())));
      Lp.push([x + nx * W / 2, y + ny * W / 2]); Rp.push([x - nx * W / 2, y - ny * W / 2]);
    }
    return `<path d="M${[...Lp, ...Rp.reverse()].map((p) => `${r2(p[0])} ${r2(p[1])}`).join('L')}Z" fill="${fill}"/>`;
  };
  return `<svg class="ct-x" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">${stroke(w * (0.13 + j()), h * (0.15 + j()), w * (0.87 + j()), h * (0.85 + j()))}${stroke(w * (0.85 + j()), h * (0.13 + j()), w * (0.15 + j()), h * (0.87 + j()))}</svg>`;
}

// ---- 3 Logo --------------------------------------------------------------------------------------------------------------------
// Each version printed 3:2 on the ground it is made for, two gates wide, then the clear space drawn to scale, the smallest size and three rejects.
function logo(ctx) {
  const B = ctx.brand, L = ctx.logo, cw = B.logo.colourways, slot = isSlot(ctx), T = tokens(ctx);
  const frames = frames6(ctx, 11, [['tote', 1], ph(ctx, 3), ['book', 0], ['card', 0], ph(ctx, 4), ['laptop', 0]]);
  const cap = frameCap(ctx, ['book']);
  // the logo inside a print: as wide as fits 60% of the width and 42% of the height of a 3:2 print
  const lg = (id, inner) => { const g = L.geos[id]; return `<span class="ct-print__lg ct-fit" style="width:${pct(Math.min(0.6, (0.42 / 1.5) * g.w / g.h))};aspect-ratio:${r2(g.w)}/${r2(g.h)}">${inner}</span>`; };
  const printOf = (id, k, name, note, links = '') => { const w = cw[k]; return `<li class="ct-pr"><div class="ct-print${near(ctx, w.ground)}" style="background:${w.ground};color:${w.name}">${lg(id, L.html(id, { width: 240, colourway: k, color: w.name, label: 'Logo' }))}</div><p class="ct-pr__n">${A(name)}</p>${note ? `<p class="ct-pr__x">${A(note)}</p>` : ''}${links}</li>`; };
  const filesOf = (id, name) => { const f = slot ? null : ctx.book.logo(id); return f ? `<p class="ct-pr__dl">${dl(f.svg, name + ' logo', 'SVG')}${dl(f.png.find((p) => p.w === 1024), name + ' logo, PNG, 1024 px wide', 'PNG')}${dl(f.pdf, name + ' logo', 'PDF')}</p>` : ''; };
  const versions = L.versions.map((id) => printOf(id, L.colourwayOf(id), L.labels[id], B.logo.when[id] || '', filesOf(id, L.labels[id])));
  // colourways no version is drawn in: the primary logo on that ground
  const used = new Set(L.versions.map((id) => L.colourwayOf(id)));
  const extras = Object.keys(cw).filter((k) => !used.has(k)).map((k) => {
    const c = B.colours.find((x) => x.hex.toLowerCase() === cw[k].ground.toLowerCase());
    return printOf('colour', k, c ? `On ${c.name}` : ctx.cap(k.replace(/-/g, ' ')), c ? `The ${L.labels.colour.toLowerCase()} logo, made for ${c.name} grounds.` : '');
  });
  // clear space to scale: the box is the logo plus the clear band on every side
  const g = L.geo, h = g.height / g.width, c = (L.clearShare / 100) * h, W = 1 + 2 * c, H = h + 2 * c;
  const clear = `<div class="ct-clear" style="aspect-ratio:${r2(W * 100)}/${r2(H * 100)}"><span class="ct-clear__lg ct-fit" style="inset:${pct(c / H)} ${pct(c / W)}">${logoBoth(ctx, 'colour', 240)}</span></div>`;
  const ms = L.minSize;
  const min = slot
    ? `<p class="ct-p">Set the smallest size once the logo is in, at the width where every part of it still reads as one mark.</p>`
    : `<div class="ct-min" style="width:${ms.screenPx}px">${logoBoth(ctx, 'colour', ms.screenPx)}</div><p class="ct-p ct-p--l"><span class="ct-mono">${ms.screenPx} px</span> wide on screen, <span class="ct-mono">${ms.printMm} mm</span> in print. Never smaller.</p>`;
  // three rejects on the primary's own ground, each crossed out in pencil
  const k0 = L.colourwayOf('colour'), w0 = cw[k0];
  const fill = slot ? w0.name : (B.colours.filter((x) => ![w0.ground, w0.name].map((v) => v.toLowerCase()).includes(x.hex.toLowerCase())).sort((a, b) => ctx.ratio(b.hex, w0.ground) - ctx.ratio(a.hex, w0.ground))[0] || {}).hex || w0.name;
  const prim = L.html('colour', { width: 240, colourway: k0, color: w0.name, label: 'Logo' });
  const rejects = [
    ['stretch', `<span class="ct-rj ct-rj--s">${prim}</span>`, 'Don&rsquo;t stretch or squash it.'],
    ['recolour', L.forMisuse(240, { fill }), 'Don&rsquo;t recolour it outside the versions.'],
    ['rotate', `<span class="ct-rj ct-rj--r">${prim}</span>`, 'Don&rsquo;t turn it.'],
  ].map(([id, inner, text]) => `<li class="ct-pr"><div class="ct-print${near(ctx, w0.ground)}" style="background:${w0.ground};color:${w0.name}">${lg('colour', inner)}${pencilX(`${ctx.slug || B.slug}:${id}`, 300, 200, T.loop)}</div><p class="ct-pr__n">${text}</p></li>`);
  return sec('logo', `${opening(ctx, 'logo', { frames, circledNo: 13, circled: ['book'], cap, enl: sceneImg(ctx, 'book', 0, cap.title), head: h2('logo', B.logo.idea) })}
${row('The versions', `<ul class="ct-prints">${[...versions, ...extras].join('')}</ul>`, '', { full: true })}
${row('Clear space', clear, `<p class="ct-p">Keep ${L.clearShare}% of the logo&rsquo;s height clear on every side: the dashed line. Nothing else comes inside it.</p>`)}
${row('Smallest size', min)}
${row('Never', `<ul class="ct-prints">${rejects.join('')}</ul>`, '', { full: true })}`);
}

// ---- 4 Colour ------------------------------------------------------------------------------------------------------------------
// The test strip: each colour as wide as its share of a page, and each field copies its hex. Then each colour's values, the tones, the
// text pairs set in their own colours, and the interface roles of the mode on screen.
function colour(ctx) {
  const B = ctx.brand, P = palette(ctx);
  const cols = ctx.colours.map((c, i) => ({ ...c, i })).sort((a, b) => b.share - a.share || a.i - b.i);
  const rgb = (hex) => { const [r, g, b] = ctx.C.hexToRgb(hex); return `rgb(${r}, ${g}, ${b})`; };
  const frames = frames6(ctx, 17, [['laptop', 1], ph(ctx, 5), ['tote', 0], ['sheets', 2], ['card', 1], ph(ctx, 6)]);
  const cap = frameCap(ctx, ['tote']);
  const field = (c) => `<li class="ct-tf${near(ctx, c.hex)}" style="--share:${r2(c.share)};background:${c.hex};color:${P.inkOn(c.hex)}"><button type="button" class="ct-tf__b" data-copy="${c.hex}" data-copy-label="${A(c.name)} HEX ${c.hex}" aria-label="Copy HEX ${c.hex}, ${A(c.name)}"><span class="ct-tf__n">${A(c.name)}</span><span class="ct-tf__h">${c.hex}</span><span class="ct-tf__p">${Math.round(c.share * 100)}%</span></button></li>`;
  const vals = (c) => `<dl class="ct-vals"><div><dt>HEX</dt><dd>${valBtn('HEX', c.hex, c.name)}</dd></div><div><dt>RGB</dt><dd>${valBtn('RGB', rgb(c.hex), c.name)}</dd></div><div><dt>OKLCH</dt><dd>${valBtn('OKLCH', c.oklch || ctx.C.oklchString(c.hex), c.name)}</dd></div>${ctx.C.cmykOf(c) ? `<div><dt>CMYK</dt><dd>${valBtn('CMYK', ctx.C.cmykOf(c), c.name)}</dd></div>` : ''}</dl>`;
  const entry = (c, i) => row(A(c.name), `<p class="ct-p ct-p--l">${A(c.lands)}</p>${vals(c)}`, `<span class="ct-chip${near(ctx, c.hex)}" style="background:${c.hex}" aria-hidden="true"></span><p class="ct-lab">${Math.round(c.share * 100)}% of a page</p>`, { cls: i ? 'ct-row--n' : '' });
  const tones = ctx.tones.length ? row('Tones', `<ul class="ct-tones">${ctx.tones.map((t) => `<li><span class="ct-chip ct-chip--s${near(ctx, t.hex)}" style="background:${t.hex}" aria-hidden="true"></span><div><p class="ct-tone__n">${A(t.name)}</p><p class="ct-tone__x">${A(t.lands || t.role || '')}</p></div>${valBtn('HEX', t.hex, t.name)}</li>`).join('')}</ul>`, '<p class="ct-note">Tones are for text and edges, never a field of their own.</p>') : '';
  const pair = (p) => `<li class="ct-pair${near(ctx, p.bgHex)}${p.large ? ' ct-pair--lg' : ''}" style="background:${p.bgHex};color:${p.fgHex}"><p class="ct-pair__r">${A(p.ratioText)}&thinsp;:&thinsp;1</p><p class="ct-pair__u">${A(p.use)}</p></li>`;
  const roleKeys = [['surface', 'Surface'], ['raised', 'Raised'], ['sunken', 'Sunken'], ['text', 'Text'], ['textSoft', 'Soft text'], ['quiet', 'Quiet text'], ['divider', 'Divider'], ['border', 'Border'], ['action', 'Action'], ['actionLabel', 'Action label'], ['focus', 'Focus']];
  const toneKeys = [['success', 'Success'], ['warning', 'Warning'], ['danger', 'Danger'], ['info', 'Info']];
  const roleList = (mode) => {
    const r = ctx.roles[mode], items = [...roleKeys.filter(([k]) => r[k]).map(([k, n]) => [n, r[k]]), ...toneKeys.filter(([k]) => r[k]).map(([k, n]) => [n, r[k].fg])];
    return `<ul class="ct-roles bk-for-${mode}">${items.map(([n, hx]) => `<li><span class="ct-chip ct-chip--r" style="background:${hx}" aria-hidden="true"></span><span class="ct-roles__n">${A(n)}</span>${valBtn('HEX', hx, `${mode} ${n}`)}</li>`).join('')}</ul>`;
  };
  return sec('colour', `${opening(ctx, 'colour', { frames, circledNo: 19, circled: ['tote'], cap, enl: sceneImg(ctx, 'tote', 0, cap.title), head: h2('colour', `${cols.length} colours, used in the shares the test strip shows. Press a field to copy its hex.`) })}
${row('Test strip', `<ul class="ct-ts">${cols.map(field).join('')}</ul>`, '', { full: true })}
${cols.map(entry).join('\n')}
${tones}
${row('Text pairs', `<ul class="ct-pairs">${ctx.pairs.map(pair).join('')}</ul>`, '', { wide: true })}
${row('Interface roles', `${roleList('light')}${roleList('dark')}`, '<p class="ct-note">The colour each job takes in the product, for the mode on screen. The switch at the top shows the other set.</p>')}`);
}

// ---- 5 Typography --------------------------------------------------------------------------------------------------------------
// Each face set in itself, the scale as rows (each size set in its own face), a line to try, the rules and the sample in use.
const WEIGHT = { 100: 'Thin', 200: 'Extra light', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'Semibold', 700: 'Bold', 800: 'Extra bold', 900: 'Black' };
function typography(ctx) {
  const B = ctx.brand, F = B.fonts, T = B.type, stretch = F.display.stretch || 100;
  const frames = frames6(ctx, 23, [['poster', 2], ph(ctx, 7), ['night', 0], ['letter', 1], ph(ctx, 8), ['app', 1]]);
  const cap = frameCap(ctx, ['night']);
  const wn = (f) => f.weights.map((w) => WEIGHT[w] || String(w)).join(', ');
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789';
  const face = (f, cls, role, use) => `<li class="ct-face ${cls}"><p class="ct-face__n">${A(f.family)}</p><p class="ct-face__c" aria-hidden="true">${chars}</p><p class="ct-face__d">${lab(role)} ${A(wn(f))}. ${use}</p></li>`;
  const faces = `<ul class="ct-faces">${face(F.display, 'ct-face--d', 'Display', 'For the one line that matters.')}${face(F.body, 'ct-face--b', 'Text', 'For everything you read.')}${face(F.mono, 'ct-face--m', 'Mono', 'For a hex, a size or an order number.')}</ul>`;
  const lh = (l) => (l > 4 ? `${l}px` : String(l));
  const scale = `<ol class="ct-scale">${T.scale.map((s) => {
    const disp = s.face === 'display', text = disp ? T.sample.headline : s.token === 'caption' ? T.sample.caption : T.sample.paragraph;
    return `<li><div class="ct-sc__k"><p class="ct-sc__t">${A(ctx.cap(s.token))}</p><p class="ct-sc__m"><span class="ct-mono">${s.size}/${lh(s.line)}</span> ${A(WEIGHT[s.weight] || String(s.weight))}</p><p class="ct-sc__m">${A(s.use)}</p></div><p class="ct-sc__s${disp ? ' ct-sc__s--d' : ''}" style="--size:${s.size};font-weight:${s.weight};line-height:${lh(s.line)}">${A(text)}</p></li>`;
  }).join('')}</ol>`;
  const tester = `<div class="ct-tester" data-tester>
<div class="ct-tester__ctl"><div class="ct-fld ct-fld--t"><label class="ct-lab" for="tester-text">Your line</label><input class="ct-in" id="tester-text" type="text" value="${A(T.sample.headline)}" data-tester-text data-default="${A(T.sample.headline)}" autocomplete="off" spellcheck="false"></div>
<div class="ct-fld"><label class="ct-lab" for="tester-size">Size <output for="tester-size" class="ct-mono" data-tester-value>72 px</output></label><input class="ct-range" id="tester-size" type="range" min="16" max="160" step="1" value="72" data-tester-size></div></div>
<p class="ct-tester__out" data-tester-out aria-hidden="true">${A(T.sample.headline)}</p></div>`;
  const inuse = `<div class="ct-inuse"><p class="ct-inuse__h">${A(T.sample.headline)}</p><p class="ct-p">${A(T.sample.paragraph)}</p><p class="ct-inuse__c">${A(T.sample.caption)}</p></div>`;
  return sec('typography', `${opening(ctx, 'typography', { frames, circledNo: 25, circled: ['night'], cap, enl: sceneImg(ctx, 'night', 0, cap.title), head: h2('typography', `${F.display.family} for the line that matters, ${F.body.family} for everything you read.`) })}
${row('The faces', faces, '', { wide: true })}
${row('The scale', scale, '', { wide: true })}
${row('Try a line', tester, '', { wide: true })}
${row('In use', inuse, `<p class="ct-note">The headline, the paragraph and the caption, at the sizes the scale gives them.</p>`)}
${row('Rules', rulesList(T.rules), '', { wide: true })}`);
}

// ---- 6 Imagery -----------------------------------------------------------------------------------------------------------------
// A roll of the brand's own photographs, the third circled; the direction, the shot list with each photograph to download, the rules.
function imagery(ctx) {
  const B = ctx.brand, D = B.imagery.direction, shots = B.imagery.shots;
  const frames = frames6(ctx, 29, [0, 1, 2, 3, 4, 5].map((k) => ph(ctx, k)));
  const cap = frameCap(ctx, ['photo', 2], true);
  const dir = `<dl class="ct-dir">${[['Light', D.light], ['Crop', D.crop], ['Colour', D.colour], ['People', D.people]].filter(([, v]) => v).map(([k, v]) => `<div><dt>${k}</dt><dd>${A(v)}</dd></div>`).join('')}</dl>`;
  const fig = (s, i) => {
    if (!s.photo) return `<li class="ct-pr"><div class="ct-shot"><div class="ct-brief"><span class="ct-brief__t">To shoot</span><span class="ct-brief__n">Shot ${i + 1}</span></div></div><p class="ct-pr__x ct-pr__b">${A(s.slot || '')}</p></li>`;
    const f = !isSlot(ctx) ? ctx.book.find(`05 Imagery/photos/${s.photo.split('/').pop()}`) : null;
    return `<li class="ct-pr"><div class="ct-shot">${ctx.photo(s.id, { cls: 'ct-img', slotNote: false })}</div><p class="ct-pr__n">${A(s.caption || s.alt || '')}</p>${f ? `<p class="ct-pr__dl">${dl(f, 'photo, ' + (s.caption || s.id), 'JPG')}</p>` : ''}</li>`;
  };
  const credits = [...new Set(shots.filter((s) => s.photo && !s.generated && s.credit).map((s) => s.credit))];
  const any = shots.some((s) => s.photo) && !isSlot(ctx);
  return sec('imagery', `${opening(ctx, 'imagery', { frames, circledNo: 31, circled: ['photo', 2], cap, enl: photoImg(ctx, 2, 0), head: h2('imagery', D.subject) })}
${row('Direction', dir, '', { wide: true })}
${row('The shot list', `<ul class="ct-prints">${shots.map(fig).join('')}</ul>${credits.length ? `<p class="ct-note">Photo: ${credits.map(A).join(', ')}.</p>` : ''}`, '', { full: true })}
${row('Rules', rulesList(B.imagery.rules), any ? '' : '<p class="ct-note">Each frame is the brief for one shot until the photographs are in.</p>', { wide: any })}`);
}

// ---- 7 Layout ------------------------------------------------------------------------------------------------------------------
// Roll 2 starts on its leader. The page grid drawn to scale with its measures beside it, then the spacing steps and the corners.
function layout(ctx) {
  const G = ctx.gridMeasures, B = ctx.brand, P = G.page;
  const frames = [fr(ctx, -1), fr(ctx, 0), fr(ctx, 1, ['laptop', 0], 'Frame 01'), fr(ctx, 2, ['laptop', 2], 'Frame 02'), fr(ctx, 3, ph(ctx, 9)), fr(ctx, 4, ['app', 2], 'Frame 04')];
  const cap = frameCap(ctx, ['laptop']);
  const colW = r2(G.col), cols = Array.from({ length: G.columns }, (_, i) => `<rect class="ct-pg__c" x="${r2(G.margin + i * (G.col + G.gutter))}" y="${G.margin}" width="${colW}" height="${P.h - 2 * G.margin}"/>`).join('');
  const drawing = `<svg class="ct-pg" viewBox="0 0 ${P.w} ${P.h}" role="img" aria-label="The guideline grid: ${G.columns} columns, ${G.margin} pixel margins and ${G.gutter} pixel gutters"><rect class="ct-pg__p" x="0" y="0" width="${P.w}" height="${P.h}"/>${cols}<rect class="ct-pg__m" x="${G.margin}" y="${G.margin}" width="${P.w - 2 * G.margin}" height="${P.h - 2 * G.margin}"/></svg>`;
  const meas = `<dl class="ct-meas">${[['Columns', G.columns], ['Margin', `${G.margin} px`], ['Gutter', `${G.gutter} px`], ['Column', `${colW} px`], ['Base', `${G.base} px`]].map(([k, v]) => `<div><dt>${k}</dt><dd>${A(String(v))}</dd></div>`).join('')}</dl>`;
  const space = `<ol class="ct-space">${ctx.space.map((s) => `<li><i style="width:${s.px}px;height:${s.px}px" aria-hidden="true"></i><span class="ct-mono">${s.px}</span></li>`).join('')}</ol>`;
  const radii = `<ul class="ct-radii">${ctx.radii.filter((r) => r.px < 9999).map((r) => `<li><i style="border-radius:${r.px}px" aria-hidden="true"></i><p class="ct-pr__n">${A(ctx.cap(r.use || r.token || ''))}</p><p class="ct-pr__x"><span class="ct-mono">${r.px} px</span></p></li>`).join('')}</ul>`;
  return sec('layout', `${opening(ctx, 'layout', { frames, circledNo: 1, circled: ['laptop'], cap, enl: sceneImg(ctx, 'laptop', 0, cap.title), head: h2('layout', `The guideline grid: ${G.columns} columns, and every gap a step of ${G.base} px.`) })}
${row('The guideline grid', drawing, meas)}
${row('Spacing', space, `<p class="ct-note">Space inside a group is always smaller than the space between groups.</p>`)}
${row('Corners and edges', radii, `<p class="ct-note">Edges are ${A(String(B.ui.border))} px. ${A(B.ui.elevationNote || '')}</p>`)}`);
}

// ---- 8 Applications ------------------------------------------------------------------------------------------------------------
// The lightbox circled, then four more frames of the roll printed up, each beside its caption, the caption on alternating sides.
function applications(ctx) {
  const frames = frames6(ctx, 5, [['book', 1], ['sheets', 0], ['lightbox', 0], ['card', 0], ['app', 0], ['poster', 0]]);
  const cap = frameCap(ctx, ['lightbox']);
  const plate = ([no, setup], i) => { const c = frameCap(ctx, [setup]); return `<div class="ct-plate"><figure class="ct-enl ct-plate__f">${sceneImg(ctx, setup, 0, c.title)}</figure><div class="ct-plate__c"><p class="ct-fno">${pad2(no)}</p><p class="ct-ct">${A(c.title)}</p>${c.text ? `<p class="ct-cx">${A(c.text)}</p>` : ''}</div></div>`; };
  return sec('applications', `${opening(ctx, 'applications', { frames, circledNo: 7, circled: ['lightbox'], cap, enl: sceneImg(ctx, 'lightbox', 0, cap.title), head: h2('applications', 'The sheet under the loupe, the prints on the wall, the cards, the app and the poster: the brand where people meet it.') })}
<div class="ct-grid ct-plates">${[[6, 'sheets'], [8, 'card'], [9, 'app'], [10, 'poster']].map(plate).join('\n')}</div>`);
}

// ---- 9 Downloads ---------------------------------------------------------------------------------------------------------------
// The last strip is unexposed film, each frame labelled with a folder; the circled one is the kit, and its enlargement is the download.
function downloads(ctx) {
  const D = ctx.book, L = ctx.logo, slot = isSlot(ctx);
  const bf = (no, label) => ({ no, inner: blank(label), empty: true });
  const frames = [bf(11, 'Read me'), bf(12, 'Logo'), bf(13, 'The kit'), bf(14, 'Colour'), bf(15, 'Type'), bf(16, 'Icons')];
  const cap = { title: 'The kit', text: `Every folder below in one zip: ${D.zip.name}, ${D.zip.sizeText}.` };
  const enl = `<div class="ct-slot ct-kit"><span class="ct-edge">The kit</span><p class="ct-kit__n">${A(D.zip.name)}</p><p class="ct-kit__s ct-mono">${A(D.zip.sizeText)}</p><a class="bk-btn ct-btn ct-btn--p" href="${A(D.zip.href)}" download aria-label="Download the kit, ${A(D.zip.name)}, ${A(D.zip.sizeText)}"><span class="bk-btn__t">Download the kit</span></a></div>`;
  const file = (f) => `<li><span class="ct-file__n">${A(f.name)}</span><span class="ct-file__s ct-mono">${A(f.ext)}, ${A(f.sizeText)}</span><a class="ct-dl" href="${A(f.href)}" download aria-label="Download ${A(f.name)}, ${A(f.ext)}, ${A(f.sizeText)}">Download</a></li>`;
  const files = (list) => `<ul class="ct-files">${list.filter(Boolean).map(file).join('')}</ul>`;
  const logoRows = slot || !D.logo('colour') ? files(D.logoFiles)
    : `<ul class="ct-files">${L.versions.map((id) => { const f = D.logo(id), n = L.labels[id]; return `<li><span class="ct-file__n">${A(n)}</span><span class="ct-pr__dl">${dl(f.svg, n + ' logo', 'SVG')}${dl(f.pdf, n + ' logo', 'PDF')}${f.png.map((p) => dl(p, `${n} logo, PNG, ${p.w} px wide`, `PNG ${p.w}`)).join('')}</span></li>`; }).join('')}</ul>`;
  const icons = `<ul class="ct-icons">${D.icons.map((f) => `<li><a class="ct-icon" href="${A(f.href)}" download aria-label="Download the ${A(f.name.replace('.svg', ''))} icon, SVG">${ctx.ui.icon(f.name.replace('.svg', ''), 24)}<span>${A(f.name.replace('.svg', ''))}</span></a></li>`).join('')}</ul>${files([D.iconsLicence])}`;
  const photos = D.imagery.filter((f) => f.rel.startsWith('05 Imagery/photos/')), pdfs = D.imagery.filter((f) => f.ext === 'PDF');
  const group = (title, what, inner, i) => row(A(title), inner, `<p class="ct-note">${A(what)}</p>`, { cls: i ? 'ct-row--n' : '' });
  return sec('downloads', `${opening(ctx, 'downloads', { frames, circledNo: 13, cap, enl, head: h2('downloads', 'Logo, colour, type, icons and imagery, ready for print and screen.') })}
${[
    ['Read me', 'Start here: what is in the kit and how to use it.', files([D.readmePdf, D.readme])],
    ['Logo', slot ? 'The labelled slot frame, and where the approved files go.' : 'Each version as SVG and PDF, and as PNG at three widths.', logoRows],
    ['Colour', 'The palette for Adobe, CSS and JSON, and a swatch sheet.', files(D.colour)],
    ['Type', 'The specimen sheet, and the faces with their links and licence.', files(D.type)],
    ['Icons', `${D.icons.length} interface icons, drawn in the brand's stroke.`, icons],
    ['Imagery', photos.length ? 'The photography direction, and the photographs.' : 'The photography direction and the shot list.', files([...pdfs, ...photos])],
  ].map(([t, w, inner], i) => group(t, w, inner, i)).join('\n')}`);
}

export function brandBook(ctx) {
  return [overview, voice, logo, colour, typography, imagery, layout, applications, downloads].map((f) => f(ctx)).join('\n');
}

// ---- css -----------------------------------------------------------------------------------------------------------------------
// the loop drawn by the pencil: a pie that opens 30 degrees a step from 150 degrees, twelve steps, over the loop's box
function drawKeys() {
  const N = 12, R = 150, pt = (d) => { const t = (d * Math.PI) / 180; return `${r2(50 + R * Math.cos(t))}% ${r2(50 + R * Math.sin(t))}%`; };
  let k = '';
  for (let i = 0; i <= N; i++) { const p = ['50% 50%']; for (let j = 0; j <= N; j++) p.push(pt(150 + 30 * Math.min(i, j))); k += `${r2((i / N) * 100)}%{clip-path:polygon(${p.join(',')})}`; }
  return `@keyframes ct-draw{${k}}`;
}

// The shell's header shows the colour logo in light mode and the reversed one in dark. When a brand's colour logo is made for a dark ground
// (light on dark), each mode shows the other one instead: whichever logo's name colour reads better on that mode's surface. The shared hide rule
// is !important, so these are too, one class more specific.
function headerFix(ctx) {
  const cw = ctx.brand.logo.colourways, L = ctx.roles.light.surface, D = ctx.roles.dark.surface;
  if (!cw.colour || !cw.reversed) return '';
  let s = '';
  if (ctx.ratio(cw.colour.name, L) < ctx.ratio(cw.reversed.name, L)) s += ':root:not([data-theme="dark"]) .bk-brand .bk-for-light,.bk--board .bk-brand .bk-for-light{display:none!important}:root:not([data-theme="dark"]) .bk-brand .bk-for-dark,.bk--board .bk-brand .bk-for-dark{display:block!important}\n';
  if (ctx.ratio(cw.reversed.name, D) < ctx.ratio(cw.colour.name, D)) s += '[data-theme="dark"] .bk-brand .bk-for-dark{display:none!important}[data-theme="dark"] .bk-brand .bk-for-light{display:block!important}\n';
  return s;
}

export function bookCss(ctx) {
  const T = tokens(ctx), L = ctx.roles.light, D = ctx.roles.dark, B = ctx.brand;
  const d = B.fonts.display, stretch = d.stretch || 100;
  const vars = (r) => `--ground:${r.surface};--ink:${r.text};--soft:${r.textSoft};--quiet:${r.quiet};--hair:${r.divider};--line:${r.border};--panel:${r.raised};--sunk:${r.sunken};--act:${r.action};--act-h:${r.actionHover};--act-p:${r.actionPressed};--act-ink:${r.actionLabel};--focus:${r.focus};`;
  return `:root,.bk--board{${vars(L)}--film:${T.film};--hole:${T.hole};--gate:${T.gate};--edge:${T.edge};--loop:${T.loop};
--chrome:'Instrument Sans',sans-serif;--display:'${d.family}',serif;--body:'${B.fonts.body.family}',sans-serif;--mono:'${B.fonts.mono.family}',monospace;color-scheme:light}
[data-theme="dark"]{${vars(D)}color-scheme:dark}
.bk{background:var(--ground);color:var(--ink);font:400 16px/1.55 var(--body);-webkit-font-smoothing:antialiased;min-height:100vh}
.bk :where(h1,h2,h3,h4,p,ul,ol,dl,dd,figure){margin:0;padding:0}
.bk :where(ul,ol){list-style:none}
.bk :focus-visible{outline:2px solid var(--focus);outline-offset:2px}
:root:not([data-theme="dark"]) .bk-for-dark,[data-theme="dark"] .bk-for-light{display:none!important}
.bk--board .bk-for-dark{display:none!important}

/* the shell: one sticky row on the paper, the nav as the film's edge numbers */
.bk-skip{position:absolute;left:16px;top:-80px;z-index:30;background:var(--ink);color:var(--ground);padding:12px 16px;font:500 14px/20px var(--chrome);text-decoration:none}
.bk-skip:focus{top:12px}
.bk-top{position:sticky;top:0;z-index:10;display:flex;align-items:center;gap:24px;height:56px;padding:0 clamp(16px,4.2vw,60px);background:var(--ground);border-bottom:1px solid var(--hair)}
.bk-brand{flex:none;display:block;width:132px;line-height:0;text-decoration:none;color:var(--ink)}
.bk-brand svg{display:block;width:100%;height:auto}
.bk-name{font:500 18px/24px var(--chrome);color:var(--ink)}
.bk-nav{flex:1;min-width:0}
.bk-nav ol{display:flex;justify-content:center;gap:2px}
.bk-nav a{display:flex;align-items:baseline;gap:6px;padding:8px;font:500 13px/16px var(--chrome);color:var(--soft);text-decoration:none;border-radius:2px;box-shadow:inset 0 -2px 0 transparent}
.bk-nav .bk-n{font:600 12px/16px var(--chrome);font-stretch:75%;font-variant-numeric:tabular-nums;color:var(--quiet)}
.bk-nav a[aria-current]{color:var(--ink);box-shadow:inset 0 -2px 0 var(--ink)}
.bk-nav a[aria-current] .bk-n{color:var(--ink)}
@media (hover:hover){.bk-nav a:hover{color:var(--ink);background:var(--sunk)}}
.bk-menu{display:none;appearance:none;margin-left:auto;height:36px;padding:0 12px;border:1px solid var(--line);border-radius:2px;background:transparent;color:var(--ink);font:500 14px/1 var(--chrome);cursor:pointer}
.bk-mode{flex:none;display:inline-flex;padding:2px;border:1px solid var(--line);border-radius:2px}
.bk-mode button{appearance:none;border:0;border-radius:1px;background:transparent;color:var(--soft);font:500 13px/1 var(--chrome);height:30px;padding:0 12px;cursor:pointer;transition:background-color 150ms ease-out,color 150ms ease-out}
.bk-mode button[aria-pressed="true"]{background:var(--ink);color:var(--ground)}
@media (hover:hover){.bk-mode button[aria-pressed="false"]:hover{color:var(--ink);background:var(--sunk)}}
.bk-mode button:focus-visible{outline-offset:-2px}
main{display:block}
main:focus{outline:none}
.bk-foot{display:flex;justify-content:space-between;gap:16px;margin:0 clamp(16px,4.2vw,60px);padding:24px 0 48px;border-top:1px solid var(--hair);font:400 12px/16px var(--chrome);color:var(--quiet)}
.bk-live{position:fixed;left:clamp(16px,4.2vw,60px);bottom:32px;z-index:20;padding:12px 16px;border-radius:2px;background:var(--ink);color:var(--ground);font:500 14px/20px var(--chrome);visibility:hidden}
.bk-live.is-on{visibility:visible}

/* the sheet: one container per section; a gate is 14.957cqw, a gap 1.7094cqw, the cut end of a strip 0.8547cqw */
.ct-sec{background:var(--ground);padding:72px clamp(16px,4.2vw,60px) 40px;scroll-margin-top:56px}
.ct-sec--first{padding-top:56px}
.ct-c{container-type:inline-size;max-width:1440px;margin:0 auto}
.ct-defs{position:absolute;width:0;height:0;overflow:hidden}
.ct-grid{--g:14.957cqw;--gap:1.7094cqw;--cut:0.8547cqw;display:grid;grid-template-columns:repeat(6,var(--g));column-gap:var(--gap);padding:0 var(--cut)}
.ct-roll{--g:14.957cqw;--gap:1.7094cqw;--cut:0.8547cqw;display:flex;isolation:isolate}
.ct-strip{position:relative;flex:1 1 50%;display:grid;grid-template-columns:repeat(3,var(--g));column-gap:var(--gap);padding:40px var(--cut);background:var(--film)}
.ct-strip+.ct-strip{box-shadow:inset 1px 0 0 var(--hole)}
.ct-holes{position:absolute;left:0;width:100%;height:17px;overflow:hidden}
.ct-holes--t{top:6px}.ct-holes--b{bottom:6px}
.ct-ep{position:absolute;top:23px;left:calc(var(--cut) + var(--at) * (var(--g) + var(--gap)) + 8px);font:600 12px/16px var(--chrome);font-stretch:75%;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap;color:var(--edge)}
.ct-ep--n{display:none}
.ct-tri{display:inline-block;width:0;height:0;margin:0 0 0 6px;border-left:6px solid currentColor;border-top:3.5px solid transparent;border-bottom:3.5px solid transparent;vertical-align:1px}
.ct-gw{position:relative;aspect-ratio:3/2}
.ct-gate{position:absolute;inset:0;overflow:hidden;border-radius:2px;background:var(--film)}
.ct-gate::after,.ct-enl::after{content:"";position:absolute;inset:0;border-radius:inherit;box-shadow:inset 0 0 0 1px oklch(1 0 0 / .1);pointer-events:none}
.ct-gate--e{box-shadow:inset 0 0 0 1px var(--gate)}
.ct-gate--e::after{box-shadow:none}
.ct-img{position:absolute;inset:0;display:block;width:100%;height:100%;max-width:none;object-fit:cover}
.ct-plate{overflow:hidden}
.ct-slot{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:12px;border:1px dashed var(--edge);border-radius:2px;background:var(--film);text-align:center}
.ct-edge{font:600 12px/16px var(--chrome);font-stretch:75%;letter-spacing:.04em;text-transform:uppercase;color:var(--edge)}
.ct-no{position:absolute;left:0;right:0;top:calc(100% + 2px);font:600 12px/12px var(--chrome);font-stretch:75%;letter-spacing:.04em;font-variant-numeric:tabular-nums;text-align:center;color:var(--edge)}
.ct-loop{position:absolute;z-index:2;left:-15.714%;top:-25.714%;width:131.43%;height:151.43%;overflow:visible;pointer-events:none;fill:var(--loop)}
${drawKeys()}
.ct-loop--draw{animation:ct-draw 800ms linear 300ms both}
@media (prefers-reduced-motion:reduce){.ct-loop--draw{animation:none}}

/* under the strip: the enlargement on gates 2 to 4, hanging from the circled frame; the caption column on gates 5 and 6 */
.ct-open{margin-top:48px;align-items:start}
.ct-enl{position:relative;grid-column:2 / span 3;aspect-ratio:3/2;overflow:hidden;border-radius:2px;background:var(--film)}
.ct-cap{grid-column:5 / span 2}
.ct-fno{font:600 40px/40px var(--chrome);font-stretch:75%;font-variant-numeric:tabular-nums;color:var(--ink)}
.ct-ct{margin-top:16px;font:500 16px/24px var(--body);color:var(--ink)}
.ct-cx{margin-top:4px;font:400 14px/22px var(--body);color:var(--soft);text-wrap:pretty}
.ct-hr{margin:24px 0;border:0;border-top:1px solid var(--hair)}
.ct-h2{font:${ctx.weights.heading} 40px/44px var(--display);font-stretch:${stretch}%;letter-spacing:-0.01em;color:var(--ink);text-wrap:balance}
.ct-words{margin-top:16px;font:400 16px/26px var(--body);color:var(--soft);text-wrap:pretty;max-width:60ch}
.ct-stamp{width:200px;max-width:100%;margin-bottom:24px}
.ct-logo{display:block;line-height:0}
.ct-logo svg,.ct-logo>*{display:block;width:100%;height:auto}

/* the sheet's head */
.ct-head{display:grid;grid-template-columns:1fr auto;align-items:end;gap:24px 48px;margin-bottom:48px}
.ct-h1{font:${ctx.weights.heading} ${stretch > 100 ? 'clamp(30px,6vw,88px)' : 'clamp(48px,8vw,120px)'}/1 var(--display);font-stretch:${stretch}%;letter-spacing:-0.02em;color:var(--ink);text-wrap:balance;max-width:${stretch > 100 ? 16 : 12}em}
.ct-meta{display:flex;gap:32px;padding-bottom:12px}
.ct-meta dt{font:500 12px/16px var(--chrome);color:var(--quiet)}
.ct-meta dd{margin-top:4px;font:500 14px/20px var(--body);color:var(--ink)}

/* the long read */
.ct-row{margin-top:72px;padding-top:16px;border-top:1px solid var(--hair);row-gap:16px}
.ct-k{grid-column:1;font:500 14px/20px var(--body);color:var(--ink);text-wrap:balance}
.ct-m{grid-column:2 / span 3;min-width:0}
.ct-mw{grid-column:2 / span 5;min-width:0}
.ct-s{grid-column:5 / span 2;min-width:0}
.ct-p{font:400 16px/26px var(--body);color:var(--soft);text-wrap:pretty;max-width:65ch}
.ct-p--l{font-size:18px;line-height:28px;color:var(--ink)}
.ct-lead{font:${ctx.weights.heading} 28px/36px var(--display);font-stretch:${stretch}%;color:var(--ink);text-wrap:pretty;max-width:32em}
.ct-note{font:400 14px/22px var(--body);color:var(--quiet);max-width:40ch}
.ct-lab{font:500 12px/16px var(--chrome);color:var(--quiet)}
.ct-traits{display:grid;gap:32px}
.ct-traits li{display:grid;grid-template-columns:calc(2 * var(--g) + var(--gap)) 1fr;column-gap:var(--gap);align-items:baseline}
.ct-trait{font:${ctx.weights.heading} 40px/44px var(--display);font-stretch:${stretch}%;letter-spacing:-0.01em;color:var(--ink)}
.ct-habits{display:grid;gap:40px}
.ct-habits li{display:grid;grid-template-columns:var(--g) 1fr;column-gap:var(--gap);align-items:baseline}
.ct-habit__k{font:500 14px/20px var(--body);color:var(--quiet)}
.ct-habit__v{font:${ctx.weights.heading} clamp(28px,3.4cqw,48px)/1.12 var(--display);font-stretch:${stretch}%;letter-spacing:-0.01em;color:var(--ink);text-wrap:balance}
.ct-wtn{display:grid;gap:24px}
.ct-wtn li{display:grid;gap:4px;padding-bottom:24px;border-bottom:1px solid var(--hair)}
.ct-wtn li:last-child{padding-bottom:0;border-bottom:0}
.ct-wtn__w{font:500 18px/28px var(--body);color:var(--ink)}
.ct-wtn__n{font:400 16px/24px var(--body);color:var(--quiet)}
.ct-wtn__b{font:400 14px/22px var(--body);color:var(--soft)}
.ct-bp{display:grid;justify-items:start;gap:12px}
.ct-bp__t{font:400 18px/28px var(--body);color:var(--ink);text-wrap:pretty;max-width:60ch}
.ct-s .ct-bp__t{font-size:16px;line-height:26px}
.ct-lines{display:grid;gap:12px}
.ct-lines li{font:${ctx.weights.heading} 28px/36px var(--display);font-stretch:${stretch}%;color:var(--ink)}

/* controls */
.ct-btn{appearance:none;display:inline-flex;align-items:center;height:36px;padding:0 14px;border:1px solid var(--line);border-radius:2px;background:transparent;color:var(--ink);font:500 14px/1 var(--chrome);cursor:pointer;transition:background-color 150ms ease-out,transform 120ms ease-out}
.ct-btn:active{transform:scale(.97)}
.ct-btn.is-copied{background:var(--ink);color:var(--ground);border-color:var(--ink)}
@media (hover:hover){.ct-btn:not(.is-copied):hover{background:var(--sunk)}}
.ct-val{appearance:none;padding:2px 6px;margin:-2px -6px;border:0;border-radius:2px;background:transparent;color:var(--ink);font:400 14px/20px var(--mono);cursor:pointer;text-align:left;transition:background-color 150ms ease-out}
.ct-val.is-copied{background:var(--ink);color:var(--ground)}
@media (hover:hover){.ct-val:not(.is-copied):hover{background:var(--sunk)}}
.ct-dl{display:inline-flex;align-items:center;height:28px;padding:0 8px;border:1px solid var(--line);border-radius:2px;color:var(--ink);font:500 12px/1 var(--chrome);text-decoration:none;transition:background-color 150ms ease-out}
@media (hover:hover){.ct-dl:hover{background:var(--sunk)}}
.ct-mono{font-family:var(--mono);font-weight:400;font-size:.9em}
:root:not([data-theme="dark"]) .is-near-l,[data-theme="dark"] .is-near-d{box-shadow:inset 0 0 0 1px var(--hair)}
.ct-mf{grid-column:1 / -1;min-width:0}
.ct-row--n{margin-top:0;padding-top:24px}

/* prints: a version on its own ground, 3:2, two gates wide */
.ct-prints{display:grid;grid-template-columns:repeat(3,calc(2 * var(--g) + var(--gap)));gap:40px var(--gap)}
.ct-pr{min-width:0}
.ct-print{position:relative;isolation:isolate;aspect-ratio:3/2;display:grid;place-items:center;overflow:hidden;border-radius:2px}
.ct-print__lg{display:block;line-height:0}
.ct-fit>*,.ct-fit .ct-logo>*,.ct-rj>*{width:100%!important;height:100%!important}
.ct-rj{display:block}
.ct-rj--s{transform:scaleX(1.45)}
.ct-rj--r{transform:rotate(-14deg)}
.ct-x{position:absolute;z-index:1;inset:0;width:100%;height:100%;pointer-events:none}
.ct-pr__n{margin-top:12px;font:500 14px/20px var(--body);color:var(--ink)}
.ct-pr__x{margin-top:2px;font:400 14px/22px var(--body);color:var(--soft);max-width:44ch;text-wrap:pretty}
.ct-pr__dl{display:flex;gap:6px;margin-top:12px}
.ct-clear{position:relative;max-width:560px;border:1px dashed var(--quiet);border-radius:2px}
.ct-clear__lg{position:absolute;display:block;outline:1px solid var(--hair)}
.ct-min{margin-bottom:16px}

/* colour */
.ct-ts{display:flex;min-height:176px;border-radius:2px;overflow:hidden}
.ct-tf{flex:var(--share) 1 0;min-width:0;display:flex}
.ct-tf__b{appearance:none;flex:1;min-width:0;display:grid;grid-template-rows:auto auto 1fr;gap:2px;padding:14px 12px;border:0;border-radius:0;background:transparent;color:inherit;text-align:left;cursor:pointer;transition:box-shadow 150ms ease-out}
.ct-tf__b:focus-visible{outline:2px solid currentColor;outline-offset:-5px}
@media (hover:hover){.ct-tf__b:hover{box-shadow:inset 0 -4px 0 currentColor}}
.ct-tf__n{font:600 14px/20px var(--body);overflow-wrap:anywhere}
.ct-tf__h{font:400 13px/18px var(--mono)}
.ct-tf__p{align-self:end;font:${ctx.weights.heading} 40px/1 var(--display);font-stretch:${stretch}%;font-variant-numeric:tabular-nums}
.ct-chip{display:block;width:var(--g);aspect-ratio:3/2;border-radius:2px;margin-bottom:8px}
.ct-chip--s{width:48px;margin:0}
.ct-chip--r{width:24px;aspect-ratio:1;margin:0;box-shadow:inset 0 0 0 1px var(--hair)}
.ct-vals{display:grid;grid-template-columns:max-content 1fr;gap:8px 24px;margin-top:20px;align-items:baseline}
.ct-vals>div{display:contents}
.ct-vals dt{font:500 12px/16px var(--chrome);color:var(--quiet)}
.ct-tones{display:grid;gap:16px}
.ct-tones li{display:grid;grid-template-columns:48px 1fr auto;gap:16px;align-items:center}
.ct-tone__n{font:500 14px/20px var(--body);color:var(--ink)}
.ct-tone__x{font:400 14px/22px var(--body);color:var(--soft);text-wrap:pretty}
.ct-pairs{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:var(--gap)}
.ct-pair{display:grid;align-content:space-between;gap:24px;min-height:144px;padding:16px;border-radius:2px}
.ct-pair__r{font:${ctx.weights.heading} 32px/1 var(--display);font-stretch:${stretch}%;font-variant-numeric:tabular-nums}
.ct-pair__u{font:400 14px/20px var(--body);text-wrap:pretty}
.ct-pair--lg .ct-pair__u{font:${ctx.weights.heading} 24px/30px var(--display);font-stretch:${stretch}%}
.ct-roles{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px var(--gap)}
.ct-roles li{display:grid;grid-template-columns:24px 1fr auto;gap:12px;align-items:center}
.ct-roles__n{font:400 14px/20px var(--body);color:var(--soft)}

/* typography */
.ct-faces{display:grid;gap:40px}
.ct-face{display:grid;gap:8px}
.ct-face__n{color:var(--ink);overflow-wrap:anywhere}
.ct-face--d .ct-face__n{font:${ctx.weights.heading} clamp(40px,5.6cqw,80px)/1.05 var(--display);font-stretch:${stretch}%;letter-spacing:-0.01em}
.ct-face--b .ct-face__n{font:600 clamp(32px,3.6cqw,52px)/1.1 var(--body)}
.ct-face--m .ct-face__n{font:400 clamp(24px,2.6cqw,36px)/1.2 var(--mono)}
.ct-face__c{font:400 18px/28px var(--body);color:var(--soft);overflow-wrap:anywhere}
.ct-face--d .ct-face__c{font-family:var(--display);font-weight:${ctx.weights.heading};font-stretch:${stretch}%}
.ct-face--m .ct-face__c{font-family:var(--mono);font-size:15px}
.ct-face__d{font:400 14px/22px var(--body);color:var(--soft)}
.ct-scale li{display:grid;grid-template-columns:var(--g) minmax(0,1fr);column-gap:var(--gap);align-items:baseline;padding:24px 0;border-top:1px solid var(--hair)}
.ct-scale li:first-child{border-top:0;padding-top:0}
.ct-sc__t{font:500 14px/20px var(--body);color:var(--ink)}
.ct-sc__m{font:400 13px/20px var(--body);color:var(--quiet);text-wrap:pretty}
.ct-sc__s{font-family:var(--body);font-size:calc(var(--size) * 1px);color:var(--ink);max-width:60ch;text-wrap:pretty;overflow-wrap:anywhere}
.ct-sc__s--d{font-family:var(--display);font-stretch:${stretch}%;letter-spacing:-0.01em;text-wrap:balance;max-width:none}
.ct-tester{display:grid;gap:24px}
.ct-tester__ctl{display:grid;grid-template-columns:minmax(0,1fr) minmax(200px,280px);gap:16px var(--gap);align-items:end}
.ct-fld{display:grid;gap:8px}
.ct-in{appearance:none;width:100%;min-width:0;height:44px;padding:0 12px;border:1px solid var(--line);border-radius:2px;background:transparent;color:var(--ink);font:400 16px/1 var(--body)}
.ct-in:focus-visible{outline:2px solid var(--focus);outline-offset:1px}
.ct-range{display:block;width:100%;height:44px;margin:0;accent-color:var(--ink);cursor:pointer}
.ct-tester__out{padding:24px;border-radius:2px;background:var(--panel);font:${ctx.weights.heading} var(--tester-size,72px)/1.08 var(--display);font-stretch:${stretch}%;letter-spacing:-0.01em;color:var(--ink);overflow-wrap:anywhere;text-wrap:balance}
.ct-inuse{display:grid;gap:16px}
.ct-inuse__h{font:${ctx.weights.heading} clamp(32px,4cqw,56px)/1.08 var(--display);font-stretch:${stretch}%;letter-spacing:-0.01em;color:var(--ink);text-wrap:balance}
.ct-inuse__c{font:400 12px/18px var(--body);color:var(--quiet)}
.ct-rules li{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:var(--gap);padding:16px 0;border-top:1px solid var(--hair)}
.ct-rules li:first-child{border-top:0;padding-top:0}
.ct-rules p{font:400 16px/24px var(--body);color:var(--ink);text-wrap:pretty}
.ct-rules .ct-rules__dont{color:var(--soft)}
.ct-rules .ct-lab{display:block;margin-bottom:4px}

/* imagery */
.ct-dir{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:32px var(--gap)}
.ct-dir dt{font:500 12px/16px var(--chrome);color:var(--quiet)}
.ct-dir dd{margin-top:6px;font:400 16px/26px var(--body);color:var(--ink);text-wrap:pretty;max-width:52ch}
.ct-brief{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;border:2px dashed var(--line);border-radius:2px;background:var(--sunk);color:var(--ink);text-align:center}
.ct-brief__t{font:600 12px/16px var(--chrome);font-stretch:75%;letter-spacing:.04em;text-transform:uppercase}
.ct-brief__n{font:400 13px/18px var(--mono);color:var(--soft)}
.ct-pr__b{margin-top:12px}
.ct-shot{position:relative;aspect-ratio:3/2;overflow:hidden;border-radius:2px;background:var(--film)}
.ct-shot>:not(.ct-img){position:absolute;inset:0;width:100%;height:100%}
.ct-shot::after{content:"";position:absolute;inset:0;border-radius:inherit;box-shadow:inset 0 0 0 1px oklch(0 0 0 / .1);pointer-events:none}
[data-theme="dark"] .ct-shot::after{box-shadow:inset 0 0 0 1px oklch(1 0 0 / .1)}

/* layout */
.ct-pg{display:block;width:100%;height:auto}
.ct-pg__p{fill:var(--panel);stroke:var(--line);stroke-width:1;vector-effect:non-scaling-stroke}
.ct-pg__c{fill:var(--sunk)}
.ct-pg__m{fill:none;stroke:var(--quiet);stroke-width:1;stroke-dasharray:4 4;vector-effect:non-scaling-stroke}
.ct-meas{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px var(--gap)}
.ct-meas dt{font:500 12px/16px var(--chrome);color:var(--quiet)}
.ct-meas dd{margin-top:4px;font:${ctx.weights.heading} 28px/32px var(--display);font-stretch:${stretch}%;font-variant-numeric:tabular-nums;color:var(--ink)}
.ct-space{display:flex;flex-wrap:wrap;align-items:flex-end;gap:16px 24px}
.ct-space li{display:grid;justify-items:start;gap:8px}
.ct-space i{display:block;background:var(--ink)}
.ct-space .ct-mono{font-size:13px;line-height:16px;color:var(--soft)}
.ct-radii{display:flex;flex-wrap:wrap;gap:24px 40px}
.ct-radii li{min-width:96px}
.ct-radii i{display:block;width:96px;height:64px;border:1px solid var(--ink)}

/* applications: two prints a row, each with its caption beneath */
.ct-plates{margin-top:72px;row-gap:56px}
.ct-plate{grid-column:span 3;min-width:0;display:grid;gap:16px;align-content:start}
.ct-plate .ct-plate__f{grid-column:auto;margin:0}

/* downloads */
.ct-kit{border:0;gap:12px;color:var(--edge)}
.ct-kit__n{font:500 16px/24px var(--body);color:var(--edge);overflow-wrap:anywhere}
.ct-kit__s{font-size:14px;line-height:20px;color:var(--edge)}
.ct-btn--p{height:44px;margin-top:8px;padding:0 20px;border-color:var(--act);background:var(--act);color:var(--act-ink);font-size:15px}
@media (hover:hover){.ct-btn--p:not(.is-copied):hover{background:var(--act-h);border-color:var(--act-h)}}
.ct-btn--p:active{background:var(--act-p)}
.ct-files li{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:16px;align-items:center;padding:10px 0;border-top:1px solid var(--hair)}
.ct-files li:first-child{border-top:0;padding-top:0}
.ct-file__n{font:500 14px/20px var(--body);color:var(--ink);overflow-wrap:anywhere}
.ct-file__s{font-size:13px;line-height:20px;color:var(--quiet)}
.ct-files .ct-pr__dl{grid-column:2 / span 2;flex-wrap:wrap;justify-content:flex-end;margin:0}
.ct-icons{display:grid;grid-template-columns:repeat(auto-fill,minmax(148px,1fr));gap:8px;margin-bottom:16px}
.ct-icon{display:flex;align-items:center;gap:8px;min-height:44px;padding:6px 10px;border:1px solid var(--hair);border-radius:2px;color:var(--ink);font:400 13px/16px var(--body);text-decoration:none;transition:background-color 150ms ease-out}
.ct-icon svg{flex:none;width:20px;height:20px}
.ct-icon span{min-width:0;overflow-wrap:anywhere}
@media (hover:hover){.ct-icon:hover{background:var(--sunk)}}

@media (min-width:841px) and (max-width:1180px){
.bk-nav a{padding:8px 4px;gap:4px;font-size:12px}
.bk-top{gap:12px}
}
@media (max-width:840px){
.bk-top{height:56px;padding:0 16px;gap:8px;flex-wrap:wrap}
.bk-brand{width:104px;margin-right:auto}
.bk-menu{display:inline-flex;align-items:center}
.bk-nav{display:none;order:9;flex-basis:100%;margin:0 -16px;padding:8px 16px 16px;background:var(--ground);border-bottom:1px solid var(--hair)}
.bk-top[data-open="true"]{height:auto;padding-top:10px}
.bk-top[data-open="true"] .bk-nav{display:block}
.bk-nav ol{flex-direction:column;gap:0}
.bk-nav a{padding:12px 0;font-size:15px;line-height:20px;box-shadow:none}
.bk-nav a[aria-current]{box-shadow:inset 2px 0 0 var(--ink);padding-left:12px}
.bk-mode button{padding:0 10px}
.bk-foot{flex-direction:column;gap:4px;margin:0 16px}
.bk-live{right:16px;bottom:16px}
.ct-sec{padding:48px 16px 24px}
.ct-sec--first{padding-top:32px}
.ct-grid,.ct-roll{--g:29.915cqw;--gap:3.4188cqw;--cut:1.7094cqw}
.ct-grid{grid-template-columns:1fr}
.ct-roll{flex-direction:column;gap:8px}
.ct-strip+.ct-strip{box-shadow:none}
.ct-ep--w{display:none}.ct-ep--n{display:block}
.ct-no--c{visibility:hidden}
.ct-open{margin-top:32px;row-gap:24px}
.ct-enl,.ct-cap,.ct-k,.ct-m,.ct-mw,.ct-s{grid-column:1}
.ct-head{grid-template-columns:1fr;margin-bottom:32px;gap:24px}
.ct-meta{gap:24px;padding-bottom:0}
.ct-row{margin-top:48px}
.ct-traits li,.ct-habits li{grid-template-columns:1fr;row-gap:4px}
.ct-trait{font-size:32px;line-height:36px}
.ct-lead{font-size:24px;line-height:32px}
.ct-mf{grid-column:1}
.ct-prints{grid-template-columns:repeat(2,minmax(0,1fr));gap:24px 12px}
.ct-ts{flex-direction:column}
.ct-tf{flex:none;min-height:calc(56px + var(--share) * 160px)}
.ct-tf__b{grid-template-columns:1fr auto;grid-template-rows:auto 1fr;padding:12px 16px}
.ct-tf__p{grid-column:2;grid-row:1 / span 2;align-self:start;font-size:32px}
.ct-roles{grid-template-columns:1fr}
.ct-scale li,.ct-rules li{grid-template-columns:1fr;row-gap:8px}
.ct-sc__s--d{font-size:min(calc(var(--size) * 1px),12cqw)}
.ct-tester__ctl,.ct-dir{grid-template-columns:1fr}
.ct-tester__out{padding:16px;font-size:min(var(--tester-size,72px),14cqw)}
.ct-face__c{font-size:16px;line-height:24px}
.ct-plates{margin-top:48px;row-gap:40px}
.ct-plate{grid-column:1}
.ct-files li{grid-template-columns:minmax(0,1fr) auto;row-gap:4px}
.ct-file__s{grid-column:1;grid-row:2}
.ct-files .ct-dl{grid-column:2;grid-row:1 / span 2}
.ct-files .ct-pr__dl{grid-column:1 / -1;justify-content:flex-start}
}
${headerFix(ctx)}
`;
}
