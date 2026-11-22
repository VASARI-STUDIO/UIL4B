// projectToBrand: a saved project's design -> slot-edition brand data for the export themes.
// Colours, fonts, type scale and radii come from the design; every other string is generic skeleton copy that the slot
// edition swaps for placeholders. Any failure leaves as a BrandInputError. A last loadBrand call proves the result renders.
import { kitPalette, kitSemantic, interfaceRoles } from '../../../src/utils/systemRoles.js';
import { readDesign, typeLadder } from '../../../src/utils/styleGuideExport.js';
import { semanticShades } from '../../../src/data/semanticPresets.js';
import { SPACING, RADIUS } from '../../../src/data/uiKitFoundations.js';
import { toOklch, fromOklch, ratio, luminance } from './engine/color.js';
import { loadBrand } from './engine/brand.js';
import { BrandInputError } from './engine/validate.js';
import { TTF_FAMILIES, CATEGORIES, standInFor, isKnownFamily, catalogueEntry } from './fontCatalogue.js';
import { BRANDS } from './brands/index.js';

const HEX = /^#[0-9A-F]{6}$/;
const up = (h) => String(h).toUpperCase();
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const round1 = (v) => Math.round(v * 10) / 10;

// ---- colour ----
// Moves a colour's lightness away from its grounds until it reaches `min` on every one; black or white if no lightness does.
function reach(hex, grounds, min) {
  const ok = (c) => grounds.every((g) => ratio(c, g) >= min);
  if (ok(hex)) return hex;
  const { L, C, H } = toOklch(hex);
  const avg = grounds.reduce((s, g) => s + luminance(g), 0) / grounds.length;
  const lighten = luminance(hex) >= avg;
  for (const dir of [lighten ? 1 : -1, lighten ? -1 : 1]) {
    for (let l = L + dir * 0.01; l >= 0 && l <= 1; l += dir * 0.01) { const c = fromOklch(clamp(l, 0, 1), C, H); if (ok(c)) return c; }
  }
  const floor = (c) => Math.min(...grounds.map((g) => ratio(c, g)));
  return ['#000000', '#FFFFFF'].find(ok) || (floor('#000000') >= floor('#FFFFFF') ? '#000000' : '#FFFFFF');
}
const shiftL = (hex, dl) => { const { L, C, H } = toOklch(hex); return fromOklch(clamp(L + dl, 0, 1), C, H); };

// Action fill, its hover and pressed states, and a label that reads on all three.
function actionStates(action, labels, hoverSeed) {
  const label = labels.find((c) => ratio(c, action) >= 4.5) || (ratio('#FFFFFF', action) >= ratio('#000000', action) ? '#FFFFFF' : '#000000');
  const dl = luminance(label) > luminance(action) ? -1 : 1;
  return { action, actionHover: reach(hoverSeed || shiftL(action, dl * 0.05), [label], 4.5), actionPressed: reach(shiftL(action, dl * 0.1), [label], 4.5), actionLabel: label };
}

// The Studio's default information colour is a stock blue and its focus ring follows it, so a brand whose own colours are green and gold shipped a blue ring and a blue
// information message. Where the design does not choose an information colour it takes the primary's hue, and the focus ring is the brand's ink in both modes.
const ownInfo = (design) => design?.states && ((design.states.info !== undefined && design.states.info !== null) || design.states.infoHue !== undefined);
const infoTone = (primary, bgL, fgL, grounds) => {
  const { C, H } = toOklch(primary), c = Math.min(C, 0.14), bg = up(fromOklch(bgL, Math.min(c, 0.035), H));
  return { fg: reach(fromOklch(fgL, c, H), [bg, ...grounds], 4.5), bg };
};

