// Theme 24, Standards, lane hg: the page bodies for Typography, Imagery, Layout, Applications and Close.
import { nearestWeight } from '../../engine/brand.js';
import { A, f2, roles, adv, xOf } from './helpers.js';
import { fig, ruler, lab, live, sv, reg, logoOn, logoMode, dispStyle, fitSize, widest, dfont, dimH, map3, mono, X, crop } from './lane-hg-kit.js';
import { top, sub, rowNo } from './lane-hg-meta.js';
import { SCENES, signArt, signFace, signMm, phone, phoneArt, cardFace, cropPct } from './lane-bk-art.js';
import { signScene } from './scene-pick.js';
import { shotHtml, leadShot, leadCaption } from './photo-focus.js';

const foot = (ctx, uid, ext) => ruler(ctx, uid, ext);
const fam = (face) => (face === 'display' ? 'var(--display)' : face === 'mono' ? 'var(--mono)' : 'var(--body)');
const W3 = { w: 960, m: 720, n: 312 };

// ---- typography ----
function typefaces(ctx, id) {
  const B = ctx.brand, F = B.fonts, font = dfont(ctx), S = { w: 300, m: 240, n: 160 };
  const tw = map3((k) => Math.ceil(adv(font, 'Ag', S[k])) + 2);
  const face = (no, role, f, fm) => [no, `<span class="hg-role">${role}</span><span class="hg-face" style="font-family:${fm};font-weight:${f.weights[f.weights.length - 1]}${role === 'Display' ? `;font-stretch:${F.display.stretch || 100}%` : ''}">${A(f.family)}</span>`, `<span class="hg-wts">${f.weights.map((w) => `<span style="font-family:${fm};font-weight:${w}">${w}</span>`).join('')}</span>`];
  return top(ctx, id, `Three faces: ${A(F.display.family)} for the work, ${A(F.body.family)} for reading, ${A(F.mono.family)} for values.`)
    + fig(`<p class="hg-ag hg-hz hg-fz" style="${sv('hz', tw)};${sv('fz', S)};${dispStyle(ctx)}" aria-label="Ag in ${A(F.display.family)}">Ag</p>`, { h: lab(ctx, tw) })
    + sub(rowNo(id, 0), 'Faces') + reg([face(rowNo(id, 0, 0), 'Display', F.display, 'var(--display)'), face(rowNo(id, 0, 1), 'Body', F.body, 'var(--body)'), face(rowNo(id, 0, 2), 'Mono', F.mono, 'var(--mono)')], 'hg-reg--face')
    + foot(ctx, 'tf', live(0, tw));
}

function hierarchy(ctx, id) {
  const B = ctx.brand, ts = B.type.sample;
  const rows = B.type.scale.map((t, i) => {
    const f = B.fonts[t.face] || B.fonts.body, w = nearestWeight(f.weights, t.weight), txt = t.face === 'display' ? ts.headline : ts.caption;
    return [rowNo(id, i), `<span class="hg-vn">${A(t.token)}</span><span class="hg-mono">${t.size} / ${f2(t.line * t.size)} px, ${w}</span>`,
      `<span class="hg-samp" style="font-family:${fam(t.face)};font-weight:${w};font-size:min(${t.size}px,var(--capz));line-height:${t.line}">${A(txt)}</span>`, `<span class="hg-q">${A(t.use)}</span>`];
  });
  return top(ctx, id, 'Every size the brand sets, from the largest down.') + reg(rows, 'hg-reg--scale') + foot(ctx, 'hi', null);
}

function typeInUse(ctx, id) {
  const B = ctx.brand, ts = B.type.sample, sc = B.type.scale, d = sc.find((t) => t.face === 'display') || sc[0], b = sc.find((t) => t.face === 'body') || sc[sc.length - 1];
  const wd = nearestWeight(B.fonts.display.weights, d.weight), wb = nearestWeight(B.fonts.body.weights, b.weight);
  const spec = (t, w, f) => `<span class="hg-mono">${A(f)} ${w}, ${t.size} / ${f2(t.line * t.size)} px</span>`;
  const page = `<div class="hg-spec"><p class="hg-spec__h" style="${dispStyle(ctx, wd)};font-size:min(${d.size}px,var(--hs));line-height:${d.line}">${A(ts.headline)}</p><p class="hg-spec__p" style="font-family:var(--body);font-weight:${wb};font-size:${b.size}px;line-height:${b.line}">${A(ts.paragraph)}</p><p class="hg-spec__c">${A(ts.caption)}</p></div>`;
  return top(ctx, id, 'A headline, a paragraph and a caption, set as the guidelines set them.') + page
    + reg([[rowNo(id, 0), 'Headline', spec(d, wd, B.fonts.display.family)], [rowNo(id, 1), 'Paragraph', spec(b, wb, B.fonts.body.family)]]) + foot(ctx, 'tu', null);
}

