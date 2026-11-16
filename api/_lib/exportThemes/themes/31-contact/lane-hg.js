// Theme 31, Contact sheet: lane hg, the guidelines website (guideSite). The site is the contact sheet the guidelines were shot on.
// Every guideline page is a frame of one roll (frame 01 is the first page, frame 31 the last). Each page opens with a strip of the six
// frames around it, this one circled in grease pencil; the enlargement of the circled frame hangs under it on gates 2 to 4, and the caption
// column (frame number, section, the page title, a lede) sits on gates 5 and 6. The long read runs on in the same frame grid. The front
// page prints the whole roll as the contents. Light mode is the paper (roles.light), dark mode the darkroom (roles.dark); the film is film in both.
// Colours come from ctx roles and brand data; no brand colour id, hex or name is written here.
import { A, tokens, palette, cwOn, frameLabel, loopPath } from './helpers.js';
import { renderUrl, fillBox, photoScene, photoShot, SCENE } from './arts.js';
import { GUIDE_PAGES } from '../../engine/pages.js';
import { hgCss } from './lane-hg-css.js';

const r2 = (n) => Math.round(n * 100) / 100;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const pad2 = (n) => String(n).padStart(2, '0');
const pct = (n) => `${r2(n * 100)}%`;
const isSlot = (ctx) => ctx.edition === 'slot';
const M = (t) => `<span class="hg-m">${A(t)}</span>`;

// the roll: every guideline page in order, numbered from frame 01
const ROLL = GUIDE_PAGES.filter((p) => p.section);
const NO = Object.fromEntries(ROLL.map((p, i) => [p.id, i + 1]));
const PAGE = Object.fromEntries(GUIDE_PAGES.map((p) => [p.id, p]));
const titleOf = (id) => (PAGE[id] ? PAGE[id].title : id);
const sectionOf = (id) => (PAGE[id] && PAGE[id].section ? PAGE[id].section.title : '');
const firstOfSection = (id) => { const i = ROLL.findIndex((p) => p.id === id); return i === 0 || (i > 0 && ROLL[i - 1].section.title !== ROLL[i].section.title); };

// ---- exposures: what each frame holds, made once and printed at any size (container units of the frame) ------------------------
function sceneImg(ctx, setup, alt) {
  const S = ctx.sceneInfo(SCENE[setup] || setup), q = S.quads[0].corners;
  const cx = q.reduce((s, p) => s + p[0], 0) / q.length / S.w, cy = q.reduce((s, p) => s + p[1], 0) / q.length / S.h;
  const r = S.w / S.h / 1.5;
  let pos = '50% 50%';
  if (r > 1 + 1e-6) pos = `${r2(clamp01((0.5 - cx * r) / (1 - r)) * 100)}% 50%`;
  else if (r < 1 - 1e-6) { const k = 1 / r; pos = `50% ${r2(clamp01((0.5 - cy * k) / (1 - k)) * 100)}%`; }
  return `<span class="hg-img hg-plate">${fillBox(renderUrl(ctx, setup), S, pos, alt)}</span>`;
}
const blank = (label) => `<div class="hg-slot"><span class="hg-edge">${A(label)}</span></div>`;
function photoImg(ctx, k) {
  const s = photoShot(ctx, k);
  if (!s) return blank('Your photo');
  const sc = photoScene(ctx, s);
  return sc ? sceneImg(ctx, sc, s.alt) : ctx.photo(s.id, { cls: 'hg-img' });
}
function photoCap(ctx, k) {
  const s = photoShot(ctx, k);
  return s ? { title: s.caption || s.alt, text: s.credit && !s.generated ? `Photo: ${s.credit}.` : '' } : { title: 'Your photograph', text: 'This frame holds your own photograph once it is in.' };
}
// what a mockup frame shows (the book's captions, by setup)
function sceneCap(ctx, setup) {
  const B = ctx.brand, P = palette(ctx), title = B.ui && B.ui.screen ? B.ui.screen.title : B.name;
  return ({
    poster: { title: 'Poster in a black frame, studio corner', text: `The primary line at poster size, on ${P.dark.name}.` },
    night: { title: 'Poster on brick, at night', text: `The line at poster size, on ${P.action.name}.` },
    sheets: { title: 'Three sheets, gallery wall', text: `The three lines at A1, on ${P.dark.name}, ${P.light.name} and ${P.action.name}.` },
    app: { title: 'Phone on travertine', text: `${title}, in the app's dark theme.` },
    laptop: { title: 'Laptop on a night desk', text: `${title} at desktop width, in the dark theme.` },
    book: { title: 'Portfolio book, in hand', text: `The stacked logo on ${(P.panel || P.dark).name} cloth.` },
    tote: { title: 'Print bag on the studio hook', text: `The stacked logo on ${P.dark.name} canvas.` },
    card: { title: 'Cards on the box-office sill', text: `The front on ${P.dark.name}, the back on ${P.light.name}.` },
    letter: { title: 'Print order letter on linen', text: `${B.fonts.body.family} for the letter, ${B.fonts.display.family} for the one line that matters.` },
    lightbox: { title: 'The studio sheet under the loupe', text: `A4 landscape on ${P.light.name}.` },
  })[setup];
}

// a logo inside a 3:2 print: as wide as fits 60% of the width and 42% of the height
const lgFit = (ctx, id) => { const g = ctx.logo.geos[id] || { w: ctx.logo.geo.width, h: ctx.logo.geo.height }; return { w: Math.min(0.6, (0.42 / 1.5) * g.w / g.h), ar: `${r2(g.w)}/${r2(g.h)}` }; };
const logoIn = (ctx, id, k, scale = 1, cls = '') => {
  const f = lgFit(ctx, id), w = ctx.brand.logo.colourways[k];
  return `<span class="hg-lg ${cls}" style="width:${pct(f.w * scale)};aspect-ratio:${f.ar}">${ctx.logo.html(id, { width: 240, colourway: k, color: w.name, label: 'Logo' })}</span>`;
};
const onGround = (bg, fg, inner, cls = '') => `<div class="hg-xg ${cls}" style="background:${bg};color:${fg}">${inner}</div>`;
const near = (ctx, hex) => `${ctx.ratio(hex, ctx.roles.light.surface) < 1.3 ? ' is-near-l' : ''}${ctx.ratio(hex, ctx.roles.dark.surface) < 1.3 ? ' is-near-d' : ''}`;
const sortedCols = (ctx) => ctx.colours.map((c, i) => ({ ...c, i })).sort((a, b) => b.share - a.share || a.i - b.i);
const lineOn = (ctx, bg, text, cls = '') => onGround(bg, palette(ctx).inkOn(bg), `<p class="hg-xline ${cls}">${A(text)}</p>`);

