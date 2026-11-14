// Theme 24, Standards, lane bk: the HTML brand book. The measured manual on the web: every sheet carries a running head, one hero drawn at a
// fixed size per sheet width with its dimension lines in x, hairline registers, and the x-ruler at its foot with the hero's live run marked.
// The device lives in lane-bk-kit.js, the applied pieces in lane-bk-art.js, the site CSS in lane-bk-css.js.
import { A, f2, roles, xOf, outline, capHeight, pairName, slotLabel } from './helpers.js';
import { nearestWeight } from '../../engine/brand.js';
import { BOOK_SECTIONS } from '../../engine/book.js';
import { CW, NO, TITLE, X, tri, sv, topW, dispStyle, fitSize, widest, dfont, dimH, dimV, crop, ruler, tab, cwOn, logoOn, logoMode, copyBtn, valBtn, dl } from './lane-bk-kit.js';
import { SCENES, signArt, signFace, signMm, phone, phoneArt, cardFace, post, cropPct } from './lane-bk-art.js';
import { signScene } from './scene-pick.js';
import { shotHtml, leadShot, leadCaption } from './photo-focus.js';
export { bookCss } from './lane-bk-css.js';

const map3 = (fn) => ({ w: fn('w'), m: fn('m'), n: fn('n') });

// ---- sheet parts ----
function sec(ctx, id, body, { band = '', cls = '' } = {}) {
  return `<section class="bk-sec sd-sec${cls ? ' ' + cls : ''}" id="${id}" aria-labelledby="h-${id}">${band}<div class="sd-sheet">${head(ctx, id)}${body}</div>${tab(NO(id))}</section>`;
}
const head = (ctx, id) => `<div class="sd-rh" aria-hidden="true"><span>${A(ctx.brand.name)} brand standards</span><span>${NO(id)} ${A(TITLE(id))}</span></div>`;
const title = (id, lead) => `<h2 class="sd-h2" id="h-${id}">${A(TITLE(id))}</h2>${lead ? `<p class="sd-lead">${lead}</p>` : ''}`;
const h3 = (no, text) => `<h3 class="sd-h3"><span class="sd-no">${no}</span>${A(text)}</h3>`;
// a register: hairline rows, the first rule in ink. rows: [no, name html, body html, aside html]
const reg = (rows, cls = '') => `<ol class="sd-reg${cls ? ' ' + cls : ''}">${rows.map(([no, nm, bd, as]) => `<li class="sd-row"><span class="sd-no">${no}</span><div class="sd-nm">${nm}</div><div class="sd-bd">${bd || ''}</div>${as ? `<div class="sd-as">${as}</div>` : ''}</li>`).join('')}</ol>`;
// a hero figure: dimH above, dimV to the left (either may be absent), the object
function fig(obj, { h, v, cap = '', cls = '' } = {}) {
  const grid = v ? 'sd-fig sd-fig--v' : 'sd-fig';
  return `<figure class="${grid}${cls ? ' ' + cls : ''}">${v ? '<span></span>' : ''}${h ? dimH(h) : '<span></span>'}${v ? dimV(v) : ''}<div class="sd-obj">${obj}</div>${cap ? `${v ? '<span></span>' : ''}<figcaption class="sd-cap">${cap}</figcaption>` : ''}</figure>`;
}
const live = (off, w) => map3((k) => [off, off + w[k]]);
const lab = (ctx, px) => map3((k) => X(ctx, px[k]));
const mono = (t) => `<span class="sd-mono">${A(t)}</span>`;