const doRows = (id, rules) => rules.map((r, i) => [rowNo(id, i), `<span class="hg-do">Do</span>${A(r.do)}`, `<span class="hg-do">Don't</span>${A(r.dont)}`]);
function typeRules(ctx, id) {
  return top(ctx, id, 'Rules for setting the type, each with its opposite.') + reg(doRows(id, ctx.brand.type.rules), 'hg-reg--rule') + foot(ctx, 'tr', null);
}

// ---- imagery: a shot is framed by what is in it; the focus is where the subject sits (x y, in per cent) ----
const shot = (ctx, s, o = {}) => shotHtml(ctx, s, o);

function photoDirection(ctx, id) {
  const I = ctx.brand.imagery, D = I.direction, s0 = leadShot(ctx), H = map3((k) => (W3[k] * 2) / 3);
  const img = `<div class="hg-hz hg-photo" style="${sv('hz', W3)}">${shot(ctx, s0, { lead: true })}</div>`;
  const dir = [['Light', D.light], ['Crop', D.crop], ['Colour', D.colour], ['People', D.people]].filter(([, v]) => v).map(([n, v], i) => [rowNo(id, i), n, A(v)]);
  return top(ctx, id, A(D.subject)) + fig(img, { h: lab(ctx, W3), v: lab(ctx, H), cls: 'hg-fig--photo', cap: A(leadCaption(ctx, s0)) }) + sub(rowNo(id, 0), 'Direction') + reg(dir) + foot(ctx, 'pd', live(24, W3));
}

function shotList(ctx, id) {
  const I = ctx.brand.imagery;
  const rows = I.shots.map((s, i) => [rowNo(id, i), `<span class="hg-thumb">${shot(ctx, s, { compact: true })}</span>`, A(s.caption || s.slot), s.photo ? '' : '<span class="hg-q">Slot</span>']);
  return top(ctx, id, `${I.shots.length} shots the library needs. Each row is a brief.`) + reg(rows, 'hg-reg--shot') + foot(ctx, 'sl', null);
}

function imageryRules(ctx, id) {
  const I = ctx.brand.imagery, pair = [I.shots[1], I.shots[2]].filter(Boolean);
  const frames = `<div class="hg-pair2">${pair.map((s) => `<figure class="hg-fr"><div class="hg-fr__i">${shot(ctx, s, { compact: true })}</div><figcaption class="hg-cap">${A(s.caption || s.slot)}</figcaption></figure>`).join('')}</div>`;
  return top(ctx, id, 'What a good picture does, and what spoils one.') + frames + sub(rowNo(id, 0), 'Rules') + reg(doRows(id, I.rules), 'hg-reg--rule') + foot(ctx, 'ir', null);
}

// ---- layout ----
const gridCols = (ctx) => Array.from({ length: ctx.gridMeasures.columns }, () => '<i></i>').join('');
const gridVars = (ctx) => { const G = ctx.gridMeasures; return `--gm:${f2((G.margin / G.page.w) * 100)}cqw;--gg:${f2((G.gutter / G.page.w) * 100)}cqw;aspect-ratio:${G.page.w}/${G.page.h}`; };
const pageW = { w: 720, m: 600, n: 312 };

function grid(ctx, id) {
  const G = ctx.gridMeasures, B = ctx.brand;
  const draw = `<div class="hg-hz hg-grid" style="${sv('hz', pageW)};${gridVars(ctx)}">${gridCols(ctx)}</div>`;
  const cap = `Margin ${X(ctx, G.margin)}, column ${X(ctx, G.col)}, gutter ${X(ctx, G.gutter)}. The page is ${X(ctx, G.page.w)} wide.`;
  const meas = [['Page', `${G.page.w} x ${G.page.h} px`, `${X(ctx, G.page.w)} by ${X(ctx, G.page.h)}`], ['Margin', `${G.margin} px`, X(ctx, G.margin)], ['Columns', String(G.columns), ''], ['Column', `${f2(G.col)} px`, X(ctx, G.col)], ['Gutter', `${G.gutter} px`, X(ctx, G.gutter)], ['Base', `${G.base} px`, X(ctx, G.base)]]
    .map(([n, a, b], i) => [rowNo(id, i), n, mono(a), b ? mono(b) : '']);
  return top(ctx, id, `${G.columns} columns on a ${X(ctx, G.base)} base.`) + fig(draw, { h: map3((k) => `${X(ctx, G.page.w)} drawn at ${X(ctx, pageW[k])}`), cap }) + sub(rowNo(id, 0), 'Measures') + reg(meas) + foot(ctx, 'gd', live(0, pageW));
}

