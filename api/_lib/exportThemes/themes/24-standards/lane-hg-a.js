// Theme 24, Standards, lane hg: the page bodies for Introduction, Voice, Logo and Colour.
import { A, roles, xOf, pairName } from './helpers.js';
import { CW, fig, ruler, lab, live, sv, reg, tri, logoOn, logoMode, dispStyle, fitSize, widest, dfont, dimH, map3, mono, X, cwOn } from './lane-hg-kit.js';
import { top, sub, rowNo } from './lane-hg-meta.js';
import { shotHtml, leadShot, leadCaption } from './photo-focus.js';

const foot = (ctx, uid, ext) => ruler(ctx, uid, ext);
const nameOf = (ctx, k) => ctx.logo.labels[k] || k.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());

function intro(ctx, id) {
  const B = ctx.brand;
  return top(ctx, id) + `<p class="hg-say" style="${dispStyle(ctx)}">${A(B.description)}</p>`
    + reg([[rowNo(id, 0), 'What it does', A(B.product)], [rowNo(id, 1), 'Who it is for', A(B.audience)], [rowNo(id, 2), 'Where', A(B.city)]]) + foot(ctx, 'in', null);
}

function personality(ctx, id) {
  const B = ctx.brand;
  const rows = B.personality.map((p, i) => `<li class="hg-trait"><span class="hg-no">${rowNo(id, i)}</span><span class="hg-trait__t" style="${dispStyle(ctx)}">${A(p.trait)}</span><span class="hg-trait__m">${A(p.means)}</span></li>`).join('');
  return top(ctx, id, 'Three traits, each with what it means in the work.') + `<ol class="hg-panel hg-on-pn">${rows}</ol>` + foot(ctx, 'pe', null);
}

function voice(ctx, id) {
  const V = ctx.brand.voice, P = V.principles, font = dfont(ctx), PAD = { w: 48, m: 32, n: 16 };
  const fit = map3((k) => fitSize(font, P[0].example, CW[k] - 2 * PAD[k], [104, 96, 88, 80, 72, 64, 56, 48, 44, 40, 36, 32, 28, 24], 3));
  const tw = map3((k) => Math.ceil(widest(font, fit[k].lines, fit[k].size)) + 2), fz = map3((k) => fit[k].size);
  const panel = `<div class="hg-panel hg-on-pn"><p class="hg-panel__l">${A(P[0].title)}, in use</p><div class="hg-hz" style="${sv('hz', tw)}">${dimH(lab(ctx, tw))}<p class="hg-panel__t hg-fz" style="${sv('fz', fz)};${dispStyle(ctx)}">${A(P[0].example)}</p></div></div>`;
  return top(ctx, id, 'How the brand writes. Each principle, with a line that shows it.') + panel
    + sub(rowNo(id, 0), 'Principles') + reg(P.map((p, i) => [rowNo(id, 0, i), A(p.title), `<span class="hg-ex" style="${dispStyle(ctx)}">${A(p.example)}</span>`]))
    + foot(ctx, 'vo', map3((k) => [PAD[k], PAD[k] + tw[k]]));
}

function writeThis(ctx, id) {
  const V = ctx.brand.voice;
  return top(ctx, id, 'The swaps that keep the writing plain.') + reg(V.writeThis.map((w, i) => [rowNo(id, i), `<span class="hg-ex" style="${dispStyle(ctx)}">${A(w.write)}</span>`, `<s class="hg-not">${A(w.not)}</s><span class="hg-why">${A(w.because)}</span>`]), 'hg-reg--swap') + foot(ctx, 'wt', null);
}

function messaging(ctx, id) {
  const B = ctx.brand, V = B.voice;
  return top(ctx, id, 'The lines to use and the boilerplate to paste.')
    + sub(rowNo(id, 0), 'Lines') + reg([B.lines.primary, ...B.lines.others].map((l, i) => [rowNo(id, 0, i), i === 0 ? 'Primary' : 'Also', `<span class="hg-line" style="${dispStyle(ctx)}">${A(l)}</span>`]))
    + sub(rowNo(id, 1), 'Boilerplate') + reg([[rowNo(id, 1, 0), '25 words', A(V.boilerplate25)], [rowNo(id, 1, 1), '50 words', A(V.boilerplate50)]])
    + sub(rowNo(id, 2), 'Writing the name') + `<p class="hg-body">${A(V.nameRules)}</p>` + foot(ctx, 'me', null);
}

