// Theme 23, Broadsheet, lane kt: the brand kit PDFs (readMe and sheets). The kit's documents are more pages of the same paper: the newsprint
// ground, the folio line under its thin-thick rule, the four columns with hairline rules only beside text, and one story a page.
// Each page is the part of a newspaper that does the same job: the read-me is the notice to readers with the paper's directory, the icon
// sheet is the paper's own set of pictograms, the colour sheet is a press colour bar read against a market table, the type sheets are the
// compositor's case, one face a page, and the photography sheets are the picture page and the picture desk's brief.
// The engine prints four PDFs (read-me, colour, type, photography) and has no icon PDF, so the icon sheet is the read-me's second page,
// the page that describes the 04 Icons folder. Every value is read from ctx and brand data; no colour id, photo id or brand name is written here.
import { icon, iconSet } from '../../engine/components.js';
import { A, N, G, E, hr, px, pad3, fitLines, headLines, fitLogo, bodyWeight, displayWeight, measure, measureRole, glyphLines, GLYPHS, linesIn, TRACK } from './helpers.js';

const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
const word = (n) => WORDS[n] || String(n);
// for the theme's own words only, never a brand string
const up = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const same = (a, b) => String(a).toLowerCase() === String(b).toLowerCase();

// ---- the photographs: the picture page prints the photographs on file --------------------------------------------------------------------
// The server holds no photograph files (a shot is a brief), so none is screened and the picture page shows the briefs still to shoot.
const PH = { lead: { w: 1000, h: 560 }, pair: { w: 488, h: 325 } };
const made = {};

// ---- the paper ---------------------------------------------------------------------------------------------------------------------
const page = (id, inner) => `<section class="pg kt" data-page="${id}">${inner}</section>`;
// The kit's folio line: the page's number in its own document and the document's name on the left, the logo in the centre, the kit and its
// edition on the right; then the paper's thin-over-thick head rule.
function folio(ctx, no, section) {
  const L = ctx.logo, B = ctx.brand;
  let v = 'horizontal', w = fitLogo(ctx, v, 140, 22);
  if (w * L.geos[v].h / L.geos[v].w < 12) { v = 'symbol'; w = fitLogo(ctx, v, 140, 22); }
  const h = w * L.geos[v].h / L.geos[v].w;
  return E(G.left, 40, 'c-folio-no', pad3(no)) + E(G.left + 56, 40, 'c-folio', A(section))
    + E(G.mid - w / 2, 52 - h / 2, 'flogo', L.html(v, { width: w, colourway: 'colour', color: N.ink, label: 'Logo' }), { w, h })
    + E(G.right - 400, 40, 'c-folio c-quiet c-right', `${A(B.name)} brand kit, edition ${A(B.version.number)}`, { w: 400 })
    + hr(G.left, 72, 1000, 1) + hr(G.left, 76, 1000, 3);
}
// one story, flowing from the story top; and a block hung from the content floor so the page ends on it
const story = (inner, cls = '') => `<div class="a kt-story ${cls}" style="left:${px(G.left)};top:${px(G.top)};width:1000px">${inner}</div>`;
const foot = (inner) => `<div class="a kt-story" style="left:${px(G.left)};bottom:${1587 - G.floor}px;width:1000px">${inner}</div>`;
// a jump line to a page of the same document
const kjump = (words, no) => `<p class="c-jump"><i>${A(words)}, page</i> <b>${pad3(no)}</b></p>`;
// A headline that carries a brand string is set as one block (the browser balances it) at the size the measured fit gives, used as a cap,
// so a placeholder in the slot edition still fits. A headline in the theme's own words is set as explicit lines.
const hline = (text, f, lh, cls = 'b-head') => `<h1 class="${cls} kt-h" style="font-size:${f.size}px;line-height:${lh}px">${A(text)}</h1>`;
const lab = (t) => `<p class="c-label c-ink kt-lab">${A(t)}</p><i class="kt-hr"></i>`;

