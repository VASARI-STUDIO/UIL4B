// validateBrand: an allowlist over brand data before the engine reads it. Returns a sanitised deep copy, or throws BrandInputError.
//   structure  keys outside the known sections, and objects with unknown keys where the shape is closed, are refused
//   leaves     hex, ids, slug, numbers (finite, in range), weights and font families are matched exactly; refused when they do not match
//   text       every other string loses private-use code points (U+E000 to U+F8FF) and control characters, and is cut to its length cap
import { stripBad } from './escape.js';
import { isKnownFamily } from '../fontCatalogue.js';

export class BrandInputError extends Error {
  constructor(path, why) { super(`brand data: ${path || '(root)'} ${why}`); this.name = 'BrandInputError'; this.code = 'brand_input'; this.path = path; }
}

const HEX = /^#[0-9a-fA-F]{6}$/, ID = /^[a-z0-9-]{1,32}$/, SLUG = /^[a-z0-9][a-z0-9-]{0,40}$/;
const WEIGHTS = new Set([100, 200, 300, 400, 500, 600, 700, 800, 900]);
const KEY = /^[A-Za-z0-9_-]{1,48}$/, BAD_KEY = new Set(['__proto__', 'constructor', 'prototype']);
const CSS_QUERY = /^[A-Za-z0-9+:,;@.={}-]{1,200}$/, AXES = /^[A-Za-z0-9 ,.]{1,40}$/, FILE = /^[A-Za-z0-9-]{1,48}$/;
const SHADOW_LEN = '-?[0-9]{1,3}(?:[.][0-9]{1,2})?(?:px)?';
const SHADOW = new RegExp(`^(?:none|${SHADOW_LEN}(?: ${SHADOW_LEN}){2,3}(?: rgba[(][0-9]{1,3}, ?[0-9]{1,3}, ?[0-9]{1,3}, ?(?:0|1|0?[.][0-9]{1,3})[)])?)$`);
const MAX_DEPTH = 10, MAX_ARRAY = 300, MAX_NODES = 20000;
const TEXT_MAX = 1000, LINE_MAX = 120;

const hex = (v) => HEX.test(v);
const id = (v) => ID.test(v);
const hexOrId = (v) => hex(v) || id(v) || v === 'transparent';
const date = (v) => /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(v) && !Number.isNaN(Date.parse(v + 'T00:00:00Z'));
const num = (lo, hi) => ({ num: [lo, hi] });
const oneOf = (...vals) => (v) => vals.includes(v);