// ---- 1 Overview ----
function overview(ctx) {
  const B = ctx.brand, R = roles(ctx), g = ctx.logo.geos.colour, W = { w: 640, m: 480, n: 264 }, H = map3((k) => (W[k] * g.h) / g.w);
  const logo = `<div class="sd-hz" style="${sv('hz', W)}">${logoOn(ctx, 'colour', R.field, 640, B.name + ' logo')}</div>`;
  const band = `<div class="sd-band sd-on-field"><div class="sd-band__in">
<h1 class="sd-h1">${A(B.name)} brand standards</h1><p class="sd-ver">${A(ctx.versionLine)}</p>
${fig(logo, { h: lab(ctx, W), v: lab(ctx, H), cls: 'sd-fig--cover' })}
<p class="sd-coverline">Every size in this book is given in x. One x is ${xOf(ctx)} px on screen, the step of the spacing scale.</p>
${ruler(ctx, 'ov', live(24, W), { draw: true })}</div></div>`;
  const idx = `<nav aria-label="Contents"><ol class="sd-idx">${BOOK_SECTIONS.map((s, i) => `<li><a href="#${s.id}"><span class="sd-idx__t">${A(s.title)}</span><span class="sd-idx__n">${i + 1}</span></a></li>`).join('')}</ol></nav>`;
  const body = title('overview') + idx
    + `<div class="sd-what">${h3('1.1', 'What it is')}<p class="sd-say" style="${dispStyle(ctx)}">${A(B.description)}</p></div>`
    + reg([['1.2', 'What it does', A(B.product)], ['1.3', 'Who it is for', A(B.audience)], ['1.4', 'Where', A(B.city)]])
    + `${h3('1.5', 'Personality')}` + reg(B.personality.map((p, i) => [`1.5.${i + 1}`, `<span class="sd-trait" style="${dispStyle(ctx)}">${A(p.trait)}</span>`, A(p.means)]));
  return sec(ctx, 'overview', body, { band, cls: 'sd-sec--cover' });
}

// ---- 2 Voice ----
function voice(ctx) {
  const B = ctx.brand, V = B.voice, P = V.principles, font = dfont(ctx), PAD = { w: 48, m: 32, n: 16 };
  const sizes = [104, 96, 88, 80, 72, 64, 56, 48, 44, 40, 36, 32, 28, 24];
  const fit = map3((k) => fitSize(font, P[0].example, (k === 'n' ? 312 : CW[k]) - 2 * PAD[k], sizes, 3));
  const tw = map3((k) => Math.ceil(widest(font, fit[k].lines, fit[k].size)) + 2), fz = map3((k) => fit[k].size);
  const panel = `<div class="sd-panel sd-on-pn"><p class="sd-panel__l">2.1 ${A(P[0].title)}, in use</p><div class="sd-hz" style="${sv('hz', tw)}">${dimH(lab(ctx, tw))}<p class="sd-panel__t sd-fz" style="${sv('fz', fz)};${dispStyle(ctx)}">${A(P[0].example)}</p></div></div>`;
  const body = title('voice', 'How the brand writes: the principles, the swaps that keep it plain, and the lines to copy.') + panel
    + h3('2.2', 'Principles') + reg(P.map((p, i) => [`2.2.${i + 1}`, A(p.title), `<span class="sd-ex" style="${dispStyle(ctx)}">${A(p.example)}</span>`]))
    + h3('2.3', 'Write this, not that') + reg(V.writeThis.map((w, i) => [`2.3.${i + 1}`, A(w.write), `<s class="sd-not">${A(w.not)}</s><span class="sd-why">${A(w.because)}</span>`]), 'sd-reg--swap')
    + h3('2.4', 'Boilerplate') + reg([['2.4.1', '25 words', A(V.boilerplate25), copyBtn('Copy', V.boilerplate25, '25 word boilerplate')], ['2.4.2', '50 words', A(V.boilerplate50), copyBtn('Copy', V.boilerplate50, '50 word boilerplate')]])
    + h3('2.5', 'Lines in use') + reg([B.lines.primary, ...B.lines.others].map((l, i) => [`2.5.${i + 1}`, i === 0 ? 'Primary' : 'Also', `<span class="sd-line" style="${dispStyle(ctx)}">${A(l)}</span>`, copyBtn('Copy', l, 'line')]))
    + h3('2.6', 'Writing the name') + `<p class="sd-body">${A(V.nameRules)}</p>`;
  return sec(ctx, 'voice', body + `<div class="sd-foot">${ruler(ctx, 'vo', map3((k) => [PAD[k], PAD[k] + tw[k]]))}</div>`);
}

