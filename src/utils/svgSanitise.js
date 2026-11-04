// ALLOW-LIST SVG SANITISER — markup that is safe to put straight into the page.
//
// WHY THIS EXISTS, AND HOW IT DIFFERS FROM THE OTHER TWO
// brandLogo.sanitiseSvg() refuses a file by pattern and IconLibrary's private
// sanitizeSvgMarkup() strips a short deny-list (script, on*, javascript: hrefs).
// Both are fine behind an <img>, where the browser blocks script anyway. Neither
// is enough once the markup is INLINED, where it runs with the page's origin and
// is styled by the page's CSS. This module is the inline-grade check: nothing
// survives unless it is on a list. Those two stay as they are.
//
// WHY IT HAS ITS OWN PARSER
// The unit tests run in plain Node, which has no DOMParser, and the suite has no
// DOM shim (no jsdom / linkedom), so a DOMParser version could not be tested
// where the rest of the suite runs. The input is also hostile, so the safer
// design is one that never hands it to a DOM at all: a strict XML tokeniser
// builds a small tree, the allow-list prunes it, and the output is SERIALISED
// from that tree with every name and value re-escaped. Nothing the browser would
// have to interpret (a DOCTYPE, an entity, a mutation-XSS namespace trick)
// reaches a DOM parser. The input must be well-formed XML: unquoted attributes,
// unclosed tags, undefined entities and the like reject the whole file.
//
// WHAT SURVIVES
//  · Elements: ELEMENTS below, matched case-SENSITIVELY (SVG is XML; `clipPath`
//    is not `clippath`, and `<SCRIPT>` is simply not on the list).
//  · Attributes: ATTRIBUTES below, each with a value check, not just a name check.
//    A `fill` must be a colour, keyword or url(#local); a `d` must be path data.
//  · References: `href` (on <use> only; `xlink:href` is read as `href`) and
//    url(#id) in fill / stroke / clip-path / mask must name an id that is IN the
//    cleaned document. Anything else (external, data:, javascript:, a page id) is
//    dropped, so inlined markup can never pull in something from the host page.
//  · Dropped, never parsed: <script>, <foreignObject>, <image>, <a>,
//    <animate>, <set>, <text>, <filter>, metadata, every prefixed element, plus
//    on* attributes, comments, processing instructions, CDATA outside
//    <title>/<desc>. A dropped element takes its whole subtree with it.
//  · <title> and <desc> keep text only: any element inside one is dropped, even
//    an allow-listed one (an HTML parser would end the <svg> at it).
//  · `class` is never kept: inlined, it would hook the host page's own
//    stylesheet (position: fixed overlays, display: none, spoofed UI).
//
// CSS THAT SETS HOW AN ICON DRAWS
// Icons from design tools often keep their stroke and fill in CSS, not in
// attributes. Neither `style` nor <style> is ever echoed, but the plain
// presentation they carry is converted into the attributes the file would have
// had, so the drawing survives and its stroke can still be edited:
//  · A `style="prop: value; ..."` attribute is read as declarations. A <style>
//    block is read only when it is nothing but rules whose selectors are one
//    class (`.a`), one allow-listed element name (`path`), or a comma list of
//    those. Any other block (at-rules, `*`, combinators, pseudo-classes,
//    attribute selectors, nesting, unbalanced braces or comments, attributes on
//    the <style> beyond a plain type) is dropped whole with one note. /* */
//    comments are stripped first; CDATA content is read as plain text.
//  · Rules are resolved onto the elements they match before `class` goes, so a
//    class that a stylesheet used is dropped without a note.
//  · A declaration becomes an attribute only when its property is in
//    STYLE_PROPERTIES (the CSS-settable part of the attribute list) and its
//    value passes the very check that attribute gets. A value with a url() other
//    than url(#id), a backslash, a quote, `@`, `<`, a comment or expression() is
//    refused before that check. `!important` is ignored. What does not convert
//    is dropped with a note such as `style: filter`.
//  · Order, lowest to highest: the presentation attribute, element-name rules,
//    class rules, the style attribute. Within one level the later rule or
//    declaration wins. A declaration that fails does not override anything.
//
// WHAT REJECTS THE WHOLE FILE (returns null)
//  · A DOCTYPE, ENTITY or any other `<!` declaration (billion laughs / XXE), or
//    any `&name;` that is not one of the five XML entities.
//  · Not well-formed XML, root not `<svg>`, more than one root, NUL bytes.
//  · Over a cap: bytes, element count, nesting depth, <use> count (a <use> chain
//    can multiply what the renderer has to draw, so the count is bounded).
//
// RETURN: `{ ok, css, svg, removed }`, or `null` on a reject.
//  · `svg`     the cleaned markup, always with the SVG xmlns on the root.
//  · `removed` plain-text notes of what was dropped (`<script>`, `@onload`), at
//              most 50, de-duplicated. Never put these in innerHTML.
//  · `ok`      true when nothing needed removing. A display path can use `svg`
//              whatever `ok` says; an upload path can refuse when it is false.
//  · `css`     true when the file carried a style, class or <style>, converted
//              or not, so a caller that wants the file exactly as drawn can
//              tell that the output was rewritten.
//  Comments, the <?xml?> declaration, xmlns:* declarations, `version` and
//  `xml:space` are dropped without a note: they are noise, not content.
//  `null` rather than `{ ok: false }` keeps the contract of the private
//  sanitizeSvgMarkup() in IconLibrary, so swapping this in is a one-line change.
//
// OPTIONS: `idPrefix` (letters, digits, `-`, `_`; starts with a letter) is put in
// front of every id and every reference to one, joined with a `.` (`ic1.g`), so
// several icons inlined into one page, or one sprite, cannot collide. A bad
// prefix throws RangeError: it is a caller bug, not untrusted input. `maxBytes`,
// `maxElements`, `maxDepth` and `maxUse` override SVG_LIMITS.
//  · Without an idPrefix, an id survives only when a kept url(#id) or <use href>
//    in the file points at it; every other id is dropped without a note, so
//    author ids do not reach the host page's id namespace. A sprite whose
//    <symbol>s are used from outside the file needs an idPrefix to keep its ids.