function lightRoles(palette, slots, semantic, design) {
  // raised is a lighter step of the surface, never pure white: a white card on a cream page is the one cold thing in the set
  const R = interfaceRoles(palette, semantic), surface = up(R.background), raised = up(shiftL(surface, 0.03)), sunken = shiftL(surface, -0.04);
  const all = [surface, raised, sunken];
  const text = reach(up(R.onSurface), all, 4.5), quiet = reach(up(R.onSurfaceMuted), [surface, raised], 4.5);
  const a = actionStates(slots.pine.hex, [text, raised, '#FFFFFF', '#000000'], up(R.primaryHover));
  const dis = up(R.disabled);
  const tone = (s) => { const bg = up(s.background); return { fg: reach(up(s.hex), [bg, surface], 4.5), bg }; };
  const by = Object.fromEntries(semantic.map((s) => [s.id, tone(s)]));
  const r = {
    surface, raised, sunken, text, textSoft: reach(shiftL(text, 0.08), all, 4.5), quiet, quietOnSunken: reach(quiet, [sunken], 4.5),
    border: reach(fromOklch(clamp((toOklch(text).L + toOklch(surface).L) / 2, 0, 1), toOklch(text).C, toOklch(text).H), [surface], 3), divider: up(R.border),
    ...a, focus: ownInfo(design) ? reach(up(R.focus), [...all], 3) : reach(text, [...all], 3), disabledBg: dis, disabledText: reach(up(R.onDisabled), [dis], 4.5), scrim: text,
    success: by.success, warning: by.warning, danger: by.danger, info: ownInfo(design) ? by.info : infoTone(slots.pine.hex, 0.96, 0.45, [surface]), neutral: { fg: text, bg: sunken },
  };
  // A pale action fill gets an edge that reads on the surface, so the button is still seen.
  if (ratio(r.action, surface) < 3) r.actionEdge = r.border;
  return r;
}

function darkRoles(design, primary) {
  // The dark grounds take a trace of the primary's hue; a grey, white or black primary has none to give, so they stay neutral.
  const { C: chroma, H } = toOklch(primary), tint = chroma < 0.02 ? 0 : 1, dk = (L, C = 0.012) => fromOklch(L, C * tint, H);
  const surface = dk(0.19), raised = dk(0.235), sunken = dk(0.15), all = [surface, raised, sunken];
  const text = reach(dk(0.95, 0.01), all, 4.5), quiet = reach(dk(0.72), [surface, raised], 4.5), dis = dk(0.26);
  const a = actionStates(reach(primary, [surface], 3), [surface, text, '#FFFFFF', '#000000']);
  const shades = semanticShades(design?.states);
  const tone = (role) => { const bg = shades[role][9]; return { fg: reach(shades[role][3], [bg, surface], 4.5), bg }; };
  return {
    surface, raised, sunken, text, textSoft: reach(dk(0.86), all, 4.5), quiet, quietOnSunken: reach(quiet, [sunken], 4.5),
    border: reach(dk(0.6), [surface], 3), divider: dk(0.3), ...a, focus: ownInfo(design) ? reach(fromOklch(0.78, 0.1, 250), all, 3) : reach(text, all, 3),
    disabledBg: dis, disabledText: reach(dk(0.62), [dis], 4.5), scrim: sunken,
    success: tone('success'), warning: tone('warning'), danger: tone('error'), info: ownInfo(design) ? tone('info') : infoTone(primary, 0.28, 0.82, [surface]), neutral: { fg: text, bg: raised },
  };
}

// ---- fonts ----
const nearest = (ws, want) => ws.reduce((b, w) => (Math.abs(w - want) < Math.abs(b - want) || (Math.abs(w - want) === Math.abs(b - want) && w > b) ? w : b));
const query = (family, ws) => `${family.replace(/ /g, '+')}:wght@${ws.join(';')}`;