// Leaf rules by path ("[]" stands for any array index). A function checks a string; { num } bounds a number.
// type.scale faces are the brand's three font roles or "chrome", the running theme's own face (03-broadsheet sets captions in it); ui.type has no chrome.
const LEAF = {
  slug: (v) => SLUG.test(v), edition: oneOf('slot', 'showcase'), theme: (v) => /^[0-9]{2}-[a-z]{3,20}$/.test(v),
  'version.number': (v) => /^[0-9]{1,3}([.][0-9]{1,3}){0,2}$/.test(v), 'version.date': date,
  'colours[].id': id, 'tones[].id': id, 'colours[].hex': hex, 'tones[].hex': hex, 'colours[].role': (v) => /^[a-z][a-z -]{0,31}$/.test(v), 'tones[].role': (v) => /^[a-z][a-z -]{0,31}$/.test(v),
  'colours[].share': num(0, 1), 'tones[].share': num(0, 1), 'pairs[].fg': id, 'pairs[].bg': id, 'pairs[].minSize': num(6, 200),
  'fonts.display.family': isKnownFamily, 'fonts.body.family': isKnownFamily, 'fonts.mono.family': isKnownFamily,
  'fonts.display.file': (v) => FILE.test(v), 'fonts.body.file': (v) => FILE.test(v), 'fonts.mono.file': (v) => FILE.test(v),
  'fonts.display.css': (v) => CSS_QUERY.test(v), 'fonts.body.css': (v) => CSS_QUERY.test(v), 'fonts.mono.css': (v) => CSS_QUERY.test(v),
  'fonts.display.italicCss': (v) => CSS_QUERY.test(v), 'fonts.body.italicCss': (v) => CSS_QUERY.test(v),
  'fonts.display.axes': (v) => AXES.test(v), 'fonts.body.axes': (v) => AXES.test(v), 'fonts.mono.axes': (v) => AXES.test(v),
  'fonts.display.stretch': num(25, 200), 'fonts.body.stretch': num(25, 200), 'fonts.mono.stretch': num(25, 200),
  'type.scale[].token': id, 'type.scale[].face': oneOf('display', 'body', 'mono', 'chrome'), 'type.scale[].size': num(6, 400), 'type.scale[].line': num(0.5, 5),
  'ui.type[].token': id, 'ui.type[].face': oneOf('display', 'body', 'mono'), 'ui.type[].size': num(6, 400), 'ui.type[].line': num(0.5, 400),
  'layout.page.w': num(100, 5000), 'layout.page.h': num(100, 5000), 'layout.margin': num(0, 400), 'layout.columns': num(1, 24), 'layout.gutter': num(0, 200), 'layout.base': num(1, 32),
  'ui.border': num(0, 8), 'ui.spacingBase': num(1, 32), 'ui.spacing[]': num(1, 256), 'ui.shadows': (v) => SHADOW.test(v),
  'ui.radius.control': num(0, 9999), 'ui.radius.card': num(0, 9999), 'ui.radius.button': num(0, 9999), 'ui.radius.input': num(0, 9999), 'ui.radius.chip': num(0, 9999),
  'ui.icons[]': id, 'ui.rowIcon': id, 'ui.houseRoles[]': oneOf('success', 'warning', 'danger', 'info'),
  'ui.status[].id': id, 'ui.status[].tone': oneOf('action', 'success', 'warning', 'danger', 'info', 'neutral'),
  'ui.status[].fg': hexOrId, 'ui.status[].bg': hexOrId, 'ui.status[].edge': hexOrId, 'ui.status[].dark.fg': hexOrId, 'ui.status[].dark.bg': hexOrId, 'ui.status[].dark.edge': hexOrId,
  'imagery.shots[].id': id, 'logo.showcase.minScreenPx': num(8, 1000), 'logo.showcase.minPrintMm': num(1, 500),
  'ui.screen.content.progress': num(0, 1), 'ui.screen.content.deliveries[].status': id,
};
const LINE_PATHS = new Set(['name', 'city', 'logo.showcase.wordmark', 'contact.email', 'applications.site.url', 'applications.card.contact', 'ui.screen.content.example.links[][]']);
const WEIGHT_PATH = /^(fonts[.](display|body|mono)[.](weights|italics)\[\]|fonts[.](display|body)[.](labelWeight|strongWeight|logoWeight|headingWeight)|type[.]scale\[\][.]weight|ui[.]type\[\][.]weight)$/;
const COLOUR_PATH = /^(ui[.](light|dark)[.][A-Za-z]+([.](fg|bg))?|logo[.]colourways[.][a-z0-9-]{1,32}[.][A-Za-z]{1,16})$/;
const TOP = new Set(['name', 'slug', 'theme', 'edition', 'version', 'description', 'product', 'audience', 'city', 'lines', 'personality', 'voice', 'colours', 'tones', 'pairs', 'fonts', 'type', 'logo', 'imagery', 'layout', 'ui', 'applications', 'guideB', 'contact']);
const CLOSED = {
  '': TOP, version: ['number', 'date'], fonts: ['display', 'body', 'mono'], layout: ['page', 'margin', 'columns', 'gutter', 'base'], 'layout.page': ['w', 'h'],
  'colours[]': ['id', 'name', 'hex', 'role', 'lands', 'share'], 'tones[]': ['id', 'name', 'hex', 'role', 'lands', 'share'], 'pairs[]': ['fg', 'bg', 'use', 'minSize'],
  'fonts.display': ['family', 'weights', 'file', 'css', 'axes', 'stretch', 'italics', 'italicCss', 'labelWeight', 'strongWeight', 'logoWeight', 'headingWeight', 'standIn'],
  'ui.radius': ['control', 'card', 'button', 'input', 'chip'],
};
CLOSED['fonts.body'] = CLOSED['fonts.display']; CLOSED['fonts.mono'] = CLOSED['fonts.display'];
const BOOL = new Set(['fonts.display.standIn', 'fonts.body.standIn', 'fonts.mono.standIn']);
const ACTION_EXEMPT = /^ui[.](light|dark)[.]actionExempt$/;