// ---- 3 Logo ----
function logoSec(ctx) {
  const B = ctx.brand, R = roles(ctx), L = ctx.logo, g = L.geos.colour, W = { w: 560, m: 448, n: 264 }, H = map3((k) => (W[k] * g.h) / g.w);
  const cs = L.clearShare / 100, pad = map3((k) => H[k] * cs);
  const box = `<div class="sd-clear" style="${sv('cs', pad)}"><div class="sd-hz" style="${sv('hz', W)}">${logoMode(ctx, 'colour', 560, B.name + ' logo')}</div></div>`;
  const hero = fig(box, { h: lab(ctx, map3((k) => W[k] + 2 * pad[k])), v: lab(ctx, map3((k) => H[k] + 2 * pad[k])), cap: `The dashed box is the clear space: ${L.clearShare}% of the logo's height on every side. The logo is ${tri((k) => X(ctx, W[k]))} wide here.` });
  const cws = B.logo.colourways;
  const rows = L.versions.map((id, i) => {
    const gg = L.geos[id], ground = cws[id] ? cws[id].ground : R.ground, cw = cws[id] ? id : cwOn(ctx, ground);
    const w = Math.min(136, (56 * gg.w) / gg.h), f = ctx.book.logo(id), nm = L.labels[id] || id;
    const sw = `<span class="sd-sw" style="background:${ground}"><span class="sd-lg" style="width:${f2(w)}px;--ar:${f2(gg.w)}/${f2(gg.h)}">${L.html(id, { width: w, colourway: cw, color: cws[cw].name, label: 'Logo' })}</span></span>`;
    const files = f ? `<span class="sd-files">${dl(f.svg, nm + ' logo', 'SVG')}${dl(f.png.find((p) => p.w === 1024)?.href ? f.png.find((p) => p.w === 1024) : null, nm + ' logo PNG 1024', 'PNG 1024')}${dl(f.pdf, nm + ' logo', 'PDF')}</span>` : '';
    return [`3.2.${i + 1}`, `${sw}<span class="sd-vn">${A(nm)}</span>`, A(B.logo.when[id] || ''), files];
  });
  const mn = L.minSize;
  const small = `<div class="sd-small">${fig(`<div style="width:${mn.screenPx}px">${logoMode(ctx, 'colour', mn.screenPx, 'Logo at its smallest')}</div>`, { h: X(ctx, mn.screenPx) })}<p class="sd-body">${mn.screenPx} px on screen, ${mn.printMm} mm in print. Below this the logo closes up; use the symbol instead.</p></div>`;
  const never = ['Stretch it, squash it or set it at an angle.', 'Recolour it outside the colourways above.', 'Add a shadow, an outline or any effect.', 'Set anything inside the clear space.', 'Use it smaller than the smallest size.'];
  const body = title('logo', A(B.logo.idea)) + hero
    + h3('3.2', 'Versions') + reg(rows, 'sd-reg--logo')
    + h3('3.3', 'Smallest size') + small
    + h3('3.4', 'Never') + `<ul class="sd-never">${never.map((t) => `<li>${t}</li>`).join('')}</ul>`;
  return sec(ctx, 'logo', body + `<div class="sd-foot">${ruler(ctx, 'lo', live(24, map3((k) => W[k] + 2 * pad[k])))}</div>`);
}