// One font role. A family with a .ttf here is used as it is; any other takes its category's stand-in files and weights.
function fontFace(role, family, wantWeight, category) {
  const own = Object.hasOwn(TTF_FAMILIES, family) ? TTF_FAMILIES[family] : undefined;  // a family called "toString" is not a table entry
  const cat = CATEGORIES.includes(category) ? category : (catalogueEntry(family) || {}).category;
  const standIn = !own;
  const useFamily = own ? family : standInFor(CATEGORIES.includes(cat) ? cat : 'sans-serif', role === 'display' ? 'heading' : 'body');
  const src = TTF_FAMILIES[useFamily];
  const pool = role === 'display' ? src.weights : (src.weights.filter((w) => w <= 600).length ? src.weights.filter((w) => w <= 600) : src.weights);
  const weights = role === 'display' ? [nearest(src.weights, wantWeight)] : pool;
  const face = { family: own ? family : (isKnownFamily(family) ? family : useFamily), weights, file: src.file, css: query(useFamily, weights) };
  if (standIn && face.family !== useFamily) face.standIn = true;
  if (role === 'display') { face.logoWeight = weights[0]; face.headingWeight = weights[0]; }
  return face;
}

// ---- text ----
const wordmarkOf = (name) => {
  let out = '';
  for (const ch of String(name ?? '').normalize('NFD')) {
    const c = ch.codePointAt(0);
    if ((c >= 65 && c <= 90) || (c >= 97 && c <= 122) || (c >= 48 && c <= 57) || ' .,&\'-'.includes(ch)) out += ch;
  }
  out = out.replace(/\s+/g, ' ').replace(/^[^A-Za-z0-9]+/, '').slice(0, 40).trim();  // no leading punctuation: "../x" is "x"
  return /[A-Za-z0-9]/.test(out) ? out : 'Your brand';
};
const slugOf = (word) => {
  const s = word.toLowerCase().split('').map((ch) => (/[a-z0-9]/.test(ch) ? ch : '-')).join('').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 38).replace(/-$/, '');
  return `p-${s || 'brand'}`;
};

const T = (token, face, size, line, weight, use) => ({ token, face, size, line, weight, use });
const rule = (a, b) => ({ do: a, dont: b });

// The generic copy; shapes and counts follow the sample brands, wording is the user's to write. The prose is empty: the slot edition fills every
// empty string with its own descriptor box, so a placeholder is never drawn as a sentence. A theme's sample copy (sampleCopy) replaces it.
function skeleton(word, date) {
  const w = '';
  return {
    name: word, theme: '04-standards', edition: 'slot', version: { number: '1.0', date },
    description: w, product: w, audience: w, city: w,
    lines: { primary: w, others: [w, w] },
    personality: [1, 2, 3].map((i) => ({ trait: `Trait ${i}`, means: w })),
    voice: {
      principles: [1, 2, 3, 4].map(() => ({ title: w, example: w })),
      writeThis: [1, 2, 3, 4, 5].map((i) => ({ write: `Write this ${i}`, not: `Not this ${i}`, because: w })),
      boilerplate25: w, boilerplate50: w, nameRules: w,
    },
    imagery: {
      direction: { subject: w, light: w, crop: w, colour: w, people: w },
      shots: ['queue', 'door', 'stage', 'phone', 'wristband', 'after'].map((id) => ({ id, slot: w })),
      rules: [1, 2, 3, 4].map((i) => rule(`Photo habit ${i}.`, `Photo mistake ${i}.`)),
    },
    layout: { page: { w: 794, h: 1123 }, margin: 56, columns: 6, gutter: 16, base: 4 },
    applications: {
      card: { person: 'Your name', role: 'Your title', contact: 'you@brand.example' }, social: [1, 2, 3].map((i) => `Social line ${i}.`),
      signage: 'Sign, 594 x 841 mm: your line here.', email: { person: 'Your name', role: 'Your title' }, site: { url: 'brand.example' },
    },
    guideB: {
      studioSlot: w, examples: [1, 2, 3, 4].map((i) => ({ do: `Example ${i}, do this.`, dont: `Example ${i}, not this.` })), rules: [1, 2, 3].map((i) => ({ title: `Brand rule ${i}`, text: w })),
      email: { to: 'Customer name', subject: 'Your subject line', time: '10:44', body: ['Hi there,', w] },
      notIn: [1, 2, 3].map((i) => `Left out of this document ${i}.`),
    },
    contact: { owner: 'Brand team', email: 'brand@brand.example' },
  };
}

