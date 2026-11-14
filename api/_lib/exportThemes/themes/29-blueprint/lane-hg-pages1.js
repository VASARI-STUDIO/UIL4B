// Theme 29 (Blueprint), lane hg: the guide site's pages, part 1: Introduction, Voice, Logo and Colour. Every page is one drawing sheet (see lane-hg-parts.js).
import { A, pad2, WEIGHT, detail, tag, notes, label, dimH, dimV, sheet, fitDisp, cq, logoFilm, logoOn, geoH, briefTile } from './lane-hg-parts.js';
import { isCourier } from './lane-bk-arts.js';

const W3 = { s: 280, m: 400, l: 640 };
const PX = '<span class="hg-m">1:1</span>, sizes in px';
const photoOf = (ctx) => { const sh = ctx.brand.imagery.shots; return sh.find((s) => s.photo) || sh[0]; };
const ph = (ctx, s, pos) => ctx.photo(s.id, { cls: 'hg-photo', pos: pos || '50% 45%', slotNote: false });
// the ink a field wants on it: the engine's best pair for that ground, else whichever of the roles' two texts reads better
const inkOn = (ctx, hex) => {
  const own = ctx.pairs.filter((p) => p.bgHex.toUpperCase() === hex.toUpperCase()).sort((a, b) => b.ratio - a.ratio)[0];
  if (own && own.ratio >= 4.5) return own.fgHex;
  return ctx.ratio(ctx.roles.light.text, hex) >= ctx.ratio(ctx.roles.dark.text, hex) ? ctx.roles.light.text : ctx.roles.dark.text;
};
const rgbOf = (ctx, hex) => { const [r, g, b] = ctx.C.hexToRgb(hex); return `rgb(${r}, ${g}, ${b})`; };
const sw = (hex) => `<span class="hg-sw" style="background:${hex}" aria-hidden="true"></span>`;

function ga(ctx, id, W) {
  const vals = (f) => ({ s: f(W.s), m: f(W.m), l: f(W.l) });
  return `<figure class="hg-ga" aria-label="The logo, ${W.l} px wide on a wide screen"><div class="hg-ga__lg">${dimH(vals(String))}${logoFilm(ctx, id, W.l)}${dimV(vals((w) => String(geoH(ctx, id, w))))}</div></figure>`;
}