// ---- 4 Colour ----
function colour(ctx) {
  const cs = ctx.colours.slice().sort((a, b) => (a.role === 'ground' ? -1 : b.role === 'ground' ? 1 : (b.share || 0) - (a.share || 0)));
  const tot = cs.reduce((s, c) => s + (c.share || 0), 0) || 1, W = { w: 1152, m: 768, n: 312 };
  const band = `<div class="sd-share sd-hz" style="${sv('hz', W)}">${cs.map((c) => {
    const pc = Math.round(((c.share || 0) / tot) * 100), labs = map3((k) => ((c.share || 0) / tot) * W[k] >= 56 ? `${pc}%` : '');
    return `<div class="sd-share__f" style="flex:${c.share || 0} 1 0"><div class="sd-share__d">${dimH(labs)}</div><span class="sd-share__c" style="background:${c.hex}" title="${A(c.name)}"></span></div>`;
  }).join('')}</div>`;
  const rows = cs.map((c, i) => [`4.2.${i + 1}`, `<span class="sd-chip" style="background:${c.hex}"></span><span class="sd-vn">${A(c.name)}</span>`, A(c.lands), `<span class="sd-vals">${valBtn('HEX', c.hex, c.name)}${valBtn('RGB', c.rgb, c.name)}${valBtn('OKLCH', c.oklch, c.name)}${ctx.C.cmykOf(c) ? valBtn('CMYK', ctx.C.cmykOf(c), c.name) : ''}</span><span class="sd-pc">${Math.round(((c.share || 0) / tot) * 100)}% of a page</span>`]);
  const tones = ctx.tones.map((t, i) => [`4.3.${i + 1}`, `<span class="sd-chip" style="background:${t.hex}"></span><span class="sd-vn">${A(t.name)}</span>`, A(t.lands), `<span class="sd-vals">${valBtn('HEX', t.hex, t.name)}</span>`]);
  const pairs = ctx.pairs.map((p, i) => [`4.4.${i + 1}`, `<span class="sd-aa" style="background:${p.bgHex};color:${p.fgHex};${dispStyle(ctx)}">Aa</span><span class="sd-vn">${A(pairName(ctx, p))}</span>`, A(p.use), `<span class="sd-mono">${A(p.ratioText)} : 1${p.large ? ', large text only' : ''}</span>`]);
  const roleList = [['surface', 'Surface'], ['raised', 'Raised'], ['sunken', 'Sunken'], ['text', 'Text'], ['quiet', 'Quiet text'], ['border', 'Control edge'], ['divider', 'Divider'], ['action', 'Action'], ['focus', 'Focus']];
  const mode = (m, nm) => `<div class="sd-roles"><h4 class="sd-h4">${nm}</h4><ul>${roleList.map(([k, n]) => `<li><span class="sd-chip sd-chip--s" style="background:${ctx.roles[m][k]}"></span><span>${n}</span>${valBtn('HEX', ctx.roles[m][k], `${nm} ${n}`)}</li>`).join('')}</ul></div>`;
  const body = title('colour', 'The palette in the share a page gives each colour, then every value to copy, the pairs that carry text, and the interface roles.')
    + fig(band, { h: lab(ctx, W), cls: 'sd-fig--share' })
    + h3('4.2', 'The palette') + reg(rows, 'sd-reg--col') + (tones.length ? h3('4.3', 'Tones') + reg(tones, 'sd-reg--col') : '')
    + h3('4.4', 'Contrast pairs') + reg(pairs, 'sd-reg--pair')
    + h3('4.5', 'Interface roles') + `<div class="sd-modes">${mode('light', 'Light')}${mode('dark', 'Dark')}</div>`;
  return sec(ctx, 'colour', body + `<div class="sd-foot">${ruler(ctx, 'co', live(0, W))}</div>`);
}