// ---- a theme's sample copy ----
// The sections of a sample brand that are words (not colours, fonts, sizes or layout). The project's own fields are laid over them.
const COPY_KEYS = ['description', 'product', 'audience', 'city', 'lines', 'personality', 'voice', 'imagery', 'applications', 'guideB', 'contact'];
const dom = (name) => String(name).toLowerCase().replace(/[^a-z0-9]/g, '');

// The sample's name written as the project's: in any capitals ("Kerbside", "KERBSIDE", "OffCut"), and in lower case inside an address
// ("hi@name.example"). A lower-case word on its own ("margin") is left: it is a word there, not the brand.
function swapName(text, from, to) {
  // from is a sample brand's name: letters and spaces, so it needs no escaping in a pattern
  const lower = dom(from), caps = new RegExp(from, 'gi'), address = new RegExp(`(?<=[@/])${lower}(?=[.])|(?<![A-Za-z0-9])${lower}(?=[.][a-z])`, 'g');
  return text.replace(address, dom(to) || 'brand').replace(caps, (m) => (m === m.toLowerCase() ? m : m === m.toUpperCase() ? to.toUpperCase() : to));
}
const swapDeep = (v, from, to) => (typeof v === 'string' ? swapName(v, from, to)
  : Array.isArray(v) ? v.map((x) => swapDeep(x, from, to))
    : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, swapDeep(x, from, to)])) : v);

// The sample brand each theme is drawn from (src/config/exportThemePicker.js names the same; tests/unit/brand-from-project-sample-copy.test.js
// keeps the two in step). Kept here because the picker file is not one the API bundle carries.
export const THEME_SAMPLE = Object.freeze({
  '01-presentation': 'kerbside', '02-poster': 'encore', '03-broadsheet': 'saltbush', '04-standards': 'two-shores', '05-specimen': 'margin',
  '06-studio': 'offcut', '07-spec': 'northern-current', '08-monograph': 'long-room', '09-blueprint': 'plumbline', '10-inuse': 'shallow-end',
  '21-presentation': 'kerbside', '22-ticket': 'encore', '23-broadsheet': 'saltbush', '24-standards': 'two-shores', '26-notebook': 'offcut',
  '28-riso': 'long-room', '25-label': 'margin', '27-swissfield': 'northern-current', '29-blueprint': 'plumbline', '30-fluted': 'northern-current',
  '31-contact': 'plumbline', '32-dieline': 'kerbside',
});

// The words of the theme's sample brand with its name swapped for the project's; null for no theme or one without a sample.
function sampleCopy(themeId, word) {
  const key = typeof themeId === 'string' && Object.hasOwn(THEME_SAMPLE, themeId) ? THEME_SAMPLE[themeId] : '';
  const data = Object.hasOwn(BRANDS, key) ? BRANDS[key].data : null;
  if (!data) return null;
  const swap = (v) => swapDeep(structuredClone(v ?? null), data.name, word);
  return {
    copy: Object.fromEntries(COPY_KEYS.filter((k) => data[k] !== undefined).map((k) => [k, swap(data[k])])),
    type: { sample: swap(data.type?.sample), rules: swap(data.type?.rules) },
    logo: { idea: swap(data.logo?.idea), symbolNote: swap(data.logo?.showcase?.symbolNote), when: swap(data.logo?.when) },
  };
}