const SVG_NS = 'http://www.w3.org/2000/svg'

/** Caps applied when the caller gives none. Bytes are UTF-8 bytes of the source. */
export const SVG_LIMITS = Object.freeze({
  maxBytes: 32 * 1024,
  maxElements: 500,
  maxDepth: 12,
  maxUse: 16,
})

const MAX_REMOVED_NOTES = 50

const ELEMENTS = new Set([
  'svg', 'g', 'path', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'rect',
  'defs', 'clipPath', 'mask', 'linearGradient', 'radialGradient', 'stop',
  'title', 'desc', 'symbol', 'use',
])
const TEXT_ELEMENTS = new Set(['title', 'desc'])

// ── value checks ────────────────────────────────────────────────────────────
// Each takes the decoded attribute value and returns the cleaned value, or null
// to drop the attribute. They return the author's own text where it is valid, so
// a clean icon comes out byte-for-byte as it went in.

// Value regexes name XML whitespace (space, tab, CR, LF) outright: `\s` also
// matches NBSP, U+2028 and other Unicode spaces that no SVG value grammar allows.
const NUMBER_RE = /^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?$/
const LENGTH_RE = /^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?(?:px|em|rem|ex|pt|pc|mm|cm|in|%)?$/
const ID_RE = /^[A-Za-z_][\w.-]*$/
const HEX_RE = /^#[0-9a-fA-F]{3,8}$/
const COLOUR_FN_RE = /^(?:rgb|rgba|hsl|hsla)\([ \t\r\n]*[-+\d.% \t\r\n,/a-z]*\)$/i
const KEYWORD_RE = /^[a-zA-Z]{1,24}$/
const URL_REF_RE = /^url\([ \t\r\n]*["']?#([A-Za-z_][\w.-]*)["']?[ \t\r\n]*\)(?:[ \t\r\n]+(\S.*))?$/
const PATH_DATA_RE = /^[ \t\r\nMmLlHhVvCcSsQqTtAaZz\d.,eE+-]*$/
const POINTS_RE = /^[ \t\r\n\d.,eE+-]*$/
const TRANSFORM_STEP = /[ \t\r\n]*(?:matrix|translate|scale|rotate|skewX|skewY)[ \t\r\n]*\([-+\d.eE \t\r\n,]*\)[ \t\r\n,]*/y
const ASPECT_RE = /^(?:defer[ \t\r\n]+)?(?:none|x(?:Min|Mid|Max)Y(?:Min|Mid|Max))(?:[ \t\r\n]+(?:meet|slice))?$/
// eslint-disable-next-line no-control-regex
const CLOAK_RE = /[\u0000- \u007f-\u009f]/g
// Matched after stripping whitespace and control characters, so `java\tscript:`
// and `&#106;avascript:` (already decoded by then) are caught too.
const HOSTILE_RE = /(?:javascript|vbscript|data|file|blob):|expression\(|@import/i

const length = (v) => { const t = v.trim(); return LENGTH_RE.test(t) ? t : null }
const oneOf = (...values) => { const set = new Set(values); return (v) => { const t = v.trim(); return set.has(t) ? t : null } }
const tokens = (v) => v.split(/[ \t\r\n,]+/).filter(Boolean)

function simplePaint(t) {
  return HEX_RE.test(t) || COLOUR_FN_RE.test(t) || KEYWORD_RE.test(t)
}

// A paint is a colour, a keyword, or `url(#id)` with an optional plain fallback.
// The url is rebuilt from the captured id, never echoed, so quote tricks and
// trailing junk cannot ride along.
function paintOrUrl(v) {
  const t = v.trim()
  if (simplePaint(t)) return t
  const m = URL_REF_RE.exec(t)
  if (!m) return null
  const fallback = m[2]?.trim()
  if (fallback && !simplePaint(fallback)) return null
  return `url(#${m[1]})${fallback ? ` ${fallback}` : ''}`
}

const paintOnly = (v) => { const t = v.trim(); return simplePaint(t) ? t : null }

const urlOrNone = (v) => {
  const t = v.trim()
  if (t === 'none') return t
  const m = URL_REF_RE.exec(t)
  return m && !m[2] ? `url(#${m[1]})` : null
}

function pathData(v) {
  return PATH_DATA_RE.test(v) ? v.trim() : null
}

function points(v) {
  return POINTS_RE.test(v) ? v.trim() : null
}

function viewBox(v) {
  const t = tokens(v)
  return t.length === 4 && t.every(x => NUMBER_RE.test(x)) ? v.trim() : null
}

function dashArray(v) {
  const t = v.trim()
  if (t === 'none') return t
  const parts = tokens(t)
  return parts.length && parts.every(x => LENGTH_RE.test(x)) ? t : null
}

function transform(v) {
  const t = v.trim()
  if (!t) return null
  let pos = 0
  while (pos < t.length) {
    TRANSFORM_STEP.lastIndex = pos
    if (!TRANSFORM_STEP.test(t)) return null
    pos = TRANSFORM_STEP.lastIndex
  }
  return t
}

const identifier = (v) => (ID_RE.test(v) ? v : null)
const aspect = (v) => { const t = v.trim(); return ASPECT_RE.test(t) ? t : null }

const ATTRIBUTES = new Map()
for (const name of [
  'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'fx', 'fy', 'fr',
  'width', 'height', 'stroke-width', 'stroke-miterlimit', 'stroke-dashoffset',
  'opacity', 'fill-opacity', 'stroke-opacity', 'stop-opacity', 'offset',
]) ATTRIBUTES.set(name, length)
ATTRIBUTES.set('d', pathData)
ATTRIBUTES.set('points', points)
ATTRIBUTES.set('viewBox', viewBox)
ATTRIBUTES.set('fill', paintOrUrl)
ATTRIBUTES.set('stroke', paintOrUrl)
ATTRIBUTES.set('stop-color', paintOnly)
ATTRIBUTES.set('color', paintOnly)
ATTRIBUTES.set('clip-path', urlOrNone)
ATTRIBUTES.set('mask', urlOrNone)
ATTRIBUTES.set('stroke-dasharray', dashArray)
ATTRIBUTES.set('stroke-linecap', oneOf('butt', 'round', 'square'))
ATTRIBUTES.set('stroke-linejoin', oneOf('miter', 'round', 'bevel', 'arcs', 'miter-clip'))
ATTRIBUTES.set('fill-rule', oneOf('nonzero', 'evenodd'))
ATTRIBUTES.set('clip-rule', oneOf('nonzero', 'evenodd'))
ATTRIBUTES.set('gradientUnits', oneOf('userSpaceOnUse', 'objectBoundingBox'))
ATTRIBUTES.set('clipPathUnits', oneOf('userSpaceOnUse', 'objectBoundingBox'))
ATTRIBUTES.set('maskUnits', oneOf('userSpaceOnUse', 'objectBoundingBox'))
ATTRIBUTES.set('maskContentUnits', oneOf('userSpaceOnUse', 'objectBoundingBox'))
ATTRIBUTES.set('spreadMethod', oneOf('pad', 'reflect', 'repeat'))
ATTRIBUTES.set('mask-type', oneOf('luminance', 'alpha'))
ATTRIBUTES.set('vector-effect', oneOf('none', 'non-scaling-stroke', 'non-scaling-size', 'non-rotation', 'fixed-position'))
ATTRIBUTES.set('preserveAspectRatio', aspect)
ATTRIBUTES.set('transform', transform)
ATTRIBUTES.set('gradientTransform', transform)
ATTRIBUTES.set('id', identifier)
// `href` is checked as a fragment reference in cleanElement(), not here.
ATTRIBUTES.set('href', null)

/** The element and attribute names that can survive, for docs and tests. */
export const SVG_ALLOWED_ELEMENTS = Object.freeze([...ELEMENTS])
export const SVG_ALLOWED_ATTRIBUTES = Object.freeze([...ATTRIBUTES.keys(), 'xmlns'])

// Dropped without a note: they carry no content and no risk.
const SILENT_ATTRIBUTES = new Set(['version', 'baseProfile', 'xml:space'])

// ── CSS presentation ────────────────────────────────────────────────────────
// A style attribute or a plain <style> is never kept; the declarations in them
// that map onto an allow-listed attribute are turned into that attribute.

// The properties CSS can set that have an attribute of the same name. `d`,
// `transform`, `id`, `href`, `points` and the like are not here: their CSS
// grammar differs from the attribute's, or they are not properties at all.
const STYLE_PROPERTIES = new Set([
  'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit',
  'stroke-dasharray', 'stroke-dashoffset', 'fill-opacity', 'stroke-opacity', 'opacity',
  'fill-rule', 'clip-rule', 'clip-path', 'mask', 'mask-type', 'vector-effect',
  'stop-color', 'stop-opacity', 'color',
  'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'width', 'height',
])

// Refused before the attribute's own check: a backslash (CSS escapes), comments,
// `@`, markup, any quote or brace, expression(), and any url() that is not a
// local `url(#id)`.
const STYLE_REFUSED_RE = /[\\@<>"'{}]|\/\*|\*\/|expression|url\((?![ \t\r\n]*#)/i
const IMPORTANT_RE = /![ \t\r\n]*important$/i
const PROP_NAME_RE = /^-{0,2}[a-zA-Z][\w-]*$/
const CLASS_SELECTOR_RE = /^\.(-?[A-Za-z_][\w-]*)$/
const XML_SPACE_RE = /[ \t\r\n]+/

function styleValue(name, raw) {
  const value = raw.trim().replace(IMPORTANT_RE, '').trim()
  if (!value || STYLE_REFUSED_RE.test(value) || HOSTILE_RE.test(value.replace(CLOAK_RE, ''))) return null
  return ATTRIBUTES.get(name)(value)
}

// `prop: value; ...` to a Map of attribute name to cleaned value. The last valid
// declaration of a property wins; one that fails is dropped with a note and
// leaves an earlier one standing, as CSS does.
function declarations(text, ctx) {
  const out = new Map()
  for (const part of text.split(';')) {
    const decl = part.trim()
    if (!decl) continue
    const colon = decl.indexOf(':')
    const name = colon > 0 ? decl.slice(0, colon).trim().toLowerCase() : ''
    if (!PROP_NAME_RE.test(name)) { ctx.note('@style'); continue }
    const clean = STYLE_PROPERTIES.has(name) ? styleValue(name, decl.slice(colon + 1)) : null
    if (clean === null) ctx.note(`style: ${name.slice(0, 40)}`)
    else out.set(name, clean)
  }
  return out
}

// Strips /* */ comments, each becoming one space. null when one is unterminated
// or a stray terminator is left.
function stripComments(css) {
  let out = ''
  let at = 0
  for (;;) {
    const open = css.indexOf('/*', at)
    if (open < 0) break
    const close = css.indexOf('*/', open + 2)
    if (close < 0) return null
    out += `${css.slice(at, open)} `
    at = close + 2
  }
  out += css.slice(at)
  return out.includes('*/') ? null : out
}

// One <style> element: `{ rules }` when it is only simple rules, else `{ why }`.
// Nothing is converted here, so a refused sheet leaves no trace but its note.
function parseSheet(node, ctx) {
  const PLAIN = 'not plain rules'
  for (const [name, value] of node.attrs) {
    const plain = (name === 'type' && (value === '' || value === 'text/css'))
      || (name === 'media' && (value === '' || value === 'all' || value === 'screen'))
      || name === 'id' || name === 'xml:space'
    if (!plain) return { why: 'attributes' }
  }
  let text = ''
  for (const c of node.children) {
    if (c.text === undefined) return { why: PLAIN }
    text += c.text
  }
  const css = stripComments(text)
  if (css === null) return { why: PLAIN }
  if (css.includes('@')) return { why: '@-rules' }

  const parsed = []
  let at = 0
  for (;;) {
    while (at < css.length && XML_SPACE_RE.test(css[at])) at++
    if (at >= css.length) break
    const open = css.indexOf('{', at)
    if (open < 0) return { why: PLAIN }
    const head = css.slice(at, open).trim()
    const close = css.indexOf('}', open + 1)
    const body = close < 0 ? '' : css.slice(open + 1, close)
    if (close < 0 || body.includes('{')) return { why: PLAIN }
    const selectors = []
    for (const part of head.split(',')) {
      const sel = part.trim()
      const cls = CLASS_SELECTOR_RE.exec(sel)
      if (cls) selectors.push({ cls: cls[1] })
      else if (ELEMENTS.has(sel)) selectors.push({ element: sel })
      else return { why: 'selectors other than .class or an element' }
    }
    parsed.push({ selectors, body })
    at = close + 1
  }

  const rules = parsed.map(({ selectors, body }) => ({
    order: ctx.rules++, selectors, decls: declarations(body, ctx),
  }))
  return { rules }
}

// Reads every <style> in the kept part of the tree, before any element is
// cleaned, so a rule applies to elements that come before its <style> too.
function collectSheets(node, ctx) {
  for (const child of node.children) {
    if (child.name === 'style') {
      child.sheet = parseSheet(child, ctx)
      for (const rule of child.sheet.rules ?? []) {
        for (const sel of rule.selectors) {
          const index = sel.cls !== undefined ? ctx.byClass : ctx.byElement
          const key = sel.cls ?? sel.element
          if (!index.has(key)) index.set(key, [])
          index.get(key).push(rule)
        }
      }
    } else if (child.name && ELEMENTS.has(child.name) && !TEXT_ELEMENTS.has(child.name)) {
      collectSheets(child, ctx)
    }
  }
}

// What the stylesheet and the style attribute say about one element, as a Map of
// attribute name to value, lowest precedence first.
function cascade(node, classValue, styleText, ctx) {
  const out = new Map()
  const apply = (decls) => { for (const [k, v] of decls) out.set(k, v) }
  for (const rule of ctx.byElement.get(node.name) ?? []) apply(rule.decls)
  if (classValue !== undefined) {
    const hit = new Set()
    for (const c of classValue.split(XML_SPACE_RE)) for (const rule of ctx.byClass.get(c) ?? []) hit.add(rule)
    for (const rule of [...hit].sort((a, b) => a.order - b.order)) apply(rule.decls)
  }
  if (styleText !== undefined) apply(declarations(styleText, ctx))
  return out
}

// ── parser ──────────────────────────────────────────────────────────────────

class Reject extends Error {}
const reject = (why) => { throw new Reject(why) }

const STRAY_AMP_RE = /&(?!(?:#x[0-9a-fA-F]+|#[0-9]+|amp|lt|gt|quot|apos);)/
const ENTITY_RE = /&(#x[0-9a-fA-F]+|#[0-9]+|amp|lt|gt|quot|apos);/g
const NAMED_ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }
// Any C0 control except tab, newline and carriage return makes the file not XML.
// eslint-disable-next-line no-control-regex
const CONTROL_RE = /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/

function decodeEntities(s) {
  if (!s.includes('&')) return s
  if (STRAY_AMP_RE.test(s)) reject('undefined entity')
  return s.replace(ENTITY_RE, (_, body) => {
    if (body[0] !== '#') return NAMED_ENTITIES[body]
    const code = body[1] === 'x' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10)
    const ok = Number.isInteger(code) && code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff)
    if (!ok || (code < 0x20 && code !== 9 && code !== 10 && code !== 13)) reject('invalid character reference')
    return String.fromCodePoint(code)
  })
}

const NAME_RE = /[A-Za-z_][\w:.-]*/y
const ATTR_RE = /\s+([^\s=/>"'<]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/y
const TAG_END_RE = /\s*(\/?)>/y

function sticky(re, src, at) {
  re.lastIndex = at
  return re.exec(src)
}

function parse(src, limits) {
  const doc = { name: '#document', attrs: [], children: [] }
  const stack = [doc]
  let elements = 0
  let i = 0
  let sawRoot = false
  const n = src.length
  const processing = []

  while (i < n) {
    const top = stack[stack.length - 1]
    if (src[i] !== '<') {
      const lt = src.indexOf('<', i)
      const end = lt === -1 ? n : lt
      const text = src.slice(i, end)
      if (top === doc) { if (/\S/.test(text)) reject('text outside the root') }
      else top.children.push({ text: decodeEntities(text) })
      i = end
      continue
    }
    if (src.startsWith('<!--', i)) {
      const end = src.indexOf('-->', i + 4)
      if (end < 0) reject('unterminated comment')
      i = end + 3
      continue
    }
    if (src.startsWith('<![CDATA[', i)) {
      if (top === doc) reject('CDATA outside the root')
      const end = src.indexOf(']]>', i + 9)
      if (end < 0) reject('unterminated CDATA')
      top.children.push({ text: src.slice(i + 9, end) })
      i = end + 3
      continue
    }
    if (src.startsWith('<?', i)) {
      const end = src.indexOf('?>', i + 2)
      if (end < 0) reject('unterminated processing instruction')
      const target = /^[\w:.-]*/.exec(src.slice(i + 2, end))[0]
      if (!(i === 0 && target === 'xml')) processing.push(`<?${target.slice(0, 40)}?>`)
      i = end + 2
      continue
    }
    if (src.startsWith('<!', i)) reject('declaration')
    if (src.startsWith('</', i)) {
      const end = src.indexOf('>', i)
      if (end < 0) reject('unterminated tag')
      if (stack.length < 2 || src.slice(i + 2, end).trim() !== top.name) reject('mismatched closing tag')
      stack.pop()
      i = end + 1
      continue
    }

    const nameMatch = sticky(NAME_RE, src, i + 1)
    if (!nameMatch) reject('bad tag name')
    const node = { name: nameMatch[0], attrs: [], children: [] }
    let at = NAME_RE.lastIndex
    const seen = new Set()
    for (let m = sticky(ATTR_RE, src, at); m; m = sticky(ATTR_RE, src, at)) {
      at = ATTR_RE.lastIndex
      const name = m[1]
      const raw = m[2] ?? m[3]
      if (seen.has(name)) reject('duplicate attribute')
      if (raw.includes('<')) reject('"<" in an attribute value')
      seen.add(name)
      node.attrs.push([name, decodeEntities(raw)])
    }
    const endMatch = sticky(TAG_END_RE, src, at)
    if (!endMatch) reject('malformed tag')
    i = TAG_END_RE.lastIndex

    if (top === doc) {
      if (sawRoot) reject('more than one root')
      if (node.name !== 'svg') reject('root is not <svg>')
      sawRoot = true
    }
    if (++elements > limits.maxElements) reject('too many elements')
    if (stack.length > limits.maxDepth) reject('nested too deep')
    top.children.push(node)
    if (!endMatch[1]) stack.push(node)
  }

  if (stack.length > 1) reject('unclosed element')
  if (!sawRoot) reject('no root')
  return { root: doc.children.find(c => c.name), processing }
}

// ── pruning ─────────────────────────────────────────────────────────────────

function cleanElement(node, ctx) {
  // A <style> that collectSheets() read is gone either way; only a refused one
  // earns a note.
  if (node.name === 'style' && node.sheet) {
    ctx.css = true
    if (node.sheet.why) ctx.note(`<style> (${node.sheet.why})`)
    return null
  }
  if (!ELEMENTS.has(node.name)) {
    ctx.note(`<${node.name.slice(0, 40)}>`)
    return null
  }
  if (node.name === 'use' && ++ctx.uses > ctx.limits.maxUse) reject('too many <use>')

  const attrs = []
  let classValue
  let styleText
  for (const [rawName, value] of node.attrs) {
    const name = rawName === 'xlink:href' ? 'href' : rawName
    if (rawName === 'class') { classValue = value; ctx.css = true; continue }
    if (rawName === 'style') { styleText = value; ctx.css = true; continue }
    if (rawName === 'xmlns' && value === SVG_NS) { attrs.push(['xmlns', SVG_NS]); continue }
    if (rawName.startsWith('xmlns:')) continue
    if (SILENT_ATTRIBUTES.has(rawName)) continue
    if (!ATTRIBUTES.has(name) || attrs.some(a => a[0] === name)) { ctx.note(`@${rawName.slice(0, 40)}`); continue }
    if (HOSTILE_RE.test(value.replace(CLOAK_RE, ''))) {
      ctx.note(`@${name}`)
      continue
    }
    let clean
    if (name === 'href') {
      const t = value.trim()
      clean = node.name === 'use' && t[0] === '#' && ID_RE.test(t.slice(1)) ? t : null
    } else {
      clean = ATTRIBUTES.get(name)(value)
    }
    if (clean === null) ctx.note(`@${name}`)
    else attrs.push([name, clean])
  }

  // The class itself never stays; it only picks the rules. A note is left when
  // no kept stylesheet rule named it, since then it did nothing we can keep.
  if (classValue !== undefined) {
    const names = classValue.split(XML_SPACE_RE).filter(Boolean)
    if (!names.length || !names.every(c => ctx.byClass.has(c))) ctx.note('@class')
  }
  for (const [name, value] of cascade(node, classValue, styleText, ctx)) {
    const at = attrs.findIndex(a => a[0] === name)
    if (at >= 0) attrs[at] = [name, value]
    else attrs.push([name, value])
  }

  const children = []
  for (const child of node.children) {
    if (child.text !== undefined) {
      if (TEXT_ELEMENTS.has(node.name)) children.push(child)
      continue
    }
    // <title> and <desc> are HTML integration points: an element inside one is
    // parsed as HTML when the SVG is inlined, can close the <svg> early and
    // swallow the markup after it. Only text may stay, so every element child
    // goes, whatever its name.
    if (TEXT_ELEMENTS.has(node.name)) { ctx.note(`<${child.name.slice(0, 40)}>`); continue }
    const kept = cleanElement(child, ctx)
    if (kept) children.push(kept)
  }
  return { name: node.name, attrs, children }
}

const idOf = (node) => node.attrs.find(a => a[0] === 'id')?.[1]

// First wins: a second element with the same id loses it, so a reference can
// only ever mean one thing.
function collectIds(node, ids, ctx) {
  const id = idOf(node)
  if (id !== undefined) {
    if (ids.has(id)) {
      node.attrs = node.attrs.filter(a => a[0] !== 'id')
      ctx.note('@id')
    } else ids.add(id)
  }
  for (const c of node.children) if (c.name) collectIds(c, ids, ctx)
}

// The prefix and the id are joined with a character no prefix can contain, so the
// pair can be read back and two different (prefix, id) pairs never give the same
// result (`a_` + `x` and `a` + `_x` would both be `a__x` with `_`).
const ID_SEP = '.'
const prefixed = (prefix, id) => (prefix ? `${prefix}${ID_SEP}${id}` : id)

// Drops references that leave the document and applies the id prefix. Returns
// false when the node itself must go (a <use> with nothing to point at). The ids
// that kept references point at are added to ctx.referenced, unprefixed.
function resolveRefs(node, ids, ctx) {
  const prefix = ctx.idPrefix
  const attrs = []
  const refs = []
  for (const [name, value] of node.attrs) {
    if (name === 'id') { attrs.push([name, prefixed(prefix, value)]); continue }
    if (name === 'href') {
      if (!ids.has(value.slice(1))) { ctx.note(`<${node.name}>`); return false }
      refs.push(value.slice(1))
      attrs.push([name, `#${prefixed(prefix, value.slice(1))}`])
      continue
    }
    const ref = value.startsWith('url(#') ? URL_REF_RE.exec(value) : null
    if (ref) {
      if (!ids.has(ref[1])) { ctx.note(`@${name}`); continue }
      refs.push(ref[1])
      attrs.push([name, `url(#${prefixed(prefix, ref[1])})${ref[2] ? ` ${ref[2]}` : ''}`])
      continue
    }
    attrs.push([name, value])
  }
  // A <use> whose href was refused draws nothing, so it goes rather than staying
  // behind as an empty shell. Its other references go with it, uncounted.
  if (node.name === 'use' && !attrs.some(a => a[0] === 'href')) { ctx.note('<use>'); return false }
  for (const id of refs) ctx.referenced.add(id)
  node.attrs = attrs
  node.children = node.children.filter(c => c.text !== undefined || resolveRefs(c, ids, ctx))
  return true
}

// Without an idPrefix an author id would land in the host page's own id space
// (CSS #id hooks, getElementById, label and aria targets), so only the ids that
// a kept reference inside the file needs are left.
function dropUnreferencedIds(node, referenced) {
  const id = idOf(node)
  if (id !== undefined && !referenced.has(id)) node.attrs = node.attrs.filter(a => a[0] !== 'id')
  for (const c of node.children) if (c.name) dropUnreferencedIds(c, referenced)
}

// ── output ──────────────────────────────────────────────────────────────────

const escText = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const escAttr = (s) => escText(s).replace(/"/g, '&quot;')

function serialise(node) {
  if (node.text !== undefined) return escText(node.text)
  const attrs = node.attrs.map(([k, v]) => ` ${k}="${escAttr(v)}"`).join('')
  if (!node.children.length) return `<${node.name}${attrs}/>`
  return `<${node.name}${attrs}>${node.children.map(serialise).join('')}</${node.name}>`
}

/**
 * Reduce untrusted SVG source to the allow-listed subset. See the header for the
 * full contract.
 *
 * @param {string} source
 * @param {{ idPrefix?: string, maxBytes?: number, maxElements?: number,
 *           maxDepth?: number, maxUse?: number }} [options]
 * @returns {{ ok: boolean, css: boolean, svg: string, removed: string[] } | null}
 */
export function sanitiseSvgInline(source, options = {}) {
  const idPrefix = options.idPrefix ?? ''
  if (idPrefix && !/^[A-Za-z][\w-]{0,40}$/.test(idPrefix)) {
    throw new RangeError('idPrefix must start with a letter and use only letters, digits, "-" and "_"')
  }
  if (typeof source !== 'string') return null
  const limits = { ...SVG_LIMITS }
  for (const key of Object.keys(limits)) {
    if (Number.isFinite(options[key]) && options[key] > 0) limits[key] = options[key]
  }

  const src = source.charCodeAt(0) === 0xfeff ? source.slice(1) : source
  if (src.length > limits.maxBytes || new TextEncoder().encode(src).length > limits.maxBytes) return null
  if (CONTROL_RE.test(src)) return null

  const removed = new Set()
  const ctx = {
    limits,
    idPrefix,
    uses: 0,
    rules: 0,
    byClass: new Map(),
    byElement: new Map(),
    referenced: new Set(),
    css: false,
    note: (what) => { if (removed.size < MAX_REMOVED_NOTES) removed.add(what) },
  }

  try {
    const { root, processing } = parse(src, limits)
    for (const p of processing) ctx.note(p)
    collectSheets(root, ctx)
    const clean = cleanElement(root, ctx)
    if (!clean.attrs.some(a => a[0] === 'xmlns')) clean.attrs.unshift(['xmlns', SVG_NS])
    const ids = new Set()
    collectIds(clean, ids, ctx)
    resolveRefs(clean, ids, ctx)
    if (!idPrefix) dropUnreferencedIds(clean, ctx.referenced)
    const notes = [...removed]
    return { ok: notes.length === 0, css: ctx.css, svg: serialise(clean), removed: notes }
  } catch (err) {
    if (err instanceof Reject) return null
    throw err
  }
}
