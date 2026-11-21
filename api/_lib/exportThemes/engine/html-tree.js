// A small HTML tree for the guide site build, so the anchors, labels and links the engine adds in a browser can be added on a server.
// It reads the markup the themes write (well-formed, void tags left open, a few omitted end tags) and not arbitrary web pages: it is
// not a spec parser. What it does follow from the HTML rules, because the themes' markup relies on them: the end of a <p>, <li>,
// <td>/<th>, <tr> and table section by the next one, and the <tbody> a browser puts round loose <tr> rows.
// Text and attribute values keep their source form (entities stay encoded); textContent reads them decoded.

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
const RAW = new Set(['script', 'style', 'textarea', 'title']);
// opening one of these ends an open <p>
const ENDS_P = new Set(['address', 'article', 'aside', 'blockquote', 'details', 'div', 'dl', 'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hr', 'main', 'nav', 'ol', 'p', 'pre', 'section', 'table', 'ul']);
const SECTION = new Set(['thead', 'tbody', 'tfoot']);

const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0', sect: '§', mdash: '—', ndash: '–', middot: '·', hellip: '…', rarr: '→', larr: '←', times: '×', copy: '©', reg: '®', trade: '™', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', bull: '•', deg: '°', minus: '−', thinsp: '\u2009', ensp: '\u2002', emsp: '\u2003' };
export const decode = (s) => (s.includes('&') ? s.replace(/&(?:#(\d+)|#x([0-9a-f]+)|([a-z]+));/gi, (m, d, x, n) => {
  if (d || x) { const c = parseInt(d || x, d ? 10 : 16); return c > 0 && c <= 0x10ffff ? String.fromCodePoint(c) : m; }
  return Object.hasOwn(NAMED, n) ? NAMED[n] : m;
}) : s);
export const escText = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\u00a0/g, '&nbsp;');
const escAttr = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

const el = (name, attrs = [], kids = []) => { const n = { t: 'el', name, tag: name.toLowerCase(), attrs, kids, parent: null }; for (const k of kids) k.parent = n; return n; };
const text = (v) => ({ t: 'text', v, parent: null });
export const createElement = (name, attrs = {}, kids = []) => el(name, Object.entries(attrs).map(([k, v]) => [k, escAttr(String(v))]), kids);
export const createText = text;

const ATTR = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/y;