// Text the brand wrote: control characters and private-use code points go (the slot edition's placeholder sentinels live in that range, so
// brand text must never carry one in).
const PRIVATE_USE = new RegExp(`[${String.fromCodePoint(0xE000)}-${String.fromCodePoint(0xF8FF)}]`, 'g');
const text = (s) => stripBad(s).replace(PRIVATE_USE, '');
// Collapses line breaks and tabs: a one-line field never carries a break into a comment, attribute or file name.
const oneLine = (s) => text(s).replace(/[\r\n\t]+/g, ' ').trim();

export function validateBrand(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new BrandInputError('', 'must be an object');
  let nodes = 0;
  const walk = (v, parts, depth) => {
    const path = parts.join('.'), pat = parts.map((p) => (/^[0-9]+$/.test(p) ? '[]' : p)).join('.').replace(/[.]\[\]/g, '[]');
    if (++nodes > MAX_NODES || depth > MAX_DEPTH) throw new BrandInputError(path, 'is nested or sized beyond the limit');
    if (typeof v === 'string') {
      if (COLOUR_PATH.test(pat) || pat === 'ui.light.actionExempt') { if (!hex(v)) throw new BrandInputError(path, 'must be a #rrggbb colour'); return v; }
      const rule = LEAF[pat];
      if (typeof rule === 'function') { if (!rule(v)) throw new BrandInputError(path, 'is not an allowed value'); return v; }
      if ((rule && rule.num) || WEIGHT_PATH.test(pat)) throw new BrandInputError(path, 'must be a number');  // a number field never takes text
      return LINE_PATHS.has(pat) ? oneLine(v).slice(0, LINE_MAX) : text(v).slice(0, TEXT_MAX);
    }
    if (typeof v === 'number') {
      if (!Number.isFinite(v)) throw new BrandInputError(path, 'must be a finite number');
      if (WEIGHT_PATH.test(pat)) { if (!WEIGHTS.has(v)) throw new BrandInputError(path, 'must be a weight from 100 to 900 in steps of 100'); return v; }
      const rule = LEAF[pat], [lo, hi] = (rule && rule.num) || [-1e6, 1e6];
      if (v < lo || v > hi) throw new BrandInputError(path, `must be between ${lo} and ${hi}`);
      return v;
    }
    if (typeof v === 'boolean') { if (!BOOL.has(pat) && !ACTION_EXEMPT.test(pat)) throw new BrandInputError(path, 'is not an allowed value'); return v; }
    if (Array.isArray(v)) {
      if (v.length > MAX_ARRAY) throw new BrandInputError(path, 'has too many items');
      return v.map((x, i) => walk(x, [...parts, String(i)], depth + 1));
    }
    if (v && typeof v === 'object') {
      const out = {}, closed = CLOSED[pat];
      for (const k of Object.keys(v)) {
        if (BAD_KEY.has(k) || !KEY.test(k) || (closed && !(closed.has ? closed.has(k) : closed.includes(k)))) throw new BrandInputError([...parts, k].join('.'), 'is not an allowed key');
        out[k] = walk(v[k], [...parts, k], depth + 1);
      }
      return out;
    }
    throw new BrandInputError(path, 'is not an allowed value');
  };
  return walk(data, [], 0);
}
