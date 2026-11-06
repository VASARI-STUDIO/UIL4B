// Escapers for each place brand text can land. Each one makes its output inert in that place only.
// The HTML escaper is `esc` in brand.js; these cover CSS strings, CSS identifiers, SVG attributes, comments and Markdown.

// Drops private-use code points (U+E000 to U+F8FF, where the placeholder sentinels live), control characters other than tab,
// line feed and carriage return, and the Unicode line and paragraph separators.
export function stripBad(s) {
  let out = '';
  for (const ch of String(s ?? '')) {
    const c = ch.codePointAt(0);
    if ((c >= 0xE000 && c <= 0xF8FF) || c === 0x2028 || c === 0x2029 || c === 127 || (c < 32 && c !== 9 && c !== 10 && c !== 13)) continue;
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

// Text inside a /* */ or // comment: no comment terminators and no line breaks.
export const commentText = (s) => stripBad(s).replace(/\*\//g, '* /').replace(/\/\*/g, '/ *').replace(/[\r\n]+/g, ' ');

// Markdown text: structure characters, HTML and line breaks are neutralised.
const MD_SPECIAL = new Set('\\`*_{}[]()#+!|<>~'.split(''));
export const mdEsc = (s) => [...stripBad(s).replace(/[\r\n]+/g, ' ')].map((ch) => (MD_SPECIAL.has(ch) ? '\\' + ch : ch)).join('');