export function parse(html) {
  const root = { t: 'root', kids: [], parent: null }, stack = [root];
  const top = () => stack[stack.length - 1];
  const add = (n) => { n.parent = top(); top().kids.push(n); };
  const popTo = (pred) => { for (let i = stack.length - 1; i > 0; i--) if (pred(stack[i])) { stack.length = i; return true; } return false; };
  let i = 0;
  const n = html.length;
  while (i < n) {
    if (html[i] !== '<') {
      let j = html.indexOf('<', i + 1); if (j < 0) j = n;
      // a "<" that does not start a tag is text
      while (j < n && !/[a-zA-Z/!]/.test(html[j + 1] || '')) { const k = html.indexOf('<', j + 1); j = k < 0 ? n : k; }
      add(text(html.slice(i, j))); i = j; continue;
    }
    if (html.startsWith('<!--', i)) { let j = html.indexOf('-->', i + 4); j = j < 0 ? n : j + 3; add({ t: 'raw', v: html.slice(i, j), parent: null }); i = j; continue; }
    if (html[i + 1] === '!' || html[i + 1] === '?') { let j = html.indexOf('>', i); j = j < 0 ? n : j + 1; add({ t: 'raw', v: html.slice(i, j), parent: null }); i = j; continue; }
    if (html[i + 1] === '/') {
      let j = html.indexOf('>', i); j = j < 0 ? n : j;
      const name = html.slice(i + 2, j).trim().toLowerCase();
      popTo((s) => s.tag === name);
      i = j + 1; continue;
    }
    const m = /^<([a-zA-Z][^\s/>]*)/.exec(html.slice(i, i + 80));
    if (!m) { add(text('<')); i++; continue; }
    const name = m[1], tag = name.toLowerCase(), attrs = [];
    let p = i + m[0].length, selfClosed = false;
    for (;;) {
      while (p < n && /\s/.test(html[p])) p++;
      if (p >= n) break;
      if (html[p] === '>') { p++; break; }
      if (html[p] === '/') { if (html[p + 1] === '>') { selfClosed = true; p += 2; break; } p++; continue; }
      ATTR.lastIndex = p; const a = ATTR.exec(html);
      if (!a) { p++; continue; }
      attrs.push([a[1], a[2] ?? a[3] ?? a[4] ?? null, a[3] != null]); p = ATTR.lastIndex;
    }
    // end tags the markup leaves out
    const parentTag = () => top().tag;
    if (ENDS_P.has(tag) && parentTag() === 'p') stack.pop();
    if (tag === 'li' && parentTag() === 'li') stack.pop();
    if ((tag === 'dt' || tag === 'dd') && (parentTag() === 'dt' || parentTag() === 'dd')) stack.pop();
    if (tag === 'td' || tag === 'th') { if (parentTag() === 'td' || parentTag() === 'th') stack.pop(); }
    if (tag === 'tr' || SECTION.has(tag)) {
      if (parentTag() === 'td' || parentTag() === 'th') stack.pop();
      if (parentTag() === 'tr') stack.pop();
      if (SECTION.has(tag) && SECTION.has(parentTag())) stack.pop();
      if (SECTION.has(tag) && top().implicit) stack.pop();
      // the tbody a browser puts round rows that sit straight in the table
      if (tag === 'tr' && parentTag() === 'table') { const tb = el('tbody'); tb.implicit = true; add(tb); stack.push(tb); }
    }
    const node = el(name, attrs.map(([k, v, single]) => [k, v == null ? '' : single ? v.replace(/"/g, '&quot;') : v]));
    add(node);
    if (selfClosed || VOID.has(tag)) { i = p; continue; }
    if (RAW.has(tag)) {
      const close = new RegExp(`</${tag}\\s*>`, 'i'); close.lastIndex = 0;
      const rest = html.slice(p), c = close.exec(rest);
      const body = c ? rest.slice(0, c.index) : rest;
      if (body) { const t = text(body); t.raw = true; t.parent = node; node.kids.push(t); }
      i = p + body.length + (c ? c[0].length : 0); continue;
    }
    stack.push(node); i = p;
  }
  return root;
}

// ---- reading ----
const kids = (n) => n.kids || [];
// every descendant element in document order; a <template>'s content is not part of the page, so it is not entered
export function elements(node) {
  const out = [];
  (function walk(x) { for (const k of kids(x)) if (k.t === 'el') { out.push(k); if (k.tag !== 'template') walk(k); } })(node);
  return out;
}
export function textNodes(node) {
  const out = [];
  (function walk(x) { for (const k of kids(x)) { if (k.t === 'text') out.push(k); else if (k.t === 'el' && k.tag !== 'template') walk(k); } })(node);
  return out;
}
export const textContent = (node) => (node.t === 'text' ? (node.raw ? node.v : decode(node.v)) : textNodes(node).map((x) => (x.raw ? x.v : decode(x.v))).join(''));
// the text nodes joined by a space, whitespace collapsed
export const flat = (node) => textNodes(node).map((x) => (x.raw ? x.v : decode(x.v))).join(' ').replace(/\s+/g, ' ').trim();
export const children = (n) => kids(n).filter((k) => k.t === 'el');
export const getAttr = (e, name) => { const a = e.attrs.find(([k]) => k.toLowerCase() === name); return a ? decode(a[1]) : null; };
export const hasAttr = (e, name) => e.attrs.some(([k]) => k.toLowerCase() === name);
export function setAttr(e, name, value) {
  const v = escAttr(String(value)), a = e.attrs.find(([k]) => k.toLowerCase() === name);
  if (a) a[1] = v; else e.attrs.push([name, v]);
}
const classes = (e) => (getAttr(e, 'class') || '').split(/\s+/).filter(Boolean);
export const addClass = (e, c) => { if (!classes(e).includes(c)) setAttr(e, 'class', [...classes(e), c].join(' ')); };
export const contains = (a, b) => { for (let x = b; x; x = x.parent) if (x === a) return true; return false; };

// ---- selectors: a comma list of compounds (tag, .class, #id, [attr]); anything else is refused, so a theme cannot silently match nothing ----
const SIMPLE = /^(?:[a-zA-Z][\w-]*|\*)?(?:\.[\w-]+|#[\w-]+|\[[\w-]+(?:=[^\]]*)?\])*$/;
const cache = new Map();
function compile(sel) {
  if (cache.has(sel)) return cache.get(sel);
  const list = sel.split(',').map((s) => s.trim()).filter(Boolean).map((part) => {
    if (!SIMPLE.test(part)) throw new Error(`html-tree: selector "${part}" is not supported (use tag, .class, #id and [attr] only)`);
    const c = { tag: null, id: null, cls: [], attrs: [] };
    const tag = /^[a-zA-Z][\w-]*/.exec(part); if (tag) c.tag = tag[0].toLowerCase();
    for (const m of part.matchAll(/\.([\w-]+)|#([\w-]+)|\[([\w-]+)(?:=([^\]]*))?\]/g)) {
      if (m[1]) c.cls.push(m[1]); else if (m[2]) c.id = m[2]; else c.attrs.push([m[3].toLowerCase(), m[4] == null ? null : m[4].replace(/^["']|["']$/g, '')]);
    }
    return c;
  });
  cache.set(sel, list); return list;
}
export function matches(e, sel) {
  if (!sel) return false;
  return compile(sel).some((c) => {
    if (c.tag && c.tag !== e.tag) return false;
    if (c.id && getAttr(e, 'id') !== c.id) return false;
    if (c.cls.length) { const have = classes(e); if (!c.cls.every((k) => have.includes(k))) return false; }
    return c.attrs.every(([k, v]) => (v == null ? hasAttr(e, k) : getAttr(e, k) === v));
  });
}
// the nearest element from e up (e included) that matches; `stop` is the last element looked at
export function closest(e, sel, stop = null) {
  if (!sel) return null;
  for (let x = e; x && x.t === 'el'; x = x.parent) { if (matches(x, sel)) return x; if (x === stop) break; }
  return null;
}
export const querySelectorAll = (root, sel) => elements(root).filter((e) => matches(e, sel));
export const querySelector = (root, sel) => elements(root).find((e) => matches(e, sel)) || null;

// ---- changing ----
export function detach(n) { if (n.parent) { n.parent.kids.splice(n.parent.kids.indexOf(n), 1); n.parent = null; } }
export function prepend(parent, n) { detach(n); n.parent = parent; parent.kids.unshift(n); }
export function replaceKids(parent, list) { for (const k of parent.kids) k.parent = null; parent.kids = list; for (const k of list) { detach(k); k.parent = parent; } }
export function replaceNode(n, list) { const p = n.parent, at = p.kids.indexOf(n); for (const k of list) k.parent = p; p.kids.splice(at, 1, ...list); n.parent = null; }

// ---- writing ----
export function serialize(n) {
  if (n.t === 'text') return n.v;
  if (n.t === 'raw') return n.v;
  if (n.t === 'root') return n.kids.map(serialize).join('');
  const open = `<${n.name}${n.attrs.map(([k, v]) => ` ${k}="${v}"`).join('')}>`;
  if (VOID.has(n.tag)) return open;
  return `${open}${n.kids.map(serialize).join('')}</${n.name}>`;
}
export const innerHTML = (n) => n.kids.map(serialize).join('');