// each page's frame: { html, cap } (html is the frame's inner, drawn in the frame's own container units)
function expo(ctx, id) {
  const B = ctx.brand, P = palette(ctx), L = ctx.logo, cw = B.logo.colourways;
  const scene = (s) => { const c = sceneCap(ctx, s); return { html: sceneImg(ctx, s, c.title), cap: c }; };
  const photo = (k) => ({ html: photoImg(ctx, k), cap: photoCap(ctx, k) });
  const k0 = L.colourwayOf('colour'), w0 = cw[k0], gName = (hex) => (B.colours.find((c) => c.hex.toLowerCase() === hex.toLowerCase()) || {}).name;
  const cols = sortedCols(ctx), F = B.fonts;
  switch (id) {
    case 'intro': return scene('poster');
    case 'personality': return photo(0);
    case 'voice': return photo(1);
    case 'write-this': return { html: lineOn(ctx, P.light.hex, B.voice.writeThis[0].write), cap: { title: 'The first line to write', text: `Set in ${F.display.family} on ${P.light.name}.` } };
    case 'messaging': return scene('sheets');
    case 'logo': return scene('book');
    case 'logo-versions': return { html: `<div class="hg-xrow">${['colour', 'reversed'].map((v) => { const k = L.colourwayOf(v); return onGround(cw[k].ground, cw[k].name, logoIn(ctx, v, k, 1.5)); }).join('')}</div>`, cap: { title: `${L.labels.colour} and ${L.labels.reversed.toLowerCase()}`, text: 'Two of the versions, each on the ground it is made for.' } };
    case 'clear-space': { const g = L.geo, h = g.height / g.width, c = (L.clearShare / 100) * h, W = 1 + 2 * c, H = h + 2 * c, f = lgFit(ctx, 'colour').w * 1.1;
      return { html: onGround(w0.ground, w0.name, `<span class="hg-xclear" style="width:${pct(f * W)};aspect-ratio:${r2(W * 100)}/${r2(H * 100)}"><span class="hg-xclear__lg" style="inset:${pct(c / H)} ${pct(c / W)}">${L.html('colour', { width: 240, colourway: k0, color: w0.name, label: 'Logo' })}</span></span>`), cap: { title: 'The clear band', text: `${L.clearShare}% of the logo's height on every side.` } }; }
    case 'min-size': return { html: onGround(w0.ground, w0.name, logoIn(ctx, 'colour', k0, 0.36)), cap: { title: 'The logo, small', text: isSlot(ctx) ? 'The smallest size is set once the logo is in.' : `${L.minSize.screenPx} px wide on screen, ${L.minSize.printMm} mm in print.` } };
    case 'logo-grounds': { const seen = new Set(), ks = Object.keys(cw).filter((k) => { const g = cw[k].ground.toLowerCase(); if (seen.has(g)) return false; seen.add(g); return true; }).slice(0, 4);
      while (ks.length < 4) ks.push(ks[ks.length % Math.max(1, ks.length)] || k0);
      const names = [...new Set(ks.map((k) => gName(cw[k].ground)).filter(Boolean))];
      return { html: `<div class="hg-xquad">${ks.map((k) => onGround(cw[k].ground, cw[k].name, logoIn(ctx, 'colour', k, 1.4))).join('')}</div>`, cap: { title: 'The logo on each ground', text: names.length ? names.join(', ') + '.' : '' } }; }
    case 'logo-misuse': return { html: onGround(w0.ground, w0.name, `<span class="hg-rj hg-rj--r">${logoIn(ctx, 'colour', k0)}</span>${pencilX(`${ctx.slug || B.slug}:hg-misuse`, 300, 200, tokens(ctx).loop)}`), cap: { title: 'Turned, and crossed out', text: 'The logo is never turned.' } };
    case 'palette': return { html: `<div class="hg-xbands">${cols.map((c) => `<span style="background:${c.hex};color:${P.inkOn(c.hex)}"><b class="hg-xs">${A(c.name)}</b></span>`).join('')}</div>`, cap: { title: `${cols.length} colours`, text: cols.map((c) => c.name).join(', ') + '.' } };
    case 'proportion': return { html: `<div class="hg-xbands hg-xbands--s">${cols.map((c) => `<span style="flex-grow:${r2(c.share * 100)};background:${c.hex};color:${P.inkOn(c.hex)}"><b class="hg-xs">${Math.round(c.share * 100)}%</b></span>`).join('')}</div>`, cap: { title: 'The test strip', text: 'Each colour as wide as its share of a page.' } };
    case 'contrast': { const p = ctx.pairs[0]; return { html: onGround(p.bgHex, p.fgHex, `<p class="hg-xaa">Aa</p>`), cap: { title: p.use, text: 'Set in the pair\u2019s own colours. Every ratio is on its tile below.' } }; }
    case 'colour-values': return scene('tote');
    case 'typefaces': return { html: onGround(P.light.hex, P.inkOn(P.light.hex), `<p class="hg-xaa hg-xaa--d">Aa</p><p class="hg-xaa hg-xaa--b">Aa</p>`), cap: { title: `${F.display.family} and ${F.body.family}`, text: 'The display face and the text face, side by side.' } };
    case 'hierarchy': { const T = B.type.sample; return { html: onGround(P.light.hex, P.inkOn(P.light.hex), `<div class="hg-xh${ctx.placeholders ? ' ph-tight' : ''}"><p class="hg-xh__1">${A(T.headline)}</p><p class="hg-xh__2 hg-xs">${A(T.caption)}</p></div>`), cap: { title: 'Headline over paragraph', text: `${B.type.scale.length} sizes, from ${B.type.scale[0].size} px down.` } }; }
    case 'type-in-use': return scene('letter');
    case 'type-rules': return { html: lineOn(ctx, P.dark.hex, B.type.sample.headline), cap: { title: 'The headline sample', text: `${F.display.family} on ${P.dark.name}.` } };
    case 'photo-direction': return photo(2);
    case 'shot-list': { const shots = B.imagery.shots || [], got = shots.filter((s) => s.photo).length;
      const cell = (s) => (s.photo && !isSlot(ctx) ? `<span class="hg-xm">${ctx.photo(s.id, { cls: 'hg-img' })}</span>` : '<span class="hg-xm hg-xm--b"><b class="hg-xs">To shoot</b></span>');
      return { html: onGround(P.light.hex, P.inkOn(P.light.hex), `<span class="hg-xmos">${shots.map(cell).join('')}</span>`), cap: { title: `${shots.length} shots`, text: isSlot(ctx) ? 'Each frame is a brief until the photograph is in.' : got === shots.length ? 'Every shot is taken.' : `${got} taken, ${shots.length - got} still to shoot.` } }; }
    case 'imagery-rules': return photo(4);
    case 'grid': { const G = ctx.gridMeasures, Pg = G.page;
      return { html: onGround(P.light.hex, P.inkOn(P.light.hex), `<div class="hg-xgrid" style="inset:${pct(G.margin / Pg.h)} ${pct(G.margin / Pg.w)};column-gap:${pct(G.gutter / (Pg.w - 2 * G.margin))};grid-template-columns:repeat(${G.columns},1fr)">${'<i></i>'.repeat(G.columns)}</div>`), cap: { title: `${G.columns} columns`, text: `${G.margin} px margins and ${G.gutter} px gutters.` } }; }
    case 'layouts': return scene('lightbox');
    case 'business-card': return scene('card');
    case 'social': return scene('app');
    case 'signage': return scene('night');
    case 'email-signature': { const E = B.applications.email; return { html: onGround(P.light.hex, P.inkOn(P.light.hex), `<div class="hg-xsig"><p class="hg-xsig__n">${A(E.person)}</p><p class="hg-xs">${A(E.role)}, ${A(B.name)}</p></div>`), cap: { title: 'The signature', text: `${E.person}, ${E.role}.` } }; }
    case 'digital': return scene('laptop');
    case 'summary': return photo(5);
    case 'contact-scope': return { html: onGround(w0.ground, w0.name, logoIn(ctx, 'colour', k0, 1.4)), cap: { title: B.contact.owner, text: B.contact.email } };
    default: return { html: blank(titleOf(id)), cap: { title: titleOf(id), text: '' } };
  }
}

