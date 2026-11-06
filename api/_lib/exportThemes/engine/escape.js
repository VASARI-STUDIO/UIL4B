// Escapers for each place brand text can land. Each one makes its output inert in that place only.
// The HTML escaper is `esc` in brand.js; these cover CSS strings, CSS identifiers, SVG attributes, comments and Markdown.

// Drops control characters other than tab, line feed and carriage return, and the Unicode line and paragraph separators.
// Private-use code points (U+E000 to U+F8FF) are kept: the slot edition's placeholder sentinels live there, and brand strings
// lose them at ingest (validateBrand), before any placeholder exists.
export function stripBad(s) {
  let out = '';
  for (const ch of String(s ?? '')) {
    const c = ch.codePointAt(0);
    if (c === 0x2028 || c === 0x2029 || c === 127 || (c < 32 && c !== 9 && c !== 10 && c !== 13)) continue;
    out += ch;
  }
  return out;
}

// Text stripped as above and length-capped.
export const cleanText = (s, max = 2000) => stripBad(s).slice(0, max);

// The inside of a double-quoted CSS string: backslash, quotes, angle brackets, ampersand and line breaks become CSS escapes.
export const cssStr = (s) => stripBad(s).replace(/[\\"'<>&\r\n]/g, (c) => '\\' + c.charCodeAt(0).toString(16) + ' ');

// A CSS identifier (a custom-property name or class name part): letters, digits, hyphen and underscore only.
export const cssIdent = (s) => String(s ?? '').replace(/[^A-Za-z0-9_-]/g, '');

// An SVG or HTML double-quoted attribute value.
export const svgAttr = (s) => stripBad(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// Text inside a /* */ or // comment: no comment terminators, no line breaks, and no "<" (so a "</style>" in a CSS comment
// cannot end the style element it sits in).
export const commentText = (s) => stripBad(s).replace(/\*\//g, '* /').replace(/\/\*/g, '/ *').replace(/[\r\n]+/g, ' ').replace(/</g, '&lt;');

// A number printed into CSS or SVG (a weight, a stretch, a stroke): coerced to a finite number, else an error.
export function cssNum(v, what = 'value') {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
  if (!Number.isFinite(n)) throw new Error(`${what} must be a finite number, got ${JSON.stringify(String(v)).slice(0, 40)}`);
  return n;
}

// A box-shadow value printed into a custom property: "none", or a list of shadows made only of numbers, units, colour words,
// hex, rgb()/hsl()/oklch()-style calls and commas. Anything else (a semicolon, brace, quote, backslash, angle bracket, slash,
// url, or unbalanced bracket) is an error.
export function cssShadow(v) {
  const s = stripBad(v).trim();
  let depth = 0;
  for (const ch of s) { if (ch === '(') depth++; else if (ch === ')' && --depth < 0) break; }
  if (!s || s.length > 300 || depth !== 0 || !/^[0-9A-Za-z#%.,()\s+-]+$/.test(s) || /url|expression|\bimport\b/i.test(s)) throw new Error(`ui.shadows is not a plain shadow value: ${JSON.stringify(s.slice(0, 40))}`);
  return s;
}

// Markdown text: emphasis, code, link, HTML and table characters, a leading list or heading marker, and line breaks are neutralised.
const MD_SPECIAL = new Set('\\`*_[]<>|~'.split(''));
export const mdEsc = (s) => [...stripBad(s).replace(/[\r\n]+/g, ' ')].map((ch) => (MD_SPECIAL.has(ch) ? '\\' + ch : ch)).join('')
  // a marker at the start of the text (heading, list, rule, numbered list) would change the line it opens
  .replace(/^(\s*)(?:([#+=-])|(\d+)([.)]))(?=\s|$)/, (m, sp, mark, num, dot) => (mark ? `${sp}\\${mark}` : `${sp}${num}\\${dot}`));

// Escaped HTML text printed inside a fenced Markdown code block: line breaks become spaces and every backtick an entity (still a
// backtick when the HTML is read), so no line of it can open or close the fence.
export const fencedHtml = (html) => stripBad(html).replace(/[\r\n]+/g, ' ').replace(/`/g, '&#96;');
