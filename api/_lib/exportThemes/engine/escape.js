// Escapers for each place brand text can land. Each one makes its output inert in that place only.
// The HTML escaper is `esc` in brand.js; these cover CSS strings, CSS identifiers, SVG attributes, comments and Markdown.

// Private-use code points (the placeholder sentinels live here) and control characters.
const PRIVATE_OR_CONTROL = /[-\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

// Text stripped of private-use and control characters (tab and newline survive), length-capped.
export const cleanText = (s, max = 2000) => String(s ?? '').replace(PRIVATE_OR_CONTROL, '').slice(0, max);

// The inside of a double-quoted CSS string: backslash, quote, angle brackets, ampersand and line breaks become CSS escapes.
export const cssStr = (s) => String(s ?? '').replace(PRIVATE_OR_CONTROL, '').replace(/[\\"'<>&\r\n\f]/g, (c) => `\\${c.charCodeAt(0).toString(16)} `);

// A CSS identifier (a custom-property name or class name part): letters, digits, hyphen and underscore only.
export const cssIdent = (s) => String(s ?? '').replace(/[^A-Za-z0-9_-]/g, '');

// An SVG or HTML double-quoted attribute value.
export const svgAttr = (s) => String(s ?? '').replace(PRIVATE_OR_CONTROL, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// Text inside a /* */ or // comment: no comment terminators and no line breaks.
export const commentText = (s) => String(s ?? '').replace(PRIVATE_OR_CONTROL, '').replace(/\*\//g, '* /').replace(/\/\*/g, '/ *').replace(/[\r\n  ]+/g, ' ');

// Markdown text: structure characters, HTML and line breaks are neutralised.
export const mdEsc = (s) => String(s ?? '').replace(PRIVATE_OR_CONTROL, '').replace(/[\r\n]+/g, ' ').replace(/[\\`*_{}[\]()#+!|<>~]/g, (c) => `\\${c}`);
