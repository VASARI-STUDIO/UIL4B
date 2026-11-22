// Theme 23, Broadsheet, brand book lane (bk): the HTML brand book as the paper's web edition. One long read under a masthead: each of the
// nine sections is a section front of the brand's weekly paper (a folio bar over the thin-thick head rule, one story on four ruled columns,
// at most one halftone plate, a jump line to the next section), and the downloads are the classifieds. Four columns become two at 840 px
// and one at 600 px, in reading order; a column rule is drawn only beside text, so none at one column.
// The engine adds the shell (skip link, section nav, light and dark switch), the shared behaviour (copy, type tester, menu) and the fonts.
// Nothing here names a brand colour id or writes a brand hex: colours come from roles, colourways and the palette data.
import { BOOK_SECTIONS } from '../../engine/book.js';
import { A, N, measure, displayWeight, editionLine } from './helpers.js';
import { plateOf, plateSvg } from './lane-bk-plates.js';
import { plateImg } from '../../engine/plate.js';
import { bookCss, nightGround } from './lane-bk-css.js';
import { frontPage } from './frontpage.js';

export { bookCss };

// the photographed scenes the book prints (ctx.mockup), named in one place
const SCENES = { paper: 'newspaper-counter' };

// ---- plates: the server holds no photographs, so none is drawn (see lane-bk-plates.js) ---------------------------------------------------------------------------------
// front: the brand's cover plate (its own shot and crop). Then every shot with a photograph, the first one the front does not print leading.
const photoShots = (B) => B.imagery.shots.map((s, i) => [s, i]).filter(([s]) => s.photo);
const frontShot = (B) => (B.imagery.plates?.cover?.shot ?? 0);
const essayOrder = (B) => { const f = frontShot(B), all = photoShots(B).map(([, i]) => i); return [...all.filter((i) => i !== f), ...all.filter((i) => i === f)]; };

// ---- small parts -----------------------------------------------------------------------------------------------------------------------
const words = (s) => String(s).trim().split(/\s+/).length;
// The headline fit: the size never lets the longest word pass its column. --k is font px per column px for that word, read from the brand's
// own display face, so a wide cut (a stretched display) comes down in size, not in columns.
const fitK = (ctx, text) => { const w = Math.max(...String(text).split(/\s+/).map((t) => measure(ctx, t, 100))); return (100 / w) * 0.94; };
const head = (ctx, tag, text, { cls = 'np-hl', fs = 64, id = '' } = {}) => `<${tag} class="${cls}"${id ? ` id="${id}"` : ''} style="--fs:${fs}px;--k:${fitK(ctx, text).toFixed(4)}">${A(text)}</${tag}>`;
// copy controls: the visible text is the action, the accessible name says what it copies
const copyBtn = (label, value, what) => `<button type="button" class="bk-btn np-copy" data-copy="${A(value)}" data-copy-label="${A(what)}" aria-label="${A(label)} ${A(what)}"><span class="bk-btn__t">${A(label)}</span></button>`;
const valBtn = (kind, value, name) => `<button type="button" class="bk-btn np-val" data-copy="${A(value)}" data-copy-label="${A(name)} ${kind}" aria-label="Copy ${kind} ${A(value)}, ${A(name)}"><span class="bk-btn__t">${A(value)}</span></button>`;
const dl = (f, label, text) => (f ? `<a class="np-dl" href="${A(f.href)}" download aria-label="Download ${A(label)}, ${A(f.ext)}, ${A(f.sizeText)}">${A(text || f.ext)}</a>` : '');
const rgbOf = (ctx, hex) => { const [r, g, b] = ctx.C.hexToRgb(hex); return `rgb(${r}, ${g}, ${b})`; };
// the better-reading text colour on a brand colour, from the brand's own light and dark text and grounds
// the band label is small type, so it is held to 4.5:1 through the shared picker
const onColour = (ctx, hex) => ctx.textOn(hex, { size: 12 });
// a pale field needs an edge on the newsprint
const pale = (ctx, hex) => ctx.ratio(hex, N.paper) < 1.25;

// the section front: the folio bar (section number and name, the edition at the right), then the thin-thick head rule
const bar = (ctx, i) => {
  const s = BOOK_SECTIONS[i];
  return `<header class="np-bar"><p class="np-bar__no" aria-hidden="true">${i + 1}</p><h2 class="np-bar__t" id="h-${s.id}">${A(s.title)}</h2><p class="np-bar__ed">${A(editionLine(ctx))}</p></header><i class="np-rule" aria-hidden="true"></i>`;
};
// "turn to page 4": the jump line to the next section, a real link
const jumpTo = (i) => { const s = BOOK_SECTIONS[i + 1]; return s ? `<p class="np-jump"><a href="#${s.id}"><i>Turn to ${A(s.title)},</i> <b>section ${i + 2}</b></a></p>` : ''; };
const sec = (ctx, i, inner, cls = '') => { const s = BOOK_SECTIONS[i]; return `<section class="bk-sec np-sec${cls ? ' ' + cls : ''}" id="${s.id}" aria-labelledby="h-${s.id}">${bar(ctx, i)}${inner}${jumpTo(i)}</section>`; };
const cap = (t) => `<p class="np-cap">${t}</p>`;
// a plate with its caption under it; a shot with no photograph gets no plate (the page leaves the paper bare, never an empty box)
// A generated shot (generated: true) carries no credit. A photographer's credit prints once in the book, under the first plate that has one.
let credited = false;
const plate = (ctx, key, cls = '') => {
  const m = plateOf(ctx, key); if (!m) return '';
  const cr = m.shot.credit && !m.shot.generated && !credited ? (credited = true, ` <span class="np-credit">Photo: ${A(m.shot.credit)}.</span>`) : '';
  return `<figure class="np-plate ${cls}">${plateSvg(ctx, key, { alt: A(m.shot.alt || m.caption) })}<figcaption class="np-cap np-cap--ink">${A(m.caption)}${cr}</figcaption></figure>`;
};