// ---- 5 Typography ----
function typography(ctx) {
  const B = ctx.brand, F = B.fonts, font = dfont(ctx), S = { w: 320, m: 240, n: 160 }, ext = {};
  const ag = (k) => {
    let s = S[k], o = outline(font, 'Ag', s, 0); const room = (k === 'n' ? 312 : CW[k]) - 150;
    if (o.x2 - o.x1 > room) { s = (s * room) / (o.x2 - o.x1); o = outline(font, 'Ag', s, 0); }
    const gw = o.x2 - o.x1, cap = capHeight(font, s), xh = ((font.tables.os2.sxHeight || 0) / font.unitsPerEm) * s, desc = Math.max(o.y2, 0);
    const top = Math.ceil(-o.y1) + 24, sw = Math.ceil(gw + 150), sh = Math.ceil(top + desc + 12);
    ext[k] = gw;
    const line = (y, nm) => `<rect x="0" y="${f2(top + y)}" width="${sw}" height="1" style="fill:var(--hr)"/><text x="${sw}" y="${f2(top + y - 4)}" text-anchor="end" style="fill:var(--qt)" font-size="12" font-weight="400" font-family="'Public Sans'">${nm}</text>`;
    return `<svg class="sd-ag" width="${sw}" height="${sh}" viewBox="0 0 ${sw} ${sh}" role="img" aria-label="${A(`Ag in ${F.display.family}, with its cap height, x-height, baseline and descender`)}">`
      + line(-cap, `Cap height ${X(ctx, cap)}`) + (xh ? line(-xh, `x-height ${X(ctx, xh)}`) : '') + line(0, 'Baseline 0') + line(desc, `Descender ${X(ctx, desc)}`)
      + `<path d="${o.d}" transform="translate(${f2(-o.x1)} ${top})" style="fill:none;stroke:var(--ink)" stroke-width="1"/></svg>`;
  };
  const hero = `<figure class="sd-fig">${tri(ag, 'div')}</figure>`;
  const faceRow = (no, role, f, fam) => [no, `<span class="sd-role">${role}</span><span class="sd-face" style="font-family:${fam};font-weight:${f.weights[f.weights.length - 1]}${role === 'Display' ? `;font-stretch:${F.display.stretch || 100}%` : ''}">${A(f.family)}</span>`,
    `<span class="sd-wts">${f.weights.map((w) => `<span style="font-family:${fam};font-weight:${w}">${w}</span>`).join('')}</span>`];
  const tsample = B.type.sample;
  const tester = `<div class="sd-tester" data-tester><div class="sd-tester__c"><label class="sd-fld"><span>Text</span><input type="text" data-tester-text data-default="${A(tsample.headline)}" value="${A(tsample.headline)}"></label>`
    + `<label class="sd-fld sd-fld--r"><span>Size</span><input type="range" min="16" max="120" step="1" value="56" data-tester-size></label><output class="sd-mono" data-tester-value>56 px</output></div>`
    + `<p class="sd-tester__o" data-tester-out style="${dispStyle(ctx)}">${A(tsample.headline)}</p></div>`;
  const fam = (face) => (face === 'display' ? 'var(--display)' : face === 'mono' ? 'var(--mono)' : 'var(--body)');
  const scale = B.type.scale.map((t, i) => {
    const f = F[t.face] || F.body, w = nearestWeight(f.weights, t.weight), txt = t.face === 'display' ? tsample.headline : tsample.caption;
    return [`5.4.${i + 1}`, `<span class="sd-vn">${A(t.token)}</span><span class="sd-mono">${t.size} / ${f2(t.line * t.size)} px, ${w}</span>`,
      `<span class="sd-samp" style="font-family:${fam(t.face)};font-weight:${w};font-size:min(${t.size}px,var(--capz));line-height:${t.line}">${A(txt)}</span>`, `<span class="sd-q">${A(t.use)}</span>`];
  });
  const rules = B.type.rules.map((r, i) => [`5.5.${i + 1}`, `<span class="sd-do">Do</span>${A(r.do)}`, `<span class="sd-do">Don't</span>${A(r.dont)}`]);
  const body = title('typography', `Three faces: ${A(F.display.family)} for the work, ${A(F.body.family)} for reading, ${A(F.mono.family)} for values.`) + hero
    + h3('5.2', 'Faces') + reg([faceRow('5.2.1', 'Display', F.display, 'var(--display)'), faceRow('5.2.2', 'Body', F.body, 'var(--body)'), faceRow('5.2.3', 'Mono', F.mono, 'var(--mono)')], 'sd-reg--face')
    + h3('5.3', 'Try it') + tester
    + h3('5.4', 'Scale') + reg(scale, 'sd-reg--scale')
    + h3('5.5', 'Rules') + reg(rules, 'sd-reg--rule');
  return sec(ctx, 'typography', body + `<div class="sd-foot">${ruler(ctx, 'ty', live(0, map3((k) => Math.round(ext[k]))))}</div>`);
}