export const pages1 = {
  // ---- Introduction ----
  intro(ctx) {
    const B = ctx.brand, line = B.lines.primary, first = photoOf(ctx);
    const hs = { l: fitDisp(ctx, line, 900, 2, [104, 96, 88, 80, 72, 64, 56]), s: fitDisp(ctx, line, 320, 4, [44, 40, 36, 32, 28]) };
    const hero = `<p class="hg-hero hg-disp" style="--fl:${cq(hs.l, 900)};--fs:${cq(hs.s, 320)}">${A(line)}</p><p class="hg-place">${A([B.place || B.city, ctx.versionLine].filter(Boolean).join(', '))}</p>`;
    const inner = `${ga(ctx, 'colour', W3)}<div class="hg-ov">${hero}</div>
<div class="hg-split"><div>${label('The brand')}<p class="hg-big">${A(B.description)}</p></div>
<div>${label('General notes')}${notes([[1, `<p class="hg-note"><span class="hg-note__h">What it does.</span> ${A(B.product)}</p>`], [2, `<p class="hg-note"><span class="hg-note__h">Who it serves.</span> ${A(B.audience)}</p>`]])}</div></div>
<figure class="hg-ph">${ph(ctx, first)}<figcaption>${detail(1, A(first.caption || first.alt || first.slot || ''))}</figcaption></figure>`;
    return sheet(ctx, 'intro', { drawing: 'General arrangement', scale: PX }, inner);
  },
  personality(ctx) {
    const P = ctx.brand.personality;
    const inner = `<div class="hg-block">${label('How it behaves')}<ol class="hg-traits">${P.map((p, i) => `<li><p class="hg-trait hg-disp">${A(p.trait)}</p><span class="hg-lead" aria-hidden="true"></span>${tag(i + 1)}<p class="hg-note">${A(p.means)}</p></li>`).join('')}</ol></div>`;
    return sheet(ctx, 'personality', { drawing: 'Personality', scale: 'Not to scale' }, inner);
  },

  // ---- Voice ----
  voice(ctx) {
    const V = ctx.brand.voice;
    const inner = `<ol class="hg-details">${V.principles.map((p, i) => `<li><p class="hg-ex">${A(p.example)}</p>${detail(i + 1, A(p.title))}</li>`).join('')}</ol>
<div class="hg-split"><div>${label('Lines in use')}<ul class="hg-lines">${[ctx.brand.lines.primary, ...ctx.brand.lines.others].map((l) => `<li class="hg-disp">${A(l)}</li>`).join('')}</ul></div>
<div>${label('General notes')}${notes([[1, `<p class="hg-note"><span class="hg-note__h">Writing the name.</span> ${A(V.nameRules)}</p>`]])}</div></div>`;
    return sheet(ctx, 'voice', { drawing: 'Details', scale: 'Not to scale' }, inner);
  },
  'write-this'(ctx) {
    const V = ctx.brand.voice;
    const rev = `<div class="hg-rev" role="list"><div class="hg-rev__h" aria-hidden="true"><span>Rev</span><span>Was</span><span>Now</span><span>Because</span></div>
${V.writeThis.map((r, i) => `<div class="hg-rev__r" role="listitem"><span class="hg-delta" aria-hidden="true"><svg viewBox="0 0 28 26" width="28" height="26" focusable="false"><path d="M14 1.5L26.5 24.5H1.5Z"/></svg><span class="hg-m">${i + 1}</span></span>
<p class="hg-was"><s>${A(r.not)}</s></p><p class="hg-now"><span class="hg-cloud"><span class="hg-cloud__e hg-cloud__e--t" aria-hidden="true"></span><span class="hg-cloud__e hg-cloud__e--b" aria-hidden="true"></span><span class="hg-cloud__e hg-cloud__e--l" aria-hidden="true"></span><span class="hg-cloud__e hg-cloud__e--r" aria-hidden="true"></span><span class="hg-cloud__t">${A(r.write)}</span></span></p><p class="hg-note">${A(r.because)}</p></div>`).join('')}</div>`;
    return sheet(ctx, 'write-this', { drawing: 'Revision schedule', scale: 'Not to scale' }, `<div class="hg-block">${label('Revision schedule')}${rev}</div>`);
  },
  messaging(ctx) {
    const B = ctx.brand, V = B.voice;
    const take = (n, title, text) => `<div class="hg-take">${detail(n, title)}<div class="hg-measure">${dimH('520')}<p class="hg-body">${A(text)}</p></div></div>`;
    const inner = `<div class="hg-block">${label('The lines')}<ul class="hg-lines hg-lines--l">${[B.lines.primary, ...B.lines.others].map((l) => `<li class="hg-disp">${A(l)}</li>`).join('')}</ul></div>
<div class="hg-block">${label('Boilerplate')}<div class="hg-takes">${take('A', 'Short boilerplate', V.boilerplate25)}${take('B', 'Long boilerplate', V.boilerplate50)}</div></div>`;
    return sheet(ctx, 'messaging', { drawing: 'Lines and boilerplate', scale: 'Not to scale' }, inner);
  },

  // ---- Logo ----
  logo(ctx) {
    const B = ctx.brand, L = ctx.logo, sym = L.versions.includes('symbol'), sn = B.logo.showcase && B.logo.showcase.symbolNote;
    const inner = `${ga(ctx, 'colour', W3)}<p class="hg-big hg-measure-t">${A(B.logo.idea)}</p>
<div class="hg-split"><div>${detail(1, 'The logo', { note: `The colour version at <span class="hg-at-s">${W3.s}</span><span class="hg-at-m">${W3.m}</span><span class="hg-at-l">${W3.l}</span> px wide. The redlines print its width and height.` })}</div>
${sym ? `<div>${detail(2, 'The symbol')}<div class="hg-sym">${logoFilm(ctx, 'symbol', 120)}</div>${sn ? `<p class="hg-note">${A(sn)}</p>` : ''}</div>` : ''}</div>`;
    return sheet(ctx, 'logo', { drawing: 'The mark', scale: PX }, inner);
  },
  'logo-versions'(ctx) {
    const B = ctx.brand, L = ctx.logo, cw = B.logo.colourways;
    const order = ['colour', 'reversed', 'mono-dark', 'mono-light', 'horizontal', 'stacked', 'symbol'].filter((id) => L.versions.includes(id));
    const row = (id, i) => {
      const key = L.colourwayOf(id), w = cw[key], g = L.geos[id], maxW = id === 'symbol' ? 96 : id === 'stacked' ? 128 : 192, lw = Math.floor(Math.min(maxW, (64 * g.w) / g.h));
      const ground = B.colours.find((c) => c.hex.toUpperCase() === String(w.ground).toUpperCase());
      return `<li class="hg-ver"><span class="hg-ver__n hg-m" aria-hidden="true">${pad2(i + 1)}</span><span class="hg-ver__f" style="background:${w.ground}">${logoOn(ctx, id, key, Math.max(lw, 112))}</span>
<span class="hg-ver__t"><h2 class="hg-ver__k">${A(L.labels[id])}</h2><span class="hg-note">${A(B.logo.when[id] || '')}${ground ? ` On ${A(ground.name)}.` : ''}</span></span></li>`;
    };
    const inner = `<div class="hg-block">${label('Schedule of versions')}<p class="hg-note">Each version on the ground it is made for.</p><ol class="hg-vers">${order.map(row).join('')}</ol></div>`;
    return sheet(ctx, 'logo-versions', { drawing: 'Logo versions', scale: 'Not to scale' }, inner);
  },
  'clear-space'(ctx) {
    const L = ctx.logo, cs = L.clearShare / 100, W = { s: 180, m: 320, l: 480 };
    const clr = (w) => String(Math.round(geoH(ctx, 'colour', w) * cs));
    const fig = `<figure class="hg-clear" style="--cs:${cs};--ar:${(L.geos.colour.w / L.geos.colour.h).toFixed(4)}" aria-label="The logo in its clear zone: ${L.clearShare}% of its height on every side">
<div class="hg-clear__z"><span class="hg-clear__box" aria-hidden="true"></span>
<div class="hg-clear__pad">${dimV({ s: clr(W.s), m: clr(W.m), l: clr(W.l) })}</div>
<div class="hg-clear__lg">${dimH({ s: String(W.s), m: String(W.m), l: String(W.l) })}${logoFilm(ctx, 'colour', W.l)}${dimV({ s: String(geoH(ctx, 'colour', W.s)), m: String(geoH(ctx, 'colour', W.m)), l: String(geoH(ctx, 'colour', W.l)) })}</div></div></figure>`;
    const inner = `${fig}<div class="hg-split"><div>${detail(1, 'Clear zone', { note: `Keep ${L.clearShare}% of the logo&rsquo;s height clear on every side. The dashed line is the edge of the zone, and the redline at the left prints the clearance at the size drawn.` })}</div>
<div>${notes([[1, '<p class="hg-note">Nothing enters the zone: no type, no edge of the page, no other logo.</p>'], [2, `<p class="hg-note">The zone grows with the logo. It is ${L.clearShare}% of the height at any size.</p>`]])}</div></div>`;
    return sheet(ctx, 'clear-space', { drawing: 'Clear space', scale: PX }, inner);
  },
  'min-size'(ctx) {
    const ms = ctx.logo.minSize, slot = ctx.edition === 'slot';
    const draw = slot
      ? '<p class="hg-note">Set the smallest size once the logo is in place: the width at which every part of it still reads as one mark.</p>'
      : `<div class="hg-min"><div class="hg-min__lg">${dimH(String(ms.screenPx), { gap: 6 })}${logoFilm(ctx, 'colour', ms.screenPx)}${dimV(String(ms.screenH), { gap: 6 })}</div></div>`;
    const inner = `<div class="hg-split"><div>${detail(1, 'Smallest on screen', { note: `<span class="hg-m">${ms.screenPx} px</span> wide at one CSS pixel to the pixel. Never smaller.` })}${draw}</div>
<div>${detail(2, 'Smallest in print', { note: `<span class="hg-m">${ms.printMm} mm</span> wide. Never smaller.` })}
<dl class="hg-meas hg-meas--2"><div><dt>Screen</dt><dd><span class="hg-meas__v">${ms.screenPx}</span> <span class="hg-m">px</span></dd></div><div><dt>Print</dt><dd><span class="hg-meas__v">${ms.printMm}</span> <span class="hg-m">mm</span></dd></div></dl></div></div>`;
    return sheet(ctx, 'min-size', { drawing: 'Minimum size', scale: PX }, inner);
  },
  'logo-grounds'(ctx) {
    const B = ctx.brand, L = ctx.logo, cw = B.logo.colourways, slot = ctx.edition === 'slot', first = photoOf(ctx);
    const keys = Object.keys(cw);
    const bands = keys.map((k, i) => {
      const w = cw[k], ground = B.colours.find((c) => c.hex.toUpperCase() === String(w.ground).toUpperCase()), name = ground ? ground.name : k;
      const id = k === 'horizontal' ? 'horizontal' : 'colour', vid = L.versions.find((v) => L.colourwayOf(v) === k), vl = L.labels[vid] || '', vw = B.logo.when[vid] || '';
      return `<li class="hg-gr"><span class="hg-gr__n hg-m" aria-hidden="true">${pad2(i + 1)}</span><span class="hg-gr__f" style="background:${w.ground}">${logoOn(ctx, id, k, 160)}</span>
<span class="hg-gr__t"><h2 class="hg-ver__k">On ${A(name)}</h2><span class="hg-note">${A(vl)}${vl && vw ? '.' : ''}${vw ? ` ${A(vw)}` : ''}</span><span class="hg-m hg-gr__h">${ground ? A(ground.hex.toUpperCase()) : ''}</span></span></li>`;
    }).join('');
    const photo = `<figure class="hg-ph hg-gph"><div class="hg-gph__p">${first.photo ? ph(ctx, first) : briefTile(ctx, first)}<span class="hg-gph__l${slot && first.photo ? " hg-gph__l--s" : ""}${isCourier(ctx) && !slot ? " hg-gph__l--b" : ""}">${logoOn(ctx, 'colour', L.colourwayOf('mono-light') === 'mono-light' ? 'mono-light' : 'reversed', 160)}</span></div><figcaption>${detail(keys.length + 1, 'On a photograph', { note: `${A(B.logo.when['mono-light'] || '')}` })}</figcaption></figure>`;
    void slot;
    const inner = `<div class="hg-block">${label('Grounds')}<ol class="hg-grs">${bands}</ol></div>${photo}`;
    return sheet(ctx, 'logo-grounds', { drawing: 'Grounds', scale: 'Not to scale' }, inner);
  },
  'logo-misuse'(ctx) {
    const B = ctx.brand, cw = B.logo.colourways;
    const lg = (extra) => `<span class="hg-mis__lg ${extra || ''}"><span class="hg-logo" style="--ar:${ctx.logo.geos.colour.w.toFixed(2)}/${ctx.logo.geos.colour.h.toFixed(2)}">${ctx.logo.html('colour', { width: 160, colourway: 'colour', label: 'Logo' })}</span></span>`;
    const odd = ctx.edition === 'slot' ? '' : ctx.logo.html('colour', { width: 160, colourway: 'colour', color: cw.colour.plumb || cw.colour.name, label: 'Logo' });
    const first = photoOf(ctx);
    const items = [
      ['Do not stretch, squash or skew it.', `<span class="hg-mis__f"><span class="hg-mis__x" style="transform:scale(1.8,.5)">${lg()}</span></span>`],
      ['Do not recolour it outside the versions.', `<span class="hg-mis__f"><span class="hg-mis__lg hg-mis__lg--w"><span class="hg-logo" style="--ar:${ctx.logo.geos.colour.w.toFixed(2)}/${ctx.logo.geos.colour.h.toFixed(2)}">${odd || ctx.logo.html('colour', { width: 160, label: 'Logo' })}</span></span></span>`],
      ['Do not rotate it.', `<span class="hg-mis__f"><span class="hg-mis__x" style="transform:rotate(-14deg)">${lg()}</span></span>`],
      ['Do not add shadows, glows or other effects.', `<span class="hg-mis__f"><span class="hg-mis__x hg-mis__fx">${lg()}</span></span>`],
      ['Do not set it on a busy part of a photo.', `<span class="hg-mis__f hg-mis__f--p">${ph(ctx, first, '50% 50%')}<span class="hg-mis__p">${lg()}</span></span>`],
      ['Do not outline it or put it in a box.', `<span class="hg-mis__f"><span class="hg-mis__x hg-mis__box">${lg()}</span></span>`],
    ];
    const inner = `<ol class="hg-mis">${items.map(([t, f], i) => `<li>${f}<span class="hg-mis__c" aria-hidden="true"><svg viewBox="0 0 20 20" width="20" height="20" focusable="false"><path d="M3 3L17 17M17 3L3 17"/></svg></span><div class="hg-mis__t">${tag(i + 1)}<p class="hg-note">${A(t)}</p></div></li>`).join('')}</ol>`;
    return sheet(ctx, 'logo-misuse', { drawing: 'Misuse', scale: 'Not to scale' }, inner);
  },

  // ---- Colour ----
  palette(ctx) {
    const B = ctx.brand, cols = ctx.colours;
    const sum = cols.reduce((a, c) => a + c.share, 0), wd = cols.map((c) => (c.share / sum) * 100);
    const fields = `<div class="hg-fields" role="list">${cols.map((c, i) => {
      const t = inkOn(ctx, c.hex), pct = Math.round(c.share * 100);
      ctx.pair(t, c.hex, { size: 13, what: 'guide finishes field' });
      return `<div class="hg-field" role="listitem" style="--w:${wd[i].toFixed(3)}%;--h:${Math.max(64, Math.round(c.share * 640))}px"><div class="hg-field__f${c.share < 0.1 ? ' is-thin' : ''}" style="background:${c.hex};color:${t}"><span class="hg-field__n hg-m">${pad2(i + 1)}</span><span class="hg-field__k">${A(c.name)}</span><span class="hg-field__s hg-m hg-at-s">${pct}%</span></div>${dimH(`${pct}%`, { side: 'bottom' })}</div>`;
    }).join('')}</div>`;
    const ramp = (c) => (c.ramp && c.rampBase !== 50 ? `<ol class="hg-ramp" aria-label="${A(c.name)} ramp, lightest to darkest">${Object.entries(c.ramp).map(([k, hx]) => `<li${+k === c.rampBase ? ' class="is-base"' : ''} style="background:${hx}"></li>`).join('')}</ol>` : '');
    const entry = (c, i, pre = '') => `<li class="hg-fin"><span class="hg-fin__n hg-m" aria-hidden="true">${pre}${pad2(i + 1)}</span>${sw(c.hex)}<div class="hg-fin__t"><h2 class="hg-fin__k">${A(c.name)}</h2><p class="hg-note">${A(c.lands)}</p>${ramp(c)}</div><p class="hg-fin__v hg-m">${A(c.hex.toUpperCase())}</p></li>`;
    const inner = `${fields}<p class="hg-big hg-measure-t">Each field is sized to that colour&rsquo;s share of a ${A(B.name)} page.</p>
<div class="hg-block">${label('Finishes schedule')}<ol class="hg-fins">${cols.map((c, i) => entry(c, i)).join('')}</ol></div>
${ctx.tones.length ? `<div class="hg-block">${label('Tones')}<ol class="hg-fins">${ctx.tones.map((c, i) => entry(c, i, 'T')).join('')}</ol></div>` : ''}`;
    return sheet(ctx, 'palette', { drawing: 'Finishes schedule', scale: 'Share of a page' }, inner);
  },
  proportion(ctx) {
    const cols = [...ctx.colours].sort((a, b) => b.share - a.share), G = ctx.gridMeasures, sum = cols.reduce((a, c) => a + c.share, 0);
    const page = `<figure class="hg-tko" style="--ar:${ctx.brand.layout.page.w}/${ctx.brand.layout.page.h}" aria-label="A ${A(ctx.brand.name)} page divided by the share of each colour">
<div class="hg-tko__p">${cols.map((c) => `<span class="hg-tko__b${c.share < 0.1 ? ' is-thin' : ''}" style="flex:${c.share / sum};background:${c.hex}"></span>`).join('')}</div>
<ol class="hg-tko__d" aria-hidden="true">${cols.map((c) => `<li style="flex:${c.share / sum}"><span class="hg-m">${Math.round(c.share * 100)}%</span></li>`).join('')}</ol></figure>`;
    void G;
    const list = `<ol class="hg-fins hg-fins--s">${cols.map((c, i) => `<li class="hg-fin"><span class="hg-fin__n hg-m" aria-hidden="true">${pad2(i + 1)}</span>${sw(c.hex)}<div class="hg-fin__t"><h2 class="hg-fin__k">${A(c.name)}</h2><p class="hg-note">${A(c.role)}</p></div><p class="hg-fin__v hg-m">${Math.round(c.share * 100)}%</p></li>`).join('')}</ol>`;
    const inner = `<div class="hg-takeoff">${page}<div class="hg-block">${label('Area take-off')}<p class="hg-note">A page divided by the share of each colour, largest first.</p>${list}</div></div>`;
    return sheet(ctx, 'proportion', { drawing: 'Area take-off', scale: 'Share of a page' }, inner);
  },
  contrast(ctx) {
    const pair = (p) => `<li class="hg-pr"><span class="hg-pr__s" style="background:${p.bgHex};color:${p.fgHex}"><span class="hg-pr__a">Aa</span></span><span class="hg-note">${A(p.use)}</span><span class="hg-pr__r hg-m">${A(p.ratioText)}&thinsp;:&thinsp;1</span></li>`;
    const inner = `<div class="hg-block">${label('Contrast, pair by pair')}<p class="hg-note hg-measure-t">Every text pair ${A(ctx.brand.name)} uses, in its own colours, with its WCAG ratio. Text needs 4.5&#8239;:&#8239;1; type at 24&nbsp;px and over needs 3&#8239;:&#8239;1.</p><ul class="hg-prs">${ctx.pairs.map(pair).join('')}</ul></div>`;
    return sheet(ctx, 'contrast', { drawing: 'Contrast schedule', scale: 'Not to scale' }, inner);
  },
  'colour-values'(ctx) {
    const vals = (c) => `<dl class="hg-fin__vs"><div><dt>HEX</dt><dd class="hg-m">${A(c.hex.toUpperCase())}</dd></div><div><dt>RGB</dt><dd class="hg-m">${A(rgbOf(ctx, c.hex))}</dd></div><div><dt>OKLCH</dt><dd class="hg-m">${A(c.oklch || ctx.C.oklchString(c.hex))}</dd></div>${ctx.C.cmykOf(c) ? `<div><dt>CMYK</dt><dd class="hg-m">${A(ctx.C.cmykOf(c))}</dd></div>` : ''}</dl>`;
    const entry = (c, i, pre = '') => `<li class="hg-fin"><span class="hg-fin__n hg-m" aria-hidden="true">${pre}${pad2(i + 1)}</span>${sw(c.hex)}<div class="hg-fin__t"><h2 class="hg-fin__k">${A(c.name)}</h2></div>${vals(c)}</li>`;
    const roleKeys = [['surface', 'Surface'], ['raised', 'Raised'], ['text', 'Text'], ['quiet', 'Quiet text'], ['border', 'Border'], ['action', 'Action'], ['actionLabel', 'Action label'], ['focus', 'Focus']];
    const toneKeys = [['success', 'Success'], ['warning', 'Warning'], ['danger', 'Danger'], ['info', 'Info']];
    const roles = (mode, title) => { const r = ctx.roles[mode], items = [...roleKeys.map(([k, n]) => [n, r[k]]), ...toneKeys.map(([k, n]) => [n, r[k].fg])]; return `<div><h2 class="hg-h3">${title}</h2><ul class="hg-roles">${items.map(([n, hx]) => `<li>${sw(hx)}<span class="hg-roles__n">${A(n)}</span><span class="hg-m">${A(String(hx).toUpperCase())}</span></li>`).join('')}</ul></div>`; };
    const inner = `<div class="hg-block">${label('Values')}<ol class="hg-fins">${ctx.colours.map((c, i) => entry(c, i)).join('')}${ctx.tones.map((c, i) => entry(c, i, 'T')).join('')}</ol></div>
<div class="hg-split">${roles('light', 'Interface roles, light')}${roles('dark', 'Interface roles, dark')}</div>`;
    return sheet(ctx, 'colour-values', { drawing: 'Colour values', scale: 'Not to scale' }, inner);
  },
};
void WEIGHT;