// ---- read-me, page 001: the notice to readers and the paper's directory -------------------------------------------------------------
function readMe1(ctx, iconsNo) {
  const B = ctx.brand, slot = ctx.edition === 'slot', L = ctx.logo, nv = L.versions.length, set = iconSet(ctx), st = ctx.iconStyle;
  const photos = B.imagery.shots.filter((s) => s.photo).length, slug = ctx.slug;
  const t = `The ${B.name} brand kit.`, f = fitLines(ctx, t, { w: 1000, max: 136, min: 80, maxLines: 2, step: 2 });
  const steps = [
    ['Take colour from the files.', 'Open the .ase in an Adobe app, paste the CSS or read the JSON. Never pick a colour from a screenshot.'],
    slot ? ['Put the approved logo in first.', 'Drop the approved files into 01 Logo. Until then it holds a labelled frame at the logo\'s proportion.']
      : ['Use the logo as it is drawn.', 'The full-colour version goes on light grounds, the reversed version on dark ones. Never redraw or recolour it.'],
    ['Install the faces.', 'fonts.md links each face to Google Fonts. Every face is under the SIL Open Font Licence 1.1.'],
  ];
  const how = `<div class="kt-rm-how"><i class="vr"></i>${lab('How to use it')}<ol>${steps.map(([a, b], i) => `<li class="kt-step"><span class="c-folio-no">${i + 1}</span><div><p class="c-label c-ink">${A(a)}</p><p class="c-note">${A(b)}</p></div></li>`).join('')}</ol></div>`;
  const file = (name, n) => `<p class="kt-file"><span class="c-mono">${A(name)}</span>${n != null ? ` <span class="c-cap c-quiet">${n} file${n === 1 ? '' : 's'}</span>` : ''}</p>`;
  const rows = [
    ['01 Logo', slot ? 'A labelled frame at the logo\'s proportion, and a note on where the approved files go and which versions to supply.'
      : `Every version of the logo, ${word(nv)} in all, as vector SVG and PDF, and as PNG at 512, 1024 and 2048 px wide on a transparent ground.`,
    slot ? file('logo-slot.svg') + file('README.md') : file('svg/', nv) + file('png/', nv * 3) + file('pdf/', nv)],
    ['02 Colour', 'The palette for Adobe apps, for CSS and as JSON, and the colour sheet with every value.', `${file(`${slug}-palette`)}<p class="kt-file"><span class="c-mono">.ase .css .json .pdf</span></p>`],
    ['03 Type', 'Where to get each face, with its weights and licence, and the type sheet: one page for each face.', file('fonts.md') + file('Typefaces.pdf')],
    ['04 Icons', `${up(word(set.length))} interface icons from Lucide, drawn in the brand's ${st.stroke} px stroke, and the ISC licence they ship under.`, file('svg/', set.length) + file('LICENSE.txt') + kjump('The icon sheet', iconsNo)],
    ['05 Imagery', photos ? `The photography direction, the shot list and the ${word(photos)} photograph${photos === 1 ? '' : 's'} on file.` : 'The photography direction and the shot list.', (photos ? file('photos/', photos) : '') + file('Photography.pdf')],
  ];
  const dir = `<div class="kt-dir">${lab('In the kit')}${rows.map(([n, d, fs_]) => `<div class="kt-dir-row"><p class="b-title kt-dir-n">${A(n)}</p><div class="kt-dir-d"><i class="vr"></i><p class="c-note">${A(d)}</p></div><div class="kt-dir-f"><i class="vr"></i>${fs_}</div></div>`).join('')}</div>`;
  const top = `<div class="kt-two kt-rm-top"><div><p class="b-deck">${A(B.description)}</p></div>${how}</div>`;
  const ask = `<i class="kt-thick"></i><i class="kt-thin"></i><p class="c-note kt-ask">For a file that is not here, or an exception to a rule, write to ${A(B.contact.owner)} at <span class="c-mono">${A(B.contact.email)}</span>.</p>`;
  return page('read-me-1', folio(ctx, 1, 'Read me') + story(hline(t, f, Math.round(f.size * 0.98), 'b-headxl') + top + dir) + foot(ask));
}