// ---- 1 Overview: the front page --------------------------------------------------------------------------------------------------------
function overview(ctx) {
  const B = ctx.brand, L = ctx.logo, scr = B.ui.screen, g = L.geos.colour, i = 0;
  // the nameplate: the full logo as wide as the measure allows under a 176 px cap height; the night edition prints the reversed version
  const npW = Math.min(1240, (176 * g.w) / g.h);
  const nameplate = `<div class="np-name" style="--nw:${npW.toFixed(1)}px;aspect-ratio:${g.w.toFixed(2)}/${g.h.toFixed(2)}"><span class="bk-for-light">${L.html('colour', { width: npW, color: N.ink, label: 'Logo' })}</span><span class="bk-for-dark">${L.html('reversed', { width: npW, color: N.paper, label: 'Logo' })}</span></div>`;
  const inside = BOOK_SECTIONS.slice(1).map((s, k) => `<li><a href="#${s.id}"><span class="np-ix__n">${k + 2}</span><span class="np-ix__t">${A(s.title)}</span></a></li>`).join('');
  const rows = scr.content.deliveries.slice(0, 5).map((d) => `<li><p class="np-mk__to">${A(d.to)}</p><p class="np-mk__when">${A(d.when)}</p><p class="np-price">${A(d.price)}</p></li>`).join('');
  const traits = B.personality.slice(0, 3).map((p, k) => `<div class="np-c np-c${k + 1} np-brief${k ? ' np-r' : ''}"><h4 class="np-tt">${A(p.trait)}</h4><p class="np-body">${A(p.means)}</p></div>`).join('');
  return `<section class="bk-sec np-sec np-front" id="overview" aria-labelledby="h-overview">
<div class="np-ears"><p>${A(editionLine(ctx))}</p>${B.city ? `<p>${A(B.city)}</p>` : ''}</div>
<i class="np-rule np-rule--thin" aria-hidden="true"></i>
${nameplate}
<i class="np-rule np-rule--under" aria-hidden="true"></i>
<div class="np-strip"><p>${A(B.name)} brand book</p><p>${A(B.applications.site.url)}</p></div>
<div class="np-g np-lead">
<div class="np-c np-c13 np-fit">${head(ctx, 'h1', B.lines.primary, { cls: 'np-hl np-hl--xl', fs: 132, id: 'h-overview' })}<p class="np-deck">${A(B.description)}</p>${plate(ctx, 'front')}</div>
<div class="np-c np-c4 np-r np-side"><h3 class="np-lab">Inside</h3><ol class="np-ix">${inside}</ol>
<h3 class="np-lab np-lab--gap">${A(scr.title)}</h3><ul class="np-mk">${rows}</ul></div>
</div>
<div class="np-g np-briefs">${traits}<div class="np-c np-c4 np-r"><h4 class="np-lab">What it does</h4><p class="np-body">${A(B.product)}</p><h4 class="np-lab np-lab--gap">Who it serves</h4><p class="np-body">${A(B.audience)}</p></div></div>
${jumpTo(i)}</section>`;
}