// ---- 6 Imagery ----
function imagery(ctx) {
  const B = ctx.brand, I = B.imagery, D = I.direction, s0 = leadShot(ctx), W = { w: 768, m: 504, n: 312 }, H = map3((k) => (W[k] * 2) / 3);
  const img = `<div class="sd-hz sd-photo" style="${sv('hz', W)}">${shotHtml(ctx, s0, { lead: true })}</div>`;
  const hero = fig(img, { h: lab(ctx, W), v: lab(ctx, H), cap: A(leadCaption(ctx, s0)) });
  const dir = [['Light', D.light], ['Crop', D.crop], ['Colour', D.colour], ['People', D.people]].filter(([, v]) => v).map(([n, v], i) => [`6.2.${i + 1}`, n, A(v)]);
  const file = (s) => (s.photo ? ctx.book.imagery.find((f) => f.name === s.photo.split('/').pop()) : null);
  const shots = I.shots.map((s, i) => [`6.3.${i + 1}`, `<span class="sd-thumb">${shotHtml(ctx, s, { style: 'width:120px;height:80px', compact: true })}</span>`, A(s.caption || s.slot), s.photo ? dl(file(s), s.caption || s.id, 'JPG') : '<span class="sd-q">Slot</span>']);
  const rules = I.rules.map((r, i) => [`6.4.${i + 1}`, `<span class="sd-do">Do</span>${A(r.do)}`, `<span class="sd-do">Don't</span>${A(r.dont)}`]);
  const body = title('imagery', A(D.subject)) + hero
    + h3('6.2', 'Direction') + reg(dir) + h3('6.3', 'Shot list') + reg(shots, 'sd-reg--shot') + h3('6.4', 'Rules') + reg(rules, 'sd-reg--rule');
  return sec(ctx, 'imagery', body + `<div class="sd-foot">${ruler(ctx, 'im', live(24, W))}</div>`);
}

// ---- 7 Layout ----
function layout(ctx) {
  const B = ctx.brand, G = ctx.gridMeasures, W = { w: 768, m: 560, n: 312 }, k3 = map3((k) => W[k] / G.page.w);
  const cols = Array.from({ length: G.columns }, () => '<i></i>').join('');
  const grid = `<div class="sd-hz sd-grid" style="${sv('hz', W)};${sv('gg', map3((k) => G.gutter * k3[k]))};${sv('gm', map3((k) => G.margin * k3[k]))};aspect-ratio:${G.page.w}/${G.page.h}">${cols}</div>`;
  const cap = `Margin ${X(ctx, G.margin)}, column ${X(ctx, G.col)}, gutter ${X(ctx, G.gutter)}. Drawn at 1 : ${tri((k) => f2(G.page.w / W[k]))}.`;
  const hero = fig(grid, { h: map3((k) => `${X(ctx, G.page.w)} drawn at ${X(ctx, W[k])}`), cap });
  const meas = [['Page', `${G.page.w} x ${G.page.h} px`, `${X(ctx, G.page.w)} by ${X(ctx, G.page.h)}`], ['Margin', `${G.margin} px`, X(ctx, G.margin)], ['Columns', String(G.columns), ''], ['Column', `${f2(G.col)} px`, X(ctx, G.col)], ['Gutter', `${G.gutter} px`, X(ctx, G.gutter)], ['Base', `${G.base} px`, X(ctx, G.base)]]
    .map(([n, a, b], i) => [`7.2.${i + 1}`, n, mono(a), b ? mono(b) : '']);
  const space = ctx.space.map((s, i) => [`7.3.${i + 1}`, `<span class="sd-vn">${A(s.token)}</span>`, `<span class="sd-bar" style="width:${s.px}px"></span>`, mono(`${s.px} px, ${X(ctx, s.px)}`)]);
  const edges = [...ctx.radii.map((r) => [r.token, `${r.px === 9999 ? 'Round' : r.px + ' px'}`, r.use]), ['border-control', `${B.ui.border} px`, 'Control edges']].map(([t, v, u], i) => [`7.4.${i + 1}`, `<span class="sd-vn">${A(t)}</span>`, A(u), mono(v)]);
  const body = title('layout', 'The grid every page is built on, the spacing steps at their true size, and the corners and edges.') + hero
    + h3('7.2', 'Measures') + reg(meas) + h3('7.3', 'Spacing') + reg(space, 'sd-reg--space')
    + h3('7.4', 'Corners and edges') + reg(edges) + (B.ui.elevationNote ? `<p class="sd-body sd-note">${A(B.ui.elevationNote)}</p>` : '');
  return sec(ctx, 'layout', body + `<div class="sd-foot">${ruler(ctx, 'la', live(0, W))}</div>`);
}