function layouts(ctx, id) {
  const B = ctx.brand, R = roles(ctx), G = ctx.gridMeasures;
  const page = `<div class="hg-hz hg-lay hg-on-field" style="${sv('hz', pageW)};${gridVars(ctx)}"><div class="hg-lay__g" aria-hidden="true">${gridCols(ctx)}</div><p class="hg-lay__l${ctx.placeholders ? ' ph-tight' : ''}" style="${dispStyle(ctx)}">${A(B.lines.primary)}</p><div class="hg-lay__lg">${logoOn(ctx, 'colour', R.field, 200, B.name + ' logo')}</div></div>`;
  const space = ctx.space.map((s, i) => [rowNo(id, 0, i), `<span class="hg-vn">${A(s.token)}</span>`, `<span class="hg-bar-s" style="width:${s.px}px"></span>`, mono(`${s.px} px, ${X(ctx, s.px)}`)]);
  const edges = [...ctx.radii.map((r) => [r.token, `${r.px === 9999 ? 'Round' : r.px + ' px'}`, r.use]), ['border-control', `${B.ui.border} px`, 'Control edges']].map(([t, v, u], i) => [rowNo(id, 1, i), `<span class="hg-vn">${A(t)}</span>`, A(u), mono(v)]);
  return top(ctx, id, 'The line and the logo on the grid, then the spacing steps at their true size.')
    + fig(page, { h: lab(ctx, pageW), cap: `The grid shows through; the line starts on the margin and the logo sits on the foot.` })
    + sub(rowNo(id, 0), 'Spacing') + reg(space, 'hg-reg--space') + sub(rowNo(id, 1), 'Corners and edges') + reg(edges) + (B.ui.elevationNote ? `<p class="hg-body hg-note">${A(B.ui.elevationNote)}</p>` : '') + foot(ctx, 'ly', live(0, pageW));
}

// ---- applications ----
const photoBox = (url, alt, c) => `<div class="hg-mk" style="${c}"><img src="${A(url)}" alt="${A(alt)}"></div>`;

function businessCard(ctx, id) {
  const c = ctx.brand.applications.card, card = (side) => fig(`<div class="hg-cropbox">${cardFace(ctx, side, 300)}${crop()}</div>`, { h: '90 mm', v: '55 mm', cap: side === 'front' ? 'Front' : 'Back' });
  return top(ctx, id, `${A(c.person)}, ${A(c.role)}. The field on the front, the person on the back.`) + `<div class="hg-cards">${card('front')}${card('back')}</div>` + foot(ctx, 'bc', null);
}

function social(ctx, id) {
  const B = ctx.brand, R = roles(ctx), font = dfont(ctx), gs = [[R.field, R.fieldInk], [R.dark, R.darkInk], [R.ground, R.ink]];
  const posts = B.applications.social.map((t, i) => {
    const [bg, ink] = gs[i % 3], fz = fitSize(font, t, 248, [40, 36, 32, 28, 24, 20, 18, 16, 14, 12, 11], 4).size;
    return `<li class="hg-post${bg === R.ground ? ' hg-post--gr' : ''}" style="background:${bg};color:${ink}"><p class="hg-post__t" style="${dispStyle(ctx)};font-size:${fz}px">${A(t)}</p><span class="hg-post__lg">${logoOn(ctx, 'colour', bg, 64, B.name + ' logo')}</span></li>`;
  }).join('');
  return top(ctx, id, 'Square posts. One line each, the logo at the foot.') + `<ul class="hg-posts">${posts}</ul>` + foot(ctx, 'so', null);
}

function signage(ctx, id) {
  const B = ctx.brand, q = ctx.sceneInfo(signScene(ctx)).quads[0], sw = 240, sh = Math.round(sw / q.aspect), mm = signMm(ctx);
  const url = ctx.mockup(signScene(ctx), [signArt(ctx)]);
  const draw = fig(`<div class="hg-cropbox">${signFace(ctx, sw, sh)}${crop()}</div>`, mm ? { h: `${mm[0]} mm`, v: `${mm[1]} mm` } : {});
  return top(ctx, id, A(B.applications.signage)) + `<div class="hg-pair">${photoBox(url, `The ${B.name} sign in place`, cropPct(ctx, signScene(ctx), 400, 500, 0.7))}<div>${draw}${mm ? '' : '<p class="hg-body">The board in the photograph is another shape, so the drawing gives no millimetres.</p>'}</div></div>` + foot(ctx, 'sg', null);
}