// ---- 2 Voice: the corrections column ----------------------------------------------------------------------------------------------------
function voice(ctx) {
  const B = ctx.brand, V = B.voice, i = 1, lead = B.lines.sheet || B.lines.others[1] || B.lines.primary;
  const princ = V.principles.map((p) => `<li><h4 class="np-lab">${A(p.title)}</h4><p class="np-ex">${A(p.example)}</p></li>`).join('');
  const corr = V.writeThis.map((r) => `<li class="np-g np-corr__r"><div class="np-c np-c12"><p class="np-not"><s>${A(r.not)}</s></p><p class="np-write">${A(r.write)}</p></div><div class="np-c np-c34 np-r"><p class="np-body np-quiet">${A(r.because)}</p></div></li>`).join('');
  const lines = [B.lines.primary, ...B.lines.others].map((l) => `<li><p class="np-ex">${A(l)}</p>${copyBtn('Copy', l, 'line')}</li>`).join('');
  return sec(ctx, i, `
<div class="np-g np-lead">
<div class="np-c np-c13 np-fit">${head(ctx, 'h3', lead, { cls: 'np-hl np-hl--xl', fs: 112 })}</div>
<div class="np-c np-c4 np-r"><h3 class="np-lab np-lab--rule">How we write</h3><ul class="np-princ">${princ}</ul></div>
</div>
<h3 class="np-sub">Write this, not that</h3>
<ol class="np-corr">${corr}</ol>
<div class="np-g np-boiler">
<div class="np-c np-c12"><h3 class="np-lab np-lab--rule">The brand in ${words(V.boilerplate25)} words</h3><p class="np-deck np-deck--b">${A(V.boilerplate25)}</p>${copyBtn('Copy text', V.boilerplate25, `${words(V.boilerplate25)}-word boilerplate`)}</div>
<div class="np-c np-c34 np-r"><h3 class="np-lab np-lab--rule">The brand in ${words(V.boilerplate50)} words</h3><p class="np-body np-cols">${A(V.boilerplate50)}</p>${copyBtn('Copy text', V.boilerplate50, `${words(V.boilerplate50)}-word boilerplate`)}</div>
</div>
<div class="np-g np-boiler">
<div class="np-c np-c12"><h3 class="np-lab np-lab--rule">Lines in use</h3><ul class="np-lines">${lines}</ul></div>
<div class="np-c np-c34 np-r"><h3 class="np-lab np-lab--rule">Writing the name</h3><p class="np-body">${A(V.nameRules)}</p></div>
</div>`, 'np-voice');
}

// ---- 3 Logo: the logo as the page's picture, the versions as a row of proofs ----------------------------------------------------------------
function logo(ctx) {
  const B = ctx.brand, L = ctx.logo, cw = B.logo.colourways, slot = ctx.edition === 'slot', i = 2;
  const box = (id, maxW, color) => { const g = L.geos[id]; return `<div class="np-lg" style="--lw:${maxW}px;aspect-ratio:${g.w.toFixed(2)}/${g.h.toFixed(2)}">${L.html(id, { width: maxW, color, label: slot ? 'Your logo goes here' : 'Logo' })}</div>`; };
  const files = (id) => { if (slot) return ''; const f = ctx.book.logo(id), n = `${L.labels[id]} logo`; return `<p class="np-dls">${dl(f.svg, n)}${dl(f.pdf, n)}${f.png.map((p) => dl(p, `${n}, PNG ${p.w} px wide`, `PNG ${p.w}`)).join('')}</p>`; };
  const lead = cw[L.colourwayOf('colour')];
  const big = `<figure class="np-proof np-proof--lead${pale(ctx, lead.ground) ? ' is-pale' : ''}" style="background:${lead.ground}">${box('colour', 520, lead.name)}</figure>`;
  const others = L.versions.filter((id) => id !== 'colour').map((id) => {
    const w = cw[L.colourwayOf(id)], g = L.geos[id], mw = Math.round(Math.min(200, (90 * g.w) / g.h));
    return `<li class="np-ver"><figure class="np-proof${pale(ctx, w.ground) ? ' is-pale' : ''}" style="background:${w.ground}">${box(id, mw, w.name)}</figure><h4 class="np-lab">${A(L.labels[id])}</h4><p class="np-cap">${A(B.logo.when[id] || '')}</p>${files(id)}</li>`;
  }).join('');
  // the clear space as a share of the logo's width: the precise unit when the logo engine gives it, else the rounded share of its height
  const gc = L.geos.colour, ms = L.minSize, pk = (L.geo?.unit ? L.geo.unit / gc.h : L.clearShare / 100) * (gc.h / gc.w);
  const clear = `<figure class="np-clear-f"><div class="np-clear" style="--pk:${pk.toFixed(4)}"><div class="np-clear__in">${box('colour', 320, 'var(--np-ink)')}</div></div><figcaption class="np-cap">Keep ${L.clearShare}% of the logo's height clear on every side. The dashed line is the edge of that space.</figcaption></figure>`;
  const min = slot ? '<p class="np-body">Set the smallest size once the logo is in place. The brand kit\'s logo folder says where the approved files go.</p>'
    : `<div class="np-min"><div class="np-min__lg" style="width:${ms.screenPx}px">${box('colour', ms.screenPx, 'var(--np-ink)')}</div><p class="np-body"><span class="np-mono">${ms.screenPx} px</span> wide on screen, <span class="np-mono">${ms.printMm} mm</span> in print. Never smaller.</p></div>`;
  const misuse = ['Never stretch, squash or skew it.', 'Never recolour it outside the versions above.', 'Never rotate it.', 'Never add a shadow, a glow or an outline.', 'Never set it on a busy part of a photograph.'];
  return sec(ctx, i, `
<div class="np-g np-lead">
<div class="np-c np-c14">${big}<div class="np-figline"><p class="np-cap np-cap--ink"><b class="np-capb">${A(L.labels.colour)}.</b> ${A(B.logo.when.colour || '')}</p>${files('colour')}</div></div>
</div>
<div class="np-g np-lead">
<div class="np-c np-c12"><p class="np-deck">${A(B.logo.idea)}</p></div>
<div class="np-c np-c34 np-r"><h3 class="np-lab np-lab--rule">Clear space and smallest size</h3>${clear}${min}</div>
</div>
<h3 class="np-sub">Every version</h3>
<ul class="np-vers">${others}</ul>
<div class="np-g np-boiler"><div class="np-c np-c14"><h3 class="np-lab np-lab--rule">Never</h3><ul class="np-never">${misuse.map((m) => `<li>${A(m)}</li>`).join('')}</ul></div></div>`, 'np-logo');
}