function logo(ctx, id) {
  const B = ctx.brand, R = roles(ctx), g = ctx.logo.geos.colour, W = { w: 640, m: 480, n: 264 }, H = map3((k) => (W[k] * g.h) / g.w);
  const hero = fig(`<div class="hg-hz" style="${sv('hz', W)}">${logoMode(ctx, 'colour', 640, B.name + ' logo')}</div>`, { h: lab(ctx, W), v: lab(ctx, H), cap: `The full colour logo on the page ground. The wordmark and the symbol are one drawing; never set them apart.` });
  const onField = `<div class="hg-strip hg-on-field"><div class="hg-hz" style="${sv('hz', map3((k) => W[k] * 0.6))}">${logoOn(ctx, 'colour', R.field, 384, B.name + ' logo')}</div></div>`;
  return top(ctx, id, A(B.logo.idea)) + hero + sub(rowNo(id, 0), 'On the field') + onField + foot(ctx, 'lg', live(24, W));
}

function logoVersions(ctx, id) {
  const B = ctx.brand, R = roles(ctx), L = ctx.logo, cws = B.logo.colourways;
  const rows = L.versions.map((v, i) => {
    const gg = L.geos[v], ground = cws[v] ? cws[v].ground : R.ground, cw = cws[v] ? v : cwOn(ctx, ground), w = Math.min(136, (56 * gg.w) / gg.h);
    const sw = `<span class="hg-sw" style="background:${ground}"><span class="hg-lg" style="width:${w.toFixed(2)}px;--ar:${gg.w}/${gg.h}">${L.html(v, { width: w, colourway: cw, color: cws[cw].name, label: 'Logo' })}</span></span>`;
    return [rowNo(id, i), `${sw}<span class="hg-vn">${A(L.labels[v] || v)}</span>`, A(B.logo.when[v] || '')];
  });
  return top(ctx, id, 'Seven versions, each for a job. Pick the one the job names.') + reg(rows, 'hg-reg--logo') + foot(ctx, 'lv', null);
}

function clearSpace(ctx, id) {
  const B = ctx.brand, L = ctx.logo, g = L.geos.colour, W = { w: 560, m: 448, n: 264 }, H = map3((k) => (W[k] * g.h) / g.w), cs = L.clearShare / 100, pad = map3((k) => H[k] * cs);
  const box = `<div class="hg-clear" style="${sv('cs', pad)}"><div class="hg-hz" style="${sv('hz', W)}">${logoMode(ctx, 'colour', 560, B.name + ' logo')}</div></div>`;
  const hero = fig(box, { h: lab(ctx, map3((k) => W[k] + 2 * pad[k])), v: lab(ctx, map3((k) => H[k] + 2 * pad[k])), cls: 'hg-fig--clear', cap: `The dashed box is the clear space: ${L.clearShare}% of the logo's height on every side. Nothing enters it.` });
  return top(ctx, id, `Keep ${L.clearShare}% of the logo's height clear on every side.`) + hero + foot(ctx, 'cl', live(24, map3((k) => W[k] + 2 * pad[k])));
}

function minSize(ctx, id) {
  const B = ctx.brand, mn = ctx.logo.minSize, steps = [1, 2, 4];
  const one = (m) => fig(`<div style="width:${mn.screenPx * m}px">${logoMode(ctx, 'colour', mn.screenPx * m, 'Logo at ' + m + ' times its smallest')}</div>`, { h: X(ctx, mn.screenPx * m) });
  return top(ctx, id, `${mn.screenPx} px on screen and ${mn.printMm} mm in print. Smaller, and the logo closes up: use the symbol instead.`)
    + `<div class="hg-steps">${steps.map(one).join('')}</div>` + `<p class="hg-body hg-note">Shown at one, two and four times the smallest size.</p>` + foot(ctx, 'mi', live(0, map3(() => mn.screenPx)));
}