// ---- read-me, page 002: the icon sheet. One icon drawn as large as the page allows, the sizes it is used at, then the whole set as a register.
function iconSheet(ctx, no) {
  const B = ctx.brand, set = iconSet(ctx), st = ctx.iconStyle, n = set.length;
  const hero = B.ui.rowIcon && set.includes(B.ui.rowIcon) ? B.ui.rowIcon : set[0];
  const t = `${up(word(n))} icons in the ${B.name} stroke.`, f = fitLines(ctx, t, { w: 1000, max: 96, min: 56, maxLines: 2, step: 2 }), lh = Math.round(f.size * 1.02);
  // the register, from the floor: four to a row, each icon at 32 px over its file name
  const rows = Math.ceil(n / 4), rowH = 104, regH = 30 + rows * rowH + 48;
  // the large icon takes what is left between the headline and the register
  const top = G.top + f.lines.length * lh + 48, big = Math.max(232, Math.min(488, G.floor - regH - 64 - 72 - top));
  const join = st.join === 'miter' ? 'mitred' : 'round', cap = st.cap === 'square' ? 'square' : 'round';
  const left = `<div class="kt-ic-big" style="width:${big}px;height:${big}px">${icon(ctx, hero, big)}</div><p class="kt-ic-cap"><span class="c-mono">${A(hero)}.svg</span></p><p class="c-cap c-quiet">Drawn on a 24 px square: a ${st.stroke} px stroke, ${join} corners and ${cap} ends.</p>`;
  const sizes = [16, 20, 24, 32, 48];
  const ladder = `<div class="kt-ic-ladder">${sizes.map((s) => `<div class="kt-ic-step"><span class="kt-ic-g" style="height:48px">${icon(ctx, hero, s)}</span><span class="c-mono">${s}</span></div>`).join('')}</div>`;
  const d = (B.ui.screen?.content?.deliveries || [])[0];
  const beside = d ? `${lab('Beside words')}<p class="kt-ic-use">${icon(ctx, hero, 24)}<span class="b-deck">${A(d.to)}</span></p>` : '';
  const right = `<div class="kt-ic-r"><i class="vr"></i>${lab('At the sizes it is used')}${ladder}${beside}<p class="c-note kt-ic-note">Each file draws in currentColor, so an icon takes the colour of the words beside it. Keep it at the size of the text it sits with.</p></div>`;
  const cells = set.map((nm) => `<div class="kt-ic-cell"><span class="kt-ic-g">${icon(ctx, nm, 32)}</span><span class="c-mono">${A(nm)}.svg</span></div>`).join('');
  const reg = `${lab('The set, in 04 Icons/svg')}<div class="kt-ic-reg" style="grid-auto-rows:${rowH}px">${cells}</div><p class="c-cap c-quiet kt-ic-lic">Lucide, under the ISC licence. The full text is in 04 Icons/LICENSE.txt.</p>`;
  return page('read-me-2', folio(ctx, no, 'Icons') + story(hline(t, f, lh) + `<div class="kt-two kt-ic-top"><div>${left}</div>${right}</div>`) + foot(reg));
}

export function readMe(ctx) {
  return [readMe1(ctx, 2), iconSheet(ctx, 2)];
}