// the pencil X on a reject: two tapered strokes of a wax pencil, each one pass, bowed a little
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
  return `<svg class="hg-x" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">${stroke(w * (0.13 + j()), h * (0.15 + j()), w * (0.87 + j()), h * (0.85 + j()))}${stroke(w * (0.85 + j()), h * (0.13 + j()), w * (0.15 + j()), h * (0.87 + j()))}</svg>`;
}

// ---- the strip ------------------------------------------------------------------------------------------------------------------
// frames: up to six { id, href } (null: plain film). Each frame links to its page; the page title sits under the film on the paper.
// Edge print: a section's name over its first frame; the brand line and the stock code where the film is free (wide only).
function strip(ctx, frames, { current, draw = false, stockNo = 1 } = {}) {
  const B = ctx.brand, slug = ctx.slug || B.slug, cache = strip.cache || (strip.cache = new WeakMap());
  if (!cache.has(ctx)) cache.set(ctx, {});
  const ex = cache.get(ctx), exOf = (id) => ex[id] || (ex[id] = expo(ctx, id));
  const holes = '<svg class="hg-holes hg-holes--t" aria-hidden="true"><rect width="100%" height="17" fill="url(#hg-hole)"/></svg><svg class="hg-holes hg-holes--b" aria-hidden="true"><rect width="100%" height="17" fill="url(#hg-hole)"/></svg>';
  const tri = '<i class="hg-tri"></i>';
  const edge = (at, html, cls = '') => `<span class="hg-ep ${cls}" style="--at:${at}" aria-hidden="true">${html}</span>`;
  const cell = (f) => {
    if (!f) return '<div class="hg-fr hg-fr--e" aria-hidden="true"><span class="hg-gw"><span class="hg-gate hg-gate--e"></span></span></div>';
    const me = f.id === current, no = NO[f.id];
    const loop = me ? `<svg class="hg-loop${draw ? ' hg-loop--draw' : ''}" viewBox="495 52 276 212" preserveAspectRatio="none" aria-hidden="true"><path d="${loopPath(slug, 'site-' + f.id)}"/></svg>` : '';
    return `<a class="hg-fr" href="${A(f.href)}" aria-label="Frame ${pad2(no)}, ${A(titleOf(f.id))}"${me ? ' aria-current="page"' : ''}><span class="hg-gw" aria-hidden="true"><span class="hg-gate"><span class="hg-xc">${exOf(f.id).html}</span></span>${loop}<span class="hg-no">${frameLabel(no)}${tri}</span></span><span class="hg-ti">${A(titleOf(f.id))}</span></a>`;
  };
  const half = (k) => {
    const fs = frames.slice(k * 3, k * 3 + 3);
    while (fs.length < 3) fs.push(null);
    const starts = fs.map((f) => !!(f && firstOfSection(f.id)));
    let eps = fs.map((f, i) => (starts[i] ? edge(i, A(sectionOf(f.id))) : '')).join('');
    if (k === 0 && !starts[0] && !starts[1]) eps += edge(0, `${A(B.name)} brand guidelines ${A(B.version.number)}`, 'hg-ep--w');
    else if (k === 1 && !starts[0]) eps += edge(0, `${A(B.name)} 400${tri}${pad2(stockNo)}A`, 'hg-ep--w');
    return `<div class="hg-half${current && frames.some((f) => f && f.id === current) && !fs.some((f) => f && f.id === current) ? " hg-half--x" : ""}">${holes}${eps}${fs.map(cell).join('')}</div>`;
  };
  return `<div class="hg-roll">${half(0)}${half(1)}</div>`;
}