// ---- 8 Applications ----
function applications(ctx) {
  const B = ctx.brand, Ap = B.applications;
  const q = ctx.sceneInfo(signScene(ctx)).quads[0], sw = 200, sh = Math.round(sw / q.aspect), mm = signMm(ctx);
  const signUrl = ctx.mockup(signScene(ctx), [signArt(ctx)]);
  const photo = (url, alt, c, sid) => `<div class="sd-mk" style="${c}"><svg viewBox="0 0 ${ctx.sceneInfo(sid).w} ${ctx.sceneInfo(sid).h}" role="img" aria-label="${A(alt)}"><image href="${A(url)}" width="100%" height="100%" preserveAspectRatio="none"/></svg></div>`;
  const signDraw = `<div class="sd-cropbox">${signFace(ctx, sw, sh)}${crop()}</div>`;
  const sign = `<div class="sd-pair">${photo(signUrl, `The ${B.name} sign in place`, cropPct(ctx, signScene(ctx), 400, 500, 0.7), signScene(ctx))}<div>${fig(signDraw, mm ? { h: `${mm[0]} mm`, v: `${mm[1]} mm` } : {})}<p class="sd-body">${A(Ap.signage)}${mm ? '' : ' The board in the photograph is another shape, so the drawing gives no millimetres.'}</p></div></div>`;
  const phUrl = ctx.mockup(SCENES.phone, [phoneArt(ctx)], { shade: 0.5 });
  const phoneDims = reg([['8.2.1', 'Width', mono(`390 px, ${X(ctx, 390)}`)], ['8.2.2', 'Top bar', mono(`56 px, ${X(ctx, 56)}`)], ['8.2.3', 'Answer', mono(`176 px, ${X(ctx, 176)}`)], ['8.2.4', 'Row', mono(`72 px, ${X(ctx, 72)}`)]]);
  const ph = `<div class="sd-pair">${photo(phUrl, `The ${B.name} app on a phone`, cropPct(ctx, SCENES.phone, 400, 500, 0.8), SCENES.phone)}<div class="sd-phwrap"><div class="sd-phone" inert role="img" aria-label="${A(`The ${B.name} app's first screen, drawn`)}">${phone(ctx)}</div>${phoneDims}</div></div>`;
  const card = (side) => fig(`<div class="sd-cropbox">${cardFace(ctx, side, 270)}${crop()}</div>`, { h: '90 mm', v: '55 mm', cap: side === 'front' ? 'Front' : 'Back' });
  const posts = `<ul class="sd-posts">${Ap.social.map((t, i) => post(ctx, t, i, { w: 352, m: 240, n: 312 })).join('')}</ul>`;
  const E = Ap.email || Ap.card, bw = B.fonts.body.weights;
  const sig = `<div class="sd-sig"><p style="font-family:var(--body);font-weight:${nearestWeight(bw, 600)}">${A(E.person)}</p><p style="font-family:var(--body);font-weight:${nearestWeight(bw, 400)}">${A(E.role)}, ${A(B.name)}</p><p class="sd-mono">${A(Ap.site.url)}</p><span class="sd-sig__lg">${logoMode(ctx, 'horizontal', 120, B.name + ' logo')}</span></div>`;
  const body = title('applications', 'Each piece drawn to its measure, then shown made.')
    + h3('8.1', 'Signage') + sign + h3('8.2', 'The app') + ph
    + h3('8.3', 'Business card') + `<div class="sd-cards">${card('front')}${card('back')}</div>`
    + h3('8.4', 'Social posts') + posts + h3('8.5', 'Email signature') + sig;
  return sec(ctx, 'applications', body + `<div class="sd-foot">${ruler(ctx, 'ap', null)}</div>`);
}