function uiBlock(light, dark) {
  const when = (i, t) => `${String(8 + i).padStart(2, '0')}:30, ${t}`;
  const st = ['new', 'active', 'waiting', 'closed'];
  return {
    radius: { control: RADIUS.control, card: RADIUS.card }, border: 1, spacingBase: 4, spacing: [...SPACING], shadows: 'none',
    light, dark,
    status: [['new', 'New', 'action'], ['active', 'Active', 'success'], ['waiting', 'Waiting', 'warning'], ['closed', 'Closed', 'neutral']].map(([id, label, tone]) => ({ id, label, tone })),
    elevationNote: 'Surfaces step in tone; anything that floats gets a 1 px edge.',
    screen: {
      title: 'Your screen',
      content: {
        time: '10:44', status: 'Active', eta: 'Ready by 10:44', pickup: 'A live update goes here.', from: 'Start', to: 'Finish', progress: 0.6,
        rider: 'Name Surname', initials: 'NS', riderNote: 'A progress note', call: 'Call', deliverToLabel: 'Address', deliverTo: '12 Example Street',
        paidLabel: 'Total', paid: '$24.50', share: 'Share link',
        deliveries: [...st, st[0], st[1]].map((s, i) => ({ to: `Item ${i + 1}`, when: when(i, 'A short note'), price: `$${20 + i}.50`, status: s })),
        form: {
          title: 'Form title', pickup: 'First field', pickupValue: 'First value', dropoff: 'Second field', dropoffValue: 'Second value',
          ready: 'Third field', readyValue: '61', readyError: 'Say how to fix it.', size: 'Choice', sizes: ['Option one', 'Option two'],
          notes: 'Notes', notesHelp: 'A hint under the notes.', book: 'Main action', bookWhy: 'Say why it is off.',
        },
        empty: { title: 'Nothing here yet', body: 'Say what to do next.', cta: 'Get started' },
        dialog: { title: 'Dialog question?', body: 'Say what happens next.', confirm: 'Confirm', keep: 'Keep' },
        toast: 'A short confirmation.', alert: 'A short notice.', inline: 'A short hint.',
        example: {
          secondary: 'Back', quiet: 'Skip', danger: 'Remove', small: 'Add', account: 'Account', checks: ['Check one', 'Check two', 'Check three'],
          switches: ['Switch one', 'Switch two'], radios: ['Option one', 'Option two'], statLabel: 'Count', crumbs: ['Home', 'Section'],
          tabs: ['First', 'Second', 'Third'], links: [['First', 'house'], ['Second', 'search'], ['Third', 'user']],
        },
      },
    },
  };
}

function typeBlock(d, faces, sample) {
  const lad = typeLadder(d).map((x) => x.px);
  const fw = (face, want) => nearest(faces[face].weights, want);
  const body = clamp(d.lineHeight, 1.2, 1.8);
  // whole pixels, and nothing under 12: a fractional size reads as computed, not decided, and a smaller caption cannot be read
  const s = (v, lo, hi) => Math.round(clamp(v, lo, hi));
  return {
    scale: [
      T('display', 'display', s(lad[0], 24, 96), 1.05, fw('display', d.headingWeight), 'The largest line'),
      T('headline', 'display', s(lad[1], 20, 80), 1.1, fw('display', d.headingWeight), 'A page headline'),
      T('title', 'display', s(lad[3], 16, 40), 1.2, fw('display', d.headingWeight), 'A section title'),
      T('body', 'body', s(lad[5], 12, 24), round1(body * 100) / 100, fw('body', d.bodyWeight), 'Running copy'),
      T('label', 'body', s(lad[6], 12, 18), 1.3, fw('body', 500), 'Labels and small text'),
      T('caption', 'body', s(lad[7], 12, 16), 1.4, fw('body', 400), 'Notes and folios'),
    ],
    sample: sample?.sample ?? { headline: '', paragraph: '', caption: '' },
    rules: sample?.rules ?? [1, 2, 3, 4, 5, 6].map((i) => rule(`Type habit ${i}.`, `Type mistake ${i}.`)),
  };
}