// ---- 4 Colour: the band, the market table, the weather table ------------------------------------------------------------------------------
function colour(ctx) {
  const B = ctx.brand, i = 3, cols = [...ctx.colours], top = cols.reduce((a, b) => (b.share > a.share ? b : a));
  const pct = (c) => Math.round(c.share * 100);
  const band = cols.map((c) => {
    const fg = onColour(ctx, c.hex);
    return `<button type="button" class="np-f${pale(ctx, c.hex) ? ' is-pale' : ''}${c.share < 0.15 ? ' is-narrow' : ''}" style="background:${c.hex};color:${fg};--g:${pct(c)}" data-copy="${c.hex}" data-copy-label="${A(c.name)} HEX ${c.hex}" aria-label="Copy HEX ${c.hex}, ${A(c.name)}, ${pct(c)}% of a page"><span class="np-f__t"><b>${A(c.name)}</b> <span>${pct(c)}%</span></span><span class="np-f__h">${c.hex}</span></button>`;
  }).join('');
  const steps = Object.keys(cols[0].ramp);
  const vrow = (c, kind) => {
    const ramp = c.ramp ? `<span class="np-ramp" aria-hidden="true">${steps.map((k) => `<i class="${+k === c.rampBase ? 'is-base' : ''}" style="background:${c.ramp[k]}"></i>`).join('')}</span>` : '';
    return `<li class="np-g np-vrow"><div class="np-c np-c1"><p class="np-vn"><i class="np-key${pale(ctx, c.hex) ? ' is-pale' : ''}" style="background:${c.hex}" aria-hidden="true"></i><b>${A(c.name)}</b>${kind === 'colour' ? ` <span class="np-mono np-quiet">${pct(c)}%</span>` : ''}</p><p class="np-cap">${A(c.lands)}</p></div>
<div class="np-c np-c2 np-r"><p>${valBtn('HEX', c.hex, c.name)}</p><p>${valBtn('RGB', rgbOf(ctx, c.hex), c.name)}</p></div>
<div class="np-c np-c3 np-r"><p>${valBtn('OKLCH', c.oklch || ctx.C.oklchString(c.hex), c.name)}</p>${ctx.C.cmykOf(c) ? `<p>${valBtn('CMYK', ctx.C.cmykOf(c), c.name)}</p>` : ''}</div>
<div class="np-c np-c4 np-r">${ramp}</div></li>`;
  };
  const pairs = ctx.pairs.map((p) => `<li><span class="np-aa" style="background:${p.bgHex};color:${p.fgHex}" aria-hidden="true">Aa</span><span class="np-pu">${A(p.use)}${p.large ? '<span class="np-quiet">, 24 px and over</span>' : ''}</span><span class="np-ratio">${A(p.ratioText)}<span class="np-quiet"> : 1</span></span></li>`).join('');
  const roleKeys = [['surface', 'Surface'], ['raised', 'Raised'], ['text', 'Text'], ['quiet', 'Quiet text'], ['border', 'Border'], ['action', 'Action'], ['actionLabel', 'Action label'], ['focus', 'Focus']];
  const roles = (mode) => `<ul class="np-roles bk-for-${mode}">${roleKeys.map(([k, n]) => { const hx = ctx.roles[mode][k]; return `<li><i class="np-key${pale(ctx, hx) || ctx.ratio(hx, nightGround(ctx)) < 1.25 ? ' is-pale' : ''}" style="background:${hx}" aria-hidden="true"></i><span>${A(n)}</span>${valBtn('HEX', hx, `${mode} ${n}`)}</li>`; }).join('')}</ul>`;
  return sec(ctx, i, `
<div class="np-g np-lead"><div class="np-c np-c13 np-fit">${head(ctx, 'h3', `${top.name} covers ${pct(top)}% of every page.`, { cls: 'np-hl', fs: 72 })}<p class="np-deck">Each colour takes the share of a page it is given here. Press a colour, or any value, to copy it.</p></div></div>
<div class="np-band">${band}</div>
<h3 class="np-sub">By the numbers</h3>
<ul class="np-vals">${cols.map((c) => vrow(c, 'colour')).join('')}${ctx.tones.map((t) => vrow({ ...t, ramp: null }, 'tone')).join('')}</ul>
<div class="np-g np-boiler">
<div class="np-c np-c12"><h3 class="np-lab np-lab--rule">Text pairs and their contrast</h3><p class="np-body np-quiet">Every pair ${A(B.name)} sets text in, measured. Text needs 4.5 : 1; type at 24 px and over needs 3 : 1.</p><ul class="np-pairs">${pairs}</ul></div>
<div class="np-c np-c34 np-r"><h3 class="np-lab np-lab--rule">Interface roles, <span class="bk-for-light">light</span><span class="bk-for-dark">dark</span></h3><p class="np-body np-quiet">The switch at the top shows the other set.</p>${roles('light')}${roles('dark')}</div>
</div>`, 'np-colour');
}

