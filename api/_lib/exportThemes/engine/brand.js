// Loads a brand and computes everything a theme may print: ramps, roles, contrast table, tokens, faces.
import opentype from 'opentype.js';
import * as C from './color.js';
import { validateBrand } from './validate.js';

export const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const words = (s) => s.trim().split(/\s+/).length;
export const monthYear = (iso) => new Date(iso + 'T00:00:00Z').toLocaleDateString('en-AU', { month: 'long', year: 'numeric', timeZone: 'UTC' });

const DEFAULT_UI_TYPE = [
  { token: 'caption', size: 12, line: 16, weight: 400, face: 'body', use: 'Captions, help text, folios' },
  { token: 'label', size: 13, line: 18, weight: 500, face: 'body', use: 'Field labels, status words, table headers' },
  { token: 'body', size: 15, line: 24, weight: 400, face: 'body', use: 'Reading text and row detail' },
  { token: 'control', size: 16, line: 24, weight: 500, face: 'body', use: 'Button labels and input text' },
  { token: 'title-s', size: 20, line: 26, weight: 800, face: 'display', use: 'Card and dialog titles' },
  { token: 'title', size: 26, line: 30, weight: 800, face: 'display', use: 'Screen titles, the live status' },
  { token: 'headline', size: 36, line: 40, weight: 800, face: 'display', use: 'Empty states and first-run' },
];

// Parsed fonts, kept per loaders object so every context built on the same loaders shares one parse.
const fontCaches = new WeakMap();
export function loadFont(loaders, stem) {
  let cache = fontCaches.get(loaders);
  if (!cache) fontCaches.set(loaders, (cache = new Map()));
  if (!cache.has(stem)) { const b = loaders.fontFile(stem, 'ttf'); cache.set(stem, opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength))); }
  return cache.get(stem);
}

// ---- fonts ----
// The axes of a css2 query ("Archivo:wdth,wght@125,800" gives "wdth,wght"); '' when it has none.
export const queryAxes = (q) => { const m = /:([a-z,]+)@/.exec(q || ''); return m ? m[1] : ''; };
// A pinned face fixes an axis other than wght (opsz, wdth, ital ...) to one value, so its query is kept whole and its file is one static instance.
export const isPinned = (q) => { const a = queryAxes(q); return !!a && a !== 'wght'; };
// The available weight nearest to `want`; a tie goes to the heavier one.
export const nearestWeight = (weights, want) => weights.reduce((best, w) => { const a = Math.abs(w - want), b = Math.abs(best - want); return a < b || (a === b && w > best) ? w : best; });
// The body weights the components use: regular (400), medium (labels, 500) and strong (badges, avatars, 600), each the nearest the body face has.
// fonts.body.labelWeight / strongWeight pin one explicitly.
export function bodyWeights(fonts) {
  const ws = fonts.body.weights;
  return { regular: nearestWeight(ws, 400), medium: fonts.body.labelWeight ?? nearestWeight(ws, 500), strong: fonts.body.strongWeight ?? nearestWeight(ws, 600) };
}
// The display face weight the logo is outlined in (first listed) and the one headings in the components use (last listed);
// fonts.display.logoWeight / headingWeight say it explicitly.
export function displayWeights(fonts) {
  const d = fonts.display, w = d.weights;
  const logo = d.logoWeight ?? w[0], heading = d.headingWeight ?? w[w.length - 1];
  for (const [k, v] of [['logoWeight', logo], ['headingWeight', heading]]) if (!w.includes(v)) throw new Error(`fonts.display.${k} ${v} is not in fonts.display.weights [${w.join(', ')}]`);
  return { logo, heading };
}