// A colourway can colour a second part of the mark (a rule, a wedge, a plate) apart from the name; themes name those parts in their
// colour tables. The plain wordmark has one colour, so each of those parts takes the name's.
const DETAIL_KEYS = ['kerb', 'wake', 'cut', 'sun', 'plate', 'plumb', 'lane', 'rule', 'mark'];

// Themes lay the logo on a coloured ground by a colourway named for it. Every name they look up is made here, on the primary, the accent
// or the support colour, with the mark in whichever of ink, canvas, black or white reads on that ground.
const ON_PRIMARY = ['on-signal', 'on-brick', 'on-vermilion', 'on-quandong', 'on-lane', 'on-toolbox', 'on-sunbelt'];
const ON_ACCENT = ['on-buoy', 'on-blush', 'on-wattle', 'on-timber', 'on-float'];
const ON_SUPPORT = ['on-concrete', 'on-steel', 'on-white'];
function onColourways(cw, onGround, label, primary, accent, support) {
  const out = {};
  for (const k of ON_PRIMARY) out[k] = cw(label, primary);
  for (const k of ON_ACCENT) out[k] = cw(onGround(accent), accent);
  for (const k of ON_SUPPORT) out[k] = cw(onGround(support), support);
  return out;
}

// ---- the brand ----
const plain = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
// readDesign and the kit helpers expect objects and an array of colours; any other shape in the request counts as absent.
const cleanDesign = (design) => { const d = plain(design), p = plain(d.palette); return { ...d, palette: { ...p, colors: Array.isArray(p.colors) ? p.colors : [] }, fonts: plain(d.fonts) }; };

// What the project has said about itself (design.identity, the name and description the UI kit is personalised with), trimmed. Anything it
// has not said stays the skeleton's example copy.
const said = (v, max) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');
const ownWords = (design) => { const i = plain(design.identity); return { name: said(i.name, 120), description: said(i.description, 280) }; };
// The project's name; its identity name when the project has none; the example name when there is neither.
const ownName = (projectName, own) => { const w = wordmarkOf(projectName); return w === 'Your brand' ? wordmarkOf(own.name) : w; };