// ---- 5 Typography: the face's own name as the headline -------------------------------------------------------------------------------------
function typography(ctx) {
  const B = ctx.brand, F = B.fonts, T = B.type, i = 4, dW = displayWeight(ctx), st = F.display.stretch || 100;
  const dStyle = `font-family:var(--np-display);font-weight:${dW};font-stretch:${st}%;letter-spacing:-0.01em`;
  const scale = T.scale.map((s) => {
    const disp = s.face === 'display', txt = T.sample.headline;
    const k = disp ? fitK(ctx, txt) : 0.5;
    return `<li class="np-g np-srow"><div class="np-c np-c1"><h4 class="np-lab">${A(ctx.cap(s.token))}</h4><p class="np-cap"><span class="np-mono">${s.size} px</span>, line ${s.line}, weight ${s.weight}</p><p class="np-cap">${A(s.use)}</p></div><div class="np-c np-c24 np-r np-fit"><p class="np-spec" style="${disp ? dStyle : `font-family:var(--np-body);font-weight:${s.weight}`};line-height:${s.line};--fs:${s.size}px;--k:${k.toFixed(4)}">${A(txt)}</p></div></li>`;
  }).join('');
  const tester = `<div class="np-tester" data-tester><div class="np-g"><div class="np-c np-c1"><h3 class="np-lab np-lab--rule">Try a line</h3>
<div class="np-field"><label for="np-tt">Your line</label><input id="np-tt" type="text" value="${A(T.sample.headline)}" data-tester-text data-default="${A(T.sample.headline)}" autocomplete="off" spellcheck="false"></div>
<div class="np-field"><label for="np-ts">Size <output for="np-ts" data-tester-value class="np-mono">64 px</output></label><input id="np-ts" type="range" min="16" max="128" step="1" value="64" data-tester-size></div></div>
<div class="np-c np-c24 np-r"><p class="np-tout np-tout--d" data-tester-out aria-hidden="true" style="${dStyle}">${A(T.sample.headline)}</p><p class="np-tout np-tout--b" data-tester-out aria-hidden="true">${A(T.sample.headline)}</p></div></div></div>`;
  const rules = T.rules.map((r) => `<li class="np-g np-corr__r"><div class="np-c np-c12"><p class="np-write np-write--s">${A(r.do)}</p></div><div class="np-c np-c34 np-r"><p class="np-not np-not--b"><s>${A(r.dont)}</s></p></div></li>`).join('');
  const alpha = ['ABCDEFGHIJKLM', 'NOPQRSTUVWXYZ', 'abcdefghijklm', 'nopqrstuvwxyz', '0123456789'];
  return sec(ctx, i, `
<div class="np-g np-lead">
<div class="np-c np-c13 np-fit">${head(ctx, 'h3', F.display.family, { cls: 'np-hl np-hl--xl', fs: 160 })}<p class="np-cap np-cap--ink"><b class="np-capb">Display face.</b> Headlines, one or two lines at a time. Weight${F.display.weights.length > 1 ? 's' : ''} <span class="np-mono">${F.display.weights.join(', ')}</span>.</p></div>
<div class="np-c np-c4 np-r np-fit"><p class="np-alpha" style="${dStyle};--k:${fitK(ctx, alpha.join(' ')).toFixed(4)}" aria-label="The alphabet and figures in ${A(F.display.family)}">${alpha.map((l) => `<span>${l}</span>`).join('')}</p></div>
</div>
<div class="np-g np-lead">
<div class="np-c np-c12"><p class="np-bodyface">${A(F.body.family)}</p><p class="np-cap np-cap--ink"><b class="np-capb">Body face.</b> Reading text, labels and captions. Weights <span class="np-mono">${F.body.weights.join(', ')}</span>.</p></div>
<div class="np-c np-c34 np-r">${F.mono ? `<p class="np-monoface">${A(F.mono.family)}</p><p class="np-cap np-cap--ink"><b class="np-capb">Mono.</b> A hex, a token or a code string, nothing else.</p>` : ''}</div>
</div>
<h3 class="np-sub">The scale</h3>
<ol class="np-scale">${scale}</ol>
${tester}
<div class="np-g np-boiler np-inuse">
<div class="np-c np-c14"><h3 class="np-lab np-lab--rule">In use</h3></div>
<div class="np-c np-c12 np-fit"><p class="np-hl np-hl--use" style="--fs:56px;--k:${fitK(ctx, T.sample.headline).toFixed(4)}">${A(T.sample.headline)}</p></div>
<div class="np-c np-c34 np-r"><p class="np-body np-body--b np-cols">${A(T.sample.paragraph)}</p><p class="np-cap">${A(T.sample.caption)}</p></div>
</div>
<h3 class="np-sub">Setting the type</h3>
<ol class="np-corr">${rules}</ol>`, 'np-type');
}