// ---- the long read --------------------------------------------------------------------------------------------------------------
const row = (name, main, side = '', { wide = false, full = false, cls = '' } = {}) => `<div class="hg-grid hg-row ${cls}"><h2 class="hg-k">${name}</h2><div class="${full ? 'hg-mf' : wide ? 'hg-mw' : 'hg-mm'}">${main}</div>${side && !wide && !full ? `<div class="hg-s">${side}</div>` : ''}</div>`;
const p = (t, cls = '') => `<p class="hg-p ${cls}">${A(t)}</p>`;
const note = (t) => `<p class="hg-note">${t}</p>`;
const lab = (t) => `<span class="hg-lab">${t}</span>`;
const rulesList = (list) => `<ul class="hg-rules">${list.map((r) => `<li><p>${lab('Do')} ${A(r.do)}</p><p class="hg-rules__dont">${lab('Don&rsquo;t')} ${A(r.dont)}</p></li>`).join('')}</ul>`;
const dlist = (pairs, cls = 'hg-dl') => `<dl class="${cls}">${pairs.map(([k, v]) => `<div><dt>${A(k)}</dt><dd>${v}</dd></div>`).join('')}</dl>`;
const prints = (items) => `<ul class="hg-prints">${items.join('')}</ul>`;
const printLi = (inner, name, text = '', style = '', cls = '') => `<li class="hg-pr"><div class="hg-print ${cls}" style="${style}">${inner}</div><p class="hg-pr__n">${name}</p>${text ? `<p class="hg-pr__x">${text}</p>` : ''}</li>`;
const rgbOf = (ctx, hex) => { const [r, g, b] = ctx.C.hexToRgb(hex); return `rgb(${r}, ${g}, ${b})`; };
const chip = (ctx, hex, cls = '') => `<span class="hg-chip ${cls}${near(ctx, hex)}" style="background:${hex}" aria-hidden="true"></span>`;
const WEIGHT = { 100: 'Thin', 200: 'Extra light', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'Semibold', 700: 'Bold', 800: 'Extra bold', 900: 'Black' };