// One file stem and css2 query per face and weight. Upright faces come first, then the italic ones (fonts.<role>.italics: weights with a real italic face).
export function faceList(fonts) {
  const out = [], italics = [];
  for (const role of ['display', 'body', 'mono']) {
    const f = fonts[role]; if (!f) continue;
    const pinned = !!f.axes || isPinned(f.css);
    for (const w of f.weights) {
      const full = /-\d+$/.test(f.file);
      out.push({ role, family: f.family, weight: w, style: 'normal', stretch: f.stretch, stem: full ? f.file : `${f.file}-${w}`, q: pinned ? f.css : f.css.replace(/:wght@.*/, `:wght@${w}`) });
    }
    // an italic face is its own file: <file>-i<weight> ("BodoniModa-i500"), fetched with ital,wght@1,<weight>; a pinned face gives italicCss ("{w}" stands for the weight)
    for (const w of f.italics || []) {
      if (pinned && !f.italicCss) throw new Error(`fonts.${role}.italics needs fonts.${role}.italicCss (with {w}) because the face pins axes`);
      italics.push({ role, family: f.family, weight: w, style: 'italic', stretch: f.stretch, stem: `${f.file.replace(/-\d+$/, '')}-i${w}`, q: f.italicCss ? f.italicCss.replace('{w}', w) : f.css.replace(/:wght@.*/, `:ital,wght@1,${w}`) });
    }
  }
  return [...out, ...italics];
}

// ---- status roles a brand may leave out ----
// A role with no pair in brand data (or one named in ui.houseRoles) is a house default, not a brand colour: tone (OKLCH hue), found per mode against that mode's surface.
const HOUSE_HUE = { success: 150, warning: 75, danger: 25, info: 250 };
function houseTone(tone, r) {
  const H = HOUSE_HUE[tone], dark = C.luminance(r.surface) < C.luminance(r.text);
  const bg = C.fromOklch(dark ? 0.27 : 0.95, dark ? 0.045 : 0.035, H);
  for (let i = 0; i <= 60; i++) {
    const fg = C.fromOklch(dark ? 0.7 + i * 0.005 : 0.55 - i * 0.008, 0.1, H);
    if (C.ratio(fg, bg) >= 4.6 && C.ratio(fg, r.surface) >= 4.6) return { fg, bg };
  }
  throw new Error(`no house ${tone} pair passes on ${r.surface}`);
}