// ---- 6 Imagery: the picture page -----------------------------------------------------------------------------------------------------------
function imagery(ctx) {
  const B = ctx.brand, D = B.imagery.direction, shots = B.imagery.shots, i = 5, order = essayOrder(B);
  const orig = (s) => { const f = s.photo && ctx.book.find(`05 Imagery/photos/${s.photo.split('/').pop()}`); return f ? `<p class="np-dls">${dl(f, `original photograph, ${s.caption || s.id}`, `Original, ${f.ext} ${f.sizeText}`)}</p>` : ''; };
  const [lead, ...rest] = order;
  const dirRows = [['Light', D.light], ['Crop', D.crop], ['Colour', D.colour], ['People', D.people]].filter(([, v]) => v);
  const still = shots.filter((s) => !s.photo);
  return sec(ctx, i, `
<div class="np-g np-lead"><div class="np-c np-c13 np-fit">${head(ctx, 'h3', D.subject, { cls: 'np-hl np-hl--long', fs: 48 })}</div></div>
<div class="np-g np-lead">
<div class="np-c np-c13">${lead != null ? plate(ctx, `shot-${lead}`) + orig(shots[lead]) : ''}</div>
<div class="np-c np-c4 np-r">${dirRows.map(([k, v]) => `<p class="np-body np-run"><b>${k}.</b> ${A(v)}</p>`).join('')}</div>
</div>
${rest.length ? `<div class="np-g np-lead">${rest.slice(0, 2).map((k, n) => `<div class="np-c ${n ? 'np-c34 np-r' : 'np-c12'}">${plate(ctx, `shot-${k}`)}${orig(shots[k])}</div>`).join('')}</div>` : ''}
${still.length ? `<h3 class="np-sub">Still to shoot</h3><ol class="np-g np-shots">${still.map((s, n) => `<li class="np-c${n % 4 ? ' np-r' : ''}"><h4 class="np-lab">${A(ctx.cap(s.id))}</h4><p class="np-body">${A(s.slot)}</p></li>`).join('')}</ol>` : ''}
<h3 class="np-sub">Picture rules</h3>
<ol class="np-corr">${B.imagery.rules.map((r) => `<li class="np-g np-corr__r"><div class="np-c np-c12"><p class="np-write np-write--s">${A(r.do)}</p></div><div class="np-c np-c34 np-r"><p class="np-not np-not--b"><s>${A(r.dont)}</s></p></div></li>`).join('')}</ol>`, 'np-imagery');
}

// ---- 7 Layout: the brand's page, drawn to scale ---------------------------------------------------------------------------------------------
function layout(ctx) {
  const G = ctx.gridMeasures, B = ctx.brand, i = 6;
  const cols = Array.from({ length: G.columns }, () => '<i></i>').join('');
  const m = (G.margin / G.page.w) * 100, gap = (G.gutter / (G.page.w - 2 * G.margin)) * 100, mt = (G.margin / G.page.h) * 100;
  const meas = [['Page', `${G.page.w} × ${G.page.h} px`], ['Columns', `${G.columns}`], ['Column', `${(Math.round(G.col * 10) / 10)} px`], ['Gutter', `${G.gutter} px`], ['Margin', `${G.margin} px`], ['Base unit', `${G.base} px`]];
  const radii = ctx.radii.filter((r) => r.px < 9999);
  const maxS = Math.max(...ctx.space.map((s) => s.px));
  return sec(ctx, i, `
<div class="np-g np-lead"><div class="np-c np-c13 np-fit">${head(ctx, 'h3', `${G.columns} columns on a ${G.base} px base.`, { cls: 'np-hl', fs: 72 })}</div></div>
<div class="np-g np-lead">
<div class="np-c np-c13"><figure class="np-page" role="img" aria-label="The ${G.page.w} by ${G.page.h} page with ${G.columns} columns, a ${G.margin} px margin and a ${G.gutter} px gutter" style="aspect-ratio:${G.page.w}/${G.page.h};padding:${mt.toFixed(3)}% ${m.toFixed(3)}%"><span class="np-page__g" style="column-gap:${gap.toFixed(3)}%;grid-template-columns:repeat(${G.columns},minmax(0,1fr))">${cols}</span></figure><p class="np-cap">The brand's page, drawn to scale: the columns shaded, the margins bare.</p></div>
<div class="np-c np-c4 np-r"><h3 class="np-lab np-lab--rule">Measures</h3><dl class="np-meas">${meas.map(([k, v]) => `<div><dt>${k}</dt><dd class="np-mono">${v}</dd></div>`).join('')}</dl></div>
</div>
<div class="np-g np-boiler">
<div class="np-c np-c12"><h3 class="np-lab np-lab--rule">Spacing</h3><ul class="np-space">${ctx.space.map((s) => `<li><span class="np-mono">${s.px}</span><i style="width:${((s.px / maxS) * 100).toFixed(2)}%"></i></li>`).join('')}</ul></div>
<div class="np-c np-c34 np-r"><h3 class="np-lab np-lab--rule">Corners and edges</h3><ul class="np-radii">${radii.map((r) => `<li><i style="border-radius:${r.px}px"></i><p class="np-body">${A(r.use)}, <span class="np-mono">${r.px} px</span></p></li>`).join('')}</ul><p class="np-body np-quiet">Edges are <span class="np-mono">${B.ui.border} px</span>. ${A(B.ui.elevationNote || '')}</p></div>
</div>`, 'np-layout');
}