// ---- the colour sheet: a press colour bar down the first column, each patch as tall as the colour's share of a screen (never shorter than
// its values), read across against a market table of its values ------------------------------------------------------------------
function colourSheet(ctx) {
  const B = ctx.brand, cs = ctx.colours, Lr = ctx.roles.light, C = ctx.C, n = cs.length;
  const nameOf = (hex) => (cs.find((c) => same(c.hex, hex)) || {}).name;
  const f = fitLines(ctx, 'Take every colour from these values.', { w: 1000, max: 96, min: 56, maxLines: 2, step: 2 }), lh = Math.round(f.size * 1.02);
  const sh = cs.map((c) => (typeof c.share === 'number' ? c.share : 1 / n)), sum = sh.reduce((a, b) => a + b, 0);
  const ratio = (a, b) => `${(Math.floor(C.ratio(a, b) * 10) / 10).toFixed(1)} : 1`;
  const rows = cs.map((c, i) => {
    const [r, g, b] = C.hexToRgb(c.hex), ok = c.oklch || C.oklchString(c.hex), pct = Math.round(sh[i] / sum * 100);
    const faint = C.ratio(c.hex, N.paper) < 1.3 ? ';box-shadow:inset 0 0 0 1px var(--hair)' : '';
    const vals = [['Hex', c.hex.toUpperCase()], ['RGB', `rgb(${r}, ${g}, ${b})`], ['OKLCH', ok], ...(C.cmykOf(c) ? [['CMYK', C.cmykOf(c)]] : [])].map(([k, v]) => `<div class="kt-v"><span class="c-folio c-quiet">${k}</span><span class="c-mono">${A(v)}</span></div>`).join('');
    // the contrast it makes with the brand's ground and its text (a colour is not paired with itself)
    const pairs = [Lr.surface, Lr.text].filter((h) => !same(h, c.hex)).map((h) => `<div class="kt-v"><span class="c-folio c-quiet">With ${A(nameOf(h) || h)}</span><span class="c-note">${ratio(c.hex, h)}</span></div>`).join('');
    return `<div class="kt-pr" style="flex-grow:${+sh[i].toFixed(4)}"><i class="kt-pr-sw" style="background:${c.hex}${faint}"></i><div class="kt-pr-n"><p class="b-deck">${A(c.name)}</p><p class="c-label">${A(up(String(c.role)))}, ${pct}% of a screen</p>${c.lands ? `<p class="c-cap c-quiet kt-pr-l">${A(c.lands)}</p>` : ''}</div><div class="kt-pr-v"><i class="vr"></i>${vals}<i class="kt-pr-gap"></i>${pairs}</div></div>`;
  }).join('');
  const heads = `<div class="kt-pr-hd"><span class="c-folio c-quiet">Patch</span><span class="c-folio c-quiet">Colour and where it lands</span><span class="c-folio c-quiet">Values</span></div>`;
  const note = `<p class="c-note kt-pal-note">${up(word(n))} colours. Each patch is as tall as the colour's share of a ${A(B.name)} screen, and never shorter than its values.</p>`;
  const files = [[`${ctx.slug}-palette.ase`, 'Swatches for Adobe apps.'], [`${ctx.slug}-palette.css`, 'A custom property for each colour.'], [`${ctx.slug}-palette.json`, 'Every value, for code.'], [`${ctx.slug}-palette.pdf`, 'This sheet.']];
  const ft = `${lab('In 02 Colour')}<div class="kt-four">${files.map(([a, b], i) => `<div>${i ? '<i class="vr"></i>' : ''}<p class="c-mono kt-wrap">${A(a)}</p><p class="c-cap c-quiet">${b}</p></div>`).join('')}</div><p class="c-cap c-quiet kt-proof">These are screen values. Ask your printer for a proof before a print run.</p>`;
  return page('palette', folio(ctx, 1, 'Colour') + `<div class="a kt-col" style="left:${px(G.left)};top:${px(G.top)};width:1000px;height:${G.floor - G.top}px">${headLines(f.lines, f.size, lh)}${note}${heads}<div class="kt-prs">${rows}</div><div class="kt-pal-ft">${ft}</div></div>`);
}