function logoGrounds(ctx, id) {
  const B = ctx.brand, L = ctx.logo, cws = B.logo.colourways, shot = leadShot(ctx), R = roles(ctx);
  const rows = Object.keys(cws).map((k, i) => [rowNo(id, 0, i), `<span class="hg-gr" style="background:${cws[k].ground}"><span class="hg-lg" style="width:160px;--ar:${L.geos.colour.w}/${L.geos.colour.h}">${L.html('colour', { width: 160, colourway: k, color: cws[k].name, label: 'Logo' })}</span></span>`, `<span class="hg-vn">${A(nameOf(ctx, k))}</span>`, `${mono(cws[k].name)} ${mono(cws[k].ground)}`]);
  const photo = `<div class="hg-plate">${shotHtml(ctx, shot, { lead: true })}<span class="hg-plate__l" style="background:${R.field}">${logoOn(ctx, 'colour', R.field, 120, B.name + ' logo')}</span></div>`;
  return top(ctx, id, 'Use the colourway drawn for the ground. On a photograph, set the logo on a plate of the brand field.')
    + sub(rowNo(id, 0), 'On colour') + reg(rows, 'hg-reg--gr') + sub(rowNo(id, 1), 'On a photograph') + photo + foot(ctx, 'gr', null);
}

function logoMisuse(ctx, id) {
  const B = ctx.brand, R = roles(ctx), w = 144;
  const cases = [['Stretch it, squash it or set it at an angle.', 'transform:scale(1.5,0.7) rotate(-8deg)'], ['Recolour it outside the colourways.', 'filter:hue-rotate(110deg) saturate(1.6)'], ['Add a shadow, an outline or any effect.', 'filter:drop-shadow(4px 6px 3px rgba(0,0,0,.45))'],
    ['Set anything inside the clear space.', 'outline:1px dashed currentColor;outline-offset:-1px;padding:2px'], ['Use it smaller than the smallest size.', 'transform:scale(.4)']];
  const rows = cases.map(([t, st], i) => [rowNo(id, i), `<span class="hg-bad"><span class="hg-bad__s" style="${st.includes('outline') ? '' : st}">${logoMode(ctx, 'colour', w, B.name + ' logo, misused')}${st.includes('outline') ? `<span class="hg-bad__x" aria-hidden="true">${A(B.name)}</span>` : ''}</span></span>`, `<span class="hg-never">Never</span>${A(t)}`]);
  return top(ctx, id, 'Five things that change the logo. Each drawn as it must not be.') + reg(rows, 'hg-reg--bad') + foot(ctx, 'mu', null);
}

// ---- colour ----
const byShare = (ctx) => ctx.colours.slice().sort((a, b) => (a.role === 'ground' ? -1 : b.role === 'ground' ? 1 : (b.share || 0) - (a.share || 0)));

function palette(ctx, id) {
  const cs = byShare(ctx), n = cs.length, W = { w: 960, m: 720, n: 312 };
  const chips = `<div class="hg-hz hg-chips" style="${sv('hz', W)}">${cs.map((c) => `<span class="hg-chips__c" style="background:${c.hex}" title="${A(c.name)}"></span>`).join('')}</div>`;
  const rows = cs.map((c, i) => [rowNo(id, 0, i), `<span class="hg-chip" style="background:${c.hex}"></span><span class="hg-vn">${A(c.name)}</span>`, A(c.lands), mono(c.hex)]);
  const tones = ctx.tones.map((t, i) => [rowNo(id, 1, i), `<span class="hg-chip" style="background:${t.hex}"></span><span class="hg-vn">${A(t.name)}</span>`, A(t.lands), mono(t.hex)]);
  return top(ctx, id, `${n} colours and ${ctx.tones.length} tones. Each has a job.`) + fig(chips, { h: lab(ctx, W) }) + sub(rowNo(id, 0), 'Colours') + reg(rows, 'hg-reg--col') + (tones.length ? sub(rowNo(id, 1), 'Tones') + reg(tones, 'hg-reg--col') : '') + foot(ctx, 'pa', live(0, W));
}