// ---- 8 Applications: the brand at work, set as figures on the columns ---------------------------------------------------------------------------
function applications(ctx) {
  const B = ctx.brand, L = ctx.logo, ap = B.applications, R = ctx.roles.light, cws = B.logo.colourways, rev = cws[L.colourwayOf('reversed')], S = B.ui.screen.content, i = 7;
  const lg = (id, w, color, cw) => { const g = L.geos[id]; return `<span class="np-alg" style="--lw:${w}px;aspect-ratio:${g.w.toFixed(2)}/${g.h.toFixed(2)}">${L.html(id, { width: w, color, colourway: cw, label: 'Logo' })}</span>`; };
  // the sign prints the brand line its brief names, whole (a brand string is never cut: the slot edition swaps them for placeholders)
  const signText = [...B.lines.others, B.lines.primary, ...(ap.social || [])].find((l) => (ap.signage || '').endsWith(l)) || B.lines.others[0] || B.lines.primary;
  const post = (ap.social || []).find((l) => l !== B.lines.primary && l !== signText) || B.lines.primary;
  // the post's logo: the colourway whose ground is the action colour, else mono on it
  const own = Object.keys(cws).find((k) => cws[k].ground.toLowerCase() === R.action.toLowerCase());
  const pcw = own || (ctx.ratio(cws['mono-light']?.name || R.actionLabel, R.action) >= ctx.ratio(cws['mono-dark']?.name || R.text, R.action) ? 'mono-light' : 'mono-dark');
  const screen = `<div class="np-phone"><div class="ui np-screen" role="img" aria-label="${A(B.name)} on a phone: ${A(B.ui.screen.title)}. ${A(S.eta)}." inert>
<div class="np-scr__top"><span class="bk-for-light">${lg('horizontal', 110, 'var(--text)', 'colour')}</span><span class="bk-for-dark">${lg('horizontal', 110, rev.name, L.colourwayOf('reversed'))}</span><span class="ui-num">${A(S.time)}</span></div>
<p class="ui-display np-scr__t">${A(B.ui.screen.title)}</p>
${ctx.ui.deliveryRows(4)}
<div class="np-scr__btn">${ctx.ui.btn(`${S.form?.book || S.call}, ${S.paid}`, { block: true })}</div></div></div>`;
  const card = `<div class="np-card np-card--f" style="background:${rev.ground};color:${rev.name}">${lg('reversed', 150, rev.name)}<p class="np-card__l">${A(B.lines.primary)}</p></div>
<div class="np-card np-card--b" style="background:${R.surface};color:${R.text}"><p class="np-card__n">${A(ap.card.person)}</p><p class="np-card__r" style="color:${R.quiet}">${A(ap.card.role)}</p><p class="np-card__c">${A(ap.card.contact)}<br>${A(ap.site.url)}</p></div>`;
  const postArt = `<div class="np-post" style="background:${R.action};color:${R.actionLabel}"><p class="np-post__l np-fit2" style="--k:${fitK(ctx, post).toFixed(4)}">${A(post)}</p>${lg('horizontal', 170, cws[pcw].name, pcw)}</div>`;
  const sign = `<div class="np-signart" style="background:${rev.ground};color:${rev.name}"><p class="np-sign__l" style="--k:${fitK(ctx, signText).toFixed(4)}">${A(signText)}</p>${lg('colour', 140, rev.name, L.colourwayOf('reversed'))}</div>`;
  const email = `<div class="np-mail" style="background:${R.surface};color:${R.text}"><p class="np-mail__n">${A(ap.email.person)}</p><p class="np-mail__r" style="color:${R.quiet}">${A(ap.email.role)}, ${A(B.name)}</p><p class="np-mail__c">${A(ap.card.contact)}<br>${A(ap.site.url)}</p><div class="np-mail__lg">${lg('horizontal', 150, R.text, 'colour')}</div></div>`;
  const fig = (cls, art, title, note) => `<figure class="np-c ${cls}">${art}<figcaption class="np-cap np-cap--ink"><b class="np-capb">${A(title)}.</b> ${A(note)}</figcaption></figure>`;
  // the section's photograph: the brand's own front page on the counter, the same sheet and scene as the guidelines' layouts page
  const SW = 1123, TH = Math.round(SW / ctx.sceneInfo(SCENES.paper).quads[0].aspect);
  const paper = ctx.mockup(SCENES.paper, { 'front-page': { html: ctx.artPage(`<i class="ar-fill" style="background:var(--paper)"></i>${frontPage(ctx)}`, { w: SW, h: TH }), w: SW, h: TH } });
  return sec(ctx, i, `
<div class="np-g np-lead"><div class="np-c np-c13 np-fit">${head(ctx, 'h3', B.product, { cls: 'np-hl np-hl--long', fs: 64 })}</div></div>
<div class="np-g np-lead np-apps-lead">
<figure class="np-c np-c13 np-photo">${plateImg(A(paper), `${A(B.name)} front page, folded once, on a stone counter`)}<figcaption class="np-cap np-cap--ink"><b class="np-capb">The paper.</b> The front of an A3 sheet, folded once on the counter.</figcaption></figure>
${fig('np-c4 np-r np-a-card', `<div class="np-cards">${card}</div>`, 'Business card', '90 by 55 mm, front and back.')}
</div>
<div class="np-g np-apps">
${fig('np-a-phone', screen, 'On a phone', `${B.ui.screen.title}, the list as it stands this morning.`)}
${fig('np-a-post np-r', postArt, 'A post', 'One line on the action colour, the logo at the foot.')}
${fig('np-a-mail', email, 'Email signature', 'Name, role and the horizontal logo.')}
${fig('np-a-sign np-r', sign, 'The sign', ap.signage || 'One brand line and the logo.')}
</div>`, 'np-apps-sec');
}