function build({ design: rawDesign, projectName, date }, themeId) {
  const design = cleanDesign(rawDesign), d = readDesign(design), own = ownWords(design), word = ownName(projectName, own), sample = sampleCopy(themeId, word);
  const palette = kitPalette(design || {}), slot = Object.fromEntries(palette.map((p) => [p.id, p]));
  const light = lightRoles(palette, slot, kitSemantic(design || {}), design), dark = darkRoles(design, slot.pine.hex);
  const faces = {
    display: fontFace('display', d.heading, d.headingWeight, design?.fonts?.heading?.category),
    body: fontFace('body', d.body, d.bodyWeight, design?.fonts?.body?.category),
    mono: { family: 'IBM Plex Mono', weights: [400], file: 'IBMPlexMono', css: 'IBM+Plex+Mono:wght@400' },
  };
  const ink = slot.ink.hex, canvas = slot.chalk.hex, prim = slot.pine.hex;
  const kit = [['primary', slot.pine, 'action', 0.08], ['ink', slot.ink, 'text', 0.1], ['support', slot.lilac, 'panel', 0.1], ['canvas', slot.chalk, 'ground', 0.55], ['accent', slot.citron, 'highlight', 0.07]];
  const seen = new Set(kit.map(([, s]) => s.hex));
  const extra = d.palette.slice(5).map(up).filter((h) => HEX.test(h) && !seen.has(h) && seen.add(h)).slice(0, 6);
  const raw = [...kit.map(([, , , sh]) => sh), 0.03, ...extra.map(() => 0.1 / extra.length)], total = raw.reduce((a, b) => a + b, 0);
  const shares = raw.map((v) => Math.round((v / total) * 1000) / 1000);
  shares[3] = Math.round((shares[3] + 1 - shares.reduce((a, b) => a + b, 0)) * 1000) / 1000;
  const colours = [
    ...kit.map(([id, s, role], i) => ({ id, name: s.name, hex: s.hex, role, lands: s.lands, share: shares[i] })),
    { id: 'label', name: 'Label', hex: actionStates(prim, [canvas, ink, '#FFFFFF', '#000000']).actionLabel, role: 'label', lands: 'Text on the primary colour.', share: shares[5] },
    ...extra.map((hex, i) => ({ id: `alt-${i + 1}`, name: `Alternative ${i + 1}`, hex, role: 'alternative', lands: 'Where the main colours need a companion.', share: shares[6 + i] })),
  ];
  const pairs = [['ink', 'canvas', ink, canvas, 'Body text and headlines'], ['canvas', 'ink', canvas, ink, 'Reversed text'], ['ink', 'support', ink, slot.lilac.hex, 'Text on panels'],
    ['ink', 'accent', ink, slot.citron.hex, 'Text on the accent'], ['canvas', 'primary', canvas, prim, 'Text on the primary'], ['primary', 'canvas', prim, canvas, 'Links']]
    .filter(([, , fg, bg]) => ratio(fg, bg) >= 4.5).map(([fg, bg, , , use]) => ({ fg, bg, use }));
  const onGround = (g) => [ink, canvas, '#000000', '#FFFFFF'].find((c) => ratio(c, g) >= 4.5) || '#000000';
  const a = actionStates(prim, [canvas, ink, '#FFFFFF', '#000000']);
  const cw = (name, ground, mark = name) => ({ name, ground, ...Object.fromEntries(DETAIL_KEYS.map((k) => [k, name])), sign: mark, tile: mark, tileInk: onGround(mark) });
  const brand = {
    // The sample's words stand where the skeleton has none; what the project has said (its name, its description) is laid over both.
    ...skeleton(word, date), ...sample?.copy, ...(own.description ? { description: own.description, product: own.description } : null), slug: slugOf(word), colours, tones: [], pairs,
    fonts: faces, type: typeBlock(d, faces, sample?.type),
    logo: {
      idea: sample?.logo.idea ?? '',
      showcase: { wordmark: word, symbolNote: sample?.logo.symbolNote ?? '', minScreenPx: 96, minPrintMm: 24 },
      colourways: {
        colour: cw(ink, canvas, prim), 'mono-dark': cw(ink, canvas), 'mono-light': cw(canvas, ink), reversed: cw(a.actionLabel, prim, a.actionLabel),
        'on-stage': cw(canvas, ink, prim), ...onColourways(cw, onGround, a.actionLabel, prim, slot.citron.hex, slot.lilac.hex),
      },
      when: sample?.logo.when ?? Object.fromEntries(['colour', 'mono-dark', 'mono-light', 'reversed', 'horizontal', 'stacked', 'symbol'].map((k) => [k, ''])),
    },
    // infoOwn: the design picked its own information colour, so a theme's house info tone (meta.statusTones) must not replace it
    ui: { ...uiBlock(light, dark), infoOwn: !!ownInfo(design) },
  };
  return brand;
}

// design and projectName are the body of an export request; both are untrusted. themeId (optional, one of the export themes' ids) names the
// theme the brand is for: where the project has said nothing, the words come from that theme's sample brand, not from a blank.
export function projectToBrand(input, themeId) {
  const { design, projectName, date = new Date().toISOString().slice(0, 10) } = input && typeof input === 'object' ? input : {};
  try {
    const brand = build({ design, projectName, date }, themeId);
    loadBrand(brand, null);  // contrast, ids and shape: throws if any rule is missed
    return brand;
  } catch (e) {
    if (e instanceof BrandInputError) throw e;
    const err = new BrandInputError('', `could not be made from the project: ${e && e.message ? e.message : e}`);
    err.cause = e;
    throw err;
  }
}