function proportion(ctx, id) {
  const cs = byShare(ctx), tot = cs.reduce((s, c) => s + (c.share || 0), 0) || 1, W = { w: 960, m: 720, n: 312 };
  const band = `<div class="hg-share hg-hz" style="${sv('hz', W)}">${cs.map((c) => {
    const pc = Math.round(((c.share || 0) / tot) * 100), labs = map3((k) => ((c.share || 0) / tot) * W[k] >= 56 ? `${pc}%` : '');
    return `<div class="hg-share__f" style="flex:${c.share || 0} 1 0"><div class="hg-share__d">${dimH(labs)}</div><span class="hg-share__c" style="background:${c.hex}" title="${A(c.name)}"></span></div>`;
  }).join('')}</div>`;
  const rows = cs.map((c, i) => [rowNo(id, i), `<span class="hg-chip hg-chip--s" style="background:${c.hex}"></span><span class="hg-vn">${A(c.name)}</span>`, `${Math.round(((c.share || 0) / tot) * 100)}% of a page`]);
  return top(ctx, id, 'How much of a page each colour takes.') + fig(band, { h: lab(ctx, W), cls: 'hg-fig--share' }) + reg(rows, 'hg-reg--prop') + foot(ctx, 'pr', live(0, W));
}

function contrast(ctx, id) {
  const P = ctx.pairs, p0 = P[0];
  const hero = `<div class="hg-aa-hero" style="background:${p0.bgHex};color:${p0.fgHex}"><span class="hg-aa-hero__g" style="${dispStyle(ctx)}">Aa</span><span class="hg-aa-hero__u">${A(p0.use)}</span></div>`;
  const rows = P.map((p, i) => [rowNo(id, i), `<span class="hg-aa" style="background:${p.bgHex};color:${p.fgHex};${dispStyle(ctx)}">Aa</span><span class="hg-vn">${A(pairName(ctx, p))}</span>`, A(p.use), mono(`${p.ratioText} : 1${p.large ? ', large text only' : ''}`)]);
  return top(ctx, id, 'The pairs that carry text, with the ratio each gives.') + hero + sub(rowNo(id, 0), 'Pairs') + reg(rows, 'hg-reg--pair') + foot(ctx, 'ct', null);
}

function colourValues(ctx, id) {
  const cs = byShare(ctx), roleList = [['surface', 'Surface'], ['raised', 'Raised'], ['sunken', 'Sunken'], ['text', 'Text'], ['quiet', 'Quiet text'], ['border', 'Control edge'], ['divider', 'Divider'], ['action', 'Action'], ['focus', 'Focus']];
  const rows = cs.map((c, i) => [rowNo(id, 0, i), `<span class="hg-chip" style="background:${c.hex}"></span><span class="hg-vn">${A(c.name)}</span>`, `<span class="hg-vals">${mono(c.hex)}${mono(c.rgb)}${mono(c.oklch)}${ctx.C.cmykOf(c) ? mono(ctx.C.cmykOf(c)) : ''}</span>`]);
  const mode = (m, nm) => `<div class="hg-roles"><h3 class="hg-h4">${nm}</h3><ul>${roleList.map(([k, n]) => `<li><span class="hg-chip hg-chip--s" style="background:${ctx.roles[m][k]}"></span><span>${n}</span>${mono(ctx.roles[m][k])}</li>`).join('')}</ul></div>`;
  return top(ctx, id, 'Every value, to copy into the work.') + sub(rowNo(id, 0), 'The palette') + reg(rows, 'hg-reg--vals')
    + sub(rowNo(id, 1), 'Interface roles') + `<div class="hg-modes">${mode('light', 'Light')}${mode('dark', 'Dark')}</div>` + foot(ctx, 'cv', null);
}

export const PAGES_A = { intro, personality, voice, 'write-this': writeThis, messaging, logo, 'logo-versions': logoVersions, 'clear-space': clearSpace, 'min-size': minSize, 'logo-grounds': logoGrounds, 'logo-misuse': logoMisuse, palette, proportion, contrast, 'colour-values': colourValues };