function emailSignature(ctx, id) {
  const B = ctx.brand, E = B.applications.email || B.applications.card, M = B.guideB.email, bw = B.fonts.body.weights;
  const sig = `<div class="hg-sig"><p style="font-weight:${nearestWeight(bw, 600)}">${A(E.person)}</p><p>${A(E.role)}, ${A(B.name)}</p><p class="hg-mono">${A(B.applications.site.url)}</p><span class="hg-sig__lg">${logoMode(ctx, 'horizontal', 120, B.name + ' logo')}</span></div>`;
  const mail = `<div class="hg-mail"><dl class="hg-mail__h"><div><dt>To</dt><dd>${A(M.to)}</dd></div><div><dt>Subject</dt><dd>${A(M.subject)}</dd></div><div><dt>Sent</dt><dd>${A(M.time)}</dd></div></dl><div class="hg-mail__b">${M.body.map((p) => `<p>${A(p)}</p>`).join('')}${sig}</div></div>`;
  return top(ctx, id, 'Name, role, the site and the logo. Nothing more.') + mail + foot(ctx, 'es', null);
}

function digital(ctx, id) {
  const B = ctx.brand, url = ctx.mockup(SCENES.phone, [phoneArt(ctx)], { shade: 0.5 });
  const dims = reg([[rowNo(id, 0), 'Width', mono(`390 px, ${X(ctx, 390)}`)], [rowNo(id, 1), 'Top bar', mono(`56 px, ${X(ctx, 56)}`)], [rowNo(id, 2), 'Answer', mono(`176 px, ${X(ctx, 176)}`)], [rowNo(id, 3), 'Row', mono(`72 px, ${X(ctx, 72)}`)]]);
  return top(ctx, id, `The ${A(B.name)} app's first screen, drawn and then held.`)
    + `<div class="hg-pair">${photoBox(url, `The ${B.name} app on a phone`, cropPct(ctx, SCENES.phone, 400, 500, 0.8))}<div class="hg-phwrap"><div class="hg-phone" inert role="img" aria-label="${A(`The ${B.name} app's first screen, drawn`)}">${phone(ctx)}</div>${dims}</div></div>` + foot(ctx, 'dg', null);
}

// ---- close ----
function summary(ctx, id) {
  const B = ctx.brand, font = dfont(ctx), PAD = { w: 48, m: 32, n: 16 };
  const fit = map3((k) => fitSize(font, B.lines.primary, CW_[k] - 2 * PAD[k], [104, 96, 88, 80, 72, 64, 56, 48, 44, 40, 36, 32, 28, 24], 3));
  const tw = map3((k) => Math.ceil(widest(font, fit[k].lines, fit[k].size)) + 2), fz = map3((k) => fit[k].size);
  const panel = `<div class="hg-panel hg-on-pn"><div class="hg-hz" style="${sv('hz', tw)}">${dimH(lab(ctx, tw))}<p class="hg-panel__t hg-fz" style="${sv('fz', fz)};${dispStyle(ctx)}">${A(B.lines.primary)}</p></div></div>`;
  const rows = B.guideB.rules.map((r, i) => [rowNo(id, i), `<span class="hg-ex" style="${dispStyle(ctx)}">${A(r.title)}</span>`, A(r.text)]);
  return top(ctx, id, 'The line, and the three rules that hold the rest together.') + panel + sub(rowNo(id, 0), 'Rules') + reg(rows) + foot(ctx, 'su', map3((k) => [PAD[k], PAD[k] + tw[k]]));
}
const CW_ = { w: 960, m: 720, n: 312 };

function contactScope(ctx, id) {
  const B = ctx.brand;
  return top(ctx, id, 'Who owns these guidelines, and which version this is.') + reg([[rowNo(id, 0), 'Owner', A(B.contact.owner)], [rowNo(id, 1), 'Email', `<a class="hg-mono" href="mailto:${A(B.contact.email)}">${A(B.contact.email)}</a>`], [rowNo(id, 2), 'Version', A(ctx.versionLine)]]) + foot(ctx, 'cs', null);
}

export const PAGES_B = { typefaces, hierarchy, 'type-in-use': typeInUse, 'type-rules': typeRules, 'photo-direction': photoDirection, 'shot-list': shotList, 'imagery-rules': imageryRules, grid, layouts, 'business-card': businessCard, social, signage, 'email-signature': emailSignature, digital, summary, 'contact-scope': contactScope };