// ---- 9 Downloads: the classifieds ----------------------------------------------------------------------------------------------------------
function downloads(ctx) {
  const B = ctx.brand, D = ctx.book, L = ctx.logo, slot = ctx.edition === 'slot', i = 8;
  const file = (f, note = '') => `<li class="np-file"><a href="${A(f.href)}" download aria-label="Download ${A(f.name)}, ${A(f.ext)}, ${A(f.sizeText)}"><span class="np-file__n">${A(f.name)}</span><span class="np-file__m">${note ? A(note) + ', ' : ''}${A(f.ext)}, ${A(f.sizeText)}</span></a></li>`;
  const logoRows = slot ? D.logoFiles.map((f) => file(f)).join('')
    : L.versions.map((id) => { const f = D.logo(id), n = L.labels[id]; return `<li class="np-file np-file--logo"><span class="np-file__n">${A(n)}</span><span class="np-dls">${dl(f.svg, n + ' logo')}${dl(f.pdf, n + ' logo')}${f.png.map((p) => dl(p, `${n} logo, PNG ${p.w} px wide`, `PNG ${p.w}`)).join('')}</span></li>`; }).join('');
  const photos = D.imagery.filter((f) => f.rel.startsWith('05 Imagery/photos/')), pdfs = D.imagery.filter((f) => f.ext === 'PDF');
  const group = (t, what, rows) => (rows ? `<div class="np-ad"><h4 class="np-ad__t">${A(t)}</h4><p class="np-cap">${A(what)}</p><ul class="np-files">${rows}</ul></div>` : '');
  return sec(ctx, i, `
<div class="np-g np-lead"><div class="np-c np-c13 np-fit">${head(ctx, 'h3', `The ${B.name} brand kit.`, { cls: 'np-hl', fs: 72 })}<p class="np-deck">Every file in this book, folder by folder. The zip holds all of it.</p></div>
<div class="np-c np-c4 np-r np-zip"><p class="np-lab">${A(D.zip.name)}</p><p class="np-cap"><span class="np-mono">${A(D.zip.sizeText)}</span></p><a class="np-btn" href="${A(D.zip.href)}" download aria-label="Download ${A(D.zip.name)}, ${A(D.zip.sizeText)}">Download the kit</a></div></div>
<div class="np-classi">
${group('Read me', 'Start here: what is in the kit and how to use it.', [D.readmePdf, D.readme].filter(Boolean).map((f) => file(f)).join(''))}
${group('Logo', slot ? 'The labelled slot frame, and where the approved files go.' : 'Each version as SVG and PDF, and as PNG at three widths, transparent.', logoRows)}
${group('Colour', 'The palette for Adobe, CSS and JSON, and a swatch sheet.', D.colour.map((f) => file(f)).join(''))}
${group('Type', 'The specimen sheet, and the faces with their links and licence.', D.type.map((f) => file(f)).join(''))}
${group('Icons', `${D.icons.length} interface icons, drawn in the brand's stroke.`, D.icons.map((f) => file(f, 'Icon')).join('') + (D.iconsLicence ? file(D.iconsLicence, 'Licence') : ''))}
${group('Imagery', photos.length ? 'The photography direction, and the photographs.' : 'The photography direction and shot list.', [...pdfs, ...photos].map((f) => file(f)).join(''))}
</div>`, 'np-down');
}

// The ink moment is the front page's plate inking in once on load, in CSS (bookCss): every other plate is printed whole, so a full-page
// capture, a print or a reader who lands mid-book never meets a half-inked picture.
export function brandBook(ctx) {
  if (!ctx.book) throw new Error('brandBook needs ctx.book (set by the engine book builder)');
  credited = false;
  return [overview, voice, logo, colour, typography, imagery, layout, applications, downloads].map((f) => f(ctx)).join('\n');
}