// each page: { lede, body }
function content(ctx, id) {
  const B = ctx.brand, L = ctx.logo, cw = B.logo.colourways, P = palette(ctx), F = B.fonts, Ty = B.type, D = B.imagery.direction, Ap = B.applications;
  const k0 = L.colourwayOf('colour'), w0 = cw[k0], slot = isSlot(ctx);
  const colName = (hex) => (B.colours.find((c) => c.hex.toLowerCase() === hex.toLowerCase()) || {}).name;
  const logoPrint = (v, k, name, text = '', extra = '') => printLi(logoIn(ctx, v, k) + extra, A(name), text ? A(text) : '', `background:${cw[k].ground};color:${cw[k].name}`, near(ctx, cw[k].ground).trim());
  const cols = sortedCols(ctx);
  const lineList = (ls) => `<ul class="hg-lines">${ls.map((l) => `<li>${A(l)}</li>`).join('')}</ul>`;
  const words = (list) => (list.length > 1 ? `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}` : list.join(''));
  switch (id) {
    case 'intro': return { lede: B.description, body: row('What we do', `<p class="hg-lead">${A(B.product)}</p>`, p(B.voice.boilerplate25))
      + row('Who it is for', p(B.audience, 'hg-p--l')) + row('The line', `<p class="hg-big">${A(B.lines.primary)}</p>`, lineList(B.lines.others)) };
    case 'personality': return { lede: `${words(B.personality.map((t) => t.trait))}.`, body: row('How we behave', `<ol class="hg-traits">${B.personality.map((t) => `<li><p class="hg-trait">${A(t.trait)}</p><p class="hg-p">${A(t.means)}</p></li>`).join('')}</ol>`, '', { wide: true }) };
    case 'voice': return { lede: B.voice.boilerplate25, body: B.voice.principles.map((v, i) => row(A(v.title), `<p class="hg-quote">${A(v.example)}</p>`, '', { cls: i ? 'hg-row--n' : '' })).join('')
      + row('The name', p(B.voice.nameRules, 'hg-p--l')) };
    case 'write-this': return { lede: 'Write the first line. Never the second.', body: row('Lines', `<ul class="hg-wtn">${B.voice.writeThis.map((w) => `<li><p class="hg-wtn__w">${lab('Write')} ${A(w.write)}</p><p class="hg-wtn__n">${lab('Not')} ${A(w.not)}</p><p class="hg-wtn__b">${A(w.because)}</p></li>`).join('')}</ul>`, '', { wide: true }) };
    case 'messaging': return { lede: 'The lines and the boilerplate, to use as written.', body: row('The line', `<p class="hg-big">${A(B.lines.primary)}</p>`)
      + row('More lines', lineList(B.lines.others)) + row('In 25 words', p(B.voice.boilerplate25, 'hg-p--l')) + row('In 50 words', p(B.voice.boilerplate50, 'hg-p--l')) };
    case 'logo': return { lede: B.logo.idea, body: row('The logo', `<div class="hg-print hg-print--big${near(ctx, w0.ground)}" style="background:${w0.ground};color:${w0.name}">${logoIn(ctx, 'colour', k0)}</div>`, B.logo.when.colour ? p(B.logo.when.colour) : '')
      + row('The name', p(B.voice.nameRules)) };
    case 'logo-versions': return { lede: `${L.versions.length} versions, each printed on the ground it is made for.`, body: row('The versions', prints(L.versions.map((v) => logoPrint(v, L.colourwayOf(v), L.labels[v], B.logo.when[v] || ''))), '', { full: true }) };
    case 'clear-space': { const g = L.geo, h = g.height / g.width, c = (L.clearShare / 100) * h, W = 1 + 2 * c, H = h + 2 * c;
      const clear = `<div class="hg-clear" style="aspect-ratio:${r2(W * 100)}/${r2(H * 100)}"><span class="hg-clear__lg" style="inset:${pct(c / H)} ${pct(c / W)}">${logoBoth(ctx, 'colour')}</span></div>`;
      return { lede: `Keep ${L.clearShare}% of the logo's height clear on every side.`, body: row('Clear space', clear, p('The dashed line is the edge of the clear band. Nothing else comes inside it.')) }; }
    case 'min-size': { const ms = L.minSize;
      const main = slot ? p('Set the smallest size once the logo is in, at the width where every part of it still reads as one mark.', 'hg-p--l')
        : `<div class="hg-min" style="width:${ms.screenPx}px">${logoBoth(ctx, 'colour')}</div><p class="hg-p hg-p--l">${M(`${ms.screenPx} px`)} wide on screen, ${M(`${ms.printMm} mm`)} in print. Never smaller.</p>`;
      // a brand with a small mark: shown at actual size on both grounds, with the rule for using it
      const smalls = slot || !L.small ? '' : row(`Below ${L.small.belowPx} px`, `<p class="hg-p hg-p--l">Below ${M(`${L.small.belowPx} px`)}, use the small mark. Its notches are deeper and its sheet heavier.</p><ul class="hg-smalls">${[16, 24, 32, 48, 96].map((s) => `<li><span class="hg-small" style="width:${s}px">${logoBoth(ctx, 'small')}</span>${M(`${s}`)}</li>`).join('')}</ul>`, note('Printed here at their real screen sizes.'));
      return { lede: 'The smallest the logo goes, on screen and in print.', body: row('Smallest size', main, note('Printed here at its real screen size.')) + smalls }; }
    case 'logo-grounds': { const ks = Object.keys(cw);
      const nm = (k) => { const g = colName(cw[k].ground), lb = /^on-/.test(k) ? '' : (L.labels[k] || ctx.cap(k.replace(/-/g, ' '))); return g ? (lb ? `${lb}, on ${g}` : `On ${g}`) : (lb || ctx.cap(k.replace(/-/g, ' '))); };
      const items = ks.map((k) => logoPrint('colour', k, nm(k), B.logo.when[k] || ''));
      const s = photoShot(ctx, 0), kp = cwOn(ctx, P.dark.hex);
      const onPhoto = s ? `<li class="hg-pr"><div class="hg-print hg-print--ph">${photoImg(ctx, 0)}${logoIn(ctx, 'colour', kp, 0.8, 'hg-lg--ph')}</div><p class="hg-pr__n">On a photograph</p><p class="hg-pr__x">On the quietest part of the frame, never across a face.</p></li>` : '';
      return { lede: 'The logo on each brand ground, and on a photograph.', body: row('Grounds', prints([...items, onPhoto]), '', { full: true }) }; }
    case 'logo-misuse': { const fill = slot ? w0.name : (B.colours.filter((x) => ![w0.ground, w0.name].map((v) => v.toLowerCase()).includes(x.hex.toLowerCase())).sort((a, b) => ctx.ratio(b.hex, w0.ground) - ctx.ratio(a.hex, w0.ground))[0] || {}).hex || w0.name;
      const st = `background:${w0.ground};color:${w0.name}`, T = tokens(ctx), f = lgFit(ctx, 'colour');
      const rj = (key, inner, text) => printLi(inner + pencilX(`${ctx.slug || B.slug}:${key}`, 300, 200, T.loop), text, '', st, near(ctx, w0.ground).trim());
      return { lede: 'Three things never to do to the logo.', body: row('Never', prints([
        rj('stretch', `<span class="hg-rj hg-rj--s">${logoIn(ctx, 'colour', k0)}</span>`, 'Don&rsquo;t stretch or squash it.'),
        rj('recolour', `<span class="hg-lg" style="width:${pct(f.w)};aspect-ratio:${f.ar}">${L.forMisuse(240, { fill })}</span>`, 'Don&rsquo;t recolour it outside the versions.'),
        rj('rotate', `<span class="hg-rj hg-rj--r">${logoIn(ctx, 'colour', k0)}</span>`, 'Don&rsquo;t turn it.'),
      ]), '', { full: true }) }; }
    case 'palette': return { lede: `${cols.length} colours. Each one has a job.`, body: cols.map((c, i) => row(A(c.name), `<p class="hg-p hg-p--l">${A(c.lands)}</p>`, `${chip(ctx, c.hex)}${dlist([['Role', A(c.role || '')], ['HEX', M(c.hex)]])}`, { cls: i ? 'hg-row--n' : '' })).join('') };
    case 'proportion': return { lede: 'How much of a page each colour takes.', body: row('Test strip', `<ul class="hg-ts">${cols.map((c) => `<li class="hg-tf${near(ctx, c.hex)}" style="--share:${r2(c.share)};background:${c.hex};color:${P.inkOn(c.hex)}"><span class="hg-tf__n">${A(c.name)}</span><span class="hg-tf__p">${Math.round(c.share * 100)}%</span></li>`).join('')}</ul>`, '', { full: true })
      + row('Shares', `<ul class="hg-shares">${cols.map((c) => `<li><span class="hg-shares__p">${Math.round(c.share * 100)}%</span><span class="hg-shares__n">${A(c.name)}</span></li>`).join('')}</ul>`, note('Each field is as wide as its share of a page.')) };
    case 'contrast': return { lede: `${ctx.pairs.length} text pairs, each set in its own colours, with its contrast ratio.`, body: row('Text pairs', `<ul class="hg-pairs">${ctx.pairs.map((q) => `<li class="hg-pair${near(ctx, q.bgHex)}${q.large ? ' hg-pair--lg' : ''}" style="background:${q.bgHex};color:${q.fgHex}"><p class="hg-pair__r">${A(q.ratioText)}&thinsp;:&thinsp;1</p><p class="hg-pair__u">${A(q.use)}</p></li>`).join('')}</ul>`, '', { full: true }) };
    case 'colour-values': { const roleKeys = [['surface', 'Surface'], ['raised', 'Raised'], ['sunken', 'Sunken'], ['text', 'Text'], ['textSoft', 'Soft text'], ['quiet', 'Quiet text'], ['divider', 'Divider'], ['border', 'Border'], ['action', 'Action'], ['actionLabel', 'Action label'], ['focus', 'Focus']];
      const roles = (mode) => `<ul class="hg-roles">${roleKeys.filter(([k]) => ctx.roles[mode][k]).map(([k, n]) => `<li>${chip(ctx, ctx.roles[mode][k], 'hg-chip--r')}<span class="hg-roles__n">${A(n)}</span>${M(ctx.roles[mode][k])}</li>`).join('')}</ul>`;
      return { lede: 'Every colour in HEX, RGB and OKLCH, then the interface roles for each mode.', body: cols.map((c, i) => row(A(c.name), dlist([['HEX', M(c.hex)], ['RGB', M(rgbOf(ctx, c.hex))], ['OKLCH', M(c.oklch || ctx.C.oklchString(c.hex))], ...(ctx.C.cmykOf(c) ? [['CMYK', M(ctx.C.cmykOf(c))]] : [])], 'hg-vals'), chip(ctx, c.hex), { cls: i ? 'hg-row--n' : '' })).join('')
        + (ctx.tones.length ? row('Tones', `<ul class="hg-tones">${ctx.tones.map((t) => `<li>${chip(ctx, t.hex, 'hg-chip--s')}<div><p class="hg-tone__n">${A(t.name)}</p><p class="hg-tone__x">${A(t.lands || t.role || '')}</p></div>${M(t.hex)}</li>`).join('')}</ul>`, note('Tones are for text and edges, never a field of their own.')) : '')
        + row('Light mode', roles('light'), note('The colour each job takes in the product on the paper.')) + row('Dark mode', roles('dark'), note('The same jobs in the darkroom.')) }; }
    case 'typefaces': { const wn = (f) => f.weights.map((w) => WEIGHT[w] || String(w)).join(', '), chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789';
      const face = (f, cls, role, use) => `<li class="hg-face ${cls}"><p class="hg-face__n">${A(f.family)}</p><p class="hg-face__c" aria-hidden="true">${chars}</p><p class="hg-face__d">${lab(role)} ${A(wn(f))}. ${use}</p></li>`;
      return { lede: `${F.display.family} for the line that matters, ${F.body.family} for everything you read.`, body: row('The faces', `<ul class="hg-faces">${face(F.display, 'hg-face--d', 'Display', 'For the one line that matters.')}${face(F.body, 'hg-face--b', 'Text', 'For everything you read.')}${face(F.mono, 'hg-face--m', 'Mono', 'For a hex, a size or an order number.')}</ul>`, '', { wide: true }) }; }
    case 'hierarchy': { const lh = (l) => (l > 4 ? `${l}px` : String(l));
      return { lede: `${Ty.scale.length} sizes, each set here in its own face.`, body: row('The scale', `<ol class="hg-scale">${Ty.scale.map((s) => { const disp = s.face === 'display', text = disp ? Ty.sample.headline : s.token === 'caption' ? Ty.sample.caption : Ty.sample.paragraph;
        return `<li><div><p class="hg-sc__t">${A(ctx.cap(s.token))}</p><p class="hg-sc__m">${M(`${s.size}/${lh(s.line)}`)} ${A(WEIGHT[s.weight] || String(s.weight))}</p><p class="hg-sc__m">${A(s.use)}</p></div><p class="hg-sc__s${disp ? ' hg-sc__s--d' : ''}" style="--size:${s.size};font-weight:${s.weight};line-height:${lh(s.line)}">${A(text)}</p></li>`; }).join('')}</ol>`, '', { wide: true }) }; }
    case 'type-in-use': return { lede: 'The headline, the paragraph and the caption, at the sizes the scale gives them.', body: row('In use', `<div class="hg-inuse"><p class="hg-inuse__h">${A(Ty.sample.headline)}</p><p class="hg-p">${A(Ty.sample.paragraph)}</p><p class="hg-inuse__c">${A(Ty.sample.caption)}</p></div>`)
      + row('On screen', `<ul class="hg-ui">${ctx.uiType.map((u) => `<li><span class="hg-ui__t">${A(ctx.cap(u.token))}</span>${M(`${u.size}/${u.line}`)}<span class="hg-ui__u">${A(u.use)}</span></li>`).join('')}</ul>`, note('The interface sizes, in pixels.')) };
    case 'type-rules': return { lede: 'What to do with the type, and what not to.', body: row('Rules', rulesList(Ty.rules), '', { wide: true }) };
    case 'photo-direction': return { lede: D.subject, body: row('Direction', dlist([['Light', D.light], ['Crop', D.crop], ['Colour', D.colour], ['People', D.people]].filter(([, v]) => v).map(([k, v]) => [k, A(v)]), 'hg-dir'), '', { wide: true }) };
    case 'shot-list': { const shots = B.imagery.shots;
      const credits = [...new Set(shots.filter((s) => s.photo && !s.generated && s.credit).map((s) => s.credit))];
      const tile = (s, i) => (s.photo ? `<li class="hg-pr"><div class="hg-shot">${ctx.photo(s.id, { cls: 'hg-img', slotNote: false })}</div><p class="hg-pr__n">${A(s.caption || s.alt || '')}</p></li>`
        : `<li class="hg-pr"><div class="hg-shot"><div class="hg-brief"><span class="hg-brief__t">To shoot</span><span class="hg-brief__n">Shot ${i + 1}</span></div></div><p class="hg-pr__x hg-pr__b">${A(s.slot || '')}</p></li>`);
      const got = shots.filter((s) => s.photo).length;
      return { lede: got === shots.length ? `${shots.length} shots, each in the full frame as it was taken.` : `${shots.length} shots: ${got} taken, ${shots.length - got} still to shoot, each with its brief.`, body: row('The shot list', prints(shots.map(tile)) + (credits.length ? `<p class="hg-note">Photo: ${credits.map(A).join(', ')}.</p>` : ''), '', { full: true }) }; }
    case 'imagery-rules': return { lede: 'What to do with a photograph, and what not to.', body: row('Rules', rulesList(B.imagery.rules), '', { wide: true }) };
    case 'grid': { const G = ctx.gridMeasures, Pg = G.page, colW = r2(G.col);
      const cols2 = Array.from({ length: G.columns }, (_, i) => `<rect class="hg-pg__c" x="${r2(G.margin + i * (G.col + G.gutter))}" y="${G.margin}" width="${colW}" height="${Pg.h - 2 * G.margin}"/>`).join('');
      const drawing = `<svg class="hg-pg" viewBox="0 0 ${Pg.w} ${Pg.h}" role="img" aria-label="The page grid: ${G.columns} columns, ${G.margin} pixel margins and ${G.gutter} pixel gutters on a ${Pg.w} by ${Pg.h} page"><rect class="hg-pg__p" x="0" y="0" width="${Pg.w}" height="${Pg.h}"/>${cols2}<rect class="hg-pg__m" x="${G.margin}" y="${G.margin}" width="${Pg.w - 2 * G.margin}" height="${Pg.h - 2 * G.margin}"/></svg>`;
      return { lede: `${G.columns} columns on a ${Pg.w} by ${Pg.h} page, and every gap a step of ${G.base} px.`, body: row('The page grid', drawing, dlist([['Page', `${Pg.w} × ${Pg.h}`], ['Columns', G.columns], ['Margin', `${G.margin} px`], ['Gutter', `${G.gutter} px`], ['Column', `${colW} px`], ['Base', `${G.base} px`]].map(([k, v]) => [k, A(String(v))]), 'hg-meas')) }; }
    case 'layouts': { const space = `<ol class="hg-space">${ctx.space.map((s) => `<li><i style="width:${s.px}px;height:${s.px}px" aria-hidden="true"></i>${M(String(s.px))}</li>`).join('')}</ol>`;
      const radii = `<ul class="hg-radii">${ctx.radii.filter((r) => r.px < 9999).map((r) => `<li><i style="border-radius:${r.px}px" aria-hidden="true"></i><p class="hg-pr__n">${A(ctx.cap(r.use || r.token || ''))}</p><p class="hg-pr__x">${M(`${r.px} px`)}</p></li>`).join('')}</ul>`;
      const plate = (s) => { const c = sceneCap(ctx, s); return `<figure class="hg-plate"><div class="hg-shot">${sceneImg(ctx, s, c.title)}</div><figcaption class="hg-pr__n">${A(c.title)}</figcaption></figure>`; };
      return { lede: 'The spacing steps and the corners every layout is built from.', body: row('Spacing', space, note('Space inside a group is always smaller than the space between groups.'))
        + row('Corners and edges', radii, B.ui && B.ui.border ? note(`Edges are ${A(String(B.ui.border))} px. ${A(B.ui.elevationNote || '')}`) : '')
        + row('Printed up', `<div class="hg-plates">${plate('sheets')}${plate('poster')}</div>`, '', { full: true }) }; }
    case 'business-card': { const C = Ap.card, kd = cwOn(ctx, P.dark.hex), kl = cwOn(ctx, P.light.hex);
      const front = `<div class="hg-card${near(ctx, P.dark.hex)}" style="background:${P.dark.hex};color:${P.inkOn(P.dark.hex)}"><span class="hg-card__lg" style="aspect-ratio:${lgFit(ctx, 'colour').ar}">${L.html('colour', { width: 240, colourway: kd, color: cw[kd].name, label: 'Logo' })}</span><div><p class="hg-card__n">${A(C.person)}</p><p class="hg-card__r">${A(C.role)}</p><p class="hg-card__r">${A(C.contact)}</p></div></div>`;
      const back = `<div class="hg-card hg-card--b${near(ctx, P.light.hex)}" style="background:${P.light.hex};color:${P.inkOn(P.light.hex)}"><span class="hg-card__lg" style="aspect-ratio:${lgFit(ctx, 'colour').ar}">${L.html('colour', { width: 240, colourway: kl, color: cw[kl].name, label: 'Logo' })}</span></div>`;
      return { lede: `The front on ${P.dark.name}, the back on ${P.light.name}.`, body: row('The card', `<div class="hg-cards">${front}${back}</div>`, dlist([['Name', A(C.person)], ['Role', A(C.role)], ['Contact', A(C.contact)]])) }; }
    case 'social': { const gs = [P.dark.hex, P.light.hex, P.action.hex];
      return { lede: 'The lines as posts, each in the full 3:2 frame.', body: row('Posts', prints(Ap.social.map((l, i) => printLi(`<p class="hg-post${ctx.placeholders ? ' ph-tight' : ''}">${A(l)}</p>`, A(colName(gs[i % 3]) ? `On ${colName(gs[i % 3])}` : 'Post'), '', `background:${gs[i % 3]};color:${P.inkOn(gs[i % 3])}`, `hg-print--post${near(ctx, gs[i % 3])}`))), '', { full: true }) }; }
    case 'signage': { const line = [B.lines.primary, ...B.lines.others].find((l) => Ap.signage.includes(l)) || B.lines.primary;
      return { lede: Ap.signage, body: row('The poster', `<div class="hg-print hg-print--sign${near(ctx, P.action.hex)}" style="background:${P.action.hex};color:${P.inkOn(P.action.hex)}"><p class="hg-post hg-post--l">${A(line)}</p></div>`, note(`The line at poster size, on ${A(P.action.name)}.`)) }; }
    case 'email-signature': { const E = Ap.email, G = B.guideB.email;
      const mail = G ? `<div class="hg-mail"><dl class="hg-mail__h"><div><dt>To</dt><dd>${A(G.to)}</dd></div><div><dt>Subject</dt><dd>${A(G.subject)}</dd></div><div><dt>Sent</dt><dd>${A(G.time)}</dd></div></dl>${(G.body || []).map((t) => p(t)).join('')}<div class="hg-sig"><span class="hg-sig__lg">${logoBoth(ctx, 'colour')}</span><p class="hg-sig__n">${A(E.person)}</p><p class="hg-sig__r">${A(E.role)}, ${A(B.name)}</p><p class="hg-sig__r">${A(Ap.site.url)}</p></div></div>` : '';
      return { lede: 'The name, the role, the logo and the site. Nothing else.', body: row('An email', mail, note('The signature sits under every message, in the text face.')) }; }
    case 'digital': { const plate = (s) => { const c = sceneCap(ctx, s); return `<figure class="hg-plate"><div class="hg-shot">${sceneImg(ctx, s, c.title)}</div><figcaption class="hg-pr__n">${A(c.title)}</figcaption><p class="hg-pr__x">${A(c.text)}</p></figure>`; };
      return { lede: `The site and the app: ${Ap.site.url}.`, body: row('On screen', `<div class="hg-plates">${plate('laptop')}${plate('app')}</div>`, '', { full: true }) }; }
    case 'summary': return { lede: B.lines.primary, body: B.guideB.rules.map((r, i) => row(A(r.title), p(r.text, 'hg-p--l'), '', { cls: i ? 'hg-row--n' : '' })).join('')
      + row('The colours', `<ul class="hg-sumc">${cols.map((c) => `<li>${chip(ctx, c.hex, 'hg-chip--s')}<span class="hg-roles__n">${A(c.name)}</span>${M(c.hex)}</li>`).join('')}</ul>`)
      + row('The faces', dlist([['Display', A(F.display.family)], ['Text', A(F.body.family)], ['Mono', A(F.mono.family)]])) };
    case 'contact-scope': return { lede: `Questions about the brand go to the ${B.contact.owner.toLowerCase()}.`, body: row('Contact', `<p class="hg-big">${A(B.contact.owner)}</p><p class="hg-p hg-p--l"><a class="hg-a" href="mailto:${A(B.contact.email)}">${A(B.contact.email)}</a></p>`)
      + row('Version', p(ctx.versionLine, 'hg-p--l')) + row('Scope', p('These guidelines cover the logo, colour, type, imagery, layout and the applications on this site.', 'hg-p--l')) };
    default: return { lede: '', body: '' };
  }
}