// ---- 9 Downloads ----
function downloads(ctx) {
  const B = ctx.brand, K = ctx.book, font = dfont(ctx), t = `${B.name} brand kit`;
  const fit = map3((k) => fitSize(font, slotLabel(ctx, t), k === 'n' ? 312 : CW[k], [120, 112, 104, 96, 88, 80, 72, 64, 56, 48, 40, 36, 32], 1));
  const tw = map3((k) => Math.ceil(widest(font, fit[k].lines, fit[k].size)) + 2);
  const hero = fig(`<p class="sd-kitname sd-hz sd-fz${ctx.placeholders ? ' ph-tight' : ''}" style="${sv('hz', tw)};${sv('fz', map3((k) => fit[k].size))};${dispStyle(ctx)}">${A(t)}</p>`, { h: lab(ctx, tw) });
  const btn = `<a class="sd-kit" href="${A(K.zip.href)}" download><span class="sd-kit__t">Download the kit</span><span class="sd-kit__m">${A(K.zip.name)}, ${A(K.zip.sizeText)}</span></a>`;
  const links = (fs) => `<span class="sd-files">${fs.filter(Boolean).map((f) => dl(f, f.name, f.name)).join('')}</span>`;
  const L = ctx.logo, logoRows = ctx.edition === 'slot' ? [['9.2.2', 'Logo', 'The logo slot frame. Place the logo once it is drawn.', links(K.logoFiles)]]
    : L.versions.map((id, i) => { const f = K.logo(id), nm = L.labels[id] || id; return [`9.2.${i + 2}`, `${A(nm)} logo`, '', `<span class="sd-files">${dl(f.svg, nm + ' logo', 'SVG')}${dl(f.pdf, nm + ' logo', 'PDF')}${f.png.map((p) => dl(p.href ? p : null, `${nm} logo PNG ${p.w}`, `PNG ${p.w}`)).join('')}</span>`]; });
  const n0 = logoRows.length + 2;
  const icons = (B.ui.icons || []).map((n) => `<span class="sd-ic" aria-hidden="true">${ctx.ui.icon(n, 24)}</span>`).join('');
  const rows = [['9.2.1', 'Read me', 'What the kit holds and how to use it.', links([K.readmePdf, K.readme])], ...logoRows,
    [`9.2.${n0}`, 'Colour', 'The palette as swatches and tokens.', links(K.colour)],
    [`9.2.${n0 + 1}`, 'Type', 'The faces and their licences.', links(K.type)],
    [`9.2.${n0 + 2}`, 'Icons', `<span class="sd-icons">${icons}</span>`, `${K.icons.length} SVG files in the kit${K.iconsLicence ? dl(K.iconsLicence, 'Icon licence', 'Licence') : ''}`],
    [`9.2.${n0 + 3}`, 'Imagery', 'The photos and the shot list.', K.imagery.length ? links(K.imagery) : '<span class="sd-q">No photos yet: the shot list in 6.3 gives the brief for each.</span>']];
  const body = title('downloads', 'Everything in this book as files: the whole kit in one download, or a part at a time.') + hero + btn + h3('9.2', 'What the kit holds') + reg(rows, 'sd-reg--dl');
  return sec(ctx, 'downloads', body + `<div class="sd-foot">${ruler(ctx, 'dl', live(0, tw))}</div>`);
}

export function brandBook(ctx) {
  return [overview, voice, logoSec, colour, typography, imagery, layout, applications, downloads].map((f) => f(ctx)).join('\n');
}