// ---- the type sheets: one face a page, set the way a compositor's case is laid out --------------------------------------------------------
const WEIGHT_NAMES = { 100: 'Thin', 200: 'ExtraLight', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold', 900: 'Black' };
function faceSheet(ctx, role, no, next) {
  const B = ctx.brand, F = B.fonts[role], T = B.type || {}, D = B.fonts.display;
  const stretch = role === 'display' ? (D.stretch || 100) : 100, w0 = role === 'display' ? displayWeight(ctx) : role === 'body' ? bodyWeight(ctx, 400) : 400;
  const fam = role === 'display' ? 'var(--display)' : role === 'body' ? 'var(--body)' : 'var(--bmono)';
  const face = (w = w0, extra = '') => `font-family:${fam};font-weight:${w};font-stretch:${stretch}%;${role === 'display' ? `letter-spacing:${TRACK}em;` : ''}${extra}`;
  const m = (text, size) => (role === 'display' ? measure(ctx, text, size) : measureRole(ctx, role, text, size, w0));
  const steps = (T.scale || []).filter((s) => s.face === role).sort((a, b) => b.size - a.size);
  const label = { display: 'Display face', body: 'Body face', mono: 'Mono face' }[role];
  // the splash: the face doing its own job, as large as the page allows
  let splash, cap, rest = steps;
  if (role === 'display') {
    const s0 = steps[0], text = T.sample?.headline || B.lines.primary, max = Math.min(s0 ? s0.size : 112, ctx.placeholders ? 56 : 999);   // slot: the placeholder box is capped so it fits
    const fit = fitLines(ctx, text, { w: 1000, max, min: 56, maxLines: 3, step: 2 }), lh = Math.round(fit.size * (s0 ? s0.line : 0.95));
    splash = `<p class="kt-ty-splash" style="${face()}font-size:${fit.size}px;line-height:${lh}px">${A(text)}</p>`;
    cap = s0 ? `<span class="c-mono">${A(s0.token)}</span> <span class="c-cap c-quiet">${fit.size === s0.size ? `at its own size, ${s0.size} px on a line of ${s0.line}.` : `shown at ${fit.size} px; it is set at ${s0.size} px.`}</span>` : `<span class="c-cap c-quiet">The type sample, at ${fit.size} px.</span>`;
    rest = steps.slice(1);
  } else if (role === 'body') {
    const text = T.sample?.paragraph || B.description;
    let size = 28; for (const s of [40, 38, 36, 34, 32, 30, 28]) if (linesIn(ctx, 'body', text, s, 1000 - 8, w0) <= 5) { size = s; break; }
    splash = `<p class="kt-ty-splash" style="${face()}font-size:${size}px;line-height:${Math.round(size * 1.3)}px">${A(text)}</p>`;
    const lo = steps.length ? steps[steps.length - 1].size : null, hi = steps.length ? steps[0].size : null;
    cap = `<span class="c-cap c-quiet">The type sample, shown at ${size} px.${lo ? ` In use it is set from ${lo} to ${hi} px.` : ''}</span>`;
  } else {
    // the mono face's own job: literal values. The brand's colours as tokens, one to a line
    const lines = ctx.colours.map((c) => `--${c.id}: ${c.hex};`);
    let size = 24; for (let s = 48; s >= 24; s -= 2) if (lines.every((l) => m(l, s) <= 1000 - 8)) { size = s; break; }
    splash = `<div class="kt-ty-splash" style="${face()}font-size:${size}px;line-height:${Math.round(size * 1.35)}px">${lines.map((l) => `<span class="ln">${A(l)}</span>`).join('')}</div>`;
    cap = `<span class="c-cap c-quiet">The colour tokens, shown at ${size} px. The mono face is for a hex value, a token name or a line of code, never for running text or headings.</span>`;
  }
  // the imprint: the face, its weights, its licence and where to get it
  const nameSize = Math.min(40, Math.floor((232 - 8) * 100 / m(F.family, 100)));
  const weights = F.weights.map((w) => `<p class="kt-ty-w" style="${face(w)}">${w} ${WEIGHT_NAMES[w] || ''}</p>`).join('');
  const imp = `<i class="kt-thick"></i><i class="kt-thin"></i><div class="kt-four kt-ty-imp">`
    + `<div><p class="kt-ty-name" style="${face()}font-size:${nameSize}px;line-height:${Math.round(nameSize * 1.15)}px">${A(F.family)}</p><p class="c-cap c-quiet">${label}</p></div>`
    + `<div><i class="vr"></i><p class="c-label c-ink">Weights</p>${weights}${F.axes ? `<p class="c-cap c-quiet">Width axis <span class="c-mono">${A(F.axes)}</span></p>` : ''}</div>`
    + `<div><i class="vr"></i><p class="c-label c-ink">Licence</p><p class="c-note">SIL Open Font Licence 1.1. Free to use, embed and share, including commercially.</p></div>`
    + `<div><i class="vr"></i><p class="c-label c-ink">Get it</p><p class="c-mono kt-wrap">fonts.google.com/specimen/${A(F.family.replace(/ /g, '+'))}</p><p class="c-cap c-quiet">Every link is in 03 Type/fonts.md.</p></div></div>`;
  // the characters, as many lines as the face needs to set them at one size across the measure
  const gl = glyphLines((l, s) => m(l, s), { w: 1000 - 8, max: 72, min: 28, sets: [GLYPHS.three, GLYPHS.five] });
  const glyphs = `<div class="kt-ty-gl" style="${face()}font-size:${gl.size}px;line-height:${Math.round(gl.size * 1.2)}px">${gl.lines.map((l) => `<span class="ln">${A(l)}</span>`).join('')}</div>`;
  // the brand's own type scale for this face, each style set at its size in the words that say what it is for
  const scale = rest.length ? `<div class="kt-ty-sc">${lab('Its sizes in the type scale')}${rest.map((s) => {
    const w = role === 'body' ? bodyWeight(ctx, s.weight || 400) : w0;
    return `<div class="kt-ty-row"><div><p class="c-mono">${A(s.token)}</p><p class="c-cap c-quiet">${s.size} px, line ${s.line}</p></div><p class="kt-ty-s" style="${face(w)}font-size:${s.size}px;line-height:${Math.round(s.size * s.line)}px"><i class="vr"></i>${A(s.use)}</p></div>`;
  }).join('')}</div>` : '';
  return page(`type-${role}`, folio(ctx, no, 'Type') + story(`${splash}<p class="kt-ty-cap">${cap}</p>${imp}${glyphs}${scale}${next ? kjump(next[0], next[1]) : ''}`));
}

// ---- photography: the picture page (the photographs on file) and the picture desk's brief -------------------------------------------------
function photoBox(ctx, s, b) {
  const fo = s.focus || [0.5, 0.5];
  return `<div class="kt-ph" style="width:${b.w}px;height:${b.h}px"><img src="${A(ctx.photoUrl(s.photo))}" alt="${A(s.alt || '')}" style="width:${b.w}px;height:${b.h}px;object-fit:cover;object-position:${Math.round(fo[0] * 100)}% ${Math.round(fo[1] * 100)}%"></div>`;
}
const credit = (s) => (s.credit && !s.generated ? `<p class="c-cap c-quiet">Source: ${A(s.credit)}</p>` : '');
function picturePage(ctx, shots, no, briefNo) {
  const m = made[ctx.slug] || { mono: false }, n = shots.length;
  const f = fitLines(ctx, `${up(word(n))} photograph${n === 1 ? '' : 's'} on file.`, { w: 1000, max: 96, min: 56, maxLines: 2, step: 2 }), lh = Math.round(f.size * 1.02);
  const note = `<p class="c-note kt-pp-note">Full size in 05 Imagery/photos.${m.mono ? ' Printed here in one ink, the way the brand prints them.' : ' Printed here as shot.'}</p>`;
  const cap = (s) => `<p class="c-cap c-ink kt-pp-cap">${A(s.caption || s.alt || '')}</p>${credit(s)}`;
  const lead = `<figure class="kt-pp-lead">${photoBox(ctx, shots[0], PH.lead)}${cap(shots[0])}</figure>`;
  const pair = shots.slice(1, 3).map((s, i) => `<figure>${i ? '<i class="vr"></i>' : ''}${photoBox(ctx, s, PH.pair)}${cap(s)}</figure>`).join('');
  return page('photography-1', folio(ctx, no, 'Imagery') + story(headLines(f.lines, f.size, lh) + note + lead + (pair ? `<div class="kt-two kt-pp-pair">${pair}</div>` : '') + kjump('The brief for new photographs', briefNo)));
}
function briefPage(ctx, no) {
  const B = ctx.brand, D = B.imagery.direction || {}, todo = B.imagery.shots.filter((s) => !s.photo);
  const f = fitLines(ctx, 'The brief for every new photograph.', { w: 1000, max: 96, min: 56, maxLines: 2, step: 2 }), lh = Math.round(f.size * 1.02);
  const keys = [['subject', 'Subject'], ['light', 'Light'], ['crop', 'Crop'], ['colour', 'Colour'], ['people', 'People']].filter(([k]) => D[k]);
  const dir = `<div class="kt-br">${keys.map(([k, l]) => `<div class="kt-br-row"><p class="c-label c-ink">${l}</p><p class="b-deck"><i class="vr"></i>${A(D[k])}</p></div>`).join('')}</div>`;
  const list = todo.length ? `<div class="kt-td">${lab(`Still to shoot, ${word(todo.length)} of ${word(B.imagery.shots.length)}`)}${todo.map((s) => `<div class="kt-td-row"><div><p class="c-mono">${A(s.id)}.jpg</p><p class="c-cap c-quiet">Save it as this name in 05 Imagery/photos.</p></div><p class="b-body" lang="en-AU"><i class="vr"></i>${A(s.slot || s.alt || '')}</p></div>`).join('')}</div>` : '';
  return page('photography-2', folio(ctx, no, 'Imagery') + story(headLines(f.lines, f.size, lh) + dir) + (list ? foot(list) : ''));
}

export function sheets(ctx) {
  const B = ctx.brand, F = B.fonts;
  // one type page for each face the brand loads (a mono face that is the body family is not a face of its own)
  const roles = ['display', 'body', 'mono'].filter((r) => F[r] && !(r === 'mono' && F.body && F.mono.family === F.body.family));
  const nextOf = { display: 'The body face', body: 'The mono face' };
  const typefaces = roles.map((r, i) => faceSheet(ctx, r, i + 1, roles[i + 1] ? [nextOf[r], i + 2] : null));
  const shots = B.imagery.shots.filter((s) => s.photo && (made[ctx.slug]?.ids || []).includes(s.id));
  const photography = shots.length ? [picturePage(ctx, shots, 1, 2), briefPage(ctx, 2)] : [briefPage(ctx, 1)];
  return { palette: [colourSheet(ctx)], typefaces, photography };
}

export function css(ctx) {
  return `
/* lane kt: the brand kit PDFs; every rule is under .pg and the kt- prefix */
.pg .kt-story{display:block}
.pg .kt-story .vr,.pg .kt-col .vr{position:absolute;left:-12.375px;top:0;bottom:0;width:.75px;background:var(--hair)}
.pg .kt-hr{display:block;height:1px;background:var(--ink)}
.pg .kt-lab{padding-bottom:8px}
.pg .kt-thick{display:block;height:3px;background:var(--ink)}
.pg .kt-thin{display:block;height:1px;background:var(--ink);margin-top:4px}
.pg .kt-h{text-wrap:balance;max-width:1000px}
.pg .kt-two{display:grid;grid-template-columns:488px 488px;column-gap:24px;align-items:start}
.pg .kt-two>div,.pg .kt-two>figure{position:relative}
.pg .kt-four{display:grid;grid-template-columns:repeat(4,232px);column-gap:24px;align-items:stretch}
.pg .kt-four>div{position:relative}
.pg .kt-wrap{overflow-wrap:anywhere}
.pg .kt .c-jump{margin-top:16px}

/* read-me: the notice and the directory */
.pg .kt-rm-top{margin-top:40px}
.pg .kt-rm-how{position:relative}
.pg .kt-step{display:grid;grid-template-columns:32px 1fr;padding:12px 0 16px;border-bottom:.75px solid var(--hair)}
.pg .kt-step:last-child{border-bottom:1px solid var(--ink)}
.pg .kt-step .c-note{margin-top:4px}
.pg .kt-dir{margin-top:64px}
.pg .kt-dir-row{display:grid;grid-template-columns:488px 232px 232px;column-gap:24px;align-items:stretch;border-bottom:.75px solid var(--hair)}
.pg .kt-dir-row:last-child{border-bottom:1px solid var(--ink)}
.pg .kt-dir-row>*{padding:16px 0 24px}
.pg .kt-dir-d,.pg .kt-dir-f{position:relative}
.pg .kt-dir-n{font-size:40px;line-height:44px;white-space:nowrap}
.pg .kt-file+.kt-file{margin-top:4px}
.pg .kt-dir-f .c-jump{margin-top:12px}
.pg .kt-ask{margin-top:16px;width:744px}

/* the icon sheet */
.pg .kt-ic-top{margin-top:48px}
.pg .kt-ic-big{color:var(--ink);border-top:1px solid var(--ink)}
.pg .kt-ic-big svg{display:block}
.pg .kt-ic-cap{margin-top:8px}
.pg .kt-ic-r{position:relative}
.pg .kt-ic-ladder{display:flex;gap:32px;align-items:flex-end;padding:16px 0 24px}
.pg .kt-ic-step{display:flex;flex-direction:column;align-items:flex-start;gap:8px}
.pg .kt-ic-g{display:flex;align-items:flex-end;color:var(--ink)}
.pg .kt-ic-g svg,.pg .kt-ic-use svg{display:block;flex:none}
.pg .kt-ic-use{display:flex;align-items:center;gap:12px;padding:16px 0 24px;color:var(--ink)}
.pg .kt-ic-note{margin-top:0}
.pg .kt-ic-reg{display:grid;grid-template-columns:repeat(4,232px);column-gap:24px}
.pg .kt-ic-cell{position:relative;display:flex;flex-direction:column;justify-content:center;gap:12px;border-bottom:.75px solid var(--hair)}
.pg .kt-ic-cell:not(:nth-child(4n+1))::before{content:'';position:absolute;left:-12.375px;top:0;bottom:0;width:.75px;background:var(--hair)}
.pg .kt-ic-lic{margin-top:16px}

/* the colour sheet */
.pg .kt-col{display:flex;flex-direction:column}
.pg .kt-pal-note{width:488px;margin-top:24px}
.pg .kt-pr-hd{display:grid;grid-template-columns:232px 232px 488px;column-gap:24px;margin-top:48px;padding-bottom:8px;border-bottom:1px solid var(--ink)}
.pg .kt-prs{flex:1 1 0;display:flex;flex-direction:column;min-height:0}
.pg .kt-pr{flex-shrink:1;flex-basis:0;display:grid;grid-template-columns:232px 232px 488px;column-gap:24px;align-items:stretch}
.pg .kt-pr-sw{display:block}
.pg .kt-pr-n,.pg .kt-pr-v{position:relative;padding:16px 0 24px;border-bottom:.75px solid var(--hair)}
.pg .kt-pr:last-child .kt-pr-n,.pg .kt-pr:last-child .kt-pr-v{border-bottom:1px solid var(--ink)}
.pg .kt-pr-n .c-label{margin-top:4px}
.pg .kt-pr-l{margin-top:8px}
.pg .kt-v{display:grid;grid-template-columns:136px 1fr;align-items:baseline}
.pg .kt-pr-gap{display:block;height:8px}
.pg .kt-pal-ft{margin-top:48px}
.pg .kt-pal-ft .kt-four{padding-top:4px}
.pg .kt-proof{margin-top:16px}

/* the type sheets */
.pg .kt-ty-splash{text-wrap:balance;font-variant-numeric:lining-nums}
.pg .kt-ty-splash .ln{display:block;white-space:nowrap}
.pg .kt-ty-cap{margin-top:16px}
.pg .kt-ty-cap+.kt-thick{margin-top:48px}
.pg .kt-ty-imp{padding-top:16px}
.pg .kt-ty-imp .c-label{margin-bottom:4px}
.pg .kt-ty-name{white-space:nowrap;margin-bottom:4px}
.pg .kt-ty-w{font-size:20px;line-height:28px;white-space:nowrap;color:var(--ink)}
.pg .kt-ty-gl{margin-top:56px;padding-top:24px;border-top:1px solid var(--ink)}
.pg .kt-ty-gl .ln{display:block;white-space:nowrap}
.pg .kt-ty-sc{margin-top:56px}
.pg .kt-ty-row{display:grid;grid-template-columns:232px 744px;column-gap:24px;align-items:start;padding:16px 0 24px;border-bottom:.75px solid var(--hair)}
.pg .kt-ty-row:last-child{border-bottom:1px solid var(--ink)}
.pg .kt-ty-s{position:relative;text-wrap:balance}

/* photography */
.pg .kt-pp-note{width:488px;margin-top:24px}
.pg .kt-pp-lead{margin-top:48px}
.pg .kt-ph{overflow:hidden;border-top:1px solid var(--ink)}
.pg .kt-ph img,.pg .kt .plate img,.pg .kt .plate .pl{display:block}
.pg .kt-pp-cap{margin-top:8px}
.pg .kt-pp-pair{margin-top:48px}
.pg .kt-br{margin-top:48px;border-top:1px solid var(--ink)}
.pg .kt-br-row{display:grid;grid-template-columns:232px 744px;column-gap:24px;align-items:baseline;padding:16px 0 24px;border-bottom:.75px solid var(--hair)}
.pg .kt-br-row:last-child{border-bottom:1px solid var(--ink)}
.pg .kt-br-row .b-deck{position:relative}
.pg .kt-td-row{display:grid;grid-template-columns:232px 488px;column-gap:24px;align-items:start;padding:16px 0 24px;border-bottom:.75px solid var(--hair)}
.pg .kt-td-row:last-child{border-bottom:1px solid var(--ink)}
.pg .kt-td-row .b-body{position:relative}
`;
}