// the logo in the colourway for each mode's surface; one shows at a time
const logoOn = (ctx, id, ground) => { const k = cwOn(ctx, ground); return ctx.logo.html(id, { width: 240, colourway: k, color: ctx.brand.logo.colourways[k].name, label: 'Logo' }); };
const logoBoth = (ctx, id) => `<span class="hg-logo hg-for-light">${logoOn(ctx, id, ctx.roles.light.surface)}</span><span class="hg-logo hg-for-dark">${logoOn(ctx, id, ctx.roles.dark.surface)}</span>`;

// ---- the site -------------------------------------------------------------------------------------------------------------------
function unitMap(S) { const m = {}; for (const u of S.units || []) for (const i of (u.ids || [u.id])) m[i] = u; return m; }

export const guideSite = {
  css(ctx) { return hgCss(ctx); },
  shell(ctx, S) {
    const B = ctx.brand, U = unitMap(S), id = S.unit && S.unit.id, href = (pid) => (U[pid] ? U[pid].file : 'index.html');
    const defs = `<svg class="hg-defs" width="0" height="0" aria-hidden="true" focusable="false"><defs><pattern id="hg-hole" patternUnits="userSpaceOnUse" width="29.25" height="17"><rect x="8.625" y="0" width="12" height="17" rx="2.5" fill="${tokens(ctx).hole}"/></pattern></defs></svg>`;
    const toc = `<div class="hg-toc" id="hg-toc" data-open="false"><div class="hg-toc__in"><p class="hg-toc__f"><a class="hg-toc__a" href="index.html"${S.isFront ? ' aria-current="page"' : ''}>Cover and contents</a></p><ol class="hg-toc__l">${(S.sections || []).map((s) => `<li><p class="hg-toc__s">${A(s.title)}</p><ol>${s.units.map((u) => `<li><a class="hg-toc__a" href="${A(u.file)}"${u.id === id && !S.isFront ? ' aria-current="page"' : ''}><span class="hg-toc__n">${pad2(NO[u.id] || 0)}</span>${A(u.title)}</a></li>`).join('')}</ol></li>`).join('')}</ol></div></div>`;
    const top = `<header class="hg-top"><a class="hg-brand" href="index.html" aria-label="${A(B.name)} brand guidelines, cover">${logoBoth(ctx, 'colour')}</a>
<nav class="hg-sites" aria-label="Sites"><a href="index.html" aria-current="true">Guidelines</a><a href="../ui-kit-html/index.html">UI kit</a></nav>
<button type="button" class="hg-btn" data-gs-toggle aria-controls="hg-toc" aria-expanded="false">Contents</button>
<div class="hg-mode" role="group" aria-label="Colour mode"><button type="button" data-mode="light">Light</button><button type="button" data-mode="dark">Dark</button></div></header>`;
    let roll = '';
    if (!S.isFront && NO[id]) {
      const i = NO[id] - 1, from = Math.max(0, Math.min(i - 2, ROLL.length - 6));
      roll = `<nav class="hg-c hg-pstrip" aria-label="Pages around this one">${strip(ctx, ROLL.slice(from, from + 6).map((q) => ({ id: q.id, href: href(q.id) })), { current: id, draw: true, stockNo: NO[id] })}</nav>`;
    }
    const pn = (u, dir) => (u ? `<a class="hg-pn__a hg-pn__a--${dir}" href="${A(u.file)}" rel="${dir}"><span class="hg-lab">${dir === 'prev' ? 'Previous' : 'Next'}</span><span class="hg-pn__t">${NO[u.id] ? `<span class="hg-pn__n">${pad2(NO[u.id])}</span>` : ''}${A(u.title)}</span></a>` : '<span></span>');
    const foot = `<footer class="hg-foot"><div class="hg-c"><nav class="hg-pn" aria-label="Previous and next">${pn(S.prev, 'prev')}${pn(S.next, 'next')}</nav><p class="hg-fine">${A(B.name)} brand guidelines, ${M(ctx.versionLine)}</p></div></footer>`;
    return `<div data-gs-root class="hg">${defs}${top}${toc}<div class="hg-wrap">${roll}<main id="hg-main" class="hg-c" tabindex="-1">${S.body}</main></div>${foot}</div>`;
  },
  front(ctx, S) {
    const B = ctx.brand, U = unitMap(S);
    const all = ROLL.map((q) => ({ id: q.id, href: U[q.id] ? U[q.id].file : 'index.html' }));
    const strips = [];
    for (let i = 0; i < all.length; i += 6) strips.push(strip(ctx, all.slice(i, i + 6), { current: i === 0 ? all[0].id : null, draw: i === 0, stockNo: i + 1 }));
    const meta = `<dl class="hg-meta"><div><dt>Version</dt><dd>${M(B.version.number)}</dd></div><div><dt>Issued</dt><dd>${A(ctx.date)}</dd></div>${B.city ? `<div><dt>From</dt><dd>${A(B.city)}</dd></div>` : ''}</dl>`;
    return `<section class="hg-cover" id="cover" aria-labelledby="hg-h1"><div class="hg-head"><div><div class="hg-stamp">${logoBoth(ctx, 'colour')}</div><h1 class="hg-h1 hg-h1--c" id="hg-h1">${A(B.lines.primary)}</h1></div>${meta}</div><p class="hg-words">${A(B.description)}</p></section>
<section class="hg-contents" id="contents" aria-labelledby="hg-contents-h"><div class="hg-c"><div class="hg-grid hg-ch"><h2 class="hg-k" id="hg-contents-h">Contents</h2><p class="hg-mw hg-note">Every page of the guidelines is a frame on this roll. Open a frame to read its page.</p></div><div class="hg-sheet">${strips.join('')}</div></div></section>`;
  },
  page(ctx, id) {
    const e = expo(ctx, id), c = content(ctx, id), no = NO[id] || 0;
    const cap = `<div class="hg-cap"><p class="hg-fno">${pad2(no)}</p><p class="hg-sect">${A(sectionOf(id))}</p><h1 class="hg-h1">${A(titleOf(id))}</h1>${c.lede ? `<p class="hg-words">${A(c.lede)}</p>` : ''}</div>`;
    const enl = `<figure class="hg-enlf"><div class="hg-enl"><span class="hg-xc">${e.html}</span></div><figcaption class="hg-figc"><span class="hg-figc__t">${A(e.cap.title)}</span>${e.cap.text ? ` ${A(e.cap.text)}` : ''}</figcaption></figure>`;
    return `<div class="hg-grid hg-open">${enl}${cap}</div>${c.body}`;
  },
  adapt: { strip: [], noLink: '.hg-m' },
  darkSample: ['cover', 'palette', 'logo-grounds'],
};