// data is a brand's data object (brands/<slug>/brand.js). It is copied, because the slot edition rewrites the copy's strings.
// loaders is the set of reads the engine may make (fontFile, icon, logoPlugin); they travel on ctx.loaders.
export function loadBrand(data, loaders) {
  const B = validateBrand(data);  // an allowlisted, sanitised deep copy; throws BrandInputError
  const slug = B.slug;
  // colours: brand colours plus measured tones, addressed by id
  const byId = {};
  for (const c of [...B.colours, ...(B.tones || [])]) byId[c.id] = c;
  const hex = (id) => { if (!byId[id]) throw new Error('Unknown colour id ' + id); return byId[id].hex; };
  const hexOr = (v) => (byId[v] ? byId[v].hex : v);

  // ratio table for the pairs the brand uses; the build fails on a miss
  const pairs = B.pairs.map((p) => {
    const r = C.ratio(hex(p.fg), hex(p.bg));
    const min = p.minSize ?? 15;
    C.pair(hex(p.fg), hex(p.bg), { size: min, what: `(brand pair ${p.fg}/${p.bg})` });
    return { ...p, fgHex: hex(p.fg), bgHex: hex(p.bg), ratio: r, ratioText: C.fmt(r), large: !!p.minSize };
  });
  // every other combination of the palette, shown as "not used" if it cannot carry text
  const ids = [...B.colours.map((c) => c.id), ...(byId.quiet ? ['quiet'] : [])];  // a tone with the id "quiet" (quiet text on the ground) joins the palette here
  const used = new Set(pairs.map((p) => p.fg + '>' + p.bg));
  const unused = [];
  for (const fg of ids) for (const bg of B.colours.map((c) => c.id)) {
    if (fg === bg || used.has(fg + '>' + bg)) continue;
    const r = C.ratio(hex(fg), hex(bg));
    if (r < 4.5) unused.push({ fg, bg, fgHex: hex(fg), bgHex: hex(bg), ratio: r, ratioText: C.fmt(r) });
  }
  unused.sort((a, b) => b.ratio - a.ratio);

  // colour data per brand colour: formats and a ramp
  const colours = B.colours.map((c) => ({ ...c, rgb: C.rgbString(c.hex), oklch: C.oklchString(c.hex), ramp: C.ramp(c.hex), rampBase: C.rampBase(c.hex) }));
  const neutralRamp = (() => { const { H } = C.toOklch(B.ui.light.sunken); const L = { 50: 0.98, 100: 0.925, 200: 0.86, 300: 0.78, 400: 0.68, 500: 0.58, 600: 0.5, 700: 0.42, 800: 0.32, 900: 0.21 }; const o = {}; for (const k in L) o[k] = C.fromOklch(L[k], 0.007, H); return o; })();

  // roles for light and dark; every text pair is verified
  const roles = {};
  const houseRoles = new Set(B.ui.houseRoles || []);
  for (const mode of ['light', 'dark']) {
    const r = { ...B.ui[mode] };
    // status roles are optional: a missing one is a house default (ctx.houseRoles), so the documents can say it is not a brand colour
    for (const t of ['success', 'warning', 'danger', 'info']) if (!r[t]) { r[t] = houseTone(t, r); houseRoles.add(t); }
    const bgs = ['surface', 'raised', 'sunken'];
    for (const t of ['text', 'textSoft']) for (const g of bgs) C.pair(r[t], r[g], { what: `${mode} ${t} on ${g}` });
    for (const g of ['surface', 'raised']) C.pair(r.quiet, r[g], { what: `${mode} quiet on ${g}` });
    C.pair(r.quietOnSunken, r.sunken, { what: `${mode} quietOnSunken` });
    for (const s of ['action', 'actionHover', 'actionPressed']) C.pair(r.actionLabel, r[s], { what: `${mode} actionLabel on ${s}` });
    C.pair(r.disabledText, r.disabledBg, { what: `${mode} disabled` });
    for (const t of ['success', 'warning', 'danger', 'info']) { C.pair(r[t].fg, r[t].bg, { what: `${mode} ${t}` }); C.pair(r[t].fg, r.surface, { what: `${mode} ${t} on surface` }); }
    // control edges and focus ring need 3:1 against the surface
    for (const e of ['border', 'focus']) { if (C.ratio(r[e], r.surface) < 3) throw new Error(`${mode} ${e} below 3:1`); }
    // The action fill needs 3:1 on the surface (WCAG 1.4.11) unless the control is named by its label: a button whose text passes 4.5:1 on the fill
    // is identified by that text, so the fill itself carries no information the user needs. That is stated in the brand (actionExempt: true), or the
    // button has an edge of its own that does pass (actionEdge, a colour at 3:1 on the surface).
    if (r.actionEdge && C.ratio(r.actionEdge, r.surface) < 3) throw new Error(`${mode} actionEdge below 3:1 on surface`);
    if (C.ratio(r.action, r.surface) < 3 && !(r.actionExempt === true || r.actionEdge)) throw new Error(`${mode} action below 3:1 on surface (set ui.${mode}.actionEdge to a colour at 3:1, or ui.${mode}.actionExempt true when the label passes 4.5:1 on the fill)`);
    roles[mode] = r;
  }
  const statusTone = (mode, tone) => (tone === 'action' ? { fg: roles[mode].actionLabel, bg: roles[mode].action } : roles[mode][tone]);
  // A status either takes a tone (action, success, warning, danger, info, neutral) or carries its own colours: { fg, bg, edge? } for light, { dark: { fg, bg, edge? } } for dark
  // (no dark: its tone's dark pair, else the same colours). bg may be "transparent"; its text is then measured on the surface. Hex or palette ids.
  const customTone = (mode, s) => {
    const src = mode === 'dark' && s.dark ? s.dark : s;
    if (mode === 'dark' && !s.dark && s.tone) return statusTone('dark', s.tone);
    const fg = hexOr(src.fg), bg = src.bg === 'transparent' ? 'transparent' : hexOr(src.bg), edge = src.edge ? hexOr(src.edge) : undefined;
    const ground = bg === 'transparent' ? roles[mode].surface : bg;
    C.pair(fg, ground, { what: `${mode} status ${s.id}` });
    return { fg, bg, edge, ...(bg === 'transparent' ? { bgHex: ground } : {}) };
  };
  const status = B.ui.status.map((s) => {
    const custom = !!(s.fg && s.bg);
    if (!custom && !s.tone) throw new Error(`ui.status "${s.id}" needs a tone, or fg and bg`);
    return { ...s, custom, light: custom ? customTone('light', s) : statusTone('light', s.tone), dark: custom ? customTone('dark', s) : statusTone('dark', s.tone) };
  });

  // the default scale sets display text in the display face's heading weight, and body rows in the body weights the face has
  const dw = displayWeights(B.fonts), bw = bodyWeights(B.fonts);
  const uiType = (B.ui.type || DEFAULT_UI_TYPE.map((t) => (t.face === 'display' ? { ...t, weight: dw.heading } : { ...t, weight: t.weight >= 500 ? bw.medium : bw.regular })));
  // spacing: ui.spacing lists the steps in px (space-1 up); without it, the default eight steps on spacingBase
  const base = B.ui.spacingBase;
  const steps = B.ui.spacing || [1, 2, 3, 4, 6, 8, 12, 16].map((m) => m * base);
  const space = steps.map((px, i) => ({ token: `space-${i + 1}`, px }));
  // radii: control for everything, unless ui.radius gives button, input or chip. The list keeps control, card, round first; own radii follow.
  const R = B.ui.radius;
  const radius = { control: R.control, button: R.button ?? R.control, input: R.input ?? R.control, chip: R.chip ?? R.control, card: R.card };
  // a status is plain words, so a chip radius is kept as a token but never listed as a use
  const ownRadii = ['button', 'input'].filter((k) => R[k] !== undefined);
  const radiiUse = { button: 'Buttons and segmented controls', input: 'Inputs, selects, textareas and checkboxes' };
  const radii = [{ token: 'radius-control', px: R.control, use: ownRadii.length ? 'Other controls: links, toasts, skeletons' : 'Buttons, inputs, links, toasts' }, { token: 'radius-card', px: R.card, use: 'Cards, dialogs, panels' }, { token: 'radius-round', px: 9999, use: 'Avatars and switches only' },
    ...ownRadii.map((k) => ({ token: `radius-${k}`, px: R[k], use: radiiUse[k] }))];
  const borders = [{ token: 'border-hairline', px: 1, use: 'Dividers between rows' }, { token: 'border-control', px: B.ui.border, use: 'Control edges' }, { token: 'border-focus', px: 2, use: 'Focus ring' }];

  const faces = faceList(B.fonts);
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const ctx = {
    brand: B, slug, loaders, esc, ratio: C.ratio, pair: C.pair, fmt: C.fmt, C,
    hex, hexOr, byId, colours, tones: B.tones || [], pairs, unusedPairs: unused, neutralRamp,
    roles, status, uiType, space, radii, radius, borders, faces, cap, houseRoles: [...houseRoles], weights: { ...bw, ...dw },
    gridMeasures: (() => { const g = B.layout; const col = (g.page.w - 2 * g.margin - (g.columns - 1) * g.gutter) / g.columns; return { ...g, col }; })(),
    date: monthYear(B.version.date), versionLine: `Version ${B.version.number}, ${monthYear(B.version.date)}`,
    // set per render
    // placeholders (slot edition, engine/placeholders.js): real(str) gives the sample text behind a placeholder string (data a page must parse, such as a size inside a line); showcase: the string itself
    real: (s) => s,
    // ph(path, real): copy a theme hard-codes; slot gives a placeholder for it, showcase the words themselves
    ph: (p, real = '') => real,
    edition: 'showcase', mode: { kind: 'files', photoBase: 'assets/photos/', fontBase: 'assets/fonts/' },
  };
  // the stroke corner for icons follows the brand's control radius
  ctx.iconStyle = { stroke: B.ui.border, join: B.ui.radius.control <= 4 ? 'miter' : 'round', cap: B.ui.radius.control <= 4 ? 'square' : 'round' };
  ctx.loadFont = (stem) => loadFont(loaders, stem);
  ctx.photoUrl = (p) => ctx.mode.photoBase + String(p).split('/').pop();
  // a real photo, or an art-directed slot: same call either way
  ctx.photo = (id, { style = '', cls = '', pos = '50% 50%', slotNote = true } = {}) => {
    const s = B.imagery.shots.find((x) => x.id === id);
    if (!s) throw new Error('No shot ' + id);
    if (s.photo) return `<img class="${cls}" src="${esc(ctx.photoUrl(s.photo))}" alt="${esc(s.alt)}" style="object-fit:cover;object-position:${pos};display:block;${style}">`;
    return `<div class="photo-slot ${cls}" role="img" aria-label="${esc('Photo slot. ' + s.slot)}" style="${style}">${slotNote ? `<span>${esc(s.slot)}</span>` : ''}</div>`;
  };
  ctx.shot = (id) => B.imagery.shots.find((x) => x.id === id);
  ctx.themeHex = (mode) => roles[mode];
  return ctx;
}
